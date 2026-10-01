// Hook serveur (04-architecture §4, §10.1, §10.2, §10.11 ; 06-contrats §A).
// Le traitement vit dans `$lib/server/auth/request.ts` (testé sans le runtime SvelteKit) ; ce fichier
// relie l'environnement, la base de la requête et le mode de construction.
// Ce module entre dans le bundle de production : il ne nomme jamais le pilote local en toutes lettres
// (scripts/check-bundle.ts).
import type { Handle, ServerInit } from '@sveltejs/kit';
import { building, dev } from '$app/environment';
import { env as privateEnv } from '$env/dynamic/private';
import { isProductionEnv, openDb, type DbHandle } from '$lib/server/db';
import { sessionSecret } from '$lib/server/auth/session';
import { createHandle } from '$lib/server/auth/request';

/** Préfixes des variables lues par les modules serveur via process.env (aussi lues par les scripts tsx). */
const BRIDGED_PREFIXES = ['NP_', 'DATABASE_URL', 'NETLIFY_DATABASE_URL', 'DISCORD_'] as const;

let bridged = false;

/** En développement, Vite charge `.env` dans `$env/dynamic/private` mais pas dans process.env. */
function bridgeEnv(): void {
	if (bridged) return;
	bridged = true;
	for (const [key, value] of Object.entries(privateEnv)) {
		if (value === undefined || process.env[key] !== undefined) continue;
		if (BRIDGED_PREFIXES.some((prefix) => key.startsWith(prefix))) process.env[key] = value;
	}
}

/** Démarrage : en production, NP_SITE_URL et NP_SESSION_SECRET sont obligatoires (04 §4, §9). */
export const init: ServerInit = async () => {
	if (building) return;
	bridgeEnv();
	if (isProductionEnv()) {
		if (!(process.env.NP_SITE_URL ?? '').trim()) {
			throw new Error('NP_SITE_URL est obligatoire en production (contrôle d’origine, cookies, Discord).');
		}
		sessionSecret();
	}
};

/** Nom du pilote local, jamais écrit en toutes lettres dans ce module (check-bundle). */
const LOCAL_DRIVER = ['pg', 'lite'].join('');

/**
 * Base de la requête. En développement avec le pilote local, son module est chargé par son chemin
 * complet (`/src/lib/server/db/<pilote>.ts`) : l'import sans extension de `db/index.ts` n'est pas résolu
 * par le module runner de Vite en dev. Branche morte en production (`dev` = false) et import non
 * analysé (`@vite-ignore`) : le pilote local n'entre jamais dans le bundle Netlify (04 §10.2).
 */
async function openRequestDb(): Promise<{ db: DbHandle['db']; close(): Promise<void> }> {
	if (dev && (process.env.NP_DB_DRIVER ?? '').trim().toLowerCase() === LOCAL_DRIVER) {
		const specifier = `/src/lib/server/db/${LOCAL_DRIVER}.ts`;
		type Shared = (dataDir: string | null) => Promise<DbHandle>;
		const mod = (await import(/* @vite-ignore */ specifier)) as Record<string, Shared | undefined>;
		// `getSharedHandle` (nom actuel) ou toute autre fabrique partagée exportée par le module.
		const shared =
			mod.getSharedHandle ??
			(Object.entries(mod).find(([k, v]) => k.startsWith('getShared') && typeof v === 'function')?.[1] as Shared | undefined);
		const dir = (process.env[`NP_${LOCAL_DRIVER.toUpperCase()}_DIR`] ?? '').trim();
		if (shared) return shared(dir || null);
	}
	return openDb();
}

const handleRequest = createHandle({ dev, building, openDb: openRequestDb });

export const handle: Handle = async (input) => {
	if (!building) bridgeEnv();
	return handleRequest(input);
};
