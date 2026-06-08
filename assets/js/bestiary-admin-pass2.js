(function(){
  var state = window.__beastAdminPass2State || { selectedId:null };
  window.__beastAdminPass2State = state;

  function canManage(){
    try{ return !!(window.CU && typeof can==='function' && can('manage_beasts')); }catch(_e){ return false; }
  }
  function isDesktop(){
    try{ return window.matchMedia('(min-width: 1180px)').matches; }catch(_e){ return (window.innerWidth||0) >= 1180; }
  }
  function beastList(){
    try{ var list = (typeof gb==='function' ? gb() : []); return Array.isArray(list) ? list : []; }catch(_e){ return []; }
  }
  function getBeast(id){
    id = String(id||'');
    return beastList().find(function(b){ return String((b&&b.id)||'') === id; }) || null;
  }
  function fmtDate(ts){
    ts = parseInt(ts,10)||0; if(!ts) return 'Jamais';
    try{ return new Date(ts).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }); }catch(_e){ return String(ts); }
  }
  function relDate(ts){
    ts = parseInt(ts,10)||0; if(!ts) return 'Jamais';
    var diff = Math.max(0, Date.now() - ts), d = Math.floor(diff / 86400000), h = Math.floor(diff / 3600000), m = Math.floor(diff / 60000);
    if(d >= 30) return fmtDate(ts);
    if(d >= 1) return 'Il y a ' + d + ' j';
    if(h >= 1) return 'Il y a ' + h + ' h';
    if(m >= 1) return 'Il y a ' + m + ' min';
    return 'À l’instant';
  }
  function completeness(b){
    var issues = [];
    if(!String((b&&b.img)||'').trim()) issues.push('image');
    if(!String((b&&b.desc)||'').trim()) issues.push('description');
    if(!String((b&&b.frappe)||'').trim()) issues.push('frappe');
    if(!String((b&&b.comp)||'').trim()) issues.push('compétence');
    if(!String((b&&b.drops)||'').trim() && !String((b&&b.gem)||'').trim()) issues.push('butin');
    return { complete: issues.length===0, issues: issues, count: issues.length };
  }
  function usageFor(id){
    var uses=0, deaths=0, lastAt=0, combats=[];
    var arcs=[];
    try{
      arcs = (canManage() && typeof getAllCombatArchives === 'function') ? (getAllCombatArchives() || []) : ((typeof getCombatArchives === 'function') ? (getCombatArchives() || []) : []);
    }catch(_e){ arcs = []; }
    arcs.forEach(function(arc){
      if(!arc || arc._inProgress) return;
      var label = String(arc.name || arc.label || 'Combat sans nom').trim() || 'Combat sans nom';
      var when = parseInt(arc.savedAt || arc.ts || 0, 10) || 0;
      (arc.fighters || []).forEach(function(f){
        if(!f || f.type !== 'beast') return;
        var bid = String(f.bid || f.id || '').trim();
        if(bid !== String(id||'')) return;
        uses += 1;
        if((parseInt(f.pvCur,10)||0) <= 0) deaths += 1;
        if(when > lastAt) lastAt = when;
        if(label && combats.indexOf(label) < 0) combats.unshift(label);
      });
    });
    if(combats.length > 6) combats.length = 6;
    return { uses: uses, deaths: deaths, lastAt: lastAt, combats: combats };
  }
  function ensureStyle(){
    if(document.getElementById('beast-admin-pass2-style')) return;
    var css = ''
      + '#bestiaire-admin .beast-admin-shell{display:grid;grid-template-columns:minmax(0,1.28fr) 390px;gap:18px;align-items:start;}'
      + '#bestiaire-admin .beast-admin-list{min-width:0;}'
      + '#bestiaire-admin .beast-admin-detail{position:sticky;top:94px;align-self:start;border:1px solid rgba(126,184,212,.16);background:linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.02));border-radius:18px;padding:16px;box-shadow:0 18px 40px rgba(0,0,0,.18);min-height:260px;overflow:hidden;}'
      + '#bestiaire-admin .beast-admin-detail::before{content:"";position:absolute;inset:0 0 auto 0;height:120px;background:radial-gradient(circle at top right, rgba(126,184,212,.16), transparent 62%);pointer-events:none;}'
      + '#bestiaire-admin .beast-admin-detail > *{position:relative;z-index:1;}'
      + '#bestiaire-admin .beast-admin-detail-empty{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:10px;min-height:240px;color:var(--dim);}'
      + '#bestiaire-admin .beast-admin-detail-empty .ttl{font-family:var(--fd);font-size:11px;letter-spacing:3px;color:var(--faint);text-transform:uppercase;}'
      + '#bestiaire-admin .beast-admin-hero{display:grid;grid-template-columns:120px 1fr;gap:14px;align-items:start;margin-bottom:14px;}'
      + '#bestiaire-admin .beast-admin-hero-media{min-height:118px;border-radius:16px;overflow:hidden;border:1px solid rgba(126,184,212,.14);background:linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02));display:flex;align-items:center;justify-content:center;}'
      + '#bestiaire-admin .beast-admin-hero-media img{width:100%;height:100%;display:block;object-fit:cover;}'
      + '#bestiaire-admin .beast-admin-hero-fallback{font-family:var(--fd);font-size:34px;letter-spacing:3px;color:var(--faint);}'
      + '#bestiaire-admin .beast-admin-hero-title{font-family:var(--fd);font-size:24px;line-height:1.05;letter-spacing:1px;color:var(--text);margin:6px 0 4px;}'
      + '#bestiaire-admin .beast-admin-hero-sub{font-size:12px;color:var(--dim);line-height:1.55;}'
      + '#bestiaire-admin .beast-admin-detail-badges{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}'
      + '#bestiaire-admin .beast-admin-detail-actions{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 12px;}'
      + '#bestiaire-admin .beast-admin-detail-actions .btn,#bestiaire-admin .beast-admin-detail-actions .btn-sm{justify-content:center;}'
      + '#bestiaire-admin .beast-admin-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:12px 0 14px;}'
      + '#bestiaire-admin .beast-admin-detail-stat{padding:10px 12px;border-radius:12px;border:1px solid rgba(126,184,212,.12);background:rgba(255,255,255,.03);}'
      + '#bestiaire-admin .beast-admin-detail-stat .k{display:block;font-size:9px;letter-spacing:1.8px;text-transform:uppercase;color:var(--faint);margin-bottom:4px;}'
      + '#bestiaire-admin .beast-admin-detail-stat .v{display:block;font-family:var(--fd);font-size:17px;color:var(--text);}'
      + '#bestiaire-admin .beast-admin-detail-block{padding:12px 13px;border-radius:14px;border:1px solid rgba(126,184,212,.1);background:rgba(255,255,255,.025);margin-top:10px;}'
      + '#bestiaire-admin .beast-admin-detail-block .ttl{display:block;font-family:var(--fd);font-size:9px;letter-spacing:2.3px;text-transform:uppercase;color:var(--faint);margin-bottom:8px;}'
      + '#bestiaire-admin .beast-admin-detail-block .txt{font-size:12px;line-height:1.68;color:var(--dim);}'
      + '#bestiaire-admin details.beast-admin-detail-block{cursor:default;}'
      + '#bestiaire-admin details.beast-admin-detail-block>summary{list-style:none;cursor:pointer;font-family:var(--fd);font-size:9px;letter-spacing:2.3px;text-transform:uppercase;color:var(--faint);}'
      + '#bestiaire-admin details.beast-admin-detail-block>summary::-webkit-details-marker{display:none;}'
      + '#bestiaire-admin details.beast-admin-detail-block>summary::after{content:"+";float:right;color:var(--glacier);font-family:var(--fm);font-size:13px;letter-spacing:0;}'
      + '#bestiaire-admin details.beast-admin-detail-block[open]>summary::after{content:"-";}'
      + '#bestiaire-admin .beast-admin-action-more{position:relative;display:inline-flex;}'
      + '#bestiaire-admin .beast-admin-action-more>summary{list-style:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;min-height:34px;padding:0 13px;border:1px solid var(--border2);border-radius:999px;background:var(--bg3);font-family:var(--fd);font-size:10px;letter-spacing:1.6px;color:var(--text);}'
      + '#bestiaire-admin .beast-admin-action-more>summary::-webkit-details-marker{display:none;}'
      + '#bestiaire-admin .beast-admin-action-more>div{position:absolute;right:0;top:calc(100% + 8px);z-index:30;display:grid;gap:7px;min-width:170px;padding:10px;border:1px solid var(--border2);border-radius:14px;background:var(--bg2);box-shadow:0 16px 36px rgba(0,0,0,.28);}'
      + '#bestiaire-admin .beast-admin-action-more .btn{width:100%;}'
      + '#bestiaire-admin .beast-admin-completeness{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}'
      + '#bestiaire-admin .beast-admin-completeness span,#bestiaire-admin .beast-admin-last-combats span{display:inline-flex;align-items:center;padding:4px 9px;border-radius:999px;border:1px solid rgba(126,184,212,.12);background:rgba(255,255,255,.03);font-size:10px;color:var(--dim);}'
      + '#bestiaire-admin .beast-admin-last-combats{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}'
      + '#bestiaire-admin .beast-admin-card{cursor:pointer;transition:transform .16s ease, border-color .16s ease, box-shadow .16s ease;}'
      + '#bestiaire-admin .beast-admin-card:hover{transform:translateY(-1px);}'
      + '#bestiaire-admin .beast-admin-card.is-selected{border-color:rgba(126,184,212,.38) !important;box-shadow:0 14px 30px rgba(0,0,0,.2), 0 0 0 1px rgba(126,184,212,.16) inset;}'
      + '#bestiaire-admin .beast-admin-card.is-selected .bnm{color:var(--glacier);}'
      + '#bestiaire-admin .beast-admin-card .beast-admin-actions .btn,#bestiaire-admin .beast-admin-card .beast-admin-actions .btn-sm,#bestiaire-admin .beast-admin-card .beast-admin-quick .btn,#bestiaire-admin .beast-admin-card .beast-admin-quick .btn-sm,#bestiaire-admin .beast-admin-card .bimg-wrap{position:relative;z-index:3;}'
      + 'body.light #bestiaire-admin .beast-admin-detail{background:linear-gradient(180deg, rgba(255,255,255,.98), rgba(244,248,252,.96));border-color:rgba(40,84,110,.12);box-shadow:0 18px 40px rgba(24,48,69,.08);}'
      + 'body.light #bestiaire-admin .beast-admin-detail-stat, body.light #bestiaire-admin .beast-admin-detail-block, body.light #bestiaire-admin .beast-admin-hero-media{background:rgba(255,255,255,.88);border-color:rgba(40,84,110,.12);}'
      + 'body.light #bestiaire-admin .beast-admin-completeness span, body.light #bestiaire-admin .beast-admin-last-combats span{background:rgba(255,255,255,.86);border-color:rgba(40,84,110,.12);color:#456070;}'
      + '@media (max-width: 1179px){#bestiaire-admin .beast-admin-shell{grid-template-columns:1fr;}#bestiaire-admin .beast-admin-detail{position:relative;top:auto;order:-1;}}'
      + '@media (max-width: 640px){#bestiaire-admin .beast-admin-hero{grid-template-columns:1fr;}#bestiaire-admin .beast-admin-detail-grid{grid-template-columns:1fr;}#bestiaire-admin .beast-admin-detail{padding:14px;}#bestiaire-admin .beast-admin-action-more>div{left:0;right:auto;}}';
    var style = document.createElement('style');
    style.id = 'beast-admin-pass2-style';
    style.textContent = css;
    document.head.appendChild(style);
  }
  function ensureShell(){
    if(!canManage()) return null;
    var list = ge('p-badmin-grd');
    if(!list) return null;
    ensureStyle();
    var shell = ge('beast-admin-shell');
    if(!shell){
      shell = document.createElement('div');
      shell.id = 'beast-admin-shell';
      shell.className = 'beast-admin-shell';
      var parent = list.parentNode;
      if(!parent) return null;
      parent.insertBefore(shell, list);
      shell.appendChild(list);
      var detail = document.createElement('aside');
      detail.id = 'beast-admin-detail';
      detail.className = 'beast-admin-detail';
      shell.appendChild(detail);
      list.classList.add('beast-admin-list');
    }
    return shell;
  }
  function cardBeastId(card){
    if(!card) return '';
    var direct = card.getAttribute('data-beast-id');
    if(direct) return direct;
    var btn = card.querySelector('button[onclick*="openEditBeast("]') || card.querySelector('button[onclick*="previewBeastAdmin("]') || card.querySelector('button[onclick*="duplicateBeast("]') || card.querySelector('[onclick*="bestiaryAddToCombat("]');
    var raw = btn && btn.getAttribute('onclick') || '';
    var m = raw.match(/(?:openEditBeast|previewBeastAdmin|duplicateBeast|bestiaryAddToCombat)\(\s*['\"]([^'\"]+)['\"]/);
    var id = m ? m[1] : '';
    if(id) card.setAttribute('data-beast-id', id);
    return id;
  }
  function bindCards(){
    var list = ge('p-badmin-grd'); if(!list) return;
    Array.prototype.forEach.call(list.querySelectorAll('.beast-admin-card'), function(card){
      var id = cardBeastId(card);
      if(!id) return;
      if(card.dataset.beastPass2Bound === '1') return;
      card.dataset.beastPass2Bound = '1';
      card.addEventListener('click', function(ev){
        if(ev.target && ev.target.closest('button,a,input,select,textarea,label,.bimg-wrap,.btn,.btn-sm')) return;
        selectBeast(id);
      });
    });
  }
  function syncSelectedClass(){
    var list = ge('p-badmin-grd'); if(!list) return;
    Array.prototype.forEach.call(list.querySelectorAll('.beast-admin-card'), function(card){
      card.classList.toggle('is-selected', String(cardBeastId(card)) === String(state.selectedId||''));
    });
  }
  function ensureValidSelection(){
    var list = ge('p-badmin-grd'); if(!list) return;
    var cards = Array.prototype.slice.call(list.querySelectorAll('.beast-admin-card')).filter(function(card){ return !!cardBeastId(card); });
    if(!cards.length){ state.selectedId = null; return; }
    var has = cards.some(function(card){ return String(cardBeastId(card)) === String(state.selectedId||''); });
    if(!has) state.selectedId = cardBeastId(cards[0]);
  }
  function selectBeast(id){
    state.selectedId = String(id||'') || null;
    syncSelectedClass();
    renderDetail();
    if(!isDesktop()){
      var panel = ge('beast-admin-detail');
      if(panel){ try{ panel.scrollIntoView({ behavior:'smooth', block:'start' }); }catch(_e){} }
    }
  }
  function actionBtn(label, cls, onclick){
    return '<button class="'+cls+'" onclick="'+onclick+'"><span>'+label+'</span></button>';
  }
  function actionMenu(items){
    return '<details class="beast-admin-action-more"><summary>Plus</summary><div>'+items.join('')+'</div></details>';
  }
  function renderDetail(){
    var panel = ge('beast-admin-detail'); if(!panel || !canManage()) return;
    var b = getBeast(state.selectedId);
    if(!b){
      panel.innerHTML = '<div class="beast-admin-detail-empty"><span class="ttl">Fiche staff</span><div style="font-family:var(--fd);font-size:22px;color:var(--text);letter-spacing:1px;">Sélectionne une créature</div><div style="font-size:13px;line-height:1.7;max-width:30ch;">Tu verras ici une fiche staff propre, les actions rapides, l’historique d’usage et les passerelles vers le simulateur.</div></div>';
      return;
    }
    var usage = usageFor(b.id);
    var comp = completeness(b);
    var danger = (typeof _beastThreatBand === 'function' ? (_beastThreatBand(b) || 'Modérée') : 'Modérée');
    var behaviorTag = (typeof cBehaviorTag === 'function' ? cBehaviorTag(b.beh, { fontSize:8, padding:'3px 9px', letterSpacing:'1.2px', radius:'999px' }) : '');
    var statusChips = ''
      + behaviorTag
      + (b.isBoss ? '<span class="beast-admin-chip danger">Boss</span>' : '')
      + (b.archived ? '<span class="beast-admin-chip warn">Archivée</span>' : (b.hidden ? '<span class="beast-admin-chip warn">Masquée</span>' : '<span class="beast-admin-chip good">Publiée</span>'))
      + '<span class="beast-admin-chip">'+esc(danger)+'</span>';
    var imgSrc = String((typeof _normalizeImageDataUrl==='function' ? _normalizeImageDataUrl(b.img) : (b.img||'')) || '').trim();
    var heroMedia = imgSrc
      ? '<div class="beast-admin-hero-media"><img src="'+esc(imgSrc)+'" alt=""></div>'
      : '<div class="beast-admin-hero-media"><div class="beast-admin-hero-fallback">'+esc(String((b.nom||'C').charAt(0).toUpperCase()))+'</div></div>';
    var completenessBadges = comp.complete
      ? '<span>Fiche complète</span>'
      : comp.issues.map(function(it){ return '<span>Manque : '+esc(it)+'</span>'; }).join('');
    panel.innerHTML = ''
      + '<div class="beast-admin-hero">'
        + heroMedia
        + '<div>'
          + '<div class="beast-admin-detail-badges">'+statusChips+'</div>'
          + '<div class="beast-admin-hero-title">'+esc(b.nom||'Créature')+'</div>'
          + '<div class="beast-admin-hero-sub">'+esc(b.sub||'Sans sous-titre')+'</div>'
          + '<div class="beast-admin-detail-actions">'
            + actionBtn('Éditer', 'btn btn-sm', 'openEditBeast(\''+jsesc(b.id)+'\')')
            + actionBtn('+ Combat', 'btn btn-sm btn-grn', 'bestiaryAddToCombat(\''+jsesc(b.id)+'\',1)')
            + actionMenu([
              actionBtn('Aperçu', 'btn btn-sm', 'previewBeastAdmin(\''+jsesc(b.id)+'\')'),
              actionBtn('Dupliquer', 'btn btn-sm', 'duplicateBeast(\''+jsesc(b.id)+'\')'),
              actionBtn('+ x2', 'btn btn-sm', 'bestiaryAddToCombat(\''+jsesc(b.id)+'\',2)'),
              actionBtn('+ x3', 'btn btn-sm', 'bestiaryAddToCombat(\''+jsesc(b.id)+'\',3)'),
              actionBtn(b.archived ? 'Restaurer' : 'Archiver', 'btn btn-sm', 'toggleBeastArchived(\''+jsesc(b.id)+'\')'),
              actionBtn('JSON', 'btn btn-sm', 'beastExportJson(\''+jsesc(b.id)+'\')')
            ])
          + '</div>'
        + '</div>'
      + '</div>'
      + '<div class="beast-admin-detail-grid">'
        + '<div class="beast-admin-detail-stat"><span class="k">Niveau</span><span class="v">'+esc(String(b.niv||1))+'</span></div>'
        + '<div class="beast-admin-detail-stat"><span class="k">PV</span><span class="v">'+esc(String(b.pv||0))+'</span></div>'
        + '<div class="beast-admin-detail-stat"><span class="k">EP</span><span class="v">'+esc(String(b.ep||0))+'</span></div>'
        + '<div class="beast-admin-detail-stat"><span class="k">Apparitions</span><span class="v">'+esc(String(usage.uses||0))+'</span></div>'
      + '</div>'
      + '<div class="beast-admin-detail-block"><span class="ttl">Résumé staff</span><div class="txt">'+esc((typeof _beastExtendedDesc === 'function' ? (_beastExtendedDesc(b)||b.desc||'') : (b.desc||'')) || 'Aucune description pour le moment.')+'</div></div>'
      + '<details class="beast-admin-detail-block"><summary>Complétude</summary><div class="txt" style="margin-top:8px;">'+(comp.complete ? 'La fiche est prête à être jouée.' : 'Cette fiche mérite encore une petite finition.')+'</div><div class="beast-admin-completeness">'+completenessBadges+'</div></details>'
      + '<details class="beast-admin-detail-block"><summary>Combat & simulateur</summary><div class="txt" style="margin-top:8px;">Morts enregistrées : <strong style="color:var(--text);">'+esc(String(usage.deaths||0))+'</strong><br>Dernière apparition : <strong style="color:var(--text);">'+esc(relDate(usage.lastAt))+'</strong><br>Frappe : <strong style="color:var(--text);">'+esc(b.frappe||'—')+'</strong><br>Compétence : <strong style="color:var(--text);">'+esc(b.comp||'—')+'</strong></div></details>'
      + '<details class="beast-admin-detail-block"><summary>Historique</summary><div class="txt" style="margin-top:8px;">'+(usage.combats.length ? 'Dernières archives où cette créature a été utilisée.' : 'Cette créature n’a pas encore de trace dans les archives de combat.')+'</div><div class="beast-admin-last-combats">'+(usage.combats.length ? usage.combats.map(function(name){ return '<span>'+esc(name)+'</span>'; }).join('') : '<span>Aucune apparition</span>')+'</div></details>'
      + '<details class="beast-admin-detail-block"><summary>Suivi staff</summary><div class="txt" style="margin-top:8px;">Créée : <strong style="color:var(--text);">'+esc(fmtDate(b.createdAt||0))+'</strong>' + (b.createdBy ? ' · par <strong style="color:var(--text);">'+esc(b.createdBy)+'</strong>' : '') + '<br>Modifiée : <strong style="color:var(--text);">'+esc(fmtDate(b.updatedAt||0))+'</strong>' + (b.updatedBy ? ' · par <strong style="color:var(--text);">'+esc(b.updatedBy)+'</strong>' : '') + '</div></details>'
      + '<details class="beast-admin-detail-block"><summary>Notes admin</summary><div class="txt" style="margin-top:8px;">'+esc(String(b.adminNotes||'').trim() || 'Aucune note staff pour le moment.')+'</div></details>';
    syncSelectedClass();
  }
  function enhanceCards(){
    bindCards();
    ensureValidSelection();
    renderDetail();
  }
  function patchRender(){
    if(window.__beastAdminPass2WrappedRender || typeof window.renderBGrid !== 'function') return;
    window.__beastAdminPass2WrappedRender = true;
    var orig = window.renderBGrid;
    var guard = false;
    window.renderBGrid = function(tid, staff){
      if(guard) return orig.apply(this, arguments);
      var out;
      guard = true;
      try{
        out = orig.apply(this, arguments);
      } finally {
        guard = false;
      }
      if(tid === 'p-badmin-grd' && canManage()){
        ensureShell();
        enhanceCards();
      }
      return out;
    };
  }
  function hookSwitchTab(){
    if(window.__beastAdminPass2SwitchWrapped || typeof window.switchTab !== 'function') return;
    window.__beastAdminPass2SwitchWrapped = true;
    var orig = window.switchTab;
    window.switchTab = function(){
      var out = orig.apply(this, arguments);
      if(String(arguments[0]||'') === 'bestiaire-admin'){
        setTimeout(function(){
          if(canManage()){
            ensureShell();
            enhanceCards();
          }
        }, 30);
      }
      return out;
    };
  }
  function init(){
    if(!canManage()) return;
    patchRender();
    hookSwitchTab();
    ensureShell();
    setTimeout(function(){
      try{ enhanceCards(); }catch(_e){}
    }, 80);
  }
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(init, 60); });
})();
