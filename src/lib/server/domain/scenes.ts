// Scènes : ce qui est encore ouvert (06-contrats §B.4 ; 04-architecture §3.9, §3.12, §5 ;
// 03-vision §5.3, §12.3).
//
// Qui fait quoi (03-vision §12.3, 04 §5 dernière ligne) :
//   - un joueur ouvre une scène pour lui-même (titre + lien du salon) ; un MJ ou un administrateur
//     pour plusieurs personnages ;
//   - « où nous en sommes » et la question ouverte : MJ, administrateur, ou participant ;
//   - épingles et marque-page de scène : le participant, pour son personnage ;
//   - clore : MJ, administrateur, ou le participant qui a ouvert la scène ;
//   - une scène sans activité depuis 14 jours se referme d'elle-même (`autoCloseScenes`, entretien),
//     ce qui s'écrit dans l'historique des participants (« refermée d'elle-même · date »).
// `channel` = nom du salon tiré du titre saisi (aucun appel à Discord).
import { and, asc, desc, eq, inArray, isNull, lt, ne, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { z } from 'zod';
import type { Db, Tx } from '$lib/server/db';
import {
	characterHistory,
	characters,
	combatParticipants,
	combats,
	sceneParticipants,
	scenePins,
	scenes,
	type Scene
} from '$lib/server/db/schema';
import { NpError } from '$lib/server/http';
import { can, requireActor, requireOwnCharacter, type Actor } from '$lib/server/permissions';
import {
	SCENE_IDLE_DAYS,
	SCENE_PINS_MAX,
	channelFromTitle,
	closeSceneSchema,
	openSceneSchema,
	pinSchema,
	setOpenQuestionSchema,
	setSummarySchema,
	unpinSchema,
	type AutoCloseResult,
	type CloseSceneInput,
	type OpenSceneInput,
	type PinInput,
	type SceneContextView,
	type SceneTableContext,
	type SceneView,
	type SetOpenQuestionInput,
	type SetSummaryInput,
	type UnpinInput
} from '$lib/schemas/scenes';
import { dateLongue } from '$lib/ui/dates';
import { appendStaffLog } from './staff-log';
import { recordAudit } from './audit';

type Conn = Db | Tx;

function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
	const result = schema.safeParse(input);
	if (!result.success) {
		throw new NpError('INVALID', result.error.issues[0]?.message ?? 'Saisie invalide.', 400);
	}
	return result.data;
}

/** 04 §6 : une mutation sans `expectedRevision` est refusée (428) avant toute validation. */
function requireRevision(input: unknown): void {
	const value = (input as { expectedRevision?: unknown } | null | undefined)?.expectedRevision;
	if (value === undefined || value === null || value === '') throw NpError.versionRequired();
}

const NOT_YOURS = 'Cette scène n’est pas la tienne.';

function sceneNotFound(): NpError {
	return NpError.notFound('Cette scène est introuvable.');
}

function sceneClosed(): NpError {
	return new NpError('SCENE_CLOSED', 'Cette scène est refermée.', 409);
}

function isManager(actor: Actor): boolean {
	return can(actor.role, 'scenes.manage');
}

// ---------------------------------------------------------------------------
// Vues
// ---------------------------------------------------------------------------

async function buildSceneViews(
	db: Conn,
	actor: Actor,
	rows: readonly Scene[]
): Promise<SceneView[]> {
	if (rows.length === 0) return [];
	const ids = rows.map((r) => r.id);
	const me = actor.characterId;
	const manager = isManager(actor);

	const participantRows = await db
		.select({
			sceneId: sceneParticipants.sceneId,
			characterId: sceneParticipants.characterId,
			name: characters.name,
			bookmarkText: sceneParticipants.bookmarkText,
			bookmarkUrl: sceneParticipants.bookmarkUrl
		})
		.from(sceneParticipants)
		.innerJoin(characters, eq(characters.id, sceneParticipants.characterId))
		.where(inArray(sceneParticipants.sceneId, ids))
		.orderBy(asc(characters.name), asc(sceneParticipants.characterId));

	const pinRows = await db
		.select()
		.from(scenePins)
		.where(
			and(
				inArray(scenePins.sceneId, ids),
				// Les épingles sont la marge personnelle du participant ; le staff les voit toutes.
				manager ? undefined : me ? eq(scenePins.characterId, me) : sql`false`
			)
		)
		.orderBy(asc(scenePins.createdAt), asc(scenePins.id));

	return rows.map((row) => {
		const participants = participantRows.filter((p) => p.sceneId === row.id);
		const own = me ? participants.find((p) => p.characterId === me) : undefined;
		return {
			id: row.id,
			title: row.title,
			discordUrl: row.discordUrl,
			channel: channelFromTitle(row.title),
			status: row.status,
			summary: row.summary,
			openQuestion: row.openQuestion,
			participants: participants.map((p) => ({
				characterId: p.characterId,
				name: p.name,
				me: p.characterId === me
			})),
			pins: pinRows
				.filter((p) => p.sceneId === row.id)
				.map((p) => ({
					id: p.id,
					kind: p.kind,
					ref: p.ref,
					note: p.note,
					characterId: p.characterId,
					mine: p.characterId === me
				})),
			bookmark:
				own && (own.bookmarkText || own.bookmarkUrl)
					? { text: own.bookmarkText, url: own.bookmarkUrl }
					: null,
			openedAt: row.createdAt.toISOString(),
			closedAt: row.closedAt ? row.closedAt.toISOString() : null,
			autoClosed: row.autoClosed,
			revision: row.revision
		};
	});
}

async function loadSceneView(db: Conn, actor: Actor, sceneId: string): Promise<SceneView> {
	const [row] = await db.select().from(scenes).where(eq(scenes.id, sceneId));
	if (!row) throw sceneNotFound();
	const [view] = await buildSceneViews(db, actor, [row]);
	return view;
}

async function isParticipant(
	db: Conn,
	sceneId: string,
	characterId: string | null
): Promise<boolean> {
	if (!characterId) return false;
	const [row] = await db
		.select({ id: sceneParticipants.characterId })
		.from(sceneParticipants)
		.where(
			and(eq(sceneParticipants.sceneId, sceneId), eq(sceneParticipants.characterId, characterId))
		);
	return !!row;
}

/** Charge la scène (verrouillée) et vérifie que l'acteur peut y écrire : staff ou participant. */
async function lockWritableScene(tx: Tx, actor: Actor, sceneId: string): Promise<Scene> {
	const [scene] = await tx.select().from(scenes).where(eq(scenes.id, sceneId)).for('update');
	if (!scene) throw sceneNotFound();
	if (!isManager(actor) && !(await isParticipant(tx, sceneId, actor.characterId))) {
		throw NpError.notFound(NOT_YOURS);
	}
	return scene;
}

// ---------------------------------------------------------------------------
// Ouvrir, lire
// ---------------------------------------------------------------------------

/**
 * Ouvre une scène. Joueur : pour son personnage seulement (`characterIds` absent ou réduit au sien).
 * MJ, administrateur : pour les personnages donnés (au moins un). Titre et lien du salon obligatoires.
 * Une transaction : scène, participants (vérifiés dans la transaction), audit, journal staff.
 */
export async function openScene(
	db: Db,
	actor: Actor | null,
	input: OpenSceneInput
): Promise<SceneView> {
	const present = requireActor(actor);
	const data = parse(openSceneSchema, input);
	const requested = [...new Set(data.characterIds ?? [])];
	const manager = isManager(present);
	let characterIds: string[];
	if (manager) {
		characterIds =
			requested.length > 0 ? requested : present.characterId ? [present.characterId] : [];
		if (characterIds.length === 0) {
			throw new NpError('INVALID', 'Choisis au moins un personnage pour la scène.', 400);
		}
	} else {
		const { characterId } = requireOwnCharacter(present);
		if (requested.some((id) => id !== characterId)) {
			throw NpError.forbidden('Tu ouvres une scène pour ton personnage seulement.');
		}
		characterIds = [characterId];
	}

	const id = `s_${nanoid(16)}`;
	return db.transaction(async (tx) => {
		const now = new Date();
		await tx.insert(scenes).values({
			id,
			title: data.title,
			discordUrl: data.discordUrl,
			status: 'ouverte',
			createdBy: present.accountId,
			lastActivityAt: now
		});
		const found = await tx
			.select({ id: characters.id, name: characters.name })
			.from(characters)
			.where(inArray(characters.id, characterIds));
		if (found.length !== characterIds.length) throw NpError.notFound('Personnage introuvable.');
		await tx
			.insert(sceneParticipants)
			.values(characterIds.map((characterId) => ({ sceneId: id, characterId })));

		await recordAudit(tx, {
			source: 'scenes',
			action: 'scene_open',
			actor: present,
			details: { sceneId: id, title: data.title, characterIds }
		});
		if (manager) {
			await appendStaffLog(tx, {
				action: 'scene_ouverte',
				detail: `Scène '${data.title}' ouverte pour ${found
					.map((c) => c.name)
					.sort()
					.join(', ')}`,
				actor: present,
				target: data.title
			});
		}
		return loadSceneView(tx, present, id);
	});
}

/** Scènes ouvertes : celles du personnage du lecteur ; toutes pour les MJ et les administrateurs. */
export async function listOpenScenes(db: Db, actor: Actor | null): Promise<SceneView[]> {
	const present = requireActor(actor);
	let rows: Scene[];
	if (isManager(present)) {
		rows = await db
			.select()
			.from(scenes)
			.where(eq(scenes.status, 'ouverte'))
			.orderBy(desc(scenes.lastActivityAt), asc(scenes.id));
	} else if (present.characterId) {
		rows = (
			await db
				.select({ scene: scenes })
				.from(scenes)
				.innerJoin(sceneParticipants, eq(sceneParticipants.sceneId, scenes.id))
				.where(
					and(eq(scenes.status, 'ouverte'), eq(sceneParticipants.characterId, present.characterId))
				)
				.orderBy(desc(scenes.lastActivityAt), asc(scenes.id))
		).map((r) => r.scene);
	} else {
		rows = [];
	}
	return buildSceneViews(db, present, rows);
}

/**
 * Contexte du feuillet « En scène » : la scène ouverte la plus récente du personnage et, s'il figure
 * dans une Table ouverte et montrée aux participants, cette Table (de préférence celle de la scène).
 */
export async function getSceneContext(db: Db, actor: Actor | null): Promise<SceneContextView> {
	const present = requireActor(actor);
	const characterId = present.characterId;
	if (!characterId) return { scene: null, table: null, channel: null };

	const [current] = await db
		.select({ scene: scenes })
		.from(scenes)
		.innerJoin(sceneParticipants, eq(sceneParticipants.sceneId, scenes.id))
		.where(and(eq(scenes.status, 'ouverte'), eq(sceneParticipants.characterId, characterId)))
		.orderBy(desc(scenes.lastActivityAt), asc(scenes.id))
		.limit(1);
	const scene = current ? (await buildSceneViews(db, present, [current.scene]))[0] : null;

	const tables = await db
		.select({
			id: combats.id,
			name: combats.name,
			label: combats.label,
			discordUrl: combats.discordUrl,
			round: combats.round,
			phase: combats.phase,
			status: combats.status,
			sceneId: combats.sceneId
		})
		.from(combats)
		.innerJoin(combatParticipants, eq(combatParticipants.combatId, combats.id))
		.where(
			and(
				eq(combatParticipants.characterId, characterId),
				isNull(combats.closedAt),
				ne(combats.status, 'termine'),
				eq(combats.visibleToParticipants, true)
			)
		)
		.orderBy(desc(combats.updatedAt), asc(combats.id));
	const chosen = (scene && tables.find((t) => t.sceneId === scene.id)) || tables[0];
	const table: SceneTableContext | null = chosen
		? {
				id: chosen.id,
				name: chosen.name || chosen.label,
				discordUrl: chosen.discordUrl,
				round: chosen.round,
				phase: chosen.phase,
				status: chosen.status
			}
		: null;
	const channel = scene?.channel || (table ? channelFromTitle(table.name) : '') || null;
	return { scene, table, channel };
}

// ---------------------------------------------------------------------------
// Écrire dans la scène
// ---------------------------------------------------------------------------

async function updateSceneText(
	db: Db,
	actor: Actor | null,
	sceneId: string,
	expectedRevision: number,
	field: 'summary' | 'openQuestion',
	value: string
): Promise<SceneView> {
	const present = requireActor(actor);
	return db.transaction(async (tx) => {
		const scene = await lockWritableScene(tx, present, sceneId);
		if (scene.status !== 'ouverte') throw sceneClosed();
		const updated = await tx
			.update(scenes)
			.set({
				...(field === 'summary' ? { summary: value } : { openQuestion: value }),
				lastActivityAt: new Date(),
				revision: sql`${scenes.revision} + 1`
			})
			.where(and(eq(scenes.id, sceneId), eq(scenes.revision, expectedRevision)))
			.returning({ id: scenes.id });
		if (updated.length === 0) throw NpError.versionConflict();
		await recordAudit(tx, {
			source: 'scenes',
			action: field === 'summary' ? 'scene_summary' : 'scene_open_question',
			actor: present,
			details: { sceneId, length: value.length }
		});
		if (isManager(present)) {
			await appendStaffLog(tx, {
				action: field === 'summary' ? 'scene_resume' : 'scene_question',
				detail: `Scène '${scene.title}' : ${field === 'summary' ? '« où nous en sommes » noté' : 'question ouverte notée'}`,
				actor: present,
				target: scene.title
			});
		}
		return loadSceneView(tx, present, sceneId);
	});
}

/** « Où nous en sommes » (MJ, administrateur, participant). */
export async function setSummary(
	db: Db,
	actor: Actor | null,
	input: SetSummaryInput
): Promise<SceneView> {
	requireActor(actor);
	requireRevision(input);
	const data = parse(setSummarySchema, input);
	return updateSceneText(db, actor, data.sceneId, data.expectedRevision, 'summary', data.summary);
}

/** Question ouverte de la scène (MJ, administrateur, participant). */
export async function setOpenQuestion(
	db: Db,
	actor: Actor | null,
	input: SetOpenQuestionInput
): Promise<SceneView> {
	requireActor(actor);
	requireRevision(input);
	const data = parse(setOpenQuestionSchema, input);
	return updateSceneText(
		db,
		actor,
		data.sceneId,
		data.expectedRevision,
		'openQuestion',
		data.openQuestion
	);
}

/**
 * Épingle une capacité, une règle, un objet ou une créature dans la marge de la scène, pour le
 * personnage du lecteur (participant). Une même épingle n'est posée qu'une fois.
 */
export async function pin(db: Db, actor: Actor | null, input: PinInput): Promise<SceneView> {
	const { actor: present, characterId } = requireOwnCharacter(actor);
	const data = parse(pinSchema, input);
	return db.transaction(async (tx) => {
		const [scene] = await tx.select().from(scenes).where(eq(scenes.id, data.sceneId)).for('update');
		if (!scene) throw sceneNotFound();
		if (!(await isParticipant(tx, scene.id, characterId))) throw NpError.notFound(NOT_YOURS);
		if (scene.status !== 'ouverte') throw sceneClosed();
		const mine = await tx
			.select({ id: scenePins.id, kind: scenePins.kind, ref: scenePins.ref })
			.from(scenePins)
			.where(and(eq(scenePins.sceneId, scene.id), eq(scenePins.characterId, characterId)));
		if (!mine.some((p) => p.kind === data.kind && p.ref === data.ref)) {
			if (mine.length >= SCENE_PINS_MAX) {
				throw new NpError(
					'INVALID',
					`La marge tient ${SCENE_PINS_MAX} épingles ; retires-en une d’abord.`,
					400
				);
			}
			await tx.insert(scenePins).values({
				id: `sp_${nanoid(16)}`,
				sceneId: scene.id,
				characterId,
				kind: data.kind,
				ref: data.ref,
				note: data.note
			});
			await tx.update(scenes).set({ lastActivityAt: new Date() }).where(eq(scenes.id, scene.id));
		}
		return loadSceneView(tx, present, scene.id);
	});
}

/** Retire une épingle de sa propre marge. */
export async function unpin(db: Db, actor: Actor | null, input: UnpinInput): Promise<SceneView> {
	const { actor: present, characterId } = requireOwnCharacter(actor);
	const data = parse(unpinSchema, input);
	return db.transaction(async (tx) => {
		const [found] = await tx
			.select({ id: scenePins.id, sceneId: scenePins.sceneId })
			.from(scenePins)
			.where(and(eq(scenePins.id, data.pinId), eq(scenePins.characterId, characterId)));
		if (!found) throw NpError.notFound('Cette épingle n’est pas dans ta marge.');
		await tx.delete(scenePins).where(eq(scenePins.id, found.id));
		await tx
			.update(scenes)
			.set({ lastActivityAt: new Date() })
			.where(and(eq(scenes.id, found.sceneId), eq(scenes.status, 'ouverte')));
		return loadSceneView(tx, present, found.sceneId);
	});
}

/** Clôt une scène : MJ, administrateur, ou le participant qui l'a ouverte. */
export async function closeScene(
	db: Db,
	actor: Actor | null,
	input: CloseSceneInput
): Promise<SceneView> {
	const present = requireActor(actor);
	requireRevision(input);
	const data = parse(closeSceneSchema, input);
	return db.transaction(async (tx) => {
		const scene = await lockWritableScene(tx, present, data.sceneId);
		const manager = isManager(present);
		if (!manager && scene.createdBy !== present.accountId) {
			throw NpError.forbidden(
				'Seuls un MJ, un administrateur ou qui a ouvert la scène la referment.'
			);
		}
		if (scene.status !== 'ouverte') throw sceneClosed();
		const now = new Date();
		const updated = await tx
			.update(scenes)
			.set({
				status: 'close',
				closedAt: now,
				autoClosed: false,
				revision: sql`${scenes.revision} + 1`
			})
			.where(and(eq(scenes.id, scene.id), eq(scenes.revision, data.expectedRevision)))
			.returning({ id: scenes.id });
		if (updated.length === 0) throw NpError.versionConflict();
		await recordAudit(tx, {
			source: 'scenes',
			action: 'scene_close',
			actor: present,
			details: { sceneId: scene.id }
		});
		if (manager) {
			await appendStaffLog(tx, {
				action: 'scene_close',
				detail: `Scène '${scene.title}' refermée`,
				actor: present,
				target: scene.title
			});
		}
		return loadSceneView(tx, present, scene.id);
	});
}

// ---------------------------------------------------------------------------
// Entretien
// ---------------------------------------------------------------------------

/**
 * Referme les scènes sans activité depuis 14 jours (03-vision §12.3) : statut `close`,
 * `auto_closed`, une ligne « refermée d'elle-même · date » dans l'historique de chaque participant,
 * une entrée d'audit. Une transaction ; idempotent (une scène close n'est plus touchée).
 */
export async function autoCloseScenes(db: Db, now: Date = new Date()): Promise<AutoCloseResult> {
	const threshold = new Date(now.getTime() - SCENE_IDLE_DAYS * 86_400_000);
	return db.transaction(async (tx) => {
		const closed = await tx
			.update(scenes)
			.set({
				status: 'close',
				autoClosed: true,
				closedAt: now,
				revision: sql`${scenes.revision} + 1`
			})
			.where(and(eq(scenes.status, 'ouverte'), lt(scenes.lastActivityAt, threshold)))
			.returning({ id: scenes.id, title: scenes.title });
		if (closed.length === 0) return { closed: [] };

		const participants = await tx
			.select({ sceneId: sceneParticipants.sceneId, characterId: sceneParticipants.characterId })
			.from(sceneParticipants)
			.where(
				inArray(
					sceneParticipants.sceneId,
					closed.map((c) => c.id)
				)
			);
		const titleById = new Map(closed.map((c) => [c.id, c.title]));
		if (participants.length > 0) {
			await tx.insert(characterHistory).values(
				participants.map((p) => ({
					characterId: p.characterId,
					ts: now,
					type: 'scene' as const,
					text: `Scène « ${titleById.get(p.sceneId) ?? ''} » refermée d’elle-même · ${dateLongue(now, now)}.`,
					actorName: 'Système',
					actorRole: 'regles' as const
				}))
			);
		}
		await recordAudit(tx, {
			source: 'scenes',
			action: 'scene_auto_close',
			actor: null,
			details: { sceneIds: closed.map((c) => c.id), idleDays: SCENE_IDLE_DAYS }
		});
		return { closed: closed.map((c) => c.id).sort() };
	});
}
