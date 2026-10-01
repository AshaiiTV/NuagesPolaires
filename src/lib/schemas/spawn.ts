import { z } from 'zod';
import type { SpawnPack, WeightDetail } from '../game/spawn';
export const drawSpawnSchema = z
	.object({ zoneId: z.string().min(1), count: z.number().int().min(1).max(30).default(1) })
	.strict();
export const spawnToTableSchema = z
	.object({ runId: z.string().min(1), characterIds: z.array(z.string().min(1)).max(80) })
	.strict();
export type DrawSpawnInput = z.input<typeof drawSpawnSchema> & { rng?: () => number };
export type SpawnToTableInput = z.input<typeof spawnToTableSchema>;
export type SpawnRunView = {
	id: string;
	at: string;
	zoneId: string | null;
	packs: SpawnPack[];
	weights: WeightDetail[];
};
export type SpawnTotalsView = { totals: Record<string, number>; totalDraws: number };
