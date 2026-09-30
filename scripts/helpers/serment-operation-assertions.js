'use strict';

const assert = require('node:assert/strict');

// Check the public DOM against the independently generated rule contract. A staff
// description override deliberately falls back to its exact authored paragraph.
async function assertOperationCards(container, tier, level) {
  const rules = tier.combatRules;
  const operations = rules && tier.desc === rules.effect ? rules.operations || [] : [];
  const cards = container.locator('.np-oath-operation');
  assert.equal(await cards.count(), operations.length, 'One card per unlocked operation.');
  if (!operations.length) {
    assert.equal(await container.locator(':scope > p').textContent(), tier.desc);
    return;
  }
  const effectiveLevel = Math.max(level, tier.niv);
  for (const [index, operation] of operations.entries()) {
    const card = cards.nth(index);
    assert.equal(await card.locator('strong').textContent(), operation.label);
    const costs = await card.locator('span').textContent();
    assert.match(costs, new RegExp('^' + (operation.cost.actions || 1) + ' actions?(?: · |$)'));
    for (const [key, unit] of [['ep', 'EP'], ['em', 'EM'], ['pv', 'PV']]) {
      if (operation.cost[key]) assert.match(costs, new RegExp('(?:^| · )' + operation.cost[key] + ' ' + unit + '(?: · |$)'));
      else assert.ok(!costs.includes(' ' + unit), 'No absent resource in the cost of ' + operation.label);
    }
    const effect = await card.locator('p').textContent();
    assert.ok(effect.trim(), operation.label + ' has its own effect.');
    assert.ok(!effect.includes('+ N'), operation.label + ' evaluates the character level.');
    for (const match of String(operation.rule).matchAll(/\((-?\d+) \+ N\)/g)) {
      assert.ok(effect.includes(String(Number(match[1]) + effectiveLevel)), operation.label + ' uses the explored level, not just its unlock level.');
    }
    // Apart from the cost now represented above, every part of the operation
    // remains present, including conditions, durations and counters.
    const numericalRule = String(operation.rule).replace(/\((-?\d+) \+ N\)/g, (_, base) => String(Number(base) + effectiveLevel));
    const body = numericalRule.replace(/^\d+ actions?(?:\s*(?:,|et|\/)\s*\d+\s*(?:EP|EM|PV))*/, '').trim().replace(/^[.,;]\s*/, '').replace(/^et\s+/, 'Consomme ');
    assert.equal(effect, body, operation.label + ' preserves its complete rule.');
  }
}

module.exports = { assertOperationCards };
