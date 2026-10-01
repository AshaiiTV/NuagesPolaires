// Tests d'intégration du domaine comptes (06-contrats §B.1) sur PGlite, migrations réelles.
// Exigences : audit 06 §3.A (A1-A25 adaptées au modèle sessions + révision), §3.J ; 04 §4, §5, §6, §10.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import { DEMO_IDS, DEMO_PASSWORDS } from '$lib/server/db/seed';
import {
	accounts,
	accountThemeGrants,
	auditLog,
	authRateLimits,
	characters,
	sessions,
	staffLog,
	themes
} from '$lib/server/db/schema';
import type { Actor } from '$lib/server/permissions';
import { bindRequestContext } from '$lib/server/auth/context';
import { hashPassword } from '$lib/server/auth/password';
import { countSessions, readSession } from '$lib/server/auth/session';
import {
	actorFor,
	ensureTestEnv,
	failOnDelete,
	interceptTransaction,
	legacyPbkdf2Hash,
	legacySha256
} from '$lib/server/auth/testing';
import {
	LOGIN_FAILED_MESSAGE,
	PSEUDO_TAKEN_MESSAGE,
	adminResetPassword,
	adminSetPassword,
	blockTheme,
	changeOwnPassword,
	completeForcedReset,
	createTheme,
	deleteOwnAccount,
	getOwnAccount,
	grantTheme,
	grantThemeToAll,
	linkCharacter,
	listAccounts,
	listPending,
	listThemes,
	login,
	logout,
	normalizeThemeId,
	register,
	resolveActiveTheme,
	revokeTheme,
	selectTheme,
	setRole,
	setThemeAutoGrant,
	setThemeVisibility,
	strikeAccount,
	unblockTheme,
	unlinkCharacter
} from './accounts';

const A = DEMO_IDS.accounts;
const P = DEMO_IDS.characters;

let t: TestDb;
let admin: Actor;
let alice: Actor;
let bob: Actor;
let mj: Actor;
let designer: Actor;
let nova: Actor;

beforeAll(() => ensureTestEnv());
beforeEach(async () => {
	t = await createTestDb({ demo: true });
	admin = await actorFor(t.db, A.admin);
	alice = await actorFor(t.db, A.alice);
	bob = await actorFor(t.db, A.bob);
	mj = await actorFor(t.db, A.mj);
	designer = await actorFor(t.db, A.designer);
	nova = await actorFor(t.db, A.nova);
});
afterEach(async () => {
	await t.close();
});

async function accountRow(id: string) {
	const [row] = await t.db.select().from(accounts).where(eq(accounts.id, id));
	return row;
}
async function auditActions(): Promise<string[]> {
	return (await t.db.select({ action: auditLog.action }).from(auditLog)).map((r) => r.action);
}
async function setHash(id: string, passwordHash: string) {
	await t.db.update(accounts).set({ passwordHash }).where(eq(accounts.id, id));
}

// ---------------------------------------------------------------------------
describe('inscription (audit 05 §4.4 ; audit 06 A2)', () => {
	it('crée un compte joueur non relié, scrypt, avec une session pleine et un audit', async () => {
		const res = await register(t.db, { pseudo: 'Ashaii', password: 'un-mot-de-passe', acceptRules: true, ip: '1.1.1.1' });
		const read = await readSession(t.db, res.sessionToken);
		expect(read?.session.scope).toBe('full');
		expect(read?.account).toMatchObject({ pseudo: 'Ashaii', role: 'joueur', characterId: null });
		expect(read?.account.passwordHash).toMatch(/^scrypt\$/);
		expect(await auditActions()).toContain('register_success');
		expect(JSON.stringify(res)).not.toContain('scrypt');
	});

	it('refuse un pseudo déjà pris, sans tenir compte de la casse (409 PSEUDO_TAKEN)', async () => {
		await expect(register(t.db, { pseudo: 'ALICE', password: 'un-mot-de-passe', acceptRules: true })).rejects.toMatchObject({
			code: 'PSEUDO_TAKEN',
			status: 409,
			message: PSEUDO_TAKEN_MESSAGE
		});
	});

	it('deux inscriptions simultanées du même pseudo : un succès, un 409, un seul compte', async () => {
		const results = await Promise.allSettled([
			register(t.db, { pseudo: 'Orage', password: 'un-mot-de-passe', acceptRules: true, ip: '2.2.2.1' }),
			register(t.db, { pseudo: 'orage', password: 'un-mot-de-passe', acceptRules: true, ip: '2.2.2.2' })
		]);
		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
		expect(rejected.reason).toMatchObject({ code: 'PSEUDO_TAKEN', status: 409 });
		const rows = await t.db.select().from(accounts).where(sql`lower(${accounts.pseudo}) = 'orage'`);
		expect(rows).toHaveLength(1);
	});

	it('deux inscriptions simultanées de pseudos distincts réussissent', async () => {
		const [a, b] = await Promise.all([
			register(t.db, { pseudo: 'Brise', password: 'un-mot-de-passe', acceptRules: true, ip: '3.3.3.1' }),
			register(t.db, { pseudo: 'Givre', password: 'un-mot-de-passe', acceptRules: true, ip: '3.3.3.2' })
		]);
		expect(a.accountId).not.toBe(b.accountId);
	});

	it.each([
		[{ pseudo: 'x', password: 'un-mot-de-passe', acceptRules: true }, /Pseudo invalide/],
		[{ pseudo: 'Ok<script>', password: 'un-mot-de-passe', acceptRules: true }, /Pseudo invalide/],
		[{ pseudo: 'Valide', password: 'court', acceptRules: true }, /au moins 8 caractères/],
		[{ pseudo: 'Valide', password: 'un-mot-de-passe' }, /règlement/],
		[{ pseudo: 'Valide', password: 'un-mot-de-passe', acceptRules: false }, /règlement/]
	])('refuse une entrée invalide en 400 (%#)', async (input, message) => {
		await expect(register(t.db, input as never)).rejects.toMatchObject({ code: 'INVALID', status: 400, message: expect.stringMatching(message) });
	});

	it('accepte la case cochée d’un formulaire (`on`)', async () => {
		await expect(register(t.db, { pseudo: 'Case', password: 'un-mot-de-passe', acceptRules: 'on' as never })).resolves.toBeTruthy();
	});

	it('limite les inscriptions : 429 après 10 tentatives par pseudo, audit register_rate_limited', async () => {
		for (let i = 0; i < 10; i++) {
			await register(t.db, { pseudo: 'alice', password: 'un-mot-de-passe', acceptRules: true, ip: `4.4.4.${i}` }).catch(() => undefined);
		}
		await expect(register(t.db, { pseudo: 'alice', password: 'un-mot-de-passe', acceptRules: true, ip: '4.4.4.99' })).rejects.toMatchObject({ status: 429 });
		expect(await auditActions()).toContain('register_rate_limited');
	});
});

// ---------------------------------------------------------------------------
describe('connexion (audit 05 §4.4 ; audit 06 A3 ; 04 §10.9)', () => {
	it('format hérité sha256: — connexion puis ré-encodage scrypt dans la transaction de session', async () => {
		expect((await accountRow(A.alice)).passwordHash).toMatch(/^sha256:/);
		const res = await login(t.db, { pseudo: 'Alice', password: DEMO_PASSWORDS.alice, ip: '5.5.5.5', userAgent: 'vitest' });
		expect(res.scope).toBe('full');
		expect(res.weakPassword).toBe(false);
		const row = await accountRow(A.alice);
		expect(row.passwordHash).toMatch(/^scrypt\$32768\$8\$1\$/);
		expect(row.lastSeenAt).not.toBeNull();
		const [audit] = await t.db.select().from(auditLog).where(eq(auditLog.action, 'login_success'));
		expect(audit.details).toMatchObject({ rehashed: true, scope: 'full' });
		expect(audit.ip).toBe('5.5.5.5');
		// Le nouveau hash fonctionne, sans nouveau ré-encodage.
		await login(t.db, { pseudo: 'alice', password: DEMO_PASSWORDS.alice, ip: '5.5.5.5' });
		expect((await accountRow(A.alice)).passwordHash).toBe(row.passwordHash);
	});

	it('format hérité pbkdf2: (sel passé comme chaîne) puis ré-encodage', async () => {
		await setHash(A.bob, legacyPbkdf2Hash('Bob-ancien-1', 'ab'.repeat(32)));
		await login(t.db, { pseudo: 'bob', password: 'Bob-ancien-1' });
		expect((await accountRow(A.bob)).passwordHash).toMatch(/^scrypt\$/);
	});

	it('format hérité hex nu, mot de passe de 4 caractères accepté avec invitation à changer (04 §4)', async () => {
		await setHash(A.nova, legacySha256('nova').slice(7));
		const res = await login(t.db, { pseudo: 'nova', password: 'nova' });
		expect(res.weakPassword).toBe(true);
		expect((await accountRow(A.nova)).passwordHash).toMatch(/^scrypt\$/);
	});

	it('401 générique identique pour mauvais mot de passe et compte inconnu ; audit login_failed', async () => {
		const wrong = login(t.db, { pseudo: 'alice', password: 'mauvais' });
		await expect(wrong).rejects.toMatchObject({ status: 401, message: LOGIN_FAILED_MESSAGE });
		await expect(login(t.db, { pseudo: 'personne', password: 'mauvais' })).rejects.toMatchObject({ status: 401, message: LOGIN_FAILED_MESSAGE });
		expect(LOGIN_FAILED_MESSAGE).toBe('Identifiant ou mot de passe incorrect');
		expect((await auditActions()).filter((a) => a === 'login_failed')).toHaveLength(2);
		expect(await t.db.select().from(sessions)).toHaveLength(0);
	});

	it('champs manquants ⇒ 400', async () => {
		await expect(login(t.db, { pseudo: '', password: '' })).rejects.toMatchObject({ status: 400, code: 'INVALID' });
	});

	it('limite : 429 après 10 tentatives, aucune exception pour un admin au bon mot de passe', async () => {
		for (let i = 0; i < 10; i++) await login(t.db, { pseudo: 'admin', password: 'faux', ip: `6.6.6.${i}` }).catch(() => undefined);
		await expect(login(t.db, { pseudo: 'admin', password: DEMO_PASSWORDS.admin, ip: '6.6.6.200' })).rejects.toMatchObject({
			status: 429,
			code: 'RATE_LIMITED'
		});
		expect(await auditActions()).toContain('login_rate_limited');
	});

	it('une connexion réussie remet le compteur du pseudo à zéro', async () => {
		for (let i = 0; i < 5; i++) await login(t.db, { pseudo: 'bob', password: 'faux', ip: `7.7.7.${i}` }).catch(() => undefined);
		await login(t.db, { pseudo: 'bob', password: DEMO_PASSWORDS.bob, ip: '7.7.7.50' });
		const rows = await t.db.select().from(authRateLimits).where(and(eq(authRateLimits.scope, 'login'), eq(authRateLimits.subject, 'bob')));
		expect(rows).toHaveLength(0);
	});

	it('réinitialisation concurrente pendant la vérification : aucune session fondée sur l’ancien hash (B8)', async () => {
		const racing = interceptTransaction(t.db, {
			before: async () => {
				await t.db
					.update(accounts)
					.set({ passwordHash: await hashPassword('autre-chose-123'), sessionVersion: sql`${accounts.sessionVersion} + 1` })
					.where(eq(accounts.id, A.alice));
			}
		});
		await expect(login(racing, { pseudo: 'alice', password: DEMO_PASSWORDS.alice })).rejects.toMatchObject({ status: 401 });
		expect(await countSessions(t.db, A.alice)).toBe(0);
	});

	it('un MJ qui se connecte laisse une ligne `connexion` au journal staff ; un joueur non (audit 06 B15)', async () => {
		await login(t.db, { pseudo: 'alice', password: DEMO_PASSWORDS.alice });
		expect(await t.db.select().from(staffLog)).toHaveLength(0);
		await login(t.db, { pseudo: 'mj', password: DEMO_PASSWORDS.mj });
		const rows = await t.db.select().from(staffLog);
		expect(rows.map((r) => r.action)).toEqual(['connexion']);
	});
});

// ---------------------------------------------------------------------------
describe('déconnexion (audit 06 A5 ; 04 §10.8)', () => {
	it('révoque toutes les sessions ; rejouée, renvoie sans nouvelle révocation', async () => {
		const one = await login(t.db, { pseudo: 'alice', password: DEMO_PASSWORDS.alice });
		const two = await login(t.db, { pseudo: 'alice', password: DEMO_PASSWORDS.alice });
		expect(await logout(t.db, one.sessionToken)).toEqual({ revoked: true });
		expect(await readSession(t.db, one.sessionToken)).toBeNull();
		expect(await readSession(t.db, two.sessionToken)).toBeNull();
		const version = (await accountRow(A.alice)).sessionVersion;
		expect(await logout(t.db, one.sessionToken)).toEqual({ revoked: false });
		expect(await logout(t.db, null)).toEqual({ revoked: false });
		expect((await accountRow(A.alice)).sessionVersion).toBe(version);
	});
});

// ---------------------------------------------------------------------------
describe('changement de son mot de passe (audit 06 A6)', () => {
	it('exige le mot de passe actuel (403)', async () => {
		await expect(changeOwnPassword(t.db, alice, { current: 'faux', next: 'nouveau-mdp-1' })).rejects.toMatchObject({
			status: 403,
			message: 'Mot de passe actuel incorrect'
		});
		await expect(changeOwnPassword(t.db, null, { current: 'x', next: 'nouveau-mdp-1' })).rejects.toMatchObject({ status: 401 });
	});

	it('révoque les autres sessions et renvoie une session de remplacement valide', async () => {
		const old = await login(t.db, { pseudo: 'alice', password: DEMO_PASSWORDS.alice });
		const res = await changeOwnPassword(t.db, alice, { current: DEMO_PASSWORDS.alice, next: 'nouveau-mdp-1' });
		expect(await readSession(t.db, old.sessionToken)).toBeNull();
		expect((await readSession(t.db, res.sessionToken))?.session.scope).toBe('full');
		await expect(login(t.db, { pseudo: 'alice', password: DEMO_PASSWORDS.alice })).rejects.toMatchObject({ status: 401 });
		await expect(login(t.db, { pseudo: 'alice', password: 'nouveau-mdp-1' })).resolves.toBeTruthy();
		expect(await auditActions()).toContain('self_change_password');
	});

	it('refuse un nouveau mot de passe de moins de 8 caractères', async () => {
		await expect(changeOwnPassword(t.db, alice, { current: DEMO_PASSWORDS.alice, next: 'court' })).rejects.toMatchObject({ status: 400 });
	});

	it('session révoquée entre-temps ⇒ 401 dans la transaction (04 §10.7)', async () => {
		const res = await login(t.db, { pseudo: 'alice', password: DEMO_PASSWORDS.alice });
		const read = await readSession(t.db, res.sessionToken);
		const bound: Actor = { ...alice };
		bindRequestContext(bound, { ip: '', userAgent: '', origin: '', sessionId: read!.session.id, sessionVersion: read!.session.sessionVersion });
		await logout(t.db, res.sessionToken);
		await expect(changeOwnPassword(t.db, bound, { current: DEMO_PASSWORDS.alice, next: 'nouveau-mdp-1' })).rejects.toMatchObject({ status: 401 });
	});
});

// ---------------------------------------------------------------------------
describe('réinitialisation par un administrateur (audit 06 A7-A11 ; 04 §4, §10.8)', () => {
	it('parcours complet : secret unique, session restreinte, finalisation atomique, rejeu refusé', async () => {
		const before = await login(t.db, { pseudo: 'bob', password: DEMO_PASSWORDS.bob });
		const reset = await adminResetPassword(t.db, admin, { accountId: A.bob });
		expect(reset.temporaryPassword).toMatch(/^[A-Za-z0-9_-]{32}$/);
		expect(new Date(reset.expiresAt).getTime()).toBeLessThanOrEqual(Date.now() + 3600_000);
		expect(await readSession(t.db, before.sessionToken)).toBeNull();

		const row = await accountRow(A.bob);
		expect(row.forcePasswordReset).toBe(true);
		expect(row.resetSecretHash).toMatch(/^scrypt\$/);
		const everything = JSON.stringify(await t.db.select().from(auditLog)) + JSON.stringify(await t.db.select().from(staffLog)) + JSON.stringify(row);
		expect(everything).not.toContain(reset.temporaryPassword);
		expect((await t.db.select().from(staffLog)).map((r) => r.action)).toContain('mdp_reset');

		// L'ancien mot de passe ne fonctionne plus.
		await expect(login(t.db, { pseudo: 'bob', password: DEMO_PASSWORDS.bob })).rejects.toMatchObject({ status: 401 });
		const restricted = await login(t.db, { pseudo: 'bob', password: reset.temporaryPassword });
		expect(restricted.scope).toBe('reset');
		const read = await readSession(t.db, restricted.sessionToken);
		expect(read?.session.scope).toBe('reset');
		expect(read!.session.expiresAt.getTime()).toBeLessThanOrEqual(new Date(reset.expiresAt).getTime());

		const resetActor = { accountId: A.bob, sessionId: read!.session.id };
		const done = await completeForcedReset(t.db, resetActor, { next: 'Bob-nouveau-1' });
		expect((await readSession(t.db, done.sessionToken))?.session.scope).toBe('full');
		const after = await accountRow(A.bob);
		expect(after).toMatchObject({ forcePasswordReset: false, resetExpiresAt: null, resetSecretHash: null });
		// Rejeu : la session de réinitialisation n'existe plus.
		await expect(completeForcedReset(t.db, resetActor, { next: 'Bob-encore-2' })).rejects.toMatchObject({ status: 401 });
		await expect(login(t.db, { pseudo: 'bob', password: reset.temporaryPassword })).rejects.toMatchObject({ status: 401 });
		await expect(login(t.db, { pseudo: 'bob', password: 'Bob-nouveau-1' })).resolves.toMatchObject({ scope: 'full' });
		expect(await auditActions()).toEqual(expect.arrayContaining(['admin_reset_password', 'complete_forced_reset']));
	});

	it('une session normale ne peut pas finaliser une réinitialisation (403)', async () => {
		const full = await login(t.db, { pseudo: 'bob', password: DEMO_PASSWORDS.bob });
		const read = await readSession(t.db, full.sessionToken);
		await expect(completeForcedReset(t.db, { accountId: A.bob, sessionId: read!.session.id }, { next: 'Bob-nouveau-1' })).rejects.toMatchObject({
			status: 403
		});
		await expect(completeForcedReset(t.db, null, { next: 'Bob-nouveau-1' })).rejects.toMatchObject({ status: 401 });
	});

	it('secret expiré : connexion refusée avec un message explicite, session reset invalide (A10)', async () => {
		const reset = await adminResetPassword(t.db, admin, { accountId: A.bob });
		const restricted = await login(t.db, { pseudo: 'bob', password: reset.temporaryPassword });
		const read = await readSession(t.db, restricted.sessionToken);
		await t.db.update(accounts).set({ resetExpiresAt: new Date(Date.now() - 1000) }).where(eq(accounts.id, A.bob));
		await expect(login(t.db, { pseudo: 'bob', password: reset.temporaryPassword })).rejects.toMatchObject({
			status: 401,
			code: 'RESET_EXPIRED',
			message: expect.stringMatching(/expiré/)
		});
		expect(await readSession(t.db, restricted.sessionToken)).toBeNull();
		await expect(completeForcedReset(t.db, { accountId: A.bob, sessionId: read!.session.id }, { next: 'Bob-nouveau-1' })).rejects.toMatchObject({
			status: 401
		});
	});

	it('compte hérité forcé sans échéance : aucune connexion (A10)', async () => {
		await t.db.update(accounts).set({ forcePasswordReset: true, resetExpiresAt: null }).where(eq(accounts.id, A.bob));
		await expect(login(t.db, { pseudo: 'bob', password: DEMO_PASSWORDS.bob })).rejects.toMatchObject({ status: 401 });
	});

	it('droits : admin seulement', async () => {
		for (const who of [mj, designer, alice]) {
			await expect(adminResetPassword(t.db, who, { accountId: A.bob })).rejects.toMatchObject({ status: 403 });
		}
		await expect(adminResetPassword(t.db, null, { accountId: A.bob })).rejects.toMatchObject({ status: 401 });
		await expect(adminResetPassword(t.db, admin, { accountId: 'a_inconnu' })).rejects.toMatchObject({ status: 404 });
	});

	it('définir un mot de passe remplace le hash et révoque les sessions (A11)', async () => {
		const s = await login(t.db, { pseudo: 'bob', password: DEMO_PASSWORDS.bob });
		await adminSetPassword(t.db, admin, { accountId: A.bob, password: 'Bob-impose-1' });
		expect(await readSession(t.db, s.sessionToken)).toBeNull();
		await expect(login(t.db, { pseudo: 'bob', password: 'Bob-impose-1' })).resolves.toMatchObject({ scope: 'full' });
		await expect(adminSetPassword(t.db, mj, { accountId: A.bob, password: 'Bob-impose-2' })).rejects.toMatchObject({ status: 403 });
	});
});

// ---------------------------------------------------------------------------
describe('suppression de son compte (audit 06 A14-A15)', () => {
	it('supprime le compte et SON personnage, conserve les autres', async () => {
		const s = await login(t.db, { pseudo: 'alice', password: DEMO_PASSWORDS.alice });
		await deleteOwnAccount(t.db, alice, { password: DEMO_PASSWORDS.alice });
		expect(await accountRow(A.alice)).toBeUndefined();
		expect(await t.db.select().from(characters).where(eq(characters.id, P.aria))).toHaveLength(0);
		expect(await t.db.select().from(characters).where(eq(characters.id, P.kael))).toHaveLength(1);
		expect(await readSession(t.db, s.sessionToken)).toBeNull();
		expect((await t.db.select().from(staffLog)).map((r) => r.action)).toContain('compte_supprime');
	});

	it('refuse l’administrateur et un mauvais mot de passe (403)', async () => {
		await expect(deleteOwnAccount(t.db, admin, { password: DEMO_PASSWORDS.admin })).rejects.toMatchObject({
			status: 403,
			message: 'Le compte administrateur ne peut pas être supprimé.'
		});
		await expect(deleteOwnAccount(t.db, alice, { password: 'faux' })).rejects.toMatchObject({ status: 403 });
		expect(await accountRow(A.alice)).toBeDefined();
	});

	it('personnage modifié pendant la suppression ⇒ 409, rien n’est supprimé, la modification reste', async () => {
		const racing = interceptTransaction(t.db, {
			before: async () => {
				await t.db
					.update(characters)
					.set({ journal: 'écrit pendant la suppression', revision: sql`${characters.revision} + 1` })
					.where(eq(characters.id, P.aria));
			}
		});
		await expect(deleteOwnAccount(racing, alice, { password: DEMO_PASSWORDS.alice })).rejects.toMatchObject({ status: 409 });
		expect(await accountRow(A.alice)).toBeDefined();
		const [aria] = await t.db.select().from(characters).where(eq(characters.id, P.aria));
		expect(aria.journal).toBe('écrit pendant la suppression');
	});

	it('version de session changée pendant la suppression (réinitialisation concurrente) ⇒ 409', async () => {
		const racing = interceptTransaction(t.db, {
			before: async () => {
				await t.db.update(accounts).set({ sessionVersion: sql`${accounts.sessionVersion} + 1` }).where(eq(accounts.id, A.alice));
			}
		});
		await expect(deleteOwnAccount(racing, alice, { password: DEMO_PASSWORDS.alice })).rejects.toMatchObject({ status: 409 });
		expect(await accountRow(A.alice)).toBeDefined();
	});

	it('échec au milieu de la transaction ⇒ rollback total (personnage, journaux)', async () => {
		const failing = interceptTransaction(t.db, { wrapTx: failOnDelete(accounts) });
		await expect(deleteOwnAccount(failing, alice, { password: DEMO_PASSWORDS.alice })).rejects.toThrow(/échec simulé/);
		expect(await accountRow(A.alice)).toBeDefined();
		expect(await t.db.select().from(characters).where(eq(characters.id, P.aria))).toHaveLength(1);
		expect(await auditActions()).not.toContain('self_delete_account');
		expect(await t.db.select().from(staffLog)).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
describe('projections de compte (sans secret)', () => {
	it('listAccounts : admin seulement, aucune empreinte ni secret', async () => {
		await adminResetPassword(t.db, admin, { accountId: A.bob });
		const list = await listAccounts(t.db, admin);
		expect(list.map((a) => a.pseudo)).toEqual(['admin', 'alice', 'bob', 'designer', 'mj', 'nova']);
		const aliceView = list.find((a) => a.id === A.alice)!;
		expect(aliceView).toMatchObject({ role: 'joueur', characterId: P.aria, characterName: 'Aria Lunval', discordLinked: false, revision: 1 });
		expect(Object.keys(aliceView).sort()).toEqual(
			['characterId', 'characterName', 'createdAt', 'discordLinked', 'forcePasswordReset', 'id', 'lastSeenAt', 'pseudo', 'resetExpiresAt', 'revision', 'role'].sort()
		);
		const json = JSON.stringify(list);
		expect(json).not.toMatch(/sha256:|scrypt\$|passwordHash|resetSecretHash|sessionVersion/);
		for (const who of [mj, designer, alice]) await expect(listAccounts(t.db, who)).rejects.toMatchObject({ status: 403 });
		await expect(listAccounts(t.db, null)).rejects.toMatchObject({ status: 401 });
	});

	it('listPending : comptes en attente, personnages sans compte, réinitialisations ouvertes', async () => {
		await adminResetPassword(t.db, admin, { accountId: A.bob });
		const pending = await listPending(t.db, admin);
		expect(pending.pendingAccounts.map((a) => a.pseudo)).toEqual(['nova']);
		expect(pending.unlinkedCharacters).toEqual([{ id: P.seren, name: 'Seren Vallombre', oathName: expect.any(String) }]);
		expect(pending.openResets.map((a) => a.pseudo)).toEqual(['bob']);
		await expect(listPending(t.db, mj)).rejects.toMatchObject({ status: 403 });
	});

	it('getOwnAccount : mon compte, sans secret', async () => {
		const own = await getOwnAccount(t.db, alice);
		expect(own).toMatchObject({ pseudo: 'alice', characterName: 'Aria Lunval', selectedTheme: 'dark' });
		expect(JSON.stringify(own)).not.toMatch(/sha256|scrypt/);
	});
});

// ---------------------------------------------------------------------------
describe('liaisons (audit 05 §4.5, staff `liaison` / `deliaison`)', () => {
	it('relie un compte en attente à un personnage sans compte', async () => {
		const view = await linkCharacter(t.db, admin, { accountId: A.nova, characterId: P.seren, expectedRevision: 1 });
		expect(view).toMatchObject({ characterId: P.seren, characterName: 'Seren Vallombre', revision: 2 });
		const [log] = await t.db.select().from(staffLog);
		expect(log).toMatchObject({ action: 'liaison', detail: "Compte 'nova' lié au personnage 'Seren Vallombre'" });
		expect(await auditActions()).toContain('admin_link_account');
	});

	it('428 sans version, 409 avec une version périmée', async () => {
		await expect(linkCharacter(t.db, admin, { accountId: A.nova, characterId: P.seren } as never)).rejects.toMatchObject({ status: 428 });
		await expect(linkCharacter(t.db, admin, { accountId: A.nova, characterId: P.seren, expectedRevision: 7 })).rejects.toMatchObject({
			status: 409,
			code: 'VERSION_CONFLICT'
		});
		expect((await accountRow(A.nova)).characterId).toBeNull();
	});

	it('un personnage déjà relié ne peut pas l’être à un second compte', async () => {
		await expect(linkCharacter(t.db, admin, { accountId: A.nova, characterId: P.aria, expectedRevision: 1 })).rejects.toMatchObject({
			status: 409,
			code: 'CHARACTER_TAKEN'
		});
	});

	it('personnage ou compte inconnu ⇒ 404 ; non-admin ⇒ 403', async () => {
		await expect(linkCharacter(t.db, admin, { accountId: A.nova, characterId: 'p_inconnu', expectedRevision: 1 })).rejects.toMatchObject({ status: 404 });
		await expect(linkCharacter(t.db, admin, { accountId: 'a_inconnu', characterId: P.seren, expectedRevision: 1 })).rejects.toMatchObject({ status: 404 });
		for (const who of [mj, designer, alice]) {
			await expect(linkCharacter(t.db, who, { accountId: A.nova, characterId: P.seren, expectedRevision: 1 })).rejects.toMatchObject({ status: 403 });
		}
	});

	it('délie un compte (révision contrôlée)', async () => {
		await expect(unlinkCharacter(t.db, admin, { accountId: A.bob } as never)).rejects.toMatchObject({ status: 428 });
		const view = await unlinkCharacter(t.db, admin, { accountId: A.bob, expectedRevision: 1 });
		expect(view.characterId).toBeNull();
		expect((await t.db.select().from(staffLog)).map((r) => r.action)).toContain('deliaison');
		await expect(unlinkCharacter(t.db, admin, { accountId: A.bob, expectedRevision: 2 })).rejects.toMatchObject({ status: 400 });
	});
});

// ---------------------------------------------------------------------------
describe('rôles et dernier administrateur (04 §10.7)', () => {
	it('change un rôle avec révision ; journal staff et audit', async () => {
		const view = await setRole(t.db, admin, { accountId: A.nova, role: 'mj', expectedRevision: 1 });
		expect(view).toMatchObject({ role: 'mj', revision: 2 });
		expect(await auditActions()).toContain('admin_set_role');
		await expect(setRole(t.db, admin, { accountId: A.nova, role: 'joueur', expectedRevision: 1 })).rejects.toMatchObject({ status: 409 });
		await expect(setRole(t.db, admin, { accountId: A.nova, role: 'joueur' } as never)).rejects.toMatchObject({ status: 428 });
		await expect(setRole(t.db, admin, { accountId: A.nova, role: 'roi', expectedRevision: 2 } as never)).rejects.toMatchObject({ status: 400 });
	});

	it('refuse de retirer le dernier administrateur (409 LAST_ADMIN)', async () => {
		await expect(setRole(t.db, admin, { accountId: A.admin, role: 'joueur', expectedRevision: 1 })).rejects.toMatchObject({
			status: 409,
			code: 'LAST_ADMIN'
		});
		expect((await accountRow(A.admin)).role).toBe('admin');
	});

	it('deux retraits concurrents d’administrateurs : il en reste exactement un', async () => {
		await setRole(t.db, admin, { accountId: A.mj, role: 'admin', expectedRevision: 1 });
		const second = await actorFor(t.db, A.mj);
		const results = await Promise.allSettled([
			setRole(t.db, admin, { accountId: A.mj, role: 'joueur', expectedRevision: 2 }),
			setRole(t.db, second, { accountId: A.admin, role: 'joueur', expectedRevision: 1 })
		]);
		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		const admins = await t.db.select().from(accounts).where(eq(accounts.role, 'admin'));
		expect(admins).toHaveLength(1);
	});

	it('un administrateur rétrogradé perd ses droits à la requête suivante (relecture sous verrou)', async () => {
		await setRole(t.db, admin, { accountId: A.mj, role: 'admin', expectedRevision: 1 });
		const second = await actorFor(t.db, A.mj);
		await setRole(t.db, admin, { accountId: A.mj, role: 'mj', expectedRevision: 2 });
		await expect(setRole(t.db, second, { accountId: A.nova, role: 'mj', expectedRevision: 1 })).rejects.toMatchObject({ status: 401 });
	});
});

// ---------------------------------------------------------------------------
describe('rayer un compte (03-vision §5.11)', () => {
	it('exige la saisie exacte du pseudo ; le personnage relié reste', async () => {
		await expect(strikeAccount(t.db, admin, { accountId: A.alice, typedPseudo: 'Alice' })).rejects.toMatchObject({ status: 400 });
		await strikeAccount(t.db, admin, { accountId: A.alice, typedPseudo: 'alice' });
		expect(await accountRow(A.alice)).toBeUndefined();
		expect(await t.db.select().from(characters).where(eq(characters.id, P.aria))).toHaveLength(1);
		expect(await auditActions()).toContain('admin_delete_account');
	});

	it('refuse de rayer son propre compte ; non-admin ⇒ 403', async () => {
		await expect(strikeAccount(t.db, admin, { accountId: A.admin, typedPseudo: 'admin' })).rejects.toMatchObject({ status: 403 });
		await expect(strikeAccount(t.db, mj, { accountId: A.alice, typedPseudo: 'alice' })).rejects.toMatchObject({ status: 403 });
	});
});

// ---------------------------------------------------------------------------
describe('thèmes (audit 07 §3.3 ; audit 06 §3.J, A16)', () => {
	it('normalise les identifiants hérités', () => {
		expect(normalizeThemeId('Theme-Violet')).toBe('violet');
		expect(normalizeThemeId('sylvan')).toBe('green');
		expect(normalizeThemeId('écarlate')).toBe('dark');
		expect(normalizeThemeId('')).toBe('dark');
	});

	it('collection d’un joueur : toujours accordés + dons, verrouillés visibles, huit tokens', async () => {
		const list = await listThemes(t.db, alice);
		const byId = Object.fromEntries(list.map((v) => [v.id, v]));
		expect(list[0].id).toBe('dark');
		expect(byId.dark).toMatchObject({ owned: true, active: true, tone: 'sombre' });
		expect(byId.light).toMatchObject({ owned: true, tone: 'clair' });
		expect(byId.violet.owned).toBe(true); // don du jeu de démonstration
		expect(byId.green.owned).toBe(false);
		expect(byId.bloodmoon.owned).toBe(false);
		expect(Object.keys(byId.dark.tokens)).toHaveLength(8);
		await expect(listThemes(t.db, null)).rejects.toMatchObject({ status: 401 });
	});

	it('équiper : possédé ⇒ oui ; non possédé ⇒ 403 ; inconnu ⇒ 404 ; alias acceptés', async () => {
		await expect(selectTheme(t.db, alice, { themeId: 'theme-violet' })).resolves.toEqual({ themeId: 'violet', ton: 'sombre' });
		expect((await accountRow(A.alice)).selectedTheme).toBe('violet');
		await expect(selectTheme(t.db, alice, { themeId: 'sylvan' })).rejects.toMatchObject({ status: 403 });
		await expect(selectTheme(t.db, alice, { themeId: 'inexistant' })).rejects.toMatchObject({ status: 404 });
		expect(await auditActions()).toContain('self_set_theme');
	});

	it('MJ et designer peuvent utiliser tout thème (main.js:1128)', async () => {
		await expect(selectTheme(t.db, mj, { themeId: 'bloodmoon' })).resolves.toMatchObject({ themeId: 'bloodmoon' });
		await expect(selectTheme(t.db, designer, { themeId: 'green' })).resolves.toMatchObject({ themeId: 'green' });
	});

	it('deux comptes changent de thème en même temps : chacun garde le sien (A16)', async () => {
		await grantTheme(t.db, admin, { accountId: A.bob, themeId: 'green' });
		await Promise.all([selectTheme(t.db, alice, { themeId: 'light' }), selectTheme(t.db, bob, { themeId: 'green' })]);
		expect((await accountRow(A.alice)).selectedTheme).toBe('light');
		expect((await accountRow(A.bob)).selectedTheme).toBe('green');
	});

	it('don : joueurs seulement ; retrait et blocage remettent le thème actif sur dark', async () => {
		await expect(grantTheme(t.db, admin, { accountId: A.mj, themeId: 'green' })).rejects.toMatchObject({
			status: 400,
			message: 'Ce don est réservé aux joueurs.'
		});
		await expect(grantTheme(t.db, admin, { accountId: A.alice, themeId: 'green' })).resolves.toEqual({ granted: true });
		await selectTheme(t.db, alice, { themeId: 'green' });
		await revokeTheme(t.db, admin, { accountId: A.alice, themeId: 'green' });
		expect((await accountRow(A.alice)).selectedTheme).toBe('dark');

		await selectTheme(t.db, alice, { themeId: 'violet' });
		await blockTheme(t.db, admin, { accountId: A.alice, themeId: 'violet' });
		expect((await accountRow(A.alice)).selectedTheme).toBe('dark');
		await expect(selectTheme(t.db, alice, { themeId: 'violet' })).rejects.toMatchObject({ status: 403 });
		expect((await listThemes(t.db, alice)).find((v) => v.id === 'violet')).toMatchObject({ blocked: true, owned: false });
		await unblockTheme(t.db, admin, { accountId: A.alice, themeId: 'violet' });
		await expect(selectTheme(t.db, alice, { themeId: 'violet' })).resolves.toBeTruthy();
		await expect(blockTheme(t.db, admin, { accountId: A.alice, themeId: 'dark' })).rejects.toMatchObject({ status: 400 });
		expect(await auditActions()).toEqual(
			expect.arrayContaining(['admin_grant_theme', 'admin_revoke_theme', 'admin_block_theme', 'admin_unblock_theme'])
		);
	});

	it('donner à tous : compte les nouveaux dons, idempotent', async () => {
		const first = await grantThemeToAll(t.db, admin, { themeId: 'aquaris' });
		expect(first.changed).toBe(3); // alice, bob, nova
		expect((await grantThemeToAll(t.db, admin, { themeId: 'aquaris' })).changed).toBe(0);
		await expect(grantThemeToAll(t.db, mj, { themeId: 'aquaris' })).rejects.toMatchObject({ status: 403 });
	});

	it('visibilité : un thème masqué disparaît de la collection de qui ne le possède pas ; dark reste visible', async () => {
		await setThemeVisibility(t.db, admin, { themeId: 'aquaris', visible: false });
		expect((await listThemes(t.db, alice)).some((v) => v.id === 'aquaris')).toBe(false);
		expect((await listThemes(t.db, admin)).some((v) => v.id === 'aquaris')).toBe(true);
		await expect(setThemeVisibility(t.db, admin, { themeId: 'dark', visible: false })).rejects.toMatchObject({ status: 400 });
	});

	it('visibilité et distribution concurrentes sur deux thèmes : les deux persistent (J1, J2)', async () => {
		await Promise.all([
			setThemeVisibility(t.db, admin, { themeId: 'violet', visible: true }),
			setThemeVisibility(t.db, admin, { themeId: 'green', visible: false }),
			setThemeAutoGrant(t.db, admin, { themeId: 'violet', enabled: true })
		]);
		const rows = Object.fromEntries((await t.db.select().from(themes)).map((r) => [r.id, r]));
		expect(rows.violet).toMatchObject({ visible: true, autoGrantAll: true });
		expect(rows.green.visible).toBe(false);
	});

	it('distribution automatique : possédé tant que le thème est disponible', async () => {
		await setThemeAutoGrant(t.db, admin, { themeId: 'aquaris', enabled: 'on' as never });
		expect((await listThemes(t.db, bob)).find((v) => v.id === 'aquaris')?.owned).toBe(true);
		await t.db.update(themes).set({ availableUntil: new Date(Date.now() - 1000) }).where(eq(themes.id, 'aquaris'));
		expect((await listThemes(t.db, bob)).find((v) => v.id === 'aquaris')?.owned).toBe(false);
	});

	it('création : contraste vérifié à 4,5:1, identifiant unique, tokens injectés au rendu', async () => {
		const tokens = {
			'--bureau': '#0b0b10',
			'--page': '#14141c',
			'--page-2': '#1c1c26',
			'--reglure': '#24242f',
			'--encre': '#f5f1e8',
			'--encre-2': '#cfc8b8',
			'--encre-grise': '#8a8578',
			'--ruban': '#c9a86a'
		};
		const view = await createTheme(t.db, admin, { id: 'veillee', name: 'Veillée', description: 'Un feu bas.', tokens });
		expect(view).toMatchObject({ id: 'veillee', isBuiltin: false, tone: 'sombre', tokens });
		await expect(createTheme(t.db, admin, { id: 'veillee', name: 'Bis', tokens })).rejects.toMatchObject({ status: 409 });
		await expect(
			createTheme(t.db, admin, { id: 'pale', name: 'Pâle', tokens: { ...tokens, '--encre': '#2a2a33', '--encre-2': '#202028' } })
		).rejects.toMatchObject({ status: 400, code: 'CONTRAST' });
		expect(await t.db.select().from(themes).where(eq(themes.id, 'pale'))).toHaveLength(0);
		await expect(createTheme(t.db, mj, { id: 'autre', name: 'Autre', tokens })).rejects.toMatchObject({ status: 403 });

		await selectTheme(t.db, admin, { themeId: 'veillee' });
		const active = await resolveActiveTheme(t.db, await accountRow(A.admin));
		expect(active).toMatchObject({ id: 'veillee', ton: 'sombre', custom: true, tokens });
	});

	it('thème actif bloqué ou retiré ⇒ rendu en dark', async () => {
		await t.db.update(accounts).set({ selectedTheme: 'green' }).where(eq(accounts.id, A.alice));
		expect((await resolveActiveTheme(t.db, await accountRow(A.alice))).id).toBe('dark');
		await t.db.update(accounts).set({ selectedTheme: 'violet' }).where(eq(accounts.id, A.alice));
		expect((await resolveActiveTheme(t.db, await accountRow(A.alice))).id).toBe('violet');
		await t.db.insert(accountThemeGrants).values({ accountId: A.alice, themeId: 'violet', kind: 'blocked' });
		expect((await resolveActiveTheme(t.db, await accountRow(A.alice))).id).toBe('dark');
	});
});
