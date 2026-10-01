import { assertFreshAccount, auditContextOf } from '../auth/context';
import { and, asc, eq, sql } from 'drizzle-orm';
import type { z } from 'zod';
import type { Db } from '../db';
import { zones } from '../db/schema';
import { assertCan, type Actor } from '../permissions';
import { NpError } from '../http';
import { oathSlug } from '$lib/game/oaths';
import { createZoneSchema, renameZoneSchema, type ZoneView } from '$lib/schemas/beasts';
import { appendStaffLog } from './staff-log';
import { recordAudit } from './audit';
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
	const result = schema.safeParse(input);
	if (!result.success)
		throw new NpError('INVALID', result.error.issues[0]?.message ?? 'Entrée invalide.');
	return result.data;
}
export async function listZones(db: Db, _actor: Actor | null): Promise<ZoneView[]> {
	return db
		.select({
			id: zones.id,
			name: zones.name,
			emoji: zones.emoji,
			isDefault: zones.isDefault,
			position: zones.position,
			revision: zones.revision
		})
		.from(zones)
		.orderBy(asc(zones.position), asc(zones.name));
}
export async function createZone(
	db: Db,
	actor: Actor | null,
	input: z.input<typeof createZoneSchema>
): Promise<ZoneView> {
	const present = assertCan(actor, 'beasts.manage');
	const data = parse(createZoneSchema, input);
	const id = oathSlug(data.name);
	if (!id) throw new NpError('INVALID', 'Nom de zone requis.');
	return db.transaction(async (tx) => {
		const account = await assertFreshAccount(tx, present);
		if (!account || account.forcePasswordReset) throw NpError.unauthenticated();
		const current = assertCan(present, 'beasts.manage');
		const [row] = await tx
			.insert(zones)
			.values({ ...data, id })
			.onConflictDoNothing()
			.returning();
		if (!row) throw new NpError('INVALID', 'Cette zone existe déjà.');
		await appendStaffLog(tx, {
			action: 'zone_created',
			detail: `Zone : ${row.name}.`,
			actor: current,
			target: id
		});
		await recordAudit(tx, {
			source: 'zones',
			...auditContextOf(current),
			action: 'zone_created',
			actor: current,
			details: { id }
		});
		return {
			id: row.id,
			name: row.name,
			emoji: row.emoji,
			isDefault: row.isDefault,
			position: row.position,
			revision: row.revision
		};
	});
}
export async function renameZone(
	db: Db,
	actor: Actor | null,
	input: z.input<typeof renameZoneSchema>
): Promise<ZoneView> {
	const present = assertCan(actor, 'beasts.manage');
	const data = parse(renameZoneSchema, input);
	if (data.expectedRevision === undefined) throw NpError.versionRequired();
	return db.transaction(async (tx) => {
		const account = await assertFreshAccount(tx, present);
		if (!account || account.forcePasswordReset) throw NpError.unauthenticated();
		const current = assertCan(present, 'beasts.manage');
		// 04 §10.4 : l'identifiant reste stable ; les liens beast_zones suivent le renommage.
		const [row] = await tx
			.update(zones)
			.set({ name: data.name, revision: sql`${zones.revision} + 1` })
			.where(and(eq(zones.id, data.id), eq(zones.revision, data.expectedRevision!)))
			.returning();
		if (!row) throw NpError.versionConflict();
		await appendStaffLog(tx, {
			action: 'zone_renamed',
			detail: `Zone : ${row.name}.`,
			actor: current,
			target: row.id
		});
		await recordAudit(tx, {
			source: 'zones',
			...auditContextOf(current),
			action: 'zone_renamed',
			actor: current,
			details: { id: row.id, name: row.name }
		});
		return {
			id: row.id,
			name: row.name,
			emoji: row.emoji,
			isDefault: row.isDefault,
			position: row.position,
			revision: row.revision
		};
	});
}
