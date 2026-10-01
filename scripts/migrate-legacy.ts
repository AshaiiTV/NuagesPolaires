// CLI isolée (04 §7, §10.1) : snapshot local uniquement, aucune lecture du store de production.
import { writeFile } from 'node:fs/promises';
import { openDb, closeSharedDb } from '../src/lib/server/db/index';
import { readSnapshot } from '../src/lib/server/legacy/snapshot';
import { migrateSnapshot } from '../src/lib/server/legacy/migrate';
import { renderReport } from '../src/lib/server/legacy/report';
import { SnapshotError } from '../src/lib/server/legacy/snapshot';
class CliError extends Error {}

async function main() {
	const args = process.argv.slice(2);
	let input: string | undefined,
		reportFile: string | undefined,
		dryRun = false;
	for (let i = 0; i < args.length; i++) {
		const flag = args[i];
		if (flag === '--dry-run' && !dryRun) dryRun = true;
		else if (
			(flag === '--input' || flag === '--report') &&
			args[i + 1] &&
			!args[i + 1].startsWith('--')
		) {
			if (flag === '--input' && !input) input = args[++i];
			else if (flag === '--report' && !reportFile) reportFile = args[++i];
			else throw new CliError('Argument dupliqué.');
		} else
			throw new CliError(
				'Arguments invalides : --input <fichier> [--dry-run] [--report <fichier.md>].'
			);
	}
	if (!input) throw new CliError('Le fichier --input est requis.');
	if (!dryRun && process.env.NP_MIGRATE_CONFIRM !== 'oui')
		throw new CliError('Définis NP_MIGRATE_CONFIRM=oui pour écrire la migration.');
	const snapshot = await readSnapshot(input),
		handle = await openDb();
	try {
		const report = await migrateSnapshot(handle.db, snapshot, { dryRun });
		const markdown = renderReport(report);
		if (reportFile) await writeFile(reportFile, markdown, { encoding: 'utf8', mode: 0o600 });
		else process.stdout.write(markdown);
		if (
			report.checks.some((c) => !c.passed) ||
			Object.values(report.tables).some((c) => c.arbitration > 0)
		)
			process.exitCode = 2;
	} finally {
		await handle.close();
		await closeSharedDb();
	}
}
// Une erreur Drizzle contient les paramètres SQL, dont les hashes : ne jamais l'imprimer (04 §4).
main().catch((error) => {
	process.stderr.write(
		`${error instanceof CliError || error instanceof SnapshotError ? error.message : 'Migration interrompue. Aucune écriture de cette transaction n’a été validée.'}\n`
	);
	process.exitCode = 1;
});
