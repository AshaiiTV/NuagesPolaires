(function(){
  if(window.__npFinishAuditPatch) return;
  window.__npFinishAuditPatch = true;

  function injectStyle(){
    if(document.getElementById('np-finish-audit-style')) return;
    var css = `
/* v243 — audit de finition global */
:where(.card,.panel,.staff-panel,.modal,.collection-card,.db-card,.theme-card-premium,.archive-card,.history-card,.sim-panel,.sim-fighter-card,.sim-log,.sim-history,.sim-notes,.summary-card,.home-footer-item,.sl-card,.bcrd,.prog-panel,.warnbox,.empty-state,.collection-section,.activity-item,.journal-entry){
  min-width:0;
  overflow:hidden;
}
:where(.card,.panel,.staff-panel,.modal,.collection-card,.db-card,.theme-card-premium,.archive-card,.history-card,.sim-panel,.sim-fighter-card,.sim-log,.sim-history,.sim-notes,.summary-card,.home-footer-item,.sl-card,.bcrd,.prog-panel,.warnbox,.empty-state,.collection-section,.activity-item,.journal-entry) *{
  min-width:0;
}
:where(.card,.panel,.staff-panel,.modal,.collection-card,.db-card,.theme-card-premium,.archive-card,.history-card,.sim-panel,.sim-fighter-card,.sim-log,.sim-history,.sim-notes,.summary-card,.home-footer-item,.sl-card,.bcrd,.prog-panel,.warnbox,.empty-state,.collection-section,.activity-item,.journal-entry) :where(.title,.name,.card-title,.section-title,.panel-title,.modal-title,.mtit,.sl-title,.arc-name,.sim-fighter-name,.summary-kicker,.home-footer-label,.chip,.badge,.mini,.muted,.small,.help,.note,.desc,.sub,.summary-sub,.arc-summary-chip,.arc-summary-label){
  overflow-wrap:anywhere;
  word-break:break-word;
}
:where(.row,.runtime-guard-actions,.cmdk-top,.home-actions,.home-cta,.beast-admin-actions,.beast-admin-quick,.arc-summary-head,.arc-card-actions,.arc-detail-actions,.sim-hud-strip,.sim-hero-actions,.sim-top-actions,.sim-tracker,.sl-actions,#bestiaire #beast-filters,.drawer-actions,[class*="toolbar"],[class*="actions"],[class*="filters"],[class*="controls"],[class*="chips"]){
  flex-wrap:wrap;
}
:where(.btn,.btn-out,.mini-btn,.home-btn,.tab-btn,.ltab-btn,.settings-tab,.collection-chip,.quick-link,.bfilt,.spw-btn,.theme-vis-btn,.drawer-item,.drawer-close,.mclose,.tab-popup-close,.theme-chip){
  min-height:38px;
  line-height:1.3;
  white-space:normal;
  text-wrap:balance;
}
:where(input,select,textarea,button,.btn,.btn-out,.mini-btn,.home-btn,.tab-btn,.ltab-btn,.settings-tab,.collection-chip,.quick-link,.bfilt,.spw-btn,.theme-vis-btn,.drawer-item,.drawer-close,.mclose,.tab-popup-close,.theme-chip){
  max-width:100%;
}
:where(.nav-group-menu,.nav-dropdown-menu,.nav-dd,.account-dd,.branch-dd,.menu,.cmdk-modal,.runtime-guard,.modal,.crop-modal,.tab-content.tab-popup-active){
  max-width:min(96vw,1280px);
}
:where(.nav-group-menu,.nav-dropdown-menu,.nav-dd,.account-dd,.branch-dd,.menu){
  max-height:min(68vh,560px);
  overflow:auto;
}
:where(img,svg,canvas,video){max-width:100%;height:auto;}
:where(table){max-width:100%;}
:where(.table-wrap,.db-table-wrap,.arc-detail-grid,.arc-roster-grid,.sim-history-shell,.sim-log,.sim-history,.tab-content.tab-popup-active,.cmdk-list,[class*="table"],[class*="roster"],[class*="history"]){
  min-width:0;
}
:where(.tab-content.tab-popup-active,.cmdk-list,.sim-log,.sim-history,[class*="table-wrap"],[class*="table"],[class*="roster"],[class*="history-list"]){
  scrollbar-gutter:stable both-edges;
}
:where(.archive-card,.history-card,.sim-fighter-card,.theme-card-premium,.collection-card,.db-card,.sl-card,.home-footer-item,.summary-card){
  border-radius:20px;
}
:where(.chip,.badge,.arc-summary-chip,.nav-badge,.summary-kicker,.home-footer-label){
  white-space:normal;
}
:where(.home-counter,.home-footer-item,.summary-card){
  justify-content:flex-start;
}
body.light :where(.muted,.dim,.small,.summary-sub,.help,.note,.card-subtitle,.home-footer-label,.sl-sub,.arc-sub){
  color:#50627b !important;
}
body.light :where(input::placeholder,textarea::placeholder){
  color:#7486a0;
  opacity:.92;
}
body.light :where(.archive-card,.history-card,.sim-panel,.sim-fighter-card,.sim-log,.sim-history,.sim-notes,.summary-card,.home-footer-item,.collection-card,.db-card,.sl-card,.theme-card-premium,.warnbox,.empty-state){
  box-shadow:0 10px 28px rgba(28,44,78,.08),0 0 0 1px rgba(113,144,196,.06) inset;
}
@media (max-width: 900px){
  :where(.nav-group-menu,.nav-dropdown-menu,.nav-dd,.account-dd,.branch-dd,.menu){max-width:calc(100vw - 16px);}  
  :where(.archive-card,.history-card,.sim-fighter-card,.theme-card-premium,.collection-card,.db-card,.sl-card,.home-footer-item,.summary-card){border-radius:18px;}
}
@media (max-width: 560px){
  :where(.btn,.btn-out,.mini-btn,.home-btn,.tab-btn,.ltab-btn,.settings-tab,.collection-chip,.quick-link,.bfilt,.spw-btn,.theme-vis-btn,.drawer-item,.drawer-close,.mclose,.tab-popup-close,.theme-chip){min-height:42px;}
}
`;
    var el = document.createElement('style');
    el.id = 'np-finish-audit-style';
    el.textContent = css;
    document.head.appendChild(el);
  }

  function normalizeDataUrl(url){
    if(typeof url !== 'string') return url;
    if(!/^data:image\//i.test(url)) return url;
    if(url.indexOf(',') !== -1) return url;
    var m = url.match(/^data:(image\/[a-z0-9.+-]+);?base64(.*)$/i);
    if(m && m[2]) return 'data:' + m[1] + ';base64,' + m[2].replace(/^,/, '');
    m = url.match(/^data:(image\/[a-z0-9.+-]+)(.*)$/i);
    if(m && m[2] && /^[A-Za-z0-9+/=]+$/.test(m[2].replace(/^,/, ''))){
      return 'data:' + m[1] + ';base64,' + m[2].replace(/^,/, '');
    }
    return url;
  }

  function repairImageSources(root){
    try{
      (root || document).querySelectorAll('img[src^="data:image/"]').forEach(function(img){
        var src = img.getAttribute('src') || '';
        var fixed = normalizeDataUrl(src);
        if(fixed !== src) img.setAttribute('src', fixed);
      });
    }catch(e){}
  }

  function softenOverflows(root){
    try{
      (root || document).querySelectorAll('.archive-card,.history-card,.sim-fighter-card,.theme-card-premium,.collection-card,.db-card,.sl-card,.summary-card,.home-footer-item').forEach(function(card){
        card.style.minWidth = '0';
      });
    }catch(e){}
  }

  function boot(){
    injectStyle();
    repairImageSources(document);
    softenOverflows(document);
    try{
      var mo = new MutationObserver(function(muts){
        muts.forEach(function(m){
          m.addedNodes && m.addedNodes.forEach(function(node){
            if(node && node.nodeType === 1){
              repairImageSources(node);
              softenOverflows(node);
            }
          });
        });
      });
      mo.observe(document.documentElement, {childList:true, subtree:true});
    }catch(e){}
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();

  window.__npNormalizeBrokenDataImages = function(root){ repairImageSources(root || document); };
})();
