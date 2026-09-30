'use strict';

// Usage: NP_BACKUP_SOURCE_URL=<private connection string> node scripts/backup-store.js --output <new file>
// Never falls back to a deployment/database environment variable. This is a
// logical snapshot of public.np_store, not a backup of other tables or schemas.
const {neon, types} = require('@neondatabase/serverless');
const {fail, makeBackup, assertNewOutput, writeBackup, oneFileArgument} = require('./helpers/store-backup');

const losslessTypes = {
  getTypeParser(oid, format) {
    if (format !== 'binary' && (oid === 3802 || oid === 1184)) return value => value;
    return types.getTypeParser(oid, format);
  }
};
function validateSource(sourceUrl) {
  if (typeof sourceUrl !== 'string' || !sourceUrl) fail('SOURCE_REQUIRED');
  let source;
  try { source = new URL(sourceUrl); } catch { fail('INVALID_SOURCE'); }
  if (!['postgres:', 'postgresql:'].includes(source.protocol) || !source.hostname || !source.username || !source.pathname || source.pathname === '/') fail('INVALID_SOURCE');
}
async function readSnapshot(sourceUrl, createSql = neon) {
  validateSource(sourceUrl);
  const sql = createSql(sourceUrl);
  const results = await sql.transaction(tx => [
    // Standardise timestamp text without changing any stored data.
    tx`SELECT set_config('TimeZone', 'UTC', true), set_config('DateStyle', 'ISO, YMD', true)`,
    tx`SELECT n.nspname AS schema_name, c.relkind AS relation_kind, c.relrowsecurity AS row_security
       FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
       WHERE c.relname = 'np_store' AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
       ORDER BY n.nspname`,
    tx`SELECT a.attname AS name, pg_catalog.format_type(a.atttypid, a.atttypmod) AS type,
              a.attnotnull AS not_null,
              EXISTS (SELECT 1 FROM pg_catalog.pg_constraint p WHERE p.conrelid = a.attrelid
                      AND p.contype = 'p' AND p.conkey = ARRAY[a.attnum]) AS primary_key
       FROM pg_catalog.pg_attribute a
       WHERE a.attrelid = 'public.np_store'::regclass AND a.attnum > 0 AND NOT a.attisdropped
       ORDER BY a.attnum`,
    // Neon 0.10.x applies custom parsers only to individual query options.
    // Passing types to neon() or transaction() is silently ignored in this version.
    tx('SELECT key, value, updated_at FROM public.np_store ORDER BY key', [], {types: losslessTypes})
  ], {isolationLevel: 'RepeatableRead', readOnly: true});
  if (!Array.isArray(results) || results.length !== 4) fail('INVALID_SOURCE_RESULT');
  const [, relations, columns, rows] = results;
  if (!Array.isArray(relations) || relations.length !== 1 || relations[0].schema_name !== 'public' || relations[0].relation_kind !== 'r' || relations[0].row_security !== false) fail('UNEXPECTED_STORE_TABLE');
  const expected = [
    {name: 'key', type: 'text', not_null: true, primary_key: true},
    {name: 'value', type: 'jsonb', not_null: true, primary_key: false},
    {name: 'updated_at', type: 'timestamp with time zone', not_null: false, primary_key: false}
  ];
  if (JSON.stringify(columns) !== JSON.stringify(expected)) fail('UNEXPECTED_STORE_SCHEMA');
  return makeBackup(rows);
}
async function backupStore({sourceUrl, output, createSql}) {
  await assertNewOutput(output);
  const backup = await readSnapshot(sourceUrl, createSql);
  await writeBackup(output, backup);
  return {count: backup.count, sha256: backup.sha256};
}
async function main() {
  const output = oneFileArgument(process.argv.slice(2), '--output');
  const result = await backupStore({sourceUrl: process.env.NP_BACKUP_SOURCE_URL, output});
  console.log(`Sauvegarde logique créée : ${result.count} entrées ; SHA-256 ${result.sha256}.`);
}
if (require.main === module) main().catch(error => {
  // Never print driver error text, query values, paths, or the connection URL.
  const codes = new Set(['SOURCE_REQUIRED', 'INVALID_SOURCE', 'OUTPUT_REQUIRED', 'OUTPUT_EXISTS', 'INVALID_ARGUMENTS', 'UNEXPECTED_STORE_TABLE', 'UNEXPECTED_STORE_SCHEMA', 'INVALID_SOURCE_RESULT']);
  console.error(`Échec de sauvegarde (${codes.has(error.code) ? error.code : 'BACKUP_FAILED'}). Aucun détail de connexion ni aucune donnée ne sont affichés.`);
  process.exitCode = 1;
});
module.exports = {losslessTypes, validateSource, readSnapshot, backupStore};
