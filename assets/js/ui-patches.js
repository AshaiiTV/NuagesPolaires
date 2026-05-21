(function(){
  function rerenderAdminThemePanels(){
    try{
      ["p-admin-themes-db-c","p-admin-themes-c"].forEach(function(panelId){
        if(typeof renderAdminThemes === "function" && ge(panelId)) renderAdminThemes(panelId);
      });
    }catch(e){}
  }
  window.toggleThemeVisibility = function(themeId){
    var id = normalizeThemeId(themeId);
    if(!id) return false;
    return setThemeVisibility(id, !getThemeVisibilityState(id));
  };
  if(typeof _loadSessionBundle === "function" && !window.__npWrappedThemeVisibility){
    var __oldLoadSessionBundle = _loadSessionBundle;
    window.__npWrappedThemeVisibility = true;
    _loadSessionBundle = function(){
      return Promise.resolve(__oldLoadSessionBundle.apply(this, arguments)).then(function(bundle){
        try{
          if(bundle && bundle.data && bundle.data.themeVisibility){
            var nextMap = {};
            Object.keys(bundle.data.themeVisibility).forEach(function(key){ nextMap[normalizeThemeId(key)] = !!bundle.data.themeVisibility[key]; });
            if(typeof _dbCache!=="undefined"&&_dbCache) _dbCache.theme_visibility = nextMap;
            window.VISIBLE_THEMES = Object.keys(nextMap).filter(function(key){ return nextMap[key] === true; });
            try{ localStorage.setItem("np_theme_visibility", JSON.stringify(nextMap)); }catch(e){}
          }
        }catch(e){}
        return bundle;
      });
    };
  }
})();

/* v42 restored tail code */
function _visibleThemeIdsForPlayer(player){
  const visible = (typeof getAllThemes === 'function' ? getAllThemes() : [])
    .filter(function(t){ return !!(t && isThemeVisibleForPlayer(t.id)); })
    .map(function(t){ return normalizeThemeId(t.id); })
    .filter(Boolean);
  const baseSet = THEME_BASE_VISIBLE.map(normalizeThemeId).filter(Boolean);
  return Array.from(new Set([...baseSet, ...visible])).filter(Boolean);
}
function buildThemeCollectionModel(player){
  const equipped = normalizeThemeId((player && player.theme) || 'theme-default');
  const visible = _visibleThemeIdsForPlayer(player);
  const items = visible.map(id => {
    const meta = themeMeta(id);
    const owned = canUseTheme(player, id);
    return {
      id,
      label: prettyThemeName(id),
      rarity: meta.rarity,
      category: equipped===id ? 'Équipé' : meta.category,
      tagline: meta.tagline,
      preview: meta.preview,
      owned,
      locked: !owned,
      secret: false,
      equipped: equipped===id
    };
  });
  const secrets = THEME_SECRET_SLOTS.map(s => ({
    id:s.id, label:s.label, rarity:s.rarity, category:s.category, tagline:s.hint, preview:'',
    owned:false, locked:true, secret:true, equipped:false
  }));
  return [...items, ...secrets].sort((a,b)=>{
    const co = categoryOrder(a.category) - categoryOrder(b.category);
    if (co !== 0) return co;
    return String(a.label).localeCompare(String(b.label), 'fr');
  });
}
function renderCollectionSummary(player){
  const all = buildThemeCollectionModel(player).filter(x=>!x.secret);
  const owned = all.filter(x=>x.owned).length;
  const total = all.length || 1;
  const seasonal = all.filter(x=>x.category==='Saisonnier');
  const founders = all.filter(x=>String(x.rarity).toLowerCase().includes('fondateur'));
  return `<div class="collection-summary-grid">
    <div class="summary-card"><div class="summary-kicker">Collection</div><div class="summary-value">${owned}/${all.length}</div><div class="summary-sub">thèmes visibles obtenus</div></div>
    <div class="summary-card"><div class="summary-kicker">Progression</div><div class="summary-value">${Math.round((owned/total)*100)}%</div><div class="summary-sub">de la galerie visible</div></div>
    <div class="summary-card"><div class="summary-kicker">Saisonniers</div><div class="summary-value">${seasonal.filter(x=>x.owned).length}/${seasonal.length || 0}</div><div class="summary-sub">dans la galerie</div></div>
    <div class="summary-card"><div class="summary-kicker">Fondateur</div><div class="summary-value">${founders.filter(x=>x.owned).length}/${founders.length || 0}</div><div class="summary-sub">traces rares</div></div>
  </div>`;
}
function renderThemePreviewMini(themeId){
  const meta = themeMeta(themeId);
  return `<div class="theme-preview-mini ${normalizeThemeId(themeId)}">
    <div class="theme-preview-bar"></div>
    <div class="theme-preview-head"></div>
    <div class="theme-preview-cards"><span></span><span></span><span></span></div>
    <div class="theme-preview-foot">${meta.preview || ''}</div>
  </div>`;
}
function renderThemeCollectionPremium(player){
  const items = buildThemeCollectionModel(player);
  const groups = {};
  items.forEach(it => { (groups[it.category] ||= []).push(it); });
  const categories = Object.keys(groups).sort((a,b)=>categoryOrder(a)-categoryOrder(b));
  return renderCollectionSummary(player) + categories.map(cat => `
    <div class="collection-section">
      <div class="collection-section-title">${cat}</div>
      <div class="theme-collection-grid">
        ${groups[cat].map(it => {
          const badges = [
            it.equipped ? `<span class="chip ok">Équipé</span>` : '',
            it.secret ? `<span class="chip">Secret</span>` : (it.owned ? `<span class="chip ok">Obtenu</span>` : `<span class="chip">Non obtenu</span>`)
          ].join('');
          const button = it.secret
            ? `<button class="btn ghost" disabled>Inconnu</button>`
            : `<button class="btn ${it.equipped ? 'ghost' : 'primary'}" ${(!it.owned || it.equipped) ? 'disabled' : ''} onclick="applyTheme('${it.id}')">${it.equipped ? 'Équipé' : (it.owned ? 'Appliquer' : 'Indisponible')}</button>`;
          return `<article class="theme-card-premium ${it.secret ? 'secret' : ''} ${it.locked ? 'locked' : ''}">
            <div class="row-top">
              <div class="title-wrap">
                <div class="title">${it.label}</div>
                <div class="tagline">${it.tagline || ''}</div>
              </div>
            </div>
            ${renderThemePreviewMini(it.secret ? 'theme-default' : it.id)}
            <div class="meta-line">${badges}</div>
            <div class="card-actions">${button}</div>
          </article>`;
        }).join('')}
      </div>
    </div>`).join('');
}

function renderAdminThemeControls(acc){
  if(!(typeof isAdminLike==='function' && isAdminLike(CU))) return "";
  const owned = Array.isArray(acc.unlockedThemes) ? acc.unlockedThemes.map(normalizeThemeId).filter(Boolean) : [];
  const blocked = Array.isArray(acc.blockedThemes) ? acc.blockedThemes.map(normalizeThemeId).filter(Boolean) : [];
  const pool = Array.from(new Set([...owned, ...blocked])).sort();
  if(!pool.length) return '<div class="mini muted">Aucun thème attribué ou bloqué.</div>';
  return '<div class="db-theme-admin-list">'+ pool.map(t=>{
    const label = (typeof prettyThemeName==="function") ? prettyThemeName(t) : t;
    const isBlocked = blocked.includes(t);
    return `<div class="db-theme-admin-item">
      <span class="chip ${isBlocked?'danger':''}">${label}${isBlocked?' · Bloqué':''}</span>
      <div class="row gap8">
        ${owned.includes(t)?`<button class="btn sm ghost" onclick="adminRevokeThemeFromDb('${acc.id}','${t}')">Retirer</button>`:''}
        <button class="btn sm ${isBlocked?'':'ghost'}" onclick="adminToggleBlockTheme('${acc.id}','${t}',${isBlocked?'false':'true'})">${isBlocked?'Débloquer':'Bloquer'}</button>
      </div>
    </div>`;
  }).join('') + '</div>';
}
async function adminToggleBlockTheme(accountId, themeId, block){
  if(!(typeof isAdminLike==='function' && isAdminLike(CU))) return toast("Action réservée aux admins");
  try{
    const act = block ? 'admin_block_theme' : 'admin_unblock_theme';
    const r = await apiAuth(act, { accountId, themeId });
    if(!r || !r.ok) throw new Error((r&&r.error)||"Action impossible");
    toast(block ? "Thème bloqué" : "Thème débloqué");
    if(typeof renderDB === 'function') renderDB(); else if(typeof renderDatabase === 'function') renderDatabase();
  }catch(e){ toast(e.message || "Erreur thème"); }
}


function isAdminGrantOnlyTheme(themeId){
  const id = normalizeThemeId(themeId);
  return !!id && !isBaseTheme(id) && !isEventThemeTemporarilyLocked(id) && !isEarlyCloudsOnlyTheme(id);
}


window.__v38CollectionPatch = true;
(function(){
  const oldRenderCollection = window.renderCollection;
  window.renderCollection = function(){
    try{
      const wrap = document.getElementById('collection-wrap') || document.getElementById('collection-view') || document.querySelector('[data-collection-wrap]');
      if (wrap) {
        var _collectionPlayer = (typeof getThemeActorPlayer==="function" ? (getThemeActorPlayer() || {}) : {});
        wrap.innerHTML = renderThemeCollectionPremium(_collectionPlayer);
        return;
      }
    }catch(e){ console.warn('renderCollection v38 fallback', e); }
    if (typeof oldRenderCollection === 'function') return oldRenderCollection();
  };
})();


(function(){
  const _oldApplySessionBundle = window.applySessionBundle;
  window.applySessionBundle = function(bundle){
    if(bundle && bundle.visibleThemes) window.VISIBLE_THEMES = bundle.visibleThemes;
    if(bundle && bundle.themeMetaServer) window.THEME_META_SERVER = bundle.themeMetaServer;
    if(typeof _oldApplySessionBundle === 'function') return _oldApplySessionBundle(bundle);
  };
})();



window.__v47BestiaryGuard = true;
(function(){
  var _oldRenderBGrid = window.renderBGrid;
  if(typeof _oldRenderBGrid === 'function'){
    window.renderBGrid = function(tid, staff){
      try{
        return _oldRenderBGrid.call(this, tid, staff);
      }catch(e){
        console.error('Bestiaire render failed', e);
        var el = typeof ge==='function' ? ge(tid) : document.getElementById(tid);
        if(el){
          el.innerHTML = '<div class="card" style="padding:18px;border:1px solid var(--border2);background:var(--bg2);"><div class="card-title" style="margin-bottom:10px;">Bestiaire indisponible</div><div style="color:var(--dim);line-height:1.7;">Une erreur a empêché le chargement du bestiaire. Rafraîchis la vue ou reviens plus tard.</div></div>';
        }
      }
    };
  }
})();


(function(){
  var _oldLoadSessionBundle = typeof _loadSessionBundle === "function" ? _loadSessionBundle : null;
  if(_oldLoadSessionBundle && !window.__npThemeVisibilityHydrated){
    window.__npThemeVisibilityHydrated = true;
    _loadSessionBundle = function(){
      return Promise.resolve(_oldLoadSessionBundle()).then(function(bundle){
        try{
          var rawMap = (bundle && bundle.data && bundle.data.themeVisibility) || (bundle && bundle.themeVisibility) || null;
          if(rawMap && typeof rawMap === 'object' && !Array.isArray(rawMap)){
            var map = {};
            Object.keys(rawMap).forEach(function(key){ map[normalizeThemeId(key)] = !!rawMap[key]; });
            window.VISIBLE_THEMES = Object.keys(map).filter(function(key){ return map[key] === true; });
            sv("theme_visibility", map);
          }
        }catch(e){}
        return bundle;
      });
    };
  }
})();


window.__npHydrateThemeVisibilityFromSession = true;
(function(){
  var _oldLoadSessionBundle2 = typeof _loadSessionBundle === 'function' ? _loadSessionBundle : null;
  if(_oldLoadSessionBundle2){
    _loadSessionBundle = function(){
      return Promise.resolve(_oldLoadSessionBundle2()).then(function(bundle){
        try{
          var rawMap = (bundle && bundle.data && bundle.data.themeVisibility) || (bundle && bundle.themeVisibility) || null;
          if(rawMap && typeof rawMap === 'object' && !Array.isArray(rawMap)){
            var map = {};
            Object.keys(rawMap).forEach(function(key){ map[normalizeThemeId(key)] = !!rawMap[key]; });
            window.VISIBLE_THEMES = Object.keys(map).filter(function(key){ return map[key] === true; });
            _dbCache.theme_visibility = map;
            try{ localStorage.setItem("np_theme_visibility", JSON.stringify(map)); }catch(e){}
          }
        }catch(e){}
        return bundle;
      });
    };
  }
})();
