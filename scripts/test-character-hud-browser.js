'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { chromium } = require('playwright');
const { createLocalApp } = require('./helpers/local-app');
const { assertOperationCards } = require('./helpers/serment-operation-assertions');
const expansion = require('../assets/js/serments-reforged-data');

// Reuse the theme suite's solid-background contrast audit without running its
// browser lifecycle. The function is self-contained and executes in the page.
const themeSuite = fs.readFileSync(path.join(__dirname, 'test-theme-matrix-browser.js'), 'utf8');
const inspectorStart = themeSuite.indexOf('function inspectFamily(');
const inspectorEnd = themeSuite.indexOf('\n(async () =>', inspectorStart);
assert.ok(inspectorStart >= 0 && inspectorEnd > inspectorStart);
const inspectFamily = vm.runInNewContext('(' + themeSuite.slice(inspectorStart, inspectorEnd).trim() + ')');
const themes = ['dark', 'light', 'violet', 'green', 'aquaris', 'easter', 'halloween', 'noel', 'bloodmoon'];

// Real authentication and production handlers, backed by isolated PostgreSQL.
(async () => {
  const app = await createLocalApp();
  const output = path.resolve(process.env.NP_TEST_OUTPUT || 'test-results/character-hud');
  fs.mkdirSync(output, { recursive: true });
  const errors = [], observations = [], visualReports = [];
  let browser, page;
  try {
    const definition = expansion.definitions['Arbalétrier'];
    const players = (await app.read('players')).value;
    const alice = players.find(player => player.id === 'p_alice');
    Object.assign(alice, {
      classe: 'Arbalétrier', arme: definition.arme, branch: definition.branches[0].nom,
      level: 5, xp: 45, xpMax: 150,
      pvCur: 0, pvMax: 30 + 4 * definition.pvN,
      epCur: 0, epMax: 50 + 4 * definition.epN,
      emCur: 0, emMax: 20 + 4 * definition.emN
    });
    await app.seed('players', players);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
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
    await page.evaluate(() => loadPlayer('p_alice'));
    const hud = page.locator('#fiche .np-character-hud');
    const ability = () => hud.locator('.np-hud-ability');
    const body = () => ability().locator('.np-hud-ability-body');
    await hud.waitFor({ state: 'visible' });

    async function assertUniqueIds() {
      for (const id of ['pv-v', 'ep-v', 'em-v', 'pv-b', 'ep-b', 'em-b', 'xp-v', 'xp-b', 'p-niv', 'p-hud-serment']) {
        assert.equal(await page.locator('[id="' + id + '"]').count(), 1, id + ' occurs exactly once in the document');
        assert.equal(await hud.locator('#' + id).count(), 1, id + ' belongs to the HUD');
      }
    }
    async function assertResources(player) {
      for (const resource of ['pv', 'ep', 'em', 'xp']) {
        const current = resource === 'xp' ? player.xp : player[resource + 'Cur'];
        const maximum = player[resource + 'Max'];
        assert.equal(await hud.locator('#' + resource + '-v').textContent(), current + ' / ' + maximum + (resource === 'xp' ? ' XP' : ''));
        const bar = hud.locator('#' + resource + '-b').locator('..');
        assert.equal(await bar.getAttribute('role'), 'progressbar');
        assert.equal(await bar.getAttribute('aria-valuenow'), String(current));
        assert.equal(await bar.getAttribute('aria-valuemax'), String(maximum));
        assert.equal(await bar.getAttribute('aria-valuetext'), current + ' sur ' + maximum);
        if (current === 0) assert.equal(await hud.locator('#' + resource + '-b').evaluate(element => element.style.width), '0%', 'An empty resource stays empty');
      }
      assert.equal(await hud.locator('#p-niv').textContent(), 'Niveau ' + player.level);
    }
    async function assertHudButtons() {
      const controls = await hud.locator('button').evaluateAll(buttons => buttons.map(button => ({
        text: button.textContent.trim(), font: getComputedStyle(button).fontSize,
        spanFonts: [...button.querySelectorAll('span')].map(span => getComputedStyle(span).fontSize),
        height: button.getBoundingClientRect().height
      })));
      assert.ok(controls.length > 0);
      for (const control of controls) {
        assert.equal(control.font, '14px', 'HUD buttons retain readable text: ' + control.text);
        assert.ok(control.spanFonts.every(font => font === '14px'), 'Button labels inherit the readable 14px font');
        if (control.height) assert.ok(control.height >= 44, 'Visible HUD controls have a 44px target');
      }
    }
    async function assertAbility(branchIndex, level) {
      const branch = definition.branches[branchIndex];
      await assertHudButtons();
      assert.equal(await ability().count(), 1);
      assert.equal(await ability().locator('summary > strong').textContent(), branch.ability.nom);
      assert.match(await ability().locator('summary').textContent(), new RegExp('Valeurs au niveau ' + level + '\\b'));
      await assertOperationCards(body(), branch.ability, level);
      const labels = await body().locator('.np-oath-operation strong').allTextContents();
      assert.deepEqual(labels, branch.ability.combatRules.operations.map(operation => operation.label), 'Only the chosen branch supplies HUD operations');
    }
    async function savePlayers(action) {
      const pending = page.waitForResponse(response => {
        if (!response.url().endsWith('/.netlify/functions/db')) return false;
        const data = response.request().postDataJSON();
        return data?.action === 'set' && data.key === 'players';
      });
      await action();
      assert.equal((await pending).status(), 200);
    }
    async function selectBranch(index) {
      await page.evaluate(() => openChangeBranch('p_alice'));
      await page.locator('input[name="branch-sel"]').nth(index + 1).check({ force: true });
      await savePlayers(() => page.locator('button[onclick="saveChangeBranch()"]').click());
      await page.locator('#m-changebranch').waitFor({ state: 'hidden' });
    }

    await assertUniqueIds();
    await assertResources(alice);
    assert.equal(await ability().getAttribute('open'), null);
    await ability().locator('summary').focus();
    await page.keyboard.press('Enter');
    assert.equal(await ability().getAttribute('open'), '', 'The ability opens from the keyboard');
    await assertAbility(0, 5);
    await page.evaluate(() => renderView());
    assert.equal(await ability().getAttribute('open'), '', 'Refreshing the same character and branch keeps the ability open');
    await assertAbility(0, 5);
    const beforeVisuals = await app.read('players');
    for (const [width, height] of [[390, 844], [1440, 1000]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => NPThemeEngine.apply('dark'));
      await hud.screenshot({ path: path.join(output, 'hud-dark-' + width + '.png'), animations: 'disabled' });
      if (width === 390) {
        const header = await page.evaluate(() => {
          const avatar = document.querySelector('#p-av').getBoundingClientRect();
          const identity = document.querySelector('#fiche .sinfo').getBoundingClientRect();
          return { avatarRight: avatar.right, identityLeft: identity.left, avatarTop: avatar.top, identityBottom: identity.bottom };
        });
        assert.ok(header.avatarRight <= header.identityLeft, 'The mobile avatar stays beside the identity: ' + JSON.stringify(header));
        assert.ok(header.avatarTop < header.identityBottom, 'The mobile avatar and identity share a row');
        await assertHudButtons();
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await page.screenshot({ path: path.join(output, 'fiche-dark-390.png'), animations: 'disabled' });
      }
    }
    console.log('Captures dark 390/1440 prêtes dans ' + output);
    if (process.env.NP_HUD_CAPTURE_ONLY === '1') {
      assert.deepEqual(errors, []);
      assert.deepEqual(app.errors, []);
      console.log('OK Avatar mobile à gauche, boutons et spans HUD à 14px, cibles visibles de 44px.');
      return;
    }

    for (const [width, height] of [[1440, 1000], [390, 844], [320, 740]]) {
      await page.setViewportSize({ width, height });
      for (const theme of themes) {
        await page.evaluate(id => NPThemeEngine.apply(id), theme);
        const report = await page.evaluate(inspectFamily, '#fiche .np-character-hud');
        visualReports.push({ width, theme, ...report });
        assert.equal(report.missing, undefined);
        assert.equal(report.bodyTheme, theme);
        assert.equal(report.htmlTheme, theme);
        assert.ok(report.documentWidth <= width + 2, 'Page overflow at ' + width + '/' + theme);
        assert.deepEqual(report.overflow, [], 'HUD overflow at ' + width + '/' + theme);
        assert.ok(report.root.left >= -1 && report.root.right <= width + 1, 'HUD bounds at ' + width + '/' + theme);
        const internal = await hud.evaluate(element => ({ client: element.clientWidth, scroll: element.scrollWidth }));
        assert.ok(internal.scroll <= internal.client + 1, 'HUD content overflows its own card at ' + width + '/' + theme);
        assert.ok(report.contrast.length > 0);
        assert.deepEqual(report.contrast.filter(sample => !sample.pass), [], 'HUD contrast at ' + width + '/' + theme);
        await assertResources(alice);
        await assertHudButtons();
        if (width !== 320 && ['dark', 'light'].includes(theme)) {
          await hud.screenshot({ path: path.join(output, 'hud-' + theme + '-' + width + '.png'), animations: 'disabled' });
        }
      }
    }
    assert.deepEqual(await app.read('players'), beforeVisuals, 'Reading the HUD, opening it and applying themes do not save character data');
    observations.push('HUD unique, ressources à zéro conservées, niveau réel 5, capacité A calculée indépendamment ; clavier et accordéon ouvert conservés au rafraîchissement.');
    observations.push('Neuf thèmes, 1440/390/320 px : aucun débordement du HUD ou de la page, contraste mesuré ; captures light/dark en 1440 et 390 px.');

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => { NPThemeEngine.apply('dark'); openProgPanel('p_alice'); });
    await page.locator('[data-prog-tab="adj"]').click();
    await savePlayers(() => page.locator('button[onclick="adjVal(\'p_alice\',\'level\',1)"]').click());
    await page.locator('#m-prog .mclose').click();
    const increased = (await app.read('players')).value.find(player => player.id === 'p_alice');
    assert.equal(increased.level, 6);
    assert.deepEqual([increased.pvCur, increased.epCur, increased.emCur], [0, 0, 0]);
    await assertResources(increased);
    assert.equal(await ability().getAttribute('open'), '', 'A real level update keeps the already open ability visible');
    await assertAbility(0, 6);
    await assertUniqueIds();

    await selectBranch(1);
    assert.equal(await ability().getAttribute('open'), null, 'Changing the branch starts a new disclosure');
    await ability().locator('summary').click();
    await assertAbility(1, 6);
    await body().getByRole('button', { name: 'Voir ma voie en détail' }).click();
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'np-sheet-oath');
    await selectBranch(-1);
    assert.equal(await ability().count(), 0);
    assert.equal(await hud.locator('.np-oath-operation').count(), 0);
    assert.match(await hud.locator('.np-hud-empty').textContent(), /Ta voie reste à choisir/);
    await assertHudButtons();
    await hud.getByRole('button', { name: 'Voir mon serment' }).click();
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'np-sheet-oath');
    observations.push('Augmentation de niveau enregistrée : nouvelles valeurs au niveau 6 sans remplir les ressources ; changement de voie réel, choix vide et liens vers le détail cohérents.');

    await selectBranch(0);
    await ability().locator('summary').click();
    const beforeUnavailable = await app.read('players');
    await page.evaluate(() => renderFicheState('Fiche indisponible', 'Le personnage est indisponible pour ce test local.'));
    for (const id of ['pv-v', 'ep-v', 'em-v', 'xp-v', 'p-niv']) assert.equal(await hud.locator('#' + id).textContent(), '—');
    for (const id of ['pv-b', 'ep-b', 'em-b', 'xp-b']) assert.equal(await hud.locator('#' + id).evaluate(element => element.style.width), '0%');
    assert.equal(await hud.locator('#p-hud-serment').textContent(), '');
    assert.equal(await hud.locator('.np-oath-operation,details').count(), 0, 'An unavailable profile never exposes the previous ability');
    for (const bar of await hud.locator('[role="progressbar"]').all()) {
      assert.equal(await bar.getAttribute('aria-valuenow'), null);
      assert.equal(await bar.getAttribute('aria-valuemax'), null);
      assert.equal(await bar.getAttribute('aria-valuetext'), 'Indisponible');
    }
    assert.doesNotMatch(await hud.innerText(), new RegExp(definition.branches[0].ability.nom));
    assert.deepEqual(await app.read('players'), beforeUnavailable);
    await page.evaluate(() => renderView());
    await assertResources(increased);
    assert.equal(await ability().getAttribute('open'), null, 'Restoring an unavailable profile starts from a clean disclosure');
    await assertAbility(0, 6);
    await assertUniqueIds();
    observations.push('Fiche indisponible : ressources, attributs accessibles et ancienne capacité effacés ; restauration propre sans écriture du personnage.');

    assert.deepEqual(errors, []);
    assert.deepEqual(app.errors, []);
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ observations, visualReports, errors }, null, 2));
    observations.forEach(observation => console.log('OK ' + observation));
  } catch (error) {
    if (page) await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true, animations: 'disabled' }).catch(() => {});
    fs.writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ error: error.stack || error.message, visualReports, errors }, null, 2));
    throw error;
  } finally {
    if (browser) await browser.close();
    await app.close();
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
