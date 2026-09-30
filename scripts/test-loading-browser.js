'use strict';

// Real boot requests use the production handlers and an isolated PGlite store.
// Delays and network failures are injected at the browser response boundary.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createLocalApp } = require('./helpers/local-app');

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

async function reached(gate) {
  let timer;
  try {
    await Promise.race([gate.arrived, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Boot did not reach the expected request')), 10000);
    })]);
  } finally { clearTimeout(timer); }
}

(async () => {
  const app = await createLocalApp();
  const output = path.resolve(process.env.NP_TEST_OUTPUT || 'test-results/loading');
  fs.mkdirSync(output, { recursive: true });
  const errors = [], observations = [], gates = [];
  let browser;
  try {
    browser = await chromium.launch({ headless: true });

    async function newPage(options = {}) {
      const { account, ...contextOptions } = options;
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...contextOptions });
      if (account) {
        await context.addCookies([{ name: 'np_session', value: (await app.cookie(account)).slice('np_session='.length), url: app.origin, httpOnly: true }]);
      }
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      page.on('pageerror', error => errors.push(error.stack || error.message));
      await page.route('https://**/*', route => route.abort());
      await page.addInitScript(() => {
        // Observe rendering through the public canvas API, including a removed
        // canvas, so an orphaned animation loop cannot silently keep drawing.
        const loaderCanvases = new WeakSet();
        window.__loadingDraws = 0;
        ['clearRect', 'fillRect', 'drawImage'].forEach(name => {
          const original = CanvasRenderingContext2D.prototype[name];
          CanvasRenderingContext2D.prototype[name] = function () {
            if (this.canvas.closest('#db-loader')) loaderCanvases.add(this.canvas);
            if (loaderCanvases.has(this.canvas)) window.__loadingDraws++;
            return original.apply(this, arguments);
          };
        });
      });
      return page;
    }

    async function hold(page, endpoint, action) {
      const arrived = deferred(), released = deferred();
      gates.push(released.resolve);
      await page.route('**/.netlify/functions/' + endpoint, async route => {
        if (route.request().postDataJSON()?.action !== action) return route.continue();
        arrived.resolve();
        await released.promise;
        if (!page.isClosed()) await route.continue();
      });
      return { arrived: arrived.promise, release: released.resolve };
    }

    async function removed(page) {
      await page.locator('#db-loader').waitFor({ state: 'detached' });
      const draws = await page.evaluate(() => window.__loadingDraws);
      await page.waitForTimeout(200);
      assert.equal(await page.evaluate(() => window.__loadingDraws), draws, 'A removed loader stops drawing its canvas');
    }

    async function step(page, name, state) {
      await page.locator('#db-loader .np-loader-step[data-step="' + name + '"][data-state="' + state + '"]').waitFor({ state: 'attached' });
    }

    async function fitsViewport(page) {
      const layout = await page.evaluate(() => {
        const loader = document.getElementById('db-loader');
        const box = loader.getBoundingClientRect();
        const clipped = Array.from(loader.querySelectorAll('h1,h2,.np-loader-status,.np-loader-motion,.np-loader-step')).filter(element => {
          const rect = element.getBoundingClientRect();
          if (!rect.width || !rect.height || getComputedStyle(element).visibility === 'hidden') return false;
          return rect.left < -1 || rect.right > innerWidth + 1 || rect.top < -1 || rect.bottom > innerHeight + 1;
        }).map(element => element.className || element.tagName);
        return { width: box.width, height: box.height, viewportWidth: innerWidth, viewportHeight: innerHeight, clipped, overflowX: loader.scrollWidth > loader.clientWidth + 1 };
      });
      assert.equal(layout.width, layout.viewportWidth, 'Loader covers the viewport width');
      assert.equal(layout.height, layout.viewportHeight, 'Loader covers the viewport height');
      assert.equal(layout.overflowX, false, 'Loader has no horizontal overflow');
      assert.deepEqual(layout.clipped, [], 'Loader text and controls stay inside the viewport');
    }

    const desktop = await newPage({ account: 'alice' });
    const world = await hold(desktop, 'db', 'get_public_bundle');
    const session = await hold(desktop, 'auth', 'verify');
    await desktop.goto(app.origin, { waitUntil: 'load' });
    await reached(world);
    await step(desktop, 'world', 'active');
    await step(desktop, 'session', 'pending');
    await step(desktop, 'ready', 'pending');
    assert.equal(await desktop.locator('#db-loader .np-loader-status').getAttribute('role'), 'status');
    assert.ok((await desktop.locator('#db-loader .np-loader-status').innerText()).trim(), 'A readable status accompanies the scene');
    await fitsViewport(desktop);
    await desktop.screenshot({ path: path.join(output, 'loading-desktop.png') });

    const motion = desktop.locator('#db-loader .np-loader-motion');
    assert.equal(await motion.getAttribute('aria-pressed'), 'false');
    await motion.focus();
    await desktop.keyboard.press('Space');
    assert.equal(await motion.getAttribute('aria-pressed'), 'true', 'Keyboard toggles the motion control');
    await desktop.waitForTimeout(80);
    const pausedDraws = await desktop.evaluate(() => window.__loadingDraws);
    await desktop.waitForTimeout(140);
    assert.equal(await desktop.evaluate(() => window.__loadingDraws), pausedDraws, 'Pausing stops canvas motion');
    const runningWhilePaused = await desktop.evaluate(() => document.getElementById('db-loader').getAnimations({ subtree: true }).filter(animation => animation.playState === 'running' && animation.effect?.getTiming().iterations === Infinity).length);
    assert.equal(runningWhilePaused, 0, 'Pausing stops decorative CSS loops');
    await desktop.keyboard.press('Enter');
    assert.equal(await motion.getAttribute('aria-pressed'), 'false', 'Keyboard resumes motion');
    await desktop.waitForFunction(count => window.__loadingDraws > count, pausedDraws);
    observations.push('Décor animé, commande clavier pause/reprise et arrêt réel du canvas.');

    world.release();
    await reached(session);
    await step(desktop, 'world', 'complete');
    await step(desktop, 'session', 'active');
    await step(desktop, 'ready', 'pending');
    await desktop.screenshot({ path: path.join(output, 'loading-session.png') });
    session.release();
    await step(desktop, 'ready', 'complete');
    await removed(desktop);
    await desktop.waitForFunction(() => window.CU?.pseudo === 'Alice');
    observations.push('Les étapes suivent les réponses publiques puis la session réelle ; la session Alice est restaurée.');
    await desktop.context().close();

    const anonymous = await newPage();
    await anonymous.goto(app.origin, { waitUntil: 'load' });
    await removed(anonymous);
    assert.equal(await anonymous.locator('#s-home.active').count(), 1, 'A fast anonymous boot reaches the home screen');
    // Public lifecycle API: finishing a freshly mounted scene must not impose
    // a minimum viewing time, and a second finish must remain harmless.
    const exitTime = await anonymous.evaluate(() => new Promise(resolve => {
      window.NPLoader.mount('<svg viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="4"/></svg>');
      const loader = document.getElementById('db-loader');
      const started = performance.now();
      const observer = new MutationObserver(() => {
        if (!loader.isConnected) { observer.disconnect(); resolve(performance.now() - started); }
      });
      observer.observe(document.body, { childList: true });
      window.NPLoader.finish();
      window.NPLoader.finish();
    }));
    assert.ok(exitTime < 850, 'Finish removes the scene within its short exit transition, without an artificial minimum (' + Math.round(exitTime) + ' ms)');
    await removed(anonymous);
    observations.push('Accueil anonyme rapide, sortie sans durée minimale et finalisation répétée sans erreur.');
    await anonymous.context().close();

    const offline = await newPage();
    const offlineSession = await hold(offline, 'auth', 'verify');
    await offline.route('**/.netlify/functions/db', route => route.request().postDataJSON()?.action === 'get_public_bundle' ? route.abort('failed') : route.continue());
    await offline.goto(app.origin, { waitUntil: 'load' });
    await reached(offlineSession);
    await offline.waitForFunction(() => /hors.ligne|connexion.*indisponible|cache|connexion.*interrompue/i.test(document.querySelector('#db-loader .np-loader-status')?.textContent || ''));
    offlineSession.release();
    await removed(offline);
    assert.equal(await offline.locator('#s-home.active').count(), 1, 'A network failure still releases the home screen');
    observations.push('Une panne réseau affiche le repli hors ligne puis libère l’accueil.');
    await offline.context().close();

    for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }]) {
      const mobile = await newPage({ viewport, isMobile: true, hasTouch: true });
      const request = await hold(mobile, 'db', 'get_public_bundle');
      await mobile.goto(app.origin, { waitUntil: 'load' });
      await reached(request);
      await step(mobile, 'world', 'active');
      await fitsViewport(mobile);
      const button = await mobile.locator('#db-loader .np-loader-motion').boundingBox();
      assert.ok(button?.height >= 44 && button.width >= 44, 'Motion control has a usable touch target');
      await mobile.screenshot({ path: path.join(output, 'loading-mobile-' + viewport.width + '.png') });
      request.release();
      await removed(mobile);
      await mobile.context().close();
    }
    observations.push('Mise en page et commande tactile contrôlées à 320 et 390 px.');

    const reduced = await newPage({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
    const reducedRequest = await hold(reduced, 'db', 'get_public_bundle');
    await reduced.goto(app.origin, { waitUntil: 'load' });
    await reached(reducedRequest);
    await step(reduced, 'world', 'active');
    await reduced.waitForTimeout(100);
    const stillDraws = await reduced.evaluate(() => window.__loadingDraws);
    await reduced.waitForTimeout(180);
    assert.equal(await reduced.evaluate(() => window.__loadingDraws), stillDraws, 'Reduced motion does not continuously animate the canvas');
    assert.equal(await reduced.evaluate(() => document.getElementById('db-loader').getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length), 0, 'Reduced motion stops decorative CSS animation');
    await fitsViewport(reduced);
    await reduced.screenshot({ path: path.join(output, 'loading-reduced-motion.png') });
    reducedRequest.release();
    await removed(reduced);
    observations.push('Préférence de mouvement réduit respectée par le CSS et le canvas.');
    await reduced.context().close();

    assert.deepEqual(errors, [], 'No uncaught browser errors');
    assert.deepEqual(app.errors, [], 'No production handler errors');
    fs.writeFileSync(path.join(output, 'observations.json'), JSON.stringify(observations, null, 2) + '\n');
    console.log(observations.join('\n'));
  } finally {
    gates.forEach(release => release());
    if (browser) await browser.close();
    await app.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
