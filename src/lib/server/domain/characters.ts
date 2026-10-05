import { assertFreshAccount } from '$lib/server/auth/context';
// Personnages : fiche, conséquences tamponnées, attributions du staff, actions du joueur
// (06-contrats §B.2 ; 04-architecture §3.2, §3.12, §5, §6, §10.3, §10.7, §10.15).
//
// Règles :
//   - Toute décision du staff qui change une fiche écrit une ligne structurée dans
//     `character_history` (field, old_value, new_value, motif, actor_role, actor_name) — le TAMPON —
//     et incrémente `characters.revision` sous contrôle `expectedRevision` (dans le WHERE de l'UPDATE).
//   - Texte d'historique BRUT (04 §10.15) : jamais de HTML, jamais d'échappement à l'écriture.
//   - Les calculs de progression viennent de `$lib/game/progression` (audit 02 §2, §6) avec la
//     définition de Serment COURANTE de la base (audit 06 F1).
//   - Un personnage rayé (colonne `struck_at`, décision INT-1) sort de toutes les pages (03-vision §5.10) ;
//     seul l'export administrateur (sheetForExport) le lit encore.
import {
	and,
	asc,
	count,
	desc,
	eq,
	ilike,
	inArray,
	isNotNull,
	isNull,
	or,
	sql,
	type SQL
} from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { z } from 'zod';
import type { Db } from '$lib/server/db';
import {
	accounts,
	characterHistory,
	characterItems,
	characters,
	combats,
	declarations,
	oaths,
	type Character,
	type CharacterHistoryEntry,
	type CharacterItem,
	type CharacterStatus,
	type Equipment,
	type HistoryActorRole,
	type NewCharacter,
	type NewCharacterHistoryEntry,
	type Oath
} from '$lib/server/db/schema';
import { NpError } from '$lib/server/http';
import {
	assertCan,
	can,
	requireActor,
	requireOwnCharacter,
	stampRoleLabel,
	type Actor
} from '$lib/server/permissions';
import { appendStaffLog } from './staff-log';
import { recordAudit } from './audit';
import {
	adjustLevel,
	applyXp,
	combatXp,
	combatXpEntryText,
	fuseGems as fuseGemsRule,
	GEM_NAMES,
	gemStock,
	xpMax
} from '$lib/game/progression';
import {
	NO_BRANCH,
	OATH_RANK_LABELS,
	findBranch,
	tierStageLabel,
	unlockedTiers
} from '$lib/game/oaths';
import type {
	Growth,
	OathBranch as GameOathBranch,
	OathDefinition,
	ProgressionState
} from '$lib/game/types';
import {
	CONSEQUENCES_PAGE_SIZE,
	EQUIPMENT_LABELS,
	EQUIPMENT_SLOTS,
	GEM_KINDS,
	GEM_META,
	LIMITS,
	RESOURCE_LABELS,
	addItemSchema,
	consumeOwnItemSchema,
	correctResourceSchema,
	createCharacterSchema,
	fuseGemsSchema,
	grantCombatXpSchema,
	listCharactersSchema,
	listConsequencesSchema,
	removeItemSchema,
	removeStatusSchema,
	setEquipmentSchema,
	setOwnPortraitSchema,
	setStatusSchema,
	statusMeta,
	strikeCharacterSchema,
	updateIdentitySchema,
	type AddItemInput,
	type CharacterRowView,
	type ConsequenceFilter,
	type ConsequencePageView,
	type ConsequenceView,
	type ConsumeOwnItemInput,
	type CorrectResourceInput,
	type CreateCharacterInput,
	type FuseGemsInput,
	type GrantCombatXpInput,
	type ItemView,
	type ListCharactersInput,
	type ListConsequencesInput,
	type RemoveItemInput,
	type RemoveStatusInput,
	type ResourceKey,
	type SetEquipmentInput,
	type SetOwnPortraitInput,
	type SetStatusInput,
	type SheetExportView,
	type SheetView,
	type StrikeCharacterInput,
	type TierView,
	type UpdateIdentityInput
} from '$lib/schemas/characters';

// ---------------------------------------------------------------------------
// Assistants partagés avec journal.ts, facts.ts, declarations.ts
// ---------------------------------------------------------------------------

/**
 * Valide une entrée avec Zod ; refus ⇒ `NpError('INVALID', …, 400)` avec le premier message.
 * Les messages des schémas priment ; à défaut, un message générique en français (un champ en trop
 * dans une commande stricte donne la phrase de l'audit 05 §5.5).
 */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
	const result = schema.safeParse(input, {
		error: (issue) =>
			issue.code === 'unrecognized_keys'
				? 'Paramètres non autorisés pour cette action.'
				: `Saisie invalide${issue.path && issue.path.length ? ` (${issue.path.map(String).join('.')})` : ''}.`
	});
	if (!result.success) {
		throw new NpError('INVALID', result.error.issues[0]?.message ?? 'Saisie invalide.', 400);
	}
	return result.data;
}

/** `expectedRevision` absent ⇒ 428 VERSION_REQUIRED (04 §6), avant toute autre validation. */
export function requireRevision(input: unknown): void {
	const value =
		input && typeof input === 'object'
			? (input as { expectedRevision?: unknown }).expectedRevision
			: undefined;
	if (value === undefined || value === null || value === '') throw NpError.versionRequired();
}

/**
 * Condition SQL : personnage non rayé (`characters.struck_at IS NULL`, décision INT-1). Tous les domaines
 * qui lisent ou écrivent un personnage l'appliquent (comptes, rendez-vous, Table, ruban, scènes, liste).
 */
export const characterIsActive: SQL = isNull(characters.struckAt);

/** Auteur d'une ligne d'historique. */
export type HistoryAuthor = {
	actorName: string;
	actorAccountId: string | null;
	actorRole: HistoryActorRole;
};

/** Auteur d'un tampon : « MJ <pseudo> » / « Admin <pseudo> » (by legacy, audit 02 §8). */
export function stampAuthor(actor: Actor): HistoryAuthor {
	return {
		actorName: `${stampRoleLabel(actor.role)} ${actor.pseudo}`.trim(),
		actorAccountId: actor.accountId,
		actorRole: actor.role
	};
}

/** Les règles (montée de niveau) signent « Système » (audit 02 §2.2). */
export const RULES_AUTHOR: HistoryAuthor = {
	actorName: 'Système',
	actorAccountId: null,
	actorRole: 'regles'
};

/** Le joueur signe « <perso> (joueur) » (audit 05 §5.5 `consume_own_item`). */
export function playerAuthor(actor: Actor, characterName: string): HistoryAuthor {
	return {
		actorName: `${characterName} (joueur)`,
		actorAccountId: actor.accountId,
		actorRole: 'joueur'
	};
}

/** Tampon affiché : rôle « MJ » / « Admin », nom sans le préfixe de rôle du `by` hérité. */
export function stampView(role: string | null, actorName: string): { role: string; name: string } {
	const label =
		role === 'admin' ? 'Admin' : role === 'mj' ? 'MJ' : role === 'designer' ? 'Designer' : '';
	return { role: label, name: actorName.replace(/^(MJ|Admin|Designer)\s+/, '').trim() };
}

export type HistoryDraft = Omit<
	NewCharacterHistoryEntry,
	'characterId' | 'actorName' | 'actorAccountId' | 'actorRole' | 'id'
> & { author: HistoryAuthor };

/** Insère des lignes d'historique (dans la transaction de l'appelant). */
export async function insertHistory(
	db: Db,
	characterId: string,
	drafts: HistoryDraft[]
): Promise<void> {
	if (drafts.length === 0) return;
	await db.insert(characterHistory).values(
		drafts.map(({ author, ...rest }) => ({
			...rest,
			characterId,
			actorName: author.actorName,
			actorAccountId: author.actorAccountId,
			actorRole: author.actorRole
		}))
	);
}

/** Lit un personnage non rayé (verrouillé si `lock`) ; absent ⇒ 404. */
export async function loadCharacter(
	db: Db,
	id: string,
	options: { lock?: boolean; includeStruck?: boolean } = {}
): Promise<Character> {
	const where = options.includeStruck
		? eq(characters.id, id)
		: and(eq(characters.id, id), characterIsActive);
	const query = db.select().from(characters).where(where);
	const rows = options.lock ? await query.for('update') : await query;
	const row = rows[0];
	if (!row) throw NpError.notFound('Personnage introuvable.');
	return row;
}

/**
 * Mise à jour d'une fiche sous contrôle de version : `UPDATE … WHERE id = $1 AND revision = $2`,
 * `revision + 1` ; zéro ligne ⇒ 409 (04 §6). Renvoie la nouvelle révision.
 */
export async function updateCharacterChecked(
	db: Db,
	characterId: string,
	expectedRevision: number,
	set: Partial<Omit<NewCharacter, 'revision' | 'id'>>
): Promise<number> {
	const rows = await db
		.update(characters)
		.set({ ...set, revision: sql`${characters.revision} + 1` })
		.where(
			and(
				eq(characters.id, characterId),
				eq(characters.revision, expectedRevision),
				characterIsActive
			)
		)
		.returning({ revision: characters.revision });
	if (rows.length === 0) throw NpError.versionConflict();
	return rows[0].revision;
}

function iso(value: Date | string | null | undefined): string {
	if (!value) return new Date(0).toISOString();
	return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

// ---------------------------------------------------------------------------
// Serments : définition courante de la base
// ---------------------------------------------------------------------------

async function loadOath(db: Db, oathId: string): Promise<Oath> {
	const [row] = await db.select().from(oaths).where(eq(oaths.id, oathId));
	if (!row) throw NpError.notFound('Serment introuvable.');
	return row;
}

function growthOf(oath: Oath): Growth {
	return { pvN: oath.pvGrowth, epN: oath.epGrowth, emN: oath.emGrowth };
}

/** Définition minimale pour les règles de paliers (`unlockedTiers`, `findBranch`). */
function definitionOf(oath: Oath): OathDefinition {
	const branch = (b: Oath['branches']['bA']): GameOathBranch | null =>
		b
			? {
					nom: b.nom,
					style: b.style ?? '',
					descPhys: b.descPhys,
					flavor: b.flavor,
					desc: b.desc,
					paliers: Array.isArray(b.paliers) ? b.paliers : []
				}
			: null;
	return {
		id: oath.id,
		name: oath.name,
		weapon: oath.weapon,
		growth: growthOf(oath),
		baseDamage: oath.baseDamage,
		damageType: oath.damageType,
		rank: oath.rank,
		hidden: oath.hidden,
		evolvesFrom: oath.evolvesFrom,
		icon: oath.icon,
		category: oath.category,
		lore: oath.lore,
		branches: {
			bA: branch(oath.branches?.bA),
			bB: branch(oath.branches?.bB),
			extraBranches: (oath.branches.extraBranches ?? []).map((b) => ({
				...b,
				style: b.style ?? ''
			}))
		},
		isBuiltin: oath.isBuiltin
	};
}

function progressionOf(c: Character): ProgressionState {
	return {
		level: c.level,
		xp: c.xp,
		pvCur: c.pvCur,
		pvMax: c.pvMax,
		epCur: c.epCur,
		epMax: c.epMax,
		emCur: c.emCur,
		emMax: c.emMax
	};
}

function tierViews(
	oath: Oath,
	branch: string,
	level: number
): { reached: TierView[]; next: TierView[] } {
	const result = unlockedTiers(definitionOf(oath), branch, level);
	if (!result.branch) return { reached: [], next: [] };
	const sorted = [...result.branch.paliers].sort((a, b) => a.niv - b.niv);
	const views = sorted.map((t, index) => ({
		level: t.niv,
		name: t.nom,
		cost: t.cout,
		description: t.desc,
		stage: tierStageLabel(index, sorted.length)
	}));
	const lvl = Math.max(1, level);
	return { reached: views.filter((t) => t.level <= lvl), next: views.filter((t) => t.level > lvl) };
}

// ---------------------------------------------------------------------------
// Vues
// ---------------------------------------------------------------------------

function itemView(item: CharacterItem): ItemView {
	return {
		id: item.id,
		name: item.name,
		category: item.category,
		qty: item.qty,
		description: item.description
	};
}

/** Construit la fiche complète (déjà filtrée : seules des données visibles du propriétaire et du staff). */
export async function buildSheet(db: Db, c: Character): Promise<SheetView> {
	const oath = await loadOath(db, c.oathId);
	let lineage: string | null = null;
	if (oath.evolvesFrom) {
		const [parent] = await db
			.select({ name: oaths.name })
			.from(oaths)
			.where(eq(oaths.id, oath.evolvesFrom));
		lineage = parent?.name ?? null;
	}
	const items = await db
		.select()
		.from(characterItems)
		.where(eq(characterItems.characterId, c.id))
		.orderBy(asc(characterItems.position), asc(characterItems.createdAt), asc(characterItems.id));
	const pendingRows = await db
		.select({
			resource: declarations.resource,
			total: sql<string>`coalesce(sum(${declarations.delta}), 0)`
		})
		.from(declarations)
		.where(and(eq(declarations.characterId, c.id), eq(declarations.status, 'proposee')))
		.groupBy(declarations.resource);
	const [account] = await db
		.select({ pseudo: accounts.pseudo })
		.from(accounts)
		.where(eq(accounts.characterId, c.id));

	const pendingDeclared = { pv: 0, ep: 0, em: 0 };
	for (const row of pendingRows) pendingDeclared[row.resource] = Number(row.total);

	const gems = GEM_KINDS.map((kind) => ({
		kind,
		label: GEM_META[kind].label,
		color: GEM_META[kind].color,
		qty: gemStock(items, kind)
	})).filter((g) => g.qty > 0);

	const branch = c.branch && c.branch !== NO_BRANCH ? c.branch : null;
	return {
		id: c.id,
		name: c.name,
		portraitUrl: c.avatarUrl,
		oath: {
			id: oath.id,
			name: oath.name,
			rank: oath.rank,
			rankLabel: OATH_RANK_LABELS[oath.rank],
			weapon: c.weapon || oath.weapon,
			lineage,
			category: oath.category
		},
		branch,
		level: c.level,
		xp: c.xp,
		xpMax: xpMax(c.level),
		pv: { cur: c.pvCur, max: c.pvMax },
		ep: { cur: c.epCur, max: c.epMax },
		em: { cur: c.emCur, max: c.emMax },
		pendingDeclared,
		statuses: (c.statuses ?? []).map((s) => ({
			id: s.id,
			...statusMeta(s.id),
			turns: null,
			note: s.desc ?? ''
		})),
		gems,
		equipment: {
			helmet: c.equipment?.helmet ?? null,
			chest: c.equipment?.chest ?? null,
			legs: c.equipment?.legs ?? null
		},
		items: items.filter((i) => i.qty > 0).map(itemView),
		tiers: tierViews(oath, c.branch, c.level),
		releveAt: iso(c.updatedAt),
		linkedPseudo: account?.pseudo ?? null,
		revision: c.revision
	};
}

function consequenceView(h: CharacterHistoryEntry, struck: boolean): ConsequenceView {
	const stamped = (h.actorRole === 'mj' || h.actorRole === 'admin') && h.motif.trim() !== '';
	return {
		id: String(h.id),
		at: iso(h.ts),
		kind: h.type,
		text: h.text,
		field: h.field ?? null,
		oldValue: h.oldValue ?? null,
		newValue: h.newValue ?? null,
		stamp: stamped ? stampView(h.actorRole, h.actorName) : null,
		signature: h.actorRole === 'joueur' ? 'toi' : h.actorRole === 'regles' ? 'regles' : null,
		motif: h.motif,
		struck,
		combatId: h.combatId ?? null,
		replacesId: h.replacesId != null ? String(h.replacesId) : null
	};
}

async function consequencesFor(
	db: Db,
	characterId: string,
	rows: CharacterHistoryEntry[]
): Promise<ConsequenceView[]> {
	if (rows.length === 0) return [];
	const replaced = await db
		.select({ id: characterHistory.replacesId })
		.from(characterHistory)
		.where(
			and(
				eq(characterHistory.characterId, characterId),
				inArray(
					characterHistory.replacesId,
					rows.map((r) => r.id)
				)
			)
		);
	const struck = new Set(replaced.map((r) => r.id));
	return rows.map((r) => consequenceView(r, struck.has(r.id)));
}

function filterCondition(filter: ConsequenceFilter | undefined): SQL | undefined {
	switch (filter) {
		case 'xp':
			return inArray(characterHistory.type, ['xp', 'level']);
		case 'gemme':
			return eq(characterHistory.type, 'gemme');
		case 'combat':
			return eq(characterHistory.type, 'combat');
		case 'item':
			return eq(characterHistory.type, 'item');
		case 'status':
			return eq(characterHistory.field, 'status');
		case 'serment':
			return eq(characterHistory.type, 'serment');
		default:
			return undefined;
	}
}

/** Le propriétaire, ou un rôle qui lit toutes les fiches ; sinon 403. */
function assertCanReadCharacter(actor: Actor | null, characterId: string): Actor {
	const present = requireActor(actor);
	if (present.characterId === characterId) return present;
	if (!can(present.role, 'characters.read_all')) throw NpError.forbidden();
	return present;
}

// ---------------------------------------------------------------------------
// Lectures
// ---------------------------------------------------------------------------

/**
 * Fiche du personnage relié au compte ; `null` si le compte attend sa liaison ou si la fiche
 * liée n'existe plus (l'interface distingue les deux par `actor.characterId`, 03-vision §5.2).
 */
export async function getOwnSheet(db: Db, actor: Actor | null): Promise<SheetView | null> {
	const present = requireActor(actor);
	if (!present.characterId) return null;
	const [row] = await db
		.select()
		.from(characters)
		.where(and(eq(characters.id, present.characterId), characterIsActive));
	return row ? buildSheet(db, row) : null;
}

/** Fiche d'un personnage (MJ, admin ; le propriétaire aussi). */
export async function getSheet(
	db: Db,
	actor: Actor | null,
	characterId: string
): Promise<SheetView> {
	assertCanReadCharacter(actor, characterId);
	return buildSheet(db, await loadCharacter(db, characterId));
}

/** Liste du staff (03-vision §5.10) : recherche, filtre par Serment, relié / non relié. */
export async function listCharacters(
	db: Db,
	actor: Actor | null,
	input: ListCharactersInput = {}
): Promise<CharacterRowView[]> {
	assertCan(actor, 'characters.read_all');
	const filters = parseInput(listCharactersSchema, input);
	const conditions: SQL[] = [characterIsActive];
	if (filters.oathId) conditions.push(eq(characters.oathId, filters.oathId));
	if (filters.linked === true) conditions.push(isNotNull(accounts.id));
	if (filters.linked === false) conditions.push(isNull(accounts.id));
	if (filters.search) {
		const like = `%${filters.search.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
		const match = or(
			ilike(characters.name, like),
			ilike(oaths.name, like),
			ilike(characters.branch, like),
			ilike(accounts.pseudo, like)
		);
		if (match) conditions.push(match);
	}
	const rows = await db
		.select({ c: characters, oath: oaths, pseudo: accounts.pseudo })
		.from(characters)
		.innerJoin(oaths, eq(oaths.id, characters.oathId))
		.leftJoin(accounts, eq(accounts.characterId, characters.id))
		.where(and(...conditions))
		.orderBy(asc(characters.name), asc(characters.id));
	if (rows.length === 0) return [];

	const stamps = await db
		.selectDistinctOn([characterHistory.characterId], {
			characterId: characterHistory.characterId,
			ts: characterHistory.ts,
			actorRole: characterHistory.actorRole,
			actorName: characterHistory.actorName,
			motif: characterHistory.motif
		})
		.from(characterHistory)
		.where(
			and(
				inArray(
					characterHistory.characterId,
					rows.map((r) => r.c.id)
				),
				inArray(characterHistory.actorRole, ['mj', 'admin']),
				sql`btrim(${characterHistory.motif}) <> ''`
			)
		)
		.orderBy(characterHistory.characterId, desc(characterHistory.ts), desc(characterHistory.id));
	const lastStamp = new Map(stamps.map((s) => [s.characterId, s]));

	return rows.map(({ c, oath, pseudo }) => {
		const s = lastStamp.get(c.id);
		return {
			id: c.id,
			name: c.name,
			oath: {
				id: oath.id,
				name: oath.name,
				rank: oath.rank,
				rankLabel: OATH_RANK_LABELS[oath.rank]
			},
			level: c.level,
			pv: { cur: c.pvCur, max: c.pvMax },
			ep: { cur: c.epCur, max: c.epMax },
			em: { cur: c.emCur, max: c.emMax },
			linkedPseudo: pseudo ?? null,
			lastStamp: s
				? { at: iso(s.ts), ...stampView(s.actorRole, s.actorName), motif: s.motif }
				: null,
			revision: c.revision
		};
	});
}

/**
 * Conséquences d'un personnage, 20 par page, les plus récentes d'abord (03-vision §5.4).
 * Sans `characterId` : le personnage relié au compte.
 */
export async function listConsequences(
	db: Db,
	actor: Actor | null,
	input: ListConsequencesInput = {}
): Promise<ConsequencePageView> {
	const present = requireActor(actor);
	const data = parseInput(listConsequencesSchema, input);
	const characterId = data.characterId ?? present.characterId;
	if (!characterId)
		throw new NpError('NOT_LINKED', 'Ton compte attend sa liaison à un personnage.', 403);
	assertCanReadCharacter(present, characterId);
	await loadCharacter(db, characterId);

	const where = and(
		eq(characterHistory.characterId, characterId),
		filterCondition(data.filter),
		data.combatId ? eq(characterHistory.combatId, data.combatId) : undefined
	);
	const [{ total }] = await db.select({ total: count() }).from(characterHistory).where(where);
	const pages = Math.max(1, Math.ceil(total / CONSEQUENCES_PAGE_SIZE));
	const page = Math.min(Math.max(1, data.page ?? 1), pages);
	const rows = await db
		.select()
		.from(characterHistory)
		.where(where)
		.orderBy(desc(characterHistory.ts), desc(characterHistory.id))
		.limit(CONSEQUENCES_PAGE_SIZE)
		.offset((page - 1) * CONSEQUENCES_PAGE_SIZE);
	return { rows: await consequencesFor(db, characterId, rows), page, pages };
}

/**
 * Données complètes de la fiche pour l'export PDF (audit 02 §13.2) : fiche et toutes les
 * conséquences. Sans `characterId` : la fiche du joueur. Un administrateur peut exporter un
 * personnage rayé (03-vision §5.10 : « reste exportable »).
 */
export async function sheetForExport(
	db: Db,
	actor: Actor | null,
	characterId?: string
): Promise<SheetExportView> {
	const present = requireActor(actor);
	const id = characterId ?? present.characterId;
	if (!id) throw new NpError('NOT_LINKED', 'Ton compte attend sa liaison à un personnage.', 403);
	assertCanReadCharacter(present, id);
	const c = await loadCharacter(db, id, {
		includeStruck: can(present.role, 'characters.identity')
	});
	const rows = await db
		.select()
		.from(characterHistory)
		.where(eq(characterHistory.characterId, id))
		.orderBy(desc(characterHistory.ts), desc(characterHistory.id));
	return {
		sheet: await buildSheet(db, c),
		consequences: await consequencesFor(db, id, rows),
		exportedAt: new Date().toISOString()
	};
}

// ---------------------------------------------------------------------------
// Mutations du staff (MJ, admin) — chacune : tampon + révision + journal staff + audit
// ---------------------------------------------------------------------------

/** Création (audit 02 §1.3, audit 08 §3.3 `addPlayer`) : bases 30/50/20, niveau 1, arme du Serment. */
export async function createCharacter(
	db: Db,
	actor: Actor | null,
	input: CreateCharacterInput
): Promise<SheetView> {
	const who = assertCan(actor, 'characters.create');
	const data = parseInput(createCharacterSchema, input);
	return db.transaction(async (tx) => {
		await assertFreshAccount(tx, who);
		const oath = await loadOath(tx, data.oathId);
		// Le sélecteur de création ne propose que les Serments visibles (audit 02 §4.1, main.js:9463).
		if (oath.hidden) {
			throw new NpError('INVALID', "Ce Serment n'est pas proposé à la création.", 400);
		}
		const id = `p_${nanoid(16)}`;
		await tx.insert(characters).values({
			id,
			name: data.name,
			oathId: oath.id,
			branch: NO_BRANCH,
			level: 1,
			xp: 0,
			pvCur: 30,
			pvMax: 30,
			epCur: 50,
			epMax: 50,
			emCur: 20,
			emMax: 20,
			weapon: oath.weapon,
			avatarUrl: data.portraitUrl ?? '',
			progressionVersion: 1,
			equipment: { helmet: null, chest: null, legs: null },
			statuses: []
		});
		await insertHistory(tx, id, [
			{
				type: 'add',
				text: `Personnage créé : ${data.name} (${oath.name}).`,
				field: 'note',
				newValue: data.name,
				motif: data.motif || 'Nouveau personnage.',
				author: stampAuthor(who)
			}
		]);
		await appendStaffLog(tx, {
			action: 'personnage_cree',
			detail: `Personnage '${data.name}' (${oath.name}) créé`,
			actor: who,
			target: data.name
		});
		await recordAudit(tx, {
			source: 'characters',
			action: 'character_create',
			actor: who,
			details: { characterId: id, oathId: oath.id }
		});
		return buildSheet(tx, await loadCharacter(tx, id));
	});
}

const RESOURCE_COLUMNS = {
	pv: { cur: 'pvCur', max: 'pvMax' },
	ep: { cur: 'epCur', max: 'epMax' },
	em: { cur: 'emCur', max: 'emMax' }
} as const satisfies Record<ResourceKey, { cur: keyof Character; max: keyof Character }>;

/** Correction d'une ressource : ancienne → nouvelle valeur, motif obligatoire (03-vision §5.10). */
export async function correctResource(
	db: Db,
	actor: Actor | null,
	input: CorrectResourceInput
): Promise<SheetView> {
	const who = assertCan(actor, 'characters.stamp');
	requireRevision(input);
	const data = parseInput(correctResourceSchema, input);
	return db.transaction(async (tx) => {
		await assertFreshAccount(tx, who);
		const c = await loadCharacter(tx, data.characterId, { lock: true });
		const cols = RESOURCE_COLUMNS[data.resource];
		const old = c[cols.cur];
		const max = c[cols.max];
		if (data.newValue > max) {
			throw new NpError('INVALID', `La valeur doit rester entre 0 et ${max}.`, 400);
		}
		if (data.newValue === old) {
			throw new NpError('INVALID', 'La nouvelle valeur est identique à l’ancienne.', 400);
		}
		let replacesId: number | null = null;
		if (data.replacesId) {
			const [target] = await tx
				.select({ id: characterHistory.id })
				.from(characterHistory)
				.where(
					and(
						eq(characterHistory.id, Number(data.replacesId)),
						eq(characterHistory.characterId, c.id)
					)
				);
			if (!target) throw NpError.notFound('Conséquence introuvable.');
			replacesId = target.id;
		}
		const set =
			data.resource === 'pv'
				? { pvCur: data.newValue }
				: data.resource === 'ep'
					? { epCur: data.newValue }
					: { emCur: data.newValue };
		await updateCharacterChecked(tx, c.id, data.expectedRevision, set);
		const label = RESOURCE_LABELS[data.resource];
		await insertHistory(tx, c.id, [
			{
				type: 'stat',
				text: `${label} : ${old} → ${data.newValue}.`,
				field: data.resource,
				oldValue: String(old),
				newValue: String(data.newValue),
				motif: data.motif,
				replacesId,
				author: stampAuthor(who)
			}
		]);
		await appendStaffLog(tx, {
			action: 'ressource_corrigee',
			detail: `[${c.name}] ${label} : ${old} → ${data.newValue} — ${data.motif}`,
			actor: who,
			target: c.name
		});
		await recordAudit(tx, {
			source: 'characters',
			action: 'character_correct_resource',
			actor: who,
			details: { characterId: c.id, resource: data.resource, old, new: data.newValue }
		});
		return buildSheet(tx, await loadCharacter(tx, c.id));
	});
}

function xpValue(level: number, xp: number, showLevel: boolean): string {
	return showLevel ? `niv. ${level} · ${xp} XP` : String(xp);
}

/** Lignes « level » des règles (montées de niveau, gains par Serment), signées « Système ». */
function levelDrafts(
	entries: { type: string; text: string }[],
	levelsReached: number[]
): HistoryDraft[] {
	return entries
		.filter((e) => e.type === 'level')
		.map((e, i) => ({
			type: 'level' as const,
			text: e.text,
			field: 'level' as const,
			oldValue: String(levelsReached[i] - 1),
			newValue: String(levelsReached[i]),
			author: RULES_AUTHOR
		}));
}

/**
 * XP de combat : `ceil(niveau de la créature × 10 × participation %)` puis montées de niveau
 * (audit 02 §2.2, §2.4 ; `applyXp`). Refus si l'XP vaut 0 (« XP = 0. Ajuste la participation. »).
 */
export async function grantCombatXp(
	db: Db,
	actor: Actor | null,
	input: GrantCombatXpInput
): Promise<SheetView> {
	const who = assertCan(actor, 'characters.stamp');
	requireRevision(input);
	const data = parseInput(grantCombatXpSchema, input);
	const gain = combatXp(data.beastLevel, data.participationPct);
	if (gain <= 0) throw new NpError('INVALID', 'XP = 0. Ajuste la participation.', 400);
	return db.transaction(async (tx) => {
		await assertFreshAccount(tx, who);
		const c = await loadCharacter(tx, data.characterId, { lock: true });
		if (data.combatId) {
			const [combat] = await tx
				.select({ id: combats.id })
				.from(combats)
				.where(eq(combats.id, data.combatId));
			if (!combat) throw NpError.notFound('Combat introuvable.');
		}
		const oath = await loadOath(tx, c.oathId);
		const applied = applyXp(progressionOf(c), gain, growthOf(oath), { rank: oath.rank });
		const next = applied.character;
		await updateCharacterChecked(tx, c.id, data.expectedRevision, {
			level: next.level,
			xp: next.xp,
			pvCur: next.pvCur,
			pvMax: next.pvMax,
			epCur: next.epCur,
			epMax: next.epMax,
			emCur: next.emCur,
			emMax: next.emMax
		});
		const leveled = applied.levelsGained > 0;
		const beastName = data.beastName || `créature de niveau ${data.beastLevel}`;
		await insertHistory(tx, c.id, [
			{
				type: 'xp',
				text: combatXpEntryText(gain, beastName, data.participationPct),
				field: 'xp',
				oldValue: xpValue(c.level, c.xp, leveled),
				newValue: xpValue(next.level, next.xp, leveled),
				motif: data.motif,
				combatId: data.combatId ?? null,
				author: stampAuthor(who)
			},
			...levelDrafts(applied.entries, applied.levelsReached)
		]);
		await appendStaffLog(tx, {
			action: 'xp_combat',
			detail: `[${c.name}] +${gain} XP (${beastName}, ${data.participationPct}%) — ${data.motif}`,
			actor: who,
			target: c.name
		});
		await recordAudit(tx, {
			source: 'characters',
			action: 'character_grant_xp',
			actor: who,
			details: { characterId: c.id, xp: gain, levelsGained: applied.levelsGained }
		});
		return buildSheet(tx, await loadCharacter(tx, c.id));
	});
}

/**
 * Fusion de Gemmes de Sang (+5 / +20 / +50 par gemme, audit 02 §6) : retrait du stock et crédit
 * d'XP dans UNE transaction ; refus si le stock est insuffisant.
 */
export async function fuseGems(
	db: Db,
	actor: Actor | null,
	input: FuseGemsInput
): Promise<SheetView> {
	const who = assertCan(actor, 'characters.stamp');
	requireRevision(input);
	const data = parseInput(fuseGemsSchema, input);
	return db.transaction(async (tx) => {
		await assertFreshAccount(tx, who);
		const c = await loadCharacter(tx, data.characterId, { lock: true });
		const items = await tx
			.select()
			.from(characterItems)
			.where(eq(characterItems.characterId, c.id))
			.orderBy(asc(characterItems.position), asc(characterItems.createdAt), asc(characterItems.id))
			.for('update');
		const oath = await loadOath(tx, c.oathId);
		const author = stampAuthor(who);
		const result = fuseGemsRule(progressionOf(c), items, data.kind, data.qty, growthOf(oath), {
			rank: oath.rank,
			actorName: author.actorName
		});
		if (!result.ok) throw new NpError(result.code, result.message, 409);
		const next = result.character;
		await updateCharacterChecked(tx, c.id, data.expectedRevision, {
			level: next.level,
			xp: next.xp,
			pvCur: next.pvCur,
			pvMax: next.pvMax,
			epCur: next.epCur,
			epMax: next.epMax,
			emCur: next.emCur,
			emMax: next.emMax
		});
		for (let i = 0; i < items.length; i++) {
			if (result.items[i].qty !== items[i].qty) {
				await tx
					.update(characterItems)
					.set({ qty: result.items[i].qty })
					.where(eq(characterItems.id, items[i].id));
			}
		}
		const gemEntry = result.entries.find((e) => e.type === 'gemme');
		const leveled = result.levelsGained > 0;
		await insertHistory(tx, c.id, [
			{
				type: 'gemme',
				text:
					gemEntry?.text ??
					`+${result.total} XP (fusion de ${result.qty}× ${GEM_NAMES[data.kind]})`,
				field: 'xp',
				oldValue: xpValue(c.level, c.xp, leveled),
				newValue: xpValue(next.level, next.xp, leveled),
				motif: data.motif,
				author
			},
			...levelDrafts(result.entries, result.levelsReached)
		]);
		await appendStaffLog(tx, {
			action: 'gemmes_fusionnees',
			detail: `[${c.name}] ${result.qty}× ${GEM_NAMES[data.kind]} → +${result.total} XP — ${data.motif}`,
			actor: who,
			target: c.name
		});
		await recordAudit(tx, {
			source: 'characters',
			action: 'character_fuse_gems',
			actor: who,
			details: { characterId: c.id, kind: data.kind, qty: result.qty, xp: result.total }
		});
		return buildSheet(tx, await loadCharacter(tx, c.id));
	});
}

/** Retrouve un objet DANS un personnage, par identifiant technique ou hérité (04 §10.3). */
async function findItemOf(
	db: Db,
	characterId: string,
	itemId: string,
	lock: boolean
): Promise<CharacterItem | null> {
	const query = db
		.select()
		.from(characterItems)
		.where(
			and(
				eq(characterItems.characterId, characterId),
				or(eq(characterItems.id, itemId), eq(characterItems.legacyId, itemId))
			)
		)
		.orderBy(asc(characterItems.position));
	const rows = lock ? await query.for('update') : await query;
	return rows.find((r) => r.id === itemId) ?? rows[0] ?? null;
}

const withNote = (text: string, note: string | undefined) => (note ? `${text} — ${note}` : text);

/**
 * Ajout d'objet (audit 02 §7.2) : cumul si même nom ET même catégorie, sinon nouvel objet.
 * Ligne « Ajout : q× nom — note ».
 */
export async function addItem(
	db: Db,
	actor: Actor | null,
	input: AddItemInput
): Promise<SheetView> {
	const who = assertCan(actor, 'characters.stamp');
	requireRevision(input);
	const data = parseInput(addItemSchema, input);
	return db.transaction(async (tx) => {
		await assertFreshAccount(tx, who);
		const c = await loadCharacter(tx, data.characterId, { lock: true });
		await updateCharacterChecked(tx, c.id, data.expectedRevision, {});
		const items = await tx
			.select()
			.from(characterItems)
			.where(eq(characterItems.characterId, c.id))
			.for('update');
		const existing = items.find((i) => i.name === data.name && i.category === data.category);
		let oldQty: number | null = null;
		let newQty: number;
		if (existing) {
			oldQty = existing.qty;
			newQty = existing.qty + data.qty;
			await tx
				.update(characterItems)
				.set({
					qty: newQty,
					...(data.description ? { description: data.description } : {})
				})
				.where(eq(characterItems.id, existing.id));
		} else {
			newQty = data.qty;
			const position = items.reduce((m, i) => Math.max(m, i.position + 1), 0);
			await tx.insert(characterItems).values({
				id: `i_${nanoid(16)}`,
				characterId: c.id,
				name: data.name,
				category: data.category,
				qty: newQty,
				description: data.description ?? '',
				position
			});
		}
		await insertHistory(tx, c.id, [
			{
				type: 'item',
				text: withNote(`Ajout : ${data.qty}× ${data.name}`, data.note),
				field: 'item',
				oldValue: oldQty === null ? null : `${data.name} ×${oldQty}`,
				newValue: `${data.name} ×${newQty}`,
				motif: data.motif,
				author: stampAuthor(who)
			}
		]);
		await appendStaffLog(tx, {
			action: 'objet_ajoute',
			detail: `[${c.name}] Ajout : ${data.qty}× ${data.name} — ${data.motif}`,
			actor: who,
			target: c.name
		});
		await recordAudit(tx, {
			source: 'characters',
			action: 'character_add_item',
			actor: who,
			details: { characterId: c.id, name: data.name, category: data.category, qty: data.qty }
		});
		return buildSheet(tx, await loadCharacter(tx, c.id));
	});
}

/** Retrait d'objet (audit 02 §7.2) : quantité planchée à 0, l'objet reste stocké. */
export async function removeItem(
	db: Db,
	actor: Actor | null,
	input: RemoveItemInput
): Promise<SheetView> {
	const who = assertCan(actor, 'characters.stamp');
	requireRevision(input);
	const data = parseInput(removeItemSchema, input);
	return db.transaction(async (tx) => {
		await assertFreshAccount(tx, who);
		const c = await loadCharacter(tx, data.characterId, { lock: true });
		const item = await findItemOf(tx, c.id, data.itemId, true);
		if (!item) throw NpError.notFound('Item introuvable dans cet inventaire.');
		await updateCharacterChecked(tx, c.id, data.expectedRevision, {});
		if (!Number.isSafeInteger(item.qty) || item.qty <= 0) {
			throw new NpError('ITEM_UNAVAILABLE', "Cet item n'est plus disponible.", 409);
		}
		const newQty = Math.max(0, item.qty - data.qty);
		const removed = item.qty - newQty;
		await tx.update(characterItems).set({ qty: newQty }).where(eq(characterItems.id, item.id));
		await insertHistory(tx, c.id, [
			{
				type: 'item',
				text: withNote(`Retrait : ${removed}× ${item.name}`, data.note),
				field: 'item',
				oldValue: `${item.name} ×${item.qty}`,
				newValue: `${item.name} ×${newQty}`,
				motif: data.motif,
				author: stampAuthor(who)
			}
		]);
		await appendStaffLog(tx, {
			action: 'objet_retire',
			detail: `[${c.name}] Retrait : ${removed}× ${item.name} — ${data.motif}`,
			actor: who,
			target: c.name
		});
		await recordAudit(tx, {
			source: 'characters',
			action: 'character_remove_item',
			actor: who,
			details: { characterId: c.id, itemId: item.id, qty: removed }
		});
		return buildSheet(tx, await loadCharacter(tx, c.id));
	});
}

function statusText(id: string, note: string): string {
	const { label } = statusMeta(id);
	return note ? `${label} (${note})` : label;
}

/** Pose un des 12 statuts (audit 02 §10) ; un statut déjà posé voit sa note remplacée. */
export async function setStatus(
	db: Db,
	actor: Actor | null,
	input: SetStatusInput
): Promise<SheetView> {
	const who = assertCan(actor, 'characters.stamp');
	requireRevision(input);
	const data = parseInput(setStatusSchema, input);
	return db.transaction(async (tx) => {
		await assertFreshAccount(tx, who);
		const c = await loadCharacter(tx, data.characterId, { lock: true });
		const author = stampAuthor(who);
		const statuses: CharacterStatus[] = [...(c.statuses ?? [])];
		const index = statuses.findIndex((s) => s.id === data.statusId);
		const note = data.note?.trim() || statuses[index]?.desc || '';
		const previous = index >= 0 ? statuses[index] : null;
		if (!previous && statuses.length >= LIMITS.statuses) {
			throw new NpError('INVALID', `${LIMITS.statuses} statuts au plus.`, 400);
		}
		const next: CharacterStatus =
			previous && !data.note?.trim()
				? previous
				: {
						id: data.statusId,
						desc: note,
						posedBy: author.actorName,
						posedAt: Date.now()
					};
		if (previous) statuses[index] = next;
		else statuses.push(next);
		await updateCharacterChecked(tx, c.id, data.expectedRevision, { statuses });
		const label = statusMeta(data.statusId).label;
		await insertHistory(tx, c.id, [
			{
				type: 'stat',
				text: `⚠ ${statusText(data.statusId, note)}`,
				field: 'status',
				oldValue: previous ? statusText(previous.id, previous.desc) : null,
				newValue: statusText(data.statusId, note),
				motif: data.motif,
				author
			}
		]);
		await appendStaffLog(tx, {
			action: 'statut_pose',
			detail: `[${c.name}] ${label} posé — ${data.motif}`,
			actor: who,
			target: c.name
		});
		await recordAudit(tx, {
			source: 'characters',
			action: 'character_set_status',
			actor: who,
			details: { characterId: c.id, statusId: data.statusId }
		});
		return buildSheet(tx, await loadCharacter(tx, c.id));
	});
}

/** Retire un statut posé (« ✓ Retiré : <label> », audit 02 §8). */
export async function removeStatus(
	db: Db,
	actor: Actor | null,
	input: RemoveStatusInput
): Promise<SheetView> {
	const who = assertCan(actor, 'characters.stamp');
	requireRevision(input);
	const data = parseInput(removeStatusSchema, input);
	return db.transaction(async (tx) => {
		await assertFreshAccount(tx, who);
		const c = await loadCharacter(tx, data.characterId, { lock: true });
		const statuses = c.statuses ?? [];
		const previous = statuses.find((s) => s.id === data.statusId);
		if (!previous) throw NpError.notFound("Ce statut n'est pas posé.");
		await updateCharacterChecked(tx, c.id, data.expectedRevision, {
			statuses: statuses.filter((s) => s.id !== data.statusId)
		});
		const label = statusMeta(data.statusId).label;
		await insertHistory(tx, c.id, [
			{
				type: 'stat',
				text: `✓ Retiré : ${label}`,
				field: 'status',
				oldValue: statusText(previous.id, previous.desc),
				newValue: null,
				motif: data.motif,
				author: stampAuthor(who)
			}
		]);
		await appendStaffLog(tx, {
			action: 'statut_retire',
			detail: `[${c.name}] ${label} retiré — ${data.motif}`,
			actor: who,
			target: c.name
		});
		await recordAudit(tx, {
			source: 'characters',
			action: 'character_remove_status',
			actor: who,
			details: { characterId: c.id, statusId: data.statusId }
		});
		return buildSheet(tx, await loadCharacter(tx, c.id));
	});
}

/** Équipement : Casque, Plastron, Jambières (audit 02 §7.4) ; une ligne par emplacement changé. */
export async function setEquipment(
	db: Db,
	actor: Actor | null,
	input: SetEquipmentInput
): Promise<SheetView> {
	const who = assertCan(actor, 'characters.stamp');
	requireRevision(input);
	const data = parseInput(setEquipmentSchema, input);
	return db.transaction(async (tx) => {
		await assertFreshAccount(tx, who);
		const c = await loadCharacter(tx, data.characterId, { lock: true });
		const current: Equipment = {
			helmet: c.equipment?.helmet ?? null,
			chest: c.equipment?.chest ?? null,
			legs: c.equipment?.legs ?? null
		};
		const next: Equipment = { ...current };
		const drafts: HistoryDraft[] = [];
		const author = stampAuthor(who);
		for (const slot of EQUIPMENT_SLOTS) {
			const raw = data.equipment[slot];
			if (raw === undefined) continue;
			const value = raw === null || raw === '' ? null : raw;
			if (value === current[slot]) continue;
			next[slot] = value;
			drafts.push({
				type: 'stat',
				text: `${EQUIPMENT_LABELS[slot]} : ${current[slot] ?? 'rien'} → ${value ?? 'rien'}`,
				field: 'equipment',
				oldValue: current[slot],
				newValue: value,
				motif: data.motif,
				author
			});
		}
		if (drafts.length === 0) throw new NpError('INVALID', 'Rien à changer.', 400);
		await updateCharacterChecked(tx, c.id, data.expectedRevision, { equipment: next });
		await insertHistory(tx, c.id, drafts);
		await appendStaffLog(tx, {
			action: 'equipement_modifie',
			detail: `[${c.name}] ${drafts.map((d) => d.text).join(' ; ')} — ${data.motif}`,
			actor: who,
			target: c.name
		});
		await recordAudit(tx, {
			source: 'characters',
			action: 'character_set_equipment',
			actor: who,
			details: { characterId: c.id, equipment: next }
		});
		return buildSheet(tx, await loadCharacter(tx, c.id));
	});
}

/**
 * Opérations sensibles (admin) : nom, Serment, branche, arme, niveau ± (03-vision §5.10 ;
 * audit 02 §2.5 `adjVal('level')`, §4.4, `saveChangeSerm` main.js:7047).
 * Un changement de Serment conserve niveau et XP et reprend l'arme du nouveau Serment ; une branche
 * qui n'existe pas dans le nouveau Serment revient à « Aucune ».
 */
export async function updateIdentity(
	db: Db,
	actor: Actor | null,
	input: UpdateIdentityInput
): Promise<SheetView> {
	const who = assertCan(actor, 'characters.identity');
	requireRevision(input);
	const data = parseInput(updateIdentitySchema, input);
	return db.transaction(async (tx) => {
		await assertFreshAccount(tx, who);
		const c = await loadCharacter(tx, data.characterId, { lock: true });
		const author = stampAuthor(who);
		const motif = data.motif;
		const drafts: HistoryDraft[] = [];
		const set: Partial<Omit<NewCharacter, 'revision' | 'id'>> = {};

		if (data.name !== undefined && data.name !== c.name) {
			set.name = data.name;
			drafts.push({
				type: 'stat',
				text: `Nom : ${c.name} → ${data.name}`,
				field: 'note',
				oldValue: c.name,
				newValue: data.name,
				motif,
				author
			});
		}

		const currentOath = await loadOath(tx, c.oathId);
		let oath = currentOath;
		if (data.oathId !== undefined && data.oathId !== c.oathId) {
			oath = await loadOath(tx, data.oathId);
			set.oathId = oath.id;
			drafts.push({
				type: 'serment',
				text: `Serment : ${currentOath.name} → ${oath.name}`,
				field: 'oath',
				oldValue: currentOath.name,
				newValue: oath.name,
				motif,
				author
			});
			if (data.weapon === undefined && oath.weapon !== c.weapon) set.weapon = oath.weapon;
		}

		const definition = definitionOf(oath);
		let branch = c.branch;
		if (data.branch !== undefined) {
			if (data.branch === NO_BRANCH) branch = NO_BRANCH;
			else {
				const found = findBranch(definition, data.branch);
				if (!found) throw new NpError('INVALID', 'Branche inconnue pour ce Serment.', 400);
				branch = found.nom;
			}
		} else if (branch !== NO_BRANCH && !findBranch(definition, branch)) {
			branch = NO_BRANCH;
		}
		if (branch !== c.branch) {
			set.branch = branch;
			drafts.push({
				type: 'serment',
				text: `Branche : ${c.branch} → ${branch}`,
				field: 'branch',
				oldValue: c.branch,
				newValue: branch,
				motif,
				author
			});
		}

		const weapon = data.weapon ?? set.weapon;
		if (weapon !== undefined && weapon !== c.weapon) {
			set.weapon = weapon;
			drafts.push({
				type: 'stat',
				text: `Arme : ${c.weapon || 'aucune'} → ${weapon || 'aucune'}`,
				field: 'note',
				oldValue: c.weapon,
				newValue: weapon,
				motif,
				author
			});
		}

		if (data.levelDelta !== undefined) {
			const next = adjustLevel(progressionOf(c), data.levelDelta, growthOf(oath));
			if (next.level !== c.level) {
				Object.assign(set, {
					level: next.level,
					xp: next.xp,
					pvCur: next.pvCur,
					pvMax: next.pvMax,
					epCur: next.epCur,
					epMax: next.epMax,
					emCur: next.emCur,
					emMax: next.emMax
				});
				drafts.push({
					type: 'level',
					text: `Ajust. Niveau : ${c.level} → ${next.level}`,
					field: 'level',
					oldValue: String(c.level),
					newValue: String(next.level),
					motif,
					author
				});
			}
		}

		if (drafts.length === 0) throw new NpError('INVALID', 'Rien à changer.', 400);
		await updateCharacterChecked(tx, c.id, data.expectedRevision, set);
		await insertHistory(tx, c.id, drafts);
		await appendStaffLog(tx, {
			action: 'identite_modifiee',
			detail: `[${c.name}] ${drafts.map((d) => d.text).join(' ; ')} — ${motif}`,
			actor: who,
			target: c.name
		});
		await recordAudit(tx, {
			source: 'characters',
			action: 'character_update_identity',
			actor: who,
			details: { characterId: c.id, fields: drafts.map((d) => d.field) }
		});
		return buildSheet(tx, await loadCharacter(tx, c.id));
	});
}

/**
 * Rayer un personnage (admin, saisie dactylographiée du nom, 03-vision §5.10) : il sort de toutes
 * les pages (colonnes `struck_at`, `struck_by`, `struck_motif`), son compte est délié ; rien n'est
 * supprimé.
 */
export async function strikeCharacter(
	db: Db,
	actor: Actor | null,
	input: StrikeCharacterInput
): Promise<{ id: string; struckAt: string }> {
	const who = assertCan(actor, 'characters.identity');
	requireRevision(input);
	const data = parseInput(strikeCharacterSchema, input);
	return db.transaction(async (tx) => {
		await tx.execute(sql`select pg_advisory_xact_lock(298, 1)`);
		await assertFreshAccount(tx, who);
		await tx
			.select({ id: accounts.id })
			.from(accounts)
			.where(eq(accounts.characterId, data.characterId))
			.orderBy(accounts.id)
			.for('update');
		const c = await loadCharacter(tx, data.characterId, { lock: true });
		if (data.typedName !== c.name.trim()) {
			throw new NpError('INVALID', 'Le nom saisi ne correspond pas au personnage.', 400);
		}
		const struck = new Date();
		const struckAt = struck.toISOString();
		const motif = data.motif || 'Personnage rayé.';
		await updateCharacterChecked(tx, c.id, data.expectedRevision, {
			struckAt: struck,
			struckBy: who.accountId,
			struckMotif: motif
		});
		await tx
			.update(accounts)
			.set({ characterId: null, revision: sql`${accounts.revision} + 1` })
			.where(eq(accounts.characterId, c.id));
		await insertHistory(tx, c.id, [
			{
				type: 'add',
				text: `Personnage rayé : ${c.name}.`,
				field: 'note',
				oldValue: c.name,
				newValue: null,
				motif,
				author: stampAuthor(who)
			}
		]);
		await appendStaffLog(tx, {
			action: 'personnage_supprime',
			detail: `Personnage '${c.name}' rayé — ${motif}`,
			actor: who,
			target: c.name
		});
		await recordAudit(tx, {
			source: 'characters',
			action: 'character_strike',
			actor: who,
			details: { characterId: c.id }
		});
		return { id: c.id, struckAt };
	});
}

// ---------------------------------------------------------------------------
// Actions du joueur (commandes : l'identité vient de la session, 04 §6)
// ---------------------------------------------------------------------------

/** Portrait du propriétaire (`validateAvatar`, audit 05 §3.2) ; `''` retire le portrait. */
export async function setOwnPortrait(
	db: Db,
	actor: Actor | null,
	input: SetOwnPortraitInput
): Promise<SheetView> {
	const { actor: who, characterId } = requireOwnCharacter(actor);
	requireRevision(input);
	const data = parseInput(setOwnPortraitSchema, input);
	return db.transaction(async (tx) => {
		await assertFreshAccount(tx, who);
		const c = await loadCharacter(tx, characterId, { lock: true });
		await updateCharacterChecked(tx, c.id, data.expectedRevision, { avatarUrl: data.url });
		await recordAudit(tx, {
			source: 'characters',
			action: 'self_set_portrait',
			actor: who,
			details: {
				characterId: c.id,
				kind: data.url === '' ? 'none' : data.url.startsWith('data:') ? 'data' : 'url',
				length: data.url.length
			}
		});
		return buildSheet(tx, await loadCharacter(tx, c.id));
	});
}

/**
 * Consommation d'un objet par le joueur (audit 05 §5.5 `consume_own_item`, audit 06 I1-I4) :
 * transaction, objet cherché DANS le personnage de la session (04 §10.3), quantité − 1, ligne
 * « Consommé : <nom> — <note> » signée « <perso> (joueur) », révision du personnage incrémentée
 * (04 §10.7). Quantité non entière positive ⇒ 409 ITEM_UNAVAILABLE.
 */
export async function consumeOwnItem(
	db: Db,
	actor: Actor | null,
	input: ConsumeOwnItemInput
): Promise<SheetView> {
	const { actor: who, characterId } = requireOwnCharacter(actor);
	requireRevision(input);
	const data = parseInput(consumeOwnItemSchema, input);
	const note = (data.note ?? '').trim();
	return db.transaction(async (tx) => {
		await assertFreshAccount(tx, who);
		const c = await loadCharacter(tx, characterId, { lock: true });
		const item = await findItemOf(tx, c.id, data.itemId, true);
		if (!item) throw NpError.notFound('Item introuvable dans ton inventaire.');
		// Contrôle de version d'abord (audit 06 I4 : la seconde de deux consommations concurrentes
		// reçoit VERSION_CONFLICT) ; un échec plus loin annule cette incrémentation (transaction).
		await updateCharacterChecked(tx, c.id, data.expectedRevision, {});
		if (!Number.isSafeInteger(item.qty) || item.qty <= 0) {
			throw new NpError('ITEM_UNAVAILABLE', "Cet item n'est plus disponible.", 409);
		}
		await tx
			.update(characterItems)
			.set({ qty: sql`${characterItems.qty} - 1` })
			.where(and(eq(characterItems.id, item.id), sql`${characterItems.qty} > 0`));
		await insertHistory(tx, c.id, [
			{
				type: 'item',
				text: withNote(`Consommé : ${item.name}`, note || undefined),
				field: 'item',
				oldValue: `${item.name} ×${item.qty}`,
				newValue: `${item.name} ×${item.qty - 1}`,
				author: playerAuthor(who, c.name)
			}
		]);
		await recordAudit(tx, {
			source: 'characters',
			action: 'consume_own_item',
			actor: who,
			details: { characterId: c.id, itemId: item.id }
		});
		return buildSheet(tx, await loadCharacter(tx, c.id));
	});
}
