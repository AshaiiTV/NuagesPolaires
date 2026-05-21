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
      id:'violet', label:'Galactique', cls:'theme-violet', rarity:'Rare', category:'Rares',
      tagline:'Constellations, nébuleuses et lumière d’orbite.',
      desc:'Un thème spatial franc : ciel profond, étoiles vives, halos stellaires et verre cosmique.',
      colors:['#03020b','#9b7cff','#73d8ff'],
      tone:'dark',
      vars:{
        bg:'#03020b', bg2:'#090621', bg3:'#140d3d', bg4:'#21145f',
        text:'#fcfaff', dim:'#d9d4f4', faint:'#9a93c7',
        accent:'#9b7cff', accentDim:'#5a4ac4', accentBright:'#73d8ff',
        accentRgb:'155,124,255', accent2Rgb:'115,216,255',
        pageBg:'radial-gradient(ellipse at 50% -12%,rgba(203,194,255,.32),transparent 31rem),radial-gradient(circle at 14% 18%,rgba(124,84,255,.34),transparent 26rem),radial-gradient(circle at 86% 18%,rgba(71,206,255,.24),transparent 24rem),radial-gradient(ellipse at 74% 86%,rgba(220,92,255,.20),transparent 32rem),linear-gradient(180deg,#020108 0%,#07041b 34%,#100830 62%,#020108 100%)'
      }
    },
    red: {
      id:'red', label:'Écarlate', cls:'theme-red', rarity:'Rare', category:'Rares',
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
      id:'green', label:'Sylvan', cls:'theme-green', rarity:'Rare', category:'Rares',
      tagline:'Canopée profonde, mousse vivante et lianes anciennes.',
      desc:'Un thème jungle organique : sous-bois dense, feuillage humide, sève dorée et lumière filtrée par la canopée.',
      colors:['#06130b','#39b66b','#d5b75d'],
      tone:'dark',
      vars:{
        bg:'#06130b', bg2:'#0b2212', bg3:'#12351d', bg4:'#1c4b2a',
        text:'#f1fff4', dim:'#c1e5c5', faint:'#82aa89',
        accent:'#39b66b', accentDim:'#1d7543', accentBright:'#d5b75d',
        accentRgb:'57,182,107', accent2Rgb:'213,183,93',
        pageBg:'radial-gradient(circle at 14% 12%, rgba(57,182,107,.24), transparent 22rem),radial-gradient(circle at 82% 18%, rgba(213,183,93,.13), transparent 18rem),radial-gradient(ellipse at 50% 105%, rgba(14,78,35,.62), transparent 42rem),linear-gradient(180deg,#06130b 0%,#0b2212 46%,#031008 100%)'
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
      id:'aquaris', label:'Aquaris — Royaume englouti', cls:'theme-aquaris', rarity:'Rare', category:'Rares',
      tagline:'Royaume englouti, cyan abyssal et or ancien.',
      desc:'Palais noyés, lumière abyssale, cyan profond et or ancien.',
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
      id:'bloodmoon', label:'BloodMoon', cls:'theme-bloodmoon', rarity:'Fondateur', category:'Fondateur',
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
  var RARITY_ORDER = { 'Base':0, 'Classique':1, 'Saisonnier':2, 'Rare':3, 'Premium':3, 'Fondateur':4, 'Mythique':5 };

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
body[data-theme-engine="v257"][data-theme-tone="light"],
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
  --np-ui-border-soft:rgba(58,143,186,.18);
  --np-ui-border-strong:rgba(58,143,186,.30);
  --np-ui-shadow:var(--tm-shadow-soft);
  --np-ui-header-shadow:0 12px 28px rgba(31,57,88,.10), inset 0 1px 0 rgba(255,255,255,.78);
  --np-ui-panel-surface:var(--tm-card-bg);
  --np-ui-panel-surface-strong:var(--tm-card-bg-strong);
  --np-ui-button-bg:var(--tm-control-bg);
  --np-ui-button-hover:var(--tm-control-bg-hover);
  --np-ui-input-bg:var(--tm-input-bg);
  --np-ui-header-bg:linear-gradient(180deg,rgba(255,255,255,.995),rgba(236,246,252,.985)),radial-gradient(circle at 20% 0%,rgba(58,143,186,.12),transparent 42%);
  --np-ui-dropdown-bg:linear-gradient(180deg,rgba(255,255,255,.998),rgba(241,247,253,.992)),radial-gradient(circle at 15% 0%,rgba(58,143,186,.10),transparent 45%);
  --np-ui-chip-bg:linear-gradient(180deg,rgba(255,255,255,.98),rgba(237,245,252,.92)),rgba(58,143,186,.055);
}
body[data-theme-engine="v257"][data-theme-active="light"] :where(.card,.panel,.staff-panel,.modal,.login-card,.tab-content.tab-popup-active,.collection-card,.db-card,.settings-pane,.ev-card,.bcrd,.prog-panel,.role-opt.staff-card,.branch-modal-shell,.summary-card,.home-counter,.home-footer-item,.archive-card,.history-card,.sim-panel,.sim-fighter-card,.sim-log,.sim-history,.sim-notif,.sim-side,.theme-card-premium,.theme-preview-mini,.warnbox,.empty-state,.home-footer,.journal-entry,.activity-item,.collection-section,.arc-results,.arc-detail,.arc-card,.arc-detail-card,.arc-metric,.arc-roster-row,.arc-log-row),
body[data-theme-engine="v257"][data-theme-tone="light"] :where(.card,.panel,.staff-panel,.modal,.login-card,.tab-content.tab-popup-active,.collection-card,.db-card,.settings-pane,.ev-card,.bcrd,.prog-panel,.role-opt.staff-card,.branch-modal-shell,.summary-card,.home-counter,.home-footer-item,.archive-card,.history-card,.sim-panel,.sim-fighter-card,.sim-log,.sim-history,.sim-notif,.sim-side,.theme-card-premium,.theme-preview-mini,.warnbox,.empty-state,.home-footer,.journal-entry,.activity-item,.collection-section,.arc-results,.arc-detail,.arc-card,.arc-detail-card,.arc-metric,.arc-roster-row,.arc-log-row),
body[data-theme-engine="v257"].light :where(.card,.panel,.staff-panel,.modal,.login-card,.tab-content.tab-popup-active,.collection-card,.db-card,.settings-pane,.ev-card,.bcrd,.prog-panel,.role-opt.staff-card,.branch-modal-shell,.summary-card,.home-counter,.home-footer-item,.archive-card,.history-card,.sim-panel,.sim-fighter-card,.sim-log,.sim-history,.sim-notif,.sim-side,.theme-card-premium,.theme-preview-mini,.warnbox,.empty-state,.home-footer,.journal-entry,.activity-item,.collection-section,.arc-results,.arc-detail,.arc-card,.arc-detail-card,.arc-metric,.arc-roster-row,.arc-log-row){
  background:var(--tm-card-bg) !important;
  color:var(--tm-text) !important;
  border-color:var(--tm-border) !important;
  box-shadow:var(--tm-shadow-soft) !important;
}
body[data-theme-engine="v257"][data-theme-active="light"] :where(.app-header,#mobile-drawer > div:first-child,.nav-group-menu,.nav-dropdown-menu,.tab-content.tab-popup-active,.nav-dd,.nav-dropdown,.menu,.account-dd,.branch-dd),
body[data-theme-engine="v257"][data-theme-tone="light"] :where(.app-header,#mobile-drawer > div:first-child,.nav-group-menu,.nav-dropdown-menu,.tab-content.tab-popup-active,.nav-dd,.nav-dropdown,.menu,.account-dd,.branch-dd),
body[data-theme-engine="v257"].light :where(.app-header,#mobile-drawer > div:first-child,.nav-group-menu,.nav-dropdown-menu,.tab-content.tab-popup-active,.nav-dd,.nav-dropdown,.menu,.account-dd,.branch-dd){
  background:var(--np-ui-dropdown-bg) !important;
  color:var(--tm-text) !important;
  border-color:var(--np-ui-border-soft) !important;
  box-shadow:0 18px 42px rgba(31,57,88,.12), inset 0 1px 0 rgba(255,255,255,.78) !important;
}
body[data-theme-engine="v257"][data-theme-active="light"] :where(.app-header,#mobile-drawer > div:first-child),
body[data-theme-engine="v257"][data-theme-tone="light"] :where(.app-header,#mobile-drawer > div:first-child),
body[data-theme-engine="v257"].light :where(.app-header,#mobile-drawer > div:first-child){
  background:var(--np-ui-header-bg) !important;
  box-shadow:var(--np-ui-header-shadow) !important;
}
body[data-theme-engine="v257"][data-theme-active="light"] :where(#nav-dropdown-root .nav-dropdown-menu,#nav-dropdown-root .nav-group-menu,#mobile-drawer,#mobile-drawer > div,.nav-group-menu,.nav-dropdown-menu,.tab-content.tab-popup-active,.nav-dd,.nav-dropdown,.menu,.account-dd,.branch-dd,.cmdk,.branch-modal-shell),
body[data-theme-engine="v257"][data-theme-tone="light"] :where(#nav-dropdown-root .nav-dropdown-menu,#nav-dropdown-root .nav-group-menu,#mobile-drawer,#mobile-drawer > div,.nav-group-menu,.nav-dropdown-menu,.tab-content.tab-popup-active,.nav-dd,.nav-dropdown,.menu,.account-dd,.branch-dd,.cmdk,.branch-modal-shell),
body[data-theme-engine="v257"].light :where(#nav-dropdown-root .nav-dropdown-menu,#nav-dropdown-root .nav-group-menu,#mobile-drawer,#mobile-drawer > div,.nav-group-menu,.nav-dropdown-menu,.tab-content.tab-popup-active,.nav-dd,.nav-dropdown,.menu,.account-dd,.branch-dd,.cmdk,.branch-modal-shell){
  background:var(--np-ui-dropdown-bg) !important;
  color:var(--tm-text) !important;
  border-color:var(--np-ui-border-soft) !important;
  box-shadow:0 18px 42px rgba(31,57,88,.12), inset 0 1px 0 rgba(255,255,255,.78) !important;
}
body[data-theme-engine="v257"][data-theme-active="light"] :where(.nav-dropdown-menu *,.nav-group-menu *,#mobile-drawer *,.account-dd *,.branch-dd *,.menu *),
body[data-theme-engine="v257"][data-theme-tone="light"] :where(.nav-dropdown-menu *,.nav-group-menu *,#mobile-drawer *,.account-dd *,.branch-dd *,.menu *),
body[data-theme-engine="v257"].light :where(.nav-dropdown-menu *,.nav-group-menu *,#mobile-drawer *,.account-dd *,.branch-dd *,.menu *){
  border-color:rgba(58,143,186,.14) !important;
}
body[data-theme-engine="v257"][data-theme-active="light"] :where(.btn,.btn-out,.mini-btn,.gem-btn,.gem-qty-btn,.home-btn,.tab-btn,.ltab-btn,.settings-tab,.collection-chip,.quick-link,.bfilt,.nav-item,.nav-dropdown-item,.nav-group-btn,.nav-dropdown-btn,.spw-btn,.theme-vis-btn,.hdr-profile,.hdr-settings,#notif-bell,.theme-preview-chip,.drawer-item,.drawer-close,.mclose,.tab-popup-close,.theme-chip),
body[data-theme-engine="v257"][data-theme-tone="light"] :where(.btn,.btn-out,.mini-btn,.gem-btn,.gem-qty-btn,.home-btn,.tab-btn,.ltab-btn,.settings-tab,.collection-chip,.quick-link,.bfilt,.nav-item,.nav-dropdown-item,.nav-group-btn,.nav-dropdown-btn,.spw-btn,.theme-vis-btn,.hdr-profile,.hdr-settings,#notif-bell,.theme-preview-chip,.drawer-item,.drawer-close,.mclose,.tab-popup-close,.theme-chip),
body[data-theme-engine="v257"].light :where(.btn,.btn-out,.mini-btn,.gem-btn,.gem-qty-btn,.home-btn,.tab-btn,.ltab-btn,.settings-tab,.collection-chip,.quick-link,.bfilt,.nav-item,.nav-dropdown-item,.nav-group-btn,.nav-dropdown-btn,.spw-btn,.theme-vis-btn,.hdr-profile,.hdr-settings,#notif-bell,.theme-preview-chip,.drawer-item,.drawer-close,.mclose,.tab-popup-close,.theme-chip){
  background:var(--tm-control-bg) !important;
  color:var(--tm-text) !important;
  border-color:var(--tm-border) !important;
  box-shadow:0 8px 18px rgba(31,57,88,.08) !important;
}
body[data-theme-engine="v257"][data-theme-active="light"] :where(.btn:hover,.btn-out:hover,.mini-btn:hover,.gem-btn:hover,.gem-qty-btn:hover,.home-btn:hover,.tab-btn:hover,.ltab-btn:hover,.settings-tab:hover,.collection-chip:hover,.quick-link:hover,.bfilt:hover,.nav-item:hover,.nav-dropdown-item:hover,.nav-group-btn:hover,.nav-dropdown-btn:hover,.spw-btn:hover,.theme-vis-btn:hover,.hdr-profile:hover,.hdr-settings:hover,#notif-bell:hover,.drawer-item:hover,.drawer-close:hover,.mclose:hover,.tab-popup-close:hover,.theme-chip:hover,.btn.active,.tab-btn.active,.ltab-btn.active,.settings-tab.active,.bfilt.active,.nav-item.active,.nav-dropdown-item.active,.nav-group-btn.has-active,.nav-dropdown-btn.has-active,.drawer-item.active),
body[data-theme-engine="v257"][data-theme-tone="light"] :where(.btn:hover,.btn-out:hover,.mini-btn:hover,.gem-btn:hover,.gem-qty-btn:hover,.home-btn:hover,.tab-btn:hover,.ltab-btn:hover,.settings-tab:hover,.collection-chip:hover,.quick-link:hover,.bfilt:hover,.nav-item:hover,.nav-dropdown-item:hover,.nav-group-btn:hover,.nav-dropdown-btn:hover,.spw-btn:hover,.theme-vis-btn:hover,.hdr-profile:hover,.hdr-settings:hover,#notif-bell:hover,.drawer-item:hover,.drawer-close:hover,.mclose:hover,.tab-popup-close:hover,.theme-chip:hover,.btn.active,.tab-btn.active,.ltab-btn.active,.settings-tab.active,.bfilt.active,.nav-item.active,.nav-dropdown-item.active,.nav-group-btn.has-active,.nav-dropdown-btn.has-active,.drawer-item.active),
body[data-theme-engine="v257"].light :where(.btn:hover,.btn-out:hover,.mini-btn:hover,.gem-btn:hover,.gem-qty-btn:hover,.home-btn:hover,.tab-btn:hover,.ltab-btn:hover,.settings-tab:hover,.collection-chip:hover,.quick-link:hover,.bfilt:hover,.nav-item:hover,.nav-dropdown-item:hover,.nav-group-btn:hover,.nav-dropdown-btn:hover,.spw-btn:hover,.theme-vis-btn:hover,.hdr-profile:hover,.hdr-settings:hover,#notif-bell:hover,.drawer-item:hover,.drawer-close:hover,.mclose:hover,.tab-popup-close:hover,.theme-chip:hover,.btn.active,.tab-btn.active,.ltab-btn.active,.settings-tab.active,.bfilt.active,.nav-item.active,.nav-dropdown-item.active,.nav-group-btn.has-active,.nav-dropdown-btn.has-active,.drawer-item.active){
  background:var(--tm-control-bg-hover) !important;
  color:var(--tm-text) !important;
  border-color:var(--tm-border-strong) !important;
}
body[data-theme-engine="v257"][data-theme-active="light"] :where(input,select,textarea,.inp,.search-input,.sim-search-input),
body[data-theme-engine="v257"][data-theme-tone="light"] :where(input,select,textarea,.inp,.search-input,.sim-search-input),
body[data-theme-engine="v257"].light :where(input,select,textarea,.inp,.search-input,.sim-search-input){
  background:var(--tm-input-bg) !important;
  color:var(--tm-text) !important;
  border-color:var(--tm-border) !important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.82) !important;
}
body[data-theme-engine="v257"][data-theme-active="light"] :where(.sub,.desc,.tagline,.muted,.hint,.small,.empty-state-sub,.field label,.dim,.faint,.meta,.help,.helper,.subtle,.soft,.legend,.sim-hud-sub,.sim-hud-k,.home-sub,.home-footer-lbl,.spw-sub,.spw-note,.spw-mini,.spw-lines,.quote,.rsec p,.rsec ul,.rsec li,.nav-group-label,.nav-section-label,.nav-section-header,.hdr-user,#hdr-av-txt,.hdr-badge,.card-subtitle,.card-meta,.stat-label),
body[data-theme-engine="v257"][data-theme-tone="light"] :where(.sub,.desc,.tagline,.muted,.hint,.small,.empty-state-sub,.field label,.dim,.faint,.meta,.help,.helper,.subtle,.soft,.legend,.sim-hud-sub,.sim-hud-k,.home-sub,.home-footer-lbl,.spw-sub,.spw-note,.spw-mini,.spw-lines,.quote,.rsec p,.rsec ul,.rsec li,.nav-group-label,.nav-section-label,.nav-section-header,.hdr-user,#hdr-av-txt,.hdr-badge,.card-subtitle,.card-meta,.stat-label),
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
body[data-theme-engine="v257"][data-theme-tone="light"] [style*="background:rgba(7,8,16"],
body[data-theme-engine="v257"][data-theme-tone="light"] [style*="background: rgba(7,8,16"],
body[data-theme-engine="v257"][data-theme-tone="light"] [style*="background:rgba(7,8,18"],
body[data-theme-engine="v257"][data-theme-tone="light"] [style*="background: rgba(7,8,18"],
body[data-theme-engine="v257"][data-theme-tone="light"] [style*="background:rgba(5,8,14"],
body[data-theme-engine="v257"][data-theme-tone="light"] [style*="background: rgba(5,8,14"],
body[data-theme-engine="v257"][data-theme-tone="light"] [style*="background:rgba(6,8,16"],
body[data-theme-engine="v257"][data-theme-tone="light"] [style*="background: rgba(6,8,16"],
body[data-theme-engine="v257"][data-theme-tone="light"] [style*="background:rgba(8,10,18"],
body[data-theme-engine="v257"][data-theme-tone="light"] [style*="background: rgba(8,10,18"],
body[data-theme-engine="v257"][data-theme-tone="light"] [style*="background:rgba(8,13,24"],
body[data-theme-engine="v257"][data-theme-tone="light"] [style*="background: rgba(8,13,24"],
body[data-theme-engine="v257"][data-theme-tone="light"] [style*="background:rgba(9,12,20"],
body[data-theme-engine="v257"][data-theme-tone="light"] [style*="background: rgba(9,12,20"],
body[data-theme-engine="v257"][data-theme-tone="light"] [style*="background:rgba(9,18,38"],
body[data-theme-engine="v257"][data-theme-tone="light"] [style*="background: rgba(9,18,38"],
body[data-theme-engine="v257"][data-theme-tone="light"] [style*="background:linear-gradient(135deg,#0d0e1c,#0f1025)"],
body[data-theme-engine="v257"][data-theme-tone="light"] [style*="background:linear-gradient(160deg,#0c0e1c,#090a12)"],
body[data-theme-engine="v257"][data-theme-tone="light"] [style*="background:linear-gradient(160deg,#0e1020,#0d0e18)"],
body[data-theme-engine="v257"][data-theme-tone="light"] [style*="background:linear-gradient(160deg,#0f1022,#0d0e18)"],
body[data-theme-engine="v257"][data-theme-tone="light"] [style*="background:linear-gradient(160deg,#120e0e,#0d0e18)"],
body[data-theme-engine="v257"][data-theme-tone="light"] [style*="background:linear-gradient(180deg,rgba(10,18,38"],
body[data-theme-engine="v257"][data-theme-tone="light"] [style*="background:linear-gradient(180deg,rgba(13,18,34"],
body[data-theme-engine="v257"][data-theme-tone="light"] [style*="background:linear-gradient(180deg,rgba(15,18,31"],
body[data-theme-engine="v257"][data-theme-tone="light"] [style*="background:linear-gradient(180deg, rgba(18,25,42"]{
  background:var(--tm-card-bg) !important;
  color:var(--tm-text) !important;
  border-color:var(--tm-border) !important;
  box-shadow:var(--tm-shadow-soft) !important;
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

/* Unified base: every theme uses the same UI skeleton and only swaps tokens. */
body[data-theme-engine="v257"]{
  --np-ui-text:var(--tm-text);
  --np-ui-text-soft:var(--tm-text-soft);
  --np-ui-muted:var(--tm-text-muted);
  --np-ui-border-soft:rgba(var(--tm-accent-rgb),.18);
  --np-ui-border-strong:rgba(var(--tm-accent-rgb),.30);
  --np-ui-panel-surface:var(--tm-card-bg);
  --np-ui-panel-surface-strong:var(--tm-card-bg-strong);
  --np-ui-button-bg:var(--tm-control-bg);
  --np-ui-button-hover:var(--tm-control-bg-hover);
  --np-ui-input-bg:var(--tm-input-bg);
  --np-ui-header-bg:var(--tm-card-bg-strong);
  --np-ui-dropdown-bg:var(--tm-card-bg-strong);
  --np-ui-chip-bg:linear-gradient(90deg,rgba(var(--tm-accent-rgb),.13),rgba(var(--tm-accent-rgb),.08));
  --np-ui-shadow:var(--tm-shadow-soft);
  --np-ui-header-shadow:var(--tm-shadow-soft);
}
body[data-theme-engine="v257"] :where(.app-header,#mobile-drawer > div:first-child,.nav-group-menu,.nav-dropdown-menu,.tab-content.tab-popup-active,.nav-dd,.nav-dropdown,.menu,.account-dd,.branch-dd,#nav-dropdown-root .nav-dropdown-menu,#nav-dropdown-root .nav-group-menu,#mobile-drawer,.cmdk,.branch-modal-shell){
  background:var(--np-ui-dropdown-bg) !important;
  color:var(--np-ui-text) !important;
  border-color:var(--np-ui-border-soft) !important;
  box-shadow:var(--np-ui-shadow) !important;
}
body[data-theme-engine="v257"] :where(.app-header,#mobile-drawer > div:first-child){
  background:var(--np-ui-header-bg) !important;
  box-shadow:var(--np-ui-header-shadow) !important;
}
body[data-theme-engine="v257"] :where(.card,.panel,.staff-panel,.modal,.login-card,.collection-card,.db-card,.settings-pane,.ev-card,.bcrd,.prog-panel,.role-opt.staff-card,.summary-card,.home-counter,.home-footer-item,.archive-card,.history-card,.sim-panel,.sim-fighter-card,.sim-log,.sim-history,.sim-notif,.sim-side,.theme-card-premium,.theme-preview-mini,.warnbox,.empty-state,.home-footer,.journal-entry,.activity-item,.collection-section,.arc-results,.arc-detail,.arc-card,.arc-detail-card,.arc-metric,.arc-roster-row,.arc-log-row,.sl-card,.hlbox){
  background:var(--np-ui-panel-surface) !important;
  color:var(--np-ui-text) !important;
  border-color:var(--np-ui-border-soft) !important;
  box-shadow:var(--np-ui-shadow) !important;
}
body[data-theme-engine="v257"] :where(.btn,.btn-out,.mini-btn,.gem-btn,.gem-qty-btn,.home-btn,.tab-btn,.ltab-btn,.settings-tab,.collection-chip,.quick-link,.bfilt,.nav-item,.nav-dropdown-item,.nav-group-btn,.nav-dropdown-btn,.spw-btn,.theme-vis-btn,.hdr-profile,.hdr-settings,#notif-bell,.theme-preview-chip,.drawer-item,.drawer-close,.mclose,.tab-popup-close,.theme-chip,button){
  background:var(--np-ui-button-bg) !important;
  color:var(--np-ui-text) !important;
  border-color:var(--np-ui-border-soft) !important;
}
body[data-theme-engine="v257"] :where(.btn:hover,.btn-out:hover,.mini-btn:hover,.gem-btn:hover,.gem-qty-btn:hover,.home-btn:hover,.tab-btn:hover,.ltab-btn:hover,.settings-tab:hover,.collection-chip:hover,.quick-link:hover,.bfilt:hover,.nav-item:hover,.nav-dropdown-item:hover,.nav-group-btn:hover,.nav-dropdown-btn:hover,.spw-btn:hover,.theme-vis-btn:hover,.hdr-profile:hover,.hdr-settings:hover,#notif-bell:hover,.drawer-item:hover,.drawer-close:hover,.mclose:hover,.tab-popup-close:hover,.theme-chip:hover,.btn.active,.tab-btn.active,.ltab-btn.active,.settings-tab.active,.bfilt.active,.nav-item.active,.nav-dropdown-item.active,.nav-group-btn.has-active,.nav-dropdown-btn.has-active,.drawer-item.active,.drawer-item.active-drawer){
  background:var(--np-ui-button-hover) !important;
  color:var(--np-ui-text) !important;
  border-color:var(--np-ui-border-strong) !important;
}
body[data-theme-engine="v257"] :where(.btn.primary,.btn-primary,.btn-main,.home-btn-primary,.home-btn.primary,.cta,.cta-primary,[data-primary="true"],button.primary){
  background:linear-gradient(135deg,var(--tm-accent),var(--tm-accent-bright)) !important;
  color:var(--tm-primary-text) !important;
}
body[data-theme-engine="v257"] :where(input,select,textarea,.inp,.search-input,.sim-search-input){
  background:var(--np-ui-input-bg) !important;
  color:var(--np-ui-text) !important;
  border-color:var(--np-ui-border-soft) !important;
}
body[data-theme-engine="v257"] :where(.chip,.badge,.plvl,.branch-current-pill,.theme-event-badge,.nav-badge,.collection-counter,.arc-pill,.arc-summary-chip,.summary-kicker,.home-footer-label){
  background:var(--np-ui-chip-bg) !important;
  color:var(--np-ui-text) !important;
  border-color:var(--np-ui-border-soft) !important;
}
body[data-theme-engine="v257"] :where(a,.card-title,.staff-panel-title,.mtit,.section-title,.settings-title,.modal-title,.panel-title,.empty-state-title,.home-title,.home-footer-num,.summary-value,.spw-title,.spw-name,.sim-hud-v){
  color:var(--tm-accent) !important;
}
body[data-theme-engine="v257"] :where(.empty-state-sub,.empty-state p,.field label,.dim,.faint,.muted,.small,.sim-hud-sub,.sim-hud-k,.home-sub,.home-footer-lbl,.spw-sub,.spw-note,.spw-mini,.spw-lines,.quote,.rsec p,.rsec ul,.rsec li,.nav-group-label,.nav-section-label,.nav-section-header,.hdr-user,#hdr-av-txt,.hdr-badge,.card-subtitle,.card-meta,.stat-label,.meta,.help,.helper,.hint,.subtle,.soft,.legend){
  color:var(--np-ui-muted) !important;
}

/* Ambient overlays */
body[data-theme-engine="v257"].theme-easter::before,
body[data-theme-engine="v257"].theme-easter::after,
body[data-theme-engine="v257"].theme-violet::before,
body[data-theme-engine="v257"].theme-violet::after,
body[data-theme-engine="v257"].theme-green::before,
body[data-theme-engine="v257"].theme-green::after,
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
body[data-theme-engine="v257"].theme-easter #easter-eggs-layer{
  display:none !important;
}
body[data-theme-engine="v257"].theme-easter #s-app::before,
body[data-theme-engine="v257"].theme-easter #s-app::after{
  content:none !important;
  display:none !important;
  background:none !important;
}
body[data-theme-engine="v257"].theme-violet::before{
  inset:0;
  z-index:0;
  opacity:1;
  background-image:
    radial-gradient(circle,rgba(255,255,255,.98) 0 1.8px,transparent 2.8px),
    radial-gradient(circle,rgba(205,240,255,.92) 0 1.45px,transparent 2.55px),
    radial-gradient(circle,rgba(230,204,255,.94) 0 1.6px,transparent 2.7px),
    radial-gradient(circle,rgba(255,255,255,.70) 0 1px,transparent 2px);
  background-size:172px 172px,243px 243px,329px 329px,94px 94px;
  background-position:18px 30px,86px 14px,22px 108px,45px 66px;
  filter:drop-shadow(0 0 7px rgba(173,147,255,.58));
  animation:tmGalaxyStars 34s linear infinite;
}
body[data-theme-engine="v257"].theme-violet::after{
  inset:-12%;
  z-index:0;
  opacity:.92;
  background:
    radial-gradient(ellipse at 20% 28%,rgba(129,82,255,.50),transparent 26rem),
    radial-gradient(ellipse at 84% 18%,rgba(73,211,255,.33),transparent 24rem),
    radial-gradient(ellipse at 68% 82%,rgba(227,102,255,.27),transparent 32rem),
    conic-gradient(from 198deg at 48% 44%,transparent 0 16%,rgba(155,124,255,.16) 24%,rgba(115,216,255,.18) 34%,transparent 48% 100%),
    linear-gradient(180deg,rgba(255,255,255,.05),transparent 22%,transparent 72%,rgba(1,0,7,.62)) !important;
  transform:translate3d(0,0,0) scale(1.04);
  animation:tmGalaxyNebula 18s ease-in-out infinite alternate;
}
body[data-theme-engine="v257"].theme-violet #s-app::before,
body[data-theme-engine="v257"].theme-violet #s-app::after{
  content:"";
  position:fixed;
  inset:0;
  z-index:0;
  pointer-events:none;
  display:block;
}
body[data-theme-engine="v257"].theme-violet #s-app::before{
  opacity:1;
  background:
    radial-gradient(circle at 8% 17%,rgba(255,255,255,1) 0 2px,rgba(255,255,255,.22) 2.4px,transparent 5px),
    radial-gradient(circle at 18% 64%,rgba(201,240,255,.98) 0 1.8px,rgba(115,216,255,.18) 2.4px,transparent 5px),
    radial-gradient(circle at 31% 29%,rgba(240,220,255,1) 0 2px,rgba(155,124,255,.20) 2.7px,transparent 5.4px),
    radial-gradient(circle at 46% 82%,rgba(255,255,255,.98) 0 1.7px,transparent 4.2px),
    radial-gradient(circle at 61% 21%,rgba(201,240,255,1) 0 2px,rgba(115,216,255,.18) 2.7px,transparent 5.4px),
    radial-gradient(circle at 74% 57%,rgba(240,220,255,.98) 0 1.9px,rgba(155,124,255,.18) 2.5px,transparent 5px),
    radial-gradient(circle at 88% 12%,rgba(255,255,255,1) 0 2px,transparent 4.6px),
    radial-gradient(circle at 94% 76%,rgba(201,240,255,.96) 0 1.8px,transparent 4.4px);
  animation:tmGalaxyTwinkle 6.8s ease-in-out infinite;
}
body[data-theme-engine="v257"].theme-violet #s-app::after{
  opacity:.86;
  background:
    linear-gradient(105deg,transparent 2%,rgba(155,124,255,.10) 20%,rgba(115,216,255,.18) 39%,transparent 56%),
    linear-gradient(72deg,transparent 18%,rgba(227,102,255,.12) 36%,rgba(255,255,255,.08) 44%,transparent 58%),
    radial-gradient(ellipse at 50% -8%,rgba(255,246,255,.22),transparent 34rem);
  mix-blend-mode:screen;
  animation:tmGalaxyAurora 22s ease-in-out infinite alternate;
}
body[data-theme-engine="v257"].theme-violet :where(#s-app,.screen,.app-body,.tab-content.tab-popup-active){
  background-color:transparent !important;
}
body[data-theme-engine="v257"].theme-violet :where(.card,.panel,.staff-panel,.summary-card,.collection-section,.theme-card-premium,.tab-content.tab-popup-active,.modal){
  background:
    radial-gradient(circle at 11% 14%,rgba(255,255,255,.20) 0 1px,transparent 2.2px),
    radial-gradient(circle at 86% 19%,rgba(201,240,255,.17) 0 1px,transparent 2.2px),
    radial-gradient(ellipse at top left,rgba(155,124,255,.18),transparent 38%),
    radial-gradient(ellipse at bottom right,rgba(115,216,255,.11),transparent 34%),
    var(--tm-card-bg) !important;
}
body[data-theme-engine="v257"].theme-green::before{
  inset:0;
  z-index:0;
  opacity:.72;
  background:
    radial-gradient(ellipse at 16% 2%,rgba(84,210,117,.24),transparent 28rem),
    radial-gradient(ellipse at 88% 18%,rgba(213,183,93,.12),transparent 18rem),
    repeating-linear-gradient(118deg,rgba(90,190,98,.075) 0 2px,transparent 2px 34px),
    repeating-linear-gradient(62deg,rgba(213,183,93,.050) 0 1px,transparent 1px 42px);
}
body[data-theme-engine="v257"].theme-green::after{
  left:0;
  right:0;
  bottom:0;
  height:330px;
  z-index:0;
  opacity:.86;
  background:
    radial-gradient(ellipse at 8% 100%,rgba(25,126,55,.48),transparent 32rem),
    radial-gradient(ellipse at 94% 100%,rgba(13,88,45,.44),transparent 30rem),
    linear-gradient(180deg,rgba(6,19,11,0),rgba(5,23,10,.42) 42%,rgba(2,11,5,.90) 100%);
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
@keyframes tmGalaxyStars{
  0%{background-position:18px 30px,86px 14px,22px 108px,45px 66px;}
  100%{background-position:72px 178px,14px 192px,124px 280px,6px 214px;}
}
@keyframes tmGalaxyTwinkle{
  0%,100%{opacity:.72;filter:brightness(.92);}
  38%{opacity:1;filter:brightness(1.22);}
  68%{opacity:.84;filter:brightness(1.05);}
}
@keyframes tmGalaxyNebula{
  0%{transform:translate3d(-1.5%,-1%,0) scale(1.04) rotate(-1deg);opacity:.72;}
  100%{transform:translate3d(2.4%,1.4%,0) scale(1.08) rotate(1.4deg);opacity:1;}
}
@keyframes tmGalaxyAurora{
  0%{transform:translate3d(-2%,-1%,0) scale(1.03);opacity:.66;}
  100%{transform:translate3d(2%,1.4%,0) scale(1.08);opacity:.96;}
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
  border-color:color-mix(in srgb,var(--card-a,var(--tm-accent)) 62%,white 8%) !important;
  background:radial-gradient(circle at 14% 8%,color-mix(in srgb,var(--card-a,var(--tm-accent)) 28%,transparent),transparent 38%),radial-gradient(circle at 94% 18%,color-mix(in srgb,var(--card-b,var(--tm-accent-bright)) 24%,transparent),transparent 34%),linear-gradient(180deg,color-mix(in srgb,var(--card-bg,var(--tm-bg2)) 32%,rgba(255,255,255,.12)),var(--tm-card-bg-strong)) !important;
  box-shadow:0 24px 54px color-mix(in srgb,var(--card-a,var(--tm-accent)) 18%,rgba(0,0,0,.30)),0 0 0 1px color-mix(in srgb,var(--card-b,var(--tm-accent-bright)) 24%,transparent) inset !important;
}
body[data-theme-engine="v257"] :where(.theme-card-premium,.collection-card)::before{
  content:"";
  position:absolute;
  inset:0;
  pointer-events:none;
  z-index:0;
  background:radial-gradient(circle at 16% 0%,color-mix(in srgb,var(--card-a,var(--tm-accent)) 18%,transparent),transparent 34%),linear-gradient(135deg,color-mix(in srgb,var(--card-a,var(--tm-accent)) 10%,transparent),transparent 42%,color-mix(in srgb,var(--card-b,var(--tm-accent-bright)) 10%,transparent));
  opacity:.72;
  transition:opacity .18s ease, transform .18s ease;
}
body[data-theme-engine="v257"] :where(.theme-card-premium,.collection-card):hover::before{opacity:1;transform:scale(1.025);}
body[data-theme-engine="v257"] .theme-card-premium > *,
body[data-theme-engine="v257"] .collection-card > *,
body[data-theme-engine="v257"] .db-theme-admin-item > *{position:relative;z-index:1;}
body[data-theme-engine="v257"] .np-theme-vault-card{
  cursor:pointer !important;
  min-height:330px !important;
  isolation:isolate;
}
body[data-theme-engine="v257"] .np-theme-vault-card[data-theme-state]::after{
  content:none !important;
  display:none !important;
}
body[data-theme-engine="v257"] .np-theme-vault-card.th-locked{
  filter:saturate(.55);
  opacity:.72;
}
body[data-theme-engine="v257"] .np-theme-vault-card.th-locked:hover{
  filter:saturate(.72);
}
body[data-theme-engine="v257"] .theme-card-body{display:flex;flex-direction:column;gap:7px;}
body[data-theme-engine="v257"] .theme-title{
  font-family:var(--fd);
  font-size:13px;
  letter-spacing:2.4px;
  text-transform:uppercase;
  color:var(--tm-text);
  line-height:1.25;
}
body[data-theme-engine="v257"] .theme-card-note{
  color:var(--tm-text-muted);
  font-size:12px;
  font-style:italic;
}
body[data-theme-engine="v257"] .theme-card-state{
  margin-left:auto;
  font-size:10px;
  font-weight:900;
  letter-spacing:.08em;
  text-transform:uppercase;
  color:color-mix(in srgb,var(--card-a,var(--tm-accent)) 72%,var(--tm-text));
}
body[data-theme-engine="v257"] .theme-card-action{
  margin-top:auto;
  min-height:38px;
  display:flex;
  align-items:center;
  justify-content:center;
  border-radius:14px;
  border:1px solid color-mix(in srgb,var(--card-a,var(--tm-accent)) 38%,transparent);
  background:linear-gradient(90deg,color-mix(in srgb,var(--card-a,var(--tm-accent)) 22%,transparent),color-mix(in srgb,var(--card-b,var(--tm-accent-bright)) 16%,transparent));
  color:var(--tm-text);
  font-family:var(--fd);
  font-size:10px;
  letter-spacing:2px;
  text-transform:uppercase;
}
body[data-theme-engine="v257"] .np-theme-vault-card:hover .theme-card-action{
  background:linear-gradient(90deg,var(--card-a,var(--tm-accent)),var(--card-b,var(--tm-accent-bright))) !important;
  color:var(--tm-primary-text) !important;
  border-color:rgba(255,255,255,.28);
}
body[data-theme-engine="v257"] .theme-palette{display:inline-flex;gap:4px;align-items:center;margin-left:auto;}
body[data-theme-engine="v257"] .theme-swatch{
  width:16px;height:16px;border-radius:999px;
  border:1px solid rgba(255,255,255,.22);
  box-shadow:0 0 0 1px rgba(0,0,0,.10);
}
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
  background:radial-gradient(circle at 18% 16%,color-mix(in srgb,var(--card-a,var(--preview-a,#7eb8d4)) 32%,transparent),transparent 38%),radial-gradient(circle at 86% 20%,color-mix(in srgb,var(--card-b,var(--preview-c,#c9a84c)) 30%,transparent),transparent 34%),linear-gradient(145deg,var(--preview-bg,var(--card-bg,#0d0e18)),var(--preview-bg2,#151a2a)) !important;
  border:1px solid color-mix(in srgb,var(--card-a,var(--preview-a,#7eb8d4)) 34%,rgba(255,255,255,.06)) !important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 12px 28px color-mix(in srgb,var(--card-a,var(--preview-a,#7eb8d4)) 14%,rgba(0,0,0,.18)) !important;
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
body[data-theme-engine="v257"] .np-theme-vault-card .theme-preview-mini[data-preview-theme="dark"]{--preview-bg:#0d0e18;--preview-bg2:#151a2a;--preview-a:#7eb8d4;--preview-b:#c9a84c;--preview-c:#f0d78a;}
body[data-theme-engine="v257"] .np-theme-vault-card .theme-preview-mini[data-preview-theme="light"]{--preview-bg:#f4f5fa;--preview-bg2:#ffffff;--preview-a:#3a8fba;--preview-b:#9a7020;--preview-c:#d7a84e;}
body[data-theme-engine="v257"] .np-theme-vault-card .theme-preview-mini[data-preview-theme="violet"]{--preview-bg:#05010f;--preview-bg2:#1e0c43;--preview-a:#b773ff;--preview-b:#6aaeff;--preview-c:#f0d5ff;}
body[data-theme-engine="v257"] .np-theme-vault-card .theme-preview-mini[data-preview-theme="red"]{--preview-bg:#160d0d;--preview-bg2:#2b1114;--preview-a:#d45050;--preview-b:#c9a84c;--preview-c:#ff9a9a;}
body[data-theme-engine="v257"] .np-theme-vault-card .theme-preview-mini[data-preview-theme="green"]{--preview-bg:#06130b;--preview-bg2:#12351d;--preview-a:#39b66b;--preview-b:#d5b75d;--preview-c:#a8f1b0;}
body[data-theme-engine="v257"] .np-theme-vault-card .theme-preview-mini[data-preview-theme="easter"]{--preview-bg:#f7fff2;--preview-bg2:#e7f8de;--preview-a:#7fdc82;--preview-b:#ffd86b;--preview-c:#ffb6d8;color:#213326 !important;}
body[data-theme-engine="v257"] .np-theme-vault-card .theme-preview-mini[data-preview-theme="halloween"]{--preview-bg:#0a0911;--preview-bg2:#16111f;--preview-a:#ff8f2b;--preview-b:#7c59ff;--preview-c:#d8d2ff;}
body[data-theme-engine="v257"] .np-theme-vault-card .theme-preview-mini[data-preview-theme="noel"]{--preview-bg:#08140d;--preview-bg2:#122219;--preview-a:#d84a52;--preview-b:#2ea85f;--preview-c:#f2c66d;}
body[data-theme-engine="v257"] .np-theme-vault-card .theme-preview-mini[data-preview-theme="aquaris"]{--preview-bg:#011018;--preview-bg2:#0b3442;--preview-a:#48d6ef;--preview-b:#8ef4ff;--preview-c:#e5c878;}
body[data-theme-engine="v257"] .np-theme-vault-card .theme-preview-mini[data-preview-theme="bloodmoon"]{--preview-bg:#050102;--preview-bg2:#210812;--preview-a:#e3133f;--preview-b:#ff7d92;--preview-c:#f0c76f;}
body[data-theme-engine="v257"] .np-theme-vault-card .theme-preview-mini[data-preview-theme]{
  background:radial-gradient(circle at 18% 16%,color-mix(in srgb,var(--preview-a) 32%,transparent),transparent 38%),radial-gradient(circle at 86% 20%,color-mix(in srgb,var(--preview-c) 30%,transparent),transparent 34%),linear-gradient(145deg,var(--preview-bg),var(--preview-bg2)) !important;
  border-color:color-mix(in srgb,var(--preview-a) 36%,rgba(255,255,255,.08)) !important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.10),0 12px 28px color-mix(in srgb,var(--preview-a) 16%,rgba(0,0,0,.18)) !important;
}
body[data-theme-engine="v257"] .np-theme-vault-card .theme-preview-mini[data-preview-theme="aquaris"]{
  background:radial-gradient(circle at 84% 12%,rgba(229,200,120,.20),transparent 26%),radial-gradient(circle at 12% 86%,rgba(72,214,239,.20),transparent 30%),repeating-linear-gradient(106deg,rgba(130,238,255,.08) 0 2px,transparent 2px 24px),linear-gradient(145deg,#011018,#0b3442) !important;
}
body[data-theme-engine="v257"] .np-theme-vault-card .theme-preview-mini[data-preview-theme="bloodmoon"]{
  background:radial-gradient(circle at 84% 12%,rgba(227,19,63,.30),transparent 27%),radial-gradient(circle at 18% 86%,rgba(240,199,111,.10),transparent 26%),linear-gradient(145deg,#050102,#210812) !important;
}
body[data-theme-engine="v257"] .np-theme-vault-card .theme-preview-mini[data-preview-theme="violet"]{
  background:
    radial-gradient(circle at 11% 20%,rgba(255,255,255,.96) 0 1px,transparent 2px),
    radial-gradient(circle at 27% 12%,rgba(224,195,255,.86) 0 1px,transparent 2px),
    radial-gradient(circle at 41% 32%,rgba(255,255,255,.82) 0 1.2px,transparent 2.2px),
    radial-gradient(circle at 63% 16%,rgba(202,224,255,.84) 0 1px,transparent 2px),
    radial-gradient(circle at 81% 27%,rgba(255,255,255,.90) 0 1px,transparent 2px),
    radial-gradient(ellipse at 18% 24%,rgba(183,115,255,.46),transparent 40%),
    radial-gradient(ellipse at 84% 18%,rgba(106,174,255,.30),transparent 36%),
    radial-gradient(ellipse at 64% 90%,rgba(240,213,255,.22),transparent 42%),
    linear-gradient(145deg,#05010f,#1e0c43 56%,#09031a) !important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 16px 34px rgba(67,22,128,.34),0 0 0 1px rgba(240,213,255,.10) !important;
}
body[data-theme-engine="v257"] .np-theme-vault-card .theme-preview-mini[data-preview-theme="violet"] .theme-preview-head{
  height:22px !important;
  border-radius:18px !important;
  background:
    radial-gradient(circle at 16% 50%,rgba(255,255,255,.98) 0 1px,transparent 2px),
    radial-gradient(circle at 42% 34%,rgba(220,193,255,.92) 0 1px,transparent 2px),
    radial-gradient(circle at 78% 58%,rgba(205,228,255,.88) 0 1px,transparent 2px),
    linear-gradient(100deg,rgba(49,18,105,.92),rgba(183,115,255,.92) 42%,rgba(106,174,255,.80),rgba(240,213,255,.96)) !important;
  box-shadow:0 0 20px rgba(183,115,255,.28),inset 0 1px 0 rgba(255,255,255,.24) !important;
}
body[data-theme-engine="v257"] .np-theme-vault-card .theme-preview-mini[data-preview-theme="violet"] .theme-preview-bar{
  background:linear-gradient(90deg,rgba(183,115,255,.24),#b773ff,#6aaeff,#f0d5ff) !important;
}
body[data-theme-engine="v257"] .np-theme-vault-card .theme-preview-mini[data-preview-theme="green"]{
  background:radial-gradient(ellipse at 18% 12%,rgba(57,182,107,.38),transparent 35%),radial-gradient(ellipse at 84% 20%,rgba(213,183,93,.18),transparent 28%),repeating-linear-gradient(128deg,rgba(168,241,176,.10) 0 2px,transparent 2px 18px),linear-gradient(145deg,#06130b,#12351d) !important;
}
body[data-theme-engine="v257"] .np-theme-vault-card .theme-preview-mini[data-preview-theme]:not([data-preview-theme="violet"]) .theme-preview-head{background:linear-gradient(90deg,var(--preview-a),var(--preview-c)) !important;}
body[data-theme-engine="v257"] .np-theme-vault-card .theme-preview-mini[data-preview-theme]:not([data-preview-theme="violet"]) .theme-preview-bar{background:linear-gradient(90deg,var(--preview-a),var(--preview-b),var(--preview-c)) !important;}
body[data-theme-engine="v257"] .np-theme-vault-card .theme-preview-mini[data-preview-theme] .theme-preview-cards span{background:linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.05)),color-mix(in srgb,var(--preview-a) 14%,rgba(255,255,255,.06)) !important;}
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
body[data-theme-engine="v257"] .np-theme-hero{
  position:relative;
  overflow:hidden;
  padding:22px !important;
  background:radial-gradient(circle at 8% 0%,rgba(var(--tm-accent-rgb),.18),transparent 30%),radial-gradient(circle at 92% 10%,rgba(var(--tm-accent-2-rgb),.16),transparent 32%),var(--tm-card-bg-strong) !important;
}
body[data-theme-engine="v257"] .np-theme-hero::before{
  content:"";
  position:absolute;
  inset:auto 18px 0 18px;
  height:2px;
  background:linear-gradient(90deg,transparent,var(--tm-accent),var(--tm-accent-bright),transparent);
  opacity:.72;
}
body[data-theme-engine="v257"] .np-theme-hero-title{font-size:1.35rem;font-weight:950;margin:0 0 6px;color:var(--tm-text);letter-spacing:.02em;}
body[data-theme-engine="v257"] .np-theme-hero-sub{margin:0;color:var(--tm-text-muted);line-height:1.55;}
body[data-theme-engine="v257"] .np-theme-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:16px;}
body[data-theme-engine="v257"] .np-theme-stat{padding:12px;border-radius:16px;background:linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.018)),rgba(var(--tm-accent-rgb),.055);border:1px solid var(--tm-border);}
body[data-theme-engine="v257"] .np-theme-stat-value{font-size:1.1rem;font-weight:900;line-height:1;margin-bottom:6px;}
body[data-theme-engine="v257"] .np-theme-stat-label{font-size:.78rem;font-weight:750;color:var(--tm-text-muted);}
body[data-theme-engine="v257"] .np-theme-progress{
  margin-top:16px;
  padding:14px;
  border-radius:18px;
  border:1px solid var(--tm-border);
  background:rgba(var(--tm-accent-rgb),.055);
}
body[data-theme-engine="v257"] .np-theme-progress-top{display:flex;justify-content:space-between;gap:12px;margin-bottom:10px;color:var(--tm-text-soft);font-weight:850;}
body[data-theme-engine="v257"] .np-theme-progress-track{height:12px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.06);}
body[data-theme-engine="v257"] .np-theme-progress-fill{height:100%;width:var(--owned-pct,0%);border-radius:999px;background:linear-gradient(90deg,var(--tm-accent),var(--tm-accent-bright));box-shadow:0 0 20px rgba(var(--tm-accent-rgb),.24);}
body[data-theme-engine="v257"] .np-theme-rarity-lane{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;}
body[data-theme-engine="v257"] .np-theme-rarity-chip{display:inline-flex;align-items:center;gap:7px;min-height:28px;border-radius:999px;padding:0 11px;border:1px solid var(--tm-border);background:rgba(var(--tm-accent-rgb),.075);color:var(--tm-text-soft);font-size:12px;font-weight:850;}
body[data-theme-engine="v257"] .np-theme-rarity-chip strong{color:var(--tm-accent-bright);}
body[data-theme-engine="v257"] .np-theme-toolbar{display:flex !important;flex-wrap:wrap !important;gap:10px !important;align-items:center !important;}
body[data-theme-engine="v257"] .np-theme-search{flex:1 1 220px;min-height:42px;border-radius:14px;padding:0 12px;}
body[data-theme-engine="v257"] .np-theme-quick-filters{
  flex:1 1 100%;
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  align-items:center;
}
body[data-theme-engine="v257"] .np-theme-select{flex:0 1 180px;min-height:42px;border-radius:14px;padding:0 12px;}
body[data-theme-engine="v257"] .np-theme-filter-btn{
  min-height:34px;
  border-radius:999px;
  padding:0 13px;
  border:1px solid var(--tm-border);
  background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.018)),rgba(var(--tm-accent-rgb),.045);
  color:var(--tm-text-soft);
  font-size:12px;
  font-weight:850;
  cursor:pointer;
}
body[data-theme-engine="v257"] .np-theme-filter-btn:hover,
body[data-theme-engine="v257"] .np-theme-filter-btn.active{
  background:linear-gradient(90deg,rgba(var(--tm-accent-rgb),.24),rgba(var(--tm-accent-2-rgb),.14)) !important;
  border-color:var(--tm-border-strong) !important;
  color:var(--tm-text) !important;
  transform:translateY(-1px);
}
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
body[data-theme-engine="v257"] :where(
  .hdr-logo,.login-logo h1,.nav-group-btn.has-active,.nav-dropdown-btn.has-active,
  .nav-item.active,.nav-dropdown-item.active,.hdr-av-txt,.plvl,.sicls,.edot,.iiqty,
  .snm,.sstv,.bclbl,.rsec h2,.hlbox strong,.prog-tab.active,.xp-prev-val,
  .card-title,.nav-section-header,.sl-kicker,.arc-log-round,.arc-pill-soft,
  .arc-summary-chip-glacier,.npdiag-info,.np-staff-menu-hint
){
  color:var(--tm-accent) !important;
}
body[data-theme-engine="v257"] :where(
  .hdr-profile::after,.hdr-settings:hover,.rsec ul li::before,.esll,.nav-group-label,
  .nav-section-label,.nav-section-header,.card-title,.arc-log-round
){
  color:var(--tm-accent-dim) !important;
}
body[data-theme-engine="v257"] :where(
  .login-card,.app-header,.nav-group-menu,.nav-dropdown-menu,.card,.tab-content.tab-popup-active,
  .hdr-badge,.btn,.tgl,.plvl,.brbox,.quote,.bar,.prow,.ezon,.esl.hl,
  .sim-panel-player,#p-combat-mj-c .sim-panel-player,#p-combat-mj-c .arc-pill-soft,
  #p-apparitions-c .sl-card,#p-apparitions-c .sl-btn,#p-apparitions-c .sl-field input,
  #p-apparitions-c .sl-field select,#bestiaire .beast-admin-detail,#bestiaire .beast-admin-hero-media,
  #bestiaire .beast-admin-detail-stat,#bestiaire .beast-admin-detail-block,
  #bestiaire .beast-admin-completeness span,#bestiaire .beast-admin-last-combats span
){
  border-color:rgba(var(--tm-accent-rgb),.18) !important;
}
body[data-theme-engine="v257"] :where(.nav-item:hover,.nav-dropdown-item:hover,.tgl,.prow:hover,.prow.sel,.ezon.has,.arc-pill-soft,.npdiag-info){
  background:rgba(var(--tm-accent-rgb),.08) !important;
}
body[data-theme-engine="v257"] :where(.btn)::before{
  background:rgba(var(--tm-accent-rgb),.08) !important;
}
body[data-theme-engine="v257"] :where(.bar){
  background:rgba(var(--tm-accent-rgb),.06) !important;
}
body[data-theme-engine="v257"] :where(.login-card,.card,.tab-content.tab-popup-active)::before,
body[data-theme-engine="v257"] :where(.app-header)::after{
  background:linear-gradient(90deg,transparent,rgba(var(--tm-accent-rgb),.28),transparent) !important;
}
body[data-theme-engine="v257"] :where(.rsec h2,.prog-tab.active,.ltab-btn.active,.nav-dropdown-btn.has-active){
  border-color:var(--tm-accent) !important;
}
body[data-theme-engine="v257"] :where(.rsec h4,.quote,.brbox,.plvl,.hdr-badge){
  border-color:rgba(var(--tm-accent-rgb),.24) !important;
}
body[data-theme-engine="v257"] :where(.part-slider){
  accent-color:var(--tm-accent) !important;
}
body[data-theme-engine="v257"] ::-webkit-scrollbar-thumb{
  background:rgba(var(--tm-accent-rgb),.24) !important;
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
body[data-theme-engine="v257"] [style*="color:rgba(184,222,238"],
body[data-theme-engine="v257"] [style*="color: rgba(184,222,238"],
body[data-theme-engine="v257"] [style*="color:#7eb8d4"],
body[data-theme-engine="v257"] [style*="color: #7eb8d4"],
body[data-theme-engine="v257"] [style*="color:#b0d8ec"],
body[data-theme-engine="v257"] [style*="color: #b0d8ec"],
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
body[data-theme-engine="v257"] [style*="border-color: #7eb8d4"],
body[data-theme-engine="v257"] [style*="border-left:2px solid #7eb8d4"],
body[data-theme-engine="v257"] [style*="border-left: 2px solid #7eb8d4"],
body[data-theme-engine="v257"] [style*="border-left:2px solid var(--glacier"],
body[data-theme-engine="v257"] [style*="border-left: 2px solid var(--glacier"]{
  border-color:rgba(var(--tm-accent-rgb),.28) !important;
}
body[data-theme-engine="v257"] [style*="border-bottom:1px solid rgba(126,184,212"],
body[data-theme-engine="v257"] [style*="border-bottom: 1px solid rgba(126,184,212"]{
  border-bottom-color:rgba(var(--tm-accent-rgb),.24) !important;
}
body[data-theme-engine="v257"] [style*="background:rgba(126,184,212"],
body[data-theme-engine="v257"] [style*="background: rgba(126,184,212"],
body[data-theme-engine="v257"] [style*="background:var(--glow"],
body[data-theme-engine="v257"] [style*="background: var(--glow"]{
  background:rgba(var(--tm-accent-rgb),.10) !important;
}
body[data-theme-engine="v257"] [style*="background:linear-gradient"][style*="126,184,212"],
body[data-theme-engine="v257"] [style*="background: linear-gradient"][style*="126,184,212"],
body[data-theme-engine="v257"] [style*="background:linear-gradient"][style*="74,125,150"],
body[data-theme-engine="v257"] [style*="background: linear-gradient"][style*="74,125,150"]{
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
    ORDER.forEach(function(key){
      var conf = CONFIG[key];
      if(conf && conf.cls && conf.cls !== c.cls) document.body.classList.remove(conf.cls);
    });
    if(c.id !== 'light') document.body.classList.remove('light');
    if(c.cls && !document.body.classList.contains(c.cls)) document.body.classList.add(c.cls);
    else if(c.id === 'light' && !document.body.classList.contains('light')) document.body.classList.add('light');
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
    if(c.id === 'violet'){
      panelBase = 'linear-gradient(180deg,rgba(255,255,255,.085),rgba(255,255,255,.028)),radial-gradient(ellipse at 12% 0%,rgba(155,124,255,.18),transparent 44%),radial-gradient(ellipse at 92% 100%,rgba(115,216,255,.10),transparent 36%),rgba(8,5,28,.72)';
      panelStrong = 'linear-gradient(180deg,rgba(255,255,255,.115),rgba(255,255,255,.040)),radial-gradient(ellipse at 10% 0%,rgba(155,124,255,.24),transparent 46%),radial-gradient(ellipse at 90% 100%,rgba(115,216,255,.14),transparent 38%),rgba(13,8,42,.82)';
      controlBase = 'linear-gradient(180deg,rgba(255,255,255,.105),rgba(255,255,255,.032)),linear-gradient(100deg,rgba(155,124,255,.18),rgba(115,216,255,.08)),rgba(11,8,35,.76)';
      controlHover = 'linear-gradient(180deg,rgba(255,255,255,.145),rgba(255,255,255,.048)),linear-gradient(100deg,rgba(155,124,255,.28),rgba(115,216,255,.14)),rgba(16,10,50,.88)';
      inputBase = 'linear-gradient(180deg,rgba(255,255,255,.060),rgba(255,255,255,.018)),rgba(5,3,20,.78)';
      shadow = '0 26px 58px rgba(2,0,16,.44),0 0 34px rgba(155,124,255,.10),inset 0 1px 0 rgba(255,255,255,.08)';
      shadowSoft = '0 16px 34px rgba(2,0,16,.34),0 0 22px rgba(115,216,255,.07),inset 0 1px 0 rgba(255,255,255,.06)';
    }
    if(c.id === 'green'){
      panelBase = 'radial-gradient(ellipse at 12% 0%,rgba(57,182,107,.13),transparent 42%),radial-gradient(ellipse at 92% 100%,rgba(213,183,93,.08),transparent 36%),linear-gradient(180deg,rgba(255,255,255,.050),rgba(255,255,255,.016)),linear-gradient(180deg,#12351d,#07180d)';
      panelStrong = 'radial-gradient(ellipse at 10% 0%,rgba(57,182,107,.18),transparent 44%),radial-gradient(ellipse at 86% 100%,rgba(213,183,93,.11),transparent 38%),linear-gradient(180deg,rgba(255,255,255,.070),rgba(255,255,255,.022)),linear-gradient(180deg,#1a4728,#0b2212)';
      controlBase = 'linear-gradient(180deg,rgba(255,255,255,.070),rgba(255,255,255,.024)),linear-gradient(90deg,rgba(57,182,107,.16),rgba(213,183,93,.07)),rgba(8,32,16,.82)';
      controlHover = 'linear-gradient(180deg,rgba(255,255,255,.105),rgba(255,255,255,.034)),linear-gradient(90deg,rgba(57,182,107,.24),rgba(213,183,93,.12)),rgba(11,45,22,.90)';
      inputBase = 'linear-gradient(180deg,rgba(255,255,255,.040),rgba(255,255,255,.014)),rgba(3,17,8,.82)';
      shadow = '0 24px 50px rgba(0,18,6,.34), inset 0 1px 0 rgba(198,255,210,.045)';
      shadowSoft = '0 14px 30px rgba(0,18,6,.24), inset 0 1px 0 rgba(198,255,210,.035)';
    }
    var finalSoft = c.tone === 'light' ? 'rgba(54,75,64,.76)' : 'rgba(232,240,248,.76)';
    var finalStrong = c.tone === 'light' ? 'rgba(25,36,30,.94)' : 'rgba(248,252,255,.96)';
    var finalPress = c.tone === 'light'
      ? controlBase
      : 'linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.018)),linear-gradient(90deg,rgba(' + v.accentRgb + ',.12),rgba(' + v.accentRgb + ',.05))';
    var finalPressStrong = c.tone === 'light'
      ? controlHover
      : 'linear-gradient(180deg,rgba(255,255,255,.085),rgba(255,255,255,.03)),linear-gradient(90deg,rgba(' + v.accentRgb + ',.18),rgba(' + v.accentRgb + ',.08))';
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
    root.setProperty('--accent-rgb', v.accentRgb);
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
    root.setProperty('--theme-final-border-soft', 'rgba(' + v.accentRgb + ',.18)');
    root.setProperty('--theme-final-border-strong', 'rgba(' + v.accentRgb + ',.34)');
    root.setProperty('--theme-final-panel', panelBase);
    root.setProperty('--theme-final-panel-soft', panelStrong);
    root.setProperty('--theme-final-press', finalPress);
    root.setProperty('--theme-final-press-strong', finalPressStrong);
    root.setProperty('--theme-final-table-even', 'rgba(' + v.accentRgb + ',.05)');
    root.setProperty('--theme-final-table-hover', 'rgba(' + v.accentRgb + ',.09)');
    root.setProperty('--theme-final-soft', finalSoft);
    root.setProperty('--theme-final-strong', finalStrong);
    root.setProperty('--theme-final-shadow', shadowSoft);
    root.setProperty('--np-ui-text', v.text);
    root.setProperty('--np-ui-text-soft', textSoft);
    root.setProperty('--np-ui-muted', textMuted);
    root.setProperty('--np-ui-border-soft', 'rgba(' + v.accentRgb + ',.18)');
    root.setProperty('--np-ui-border-strong', 'rgba(' + v.accentRgb + ',.30)');
    root.setProperty('--np-ui-panel-surface', panelBase);
    root.setProperty('--np-ui-panel-surface-strong', panelStrong);
    root.setProperty('--np-ui-button-bg', controlBase);
    root.setProperty('--np-ui-button-hover', controlHover);
    root.setProperty('--np-ui-input-bg', inputBase);
    root.setProperty('--np-ui-header-bg', panelStrong);
    root.setProperty('--np-ui-dropdown-bg', panelStrong);
    root.setProperty('--np-ui-chip-bg', 'linear-gradient(90deg,rgba(' + v.accentRgb + ',.13),rgba(' + v.accentRgb + ',.08))');
    root.setProperty('--np-ui-shadow', shadowSoft);
    root.setProperty('--np-ui-header-shadow', shadowSoft);
    root.setProperty('--accent-solid-fg', c.tone === 'light' ? '#071019' : '#f8fcff');
    root.setProperty('--accent-solid-shadow', c.tone === 'light' ? 'rgba(255,255,255,.45)' : 'rgba(0,0,0,.35)');

    document.body.setAttribute('data-theme-engine', ENGINE_VERSION);
    document.body.setAttribute('data-theme-active', c.id);
    document.body.setAttribute('data-theme-tone', c.tone || 'dark');
    document.documentElement.setAttribute('data-theme-engine', ENGINE_VERSION);
    document.documentElement.setAttribute('data-theme-active', c.id);
    document.documentElement.setAttribute('data-theme-tone', c.tone || 'dark');
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
      var order = { 'Équipé':-1, 'Base':0, 'Classiques':1, 'Saisonniers':2, 'Rares':3, 'Fondateur':4, 'Secrets':9 };
      return Object.prototype.hasOwnProperty.call(order, category) ? order[category] : 5;
    };

    window.rarityTone = function(rarity){
      rarity = String(rarity || '').toLowerCase();
      if(rarity.indexOf('fondateur') >= 0) return 'gold';
      if(rarity.indexOf('mythique') >= 0) return 'danger';
      if(rarity.indexOf('rare') >= 0) return 'gold';
      if(rarity.indexOf('premium') >= 0) return 'gold';
      if(rarity.indexOf('saisonnier') >= 0) return 'event';
      if(rarity.indexOf('secret') >= 0) return 'secret';
      return 'default';
    };

    window.themeRestrictionLabel = function(themeId){
      var c = cfg(themeId);
      if(c.rarity === 'Fondateur') return 'Fondateur';
      if(c.rarity === 'Mythique') return 'Mythique';
      if(c.rarity === 'Rare') return 'Rare';
      if(c.rarity === 'Premium') return 'Premium';
      if(c.rarity === 'Saisonnier') return 'Saisonnier';
      return c.rarity || 'Thème';
    };

    window.themeMaxAuditReport = function(){
      var activeClasses = [];
      try{
        ORDER.forEach(function(id){
          var conf = CONFIG[id];
          if(conf && conf.cls && document.body.classList.contains(conf.cls)) activeClasses.push(conf.cls);
        });
        if(document.body.classList.contains('light')) activeClasses.push('light');
      }catch(e){}
      return {
        version:ENGINE_VERSION,
        active:activeTheme(),
        activeClasses:activeClasses,
        isolated:activeClasses.length <= 1,
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
    if(txt.indexOf('galactique') >= 0 || txt.indexOf('abyssal') >= 0 || txt.indexOf('violet') >= 0) return 'violet';
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
      var colors = c.colors || CONFIG.dark.colors;
      card.setAttribute('data-theme-id', c.id);
      card.setAttribute('data-theme-rarity', c.rarity);
      card.setAttribute('data-theme-category', c.category);
      card.setAttribute('data-theme-state', inferCardState(card, c.id));
      card.style.setProperty('--card-bg', colors[0] || c.vars.bg);
      card.style.setProperty('--card-a', colors[1] || c.vars.accent);
      card.style.setProperty('--card-b', colors[2] || c.vars.accentBright);
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
      if(raw){
        var saved = Object.assign({q:'', rarity:'all', state:'all', sort:'recommended'}, JSON.parse(raw));
        if(saved.rarity === 'Premium') saved.rarity = 'Rare';
        return saved;
      }
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
      hero.innerHTML = '<h2 class="np-theme-hero-title">Collection des thèmes</h2><p class="np-theme-hero-sub">Construis ta galerie de thèmes, équipe tes trouvailles et suis ta progression entre classiques, événements, rares et fondateurs.</p><div class="np-theme-stats"></div><div class="np-theme-progress"></div>';
      root.insertBefore(hero, root.firstChild);
    }

    var toolbar = root.querySelector('.np-theme-toolbar');
    if(!toolbar){
      toolbar = document.createElement('div');
      toolbar.className = 'np-theme-toolbar';
      toolbar.innerHTML = [
        '<input class="np-theme-search" type="search" placeholder="Rechercher un thème…">',
        '<div class="np-theme-quick-filters" aria-label="Filtres rapides de rareté">',
        '<button type="button" class="np-theme-filter-btn" data-rarity-filter="all">Tous</button>',
        '<button type="button" class="np-theme-filter-btn" data-rarity-filter="common">Communs</button>',
        '<button type="button" class="np-theme-filter-btn" data-rarity-filter="Saisonnier">Événement</button>',
        '<button type="button" class="np-theme-filter-btn" data-rarity-filter="rare">Rares</button>',
        '<button type="button" class="np-theme-filter-btn" data-rarity-filter="Fondateur">Fondateur</button>',
        '</div>',
        '<select class="np-theme-select np-theme-rarity"><option value="all">Toutes raretés</option><option>Base</option><option>Classique</option><option>Saisonnier</option><option>Rare</option><option>Fondateur</option><option>Mythique</option></select>',
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
      toolbar.addEventListener('click', function(e){
        var btn = e.target && e.target.closest ? e.target.closest('.np-theme-filter-btn[data-rarity-filter]') : null;
        if(!btn) return;
        var f = loadFilters();
        f.rarity = btn.getAttribute('data-rarity-filter') || 'all';
        saveFilters(f);
        syncToolbar();
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
    if(rarity) rarity.value = /^(Base|Classique|Saisonnier|Rare|Premium|Fondateur|Mythique|all)$/.test(f.rarity || 'all') ? (f.rarity || 'all') : 'all';
    if(state) state.value = f.state || 'all';
    if(sort) sort.value = f.sort || 'recommended';
    Array.prototype.forEach.call(root.querySelectorAll('.np-theme-filter-btn[data-rarity-filter]'), function(btn){
      btn.classList.toggle('active', (btn.getAttribute('data-rarity-filter') || 'all') === (f.rarity || 'all'));
    });
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

  function rarityMatches(filter, rarity){
    if(!filter || filter === 'all') return true;
    if(filter === 'common') return rarity === 'Base' || rarity === 'Classique';
    if(filter === 'rare') return rarity === 'Rare' || rarity === 'Premium' || rarity === 'Mythique';
    return rarity === filter;
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
      if(!rarityMatches(f.rarity, c.rarity)) ok = false;
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
    var cards = getCards();
    var count = {total:cards.length, owned:0, selected:0, rare:0};
    var byRarity = {};
    cards.forEach(function(card){
      var state = card.getAttribute('data-theme-state') || 'available';
      var rarity = card.getAttribute('data-theme-rarity') || '';
      byRarity[rarity] = (byRarity[rarity] || 0) + 1;
      if(state === 'selected'){ count.selected++; count.owned++; }
      else if(state === 'owned') count.owned++;
      if(rarity === 'Rare' || rarity === 'Premium' || rarity === 'Mythique' || rarity === 'Fondateur') count.rare++;
    });
    if(stats){
      stats.innerHTML = [
        ['Total', count.total],
        ['Possédés', count.owned],
        ['Équipé', count.selected],
        ['Rare / Fondateur', count.rare]
      ].map(function(x){
        return '<div class="np-theme-stat"><div class="np-theme-stat-value">'+x[1]+'</div><div class="np-theme-stat-label">'+x[0]+'</div></div>';
      }).join('');
    }
    var progress = root.querySelector('.np-theme-progress');
    if(progress){
      var pct = count.total ? Math.round((count.owned / count.total) * 100) : 0;
      var lane = ['Base','Classique','Saisonnier','Rare','Fondateur','Mythique'].map(function(r){
        return '<span class="np-theme-rarity-chip">'+r+' <strong>'+((byRarity[r] || 0))+'</strong></span>';
      }).join('');
      progress.innerHTML = '<div class="np-theme-progress-top"><span>Progression de collection</span><span>'+count.owned+' / '+count.total+' · '+pct+'%</span></div><div class="np-theme-progress-track" style="--owned-pct:'+pct+'%;"><div class="np-theme-progress-fill"></div></div><div class="np-theme-rarity-lane">'+lane+'</div>';
    }
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
