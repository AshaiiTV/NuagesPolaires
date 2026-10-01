// Pilote PGlite (dev et tests) : même schéma et mêmes migrations que Neon (04-architecture §1, §10.2).
// Ce module n'est chargé QUE par import dynamique non littéral depuis index.ts (ou directement par
// les helpers de test), afin que @electric-sql/pglite et le jeu de démonstration ne soient jamais
// embarqués dans le bundle Netlify (scripts/check-bundle.ts le vérifie).

import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from './schema';
import type { DbHandle } from './index';
import { resolveMigrationsFolder } from './migrations-folder';
import { seedDemo } from './seed';

/**
 * Crée une base PGlite NEUVE et isolée (non migrée). `dataDir` null = en mémoire, sinon dossier de
 * données. Son `close()` ferme réellement l'instance.
 */
export async function createPgliteHandle(dataDir: string | null = null): Promise<DbHandle> {
	const client = dataDir ? new PGlite(dataDir) : new PGlite();
	await client.waitReady;
	const db = drizzle({ client, schema, casing: 'snake_case' });
	let closed = false;
	return {
		driver: 'pglite',
		db,
		async migrate(migrationsFolder?: string) {
			await migrate(db, { migrationsFolder: migrationsFolder ?? resolveMigrationsFolder() });
		},
		async close() {
			if (closed) return;
			closed = true;
			await client.close();
		}
	};
}

type SharedEntry = { raw: DbHandle; shared: DbHandle };
const shared = new Map<string, Promise<SharedEntry>>();

/** Clé de partage : `:memory:` ou le dossier de données. */
function keyOf(dataDir: string | null): string {
	return dataDir ?? ':memory:';
}

/**
 * Prépare une base partagée à sa première ouverture, EXACTEMENT comme une base Neon : migrations
 * (la migration de données 0001 écrit thèmes, zones, réglages, `spawn_settings` et Serments
 * natifs), puis jeu de démonstration sauf NP_DEMO_SEED=false. Tout est idempotent.
 */
async function bootstrap(handle: DbHandle): Promise<void> {
	await handle.migrate();
	if ((process.env.NP_DEMO_SEED ?? '').trim().toLowerCase() !== 'false') {
		// On est ici parce que le pilote PGlite a été choisi : on le déclare, mais on transmet le
		// VRAI environnement pour que la garde de production de seedDemo s'applique quand même
		// (cible passée explicitement à openDb sur une machine de production, par exemple).
		await seedDemo(handle.db, { ...process.env, NP_DB_DRIVER: 'pglite' });
	}
}

/**
 * Handle PGlite partagé par le processus pour une cible donnée (04 §10.2 : sinon chaque requête
 * verrait une base mémoire vide). Le `close()` du handle renvoyé est sans effet.
 */
export async function getSharedHandle(dataDir: string | null): Promise<DbHandle> {
	const key = keyOf(dataDir);
	let pending = shared.get(key);
	if (!pending) {
		pending = (async () => {
			const raw = await createPgliteHandle(dataDir);
			try {
				await bootstrap(raw);
			} catch (e) {
				await raw.close().catch(() => undefined);
				throw e;
			}
			const view: DbHandle = {
				driver: 'pglite',
				db: raw.db,
				migrate: (folder?: string) => raw.migrate(folder),
				close: async () => {
					// Partagé : la fermeture réelle passe par closeSharedHandles().
				}
			};
			return { raw, shared: view };
		})();
		shared.set(key, pending);
		pending.catch(() => shared.delete(key));
	}
	return (await pending).shared;
}

/** Ferme toutes les instances partagées et les oublie. */
export async function closeSharedHandles(): Promise<void> {
	const entries = [...shared.values()];
	shared.clear();
	for (const pending of entries) {
		const entry = await pending.catch(() => null);
		if (entry) await entry.raw.close();
	}
}
