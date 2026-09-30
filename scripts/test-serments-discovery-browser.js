'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createLocalApp } = require('./helpers/local-app');
const expansion = require('../assets/js/serments-reforged-data');

// Browser exploration against isolated PostgreSQL. This scenario never connects
// to production and must leave character data exactly as it found it.
(async () => {
  const app = await createLocalApp();
  const output = path.resolve(process.env.NP_TEST_OUTPUT || 'test-results/serments-discovery');
  const inspectorOutput = path.resolve('test-results/serments-inspector');
  fs.mkdirSync(output, { recursive: true });
  fs.mkdirSync(inspectorOutput, { recursive: true });
  const errors = [];
  const observations = [];
  let browser, page;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const session = await app.cookie('admin');
    await context.addCookies([{ name: 'np_session', value: session.slice('np_session='.length), url: app.origin, httpOnly: true, sameSite: 'Strict' }]);
    page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => errors.push(error.stack || error.message));
    await page.route('https://**/*', route => route.abort());
    await page.goto(app.origin, { waitUntil: 'load' });
    await page.waitForFunction(() => window.CU && (CU.pseudo || CU.name) === 'Admin');
    await page.waitForFunction(() => !document.getElementById('login-transition-overlay')?.classList.contains('active'));
    await page.evaluate(() => switchDropTab('serments', null, ''));
    const atlas = page.locator('#serments-grid.oath-atlas');
    await atlas.waitFor({ state: 'visible' });
    const before = await app.read('players');
    const requestStart = app.requests.length;
    const pugiliste = expansion.definitions.Pugiliste;
    await page.evaluate(() => NPSermentsAtlas.focus('Pugiliste'));

    const node = (branch, tier) => atlas.locator('.oath-node[data-node-branch="' + branch + '"][data-node-tier="' + tier + '"]');
    const inspector = () => atlas.locator('.oath-inspector');
    async function setLevel(level) {
      await atlas.locator('#oath-level').evaluate((element, value) => {
        element.value = String(value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }, level);
      assert.equal(await atlas.locator('#oath-level').inputValue(), String(level));
    }
    async function assertNoOverflow(label) {
      const widths = await page.evaluate(() => ({
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
        atlas: document.querySelector('.oath-atlas').getBoundingClientRect().width
      }));
      assert.ok(widths.document <= widths.viewport + 1, label + ': débordement horizontal ' + JSON.stringify(widths));
      assert.ok(widths.atlas <= widths.viewport + 1, label + ': la forge dépasse le viewport ' + JSON.stringify(widths));
    }
    function assertEffectHidden(text, tier, label, hideName = true) {
      assert.ok(!text.includes(tier.desc), label + ': la description doit rester masquée.');
      if (tier.cout) assert.ok(!text.includes(tier.cout), label + ': le coût doit rester masqué.');
      if (tier.manifestation) assert.ok(!text.includes(tier.manifestation), label + ': la manifestation doit rester masquée.');
      if (hideName && tier.nom) assert.ok(!text.includes(tier.nom), label + ': le nom de la capacité doit rester masqué.');
    }
    async function assertInspectorActions(branch, tierIndex) {
      const tier = branch.paliers[tierIndex];
      const operations = branch.combatRules.tiers.find(entry => entry.level === tier.niv).operations;
      const cards = inspector().locator('.oath-ability-action');
      assert.deepEqual(await cards.locator('h5').allTextContents(), operations.map(operation => operation.label), 'Chaque opération possède sa propre carte nommée.');
      for (let index = 0; index < operations.length; index++) {
        assert.ok((await cards.nth(index).locator('.oath-action-effect').textContent()).trim(), 'Chaque action conserve son effet.');
        assert.ok(await cards.nth(index).locator('.oath-action-cost span').count(), 'Chaque action présente son propre coût.');
      }
    }

    assert.equal(await atlas.locator('[data-discovery="on"]').getAttribute('aria-pressed'), 'true', 'La découverte est active à l’ouverture.');
    assert.equal(await atlas.locator('.oath-list-item').count(), 34, 'Les entrées masquées par le staff restent exclues du catalogue.');
    assert.equal(await atlas.locator('.oath-node').count(), 8);
    for (const branch of [0, 1]) {
      for (const [tier, color] of ['jade', 'azure', 'violet', 'gold'].entries()) {
        assert.equal(await node(branch, tier).getAttribute('data-tier-color'), color, 'Chaque étape possède son identité chromatique.');
      }
    }

    await setLevel(1);
    assert.equal(await atlas.locator('.oath-node.is-locked').count(), 8);
    assert.equal(await atlas.locator('.oath-node.is-sealed').count(), 6);
    assert.equal(await atlas.locator('.oath-node.is-next').count(), 2);
    assert.equal(await atlas.locator('.oath-node.is-current').count(), 0);
    assert.deepEqual(await atlas.locator('.oath-node.is-sealed .oath-node-title').allTextContents(), Array(6).fill('???'));
    assert.equal(await atlas.locator('.oath-evo-btn[data-evolution="Cestuaire"]').evaluate(element => element.classList.contains('is-locked')), true);
    await node(0, 3).click();
    assert.equal(await inspector().evaluate(element => element.classList.contains('is-locked')), true);
    assert.equal(await inspector().getAttribute('data-tier-color'), 'gold');
    assert.equal(await inspector().locator('.oath-gate').count(), 1);
    assertEffectHidden(await inspector().textContent(), pugiliste.branches[0].paliers[3], 'Apogée scellée');
    assert.equal(await inspector().locator('.oath-inspector-effect').count(), 0, 'Une capacité scellée ne laisse pas son effet dans le DOM de l’inspecteur.');
    await node(0, 0).click();
    assert.equal(await node(0, 0).locator('.oath-node-title').textContent(), pugiliste.branches[0].paliers[0].manifestation ? pugiliste.branches[0].paliers[0].nom : 'Éveil');
    assertEffectHidden(await inspector().textContent(), pugiliste.branches[0].paliers[0], 'Prochain éveil');
    assert.equal(await inspector().locator('.oath-inspector-effect').count(), 0);
    await atlas.locator('[data-oath-view="compare"]').click();
    for (const [index, branch] of pugiliste.branches.entries()) {
      const card = atlas.locator('.oath-compare-card').nth(index);
      assertEffectHidden(await card.textContent(), branch.paliers[0], 'Comparaison verrouillée ' + index, branch.paliers[0].nom !== branch.nom);
      assert.equal(await card.locator('.oath-inspector-effect').count(), 0);
    }
    await atlas.locator('.oath-compare-card').first().locator('[data-preview-tier]').click();
    assert.equal(await atlas.locator('#oath-level').inputValue(), '2');
    assert.equal(await page.evaluate(() => document.activeElement?.matches('.oath-compare-card h3')), true, 'Simuler un palier en comparaison conserve le focus dans la vue visible.');
    await setLevel(1);
    await atlas.locator('[data-oath-view="tree"]').click();
    observations.push('Découverte niveau 1 : deux prochains éveils et six mystères scellés ; capacités masquées dans les inspecteurs et effets absents des comparaisons verrouillées.');

    await setLevel(5);
    assert.equal(await atlas.locator('.oath-node.is-unlocked').count(), 4);
    assert.equal(await atlas.locator('.oath-node.is-next').count(), 2);
    assert.equal(await atlas.locator('.oath-node.is-sealed').count(), 2);
    assert.equal(await atlas.locator('.oath-node.is-current').count(), 1);
    assert.equal(await atlas.locator('.oath-node.is-current').getAttribute('data-required-level'), '5');
    const toast = atlas.locator('.oath-unlock-toast[role="status"]');
    assert.equal(await toast.count(), 1);
    assert.ok((await toast.textContent()).trim(), 'Le franchissement de paliers annonce la progression.');
    await node(0, 1).click();
    assert.equal(await inspector().getAttribute('data-tier-color'), 'azure');
    await assertInspectorActions(pugiliste.branches[0], 1);
    await atlas.locator('[data-oath-view="compare"]').click();
    for (const [index, branch] of pugiliste.branches.entries()) {
      assert.equal(await atlas.locator('.oath-compare-card').nth(index).locator('.oath-inspector-effect p').textContent(), branch.paliers[1].desc);
    }
    await atlas.locator('[data-oath-view="tree"]').click();
    const slider = atlas.locator('#oath-level');
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await slider.inputValue(), '6');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'oath-level', 'La progression conserve le focus du curseur.');
    await setLevel(5);
    await node(0, 3).click();
    await inspector().locator('[data-preview-tier]').click();
    assert.equal(await atlas.locator('#oath-level').inputValue(), '10', 'L’aperçu projette le niveau requis sans attribuer la capacité.');
    assert.equal(await atlas.locator('.oath-node.is-unlocked').count(), 8);
    assert.equal(await atlas.locator('.oath-node.is-current').count(), 1);
    assert.equal(await atlas.locator('.oath-node.is-legacy').count(), 6, 'Les six paliers antérieurs sont remplacés.');
    await assertInspectorActions(pugiliste.branches[0], 3);
    observations.push('Progression 1 → 5 → 10 : couleurs par étape, annonce de déblocage, aperçu au niveau requis et un seul palier applicable.');

    await atlas.locator('[data-own-level]').click();
    assert.equal(await atlas.locator('#oath-level').inputValue(), '1', 'Mon niveau reprend le niveau du personnage lié sans le modifier.');
    await node(1, 3).click();
    await inspector().locator('[data-reveal-all]').click();
    assert.equal(await atlas.locator('[data-discovery="off"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await atlas.locator('#oath-level').inputValue(), '1', 'Consulter le Codex ne simule pas une montée de niveau.');
    assert.equal(await atlas.locator('.oath-node.is-locked').count(), 8, 'Le Codex révèle les informations sans rendre les capacités applicables.');
    await assertInspectorActions(pugiliste.branches[1], 3);
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async text => { window.__discoveryCopiedText = text; } }
    }));
    await inspector().locator('[data-copy-build]').click();
    await page.waitForFunction(() => !!window.__discoveryCopiedText);
    assert.ok((await page.evaluate(() => window.__discoveryCopiedText)).includes(pugiliste.branches[1].paliers[3].desc));
    await atlas.locator('[data-discovery="on"]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await atlas.locator('[data-discovery="on"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-discovery')), 'on', 'Changer de mode au clavier conserve le focus.');
    assertEffectHidden(await inspector().textContent(), pugiliste.branches[1].paliers[3], 'Retour en découverte');
    await atlas.locator('[data-discovery="off"]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-discovery')), 'off');
    assert.equal(await atlas.locator('[data-discovery="off"]').getAttribute('aria-pressed'), 'true');
    await atlas.locator('[data-discovery="on"]').click();
    observations.push('Codex et retour en découverte : masquage réversible, niveau conservé, copie autorisée des règles consultées et focus clavier maintenu.');

    await atlas.locator('.oath-evo-btn[data-evolution="Cestuaire"]').click();
    assert.equal(await atlas.locator('.oath-hero-title').textContent(), 'Cestuaire');
    assert.equal(await atlas.locator('#oath-level').inputValue(), '1');
    assert.equal(await atlas.locator('.oath-node.is-locked').count(), 8);
    assert.match(await atlas.locator('.oath-root').textContent(), /NIVEAU 10/);
    await atlas.locator('.oath-evo-btn[data-evolution="Pugiliste"]').click();
    await setLevel(5);
    await assertNoOverflow('Bureau');
    await page.screenshot({ path: path.join(output, 'discovery-desktop.png'), animations: 'disabled' });
    await page.setViewportSize({ width: 390, height: 844 });
    await assertNoOverflow('Mobile');
    await setLevel(1);
    await atlas.locator('[data-oath-view="compare"]').click();
    await atlas.locator('.oath-compare-card').first().locator('[data-preview-tier]').click();
    assert.equal(await page.evaluate(() => document.activeElement?.matches('.oath-compare-card h3')), true, 'Sur mobile, la simulation en comparaison mène au titre de la voie visible.');
    await atlas.locator('[data-oath-view="tree"]').click();
    await setLevel(5);
    await node(0, 3).click();
    assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'H3', 'Sur mobile, inspecter une rune mène au titre de sa fiche.');
    await page.screenshot({ path: path.join(output, 'discovery-mobile.png'), animations: 'disabled' });

    // Reproduce the dense panel reported by the user. The three operations
    // must be readable independently, with no cost duplicated in the effect.
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => NPSermentsAtlas.focus('Arbalétrier'));
    await setLevel(5);
    await node(0, 1).click();
    assert.equal(await inspector().locator('h3').textContent(), 'Le cran tenu');
    const arbaletrier = expansion.definitions['Arbalétrier'];
    await assertInspectorActions(arbaletrier.branches[0], 1);
    const actions = inspector().locator('.oath-ability-action');
    assert.equal(await actions.count(), 3);
    assert.deepEqual(await actions.nth(0).locator('.oath-action-cost span').allTextContents(), ['1 action', '6 EP']);
    for (const index of [1, 2]) {
      assert.deepEqual(await actions.nth(index).locator('.oath-action-cost span').allTextContents(), ['1 action', '4 EP']);
    }
    const effects = await actions.locator('.oath-action-effect').allTextContents();
    assert.match(effects[0], /Charge 1 carreau/);
    assert.match(effects[1], /29 dégâts/);
    assert.match(effects[1], /carreau consommé/);
    assert.match(effects[2], /Prochain tir \+12 dégâts/);
    assert.match(effects[2], /défense annule cette surtension/);
    for (const effect of effects) assert.doesNotMatch(effect, /1 action|[46] EP|24 \+ N/, 'Les coûts et la formule non calculée ne se répètent pas dans les effets.');
    const flavor = inspector().locator('details.oath-inspector-flavor');
    assert.equal(await flavor.locator('summary').textContent(), 'Imaginaire & incarnation');
    assert.equal(await flavor.getAttribute('open'), null, 'L’imaginaire est replié pour laisser les règles immédiatement lisibles.');
    assert.ok((await flavor.textContent()).includes(arbaletrier.branches[0].paliers[1].manifestation), 'Le récit reste disponible dans le panneau.');
    await assertNoOverflow('Inspecteur Arbalétrier bureau');
    await inspector().screenshot({ path: path.join(inspectorOutput, 'arbaletrier-desktop.png'), animations: 'disabled' });
    await atlas.locator('.oath-tree-grid').screenshot({ path: path.join(inspectorOutput, 'arbaletrier-tree-1440.png'), animations: 'disabled' });
    const desktopPlacement = await atlas.locator('.oath-tree-grid').evaluate(element => {
      const tree = element.querySelector('.oath-tree').getBoundingClientRect();
      const panel = element.querySelector('.oath-inspector').getBoundingClientRect();
      return { treeWidth: Math.round(tree.width), inspectorWidth: Math.round(panel.width), layout: panel.left >= tree.right ? 'latéral' : 'sous l’arbre' };
    });
    await flavor.locator('summary').focus();
    await page.keyboard.press('Enter');
    assert.equal(await flavor.getAttribute('open'), '', 'Le récit reste accessible au clavier.');
    await page.keyboard.press('Enter');
    await flavor.locator('summary').evaluate(element => element.blur());
    await page.setViewportSize({ width: 390, height: 844 });
    await assertNoOverflow('Inspecteur Arbalétrier mobile');
    await inspector().screenshot({ path: path.join(inspectorOutput, 'arbaletrier-mobile.png'), animations: 'disabled' });
    await page.setViewportSize({ width: 320, height: 740 });
    await assertNoOverflow('Inspecteur Arbalétrier petit mobile');
    await inspector().screenshot({ path: path.join(inspectorOutput, 'arbaletrier-mobile-320.png'), animations: 'disabled' });
    await page.setViewportSize({ width: 1280, height: 900 });
    await node(0, 1).click();
    assert.equal(await page.evaluate(() => document.activeElement?.matches('.oath-inspector h3')), true, 'Au bureau, inspecter une rune mène au panneau quand il se trouve sous l’arbre.');
    await assertNoOverflow('Inspecteur Arbalétrier petit bureau');
    await atlas.locator('.oath-tree-grid').screenshot({ path: path.join(inspectorOutput, 'arbaletrier-tree-1280.png'), animations: 'disabled' });
    await page.setViewportSize({ width: 390, height: 844 });

    // Staff prose takes precedence over stale structured catalogue rules.
    await page.evaluate(() => {
      window.__originalInspectorCatalogue = window.getAllSD;
      window.getAllSD = function () {
        const catalogue = window.__originalInspectorCatalogue();
        const definition = JSON.parse(JSON.stringify(catalogue['Arbalétrier']));
        const tier = definition.branches[0].paliers[1];
        tier.desc = 'Règle personnalisée du staff : le carreau trace une balise bleue.';
        tier.cout = '2 actions / 9 EP';
        return Object.assign({}, catalogue, { 'Arbalétrier': definition });
      };
      NPSermentsAtlas.focus('Arbalétrier');
    });
    await node(0, 1).click();
    assert.equal(await inspector().locator('.oath-ability-action').count(), 0, 'Les anciennes opérations ne remplacent pas une description staff.');
    assert.ok((await inspector().locator('.oath-inspector-effect').textContent()).includes('Règle personnalisée du staff : le carreau trace une balise bleue.'));
    assert.ok((await inspector().textContent()).includes('2 actions / 9 EP'), 'Le coût personnalisé reste visible.');
    assert.doesNotMatch(await inspector().locator('.oath-inspector-effect').textContent(), /Armer l’arbalète|Tirer un carreau|Prochain tir \+12|29 dégâts/);
    await page.evaluate(() => {
      window.getAllSD = function () {
        const catalogue = window.__originalInspectorCatalogue();
        const definition = JSON.parse(JSON.stringify(catalogue['Arbalétrier']));
        definition.branches[0].paliers[1].cout = '2 actions / 9 EP';
        return Object.assign({}, catalogue, { 'Arbalétrier': definition });
      };
      NPSermentsAtlas.focus('Arbalétrier');
    });
    await node(0, 1).click();
    assert.equal(await inspector().locator('.oath-ability-action').count(), 0, 'Un coût staff modifié seul interdit aussi les anciennes cartes de coûts.');
    assert.ok((await inspector().textContent()).includes('2 actions / 9 EP'));
    assert.ok((await inspector().locator('.oath-inspector-effect').textContent()).includes(arbaletrier.branches[0].paliers[1].desc), 'Le texte staff reste intact quand seul son coût est modifié.');
    await page.evaluate(() => {
      window.getAllSD = window.__originalInspectorCatalogue;
      delete window.__originalInspectorCatalogue;
    });
    for (const [name, operation, constraint] of [['Alchimiste', 'brew', /1 des 3 fioles du combat/], ['Prismancien', 'shoot', /une facette/], ['Distillateur', 'mother', /UNE fois par combat/]]) {
      await page.evaluate(name => NPSermentsAtlas.focus(name), name);
      await setLevel(10);
      await node(0, 0).click();
      assert.match(await inspector().locator('.oath-ability-action[data-operation="' + operation + '"] .oath-action-effect').textContent(), constraint, 'La séparation des coûts conserve les consommables et limites : ' + name);
    }
    observations.push('Inspecteur Arbalétrier niveau 5 : trois actions avec coûts séparés, 29 dégâts calculés, récit replié et accessible au clavier ; aucune ancienne opération ne remplace une description ou un coût staff. Consommables et limite par combat conservés. Captures 1440/1280/390/320px sans débordement ; position 1440px : ' + JSON.stringify(desktopPlacement) + '.');

    // Staff definitions can have more branches or milestones than the four
    // standard stages. Inject a browser-only fixture, preserving its live API.
    await page.evaluate(() => {
      window.__originalDiscoveryCatalogue = window.getAllSD;
      const definition = {
        cat: 'magie', level: 'basic', arme: 'Arme de test', pvN: 1, epN: 1, emN: 1, dmg: 1,
        branches: Array.from({ length: 3 }, (_, branch) => ({
          nom: 'Voie de test ' + branch,
          paliers: [2, 4, 6, 8, 25].map((niv, tier) => ({ niv, nom: 'Capacité de test ' + branch + '/' + tier, cout: '1 EP', desc: 'Effet de test ' + branch + '/' + tier }))
        }))
      };
      window.getAllSD = function () {
        return Object.assign({}, window.__originalDiscoveryCatalogue(), {
          'QA parcours personnalisé': definition,
          'QA serment secret du staff': Object.assign({}, definition, { hidden: true })
        });
      };
      NPSermentsAtlas.focus('QA parcours personnalisé');
    });
    assert.equal(await atlas.locator('.oath-map.is-linear').count(), 1, 'Les structures staff utilisent la disposition linéaire adaptée.');
    assert.equal(await atlas.locator('.oath-path').count(), 3);
    assert.equal(await atlas.locator('.oath-node').count(), 15);
    assert.equal(await atlas.locator('#oath-level').getAttribute('max'), '25', 'Le curseur respecte aussi les niveaux définis par le staff au-delà de 20.');
    assert.equal(await atlas.locator('.oath-list-item[data-serment="QA serment secret du staff"]').count(), 0);
    await setLevel(5);
    assert.equal(await atlas.locator('.oath-node.is-unlocked').count(), 6);
    assert.equal(await atlas.locator('.oath-node.is-next').count(), 3);
    assert.equal(await atlas.locator('.oath-node.is-sealed').count(), 6);
    await node(2, 4).click();
    assert.ok(!(await inspector().textContent()).includes('Effet de test 2/4'));
    await inspector().locator('[data-preview-tier]').click();
    assert.equal(await atlas.locator('#oath-level').inputValue(), '25');
    assert.equal(await inspector().locator('.oath-inspector-effect p').textContent(), 'Effet de test 2/4');
    await assertNoOverflow('Mobile avec trois voies et cinq paliers');
    await page.evaluate(() => {
      window.getAllSD = window.__originalDiscoveryCatalogue;
      delete window.__originalDiscoveryCatalogue;
      NPSermentsAtlas.focus('Pugiliste');
    });
    observations.push('Évolutions explorables avant attribution ; structures staff à trois voies et cinq paliers jusqu’au niveau 25 accessibles sur mobile, entrées staff cachées exclues.');

    assert.deepEqual(await app.read('players'), before, 'Découverte, aperçu, Codex, évolution et copie ne modifient aucun personnage.');
    assert.deepEqual(app.requests.slice(requestStart).filter(request => request.name === 'db' && request.key === 'players' && request.action !== 'get'), [], 'Aucune écriture de personnage n’est envoyée.');
    assert.deepEqual(errors, [], 'Aucune erreur navigateur.');
    assert.deepEqual(app.errors, [], 'Aucune erreur de la fixture serveur.');
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ ok: true, observations }, null, 2));
    console.log('Serments discovery browser: OK');
    observations.forEach(observation => console.log(' - ' + observation));
  } catch (error) {
    if (page) await page.screenshot({ path: path.join(output, 'failure.png'), animations: 'disabled' }).catch(() => {});
    throw error;
  } finally {
    if (browser) await browser.close();
    await app.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
