/* A readable skill forge. Exploration never assigns an oath or alters a character. */
(function(root){
  'use strict';
  var state={name:'',level:1,branch:0,cat:'',rank:'',search:'',picks:{},libraryOpen:false};
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
  function abilityOf(branch){return branch&&(branch.ability||(branch.paliers||[])[0])||null;}
  function branchColor(index){return ['jade','azure','violet','gold'][Math.min(3,Math.max(0,index))];}
  function paragraphs(value,className){return String(value||'').split(/\n\s*\n/).filter(Boolean).map(function(text){return '<p class="'+className+'">'+esc(text)+'</p>';}).join('');}
  function evaluationLevel(){var item=selected();return Math.max(state.level,item&&getSermEvolutionFrom(item.name,item.data)?minimum(item):1);}
  function valuesLabel(){var level=evaluationLevel();return 'Valeurs au niveau '+level+(level>state.level?' · niveau minimum de cette évolution':'');}
  function formatted(text){return typeof formatSermentText==='function'?formatSermentText(String(text||''),evaluationLevel()):String(text||'');}
  function ownLevel(){
    var player=typeof CU!=='undefined'&&CU&&CU.pid&&typeof gpid==='function'?gpid(CU.pid):null;
    var value=Number(player&&player.level);return Number.isFinite(value)&&value>=1?Math.floor(value):null;
  }
  function mobile(){return root.matchMedia&&root.matchMedia('(max-width: 760px)').matches;}
  function motion(){return root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';}
  function searchText(item){return normal([item.name,item.data.arme,item.data.evolvesFrom,item.data.playstyle,item.data.tagline,item.data.vow,branchesOf(item).map(function(br){return br.nom+' '+(br.style||'')+' '+(abilityOf(br)&&abilityOf(br).nom||'');}).join(' ')].join(' '));}
  function filtered(items){var query=normal(state.search).trim();return items.filter(function(item){return (!state.cat||category(item)===state.cat)&&(!state.rank||rank(item)===state.rank)&&(!query||searchText(item).indexOf(query)!==-1);});}
  function remember(){if(state.name)state.picks[state.name]={branch:state.branch};}
  function choose(name){
    remember();state.name=name;
    var branches=branchesOf(selected()),saved=state.picks[name];
    state.branch=saved&&branches[saved.branch]?saved.branch:0;
  }
  function rankLabel(value){return value==='basic'?'Serments de départ':value==='seasoned'?'Évolutions':SERM_LEVELS[value]||value;}
  function shell(items){
    var ranks=Array.from(new Set(items.map(rank)));
    return '<div id="serments-grid" class="oath-atlas">'
      +'<header class="oath-topbar"><div><h1>La Forge des Serments</h1><p>Découvre une arme, choisis une voie et vois ce que tu peux faire avec elle.</p></div><small class="oath-catalogue-count">'+items.length+' serments</small></header>'
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
    return '<button type="button" class="oath-path-heading'+(bi===state.branch?' is-chosen':'')+'" data-path-color="'+branchColor(bi)+'" data-choose-branch="'+bi+'" aria-controls="oath-selected-ability" aria-pressed="'+(bi===state.branch)+'"><span class="oath-path-letter" aria-hidden="true">'+String.fromCharCode(65+bi)+'</span><span class="oath-branch-copy"><strong>'+esc(branchName(branch,bi))+'</strong><span class="oath-branch-pitch">'+esc(branchPitch(branch))+'</span><small class="oath-branch-selection">'+(bi===state.branch?'Voie consultée':'Lire cette voie →')+'</small></span></button>';
  }
  function gameGuideMarkup(branch){
    if(!branch||!branch.gameplay)return '';
    return '<div class="oath-play-guide"><dl><dt>Pour commencer</dt><dd>'+esc(branch.gameplay.opening||branch.gameplay.pitch)+'</dd></dl>'+(branch.gameplay.choice?'<details class="oath-tactical-tip"><summary>Le choix à faire en combat</summary><p>'+esc(branch.gameplay.choice)+'</p></details>':'')+'</div>';
  }
  function levelMarkup(){
    var mine=ownLevel();
    return '<div class="oath-levelbar"><label class="oath-level-field" for="oath-level"><span>Ton niveau</span><input id="oath-level" type="number" inputmode="numeric" min="1" step="1" value="'+state.level+'" aria-describedby="oath-level-help"></label>'+(mine?'<button type="button" class="oath-own-level" data-own-level>Mon niveau · '+mine+'</button>':'')+'<p id="oath-level-help">Change ce nombre pour voir les dégâts, soins et protections à ce niveau. Ta fiche reste inchangée.</p></div>';
  }
  function inspectorCosts(cost){
    cost=cost||{};var actions=cost.actions==null?1:cost.actions,parts=[actions+' action'+(actions>1?'s':'')];
    if(cost.ep)parts.push(cost.ep+' EP');if(cost.em)parts.push(cost.em+' EM');if(cost.pv)parts.push(cost.pv+' PV');
    return parts;
  }
  function inspectorOperations(branch,ability){
    var rules=ability&&ability.combatRules;
    if(!ability)return [];
    if(rules&&rules.cost&&ability.cout!=null&&ability.cout!==inspectorCosts(rules.cost).join(' / '))return [];
    if(typeof getSermentTierOperations==='function')return getSermentTierOperations(ability);
    return rules&&Array.isArray(rules.operations)&&ability.desc===rules.effect?rules.operations:[];
  }
  function effectWithoutCost(text){
    // A reservation or consumable in the cost sentence is part of the rule and stays visible.
    return String(text||'').replace(/^\d+ actions?(?:\s*(?:,|et|\/)\s*\d+\s*(?:EP|EM|PV))*\.\s*/,'').trim();
  }
  function operationText(operation){
    return effectWithoutCost(typeof getSermentOperationText==='function'?getSermentOperationText(operation,evaluationLevel()):formatted(operation.ruleFormula||operation.rule));
  }
  function formulaPart(part){
    if(typeof part==='string')return part;
    if(!part||typeof part!=='object')return String(part==null?'':part);
    var base=Number(part.base)||0,rate=Number(part.perLevel)||0;
    var text=rate?(Math.abs(rate)===1?'ton niveau':Math.abs(rate)+' × ton niveau'):String(base);
    if(rate&&base)text=base+(rate<0?' − ':' + ')+text;
    else if(rate<0)text='−'+text;
    if(Number(part.divisor)>1)text='('+text+') ÷ '+part.divisor;
    if(part.round==='ceil'&&Number(part.divisor)>1)text+=' (arrondi au supérieur)';
    return text;
  }
  function operationFormula(operation){
    var parts=operation.ruleParts;
    if(Array.isArray(parts)&&parts.some(function(part){return part&&typeof part==='object'&&Number(part.perLevel);}))return effectWithoutCost(parts.map(formulaPart).join(''));
    var text=String(operation.ruleFormula||'');
    return /\bN\b/.test(text)?effectWithoutCost(text.replace(/\bN\b/g,'ton niveau')):'';
  }
  function scalingMarkup(branch,ability){
    var scaling=ability&&ability.scaling||branch.combatRules&&branch.combatRules.scaling;
    return typeof scaling==='string'&&scaling.trim()?'<p class="oath-scaling-note">'+esc(scaling.replace(/\bN\b/g,'ton niveau'))+'</p>':'';
  }
  function inspectorActions(branch,ability){
    var operations=inspectorOperations(branch,ability);
    if(!operations.length)return (ability.cout?'<div class="oath-cost"><span>Coût</span><strong>'+esc(ability.cout)+'</strong></div>':'')+'<div class="oath-inspector-effect"><div class="oath-actions-heading"><h4>Ce que fait cette voie</h4><p>'+esc(valuesLabel())+'</p></div>'+paragraphs(formatted(ability.desc||branch.desc||'Effet à définir.'),'oath-action-effect')+'</div>'+scalingMarkup(branch,ability);
    return '<div class="oath-inspector-effect"><div class="oath-actions-heading"><h4>Actions de cette voie</h4><p>'+esc(valuesLabel())+'</p></div><div class="oath-ability-actions">'+operations.map(function(operation){
      var costs=inspectorCosts(operation.cost),formula=operationFormula(operation);
      return '<article class="oath-ability-action" data-operation="'+escAttr(operation.id||'')+'"><div class="oath-ability-action-head"><h5>'+esc(operation.label||'Action')+'</h5><div class="oath-action-cost" aria-label="Coût de l’action">'+costs.map(function(value){return '<span>'+esc(value)+'</span>';}).join('')+'</div></div><p class="oath-action-effect">'+esc(operationText(operation))+'</p>'+(formula?'<details class="oath-action-calculation"><summary>Comment la valeur augmente</summary><p>'+esc(formula)+'</p></details>':'')+'</article>';
    }).join('')+'</div></div>'+scalingMarkup(branch,ability);
  }
  function inspectorMarkup(branch,ability){
    if(!branch||!ability)return '<section id="oath-selected-ability" class="oath-inspector"><h3 tabindex="-1">Capacité à définir</h3><p>Les actions de cette voie restent à définir.</p></section>';
    var branchLabel=branchName(branch,state.branch),title=ability.nom||branchLabel;
    var html='<section id="oath-selected-ability" class="oath-inspector" data-path-color="'+branchColor(state.branch)+'"><button type="button" class="oath-back-to-paths" data-back-to-paths>↑ Revenir aux voies</button><div class="oath-inspector-head"><span class="oath-inspector-index">Voie '+String.fromCharCode(65+state.branch)+'</span><span class="oath-inspector-status">'+esc(valuesLabel())+'</span></div><h3 tabindex="-1">'+esc(title)+'</h3>'+(normal(title).trim()!==normal(branchLabel).trim()?'<p class="oath-inspector-branch">'+esc(branchLabel)+'</p>':'');
    html+=inspectorActions(branch,ability)+'<p class="oath-resource-key">EP : énergie physique · EM : énergie magique · PV : points de vie.</p><div class="oath-inspector-more">';
    if(ability.manifestation||branch.descPhys||branch.flavor||branch.visual||branch.roleplay){
      html+='<details class="oath-inspector-flavor"><summary>Imaginaire &amp; incarnation</summary>';
      if(ability.manifestation)html+='<div class="oath-ability-story"><b>Ce qui se manifeste</b><p>'+esc(ability.manifestation)+'</p></div>';
      if(branch.descPhys||branch.visual)html+='<p><b>En combat</b>'+esc(branch.descPhys||branch.visual)+'</p>';
      if(branch.roleplay)html+='<p><b>Une question pour le porteur</b>'+esc(branch.roleplay)+'</p>';
      if(branch.flavor)html+='<p><b>Un échange possible</b>'+esc(branch.flavor)+'</p>';
      html+='</details>';
    }
    if(branch.combatRules)html+='<div class="oath-inspector-rules">'+renderSermentRules(branch)+'</div>';
    return html+'</div><button type="button" class="oath-copy-build" data-copy-build>Copier cette fiche</button><span class="oath-action-status" role="status"></span></section>';
  }
  function forgeMarkup(item,branches){
    var art=getSermEmblem(item.name,360).replace('loading="lazy"','loading="eager" fetchpriority="high"');
    return '<nav class="oath-forge" aria-label="Voies de '+escAttr(item.name)+'"><header class="oath-forge-heading"><h3>'+esc(branches.length===2?'Une arme, deux voies':branches.length+' voies pour cette arme')+'</h3><p>Les mêmes actions à tous les niveaux. Dégâts, soins et protections augmentent avec ton niveau.</p></header><div class="oath-forge-grid" data-branch-count="'+branches.length+'"><div class="oath-forge-core"><div class="oath-forge-weapon">'+art+'</div><p class="oath-forge-core-label">Arme du serment</p><strong class="oath-forge-weapon-name">'+esc(item.data.arme||item.name)+'</strong></div>'+branches.map(function(branch,bi){return '<section class="oath-forge-path'+(bi===state.branch?' is-chosen':'')+'" data-branch="'+bi+'" data-path-color="'+branchColor(bi)+'" aria-label="Voie '+String.fromCharCode(65+bi)+' : '+escAttr(branchName(branch,bi))+'">'+branchSwitch(branch,bi)+'</section>';}).join('')+'</div></nav>';
  }
  function selectedSkillMarkup(branches){
    var branch=branches[state.branch];
    return '<section class="oath-selected-skill"><header class="oath-selected-heading"><h3>Ta façon de jouer</h3></header>'+gameGuideMarkup(branch)+inspectorMarkup(branch,abilityOf(branch))+'</section>';
  }
  function skillMarkup(item,branches){return forgeMarkup(item,branches)+selectedSkillMarkup(branches);}
  function compareMarkup(branches){
    return '<div class="oath-compare">'+branches.map(function(branch,bi){
      var ability=abilityOf(branch);
      return '<article class="oath-compare-card" data-path-color="'+branchColor(bi)+'" data-branch="'+bi+'"><h3 tabindex="-1">'+esc(branchName(branch,bi))+'</h3><p class="oath-compare-status">'+esc(valuesLabel())+'</p>'+(ability?inspectorActions(branch,ability):'<p>Capacités à définir.</p>')+'<button type="button" data-inspect-branch="'+bi+'">Lire cette voie →</button></article>';
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
    var html='<section class="oath-hero"><div class="oath-hero-content"><div class="oath-hero-meta"><span>'+esc(getSermCatLabel(category(item)))+'</span><span>'+esc(getSermEvolutionFrom(item.name,data)?'Évolution · niveau '+minimum(item):'Serment de départ')+'</span></div><h2 class="oath-hero-title" tabindex="-1">'+esc(item.name)+'</h2><p class="oath-hero-tagline">'+esc(data.playstyle||data.pitch||data.tagline||data.fantasy||'Consulte les voies et les capacités de ce serment.')+'</p></div></section>';
    html+='<section class="oath-workbench">'+levelMarkup()+'<div class="oath-workbench-content">'+skillMarkup(item,branches)+'</div></section>';
    html+='<details class="oath-help" data-oath-section="help"><summary>Comment fonctionnent les serments ?</summary><p>Un serment propose plusieurs voies. Ton personnage en suit une seule. Ses actions restent les mêmes ; leurs dégâts, soins et protections augmentent avec son niveau.</p><p>Cette page sert à consulter les possibilités. L’attribution du serment et de sa voie se fait sur ta fiche, selon les règles du jeu.</p></details>';
    html+='<details class="oath-comparison" data-oath-section="compare"><summary>Comparer les actions des voies</summary><div class="oath-comparison-content">'+compareMarkup(branches)+'</div></details>';
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
    var branches=branchesOf(item),skill=mount.querySelector('.oath-selected-skill'),comparison=mount.querySelector('.oath-comparison-content');
    if(skill)skill.outerHTML=selectedSkillMarkup(branches);
    if(comparison)comparison.innerHTML=compareMarkup(branches);
    mount.querySelectorAll('[data-choose-branch]').forEach(function(button){var chosen=Number(button.dataset.chooseBranch)===state.branch;button.classList.toggle('is-chosen',chosen);button.setAttribute('aria-pressed',String(chosen));var label=button.querySelector('.oath-branch-selection');if(label)label.textContent=chosen?'Voie consultée':'Lire cette voie →';});
    mount.querySelectorAll('.oath-forge-path').forEach(function(path){path.classList.toggle('is-chosen',Number(path.dataset.branch)===state.branch);});
    var evolution=mount.querySelector('.oath-evolutions');if(evolution)evolution.outerHTML=evolutionMarkup(item,catalogue());
  }
  function levelInput(value){
    var number=Number(value);if(!Number.isFinite(number))return;
    state.level=Math.max(1,Math.floor(number)||1);
    var input=mount.querySelector('#oath-level');if(input)input.value=state.level;
    updateWorkbench();
  }
  function focusInspector(){
    var panel=mount.querySelector('.oath-inspector'),heading=panel&&panel.querySelector('h3');
    if(heading){heading.focus({preventScroll:true});panel.scrollIntoView({behavior:motion(),block:'start'});}
  }
  function inspect(branch){
    if(!branchesOf(selected())[branch])return;
    state.branch=branch;remember();updateWorkbench();focusInspector();
  }
  async function copyBuild(){
    var item=selected(),branch=branchesOf(item)[state.branch],ability=abilityOf(branch);if(!item||!ability)return;
    var operations=inspectorOperations(branch,ability),lines=[item.name+' — '+branchName(branch,state.branch),valuesLabel(),item.data.arme,ability.nom||branchName(branch,state.branch)];
    if(operations.length)operations.forEach(function(operation){lines.push(operation.label||'Action',inspectorCosts(operation.cost).join(' / '),operationText(operation));});
    else lines.push('Coût : '+(ability.cout||'voir effet'),formatted(ability.desc||branch.desc||'Effet à définir.'));
    if(ability.manifestation)lines.push(ability.manifestation);
    lines.push('Les mêmes actions à tous les niveaux. Une seule voie pour ton personnage.');
    var status=mount.querySelector('.oath-action-status');
    try{await navigator.clipboard.writeText(lines.filter(Boolean).join('\n'));if(status)status.textContent='Fiche copiée.';}catch(error){if(status)status.textContent='Copie indisponible dans ce navigateur.';}
  }
  function onClick(event){
    var button=event.target.closest('button');if(!button||!mount.contains(button))return;
    if(button.hasAttribute('data-serment'))return selectName(button.dataset.serment,false);
    if(button.hasAttribute('data-evolution'))return selectName(button.dataset.evolution,true);
    if(button.hasAttribute('data-toggle-library')){if(!mobile()){mount.querySelector('#serment-search').focus();return;}state.libraryOpen=!state.libraryOpen;syncLibrary();return;}
    if(button.hasAttribute('data-choose-branch'))return inspect(Number(button.dataset.chooseBranch));
    if(button.hasAttribute('data-inspect-branch'))return inspect(Number(button.dataset.inspectBranch));
    if(button.hasAttribute('data-own-level'))return levelInput(ownLevel()||1);
    if(button.hasAttribute('data-copy-build'))return copyBuild();
    if(button.hasAttribute('data-back-to-paths')){var path=mount.querySelector('[data-choose-branch][aria-pressed="true"]');if(path){path.focus({preventScroll:true});path.scrollIntoView({behavior:motion(),block:'center'});}return;}
  }
  function onInput(event){
    if(event.target.id==='serment-search'){state.search=event.target.value;refresh();}
    if(event.target.id==='oath-level'&&event.target.value!=='')levelInput(event.target.value);
  }
  function onChange(event){
    if(event.target.id==='oath-category'){state.cat=event.target.value;refresh();}
    if(event.target.id==='oath-rank'){state.rank=event.target.value;refresh();}
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
