'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const FORMAT = 'np-store-backup-v1';
const VALUE_ENCODING = 'postgresql-jsonb-text';

// Deliberately keep JSONB and timestamps as PostgreSQL text: JSON.parse followed
// by JSON.stringify could round large JSON numbers, while Date loses microseconds.
// The digest covers every envelope field except sha256, with sorted object keys.
function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalJson(value[key])).join(',') + '}';
}

function fail(code) { const error = new Error(code); error.code = code; throw error; }
function exactKeys(value, expected) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).sort().join(',') === [...expected].sort().join(',');
}
function validateRows(rows) {
  if (!Array.isArray(rows)) fail('INVALID_ROWS');
  const seen = new Set();
  for (const row of rows) {
    if (!exactKeys(row, ['key', 'value', 'updated_at']) || typeof row.key !== 'string' ||
        typeof row.value !== 'string' || !(row.updated_at === null || typeof row.updated_at === 'string' && row.updated_at.length > 0)) fail('INVALID_ROW');
    if (seen.has(row.key)) fail('DUPLICATE_KEY');
    seen.add(row.key);
    try { JSON.parse(row.value); } catch { fail('INVALID_JSONB'); }
  }
}
function digestPayload(payload) { return crypto.createHash('sha256').update(canonicalJson(payload)).digest('hex'); }
function makeBackup(rows, exportedAt = new Date().toISOString()) {
  validateRows(rows);
  const orderedRows = rows.map(row => ({key: row.key, value: row.value, updated_at: row.updated_at})).sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  const payload = {format: FORMAT, exportedAt, valueEncoding: VALUE_ENCODING, count: orderedRows.length, rows: orderedRows};
  const backup = {...payload, sha256: digestPayload(payload)};
  validateBackup(backup);
  return backup;
}
function validateBackup(backup) {
  if (!exactKeys(backup, ['format', 'exportedAt', 'valueEncoding', 'count', 'rows', 'sha256']) ||
      backup.format !== FORMAT || backup.valueEncoding !== VALUE_ENCODING ||
      typeof backup.exportedAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(backup.exportedAt) ||
      !Number.isFinite(Date.parse(backup.exportedAt)) ||
      !Number.isSafeInteger(backup.count) || backup.count < 0 ||
      typeof backup.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(backup.sha256)) fail('INVALID_FORMAT');
  validateRows(backup.rows);
  if (backup.count !== backup.rows.length) fail('COUNT_MISMATCH');
  for (let i = 1; i < backup.rows.length; i++) if (backup.rows[i - 1].key >= backup.rows[i].key) fail('INVALID_ROW_ORDER');
  const {sha256, ...payload} = backup;
  if (digestPayload(payload) !== sha256) fail('CHECKSUM_MISMATCH');
  return backup;
}
async function readBackup(filename) {
  let backup;
  try { backup = JSON.parse(await fs.readFile(filename, 'utf8')); }
  catch { fail('UNREADABLE_BACKUP'); }
  return validateBackup(backup);
}
async function assertNewOutput(filename) {
  if (typeof filename !== 'string' || !filename.trim()) fail('OUTPUT_REQUIRED');
  try { await fs.lstat(filename); fail('OUTPUT_EXISTS'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
async function writeBackup(filename, backup) {
  validateBackup(backup);
  await assertNewOutput(filename);
  await fs.mkdir(path.dirname(path.resolve(filename)), {recursive: true, mode: 0o700});
  let file;
  try {
    file = await fs.open(filename, 'wx', 0o600);
    await file.chmod(0o600);
    await file.writeFile(JSON.stringify(backup, null, 2) + '\n', 'utf8');
    await file.sync();
  } catch (error) {
    if (file) { await file.close().catch(() => {}); file = null; await fs.unlink(filename).catch(() => {}); }
    if (error.code === 'EEXIST') fail('OUTPUT_EXISTS');
    throw error;
  } finally { if (file) await file.close(); }
}
function oneFileArgument(args, flag) {
  if (args.length !== 2 || args[0] !== flag || !args[1] || args[1].startsWith('--')) fail('INVALID_ARGUMENTS');
  return args[1];
}
module.exports = {FORMAT, VALUE_ENCODING, canonicalJson, digestPayload, fail, makeBackup, validateBackup, readBackup, assertNewOutput, writeBackup, oneFileArgument};
