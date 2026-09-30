'use strict';

const assert = require('node:assert/strict');
const { createLocalApp } = require('./helpers/local-app');
const clone = value => JSON.parse(JSON.stringify(value));

(async () => {
  const app = await createLocalApp();
  let checks = 0;
  async function check(name, run) {
    await run();
    checks++;
    console.log('OK ' + name);
  }
  try {
    const admin = await app.cookie('admin');
    const alice = await app.cookie('alice');
    const mj = await app.cookie('mj');
    const designer = await app.cookie('designer');
    const get = (key, cookie) => app.call('db', { action: 'get', key }, cookie);
    const set = async (key, value, cookie = admin, version) => app.call('db', {
      action: 'set', key, value,
      expectedVersion: version === undefined ? (await app.read(key)).version : version
    }, cookie);

    await check('Internal and unknown stores are denied for anonymous callers and excluded from bundles', async () => {
      for (const key of ['np_rate_auth', 'themes_admin_store', 'np_admin_recovery_consumed', 'future_private_store']) {
        assert.equal((await get(key)).status, 401);
        assert.equal((await get(key, admin)).status, 401);
      }
      const bundle = await app.call('db', { action: 'get_public_bundle' });
      assert.equal(bundle.status, 200);
      for (const key of ['np_rate_auth', 'themes_admin_store', 'np_admin_recovery_consumed', 'accounts', 'players']) {
        assert.equal(key in bundle.data.data, false);
        assert.equal(key in bundle.data.versions, false);
      }
    });

    await check('Public beast reads remove hidden/archived creatures and nested staff notes; staff retains full records', async () => {
      const beasts = [
        { id: 'public', name: 'Loup', adminNotes: 'secret', nested: { mjNote: 'secret', description: 'visible' } },
        { id: 'hidden', hidden: true, name: 'Boss' },
        { id: 'archived', archived: true, name: 'Old boss' }
      ];
      await app.seed('beasts', beasts);
      for (const cookie of [undefined, alice]) {
        const result = await get('beasts', cookie);
        assert.equal(result.status, 200);
        assert.deepEqual(result.data.value.map(beast => beast.id), ['public']);
        assert.equal(result.data.value[0].adminNotes, undefined);
        assert.deepEqual(result.data.value[0].nested, { description: 'visible' });
        const bundle = await app.call('db', { action: 'get_public_bundle' }, cookie);
        assert.equal(bundle.data.data.beasts.length, 1);
        assert.equal(bundle.data.data.beasts[0].adminNotes, undefined);
        assert.equal(bundle.data.versions.beasts, (await app.read('beasts')).version);
      }
      for (const cookie of [admin, mj, designer]) {
        const all = await app.call('db', { action: 'get_all' }, cookie);
        assert.equal(all.status, 200);
        assert.deepEqual(all.data.data.beasts, beasts);
        const bundle = await app.call('db', { action: 'get_public_bundle' }, cookie);
        assert.deepEqual(bundle.data.data.beasts, beasts);
      }
    });

    await check('Generic writes cannot replace accounts or delete critical collections', async () => {
      const accounts = await app.read('accounts');
      assert.equal((await set('accounts', [], admin)).status, 403);
      for (const cookie of [admin, mj]) {
        for (const key of ['accounts', 'players', 'beasts', 'events']) {
          const result = await app.call('db', { action: 'delete', key, expectedVersion: (await app.read(key)).version }, cookie);
          assert.equal(result.status, 403);
        }
      }
      assert.deepEqual(await app.read('accounts'), accounts);
    });

    await check('Player patch changes only own journal/avatar and preserves every other stored field', async () => {
      const before = (await app.read('players')).value;
      // Include a legacy record without normalized fields to detect unrelated rewrites.
      before.push({ id: 'legacy', name: 'Legacy', opaque: { kept: true } });
      await app.seed('players', before);
      const version = (await app.read('players')).version;
      const response = await app.call('db', { action: 'patch_own_player', expectedVersion: version, patch: { journal: 'Nouvelle note', avatar: 'https://example.com/avatar.png' } }, alice);
      assert.equal(response.status, 200);
      assert.equal(response.data.value.length, 1);
      assert.equal(response.data.value[0].id, 'p_alice');
      const expected = clone(before);
      Object.assign(expected.find(player => player.id === 'p_alice'), { journal: 'Nouvelle note', avatar: 'https://example.com/avatar.png' });
      assert.deepEqual((await app.read('players')).value, expected);
      assert.equal(response.data.version, (await app.read('players')).version);
      assert.equal((await app.call('db', { action: 'patch_own_player', expectedVersion: response.data.version, patch: { level: 99 } }, alice)).status, 400);
      assert.equal((await set('players', expected, alice)).status, 403);
      await app.seed('players', app.players);
    });

    await check('Malicious avatar URLs are rejected before text sanitization can disguise them', async () => {
      const before = await app.read('players');
      for (const avatar of ['x" onerror="alert(1)', 'javascript:alert(1)', 'data:image/svg+xml;base64,PHN2Zz4=', '//evil.example/x', '\\evil.example/x']) {
        const patch = await app.call('db', { action: 'patch_own_player', expectedVersion: before.version, patch: { avatar } }, alice);
        assert.equal(patch.status, 400, avatar);
        const next = clone(before.value); next[0].avatar = avatar;
        assert.equal((await set('players', next, admin, before.version)).status, 400, avatar);
      }
      assert.deepEqual(await app.read('players'), before);
    });

    await check('MJ cannot drop existing players or alter their identity, serment or private journal', async () => {
      const before = (await get('players', mj)).data.value;
      assert.equal((await set('players', before.slice(1), mj)).status, 403);
      for (const field of ['name', 'classe', 'branch', 'journal', 'avatar']) {
        const next = clone(before);
        next[1][field] = field === 'avatar' ? '/avatar.png' : 'Changed';
        assert.equal((await set('players', next, mj)).status, 403, field);
      }
      const next = clone(before);
      next[1].xp = 10;
      next[1].inventory.push({ id: 'gem', name: 'Gemme', qty: 1 });
      assert.equal((await set('players', next, mj)).status, 200);
      next.push({ id: 'new', name: 'New character', classe: 'Mizu', level: 1 });
      assert.equal((await set('players', next, mj)).status, 200);
    });

    await check('Concurrent generic writes require a version and only one stale snapshot can commit', async () => {
      const original = await app.read('events');
      assert.equal((await app.call('db', { action: 'set', key: 'events', value: [] }, admin)).status, 428);
      const results = await Promise.all([
        set('events', [{ id: 'first' }], admin, original.version),
        set('events', [{ id: 'second' }], admin, original.version)
      ]);
      assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
      const winner = results.find(result => result.status === 200);
      assert.deepEqual((await get('events', admin)).data.value, winner.data.value);
      assert.equal((await app.read('events')).version, winner.data.version);
      assert.equal(results.find(result => result.status === 409).data.code, 'VERSION_CONFLICT');
      const creates = await Promise.all([
        set('combat_arc_rec_Admin__parallel', { id: 'first' }, admin, null),
        set('combat_arc_rec_Admin__parallel', { id: 'second' }, admin, null)
      ]);
      assert.deepEqual(creates.map(result => result.status).sort(), [200, 409]);
    });

    await check('Detailed archives round-trip intact and archive ownership handles all three prefixes', async () => {
      for (const key of ['combat_arc_rec_Alice__missing', 'combat_arc_idx_missing', 'combat_arc_missing']) {
        const missing = await get(key, admin);
        assert.equal(missing.status, 200);
        assert.equal(missing.data.value, null);
        assert.equal(missing.data.version, null);
      }
      const players = (await app.read('players')).value;
      players.find(player => player.id === 'p_alice').name = 'Alice Character';
      await app.seed('players', players);
      for (const owner of ['Alice', 'Alice Character']) {
        const detailKey = 'combat_arc_rec_' + owner + '__record';
        const archive = { id: 'record', phase: 'idle', log: ['Tour 1', 'Tour 2'], fighters: [{ id: 'wolf', pvCur: 0, type: 'beast' }] };
        assert.equal((await set(detailKey, archive, alice, null)).status, 200);
        assert.deepEqual((await get(detailKey, alice)).data.value, archive);
        assert.equal((await get(detailKey, await app.cookie('bob'))).status, 401);
        assert.equal((await set('combat_arc_idx_' + owner, [{ id: 'record' }], alice, null)).status, 200);
        assert.equal((await set('combat_arc_' + owner, [archive], alice, null)).status, 200);
      }
      const key = 'combat_arc_idx_Admin';
      const many = Array.from({ length: 5001 }, (_, i) => ({ id: String(5001 - i) }));
      const result = await set(key, many, admin, null);
      assert.equal(result.status, 200);
      assert.equal(result.data.value.length, 5000);
      assert.equal(result.data.value[0].id, '5001');
      assert.equal(result.data.value.at(-1).id, '2');
      const staleDelete = await app.call('db', { action: 'delete', key, expectedVersion: '0'.repeat(32) }, admin);
      assert.equal(staleDelete.status, 409);
      assert.equal((await app.call('db', { action: 'delete', key, expectedVersion: result.data.version }, admin)).status, 200);
      assert.equal((await get(key, admin)).data.version, null);
    });

    await check('Revoked and forced-reset sessions cannot read private data or mutate stores', async () => {
      const accounts = (await app.read('accounts')).value;
      const account = accounts.find(item => item.id === 'alice');
      account.sessionVersion++;
      await app.seed('accounts', accounts);
      assert.equal((await get('players', alice)).status, 401);
      const freshCookie = await app.cookie('alice');
      account.forcePasswordReset = true;
      account.resetExpiresAt = Date.now() + 60_000;
      await app.seed('accounts', accounts);
      assert.equal((await get('players', freshCookie)).status, 401);
      const resetCookie = await app.cookie('alice');
      assert.equal((await get('accounts', resetCookie)).status, 401);
      assert.equal((await app.call('db', { action: 'patch_own_player', expectedVersion: (await app.read('players')).version, patch: { journal: 'blocked' } }, resetCookie)).status, 401);
      assert.equal((await app.call('db', { action: 'get_public_bundle' }, resetCookie)).data.data.beasts.length, 1);
    });

    assert.deepEqual(app.errors, [], 'No SQL/handler errors should be swallowed');
    console.log(`${checks} DB security checks passed against PostgreSQL in memory.`);
  } finally {
    await app.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
