'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createLocalApp } = require('./helpers/local-app');
const { assertOperationCards } = require('./helpers/serment-operation-assertions');
const expansion = require('../assets/js/serments-reforged-data');

// Browser exploration against isolated PostgreSQL. This scenario never connects
// to production and must leave character data exactly as it found it.
(async () => {
  const app = await createLocalApp();
  const output = path.resolve(process.env.NP_TEST_OUTPUT || 'test-results/serments-discovery');
  const inspectorOutput = path.resolve('test-results/forge-readable');
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
    page.setDefaultNavigationTimeout(60000);
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
      await atlas.locator('#oath-level').fill(String(level));
      assert.equal(await atlas.locator('#oath-level').inputValue(), String(level));
    }
    async function setDisclosure(selector, open) {
      const disclosure = atlas.locator(selector);
      if ((await disclosure.getAttribute('open') !== null) !== open) await disclosure.locator(':scope > summary').click();
      assert.equal(await disclosure.getAttribute('open') !== null, open);
    }
    async function setDiscovery(enabled) {
      await setDisclosure('.oath-reading-options', true);
      await atlas.locator('#oath-hide-future').setChecked(enabled);
      assert.equal(await atlas.locator('#oath-hide-future').isChecked(), enabled);
    }
    async function chooseBranch(index) {
      await atlas.locator('[data-choose-branch="' + index + '"]').click();
      assert.equal(await atlas.locator('.oath-path-heading[aria-pressed="true"]').getAttribute('data-choose-branch'), String(index));
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
    async function assertInspectorActions(branch, tierIndex, level) {
      if (level == null) level = Number(await atlas.locator('#oath-level').inputValue());
      const tier = branch.paliers[tierIndex];
      const operations = branch.combatRules.tiers.find(entry => entry.level === tier.niv).operations;
      const cards = inspector().locator('.oath-ability-action');
      assert.deepEqual(await cards.locator('h5').allTextContents(), operations.map(operation => operation.label), 'Chaque opération possède sa propre carte nommée.');
      await assertOperationCards(inspector().locator('.oath-inspector-effect'), tier, level);
    }

    assert.equal(await atlas.locator('#oath-hide-future').isChecked(), false, 'Les règles publiques sont consultables dès l’ouverture.');
    assert.equal(await atlas.locator('#oath-level').getAttribute('type'), 'number');
    assert.equal(await atlas.locator('#oath-level').inputValue(), '1', 'L’ouverture reprend le niveau du personnage lié.');
    assert.equal(await atlas.locator('.oath-list-item').count(), 34, 'Les entrées masquées par le staff restent exclues du catalogue.');
    assert.equal(await atlas.locator('.oath-path').count(), 1, 'Une seule voie est présentée à la fois.');
    assert.equal(await atlas.locator('.oath-node').count(), 4);
    assert.equal(await atlas.locator('.oath-path-heading').count(), 2);
    for (const branch of [0, 1]) {
      await chooseBranch(branch);
      for (const [tier, color] of ['jade', 'azure', 'violet', 'gold'].entries()) {
        assert.equal(await node(branch, tier).getAttribute('data-tier-color'), color, 'Chaque étape possède son identité chromatique.');
      }
    }
    await chooseBranch(0);
    assert.equal(await atlas.locator('.oath-node.is-locked').count(), 4);
    assert.equal(await atlas.locator('.oath-node.is-sealed').count(), 0);
    await node(0, 3).click();
    await assertInspectorActions(pugiliste.branches[0], 3, 1);
    assert.ok(await atlas.locator('.oath-play-guide').count(), 'Le guide est accessible avant le premier niveau en lecture complète.');
    await setDiscovery(true);
    await setLevel(1);
    assert.equal(await atlas.locator('.oath-node.is-locked').count(), 4);
    assert.equal(await atlas.locator('.oath-node.is-sealed').count(), 3);
    assert.equal(await atlas.locator('.oath-node.is-current').count(), 0);
    assert.deepEqual(await atlas.locator('.oath-node.is-sealed .oath-node-title').allTextContents(), Array(3).fill('???'));
    assert.equal(await atlas.locator('.oath-evo-btn[data-evolution="Cestuaire"]').evaluate(element => element.classList.contains('is-locked')), true);
    await node(0, 3).click();
    assert.equal(await inspector().evaluate(element => element.classList.contains('is-locked')), true);
    assert.equal(await inspector().getAttribute('data-tier-color'), 'gold');
    assert.equal(await inspector().locator('.oath-gate').count(), 1);
    assertEffectHidden(await inspector().textContent(), pugiliste.branches[0].paliers[3], 'Apogée scellée');
    assert.equal(await inspector().locator('.oath-inspector-effect').count(), 0, 'Une capacité scellée ne laisse pas son effet dans le DOM de l’inspecteur.');
    assert.equal(await inspector().locator('.np-oath-operation,.oath-ability-action,.oath-tier-story,.oath-inspector-flavor').count(), 0, 'Cartes, manifestation et narration de voie restent absentes du DOM verrouillé.');
    assert.equal(await atlas.locator('.oath-play-guide').count(), 0, 'Un guide ne révèle pas les gestes d’une branche dont aucun palier n’est débloqué.');
    await node(0, 0).click();
    assert.equal(await node(0, 0).locator('.oath-node-title').textContent(), pugiliste.branches[0].paliers[0].manifestation ? pugiliste.branches[0].paliers[0].nom : 'Éveil');
    assertEffectHidden(await inspector().textContent(), pugiliste.branches[0].paliers[0], 'Prochain éveil', false);
    assert.equal(await inspector().locator('.oath-inspector-effect').count(), 0);
    await setDisclosure('.oath-comparison', true);
    for (const [index, branch] of pugiliste.branches.entries()) {
      const card = atlas.locator('.oath-compare-card').nth(index);
      assertEffectHidden(await card.textContent(), branch.paliers[0], 'Comparaison verrouillée ' + index, branch.paliers[0].nom !== branch.nom);
      assert.equal(await card.locator('.oath-inspector-effect').count(), 0);
      assert.equal(await card.locator('.oath-play-guide,.np-oath-operation,.oath-ability-action').count(), 0, 'La comparaison verrouillée ne révèle ni guide ni geste.');
    }
    await atlas.locator('.oath-compare-card').first().locator('[data-preview-tier]').click();
    assert.equal(await atlas.locator('#oath-level').inputValue(), '2');
    assert.equal(await page.evaluate(() => document.activeElement?.matches('.oath-inspector h3')), true, 'Simuler un palier mène à un titre de capacité ou de voie.');
    await setLevel(1);
    await setDisclosure('.oath-comparison', false);
    observations.push('Lecture complète par défaut ; option de découverte niveau 1 : un prochain éveil et trois mystères scellés, sans effets ni coûts dans le DOM verrouillé.');

    await setLevel(5);
    assert.equal(await atlas.locator('.oath-node.is-unlocked').count(), 2);
    assert.equal(await atlas.locator('.oath-node.is-sealed').count(), 1);
    assert.equal(await atlas.locator('.oath-node.is-current').count(), 1);
    assert.equal(await atlas.locator('.oath-node.is-current').getAttribute('data-required-level'), '5');
    await node(0, 1).click();
    assert.equal(await inspector().getAttribute('data-tier-color'), 'azure');
    await assertInspectorActions(pugiliste.branches[0], 1, 5);
    await setDisclosure('.oath-comparison', true);
    for (const [index, branch] of pugiliste.branches.entries()) {
      await assertOperationCards(atlas.locator('.oath-compare-card').nth(index).locator('.oath-inspector-effect'), branch.paliers[1], 5);
    }
    await setDisclosure('.oath-comparison', false);
    const levelInput = atlas.locator('#oath-level');
    await levelInput.focus();
    await page.keyboard.press('ArrowUp');
    assert.equal(await levelInput.inputValue(), '6');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'oath-level', 'Changer le niveau au clavier conserve le focus.');
    await assertInspectorActions(pugiliste.branches[0], 1, 6);
    assert.ok((await inspector().locator('.oath-ability-action').first().textContent()).includes('24 dégâts'), 'Le palier de niveau 5 affiche bien 18 + 6 au niveau intermédiaire 6.');
    await setLevel(35);
    await assertInspectorActions(pugiliste.branches[0], 3, 35);
    await setLevel(5);
    await node(0, 3).click();
    await inspector().locator('[data-preview-tier]').click();
    assert.equal(await atlas.locator('#oath-level').inputValue(), '10', 'L’aperçu projette le niveau requis sans attribuer la capacité.');
    assert.equal(await atlas.locator('.oath-node.is-unlocked').count(), 4);
    assert.equal(await atlas.locator('.oath-node.is-current').count(), 1);
    assert.equal(await atlas.locator('.oath-node.is-legacy').count(), 3, 'Les trois paliers antérieurs de la voie sont remplacés.');
    await assertInspectorActions(pugiliste.branches[0], 3, 10);
    observations.push('Progression 1 → 5 → 10 : couleurs par étape, aperçu au niveau requis et un seul palier applicable ; champ niveau utilisable au clavier sans perte de focus.');

    await atlas.locator('[data-own-level]').click();
    assert.equal(await atlas.locator('#oath-level').inputValue(), '1', 'Mon niveau reprend le niveau du personnage lié sans le modifier.');
    await chooseBranch(1);
    await node(1, 3).click();
    await inspector().locator('[data-reveal-all]').click();
    assert.equal(await atlas.locator('#oath-hide-future').isChecked(), false);
    assert.equal(await page.evaluate(() => document.activeElement?.matches('.oath-inspector h3')), true, 'Révéler les règles replace le focus sur la fiche lisible.');
    assert.equal(await atlas.locator('#oath-level').inputValue(), '1', 'Consulter toutes les règles ne simule pas une montée de niveau.');
    assert.equal(await atlas.locator('.oath-node.is-locked').count(), 4, 'Révéler les informations ne rend pas les capacités applicables.');
    await assertInspectorActions(pugiliste.branches[1], 3, 1);
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async text => { window.__discoveryCopiedText = text; } }
    }));
    await inspector().locator('[data-copy-build]').click();
    await page.waitForFunction(() => !!window.__discoveryCopiedText);
    assert.ok((await page.evaluate(() => window.__discoveryCopiedText)).includes(pugiliste.branches[1].paliers[3].desc));
    await setDisclosure('.oath-reading-options', true);
    await atlas.locator('#oath-hide-future').focus();
    await page.keyboard.press('Space');
    assert.equal(await atlas.locator('#oath-hide-future').isChecked(), true);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'oath-hide-future', 'Changer de mode au clavier conserve le focus.');
    assertEffectHidden(await inspector().textContent(), pugiliste.branches[1].paliers[3], 'Retour en découverte');
    await page.keyboard.press('Space');
    assert.equal(await atlas.locator('#oath-hide-future').isChecked(), false);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'oath-hide-future');
    await setDiscovery(true);
    observations.push('Option de découverte réversible, niveau conservé, copie autorisée des règles consultées et focus clavier maintenu.');

    assert.match(await atlas.locator('.oath-evolutions').textContent(), /staff/i);
    await atlas.locator('.oath-evo-btn[data-evolution="Cestuaire"]').click();
    assert.equal(await atlas.locator('.oath-hero-title').textContent(), 'Cestuaire');
    assert.equal(await atlas.locator('#oath-level').inputValue(), '1');
    assert.equal(await atlas.locator('.oath-node.is-locked').count(), 4);
    assert.equal(await atlas.locator('.oath-node').first().getAttribute('data-required-level'), '10');
    await atlas.locator('.oath-evo-btn[data-evolution="Pugiliste"]').click();
    await chooseBranch(0);
    await setLevel(5);
    await assertNoOverflow('Bureau');
    await page.screenshot({ path: path.join(output, 'discovery-desktop.png'), animations: 'disabled' });
    await page.setViewportSize({ width: 390, height: 844 });
    await assertNoOverflow('Mobile');
    await setLevel(1);
    await setDisclosure('.oath-comparison', true);
    await atlas.locator('.oath-compare-card').first().locator('[data-preview-tier]').click();
    assert.equal(await page.evaluate(() => document.activeElement?.matches('.oath-inspector h3')), true, 'Sur mobile, la simulation mène à un titre lisible.');
    await setDisclosure('.oath-comparison', false);
    await setLevel(5);
    await node(0, 3).click();
    assert.equal(await page.evaluate(() => document.activeElement?.matches('.oath-inspector h3')), true, 'Sur mobile, inspecter un palier mène au titre de sa fiche.');
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
    await flavor.locator('summary').focus();
    await page.keyboard.press('Enter');
    assert.equal(await flavor.getAttribute('open'), '', 'Le récit reste accessible au clavier.');
    await page.keyboard.press('Enter');
    await flavor.locator('summary').evaluate(element => element.blur());
    const placements = [];
    for (const [width, height] of [[1440, 1000], [1024, 900], [390, 844], [320, 740]]) {
      await page.setViewportSize({ width, height });
      await assertNoOverflow('Lecture Arbalétrier ' + width + ' px');
      await inspector().screenshot({ path: path.join(inspectorOutput, 'arbaletrier-panel-' + width + '.png'), animations: 'disabled' });
      await atlas.screenshot({ path: path.join(inspectorOutput, 'arbaletrier-page-' + width + '.png'), animations: 'disabled' });
      placements.push(await atlas.locator('.oath-skill-layout').evaluate(element => {
        const path = element.querySelector('.oath-progression').getBoundingClientRect();
        const panel = element.querySelector('.oath-inspector').getBoundingClientRect();
        return { viewport: innerWidth, progressionWidth: Math.round(path.width), inspectorWidth: Math.round(panel.width), layout: panel.left >= path.right ? 'latéral' : 'vertical' };
      }));
    }
    await node(0, 1).click();
    assert.equal(await page.evaluate(() => document.activeElement?.matches('.oath-inspector h3')), true, 'Sur petit écran, sélectionner un palier mène à sa fiche.');
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
    const staffTier = { ...arbaletrier.branches[0].paliers[1], cout: '2 actions / 9 EP' };
    await assertOperationCards(inspector().locator('.oath-inspector-effect'), staffTier, 5);
    assert.equal(await page.evaluate(() => getSermentTierOperations(getAllSD()['Arbalétrier'].branches[0].paliers[1]).length), 0, 'Le helper commun respecte le coût staff, sur toutes les surfaces.');
    assert.equal(await page.evaluate(() => {
      const tier = getAllSD()['Arbalétrier'].branches[0].paliers[1];
      const surface = document.createElement('div');
      surface.innerHTML = renderSermentOperations(tier, 5);
      return surface.querySelectorAll('.np-oath-operation').length === 0 && surface.querySelector('p')?.textContent === tier.desc;
    }), true, 'Le rendu partagé par la fiche conserve le paragraphe staff sans anciens coûts.');
    await setDisclosure('.oath-comparison', true);
    const staffComparison = atlas.locator('.oath-compare-card').first();
    assert.equal(await staffComparison.locator('.oath-cost strong').textContent(), '2 actions / 9 EP');
    await assertOperationCards(staffComparison.locator('.oath-inspector-effect'), staffTier, 5);
    await setDisclosure('.oath-comparison', false);
    await page.evaluate(() => {
      window.getAllSD = window.__originalInspectorCatalogue;
      delete window.__originalInspectorCatalogue;
    });
    for (const [name, operation, constraint] of [['Alchimiste', 'brew', /1 des 3 fioles du combat/], ['Prismancien', 'shoot', /une facette/], ['Distillateur', 'mother', /Répétable lorsque le flacon est vide/], ['Guetteur', 'watch', /1 carreau réservés/]]) {
      await page.evaluate(name => NPSermentsAtlas.focus(name), name);
      await setLevel(10);
      await node(0, 0).click();
      await assertInspectorActions(expansion.definitions[name].branches[0], 0, 10);
      assert.match(await inspector().locator('.oath-ability-action[data-operation="' + operation + '"] .oath-action-effect').textContent(), constraint, 'La séparation des coûts conserve les consommables et limites : ' + name);
      if (name === 'Guetteur') assert.doesNotMatch(await inspector().locator('[data-operation="watch"] .oath-action-effect').textContent(), /Consomme/, 'Une réserve de ressources ne doit pas être reformulée comme une consommation immédiate.');
    }
    observations.push('Inspecteur Arbalétrier niveau 5 : trois actions avec coûts séparés, 29 dégâts calculés, récit replié et accessible au clavier ; aucune ancienne opération ne remplace une description ou un coût staff. Consommables conservés et dose mère répétable explicitée. Captures 1440/1024/390/320 px sans débordement ; placements : ' + JSON.stringify(placements) + '.');

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
    assert.equal(await atlas.locator('.oath-path-heading').count(), 3, 'Toutes les voies staff restent accessibles.');
    assert.equal(await atlas.locator('.oath-path').count(), 1);
    assert.equal(await atlas.locator('.oath-node').count(), 5);
    assert.equal(await atlas.locator('#oath-level').getAttribute('max'), null, 'Le champ de niveau ne plafonne pas la progression des personnages.');
    assert.equal(await atlas.locator('.oath-list-item[data-serment="QA serment secret du staff"]').count(), 0);
    await setLevel(5);
    assert.equal(await atlas.locator('.oath-node.is-unlocked').count(), 2);
    assert.equal(await atlas.locator('.oath-node.is-sealed').count(), 2);
    await chooseBranch(2);
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
