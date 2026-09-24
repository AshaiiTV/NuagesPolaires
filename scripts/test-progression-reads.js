'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const source = fs.readFileSync(path.join(__dirname, '../assets/js/main.js'), 'utf8');
const clone = value => JSON.parse(JSON.stringify(value));
const tick = () => new Promise(resolve => setImmediate(resolve));
function section(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, 'Production function boundaries exist: ' + start);
  return source.slice(from, to);
}
const code = [
  section('function _dbSessionChangedError(){', 'async function apiAuth('),
  section('function _hydrateBundleData(', 'const BUILTIN_THEME_IDS'),
  section('function _rememberDbVersions(versions){', 'var _dbToken ='),
  section('function _enqueueDbMutation(key, payload){', 'function _deleteDbKey(key){'),
  section('function sv(k, v){', 'async function _savePlayerPatch(pid, patch){'),
  section('function gp(){', 'function gb(){'),
  section('var _progressionSaving=', 'function refreshProgressionPanel('),
  section('async function _refreshPrivateCaches(){', 'function scrollFicheSection(')
].join('\n');

function fixture() {
  const requests = [], notices = [];
  let saved = [{ id: 'hero', name: 'Hero', level: 1, xp: 2, xpMax: 30, progressionVersion: 1 }];
  let version = 'version-0', revision = 0;
  const context = {
    console: { warn() {} },
    _themePreferenceRevision: 0, _themeSelection: null,
    _dbSessionGeneration: 1, _dbCache: { players: clone(saved) }, _dbVersions: { players: version },
    _dbToken: true, _dbOffline: false, _DB_WRITE_QUEUE: Object.create(null), _LOCAL_ONLY_KEYS: [],
    _npClone: clone, _cloneForDb: clone, _normalizeDbValueForKey: (_key, value) => clone(value),
    normalizeThemeId: String, _isPrivateKey: () => true, _isLegacyCombatArchiveStorageKey: () => false, _isDbBackedKey: () => true,
    localStorage: { setItem() {}, removeItem() {} },
    _reportDbWriteSuccess() {}, _reportDbWriteError() {},
    _dbWriteFailure(_key, response) { return Object.assign(new Error(response.error || response.code || 'Save failed'), { code: response.code }); },
    notif: message => notices.push(message),
    fetch: (url, options) => new Promise(resolve => requests.push({ url, payload: JSON.parse(options.body), resolve, snapshot: clone(saved), version }))
  };
  context.window = context;
  context.sto = key => context._dbCache[key];
  vm.createContext(context);
  vm.runInContext(code, context, { filename: 'production-progression-read-functions.js' });
  function respond(request, value, status = 200) {
    request.resolve({ ok: status < 400, status, json: async () => clone(value) });
  }
  function respondRead(request) {
    if (request.payload.action === 'get') return respond(request, { ok: true, key: 'players', value: request.snapshot, version: request.version });
    respond(request, { ok: true, data: { players: request.snapshot, accounts: [{ id: 'account', pseudo: 'Fresh account' }], beasts: [{ id: 'wolf' }] }, versions: { players: request.version, accounts: 'accounts-current', beasts: 'beasts-current' } });
  }
  function commit(request) {
    assert.equal(request.payload.action, 'set');
    assert.equal(request.payload.expectedVersion, version, 'The save must use the revision of the data it edited');
    saved = clone(request.payload.value);
    version = 'version-' + ++revision;
    respond(request, { ok: true, key: 'players', value: saved, version });
  }
  function saveGain(amount) {
    const draft = clone(context.gp()[0]);
    draft.xp += amount;
    return context.saveProgressionPlayer(draft);
  }
  function read(kind) {
    if (kind === 'session_bundle') return context._loadSessionBundle();
    if (kind === 'get_all') return context._dbCall({ action: 'get_all' }).then(bundle => context._hydrateBundleData(bundle));
    return context._dbCall({ action: 'get', key: 'players' });
  }
  return { context, requests, notices, respond, respondRead, commit, saveGain, read,
    stored: () => ({ players: clone(saved), version }),
    remoteGain(amount) { saved[0].xp += amount; version = 'version-' + ++revision; }
  };
}

for (const kind of ['session_bundle', 'get_all', 'get']) {
  for (const timing of ['pending', 'confirmed']) {
    test(kind + ' started before a write cannot erase XP when its stale reply arrives ' + timing, async () => {
      const f = fixture(), read = f.read(kind), readRequest = f.requests[0];
      const firstSave = f.saveGain(5);
      await tick();
      const writeRequest = f.requests.find(request => request.payload.action === 'set');
      if (timing === 'confirmed') { f.commit(writeRequest); assert.equal(await firstSave, true); }
      f.respondRead(readRequest);
      const response = await read;
      assert.equal(f.context.gp()[0].xp, 7);
      assert.equal(f.context._dbVersions.players, timing === 'confirmed' ? 'version-1' : 'version-0');
      if (kind === 'get') {
        assert.equal(response.skipped, true);
        assert.equal(Object.hasOwn(response, 'value'), false);
        assert.equal(Object.hasOwn(response, 'version'), false);
      } else {
        assert.equal(Object.hasOwn(response.data, 'players'), false);
        assert.equal(Object.hasOwn(response.versions, 'players'), false);
        assert.equal(f.context._dbCache.accounts[0].pseudo, 'Fresh account');
        assert.equal(f.context._dbVersions.accounts, 'accounts-current');
      }
      if (timing === 'pending') { f.commit(writeRequest); assert.equal(await firstSave, true); }
      const secondSave = f.saveGain(7);
      await tick();
      f.commit(f.requests.filter(request => request.payload.action === 'set').at(-1));
      assert.equal(await secondSave, true);
      assert.equal(f.context.gp()[0].xp, 14);
      assert.equal(f.stored().players[0].xp, 14, 'Both sequential XP awards survive the intervening stale read');
    });
  }

  test(kind + ' started during a write stays stale after that write is confirmed', async () => {
    const f = fixture(), saving = f.saveGain(5);
    await tick();
    const reading = f.read(kind), readRequest = f.requests.at(-1);
    f.commit(f.requests[0]);
    assert.equal(await saving, true);
    assert.equal(f.context._DB_WRITE_QUEUE.players, undefined);
    f.respondRead(readRequest);
    await reading;
    assert.equal(f.context.gp()[0].xp, 7);
    assert.equal(f.context._dbVersions.players, 'version-1');
  });

  test(kind + ' refreshes ordinary reads and recovers a failed save queue', async () => {
    const f = fixture(), saving = f.saveGain(5);
    await tick();
    f.respond(f.requests[0], { ok: false, code: 'VERSION_CONFLICT', error: 'Reload required' }, 409);
    assert.equal(await saving, false);
    assert.equal(f.context.gp()[0].xp, 2, 'Unconfirmed XP is rolled back');
    assert.equal(f.context._DB_WRITE_QUEUE.players._failed, true);
    f.remoteGain(3);
    const reading = f.read(kind), request = f.requests.at(-1);
    f.respondRead(request);
    await reading;
    assert.equal(f.context.gp()[0].xp, 5);
    assert.equal(f.context._dbVersions.players, 'version-1');
    assert.equal(f.context._DB_WRITE_QUEUE.players, undefined, 'An accepted reload must unblock future saves');
    const retry = f.saveGain(4);
    await tick();
    f.commit(f.requests.at(-1));
    assert.equal(await retry, true);
    assert.equal(f.stored().players[0].xp, 9);
  });
}

for (const kind of ['session_bundle', 'get_all']) {
  test(kind + ' rechecks a received bundle when hydration is delayed until after a write begins', async () => {
    const f = fixture();
    const reading = kind === 'session_bundle' ? f.context._authCall({ action: kind }) : f.context._dbCall({ action: kind });
    f.respondRead(f.requests[0]);
    const response = await reading;
    assert.equal(Object.keys(response).includes('__npPlayerRead'), false);
    const saving = f.saveGain(5);
    f.context._hydrateBundleData(response);
    assert.equal(f.context.gp()[0].xp, 7);
    assert.equal(f.context._dbVersions.players, 'version-0');
    assert.equal(Object.hasOwn(response.data, 'players'), false);
    assert.equal(f.context._dbCache.accounts[0].pseudo, 'Fresh account');
    await tick();
    f.commit(f.requests.at(-1));
    assert.equal(await saving, true);
  });
}

test('get_all never exposes a new players revision alongside stale player data before hydration', async () => {
  const f = fixture();
  f.remoteGain(8);
  const reading = f.context._dbCall({ action: 'get_all' });
  f.respondRead(f.requests[0]);
  const response = await reading;
  if (f.context._dbVersions.players === 'version-1') assert.equal(f.context.gp()[0].xp, 10, 'Revision and player data must be updated together');
  else assert.equal(f.context._dbVersions.players, 'version-0');
  f.context._hydrateBundleData(response);
  assert.equal(f.context._dbVersions.players, 'version-1');
  assert.equal(f.context.gp()[0].xp, 10);
});

test('Private cache refresh keeps an overlapping XP award while accepting fresh public data', async () => {
  const f = fixture(), refreshing = f.context._refreshPrivateCaches();
  f.respond(f.requests[0], { ok: true, data: { beasts: [{ id: 'new-beast' }] }, versions: { beasts: 'public-new' } });
  await tick();
  const privateRequest = f.requests.find(request => request.payload.action === 'session_bundle');
  assert.ok(privateRequest);
  const saving = f.saveGain(5);
  await tick();
  f.respondRead(privateRequest);
  await refreshing;
  assert.equal(f.context.gp()[0].xp, 7);
  assert.equal(f.context._dbVersions.players, 'version-0');
  assert.equal(f.context._dbCache.accounts[0].pseudo, 'Fresh account');
  f.commit(f.requests.find(request => request.payload.action === 'set'));
  assert.equal(await saving, true);
});
