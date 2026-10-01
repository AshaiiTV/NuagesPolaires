// Apparitions et transfert : 06-contrats B.6 ; audit 03 §10 ; 04 §3.7 et §10.10.
import { randomBytes } from 'node:crypto';
import { and, desc, eq, gt } from 'drizzle-orm';
import { z } from 'zod';
import type { Db, Tx } from '../db';
import {
	beasts,
	beastZones,
	spawnCounters,
	spawnRuns,
	spawnSettings,
	zones,
	sessions,
	type SpawnRun
} from '../db/schema';
import {
	assertFreshAccount,
	auditContextOf,
	requestContextOf,
	SESSION_CLOSED_MESSAGE
} from '../auth/context';
import { assertCan, type Actor } from '../permissions';
import { NpError } from '../http';
import {
	ALL_ZONES_VALUE,
	NO_ZONE_VALUE,
	behaviorLabel,
	drawEncounter,
	transferCombatName,
	type SpawnPack,
	type WeightDetail
} from '../../game/spawn';
import {
	drawSpawnSchema,
	spawnToTableSchema,
	type DrawSpawnInput,
	type SpawnRunView,
	type SpawnToTableInput,
	type SpawnTotalsView
} from '../../schemas/spawn';
import { appendStaffLog } from './staff-log';
import { recordAudit } from './audit';
import { createTable } from './combats';
import type { TableView } from '../../schemas/combats';

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
	const result = schema.safeParse(input);
	if (!result.success)
		throw new NpError(
			'INVALID',
			result.error.issues.find((issue) => issue.code === 'custom')?.message ??
				'Apparition invalide.'
		);
	return result.data;
}
// Audit 03 §10.1 : les packs hérités ont nom/niv/beh et parfois seulement id/qty.
const packSchema = z.preprocess(
	(value) => {
		if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
		const pack = value as Record<string, unknown>;
		return {
			...pack,
			id: pack.id ?? pack.beastId,
			name: pack.name ?? pack.nom ?? pack.id ?? pack.beastId,
			level: pack.level ?? pack.niv ?? 1,
			behavior: behaviorLabel(pack.behavior ?? pack.beh),
			hidden: pack.hidden ?? false,
			prob: pack.prob ?? 0,
			total: pack.total ?? 0,
			range: pack.range ?? { min: 1, max: pack.qty ?? 1 },
			baseWeight: pack.baseWeight ?? 1,
			weightNow: pack.weightNow ?? 1,
			catchup: pack.catchup ?? 1,
			fatigue: pack.fatigue ?? 1
		};
	},
	z.object({
		id: z.string(),
		name: z.string(),
		level: z.number(),
		behavior: z
			.enum(['Gibier', 'Passif', 'Neutre', 'Agressif', 'Très agressif', 'Boss'])
			.nullable(),
		hidden: z.boolean(),
		qty: z.number().int().positive(),
		prob: z.number(),
		total: z.number(),
		range: z.object({ min: z.number(), max: z.number() }),
		baseWeight: z.number(),
		weightNow: z.number(),
		catchup: z.number(),
		fatigue: z.number()
	})
);
const weightSchema = z.object({
	beastId: z.string(),
	weight: z.number(),
	base: z.number(),
	count: z.number(),
	avg: z.number(),
	catchup: z.number(),
	fatigue: z.number(),
	prob: z.number(),
	eligible: z.boolean()
});
const payloadSchema = z.preprocess(
	(value) => {
		if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
		const payload = value as Record<string, unknown>;
		return {
			...payload,
			zone: payload.zone ?? payload.zoneName,
			rolledBy: payload.rolledBy ?? payload.by ?? payload.actor
		};
	},
	z.object({
		packs: z.array(packSchema),
		weights: z.array(weightSchema).default([]),
		drawCount: z.number().int().positive().default(1),
		zone: z.string().optional(),
		rolledBy: z.string().optional()
	})
);
function view(row: SpawnRun): SpawnRunView {
	const payload = parse(payloadSchema, row.payload);
	return {
		id: row.id,
		at: row.generatedAt.toISOString(),
		zoneId: row.zoneId ?? payload.zone ?? null,
		packs: payload.packs,
		weights: payload.weights
	};
}
async function totals(db: Db | Tx): Promise<SpawnTotalsView> {
	const counters = await db.select().from(spawnCounters);
	const [settings] = await db.select().from(spawnSettings).where(eq(spawnSettings.id, 1));
	const counts: Record<string, number> = Object.fromEntries(
		counters.map((row) => [row.beastId, row.migratedDraws])
	);
	let totalDraws = settings?.migratedTotalDraws ?? 0;
	// 04 §10.10, audit 03 §10.5 : quantité par créature, un tirage par groupe.
	for (const row of await db.select().from(spawnRuns)) {
		const payload = parse(payloadSchema, row.payload);
		totalDraws += payload.drawCount;
		for (const pack of payload.packs) counts[pack.id] = (counts[pack.id] ?? 0) + pack.qty;
	}
	return { totals: counts, totalDraws };
}
async function checkActor(tx: Tx, actor: Actor): Promise<void> {
	const account = await assertFreshAccount(tx, actor);
	if (account.forcePasswordReset) throw NpError.unauthenticated(SESSION_CLOSED_MESSAGE);
	assertCan({ ...actor, role: account.role }, 'spawn.run');
	const context = requestContextOf(actor);
	if (context?.sessionId) {
		const [session] = await tx
			.select({ id: sessions.id })
			.from(sessions)
			.where(
				and(
					eq(sessions.id, context.sessionId),
					eq(sessions.accountId, account.id),
					eq(sessions.scope, 'full'),
					eq(sessions.sessionVersion, account.sessionVersion),
					gt(sessions.expiresAt, new Date())
				)
			)
			.for('share');
		if (!session) throw NpError.unauthenticated(SESSION_CLOSED_MESSAGE);
	}
}

export async function drawSpawn(
	db: Db,
	actor: Actor | null,
	input: DrawSpawnInput
): Promise<SpawnRunView> {
	const author = assertCan(actor, 'spawn.run');
	if (!input || typeof input !== 'object') throw new NpError('INVALID', 'Apparition invalide.');
	const { rng = Math.random, ...rest } = input;
	const data = parse(drawSpawnSchema, rest);
	if (typeof rng !== 'function') throw new NpError('INVALID', 'Le hasard est invalide.');
	return db.transaction(async (tx) => {
		await checkActor(tx, author);
		// Sérialiser les tirages : les poids sont calculés sur le dernier cumul confirmé.
		await tx.select().from(spawnSettings).where(eq(spawnSettings.id, 1)).for('update');
		const virtual = data.zoneId === NO_ZONE_VALUE || data.zoneId === ALL_ZONES_VALUE;
		const [zone] = virtual ? [] : await tx.select().from(zones).where(eq(zones.id, data.zoneId));
		if (!virtual && !zone) throw NpError.notFound('Zone introuvable.');
		const catalog = await tx.select().from(beasts);
		const links = await tx.select().from(beastZones);
		const pool = catalog
			.filter((b) => b.spawnWeight > 0)
			.map((b) => ({
				...b,
				zones: links.filter((link) => link.beastId === b.id).map((link) => link.zoneId)
			}));
		let history = await totals(tx);
		const packs: SpawnPack[] = [];
		let weights: WeightDetail[] = [];
		const checkedRng = () => {
			const value = rng();
			if (!Number.isFinite(value) || value < 0 || value >= 1)
				throw new NpError('INVALID', 'Le hasard doit être compris entre 0 inclus et 1 exclu.');
			return value;
		};
		for (let n = 0; n < data.count; n++) {
			const encounter = drawEncounter(data.zoneId, pool, history, checkedRng);
			if (!encounter) throw new NpError('INVALID', 'Aucun tirage possible.');
			packs.push(...encounter.packs);
			weights = encounter.weights;
			history = { totals: encounter.totals, totalDraws: history.totalDraws + 1 };
		}
		const [row] = await tx
			.insert(spawnRuns)
			.values({
				id: `spawn_${randomBytes(12).toString('base64url')}`,
				actorAccountId: author.accountId,
				zoneId: zone?.id ?? null,
				beastIds: [...new Set(packs.map((p) => p.id))],
				payload: {
					packs,
					weights,
					drawCount: data.count,
					zone: data.zoneId,
					zoneName: zone?.name ?? data.zoneId,
					rolledBy: author.pseudo
				}
			})
			.returning();
		await appendStaffLog(tx, {
			action: 'apparition_tiree',
			detail: zone?.name ?? data.zoneId,
			actor: author,
			target: row.id
		});
		await recordAudit(tx, {
			source: 'spawn',
			action: 'apparition_tiree',
			actor: author,
			details: { id: row.id, zoneId: data.zoneId, count: data.count, packs },
			...auditContextOf(author)
		});
		return view(row);
	});
}
export async function spawnHistory(db: Db, actor: Actor | null): Promise<SpawnRunView[]> {
	assertCan(actor, 'spawn.run');
	return (
		await db
			.select()
			.from(spawnRuns)
			.orderBy(desc(spawnRuns.generatedAt), desc(spawnRuns.id))
			.limit(24)
	).map(view);
}
export async function spawnTotals(db: Db, actor: Actor | null): Promise<SpawnTotalsView> {
	assertCan(actor, 'spawn.run');
	return totals(db);
}
export async function spawnToTable(
	db: Db,
	actor: Actor | null,
	input: SpawnToTableInput
): Promise<TableView> {
	const author = assertCan(actor, 'spawn.run');
	const data = parse(spawnToTableSchema, input);
	return db.transaction(async (tx) => {
		await checkActor(tx, author);
		const [run] = await tx.select().from(spawnRuns).where(eq(spawnRuns.id, data.runId));
		if (!run) throw NpError.notFound('Apparition introuvable.');
		const payload = parse(payloadSchema, run.payload);
		const [zone] = run.zoneId ? await tx.select().from(zones).where(eq(zones.id, run.zoneId)) : [];
		const grouped = new Map<string, number>();
		for (const pack of payload.packs)
			grouped.set(pack.id, Math.min(30, (grouped.get(pack.id) ?? 0) + pack.qty));
		const table = await createTable(tx, author, {
			name: transferCombatName(
				zone?.name ?? payload.zone ?? '',
				run.generatedAt,
				payload.rolledBy ?? author.pseudo
			),
			characterIds: data.characterIds,
			beasts: [...grouped].map(([beastId, qty]) => ({ beastId, qty }))
		});
		await appendStaffLog(tx, {
			action: 'apparition_transferee',
			detail: table.row.name,
			actor: author,
			target: run.id
		});
		await recordAudit(tx, {
			source: 'spawn',
			action: 'apparition_transferee',
			actor: author,
			details: { runId: run.id, combatId: table.row.id },
			...auditContextOf(author)
		});
		return table;
	});
}
