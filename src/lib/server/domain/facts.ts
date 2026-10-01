import { assertFreshAccount } from '$lib/server/auth/context';
// Faits validés : dettes, promesses, alliances, conséquences narratives, observations
// (06-contrats §B.3 ; 04 §3.12 `validated_facts` ; 03-vision §5.5).
//
// Le joueur relié propose ; un MJ ou un administrateur tamponne (valide, refuse, règle) avec un motif
// et sous contrôle `expectedRevision`. Un fait réglé n'est jamais supprimé : il reste lisible, rayé
// (« réglée · tamponné le … »).
import { and, desc, eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { Db } from '$lib/server/db';
import { accounts, characters, validatedFacts, type ValidatedFact } from '$lib/server/db/schema';
import { NpError } from '$lib/server/http';
import {
	assertCan,
	can,
	requireActor,
	requireOwnCharacter,
	type Actor
} from '$lib/server/permissions';
import { appendStaffLog } from './staff-log';
import { recordAudit } from './audit';
import {
	characterIsActive,
	loadCharacter,
	parseInput,
	requireRevision,
	stampView
} from './characters';
import {
	FACT_KIND_LABELS,
	listFactsSchema,
	proposeFactSchema,
	rejectFactSchema,
	settleFactSchema,
	validateFactSchema,
	type FactStatusKey,
	type FactView,
	type ListFactsInput,
	type ProposeFactInput,
	type RejectFactInput,
	type SettleFactInput,
	type ValidateFactInput
} from '$lib/schemas/facts';

type FactRow = {
	fact: ValidatedFact;
	stamperPseudo: string | null;
	stamperRole: string | null;
};

function factView({ fact, stamperPseudo, stamperRole }: FactRow): FactView {
	const stampAt = fact.settledAt ?? fact.validatedAt;
	return {
		id: fact.id,
		characterId: fact.characterId,
		kind: fact.kind,
		counterpart: fact.counterpart,
		text: fact.text,
		status: fact.status,
		witness: fact.witness,
		proposedAt: fact.createdAt.toISOString(),
		stamp: stampAt
			? {
					...stampView(stamperRole, stamperPseudo ?? ''),
					at: stampAt.toISOString(),
					motif: fact.motif
				}
			: null,
		settledAt: fact.settledAt ? fact.settledAt.toISOString() : null,
		revision: fact.revision
	};
}

function selectFacts(db: Db) {
	return db
		.select({ fact: validatedFacts, stamperPseudo: accounts.pseudo, stamperRole: accounts.role })
		.from(validatedFacts)
		.innerJoin(characters, eq(characters.id, validatedFacts.characterId))
		.leftJoin(accounts, eq(accounts.id, validatedFacts.validatedBy));
}

async function factById(db: Db, id: string): Promise<FactView> {
	const [row] = await selectFacts(db).where(eq(validatedFacts.id, id));
	if (!row) throw NpError.notFound('Fait introuvable.');
	return factView(row);
}

/**
 * Faits d'un personnage (le propriétaire, ou un MJ / administrateur). Sans `characterId` : ceux du
 * personnage relié ; pour un MJ ou un administrateur sans personnage, la file des faits proposés.
 */
export async function listFacts(
	db: Db,
	actor: Actor | null,
	input: ListFactsInput = {}
): Promise<FactView[]> {
	const present = requireActor(actor);
	const data = parseInput(listFactsSchema, input);
	const characterId = data.characterId ?? present.characterId;
	if (!characterId) {
		assertCan(present, 'facts.validate');
		const rows = await selectFacts(db)
			.where(and(eq(validatedFacts.status, 'proposed'), characterIsActive))
			.orderBy(desc(validatedFacts.createdAt), desc(validatedFacts.id));
		return rows.map(factView);
	}
	if (present.characterId !== characterId && !can(present.role, 'facts.validate')) {
		throw NpError.forbidden();
	}
	await loadCharacter(db, characterId);
	const rows = await selectFacts(db)
		.where(eq(validatedFacts.characterId, characterId))
		.orderBy(desc(validatedFacts.createdAt), desc(validatedFacts.id));
	return rows.map(factView);
}

/** Proposer un fait (joueur relié) : il attend un tampon. */
export async function proposeFact(
	db: Db,
	actor: Actor | null,
	input: ProposeFactInput
): Promise<FactView> {
	const { actor: who, characterId } = requireOwnCharacter(actor);
	const data = parseInput(proposeFactSchema, input);
	return db.transaction(async (tx) => {
		await assertFreshAccount(tx, who);
		await loadCharacter(tx, characterId);
		const id = `f_${nanoid(16)}`;
		await tx.insert(validatedFacts).values({
			id,
			characterId,
			kind: data.kind,
			counterpart: data.counterpart ?? '',
			text: data.text,
			witness: data.witness ?? '',
			status: 'proposed',
			proposedBy: who.accountId
		});
		await recordAudit(tx, {
			source: 'facts',
			action: 'fact_propose',
			actor: who,
			details: { factId: id, characterId, kind: data.kind }
		});
		return factById(tx, id);
	});
}

type Transition = {
	from: FactStatusKey;
	to: FactStatusKey;
	staffAction: string;
	verb: string;
	refusal: string;
};

/**
 * Change l'état d'un fait sous tampon : `UPDATE … WHERE id AND revision AND status = from` ;
 * zéro ligne ⇒ 409 VERSION_CONFLICT (révision périmée) ou FACT_STATE (état déjà changé).
 */
async function stampFact(
	db: Db,
	who: Actor,
	data: { id: string; motif: string; expectedRevision: number; witness?: string },
	t: Transition
): Promise<FactView> {
	return db.transaction(async (tx) => {
		await assertFreshAccount(tx, who);
		const [current] = await tx
			.select()
			.from(validatedFacts)
			.innerJoin(characters, eq(characters.id, validatedFacts.characterId))
			.where(and(eq(validatedFacts.id, data.id), characterIsActive))
			.for('update');
		if (!current) throw NpError.notFound('Fait introuvable.');
		const fact = current.validated_facts;
		const now = new Date();
		const updated = await tx
			.update(validatedFacts)
			.set({
				status: t.to,
				motif: data.motif,
				validatedBy: who.accountId,
				...(t.to === 'settled' ? { settledAt: now } : { validatedAt: now }),
				...(data.witness !== undefined ? { witness: data.witness } : {}),
				revision: sql`${validatedFacts.revision} + 1`
			})
			.where(
				and(
					eq(validatedFacts.id, data.id),
					eq(validatedFacts.revision, data.expectedRevision),
					eq(validatedFacts.status, t.from)
				)
			)
			.returning({ id: validatedFacts.id });
		if (updated.length === 0) {
			if (fact.revision !== data.expectedRevision) throw NpError.versionConflict();
			throw new NpError('FACT_STATE', t.refusal, 409);
		}
		const label = `${FACT_KIND_LABELS[fact.kind]}${fact.counterpart ? ` ${fact.counterpart}` : ''}`;
		await appendStaffLog(tx, {
			action: t.staffAction,
			detail: `[${current.characters.name}] ${label} ${t.verb} — ${data.motif}`,
			actor: who,
			target: current.characters.name
		});
		await recordAudit(tx, {
			source: 'facts',
			action: t.staffAction,
			actor: who,
			details: { factId: fact.id, characterId: fact.characterId, from: t.from, to: t.to }
		});
		return factById(tx, fact.id);
	});
}

/** Tamponner un fait proposé (MJ, admin), avec motif et témoin facultatif. */
export async function validateFact(
	db: Db,
	actor: Actor | null,
	input: ValidateFactInput
): Promise<FactView> {
	const who = assertCan(actor, 'facts.validate');
	requireRevision(input);
	const data = parseInput(validateFactSchema, input);
	return stampFact(db, who, data, {
		from: 'proposed',
		to: 'validated',
		staffAction: 'fait_valide',
		verb: 'validé',
		refusal: "Ce fait n'attend plus de tampon."
	});
}

/** Refuser un fait proposé (MJ, admin), avec motif. */
export async function rejectFact(
	db: Db,
	actor: Actor | null,
	input: RejectFactInput
): Promise<FactView> {
	const who = assertCan(actor, 'facts.validate');
	requireRevision(input);
	const data = parseInput(rejectFactSchema, input);
	return stampFact(db, who, data, {
		from: 'proposed',
		to: 'rejected',
		staffAction: 'fait_refuse',
		verb: 'refusé',
		refusal: "Ce fait n'attend plus de tampon."
	});
}

/** Régler un fait validé (dette payée, promesse tenue…) : il reste lisible, rayé. */
export async function settleFact(
	db: Db,
	actor: Actor | null,
	input: SettleFactInput
): Promise<FactView> {
	const who = assertCan(actor, 'facts.validate');
	requireRevision(input);
	const data = parseInput(settleFactSchema, input);
	return stampFact(db, who, data, {
		from: 'validated',
		to: 'settled',
		staffAction: 'fait_regle',
		verb: 'réglé',
		refusal: 'Seul un fait validé peut être réglé.'
	});
}
