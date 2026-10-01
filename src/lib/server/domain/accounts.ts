// Comptes, sessions, liaisons, rôles et thèmes (06-contrats §B.1).
//
// Sources : 04-architecture §3.1, §4, §5, §6, §10 (1, 7, 8, 9, 13) ; audit 05 §3.1, §4 (flux, messages
// exacts), §6 (actions d'audit nommées), §13 ; audit 06 §3.A (A1-A25) et §3.J ; audit 07 §3.3
// (règles des thèmes) ; legacy/netlify/functions/auth.js.
//
// Conventions :
// - fonctions sans acteur (inscription, connexion, déconnexion) : `(db, input)` ; toutes les autres :
//   `(db, actor, input)` ; les vues renvoyées ne portent AUCUN secret (ni hash, ni jeton, ni secret) ;
// - verrous de comptes TOUJOURS pris dans l'ordre des identifiants, en une seule requête
//   (`SELECT … ORDER BY id FOR UPDATE`), pour éviter les interblocages entre administrateurs ;
// - retrait d'un administrateur (changement de rôle, rature) : verrou commun sur TOUTES les lignes
//   admin puis recomptage (04 §10.7) ;
// - toute mutation sensible relit le compte de l'acteur et sa session sous verrou (04 §10.7) ;
// - audit (`recordAudit`) et journal staff (`appendStaffLog`) dans la MÊME transaction.
import { and, asc, eq, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { Db, Tx } from '$lib/server/db';
import {
	accounts,
	accountThemeGrants,
	characters,
	oaths,
	sessions,
	themes,
	type Account,
	type Theme
} from '$lib/server/db/schema';
import { ALWAYS_GRANTED_THEME_IDS, THEME_ID_ALIASES, THEME_SEED } from '$lib/server/db/referentials';
import { NpError } from '$lib/server/http';
import { assertCan, requireActor, type Actor, type Role } from '$lib/server/permissions';
import { recordAudit } from '$lib/server/domain/audit';
import { appendStaffLog } from '$lib/server/domain/staff-log';
import { THEMES, tonOf, validateTheme, type ThemeTokens } from '$lib/ui/themes';
import {
	changeOwnPasswordInput,
	completeForcedResetInput,
	deleteOwnAccountInput,
	loginInput,
	registerInput,
	type ChangeOwnPasswordInput,
	type CompleteForcedResetInput,
	type DeleteOwnAccountInput,
	type LoginInput,
	type LoginResultView,
	type RegisterInput,
	type SessionResultView
} from '$lib/schemas/auth';
import {
	THEME_TOKEN_KEYS,
	accountThemeInput,
	adminResetPasswordInput,
	adminSetPasswordInput,
	createThemeInput,
	linkCharacterInput,
	selectThemeInput,
	setRoleInput,
	strikeAccountInput,
	themeAutoGrantInput,
	themeOnlyInput,
	themeVisibilityInput,
	unlinkCharacterInput,
	type AccountThemeInput,
	type AccountView,
	type AdminResetPasswordInput,
	type AdminResetView,
	type AdminSetPasswordInput,
	type CreateThemeInput,
	type LinkCharacterInput,
	type OwnAccountView,
	type PendingView,
	type SelectThemeInput,
	type SetRoleInput,
	type StrikeAccountInput,
	type ThemeAutoGrantInput,
	type ThemeOnlyInput,
	type ThemeView,
	type ThemeVisibilityInput,
	type UnlinkCharacterInput
} from '$lib/schemas/accounts';
import { assertFreshAccount, auditContextOf, requestContextOf, SESSION_CLOSED_MESSAGE } from '$lib/server/auth/context';
import {
	burnPasswordCheck,
	hashPassword,
	needsRehash,
	randomSecret,
	verifyPassword
} from '$lib/server/auth/password';
import { consumeRateLimit, rateLimitKey, resetRateLimit } from '$lib/server/auth/rate-limit';
import { maybeRecoverAdmin } from '$lib/server/auth/recovery';
import {
	RESET_SESSION_MS,
	createSession,
	readSession as readSessionRow,
	revokeAllSessions,
	scopeMatchesAccount,
	type SessionRead
} from '$lib/server/auth/session';
import { isUniqueViolation, parseInput, requireExpectedRevision } from '$lib/server/auth/validate';

export { discordAuthUrl, discordCallback, discordLogin, discordUnlink, isDiscordEnabled } from '$lib/server/auth/discord';

// ---------------------------------------------------------------------------
// Messages officiels
// ---------------------------------------------------------------------------

/** 401 générique de connexion (audit 05 §4.4). */
export const LOGIN_FAILED_MESSAGE = 'Identifiant ou mot de passe incorrect';
/** 409 PSEUDO_TAKEN (audit 05 §4.4). */
export const PSEUDO_TAKEN_MESSAGE = 'Ce pseudo est déjà pris.';
const RESET_EXPIRED_MESSAGE =
	'Ton code de réinitialisation a expiré. Demande un nouveau code à un administrateur sur Discord.';
const ADMIN_UNDELETABLE_MESSAGE = 'Le compte administrateur ne peut pas être supprimé.';
const LAST_ADMIN_ROLE_MESSAGE = 'Impossible de changer le rôle du dernier administrateur.';
const LAST_ADMIN_DELETE_MESSAGE = 'Impossible de rayer le dernier compte administrateur.';
const ACCOUNT_NOT_FOUND_MESSAGE = 'Compte introuvable.';
const DATA_CHANGED_MESSAGE = 'Les données ont changé. Recharge la page puis réessaie.';
const ACCESS_CHANGED_MESSAGE = 'Les accès ont changé. Reconnecte-toi puis réessaie.';

/** Nouvel identifiant de compte (04 §3 : nanoid 16 préfixé `a_`). */
function newAccountId(): string {
	return `a_${nanoid(16)}`;
}

function iso(d: Date | null | undefined): string | null {
	return d ? d.toISOString() : null;
}

function actorOf(account: Account): Actor {
	return { accountId: account.id, role: account.role, characterId: account.characterId, pseudo: account.pseudo };
}

/**
 * Verrouille des comptes dans l'ordre des identifiants (une requête), éventuellement avec toutes les
 * lignes administrateur (04 §10.7). Renvoie les lignes verrouillées.
 */
async function lockAccounts(tx: Tx, ids: readonly string[], withAdmins = false): Promise<Account[]> {
	const unique = [...new Set(ids)];
	const byId = unique.length > 0 ? inArray(accounts.id, unique) : undefined;
	const where = withAdmins ? (byId ? or(eq(accounts.role, 'admin'), byId) : eq(accounts.role, 'admin')) : byId;
	if (!where) return [];
	return tx.select().from(accounts).where(where).orderBy(asc(accounts.id)).for('update');
}

/** Rattrape la violation d'unicité du pseudo (inscription concurrente). */
function pseudoTaken(): NpError {
	return new NpError('PSEUDO_TAKEN', PSEUDO_TAKEN_MESSAGE, 409);
}

// ---------------------------------------------------------------------------
// Sessions (06 §B.1)
// ---------------------------------------------------------------------------

/** `readSession(db, token)` → `{ session, account, character } | null` (voir auth/session.ts). */
export async function readSession(db: Db | Tx, token: string | null | undefined): Promise<SessionRead | null> {
	return readSessionRow(db, token);
}

/** Session de réinitialisation, telle que le hook l'expose (`locals.session` + `locals.account`). */
export interface ResetActor {
	accountId: string;
	sessionId: string;
}

/**
 * Inscription (audit 05 §4.4) : pseudo valide, unique sans tenir compte de la casse, mot de passe
 * ≥ 8, règlement accepté ; compte joueur non relié, session pleine. 409 PSEUDO_TAKEN.
 */
export async function register(db: Db, input: RegisterInput): Promise<SessionResultView & { accountId: string }> {
	const data = parseInput(registerInput, input);
	const ip = data.ip ?? null;
	const userAgent = data.userAgent ?? null;
	try {
		await consumeRateLimit(db, [rateLimitKey('ip', ip), rateLimitKey('register', data.pseudo)]);
	} catch (e) {
		await recordAudit(db, { source: 'auth', action: 'register_rate_limited', actor: null, details: { pseudo: data.pseudo }, ip, userAgent });
		throw e;
	}
	const existing = await db
		.select({ id: accounts.id })
		.from(accounts)
		.where(sql`lower(${accounts.pseudo}) = ${data.pseudo.toLowerCase()}`);
	if (existing.length > 0) throw pseudoTaken();

	const passwordHash = await hashPassword(data.password);
	try {
		return await db.transaction(async (tx) => {
			const id = newAccountId();
			const now = new Date();
			await tx.insert(accounts).values({
				id,
				pseudo: data.pseudo,
				passwordHash,
				role: 'joueur',
				sessionVersion: 0,
				lastSeenAt: now
			});
			const session = await createSession(tx, { accountId: id, scope: 'full', sessionVersion: 0, ip, userAgent, now });
			await recordAudit(tx, {
				source: 'auth',
				action: 'register_success',
				actor: { accountId: id, role: 'joueur', characterId: null, pseudo: data.pseudo },
				ip,
				userAgent
			});
			return { sessionToken: session.token, expiresAt: session.expiresAt.toISOString(), accountId: id };
		});
	} catch (e) {
		if (isUniqueViolation(e, 'accounts_pseudo_lower_uidx')) throw pseudoTaken();
		throw e;
	}
}

/**
 * Connexion (audit 05 §4.4 ; 04 §4, §10.8, §10.9) : rate limit (ip + pseudo), récupération admin
 * éventuelle, 401 générique à délai constant, session `reset` si une réinitialisation est en cours,
 * ré-encodage scrypt des formats hérités DANS la transaction qui crée la session, après avoir
 * revérifié sous verrou que le hash et la version de session n'ont pas changé.
 */
export async function login(db: Db, input: LoginInput): Promise<LoginResultView> {
	const data = parseInput(loginInput, input);
	const ip = data.ip ?? null;
	const userAgent = data.userAgent ?? null;
	const loginKey = rateLimitKey('login', data.pseudo);
	try {
		await consumeRateLimit(db, [rateLimitKey('ip', ip), loginKey]);
	} catch (e) {
		await recordAudit(db, { source: 'auth', action: 'login_rate_limited', actor: null, details: { pseudo: data.pseudo }, ip, userAgent });
		throw e;
	}

	await maybeRecoverAdmin(db, { pseudo: data.pseudo, password: data.password, ip, userAgent });

	const fail = async (reason: string, account: Account | null): Promise<never> => {
		await recordAudit(db, {
			source: 'auth',
			action: 'login_failed',
			actor: account ? actorOf(account) : null,
			details: { pseudo: data.pseudo, reason },
			ip,
			userAgent
		});
		throw new NpError('UNAUTHENTICATED', LOGIN_FAILED_MESSAGE, 401);
	};

	const [account] = await db
		.select()
		.from(accounts)
		.where(sql`lower(${accounts.pseudo}) = ${data.pseudo.toLowerCase()}`);
	if (!account) {
		await burnPasswordCheck(data.password);
		return fail('unknown_account', null);
	}

	const now = new Date();
	const forced = account.forcePasswordReset;
	// En réinitialisation forcée, seul le secret ouvre le compte (04 §4) ; un compte hérité forcé sans
	// empreinte séparée garde son code temporaire dans password_hash.
	const target = forced ? (account.resetSecretHash ?? account.passwordHash) : account.passwordHash;
	if (!(await verifyPassword(data.password, target))) return fail('bad_password', account);
	if (forced && (!account.resetExpiresAt || account.resetExpiresAt.getTime() <= now.getTime())) {
		await recordAudit(db, {
			source: 'auth',
			action: 'login_failed',
			actor: actorOf(account),
			details: { pseudo: data.pseudo, reason: 'reset_expired' },
			ip,
			userAgent
		});
		throw new NpError('RESET_EXPIRED', RESET_EXPIRED_MESSAGE, 401);
	}

	const rehash = !forced && needsRehash(account.passwordHash) ? await hashPassword(data.password) : null;
	const scope = forced ? ('reset' as const) : ('full' as const);

	const result = await db.transaction(async (tx) => {
		const [row] = await tx.select().from(accounts).where(eq(accounts.id, account.id)).for('update');
		// Réinitialisation ou changement concurrent : aucune session fondée sur l'ancien hash (B8).
		if (
			!row ||
			row.passwordHash !== account.passwordHash ||
			row.resetSecretHash !== account.resetSecretHash ||
			row.sessionVersion !== account.sessionVersion ||
			row.forcePasswordReset !== forced
		) {
			throw new NpError('UNAUTHENTICATED', LOGIN_FAILED_MESSAGE, 401);
		}
		await tx
			.update(accounts)
			.set(rehash ? { passwordHash: rehash, lastSeenAt: now } : { lastSeenAt: now })
			.where(eq(accounts.id, row.id));
		const session = await createSession(tx, {
			accountId: row.id,
			scope,
			sessionVersion: row.sessionVersion,
			resetExpiresAt: row.resetExpiresAt,
			ip,
			userAgent,
			now
		});
		const actor = actorOf(row);
		await recordAudit(tx, {
			source: 'auth',
			action: 'login_success',
			actor,
			details: { method: 'password', scope, rehashed: rehash !== null },
			ip,
			userAgent
		});
		// Journal staff : connexions des MJ, designers et administrateurs (audit 05 §3.9 `connexion`,
		// audit 06 B15 : jamais pour un joueur).
		if (row.role !== 'joueur' && scope === 'full') {
			await appendStaffLog(tx, { action: 'connexion', detail: `Connexion de '${row.pseudo}'.`, actor, target: row.pseudo });
		}
		return session;
	});
	await resetRateLimit(db, loginKey);
	return {
		sessionToken: result.token,
		scope,
		expiresAt: result.expiresAt.toISOString(),
		weakPassword: !forced && data.password.length < 8
	};
}

/**
 * Déconnexion (04 §3.1, §10.8) : supprime la session ET incrémente `session_version` (tous les
 * appareils). Idempotente : un jeton inconnu, expiré ou déjà révoqué ⇒ rien, sans nouvelle révocation.
 */
export async function logout(db: Db, sessionToken: string | null | undefined): Promise<{ revoked: boolean }> {
	const read = await readSessionRow(db, sessionToken);
	if (!read) return { revoked: false };
	await db.transaction(async (tx) => {
		const [row] = await tx
			.select({ id: accounts.id, sessionVersion: accounts.sessionVersion })
			.from(accounts)
			.where(eq(accounts.id, read.account.id))
			.for('update');
		if (!row || row.sessionVersion !== read.session.sessionVersion) return;
		await revokeAllSessions(tx, row.id);
	});
	return { revoked: true };
}

/**
 * Changement de son mot de passe (audit 05 §4.4, audit 06 A6) : mot de passe actuel exigé (403),
 * révocation de TOUTES les sessions, nouvelle session pleine immédiatement valide.
 */
export async function changeOwnPassword(
	db: Db,
	actor: Actor | null,
	input: ChangeOwnPasswordInput
): Promise<SessionResultView> {
	const present = requireActor(actor);
	const data = parseInput(changeOwnPasswordInput, input);
	const [account] = await db.select().from(accounts).where(eq(accounts.id, present.accountId));
	if (!account) throw NpError.unauthenticated(SESSION_CLOSED_MESSAGE);
	if (!(await verifyPassword(data.current, account.passwordHash))) {
		throw new NpError('WRONG_PASSWORD', 'Mot de passe actuel incorrect', 403);
	}
	const nextHash = await hashPassword(data.next);
	const ctx = requestContextOf(present);
	return db.transaction(async (tx) => {
		const fresh = await assertFreshAccount(tx, present);
		if (fresh.passwordHash !== account.passwordHash || fresh.sessionVersion !== account.sessionVersion) {
			throw new NpError('ACCESS_CHANGED', ACCESS_CHANGED_MESSAGE, 409);
		}
		const [updated] = await tx
			.update(accounts)
			.set({ passwordHash: nextHash, sessionVersion: sql`${accounts.sessionVersion} + 1` })
			.where(eq(accounts.id, fresh.id))
			.returning({ sessionVersion: accounts.sessionVersion });
		await tx.delete(sessions).where(eq(sessions.accountId, fresh.id));
		const session = await createSession(tx, {
			accountId: fresh.id,
			scope: 'full',
			sessionVersion: updated.sessionVersion,
			ip: ctx?.ip,
			userAgent: ctx?.userAgent
		});
		await recordAudit(tx, { source: 'auth', action: 'self_change_password', actor: present, ...auditContextOf(present) });
		return { sessionToken: session.token, expiresAt: session.expiresAt.toISOString() };
	});
}

/**
 * Fin de réinitialisation forcée (04 §10.8 ; audit 06 A9) : UNE transaction — consommation du secret,
 * nouveau hash, effacement de `reset_secret_hash` et de l'échéance, incrément de `session_version`,
 * création de la session pleine. Session normale ⇒ 403 ; rejeu ⇒ 401.
 */
export async function completeForcedReset(
	db: Db,
	resetActor: ResetActor | null,
	input: CompleteForcedResetInput
): Promise<SessionResultView> {
	if (!resetActor) throw NpError.unauthenticated(SESSION_CLOSED_MESSAGE);
	const data = parseInput(completeForcedResetInput, input);
	const nextHash = await hashPassword(data.next);
	return db.transaction(async (tx) => {
		const now = new Date();
		const [account] = await tx.select().from(accounts).where(eq(accounts.id, resetActor.accountId)).for('update');
		if (!account) throw NpError.unauthenticated(SESSION_CLOSED_MESSAGE);
		const [session] = await tx
			.select()
			.from(sessions)
			.where(and(eq(sessions.id, resetActor.sessionId), eq(sessions.accountId, account.id)));
		if (!session || session.expiresAt.getTime() <= now.getTime() || session.sessionVersion !== account.sessionVersion) {
			throw NpError.unauthenticated(SESSION_CLOSED_MESSAGE);
		}
		if (session.scope !== 'reset') throw NpError.forbidden('Aucune réinitialisation autorisée');
		if (!scopeMatchesAccount('reset', account, now)) throw NpError.unauthenticated(SESSION_CLOSED_MESSAGE);

		const [updated] = await tx
			.update(accounts)
			.set({
				passwordHash: nextHash,
				forcePasswordReset: false,
				resetExpiresAt: null,
				resetSecretHash: null,
				lastSeenAt: now,
				sessionVersion: sql`${accounts.sessionVersion} + 1`,
				revision: sql`${accounts.revision} + 1`
			})
			.where(and(eq(accounts.id, account.id), eq(accounts.sessionVersion, account.sessionVersion)))
			.returning({ sessionVersion: accounts.sessionVersion });
		if (!updated) throw NpError.unauthenticated(SESSION_CLOSED_MESSAGE);
		await tx.delete(sessions).where(eq(sessions.accountId, account.id));
		const full = await createSession(tx, {
			accountId: account.id,
			scope: 'full',
			sessionVersion: updated.sessionVersion,
			ip: session.ip,
			userAgent: session.userAgent,
			now
		});
		await recordAudit(tx, {
			source: 'auth',
			action: 'complete_forced_reset',
			actor: actorOf(account),
			ip: session.ip,
			userAgent: session.userAgent
		});
		return { sessionToken: full.token, expiresAt: full.expiresAt.toISOString() };
	});
}

/**
 * Suppression de son compte (audit 05 §4.4, audit 06 A14-A15) : mot de passe exigé, administrateur
 * refusé ; compte ET personnage relié supprimés dans une transaction qui revérifie, sous verrou, que ni
 * le compte (hash, version de session, liaison) ni le personnage (révision) n'ont changé depuis la
 * vérification — sinon 409 et rien n'est supprimé.
 */
export async function deleteOwnAccount(
	db: Db,
	actor: Actor | null,
	input: DeleteOwnAccountInput
): Promise<{ deleted: true }> {
	const present = requireActor(actor);
	if (present.role === 'admin') throw NpError.forbidden(ADMIN_UNDELETABLE_MESSAGE);
	const data = parseInput(deleteOwnAccountInput, input);
	const [account] = await db.select().from(accounts).where(eq(accounts.id, present.accountId));
	if (!account) throw NpError.unauthenticated(SESSION_CLOSED_MESSAGE);
	const [character] = account.characterId
		? await db
				.select({ id: characters.id, name: characters.name, revision: characters.revision })
				.from(characters)
				.where(eq(characters.id, account.characterId))
		: [];
	if (!(await verifyPassword(data.password, account.passwordHash))) {
		throw new NpError('WRONG_PASSWORD', 'Mot de passe incorrect', 403);
	}

	await db.transaction(async (tx) => {
		const fresh = await assertFreshAccount(tx, present);
		if (fresh.role === 'admin') throw NpError.forbidden(ADMIN_UNDELETABLE_MESSAGE);
		if (
			fresh.passwordHash !== account.passwordHash ||
			fresh.sessionVersion !== account.sessionVersion ||
			fresh.characterId !== account.characterId
		) {
			throw new NpError('VERSION_CONFLICT', DATA_CHANGED_MESSAGE, 409);
		}
		if (character) {
			const [locked] = await tx
				.select({ revision: characters.revision })
				.from(characters)
				.where(eq(characters.id, character.id))
				.for('update');
			if (!locked || locked.revision !== character.revision) {
				throw new NpError('VERSION_CONFLICT', DATA_CHANGED_MESSAGE, 409);
			}
		}
		await recordAudit(tx, {
			source: 'auth',
			action: 'self_delete_account',
			actor: present,
			details: { pseudo: fresh.pseudo, characterId: character?.id ?? null, characterName: character?.name ?? null },
			...auditContextOf(present)
		});
		await appendStaffLog(tx, {
			action: 'compte_supprime',
			detail: character
				? `Compte '${fresh.pseudo}' supprimé par son titulaire, avec le personnage '${character.name}'.`
				: `Compte '${fresh.pseudo}' supprimé par son titulaire.`,
			actor: present,
			target: character ? character.name : fresh.pseudo
		});
		if (character) await tx.delete(characters).where(eq(characters.id, character.id));
		await tx.delete(accounts).where(eq(accounts.id, fresh.id));
	});
	return { deleted: true };
}

// ---------------------------------------------------------------------------
// Projections de compte (sans aucun secret)
// ---------------------------------------------------------------------------

type AccountRowWithName = Account & { characterName: string | null };

function toAccountView(row: AccountRowWithName): AccountView {
	return {
		id: row.id,
		pseudo: row.pseudo,
		role: row.role,
		characterId: row.characterId,
		characterName: row.characterName,
		lastSeenAt: iso(row.lastSeenAt),
		createdAt: row.createdAt.toISOString(),
		forcePasswordReset: row.forcePasswordReset,
		resetExpiresAt: iso(row.resetExpiresAt),
		discordLinked: row.discordId !== null,
		revision: row.revision
	};
}

async function accountRows(db: Db | Tx, where?: ReturnType<typeof eq>): Promise<AccountRowWithName[]> {
	const base = db
		.select({ account: accounts, characterName: characters.name })
		.from(accounts)
		.leftJoin(characters, eq(characters.id, accounts.characterId));
	const rows = await (where ? base.where(where) : base).orderBy(sql`lower(${accounts.pseudo})`);
	return rows.map((r) => ({ ...r.account, characterName: r.characterName ?? null }));
}

/** Mon compte (`/compte`). */
export async function getOwnAccount(db: Db, actor: Actor | null): Promise<OwnAccountView> {
	const present = requireActor(actor);
	const [row] = await accountRows(db, eq(accounts.id, present.accountId));
	if (!row) throw NpError.unauthenticated(SESSION_CLOSED_MESSAGE);
	return {
		id: row.id,
		pseudo: row.pseudo,
		role: row.role,
		characterId: row.characterId,
		characterName: row.characterName,
		createdAt: row.createdAt.toISOString(),
		lastSeenAt: iso(row.lastSeenAt),
		selectedTheme: row.selectedTheme,
		discordLinked: row.discordId !== null,
		discordUsername: row.discordUsername,
		revision: row.revision
	};
}

/** Registre › Comptes et liaisons (admin). */
export async function listAccounts(db: Db, actor: Actor | null): Promise<AccountView[]> {
	assertCan(actor, 'admin.accounts');
	return (await accountRows(db)).map(toAccountView);
}

/** Registre › Ce qui attend (admin) : comptes en attente, personnages sans compte, réinitialisations ouvertes. */
export async function listPending(db: Db, actor: Actor | null): Promise<PendingView> {
	assertCan(actor, 'admin.accounts');
	const all = (await accountRows(db)).map(toAccountView);
	const unlinked = await db
		.select({ id: characters.id, name: characters.name, oathName: oaths.name })
		.from(characters)
		.innerJoin(oaths, eq(oaths.id, characters.oathId))
		.leftJoin(accounts, eq(accounts.characterId, characters.id))
		.where(isNull(accounts.id))
		.orderBy(asc(characters.name));
	return {
		pendingAccounts: all.filter((a) => a.role === 'joueur' && a.characterId === null),
		unlinkedCharacters: unlinked,
		openResets: all.filter((a) => a.forcePasswordReset)
	};
}

// ---------------------------------------------------------------------------
// Administration des comptes (admin)
// ---------------------------------------------------------------------------

function notFoundAccount(): NpError {
	return NpError.notFound(ACCOUNT_NOT_FOUND_MESSAGE);
}

/** Relier un compte à un personnage (audit 05 §4.5 `admin_link_account` ; staff `liaison`). */
export async function linkCharacter(db: Db, actor: Actor | null, input: LinkCharacterInput): Promise<AccountView> {
	const present = assertCan(actor, 'admin.accounts');
	requireExpectedRevision(input);
	const data = parseInput(linkCharacterInput, input);
	try {
		return await db.transaction(async (tx) => {
			const locked = await lockAccounts(tx, [present.accountId, data.accountId]);
			await assertFreshAccount(tx, present, locked.find((a) => a.id === present.accountId) ?? null);
			const target = locked.find((a) => a.id === data.accountId);
			if (!target) throw notFoundAccount();
			const [character] = await tx
				.select({ id: characters.id, name: characters.name })
				.from(characters)
				.where(eq(characters.id, data.characterId))
				.for('update');
			if (!character) throw NpError.notFound('Personnage introuvable.');
			const holder = await tx
				.select({ id: accounts.id })
				.from(accounts)
				.where(and(eq(accounts.characterId, character.id), ne(accounts.id, target.id)));
			if (holder.length > 0) throw characterTaken();
			const [updated] = await tx
				.update(accounts)
				.set({ characterId: character.id, revision: sql`${accounts.revision} + 1` })
				.where(and(eq(accounts.id, target.id), eq(accounts.revision, data.expectedRevision)))
				.returning();
			if (!updated) throw NpError.versionConflict();
			await recordAudit(tx, {
				source: 'accounts',
				action: 'admin_link_account',
				actor: present,
				details: { accountId: target.id, pseudo: target.pseudo, characterId: character.id, previousCharacterId: target.characterId },
				...auditContextOf(present)
			});
			await appendStaffLog(tx, {
				action: 'liaison',
				detail: `Compte '${target.pseudo}' lié au personnage '${character.name}'`,
				actor: present,
				target: character.name
			});
			return toAccountView({ ...updated, characterName: character.name });
		});
	} catch (e) {
		if (isUniqueViolation(e, 'accounts_character_id_unique')) throw characterTaken();
		throw e;
	}
}

function characterTaken(): NpError {
	return new NpError('CHARACTER_TAKEN', 'Ce personnage est déjà relié à un autre compte.', 409);
}

/** Délier un compte de son personnage (audit 05 §4.5 `admin_unlink_account` ; staff `deliaison`). */
export async function unlinkCharacter(db: Db, actor: Actor | null, input: UnlinkCharacterInput): Promise<AccountView> {
	const present = assertCan(actor, 'admin.accounts');
	requireExpectedRevision(input);
	const data = parseInput(unlinkCharacterInput, input);
	return db.transaction(async (tx) => {
		const locked = await lockAccounts(tx, [present.accountId, data.accountId]);
		await assertFreshAccount(tx, present, locked.find((a) => a.id === present.accountId) ?? null);
		const target = locked.find((a) => a.id === data.accountId);
		if (!target) throw notFoundAccount();
		if (!target.characterId) throw new NpError('INVALID', 'Ce compte n’est relié à aucun personnage.', 400);
		const [character] = await tx
			.select({ name: characters.name })
			.from(characters)
			.where(eq(characters.id, target.characterId));
		const [updated] = await tx
			.update(accounts)
			.set({ characterId: null, revision: sql`${accounts.revision} + 1` })
			.where(and(eq(accounts.id, target.id), eq(accounts.revision, data.expectedRevision)))
			.returning();
		if (!updated) throw NpError.versionConflict();
		const name = character?.name ?? target.characterId;
		await recordAudit(tx, {
			source: 'accounts',
			action: 'admin_unlink_account',
			actor: present,
			details: { accountId: target.id, pseudo: target.pseudo, characterId: target.characterId },
			...auditContextOf(present)
		});
		await appendStaffLog(tx, {
			action: 'deliaison',
			detail: `Compte '${target.pseudo}' délié du personnage '${name}'`,
			actor: present,
			target: name
		});
		return toAccountView({ ...updated, characterName: null });
	});
}

/**
 * Changer le rôle d'un compte (audit 05 §4.5 `admin_set_role`) : verrou commun sur les lignes admin,
 * recomptage, 409 LAST_ADMIN si l'on retirerait le dernier administrateur.
 */
export async function setRole(db: Db, actor: Actor | null, input: SetRoleInput): Promise<AccountView> {
	const present = assertCan(actor, 'admin.accounts');
	requireExpectedRevision(input);
	const data = parseInput(setRoleInput, input);
	return db.transaction(async (tx) => {
		const locked = await lockAccounts(tx, [present.accountId, data.accountId], true);
		await assertFreshAccount(tx, present, locked.find((a) => a.id === present.accountId) ?? null);
		const target = locked.find((a) => a.id === data.accountId);
		if (!target) throw notFoundAccount();
		if (target.revision !== data.expectedRevision) throw NpError.versionConflict();
		const admins = locked.filter((a) => a.role === 'admin');
		if (target.role === 'admin' && data.role !== 'admin' && admins.length <= 1) {
			throw new NpError('LAST_ADMIN', LAST_ADMIN_ROLE_MESSAGE, 409);
		}
		const [updated] = await tx
			.update(accounts)
			.set({ role: data.role, revision: sql`${accounts.revision} + 1` })
			.where(and(eq(accounts.id, target.id), eq(accounts.revision, data.expectedRevision)))
			.returning();
		if (!updated) throw NpError.versionConflict();
		await recordAudit(tx, {
			source: 'accounts',
			action: 'admin_set_role',
			actor: present,
			details: { accountId: target.id, pseudo: target.pseudo, from: target.role, to: data.role },
			...auditContextOf(present)
		});
		await appendStaffLog(tx, {
			action: 'role',
			detail: `Rôle de '${target.pseudo}' : ${target.role} → ${data.role}`,
			actor: present,
			target: target.pseudo
		});
		const [withName] = await accountRows(tx, eq(accounts.id, target.id));
		return toAccountView(withName);
	});
}

/**
 * Réinitialiser le mot de passe d'un compte (04 §4 ; audit 06 A7) : secret aléatoire 24 octets
 * base64url renvoyé UNE fois, empreinte scrypt dans `reset_secret_hash`, échéance 1 h, révocation de
 * toutes les sessions. Le secret n'est jamais journalisé.
 */
export async function adminResetPassword(
	db: Db,
	actor: Actor | null,
	input: AdminResetPasswordInput
): Promise<AdminResetView> {
	const present = assertCan(actor, 'admin.accounts');
	const data = parseInput(adminResetPasswordInput, input);
	if (data.accountId === present.accountId) {
		throw new NpError('INVALID', 'Pour ton propre compte, utilise « Changer mon mot de passe ».', 400);
	}
	const secret = randomSecret(24);
	const secretHash = await hashPassword(secret);
	const expiresAt = new Date(Date.now() + RESET_SESSION_MS);
	await db.transaction(async (tx) => {
		const locked = await lockAccounts(tx, [present.accountId, data.accountId]);
		await assertFreshAccount(tx, present, locked.find((a) => a.id === present.accountId) ?? null);
		const target = locked.find((a) => a.id === data.accountId);
		if (!target) throw notFoundAccount();
		await tx
			.update(accounts)
			.set({
				forcePasswordReset: true,
				resetExpiresAt: expiresAt,
				resetSecretHash: secretHash,
				sessionVersion: sql`${accounts.sessionVersion} + 1`,
				revision: sql`${accounts.revision} + 1`
			})
			.where(eq(accounts.id, target.id));
		await tx.delete(sessions).where(eq(sessions.accountId, target.id));
		await recordAudit(tx, {
			source: 'accounts',
			action: 'admin_reset_password',
			actor: present,
			details: { accountId: target.id, pseudo: target.pseudo, expiresAt: expiresAt.toISOString() },
			...auditContextOf(present)
		});
		await appendStaffLog(tx, {
			action: 'mdp_reset',
			detail: `Mot de passe de '${target.pseudo}' réinitialisé (code valable une heure).`,
			actor: present,
			target: target.pseudo
		});
	});
	return { temporaryPassword: secret, expiresAt: expiresAt.toISOString() };
}

/** Définir le mot de passe d'un compte (audit 05 §4.5 `admin_set_password`, audit 06 A11) : révocation. */
export async function adminSetPassword(
	db: Db,
	actor: Actor | null,
	input: AdminSetPasswordInput
): Promise<{ updated: true }> {
	const present = assertCan(actor, 'admin.accounts');
	const data = parseInput(adminSetPasswordInput, input);
	const passwordHash = await hashPassword(data.password);
	await db.transaction(async (tx) => {
		const locked = await lockAccounts(tx, [present.accountId, data.accountId]);
		await assertFreshAccount(tx, present, locked.find((a) => a.id === present.accountId) ?? null);
		const target = locked.find((a) => a.id === data.accountId);
		if (!target) throw notFoundAccount();
		await tx
			.update(accounts)
			.set({
				passwordHash,
				forcePasswordReset: false,
				resetExpiresAt: null,
				resetSecretHash: null,
				sessionVersion: sql`${accounts.sessionVersion} + 1`,
				revision: sql`${accounts.revision} + 1`
			})
			.where(eq(accounts.id, target.id));
		await tx.delete(sessions).where(eq(sessions.accountId, target.id));
		await recordAudit(tx, {
			source: 'accounts',
			action: 'admin_set_password',
			actor: present,
			details: { accountId: target.id, pseudo: target.pseudo },
			...auditContextOf(present)
		});
		await appendStaffLog(tx, {
			action: 'mdp_defini',
			detail: `Mot de passe de '${target.pseudo}' défini par un administrateur.`,
			actor: present,
			target: target.pseudo
		});
	});
	return { updated: true };
}

/**
 * Rayer un compte (audit 05 §4.5 `admin_delete_account` ; 03-vision §5.11 « Rayer ce compte » avec
 * saisie du pseudo). Le personnage relié est conservé (il redevient « sans compte »). Verrou commun
 * sur les admins, 409 LAST_ADMIN ; un administrateur ne raye pas son propre compte.
 */
export async function strikeAccount(
	db: Db,
	actor: Actor | null,
	input: StrikeAccountInput
): Promise<{ struck: true }> {
	const present = assertCan(actor, 'admin.accounts');
	const data = parseInput(strikeAccountInput, input);
	if (data.accountId === present.accountId) {
		throw NpError.forbidden('Tu ne peux pas rayer ton propre compte.');
	}
	await db.transaction(async (tx) => {
		const locked = await lockAccounts(tx, [present.accountId, data.accountId], true);
		await assertFreshAccount(tx, present, locked.find((a) => a.id === present.accountId) ?? null);
		const target = locked.find((a) => a.id === data.accountId);
		if (!target) throw notFoundAccount();
		if (data.typedPseudo !== target.pseudo) {
			throw new NpError('INVALID', 'Le pseudo saisi ne correspond pas à ce compte.', 400);
		}
		if (target.role === 'admin' && locked.filter((a) => a.role === 'admin').length <= 1) {
			throw new NpError('LAST_ADMIN', LAST_ADMIN_DELETE_MESSAGE, 409);
		}
		await recordAudit(tx, {
			source: 'accounts',
			action: 'admin_delete_account',
			actor: present,
			details: { accountId: target.id, pseudo: target.pseudo, role: target.role, characterId: target.characterId },
			...auditContextOf(present)
		});
		await appendStaffLog(tx, {
			action: 'compte_supprime',
			detail: `Compte '${target.pseudo}' rayé par un administrateur.`,
			actor: present,
			target: target.pseudo
		});
		await tx.delete(accounts).where(eq(accounts.id, target.id));
	});
	return { struck: true };
}

// ---------------------------------------------------------------------------
// Thèmes (audit 07 §3.3 ; audit 05 §4.5 actions `*_theme*`)
// ---------------------------------------------------------------------------

const ALWAYS = new Set(ALWAYS_GRANTED_THEME_IDS);
const STAFF_ROLES: ReadonlySet<Role> = new Set<Role>(['mj', 'designer', 'admin']);
const TOKENS_BY_ID = new Map(THEMES.map((t) => [t.id, t.tokens]));
/** Ordre d'affichage du catalogue (audit 07 §3.2 `ORDER`) ; les thèmes créés suivent. */
const DISPLAY_ORDER = new Map(THEME_SEED.map((t, i) => [t.id, i]));
const displayRank = (id: string): number => DISPLAY_ORDER.get(id) ?? DISPLAY_ORDER.size;

/**
 * Identifiant canonique d'un thème (legacy auth.js:211-223 `normalizeThemeId` ; alias de
 * referentials.ts). Vide ⇒ `dark`.
 */
export function normalizeThemeId(value: unknown): string {
	let id = typeof value === 'string' ? value.trim().toLowerCase().slice(0, 128) : '';
	if (!id) return 'dark';
	if (THEME_ID_ALIASES[id]) return THEME_ID_ALIASES[id];
	if (id.startsWith('theme-')) id = id.slice(6);
	if (THEME_ID_ALIASES[id]) return THEME_ID_ALIASES[id];
	const loose = id
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9-]+/g, '');
	return THEME_ID_ALIASES[loose] ?? (loose || 'dark');
}

/** Les huit tokens d'un thème : catalogue de l'interface, sinon les couleurs stockées (thème créé). */
export function themeTokens(theme: Pick<Theme, 'id' | 'preview'>): ThemeTokens {
	const known = TOKENS_BY_ID.get(theme.id);
	if (known) return known;
	const colors = theme.preview?.colors ?? [];
	if (colors.length === THEME_TOKEN_KEYS.length) {
		return Object.fromEntries(THEME_TOKEN_KEYS.map((k, i) => [k, colors[i]])) as ThemeTokens;
	}
	return TOKENS_BY_ID.get('dark') as ThemeTokens;
}

/** Vrai si un thème doit recevoir ses tokens en ligne (pas de règle CSS dans themes.css). */
export function isCustomTheme(themeId: string): boolean {
	return !TOKENS_BY_ID.has(themeId);
}

interface ThemeAccess {
	theme: Theme;
	owned: boolean;
	blocked: boolean;
	visible: boolean;
}

/** Calcule possession, blocage et visibilité de chaque thème pour un compte (audit 07 §3.3). */
async function themeAccessFor(db: Db | Tx, account: Pick<Account, 'id' | 'role'>, now = new Date()): Promise<ThemeAccess[]> {
	// Séquentiel : une transaction n'a qu'une connexion.
	const all = (await db.select().from(themes).orderBy(asc(themes.createdAt), asc(themes.id))).sort(
		(a, b) => displayRank(a.id) - displayRank(b.id)
	);
	const grants = await db.select().from(accountThemeGrants).where(eq(accountThemeGrants.accountId, account.id));
	const unlocked = new Set(grants.filter((g) => g.kind === 'unlocked').map((g) => g.themeId));
	const blockedSet = new Set(grants.filter((g) => g.kind === 'blocked').map((g) => g.themeId));
	const staff = STAFF_ROLES.has(account.role);
	return all.map((theme) => {
		const blocked = blockedSet.has(theme.id) && !ALWAYS.has(theme.id);
		const autoGranted =
			theme.autoGrantAll && (!theme.availableUntil || theme.availableUntil.getTime() > now.getTime());
		// Administrateur : possède tout ; MJ et designer : peuvent utiliser tout thème (main.js:1098-1100, 1128).
		const owned = !blocked && (ALWAYS.has(theme.id) || staff || unlocked.has(theme.id) || autoGranted);
		const visible = ALWAYS.has(theme.id) || theme.visible;
		return { theme, owned, blocked, visible };
	});
}

function toThemeView(access: ThemeAccess, activeId: string): ThemeView {
	const { theme } = access;
	const tokens = themeTokens(theme);
	return {
		id: theme.id,
		name: theme.name,
		description: theme.description,
		tone: tonOf(tokens),
		tokens,
		owned: access.owned,
		active: theme.id === activeId,
		blocked: access.blocked,
		visible: access.visible,
		isBuiltin: theme.isBuiltin,
		category: theme.category,
		rarity: theme.rarity,
		isEvent: theme.isEvent,
		availableUntil: iso(theme.availableUntil),
		autoGrantAll: theme.autoGrantAll,
		revision: theme.revision
	};
}

/**
 * Ma collection (06 §B.1 `listThemes`) : pour un joueur, les thèmes visibles et ceux qu'il possède
 * (un thème masqué reste visible pour qui le possède, audit 07 §3.3) ; l'administrateur voit tout.
 */
export async function listThemes(db: Db, actor: Actor | null): Promise<ThemeView[]> {
	const present = requireActor(actor);
	const [account] = await db
		.select({ id: accounts.id, role: accounts.role, selectedTheme: accounts.selectedTheme })
		.from(accounts)
		.where(eq(accounts.id, present.accountId));
	if (!account) throw NpError.unauthenticated(SESSION_CLOSED_MESSAGE);
	const access = await themeAccessFor(db, account);
	const seeAll = account.role === 'admin';
	return access
		.filter((a) => seeAll || a.visible || a.owned || a.theme.id === account.selectedTheme)
		.map((a) => toThemeView(a, account.selectedTheme));
}

/** Équiper un thème possédé et non bloqué (audit 05 §4.5 `self_set_theme`). */
export async function selectTheme(
	db: Db,
	actor: Actor | null,
	input: SelectThemeInput
): Promise<{ themeId: string; ton: 'sombre' | 'clair' }> {
	const present = requireActor(actor);
	const data = parseInput(selectThemeInput, input);
	const themeId = normalizeThemeId(data.themeId);
	return db.transaction(async (tx) => {
		const account = await assertFreshAccount(tx, present);
		const access = (await themeAccessFor(tx, account)).find((a) => a.theme.id === themeId);
		if (!access) throw NpError.notFound('Ce thème n’existe pas.');
		if (!access.owned) throw NpError.forbidden('Ce thème n’est pas dans ta collection.');
		await tx.update(accounts).set({ selectedTheme: themeId }).where(eq(accounts.id, account.id));
		await recordAudit(tx, {
			source: 'auth',
			action: 'self_set_theme',
			actor: present,
			details: { themeId },
			...auditContextOf(present)
		});
		return { themeId, ton: tonOf(themeTokens(access.theme)) };
	});
}

/**
 * Thème actif d'un compte pour le rendu (hook) : le thème choisi s'il est encore utilisable, sinon
 * `dark`. `custom` : thème créé dans le Registre, sans règle CSS (tokens injectés par le hook).
 */
export async function resolveActiveTheme(
	db: Db | Tx,
	account: Pick<Account, 'id' | 'role' | 'selectedTheme'>
): Promise<{ id: string; ton: 'sombre' | 'clair'; tokens: ThemeTokens; custom: boolean }> {
	const fallback = { id: 'dark', ton: 'sombre' as const, tokens: TOKENS_BY_ID.get('dark') as ThemeTokens, custom: false };
	if (account.selectedTheme === 'dark') return fallback;
	const access = (await themeAccessFor(db, account)).find((a) => a.theme.id === account.selectedTheme);
	if (!access || !access.owned) return fallback;
	const tokens = themeTokens(access.theme);
	return { id: access.theme.id, ton: tonOf(tokens), tokens, custom: isCustomTheme(access.theme.id) };
}

async function requireTheme(tx: Db | Tx, themeId: string): Promise<Theme> {
	const [theme] = await tx.select().from(themes).where(eq(themes.id, themeId)).for('update');
	if (!theme) throw NpError.notFound('Ce thème n’existe pas.');
	return theme;
}

async function themeAdminTx<T>(
	db: Db,
	actor: Actor | null,
	work: (tx: Tx, present: Actor) => Promise<T>
): Promise<T> {
	const present = assertCan(actor, 'admin.themes');
	return db.transaction(async (tx) => {
		await assertFreshAccount(tx, present);
		return work(tx, present);
	});
}

/** Donner un thème à un joueur (audit 05 §4.5 `admin_grant_theme` : « Ce don est réservé aux joueurs. »). */
export async function grantTheme(db: Db, actor: Actor | null, input: AccountThemeInput): Promise<{ granted: boolean }> {
	const data = parseInput(accountThemeInput, input);
	const themeId = normalizeThemeId(data.themeId);
	return themeAdminTx(db, actor, async (tx, present) => {
		const theme = await requireTheme(tx, themeId);
		const [target] = await tx.select().from(accounts).where(eq(accounts.id, data.accountId));
		if (!target) throw notFoundAccount();
		if (target.role !== 'joueur') throw new NpError('INVALID', 'Ce don est réservé aux joueurs.', 400);
		const rows = await tx
			.insert(accountThemeGrants)
			.values({ accountId: target.id, themeId: theme.id, kind: 'unlocked', grantedBy: present.accountId })
			.onConflictDoNothing()
			.returning({ themeId: accountThemeGrants.themeId });
		await recordAudit(tx, {
			source: 'accounts',
			action: 'admin_grant_theme',
			actor: present,
			details: { accountId: target.id, pseudo: target.pseudo, themeId: theme.id },
			...auditContextOf(present)
		});
		return { granted: rows.length > 0 };
	});
}

/** Donner un thème à tous les joueurs (audit 05 §4.5 `admin_grant_theme_all` → `{ changed }`). */
export async function grantThemeToAll(db: Db, actor: Actor | null, input: ThemeOnlyInput): Promise<{ changed: number }> {
	const data = parseInput(themeOnlyInput, input);
	const themeId = normalizeThemeId(data.themeId);
	return themeAdminTx(db, actor, async (tx, present) => {
		const theme = await requireTheme(tx, themeId);
		const players = await tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.role, 'joueur'));
		let changed = 0;
		if (players.length > 0) {
			const rows = await tx
				.insert(accountThemeGrants)
				.values(players.map((p) => ({ accountId: p.id, themeId: theme.id, kind: 'unlocked' as const, grantedBy: present.accountId })))
				.onConflictDoNothing()
				.returning({ accountId: accountThemeGrants.accountId });
			changed = rows.length;
		}
		await recordAudit(tx, {
			source: 'accounts',
			action: 'admin_grant_theme_all',
			actor: present,
			details: { themeId: theme.id, changed },
			...auditContextOf(present)
		});
		return { changed };
	});
}

/** Retirer un thème donné ; le thème équipé retombe sur `dark` (audit 05 §4.5 `admin_revoke_theme`). */
export async function revokeTheme(db: Db, actor: Actor | null, input: AccountThemeInput): Promise<{ revoked: boolean }> {
	const data = parseInput(accountThemeInput, input);
	const themeId = normalizeThemeId(data.themeId);
	if (ALWAYS.has(themeId)) throw new NpError('INVALID', 'Ce thème est accordé à tout le monde.', 400);
	return themeAdminTx(db, actor, async (tx, present) => {
		await requireTheme(tx, themeId);
		const [target] = await tx.select().from(accounts).where(eq(accounts.id, data.accountId)).for('update');
		if (!target) throw notFoundAccount();
		const rows = await tx
			.delete(accountThemeGrants)
			.where(
				and(
					eq(accountThemeGrants.accountId, target.id),
					eq(accountThemeGrants.themeId, themeId),
					eq(accountThemeGrants.kind, 'unlocked')
				)
			)
			.returning({ themeId: accountThemeGrants.themeId });
		if (target.selectedTheme === themeId) {
			await tx.update(accounts).set({ selectedTheme: 'dark' }).where(eq(accounts.id, target.id));
		}
		await recordAudit(tx, {
			source: 'accounts',
			action: 'admin_revoke_theme',
			actor: present,
			details: { accountId: target.id, pseudo: target.pseudo, themeId },
			...auditContextOf(present)
		});
		return { revoked: rows.length > 0 };
	});
}

/** Bloquer un thème pour un compte ; le thème équipé retombe sur `dark` (audit 05 §4.5 `admin_block_theme`). */
export async function blockTheme(db: Db, actor: Actor | null, input: AccountThemeInput): Promise<{ blocked: true }> {
	const data = parseInput(accountThemeInput, input);
	const themeId = normalizeThemeId(data.themeId);
	if (ALWAYS.has(themeId)) throw new NpError('INVALID', 'Ce thème est accordé à tout le monde.', 400);
	return themeAdminTx(db, actor, async (tx, present) => {
		await requireTheme(tx, themeId);
		const [target] = await tx.select().from(accounts).where(eq(accounts.id, data.accountId)).for('update');
		if (!target) throw notFoundAccount();
		await tx
			.insert(accountThemeGrants)
			.values({ accountId: target.id, themeId, kind: 'blocked', grantedBy: present.accountId })
			.onConflictDoNothing();
		if (target.selectedTheme === themeId) {
			await tx.update(accounts).set({ selectedTheme: 'dark' }).where(eq(accounts.id, target.id));
		}
		await recordAudit(tx, {
			source: 'accounts',
			action: 'admin_block_theme',
			actor: present,
			details: { accountId: target.id, pseudo: target.pseudo, themeId },
			...auditContextOf(present)
		});
		return { blocked: true as const };
	});
}

/** Lever le blocage d'un thème (audit 05 §4.5 `admin_unblock_theme`). */
export async function unblockTheme(db: Db, actor: Actor | null, input: AccountThemeInput): Promise<{ blocked: false }> {
	const data = parseInput(accountThemeInput, input);
	const themeId = normalizeThemeId(data.themeId);
	return themeAdminTx(db, actor, async (tx, present) => {
		const [target] = await tx.select().from(accounts).where(eq(accounts.id, data.accountId));
		if (!target) throw notFoundAccount();
		await tx
			.delete(accountThemeGrants)
			.where(
				and(
					eq(accountThemeGrants.accountId, target.id),
					eq(accountThemeGrants.themeId, themeId),
					eq(accountThemeGrants.kind, 'blocked')
				)
			);
		await recordAudit(tx, {
			source: 'accounts',
			action: 'admin_unblock_theme',
			actor: present,
			details: { accountId: target.id, pseudo: target.pseudo, themeId },
			...auditContextOf(present)
		});
		return { blocked: false as const };
	});
}

/**
 * Visibilité d'un thème dans la collection (audit 05 §4.5 `admin_set_theme_visibility`). `dark` et
 * `light` restent toujours visibles (« Les thèmes donnés à tout le monde restent visibles. », main.js:4183).
 */
export async function setThemeVisibility(
	db: Db,
	actor: Actor | null,
	input: ThemeVisibilityInput
): Promise<{ themeId: string; visible: boolean; revision: number }> {
	const data = parseInput(themeVisibilityInput, input);
	const themeId = normalizeThemeId(data.themeId);
	if (ALWAYS.has(themeId) && !data.visible) {
		throw new NpError('INVALID', 'Les thèmes donnés à tout le monde restent visibles.', 400);
	}
	return themeAdminTx(db, actor, async (tx, present) => {
		await requireTheme(tx, themeId);
		const [updated] = await tx
			.update(themes)
			.set({ visible: data.visible, revision: sql`${themes.revision} + 1` })
			.where(eq(themes.id, themeId))
			.returning({ revision: themes.revision });
		await recordAudit(tx, {
			source: 'accounts',
			action: 'admin_set_theme_visibility',
			actor: present,
			details: { themeId, visible: data.visible },
			...auditContextOf(present)
		});
		return { themeId, visible: data.visible, revision: updated.revision };
	});
}

/** Distribution automatique à tous les joueurs (audit 05 §4.5 `admin_set_theme_autogrant`). */
export async function setThemeAutoGrant(
	db: Db,
	actor: Actor | null,
	input: ThemeAutoGrantInput
): Promise<{ themeId: string; autoGrantAll: boolean; revision: number }> {
	const data = parseInput(themeAutoGrantInput, input);
	const themeId = normalizeThemeId(data.themeId);
	return themeAdminTx(db, actor, async (tx, present) => {
		await requireTheme(tx, themeId);
		const [updated] = await tx
			.update(themes)
			.set({ autoGrantAll: data.enabled, revision: sql`${themes.revision} + 1` })
			.where(eq(themes.id, themeId))
			.returning({ revision: themes.revision });
		await recordAudit(tx, {
			source: 'accounts',
			action: 'admin_set_theme_autogrant',
			actor: present,
			details: { themeId, autoGrantAll: data.enabled },
			...auditContextOf(present)
		});
		return { themeId, autoGrantAll: data.enabled, revision: updated.revision };
	});
}

/**
 * Créer un thème (03-vision §5.11 : huit couleurs vérifiées à 4,5:1 par `validateTheme`, sinon refus).
 * Les huit tokens sont conservés dans `preview.colors`, dans l'ordre de THEME_TOKEN_KEYS.
 */
export async function createTheme(db: Db, actor: Actor | null, input: CreateThemeInput): Promise<ThemeView> {
	const present = assertCan(actor, 'admin.themes');
	const data = parseInput(createThemeInput, input);
	const tokens = data.tokens as ThemeTokens;
	const check = validateTheme(tokens);
	if (!check.valid) {
		const detail = check.insufficient.map((p) => `${p.foreground} ${p.ratio.toFixed(2)}:1`).join(', ');
		throw new NpError(
			'CONTRAST',
			`Contraste insuffisant : l’encre doit atteindre 4,5:1 sur la page (${detail}). Le thème n’est pas proposé.`,
			400
		);
	}
	const ton = tonOf(tokens);
	try {
		return await db.transaction(async (tx) => {
			await assertFreshAccount(tx, present);
			const [row] = await tx
				.insert(themes)
				.values({
					id: data.id,
					name: data.name,
					description: data.description ?? '',
					cssClass: '',
					isEvent: false,
					visible: true,
					autoGrantAll: false,
					rarity: 'Classique',
					category: 'Classiques',
					isBuiltin: false,
					preview: { colors: THEME_TOKEN_KEYS.map((k) => tokens[k]), tone: ton === 'clair' ? 'light' : 'dark', tagline: '' }
				})
				.returning();
			await recordAudit(tx, {
				source: 'accounts',
				action: 'admin_create_theme',
				actor: present,
				details: { themeId: row.id, name: row.name },
				...auditContextOf(present)
			});
			const [owner] = await tx.select({ selectedTheme: accounts.selectedTheme }).from(accounts).where(eq(accounts.id, present.accountId));
			return toThemeView({ theme: row, owned: true, blocked: false, visible: true }, owner?.selectedTheme ?? 'dark');
		});
	} catch (e) {
		if (isUniqueViolation(e)) throw new NpError('THEME_EXISTS', 'Ce thème existe déjà.', 409);
		throw e;
	}
}
