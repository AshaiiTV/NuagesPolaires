// Registre › Comptes et liaisons (03-vision §5.11) : une ligne par compte ; recherche et filtre par
// rôle en paramètres d'URL ; lier / délier, rôle (dernier administrateur protégé par le serveur),
// réinitialisation (code affiché une seule fois), rature du compte (saisie du pseudo).
import { requireCapability } from '$lib/server/guards';
import { action } from '$lib/server/actions';
import {
	adminResetPassword,
	linkCharacter,
	listAccounts,
	listPending,
	setRole,
	strikeAccount,
	unlinkCharacter
} from '$lib/server/domain/accounts';
import { ROLE_VALUES, type RoleView } from '$lib/schemas/accounts';
import type { Actions, PageServerLoad } from './$types';

const texte = (v: unknown): string => (typeof v === 'string' ? v : '');
const revision = (v: unknown): number => (typeof v === 'number' ? v : (v as number));

export const load: PageServerLoad = async (event) => {
	const actor = requireCapability(event, 'admin.accounts');
	const db = event.locals.db;
	const accounts = await listAccounts(db, actor);
	const pending = await listPending(db, actor);

	const q = (event.url.searchParams.get('q') ?? '').trim().slice(0, 64);
	const roleParam = event.url.searchParams.get('role') ?? '';
	const role = (ROLE_VALUES as readonly string[]).includes(roleParam) ? (roleParam as RoleView) : null;
	const aiguille = q.toLocaleLowerCase('fr');
	const rows = accounts.filter(
		(a) =>
			(!role || a.role === role) &&
			(!aiguille ||
				a.pseudo.toLocaleLowerCase('fr').includes(aiguille) ||
				(a.characterName ?? '').toLocaleLowerCase('fr').includes(aiguille))
	);

	return {
		rows,
		total: accounts.length > 0,
		unlinkedCharacters: pending.unlinkedCharacters,
		q,
		role,
		moi: actor.accountId,
		releve: new Date().toISOString()
	};
};

export const actions: Actions = {
	lier: action(async (event, data) => {
		const compte = await linkCharacter(event.locals.db, event.locals.actor, {
			accountId: texte(data.accountId),
			characterId: texte(data.characterId),
			expectedRevision: revision(data.expectedRevision)
		});
		return { lie: { id: compte.id, personnage: compte.characterName ?? '', at: new Date().toISOString() } };
	}),
	delier: action(async (event, data) => {
		await unlinkCharacter(event.locals.db, event.locals.actor, {
			accountId: texte(data.accountId),
			expectedRevision: revision(data.expectedRevision)
		});
		return { delie: texte(data.accountId) };
	}),
	role: action(async (event, data) => {
		await setRole(event.locals.db, event.locals.actor, {
			accountId: texte(data.accountId),
			role: texte(data.role) as RoleView,
			expectedRevision: revision(data.expectedRevision)
		});
		return { role: texte(data.accountId) };
	}),
	reinitialiser: action(async (event, data) => {
		const accountId = texte(data.accountId);
		const reset = await adminResetPassword(event.locals.db, event.locals.actor, { accountId });
		// Le code part une seule fois vers la page qui l'a demandé ; il n'est ni journalisé ni stocké.
		// (Clé « temporaire » et non « code » : `code` est déjà le code d'erreur des refus.)
		return { temporaire: { accountId, secret: reset.temporaryPassword, expiresAt: reset.expiresAt } };
	}),
	rayer: action(async (event, data) => {
		await strikeAccount(event.locals.db, event.locals.actor, {
			accountId: texte(data.accountId),
			typedPseudo: texte(data.typedPseudo)
		});
		return { raye: texte(data.typedPseudo) };
	})
};
