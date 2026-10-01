import { z } from 'zod';
export const proposeObservationSchema = z.object({
	beastId: z.string().trim().min(1).max(128),
	text: z
		.string()
		.trim()
		.min(1, 'Une observation est requise.')
		.max(1000, 'Une observation ne peut pas dépasser 1 000 caractères.')
});
export const reviewObservationSchema = z.object({
	id: z.string().trim().min(1).max(128),
	motif: z.string().trim().min(1, 'Un motif est requis.').max(1000),
	expectedRevision: z.number().int().min(1).optional()
});
export type ProposeObservationInput = z.input<typeof proposeObservationSchema>;
export type ReviewObservationInput = z.input<typeof reviewObservationSchema>;
export type ObservationView = {
	id: string;
	beastId: string;
	text: string;
	at: string;
	stamp: { role: string; name: string } | null;
	combatId: string | null;
	revision: number;
};
export type PendingObservationView = ObservationView & {
	author: string | null;
	proposedAt: string;
};
