import { z } from 'zod';
import { MEANING_COLORS } from '$lib/game/colors';
import type { ObservationView } from './observations';

// Audit 04 §1.3 : BHC, legacy/assets/js/main.js:7413-7426 (clé française) — table unique des couleurs
// de sens `$lib/game/colors` (décision INT-1).
export const BEHAVIOR_COLORS = MEANING_COLORS.behavior;
export const behaviorSchema = z.enum([
	'Gibier',
	'Passif',
	'Neutre',
	'Agressif',
	'Très agressif',
	'Boss'
]);
export const referenceIdSchema = z.string().trim().min(1).max(128);
export const revisionSchema = z.number().int().min(1).optional();
const integer = (min: number) => z.number().int().min(min).max(2147483647);
const text = z.string().max(20000);
// Audit 04 §1.1 : images HTTP(S) sans identifiants ou data-URL raster ; jamais SVG.
export const beastImageSchema = z
	.string()
	.max(350000)
	.refine((value) => {
		if (value === '') return true;
		if (/^data:image\/(png|jpe?g|gif|webp|avif);base64,[A-Za-z0-9+/]+={0,2}$/.test(value))
			return true;
		try {
			const url = new URL(value);
			return (
				['https:', 'http:'].includes(url.protocol) &&
				!url.username &&
				!url.password &&
				!/[\s<>"'`\\]/.test(value)
			);
		} catch {
			return false;
		}
	}, 'Image invalide.');
export const beastFieldsSchema = z.object({
	name: z.string().trim().min(1, 'Nom requis.').max(80),
	subtitle: text.default(''),
	behavior: behaviorSchema.default('Neutre'),
	level: integer(1).default(1),
	pv: integer(1).default(20),
	ep: integer(0).default(20),
	strike: text.default(''),
	skill: text.default(''),
	drops: text.default(''),
	gem: text.default(''),
	description: text.default(''),
	imageUrl: beastImageSchema.default(''),
	style: text.default(''),
	quote: text.default(''),
	adminNote: text.default(''),
	hidden: z.boolean().default(false),
	archived: z.boolean().default(false),
	qtyMin: integer(1).default(1),
	qtyMax: integer(1).default(3),
	spawnWeight: integer(0).default(1),
	tags: z.array(z.string().trim().min(1).max(80)).max(24).default([]),
	zones: z.array(referenceIdSchema).max(24).default([]),
	statuses: z.array(z.unknown()).max(64).default([])
});
export const createBeastSchema = beastFieldsSchema.refine(
	(v) => v.qtyMax >= v.qtyMin,
	'La quantité maximale doit être au moins égale à la quantité minimale.'
);
export const updateBeastSchema = beastFieldsSchema
	.partial()
	.extend({ id: referenceIdSchema, expectedRevision: revisionSchema });
export const beastCommandSchema = z.object({
	id: referenceIdSchema,
	expectedRevision: revisionSchema
});
export const setBeastHiddenSchema = beastCommandSchema.extend({ hidden: z.boolean() });
export const listBeastsSchema = z.object({
	search: z.string().trim().max(200).optional(),
	behavior: behaviorSchema.optional(),
	zoneId: referenceIdSchema.optional(),
	sort: z
		.enum(['name', 'level', 'name_asc', 'name_desc', 'level_asc', 'level_desc'])
		.default('name')
});
export const createZoneSchema = z.object({
	name: z.string().trim().min(1, 'Nom de zone requis.').max(80),
	emoji: z.string().max(32).default('')
});
export const renameZoneSchema = z.object({
	id: referenceIdSchema,
	name: z.string().trim().min(1, 'Nom de zone requis.').max(80),
	expectedRevision: revisionSchema
});
export type CreateBeastInput = z.input<typeof createBeastSchema>;
export type UpdateBeastInput = z.input<typeof updateBeastSchema>;
export type BeastCommandInput = z.input<typeof beastCommandSchema>;
export type ListBeastsInput = z.input<typeof listBeastsSchema>;
export type ZoneView = {
	id: string;
	name: string;
	emoji: string;
	isDefault: boolean;
	position: number;
	revision: number;
};
export type BeastRowView = {
	id: string;
	name: string;
	subtitle: string;
	behavior: string;
	behaviorColor: string;
	level: number;
	revision: number;
};
export type BeastUsageView = {
	uses: number;
	deaths: number;
	lastAt: string | null;
	history: { id: string; name: string; at: string | null }[];
};
export type BeastView = BeastRowView & {
	qtyMin: number;
	qtyMax: number;
	spawnWeight: number;
	pv: number;
	ep: number;
	strike: string;
	skill: string;
	drops: string;
	gem: string;
	description: string;
	imageUrl: string;
	quote: string;
	zones: ZoneView[];
	observations: ObservationView[];
	reserved: { hidden: boolean; archived: boolean; adminNote: string; usage: BeastUsageView } | null;
};
