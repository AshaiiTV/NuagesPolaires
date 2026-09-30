'use strict';

const assert = require('node:assert/strict');

// Evaluate the published arithmetic contract directly: do not call the UI renderer
// or combat formatter here, since both surfaces could share the same regression.
function ruleAtLevel(operation, level) {
  if (Array.isArray(operation.ruleParts)) {
    return operation.ruleParts.map(part => {
      if (typeof part === 'string') return part;
      assert.ok(part && Number.isFinite(part.base) && Number.isFinite(part.perLevel), 'Each numeric rule part declares its affine coefficients.');
      const value = (part.base + part.perLevel * level) / (part.divisor || 1);
      return String(part.round === 'ceil' ? Math.ceil(value) : value);
    }).join('');
  }
  return String(operation.ruleFormula || operation.rule || '').replace(/\((-?\d+) \+ N\)/g, (_, base) => String(Number(base) + level));
}

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
  assert.equal(await cards.count(), operations.length, 'One card per operation, independent of character-level thresholds.');
  if (!operations.length) {
    const expectedText = rules && tier.desc === rules.effect && Array.isArray(rules.operations)
      ? rules.operations.map(operation => ruleAtLevel(operation, Number(level))).join(' ')
      : tier.desc;
    assert.equal(await container.locator(':scope > p').textContent(), expectedText);
    return;
  }
  const effectiveLevel = Number(level);
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
    const effect = await card.locator(isInspector ? '.oath-action-effect' : ':scope > p').textContent();
    assert.ok(effect.trim(), operation.label + ' has its own effect.');
    assert.ok(!effect.includes('+ N'), operation.label + ' evaluates the character level.');
    // Preserve all conditions, durations and counters in addition to scaled values.
    const numericalRule = ruleAtLevel(operation, effectiveLevel);
    const body = numericalRule.replace(/^\d+ actions?(?:\s*(?:,|et|\/)\s*\d+\s*(?:EP|EM|PV))*\.\s*/, '').trim();
    assert.equal(effect, body, operation.label + ' preserves its complete rule.');
  }
}

module.exports = { assertOperationCards, ruleAtLevel };
