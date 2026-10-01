import { z } from 'zod';
import type { Growth, OathRank, OathCategory } from '$lib/game/types';
const text = z.string().max(20000);
const integer = z.number().int().min(0).max(2147483647);
export const oathRankSchema = z.enum([
	'basic',
	'seasoned',
	'emeritus',
	'singular',
	'transcended',
	'corrupted',
	'other'
]);
export const oathCategorySchema = z.enum(['melee', 'distance', 'magie', 'soutien']);
export const oathBranchSchema = z.object({
	nom: z.string().trim().min(1).max(200),
	style: z.string().max(200).default(''),
	descPhys: text.optional(),
	flavor: text.optional(),
	desc: text.optional(),
	paliers: z
		.array(
			z.object({
				niv: z.number().int().min(1).max(2147483647),
				nom: z.string().trim().min(1).max(200),
				cout: z.string().max(1000),
				desc: text
			})
		)
		.max(4)
});
export const oathFieldsSchema = z.object({
	name: z.string().trim().min(1, 'Nom requis.').max(80),
	weapon: z.string().max(200).default(''),
	growth: z
		.object({ pvN: integer, epN: integer, emN: integer })
		.default({ pvN: 3, epN: 5, emN: 2 }),
	baseDamage: integer.default(8),
	damageType: z.string().max(200).default(''),
	rank: oathRankSchema.default('singular'),
	category: oathCategorySchema.default('melee'),
	hidden: z.boolean().default(false),
	evolvesFrom: z.string().trim().min(1).max(128).nullable().default(null),
	icon: z.string().max(32).default('✦'),
	lore: text.default(''),
	branches: z
		.object({
			bA: oathBranchSchema.nullable().optional(),
			bB: oathBranchSchema.nullable().optional()
		})
		.default({})
});
export const createOathSchema = oathFieldsSchema;
export const updateOathSchema = oathFieldsSchema
	.partial()
	.extend({
		id: z.string().min(1).max(128),
		expectedRevision: z.number().int().min(1).optional(),
		motif: z.string().trim().min(1, 'Un motif est requis.').max(1000)
	});
export const setOathHiddenSchema = z.object({
	id: z.string().min(1).max(128),
	hidden: z.boolean(),
	expectedRevision: z.number().int().min(1).optional()
});
export const listOathsSchema = z.object({
	rank: oathRankSchema.optional(),
	category: oathCategorySchema.optional()
});
export type CreateOathInput = z.input<typeof createOathSchema>;
export type UpdateOathInput = z.input<typeof updateOathSchema>;
export type TierView = {
	level: number;
	name: string;
	cost: string;
	description: string;
	stage: string;
};
export type OathRowView = {
	id: string;
	name: string;
	weapon: string;
	rank: OathRank;
	rankLabel: string;
	lineage: string | null;
	category: OathCategory;
	revision: number;
};
export type OathView = OathRowView & {
	lore: string;
	growth: Growth;
	baseDamage: number;
	damageType: string;
	branches: { label: string; style: string; physical: string; flavor: string; tiers: TierView[] }[];
	reserved: {
		hidden: boolean;
		isBuiltin: boolean;
		icon: string;
		evolvesFrom: string | null;
	} | null;
};
