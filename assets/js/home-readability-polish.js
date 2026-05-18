/* Nuages Polaires — Home & Base Readability Polish v269
   Focus:
   - better first impression on home/pre-login screens
   - stronger readability on the default/base dark theme
   - safer CTA contrast for "Rejoindre l'aventure"
*/
(function(){
  'use strict';

  var VERSION = 'v269';
  var STYLE_ID = 'np-home-readability-polish-v269';
  var TIMER = null;

  function injectStyle(){
    if(document.getElementById(STYLE_ID)) return;

    var css = `
/* === v269 — base readability foundation === */
body[data-theme-active="dark"],
body:not(.light):not(.theme-violet):not(.theme-red):not(.theme-green):not(.theme-easter):not(.theme-halloween):not(.theme-noel):not(.theme-aquaris):not(.theme-bloodmoon){
  --bg:#070a12 !important;
  --bg2:#0d1220 !important;
  --bg3:#141b2c !important;
  --bg4:#1c263a !important;
  --text:#f8fbff !important;
  --dim:#d7e3ec !important;
  --faint:#a8b8c6 !important;
  --glacier:#9bd8f4 !important;
  --glacier-dim:#5ea5c8 !important;
  --glacier-bright:#d2efff !important;
  --gold:#e4bf66 !important;
  --border:rgba(155,216,244,.18) !important;
  --border2:rgba(155,216,244,.30) !important;
  --glow:rgba(155,216,244,.12) !important;
  --glow2:rgba(155,216,244,.08) !important;
  --tm-bg:#070a12;
  --tm-bg2:#0d1220;
  --tm-bg3:#141b2c;
  --tm-bg4:#1c263a;
  --tm-text:#f8fbff;
  --tm-text-soft:rgba(248,251,255,.91);
  --tm-text-muted:rgba(215,227,236,.78);
  --tm-dim:#d7e3ec;
  --tm-faint:#a8b8c6;
  --tm-accent:#9bd8f4;
  --tm-accent-dim:#5ea5c8;
  --tm-accent-bright:#d2efff;
  --tm-accent-rgb:155,216,244;
  --tm-accent-2-rgb:228,191,102;
  --tm-border:rgba(155,216,244,.20);
  --tm-border-strong:rgba(228,191,102,.28);
  --tm-card-bg:linear-gradient(180deg, rgba(255,255,255,.075), rgba(255,255,255,.028)), rgba(13,18,32,.88);
  --tm-card-bg-strong:linear-gradient(180deg, rgba(255,255,255,.095), rgba(255,255,255,.035)), rgba(16,24,42,.93);
  --tm-control-bg:linear-gradient(180deg, rgba(255,255,255,.085), rgba(255,255,255,.030)), rgba(15,23,39,.88);
  --tm-control-bg-hover:linear-gradient(180deg, rgba(255,255,255,.13), rgba(255,255,255,.045)), rgba(20,31,52,.94);
  --tm-input-bg:rgba(8,13,24,.82);
  --tm-page-bg:
    radial-gradient(circle at 18% 10%, rgba(155,216,244,.18), transparent 24rem),
    radial-gradient(circle at 82% 84%, rgba(228,191,102,.10), transparent 28rem),
    linear-gradient(180deg,#070a12 0%,#0d1220 48%,#04070d 100%);
}
body[data-theme-active="dark"] :where(.card,.panel,.staff-panel,.modal,.login-card,.collection-card,.db-card,.theme-card-premium,.archive-card,.history-card,.summary-card,.home-footer-item,.bcrd,.prog-panel,.sim-panel,.sim-fighter-card,.sim-log,.sim-history),
body:not(.light):not(.theme-violet):not(.theme-red):not(.theme-green):not(.theme-easter):not(.theme-halloween):not(.theme-noel):not(.theme-aquaris):not(.theme-bloodmoon) :where(.card,.panel,.staff-panel,.modal,.login-card,.collection-card,.db-card,.theme-card-premium,.archive-card,.history-card,.summary-card,.home-footer-item,.bcrd,.prog-panel,.sim-panel,.sim-fighter-card,.sim-log,.sim-history){
  background:var(--tm-card-bg) !important;
  border-color:var(--tm-border) !important;
  color:var(--tm-text) !important;
  box-shadow:0 16px 34px rgba(0,0,0,.26), inset 0 1px 0 rgba(255,255,255,.055) !important;
}
body[data-theme-active="dark"] :where(.desc,.sub,.muted,.small,.help,.note,.tagline,.hint,.faint),
body:not(.light):not(.theme-violet):not(.theme-red):not(.theme-green):not(.theme-easter):not(.theme-halloween):not(.theme-noel):not(.theme-aquaris):not(.theme-bloodmoon) :where(.desc,.sub,.muted,.small,.help,.note,.tagline,.hint,.faint){
  color:var(--tm-text-muted) !important;
}
body[data-theme-active="dark"] :where(input,select,textarea),
body:not(.light):not(.theme-violet):not(.theme-red):not(.theme-green):not(.theme-easter):not(.theme-halloween):not(.theme-noel):not(.theme-aquaris):not(.theme-bloodmoon) :where(input,select,textarea){
  background:var(--tm-input-bg) !important;
  color:var(--tm-text) !important;
  border-color:var(--tm-border) !important;
}

/* === v269 — home first impression === */
#s-home{
  background:
    radial-gradient(circle at 50% -8%, rgba(155,216,244,.16), transparent 28rem),
    radial-gradient(circle at 12% 82%, rgba(228,191,102,.085), transparent 24rem),
    linear-gradient(180deg, #070a12 0%, #0b1020 52%, #04070d 100%) !important;
  color:var(--text) !important;
}
#s-home .screen-bg::after{
  content:"";
  position:fixed;
  inset:0;
  pointer-events:none;
  background:
    linear-gradient(180deg, rgba(0,0,0,.10), rgba(0,0,0,.36)),
    radial-gradient(ellipse at 50% 40%, rgba(155,216,244,.055), transparent 52%);
  z-index:0;
}
#s-home .home-shell,
#s-home .home-wrap,
#s-home > div:not(.screen-bg):not(.screen-horizon){
  position:relative;
  z-index:1;
}
#s-home .home-hero,
#s-home .home-main,
#s-home .home-logo-block{
  position:relative;
}
#s-home .home-hero::before,
#s-home .home-logo-block::before{
  content:"";
  position:absolute;
  inset:-26px -34px;
  z-index:-1;
  pointer-events:none;
  border-radius:32px;
  background:
    radial-gradient(circle at 50% 20%, rgba(155,216,244,.09), transparent 65%),
    linear-gradient(180deg, rgba(6,10,18,.62), rgba(6,10,18,.12));
  filter:blur(.2px);
}
#s-home .login-emb,
#s-home .home-emblem,
#s-home svg{
  filter:drop-shadow(0 18px 30px rgba(0,0,0,.45)) drop-shadow(0 0 20px rgba(155,216,244,.16));
}
#s-home .home-eyebrow{
  color:#d7e3ec !important;
  opacity:1 !important;
  text-shadow:0 2px 18px rgba(0,0,0,.65);
  letter-spacing:3.5px !important;
}
#s-home .home-title{
  color:#f8fbff !important;
  text-shadow:
    0 2px 0 rgba(0,0,0,.45),
    0 12px 38px rgba(0,0,0,.55),
    0 0 32px rgba(155,216,244,.13) !important;
}
#s-home .home-title-line{
  -webkit-text-fill-color:initial !important;
  background:none !important;
  color:#f8fbff !important;
}
#s-home .home-title-1,
#s-home .home-title-2{
  letter-spacing:clamp(6px, 2.5vw, 18px) !important;
}
#s-home .home-ruler{
  width:112px !important;
  height:2px !important;
  background:linear-gradient(90deg, transparent, #9bd8f4, #e4bf66, transparent) !important;
  box-shadow:0 0 16px rgba(155,216,244,.34);
}
#s-home .home-sub{
  color:#d7e3ec !important;
  font-size:15px !important;
  line-height:1.85 !important;
  text-shadow:0 2px 18px rgba(0,0,0,.55);
  max-width:520px;
  margin-left:auto;
  margin-right:auto;
}
#s-home .home-actions{
  max-width:360px !important;
  gap:12px !important;
  margin-bottom:54px !important;
}
#s-home .home-btn{
  min-height:58px !important;
  border-radius:18px !important;
  font-size:10.5px !important;
  letter-spacing:2.5px !important;
  box-shadow:0 18px 38px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.10) !important;
}
#s-home .home-btn-primary{
  color:#06101a !important;
  border-color:rgba(255,255,255,.36) !important;
  background:linear-gradient(135deg, #d9f4ff 0%, #9bd8f4 42%, #e4bf66 100%) !important;
  text-shadow:none !important;
}
#s-home .home-btn-primary .home-btn-label,
#s-home .home-btn-primary .home-btn-arrow{
  color:#06101a !important;
  font-weight:950 !important;
}
#s-home .home-btn-primary:hover{
  transform:translateY(-2px) scale(1.01) !important;
  background:linear-gradient(135deg, #f2fbff 0%, #bdeaff 44%, #f0d586 100%) !important;
}
#s-home .home-btn-secondary{
  color:#f0f6fb !important;
  border-color:rgba(155,216,244,.32) !important;
  background:rgba(9,15,27,.62) !important;
}
#s-home .home-btn-secondary:hover{
  color:#ffffff !important;
  border-color:rgba(155,216,244,.58) !important;
  background:rgba(18,30,50,.82) !important;
}
#s-home .home-footer{
  gap:14px !important;
  padding:12px 16px !important;
  border-radius:22px !important;
  border:1px solid rgba(155,216,244,.16) !important;
  background:linear-gradient(180deg, rgba(255,255,255,.060), rgba(255,255,255,.022)), rgba(8,13,24,.56) !important;
  box-shadow:0 18px 38px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.06) !important;
  backdrop-filter:blur(14px) saturate(115%);
}
#s-home .home-footer-item{
  background:transparent !important;
  box-shadow:none !important;
  min-width:74px;
}
#s-home .home-footer-num{
  color:#d2efff !important;
  text-shadow:0 0 18px rgba(155,216,244,.26);
}
#s-home .home-footer-lbl{
  color:#b6c6d4 !important;
  letter-spacing:2px !important;
}
#s-home .home-footer-sep{
  background:linear-gradient(180deg, transparent, rgba(155,216,244,.32), transparent) !important;
}

/* HRP/login pre-entry readability */
#s-hrp .hrp-shell,
#s-login .login-wrap{
  position:relative;
  z-index:1;
}
#s-hrp .hrp-card,
#s-hrp .login-card,
#s-login .login-card{
  background:linear-gradient(180deg, rgba(16,24,42,.94), rgba(8,13,24,.90)) !important;
  border-color:rgba(155,216,244,.20) !important;
  box-shadow:0 22px 52px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.06) !important;
}
#s-hrp :where(p,li,.hrp-sub,.desc,.muted),
#s-login :where(p,li,.desc,.muted,.login-logo p){
  color:#d7e3ec !important;
}

/* Logged app readability on base */
body[data-theme-active="dark"] .app-header,
body:not(.light):not(.theme-violet):not(.theme-red):not(.theme-green):not(.theme-easter):not(.theme-halloween):not(.theme-noel):not(.theme-aquaris):not(.theme-bloodmoon) .app-header{
  background:linear-gradient(180deg, rgba(8,13,24,.96), rgba(8,13,24,.86)) !important;
  border-bottom-color:rgba(155,216,244,.20) !important;
  backdrop-filter:blur(16px) saturate(120%);
}
body[data-theme-active="dark"] :where(.nav-tab,.nav-dropdown-item,.drawer-item,.btn,.btn-out,.mini-btn),
body:not(.light):not(.theme-violet):not(.theme-red):not(.theme-green):not(.theme-easter):not(.theme-halloween):not(.theme-noel):not(.theme-aquaris):not(.theme-bloodmoon) :where(.nav-tab,.nav-dropdown-item,.drawer-item,.btn,.btn-out,.mini-btn){
  color:#eaf3fa !important;
}
body[data-theme-active="dark"] :where(.nav-tab:hover,.nav-dropdown-item:hover,.drawer-item:hover,.btn:hover,.btn-out:hover,.mini-btn:hover),
body:not(.light):not(.theme-violet):not(.theme-red):not(.theme-green):not(.theme-easter):not(.theme-halloween):not(.theme-noel):not(.theme-aquaris):not(.theme-bloodmoon) :where(.nav-tab:hover,.nav-dropdown-item:hover,.drawer-item:hover,.btn:hover,.btn-out:hover,.mini-btn:hover){
  background:rgba(155,216,244,.10) !important;
  border-color:rgba(155,216,244,.28) !important;
}
body[data-theme-active="dark"] :where(.card-title,.section-title,.panel-title,.title,h1,h2,h3,h4),
body:not(.light):not(.theme-violet):not(.theme-red):not(.theme-green):not(.theme-easter):not(.theme-halloween):not(.theme-noel):not(.theme-aquaris):not(.theme-bloodmoon) :where(.card-title,.section-title,.panel-title,.title,h1,h2,h3,h4){
  color:#f8fbff !important;
  text-shadow:0 1px 12px rgba(0,0,0,.28);
}

/* Non-dark themes must not inherit the base home/login dark polish. */
body[data-theme-tone="light"] #s-home,
body[data-theme-active]:not([data-theme-active="dark"]) #s-home{
  background:var(--tm-page-bg,var(--bg)) !important;
  color:var(--tm-text,var(--text)) !important;
}
body[data-theme-tone="light"] #s-home .screen-bg::after,
body[data-theme-active]:not([data-theme-active="dark"]) #s-home .screen-bg::after{
  background:radial-gradient(ellipse at 50% 36%,rgba(var(--tm-accent-rgb,126,184,212),.10),transparent 56%) !important;
}
body[data-theme-tone="light"] #s-home .home-hero::before,
body[data-theme-tone="light"] #s-home .home-logo-block::before,
body[data-theme-active]:not([data-theme-active="dark"]) #s-home .home-hero::before,
body[data-theme-active]:not([data-theme-active="dark"]) #s-home .home-logo-block::before{
  background:radial-gradient(circle at 50% 20%,rgba(var(--tm-accent-rgb,126,184,212),.10),transparent 65%),var(--tm-card-bg,rgba(255,255,255,.74)) !important;
}
body[data-theme-tone="light"] #s-home :where(.home-eyebrow,.home-title,.home-title-line,.home-sub,.home-footer-lbl),
body[data-theme-active]:not([data-theme-active="dark"]) #s-home :where(.home-eyebrow,.home-title,.home-title-line,.home-sub,.home-footer-lbl){
  color:var(--tm-text,var(--text)) !important;
  -webkit-text-fill-color:currentColor !important;
  text-shadow:none !important;
}
body[data-theme-tone="light"] #s-home :where(.home-footer,.home-btn-secondary),
body[data-theme-tone="light"] #s-hrp :where(.hrp-card,.login-card),
body[data-theme-tone="light"] #s-login .login-card,
body[data-theme-active]:not([data-theme-active="dark"]) #s-home :where(.home-footer,.home-btn-secondary),
body[data-theme-active]:not([data-theme-active="dark"]) #s-hrp :where(.hrp-card,.login-card),
body[data-theme-active]:not([data-theme-active="dark"]) #s-login .login-card{
  background:var(--tm-card-bg) !important;
  color:var(--tm-text,var(--text)) !important;
  border-color:var(--tm-border) !important;
  box-shadow:var(--tm-shadow-soft) !important;
}
body[data-theme-tone="light"] #s-home .home-footer-num,
body[data-theme-active]:not([data-theme-active="dark"]) #s-home .home-footer-num,
body[data-theme-tone="light"] #s-home :where(.home-btn-secondary .home-btn-label,.home-btn-secondary .home-btn-arrow),
body[data-theme-active]:not([data-theme-active="dark"]) #s-home :where(.home-btn-secondary .home-btn-label,.home-btn-secondary .home-btn-arrow){
  color:var(--tm-text,var(--text)) !important;
  text-shadow:none !important;
}

/* Mobile */
@media(max-width:680px){
  #s-home .home-title-1,
  #s-home .home-title-2{
    font-size:clamp(42px, 14vw, 62px) !important;
    letter-spacing:clamp(3px, 1.7vw, 8px) !important;
  }
  #s-home .home-sub{
    font-size:14px !important;
    line-height:1.7 !important;
    padding:0 12px;
  }
  #s-home .home-actions{
    max-width:min(360px, calc(100vw - 34px)) !important;
    margin-bottom:34px !important;
  }
  #s-home .home-footer{
    display:grid !important;
    grid-template-columns:repeat(2, minmax(0, 1fr)) !important;
    width:min(420px, calc(100vw - 30px));
    gap:10px !important;
  }
  #s-home .home-footer-sep{
    display:none !important;
  }
}
    `;

    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = css;
    document.head.appendChild(st);
  }

  function refresh(){
    injectStyle();
    try{
      document.body.setAttribute('data-home-readability-polish','v269');
      document.documentElement.setAttribute('data-home-readability-polish','v269');
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
      mo.observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['class','data-theme-active','style']});
    }catch(e){}
    setTimeout(refresh, 300);
    setTimeout(refresh, 1000);

    window.npHomeReadabilityPolish = {
      version:VERSION,
      refresh:refresh
    };
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
