export interface TableCounts {
	read: number;
	created: number;
	unchanged: number;
	arbitration: number;
	quarantined: number;
}
export interface MigrationAnomaly {
	code: string;
	sourceKey: string;
	sourceId: string;
	message: string;
}
export interface MigrationReport {
	dryRun: boolean;
	tables: Record<string, TableCounts>;
	anomalies: MigrationAnomaly[];
	ignored: Record<string, number>;
	places: string[];
	checks: { name: string; passed: boolean; detail: string }[];
	writes: number;
}
export function createReport(dryRun: boolean): MigrationReport {
	return { dryRun, tables: {}, anomalies: [], ignored: {}, places: [], checks: [], writes: 0 };
}
export function tableCounts(report: MigrationReport, table: string): TableCounts {
	return (report.tables[table] ??= {
		read: 0,
		created: 0,
		unchanged: 0,
		arbitration: 0,
		quarantined: 0
	});
}
function escape(value: string): string {
	return value.replaceAll('|', '\\|').replaceAll('\r', ' ').replaceAll('\n', ' ');
}
/** Rapport privé : les mots de passe, hashes et corps de fiches n'y figurent jamais. */
export function renderReport(report: MigrationReport): string {
	const lines = [
		'# Migration des données héritées',
		'',
		report.dryRun
			? 'Simulation : toutes les écritures ont été annulées.'
			: 'Import transactionnel.',
		'',
		`Écritures cibles : ${report.writes}.`,
		'',
		'| Table | Lus | Créés | Inchangés | À arbitrer | En quarantaine |',
		'|---|---:|---:|---:|---:|---:|'
	];
	for (const [table, c] of Object.entries(report.tables))
		lines.push(
			`| ${table} | ${c.read} | ${c.created} | ${c.unchanged} | ${c.arbitration} | ${c.quarantined} |`
		);
	lines.push('', '## Vérifications de sortie', '');
	for (const c of report.checks)
		lines.push(
			`- ${c.passed ? 'Conforme' : 'À vérifier'} : ${escape(c.name)} — ${escape(c.detail)}`
		);
	lines.push('', '## Anomalies', '');
	for (const a of report.anomalies)
		lines.push(
			`- ${a.code} · ${escape(a.sourceKey)} / ${escape(a.sourceId)} : ${escape(a.message)}`
		);
	if (!report.anomalies.length) lines.push('Aucune anomalie.');
	lines.push('', '## Clés ignorées', '');
	for (const [key, n] of Object.entries(report.ignored)) lines.push(`- ${escape(key)} : ${n}`);
	lines.push('', '## Lieux conservés dans le rapport seulement', '');
	for (const place of report.places) lines.push(`- ${escape(place)}`);
	return lines.join('\n') + '\n';
}
