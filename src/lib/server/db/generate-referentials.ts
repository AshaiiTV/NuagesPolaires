// Génère la migration de données `drizzle/0001_referentiels.sql` (04-architecture §3.3, §3.8, §10.10)
// à partir de referentials.ts et du catalogue natif `BUILTIN_OATHS` :
//   npx tsx src/lib/server/db/generate-referentials.ts
// L'entrée de journal Drizzle de cette migration est créée une fois par
// `npx drizzle-kit generate --custom --name referentiels` ; ce script n'écrit que le SQL.
//
// AVANT la mise en production, on régénère librement (un test signale tout écart entre le fichier et
// les données). APRÈS, une migration appliquée ne change plus : une évolution des référentiels
// s'écrit dans une NOUVELLE migration (la base fait foi, 04 §3.3).

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
// Import relatif (et non `$lib`) : ce module est exécuté par tsx hors de Vite.
import { BUILTIN_OATHS } from '../../game/oaths';
import { resolveMigrationsFolder } from './migrations-folder';
import {
	REFERENTIALS_MIGRATION_FILE,
	THEME_TOKENS_MIGRATION_FILE,
	buildReferentialsSql,
	buildThemeTokensSql
} from './referentials';

/** Contenu attendu de la migration de données pour le catalogue natif courant. */
export function renderReferentialsMigration(): string {
	return buildReferentialsSql(BUILTIN_OATHS);
}

/** Contenu attendu de la migration de données 0003 (tokens des thèmes, décision INT-1). */
export function renderThemeTokensMigration(): string {
	return buildThemeTokensSql();
}

/** Chemin du fichier de migration de données dans le dossier `drizzle/` résolu. */
export function referentialsMigrationPath(migrationsFolder = resolveMigrationsFolder()): string {
	return path.join(migrationsFolder, REFERENTIALS_MIGRATION_FILE);
}

/** Chemin de la migration de données 0003 dans le dossier `drizzle/` résolu. */
export function themeTokensMigrationPath(migrationsFolder = resolveMigrationsFolder()): string {
	return path.join(migrationsFolder, THEME_TOKENS_MIGRATION_FILE);
}

/** Lit le fichier présent (fins de ligne normalisées en `\n`), `null` s'il n'existe pas. */
export function readReferentialsMigration(file = referentialsMigrationPath()): string | null {
	try {
		return readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
	} catch {
		return null;
	}
}

const isDirectRun =
	process.argv.length > 1 &&
	import.meta.url === pathToFileURL(path.resolve(process.argv[1] ?? '')).href;

if (isDirectRun) {
	const targets = [
		{ name: REFERENTIALS_MIGRATION_FILE, file: referentialsMigrationPath(), next: renderReferentialsMigration() },
		{ name: THEME_TOKENS_MIGRATION_FILE, file: themeTokensMigrationPath(), next: renderThemeTokensMigration() }
	];
	for (const { name, file, next } of targets) {
		if (readReferentialsMigration(file) === next) {
			console.log(`${name} : déjà à jour.`);
		} else {
			writeFileSync(file, next, 'utf8');
			console.log(`${name} : écrit (${next.length} caractères).`);
		}
	}
}
