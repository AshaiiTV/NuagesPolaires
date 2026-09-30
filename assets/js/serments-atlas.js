/* A reading-first catalogue. Exploration never assigns an oath or alters a character. */
(function(root){
  'use strict';
  var state={name:'',level:1,branch:0,tier:0,cat:'',rank:'',search:'',discovery:false,picks:{},libraryOpen:false};
  var mount=null,levelInitialized=false,libraryMedia=null;
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
  function tierLabel(tier,index){return tier&&tier.nom||'Palier '+(index+1);}
  function paragraphs(value,className){return String(value||'').split(/\n\s*\n/).filter(Boolean).map(function(text){return '<p class="'+className+'">'+esc(text)+'</p>';}).join('');}
  function currentIndex(branch){
    var found=-1,highest=-Infinity;
    (branch&&branch.paliers||[]).forEach(function(tier,index){var level=Number(tier.niv);if(level<=state.level&&level>=highest){found=index;highest=level;}});
    return found;
  }
  function orderedTiers(branch){return (branch&&branch.paliers||[]).map(function(tier,index){return {tier:tier,index:index};}).sort(function(a,b){return Number(a.tier.niv)-Number(b.tier.niv)||a.index-b.index;});}
  function nextIndex(branch){var next=orderedTiers(branch).find(function(entry){return Number(entry.tier.niv)>state.level;});return next?next.index:-1;}
  function firstIndex(branch){var entries=orderedTiers(branch);return entries.length?entries[0].index:0;}
  function defaultTier(branch){var index=currentIndex(branch);return index<0?firstIndex(branch):index;}
  function tierColor(index){return ['jade','azure','violet','gold'][Math.min(3,Math.max(0,index))];}
  function locked(branch,index){return Number((branch.paliers||[])[index]?.niv)>state.level;}
  function sealed(branch,index){return state.discovery&&locked(branch,index)&&index!==nextIndex(branch);}
  function obscured(branch,index){return state.discovery&&locked(branch,index);}
  function ownLevel(){
    var player=typeof CU!=='undefined'&&CU&&CU.pid&&typeof gpid==='function'?gpid(CU.pid):null;
    var value=Number(player&&player.level);return Number.isFinite(value)&&value>=1?Math.floor(value):null;
  }
  function mobile(){return root.matchMedia&&root.matchMedia('(max-width: 760px)').matches;}
  function motion(){return root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';}
  function searchText(item){return normal([item.name,item.data.arme,item.data.evolvesFrom,item.data.playstyle,item.data.tagline,item.data.vow,branchesOf(item).map(function(br){return br.nom+' '+(br.style||'')+' '+(br.paliers||[]).map(function(tier){return tier.nom||'';}).join(' ');}).join(' ')].join(' '));}
  function filtered(items){var query=normal(state.search).trim();return items.filter(function(item){return (!state.cat||category(item)===state.cat)&&(!state.rank||rank(item)===state.rank)&&(!query||searchText(item).indexOf(query)!==-1);});}
  function remember(){if(state.name)state.picks[state.name]={branch:state.branch,tier:state.tier};}
  function choose(name){
    remember();state.name=name;
    var branches=branchesOf(selected()),saved=state.picks[name];
    state.branch=saved&&branches[saved.branch]?saved.branch:0;
    var branch=branches[state.branch],tiers=branch&&branch.paliers||[];
    state.tier=saved&&tiers[saved.tier]?saved.tier:defaultTier(branch);
  }
  function rankLabel(value){return value==='basic'?'Serments de départ':value==='seasoned'?'Évolutions':SERM_LEVELS[value]||value;}
  function shell(items){
    var ranks=Array.from(new Set(items.map(rank)));
    return '<div id="serments-grid" class="oath-atlas">'
      +'<header class="oath-topbar"><div><h1>La Forge des Serments</h1><p>Découvre un serment, compare ses voies et consulte ses capacités par niveau.</p></div><small class="oath-catalogue-count">'+items.length+' serments</small></header>'
      +'<div class="oath-layout"><aside class="oath-library" aria-label="Catalogue des serments"><div class="oath-library-head"><button class="oath-library-toggle" type="button" data-toggle-library aria-controls="oath-library-body" aria-expanded="'+(!mobile())+'"><strong>Choisir un serment</strong><span aria-hidden="true">⌄</span></button></div><div class="oath-library-body" id="oath-library-body">'
      +'<label class="oath-search" for="serment-search"><span>Rechercher</span><input id="serment-search" type="search" autocomplete="off" placeholder="Nom, arme ou voie…" value="'+escAttr(state.search)+'"></label>'
      +'<div class="oath-filters"><label for="oath-category">Style<select id="oath-category"><option value="">Tous les styles</option>'+['melee','distance','magie','soutien'].filter(function(value){return items.some(function(item){return category(item)===value;});}).map(function(value){return '<option value="'+escAttr(value)+'">'+esc(getSermCatLabel(value))+'</option>';}).join('')+'</select></label>'
      +'<label for="oath-rank">Type<select id="oath-rank"><option value="">Tous les serments</option>'+ranks.map(function(value){return '<option value="'+escAttr(value)+'">'+esc(rankLabel(value))+'</option>';}).join('')+'</select></label></div>'
      +'<p id="serment-result-count" class="oath-result-count" role="status"></p><div class="oath-list" id="oath-list"></div></div></aside><main class="oath-stage" id="oath-stage" aria-label="Serment consulté"></main></div></div>';
  }
  function listMarkup(items){
    if(!items.length)return '<p class="oath-empty">Aucun résultat. Essaie un autre nom ou enlève un filtre.</p>';
    return items.map(function(item){var evolution=!!getSermEvolutionFrom(item.name,item.data);return '<button type="button" class="oath-list-item'+(item.name===state.name?' is-active':'')+'" data-serment="'+escAttr(item.name)+'" data-level="'+escAttr(rank(item))+'" data-cat="'+escAttr(category(item))+'" aria-pressed="'+(item.name===state.name)+'"><span class="oath-list-art">'+getSermEmblem(item.name,52)+'</span><span class="oath-list-copy"><strong>'+esc(item.name)+'</strong><small>'+esc(evolution?'Évolution · niveau '+minimum(item):getSermCatLabel(category(item)))+'</small></span></button>';}).join('');
  }
  function stat(value,label){return '<div class="oath-stat"><strong>'+esc(value==null?'—':value)+'</strong><span>'+esc(label)+'</span></div>';}
  function branchPitch(branch){return branch.gameplay&&branch.gameplay.pitch||branch.summary||branch.desc||branch.style||'Consulte les capacités de cette voie.';}
  function branchSwitch(branch,bi){
    var hidden=state.discovery&&currentIndex(branch)<0;
    return '<button type="button" class="oath-path-heading'+(bi===state.branch?' is-chosen':'')+'" data-choose-branch="'+bi+'" aria-pressed="'+(bi===state.branch)+'"><span class="oath-path-letter" aria-hidden="true">'+String.fromCharCode(65+bi)+'</span><span class="oath-branch-copy"><strong>'+esc(branchName(branch,bi))+'</strong><span class="oath-branch-pitch">'+esc(hidden?'Les détails de cette voie sont masqués par ton option de lecture.':branchPitch(branch))+'</span><small class="oath-branch-selection">'+(bi===state.branch?'Voie consultée':'Voir les capacités →')+'</small></span></button>';
  }
  function gameGuideMarkup(branch){
    if(!branch||!branch.gameplay||state.discovery&&currentIndex(branch)<0)return '';
    return '<div class="oath-play-guide"><dl><dt>Pour commencer</dt><dd>'+esc(branch.gameplay.opening||branch.gameplay.pitch)+'</dd></dl>'+(branch.gameplay.choice?'<details class="oath-tactical-tip"><summary>Le choix à faire en combat</summary><p>'+esc(branch.gameplay.choice)+'</p></details>':'')+'</div>';
  }
  function nodeState(branch,index){return sealed(branch,index)?'Capacité masquée':locked(branch,index)?'À venir':index===currentIndex(branch)?'Palier de référence':'Ancien palier';}
  function nodeMarkup(branch,bi,index){
    var tier=branch.paliers[index],active=currentIndex(branch),hidden=sealed(branch,index),blocked=locked(branch,index),inspected=bi===state.branch&&index===state.tier;
    return '<button type="button" class="oath-node '+(blocked?'is-locked':'is-unlocked')+(hidden?' is-sealed':'')+(index===nextIndex(branch)?' is-next':'')+(!blocked&&index!==active?' is-legacy':'')+(bi===state.branch&&index===active?' is-current':'')+(inspected?' is-selected':'')+'" data-tier-color="'+tierColor(index)+'" data-node-branch="'+bi+'" data-node-tier="'+index+'" data-required-level="'+escAttr(tier.niv)+'" aria-pressed="'+inspected+'" aria-label="Niveau '+escAttr(tier.niv)+', '+escAttr(hidden?'Capacité masquée':tierLabel(tier,index))+', '+escAttr(nodeState(branch,index))+'"><span class="oath-node-marker"><small>Niv.</small><b>'+esc(tier.niv)+'</b></span><span class="oath-node-copy"><strong class="oath-node-title">'+esc(hidden?'???':tierLabel(tier,index))+'</strong><small class="oath-node-state">'+esc(nodeState(branch,index))+'</small></span></button>';
  }
  function pathMarkup(branch,bi){
    return '<div class="oath-path" data-branch="'+bi+'"><ol class="oath-node-list">'+orderedTiers(branch).map(function(entry){return '<li>'+nodeMarkup(branch,bi,entry.index)+'</li>';}).join('')+'</ol></div>';
  }
  function levelMarkup(branches){
    var mine=ownLevel();
    return '<div class="oath-levelbar"><label class="oath-level-field" for="oath-level"><span>Niveau de référence</span><input id="oath-level" type="number" inputmode="numeric" min="1" step="1" value="'+state.level+'" aria-describedby="oath-level-help"></label>'+(mine?'<button type="button" class="oath-own-level" data-own-level>Mon niveau · '+mine+'</button>':'')+'<p id="oath-level-help">Ce niveau sert à calculer les effets. Cette consultation ne modifie pas ton personnage.</p></div>';
  }
  function gateMarkup(branch,tier,index){
    return '<div class="oath-gate"><h4>Cette capacité est masquée</h4><p>Tu as choisi de masquer les capacités à venir. Ce palier commence au niveau '+esc(tier.niv)+'.</p><button type="button" data-preview-tier="'+escAttr(tier.niv)+'">Consulter au niveau '+esc(tier.niv)+'</button><button type="button" data-reveal-all>Afficher toutes les capacités</button></div>';
  }
  function inspectorCosts(cost){
    cost=cost||{};var actions=cost.actions==null?1:cost.actions,parts=[actions+' action'+(actions>1?'s':'')];
    if(cost.ep)parts.push(cost.ep+' EP');if(cost.em)parts.push(cost.em+' EM');if(cost.pv)parts.push(cost.pv+' PV');
    return parts;
  }
  function inspectorOperations(branch,tier){
    var rules=tier.combatRules;
    if(rules&&rules.cost&&tier.cout!=null&&tier.cout!==inspectorCosts(rules.cost).join(' / ')) return [];
    if(typeof getSermentTierOperations==='function') return getSermentTierOperations(tier);
    if(rules&&Array.isArray(rules.operations)) return tier.desc===rules.effect?rules.operations:[];
    var source=(branch.combatRules&&branch.combatRules.tiers||[]).find(function(item){return Number(item.level)===Number(tier.niv);});
    // A staff-authored description takes precedence over the original structured rules.
    return source&&(tier.desc===source.effect||tier.desc===source.effectFormula)&&Array.isArray(source.operations)?source.operations:[];
  }
  function inspectorActions(branch,tier){
    var operations=inspectorOperations(branch,tier),level=Math.max(state.level,Number(tier.niv)||1);
    if(!operations.length) return (tier.cout?'<div class="oath-cost"><span>Coût</span><strong>'+esc(tier.cout)+'</strong></div>':'')+'<div class="oath-inspector-effect"><div class="oath-actions-heading"><h4>Effet de la capacité</h4></div>'+paragraphs(tier.desc||branch.desc||'Effet à définir.','oath-action-effect')+'</div>';
    return '<div class="oath-inspector-effect"><div class="oath-actions-heading"><h4>Actions de ce palier</h4><p>Valeurs au niveau '+level+(state.level<Number(tier.niv)?' · niveau minimum de ce palier':'')+'</p></div><div class="oath-ability-actions">'+operations.map(function(op){
      var costs=inspectorCosts(op.cost);
      var rule=String(op.ruleFormula||op.rule||'').replace(/\((-?\d+) \+ N\)/g,function(_,base){return String(Number(base)+level);}).replace(/^\d+ actions?(?:\s*(?:,|et|\/)\s*\d+\s*(?:EP|EM|PV))*/,'').replace(/^[.,;]\s*/,'').trim().replace(/^et\s+/,'Consomme ');
      return '<article class="oath-ability-action" data-operation="'+escAttr(op.id||'')+'"><div class="oath-ability-action-head"><h5>'+esc(op.label||'Action')+'</h5><div class="oath-action-cost" aria-label="Coût de l’action">'+costs.map(function(value){return '<span>'+esc(value)+'</span>';}).join('')+'</div></div><p class="oath-action-effect">'+esc(rule)+'</p></article>';
    }).join('')+'</div></div>';
  }
  function inspectorMarkup(branch,tier,index){
    if(!branch||!tier)return '<section class="oath-inspector"><h3 tabindex="-1">Capacités à venir</h3><p>Les capacités de cette voie restent à définir.</p></section>';
    var unlocked=!locked(branch,index),status=!unlocked?'À partir du niveau '+tier.niv:index===currentIndex(branch)?'Applicable au niveau '+state.level:'Ancien palier';
    var head='<div class="oath-inspector-head"><span class="oath-inspector-index">Niveau '+esc(tier.niv)+'</span><span class="oath-inspector-status '+(unlocked?'is-unlocked':'is-locked')+'">'+esc(status)+'</span></div>';
    var html='<section class="oath-inspector'+(!unlocked?' is-locked':'')+(sealed(branch,index)?' is-sealed':'')+'" data-tier-color="'+tierColor(index)+'"><button type="button" class="oath-back-to-levels" data-back-to-levels>↑ Revenir aux paliers</button>'+head;
    if(obscured(branch,index))return html+'<h3 tabindex="-1">'+esc(sealed(branch,index)?'Capacité à découvrir':tierLabel(tier,index))+'</h3>'+gateMarkup(branch,tier,index)+'</section>';
    html+='<h3 tabindex="-1">'+esc(tierLabel(tier,index))+'</h3><p class="oath-inspector-branch">'+esc(branchName(branch,state.branch))+'</p>';
    if(unlocked&&index!==currentIndex(branch))html+='<p class="oath-prior-note">Au niveau '+state.level+', cette capacité est remplacée par le palier de niveau '+esc(branch.paliers[currentIndex(branch)].niv)+'.</p>';
    html+=inspectorActions(branch,tier)+'<p class="oath-resource-key">EP : énergie physique · EM : énergie magique · PV : points de vie.</p><div class="oath-inspector-more">';
    if(tier.manifestation||branch.descPhys||branch.flavor||branch.visual||branch.roleplay){
      html+='<details class="oath-inspector-flavor"><summary>Imaginaire &amp; incarnation</summary>';
      if(tier.manifestation)html+='<div class="oath-tier-story"><b>Ce qui se manifeste</b><p>'+esc(tier.manifestation)+'</p></div>';
      if(branch.descPhys||branch.visual)html+='<p><b>En combat</b>'+esc(branch.descPhys||branch.visual)+'</p>';
      if(branch.roleplay)html+='<p><b>Une question pour le porteur</b>'+esc(branch.roleplay)+'</p>';
      if(branch.flavor)html+='<p><b>Un échange possible</b>'+esc(branch.flavor)+'</p>';
      html+='</details>';
    }
    if(branch.combatRules)html+='<div class="oath-inspector-rules">'+renderSermentRules(branch)+'</div>';
    return html+'</div><button type="button" class="oath-copy-build" data-copy-build>Copier cette fiche</button><span class="oath-action-status" role="status"></span></section>';
  }
  function skillMarkup(branch){
    var tiers=branch&&branch.paliers||[];
    return gameGuideMarkup(branch)+'<div class="oath-skill-layout"><nav class="oath-progression" aria-label="Paliers de '+escAttr(branch?branchName(branch,state.branch):'la voie')+'"><h3>Progression</h3><p>Sélectionne un niveau pour lire ses actions.</p>'+pathMarkup(branch,state.branch)+'</nav>'+inspectorMarkup(branch,tiers[state.tier],state.tier)+'</div>';
  }
  function compareMarkup(branches){
    return '<div class="oath-compare">'+branches.map(function(branch,bi){
      var index=defaultTier(branch),tier=(branch.paliers||[])[index];
      return '<article class="oath-compare-card" data-tier-color="'+tierColor(index)+'" data-branch="'+bi+'"><h3 tabindex="-1">'+esc(branchName(branch,bi))+'</h3><p class="oath-compare-status">'+esc(currentIndex(branch)<0?'À partir du niveau '+(tier&&tier.niv||'—'):'Palier de niveau '+(tier&&tier.niv||'—')+' · référence '+state.level)+'</p>'+(tier?(obscured(branch,index)?gateMarkup(branch,tier,index):inspectorActions(branch,tier)):'<p>Capacités à définir.</p>')+'<button type="button" data-inspect-branch="'+bi+'">Lire cette voie →</button></article>';
    }).join('')+'</div>';
  }
  function evolutionMarkup(item,items){
    var parent=getSermEvolutionFrom(item.name,item.data),links=items.filter(function(candidate){return getSermEvolutionFrom(candidate.name,candidate.data)===item.name||candidate.name===parent;});
    if(!links.length)return '';
    return '<section class="oath-evolutions"><h2>'+esc(parent?'Serment d’origine':'Évolutions possibles')+'</h2><p>'+esc(parent?'Cette évolution prolonge le serment ci-dessous. Elle demande le niveau '+minimum(item)+' et une attribution par le staff.':'Une évolution demande le niveau indiqué et une attribution par le staff.')+'</p><div class="oath-evo-links">'+links.map(function(link){var origin=link.name===parent,gated=!origin&&state.level<minimum(link);return '<button type="button" class="oath-evo-btn'+(gated?' is-locked':'')+'" data-evolution="'+escAttr(link.name)+'"><span class="oath-evo-art">'+getSermEmblem(link.name,64)+'</span><span><strong>'+esc(link.name)+'</strong><small>'+esc(origin?'Revenir au serment de départ':'Dès le niveau '+minimum(link)+' · attribution du staff')+'</small></span><span aria-hidden="true">→</span></button>';}).join('')+'</div></section>';
  }
  function loreMarkup(data){
    var html='<details class="oath-codex" data-oath-section="lore"><summary>Histoire &amp; imaginaire du serment</summary><div class="oath-codex-body">';
    if(data.vow)html+='<div class="oath-identity"><blockquote>« '+esc(data.vow)+' »</blockquote></div>';
    if(data.lore)html+=paragraphs(data.lore,'oath-hero-lore');
    if(data.tagline)html+='<p class="oath-narrative-tagline">'+esc(data.tagline)+'</p>';
    if(data.weaponDescription)html+='<p class="oath-weapon-detail"><b>Silhouette de l’arme</b>'+esc(data.weaponDescription)+'</p>';
    if(data.awakening||data.worldRole||data.evolutionMeaning)html+='<div class="oath-world">'+[['Un éveil possible',data.awakening],['Parmi les rescapés',data.worldRole],['Ce qui évolue',data.evolutionMeaning]].filter(function(row){return row[1];}).map(function(row){return '<section><h3>'+row[0]+'</h3><p>'+esc(row[1])+'</p></section>';}).join('')+'</div><p class="oath-rp-note">Ces pistes de jeu ne t’imposent ni passé, ni personnalité, ni pouvoir supplémentaire.</p>';
    html+='<div class="oath-brief">'+[['Style de jeu',data.playstyle],['Ton choix',data.decision],['Réponse adverse',data.counterplay]].filter(function(row){return row[1];}).map(function(row){return '<div><h3>'+row[0]+'</h3><p>'+esc(row[1])+'</p></div>';}).join('')+'</div></div></details>';
    return html;
  }
  function stageMarkup(item,items){
    if(!item)return '<div class="oath-empty"><h2>Aucun serment trouvé</h2><p>Modifie ta recherche ou tes filtres pour retrouver un serment.</p></div>';
    var data=item.data,branches=branchesOf(item);
    if(!branches[state.branch])state.branch=0;
    var branch=branches[state.branch],tiers=branch&&branch.paliers||[];
    if(!tiers[state.tier])state.tier=defaultTier(branch);
    var art=getSermEmblem(item.name,240).replace('loading="lazy"','loading="eager" fetchpriority="high"');
    var html='<section class="oath-hero"><div class="oath-hero-content"><div class="oath-hero-meta"><span>'+esc(getSermCatLabel(category(item)))+'</span><span>'+esc(getSermEvolutionFrom(item.name,data)?'Évolution · niveau '+minimum(item):'Serment de départ')+'</span></div><h2 class="oath-hero-title" tabindex="-1">'+esc(item.name)+'</h2><p class="oath-hero-tagline">'+esc(data.playstyle||data.pitch||data.tagline||data.fantasy||'Consulte les voies et les capacités de ce serment.')+'</p><p class="oath-weapon-name">Arme : '+esc(data.arme||item.name)+'</p></div><div class="oath-hero-art">'+art+'</div></section>';
    html+='<details class="oath-help" data-oath-section="help"><summary>Comment fonctionnent les serments ?</summary><p>Un serment propose plusieurs voies. Ton personnage en suit une seule. À chaque nouveau palier, les règles de ce palier remplacent celles du précédent.</p><p>Cette page sert à consulter les possibilités. L’attribution du serment et de sa voie se fait sur ta fiche, selon les règles du jeu.</p></details>';
    html+='<section class="oath-branches"><h2>'+esc(branches.length===2?'Deux façons de jouer':branches.length+' voies à découvrir')+'</h2><p class="oath-section-intro">Sélectionne une voie pour lire sa progression et ses actions.</p><div class="oath-branch-switcher">'+branches.map(branchSwitch).join('')+'</div></section>';
    html+='<section class="oath-workbench"><header class="oath-workbench-head"><h2>Les capacités de cette voie</h2><p class="oath-section-intro">Une seule voie s’applique à ton personnage. Chaque nouveau palier remplace le précédent.</p></header>'+levelMarkup(branches)+'<div class="oath-workbench-content">'+skillMarkup(branch)+'</div></section>';
    html+='<details class="oath-comparison" data-oath-section="compare"><summary>Comparer les actions des voies</summary><div class="oath-comparison-content">'+compareMarkup(branches)+'</div></details>';
    html+='<details class="oath-reading-options" data-oath-section="options"><summary>Options de lecture</summary><label for="oath-hide-future"><input id="oath-hide-future" type="checkbox"'+(state.discovery?' checked':'')+'>Masquer les capacités à venir</label><p>Optionnel : les effets au-delà du niveau de référence restent cachés jusqu’à ce que tu augmentes ce niveau.</p></details>';
    html+=evolutionMarkup(item,items)+loreMarkup(data);
    html+='<details class="oath-characteristics" data-oath-section="stats"><summary>Caractéristiques du serment</summary><p>Gains par niveau et dégâts de base de l’arme.</p><div class="oath-stats">'+stat(data.pvN,'Points de vie / niveau')+stat(data.epN,'Énergie physique / niveau')+stat(data.emN,'Énergie magique / niveau')+stat(data.dmg,'Dégâts de base')+'</div></details>';
    return html;
  }
  function refreshStage(preserveDetails){
    var stage=mount.querySelector('#oath-stage');if(!stage)return;
    var open=preserveDetails?Array.from(stage.querySelectorAll('details[data-oath-section][open]')).map(function(el){return el.dataset.oathSection;}):[];
    stage.innerHTML=stageMarkup(selected(),catalogue());
    stage.querySelectorAll('details[data-oath-section]').forEach(function(el){if(open.indexOf(el.dataset.oathSection)!==-1)el.open=true;});
  }
  function syncLibrary(){
    if(!mount)return;var library=mount.querySelector('.oath-library'),button=mount.querySelector('[data-toggle-library]');
    if(library)library.classList.toggle('is-open',state.libraryOpen);
    if(button)button.setAttribute('aria-expanded',String(!mobile()||state.libraryOpen));
  }
  function refresh(){
    if(!mount)return;
    var items=catalogue(),shown=filtered(items);
    if(!shown.some(function(item){return item.name===state.name;}))choose(shown.length?shown[0].name:'');
    mount.querySelector('#oath-list').innerHTML=listMarkup(shown);
    mount.querySelector('#serment-result-count').textContent=shown.length+' serment'+(shown.length>1?'s':'');
    mount.querySelector('#oath-category').value=state.cat;mount.querySelector('#oath-rank').value=state.rank;
    refreshStage(false);syncLibrary();
  }
  function selectName(name,resetFilters){
    if(!catalogue().some(function(item){return item.name===name;}))return;
    choose(name);
    if(resetFilters){state.cat='';state.rank='';state.search='';mount.querySelector('#serment-search').value='';}
    if(mobile())state.libraryOpen=false;
    refresh();
    var target=mobile()||resetFilters?mount.querySelector('.oath-hero-title'):Array.from(mount.querySelectorAll('.oath-list-item')).find(function(button){return button.dataset.serment===state.name;});
    if(target){target.focus({preventScroll:true});if(mobile())target.scrollIntoView({behavior:motion(),block:'start'});}
  }
  function updateWorkbench(){
    var item=selected();if(!item)return;
    var branches=branchesOf(item),branch=branches[state.branch];
    mount.querySelector('.oath-workbench-content').innerHTML=skillMarkup(branch);
    mount.querySelector('.oath-branch-switcher').innerHTML=branches.map(branchSwitch).join('');
    mount.querySelector('.oath-comparison-content').innerHTML=compareMarkup(branches);
    var evolution=mount.querySelector('.oath-evolutions');if(evolution)evolution.outerHTML=evolutionMarkup(item,catalogue());
  }
  function levelInput(value){
    var number=Number(value);if(!Number.isFinite(number))return;
    var branches=branchesOf(selected());state.level=Math.max(1,Math.floor(number)||1);
    state.tier=defaultTier(branches[state.branch]);remember();
    var input=mount.querySelector('#oath-level');if(input)input.value=state.level;
    updateWorkbench();
  }
  function setDiscovery(enabled,reveal){
    state.discovery=enabled;updateWorkbench();
    var checkbox=mount.querySelector('#oath-hide-future');if(checkbox)checkbox.checked=enabled;
    if(reveal){var heading=mount.querySelector('.oath-inspector h3');if(heading)heading.focus({preventScroll:true});}
  }
  function inspectorBelowProgression(){
    var nav=mount.querySelector('.oath-progression'),panel=mount.querySelector('.oath-inspector');
    return nav&&panel&&panel.getBoundingClientRect().top>=nav.getBoundingClientRect().bottom-1;
  }
  function focusInspector(force){
    if(!force&&!inspectorBelowProgression())return;
    var heading=mount.querySelector('.oath-inspector h3');if(heading){heading.focus({preventScroll:true});heading.scrollIntoView({behavior:motion(),block:'start'});}
  }
  function inspect(branch,tier,fromComparison){
    var branches=branchesOf(selected());if(!branches[branch])return;
    state.branch=branch;state.tier=tier==null?defaultTier(branches[branch]):tier;remember();updateWorkbench();
    var target=mount.querySelector('.oath-node.is-selected');if(target)target.focus({preventScroll:true});
    focusInspector(!!fromComparison);
  }
  function previewLevel(value){levelInput(value);focusInspector(true);}
  async function copyBuild(){
    var item=selected(),branch=branchesOf(item)[state.branch],tier=branch&&branch.paliers&&branch.paliers[state.tier];if(!item||!tier||obscured(branch,state.tier))return;
    var text=[item.name+' — '+branchName(branch,state.branch),'Aperçu au niveau '+state.level+' · Palier inspecté : niveau '+tier.niv,item.data.arme,tier.nom||branchName(branch,state.branch),tier.manifestation||'','Coût de référence : '+(tier.cout||'voir effet'),tier.desc||branch.desc||'Effet à définir.','Une seule voie ; seul le palier le plus élevé atteint s’applique.'].join('\n');
    var status=mount.querySelector('.oath-action-status');
    try{await navigator.clipboard.writeText(text);if(status)status.textContent='Parcours copié.';}catch(error){if(status)status.textContent='Copie indisponible dans ce navigateur.';}
  }
  function onClick(event){
    var button=event.target.closest('button');if(!button||!mount.contains(button))return;
    if(button.hasAttribute('data-serment'))return selectName(button.dataset.serment,false);
    if(button.hasAttribute('data-evolution'))return selectName(button.dataset.evolution,true);
    if(button.hasAttribute('data-toggle-library')){if(!mobile()){mount.querySelector('#serment-search').focus();return;}state.libraryOpen=!state.libraryOpen;syncLibrary();return;}
    if(button.hasAttribute('data-choose-branch')){var branch=Number(button.dataset.chooseBranch);state.branch=branch;state.tier=defaultTier(branchesOf(selected())[branch]);remember();updateWorkbench();var target=mount.querySelector('[data-choose-branch="'+branch+'"]');if(target)target.focus({preventScroll:true});return;}
    if(button.hasAttribute('data-node-tier'))return inspect(Number(button.dataset.nodeBranch),Number(button.dataset.nodeTier),false);
    if(button.hasAttribute('data-inspect-branch'))return inspect(Number(button.dataset.inspectBranch),null,true);
    if(button.hasAttribute('data-own-level'))return levelInput(ownLevel()||1);
    if(button.hasAttribute('data-preview-tier'))return previewLevel(button.dataset.previewTier);
    if(button.hasAttribute('data-reveal-all'))return setDiscovery(false,true);
    if(button.hasAttribute('data-copy-build'))return copyBuild();
    if(button.hasAttribute('data-back-to-levels')){var node=mount.querySelector('.oath-node.is-selected');if(node){node.focus({preventScroll:true});node.scrollIntoView({behavior:motion(),block:'center'});}return;}
  }
  function onInput(event){
    if(event.target.id==='serment-search'){state.search=event.target.value;refresh();}
    if(event.target.id==='oath-level'&&event.target.value!=='')levelInput(event.target.value);
  }
  function onChange(event){
    if(event.target.id==='oath-category'){state.cat=event.target.value;refresh();}
    if(event.target.id==='oath-rank'){state.rank=event.target.value;refresh();}
    if(event.target.id==='oath-hide-future')setDiscovery(event.target.checked,false);
    if(event.target.id==='oath-level'&&event.target.value==='')levelInput(1);
  }
  function render(tid){
    mount=document.getElementById(tid);if(!mount)return;
    if(!levelInitialized){state.level=ownLevel()||1;levelInitialized=true;}
    var items=catalogue();if(!items.some(function(item){return item.name===state.name;}))choose(items.find(function(item){return item.name==='Duelliste';})?.name||(items[0]&&items[0].name)||'');
    mount.innerHTML=shell(items);
    if(!mount._oathAtlasBound){mount.addEventListener('click',onClick);mount.addEventListener('input',onInput);mount.addEventListener('change',onChange);mount._oathAtlasBound=true;}
    if(!libraryMedia&&root.matchMedia){libraryMedia=root.matchMedia('(max-width: 760px)');libraryMedia.addEventListener('change',syncLibrary);}
    refresh();
  }
  root.NPSermentsAtlas={render:render,focus:function(name){selectName(name,true);},state:state};
})(typeof window!=='undefined'?window:globalThis);
