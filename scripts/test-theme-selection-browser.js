'use strict';

// Browser controls and production handlers share an isolated PGlite store.
// Network faults/delays are injected only at the browser response boundary.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createLocalApp } = require('./helpers/local-app');

const themeIds = ['dark', 'light', 'violet', 'green', 'aquaris', 'easter', 'halloween', 'noel', 'bloodmoon'];
const authUrl = '**/.netlify/functions/auth';
const isThemeSave = request => request.postDataJSON()?.action === 'self_set_theme';
async function bounded(promise, label) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Timeout: ' + label)), 15000);
    })]);
  } finally { clearTimeout(timer); }
}

(async () => {
  const app = await createLocalApp();
  const output = path.resolve(process.env.NP_TEST_OUTPUT || 'test-results/theme-selection');
  fs.mkdirSync(output, { recursive: true });
  const errors = [], observations = [], surfaces = [];
  let browser, page, releasePending, releaseRead;
  try {
    const accounts = app.accounts;
    accounts.find(account => account.id === 'alice').unlockedThemes = ['violet'];
    await app.seed('accounts', accounts);
    const unchangedStores = {};
    for (const key of ['event_themes', 'theme_visibility', 'players']) unchangedStores[key] = await app.read(key);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addCookies([{ name: 'np_session', value: (await app.cookie('alice')).slice('np_session='.length), url: app.origin, httpOnly: true }]);
    page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**/*', route => route.abort());
    // Seed a stale device preference once. Subsequent reloads must use the server.
    await page.addInitScript(() => {
      if (!localStorage.getItem('np_test_theme_seeded')) {
        localStorage.setItem('np_theme', 'violet');
        localStorage.setItem('np_test_theme_seeded', '1');
      }
    });
    const preview = id => page.locator('[data-theme-preview="' + id + '"]');
    const card = id => page.locator('.np-theme-vault-card[data-theme-id="' + id + '"]');
    const saveCount = () => app.requests.filter(request => request.action === 'self_set_theme').length;
    const serverTheme = async id => (await app.read('accounts')).value.find(account => account.id === id).selectedTheme;
    // The existing background heartbeat can update lastSeen during these checks.
    const serverAccounts = async () => (await app.read('accounts')).value.map(({ lastSeen, ...account }) => account);
    async function ready(pseudo = 'Alice') {
      await page.waitForFunction(name => window.CU?.pseudo === name, pseudo);
      await page.waitForFunction(() => {
        const overlay = document.getElementById('login-transition-overlay'), flash = document.getElementById('lto-flash');
        return (!overlay || !overlay.classList.contains('active')) && (!flash || getComputedStyle(flash).opacity === '0');
      });
    }
    async function collection() {
      await page.locator('#hdr-settings-btn').click();
      await page.getByRole('button', { name: 'Ma collection', exact: true }).click();
      await preview('dark').waitFor({ state: 'visible' });
    }
    async function snapshot() {
      return page.evaluate(() => ({
        current: _currentTheme,
        account: getCurrentAccount()?.selectedTheme,
        player: getThemeActorPlayer()?.selectedTheme || null,
        user: CU?.selectedTheme,
        stored: localStorage.getItem('np_theme'),
        owned: getUnlockedThemes().slice().sort()
      }));
    }
    async function cancel() {
      await page.locator('#np-theme-preview-cancel').click();
      await page.waitForFunction(() => !document.getElementById('np-theme-preview-bar') || !document.getElementById('np-theme-preview-bar').getClientRects().length);
    }
    function responseForSave() {
      return page.waitForResponse(response => response.url().endsWith('/.netlify/functions/auth') && isThemeSave(response.request()));
    }
    async function login(pseudo) {
      await page.evaluate(() => showScreen('s-login'));
      await page.locator('#login-id').fill(pseudo);
      await page.locator('#login-pass').fill(pseudo + '-audit-123!');
      await page.locator('button[onclick="loginUnified()"]').click();
      await ready(pseudo);
    }
    async function delaySave() {
      let received;
      const receivedPromise = new Promise(resolve => { received = resolve; });
      const gate = new Promise(resolve => { releasePending = resolve; });
      const routeHandler = async route => {
        if (!isThemeSave(route.request())) return route.continue();
        const response = await route.fetch();
        received(response);
        await gate;
        await route.fulfill({ response });
      };
      await page.route(authUrl, routeHandler);
      return { received: receivedPromise, finish: async () => {
        releasePending(); releasePending = null;
        await page.unroute(authUrl, routeHandler);
      } };
    }

    await page.goto(app.origin, { waitUntil: 'load' });
    await ready();
    await collection();
    assert.equal((await snapshot()).current, 'dark', 'The account preference wins over an old browser preference, including dark');
    const original = await snapshot();
    const writesAtStart = saveCount();
    await preview('violet').click();
    await page.waitForFunction(() => _currentTheme === 'violet');
    await page.waitForTimeout(300);
    const violetPreview = await snapshot();
    assert.deepEqual({ ...violetPreview, current: original.current }, original, 'An owned preview must not change persisted or cached preferences');
    assert.equal(saveCount(), writesAtStart);
    assert.equal(await serverTheme('alice'), 'dark');
    assert.equal(await card('dark').getAttribute('data-theme-state'), 'selected', 'The equipped card still identifies the confirmed theme');
    assert.notEqual(await card('violet').getAttribute('data-theme-state'), 'selected');
    await cancel();
    assert.deepEqual(await snapshot(), original);

    await preview('green').click();
    await page.locator('#np-theme-preview-bar').waitFor({ state: 'visible' });
    assert.equal((await snapshot()).current, 'dark', 'An unowned preview is isolated from the application');
    assert.equal(await page.locator('#np-theme-preview-apply:enabled').count(), 0, 'An unowned theme cannot be equipped');
    await page.evaluate(() => confirmThemePreview());
    assert.equal(saveCount(), writesAtStart);
    assert.deepEqual((await snapshot()).owned, original.owned);
    await cancel();
    await preview('light').click();
    await page.evaluate(() => switchTab('fiche', null));
    assert.equal((await snapshot()).current, 'dark', 'Leaving the account cancels the preview');
    await collection();
    assert.equal(await page.locator('#np-theme-preview-bar:visible').count(), 0);
    await preview('light').click();
    await page.evaluate(() => showScreen('s-home'));
    assert.equal((await snapshot()).current, 'dark', 'Returning to the public homepage also cancels the preview');
    assert.deepEqual(await snapshot(), original);
    assert.equal(saveCount(), writesAtStart);
    await page.evaluate(() => showScreen('s-app'));
    await collection();
    assert.equal(await page.locator('#np-theme-preview-bar:visible').count(), 0);
    observations.push('Aperçus possédé et non possédé sans écriture ; Annuler et navigation restaurent le thème confirmé ; préférence du compte prioritaire.');

    // A cache refresh reads dark before the save, but its response arrives after
    // light is confirmed. It must not roll the account back to the stale choice.
    let readReceived, interceptRead = true;
    const readReceivedPromise = new Promise(resolve => { readReceived = resolve; });
    const readGate = new Promise(resolve => { releaseRead = resolve; });
    const delayedRead = async route => {
      if (!interceptRead || route.request().postDataJSON()?.action !== 'session_bundle') return route.continue();
      interceptRead = false;
      const response = await route.fetch();
      readReceived(await response.json());
      await readGate;
      await route.fulfill({ response });
    };
    await page.route(authUrl, delayedRead);
    await page.evaluate(() => {
      window.__themeStaleReadSettled = false;
      _refreshPrivateCaches().finally(() => { window.__themeStaleReadSettled = true; });
    });
    const readBeforeSave = await bounded(readReceivedPromise, 'session bundle before theme confirmation');
    assert.equal(readBeforeSave.data.accounts.find(account => account.id === 'alice').selectedTheme, 'dark');

    // Persist once, despite reentrant confirmation/preview calls while pending.
    const delayed = await delaySave();
    await preview('light').click();
    await page.locator('#np-theme-preview-apply').click();
    const saveResponse = await bounded(delayed.received, 'theme save received by the real server');
    assert.equal(saveResponse.status(), 200);
    assert.equal(await page.locator('#np-theme-preview-apply').isDisabled(), true);
    assert.equal((await snapshot()).account, 'dark');
    assert.equal((await snapshot()).stored, original.stored);
    assert.deepEqual((await snapshot()).owned, original.owned, 'A pending selection never awards ownership');
    await page.evaluate(() => { confirmThemePreview(); confirmThemePreview(); previewTheme('violet'); });
    assert.equal((await snapshot()).current, 'light');
    assert.equal(saveCount(), writesAtStart + 1);
    await delayed.finish();
    await page.waitForFunction(() => getCurrentAccount()?.selectedTheme === 'light');
    assert.equal((await snapshot()).stored, 'light');
    assert.equal(await serverTheme('alice'), 'light');
    releaseRead(); releaseRead = null;
    await page.waitForFunction(() => window.__themeStaleReadSettled);
    await page.unroute(authUrl, delayedRead);
    assert.equal((await snapshot()).account, 'light', 'A stale session bundle cannot replace a newly confirmed preference');
    await preview('violet').click();
    await cancel();
    assert.equal((await snapshot()).current, 'light', 'Cancel returns to the confirmed choice after a delayed cache refresh');
    assert.equal((await snapshot()).stored, 'light');
    assert.equal(await card('light').getAttribute('data-theme-state'), 'selected');
    await page.reload({ waitUntil: 'load' });
    await ready();
    assert.equal((await snapshot()).current, 'light');
    await collection();
    observations.push('Confirmation serveur réelle, enregistrement unique malgré double clic, état confirmé seulement à la réponse et conservation après rechargement.');
    observations.push('Une session_bundle lue avant confirmation puis reçue après ne rétablit pas l’ancien thème ; aperçu puis annulation conservent le choix enregistré.');

    for (const status of [503, 409]) {
      const before = await snapshot();
      const beforeServer = await serverAccounts();
      let failures = 0;
      const refuse = route => {
        if (!isThemeSave(route.request())) return route.continue();
        failures++;
        return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'Sauvegarde indisponible (' + status + ')' }) });
      };
      await page.route(authUrl, refuse);
      await preview('violet').click();
      const response = responseForSave();
      await page.locator('#np-theme-preview-apply').click();
      assert.equal((await response).status(), status);
      await page.waitForFunction(() => _currentTheme === 'light');
      assert.deepEqual(await snapshot(), before);
      assert.deepEqual(await serverAccounts(), beforeServer);
      assert.equal(failures, 1);
      await page.unroute(authUrl, refuse);
      if (await page.locator('#np-theme-preview-cancel:visible').count()) await cancel();
    }
    observations.push('Erreurs 503 et 409 : thème confirmé restauré, préférence locale et compte inchangés.');

    // The preview was allowed, but ownership can be revoked before confirmation.
    await preview('violet').click();
    const revokedAccounts = (await app.read('accounts')).value;
    revokedAccounts.find(account => account.id === 'alice').unlockedThemes = [];
    await app.seed('accounts', revokedAccounts);
    const denied = responseForSave();
    await page.locator('#np-theme-preview-apply').click();
    assert.equal((await denied).status(), 403);
    await page.waitForFunction(() => _currentTheme === 'light');
    assert.equal(await serverTheme('alice'), 'light');
    if (await page.locator('#np-theme-preview-cancel:visible').count()) await cancel();
    revokedAccounts.find(account => account.id === 'alice').unlockedThemes = ['violet'];
    await app.seed('accounts', revokedAccounts);
    await page.reload({ waitUntil: 'load' });
    await ready();
    await collection();
    observations.push('Droit retiré pendant un aperçu : refus 403 réel du serveur, aucune attribution ni préférence modifiée.');

    // Keep the current document alive to inspect logout cleanup before its normal
    // reload. Authentication and cleanup still run through the production code.
    await page.evaluate(() => {
      const nativeTimeout = window.setTimeout;
      window.setTimeout = function (callback, delay, ...args) {
        if (delay === 80 && String(callback).includes('window.location.reload')) return 0;
        return nativeTimeout(callback, delay, ...args);
      };
      window.__restoreThemeTestTimeout = () => { window.setTimeout = nativeTimeout; };
    });
    const late = await delaySave();
    await preview('violet').click();
    await page.locator('#np-theme-preview-apply').click();
    assert.equal((await bounded(late.received, 'theme save before logout')).status(), 200);
    await page.evaluate(() => logout());
    await page.waitForFunction(() => !window.CU);
    await login('Bob');
    const bobBefore = await snapshot();
    await late.finish();
    await page.waitForTimeout(350);
    assert.equal(await page.evaluate(() => CU.pseudo), 'Bob');
    assert.deepEqual(await snapshot(), bobBefore);
    assert.equal(await page.locator('#np-theme-preview-bar:visible').count(), 0);
    await page.evaluate(() => __restoreThemeTestTimeout());
    await page.reload({ waitUntil: 'load' });
    await ready('Bob');
    assert.equal(await serverTheme('bob'), 'dark');
    assert.equal((await snapshot()).current, 'dark');
    observations.push('Réponse tardive Alice après déconnexion puis connexion Bob ignorée, y compris après rechargement du cookie de session.');

    // Admin owns the entire catalogue. Inspect every existing theme at both sizes.
    await login('Admin');
    await collection();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      for (const id of themeIds) {
        await preview(id).click();
        await page.waitForTimeout(450);
        assert.equal((await snapshot()).current, id);
        const surface = await page.evaluate(() => {
          const channel = value => {
            value /= 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          };
          const luminance = color => {
            const rgb = color.match(/[\d.]+/g)?.slice(0, 3).map(Number);
            if (!rgb || !color.startsWith('rgb')) return null;
            return channel(rgb[0]) * 0.2126 + channel(rgb[1]) * 0.7152 + channel(rgb[2]) * 0.0722;
          };
          const sample = selector => {
            const element = document.querySelector(selector), style = element && getComputedStyle(element);
            if (!style) return null;
            let ancestor = element, background = style.backgroundColor;
            while (ancestor && (background === 'rgba(0, 0, 0, 0)' || background === 'transparent')) {
              ancestor = ancestor.parentElement;
              if (ancestor) background = getComputedStyle(ancestor).backgroundColor;
            }
            const fg = luminance(style.color), bg = luminance(background);
            return { color: style.color, background, fontSize: style.fontSize, width: Math.round(element.getBoundingClientRect().width), contrast: fg === null || bg === null ? null : +((Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05)).toFixed(2) };
          };
          return { width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth + 1, audit: themeMaxAuditReport(), title: sample('.np-account-collection-heading h2'), card: sample('.np-theme-vault-card'), description: sample('.np-theme-vault-card .tagline'), introduction: sample('.np-account-collection-heading > p'), bar: sample('#np-theme-preview-bar') };
        });
        assert.equal(surface.overflow, false, 'No horizontal overflow for ' + id + ' at ' + width + ' px');
        assert.equal(surface.audit.isolated, true, 'Only one theme class is applied for ' + id);
        assert.ok(surface.card?.width > 100);
        assert.ok(surface.description.contrast >= 4.5, 'Collection description contrast for ' + id);
        assert.ok(surface.introduction.contrast >= 4.5, 'Collection introduction contrast for ' + id);
        surfaces.push({ theme: id, ...surface });
        if (['dark', 'light', 'violet'].includes(id)) {
          await page.locator('#appearance-section').screenshot({ path: path.join(output, 'collection-' + id + '-' + width + '.png'), animations: 'disabled' });
        }
        await cancel();
      }
    }
    observations.push('Les neuf thèmes existants restent isolés et sans débordement horizontal à 1440 et 390 px.');
    for (const [key, value] of Object.entries(unchangedStores)) {
      assert.deepEqual(await app.read(key), value, 'Theme selection preserves ' + key);
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(app.errors, []);
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ observations, surfaces, requests: app.requests, errors }, null, 2));
    console.log(observations.map(observation => 'OK ' + observation).join('\n'));
  } catch (error) {
    if (page) {
      await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
      console.error('Theme browser state:', await page.evaluate(() => ({ user: window.CU?.pseudo, current: window._currentTheme, account: typeof getCurrentAccount === 'function' && getCurrentAccount()?.selectedTheme, preview: document.getElementById('np-theme-preview-bar')?.innerText, tab: document.querySelector('.tab-content.active')?.id })).catch(() => ({})));
    }
    throw error;
  } finally {
    if (releasePending) releasePending();
    if (releaseRead) releaseRead();
    if (browser) await browser.close();
    await app.close();
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
