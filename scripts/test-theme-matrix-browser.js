'use strict';

// Production UI + isolated PostgreSQL. This suite deliberately calls the public
// rendering API: entitlement, preview and save transactions have their own suite.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const { createLocalApp } = require('./helpers/local-app');

const THEMES = ['dark', 'light', 'violet', 'green', 'aquaris', 'easter', 'halloween', 'noel', 'bloodmoon'];
const VIEWPORTS = [{ width: 1440, height: 1000 }, { width: 390, height: 844 }];
const OUTPUT = path.resolve(process.env.NP_TEST_OUTPUT || path.join(os.tmpdir(), 'np-theme-matrix'));
const SCREENSHOTS = process.env.NP_THEME_SCREENSHOTS === '1';

// Runs in the browser. Calculate contrast only where CSS gives an unambiguous
// solid background (including alpha compositing). Gradients/images are reported
// as unmeasured, never silently certified using the fallback background color.
function inspectFamily(selector) {
  const scope = document.querySelector(selector);
  if (!scope) return { missing: selector };
  function color(value) {
    const match = value.match(/^rgba?\(([^)]+)\)$/);
    if (!match) return null;
    const parts = match[1].split(/[\s,\/]+/).filter(Boolean).map(Number);
    return parts.length >= 3 ? [...parts.slice(0, 3), parts.length > 3 ? parts[3] : 1] : null;
  }
  function over(top, bottom) {
    const alpha = top[3] + bottom[3] * (1 - top[3]);
    return alpha ? [0, 1, 2].map(i => (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / alpha).concat(alpha) : [0, 0, 0, 0];
  }
  function luminance(rgb) {
    const linear = rgb.slice(0, 3).map(channel => {
      const c = channel / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  }
  function label(el) {
    if (el.id) return '#' + el.id;
    return el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '');
  }
  function rendered(el) {
    if (!el.getClientRects().length || el.closest('[hidden], [aria-hidden="true"]')) return false;
    for (let at = el; at; at = at.parentElement) {
      const css = getComputedStyle(at);
      if (css.visibility === 'hidden' || css.display === 'none' || Number(css.opacity) === 0) return false;
    }
    return true;
  }
  function solidBackground(el) {
    let result = [0, 0, 0, 0];
    for (let at = el; at; at = at.parentElement) {
      const css = getComputedStyle(at);
      if (css.backgroundImage !== 'none') return { skipped: 'gradient-or-image' };
      if (Number(css.opacity) < 1) return { skipped: 'group-opacity' };
      const layer = color(css.backgroundColor);
      if (!layer) return { skipped: 'unsupported-color' };
      result = over(result, layer);
      if (result[3] >= 0.999) return { rgb: result };
    }
    return { rgb: over(result, [255, 255, 255, 1]) };
  }
  const contrast = [], unmeasured = [], overflow = [];
  const elements = [scope, ...scope.querySelectorAll('*')];
  for (const el of elements) {
    if (!rendered(el) || ['SCRIPT', 'STYLE', 'SVG', 'PATH', 'OPTION'].includes(el.tagName)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && (rect.left < -2 || rect.right > innerWidth + 2)) {
      let clipped = false;
      for (let at = el.parentElement; at && at !== document.body; at = at.parentElement) {
        if (/hidden|clip|auto|scroll/.test(getComputedStyle(at).overflowX)) {
          const bounds = at.getBoundingClientRect();
          if (bounds.left >= -2 && bounds.right <= innerWidth + 2) { clipped = true; break; }
        }
      }
      if (!clipped) overflow.push({ element: label(el), left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) });
    }
    const ownText = Array.from(el.childNodes).filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join(' ').trim();
    const isInput = el.matches('input:not([type="range"]):not([type="checkbox"]):not([type="file"]), textarea');
    const text = ownText || (isInput ? el.value : '');
    if (!text || el.matches(':disabled') || el.closest('[aria-disabled="true"], button:disabled')) continue;
    const css = getComputedStyle(el);
    const background = solidBackground(el);
    const foreground = color(css.color);
    const sample = { element: label(el), text: text.replace(/\s+/g, ' ').slice(0, 90), foreground: css.color, background: background.rgb };
    if (el.matches('.serm-icon') && /^[\p{Extended_Pictographic}\uFE0F\s]+$/u.test(text)) {
      unmeasured.push({ ...sample, reason: 'emoji-paint-is-not-css-text-color' });
      continue;
    }
    if (background.skipped || !foreground) {
      unmeasured.push({ ...sample, reason: background.skipped || 'unsupported-color' });
      continue;
    }
    const foregroundLight = luminance(over(foreground, background.rgb));
    const backgroundLight = luminance(background.rgb);
    const ratio = (Math.max(foregroundLight, backgroundLight) + 0.05) / (Math.min(foregroundLight, backgroundLight) + 0.05);
    // Large headings have a 3:1 threshold; normal text and actions retain 4.5:1.
    const large = parseFloat(css.fontSize) >= 24 || (parseFloat(css.fontSize) >= 18.66 && parseInt(css.fontWeight, 10) >= 700);
    const action = !!el.closest('button, a, [role="button"], input, textarea, select');
    const threshold = large && !action ? 3 : 4.5;
    contrast.push({ ...sample, ratio: Math.round(ratio * 100) / 100, threshold, pass: ratio >= threshold });
  }
  const rootRect = scope.getBoundingClientRect();
  return {
    selector,
    bodyTheme: document.body.dataset.themeActive,
    htmlTheme: document.documentElement.dataset.themeActive,
    root: { left: rootRect.left, right: rootRect.right, width: rootRect.width },
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: innerWidth,
    contrast,
    unmeasured,
    overflow: overflow.slice(0, 20)
  };
}

(async () => {
  fs.mkdirSync(OUTPUT, { recursive: true });
  const app = await createLocalApp();
  const failures = [], rows = [], errors = [];
  let browser, page;
  function check(condition, message, details) {
    if (!condition) failures.push({ message, ...(details === undefined ? {} : { details }) });
  }
  try {
    const players = (await app.read('players')).value;
    Object.assign(players.find(player => player.id === 'p_alice'), {
      classe: 'Duelliste', arme: 'Épée moyenne', level: 2, xp: 15, xpMax: 60,
      pvCur: 21, epCur: 34, emCur: 12, branch: 'Aucune',
      inventory: [{ id: 'potion', name: 'Potion de soin', category: 'Consommable', qty: 2 }]
    });
    await app.seed('players', players);
    await app.seed('events', [{
      id: 'theme-expedition', nom: 'Expédition de la banquise', type: 'exploration',
      date: Date.now() + 7 * 86400000, max: 4, inscrits: ['Bob'],
      desc: 'Retrouver les balises du refuge avant le lever du jour.', createdBy: 'Admin'
    }]);
    browser = await chromium.launch({ headless: true });
    for (const viewport of VIEWPORTS) {
      const size = viewport.width < 600 ? 'mobile' : 'desktop';
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
      await context.addCookies([{ name: 'np_session', value: (await app.cookie('alice')).slice('np_session='.length), url: app.origin, httpOnly: true }]);
      page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on('pageerror', error => errors.push(size + ': ' + (error.stack || error.message)));
      await page.route('https://**/*', route => route.abort());
      await page.goto(app.origin, { waitUntil: 'load' });
      await page.waitForFunction(() => window.CU && CU.pseudo === 'Alice');
      await page.waitForFunction(() => {
        const overlay = document.getElementById('login-transition-overlay');
        const flash = document.getElementById('lto-flash');
        return (!overlay || !overlay.classList.contains('active')) && (!flash || getComputedStyle(flash).opacity === '0');
      });
      assert.equal(await page.evaluate(() => typeof window.NPThemeEngine?.apply), 'function', 'Le moteur public de thèmes doit être chargé par index.html.');
      assert.equal(await page.evaluate(() => typeof window.NPThemeCatalog?.list), 'function', 'Le catalogue commun doit être chargé par index.html.');
      const ids = await page.evaluate(() => NPThemeCatalog.list().map(theme => theme.id));
      assert.deepEqual(ids.slice().sort(), THEMES.slice().sort(), 'La matrice couvre tous les thèmes du catalogue.');

      async function navigate(label, target) {
        // Account/reference pages use an overlay; close it through its own UI
        // before opening the global navigation, on both viewport sizes.
        const close = page.locator('.tab-content.active > .tab-popup-close');
        if (await close.isVisible()) await close.click();
        if (size === 'mobile') {
          await page.locator('#burger-btn').click();
          await page.locator('#mobile-drawer').getByRole('button', { name: label }).click();
        } else if (target === 'evenements') {
          await page.locator('[data-app-tab="evenements"]').click();
        } else {
          const group = ['accueil', 'fiche'].includes(target) ? 'aventure' : 'joueurs';
          await page.locator('#dd-' + group + '-btn').click();
          await page.locator('#dd-' + group + '-menu').getByRole('button', { name: label }).click();
        }
        await page.locator('#' + target + '.active').waitFor({ state: 'visible' });
      }
      async function audit(theme, family, selector) {
        await page.waitForFunction(query => {
          const el = document.querySelector(query);
          if (!el) return false;
          for (let at = el; at; at = at.parentElement) {
            if (Number(getComputedStyle(at).opacity) < 0.99) return false;
          }
          return true;
        }, selector);
        const report = await page.evaluate(inspectFamily, selector);
        rows.push({ theme, viewport: size, family, ...report });
        check(!report.missing, `${size}/${theme}/${family}: famille présente`, report);
        if (report.missing) return;
        check(report.bodyTheme === theme && report.htmlTheme === theme, `${size}/${theme}/${family}: palette conservée après navigation et insertion`, { html: report.htmlTheme, body: report.bodyTheme });
        check(report.documentWidth <= viewport.width + 2, `${size}/${theme}/${family}: aucun débordement du document`, report.documentWidth);
        check(!report.overflow.length, `${size}/${theme}/${family}: contenu dans la largeur disponible`, report.overflow);
        const low = report.contrast.filter(sample => !sample.pass);
        check(!low.length, `${size}/${theme}/${family}: contraste du texte et des actions`, low);
        check(report.contrast.length > 0, `${size}/${theme}/${family}: au moins un fond simple mesuré`);
        const referenceCapture = ['dark', 'light', 'easter'].includes(theme) || (theme === 'bloodmoon' && size === 'mobile');
        if (SCREENSHOTS || (referenceCapture && ['fiche', 'collection', 'menu', 'modale'].includes(family)) || low.length || report.overflow.length) {
          if (family === 'collection') await page.locator('.np-theme-vault-card').first().scrollIntoViewIfNeeded();
          await page.screenshot({ path: path.join(OUTPUT, `${size}-${theme}-${family}.png`), animations: 'disabled' });
        }
      }
      const resourceColors = {};
      for (const theme of THEMES) {
        await navigate('Mon personnage', 'fiche');
        await page.locator('#p-cnote').fill('Brouillon conservé : ' + theme + ' / ' + size);
        const preferenceWrites = app.requests.filter(request => request.action === 'self_set_theme').length;
        const immediate = await page.evaluate(id => {
          const input = document.getElementById('p-cnote');
          const before = { value: input.value, hash: location.hash, nav: window._navCurrent, history: history.length };
          NPThemeEngine.apply(id);
          const html = getComputedStyle(document.documentElement), body = getComputedStyle(document.body);
          const tokenNames = ['--bg', '--bg2', '--bg3', '--text', '--dim', '--faint', '--glacier', '--tm-bg', '--tm-text', '--tm-page-bg', '--tm-primary-bg', '--tm-primary-text', '--tm-link', '--tm-focus', '--status-danger', '--status-warning', '--status-info', '--status-success'];
          return {
            before, after: { value: input.value, hash: location.hash, nav: window._navCurrent, history: history.length },
            sameInput: input === document.getElementById('p-cnote'),
            htmlTheme: document.documentElement.dataset.themeActive,
            bodyTheme: document.body.dataset.themeActive,
            tokens: tokenNames.map(name => ({ name, html: html.getPropertyValue(name).trim(), body: body.getPropertyValue(name).trim() })),
            colorScheme: html.colorScheme,
            resources: ['pv', 'ep', 'em'].map(key => {
              const bar = getComputedStyle(document.getElementById(key + '-b'));
              return { key, text: document.getElementById(key + '-v').textContent.trim(), background: bar.backgroundColor, image: bar.backgroundImage };
            })
          };
        }, theme);
        check(immediate.sameInput, `${size}/${theme}: le changement conserve le nœud textarea`);
        check(JSON.stringify(immediate.before) === JSON.stringify(immediate.after), `${size}/${theme}: valeur, navigation et historique conservés`, immediate);
        check(immediate.bodyTheme === theme && immediate.htmlTheme === theme, `${size}/${theme}: thème root/body appliqué immédiatement`, immediate);
        for (const token of immediate.tokens) {
          check(token.html && token.html === token.body, `${size}/${theme}: token ${token.name} cohérent dès apply()`, token);
        }
        check(immediate.colorScheme === (['light', 'easter'].includes(theme) ? 'light' : 'dark'), `${size}/${theme}: color-scheme natif adapté`, immediate.colorScheme);
        const resources = immediate.resources.map(resource => resource.background + ' ' + resource.image);
        check(new Set(resources).size === 3, `${size}/${theme}: PV/EP/EM visuellement distincts`, immediate.resources);
        if (!resourceColors[immediate.colorScheme]) resourceColors[immediate.colorScheme] = resources;
        check(JSON.stringify(resources) === JSON.stringify(resourceColors[immediate.colorScheme]), `${size}/${theme}: couleurs des ressources stables pour le même mode clair/sombre`, immediate.resources);
        const channels = resources.map(value => Array.from(value.matchAll(/rgba?\(([^)]+)\)/g))
          .map(match => match[1].split(',').map(Number)).find(parts => parts.length === 3 || parts[3] > 0)?.slice(0, 3));
        const [pv, ep, em] = channels;
        check(pv && pv[0] > pv[1] && pv[0] > pv[2] && ep && ep[0] > ep[2] && ep[1] > ep[2] && em && em[2] > em[0] && em[1] > em[0], `${size}/${theme}: sens des couleurs PV rouge, EP or et EM bleu`, immediate.resources);
        check(immediate.resources.map(resource => resource.text).join('|') === '21 / 30|34 / 50|12 / 20', `${size}/${theme}: valeurs des ressources inchangées`, immediate.resources);
        // The old engine scheduled a second pass at 90/180 ms. Catch a delayed
        // reset or remount as well as the synchronous result checked above.
        await page.waitForTimeout(220);
        check(app.requests.filter(request => request.action === 'self_set_theme').length === preferenceWrites, `${size}/${theme}: le moteur de rendu ne sauvegarde pas une préférence`);
        check(await page.locator('#p-cnote').inputValue() === immediate.before.value, `${size}/${theme}: brouillon conservé après les anciens délais de rafraîchissement`);
        check(await page.evaluate(id => document.body.dataset.themeActive === id && document.documentElement.dataset.themeActive === id, theme), `${size}/${theme}: aucune réapplication différée d’une ancienne palette`);
        await page.locator('#np-sheet-resources-title').scrollIntoViewIfNeeded();
        await audit(theme, 'fiche', '#fiche');

        await navigate('Tableau de bord', 'accueil');
        await audit(theme, 'home', '#accueil');
        await navigate('Événements', 'evenements');
        await page.locator('.np-agenda-card').waitFor({ state: 'visible' });
        assert.match(await page.locator('.np-agenda-card').innerText(), /Expédition de la banquise/);
        await audit(theme, 'agenda', '#evenements');

        await navigate('Serments', 'serments');
        await audit(theme, 'reference', '#serments');
        await navigate('Tableau de bord', 'accueil');
        if (size === 'mobile') {
          await page.locator('#burger-btn').click();
          await page.locator('#mobile-drawer').getByRole('button', { name: 'Mon compte et ma collection' }).click();
        } else await page.locator('#hdr-settings-btn').click();
        await page.getByRole('button', { name: 'Mon compte', exact: true }).click();
        await page.locator('#mp-old').fill('brouillon-local');
        await audit(theme, 'compte', '#profil');
        await page.getByRole('button', { name: 'Ma collection', exact: true }).click();
        await audit(theme, 'collection', '#profil');

        // Created after apply(), this modal must inherit tokens without another
        // refresh. It is also a real interaction/focus target on small screens.
        await page.getByRole('button', { name: 'Importer ou recadrer l’avatar', exact: true }).click();
        await page.locator('#m-avatar-crop.open').waitFor({ state: 'visible' });
        await audit(theme, 'modale', '#m-avatar-crop .modal');
        await page.locator('#m-avatar-crop').getByRole('button', { name: 'Annuler', exact: true }).click();
        await navigate('Tableau de bord', 'accueil');
        if (size === 'mobile') {
          await page.locator('#burger-btn').click();
          await audit(theme, 'menu', '#mobile-drawer');
          await page.locator('#mobile-drawer').getByRole('button', { name: 'Tableau de bord', exact: true }).click();
        } else {
          await page.locator('#dd-joueurs-btn').click();
          await audit(theme, 'menu', '#dd-joueurs-menu');
          await page.locator('#dd-joueurs-menu').getByRole('button', { name: 'Serments' }).click();
        }
        const motion = await page.evaluate(() => {
          const styles = [];
          for (const selector of ['html', 'body', '#s-app']) {
            const el = document.querySelector(selector);
            for (const pseudo of [null, '::before', '::after']) {
              const css = getComputedStyle(el, pseudo);
              const duration = Math.max(...css.animationDuration.split(',').map(parseFloat));
              if (css.display !== 'none' && css.animationName !== 'none' && duration > 0.01) styles.push({ selector, pseudo, animation: css.animationName, duration });
            }
          }
          return { reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, styles, meteors: document.querySelectorAll('.tm-galaxy-meteor').length };
        });
        check(motion.reduced && !motion.styles.length && motion.meteors === 0, `${size}/${theme}: décors animés désactivés en mouvement réduit`, motion);
        console.log(`Matrice ${size} / ${theme} : 8 familles inspectées.`);
      }
      await context.close();
    }
    const adminContext = await browser.newContext({ viewport: VIEWPORTS[0], reducedMotion: 'reduce' });
    await adminContext.addCookies([{ name: 'np_session', value: (await app.cookie('admin')).slice('np_session='.length), url: app.origin, httpOnly: true }]);
    page = await adminContext.newPage();
    page.on('pageerror', error => errors.push('diagnostic: ' + (error.stack || error.message)));
    await page.route('https://**/*', route => route.abort());
    const lastSeenSaved = page.waitForResponse(response => response.url().endsWith('/.netlify/functions/auth') && response.request().postDataJSON()?.action === 'touch_last_seen');
    await page.goto(app.origin, { waitUntil: 'load' });
    await page.waitForFunction(() => window.CU && CU.role === 'admin' && window.npThemeRegression);
    await page.waitForFunction(() => {
      const overlay = document.getElementById('login-transition-overlay');
      const flash = document.getElementById('lto-flash');
      return (!overlay || !overlay.classList.contains('active')) && (!flash || getComputedStyle(flash).opacity === '0');
    });
    await page.waitForFunction(() => document.body.classList.contains('np-admin-diagnostics-enabled'));
    await (await lastSeenSaved).finished();
    function diagnosticState() {
      return {
        roots: [document.documentElement, document.body].map(el => Object.fromEntries(
          ['style', 'class', 'data-theme-engine', 'data-theme-active', 'data-theme-tone', 'data-np-authenticated'].map(name => [name, el.getAttribute(name)])
        )),
        current: window._currentTheme,
        confirmed: getConfirmedThemeForCurrentUser(),
        preference: localStorage.getItem('np_theme'),
        selected: CU.selectedTheme,
        accountSelected: getAccountByPseudo(CU.pseudo || CU.name)?.selectedTheme
      };
    }
    for (const preview of [false, true]) {
      if (preview) {
        assert.equal(await page.evaluate(() => typeof window.previewTheme), 'function', 'La vérification inclut la restauration d’un aperçu actif.');
        await page.evaluate(() => previewTheme('light'));
      }
      const before = await page.evaluate(diagnosticState);
      const legacy = await page.evaluate(() => {
        const player = getThemeActorPlayer() || {};
        const model = buildThemeCollectionModel(player);
        const root = document.createElement('section');
        root.hidden = true;
        root.innerHTML = renderThemeCollectionPremium(player);
        document.body.appendChild(root);
        try {
          NPThemeEngine.refreshCollection();
          return {
            equipped: model.filter(item => item.equipped).map(item => item.id),
            selected: Array.from(root.querySelectorAll('.theme-card-premium[data-theme-state="selected"]')).map(el => el.dataset.themeId),
            secretsSelected: root.querySelectorAll('.theme-card-premium.secret[data-theme-state="selected"], .theme-card-premium.secret [data-theme-state="selected"]').length,
            confirmed: getConfirmedThemeForCurrentUser()
          };
        } finally { root.remove(); }
      });
      assert.deepEqual(legacy.equipped, [legacy.confirmed], 'Le modèle legacy indique le thème confirmé comme équipé.');
      assert.deepEqual(legacy.selected, [legacy.confirmed], 'La collection legacy conserve le thème équipé pendant un aperçu.');
      assert.equal(legacy.secretsSelected, 0, 'Un emplacement secret ne devient jamais un thème équipé après patchCards.');
      const stored = await app.read('accounts');
      const saves = app.requests.filter(request => request.action === 'self_set_theme').length;
      const report = await page.evaluate(() => npThemeRegression.run());
      check(!!report && report.results.length === THEMES.length, `Diagnostic ${preview ? 'pendant aperçu' : 'normal'} : neuf palettes inspectées`, report && report.results.length);
      check(!report.results.some(result => result.status === 'bad'), `Diagnostic ${preview ? 'pendant aperçu' : 'normal'} : aucun test en erreur`, report.results.filter(result => result.status === 'bad'));
      assert.deepEqual(await page.evaluate(diagnosticState), before, 'Le diagnostic restaure exactement thème affiché, racines et préférence.');
      assert.equal(app.requests.filter(request => request.action === 'self_set_theme').length, saves, 'Le diagnostic ne demande aucune sauvegarde de préférence.');
      // Session heartbeats legitimately update lastSeen while the diagnostic runs.
      const persistentAccounts = accounts => accounts.map(({ lastSeen, ...account }) => account);
      assert.deepEqual(persistentAccounts((await app.read('accounts')).value), persistentAccounts(stored.value), 'Le diagnostic ne modifie ni préférences ni droits des comptes.');
    }
    await page.evaluate(() => cancelThemePreview());
    await adminContext.close();
    check(!errors.length, 'Aucune erreur JavaScript', errors);
    check(!app.errors.length, 'Aucune erreur des handlers locaux', app.errors);
    const summary = {
      themes: THEMES, viewports: VIEWPORTS, families: rows.length,
      measuredContrasts: rows.reduce((count, row) => count + (row.contrast || []).length, 0),
      unmeasuredContrasts: rows.reduce((count, row) => count + (row.unmeasured || []).length, 0),
      failures, errors, rows
    };
    fs.writeFileSync(path.join(OUTPUT, 'results.json'), JSON.stringify(summary, null, 2));
    assert.equal(failures.length, 0, failures.map(failure => failure.message + (failure.details ? ' — ' + JSON.stringify(failure.details).slice(0, 350) : '')).join('\n') + '\nRapport : ' + path.join(OUTPUT, 'results.json'));
    console.log(`Thèmes : ${THEMES.length} palettes × ${VIEWPORTS.length} formats × 8 familles ; ${summary.measuredContrasts} contrastes mesurés. Échantillons non calculables (images, gradients, opacité, icônes) : ${summary.unmeasuredContrasts}. Rapport : ${OUTPUT}`);
  } catch (error) {
    fs.writeFileSync(path.join(OUTPUT, 'partial-results.json'), JSON.stringify({ failures, errors, rows }, null, 2));
    if (page && !page.isClosed()) await page.screenshot({ path: path.join(OUTPUT, 'failure.png'), animations: 'disabled' }).catch(() => {});
    throw error;
  } finally {
    if (browser) await browser.close();
    await app.close();
  }
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
