// Matrice des droits contre 04-architecture §5 et 03-vision §12 (réponses du lead).
import { describe, expect, it } from 'vitest';
import {
	ROLES,
	assertCan,
	can,
	isRole,
	requireActor,
	requireOwnCharacter,
	stampRoleLabel,
	type Actor,
	type Capability,
	type Role
} from './permissions';

// Matrice attendue, ligne par ligne de 04 §5 (avec 03-vision §12.2, §12.5 et 06-contrats §B).
const EXPECTED: Record<Capability, readonly Role[]> = {
	// « Lire tous les personnages ; modifier ressources, XP, niveau, inventaire… ; créer un personnage » : mj, admin
	'characters.read_all': ['mj', 'admin'],
	'characters.stamp': ['mj', 'admin'],
	'characters.create': ['mj', 'admin'],
	// « Modifier identité, Serment, branche, arme, journal d'un personnage ; supprimer » : admin
	'characters.identity': ['admin'],
	// Journal lisible par son propriétaire, les MJ et les administrateurs (03-vision §12.2)
	'journal.read_all': ['mj', 'admin'],
	// Faits validés : MJ/admin (06 §B.3)
	'facts.validate': ['mj', 'admin'],
	// « Simulation, apparitions, archives, clôture, récompenses » : mj, admin
	'combat.run': ['mj', 'admin'],
	'spawn.run': ['mj', 'admin'],
	// « Événements : créer, modifier, masquer, supprimer, notifier » : mj, designer (sans notifier), admin
	'events.manage': ['mj', 'designer', 'admin'],
	'events.notify': ['mj', 'admin'],
	// « Bestiaire : créer, modifier, publier, masquer, archiver » : designer, admin (le MJ n'édite pas)
	'beasts.manage': ['designer', 'admin'],
	// Calque réservé du bestiaire : MJ, designer, admin (06 §B.7 `reserved`)
	'beasts.read_reserved': ['mj', 'designer', 'admin'],
	// « valider une observation » : designer, admin selon 04 §5 — le MJ aussi (vision §9.3, voir écart)
	'observations.validate': ['mj', 'designer', 'admin'],
	// « Atelier serments » : admin (le designer n'édite pas les Serments, 03-vision §12.5)
	'oaths.manage': ['admin'],
	// « Scènes : ouvrir, clore, résumé » pour plusieurs personnages : mj, admin
	'scenes.manage': ['mj', 'admin'],
	// « Journal staff (lecture, écriture) » : mj, admin
	'staff_log.read': ['mj', 'admin'],
	// « Comptes, rôles, liaisons, mots de passe, thèmes, journaux d'audit, diagnostics, migration » : admin
	'admin.accounts': ['admin'],
	'admin.themes': ['admin'],
	'admin.audit': ['admin'],
	'admin.data': ['admin']
};

const CAPABILITIES = Object.keys(EXPECTED) as Capability[];

const actor = (role: Role, characterId: string | null = null): Actor => ({
	accountId: `a_${role}`,
	role,
	characterId,
	pseudo: role
});

describe('matrice rôle × capacité (04 §5)', () => {
	it('les quatre rôles, exactement', () => {
		expect(ROLES).toEqual(['joueur', 'mj', 'designer', 'admin']);
		expect(isRole('admin')).toBe(true);
		expect(isRole('staff')).toBe(false);
		expect(isRole(null)).toBe(false);
	});

	for (const capability of CAPABILITIES) {
		for (const role of ROLES) {
			const allowed = EXPECTED[capability].includes(role);
			it(`${role} ${allowed ? 'a' : 'n’a pas'} « ${capability} »`, () => {
				expect(can(role, capability)).toBe(allowed);
				if (allowed) expect(assertCan(actor(role), capability).role).toBe(role);
				else
					expect(() => assertCan(actor(role), capability)).toThrow(
						expect.objectContaining({ status: 403, code: 'FORBIDDEN' })
					);
			});
		}
	}

	it('un visiteur n’a aucune capacité (401 à l’assertion)', () => {
		for (const capability of CAPABILITIES) {
			expect(can(null, capability)).toBe(false);
			expect(can(undefined, capability)).toBe(false);
			expect(() => assertCan(null, capability)).toThrow(
				expect.objectContaining({ status: 401, code: 'UNAUTHENTICATED' })
			);
		}
	});

	it('le joueur n’a aucune capacité staff : ses actions passent par requireOwnCharacter', () => {
		expect(CAPABILITIES.filter((c) => can('joueur', c))).toEqual([]);
	});

	it('décisions tranchées (04 §5) : le MJ n’édite pas le bestiaire, le designer n’édite pas les Serments ni les personnages', () => {
		expect(can('mj', 'beasts.manage')).toBe(false);
		expect(can('designer', 'oaths.manage')).toBe(false);
		expect(can('designer', 'characters.read_all')).toBe(false);
		expect(can('designer', 'combat.run')).toBe(false);
		expect(can('designer', 'events.notify')).toBe(false);
		expect(can('mj', 'admin.accounts')).toBe(false);
	});
});

describe('gardes d’acteur', () => {
	it('requireActor : 401 avec le micro-texte 20 sans session', () => {
		expect(() => requireActor(null)).toThrow(
			expect.objectContaining({
				status: 401,
				message: expect.stringMatching(/Le carnet s.est refermé/)
			})
		);
		expect(requireActor(actor('joueur'))).toMatchObject({ role: 'joueur' });
	});

	it('requireOwnCharacter : personnage relié exigé (403 NOT_LINKED sinon)', () => {
		expect(requireOwnCharacter(actor('joueur', 'p_1'))).toMatchObject({ characterId: 'p_1' });
		expect(() => requireOwnCharacter(actor('joueur'))).toThrow(
			expect.objectContaining({ status: 403, code: 'NOT_LINKED' })
		);
		expect(() => requireOwnCharacter(null)).toThrow(expect.objectContaining({ status: 401 }));
		// Un MJ relié à son propre personnage agit sur SA fiche comme un joueur.
		expect(requireOwnCharacter(actor('mj', 'p_2')).characterId).toBe('p_2');
	});

	it('libellé du tampon selon le rôle', () => {
		expect(stampRoleLabel('admin')).toBe('Admin');
		expect(stampRoleLabel('mj')).toBe('MJ');
		expect(stampRoleLabel('designer')).toBe('Designer');
		expect(stampRoleLabel('joueur')).toBe('');
	});
});
