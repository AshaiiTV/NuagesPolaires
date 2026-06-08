/* Nuages Polaires — Staff Navigation v271
   Clean module for Staff menu hierarchy on desktop and mobile.
   Former file: staff-ux-polish.js.
   No DB changes. Admin-only items remain hidden to non-admins.
*/
(function(){
  'use strict';

  var VERSION = 'v271';
  var STYLE_ID = 'np-staff-navigation-style-v271';
  var TIMER = null;
  var OBSERVER = null;

  function role(){
    try{
      if(window.CU && window.CU.role) return String(window.CU.role).toLowerCase();
      var root = document.getElementById('app-root');
      var app = document.getElementById('s-app');
      var el = root || app;
      if(el){
        if(el.classList.contains('is-admin')) return 'admin';
        if(el.classList.contains('is-mj')) return 'mj';
        if(el.classList.contains('is-designer')) return 'designer';
      }
    }catch(e){}
    return 'joueur';
  }

  function isStaff(){
    var r = role();
    return r === 'admin' || r === 'mj' || r === 'designer';
  }

  function isAdmin(){
    return role() === 'admin';
  }

  function injectStyle(){
    if(document.getElementById(STYLE_ID)) return;
    var css = `
/* === Staff UX polish v265 === */
#dd-staff{
  position:relative;
}
#dd-staff-btn.nav-staff-btn{
  border-color:rgba(201,168,76,.22) !important;
  background:linear-gradient(135deg, rgba(201,168,76,.10), rgba(var(--tm-accent-rgb,126,184,212),.055)) !important;
}
#dd-staff-btn.nav-staff-btn.has-active,
#dd-staff-btn.nav-staff-btn.open{
  border-color:rgba(201,168,76,.38) !important;
  box-shadow:0 12px 26px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.06) !important;
}
.np-staff-role-pill{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-height:18px;
  padding:0 7px;
  margin-left:7px;
  border-radius:999px;
  font-family:var(--fd);
  font-size:8px;
  letter-spacing:1.5px;
  text-transform:uppercase;
  border:1px solid rgba(255,255,255,.10);
  background:rgba(255,255,255,.055);
  color:var(--faint);
}
.np-staff-role-pill.admin{
  color:#ffb1bd;
  border-color:rgba(227,76,98,.28);
  background:rgba(227,76,98,.10);
}
.np-staff-role-pill.mj{
  color:var(--gold);
  border-color:rgba(201,168,76,.28);
  background:rgba(201,168,76,.10);
}
.np-staff-role-pill.designer{
  color:#d9b6ff;
  border-color:rgba(192,132,212,.28);
  background:rgba(192,132,212,.10);
}
#dd-staff-menu.nav-section-staff{
  min-width:270px !important;
  padding:10px !important;
  border-radius:18px !important;
}
#dd-staff-menu .nav-section-header{
  display:flex;
  align-items:center;
  gap:8px;
  margin:8px 6px 7px !important;
  padding:0 !important;
  font-family:var(--fd);
  font-size:9px !important;
  letter-spacing:2.5px !important;
  text-transform:uppercase;
}
#dd-staff-menu .nav-section-header::after{
  content:"";
  flex:1;
  height:1px;
  background:linear-gradient(90deg, currentColor, transparent);
  opacity:.25;
}
#dd-staff-menu .nav-dropdown-item{
  width:100%;
  min-height:38px;
  border-radius:12px !important;
  margin:2px 0 !important;
  padding:9px 10px !important;
  display:flex !important;
  align-items:center !important;
  gap:8px !important;
}
#dd-staff-menu .nav-dropdown-item .nav-item-icon{
  width:22px;
  display:inline-flex;
  justify-content:center;
  opacity:.92;
}
#dd-staff-menu .nav-dropdown-item::after{
  margin-left:auto;
  font-family:var(--fd);
  font-size:8px;
  letter-spacing:1.5px;
  opacity:.55;
}
#dd-staff-menu .nav-dropdown-item.perm-mj::after{
  content:"MJ";
}
#dd-staff-menu .nav-dropdown-item.perm-admin::after{
  content:"ADMIN";
  color:#ff9aac;
  opacity:.82;
}
#dd-staff-menu .nav-divider{
  height:1px !important;
  background:linear-gradient(90deg, transparent, rgba(201,168,76,.28), transparent) !important;
  margin:9px 4px !important;
}
#nav-pending-badge,
#dd-joueurs-pending-badge{
  box-shadow:0 0 16px rgba(201,74,74,.40);
  font-weight:900 !important;
}
.np-staff-menu-hint{
  margin:5px 6px 8px;
  padding:9px 10px;
  border-radius:12px;
  color:var(--faint);
  font-size:11px;
  line-height:1.45;
  border:1px solid rgba(var(--tm-accent-rgb,126,184,212),.10);
  background:rgba(var(--tm-accent-rgb,126,184,212),.045);
}
.np-staff-menu-hint strong{
  color:var(--text);
}
#drawer-staff-section{
  background:linear-gradient(180deg, rgba(201,168,76,.045), transparent) !important;
}
#drawer-staff-section .np-drawer-staff-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
  font-family:var(--fd);
  font-size:8px;
  letter-spacing:3px;
  color:var(--gold);
  padding:10px 20px 6px;
  text-transform:uppercase;
}
#drawer-staff-section .np-drawer-staff-role{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-height:18px;
  padding:0 7px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,.10);
  background:rgba(255,255,255,.055);
  font-size:7px;
  letter-spacing:1.3px;
}
#drawer-staff-section .drawer-item{
  min-height:42px;
  display:flex;
  align-items:center;
  border-radius:0 14px 14px 0;
}
#drawer-staff-section .drawer-item.perm-admin{
  color:#ffb1bd !important;
}
#drawer-staff-section .drawer-item.perm-admin::after{
  content:"ADMIN";
  margin-left:auto;
  margin-right:4px;
  font-family:var(--fd);
  font-size:7px;
  letter-spacing:1.4px;
  opacity:.78;
}
#drawer-staff-section .drawer-item.perm-mj::after{
  content:"MJ";
  margin-left:auto;
  margin-right:4px;
  font-family:var(--fd);
  font-size:7px;
  letter-spacing:1.4px;
  opacity:.55;
}
#drawer-staff-section .np-drawer-admin-sep{
  height:1px;
  margin:8px 20px;
  background:linear-gradient(90deg, rgba(201,168,76,.24), transparent);
}
body:not(.np-is-admin) #drawer-staff-section .perm-admin,
body:not(.np-is-admin) #dd-staff-menu .perm-admin{
  display:none !important;
}
body:not(.np-is-admin):not(.np-is-mj) #drawer-staff-section .perm-mj,
body:not(.np-is-admin):not(.np-is-mj) #dd-staff-menu .perm-mj{
  display:none !important;
}
body:not(.np-is-admin):not(.np-is-designer) #drawer-staff-section .perm-designer,
body:not(.np-is-admin):not(.np-is-designer) #dd-staff-menu .perm-designer{
  display:none !important;
}
body.np-is-admin #drawer-staff-section .perm-admin{
  display:flex !important;
}
body.np-is-admin #dd-staff-menu .perm-admin{
  display:flex !important;
}
body.np-is-admin #drawer-staff-section .perm-mj,
body.np-is-admin #drawer-staff-section .perm-designer,
body.np-is-admin #dd-staff-menu .perm-mj,
body.np-is-admin #dd-staff-menu .perm-designer{
  display:flex !important;
}
@media(max-width:780px){
  #dd-staff-menu.nav-section-staff{
    min-width:240px !important;
  }
}
    `;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = css;
    document.head.appendChild(st);
  }

  function syncBodyRole(){
    try{
      var r = role();
      document.body.classList.toggle('np-is-admin', r === 'admin');
      document.body.classList.toggle('np-is-mj', r === 'mj');
      document.body.classList.toggle('np-is-designer', r === 'designer');
      document.body.classList.toggle('np-is-staff', isStaff());
    }catch(e){}
  }

  function ensureRolePill(){
    var btn = document.getElementById('dd-staff-btn');
    if(!btn) return;
    var r = role();
    var existing = btn.querySelector('.np-staff-role-pill');
    if(!existing){
      existing = document.createElement('span');
      existing.className = 'np-staff-role-pill';
      btn.appendChild(existing);
    }
    existing.className = 'np-staff-role-pill ' + r;
    existing.textContent = r === 'admin' ? 'Admin' : (r === 'mj' ? 'MJ' : (r === 'designer' ? 'Designer' : 'Staff'));

    var icon = btn.querySelector('.nav-icon');
    if(icon){
      icon.textContent = r === 'admin' ? '♛' : (r === 'designer' ? '✦' : '⚙');
    }
  }

  function ensureStaffMenuHint(){
    var menu = document.getElementById('dd-staff-menu');
    if(!menu) return;
    if(menu.querySelector('.np-staff-menu-hint')) return;

    var hint = document.createElement('div');
    hint.className = 'np-staff-menu-hint';
    hint.innerHTML = isAdmin()
      ? '<strong>Admin</strong> · outils de gestion, données et santé technique.'
      : '<strong>Staff</strong> · outils MJ disponibles selon ton rôle.';

    var firstHeader = menu.querySelector('.nav-section-header');
    if(firstHeader) menu.insertBefore(hint, firstHeader);
    else menu.insertBefore(hint, menu.firstChild);
  }

  function patchStaffMenuItems(){
    var menu = document.getElementById('dd-staff-menu');
    if(!menu) return;

    var labels = [
      ['joueurs','Joueurs'],
      ['combat-mj','Simulation'],
      ['apparitions','Apparitions'],
      ['bestiaire-admin','Atelier bestiaire'],
      ['serments-admin','Atelier serments'],
      ['database','Administration']
    ];

    labels.forEach(function(pair){
      var id = pair[0];
      var item = menu.querySelector('[onclick*="' + id + '"]');
      if(item){
        item.setAttribute('data-staff-tool', id);
        item.setAttribute('title', pair[1]);
      }
    });

    var dashboard = menu.querySelector('[data-staff-tool="database"]');
    if(dashboard){
      dashboard.setAttribute('title', 'Administration : tableau de bord, comptes, thèmes et logs');
    }
  }

  function patchDrawer(){
    var section = document.getElementById('drawer-staff-section');
    if(!section) return;

    var oldPlainHead = Array.prototype.find.call(section.children, function(el){
      return el && el.tagName === 'DIV' && !el.classList.contains('np-drawer-staff-head') && /STAFF/i.test(el.textContent || '');
    });
    if(oldPlainHead && !section.querySelector('.np-drawer-staff-head')){
      var head = document.createElement('div');
      head.className = 'np-drawer-staff-head';
      head.innerHTML = '<span>Staff</span><span class="np-drawer-staff-role"></span>';
      section.replaceChild(head, oldPlainHead);
    }

    var head2 = section.querySelector('.np-drawer-staff-head');
    if(head2){
      var pill = head2.querySelector('.np-drawer-staff-role');
      if(pill) pill.textContent = isAdmin() ? 'Admin' : (role() === 'designer' ? 'Designer' : 'MJ');
    }

    if(isAdmin() && !section.querySelector('.np-drawer-admin-sep')){
      var firstAdmin = section.querySelector('.drawer-item.perm-admin');
      if(firstAdmin){
        var sep = document.createElement('div');
        sep.className = 'np-drawer-admin-sep';
        firstAdmin.parentNode.insertBefore(sep, firstAdmin);
      }
    }
  }

  function refresh(){
    injectStyle();
    syncBodyRole();
    ensureRolePill();
    ensureStaffMenuHint();
    patchStaffMenuItems();
    patchDrawer();
  }

  function schedule(){
    clearTimeout(TIMER);
    TIMER = setTimeout(refresh, 80);
  }

  function observe(){
    try{
      if(OBSERVER) OBSERVER.disconnect();
      OBSERVER = new MutationObserver(schedule);
      OBSERVER.observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['class','style']});
    }catch(e){}
  }

  function boot(){
    injectStyle();
    refresh();
    observe();
    setInterval(refresh, 1500);
    window.npStaffNavigation = {
      version:VERSION,
      refresh:refresh,
      role:role
    };
    window.npStaffUxPolish = window.npStaffNavigation;
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();


/* Staff Navigation v271 — explicit compatibility helper */
(function(){
  'use strict';
  try{
    window.refreshStaffNavigation = function(){
      if(window.npStaffNavigation && typeof window.npStaffNavigation.refresh === 'function'){
        return window.npStaffNavigation.refresh();
      }
    };
  }catch(e){}
})();
