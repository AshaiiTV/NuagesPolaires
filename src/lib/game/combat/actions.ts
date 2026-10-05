// Phase de déclaration : table des actions de base, nombre d'actions, déclaration, retouche.
// Sources : legacy cDeclareAction (main.js:11930-12063), cActionsMax / cActionsLeft (11876-11890),
// cGetDeclaredTargetActionBonus (11845-11858), cUndoLastDecl (12066-12070), cEditDecl (12073-12088) ;
// audit 03 §4.1-4.3.

import type { ActionId, CombatAction, CombatState, DeclareOptions, Fighter } from './types';
import { CombatError } from './types';
import {
	advanceDeclarant,
	cloneState,
	findFighter,
	findFighterOrThrow,
	isAlive,
	pushLog,
	snapshotGesture
} from './state';
import { statusActionMalus } from './statuses';
import { forcedTargetInfo } from './resolve';

/** Actions de base par tour (audit 03 §4.1). */
export const BASE_ACTIONS = 3;

export { ACTION_COSTS } from '../rules';
import { ACTION_COSTS } from '../rules';

/** Pugilat : 4 + niveau (legacy main.js:11955 ; la page règles et le bouton disent 3 + Niv : divergence, audit 03 §4.3). */
export const PUGILAT_BASE = 4;

export const BLOCK_PCT_PLAYER = 50;
export const BLOCK_PCT_BEAST = 25;

/** Dégâts d'une frappe : dmgBase + niveau (niveau 0 → 1, legacy `f.level||1`). */
export function baseDamage(
	f: Pick<Fighter, 'dmgBase' | 'level'> & Partial<Pick<Fighter, 'oathDamage'>>
): number {
	return (f.oathDamage ?? (f.dmgBase || 6)) + (f.level || 1);
}

export function pugilatDamage(f: Pick<Fighter, 'level'>): number {
	return PUGILAT_BASE + (f.level || 1);
}

/** Déclaration neutre : toutes les clés présentes (stabilité JSON). */
export function emptyAction(): CombatAction {
	return {
		action: 'passer',
		kind: 'utility',
		label: '',
		target: null,
		healTarget: null,
		consumeActions: 1,
		value: 0,
		epCost: 0,
		emCost: 0,
		abilityName: null,
		hits: 0,
		aoe: false,
		aoeIncludesAllies: false,
		undefendable: false,
		onlyDodge: false,
		healAmt: 0,
		actsSacr: 0,
		epDrain: 0,
		selfEpGain: 0,
		comboSelfEpGain: 0,
		comboEpDrain: 0,
		statusToTarget: null,
		briseArmure: 0,
		comboDamage: 0,
		elementKey: null,
		selfPvMaxBonus: 0,
		perEnemyPvMax: 0,
		provoke: false,
		repulse: false,
		disarm: false,
		summon: null,
		claymorePosture: null,
		defenseExtraEp: 0,
		defenseChipPct: 0,
		guardBonusDmg: 0,
		blockBreakLine: false,
		noReposition: false,
		nextDefenseTax: 0,
		blockEpDrain: 0,
		blockPct: 0,
		consumeClaymorePosture: false,
		tauntLocked: false,
		tauntSourceName: null,
		dmgStatic: false
	};
}

/** Slot « passer » (legacy `{action:"passer",label:"—"}`). */
export function passDeclaration(): CombatAction {
	return { ...emptyAction(), action: 'passer', label: '—', kind: 'utility' };
}

/**
 * Bonus d'actions par écart de niveau : max sur les déclarations déjà faites avec une cible
 * vivante et ennemie de max(0, niveau − niveau cible) ; 0 pour une invocation
 * (legacy cGetDeclaredTargetActionBonus, audit 03 §4.1).
 */
export function declaredTargetActionBonus(state: CombatState, f: Fighter): number {
	if (f.isSummon) return 0;
	let best = 0;
	for (const a of state.declarations[f.id] ?? []) {
		if (a.target === null) continue;
		const t = findFighter(state, a.target);
		if (!t || !isAlive(t) || t.type === f.type) continue;
		best = Math.max(best, Math.max(0, (f.level || 1) - (t.level || 1)));
	}
	return best;
}

/** actionsMax = invocation : 2 ; sinon max(1, 3 − malus statut) + bonus de niveau (audit 03 §4.1). */
export function actionsMax(state: CombatState, fighterId: string): number {
	const f = findFighter(state, fighterId);
	if (!f) return BASE_ACTIONS;
	if (f.isSummon) return f.actionsMax || 2;
	const effectiveBase = Math.max(1, BASE_ACTIONS - statusActionMalus(f));
	return effectiveBase + declaredTargetActionBonus(state, f);
}

export function declaredActionCount(state: CombatState, fighterId: string): number {
	return (state.declarations[fighterId] ?? []).reduce((sum, a) => sum + (a.consumeActions || 1), 0);
}

export function actionsLeft(state: CombatState, fighterId: string): number {
	return Math.max(0, actionsMax(state, fighterId) - declaredActionCount(state, fighterId));
}

export type DeclarableAction = Exclude<ActionId, 'annule'>;

const ATTACK_ACTIONS: ReadonlySet<ActionId> = new Set(['frappe', 'pugilat', 'frappe_dechainees']);

function num(v: number | undefined, fallback = 0): number {
	return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/**
 * Construit la déclaration à partir de l'action et des options (port de la table de
 * cDeclareAction). Ne vérifie pas la phase : voir declareAction.
 */
export function buildDeclaration(
	f: Fighter,
	action: DeclarableAction,
	opts: DeclareOptions = {}
): CombatAction {
	const posture = f.claymorePosture;
	const dmg = action === 'frappe' && posture && posture.damage ? posture.damage : baseDamage(f);
	const pugDmg = pugilatDamage(f);
	const e = emptyAction();
	e.action = action;
	e.label = opts.label ?? '';
	e.target = opts.target ?? null;
	e.healTarget = opts.healTarget ?? null;
	e.consumeActions = Math.max(1, Math.trunc(num(opts.consumeActions, 1)) || 1);
	e.kind = opts.kind ?? 'utility';
	switch (action) {
		case 'frappe':
			e.kind = 'attack';
			e.value = dmg;
			e.label = e.label || (posture ? `🗡 Frappe Haute (${dmg})` : `⚔ Frappe (${dmg})`);
			e.epCost = posture ? posture.epCost || ACTION_COSTS.frappeHauteDefault : ACTION_COSTS.frappe;
			if (posture) {
				e.blockEpDrain = posture.blockEpDrain || 0;
				e.defenseExtraEp = posture.defenseExtraEp ?? 0;
				e.defenseChipPct = posture.defenseChipPct || 0;
				e.noReposition = !!posture.noReposition;
				e.consumeClaymorePosture = true;
			}
			break;
		case 'pugilat':
			e.kind = 'attack';
			e.value = pugDmg;
			e.label = e.label || `👊 Pugilat (${pugDmg})`;
			e.epCost = ACTION_COSTS.pugilat;
			break;
		case 'esquive':
			e.kind = 'defense';
			e.label = e.label || '🛡 Esquive';
			e.epCost = ACTION_COSTS.esquive;
			break;
		case 'bloquer':
			e.kind = 'defense';
			if (f.type === 'beast') {
				e.label = e.label || '🛡 Bloquer (corps) −25%';
				e.epCost = ACTION_COSTS.bloquerBeast;
				e.blockPct = BLOCK_PCT_BEAST;
			} else {
				e.label = e.label || '🛡 Bloquer −50%';
				e.epCost = ACTION_COSTS.bloquerPlayer;
				e.blockPct = BLOCK_PCT_PLAYER;
			}
			break;
		case 'parer':
			e.kind = 'defense';
			if (f.type === 'beast') {
				e.label = e.label || '🛡 Bloquer (corps) −25%';
				e.epCost = ACTION_COSTS.bloquerBeast;
				e.blockPct = BLOCK_PCT_BEAST;
			} else {
				e.label = e.label || '🤜 Parer −25%';
				e.epCost = ACTION_COSTS.parer;
			}
			break;
		case 'subit':
			// Aucun effet en résolution (audit 03 §4.3 [DETTE]) : conservé pour la narration.
			e.kind = 'defense';
			e.label = e.label || '🩸 Subit';
			e.epCost = 0;
			break;
		case 'deplacer':
			e.kind = 'utility';
			e.label = e.label || '🏃 Déplacement';
			e.epCost = ACTION_COSTS.deplacer;
			break;
		case 'capacite':
			e.kind = opts.kind ?? (num(opts.value) || num(opts.hits) || opts.aoe ? 'attack' : 'utility');
			e.label = e.label || `✨ ${opts.abilityName ?? 'Capacité'}`;
			e.emCost = num(opts.emCost);
			e.epCost = num(opts.epCost);
			e.value = num(opts.value);
			e.abilityName = opts.abilityName ?? null;
			e.hits = num(opts.hits);
			e.aoe = !!opts.aoe;
			e.aoeIncludesAllies = !!opts.aoeIncludesAllies;
			e.undefendable = !!opts.undefendable;
			e.onlyDodge = !!opts.onlyDodge;
			e.healAmt = num(opts.healAmt);
			e.epDrain = num(opts.epDrain);
			e.selfEpGain = num(opts.selfEpGain);
			e.comboSelfEpGain = num(opts.comboSelfEpGain);
			e.comboEpDrain = num(opts.comboEpDrain);
			e.statusToTarget = opts.statusToTarget ?? null;
			e.briseArmure = num(opts.briseArmure);
			e.comboDamage = num(opts.comboDamage);
			e.elementKey = opts.elementKey ?? null;
			e.selfPvMaxBonus = num(opts.selfPvMaxBonus);
			e.perEnemyPvMax = num(opts.perEnemyPvMax);
			e.provoke = !!opts.provoke;
			e.repulse = !!opts.repulse;
			e.disarm = !!opts.disarm;
			e.summon = opts.summon ? structuredClone(opts.summon) : null;
			e.claymorePosture = opts.claymorePosture ? structuredClone(opts.claymorePosture) : null;
			e.defenseExtraEp = num(opts.defenseExtraEp);
			e.defenseChipPct = num(opts.defenseChipPct);
			e.guardBonusDmg = num(opts.guardBonusDmg);
			e.blockBreakLine = !!opts.blockBreakLine;
			e.noReposition = !!opts.noReposition;
			e.nextDefenseTax = num(opts.nextDefenseTax);
			e.blockEpDrain = num(opts.blockEpDrain);
			e.dmgStatic = !!opts.dmgStatic;
			break;
		case 'soin':
			e.kind = 'heal';
			e.label = e.label || `💚 Soin (${num(opts.healAmt)} PV)`;
			e.emCost = num(opts.emCost);
			e.epCost = num(opts.epCost);
			e.healAmt = num(opts.healAmt);
			e.actsSacr = num(opts.actsSacr);
			e.abilityName = opts.abilityName ?? null;
			e.dmgStatic = !!opts.dmgStatic;
			break;
		case 'frappe_dechainees':
			e.kind = 'attack';
			e.value = num(opts.value) || dmg;
			e.label = e.label || `⚔💚 Frappe Déchaînée (${num(opts.value) || dmg})`;
			e.emCost = num(opts.emCost);
			e.healAmt = num(opts.healAmt);
			e.abilityName = opts.abilityName ?? null;
			break;
		case 'passer':
			e.kind = 'utility';
			e.label = e.label || '⏭ Passer';
			e.epCost = 0;
			break;
	}
	return e;
}

/**
 * Déclare une action pour le combattant courant (legacy cDeclareAction). Refus (CombatError) :
 * hors phase, mauvais déclarant, plus d'actions, coût > actions restantes, déplacement verrouillé.
 * « passer » remplit tous les slots restants. Une attaque ciblée est redirigée vers la source
 * d'un Appel du Bouclier actif. Le tour passe au suivant dès que les actions sont épuisées.
 */
export function declareAction(
	state: CombatState,
	fighterId: string,
	declaration: ActionId | (DeclareOptions & { action: ActionId }),
	opts: DeclareOptions = {}
): CombatState {
	const action = typeof declaration === 'string' ? declaration : declaration.action;
	if (action === 'annule')
		throw new CombatError('COMBAT_INVALID_INPUT', 'Une annulation ne se déclare pas.');
	if (typeof declaration !== 'string') opts = declaration;
	for (const [key, value] of Object.entries(opts)) {
		if (typeof value === 'number' && (!Number.isFinite(value) || value < 0))
			throw new CombatError('COMBAT_INVALID_INPUT', `Valeur invalide : ${key}`);
	}
	const f0 = findFighterOrThrow(state, fighterId);
	if (state.phase !== 'declaration')
		throw new CombatError('COMBAT_NOT_DECLARATION_PHASE', 'Phase de déclaration terminée.');
	if (state.order[state.turn] !== fighterId)
		throw new CombatError(
			'COMBAT_WRONG_DECLARANT',
			`Ce n'est pas le tour de déclaration de ${f0.name}.`
		);
	const left = actionsLeft(state, fighterId);
	const consume = Math.max(1, Math.trunc(num(opts.consumeActions, 1)) || 1);
	if (left <= 0 && action !== 'passer')
		throw new CombatError('COMBAT_NO_ACTIONS_LEFT', `${f0.name} n'a plus d'actions à déclarer.`);
	if (action !== 'passer' && consume > left)
		throw new CombatError(
			'COMBAT_NOT_ENOUGH_ACTIONS',
			"Pas assez d'actions restantes pour cette compétence."
		);
	if (action === 'deplacer' && f0.noFreeRepositionRound === state.round)
		throw new CombatError('COMBAT_MOVE_LOCKED', `${f0.name} ne peut pas se déplacer ce round.`);
	if (opts.target != null && !findFighter(state, opts.target))
		throw new CombatError('COMBAT_INVALID_INPUT', 'Cible inconnue.');
	if (opts.healTarget != null && !findFighter(state, opts.healTarget))
		throw new CombatError('COMBAT_INVALID_INPUT', 'Cible de soin inconnue.');

	const draft = cloneState(state);
	const f = findFighterOrThrow(draft, fighterId);
	const entry = buildDeclaration(f, action, opts);
	const isSingleTargetAttack =
		entry.kind === 'attack' && !entry.aoe && (ATTACK_ACTIONS.has(action) || action === 'capacite');
	if (isSingleTargetAttack && entry.target === null)
		throw new CombatError('COMBAT_INVALID_INPUT', 'Choisis une cible.');

	// Cible forcée par l'Appel du Bouclier (audit 03 §7.3)
	const forced = forcedTargetInfo(draft, f);
	if (forced && entry.kind === 'attack' && entry.target !== null) {
		entry.target = forced.source.id;
		entry.tauntLocked = true;
		entry.tauntSourceName = forced.sourceName;
	}

	const decls = (draft.declarations[fighterId] ??= []);
	if (action === 'passer') {
		for (let i = 0; i < left; i++) decls.push(passDeclaration());
	} else {
		decls.push(entry);
	}
	if (actionsLeft(draft, fighterId) <= 0 || action === 'passer') {
		draft.turn += 1;
		advanceDeclarant(draft);
	}
	return draft;
}

/** Raccourci : le déclarant courant passe (legacy `passer`). */
export function passTurn(state: CombatState, fighterId: string): CombatState {
	return declareAction(state, fighterId, 'passer');
}

/**
 * Retire la dernière déclaration du déclarant courant (legacy cUndoLastDecl). Réservé au
 * combattant dont c'est le tour ; pour un combattant précédent, utiliser editDeclaration.
 */
export function undoLastDeclaration(state: CombatState, fighterId: string): CombatState {
	const f = findFighterOrThrow(state, fighterId);
	if (state.phase !== 'declaration' || state.order[state.turn] !== fighterId)
		throw new CombatError(
			'COMBAT_WRONG_DECLARANT',
			`Ce n'est pas le tour de déclaration de ${f.name}.`
		);
	const draft = cloneState(state);
	const decls = draft.declarations[fighterId];
	if (decls && decls.length) decls.pop();
	return draft;
}

/**
 * Revient sur la déclaration d'un combattant (legacy cEditDecl, « ✏ Modifier ») : vide ses
 * déclarations et celles de tous les suivants dans l'ordre, replace le tour sur lui, phase
 * « declaration ». Fonctionne aussi depuis la phase résolution.
 */
export function editDeclaration(state: CombatState, fighterId: string): CombatState {
	const f = findFighterOrThrow(state, fighterId);
	if (state.phase !== 'declaration' && state.phase !== 'resolution')
		throw new CombatError('COMBAT_NOT_ACTIVE', 'Aucune déclaration en cours.');
	const pos = state.order.indexOf(fighterId);
	if (pos < 0)
		throw new CombatError(
			'COMBAT_UNKNOWN_FIGHTER',
			"Ce combattant n'est pas dans l'ordre de déclaration."
		);
	const draft = cloneState(state);
	snapshotGesture(draft);
	for (let i = pos; i < draft.order.length; i++) draft.declarations[draft.order[i]!] = [];
	draft.turn = pos;
	draft.phase = 'declaration';
	pushLog(draft, 'info', `✏ Modification déclaration : ${f.name}`, f.id);
	// Si le combattant visé est KO, on glisse sans journal jusqu'au premier vivant (legacy laissait le tour bloqué).
	advanceDeclarant(draft, { log: false });
	return draft;
}
