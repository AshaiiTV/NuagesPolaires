// Types du moteur du simulateur de combat (paquet pur, sans I/O).
// Sources : audit 03 §2 (modèle d'état), §2.5 (déclaration), §2.6 (journal), §7 (statuts, taunt,
// invocations, élémentaire), §8 (drops, fin de combat) ; legacy main.js:10968-10983, 11957-12038.
// Tout ce qui est ici doit rester sérialisable en JSON (pas d'undefined, pas de fonction) :
// c'est le contenu de la colonne combats.state (04 §3.6).
import type { Resources } from '../types';
export type { OathTier } from '../types';

export type FighterType = 'player' | 'beast';

/** Phase du round (legacy `_cs.phase`, audit 03 §2.1). */
export type CombatPhase = 'idle' | 'declaration' | 'resolution';

/** Identifiants d'action (audit 03 §2.5, §4.3). `annule` = capacité annulée faute d'EM (§5.1). */
export type ActionId =
	| 'frappe'
	| 'pugilat'
	| 'esquive'
	| 'bloquer'
	| 'parer'
	| 'subit'
	| 'deplacer'
	| 'capacite'
	| 'soin'
	| 'frappe_dechainees'
	| 'passer'
	| 'annule';

export type ActionKind = 'attack' | 'defense' | 'utility' | 'heal' | 'buff' | 'summon';

/** Type d'entrée de journal (legacy cLog, audit 03 §2.6). */
export type LogKind = 'info' | 'round' | 'turn' | 'damage' | 'heal' | 'spell' | 'summon';

/** Les 12 statuts du référentiel (legacy STATUT_EFFECTS main.js:12474-12488, audit 03 §7.1). */
export type StatusId =
	| 'saignement'
	| 'empoisonne'
	| 'brulure'
	| 'gel'
	| 'etourdi'
	| 'entrave'
	| 'aveugle'
	| 'silence'
	| 'peur'
	| 'fragilise'
	| 'renforce'
	| 'inspire';

/** Éléments de l'Elementaliste (legacy elementKey, audit 03 §7.4). */
export type ElementKey = 'fire' | 'ice' | 'thunder' | 'water';

export type RangeType = 'cac' | 'distance';

export type ResourceKey = 'pv' | 'ep' | 'em';

/** Générateur pseudo-aléatoire injecté : renvoie un nombre dans [0, 1). */
export type Rng = () => number;

/** Statut posé en combat (legacy `{id, tours}`, audit 03 §7.1). */
export interface StatusInstance {
	id: StatusId;
	tours: number;
}

/** Cible forcée par l'Appel du Bouclier (legacy `taunt`, audit 03 §7.3). */
export interface Taunt {
	sourceId: string;
	sourceName: string;
	permanent: boolean;
	untilRound: number;
}

/** Posture Haute du Claymore (legacy `claymorePosture`, audit 03 §6). */
export interface ClaymorePosture {
	damage: number;
	epCost: number;
	blockEpDrain: number;
	noReposition: boolean;
	defenseChipPct: number;
	desc: string;
	defenseExtraEp?: number;
}

/** Invocation déclarée (legacy `summon`, audit 03 §4.4 Evocateur). */
export interface SummonSpec {
	name: string;
	pv: number;
	dmg: number;
	actCost: number;
	autoInterpose: boolean;
	rangeType: RangeType;
	ownerCharacterId: string;
}

/** Palier de branche de Serment (structure éditoriale conservée telle quelle, 04 §3.3). */
type OathTier = import('../types').OathTier;

/** Branche choisie par le joueur, figée à l'ajout du combattant. */
export interface FighterBranch {
	name: string;
	tiers: OathTier[];
}

/** Compteur élémentaire par attaquant (legacy `_elemState`, audit 03 §7.4). */
export interface ElementalState {
	last: ElementKey | null;
	count: number;
}

/**
 * Combattant (audit 03 §2.2 joueur, §2.3 créature, §2.4 invocation).
 * Une seule forme pour les trois cas : les champs non pertinents valent null / 0 / false.
 */
export interface Fighter extends Resources {
	id: string;
	type: FighterType;
	name: string;
	baseName: string;
	level: number;
	/** legacy `pid` : personnage du joueur (l'invocation porte le pid de son porteur). */
	characterId: string | null;
	/** legacy `bid`. */
	beastId: string | null;
	/** legacy `classe` (nom du Serment ; « <Serment> — Invocation » pour une invocation). */
	oathName: string | null;
	isSummon: boolean;
	/** legacy `ownerPid`. */
	ownerCharacterId: string | null;
	/** Nom de l'invocation (« Tortue Bipède » / « Crabe Canon ») : unicité par combat. */
	summonName: string | null;
	/** legacy `actionsMax` (invocation : 2). */
	actionsMax: number | null;
	autoInterpose: boolean;
	rangeType: RangeType | null;
	/** Dégâts de base : SD[classe].dmg (joueur) ou 1er nombre de `frappe` (créature). */
	dmgBase: number;
	/** Base du Serment effectif courant ; null si le Serment est inconnu. */
	oathDamage?: number | null;
	/** legacy `frappe` (texte libre de la créature). */
	strike: string | null;
	/** legacy `comp` (compétence de créature, texte libre). */
	skill: string | null;
	/** legacy `beh` (comportement de la créature). */
	behavior: string | null;
	/** Table de drop `beast.gem` figée à l'ajout (audit 03 §8.1). */
	gem: string | null;
	/** legacy `img`. */
	imageUrl: string | null;
	/** Paliers de la branche choisie (joueur), pour construire les capacités. */
	branch: FighterBranch | null;
	statuses: StatusInstance[];
	/** Cause connue du KO, pour ne jamais ouvrir un drop après un tick de statut. */
	koCause?: 'attack' | 'status';
	/** Bouclier de PV max (Bash Cinglant, Appel du Bouclier) ; retiré en fin de combat. */
	pvMaxBonus: number;
	/** Brise-Armure en attente : ajouté au prochain coup reçu. */
	briseArmureBonus: number;
	/** Taxe d'EP sur la prochaine défense (Fendre la Ligne). */
	defenseTaxNext: number;
	/** Round pendant lequel le déplacement est interdit (Posture Haute / Fendre la Ligne). */
	noFreeRepositionRound: number | null;
	claymorePosture: ClaymorePosture | null;
	taunt: Taunt | null;
	elemState: ElementalState | null;
}

/**
 * Déclaration d'action (legacy `entry` de cDeclareAction, audit 03 §2.5).
 * Tous les champs sont présents (valeurs neutres sinon) pour rester stable en JSON.
 */
export interface CombatAction {
	action: ActionId;
	kind: ActionKind;
	label: string;
	/** Combattant ciblé (attaques). */
	target: string | null;
	/** Combattant soigné (soin, frappe déchaînée). */
	healTarget: string | null;
	consumeActions: number;
	value: number;
	epCost: number;
	emCost: number;
	/** legacy `palNom`. */
	abilityName: string | null;
	hits: number;
	aoe: boolean;
	aoeIncludesAllies: boolean;
	undefendable: boolean;
	onlyDodge: boolean;
	healAmt: number;
	actsSacr: number;
	epDrain: number;
	selfEpGain: number;
	comboSelfEpGain: number;
	comboEpDrain: number;
	statusToTarget: StatusId | null;
	briseArmure: number;
	comboDamage: number;
	elementKey: ElementKey | null;
	selfPvMaxBonus: number;
	perEnemyPvMax: number;
	provoke: boolean;
	repulse: boolean;
	disarm: boolean;
	summon: SummonSpec | null;
	claymorePosture: ClaymorePosture | null;
	defenseExtraEp: number;
	defenseChipPct: number;
	guardBonusDmg: number;
	blockBreakLine: boolean;
	noReposition: boolean;
	nextDefenseTax: number;
	blockEpDrain: number;
	blockPct: number;
	consumeClaymorePosture: boolean;
	tauntLocked: boolean;
	tauntSourceName: string | null;
	/** Compétence de créature : pas de +Niveau (audit 03 §4.5). */
	dmgStatic: boolean;
}

/** Alias lisible : une déclaration est une CombatAction en attente de résolution. */
export type Declaration = CombatAction;

export type TargetType = 'enemy' | 'ally' | 'none';

/**
 * Option de capacité proposée au déclarant (legacy `opts` de cDeclareAction, construite par
 * cBuildAbilityOptionsForPalier / cParseMobSkillOption, audit 03 §4.4-4.5).
 */
export interface AbilityOption extends Partial<Omit<CombatAction, 'action' | 'target' | 'healTarget'>> {
	action: 'capacite' | 'soin' | 'frappe_dechainees';
	kind: ActionKind;
	label: string;
	abilityName: string;
	targetType: TargetType;
	healTargetType: 'ally' | null;
	descText: string;
	/** legacy `palierNiv` (0 pour une compétence de créature). */
	tierLevel: number;
	sourceType: 'oath' | 'beast';
}

/** Options acceptées par declareAction (cibles + surcharges de l'option de capacité). */
export interface DeclareOptions extends Partial<Omit<CombatAction, 'action' | 'target' | 'healTarget'>> {
	target?: string | null;
	healTarget?: string | null;
}

/** Entrée de journal structurée (contrat : {n, round, kind, text, actorId?, targetId?}). */
export interface CombatLogEntry {
	n: number;
	round: number;
	kind: LogKind;
	text: string;
	actorId: string | null;
	targetId: string | null;
	field?: ResourceKey;
	oldValue?: number;
	newValue?: number;
	/** Entrée réservée au MJ (migration des journaux libres). */
	private?: boolean;
}

/**
 * Drop de gemme (audit 03 §8.1). `roll === null` : D100 pas encore lancé ;
 * `gem` non null et `assignedTo === null` : drop différé (legacy pendingDrops).
 */
export interface DropRecord {
	id: string;
	fighterId: string;
	beastId: string | null;
	beastName: string;
	round: number;
	roll: number | null;
	gem: string | null;
	assignedTo: string | null;
	assignedName: string | null;
}

/** État complet du simulateur (legacy `_cs`, audit 03 §2.1 ; format v2 décrit dans index.ts). */
export interface CombatState {
	version: 2;
	schemaVersion: 2;
	/** Snapshots sans historique imbriqué, maximum 30 rounds. */
	history: CombatSnapshot[];
	/** Photographies des gestes manuels, distinctes des résolutions. */
	gestureHistory?: Array<CombatSnapshot & { history: CombatSnapshot[] }>;
	id: string;
	name: string;
	notes: string;
	ownerAccountId: string | null;
	active: boolean;
	ended: boolean;
	startedAt: number | null;
	endedAt: number | null;
	round: number;
	/** Combattant qui ouvre l'ordre (legacy `initiative`, index → id). null = premier ajouté. */
	initiative: string | null;
	fighters: Fighter[];
	/** Ordre de déclaration (ids), fixé au démarrage. */
	order: string[];
	/** Position courante dans `order`. */
	turn: number;
	phase: CombatPhase;
	/** legacy `decl` : { [fighterId]: CombatAction[] }. */
	declarations: Record<string, CombatAction[]>;
	log: CombatLogEntry[];
	drops: DropRecord[];
	/** Marqueurs « <ownerCharacterId>:<nom> » des invocations déjà appelées (remplace le marqueur du journal). */
	usedSummons: string[];
	/** Compteur interne pour les identifiants déterministes (combattants, drops). */
	seq: number;
}

export type CombatSnapshot = Omit<CombatState, 'history' | 'gestureHistory'>;

export interface PlayerFighterInput {
	type: 'player';
	characterId: string;
	name: string;
	oathName: string;
	level: number;
	pvCur: number;
	pvMax: number;
	epCur: number;
	epMax: number;
	emCur: number;
	emMax: number;
	/** SD[classe].dmg ; défaut 6 si absent (legacy combatToggleFighter). */
	dmgBase?: number;
	imageUrl?: string | null;
	branch?: FighterBranch | null;
	statuses?: StatusInstance[];
}

export interface BeastFighterInput {
	type: 'beast';
	beastId: string;
	name: string;
	level: number;
	pv: number;
	ep: number;
	/** legacy `frappe` : le 1er nombre donne dmgBase (défaut 6). */
	strike?: string | null;
	/** legacy `comp`. */
	skill?: string | null;
	/** legacy `beh` (défaut « Neutre »). */
	behavior?: string | null;
	gem?: string | null;
	imageUrl?: string | null;
}

export type FighterInput = PlayerFighterInput | BeastFighterInput;

export type CombatResult = 'victory' | 'defeat' | 'mixed';

/** Résultat par personnage calculé par endCombat (audit 03 §8.2 ; XP §8.3). */
export interface CombatOutcome {
	characterId: string;
	fighterId: string;
	name: string;
	pvCur: number;
	pvMax: number;
	epCur: number;
	epMax: number;
	emCur: number;
	emMax: number;
	ko: boolean;
	/** Statuts de combat à reporter sur la fiche (sans durée, legacy combatEnd). */
	statuses: StatusId[];
	/** Proposition d'XP : Σ ceil(niv_mob × 10 × participation/100) sur les créatures KO (audit 03 §8.3). */
	xpGain: number;
	participation: number;
	drops: { gem: string; beastName: string; roll: number }[];
	/** Texte legacy de l'entrée d'historique type « combat ». */
	historyText: string;
}

export type CombatErrorCode =
	| 'COMBAT_ALREADY_ACTIVE'
	| 'COMBAT_NO_FIGHTERS'
	| 'COMBAT_NOT_ACTIVE'
	| 'COMBAT_NOT_STARTED'
	| 'COMBAT_ALREADY_ENDED'
	| 'COMBAT_NOT_DECLARATION_PHASE'
	| 'COMBAT_NOT_RESOLUTION_PHASE'
	| 'COMBAT_WRONG_DECLARANT'
	| 'COMBAT_NO_ACTIONS_LEFT'
	| 'COMBAT_NOT_ENOUGH_ACTIONS'
	| 'COMBAT_MOVE_LOCKED'
	| 'COMBAT_UNKNOWN_FIGHTER'
	| 'COMBAT_FIGHTER_ALREADY_PRESENT'
	| 'COMBAT_INVALID_INPUT'
	| 'COMBAT_DROP_UNAVAILABLE'
	| 'COMBAT_DROP_ALREADY_ROLLED'
	| 'COMBAT_DROP_NOT_ROLLED'
	| 'COMBAT_DROP_ALREADY_ASSIGNED'
	| 'COMBAT_DROP_NOT_FOUND';

/** Erreur métier du moteur ; le domaine la convertit en NpError (409/400). */
export class CombatError extends Error {
	readonly code: CombatErrorCode;
	constructor(code: CombatErrorCode, message: string) {
		super(message);
		this.name = 'CombatError';
		this.code = code;
	}
}

export function isCombatError(e: unknown): e is CombatError {
	return e instanceof CombatError;
}
