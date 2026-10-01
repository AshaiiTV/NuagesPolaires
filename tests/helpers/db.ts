// Helper de test : base PGlite en mémoire ISOLÉE par appel (jamais le handle partagé du processus),
// migrations réelles de `drizzle/` appliquées — dont la migration de données 0001 qui écrit les
// référentiels (thèmes, zones, réglages, `spawn_settings`, Serments natifs) —, semis Drizzle
// idempotent par-dessus, et jeu de démonstration sur demande (04-architecture §1, §8).
// Import relatif depuis les specs :
//   import { createTestDb } from '../../../../tests/helpers/db';
// Les imports vers src sont relatifs (et non `$lib`) pour rester exécutables par tout lanceur.

import { sql } from 'drizzle-orm';
import { vi } from 'vitest';
import type { Db, DbHandle } from '../../src/lib/server/db/index';
import { createPgliteHandle } from '../../src/lib/server/db/pglite';
import {
	seedDatabase,
	seedDemo,
	type DemoSeedReport,
	type OathSeedDefinition,
	type SeedReport
} from '../../src/lib/server/db/seed';
import { BUILTIN_OATHS } from '../../src/lib/game/oaths';

// Les suites complètes initialisent plusieurs moteurs WASM et scrypt simultanément.
// Ce délai couvre l'initialisation sous charge ; les assertions métier restent inchangées.
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

export type TestDb = {
	db: Db;
	handle: DbHandle;
	/** Rapport de seedDatabase (ce qui MANQUAIT après les migrations) ; zéros si non exécuté. */
	seed: SeedReport;
	/** Rapport du jeu de démonstration, `null` si non demandé. */
	demo: DemoSeedReport | null;
	/** Ferme l'instance PGlite. À appeler dans `afterAll`/`afterEach`. */
	close: () => Promise<void>;
};

export type CreateTestDbOptions = {
	/** Sème le jeu de démonstration fictif (comptes, personnages, créatures, rendez-vous…). */
	demo?: boolean;
	/** Catalogue de Serments passé à seedDatabase ; par défaut `BUILTIN_OATHS`. */
	oaths?: readonly OathSeedDefinition[];
	/**
	 * `false` : vide les tables de référentiels écrites par la migration 0001 (thèmes, zones,
	 * réglages, `spawn_settings`, Serments) — pour tester le semis Drizzle sur une base vierge.
	 * Défaut `true`.
	 */
	referentials?: boolean;
	/**
	 * Exécute seedDatabase après les migrations. Défaut : `true`, sauf si `referentials: false`
	 * (la base reste alors vide de référentiels, à moins de passer `seed: true`).
	 */
	seed?: boolean;
};

const EMPTY_SEED: SeedReport = {
	themesInserted: 0,
	zonesInserted: 0,
	settingsInserted: 0,
	spawnSettingsInserted: 0,
	oathsInserted: 0
};

/** Tables remplies par la migration de données 0001. */
export const REFERENTIAL_TABLES = [
	'themes',
	'zones',
	'settings',
	'spawn_settings',
	'oaths'
] as const;

/** Crée une base isolée : chaque appel ouvre une nouvelle instance PGlite en mémoire. */
export async function createTestDb(options: CreateTestDbOptions = {}): Promise<TestDb> {
	const handle = await createPgliteHandle(null);
	try {
		await handle.migrate();
		const keepReferentials = options.referentials !== false;
		if (!keepReferentials) {
			// Base fraîchement migrée : les autres tables sont vides, CASCADE ne touche qu'elles.
			await handle.db.execute(
				sql.raw(`TRUNCATE ${REFERENTIAL_TABLES.map((t) => `"${t}"`).join(', ')} CASCADE`)
			);
		}
		const runSeed = options.seed ?? keepReferentials;
		const seed = runSeed
			? await seedDatabase(handle.db, { oaths: options.oaths ?? BUILTIN_OATHS })
			: EMPTY_SEED;
		// La base de test EST une base PGlite : la garde de seedDemo est satisfaite par construction.
		const demo = options.demo ? await seedDemo(handle.db, { NP_DB_DRIVER: 'pglite' }) : null;
		return { db: handle.db, handle, seed, demo, close: () => handle.close() };
	} catch (e) {
		await handle.close().catch(() => undefined);
		throw e;
	}
}
