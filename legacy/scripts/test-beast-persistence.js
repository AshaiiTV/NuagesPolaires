'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const clone = value => JSON.parse(JSON.stringify(value));
const code = fs.readFileSync(path.join(__dirname, '../assets/js/beast-admin.js'), 'utf8');

function fixture() {
  const initial = [{ id: 'beast', nom: 'Loup', beh: 'Neutre', niv: 1, pv: 20, ep: 20, hidden: false, archived: false }];
  const fields = new Map();
  const notices = [], closed = [];
  let pending;
  const context = {
    console, Date, setTimeout, clearTimeout,
    document: { addEventListener() {} },
    CU: { name: 'Admin', role: 'admin' },
    can: () => true,
    _dbCache: { beasts: clone(initial) },
    gb: () => clone(context._dbCache.beasts),
    sb: beasts => {
      context._dbCache.beasts = clone(beasts);
      return new Promise((resolve, reject) => { pending = { resolve, reject }; });
    },
    ge: id => {
      if (!fields.has(id)) fields.set(id, { value: '', checked: false, textContent: '', classList: { contains: () => false } });
      return fields.get(id);
    },
    notif: (message, type) => notices.push({ message, type }),
    closeModal: id => closed.push(id),
    confirm: () => true,
    FileReader: class {
      readAsText(file) { this.result = file; this.onload(); }
    }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(code, context);
  context.renderBGrid = () => {};
  for (const prefix of ['ab', 'eb']) {
    context.ge(prefix + '-n').value = 'Nouveau nom';
    context.ge(prefix + '-beh').value = '3';
    context.ge(prefix + '-niv').value = '1';
    context.ge(prefix + '-pv').value = '20';
    context.ge(prefix + '-ep').value = '20';
  }
  context.ge('eb-id').value = 'beast';
  return { context, initial, notices, closed, pending: () => pending };
}

(async () => {
  const operations = [
    ['addBeast', []], ['saveEditBeast', []], ['delBeast', ['beast']],
    ['toggleBeastArchived', ['beast']], ['duplicateBeast', ['beast']],
    ['toggleBeastHidden', ['beast']], ['beastImportJsonFile', ['[{"id":"imported","nom":"Imported"}]']]
  ];
  for (const [name, args] of operations) {
    for (const succeeds of [false, true]) {
      const f = fixture();
      const run = f.context[name](...args);
      assert.equal(typeof run.then, 'function', name + ' must expose its persistence promise');
      await Promise.resolve();
      await Promise.resolve();
      assert.ok(f.pending(), name + ' must reach persistence');
      assert.deepEqual(f.closed, [], name + ' must keep the dialog open until confirmation');
      assert.equal(f.notices.some(notice => notice.type === 'ok' || /supprimée/.test(notice.message)), false, name + ' must not announce premature success');
      if (succeeds) f.pending().resolve({ ok: true });
      else f.pending().reject(new Error('Conflit de sauvegarde'));
      const result = await run;
      if (succeeds) {
        assert.equal(f.notices.filter(notice => notice.type !== 'err').length, 1, name + ' must announce one confirmed success');
      } else {
        assert.equal(result, false);
        assert.deepEqual(f.closed, [], name + ' must leave the dialog open on failure');
        assert.equal(f.context.ge('ab-n').value, 'Nouveau nom');
        assert.equal(f.context.ge('eb-n').value, 'Nouveau nom');
        assert.deepEqual(f.context._dbCache.beasts, f.initial, name + ' must restore its optimistic cache');
        assert.equal(f.notices.length, 1);
        assert.equal(f.notices[0].type, 'err');
        assert.match(f.notices[0].message, /Conflit/);
      }
    }
    console.log('OK ' + name + ': delayed success and failure preserve correct UI state');
  }
  const f = fixture();
  const first = f.context.duplicateBeast('beast');
  const second = await f.context.duplicateBeast('beast');
  assert.equal(second, false, 'A double click must not queue a duplicate write');
  const refreshed = [{ id: 'remote', nom: 'Nouvelle version distante' }];
  f.context._dbCache.beasts = refreshed;
  f.pending().reject(new Error('Échec réseau'));
  await first;
  assert.equal(f.context._dbCache.beasts, refreshed, 'Failure must not overwrite a newer refresh');
  console.log('OK double-click protection and preservation of a newer cache refresh');
})().catch(error => { console.error(error); process.exitCode = 1; });
