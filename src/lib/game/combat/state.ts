// État du simulateur : création, combattants, initiative, démarrage, ajustements manuels.
// Sources : legacy combatBlankState (main.js:10981), combatToggleFighter (12403-12420),
// combatAddBeast (12422-12439), combatRemoveFighter (12441-12450), combatSetInit (12452-12456),
// combatMovePos (12458-12470), combatStart (11893-11910), _nextDeclarant (11912-11927),
// cAdj (12524-12536), cLog (11361) ; audit 03 §2, §3, §7.2.
// Toutes les fonctions publiques sont pures : elles clonent l'état reçu et renvoient le clone modifié.

import type {
	BeastFighterInput,
	CombatLogEntry,
	CombatState,
	Fighter,
	FighterInput,
	LogKind,
	PlayerFighterInput,
	ResourceKey,
	Rng
} from './types';
import { CombatError } from './types';
import { findOath } from '../oaths';

/** Dégâts de base par défaut quand le Serment ou la frappe ne donnent rien (legacy `sd.dmg||6`, `||6`). */
export const DEFAULT_DMG_BASE = 6;

/** Comportement par défaut d'une créature (legacy `b.beh||"Neutre"`). */
export const DEFAULT_BEHAVIOR = 'Neutre';

/** EP « infinie » d'une invocation (legacy epCur:999). */
export const SUMMON_ENERGY = 999;

/** Actions par tour d'une invocation (legacy actionsMax:2, audit 03 §2.4). */
export const SUMMON_ACTIONS_MAX = 2;

// ── Utilitaires internes partagés par le paquet ─────────────────────────────

export function cloneState(state: CombatState): CombatState {
	return structuredClone(state);
}

/** Photographie sans historique de gestes imbriqué. Compatible avec les états v2 existants. */
export function snapshotGesture(draft: CombatState): void {
	const { gestureHistory: _gestures, ...snapshot } = cloneState(draft);
	draft.gestureHistory = [...(draft.gestureHistory ?? []), snapshot].slice(-30);
}

export function undoLastGesture(state: CombatState): CombatState {
	if (state.ended) throw new CombatError('COMBAT_ALREADY_ENDED', 'Ce combat est clos.');
	const snapshot = state.gestureHistory?.at(-1);
	return snapshot
		? {
				...structuredClone(snapshot),
				gestureHistory: structuredClone(state.gestureHistory!.slice(0, -1))
			}
		: cloneState(state);
}

export function findFighter(state: CombatState, fighterId: string): Fighter | null {
	return state.fighters.find((f) => f.id === fighterId) ?? null;
}

export function findFighterOrThrow(state: CombatState, fighterId: string): Fighter {
	const f = findFighter(state, fighterId);
	if (!f) throw new CombatError('COMBAT_UNKNOWN_FIGHTER', 'Combattant introuvable.');
	return f;
}

export function isAlive(f: Pick<Fighter, 'pvCur'>): boolean {
	return f.pvCur > 0;
}

/** Ajoute une entrée de journal au brouillon (legacy cLog). Mutation volontaire sur un clone. */
export function pushLog(
	draft: CombatState,
	kind: LogKind,
	text: string,
	actorId: string | null = null,
	targetId: string | null = null
): CombatLogEntry {
	const entry: CombatLogEntry = {
		n: draft.log.length + 1,
		round: draft.round,
		kind,
		text,
		actorId,
		targetId
	};
	draft.log.push(entry);
	return entry;
}

function nextId(draft: CombatState, prefix: string): string {
	draft.seq += 1;
	return `${prefix}${draft.seq}`;
}

export function newFighterId(draft: CombatState): string {
	return nextId(draft, 'cf');
}

export function newDropId(draft: CombatState): string {
	return nextId(draft, 'pd');
}

/** Date « JJ/MM/AAAA » en heure de Paris (legacy toLocaleDateString("fr-FR")). */
export function formatDateFr(epochMs: number): string {
	return new Intl.DateTimeFormat('fr-FR', {
		timeZone: 'Europe/Paris',
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	}).format(new Date(epochMs));
}

/**
 * Avance au prochain déclarant vivant (legacy _nextDeclarant). Quand tout le monde a déclaré,
 * la phase passe en « resolution ». Mutation sur un brouillon.
 */
export function advanceDeclarant(draft: CombatState, opts: { log?: boolean } = {}): void {
	while (draft.turn < draft.order.length) {
		const f = findFighter(draft, draft.order[draft.turn] ?? '');
		if (f && isAlive(f)) break;
		draft.turn += 1;
	}
	if (draft.turn >= draft.order.length) {
		draft.phase = 'resolution';
		return;
	}
	const f = findFighter(draft, draft.order[draft.turn] ?? '');
	if (f && opts.log !== false) pushLog(draft, 'turn', `📋 Déclaration de : ${f.name}`, f.id);
}

/** Combattant dont c'est le tour de déclaration, ou null (legacy cCurIdx). */
export function currentDeclarantId(state: CombatState): string | null {
	if (!state.active || state.phase !== 'declaration') return null;
	return state.order[state.turn] ?? null;
}

// ── Création ────────────────────────────────────────────────────────────────

export interface CreateCombatOptions {
	/** Identifiant fourni par le domaine (nanoid préfixé `c_`) ou hérité (`c<timestamp>`). */
	id: string;
	name?: string;
	notes?: string;
	ownerAccountId?: string | null;
}

/** État vierge (legacy combatBlankState). */
export function createCombat(opts: CreateCombatOptions): CombatState {
	if (!opts.id || typeof opts.id !== 'string')
		throw new CombatError('COMBAT_INVALID_INPUT', 'Identifiant de combat requis.');
	return {
		version: 2,
		schemaVersion: 2,
		history: [],
		gestureHistory: [],
		id: opts.id,
		name: opts.name ?? '',
		notes: opts.notes ?? '',
		ownerAccountId: opts.ownerAccountId ?? null,
		active: false,
		ended: false,
		startedAt: null,
		endedAt: null,
		round: 1,
		initiative: null,
		fighters: [],
		order: [],
		turn: 0,
		phase: 'idle',
		declarations: {},
		log: [],
		drops: [],
		usedSummons: [],
		seq: 0
	};
}

// ── Combattants ─────────────────────────────────────────────────────────────

function baseFighter(id: string, type: Fighter['type'], name: string, level: number): Fighter {
	return {
		id,
		type,
		name,
		baseName: name,
		level,
		characterId: null,
		beastId: null,
		oathName: null,
		isSummon: false,
		ownerCharacterId: null,
		summonName: null,
		actionsMax: null,
		autoInterpose: false,
		rangeType: null,
		pvCur: 0,
		pvMax: 0,
		epCur: 0,
		epMax: 0,
		emCur: 0,
		emMax: 0,
		dmgBase: DEFAULT_DMG_BASE,
		strike: null,
		skill: null,
		behavior: null,
		gem: null,
		imageUrl: null,
		branch: null,
		statuses: [],
		pvMaxBonus: 0,
		briseArmureBonus: 0,
		defenseTaxNext: 0,
		noFreeRepositionRound: null,
		claymorePosture: null,
		taunt: null,
		elemState: null
	};
}

function toInt(value: unknown, fallback: number): number {
	const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
	return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

/** Combattant joueur (legacy combatToggleFighter, audit 03 §2.2). */
export function makePlayerFighter(draft: CombatState, input: PlayerFighterInput): Fighter {
	const f = baseFighter(newFighterId(draft), 'player', input.name, toInt(input.level, 1) || 1);
	f.characterId = input.characterId;
	f.oathName = input.oathName;
	f.pvCur = toInt(input.pvCur, 0);
	f.pvMax = toInt(input.pvMax, 0);
	f.epCur = toInt(input.epCur, 0);
	f.epMax = toInt(input.epMax, 0);
	f.emCur = toInt(input.emCur, 0);
	f.emMax = toInt(input.emMax, 0);
	f.dmgBase = toInt(input.dmgBase, findOath(input.oathName)?.baseDamage ?? DEFAULT_DMG_BASE);
	f.oathDamage = findOath(input.oathName) ? f.dmgBase : null;
	f.imageUrl = input.imageUrl ?? null;
	f.branch = input.branch ? structuredClone(input.branch) : null;
	// legacy : statuts:[] à l'ajout (les statuts de la fiche ne sont pas importés)
	f.statuses = [];
	return f;
}

/** Premier nombre du champ `frappe` d'une créature, sinon 6 (legacy combatAddBeast). */
export function strikeDamage(strike: string | null | undefined): number {
	const m = String(strike ?? '').match(/\d+/);
	return m ? Number.parseInt(m[0], 10) : DEFAULT_DMG_BASE;
}

/** Combattant créature (legacy combatAddBeast, audit 03 §2.3) ; `displayName` déjà numéroté. */
export function makeBeastFighter(
	draft: CombatState,
	input: BeastFighterInput,
	displayName: string
): Fighter {
	const f = baseFighter(newFighterId(draft), 'beast', displayName, toInt(input.level, 1) || 1);
	f.baseName = input.name;
	f.beastId = input.beastId;
	f.pvCur = toInt(input.pv, 0);
	f.pvMax = toInt(input.pv, 0);
	f.epCur = toInt(input.ep, 0);
	f.epMax = toInt(input.ep, 0);
	f.emCur = 0;
	f.emMax = 0;
	f.dmgBase = strikeDamage(input.strike);
	f.strike = input.strike ?? '';
	f.skill = input.skill ?? '';
	f.behavior = input.behavior ?? DEFAULT_BEHAVIOR;
	f.gem = input.gem ?? null;
	f.imageUrl = input.imageUrl ?? null;
	return f;
}

/**
 * Ajoute un combattant. Joueur : refusé s'il est déjà présent (l'ancien bouton était un toggle ;
 * utiliser removeFighter). Créature : toujours une nouvelle instance, numérotée
 * « Nom », puis « Nom 1 » / « Nom 2 »… (règle audit 03 §2.3).
 * Si le combat est actif, le nouveau venu est placé en fin d'ordre de déclaration.
 */
export function addFighter(state: CombatState, input: FighterInput): CombatState {
	if (state.ended) throw new CombatError('COMBAT_ALREADY_ENDED', 'Ce combat est clos.');
	const draft = cloneState(state);
	let fighter: Fighter;
	if (input.type === 'player') {
		if (!input.characterId || !input.name)
			throw new CombatError('COMBAT_INVALID_INPUT', 'Personnage incomplet.');
		const dup = draft.fighters.some(
			(f) => f.type === 'player' && !f.isSummon && f.characterId === input.characterId
		);
		if (dup)
			throw new CombatError(
				'COMBAT_FIGHTER_ALREADY_PRESENT',
				`${input.name} est déjà dans le combat.`
			);
		fighter = makePlayerFighter(draft, input);
	} else {
		if (!input.beastId || !input.name)
			throw new CombatError('COMBAT_INVALID_INPUT', 'Créature incomplète.');
		const existing = draft.fighters.filter(
			(f) => f.type === 'beast' && f.beastId === input.beastId
		);
		// Renommer rétroactivement le premier si c'est le deuxième ajout (legacy main.js:12426-12428)
		if (existing.length === 1 && existing[0]!.name === input.name)
			existing[0]!.name = `${input.name} 1`;
		const displayName = existing.length > 0 ? `${input.name} ${existing.length + 1}` : input.name;
		fighter = makeBeastFighter(draft, input, displayName);
	}
	draft.fighters.push(fighter);
	if (draft.active) draft.order.push(fighter.id);
	return draft;
}

/**
 * Retire un combattant (legacy combatRemoveFighter) : toutes les déclarations sont vidées.
 * L'ordre est réinitialisé à l'ordre d'ajout, comme le simulateur.
 * En combat actif, phase conservée ; curseur remis à 0 seulement s’il sort de l’ordre.
 */
export function removeFighter(state: CombatState, fighterId: string): CombatState {
	const draft = cloneState(state);
	const idx = draft.fighters.findIndex((f) => f.id === fighterId);
	if (idx < 0) throw new CombatError('COMBAT_UNKNOWN_FIGHTER', 'Combattant introuvable.');
	snapshotGesture(draft);
	draft.fighters.splice(idx, 1);
	draft.declarations = {};
	if (draft.initiative === fighterId) draft.initiative = null;
	for (const f of draft.fighters) if (f.taunt && f.taunt.sourceId === fighterId) f.taunt = null;
	if (draft.active) {
		draft.order = draft.fighters.map((f) => f.id);
		if (draft.turn >= draft.fighters.length) draft.turn = 0;
	} else {
		draft.order = draft.order.filter((id) => id !== fighterId);
	}
	return draft;
}

/** Choix de l'initiative (legacy combatSetInit) : journal « ★ Initiative : X ». */
export function setInitiative(state: CombatState, fighterId: string): CombatState {
	const draft = cloneState(state);
	const f = findFighterOrThrow(draft, fighterId);
	draft.initiative = f.id;
	pushLog(draft, 'info', `★ Initiative : ${f.name}`, f.id);
	return draft;
}

/**
 * Démarre le combat (legacy combatStart). Ordre = [initiative] puis les autres dans l'ordre
 * d'ajout, fixe pour tout le combat. Le journal et les déclarations sont remis à zéro.
 * `rng` est accepté pour le contrat inter-paquets mais n'est PAS utilisé : l'initiative est un
 * choix du MJ, il n'existe aucun tirage d'initiative dans les règles implémentées (audit 03 §3.2).
 */
export function startCombat(
	state: CombatState,
	_rng?: Rng,
	opts: { now?: number } = {}
): CombatState {
	if (state.active) throw new CombatError('COMBAT_ALREADY_ACTIVE', 'Combat déjà en cours.');
	if (state.ended) throw new CombatError('COMBAT_ALREADY_ENDED', 'Ce combat est clos.');
	if (!state.fighters.length)
		throw new CombatError('COMBAT_NO_FIGHTERS', 'Ajoute des combattants.');
	const draft = cloneState(state);
	const now = opts.now ?? 0;
	draft.active = true;
	draft.round = 1;
	draft.log = [];
	draft.declarations = {};
	draft.usedSummons = [];
	draft.phase = 'declaration';
	draft.turn = 0;
	draft.startedAt = now;
	const first = draft.fighters[0]!;
	const initId =
		draft.initiative && findFighter(draft, draft.initiative) ? draft.initiative : first.id;
	draft.initiative = initId;
	draft.order = [initId, ...draft.fighters.map((f) => f.id).filter((id) => id !== initId)];
	if (!draft.name) draft.name = `Combat du ${formatDateFr(now)}`;
	pushLog(draft, 'round', '⚔ Combat démarré — Round 1');
	advanceDeclarant(draft);
	return draft;
}

/**
 * Réordonne un combattant en cours de combat (legacy combatMovePos, position 1-based).
 * Vide toutes les déclarations ; journal « ↕ X → pos N ».
 */
export function moveFighterPosition(
	state: CombatState,
	fighterId: string,
	position: number
): CombatState {
	const draft = cloneState(state);
	const f = findFighterOrThrow(draft, fighterId);
	const o = draft.order;
	const cur = o.indexOf(fighterId);
	if (cur < 0)
		throw new CombatError('COMBAT_NOT_ACTIVE', "L'ordre n'est fixé qu'une fois le combat démarré.");
	const newPos = Math.max(0, Math.min(o.length - 1, Math.trunc(position) - 1));
	if (newPos === cur) return draft;
	o.splice(cur, 1);
	o.splice(newPos, 0, fighterId);
	const ct = draft.turn;
	if (ct === cur) draft.turn = newPos;
	else if (cur < ct && newPos >= ct) draft.turn = ct - 1;
	else if (cur > ct && newPos <= ct) draft.turn = ct + 1;
	draft.declarations = {};
	pushLog(draft, 'info', `↕ ${f.name} → pos ${newPos + 1}`, f.id);
	return draft;
}

/**
 * Ajustement manuel ±N (legacy cAdj) : un retrait de PV consomme d'abord le bouclier pvMaxBonus ;
 * sinon clamp [0, max || 999].
 */
export function adjustResource(
	state: CombatState,
	fighterId: string,
	stat: ResourceKey,
	delta: number,
	motif = 'Ajustement MJ'
): CombatState {
	if (!Number.isFinite(delta))
		throw new CombatError('COMBAT_INVALID_INPUT', 'Ajustement invalide.');
	if (!['pv', 'ep', 'em'].includes(stat) || !motif.trim())
		throw new CombatError('COMBAT_INVALID_INPUT', 'Ressource et motif requis.');
	const draft = cloneState(state);
	const f = findFighterOrThrow(draft, fighterId);
	snapshotGesture(draft);
	const old = f[`${stat}Cur`];
	const journal = () => {
		const entry = pushLog(
			draft,
			'info',
			`${f.name} : ${stat.toUpperCase()} ${old} → ${f[`${stat}Cur`]} — ${motif}`,
			f.id
		);
		entry.field = stat;
		entry.oldValue = old;
		entry.newValue = f[`${stat}Cur`];
	};
	const d = Math.trunc(delta);
	if (stat === 'pv' && d < 0 && f.pvMaxBonus > 0) {
		const dmg = Math.abs(d);
		const sa = Math.min(f.pvMaxBonus, dmg);
		const rd = dmg - sa;
		f.pvMaxBonus -= sa;
		f.pvMax -= sa;
		f.pvCur = Math.max(0, f.pvCur - sa);
		if (rd > 0) f.pvCur = Math.max(0, f.pvCur - rd);
		journal();
		return draft;
	}
	if (stat === 'pv') f.pvCur = Math.max(0, Math.min(f.pvMax || 999, f.pvCur + d));
	else if (stat === 'ep') f.epCur = Math.max(0, Math.min(f.epMax || 999, f.epCur + d));
	else f.emCur = Math.max(0, Math.min(f.emMax || 999, f.emCur + d));
	journal();
	return draft;
}

/** Bouton « ↺ » : EP et EM au maximum (audit 03 §7.2). */
export function restoreEnergy(state: CombatState, fighterId: string): CombatState {
	const f = findFighterOrThrow(state, fighterId);
	return adjustResource(
		adjustResource(state, fighterId, 'ep', f.epMax - f.epCur, 'Restauration'),
		fighterId,
		'em',
		f.emMax - f.emCur,
		'Restauration'
	);
}

/** Notes privées du MJ (jamais projetées vers les joueurs). */
export function setNotes(state: CombatState, notes: string): CombatState {
	const draft = cloneState(state);
	draft.notes = String(notes ?? '');
	return draft;
}

export function renameCombat(state: CombatState, name: string): CombatState {
	const draft = cloneState(state);
	draft.name = String(name ?? '').trim();
	return draft;
}

/** Combattants vivants (utilitaire de lecture). */
export function aliveFighters(state: CombatState): Fighter[] {
	return state.fighters.filter(isAlive);
}
