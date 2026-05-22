/* Nuages Polaires — Theme Regression Tests v268
   Admin-only tests for the theme engine.
   Integrated into Staff > Tableau de bord.
*/
(function(){
  'use strict';

  var VERSION = 'v268';
  var STYLE_ID = 'np-theme-regression-style-v268';
  var RESULT_ID = 'np-theme-regression-results';
  var THEMES = [
    {id:'dark', label:'Base'},
    {id:'light', label:'Clair'},
    {id:'violet', label:'Galactique'},
    {id:'green', label:'Sylvan'},
    {id:'easter', label:'Pâques'},
    {id:'halloween', label:'Halloween'},
    {id:'noel', label:'Noël'},
    {id:'aquaris', label:'Aquaris'},
    {id:'bloodmoon', label:'BloodMoon'}
  ];
  var THEME_CLASSES = ['light','theme-violet','theme-red','theme-green','theme-easter','theme-halloween','theme-noel','theme-aquaris','theme-bloodmoon'];
  var LAST_REPORT = null;
  var BUTTON_INJECTED = false;

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

  function safeJson(v){
    try{ return JSON.stringify(v, null, 2); }catch(e){ return String(v); }
  }

  function injectStyle(){
    if(document.getElementById(STYLE_ID)) return;
    var css = `
#${RESULT_ID}{
  display:grid;
  gap:12px;
  margin-top:12px;
}
.np-theme-regression-head{
  display:flex;
  flex-wrap:wrap;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  border-radius:18px;
  border:1px solid rgba(126,184,212,.14);
  background:rgba(255,255,255,.035);
  padding:14px;
}
.np-theme-regression-title{
  font-family:var(--fd);
  font-size:11px;
  letter-spacing:2px;
  text-transform:uppercase;
  color:var(--glacier);
}
.np-theme-regression-sub{
  margin-top:5px;
  color:var(--faint);
  font-size:12px;
  line-height:1.45;
}
.np-theme-regression-summary{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
}
.np-theme-regression-pill{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-height:26px;
  padding:0 10px;
  border-radius:999px;
  font-size:12px;
  font-weight:850;
  border:1px solid rgba(255,255,255,.10);
  background:rgba(255,255,255,.05);
}
.np-theme-regression-pill.ok{color:#baf5c9;border-color:rgba(82,210,122,.22);background:rgba(82,210,122,.10);}
.np-theme-regression-pill.warn{color:#f8dda0;border-color:rgba(242,198,109,.22);background:rgba(242,198,109,.10);}
.np-theme-regression-pill.bad{color:#ffb5c2;border-color:rgba(227,76,98,.24);background:rgba(227,76,98,.11);}
.np-theme-regression-grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(260px,1fr));
  gap:12px;
}
.np-theme-regression-card{
  border-radius:18px;
  border:1px solid rgba(255,255,255,.08);
  background:rgba(0,0,0,.12);
  overflow:hidden;
}
.np-theme-regression-card.ok{border-color:rgba(82,210,122,.20);}
.np-theme-regression-card.warn{border-color:rgba(242,198,109,.24);}
.np-theme-regression-card.bad{border-color:rgba(227,76,98,.28);}
.np-theme-regression-card-top{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
  padding:12px;
  border-bottom:1px solid rgba(255,255,255,.06);
}
.np-theme-regression-name{
  font-weight:900;
  color:var(--text);
}
.np-theme-regression-status{
  min-height:24px;
  padding:0 9px;
  border-radius:999px;
  font-size:10px;
  font-weight:900;
  letter-spacing:1.4px;
  text-transform:uppercase;
}
.np-theme-regression-card.ok .np-theme-regression-status{color:#9af0b0;background:rgba(82,210,122,.13);}
.np-theme-regression-card.warn .np-theme-regression-status{color:#f7d992;background:rgba(242,198,109,.13);}
.np-theme-regression-card.bad .np-theme-regression-status{color:#ff9aac;background:rgba(227,76,98,.15);}
.np-theme-regression-preview{
  height:34px;
  margin:12px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,.08);
  background:linear-gradient(90deg,var(--c1,#111),var(--c2,#7eb8d4),var(--c3,#c9a84c));
}
.np-theme-regression-list{
  display:grid;
  gap:6px;
  padding:0 12px 12px;
}
.np-theme-regression-line{
  display:grid;
  grid-template-columns:18px minmax(0,1fr);
  gap:7px;
  align-items:start;
  font-size:12px;
  color:var(--dim);
  line-height:1.4;
}
.np-theme-regression-dot{
  width:18px;
  height:18px;
  border-radius:999px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  font-size:10px;
  font-weight:950;
}
.np-theme-regression-dot.ok{color:#9af0b0;background:rgba(82,210,122,.14);}
.np-theme-regression-dot.warn{color:#f7d992;background:rgba(242,198,109,.14);}
.np-theme-regression-dot.bad{color:#ff9aac;background:rgba(227,76,98,.16);}
.np-theme-regression-code{
  margin:0 12px 12px;
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
  padding:8px;
  max-height:120px;
  overflow:auto;
}
.np-theme-regression-actions{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
}
    `;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = css;
    document.head.appendChild(st);
  }

  function nowIso(){ try{ return new Date().toISOString(); }catch(e){ return String(Date.now()); } }

  function scoreStatus(checks){
    var bad = checks.filter(function(c){ return c.status === 'bad'; }).length;
    var warn = checks.filter(function(c){ return c.status === 'warn'; }).length;
    if(bad) return 'bad';
    if(warn) return 'warn';
    return 'ok';
  }

  function symbol(status){
    return status === 'ok' ? '✓' : (status === 'bad' ? '×' : '!');
  }

  function getCssVar(name){
    try{ return getComputedStyle(document.body).getPropertyValue(name).trim(); }catch(e){ return ''; }
  }

  function luminance(hex){
    hex = String(hex || '').trim();
    var m = hex.match(/^#?([0-9a-f]{6})$/i);
    if(!m) return null;
    var n = m[1];
    var rgb = [0,2,4].map(function(i){ return parseInt(n.slice(i,i+2),16) / 255; }).map(function(v){
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }

  function contrast(hexA, hexB){
    var a = luminance(hexA), b = luminance(hexB);
    if(a == null || b == null) return null;
    var hi = Math.max(a,b), lo = Math.min(a,b);
    return (hi + 0.05) / (lo + 0.05);
  }

  function classForTheme(id){
    if(id === 'light') return 'light';
    if(id === 'dark') return '';
    return 'theme-' + id;
  }

  function setTemporaryTheme(id){
    var body = document.body;
    var snapshot = {
      className: body.className,
      style: body.getAttribute('style') || '',
      active: body.getAttribute('data-theme-active') || ''
    };
    THEME_CLASSES.forEach(function(cls){ body.classList.remove(cls); });
    var cls = classForTheme(id);
    if(cls) body.classList.add(cls);
    try{ if(typeof window.themeMaxRefresh === 'function') window.themeMaxRefresh(); }catch(e){}
    return function restore(){
      body.className = snapshot.className;
      if(snapshot.style) body.setAttribute('style', snapshot.style); else body.removeAttribute('style');
      if(snapshot.active) body.setAttribute('data-theme-active', snapshot.active);
      try{ if(typeof window.themeMaxRefresh === 'function') window.themeMaxRefresh(); }catch(e){}
    };
  }

  function testTheme(theme){
    var checks = [];
    var id = theme.id;
    var meta = null;
    var colors = [];

    try{
      meta = typeof window.themeMeta === 'function' ? window.themeMeta(id) : null;
      if(meta && meta.id){
        checks.push({name:'metadata', status:'ok', detail:'themeMeta OK : ' + (meta.label || meta.name || meta.id)});
      }else{
        checks.push({name:'metadata', status:'bad', detail:'themeMeta absent ou incomplet.'});
      }
    }catch(e){
      checks.push({name:'metadata', status:'bad', detail:'Erreur themeMeta : ' + String(e && e.message || e)});
    }

    try{
      colors = typeof window.themeMaxPreviewColors === 'function'
        ? window.themeMaxPreviewColors(id)
        : (meta && meta.previewColors ? meta.previewColors : []);
      if(Array.isArray(colors) && colors.length >= 3){
        checks.push({name:'preview', status:'ok', detail:'Preview colors OK.'});
      }else{
        checks.push({name:'preview', status:'warn', detail:'Preview colors absentes ou incomplètes.'});
      }
    }catch(e){
      checks.push({name:'preview', status:'bad', detail:'Erreur preview : ' + String(e && e.message || e)});
    }

    var restore = null;
    try{
      restore = setTemporaryTheme(id);
      var active = document.body.getAttribute('data-theme-active');
      var pageBg = getCssVar('--tm-page-bg');
      var text = getCssVar('--tm-text');
      var accent = getCssVar('--tm-accent');
      var border = getCssVar('--tm-border');
      var primaryText = getCssVar('--tm-primary-text');
      var legacyAccent = getCssVar('--glacier');
      var legacyBg = getCssVar('--bg');
      var themeAccentRgb = getCssVar('--theme-accent-rgb');

      if(active === id || (id === 'dark' && active === 'dark')){
        checks.push({name:'classe', status:'ok', detail:'Thème détecté comme actif : ' + active});
      }else{
        checks.push({name:'classe', status:'warn', detail:'Actif détecté : ' + (active || '—') + ', attendu : ' + id});
      }

      if(pageBg && text && accent && border){
        checks.push({name:'variables CSS', status:'ok', detail:'Variables principales présentes.'});
      }else{
        checks.push({name:'variables CSS', status:'bad', detail:'Variables manquantes.', extra:{pageBg:pageBg,text:text,accent:accent,border:border}});
      }

      if(legacyAccent === accent && legacyBg && themeAccentRgb){
        checks.push({name:'variables héritées', status:'ok', detail:'Anciennes variables synchronisées.'});
      }else{
        checks.push({name:'variables héritées', status:'bad', detail:'Variables historiques non synchronisées.', extra:{legacyAccent:legacyAccent,accent:accent,legacyBg:legacyBg,themeAccentRgb:themeAccentRgb}});
      }

      var ratio = contrast(accent, primaryText);
      if(ratio == null){
        checks.push({name:'contraste bouton', status:'warn', detail:'Contraste non calculable automatiquement.', extra:{accent:accent,primaryText:primaryText}});
      }else if(ratio >= 3){
        checks.push({name:'contraste bouton', status:'ok', detail:'Contraste estimé OK : ' + ratio.toFixed(2)});
      }else{
        checks.push({name:'contraste bouton', status:'warn', detail:'Contraste estimé faible : ' + ratio.toFixed(2), extra:{accent:accent,primaryText:primaryText}});
      }

      var sandbox = document.createElement('div');
      sandbox.style.cssText = 'position:absolute;left:-99999px;top:-99999px;pointer-events:none;';
      sandbox.innerHTML = '<button class="btn primary" data-primary="true">Test primaire</button><div class="card theme-card-premium"><div class="title">Carte test</div><div class="tagline">Lecture de base</div></div><span class="np-legacy-blue-probe" style="color:rgba(126,184,212,0.7);border:1px solid rgba(126,184,212,0.25);background:rgba(126,184,212,0.05);">Probe bleu legacy</span>';
      document.body.appendChild(sandbox);
      var btn = sandbox.querySelector('button');
      var card = sandbox.querySelector('.card');
      var probe = sandbox.querySelector('.np-legacy-blue-probe');
      var btnStyle = getComputedStyle(btn);
      var cardStyle = getComputedStyle(card);
      var probeStyle = getComputedStyle(probe);
      if(btnStyle.color && btnStyle.backgroundImage || btnStyle.backgroundColor){
        checks.push({name:'bouton primaire DOM', status:'ok', detail:'Bouton primaire stylé.'});
      }else{
        checks.push({name:'bouton primaire DOM', status:'warn', detail:'Style bouton primaire difficile à confirmer.'});
      }
      if(cardStyle.color && (cardStyle.backgroundColor || cardStyle.backgroundImage)){
        checks.push({name:'carte DOM', status:'ok', detail:'Carte stylée.'});
      }else{
        checks.push({name:'carte DOM', status:'warn', detail:'Style carte difficile à confirmer.'});
      }
      var legacyBlueStillVisible = id !== 'dark' && probeStyle.color.replace(/\s+/g,'') === 'rgba(126,184,212,0.7)';
      if(!legacyBlueStillVisible){
        checks.push({name:'bleu legacy', status:'ok', detail:'Les anciens styles bleus inline sont recolorés.'});
      }else{
        checks.push({name:'bleu legacy', status:'bad', detail:'Un style bleu de base reste visible.', extra:{color:probeStyle.color,borderColor:probeStyle.borderColor,backgroundColor:probeStyle.backgroundColor}});
      }
      sandbox.remove();
    }catch(e){
      checks.push({name:'runtime', status:'bad', detail:'Erreur runtime : ' + String(e && e.message || e), extra:{stack:e && e.stack}});
    }finally{
      if(restore) restore();
    }

    return {
      id:id,
      label:theme.label,
      status:scoreStatus(checks),
      colors:colors,
      meta:meta,
      checks:checks
    };
  }

  function count(results, status){
    return results.filter(function(r){ return r.status === status; }).length;
  }

  function renderReport(report){
    var root = document.getElementById(RESULT_ID);
    if(!root){
      var stats = document.getElementById('p-stats-c');
      if(!stats) return;
      root = document.createElement('section');
      root.id = RESULT_ID;
      var consoleSection = stats.querySelector('#np-dashboard-console,.np-dashboard-console');
      if(consoleSection) consoleSection.appendChild(root);
      else stats.appendChild(root);
    }

    var results = report.results || [];
    var html = '<div class="np-theme-regression-head">'
      + '<div><div class="np-theme-regression-title">Anti-régression thèmes</div>'
      + '<div class="np-theme-regression-sub">' + escapeHtml(report.at) + ' · ' + escapeHtml(report.durationMs) + ' ms · vérification non destructive.</div></div>'
      + '<div class="np-theme-regression-summary">'
      + '<span class="np-theme-regression-pill ok">OK ' + count(results,'ok') + '</span>'
      + '<span class="np-theme-regression-pill warn">Warn ' + count(results,'warn') + '</span>'
      + '<span class="np-theme-regression-pill bad">Bad ' + count(results,'bad') + '</span>'
      + '</div></div>';

    html += '<div class="np-theme-regression-grid">';
    html += results.map(function(r){
      var colors = Array.isArray(r.colors) ? r.colors : [];
      var c1 = colors[0] || '#111111', c2 = colors[1] || '#7eb8d4', c3 = colors[2] || '#c9a84c';
      return '<article class="np-theme-regression-card ' + escapeHtml(r.status) + '">'
        + '<div class="np-theme-regression-card-top"><span class="np-theme-regression-name">' + escapeHtml(r.label) + '</span><span class="np-theme-regression-status">' + escapeHtml(r.status) + '</span></div>'
        + '<div class="np-theme-regression-preview" style="--c1:' + escapeHtml(c1) + ';--c2:' + escapeHtml(c2) + ';--c3:' + escapeHtml(c3) + '"></div>'
        + '<div class="np-theme-regression-list">'
        + r.checks.map(function(ch){
          return '<div class="np-theme-regression-line"><span class="np-theme-regression-dot ' + escapeHtml(ch.status) + '">' + symbol(ch.status) + '</span><span><strong>' + escapeHtml(ch.name) + '</strong> — ' + escapeHtml(ch.detail) + '</span></div>';
        }).join('')
        + '</div>'
        + (r.status === 'bad' ? '<code class="np-theme-regression-code">' + escapeHtml(safeJson(r).slice(0, 1800)) + '</code>' : '')
        + '</article>';
    }).join('');
    html += '</div>';

    root.innerHTML = html;
  }

  function runThemeRegression(){
    if(!isAdmin()) return Promise.resolve(null);
    injectStyle();

    var start = Date.now();
    var report = {
      version:VERSION,
      at:nowIso(),
      durationMs:0,
      results:[]
    };

    return Promise.resolve().then(function(){
      report.results = THEMES.map(testTheme);
      report.durationMs = Date.now() - start;
      LAST_REPORT = report;
      renderReport(report);

      try{
        if(window.npApiHardening && typeof window.npApiHardening.toast === 'function'){
          var bad = count(report.results,'bad');
          var warn = count(report.results,'warn');
          window.npApiHardening.toast('Test thèmes terminé : ' + bad + ' erreur(s), ' + warn + ' warning(s).', bad ? 'bad' : (warn ? 'warn' : 'ok'), 4200);
        }
      }catch(e){}

      try{
        if(window.npDashboardConsole && typeof window.npDashboardConsole.render === 'function'){
          // Keep existing dashboard globals alive.
        }
      }catch(e){}

      return report;
    });
  }

  async function copyThemeRegressionReport(){
    if(!isAdmin()) return;
    var report = LAST_REPORT || await runThemeRegression();
    try{
      await navigator.clipboard.writeText(safeJson(report));
      try{ if(window.npApiHardening) window.npApiHardening.toast('Rapport thèmes copié.', 'ok', 2800); }catch(e){}
    }catch(e){
      console.log('[Nuages Polaires Theme Regression]', report);
      try{ if(window.npApiHardening) window.npApiHardening.toast('Copie impossible, rapport affiché en console.', 'warn', 3800); }catch(err){}
    }
  }

  function injectButtons(){
    if(!isAdmin()) return;
    var actions = document.querySelector('.np-dashboard-console-actions');
    if(!actions) return;
    if(actions.querySelector('[data-theme-regression-run]')) return;

    var run = document.createElement('button');
    run.className = 'btn';
    run.type = 'button';
    run.setAttribute('data-theme-regression-run','true');
    run.textContent = 'Tester les thèmes';
    run.addEventListener('click', function(){ runThemeRegression(); });

    var copy = document.createElement('button');
    copy.className = 'btn';
    copy.type = 'button';
    copy.setAttribute('data-theme-regression-copy','true');
    copy.textContent = 'Copier rapport thèmes';
    copy.addEventListener('click', function(){ copyThemeRegressionReport(); });

    actions.appendChild(run);
    actions.appendChild(copy);
  }

  function patchDashboard(){
    injectButtons();
  }

  function boot(){
    injectStyle();
    patchDashboard();
    setInterval(patchDashboard, 1000);

    try{
      var mo = new MutationObserver(function(){ patchDashboard(); });
      mo.observe(document.body, {subtree:true, childList:true});
    }catch(e){}

    window.runThemeRegressionTests = runThemeRegression;
    window.copyThemeRegressionReport = copyThemeRegressionReport;
    window.npThemeRegression = {
      version:VERSION,
      run:runThemeRegression,
      copy:copyThemeRegressionReport,
      last:function(){ return LAST_REPORT; },
      themes:THEMES.slice()
    };
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
