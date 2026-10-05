// Les mots de la ligne de déclaration (03-vision §5.3) : « Aria déclare … » suivi d'un mot tiré de
// la table du système de jeu, coût imprimé après le mot. Une seule source : `src/lib/game/rules.ts`
// pour l'EP, les paliers atteints de la branche pour l'EM, « subis … PV », « soigné de … PV », et
// « autre… » avec chiffre et mot obligatoires. Module pur : le serveur recalcule le chiffre depuis
// le même choix (le navigateur ne fixe jamais un coût).
import { ACTION_RULES } from '$lib/game/rules';
import { libelleSansPicto } from '$lib/ui/scene/regles';

export type Res = 'pv' | 'ep' | 'em';
export const RESSOURCES: readonly Res[] = ['pv', 'ep', 'em'];

export interface Mot {
	/** `regle:esquive`, `palier:7`, `subis`, `soigne`, `autre`. */
	id: string;
	/** Ce que le menu affiche : « Esquive · 8 EP », « subis … PV ». */
	libelle: string;
	/** Mot écrit entre parenthèses dans la déclaration. */
	mot: string;
	/** Coût fixe (positif) : le chiffre déclaré est −coût. `null` : chiffre saisi. */
	cout: number | null;
	saisie: 'aucune' | 'chiffre' | 'chiffre-mot';
	/** Sens du chiffre saisi sans signe : −1 dépense / subit, +1 regagne. */
	signe: -1 | 1;
}

/** Ce que la fiche apporte au choix des mots (sous-ensemble de SheetView). */
export interface FichePourMots {
	oath: { name: string };
	tiers: { reached: { level: number; name: string; cost: string }[] };
}

const sansAccent = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

const AUTRE: Mot = {
	id: 'autre',
	libelle: 'autre…',
	mot: '',
	cout: null,
	saisie: 'chiffre-mot',
	signe: -1
};

function motsEp(serment: string): Mot[] {
	const s = sansAccent(serment);
	return ACTION_RULES.filter((r) => {
		if (r.resource !== 'ep' || r.cost === null || r.cost <= 0) return false;
		if (r.conditions === 'Tous' || r.conditions === 'Joueur') return true;
		if (r.id === 'frappe_haute') return s.includes('claymore');
		return s !== '' && sansAccent(r.conditions).includes(s);
	}).map((r) => {
		const mot = libelleSansPicto(r.label);
		return {
			id: `regle:${r.id}`,
			libelle: `${mot} · ${r.cost}\u00a0EP`,
			mot,
			cout: r.cost,
			saisie: 'aucune',
			signe: -1
		};
	});
}

/** Chiffre d'EM d'un coût de palier : « 6 EM — 1 action » → 6 ; sans EM chiffré : `null`. */
export function coutEm(cost: string): number | null {
	const m = /(\d{1,3})\s*EM\b/i.exec(cost);
	return m ? Number(m[1]) : null;
}

function motsEm(fiche: FichePourMots): Mot[] {
	const vus = new Set<string>();
	const mots: Mot[] = [];
	// Du palier le plus haut au plus bas : c'est le coût actuel qui compte.
	for (const t of [...fiche.tiers.reached].sort((a, b) => b.level - a.level)) {
		const cout = coutEm(t.cost);
		if (cout === null || cout <= 0) continue;
		const cle = `${t.name}|${cout}`;
		if (vus.has(cle)) continue;
		vus.add(cle);
		mots.push({
			id: `palier:${t.level}`,
			libelle: `${t.name} · ${cout}\u00a0EM`,
			mot: t.name,
			cout,
			saisie: 'aucune',
			signe: -1
		});
	}
	const s = sansAccent(fiche.oath.name);
	for (const r of ACTION_RULES) {
		if (r.resource !== 'em' || r.cost === null || r.cost <= 0 || s === '') continue;
		if (!sansAccent(r.conditions).includes(s)) continue;
		const mot = libelleSansPicto(r.label);
		mots.push({
			id: `regle:${r.id}`,
			libelle: `${mot} · ${r.cost}\u00a0EM`,
			mot,
			cout: r.cost,
			saisie: 'aucune',
			signe: -1
		});
	}
	return mots;
}

/** Les mots proposés pour chaque ressource, dans l'ordre du menu. */
export function motsPour(fiche: FichePourMots): Record<Res, Mot[]> {
	return {
		pv: [
			{
				id: 'subis',
				libelle: 'subis … PV',
				mot: 'Dégâts subis',
				cout: null,
				saisie: 'chiffre',
				signe: -1
			},
			{
				id: 'soigne',
				libelle: 'soigné de … PV',
				mot: 'Soin reçu',
				cout: null,
				saisie: 'chiffre',
				signe: 1
			},
			AUTRE
		],
		ep: [...motsEp(fiche.oath.name), AUTRE],
		em: [...motsEm(fiche), AUTRE]
	};
}

/** Lit un chiffre saisi : « 8 », « -8 », « −8 », « +8 ». */
export function lireChiffre(brut: string): { n: number; signe: -1 | 1 | null } | null {
	const t = brut.replace(/−/g, '-').replace(/\s/g, '');
	const m = /^([+-])?(\d{1,3})$/.exec(t);
	if (!m) return null;
	const n = Number(m[2]);
	if (n <= 0) return null;
	return { n, signe: m[1] === '-' ? -1 : m[1] === '+' ? 1 : null };
}

export type Resolution = { ok: true; delta: number; word: string } | { ok: false; erreur: string };

/** Du choix au chiffre et au mot de la déclaration (même calcul au navigateur et au serveur). */
export function resoudre(
	mots: Mot[],
	choix: string,
	chiffre: string,
	motLibre: string
): Resolution {
	const m = mots.find((x) => x.id === choix);
	if (!m) return { ok: false, erreur: 'Choisis un mot.' };
	if (m.saisie === 'aucune' && m.cout !== null) return { ok: true, delta: -m.cout, word: m.mot };
	const lu = lireChiffre(chiffre);
	if (!lu) return { ok: false, erreur: 'Le chiffre est obligatoire.' };
	if (m.saisie === 'chiffre') return { ok: true, delta: m.signe * lu.n, word: m.mot };
	const word = motLibre.trim();
	if (!word) return { ok: false, erreur: 'Le mot est obligatoire.' };
	if (word.length > 80) return { ok: false, erreur: 'Le mot tient en 80 caractères.' };
	return { ok: true, delta: (lu.signe ?? m.signe) * lu.n, word };
}
