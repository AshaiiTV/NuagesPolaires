'use strict';

// Usage: node scripts/verify-backup.js --input <backup file>
// This verifier has no URL/target option and creates only a fresh, in-memory
// PostgreSQL instance. It cannot restore or modify a deployment database.
const {PGlite} = require('@electric-sql/pglite');
const {fail, readBackup, validateBackup, oneFileArgument} = require('./helpers/store-backup');

async function verifyBackup(backup) {
  validateBackup(backup);
  const database = new PGlite();
  try {
    await database.exec("SET TIME ZONE 'UTC'; SET DateStyle TO 'ISO, YMD'; CREATE TABLE public.np_store (key TEXT PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT now())");
    await database.transaction(async tx => {
      for (const row of backup.rows) {
        await tx.query('INSERT INTO public.np_store(key,value,updated_at) VALUES ($1,$2::jsonb,$3::timestamptz)', [row.key, row.value, row.updated_at]);
      }
    });
    const restored = (await database.query('SELECT key, value::text AS value, updated_at::text AS updated_at FROM public.np_store ORDER BY key')).rows;
    if (restored.length !== backup.count) fail('RESTORE_COUNT_MISMATCH');
    const restoredByKey = new Map(restored.map(row => [row.key, row]));
    for (const row of backup.rows) {
      const actual = restoredByKey.get(row.key);
      // JSONB text is intentionally compared without a lossy JS parse/stringify.
      if (!actual || actual.value !== row.value || actual.updated_at !== row.updated_at) fail('RESTORE_CONTENT_MISMATCH');
    }
    return {count: backup.count, sha256: backup.sha256};
  } finally { await database.close(); }
}
async function main() {
  const input = oneFileArgument(process.argv.slice(2), '--input');
  const result = await verifyBackup(await readBackup(input));
  console.log(`Restauration isolée vérifiée : ${result.count} entrées ; SHA-256 ${result.sha256}.`);
}
if (require.main === module) main().catch(error => {
  const codes = new Set(['INVALID_ARGUMENTS', 'UNREADABLE_BACKUP', 'INVALID_FORMAT', 'INVALID_ROWS', 'INVALID_ROW', 'DUPLICATE_KEY', 'INVALID_JSONB', 'COUNT_MISMATCH', 'INVALID_ROW_ORDER', 'CHECKSUM_MISMATCH', 'RESTORE_COUNT_MISMATCH', 'RESTORE_CONTENT_MISMATCH']);
  console.error(`Échec de vérification (${codes.has(error.code) ? error.code : 'RESTORE_FAILED'}). Aucune base distante n’a été contactée.`);
  process.exitCode = 1;
});
module.exports = {verifyBackup};
