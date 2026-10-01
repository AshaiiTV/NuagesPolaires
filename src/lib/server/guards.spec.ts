import { describe, expect, it } from 'vitest';
import { isHttpError, isRedirect, type RequestEvent } from '@sveltejs/kit';
import type { Account } from '$lib/server/db/schema';
import type { Actor } from '$lib/server/permissions';
import {
	homeFor,
	redirectIfConnected,
	requireAccount,
	requireCapability,
	requireCharacter,
	requireResetSession
} from './guards';

type Locals = Partial<App.Locals>;

function ev(locals: Locals, path = '/carnet/fiche'): Pick<RequestEvent, 'locals' | 'url'> {
	return { locals: { session: null, account: null, actor: null, ...locals } as App.Locals, url: new URL(`https://np.test${path}`) };
}

function thrown(fn: () => unknown): unknown {
	try {
		fn();
	} catch (e) {
		return e;
	}
	return null;
}

const joueur: Actor = { accountId: 'a_1', role: 'joueur', characterId: 'p_1', pseudo: 'alice' };
const enAttente: Actor = { accountId: 'a_2', role: 'joueur', characterId: null, pseudo: 'nova' };
const mj: Actor = { accountId: 'a_3', role: 'mj', characterId: null, pseudo: 'mj' };

describe('gardes (06-contrats §A)', () => {
	it('requireAccount : visiteur ⇒ /entrer?retour=…', () => {
		const e = thrown(() => requireAccount(ev({}, '/carnet/fiche?x=1')));
		expect(isRedirect(e) && e.location).toBe('/entrer?retour=%2Fcarnet%2Ffiche%3Fx%3D1');
		expect(requireAccount(ev({ actor: joueur }))).toBe(joueur);
	});

	it('requireAccount : session reset ⇒ fin de réinitialisation', () => {
		const e = thrown(() => requireAccount(ev({ session: { id: 's', scope: 'reset' } })));
		expect(isRedirect(e) && e.location).toBe('/entrer/nouveau-mot-de-passe');
	});

	it('requireCharacter : compte en attente ⇒ /carnet', () => {
		const e = thrown(() => requireCharacter(ev({ actor: enAttente })));
		expect(isRedirect(e) && e.location).toBe('/carnet');
		expect(requireCharacter(ev({ actor: joueur }))).toEqual({ actor: joueur, characterId: 'p_1' });
	});

	it('requireCapability : sans le droit ⇒ 404 (ce qui n’est pas autorisé n’est pas rendu)', () => {
		const e = thrown(() => requireCapability(ev({ actor: joueur }), 'combat.run'));
		expect(isHttpError(e, 404)).toBe(true);
		expect(requireCapability(ev({ actor: mj }), 'combat.run')).toBe(mj);
		expect(isRedirect(thrown(() => requireCapability(ev({}), 'combat.run')))).toBe(true);
	});

	it('redirectIfConnected : vers la première page du rôle', () => {
		expect((thrown(() => redirectIfConnected(ev({ actor: joueur }))) as { location: string }).location).toBe('/carnet');
		expect((thrown(() => redirectIfConnected(ev({ actor: mj }))) as { location: string }).location).toBe('/table');
		expect(thrown(() => redirectIfConnected(ev({})))).toBeNull();
		expect(homeFor('designer', false)).toBe('/atelier/bestiaire');
		expect(homeFor('admin', false)).toBe('/registre');
		expect(homeFor('admin', true)).toBe('/carnet');
	});

	it('requireResetSession : session reset exigée', () => {
		const account = { id: 'a_1', role: 'joueur', characterId: null } as Account;
		expect(requireResetSession(ev({ session: { id: 's1', scope: 'reset' }, account }))).toEqual({ accountId: 'a_1', sessionId: 's1' });
		expect(isRedirect(thrown(() => requireResetSession(ev({ session: { id: 's1', scope: 'full' }, account }))))).toBe(true);
		expect(isRedirect(thrown(() => requireResetSession(ev({}))))).toBe(true);
	});
});
