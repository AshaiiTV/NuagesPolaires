import { assertFreshAccount, auditContextOf } from '../auth/context';
import { and, asc, desc, eq, exists, ilike, or, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { z } from 'zod';
import type { Db, Tx } from '../db';
import { beasts, beastZones, zones, combats, type Beast } from '../db/schema';
import { assertCan, can, type Actor } from '../permissions';
import { NpError } from '../http';
import {
	createBeastSchema,
	updateBeastSchema,
	beastCommandSchema,
	setBeastHiddenSchema,
	listBeastsSchema,
	referenceIdSchema,
	type BeastView,
	type BeastRowView,
	type BeastUsageView,
	type CreateBeastInput,
	type UpdateBeastInput,
	type BeastCommandInput,
	type ListBeastsInput
} from '$lib/schemas/beasts';
import { appendStaffLog } from './staff-log';
import { recordAudit } from './audit';
import { listObservations } from './observations';
import { behaviorColor } from '$lib/game/colors';

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
	const result = schema.safeParse(input);
	if (!result.success)
		throw new NpError('INVALID', result.error.issues[0]?.message ?? 'Entrée invalide.');
	return result.data;
}
function revision(value: number | undefined): number {
	if (value === undefined) throw NpError.versionRequired();
	return value;
}
async function checkedActor(tx: Tx, actor: Actor): Promise<Actor> {
	// 04 §10.7 : relire le compte dans la transaction avant toute écriture sensible.
	const account = await assertFreshAccount(tx, actor);
	if (!account || account.forcePasswordReset) throw NpError.unauthenticated();
	return assertCan(actor, 'beasts.manage');
}
async function log(tx: Tx, actor: Actor, action: string, beast: Beast) {
	await appendStaffLog(tx, {
		action,
		detail: `Créature : ${beast.name}.`,
		actor,
		target: beast.id
	});
	await recordAudit(tx, {
		source: 'beasts',
		...auditContextOf(actor),
		action,
		actor,
		details: { id: beast.id, revision: beast.revision }
	});
}
function rowView(row: Beast): BeastRowView {
	return {
		id: row.id,
		name: row.name,
		subtitle: row.subtitle,
		behavior: row.behavior,
		// Couleur hex de la table unique (INT-1) ; comportement inconnu ⇒ Neutre.
		behaviorColor: behaviorColor(row.behavior),
		level: row.level,
		revision: row.revision
	};
}
async function usage(db: Db, id: string): Promise<BeastUsageView> {
	// Audit 04 §1.4, legacy/assets/js/beast-admin.js:83-108 : compter les adversaires des récits.
	const result: BeastUsageView = { uses: 0, deaths: 0, lastAt: null, history: [] };
	const rows = await db
		.select({
			id: combats.id,
			name: combats.name,
			label: combats.label,
			at: combats.savedAt,
			state: combats.state
		})
		.from(combats)
		.where(eq(combats.status, 'termine'))
		.orderBy(desc(combats.savedAt));
	for (const row of rows) {
		const fighters = Array.isArray(row.state.fighters) ? row.state.fighters : [];
		let used = false;
		for (const raw of fighters) {
			if (!raw || typeof raw !== 'object') continue;
			const fighter = raw as Record<string, unknown>;
			if (fighter.type !== 'beast' || (fighter.beastId ?? fighter.bid ?? fighter.id) !== id)
				continue;
			used = true;
			result.uses += 1;
			if (typeof fighter.pvCur === 'number' && fighter.pvCur <= 0) result.deaths += 1;
		}
		if (used) {
			const at = row.at?.toISOString() ?? null;
			if (!result.lastAt && at) result.lastAt = at;
			if (result.history.length < 5)
				result.history.push({ id: row.id, name: row.name || row.label || 'Combat sans nom', at });
		}
	}
	return result;
}
export async function listBeasts(
	db: Db,
	actor: Actor | null,
	input: ListBeastsInput = {}
): Promise<BeastRowView[]> {
	const filters = parse(listBeastsSchema, input);
	const clauses = [];
	// 04 §4 et audit 04 §1.7 : exclusion avant projection, jamais de note dans une ligne publique.
	if (!can(actor?.role, 'beasts.read_reserved'))
		clauses.push(eq(beasts.hidden, false), eq(beasts.archived, false));
	if (filters.behavior) clauses.push(eq(beasts.behavior, filters.behavior));
	if (filters.zoneId)
		clauses.push(
			exists(
				db
					.select({ id: beastZones.beastId })
					.from(beastZones)
					.where(and(eq(beastZones.beastId, beasts.id), eq(beastZones.zoneId, filters.zoneId)))
			)
		);
	if (filters.search) {
		const pattern = `%${filters.search.replace(/[\\%_]/g, '\\$&')}%`;
		clauses.push(
			or(
				...[
					beasts.name,
					beasts.subtitle,
					beasts.description,
					beasts.strike,
					beasts.skill,
					beasts.drops,
					beasts.gem
				].map((column) => ilike(column, pattern)),
				ilike(sql`${beasts.level}::text`, pattern)
			)!
		);
	}
	const sort =
		filters.sort === 'level' || filters.sort === 'level_asc'
			? asc(beasts.level)
			: filters.sort === 'level_desc'
				? desc(beasts.level)
				: filters.sort === 'name_desc'
					? desc(beasts.name)
					: asc(beasts.name);
	const rows = await db
		.select()
		.from(beasts)
		.where(and(...clauses))
		.orderBy(sort, asc(beasts.name), asc(beasts.id));
	return rows.map(rowView);
}
export async function getBeast(db: Db, actor: Actor | null, input: string): Promise<BeastView> {
	const id = parse(referenceIdSchema, input);
	const reserved = can(actor?.role, 'beasts.read_reserved');
	const [row] = await db
		.select()
		.from(beasts)
		.where(
			and(
				eq(beasts.id, id),
				...(reserved ? [] : [eq(beasts.hidden, false), eq(beasts.archived, false)])
			)
		);
	if (!row) throw NpError.notFound('Créature introuvable.');
	const linkedZones = await db
		.select({
			id: zones.id,
			name: zones.name,
			emoji: zones.emoji,
			isDefault: zones.isDefault,
			position: zones.position,
			revision: zones.revision
		})
		.from(beastZones)
		.innerJoin(zones, eq(zones.id, beastZones.zoneId))
		.where(eq(beastZones.beastId, id))
		.orderBy(asc(zones.position), asc(zones.name));
	return {
		...rowView(row),
		pv: row.pv,
		ep: row.ep,
		strike: row.strike,
		skill: row.skill,
		drops: row.drops,
		gem: row.gem,
		description: row.description,
		imageUrl: row.imageUrl,
		quote: row.quote,
		zones: linkedZones,
		observations: await listObservations(db, id),
		reserved: reserved
			? {
					hidden: row.hidden,
					archived: row.archived,
					adminNote: row.adminNote,
					usage: await usage(db, id)
				}
			: null
	};
}
async function replaceZones(tx: Tx, id: string, zoneIds: string[]) {
	await tx.delete(beastZones).where(eq(beastZones.beastId, id));
	for (const zoneId of new Set(zoneIds)) {
		const [zone] = await tx.select({ id: zones.id }).from(zones).where(eq(zones.id, zoneId));
		if (!zone) throw new NpError('INVALID', 'Zone introuvable.');
		await tx.insert(beastZones).values({ beastId: id, zoneId });
	}
}
export async function createBeast(
	db: Db,
	actor: Actor | null,
	input: CreateBeastInput
): Promise<BeastView> {
	const present = assertCan(actor, 'beasts.manage');
	const { zones: zoneIds, ...data } = parse(createBeastSchema, input);
	return db.transaction(async (tx) => {
		const current = await checkedActor(tx, present);
		const [row] = await tx
			.insert(beasts)
			.values({ ...data, id: `b_${nanoid(16)}` })
			.returning();
		await replaceZones(tx, row.id, zoneIds);
		await log(tx, current, 'beast_created', row);
		return getBeast(tx, current, row.id);
	});
}
export async function updateBeast(
	db: Db,
	actor: Actor | null,
	input: UpdateBeastInput
): Promise<BeastView> {
	const present = assertCan(actor, 'beasts.manage');
	const { id, expectedRevision, zones: zoneIds, ...data } = parse(updateBeastSchema, input);
	const expected = revision(expectedRevision);
	return db.transaction(async (tx) => {
		const current = await checkedActor(tx, present);
		const [previous] = await tx.select().from(beasts).where(eq(beasts.id, id)).for('update');
		if (previous && (data.qtyMax ?? previous.qtyMax) < (data.qtyMin ?? previous.qtyMin))
			throw new NpError(
				'INVALID',
				'La quantité maximale doit être au moins égale à la quantité minimale.'
			);
		const [row] = await tx
			.update(beasts)
			.set({ ...data, revision: sql`${beasts.revision} + 1` })
			.where(and(eq(beasts.id, id), eq(beasts.revision, expected)))
			.returning();
		if (!row) throw NpError.versionConflict();
		if (zoneIds !== undefined) await replaceZones(tx, id, zoneIds);
		await log(tx, current, 'beast_updated', row);
		return getBeast(tx, current, id);
	});
}
export async function duplicateBeast(
	db: Db,
	actor: Actor | null,
	input: BeastCommandInput
): Promise<BeastView> {
	const present = assertCan(actor, 'beasts.manage');
	const { id, expectedRevision } = parse(beastCommandSchema, input);
	const expected = revision(expectedRevision);
	return db.transaction(async (tx) => {
		const current = await checkedActor(tx, present);
		const [source] = await tx
			.select()
			.from(beasts)
			.where(and(eq(beasts.id, id), eq(beasts.revision, expected)))
			.for('update');
		if (!source) throw NpError.versionConflict();
		// Audit 04 §2.7, legacy/assets/js/beast-admin.js:413-419 : visibilité conservée, archive remise à faux.
		const { createdAt: _createdAt, updatedAt: _updatedAt, ...data } = source;
		const [copy] = await tx
			.insert(beasts)
			.values({
				...data,
				id: `b_${nanoid(16)}`,
				name: `${source.name.slice(0, 72)} (copie)`,
				hidden: source.hidden,
				archived: false,
				revision: 1
			})
			.returning();
		const links = await tx.select().from(beastZones).where(eq(beastZones.beastId, id));
		await replaceZones(
			tx,
			copy.id,
			links.map((link) => link.zoneId)
		);
		await log(tx, current, 'beast_duplicated', copy);
		return getBeast(tx, current, copy.id);
	});
}
export async function setBeastHidden(
	db: Db,
	actor: Actor | null,
	input: BeastCommandInput & { hidden: boolean }
): Promise<BeastView> {
	assertCan(actor, 'beasts.manage');
	const data = parse(setBeastHiddenSchema, input);
	return updateBeast(db, actor, data);
}
export async function archiveBeast(
	db: Db,
	actor: Actor | null,
	input: BeastCommandInput
): Promise<BeastView> {
	assertCan(actor, 'beasts.manage');
	const data = parse(beastCommandSchema, input);
	return updateBeast(db, actor, { ...data, archived: true });
}
export async function restoreBeast(
	db: Db,
	actor: Actor | null,
	input: BeastCommandInput
): Promise<BeastView> {
	assertCan(actor, 'beasts.manage');
	const data = parse(beastCommandSchema, input);
	return updateBeast(db, actor, { ...data, archived: false });
}
