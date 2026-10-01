/**
 * Couleurs de sens — UNE seule table, en hexadécimal (décision INT-1).
 *
 * Toutes les vues du serveur renvoient ces valeurs (`statuses[].color`, `gems[].color`, `typeColor`,
 * `behaviorColor`) ; plus aucun nom de variable CSS héritée (`--red`, `--gold`…) ne sort du serveur.
 * Module pur, partagé client/serveur, sans I/O.
 *
 * Sources :
 *   - statuts (12) : `STATUT_EFFECTS`, legacy assets/js/main.js:12474-12487 ; audit 02 §10 ;
 *   - types de rendez-vous (5) : `EV_TYPES`, legacy main.js:15013-15019 (audit 08 §1.2), qui donnent des
 *     variables CSS, résolues ici avec les valeurs du thème par défaut tel qu'il s'affiche : `--red`,
 *     `--gold`, `--purple` de legacy/index.html:27 (`:root`), `--glacier` et `--faint` de l'identité
 *     polaire legacy/assets/css/polar-identity.css:16-17 (qui surcharge index.html:23,26) ;
 *   - comportements de créature : `BHC`, legacy main.js:7413-7426 (audit 04 §1.3,
 *     audit/contenu/comportements-creatures.md §1), clés françaises — couleur de l'étiquette du
 *     bestiaire. La page Système de jeu (main.js:8822-8826, audit 07 §2) affiche Agressif `#c97a4a`
 *     et Gibier `#6db88a` : divergence signalée, l'étiquette du bestiaire fait foi ;
 *   - gemmes (3) : audit 02 §6 (libellés), audit 07 §2 (`.gb #e8e8f8`, `.gi var(--purple) #9a74c4`,
 *     `.ge var(--red) #c94a4a`).
 */

export const MEANING_COLORS = {
	/** Les douze statuts IRP. */
	status: {
		saignement: '#c94a4a',
		empoisonne: '#77b36b',
		brulure: '#d88a3d',
		gel: '#7eb8d4',
		etourdi: '#d7b56d',
		entrave: '#8aa0b6',
		aveugle: '#c7c4b8',
		silence: '#8f8aa8',
		peur: '#9e7bc2',
		fragilise: '#d77c7c',
		renforce: '#77b38f',
		inspire: '#d8c27a'
	},
	/** Les cinq types de rendez-vous. */
	eventType: {
		combat: '#c94a4a',
		exploration: '#c9a84c',
		social: '#95cdbb',
		evenement: '#9a74c4',
		autre: '#92aaa3'
	},
	/** Les comportements de créature (cinq usuels, plus Boss). */
	behavior: {
		Gibier: '#7bcf9b',
		Passif: '#7eb8d4',
		Neutre: '#c9a84c',
		Agressif: '#c45858',
		'Très agressif': '#c94a4a',
		Boss: '#b98cff'
	},
	/** Les trois Gemmes de Sang. */
	gem: {
		blanche: '#e8e8f8',
		incarnate: '#9a74c4',
		ecarlate: '#c94a4a'
	}
} as const;

export type StatusColorId = keyof typeof MEANING_COLORS.status;
export type EventTypeColorId = keyof typeof MEANING_COLORS.eventType;
export type BehaviorColorId = keyof typeof MEANING_COLORS.behavior;
export type GemColorId = keyof typeof MEANING_COLORS.gem;

/** Repli d'un statut hérité inconnu (couleur neutre d'« Aveuglé », legacy main.js:12481). */
export const UNKNOWN_STATUS_COLOR = MEANING_COLORS.status.aveugle;
/** Repli d'un comportement inconnu : Neutre (défaut `beasts.behavior`, audit 04 §1). */
export const UNKNOWN_BEHAVIOR_COLOR = MEANING_COLORS.behavior.Neutre;

function own<T extends object>(table: T, key: string): key is Extract<keyof T, string> {
	return Object.prototype.hasOwnProperty.call(table, key);
}

/** Couleur d'un statut ; identifiant inconnu ⇒ couleur neutre. */
export function statusColor(id: string): string {
	return own(MEANING_COLORS.status, id) ? MEANING_COLORS.status[id] : UNKNOWN_STATUS_COLOR;
}

/** Couleur d'un type de rendez-vous ; type inconnu ⇒ `autre` (legacy main.js:15124). */
export function eventTypeColor(type: string): string {
	return own(MEANING_COLORS.eventType, type)
		? MEANING_COLORS.eventType[type]
		: MEANING_COLORS.eventType.autre;
}

/** Couleur d'un comportement de créature ; inconnu ⇒ Neutre. */
export function behaviorColor(behavior: string): string {
	return own(MEANING_COLORS.behavior, behavior)
		? MEANING_COLORS.behavior[behavior]
		: UNKNOWN_BEHAVIOR_COLOR;
}

/** Couleur d'une Gemme de Sang. */
export function gemColor(kind: GemColorId): string {
	return MEANING_COLORS.gem[kind];
}
