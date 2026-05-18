/* Nuages Polaires — Diagnostics v258
   DB/Auth readable diagnostics + global error capture.
   Open with:
   - Ctrl + Alt + D
   - URL ?diag=1
   - window.npDiagnostics.open()
*/
(function(){
  'use strict';

  var VERSION = 'v258';
  var STYLE_ID = 'np-diagnostics-style-v258';
  var PANEL_ID = 'np-diagnostics-panel';
  var BTN_ID = 'np-diagnostics-button';
  var MAX_EVENTS = 80;
  var events = [];
  var lastResults = null;
  var visible = false;
  var autoOpened = false;

  function nowIso(){
    try{ return new Date().toISOString(); }catch(e){ return String(Date.now()); }
  }

  function addEvent(type, message, data){
    var entry = {
      at: nowIso(),
      type: type || 'info',
      message: String(message || ''),
      data: data || null
    };
    events.unshift(entry);
    if(events.length > MAX_EVENTS) events.length = MAX_EVENTS;
    renderEvents();
    return entry;
  }

  function safeJson(value){
    try{ return JSON.stringify(value, null, 2); }catch(e){ return String(value); }
  }

  function injectStyle(){
    if(document.getElementById(STYLE_ID)) return;
    var css = `
#${BTN_ID}{
  position:fixed;
  right:16px;
  bottom:16px;
  z-index:2147483000;
  min-width:44px;
  height:44px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,.14);
  background:linear-gradient(135deg,rgba(18,24,40,.92),rgba(8,12,22,.92));
  color:#f5f7fb;
  box-shadow:0 12px 28px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.08);
  font-weight:900;
  cursor:pointer;
  display:none;
}
#${BTN_ID}.show{display:inline-flex;align-items:center;justify-content:center;}
#${PANEL_ID}{
  position:fixed;
  right:16px;
  bottom:72px;
  width:min(680px, calc(100vw - 32px));
  max-height:min(760px, calc(100vh - 104px));
  z-index:2147483001;
  display:none;
  flex-direction:column;
  overflow:hidden;
  border-radius:22px;
  border:1px solid rgba(var(--tm-accent-rgb,126,184,212),.22);
  background:linear-gradient(180deg,rgba(18,24,40,.96),rgba(8,12,22,.96));
  color:#f5f7fb;
  box-shadow:0 24px 70px rgba(0,0,0,.52), inset 0 1px 0 rgba(255,255,255,.08);
  backdrop-filter:blur(18px) saturate(118%);
}
#${PANEL_ID}.open{display:flex;}
#${PANEL_ID} *{box-sizing:border-box;}
.npdiag-head{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:12px;
  padding:16px 16px 12px;
  border-bottom:1px solid rgba(255,255,255,.08);
}
.npdiag-title{font-weight:950;letter-spacing:.01em;font-size:1rem;}
.npdiag-sub{margin-top:4px;color:rgba(245,247,251,.66);font-size:.82rem;line-height:1.35;}
.npdiag-close{
  min-width:36px;height:36px;border-radius:12px;border:1px solid rgba(255,255,255,.10);
  background:rgba(255,255,255,.055);color:#f5f7fb;font-weight:900;cursor:pointer;
}
.npdiag-body{overflow:auto;padding:14px 16px 16px;}
.npdiag-actions{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;}
.npdiag-btn{
  min-height:38px;border-radius:12px;padding:0 12px;border:1px solid rgba(var(--tm-accent-rgb,126,184,212),.22);
  background:linear-gradient(135deg,rgba(var(--tm-accent-rgb,126,184,212),.16),rgba(var(--tm-accent-2-rgb,201,168,76),.08));
  color:#f5f7fb;font-weight:850;cursor:pointer;
}
.npdiag-btn.ghost{background:rgba(255,255,255,.045);}
.npdiag-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:14px;}
.npdiag-card{
  border:1px solid rgba(255,255,255,.09);
  background:rgba(255,255,255,.045);
  border-radius:16px;
  padding:12px;
  min-height:96px;
}
.npdiag-card-title{font-weight:900;margin-bottom:8px;display:flex;align-items:center;gap:8px;}
.npdiag-status{
  display:inline-flex;align-items:center;justify-content:center;
  min-width:22px;height:22px;border-radius:999px;
  font-size:.72rem;font-weight:950;
}
.npdiag-ok{background:rgba(82,210,122,.18);color:#9af0b0;}
.npdiag-warn{background:rgba(242,198,109,.16);color:#f7d992;}
.npdiag-bad{background:rgba(227,76,98,.18);color:#ff9aac;}
.npdiag-info{background:rgba(var(--tm-accent-rgb,126,184,212),.16);color:var(--tm-accent-bright,#b7e5ff);}
.npdiag-line{font-size:.82rem;color:rgba(245,247,251,.72);line-height:1.45;margin:3px 0;}
.npdiag-code{
  display:block;
  margin-top:8px;
  white-space:pre-wrap;
  word-break:break-word;
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:.75rem;
  line-height:1.4;
  color:rgba(245,247,251,.74);
  background:rgba(0,0,0,.20);
  border:1px solid rgba(255,255,255,.06);
  border-radius:12px;
  padding:8px;
  max-height:160px;
  overflow:auto;
}
.npdiag-section-title{font-weight:950;margin:14px 0 8px;}
.npdiag-events{display:grid;gap:8px;}
.npdiag-event{
  border:1px solid rgba(255,255,255,.075);
  background:rgba(255,255,255,.035);
  border-radius:14px;
  padding:10px;
}
.npdiag-event-top{display:flex;justify-content:space-between;gap:8px;font-size:.75rem;color:rgba(245,247,251,.55);margin-bottom:4px;}
.npdiag-event-msg{font-size:.82rem;color:rgba(245,247,251,.82);line-height:1.4;}
.npdiag-mini-help{
  margin-top:10px;
  padding:10px 12px;
  border-radius:14px;
  background:rgba(var(--tm-accent-rgb,126,184,212),.08);
  border:1px solid rgba(var(--tm-accent-rgb,126,184,212),.12);
  color:rgba(245,247,251,.72);
  font-size:.82rem;
  line-height:1.45;
}
@media(max-width:720px){
  #${PANEL_ID}{right:8px;bottom:64px;width:calc(100vw - 16px);max-height:calc(100vh - 84px);}
  #${BTN_ID}{right:10px;bottom:10px;}
  .npdiag-grid{grid-template-columns:1fr;}
}
    `;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = css;
    document.head.appendChild(st);
  }

  function ensureButton(){
    var btn = document.getElementById(BTN_ID);
    if(btn) return btn;
    btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.type = 'button';
    btn.title = 'Diagnostics Nuages Polaires — Ctrl+Alt+D';
    btn.textContent = 'Diag';
    btn.addEventListener('click', function(){ togglePanel(); });
    document.body.appendChild(btn);
    return btn;
  }

  function ensurePanel(){
    var panel = document.getElementById(PANEL_ID);
    if(panel) return panel;

    panel = document.createElement('aside');
    panel.id = PANEL_ID;
    panel.setAttribute('role','dialog');
    panel.setAttribute('aria-label','Diagnostics Nuages Polaires');
    panel.innerHTML = [
      '<div class="npdiag-head">',
        '<div>',
          '<div class="npdiag-title">Diagnostics Nuages Polaires <span style="opacity:.55">', VERSION, '</span></div>',
          '<div class="npdiag-sub">DB, Auth, bundle public, session et erreurs front lisibles. Raccourci : Ctrl + Alt + D.</div>',
        '</div>',
        '<button class="npdiag-close" type="button" aria-label="Fermer">×</button>',
      '</div>',
      '<div class="npdiag-body">',
        '<div class="npdiag-actions">',
          '<button class="npdiag-btn" type="button" data-action="run">Relancer les tests</button>',
          '<button class="npdiag-btn ghost" type="button" data-action="copy">Copier le rapport</button>',
          '<button class="npdiag-btn ghost" type="button" data-action="clear">Vider les logs</button>',
        '</div>',
        '<div class="npdiag-grid" data-diag-results></div>',
        '<div class="npdiag-mini-help">Si la home affiche une erreur, ouvre ce panel puis copie le rapport. Les erreurs 503 indiquent généralement une variable Netlify manquante ou une DB indisponible. Les 401 côté Auth peuvent simplement vouloir dire que tu n’es pas connecté.</div>',
        '<div class="npdiag-section-title">Derniers événements</div>',
        '<div class="npdiag-events" data-diag-events></div>',
      '</div>'
    ].join('');
    panel.querySelector('.npdiag-close').addEventListener('click', closePanel);
    panel.addEventListener('click', function(e){
      var btn = e.target.closest('[data-action]');
      if(!btn) return;
      var action = btn.getAttribute('data-action');
      if(action === 'run') runDiagnostics(true);
      if(action === 'copy') copyReport();
      if(action === 'clear'){
        events = [];
        addEvent('info','Logs diagnostics vidés.');
        renderEvents();
      }
    });
    document.body.appendChild(panel);
    return panel;
  }

  function statusClass(kind){
    if(kind === 'ok') return 'npdiag-status npdiag-ok';
    if(kind === 'warn') return 'npdiag-status npdiag-warn';
    if(kind === 'bad') return 'npdiag-status npdiag-bad';
    return 'npdiag-status npdiag-info';
  }

  function renderResults(){
    var panel = ensurePanel();
    var box = panel.querySelector('[data-diag-results]');
    if(!box) return;
    var items = lastResults && lastResults.tests ? lastResults.tests : [];
    if(!items.length){
      box.innerHTML = '<div class="npdiag-card"><div class="npdiag-card-title"><span class="npdiag-status npdiag-info">…</span> Aucun test lancé</div><div class="npdiag-line">Clique sur “Relancer les tests”.</div></div>';
      return;
    }
    box.innerHTML = items.map(function(t){
      var symbol = t.kind === 'ok' ? '✓' : (t.kind === 'warn' ? '!' : (t.kind === 'bad' ? '×' : '…'));
      var details = [
        '<div class="npdiag-card">',
          '<div class="npdiag-card-title"><span class="'+ statusClass(t.kind) +'">'+ symbol +'</span> '+ escapeHtml(t.title) +'</div>',
          '<div class="npdiag-line">'+ escapeHtml(t.summary || '') +'</div>',
          t.status ? '<div class="npdiag-line">HTTP : <strong>'+ escapeHtml(String(t.status)) +'</strong></div>' : '',
          t.timeMs != null ? '<div class="npdiag-line">Temps : <strong>'+ escapeHtml(String(t.timeMs)) +' ms</strong></div>' : '',
          t.error ? '<code class="npdiag-code">'+ escapeHtml(String(t.error)) +'</code>' : '',
        '</div>'
      ].join('');
      return details;
    }).join('');
  }

  function renderEvents(){
    var panel = document.getElementById(PANEL_ID);
    if(!panel) return;
    var box = panel.querySelector('[data-diag-events]');
    if(!box) return;
    if(!events.length){
      box.innerHTML = '<div class="npdiag-event"><div class="npdiag-event-msg">Aucun événement capturé.</div></div>';
      return;
    }
    box.innerHTML = events.slice(0, 20).map(function(e){
      return [
        '<div class="npdiag-event">',
          '<div class="npdiag-event-top"><span>'+ escapeHtml(e.type) +'</span><span>'+ escapeHtml(e.at) +'</span></div>',
          '<div class="npdiag-event-msg">'+ escapeHtml(e.message) +'</div>',
          e.data ? '<code class="npdiag-code">'+ escapeHtml(safeJson(e.data).slice(0, 2500)) +'</code>' : '',
        '</div>'
      ].join('');
    }).join('');
  }

  function escapeHtml(str){
    return String(str == null ? '' : str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  function openPanel(){
    visible = true;
    injectStyle();
    ensureButton().classList.add('show');
    ensurePanel().classList.add('open');
    renderResults();
    renderEvents();
    if(!lastResults) runDiagnostics(false);
  }

  function closePanel(){
    visible = false;
    var panel = document.getElementById(PANEL_ID);
    if(panel) panel.classList.remove('open');
  }

  function togglePanel(){
    if(visible) closePanel();
    else openPanel();
  }

  function shouldShowButton(){
    try{
      var params = new URLSearchParams(location.search || '');
      if(params.get('diag') === '1' || params.get('debug') === '1') return true;
      if(location.hash && /diag|debug/i.test(location.hash)) return true;
      if(localStorage.getItem('np_diag_visible') === '1') return true;
    }catch(e){}
    return false;
  }

  function initVisibility(){
    injectStyle();
    var btn = ensureButton();
    if(shouldShowButton()){
      btn.classList.add('show');
      if(!autoOpened && /[?&](diag|debug)=1/.test(location.search || '')){
        autoOpened = true;
        setTimeout(openPanel, 200);
      }
    }
  }

  async function postJson(url, payload){
    var started = Date.now();
    var result = {
      url:url,
      payload:payload,
      status:0,
      ok:false,
      timeMs:null,
      json:null,
      text:'',
      error:''
    };
    try{
      var res = await fetch(url, {
        method:'POST',
        credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload || {})
      });
      result.status = res.status;
      result.ok = res.ok;
      result.timeMs = Date.now() - started;
      var text = await res.text();
      result.text = text;
      try{ result.json = text ? JSON.parse(text) : null; }
      catch(e){ result.error = 'Réponse non JSON : ' + text.slice(0, 500); }
      return result;
    }catch(e){
      result.timeMs = Date.now() - started;
      result.error = e && (e.stack || e.message) ? (e.stack || e.message) : String(e);
      return result;
    }
  }

  function classifyHttp(r, unauthOk){
    if(r.ok && r.json && r.json.ok === false) return 'warn';
    if(r.ok) return 'ok';
    if(unauthOk && r.status === 401) return 'warn';
    if(r.status === 503) return 'bad';
    if(r.status >= 500) return 'bad';
    if(r.status >= 400) return 'warn';
    if(r.error) return 'bad';
    return 'info';
  }

  function summarize(r){
    if(r.error) return r.error.split('\n')[0].slice(0, 180);
    if(r.json && r.json.error) return String(r.json.error).slice(0, 180);
    if(r.json && r.json.ok === true) return 'OK';
    if(r.ok) return 'Réponse OK';
    if(r.status === 401) return 'Non connecté ou session expirée';
    if(r.status === 503) return 'Service non configuré ou DB indisponible';
    if(r.status) return 'Réponse HTTP ' + r.status;
    return 'Pas de réponse';
  }

  async function runDiagnostics(manual){
    if(manual) addEvent('info','Diagnostics relancés manuellement.');
    lastResults = { at: nowIso(), version:VERSION, location:String(location.href), tests:[] };
    renderResults();

    var dbPing = await postJson('/.netlify/functions/db', { action:'ping' });
    lastResults.tests.push({
      title:'DB ping',
      kind:classifyHttp(dbPing),
      status:dbPing.status,
      timeMs:dbPing.timeMs,
      summary:summarize(dbPing),
      error:dbPing.error || (dbPing.json && dbPing.json.error ? dbPing.json.error : '')
    });
    renderResults();

    var publicBundle = await postJson('/.netlify/functions/db', { action:'get_public_bundle' });
    lastResults.tests.push({
      title:'Bundle public',
      kind:classifyHttp(publicBundle),
      status:publicBundle.status,
      timeMs:publicBundle.timeMs,
      summary:summarize(publicBundle),
      error:publicBundle.error || (publicBundle.json && publicBundle.json.error ? publicBundle.json.error : '')
    });
    renderResults();

    var authVerify = await postJson('/.netlify/functions/auth', { action:'verify' });
    lastResults.tests.push({
      title:'Auth verify',
      kind:classifyHttp(authVerify, true),
      status:authVerify.status,
      timeMs:authVerify.timeMs,
      summary:summarize(authVerify),
      error:authVerify.error || (authVerify.json && authVerify.json.error ? authVerify.json.error : '')
    });
    renderResults();

    var sessionBundle = await postJson('/.netlify/functions/auth', { action:'session_bundle' });
    lastResults.tests.push({
      title:'Session bundle',
      kind:classifyHttp(sessionBundle, true),
      status:sessionBundle.status,
      timeMs:sessionBundle.timeMs,
      summary:summarize(sessionBundle),
      error:sessionBundle.error || (sessionBundle.json && sessionBundle.json.error ? sessionBundle.json.error : '')
    });
    renderResults();

    var bad = lastResults.tests.filter(function(t){ return t.kind === 'bad'; }).length;
    var warn = lastResults.tests.filter(function(t){ return t.kind === 'warn'; }).length;
    addEvent(bad ? 'error' : (warn ? 'warn' : 'ok'), 'Diagnostics terminés : ' + bad + ' erreur(s), ' + warn + ' avertissement(s).');
    return lastResults;
  }

  async function copyReport(){
    var report = {
      at: nowIso(),
      version: VERSION,
      url: String(location.href),
      userAgent: navigator.userAgent,
      results: lastResults,
      events: events.slice(0, 30)
    };
    var text = safeJson(report);
    try{
      await navigator.clipboard.writeText(text);
      addEvent('ok','Rapport copié dans le presse-papiers.');
    }catch(e){
      addEvent('warn','Impossible de copier automatiquement. Rapport affiché dans la console.');
      console.log('[Nuages Polaires Diagnostics]', report);
    }
  }

  function installErrorHooks(){
    window.addEventListener('error', function(e){
      addEvent('error', (e.message || 'Erreur JS') + (e.filename ? ' — ' + e.filename + ':' + e.lineno : ''), {
        message:e.message,
        source:e.filename,
        line:e.lineno,
        column:e.colno
      });
      ensureButton().classList.add('show');
    });

    window.addEventListener('unhandledrejection', function(e){
      var reason = e.reason;
      addEvent('error', 'Promise rejetée : ' + (reason && (reason.message || reason.stack) ? (reason.message || reason.stack) : String(reason)), {
        reason: reason && reason.stack ? reason.stack : String(reason)
      });
      ensureButton().classList.add('show');
    });

    if(window.fetch && !window.fetch.__npDiagWrapped){
      var originalFetch = window.fetch;
      var wrapped = function(input, init){
        var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
        return originalFetch.apply(this, arguments).then(function(res){
          try{
            if(/\/\.netlify\/functions\//.test(String(url)) && res.status >= 500){
              addEvent('error', 'Erreur fonction Netlify ' + res.status + ' sur ' + url);
              ensureButton().classList.add('show');
            }
          }catch(e){}
          return res;
        }).catch(function(err){
          try{
            if(/\/\.netlify\/functions\//.test(String(url))){
              addEvent('error', 'Fetch échoué sur ' + url + ' : ' + (err && err.message ? err.message : String(err)));
              ensureButton().classList.add('show');
            }
          }catch(e){}
          throw err;
        });
      };
      wrapped.__npDiagWrapped = true;
      window.fetch = wrapped;
    }
  }

  function boot(){
    injectStyle();
    ensureButton();
    ensurePanel();
    installErrorHooks();
    initVisibility();
    addEvent('info','Diagnostics v258 chargés.');
    window.npDiagnostics = {
      version: VERSION,
      open: openPanel,
      close: closePanel,
      toggle: togglePanel,
      run: runDiagnostics,
      copy: copyReport,
      events: function(){ return events.slice(); },
      last: function(){ return lastResults; },
      showButton: function(){
        try{ localStorage.setItem('np_diag_visible','1'); }catch(e){}
        ensureButton().classList.add('show');
      },
      hideButton: function(){
        try{ localStorage.removeItem('np_diag_visible'); }catch(e){}
        ensureButton().classList.remove('show');
        closePanel();
      }
    };
    window.npDiag = openPanel;
  }

  document.addEventListener('keydown', function(e){
    if(e.ctrlKey && e.altKey && String(e.key || '').toLowerCase() === 'd'){
      e.preventDefault();
      try{ localStorage.setItem('np_diag_visible','1'); }catch(err){}
      ensureButton().classList.add('show');
      togglePanel();
    }
  });

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
