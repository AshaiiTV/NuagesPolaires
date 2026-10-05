import { z } from 'zod';
import type {
	CombatState,
	CombatAction,
	Fighter,
	CombatLogEntry,
	PlayerProjection
} from '../game/combat';
import { extractSchema } from './publications';
import type { DeclarationView } from './declarations';

const id = z.string().min(1).max(200);
const integer = z.number().int().min(0).max(2147483647);
export const statusSchema = z
	.object({
		id: z.enum([
			'saignement',
			'empoisonne',
			'brulure',
			'gel',
			'etourdi',
			'entrave',
			'aveugle',
			'silence',
			'peur',
			'fragilise',
			'renforce',
			'inspire'
		]),
		tours: integer
	})
	.strict();
const fighterSchema = z
	.object({
		id,
		type: z.enum(['player', 'beast']),
		name: z.string().max(200),
		baseName: z.string(),
		level: integer.min(1),
		characterId: id.nullable(),
		beastId: id.nullable(),
		oathName: z.string().nullable(),
		isSummon: z.boolean(),
		ownerCharacterId: id.nullable(),
		summonName: z.string().nullable(),
		actionsMax: integer.nullable(),
		autoInterpose: z.boolean(),
		rangeType: z.enum(['cac', 'distance']).nullable(),
		dmgBase: integer,
		oathDamage: integer.nullable().optional(),
		strike: z.string().nullable(),
		skill: z.string().nullable(),
		behavior: z.string().nullable(),
		gem: z.string().nullable(),
		imageUrl: z.string().nullable(),
		branch: z
			.object({
				name: z.string(),
				tiers: z.array(
					z.object({ niv: integer, nom: z.string(), cout: z.string(), desc: z.string() })
				)
			})
			.nullable(),
		pvCur: integer,
		pvMax: integer.min(1),
		epCur: integer,
		epMax: integer,
		emCur: integer,
		emMax: integer,
		statuses: z.array(statusSchema).max(64),
		koCause: z.enum(['attack', 'status']).optional(),
		pvMaxBonus: integer,
		briseArmureBonus: integer,
		defenseTaxNext: integer,
		noFreeRepositionRound: integer.nullable(),
		claymorePosture: z
			.object({
				damage: integer,
				epCost: integer,
				blockEpDrain: integer,
				noReposition: z.boolean(),
				defenseChipPct: z.number(),
				desc: z.string(),
				defenseExtraEp: integer.optional()
			})
			.nullable(),
		taunt: z.object({
			sourceId: id,
			sourceName: z.string(),
			permanent: z.boolean(),
			untilRound: integer
		}),
		elemState: z
			.object({ last: z.enum(['fire', 'ice', 'thunder', 'water']).nullable(), count: integer })
			.nullable()
	})
	.extend({
		taunt: z
			.object({ sourceId: id, sourceName: z.string(), permanent: z.boolean(), untilRound: integer })
			.nullable()
	})
	.strict() satisfies z.ZodType<Fighter>;
const logSchema = z
	.object({
		n: integer,
		round: integer,
		kind: z.enum(['info', 'round', 'turn', 'damage', 'heal', 'spell', 'summon']),
		text: z.string().max(20000),
		actorId: id.nullable(),
		targetId: id.nullable(),
		private: z.boolean().optional(),
		field: z.enum(['pv', 'ep', 'em']).optional(),
		oldValue: z.number().optional(),
		newValue: z.number().optional()
	})
	.strict();
// Audit 03 §2.5 : forme complète du moteur, sans extensions JSON privées ou champs forgés.
const actionSchema = z
	.object({
		action: z.enum([
			'frappe',
			'pugilat',
			'esquive',
			'bloquer',
			'parer',
			'subit',
			'deplacer',
			'capacite',
			'soin',
			'frappe_dechainees',
			'passer',
			'annule'
		]),
		kind: z.enum(['attack', 'defense', 'utility', 'heal', 'buff', 'summon']),
		label: z.string(),
		target: id.nullable(),
		healTarget: id.nullable(),
		consumeActions: integer,
		value: z.number(),
		epCost: integer,
		emCost: integer,
		abilityName: z.string().nullable(),
		hits: integer,
		aoe: z.boolean(),
		aoeIncludesAllies: z.boolean(),
		undefendable: z.boolean(),
		onlyDodge: z.boolean(),
		healAmt: integer,
		actsSacr: integer,
		epDrain: integer,
		selfEpGain: integer,
		comboSelfEpGain: integer,
		comboEpDrain: integer,
		statusToTarget: statusSchema.shape.id.nullable(),
		briseArmure: integer,
		comboDamage: integer,
		elementKey: z.enum(['fire', 'ice', 'thunder', 'water']).nullable(),
		selfPvMaxBonus: integer,
		perEnemyPvMax: integer,
		provoke: z.boolean(),
		repulse: z.boolean(),
		disarm: z.boolean(),
		summon: z
			.object({
				name: z.string(),
				pv: integer.min(1),
				dmg: integer,
				actCost: integer,
				autoInterpose: z.boolean(),
				rangeType: z.enum(['cac', 'distance']),
				ownerCharacterId: id
			})
			.nullable(),
		claymorePosture: fighterSchema.shape.claymorePosture,
		defenseExtraEp: integer,
		defenseChipPct: z.number(),
		guardBonusDmg: integer,
		blockBreakLine: z.boolean(),
		noReposition: z.boolean(),
		nextDefenseTax: integer,
		blockEpDrain: integer,
		blockPct: z.number(),
		consumeClaymorePosture: z.boolean(),
		tauntLocked: z.boolean(),
		tauntSourceName: z.string().nullable(),
		dmgStatic: z.boolean()
	})
	.strict() satisfies z.ZodType<CombatAction>;
const stateBody = z
	.object({
		version: z.literal(2),
		schemaVersion: z.literal(2),
		id,
		name: z.string().max(200),
		notes: z.string().max(20000),
		ownerAccountId: id.nullable(),
		active: z.boolean(),
		ended: z.boolean(),
		startedAt: z.number().nullable(),
		endedAt: z.number().nullable(),
		round: integer.min(1),
		initiative: id.nullable(),
		fighters: z.array(fighterSchema).max(80),
		order: z.array(id).max(80),
		turn: integer,
		phase: z.enum(['idle', 'declaration', 'resolution']),
		declarations: z.record(z.string(), z.array(actionSchema)),
		log: z.array(logSchema).max(10000),
		drops: z
			.array(
				z.object({
					id,
					fighterId: id,
					beastId: id.nullable(),
					beastName: z.string(),
					round: integer,
					roll: z.number().int().min(1).max(100).nullable(),
					gem: z.string().nullable(),
					assignedTo: id.nullable(),
					assignedName: z.string().nullable()
				})
			)
			.max(1000),
		usedSummons: z.array(z.string()).max(1000),
		seq: integer
	})
	.strict();
export const combatStateSchema = stateBody
	.extend({
		history: z.array(stateBody).max(30),
		gestureHistory: z
			.array(stateBody.extend({ history: z.array(stateBody).max(30) }))
			.max(30)
			.optional()
	})
	.refine((state) => {
		const ids = state.fighters.map((f) => f.id);
		const players = state.fighters
			.filter((f) => f.type === 'player' && !f.isSummon)
			.map((f) => f.characterId);
		return (
			new Set(ids).size === ids.length &&
			players.every(Boolean) &&
			new Set(players).size === players.length &&
			state.order.every((id) => ids.includes(id))
		);
	}, 'Les combattants ou l’ordre de la Table sont invalides.') satisfies z.ZodType<CombatState>;
export const createTableSchema = z
	.object({
		name: z.string().trim().min(1).max(200),
		discordUrl: z.string().max(2000).default(''),
		characterIds: z.array(id).max(80),
		beasts: z
			.array(z.object({ beastId: id, qty: z.number().int().min(1).max(30) }).strict())
			.max(80)
	})
	.strict();
export const saveTableSchema = z
	.object({
		id,
		state: combatStateSchema,
		expectedRevision: integer.min(1).optional(),
		reason: z.enum(['manual', 'round', 'auto'])
	})
	.strict();
export const tableFlagSchema = z
	.object({ id, expectedRevision: integer.min(1).optional(), value: z.boolean() })
	.strict();
export const listTablesSchema = z
	.object({ status: z.enum(['preparation', 'en_cours', 'termine']).optional() })
	.strict();
export const listRecitsSchema = z
	.object({
		page: z.number().int().min(1).default(1),
		search: z.string().trim().max(200).optional()
	})
	.strict();
export const closeTableSchema = z
	.object({
		id,
		expectedRevision: integer.min(1).optional(),
		consequences: z
			.array(
				z
					.object({
						characterId: id,
						expectedRevision: integer.min(1).optional(),
						pv: integer,
						ep: integer,
						em: integer,
						statuses: z.array(statusSchema.shape.id).max(64),
						xp: integer.max(1000000),
						drops: z
							.array(
								z
									.object({
										name: z.string().trim().min(1).max(200),
										beastName: z.string().trim().min(1).max(200),
										qty: integer.min(1).max(999).default(1),
										category: z.string().max(80).default('Gemme')
									})
									.strict()
							)
							.max(100),
						motif: z.string().trim().min(1).max(2000)
					})
					.strict()
			)
			.max(80),
		recit: z
			.object({ title: z.string().trim().min(1).max(200), visibleToParticipants: z.boolean() })
			.strict(),
		extract: extractSchema.optional()
	})
	.strict();
export type CreateTableInput = z.input<typeof createTableSchema>;
export type SaveTableInput = z.input<typeof saveTableSchema>;
export type CloseTableInput = z.input<typeof closeTableSchema>;
export type TableFlagInput = z.input<typeof tableFlagSchema>;
export type TableRowView = {
	id: string;
	name: string;
	label: string;
	status: 'preparation' | 'en_cours' | 'termine';
	round: number;
	phase: string;
	discordUrl: string;
	showEnemyNumbers: boolean;
	visibleToParticipants: boolean;
	savedAt: string | null;
	at: string;
	sceneId: string | null;
	revision: number;
};
export type PendingDeclarationView = DeclarationView;
export type TableView = {
	state: CombatState;
	row: TableRowView;
	pendingDeclarations: PendingDeclarationView[];
	revision: number;
};
export type PlayerTableView = {
	status: 'preparation' | 'en_cours' | 'termine';
	closedAt: string | null;
	recitId: string | null;
	projection: PlayerProjection;
	name: string;
	discordUrl: string;
	revision: number;
	at: string;
};
export type RecitRowView = {
	id: string;
	title: string;
	name: string;
	at: string;
	round: number;
	visibleToParticipants: boolean;
	revision: number;
};
export type RecitView = RecitRowView & {
	log: CombatLogEntry[];
	discordUrl: string;
	participants: string[];
	notes?: string;
};
