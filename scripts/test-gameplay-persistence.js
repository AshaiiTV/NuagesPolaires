'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test, before, after, beforeEach } = require('node:test');
const { createLocalApp } = require('./helpers/local-app');
const clone = value => JSON.parse(JSON.stringify(value));
const source = fs.readFileSync(path.join(__dirname, '../assets/js/main.js'), 'utf8');
function section(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, 'Production function boundaries must exist');
  return source.slice(from, to);
}
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

const progressionCode = section('function doLvlUp(p){', '// Save a detached draft;') +
  section('async function adjVal(pid,field,delta){', '// ==========================================\n// PLAYER MGMT');
for (const classe of ['Custom', 'Native']) {
  test('XP and manual levels use the current ' + classe + ' serment definition', async () => {
    const player = { id: 'hero', name: 'Hero', classe, level: 1, xp: 90, xpMax: 30, pvMax: 30, pvCur: 12, epMax: 50, epCur: 15, emMax: 20, emCur: 8, history: [] };
    const context = {
      Date, SD: { Native: { pvN: 1, epN: 2, emN: 3 } },
      getAllSD: () => ({ Custom: { pvN: 7, epN: 8, emN: 9 }, Native: { pvN: 7, epN: 8, emN: 9 } }),
      xpReq: level => level * 30, can: () => true, gpid: () => player,
      CU: { name: 'Admin', pid: 'another-player' }, esc: value => value,
      sysLog() {}, ge: () => null, renderSPList() {}, notif() {},
      up: async () => ({ ok: true }), _confirmDbSave: async promise => (await promise).ok,
      _npClone: value => value, getSermPalierDefsFor: () => [],
      _progPid: null, saveProgressionPlayer: async () => true, refreshProgressionPanel() {}, switchProgTab() {}
    };
    vm.createContext(context);
    vm.runInContext(progressionCode, context);
    assert.deepEqual(Array.from(context.doLvlUp(player)), [2, 3]);
    assert.deepEqual([player.level, player.xp, player.xpMax], [3, 0, 90]);
    assert.deepEqual([player.pvMax, player.epMax, player.emMax], [44, 66, 38]);
    assert.deepEqual([player.pvCur, player.epCur, player.emCur], [44, 66, 38]);
    await context.adjVal(player.id, 'level', -1);
    assert.deepEqual([player.level, player.xpMax], [2, 60]);
    assert.deepEqual([player.pvMax, player.epMax, player.emMax], [37, 58, 29]);
    assert.deepEqual([player.pvCur, player.epCur, player.emCur], [37, 58, 29]);
  });
}

const persistenceCode = section('function _enqueueDbMutation(key, payload){', 'function _deleteDbKey(key){') +
  section('function sv(k, v){', 'async function _savePlayerPatch(pid, patch){') +
  section('function gp(){', 'function gb(){') +
  section('async function combatEnd(){', '// ── Combattants');
let app;
before(async () => { app = await createLocalApp(); });
after(async () => { if (app) await app.close(); });
beforeEach(async () => { await app.seed('players', app.players); });

async function fixture() {
  const cookie = await app.cookie('mj');
  const initial = await app.call('db', { action: 'get', key: 'players' }, cookie);
  assert.equal(initial.status, 200);
  const notices = [], writes = [], renders = [];
  let archive = async () => {};
  let beforeWrite = async () => {};
  const context = {
    Date, Promise, CU: { name: 'Maitre', role: 'mj' },
    _dbToken: true, _dbOffline: false, _dbSessionGeneration: 1,
    _dbVersions: { players: initial.data.version }, _dbCache: { players: clone(initial.data.value) },
    _DB_WRITE_QUEUE: {}, _LOCAL_ONLY_KEYS: [],
    _cloneForDb: clone, _normalizeDbValueForKey: (_key, value) => clone(value),
    _isPrivateKey: () => true, _isLegacyCombatArchiveStorageKey: () => false, _isDbBackedKey: () => true,
    localStorage: { removeItem() {} },
    sto: key => context._dbCache[key],
    _reportDbWriteSuccess() {}, _reportDbWriteError() {},
    _dbWriteFailure(_key, response) { const error = new Error(response.error || response.code || 'Save failed'); error.code = response.code; return error; },
    _assertDbSessionGeneration(generation) {
      if (generation !== context._dbSessionGeneration) throw new Error('SESSION_CHANGED');
    },
    async _dbCall(payload) {
      writes.push(clone(payload));
      await beforeWrite(payload);
      const response = await app.call('db', payload, cookie);
      return { ...response.data, status: response.status };
    },
    notif: (message, type) => notices.push({ message, type }), cLog() {}, rCombat: target => renders.push(target),
    combatSaveArc: () => archive(),
    _cs: { id: 'combat-fixture', name: 'Combat', round: 3, active: true, phase: 'declaration', fighters: [
      { type: 'player', pid: 'p_alice', name: 'Alice', pvMax: 30, pvCur: 19, epMax: 50, epCur: 35, emMax: 20, emCur: 8 },
      { type: 'player', pid: 'p_alice', name: 'Invocation', isSummon: true, pvMax: 12, pvCur: 7, epMax: 999, epCur: 999, emMax: 0, emCur: 0 }
    ] }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(persistenceCode, context);
  return {
    context, notices, writes, renders,
    holdArchive() {
      const entered = deferred(), resume = deferred();
      archive = async () => { entered.resolve(); await resume.promise; };
      return { entered: entered.promise, resume: resume.resolve };
    },
    holdWrites() {
      const entered = deferred(), resume = deferred();
      beforeWrite = async () => { entered.resolve(); await resume.promise; };
      return { entered: entered.promise, resume: resume.resolve };
    },
    async refresh() {
      const bundle = await app.call('auth', { action: 'session_bundle' }, cookie);
      assert.equal(bundle.status, 200);
      context._dbVersions.players = bundle.data.versions.players;
      context._dbCache.players = clone(bundle.data.data.players);
    }
  };
}

test('Finishing a combat persists the owner stats once and excludes its invocation', async () => {
  const f = await fixture();
  assert.equal(await f.context.combatEnd(), true);
  const players = (await app.read('players')).value;
  const owner = players.find(player => player.id === 'p_alice');
  assert.deepEqual([owner.pvMax, owner.pvCur, owner.epCur, owner.emCur], [30, 19, 35, 8]);
  assert.equal(owner.history.filter(entry => entry.combatId === 'combat-fixture').length, 1);
  assert.deepEqual(players.find(player => player.id === 'p_bob'), app.players.find(player => player.id === 'p_bob'));
  assert.equal(f.notices.filter(notice => notice.type === 'ok').length, 1);
});

test('A refreshed journal cannot be erased when combat archiving finishes later', async () => {
  const f = await fixture(), archive = f.holdArchive();
  const ending = f.context.combatEnd();
  await archive.entered;
  const players = (await app.read('players')).value;
  players.find(player => player.id === 'p_bob').journal = 'New remote journal';
  await app.seed('players', players);
  await f.refresh();
  archive.resume();
  assert.equal(await ending, false);
  assert.deepEqual((await app.read('players')).value, players);
  assert.equal(f.writes.length, 0);
  assert.equal(f.notices.some(notice => notice.type === 'ok'), false);
});

test('A combat cannot inherit the revision of a queued player write', async () => {
  const f = await fixture(), archive = f.holdArchive(), write = f.holdWrites();
  const ending = f.context.combatEnd();
  await archive.entered;
  const updated = clone(f.context.gp());
  updated.find(player => player.id === 'p_bob').xp = 12;
  const saving = f.context.sp(updated);
  await write.entered;
  archive.resume();
  assert.equal(await ending, false);
  write.resume();
  await saving;
  assert.equal((await app.read('players')).value.find(player => player.id === 'p_bob').xp, 12);
  assert.equal(f.writes.length, 1);
  assert.equal(f.notices.some(notice => notice.type === 'ok'), false);
});

test('An unrefreshed remote change remains protected by PostgreSQL compare-and-set', async () => {
  const f = await fixture(), archive = f.holdArchive();
  const ending = f.context.combatEnd();
  await archive.entered;
  const players = (await app.read('players')).value;
  players.find(player => player.id === 'p_bob').journal = 'Remote without refresh';
  await app.seed('players', players);
  archive.resume();
  assert.equal(await ending, false);
  assert.deepEqual((await app.read('players')).value, players);
  assert.equal(f.notices.some(notice => notice.type === 'ok'), false);
});

test('A session change during archiving prevents the pending combat from writing fiches', async () => {
  const f = await fixture(), archive = f.holdArchive();
  const ending = f.context.combatEnd();
  await archive.entered;
  f.context._dbSessionGeneration++;
  archive.resume();
  assert.equal(await ending, false);
  assert.equal(f.writes.length, 0);
  assert.deepEqual(f.notices, []);
  assert.deepEqual(f.renders, []);
  assert.deepEqual((await app.read('players')).value, app.players);
});

test('A double click while combat archiving is pending cannot duplicate its history', async () => {
  const f = await fixture(), archive = f.holdArchive();
  const ending = f.context.combatEnd();
  await archive.entered;
  assert.equal(await f.context.combatEnd(), false);
  archive.resume();
  assert.equal(await ending, true);
  const owner = (await app.read('players')).value.find(player => player.id === 'p_alice');
  assert.equal(owner.history.length, 1);
  assert.equal(f.writes.length, 1);
});
