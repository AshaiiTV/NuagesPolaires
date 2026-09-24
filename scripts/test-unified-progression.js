'use strict';

const assert = require('node:assert/strict');
const { test, before, after, beforeEach } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const progression = require('../assets/js/progression');
const { createLocalApp } = require('./helpers/local-app');
const clone = value => JSON.parse(JSON.stringify(value));
const legacy = changes => ({
  id: 'p_alice', name: 'Alice', classe: 'Duelliste', branch: 'Aucune',
  level: 2, xp: 15, xpMax: 60, sLevel: 5, sXp: 25, sXpMax: 50,
  pvMax: 41, pvCur: 31, epMax: 56, epCur: 20, emMax: 22, emCur: 7,
  inventory: [], history: [], ...changes
});
function assertUnified(player, level, xp) {
  assert.equal(player.level, level);
  assert.equal(player.xp, xp);
  assert.equal(player.xpMax, level * 30);
  assert.equal(player.progressionVersion, 1);
  for (const field of ['sLevel', 'sXp', 'sXpMax']) assert.equal(Object.hasOwn(player, field), false, field);
}

test('Migration keeps the more advanced oath and spent resources without changing the source', () => {
  const source = legacy(), before = clone(source);
  const player = progression.normalizePlayer(source);
  assertUnified(player, 5, 75);
  assert.equal(player.pvMax, 59); // includes the existing +5 maximum bonus
  assert.equal(player.pvCur, 49);
  assert.equal(player.epMax, 74);
  assert.equal(player.epCur, 38);
  assert.equal(player.emMax, 28);
  assert.equal(player.emCur, 13);
  assert.deepEqual(source, before);
});

test('The more advanced character wins without summing the other XP track', () => {
  const source = legacy({ level: 7, xp: 105, xpMax: 210, sLevel: 4, sXp: 39, sXpMax: 40 });
  const player = progression.normalizePlayer(source);
  assertUnified(player, 7, 105);
  assert.equal(player.pvMax, source.pvMax);
});

test('Equal levels keep the higher fractional advancement in either direction', () => {
  assertUnified(progression.normalizePlayer(legacy({ level: 5, xp: 90, xpMax: 150 })), 5, 90);
  assertUnified(progression.normalizePlayer(legacy({ level: 5, xp: 30, xpMax: 150 })), 5, 75);
});

test('Fraction conversion rounds upward without granting an extra level', () => {
  assertUnified(progression.normalizePlayer(legacy({ sLevel: 5, sXp: 1, sXpMax: 7 })), 5, 22);
  assertUnified(progression.normalizePlayer(legacy({ sLevel: 5, sXp: 999, sXpMax: 1000 })), 5, 149);
});

test('Legacy XP at or beyond a threshold is resolved before comparing progress', () => {
  assertUnified(progression.normalizePlayer(legacy({ level: 1, xp: 30, xpMax: 30, sLevel: 1, sXp: 0, sXpMax: 10 })), 2, 0);
  assertUnified(progression.normalizePlayer(legacy({ level: 1, xp: 0, xpMax: 30, sLevel: 1, sXp: 65, sXpMax: 10 })), 4, 15);
  assertUnified(progression.normalizePlayer(legacy({ level: 2, xp: 15, xpMax: undefined, sLevel: 1, sXp: 0, sXpMax: undefined })), 2, 15);
});

test('Migration is idempotent and ignores resurrected legacy fields after the version marker', () => {
  const migrated = progression.normalizePlayer(legacy());
  assert.deepEqual(progression.normalizePlayer(migrated), migrated);
  assert.deepEqual(progression.normalizePlayer({ ...migrated, sLevel: 99, sXp: 999, sXpMax: 10 }), migrated);
});

test('Custom growth, zero growth and a knocked-out character are preserved', () => {
  const player = progression.normalizePlayer(legacy({ classe: 'Glacier', pvCur: 0 }), { pvN: 11, epN: 0, emN: 7 });
  assertUnified(player, 5, 75);
  assert.equal(player.pvMax, 74);
  assert.equal(player.pvCur, 0);
  assert.equal(player.epMax, 56);
  assert.equal(player.epCur, 20);
  assert.equal(player.emMax, 43);
  assert.equal(player.emCur, 28);
  assert.deepEqual(progression.effectiveDefinition('Duelliste', { Duelliste: { pvN: 10 } }), { pvN: 10, epN: 6, emN: 2 });
});

test('Missing and malformed progression fields normalize safely', () => {
  assertUnified(progression.normalizePlayer({}), 1, 0);
  assertUnified(progression.normalizePlayer({ level: 'bad', xp: -2, xpMax: null, sLevel: -4, sXp: Infinity }), 1, 0);
});

test('Native growth fallbacks match every actual serment definition', () => {
  const main = fs.readFileSync(path.join(__dirname, '../assets/js/main.js'), 'utf8');
  const start = main.indexOf('var SD=');
  const end = main.indexOf('\n};', start);
  assert.ok(start >= 0 && end > start, 'native serment catalogue exists');
  const native = vm.runInNewContext(main.slice(start, end + 3) + '; SD');
  for (const [name, definition] of Object.entries(native)) {
    assert.deepEqual(progression.effectiveDefinition(name), { pvN: definition.pvN, epN: definition.epN, emN: definition.emN }, name);
  }
});

test('Unified records repair stale thresholds without reviving historical XP', () => {
  const player = progression.normalizePlayer(legacy({ progressionVersion: 1, level: 3, xp: 10, xpMax: 999, sLevel: 100 }));
  assertUnified(player, 3, 10);
  assert.deepEqual(progression.normalizePlayer(player), player);
  assertUnified(progression.normalizePlayer(legacy({ progressionVersion: 'legacy' })), 5, 75);
});

let app, admin, alice, mj;
before(async () => {
  app = await createLocalApp();
  [admin, alice, mj] = await Promise.all(['admin', 'alice', 'mj'].map(id => app.cookie(id)));
});
after(async () => { if (app) { assert.deepEqual(app.errors, []); await app.close(); } });
beforeEach(async () => {
  if (!app) return;
  await app.seed('players', [legacy(), ...app.players.filter(player => player.id !== 'p_alice')]);
  await app.seed('serments_custom', { Duelliste: { pvN: 10, epN: 0, emN: 9 } });
});

test('get, get_all and session_bundle agree on custom growth and preserve raw optimistic versions', async () => {
  const raw = await app.read('players');
  const direct = await app.call('db', { action: 'get', key: 'players' }, alice);
  const all = await app.call('db', { action: 'get_all' }, admin);
  const bundle = await app.call('auth', { action: 'session_bundle' }, alice);
  assert.equal(direct.status, 200);
  assert.equal(all.status, 200);
  assert.equal(bundle.status, 200);
  const expected = direct.data.value[0];
  assertUnified(expected, 5, 75);
  assert.equal(expected.pvMax, 71);
  assert.equal(expected.epMax, 56);
  assert.equal(expected.emMax, 49);
  assert.deepEqual(all.data.data.players.find(player => player.id === 'p_alice'), expected);
  assert.deepEqual(bundle.data.data.players[0], expected);
  assert.equal(direct.data.version, raw.version);
  assert.equal(all.data.versions.players, raw.version);
  assert.equal(bundle.data.versions.players, raw.version);
  assert.deepEqual(await app.read('players'), raw);
});

test('Admin imports migrate old records once using current custom definitions', async () => {
  const raw = await app.read('players');
  const save = await app.call('db', { action: 'set', key: 'players', value: raw.value, expectedVersion: raw.version }, admin);
  assert.equal(save.status, 200);
  const persisted = await app.read('players');
  const player = persisted.value.find(player => player.id === 'p_alice');
  assertUnified(player, 5, 75);
  assert.equal(player.pvMax, 71);
  assert.equal(player.pvCur, 61);
  const read = await app.call('db', { action: 'get', key: 'players' }, admin);
  assert.deepEqual(read.data.value, persisted.value);
  const retry = await app.call('db', { action: 'set', key: 'players', value: raw.value, expectedVersion: raw.version }, admin);
  assert.equal(retry.status, 409);
  assert.deepEqual(await app.read('players'), persisted);
});

test('MJ can save migrated progression but still cannot alter protected character fields', async () => {
  const read = await app.call('db', { action: 'get', key: 'players' }, mj);
  const next = clone(read.data.value);
  next.find(player => player.id === 'p_alice').xp += 5;
  const save = await app.call('db', { action: 'set', key: 'players', value: next, expectedVersion: read.data.version }, mj);
  assert.equal(save.status, 200);
  assertUnified(save.data.value.find(player => player.id === 'p_alice'), 5, 80);
  const forbidden = clone(save.data.value);
  forbidden.find(player => player.id === 'p_alice').classe = 'Arcaniste';
  assert.equal((await app.call('db', { action: 'set', key: 'players', value: forbidden, expectedVersion: save.data.version }, mj)).status, 403);
  assert.equal((await app.call('db', { action: 'set', key: 'players', value: next, expectedVersion: read.data.version }, mj)).status, 409);
});

test('A player cannot award XP and their journal patch only changes permitted stored fields', async () => {
  const raw = await app.read('players');
  assert.equal((await app.call('db', { action: 'set', key: 'players', value: raw.value, expectedVersion: raw.version }, alice)).status, 403);
  assert.equal((await app.call('db', { action: 'patch_own_player', patch: { xp: 500 }, expectedVersion: raw.version }, alice)).status, 400);
  const patch = await app.call('db', { action: 'patch_own_player', patch: { journal: 'Note' }, expectedVersion: raw.version }, alice);
  assert.equal(patch.status, 200);
  assertUnified(patch.data.value[0], 5, 75);
  const expected = clone(raw.value);
  expected.find(player => player.id === 'p_alice').journal = 'Note';
  assert.deepEqual((await app.read('players')).value, expected);
});


test('Legacy class aliases and null custom definitions migrate consistently in auth and DB reads', async () => {
  const player = legacy({ classe: undefined, class: 'Duelliste' });
  await app.seed('players', [player, null]);
  await app.seed('serments_custom', null);
  const direct = await app.call('db', { action: 'get', key: 'players' }, alice);
  const bundle = await app.call('auth', { action: 'session_bundle' }, alice);
  assert.equal(direct.status, 200);
  assert.equal(bundle.status, 200);
  assertUnified(direct.data.value[0], 5, 75);
  assert.equal(direct.data.value[0].classe, 'Duelliste');
  assert.equal(direct.data.value[0].pvMax, 59);
  assert.deepEqual(bundle.data.data.players[0], direct.data.value[0]);
  await app.seed('players', null);
  const empty = await app.call('auth', { action: 'session_bundle' }, alice);
  assert.equal(empty.status, 200);
  assert.deepEqual(empty.data.data.players, []);
});

test('Public gem stock excludes fully consumed and invalid quantities', async () => {
  await app.seed('players', [legacy({ inventory: [
    { id: 'consumed', category: 'Gemme', qty: 0 },
    { id: 'remaining', category: 'Gemme', qty: 3 },
    { id: 'negative', category: 'Gemme', qty: -2 },
    { id: 'missing', category: 'Gemme' },
    { id: 'other', category: 'Objet', qty: 5 }
  ] })]);
  const bundle = await app.call('db', { action: 'get_public_bundle' });
  assert.equal(bundle.status, 200);
  assert.equal(bundle.data.data.public_stats.totalGemmes, 3);
});
