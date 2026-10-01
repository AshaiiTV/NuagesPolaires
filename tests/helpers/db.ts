// Helper de test : base PGlite en mémoire, migrations réelles de `drizzle/` appliquées, référentiels
// semés (04-architecture §1, §8). Import relatif depuis les specs :
//   import { createTestDb } from '../../../../tests/helpers/db';
// Les imports vers src sont relatifs (et non `$lib`) pour rester exécutables par tout lanceur.

import type { Db } from '../../src/lib/server/db/index';
import { createPgliteHandle } from '../../src/lib/server/db/pglite';
import {
	seedDatabase,
	type OathSeedDefinition,
	type SeedReport
} from '../../src/lib/server/db/seed';

export type TestDb = {
	db: Db;
	seed: SeedReport;
	/** Ferme l'instance PGlite. À appeler dans `afterAll`/`afterEach`. */
	close: () => Promise<void>;
};

export type CreateTestDbOptions = {
	/** Catalogue de Serments à semer (par ex. `BUILTIN_OATHS` de `$lib/game/oaths`). */
	oaths?: readonly OathSeedDefinition[];
	/** Désactive le semis (tests de migration pure). */
	seed?: boolean;
};

/** Crée une base isolée : chaque appel ouvre une nouvelle instance PGlite en mémoire. */
export async function createTestDb(options: CreateTestDbOptions = {}): Promise<TestDb> {
	const handle = await createPgliteHandle('memory');
	try {
		await handle.migrate();
		const seed =
			options.seed === false
				? { themesInserted: 0, zonesInserted: 0, oathsInserted: 0 }
				: await seedDatabase(handle.db, { oaths: options.oaths });
		return { db: handle.db, seed, close: () => handle.close() };
	} catch (e) {
		await handle.close().catch(() => undefined);
		throw e;
	}
}
