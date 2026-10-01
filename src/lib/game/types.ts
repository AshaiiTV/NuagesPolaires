/**
 * Types partagés des règles pures (`$lib/game`).
 * Aucune I/O ici : ces types décrivent les données de jeu telles que les manipulent
 * la progression, le catalogue des Serments, le combat et les autres modules.
 *
 * Sources : audit 02 (personnage / progression / serments), `legacy/assets/js/progression.js`,
 * `legacy/assets/js/main.js:213-485` (objet SD) et `legacy/docs/fusion-xp.md`.
 */

/** Croissance par niveau d'un Serment (gains à partir du niveau 2). audit 02 §4.1 */
export type Growth = {
	/** Points de Vie gagnés par niveau. */
	pvN: number;
	/** Énergie Physique gagnée par niveau. */
	epN: number;
	/** Énergie Magique gagnée par niveau. */
	emN: number;
};

/** Ressources courantes et maximales d'un personnage. audit 02 §1.2 */
export type Resources = {
	pvCur: number;
	pvMax: number;
	epCur: number;
	epMax: number;
	emCur: number;
	emMax: number;
};

/** Sous-ensemble d'une fiche nécessaire aux calculs de progression. audit 02 §1.2 */
export type ProgressionState = Resources & {
	/** Niveau unique du personnage (≥ 1). */
	level: number;
	/** XP courante vers le niveau suivant (≥ 0). */
	xp: number;
};

/** Types d'entrées d'historique produites par les règles de progression. audit 02 §8 */
export type ProgressionHistoryType = 'level' | 'xp' | 'gemme' | 'add' | 'remove';

/**
 * Brouillon d'entrée d'historique : la couche domaine ajoute l'horodatage, l'identifiant
 * du personnage et l'auteur (compte). Le texte est BRUT (échappé au rendu, 04 §3.2).
 */
export type HistoryEntryDraft = {
	type: ProgressionHistoryType;
	text: string;
	/** « Système », « MJ <nom> », « Admin <nom> »… audit 02 §8 */
	actorName: string;
};

/** Grades de Gemmes de Sang. audit 02 §6 */
export type GemKind = 'blanche' | 'incarnate' | 'ecarlate';

/** Objet d'inventaire minimal pour le stock de gemmes. audit 02 §7.1 */
export type InventoryItemLike = {
	name: string;
	category: string;
	qty: number;
};

/** Rangs des Serments (`SERM_LEVELS`, legacy main.js:6096-6104). audit 02 §4.2 */
export type OathRank =
	| 'basic'
	| 'seasoned'
	| 'emeritus'
	| 'singular'
	| 'transcended'
	| 'corrupted'
	| 'other';

/** Catégories de combat (`SERM_CATS`, legacy main.js:6091-6095). audit 02 §4.2 */
export type OathCategory = 'melee' | 'distance' | 'magie' | 'soutien';

/** Palier d'une branche : niveau requis, nom, coût et description verbatim. audit 02 §4.1 */
export type OathTier = {
	niv: number;
	nom: string;
	cout: string;
	desc: string;
};

/**
 * Branche d'un Serment. Les branches natives portent `descPhys` et `flavor` ;
 * les branches créées par l'atelier n'ont que `desc` (audit 02 §4.1, legacy main.js:6808).
 */
export type OathBranch = {
	/** Nom complet, ex. « Branche A — L'Élan Tranchant ». */
	nom: string;
	/** Style, ex. « Brutalité ». */
	style: string;
	descPhys?: string;
	flavor?: string;
	desc?: string;
	paliers: OathTier[];
};

/** Définition complète d'un Serment (natif ou personnalisé). 04 §3.3, audit 02 §4.1 */
export type OathDefinition = {
	/** Slug stable (ex. `duelliste`, `lame-d-honneur`). */
	id: string;
	/** Nom exact du catalogue (clé `classe` des anciennes fiches). */
	name: string;
	/** Arme liée, copiée sur la fiche. */
	weapon: string;
	growth: Growth;
	/** « Dmg frappe » : dégâts de base de la frappe (+ niveau). */
	baseDamage: number;
	/** Type de dégâts de la frappe (non exploité mécaniquement). */
	damageType: string;
	rank: OathRank;
	/** Masqué de la vitrine publique et des sélecteurs. */
	hidden: boolean;
	/** Nom du Serment parent (lignée), `null` sinon. */
	evolvesFrom: string | null;
	icon: string;
	category: OathCategory;
	lore: string;
	/** Un natif a toujours deux branches ; un custom peut en avoir moins. */
	branches: { bA: OathBranch | null; bB: OathBranch | null; extraBranches?: OathBranch[] };
	isBuiltin: boolean;
};
