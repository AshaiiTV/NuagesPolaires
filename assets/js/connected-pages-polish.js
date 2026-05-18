/* Nuages Polaires — Connected Pages Polish v270
   Global readability polish for logged-in/internal pages.
   Focus: player sheet, cards, forms, tables, bestiary, simulator, staff/database, modals.
*/
(function(){
  'use strict';

  var VERSION = 'v270';
  var STYLE_ID = 'np-connected-pages-polish-v270';
  var TIMER = null;

  function injectStyle(){
    if(document.getElementById(STYLE_ID)) return;

    var css = `
/* === v270 — connected pages readability foundation === */
#app-root{
  --np-readable-card:linear-gradient(180deg, rgba(255,255,255,.075), rgba(255,255,255,.026)), rgba(10,15,28,.78);
  --np-readable-card-strong:linear-gradient(180deg, rgba(255,255,255,.095), rgba(255,255,255,.035)), rgba(12,19,34,.88);
  --np-readable-border:rgba(var(--tm-accent-rgb,155,216,244),.20);
  --np-readable-border-strong:rgba(var(--tm-accent-2-rgb,228,191,102),.27);
  --np-readable-soft:rgba(255,255,255,.045);
  --np-readable-shadow:0 16px 36px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.050);
  --np-readable-shadow-strong:0 24px 54px rgba(0,0,0,.30), inset 0 1px 0 rgba(255,255,255,.060);
  color:var(--tm-text,var(--text)) !important;
}
#app-root .tab-content{
  min-width:0;
}
#app-root .tab-content.active{
  animation:npConnectedFadeIn .18s ease-out both;
}
@keyframes npConnectedFadeIn{
  from{opacity:.96;transform:translateY(3px);}
  to{opacity:1;transform:none;}
}

/* Base structure */
#app-root :where(.card,.panel,.staff-panel,.modal,.db-card,.summary-card,.archive-card,.history-card,.bcrd,.prog-panel,.sim-panel,.sim-fighter-card,.sim-log,.sim-history,.sl-card,.collection-card,.theme-card-premium,.warnbox,.hlbox,.empty-state){
  border-radius:18px !important;
  border-color:var(--np-readable-border) !important;
  background:var(--np-readable-card) !important;
  color:var(--tm-text,var(--text)) !important;
  box-shadow:var(--np-readable-shadow) !important;
}
#app-root :where(.card:hover,.panel:hover,.staff-panel:hover,.db-card:hover,.archive-card:hover,.history-card:hover,.bcrd:hover,.prog-panel:hover,.sim-panel:hover,.collection-card:hover,.theme-card-premium:hover){
  border-color:var(--np-readable-border-strong) !important;
  box-shadow:var(--np-readable-shadow-strong) !important;
}
#app-root :where(.card-title,.section-title,.panel-title,.modal-title,.title,.mtit,.sl-title,.arc-name,.summary-kicker,.home-footer-label,h1,h2,h3,h4){
  color:var(--tm-text,var(--text)) !important;
  text-shadow:0 1px 14px rgba(0,0,0,.22);
}
#app-root :where(.desc,.sub,.muted,.small,.help,.note,.hint,.tagline,.faint,.pcls,.siwpn,.eslv.empty,.arc-summary-label,.theme-preview-foot){
  color:var(--tm-text-muted,var(--dim)) !important;
  opacity:1 !important;
}
#app-root :where(.chip,.badge,.plvl,.mini,.theme-event-badge,.nav-badge,.collection-counter,.arc-pill,.arc-summary-chip){
  border-color:var(--np-readable-border) !important;
  background:linear-gradient(180deg, rgba(255,255,255,.070), rgba(255,255,255,.026)), rgba(var(--tm-accent-rgb,155,216,244),.060) !important;
  color:var(--tm-text,var(--text)) !important;
}

/* Buttons and controls */
#app-root :where(.btn,.btn-out,.mini-btn,.tab-btn,.ltab-btn,.settings-tab,.collection-chip,.quick-link,.bfilt,.spw-btn,.theme-vis-btn,.drawer-item,.drawer-close,.mclose,.tab-popup-close,.theme-chip,button){
  border-radius:13px !important;
  min-height:38px;
  border-color:var(--np-readable-border) !important;
  color:var(--tm-text,var(--text)) !important;
  background:var(--tm-control-bg,rgba(255,255,255,.055)) !important;
}
#app-root :where(.btn:hover,.btn-out:hover,.mini-btn:hover,.tab-btn:hover,.ltab-btn:hover,.settings-tab:hover,.collection-chip:hover,.quick-link:hover,.bfilt:hover,.spw-btn:hover,.theme-vis-btn:hover,.drawer-item:hover,.drawer-close:hover,.mclose:hover,.tab-popup-close:hover,.theme-chip:hover,button:hover){
  border-color:var(--np-readable-border-strong) !important;
  background:var(--tm-control-bg-hover,rgba(255,255,255,.095)) !important;
}
#app-root :where(.btn.primary,.btn-primary,.btn-main,button.primary,[data-primary="true"]){
  color:var(--tm-primary-text,#071019) !important;
  font-weight:900 !important;
  background:linear-gradient(135deg, var(--tm-accent,var(--glacier)), var(--tm-accent-bright,var(--gold))) !important;
  border-color:rgba(255,255,255,.24) !important;
  box-shadow:0 14px 30px rgba(var(--tm-accent-rgb,155,216,244),.18), inset 0 1px 0 rgba(255,255,255,.16) !important;
}

/* Inputs */
#app-root :where(input,select,textarea){
  min-height:40px;
  border-radius:13px !important;
  color:var(--tm-text,var(--text)) !important;
  background:var(--tm-input-bg,rgba(7,11,21,.78)) !important;
  border-color:var(--np-readable-border) !important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.035);
}
#app-root textarea{
  line-height:1.55 !important;
}
#app-root :where(input::placeholder,textarea::placeholder){
  color:var(--tm-text-muted,var(--faint)) !important;
  opacity:.82;
}
#app-root :where(input:focus,select:focus,textarea:focus){
  outline:none !important;
  border-color:var(--np-readable-border-strong) !important;
  box-shadow:0 0 0 3px rgba(var(--tm-accent-rgb,155,216,244),.12), inset 0 1px 0 rgba(255,255,255,.04) !important;
}

/* Tables */
#app-root :where(table,.rtbl){
  border-collapse:separate !important;
  border-spacing:0 !important;
  overflow:hidden;
  border-radius:16px;
}
#app-root :where(.rtbl th,table th){
  background:linear-gradient(180deg, rgba(var(--tm-accent-rgb,155,216,244),.16), rgba(var(--tm-accent-rgb,155,216,244),.07)) !important;
  color:var(--tm-text,var(--text)) !important;
  border-color:var(--np-readable-border) !important;
}
#app-root :where(.rtbl td,table td){
  color:var(--tm-text-soft,var(--dim)) !important;
  border-color:rgba(var(--tm-accent-rgb,155,216,244),.11) !important;
}
#app-root :where(.rtbl tr:hover td,table tr:hover td){
  background:rgba(var(--tm-accent-rgb,155,216,244),.045) !important;
}

/* Player sheet */
#fiche .shero{
  border-radius:24px;
  padding:16px;
  border:1px solid var(--np-readable-border);
  background:var(--np-readable-card-strong);
  box-shadow:var(--np-readable-shadow);
}
#fiche .sinfo h2{
  color:var(--tm-text,var(--text)) !important;
}
#fiche .sicls{
  color:var(--tm-accent,var(--glacier)) !important;
}
#fiche .brbox{
  border-radius:14px !important;
  border-color:var(--np-readable-border) !important;
  background:rgba(var(--tm-accent-rgb,155,216,244),.08) !important;
  color:var(--tm-accent-bright,var(--glacier-bright)) !important;
}
#fiche .bar{
  height:12px !important;
  border-radius:999px !important;
  background:rgba(0,0,0,.22) !important;
  border:1px solid rgba(255,255,255,.06);
  overflow:hidden;
}
#fiche .bf{
  border-radius:999px !important;
  box-shadow:0 0 16px rgba(var(--tm-accent-rgb,155,216,244),.20);
}

/* Equipment / inventory */
#equipement :where(.esl,.itm,.inv-card,.slot,.equip-card),
#inventaire :where(.esl,.itm,.inv-card,.slot,.equip-card){
  border-radius:15px !important;
  border-color:var(--np-readable-border) !important;
  background:rgba(255,255,255,.038) !important;
}
#equipement :where(.esll,.sl,.label),
#inventaire :where(.esll,.sl,.label){
  color:var(--tm-text-muted,var(--faint)) !important;
}
#equipement :where(.eslv,.sv,.value),
#inventaire :where(.eslv,.sv,.value){
  color:var(--tm-text,var(--text)) !important;
}

/* Bestiary */
#bestiaire :where(.bcrd,.beast-card,.beast-admin-adv,.beast-admin-detail,.beast-admin-shell){
  border-radius:18px !important;
  border-color:var(--np-readable-border) !important;
  background:var(--np-readable-card) !important;
}
#bestiaire :where(.bname,.btit,.beast-name,.adv-title){
  color:var(--tm-text,var(--text)) !important;
}
#bestiaire :where(.bdesc,.bmeta,.adv-sub,.beast-note){
  color:var(--tm-text-muted,var(--dim)) !important;
}
#bestiaire #beast-filters,
#bestiaire .bestiary-admin-adv .adv-actions{
  gap:8px !important;
}
#bestiaire .bfilt{
  min-height:36px;
  padding:8px 11px !important;
}

/* Simulator */
#simulateur :where(.sim-panel,.sim-fighter-card,.sim-log,.sim-history,.sim-side,.sim-notes,.sim-hud-strip){
  border-radius:18px !important;
  border-color:var(--np-readable-border) !important;
  background:var(--np-readable-card) !important;
}
#simulateur :where(.sim-fighter-name,.sim-title,.sim-section-title){
  color:var(--tm-text,var(--text)) !important;
}
#simulateur :where(.sim-log,.sim-history,.sim-notes){
  line-height:1.55;
}
#simulateur :where(.sim-action,.sim-pill,.sim-tag){
  border-color:var(--np-readable-border) !important;
  background:rgba(var(--tm-accent-rgb,155,216,244),.065) !important;
  color:var(--tm-text,var(--text)) !important;
}

/* Staff / database */
#staff :where(.staff-panel,.staff-card,.role-opt),
#database :where(.db-card,.db-theme-admin-item,.audit-card,.settings-pane),
#stats :where(.np-dashboard-console-card,.np-admin-dashboard-status-card,.np-dashboard-console-section){
  border-color:var(--np-readable-border) !important;
  background:var(--np-readable-card) !important;
}
#database :where(.db-card-title,.db-section-title,.theme-title),
#stats :where(.np-dashboard-console-title,.np-admin-dashboard-title,.np-dashboard-console-section-title){
  color:var(--tm-text,var(--text)) !important;
}
#database :where(.danger,.btn.danger,button.danger){
  border-color:rgba(227,76,98,.36) !important;
  background:linear-gradient(180deg,rgba(227,76,98,.14),rgba(227,76,98,.055)) !important;
  color:#ffdce3 !important;
}

/* Modals and popups */
#app-root :where(.modal,.tab-content.tab-popup-active,.branch-modal-shell,.cmdk,.account-dd,.branch-dd,.nav-dropdown-menu,.nav-group-menu){
  border-radius:20px !important;
  border-color:var(--np-readable-border) !important;
  background:linear-gradient(180deg, rgba(18,25,42,.96), rgba(8,13,24,.94)) !important;
  color:var(--tm-text,var(--text)) !important;
  box-shadow:0 28px 72px rgba(0,0,0,.46), inset 0 1px 0 rgba(255,255,255,.06) !important;
}
#app-root :where(.moverlay,.modal-overlay,.drawer-overlay){
  background:rgba(0,0,0,.58) !important;
  backdrop-filter:blur(5px);
}

/* Navigation clarity */
.app-header{
  border-bottom-color:var(--np-readable-border) !important;
}
.app-header .hdr-profile{
  box-sizing:border-box !important;
  height:50px !important;
  max-height:50px !important;
  padding:2px 9px !important;
  align-self:center !important;
  overflow:visible !important;
}
.app-header .hdr-av{
  width:44px !important;
  height:44px !important;
  max-width:44px !important;
  max-height:44px !important;
  box-sizing:border-box !important;
}
.app-header .hdr-av img{
  display:block !important;
  width:100% !important;
  height:100% !important;
  object-fit:contain !important;
  object-position:center !important;
  background:var(--bg4) !important;
}
.app-header .hdr-profile-info{
  min-width:0 !important;
}
.app-header .hdr-user{
  max-width:132px !important;
  overflow:hidden !important;
  text-overflow:ellipsis !important;
  white-space:nowrap !important;
  line-height:1.05 !important;
}
.app-header .hdr-badge{
  display:inline-flex !important;
  align-items:center !important;
  width:max-content !important;
  max-width:132px !important;
  min-height:14px !important;
  padding:1px 6px !important;
  line-height:1 !important;
}
.nav-dropdown-menu,
.nav-group-menu{
  padding:8px !important;
}
.nav-dropdown-item{
  border-radius:12px !important;
}

/* Collection/theme pages */
#collection :where(.collection-card,.theme-card-premium),
#themes :where(.collection-card,.theme-card-premium),
#database :where(.theme-card-premium,.db-theme-admin-item){
  min-height:100%;
}
#collection :where(.theme-title,.card-title,.title),
#themes :where(.theme-title,.card-title,.title){
  color:var(--tm-text,var(--text)) !important;
}

/* More breathable active page sections */
#app-root :where(.g2,.grid,.cards-grid,.staff-grid,.collection-grid,.theme-grid,.themes-grid,.premium-theme-grid){
  gap:16px !important;
}
#app-root :where(.warnbox,.hlbox,.empty-state){
  padding:14px 16px !important;
  line-height:1.55;
}

/* Base dark gets an extra readability lift */
body[data-theme-active="dark"] #app-root :where(.card,.panel,.staff-panel,.modal,.db-card,.summary-card,.archive-card,.history-card,.bcrd,.prog-panel,.sim-panel,.sim-fighter-card,.sim-log,.sim-history,.collection-card,.theme-card-premium),
body:not(.light):not(.theme-violet):not(.theme-red):not(.theme-green):not(.theme-easter):not(.theme-halloween):not(.theme-noel):not(.theme-aquaris):not(.theme-bloodmoon) #app-root :where(.card,.panel,.staff-panel,.modal,.db-card,.summary-card,.archive-card,.history-card,.bcrd,.prog-panel,.sim-panel,.sim-fighter-card,.sim-log,.sim-history,.collection-card,.theme-card-premium){
  background:linear-gradient(180deg, rgba(255,255,255,.082), rgba(255,255,255,.030)), rgba(11,17,31,.90) !important;
}
body[data-theme-active="dark"] #app-root :where(.card-title,.section-title,.panel-title,.title,h1,h2,h3,h4),
body:not(.light):not(.theme-violet):not(.theme-red):not(.theme-green):not(.theme-easter):not(.theme-halloween):not(.theme-noel):not(.theme-aquaris):not(.theme-bloodmoon) #app-root :where(.card-title,.section-title,.panel-title,.title,h1,h2,h3,h4){
  color:#fbfdff !important;
}
body[data-theme-active="dark"] #app-root :where(.desc,.sub,.muted,.small,.help,.note,.hint,.tagline,.faint),
body:not(.light):not(.theme-violet):not(.theme-red):not(.theme-green):not(.theme-easter):not(.theme-halloween):not(.theme-noel):not(.theme-aquaris):not(.theme-bloodmoon) #app-root :where(.desc,.sub,.muted,.small,.help,.note,.hint,.tagline,.faint){
  color:#d7e3ec !important;
}

/* Mobile */
@media(max-width:760px){
  #fiche .shero{
    flex-direction:column;
    gap:14px;
    padding:14px;
  }
  #app-root :where(.card,.panel,.staff-panel,.modal,.db-card,.summary-card,.archive-card,.history-card,.bcrd,.prog-panel,.sim-panel,.sim-fighter-card,.sim-log,.sim-history,.collection-card,.theme-card-premium){
    border-radius:16px !important;
  }
  #app-root :where(.btn,.btn-out,.mini-btn,.tab-btn,.settings-tab,.collection-chip,.quick-link,.bfilt,.spw-btn,.theme-vis-btn,button){
    min-height:42px;
  }
  #app-root :where(.rtbl,table){
    font-size:13px;
  }
  #app-root :where(.rtbl th,.rtbl td,table th,table td){
    padding:9px 8px !important;
  }
}
    `;

    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = css;
    document.head.appendChild(st);
  }

  function markActivePage(){
    try{
      var active = document.querySelector('#app-root .tab-content.active');
      if(active){
        document.body.setAttribute('data-active-connected-tab', active.id || '');
      }
    }catch(e){}
  }

  function refresh(){
    injectStyle();
    markActivePage();
    try{
      document.body.setAttribute('data-connected-pages-polish','v270');
      document.documentElement.setAttribute('data-connected-pages-polish','v270');
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
      mo.observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['class','style','data-theme-active']});
    }catch(e){}
    setTimeout(refresh, 300);
    setTimeout(refresh, 1000);
    setInterval(markActivePage, 1200);

    window.npConnectedPagesPolish = {
      version:VERSION,
      refresh:refresh
    };
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
