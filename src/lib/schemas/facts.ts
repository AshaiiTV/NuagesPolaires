// Faits validés (dettes, promesses, alliances, conséquences, observations) : schémas et vues
// (06-contrats §B.3, 04 §3.12, 03-vision §5.5). Module pur, importable côté client.
import { z } from 'zod';

export const FACT_KINDS = ['dette', 'promesse', 'alliance', 'consequence', 'observation'] as const;
export const FACT_KIND_LABELS = {
	dette: 'Dette',
	promesse: 'Promesse',
	alliance: 'Alliance',
	consequence: 'Conséquence narrative',
	observation: 'Observation'
} as const;
export const FACT_STATUSES = ['proposed', 'validated', 'settled', 'rejected'] as const;

/** ≤ 1 000 caractères (brief paquet F). */
export const FACT_TEXT_MAX = 1000;
export const FACT_COUNTERPART_MAX = 200;
export const FACT_WITNESS_MAX = 200;
export const FACT_MOTIF_MAX = 500;

const factId = z
	.string({ error: 'Fait invalide.' })
	.trim()
	.min(1, { error: 'Fait invalide.' })
	.max(180, { error: 'Fait invalide.' });
const motif = z
	.string({ error: 'Le motif est obligatoire.' })
	.trim()
	.min(1, { error: 'Le motif est obligatoire.' })
	.max(FACT_MOTIF_MAX, { error: `Le motif ne doit pas dépasser ${FACT_MOTIF_MAX} caractères.` });
const witness = z
	.string()
	.trim()
	.max(FACT_WITNESS_MAX, {
		error: `Le témoin ne doit pas dépasser ${FACT_WITNESS_MAX} caractères.`
	})
	.optional();
const expectedRevision = z.int({ error: 'Version attendue invalide.' }).min(1, {
	error: 'Version attendue invalide.'
});

export const listFactsSchema = z.object({
	characterId: z.string().trim().min(1).max(180).optional()
});

export const proposeFactSchema = z.strictObject({
	kind: z.enum(FACT_KINDS, { error: 'Type de fait invalide.' }),
	counterpart: z
		.string()
		.trim()
		.max(FACT_COUNTERPART_MAX, {
			error: `« Envers » ne doit pas dépasser ${FACT_COUNTERPART_MAX} caractères.`
		})
		.optional(),
	text: z
		.string({ error: 'Le fait est vide.' })
		.trim()
		.min(1, { error: 'Le fait est vide.' })
		.max(FACT_TEXT_MAX, { error: `Un fait ne doit pas dépasser ${FACT_TEXT_MAX} caractères.` }),
	witness
});

export const validateFactSchema = z.object({ id: factId, motif, witness, expectedRevision });
export const rejectFactSchema = z.object({ id: factId, motif, expectedRevision });
export const settleFactSchema = z.object({ id: factId, motif, expectedRevision });

export type ListFactsInput = z.input<typeof listFactsSchema>;
export type ProposeFactInput = z.input<typeof proposeFactSchema>;
export type ValidateFactInput = z.input<typeof validateFactSchema>;
export type RejectFactInput = z.input<typeof rejectFactSchema>;
export type SettleFactInput = z.input<typeof settleFactSchema>;

export type FactKindKey = (typeof FACT_KINDS)[number];
export type FactStatusKey = (typeof FACT_STATUSES)[number];

export type FactView = {
	id: string;
	characterId: string;
	kind: FactKindKey;
	counterpart: string;
	text: string;
	status: FactStatusKey;
	witness: string;
	proposedAt: string;
	/** Tampon du MJ ou de l'administrateur qui a validé, refusé ou réglé le fait. */
	stamp: { role: string; name: string; at: string; motif: string } | null;
	settledAt: string | null;
	revision: number;
};
