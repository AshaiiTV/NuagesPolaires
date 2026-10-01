// Journal (« Mes notes ») : schémas Zod des entrées et vues (06-contrats §B.3, 04 §3.12, 03-vision §5.5).
// Module pur, importable côté client.
import { z } from 'zod';

/** ≤ 20 000 caractères par entrée (04 §3.12 `journal_entries.text`). */
export const JOURNAL_MAX_CHARS = 20_000;
/** 20 entrées par page (03-vision §5.5). */
export const JOURNAL_PAGE_SIZE = 20;
/** Libellé de la première entrée issue de l'ancien journal (04 §3.12, 03-vision §5.5). */
export const BEFORE_NOTEBOOK_LABEL = 'Avant le carnet';
/** Identifiant de l'entrée virtuelle « Avant le carnet » tant qu'elle n'est pas matérialisée. */
export const BEFORE_NOTEBOOK_ID = 'avant-le-carnet';

const entryText = z
	.string({ error: "L'entrée est vide." })
	.trim()
	.min(1, { error: "L'entrée est vide." })
	.max(JOURNAL_MAX_CHARS, {
		error: `Une entrée ne doit pas dépasser ${JOURNAL_MAX_CHARS} caractères.`
	});
const entryId = z
	.string({ error: 'Entrée invalide.' })
	.trim()
	.min(1, { error: 'Entrée invalide.' })
	.max(180, { error: 'Entrée invalide.' });

export const listEntriesSchema = z.object({
	characterId: z.string().trim().min(1).max(180).optional(),
	/** Page 1-indexée ; absente = la dernière page (on écrit sous la dernière ligne). */
	page: z.int().min(1).optional()
});

export const writeEntrySchema = z.strictObject({
	text: entryText,
	inScene: z.boolean().optional()
});

export const amendEntrySchema = z.strictObject({
	entryId,
	text: entryText
});

export const strikeEntrySchema = z.strictObject({ entryId });

export type ListEntriesInput = z.input<typeof listEntriesSchema>;
export type WriteEntryInput = z.input<typeof writeEntrySchema>;
export type AmendEntryInput = z.input<typeof amendEntrySchema>;
export type StrikeEntryInput = z.input<typeof strikeEntrySchema>;

export type JournalEntryView = {
	id: string;
	at: string;
	text: string;
	inScene: boolean;
	struck: boolean;
	/** Version précédente (la rature), elle-même chaînée ; `null` pour une entrée jamais corrigée. */
	previous: JournalEntryView | null;
	/** « Avant le carnet » pour l'entrée issue de l'ancien journal, sinon `null`. */
	label: string | null;
};

export type JournalPageView = {
	rows: JournalEntryView[];
	page: number;
	pages: number;
	/** Nombre d'entrées (pages écrites), versions raturées non comptées. */
	count: number;
};
