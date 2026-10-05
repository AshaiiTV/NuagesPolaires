// Remise à zéro du semis, uniquement pour le serveur local dédié aux parcours.
import { error, json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { executeRows, isProductionEnv, LOCAL_DRIVER } from '$lib/server/db';
import { BUILTIN_OATHS } from '$lib/game/oaths';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, url }) => {
	if (
		!import.meta.env.DEV ||
		isProductionEnv() ||
		process.env.NP_DB_DRIVER !== LOCAL_DRIVER ||
		process.env.NP_E2E_RESET !== 'true' ||
		!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
	)
		return error(404);
	const tables = await executeRows<{ tablename: string }>(
		locals.db,
		sql`select tablename from pg_tables where schemaname = 'public'`
	);
	const names = tables.map((t) => '"' + t.tablename.replaceAll('"', '""') + '"').join(', ');
	await locals.db.execute(sql.raw(`TRUNCATE ${names} RESTART IDENTITY CASCADE`));
	const path = '/src/lib/server/db/seed.ts';
	const seed = (await import(/* @vite-ignore */ path)) as typeof import('$lib/server/db/seed');
	await seed.seedDatabase(locals.db, { oaths: BUILTIN_OATHS });
	await seed.seedDemo(locals.db);
	return json({ reset: true });
};
