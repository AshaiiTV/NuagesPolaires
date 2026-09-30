'use strict';

const assert = require('node:assert/strict');

// Check the public DOM against the independently generated rule contract. A staff
// description override deliberately falls back to its exact authored paragraph.
async function assertOperationCards(container, tier, level) {
  const rules = tier.combatRules;
  const baseCost = rules?.cost || {};
  const originalCosts = [(baseCost.actions || 1) + ' action' + (baseCost.actions > 1 ? 's' : '')];
  for (const [key, unit] of [['ep', 'EP'], ['em', 'EM'], ['pv', 'PV']]) {
    if (baseCost[key]) originalCosts.push(baseCost[key] + ' ' + unit);
  }
  const staffCost = tier.cout != null && tier.cout !== originalCosts.join(' / ');
  const operations = rules && tier.desc === rules.effect && !staffCost ? rules.operations || [] : [];
  const cards = container.locator('.np-oath-operation,.oath-ability-action');
  assert.equal(await cards.count(), operations.length, 'One card per unlocked operation.');
  if (!operations.length) {
    assert.equal(await container.locator(':scope > p').textContent(), tier.desc);
    return;
  }
  const effectiveLevel = Math.max(level, tier.niv);
  for (const [index, operation] of operations.entries()) {
    const card = cards.nth(index);
    const isInspector = await card.evaluate(element => element.classList.contains('oath-ability-action'));
    assert.equal(await card.locator(isInspector ? 'h5' : 'strong').textContent(), operation.label);
    const costs = isInspector ? (await card.locator('.oath-action-cost span').allTextContents()).join(' · ') : await card.locator('span').textContent();
    assert.match(costs, new RegExp('^' + (operation.cost.actions || 1) + ' actions?(?: · |$)'));
    for (const [key, unit] of [['ep', 'EP'], ['em', 'EM'], ['pv', 'PV']]) {
      if (operation.cost[key]) assert.match(costs, new RegExp('(?:^| · )' + operation.cost[key] + ' ' + unit + '(?: · |$)'));
      else assert.ok(!costs.includes(' ' + unit), 'No absent resource in the cost of ' + operation.label);
    }
    const effect = await card.locator('p').textContent();
    assert.ok(effect.trim(), operation.label + ' has its own effect.');
    assert.ok(!effect.includes('+ N'), operation.label + ' evaluates the character level.');
    const rule = isInspector ? operation.ruleFormula || operation.rule : operation.rule;
    for (const match of String(rule).matchAll(/\((-?\d+) \+ N\)/g)) {
      assert.ok(effect.includes(String(Number(match[1]) + effectiveLevel)), operation.label + ' uses the explored level, not just its unlock level.');
    }
    // Apart from the cost now represented above, every part of the operation
    // remains present, including conditions, durations and counters.
    const numericalRule = String(rule).replace(/\((-?\d+) \+ N\)/g, (_, base) => String(Number(base) + effectiveLevel));
    const body = numericalRule.replace(/^\d+ actions?(?:\s*(?:,|et|\/)\s*\d+\s*(?:EP|EM|PV))*/, '').trim().replace(/^[.,;]\s*/, '').replace(/^et\s+/, 'Consomme ');
    assert.equal(effect, body, operation.label + ' preserves its complete rule.');
  }
}

module.exports = { assertOperationCards };
