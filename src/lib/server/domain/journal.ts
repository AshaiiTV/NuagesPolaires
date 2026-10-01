// Journal du personnage (« Mes notes ») : entrées datées, corrections en rature, entrées rayées
// (06-contrats §B.3 ; 04 §3.12 `journal_entries` ; 03-vision §5.5, §12.2).
//
// Lecture : le propriétaire, les MJ et les administrateurs (03-vision §12.2) ; jamais un autre joueur.
// Écriture : le propriétaire seulement. Rien ne s'efface : corriger = nouvelle entrée qui pointe vers
// l'ancienne (`replaces_id`), l'ancienne reste lisible en rature ; rayer = `struck`.
// Transition (04 §3.12) : tant qu'aucune entrée n'existe, le texte de `characters.journal` est
// présenté comme première entrée « Avant le carnet » ; il est matérialisé à la première écriture.
import { and, asc, eq, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { Db } from '$lib/server/db';
import { journalEntries, type Character, type JournalEntry } from '$lib/server/db/schema';
import { NpError } from '$lib/server/http';
import { can, requireActor, requireOwnCharacter, type Actor } from '$lib/server/permissions';
import { recordAudit } from './audit';
import { loadCharacter, parseInput } from './characters';
import {
	BEFORE_NOTEBOOK_ID,
	BEFORE_NOTEBOOK_LABEL,
	JOURNAL_MAX_CHARS,
	JOURNAL_PAGE_SIZE,
	amendEntrySchema,
	listEntriesSchema,
	strikeEntrySchema,
	writeEntrySchema,
	type AmendEntryInput,
	type JournalEntryView,
	type JournalPageView,
	type ListEntriesInput,
	type StrikeEntryInput,
	type WriteEntryInput
} from '$lib/schemas/journal';

/** Identifiant de l'entrée matérialisée « Avant le carnet » d'un personnage. */
function beforeNotebookId(characterId: string): string {
	return `j_avant_${characterId}`;
}

function isBeforeNotebook(id: string): boolean {
	return id === BEFORE_NOTEBOOK_ID || id.startsWith('j_avant_');
}

type Node = {
	id: string;
	ts: Date;
	text: string;
	inScene: boolean;
	struck: boolean;
	replacesId: string | null;
};

function toNode(e: JournalEntry): Node {
	return {
		id: e.id,
		ts: e.ts,
		text: e.text,
		inScene: e.inScene,
		struck: e.struck,
		replacesId: e.replacesId
	};
}

/** Vue d'une entrée et de sa chaîne de versions raturées (garde contre un cycle hérité). */
function entryView(node: Node, byId: Map<string, Node>, depth = 0): JournalEntryView {
	const prev = node.replacesId && depth < 200 ? byId.get(node.replacesId) : undefined;
	return {
		id: node.id,
		at: node.ts.toISOString(),
		text: node.text,
		inScene: node.inScene,
		struck: node.struck,
		previous: prev ? entryView(prev, byId, depth + 1) : null,
		label: isBeforeNotebook(rootOf(node, byId).id) ? BEFORE_NOTEBOOK_LABEL : null
	};
}

function rootOf(node: Node, byId: Map<string, Node>): Node {
	let current = node;
	for (let i = 0; i < 200 && current.replacesId; i++) {
		const prev = byId.get(current.replacesId);
		if (!prev) break;
		current = prev;
	}
	return current;
}

/** Lecture autorisée : propriétaire, ou capacité `journal.read_all` (MJ, admin). */
function assertCanReadJournal(actor: Actor, characterId: string): void {
	if (actor.characterId === characterId) return;
	if (!can(actor.role, 'journal.read_all')) throw NpError.forbidden();
}

/** Matérialise « Avant le carnet » si l'ancien journal a un texte et qu'aucune entrée n'existe. */
async function materializeBeforeNotebook(db: Db, c: Character): Promise<string | null> {
	const text = (c.journal ?? '').trim();
	if (!text) return null;
	const existing = await db
		.select({ id: journalEntries.id })
		.from(journalEntries)
		.where(eq(journalEntries.characterId, c.id))
		.limit(1);
	if (existing.length > 0) return null;
	const id = beforeNotebookId(c.id);
	await db.insert(journalEntries).values({
		id,
		characterId: c.id,
		ts: c.createdAt,
		text: text.slice(0, JOURNAL_MAX_CHARS)
	});
	return id;
}

async function loadAllNodes(db: Db, characterId: string): Promise<Map<string, Node>> {
	const rows = await db
		.select()
		.from(journalEntries)
		.where(eq(journalEntries.characterId, characterId))
		.orderBy(asc(journalEntries.ts), asc(journalEntries.id));
	return new Map(rows.map((r) => [r.id, toNode(r)]));
}

/**
 * Entrées d'un personnage (par défaut le sien), 20 par page, dans l'ordre d'écriture (une version
 * corrigée garde la place de l'originale). Sans `page` : la dernière page.
 */
export async function listEntries(
	db: Db,
	actor: Actor | null,
	input: ListEntriesInput = {}
): Promise<JournalPageView> {
	const present = requireActor(actor);
	const data = parseInput(listEntriesSchema, input);
	const characterId = data.characterId ?? present.characterId;
	if (!characterId)
		throw new NpError('NOT_LINKED', 'Ton compte attend sa liaison à un personnage.', 403);
	assertCanReadJournal(present, characterId);
	const c = await loadCharacter(db, characterId);

	const byId = await loadAllNodes(db, characterId);
	if (byId.size === 0 && (c.journal ?? '').trim()) {
		byId.set(BEFORE_NOTEBOOK_ID, {
			id: BEFORE_NOTEBOOK_ID,
			ts: c.createdAt,
			text: c.journal.trim(),
			inScene: false,
			struck: false,
			replacesId: null
		});
	}
	const replaced = new Set<string>();
	for (const node of byId.values()) if (node.replacesId) replaced.add(node.replacesId);
	const heads = [...byId.values()]
		.filter((n) => !replaced.has(n.id))
		.map((n) => ({ node: n, root: rootOf(n, byId) }))
		.sort(
			(a, b) => a.root.ts.getTime() - b.root.ts.getTime() || a.root.id.localeCompare(b.root.id)
		);

	const count = heads.length;
	const pages = Math.max(1, Math.ceil(count / JOURNAL_PAGE_SIZE));
	const page = Math.min(Math.max(1, data.page ?? pages), pages);
	const rows = heads
		.slice((page - 1) * JOURNAL_PAGE_SIZE, page * JOURNAL_PAGE_SIZE)
		.map(({ node }) => entryView(node, byId));
	return { rows, page, pages, count };
}

/** Noter une entrée (propriétaire) ; « notée en scène » si `inScene`. */
export async function writeEntry(
	db: Db,
	actor: Actor | null,
	input: WriteEntryInput
): Promise<JournalEntryView> {
	const { actor: who, characterId } = requireOwnCharacter(actor);
	const data = parseInput(writeEntrySchema, input);
	return db.transaction(async (tx) => {
		// Verrou du personnage : sérialise la matérialisation et les écritures concurrentes.
		const c = await loadCharacter(tx, characterId, { lock: true });
		await materializeBeforeNotebook(tx, c);
		const [row] = await tx
			.insert(journalEntries)
			.values({
				id: `j_${nanoid(16)}`,
				characterId: c.id,
				text: data.text,
				inScene: data.inScene ?? false
			})
			.returning();
		await recordAudit(tx, {
			source: 'journal',
			action: 'journal_write',
			actor: who,
			details: { characterId: c.id, entryId: row.id, length: data.text.length }
		});
		return entryView(toNode(row), new Map());
	});
}

/** Résout l'entrée visée, en matérialisant « Avant le carnet » si nécessaire ; verrouille la ligne. */
async function targetEntry(db: Db, c: Character, entryId: string): Promise<JournalEntry> {
	let id = entryId;
	if (entryId === BEFORE_NOTEBOOK_ID) {
		id = (await materializeBeforeNotebook(db, c)) ?? beforeNotebookId(c.id);
	}
	const [row] = await db
		.select()
		.from(journalEntries)
		.where(and(eq(journalEntries.id, id), eq(journalEntries.characterId, c.id)))
		.for('update');
	if (!row) throw NpError.notFound('Entrée introuvable.');
	const [newer] = await db
		.select({ id: journalEntries.id })
		.from(journalEntries)
		.where(and(eq(journalEntries.characterId, c.id), eq(journalEntries.replacesId, row.id)))
		.limit(1);
	// Déjà corrigée ailleurs (deux appareils) : conflit, les deux versions restent lisibles (03-vision §5.5).
	if (newer) throw NpError.versionConflict();
	return row;
}

/** Corriger une entrée : nouvelle entrée `replaces_id` ; l'ancienne reste lisible en rature. */
export async function amendEntry(
	db: Db,
	actor: Actor | null,
	input: AmendEntryInput
): Promise<JournalEntryView> {
	const { actor: who, characterId } = requireOwnCharacter(actor);
	const data = parseInput(amendEntrySchema, input);
	return db.transaction(async (tx) => {
		const c = await loadCharacter(tx, characterId, { lock: true });
		const old = await targetEntry(tx, c, data.entryId);
		if (old.struck) throw new NpError('ENTRY_STRUCK', 'Cette entrée est rayée.', 409);
		const [row] = await tx
			.insert(journalEntries)
			.values({
				id: `j_${nanoid(16)}`,
				characterId: c.id,
				text: data.text,
				inScene: old.inScene,
				replacesId: old.id
			})
			.returning();
		await recordAudit(tx, {
			source: 'journal',
			action: 'journal_amend',
			actor: who,
			details: { characterId: c.id, entryId: row.id, replacesId: old.id }
		});
		const byId = await loadAllNodes(tx, c.id);
		return entryView(toNode(row), byId);
	});
}

/** Rayer une entrée : barrée entière, toujours lisible. Idempotent. */
export async function strikeEntry(
	db: Db,
	actor: Actor | null,
	input: StrikeEntryInput
): Promise<JournalEntryView> {
	const { actor: who, characterId } = requireOwnCharacter(actor);
	const data = parseInput(strikeEntrySchema, input);
	return db.transaction(async (tx) => {
		const c = await loadCharacter(tx, characterId, { lock: true });
		const row = await targetEntry(tx, c, data.entryId);
		if (!row.struck) {
			await tx
				.update(journalEntries)
				.set({ struck: true, struckAt: new Date() })
				.where(inArray(journalEntries.id, [row.id]));
			await recordAudit(tx, {
				source: 'journal',
				action: 'journal_strike',
				actor: who,
				details: { characterId: c.id, entryId: row.id }
			});
		}
		const byId = await loadAllNodes(tx, c.id);
		const node = byId.get(row.id);
		if (!node) throw NpError.notFound('Entrée introuvable.');
		return entryView(node, byId);
	});
}
