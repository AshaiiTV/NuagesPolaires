'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createLocalApp } = require('./helpers/local-app');
const { assertOperationCards, ruleAtLevel } = require('./helpers/serment-operation-assertions');
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

    const inspector = () => atlas.locator('.oath-inspector');
    const branchButton = branch => atlas.locator('[data-choose-branch="' + branch + '"]');
    async function setLevel(level) {
      await atlas.locator('#oath-level').fill(String(level));
      assert.equal(await atlas.locator('#oath-level').inputValue(), String(level));
    }
    async function setDisclosure(selector, open) {
      const disclosure = atlas.locator(selector);
      if ((await disclosure.getAttribute('open') !== null) !== open) await disclosure.locator(':scope > summary').click();
      assert.equal(await disclosure.getAttribute('open') !== null, open);
    }
    async function chooseBranch(index) {
      await branchButton(index).click();
      assert.equal(await atlas.locator('.oath-path-heading[aria-pressed="true"]').getAttribute('data-choose-branch'), String(index));
      assert.equal(await page.evaluate(() => document.activeElement?.matches('.oath-inspector h3')), true, 'Choisir une voie mène à sa fiche.');
    }
    async function assertNoOverflow(label) {
      const widths = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, atlas: document.querySelector('.oath-atlas').getBoundingClientRect().width }));
      assert.ok(widths.document <= widths.viewport + 1, label + ': débordement horizontal ' + JSON.stringify(widths));
      assert.ok(widths.atlas <= widths.viewport + 1, label + ': la forge dépasse le viewport ' + JSON.stringify(widths));
    }
    async function assertInspectorActions(branch, level) {
      const ability = branch.ability;
      assert.ok(ability, 'Le contrat publié contient la capacité fixe de la voie.');
      await assertOperationCards(inspector().locator('.oath-inspector-effect'), ability, level);
      assert.deepEqual(await inspector().locator('.oath-ability-action h5').allTextContents(), ability.combatRules.operations.map(operation => operation.label));
    }
    async function assertNoTierUI() {
      assert.equal(await atlas.locator('.oath-node,.oath-reading-options,#oath-hide-future,[data-preview-tier],[data-reveal-all]').count(), 0, 'La consultation ne présente plus de paliers ni de déblocages.');
      assert.doesNotMatch(await atlas.innerText(), /ancien palier|palier de référence|palier actif|capacité masquée|niveau avant révélation/i);
    }

    assert.equal(await atlas.locator('#oath-level').getAttribute('type'), 'number');
    assert.equal(await atlas.locator('#oath-level').getAttribute('max'), null);
    assert.equal(await atlas.locator('#oath-level').inputValue(), '1', 'L’ouverture reprend le niveau du personnage lié.');
    assert.equal(await atlas.locator('.oath-list-item').count(), 34, 'Les entrées masquées par le staff restent exclues du catalogue.');
    assert.equal(await atlas.locator('.oath-forge-grid').getAttribute('data-branch-count'), '2');
    assert.equal(await atlas.locator('.oath-forge-path').count(), 2);
    await assertNoTierUI();
    const inputHandle = await atlas.locator('#oath-level').elementHandle();
    for (const branch of [0, 1]) {
      await chooseBranch(branch);
      assert.equal(await branchButton(branch).getAttribute('aria-controls'), 'oath-selected-ability');
      for (const level of [1, 2, 5, 7, 10, 35]) {
        await setLevel(level);
        assert.equal(await inputHandle.evaluate(element => element.isConnected && element === document.activeElement), true, 'La saisie du niveau conserve le même contrôle et son focus.');
        await assertInspectorActions(pugiliste.branches[branch], level);
        assert.ok(await atlas.locator('.oath-play-guide').count(), 'Le guide de la voie est accessible dès le niveau 1.');
        await assertNoTierUI();
      }
    }
    await chooseBranch(0);
    await setLevel(5);
    await atlas.locator('#oath-level').focus();
    await page.keyboard.press('ArrowUp');
    assert.equal(await atlas.locator('#oath-level').inputValue(), '6');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'oath-level');
    await assertInspectorActions(pugiliste.branches[0], 6);
    await setDisclosure('.oath-comparison', true);
    for (const [index, branch] of pugiliste.branches.entries()) {
      await assertOperationCards(atlas.locator('.oath-compare-card').nth(index).locator('.oath-inspector-effect'), branch.ability, 6);
    }
    await atlas.locator('.oath-compare-card[data-branch="1"] [data-inspect-branch]').click();
    assert.equal(await page.evaluate(() => document.activeElement?.matches('.oath-inspector h3')), true);
    assert.equal(await atlas.locator('.oath-path-heading[aria-pressed="true"]').getAttribute('data-choose-branch'), '1');
    await setDisclosure('.oath-comparison', false);
    await inspector().locator('[data-back-to-paths]').click();
    assert.equal(await page.evaluate(() => document.activeElement?.matches('[data-choose-branch="1"]')), true, 'Le retour retrouve exactement la voie consultée.');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement?.matches('.oath-inspector h3')), true, 'La voie reste consultable au clavier.');
    observations.push('Deux voies fixes : mêmes opérations aux niveaux 1/2/5/7/10/35, valeurs calculées depuis les coefficients publiés, aucun palier ni masquage ; focus niveau et navigation clavier conservés.');

    await setLevel(35);
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__discoveryCopiedText = text; } } }));
    await inspector().locator('[data-copy-build]').click();
    await page.waitForFunction(() => !!window.__discoveryCopiedText);
    const copied = await page.evaluate(() => window.__discoveryCopiedText);
    assert.match(copied, /Pugiliste/);
    assert.match(copied, /35/);
    for (const effect of await inspector().locator('.oath-action-effect').allTextContents()) assert.ok(copied.includes(effect), 'La copie conserve les effets numériques affichés.');
    assert.doesNotMatch(copied, /palier inspecté|plus élevé atteint|\+ N/i);
    await atlas.locator('[data-own-level]').click();
    assert.equal(await atlas.locator('#oath-level').inputValue(), '1');
    assert.equal(await atlas.locator('.oath-evo-btn[data-evolution="Cestuaire"]').evaluate(element => element.classList.contains('is-locked')), true);
    assert.match(await atlas.locator('.oath-evolutions').textContent(), /staff/i);
    await atlas.locator('.oath-evo-btn[data-evolution="Cestuaire"]').click();
    assert.equal(await atlas.locator('.oath-hero-title').textContent(), 'Cestuaire');
    await assertNoTierUI();
    assert.equal(await atlas.locator('#oath-level').inputValue(), '1');
    await assertInspectorActions(expansion.definitions.Cestuaire.branches[0], 10);
    assert.match(await inspector().innerText(), /Valeurs au niveau 10.*niveau minimum de cette évolution/);
    for (const level of [10, 11, 20, 35]) {
      await setLevel(level);
      await assertInspectorActions(expansion.definitions.Cestuaire.branches[0], level);
    }
    await atlas.locator('.oath-evo-btn[data-evolution="Pugiliste"]').click();
    assert.equal(await atlas.locator('#oath-level').inputValue(), '35');
    assert.equal(await atlas.locator('.oath-path-heading[aria-pressed="true"]').getAttribute('data-choose-branch'), '1', 'Revenir à un serment conserve sa voie consultée.');
    observations.push('Copie numérique au niveau 35, retour au niveau propre, évolution soumise au niveau 10 et au staff, mémoire des voies conservée.');

    // The reported dense crossbow panel must retain independent operation cards.
    await page.evaluate(() => NPSermentsAtlas.focus('Arbalétrier'));
    await chooseBranch(0);
    await setLevel(5);
    const arbaletrier = expansion.definitions['Arbalétrier'];
    await assertInspectorActions(arbaletrier.branches[0], 5);
    const actions = inspector().locator('.oath-ability-action');
    assert.equal(await actions.count(), arbaletrier.branches[0].ability.combatRules.operations.length);
    assert.ok((await actions.count()) >= 3, 'Les choix de chargement, tir et surtension sont présents dès le départ.');
    const effects = await actions.locator('.oath-action-effect').allTextContents();
    for (const effect of effects) assert.doesNotMatch(effect, /^\d+ actions?|\+ N/, 'Les coûts restent séparés des effets numériques.');
    assert.match(await inspector().locator('[data-operation="load"] .oath-action-effect').textContent(), /carreau|munition/i);
    assert.match(await inspector().locator('[data-operation="shoot"] .oath-action-effect').textContent(), /carreau consommé|consomme.*carreau/i);
    const flavor = inspector().locator('details.oath-inspector-flavor');
    assert.equal(await flavor.getAttribute('open'), null);
    assert.equal(await flavor.locator('.oath-ability-story p').textContent(), arbaletrier.branches[0].ability.manifestation);
    await flavor.locator('summary').focus();
    await page.keyboard.press('Enter');
    assert.equal(await flavor.getAttribute('open'), '', 'La narration reste accessible au clavier.');
    await page.keyboard.press('Enter');
    await flavor.locator('summary').evaluate(element => element.blur());
    const placements = [];
    for (const [width, height] of [[1440, 1000], [1024, 900], [390, 844], [320, 740]]) {
      await page.setViewportSize({ width, height });
      await assertNoOverflow('Lecture Arbalétrier ' + width + ' px');
      const geometry = await atlas.locator('.oath-forge-path').evaluateAll(branches => branches.map(branch => {
        const header = branch.querySelector('.oath-path-heading').getBoundingClientRect();
        const copy = branch.querySelector('.oath-branch-copy').getBoundingClientRect();
        return { branch: branch.dataset.branch, headerTop: header.top, headerBottom: header.bottom, copyTop: copy.top, copyBottom: copy.bottom };
      }));
      assert.equal(geometry.length, 2);
      for (const item of geometry) {
        assert.ok(item.copyTop >= item.headerTop + 2, 'Le titre reste dans sa carte : ' + JSON.stringify(item));
        assert.ok(item.copyBottom <= item.headerBottom - 2, 'Le pitch reste dans sa carte : ' + JSON.stringify(item));
      }
      const placement = await atlas.evaluate(element => {
        const forge = element.querySelector('.oath-forge').getBoundingClientRect();
        const panel = element.querySelector('.oath-selected-skill .oath-inspector').getBoundingClientRect();
        return { viewport: innerWidth, forgeWidth: Math.round(forge.width), inspectorWidth: Math.round(panel.width), inspectorBelowForge: panel.top >= forge.bottom - 1 };
      });
      assert.equal(placement.inspectorBelowForge, true);
      placements.push(placement);
      await inspector().screenshot({ path: path.join(inspectorOutput, 'arbaletrier-panel-' + width + '.png'), animations: 'disabled' });
      await atlas.screenshot({ path: path.join(inspectorOutput, 'arbaletrier-page-' + width + '.png'), animations: 'disabled' });
      await atlas.locator('.oath-forge').screenshot({ path: path.join(inspectorOutput, 'arbaletrier-forge-' + width + '.png'), animations: 'disabled' });
      await chooseBranch(1);
      await inspector().locator('[data-back-to-paths]').click();
      assert.equal(await page.evaluate(() => document.activeElement?.matches('[data-choose-branch="1"]')), true, 'Le retour retrouve la voie à ' + width + ' px.');
      await chooseBranch(0);
      await inspector().locator('h3').evaluate(element => element.blur());
    }
    await page.setViewportSize({ width: 390, height: 844 });

    // Staff prose takes precedence over stale structured catalogue rules.
    await page.evaluate(() => {
      window.__originalInspectorCatalogue = window.getAllSD;
      window.getAllSD = function () {
        const catalogue = window.__originalInspectorCatalogue();
        const definition = JSON.parse(JSON.stringify(catalogue['Arbalétrier']));
        const tier = definition.branches[0].ability;
        tier.desc = 'Règle personnalisée du staff : le carreau trace une balise bleue.';
        tier.cout = '2 actions / 9 EP';
        return Object.assign({}, catalogue, { 'Arbalétrier': definition });
      };
      NPSermentsAtlas.focus('Arbalétrier');
    });
    await chooseBranch(0);
    assert.equal(await inspector().locator('.oath-ability-action').count(), 0, 'Les anciennes opérations ne remplacent pas une description staff.');
    assert.ok((await inspector().locator('.oath-inspector-effect').textContent()).includes('Règle personnalisée du staff : le carreau trace une balise bleue.'));
    assert.ok((await inspector().textContent()).includes('2 actions / 9 EP'), 'Le coût personnalisé reste visible.');
    assert.doesNotMatch(await inspector().locator('.oath-inspector-effect').textContent(), /Armer l’arbalète|Tirer un carreau|Prochain tir \+12|29 dégâts/);
    await page.evaluate(() => {
      window.getAllSD = function () {
        const catalogue = window.__originalInspectorCatalogue();
        const definition = JSON.parse(JSON.stringify(catalogue['Arbalétrier']));
        definition.branches[0].ability.cout = '2 actions / 9 EP';
        return Object.assign({}, catalogue, { 'Arbalétrier': definition });
      };
      NPSermentsAtlas.focus('Arbalétrier');
    });
    await chooseBranch(0);
    assert.equal(await inspector().locator('.oath-ability-action').count(), 0, 'Un coût staff modifié seul interdit aussi les anciennes cartes de coûts.');
    assert.ok((await inspector().textContent()).includes('2 actions / 9 EP'));
    const authoredEffectAtFive = arbaletrier.branches[0].ability.combatRules.operations.map(operation => ruleAtLevel(operation, 5)).join(' ');
    assert.equal(await inspector().locator('.oath-inspector-effect > p').textContent(), authoredEffectAtFive, 'Modifier le coût conserve les règles et évalue leurs seules formules explicites.');
    const staffTier = { ...arbaletrier.branches[0].ability, cout: '2 actions / 9 EP' };
    await assertOperationCards(inspector().locator('.oath-inspector-effect'), staffTier, 5);
    assert.equal(await page.evaluate(() => getSermentTierOperations(getAllSD()['Arbalétrier'].branches[0].ability).length), 0, 'Le helper commun respecte le coût staff, sur toutes les surfaces.');
    assert.equal(await page.evaluate(expectedText => {
      const tier = getAllSD()['Arbalétrier'].branches[0].ability;
      const surface = document.createElement('div');
      surface.innerHTML = renderSermentOperations(tier, 5);
      return surface.querySelectorAll('.np-oath-operation').length === 0 && surface.querySelector('p')?.textContent === expectedText;
    }, authoredEffectAtFive), true, 'Le rendu partagé par la fiche conserve le paragraphe staff sans anciens coûts.');
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
      await chooseBranch(0);
      await assertInspectorActions(expansion.definitions[name].branches[0], 10);
      assert.match(await inspector().locator('.oath-ability-action[data-operation="' + operation + '"] .oath-action-effect').textContent(), constraint, 'La séparation des coûts conserve les consommables et limites : ' + name);
      if (name === 'Guetteur') assert.doesNotMatch(await inspector().locator('[data-operation="watch"] .oath-action-effect').textContent(), /Consomme/, 'Une réserve de ressources ne doit pas être reformulée comme une consommation immédiate.');
    }
    observations.push('Inspecteur Arbalétrier niveau 5 : trois actions avec coûts séparés, valeurs linéaires calculées, récit replié et accessible au clavier ; aucune ancienne opération ne remplace une description ou un coût staff. Consommables conservés et dose mère répétable explicitée. Captures 1440/1024/390/320 px sans débordement ; placements : ' + JSON.stringify(placements) + '.');

    // Staff definitions can have more than two branches. The fixed ability
    // remains accessible without a fabricated unlock threshold.
    await page.evaluate(() => {
      window.__originalDiscoveryCatalogue = window.getAllSD;
      const definition = {
        cat: 'magie', level: 'basic', arme: 'Arme de test', pvN: 1, epN: 1, emN: 1, dmg: 1,
        branches: Array.from({ length: 3 }, (_, branch) => ({
          nom: 'Voie de test ' + branch,
          ability: { niv: 1, nom: 'Capacité de test ' + branch, cout: '1 EP', desc: 'Effet de test ' + branch }
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
    assert.equal(await atlas.locator('.oath-forge-grid').getAttribute('data-branch-count'), '3');
    assert.equal(await atlas.locator('.oath-forge-path').count(), 3);
    assert.equal(await atlas.locator('#oath-level').getAttribute('max'), null);
    assert.equal(await atlas.locator('.oath-list-item[data-serment="QA serment secret du staff"]').count(), 0);
    await setLevel(1);
    await chooseBranch(2);
    assert.equal(await inspector().locator('.oath-inspector-effect > .oath-action-effect').textContent(), 'Effet de test 2');
    await setLevel(35);
    assert.equal(await inspector().locator('.oath-inspector-effect > .oath-action-effect').textContent(), 'Effet de test 2');
    await assertNoTierUI();
    await assertNoOverflow('Mobile avec trois voies staff');
    await page.evaluate(() => {
      window.getAllSD = window.__originalDiscoveryCatalogue;
      delete window.__originalDiscoveryCatalogue;
      NPSermentsAtlas.focus('Pugiliste');
    });
    observations.push('Structures staff à trois voies accessibles aux niveaux 1 et 35 sur mobile, entrées staff cachées exclues.');

    assert.deepEqual(await app.read('players'), before, 'Consultation, niveau de référence, évolution et copie ne modifient aucun personnage.');
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
