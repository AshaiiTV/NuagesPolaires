'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const source = fs.readFileSync(path.join(__dirname, '../assets/js/main.js'), 'utf8');
const recoveryCode = source.slice(source.indexOf('var _PRIVATE_KEYS ='), source.indexOf('function _mergeCombatArchiveLists('));
const svCode = source.slice(source.indexOf('function sv(k, v){'), source.indexOf('async function _savePlayerPatch('));
const ownersCode = source.slice(source.indexOf('function _combatArchiveKnownOwners(){'), source.indexOf('function combatArchiveGetIndex('));

function fixture(initial = {}, storage) {
  storage ||= new Map(Object.entries(initial));
  const context = {
    console, Date, setTimeout: fn => fn(),
    _dbToken: false, _dbOffline: false, _dbSessionGeneration: 1, CU: null,
    _dbCache: {}, notifications: [], downloads: [],
    notif: (message, type) => context.notifications.push({message, type}),
    confirm: () => true,
    localStorage: {
      get length() { return storage.size; },
      key: i => [...storage.keys()][i],
      getItem: key => storage.has(key) ? storage.get(key) : null,
      removeItem: key => storage.delete(key),
      setItem: (key, value) => storage.set(key, String(value))
    },
    Blob: class { constructor(parts) { this.text = parts.join(''); } },
    URL: { createObjectURL: blob => blob, revokeObjectURL() {} },
    _normalizeDbValueForKey: (_, value) => value,
    _cloneForDb: value => value,
    _isDbBackedKey: () => true,
    _enqueueDbWrite: async () => ({ok: true}),
    combatArchiveOwnerKey: owner => String(owner || ''),
    combatArchiveCurrentOwners: () => context.CU ? [context.CU.pseudo] : [],
    getAccounts: () => []
  };
  context.window = context;
  function node(tag) {
    return {
      tag, children: [], parent: null, style: {}, handlers: {}, textContent: '',
      setAttribute() {},
      appendChild(child) { child.parent = this; this.children.push(child); },
      insertBefore(child) { child.parent = this; this.children.unshift(child); },
      addEventListener(name, handler) { this.handlers[name] = handler; },
      remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); },
      click() { if (tag === 'a') context.downloads.push(this.href.text); else this.handlers.click?.(); }
    };
  }
  const body = node('body'), app = node('div'); app.id = 's-app'; body.appendChild(app);
  function byId(id, root = body) { return root.id === id ? root : root.children.map(child => byId(id, child)).find(Boolean); }
  context.document = { body, createElement: node, getElementById: byId };
  vm.createContext(context);
  vm.runInContext(recoveryCode + '\n' + svCode + '\n' + ownersCode, context);
  function login(pseudo, role = 'joueur') {
    context._dbSessionGeneration++;
    context._dbToken = true;
    context.CU = {pseudo, name: pseudo, role};
  }
  return { context, storage, login };
}

const oldCopies = {
  np_combat_arc_Alice: '[{"id":"only-local","log":["private Alice"]}]',
  combat_arc_idx_Alice: '[{"id":"only-local"}]',
  np_combat_arc_rec_Alice__only_local: '{broken legacy json',
  np_combat_arc_Bob: '[{"id":"private Bob"}]',
  np_combat_arc_AliceExtra: '[{"id":"prefix collision"}]',
  np_players: '[{"private":"player"}]',
  np_spawn_lab_staff: '{"private":"staff"}'
};

test('Startup and repeated reloads preserve only quarantined historical combat copies', () => {
  const first = fixture(oldCopies);
  first.context._purgePrivateBrowserStorage();
  assert.equal(first.storage.has('np_players'), false);
  assert.equal(first.storage.has('np_spawn_lab_staff'), false);
  assert.deepEqual([...first.storage.keys()].sort(), Object.keys(oldCopies).filter(key => key.includes('combat_arc')).sort());
  assert.equal(first.context._collectLegacyCombatArchivesFromLocalStorage().length, 0);
  assert.equal(first.context._showLegacyCombatArchiveRecovery(), false);
  assert.equal(first.context.document.getElementById('legacy-combat-recovery'), undefined);
  const reloaded = fixture({}, first.storage);
  reloaded.context._purgePrivateBrowserStorage();
  assert.equal(reloaded.storage.get('np_combat_arc_Alice'), oldCopies.np_combat_arc_Alice);
  assert.equal(reloaded.storage.get('np_combat_arc_rec_Alice__only_local'), '{broken legacy json');
});

test('Recovery exports exact own copies only, without deleting, caching or adding other owners to normal navigation', async () => {
  const f = fixture(oldCopies); f.login('Alice');
  assert.equal(f.context._showLegacyCombatArchiveRecovery(), true);
  assert.equal(f.context.document.getElementById('legacy-combat-recovery-erase').disabled, true);
  assert.equal(f.context._removeLegacyCombatArchivesFromLocalStorage(), false);
  assert.equal(f.context._exportLegacyCombatArchiveRecovery(), true);
  const exported = JSON.parse(f.context.downloads[0]);
  assert.deepEqual(exported.storage.map(entry => entry.key).sort(), ['combat_arc_idx_Alice', 'np_combat_arc_Alice', 'np_combat_arc_rec_Alice__only_local']);
  for (const entry of exported.storage) assert.equal(entry.rawValue, oldCopies[entry.key]);
  assert.deepEqual(Object.keys(f.context._dbCache), []);
  assert.deepEqual([...f.context._combatArchiveKnownOwners()], ['Alice']);
  assert.equal(f.storage.get('np_combat_arc_Alice'), oldCopies.np_combat_arc_Alice);
  await f.context.sv('combat_arc_Alice', [{id:'server-save'}]);
  assert.equal(f.storage.get('np_combat_arc_Alice'), oldCopies.np_combat_arc_Alice, 'Ordinary server saves must preserve the unrecovered copy');
  assert.equal(f.storage.has('combat_arc_rec_Alice__new'), false);
  f.context._dismissLegacyCombatArchiveRecovery();
  assert.equal(f.storage.get('np_combat_arc_Alice'), oldCopies.np_combat_arc_Alice, 'Later only hides the banner');
});

test('Deletion needs a verified export and explicit confirmation; changed or other-owner copies survive', () => {
  const f = fixture(oldCopies); f.login('Alice');
  f.context._exportLegacyCombatArchiveRecovery();
  f.context.confirm = () => false;
  assert.equal(f.context._removeLegacyCombatArchivesFromLocalStorage(), false);
  assert.equal(f.storage.get('np_combat_arc_Alice'), oldCopies.np_combat_arc_Alice);
  f.storage.set('np_combat_arc_Alice', '[{"id":"new local edit"}]');
  f.context.confirm = () => true;
  assert.equal(f.context._removeLegacyCombatArchivesFromLocalStorage(), true);
  assert.equal(f.storage.get('np_combat_arc_Alice'), '[{"id":"new local edit"}]');
  assert.equal(f.storage.has('combat_arc_idx_Alice'), false);
  assert.equal(f.storage.has('np_combat_arc_rec_Alice__only_local'), false);
  assert.equal(f.storage.get('np_combat_arc_Bob'), oldCopies.np_combat_arc_Bob);
  assert.equal(f.storage.get('np_combat_arc_AliceExtra'), oldCopies.np_combat_arc_AliceExtra);
});

test('Session changes invalidate recovery; staff cannot recover somebody else’s historical copies', () => {
  const f = fixture(oldCopies); f.login('Alice');
  f.context._showLegacyCombatArchiveRecovery();
  f.context._exportLegacyCombatArchiveRecovery();
  f.login('Bob', 'admin');
  assert.equal(f.context._removeLegacyCombatArchivesFromLocalStorage(), false);
  assert.deepEqual([...f.context._collectLegacyCombatArchivesFromLocalStorage()].map(entry => entry.key), ['np_combat_arc_Bob']);
  f.context._purgePrivateBrowserStorage();
  assert.equal(f.context.document.getElementById('legacy-combat-recovery'), undefined);
  assert.equal(f.context._LEGACY_COMBAT_ARCHIVE_BUFFER, null);
  assert.equal(f.storage.get('np_combat_arc_Alice'), oldCopies.np_combat_arc_Alice);
  f.context._dbToken = false;
  f.context.CU = null;
  assert.equal(f.context._exportLegacyCombatArchiveRecovery(), false);
  assert.equal(f.context._removeLegacyCombatArchivesFromLocalStorage(), false);
});

test('A failed download never authorizes deletion and keeps all historical data', () => {
  const f = fixture(oldCopies); f.login('Alice');
  f.context.URL.createObjectURL = () => { throw new Error('Download unavailable'); };
  assert.equal(f.context._exportLegacyCombatArchiveRecovery(), false);
  assert.equal(f.context._removeLegacyCombatArchivesFromLocalStorage(), false);
  assert.deepEqual(Object.fromEntries(f.storage), oldCopies);
});
