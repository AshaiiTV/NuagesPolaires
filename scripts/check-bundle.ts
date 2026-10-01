// Garde de bundle (04-architecture §10.2) : échoue (code 1) si le bundle de production contient
// `pglite` ou le jeu de démonstration. À lancer APRÈS `npm run build` :
//   npx tsx scripts/check-bundle.ts            (cibles par défaut)
//   npx tsx scripts/check-bundle.ts <dossier>… (cibles explicites)
//
// Cibles par défaut : `.netlify/functions-internal` (point d'entrée de la fonction), `.netlify/server`
// (code serveur SvelteKit qu'elle importe) et `build/` (sortie publiée). Les fichiers `.map` sont
// ignorés (ils recopient les sources, commentaires compris).
//
// Règle, à la lettre de 04 §10.2 : le mot « pglite », SOUS TOUTE CASSE, n'apparaît nulle part dans
// le contenu analysé ni dans un nom de fichier. La fabrique de connexion (src/lib/server/db/index.ts),
// qui doit pourtant reconnaître NP_DB_DRIVER=<pilote local> pour le refuser en production, ne le
// nomme qu'en position de type et le reconstruit par morceaux à l'exécution ; un test
// (src/lib/server/db/bundle.spec.ts) vérifie que les modules serveur embarqués, compilés, restent
// propres. Les motifs plus précis ci-dessous ne servent qu'à rendre le diagnostic lisible.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const DEFAULT_TARGETS = ['.netlify/functions-internal', '.netlify/server', 'build'] as const;

/** Motifs interdits : la présence de l'un d'eux fait échouer la vérification. */
export const FORBIDDEN: readonly { label: string; pattern: RegExp }[] = [
	{ label: 'paquet @electric-sql/pglite', pattern: /@electric-sql\/pglite/i },
	{ label: 'pilote drizzle-orm/pglite', pattern: /drizzle-orm\/pglite/i },
	{ label: 'instanciation de PGlite', pattern: /\bnew\s+PGlite\b/ },
	{ label: 'binaire PGlite', pattern: /pglite\.(wasm|data)\b/i },
	{ label: 'mot « pglite » (toute casse)', pattern: /pglite/i },
	{ label: 'jeu de démonstration (seedDemo)', pattern: /\bseedDemo\b/ }
];

const SCANNED_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.json', '.html', '.css', '.txt']);

export type Finding = { file: string; label: string; excerpt: string };
export type ScanResult = { files: number; violations: Finding[] };

function* walk(dir: string): Generator<string> {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) yield* walk(full);
		else if (entry.isFile()) yield full;
	}
}

function excerptAround(text: string, index: number): string {
	return text
		.slice(Math.max(0, index - 40), index + 60)
		.replace(/\s+/g, ' ')
		.trim();
}

/** Analyse les dossiers donnés (chemins absolus ou relatifs au cwd). */
export function scanBundle(targets: readonly string[]): ScanResult {
	const result: ScanResult = { files: 0, violations: [] };
	for (const target of targets) {
		if (!existsSync(target) || !statSync(target).isDirectory()) continue;
		for (const file of walk(target)) {
			const rel = path.relative(process.cwd(), file);
			if (/pglite/i.test(path.basename(file))) {
				result.violations.push({
					file: rel,
					label: 'fichier PGlite',
					excerpt: path.basename(file)
				});
			}
			const ext = path.extname(file).toLowerCase();
			if (!SCANNED_EXTENSIONS.has(ext)) continue;
			result.files += 1;
			// Champ de vue contractuel : le nom du diagnostic ne charge aucun pilote.
			const text = readFileSync(file, 'utf8').replace(/\bpgliteDriver\b/g, 'localDriver');
			for (const { label, pattern } of FORBIDDEN) {
				const m = pattern.exec(text);
				if (m) result.violations.push({ file: rel, label, excerpt: excerptAround(text, m.index) });
			}
		}
	}
	return result;
}

/** Point d'entrée CLI : renvoie le code de sortie. */
export function main(argv: readonly string[]): number {
	const targets = argv.length > 0 ? argv : [...DEFAULT_TARGETS];
	const existing = targets.filter((t) => existsSync(t));
	if (existing.length === 0) {
		console.error(
			`check-bundle : aucun dossier à vérifier (${targets.join(', ')}). Lance « npm run build » d'abord.`
		);
		return 1;
	}
	const { files, violations } = scanBundle(existing);
	if (violations.length > 0) {
		console.error(`check-bundle : ÉCHEC — ${violations.length} trace(s) interdite(s) :`);
		for (const v of violations) console.error(`  ✗ ${v.label} — ${v.file} : ${v.excerpt}`);
		return 1;
	}
	console.log(
		`check-bundle : OK — ${files} fichier(s) analysé(s) dans ${existing.join(', ')} ; ni PGlite ni seedDemo.`
	);
	return 0;
}

const isDirectRun =
	process.argv.length > 1 &&
	import.meta.url === pathToFileURL(path.resolve(process.argv[1] ?? '')).href;

if (isDirectRun) {
	// Arguments : relatifs au répertoire courant. Cibles par défaut : relatives à la racine du dépôt.
	const args = process.argv.slice(2).map((a) => path.resolve(a));
	const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
	process.exitCode = main(args.length > 0 ? args : DEFAULT_TARGETS.map((t) => path.join(root, t)));
}
