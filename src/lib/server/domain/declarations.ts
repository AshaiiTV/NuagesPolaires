// Déclarations du joueur : « Kael déclare −8 EP (Esquive). » (06-contrats §B.3 ; 04 §3.12 ;
// 03-vision §5.3, §6.6, §9.6, §12.4).
//
// Une déclaration est une annotation de marge : elle ne modifie JAMAIS les ressources. Annulable
// 10 s (`cancel_until`, colonne générée), puis seulement rayable. Un MJ ou un administrateur la
// REPORTE d'un tampon (le delta est appliqué, borné à [0, max], conséquence tamponnée, révision du
// personnage) ou la RAYE avec motif. Non reportée après 7 jours ⇒ `non_reportee` (entretien).
import { and, asc, eq, lt, sql, type SQL } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { Db } from '$lib/server/db';
import {
	characters,
	combatParticipants,
	combats,
	declarations,
	sceneParticipants,
	scenes,
	type Declaration
} from '$lib/server/db/schema';
import { NpError } from '$lib/server/http';
import { assertCan, requireOwnCharacter, type Actor } from '$lib/server/permissions';
import { appendStaffLog } from './staff-log';
import { recordAudit } from './audit';
import {
	buildSheet,
	insertHistory,
	loadCharacter,
	parseInput,
	requireRevision,
	stampAuthor,
	updateCharacterChecked
} from './characters';
import {
	DECLARATION_EXPIRY_DAYS,
	declarationIdSchema,
	declarationText,
	declareSchema,
	reportDeclarationSchema,
	strikeDeclarationSchema,
	type DeclarationIdInput,
	type DeclarationView,
	type DeclareInput,
	type ReportDeclarationInput,
	type StrikeDeclarationInput
} from '$lib/schemas/declarations';
import type { SheetView } from '$lib/schemas/characters';

function declarationView(d: Declaration, characterName: string): DeclarationView {
	return {
		id: d.id,
		characterId: d.characterId,
		text: declarationText(characterName, d.resource, d.delta, d.word),
		resource: d.resource,
		delta: d.delta,
		word: d.word,
		status: d.status,
		at: d.createdAt.toISOString(),
		cancelUntil: d.cancelUntil.toISOString(),
		sceneId: d.sceneId ?? null,
		combatId: d.combatId ?? null,
		motif: d.motif,
		reportedAt: d.reportedAt ? d.reportedAt.toISOString() : null
	};
}

async function listWith(db: Db, where: SQL | undefined): Promise<DeclarationView[]> {
	const rows = await db
		.select({ d: declarations, name: characters.name })
		.from(declarations)
		.innerJoin(characters, eq(characters.id, declarations.characterId))
		.where(where)
		.orderBy(asc(declarations.createdAt), asc(declarations.id));
	return rows.map((r) => declarationView(r.d, r.name));
}

async function viewById(db: Db, id: string): Promise<DeclarationView> {
	const [view] = await listWith(db, eq(declarations.id, id));
	if (!view) throw NpError.notFound('Déclaration introuvable.');
	return view;
}

/**
 * Déclarer (joueur relié) : ressource pv | ep | em, delta entier non nul, mot obligatoire. Une
 * scène ou une Table citée doit compter ce personnage parmi ses participants.
 */
export async function declare(
	db: Db,
	actor: Actor | null,
	input: DeclareInput
): Promise<DeclarationView> {
	const { characterId } = requireOwnCharacter(actor);
	const data = parseInput(declareSchema, input);
	const c = await loadCharacter(db, characterId);
	if (data.sceneId) {
		const [scene] = await db
			.select({ status: scenes.status })
			.from(sceneParticipants)
			.innerJoin(scenes, eq(scenes.id, sceneParticipants.sceneId))
			.where(
				and(eq(sceneParticipants.sceneId, data.sceneId), eq(sceneParticipants.characterId, c.id))
			);
		if (!scene) throw NpError.notFound("Cette scène n'est pas la tienne.");
		if (scene.status !== 'ouverte') throw new NpError('SCENE_CLOSED', 'La scène est close.', 409);
	}
	if (data.combatId) {
		const [table] = await db
			.select({ closedAt: combats.closedAt })
			.from(combatParticipants)
			.innerJoin(combats, eq(combats.id, combatParticipants.combatId))
			.where(
				and(
					eq(combatParticipants.combatId, data.combatId),
					eq(combatParticipants.characterId, c.id)
				)
			);
		if (!table) throw NpError.notFound("Cette Table n'est pas la tienne.");
		if (table.closedAt) throw new NpError('TABLE_CLOSED', 'La Table est repliée.', 409);
	}
	const [row] = await db
		.insert(declarations)
		.values({
			id: `d_${nanoid(16)}`,
			characterId: c.id,
			sceneId: data.sceneId ?? null,
			combatId: data.combatId ?? null,
			resource: data.resource,
			delta: data.delta,
			word: data.word,
			status: 'proposee'
		})
		.returning();
	return declarationView(row, c.name);
}

/**
 * Explique pourquoi une déclaration du joueur n'a pas changé d'état : 404 si elle n'est pas la
 * sienne, 409 si elle n'est plus en attente ou si la fenêtre d'annulation est passée.
 */
async function ownRefusal(db: Db, id: string, characterId: string): Promise<never> {
	const [row] = await db
		.select()
		.from(declarations)
		.where(and(eq(declarations.id, id), eq(declarations.characterId, characterId)));
	if (!row) throw NpError.notFound('Déclaration introuvable.');
	if (row.status !== 'proposee') {
		throw new NpError('DECLARATION_CLOSED', "Cette déclaration n'est plus en attente.", 409);
	}
	throw new NpError(
		'CANCEL_EXPIRED',
		"Le délai d'annulation est passé : tu peux encore la rayer.",
		409
	);
}

/** Annuler sa déclaration dans les 10 s (contrôle de l'heure par la base, dans le WHERE). */
export async function cancelDeclaration(
	db: Db,
	actor: Actor | null,
	input: DeclarationIdInput
): Promise<DeclarationView> {
	const { characterId } = requireOwnCharacter(actor);
	const data = parseInput(declarationIdSchema, input);
	const updated = await db
		.update(declarations)
		.set({ status: 'annulee' })
		.where(
			and(
				eq(declarations.id, data.id),
				eq(declarations.characterId, characterId),
				eq(declarations.status, 'proposee'),
				sql`${declarations.cancelUntil} >= now()`
			)
		)
		.returning({ id: declarations.id });
	if (updated.length === 0) return ownRefusal(db, data.id, characterId);
	return viewById(db, data.id);
}

/** Rayer sa déclaration encore en attente (après la fenêtre d'annulation) ; la rature reste lisible. */
export async function strikeOwnDeclaration(
	db: Db,
	actor: Actor | null,
	input: DeclarationIdInput
): Promise<DeclarationView> {
	const { characterId } = requireOwnCharacter(actor);
	const data = parseInput(declarationIdSchema, input);
	const updated = await db
		.update(declarations)
		.set({ status: 'rayee' })
		.where(
			and(
				eq(declarations.id, data.id),
				eq(declarations.characterId, characterId),
				eq(declarations.status, 'proposee')
			)
		)
		.returning({ id: declarations.id });
	if (updated.length === 0) {
		const [row] = await db
			.select({ id: declarations.id })
			.from(declarations)
			.where(and(eq(declarations.id, data.id), eq(declarations.characterId, characterId)));
		if (!row) throw NpError.notFound('Déclaration introuvable.');
		throw new NpError('DECLARATION_CLOSED', "Cette déclaration n'est plus en attente.", 409);
	}
	return viewById(db, data.id);
}

/** Mes déclarations en attente d'un MJ (dans l'ordre d'écriture). */
export async function listOwnPending(db: Db, actor: Actor | null): Promise<DeclarationView[]> {
	const { characterId } = requireOwnCharacter(actor);
	return listWith(
		db,
		and(eq(declarations.characterId, characterId), eq(declarations.status, 'proposee'))
	);
}

/** Déclarations en attente d'un personnage (MJ, admin : « Reporter les déclarations »). */
export async function listPendingFor(
	db: Db,
	actor: Actor | null,
	characterId: string
): Promise<DeclarationView[]> {
	assertCan(actor, 'characters.stamp');
	await loadCharacter(db, characterId);
	return listWith(
		db,
		and(eq(declarations.characterId, characterId), eq(declarations.status, 'proposee'))
	);
}

const RESOURCE_COLUMNS = {
	pv: { cur: 'pvCur', max: 'pvMax' },
	ep: { cur: 'epCur', max: 'epMax' },
	em: { cur: 'emCur', max: 'emMax' }
} as const;

/**
 * Reporter une déclaration (MJ, admin) : UNE transaction — delta appliqué borné à [0, max] sous
 * contrôle de la révision du PERSONNAGE, ligne tamponnée (motif, `declaration_id`), statut
 * « reportée ».
 */
export async function reportDeclaration(
	db: Db,
	actor: Actor | null,
	input: ReportDeclarationInput
): Promise<{ declaration: DeclarationView; sheet: SheetView }> {
	const who = assertCan(actor, 'characters.stamp');
	requireRevision(input);
	const data = parseInput(reportDeclarationSchema, input);
	return db.transaction(async (tx) => {
		const [decl] = await tx
			.select()
			.from(declarations)
			.where(eq(declarations.id, data.id))
			.for('update');
		if (!decl) throw NpError.notFound('Déclaration introuvable.');
		if (decl.status !== 'proposee') {
			throw new NpError('DECLARATION_CLOSED', "Cette déclaration n'attend plus de report.", 409);
		}
		const c = await loadCharacter(tx, decl.characterId, { lock: true });
		const cols = RESOURCE_COLUMNS[decl.resource];
		const old = c[cols.cur];
		const max = c[cols.max];
		const next = Math.min(max, Math.max(0, old + decl.delta));
		const set =
			decl.resource === 'pv'
				? { pvCur: next }
				: decl.resource === 'ep'
					? { epCur: next }
					: { emCur: next };
		await updateCharacterChecked(tx, c.id, data.expectedRevision, set);
		const now = new Date();
		await tx
			.update(declarations)
			.set({ status: 'reportee', reportedBy: who.accountId, reportedAt: now, motif: data.motif })
			.where(and(eq(declarations.id, decl.id), eq(declarations.status, 'proposee')));
		const label = decl.resource.toUpperCase();
		const sign = decl.delta < 0 ? '−' : '+';
		await insertHistory(tx, c.id, [
			{
				type: 'stat',
				text: `${sign}${Math.abs(decl.delta)} ${label} (${decl.word}) : ${old} → ${next}.`,
				field: decl.resource,
				oldValue: String(old),
				newValue: String(next),
				motif: data.motif,
				declarationId: decl.id,
				combatId: decl.combatId ?? null,
				author: stampAuthor(who)
			}
		]);
		await appendStaffLog(tx, {
			action: 'declaration_reportee',
			detail: `[${c.name}] ${declarationText(c.name, decl.resource, decl.delta, decl.word)} ${label} : ${old} → ${next} — ${data.motif}`,
			actor: who,
			target: c.name
		});
		await recordAudit(tx, {
			source: 'declarations',
			action: 'declaration_report',
			actor: who,
			details: {
				declarationId: decl.id,
				characterId: c.id,
				resource: decl.resource,
				old,
				new: next
			}
		});
		return {
			declaration: await viewById(tx, decl.id),
			sheet: await buildSheet(tx, await loadCharacter(tx, c.id))
		};
	});
}

/** Rayer une déclaration (MJ, admin) avec motif ; les ressources ne bougent pas. */
export async function strikeDeclaration(
	db: Db,
	actor: Actor | null,
	input: StrikeDeclarationInput
): Promise<DeclarationView> {
	const who = assertCan(actor, 'characters.stamp');
	const data = parseInput(strikeDeclarationSchema, input);
	return db.transaction(async (tx) => {
		const [decl] = await tx
			.select({ d: declarations, name: characters.name })
			.from(declarations)
			.innerJoin(characters, eq(characters.id, declarations.characterId))
			.where(eq(declarations.id, data.id))
			.for('update');
		if (!decl) throw NpError.notFound('Déclaration introuvable.');
		const updated = await tx
			.update(declarations)
			.set({
				status: 'rayee',
				reportedBy: who.accountId,
				reportedAt: new Date(),
				motif: data.motif
			})
			.where(and(eq(declarations.id, data.id), eq(declarations.status, 'proposee')))
			.returning({ id: declarations.id });
		if (updated.length === 0) {
			throw new NpError('DECLARATION_CLOSED', "Cette déclaration n'attend plus de report.", 409);
		}
		await appendStaffLog(tx, {
			action: 'declaration_rayee',
			detail: `[${decl.name}] ${declarationText(decl.name, decl.d.resource, decl.d.delta, decl.d.word)} rayée — ${data.motif}`,
			actor: who,
			target: decl.name
		});
		await recordAudit(tx, {
			source: 'declarations',
			action: 'declaration_strike',
			actor: who,
			details: { declarationId: decl.d.id, characterId: decl.d.characterId }
		});
		return viewById(tx, data.id);
	});
}

/**
 * Entretien : une déclaration « proposée » depuis plus de 7 jours passe en rature automatique
 * « non reportée », visible par le joueur (03-vision §12.4). Renvoie le nombre de lignes touchées.
 */
export async function expireDeclarations(db: Db): Promise<{ expired: number }> {
	const rows = await db
		.update(declarations)
		.set({ status: 'non_reportee' })
		.where(
			and(
				eq(declarations.status, 'proposee'),
				lt(
					declarations.createdAt,
					sql`now() - interval '${sql.raw(String(DECLARATION_EXPIRY_DAYS))} days'`
				)
			)
		)
		.returning({ id: declarations.id });
	return { expired: rows.length };
}
