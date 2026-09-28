'use strict';
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createLocalApp } = require('./helpers/local-app');
const { isAutoGrantWindowOpen } = require('../netlify/functions/_shared/theme-access');
let app;
before(async () => { app = await createLocalApp(); });
after(async () => { if (app) await app.close(); });
beforeEach(async () => {
  await app.seed('accounts', app.accounts);
  await app.seed('players', app.players);
  await app.seed('event_themes', []);
  await app.seed('theme_visibility', {});
});
async function accountPatch(id, patch) {
  const records = (await app.read('accounts')).value;
  Object.assign(records.find(record => record.id === id), patch);
  await app.seed('accounts', records);
}
async function playerPatch(id, patch) {
  const records = (await app.read('players')).value;
  Object.assign(records.find(record => record.id === id), patch);
  await app.seed('players', records);
}
const select = async (themeId, id = 'alice') => app.call('auth', { action: 'self_set_theme', themeId }, await app.cookie(id));
const storedAccount = async (id = 'alice') => (await app.read('accounts')).value.find(record => record.id === id);
async function injectBeforeSelectionWrite(mutate, request) {
  const originalSql = app.auth.sql;
  let injected = false;
  app.auth.sql = async (strings, ...values) => {
    if (!injected && strings.join('').includes('WITH locked AS MATERIALIZED')) {
      injected = true;
      await mutate();
    }
    return originalSql(strings, ...values);
  };
  try {
    const result = await request();
    assert.equal(injected, true, 'the real CAS write must be reached');
    return result;
  } finally { app.auth.sql = originalSql; }
}

test('Theme selection requires an authenticated unrestricted session', async () => {
  assert.equal((await app.call('auth', { action: 'self_set_theme', themeId: 'dark' })).status, 401);
  await accountPatch('alice', { forcePasswordReset: true, resetExpiresAt: Date.now() + 60000 });
  assert.equal((await select('dark')).status, 401);
});

test('Unknown, empty and malformed theme IDs cannot create an entitlement', async () => {
  const before = await app.read('accounts');
  for (const id of ['invented-theme', '', null, {}, '<script>alert(1)</script>']) {
    const result = await select(id);
    assert.equal(result.status, 400);
    assert.equal(result.data.code, 'UNKNOWN_THEME');
  }
  assert.deepEqual((await app.read('accounts')).value, before.value);
});

test('A stored selection is never ownership and self-unlock remains disabled', async () => {
  await accountPatch('alice', { selectedTheme: 'violet' });
  await playerPatch('p_alice', { selectedTheme: 'green' });
  for (const id of ['violet', 'green']) {
    const result = await select(id);
    assert.equal(result.status, 403);
    assert.equal(result.data.code, 'THEME_UNAVAILABLE');
  }
  assert.equal((await app.call('auth', { action: 'self_unlock_theme', themeId: 'violet' }, await app.cookie('alice'))).status, 403);
  assert.deepEqual((await storedAccount()).unlockedThemes, []);
});

test('Dark and light remain usable despite blocks and for an unlinked account', async () => {
  await accountPatch('alice', { pid: null, blockedThemes: ['dark', 'light'] });
  for (const id of ['dark', 'light']) {
    const result = await select(id);
    assert.equal(result.status, 200);
    assert.equal(result.data.selectedTheme, id);
    assert.equal(result.headers['Set-Cookie'], undefined);
    assert.equal(result.data.role, 'joueur');
    assert.equal(result.data.pid, null);
    assert.equal(result.data.name, 'Alice');
  }
  assert.equal((await select('violet')).status, 403);
});

test('Owned aliases normalize consistently and only mutate the selecting account', async () => {
  await accountPatch('alice', { unlockedThemes: ['theme-violet', 'sylvan', 'aquarius'] });
  const bob = await storedAccount('bob');
  for (const [alias, canonical] of [['Abyssal', 'violet'], ['theme-green', 'green'], ['Aquarius', 'aquaris'], ['Écarlate', 'dark'], ['Brume Claire', 'light']]) {
    const result = await select(alias);
    assert.equal(result.status, 200, alias);
    assert.equal(result.data.selectedTheme, canonical);
    assert.equal(result.headers['Set-Cookie'], undefined, 'theme selection must not renew an old session cookie');
  }
  assert.deepEqual(await storedAccount('bob'), bob);
});

test('Legacy ownership comes only from the linked character', async () => {
  await playerPatch('p_alice', { unlockedThemes: ['theme-violet'] });
  await playerPatch('p_bob', { unlockedThemes: ['green'] });
  assert.equal((await select('violet')).status, 200);
  assert.deepEqual((await storedAccount()).unlockedThemes, [], 'legacy entitlement is not copied during a selection');
  assert.equal((await select('green')).status, 403);
  await accountPatch('alice', { pid: null });
  assert.equal((await select('violet')).status, 403);
});

test('Account and linked-player blocks take priority over ownership and automatic gifts', async () => {
  await accountPatch('alice', { unlockedThemes: ['violet', 'green'], blockedThemes: ['theme-violet'] });
  await playerPatch('p_alice', { blockedThemes: ['sylvan'] });
  await app.seed('event_themes', [{ id: 'green', autoGrantAll: true }]);
  assert.equal((await select('violet')).status, 403);
  assert.equal((await select('green')).status, 403);
  assert.equal((await storedAccount()).selectedTheme, 'dark');
});

test('Staff can use every known theme while unknown names remain rejected', async () => {
  await app.seed('event_themes', [{ id: 'private-winter', autoGrantAll: false, earlyCloudsOnly: true, visible: false, availableUntil: 1 }]);
  for (const id of ['admin', 'mj', 'designer']) {
    await accountPatch(id, { blockedThemes: ['violet', 'private-winter'] });
    for (const theme of ['violet', 'private-winter']) assert.equal((await select(theme, id)).status, 200);
    assert.equal((await select('invented', id)).status, 400);
  }
});

test('Owned themes stay usable when hidden or expired without reopening distribution', async () => {
  await app.seed('event_themes', [{ id: 'winter-memory', event: true, visible: false, availableUntil: 1, autoGrantAll: true }]);
  await app.seed('theme_visibility', { 'winter-memory': false });
  await accountPatch('alice', { unlockedThemes: ['winter-memory'] });
  assert.equal((await select('winter-memory')).status, 200);
  assert.equal((await select('winter-memory', 'bob')).status, 403);
});

test('Early Clouds restrictions remain effective for owned themes and auto-distribution', async () => {
  await app.seed('event_themes', [{ id: 'founders-only', early_clouds_only: true, autoGrantAll: true }]);
  await accountPatch('alice', { unlockedThemes: ['founders-only'] });
  assert.equal((await select('founders-only')).status, 403);
  await playerPatch('p_alice', { foundingClouds: true });
  assert.equal((await select('founders-only')).status, 200);
  assert.equal((await select('founders-only', 'bob')).status, 403);
  await playerPatch('p_bob', { earlyClouds: true });
  assert.equal((await select('founders-only', 'bob')).status, 200);
});

test('A valid automatic gift is persisted only by successful explicit selection', async () => {
  const now = Date.now();
  await app.seed('event_themes', { solstice: { name: 'Solstice', autoGrantAll: true, availableFrom: now - 1000, availableUntil: now + 60000 } });
  const accountsBefore = await app.read('accounts');
  assert.equal((await app.call('auth', { action: 'session_bundle' }, await app.cookie('alice'))).status, 200);
  const withoutPresence = records => records.map(({ lastSeen, ...record }) => record);
  assert.deepEqual(withoutPresence((await app.read('accounts')).value), withoutPresence(accountsBefore.value));
  const result = await select('solstice');
  assert.equal(result.status, 200);
  assert.deepEqual(result.data.unlockedThemes, ['solstice']);
  assert.deepEqual((await storedAccount()).unlockedThemes, ['solstice']);
  await app.seed('event_themes', { solstice: { availableUntil: 1 } });
  assert.equal((await select('solstice')).status, 200, 'a claimed gift survives its closed window');
  assert.equal((await select('solstice', 'bob')).status, 403);
});

test('Automatic distribution rejects closed, future and malformed windows', async () => {
  const now = Date.now();
  for (const [id, metadata] of [
    ['closed', { availableUntil: now - 1 }], ['future', { availableFrom: now + 60000 }],
    ['invalid-end', { availableUntil: 'never' }], ['invalid-start', { availableFrom: 'later' }],
    ['null-end', { availableUntil: null }], ['empty-end', { availableUntil: '' }], ['flagged', { acquisitionInvalid: true }],
    ['negative', { availableUntil: -1 }], ['disabled', { autoGrantAll: false }]
  ]) {
    await app.seed('event_themes', [{ id, autoGrantAll: true, ...metadata }]);
    assert.equal((await select(id)).status, 403, id);
  }
  assert.deepEqual((await storedAccount()).unlockedThemes, []);
  assert.equal(isAutoGrantWindowOpen({ autoGrantAll: true, availableFrom: now, availableUntil: now + 1 }, now), true);
  assert.equal(isAutoGrantWindowOpen({ autoGrantAll: true, availableUntil: now }, now), false);
  assert.equal(isAutoGrantWindowOpen({ autoGrantAll: true, availableUntil: true }, now), false);
  assert.equal(isAutoGrantWindowOpen({ autoGrantAll: true, availableUntil: null }, now), false);
  assert.equal(isAutoGrantWindowOpen({ autoGrantAll: true, acquisitionInvalid: true }, now), false);
});

test('Simultaneous selections preserve both accounts and unrelated player records', async () => {
  await accountPatch('alice', { unlockedThemes: ['violet'] });
  await accountPatch('bob', { unlockedThemes: ['green'] });
  const playersBefore = await app.read('players');
  const results = await Promise.all([select('violet'), select('green', 'bob')]);
  assert.deepEqual(results.map(result => result.status), [200, 200]);
  assert.equal((await storedAccount()).selectedTheme, 'violet');
  assert.equal((await storedAccount('bob')).selectedTheme, 'green');
  assert.deepEqual((await app.read('players')).value, playersBefore.value);
});

test('A concurrent account block cannot be merged with an obsolete selectedTheme', async () => {
  await accountPatch('alice', { unlockedThemes: ['violet'] });
  const result = await injectBeforeSelectionWrite(async () => {
    const block = await app.call('auth', { action: 'admin_block_theme', accountId: 'alice', themeId: 'violet' }, await app.cookie('admin'));
    assert.equal(block.status, 200);
  }, () => select('violet'));
  assert.equal(result.status, 403);
  assert.deepEqual((await storedAccount()).blockedThemes, ['violet']);
  assert.equal((await storedAccount()).selectedTheme, 'dark');
});

test('A concurrent account revocation cannot be bypassed by its previous ownership', async () => {
  await accountPatch('alice', { unlockedThemes: ['violet'] });
  const result = await injectBeforeSelectionWrite(async () => {
    const revoke = await app.call('auth', { action: 'admin_revoke_theme', accountId: 'alice', themeId: 'violet' }, await app.cookie('admin'));
    assert.equal(revoke.status, 200);
  }, () => select('violet'));
  assert.equal(result.status, 403);
  assert.deepEqual((await storedAccount()).unlockedThemes, []);
  assert.equal((await storedAccount()).selectedTheme, 'dark');
});

test('Concurrent revocation of a legacy-player grant cancels selection', async () => {
  await playerPatch('p_alice', { unlockedThemes: ['violet'] });
  const result = await injectBeforeSelectionWrite(() => playerPatch('p_alice', { unlockedThemes: [] }), () => select('violet'));
  assert.equal(result.status, 403);
  assert.equal((await storedAccount()).selectedTheme, 'dark');
});

test('Concurrent closing of an automatic distribution cannot grant the theme', async () => {
  await app.seed('event_themes', [{ id: 'solstice', autoGrantAll: true }]);
  const result = await injectBeforeSelectionWrite(() => app.seed('event_themes', [{ id: 'solstice', autoGrantAll: false }]), () => select('solstice'));
  assert.equal(result.status, 403);
  assert.deepEqual((await storedAccount()).unlockedThemes, []);
});

test('A reset during theme selection returns conflict and never issues a cookie', async () => {
  await accountPatch('alice', { unlockedThemes: ['violet'] });
  const result = await injectBeforeSelectionWrite(() => accountPatch('alice', { sessionVersion: 1 }), () => select('violet'));
  assert.equal(result.status, 409);
  assert.equal(result.data.conflict, true);
  assert.equal(result.headers['Set-Cookie'], undefined);
  assert.equal((await storedAccount()).selectedTheme, 'dark');
});

test('Changing the linked character during selection requires a fresh request', async () => {
  await playerPatch('p_alice', { unlockedThemes: ['violet'] });
  const result = await injectBeforeSelectionWrite(() => accountPatch('alice', { pid: null }), () => select('violet'));
  assert.equal(result.status, 409);
  assert.equal((await storedAccount()).selectedTheme, 'dark');
});

for (const action of ['admin_revoke_theme', 'admin_block_theme']) {
  test(action + ' resets a theme selected concurrently after the initial admin read', async () => {
    await accountPatch('alice', { unlockedThemes: ['violet'] });
    const originalSql = app.auth.sql;
    let injected = false;
    app.auth.sql = async (strings, ...values) => {
      const statement = strings.join('');
      if (!injected && statement.startsWith('UPDATE np_store SET value = ') && values[1] === 'accounts') {
        injected = true;
        assert.equal((await select('violet')).status, 200);
      }
      return originalSql(strings, ...values);
    };
    try {
      const result = await app.call('auth', { action, accountId: 'alice', themeId: 'theme-violet' }, await app.cookie('admin'));
      assert.equal(result.status, 200);
      assert.equal(injected, true);
      assert.equal((await storedAccount()).selectedTheme, 'dark');
      assert.equal((await select('violet')).status, 403);
    } finally { app.auth.sql = originalSql; }
  });
}

test('Theme access checks produce no unexpected handler failures', () => {
  assert.equal(app.errors.length, 0, app.errors.join('\n'));
});
