import type { CombatState, CombatOutcome, Rng } from './types';
import { CombatError } from './types';
import { cloneState, findFighterOrThrow, newDropId, pushLog } from './state';
import { previewXp } from '../progression';

/** legacy/assets/js/main.js:12557-12562. Première plage correspondante gagne. */
export function parseGemTable(text: string): Array<{ min: number; max: number; gem: string }> {
	return text.split(/\s*\/\s*/).flatMap((part) => {
		const m = part.match(/(\d+)[–-](\d+)\s*:\s*(.+)/);
		return m ? [{ min: Number(m[1]), max: Number(m[2]), gem: m[3]!.trim() }] : [];
	});
}
export function rollDrop(state: CombatState, fighterId: string, rng: Rng): CombatState {
	const s = cloneState(state), f = findFighterOrThrow(s, fighterId);
	if (f.type !== 'beast' || f.pvCur > 0 || !f.gem) throw new CombatError('COMBAT_DROP_UNAVAILABLE', 'Aucun drop disponible.');
	let drop = s.drops.find((d) => d.fighterId === fighterId);
	if (drop?.roll !== null && drop?.roll !== undefined) throw new CombatError('COMBAT_DROP_ALREADY_ROLLED', 'D100 déjà lancé.');
	const value = rng();
	if (!Number.isFinite(value) || value < 0 || value >= 1) throw new CombatError('COMBAT_INVALID_INPUT', 'Le hasard doit être dans [0, 1).');
	if (!drop) {
		drop = { id: newDropId(s), fighterId, beastId: f.beastId, beastName: f.name, round: s.round, roll: null, gem: null, assignedTo: null, assignedName: null };
		s.drops.push(drop);
	}
	drop.roll = Math.floor(value * 100) + 1;
	drop.gem = parseGemTable(f.gem).find((r) => r.min <= drop!.roll! && drop!.roll! <= r.max)?.gem ?? 'Aucune';
	pushLog(s, 'info', `🎲 Drop ${f.name} : ${drop.roll} → ${drop.gem}`, null, f.id);
	return s;
}
export function assignDrop(state: CombatState, dropId: string, characterId: string): CombatState {
	const s = cloneState(state), drop = s.drops.find((d) => d.id === dropId);
	if (!drop) throw new CombatError('COMBAT_DROP_NOT_FOUND', 'Drop introuvable.');
	if (drop.roll === null || !drop.gem || drop.gem === 'Aucune') throw new CombatError('COMBAT_DROP_NOT_ROLLED', 'Aucune gemme à attribuer.');
	if (drop.assignedTo) throw new CombatError('COMBAT_DROP_ALREADY_ASSIGNED', 'Drop déjà attribué.');
	const f = s.fighters.find((f) => f.characterId === characterId && f.type === 'player' && !f.isSummon);
	if (!f) throw new CombatError('COMBAT_INVALID_INPUT', 'Personnage absent du combat.');
	drop.assignedTo = characterId; drop.assignedName = f.name;
	pushLog(s, 'info', `💎 ${drop.gem} → ${f.name} (drop différé)`, null, f.id);
	return s;
}

export interface EndCombatOptions {
	/** Pourcentage explicite par personnage ; défaut 100. Le moteur ne devine pas la participation. */
	participation?: Record<string, number>;
	now?: number;
}
/** Propose les conséquences ; leur application atomique aux fiches appartient au domaine.
 * XP = somme des ceil(niveau × 10 × participation/100) des créatures KO.
 * Aucun level-up ici : il serait susceptible de restaurer les ressources finales.
 */
export function endCombat(state: CombatState, opts: EndCombatOptions = {}): { state: CombatState; outcomes: CombatOutcome[] } {
	if (state.ended) throw new CombatError('COMBAT_ALREADY_ENDED', 'Ce combat est clos.');
	const s = cloneState(state);
	const outcomes = s.fighters.filter((f) => f.type === 'player' && !f.isSummon && f.characterId).map((f): CombatOutcome => {
		const supplied = opts.participation?.[f.characterId!] ?? 100;
		if (!Number.isFinite(supplied) || supplied < 0 || supplied > 100) throw new CombatError('COMBAT_INVALID_INPUT', 'Participation invalide (0–100 %).');
		const participation = supplied;
		const xpGain = s.fighters.filter((b) => b.type === 'beast' && !b.isSummon && b.pvCur <= 0).reduce((n, b) => n + Math.ceil(b.level * 10 * participation / 100), 0);
		const pvMax = f.pvMax - f.pvMaxBonus, pvCur = Math.min(f.pvCur, pvMax);
		return {
			characterId: f.characterId!, fighterId: f.id, name: f.name,
			pvCur, pvMax, epCur: f.epCur, epMax: f.epMax, emCur: f.emCur, emMax: f.emMax,
			ko: pvCur <= 0, statuses: f.statuses.map((st) => st.id), xpGain, participation,
			drops: s.drops.filter((d) => d.assignedTo === f.characterId && d.roll !== null && d.gem && d.gem !== 'Aucune').map((d) => ({ gem: d.gem!, beastName: d.beastName, roll: d.roll! })),
			historyText: `⚔ ${s.name} — ${s.round}R · PV:${f.pvCur}/${f.pvMax} EP:${f.epCur}/${f.epMax}`
		};
	});
	pushLog(s, 'round', `🏁 Combat terminé — Round ${s.round}`);
	s.active = false; s.phase = 'idle'; s.ended = true; s.endedAt = opts.now ?? 0;
	return { state: s, outcomes };
}
/** Aperçu facultatif utilisant la progression commune, sans modifier les outcomes. */
export function previewCombatXp(character: { level: number; xp: number }, outcome: Pick<CombatOutcome, 'xpGain'>) {
	return previewXp(character, outcome.xpGain);
}
