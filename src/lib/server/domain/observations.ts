import { assertFreshAccount, auditContextOf } from '../auth/context';
import { and, asc, eq, isNull, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';
import type { z } from 'zod';
import type { Db } from '../db';
import { accounts, beasts, beastObservations, publications } from '../db/schema';
import { assertCan, can, requireActor, stampRoleLabel, type Actor } from '../permissions';
import { NpError } from '../http';
import {
	proposeObservationSchema,
	reviewObservationSchema,
	type ProposeObservationInput,
	type ReviewObservationInput,
	type ObservationView,
	type PendingObservationView
} from '$lib/schemas/observations';
import { referenceIdSchema } from '$lib/schemas/beasts';
import { appendStaffLog } from './staff-log';
import { recordAudit } from './audit';
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
	const result = schema.safeParse(input);
	if (!result.success)
		throw new NpError('INVALID', result.error.issues[0]?.message ?? 'Entrée invalide.');
	return result.data;
}
const validator = alias(accounts, 'observation_validator');
const author = alias(accounts, 'observation_author');
function projection(row: {
	observation: typeof beastObservations.$inferSelect;
	name: string | null;
	role: 'joueur' | 'mj' | 'designer' | 'admin' | null;
}): ObservationView {
	return {
		id: row.observation.id,
		beastId: row.observation.beastId,
		text: row.observation.text,
		at: (row.observation.validatedAt ?? row.observation.createdAt).toISOString(),
		stamp: row.name && row.role ? { name: row.name, role: stampRoleLabel(row.role) } : null,
		combatId: row.observation.combatId,
		revision: row.observation.revision
	};
}
export async function listObservations(db: Db, input: string): Promise<ObservationView[]> {
	const beastId = parse(referenceIdSchema, input);
	// 04 §3.12 : une publication rayée ne continue pas à publier son observation.
	const rows = await db
		.select({ observation: beastObservations, name: validator.pseudo, role: validator.role })
		.from(beastObservations)
		.leftJoin(validator, eq(validator.id, beastObservations.validatedBy))
		.leftJoin(publications, eq(publications.id, beastObservations.publicationId))
		.where(
			and(
				eq(beastObservations.beastId, beastId),
				eq(beastObservations.status, 'validated'),
				or(isNull(beastObservations.publicationId), eq(publications.struck, false))
			)
		)
		.orderBy(asc(beastObservations.validatedAt), asc(beastObservations.id));
	return rows.map(projection);
}
export async function proposeObservation(
	db: Db,
	actor: Actor | null,
	input: ProposeObservationInput
): Promise<ObservationView> {
	const present = requireActor(actor);
	const data = parse(proposeObservationSchema, input);
	return db.transaction(async (tx) => {
		const account = await assertFreshAccount(tx, present);
		if (!account || account.forcePasswordReset) throw NpError.unauthenticated();
		const current = present;
		const [beast] = await tx.select().from(beasts).where(eq(beasts.id, data.beastId)).for('share');
		if (!beast || (!can(current.role, 'beasts.read_reserved') && (beast.hidden || beast.archived)))
			throw NpError.notFound('Créature introuvable.');
		const [row] = await tx
			.insert(beastObservations)
			.values({ ...data, id: `o_${nanoid(16)}`, authorAccountId: current.accountId })
			.returning();
		await appendStaffLog(tx, {
			action: 'observation_proposed',
			detail: data.text,
			actor: current,
			target: row.id
		});
		await recordAudit(tx, {
			source: 'observations',
			...auditContextOf(current),
			action: 'observation_proposed',
			actor: current,
			details: { id: row.id, beastId: data.beastId }
		});
		return projection({ observation: row, name: null, role: null });
	});
}
export async function listPendingObservations(
	db: Db,
	actor: Actor | null
): Promise<PendingObservationView[]> {
	assertCan(actor, 'observations.validate');
	const rows = await db
		.select({
			observation: beastObservations,
			name: validator.pseudo,
			role: validator.role,
			author: author.pseudo
		})
		.from(beastObservations)
		.leftJoin(validator, eq(validator.id, beastObservations.validatedBy))
		.leftJoin(author, eq(author.id, beastObservations.authorAccountId))
		.where(eq(beastObservations.status, 'proposed'))
		.orderBy(asc(beastObservations.createdAt), asc(beastObservations.id));
	return rows.map((row) => ({
		...projection(row),
		author: row.author,
		proposedAt: row.observation.createdAt.toISOString()
	}));
}
async function review(
	db: Db,
	actor: Actor | null,
	input: ReviewObservationInput,
	status: 'validated' | 'rejected'
): Promise<ObservationView> {
	const present = assertCan(actor, 'observations.validate');
	const data = parse(reviewObservationSchema, input);
	if (data.expectedRevision === undefined) throw NpError.versionRequired();
	return db.transaction(async (tx) => {
		const account = await assertFreshAccount(tx, present);
		if (!account || account.forcePasswordReset) throw NpError.unauthenticated();
		const current = assertCan(present, 'observations.validate');
		const [row] = await tx
			.update(beastObservations)
			.set({
				status,
				validatedBy: current.accountId,
				validatedAt: new Date(),
				revision: sql`${beastObservations.revision} + 1`
			})
			.where(
				and(
					eq(beastObservations.id, data.id),
					eq(beastObservations.revision, data.expectedRevision!),
					eq(beastObservations.status, 'proposed')
				)
			)
			.returning();
		if (!row) throw NpError.versionConflict();
		// Schéma livré sans colonne motif : conservation dans les deux journaux, même transaction.
		await appendStaffLog(tx, {
			action: `observation_${status}`,
			detail: data.motif,
			actor: current,
			target: row.id
		});
		await recordAudit(tx, {
			source: 'observations',
			...auditContextOf(current),
			action: `observation_${status}`,
			actor: current,
			details: {
				id: row.id,
				beastId: row.beastId,
				motif: data.motif,
				oldValue: 'proposed',
				newValue: status
			}
		});
		return projection({ observation: row, name: current.pseudo, role: current.role });
	});
}
export async function validateObservation(
	db: Db,
	actor: Actor | null,
	input: ReviewObservationInput
): Promise<ObservationView> {
	return review(db, actor, input, 'validated');
}
export async function rejectObservation(
	db: Db,
	actor: Actor | null,
	input: ReviewObservationInput
): Promise<ObservationView> {
	return review(db, actor, input, 'rejected');
}
