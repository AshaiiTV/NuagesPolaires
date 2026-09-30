/* Lecture des archives et comptes rendus, sans modifier la simulation. */
(function(){
  'use strict';
  var current = null;
  function node(tag, cls, text){
    var el=document.createElement(tag); if(cls) el.className=cls;
    if(text!==undefined) el.textContent=String(text); return el;
  }
  function plain(value){
    var template=document.createElement('template');
    template.innerHTML=String(value||'');
    template.content.querySelectorAll('script,style').forEach(function(el){el.remove();});
    return template.content.textContent||'';
  }
  function date(value){
    var d=new Date(Number(value)||0);
    return Number(value)>0&&!isNaN(d.getTime())?d.toLocaleString('fr-FR',{dateStyle:'medium',timeStyle:'short'}):'Date non renseignée';
  }
  function ownAccount(){ return typeof getCurrentAccount==='function'?getCurrentAccount():null; }
  function collect(){
    if(!window.CU) return [];
    var role=String(CU.role||'joueur').toLowerCase();
    if(['admin','mj','joueur'].indexOf(role)<0) return [];
    var account=ownAccount(), pid=account?account.pid:(role==='joueur'?CU.pid:null);
    var owners=role==='admin'?_combatArchiveKnownOwners():combatArchiveCurrentOwners();
    if(account){ owners=owners.concat([account.id,account.pseudo]); }
    var player=pid?gpid(pid):null;
    if(player) owners.push(player.name);
    var seen=Object.create(null), items=[];
    owners.forEach(function(rawOwner){
      var owner=combatArchiveOwnerKey(rawOwner); if(!owner||seen[owner]) return; seen[owner]=true;
      // Read existing cache only: opening this page must not promote legacy archives.
      var index=sto(combatArchiveIndexKey(owner));
      var indexed=Array.isArray(index)&&index.length>0;
      var records=indexed?index:sto(combatArchiveStoreKey(owner));
      (Array.isArray(records)?records:[]).forEach(function(arc){
        if(!arc||!arc.id) return;
        items.push({key:JSON.stringify([owner,String(arc.id)]),owner:owner,id:String(arc.id),kind:'archive',
          name:String(arc.name||arc.label||'Combat sans titre'),at:Number(arc.savedAt)||0,
          arc:arc,stub:indexed||!!arc._stub});
      });
    });
    if(role==='joueur'&&player){
      (Array.isArray(player.history)?player.history:[]).forEach(function(entry,i){
        if(!entry||entry.type!=='combat') return;
        var text=plain(entry.text);
        items.push({key:'history-'+i,kind:'history',name:text.split('—')[0].replace(/^⚔\s*/, '').trim()||'Compte rendu de combat',at:Number(entry.ts)||0,text:text,by:String(entry.by||'')});
      });
    }
    return items.sort(function(a,b){ return b.at-a.at; });
  }
  function valid(state){ return current===state&&state.generation===window._dbSessionGeneration&&!!window.CU&&state.host.isConnected; }
  function exportText(item, arc){
    var lines=[item.name,date(item.at),item.kind==='history'?item.text:'Archive de '+item.owner];
    if(arc){
      lines.push('Round '+(Number(arc.round)||1));
      (Array.isArray(arc.fighters)?arc.fighters:[]).forEach(function(f){ if(f) lines.push(String(f.name||f.nom||'Combattant')+' — PV '+String(f.pvCur??'—')+'/'+String(f.pvMax??'—')); });
      (Array.isArray(arc.log)?arc.log:[]).forEach(function(entry){ if(entry) lines.push(plain(entry.text)); });
    }
    var url=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'}));
    var link=node('a');link.href=url;link.download='nuages-polaires-combat.txt';link.click();
    setTimeout(function(){URL.revokeObjectURL(url);},1000);
  }
  async function select(state,item){
    var ticket=++state.ticket; state.selected=item.key;
    state.list.querySelectorAll('[data-archive-key]').forEach(function(button){button.setAttribute('aria-pressed',String(button.dataset.archiveKey===item.key));});
    state.detail.replaceChildren(node('p','np-archive-muted','Chargement du récit…'));
    try{
      var arc=item.kind==='archive'?(item.stub?await combatArchiveFetchRecord(item.owner,item.id):item.arc):null;
      if(!valid(state)||ticket!==state.ticket) return;
      if(item.kind==='archive'&&!arc) throw new Error('Cette archive n’est plus disponible.');
      var header=node('header');header.append(node('p','np-eyebrow',item.kind==='history'?'Compte rendu de ta fiche':'Archive sauvegardée'),node('h2','',item.name),node('p','np-archive-muted',date(item.at)+(item.owner?' · '+item.owner:'')));
      state.detail.replaceChildren(header);
      if(item.kind==='history'){
        state.detail.append(node('p','np-archive-text',item.text));
        if(item.by) state.detail.append(node('p','np-archive-muted','Enregistré par '+item.by));
      }else{
        state.detail.append(node('p','np-archive-muted','Round '+(Number(arc.round)||1)+(arc._draft?' · Brouillon':arc._inProgress?' · En cours':'')));
        var fighters=node('ul','np-archive-fighters');
        (Array.isArray(arc.fighters)?arc.fighters:[]).forEach(function(f){if(!f)return;var line=node('li');line.append(node('strong','',f.name||f.nom||'Combattant'),node('span','','PV '+String(f.pvCur??'—')+' / '+String(f.pvMax??'—')));fighters.append(line);});
        if(fighters.childElementCount) state.detail.append(fighters);
        var log=node('ol','np-archive-log');
        (Array.isArray(arc.log)?arc.log:[]).forEach(function(entry){if(entry&&entry.text) log.append(node('li','',plain(entry.text)));});
        state.detail.append(node('h3','','Journal du combat'),log.childElementCount?log:node('p','np-archive-muted','Aucune entrée de journal dans cette archive.'));
      }
      var download=node('button','btn','Exporter ce récit');download.type='button';download.onclick=function(){if(valid(state)) exportText(item,arc);};state.detail.append(download);
      if(window.matchMedia('(max-width:760px)').matches) state.detail.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
    }catch(error){
      if(!valid(state)||ticket!==state.ticket) return;
      var retry=node('button','btn','Réessayer');retry.type='button';retry.onclick=function(){select(state,item);};
      state.detail.replaceChildren(node('h2','','Récit indisponible'),node('p','np-archive-muted','Le chargement a échoué. Tes archives sont conservées ; tu peux réessayer.'),retry);
    }
  }
  function renderList(state){
    if(!valid(state)) return;
    var q=state.search.value.trim().toLocaleLowerCase('fr');
    var filtered=state.items.filter(function(item){return(!state.filter.value||item.kind===state.filter.value)&&(!q||[item.name,item.owner,item.by,item.text].join(' ').toLocaleLowerCase('fr').includes(q));});
    var pages=Math.max(1,Math.ceil(filtered.length/20));state.page=Math.min(state.page,pages-1);
    state.count.textContent=filtered.length+' récit'+(filtered.length>1?'s':'');state.list.replaceChildren();
    filtered.slice(state.page*20,state.page*20+20).forEach(function(item){
      var button=node('button','np-archive-item');button.type='button';button.dataset.archiveKey=item.key;button.setAttribute('aria-pressed',String(state.selected===item.key));
      button.append(node('small','',item.kind==='history'?'Compte rendu':'Archive'),node('strong','',item.name),node('span','',date(item.at)));button.onclick=function(){select(state,item);};state.list.append(button);
    });
    state.prev.disabled=state.page===0;state.next.disabled=state.page>=pages-1;state.pageLabel.textContent=(state.page+1)+' / '+pages;
    state.pager.hidden=pages<=1;
    if(!filtered.length){state.list.append(node('p','np-archive-muted',state.items.length?'Aucun récit ne correspond à ces filtres.':'Aucun combat enregistré pour le moment.'));}
    if(!filtered.some(function(item){return item.key===state.selected;})){
      state.ticket++;state.selected=null;state.detail.replaceChildren(node('h2','','Les traces de ton aventure'),node('p','np-archive-muted','Choisis un récit pour consulter son détail. Les comptes rendus de fiche et les archives sauvegardées sont présentés séparément, sans modifier un combat en cours.'));
    }
  }
  window.renderAdventureArchives=function(tid){
    var host=document.getElementById(tid);if(!host)return;
    if(!window.CU){host.replaceChildren(node('p','','Connecte-toi pour retrouver tes combats.'));current=null;return;}
    var heading=node('header','np-archives-heading');heading.append(node('p','np-eyebrow','Mon aventure / Les récits'),node('h1','','Archives de combat'),node('p','np-archive-muted','Retrouve les comptes rendus de ta fiche et les archives accessibles à ton compte.'));
    var toolbar=node('div','np-archives-toolbar');
    var searchLabel=node('label','','Rechercher un récit'),search=node('input');search.type='search';search.placeholder='Titre, organisateur, compte rendu…';searchLabel.append(search);
    var filterLabel=node('label','','Type de récit'),filter=node('select');[['','Tous les récits'],['archive','Archives sauvegardées'],['history','Comptes rendus de fiche']].forEach(function(option){var el=node('option','',option[1]);el.value=option[0];filter.append(el);});filterLabel.append(filter);
    var count=node('p','np-archive-count');count.setAttribute('role','status');toolbar.append(searchLabel,filterLabel,count);
    var layout=node('div','np-archives-layout'),left=node('div'),list=node('div','np-archives-list'),detail=node('article','np-archive-detail');detail.setAttribute('aria-live','polite');
    var pager=node('nav','np-archives-pagination');pager.setAttribute('aria-label','Pages des archives');var prev=node('button','btn','Précédent'),next=node('button','btn','Suivant'),pageLabel=node('span');prev.type=next.type='button';pager.append(prev,pageLabel,next);left.append(list,pager);layout.append(left,detail);host.replaceChildren(heading,toolbar,layout);
    var state={host:host,generation:window._dbSessionGeneration,items:collect(),ticket:0,page:0,selected:null,search:search,filter:filter,count:count,list:list,detail:detail,prev:prev,next:next,pager:pager,pageLabel:pageLabel};current=state;
    search.oninput=filter.onchange=function(){state.page=0;renderList(state);};prev.onclick=function(){state.page--;renderList(state);};next.onclick=function(){state.page++;renderList(state);};renderList(state);
    if(typeof can==='function'&&can('manage_players')){var tools=node('button','btn np-archive-tools','Ouvrir la simulation et ses outils');tools.type='button';tools.onclick=function(){switchDropTab('combat-mj',null,'dd-staff');};host.append(tools);}
  };
})();
