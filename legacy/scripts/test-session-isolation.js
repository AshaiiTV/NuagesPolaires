'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../assets/js/main.js'), 'utf8');
function section(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, 'Production functions must remain identifiable');
  return source.slice(from, to);
}
const code = [
  section('function _dbSessionChangedError(){', 'async function apiAuth('),
  section('function _hydrateBundleData(', 'const BUILTIN_THEME_IDS'),
  section('function register(){', 'function switchLTab('),
  section('async function _tryAutoLogin(){', 'function loginUnified(){'),
  section('function loginUnified(){', 'function _finishLogin('),
  section('function _finishLogin(', 'function _playLoginTransition('),
  section('async function _refreshPrivateCaches(){', 'function renderView(){')
].join('\n');
const tick = () => new Promise(resolve => setImmediate(resolve));
const clone = value => JSON.parse(JSON.stringify(value));

function fixture() {
  const requests = [];
  const transitions = [];
  const fields = new Map();
  const context = {
    console: { warn() {} },
    _dbSessionGeneration: 0, _dbCache: Object.create(null), _dbVersions: Object.create(null),
    _dbToken: true, _dbOffline: false, _DB_WRITE_QUEUE: Object.create(null), _authEntryPending: false, CU: null,
    _npClone: clone, _normalizeDbValueForKey: (_key, value) => clone(value),
    normalizeThemeId: String, _purgePrivateBrowserStorage() {}, _clearSession() {}, _saveSession() {},
    localStorage: { setItem() {}, removeItem() {} },
    ge: id => {
      if (!fields.has(id)) fields.set(id, { checked: false, value: '', focus() {} });
      return fields.get(id);
    }, showScreen() {},
    hashPass: async () => 'sha256:' + 'a'.repeat(64),
    npHandleServiceIssue() {}, npFriendlyApiError: response => response.error || 'Erreur',
    getAccounts: () => context._dbCache.accounts || [], getAccountByPseudo: () => null,
    gp: () => context._dbCache.players || [],
    gpid: id => (context._dbCache.players || []).find(player => player.id === id),
    sysLog() {}, _trackLastSeen() {}, launchApp: () => { context.launched++; }, launched: 0,
    _playLoginTransition: callback => transitions.push(callback),
    fetch: (url, options) => new Promise(resolve => {
      requests.push({ url, payload: JSON.parse(options.body), resolve });
    })
  };
  context.window = context;
  context._rememberDbVersions = versions => Object.assign(context._dbVersions, versions);
  vm.createContext(context);
  vm.runInContext(code, context, { filename: 'production-session-functions.js' });
  function respond(request, value, status = 200) {
    request.resolve({ ok: status < 400, status, json: async () => value });
  }
  function newSession(player = null) {
    context._dbSessionGeneration++;
    context._dbCache = player ? { players: [player] } : Object.create(null);
    context._dbVersions = Object.create(null);
    context.CU = player ? { pid: player.id, name: player.name } : null;
  }
  return { context, requests, transitions, respond, newSession };
}

test('Current GET responses populate cache and revision normally', async () => {
  const f = fixture();
  const pending = f.context._dbCall({ action: 'get', key: 'players' });
  f.respond(f.requests[0], { ok: true, version: 'current', value: [{ id: 'alice' }] });
  await pending;
  assert.equal(f.context._dbVersions.players, 'current');
  assert.equal(f.context._dbCache.players[0].id, 'alice');
});

test('A GET resolving after logout cannot restore private cache or revisions', async () => {
  const f = fixture();
  const pending = f.context._dbCall({ action: 'get', key: 'players' });
  const rejected = assert.rejects(pending, { code: 'SESSION_CHANGED' });
  f.newSession();
  f.respond(f.requests[0], { ok: true, version: 'old', value: [{ id: 'alice', journal: 'private' }] });
  await rejected;
  assert.equal(f.context._dbCache.players, undefined);
  assert.equal(f.context._dbVersions.players, undefined);
});

test('A session change during JSON body parsing also discards the response', async () => {
  const f = fixture();
  const pending = f.context._loadSessionBundle();
  const rejected = assert.rejects(pending, { code: 'SESSION_CHANGED' });
  let resolveBody;
  f.requests[0].resolve({ ok: true, status: 200, json: () => new Promise(resolve => { resolveBody = resolve; }) });
  await tick();
  f.newSession({ id: 'bob', name: 'Bob' });
  resolveBody({ ok: true, versions: { players: 'alice-version' }, data: { players: [{ id: 'alice' }] } });
  await rejected;
  assert.equal(f.context._dbCache.players[0].id, 'bob');
  assert.equal(f.context._dbVersions.players, undefined);
});

test('A previously received bundle is rejected if hydration occurs in another session', async () => {
  const f = fixture();
  const pending = f.context._authCall({ action: 'session_bundle' });
  f.respond(f.requests[0], { ok: true, versions: { players: 'old' }, data: { players: [{ id: 'alice' }] } });
  const bundle = await pending;
  f.newSession();
  assert.throws(() => f.context._hydrateBundleData(bundle), { code: 'SESSION_CHANGED' });
  assert.equal(f.context._dbCache.players, undefined);
});

test('Pending login does not fall back to restoring the old identity after logout', async () => {
  const f = fixture();
  f.context._finishLogin({ ok: true, role: 'joueur', pid: 'alice', name: 'Alice' }, 'Alice');
  assert.equal(f.requests.length, 2);
  f.newSession();
  for (const request of f.requests) f.respond(request, { ok: true, data: { players: [{ id: 'alice' }] } });
  await tick();
  assert.equal(f.context.CU, null);
  assert.equal(f.context._dbCache.players, undefined);
  assert.equal(f.transitions.length, 0);
});

test('An older login response cannot replace the identity of a later login', async () => {
  const f = fixture();
  f.context._finishLogin({ role: 'admin', name: 'Alice' }, 'Alice');
  const oldRequests = f.requests.slice();
  f.context._finishLogin({ role: 'joueur', pid: 'bob', name: 'Bob' }, 'Bob');
  for (const request of f.requests.slice(2)) {
    f.respond(request, { ok: true, data: request.payload.action === 'session_bundle' ? { players: [{ id: 'bob', name: 'Bob' }] } : {} });
  }
  await tick();
  for (const request of oldRequests) f.respond(request, { ok: true, data: { players: [{ id: 'alice', name: 'Alice' }] } });
  await tick();
  assert.equal(f.context.CU.pid, 'bob');
  assert.equal(f.context.CU.role, 'joueur');
  assert.equal(f.context._dbCache.players[0].id, 'bob');
  assert.equal(f.transitions.length, 1);
  f.newSession();
  f.transitions[0]();
  assert.equal(f.context.launched, 0, 'Delayed login animation must not reopen a logged-out app');
});

test('A superseded auto-login cannot erase the new session cache in its error handler', async () => {
  const f = fixture();
  const pending = f.context._tryAutoLogin();
  f.respond(f.requests[0], { ok: true });
  await tick();
  assert.equal(f.requests[1].payload.action, 'session_bundle');
  f.newSession({ id: 'bob', name: 'Bob' });
  f.respond(f.requests[1], { ok: true, role: 'admin', data: { players: [{ id: 'alice' }] } });
  assert.equal(await pending, false);
  assert.equal(f.context.CU.pid, 'bob');
  assert.equal(f.context._dbCache.players[0].id, 'bob');
});

test('A stale refresh stops before issuing another private read in the new session', async () => {
  const f = fixture();
  const pending = f.context._refreshPrivateCaches();
  f.newSession({ id: 'bob', name: 'Bob' });
  f.respond(f.requests[0], { ok: true, data: { beasts: [{ id: 'old' }] } });
  await pending;
  assert.equal(f.requests.length, 1);
  assert.equal(f.context._dbCache.players[0].id, 'bob');
  assert.equal(f.context._dbCache.beasts, undefined);
});

test('Private reads are blocked while logout revokes the server session', async () => {
  const f = fixture();
  f.context.__logoutBusy = true;
  await assert.rejects(f.context._loadSessionBundle(), { code: 'SESSION_CHANGED' });
  assert.equal(f.requests.length, 0);
  const pending = f.context._authCall({ action: 'logout' });
  f.respond(f.requests[0], { ok: true });
  assert.equal((await pending).ok, true);
});

test('Login and registration cannot issue overlapping session cookies', async () => {
  const f = fixture();
  f.context.ge('login-id').value = 'Alice';
  f.context.ge('login-pass').value = 'secret';
  const pending = f.context.loginUnified();
  await tick();
  assert.equal(f.requests.length, 1);
  f.context.loginUnified();
  f.context.register();
  await tick();
  assert.equal(f.requests.length, 1, 'Only one cookie-issuing request may be in flight');
  f.respond(f.requests[0], { ok: false, error: 'Incorrect' }, 401);
  await pending;
  assert.equal(f.context._authEntryPending, false, 'A rejected login permits retry');
});

test('A password hash completing after logout cannot start a new login request', async () => {
  const f = fixture();
  f.context.ge('login-id').value = 'Alice';
  f.context.ge('login-pass').value = 'secret';
  let finishHash;
  f.context.hashPass = () => new Promise(resolve => { finishHash = resolve; });
  const pending = f.context.loginUnified();
  f.newSession();
  finishHash('sha256:' + 'a'.repeat(64));
  await pending;
  assert.equal(f.requests.length, 0);
  assert.equal(f.context._authEntryPending, false);
});

// Exercise the actual resilience wrappers as well as the base API functions:
// wrapping must not turn an expected cancellation into a new-account outage.
const hardeningSource = fs.readFileSync(path.join(__dirname, '../assets/js/api-hardening.js'), 'utf8');
const hardeningFrom = hardeningSource.indexOf('  function apiSessionGeneration(){');
const hardeningTo = hardeningSource.indexOf('  async function rawPost(', hardeningFrom);
assert.ok(hardeningFrom >= 0 && hardeningTo > hardeningFrom);
function hardeningFixture() {
  const requests = [], failures = [];
  const context = {
    Promise, _dbSessionGeneration: 1, WRAP_TIMER: null, STATE: { db: 'unknown', auth: 'unknown' },
    clearTimeout() {}, setTimeout() {},
    classifyFunctionUrl: url => url.includes('/db') ? 'db' : 'auth',
    handleFailure: (...args) => failures.push(args),
    safeErrorPayload: (status, error) => ({ ok: false, offline: true, status, error }),
    _dbCall: () => new Promise((resolve, reject) => requests.push({ resolve, reject })),
    fetch: () => new Promise((resolve, reject) => requests.push({ resolve, reject }))
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(hardeningSource.slice(hardeningFrom, hardeningTo), context);
  context.wrapApiFunctions(); context.wrapFetch();
  return { context, requests, failures };
}

test('API wrappers retain SESSION_CHANGED as a silent rejection', async () => {
  const f = hardeningFixture();
  const pending = f.context._dbCall({ action: 'set' });
  const rejected = assert.rejects(pending, { code: 'SESSION_CHANGED' });
  await tick();
  const cancellation = Object.assign(new Error('La session a changé pendant le chargement.'), { code: 'SESSION_CHANGED' });
  f.requests[0].reject(cancellation);
  await rejected;
  assert.deepEqual(f.failures, []);
  assert.equal(f.context.STATE.db, 'unknown');
});

test('API wrappers discard an old-session 503 before announcing service failure', async () => {
  const f = hardeningFixture();
  const pending = f.context._dbCall({ action: 'set' });
  const rejected = assert.rejects(pending, { code: 'SESSION_CHANGED' });
  await tick(); f.context._dbSessionGeneration++;
  f.requests[0].resolve({ ok: false, status: 503, offline: true, error: 'Service unavailable' });
  await rejected;
  assert.deepEqual(f.failures, []);
  assert.equal(f.context.STATE.db, 'unknown');
});

test('An API call superseded before its wrapper starts never reaches the underlying function', async () => {
  const f = hardeningFixture();
  const pending = f.context._dbCall({ action: 'set' });
  f.context._dbSessionGeneration++;
  await assert.rejects(pending, { code: 'SESSION_CHANGED' });
  assert.equal(f.requests.length, 0);
  assert.deepEqual(f.failures, []);
});

for (const outcome of ['server', 'network']) {
  test(`The fetch wrapper ignores an old-session ${outcome} failure`, async () => {
    const f = hardeningFixture();
    const pending = f.context.fetch('/.netlify/functions/db');
    f.context._dbSessionGeneration++;
    if (outcome === 'server') {
      f.requests[0].resolve({ status: 503, ok: false });
      assert.equal((await pending).status, 503);
    } else {
      const rejected = assert.rejects(pending, /Failed to fetch/);
      f.requests[0].reject(new Error('Failed to fetch'));
      await rejected;
    }
    assert.deepEqual(f.failures, []);
    assert.equal(f.context.STATE.db, 'unknown');
  });
}

test('The fetch wrapper still reports a current-session server failure', async () => {
  const f = hardeningFixture();
  const pending = f.context.fetch('/.netlify/functions/db');
  f.requests[0].resolve({ status: 503, ok: false });
  await pending;
  assert.equal(f.failures.length, 1);
  assert.equal(f.failures[0][0], 'db');
});
