import { z } from 'zod';

// Vision §5.8 et §9.4 : extrait choisi par le MJ, deux à quatre lignes brutes.
export const extractSchema = z
	.object({
		text: z
			.string()
			.trim()
			.min(1)
			.max(4000)
			.refine((text) => {
				const lines = text.split(/\r?\n/);
				return (
					lines.length >= 2 && lines.length <= 4 && lines.every((line) => line.trim().length > 0)
				);
			}, 'Écris un extrait de deux à quatre lignes.'),
		onHome: z.boolean().default(false),
		beastIds: z.array(z.string().min(1)).max(80).default([])
	})
	.strict();
export const publishExtractSchema = extractSchema.extend({
	combatId: z.string().min(1).nullable().optional()
});
export const strikePublicationSchema = z
	.object({ id: z.string().min(1), motif: z.string().trim().min(1).max(2000) })
	.strict();
export type PublishExtractInput = z.input<typeof publishExtractSchema>;
export type StrikePublicationInput = z.input<typeof strikePublicationSchema>;
export type PublicationView = {
	id: string;
	combatId: string | null;
	text: string;
	onHome: boolean;
	beastIds: string[];
	at: string;
	struck: boolean;
	struckAt?: string | null;
};
// Forme exacte de src/routes/+page.server.ts ; aucune donnée de compte ou de participant.
export type HomeLeaf = {
	id: string;
	kind: 'recit' | 'passe' | 'a-venir';
	margin: string;
	title: string;
	excerpt: string;
	stamp: string | null;
	href: string | null;
};
