'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const clone = value => JSON.parse(JSON.stringify(value));
const source = fs.readFileSync(path.join(__dirname, '../assets/js/main.js'), 'utf8');
function section(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, 'Production boundaries must exist');
  return source.slice(from, to);
}
const code = [
  section('function _dbSessionChangedError(){', 'async function _jsonPost('),
  section('function _dbWriteFailure(key, response){', 'function _enqueueDbWrite(key, value){'),
  section('var _OWN_PLAYER_ACTIONS=', '\nvar WEAPON_ICONS='),
  section('function _getNotifDeleted(pid){', '\nfunction notifType(n){'),
  section('function renderEventCard(ev,canEdit,isStaff,isPast){', '\nfunction openEventModal('),
  section('async function _setOwnEventParticipation(id,participating){', '\n\n// ==========================================\n// CARTE DU MONDE')
].join('\n');
const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture() {
  const requests = [], notices = [], renders = [], reports = [], fields = new Map();
  function element() { return { value: '', textContent: '', disabled: false, setAttribute() {} }; }
  const consumeButton = element();
  const hero = { id: 'hero', name: 'Hero', inventory: [{ id: 'potion', name: 'Potion', qty: 2 }], history: [{ ts: 111, text: 'XP +1' }, { ts: 222, text: 'XP +2' }] };
  const stranger = { id: 'other', name: 'Other', journal: 'Preserved', inventory: [] };
  const event = { id: 'quest', nom: 'Quest', date: Date.now() + 86400000, inscrits: [], max: 3 };
  const context = {
    Date, Promise, CU: { pid: 'hero', name: 'Hero', role: 'joueur' },
    _dbToken: true, _dbOffline: false, _dbSessionGeneration: 1, _notifPanelOpen: true,
    _dbVersions: { players: 'p1', events: 'e1' }, _dbCache: { players: [hero, stranger], events: [event] }, _DB_WRITE_QUEUE: {},
    _cloneForDb: clone, _normalizePlayerRecord: clone,
    _reportDbWriteError: (key, error) => reports.push({ key, message: error.message }), _reportDbWriteSuccess() {},
    document: { querySelectorAll: () => [], querySelector: () => consumeButton },
    ge(id) { if (!fields.has(id)) fields.set(id, element()); return fields.get(id); },
    gp: () => context._dbCache.players,
    gpid: id => context._dbCache.players.find(player => player.id === id),
    getViewPid: () => context.viewPid || (context.CU && context.CU.pid),
    getEvents: () => context._dbCache.events,
    notif: (message, type) => notices.push({ message, type }),
    renderInv: player => renders.push(['inventory', player.id]),
    updateNotifBadge: () => renders.push(['badge']), renderNotifPanel: () => renders.push(['notifications']),
    renderEvents: target => renders.push(['events', target]),
    _dbCall: payload => new Promise(resolve => requests.push({ payload: clone(payload), resolve })),
    EV_TYPES: { autre: { icon: '.', col: '#333333', label: 'Other' } },
    escHtml: String, escAttr: String, jsesc: String,
  };
  context.window = context;
  context.ge('p-csel').value = 'potion';
  context.ge('p-cnote').value = '  Après le combat  ';
  vm.createContext(context);
  vm.runInContext(code, context);
  return { context, requests, notices, renders, reports, fields, hero, stranger, event, consumeButton,
    respond(index, key, value, version) { requests[index].resolve({ ok: true, key, value: clone(value), version }); },
    fail(index, status = 503, code = undefined) { requests[index].resolve({ ok: false, status, code, error: 'Refus test' }); },
    changeSession() {
      context._dbSessionGeneration++;
      context.CU = { pid: 'new', role: 'joueur' };
      context._dbCache = { players: [{ id: 'new', name: 'New' }], events: [] };
      context._dbVersions = {};
      context._DB_WRITE_QUEUE = {};
      context.ge('p-cnote').value = 'New session draft';
    }
  };
}

test('Consumption waits for confirmation, suppresses double clicks and preserves staff records', async () => {
  const f = fixture();
  const pending = f.context.playerConsume();
  assert.equal(await f.context.playerConsume(), false);
  await tick();
  assert.equal(f.requests.length, 1);
  assert.deepEqual(f.requests[0].payload, { action: 'consume_own_item', itemId: 'potion', note: 'Après le combat', expectedVersion: 'p1' });
  assert.equal(f.hero.inventory[0].qty, 2);
  assert.equal(f.consumeButton.disabled, true);
  assert.equal(f.renders.length, 0);
  const saved = clone(f.hero); saved.inventory[0].qty--;
  f.respond(0, 'players', [saved], 'p2');
  assert.equal(await pending, true);
  assert.equal(f.context.gpid('hero').inventory[0].qty, 1);
  assert.deepEqual(f.context.gpid('other'), f.stranger);
  assert.equal(f.context.ge('p-cnote').value, '');
  assert.equal(f.context._dbVersions.players, 'p2');
  assert.equal(f.consumeButton.disabled, false);
  assert.equal(f.notices.filter(notice => notice.type === 'ok').length, 1);
});

test('A failed consumption leaves quantity, history and draft untouched with no success', async () => {
  const f = fixture(), before = clone(f.context._dbCache);
  const pending = f.context.playerConsume();
  await tick(); f.fail(0);
  assert.equal(await pending, false);
  assert.deepEqual(f.context._dbCache, before);
  assert.equal(f.context.ge('p-cnote').value, '  Après le combat  ');
  assert.equal(f.context.ge('p-csel').value, 'potion');
  assert.equal(f.renders.length, 0);
  assert.equal(f.notices.some(notice => notice.type === 'ok'), false);
});

test('A staff member cannot consume from another displayed profile or clear its notifications', async () => {
  const f = fixture(); f.context.CU.role = 'admin'; f.context.viewPid = 'other';
  assert.equal(await f.context.playerConsume(), false);
  assert.equal(await f.context.deleteNotif('other', 111), false);
  assert.equal(await f.context.clearAllNotifs('other'), false);
  assert.equal(f.requests.length, 0);
});

test('Notification clearing sends only an intention and rerenders after confirmation', async () => {
  const f = fixture();
  const pending = f.context.deleteNotif('hero', 111);
  assert.equal(await f.context.clearAllNotifs('hero'), false);
  await tick();
  assert.deepEqual(f.requests[0].payload, { action: 'dismiss_notifications', timestamp: 111, expectedVersion: 'p1' });
  assert.equal(f.context.getPlayerNotifs('hero').length, 2);
  assert.equal(f.renders.length, 0);
  const saved = { ...f.hero, notifDeleted: [111] };
  f.respond(0, 'players', [saved], 'p2');
  assert.equal(await pending, true);
  assert.equal(f.context.getPlayerNotifs('hero').length, 1);
  const all = f.context.clearAllNotifs('hero'); await tick();
  assert.deepEqual(f.requests[1].payload, { action: 'dismiss_notifications', all: true, expectedVersion: 'p2' });
  f.respond(1, 'players', [{ ...saved, notifDeleted: [111, 222] }], 'p3');
  assert.equal(await all, true);
  assert.equal(f.context.getPlayerNotifs('hero').length, 0);
  assert.equal(f.notices.filter(notice => notice.type === 'ok').length, 1);
});

test('Participation sends only event ID and intention and never mutates an unconfirmed event', async () => {
  const f = fixture();
  const pending = f.context.eventInscrit('quest');
  assert.equal(await f.context.eventInscrit('quest'), false); await tick();
  assert.deepEqual(f.requests[0].payload, { action: 'set_event_participation', eventId: 'quest', participating: true, expectedVersion: 'e1' });
  assert.deepEqual(f.event.inscrits, []);
  f.respond(0, 'events', [{ ...f.event, inscrits: ['Hero'] }], 'e2');
  assert.equal(await pending, true);
  const leave = f.context.eventDesinscrit('quest'); await tick();
  assert.deepEqual(f.requests[1].payload, { action: 'set_event_participation', eventId: 'quest', participating: false, expectedVersion: 'e2' });
  f.fail(1, 409, 'VERSION_CONFLICT');
  assert.equal(await leave, false);
  assert.deepEqual(clone(f.context.getEvents()[0].inscrits), ['Hero']);
  assert.equal(f.notices.filter(notice => notice.type === 'ok').length, 1);
});

test('Pending accounts receive a linking explanation without an API request', async () => {
  const f = fixture(); f.context.CU.pid = null;
  assert.equal(await f.context.eventInscrit('quest'), false);
  assert.match(f.notices[0].message, /lié à un personnage/);
  assert.equal(f.requests.length, 0);
  assert.match(f.context.renderEventCard(f.event, false, false, false), /personnage doit être lié/);
});

test('Hidden, past and undated events offer no participation action', () => {
  const f = fixture();
  for (const [event, past] of [[{ ...f.event, hidden: true }, false], [{ ...f.event, date: null }, false], [{ ...f.event, date: Date.now() - 2000 }, true]]) {
    assert.doesNotMatch(f.context.renderEventCard(event, false, false, past), /onclick="event(?:Inscrit|Desinscrit)/);
  }
});

for (const action of ['consume', 'notifications', 'participation']) {
  test(`A late ${action} response cannot affect a new session or show success`, async () => {
    const f = fixture();
    const pending = action === 'consume' ? f.context.playerConsume() : action === 'notifications' ? f.context.clearAllNotifs('hero') : f.context.eventInscrit('quest');
    await tick(); f.changeSession();
    const key = action === 'participation' ? 'events' : 'players';
    f.respond(0, key, key === 'events' ? [f.event] : [f.hero], 'old');
    assert.equal(await pending, false);
    assert.equal(f.context._dbCache.players[0].id, 'new');
    assert.equal(f.context._dbVersions[key], undefined);
    assert.equal(f.context.ge('p-cnote').value, 'New session draft');
    assert.equal(f.notices.length, 0);
    assert.equal(f.renders.length, 0);
  });
}

test('A confirmed business refusal allows another action but does not advance the version', async () => {
  const f = fixture();
  const first = f.context.eventInscrit('quest'); await tick(); f.fail(0, 409, 'EVENT_FULL');
  assert.equal(await first, false);
  assert.equal(f.context._dbVersions.events, 'e1');
  assert.equal(f.context._DB_WRITE_QUEUE.events, undefined);
  const second = f.context.eventDesinscrit('quest'); await tick();
  assert.equal(f.requests.length, 2);
  assert.equal(f.requests[1].payload.expectedVersion, 'e1');
  f.respond(1, 'events', [f.event], 'e2');
  assert.equal(await second, true);
});

test('A revision conflict keeps later writes blocked until data is refreshed', async () => {
  const f = fixture();
  const first = f.context.playerConsume(); await tick(); f.fail(0, 409, 'VERSION_CONFLICT');
  assert.equal(await first, false);
  assert.equal(await f.context.clearAllNotifs('hero'), false);
  assert.equal(f.requests.length, 1);
  assert.equal(f.context._dbVersions.players, 'p1');
  assert.equal(f.context.ge('p-cnote').value, '  Après le combat  ');
});

for (const key of ['players', 'events']) {
  test(`A queued staff ${key} snapshot cannot undo a just-confirmed own-player action`, async () => {
    const f = fixture();
    const staleSnapshot = clone(f.context._dbCache[key]);
    const ownAction = key === 'players' ? f.context.playerConsume() : f.context.eventInscrit('quest');
    const overwrite = f.context._enqueueDbMutation(key, { action: 'set', key, value: staleSnapshot });
    const rejected = assert.rejects(overwrite, { code: 'VERSION_CONFLICT' });
    await tick();
    const saved = key === 'players'
      ? [{ ...f.hero, inventory: [{ ...f.hero.inventory[0], qty: 1 }] }]
      : [{ ...f.event, inscrits: ['Hero'] }];
    f.respond(0, key, saved, 'new-revision');
    assert.equal(await ownAction, true);
    await rejected;
    assert.equal(f.requests.length, 1, 'The old snapshot must never reach the API');
    assert.equal(f.context._dbVersions[key], 'new-revision');
    if (key === 'players') assert.equal(f.context.gpid('hero').inventory[0].qty, 1);
    else assert.deepEqual(clone(f.context.getEvents()[0].inscrits), ['Hero']);
  });
}

test('Snapshot protection also crosses another queued own-player command', async () => {
  const f = fixture();
  const stale = clone(f.context._dbCache.players);
  const consume = f.context.playerConsume();
  const clear = f.context.clearAllNotifs('hero');
  const overwrite = f.context._enqueueDbMutation('players', { action: 'set', key: 'players', value: stale });
  const rejected = assert.rejects(overwrite, { code: 'VERSION_CONFLICT' });
  await tick();
  const saved = { ...f.hero, inventory: [{ ...f.hero.inventory[0], qty: 1 }] };
  f.respond(0, 'players', [saved], 'p2');
  assert.equal(await consume, true);
  await tick();
  f.respond(1, 'players', [{ ...saved, notifDeleted: [111, 222] }], 'p3');
  assert.equal(await clear, true);
  await rejected;
  assert.equal(f.requests.length, 2);
  assert.equal(f.context.gpid('hero').inventory[0].qty, 1);
  assert.equal(f.context.getPlayerNotifs('hero').length, 0);
});

test('An error payload arriving in another session cannot report a save failure there', async () => {
  const f = fixture();
  const pending = f.context.playerConsume();
  await tick(); f.changeSession();
  f.fail(0, 503);
  assert.equal(await pending, false);
  assert.deepEqual(f.reports, []);
  assert.deepEqual(f.notices, []);
  assert.equal(f.context._dbCache.players[0].id, 'new');
});

test('Old queued commands stop silently before issuing a request in the new session', async () => {
  const f = fixture();
  const consume = f.context.playerConsume();
  const clear = f.context.clearAllNotifs('hero');
  await tick(); f.changeSession();
  f.respond(0, 'players', [f.hero], 'old');
  assert.equal(await consume, false);
  assert.equal(await clear, false);
  assert.equal(f.requests.length, 1);
  assert.deepEqual(f.reports, []);
  assert.deepEqual(f.notices, []);
});
