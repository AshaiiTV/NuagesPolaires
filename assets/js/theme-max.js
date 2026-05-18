/* Nuages Polaires — Theme Engine v257
   Consolidated replacement for the old Theme Max v1-v8 stack.
   Goals:
   - one CSS injection
   - one MutationObserver
   - one metadata source
   - preserved collection UX, premium previews and rare theme staging
*/
(function(){
  'use strict';

  var ENGINE_VERSION = 'v257';
  var STYLE_ID = 'np-theme-engine-v257';
  var TIMER = null;
  var FILTER_STORAGE_KEY = 'np_theme_collection_filters_v257';

  var CONFIG = {
    dark: {
      id:'dark', label:'Nuages Polaires', cls:'', rarity:'Base', category:'Base',
      tagline:"L’identité Nuages Polaires.",
      desc:'Le thème original, sobre, sombre et lisible.',
      colors:['#0d0e18','#7eb8d4','#c9a84c'],
      tone:'dark',
      vars:{
        bg:'#0d0e18', bg2:'#141725', bg3:'#1b2033', bg4:'#232b43',
        text:'#f5f7fb', dim:'#c7d4df', faint:'#8c9aaa',
        accent:'#7eb8d4', accentDim:'#477f9c', accentBright:'#c9a84c',
        accentRgb:'126,184,212', accent2Rgb:'201,168,76',
        pageBg:'radial-gradient(circle at 18% 12%, rgba(126,184,212,.13), transparent 24rem),radial-gradient(circle at 82% 82%, rgba(201,168,76,.09), transparent 26rem),linear-gradient(180deg,#0d0e18 0%,#141725 52%,#080a12 100%)'
      }
    },
    light: {
      id:'light', label:'Brume Claire', cls:'light', rarity:'Base', category:'Base',
      tagline:'Une lecture plus claire et apaisée.',
      desc:'Mode clair, propre et doux.',
      colors:['#f4f5fa','#3a8fba','#9a7020'],
      tone:'light',
      vars:{
        bg:'#f4f5fa', bg2:'#e8edf4', bg3:'#dce4ee', bg4:'#cbd8e5',
        text:'#15202b', dim:'#405363', faint:'#6f8190',
        accent:'#3a8fba', accentDim:'#1e6384', accentBright:'#9a7020',
        accentRgb:'58,143,186', accent2Rgb:'154,112,32',
        pageBg:'radial-gradient(circle at 18% 12%, rgba(58,143,186,.16), transparent 24rem),radial-gradient(circle at 82% 82%, rgba(154,112,32,.09), transparent 26rem),linear-gradient(180deg,#f7f9fc 0%,#e9eff6 52%,#dfe7f1 100%)'
      }
    },
    violet: {
      id:'violet', label:'Abyssal', cls:'theme-violet', rarity:'Classique', category:'Classiques',
      tagline:'Abyssal violet, noble et feutré.',
      desc:'Une ambiance froide, mystique et nocturne.',
      colors:['#0e0d18','#b07ae0','#9a74c4'],
      tone:'dark',
      vars:{
        bg:'#0e0d18', bg2:'#171326', bg3:'#211a36', bg4:'#30234b',
        text:'#fbf7ff', dim:'#d7c8e8', faint:'#9d8caf',
        accent:'#b07ae0', accentDim:'#6c4794', accentBright:'#d9b6ff',
        accentRgb:'176,122,224', accent2Rgb:'217,182,255',
        pageBg:'radial-gradient(circle at 18% 14%, rgba(176,122,224,.15), transparent 24rem),radial-gradient(circle at 84% 82%, rgba(154,116,196,.11), transparent 26rem),linear-gradient(180deg,#0e0d18 0%,#171326 52%,#090711 100%)'
      }
    },
    red: {
      id:'red', label:'Écarlate', cls:'theme-red', rarity:'Classique', category:'Classiques',
      tagline:'Écarlate, chaud et affirmé.',
      desc:'Rouge profond, chaleur et tension élégante.',
      colors:['#180b0d','#e35f5f','#d7a04b'],
      tone:'dark',
      vars:{
        bg:'#180b0d', bg2:'#241011', bg3:'#341719', bg4:'#4a2023',
        text:'#fff6f4', dim:'#ecc7c1', faint:'#b28b85',
        accent:'#e35f5f', accentDim:'#9a2f32', accentBright:'#d7a04b',
        accentRgb:'227,95,95', accent2Rgb:'215,160,75',
        pageBg:'radial-gradient(circle at 18% 14%, rgba(227,95,95,.15), transparent 24rem),radial-gradient(circle at 84% 82%, rgba(215,160,75,.10), transparent 26rem),linear-gradient(180deg,#180b0d 0%,#241011 52%,#090405 100%)'
      }
    },
    green: {
      id:'green', label:'Sylvan', cls:'theme-green', rarity:'Classique', category:'Classiques',
      tagline:'Sylvan, végétal et élégant.',
      desc:'Nature nocturne, vert magique et atmosphère organique.',
      colors:['#0c1510','#69c47d','#c0aa5a'],
      tone:'dark',
      vars:{
        bg:'#0c1510', bg2:'#111f17', bg3:'#172c20', bg4:'#203d2b',
        text:'#f4fff7', dim:'#c6e0cc', faint:'#88a590',
        accent:'#69c47d', accentDim:'#3d8750', accentBright:'#c0aa5a',
        accentRgb:'105,196,125', accent2Rgb:'192,170,90',
        pageBg:'radial-gradient(circle at 18% 14%, rgba(105,196,125,.13), transparent 24rem),radial-gradient(circle at 84% 82%, rgba(192,170,90,.09), transparent 26rem),linear-gradient(180deg,#0c1510 0%,#111f17 52%,#050b07 100%)'
      }
    },
    easter: {
      id:'easter', label:'Pâques enchantées', cls:'theme-easter', rarity:'Saisonnier', category:'Saisonniers',
      tagline:'Printemps vivant, mignon et coloré.',
      desc:'Un printemps joyeux : fleurs, herbe, lumière douce et couleurs pastel.',
      colors:['#f7fff2','#7fdc82','#ffd86b','#ffb6d8'],
      tone:'light',
      vars:{
        bg:'#effbe9', bg2:'#e5f7de', bg3:'#d7f2cf', bg4:'#c6ebbd',
        text:'#203227', dim:'#49655a', faint:'#668378',
        accent:'#63c76c', accentDim:'#38914a', accentBright:'#ff83bc',
        accentRgb:'127,220,130', accent2Rgb:'255,182,216',
        pageBg:'radial-gradient(circle at 12% 10%, rgba(255,216,107,.34), transparent 20rem),radial-gradient(circle at 88% 14%, rgba(255,182,216,.28), transparent 18rem),radial-gradient(circle at 70% 82%, rgba(127,220,130,.28), transparent 25rem),linear-gradient(180deg,#f5fff1 0%,#eaf9e4 50%,#def2d5 100%)'
      }
    },
    halloween: {
      id:'halloween', label:'Veille d’Halloween', cls:'theme-halloween', rarity:'Saisonnier', category:'Saisonniers',
      tagline:'Presque creepy, entre citrouille et brume.',
      desc:'Nuit violette, lueur orange et ambiance inquiétante.',
      colors:['#0a0911','#ff8f2b','#7c59ff','#d8d2ff'],
      tone:'dark',
      vars:{
        bg:'#0a0911', bg2:'#110d18', bg3:'#191224', bg4:'#251830',
        text:'#fff4ea', dim:'#e8ccb6', faint:'#a98e8d',
        accent:'#ff8f2b', accentDim:'#a04b12', accentBright:'#d8d2ff',
        accentRgb:'255,143,43', accent2Rgb:'124,89,255',
        pageBg:'radial-gradient(circle at 84% 16%, rgba(255,143,43,.16), transparent 18rem),radial-gradient(circle at 18% 84%, rgba(124,89,255,.14), transparent 22rem),linear-gradient(180deg,#0a0911 0%,#110d18 50%,#05040a 100%)'
      }
    },
    noel: {
      id:'noel', label:'Noël en fête', cls:'theme-noel', rarity:'Saisonnier', category:'Saisonniers',
      tagline:'Festif, chaleureux, rouge, vert et or.',
      desc:'Un Noël lumineux, rouge, vert, doré et enneigé.',
      colors:['#08140d','#d84a52','#2ea85f','#f2c66d'],
      tone:'dark',
      vars:{
        bg:'#08140d', bg2:'#0d1e12', bg3:'#132816', bg4:'#1d361f',
        text:'#fbfff9', dim:'#d8ead7', faint:'#9bb59e',
        accent:'#d84a52', accentDim:'#8d2430', accentBright:'#f2c66d',
        accentRgb:'216,74,82', accent2Rgb:'46,168,95',
        pageBg:'radial-gradient(circle at 16% 14%, rgba(216,74,82,.16), transparent 22rem),radial-gradient(circle at 84% 18%, rgba(242,198,109,.12), transparent 20rem),radial-gradient(circle at 74% 82%, rgba(46,168,95,.12), transparent 24rem),linear-gradient(180deg,#08140d 0%,#102016 50%,#050b08 100%)'
      }
    },
    aquaris: {
      id:'aquaris', label:'Aquaris — Royaume englouti', cls:'theme-aquaris', rarity:'Premium', category:'Rares',
      tagline:'Royaume englouti, cyan abyssal et or ancien.',
      desc:'Palais noyés, lumière abyssale, cyan profond et or ancien.',
      signature:'Royaume englouti',
      colors:['#011018','#48d6ef','#e5c878'],
      tone:'dark',
      vars:{
        bg:'#011018', bg2:'#041a24', bg3:'#082b37', bg4:'#0d3f4e',
        text:'#f0fcff', dim:'#c8e8ef', faint:'#8fb6c0',
        accent:'#48d6ef', accentDim:'#15849a', accentBright:'#e5c878',
        accentRgb:'72,214,239', accent2Rgb:'229,200,120',
        pageBg:'repeating-linear-gradient(106deg,rgba(130,238,255,.055) 0 2px,transparent 2px 34px),radial-gradient(ellipse 780px 260px at 50% -8%, rgba(177,249,255,.16), transparent 72%),radial-gradient(circle at 15% 18%, rgba(72,214,239,.16), transparent 27rem),radial-gradient(circle at 84% 82%, rgba(229,200,120,.10), transparent 27rem),linear-gradient(180deg,#011018 0%,#062431 46%,#02090f 100%)'
      }
    },
    bloodmoon: {
      id:'bloodmoon', label:'BloodMoon', cls:'theme-bloodmoon', rarity:'Mythique', category:'Rares',
      tagline:'Lune rouge souveraine et tension rituelle.',
      desc:'Noir rituel, lune carmine, menace souveraine et éclat cramoisi.',
      signature:'Lune de sang',
      colors:['#050102','#e3133f','#f0c76f'],
      tone:'dark',
      vars:{
        bg:'#050102', bg2:'#0c0305', bg3:'#17060a', bg4:'#260912',
        text:'#fff6f3', dim:'#f0c4bd', faint:'#b07d82',
        accent:'#e3133f', accentDim:'#76061f', accentBright:'#ff7d92',
        accentRgb:'227,19,63', accent2Rgb:'240,199,111',
        pageBg:'radial-gradient(circle at 82% 12%, rgba(255,226,210,.98) 0 1rem, rgba(227,19,63,.98) 1.05rem 5.1rem, rgba(95,4,22,.62) 5.2rem 8.2rem, transparent 8.4rem),radial-gradient(circle at 18% 78%, rgba(227,19,63,.18), transparent 26rem),radial-gradient(circle at 74% 74%, rgba(240,199,111,.08), transparent 22rem),linear-gradient(180deg,#050102 0%,#120407 52%,#020101 100%)'
      }
    }
  };

  var ORDER = ['dark','light','violet','red','green','easter','halloween','noel','aquaris','bloodmoon'];
  var RARITY_ORDER = { 'Base':0, 'Classique':1, 'Saisonnier':2, 'Premium':3, 'Mythique':4 };

  var CSS = `
/* === Nuages Polaires Theme Engine v257 === */
html[data-theme-engine="v257"], body[data-theme-engine="v257"]{min-height:100%;}
body[data-theme-engine="v257"]{
  --tm-bg:#0d0e18;--tm-bg2:#141725;--tm-bg3:#1b2033;--tm-bg4:#232b43;
  --tm-text:#f5f7fb;--tm-text-soft:rgba(245,247,251,.86);--tm-text-muted:rgba(199,212,223,.72);
  --tm-dim:#c7d4df;--tm-faint:#8c9aaa;
  --tm-accent:#7eb8d4;--tm-accent-dim:#477f9c;--tm-accent-bright:#c9a84c;
  --tm-accent-rgb:126,184,212;--tm-accent-2-rgb:201,168,76;
  --tm-border:rgba(126,184,212,.17);--tm-border-strong:rgba(201,168,76,.20);
  --tm-card-bg:linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.018)),rgba(14,18,31,.78);
  --tm-card-bg-strong:linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.024)),rgba(18,24,40,.84);
  --tm-control-bg:linear-gradient(180deg,rgba(255,255,255,.065),rgba(255,255,255,.020)),rgba(16,22,36,.75);
  --tm-control-bg-hover:linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.032)),rgba(20,28,46,.82);
  --tm-input-bg:rgba(8,12,22,.62);
  --tm-shadow:0 22px 46px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.04);
  --tm-shadow-soft:0 12px 28px rgba(0,0,0,.20), inset 0 1px 0 rgba(255,255,255,.035);
  --tm-primary-text:#071019;
  --tm-page-bg:radial-gradient(circle at 18% 12%, rgba(126,184,212,.13), transparent 24rem),radial-gradient(circle at 82% 82%, rgba(201,168,76,.09), transparent 26rem),linear-gradient(180deg,#0d0e18 0%,#141725 52%,#080a12 100%);
  color:var(--tm-text) !important;
  background:var(--tm-page-bg) !important;
  isolation:isolate;
}
html[data-theme-engine="v257"]{background:var(--tm-page-bg) !important;}
body[data-theme-engine="v257"] #s-app{isolation:isolate;}
body[data-theme-engine="v257"] .np-wrap,
body[data-theme-engine="v257"] .app-header,
body[data-theme-engine="v257"] #s-app,
body[data-theme-engine="v257"] #app-root,
body[data-theme-engine="v257"] .app-body,
body[data-theme-engine="v257"] .screen,
body[data-theme-engine="v257"] .tab-content,
body[data-theme-engine="v257"] #s-app > *{position:relative;z-index:1;}
body[data-theme-engine="v257"] :where(.app-header,#mobile-drawer > div:first-child,.nav-dropdown-menu,.nav-group-menu,.account-dd,.branch-dd,.menu,.card,.panel,.staff-panel,.modal,.login-card,.tab-content.tab-popup-active,.collection-card,.db-card,.settings-pane,.ev-card,.bcrd,.prog-panel,.role-opt.staff-card,.branch-modal-shell,.summary-card,.home-counter,.home-footer-item,.archive-card,.history-card,.sim-panel,.sim-fighter-card,.sim-log,.sim-history,.sim-notif,.sim-side,.theme-card-premium,.theme-preview-mini,.bfilt,.collection-chip,.chip,.plvl,.theme-event-badge,.nav-badge,.collection-counter,.arc-pill,.arc-summary-chip,.arc-summary-count,.db-theme-admin-item){
  color:var(--tm-text) !important;
  background:var(--tm-card-bg) !important;
  border-color:var(--tm-border) !important;
  box-shadow:var(--tm-shadow-soft);
}
body[data-theme-engine="v257"] :where(.card:hover,.panel:hover,.theme-card-premium:hover,.collection-card:hover,.db-theme-admin-item:hover){
  border-color:var(--tm-border-strong) !important;
}
body[data-theme-engine="v257"] :where(.title,h1,h2,h3,h4,.card-title,.section-title,.theme-title,.collection-section-title){
  color:var(--tm-text) !important;
}
body[data-theme-engine="v257"] :where(.sub,.desc,.tagline,.muted,.hint,.small,.theme-preview-foot){
  color:var(--tm-text-muted) !important;
}
body[data-theme-engine="v257"] :where(input,select,textarea){
  background:var(--tm-input-bg) !important;
  color:var(--tm-text) !important;
  border-color:var(--tm-border) !important;
}
body[data-theme-engine="v257"] :where(input::placeholder,textarea::placeholder){color:var(--tm-text-muted) !important;}
body[data-theme-engine="v257"] :where(.btn,button,.nav-link,.nav-btn,.chip,.bfilt,.collection-chip,.theme-chip){
  color:var(--tm-text) !important;
  background:var(--tm-control-bg) !important;
  border-color:var(--tm-border) !important;
}
body[data-theme-engine="v257"] :where(.btn:hover,button:hover,.nav-link:hover,.nav-btn:hover,.chip:hover,.bfilt:hover,.collection-chip:hover,.theme-chip:hover){
  background:var(--tm-control-bg-hover) !important;
  border-color:var(--tm-border-strong) !important;
}
body[data-theme-engine="v257"] :where(.btn.primary,.btn-primary,.btn-main,.home-btn-primary,.home-btn.primary,.cta,.cta-primary,[data-primary="true"],button.primary){
  background:linear-gradient(135deg,var(--tm-accent),var(--tm-accent-bright)) !important;
  color:var(--tm-primary-text) !important;
  border-color:rgba(255,255,255,.20) !important;
  font-weight:850 !important;
  box-shadow:0 14px 30px rgba(var(--tm-accent-rgb),.18), inset 0 1px 0 rgba(255,255,255,.18) !important;
}
body[data-theme-engine="v257"] a{color:var(--tm-accent) !important;}
body[data-theme-engine="v257"][data-theme-active="light"],
body[data-theme-engine="v257"].light{
  color-scheme:light;
  --tm-primary-text:#071019;
  --tm-card-bg:linear-gradient(180deg,rgba(255,255,255,.98),rgba(246,250,255,.92)),rgba(58,143,186,.045);
  --tm-card-bg-strong:linear-gradient(180deg,rgba(255,255,255,1),rgba(241,247,253,.96)),rgba(58,143,186,.065);
  --tm-control-bg:linear-gradient(180deg,rgba(255,255,255,.97),rgba(237,245,252,.88)),rgba(58,143,186,.055);
  --tm-control-bg-hover:linear-gradient(180deg,rgba(255,255,255,1),rgba(229,241,251,.94)),rgba(58,143,186,.085);
  --tm-input-bg:linear-gradient(180deg,rgba(255,255,255,1),rgba(247,251,255,.96));
  --tm-shadow:0 20px 42px rgba(31,57,88,.11), inset 0 1px 0 rgba(255,255,255,.78);
  --tm-shadow-soft:0 12px 28px rgba(31,57,88,.09), inset 0 1px 0 rgba(255,255,255,.72);
  --np-ui-text:var(--tm-text);
  --np-ui-text-soft:var(--tm-text-soft);
  --np-ui-muted:var(--tm-text-muted);
  --np-ui-panel-surface:var(--tm-card-bg);
  --np-ui-button-bg:var(--tm-control-bg);
  --np-ui-button-hover:var(--tm-control-bg-hover);
  --np-ui-input-bg:var(--tm-input-bg);
}
body[data-theme-engine="v257"][data-theme-active="light"] :where(.card,.panel,.staff-panel,.modal,.login-card,.tab-content.tab-popup-active,.collection-card,.db-card,.settings-pane,.ev-card,.bcrd,.prog-panel,.role-opt.staff-card,.branch-modal-shell,.summary-card,.home-counter,.home-footer-item,.archive-card,.history-card,.sim-panel,.sim-fighter-card,.sim-log,.sim-history,.sim-notif,.sim-side,.theme-card-premium,.theme-preview-mini,.warnbox,.empty-state,.home-footer,.journal-entry,.activity-item,.collection-section,.arc-results,.arc-detail,.arc-card,.arc-detail-card,.arc-metric,.arc-roster-row,.arc-log-row),
body[data-theme-engine="v257"].light :where(.card,.panel,.staff-panel,.modal,.login-card,.tab-content.tab-popup-active,.collection-card,.db-card,.settings-pane,.ev-card,.bcrd,.prog-panel,.role-opt.staff-card,.branch-modal-shell,.summary-card,.home-counter,.home-footer-item,.archive-card,.history-card,.sim-panel,.sim-fighter-card,.sim-log,.sim-history,.sim-notif,.sim-side,.theme-card-premium,.theme-preview-mini,.warnbox,.empty-state,.home-footer,.journal-entry,.activity-item,.collection-section,.arc-results,.arc-detail,.arc-card,.arc-detail-card,.arc-metric,.arc-roster-row,.arc-log-row){
  background:var(--tm-card-bg) !important;
  color:var(--tm-text) !important;
  border-color:var(--tm-border) !important;
  box-shadow:var(--tm-shadow-soft) !important;
}
body[data-theme-engine="v257"][data-theme-active="light"] :where(.app-header,#mobile-drawer > div:first-child,.nav-group-menu,.nav-dropdown-menu,.tab-content.tab-popup-active,.nav-dd,.nav-dropdown,.menu,.account-dd,.branch-dd),
body[data-theme-engine="v257"].light :where(.app-header,#mobile-drawer > div:first-child,.nav-group-menu,.nav-dropdown-menu,.tab-content.tab-popup-active,.nav-dd,.nav-dropdown,.menu,.account-dd,.branch-dd){
  background:var(--tm-card-bg-strong) !important;
  color:var(--tm-text) !important;
  border-color:var(--tm-border) !important;
  box-shadow:0 18px 42px rgba(31,57,88,.12), inset 0 1px 0 rgba(255,255,255,.78) !important;
}
body[data-theme-engine="v257"][data-theme-active="light"] :where(.btn,.btn-out,.mini-btn,.gem-btn,.gem-qty-btn,.home-btn,.tab-btn,.ltab-btn,.settings-tab,.collection-chip,.quick-link,.bfilt,.nav-item,.nav-dropdown-item,.nav-group-btn,.nav-dropdown-btn,.spw-btn,.theme-vis-btn,.hdr-profile,.hdr-settings,#notif-bell,.theme-preview-chip,.drawer-item,.drawer-close,.mclose,.tab-popup-close,.theme-chip),
body[data-theme-engine="v257"].light :where(.btn,.btn-out,.mini-btn,.gem-btn,.gem-qty-btn,.home-btn,.tab-btn,.ltab-btn,.settings-tab,.collection-chip,.quick-link,.bfilt,.nav-item,.nav-dropdown-item,.nav-group-btn,.nav-dropdown-btn,.spw-btn,.theme-vis-btn,.hdr-profile,.hdr-settings,#notif-bell,.theme-preview-chip,.drawer-item,.drawer-close,.mclose,.tab-popup-close,.theme-chip){
  background:var(--tm-control-bg) !important;
  color:var(--tm-text) !important;
  border-color:var(--tm-border) !important;
  box-shadow:0 8px 18px rgba(31,57,88,.08) !important;
}
body[data-theme-engine="v257"][data-theme-active="light"] :where(.btn:hover,.btn-out:hover,.mini-btn:hover,.gem-btn:hover,.gem-qty-btn:hover,.home-btn:hover,.tab-btn:hover,.ltab-btn:hover,.settings-tab:hover,.collection-chip:hover,.quick-link:hover,.bfilt:hover,.nav-item:hover,.nav-dropdown-item:hover,.nav-group-btn:hover,.nav-dropdown-btn:hover,.spw-btn:hover,.theme-vis-btn:hover,.hdr-profile:hover,.hdr-settings:hover,#notif-bell:hover,.drawer-item:hover,.drawer-close:hover,.mclose:hover,.tab-popup-close:hover,.theme-chip:hover,.btn.active,.tab-btn.active,.ltab-btn.active,.settings-tab.active,.bfilt.active,.nav-item.active,.nav-dropdown-item.active,.nav-group-btn.has-active,.nav-dropdown-btn.has-active,.drawer-item.active),
body[data-theme-engine="v257"].light :where(.btn:hover,.btn-out:hover,.mini-btn:hover,.gem-btn:hover,.gem-qty-btn:hover,.home-btn:hover,.tab-btn:hover,.ltab-btn:hover,.settings-tab:hover,.collection-chip:hover,.quick-link:hover,.bfilt:hover,.nav-item:hover,.nav-dropdown-item:hover,.nav-group-btn:hover,.nav-dropdown-btn:hover,.spw-btn:hover,.theme-vis-btn:hover,.hdr-profile:hover,.hdr-settings:hover,#notif-bell:hover,.drawer-item:hover,.drawer-close:hover,.mclose:hover,.tab-popup-close:hover,.theme-chip:hover,.btn.active,.tab-btn.active,.ltab-btn.active,.settings-tab.active,.bfilt.active,.nav-item.active,.nav-dropdown-item.active,.nav-group-btn.has-active,.nav-dropdown-btn.has-active,.drawer-item.active){
  background:var(--tm-control-bg-hover) !important;
  color:var(--tm-text) !important;
  border-color:var(--tm-border-strong) !important;
}
body[data-theme-engine="v257"][data-theme-active="light"] :where(input,select,textarea,.inp,.search-input,.sim-search-input),
body[data-theme-engine="v257"].light :where(input,select,textarea,.inp,.search-input,.sim-search-input){
  background:var(--tm-input-bg) !important;
  color:var(--tm-text) !important;
  border-color:var(--tm-border) !important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.82) !important;
}
body[data-theme-engine="v257"][data-theme-active="light"] :where(.sub,.desc,.tagline,.muted,.hint,.small,.empty-state-sub,.field label,.dim,.faint,.meta,.help,.helper,.subtle,.soft,.legend,.sim-hud-sub,.sim-hud-k,.home-sub,.home-footer-lbl,.spw-sub,.spw-note,.spw-mini,.spw-lines,.quote,.rsec p,.rsec ul,.rsec li,.nav-group-label,.nav-section-label,.nav-section-header,.hdr-user,#hdr-av-txt,.hdr-badge,.card-subtitle,.card-meta,.stat-label),
body[data-theme-engine="v257"].light :where(.sub,.desc,.tagline,.muted,.hint,.small,.empty-state-sub,.field label,.dim,.faint,.meta,.help,.helper,.subtle,.soft,.legend,.sim-hud-sub,.sim-hud-k,.home-sub,.home-footer-lbl,.spw-sub,.spw-note,.spw-mini,.spw-lines,.quote,.rsec p,.rsec ul,.rsec li,.nav-group-label,.nav-section-label,.nav-section-header,.hdr-user,#hdr-av-txt,.hdr-badge,.card-subtitle,.card-meta,.stat-label){
  color:var(--tm-text-muted) !important;
}
body[data-theme-engine="v257"][data-theme-active="light"] [style*="background:rgba(7,8,16"],
body[data-theme-engine="v257"][data-theme-active="light"] [style*="background: rgba(7,8,16"],
body[data-theme-engine="v257"][data-theme-active="light"] [style*="background:rgba(5,8,14"],
body[data-theme-engine="v257"][data-theme-active="light"] [style*="background: rgba(5,8,14"],
body[data-theme-engine="v257"][data-theme-active="light"] [style*="background:rgba(6,8,16"],
body[data-theme-engine="v257"][data-theme-active="light"] [style*="background: rgba(6,8,16"],
body[data-theme-engine="v257"][data-theme-active="light"] [style*="background:rgba(9,18,38"],
body[data-theme-engine="v257"][data-theme-active="light"] [style*="background: rgba(9,18,38"],
body[data-theme-engine="v257"][data-theme-active="light"] [style*="background:linear-gradient(160deg,#0c0e1c,#090a12)"],
body[data-theme-engine="v257"][data-theme-active="light"] [style*="background:linear-gradient(180deg,rgba(10,18,38"],
body[data-theme-engine="v257"].light [style*="background:rgba(7,8,16"],
body[data-theme-engine="v257"].light [style*="background: rgba(7,8,16"],
body[data-theme-engine="v257"].light [style*="background:rgba(5,8,14"],
body[data-theme-engine="v257"].light [style*="background: rgba(5,8,14"],
body[data-theme-engine="v257"].light [style*="background:rgba(6,8,16"],
body[data-theme-engine="v257"].light [style*="background: rgba(6,8,16"],
body[data-theme-engine="v257"].light [style*="background:rgba(9,18,38"],
body[data-theme-engine="v257"].light [style*="background: rgba(9,18,38"],
body[data-theme-engine="v257"].light [style*="background:linear-gradient(160deg,#0c0e1c,#090a12)"],
body[data-theme-engine="v257"].light [style*="background:linear-gradient(180deg,rgba(10,18,38"]{
  background:var(--tm-card-bg) !important;
  color:var(--tm-text) !important;
  border-color:var(--tm-border) !important;
}
body[data-theme-engine="v257"].theme-easter a{color:#b74d88 !important;}
body[data-theme-engine="v257"].theme-easter{
  color-scheme:light;
  --tm-primary-text:#17311d;
  --tm-card-bg:linear-gradient(180deg,rgba(255,255,255,.90),rgba(255,255,255,.74)),linear-gradient(135deg,rgba(127,220,130,.12),rgba(255,216,107,.10) 46%,rgba(255,182,216,.11));
  --tm-card-bg-strong:linear-gradient(180deg,rgba(255,255,255,.95),rgba(255,255,255,.82)),linear-gradient(135deg,rgba(127,220,130,.18),rgba(255,216,107,.13) 46%,rgba(255,182,216,.14));
  --tm-control-bg:linear-gradient(180deg,rgba(255,255,255,.86),rgba(255,255,255,.68)),linear-gradient(135deg,rgba(127,220,130,.18),rgba(255,216,107,.16),rgba(255,182,216,.18));
  --tm-control-bg-hover:linear-gradient(180deg,rgba(255,255,255,.96),rgba(255,255,255,.78)),linear-gradient(135deg,rgba(127,220,130,.28),rgba(255,216,107,.22),rgba(255,182,216,.26));
  --tm-input-bg:linear-gradient(180deg,rgba(255,255,255,.92),rgba(255,255,255,.75)),rgba(243,251,239,.92);
  --tm-shadow:0 22px 44px rgba(80,120,84,.14), inset 0 1px 0 rgba(255,255,255,.66);
  --tm-shadow-soft:0 14px 28px rgba(80,120,84,.12), inset 0 1px 0 rgba(255,255,255,.55);
}
body[data-theme-engine="v257"].theme-easter :where(.btn.primary,.btn-primary,.btn-main,.home-btn-primary,.home-btn.primary,.cta,.cta-primary,[data-primary="true"],button.primary){
  background:linear-gradient(135deg,#7fdc82,#ffd86b 62%,#ffb6d8) !important;
  color:#17311d !important;
}
body[data-theme-engine="v257"].theme-noel :where(.btn.primary,.btn-primary,.btn-main,.home-btn-primary,.home-btn.primary,.cta,.cta-primary,[data-primary="true"],button.primary){
  background:linear-gradient(135deg,#d84a52,#2ea85f 68%,#f2c66d) !important;
  color:#fefcf7 !important;
}
body[data-theme-engine="v257"].theme-halloween :where(.btn.primary,.btn-primary,.btn-main,.home-btn-primary,.home-btn.primary,.cta,.cta-primary,[data-primary="true"],button.primary){
  background:linear-gradient(135deg,#ff8f2b,#7c59ff 70%,#d8d2ff) !important;
  color:#150d17 !important;
}
body[data-theme-engine="v257"].theme-aquaris :where(.btn.primary,.btn-primary,.btn-main,.home-btn-primary,.home-btn.primary,.cta,.cta-primary,[data-primary="true"],button.primary){
  background:linear-gradient(135deg,#0a7084,#48d6ef 52%,#8ef4ff 74%,#e5c878) !important;
  color:#031018 !important;
}
body[data-theme-engine="v257"].theme-bloodmoon :where(.btn.primary,.btn-primary,.btn-main,.home-btn-primary,.home-btn.primary,.cta,.cta-primary,[data-primary="true"],button.primary){
  background:linear-gradient(135deg,#71051e,#e3133f 55%,#ff7d92 80%,#f0c76f) !important;
  color:#fff7f2 !important;
}

/* Ambient overlays */
body[data-theme-engine="v257"].theme-easter::before,
body[data-theme-engine="v257"].theme-easter::after,
body[data-theme-engine="v257"].theme-aquaris::before,
body[data-theme-engine="v257"].theme-aquaris::after,
body[data-theme-engine="v257"].theme-bloodmoon::before,
body[data-theme-engine="v257"].theme-bloodmoon::after,
body[data-theme-engine="v257"].theme-noel::after{
  content:"";
  position:fixed;
  pointer-events:none;
  display:block;
}
body[data-theme-engine="v257"].theme-easter::before{
  inset:0;
  z-index:0;
  background:radial-gradient(circle at 8% 16%,rgba(255,216,107,.36),transparent 14rem),radial-gradient(circle at 86% 18%,rgba(255,182,216,.28),transparent 14rem),radial-gradient(circle at 28% 72%,rgba(142,197,255,.18),transparent 16rem);
}
body[data-theme-engine="v257"].theme-easter::after{
  left:0;right:0;bottom:0;height:132px;z-index:0;
  background:linear-gradient(180deg,rgba(223,242,213,0),rgba(171,224,153,.35) 42%,rgba(112,185,93,.54) 100%);
}
body[data-theme-engine="v257"].theme-aquaris::before{
  inset:0;z-index:-1;
  background:linear-gradient(180deg,rgba(215,252,255,.10),transparent 18%,transparent 70%,rgba(0,0,0,.30) 100%);
  mix-blend-mode:normal;opacity:.48;
}
body[data-theme-engine="v257"].theme-aquaris::after{
  left:0;right:0;bottom:0;height:260px;z-index:-1;
  background:linear-gradient(180deg,rgba(1,16,24,0),rgba(0,8,12,.32) 26%,rgba(0,5,8,.78) 100%),radial-gradient(ellipse at 50% 100%,rgba(72,214,239,.12),transparent 68%);
}
body[data-theme-engine="v257"].theme-bloodmoon::before{
  inset:0;z-index:0;
  background:radial-gradient(circle at 82% 12%,rgba(255,125,146,.20),transparent 13rem),radial-gradient(circle at 12% 22%,rgba(227,19,63,.10),transparent 20rem),linear-gradient(180deg,rgba(255,255,255,.025),transparent 18%);
}
body[data-theme-engine="v257"].theme-bloodmoon::after{
  inset:0;z-index:0;
  background:linear-gradient(180deg,transparent 0%,rgba(5,1,2,.18) 56%,rgba(5,1,2,.66) 100%),repeating-linear-gradient(90deg,transparent 0 88px,rgba(255,255,255,.018) 88px 90px,transparent 90px 100%);
  opacity:.34;mix-blend-mode:screen;
}
body[data-theme-engine="v257"].theme-noel::after{
  inset:0;z-index:0;
  background-image:radial-gradient(circle 2px,rgba(255,255,255,.85) 98%,transparent),radial-gradient(circle 2px,rgba(255,255,255,.68) 98%,transparent),radial-gradient(circle 2px,rgba(255,255,255,.58) 98%,transparent);
  background-size:140px 140px,180px 180px,220px 220px;
  background-position:0 0,60px 30px,30px 80px;
  opacity:.30;
}

/* Theme cards and previews */
body[data-theme-engine="v257"] :where(.theme-grid,.themes-grid,.collection-grid,.premium-theme-grid,.theme-collection-grid){
  display:grid !important;
  grid-template-columns:repeat(auto-fill,minmax(260px,1fr)) !important;
  gap:16px !important;
  align-items:stretch !important;
}
body[data-theme-engine="v257"] :where(.theme-card-premium,.collection-card,.db-theme-admin-item){
  position:relative !important;
  overflow:hidden !important;
  border-radius:22px !important;
  padding:16px !important;
  display:flex !important;
  flex-direction:column !important;
  gap:12px !important;
  min-height:100% !important;
  transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease !important;
}
body[data-theme-engine="v257"] :where(.theme-card-premium,.collection-card):hover{
  transform:translateY(-3px) !important;
  box-shadow:0 22px 48px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.05) !important;
}
body[data-theme-engine="v257"] .theme-card-premium > *,
body[data-theme-engine="v257"] .collection-card > *,
body[data-theme-engine="v257"] .db-theme-admin-item > *{position:relative;z-index:1;}
body[data-theme-engine="v257"] .theme-topline{
  display:flex !important;
  align-items:center !important;
  justify-content:space-between !important;
  min-height:22px !important;
}
body[data-theme-engine="v257"] .theme-topline::before{
  content:attr(data-theme-eyebrow);
  display:inline-flex;align-items:center;
  padding:5px 10px;border-radius:999px;
  font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;
  background:linear-gradient(90deg,rgba(var(--tm-accent-rgb),.16),rgba(var(--tm-accent-2-rgb),.10));
  border:1px solid rgba(255,255,255,.08);
  color:var(--tm-text);
}
body[data-theme-engine="v257"] .theme-preview-mini{
  min-height:126px !important;
  border-radius:18px !important;
  padding:12px !important;
  overflow:hidden !important;
  background:linear-gradient(145deg,var(--preview-bg,#0d0e18),var(--preview-bg2,#151a2a)) !important;
  border:1px solid rgba(255,255,255,.06) !important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 12px 28px rgba(0,0,0,.18) !important;
}
body[data-theme-engine="v257"] .theme-preview-head{height:15px !important;border-radius:999px !important;background:linear-gradient(90deg,var(--preview-a,#7eb8d4),var(--preview-c,#c9a84c)) !important;opacity:.92;}
body[data-theme-engine="v257"] .theme-preview-bar{height:9px !important;border-radius:999px !important;background:linear-gradient(90deg,var(--preview-a,#7eb8d4),var(--preview-b,#c9a84c),var(--preview-c,#ffffff)) !important;}
body[data-theme-engine="v257"] .theme-preview-cards{display:grid !important;grid-template-columns:repeat(3,1fr) !important;gap:8px !important;margin:12px 0 !important;}
body[data-theme-engine="v257"] .theme-preview-cards span{height:34px !important;border-radius:12px !important;background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.04)),rgba(255,255,255,.08) !important;}
body[data-theme-engine="v257"] .theme-preview-mini.easter{--preview-bg:#f7fff2;--preview-bg2:#e7f8de;--preview-a:#7fdc82;--preview-b:#ffd86b;--preview-c:#ffb6d8;color:#213326 !important;}
body[data-theme-engine="v257"] .theme-preview-mini.halloween{--preview-bg:#0a0911;--preview-bg2:#16111f;--preview-a:#ff8f2b;--preview-b:#7c59ff;--preview-c:#d8d2ff;}
body[data-theme-engine="v257"] .theme-preview-mini.noel{--preview-bg:#08140d;--preview-bg2:#122219;--preview-a:#d84a52;--preview-b:#2ea85f;--preview-c:#f2c66d;}
body[data-theme-engine="v257"] .theme-preview-mini.aquaris{--preview-bg:#011018;--preview-bg2:#0b3442;--preview-a:#48d6ef;--preview-b:#8ef4ff;--preview-c:#e5c878;background:radial-gradient(circle at 84% 12%,rgba(229,200,120,.20),transparent 26%),radial-gradient(circle at 12% 86%,rgba(72,214,239,.20),transparent 30%),repeating-linear-gradient(106deg,rgba(130,238,255,.08) 0 2px,transparent 2px 24px),linear-gradient(145deg,#011018,#0b3442) !important;}
body[data-theme-engine="v257"] .theme-preview-mini.bloodmoon{--preview-bg:#050102;--preview-bg2:#210812;--preview-a:#e3133f;--preview-b:#ff7d92;--preview-c:#f0c76f;background:radial-gradient(circle at 84% 12%,rgba(227,19,63,.30),transparent 27%),radial-gradient(circle at 18% 86%,rgba(240,199,111,.10),transparent 26%),linear-gradient(145deg,#050102,#210812) !important;}
body[data-theme-engine="v257"] [data-theme-id="aquaris"]{border-color:rgba(72,214,239,.28) !important;box-shadow:0 22px 52px rgba(0,7,12,.28),0 0 0 1px rgba(229,200,120,.08) inset !important;}
body[data-theme-engine="v257"] [data-theme-id="bloodmoon"]{border-color:rgba(227,19,63,.34) !important;box-shadow:0 22px 52px rgba(0,0,0,.34),0 0 0 1px rgba(240,199,111,.08) inset !important;}
body[data-theme-engine="v257"] .theme-meta-row{display:flex !important;flex-wrap:wrap !important;gap:8px !important;margin-top:auto !important;}
body[data-theme-engine="v257"] .theme-meta-pill,
body[data-theme-engine="v257"] .theme-rare-signature{
  display:inline-flex;align-items:center;justify-content:center;
  min-height:24px;padding:0 10px;border-radius:999px;
  font-size:11px;font-weight:850;border:1px solid rgba(255,255,255,.08);
  background:linear-gradient(90deg,rgba(var(--tm-accent-rgb),.14),rgba(255,255,255,.04));
}
body[data-theme-engine="v257"] [data-theme-state="selected"]::after,
body[data-theme-engine="v257"] [data-theme-state="owned"]::after,
body[data-theme-engine="v257"] [data-theme-state="locked"]::after{
  position:absolute;top:12px;right:12px;z-index:3;
  padding:6px 10px;border-radius:999px;
  font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;
  box-shadow:0 10px 20px rgba(0,0,0,.18);
}
body[data-theme-engine="v257"] [data-theme-state="selected"]::after{content:"Équipé";background:linear-gradient(90deg,rgba(var(--tm-accent-rgb),.96),rgba(var(--tm-accent-2-rgb),.74));color:var(--tm-primary-text);}
body[data-theme-engine="v257"] [data-theme-state="owned"]::after{content:"Possédé";background:linear-gradient(90deg,rgba(98,214,134,.88),rgba(168,241,196,.68));color:#11321a;}
body[data-theme-engine="v257"] [data-theme-state="locked"]::after{content:"Indisponible";background:linear-gradient(90deg,rgba(95,104,116,.82),rgba(140,150,164,.58));color:#eef4ff;}

/* Collection UX */
body[data-theme-engine="v257"] .np-theme-hero,
body[data-theme-engine="v257"] .np-theme-toolbar,
body[data-theme-engine="v257"] .np-theme-empty{
  border-radius:24px !important;
  padding:16px !important;
  margin:0 0 16px !important;
  background:var(--tm-card-bg-strong) !important;
  border:1px solid var(--tm-border) !important;
  box-shadow:var(--tm-shadow-soft) !important;
}
body[data-theme-engine="v257"] .np-theme-hero-title{font-size:1.18rem;font-weight:900;margin:0 0 6px;color:var(--tm-text);}
body[data-theme-engine="v257"] .np-theme-hero-sub{margin:0;color:var(--tm-text-muted);line-height:1.55;}
body[data-theme-engine="v257"] .np-theme-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:16px;}
body[data-theme-engine="v257"] .np-theme-stat{padding:12px;border-radius:16px;background:var(--tm-card-bg);border:1px solid var(--tm-border);}
body[data-theme-engine="v257"] .np-theme-stat-value{font-size:1.1rem;font-weight:900;line-height:1;margin-bottom:6px;}
body[data-theme-engine="v257"] .np-theme-stat-label{font-size:.78rem;font-weight:750;color:var(--tm-text-muted);}
body[data-theme-engine="v257"] .np-theme-toolbar{display:flex !important;flex-wrap:wrap !important;gap:10px !important;align-items:center !important;}
body[data-theme-engine="v257"] .np-theme-search{flex:1 1 220px;min-height:42px;border-radius:14px;padding:0 12px;}
body[data-theme-engine="v257"] .np-theme-select{flex:0 1 180px;min-height:42px;border-radius:14px;padding:0 12px;}
body[data-theme-engine="v257"] .np-theme-filter-btn{min-height:38px;border-radius:999px;padding:0 12px;}
body[data-theme-engine="v257"] .np-theme-filter-btn.active{background:linear-gradient(90deg,rgba(var(--tm-accent-rgb),.22),rgba(var(--tm-accent-2-rgb),.12)) !important;border-color:var(--tm-border-strong) !important;}
body[data-theme-engine="v257"] .np-theme-count{font-weight:850;color:var(--tm-text-soft);margin-left:auto;}
body[data-theme-engine="v257"] .np-theme-empty{text-align:center;color:var(--tm-text-muted);}
body[data-theme-engine="v257"] .np-theme-hidden{display:none !important;}

/* Legacy blue cleanup: older screens still contain the base blue as literal rgba/# values. */
body[data-theme-engine="v257"]{
  scrollbar-color:rgba(var(--tm-accent-rgb),.24) transparent !important;
}
body[data-theme-engine="v257"]::after{
  background:radial-gradient(ellipse 60% 35% at 50% 0%,rgba(var(--tm-accent-rgb),.055),transparent 50%),radial-gradient(ellipse 30% 25% at 85% 100%,rgba(var(--tm-accent-rgb),.035),transparent 55%) !important;
}
body[data-theme-engine="v257"] :where(.login-card,.card,.modal,.tab-content.tab-popup-active,.app-header,.nav-group-menu,.nav-dropdown-menu,.branch-modal-hero,.home-horizon,.screen-bg)::before,
body[data-theme-engine="v257"] :where(.login-card,.card,.modal,.tab-content.tab-popup-active,.app-header,.nav-group-menu,.nav-dropdown-menu,.branch-modal-hero,.home-horizon,.screen-bg)::after{
  border-color:rgba(var(--tm-accent-rgb),.22) !important;
}
body[data-theme-engine="v257"] :where(.login-card,.card,.modal,.tab-content.tab-popup-active,.app-header)::before,
body[data-theme-engine="v257"] :where(.login-card,.card,.modal,.tab-content.tab-popup-active,.app-header)::after{
  background:linear-gradient(90deg,transparent,rgba(var(--tm-accent-rgb),.28),transparent) !important;
}
body[data-theme-engine="v257"] :where(.card-title,.nav-section-header,.mtit,.branch-modal-kicker,.sl-kicker){
  color:rgba(var(--tm-accent-rgb),.62) !important;
}
body[data-theme-engine="v257"] :where(.card-title)::before{
  background:rgba(var(--tm-accent-rgb),.58) !important;
}
body[data-theme-engine="v257"] ::selection{
  background:rgba(var(--tm-accent-rgb),.28) !important;
}
body[data-theme-engine="v257"] :where(input,select,textarea,.btn,.hdr-badge,.modal,.login-card,.card,.nav-dropdown-menu,.nav-group-menu,.tab-content.tab-popup-active){
  border-color:rgba(var(--tm-accent-rgb),.18) !important;
}
body[data-theme-engine="v257"] :where(input,select,textarea):focus,
body[data-theme-engine="v257"] :where(button,.btn):focus-visible{
  border-color:rgba(var(--tm-accent-rgb),.38) !important;
  box-shadow:0 0 0 2px rgba(var(--tm-accent-rgb),.09) !important;
}
body[data-theme-engine="v257"] :where(.bem,.bxp,.theme-preview-bar,.theme-preview-head){
  background:linear-gradient(90deg,rgba(var(--tm-accent-rgb),.38),rgba(var(--tm-accent-rgb),.90)) !important;
}
body[data-theme-engine="v257"] :where(.bem,.bxp)::after{
  background:var(--tm-accent) !important;
  box-shadow:0 0 6px var(--tm-accent) !important;
}
body[data-theme-engine="v257"] :where(svg [fill="#7eb8d4"],svg [fill="#4a88aa"]){
  fill:var(--tm-accent) !important;
}
body[data-theme-engine="v257"] :where(svg [stroke="#7eb8d4"],svg [stroke="#4a88aa"]){
  stroke:var(--tm-accent) !important;
}
body[data-theme-engine="v257"] :where(svg text[fill="#7eb8d4"],svg text[fill="#4a88aa"]){
  fill:var(--tm-accent) !important;
}
body[data-theme-engine="v257"] :where(.ezon:hover,.ezon.act){
  fill:rgba(var(--tm-accent-rgb),.18) !important;
  stroke:var(--tm-accent) !important;
}
body[data-theme-engine="v257"] :where(
  #bestiaire .beast-admin-detail,
  #bestiaire .beast-admin-hero-media,
  #bestiaire .beast-admin-detail-stat,
  #bestiaire .beast-admin-detail-block,
  #bestiaire .beast-admin-completeness span,
  #bestiaire .beast-admin-last-combats span,
  #bestiaire .beast-admin-card.is-selected,
  #p-apparitions-c .sl-card,
  #p-apparitions-c .sl-btn,
  #p-apparitions-c .sl-field input,
  #p-apparitions-c .sl-field select,
  .np-dashboard-console,
  .np-dashboard-card,
  .np-dashboard-panel,
  .np-dashboard-health,
  .np-dashboard-console-result
){
  border-color:rgba(var(--tm-accent-rgb),.18) !important;
}
body[data-theme-engine="v257"] #bestiaire .beast-admin-detail::before,
body[data-theme-engine="v257"] .np-dashboard-console::before,
body[data-theme-engine="v257"] .np-dashboard-card::before,
body[data-theme-engine="v257"] .np-dashboard-panel::before{
  background:radial-gradient(circle at top right,rgba(var(--tm-accent-rgb),.16),transparent 62%) !important;
}
body[data-theme-engine="v257"] :where(.ezon.has){
  fill:rgba(var(--tm-accent-rgb),.07) !important;
  stroke:var(--tm-accent-dim) !important;
}
body[data-theme-engine="v257"] :where(.ezon.has:hover,.ezon.has.act){
  fill:rgba(var(--tm-accent-rgb),.22) !important;
  stroke:var(--tm-accent) !important;
}
body[data-theme-engine="v257"] [style*="color:rgba(126,184,212"],
body[data-theme-engine="v257"] [style*="color: rgba(126,184,212"],
body[data-theme-engine="v257"] [style*="color:#7eb8d4"],
body[data-theme-engine="v257"] [style*="color: #7eb8d4"],
body[data-theme-engine="v257"] [style*="color:#4a88aa"],
body[data-theme-engine="v257"] [style*="color: #4a88aa"]{
  color:var(--tm-accent) !important;
}
body[data-theme-engine="v257"] [style*="border:1px solid rgba(126,184,212"],
body[data-theme-engine="v257"] [style*="border: 1px solid rgba(126,184,212"],
body[data-theme-engine="v257"] [style*="border:2px solid rgba(126,184,212"],
body[data-theme-engine="v257"] [style*="border: 2px solid rgba(126,184,212"],
body[data-theme-engine="v257"] [style*="border-color:rgba(126,184,212"],
body[data-theme-engine="v257"] [style*="border-color: rgba(126,184,212"],
body[data-theme-engine="v257"] [style*="border-left:3px solid rgba(126,184,212"],
body[data-theme-engine="v257"] [style*="border-left: 3px solid rgba(126,184,212"],
body[data-theme-engine="v257"] [style*="border:1px solid #7eb8d4"],
body[data-theme-engine="v257"] [style*="border: 1px solid #7eb8d4"],
body[data-theme-engine="v257"] [style*="border-color:#7eb8d4"],
body[data-theme-engine="v257"] [style*="border-color: #7eb8d4"]{
  border-color:rgba(var(--tm-accent-rgb),.28) !important;
}
body[data-theme-engine="v257"] [style*="border-bottom:1px solid rgba(126,184,212"],
body[data-theme-engine="v257"] [style*="border-bottom: 1px solid rgba(126,184,212"]{
  border-bottom-color:rgba(var(--tm-accent-rgb),.24) !important;
}
body[data-theme-engine="v257"] [style*="background:rgba(126,184,212"],
body[data-theme-engine="v257"] [style*="background: rgba(126,184,212"]{
  background:rgba(var(--tm-accent-rgb),.10) !important;
}
body[data-theme-engine="v257"] [style*="background:linear-gradient"][style*="126,184,212"],
body[data-theme-engine="v257"] [style*="background: linear-gradient"][style*="126,184,212"]{
  background:linear-gradient(90deg,rgba(var(--tm-accent-rgb),.16),rgba(var(--tm-accent-rgb),.08)) !important;
}
body[data-theme-engine="v257"] [style*="box-shadow"][style*="126,184,212"]{
  box-shadow:0 0 0 1px rgba(var(--tm-accent-rgb),.12) inset,0 12px 26px rgba(0,0,0,.18) !important;
}

@media (max-width:900px){body[data-theme-engine="v257"] .np-theme-stats{grid-template-columns:repeat(2,minmax(0,1fr));}}
@media (max-width:700px){
  body[data-theme-engine="v257"] :where(.theme-grid,.themes-grid,.collection-grid,.premium-theme-grid,.theme-collection-grid){grid-template-columns:1fr !important;}
  body[data-theme-engine="v257"] .np-theme-stats{grid-template-columns:1fr;}
  body[data-theme-engine="v257"] .np-theme-select{flex:1 1 100%;}
}
@media (prefers-reduced-motion:reduce){
  body[data-theme-engine="v257"] *{transition:none !important;animation:none !important;}
}
  `;

  function normalize(id){
    try{ if(typeof window.normalizeThemeId === 'function' && window.normalizeThemeId !== normalize) return window.normalizeThemeId(id); }catch(e){}
    id = String(id || '').trim().toLowerCase();
    if(!id || id === 'theme-default' || id === 'default') return 'dark';
    if(id.indexOf('theme-') === 0) id = id.replace(/^theme-/, '');
    if(id === 'aquarius') id = 'aquaris';
    if(id === 'blood-moon' || id === 'lune-de-sang') id = 'bloodmoon';
    return id;
  }

  function cfg(id){ return CONFIG[normalize(id)] || CONFIG.dark; }

  function injectCss(){
    var old = document.getElementById(STYLE_ID);
    if(old) old.remove();
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  function activeTheme(){
    if(!document.body) return 'dark';
    var cls = Array.prototype.slice.call(document.body.classList || []);
    for(var i=0;i<cls.length;i++){
      if(cls[i] === 'light') return 'light';
      if(cls[i].indexOf('theme-') === 0) return normalize(cls[i]);
    }
    return 'dark';
  }

  function applyVars(id){
    if(!document.body) return;
    var c = cfg(id), v = c.vars || CONFIG.dark.vars;
    var root = document.body.style;
    var textSoft = c.tone === 'light' ? 'rgba(32,50,39,.86)' : 'rgba(245,247,251,.86)';
    var textMuted = c.tone === 'light' ? 'rgba(65,92,77,.72)' : 'rgba(199,212,223,.72)';
    var panelBase = c.tone === 'light'
      ? 'linear-gradient(180deg,rgba(255,255,255,.92),rgba(255,255,255,.74)),rgba(' + v.accentRgb + ',.045)'
      : 'linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.014)),linear-gradient(180deg,' + v.bg2 + ',' + v.bg + ')';
    var panelStrong = c.tone === 'light'
      ? 'linear-gradient(180deg,rgba(255,255,255,.98),rgba(255,255,255,.82)),rgba(' + v.accentRgb + ',.070)'
      : 'linear-gradient(180deg,rgba(255,255,255,.060),rgba(255,255,255,.018)),linear-gradient(180deg,' + v.bg3 + ',' + v.bg2 + ')';
    var controlBase = c.tone === 'light'
      ? 'linear-gradient(180deg,rgba(255,255,255,.97),rgba(237,245,252,.88)),rgba(' + v.accentRgb + ',.055)'
      : 'linear-gradient(180deg,rgba(255,255,255,.065),rgba(255,255,255,.020)),rgba(16,22,36,.75)';
    var controlHover = c.tone === 'light'
      ? 'linear-gradient(180deg,rgba(255,255,255,1),rgba(229,241,251,.94)),rgba(' + v.accentRgb + ',.085)'
      : 'linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.032)),rgba(20,28,46,.82)';
    var inputBase = c.tone === 'light'
      ? 'linear-gradient(180deg,rgba(255,255,255,1),rgba(247,251,255,.96))'
      : 'rgba(8,12,22,.62)';
    var shadow = c.tone === 'light'
      ? '0 20px 42px rgba(31,57,88,.11), inset 0 1px 0 rgba(255,255,255,.78)'
      : '0 22px 46px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.04)';
    var shadowSoft = c.tone === 'light'
      ? '0 12px 28px rgba(31,57,88,.09), inset 0 1px 0 rgba(255,255,255,.72)'
      : '0 12px 28px rgba(0,0,0,.20), inset 0 1px 0 rgba(255,255,255,.035)';
    root.setProperty('--tm-bg', v.bg);
    root.setProperty('--tm-bg2', v.bg2);
    root.setProperty('--tm-bg3', v.bg3);
    root.setProperty('--tm-bg4', v.bg4);
    root.setProperty('--tm-text', v.text);
    root.setProperty('--tm-dim', v.dim);
    root.setProperty('--tm-faint', v.faint);
    root.setProperty('--tm-accent', v.accent);
    root.setProperty('--tm-accent-dim', v.accentDim);
    root.setProperty('--tm-accent-bright', v.accentBright);
    root.setProperty('--tm-accent-rgb', v.accentRgb);
    root.setProperty('--tm-accent-2-rgb', v.accent2Rgb);
    root.setProperty('--tm-page-bg', v.pageBg);
    root.setProperty('--tm-text-soft', textSoft);
    root.setProperty('--tm-text-muted', textMuted);
    root.setProperty('--tm-border', 'rgba(' + v.accentRgb + ',.18)');
    root.setProperty('--tm-border-strong', 'rgba(' + v.accent2Rgb + ',.25)');
    root.setProperty('--tm-card-bg', panelBase);
    root.setProperty('--tm-card-bg-strong', panelStrong);
    root.setProperty('--tm-control-bg', controlBase);
    root.setProperty('--tm-control-bg-hover', controlHover);
    root.setProperty('--tm-input-bg', inputBase);
    root.setProperty('--tm-shadow', shadow);
    root.setProperty('--tm-shadow-soft', shadowSoft);

    root.setProperty('--bg', v.bg);
    root.setProperty('--bg2', v.bg2);
    root.setProperty('--bg3', v.bg3);
    root.setProperty('--bg4', v.bg4);
    root.setProperty('--border', 'rgba(' + v.accentRgb + ',.15)');
    root.setProperty('--border2', 'rgba(' + v.accentRgb + ',.25)');
    root.setProperty('--glacier', v.accent);
    root.setProperty('--glacier-dim', v.accentDim);
    root.setProperty('--glacier-bright', v.accentBright);
    root.setProperty('--glacier-dimcss', v.accentDim);
    root.setProperty('--glow', 'rgba(' + v.accentRgb + ',.08)');
    root.setProperty('--glow2', 'rgba(' + v.accentRgb + ',.05)');
    root.setProperty('--text', v.text);
    root.setProperty('--text-soft', textSoft);
    root.setProperty('--dim', v.dim);
    root.setProperty('--faint', v.faint);
    root.setProperty('--gold', v.accentBright);
    root.setProperty('--purple', v.accentDim);
    root.setProperty('--theme-accent', v.accent);
    root.setProperty('--theme-accent-rgb', v.accentRgb);
    root.setProperty('--theme-contrast', v.text);
    root.setProperty('--theme-contrast-soft', textSoft);
    root.setProperty('--theme-panel', 'rgba(' + v.accentRgb + ',.08)');
    root.setProperty('--theme-panel-strong', 'rgba(' + v.accentRgb + ',.16)');
    root.setProperty('--theme-ring', 'rgba(' + v.accentRgb + ',.35)');
    root.setProperty('--theme-glow-strong', 'rgba(' + v.accentRgb + ',.18)');
    root.setProperty('--theme-tint', 'rgba(' + v.accentRgb + ',.04)');
    root.setProperty('--theme-ui-soft', 'rgba(' + v.accentRgb + ',.16)');
    root.setProperty('--theme-ui-strong', 'rgba(' + v.accentRgb + ',.24)');
    root.setProperty('--theme-ui-fg', c.tone === 'light' ? 'rgba(25,36,30,.94)' : 'rgba(248,252,255,.94)');
    root.setProperty('--theme-ui-fg-soft', c.tone === 'light' ? 'rgba(54,75,64,.76)' : 'rgba(232,240,248,.76)');
    root.setProperty('--theme-ui-panel', panelBase);
    root.setProperty('--theme-ui-panel-strong', panelStrong);
    root.setProperty('--theme-ui-press', 'linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02)),linear-gradient(90deg,rgba(' + v.accentRgb + ',.09),rgba(' + v.accentRgb + ',.045))');
    root.setProperty('--theme-ui-press-active', 'linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.03)),linear-gradient(90deg,rgba(' + v.accentRgb + ',.15),rgba(' + v.accentRgb + ',.08))');
    root.setProperty('--accent-solid-fg', c.tone === 'light' ? '#071019' : '#f8fcff');
    root.setProperty('--accent-solid-shadow', c.tone === 'light' ? 'rgba(255,255,255,.45)' : 'rgba(0,0,0,.35)');

    document.body.setAttribute('data-theme-engine', ENGINE_VERSION);
    document.body.setAttribute('data-theme-active', c.id);
    document.documentElement.setAttribute('data-theme-engine', ENGINE_VERSION);
    document.documentElement.setAttribute('data-theme-active', c.id);
  }

  function patchThemeMetadata(){
    try{
      ['THEMES_BASE','THEMES_EVENT_BUILTIN','THEME_BASE_VISIBLE','THEME_SECRET_SLOTS'].forEach(function(key){
        var arr = window[key];
        if(!Array.isArray(arr)) return;
        arr.forEach(function(t){
          if(!t) return;
          var id = normalize(t.id);
          var c = CONFIG[id];
          if(!c) return;
          t.id = c.id;
          t.name = c.label;
          t.label = c.label;
          t.cls = c.cls;
          t.preview = c.colors.slice(0,3);
          t.desc = c.desc;
          t.description = c.desc;
          t.rarity = c.rarity;
          t.category = c.category;
          t.tagline = c.tagline;
        });
      });
    }catch(e){}
  }

  function installGlobalHelpers(){
    window.normalizeThemeId = normalize;

    if(!Array.isArray(window.THEME_BASE_VISIBLE)){
      window.THEME_BASE_VISIBLE = ORDER.slice();
    }

    if(!Array.isArray(window.THEME_SECRET_SLOTS)){
      window.THEME_SECRET_SLOTS = [
        {id:'secret-1', label:'Secret scellé', rarity:'Secret', category:'Secrets', hint:'Un thème encore inconnu.'},
        {id:'secret-2', label:'Secret scellé', rarity:'Secret', category:'Secrets', hint:'Un thème encore inconnu.'}
      ];
    }

    window.themeMeta = function(themeId){
      var c = cfg(themeId);
      return {
        id:c.id,
        label:c.label,
        name:c.label,
        rarity:c.rarity,
        category:c.category,
        tagline:c.tagline,
        desc:c.desc,
        preview:c.colors.join(' · '),
        previewColors:c.colors.slice(),
        cls:c.cls,
        tone:c.tone,
        signature:c.signature || ''
      };
    };

    window.prettyThemeName = function(themeId){ return cfg(themeId).label; };

    window.categoryOrder = function(category){
      var order = { 'Équipé':-1, 'Base':0, 'Classiques':1, 'Saisonniers':2, 'Rares':3, 'Secrets':9 };
      return Object.prototype.hasOwnProperty.call(order, category) ? order[category] : 5;
    };

    window.rarityTone = function(rarity){
      rarity = String(rarity || '').toLowerCase();
      if(rarity.indexOf('mythique') >= 0) return 'danger';
      if(rarity.indexOf('premium') >= 0) return 'gold';
      if(rarity.indexOf('saisonnier') >= 0) return 'event';
      if(rarity.indexOf('secret') >= 0) return 'secret';
      return 'default';
    };

    window.themeRestrictionLabel = function(themeId){
      var c = cfg(themeId);
      if(c.rarity === 'Mythique') return 'Mythique';
      if(c.rarity === 'Premium') return 'Premium';
      if(c.rarity === 'Saisonnier') return 'Saisonnier';
      return c.rarity || 'Thème';
    };

    window.themeMaxAuditReport = function(){
      return {
        version:ENGINE_VERSION,
        active:activeTheme(),
        themes:ORDER.slice(),
        cards:document.querySelectorAll('.theme-card-premium,.collection-card,.db-theme-admin-item').length,
        engine:'consolidated'
      };
    };
    window.themeMaxRefresh = refresh;
    window.themeMaxPreviewColors = function(id){ return cfg(id).colors.slice(); };
  }

  function detectCardTheme(card){
    var id = card.getAttribute('data-theme-id') || card.getAttribute('data-theme') || card.getAttribute('data-preview-theme') || '';
    id = normalize(id);
    if(CONFIG[id]) return id;
    var txt = (card.textContent || '').toLowerCase();
    if(txt.indexOf('pâques') >= 0 || txt.indexOf('paques') >= 0 || txt.indexOf('printemps') >= 0) return 'easter';
    if(txt.indexOf('aquaris') >= 0 || txt.indexOf('englouti') >= 0 || txt.indexOf('aquarius') >= 0) return 'aquaris';
    if(txt.indexOf('bloodmoon') >= 0 || txt.indexOf('lune de sang') >= 0) return 'bloodmoon';
    if(txt.indexOf('noël') >= 0 || txt.indexOf('noel') >= 0 || txt.indexOf('hivernale') >= 0) return 'noel';
    if(txt.indexOf('halloween') >= 0 || txt.indexOf('âmes') >= 0 || txt.indexOf('citrouille') >= 0) return 'halloween';
    if(txt.indexOf('abyssal') >= 0 || txt.indexOf('violet') >= 0) return 'violet';
    if(txt.indexOf('écarlate') >= 0 || txt.indexOf('ecarlate') >= 0) return 'red';
    if(txt.indexOf('sylvan') >= 0 || txt.indexOf('vert') >= 0) return 'green';
    if(txt.indexOf('claire') >= 0 || txt.indexOf('light') >= 0) return 'light';
    return 'dark';
  }

  function inferCardState(card, id){
    var txt = (card.textContent || '').toLowerCase();
    var cls = (card.className || '').toLowerCase();
    var active = activeTheme();
    if(id && active === id) return 'selected';
    if(card.matches('.selected,.is-active,.active,[data-active="true"]') || txt.indexOf('équipé') >= 0 || txt.indexOf('equipé') >= 0 || txt.indexOf('sélectionné') >= 0) return 'selected';
    if(card.matches('.locked,[data-locked="true"]') || txt.indexOf('verrou') >= 0 || txt.indexOf('locked') >= 0 || txt.indexOf('indisponible') >= 0) return 'locked';
    if(txt.indexOf('obtenu') >= 0 || txt.indexOf('possédé') >= 0 || txt.indexOf('owned') >= 0 || cls.indexOf('owned') >= 0) return 'owned';
    return 'available';
  }

  function ensureTopline(card, c){
    var top = card.querySelector('.theme-topline,.card-topline');
    if(!top){
      top = document.createElement('div');
      top.className = 'theme-topline';
      card.insertBefore(top, card.firstChild);
    }
    top.setAttribute('data-theme-eyebrow', c.rarity || 'Thème');
  }

  function ensureTagline(card, c){
    var tag = card.querySelector('.tagline');
    if(!tag){
      tag = document.createElement('div');
      tag.className = 'tagline';
      var title = card.querySelector('.title,.card-title,.theme-title');
      if(title && title.nextSibling) title.parentNode.insertBefore(tag, title.nextSibling);
      else card.appendChild(tag);
    }
    if(!tag.textContent || tag.textContent.trim().length < 6) tag.textContent = c.tagline;
  }

  function ensureMetaRow(card, c){
    var row = card.querySelector('.theme-meta-row,.theme-footer-meta');
    if(!row){
      row = document.createElement('div');
      row.className = 'theme-meta-row';
      var actions = card.querySelector('.actions,.card-actions,.theme-actions');
      if(actions) card.insertBefore(row, actions);
      else card.appendChild(row);
    }
    if(!row.querySelector('.theme-meta-pill[data-kind="rarity"]')){
      var pill = document.createElement('span');
      pill.className = 'theme-meta-pill chip';
      pill.setAttribute('data-kind','rarity');
      pill.setAttribute('data-rarity', c.rarity);
      pill.textContent = c.rarity;
      row.appendChild(pill);
    }
    if(c.signature && !row.querySelector('.theme-rare-signature')){
      var sig = document.createElement('span');
      sig.className = 'theme-rare-signature';
      sig.textContent = c.signature;
      row.appendChild(sig);
    }
  }

  function patchCards(){
    var cards = document.querySelectorAll('.theme-card-premium,.collection-card,.db-theme-admin-item');
    Array.prototype.forEach.call(cards, function(card){
      var id = detectCardTheme(card);
      var c = cfg(id);
      card.setAttribute('data-theme-id', c.id);
      card.setAttribute('data-theme-rarity', c.rarity);
      card.setAttribute('data-theme-category', c.category);
      card.setAttribute('data-theme-state', inferCardState(card, c.id));
      ensureTopline(card, c);
      ensureTagline(card, c);
      ensureMetaRow(card, c);

      var preview = card.querySelector('.theme-preview-mini');
      if(preview){
        ORDER.forEach(function(k){ preview.classList.remove(k); });
        preview.classList.add(c.id);
        preview.setAttribute('data-preview-theme', c.id);
      }
    });
  }

  function collectionRoot(){
    return document.querySelector('.theme-collection,.appearance-themes,.themes-section,.collection-section,.settings-pane[data-tab="themes"]');
  }

  function loadFilters(){
    try{
      var raw = localStorage.getItem(FILTER_STORAGE_KEY);
      if(raw) return Object.assign({q:'', rarity:'all', state:'all', sort:'recommended'}, JSON.parse(raw));
    }catch(e){}
    return {q:'', rarity:'all', state:'all', sort:'recommended'};
  }

  function saveFilters(f){
    try{ localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(f)); }catch(e){}
  }

  function getCards(){
    return Array.prototype.slice.call(document.querySelectorAll('.theme-card-premium,.collection-card'));
  }

  function ensureCollectionUx(){
    var root = collectionRoot();
    var cards = getCards();
    if(!root || !cards.length) return;

    var hero = root.querySelector('.np-theme-hero');
    if(!hero){
      hero = document.createElement('section');
      hero.className = 'np-theme-hero';
      hero.innerHTML = '<h2 class="np-theme-hero-title">Collection des thèmes</h2><p class="np-theme-hero-sub">Retrouve tes thèmes, leur rareté et leur statut. Les thèmes rares sont mieux mis en scène et les filtres permettent de naviguer rapidement.</p><div class="np-theme-stats"></div>';
      root.insertBefore(hero, root.firstChild);
    }

    var toolbar = root.querySelector('.np-theme-toolbar');
    if(!toolbar){
      toolbar = document.createElement('div');
      toolbar.className = 'np-theme-toolbar';
      toolbar.innerHTML = [
        '<input class="np-theme-search" type="search" placeholder="Rechercher un thème…">',
        '<select class="np-theme-select np-theme-rarity"><option value="all">Toutes raretés</option><option>Base</option><option>Classique</option><option>Saisonnier</option><option>Premium</option><option>Mythique</option></select>',
        '<select class="np-theme-select np-theme-state"><option value="all">Tous états</option><option value="selected">Équipé</option><option value="owned">Possédés</option><option value="available">Disponibles</option><option value="locked">Indisponibles</option></select>',
        '<select class="np-theme-select np-theme-sort"><option value="recommended">Recommandé</option><option value="rarity">Rareté</option><option value="az">A-Z</option><option value="owned">Possédés d’abord</option></select>',
        '<span class="np-theme-count"></span>'
      ].join('');
      hero.parentNode.insertBefore(toolbar, hero.nextSibling);

      toolbar.addEventListener('input', function(e){
        var f = loadFilters();
        if(e.target.classList.contains('np-theme-search')) f.q = e.target.value || '';
        saveFilters(f);
        applyCollectionFilters();
      });
      toolbar.addEventListener('change', function(e){
        var f = loadFilters();
        if(e.target.classList.contains('np-theme-rarity')) f.rarity = e.target.value || 'all';
        if(e.target.classList.contains('np-theme-state')) f.state = e.target.value || 'all';
        if(e.target.classList.contains('np-theme-sort')) f.sort = e.target.value || 'recommended';
        saveFilters(f);
        applyCollectionFilters();
      });
    }

    var empty = root.querySelector('.np-theme-empty');
    if(!empty){
      empty = document.createElement('div');
      empty.className = 'np-theme-empty';
      empty.textContent = 'Aucun thème ne correspond aux filtres.';
      empty.style.display = 'none';
      root.appendChild(empty);
    }

    syncToolbar();
    updateHeroStats();
    applyCollectionFilters();
  }

  function syncToolbar(){
    var root = collectionRoot();
    if(!root) return;
    var f = loadFilters();
    var q = root.querySelector('.np-theme-search');
    var rarity = root.querySelector('.np-theme-rarity');
    var state = root.querySelector('.np-theme-state');
    var sort = root.querySelector('.np-theme-sort');
    if(q && q.value !== f.q) q.value = f.q;
    if(rarity) rarity.value = f.rarity || 'all';
    if(state) state.value = f.state || 'all';
    if(sort) sort.value = f.sort || 'recommended';
  }

  function stateRank(state){
    return {selected:0, owned:1, available:2, locked:3}[state] ?? 4;
  }

  function cardSortValue(card, mode){
    var id = card.getAttribute('data-theme-id') || 'dark';
    var c = cfg(id);
    var state = card.getAttribute('data-theme-state') || 'available';
    if(mode === 'az') return c.label.toLowerCase();
    if(mode === 'rarity') return String(9 - (RARITY_ORDER[c.rarity] || 0)).padStart(2,'0') + '-' + c.label.toLowerCase();
    if(mode === 'owned') return String(stateRank(state)).padStart(2,'0') + '-' + c.label.toLowerCase();
    return String(ORDER.indexOf(c.id)).padStart(2,'0') + '-' + c.label.toLowerCase();
  }

  function applyCollectionFilters(){
    var root = collectionRoot();
    if(!root) return;
    var f = loadFilters();
    var cards = getCards();
    var q = String(f.q || '').trim().toLowerCase();
    var visible = 0;

    cards.forEach(function(card){
      var id = card.getAttribute('data-theme-id') || detectCardTheme(card);
      var c = cfg(id);
      var state = card.getAttribute('data-theme-state') || inferCardState(card, c.id);
      var text = ((card.textContent || '') + ' ' + c.label + ' ' + c.rarity + ' ' + c.category + ' ' + c.tagline + ' ' + c.desc).toLowerCase();
      var ok = true;
      if(q && text.indexOf(q) < 0) ok = false;
      if(f.rarity && f.rarity !== 'all' && c.rarity !== f.rarity) ok = false;
      if(f.state && f.state !== 'all'){
        if(f.state === 'owned') ok = (state === 'owned' || state === 'selected');
        else ok = state === f.state;
      }
      card.classList.toggle('np-theme-hidden', !ok);
      if(ok) visible += 1;
    });

    var groups = document.querySelectorAll('.theme-collection-grid,.theme-grid,.themes-grid,.collection-grid,.premium-theme-grid');
    Array.prototype.forEach.call(groups, function(grid){
      var children = Array.prototype.slice.call(grid.children).filter(function(el){ return el.matches('.theme-card-premium,.collection-card'); });
      children.sort(function(a,b){
        var av = cardSortValue(a, f.sort || 'recommended');
        var bv = cardSortValue(b, f.sort || 'recommended');
        return av.localeCompare(bv);
      }).forEach(function(el){ grid.appendChild(el); });
    });

    var count = root.querySelector('.np-theme-count');
    if(count) count.textContent = visible + ' / ' + cards.length + ' thèmes';

    var empty = root.querySelector('.np-theme-empty');
    if(empty) empty.style.display = visible ? 'none' : '';
  }

  function updateHeroStats(){
    var root = collectionRoot();
    if(!root) return;
    var stats = root.querySelector('.np-theme-stats');
    if(!stats) return;
    var cards = getCards();
    var count = {total:cards.length, owned:0, selected:0, rare:0};
    cards.forEach(function(card){
      var state = card.getAttribute('data-theme-state') || 'available';
      var rarity = card.getAttribute('data-theme-rarity') || '';
      if(state === 'selected'){ count.selected++; count.owned++; }
      else if(state === 'owned') count.owned++;
      if(rarity === 'Premium' || rarity === 'Mythique') count.rare++;
    });
    stats.innerHTML = [
      ['Total', count.total],
      ['Possédés', count.owned],
      ['Équipé', count.selected],
      ['Premium / Mythique', count.rare]
    ].map(function(x){
      return '<div class="np-theme-stat"><div class="np-theme-stat-value">'+x[1]+'</div><div class="np-theme-stat-label">'+x[0]+'</div></div>';
    }).join('');
  }

  function wrapRenderers(){
    ['renderThemeCollectionPremium','renderThemeGrid','renderAdminThemes','renderAppearanceSection','renderDB','renderDatabase'].forEach(function(name){
      try{
        var fn = window[name];
        if(typeof fn === 'function' && !fn.__themeEngineV257){
          var wrapped = function(){
            var out = fn.apply(this, arguments);
            scheduleRefresh();
            setTimeout(refresh, 180);
            return out;
          };
          wrapped.__themeEngineV257 = true;
          window[name] = wrapped;
        }
      }catch(e){}
    });

    try{
      if(typeof window.applyTheme === 'function' && !window.applyTheme.__themeEngineV257){
        var oldApply = window.applyTheme;
        var wrappedApply = function(){
          var out = oldApply.apply(this, arguments);
          scheduleRefresh();
          setTimeout(refresh, 180);
          return out;
        };
        wrappedApply.__themeEngineV257 = true;
        window.applyTheme = wrappedApply;
      }
    }catch(e){}
  }

  function refresh(){
    var id = activeTheme();
    applyVars(id);
    patchThemeMetadata();
    patchCards();
    ensureCollectionUx();
  }

  function scheduleRefresh(){
    clearTimeout(TIMER);
    TIMER = setTimeout(refresh, 90);
  }

  function observe(){
    try{
      var mo = new MutationObserver(function(muts){
        for(var i=0;i<muts.length;i++){
          var m = muts[i];
          if(m.type === 'childList' || m.type === 'attributes'){
            scheduleRefresh();
            break;
          }
        }
      });
      mo.observe(document.body, {
        subtree:true,
        childList:true,
        attributes:true,
        attributeFilter:['class','style','data-theme-id','data-theme-state','data-theme-rarity']
      });
      window.__themeEngineV257Observer = mo;
    }catch(e){}
  }

  function boot(){
    injectCss();
    installGlobalHelpers();
    patchThemeMetadata();
    wrapRenderers();
    refresh();
    setTimeout(refresh, 300);
    setTimeout(refresh, 1000);
    observe();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
