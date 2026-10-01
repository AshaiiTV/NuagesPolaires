// Garde de bundle (04 §10.2) : `scripts/check-bundle.ts` échoue sur le mot « pglite » sous toute casse ;
// les modules serveur qui ENTRENT dans le bundle de production (la fabrique de connexion et ce qu'elle
// importe statiquement) doivent donc, une fois compilés, ne jamais le contenir.
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { afterAll, describe, expect, it } from 'vitest';
import { scanBundle } from '../../../../scripts/check-bundle';
import { LOCAL_DIR_VAR, LOCAL_DRIVER } from './index';

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Modules embarqués : index.ts et la fermeture de ses imports statiques relatifs (vérifiée plus bas),
 * plus referentials.ts, que le code applicatif importe pour les constantes de thèmes et de réglages.
 */
const BUNDLED = ['index.ts', 'schema.ts', 'migrations-folder.ts', 'referentials.ts'].map((f) =>
	path.join(here, f)
);

/** Compilation TypeScript → JavaScript, commentaires CONSERVÉS (pire cas pour la garde). */
function compile(file: string): string {
	return ts.transpileModule(readFileSync(file, 'utf8'), {
		compilerOptions: {
			module: ts.ModuleKind.ESNext,
			target: ts.ScriptTarget.ES2022,
			removeComments: false,
			verbatimModuleSyntax: false
		},
		fileName: file
	}).outputText;
}

/** Spécificateurs relatifs importés à l'exécution (statiques ou dynamiques littéraux). */
function runtimeRelativeImports(js: string): string[] {
	const found = new Set<string>();
	const patterns = [
		/\bfrom\s*['"](\.{1,2}\/[^'"]+)['"]/g,
		/\bimport\s*['"](\.{1,2}\/[^'"]+)['"]/g,
		/\bimport\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g
	];
	for (const re of patterns) for (const m of js.matchAll(re)) found.add(m[1]!);
	return [...found];
}

const tempDirs: string[] = [];
function tempDir(): string {
	const dir = mkdtempSync(path.join(tmpdir(), 'np-bundle-'));
	tempDirs.push(dir);
	return dir;
}

afterAll(() => {
	for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

describe('modules serveur embarqués', () => {
	it('index.ts n’importe statiquement que des modules embarqués propres', () => {
		const allowed = new Set(BUNDLED.map((f) => path.normalize(f)));
		for (const file of BUNDLED) {
			for (const spec of runtimeRelativeImports(compile(file))) {
				const target = path.normalize(path.resolve(path.dirname(file), `${spec}.ts`));
				expect(allowed.has(target), `${path.basename(file)} importe ${spec}`).toBe(true);
			}
		}
	});

	it('compilés (commentaires compris), ils ne contiennent ni « pglite » ni seedDemo', () => {
		const dir = tempDir();
		for (const file of BUNDLED) {
			writeFileSync(path.join(dir, path.basename(file).replace(/\.ts$/, '.js')), compile(file));
		}
		const { files, violations } = scanBundle([dir]);
		expect(files).toBe(BUNDLED.length);
		expect(violations).toEqual([]);
	});

	it('le pilote local reste reconnu à l’exécution (valeurs reconstruites)', () => {
		expect(LOCAL_DRIVER).toBe('pglite');
		expect(LOCAL_DIR_VAR).toBe('NP_PGLITE_DIR');
	});
});

describe('scripts/check-bundle.ts', () => {
	it('échoue sur le mot « pglite » nu, sous toute casse, et sur un nom de fichier', () => {
		const dir = tempDir();
		writeFileSync(path.join(dir, 'a.js'), 'const d = process.env.NP_DB_DRIVER === "pglite";');
		writeFileSync(path.join(dir, 'b.js'), 'throw new Error("PGlite refusé");');
		writeFileSync(path.join(dir, 'c.mjs'), 'export const ok = 1;');
		writeFileSync(path.join(dir, 'pglite.wasm'), '');
		const { violations } = scanBundle([dir]);
		const files = new Set(violations.map((v) => path.basename(v.file)));
		expect(files).toEqual(new Set(['a.js', 'b.js', 'pglite.wasm']));
		expect(violations.some((v) => v.label.startsWith('mot « pglite »'))).toBe(true);
	});

	it('échoue sur le paquet, le pilote Drizzle et seedDemo ; passe sur un bundle propre', () => {
		const dir = tempDir();
		writeFileSync(path.join(dir, 'a.js'), 'import "@electric-sql/pglite";');
		writeFileSync(path.join(dir, 'b.js'), 'export async function seedDemo() {}');
		const labels = scanBundle([dir]).violations.map((v) => v.label);
		expect(labels).toEqual(
			expect.arrayContaining(['paquet @electric-sql/pglite', 'jeu de démonstration (seedDemo)'])
		);
		const clean = tempDir();
		writeFileSync(path.join(clean, 'server.js'), 'export const driver = "neon";');
		expect(scanBundle([clean])).toEqual({ files: 1, violations: [] });
	});
});
