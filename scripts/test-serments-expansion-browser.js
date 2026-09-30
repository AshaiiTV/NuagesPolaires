'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createLocalApp } = require('./helpers/local-app');
const { assertOperationCards } = require('./helpers/serment-operation-assertions');
const expansion = require('../assets/js/serments-reforged-data');

// Real DOM controls and production handlers against isolated PostgreSQL.
// No production account, data or network write is used by this scenario.
(async () => {
  const app = await createLocalApp();
  const output = path.resolve(process.env.NP_TEST_OUTPUT || 'test-results/serments-expansion');
  fs.mkdirSync(output, { recursive: true });
  let browser, page;
  const errors = [], observations = [];
  const invalidHandlers = [];
  async function inspectHandlers(targetPage, label) {
    const handlers = await targetPage.evaluate(() => Array.from(document.querySelectorAll('*')).flatMap(element => Array.from(element.attributes).filter(attribute => /^on/.test(attribute.name)).map(attribute => ({ element: element.tagName, event: attribute.name, code: attribute.value }))));
    for (const handler of handlers) {
      try { new Function(handler.code); }
      catch (error) { invalidHandlers.push({ label, ...handler, error: error.message }); }
    }
  }
  try {
    const pugiliste = expansion.definitions.Pugiliste;
    const players = (await app.read('players')).value;
    Object.assign(players.find(player => player.id === 'p_alice'), {
      classe: 'Pugiliste', arme: pugiliste.arme, branch: pugiliste.branches[0].nom,
      level: 10, xp: 15, xpMax: 300,
      pvMax: 30 + 9 * pugiliste.pvN, pvCur: 30 + 9 * pugiliste.pvN,
      epMax: 50 + 9 * pugiliste.epN, epCur: 50 + 9 * pugiliste.epN,
      emMax: 20 + 9 * pugiliste.emN, emCur: 20 + 9 * pugiliste.emN
    });
    for (const [id, name] of [['p_bob', 'Arbalétrier'], ['p_admin', 'Barde']]) {
      const def = expansion.definitions[name];
      Object.assign(players.find(player => player.id === id), { classe: name, arme: def.arme, branch: def.branches[0].nom, level: 2, xp: 0, xpMax: 60, pvMax: 30 + def.pvN, pvCur: 30 + def.pvN, epMax: 50 + def.epN, epCur: 50 + def.epN, emMax: 20 + def.emN, emCur: 20 + def.emN });
    }
    await app.seed('players', players);
    const beasts = (await app.read('beasts')).value;
    Object.assign(beasts.find(beast => beast.id === 'visible'), { niv: 2, pv: 100, ep: 100 });
    await app.seed('beasts', beasts);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const session = await app.cookie('admin');
    await context.addCookies([{ name: 'np_session', value: session.slice('np_session='.length), url: app.origin, httpOnly: true, sameSite: 'Strict' }]);
    page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(60000);
    page.on('pageerror', error => errors.push(error.stack || error.message));
    await page.route('https://**/*', route => route.abort());
    async function ready() {
      await page.waitForFunction(() => window.CU && (CU.pseudo || CU.name) === 'Admin');
      await page.waitForFunction(() => !document.getElementById('login-transition-overlay')?.classList.contains('active'));
    }
    async function saveKey(key, action) {
      const response = page.waitForResponse(response => {
        if (!response.url().endsWith('/.netlify/functions/db')) return false;
        const data = response.request().postDataJSON();
        return data?.action === 'set' && data.key === key;
      });
      await action();
      assert.equal((await response).status(), 200);
    }
    const save = action => saveKey('players', action);
    const storedAlice = async () => (await app.read('players')).value.find(player => player.id === 'p_alice');
    await page.goto(app.origin, { waitUntil: 'load' });
    await ready();

    const counts = await page.evaluate(() => {
      const all = getAllSD();
      return { total: Object.keys(all).length, public: Object.keys(all).filter(name => isSermVisibleInLibrary(name, all[name])).length };
    });
    assert.deepEqual(counts, { total: 83, public: 34 });
    const abilityErrors = await page.evaluate(() => {
      const failures = [], savedCombat = _cs, savedPlayerLookup = window.gpid;
      let fixture;
      try {
        window.gpid = id => id === 'qa-ability' ? fixture : savedPlayerLookup(id);
        _cs = { fighters: [{ pid: 'qa-ability', type: 'player', level: 1 }] };
        Object.entries(NPSermentsExpansion.definitions).forEach(([name, def]) => getBranches(name, def).forEach(branch => {
          if (def.retired) {
            for (const level of [1, ...branch.paliers.flatMap(tier => [tier.niv - 1, tier.niv])]) {
              fixture = { id: 'qa-ability', classe: name, branch: branch.nom, level };
              const current = cGetFighterSerment(0);
              const archived = branch.paliers.filter(tier => tier.niv <= level);
              const expected = archived.length ? archived[archived.length - 1].niv : null;
              if ((current?.palier?.niv || null) !== expected) failures.push(name + ' / archive niveau ' + level);
            }
            return;
          }
          const minimum = def.evolvesFrom ? 10 : 1;
          if (!branch.ability || branch.paliers.length !== 1 || JSON.stringify(branch.paliers[0]) !== JSON.stringify(branch.ability)) failures.push(name + ' / capacité unique');
          [1, 2, 5, 7, 10, 11, 20, 35].forEach(level => {
            fixture = { id: 'qa-ability', classe: name, branch: branch.nom, level };
            const current = cGetFighterSerment(0);
            const expected = level >= minimum ? branch.ability : null;
            if (JSON.stringify(current?.palier || null) !== JSON.stringify(expected) || current?.paliers.length !== (expected ? 1 : 0)) failures.push(name + ' / ' + branch.nom + ' / niv.' + level);
          });
        }));
      } finally { _cs = savedCombat; window.gpid = savedPlayerLookup; }
      return failures;
    });
    assert.deepEqual(abilityErrors, [], 'Chaque voie garde une capacité stable ; seul le niveau minimum d’attribution des évolutions reste requis.');
    await page.evaluate(() => switchDropTab('serments', null, ''));
    const atlas = page.locator('#serments-grid.oath-atlas');
    const oathList = atlas.locator('.oath-list-item[data-serment]');
    assert.equal(await atlas.count(), 1);
    assert.match(await atlas.locator('.oath-topbar h1').textContent(), /Serments/i);
    assert.equal(await oathList.count(), 34);
    assert.equal(await atlas.locator('.oath-list-item[data-level="basic"]').count(), 16);
    assert.equal(await atlas.locator('.oath-list-item[data-level="seasoned"]').count(), 18);
    await atlas.locator('#oath-rank').selectOption('seasoned');
    assert.equal(await atlas.locator('.oath-list-item:visible').count(), 18);
    await atlas.locator('#oath-rank').selectOption('basic');
    assert.equal(await atlas.locator('.oath-list-item:visible').count(), 16);
    await atlas.locator('#oath-rank').selectOption('');
    assert.equal(await oathList.count(), 34);
    const category = await atlas.locator('#oath-category option').evaluateAll(options => options.find(option => option.value)?.value);
    assert.ok(category);
    await atlas.locator('#oath-category').selectOption(category);
    assert.ok(await oathList.count(), 'Le filtre de catégorie conserve des résultats.');
    assert.equal(await oathList.evaluateAll((items, category) => items.every(item => {
      const name = item.dataset.serment, definition = getAllSD()[name];
      return normalizeSermCat(definition.cat || SERM_CATS[name] || 'melee') === category;
    }), category), true, 'Chaque résultat appartient à la catégorie demandée.');
    await atlas.locator('#oath-category').selectOption('');
    await atlas.locator('#oath-rank').selectOption('basic');
    await page.locator('#serment-search').fill('Pugiliste');
    assert.equal(await atlas.locator('.oath-list-item:visible').count(), 1);
    const playersBeforeAtlas = await app.read('players');
    await atlas.locator('.oath-list-item[data-serment="Pugiliste"]').click();
    assert.equal(await atlas.locator('.oath-codex blockquote').textContent(), '« ' + pugiliste.vow + ' »');
    assert.equal(await atlas.locator('.oath-codex').getAttribute('open'), null, 'Le récit est facultatif à l’ouverture.');
    await atlas.locator('.oath-codex > summary').click();
    assert.equal(await atlas.locator('.oath-codex').getAttribute('open'), '');
    assert.equal(await atlas.locator('.oath-hero-lore').count(), 2);
    assert.ok((await atlas.locator('.oath-world').textContent()).includes(pugiliste.awakening));
    assert.equal(await page.evaluate(() => document.activeElement?.parentElement?.className), 'oath-codex', 'Le récit reçoit le focus après ouverture.');
    await atlas.locator('.oath-codex > summary').click();
    assert.match(await page.locator('.oath-stage').textContent(), /Pugiliste/);
    assert.equal(await atlas.locator('.oath-forge-path').count(), 2);
    assert.equal(await atlas.locator('.oath-node,.oath-reading-options,#oath-hide-future').count(), 0, 'Les actions ne sont plus réparties en paliers.');
    assert.equal(await page.locator('.oath-forge-core img').count(), 1);
    assert.match(await page.locator('.oath-forge-core img').getAttribute('src'), /\/pugiliste\.jpg$/);
    const levelInput = page.locator('#oath-level');
    assert.equal(await levelInput.getAttribute('type'), 'number');
    assert.equal(await levelInput.getAttribute('max'), null);
    assert.equal(await levelInput.inputValue(), '2', 'Le niveau initial suit le personnage connecté.');
    for (const level of [1, 2, 5, 7, 10, 35]) {
      await levelInput.fill(String(level));
      for (const [index, branch] of pugiliste.branches.entries()) {
        await atlas.locator('[data-choose-branch="' + index + '"]').click();
        assert.equal(await atlas.locator('.oath-inspector h3').textContent(), branch.ability.nom);
        await assertOperationCards(atlas.locator('.oath-inspector .oath-inspector-effect'), branch.ability, level);
      }
    }
    await levelInput.fill('10');
    assert.equal(await atlas.locator('.oath-comparison').getAttribute('open'), null);
    await atlas.locator('.oath-comparison > summary').click();
    assert.equal(await atlas.locator('.oath-forge').isVisible(), true, 'La comparaison complète les deux choix de voie.');
    assert.equal(await atlas.locator('.oath-compare-card:visible').count(), 2);
    for (const [index, branch] of pugiliste.branches.entries()) {
      const card = atlas.locator('.oath-compare-card').nth(index);
      assert.equal(await card.locator('.oath-compare-status').textContent(), 'Valeurs au niveau 10');
      await assertOperationCards(card.locator('.oath-inspector-effect'), branch.ability, 10);
    }
    await levelInput.fill('5');
    assert.equal(await levelInput.inputValue(), '5');
    for (const [index, branch] of pugiliste.branches.entries()) {
      const card = atlas.locator('.oath-compare-card').nth(index);
      assert.equal(await card.locator('.oath-compare-status').textContent(), 'Valeurs au niveau 5');
      await assertOperationCards(card.locator('.oath-inspector-effect'), branch.ability, 5);
    }
    await atlas.locator('[data-inspect-branch="1"]').click();
    assert.equal(await atlas.locator('.oath-forge').isVisible(), true);
    assert.equal(await atlas.locator('[data-choose-branch="1"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement === document.querySelector('.oath-inspector h3')), true);
    await levelInput.fill('10');
    await atlas.locator('[data-choose-branch="0"]').click();
    const firstAbility = await page.locator('.oath-inspector').textContent();
    await atlas.locator('[data-choose-branch="1"]').click();
    const secondAbility = await page.locator('.oath-inspector').textContent();
    assert.notEqual(secondAbility, firstAbility, 'L’inspecteur suit la voie choisie.');
    assert.equal(await atlas.locator('.oath-inspector h3').textContent(), pugiliste.branches[1].ability.nom);
    assert.equal(await atlas.locator('.oath-ability-story p').textContent(), pugiliste.branches[1].ability.manifestation);
    assert.equal(await atlas.locator('details.oath-inspector-flavor').getAttribute('open'), null, 'L’imaginaire est conservé dans un volet replié pour privilégier les règles.');
    const secondBranch = atlas.locator('.oath-path-heading[data-choose-branch="1"]');
    await atlas.locator('[data-back-to-paths]').click();
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-choose-branch')), '1');
    await page.keyboard.press('Enter');
    assert.equal(await secondBranch.getAttribute('aria-pressed'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement === document.querySelector('.oath-inspector h3')), true, 'La voie s’ouvre au clavier et donne le focus à sa capacité.');
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__oathCopiedText = text; } } });
    });
    await atlas.locator('[data-copy-build]').click();
    await page.waitForFunction(() => document.querySelector('.oath-action-status')?.textContent === 'Fiche copiée.');
    const copiedPath = await page.evaluate(() => window.__oathCopiedText);
    assert.match(copiedPath, /Pugiliste/);
    assert.match(copiedPath, /Valeurs au niveau 10/);
    for (const effect of await atlas.locator('.oath-inspector .oath-action-effect').allTextContents()) assert.ok(copiedPath.includes(effect), 'La copie contient chaque effet numérique validé indépendamment.');
    assert.doesNotMatch(copiedPath, /palier|\+ N|× N/i);
    assert.match(await atlas.locator('.oath-evolutions').textContent(), /staff/i);
    await atlas.locator('.oath-evo-btn[data-evolution="Cestuaire"]').click();
    assert.match(await page.locator('.oath-hero-title').textContent(), /Cestuaire/);
    assert.equal(await levelInput.inputValue(), '10', 'Le niveau exploré est conservé lors du passage à une évolution.');
    await assertOperationCards(atlas.locator('.oath-inspector .oath-inspector-effect'), expansion.definitions.Cestuaire.branches[0].ability, 10);
    await atlas.locator('.oath-evo-btn[data-evolution="Pugiliste"]').click();
    assert.equal(await levelInput.inputValue(), '10');
    assert.equal(await atlas.locator('.oath-path-heading[aria-pressed="true"]').getAttribute('data-choose-branch'), '1', 'Revenir à l’origine retrouve la voie inspectée.');
    assert.match(await atlas.locator('.oath-evolutions').textContent(), /staff/i);
    await atlas.locator('.oath-evo-btn[data-evolution="Cestuaire"]').click();
    await page.setViewportSize({ width: 390, height: 844 });
    const libraryToggle = atlas.locator('[data-toggle-library]');
    assert.equal(await libraryToggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await atlas.locator('.oath-library-body').isVisible(), false);
    await libraryToggle.click();
    assert.equal(await libraryToggle.getAttribute('aria-expanded'), 'true');
    assert.equal(await atlas.locator('.oath-library-body').isVisible(), true);
    await page.locator('#serment-search').fill('Barde');
    await atlas.locator('.oath-list-item[data-serment="Barde"]').click();
    assert.equal(await atlas.locator('.oath-hero-title').textContent(), 'Barde');
    assert.equal(await libraryToggle.getAttribute('aria-expanded'), 'false', 'Choisir un serment replie l’armurerie sur mobile.');
    assert.equal(await levelInput.inputValue(), '10', 'Un autre serment conserve aussi le niveau exploré.');
    assert.equal(await page.evaluate(() => document.activeElement?.className), 'oath-hero-title');
    await atlas.locator('.oath-codex > summary').click();
    assert.ok((await atlas.locator('.oath-world').textContent()).includes(expansion.definitions.Barde.worldRole));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Le récit et les titres de capacités tiennent sur mobile.');
    await page.setViewportSize({ width: 1440, height: 1000 });
    assert.equal(await atlas.locator('.oath-library-body').isVisible(), true);
    assert.deepEqual(await app.read('players'), playersBeforeAtlas, 'La consultation, la comparaison et la copie de la fiche ne modifient pas les personnages.');
    await page.locator('#serment-search').fill('');
    const imageResults = await page.evaluate(async () => {
      const urls = Object.values(NPSermentsExpansion.definitions).map(def => def.logo);
      return Promise.all(urls.map(url => new Promise(resolve => { const image = new Image(); image.onload = () => resolve({ url, ok: image.naturalWidth > 0 }); image.onerror = () => resolve({ url, ok: false }); image.src = url; })));
    });
    assert.ok(imageResults.every(result => result.ok), JSON.stringify(imageResults.filter(result => !result.ok)));
    assert.equal(await page.locator('.oath-forge-core img[src$=".jpg"]').count(), 1);
    await page.screenshot({ path: path.join(output, 'catalogue-desktop.png'), animations: 'disabled' });
    observations.push('Forge effective : 83 serments, 34 publics, 16 basiques et 18 évolutions ; forge centrale et deux branches visibles, comparaison facultative au niveau réel, capacités fixes et valeurs linéaires, copie de la fiche, mémoire des voies et armurerie mobile ; peintures chargées sans écriture de personnage.');

    await page.evaluate(() => openEditBranch(encodeURIComponent('Pugiliste'), 0));
    await page.locator('#mbr-desc').fill('Description retouchée pour le test de conservation des règles.');
    await saveKey('serments_custom', () => page.locator('button[onclick="saveBranch()"]').click());
    let edited = (await app.read('serments_custom')).value.Pugiliste;
    assert.deepEqual(edited.branches[0].combatRules, pugiliste.branches[0].combatRules);
    assert.equal(edited.branches[0].descPhys, pugiliste.branches[0].descPhys);
    assert.equal(edited.branches[0].flavor, pugiliste.branches[0].flavor);
    assert.deepEqual(edited.branches[0].gameplay, pugiliste.branches[0].gameplay, 'Staff branch editing preserves the gameplay guide.');
    await page.evaluate(() => openManagePaliers(encodeURIComponent('Pugiliste'), 0));
    assert.match(await page.locator('#mpal-title').textContent(), /Modifier la capacité/);
    assert.equal(await page.locator('#mpal-niv').isVisible(), false);
    assert.equal(await page.locator('#mpal-niv').inputValue(), '1');
    await page.locator('#mpal-desc').fill('Règle corrigée par le staff : 17 dégâts et une défense normale. Une seule main engagée.');
    await saveKey('serments_custom', () => page.locator('button[onclick="savePalier()"]').click());
    edited = (await app.read('serments_custom')).value.Pugiliste;
    assert.deepEqual(edited.branches[0].ability.combatRules, pugiliste.branches[0].ability.combatRules);
    assert.equal(edited.branches[0].ability.manifestation, pugiliste.branches[0].ability.manifestation);
    assert.equal(edited.branches[0].roleplay, pugiliste.branches[0].roleplay);
    assert.deepEqual(edited.branches[0].combatRules, pugiliste.branches[0].combatRules);
    assert.equal(Object.hasOwn(edited, 'entry'), false);
    assert.deepEqual(edited.branches[0].gameplay, pugiliste.branches[0].gameplay);
    await page.evaluate(() => { NPSermentsAtlas.focus('Pugiliste'); document.querySelector('[data-choose-branch="0"]').click(); });
    assert.equal(await atlas.locator('.oath-inspector .np-oath-operation,.oath-inspector .oath-ability-action').count(), 0, 'An explicit staff description keeps precedence over generated cards.');
    assert.equal(await atlas.locator('.oath-inspector .oath-inspector-effect > p').textContent(), edited.branches[0].ability.desc);
    assert.equal(await atlas.locator('.oath-ability-story p').textContent(), pugiliste.branches[0].ability.manifestation);
    observations.push('Éditions réelles de branche et capacité : texte sauvegardé, règles structurées et métadonnées intactes, copie de données superflue retirée.');

    await page.evaluate(() => { popSSelects(); openModal('m-addp'); });
    assert.equal(await page.locator('#np-c option[value]:not([value=""])').count(), 16);
    assert.equal(await page.locator('#np-c option[value="Cestuaire"]').count(), 0);
    await page.locator('#np-n').fill('Nouveau Barde');
    await page.locator('#np-c').selectOption('Barde');
    await save(() => page.locator('button[onclick="addPlayer()"]').click());
    const created = (await app.read('players')).value.find(player => player.name === 'Nouveau Barde');
    assert.ok(created);
    assert.equal(created.classe, 'Barde');
    assert.equal(created.level, 1);
    assert.equal(created.arme, expansion.definitions.Barde.arme);
    await page.evaluate(id => openChangeSerm(id), created.id);
    assert.equal(await page.locator('#mcs-sel option[value="Carillonneur"]').isDisabled(), true);
    const beforeEarlyEvolution = await app.read('players');
    await page.evaluate(() => { document.getElementById('mcs-sel').value = 'Carillonneur'; });
    await page.locator('button[onclick="saveChangeSerm()"]').click();
    assert.deepEqual(await app.read('players'), beforeEarlyEvolution, 'Le niveau minimum est vérifié même si le contrôle HTML est contourné.');
    await page.locator('#m-changeserm .mclose').click();
    observations.push('Création réelle d’un Barde niveau 1 via le formulaire ; les évolutions sont absentes des choix de départ.');

    await page.evaluate(() => loadPlayer('p_alice'));
    await page.locator('#p-serm-c').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#p-serm-c .np-oath-vow').textContent(), '« ' + pugiliste.vow + ' »');
    assert.equal(await page.locator('#p-serm-c .np-sheet-branch').first().locator('.np-oath-story').filter({ has: page.locator('summary', { hasText: 'Manifestation de l’arme' }) }).locator('p').textContent(), pugiliste.branches[0].ability.manifestation);
    assert.match(await page.locator('#p-serm-c').textContent(), /Pugiliste/);
    assert.equal(await page.locator('#p-serm-c .np-sheet-branch').count(), 2);
    assert.ok(await page.locator('#p-serm-c img[src$=".jpg"]').count());
    await page.evaluate(() => openChangeBranch('p_alice'));
    await page.locator('input[name="branch-sel"]').nth(2).check({ force: true });
    await save(() => page.locator('button[onclick="saveChangeBranch()"]').click());
    assert.equal((await storedAlice()).branch, pugiliste.branches[1].nom);
    const combatPalier = await page.evaluate(() => {
      const saved = _cs;
      try { _cs = { fighters: [{ pid: 'p_alice', level: 10, type: 'player', classe: 'Pugiliste' }] }; const current = cGetFighterSerment(0); return { name: current.branch.nom, ability: current.palier.nom, count: current.paliers.length, level: current.level };  }
      finally { _cs = saved; }
    });
    assert.deepEqual(combatPalier, { name: pugiliste.branches[1].nom, ability: pugiliste.branches[1].ability.nom, count: 1, level: 10 });
    observations.push('La seconde branche se sélectionne, se sauvegarde et fournit sa capacité unique au niveau réel 10 au combat.');

    const beforeEvolution = await storedAlice();
    await page.evaluate(() => openChangeSerm('p_alice'));
    await page.locator('#mcs-sel').selectOption('Guetteur');
    const beforeWrongParent = await app.read('players');
    await page.locator('button[onclick="saveChangeSerm()"]').click();
    assert.deepEqual(await app.read('players'), beforeWrongParent, 'Le parent requis est contrôlé avant toute sauvegarde.');
    await page.locator('#mcs-sel').selectOption('Cestuaire');
    await save(() => page.locator('button[onclick="saveChangeSerm()"]').click());
    await page.waitForFunction(() => gpid('p_alice').classe === 'Cestuaire');
    const evolved = await storedAlice();
    assert.equal(evolved.branch, 'Aucune');
    assert.equal(evolved.level, beforeEvolution.level);
    assert.equal(evolved.xp, beforeEvolution.xp);
    assert.equal(evolved.sermentBranches.Pugiliste, beforeEvolution.branch, 'L’évolution mémorise la branche déjà acquise du parent.');
    for (const stat of ['pvMax', 'epMax', 'emMax']) assert.equal(evolved[stat], beforeEvolution[stat]);
    await page.evaluate(() => openChangeBranch('p_alice'));
    await page.locator('input[name="branch-sel"]').nth(1).check({ force: true });
    await save(() => page.locator('button[onclick="saveChangeBranch()"]').click());
    const evolvedBranch = expansion.definitions['Cestuaire'].branches[0].nom;
    assert.equal((await storedAlice()).branch, evolvedBranch);
    await save(() => page.evaluate(() => adjVal('p_alice', 'level', 1)));
    const level11 = await storedAlice();
    assert.equal(level11.level, 11);
    for (const [stat, growth] of [['pvMax', 'pvN'], ['epMax', 'epN'], ['emMax', 'emN']]) assert.equal(level11[stat], evolved[stat] + pugiliste[growth]);
    await page.reload({ waitUntil: 'load' });
    await ready();
    assert.equal(await page.evaluate(() => gpid('p_alice').classe), 'Cestuaire');
    assert.equal(await page.evaluate(() => gpid('p_alice').branch), evolvedBranch);
    await page.evaluate(() => loadPlayer('p_alice'));
    assert.equal(await page.locator('#p-serm-c .serm-mini-step').count(), 0);
    await assertOperationCards(page.locator('#p-serm-c .np-sheet-branch.is-chosen .serm-palier-focus'), expansion.definitions.Cestuaire.branches[0].ability, 11);
    const downloading = page.waitForEvent('download');
    await page.evaluate(() => exportDB());
    const download = await downloading;
    const exported = path.join(output, 'export-local.json');
    await download.saveAs(exported);
    const exportedAlice = JSON.parse(fs.readFileSync(exported, 'utf8')).players.find(player => player.id === 'p_alice');
    assert.equal(exportedAlice.classe, 'Cestuaire');
    assert.equal(exportedAlice.branch, evolvedBranch);
    observations.push('Évolution Pugiliste → Cestuaire : niveau/XP conservés, branche réinitialisée puis choisie, croissance héritée au niveau suivant, reload et export JSON persistants.');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(output, 'fiche-evolution-mobile.png'), fullPage: true, animations: 'disabled' });
    await page.locator('#p-serm-c').screenshot({ path: path.join(output, 'fiche-serment-mobile-detail.png'), animations: 'disabled', style: '.notif { visibility:hidden!important; }' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    const aliceContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const aliceSession = await app.cookie('alice');
    await aliceContext.addCookies([{ name: 'np_session', value: aliceSession.slice('np_session='.length), url: app.origin, httpOnly: true, sameSite: 'Strict' }]);
    const alicePage = await aliceContext.newPage();
    alicePage.on('pageerror', error => errors.push(error.stack || error.message));
    await alicePage.route('https://**/*', route => route.abort());
    await alicePage.goto(app.origin, { waitUntil: 'load' });
    await alicePage.waitForFunction(() => window.CU && (CU.pseudo || CU.name) === 'Alice');
    await alicePage.evaluate(() => openRpgPrototype());
    await alicePage.waitForFunction(() => document.querySelector('#rpg-sync-status')?.textContent === 'Synchronisé');
    await inspectHandlers(alicePage, 'RPG lié');
    const linkedRpg = (await app.read('rpg_characters')).value.find(record => record.ownerId === 'alice');
    assert.equal(linkedRpg.oath, 'Cestuaire', 'La restriction des départs ne rétrograde pas un personnage déjà évolué.');
    assert.equal(linkedRpg.level, 11);
    assert.equal(linkedRpg.sourcePlayerId, 'p_alice');
    await aliceContext.close();
    const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const guest = await guestContext.newPage();
    guest.on('pageerror', error => errors.push(error.stack || error.message));
    await guest.route('https://**/*', route => route.abort());
    await guest.goto(app.origin, { waitUntil: 'load' });
    await guest.evaluate(() => openRpgPrototype());
    await guest.locator('#rpg-create-class').waitFor({ state: 'visible' });
    assert.equal(await guest.locator('[data-rpg-create-class]').count(), 16);
    assert.equal(await guest.locator('[data-rpg-create-class="Cestuaire"]').count(), 0);
    await guest.locator('#rpg-create-name').fill('Arbalétrière locale');
    await guest.locator('[data-rpg-create-class="Arbalétrier"]').click();
    await guest.locator('button[onclick="rpgCreateCharacter()"]').click();
    assert.equal(await guest.evaluate(() => JSON.parse(localStorage.getItem('np_rpg_guest_v2')).oath), 'Arbalétrier');
    await guest.evaluate(() => rpgSetOath('Guetteur'));
    assert.equal(await guest.evaluate(() => JSON.parse(localStorage.getItem('np_rpg_guest_v2')).oath), 'Arbalétrier', 'Un appel direct ne donne pas gratuitement une évolution.');
    await guest.reload({ waitUntil: 'load' });
    await guest.evaluate(() => openRpgPrototype());
    assert.match(await guest.locator('.rpg-hud').textContent(), /Arbalétrier/);
    assert.equal(await guest.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await guest.screenshot({ path: path.join(output, 'rpg-local-mobile.png'), fullPage: true, animations: 'disabled' });
    observations.push('Prototype RPG : le personnage lié conserve Cestuaire niveau 11 ; 16 départs, Arbalétrier local conservé après reload et changement direct vers une évolution refusé.');

    await page.setViewportSize({ width: 1440, height: 1000 });
    async function prepareCombat(ids, addBeast) {
      await page.evaluate(({ ids, addBeast }) => {
        switchDropTab('combat-mj', null, '');
        combatNewFromArchive();
        ids.forEach(id => combatToggleFighter(id, 'player'));
        for (let i = 0; i < (typeof addBeast === 'number' ? addBeast : addBeast ? 1 : 0); i++) combatAddBeast('visible');
        _cs.name = 'Audit local des serments';
        rCombat('p-combat-mj-c');
      }, { ids, addBeast });
      await page.locator('#p-combat-mj-c button[onclick="combatStart()"]').click();
    }
    // Exercise the real main.js resolution and archive services, not a mocked engine.
    await prepareCombat(['p_bob'], true);
    assert.ok(await page.locator('#p-combat-mj-c img[alt="Arme du serment Arbalétrier"]').count());
    assert.equal(await page.locator('#np70-verify-0').count(), 0, 'No material checkbox gates deterministic abilities.');
    const initial = await page.evaluate(() => ({ ep: _cs.fighters[0].epCur, em: _cs.fighters[0].emCur, hp: _cs.fighters[1].pvCur }));
    const beforeInvalid = await page.evaluate(() => JSON.stringify(_cs.decl));
    assert.equal(await page.evaluate(() => NPSermentsReforgedCombat.perform(0,'shoot',{target:1}).ok), false);
    assert.equal(await page.evaluate(() => JSON.stringify(_cs.decl)), beforeInvalid);
    assert.deepEqual(await page.locator('.rf-combat > .rf-operation button strong').allTextContents(), ['Armer l’arbalète'], 'Le premier geste utile est isolé des opérations en attente.');
    assert.equal(await page.locator('.rf-waiting').getAttribute('open'), null);
    assert.equal(await page.locator('.rf-waiting [data-rf-operation="shoot"]').isVisible(), false, 'Le tir impossible reste replié au départ.');
    assert.equal(await page.locator('.rf-waiting select').count(), 0, 'Un geste indisponible ne présente pas de cible à choisir.');
    await page.locator('.rf-operation button').filter({hasText:/Armer l’arbalète/}).click();
    assert.equal(await page.evaluate(() => NPSermentsReforgedCombat.getState(0).loaded), 1);
    assert.equal(await page.evaluate(() => _cs.fighters[0].epCur), initial.ep, 'Declarations reserve, without spending early.');
    assert.equal(await page.evaluate(() => _cs.fighters[0]._rf.loaded), 0, 'La prévision ne devient pas prématurément un chargement résolu.');
    assert.match(await page.locator('.rf-combat-head').textContent(), /Prévu après tes actions/);
    assert.deepEqual(await page.locator('.rf-combat > .rf-operation button strong').allTextContents(), ['Tirer un carreau', 'Surarmer le cran'], 'Une fois chargée, l’arbalète permet de tirer ou de surarmer dès le niveau 2.');
    assert.equal(await page.locator('#rf-target-0-shoot').inputValue(), '1', 'L’unique adversaire vivant est présélectionné.');
    assert.equal(await page.locator('#rf-target-0-shoot option[value="0"]').count(), 0, 'Le tireur ne peut pas se choisir comme adversaire.');
    await page.evaluate(() => cUndoLastDecl(0));
    assert.equal(await page.evaluate(() => NPSermentsReforgedCombat.getState(0).loaded), 0, 'Undo removes projected loading.');
    await page.locator('.rf-operation button').filter({hasText:/Armer l’arbalète/}).click();
    assert.equal(await page.locator('#rf-target-0-shoot').inputValue(), '1');
    await page.locator('.rf-operation button').filter({hasText:/Tirer un carreau/}).click();
    const reserved = await page.evaluate(() => (_cs.decl[0]||[]).reduce((n,a)=>n+(a.epCost||0),0));
    assert.equal(await page.evaluate(() => NPSermentsReforgedCombat.getState(0).ammo), 5);
    await page.evaluate(() => cDeclareAction(0,'passer'));
    await page.evaluate(() => cDeclareAction(1,'passer'));
    await page.locator('#p-combat-mj-c button[onclick="combatResolve()"]').click();
    const resolved = await page.evaluate(() => ({ ep: _cs.fighters[0].epCur, em: _cs.fighters[0].emCur, hp: _cs.fighters[1].pvCur, state: NPSermentsReforgedCombat.getState(0) }));
    assert.equal(resolved.ep, initial.ep-reserved, 'Each declared cost paid exactly once.');
    assert.equal(resolved.em, initial.em);
    assert.ok(resolved.hp < initial.hp, 'An actual hit is applied by main.js.');
    assert.equal(resolved.state.ammo,5);assert.equal(resolved.state.loaded,0);
    const combatId = await page.evaluate(async () => { await combatSaveArc({manual:true});return _cs.id; });
    const savedState = await page.evaluate(() => JSON.parse(JSON.stringify(_cs.fighters[0]._rf)));
    await page.evaluate(() => combatNewFromArchive());
    await page.evaluate(id=>combatLoadArchive(id),combatId);
    assert.deepEqual(await page.evaluate(() => _cs.fighters[0]._rf),savedState,'Archive reload preserves all charges and commitments.');
    await page.waitForFunction(() => !_combatAutosaveTimer && !_combatArchiveAdminPrimePromise && !Object.keys(_combatArchiveSaveQueue).length);
    await page.evaluate(() => _primeAllCombatArchivesForAdmin(false));
    assert.equal(await page.evaluate(() => _primeAllCombatArchivesForAdmin(false)),false,'Unchanged archive refresh does not loop.');
    await page.locator('.rf-combat').first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, 'combat-reforged.png'), animations: 'disabled' });
    await page.setViewportSize({width:390,height:844});
    await page.locator('.rf-combat').first().scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth>innerWidth+1),false);
    await page.screenshot({ path: path.join(output, 'combat-reforged-mobile.png'), animations: 'disabled' });
    observations.push('Combat réel : chargement réversible, tir sans case MJ, paiement unique, consommation de la munition, sauvegarde et restauration des engagements.');

    // Devices and deferred damage must also work inside the complete browser lifecycle.
    await page.setViewportSize({width:1440,height:1000});
    async function assignLocalCombatOath(name, branch = 0){
      await page.evaluate(({name,branch})=>{const p=gpid('p_bob'),d=getAllSD()[name];Object.assign(p,{classe:name,branch:d.branches[branch].nom,level:10,pvCur:100,pvMax:100,epCur:100,epMax:100,emCur:100,emMax:100});},{name,branch});
    }
    async function finishDeclarations(){
      await page.evaluate(()=>{let safety=0;while(_cs.phase==='declaration'&&safety++<12)cDeclareAction(_cs.order[_cs.turn],'passer');if(_cs.phase!=='resolution')throw new Error('Declaration stalled');combatResolve();});
    }
    await assignLocalCombatOath('Totémiste');
    await prepareCombat(['p_bob','p_alice'],true);
    assert.equal(await page.evaluate(()=>NPSermentsReforgedCombat.perform(0,'plant',{}).ok),true);
    await finishDeclarations();
    const device=await page.evaluate(()=>{const i=_cs.fighters.findIndex(f=>f._rfDevice);return {index:i,actions:cActionsMax(i),inOrder:_cs.order.includes(i)};});
    assert.ok(device.index>=0);assert.equal(device.actions,0);assert.equal(device.inOrder,false);
    await page.evaluate(()=>combatRemoveFighter(1));
    await finishDeclarations();
    const beforeCommand=await page.evaluate(()=>_cs.fighters[1].pvCur);
    assert.equal(await page.evaluate(()=>NPSermentsReforgedCombat.perform(0,'command',{target:1}).ok),true);
    await finishDeclarations();
    assert.ok(await page.evaluate(()=>_cs.fighters[1].pvCur)<beforeCommand);
    assert.equal(await page.evaluate(()=>NPSermentsReforgedCombat.getState(0).charges),0);
    observations.push('Totémiste réel : idole ciblable sans tour, retrait d’un allié sans blocage, ordre payé et charge consommée.');

    await assignLocalCombatOath('Bastion');
    await prepareCombat(['p_bob'],true);
    assert.equal(await page.evaluate(()=>NPSermentsReforgedCombat.perform(0,'brace',{}).ok),true);
    await page.evaluate(()=>{_cs.fighters[1].dmgBase=38;cDeclareAction(0,'passer');cDeclareAction(1,'frappe',{target:0});});
    await finishDeclarations();
    assert.equal(await page.evaluate(()=>_cs.fighters[0].pvCur),90);
    assert.equal(await page.evaluate(()=>NPSermentsReforgedCombat.getState(0).debt),30);
    assert.equal(await page.evaluate(()=>NPSermentsReforgedCombat.perform(0,'pay',{}).ok),true);
    await finishDeclarations();
    assert.equal(await page.evaluate(()=>_cs.fighters[0].pvCur),78);
    assert.equal(await page.evaluate(()=>NPSermentsReforgedCombat.getState(0).debt),0);
    observations.push('Bastion réel : impact partiellement différé, dette réduite par une action puis reliquat payé une seule fois.');

    // Decisions remain usable without pretending that incompatible targets exist.
    await assignLocalCombatOath('Distillateur', 1);
    await prepareCombat(['p_bob'], true);
    const extractCard = page.locator('[data-rf-operation="extract"]');
    assert.equal(await extractCard.locator('button').isDisabled(), true);
    assert.equal(await extractCard.locator('select').count(), 0);
    assert.match(await extractCard.locator('small').textContent(), /Aucun allié.*compatible/);
    assert.equal(await page.locator('[data-rf-operation="mother"] button').isEnabled(), true, 'La dose mère fournit un départ jouable sans protection à extraire.');
    await page.locator('[data-rf-operation="mother"] button').click();
    assert.equal(await page.locator('[data-rf-operation="release"] button').isEnabled(), true);
    assert.equal(await page.locator('#rf-target-0-release').inputValue(), '0', 'Le seul bénéficiaire compatible est présélectionné, y compris le porteur autorisé.');
    await page.locator('.rf-combat').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, 'gameplay-distillateur-desktop.png'), animations: 'disabled' });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await page.locator('[data-rf-operation="release"]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, 'gameplay-distillateur-mobile.png'), animations: 'disabled' });
    observations.push('Distillateur : extraction sans cible compatible repliée, dose mère disponible, restitution à l’unique bénéficiaire présélectionnée, lecture mobile sans débordement.');

    await page.setViewportSize({ width: 1440, height: 1000 });
    await prepareCombat(['p_bob', 'p_alice'], true);
    await page.evaluate(() => {
      // Isolated effect fixture: only Alice carries a living owner's protection.
      _cs.fighters[1]._rfEffects = [{ kind: 'shield', owner: cEnsureFighterCid(_cs.fighters[0]), amount: 24, expires: _cs.round + 2 }];
      rCombat('p-combat-mj-c');
    });
    assert.deepEqual(await page.locator('#rf-target-0-extract option[value]:not([value=""])').evaluateAll(options => options.map(option => option.value)), ['1'], 'Le prélèvement propose seulement les bénéficiaires porteurs d’un effet compatible.');
    assert.equal(await page.locator('#rf-target-0-extract').inputValue(), '1');
    await page.locator('[data-rf-operation="extract"] button').click();
    assert.equal(await page.evaluate(() => NPSermentsReforgedCombat.getState(0).pool), 24);

    await assignLocalCombatOath('Entraveur');
    await prepareCombat(['p_bob'], 2);
    await page.locator('#rf-target-0-link').selectOption('1');
    assert.equal(await page.locator('#rf-second-0-link option[value="1"]').count(), 0, 'La seconde cible ne peut pas répéter la première.');
    assert.equal(await page.locator('#rf-second-0-link').inputValue(), '2', 'La seconde cible unique restante est présélectionnée.');
    await page.locator('[data-rf-operation="link"] button').click();
    assert.equal(await page.evaluate(() => NPSermentsReforgedCombat.getState(0).targets.length), 2);
    observations.push('Sélection compatible : extraction proposée seulement sur l’allié réellement protégé ; deux ennemis distincts imposés et seconde cible unique présélectionnée.');

    await assignLocalCombatOath('Ravageur', 1);
    await prepareCombat(['p_bob'], true);
    const bloodCard = page.locator('[data-rf-operation="strike"]');
    assert.match(await bloodCard.locator('button > span').textContent(), /4 PV/);
    await bloodCard.locator('button').click();
    assert.match(await bloodCard.locator('button > span').textContent(), /8 PV/, 'Le prochain prix de sang reflète la mise déjà déclarée.');
    assert.equal(await page.evaluate(() => _cs.fighters[0].pvCur), 100, 'La mise reste une réservation avant résolution.');
    assert.match(await page.locator('.rf-combat-head').textContent(), /Prévu après tes actions/);
    await page.locator('.rf-combat').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, 'gameplay-ravageur-desktop.png'), animations: 'disabled' });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await page.locator('.rf-combat').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, 'gameplay-ravageur-mobile.png'), animations: 'disabled' });
    await finishDeclarations();
    assert.equal(await page.evaluate(() => _cs.fighters[0].pvCur), 96, 'La mise affichée est effectivement payée une seule fois à la résolution.');
    observations.push('Ravageur : coût en PV visible et croissant dès les déclarations, état prévu explicitement nommé, paiement réel une seule fois, captures ordinateur et mobile.');

    await inspectHandlers(guest, 'RPG local');
    await inspectHandlers(page, 'Fiche');
    assert.deepEqual(invalidHandlers, [], 'Les contrôles générés produisent des handlers JavaScript valides.');
    assert.deepEqual(errors, []);
    assert.deepEqual(app.errors, []);
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ observations, requests: app.requests, errors }, null, 2));
    console.log(observations.map(observation => 'OK ' + observation).join('\n'));
  } catch (error) {
    if (page) await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true, animations: 'disabled' }).catch(() => {});
    console.error('Browser errors:', errors);
    console.error('Invalid handlers:', invalidHandlers);
    if (page) console.error('Session:', await page.evaluate(() => ({ user: window.CU, errors: document.querySelector('#login-err')?.textContent })).catch(() => null));
    throw error;
  } finally {
    if (browser) await browser.close();
    await app.close();
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
