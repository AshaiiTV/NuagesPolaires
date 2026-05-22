(function(){
  var _beastAdminFilters = window._beastAdminFilters || {
    status:'active', image:'all', usage:'all', boss:'all', threat:'all', completeness:'all', sort:'updated_desc', minLvl:'', maxLvl:''
  };
  window._beastAdminFilters = _beastAdminFilters;
  var _beastUsageCache = { key:'', map:{} };

  function _staffCanManageBeasts(){ return !!(window.CU && can && can('manage_beasts')); }
  function _beastNow(){ return Date.now(); }
  function _beastAdminNormalizeMeta(b){
    if(!b || typeof b !== 'object') return b;
    if(b.archived == null) b.archived = !!b.isArchived;
    else b.archived = !!b.archived;
    b.isBoss = !!(b.isBoss || b.boss || (window.cBehaviorLabel && window.cBehaviorLabel(b.beh)==='Boss'));
    b.adminNotes = String(b.adminNotes || b.mjNotes || b.staffNotes || '').trim();
    var created = parseInt(b.createdAt,10); if(!created) created = parseInt(b.ts,10) || 0;
    var updated = parseInt(b.updatedAt,10); if(!updated) updated = created || 0;
    b.createdAt = created || 0;
    b.updatedAt = updated || 0;
    b.createdBy = String(b.createdBy || b.author || '').trim();
    b.updatedBy = String(b.updatedBy || '').trim();
    return b;
  }
  function _beastAdminNormalizeCollection(list){
    return (Array.isArray(list)?list:[]).map(function(b){ return _beastAdminNormalizeMeta(b); });
  }
  function _beastDangerScore(b){
    var niv=Number(b&&b.niv||0), pv=Number(b&&b.pv||0), ep=Number(b&&b.ep||0);
    return niv*2 + pv/8 + ep/10 + ((b&&b.isBoss)?8:0);
  }
  function _beastThreatKey(b){
    var band = (_beastThreatBand && _beastThreatBand(b)) || 'Menace modérée';
    if(/majeure/i.test(band)) return 'major';
    if(/élevée|elevee/i.test(band)) return 'high';
    if(/sérieuse|serieuse/i.test(band)) return 'serious';
    return 'moderate';
  }
  function _beastCompleteness(b){
    var issues=[];
    if(!String(b&&b.img||'').trim()) issues.push('image');
    if(!String(b&&b.desc||'').trim()) issues.push('description');
    if(!String(b&&b.frappe||'').trim()) issues.push('frappe');
    if(!String(b&&b.comp||'').trim()) issues.push('compétence');
    if(!String(b&&b.drops||'').trim() && !String(b&&b.gem||'').trim()) issues.push('butin');
    return { count:issues.length, issues:issues, complete:issues.length===0 };
  }
  function _beastFmtDate(ts){
    ts=parseInt(ts,10)||0; if(!ts) return 'Jamais';
    try{ return new Date(ts).toLocaleString('fr-FR',{ day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}); }catch(_e){ return String(ts); }
  }
  function _beastRelativeDate(ts){
    ts=parseInt(ts,10)||0; if(!ts) return 'Jamais';
    var diff=Math.max(0, _beastNow()-ts), d=Math.floor(diff/86400000), h=Math.floor(diff/3600000);
    if(d>=30) return _beastFmtDate(ts);
    if(d>=1) return 'Il y a '+d+' j';
    if(h>=1) return 'Il y a '+h+' h';
    return 'Récent';
  }
  function _beastUsageBuild(){
    var arcs=[];
    try{ arcs = (can && can('manage_mjs') && typeof getAllCombatArchives==='function') ? (getAllCombatArchives()||[]) : ((typeof getCombatArchives==='function') ? (getCombatArchives()||[]) : []); }catch(_e){ arcs=[]; }
    var key = String(arcs.length)+'|'+String(arcs[0]&&arcs[0].savedAt||'')+'|'+String(arcs[arcs.length-1]&&arcs[arcs.length-1].savedAt||'');
    if(_beastUsageCache.key === key) return _beastUsageCache.map;
    var map = Object.create(null);
    arcs.forEach(function(arc){
      if(!arc || arc._inProgress) return;
      var savedAt = parseInt(arc.savedAt||arc.ts||0,10)||0;
      var label = String(arc.name||arc.label||'Combat sans nom').trim() || 'Combat sans nom';
      ((arc.fighters)||[]).forEach(function(f){
        if(!f || f.type!=='beast') return;
        var bid = String(f.bid || f.id || '').trim();
        if(!bid) return;
        var s = map[bid] || (map[bid] = { uses:0, deaths:0, lastAt:0, combats:[] });
        s.uses += 1;
        if((parseInt(f.pvCur,10)||0) <= 0) s.deaths += 1;
        if(savedAt > s.lastAt) s.lastAt = savedAt;
        if(label && s.combats.indexOf(label) < 0) s.combats.unshift(label);
        if(s.combats.length > 5) s.combats.length = 5;
      });
    });
    _beastUsageCache = { key:key, map:map };
    return map;
  }
  function _beastUsageFor(id){ return _beastUsageBuild()[String(id||'')] || { uses:0, deaths:0, lastAt:0, combats:[] }; }
  function _beastStatusChip(b){
    if(b.archived) return '<span class="beast-admin-chip warn">Archivée</span>';
    if(b.hidden) return '<span class="beast-admin-chip warn">Masquée</span>';
    return '<span class="beast-admin-chip good">Publiée</span>';
  }
  function _beastBossChip(b){ return b&&b.isBoss ? '<span class="beast-admin-chip danger">Boss</span>' : ''; }
  function _beastCompletenessChip(info){
    info = info || {count:0, complete:true};
    return info.complete
      ? '<span class="beast-admin-chip good">Complète</span>'
      : '<span class="beast-admin-chip warn" title="'+esc((info.issues||[]).join(', '))+'">'+info.count+' manque'+(info.count>1?'s':'')+'</span>';
  }
  function _beastUsageChip(usage){
    usage = usage || {uses:0};
    return '<span class="beast-admin-chip">'+(usage.uses||0)+' apparition'+((usage.uses||0)>1?'s':'')+'</span>';
  }
  function _beastAdminSummary(beasts, filtered){
    var all = Array.isArray(beasts)?beasts:[];
    var visible = Array.isArray(filtered)?filtered:[];
    var incomplete = all.filter(function(b){ return !_beastCompleteness(b).complete; }).length;
    var card = ge('beast-admin-adv-stats'); if(!card) return;
    card.innerHTML = ''
      +'<div class="adv-stat"><strong>'+all.length+'</strong><span>Total</span></div>'
      +'<div class="adv-stat"><strong>'+visible.length+'</strong><span>Affichées</span></div>'
      +'<div class="adv-stat"><strong>'+incomplete+'</strong><span>À finir</span></div>'
      +'<div class="adv-stat"><strong>'+all.filter(function(b){ return _beastUsageFor(b.id).uses>0; }).length+'</strong><span>Jouées</span></div>';
  }
  function _beastEnsureAdminUi(){
    var tab = ge('bestiaire-admin'); if(!tab || !_staffCanManageBeasts()) return;
    var filters = ge('beast-admin-filters'); if(!filters) return;
    if(!ge('beast-admin-adv')){
      var wrap = document.createElement('div');
      wrap.id = 'beast-admin-adv';
      wrap.className = 'bestiary-admin-adv';
      wrap.innerHTML = ''
        +'<div class="adv-head">'
          +'<div><div class="adv-title">Bestiaire</div><div class="adv-sub">Recherche, tri et édition rapide. Les outils lourds sont rangés pour garder la page lisible.</div></div>'
          +'<div class="adv-actions">'
            +'<button class="btn btn-sm btn-grn" onclick="openModal(\'m-addb\')"><span>+ Nouvelle créature</span></button>'
            +'<details class="beast-admin-tools"><summary>Outils</summary><div>'
              +'<button class="btn btn-sm" onclick="beastImportJsonPrompt()"><span>Importer JSON</span></button>'
              +'<button class="btn btn-sm" onclick="beastExportAllJson()"><span>Exporter tout</span></button>'
              +'<button class="btn btn-sm" onclick="beastAdminResetFilters()"><span>Reset filtres</span></button>'
            +'</div></details>'
          +'</div>'
        +'</div>'
        +'<div class="adv-grid bestiary-admin-primary-filters">'
          +'<div class="adv-field"><label>Statut</label><select id="beast-admin-filter-status" onchange="beastAdminSetFilter(\'status\',this.value)"><option value="active">Actives</option><option value="all">Toutes</option><option value="published">Publiées</option><option value="hidden">Masquées</option><option value="archived">Archivées</option></select></div>'
          +'<div class="adv-field"><label>Tri</label><select id="beast-admin-filter-sort" onchange="beastAdminSetFilter(\'sort\',this.value)"><option value="updated_desc">Modifiées récemment</option><option value="updated_asc">Plus anciennes</option><option value="name_asc">Nom A → Z</option><option value="name_desc">Nom Z → A</option><option value="level_desc">Niveau décroissant</option><option value="level_asc">Niveau croissant</option><option value="danger_desc">Dangerosité</option><option value="usage_desc">Usage combat</option><option value="published_first">Publiées d\'abord</option></select></div>'
        +'</div>'
        +'<details class="beast-admin-advanced-filters"><summary>Filtres avancés</summary><div class="adv-grid">'
          +'<div class="adv-field"><label>Image</label><select id="beast-admin-filter-image" onchange="beastAdminSetFilter(\'image\',this.value)"><option value="all">Toutes</option><option value="with">Avec image</option><option value="without">Sans image</option></select></div>'
          +'<div class="adv-field"><label>Usage en combat</label><select id="beast-admin-filter-usage" onchange="beastAdminSetFilter(\'usage\',this.value)"><option value="all">Toutes</option><option value="recent">Utilisées récemment</option><option value="used">Déjà utilisées</option><option value="never">Jamais utilisées</option></select></div>'
          +'<div class="adv-field"><label>Boss</label><select id="beast-admin-filter-boss" onchange="beastAdminSetFilter(\'boss\',this.value)"><option value="all">Tous</option><option value="boss">Boss</option><option value="normal">Normales</option></select></div>'
          +'<div class="adv-field"><label>Menace</label><select id="beast-admin-filter-threat" onchange="beastAdminSetFilter(\'threat\',this.value)"><option value="all">Toutes</option><option value="moderate">Modérée</option><option value="serious">Sérieuse</option><option value="high">Élevée</option><option value="major">Majeure</option></select></div>'
          +'<div class="adv-field"><label>Complétude</label><select id="beast-admin-filter-completeness" onchange="beastAdminSetFilter(\'completeness\',this.value)"><option value="all">Toutes</option><option value="complete">Complètes</option><option value="incomplete">À finir</option></select></div>'
          +'<div class="adv-field"><label>Niveau min.</label><input id="beast-admin-filter-minlvl" type="number" min="1" placeholder="1" oninput="beastAdminSetFilter(\'minLvl\',this.value)"></div>'
          +'<div class="adv-field"><label>Niveau max.</label><input id="beast-admin-filter-maxlvl" type="number" min="1" placeholder="30" oninput="beastAdminSetFilter(\'maxLvl\',this.value)"></div>'
        +'</div></details>'
        +'<div class="adv-stats" id="beast-admin-adv-stats"></div>';
      filters.insertAdjacentElement('afterend', wrap);
    }
    ['status','image','usage','boss','threat','completeness','sort'].forEach(function(k){ var el=ge('beast-admin-filter-'+k); if(el) el.value=_beastAdminFilters[k]; });
    var minEl=ge('beast-admin-filter-minlvl'); if(minEl) minEl.value=_beastAdminFilters.minLvl;
    var maxEl=ge('beast-admin-filter-maxlvl'); if(maxEl) maxEl.value=_beastAdminFilters.maxLvl;
    _beastEnsureModalEnhancements();
  }
  function _beastEnsureModalEnhancements(){
    var addImgRow = ge('ab-img') && ge('ab-img').closest('.frow');
    if(addImgRow && !ge('ab-boss')){
      var extra = document.createElement('div');
      extra.className = 'beast-admin-edit-extra';
      extra.innerHTML = ''
        +'<div class="frow"><label class="flbl">Boss</label><label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border2);background:var(--bg3);border-radius:8px;"><input type="checkbox" id="ab-boss"><span style="font-size:13px;color:var(--text);">Marquer comme boss</span></label></div>'
        +'<div class="frow"><label class="flbl">Notes admin</label><textarea id="ab-notes" style="min-height:68px;" placeholder="Notes MJ, gimmicks, IA, points faibles..."></textarea></div>';
      addImgRow.insertAdjacentElement('afterend', extra);
    }
    var editImgRow = ge('eb-img') && ge('eb-img').closest('.frow');
    if(editImgRow && !ge('eb-boss')){
      var extra2 = document.createElement('div');
      extra2.className = 'beast-admin-edit-extra';
      extra2.innerHTML = ''
        +'<div class="frow"><label class="flbl">Boss</label><label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border2);background:var(--bg3);border-radius:8px;"><input type="checkbox" id="eb-boss"><span style="font-size:13px;color:var(--text);">Marquer comme boss</span></label></div>'
        +'<div class="frow"><label class="flbl">Notes admin</label><textarea id="eb-notes" style="min-height:72px;" placeholder="Notes MJ, gimmicks, IA, points faibles..."></textarea></div>';
      editImgRow.insertAdjacentElement('afterend', extra2);
    }
    if(!ge('beast-json-import-input')){
      var input = document.createElement('input');
      input.type = 'file'; input.id = 'beast-json-import-input'; input.accept = '.json,application/json'; input.style.display='none';
      input.onchange = function(){ beastImportJsonFile(this.files && this.files[0]); this.value=''; };
      document.body.appendChild(input);
    }
    if(!ge('m-beast-admin-preview')){
      var modal = document.createElement('div');
      modal.id='m-beast-admin-preview'; modal.className='moverlay';
      modal.innerHTML=''
        +'<div class="modal" style="max-width:980px;">'
        +'<button class="mclose" onclick="closeModal(\'m-beast-admin-preview\')">✕</button>'
        +'<div class="mtit">Aperçu bestiaire</div>'
        +'<div id="beast-admin-preview-content"></div>'
        +'</div>';
      document.body.appendChild(modal);
    }
  }
  function _beastAdminRenderTarget(){
    var adminTab=ge('bestiaire-admin');
    return (adminTab && adminTab.classList && adminTab.classList.contains('active') && ge('p-badmin-grd')) ? 'p-badmin-grd' : 'p-bgrd';
  }
  function _beastSyncSearchInputs(){
    var publicSearch=ge('beast-search-input'), adminSearch=ge('beast-admin-search-input');
    if(publicSearch) publicSearch.value=_beastSearch||'';
    if(adminSearch) adminSearch.value=_beastSearch||'';
  }
  function _beastEnsureAdminPageStyles(){
    if(ge('beast-admin-page-style')) return;
    var style=document.createElement('style');
    style.id='beast-admin-page-style';
    style.textContent=''
      +'#bestiaire-admin .beast-admin-page-head{margin-bottom:16px;padding:18px;border:1px solid rgba(201,168,76,.20);background:radial-gradient(circle at 0% 0%,rgba(201,168,76,.12),transparent 34%),linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.018));}'
      +'#bestiaire-admin .beast-admin-page-title{font-family:var(--fd);font-size:24px;letter-spacing:2px;color:var(--text);}'
      +'#bestiaire-admin .beast-admin-page-sub{font-size:13px;color:var(--dim);line-height:1.6;max-width:780px;margin-top:6px;}'
      +'#bestiaire-admin .beast-admin-page-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;}'
      +'#bestiaire-admin #beast-admin-search-input{width:100%;background:var(--bg3);border:1px solid var(--border2);color:var(--text);font-family:var(--fb);font-size:13px;padding:9px 12px;outline:none;box-sizing:border-box;}'
      +'#bestiaire-admin #beast-admin-filters{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 14px;}'
      +'#bestiaire-admin .bestiary-admin-adv{margin-bottom:14px;padding:14px 16px;border:1px solid rgba(126,184,212,.14);background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.018));}'
      +'#bestiaire-admin .bestiary-admin-adv .adv-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:12px;}'
      +'#bestiaire-admin .bestiary-admin-adv .adv-title{font-family:var(--fd);font-size:12px;letter-spacing:2px;color:var(--text);text-transform:uppercase;}'
      +'#bestiaire-admin .bestiary-admin-adv .adv-sub{font-size:12px;color:var(--dim);max-width:720px;line-height:1.5;}'
      +'#bestiaire-admin .bestiary-admin-adv .adv-actions,#bestiaire-admin .beast-admin-actions,#bestiaire-admin .beast-admin-badges{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}'
      +'#bestiaire-admin .bestiary-admin-adv .adv-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;}'
      +'#bestiaire-admin .bestiary-admin-adv .adv-field{display:flex;flex-direction:column;gap:6px;}'
      +'#bestiaire-admin .bestiary-admin-adv .adv-field label{font-family:var(--fd);font-size:8px;letter-spacing:2px;color:var(--faint);text-transform:uppercase;}'
      +'#bestiaire-admin .bestiary-admin-adv .adv-field select,#bestiaire-admin .bestiary-admin-adv .adv-field input{width:100%;padding:10px 12px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);}'
      +'#bestiaire-admin .bestiary-admin-adv .adv-stats{display:grid;grid-template-columns:repeat(4,minmax(110px,1fr));gap:8px;margin-top:12px;}'
      +'#bestiaire-admin .bestiary-admin-adv .adv-stat,#bestiaire-admin .beast-admin-stat{padding:10px 12px;border:1px solid rgba(126,184,212,.12);background:rgba(255,255,255,.025);border-radius:8px;}'
      +'#bestiaire-admin .bestiary-admin-adv .adv-stat strong{display:block;font-family:var(--fd);font-size:18px;letter-spacing:1px;color:var(--text);margin-bottom:3px;}'
      +'#bestiaire-admin .bestiary-admin-adv .adv-stat span{font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:1.8px;}'
      +'#bestiaire-admin .beast-admin-card{display:flex;flex-direction:column;gap:12px;}'
      +'#bestiaire-admin .beast-admin-top{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start;margin-bottom:6px;}'
      +'#bestiaire-admin .beast-admin-chip{display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border-radius:999px;border:1px solid rgba(126,184,212,.18);background:rgba(255,255,255,.04);font-family:var(--fd);font-size:8px;letter-spacing:1.3px;color:var(--faint);text-transform:uppercase;white-space:nowrap;}'
      +'#bestiaire-admin .beast-admin-chip.warn{border-color:rgba(201,168,76,.34);color:var(--gold);background:rgba(201,168,76,.08);}#bestiaire-admin .beast-admin-chip.good{border-color:rgba(123,207,155,.32);color:var(--green);background:rgba(123,207,155,.08);}#bestiaire-admin .beast-admin-chip.danger{border-color:rgba(201,74,74,.34);color:var(--red);background:rgba(201,74,74,.08);}'
      +'#bestiaire-admin .beast-admin-stats{display:grid;grid-template-columns:repeat(4,minmax(80px,1fr));gap:8px;}'
      +'#bestiaire-admin .beast-admin-stat .k{display:block;font-size:9px;color:var(--faint);letter-spacing:1.6px;text-transform:uppercase;margin-bottom:4px;}#bestiaire-admin .beast-admin-stat .v{display:block;font-family:var(--fd);font-size:15px;color:var(--text);}'
      +'#bestiaire-admin .beast-card-more,#bestiaire-admin .beast-card-details,#bestiaire-admin .beast-admin-tools,#bestiaire-admin .beast-admin-advanced-filters{position:relative;}'
      +'#bestiaire-admin .beast-card-more>summary,#bestiaire-admin .beast-card-details>summary,#bestiaire-admin .beast-admin-tools>summary,#bestiaire-admin .beast-admin-advanced-filters>summary{list-style:none;cursor:pointer;font-family:var(--fd);font-size:8px;letter-spacing:1.6px;color:var(--faint);text-transform:uppercase;}'
      +'#bestiaire-admin .beast-card-more>summary::-webkit-details-marker,#bestiaire-admin .beast-card-details>summary::-webkit-details-marker,#bestiaire-admin .beast-admin-tools>summary::-webkit-details-marker,#bestiaire-admin .beast-admin-advanced-filters>summary::-webkit-details-marker{display:none;}'
      +'#bestiaire-admin .beast-card-more>div,#bestiaire-admin .beast-admin-tools>div{position:absolute;right:0;top:calc(100% + 6px);z-index:30;display:grid;gap:6px;min-width:150px;padding:8px;border:1px solid var(--border2);background:var(--bg2);box-shadow:0 18px 40px rgba(0,0,0,.35);}'
      +'#bestiaire-admin .beast-card-more .btn,#bestiaire-admin .beast-admin-tools .btn{width:100%;justify-content:center;}'
      +'#bestiaire-admin .beast-card-details{margin-top:10px;padding-top:10px;border-top:1px solid rgba(126,184,212,.08);}#bestiaire-admin .beast-card-details>div{display:grid;gap:9px;margin-top:9px;}'
      +'#bestiaire-admin .beast-admin-meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;}#bestiaire-admin .beast-admin-note,#bestiaire-admin .beast-admin-usage{padding:10px 12px;border-radius:8px;background:rgba(255,255,255,.025);border:1px solid rgba(126,184,212,.08);}'
      +'#bestiaire-admin .beast-admin-usage-list{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px;}#bestiaire-admin .beast-admin-usage-list span{font-size:10px;color:var(--dim);padding:3px 7px;border-radius:999px;border:1px solid rgba(126,184,212,.08);background:rgba(255,255,255,.02);}'
      +'#bestiaire-admin .beast-preview-shell{display:grid;grid-template-columns:220px 1fr;gap:18px;align-items:start;}#bestiaire-admin .beast-preview-media{border:1px solid rgba(126,184,212,.12);background:rgba(255,255,255,.03);border-radius:10px;overflow:hidden;min-height:220px;display:flex;align-items:center;justify-content:center;}#bestiaire-admin .beast-preview-media img{width:100%;height:100%;object-fit:cover;display:block;}#bestiaire-admin .beast-preview-grid{display:grid;grid-template-columns:repeat(4,minmax(90px,1fr));gap:10px;margin:12px 0;}#bestiaire-admin .beast-preview-grid>div{padding:10px 12px;border-radius:8px;background:rgba(255,255,255,.03);border:1px solid rgba(126,184,212,.08);}'
      +'#bestiaire-admin .beast-admin-edit-extra{display:grid;grid-template-columns:1fr 1fr;gap:10px;}'
      +'body.light #bestiaire-admin .bestiary-admin-adv,body.light #bestiaire-admin .beast-admin-card,body.light #bestiaire-admin .beast-admin-note,body.light #bestiaire-admin .beast-admin-usage,body.light #bestiaire-admin .beast-admin-stat,body.light #bestiaire-admin .adv-stat,body.light #bestiaire-admin .beast-preview-media,body.light #bestiaire-admin .beast-preview-grid>div{background:rgba(255,255,255,.76);border-color:rgba(40,84,110,.12);}'
      +'@media(max-width:820px){#bestiaire-admin .bestiary-admin-adv .adv-stats,#bestiaire-admin .beast-admin-stats,#bestiaire-admin .beast-preview-grid,#bestiaire-admin .beast-admin-meta,#bestiaire-admin .beast-admin-edit-extra{grid-template-columns:1fr 1fr;}#bestiaire-admin .beast-preview-shell{grid-template-columns:1fr;}}@media(max-width:560px){#bestiaire-admin .bestiary-admin-adv .adv-stats,#bestiaire-admin .beast-admin-stats,#bestiaire-admin .beast-preview-grid,#bestiaire-admin .beast-admin-meta,#bestiaire-admin .beast-admin-edit-extra{grid-template-columns:1fr;}}';
    document.head.appendChild(style);
  }
  window.renderBestiaryAdminPage = function(tid){
    var el=ge(tid); if(!el) return;
    if(!_staffCanManageBeasts()){
      el.innerHTML='<div class="card"><div class="card-title">Accès réservé</div><p style="color:var(--dim);">Création bestiaire est réservée aux admins et designers.</p></div>';
      return;
    }
    _beastEnsureAdminPageStyles();
    el.innerHTML=''
      +'<div class="beast-admin-page-head"><div class="beast-admin-page-title">Création bestiaire</div><div class="beast-admin-page-sub">Espace réservé admin/designer pour créer, corriger, archiver, importer et préparer les créatures. Le Bestiaire reste une page de consultation propre.</div><div class="beast-admin-page-actions"><button class="btn btn-sm btn-grn" onclick="openModal(\'m-addb\')"><span>+ Nouvelle créature</span></button><button class="btn btn-sm" onclick="openBeastZoneManager()"><span>Zones d’apparition</span></button></div></div>'
      +'<div style="margin-bottom:10px;"><input type="text" id="beast-admin-search-input" placeholder="Rechercher une créature, note, niveau, compétence..." value="'+esc(_beastSearch||'')+'" oninput="beastSearch(this.value)" autocomplete="off"></div>'
      +'<div id="beast-admin-filters"><button class="bfilt '+(_beastFilter==='all'?'active':'')+'" data-beh="all" onclick="setBeastFilter(\'all\',this)">Tous</button><button class="bfilt '+(_beastFilter==='Gibier'?'active':'')+'" data-beh="Gibier" onclick="setBeastFilter(\'Gibier\',this)">🐇 Gibier</button><button class="bfilt '+(_beastFilter==='Passif'?'active':'')+'" data-beh="Passif" onclick="setBeastFilter(\'Passif\',this)">😐 Passif</button><button class="bfilt '+(_beastFilter==='Neutre'?'active':'')+'" data-beh="Neutre" onclick="setBeastFilter(\'Neutre\',this)">⚖ Neutre</button><button class="bfilt '+(_beastFilter==='Agressif'?'active':'')+'" data-beh="Agressif" onclick="setBeastFilter(\'Agressif\',this)">⚠ Agressif</button><button class="bfilt '+(_beastFilter==='Très agressif'?'active':'')+'" data-beh="Très agressif" onclick="setBeastFilter(\'Très agressif\',this)">☠ Très agressif</button><div style="width:1px;background:var(--border2);margin:0 2px;"></div><button class="bfilt" onclick="toggleBeastPvSort(this)">PV ↕</button><button class="bfilt" onclick="toggleBeastNivSort(this)">Niv ↕</button><button class="bfilt" onclick="toggleBeastAlpha(this)">A→Z</button></div>'
      +'<div class="bgrd" id="p-badmin-grd"></div>';
    _beastEnsureAdminUi();
    renderBGrid('p-badmin-grd', true);
  };
  window.beastAdminSetFilter = function(key, value){ _beastAdminFilters[key]=value; renderBGrid(_beastAdminRenderTarget(), true); };
  window.beastAdminResetFilters = function(){
    _beastAdminFilters.status='active'; _beastAdminFilters.image='all'; _beastAdminFilters.usage='all'; _beastAdminFilters.boss='all'; _beastAdminFilters.threat='all'; _beastAdminFilters.completeness='all'; _beastAdminFilters.sort='updated_desc'; _beastAdminFilters.minLvl=''; _beastAdminFilters.maxLvl='';
    _beastPvSort=null; _beastNivSort=null; _beastAlpha=null;
    _beastSearch='';
    _beastSyncSearchInputs();
    document.querySelectorAll('.bfilt[data-beh]').forEach(function(b){ b.classList.remove('active'); if(b.getAttribute('data-beh')==='all') b.classList.add('active'); });
    _beastFilter='all';
    renderBGrid(_beastAdminRenderTarget(), true);
  };
  window.beastSearch = function(q){ _beastSearch=(q||'').toLowerCase().trim(); _beastSyncSearchInputs(); renderBGrid(_beastAdminRenderTarget(), _beastAdminRenderTarget()!=='p-bgrd'); };
  window.setBeastFilter = function(beh,btn){ _beastFilter=beh; document.querySelectorAll('.bfilt[data-beh]').forEach(function(b){b.classList.remove('active');}); if(btn) btn.classList.add('active'); renderBGrid(_beastAdminRenderTarget(), _beastAdminRenderTarget()!=='p-bgrd'); };
  window.toggleBeastPvSort = function(btn){ _beastNivSort=null; _beastAlpha=null; _clearSortBtns && _clearSortBtns('bfilt-pv'); var n=ge('bfilt-niv'), a=ge('bfilt-az'); if(n) n.textContent='Niv ↕'; if(a) a.textContent='A→Z'; _beastPvSort=(_beastPvSort===null||_beastPvSort==='desc')?'asc':'desc'; if(btn){ btn.textContent='PV '+(_beastPvSort==='asc'?'↑':'↓'); btn.classList.add('active'); } renderBGrid(_beastAdminRenderTarget(), _beastAdminRenderTarget()!=='p-bgrd'); };
  window.toggleBeastNivSort = function(btn){ _beastPvSort=null; _beastAlpha=null; _clearSortBtns && _clearSortBtns('bfilt-niv'); var p=ge('bfilt-pv'), a=ge('bfilt-az'); if(p) p.textContent='PV ↕'; if(a) a.textContent='A→Z'; _beastNivSort=(_beastNivSort===null||_beastNivSort==='desc')?'asc':'desc'; if(btn){ btn.textContent='Niv '+(_beastNivSort==='asc'?'↑':'↓'); btn.classList.add('active'); } renderBGrid(_beastAdminRenderTarget(), _beastAdminRenderTarget()!=='p-bgrd'); };
  window.toggleBeastAlpha = function(btn){ _beastPvSort=null; _beastNivSort=null; _clearSortBtns && _clearSortBtns('bfilt-az'); var p=ge('bfilt-pv'), n=ge('bfilt-niv'); if(p) p.textContent='PV ↕'; if(n) n.textContent='Niv ↕'; _beastAlpha=(_beastAlpha===null||_beastAlpha==='desc')?'asc':'desc'; if(btn){ btn.textContent=_beastAlpha==='asc'?'A→Z':'Z→A'; btn.classList.add('active'); } renderBGrid(_beastAdminRenderTarget(), _beastAdminRenderTarget()!=='p-bgrd'); };

  window.bCard = function(b,staff){
    _beastAdminNormalizeMeta(b);
    var usage=_beastUsageFor(b.id), completeness=_beastCompleteness(b);
    var col=(window.cBehaviorColor?window.cBehaviorColor(b.beh||b.behavior||b.comportement):'var(--glacier)');
    var lbl=(window.cBehaviorLabel?window.cBehaviorLabel(b.beh||b.behavior||b.comportement):String((b.beh||b.behavior||b.comportement)||'').replace(/^./,function(m){return m.toUpperCase();}));
    var canEdit=staff&&can('manage_beasts');
    var canDel=staff&&can('delete_beast');
    var isPublicView=!canEdit;
    var _imgSrc=(typeof _normalizeImageDataUrl==='function'?_normalizeImageDataUrl(b.img):String(b.img||'').trim());
    var img=_imgSrc ? '<img src="'+esc(_imgSrc)+'" class="bimg" onerror="this.style.display=\'none\';this.nextSibling&&(this.nextSibling.style.display=\'flex\');">' : '';
    var placeholder='<div class="bimg-ph" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;"><div style="font-family:var(--fd);font-size:28px;color:var(--faint);letter-spacing:2px;">'+esc(String((b.nom||'C').charAt(0).toUpperCase()))+'</div><div style="font-family:var(--fd);font-size:7px;letter-spacing:3px;color:var(--faint);opacity:.6;">'+esc(String((b.sub||'Créature').split(' — ')[0]).toUpperCase())+'</div></div>';
    var media = canEdit
      ? '<div class="bimg-wrap" onclick="openBeastImgCrop(\''+jsesc(b.id)+'\')" title="Importer / recadrer une image">'+img+placeholder+'<div class="bimg-edit-ov">✎</div></div>'
      : img + placeholder;
    if(isPublicView){
      return '<div class="bcrd">'+media+'<div class="bbody"><div class="bnm">'+esc(b.nom)+'</div><div class="bsub">'+esc(b.sub||'')+'</div><div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;">'+(lbl?window.cBehaviorTag(b.beh,{fontSize:8,padding:'2px 8px',letterSpacing:'1.5px',radius:'2px'}):'')+'<span style="color:var(--faint);font-size:10px;">Niv. '+esc(String(b.niv||1))+'</span></div><div class="bdesc">'+esc(_beastExtendedDesc(b)||b.desc||'')+'</div><table class="btbl"><tbody><tr><td>PV</td><td style="color:var(--green);font-family:var(--fm)">'+esc(String(b.pv||0))+'</td><td>EP</td><td style="color:var(--gold);font-family:var(--fm)">'+esc(String(b.ep||0))+'</td></tr><tr><td colspan="2">Frappe</td><td colspan="2" style="font-family:var(--fm);font-size:13px">'+esc(String(b.frappe||''))+'</td></tr></tbody></table><div class="bcomp"><span class="bclbl">COMPÉTENCE</span>'+esc(b.comp||'')+'</div><div class="bdrop"><span>BUTIN</span>'+esc(b.drops||'')+'</div><div class="bdrop"><span>DROP GEMME (D100)</span>'+esc(b.gem||'')+'</div></div></div>';
    }
    var editBtn = canEdit ? '<button class="btn btn-sm" onclick="openEditBeast(\''+jsesc(b.id)+'\')"><span>Éditer</span></button>' : '';
    var quickBtns = canEdit ? '<button class="btn btn-sm btn-grn" onclick="bestiaryAddToCombat(\''+jsesc(b.id)+'\',1)"><span>+ Combat</span></button>' : '';
    var moreActions = canEdit ? '<details class="beast-card-more"><summary>Plus</summary><div><button class="btn btn-sm" onclick="previewBeastAdmin(\''+jsesc(b.id)+'\')"><span>Aperçu</span></button><button class="btn btn-sm" onclick="duplicateBeast(\''+jsesc(b.id)+'\')"><span>Dupliquer</span></button><button class="btn btn-sm" onclick="beastExportJson(\''+jsesc(b.id)+'\')"><span>JSON</span></button><button class="btn btn-sm" onclick="toggleBeastArchived(\''+jsesc(b.id)+'\')"><span>'+(b.archived?'Restaurer':'Archiver')+'</span></button>'+(canDel?'<button class="btn btn-sm btn-red" onclick="delBeast(\''+jsesc(b.id)+'\')"><span>Purger</span></button>':'')+'</div></details>' : '';
    return '<div class="bcrd beast-admin-card" style="'+(b.archived?'opacity:.86;':'')+'">'+media+'<div class="bbody"><div class="beast-admin-top"><div><div class="bnm">'+esc(b.nom)+'</div><div class="bsub">'+esc(b.sub||'')+'</div><div class="beast-admin-badges">'+(lbl?window.cBehaviorTag(b.beh,{fontSize:8,padding:'3px 9px',letterSpacing:'1.3px',radius:'999px'}):'')+_beastStatusChip(b)+_beastCompletenessChip(completeness)+'</div></div><div class="beast-admin-actions">'+editBtn+quickBtns+moreActions+'</div></div><div class="bdesc">'+esc(_beastExtendedDesc(b)||b.desc||'')+'</div><div class="beast-admin-stats"><div class="beast-admin-stat"><span class="k">Niveau</span><span class="v">'+esc(String(b.niv||1))+'</span></div><div class="beast-admin-stat"><span class="k">PV</span><span class="v">'+esc(String(b.pv||0))+'</span></div><div class="beast-admin-stat"><span class="k">EP</span><span class="v">'+esc(String(b.ep||0))+'</span></div><div class="beast-admin-stat"><span class="k">Usage</span><span class="v">'+esc(String(usage.uses||0))+'</span></div></div><table class="btbl"><tbody><tr><td colspan="2">Frappe</td><td colspan="2" style="font-family:var(--fm);font-size:13px">'+esc(String(b.frappe||'—'))+'</td></tr></tbody></table><div class="bcomp"><span class="bclbl">COMPÉTENCE</span>'+esc(b.comp||'—')+'</div><details class="beast-card-details"><summary>Détails</summary><div>'+(b.style?'<div class="bcomp" style="border-color:rgba(126,184,212,.15);"><span class="bclbl" style="color:var(--glacier);">STYLE DE COMBAT</span>'+esc(b.style)+'</div>':'')+'<div class="bdrop"><span>BUTIN</span>'+esc(b.drops||'—')+'</div><div class="bdrop"><span>DROP GEMME (D100)</span>'+esc(b.gem||'—')+'</div></div></details></div></div>';
  };

  window.renderBGrid = function(tid,staff){
    _beastEnsureAdminUi();
    var beasts=_beastAdminNormalizeCollection(gb());
    var el=ge(tid); if(!el) return;
    var shouldRefocus = tid==='p-bgrd' && !!(ge('bestiaire') && ge('bestiaire').classList.contains('active'));
    var adminMode=tid==='p-badmin-grd' && !!(staff&&_staffCanManageBeasts());
    var filtered=(_beastFilter==='all'?beasts.slice():beasts.filter(function(b){ return ((window.BHL&&BHL[b.beh])||String(b.beh||'').replace(/^./,function(m){return m.toUpperCase();}))===_beastFilter; }));
    if(!adminMode) filtered=filtered.filter(function(b){ return !b.hidden && !b.archived; });
    if(_beastSearch){ var q=_beastSearch; filtered=filtered.filter(function(b){ return [b.nom,b.sub,b.desc,b.comp,b.frappe,b.drops,b.gem,String(b.niv||'')].join(' ').toLowerCase().indexOf(q)>-1; }); }
    if(adminMode){
      filtered=filtered.filter(function(b){
        var usage=_beastUsageFor(b.id), comp=_beastCompleteness(b), lvl=parseInt(b.niv,10)||0;
        if(_beastAdminFilters.status==='published' && (b.hidden||b.archived)) return false;
        if(_beastAdminFilters.status==='hidden' && (!b.hidden || b.archived)) return false;
        if(_beastAdminFilters.status==='archived' && !b.archived) return false;
        if(_beastAdminFilters.status==='active' && b.archived) return false;
        if(_beastAdminFilters.image==='with' && !String(b.img||'').trim()) return false;
        if(_beastAdminFilters.image==='without' && String(b.img||'').trim()) return false;
        if(_beastAdminFilters.usage==='used' && !(usage.uses>0)) return false;
        if(_beastAdminFilters.usage==='never' && usage.uses>0) return false;
        if(_beastAdminFilters.usage==='recent' && !(usage.lastAt && (_beastNow()-usage.lastAt)<=30*86400000)) return false;
        if(_beastAdminFilters.boss==='boss' && !b.isBoss) return false;
        if(_beastAdminFilters.boss==='normal' && b.isBoss) return false;
        if(_beastAdminFilters.threat!=='all' && _beastThreatKey(b)!==_beastAdminFilters.threat) return false;
        if(_beastAdminFilters.completeness==='complete' && !comp.complete) return false;
        if(_beastAdminFilters.completeness==='incomplete' && comp.complete) return false;
        if(_beastAdminFilters.minLvl!=='' && lvl < (parseInt(_beastAdminFilters.minLvl,10)||0)) return false;
        if(_beastAdminFilters.maxLvl!=='' && lvl > (parseInt(_beastAdminFilters.maxLvl,10)||999)) return false;
        return true;
      });
      switch(_beastAdminFilters.sort){
        case 'updated_desc': filtered.sort(function(a,b){ return (b.updatedAt||b.createdAt||0) - (a.updatedAt||a.createdAt||0); }); break;
        case 'updated_asc': filtered.sort(function(a,b){ return (a.updatedAt||a.createdAt||0) - (b.updatedAt||b.createdAt||0); }); break;
        case 'name_asc': filtered.sort(function(a,b){ return String(a.nom||'').localeCompare(String(b.nom||''),'fr'); }); break;
        case 'name_desc': filtered.sort(function(a,b){ return String(b.nom||'').localeCompare(String(a.nom||''),'fr'); }); break;
        case 'level_desc': filtered.sort(function(a,b){ return (b.niv||0)-(a.niv||0); }); break;
        case 'level_asc': filtered.sort(function(a,b){ return (a.niv||0)-(b.niv||0); }); break;
        case 'danger_desc': filtered.sort(function(a,b){ return _beastDangerScore(b)-_beastDangerScore(a); }); break;
        case 'usage_desc': filtered.sort(function(a,b){ return _beastUsageFor(b.id).uses - _beastUsageFor(a.id).uses; }); break;
        case 'published_first': filtered.sort(function(a,b){ var av=(a.archived?2:(a.hidden?1:0)), bv=(b.archived?2:(b.hidden?1:0)); return av-bv || String(a.nom||'').localeCompare(String(b.nom||''),'fr'); }); break;
      }
    }
    if(!adminMode && !_beastPvSort && !_beastNivSort && !_beastAlpha){
      filtered.sort(function(a,b){ return String(a.nom||'').localeCompare(String(b.nom||''),'fr',{sensitivity:'base'}); });
    }
    if(_beastPvSort) filtered.sort(function(a,b){ return _beastPvSort==='asc' ? ((a.pv||0)-(b.pv||0)) : ((b.pv||0)-(a.pv||0)); });
    if(_beastNivSort) filtered.sort(function(a,b){ return _beastNivSort==='asc' ? ((a.niv||0)-(b.niv||0)) : ((b.niv||0)-(a.niv||0)); });
    if(_beastAlpha) filtered.sort(function(a,b){ var r=String(a.nom||'').localeCompare(String(b.nom||''),'fr'); return _beastAlpha==='asc'?r:-r; });
    if(adminMode) _beastAdminSummary(beasts, filtered);
    if(!filtered.length){ el.innerHTML='<p style="color:var(--faint);font-style:italic;padding:20px 0;">Aucune créature pour ces filtres.</p>'; if(shouldRefocus){ setTimeout(function(){ try{ _focusOnScreen(ge('bestiaire'),'auto'); }catch(_e){} },0);} return; }
    el.innerHTML=filtered.map(function(b){ return window.bCard(b,adminMode); }).join('');
    if(shouldRefocus){ setTimeout(function(){ try{ _focusOnScreen(ge('bestiaire'),'auto'); }catch(_e){} },0); }
  };

  window.openEditBeast = function(id){
    if(!_staffCanManageBeasts()){ notif('Non autorisé.','err'); return; }
    _beastEnsureModalEnhancements();
    var b=_beastAdminNormalizeMeta((gb()||[]).find(function(x){ return x.id===id; })); if(!b) return;
    var behMap={'Gibier':'1','Passif':'2','Neutre':'3','Agressif':'4','Très agressif':'5','Boss':'3'};
    ge('eb-id').value=b.id; ge('eb-n').value=b.nom||''; ge('eb-sub').value=b.sub||''; ge('eb-beh').value=behMap[b.beh]||'3'; ge('eb-niv').value=b.niv||1; ge('eb-pv').value=b.pv||''; ge('eb-ep').value=b.ep||''; ge('eb-fr').value=b.frappe||''; ge('eb-co').value=b.comp||''; ge('eb-dr').value=b.drops||''; ge('eb-gm').value=b.gem||''; ge('eb-de').value=b.desc||''; ge('eb-img').value=b.img||''; if(ge('eb-zones')) ge('eb-zones').value=(Array.isArray(b.zones)?b.zones:[]).join(', '); if(ge('eb-note')) ge('eb-note').value=b.adminNote||b.adminNotes||''; if(ge('eb-hidden')) ge('eb-hidden').checked=!!b.hidden; if(ge('eb-archived')) ge('eb-archived').checked=!!b.archived; if(ge('eb-notes')) ge('eb-notes').value=b.adminNotes||b.adminNote||''; if(ge('eb-boss')) ge('eb-boss').checked=!!b.isBoss; ge('eb-err').textContent=''; var modalEl=ge('m-editb'); if(modalEl) _hoistModalToRoot(modalEl); openModal('m-editb');
  };
  window.addBeast = function(){
    if(!_staffCanManageBeasts()){ notif('Permission insuffisante.','err'); return; }
    var n=(ge('ab-n').value||'').trim(); if(!n){ notif('Nom requis.','err'); return; }
    var behArr=['','Gibier','Passif','Neutre','Agressif','Très agressif'];
    var now=_beastNow();
    var adminNote=(ge('ab-note')?ge('ab-note').value.trim():'') || (ge('ab-notes')?ge('ab-notes').value.trim():'');
    var b={ id:'b'+now, nom:n, sub:(ge('ab-sub')?ge('ab-sub').value.trim():'') , beh:behArr[parseInt(ge('ab-beh').value,10)]||'Neutre', niv:(parseInt(ge('ab-niv').value,10)||1), pv:(parseInt(ge('ab-pv').value,10)||20), ep:(parseInt(ge('ab-ep').value,10)||20), img:(ge('ab-img').value||'').trim(), zones:(typeof _beastZoneInputValues==='function'?_beastZoneInputValues('ab-zones'):[]), frappe:(ge('ab-fr').value||'').trim(), comp:(ge('ab-co').value||'').trim(), drops:(ge('ab-dr').value||'').trim(), gem:(ge('ab-gm').value||'').trim(), desc:(ge('ab-de').value||'').trim(), isBoss:!!(ge('ab-boss')&&ge('ab-boss').checked), adminNote:adminNote, adminNotes:adminNote, hidden:!!(ge('ab-hidden')&&ge('ab-hidden').checked), archived:!!(ge('ab-archived')&&ge('ab-archived').checked), createdAt:now, updatedAt:now, createdBy:(window.CU&&CU.name)||'', updatedBy:(window.CU&&CU.name)||'' };
    var bs=gb(); bs.push(_beastAdminNormalizeMeta(b)); sb(bs); closeModal('m-addb'); ['ab-n','ab-sub','ab-fr','ab-co','ab-dr','ab-gm','ab-de','ab-img','ab-zones','ab-note'].forEach(function(id){ if(ge(id)) ge(id).value=''; }); if(ge('ab-niv')) ge('ab-niv').value=1; if(ge('ab-pv')) ge('ab-pv').value=20; if(ge('ab-ep')) ge('ab-ep').value=20; if(ge('ab-notes')) ge('ab-notes').value=''; if(ge('ab-boss')) ge('ab-boss').checked=false; if(ge('ab-hidden')) ge('ab-hidden').checked=false; if(ge('ab-archived')) ge('ab-archived').checked=false; renderBGrid(_beastAdminRenderTarget(), _beastAdminRenderTarget()!=='p-bgrd'); notif(n+' ajouté.','ok');
  };
  window.saveEditBeast = function(){
    if(!_staffCanManageBeasts()) return;
    var id=ge('eb-id').value, beasts=gb(), b=beasts.find(function(x){ return x.id===id; });
    if(!b){ ge('eb-err').textContent='Créature introuvable.'; return; }
    var behArr=['','Gibier','Passif','Neutre','Agressif','Très agressif'];
    var editAdminNote=(ge('eb-note')?ge('eb-note').value.trim():'') || (ge('eb-notes')?ge('eb-notes').value.trim():'');
    b.nom=(ge('eb-n').value||'').trim()||b.nom; b.sub=(ge('eb-sub').value||'').trim(); b.beh=behArr[parseInt(ge('eb-beh').value,10)]||b.beh; b.niv=parseInt(ge('eb-niv').value,10)||b.niv; b.pv=parseInt(ge('eb-pv').value,10)||b.pv; b.ep=parseInt(ge('eb-ep').value,10)||b.ep; b.frappe=(ge('eb-fr').value||'').trim()||b.frappe; b.comp=(ge('eb-co').value||'').trim(); b.drops=(ge('eb-dr').value||'').trim(); b.gem=(ge('eb-gm').value||'').trim(); b.desc=(ge('eb-de').value||'').trim(); b.img=(ge('eb-img').value||'').trim(); b.zones=(typeof _beastZoneInputValues==='function'?_beastZoneInputValues('eb-zones'):(Array.isArray(b.zones)?b.zones:[])); b.hidden=!!(ge('eb-hidden')&&ge('eb-hidden').checked); b.archived=!!(ge('eb-archived')&&ge('eb-archived').checked); b.isBoss=!!(ge('eb-boss')&&ge('eb-boss').checked); b.adminNote=editAdminNote; b.adminNotes=editAdminNote; b.updatedAt=_beastNow(); b.updatedBy=(window.CU&&CU.name)||''; _beastAdminNormalizeMeta(b); sb(beasts); closeModal('m-editb'); renderBGrid(_beastAdminRenderTarget(), _beastAdminRenderTarget()!=='p-bgrd'); notif(b.nom+' mis à jour.','ok');
  };
  window.delBeast = function(id){
    if(!can('delete_beast')){ notif('Permission insuffisante.','err'); return; }
    var b=(gb()||[]).find(function(x){ return x.id===id; });
    if(!b) return;
    if(!confirm('Purger définitivement "'+(b.nom||'cette créature')+'" ? L\'archive et l\'historique d\'usage ne seront pas supprimés des combats déjà joués.')) return;
    sb(gb().filter(function(x){ return x.id!==id; })); renderBGrid(_beastAdminRenderTarget(), _beastAdminRenderTarget()!=='p-bgrd'); notif('Créature supprimée.','inf');
  };
  window.toggleBeastArchived = function(id){
    if(!_staffCanManageBeasts()) return;
    var beasts=gb(), b=beasts.find(function(x){ return x.id===id; }); if(!b) return;
    b.archived=!b.archived; b.updatedAt=_beastNow(); b.updatedBy=(window.CU&&CU.name)||''; _beastAdminNormalizeMeta(b); sb(beasts); renderBGrid(_beastAdminRenderTarget(), _beastAdminRenderTarget()!=='p-bgrd'); notif(b.nom+(b.archived?' archivée.':' restaurée.'),'ok');
  };
  window.duplicateBeast = function(id){
    if(!_staffCanManageBeasts()) return;
    var src=(gb()||[]).find(function(x){ return x.id===id; }); if(!src) return;
    var copy=JSON.parse(JSON.stringify(src)); var now=_beastNow();
    copy.id='b'+now; copy.nom=(copy.nom||'Créature')+' (copie)'; copy.createdAt=now; copy.updatedAt=now; copy.createdBy=(window.CU&&CU.name)||''; copy.updatedBy=(window.CU&&CU.name)||''; copy.archived=false; _beastAdminNormalizeMeta(copy);
    var beasts=gb(); beasts.unshift(copy); sb(beasts); renderBGrid(_beastAdminRenderTarget(), _beastAdminRenderTarget()!=='p-bgrd'); notif(copy.nom+' créée.','ok');
  };
  window.previewBeastAdmin = function(id){
    _beastEnsureModalEnhancements();
    var b=_beastAdminNormalizeMeta((gb()||[]).find(function(x){ return x.id===id; })); if(!b) return;
    var usage=_beastUsageFor(id), comp=_beastCompleteness(b), tgt=ge('beast-admin-preview-content'); if(!tgt) return;
    tgt.innerHTML=''
      +'<div class="beast-preview-shell">'
        +'<div class="beast-preview-media">'+(b.img?'<img src="'+esc(b.img)+'" alt="">':'<div style="font-family:var(--fd);font-size:30px;color:var(--faint);letter-spacing:2px;">'+esc(String((b.nom||'C').charAt(0).toUpperCase()))+'</div>')+'</div>'
        +'<div>'
          +'<div class="beast-admin-badges">'+(window.cBehaviorTag?window.cBehaviorTag(b.beh,{fontSize:8,padding:'3px 9px',letterSpacing:'1.3px',radius:'999px'}):'')+_beastBossChip(b)+_beastStatusChip(b)+_beastCompletenessChip(comp)+'</div>'
          +'<div style="font-family:var(--fd);font-size:24px;letter-spacing:1.5px;color:var(--text);margin:10px 0 4px;">'+esc(b.nom||'Créature')+'</div>'
          +'<div style="font-size:13px;color:var(--dim);margin-bottom:10px;">'+esc(b.sub||'')+'</div>'
          +'<div style="font-size:13px;color:var(--text);line-height:1.68;">'+esc(_beastExtendedDesc(b)||b.desc||'')+'</div>'
          +'<div class="beast-preview-grid">'
            +'<div><span class="ttl">Niveau</span><strong>'+esc(String(b.niv||1))+'</strong></div>'
            +'<div><span class="ttl">PV</span><strong>'+esc(String(b.pv||0))+'</strong></div>'
            +'<div><span class="ttl">EP</span><strong>'+esc(String(b.ep||0))+'</strong></div>'
            +'<div><span class="ttl">Menace</span><strong style="font-size:12px;">'+esc((_beastThreatBand&&_beastThreatBand(b))||'Modérée')+'</strong></div>'
          +'</div>'
          +'<div class="beast-admin-meta">'
            +'<div class="beast-admin-note"><span class="ttl">Complétude</span><div style="font-size:12px;color:var(--dim);line-height:1.55;">'+(comp.complete?'Fiche complète.':'Éléments manquants : '+esc(comp.issues.join(', ')))+'</div><div style="margin-top:8px;font-size:12px;color:var(--dim);">Créée : <strong style="color:var(--text);">'+esc(_beastFmtDate(b.createdAt))+'</strong><br>Modifiée : <strong style="color:var(--text);">'+esc(_beastFmtDate(b.updatedAt))+'</strong></div></div>'
            +'<div class="beast-admin-usage"><span class="ttl">Usage combat</span><div style="font-size:12px;color:var(--dim);line-height:1.55;">Apparitions : <strong style="color:var(--text);">'+(usage.uses||0)+'</strong><br>Morts : <strong style="color:var(--text);">'+(usage.deaths||0)+'</strong><br>Dernière apparition : <strong style="color:var(--text);">'+esc(_beastFmtDate(usage.lastAt))+'</strong></div>'+(usage.combats&&usage.combats.length?'<div class="beast-admin-usage-list">'+usage.combats.map(function(name){return '<span>'+esc(name)+'</span>';}).join('')+'</div>':'')+'</div>'
          +'</div>'
          +'<div class="bcomp" style="margin-top:12px;"><span class="bclbl">COMPÉTENCE</span>'+esc(b.comp||'—')+'</div>'
          +'<div class="bcomp" style="margin-top:10px;"><span class="bclbl">FRAPPE</span>'+esc(b.frappe||'—')+'</div>'
          +'<div class="beast-admin-meta" style="margin-top:12px;">'
            +'<div class="bdrop"><span>BUTIN</span>'+esc(b.drops||'—')+'</div>'
            +'<div class="bdrop"><span>DROP GEMME</span>'+esc(b.gem||'—')+'</div>'
          +'</div>'
          +'<div class="beast-admin-note" style="margin-top:12px;"><span class="ttl">Notes admin</span><div style="font-size:12px;color:var(--dim);line-height:1.6;">'+esc(b.adminNotes||'Aucune note staff.')+'</div></div>'
        +'</div>'
      +'</div>';
    openModal('m-beast-admin-preview');
  };
  function _beastDownload(name, text){
    var blob = new Blob([text], {type:'application/json'}), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href=url; a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){ try{ URL.revokeObjectURL(url); a.remove(); }catch(_e){} }, 0);
  }
  window.beastExportJson = function(id){ var b=(gb()||[]).find(function(x){ return x.id===id; }); if(!b) return; _beastDownload((b.nom||'creature').replace(/[^a-z0-9-_]+/gi,'_').toLowerCase()+'.json', JSON.stringify(b,null,2)); };
  window.beastExportAllJson = function(){ _beastDownload('bestiaire-nuages-polaires.json', JSON.stringify(gb()||[], null, 2)); };
  window.beastImportJsonPrompt = function(){ _beastEnsureModalEnhancements(); var el=ge('beast-json-import-input'); if(el) el.click(); };
  window.beastImportJsonFile = function(file){
    if(!_staffCanManageBeasts() || !file) return;
    var fr = new FileReader();
    fr.onload = function(){
      try{
        var raw = JSON.parse(String(fr.result||'null'));
        var items = Array.isArray(raw) ? raw : (Array.isArray(raw&&raw.beasts) ? raw.beasts : [raw]);
        var beasts = gb();
        items.forEach(function(entry, idx){
          if(!entry || typeof entry !== 'object') return;
          var copy = JSON.parse(JSON.stringify(entry));
          var existing = beasts.some(function(b){ return String(b.id||'')===String(copy.id||''); });
          if(existing || !copy.id) copy.id='b'+_beastNow().toString(36)+String(idx);
          copy.createdAt=parseInt(copy.createdAt,10)||_beastNow(); copy.updatedAt=_beastNow(); copy.createdBy=copy.createdBy||((window.CU&&CU.name)||''); copy.updatedBy=(window.CU&&CU.name)||'';
          beasts.unshift(_beastAdminNormalizeMeta(copy));
        });
        sb(beasts); renderBGrid(_beastAdminRenderTarget(), _beastAdminRenderTarget()!=='p-bgrd'); notif('Import JSON terminé.','ok');
      }catch(err){ console.error(err); notif('JSON invalide.','err'); }
    };
    fr.readAsText(file, 'utf-8');
  };
  window.bestiaryAddToCombat = function(id, count){
    if(!_staffCanManageBeasts()) return;
    count=Math.max(1, parseInt(count,10)||1);
    try{ if(typeof combatBlankState==='function' && (!window._cs || typeof _cs!=='object')) window._cs = combatBlankState(); }catch(_e){}
    for(var i=0;i<count;i++) combatAddBeast(id);
    try{ switchTab('combat-mj', null); }catch(_e){}
    notif('Créature ajoutée au simulateur ('+count+').','ok');
  };
  var _origToggleBeastHidden = window.toggleBeastHidden;
  window.toggleBeastHidden = function(id){
    if(typeof _origToggleBeastHidden==='function') _origToggleBeastHidden(id);
    else {
      var beasts=gb(), b=beasts.find(function(x){return x.id===id;}); if(!b) return; b.hidden=!b.hidden; b.updatedAt=_beastNow(); b.updatedBy=(window.CU&&CU.name)||''; sb(beasts);
    }
    renderBGrid(_beastAdminRenderTarget(), _beastAdminRenderTarget()!=='p-bgrd');
  };
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(_beastEnsureAdminUi, 0); });
})();
