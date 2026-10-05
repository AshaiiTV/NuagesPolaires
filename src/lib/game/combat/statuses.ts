// Référentiel des statuts et leurs effets en combat.
// Sources : legacy STATUT_EFFECTS (main.js:12474-12488), cTickStatuts (12512-12521),
// cAddOrRefreshStatut (12108-12116), combatAddStatut (12491-12501), combatRemoveStatut (12503-12510),
// cGetFighterActionDebuff (11860-11869) ; audit 03 §7.1.

import type { CombatState, Fighter, StatusId, StatusInstance } from './types';
import { CombatError } from './types';
import { cloneState, findFighterOrThrow, pushLog, snapshotGesture } from './state';

export interface StatusEffect {
	id: StatusId;
	label: string;
	color: string;
	icon: string;
	/** Effet mécanique (les autres statuts sont narratifs). */
	mechanic: 'bleed' | 'poison' | 'stun' | 'entangle' | null;
	/** Définition à afficher sur la carte de règle. Durée par défaut : 2 rounds. */
	description: string;
}

/** Les 12 statuts, libellés/couleurs/icônes verbatim (legacy main.js:12474-12488). */
export const STATUS_EFFECTS: Readonly<Record<StatusId, StatusEffect>> = {
	saignement: { id: 'saignement', label: 'Saignement', color: '#c94a4a', icon: '🩸', mechanic: 'bleed', description: '−3 PV en fin de round, puis durée −1 ; dissipation à 0.' },
	empoisonne: { id: 'empoisonne', label: 'Empoisonné', color: '#77b36b', icon: '☠', mechanic: 'poison', description: '−max(1, ceil(PV max × 5 %)) en fin de round, puis durée −1 ; dissipation à 0.' },
	brulure: { id: 'brulure', label: 'Brûlure', color: '#d88a3d', icon: '🔥', mechanic: null, description: 'Statut narratif sans effet mécanique ; durée −1 en fin de round ; dissipation à 0.' },
	gel: { id: 'gel', label: 'Gel', color: '#7eb8d4', icon: '❄', mechanic: null, description: 'Statut narratif sans effet mécanique ; durée −1 en fin de round ; dissipation à 0.' },
	etourdi: { id: 'etourdi', label: 'Étourdi', color: '#d7b56d', icon: '💫', mechanic: 'stun', description: '−2 actions (minimum 1), sans cumul avec Entravé ; durée −1 par round.' },
	entrave: { id: 'entrave', label: 'Entravé', color: '#8aa0b6', icon: '⛓', mechanic: 'entangle', description: '−1 action, sans cumul avec Étourdi ; durée −1 par round.' },
	aveugle: { id: 'aveugle', label: 'Aveuglé', color: '#c7c4b8', icon: '◌', mechanic: null, description: 'Statut narratif sans effet mécanique ; durée −1 en fin de round ; dissipation à 0.' },
	silence: { id: 'silence', label: 'Silence', color: '#8f8aa8', icon: '🔇', mechanic: null, description: 'Statut narratif sans effet mécanique ; durée −1 en fin de round ; dissipation à 0.' },
	peur: { id: 'peur', label: 'Peur', color: '#9e7bc2', icon: '😨', mechanic: null, description: 'Statut narratif sans effet mécanique ; durée −1 en fin de round ; dissipation à 0.' },
	fragilise: { id: 'fragilise', label: 'Fragilisé', color: '#d77c7c', icon: '🩹', mechanic: null, description: 'Statut narratif sans effet mécanique ; durée −1 en fin de round ; dissipation à 0.' },
	renforce: { id: 'renforce', label: 'Renforcé', color: '#77b38f', icon: '🛡', mechanic: null, description: 'Statut narratif sans effet mécanique ; durée −1 en fin de round ; dissipation à 0.' },
	inspire: { id: 'inspire', label: 'Inspiré', color: '#d8c27a', icon: '✦', mechanic: null, description: 'Statut narratif sans effet mécanique ; durée −1 en fin de round ; dissipation à 0.' }
};

export const STATUS_IDS: readonly StatusId[] = Object.keys(STATUS_EFFECTS) as StatusId[];

/** Durée par défaut d'un statut posé par capacité ou manuellement (audit 03 §7.1). */
export const STATUS_DEFAULT_TOURS = 2;

/** Saignement : −3 PV par round (legacy cTickStatuts). */
export const BLEED_DAMAGE = 3;

/** Empoisonné : −max(1, ceil(pvMax × 5 %)) par round (legacy cTickStatuts). */
export function poisonDamage(pvMax: number): number {
	return Math.max(1, Math.ceil(pvMax * 0.05));
}

export function isStatusId(value: unknown): value is StatusId {
	return typeof value === 'string' && Object.prototype.hasOwnProperty.call(STATUS_EFFECTS, value);
}

export function statusLabel(id: StatusId): string {
	return STATUS_EFFECTS[id]?.label ?? id;
}

/**
 * Malus d'actions dû aux statuts : étourdi −2, entravé −1, on retient le max (pas la somme).
 * legacy cGetFighterActionDebuff, audit 03 §4.1.
 */
export function statusActionMalus(fighter: Pick<Fighter, 'statuses'>): number {
	let malus = 0;
	for (const st of fighter.statuses) {
		if (st.id === 'etourdi') malus = Math.max(malus, 2);
		else if (st.id === 'entrave') malus = Math.max(malus, 1);
	}
	return malus;
}

/**
 * Pose ou rafraîchit un statut posé par une capacité : durée rafraîchie au max (legacy cAddOrRefreshStatut).
 * Mutation sur un brouillon d'état déjà cloné.
 */
export function addOrRefreshStatus(draft: CombatState, fighter: Fighter, id: StatusId, tours = STATUS_DEFAULT_TOURS): void {
	const existing = fighter.statuses.find((s) => s.id === id);
	if (existing) existing.tours = Math.max(existing.tours, tours);
	else fighter.statuses.push({ id, tours });
	// legacy : kind « damage » pour saignement / empoisonné / brûlure, « info » sinon
	const kind = id === 'saignement' || id === 'empoisonne' || id === 'brulure' ? 'damage' : 'info';
	pushLog(draft, kind, `⚠ ${fighter.name} : ${statusLabel(id)} (${tours}T)`, null, fighter.id);
}

/**
 * Tick de fin de round pour un combattant vivant (legacy cTickStatuts) : dégâts, puis tours−1,
 * dissipation à 0. Mutation sur un brouillon.
 */
export function tickStatuses(draft: CombatState, fighter: Fighter): void {
	const wasAlive = fighter.pvCur > 0;
	const removeIdx: number[] = [];
	fighter.statuses.forEach((st, si) => {
		if (st.id === 'saignement') {
			fighter.pvCur = Math.max(0, fighter.pvCur - BLEED_DAMAGE);
			pushLog(draft, 'damage', `🩸 ${fighter.name} saigne −${BLEED_DAMAGE} PV (→${fighter.pvCur})`, null, fighter.id);
		} else if (st.id === 'empoisonne') {
			const d = poisonDamage(fighter.pvMax);
			fighter.pvCur = Math.max(0, fighter.pvCur - d);
			pushLog(draft, 'damage', `☠ ${fighter.name} empoisonné −${d} PV (→${fighter.pvCur})`, null, fighter.id);
		}
		st.tours -= 1;
		if (st.tours <= 0) {
			pushLog(draft, 'info', `✓ ${fighter.name} : ${statusLabel(st.id)} dissipé`, null, fighter.id);
			removeIdx.push(si);
		}
	});
	for (const si of removeIdx.reverse()) fighter.statuses.splice(si, 1);
	if (wasAlive && fighter.pvCur === 0) fighter.koCause = 'status';
}

/**
 * Pose manuelle par le MJ (legacy combatAddStatut) : durée minimum 1, défaut 2 ; un statut déjà présent
 * voit sa durée REMPLACÉE (pas le max). Journal « ⚠ X : Libellé (NT) », kind damage pour
 * saignement / empoisonné seulement.
 */
export function addStatus(state: CombatState, fighterId: string, id: StatusId, tours = STATUS_DEFAULT_TOURS): CombatState {
	if (!isStatusId(id)) throw new CombatError('COMBAT_INVALID_INPUT', 'Statut inconnu.');
	const draft = cloneState(state);
	const f = findFighterOrThrow(draft, fighterId);
	const t = Math.max(1, Math.floor(Number.isFinite(tours) ? tours : STATUS_DEFAULT_TOURS));
	const existing = f.statuses.find((s) => s.id === id);
	if (existing) existing.tours = t;
	else f.statuses.push({ id, tours: t });
	const kind = id === 'saignement' || id === 'empoisonne' ? 'damage' : 'info';
	pushLog(draft, kind, `⚠ ${f.name} : ${statusLabel(id)} (${t}T)`, null, f.id);
	return draft;
}

/** Retrait manuel par le MJ (legacy combatRemoveStatut) : « ✓ X : Libellé retiré ». */
export function removeStatus(state: CombatState, fighterId: string, id: StatusId): CombatState {
	const draft = cloneState(state);
	const f = findFighterOrThrow(draft, fighterId);
	const idx = f.statuses.findIndex((s) => s.id === id);
	if (idx < 0) return draft;
	snapshotGesture(draft);
	pushLog(draft, 'info', `✓ ${f.name} : ${statusLabel(id)} retiré`, null, f.id);
	f.statuses.splice(idx, 1);
	return draft;
}

/** Projection lisible d'un statut (pour l'interface et La Table). */
export function describeStatus(st: StatusInstance): { id: StatusId; label: string; icon: string; color: string; tours: number } {
	const def = STATUS_EFFECTS[st.id];
	return { id: st.id, label: def.label, icon: def.icon, color: def.color, tours: st.tours };
}
