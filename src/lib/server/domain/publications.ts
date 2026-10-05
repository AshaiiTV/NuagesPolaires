// Extraits choisis et rayables : 06-contrats B.6 ; 03-vision §5.1, §5.7, §9.4 ; 04 §3.12.
import { randomBytes } from 'node:crypto';
import { and, asc, desc, eq, gt, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Db, Tx } from '../db';
import {
	accounts,
	beastObservations,
	beasts,
	combats,
	events,
	publicationBeasts,
	publications,
	sessions
} from '../db/schema';
import { assertCan, type Actor } from '../permissions';
import { NpError } from '../http';
import {
	assertFreshAccount,
	auditContextOf,
	requestContextOf,
	SESSION_CLOSED_MESSAGE
} from '../auth/context';
import {
	publishExtractSchema,
	strikePublicationSchema,
	type HomeLeaf,
	type PublicationView,
	type PublishExtractInput,
	type StrikePublicationInput
} from '../../schemas/publications';
import { signature } from '../../ui/tampons';
import { dateCourte, jour, heureRonde } from '../../ui/dates';
import { appendStaffLog } from './staff-log';
import { recordAudit } from './audit';

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
	const result = schema.safeParse(input);
	if (!result.success)
		throw new NpError(
			'INVALID',
			result.error.issues.find((issue) => issue.code === 'custom')?.message ?? 'Extrait invalide.'
		);
	return result.data;
}
async function checkActor(tx: Tx, actor: Actor): Promise<void> {
	// 04 §10.7 : le rôle et l'état du compte sont relus sous verrou avant la mutation.
	const account = await assertFreshAccount(tx, actor);
	if (account.forcePasswordReset) throw NpError.unauthenticated(SESSION_CLOSED_MESSAGE);
	assertCan({ ...actor, role: account.role }, 'combat.run');
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

export async function publishExtract(
	db: Db,
	actor: Actor | null,
	input: PublishExtractInput
): Promise<PublicationView> {
	const author = assertCan(actor, 'combat.run');
	const data = parse(publishExtractSchema, input);
	return db.transaction(async (tx) => {
		await checkActor(tx, author);
		if (data.combatId) {
			const [combat] = await tx
				.select({ id: combats.id })
				.from(combats)
				.where(eq(combats.id, data.combatId));
			if (!combat) throw NpError.notFound();
		}
		const beastIds = [...new Set(data.beastIds)];
		// Vision §5.7 : une publication peut aussi témoigner d'une rencontre hors combat.
		for (const beastId of beastIds.sort()) {
			const [beast] = await tx
				.select({ id: beasts.id })
				.from(beasts)
				.where(eq(beasts.id, beastId))
				.for('share');
			if (!beast) throw NpError.notFound('Créature introuvable.');
		}
		const id = `pub_${randomBytes(12).toString('base64url')}`;
		const at = new Date();
		await tx.insert(publications).values({
			id,
			combatId: data.combatId ?? null,
			text: data.text,
			onHome: data.onHome,
			stampedBy: author.accountId,
			stampedAt: at
		});
		for (const beastId of beastIds) {
			await tx.insert(publicationBeasts).values({ publicationId: id, beastId });
			await tx.insert(beastObservations).values({
				id: `obs_${randomBytes(12).toString('base64url')}`,
				beastId,
				text: data.text,
				authorAccountId: author.accountId,
				status: 'validated',
				validatedBy: author.accountId,
				validatedAt: at,
				combatId: data.combatId ?? null,
				publicationId: id
			});
		}
		await appendStaffLog(tx, {
			action: 'extrait_publie',
			detail: data.text,
			actor: author,
			target: id
		});
		await recordAudit(tx, {
			source: 'publications',
			action: 'extrait_publie',
			actor: author,
			details: {
				id,
				combatId: data.combatId ?? null,
				beastIds,
				onHome: data.onHome,
				text: data.text
			},
			...auditContextOf(author)
		});
		return {
			id,
			combatId: data.combatId ?? null,
			text: data.text,
			onHome: data.onHome,
			beastIds,
			at: at.toISOString(),
			struck: false
		};
	});
}

export async function strikePublication(
	db: Db,
	actor: Actor | null,
	input: StrikePublicationInput
): Promise<void> {
	const author = assertCan(actor, 'combat.run');
	const data = parse(strikePublicationSchema, input);
	await db.transaction(async (tx) => {
		await checkActor(tx, author);
		// Pas de revision sur publications : commande idempotente de rature (06 B.6).
		const [row] = await tx
			.update(publications)
			.set({ struck: true, struckAt: new Date(), updatedAt: new Date() })
			.where(and(eq(publications.id, data.id), eq(publications.struck, false)))
			.returning();
		if (!row) {
			const [existing] = await tx
				.select({ id: publications.id })
				.from(publications)
				.where(eq(publications.id, data.id));
			if (!existing) throw NpError.notFound();
			return;
		}
		// L'observation issue de l'extrait cesse également d'être publique ; le texte reste conservé.
		await tx
			.update(beastObservations)
			.set({
				status: 'rejected',
				revision: sql`${beastObservations.revision} + 1`,
				updatedAt: new Date()
			})
			.where(eq(beastObservations.publicationId, data.id));
		await appendStaffLog(tx, {
			action: 'publication_rayee',
			detail: data.motif,
			actor: author,
			target: data.id
		});
		await recordAudit(tx, {
			source: 'publications',
			action: 'publication_rayee',
			actor: author,
			details: data,
			...auditContextOf(author)
		});
	});
}

/** Extraits du combat, y compris les ratures, réservés au MJ et à l’administrateur. */
export async function listPublications(
	db: Db,
	actor: Actor | null,
	input: { combatId: string }
): Promise<
	Array<
		PublicationView & {
			creatures: { id: string; name: string }[];
			tampon: { role: string | null; name: string | null; at: string };
			texte: string;
			raye: boolean;
		}
	>
> {
	assertCan(actor, 'combat.run');
	const combatId = parse(z.string().min(1).max(200), input.combatId);
	const rows = await db
		.select({ publication: publications, pseudo: accounts.pseudo, role: accounts.role })
		.from(publications)
		.leftJoin(accounts, eq(publications.stampedBy, accounts.id))
		.where(eq(publications.combatId, combatId))
		.orderBy(desc(publications.stampedAt), desc(publications.id));
	const result = [];
	for (const { publication: p, pseudo, role } of rows) {
		const creatures = await db
			.select({ id: beasts.id, name: beasts.name })
			.from(publicationBeasts)
			.innerJoin(beasts, eq(publicationBeasts.beastId, beasts.id))
			.where(eq(publicationBeasts.publicationId, p.id))
			.orderBy(asc(beasts.id));
		result.push({
			id: p.id,
			combatId: p.combatId,
			text: p.text,
			texte: p.text,
			onHome: p.onHome,
			beastIds: creatures.map((b) => b.id),
			creatures,
			at: p.stampedAt.toISOString(),
			tampon: { role, name: pseudo, at: p.stampedAt.toISOString() },
			struck: p.struck,
			struckAt: p.struckAt?.toISOString() ?? null,
			raye: p.struck
		});
	}
	return result;
}

export async function listHomeLeaves(db: Db): Promise<HomeLeaf[]> {
	const now = new Date();
	const [published] = await db
		.select({
			publication: publications,
			title: combats.label,
			name: combats.name,
			pseudo: accounts.pseudo,
			role: accounts.role
		})
		.from(publications)
		.leftJoin(combats, eq(publications.combatId, combats.id))
		.leftJoin(accounts, eq(publications.stampedBy, accounts.id))
		.where(and(eq(publications.onHome, true), eq(publications.struck, false)))
		.orderBy(desc(publications.stampedAt), desc(publications.id))
		.limit(1);
	const [past] = await db
		.select()
		.from(events)
		.where(and(eq(events.hidden, false), lt(events.startsAt, now)))
		.orderBy(desc(events.startsAt), desc(events.id))
		.limit(1);
	const [next] = await db
		.select()
		.from(events)
		.where(and(eq(events.hidden, false), gt(events.startsAt, now)))
		.orderBy(asc(events.startsAt), asc(events.id))
		.limit(1);
	const leaves: HomeLeaf[] = [];
	const date = (value: Date) => dateCourte(value);
	if (published) {
		const p = published.publication;
		leaves.push({
			id: p.id,
			kind: 'recit',
			margin: date(p.stampedAt),
			title: published.title || published.name || 'Récit',
			excerpt: p.text,
			stamp: signature(published.role, published.pseudo, p.stampedAt),
			href: null
		});
	}
	for (const [row, kind] of [
		[past, 'passe'],
		[next, 'a-venir']
	] as const) {
		if (row?.startsAt) {
			const [organisateur] = row.createdBy
				? await db
						.select({ pseudo: accounts.pseudo, role: accounts.role })
						.from(accounts)
						.where(eq(accounts.id, row.createdBy))
				: [];
			leaves.push({
				id: row.id,
				kind,
				margin: date(row.startsAt),
				title: row.title,
				excerpt:
					row.description ||
					(kind === 'passe'
						? 'Rendez-vous passé · ' + row.title
						: 'Prochain rendez-vous · ' + jour(row.startsAt) + ' ' + heureRonde(row.startsAt)),
				stamp: signature(
					organisateur?.role ?? 'mj',
					organisateur?.pseudo ?? row.createdByLabel,
					row.createdAt ?? row.startsAt
				),
				href: null
			});
		}
	}
	return leaves;
}
