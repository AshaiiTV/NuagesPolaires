/* Nuages Polaires — Visual Audit Polish v279
   Front-only pass for navigation density, home counters, forms, player sheet grouping and mobile clarity.
*/
(function(){
  'use strict';

  var VERSION = 'v279';
  var STYLE_ID = 'np-visual-audit-polish-v279';
  var TIMER = null;

  function injectStyle(){
    if(document.getElementById(STYLE_ID)) return;

    var css = `
/* === v279 — calmer navigation hierarchy === */
.app-header .nav-icon,
.app-header .nav-item-icon{
  width:18px !important;
  min-width:18px !important;
  margin-right:6px !important;
  display:inline-flex !important;
  align-items:center !important;
  justify-content:center !important;
  opacity:.46 !important;
  filter:saturate(.75);
}
.app-header .nav-dropdown-item:hover .nav-item-icon,
.app-header .nav-dropdown-item.active .nav-item-icon,
.app-header .nav-dropdown-btn:hover .nav-icon,
.app-header .nav-dropdown-btn.has-active .nav-icon{
  opacity:.82 !important;
  filter:saturate(1);
}
.app-header .nav-dropdown-btn,
.app-header .nav-group-btn{
  letter-spacing:2px !important;
  gap:5px !important;
}
.app-header .nav-dropdown-item,
.app-header .nav-item{
  gap:7px !important;
  letter-spacing:1.55px !important;
  line-height:1.2 !important;
}
.nav-section-header,
.nav-section-label,
.nav-group-label{
  letter-spacing:2.4px !important;
  opacity:.88;
}
.nav-dropdown-menu,
.nav-group-menu{
  min-width:236px !important;
}

/* === v279 — home counters must never look broken === */
#s-home .home-footer{
  align-items:stretch !important;
}
#s-home .home-footer-item{
  position:relative;
  justify-content:center !important;
  min-height:76px;
  padding:11px 14px !important;
  border-radius:18px !important;
}
#s-home .home-footer-num{
  min-width:3ch;
  min-height:1.25em;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  font-variant-numeric:tabular-nums;
}
#s-home .home-footer-num.is-loading{
  color:transparent !important;
  text-shadow:none !important;
}
#s-home .home-footer-num.is-loading::after{
  content:"...";
  color:var(--tm-text-muted,var(--faint));
  letter-spacing:1px;
}
#s-home .home-footer-num.is-unavailable{
  color:var(--tm-text-muted,var(--faint)) !important;
  opacity:.82;
}
#s-home .home-footer-lbl{
  max-width:14ch;
  text-align:center;
  line-height:1.35 !important;
}

/* === v279 — forms: primary action reads first === */
#s-login .login-card,
#s-register .login-card,
#s-reset .login-card,
#s-hrp .login-card{
  border-radius:22px !important;
}
#s-login .btn-full,
#s-register .btn-full,
#s-reset .btn-full,
#s-hrp .hrp-actions .btn{
  min-height:48px !important;
  border-color:rgba(var(--tm-accent-rgb,155,216,244),.34) !important;
  background:linear-gradient(135deg, rgba(var(--tm-accent-rgb,155,216,244),.22), rgba(var(--tm-accent-2-rgb,228,191,102),.16)) !important;
  color:var(--tm-text,var(--text)) !important;
  box-shadow:0 14px 30px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.08) !important;
}
#s-login .btn-out,
#s-register .btn-out,
#s-hrp .btn-out{
  opacity:.82;
}
#s-login .btn-out:hover,
#s-register .btn-out:hover,
#s-hrp .btn-out:hover{
  opacity:1;
}
#s-login .frow,
#s-register .frow{
  margin-bottom:14px;
}

/* === v279 — connected page grouping === */
#fiche .shero{
  display:grid !important;
  grid-template-columns:auto minmax(0,1fr) auto;
  align-items:center;
  gap:18px;
}
#fiche .sinfo{
  min-width:0;
}
#fiche #shero-admin-btns{
  flex-wrap:wrap;
  justify-content:flex-end;
}
#fiche :where(.g2,.g3,.g4,.g6){
  align-items:stretch;
}
#fiche .card{
  overflow:hidden;
}
#fiche .card-title{
  min-height:32px;
}
#fiche .tag{
  line-height:1.3;
}
#fiche .dv{margin:22px 0!important;height:1px;background:linear-gradient(90deg,transparent,rgba(var(--tm-accent-rgb,155,216,244),.18),transparent)!important;border:0!important;}
#fiche .np-fiche-section{position:relative;}
#fiche .np-fiche-section::after{content:attr(data-visual-section);position:absolute;top:10px;right:12px;max-width:50%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--fd);font-size:7px;letter-spacing:2px;text-transform:uppercase;color:rgba(var(--tm-accent-rgb,155,216,244),.34);pointer-events:none;}
#fiche .np-fiche-section[data-visual-section="Action"]{border-color:rgba(var(--tm-accent-2-rgb,228,191,102),.26)!important;}
#fiche .np-fiche-section[data-visual-section="Action"]::after{color:rgba(var(--tm-accent-2-rgb,228,191,102),.44);}
#fiche :where(#p-gems,#p-statuts-content,#p-equip,#p-inv-c,#p-hist,#p-journal-fiche-content,#p-combat-hist-content){min-width:0;}
#fiche :where(#p-inv-c,#p-hist,#p-journal-fiche-content,#p-combat-hist-content):empty::before,#fiche :where(#p-gems,#p-statuts-content,#p-equip):empty::before{content:"Chargement...";display:block;padding:14px;border:1px dashed rgba(var(--tm-accent-rgb,155,216,244),.16);border-radius:14px;color:var(--tm-text-muted,var(--faint));font-style:italic;background:rgba(255,255,255,.025);}

/* === v279 — tables/actions do not crush mobile === */
#app-root :where(.factions,[class*="actions"],[class*="toolbar"],[class*="filters"],[class*="controls"]){
  min-width:0;
}
#app-root :where(.btn,.btn-out,.mini-btn,.tab-btn,.settings-tab,.collection-chip,.quick-link,.bfilt,.spw-btn,.theme-vis-btn,button){
  text-wrap:balance;
}
#bestiaire #beast-filters,#p-hist-filters,.np-theme-toolbar,#database .np-db-tabbar{padding:8px!important;border:1px solid rgba(var(--tm-accent-rgb,155,216,244),.13);border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.018));}
#bestiaire #beast-filters .bfilt,#p-hist-filters .bfilt{flex:0 1 auto;border-radius:999px!important;min-height:36px!important;letter-spacing:1.2px!important;}
#bestiaire #beast-search-input{min-height:46px!important;border-radius:16px!important;}
#offline-banner,#pending-banner,#runtime-guard{box-shadow:0 16px 34px rgba(0,0,0,.20),inset 0 1px 0 rgba(255,255,255,.04)!important;}

/* === v279 — mobile drawer as task navigation === */
@media(max-width:860px){
  #mobile-drawer{
    left:-100vw !important;
    width:min(86vw, 340px) !important;
    max-width:340px !important;
    padding-bottom:max(10px, env(safe-area-inset-bottom)) !important;
  }
  #mobile-drawer[style*="left: 0px"],
  #mobile-drawer[style*="left:0px"]{
    left:0 !important;
  }
  #mobile-drawer .drawer-item{
    display:flex !important;
    align-items:center !important;
    gap:10px !important;
    width:calc(100% - 20px) !important;
    margin:3px 10px !important;
    padding:12px 14px !important;
    border-radius:14px !important;
    font-size:10px !important;
    letter-spacing:1.6px !important;
    line-height:1.2 !important;
    text-align:left !important;
  }
  #mobile-drawer .drawer-item::before{
    content:"";
    width:6px;
    height:6px;
    border-radius:999px;
    background:rgba(var(--tm-accent-rgb,155,216,244),.55);
    box-shadow:0 0 10px rgba(var(--tm-accent-rgb,155,216,244),.24);
    flex:0 0 auto;
  }
  #mobile-drawer #drawer-staff-section .drawer-item::before{
    background:rgba(var(--tm-accent-2-rgb,228,191,102),.75);
    box-shadow:0 0 10px rgba(var(--tm-accent-2-rgb,228,191,102),.24);
  }
  #mobile-drawer .drawer-item span{
    opacity:.72;
  }
  #mobile-drawer > div:first-child{
    position:sticky;
    top:0;
    z-index:2;
    backdrop-filter:blur(12px);
  }
}

@media(max-width:760px){
  #s-home .home-footer{
    grid-template-columns:repeat(2,minmax(0,1fr)) !important;
  }
  #s-home .home-footer-item{
    min-height:72px;
    padding:10px 8px !important;
  }
  #s-home .home-footer-lbl{
    letter-spacing:1.6px !important;
    font-size:8px !important;
  }
  #fiche .shero{
    grid-template-columns:1fr !important;
    justify-items:center;
    text-align:center;
  }
  #fiche #shero-admin-btns{
    width:100%;
    justify-content:center;
  }
  #fiche #shero-admin-btns .btn{
    flex:1 1 100%;
  }
  #app-root :where(.card-title,.section-title,.panel-title,.modal-title,.title,h1,h2,h3){
    overflow-wrap:anywhere;
  }
  #fiche .np-fiche-section::after{position:static;display:block;max-width:none;margin:-4px 0 12px;text-align:center;}
  #bestiaire #beast-filters{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;}
  #bestiaire #beast-filters .bfilt{width:100%!important;}
  #offline-banner{position:relative!important;top:auto!important;align-items:flex-start!important;flex-direction:column;padding:12px 14px!important;}
}

@media(max-width:520px){
  #s-home .home-footer{
    grid-template-columns:1fr !important;
  }
  #s-home .home-footer-item{
    min-height:64px;
  }
  #s-login .login-wrap,
  #s-register .login-wrap,
  #s-reset .login-wrap{
    width:100%;
    max-width:420px;
    padding-left:12px;
    padding-right:12px;
  }
  #bestiaire #beast-filters{grid-template-columns:1fr!important;}
}
    `;

    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = css;
    document.head.appendChild(st);
  }

  function normalizeCounterValue(el){
    if(!el) return;
    var txt = String(el.textContent || '').trim();
    el.classList.remove('is-loading', 'is-unavailable');
    if(txt === '' || txt === '—'){
      el.textContent = '...';
      el.classList.add('is-loading');
      return;
    }
    if(txt === 'NaN' || txt === 'undefined' || txt === 'null'){
      el.textContent = '0';
      el.classList.add('is-unavailable');
    }
  }

  function stabilizeHomeCounters(){
    ['hf-joueurs','hf-creatures','hf-actifs','hf-gemmes','hf-serments'].forEach(function(id){
      normalizeCounterValue(document.getElementById(id));
    });
  }

  function markPrimaryControls(){
    [
      '#s-login .btn-full',
      '#s-register .btn-full',
      '#s-reset .btn-full',
      '#s-hrp .hrp-actions .btn'
    ].forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(btn){
        btn.classList.add('np-visual-primary');
      });
    });
  }

  function annotateDrawer(){
    var drawer = document.getElementById('mobile-drawer');
    if(!drawer) return;
    drawer.querySelectorAll('.drawer-item').forEach(function(item){
      if(!item.getAttribute('aria-label')){
        item.setAttribute('aria-label', item.textContent.replace(/\s+/g,' ').trim());
      }
    });
  }

  function markFicheSections(){
    [
      ['p-gems','Ressources'],['p-statuts-content','Etat IRP'],['p-equip','Equipement'],
      ['p-inv-c','Inventaire'],['p-csel','Action'],['p-hist','Historique'],
      ['p-journal-fiche-content','Journal'],['p-combat-hist-content','Combat']
    ].forEach(function(pair){
      var node=document.getElementById(pair[0]);
      var card=node&&node.closest?node.closest('.card'):null;
      if(!card) return;
      card.classList.add('np-fiche-section');
      card.setAttribute('data-visual-section',pair[1]);
    });
  }

  function refresh(){
    injectStyle();
    stabilizeHomeCounters();
    markPrimaryControls();
    annotateDrawer();
    markFicheSections();
    try{
      document.body.setAttribute('data-visual-audit-polish', VERSION);
      document.documentElement.setAttribute('data-visual-audit-polish', VERSION);
    }catch(e){}
  }

  function schedule(){
    clearTimeout(TIMER);
    TIMER = setTimeout(refresh, 80);
  }

  function boot(){
    refresh();
    try{
      var mo = new MutationObserver(function(){ schedule(); });
      mo.observe(document.body, {subtree:true, childList:true, attributes:true, characterData:true, attributeFilter:['class','style','data-theme-active']});
    }catch(e){}
    window.addEventListener('resize', schedule, {passive:true});
    window.addEventListener('orientationchange', schedule, {passive:true});
    setTimeout(refresh, 250);
    setTimeout(refresh, 1000);

    window.npVisualAuditPolish = {
      version:VERSION,
      refresh:refresh
    };
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
