'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const linear = require('../assets/js/serments-linear');
const reforged = require('../assets/js/serments-reforged-data');

const root = path.resolve(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'assets/js/main.js'), 'utf8');
const combat = fs.readFileSync(path.join(root, 'assets/js/serments-reforged-combat.js'), 'utf8');
const roundtrip = value => JSON.parse(JSON.stringify(value));

// Load the actual guards without starting a browser or invoking the combat UI.
function readFunction(source, name, indentation = '') {
  const start = source.indexOf('function ' + name + '(');
  const end = source.indexOf('\n' + indentation + '}', start);
  assert.ok(start >= 0 && end > start, name + ' remains available for the import contract');
  return vm.runInNewContext('(' + source.slice(start, end + indentation.length + 2) + ')');
}
const operationCards = readFunction(main, 'getSermentTierOperations');
const supportsReforgedCombat = readFunction(combat, 'supportsLinearBranch', '  ');
const nativeStart = main.indexOf('var SD=');
const nativeEnd = main.indexOf('\n};', nativeStart);
assert.ok(nativeStart >= 0 && nativeEnd > nativeStart);
const native = roundtrip(vm.runInNewContext(main.slice(nativeStart, nativeEnd + 3) + ';SD'));

const fixtures = [
  {
    name: 'Pugiliste',
    definition: reforged.definitions.Pugiliste,
    branch: reforged.definitions.Pugiliste.branches[0],
    original: undefined,
    nativeEnabled: branch => supportsReforgedCombat(branch)
  },
  {
    name: 'Duelliste',
    definition: native.Duelliste,
    branch: linear.normalizeBranch('Duelliste', native.Duelliste.bA, 0, native.Duelliste, native.Duelliste.bA),
    original: native.Duelliste.bA,
    nativeEnabled: branch => linear.combatOptions(branch.ability, 35, 3) !== null
  }
];

function normalize(fixture, branch) {
  return linear.normalizeBranch(fixture.name, branch, 0, fixture.definition, fixture.original);
}

function assertStaffResult(fixture, imported, expected) {
  const before = JSON.stringify(imported);
  const definitionBefore = JSON.stringify(fixture.definition);
  const originalBefore = JSON.stringify(fixture.original);
  const normalized = normalize(fixture, imported);
  assert.equal(normalized.paliers.length, 1);
  assert.equal(normalized.paliers[0], normalized.ability, 'Both consumers receive the same reconciled object');
  assert.deepEqual(normalized.ability, expected, 'The selected staff record keeps its exact prose, cost and metadata');
  assert.equal(operationCards(normalized.ability).length, 0, 'Generated cards cannot override imported staff prose or costs');
  assert.equal(fixture.nativeEnabled(normalized), false, 'The native engine must decline the imported override');
  assert.equal(normalize(fixture, normalized), normalized, 'A reconciled branch is idempotent');
  assert.equal(JSON.stringify(imported), before, 'Reading an import must not rewrite either raw alias');
  assert.equal(JSON.stringify(fixture.definition), definitionBefore, 'The reference definition is immutable');
  assert.equal(JSON.stringify(fixture.original), originalBefore, 'The historical native reference is immutable');
}

for (const fixture of fixtures) {
  test(fixture.name + ': a JSON roundtrip keeps unchanged aliases equivalent and normalization idempotent', () => {
    assert.equal(fixture.nativeEnabled(fixture.branch), true, 'The guard allows the unmodified baseline');
    assert.ok(operationCards(fixture.branch.ability).length > 0);
    const imported = roundtrip(fixture.branch);
    assert.notEqual(imported.ability, imported.paliers[0], 'JSON materializes two independent copies');
    const before = JSON.stringify(imported);
    const normalized = normalize(fixture, imported);
    assert.equal(normalized.ability, normalized.paliers[0]);
    assert.deepEqual(normalized.ability, fixture.branch.ability);
    assert.equal(fixture.nativeEnabled(normalized), true);
    assert.equal(normalize(fixture, normalized), normalized, 'An already shared alias preserves object identity');
    assert.equal(JSON.stringify(imported), before);
  });

  for (const alias of ['ability', 'paliers[0]']) {
    for (const [field, value] of [['desc', 'Règle du staff : 17 dégâts et une seule main engagée.'], ['desc', ''], ['cout', '2 actions / 9 EP'], ['cout', '']]) {
      test(fixture.name + ': importing only ' + alias + '.' + field + (value === '' ? ' empty' : ' edited') + ' preserves the staff override', () => {
        const imported = roundtrip(fixture.branch);
        const edited = alias === 'ability' ? imported.ability : imported.paliers[0];
        edited[field] = value;
        assertStaffResult(fixture, imported, roundtrip(edited));
      });
    }
  }

  test(fixture.name + ': ability wins when both imported aliases contain conflicting staff overrides', () => {
    const imported = roundtrip(fixture.branch);
    Object.assign(imported.ability, { desc: 'Version staff retenue : 17 dégâts.', cout: '' });
    Object.assign(imported.paliers[0], { desc: 'Autre version staff : 23 dégâts.', cout: '3 actions / 12 EM' });
    assertStaffResult(fixture, imported, roundtrip(imported.ability));
  });
}
