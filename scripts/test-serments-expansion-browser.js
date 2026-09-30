'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createLocalApp } = require('./helpers/local-app');
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
    const tierErrors = await page.evaluate(() => {
      const failures = [], savedCombat = _cs, savedPlayerLookup = window.gpid;
      let fixture;
      try {
        window.gpid = id => id === 'qa-tier' ? fixture : savedPlayerLookup(id);
        _cs = { fighters: [{ pid: 'qa-tier', type: 'player', level: 1 }] };
        Object.entries(NPSermentsExpansion.definitions).forEach(([name, def]) => def.branches.forEach(branch => {
          const levels = [1, ...branch.paliers.flatMap(tier => [tier.niv - 1, tier.niv])];
          levels.forEach(level => {
            fixture = { id: 'qa-tier', classe: name, branch: branch.nom, level };
            const current = cGetFighterSerment(0);
            const unlocked = branch.paliers.filter(tier => tier.niv <= level);
            const expected = unlocked.length ? unlocked[unlocked.length - 1].niv : null;
            if ((current?.palier?.niv || null) !== expected) failures.push(name + ' / ' + branch.nom + ' / niv.' + level);
          });
        }));
      } finally { _cs = savedCombat; window.gpid = savedPlayerLookup; }
      return failures;
    });
    assert.deepEqual(tierErrors, [], 'Les 560 paliers se débloquent à leur niveau réel et jamais avant.');
    await page.evaluate(() => switchDropTab('serments', null, ''));
    const atlas = page.locator('#serments-grid.oath-atlas');
    const oathList = atlas.locator('.oath-list-item[data-serment]');
    assert.equal(await atlas.count(), 1);
    assert.equal(await atlas.locator('.oath-topbar h1').textContent(), 'La Forge des Serments');
    assert.equal(await oathList.count(), 34);
    assert.equal(await atlas.locator('.oath-list-item[data-level="basic"]').count(), 16);
    assert.equal(await atlas.locator('.oath-list-item[data-level="seasoned"]').count(), 18);
    await page.locator('#serm-level-filter button[data-level="seasoned"]').click();
    assert.equal(await atlas.locator('.oath-list-item:visible').count(), 18);
    await page.locator('#serm-level-filter button[data-level="basic"]').click();
    assert.equal(await atlas.locator('.oath-list-item:visible').count(), 16);
    await page.locator('#serment-search').fill('Pugiliste');
    assert.equal(await atlas.locator('.oath-list-item:visible').count(), 1);
    const playersBeforeAtlas = await app.read('players');
    await atlas.locator('.oath-list-item[data-serment="Pugiliste"]').click();
    assert.equal(await atlas.locator('.oath-identity blockquote').textContent(), '« ' + pugiliste.vow + ' »');
    await atlas.locator('[data-read-story]').click();
    assert.equal(await atlas.locator('.oath-codex').getAttribute('open'), '');
    assert.equal(await atlas.locator('.oath-hero-lore').count(), 2);
    assert.ok((await atlas.locator('.oath-world').textContent()).includes(pugiliste.awakening));
    assert.equal(await page.evaluate(() => document.activeElement?.parentElement?.className), 'oath-codex', 'Le récit reçoit le focus après ouverture.');
    await atlas.locator('.oath-codex > summary').click();
    assert.match(await page.locator('.oath-stage').textContent(), /Pugiliste/);
    assert.equal(await page.locator('.oath-tree .oath-path').count(), 2);
    assert.equal(await page.locator('.oath-tree .oath-node').count(), 8);
    assert.equal(await page.locator('.oath-hero-art img').count(), 1);
    assert.match(await page.locator('.oath-hero-art img').getAttribute('src'), /\/pugiliste\.jpg$/);
    const levelSlider = page.locator('#oath-level');
    await levelSlider.evaluate(element => {
      element.value = '1';
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    });
    assert.equal(await page.locator('.oath-tree .oath-node.is-locked').count(), 8, 'Les paliers de base restent verrouillés au niveau 1.');
    assert.equal(await atlas.locator('.oath-node.is-current').count(), 0, 'Aucun palier ne s’applique avant son niveau requis.');
    await levelSlider.evaluate(element => {
      element.value = '10';
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    });
    assert.equal(await page.locator('.oath-tree .oath-node.is-unlocked').count(), 8, 'Les huit paliers deviennent consultables au niveau 10.');
    assert.equal(await atlas.locator('.oath-node.is-current').count(), 1, 'Une seule capacité est active dans la voie choisie.');
    assert.equal(await atlas.locator('.oath-node.is-current').getAttribute('data-required-level'), '10');
    assert.equal(await atlas.locator('.oath-node-state').filter({ hasText: /^Remplacé$/ }).count(), 6, 'Les paliers précédents sont remplacés et ne se cumulent pas.');
    await atlas.locator('[data-oath-view="compare"]').click();
    assert.equal(await atlas.locator('.oath-map').isVisible(), false);
    assert.equal(await atlas.locator('.oath-compare-card:visible').count(), 2);
    for (const [index, branch] of pugiliste.branches.entries()) {
      const card = atlas.locator('.oath-compare-card').nth(index);
      assert.equal(await card.locator('.oath-compare-status').textContent(), 'Palier applicable · Niv. 10');
      assert.equal(await card.locator('.oath-inspector-effect p').textContent(), branch.paliers.find(tier => tier.niv === 10).desc);
    }
    await atlas.locator('[data-level-stop="5"]').click();
    assert.equal(await levelSlider.inputValue(), '5');
    for (const [index, branch] of pugiliste.branches.entries()) {
      const card = atlas.locator('.oath-compare-card').nth(index);
      assert.equal(await card.locator('.oath-compare-status').textContent(), 'Palier applicable · Niv. 5');
      assert.equal(await card.locator('.oath-inspector-effect p').textContent(), branch.paliers.find(tier => tier.niv === 5).desc);
    }
    await atlas.locator('[data-inspect-branch="1"]').click();
    assert.equal(await atlas.locator('.oath-map').isVisible(), true);
    assert.equal(await atlas.locator('.oath-node.is-current').getAttribute('data-node-branch'), '1');
    assert.equal(await atlas.locator('.oath-node.is-current').getAttribute('data-required-level'), '5');
    await atlas.locator('[data-level-stop="10"]').click();
    const unlockedNodes = page.locator('.oath-tree .oath-node.is-unlocked');
    await unlockedNodes.first().click();
    const firstPalier = await page.locator('.oath-inspector').textContent();
    await unlockedNodes.last().click();
    const lastPalier = await page.locator('.oath-inspector').textContent();
    assert.notEqual(lastPalier, firstPalier, 'L’inspecteur suit le nœud sélectionné.');
    assert.equal(await atlas.locator('.oath-inspector h3').textContent(), pugiliste.branches[1].paliers[3].nom);
    assert.equal(await atlas.locator('.oath-tier-story p').textContent(), pugiliste.branches[1].paliers[3].manifestation);
    assert.equal(await unlockedNodes.last().locator('.oath-node-title').textContent(), pugiliste.branches[1].paliers[3].nom);
    assert.ok(await unlockedNodes.last().evaluate(element => element.classList.contains('is-selected')));
    const secondBranch = atlas.locator('.oath-path-heading[data-choose-branch="1"]');
    await secondBranch.focus();
    await page.keyboard.press('Enter');
    assert.equal(await secondBranch.getAttribute('aria-pressed'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-choose-branch')), '1', 'Le changement de voie conserve le focus clavier.');
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__oathCopiedText = text; } } });
    });
    await atlas.locator('[data-copy-build]').click();
    await page.waitForFunction(() => document.querySelector('.oath-action-status')?.textContent === 'Parcours copié.');
    const copiedPath = await page.evaluate(() => window.__oathCopiedText);
    assert.match(copiedPath, /Pugiliste/);
    assert.match(copiedPath, /Aperçu au niveau 10 · Palier inspecté : niveau 10/);
    assert.ok(copiedPath.includes(pugiliste.branches[1].paliers.find(tier => tier.niv === 10).desc));
    await atlas.locator('.oath-evo-btn[data-evolution="Cestuaire"]').click();
    assert.match(await page.locator('.oath-hero-title').textContent(), /Cestuaire/);
    assert.equal(await levelSlider.inputValue(), '10', 'Le niveau exploré est conservé lors du passage à une évolution.');
    assert.match(await atlas.locator('.oath-root').textContent(), /NIVEAU 10/);
    await atlas.locator('.oath-evo-btn[data-evolution="Pugiliste"]').click();
    assert.equal(await levelSlider.inputValue(), '10');
    assert.equal(await atlas.locator('.oath-path-heading[aria-pressed="true"]').getAttribute('data-choose-branch'), '1', 'Revenir à l’origine retrouve la voie inspectée.');
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
    assert.equal(await levelSlider.inputValue(), '10', 'Un autre serment conserve aussi le niveau exploré.');
    assert.equal(await page.evaluate(() => document.activeElement?.className), 'oath-hero-title');
    await atlas.locator('[data-read-story]').click();
    assert.ok((await atlas.locator('.oath-world').textContent()).includes(expansion.definitions.Barde.worldRole));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Le récit et les titres de paliers tiennent sur mobile.');
    await page.setViewportSize({ width: 1440, height: 1000 });
    assert.equal(await atlas.locator('.oath-library-body').isVisible(), true);
    assert.deepEqual(await app.read('players'), playersBeforeAtlas, 'La consultation, la comparaison et la copie du parcours ne modifient pas les personnages.');
    await page.locator('#serment-search').fill('');
    const imageResults = await page.evaluate(async () => {
      const urls = Object.values(NPSermentsExpansion.definitions).map(def => def.logo);
      return Promise.all(urls.map(url => new Promise(resolve => { const image = new Image(); image.onload = () => resolve({ url, ok: image.naturalWidth > 0 }); image.onerror = () => resolve({ url, ok: false }); image.src = url; })));
    });
    assert.ok(imageResults.every(result => result.ok), JSON.stringify(imageResults.filter(result => !result.ok)));
    assert.equal(await page.locator('.oath-hero-art img[src$=".jpg"]').count(), 1);
    await page.screenshot({ path: path.join(output, 'catalogue-desktop.png'), animations: 'disabled' });
    observations.push('Forge effective : 83 serments, 34 publics, 16 basiques et 18 évolutions ; constellation, comparaison au niveau réel, paliers remplacés, copie du parcours, mémoire des voies et armurerie mobile ; peintures chargées sans écriture de personnage.');

    await page.evaluate(() => openEditBranch(encodeURIComponent('Pugiliste'), 0));
    await page.locator('#mbr-desc').fill('Description retouchée pour le test de conservation des règles.');
    await saveKey('serments_custom', () => page.locator('button[onclick="saveBranch()"]').click());
    let edited = (await app.read('serments_custom')).value.Pugiliste;
    assert.deepEqual(edited.branches[0].combatRules, pugiliste.branches[0].combatRules);
    assert.equal(edited.branches[0].descPhys, pugiliste.branches[0].descPhys);
    assert.equal(edited.branches[0].flavor, pugiliste.branches[0].flavor);
    await page.evaluate(() => openEditPalier(encodeURIComponent('Pugiliste'), 0, 0));
    await page.locator('#mpal-desc').fill(pugiliste.branches[0].paliers[0].desc + ' Note descriptive du test.');
    await saveKey('serments_custom', () => page.locator('button[onclick="savePalier()"]').click());
    edited = (await app.read('serments_custom')).value.Pugiliste;
    assert.deepEqual(edited.branches[0].paliers[0].combatRules, pugiliste.branches[0].paliers[0].combatRules);
    assert.equal(edited.branches[0].paliers[0].manifestation, pugiliste.branches[0].paliers[0].manifestation);
    assert.equal(edited.branches[0].roleplay, pugiliste.branches[0].roleplay);
    assert.deepEqual(edited.branches[0].combatRules, pugiliste.branches[0].combatRules);
    assert.equal(Object.hasOwn(edited, 'entry'), false);
    observations.push('Éditions réelles de branche et palier : texte sauvegardé, règles structurées et métadonnées intactes, copie de données superflue retirée.');

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
    assert.equal(await page.locator('#p-serm-c .np-oath-manifestation').textContent(), pugiliste.branches[0].paliers[3].manifestation);
    assert.match(await page.locator('#p-serm-c').textContent(), /Pugiliste/);
    assert.equal(await page.locator('#p-serm-c .np-sheet-branch').count(), 2);
    assert.ok(await page.locator('#p-serm-c img[src$=".jpg"]').count());
    await page.evaluate(() => openChangeBranch('p_alice'));
    await page.locator('input[name="branch-sel"]').nth(2).check({ force: true });
    await save(() => page.locator('button[onclick="saveChangeBranch()"]').click());
    assert.equal((await storedAlice()).branch, pugiliste.branches[1].nom);
    const combatPalier = await page.evaluate(() => {
      const saved = _cs;
      try { _cs = { fighters: [{ pid: 'p_alice', level: 10, type: 'player', classe: 'Pugiliste' }] }; const current = cGetFighterSerment(0); return { name: current.branch.nom, current: current.palier.niv }; }
      finally { _cs = saved; }
    });
    assert.deepEqual(combatPalier, { name: pugiliste.branches[1].nom, current: 10 });
    observations.push('La seconde branche se sélectionne, se sauvegarde et fournit le bon palier niveau 10 au combat.');

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
    assert.equal(await page.locator('#p-serm-c .np-sheet-branch.is-chosen .serm-mini-step.is-unlocked').count(), 1);
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
        if (addBeast) combatAddBeast('visible');
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
    await page.locator('.rf-operation button').filter({hasText:/Armer l’arbalète/}).click();
    assert.equal(await page.evaluate(() => NPSermentsReforgedCombat.getState(0).loaded), 1);
    assert.equal(await page.evaluate(() => _cs.fighters[0].epCur), initial.ep, 'Declarations reserve, without spending early.');
    await page.evaluate(() => cUndoLastDecl(0));
    assert.equal(await page.evaluate(() => NPSermentsReforgedCombat.getState(0).loaded), 0, 'Undo removes projected loading.');
    await page.locator('.rf-operation button').filter({hasText:/Armer l’arbalète/}).click();
    await page.locator('#rf-target-0-shoot').selectOption('1');
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
    async function assignLocalCombatOath(name){
      await page.evaluate(name=>{const p=gpid('p_bob'),d=getAllSD()[name];Object.assign(p,{classe:name,branch:d.branches[0].nom,level:10,pvCur:100,pvMax:100,epCur:100,epMax:100,emCur:100,emMax:100});},name);
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
