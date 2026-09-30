'use strict';

const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { createLocalApp } = require('./helpers/local-app');

(async () => {
  const app = await createLocalApp();
  let browser;
  const errors = [];
  try {
    browser = await chromium.launch({ headless: true });
    async function accountPage(id) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      await context.addCookies([{ name: 'np_session', value: (await app.cookie(id)).slice('np_session='.length), url: app.origin, httpOnly: true }]);
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on('pageerror', error => errors.push(error.message));
      await page.route('https://**/*', route => route.abort());
      await page.goto(app.origin);
      await page.waitForFunction(() => !!window.CU);
      await page.waitForFunction(() => !document.getElementById('login-transition-overlay').classList.contains('active') && getComputedStyle(document.getElementById('lto-flash')).opacity === '0');
      await page.locator('#hdr-settings-btn').click();
      await page.getByRole('button', { name: 'Ma collection', exact: true }).click();
      return page;
    }

    const page = await accountPage('alice');
    const card = id => page.locator('.np-theme-vault-card[data-theme-id="' + id + '"]');
    async function equip(id, key) {
      await card(id).focus();
      const saved = page.waitForResponse(response => response.url().endsWith('/.netlify/functions/auth') && response.request().postDataJSON()?.action === 'self_set_theme');
      await page.keyboard.press(key);
      assert.equal((await saved).status(), 200);
      assert.equal(await page.evaluate(() => _currentTheme), id);
      assert.equal(await card(id).getAttribute('aria-pressed'), 'true');
    }
    await equip('light', 'Enter');
    await equip('dark', 'Space');
    await equip('dark', 'Enter');
    await equip('dark', 'Space');
    const savesBeforeLocked = app.requests.filter(request => request.action === 'self_set_theme').length;
    for (const key of ['Enter', 'Space']) {
      await card('green').focus();
      await page.keyboard.press(key);
      assert.equal(await page.evaluate(() => _currentTheme), 'dark');
    }
    assert.equal(app.requests.filter(request => request.action === 'self_set_theme').length, savesBeforeLocked);

    const opener = page.getByRole('button', { name: 'Importer ou recadrer l’avatar', exact: true });
    await opener.focus();
    await page.keyboard.press('Enter');
    const modal = page.locator('#m-avatar-crop.open');
    await modal.waitFor();
    assert.equal(await modal.locator('[role="dialog"]').getAttribute('aria-modal'), 'true');
    const firstFocus = await page.evaluate(() => document.activeElement.className);
    assert.ok(firstFocus.includes('mclose'));
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Appliquer');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.className), firstFocus);
    for (let step = 0; step < 22; step++) {
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => !!document.activeElement.closest('#m-avatar-crop.open')), true);
    }
    await card('light').focus();
    assert.equal(await page.evaluate(() => !!document.activeElement.closest('#m-avatar-crop.open')), true, 'Programmatic background focus is returned to the avatar dialog');
    await card('light').dispatchEvent('keydown', { key: 'Enter', bubbles: true });
    await card('light').evaluate(element => element.click());
    assert.equal(await page.evaluate(() => _currentTheme), 'dark');
    await page.keyboard.press('Escape');
    assert.equal(await modal.count(), 0);
    assert.equal(await opener.evaluate(element => document.activeElement === element), true);
    assert.equal(await page.locator('#profil.active').count(), 1, 'Escape closes the avatar dialog without closing the account page');
    await opener.click();
    await page.locator('#m-avatar-crop').getByRole('button', { name: 'Annuler', exact: true }).click();
    assert.equal(await opener.evaluate(element => document.activeElement === element), true);

    // The card itself also guards against other dialogs, beyond the avatar trap.
    await page.evaluate(() => openModal('m-editpass'));
    await card('light').dispatchEvent('keydown', { key: ' ', bubbles: true });
    await card('light').evaluate(element => element.click());
    assert.equal(await page.evaluate(() => _currentTheme), 'dark');
    await page.evaluate(() => closeModal('m-editpass'));

    const staff = await accountPage('admin');
    await staff.evaluate(() => {
      window.__keyboardCombatCalls = { pass: 0, next: 0, undo: 0 };
      combatPassTurn = () => { __keyboardCombatCalls.pass++; };
      combatNextRound = () => { __keyboardCombatCalls.next++; };
      combatUndo = () => { __keyboardCombatCalls.undo++; };
      _cs.active = true;
    });
    async function calls() { return staff.evaluate(() => __keyboardCombatCalls); }
    await staff.locator('.np-theme-vault-card[data-theme-id="light"]').focus();
    await staff.keyboard.press('Space');
    assert.deepEqual(await calls(), { pass: 0, next: 0, undo: 0 });
    await staff.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
    await staff.keyboard.press('Shift+Enter');
    await staff.keyboard.press('Control+z');
    assert.deepEqual(await calls(), { pass: 0, next: 0, undo: 0 }, 'Inactive simulator ignores global shortcuts');

    await staff.evaluate(() => { switchTab('combat-mj', null); if (document.activeElement) document.activeElement.blur(); });
    await staff.keyboard.press('Space');
    await staff.keyboard.press('Shift+Enter');
    await staff.keyboard.press('Control+z');
    assert.deepEqual(await calls(), { pass: 1, next: 1, undo: 1 }, 'Simulator shortcuts remain available on its own page');
    await staff.locator('#c-name').focus();
    await staff.keyboard.press('Space');
    await staff.keyboard.press('Control+z');
    await staff.locator('#combat-mj > .tab-popup-close').focus();
    await staff.keyboard.press('Shift+Enter');
    assert.deepEqual(await calls(), { pass: 1, next: 1, undo: 1 }, 'Inputs and buttons retain their own keyboard actions');
    await staff.evaluate(() => {
      switchTab('combat-mj', null);
      document.activeElement.blur();
      document.body.addEventListener('keydown', event => event.preventDefault(), { once: true });
    });
    await staff.keyboard.press('Space');
    assert.deepEqual(await calls(), { pass: 1, next: 1, undo: 1 }, 'An already-handled keyboard event is ignored');
    await staff.evaluate(() => openModal('m-editpass'));
    await staff.keyboard.press('Space');
    await staff.keyboard.press('Shift+Enter');
    await staff.keyboard.press('Control+z');
    assert.deepEqual(await calls(), { pass: 1, next: 1, undo: 1 }, 'An open dialog suspends simulator shortcuts');
    assert.deepEqual(errors, []);
    assert.deepEqual(app.errors, []);
    console.log('Clavier compte : thèmes possédés/actifs/verrouillés, focus avatar et restauration, activation derrière modale, raccourcis limités à la simulation OK.');
  } finally {
    if (browser) await browser.close();
    await app.close();
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
