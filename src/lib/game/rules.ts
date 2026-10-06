/** Table normative : legacy/assets/js/main.js:11950-12038, 13628-13644.
 * Les capacités structurées portent leur coût de palier ; aucun coût physique n'est dupliqué
 * dans le moteur. Les ancres visent les sections de la référence publique.
 */
import { STATUS_EFFECTS, type StatusEffect } from './combat/statuses';
import type { StatusId } from './combat/types';

export interface ActionRule {
	id: string;
	/**
	 * Nom affiché par l'interface (décision INT-1) : sans émoji ni suffixe « (N) » — « Frappe »,
	 * « Esquive », « Se déplacer »… C'est aussi le mot d'une déclaration (« Kael déclare −8 EP
	 * (Esquive). », 03-vision §8 micro-texte 10).
	 */
	name: string;
	/** Libellé hérité du simulateur (legacy main.js:11950-12038), conservé pour la migration des archives. */
	label: string;
	resource: 'ep' | 'em' | null;
	cost: number | null;
	conditions: string;
	pour?: 'joueur' | 'creature';
	serment?: string;
	effect: string;
	anchor: string;
}
const anchor = '/univers/systeme#actions';
export const ACTION_RULES: readonly ActionRule[] = [
	{
		id: 'frappe',
		name: 'Frappe',
		label: '⚔ Frappe (N)',
		resource: 'ep',
		cost: 6,
		conditions: 'Tous',
		effect: 'Dégâts du Serment + niveau',
		anchor
	},
	{
		id: 'frappe_haute',
		name: 'Frappe Haute',
		label: '🗡 Frappe Haute (N)',
		resource: 'ep',
		cost: 10,
		conditions: 'Posture Haute active',
		serment: 'Claymore',
		effect: 'Dégâts et malus de la posture ; posture consommée',
		anchor
	},
	{
		id: 'pugilat',
		name: 'Pugilat',
		label: '👊 Pugilat (N)',
		resource: 'ep',
		cost: 6,
		conditions: 'Joueur',
		pour: 'joueur',
		effect: '4 + niveau dégâts',
		anchor
	},
	{
		id: 'esquive',
		name: 'Esquive',
		label: '🛡 Esquive',
		resource: 'ep',
		cost: 8,
		conditions: 'Tous',
		effect: 'Annule une attaque sauf impact traversant ou indéfendable',
		anchor
	},
	{
		id: 'bloquer',
		name: 'Bloquer',
		label: '🛡 Bloquer −50%',
		resource: 'ep',
		cost: 5,
		conditions: 'Joueur',
		pour: 'joueur',
		effect: 'Dégâts × 0,5, arrondi supérieur',
		anchor
	},
	{
		id: 'bloquer_corps',
		name: 'Bloquer (corps)',
		label: '🛡 Bloquer (corps) −25%',
		resource: 'ep',
		cost: 2,
		conditions: 'Créature (Bloquer ou Parer)',
		pour: 'creature',
		effect: 'Dégâts × 0,75, arrondi supérieur',
		anchor
	},
	{
		id: 'parer',
		name: 'Parer',
		label: '🤜 Parer −25%',
		resource: 'ep',
		cost: 0,
		conditions: 'Joueur',
		pour: 'joueur',
		effect: 'Dégâts × 0,75, arrondi supérieur',
		anchor
	},
	{
		id: 'subit',
		name: 'Subit',
		label: '🩸 Subit',
		resource: null,
		cost: 0,
		conditions: 'Tous',
		effect: 'Narratif, ne consomme aucune défense',
		anchor
	},
	{
		id: 'deplacer',
		name: 'Se déplacer',
		label: '🏃 Déplacement',
		resource: 'ep',
		cost: 10,
		conditions: 'Déplacement non verrouillé ce round',
		effect: 'Narratif, aucune modification de portée',
		anchor
	},
	{
		id: 'passer',
		name: 'Passer',
		label: '⏭ Passer',
		resource: null,
		cost: 0,
		conditions: 'Tous',
		effect: 'Remplit toutes les actions restantes par —',
		anchor
	},
	{
		id: 'capacite',
		name: 'Capacité',
		label: '✨ <palNom>',
		resource: 'em',
		cost: null,
		conditions: 'Palier accessible ou compétence de créature',
		effect: 'Effets et coût structurés du palier',
		anchor
	},
	{
		id: 'soin',
		name: 'Soin',
		label: '💚 Soin (N PV)',
		resource: 'em',
		cost: null,
		conditions: 'Capacité de soin',
		effect: 'Soin plafonné aux PV max',
		anchor
	},
	{
		id: 'frappe_dechainees',
		name: 'Frappe Déchaînée',
		label: '⚔💚 Frappe Déchaînée (N)',
		resource: 'em',
		cost: 5,
		conditions: 'Conjurateur branche A',
		serment: 'Conjurateur',
		effect: 'Attaque et soin automatique',
		anchor
	},
	{
		id: 'posture_haute',
		name: 'Posture Haute',
		label: '🗡 Posture Haute',
		resource: 'em',
		cost: 6,
		conditions: 'Claymore',
		serment: 'Claymore',
		effect: 'Prépare la prochaine Frappe Haute',
		anchor
	},
	{
		id: 'poing_ardent',
		name: 'Poing Ardent',
		label: '🔥 Poing Ardent',
		resource: 'em',
		cost: 6,
		conditions: 'Elementaliste Feu / Glace',
		serment: 'Elementaliste',
		effect: 'Feu, Brûlure, combo élémentaire',
		anchor
	},
	{
		id: 'poing_polaire',
		name: 'Poing Polaire',
		label: '❄ Poing Polaire',
		resource: 'em',
		cost: 4,
		conditions: 'Elementaliste Feu / Glace',
		serment: 'Elementaliste',
		effect: 'Glace, Gel, combo élémentaire',
		anchor
	},
	{
		id: 'poing_foudre',
		name: 'Poing Foudre',
		label: '⚡ Poing Foudre',
		resource: 'em',
		cost: 6,
		conditions: 'Elementaliste Foudre / Eau',
		serment: 'Elementaliste',
		effect: 'Foudre, combo élémentaire',
		anchor
	},
	{
		id: 'poing_aquatique',
		name: 'Poing Aquatique',
		label: '💧 Poing Aquatique',
		resource: 'em',
		cost: 4,
		conditions: 'Elementaliste Foudre / Eau',
		serment: 'Elementaliste',
		effect: 'Eau, combo élémentaire',
		anchor
	}
];
export function actionRule(id: string): ActionRule {
	const rule = ACTION_RULES.find((r) => r.id === id);
	if (!rule) throw new Error(`Règle inconnue : ${id}`);
	return rule;
}
export const ACTION_COSTS = Object.freeze({
	frappe: actionRule('frappe').cost!,
	pugilat: actionRule('pugilat').cost!,
	esquive: actionRule('esquive').cost!,
	bloquerPlayer: actionRule('bloquer').cost!,
	bloquerBeast: actionRule('bloquer_corps').cost!,
	parer: actionRule('parer').cost!,
	deplacer: actionRule('deplacer').cost!,
	frappeHauteDefault: actionRule('frappe_haute').cost!
});

export const RULE_DIVERGENCES = [
	{
		action: 'Initiative',
		simulateur: 'Choix MJ ; réordonnable ; retrait réinitialise l’ordre',
		pagePublique: 'Premier agresseur, initiative conservée',
		source: 'legacy/assets/js/main.js:8668-8670,11901-11903,12441-12470'
	},
	{
		action: 'Séquence',
		simulateur: 'Déclarations de tous puis attaques et passe utilitaire',
		pagePublique: 'Tour séquentiel J1 puis J2',
		source: 'legacy/assets/js/main.js:8672-8675,12265-12354'
	},
	{
		action: 'Parer',
		simulateur: '0 EP, −25 % pour les joueurs',
		pagePublique: 'Parade narrative −25 % ; table sans action Parer chiffrée',
		source: 'legacy/assets/js/main.js:8675,11970-11979'
	},
	{
		action: 'Bloquer',
		simulateur: 'Tout joueur : 5 EP −50 % ; créature : 2 EP −25 %',
		pagePublique: 'Sans bouclier : 2 EP −25 % ; avec bouclier : 5 EP −50 %',
		source: 'legacy/assets/js/main.js:8709-8710,11970-11979'
	},
	{
		action: 'Pugilat',
		simulateur: '4 + niveau, 6 EP',
		pagePublique: '3 + niveau, 6 EP',
		source: 'legacy/assets/js/main.js:8718,11955'
	},
	{
		action: 'Tir',
		simulateur: 'Aucune action Tir ; Frappe à 6 EP',
		pagePublique: 'Tir à l’arc : 4 EP',
		source: 'legacy/assets/js/main.js:8705,11964-11968'
	},
	{
		action: 'Invoquer son Serment',
		simulateur: 'Action absente',
		pagePublique: '1 EM',
		source: 'legacy/assets/js/main.js:8706,11957-12038'
	},
	{
		action: 'Objets',
		simulateur: 'Actions absentes ; ajustement MJ',
		pagePublique: 'Utiliser et recevoir : 0 EP',
		source: 'legacy/assets/js/main.js:8714-8715,11957-12038'
	},
	{
		action: 'Déplacement',
		simulateur: '10 EP, narratif',
		pagePublique: '10 EP, hors de portée CAC',
		source: 'legacy/assets/js/main.js:8712,12333'
	},
	{
		action: 'Épuisement',
		simulateur: 'EP clampée à 0, actions exécutées',
		pagePublique: 'EP 0 : effondrement ; EP insuffisante : action impossible',
		source: 'legacy/assets/js/main.js:8741-8742,12276-12279'
	},
	{
		action: 'Surcadençage',
		simulateur: 'Non implémenté',
		pagePublique: 'Multiplicateurs ×2, ×2,5, ×3…',
		source: 'legacy/assets/js/main.js:8724-8735,11441'
	},
	{
		action: 'Posture Haute',
		simulateur: 'Persiste jusqu’à une Frappe Haute',
		pagePublique: 'Texte du Serment : jusqu’au prochain tour',
		source: 'legacy/assets/js/main.js:262-265,12260-12263'
	},
	{
		action: 'Compteur élémentaire',
		simulateur: 'Réinitialisé chaque round ; Foudre 6 EM / Eau 4 EM',
		pagePublique: 'Lore compteur ±2 ; Foudre 4 EM / Eau 6 EM',
		source: 'legacy/assets/js/main.js:403,11623-11628,12342'
	},
	{
		action: 'Invocations',
		simulateur: '2 actions, sans coût EM du porteur, ajout en fin d’ordre',
		pagePublique: 'Lore coût EM par action, disparition si EM insuffisante, après le porteur',
		source: 'legacy/assets/js/main.js:424,12324-12330'
	},
	{
		action: 'Repos court',
		simulateur: 'Bouton ☕ retire 50 % EP max',
		pagePublique: 'Repos et repas restaurent EP/EM',
		source: 'legacy/assets/js/main.js:8661-8663,13732'
	}
] as const;

export type RuleContext =
	| { phase: 'declaration' | 'resolution' | 'idle'; status?: StatusId; lowEp?: boolean }
	| { kind: 'declaration' | 'recovery' | 'out-of-combat' }
	| { kind: 'status'; status: StatusId };
export type RuleCard =
	| { id: 'actions'; title: string; anchor: string; actions: readonly ActionRule[] }
	| { id: 'status'; title: string; anchor: string; definition: StatusEffect }
	| { id: 'recovery' | 'glossary'; title: string; anchor: string; text: string };
const RECOVERY: RuleCard = {
	id: 'recovery',
	title: 'Récupération',
	anchor: '/univers/systeme#recuperation',
	text: 'Repos volontaire et repas : EP et EM restaurées au maximum. Aucune régénération automatique en combat.'
};
const GLOSSARY: RuleCard = {
	id: 'glossary',
	title: 'Statistiques',
	anchor: '/univers/systeme#statistiques',
	text: 'PV : résistance vitale. EP : énergie physique. EM : énergie magique. À 0 PV : KO, mort narrative.'
};
/** Correspondance seulement : l’appelant fournit lowEp si EP < 20 %, sans calcul ici.
 * Priorité : statut sélectionné, déclaration, récupération, glossaire. */
export function ruleCardFor(context: RuleContext): RuleCard {
	if ('status' in context && context.status)
		return {
			id: 'status',
			title: STATUS_EFFECTS[context.status].label,
			anchor: '/univers/systeme#statuts',
			definition: STATUS_EFFECTS[context.status]
		};
	if (
		('kind' in context && context.kind === 'declaration') ||
		('phase' in context && context.phase === 'declaration')
	)
		return { id: 'actions', title: 'Actions et coûts', anchor, actions: ACTION_RULES };
	if (('kind' in context && context.kind === 'recovery') || ('lowEp' in context && context.lowEp))
		return RECOVERY;
	return GLOSSARY;
}
