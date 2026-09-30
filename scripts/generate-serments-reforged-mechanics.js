#!/usr/bin/env node
'use strict';

// The executable registry remains the source of truth. New rules use one stable
// ability per branch and exact linear coefficients; v2 tables only resume saves.
const fs = require('node:fs');
const path = require('node:path');
const api = require('../assets/js/serments-reforged-combat.js');
const output = path.join(__dirname, '../docs/serments-reforged-mechanics.json');
const numbers = /\b\d+(?:\.\d+)?\b/g;

function valueAt(part, level) {
  const value = (part.base + part.perLevel * level) / (part.divisor || 1);
  return part.round === 'ceil' ? Math.ceil(value) : value;
}
function expression(part) {
  let result = part.perLevel === 1 ? 'N' : part.perLevel + ' × N';
  if (part.base > 0) result = part.base + ' + ' + result;
  else if (part.base < 0) result += ' − ' + Math.abs(part.base);
  return part.round === 'ceil' ? '⌈(' + result + ') / ' + part.divisor + '⌉' : '(' + result + ')';
}
function ruleParts(samples, label) {
  const first = samples[0], template = first.rule.replace(numbers, '#');
  const rows = samples.map(sample => {
    if (sample.rule.replace(numbers, '#') !== template) throw new Error(label + ': operation changes shape at level ' + sample.level);
    return { level: sample.level, values: (sample.rule.match(numbers) || []).map(Number) };
  });
  const parts = []; let last = 0, index = 0;
  for (const match of first.rule.matchAll(numbers)) {
    if (match.index > last) parts.push(first.rule.slice(last, match.index));
    const column = rows.map(row => row.values[index]); index++;
    if (column.every(value => value === column[0])) parts.push(match[0]);
    else {
      // Every engine coefficient is integer. The only fractional derived values
      // are halves rounded upward (shared boost, corrosion, immediate protection).
      // N and N+2 recover that exact rational slope; many additional levels below
      // verify every emitted expression rather than trusting two samples.
      const perLevel = (column[2] - column[0]) / 2;
      const linear = { base: column[0] - perLevel * first.level, perLevel };
      let formula = Number.isInteger(linear.base) && Number.isInteger(perLevel) && rows.every((row, i) => valueAt(linear, row.level) === column[i]) ? linear : null;
      if (!formula) {
        const numeratorStep = perLevel * 2;
        for (const offset of [0, -1]) {
          const candidate = { base: column[0] * 2 - numeratorStep * first.level + offset, perLevel: numeratorStep, divisor: 2, round: 'ceil' };
          if (Number.isInteger(candidate.base) && Number.isInteger(candidate.perLevel) && rows.every((row, i) => valueAt(candidate, row.level) === column[i])) { formula = candidate; break; }
        }
      }
      if (!formula || formula.perLevel < 0) throw new Error(label + ': value has no supported increasing linear formula: ' + column.join(', '));
      parts.push(formula);
    }
    last = match.index + match[0].length;
  }
  if (last < first.rule.length) parts.push(first.rule.slice(last));
  // Keep text segments compact and easier to consume in the browser adapter.
  const compact = [];
  for (const part of parts) {
    if (typeof part === 'string' && typeof compact.at(-1) === 'string') compact[compact.length - 1] += part;
    else compact.push(part);
  }
  for (const sample of samples) {
    const rendered = compact.map(part => typeof part === 'string' ? part : valueAt(part, sample.level)).join('');
    if (rendered !== sample.rule) throw new Error(label + ': generated rule diverges at level ' + sample.level);
  }
  return compact;
}

const entries = JSON.parse(JSON.stringify(api.catalog));
for (const entry of entries) {
  for (const branch of entry.branches) {
    const min = branch.minLevel;
    const levels = [...new Set([min, min + 1, min + 2, min + 3, min + 7, Math.max(min, 10), Math.max(min, 20), 35, 36, 50, 51, 100])];
    const samples = levels.map(level => api.describe(entry.name, branch.key, level));
    const ids = samples[0].operations.map(op => op.id);
    for (const sample of samples) {
      if (JSON.stringify(sample.operations.map(op => op.id)) !== JSON.stringify(ids)) throw new Error(entry.name + ' ' + branch.key + ': operations must remain stable at every level');
    }
    const operations = samples[0].operations.map(operation => {
      const siblings = samples.map(sample => ({ level: sample.level, ...sample.operations.find(op => op.id === operation.id) }));
      if (siblings.some(op => JSON.stringify(op.cost) !== JSON.stringify(operation.cost))) throw new Error(entry.name + ': cost must remain constant');
      const parts = ruleParts(siblings, entry.name + ' ' + branch.key + ' ' + operation.id);
      return { ...operation, ruleFormula: parts.map(part => typeof part === 'string' ? part : expression(part)).join(''), ruleParts: parts };
    });
    const ability = {
      level: min,
      cost: operations[0].cost,
      effect: operations.map(operation => operation.rule).join(' '),
      effectFormula: operations.map(operation => operation.ruleFormula).join(' '),
      operations,
      scaling: branch.scaling
    };
    branch.ability = ability;
    branch.operations = operations;
    branch.cost = ability.cost;
  }
}
const contract = {
  schemaVersion: 3,
  status: 'Une capacité stable par voie, disponible dès l’obtention du serment. Les dégâts, bonus et réserves progressent avec N, le niveau réel du personnage.',
  common: 'Les opérations, leurs coûts et leurs conditions restent identiques à tous les niveaux. Les formules numériques sont linéaires ; les demi-valeurs sont arrondies au supérieur. Aucun effet ne donne d’action supplémentaire.',
  scalingPolicy: {
    anchor: 'Anciennes valeurs du premier palier : niveau 2 pour les bases, niveau 10 pour les évolutions.',
    perLevel: 'Gain moyen entre les anciennes première et dernière valeurs, arrondi à l’entier le plus proche. Pour strike, ajouter 1 au gain pour inclure son ancien +N une seule fois.',
    formula: 'base + perLevel × N ; base est choisie pour retrouver exactement la valeur au niveau d’ancrage.',
    constants: 'Coûts, actions, cibles, munitions, maximum de charges, durées, proportions et contreparties restent fixes. Les bonus par cran hérités prennent leur valeur initiale.',
    compatibility: 'Les combats v2 sauvegardés conservent leurs tables, extensions de maîtrise et réserves ; les nouveaux combats utilisent v3.'
  },
  entries
};
const serialized = JSON.stringify(contract, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8') !== serialized) throw new Error('The mechanics contract is stale. Run node scripts/generate-serments-reforged-mechanics.js.');
} else fs.writeFileSync(output, serialized);
console.log('Mechanics contract: ' + entries.length + ' oaths, 48 stable abilities; exact formulas verified at 12 levels through 100.');
