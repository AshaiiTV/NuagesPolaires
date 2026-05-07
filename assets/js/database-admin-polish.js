/* Nuages Polaires — Database Admin Polish v273
   Visual/UX polish for Staff > Database.
   No DB writes, no schema changes.
*/
(function(){
  'use strict';

  var VERSION = 'v273';
  var STYLE_ID = 'np-database-admin-polish-v273';
  var TIMER = null;
  var WRAPPED = false;

  function isAdmin(){
    try{
      if(window.CU && String(window.CU.role || '').toLowerCase() === 'admin') return true;
      var root = document.getElementById('app-root');
      var app = document.getElementById('s-app');
      return !!((root && root.classList.contains('is-admin')) || (app && app.classList.contains('is-admin')));
    }catch(e){ return false; }
  }

  function injectStyle(){
    if(document.getElementById(STYLE_ID)) return;

    var css = `
/* === v273 — Database admin polish === */
#database #t-database-c{
  display:grid;
  gap:16px;
}
#database .np-db-admin-hero{
  position:relative;
  overflow:hidden;
  border-radius:26px;
  padding:18px;
  border:1px solid rgba(var(--tm-accent-rgb,155,216,244),.18);
  background:
    radial-gradient(circle at 88% 12%, rgba(var(--tm-accent-rgb,155,216,244),.16), transparent 18rem),
    radial-gradient(circle at 12% 88%, rgba(var(--tm-accent-2-rgb,228,191,102),.10), transparent 18rem),
    linear-gradient(180deg, rgba(255,255,255,.065), rgba(255,255,255,.020));
  box-shadow:0 22px 54px rgba(0,0,0,.27), inset 0 1px 0 rgba(255,255,255,.060);
}
#database .np-db-admin-eyebrow{
  font-family:var(--fd);
  font-size:10px;
  letter-spacing:3px;
  text-transform:uppercase;
  color:var(--gold);
  margin-bottom:7px;
}
#database .np-db-admin-title{
  font-family:var(--fd);
  font-size:22px;
  letter-spacing:2px;
  color:var(--text);
  margin-bottom:8px;
}
#database .np-db-admin-sub{
  color:var(--dim);
  line-height:1.6;
  max-width:940px;
}
#database .np-db-admin-status-row{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:10px;
  margin-top:15px;
}
#database .np-db-admin-status{
  border-radius:16px;
  padding:11px 12px;
  border:1px solid rgba(255,255,255,.085);
  background:rgba(255,255,255,.040);
}
#database .np-db-admin-status-label{
  font-family:var(--fd);
  font-size:8px;
  letter-spacing:2px;
  text-transform:uppercase;
  color:var(--faint);
  margin-bottom:6px;
}
#database .np-db-admin-status-value{
  font-weight:900;
  color:var(--text);
}
#database .np-db-admin-warning{
  display:flex;
  align-items:flex-start;
  gap:10px;
  border-radius:18px !important;
  padding:13px 14px !important;
  border:1px solid rgba(227,76,98,.28) !important;
  background:linear-gradient(180deg, rgba(227,76,98,.12), rgba(227,76,98,.045)) !important;
  color:#ffdce3 !important;
}
#database .np-db-admin-warning strong{
  color:#fff4f6;
}
#database .np-db-admin-tabbar{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
  padding:8px;
  border-radius:18px;
  border:1px solid rgba(var(--tm-accent-rgb,155,216,244),.14);
  background:rgba(255,255,255,.032);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.04);
}
#database .np-db-admin-tabbar button{
  min-height:40px !important;
  border-radius:999px !important;
  padding:0 14px !important;
  border:1px solid rgba(var(--tm-accent-rgb,155,216,244),.15) !important;
  background:rgba(255,255,255,.042) !important;
  color:var(--dim) !important;
  font-family:var(--fd) !important;
  font-size:10px !important;
  letter-spacing:2px !important;
  text-transform:uppercase !important;
  cursor:pointer;
}
#database .np-db-admin-tabbar button.np-active{
  color:var(--text) !important;
  border-color:rgba(var(--tm-accent-2-rgb,228,191,102),.32) !important;
  background:linear-gradient(90deg, rgba(var(--tm-accent-rgb,155,216,244),.12), rgba(var(--tm-accent-2-rgb,228,191,102),.10)) !important;
  box-shadow:0 8px 18px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.06);
}
#database .np-db-admin-section-label{
  display:flex;
  align-items:center;
  gap:10px;
  margin:0 0 -4px;
  color:var(--faint);
  font-family:var(--fd);
  font-size:10px;
  letter-spacing:2px;
  text-transform:uppercase;
}
#database .np-db-admin-section-label::after{
  content:"";
  flex:1;
  height:1px;
  background:linear-gradient(90deg, rgba(var(--tm-accent-rgb,155,216,244),.25), transparent);
}
#database .card{
  border-radius:22px !important;
  padding:16px !important;
}
#database .card-title{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
}
#database .card-title::after{
  content:"ADMIN";
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-height:22px;
  padding:0 8px;
  border-radius:999px;
  font-family:var(--fd);
  font-size:8px;
  letter-spacing:1.6px;
  color:#ffb1bd;
  border:1px solid rgba(227,76,98,.22);
  background:rgba(227,76,98,.085);
}
#database table,
#database .rtbl{
  width:100%;
  border-radius:16px !important;
  overflow:hidden;
}
#database th{
  position:sticky;
  top:0;
  z-index:1;
}
#database :where(th,td){
  vertical-align:middle;
}
#database :where(.btn.danger,button.danger,[onclick*="delete"],[onclick*="reset"],[onclick*="wipe"],[onclick*="clear"]){
  border-color:rgba(227,76,98,.36) !important;
}
#database button[onclick*="delete"],
#database button[onclick*="reset"],
#database button[onclick*="wipe"],
#database button[onclick*="clear"]{
  color:#ffdce3 !important;
  background:linear-gradient(180deg, rgba(227,76,98,.13), rgba(227,76,98,.050)) !important;
}
#database .db-theme-admin-list{
  gap:12px !important;
}
#database .db-theme-admin-item{
  border-radius:18px !important;
  padding:13px !important;
  background:linear-gradient(180deg, rgba(255,255,255,.060), rgba(255,255,255,.025)), rgba(8,13,24,.62) !important;
}
#database .db-theme-admin-item .chip{
  min-height:26px;
}
#database .np-db-admin-footer-note{
  border-radius:18px;
  border:1px solid rgba(var(--tm-accent-rgb,155,216,244),.14);
  background:rgba(255,255,255,.030);
  padding:12px 14px;
  color:var(--faint);
  line-height:1.5;
  font-size:12px;
}

/* Mobile */
@media(max-width:900px){
  #database .np-db-admin-hero{
    border-radius:20px;
    padding:14px;
  }
  #database .np-db-admin-title{
    font-size:19px;
    letter-spacing:1.5px;
  }
  #database .np-db-admin-status-row{
    grid-template-columns:1fr 1fr;
  }
  #database .np-db-admin-tabbar{
    flex-wrap:nowrap;
    overflow-x:auto;
    -webkit-overflow-scrolling:touch;
    scrollbar-width:thin;
  }
  #database .np-db-admin-tabbar button{
    flex:0 0 auto;
  }
}
@media(max-width:560px){
  #database .np-db-admin-status-row{
    grid-template-columns:1fr;
  }
}
    `;

    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = css;
    document.head.appendChild(st);
  }

  function countAccounts(){
    try{ return Array.isArray(window.ACCOUNTS) ? window.ACCOUNTS.length : (typeof getAccounts === 'function' ? (getAccounts() || []).length : '—'); }
    catch(e){ return '—'; }
  }

  function countPlayers(){
    try{ return typeof gp === 'function' ? (gp() || []).length : '—'; }
    catch(e){ return '—'; }
  }

  function apiState(){
    try{
      if(window.npApiHardening && window.npApiHardening.state){
        var s = window.npApiHardening.state();
        return s && s.db ? s.db : 'unknown';
      }
    }catch(e){}
    return 'unknown';
  }

  function activeTabLabel(){
    var key = window._dbTab || 'comptes';
    var map = { comptes:'Comptes', themes:'Thèmes', historiques:'Log', audit:'Sécurité' };
    return map[key] || key;
  }

  function ensureHero(root){
    if(!root || root.querySelector('.np-db-admin-hero')) return;

    var hero = document.createElement('section');
    hero.className = 'np-db-admin-hero';
    hero.innerHTML =
      '<div class="np-db-admin-eyebrow">Admin · Database</div>'
      + '<div class="np-db-admin-title">Centre de contrôle des données</div>'
      + '<div class="np-db-admin-sub">Espace sensible réservé aux administrateurs. Les actions dangereuses sont mieux distinguées et les onglets internes restent accessibles rapidement.</div>'
      + '<div class="np-db-admin-status-row">'
        + '<div class="np-db-admin-status"><div class="np-db-admin-status-label">Onglet</div><div class="np-db-admin-status-value" data-db-status="tab">—</div></div>'
        + '<div class="np-db-admin-status"><div class="np-db-admin-status-label">Comptes</div><div class="np-db-admin-status-value" data-db-status="accounts">—</div></div>'
        + '<div class="np-db-admin-status"><div class="np-db-admin-status-label">Joueurs</div><div class="np-db-admin-status-value" data-db-status="players">—</div></div>'
        + '<div class="np-db-admin-status"><div class="np-db-admin-status-label">DB</div><div class="np-db-admin-status-value" data-db-status="api">—</div></div>'
      + '</div>';

    root.insertBefore(hero, root.firstChild);
  }

  function patchWarning(root){
    if(!root) return;
    var warn = root.querySelector('.warnbox');
    if(warn && !warn.classList.contains('np-db-admin-warning')){
      warn.classList.add('np-db-admin-warning');
      if(warn.textContent.indexOf('Données confidentielles') >= 0){
        warn.innerHTML = '<span>⚠️</span><div><strong>Données confidentielles</strong><br><span>Accès administrateur uniquement. Vérifie toujours l’onglet actif avant une action sensible.</span></div>';
      }
    }
  }

  function patchTabbar(root){
    if(!root) return;
    var candidates = Array.prototype.slice.call(root.children).filter(function(el){
      return el && el.tagName === 'DIV' && /border-bottom/i.test(el.getAttribute('style') || '') && el.querySelector('button[onclick*="openDatabaseInnerTab"]');
    });
    var bar = candidates[0];
    if(bar && !bar.classList.contains('np-db-admin-tabbar')){
      bar.classList.add('np-db-admin-tabbar');
      bar.removeAttribute('style');
    }
    if(bar){
      var active = window._dbTab || 'comptes';
      Array.prototype.forEach.call(bar.querySelectorAll('button'), function(btn){
        var oc = btn.getAttribute('onclick') || '';
        var m = oc.match(/openDatabaseInnerTab\('([^']+)'\)/);
        var key = m ? m[1] : '';
        btn.classList.toggle('np-active', key === active);
      });
    }
  }

  function ensureSectionLabels(root){
    if(!root) return;
    var cards = root.querySelectorAll('.card');
    if(cards.length && !root.querySelector('[data-db-section-label="content"]')){
      var label = document.createElement('div');
      label.className = 'np-db-admin-section-label';
      label.setAttribute('data-db-section-label','content');
      label.textContent = activeTabLabel();
      root.insertBefore(label, cards[0]);
    }else{
      var lab = root.querySelector('[data-db-section-label="content"]');
      if(lab) lab.textContent = activeTabLabel();
    }
  }

  function ensureFooterNote(root){
    if(!root || root.querySelector('.np-db-admin-footer-note')) return;
    var note = document.createElement('div');
    note.className = 'np-db-admin-footer-note';
    note.textContent = 'Astuce : les onglets Comptes, Thèmes, Log et Sécurité sont des zones sensibles. Les boutons rouges ou destructifs doivent toujours être confirmés avant validation.';
    root.appendChild(note);
  }

  function updateStatus(root){
    if(!root) return;
    var map = {
      tab: activeTabLabel(),
      accounts: String(countAccounts()),
      players: String(countPlayers()),
      api: String(apiState())
    };
    Object.keys(map).forEach(function(k){
      var el = root.querySelector('[data-db-status="'+k+'"]');
      if(el) el.textContent = map[k];
    });
  }

  function refresh(){
    injectStyle();
    if(!isAdmin()) return;
    var root = document.getElementById('t-database-c');
    if(!root) return;
    ensureHero(root);
    patchWarning(root);
    patchTabbar(root);
    ensureSectionLabels(root);
    ensureFooterNote(root);
    updateStatus(root);
    try{
      document.body.setAttribute('data-database-admin-polish', VERSION);
    }catch(e){}
  }

  function schedule(){
    clearTimeout(TIMER);
    TIMER = setTimeout(refresh, 80);
  }

  function wrapRenderDatabase(){
    if(WRAPPED) return;
    try{
      if(typeof window.renderDatabase === 'function' && !window.renderDatabase.__dbAdminPolishV273){
        var old = window.renderDatabase;
        var wrapped = function(){
          var out = old.apply(this, arguments);
          setTimeout(refresh, 40);
          setTimeout(refresh, 180);
          return out;
        };
        wrapped.__dbAdminPolishV273 = true;
        window.renderDatabase = wrapped;
        WRAPPED = true;
      }
    }catch(e){}
  }

  function boot(){
    injectStyle();
    wrapRenderDatabase();
    refresh();
    try{
      var mo = new MutationObserver(function(){ schedule(); });
      mo.observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['class','style']});
    }catch(e){}
    setInterval(refresh, 2500);

    window.npDatabaseAdminPolish = {
      version:VERSION,
      refresh:refresh
    };
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
