/* The public Forge explores live rules without assigning a character's oath. */
(function(root){
  'use strict';
  var state={name:'',level:5,branch:0,tier:0,cat:'',rank:'',search:'',view:'tree',discovery:true,picks:{},libraryOpen:false};
  var mount=null,noticeTimer=null,revealTimer=null;
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
  function tierLabel(tier,index,total){return tier&&tier.manifestation&&tier.nom?tier.nom:nodeLabel(index,total);}
  function paragraphs(value,className){return String(value||'').split(/\n\s*\n/).filter(Boolean).map(function(text){return '<p class="'+className+'">'+esc(text)+'</p>';}).join('');}
  function currentIndex(branch){
    var found=-1;
    (branch&&branch.paliers||[]).forEach(function(tier,index){if(Number(tier.niv)<=state.level) found=index;});
    return found;
  }
  function tierColor(index){return ['jade','azure','violet','gold'][Math.min(3,Math.max(0,index))];}
  function tierRoman(index){return ['I','II','III','IV','V','VI','VII','VIII'][index]||String(index+1);}
  function icon(kind){
    var paths={lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',sealed:'<path d="m12 2 9 10-9 10-9-10Z"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3v.2"/>',eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',check:'<path d="m5 12 4 4L19 6"/>'};
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[kind]+'</svg>';
  }
  function ownLevel(){
    var player=typeof CU!=='undefined'&&CU&&CU.pid&&typeof gpid==='function'?gpid(CU.pid):null;
    var value=Number(player&&player.level);return Number.isFinite(value)&&value>=1?Math.floor(value):null;
  }
  function maxLevel(branches){return Math.max(20,state.level,ownLevel()||1,...branches.flatMap(function(br){return (br.paliers||[]).map(function(t){var n=Number(t.niv);return Number.isFinite(n)&&n>0?n:1;});}));}
  function locked(branch,index){return Number((branch.paliers||[])[index]?.niv)>state.level;}
  function sealed(branch,index){return state.discovery&&index>currentIndex(branch)+1;}
  function obscured(branch,index){return state.discovery&&locked(branch,index);}
  function rankMarkup(branch){
    var index=currentIndex(branch),tiers=branch&&branch.paliers||[];
    return '<div class="oath-rank-hud" data-tier-color="'+tierColor(index)+'"><span class="oath-rank-sigil" aria-hidden="true">'+(index<0?icon('lock'):glyph(index))+'</span><div><small>RANG DANS L’APERÇU</small><strong>'+esc(index<0?'En sommeil':nodeLabel(index,tiers.length))+'</strong><span>'+esc(index<0?'Le premier sceau attend':'Sceau '+tierRoman(index)+' · Niveau '+tiers[index].niv)+'</span></div></div>';
  }
  function discoveryMarkup(){
    return '<div class="oath-discovery-toolbar"><div class="oath-mode-toggle" aria-label="Visibilité des capacités"><button type="button" data-discovery="on" aria-pressed="'+state.discovery+'">'+icon('sealed')+'Découverte</button><button type="button" data-discovery="off" aria-pressed="'+!state.discovery+'">'+icon('eye')+'Codex complet</button></div><div class="oath-state-legend"><span>'+icon('check')+'Révélé</span><span>'+icon('lock')+'Verrouillé</span><span>'+icon('sealed')+'Scellé</span></div><p>'+esc(state.discovery?'Atteins les seuils de l’aperçu pour dissiper le voile.':'Toutes les capacités publiques sont consultables, même avant leur niveau.')+'</p></div>';
  }
  function tierLegend(branch){return '<div class="oath-tier-legend" aria-label="Couleurs des paliers">'+(branch&&branch.paliers||[]).map(function(t,i,all){return '<span data-tier-color="'+tierColor(i)+'"><i>'+tierRoman(i)+'</i><b>'+esc(nodeLabel(i,all.length))+'</b></span>';}).join('')+'</div>';}
  function gateMarkup(branch,tier,index){
    var hidden=sealed(branch,index),left=Math.max(0,Number(tier.niv)-state.level),percent=Math.min(100,state.level/Math.max(1,Number(tier.niv))*100);
    return '<div class="oath-gate"><div class="oath-gate-seal">'+icon(hidden?'sealed':'lock')+'</div><span class="oath-eyebrow">'+(hidden?'Un pouvoir reste dans l’ombre':'Le prochain seuil t’attend')+'</span><p>'+esc(hidden?'Son nom, sa manifestation et son effet se révéleront dans l’aperçu au niveau '+tier.niv+'.':'Cette capacité attend le niveau '+tier.niv+'. Explore ce seuil pour découvrir son effet.')+'</p><div class="oath-gate-goal"><strong>'+left+'</strong><span>niveau'+(left>1?'x':'')+' avant révélation</span></div><div class="oath-gate-progress" aria-hidden="true"><i style="width:'+percent+'%"></i></div><button type="button" data-preview-tier="'+escAttr(tier.niv)+'">Simuler le niveau '+esc(tier.niv)+icon('arrow')+'</button><button type="button" class="oath-reveal-link" data-reveal-all>Lire dans le Codex complet</button><small>Simulation uniquement · aucun changement sur ta fiche.</small></div>';
  }
  function nextQuest(branch){
    var tiers=branch&&branch.paliers||[],index=currentIndex(branch)+1,next=tiers[index];
    if(!next)return '<div class="oath-next-quest is-complete" data-tier-color="gold">'+glyph(3)+'<div><small>VOIE PARACHEVÉE</small><strong>Tous les sceaux révélés</strong><span>Cette voie a atteint son apogée dans l’aperçu.</span></div></div>';
    return '<button type="button" class="oath-next-quest" data-tier-color="'+tierColor(index)+'" data-next-tier="'+escAttr(next.niv)+'">'+icon('lock')+'<div><small>PROCHAIN OBJECTIF · APERÇU</small><strong>'+esc(nodeLabel(index,tiers.length))+' · Niveau '+esc(next.niv)+'</strong><span>Encore '+(Number(next.niv)-state.level)+' niveau'+(Number(next.niv)-state.level>1?'x':'')+' · Explorer ce seuil</span></div>'+icon('arrow')+'</button>';
  }
  function showUnlock(oldLevel,branch){
    var tiers=branch&&branch.paliers||[],crossed=tiers.filter(function(t){return Number(t.niv)>oldLevel&&Number(t.niv)<=state.level;});
    var toast=mount.querySelector('.oath-unlock-toast');
    clearTimeout(noticeTimer);if(toast){toast.classList.remove('is-visible');toast.innerHTML='';}
    if(!crossed.length)return;
    var index=currentIndex(branch);if(toast){toast.dataset.tierColor=tierColor(index);toast.innerHTML=glyph(index)+'<div><small>RÉVÉLATION DANS L’APERÇU</small><strong>'+esc(crossed.length>1?crossed.length+' paliers révélés':nodeLabel(index,tiers.length)+' révélé')+'</strong><span>Niveau '+state.level+' · '+esc(branchName(branch,state.branch))+'</span></div>';toast.classList.add('is-visible');noticeTimer=setTimeout(function(){if(toast.isConnected)toast.classList.remove('is-visible');},4400);}
    mount.querySelectorAll('.oath-node').forEach(function(node){if(Number(node.dataset.requiredLevel)>oldLevel&&Number(node.dataset.requiredLevel)<=state.level)node.classList.add('is-revealing');});
    clearTimeout(revealTimer);revealTimer=setTimeout(function(){if(mount)mount.querySelectorAll('.is-revealing').forEach(function(n){n.classList.remove('is-revealing');});},1100);
  }
  function searchText(item){return normal([item.name,item.data.arme,item.data.evolvesFrom,item.data.playstyle,item.data.tagline,item.data.lore,item.data.vow,branchesOf(item).map(function(br){return br.nom+' '+(br.style||'')+' '+(br.paliers||[]).map(function(tier){return tier.nom||'';}).join(' ');}).join(' ')].join(' '));}
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
      +'<div class="oath-layout"><aside class="oath-library'+(state.libraryOpen?' is-open':'')+'" aria-label="Bibliothèque des serments"><div class="oath-library-head"><span class="oath-eyebrow">Découvre les serments</span><button class="oath-library-toggle" type="button" data-toggle-library aria-expanded="'+state.libraryOpen+'"><strong>Armurerie</strong><span id="serment-result-count" role="status"></span><span aria-hidden="true">⌄</span></button></div><div class="oath-library-body">'
      +'<label class="oath-search" for="serment-search"><span>Rechercher</span><input id="serment-search" type="search" autocomplete="off" placeholder="Arme, serment, voie…" value="'+escAttr(state.search)+'"></label>'
      +'<div class="oath-filter" id="serm-level-filter" aria-label="Filtrer par rang">'+filterButton('rank','','Tous')+ranks.map(function(value){return filterButton('rank',value,SERM_LEVELS[value]||value);}).join('')+'</div>'
      +'<div class="oath-filter" id="serm-filter" aria-label="Filtrer par type">'+filterButton('cat','','Tous les types')+['melee','distance','magie','soutien'].filter(function(value){return items.some(function(item){return category(item)===value;});}).map(function(value){return filterButton('cat',value,getSermCatLabel(value));}).join('')+'</div>'
      +'<div class="oath-list" id="oath-list"></div></div></aside><main class="oath-stage" id="oath-stage" aria-label="Forge du serment sélectionné"></main></div><p class="oath-session-note">Exploration libre · Les choix de cet écran ne modifient pas ton personnage.</p></div>';
  }
  function listMarkup(items){
    if(!items.length) return '<p class="oath-empty">Aucun serment trouvé. Essaie un autre nom ou type.</p>';
    return items.map(function(item){var gated=state.level<minimum(item),evolution=!!getSermEvolutionFrom(item.name,item.data);return '<button type="button" class="oath-list-item'+(item.name===state.name?' is-active':'')+(gated?' is-gated':'')+'" data-serment="'+escAttr(item.name)+'" data-min-level="'+minimum(item)+'" data-level="'+escAttr(rank(item))+'" data-cat="'+escAttr(category(item))+'" aria-pressed="'+(item.name===state.name)+'"><span class="oath-list-art">'+getSermEmblem(item.name,52)+'</span><span class="oath-list-copy"><strong>'+esc(item.name)+'</strong><small>'+esc(evolution?'Évolution · Niv. '+minimum(item):getSermCatLabel(category(item)))+'</small></span><span class="oath-list-lock"'+(gated?'':' hidden')+'>'+icon('lock')+'</span><span class="oath-list-arrow" aria-hidden="true">›</span></button>';}).join('');
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
        html+='<path class="oath-link'+(ti<=active?' is-lit':'')+(bi===state.branch&&ti<=active?' is-current':'')+(sealed(branch,ti)?' is-sealed':'')+'" data-tier-color="'+tierColor(ti)+'" data-link-branch="'+bi+'" data-link-tier="'+ti+'" vector-effect="non-scaling-stroke" d="M '+previous.x+' '+previous.y+' C '+previous.x+' '+middle+' '+point.x+' '+middle+' '+point.x+' '+point.y+'"/>';
        previous=point;
      });
    });
    return html+'</svg>';
  }
  function nodeState(branch,bi,ti){var current=currentIndex(branch);return sealed(branch,ti)?'Scellé':ti>current?'Verrouillé':ti===current?(bi===state.branch?'Actif':'Alternative'):'Remplacé';}
  function nodeMarkup(branch,bi,ti){
    var tiers=branch.paliers||[],tier=tiers[ti],active=currentIndex(branch),point=coords(bi,ti,tiers.length),inspected=bi===state.branch&&ti===state.tier,hidden=sealed(branch,ti),blocked=locked(branch,ti);
    return '<button type="button" class="oath-node '+(blocked?'is-locked':'is-unlocked')+(hidden?' is-sealed':'')+(ti===active+1?' is-next':'')+(ti<active?' is-legacy':'')+(bi===state.branch&&ti===active?' is-current':'')+(inspected?' is-selected':'')+'" style="--node-x:'+point.x+'%;--node-y:'+point.y+'%" data-tier-color="'+tierColor(ti)+'" data-node-branch="'+bi+'" data-node-tier="'+ti+'" data-required-level="'+escAttr(tier.niv)+'" aria-pressed="'+inspected+'" aria-label="Voie '+String.fromCharCode(65+bi)+', niveau '+escAttr(tier.niv)+', '+escAttr(hidden?'Pouvoir inconnu':tierLabel(tier,ti,tiers.length))+', '+escAttr(nodeState(branch,bi,ti))+'"><span class="oath-node-orb">'+(hidden?icon('sealed'):blocked?icon('lock'):glyph(ti))+'<small class="oath-node-rank">'+tierRoman(ti)+'</small></span><span class="oath-node-copy"><small class="oath-node-level">NIV. '+esc(tier.niv)+'</small><strong class="oath-node-title">'+esc(hidden?'???':tierLabel(tier,ti,tiers.length))+'</strong></span><span class="oath-node-state">'+esc(nodeState(branch,bi,ti))+'</span></button>';
  }
  function pathMarkup(branch,bi){
    return '<section class="oath-path'+(bi===state.branch?' is-chosen':'')+'" data-branch="'+bi+'" data-branch-label="Voie '+String.fromCharCode(65+bi)+'" aria-label="'+escAttr(branchName(branch,bi))+'"><div class="oath-node-list">'+(branch.paliers||[]).map(function(t,ti){return nodeMarkup(branch,bi,ti);}).join('')+'</div></section>';
  }
  function branchSwitch(branch,bi){return '<button type="button" class="oath-path-heading'+(bi===state.branch?' is-chosen':'')+'" data-choose-branch="'+bi+'" aria-pressed="'+(bi===state.branch)+'"><span class="oath-path-letter">'+String.fromCharCode(65+bi)+'</span><span><small>'+esc(branch.style||'Spécialisation')+'</small><strong>'+esc(branchName(branch,bi))+'</strong></span></button>';}
  function gameGuideMarkup(branch){
    if(!branch||!branch.gameplay||state.discovery&&currentIndex(branch)<0)return '';
    var labels={direct:'Prise en main directe',tactique:'Préparation tactique',équipe:'Soutien et coordination'};
    return '<span class="oath-eyebrow">'+esc(labels[branch.gameplay.complexity]||'Comment jouer')+'</span>'+renderSermentGameGuide(branch);
  }
  function progressMarkup(branch){
    var tiers=branch&&branch.paliers||[],count=currentIndex(branch)+1,next=tiers[count];
    return '<div class="oath-progress-readout"><div><span>'+count+' / '+tiers.length+' paliers atteints</span><strong>'+esc(next?'Prochain éveil · Niv. '+next.niv:'Voie à son apogée')+'</strong></div><div class="oath-progress-track"><i style="width:'+(tiers.length?count/tiers.length*100:0)+'%"></i></div></div>';
  }
  function levelMarkup(branches){
    var max=maxLevel(branches),mine=ownLevel();
    var levels=Array.from(new Set([1].concat(branches.flatMap(function(br){return (br.paliers||[]).map(function(t){return Number(t.niv);}).filter(function(n){return Number.isFinite(n)&&n>=1;});}),[max]))).sort(function(a,b){return a-b;});
    return '<section class="oath-levelbar"><div class="oath-level-label"><span class="oath-eyebrow">Niveau simulé</span><div><button type="button" class="oath-level-step" data-step-level="-1" aria-label="Diminuer le niveau">−</button><output id="oath-level-value" for="oath-level">'+state.level+'</output><button type="button" class="oath-level-step" data-step-level="1" aria-label="Augmenter le niveau">+</button></div>'+(mine?'<button type="button" class="oath-own-level" data-own-level>Mon niveau · '+mine+'</button>':'')+'</div><div class="oath-level-control"><label for="oath-level">Fais évoluer la constellation</label><input id="oath-level" type="range" min="1" max="'+max+'" step="1" value="'+state.level+'"><div class="oath-level-stops">'+levels.map(function(level){return '<button type="button" class="oath-level-stop" data-level-stop="'+level+'" aria-pressed="'+(level===state.level)+'">'+level+'</button>';}).join('')+'</div></div></section>';
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
    return '<div class="oath-inspector-effect"><div class="oath-actions-heading"><h4>Actions disponibles</h4><p>Valeurs au niveau '+level+'</p></div><div class="oath-ability-actions">'+operations.map(function(op){
      var costs=inspectorCosts(op.cost);
      var rule=String(op.ruleFormula||op.rule||'').replace(/\((-?\d+) \+ N\)/g,function(_,base){return String(Number(base)+level);}).replace(/^\d+ actions?(?:\s*(?:,|et|\/)\s*\d+\s*(?:EP|EM|PV))*/,'').replace(/^[.,;]\s*/,'').trim().replace(/^et\s+/,'Consomme ');
      return '<article class="oath-ability-action" data-operation="'+escAttr(op.id||'')+'"><div class="oath-ability-action-head"><h5>'+esc(op.label||'Action')+'</h5><div class="oath-action-cost" aria-label="Coût de l’action">'+costs.map(function(value){return '<span>'+esc(value)+'</span>';}).join('')+'</div></div><p class="oath-action-effect">'+esc(rule)+'</p></article>';
    }).join('')+'</div></div>';
  }
  function inspectorMarkup(branch,tier,index,total){
    if(!branch||!tier) return '<section class="oath-inspector"><p class="oath-empty">Les capacités de ce serment restent à définir.</p></section>';
    var actual=currentIndex(branch),unlocked=Number(tier.niv)<=state.level;
    var status=!unlocked?(sealed(branch,index)?'Scellé':'Verrouillé'):index===actual?'Actif · aperçu':'Palier remplacé';
    if(obscured(branch,index)) return '<section class="oath-inspector is-locked'+(sealed(branch,index)?' is-sealed':'')+'" data-tier-color="'+tierColor(index)+'"><div class="oath-inspector-head"><span class="oath-eyebrow">Un sceau à révéler</span><span class="oath-inspector-status is-locked" role="status">'+esc(status)+'</span></div><div class="oath-inspector-index">VOIE '+String.fromCharCode(65+state.branch)+' / SCEAU '+tierRoman(index)+' / NIV. '+esc(tier.niv)+'</div><h3 tabindex="-1">'+esc(sealed(branch,index)?'Pouvoir inconnu':nodeLabel(index,total))+'</h3>'+gateMarkup(branch,tier,index)+'</section>';
    var html='<section class="oath-inspector'+(!unlocked?' is-locked':'')+'" data-tier-color="'+tierColor(index)+'"><div class="oath-inspector-head"><span class="oath-inspector-index">Niveau '+esc(tier.niv)+' · '+esc(nodeLabel(index,total))+'</span><span class="oath-inspector-status '+(unlocked?'is-unlocked':'is-locked')+'" role="status">'+esc(status)+'</span></div><h3 tabindex="-1">'+esc(tier.nom||branchName(branch,state.branch))+'</h3><p class="oath-inspector-branch">Voie '+String.fromCharCode(65+state.branch)+' · '+esc(branchName(branch,state.branch))+'</p>';
    html+=inspectorActions(branch,tier)+'<div class="oath-inspector-more">';
    if(tier.manifestation||branch.descPhys||branch.flavor||branch.visual||branch.roleplay){
      html+='<details class="oath-inspector-flavor"><summary>Imaginaire &amp; incarnation</summary>';
      if(tier.manifestation) html+='<div class="oath-tier-story"><b>Ce qui se manifeste</b><p>'+esc(tier.manifestation)+'</p></div>';
      if(branch.descPhys||branch.visual) html+='<p><b>En combat</b>'+esc(branch.descPhys||branch.visual)+'</p>';
      if(branch.roleplay) html+='<p><b>Une question pour le porteur</b>'+esc(branch.roleplay)+'</p>';
      if(branch.flavor) html+='<p><b>Un échange possible</b>'+esc(branch.flavor)+'</p>';
      html+='</details>';
    }
    if(branch.combatRules) html+='<div class="oath-inspector-rules">'+renderSermentRules(branch)+'</div>';
    html+='</div><p class="oath-inspector-note">Seul le dernier palier atteint de ta voie s’applique.</p><button type="button" class="oath-copy-build" data-copy-build>Copier ce parcours <span aria-hidden="true">↗</span></button><span class="oath-action-status" role="status"></span></section>';
    return html;
  }
  function compareMarkup(branches){
    return '<section class="oath-compare" aria-label="Comparaison des voies au niveau '+state.level+'">'+branches.map(function(br,bi){
      var tiers=br.paliers||[],index=Math.max(0,currentIndex(br)),tier=tiers[index],masked=tier&&obscured(br,index);
      return '<article class="oath-compare-card'+(masked?' is-locked':'')+'" data-tier-color="'+tierColor(index)+'" data-branch="'+bi+'"><span class="oath-eyebrow">Voie '+String.fromCharCode(65+bi)+' · '+esc(br.style||'Spécialisation')+'</span><h3 tabindex="-1">'+esc(branchName(br,bi))+'</h3><p class="oath-compare-status">'+esc(currentIndex(br)<0?'Prochain palier · Niv. '+(tier&&tier.niv||'—'):'Palier applicable · Niv. '+(tier&&tier.niv||'—'))+'</p>'+(masked?gateMarkup(br,tier,index):((br.gameplay?gameGuideMarkup(br):(br.summary||br.desc?'<p>'+esc(br.summary||br.desc)+'</p>':''))+(tier?(tier.cout&&!getSermentTierOperations(tier).length?'<div class="oath-cost"><span>COÛT</span><strong>'+esc(tier.cout)+'</strong></div>':'')+'<div class="oath-inspector-effect">'+renderSermentOperations(tier,state.level)+'</div>':'')))+'<button type="button" data-inspect-branch="'+bi+'">Explorer cette voie <span aria-hidden="true">↗</span></button></article>';
    }).join('')+'</section>';
  }
  function evolutionMarkup(item,items){
    var parent=getSermEvolutionFrom(item.name,item.data),links=items.filter(function(candidate){return getSermEvolutionFrom(candidate.name,candidate.data)===item.name||candidate.name===parent;});
    if(!links.length) return '';
    return '<section class="oath-evolutions"><div><span class="oath-eyebrow">Au-delà du serment</span><h2>La métamorphose</h2><p>Atteins le niveau requis, puis reçois ton évolution du staff.</p></div><div class="oath-evo-links">'+links.map(function(link){var origin=link.name===parent,gated=!origin&&state.level<minimum(link);return '<button type="button" class="oath-evo-btn'+(gated?' is-locked':origin?'':' is-ready')+'" data-evolution="'+escAttr(link.name)+'"><span class="oath-evo-art">'+getSermEmblem(link.name,64)+'</span><span><small>'+esc(origin?'Revenir à l’origine':'Évolution · Niv. '+minimum(link))+'</small><strong>'+esc(link.name)+'</strong>'+(!origin?'<span class="oath-evo-status">'+esc(gated?'Niveau requis non atteint':'Niveau atteint · attribution staff')+'</span>':'')+'</span><span class="oath-evo-lock" aria-hidden="true">'+icon(gated?'lock':'arrow')+'</span></button>';}).join('')+'</div></section>';
  }
  function stageMarkup(item,items){
    if(!item) return '<div class="oath-empty oath-empty-stage">Aucun serment ne correspond à ces filtres. Ajuste ta recherche.</div>';
    var data=item.data,branches=branchesOf(item);
    if(!branches[state.branch]) state.branch=0;
    var branch=branches[state.branch],tiers=branch&&branch.paliers||[];
    if(!tiers[state.tier]) state.tier=Math.max(0,currentIndex(branch));
    var tier=tiers[state.tier];
    var heroArt=getSermEmblem(item.name,640).replace('loading="lazy"','loading="eager" fetchpriority="high"');
    var html='<section class="oath-hero"><div class="oath-hero-content"><div class="oath-hero-meta"><span>'+esc(getSermCatLabel(category(item)))+'</span><span>'+esc(getSermEvolutionFrom(item.name,data)?'Évolution · Niv. '+minimum(item):'Serment d’origine')+'</span></div><h2 class="oath-hero-title" tabindex="-1">'+esc(item.name)+'</h2><p class="oath-hero-tagline">'+esc(data.tagline||data.pitch||data.fantasy||data.arme)+'</p></div>'+rankMarkup(branch)+'<div class="oath-stats">'+stat(data.pvN,'PV / niv.')+stat(data.epN,'EP / niv.')+stat(data.emN,'EM / niv.')+stat(data.dmg,'Dégâts')+'</div></section>';
    if(data.vow) html+='<section class="oath-identity" aria-label="L’esprit du serment"><div><span class="oath-eyebrow">Des mots pour le porter</span><blockquote>« '+esc(data.vow)+' »</blockquote></div><div><p>'+esc(String(data.lore||'').split(/\n\s*\n/)[0])+'</p><button type="button" data-read-story>Lire le récit & imaginer son éveil <span aria-hidden="true">↓</span></button></div></section>';
    html+='<div class="oath-tree-grid"><section class="oath-tree"><div class="oath-tree-heading"><div><span class="oath-eyebrow">'+(branches.length===2?'Deux':branches.length)+' voies · un engagement</span><h2 tabindex="-1">Trace ta voie</h2></div><div class="oath-view-tabs" aria-label="Mode de lecture"><button type="button" data-oath-view="tree" aria-pressed="'+(state.view==='tree')+'">Constellation</button><button type="button" data-oath-view="compare" aria-pressed="'+(state.view==='compare')+'">Comparer</button></div></div>'+discoveryMarkup()+'<div class="oath-branch-switcher">'+branches.map(branchSwitch).join('')+'</div><div class="oath-play-guide">'+gameGuideMarkup(branch)+'</div>'+tierLegend(branch);
    html+='<div class="oath-map'+(branches.length!==2||branches.some(function(br){return (br.paliers||[]).length>4;})?' is-linear':'')+'" data-current-color="'+tierColor(currentIndex(branch))+'"'+(state.view==='tree'?'':' hidden')+'><div class="oath-map-mist" aria-hidden="true"></div>'+linkMarkup(branches)+'<div class="oath-constellation-center"><div class="oath-orbit" aria-hidden="true"></div><div class="oath-orbit oath-orbit-inner" aria-hidden="true"></div><div class="oath-hero-art">'+heroArt+'</div><span class="oath-art-caption">'+esc(data.arme||item.name)+'</span><small>ARME LIÉE</small></div><div class="oath-paths">'+branches.map(pathMarkup).join('')+'</div><div class="oath-root"><span class="oath-root-sigil" aria-hidden="true">'+glyph(0)+'</span><div><small>NIVEAU '+String(minimum(item)).padStart(2,'0')+'</small><strong>'+esc(getSermEvolutionFrom(item.name,data)?'Serment évolué':'Le pacte originel')+'</strong></div></div></div>';
    html+='<div class="oath-compare-wrap"'+(state.view==='compare'?'':' hidden')+'>'+compareMarkup(branches)+'</div>'+levelMarkup(branches)+progressMarkup(branch)+nextQuest(branch)+'<div class="oath-unlock-toast" role="status" aria-live="polite" aria-atomic="true"></div></section>'+inspectorMarkup(branch,tier,state.tier,tiers.length)+'</div>';
    html+=evolutionMarkup(item,items);
    html+='<details class="oath-codex"><summary><span class="oath-eyebrow">Les archives du serment</span><strong>L’histoire & l’art du combat</strong><span aria-hidden="true">+</span></summary><div class="oath-codex-body">';
    if(data.lore) html+=paragraphs(data.lore,'oath-hero-lore');
    if(data.weaponDescription) html+='<p class="oath-weapon-detail"><b>Silhouette de l’arme</b>'+esc(data.weaponDescription)+'</p>';
    if(data.awakening||data.worldRole) html+='<div class="oath-world">'+[['Un éveil possible',data.awakening],['Parmi les rescapés',data.worldRole],['Ce qui évolue',data.evolutionMeaning]].filter(function(row){return row[1];}).map(function(row){return '<section><h3>'+row[0]+'</h3><p>'+esc(row[1])+'</p></section>';}).join('')+'</div><p class="oath-rp-note">Ces scènes et engagements sont des pistes de jeu. Le serment reconnaît son porteur ; ils ne lui imposent ni passé, ni personnalité, ni pouvoir supplémentaire.</p>';
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
    var branches=branchesOf(selected()),branch=branches[state.branch],tiers=branch&&branch.paliers||[],oldLevel=state.level;
    state.level=Math.max(1,Math.min(maxLevel(branches),Math.floor(Number(value)||1)));
    state.tier=Math.max(0,currentIndex(branch));remember();
    var slider=document.getElementById('oath-level');slider.max=maxLevel(branches);slider.value=state.level;document.getElementById('oath-level-value').textContent=state.level;
    mount.querySelectorAll('.oath-node').forEach(function(node){var bi=Number(node.dataset.nodeBranch),ti=Number(node.dataset.nodeTier);node.outerHTML=nodeMarkup(branches[bi],bi,ti);});
    mount.querySelectorAll('.oath-link').forEach(function(link){var bi=Number(link.dataset.linkBranch),ti=Number(link.dataset.linkTier),active=currentIndex(branches[bi]);link.classList.toggle('is-lit',ti<=active);link.classList.toggle('is-current',bi===state.branch&&ti<=active);link.classList.toggle('is-sealed',sealed(branches[bi],ti));});
    mount.querySelectorAll('[data-level-stop]').forEach(function(button){button.setAttribute('aria-pressed',String(Number(button.dataset.levelStop)===state.level));});
    var inspector=mount.querySelector('.oath-inspector');if(inspector)inspector.outerHTML=inspectorMarkup(branch,tiers[state.tier],state.tier,tiers.length);
    var guide=mount.querySelector('.oath-play-guide');if(guide)guide.innerHTML=gameGuideMarkup(branch);
    var progress=mount.querySelector('.oath-progress-readout');if(progress)progress.outerHTML=progressMarkup(branch);
    var quest=mount.querySelector('.oath-next-quest');if(quest)quest.outerHTML=nextQuest(branch);
    var rank=mount.querySelector('.oath-rank-hud');if(rank)rank.outerHTML=rankMarkup(branch);
    var map=mount.querySelector('.oath-map');if(map)map.dataset.currentColor=tierColor(currentIndex(branch));
    var comparison=mount.querySelector('.oath-compare-wrap');if(comparison)comparison.innerHTML=compareMarkup(branches);
    var evolution=mount.querySelector('.oath-evolutions');if(evolution)evolution.outerHTML=evolutionMarkup(selected(),catalogue());
    mount.querySelectorAll('.oath-list-item').forEach(function(button){var gated=Number(button.dataset.minLevel)>state.level;button.classList.toggle('is-gated',gated);button.querySelector('.oath-list-lock').hidden=!gated;});
    showUnlock(oldLevel,branch);
  }
  function setDiscovery(enabled){
    state.discovery=enabled;refreshStage();
    var target=mount.querySelector('[data-discovery="'+(enabled?'on':'off')+'"]');if(target)target.focus({preventScroll:true});
  }
  function inspectorBelowTree(){
    var tree=mount.querySelector('.oath-tree'),panel=mount.querySelector('.oath-inspector');
    return tree&&panel&&panel.getBoundingClientRect().top>=tree.getBoundingClientRect().bottom-1;
  }
  function previewLevel(value){
    levelInput(value);var scroll=mobile()||(state.view!=='compare'&&inspectorBelowTree()),target=state.view==='compare'?mount.querySelector('.oath-compare-card[data-branch="'+state.branch+'"] h3'):mount.querySelector(scroll?'.oath-inspector h3':'.oath-node.is-current');
    if(target){target.focus({preventScroll:true});if(scroll)target.scrollIntoView({behavior:motion(),block:'start'});}
  }
  function inspect(branch,tier,fromCompare){
    var branches=branchesOf(selected());state.branch=branch;state.tier=tier==null?Math.max(0,currentIndex(branches[branch])):tier;
    if(fromCompare) state.view='tree';remember();refreshStage();
    var target=mount.querySelector('.oath-node.is-selected');if(target) target.focus({preventScroll:true});
    if(mobile()||inspectorBelowTree()){var heading=mount.querySelector('.oath-inspector h3');if(heading){heading.focus({preventScroll:true});heading.scrollIntoView({behavior:motion(),block:'start'});}}
  }
  async function copyBuild(){
    var item=selected(),branch=branchesOf(item)[state.branch],tier=branch&&branch.paliers&&branch.paliers[state.tier];if(!item||!tier||obscured(branch,state.tier)) return;
    var text=[item.name+' — '+branchName(branch,state.branch),'Aperçu au niveau '+state.level+' · Palier inspecté : niveau '+tier.niv,item.data.arme,tier.nom||branchName(branch,state.branch),tier.manifestation||'','Coût principal : '+(tier.cout||'voir effet'),tier.desc||branch.desc||'Effet à définir.','Une seule voie ; seul le palier le plus élevé atteint s’applique.'].join('\n');
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
    if(button.hasAttribute('data-discovery')) return setDiscovery(button.dataset.discovery==='on');
    if(button.hasAttribute('data-reveal-all')) return setDiscovery(false);
    if(button.hasAttribute('data-preview-tier')) return previewLevel(button.dataset.previewTier);
    if(button.hasAttribute('data-next-tier')) return previewLevel(button.dataset.nextTier);
    if(button.hasAttribute('data-own-level')) return levelInput(ownLevel()||1);
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
    if(button.hasAttribute('data-read-story')){var story=mount.querySelector('.oath-codex');story.open=true;story.querySelector('summary').focus({preventScroll:true});story.scrollIntoView({behavior:motion(),block:'start'});return;}
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
