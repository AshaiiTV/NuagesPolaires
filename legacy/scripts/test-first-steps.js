'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '../assets/js/first-steps.js'), 'utf8');
function fixture() {
  const target = { innerHTML: '' }, calls = [];
  const context = {
    CU: null, account: null, characters: [],
    document: { getElementById: id => ['guide', 'p-first-steps-c', 'public-first-steps-c'].includes(id) ? target : null },
    getCurrentAccount: () => context.account,
    gpid: id => context.characters.find(character => character.id === id),
    showScreen: id => calls.push(['screen', id]),
    switchDropTab: (...args) => calls.push(['tab', ...args]),
    closeMobileDrawer: () => calls.push(['close-mobile']),
    _closeAllNavDrops: () => calls.push(['close-desktop']),
    forceOpenOwnProfile: () => calls.push(['own-profile']),
    openSettings: tab => calls.push(['settings', tab]),
    openRpgPrototype: () => calls.push(['rpg']),
    location: { reload: () => calls.push(['reload']) }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return { context, target, calls, render() { context.renderFirstSteps('guide'); return target.innerHTML; } };
}

test('The guest guide preserves the rules-first registration flow and never opens the private shell', () => {
  const f = fixture();
  f.context.openFirstSteps();
  assert.ok(f.calls.some(call => call[0] === 'screen' && call[1] === 's-first-steps'));
  assert.match(f.target.innerHTML, /data-onboarding-state="guest"/);
  f.calls.length = 0;
  for (const action of ['register', 'rules', 'character', 'account', 'events']) f.context.npFirstStepsGo(action);
  assert.deepEqual(f.calls.filter(call => call[0] === 'screen'), [['screen', 's-hrp'], ['screen', 's-hrp']]);
  assert.equal(f.calls.some(call => call[0] === 'tab' || call[0] === 'own-profile'), false);
});

test('An unlinked account is guided to the administrator without pretending reading or setup is completed', () => {
  const f = fixture();
  f.context.CU = { role: 'joueur', pid: null, pseudo: 'Nouveau' };
  f.context.account = { id: 'new', pid: null, pseudo: 'Nouveau' };
  const before = JSON.stringify(f.context.CU);
  const html = f.render();
  assert.match(html, /data-onboarding-state="pending"/);
  assert.match(html, /Un administrateur doit maintenant le lier/);
  assert.match(html, /Pseudo à transmettre : <strong>Nouveau<\/strong>/);
  assert.doesNotMatch(html, /type="checkbox"|progressbar|étapes? terminée|règlement (?:lu|validé)/i);
  assert.equal(JSON.stringify(f.context.CU), before);
});

test('Current account linking wins over a stale session and every render reflects the new state', () => {
  const f = fixture();
  f.context.CU = { role: 'joueur', pid: null, pending: true };
  f.context.account = { pid: null };
  assert.match(f.render(), /data-onboarding-state="pending"/);
  f.context.account.pid = 'linked';
  assert.match(f.render(), /data-onboarding-state="unavailable"/);
  assert.doesNotMatch(f.target.innerHTML, /data-onboarding-state="pending"/);
  f.context.characters.push({ id: 'linked', name: 'Aurore' });
  assert.match(f.render(), /data-onboarding-state="linked"/);
  assert.match(f.target.innerHTML, /Aurore, la suite t’appartient/);
  f.context.account.pid = null;
  f.context.CU.pid = 'linked';
  assert.match(f.render(), /data-onboarding-state="pending"/, 'The authoritative unlinked account must beat the stale CU.pid');
});

test('Staff viewing another character do not inherit that player’s onboarding state', () => {
  const f = fixture();
  f.context.characters.push({ id: 'other', name: 'Secret personnage' });
  for (const role of ['admin', 'mj', 'designer']) {
    f.context.CU = { role, pid: 'other', pending: true };
    assert.match(f.render(), /data-onboarding-state="staff"/);
    assert.doesNotMatch(f.target.innerHTML, /Secret personnage|data-onboarding-state="pending"/);
    assert.equal(f.context.renderFirstStepsHome(), '');
  }
});

test('Account names and character names are escaped in the guide and the dashboard invitation', () => {
  const f = fixture();
  f.context.CU = { role: 'joueur', pid: null, pseudo: '<img src=x onerror=alert(1)>' };
  assert.match(f.render(), /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(f.context.renderFirstStepsHome(), /<img/);
  f.context.CU.pid = 'test';
  f.context.characters.push({ id: 'test', name: '<script>alert(1)</script>' });
  assert.match(f.render(), /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(f.target.innerHTML, /<script>/);
});

test('A guide already rendered before logout cannot navigate into private account or character views', () => {
  const f = fixture();
  f.context.CU = { role: 'joueur', pid: 'alice' };
  f.context.characters.push({ id: 'alice', name: 'Alice' });
  f.render();
  f.context.CU = null;
  f.context.npFirstStepsGo('character');
  f.context.npFirstStepsGo('account');
  assert.equal(f.calls.some(call => call[0] === 'own-profile' || call[0] === 'settings'), false);
  assert.match(f.render(), /data-onboarding-state="guest"/);
  assert.doesNotMatch(f.target.innerHTML, /Alice/);
});

test('Unknown actions are ignored and ordinary guide navigation delegates to the existing tab lifecycle', () => {
  const f = fixture();
  f.context.CU = { role: 'joueur' };
  f.context.npFirstStepsGo('constructor');
  f.context.npFirstStepsGo('database');
  assert.equal(f.calls.some(call => call[0] === 'tab'), false);
  f.context.openFirstSteps();
  assert.ok(f.calls.some(call => call[0] === 'tab' && call[1] === 'premiers-pas'));
  f.context.npFirstStepsGo('events');
  assert.ok(f.calls.some(call => call[0] === 'tab' && call[1] === 'evenements'));
  assert.equal(f.context.renderFirstSteps('missing'), false);
});
