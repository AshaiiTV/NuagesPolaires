'use strict';

const assert = require('node:assert/strict');
const { test, before, after, beforeEach } = require('node:test');
const { createLocalApp } = require('./helpers/local-app');
const clone = value => JSON.parse(JSON.stringify(value));
let app, players, events, alice, bob;

before(async () => { app = await createLocalApp(); });
after(async () => { if (app) await app.close(); });
beforeEach(async () => {
  players = clone(app.players);
  const owner = players.find(player => player.id === 'p_alice');
  owner.name = 'Personnage Alice';
  owner.inventory = [
    { id: 'potion', name: 'Potion', category: 'Consommable', qty: 2, effect: '+20 PV', arbitrary: 'keep' },
    ...[0, -1, 1.5, '2'].map((qty, i) => ({ id: 'invalid-' + i, name: 'Invalid', qty }))
  ];
  owner.history = [101, 102, 103].map(ts => ({ ts, type: 'item', text: 'Message ' + ts, by: 'MJ' }));
  owner.notifDeleted = [101, 999];
  players.find(player => player.id === 'p_bob').inventory = [{ id: 'bob-only', qty: 4, name: 'Secret object' }];
  const future = Date.now() + 86400000;
  events = [
    { id: 'open', nom: 'Ouvert', date: future, max: 2, inscrits: ['Bob'], adminNotes: 'Staff secret', nested: { mjNote: 'Hidden note', label: 'Visible' }, arbitrary: 'keep' },
    { id: 'full', nom: 'Complet', date: future, max: 1, inscrits: ['Bob'] },
    { id: 'hidden', nom: 'Masqué', date: future, hidden: true, inscrits: ['Personnage Alice', 'Bob'] },
    { id: 'past', nom: 'Passé', date: Date.now() - 60000, inscrits: ['Personnage Alice', 'Bob'] },
    { id: 'undated', nom: 'Sans date', date: null, inscrits: [] },
    { id: 'legacy', titre: 'Ancien', dateTs: future, published: true, inscrits: [] },
    { id: 'legacy-hidden', titre: 'Ancien masqué', dateTs: future, published: false, inscrits: [] },
    { id: 'republished', titre: 'Republié', dateTs: future, published: false, hidden: false, inscrits: [] }
  ];
  await app.seed('accounts', app.accounts);
  await app.seed('players', players);
  await app.seed('events', events);
  alice = await app.cookie('alice');
  bob = await app.cookie('bob');
});

async function action(name, fields, cookie = alice, expectedVersion) {
  const key = name === 'set_event_participation' ? 'events' : 'players';
  const revision = expectedVersion === undefined ? (await app.read(key)).version : expectedVersion;
  return app.call('db', { action: name, ...fields, expectedVersion: revision }, cookie);
}
const consumption = fields => action('consume_own_item', { itemId: 'potion', ...fields });

test('Item consumption persists one item, escapes history markup and preserves all other records and stats', async () => {
  const owner = players.find(player => player.id === 'p_alice');
  owner.name = '<b>Alice</b>';
  owner.inventory[0].name = '<img src=x onerror=alert(1)>';
  await app.seed('players', players);
  const result = await consumption({ note: ' Test <svg onload="alert(2)"> & fin ' });
  assert.equal(result.status, 200);
  assert.equal(result.data.key, 'players');
  assert.equal(result.data.value.length, 1);
  assert.equal(result.data.value[0].id, 'p_alice');
  const stored = await app.read('players');
  const after = stored.value.find(player => player.id === owner.id);
  assert.equal(stored.version, result.data.version);
  assert.equal(after.inventory[0].qty, 1);
  assert.deepEqual(after.inventory[0], { ...owner.inventory[0], qty: 1 });
  assert.deepEqual(after.history.slice(0, -1), owner.history);
  assert.deepEqual(after.history.at(-1), {
    ts: after.history.at(-1).ts, type: 'item',
    text: 'Consommé : &lt;img src=x onerror=alert(1)&gt; — Test &lt;svg onload=&quot;alert(2)&quot;&gt; &amp; fin',
    by: '&lt;b&gt;Alice&lt;/b&gt; (joueur)'
  });
  assert.equal(Number.isSafeInteger(after.history.at(-1).ts), true);
  assert.deepEqual({ ...after, inventory: owner.inventory, history: owner.history }, owner);
  assert.deepEqual(stored.value.filter(player => player.id !== owner.id), players.filter(player => player.id !== owner.id));
  const reloaded = await app.call('db', { action: 'get', key: 'players' }, alice);
  assert.deepEqual(reloaded.data.value, [after]);
  assert.equal(JSON.stringify(result.data).includes('Journal bob'), false);
});

test('Player actions require authentication, a linked existing character and a revision', async () => {
  for (const [name, fields] of [
    ['consume_own_item', { itemId: 'potion' }],
    ['dismiss_notifications', { timestamp: 102 }],
    ['set_event_participation', { eventId: 'open', participating: true }]
  ]) {
    assert.equal((await app.call('db', { action: name, ...fields })).status, 401);
    assert.equal((await action(name, fields, await app.cookie('mj'))).status, 403);
    assert.equal((await app.call('db', { action: name, ...fields }, alice)).status, 428);
    assert.equal((await action(name, fields, alice, 'bad')).status, 428);
    assert.equal((await action(name, fields, alice, null)).status, 409);
  }
  await app.seed('players', players.filter(player => player.id !== 'p_alice'));
  assert.equal((await consumption()).status, 404);
  assert.equal((await action('set_event_participation', { eventId: 'open', participating: true })).status, 404);
});

test('Invalid consumption and identity/stat payloads cannot change any player', async () => {
  const original = await app.read('players');
  for (const fields of [
    { itemId: '' }, { itemId: 10 }, { itemId: ' potion' }, { note: 42 }, { note: 'a'.repeat(2001) },
    { pid: 'p_bob' }, { name: 'Bob' }, { qty: 4 }, { history: [] }, { pvCur: 999 }
  ]) assert.equal((await consumption(fields)).status, 400);
  assert.equal((await consumption({ itemId: 'bob-only' })).status, 404);
  for (let i = 0; i < 4; i++) {
    const response = await consumption({ itemId: 'invalid-' + i });
    assert.equal(response.status, 409);
    assert.equal(response.data.code, 'ITEM_UNAVAILABLE');
  }
  assert.deepEqual(await app.read('players'), original);
});

test('Concurrent consumptions cannot use the same inventory revision twice', async () => {
  const original = await app.read('players');
  const responses = await Promise.all([1, 2].map(() => action('consume_own_item', { itemId: 'potion' }, alice, original.version)));
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
  assert.equal(responses.find(response => response.status === 409).data.code, 'VERSION_CONFLICT');
  const owner = (await app.read('players')).value.find(player => player.id === 'p_alice');
  assert.equal(owner.inventory[0].qty, 1);
  assert.equal(owner.history.length, 4);
  assert.equal((await action('consume_own_item', { itemId: 'potion' }, alice, original.version)).status, 409);
});

test('Notification dismissal merges relevant masks and leaves history and other characters intact', async () => {
  const first = await action('dismiss_notifications', { timestamp: 102 });
  assert.equal(first.status, 200);
  assert.equal(first.data.value.length, 1);
  assert.deepEqual(first.data.value[0].notifDeleted, [101, 102]);
  const expected = clone(players);
  expected.find(player => player.id === 'p_alice').notifDeleted = [101, 102];
  assert.deepEqual((await app.read('players')).value, expected);
  const all = await action('dismiss_notifications', { all: true });
  assert.equal(all.status, 200);
  expected.find(player => player.id === 'p_alice').notifDeleted = [101, 102, 103];
  assert.deepEqual((await app.read('players')).value, expected);
  const reloaded = await app.call('db', { action: 'get', key: 'players' }, alice);
  assert.deepEqual(reloaded.data.value[0].notifDeleted, [101, 102, 103]);
  assert.deepEqual(reloaded.data.value[0].history, players.find(player => player.id === 'p_alice').history);
});

test('Invalid or stale notification commands cannot hide unknown, other-player or future entries', async () => {
  const original = await app.read('players');
  for (const fields of [
    {}, { timestamp: '102' }, { timestamp: -1 }, { timestamp: 2.5 }, { timestamp: 102, all: true },
    { all: false }, { all: true, pid: 'p_bob' }, { all: true, notifDeleted: [999] }
  ]) assert.equal((await action('dismiss_notifications', fields)).status, 400);
  assert.equal((await action('dismiss_notifications', { timestamp: 999 })).status, 404);
  assert.deepEqual(await app.read('players'), original);
  const newer = clone(players);
  newer.find(player => player.id === 'p_alice').history.push({ ts: 104, text: 'Nouvelle notification' });
  await app.seed('players', newer);
  assert.equal((await action('dismiss_notifications', { all: true }, alice, original.version)).status, 409);
  assert.deepEqual((await app.read('players')).value, newer);
});

test('Participation uses the linked character name and preserves all event attributes and other participants', async () => {
  const result = await action('set_event_participation', { eventId: 'open', participating: true });
  assert.equal(result.status, 200);
  assert.equal(result.data.key, 'events');
  const expected = clone(events);
  expected[0].inscrits.push('Personnage Alice');
  const stored = await app.read('events');
  assert.deepEqual(stored.value, expected);
  assert.equal(stored.version, result.data.version);
  assert.equal(result.data.value.some(event => event.id === 'hidden' || event.id === 'legacy-hidden'), false);
  assert.equal(result.data.value[0].adminNotes, undefined);
  assert.deepEqual(result.data.value[0].nested, { label: 'Visible' });
  assert.equal(JSON.stringify(result.data).includes('Journal bob'), false);
  assert.deepEqual((await app.read('players')).value, players);
  const repeated = await action('set_event_participation', { eventId: 'open', participating: true });
  assert.equal(repeated.status, 200);
  assert.deepEqual((await app.read('events')).value, expected);
  const left = await action('set_event_participation', { eventId: 'open', participating: false });
  assert.equal(left.status, 200);
  assert.deepEqual((await app.read('events')).value, events);
});

test('Event restrictions reject hidden, past, undated, full and malformed participation requests', async () => {
  const original = await app.read('events');
  for (const fields of [
    { eventId: '', participating: true }, { eventId: 'open', participating: 1 },
    { eventId: 'open', participating: true, name: 'Bob' },
    { eventId: 'open', participating: true, pid: 'p_bob' },
    { eventId: 'open', participating: true, inscrits: [] },
    { eventId: 'open', participating: true, max: 99 }
  ]) assert.equal((await action('set_event_participation', fields)).status, 400);
  for (const eventId of ['absent', 'hidden', 'legacy-hidden']) {
    assert.equal((await action('set_event_participation', { eventId, participating: true })).status, 404);
  }
  for (const eventId of ['past', 'undated', 'full']) {
    assert.equal((await action('set_event_participation', { eventId, participating: true })).status, 409);
  }
  assert.deepEqual(await app.read('events'), original);
});

test('Players can leave hidden and past events without disturbing anyone else', async () => {
  for (const eventId of ['hidden', 'past']) {
    assert.equal((await action('set_event_participation', { eventId, participating: false })).status, 200);
  }
  const expected = clone(events);
  for (const event of expected.filter(event => ['hidden', 'past'].includes(event.id))) event.inscrits = ['Bob'];
  assert.deepEqual((await app.read('events')).value, expected);
});

test('Homonymous characters cannot register or remove each other from legacy participant lists', async () => {
  players.find(player => player.id === 'p_bob').name = 'Personnage Alice';
  await app.seed('players', players);
  events[0] = { ...events[0], max: 3, inscrits: ['Personnage Alice', 'Autre participant'] };
  await app.seed('events', events);
  const original = await app.read('events');
  for (const cookie of [alice, bob]) {
    for (const participating of [true, false]) {
      const result = await action('set_event_participation', { eventId: 'open', participating }, cookie);
      assert.equal(result.status, 409);
      assert.equal(result.data.code, 'EVENT_UNAVAILABLE');
      assert.match(result.data.error, /Plusieurs personnages portent ton nom/);
      assert.deepEqual(await app.read('events'), original);
    }
  }
  assert.deepEqual((await app.read('players')).value, players);
});

test('A malformed stored participant list or capacity is rejected instead of being overwritten', async () => {
  for (const badFields of [{ inscrits: { Bob: true } }, { max: -1 }, { max: 1.5 }, { max: 'unknown' }]) {
    const malformed = [{ ...events[0], ...badFields }];
    await app.seed('events', malformed);
    const result = await action('set_event_participation', { eventId: 'open', participating: true });
    assert.equal(result.status, 409);
    assert.equal(result.data.code, 'EVENT_UNAVAILABLE');
    assert.deepEqual((await app.read('events')).value, malformed);
  }
});

test('Legacy event dates and canonical publication overrides remain usable', async () => {
  for (const eventId of ['legacy', 'republished']) {
    assert.equal((await action('set_event_participation', { eventId, participating: true })).status, 200);
  }
  const stored = (await app.read('events')).value;
  for (const eventId of ['legacy', 'republished']) {
    const event = stored.find(event => event.id === eventId);
    assert.deepEqual(event.inscrits, ['Personnage Alice']);
    assert.deepEqual({ ...event, inscrits: [] }, events.find(event => event.id === eventId));
  }
});

test('Two concurrent registrations cannot overbook the last place, and stale retries preserve the winner', async () => {
  await app.seed('events', [{ ...events[0], max: 1, inscrits: [] }]);
  const version = (await app.read('events')).version;
  const responses = await Promise.all([alice, bob].map(cookie => action('set_event_participation', { eventId: 'open', participating: true }, cookie, version)));
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
  const winnerIndex = responses.findIndex(response => response.status === 200);
  const stored = await app.read('events');
  assert.deepEqual(stored.value[0].inscrits, [winnerIndex === 0 ? 'Personnage Alice' : 'Bob']);
  const loser = winnerIndex === 0 ? bob : alice;
  const retry = await action('set_event_participation', { eventId: 'open', participating: true }, loser);
  assert.equal(retry.status, 409);
  assert.equal(retry.data.code, 'EVENT_FULL');
  assert.deepEqual(await app.read('events'), stored);
});

test('Public event reads consistently filter unpublished events and staff notes while staff retains the originals', async () => {
  const expectedIds = events.filter(event => !['hidden', 'legacy-hidden'].includes(event.id)).map(event => event.id);
  for (const cookie of [undefined, alice]) {
    const read = await app.call('db', { action: 'get', key: 'events' }, cookie);
    const bundle = await app.call('db', { action: 'get_public_bundle' }, cookie);
    assert.deepEqual(read.data.value.map(event => event.id), expectedIds);
    assert.deepEqual(bundle.data.data.events, read.data.value);
    assert.equal(read.data.value[0].adminNotes, undefined);
    assert.deepEqual(read.data.value[0].nested, { label: 'Visible' });
    assert.equal(read.data.version, (await app.read('events')).version);
  }
  for (const id of ['admin', 'mj', 'designer']) {
    const cookie = await app.cookie(id);
    const read = await app.call('db', { action: 'get', key: 'events' }, cookie);
    const all = await app.call('db', { action: 'get_all' }, cookie);
    assert.deepEqual(read.data.value, events);
    assert.deepEqual(all.data.data.events, events);
  }
});

test('Dedicated actions do not open generic player/event writes or accept revoked sessions', async () => {
  for (const key of ['players', 'events']) {
    const original = await app.read(key);
    assert.equal((await app.call('db', { action: 'set', key, value: [], expectedVersion: original.version }, alice)).status, 403);
    assert.deepEqual(await app.read(key), original);
  }
  const accounts = clone(app.accounts);
  accounts.find(account => account.id === 'alice').sessionVersion++;
  await app.seed('accounts', accounts);
  assert.equal((await consumption()).status, 401);
  assert.equal((await action('dismiss_notifications', { all: true })).status, 401);
  assert.equal((await action('set_event_participation', { eventId: 'open', participating: true })).status, 401);
  assert.deepEqual((await app.read('players')).value, players);
  assert.deepEqual((await app.read('events')).value, events);
  assert.deepEqual(app.errors, []);
});
