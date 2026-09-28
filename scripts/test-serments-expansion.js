'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test, before, after } = require('node:test');
const { createLocalApp } = require('./helpers/local-app');

const ROOT = path.resolve(__dirname, '..');
const clone = value => JSON.parse(JSON.stringify(value));
const main = fs.readFileSync(path.join(ROOT, 'assets/js/main.js'), 'utf8');
const start = main.indexOf('var SD=');
const end = main.indexOf('\n};', start);
assert.ok(start >= 0 && end > start, 'Le catalogue historique doit exister.');
const native = clone(vm.runInNewContext(main.slice(start, end + 3) + '; SD'));
const expansion = require('../assets/js/serments-expansion-data');
const definitions = expansion.definitions;
const progression = require('../assets/js/progression');
const names = Object.keys(definitions);
const compactStart = main.indexOf('function compactSermentsCustom(s){');
const compactEnd = main.indexOf('\nfunction ', compactStart + 1);
const compactSermentsCustom = vm.runInNewContext(main.slice(compactStart, compactEnd) + ';compactSermentsCustom', { window: { NPSermentsExpansion: expansion } });

test('70 additions preserve the 13 historical definitions, 80 public classes and 30 starters', () => {
  assert.equal(Object.keys(native).length, 13);
  assert.equal(names.length, 70);
  assert.equal(names.filter(name => native[name]).length, 0, 'Aucune collision avec un serment historique.');
  const all = { ...native, ...definitions };
  assert.equal(Object.keys(all).length, 83);
  assert.equal(Object.values(all).filter(def => !def.hidden).length, 80);
  assert.equal(Object.values(all).filter(def => !def.hidden && !def.evolvesFrom).length, 30);
  assert.equal(names.filter(name => definitions[name].sermLevel === 'seasoned').length, 50);
  assert.equal(names.filter(name => definitions[name].sermLevel === 'basic').length, 20);
});

test('Published custom overrides still win over historical and expansion defaults', () => {
  const custom = {
    Bretteur: { arme: 'Épée publiée', pvN: 9, branches: [{ nom: 'Branche publiée', paliers: [] }] },
    Massier: { ...clone(definitions.Massier), lore: 'Texte revu par le staff' }
  };
  const functionStart = main.indexOf('function getAllSD(){');
  const functionEnd = main.indexOf('\nfunction ', functionStart + 1);
  const getAllSD = vm.runInNewContext(main.slice(functionStart, functionEnd) + ';getAllSD', {
    SD: native, window: { NPSermentsExpansion: expansion }, gsd: () => custom
  });
  const all = getAllSD();
  assert.equal(Object.keys(all).length, 83);
  assert.equal(all.Bretteur, custom.Bretteur);
  assert.equal(all.Massier, custom.Massier);
  for (const [name, definition] of Object.entries(native)) {
    if (name !== 'Bretteur') assert.equal(all[name], definition, name + ' historique conservé');
  }
});

test('Every new class has two autonomous branches with four correctly ranked tiers', () => {
  let branchCount = 0, tierCount = 0;
  const all = { ...native, ...definitions };
  for (const [name, definition] of Object.entries(definitions)) {
    assert.ok(definition.arme && definition.lore && definition.type, name + ' identité et arme');
    assert.ok(!definition.hidden, name + ' visible');
    assert.ok(Number.isFinite(definition.dmg) && definition.dmg > 0, name + ' dégâts de base');
    assert.ok(['melee', 'distance', 'magie', 'soutien'].includes(definition.cat), name + ' catégorie');
    assert.equal(definition.branches.length, 2, name + ' deux branches');
    assert.notEqual(definition.branches[0].nom, definition.branches[1].nom);
    if (definition.evolvesFrom) {
      assert.ok(all[definition.evolvesFrom], name + ' parent présent');
      for (const stat of ['pvN', 'epN', 'emN']) assert.equal(definition[stat], all[definition.evolvesFrom][stat], name + ' hérite ' + stat);
    }
    for (const branch of definition.branches) {
      branchCount++;
      assert.ok(branch.nom && branch.desc, name + ' branche décrite');
      assert.deepEqual(branch.paliers.map(tier => tier.niv), definition.evolvesFrom ? [10, 13, 16, 20] : [2, 5, 7, 10], name);
      for (const tier of branch.paliers) {
        tierCount++;
        assert.ok(tier.nom && tier.desc && tier.cout, name + ' palier complet');
      }
    }
  }
  assert.equal(branchCount, 140);
  assert.equal(tierCount, 560);
});

test('All new logos are local SVG assets and safely renderable', () => {
  const used = new Set();
  for (const [name, definition] of Object.entries(definitions)) {
    const logo = definition.logo;
    assert.match(logo, /^\/?assets\/.*\.svg$/, name + ' logo local');
    assert.ok(!used.has(logo), name + ' fichier de logo distinct');
    used.add(logo);
    const file = path.resolve(ROOT, logo.replace(/^\//, ''));
    assert.ok(file.startsWith(ROOT + path.sep));
    const svg = fs.readFileSync(file, 'utf8');
    assert.match(svg, /<svg\b/);
    assert.match(svg, /viewBox=/);
    assert.doesNotMatch(svg, /<script\b|\bon\w+\s*=|javascript:|<foreignObject\b|https?:\/\/(?!www\.w3\.org\/2000\/svg)/i, name + ' SVG sans contenu actif');
  }
  assert.equal(used.size, 70);
});

test('Shared server and browser growth agrees with every new class, including inherited growth', () => {
  for (const [name, definition] of Object.entries(definitions)) {
    const expected = { pvN: definition.pvN, epN: definition.epN, emN: definition.emN };
    const actual = progression.effectiveDefinition(name);
    for (const stat of Object.keys(expected)) assert.equal(actual[stat], expected[stat], name + ' ' + stat);
    const customized = progression.effectiveDefinition(name, { [name]: { pvN: 99, epN: 0 } });
    assert.equal(customized.pvN, 99);
    assert.equal(customized.epN, 0);
    assert.equal(customized.emN, definition.emN, name + ' fallback conservé');
  }
});

let app, admin, alice;
before(async () => {
  app = await createLocalApp();
  [admin, alice] = await Promise.all([app.cookie('admin'), app.cookie('alice')]);
});
after(async () => { if (app) { assert.deepEqual(app.errors, []); await app.close(); } });

test('Real DB and auth handlers migrate and persist every new class with the correct growth', async () => {
  const players = names.map((name, index) => ({
    id: index === 0 ? 'p_alice' : 'p_expansion_' + index,
    name: 'Audit ' + name, classe: name, branch: definitions[name].branches[0].nom,
    level: 1, xp: 0, xpMax: 30, sLevel: 2, sXp: 0, sXpMax: 20,
    pvMax: 30, pvCur: 27, epMax: 50, epCur: 41, emMax: 20, emCur: 12,
    inventory: [], history: [], journal: ''
  }));
  await app.seed('players', players);
  const raw = await app.read('players');
  const result = await app.call('db', { action: 'get', key: 'players' }, admin);
  assert.equal(result.status, 200);
  assert.equal(result.data.value.length, 70);
  for (const player of result.data.value) {
    const def = definitions[player.classe];
    assert.equal(player.level, 2, player.classe);
    assert.equal(player.branch, def.branches[0].nom);
    assert.deepEqual([player.pvMax, player.epMax, player.emMax], [30 + def.pvN, 50 + def.epN, 20 + def.emN], player.classe);
    assert.deepEqual([player.pvCur, player.epCur, player.emCur], [27 + def.pvN, 41 + def.epN, 12 + def.emN], player.classe);
  }
  const bundle = await app.call('auth', { action: 'session_bundle' }, alice);
  assert.equal(bundle.status, 200);
  assert.deepEqual(bundle.data.data.players[0], result.data.value[0]);
  assert.deepEqual(await app.read('players'), raw, 'La lecture ne réécrit pas la base.');
  const saved = await app.call('db', { action: 'set', key: 'players', value: result.data.value, expectedVersion: raw.version }, admin);
  assert.equal(saved.status, 200);
  assert.deepEqual((await app.read('players')).value, saved.data.value);
  const reread = await app.call('db', { action: 'get', key: 'players' }, admin);
  assert.deepEqual(reread.data.value, saved.data.value, 'La migration ne réapplique pas les gains.');
});

test('A player cannot assign an evolution or branch through direct DB writes', async () => {
  const raw = await app.read('players');
  for (const patch of [{ classe: 'Porte-Enclume' }, { branch: definitions['Porte-Enclume'].branches[0].nom }]) {
    const response = await app.call('db', { action: 'patch_own_player', patch, expectedVersion: raw.version }, alice);
    assert.equal(response.status, 400);
  }
  assert.deepEqual(await app.read('players'), raw);
});

test('Compacting 70 editable definitions preserves combat metadata, custom prose and input objects below the API limit', async () => {
  const editable = clone(definitions);
  editable.Massier.branches[0].desc = 'Révision de description conservée pour le MJ.';
  editable.Legacy = { lore: 'Texte historique', branches: [{ nom: 'Voie', desc: 'Description historique' }] };
  const original = clone(editable);
  const compact = clone(compactSermentsCustom(editable));
  assert.deepEqual(editable, original, 'La compaction ne modifie pas les objets du catalogue.');
  assert.deepEqual(compact.Legacy, editable.Legacy, 'Le contenu historique est inchangé.');
  assert.equal(compact.Massier.branches[0].desc, editable.Massier.branches[0].desc);
  for (const name of names) {
    assert.equal(Object.hasOwn(compact[name], 'entry'), false);
    assert.equal(Object.hasOwn(compact[name], 'combatRules'), false);
    for (let index = 0; index < 2; index++) {
      const branch = compact[name].branches[index], source = editable[name].branches[index];
      assert.deepEqual(branch.combatRules, source.combatRules, name + ' règles de branche');
      assert.deepEqual(branch.paliers, source.paliers, name + ' métadonnées de palier');
      assert.equal(branch.descPhys, source.descPhys);
      assert.equal(branch.flavor, source.flavor);
    }
  }
  const prior = await app.read('serments_custom');
  const request = { action: 'set', key: 'serments_custom', value: compact, expectedVersion: prior.version };
  assert.ok(Buffer.byteLength(JSON.stringify(request), 'utf8') < 1_000_000, 'Toutes les définitions modifiables tiennent dans une requête API.');
  const response = await app.call('db', request, admin);
  assert.equal(response.status, 200, JSON.stringify(response.data));
  const persisted = await app.read('serments_custom');
  assert.deepEqual(persisted.value.Massier.branches[0].combatRules, editable.Massier.branches[0].combatRules);
  assert.equal(persisted.value.Massier.branches[0].desc, editable.Massier.branches[0].desc);
  assert.equal(Object.keys(persisted.value).length, 71);
});
