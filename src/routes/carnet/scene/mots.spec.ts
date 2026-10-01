// La ligne de déclaration (03-vision §5.3) : les mots, leurs coûts, et le calcul partagé
// navigateur / serveur. Aucun émoji dans les libellés ; le serveur recalcule toujours le chiffre.
import { describe, expect, it } from 'vitest';
import { coutEm, lireChiffre, motsPour, resoudre } from './mots';
import { libelleSansPicto, sansEmoji } from '$lib/ui/scene/regles';

const DUELLISTE = {
	oath: { name: 'Duelliste' },
	tiers: {
		reached: [
			{ level: 2, name: 'Élan Tranchant', cost: '6 EM — 1 action' },
			{ level: 5, name: 'Élan Tranchant', cost: '6 EM — 1 action' },
			{ level: 4, name: 'Garde passive', cost: 'passif' }
		]
	}
};

describe('motsPour', () => {
	const mots = motsPour(DUELLISTE);

	it('propose les actions en EP de rules.ts avec leur coût, sans émoji', () => {
		const libelles = mots.ep.map((m) => m.libelle);
		expect(libelles).toContain('Esquive · 8 EP');
		for (const l of libelles) expect(l).not.toMatch(/\p{Extended_Pictographic}/u);
		expect(mots.ep.at(-1)?.id).toBe('autre');
	});

	it('propose les capacités atteintes en EM, sans doublon, sans les paliers sans coût', () => {
		const paliers = mots.em.filter((m) => m.id.startsWith('palier:'));
		expect(paliers).toHaveLength(1);
		expect(paliers[0].libelle).toBe('Élan Tranchant · 6 EM');
	});

	it('PV : « subis … PV », « soigné de … PV », « autre… »', () => {
		expect(mots.pv.map((m) => m.libelle)).toEqual(['subis … PV', 'soigné de … PV', 'autre…']);
	});
});

describe('resoudre', () => {
	const mots = motsPour(DUELLISTE);

	it('un mot à coût fixe donne −coût', () => {
		expect(resoudre(mots.ep, 'regle:esquive', '', '')).toEqual({ ok: true, delta: -8, word: 'Esquive' });
	});

	it('« subis » dépense, « soigné de » regagne', () => {
		expect(resoudre(mots.pv, 'subis', '12', '')).toEqual({ ok: true, delta: -12, word: 'Dégâts subis' });
		expect(resoudre(mots.pv, 'soigne', '5', '')).toEqual({ ok: true, delta: 5, word: 'Soin reçu' });
	});

	it('« autre… » exige un chiffre et un mot ; « +5 » regagne', () => {
		expect(resoudre(mots.ep, 'autre', '', 'Course')).toEqual({ ok: false, erreur: 'Le chiffre est obligatoire.' });
		expect(resoudre(mots.ep, 'autre', '5', '  ')).toEqual({ ok: false, erreur: 'Le mot est obligatoire.' });
		expect(resoudre(mots.ep, 'autre', '+5', 'Souffle repris')).toEqual({ ok: true, delta: 5, word: 'Souffle repris' });
		expect(resoudre(mots.ep, 'autre', '−5', 'Course')).toEqual({ ok: true, delta: -5, word: 'Course' });
	});

	it('refuse un mot inconnu (le navigateur ne fixe jamais un coût)', () => {
		expect(resoudre(mots.ep, 'regle:inventee', '', '')).toEqual({ ok: false, erreur: 'Choisis un mot.' });
	});
});

describe('lectures', () => {
	it('lireChiffre', () => {
		expect(lireChiffre('8')).toEqual({ n: 8, signe: null });
		expect(lireChiffre('−8')).toEqual({ n: 8, signe: -1 });
		expect(lireChiffre('0')).toBeNull();
		expect(lireChiffre('abc')).toBeNull();
		expect(lireChiffre('1000')).toBeNull();
	});

	it('coutEm', () => {
		expect(coutEm('6 EM — 1 action')).toBe(6);
		expect(coutEm('passif')).toBeNull();
	});

	it('libellés et récit sans pictogramme', () => {
		expect(libelleSansPicto('⚔ Frappe (N)')).toBe('Frappe');
		expect(libelleSansPicto('🛡 Bloquer −50%')).toBe('Bloquer −50 %');
		expect(sansEmoji('🩸 Aria → Loup : 9 dégâts')).toBe('Aria → Loup : 9 dégâts');
	});
});
