'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const progression = require('../assets/js/progression');

const clone = value => JSON.parse(JSON.stringify(value));
const source = fs.readFileSync(path.join(__dirname, '../assets/js/main.js'), 'utf8');
function section(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, 'Production boundaries must exist: ' + start);
  return source.slice(from, to);
}
const code = [
  section('function doLvlUp(p){', '// Save a detached draft;'),
  section('var _progressionSaving=', 'function refreshProgressionPanel('),
  section('function gemXPStock(player,type){', 'function popSSelects('),
  section('async function saveStats(){', 'async function addBeast('),
  section('async function saveChangeSerm(){', 'function renderSerm(')
].join('\n');

function fixture() {
  const requests = [], notices = [], logs = [], renders = [], fields = new Map();
  const players = ['alice', 'bob'].map(id => ({
    id, name: id === 'alice' ? 'Alice' : 'Bob', classe: 'Duelliste',
    level: 3, xp: 30, xpMax: 90, progressionVersion: 1,
    pvMax: 42, pvCur: 35, epMax: 62, epCur: 51, emMax: 24, emCur: 12,
    branch: 'Aucune', history: [], equipment: {},
    inventory: [{ id: id + '-gem', name: 'Gemme Blanche', category: 'Gemme', qty: 3 }]
  }));
  const definitions = {
    Duelliste: { pvN: 6, epN: 6, emN: 2, arme: 'Épée moyenne' },
    Croisé: { pvN: 8, epN: 3, emN: 2, arme: 'Bouclier' }
  };
  const context = {
    Date, Promise,
    CU: { type: 'staff', role: 'admin', name: 'Admin', pid: 'alice' },
    _dbCache: { players }, _dbSessionGeneration: 1,
    _progPid: 'alice', ePid: 'alice', _viewPid: 'alice', _changeSermPid: 'alice',
    _selGem: 'b', _gemQty: 1,
    _npClone: clone, esc: String,
    can: () => true,
    xpReq: progression.xpRequired,
    getAllSD: () => definitions, SD: definitions,
    getSermPalierDefsFor: () => [{ niv: 5, nom: 'Palier II' }],
    gp: () => context._dbCache.players,
    gpid: id => context._dbCache.players.find(player => player.id === id),
    getViewPid: () => context._viewPid || context.CU.pid,
    sp(next) {
      // sv() publishes an optimistic cache; the deferred response controls when
      // a progression command may report success or must restore its prior data.
      context._dbCache.players = next;
      return new Promise((resolve, reject) => requests.push({ value: clone(next), resolve, reject }));
    },
    ge(id) {
      if (!fields.has(id)) fields.set(id, { value: '', textContent: '', style: {} });
      return fields.get(id);
    },
    document: { querySelector: () => null },
    notif: (message, type) => notices.push({ message, type }),
    sysLog: (...args) => logs.push(args),
    refreshProgressionPanel: pid => renders.push(['progression', pid]),
    renderView: () => renders.push(['view']),
    renderSPList: () => renders.push(['players']),
    switchProgTab: name => renders.push(['tab', name]),
    closeModal: id => renders.push(['close', id])
  };
  context.window = context;
  for (const [id, value] of Object.entries({
    'es-niv': '4', 'es-xp': '20', 'es-pvc': '35', 'es-epc': '51', 'es-emc': '12',
    'es-hel': '', 'es-che': '', 'es-leg': '', 'mcs-sel': 'Croisé'
  })) context.ge(id).value = value;
  vm.createContext(context);
  vm.runInContext(code, context);
  return { context, requests, notices, logs, renders, players,
    confirm(index = 0) { requests[index].resolve({ ok: true }); },
    fail(index = 0) { requests[index].reject(new Error('Sauvegarde refusée')); }
  };
}

for (const secondPid of ['alice', 'bob']) {
  test(`Concurrent gem fusion for ${secondPid} is refused while another players snapshot is pending`, async () => {
    const f = fixture();
    const original = clone(f.players);
    const first = f.context.applyGemXP('alice');
    assert.equal(await f.context.applyGemXP(secondPid), false);
    assert.equal(f.requests.length, 1, 'Only one snapshot may reach the persistence queue.');
    assert.equal(f.notices.some(notice => notice.type === 'ok'), false);
    assert.deepEqual(f.players, original, 'Pending drafts must never mutate their source records.');
    assert.equal(f.renders.length, 0);
    f.confirm();
    assert.equal(await first, true);
    assert.equal(f.context.gpid('alice').xp, 35);
    assert.equal(f.context.gpid('alice').inventory[0].qty, 2);
    assert.equal(f.context.gpid('alice').history.length, 1);
    assert.deepEqual(f.context.gpid('bob'), original[1]);
    assert.equal(f.notices.filter(notice => notice.type === 'ok').length, 1);

    const next = f.context.applyGemXP(secondPid);
    assert.equal(f.requests.length, 2, 'The collection lock must release after confirmation.');
    f.confirm(1);
    assert.equal(await next, true);
    assert.equal(f.context.gpid('alice').xp, secondPid === 'alice' ? 40 : 35);
    assert.equal(f.context.gpid('bob').xp, secondPid === 'bob' ? 35 : 30);
  });
}

test('Rejected gem fusion restores XP, stock and history without claiming success', async () => {
  const f = fixture();
  const original = clone(f.context._dbCache.players);
  const pending = f.context.applyGemXP('alice');
  assert.equal(f.requests[0].value[0].xp, 35);
  assert.equal(f.requests[0].value[0].inventory[0].qty, 2);
  f.fail();
  assert.equal(await pending, false);
  assert.deepEqual(f.context._dbCache.players, original);
  assert.equal(f.notices.some(notice => notice.type === 'ok'), false);
  assert.equal(f.notices.some(notice => notice.type === 'err'), true);
  assert.deepEqual(f.renders, []);
  assert.equal(f.context._progressionSaving.players, undefined);
});

test('Rollback cannot replace newer cache data that arrived during the rejected write', async () => {
  const f = fixture();
  const fresh = clone(f.context._dbCache.players);
  const pending = f.context.applyGemXP('alice');
  fresh[1].journal = 'Modification concurrente confirmée';
  f.context._dbCache.players = fresh;
  f.fail();
  assert.equal(await pending, false);
  assert.equal(f.context._dbCache.players, fresh);
  assert.equal(f.context.gpid('bob').journal, 'Modification concurrente confirmée');
  assert.equal(f.context.gpid('alice').xp, 30);
  assert.equal(f.context.gpid('alice').inventory[0].qty, 3);
});

for (const result of [undefined, { ok: false }, { ok: true, skipped: true }]) {
  test(`Unconfirmed persistence result ${JSON.stringify(result)} cannot grant a gem reward`, async () => {
    const f = fixture();
    const original = clone(f.context._dbCache.players);
    const pending = f.context.applyGemXP('alice');
    f.requests[0].resolve(result);
    assert.equal(await pending, false);
    assert.deepEqual(f.context._dbCache.players, original);
    assert.equal(f.notices.some(notice => notice.type === 'ok'), false);
  });
}

const staffActions = [
  { name: 'manual XP adjustment', action: context => context.adjVal('alice', 'xp', 10), log: 'adj_xp' },
  { name: 'statistics edit', action: context => context.saveStats(), log: 'stats_modif' },
  { name: 'oath change', action: context => context.saveChangeSerm(), log: 'serment_change' }
];
for (const item of staffActions) {
  test(`${item.name} logs the change only after persistence confirms it`, async () => {
    const f = fixture();
    const pending = item.action(f.context);
    const logsBeforeConfirmation = clone(f.logs);
    const rendersBeforeConfirmation = clone(f.renders);
    assert.equal(f.requests.length, 1);
    f.confirm();
    await pending;
    assert.deepEqual(logsBeforeConfirmation, [], 'Audit must not describe an unconfirmed mutation as applied.');
    assert.deepEqual(rendersBeforeConfirmation, []);
    assert.equal(f.logs.length, 1);
    assert.equal(f.logs[0][0], item.log);
  });

  test(`${item.name} writes no audit entry when saving fails`, async () => {
    const f = fixture();
    const original = clone(f.context._dbCache.players);
    const pending = item.action(f.context);
    f.fail();
    assert.equal(await pending, false);
    assert.deepEqual(f.logs, [], 'A rejected mutation must not pollute the staff audit log.');
    assert.deepEqual(f.context._dbCache.players, original);
    assert.deepEqual(f.renders, []);
    assert.equal(f.notices.some(notice => notice.type === 'ok'), false);
  });
}
