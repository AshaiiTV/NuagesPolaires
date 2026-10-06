// La Table et ses récits : 06-contrats B.6 ; audit 03 §8-9 ; 04 §3.6, §6, §10.6.
import { sansEmoji } from '$lib/ui/table/texte';
import { randomBytes } from 'node:crypto';
import { and, asc, desc, eq, gt, ilike, inArray, isNull, notInArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Db, Tx } from '../db';
import {
	beasts,
	characterHistory,
	characterItems,
	characters,
	combatParticipants,
	combats,
	declarations,
	oaths,
	sceneParticipants,
	scenes,
	sessions,
	type Combat,
	type HistoryField
} from '../db/schema';
import {
	assertFreshAccount,
	auditContextOf,
	requestContextOf,
	SESSION_CLOSED_MESSAGE
} from '../auth/context';
import { assertCan, can, requireActor, requireOwnCharacter, type Actor } from '../permissions';
import { NpError } from '../http';
import {
	addFighter,
	createCombat,
	endCombat,
	projectForPlayer,
	type CombatState
} from '../../game/combat';
import { applyXp } from '../../game/progression';
import {
	closeTableSchema,
	combatStateSchema,
	createTableSchema,
	listRecitsSchema,
	listTablesSchema,
	saveTableSchema,
	tableFlagSchema,
	type CloseTableInput,
	type CreateTableInput,
	type PendingDeclarationView,
	type PlayerTableView,
	type RecitRowView,
	type RecitView,
	type SaveTableInput,
	type TableFlagInput,
	type TableRowView,
	type TableView
} from '../../schemas/combats';
import { appendStaffLog } from './staff-log';
import { recordAudit } from './audit';
import { publishExtract } from './publications';
import { findBranch } from '../../game/oaths';
import { enrichCombatState, oathDefinitionFromRow } from './combat-context';

const identifier = z.string().min(1).max(200);
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
	const result = schema.safeParse(input);
	if (!result.success)
		throw new NpError(
			'INVALID',
			result.error.issues.find((issue) => issue.code === 'custom')?.message ?? 'Table invalide.'
		);
	return result.data;
}
function revision(value: number | undefined): number {
	if (value === undefined) throw NpError.versionRequired();
	return value;
}
function newId(prefix: string): string {
	return `${prefix}_${randomBytes(12).toString('base64url')}`;
}
function stateOf(row: Combat): CombatState {
	const { characterRevisions: _revisions, legacy: _legacy, ...state } = row.state;
	void _revisions;
	void _legacy;
	return parse(combatStateSchema, state);
}
function revisionsOf(row: Combat): Record<string, number> {
	const result = z
		.record(z.string(), z.number().int().positive())
		.safeParse(row.state.characterRevisions);
	return result.success ? result.data : {};
}
function stored(
	state: CombatState,
	characterRevisions: Record<string, number>
): Record<string, unknown> {
	return { ...state, characterRevisions };
}
function tableRow(row: Combat): TableRowView {
	return {
		id: row.id,
		name: row.name,
		label: row.label,
		status: row.status,
		round: row.round,
		phase: row.phase,
		discordUrl: row.discordUrl,
		showEnemyNumbers: row.showEnemyNumbers,
		visibleToParticipants: row.visibleToParticipants,
		savedAt: row.savedAt?.toISOString() ?? null,
		at: row.updatedAt.toISOString(),
		sceneId: row.sceneId,
		revision: row.revision
	};
}
function recitRow(row: Combat): RecitRowView {
	return {
		id: row.id,
		title: row.label || row.name,
		name: row.name,
		at: (row.closedAt ?? row.savedAt ?? row.updatedAt).toISOString(),
		round: row.round,
		visibleToParticipants: row.visibleToParticipants,
		revision: row.revision
	};
}
async function readTable(db: Db | Tx, id: string): Promise<Combat> {
	const [row] = await db.select().from(combats).where(eq(combats.id, id));
	if (!row) throw NpError.notFound();
	return row;
}
async function checkActor(tx: Tx, actor: Actor): Promise<void> {
	// 04 §10.7 : relire le compte dans la transaction, sans faire confiance au rôle du formulaire.
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
async function logMutation(
	tx: Tx,
	actor: Actor,
	action: string,
	id: string,
	detail: string,
	details: Record<string, unknown> = {}
): Promise<void> {
	await appendStaffLog(tx, { action, detail, actor, target: id });
	await recordAudit(tx, {
		source: 'combats',
		action,
		actor,
		details: { ...details, id, detail },
		...auditContextOf(actor)
	});
}
function participantIds(state: CombatState): string[] {
	return [
		...new Set(
			state.fighters
				.filter((f) => f.type === 'player' && !f.isSummon && f.characterId)
				.map((f) => f.characterId!)
		)
	].sort();
}
async function syncParticipants(
	tx: Tx,
	row: Combat,
	state: CombatState
): Promise<Record<string, number>> {
	const ids = participantIds(state);
	const baselines = revisionsOf(row);
	const sheets = ids.length
		? await tx
				.select()
				.from(characters)
				.where(and(inArray(characters.id, ids), isNull(characters.struckAt)))
				.orderBy(asc(characters.id))
				.for('share')
		: [];
	if (sheets.length !== ids.length) throw NpError.notFound('Personnage introuvable.');
	const next: Record<string, number> = {};
	for (const sheet of sheets) next[sheet.id] = baselines[sheet.id] ?? sheet.revision;
	// Audit 03 §8.2 : une invocation porte l'id de son porteur mais n'est jamais un participant.
	await tx
		.delete(combatParticipants)
		.where(
			and(
				eq(combatParticipants.combatId, row.id),
				ids.length ? notInArray(combatParticipants.characterId, ids) : undefined
			)
		);
	if (ids.length)
		await tx
			.insert(combatParticipants)
			.values(ids.map((characterId) => ({ combatId: row.id, characterId })))
			.onConflictDoNothing();
	if (row.sceneId) {
		await tx
			.delete(sceneParticipants)
			.where(
				and(
					eq(sceneParticipants.sceneId, row.sceneId),
					ids.length ? notInArray(sceneParticipants.characterId, ids) : undefined
				)
			);
		if (ids.length)
			await tx
				.insert(sceneParticipants)
				.values(ids.map((characterId) => ({ sceneId: row.sceneId!, characterId })))
				.onConflictDoNothing();
		await tx
			.update(scenes)
			.set({
				lastActivityAt: new Date(),
				revision: sql`${scenes.revision} + 1`,
				updatedAt: new Date()
			})
			.where(eq(scenes.id, row.sceneId));
	}
	return next;
}

export async function listTables(
	db: Db,
	actor: Actor | null,
	input: z.input<typeof listTablesSchema> = {}
): Promise<TableRowView[]> {
	assertCan(actor, 'combat.run');
	const data = parse(listTablesSchema, input);
	const rows = await db
		.select()
		.from(combats)
		.where(data.status ? eq(combats.status, data.status) : undefined)
		.orderBy(desc(combats.updatedAt), desc(combats.id));
	return rows.map(tableRow);
}

export async function createTable(
	db: Db,
	actor: Actor | null,
	input: CreateTableInput
): Promise<TableView> {
	const author = assertCan(actor, 'combat.run');
	const data = parse(createTableSchema, input);
	if (new Set(data.characterIds).size !== data.characterIds.length)
		throw new NpError('INVALID', 'Un personnage ne figure qu’une fois à la Table.');
	return db.transaction(async (tx) => {
		await checkActor(tx, author);
		const id = newId('c');
		let state = createCombat({ id, name: data.name, ownerAccountId: author.accountId });
		const baselines: Record<string, number> = {};
		for (const characterId of [...data.characterIds].sort()) {
			const [sheet] = await tx
				.select()
				.from(characters)
				.where(and(eq(characters.id, characterId), isNull(characters.struckAt)))
				.for('share');
			if (!sheet) throw NpError.notFound('Personnage introuvable.');
			const [oath] = await tx.select().from(oaths).where(eq(oaths.id, sheet.oathId));
			if (!oath) throw NpError.notFound('Serment introuvable.');
			const branch = findBranch(oathDefinitionFromRow(oath), sheet.branch);
			state = addFighter(state, {
				type: 'player',
				characterId,
				name: sheet.name,
				oathName: oath.name,
				level: sheet.level,
				pvCur: sheet.pvCur,
				pvMax: sheet.pvMax,
				epCur: sheet.epCur,
				epMax: sheet.epMax,
				emCur: sheet.emCur,
				emMax: sheet.emMax,
				dmgBase: oath.baseDamage,
				imageUrl: sheet.avatarUrl,
				branch: branch ? { name: branch.nom, tiers: branch.paliers } : null
			});
			baselines[characterId] = sheet.revision;
			state.fighters.at(-1)!.oathDamage = oath.baseDamage;
		}
		for (const entry of data.beasts) {
			const [beast] = await tx.select().from(beasts).where(eq(beasts.id, entry.beastId));
			if (!beast || beast.archived) throw NpError.notFound('Créature introuvable.');
			for (let n = 0; n < entry.qty; n++)
				state = addFighter(state, {
					type: 'beast',
					beastId: beast.id,
					name: beast.name,
					level: beast.level,
					pv: beast.pv,
					ep: beast.ep,
					strike: beast.strike,
					skill: beast.skill,
					behavior: beast.behavior,
					gem: beast.gem,
					imageUrl: beast.imageUrl
				});
		}
		if (state.fighters.length > 80)
			throw new NpError('INVALID', 'La Table accueille au plus 80 combattants.');
		await tx.insert(combats).values({
			visibleToParticipants: true,
			id,
			name: data.name,
			ownerAccountId: author.accountId,
			ownerLabel: author.pseudo,
			state: stored(state, baselines),
			discordUrl: data.discordUrl
		});
		const sceneId = newId('s');
		await tx.insert(scenes).values({
			id: sceneId,
			title: data.name,
			discordUrl: data.discordUrl,
			combatId: id,
			createdBy: author.accountId
		});
		await tx.update(combats).set({ sceneId }).where(eq(combats.id, id));
		if (data.characterIds.length) {
			await tx
				.insert(combatParticipants)
				.values(data.characterIds.map((characterId) => ({ combatId: id, characterId })));
			await tx
				.insert(sceneParticipants)
				.values(data.characterIds.map((characterId) => ({ sceneId, characterId })));
		}
		await logMutation(tx, author, 'table_ouverte', id, data.name);
		const row = await readTable(tx, id);
		return { state, row: tableRow(row), pendingDeclarations: [], revision: row.revision };
	});
}

async function pendingFor(
	db: Db,
	actor: Actor,
	state: CombatState
): Promise<PendingDeclarationView[]> {
	const ids = participantIds(state);
	if (!ids.length) return [];
	// Import tolérant : le paquet Déclarations peut être livré après celui de la Table.
	const modules = import.meta.glob('./declarations.ts');
	const loader = modules['./declarations.ts'];
	if (loader) {
		const module = (await loader()) as {
			listPendingFor?: (
				db: Db,
				actor: Actor | null,
				characterId: string
			) => Promise<PendingDeclarationView[]>;
		};
		if (module.listPendingFor)
			return (await Promise.all(ids.map((id) => module.listPendingFor!(db, actor, id)))).flat();
	}
	const rows = await db
		.select({ declaration: declarations, name: characters.name })
		.from(declarations)
		.innerJoin(characters, eq(declarations.characterId, characters.id))
		.where(and(inArray(declarations.characterId, ids), eq(declarations.status, 'proposee')))
		.orderBy(asc(declarations.createdAt), asc(declarations.id));
	return rows.map(({ declaration: d, name }) => ({
		id: d.id,
		characterId: d.characterId,
		text: `${name} déclare ${d.delta < 0 ? '−' : '+'}${Math.abs(d.delta)} ${d.resource.toUpperCase()} (${d.word}).`,
		resource: d.resource,
		delta: d.delta,
		word: d.word,
		status: d.status,
		at: d.createdAt.toISOString(),
		cancelUntil: d.cancelUntil.toISOString(),
		sceneId: d.sceneId,
		combatId: d.combatId,
		motif: d.motif,
		reportedAt: d.reportedAt?.toISOString() ?? null
	}));
}
export async function getTable(db: Db, actor: Actor | null, id: string): Promise<TableView> {
	const author = assertCan(actor, 'combat.run');
	const row = await readTable(db, parse(identifier, id));
	const state = await enrichCombatState(db, stateOf(row));
	return {
		state,
		row: tableRow(row),
		pendingDeclarations: await pendingFor(db, author, state),
		revision: row.revision
	};
}

export async function saveTable(
	db: Db,
	actor: Actor | null,
	input: SaveTableInput
): Promise<TableRowView> {
	const author = assertCan(actor, 'combat.run');
	const data = parse(saveTableSchema, input);
	revision(data.expectedRevision);
	if (data.state.id !== data.id)
		throw new NpError('INVALID', 'L’état appartient à une autre Table.');
	return db.transaction(async (tx) => {
		await checkActor(tx, author);
		const old = await readTable(tx, data.id);
		const now = new Date();
		const state = { ...data.state, ownerAccountId: old.ownerAccountId };
		// Une sauvegarde ne clôt jamais : seule closeTable peut tamponner les conséquences (04 §10.6).
		const [row] = await tx
			.update(combats)
			.set({
				name: state.name,
				state: stored(state, revisionsOf(old)),
				status: state.active || state.startedAt !== null ? 'en_cours' : 'preparation',
				round: state.round,
				phase: state.phase,
				savedAt: now,
				...(data.reason === 'manual' ? { manualSaved: true } : { autosaveAt: now }),
				autosaveReason: data.reason,
				revision: sql`${combats.revision} + 1`,
				updatedAt: now
			})
			.where(
				and(
					eq(combats.id, data.id),
					eq(combats.revision, revision(data.expectedRevision)),
					isNull(combats.closedAt)
				)
			)
			.returning();
		if (!row) throw NpError.versionConflict();
		const baselines = await syncParticipants(tx, row, state);
		await tx
			.update(combats)
			.set({ state: stored(state, baselines) })
			.where(and(eq(combats.id, data.id), eq(combats.revision, row.revision)));
		if (data.reason === 'round') {
			// Vision §12.4 : le round absorbe les annotations ; aucune ressource de fiche n'est écrite ici.
			await tx
				.update(declarations)
				.set({
					status: 'non_reportee',
					reportedBy: author.accountId,
					reportedAt: now,
					motif: `Résolution du round ${state.round}`,
					updatedAt: now
				})
				.where(and(eq(declarations.combatId, data.id), eq(declarations.status, 'proposee')));
		}
		await logMutation(tx, author, 'table_sauvee', data.id, data.reason);
		return tableRow(row);
	});
}

async function setFlag(
	db: Db,
	actor: Actor | null,
	input: TableFlagInput,
	field: 'showEnemyNumbers' | 'visibleToParticipants'
): Promise<TableRowView> {
	const author = assertCan(actor, 'combat.run');
	const data = parse(tableFlagSchema, input);
	revision(data.expectedRevision);
	return db.transaction(async (tx) => {
		await checkActor(tx, author);
		const [row] = await tx
			.update(combats)
			.set({ [field]: data.value, revision: sql`${combats.revision} + 1`, updatedAt: new Date() })
			.where(and(eq(combats.id, data.id), eq(combats.revision, revision(data.expectedRevision))))
			.returning();
		if (!row) throw NpError.versionConflict();
		await logMutation(
			tx,
			author,
			field === 'showEnemyNumbers' ? 'table_chiffres' : 'table_visibilite',
			data.id,
			String(data.value)
		);
		return tableRow(row);
	});
}
export async function setShowEnemyNumbers(
	db: Db,
	actor: Actor | null,
	input: TableFlagInput
): Promise<TableRowView> {
	return setFlag(db, actor, input, 'showEnemyNumbers');
}
export async function setVisibleToParticipants(
	db: Db,
	actor: Actor | null,
	input: TableFlagInput
): Promise<TableRowView> {
	return setFlag(db, actor, input, 'visibleToParticipants');
}

export async function getPlayerTable(
	db: Db,
	actor: Actor | null,
	id: string
): Promise<PlayerTableView> {
	const present = requireActor(actor);
	if (!present.characterId) throw NpError.notFound("Cette Table n'est pas la tienne.");
	const { characterId } = requireOwnCharacter(present);
	const [active] = await db
		.select({ id: characters.id })
		.from(characters)
		.where(and(eq(characters.id, characterId), isNull(characters.struckAt)));
	if (!active) throw NpError.notFound();
	if (actor?.role === 'designer') throw NpError.forbidden();
	parse(identifier, id);
	const [row] = await db
		.select({ combat: combats })
		.from(combats)
		.innerJoin(combatParticipants, eq(combatParticipants.combatId, combats.id))
		.where(
			and(
				eq(combats.id, id),
				eq(combatParticipants.characterId, characterId),
				eq(combats.visibleToParticipants, true)
			)
		);
	if (!row) throw NpError.notFound("Cette Table n'est pas la tienne.");
	const state = stateOf(row.combat);
	if (!participantIds(state).includes(characterId))
		throw NpError.notFound("Cette Table n'est pas la tienne.");
	return {
		projection: projectForPlayer(state, characterId, {
			showEnemyNumbers: row.combat.showEnemyNumbers
		}),
		name: row.combat.name,
		status: row.combat.status,
		closedAt: row.combat.closedAt?.toISOString() ?? null,
		recitId: row.combat.status === 'termine' ? row.combat.id : null,
		discordUrl: row.combat.discordUrl,
		revision: row.combat.revision,
		at: row.combat.updatedAt.toISOString()
	};
}

export async function closeTable(
	db: Db,
	actor: Actor | null,
	input: CloseTableInput
): Promise<RecitRowView> {
	const author = assertCan(actor, 'combat.run');
	const data = parse(closeTableSchema, input);
	revision(data.expectedRevision);
	return db.transaction(async (tx) => {
		await checkActor(tx, author);
		const now = new Date();
		// Réclamation atomique impérative, AVANT toute conséquence (04 §10.6).
		const [row] = await tx
			.update(combats)
			.set({
				closedAt: now,
				status: 'termine',
				label: data.recit.title,
				visibleToParticipants: data.recit.visibleToParticipants,
				savedAt: now,
				revision: sql`${combats.revision} + 1`,
				updatedAt: now
			})
			.where(
				and(
					eq(combats.id, data.id),
					isNull(combats.closedAt),
					eq(combats.revision, revision(data.expectedRevision))
				)
			)
			.returning();
		if (!row) throw NpError.versionConflict();
		const initial = stateOf(row);
		const ids = participantIds(initial);
		if (
			data.consequences.length !== ids.length ||
			new Set(data.consequences.map((c) => c.characterId)).size !== ids.length ||
			data.consequences.some((c) => !ids.includes(c.characterId))
		)
			throw new NpError('INVALID', 'Note une conséquence par personnage présent, sans invocation.');
		const sheets = ids.length
			? await tx
					.select()
					.from(characters)
					.where(and(inArray(characters.id, ids), isNull(characters.struckAt)))
					.orderBy(asc(characters.id))
					.for('update')
			: [];
		if (sheets.length !== ids.length) throw NpError.versionConflict();
		const baselines = revisionsOf(row);
		// Le moteur retire les bonus temporaires et exclut les invocations ; le MJ fournit les valeurs finales.
		const ending = endCombat({ ...initial, ended: false }, { now: now.getTime() });
		const state = ending.state;
		for (const sheet of sheets) {
			const consequence = data.consequences.find((c) => c.characterId === sheet.id)!;
			const expected = consequence.expectedRevision ?? baselines[sheet.id];
			if (expected === undefined) throw NpError.versionRequired();
			const [oath] = await tx.select().from(oaths).where(eq(oaths.id, sheet.oathId));
			if (!oath) throw NpError.notFound();
			const outcome = ending.outcomes.find((o) => o.characterId === sheet.id)!;
			const basePvMax = outcome.pvMax;
			if (
				consequence.pv > basePvMax ||
				consequence.ep > sheet.epMax ||
				consequence.em > sheet.emMax
			)
				throw new NpError('INVALID', 'Une ressource dépasse son maximum.');
			const statuses = [...sheet.statuses];
			// Audit 03 §8.2, legacy main.js:12374 : ajouter les statuts absents, préserver les statuts IRP.
			for (const id of consequence.statuses)
				if (!statuses.some((s) => s.id === id))
					statuses.push({ id, desc: '', posedBy: author.pseudo, posedAt: now.getTime() });
			if (statuses.length > 64)
				throw new NpError('INVALID', 'La fiche accueille au plus 64 statuts.');
			const applied = applyXp(
				{
					...sheet,
					pvCur: consequence.pv,
					pvMax: basePvMax,
					epCur: consequence.ep,
					emCur: consequence.em
				},
				consequence.xp,
				{ pvN: oath.pvGrowth, epN: oath.epGrowth, emN: oath.emGrowth },
				{ rank: oath.rank }
			);
			const next = applied.character;
			const [updated] = await tx
				.update(characters)
				.set({
					pvCur: next.pvCur,
					pvMax: next.pvMax,
					epCur: next.epCur,
					epMax: next.epMax,
					emCur: next.emCur,
					emMax: next.emMax,
					xp: next.xp,
					level: next.level,
					statuses,
					revision: sql`${characters.revision} + 1`,
					updatedAt: now
				})
				.where(and(eq(characters.id, sheet.id), eq(characters.revision, expected)))
				.returning({ id: characters.id });
			if (!updated) throw NpError.versionConflict();
			const stamp = async (
				field: HistoryField,
				oldValue: unknown,
				newValue: unknown,
				text: string,
				type: 'combat' | 'xp' | 'level' | 'item' | 'gemme' = 'combat'
			) => {
				await tx.insert(characterHistory).values({
					characterId: sheet.id,
					combatId: data.id,
					ts: now,
					type,
					field,
					oldValue: typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue),
					newValue: typeof newValue === 'string' ? newValue : JSON.stringify(newValue),
					text,
					motif: consequence.motif,
					actorRole: author.role,
					actorName: author.pseudo,
					actorAccountId: author.accountId
				});
			};
			for (const key of ['pv', 'ep', 'em'] as const)
				await stamp(
					key,
					sheet[`${key}Cur`],
					next[`${key}Cur`],
					`${key.toUpperCase()} : ${sheet[`${key}Cur`]} → ${next[`${key}Cur`]}`
				);
			for (const key of ['pv', 'ep', 'em'] as const)
				if (sheet[`${key}Max`] !== next[`${key}Max`])
					await stamp(
						key,
						{ max: sheet[`${key}Max`] },
						{ max: next[`${key}Max`] },
						`${key.toUpperCase()} maximum : ${sheet[`${key}Max`]} → ${next[`${key}Max`]}`
					);
			await stamp('status', sheet.statuses, statuses, 'Statuts reportés depuis la Table.');
			await stamp('xp', sheet.xp, next.xp, `+${consequence.xp} XP · ${data.recit.title}`, 'xp');
			if (next.level !== sheet.level)
				await stamp(
					'level',
					sheet.level,
					next.level,
					applied.entries.map((e) => e.text).join('\n'),
					'level'
				);
			for (const drop of consequence.drops) {
				const description = `Obtenue sur : ${drop.beastName}`;
				const [existing] = await tx
					.select()
					.from(characterItems)
					.where(
						and(
							eq(characterItems.characterId, sheet.id),
							eq(characterItems.name, drop.name),
							eq(characterItems.category, drop.category)
						)
					)
					.orderBy(asc(characterItems.id))
					.limit(1);
				if (existing)
					await tx
						.update(characterItems)
						.set({ qty: existing.qty + drop.qty, description, updatedAt: now })
						.where(
							and(eq(characterItems.id, existing.id), eq(characterItems.characterId, sheet.id))
						);
				else
					await tx.insert(characterItems).values({
						id: newId('i'),
						characterId: sheet.id,
						name: drop.name,
						category: drop.category,
						qty: drop.qty,
						description
					});
				await stamp(
					'item',
					existing?.qty ?? 0,
					(existing?.qty ?? 0) + drop.qty,
					`${drop.name} ×${drop.qty} · ${description}`,
					drop.category === 'Gemme' ? 'gemme' : 'item'
				);
			}
			await stamp('note', '', data.recit.title, outcome.historyText);
			await tx
				.insert(combatParticipants)
				.values({
					combatId: data.id,
					characterId: sheet.id,
					outcome: {
						pvCur: next.pvCur,
						pvMax: next.pvMax,
						epCur: next.epCur,
						emCur: next.emCur,
						xpGain: consequence.xp,
						drops: consequence.drops.map((d) => d.name),
						statuses
					}
				})
				.onConflictDoUpdate({
					target: [combatParticipants.combatId, combatParticipants.characterId],
					set: {
						outcome: {
							pvCur: next.pvCur,
							pvMax: next.pvMax,
							epCur: next.epCur,
							emCur: next.emCur,
							xpGain: consequence.xp,
							drops: consequence.drops.map((d) => d.name),
							statuses
						},
						updatedAt: now
					}
				});
		}
		if (row.sceneId)
			await tx
				.update(scenes)
				.set({
					status: 'close',
					closedAt: now,
					revision: sql`${scenes.revision} + 1`,
					updatedAt: now
				})
				.where(eq(scenes.id, row.sceneId));
		let publishedExtractId: string | null = null;
		if (data.extract)
			publishedExtractId = (
				await publishExtract(tx, author, { ...data.extract, combatId: data.id })
			).id;
		await tx
			.update(combats)
			.set({ state: stored(state, baselines), phase: state.phase, publishedExtractId })
			.where(and(eq(combats.id, data.id), eq(combats.revision, row.revision)));
		await logMutation(tx, author, 'table_close', data.id, data.recit.title, {
			consequences: data.consequences,
			recit: data.recit,
			publishedExtractId
		});
		return recitRow(row);
	});
}

export async function listRecits(
	db: Db,
	actor: Actor | null,
	input: z.input<typeof listRecitsSchema>
): Promise<RecitRowView[]> {
	const present = requireActor(actor);
	const data = parse(listRecitsSchema, input);
	const staff = can(present.role, 'combat.run');
	if (staff) assertCan(present, 'combat.run');
	else if (present.role === 'designer') throw NpError.forbidden();
	else {
		requireOwnCharacter(present);
		const [active] = await db
			.select({ id: characters.id })
			.from(characters)
			.where(and(eq(characters.id, present.characterId!), isNull(characters.struckAt)));
		if (!active) throw NpError.notFound();
	}
	const conditions = [eq(combats.status, 'termine')];
	if (data.search)
		conditions.push(
			sql`(${ilike(combats.label, `%${data.search}%`)} OR ${ilike(combats.name, `%${data.search}%`)})`
		);
	if (!staff)
		conditions.push(
			eq(combats.visibleToParticipants, true),
			sql`exists (select 1 from ${combatParticipants} where ${combatParticipants.combatId} = ${combats.id} and ${combatParticipants.characterId} = ${present.characterId})`
		);
	const rows = await db
		.select()
		.from(combats)
		.where(and(...conditions))
		.orderBy(desc(combats.closedAt), desc(combats.savedAt), desc(combats.id))
		.limit(20)
		.offset((data.page - 1) * 20);
	return rows.map(recitRow);
}

export async function getRecit(db: Db, actor: Actor | null, id: string): Promise<RecitView> {
	const present = requireActor(actor);
	const staff = can(present.role, 'combat.run');
	if (staff) assertCan(present, 'combat.run');
	else if (present.role === 'designer') throw NpError.forbidden();
	else {
		requireOwnCharacter(present);
		const [active] = await db
			.select({ id: characters.id })
			.from(characters)
			.where(and(eq(characters.id, present.characterId!), isNull(characters.struckAt)));
		if (!active) throw NpError.notFound();
	}
	const row = await readTable(db, parse(identifier, id));
	if (row.status !== 'termine') throw NpError.notFound();
	if (!staff) {
		const [participant] = await db
			.select()
			.from(combatParticipants)
			.where(
				and(
					eq(combatParticipants.combatId, id),
					eq(combatParticipants.characterId, present.characterId!)
				)
			);
		if (!row.visibleToParticipants || !participant)
			throw NpError.notFound("Cette Table n'est pas la tienne.");
	}
	const state = stateOf(row);
	// Journal intégral pour le staff ; liste blanche et filtrage pour les participants.
	const log = staff
		? state.log.map((e) => ({
				n: e.n,
				round: e.round,
				kind: e.kind,
				text: e.text,
				actorId: e.actorId,
				targetId: e.targetId
			}))
		: state.log.flatMap(
				(entry) =>
					projectForPlayer({ ...state, log: [entry] }, present.characterId!, {
						showEnemyNumbers: row.showEnemyNumbers
					}).log
			);
	return {
		...recitRow(row),
		log: log.map((e) => ({ ...e, text: sansEmoji(e.text) })),
		discordUrl: row.discordUrl,
		participants: state.fighters.map((f) => f.name),
		...(staff ? { notes: state.notes } : {})
	};
}
export async function recitAsText(db: Db, actor: Actor | null, id: string): Promise<string> {
	const recit = await getRecit(db, actor, id);
	return `${recit.title}\n${recit.at} · ${recit.round} round(s)\n\n${recit.log.map((entry) => `Round ${entry.round} · ${entry.text}`).join('\n')}\n${recit.notes ? `\nNotes du MJ :\n${recit.notes}\n` : ''}`;
}
