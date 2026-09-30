'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createLocalApp } = require('./helpers/local-app');
const { assertOperationCards, ruleAtLevel } = require('./helpers/serment-operation-assertions');

// Exercise real browser controls, production handlers and isolated PostgreSQL.
// The only fabricated API response is the intentional save-failure scenario.
(async () => {
  const app = await createLocalApp();
  const output = path.resolve(process.env.NP_TEST_OUTPUT || 'test-results/unified-progression');
  fs.mkdirSync(output, { recursive: true });
  let browser;
  let page;
  const errors = [];
  const observations = [];
  const dbUrl = '**/.netlify/functions/db';

  function progression(player) {
    return { level: player.level, xp: player.xp, xpMax: player.xpMax, version: player.progressionVersion };
  }
  function assertUnified(player, expected) {
    assert.deepEqual(progression(player), { ...expected, version: 1 });
    for (const field of ['sLevel', 'sXp', 'sXpMax']) {
      assert.equal(Object.hasOwn(player, field), false, 'Le champ hérité ' + field + ' doit être retiré.');
    }
  }

  try {
    const players = (await app.read('players')).value;
    Object.assign(players.find(player => player.id === 'p_alice'), {
      classe: 'Duelliste',
      arme: 'Épée moyenne du serment',
      branch: "Branche A — L'Élan Tranchant",
      level: 2, xp: 15, xpMax: 60,
      sLevel: 4, sXp: 35, sXpMax: 40,
      pvMax: 36, pvCur: 20, epMax: 56, epCur: 30, emMax: 22, emCur: 15,
      inventory: [{ id: 'gemme-blanche', name: 'Gemme Blanche', category: 'Gemme', qty: 3 }],
      history: []
    });
    delete players.find(player => player.id === 'p_alice').progressionVersion;
    await app.seed('players', players);

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => errors.push(error.stack || error.message));
    await page.route('https://**/*', route => route.abort());

    async function ready(pseudo) {
      await page.waitForFunction(name => window.CU && (CU.pseudo || CU.name) === name, pseudo);
      await page.waitForFunction(() => {
        const overlay = document.getElementById('login-transition-overlay');
        const flash = document.getElementById('lto-flash');
        return (!overlay || !overlay.classList.contains('active')) && (!flash || getComputedStyle(flash).opacity === '0');
      });
    }
    async function login(pseudo) {
      await page.evaluate(() => showScreen('s-login'));
      await page.locator('#login-id').fill(pseudo);
      await page.locator('#login-pass').fill(pseudo + '-audit-123!');
      await page.locator('button[onclick="loginUnified()"]').click();
      await ready(pseudo);
    }
    async function alice() {
      return page.evaluate(() => gpid('p_alice'));
    }
    async function storedAlice() {
      return (await app.read('players')).value.find(player => player.id === 'p_alice');
    }
    async function openProfile() {
      await page.evaluate(() => loadPlayer('p_alice'));
      await page.locator('#xp-v').waitFor({ state: 'visible' });
    }
    async function waitProgression(level, xp) {
      await page.waitForFunction(expected => {
        const player = gpid('p_alice');
        return player && player.level === expected.level && player.xp === expected.xp;
      }, { level, xp });
    }
    function saveResponse() {
      const promise = page.waitForResponse(response => {
        if (!response.url().endsWith('/.netlify/functions/db')) return false;
        const body = response.request().postDataJSON();
        return body && body.action === 'set' && body.key === 'players';
      });
      promise.catch(() => {});
      return promise;
    }
    async function clickSave(selector) {
      const response = saveResponse();
      await page.locator(selector).click();
      return response;
    }
    async function assertLinearAbility(level) {
      await openProfile();
      const chosen = page.locator('#p-serm-c .np-sheet-branch.is-chosen');
      assert.equal(await page.locator('#p-serm-c .serm-mini-step').count(), 0, 'La fiche ne propose plus de rail de paliers.');
      const combat = await page.evaluate(() => {
        const previous = _cs;
        try {
          _cs = { fighters: [{ pid: 'p_alice', level: gpid('p_alice').level }] };
          const serment = cGetFighterSerment(0);
          return { level: serment.level, ability: serment.branch.ability, palier: serment.palier, paliers: serment.paliers, options: cGetAbilityOptions(0, 3) };
        } finally { _cs = previous; }
      });
      assert.equal(combat.level, level, 'Le combat utilise le niveau commun réel.');
      assert.deepEqual(combat.palier, combat.ability);
      assert.deepEqual(combat.paliers, [combat.ability], 'La compatibilité du combat expose une seule capacité stable.');
      await assertOperationCards(chosen.locator('.serm-palier-focus'), combat.ability, level);
      assert.deepEqual(combat.options.map(option => option.value), [2 + 3 * level, 6 + 3 * level], 'Les deux frappes du Duelliste A gagnent exactement 3 dégâts à chaque niveau.');
      assert.deepEqual(combat.options.map(option => option.descText), combat.ability.combatRules.operations.map(operation => ruleAtLevel(operation, level)));
    }

    async function assertNativeLinearCombat() {
      const before = await alice();
      const matrix = await page.evaluate(() => {
        const previous = _cs, previousLookup = window.gpid, rows = [];
        let fixture;
        try {
          window.gpid = id => id === 'qa-native-linear' ? fixture : previousLookup(id);
          _cs = { fighters: [{ pid: 'qa-native-linear', level: 1, type: 'player' }] };
          const branches = getBranches('Duelliste', getAllSD().Duelliste);
          branches.forEach((branch, index) => [1, 2, 5, 7, 10, 35].forEach(level => {
            fixture = { id: 'qa-native-linear', classe: 'Duelliste', branch: branch.nom, level };
            const serment = cGetFighterSerment(0);
            rows.push({ index, level, count: serment.paliers.length, ability: serment.palier, options: cGetAbilityOptions(0, 3) });
          }));
        } finally { _cs = previous; window.gpid = previousLookup; }
        return rows;
      });
      assert.equal(matrix.length, 12);
      for (const row of matrix) {
        assert.equal(row.count, 1, 'La capacité native est accessible dès le niveau 1.');
        assert.deepEqual(row.options.map(option => option.value), row.index ? [3 + 2 * row.level] : [2 + 3 * row.level, 6 + 3 * row.level]);
        assert.deepEqual(row.options.map(option => option.descText), row.ability.combatRules.operations.map(operation => ruleAtLevel(operation, row.level)));
        assert.ok(row.options.every(option => option.consumeActions === 1 && option.epCost === 0 && option.emCost === (row.index ? 5 : 6)), 'Les coûts ne changent pas avec le niveau.');
        if (row.index) assert.equal(row.options[0].hits, 2, 'Les deux frappes de la voie B restent distinctes.');
      }
      assert.deepEqual(await alice(), before, 'La vérification des niveaux ne modifie pas le personnage.');
    }

    await page.goto(app.origin, { waitUntil: 'load' });
    await page.waitForFunction(() => typeof window.loginUnified === 'function');
    await login('Alice');
    assertUnified(await alice(), { level: 4, xp: 105, xpMax: 120 });
    await assertLinearAbility(4);
    await assertNativeLinearCombat();
    assert.equal(await page.locator('#xp-b').count(), 1);
    assert.equal(await page.locator('#sxp-b, #p-sniv').count(), 0);
    assert.match(await page.locator('#xp-v').textContent(), /105\s*\/\s*120/);
    const migrated = await alice();
    await page.reload({ waitUntil: 'load' });
    await ready('Alice');
    assertUnified(await alice(), { level: 4, xp: 105, xpMax: 120 });
    for (const stat of ['pvMax', 'pvCur', 'epMax', 'epCur', 'emMax', 'emCur']) {
      assert.equal((await alice())[stat], migrated[stat], 'La migration ne doit pas appliquer deux fois les gains de ' + stat + '.');
    }
    observations.push('Ancienne fiche migrée vers le niveau le plus avancé et sa fraction d’XP ; une seule barre, capacités fiche/combat calculées au niveau réel et aucun second gain au rechargement.');

    await page.addScriptTag({ url: app.origin + '/assets/vendor/jspdf/jspdf.umd.min.js' });
    await page.evaluate(() => {
      const Original = window.jspdf.jsPDF;
      window.__progressionPdfText = [];
      window.jspdf.jsPDF = function (options) {
        const doc = new Original(options);
        const text = doc.text;
        doc.text = function (value) {
          window.__progressionPdfText.push(Array.isArray(value) ? value.join('\n') : String(value));
          return text.apply(this, arguments);
        };
        return doc;
      };
    });
    const downloadPromise = page.waitForEvent('download');
    assert.equal(await page.evaluate(() => exportFichePDF()), true);
    const download = await downloadPromise;
    await download.saveAs(path.join(output, 'Fiche_Alice.pdf'));
    const pdfText = await page.evaluate(() => __progressionPdfText);
    assert.doesNotMatch(pdfText.join('\n'), /XP Serment|XP Personnage|SERMENT NIV\.|palier (?:actif|de niveau)|débloqu(?:é|er) au niveau/i);
    const activeAbility = await page.evaluate(() => getPlayerSermentBundle(gpid('p_alice')).branch.ability);
    assert.ok(pdfText.includes('Capacité active : ' + activeAbility.nom + ' — ' + activeAbility.cout), 'Le PDF synthétique nomme la capacité fixe et son coût.');
    assert.ok(pdfText.includes('Progression continue'));
    assert.equal(pdfText.filter(text => /105\s*\/\s*120\s*XP/.test(text)).length, 1);
    assert.ok(fs.statSync(path.join(output, 'Fiche_Alice.pdf')).size > 1000);
    observations.push('Vrai PDF téléchargé avec une seule progression 105/120 XP et aucun niveau ou compteur XP Serment.');

    await login('Admin');
    await page.evaluate(() => openProgPanel('p_alice'));
    await page.locator('#m-prog').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#m-prog .prog-tab').filter({ hasText: /^Expérience$/ }).count(), 1);
    assert.doesNotMatch(await page.locator('#m-prog').innerText(), /XP Serment|XP Personnage|Niv\. Serment/);
    assert.equal(await page.locator('#prog-serm, #adj-slvl, #adj-sxp').count(), 0);
    await page.locator('#xpp-mob').selectOption('visible');
    assert.match(await page.locator('#xpp-gain').textContent(), /\+10 XP/);
    assert.equal((await clickSave('button[onclick="applyXP(\'p_alice\')"]')).status(), 200);
    await waitProgression(4, 115);
    assertUnified(await storedAlice(), { level: 4, xp: 115, xpMax: 120 });
    await page.locator('#gbtn-b').click();
    assert.equal((await clickSave('button[onclick="applyGemXP(\'p_alice\')"]')).status(), 200);
    await waitProgression(5, 0);
    assertUnified(await storedAlice(), { level: 5, xp: 0, xpMax: 150 });
    assert.equal((await storedAlice()).inventory.find(item => item.id === 'gemme-blanche').qty, 2);
    for (const [stat, increase] of [['pvMax', 6], ['epMax', 6], ['emMax', 2]]) {
      assert.equal((await storedAlice())[stat], migrated[stat] + increase, 'La gemme doit donner le gain de statistique commun : ' + stat);
    }
    await page.locator('#m-prog .mclose').click();
    await assertLinearAbility(5);
    await page.screenshot({ path: path.join(output, 'fiche-progression-unifiee.png'), fullPage: true, animations: 'disabled' });
    observations.push('Combat +10 XP et gemme +5 XP alimentent le même compteur : niveau 5, statistiques augmentées, dégâts de capacité augmentés de 3 et une gemme consommée.');

    await page.evaluate(() => openProgPanel('p_alice'));
    await page.locator('#gbtn-b').click();
    const beforeFailure = await alice();
    const storedBeforeFailure = await app.read('players');
    await page.evaluate(() => {
      window.__progressionNotices = [];
      const notify = window.notif;
      window.notif = function (message, type) {
        window.__progressionNotices.push({ message, type });
        return notify.apply(this, arguments);
      };
    });
    const failSave = route => {
      const body = route.request().postDataJSON();
      return body.action === 'set' && body.key === 'players'
        ? route.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false,"error":"Échec de sauvegarde simulé"}' })
        : route.continue();
    };
    await page.route(dbUrl, failSave);
    try {
      assert.equal((await clickSave('button[onclick="applyGemXP(\'p_alice\')"]')).status(), 503);
      await page.waitForFunction(() => __progressionNotices.some(notice => notice.type === 'err'));
      assert.deepEqual(await alice(), beforeFailure, 'Un échec ne doit ni ajouter de XP ni consommer une gemme dans le cache.');
      assert.equal((await app.read('players')).version, storedBeforeFailure.version);
      assert.equal(await page.evaluate(() => __progressionNotices.some(notice => notice.type === 'ok')), false);
    } finally { await page.unroute(dbUrl, failSave); }
    await page.evaluate(() => { __progressionNotices = []; changeGemQty(99); });
    const writesBeforeInsufficient = app.requests.filter(request => request.action === 'set' && request.key === 'players').length;
    await page.locator('button[onclick="applyGemXP(\'p_alice\')"]').click();
    assert.deepEqual(await alice(), beforeFailure);
    assert.equal(app.requests.filter(request => request.action === 'set' && request.key === 'players').length, writesBeforeInsufficient);
    assert.match(await page.locator('#m-prog').innerText() + await page.evaluate(() => __progressionNotices.map(notice => notice.message).join(' ')), /insuffisant|disponible|possède|stock/i);
    await page.locator('#m-prog .mclose').click();
    observations.push('Échec de sauvegarde : aucune XP, gemme ou notification de succès ; stock insuffisant refusé avant écriture.');

    // A rejected write deliberately holds its queue until a fresh server revision
    // is read; reload before the next independent mutation.
    await page.reload({ waitUntil: 'load' });
    await ready('Admin');
    await page.evaluate(() => openChangeSerm('p_alice'));
    await page.locator('#mcs-sel').selectOption('Croisé');
    assert.equal((await clickSave('button[onclick="saveChangeSerm()"]')).status(), 200);
    await page.waitForFunction(() => gpid('p_alice').classe === 'Croisé');
    assertUnified(await storedAlice(), { level: 5, xp: 0, xpMax: 150 });
    assert.equal((await storedAlice()).branch, 'Aucune');
    await page.reload({ waitUntil: 'load' });
    await ready('Admin');
    assertUnified(await alice(), { level: 5, xp: 0, xpMax: 150 });
    assert.equal((await alice()).classe, 'Croisé');
    assert.equal((await alice()).inventory.find(item => item.id === 'gemme-blanche').qty, 2);
    await login('Alice');
    await openProfile();
    assertUnified(await alice(), { level: 5, xp: 0, xpMax: 150 });
    assert.equal(await page.locator('#sxp-b, #p-sniv').count(), 0);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(output, 'fiche-progression-mobile.png'), fullPage: true, animations: 'disabled' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    observations.push('Changement de serment conserve le niveau et l’XP ; nouvelles données et inventaire persistants après reload puis connexion joueur, sans débordement mobile.');

    await page.setViewportSize({ width: 1440, height: 1000 });
    await login('Admin');
    const importResponse = saveResponse();
    page.once('dialog', dialog => dialog.accept());
    await page.evaluate(() => {
      const players = JSON.parse(JSON.stringify(gp()));
      const player = players.find(item => item.id === 'p_alice');
      Object.assign(player, {
        classe: 'Duelliste', level: 1, xp: 0, xpMax: 30,
        sLevel: 3, sXp: 15, sXpMax: 30,
        pvMax: 30, pvCur: 25, epMax: 50, epCur: 40, emMax: 20, emCur: 10
      });
      delete player.progressionVersion;
      const definition = Object.assign({}, getAllSD().Duelliste, { pvN: 11, epN: 9, emN: 7 });
      const data = { version: 2, players, serments_custom: { Duelliste: definition } };
      importDB({ files: [new File([JSON.stringify(data)], 'ancienne-progression.json', { type: 'application/json' })], value: '' });
    });
    assert.equal((await importResponse).status(), 200);
    await waitProgression(3, 45);
    const imported = await storedAlice();
    assertUnified(imported, { level: 3, xp: 45, xpMax: 90 });
    assert.deepEqual([imported.pvMax, imported.epMax, imported.emMax], [52, 68, 34]);
    assert.deepEqual([imported.pvCur, imported.epCur, imported.emCur], [47, 58, 24]);
    assert.equal((await app.read('serments_custom')).value.Duelliste.pvN, 11);
    await page.reload({ waitUntil: 'load' });
    await ready('Admin');
    assertUnified(await alice(), { level: 3, xp: 45, xpMax: 90 });
    assert.deepEqual([(await alice()).pvMax, (await alice()).epMax, (await alice()).emMax], [52, 68, 34]);
    observations.push('Import d’un ancien export : définition personnalisée chargée avant migration, progression 3 à 45/90 XP et gains PV/EP/EM personnalisés appliqués exactement une fois.');

    assert.deepEqual(errors, []);
    assert.deepEqual(app.errors, []);
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ observations, requests: app.requests, errors }, null, 2));
    console.log(observations.map(observation => 'OK ' + observation).join('\n'));
  } catch (error) {
    if (page) {
      await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true, animations: 'disabled' }).catch(() => {});
      console.error('Browser state:', await page.evaluate(() => ({ user: window.CU, player: typeof gpid === 'function' && gpid('p_alice'), notices: window.__progressionNotices })).catch(() => ({})));
    }
    throw error;
  } finally {
    if (browser) await browser.close();
    await app.close();
  }
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
