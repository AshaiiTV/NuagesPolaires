// Déclarations « Kael déclare −8 EP (Esquive). » : schémas et vues (06-contrats §B.3, 04 §3.12,
// 03-vision §5.3, §6.6, §12.4). Module pur, importable côté client.
import { z } from 'zod';

export const DECLARATION_RESOURCES = ['pv', 'ep', 'em'] as const;
export const DECLARATION_STATUSES = [
	'proposee',
	'annulee',
	'reportee',
	'rayee',
	'non_reportee'
] as const;
/** Fenêtre d'annulation : 10 s (04 §3.12 `cancel_until = created_at + 10 s`). */
export const DECLARATION_CANCEL_SECONDS = 10;
/** Rature automatique « non reportée » après 7 jours (03-vision §12.4). */
export const DECLARATION_EXPIRY_DAYS = 7;
export const DECLARATION_WORD_MAX = 80;
export const DECLARATION_DELTA_MAX = 999;
export const DECLARATION_MOTIF_MAX = 500;
/** Signe moins typographique (U+2212) du texte généré. */
export const TYPOGRAPHIC_MINUS = '−';

const id = z
	.string({ error: 'Déclaration invalide.' })
	.trim()
	.min(1, { error: 'Déclaration invalide.' })
	.max(180, { error: 'Déclaration invalide.' });
const optionalRef = z.string().trim().min(1).max(180).optional();
const motif = z
	.string({ error: 'Le motif est obligatoire.' })
	.trim()
	.min(1, { error: 'Le motif est obligatoire.' })
	.max(DECLARATION_MOTIF_MAX, {
		error: `Le motif ne doit pas dépasser ${DECLARATION_MOTIF_MAX} caractères.`
	});

export const declareSchema = z.strictObject({
	resource: z.enum(DECLARATION_RESOURCES, { error: 'Ressource invalide.' }),
	delta: z
		.int({ error: 'Le chiffre doit être un entier.' })
		.min(-DECLARATION_DELTA_MAX, { error: 'Chiffre hors limites.' })
		.max(DECLARATION_DELTA_MAX, { error: 'Chiffre hors limites.' })
		.refine((v) => v !== 0, { error: 'Le chiffre est obligatoire.' }),
	word: z
		.string({ error: 'Le mot est obligatoire.' })
		.trim()
		.min(1, { error: 'Le mot est obligatoire.' })
		.max(DECLARATION_WORD_MAX, {
			error: `Le mot ne doit pas dépasser ${DECLARATION_WORD_MAX} caractères.`
		}),
	sceneId: optionalRef,
	combatId: optionalRef
});

export const declarationIdSchema = z.strictObject({ id });

export const reportDeclarationSchema = z.object({
	id,
	motif,
	/** Révision du PERSONNAGE (la fiche change au report). */
	expectedRevision: z.int({ error: 'Version attendue invalide.' }).min(1, {
		error: 'Version attendue invalide.'
	})
});

export const strikeDeclarationSchema = z.object({ id, motif });

export type DeclareInput = z.input<typeof declareSchema>;
export type DeclarationIdInput = z.input<typeof declarationIdSchema>;
export type ReportDeclarationInput = z.input<typeof reportDeclarationSchema>;
export type StrikeDeclarationInput = z.input<typeof strikeDeclarationSchema>;

export type DeclarationResourceKey = (typeof DECLARATION_RESOURCES)[number];
export type DeclarationStatusKey = (typeof DECLARATION_STATUSES)[number];

/** Texte exact « <Nom> déclare −8 EP (Esquive). » (03-vision §8, micro-texte 10). */
export function declarationText(
	name: string,
	resource: DeclarationResourceKey,
	delta: number,
	word: string
): string {
	const sign = delta < 0 ? TYPOGRAPHIC_MINUS : '+';
	return `${name} déclare ${sign}${Math.abs(delta)} ${resource.toUpperCase()} (${word}).`;
}

export type DeclarationView = {
	id: string;
	characterId: string;
	text: string;
	resource: DeclarationResourceKey;
	delta: number;
	word: string;
	status: DeclarationStatusKey;
	at: string;
	cancelUntil: string;
	sceneId: string | null;
	combatId: string | null;
	motif: string;
	reportedAt: string | null;
};
