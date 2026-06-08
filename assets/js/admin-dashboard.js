/* Nuages Polaires — Admin Dashboard v267
   Part 1/2 — Technical console merged into Staff > Tableau de bord.
   Former file: staff-console.js.
*/
(function(){
  'use strict';

  var VERSION = 'v267';
  var STYLE_ID = 'np-dashboard-console-style-v263';
  var GATE_STYLE_ID = 'np-dashboard-console-gate-v263';
  var LAST_REPORT = null;
  var HEALTH_REPORT = null;
  var LAST_ACTIONS = [];
  var MAX_ACTIONS = 24;
  var WRAPPED = false;

  function isAdmin(){
    try{
      if(window.CU && String(window.CU.role || '').toLowerCase() === 'admin') return true;
      var root = document.getElementById('app-root');
      var app = document.getElementById('s-app');
      return !!((root && root.classList.contains('is-admin')) || (app && app.classList.contains('is-admin')));
    }catch(e){ return false; }
  }

  function dashboardTargetId(){
    return document.getElementById('p-admin-dashboard-c') ? 'p-admin-dashboard-c' : null;
  }

  function escapeHtml(str){
    return String(str == null ? '' : str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  function safeJson(v){
    try{ return JSON.stringify(v, null, 2); }catch(e){ return String(v); }
  }

  async function safePost(url, payload){
    var started = Date.now();
    try{
      var res = await fetch(url, {
        method:'POST',
        credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload || {})
      });
      var data = {};
      try{ data = await res.json(); }catch(e){}
      return { ok:res.ok && data && data.ok !== false, status:res.status, data:data, timeMs:Date.now() - started };
    }catch(e){
      return { ok:false, status:0, error:String(e && e.message || e), timeMs:Date.now() - started };
    }
  }

  function nowIso(){ try{ return new Date().toISOString(); }catch(e){ return String(Date.now()); } }

  function addAction(type, label, detail, extra){
    var entry = { at:nowIso(), type:type || 'info', label:String(label || ''), detail:String(detail || ''), extra:extra || null };
    LAST_ACTIONS.unshift(entry);
    if(LAST_ACTIONS.length > MAX_ACTIONS) LAST_ACTIONS.length = MAX_ACTIONS;
    try{ var target = dashboardTargetId(); if(target) renderDashboardConsole(target); }catch(e){}
    return entry;
  }

  function injectStyle(){
    if(document.getElementById(STYLE_ID)) return;
    var css = `
.np-dashboard-console{
  margin-top:18px;
  display:grid;
  gap:16px;
}
.np-dashboard-console-hero{
  position:relative;
  overflow:hidden;
  border-radius:24px;
  padding:18px;
  border:1px solid rgba(126,184,212,.18);
  background:
    radial-gradient(circle at 88% 12%, rgba(126,184,212,.16), transparent 18rem),
    radial-gradient(circle at 12% 88%, rgba(201,168,76,.10), transparent 18rem),
    linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.018));
  box-shadow:0 22px 48px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.055);
}
.np-dashboard-console-eyebrow{
  font-family:var(--fd);
  font-size:10px;
  letter-spacing:3px;
  text-transform:uppercase;
  color:var(--gold);
  margin-bottom:8px;
}
.np-dashboard-console-title{
  font-family:var(--fd);
  font-size:20px;
  letter-spacing:2px;
  color:var(--text);
  margin-bottom:8px;
}
.np-dashboard-console-sub{
  color:var(--dim);
  line-height:1.6;
  max-width:980px;
}
.np-dashboard-console-grid{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:12px;
}
.np-dashboard-console-grid.three{
  grid-template-columns:repeat(3,minmax(0,1fr));
}
.np-dashboard-console-card{
  position:relative;
  overflow:hidden;
  border-radius:18px;
  border:1px solid rgba(126,184,212,.14);
  background:rgba(255,255,255,.035);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.045);
  padding:14px;
  min-height:104px;
}
.np-dashboard-console-card.ok{border-color:rgba(82,210,122,.22);}
.np-dashboard-console-card.warn{border-color:rgba(242,198,109,.24);}
.np-dashboard-console-card.bad{border-color:rgba(227,76,98,.28);}
.np-dashboard-console-card-title{
  font-family:var(--fd);
  font-size:10px;
  letter-spacing:2px;
  text-transform:uppercase;
  color:var(--faint);
  margin-bottom:9px;
}
.np-dashboard-console-card-value{
  font-size:20px;
  font-weight:900;
  color:var(--text);
  line-height:1.15;
}
.np-dashboard-console-card-note{
  font-size:12px;
  color:var(--faint);
  margin-top:6px;
  line-height:1.45;
}
.np-dashboard-console-dot-mini{
  display:inline-flex;
  width:10px;
  height:10px;
  border-radius:999px;
  margin-right:7px;
  background:var(--faint);
}
.np-dashboard-console-card.ok .np-dashboard-console-dot-mini{background:#52d27a;box-shadow:0 0 16px rgba(82,210,122,.45);}
.np-dashboard-console-card.warn .np-dashboard-console-dot-mini{background:#f2c66d;box-shadow:0 0 16px rgba(242,198,109,.45);}
.np-dashboard-console-card.bad .np-dashboard-console-dot-mini{background:#e34c62;box-shadow:0 0 16px rgba(227,76,98,.45);}
.np-dashboard-console-section{
  border-radius:22px;
  border:1px solid rgba(126,184,212,.14);
  background:rgba(255,255,255,.032);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.045);
  padding:14px;
}
.np-dashboard-console-section-title{
  font-family:var(--fd);
  font-size:11px;
  letter-spacing:2px;
  text-transform:uppercase;
  color:var(--glacier);
  margin-bottom:12px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
}
.np-dashboard-console-actions{
  display:flex;
  flex-wrap:wrap;
  gap:10px;
}
.np-dashboard-console-actions .btn{
  min-height:42px;
}
.np-dashboard-console-result-list{
  display:grid;
  gap:10px;
}
.np-dashboard-console-result{
  display:grid;
  grid-template-columns:28px minmax(0,1fr);
  gap:10px;
  align-items:start;
  border-radius:16px;
  border:1px solid rgba(255,255,255,.075);
  background:rgba(0,0,0,.12);
  padding:12px;
}
.np-dashboard-console-dot{
  width:24px;
  height:24px;
  border-radius:999px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  font-size:12px;
  font-weight:950;
}
.np-dashboard-console-dot.ok{background:rgba(82,210,122,.16);color:#9af0b0;}
.np-dashboard-console-dot.warn{background:rgba(242,198,109,.16);color:#f7d992;}
.np-dashboard-console-dot.bad{background:rgba(227,76,98,.18);color:#ff9aac;}
.np-dashboard-console-result-name{
  font-weight:850;
  color:var(--text);
  margin-bottom:3px;
}
.np-dashboard-console-result-detail{
  color:var(--dim);
  font-size:13px;
  line-height:1.45;
}
.np-dashboard-console-code{
  display:block;
  margin-top:8px;
  white-space:pre-wrap;
  word-break:break-word;
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-size:11px;
  line-height:1.38;
  color:rgba(245,247,251,.72);
  background:rgba(0,0,0,.22);
  border:1px solid rgba(255,255,255,.06);
  border-radius:10px;
  padding:8px;
  max-height:180px;
  overflow:auto;
}
.np-dashboard-console-log{
  display:grid;
  gap:8px;
}
.np-dashboard-console-log-item{
  border-radius:14px;
  border:1px solid rgba(255,255,255,.075);
  background:rgba(255,255,255,.028);
  padding:10px;
}
.np-dashboard-console-log-top{
  display:flex;
  justify-content:space-between;
  gap:8px;
  font-size:11px;
  color:var(--faint);
  margin-bottom:4px;
}
.np-dashboard-console-log-msg{
  font-size:13px;
  color:var(--dim);
  line-height:1.4;
}
@media(max-width:1100px){
  .np-dashboard-console-grid,
  .np-dashboard-console-grid.three{grid-template-columns:repeat(2,minmax(0,1fr));}
}
@media(max-width:720px){
  .np-dashboard-console-grid,
  .np-dashboard-console-grid.three{grid-template-columns:1fr;}
}
    `;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = css;
    document.head.appendChild(st);
  }

  function installAdminGate(){
    if(document.getElementById(GATE_STYLE_ID)) return;
    var css = [
      '.console-admin-only{display:none!important;}',
      '.is-admin .console-admin-only{display:none!important;}',
      'body:not(.np-admin-diagnostics-enabled) #np-diagnostics-button,',
      'body:not(.np-admin-diagnostics-enabled) #np-diagnostics-panel{display:none!important;visibility:hidden!important;}'
    ].join('\n');
    var st = document.createElement('style');
    st.id = GATE_STYLE_ID;
    st.textContent = css;
    document.head.appendChild(st);
  }

  function syncAdminOnly(){
    var admin = isAdmin();
    try{ document.body.classList.toggle('np-admin-diagnostics-enabled', admin); }catch(e){}
    try{
      Array.prototype.forEach.call(document.querySelectorAll('[data-admin-console-entry="true"]'), function(node){
        node.style.display = 'none';
        node.setAttribute('aria-hidden','true');
        node.tabIndex = -1;
      });
    }catch(e){}
    try{
      var panel = document.querySelector('[data-admin-console-panel="true"]');
      if(panel){
        panel.classList.remove('active');
        panel.style.display = 'none';
      }
    }catch(e){}
  }

  function statusKind(value){
    value = String(value || '').toLowerCase();
    if(value === 'ok' || value === 'true' || value === 'loaded' || value === 'chargé') return 'ok';
    if(value === 'bad' || value === 'ko' || value === 'false' || value === 'absent') return 'bad';
    return 'warn';
  }

  function getStatus(){
    var api = null;
    try{ api = window.npApiHardening && window.npApiHardening.state ? window.npApiHardening.state() : null; }catch(e){}
    var theme = null;
    try{ theme = window.themeMaxAuditReport ? window.themeMaxAuditReport() : null; }catch(e){}
    var events = [];
    try{ events = window.npDiagnostics && window.npDiagnostics.events ? window.npDiagnostics.events() : []; }catch(e){}
    var storage = 'ok';
    try{
      var k = 'np_dash_console_' + Math.random().toString(36).slice(2);
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
    }catch(e){ storage = 'bad'; }
    var lastErr = events.find(function(e){ return String(e.type || '').toLowerCase().indexOf('error') >= 0; }) || null;
    return {
      api: api,
      db: api ? api.db : 'unknown',
      auth: api ? api.auth : 'unknown',
      theme: theme,
      activeTheme: theme ? theme.active : ((document.body && document.body.getAttribute('data-theme-active')) || '—'),
      diagnostics: !!window.npDiagnostics,
      selfTest: !!window.npSiteSelfTest,
      storage: storage,
      lastError: lastErr,
      events: events
    };
  }

  function card(title, value, note, kind){
    kind = kind || 'warn';
    return '<div class="np-dashboard-console-card '+ escapeHtml(kind) +'">'
      + '<div class="np-dashboard-console-card-title"><span class="np-dashboard-console-dot-mini"></span>'+ escapeHtml(title) +'</div>'
      + '<div class="np-dashboard-console-card-value">'+ escapeHtml(value) +'</div>'
      + '<div class="np-dashboard-console-card-note">'+ escapeHtml(note || '') +'</div>'
      + '</div>';
  }

  function symbol(status){ return status === 'ok' ? '✓' : (status === 'bad' ? '×' : '!'); }

  function normalizeReport(report){
    if(!report) return {items:[]};
    if(report.items) return report;
    if(report.results && report.results.tests){
      return { items: report.results.tests.map(function(t){
        return { name:t.title, status:t.kind === 'ok' ? 'ok' : (t.kind === 'bad' ? 'bad' : 'warn'), detail:t.summary || '', extra:t };
      }) };
    }
    return {items:[]};
  }

  function count(items, status){
    return (items || []).filter(function(x){ return x.status === status; }).length;
  }

  function reportHtml(report){
    report = normalizeReport(report);
    var items = report.items || [];
    var html = '<div class="np-dashboard-console-grid three">'
      + card('OK', String(count(items,'ok')), 'Tests validés.', 'ok')
      + card('Warnings', String(count(items,'warn')), 'À surveiller.', count(items,'warn') ? 'warn' : 'ok')
      + card('Erreurs', String(count(items,'bad')), 'À corriger.', count(items,'bad') ? 'bad' : 'ok')
      + '</div>';
    html += '<div class="np-dashboard-console-result-list" style="margin-top:12px;">';
    if(!items.length){
      html += '<div class="np-dashboard-console-card"><div class="np-dashboard-console-card-title">Aucun rapport</div><div class="np-dashboard-console-card-note">Lance un test pour afficher les résultats.</div></div>';
    }else{
      html += items.map(function(it){
        return '<div class="np-dashboard-console-result">'
          + '<span class="np-dashboard-console-dot '+ escapeHtml(it.status || 'warn') +'">' + symbol(it.status) + '</span>'
          + '<div><div class="np-dashboard-console-result-name">'+ escapeHtml(it.name || 'Test') +'</div>'
          + '<div class="np-dashboard-console-result-detail">'+ escapeHtml(it.detail || '') +'</div>'
          + (it.extra ? '<code class="np-dashboard-console-code">'+ escapeHtml(safeJson(it.extra).slice(0,2400)) +'</code>' : '')
          + '</div></div>';
      }).join('');
    }
    html += '</div>';
    return html;
  }

  function logHtml(){
    if(!LAST_ACTIONS.length){
      return '<div class="np-dashboard-console-card"><div class="np-dashboard-console-card-title">Journal console</div><div class="np-dashboard-console-card-note">Aucune action lancée depuis ce chargement.</div></div>';
    }
    return '<div class="np-dashboard-console-log">' + LAST_ACTIONS.map(function(e){
      return '<div class="np-dashboard-console-log-item">'
        + '<div class="np-dashboard-console-log-top"><span>'+ escapeHtml(e.type) +'</span><span>'+ escapeHtml(e.at) +'</span></div>'
        + '<div class="np-dashboard-console-log-msg"><strong>'+ escapeHtml(e.label) +'</strong> — '+ escapeHtml(e.detail) +'</div>'
        + (e.extra ? '<code class="np-dashboard-console-code">'+ escapeHtml(safeJson(e.extra).slice(0,1400)) +'</code>' : '')
        + '</div>';
    }).join('') + '</div>';
  }

  function healthAdvice(item){
    if(!item) return '';
    if(item.key === 'database' && item.status !== 'ok') return 'Vérifie NETLIFY_DATABASE_URL dans Netlify puis redéploie.';
    if(item.key === 'jwt' && item.status !== 'ok') return 'Vérifie NP_JWT_SECRET : 32 caractères minimum.';
    if(item.key === 'siteUrl' && item.status !== 'ok') return 'Vérifie NP_SITE_URL : il doit matcher exactement l’URL publique du site.';
    if(item.key === 'auth' && item.status !== 'ok') return 'Reconnecte-toi admin après un redéploiement ou une rotation de NP_JWT_SECRET.';
    if(item.key === 'recovery' && item.status === 'warn') return 'Supprime NP_ADMIN_PASSWORD et NP_ADMIN_RECOVERY après récupération du compte admin.';
    return '';
  }

  function healthHtml(){
    var report = HEALTH_REPORT;
    if(!report){
      return '<div class="np-dashboard-console-result-list">'
        + '<div class="np-dashboard-console-card"><div class="np-dashboard-console-card-title">Diagnostic serveur</div><div class="np-dashboard-console-card-note">Lance “Diagnostic serveur” pour contrôler Netlify, DB, Auth et variables critiques.</div></div>'
        + '</div>';
    }
    var items = report.items || [];
    return '<div class="np-dashboard-console-result-list">'
      + items.map(function(it){
        var advice = healthAdvice(it);
        return '<div class="np-dashboard-console-result">'
          + '<span class="np-dashboard-console-dot '+ escapeHtml(it.status || 'warn') +'">' + symbol(it.status) + '</span>'
          + '<div><div class="np-dashboard-console-result-name">'+ escapeHtml(it.name || 'Vérification') +'</div>'
          + '<div class="np-dashboard-console-result-detail">'+ escapeHtml(it.detail || '') +'</div>'
          + (advice ? '<div class="np-dashboard-console-result-detail" style="margin-top:5px;color:var(--gold);">'+ escapeHtml(advice) +'</div>' : '')
          + (it.extra ? '<code class="np-dashboard-console-code">'+ escapeHtml(safeJson(it.extra).slice(0,1800)) +'</code>' : '')
          + '</div></div>';
      }).join('')
      + '</div>';
  }

  function renderDashboardConsole(containerId){
    injectStyle();
    syncAdminOnly();
    if(!isAdmin()) return;

    var container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if(!container) return;

    var mount = container.querySelector('#np-dashboard-console');
    if(!mount){
      mount = document.createElement('section');
      mount.id = 'np-dashboard-console';
      mount.className = 'np-dashboard-console';
      container.appendChild(mount);
    }

    var st = getStatus();
    var dbKind = statusKind(st.db);
    var authKind = st.auth === 'warn' || st.auth === 'unknown' ? 'warn' : statusKind(st.auth);
    var diagKind = st.diagnostics ? 'ok' : 'bad';
    var selfKind = st.selfTest ? 'ok' : 'bad';
    var themeKind = st.theme ? 'ok' : 'warn';

    mount.innerHTML =
      '<div class="np-dashboard-console-hero">'
        + '<div class="np-dashboard-console-eyebrow">Admin · console intégrée</div>'
        + '<div class="np-dashboard-console-title">Santé technique & diagnostics</div>'
        + '<div class="np-dashboard-console-sub">Le tableau de bord admin regroupe maintenant les statistiques serveur et la console technique. Les actions ci-dessous sont des vérifications sûres : elles ne modifient pas la DB.</div>'
      + '</div>'
      + '<div class="np-dashboard-console-grid">'
        + card('DB', String(st.db || 'unknown'), 'État actuel du ping/API DB.', dbKind)
        + card('Auth', String(st.auth || 'unknown'), 'État session/auth. “warn” peut simplement vouloir dire non connecté côté test.', authKind)
        + card('Thème', String(st.activeTheme || '—'), 'Moteur de thèmes consolidé.', themeKind)
        + card('Modules', (st.diagnostics && st.selfTest ? 'OK' : 'Incomplet'), 'Diagnostic + self-test.', (diagKind === 'ok' && selfKind === 'ok') ? 'ok' : 'bad')
      + '</div>'
      + '<div class="np-dashboard-console-section">'
        + '<div class="np-dashboard-console-section-title"><span>Actions sûres</span><span class="staff-console-badge">Aucune écriture DB</span></div>'
        + '<div class="np-dashboard-console-actions">'
          + '<button class="btn primary" onclick="runDashboardConsoleSelfTest()">Test complet</button>'
          + '<button class="btn" onclick="runDashboardServerHealth()">Diagnostic serveur</button>'
          + '<button class="btn" onclick="runDashboardConsoleDiag()">Diagnostic DB/Auth</button>'
          + '<button class="btn" onclick="retryDashboardConsoleApi()">Réessayer API</button>'
          + '<button class="btn" onclick="clearDashboardConsoleErrors()">Vider erreurs front</button>'
          + '<button class="btn" onclick="copyDashboardConsoleReport()">Copier rapport</button>'
          + '<button class="btn" onclick="downloadDashboardConsoleReport()">Exporter .json</button>'
        + '</div>'
      + '</div>'
      + '<div class="np-dashboard-console-section" data-dashboard-server-health>'
        + '<div class="np-dashboard-console-section-title"><span>Diagnostic serveur</span><span class="staff-console-badge">Netlify · DB · Auth</span></div>'
        + healthHtml()
      + '</div>'
      + '<div class="np-dashboard-console-section" data-dashboard-console-results>'
        + '<div class="np-dashboard-console-section-title"><span>Résultats</span></div>'
        + reportHtml(LAST_REPORT)
      + '</div>'
      + '<div class="np-dashboard-console-section">'
        + '<div class="np-dashboard-console-section-title"><span>Dernières actions console</span></div>'
        + logHtml()
      + '</div>';
  }

  async function runDashboardConsoleSelfTest(){
    if(!isAdmin()) return null;
    addAction('info', 'Self-test', 'Lancement du test complet.');
    try{
      var report = window.npSiteSelfTest && window.npSiteSelfTest.run
        ? await window.npSiteSelfTest.run({silent:true})
        : { items:[{name:'Self-test',status:'bad',detail:'Module npSiteSelfTest absent.'}] };
      LAST_REPORT = normalizeReport(report);
      addAction(count(LAST_REPORT.items,'bad') ? 'warn' : 'ok', 'Self-test terminé', count(LAST_REPORT.items,'bad') + ' erreur(s), ' + count(LAST_REPORT.items,'warn') + ' warning(s).', LAST_REPORT);
      var target = dashboardTargetId();
      if(target) renderDashboardConsole(target);
      try{ if(window.npApiHardening) window.npApiHardening.toast('Self-test terminé.', 'ok', 2800); }catch(e){}
      return LAST_REPORT;
    }catch(e){
      LAST_REPORT = { items:[{name:'Self-test',status:'bad',detail:String(e && e.message || e),extra:{stack:e && e.stack}}] };
      addAction('error', 'Self-test échoué', String(e && e.message || e), {stack:e && e.stack});
      var failTarget = dashboardTargetId();
      if(failTarget) renderDashboardConsole(failTarget);
      return LAST_REPORT;
    }
  }

  async function runDashboardServerHealth(){
    if(!isAdmin()) return null;
    addAction('info', 'Diagnostic serveur', 'Contrôle Netlify, DB, Auth et variables critiques.');
    var auth = await safePost('/.netlify/functions/auth', { action:'admin_health' });
    var db = await safePost('/.netlify/functions/db', { action:'ping' });
    var items = [];
    var env = auth.data && auth.data.env ? auth.data.env : {};

    items.push({
      key:'auth',
      name:'Auth admin',
      status: auth.ok ? 'ok' : (auth.status >= 500 || auth.status === 0 ? 'bad' : 'warn'),
      detail: auth.ok ? 'Session admin validée par le backend.' : 'Auth admin indisponible' + (auth.status ? ' — HTTP ' + auth.status : '') + '.',
      extra: auth.ok ? { status:auth.status, role:auth.data && auth.data.auth && auth.data.auth.role, admins:auth.data && auth.data.auth && auth.data.auth.admins } : auth
    });
    items.push({
      key:'database',
      name:'Base de données',
      status: db.ok ? 'ok' : (db.status === 503 || db.status >= 500 || db.status === 0 ? 'bad' : 'warn'),
      detail: db.ok ? 'Ping DB OK en ' + db.timeMs + ' ms.' : 'Ping DB échoué' + (db.status ? ' — HTTP ' + db.status : '') + '.',
      extra: db.ok ? { status:db.status, timeMs:db.timeMs } : db
    });
    items.push({
      key:'jwt',
      name:'NP_JWT_SECRET',
      status: env.jwtConfigured ? 'ok' : 'bad',
      detail: env.jwtConfigured ? 'Secret de session présent et assez long.' : 'Secret absent ou trop court.'
    });
    items.push({
      key:'siteUrl',
      name:'NP_SITE_URL',
      status: env.siteUrlConfigured ? 'ok' : 'warn',
      detail: env.siteUrlConfigured ? 'Origine configurée : ' + (env.siteOrigin || 'valeur illisible') + '.' : 'Origine non configurée : tolérant, mais moins explicite pour CORS.',
      extra: env.siteOrigin ? { siteOrigin:env.siteOrigin } : null
    });
    items.push({
      key:'recovery',
      name:'Récupération admin',
      status: env.adminRecoveryEnabled ? 'warn' : (env.adminBootstrapConfigured ? 'warn' : 'ok'),
      detail: env.adminRecoveryEnabled ? 'Mode recovery actif temporairement.' : (env.adminBootstrapConfigured ? 'Bootstrap admin configuré.' : 'Aucun recovery admin actif.')
    });
    items.push({
      key:'deploy',
      name:'Contexte Netlify',
      status: 'ok',
      detail: 'Contexte : ' + (env.netlifyContext || 'inconnu') + '.',
      extra: { deployId:env.deployId || null }
    });

    HEALTH_REPORT = { at:nowIso(), authStatus:auth.status, dbStatus:db.status, items:items };
    LAST_REPORT = { items:items.map(function(it){
      return { name:it.name, status:it.status, detail:it.detail, extra:it.extra || null };
    }) };
    addAction(count(LAST_REPORT.items,'bad') ? 'warn' : 'ok', 'Diagnostic serveur terminé', count(LAST_REPORT.items,'bad') + ' erreur(s), ' + count(LAST_REPORT.items,'warn') + ' warning(s).', HEALTH_REPORT);
    var target = dashboardTargetId();
    if(target) renderDashboardConsole(target);
    return HEALTH_REPORT;
  }

  async function runDashboardConsoleDiag(){
    if(!isAdmin()) return null;
    addAction('info', 'Diagnostic DB/Auth', 'Lancement du diagnostic.');
    try{
      var report = window.npDiagnostics && window.npDiagnostics.run
        ? await window.npDiagnostics.run(true)
        : null;
      LAST_REPORT = normalizeReport({results:report});
      addAction(count(LAST_REPORT.items,'bad') ? 'warn' : 'ok', 'Diagnostic terminé', count(LAST_REPORT.items,'bad') + ' erreur(s), ' + count(LAST_REPORT.items,'warn') + ' warning(s).', LAST_REPORT);
      var target = dashboardTargetId();
      if(target) renderDashboardConsole(target);
      return LAST_REPORT;
    }catch(e){
      LAST_REPORT = { items:[{name:'Diagnostic DB/Auth',status:'bad',detail:String(e && e.message || e),extra:{stack:e && e.stack}}] };
      addAction('error', 'Diagnostic échoué', String(e && e.message || e), {stack:e && e.stack});
      var failTarget = dashboardTargetId();
      if(failTarget) renderDashboardConsole(failTarget);
      return LAST_REPORT;
    }
  }

  async function retryDashboardConsoleApi(){
    if(!isAdmin()) return null;
    addAction('info', 'Retry API', 'Nouvelle tentative DB/Auth.');
    try{
      var report = window.npApiHardening && window.npApiHardening.retry
        ? await window.npApiHardening.retry()
        : null;
      LAST_REPORT = { items:[{
        name:'Retry API',
        status: report && report.db !== 'bad' && report.auth !== 'bad' ? 'ok' : 'warn',
        detail: report ? ('DB=' + report.db + ', Auth=' + report.auth) : 'Module API hardening absent.',
        extra: report
      }] };
      addAction(LAST_REPORT.items[0].status, 'Retry API terminé', LAST_REPORT.items[0].detail, report);
      var target = dashboardTargetId();
      if(target) renderDashboardConsole(target);
      return LAST_REPORT;
    }catch(e){
      LAST_REPORT = { items:[{name:'Retry API',status:'bad',detail:String(e && e.message || e),extra:{stack:e && e.stack}}] };
      addAction('error', 'Retry API échoué', String(e && e.message || e), {stack:e && e.stack});
      var failTarget = dashboardTargetId();
      if(failTarget) renderDashboardConsole(failTarget);
      return LAST_REPORT;
    }
  }

  function clearDashboardConsoleErrors(){
    if(!isAdmin()) return;
    try{
      if(window.npDiagnostics && Array.isArray(window.npDiagnostics._events)){
        window.npDiagnostics._events.length = 0;
      }
    }catch(e){}
    LAST_ACTIONS = [];
    LAST_REPORT = { items:[{name:'Erreurs front',status:'ok',detail:'Journal console local vidé. Les erreurs internes du module diagnostics peuvent rester en mémoire si non exposées.'}] };
    addAction('ok', 'Erreurs front', 'Journal console local vidé.');
    var target = dashboardTargetId();
    if(target) renderDashboardConsole(target);
  }

  async function copyDashboardConsoleReport(){
    if(!isAdmin()) return;
    var report = buildFullReport();
    try{
      await navigator.clipboard.writeText(safeJson(report));
      addAction('ok', 'Rapport copié', 'Rapport console copié dans le presse-papiers.');
      try{ if(window.npApiHardening) window.npApiHardening.toast('Rapport copié.', 'ok', 2600); }catch(e){}
    }catch(e){
      console.log('[Nuages Polaires Dashboard Console]', report);
      addAction('warn', 'Copie impossible', 'Rapport affiché dans la console navigateur.', {error:String(e && e.message || e)});
    }
  }

  function downloadDashboardConsoleReport(){
    if(!isAdmin()) return;
    var report = buildFullReport();
    var blob = new Blob([safeJson(report)], {type:'application/json;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'nuages-polaires-console-' + new Date().toISOString().replace(/[:.]/g,'-') + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 200);
    addAction('ok', 'Rapport exporté', 'Fichier JSON généré.');
  }

  function buildFullReport(){
    return {
      version: VERSION,
      at: nowIso(),
      url: String(location.href),
      role: (window.CU && window.CU.role) || null,
      user: (window.CU && (window.CU.name || window.CU.pseudo)) || null,
      status: getStatus(),
      health: HEALTH_REPORT,
      lastReport: LAST_REPORT,
      actions: LAST_ACTIONS.slice()
    };
  }

  function wrapRenderStats(){
    if(WRAPPED) return;
    try{
      if(typeof window.renderStats === 'function' && !window.renderStats.__dashboardConsoleV263){
        var previous = window.renderStats;
        var wrapped = function(containerId){
          var out = previous.apply(this, arguments);
          setTimeout(function(){
            var target = containerId || dashboardTargetId();
            if(target) renderDashboardConsole(target);
          }, 30);
          return out;
        };
        wrapped.__dashboardConsoleV263 = true;
        window.renderStats = wrapped;
        WRAPPED = true;
      }
    }catch(e){}
  }

  function boot(){
    injectStyle();
    installAdminGate();
    syncAdminOnly();
    wrapRenderStats();
    setInterval(syncAdminOnly, 1000);
    setInterval(function(){
      var target = dashboardTargetId();
      if(target) renderDashboardConsole(target);
    }, 5000);

    window.renderDashboardConsole = renderDashboardConsole;
    window.runDashboardConsoleSelfTest = runDashboardConsoleSelfTest;
    window.runDashboardConsoleDiag = runDashboardConsoleDiag;
    window.retryDashboardConsoleApi = retryDashboardConsoleApi;
    window.runDashboardServerHealth = runDashboardServerHealth;
    window.clearDashboardConsoleErrors = clearDashboardConsoleErrors;
    window.copyDashboardConsoleReport = copyDashboardConsoleReport;
    window.downloadDashboardConsoleReport = downloadDashboardConsoleReport;
    window.npDashboardConsole = {
      version:VERSION,
      render:renderDashboardConsole,
      selfTest:runDashboardConsoleSelfTest,
      diag:runDashboardConsoleDiag,
      health:runDashboardServerHealth,
      retry:retryDashboardConsoleApi,
      clear:clearDashboardConsoleErrors,
      copy:copyDashboardConsoleReport,
      download:downloadDashboardConsoleReport,
      status:getStatus,
      report:buildFullReport,
      isAdmin:isAdmin
    };
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();


/* ========================================================================== */

/* Nuages Polaires — Admin Dashboard v267
   Part 2/2 — Visual polish for Staff > Tableau de bord.
   Former file: dashboard-admin-polish.js.
*/
(function(){
  'use strict';

  var VERSION = 'v267';
  var STYLE_ID = 'np-dashboard-admin-polish-style-v264';
  var TIMER = null;
  var OBSERVER = null;

  function isAdmin(){
    try{
      if(window.CU && String(window.CU.role || '').toLowerCase() === 'admin') return true;
      var root = document.getElementById('app-root');
      var app = document.getElementById('s-app');
      return !!((root && root.classList.contains('is-admin')) || (app && app.classList.contains('is-admin')));
    }catch(e){ return false; }
  }

  function escapeHtml(str){
    return String(str == null ? '' : str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  function injectStyle(){
    if(document.getElementById(STYLE_ID)) return;
    var css = `
/* === Dashboard admin polish v264 === */
#p-admin-dashboard-c.np-dashboard-polished{
  display:grid;
  gap:18px;
}
.np-admin-dashboard-overview{
  position:relative;
  overflow:hidden;
  border-radius:28px;
  padding:20px;
  border:1px solid rgba(126,184,212,.18);
  background:
    radial-gradient(circle at 88% 10%, rgba(126,184,212,.16), transparent 18rem),
    radial-gradient(circle at 14% 88%, rgba(201,168,76,.12), transparent 20rem),
    linear-gradient(180deg, rgba(255,255,255,.065), rgba(255,255,255,.020));
  box-shadow:0 24px 58px rgba(0,0,0,.26), inset 0 1px 0 rgba(255,255,255,.06);
}
.np-admin-dashboard-overview::before{
  content:"";
  position:absolute;
  inset:0;
  pointer-events:none;
  background:linear-gradient(180deg, rgba(255,255,255,.06), transparent 36%);
}
.np-admin-dashboard-overview > *{
  position:relative;
  z-index:1;
}
.np-admin-dashboard-kicker{
  font-family:var(--fd);
  font-size:10px;
  letter-spacing:3px;
  text-transform:uppercase;
  color:var(--gold);
  display:flex;
  align-items:center;
  gap:8px;
  margin-bottom:8px;
}
.np-admin-dashboard-kicker::before{
  content:"";
  width:8px;
  height:8px;
  border-radius:999px;
  background:var(--gold);
  box-shadow:0 0 18px rgba(201,168,76,.55);
}
.np-admin-dashboard-title{
  font-family:var(--fd);
  font-size:24px;
  letter-spacing:2px;
  color:var(--text);
  margin-bottom:8px;
}
.np-admin-dashboard-sub{
  color:var(--dim);
  line-height:1.65;
  max-width:980px;
}
.np-admin-dashboard-status-grid{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:12px;
  margin-top:18px;
}
.np-admin-dashboard-status-card{
  min-height:108px;
  border-radius:20px;
  padding:14px;
  border:1px solid rgba(126,184,212,.14);
  background:rgba(255,255,255,.038);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.045);
}
.np-admin-dashboard-status-card.ok{border-color:rgba(82,210,122,.24);}
.np-admin-dashboard-status-card.warn{border-color:rgba(242,198,109,.26);}
.np-admin-dashboard-status-card.bad{border-color:rgba(227,76,98,.30);}
.np-admin-dashboard-status-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
  margin-bottom:10px;
}
.np-admin-dashboard-status-label{
  font-family:var(--fd);
  font-size:10px;
  letter-spacing:2px;
  text-transform:uppercase;
  color:var(--faint);
}
.np-admin-dashboard-status-dot{
  width:10px;
  height:10px;
  border-radius:999px;
  background:var(--faint);
}
.np-admin-dashboard-status-card.ok .np-admin-dashboard-status-dot{background:#52d27a;box-shadow:0 0 16px rgba(82,210,122,.46);}
.np-admin-dashboard-status-card.warn .np-admin-dashboard-status-dot{background:#f2c66d;box-shadow:0 0 16px rgba(242,198,109,.46);}
.np-admin-dashboard-status-card.bad .np-admin-dashboard-status-dot{background:#e34c62;box-shadow:0 0 16px rgba(227,76,98,.48);}
.np-admin-dashboard-status-value{
  font-size:20px;
  font-weight:900;
  color:var(--text);
  line-height:1.15;
}
.np-admin-dashboard-status-note{
  font-size:12px;
  line-height:1.45;
  color:var(--faint);
  margin-top:6px;
}
#p-admin-dashboard-c.np-dashboard-polished > .card,
#p-admin-dashboard-c.np-dashboard-polished > .panel,
#p-admin-dashboard-c.np-dashboard-polished .staff-panel{
  border-radius:20px !important;
}
#p-admin-dashboard-c.np-dashboard-polished .np-dashboard-console{
  margin-top:0;
}
#p-admin-dashboard-c.np-dashboard-polished .np-dashboard-console-hero{
  border-radius:24px;
}
.np-admin-dashboard-divider{
  display:flex;
  align-items:center;
  gap:10px;
  margin:2px 0 -4px;
  color:var(--faint);
  font-family:var(--fd);
  font-size:10px;
  letter-spacing:2px;
  text-transform:uppercase;
}
.np-admin-dashboard-divider::after{
  content:"";
  flex:1;
  height:1px;
  background:linear-gradient(90deg, rgba(126,184,212,.25), transparent);
}
@media(max-width:1100px){
  .np-admin-dashboard-status-grid{grid-template-columns:repeat(2,minmax(0,1fr));}
}
@media(max-width:700px){
  .np-admin-dashboard-overview{padding:16px;border-radius:22px;}
  .np-admin-dashboard-title{font-size:20px;}
  .np-admin-dashboard-status-grid{grid-template-columns:1fr;}
}
    `;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = css;
    document.head.appendChild(st);
  }

  function getStatus(){
    var api = null;
    try{ api = window.npApiHardening && window.npApiHardening.state ? window.npApiHardening.state() : null; }catch(e){}
    var theme = null;
    try{ theme = window.themeMaxAuditReport ? window.themeMaxAuditReport() : null; }catch(e){}
    var diag = !!window.npDiagnostics;
    var self = !!window.npSiteSelfTest;
    return {
      api: api,
      db: api ? api.db : 'unknown',
      auth: api ? api.auth : 'unknown',
      theme: theme,
      activeTheme: theme ? theme.active : ((document.body && document.body.getAttribute('data-theme-active')) || '—'),
      diagnostics: diag,
      selfTest: self
    };
  }

  function kind(value){
    value = String(value || '').toLowerCase();
    if(value === 'ok' || value === 'loaded' || value === 'true') return 'ok';
    if(value === 'bad' || value === 'ko' || value === 'absent' || value === 'false') return 'bad';
    return 'warn';
  }

  function statusCard(label, value, note, k){
    return '<div class="np-admin-dashboard-status-card '+ escapeHtml(k || 'warn') +'">'
      + '<div class="np-admin-dashboard-status-head"><span class="np-admin-dashboard-status-label">'+ escapeHtml(label) +'</span><span class="np-admin-dashboard-status-dot"></span></div>'
      + '<div class="np-admin-dashboard-status-value">'+ escapeHtml(value) +'</div>'
      + '<div class="np-admin-dashboard-status-note">'+ escapeHtml(note || '') +'</div>'
      + '</div>';
  }

  function ensureOverview(){
    if(!isAdmin()) return;
    var root = document.getElementById(dashboardTargetId());
    if(!root) return;
    root.classList.add('np-dashboard-polished');

    var existing = root.querySelector('#np-admin-dashboard-overview');
    var st = getStatus();
    var html = '<div class="np-admin-dashboard-kicker">Tableau de bord admin</div>'
      + '<div class="np-admin-dashboard-title">Vue d’ensemble serveur</div>'
      + '<div class="np-admin-dashboard-sub">Un point d’entrée unique pour surveiller le site : statistiques, santé DB/Auth, moteur de thèmes, diagnostics et actions sûres. Le tableau de bord reste réservé aux administrateurs.</div>'
      + '<div class="np-admin-dashboard-status-grid">'
      + statusCard('DB', st.db || 'unknown', 'État actuel du service DB.', kind(st.db))
      + statusCard('Auth', st.auth || 'unknown', 'État session/authentification.', st.auth === 'warn' ? 'warn' : kind(st.auth))
      + statusCard('Thème', st.activeTheme || '—', 'Moteur de thèmes actif.', st.theme ? 'ok' : 'warn')
      + statusCard('Modules', (st.diagnostics && st.selfTest ? 'OK' : 'Incomplet'), 'Diagnostics + self-test.', (st.diagnostics && st.selfTest) ? 'ok' : 'bad')
      + '</div>';

    if(!existing){
      var box = document.createElement('section');
      box.id = 'np-admin-dashboard-overview';
      box.className = 'np-admin-dashboard-overview';
      box.innerHTML = html;
      root.insertBefore(box, root.firstChild);
    }else{
      existing.innerHTML = html;
    }

    ensureDividers(root);
  }

  function ensureDividers(root){
    if(!root) return;
    if(!root.querySelector('[data-dashboard-divider="stats"]')){
      var firstAfterOverview = root.querySelector('#np-admin-dashboard-overview');
      if(firstAfterOverview && firstAfterOverview.nextSibling){
        var div = document.createElement('div');
        div.className = 'np-admin-dashboard-divider';
        div.setAttribute('data-dashboard-divider','stats');
        div.textContent = 'Statistiques serveur';
        root.insertBefore(div, firstAfterOverview.nextSibling);
      }
    }

    var console = root.querySelector('#np-dashboard-console,.np-dashboard-console');
    if(console && !root.querySelector('[data-dashboard-divider="tech"]')){
      var div2 = document.createElement('div');
      div2.className = 'np-admin-dashboard-divider';
      div2.setAttribute('data-dashboard-divider','tech');
      div2.textContent = 'Santé technique';
      console.parentNode.insertBefore(div2, console);
    }
  }

  function refresh(){
    injectStyle();
    ensureOverview();
  }

  function schedule(){
    clearTimeout(TIMER);
    TIMER = setTimeout(refresh, 120);
  }

  function wrapRenderStats(){
    try{
      if(typeof window.renderStats === 'function' && !window.renderStats.__dashboardPolishV264){
        var old = window.renderStats;
        var wrapped = function(){
          var out = old.apply(this, arguments);
          setTimeout(refresh, 80);
          setTimeout(refresh, 300);
          return out;
        };
        wrapped.__dashboardPolishV264 = true;
        window.renderStats = wrapped;
      }
    }catch(e){}

    try{
      if(typeof window.renderDashboardConsole === 'function' && !window.renderDashboardConsole.__dashboardPolishV264){
        var oldConsole = window.renderDashboardConsole;
        var wrappedConsole = function(){
          var out = oldConsole.apply(this, arguments);
          setTimeout(refresh, 80);
          return out;
        };
        wrappedConsole.__dashboardPolishV264 = true;
        window.renderDashboardConsole = wrappedConsole;
      }
    }catch(e){}
  }

  function observe(){
    try{
      if(OBSERVER) OBSERVER.disconnect();
      OBSERVER = new MutationObserver(function(muts){
        for(var i=0;i<muts.length;i++){
          if(muts[i].type === 'childList' || muts[i].type === 'attributes'){ schedule(); break; }
        }
      });
      OBSERVER.observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['class','data-theme-active']});
    }catch(e){}
  }

  function boot(){
    injectStyle();
    wrapRenderStats();
    refresh();
    observe();
    setInterval(refresh, 5000);
    window.npDashboardPolish = {
      version:VERSION,
      refresh:refresh,
      status:getStatus
    };
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();


/* Admin Dashboard v267 — compatibility aliases */
(function(){
  'use strict';
  try{
    window.npAdminDashboard = window.npAdminDashboard || {
      version:'v267',
      render:function(){
        var target = document.getElementById('p-admin-dashboard-c') ? 'p-admin-dashboard-c' : null;
        return target && window.renderDashboardConsole ? window.renderDashboardConsole(target) : null;
      },
      console:function(){ return window.npDashboardConsole || null; },
      polish:function(){ return window.npDashboardPolish || null; },
      status:function(){
        try{ return window.npDashboardConsole && window.npDashboardConsole.status ? window.npDashboardConsole.status() : null; }
        catch(e){ return null; }
      }
    };
  }catch(e){}
})();
