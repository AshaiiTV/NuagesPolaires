'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createLocalApp } = require('./helpers/local-app');

function bounded(promise, label) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Timeout: ' + label)), 15000);
  })]).finally(() => clearTimeout(timer));
}

// Real browser + production handlers + an isolated PostgreSQL fixture. Error
// responses are intercepted only for the failure scenarios below.
(async () => {
  const app = await createLocalApp();
  const output = path.resolve(process.env.NP_TEST_OUTPUT || 'test-results/player-actions');
  fs.mkdirSync(output, { recursive: true });
  let browser;
  let page;
  let releasePending;
  const observations = [];
  const errors = [];
  const dbUrl = '**/.netlify/functions/db';
  try {
    const now = Date.now();
    const players = (await app.read('players')).value;
    const alice = players.find(player => player.id === 'p_alice');
    const bob = players.find(player => player.id === 'p_bob');
    alice.inventory = [{ id: 'potion', name: 'Potion boréale', category: 'Consommable', qty: 4 }];
    alice.history = [
      { ts: now - 2000, type: 'item', text: 'Équipement reçu', by: 'Maitre' },
      { ts: now - 1000, type: 'xp', text: 'XP de la dernière session', by: 'Maitre' }
    ];
    bob.inventory = [{ id: 'potion', name: 'Potion de Bob', category: 'Consommable', qty: 7 }];
    const originalBob = JSON.parse(JSON.stringify(bob));
    await app.seed('players', players);
    const visibleEvent = { id: 'expedition', nom: 'Expédition du navigateur', date: now + 86400000, type: 'exploration', desc: 'Rendez-vous au camp.', max: 3, hidden: false, inscrits: ['Bob'] };
    const hiddenEvent = { id: 'secret', nom: 'Événement masqué de test', date: now + 43200000, type: 'social', max: 0, hidden: true, inscrits: [] };
    await app.seed('events', [visibleEvent, hiddenEvent]);

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => errors.push(error.stack || error.message));
    await page.route('https://**/*', route => route.abort());

    async function ready(pseudo = 'Alice') {
      await page.waitForFunction(name => window.CU && CU.pseudo === name, pseudo);
      await page.waitForFunction(() => {
        const overlay = document.getElementById('login-transition-overlay');
        const flash = document.getElementById('lto-flash');
        return (!overlay || !overlay.classList.contains('active')) && (!flash || getComputedStyle(flash).opacity === '0');
      });
    }
    async function spyNotices() {
      await page.evaluate(() => {
        if (!window.__playerActionNoticeSpy) {
          const previous = window.notif;
          window.notif = function (message, type) {
            window.__playerActionNotices.push({ message, type });
            return previous.apply(this, arguments);
          };
          window.__playerActionNoticeSpy = true;
        }
        window.__playerActionNotices = [];
      });
    }
    async function login(pseudo) {
      await page.evaluate(() => showScreen('s-login'));
      await page.locator('#login-id').fill(pseudo);
      await page.locator('#login-pass').fill(pseudo + '-audit-123!');
      await page.locator('button[onclick="loginUnified()"]').click();
      await ready(pseudo);
      await spyNotices();
    }
    async function reload() {
      await page.reload({ waitUntil: 'load' });
      await ready();
      await spyNotices();
    }
    async function profile() {
      await page.locator('#dd-aventure-btn').click();
      await page.locator('#dd-aventure-menu').getByRole('button', { name: 'Mon personnage', exact: true }).click();
      await page.locator('#p-csel').waitFor({ state: 'visible' });
      await page.locator('button[onclick="playerConsume()"]').scrollIntoViewIfNeeded();
    }
    async function events() {
      await page.locator('[data-app-tab="evenements"]').click();
      await page.locator('#p-events-c').waitFor({ state: 'visible' });
    }
    async function aliceState() {
      return (await app.read('players')).value.find(player => player.id === 'p_alice');
    }
    async function cachedAlice() {
      return page.evaluate(() => gpid('p_alice'));
    }
    function responseFor(action) {
      const pending = page.waitForResponse(response => response.url().endsWith('/.netlify/functions/db') && response.request().postDataJSON()?.action === action);
      pending.catch(() => {});
      return pending;
    }
    async function clickAction(locator, action) {
      const response = responseFor(action);
      await locator.click();
      return response;
    }
    async function simulateFailure(action, run) {
      await spyNotices();
      const fail = route => route.request().postDataJSON()?.action === action
        ? route.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false,"error":"Échec de sauvegarde simulé"}' })
        : route.continue();
      await page.route(dbUrl, fail);
      try {
        assert.equal((await run()).status(), 503);
        await page.waitForFunction(() => __playerActionNotices.some(notice => notice.type === 'err'));
        assert.equal(await page.evaluate(() => __playerActionNotices.some(notice => notice.type === 'ok')), false);
      } finally {
        await page.unroute(dbUrl, fail);
      }
    }

    await page.goto(app.origin, { waitUntil: 'load' });
    await page.waitForFunction(() => typeof window.loginUnified === 'function');
    await login('Alice');
    await page.evaluate(() => switchTab('accueil', null));
    assert.match(await page.locator('#p-accueil-c').textContent(), /Expédition du navigateur/);
    assert.doesNotMatch(await page.locator('#p-accueil-c').textContent(), /Événement masqué de test/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(output, 'home-desktop.png'), fullPage: true, animations: 'disabled' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => document.getElementById('mobile-drawer').getBoundingClientRect().right <= 1);
    await page.screenshot({ path: path.join(output, 'home-mobile.png'), fullPage: true, animations: 'disabled' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await reload();
    await page.waitForFunction(() => document.getElementById('mobile-drawer').getBoundingClientRect().right <= 1);
    await page.screenshot({ path: path.join(output, 'home-mobile-reload.png'), fullPage: true, animations: 'disabled' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.locator('#burger-btn').click();
    await page.waitForFunction(() => document.getElementById('mobile-drawer').getBoundingClientRect().left === 0);
    await page.screenshot({ path: path.join(output, 'home-mobile-menu.png'), fullPage: true, animations: 'disabled' });
    await page.locator('#mobile-drawer').getByRole('button', { name: 'Événements', exact: true }).click();
    await page.locator('#p-events-c').waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.getElementById('mobile-drawer').getBoundingClientRect().right <= 1);
    await page.locator('#burger-btn').click();
    await page.locator('#mobile-drawer').getByRole('button', { name: 'Tableau de bord', exact: true }).click();
    await page.locator('#p-accueil-c').waitFor({ state: 'visible' });
    await page.setViewportSize({ width: 1440, height: 1000 });
    observations.push('Login réel ; accueil et agenda cohérents ; navigation joueur desktop/mobile par vrais clics, sans débordement horizontal.');

    await profile();
    await page.locator('#p-cnote').fill('Après la chasse');
    await page.locator('#p-csel').selectOption('potion');
    let captured;
    const capture = new Promise(resolve => { captured = resolve; });
    const gate = new Promise(resolve => { releasePending = resolve; });
    let consumeRequests = 0;
    const holdConsume = async route => {
      if (route.request().postDataJSON()?.action === 'consume_own_item') {
        consumeRequests++;
        captured();
        await gate;
      }
      await route.continue();
    };
    await page.route(dbUrl, holdConsume);
    const firstResponse = responseFor('consume_own_item');
    await page.locator('button[onclick="playerConsume()"]').dblclick();
    await bounded(capture, 'consumption request intercepted');
    assert.equal(consumeRequests, 1, 'Un double clic doit déclencher une seule consommation.');
    releasePending();
    releasePending = null;
    assert.equal((await firstResponse).status(), 200);
    await page.waitForFunction(() => gpid('p_alice').inventory.find(item => item.id === 'potion').qty === 3);
    await page.unroute(dbUrl, holdConsume);
    assert.equal((await aliceState()).inventory[0].qty, 3);
    assert.equal((await aliceState()).history.length, 3);
    assert.match((await aliceState()).history[2].text, /Après la chasse/);
    assert.deepEqual((await app.read('players')).value.find(player => player.id === 'p_bob'), originalBob);
    await reload();
    await profile();
    assert.equal((await cachedAlice()).inventory[0].qty, 3);
    assert.match(await page.locator('#p-hist').textContent(), /Après la chasse/);
    observations.push('Consommation persistée une seule fois malgré un double clic ; inventaire et historique relus, Bob inchangé.');

    await page.locator('#notif-bell').click();
    // Select a known original notification, independently of history sort order.
    const knownSelector = '#notif-panel button[onclick="deleteNotif(\'p_alice\',' + (now - 2000) + ')"]';
    assert.equal((await clickAction(page.locator(knownSelector), 'dismiss_notifications')).status(), 200);
    await page.waitForFunction(ts => (gpid('p_alice').notifDeleted || []).includes(ts), now - 2000);
    assert.equal((await aliceState()).history.length, 3, 'Masquer une notification conserve l’historique.');
    await reload();
    await page.locator('#notif-bell').click();
    assert.equal(await page.locator(knownSelector).count(), 0);
    const beforeDismissFailure = await cachedAlice();
    await simulateFailure('dismiss_notifications', () => clickAction(page.getByRole('button', { name: 'TOUT EFFACER', exact: true }), 'dismiss_notifications'));
    assert.deepEqual((await cachedAlice()).notifDeleted, beforeDismissFailure.notifDeleted);
    assert.deepEqual((await aliceState()).notifDeleted, beforeDismissFailure.notifDeleted);
    await reload();
    await page.locator('#notif-bell').click();
    assert.equal((await clickAction(page.getByRole('button', { name: 'TOUT EFFACER', exact: true }), 'dismiss_notifications')).status(), 200);
    await page.waitForFunction(() => getPlayerNotifs('p_alice').length === 0);
    await reload();
    await page.locator('#notif-bell').click();
    assert.match(await page.locator('#notif-panel').textContent(), /Aucune notification/);
    assert.equal((await aliceState()).history.length, 3);
    await page.locator('#notif-bell').click();
    observations.push('Suppression individuelle et globale des notifications persistée ; refus API sans effacement local et historique conservé.');

    await events();
    const join = page.locator('button[onclick="eventInscrit(\'expedition\')"]');
    const leave = page.locator('button[onclick="eventDesinscrit(\'expedition\')"]');
    assert.equal((await clickAction(join, 'set_event_participation')).status(), 200);
    await leave.waitFor({ state: 'visible' });
    assert.deepEqual((await app.read('events')).value.find(event => event.id === 'expedition').inscrits, ['Bob', 'Alice']);
    assert.deepEqual((await app.read('events')).value.find(event => event.id === 'secret'), hiddenEvent);
    await reload();
    await events();
    await leave.waitFor({ state: 'visible' });
    assert.equal((await clickAction(leave, 'set_event_participation')).status(), 200);
    await join.waitFor({ state: 'visible' });
    await reload();
    await events();
    await join.waitFor({ state: 'visible' });
    assert.deepEqual((await app.read('events')).value.find(event => event.id === 'expedition').inscrits, ['Bob']);
    const beforeEventFailure = await app.read('events');
    await simulateFailure('set_event_participation', () => clickAction(join, 'set_event_participation'));
    assert.deepEqual(await page.evaluate(() => getEvents().find(event => event.id === 'expedition').inscrits), ['Bob']);
    assert.equal((await app.read('events')).version, beforeEventFailure.version);
    observations.push('Inscription/désinscription persistées après rechargement ; autres participants et événement masqué préservés ; refus sans fausse inscription.');

    await reload();
    await profile();
    await page.locator('#p-csel').selectOption('potion');
    await page.locator('#p-cnote').fill('Brouillon conservé si erreur');
    const beforeConsumeFailure = await app.read('players');
    const beforeConsumeCache = await cachedAlice();
    await simulateFailure('consume_own_item', () => clickAction(page.locator('button[onclick="playerConsume()"]'), 'consume_own_item'));
    assert.deepEqual(await cachedAlice(), beforeConsumeCache);
    assert.equal((await app.read('players')).version, beforeConsumeFailure.version);
    assert.equal(await page.locator('#p-cnote').inputValue(), 'Brouillon conservé si erreur');

    await reload();
    await profile();
    await page.locator('#p-cnote').fill('Brouillon en conflit');
    await page.locator('#p-csel').selectOption('potion');

    const concurrentPlayers = (await app.read('players')).value;
    concurrentPlayers.find(player => player.id === 'p_bob').journal = 'Modification concurrente conservée';
    await app.seed('players', concurrentPlayers);
    await spyNotices();
    assert.equal((await clickAction(page.locator('button[onclick="playerConsume()"]'), 'consume_own_item')).status(), 409);
    await page.waitForFunction(() => __playerActionNotices.some(notice => notice.type === 'err'));
    assert.equal(await page.evaluate(() => __playerActionNotices.some(notice => notice.type === 'ok')), false);
    assert.equal((await aliceState()).inventory[0].qty, 3);
    assert.equal((await cachedAlice()).inventory[0].qty, 3);
    assert.equal((await app.read('players')).value.find(player => player.id === 'p_bob').journal, 'Modification concurrente conservée');
    observations.push('Consommation refusée sur erreur réseau ou révision périmée : aucune quantité perdue, brouillon conservé, modification concurrente intacte.');

    await reload();
    await profile();
    await page.locator('#p-csel').selectOption('potion');
    await page.locator('#p-cnote').fill('Consommation Alice avant changement de session');
    let saved;
    const savedOnServer = new Promise(resolve => { saved = resolve; });
    const lateGate = new Promise(resolve => { releasePending = resolve; });
    const lateReply = async route => {
      if (route.request().postDataJSON()?.action !== 'consume_own_item') return route.continue();
      const response = await route.fetch();
      saved(response.status());
      await lateGate;
      await route.fulfill({ response });
    };
    await page.route(dbUrl, lateReply);
    await page.evaluate(() => {
      window.__lateConsumeSettled = false;
      playerConsume().finally(() => { window.__lateConsumeSettled = true; });
    });
    assert.equal(await bounded(savedOnServer, 'delayed consumption saved on server'), 200);
    await login('Bob');
    const bobBeforeLateReply = await page.evaluate(() => gpid('p_bob'));
    releasePending();
    releasePending = null;
    await page.waitForFunction(() => window.__lateConsumeSettled);
    assert.equal(await page.evaluate(() => CU.pseudo), 'Bob');
    assert.deepEqual(await page.evaluate(() => gpid('p_bob')), bobBeforeLateReply);
    assert.equal(await page.evaluate(() => !!gpid('p_alice')), false);
    assert.deepEqual(await page.evaluate(() => __playerActionNotices), []);
    assert.doesNotMatch(await page.locator('body').innerText(), /La session a changé pendant le chargement/);
    assert.equal((await aliceState()).inventory[0].qty, 2);
    await page.unroute(dbUrl, lateReply);
    observations.push('Réponse Alice retardée après connexion Bob ignorée : aucun cache ni message de la session précédente.');

    assert.deepEqual(errors, []);
    assert.deepEqual(app.errors, []);
    assert.deepEqual(app.requests.filter(request => request.key === 'np_syslog' && request.status >= 400), [], 'La connexion joueur ne doit pas tenter une écriture de journal réservée au staff.');
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ observations, requests: app.requests, errors }, null, 2));
    console.log(observations.map(observation => 'OK ' + observation).join('\n'));
  } catch (error) {
    if (page) {
      await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
      console.error('Browser state:', await page.evaluate(() => ({ user: window.CU?.pseudo, selected: document.getElementById('p-csel')?.value, error: document.getElementById('p-cerr')?.textContent, notices: window.__playerActionNotices, activeTab: document.querySelector('.tab-content.active')?.id })).catch(() => ({})));
    }
    throw error;
  } finally {
    if (releasePending) releasePending();
    if (browser) await browser.close();
    await app.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
