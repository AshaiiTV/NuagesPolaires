'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { chromium } = require('playwright');
const { createLocalApp } = require('./helpers/local-app');

// Real browser, production handlers and an isolated PostgreSQL fixture. These
// legacy names represent stored user data, not names offered to new characters.
(async () => {
  const app = await createLocalApp();
  const output = path.resolve(process.env.NP_TEST_OUTPUT || 'test-results/archer');
  fs.mkdirSync(output, { recursive: true });
  let browser, page;
  const errors = [], observations = [];
  try {
    const source = fs.readFileSync(path.join(app.ROOT, 'assets/js/main.js'), 'utf8');
    const start = source.indexOf('var SD='), end = source.indexOf('\n};', start);
    const catalogue = vm.runInNewContext(source.slice(start, end + 3) + ';SD');
    const definition = JSON.parse(JSON.stringify(catalogue.Archer || catalogue['Flécheur']));
    definition.lore = 'Personnalisation du staff : la corde garde la trace des voyages.';
    await app.seed('serments_custom', { 'Flécheur': definition });

    const players = (await app.read('players')).value;
    const alice = players.find(player => player.id === 'p_alice');
    Object.assign(alice, {
      classe: 'Flécheur', arme: 'Arc du serment', branch: definition.bB.nom,
      sermentBranches: { 'Flécheur': definition.bB.nom },
      level: 10, xp: 217, xpMax: 300,
      pvMax: 57, pvCur: 41, epMax: 95, epCur: 67, emMax: 56, emCur: 44,
      inventory: [{ id: 'souvenir', name: 'Ruban de voyage', qty: 2 }],
      journal: 'Le récit personnel reste intact.'
    });
    const preservedFields = ['level', 'xp', 'xpMax', 'pvMax', 'pvCur', 'epMax', 'epCur', 'emMax', 'emCur', 'branch', 'inventory', 'journal'];
    const preserved = Object.fromEntries(preservedFields.map(key => [key, alice[key]]));
    await app.seed('players', players);

    const legacyCombat = {
      id: 'legacy-archer-combat', name: 'Sauvegarde antérieure au renommage', _owner: 'Admin',
      active: true, round: 2, initiative: 0, order: [0, 1], turn: 0,
      phase: 'declaration', reforgedVersion: 2, decl: {}, _iv: {}, log: [],
      savedAt: Date.now(), _manualSaved: true, _inProgress: true,
      fighters: [
        { type: 'player', pid: alice.id, name: alice.name, classe: 'Flécheur', level: 10,
          pvMax: 57, pvCur: 39, epMax: 95, epCur: 61, emMax: 56, emCur: 32, dmgBase: 10, statuts: [], _cid: 'old-archer' },
        { type: 'beast', bid: 'visible', name: 'Loup', level: 10,
          pvMax: 300, pvCur: 300, epMax: 100, epCur: 100, emMax: 0, emCur: 0, dmgBase: 6, statuts: [], _cid: 'old-wolf' }
      ]
    };
    await app.seed('combat_arc_Admin', [legacyCombat]);

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const cookie = await app.cookie('admin');
    await context.addCookies([{ name: 'np_session', value: cookie.slice('np_session='.length), url: app.origin, httpOnly: true, sameSite: 'Strict' }]);
    page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => errors.push(error.stack || error.message));
    await page.route('https://**/*', route => route.abort());
    const ready = async () => {
      await page.waitForFunction(() => window.CU && (CU.pseudo || CU.name) === 'Admin');
      await page.waitForFunction(() => !document.getElementById('login-transition-overlay')?.classList.contains('active'));
    };
    await page.goto(app.origin, { waitUntil: 'load' });
    await ready();

    const migrated = await page.evaluate(() => gpid('p_alice'));
    assert.equal(migrated.classe, 'Archer');
    assert.deepEqual(Object.fromEntries(preservedFields.map(key => [key, migrated[key]])), preserved);
    const merged = await page.evaluate(() => ({ names: Object.keys(getAllSD()), archer: getAllSD().Archer }));
    assert.equal(merged.names.filter(name => /^(?:Archer|Flécheur|Flecheur)$/.test(name)).length, 1);
    assert.equal(merged.archer.lore, definition.lore, 'The old custom definition is still applied under Archer.');
    assert.equal(merged.archer.bB.nom, definition.bB.nom);
    observations.push('Ancienne fiche et personnalisation staff reconnues comme Archer, sans doublon ni perte de branche, XP, ressources ou inventaire.');

    await page.evaluate(() => switchDropTab('serments', null, ''));
    const atlas = page.locator('#serments-grid.oath-atlas');
    assert.equal(await atlas.locator('.oath-list-item[data-serment="Archer"]').count(), 1);
    assert.equal(await atlas.locator('.oath-list-item[data-serment="Flécheur"]').count(), 0);
    await atlas.locator('.oath-list-item[data-serment="Archer"]').click();
    assert.doesNotMatch(await atlas.innerText(), /Fl[ée]cheur/i);
    const painting = atlas.locator('img[alt="Arme du serment Archer"]').first();
    await painting.scrollIntoViewIfNeeded();
    await painting.evaluate(image => image.complete ? Promise.resolve() : new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; }));
    assert.ok(await painting.evaluate(image => image.naturalWidth > 0), 'The painted bow still loads.');
    await page.screenshot({ path: path.join(output, 'forge-archer.png'), animations: 'disabled' });

    await page.evaluate(() => loadPlayer('p_alice'));
    await page.locator('#p-serm-c').waitFor({ state: 'visible' });
    assert.match(await page.locator('#p-serm-c').innerText(), /Archer/);
    assert.doesNotMatch(await page.locator('#p-serm-c').innerText(), /Fl[ée]cheur/i);
    await page.evaluate(() => openChangeSerm('p_alice'));
    assert.equal(await page.locator('#mcs-sel option[value="Archer"]').count(), 1);
    assert.equal(await page.locator('#mcs-sel option[value="Flécheur"]').count(), 0);
    assert.equal(await page.locator('#mcs-sel').inputValue(), 'Archer');
    await page.locator('#m-changeserm .mclose').click();

    const aliceContext = await browser.newContext();
    const aliceCookie = await app.cookie('alice');
    await aliceContext.addCookies([{ name: 'np_session', value: aliceCookie.slice('np_session='.length), url: app.origin, httpOnly: true, sameSite: 'Strict' }]);
    const alicePage = await aliceContext.newPage();
    alicePage.on('pageerror', error => errors.push(error.stack || error.message));
    await alicePage.route('https://**/*', route => route.abort());
    await alicePage.goto(app.origin, { waitUntil: 'load' });
    await alicePage.waitForFunction(() => window.CU && CU.pid === 'p_alice');
    await alicePage.addScriptTag({ url: app.origin + '/assets/vendor/jspdf/jspdf.umd.min.js' });
    await alicePage.evaluate(() => {
      const Original = window.jspdf.jsPDF;
      window.__archerPdfText = [];
      window.jspdf.jsPDF = function (options) {
        const doc = new Original(options), text = doc.text;
        doc.text = function (value) { window.__archerPdfText.push(Array.isArray(value) ? value.join('\n') : String(value)); return text.apply(this, arguments); };
        return doc;
      };
    });
    const downloadPromise = alicePage.waitForEvent('download');
    assert.equal(await alicePage.evaluate(() => exportFichePDF()), true);
    await (await downloadPromise).saveAs(path.join(output, 'Fiche_Archer.pdf'));
    const pdfText = await alicePage.evaluate(() => __archerPdfText.join('\n'));
    assert.match(pdfText, /Archer/i);
    assert.doesNotMatch(pdfText, /Fl[ée]cheur/i);
    await aliceContext.close();
    observations.push('Forge, fiche, sélecteur et vrai PDF affichent Archer ; l’illustration peinte est chargée.');

    await page.evaluate(async () => {
      switchDropTab('combat-mj', null, '');
      await _primeAllCombatArchivesForAdmin(true);
      await combatLoadArchive('legacy-archer-combat');
    });
    const restored = await page.evaluate(() => ({ id: _cs.id, fighter: _cs.fighters[0], options: cGetAbilityOptions(0, 3) }));
    assert.equal(restored.id, legacyCombat.id);
    assert.equal(restored.fighter.classe, 'Archer');
    for (const key of ['pvCur', 'epCur', 'emCur']) assert.equal(restored.fighter[key], legacyCombat.fighters[0][key]);
    assert.deepEqual(restored.options.map(option => [option.value, option.consumeActions, option.emCost]), [[29, 1, 8], [38, 2, 8], [48, 3, 8]], 'An in-progress historical combat keeps its original Judgment rules.');
    assert.doesNotMatch(await page.locator('#p-combat-mj-c').innerText(), /Fl[ée]cheur/i);

    await page.evaluate(() => {
      combatNewFromArchive();
      combatToggleFighter('p_alice', 'player');
      combatAddBeast('visible');
      _cs.name = 'Nouveau combat de l’Archer';
      rCombat('p-combat-mj-c');
    });
    await page.locator('#p-combat-mj-c button[onclick="combatStart()"]').click();
    const current = await page.evaluate(() => ({ fighter: _cs.fighters[0], options: cGetAbilityOptions(0, 3) }));
    assert.equal(current.fighter.classe, 'Archer');
    assert.deepEqual(current.options.map(option => [option.value, option.consumeActions, option.emCost]), [[33, 1, 8], [40, 2, 8], [46, 3, 8]], 'The current linear Judgment remains numerically unchanged.');
    assert.ok(current.options.every(option => option.noOverclock));
    assert.ok(await page.locator('#p-combat-mj-c img[alt="Arme du serment Archer"]').count());
    observations.push('Archive antérieure restaurée avec ses ressources et dégâts historiques ; nouveau combat Archer conserve les trois Jugements linéaires, leurs coûts et la restriction de surcadençage.');

    await page.evaluate(async () => { await up(gpid('p_alice')); });
    const stored = (await app.read('players')).value.find(player => player.id === 'p_alice');
    assert.equal(stored.classe, 'Archer');
    assert.deepEqual(Object.fromEntries(preservedFields.map(key => [key, stored[key]])), preserved);
    await page.reload({ waitUntil: 'load' });
    await ready();
    assert.equal(await page.evaluate(() => gpid('p_alice').classe), 'Archer');

    const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const guest = await guestContext.newPage();
    guest.on('pageerror', error => errors.push(error.stack || error.message));
    await guest.route('https://**/*', route => route.abort());
    await guest.goto(app.origin, { waitUntil: 'load' });
    await guest.evaluate(() => openRpgPrototype());
    assert.equal(await guest.locator('[data-rpg-create-class="Archer"]').count(), 1);
    assert.equal(await guest.locator('[data-rpg-create-class="Flécheur"]').count(), 0);
    await guest.locator('#rpg-create-name').fill('Archer de voyage');
    await guest.locator('[data-rpg-create-class="Archer"]').click();
    await guest.locator('button[onclick="rpgCreateCharacter()"]').click();
    assert.equal(await guest.evaluate(() => JSON.parse(localStorage.getItem('np_rpg_guest_v2')).oath), 'Archer');
    await guest.evaluate(() => { const character = JSON.parse(localStorage.getItem('np_rpg_guest_v2')); character.oath = 'Flécheur'; character.gold = 77; localStorage.setItem('np_rpg_guest_v2', JSON.stringify(character)); });
    await guest.reload({ waitUntil: 'load' });
    await guest.evaluate(() => openRpgPrototype());
    assert.match(await guest.locator('.rpg-hud').innerText(), /Archer/);
    assert.doesNotMatch(await guest.locator('.rpg-hud').innerText(), /Fl[ée]cheur/i);
    assert.match(await guest.locator('.rpg-hud').innerText(), /77 or/);
    observations.push('Création RPG mobile Archer et ancienne sauvegarde locale Flécheur reconnue, avec son or conservé.');

    assert.equal(migrated.sermentBranches.Archer, definition.bB.nom);
    assert.equal(Object.hasOwn(migrated.sermentBranches, 'Flécheur'), false);
    assert.deepEqual(errors, []);
    assert.deepEqual(app.errors, []);
    fs.writeFileSync(path.join(output, 'observations.json'), JSON.stringify({ observations, errors }, null, 2) + '\n');
    console.log('Archer browser: PASS — ' + observations.join(' '));
  } catch (error) {
    if (page) await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
    throw error;
  } finally {
    if (browser) await browser.close();
    await app.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
