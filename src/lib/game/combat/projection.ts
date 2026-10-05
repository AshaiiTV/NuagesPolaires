import type { Resources } from '../types';
import type {
	CombatState,
	CombatLogEntry,
	CombatPhase,
	FighterType,
	StatusInstance
} from './types';
import { CombatError } from './types';

export type NarrativeCondition = 'LEGER' | 'GRAVE' | 'CRITIQUE';
export interface ProjectedFighter {
	id: string;
	name: string;
	type: FighterType;
	isSummon: boolean;
	statuses: StatusInstance[];
	resources?: Resources;
	condition?: NarrativeCondition;
}
export interface PlayerProjection {
	schemaVersion: 2;
	id: string;
	name: string;
	round: number;
	phase: CombatPhase;
	active: boolean;
	currentFighterId: string | null;
	self: ProjectedFighter | null;
	fighters: ProjectedFighter[];
	log: CombatLogEntry[];
}
/** Liste blanche ; aucune déclaration, note, historique undo, branche, drop ou taunt.
 * Les journaux importés libres sont privés par défaut. Sans chiffres adverses, les entrées
 * impliquant un adversaire sont reconstruites depuis kind/actorId/targetId : jamais par regex
 * sur un texte libre qui pourrait contenir une note, une ressource ou un coût réservé.
 */
export function projectForPlayer(
	state: CombatState,
	characterId: string,
	opts: { showEnemyNumbers: boolean }
): PlayerProjection {
	const own = state.fighters.find((f) => f.characterId === characterId && !f.isSummon);
	if (!own) throw new CombatError('COMBAT_INVALID_INPUT', "Cette Table n'est pas la tienne.");
	const camp = own?.type ?? 'player';
	const fighters = state.fighters.map((f): ProjectedFighter => {
		const p: ProjectedFighter = {
			id: f.id,
			name: f.name,
			type: f.type,
			isSummon: f.isSummon,
			statuses: structuredClone(f.statuses)
		};
		if (f.type === camp || opts.showEnemyNumbers)
			p.resources = {
				pvCur: f.pvCur,
				pvMax: f.pvMax,
				epCur: f.epCur,
				epMax: f.epMax,
				emCur: f.emCur,
				emMax: f.emMax
			};
		else {
			const pct = Math.floor((f.pvCur * 100) / Math.max(1, f.pvMax));
			p.condition = pct >= 66 ? 'LEGER' : pct >= 33 ? 'GRAVE' : 'CRITIQUE';
		}
		return p;
	});
	const log = state.log
		.filter((e) => !e.private)
		.slice(-30)
		.map((e): CombatLogEntry => {
			const actor = state.fighters.find((f) => f.id === e.actorId),
				target = state.fighters.find((f) => f.id === e.targetId);
			const enemy = (actor?.type !== camp && actor) || (target?.type !== camp && target);
			if (!opts.showEnemyNumbers && enemy) {
				const text =
					e.kind === 'damage'
						? `${actor?.name ?? 'Effet'} → ${target?.name ?? enemy.name} : impact`
						: `${enemy.name} : ${e.kind === 'turn' ? 'déclaration' : e.kind === 'heal' ? 'récupération' : 'événement'}`;
				return {
					n: e.n,
					round: e.round,
					kind: e.kind,
					text,
					actorId: e.actorId,
					targetId: e.targetId
				};
			}
			// Ne pas transmettre d'extensions inconnues venant de JSONB.
			return {
				n: e.n,
				round: e.round,
				kind: e.kind,
				text: e.text,
				actorId: e.actorId,
				targetId: e.targetId,
				...(e.field ? { field: e.field, oldValue: e.oldValue, newValue: e.newValue } : {})
			};
		});
	return {
		schemaVersion: 2,
		id: state.id,
		name: state.name,
		round: state.round,
		phase: state.phase,
		active: state.active,
		currentFighterId: state.phase === 'declaration' ? (state.order[state.turn] ?? null) : null,
		self: fighters.find((f) => f.id === own?.id) ?? null,
		fighters,
		log
	};
}
