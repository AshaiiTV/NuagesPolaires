#!/usr/bin/env node
'use strict';

// The executable registry is the source of truth. This generator never rewrites
// the engine or reads an older generated contract to reconstruct its inputs.
const fs = require('node:fs');
const path = require('node:path');
const api = require('../assets/js/serments-reforged-combat.js');
const output = path.join(__dirname, '../docs/serments-reforged-mechanics.json');

function levelFormula(rule, nextRule, level) {
  const numbers = /\b\d+(?:\.\d+)?\b/g;
  const current = rule.match(numbers) || [];
  const next = nextRule.match(numbers) || [];
  if (current.length !== next.length || rule.replace(numbers, '#') !== nextRule.replace(numbers, '#')) {
    throw new Error('The operation changes shape between consecutive levels: ' + rule);
  }
  let index = 0;
  return rule.replace(numbers, value => {
    const following = Number(next[index++]);
    if (following === Number(value)) return value;
    if (following === Number(value) + 1) return '(' + (Number(value) - level) + ' + N)';
    throw new Error('Unsupported level scaling; describe an explicit formula: ' + rule);
  });
}

const entries = JSON.parse(JSON.stringify(api.catalog));
for (const entry of entries) {
  for (const branch of entry.branches) {
    branch.tiers = branch.levels.map(level => {
      const current = api.describe(entry.name, branch.key, level);
      const next = api.describe(entry.name, branch.key, level + 1);
      const operations = current.operations.map(operation => {
        const sibling = next.operations.find(candidate => candidate.id === operation.id);
        if (!sibling) throw new Error(entry.name + ': operation disappeared at the next level.');
        return {
          ...operation,
          ruleFormula: levelFormula(operation.rule, sibling.rule, level)
        };
      });
      return {
        level,
        effect: operations.map(operation => operation.rule).join(' '),
        effectFormula: operations.map(operation => operation.ruleFormula).join(' '),
        operations
      };
    });
    branch.operations = branch.tiers.at(-1).operations;
    branch.cost = branch.tiers[0].operations[0].cost;
  }
}

const contract = {
  schemaVersion: 2,
  status: 'Règles et formules générées directement depuis le registre de combat v2. N est le niveau réel du personnage.',
  common: 'N désigne le niveau. Les dégâts de frappe ajoutent N une fois. Préparations et frappes sont des actions distinctes. Les 4 valeurs suivent les 4 paliers. Aucun effet ne donne d’action supplémentaire.',
  entries
};
const serialized = JSON.stringify(contract, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8') !== serialized) {
    throw new Error('The mechanics contract is stale. Run node scripts/generate-serments-reforged-mechanics.js.');
  }
} else {
  fs.writeFileSync(output, serialized);
}
console.log('Mechanics contract: ' + entries.length + ' oaths, ' + entries.reduce((n, e) => n + e.branches.length, 0) + ' branches, formulas verified.');
