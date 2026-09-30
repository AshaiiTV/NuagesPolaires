/* The public Forge explores live rules without assigning a character's oath. */
(function(root){
  'use strict';
  var state={name:'',level:5,branch:0,tier:0,cat:'',rank:'',search:'',view:'tree',picks:{},libraryOpen:false};
  var mount=null;
  var glyphs=[
    '<path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6Z"/>',
    '<path d="m15 2-9 12h6l-3 8 10-13h-7Z"/>',
    '<path d="m12 2 8 5v6l-8 9-8-9V7Z"/><path d="m8 12 3 3 5-6"/>',
    '<path d="m3 6 4 4 5-7 5 7 4-4-3 13H6Z"/><path d="M7 16h10"/>'
  ];
  function glyph(index){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+glyphs[index%glyphs.length]+'</svg>';}
  function normal(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
  function catalogue(){
    var all=getAllSD();
    return Object.keys(all).filter(function(name){return isSermVisibleInLibrary(name,all[name]);})
      .sort(function(a,b){return Number(!!getSermEvolutionFrom(a,all[a]))-Number(!!getSermEvolutionFrom(b,all[b]))||a.localeCompare(b,'fr');})
      .map(function(name){return {name:name,data:all[name]};});
  }
  function category(item){return normalizeSermCat(item.data.cat||SERM_CATS[item.name]||'melee');}
  function rank(item){return getSermLevelKey(item.name,item.data);}
  function minimum(item){return Math.max(1,Number(item.data.minLevel)||(getSermEvolutionFrom(item.name,item.data)?10:1));}
  function branchesOf(item){return item?getBranches(item.name,item.data):[];}
  function selected(){return catalogue().find(function(item){return item.name===state.name;})||null;}
  function branchName(branch,index){return String(branch.nom||'Voie '+(index+1)).replace(/^Branche\s+[A-Z]\s*[—–-]\s*/i,'');}
  function nodeLabel(index,total){return index===0?'Éveil':index===total-1?'Apogée':index===1?'Ascension':index===2?'Maîtrise':'Palier '+(index+1);}
  function currentIndex(branch){
    var found=-1;
    (branch&&branch.paliers||[]).forEach(function(tier,index){if(Number(tier.niv)<=state.level) found=index;});
    return found;
  }
  function searchText(item){return normal([item.name,item.data.arme,item.data.evolvesFrom,item.data.playstyle,item.data.tagline,item.data.lore,branchesOf(item).map(function(br){return br.nom+' '+(br.style||'');}).join(' ')].join(' '));}
  function filtered(items){var query=normal(state.search).trim();return items.filter(function(item){return (!state.cat||category(item)===state.cat)&&(!state.rank||rank(item)===state.rank)&&(!query||searchText(item).indexOf(query)!==-1);});}
  function remember(){if(state.name) state.picks[state.name]={branch:state.branch,tier:state.tier};}
  function choose(name){
    remember();state.name=name;
    var branches=branchesOf(selected()),saved=state.picks[name];
    state.branch=saved&&branches[saved.branch]?saved.branch:0;
    var tiers=branches[state.branch]&&branches[state.branch].paliers||[];
    state.tier=saved&&tiers[saved.tier]?saved.tier:Math.max(0,currentIndex(branches[state.branch]));
  }
  function filterButton(group,value,label){var attr=group==='cat'?'data-cat':'data-level',active=(group==='cat'?state.cat:state.rank)===value;return '<button type="button" class="oath-filter-btn'+(active?' is-active':'')+'" '+attr+'="'+escAttr(value)+'" aria-pressed="'+active+'">'+esc(label)+'</button>';}
  function shell(items){
    var starters=items.filter(function(item){return isStarterSerment(item.name,item.data);}).length;
    var ranks=Array.from(new Set(items.map(rank)));
    return '<div id="serments-grid" class="oath-atlas">'
      +'<header class="oath-topbar"><div class="oath-brand-mark" aria-hidden="true">'+glyph(0)+'</div><div><span class="oath-eyebrow">Nuages Polaires / Codex vivant</span><h1>La Forge des Serments</h1></div><div class="oath-counts"><span><b>'+starters+'</b> origines</span><span><b>'+(items.length-starters)+'</b> évolutions</span></div><button type="button" class="oath-immersion-toggle" data-immersion aria-pressed="false"><span aria-hidden="true">⛶</span> Immersion</button></header>'
      +'<div class="oath-layout"><aside class="oath-library'+(state.libraryOpen?' is-open':'')+'" aria-label="Bibliothèque des serments"><div class="oath-library-head"><span class="oath-eyebrow">Choisis ton serment</span><button class="oath-library-toggle" type="button" data-toggle-library aria-expanded="'+state.libraryOpen+'"><strong>Armurerie</strong><span id="serment-result-count" role="status"></span><span aria-hidden="true">⌄</span></button></div><div class="oath-library-body">'
      +'<label class="oath-search" for="serment-search"><span>Rechercher</span><input id="serment-search" type="search" autocomplete="off" placeholder="Arme, serment, voie…" value="'+escAttr(state.search)+'"></label>'
      +'<div class="oath-filter" id="serm-level-filter" aria-label="Filtrer par rang">'+filterButton('rank','','Tous')+ranks.map(function(value){return filterButton('rank',value,SERM_LEVELS[value]||value);}).join('')+'</div>'
      +'<div class="oath-filter" id="serm-filter" aria-label="Filtrer par type">'+filterButton('cat','','Tous les types')+['melee','distance','magie','soutien'].filter(function(value){return items.some(function(item){return category(item)===value;});}).map(function(value){return filterButton('cat',value,getSermCatLabel(value));}).join('')+'</div>'
      +'<div class="oath-list" id="oath-list"></div></div></aside><main class="oath-stage" id="oath-stage" aria-label="Forge du serment sélectionné"></main></div><p class="oath-session-note">Exploration libre · Les choix de cet écran ne modifient pas ton personnage.</p></div>';
  }
  function listMarkup(items){
    if(!items.length) return '<p class="oath-empty">Aucun serment trouvé. Essaie un autre nom ou type.</p>';
    return items.map(function(item){return '<button type="button" class="oath-list-item'+(item.name===state.name?' is-active':'')+'" data-serment="'+escAttr(item.name)+'" data-level="'+escAttr(rank(item))+'" data-cat="'+escAttr(category(item))+'" aria-pressed="'+(item.name===state.name)+'"><span class="oath-list-art">'+getSermEmblem(item.name,52)+'</span><span class="oath-list-copy"><strong>'+esc(item.name)+'</strong><small>'+esc(getSermEvolutionFrom(item.name,item.data)?'↑ '+getSermEvolutionFrom(item.name,item.data):getSermCatLabel(category(item)))+'</small></span><span class="oath-list-arrow" aria-hidden="true">›</span></button>';}).join('');
  }
  function stat(value,label){return '<div class="oath-stat"><strong>'+esc(value==null?'—':value)+'</strong><span>'+esc(label)+'</span></div>';}
  function coords(branch,index,total){
    var xs=total===4?[34,22,18,29]:null;
    var progress=total>1?index/(total-1):.5;
    var x=xs?xs[index]:34-15*Math.sin(progress*Math.PI);
    return {x:branch===0?x:100-x,y:73-progress*57};
  }
  function linkMarkup(branches){
    var html='<svg class="oath-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">';
    branches.forEach(function(branch,bi){
      var previous={x:50,y:94},tiers=branch.paliers||[],active=currentIndex(branch);
      tiers.forEach(function(tier,ti){
        var point=coords(bi,ti,tiers.length),middle=(previous.y+point.y)/2;
        html+='<path class="oath-link'+(ti<=active?' is-lit':'')+(bi===state.branch&&ti<=active?' is-current':'')+'" data-link-branch="'+bi+'" data-link-tier="'+ti+'" vector-effect="non-scaling-stroke" d="M '+previous.x+' '+previous.y+' C '+previous.x+' '+middle+' '+point.x+' '+middle+' '+point.x+' '+point.y+'"/>';
        previous=point;
      });
    });
    return html+'</svg>';
  }
  function nodeState(branch,bi,ti){var current=currentIndex(branch);return ti>current?'À venir':ti===current?(bi===state.branch?'Actif':'Alternative'):'Remplacé';}
  function pathMarkup(branch,bi){
    var tiers=branch.paliers||[],active=currentIndex(branch);
    var html='<section class="oath-path'+(bi===state.branch?' is-chosen':'')+'" data-branch="'+bi+'" data-branch-label="Voie '+String.fromCharCode(65+bi)+'" aria-label="'+escAttr(branchName(branch,bi))+'"><div class="oath-node-list">';
    tiers.forEach(function(tier,ti){
      var point=coords(bi,ti,tiers.length),inspected=bi===state.branch&&ti===state.tier;
      html+='<button type="button" class="oath-node '+(ti<=active?'is-unlocked':'is-locked')+(bi===state.branch&&ti===active?' is-current':'')+(inspected?' is-selected':'')+'" style="--node-x:'+point.x+'%;--node-y:'+point.y+'%" data-node-branch="'+bi+'" data-node-tier="'+ti+'" data-required-level="'+escAttr(tier.niv)+'" aria-pressed="'+inspected+'" aria-label="Voie '+String.fromCharCode(65+bi)+', niveau '+escAttr(tier.niv)+', '+escAttr(nodeLabel(ti,tiers.length))+', '+escAttr(nodeState(branch,bi,ti))+'"><span class="oath-node-orb">'+glyph(ti)+'</span><span class="oath-node-copy"><small class="oath-node-level">NIV. '+esc(tier.niv)+'</small><strong class="oath-node-title">'+esc(nodeLabel(ti,tiers.length))+'</strong></span><span class="oath-node-state">'+esc(nodeState(branch,bi,ti))+'</span></button>';
    });
    return html+'</div></section>';
  }
  function branchSwitch(branch,bi){return '<button type="button" class="oath-path-heading'+(bi===state.branch?' is-chosen':'')+'" data-choose-branch="'+bi+'" aria-pressed="'+(bi===state.branch)+'"><span class="oath-path-letter">'+String.fromCharCode(65+bi)+'</span><span><small>'+esc(branch.style||'Spécialisation')+'</small><strong>'+esc(branchName(branch,bi))+'</strong></span></button>';}
  function progressMarkup(branch){
    var tiers=branch&&branch.paliers||[],count=currentIndex(branch)+1,next=tiers[count];
    return '<div class="oath-progress-readout"><div><span>'+count+' / '+tiers.length+' paliers atteints</span><strong>'+esc(next?'Prochain éveil · Niv. '+next.niv:'Voie à son apogée')+'</strong></div><div class="oath-progress-track"><i style="width:'+(tiers.length?count/tiers.length*100:0)+'%"></i></div></div>';
  }
  function levelMarkup(branches){
    var levels=Array.from(new Set([1].concat(branches.flatMap(function(br){return (br.paliers||[]).map(function(t){return Number(t.niv);});}),[20]))).sort(function(a,b){return a-b;});
    return '<section class="oath-levelbar"><div class="oath-level-label"><span class="oath-eyebrow">Niveau exploré</span><div><button type="button" class="oath-level-step" data-step-level="-1" aria-label="Diminuer le niveau">−</button><output id="oath-level-value" for="oath-level">'+state.level+'</output><button type="button" class="oath-level-step" data-step-level="1" aria-label="Augmenter le niveau">+</button></div></div><div class="oath-level-control"><label for="oath-level">Projette ta progression</label><input id="oath-level" type="range" min="1" max="20" step="1" value="'+state.level+'"><div class="oath-level-stops">'+levels.map(function(level){return '<button type="button" class="oath-level-stop" data-level-stop="'+level+'" aria-pressed="'+(level===state.level)+'">'+level+'</button>';}).join('')+'</div></div></section>';
  }
  function inspectorMarkup(branch,tier,index,total){
    if(!branch||!tier) return '<section class="oath-inspector"><p class="oath-empty">Les capacités de ce serment restent à définir.</p></section>';
    var actual=currentIndex(branch),unlocked=Number(tier.niv)<=state.level;
    var status=!unlocked?'À venir · Niveau '+tier.niv:index===actual?'Palier actif en aperçu':'Palier remplacé au niveau actuel';
    var html='<section class="oath-inspector"><div class="oath-inspector-head"><span class="oath-eyebrow">Capacité inspectée</span><span class="oath-inspector-status '+(unlocked?'is-unlocked':'is-locked')+'" role="status">'+esc(status)+'</span></div><div class="oath-inspector-sigil" aria-hidden="true">'+glyph(index)+'</div><div class="oath-inspector-index">VOIE '+String.fromCharCode(65+state.branch)+' / '+esc(nodeLabel(index,total))+' / NIV. '+esc(tier.niv)+'</div><h3 tabindex="-1">'+esc(tier.nom||branchName(branch,state.branch))+'</h3>';
    if(tier.cout) html+='<div class="oath-cost"><span>COÛT PRINCIPAL</span><strong>'+esc(tier.cout)+'</strong></div>';
    html+='<div class="oath-inspector-effect"><span>EFFET DU PALIER</span><p>'+esc(tier.desc||branch.desc||'Effet à définir.')+'</p></div>';
    if(branch.descPhys||branch.flavor||branch.visual){
      html+='<details class="oath-inspector-flavor"><summary>Manifestation & intention</summary>';
      if(branch.descPhys||branch.visual) html+='<p><b>En combat</b>'+esc(branch.descPhys||branch.visual)+'</p>';
      if(branch.flavor) html+='<p><b>Intention</b>'+esc(branch.flavor)+'</p>';
      html+='</details>';
    }
    if(branch.combatRules) html+='<div class="oath-inspector-rules">'+renderSermentRules(branch)+'</div>';
    html+='<p class="oath-inspector-note">Une seule voie. Seul son palier le plus élevé atteint s’applique. Les coûts propres aux opérations sont précisés dans l’effet.</p><button type="button" class="oath-copy-build" data-copy-build>Copier ce parcours <span aria-hidden="true">↗</span></button><span class="oath-action-status" role="status"></span></section>';
    return html;
  }
  function compareMarkup(branches){
    return '<section class="oath-compare" aria-label="Comparaison des voies au niveau '+state.level+'">'+branches.map(function(br,bi){
      var tiers=br.paliers||[],index=Math.max(0,currentIndex(br)),tier=tiers[index];
      return '<article class="oath-compare-card" data-branch="'+bi+'"><span class="oath-eyebrow">Voie '+String.fromCharCode(65+bi)+' · '+esc(br.style||'Spécialisation')+'</span><h3>'+esc(branchName(br,bi))+'</h3><p class="oath-compare-status">'+esc(currentIndex(br)<0?'Prochain palier · Niv. '+(tier&&tier.niv||'—'):'Palier applicable · Niv. '+(tier&&tier.niv||'—'))+'</p>'+(br.summary||br.desc?'<p>'+esc(br.summary||br.desc)+'</p>':'')+(tier?'<div class="oath-cost"><span>COÛT PRINCIPAL</span><strong>'+esc(tier.cout||'Voir effet')+'</strong></div><div class="oath-inspector-effect"><p>'+esc(tier.desc||br.desc||'Effet à définir.')+'</p></div>':'')+'<button type="button" data-inspect-branch="'+bi+'">Explorer cette voie <span aria-hidden="true">↗</span></button></article>';
    }).join('')+'</section>';
  }
  function evolutionMarkup(item,items){
    var parent=getSermEvolutionFrom(item.name,item.data),links=items.filter(function(candidate){return getSermEvolutionFrom(candidate.name,candidate.data)===item.name||candidate.name===parent;});
    if(!links.length) return '';
    return '<section class="oath-evolutions"><div><span class="oath-eyebrow">Au-delà du serment</span><h2>La métamorphose</h2><p>Atteins le niveau requis, puis reçois ton évolution du staff.</p></div><div class="oath-evo-links">'+links.map(function(link){return '<button type="button" class="oath-evo-btn" data-evolution="'+escAttr(link.name)+'"><span class="oath-evo-art">'+getSermEmblem(link.name,64)+'</span><span><small>'+esc(link.name===parent?'Revenir à l’origine':'Évolution · Niv. '+minimum(link))+'</small><strong>'+esc(link.name)+'</strong></span><span aria-hidden="true">↗</span></button>';}).join('')+'</div></section>';
  }
  function stageMarkup(item,items){
    if(!item) return '<div class="oath-empty oath-empty-stage">Aucun serment ne correspond à ces filtres. Ajuste ta recherche.</div>';
    var data=item.data,branches=branchesOf(item);
    if(!branches[state.branch]) state.branch=0;
    var branch=branches[state.branch],tiers=branch&&branch.paliers||[];
    if(!tiers[state.tier]) state.tier=Math.max(0,currentIndex(branch));
    var tier=tiers[state.tier];
    var heroArt=getSermEmblem(item.name,640).replace('loading="lazy"','loading="eager" fetchpriority="high"');
    var html='<section class="oath-hero"><div class="oath-hero-content"><div class="oath-hero-meta"><span>'+esc(getSermCatLabel(category(item)))+'</span><span>'+esc(getSermEvolutionFrom(item.name,data)?'Évolution · Niv. '+minimum(item):'Serment d’origine')+'</span></div><h2 class="oath-hero-title" tabindex="-1">'+esc(item.name)+'</h2><p class="oath-hero-tagline">'+esc(data.tagline||data.pitch||data.fantasy||data.arme)+'</p></div><div class="oath-stats">'+stat(data.pvN,'PV / niv.')+stat(data.epN,'EP / niv.')+stat(data.emN,'EM / niv.')+stat(data.dmg,'Dégâts')+'</div></section>';
    html+='<div class="oath-tree-grid"><section class="oath-tree"><div class="oath-tree-heading"><div><span class="oath-eyebrow">'+(branches.length===2?'Deux':branches.length)+' voies · un engagement</span><h2 tabindex="-1">Trace ta voie</h2></div><div class="oath-view-tabs" aria-label="Mode de lecture"><button type="button" data-oath-view="tree" aria-pressed="'+(state.view==='tree')+'">Constellation</button><button type="button" data-oath-view="compare" aria-pressed="'+(state.view==='compare')+'">Comparer</button></div></div><div class="oath-branch-switcher">'+branches.map(branchSwitch).join('')+'</div>';
    html+='<div class="oath-map'+(branches.length!==2||branches.some(function(br){return (br.paliers||[]).length>4;})?' is-linear':'')+'"'+(state.view==='tree'?'':' hidden')+'>'+linkMarkup(branches)+'<div class="oath-constellation-center"><div class="oath-orbit" aria-hidden="true"></div><div class="oath-orbit oath-orbit-inner" aria-hidden="true"></div><div class="oath-hero-art">'+heroArt+'</div><span class="oath-art-caption">'+esc(data.arme||item.name)+'</span><small>ARME LIÉE</small></div><div class="oath-paths">'+branches.map(pathMarkup).join('')+'</div><div class="oath-root"><span class="oath-root-sigil" aria-hidden="true">'+glyph(0)+'</span><div><small>NIVEAU '+String(minimum(item)).padStart(2,'0')+'</small><strong>'+esc(getSermEvolutionFrom(item.name,data)?'Serment évolué':'Le pacte originel')+'</strong></div></div></div>';
    html+='<div class="oath-compare-wrap"'+(state.view==='compare'?'':' hidden')+'>'+compareMarkup(branches)+'</div>'+levelMarkup(branches)+progressMarkup(branch)+'</section>'+inspectorMarkup(branch,tier,state.tier,tiers.length)+'</div>';
    html+=evolutionMarkup(item,items);
    html+='<details class="oath-codex"><summary><span class="oath-eyebrow">Les archives du serment</span><strong>L’histoire & l’art du combat</strong><span aria-hidden="true">+</span></summary><div class="oath-codex-body">';
    if(data.lore) html+='<p class="oath-hero-lore">'+esc(data.lore)+'</p>';
    if(data.weaponDescription) html+='<p class="oath-weapon-detail"><b>Silhouette de l’arme</b>'+esc(data.weaponDescription)+'</p>';
    html+='<div class="oath-brief">'+[['STYLE DE JEU',data.playstyle],['TON CHOIX',data.decision],['RÉPONSE ADVERSE',data.counterplay]].filter(function(row){return row[1];}).map(function(row){return '<div><span>'+row[0]+'</span><p>'+esc(row[1])+'</p></div>';}).join('')+'</div></div></details>';
    return html;
  }
  function refreshStage(){var stage=document.getElementById('oath-stage');if(stage) stage.innerHTML=stageMarkup(selected(),catalogue());}
  function refresh(options){
    if(!mount) return;
    var items=catalogue(),shown=filtered(items);
    if(!shown.some(function(item){return item.name===state.name;})) choose(shown.length?shown[0].name:'');
    document.getElementById('oath-list').innerHTML=listMarkup(shown);
    document.getElementById('serment-result-count').textContent=shown.length+' / '+items.length;
    mount.querySelectorAll('.oath-filter-btn').forEach(function(button){var active=button.hasAttribute('data-cat')?button.getAttribute('data-cat')===state.cat:button.getAttribute('data-level')===state.rank;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});
    refreshStage();
    if(options&&options.focusItem){var target=Array.from(mount.querySelectorAll('.oath-list-item')).find(function(button){return button.dataset.serment===state.name;});if(target) target.focus({preventScroll:true});}
  }
  function mobile(){return root.matchMedia&&root.matchMedia('(max-width: 760px)').matches;}
  function motion(){return root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';}
  function selectName(name,resetFilters){
    if(!catalogue().some(function(item){return item.name===name;})) return;
    choose(name);
    if(resetFilters){state.cat='';state.rank='';state.search='';document.getElementById('serment-search').value='';}
    if(mobile()){state.libraryOpen=false;mount.querySelector('.oath-library').classList.remove('is-open');mount.querySelector('[data-toggle-library]').setAttribute('aria-expanded','false');}
    refresh({focusItem:!resetFilters&&!mobile()});
    if(resetFilters||mobile()){var heading=mount.querySelector('.oath-hero-title');heading.focus({preventScroll:true});heading.scrollIntoView({behavior:motion(),block:'start'});}
  }
  function levelInput(value){
    state.level=Math.max(1,Math.min(20,Number(value)||1));
    var branches=branchesOf(selected()),branch=branches[state.branch],tiers=branch&&branch.paliers||[];
    state.tier=Math.max(0,currentIndex(branch));remember();
    document.getElementById('oath-level').value=state.level;document.getElementById('oath-level-value').textContent=state.level;
    mount.querySelectorAll('.oath-node').forEach(function(node){
      var bi=Number(node.dataset.nodeBranch),ti=Number(node.dataset.nodeTier),br=branches[bi],active=currentIndex(br),inspected=bi===state.branch&&ti===state.tier;
      node.classList.toggle('is-unlocked',ti<=active);node.classList.toggle('is-locked',ti>active);node.classList.toggle('is-current',bi===state.branch&&ti===active);node.classList.toggle('is-selected',inspected);node.setAttribute('aria-pressed',String(inspected));
      node.querySelector('.oath-node-state').textContent=nodeState(br,bi,ti);
      node.setAttribute('aria-label','Voie '+String.fromCharCode(65+bi)+', niveau '+node.dataset.requiredLevel+', '+nodeLabel(ti,(br.paliers||[]).length)+', '+nodeState(br,bi,ti));
    });
    mount.querySelectorAll('.oath-link').forEach(function(link){var bi=Number(link.dataset.linkBranch),ti=Number(link.dataset.linkTier),active=currentIndex(branches[bi]);link.classList.toggle('is-lit',ti<=active);link.classList.toggle('is-current',bi===state.branch&&ti<=active);});
    mount.querySelectorAll('[data-level-stop]').forEach(function(button){button.setAttribute('aria-pressed',String(Number(button.dataset.levelStop)===state.level));});
    var inspector=mount.querySelector('.oath-inspector');if(inspector) inspector.outerHTML=inspectorMarkup(branch,tiers[state.tier],state.tier,tiers.length);
    var progress=mount.querySelector('.oath-progress-readout');if(progress) progress.outerHTML=progressMarkup(branch);
    var comparison=mount.querySelector('.oath-compare-wrap');if(comparison) comparison.innerHTML=compareMarkup(branches);
  }
  function inspect(branch,tier,fromCompare){
    var branches=branchesOf(selected());state.branch=branch;state.tier=tier==null?Math.max(0,currentIndex(branches[branch])):tier;
    if(fromCompare) state.view='tree';remember();refreshStage();
    var target=mount.querySelector('.oath-node.is-selected');if(target) target.focus({preventScroll:true});
    if(mobile()){var heading=mount.querySelector('.oath-inspector h3');if(heading){heading.focus({preventScroll:true});heading.scrollIntoView({behavior:motion(),block:'start'});}}
  }
  async function copyBuild(){
    var item=selected(),branch=branchesOf(item)[state.branch],tier=branch&&branch.paliers&&branch.paliers[state.tier];if(!item||!tier) return;
    var text=[item.name+' — '+branchName(branch,state.branch),'Aperçu au niveau '+state.level+' · Palier inspecté : niveau '+tier.niv,item.data.arme,'Coût principal : '+(tier.cout||'voir effet'),tier.desc||branch.desc||'Effet à définir.','Une seule voie ; seul le palier le plus élevé atteint s’applique.'].join('\n');
    var status=mount.querySelector('.oath-action-status');
    try{await navigator.clipboard.writeText(text);if(status) status.textContent='Parcours copié.';}catch(error){if(status) status.textContent='Copie indisponible dans ce navigateur.';}
  }
  async function immersion(){
    var atlas=mount.querySelector('.oath-atlas');if(!atlas) return;
    if(atlas.classList.contains('is-immersive')){atlas.classList.remove('is-immersive');syncImmersion();return;}
    try{if(document.fullscreenElement===mount) await document.exitFullscreen();else if(mount.requestFullscreen) await mount.requestFullscreen();else throw new Error('unsupported');}
    catch(error){atlas.classList.toggle('is-immersive');syncImmersion();}
  }
  function syncImmersion(){if(!mount) return;var atlas=mount.querySelector('.oath-atlas');if(!atlas) return;var active=document.fullscreenElement===mount||atlas.classList.contains('is-immersive'),button=mount.querySelector('[data-immersion]');if(button){button.setAttribute('aria-pressed',String(active));button.innerHTML='<span aria-hidden="true">'+(active?'⊡':'⛶')+'</span> '+(active?'Quitter':'Immersion');}}
  function onClick(event){
    var button=event.target.closest('button');if(!button||!mount.contains(button)) return;
    if(button.hasAttribute('data-serment')) return selectName(button.dataset.serment,false);
    if(button.hasAttribute('data-evolution')) return selectName(button.dataset.evolution,true);
    if(button.hasAttribute('data-cat')){state.cat=button.dataset.cat;refresh();return;}
    if(button.hasAttribute('data-level')){state.rank=button.dataset.level;refresh();return;}
    if(button.hasAttribute('data-toggle-library')){state.libraryOpen=!state.libraryOpen;mount.querySelector('.oath-library').classList.toggle('is-open',state.libraryOpen);button.setAttribute('aria-expanded',String(state.libraryOpen));return;}
    if(button.hasAttribute('data-oath-view')){state.view=button.dataset.oathView;refreshStage();mount.querySelector('[data-oath-view="'+state.view+'"]').focus({preventScroll:true});return;}
    if(button.hasAttribute('data-choose-branch')){state.branch=Number(button.dataset.chooseBranch);state.tier=Math.max(0,currentIndex(branchesOf(selected())[state.branch]));remember();refreshStage();mount.querySelector('.oath-path-heading[aria-pressed="true"]').focus({preventScroll:true});return;}
    if(button.hasAttribute('data-node-tier')) return inspect(Number(button.dataset.nodeBranch),Number(button.dataset.nodeTier),false);
    if(button.hasAttribute('data-inspect-branch')) return inspect(Number(button.dataset.inspectBranch),null,true);
    if(button.hasAttribute('data-step-level')) return levelInput(state.level+Number(button.dataset.stepLevel));
    if(button.hasAttribute('data-level-stop')) return levelInput(button.dataset.levelStop);
    if(button.hasAttribute('data-copy-build')) return copyBuild();
    if(button.hasAttribute('data-immersion')) return immersion();
  }
  function onInput(event){if(event.target.id==='serment-search'){state.search=event.target.value;refresh();}if(event.target.id==='oath-level') levelInput(event.target.value);}
  function render(tid){
    mount=document.getElementById(tid);if(!mount) return;
    var items=catalogue();if(!items.some(function(item){return item.name===state.name;})) choose(items.find(function(item){return item.name==='Duelliste';})?.name||(items[0]&&items[0].name)||'');
    mount.innerHTML=shell(items);
    if(!mount._oathAtlasBound){mount.addEventListener('click',onClick);mount.addEventListener('input',onInput);document.addEventListener('fullscreenchange',syncImmersion);mount.addEventListener('keydown',function(event){if(event.key==='Escape'){var atlas=mount.querySelector('.oath-atlas');if(atlas&&atlas.classList.contains('is-immersive')){atlas.classList.remove('is-immersive');syncImmersion();}}});mount._oathAtlasBound=true;}
    refresh();syncImmersion();
  }
  root.NPSermentsAtlas={render:render,focus:function(name){selectName(name,true);},state:state};
})(typeof window!=='undefined'?window:globalThis);
