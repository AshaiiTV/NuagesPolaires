/* Nuages Polaires — Site Self-Test v260
   Adds a one-click browser-side quality gate on top of diagnostics.
   Open diagnostics with Ctrl+Alt+D, then click "Test site".
*/
(function(){
  'use strict';

  var VERSION = 'v260';
  var STYLE_ID = 'np-site-self-test-style-v260';
  var PANEL_ID = 'np-diagnostics-panel';
  var RESULT_ID = 'np-site-self-test-results';
  var BTN_CLASS = 'np-site-self-test-btn';
  var lastReport = null;
  var injected = false;

  function nowIso(){ try{ return new Date().toISOString(); }catch(e){ return String(Date.now()); } }

  function injectStyle(){
    if(document.getElementById(STYLE_ID)) return;
    var css = `
#${RESULT_ID}{
  margin:14px 0;
  border:1px solid rgba(var(--tm-accent-rgb,126,184,212),.16);
  background:rgba(255,255,255,.035);
  border-radius:16px;
  padding:12px;
}
.npself-head{
  display:flex;
  flex-wrap:wrap;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  margin-bottom:10px;
}
.npself-title{font-weight:950;color:#f5f7fb;}
.npself-summary{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
}
.npself-pill{
  display:inline-flex;
  align-items:center;
  gap:6px;
  min-height:26px;
  padding:0 10px;
  border-radius:999px;
  font-size:12px;
  font-weight:850;
  border:1px solid rgba(255,255,255,.10);
  background:rgba(255,255,255,.05);
}
.npself-pill.ok{color:#baf5c9;border-color:rgba(82,210,122,.22);background:rgba(82,210,122,.10);}
.npself-pill.warn{color:#f8dda0;border-color:rgba(242,198,109,.22);background:rgba(242,198,109,.10);}
.npself-pill.bad{color:#ffb5c2;border-color:rgba(227,76,98,.24);background:rgba(227,76,98,.11);}
.npself-list{
  display:grid;
  gap:8px;
}
.npself-item{
  display:grid;
  grid-template-columns:26px minmax(0,1fr);
  gap:8px;
  align-items:start;
  border:1px solid rgba(255,255,255,.075);
  background:rgba(0,0,0,.14);
  border-radius:12px;
  padding:9px;
}
.npself-dot{
  width:22px;
  height:22px;
  border-radius:999px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  font-size:12px;
  font-weight:950;
}
.npself-dot.ok{background:rgba(82,210,122,.16);color:#9af0b0;}
.npself-dot.warn{background:rgba(242,198,109,.16);color:#f7d992;}
.npself-dot.bad{background:rgba(227,76,98,.18);color:#ff9aac;}
.npself-name{font-weight:850;color:#f5f7fb;margin-bottom:2px;}
.npself-detail{font-size:12px;line-height:1.4;color:rgba(245,247,251,.70);}
.npself-code{
  margin-top:6px;
  display:block;
  white-space:pre-wrap;
  word-break:break-word;
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:11px;
  line-height:1.35;
  color:rgba(245,247,251,.72);
  background:rgba(0,0,0,.22);
  border:1px solid rgba(255,255,255,.06);
  border-radius:10px;
  padding:7px;
  max-height:120px;
  overflow:auto;
}
.${BTN_CLASS}.running{opacity:.72;pointer-events:none;}
    `;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = css;
    document.head.appendChild(st);
  }

  function escapeHtml(str){
    return String(str == null ? '' : str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  function stringifySafe(v){
    try{ return JSON.stringify(v, null, 2); }catch(e){ return String(v); }
  }

  function result(name, status, detail, extra){
    return {
      name:name,
      status:status || 'warn',
      detail:detail || '',
      extra:extra || null
    };
  }

  function statusSymbol(status){
    return status === 'ok' ? '✓' : (status === 'bad' ? '×' : '!');
  }

  function countStatus(items){
    return items.reduce(function(acc, it){
      acc[it.status] = (acc[it.status] || 0) + 1;
      return acc;
    }, { ok:0, warn:0, bad:0 });
  }

  function ensureResultsBox(){
    injectStyle();
    var panel = document.getElementById(PANEL_ID);
    if(!panel) return null;
    var body = panel.querySelector('.npdiag-body') || panel;
    var box = document.getElementById(RESULT_ID);
    if(!box){
      box = document.createElement('div');
      box.id = RESULT_ID;
      var eventsTitle = body.querySelector('.npdiag-section-title');
      if(eventsTitle) body.insertBefore(box, eventsTitle);
      else body.appendChild(box);
    }
    return box;
  }

  function renderReport(report){
    lastReport = report;
    var box = ensureResultsBox();
    if(!box) return;
    var counts = countStatus(report.items || []);
    var itemsHtml = (report.items || []).map(function(it){
      return [
        '<div class="npself-item">',
          '<span class="npself-dot '+ escapeHtml(it.status) +'">'+ statusSymbol(it.status) +'</span>',
          '<div>',
            '<div class="npself-name">'+ escapeHtml(it.name) +'</div>',
            '<div class="npself-detail">'+ escapeHtml(it.detail) +'</div>',
            it.extra ? '<code class="npself-code">'+ escapeHtml(stringifySafe(it.extra).slice(0, 2000)) +'</code>' : '',
          '</div>',
        '</div>'
      ].join('');
    }).join('');

    box.innerHTML = [
      '<div class="npself-head">',
        '<div>',
          '<div class="npself-title">Test site ', escapeHtml(report.version), '</div>',
          '<div class="npself-detail">', escapeHtml(report.at), ' · ', escapeHtml(report.durationMs), ' ms</div>',
        '</div>',
        '<div class="npself-summary">',
          '<span class="npself-pill ok">OK ', counts.ok || 0, '</span>',
          '<span class="npself-pill warn">Warn ', counts.warn || 0, '</span>',
          '<span class="npself-pill bad">Bad ', counts.bad || 0, '</span>',
        '</div>',
      '</div>',
      '<div class="npself-list">', itemsHtml || '<div class="npself-detail">Aucun résultat.</div>', '</div>'
    ].join('');
  }

  async function postJson(url, payload){
    var start = Date.now();
    try{
      var res = await fetch(url, {
        method:'POST',
        credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload || {})
      });
      var text = await res.text();
      var data = null;
      try{ data = text ? JSON.parse(text) : null; }catch(e){}
      return { ok:res.ok, status:res.status, data:data, text:text, timeMs:Date.now()-start };
    }catch(e){
      return { ok:false, status:0, error:e && e.message ? e.message : String(e), timeMs:Date.now()-start };
    }
  }

  function testLocalStorage(){
    try{
      var key = 'np_self_test_' + Math.random().toString(36).slice(2);
      localStorage.setItem(key, 'ok');
      var ok = localStorage.getItem(key) === 'ok';
      localStorage.removeItem(key);
      return ok ? result('LocalStorage', 'ok', 'Lecture / écriture disponible.') : result('LocalStorage', 'bad', 'Écriture possible mais lecture incohérente.');
    }catch(e){
      return result('LocalStorage', 'bad', 'LocalStorage indisponible.', { error:String(e && e.message || e) });
    }
  }

  function testRequiredGlobals(){
    var checks = [
      ['Moteur thèmes', 'themeMaxAuditReport'],
      ['Normalisation thème', 'normalizeThemeId'],
      ['Métadonnées thème', 'themeMeta'],
      ['Diagnostics', 'npDiagnostics'],
      ['API hardening', 'npApiHardening']
    ];
    var missing = checks.filter(function(c){ return typeof window[c[1]] === 'undefined'; });
    if(!missing.length) return result('Scripts critiques', 'ok', 'Tous les modules front critiques sont chargés.');
    return result('Scripts critiques', 'bad', 'Modules manquants : ' + missing.map(function(c){ return c[0]; }).join(', '), { missing:missing });
  }

  function testThemeEngine(){
    try{
      var htmlEngine = document.documentElement.getAttribute('data-theme-engine');
      var bodyEngine = document.body && document.body.getAttribute('data-theme-engine');
      var active = document.body && document.body.getAttribute('data-theme-active');
      var meta = typeof window.themeMeta === 'function' ? window.themeMeta(active || 'dark') : null;
      if(htmlEngine === 'v257' && bodyEngine === 'v257' && meta && meta.id){
        return result('Theme Engine', 'ok', 'Moteur thèmes actif : ' + (active || meta.id) + '.', { htmlEngine:htmlEngine, bodyEngine:bodyEngine, active:active, meta:meta });
      }
      return result('Theme Engine', 'warn', 'Moteur thèmes partiellement détecté.', { htmlEngine:htmlEngine, bodyEngine:bodyEngine, active:active, meta:meta });
    }catch(e){
      return result('Theme Engine', 'bad', 'Erreur lors du test thème.', { error:String(e && e.message || e) });
    }
  }

  function testCollectionUi(){
    var cards = document.querySelectorAll('.theme-card-premium,.collection-card');
    var toolbar = document.querySelector('.np-theme-toolbar');
    var hero = document.querySelector('.np-theme-hero');
    if(cards.length && toolbar && hero){
      return result('Collection thèmes', 'ok', cards.length + ' carte(s), toolbar et hero détectés.');
    }
    if(cards.length){
      return result('Collection thèmes', 'warn', cards.length + ' carte(s) détectée(s), mais toolbar/hero non visibles sur cette page.');
    }
    return result('Collection thèmes', 'warn', 'Aucune carte thème visible sur la page actuelle.');
  }

  function testDiagnosticButton(){
    var btn = document.getElementById('np-diagnostics-button');
    var panel = document.getElementById(PANEL_ID);
    if(btn && panel) return result('Diagnostic UI', 'ok', 'Bouton et panel diagnostic présents.');
    return result('Diagnostic UI', 'warn', 'Diagnostic chargé, mais bouton/panel pas encore injecté.', { button:!!btn, panel:!!panel });
  }

  function testDomHealth(){
    var app = document.getElementById('s-app') || document.querySelector('[data-app],main,body');
    var scripts = Array.prototype.slice.call(document.scripts || []).map(function(s){ return s.getAttribute('src') || ''; }).filter(Boolean);
    var required = ['main.js','ui-patches.js','theme-max.js','api-hardening.js','diagnostics.js','site-self-test.js'];
    var missing = required.filter(function(name){ return !scripts.some(function(src){ return src.indexOf(name) >= 0; }); });
    if(app && !missing.length) return result('DOM / scripts', 'ok', 'Structure principale et scripts attendus présents.', { scripts:scripts });
    return result('DOM / scripts', missing.length >= 3 ? 'bad' : 'warn', 'Structure ou scripts incomplets.', { app:!!app, missing:missing, scripts:scripts });
  }

  async function runSelfTest(options){
    options = options || {};
    var start = Date.now();
    var items = [];

    items.push(testDomHealth());
    items.push(testRequiredGlobals());
    items.push(testLocalStorage());
    items.push(testThemeEngine());
    items.push(testCollectionUi());
    items.push(testDiagnosticButton());

    var db = await postJson('/.netlify/functions/db', { action:'ping' });
    if(db.ok && db.data && db.data.ok !== false){
      items.push(result('Netlify DB', 'ok', 'Ping DB OK en ' + db.timeMs + ' ms.', { status:db.status, data:db.data }));
    }else{
      items.push(result('Netlify DB', 'bad', 'Ping DB échoué' + (db.status ? ' — HTTP ' + db.status : '') + '.', { status:db.status, data:db.data, error:db.error, text:db.text && db.text.slice(0, 800) }));
    }

    var publicBundle = await postJson('/.netlify/functions/db', { action:'get_public_bundle' });
    if(publicBundle.ok && publicBundle.data && publicBundle.data.ok !== false){
      items.push(result('Bundle public', 'ok', 'Bundle public récupéré en ' + publicBundle.timeMs + ' ms.', { status:publicBundle.status, keys:Object.keys(publicBundle.data || {}) }));
    }else{
      items.push(result('Bundle public', publicBundle.status === 503 || publicBundle.status >= 500 ? 'bad' : 'warn', 'Bundle public indisponible' + (publicBundle.status ? ' — HTTP ' + publicBundle.status : '') + '.', { status:publicBundle.status, data:publicBundle.data, error:publicBundle.error }));
    }

    var auth = await postJson('/.netlify/functions/auth', { action:'verify' });
    if(auth.ok){
      items.push(result('Auth verify', 'ok', 'Session authentifiée détectée.', { status:auth.status, data:auth.data }));
    }else if(auth.status === 401){
      items.push(result('Auth verify', 'warn', 'Pas connecté : normal si tu es en visiteur.', { status:auth.status, data:auth.data }));
    }else{
      items.push(result('Auth verify', auth.status >= 500 || auth.status === 503 ? 'bad' : 'warn', 'Auth verify échoué' + (auth.status ? ' — HTTP ' + auth.status : '') + '.', { status:auth.status, data:auth.data, error:auth.error }));
    }

    if(window.npApiHardening && typeof window.npApiHardening.state === 'function'){
      var st = window.npApiHardening.state();
      var apiOk = st.db !== 'bad' && st.auth !== 'bad';
      items.push(result('API hardening state', apiOk ? 'ok' : 'warn', 'État API : DB=' + st.db + ', Auth=' + st.auth + '.', st));
    }

    var report = {
      version: VERSION,
      at: nowIso(),
      durationMs: Date.now() - start,
      url: String(location.href),
      userAgent: navigator.userAgent,
      items: items
    };

    renderReport(report);

    try{
      window.dispatchEvent(new CustomEvent('np:self-test-complete', { detail:report }));
    }catch(e){}

    return report;
  }

  async function copyReport(){
    var report = lastReport || await runSelfTest({ silent:true });
    var txt = stringifySafe(report);
    try{
      await navigator.clipboard.writeText(txt);
      if(window.npApiHardening && typeof window.npApiHardening.toast === 'function') window.npApiHardening.toast('Rapport self-test copié.', 'ok', 2800);
    }catch(e){
      console.log('[Nuages Polaires Self-Test]', report);
      if(window.npApiHardening && typeof window.npApiHardening.toast === 'function') window.npApiHardening.toast('Copie impossible, rapport affiché dans la console.', 'warn', 4200);
    }
  }

  function injectButton(){
    if(injected) return;
    var panel = document.getElementById(PANEL_ID);
    if(!panel) return;
    var actions = panel.querySelector('.npdiag-actions');
    if(!actions) return;
    if(actions.querySelector('.' + BTN_CLASS)){
      injected = true;
      return;
    }

    var run = document.createElement('button');
    run.className = 'npdiag-btn ' + BTN_CLASS;
    run.type = 'button';
    run.textContent = 'Test site';
    run.addEventListener('click', async function(){
      run.classList.add('running');
      run.textContent = 'Test en cours…';
      try{ await runSelfTest(); }
      finally{
        run.classList.remove('running');
        run.textContent = 'Test site';
      }
    });

    var copy = document.createElement('button');
    copy.className = 'npdiag-btn ghost ' + BTN_CLASS;
    copy.type = 'button';
    copy.textContent = 'Copier self-test';
    copy.addEventListener('click', copyReport);

    actions.appendChild(run);
    actions.appendChild(copy);
    injected = true;
  }

  function observeDiagnostics(){
    injectButton();
    try{
      var mo = new MutationObserver(function(){ injectButton(); });
      mo.observe(document.body, { childList:true, subtree:true });
    }catch(e){}
  }

  function boot(){
    injectStyle();
    observeDiagnostics();
    window.npSiteSelfTest = {
      version: VERSION,
      run: runSelfTest,
      copy: copyReport,
      last: function(){ return lastReport; },
      render: renderReport
    };
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
