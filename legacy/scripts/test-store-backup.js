'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {PGlite} = require('@electric-sql/pglite');
const {neonConfig} = require('@neondatabase/serverless');
const {makeBackup, validateBackup, digestPayload, writeBackup, readBackup} = require('./helpers/store-backup');
const {readSnapshot, backupStore, losslessTypes} = require('./backup-store');
const {verifyBackup} = require('./verify-backup');

const timestamp = '2026-09-21 10:11:12.123456+00';
const fixtureRows = [
  {key: 'accounts', value: '[{"id": "fictional", "pass": "fixture-only-not-a-real-hash"}]', updated_at: timestamp},
  {key: 'large_numbers', value: '{"huge": 9007199254740993123456789, "precise": 0.123456789012345678901234567890}', updated_at: null},
  {key: 'players', value: '[{"id": "fictional-player", "journal": "Données fictives"}]', updated_at: timestamp}
];
const exportedAt = '2026-09-21T10:11:12.000Z';
const example = () => makeBackup(fixtureRows, exportedAt);
function recalculate(backup) { const {sha256, ...payload} = backup; backup.sha256 = digestPayload(payload); return backup; }

function pgFixtureSql(database, capture) {
  return url => {
    assert.equal(url, 'postgresql://fixture:fixture@fixture.invalid/fixture');
    const query = (strings, ...values) => typeof strings === 'string' ? {query: strings, values: values[0], options: values[1]} : {query: strings.reduce((sql, part, index) => sql + (index ? '$' + index : '') + part, ''), values};
    query.transaction = async (build, txOptions) => {
      capture.options = txOptions;
      assert.equal(txOptions.readOnly, true);
      assert.equal(txOptions.isolationLevel, 'RepeatableRead');
      const statements = build(query);
      capture.statements = statements.map(statement => statement.query);
      assert.equal(statements[3].options.types, losslessTypes);
      return database.transaction(async tx => {
        const results = [];
        for (const statement of statements) {
          // PGlite normally converts JSONB/Date too; emulate the configured Neon
          // text parsers for the real snapshot SELECT in this local test adapter.
          const sql = statement.query.replace('SELECT key, value, updated_at FROM', 'SELECT key, value::text AS value, updated_at::text AS updated_at FROM');
          results.push((await tx.query(sql, statement.values)).rows);
        }
        return results;
      });
    };
    return query;
  };
}

test('logical backup restores exact JSONB numbers, timestamps, nulls, and private keys in isolated PostgreSQL', async () => {
  const backup = example();
  assert.deepEqual(await verifyBackup(backup), {count: 3, sha256: backup.sha256});
  assert.equal(backup.rows[1].value, fixtureRows[1].value);
  assert.equal(losslessTypes.getTypeParser(3802, 'text')(fixtureRows[1].value), fixtureRows[1].value);
  assert.equal(losslessTypes.getTypeParser(1184, 'text')(timestamp), timestamp);
  assert.equal(losslessTypes.getTypeParser(16, 'text')('t'), true);
});

test('checksum is stable across object property order and changes for edited content or metadata', () => {
  const backup = example();
  const reordered = {sha256: backup.sha256, rows: backup.rows.map(row => ({updated_at: row.updated_at, value: row.value, key: row.key})), count: backup.count, valueEncoding: backup.valueEncoding, exportedAt: backup.exportedAt, format: backup.format};
  assert.doesNotThrow(() => validateBackup(reordered));
  for (const mutate of [value => { value.rows[0].value = '[]'; }, value => { value.exportedAt = '2026-09-22T10:11:12.000Z'; }]) {
    const broken = structuredClone(backup); mutate(broken);
    assert.throws(() => validateBackup(broken), {code: 'CHECKSUM_MISMATCH'});
  }
});

test('duplicate keys, wrong counts, invalid JSON, and unordered rows are rejected before restoration', async () => {
  const duplicate = example(); duplicate.rows[1].key = duplicate.rows[0].key;
  await assert.rejects(verifyBackup(recalculate(duplicate)), {code: 'DUPLICATE_KEY'});
  const wrongCount = example(); wrongCount.count++;
  assert.throws(() => validateBackup(recalculate(wrongCount)), {code: 'COUNT_MISMATCH'});
  const invalidJson = example(); invalidJson.rows[0].value = '{';
  assert.throws(() => validateBackup(recalculate(invalidJson)), {code: 'INVALID_JSONB'});
  const unordered = example(); unordered.rows.reverse();
  assert.throws(() => validateBackup(recalculate(unordered)), {code: 'INVALID_ROW_ORDER'});
});

test('restoration rejects valid-checksum content that PostgreSQL cannot preserve', async () => {
  const backup = makeBackup([{key: 'fixture', value: '1', updated_at: 'not-a-timestamp'}], exportedAt);
  await assert.rejects(verifyBackup(backup));
});

test('output is private, round-trips, and cannot overwrite an existing file or a symlink', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'np-backup-test-'));
  try {
    const output = path.join(temp, 'private', 'snapshot.json');
    const backup = example();
    await writeBackup(output, backup);
    assert.equal((await fs.stat(output)).mode & 0o777, 0o600);
    assert.equal((await fs.stat(path.dirname(output))).mode & 0o777, 0o700);
    assert.deepEqual(await readBackup(output), backup);
    await assert.rejects(writeBackup(output, backup), {code: 'OUTPUT_EXISTS'});
    const link = path.join(temp, 'link.json'); await fs.symlink(output, link);
    await assert.rejects(writeBackup(link, backup), {code: 'OUTPUT_EXISTS'});
    assert.deepEqual(await readBackup(output), backup);
    let connected = false;
    await assert.rejects(backupStore({sourceUrl: 'secret', output, createSql() { connected = true; }}), {code: 'OUTPUT_EXISTS'});
    assert.equal(connected, false);
  } finally { await fs.rm(temp, {recursive: true, force: true}); }
});

test('snapshot checks the single public table and fixed schema inside a read-only repeatable-read transaction', async () => {
  const database = new PGlite();
  try {
    await database.exec('CREATE TABLE public.np_store (key TEXT PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT now())');
    for (const row of fixtureRows) await database.query('INSERT INTO public.np_store VALUES ($1,$2::jsonb,$3::timestamptz)', [row.key, row.value, row.updated_at]);
    const capture = {};
    const createSql = pgFixtureSql(database, capture);
    const url = 'postgresql://fixture:fixture@fixture.invalid/fixture';
    const backup = await readSnapshot(url, createSql);
    assert.deepEqual(backup.rows, fixtureRows);
    assert.equal(capture.statements.length, 4);
    assert.equal(capture.statements[3].trim(), 'SELECT key, value, updated_at FROM public.np_store ORDER BY key');
    assert.equal((await verifyBackup(backup)).count, 3);
    await database.exec('CREATE SCHEMA duplicate; CREATE TABLE duplicate.np_store (key text)');
    await assert.rejects(readSnapshot(url, createSql), {code: 'UNEXPECTED_STORE_TABLE'});
    await database.exec('DROP SCHEMA duplicate CASCADE; ALTER TABLE public.np_store ADD COLUMN unexpected text');
    await assert.rejects(readSnapshot(url, createSql), {code: 'UNEXPECTED_STORE_SCHEMA'});
  } finally { await database.close(); }
});

test('empty stores restore successfully', async () => {
  const backup = makeBackup([], exportedAt);
  assert.deepEqual(await verifyBackup(backup), {count: 0, sha256: backup.sha256});
});

test('CLI requires explicit flags and source; ignores DATABASE_URL and does not echo secrets', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'np-backup-cli-'));
  try {
    const sourceSecret = 'postgresql://secret-user:secret-password@secret.invalid/private-db';
    const env = {...process.env, DATABASE_URL: sourceSecret, NETLIFY_DATABASE_URL: sourceSecret};
    delete env.NP_BACKUP_SOURCE_URL;
    const backupRun = spawnSync(process.execPath, [path.join(__dirname, 'backup-store.js'), '--output', path.join(temp, 'out.json')], {encoding: 'utf8', env});
    assert.equal(backupRun.status, 1);
    assert.match(backupRun.stderr, /SOURCE_REQUIRED/);
    assert.doesNotMatch(backupRun.stderr + backupRun.stdout, /secret-user|secret-password|secret.invalid|private-db/);
    await assert.rejects(fs.stat(path.join(temp, 'out.json')), {code: 'ENOENT'});
    const backup = example(); const input = path.join(temp, 'fixture.json'); await writeBackup(input, backup);
    const verifyRun = spawnSync(process.execPath, [path.join(__dirname, 'verify-backup.js'), '--input', input], {encoding: 'utf8', env: {...env, NP_BACKUP_SOURCE_URL: sourceSecret}});
    assert.equal(verifyRun.status, 0, verifyRun.stderr);
    assert.match(verifyRun.stdout, /3 entrées/);
    assert.doesNotMatch(verifyRun.stdout + verifyRun.stderr, /fixture-only|secret-user|secret-password|secret.invalid/);
    const badFlags = spawnSync(process.execPath, [path.join(__dirname, 'verify-backup.js'), '--input', input, '--target', sourceSecret], {encoding: 'utf8', env});
    assert.equal(badFlags.status, 1);
    assert.match(badFlags.stderr, /INVALID_ARGUMENTS/);
    assert.doesNotMatch(badFlags.stdout + badFlags.stderr, /secret-user|secret-password|secret.invalid/);
  } finally { await fs.rm(temp, {recursive: true, force: true}); }
});

test('installed Neon driver preserves raw JSONB and microseconds and sends read-only snapshot headers', async () => {
  const previousFetch = neonConfig.fetchFunction;
  const response = (fields, rows) => ({fields: fields.map(([name, dataTypeID]) => ({name, dataTypeID})), rows});
  const results = [
    response([['timezone', 25], ['datestyle', 25]], [['UTC', 'ISO, YMD']]),
    response([['schema_name', 25], ['relation_kind', 18], ['row_security', 16]], [['public', 'r', 'f']]),
    response([['name', 25], ['type', 25], ['not_null', 16], ['primary_key', 16]], [
      ['key', 'text', 't', 't'], ['value', 'jsonb', 't', 'f'], ['updated_at', 'timestamp with time zone', 'f', 'f']
    ]),
    response([['key', 25], ['value', 3802], ['updated_at', 1184]], fixtureRows.map(row => [row.key, row.value, row.updated_at]))
  ];
  let calls = 0;
  neonConfig.fetchFunction = async (_url, request) => {
    calls++;
    assert.equal(request.headers['Neon-Batch-Read-Only'], 'true');
    assert.equal(request.headers['Neon-Batch-Isolation-Level'], 'RepeatableRead');
    const body = JSON.parse(request.body);
    assert.equal(body.queries.length, 4);
    assert.equal(body.queries[3].query, 'SELECT key, value, updated_at FROM public.np_store ORDER BY key');
    return {ok: true, json: async () => ({results})};
  };
  try {
    const backup = await readSnapshot('postgresql://fixture:fixture@fixture.invalid/fixture');
    assert.equal(calls, 1);
    assert.deepEqual(backup.rows, fixtureRows);
  } finally { neonConfig.fetchFunction = previousFetch; }
});
