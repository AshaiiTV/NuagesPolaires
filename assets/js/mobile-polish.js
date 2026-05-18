/* Nuages Polaires — Mobile Polish v272
   Mobile audit/polish layer for home, staff menu, dashboard, database, collection, bestiary, simulator and modals.
   No DB changes.
*/
(function(){
  'use strict';

  var VERSION = 'v272';
  var STYLE_ID = 'np-mobile-polish-v272';
  var TIMER = null;

  function injectStyle(){
    if(document.getElementById(STYLE_ID)) return;

    var css = `
/* === v272 — global mobile safety === */
html,body{
  max-width:100%;
  overflow-x:hidden;
}
@media(max-width:860px){
  :root{
    --np-mobile-pad:14px;
    --np-mobile-radius:18px;
  }
  body{
    -webkit-text-size-adjust:100%;
    text-size-adjust:100%;
  }
  .screen,
  .app-body,
  #app-root,
  .np-wrap{
    max-width:100vw !important;
    overflow-x:hidden !important;
  }
  #app-root .tab-content{
    padding-left:var(--np-mobile-pad) !important;
    padding-right:var(--np-mobile-pad) !important;
    box-sizing:border-box !important;
  }
  #app-root :where(.card,.panel,.staff-panel,.db-card,.modal,.collection-card,.theme-card-premium,.bcrd,.sim-panel,.sim-fighter-card,.summary-card,.archive-card,.history-card){
    max-width:100% !important;
    box-sizing:border-box !important;
  }
  #app-root :where(.g2,.grid,.cards-grid,.staff-grid,.collection-grid,.theme-grid,.themes-grid,.premium-theme-grid,.adv-grid){
    grid-template-columns:1fr !important;
    gap:12px !important;
  }
  #app-root :where(.btn,.btn-out,.mini-btn,.tab-btn,.settings-tab,.collection-chip,.quick-link,.bfilt,.spw-btn,.theme-vis-btn,button){
    min-height:44px !important;
    padding:10px 13px !important;
    touch-action:manipulation;
  }
  #app-root :where(input,select,textarea){
    font-size:16px !important;
    min-height:44px !important;
  }
  #app-root textarea{
    min-height:104px !important;
  }
}

/* === Home mobile === */
@media(max-width:720px){
  #s-home{
    min-height:100svh !important;
  }
  #s-home .home-title-1,
  #s-home .home-title-2{
    font-size:clamp(38px, 13vw, 60px) !important;
    letter-spacing:clamp(3px, 1.7vw, 8px) !important;
  }
  #s-home .home-sub{
    max-width:calc(100vw - 32px) !important;
  }
  #s-home .home-actions{
    width:calc(100vw - 34px) !important;
    max-width:380px !important;
  }
  #s-home .home-btn{
    width:100% !important;
    min-height:58px !important;
  }
  #s-home .home-footer{
    width:calc(100vw - 30px) !important;
    max-width:420px !important;
    grid-template-columns:repeat(2,minmax(0,1fr)) !important;
  }
  #s-home .home-footer-item{
    min-width:0 !important;
  }
}

/* === Header / drawer mobile === */
@media(max-width:860px){
  .app-header{
    min-height:62px !important;
    padding:8px 10px !important;
    gap:8px !important;
  }
  .hdr-r{
    gap:6px !important;
  }
  .hdr-profile-info{
    display:flex !important;
    flex-direction:column !important;
    justify-content:center !important;
    gap:4px !important;
    height:42px !important;
    min-width:0 !important;
    max-width:126px !important;
    overflow:hidden !important;
  }
  .app-header .hdr-profile{
    display:flex !important;
    align-items:center !important;
    height:48px !important;
    max-height:48px !important;
    padding:2px 7px !important;
    align-self:center !important;
    overflow:visible !important;
  }
  .app-header .hdr-av{
    width:42px !important;
    height:42px !important;
    max-width:42px !important;
    max-height:42px !important;
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
  .hdr-user{
    display:block !important;
    min-height:0 !important;
    height:auto !important;
    max-width:120px !important;
    overflow:hidden !important;
    text-overflow:ellipsis !important;
    white-space:nowrap !important;
    line-height:1.05 !important;
  }
  .app-header .hdr-badge{
    display:inline-flex !important;
    align-items:center !important;
    justify-content:center !important;
    align-self:flex-start !important;
    min-height:0 !important;
    height:17px !important;
    line-height:1 !important;
    box-sizing:border-box !important;
  }
  #mobile-drawer{
    width:min(88vw, 360px) !important;
    max-width:360px !important;
  }
  #drawer-staff-section .drawer-item{
    min-height:46px !important;
    padding-top:12px !important;
    padding-bottom:12px !important;
  }
  .nav-dropdown-menu,
  .nav-group-menu{
    max-width:calc(100vw - 24px) !important;
  }
}

/* === Dashboard admin mobile === */
@media(max-width:900px){
  #p-stats-c .np-admin-dashboard-overview,
  #p-stats-c .np-dashboard-console-hero,
  #p-stats-c .np-dashboard-console-section{
    border-radius:20px !important;
    padding:14px !important;
  }
  #p-stats-c .np-admin-dashboard-title,
  #p-stats-c .np-dashboard-console-title{
    font-size:19px !important;
    letter-spacing:1.4px !important;
  }
  #p-stats-c .np-admin-dashboard-status-grid,
  #p-stats-c .np-dashboard-console-grid,
  #p-stats-c .np-dashboard-console-grid.three{
    grid-template-columns:1fr !important;
  }
  #p-stats-c .np-dashboard-console-actions{
    display:grid !important;
    grid-template-columns:1fr !important;
    gap:8px !important;
  }
  #p-stats-c .np-dashboard-console-actions .btn{
    width:100% !important;
    justify-content:center !important;
  }
  #p-stats-c .np-dashboard-console-result{
    grid-template-columns:24px minmax(0,1fr) !important;
    padding:10px !important;
  }
  #p-stats-c .np-dashboard-console-code,
  #p-stats-c .np-theme-regression-code{
    max-height:180px !important;
    font-size:10.5px !important;
  }
  #p-stats-c .np-theme-regression-grid{
    grid-template-columns:1fr !important;
  }
}

/* === Database mobile === */
@media(max-width:900px){
  #database #t-database-c{
    display:block !important;
    max-width:100% !important;
  }
  #database .warnbox{
    border-radius:16px !important;
    line-height:1.5 !important;
  }
  #database #t-database-c > div[style*="display:flex"][style*="border-bottom"],
  #database .np-db-tabbar{
    display:flex !important;
    overflow-x:auto !important;
    gap:8px !important;
    padding-bottom:8px !important;
    scrollbar-width:thin;
    -webkit-overflow-scrolling:touch;
  }
  #database #t-database-c > div[style*="display:flex"][style*="border-bottom"] button{
    flex:0 0 auto !important;
    min-height:44px !important;
    white-space:nowrap !important;
    border-radius:999px !important;
    border:1px solid rgba(var(--tm-accent-rgb,155,216,244),.18) !important;
    background:rgba(255,255,255,.045) !important;
  }
  #database .card{
    padding:14px !important;
    overflow:hidden !important;
  }
  #database .card > div[style*="display:flex"],
  #database .card-title + div[style*="display:flex"],
  #database div[style*="justify-content:space-between"]{
    flex-wrap:wrap !important;
    gap:8px !important;
  }
  #database table,
  #database .rtbl{
    display:block !important;
    width:100% !important;
    max-width:100% !important;
    overflow-x:auto !important;
    -webkit-overflow-scrolling:touch;
    border-radius:14px !important;
  }
  #database th,
  #database td{
    white-space:nowrap !important;
  }
  #database input,
  #database select{
    width:100% !important;
  }
  #database .db-theme-admin-item{
    flex-direction:column !important;
    align-items:stretch !important;
    gap:10px !important;
  }
  #database .db-theme-admin-item > *{
    width:100%;
  }
}

/* === Collection themes mobile === */
@media(max-width:760px){
  .np-theme-toolbar{
    display:grid !important;
    grid-template-columns:1fr !important;
    gap:9px !important;
  }
  .np-theme-search,
  .np-theme-select{
    width:100% !important;
    flex:1 1 100% !important;
  }
  .np-theme-count{
    margin-left:0 !important;
  }
  .theme-preview-mini{
    min-height:108px !important;
  }
}

/* === Bestiary mobile === */
@media(max-width:900px){
  #bestiaire .bestiary-admin-adv .adv-head,
  #bestiaire .bestiary-admin-adv .adv-actions{
    flex-direction:column !important;
    align-items:stretch !important;
  }
  #bestiaire .bestiary-admin-adv .adv-grid{
    grid-template-columns:1fr !important;
  }
  #bestiaire .bestiary-admin-adv .adv-actions .btn,
  #bestiaire .bfilt{
    width:100% !important;
    justify-content:center !important;
  }
  #bestiaire #beast-filters{
    display:grid !important;
    grid-template-columns:1fr !important;
  }
  #bestiaire .bestiary-admin-detail,
  #bestiaire .beast-admin-detail{
    max-width:100% !important;
    overflow-x:hidden !important;
  }
}

/* === Simulator mobile === */
@media(max-width:900px){
  #simulateur :where(.sim-layout,.sim-grid,.sim-main,.sim-shell){
    display:grid !important;
    grid-template-columns:1fr !important;
    gap:12px !important;
  }
  #simulateur :where(.sim-side,.sim-panel,.sim-history,.sim-log){
    width:100% !important;
    max-width:100% !important;
  }
  #simulateur :where(.sim-actions,.sim-action-row,.sim-hud-strip){
    display:grid !important;
    grid-template-columns:1fr !important;
    gap:8px !important;
  }
  #simulateur :where(.sim-log,.sim-history){
    max-height:55svh !important;
    overflow:auto !important;
  }
}

/* === Modals / popups mobile === */
@media(max-width:760px){
  #app-root :where(.modal,.tab-content.tab-popup-active,.branch-modal-shell,.cmdk,.account-dd,.branch-dd,.nav-dropdown-menu,.nav-group-menu){
    max-width:calc(100vw - 18px) !important;
    max-height:calc(100svh - 24px) !important;
    overflow:auto !important;
    border-radius:18px !important;
  }
  body.light #app-root :where(.modal,.tab-content.tab-popup-active,.branch-modal-shell,.cmdk,.account-dd,.branch-dd,.nav-dropdown-menu,.nav-group-menu),
  body[data-theme-active="light"] #app-root :where(.modal,.tab-content.tab-popup-active,.branch-modal-shell,.cmdk,.account-dd,.branch-dd,.nav-dropdown-menu,.nav-group-menu),
  body.light :where(#nav-dropdown-root .nav-dropdown-menu,#nav-dropdown-root .nav-group-menu,#mobile-drawer,.nav-dropdown-menu,.nav-group-menu,.account-dd,.branch-dd,.menu),
  body[data-theme-active="light"] :where(#nav-dropdown-root .nav-dropdown-menu,#nav-dropdown-root .nav-group-menu,#mobile-drawer,.nav-dropdown-menu,.nav-group-menu,.account-dd,.branch-dd,.menu){
    border-color:var(--np-ui-border-soft,rgba(58,143,186,.18)) !important;
    background:var(--np-ui-dropdown-bg,linear-gradient(180deg,rgba(255,255,255,.998),rgba(241,247,253,.992))) !important;
    color:var(--tm-text,var(--text)) !important;
    box-shadow:0 18px 42px rgba(31,57,88,.12), inset 0 1px 0 rgba(255,255,255,.78) !important;
  }
  .tab-content.tab-popup-active{
    left:9px !important;
    right:9px !important;
    top:12px !important;
    bottom:12px !important;
    width:auto !important;
  }
  .moverlay,
  .modal-overlay,
  .drawer-overlay{
    backdrop-filter:blur(4px);
  }
}

/* === Mobile readability helpers === */
@media(max-width:760px){
  #app-root :where(.card-title,.section-title,.panel-title,.modal-title,.title,h1,h2,h3){
    line-height:1.18 !important;
  }
  #app-root :where(.desc,.sub,.muted,.small,.help,.note,.hint,.tagline,.faint,p,li){
    line-height:1.55 !important;
  }
  #app-root :where(.card,.panel,.staff-panel,.db-card,.summary-card,.archive-card,.history-card,.bcrd,.prog-panel,.sim-panel,.collection-card,.theme-card-premium){
    padding:14px !important;
  }
}
    `;

    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = css;
    document.head.appendChild(st);
  }

  function markViewport(){
    try{
      var mobile = window.matchMedia && window.matchMedia('(max-width: 860px)').matches;
      document.body.classList.toggle('np-mobile-polish-active', !!mobile);
      document.documentElement.classList.toggle('np-mobile-polish-active', !!mobile);
      document.body.setAttribute('data-mobile-polish', VERSION);
    }catch(e){}
  }

  function refresh(){
    injectStyle();
    markViewport();
  }

  function schedule(){
    clearTimeout(TIMER);
    TIMER = setTimeout(refresh, 80);
  }

  function boot(){
    refresh();
    window.addEventListener('resize', schedule, {passive:true});
    window.addEventListener('orientationchange', schedule, {passive:true});
    try{
      var mo = new MutationObserver(function(){ schedule(); });
      mo.observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['class','style']});
    }catch(e){}
    setTimeout(refresh, 300);
    setTimeout(refresh, 1000);

    window.npMobilePolish = {
      version:VERSION,
      refresh:refresh
    };
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
