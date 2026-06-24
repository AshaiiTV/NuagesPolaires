(function(){
  injectStyles();
  var STORE="np_rpg_proto_v1";
  var PRESENCE="np_rpg_presence_v1";
  var clientId="c"+Math.random().toString(36).slice(2)+Date.now().toString(36);
  var channel=null;
  var presence={};
  var tickTimer=null;
  var dbSync={loaded:false,loading:false,saving:false,lastHash:"",timer:null,status:"local"};

  var world={
    camp:{name:"Camp des Brumes",kind:"Refuge",x:46,y:68,shop:true,
      desc:"Tentes basses, braseros bleus et marchands qui jurent avoir vu l'aube sous la glace.",
      links:["ridge","market","forest"],enemies:["lutinivre"]},
    market:{name:"Marche d'Astragivre",kind:"Boutique",x:30,y:55,shop:true,
      desc:"Un ponton marchand pose sur la neige tassee. On y troque du fer, des baies et des rumeurs.",
      links:["camp","harbor"],enemies:["rat"]},
    ridge:{name:"Crete des Serments",kind:"Frontiere",x:58,y:42,shop:false,
      desc:"La crete coupe le vent en deux. Des traces fraiches montent vers les ruines.",
      links:["camp","ruins","cave"],enemies:["renegat","lutinivre"]},
    forest:{name:"Taillis du Nord",kind:"Chasse",x:70,y:64,shop:false,
      desc:"Des pins noirs serrent le passage. Les branches craquent comme des os secs.",
      links:["camp","cave"],enemies:["rat","renegat"]},
    cave:{name:"Grotte d'Eclats",kind:"Donjon",x:77,y:36,shop:false,
      desc:"La roche chante doucement. Quelque chose repond quand on avance trop loin.",
      links:["ridge","forest"],enemies:["sentinelle","renegat"]},
    ruins:{name:"Ruines de Nacre",kind:"Elite",x:43,y:24,shop:false,
      desc:"Un ancien relais Twinoidien avale la lumiere. Les portes bougent sans vent.",
      links:["ridge","harbor"],enemies:["sentinelle"]},
    harbor:{name:"Havre Blanc",kind:"Port",x:18,y:30,shop:true,
      desc:"Le havre tient encore grace aux treuils, aux dettes et aux capitaines patients.",
      links:["market","ruins"],enemies:["rat"]}
  };
  var enemies={
    rat:{name:"Rat de givre",hp:18,atk:4,def:1,xp:8,gold:8,drop:"baies"},
    lutinivre:{name:"Pilleur lutinivre",hp:24,atk:5,def:2,xp:12,gold:12,drop:"acier"},
    renegat:{name:"Rodeur renie",hp:34,atk:7,def:3,xp:18,gold:18,drop:"amulette"},
    sentinelle:{name:"Sentinelle de nacre",hp:48,atk:9,def:4,xp:30,gold:32,drop:"cristal"}
  };
  var items={
    potion:{name:"Potion chaude",type:"consumable",price:18,heal:26,desc:"Rend 26 PV."},
    baies:{name:"Baies polaires",type:"consumable",price:9,heal:12,desc:"Rend 12 PV."},
    acier:{name:"Lame d'acier froid",slot:"weapon",price:65,atk:5,def:0,desc:"+5 attaque."},
    manteau:{name:"Manteau de laine noire",slot:"armor",price:55,atk:0,def:4,desc:"+4 defense."},
    amulette:{name:"Amulette de souffle",slot:"trinket",price:80,atk:2,def:2,desc:"+2 attaque, +2 defense."},
    cristal:{name:"Cristal de nacre",slot:"trinket",price:120,atk:4,def:3,desc:"+4 attaque, +3 defense."}
  };
  var fakePlayers=[
    {name:"Maelia",loc:"camp",level:3},{name:"Soren",loc:"ridge",level:4},
    {name:"Ivara",loc:"market",level:2},{name:"Noam",loc:"cave",level:5}
  ];
  var starterSpawns=[
    {id:"camp",label:"Camp des Brumes",tag:"Refuge",bonus:"2 potions de depart"},
    {id:"market",label:"Marche d'Astragivre",tag:"Commerce",bonus:"+20 or de depart"},
    {id:"harbor",label:"Havre Blanc",tag:"Route maritime",bonus:"1 amulette a revendre ou equiper"}
  ];
  var starterClassFallback=["Duelliste","Sauvageon","Croisé","Rôdeur","Traqueur","Flécheur","Elementaliste","Evocateur","Conjurateur","Arcaniste"];
  var legacyClassMap={duelliste:"Duelliste",veilleur:"Croisé",souffle:"Rôdeur","Souffle-Givre":"Rôdeur"};

  function injectStyles(){
    if(document.getElementById("np-rpg-prototype-style")) return;
    var style=document.createElement("style");
    style.id="np-rpg-prototype-style";
    style.textContent=[
      "#rpg-prototype{max-width:1420px;margin:0 auto;}",
      ".rpg-shell{display:grid;gap:16px;color:var(--text);}",
      ".rpg-hero{min-height:210px;display:flex;align-items:flex-end;justify-content:space-between;gap:18px;padding:28px;border:1px solid rgba(126,184,212,.18);background:linear-gradient(180deg,rgba(5,8,14,.32),rgba(5,8,14,.88)),url('https://images.unsplash.com/photo-1517783999520-f068d7431a60?auto=format&fit=crop&w=1800&q=70') center 42%/cover;border-radius:8px;box-shadow:0 18px 52px rgba(0,0,0,.28);}",
      ".rpg-hero h2{font-family:var(--fd);font-size:clamp(28px,4vw,58px);letter-spacing:0;margin:5px 0;color:#f4fbff;text-shadow:0 8px 28px rgba(0,0,0,.75);}",
      ".rpg-hero p{max-width:660px;margin:0;color:rgba(236,247,255,.82);font-size:14px;line-height:1.7;}",
      ".rpg-kicker,.rpg-title{font-family:var(--fd);font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--glacier);}",
      ".rpg-hud{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;}",
      ".rpg-hud-card,.rpg-panel{border:1px solid rgba(126,184,212,.15);background:linear-gradient(180deg,rgba(12,18,30,.82),rgba(7,10,18,.92));border-radius:8px;box-shadow:0 14px 38px rgba(0,0,0,.22);}",
      ".rpg-hud-card{padding:12px 14px;min-height:64px;display:flex;flex-direction:column;justify-content:center;gap:4px;}",
      ".rpg-hud-card span,.rpg-item span,.rpg-player span,.rpg-slot span,.rpg-desc,.rpg-empty{color:var(--dim);font-size:12px;line-height:1.55;}",
      ".rpg-hud-card b{font-size:15px;color:var(--text);}",
      ".rpg-grid{display:grid;grid-template-columns:minmax(360px,1.35fr) minmax(280px,.9fr) minmax(280px,.9fr);gap:16px;align-items:start;}",
      ".rpg-panel{padding:16px;min-width:0;}",
      ".rpg-map-panel{grid-row:span 2;}",
      ".rpg-map{position:relative;aspect-ratio:1.15/1;min-height:420px;overflow:hidden;border-radius:8px;border:1px solid rgba(126,184,212,.14);background:radial-gradient(circle at 44% 40%,rgba(126,184,212,.18),transparent 34%),linear-gradient(140deg,#17202c,#09101b 58%,#1d2830);}",
      ".rpg-map svg{position:absolute;inset:0;width:100%;height:100%;opacity:.68;}",
      ".rpg-map path:first-child{fill:rgba(210,239,250,.09);stroke:rgba(210,239,250,.22);stroke-width:.5;}",
      ".rpg-route{fill:none!important;stroke:rgba(232,244,249,.28)!important;stroke-width:.55;stroke-dasharray:2 2;}",
      ".rpg-node{position:absolute;transform:translate(-50%,-50%);background:transparent;border:0;color:var(--text);cursor:pointer;padding:0;min-width:88px;display:flex;flex-direction:column;align-items:center;gap:5px;}",
      ".rpg-node span{width:18px;height:18px;border-radius:50%;border:1px solid rgba(212,238,248,.7);background:rgba(7,11,18,.9);box-shadow:0 0 0 5px rgba(126,184,212,.08),0 0 22px rgba(126,184,212,.24);}",
      ".rpg-node b{font-size:11px;line-height:1.2;text-shadow:0 2px 8px #000;}",
      ".rpg-node.here span{background:var(--glacier);box-shadow:0 0 0 6px rgba(126,184,212,.18),0 0 28px rgba(126,184,212,.6);}",
      ".rpg-node.reachable:not(.here) span{border-color:rgba(201,168,76,.8);}",
      ".rpg-tags,.rpg-actions,.rpg-slots{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;}",
      ".rpg-tags span,.rpg-slot{border:1px solid rgba(126,184,212,.14);background:rgba(126,184,212,.07);border-radius:999px;padding:6px 10px;font-size:11px;color:var(--glacier);}",
      ".rpg-slot{border-radius:8px;display:flex;flex-direction:column;gap:2px;min-width:120px;}",
      ".rpg-slot b{font-size:12px;color:var(--text);}",
      ".rpg-item,.rpg-player,.rpg-fight>div{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid rgba(126,184,212,.1);}",
      ".rpg-item:last-child,.rpg-player:last-child{border-bottom:0;}",
      ".rpg-item b,.rpg-player b{display:block;font-size:13px;color:var(--text);}",
      ".rpg-form{display:grid;grid-template-columns:minmax(120px,1fr) auto;gap:8px;margin-top:12px;}",
      ".rpg-form input{min-height:38px;border:1px solid rgba(126,184,212,.16);background:rgba(3,7,13,.64);border-radius:6px;color:var(--text);padding:0 10px;outline:none;}",
      ".rpg-create{display:grid;gap:16px;}",
      ".rpg-create-grid{display:grid;grid-template-columns:minmax(280px,.85fr) minmax(360px,1.15fr);gap:16px;align-items:start;}",
      ".rpg-create-name{display:grid;gap:8px;margin-top:12px;}",
      ".rpg-create-name label{font-size:11px;color:var(--dim);}",
      ".rpg-create-name input{min-height:42px;border:1px solid rgba(126,184,212,.18);background:rgba(3,7,13,.68);border-radius:6px;color:var(--text);padding:0 12px;outline:none;}",
      ".rpg-oaths{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px;}",
      ".rpg-oath{border:1px solid rgba(126,184,212,.14);background:rgba(126,184,212,.045);border-radius:8px;padding:10px;text-align:left;color:var(--text);cursor:pointer;}",
      ".rpg-oath.is-active{border-color:rgba(201,168,76,.62);background:rgba(201,168,76,.09);}",
      ".rpg-oath b{display:block;font-size:12px}.rpg-oath span{display:block;margin-top:4px;color:var(--dim);font-size:11px;line-height:1.45;}",
      ".rpg-spawns{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px;}",
      ".rpg-spawn{border:1px solid rgba(126,184,212,.14);background:rgba(126,184,212,.045);border-radius:8px;padding:12px;text-align:left;color:var(--text);cursor:pointer;}",
      ".rpg-spawn.is-active{border-color:rgba(126,184,212,.7);background:rgba(126,184,212,.11);}",
      ".rpg-spawn b{display:block;font-size:12px}.rpg-spawn span{display:block;margin-top:4px;color:var(--dim);font-size:11px;line-height:1.45;}",
      ".rpg-quest{display:grid;gap:8px;margin-top:12px;}",
      ".rpg-step{display:flex;align-items:center;gap:8px;color:var(--dim);font-size:12px;}",
      ".rpg-step.done{color:var(--glacier)}.rpg-step i{width:18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(126,184,212,.2);font-style:normal;font-size:10px;}",
      ".rpg-step.done i{background:rgba(126,184,212,.18);border-color:rgba(126,184,212,.45);}",
      ".rpg-items{margin-top:12px;}",
      ".rpg-log{display:grid;gap:6px;font-size:12px;color:var(--dim);}",
      ".rpg-log div{padding:8px 10px;border-radius:6px;background:rgba(255,255,255,.025);border:1px solid rgba(126,184,212,.08);}",
      "@media(max-width:1100px){.rpg-grid{grid-template-columns:1fr 1fr}.rpg-map-panel{grid-column:1/-1;grid-row:auto}.rpg-hud{grid-template-columns:repeat(3,minmax(0,1fr));}.rpg-create-grid{grid-template-columns:1fr;}}",
      "@media(max-width:720px){.rpg-hero{min-height:260px;align-items:flex-end;flex-direction:column;justify-content:flex-end}.rpg-grid,.rpg-hud,.rpg-oaths,.rpg-spawns,.rpg-form{grid-template-columns:1fr}.rpg-map{min-height:360px}.rpg-node{min-width:70px}.rpg-node b{font-size:10px}.rpg-item{align-items:flex-start;flex-direction:column}.rpg-item .btn{width:100%;}}"
    ].join("");
    document.head.appendChild(style);
  }

  function h(s){ return (window.esc?esc(s):String(s||"").replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];})); }
  function geLocal(id){ return document.getElementById(id); }
  function allSerments(){
    var all={};
    try{ if(typeof getAllSD==="function") all=getAllSD()||{}; }catch(e){}
    if(!Object.keys(all).length){
      try{ if(window.SD) all=window.SD; }catch(e){}
    }
    return all||{};
  }
  function starterClasses(){
    var all=allSerments();
    var names=Object.keys(all).filter(function(name){ return all[name] && !all[name].hidden && all[name].arme; });
    if(!names.length) names=starterClassFallback.slice();
    return names.filter(function(name){ return !!classDef(name); });
  }
  function normalizeClass(name){
    var all=allSerments();
    if(legacyClassMap[name]) return legacyClassMap[name];
    if(all[name]) return name;
    var found=Object.keys(all).find(function(k){ return k.toLowerCase()===String(name||"").toLowerCase(); });
    return found||"Duelliste";
  }
  function classDef(name){
    var all=allSerments();
    return all[normalizeClass(name)]||all.Duelliste||{arme:"Arme du serment",pvN:6,epN:6,emN:2,dmg:11,type:"Tranchant"};
  }
  function maxPvFor(s){ var d=classDef(s.oath); return 30+Math.max(0,s.level-1)*(d.pvN||0); }
  function maxEpFor(s){ var d=classDef(s.oath); return 50+Math.max(0,s.level-1)*(d.epN||0); }
  function maxEmFor(s){ var d=classDef(s.oath); return 20+Math.max(0,s.level-1)*(d.emN||0); }
  function baseState(){
    return {schemaVersion:3,created:false,name:getPlayerName(),oath:"Duelliste",level:1,xp:0,gold:45,loc:"camp",spawn:"camp",hp:30,maxHp:30,energy:50,maxEnergy:50,mana:20,maxMana:20,reputation:0,
      inv:{potion:2,baies:1},equip:{weapon:null,armor:null,trinket:null},combat:null,visited:{camp:true},
      flags:{firstMove:false,firstWin:false,firstEquip:false,ruins:false,questClaimed:false},log:[]};
  }
  function getPlayerName(){
    try{ if(window.CU && (CU.pseudo||CU.name)) return CU.pseudo||CU.name; }catch(e){}
    return localStorage.getItem("np_rpg_proto_name")||"Voyageur";
  }
  function load(){
    try{
      var s=JSON.parse(localStorage.getItem(STORE)||"null");
      if(s&&s.loc&&s.inv&&s.equip) { return migrate(s); }
    }catch(e){}
    return baseState();
  }
  function migrate(s){
    var b=baseState();
    var oldVersion=s.schemaVersion||1;
    if(s.created===undefined) s.created=true;
    if(!s.spawn) s.spawn=s.loc||"camp";
    var oldHpRatio=s.maxHp?Math.max(.05,Math.min(1,s.hp/s.maxHp)):1;
    var oldEpRatio=s.maxEnergy?Math.max(0,Math.min(1,s.energy/s.maxEnergy)):1;
    var oldEmRatio=s.maxMana?Math.max(0,Math.min(1,(s.mana===undefined?s.maxMana:s.mana)/s.maxMana)):1;
    Object.keys(b).forEach(function(k){ if(s[k]===undefined) s[k]=b[k]; });
    s.oath=normalizeClass(s.oath||s.classe||"Duelliste");
    if(!s.visited) s.visited={camp:true};
    if(!s.flags) s.flags={};
    ["firstMove","firstWin","firstEquip","ruins","questClaimed"].forEach(function(k){ if(s.flags[k]===undefined) s.flags[k]=false; });
    if(!s.reputation) s.reputation=0;
    if(s.mana===undefined) s.mana=20;
    s.maxHp=maxPvFor(s); s.maxEnergy=maxEpFor(s); s.maxMana=maxEmFor(s);
    if(oldVersion<2){
      s.hp=Math.max(1,Math.round(s.maxHp*oldHpRatio));
      s.energy=Math.round(s.maxEnergy*oldEpRatio);
      s.mana=Math.round(s.maxMana*oldEmRatio);
      s.schemaVersion=2;
    } else {
      s.hp=Math.max(1,Math.min(s.hp,s.maxHp));
      s.energy=Math.max(0,Math.min(s.energy,s.maxEnergy));
      s.mana=Math.max(0,Math.min(s.mana,s.maxMana));
    }
    s.name=getPlayerName();
    return s;
  }
  function save(s){
    localStorage.setItem(STORE,JSON.stringify(s));
    scheduleDbSave(s);
  }
  function canUseDb(){
    try{ return !!(window.CU && typeof _dbCall==="function"); }catch(e){ return false; }
  }
  function characterHash(s){
    try{ return JSON.stringify(s||{}); }catch(e){ return ""; }
  }
  function scheduleDbSave(s){
    if(!s || !s.created || !canUseDb()) return;
    var hash=characterHash(s);
    if(hash && hash===dbSync.lastHash) return;
    if(dbSync.timer) clearTimeout(dbSync.timer);
    dbSync.timer=setTimeout(function(){ saveToDb(s); }, 450);
  }
  async function saveToDb(s){
    if(!s || !s.created || !canUseDb()) return;
    dbSync.saving=true;
    try{
      var resp=await _dbCall({action:"rpg_save_character",character:s},{silent:true});
      if(resp&&resp.ok!==false&&resp.character){
        dbSync.status="db";
        dbSync.lastHash=characterHash(resp.character);
        localStorage.setItem(STORE,JSON.stringify(resp.character));
      } else {
        dbSync.status="local";
      }
    }catch(e){ dbSync.status="local"; }
    dbSync.saving=false;
    renderSyncStatus();
  }
  async function loadFromDb(tid){
    if(dbSync.loaded||dbSync.loading||!canUseDb()) return;
    dbSync.loading=true;
    try{
      var resp=await _dbCall({action:"rpg_get_character"},{silent:true});
      if(resp&&resp.ok!==false&&resp.character){
        dbSync.status="db";
        dbSync.loaded=true;
        dbSync.lastHash=characterHash(resp.character);
        localStorage.setItem(STORE,JSON.stringify(resp.character));
        dbSync.loading=false;
        render(tid||"p-rpg-prototype-c");
        return;
      }
      dbSync.status="db";
      dbSync.loaded=true;
      var local=load();
      if(local&&local.created) scheduleDbSave(local);
    }catch(e){
      dbSync.status="local";
      dbSync.loaded=true;
    }
    dbSync.loading=false;
    renderSyncStatus();
  }
  function syncLabel(){
    if(!canUseDb()) return "Local";
    if(dbSync.loading) return "Chargement DB";
    if(dbSync.saving) return "Sauvegarde DB";
    return dbSync.status==="db"?"DB":"Local";
  }
  function renderSyncStatus(){
    var el=geLocal("rpg-sync-status");
    if(el) el.textContent=syncLabel();
  }
  function addLog(s,msg){ s.log.unshift(msg); s.log=s.log.slice(0,8); }
  function stats(s){
    var sd=classDef(s.oath);
    var atk=(sd.dmg||8)+Math.floor(s.level/2), def=1+Math.floor(((sd.pvN||0)+(sd.epN||0))/4)+Math.floor(s.level/2);
    Object.keys(s.equip).forEach(function(slot){ var id=s.equip[slot], it=items[id]; if(it){ atk+=it.atk||0; def+=it.def||0; }});
    return {atk:atk,def:def};
  }
  function gain(s,xp,gold){
    s.xp+=xp; s.gold+=gold;
    var need=s.level*35;
    while(s.xp>=need){
      s.xp-=need; s.level++; s.maxHp=maxPvFor(s); s.maxEnergy=maxEpFor(s); s.maxMana=maxEmFor(s); s.hp=s.maxHp; s.energy=s.maxEnergy; s.mana=s.maxMana;
      addLog(s,"Niveau "+s.level+" atteint. Progression "+s.oath+" appliquee.");
      need=s.level*35;
    }
  }
  function countInv(inv){ return Object.keys(inv).reduce(function(n,k){ return n+(inv[k]||0); },0); }
  function createCharacter(name,oath,spawn){
    var s=baseState();
    s.created=true;
    s.name=(name||"Voyageur").trim().slice(0,24)||"Voyageur";
    s.oath=normalizeClass(oath||"Duelliste");
    s.spawn=world[spawn]?spawn:"camp";
    s.loc=s.spawn;
    s.visited={};
    s.visited[s.loc]=true;
    s.maxHp=maxPvFor(s); s.maxEnergy=maxEpFor(s); s.maxMana=maxEmFor(s);
    s.hp=s.maxHp; s.energy=s.maxEnergy; s.mana=s.maxMana;
    s.gold=45; s.inv={potion:1,baies:1};
    if(s.spawn==="camp") s.inv.potion=2;
    if(s.spawn==="market") s.gold+=20;
    if(s.spawn==="harbor") s.inv.amulette=1;
    s.log=["Creation de "+s.name+" - "+s.oath+".", "Spawn choisi: "+world[s.loc].name+"."];
    localStorage.setItem("np_rpg_proto_name",s.name);
    return s;
  }
  function startPresence(){
    if(tickTimer) return;
    try{
      channel=new BroadcastChannel("np-rpg-prototype");
      channel.onmessage=function(ev){ if(ev.data&&ev.data.id!==clientId){ presence[ev.data.id]=ev.data; renderPresenceOnly(); } };
    }catch(e){}
    tickTimer=setInterval(publishPresence,2500);
    publishPresence();
    window.addEventListener("beforeunload",function(){ try{ if(channel) channel.postMessage({id:clientId,left:true}); }catch(e){} });
  }
  function publishPresence(){
    var s=load();
    var payload={id:clientId,name:s.name,loc:s.loc,level:s.level,at:Date.now()};
    presence[clientId]=payload;
    try{ localStorage.setItem(PRESENCE,JSON.stringify(payload)); }catch(e){}
    try{ if(channel) channel.postMessage(payload); }catch(e){}
  }
  function localPlayers(s){
    var now=Date.now();
    var live=Object.keys(presence).map(function(k){ return presence[k]; }).filter(function(p){ return p&&!p.left&&p.loc===s.loc&&now-(p.at||0)<9000&&p.id!==clientId; });
    var fakes=fakePlayers.filter(function(p){ return p.loc===s.loc; });
    return live.concat(fakes);
  }
  function renderPresenceOnly(){
    var el=geLocal("rpg-presence");
    if(el) el.innerHTML=presenceHtml(load());
  }
  function presenceHtml(s){
    var ps=localPlayers(s);
    if(!ps.length) return '<div class="rpg-empty">Personne en vue pour le moment.</div>';
    return ps.map(function(p){ return '<div class="rpg-player"><b>'+h(p.name)+'</b><span>Niv. '+h(p.level)+'</span></div>'; }).join("");
  }
  function render(tid){
    startPresence();
    var s=load();
    var c=geLocal(tid); if(!c) return;
    if(canUseDb()&&!dbSync.loaded&&!dbSync.loading) loadFromDb(tid);
    if(!s.created){
      c.innerHTML=creationHtml(s);
      renderSyncStatus();
      return;
    }
    var loc=world[s.loc], st=stats(s), need=s.level*35, sd=classDef(s.oath);
    publishPresence();
    c.innerHTML='' +
      '<div class="rpg-shell">' +
        '<div class="rpg-hero"><div><div class="rpg-kicker">Vertical slice jouable</div><h2>Nuages Polaires RPG</h2><p>Carte, choix de lieu, combat tour par tour, economie, stuff, progression et presence locale.</p><div class="rpg-tags"><span id="rpg-sync-status">'+h(syncLabel())+'</span></div></div><button class="btn btn-sm btn-red" onclick="rpgResetPrototype()"><span>Reset</span></button></div>' +
        '<div class="rpg-hud">' +
          hud("Perso",s.name+" Niv. "+s.level)+hud("Classe",s.oath)+hud("PV",s.hp+"/"+s.maxHp)+hud("EP",s.energy+"/"+s.maxEnergy)+hud("EM",s.mana+"/"+s.maxMana)+hud("XP",s.xp+"/"+need) +
        '</div>' +
        '<div class="rpg-grid">' +
          '<section class="rpg-panel rpg-map-panel"><div class="rpg-title">Carte persistante</div>'+mapHtml(s)+'</section>' +
          '<section class="rpg-panel"><div class="rpg-title">'+h(loc.name)+'</div><p class="rpg-desc">'+h(loc.desc)+'</p><div class="rpg-tags"><span>'+h(loc.kind)+'</span><span>'+h(sd.arme||"Arme du serment")+'</span><span>Dmg '+h(sd.dmg||st.atk)+'</span><span>ATQ '+st.atk+'</span><span>DEF '+st.def+'</span><span>Or '+h(s.gold)+'</span></div>'+actionsHtml(s,loc)+'</section>' +
          '<section class="rpg-panel"><div class="rpg-title">Choix de lieu</div>'+choicesHtml(s,loc)+'</section>' +
          '<section class="rpg-panel"><div class="rpg-title">Combat</div>'+combatHtml(s)+'</section>' +
          '<section class="rpg-panel"><div class="rpg-title">Personnage</div>'+characterHtml(s)+'</section>' +
          '<section class="rpg-panel"><div class="rpg-title">Objectifs MVP</div>'+questHtml(s)+'</section>' +
          '<section class="rpg-panel"><div class="rpg-title">Inventaire & stuff</div>'+inventoryHtml(s)+'</section>' +
          '<section class="rpg-panel"><div class="rpg-title">Boutique</div>'+shopHtml(s,loc)+'</section>' +
          '<section class="rpg-panel"><div class="rpg-title">Joueurs ici</div><div id="rpg-presence">'+presenceHtml(s)+'</div></section>' +
        '</div>' +
        '<section class="rpg-panel"><div class="rpg-title">Journal</div><div class="rpg-log">'+s.log.map(function(x){return '<div>'+h(x)+'</div>';}).join("")+'</div></section>' +
      '</div>';
    renderSyncStatus();
  }
  function creationHtml(s){
    var classNames=starterClasses();
    var selectedClass=normalizeClass(s.oath||classNames[0]||"Duelliste");
    var classCards=classNames.map(function(name){
      var d=classDef(name);
      return '<button class="rpg-oath '+(selectedClass===name?'is-active':'')+'" data-rpg-create-class="'+h(name)+'" onclick="rpgSelectCreateClass(\''+h(name).replace(/'/g,"&#x27;")+'\')"><b>'+h(name)+' - '+h(d.type||"Serment")+'</b><span>'+h(d.arme||"Arme du serment")+' | PV +'+h(d.pvN||0)+' / EP +'+h(d.epN||0)+' / EM +'+h(d.emN||0)+' / DMG '+h(d.dmg||0)+'</span></button>';
    }).join("");
    var spawn=(world[s.spawn]?s.spawn:"camp");
    var spawnCards=starterSpawns.map(function(sp){
      return '<button class="rpg-spawn '+(spawn===sp.id?'is-active':'')+'" data-rpg-create-spawn="'+h(sp.id)+'" onclick="rpgSelectCreateSpawn(\''+h(sp.id)+'\')"><b>'+h(sp.label)+' - '+h(sp.tag)+'</b><span>'+h(world[sp.id].desc)+' '+h(sp.bonus)+'.</span></button>';
    }).join("");
    return '<div class="rpg-shell rpg-create">'
      +'<div class="rpg-hero"><div><div class="rpg-kicker">Creation de personnage</div><h2>Choisis ton depart</h2><p>Le joueur arrive sur Nuages Polaires, cree son personnage, choisit son Serment et son spawn de base, puis part sur la carte pour gagner XP, or, equipement et reputation.</p></div><div class="rpg-tags"><span id="rpg-sync-status">'+h(syncLabel())+'</span></div></div>'
      +'<div class="rpg-create-grid">'
        +'<section class="rpg-panel"><div class="rpg-title">Identite</div><div class="rpg-create-name"><label>Nom du personnage</label><input id="rpg-create-name" value="'+h(s.name||"")+'" maxlength="24" placeholder="Nom du personnage"></div><div class="rpg-tags"><span>Progression: niveau, XP, or</span><span>Jauges: PV / EP / EM</span></div></section>'
        +'<section class="rpg-panel"><div class="rpg-title">Serment / classe</div><div id="rpg-create-class" data-value="'+h(selectedClass)+'" class="rpg-oaths">'+classCards+'</div></section>'
        +'<section class="rpg-panel"><div class="rpg-title">Spawn de base</div><div id="rpg-create-spawn" data-value="'+h(spawn)+'" class="rpg-spawns">'+spawnCards+'</div></section>'
        +'<section class="rpg-panel"><div class="rpg-title">Depart aventure</div><p class="rpg-desc">Une fois cree, le personnage apparait au spawn choisi. Les autres lieux restent accessibles par deplacement, avec combats, choix de lieu, boutique et joueurs presents localement.</p><div class="rpg-actions"><button class="btn btn-sm btn-grn" onclick="rpgCreateCharacter()"><span>Creer et partir</span></button></div></section>'
      +'</div>'
    +'</div>';
  }
  function hud(k,v){ return '<div class="rpg-hud-card"><span>'+h(k)+'</span><b>'+h(v)+'</b></div>'; }
  function mapHtml(s){
    var out='<div class="rpg-map">';
    out+='<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M6 70 C20 54 22 34 42 30 S67 7 88 25 C75 40 85 62 64 74 S27 86 6 70Z"/><path d="M18 58 C32 46 46 54 60 38 S78 34 86 20" class="rpg-route"/><path d="M30 55 L46 68 L58 42 L77 36 L43 24 L18 30" class="rpg-route"/></svg>';
    Object.keys(world).forEach(function(id){
      var l=world[id], here=id===s.loc, reachable=world[s.loc].links.indexOf(id)>=0;
      out+='<button class="rpg-node '+(here?'here ':'')+(reachable?'reachable':'')+'" style="left:'+l.x+'%;top:'+l.y+'%;" onclick="rpgMove(\''+id+'\')" title="'+h(l.name)+'"><span></span><b>'+h(l.name)+'</b></button>';
    });
    return out+'</div>';
  }
  function actionsHtml(s,loc){
    var links=loc.links.map(function(id){ return '<button class="btn btn-sm" onclick="rpgMove(\''+id+'\')"><span>Aller: '+h(world[id].name)+'</span></button>'; }).join("");
    return '<div class="rpg-actions">'+links+'<button class="btn btn-sm btn-red" onclick="rpgExplore()"><span>Explorer / combattre</span></button><button class="btn btn-sm btn-grn" onclick="rpgRest()"><span>Se reposer</span></button></div>';
  }
  function choicesHtml(s,loc){
    return '<p class="rpg-desc">Chaque lieu propose des choix immediats, pas des missions hors-ecran.</p><div class="rpg-actions">'
      +'<button class="btn btn-sm" onclick="rpgChoice(\'search\')"><span>Fouiller</span></button>'
      +'<button class="btn btn-sm" onclick="rpgChoice(\'talk\')"><span>Parler</span></button>'
      +'<button class="btn btn-sm" onclick="rpgChoice(\'scout\')"><span>Observer</span></button>'
      +'</div><div class="rpg-tags"><span>Lieu: '+h(loc.kind)+'</span><span>Reputation '+h(s.reputation)+'</span></div>';
  }
  function combatHtml(s){
    if(!s.combat) return '<div class="rpg-empty">Aucun combat. Explore un lieu pour provoquer une rencontre.</div>';
    var e=s.combat.enemy;
    return '<div class="rpg-fight"><div><b>'+h(e.name)+'</b><span>PV '+e.hp+'/'+e.maxHp+'</span></div><div class="rpg-actions"><button class="btn btn-sm btn-red" onclick="rpgAttack()"><span>Attaquer</span></button><button class="btn btn-sm" onclick="rpgUse(\'potion\')"><span>Potion</span></button><button class="btn btn-sm" onclick="rpgFlee()"><span>Fuir</span></button></div></div>';
  }
  function inventoryHtml(s){
    var equipped=Object.keys(s.equip).map(function(slot){ var id=s.equip[slot]; return '<div class="rpg-slot"><span>'+h(slot)+'</span><b>'+(id?h(items[id].name):"Vide")+'</b></div>'; }).join("");
    var inv=Object.keys(s.inv).filter(function(id){return s.inv[id]>0;}).map(function(id){
      var it=items[id], action=it.slot?'rpgEquip(\''+id+'\')':'rpgUse(\''+id+'\')';
      return '<div class="rpg-item"><div><b>'+h(it.name)+' x'+s.inv[id]+'</b><span>'+h(it.desc)+'</span></div><button class="btn btn-sm" onclick="'+action+'"><span>'+(it.slot?'Equiper':'Utiliser')+'</span></button></div>';
    }).join("")||'<div class="rpg-empty">Sac vide.</div>';
    return '<div class="rpg-slots">'+equipped+'</div><div class="rpg-items">'+inv+'</div>';
  }
  function characterHtml(s){
    var oathHtml=starterClasses().map(function(name){
      var d=classDef(name);
      return '<button class="rpg-oath '+(s.oath===name?'is-active':'')+'" onclick="rpgSetOath(\''+h(name).replace(/'/g,"&#x27;")+'\')"><b>'+h(name)+' - '+h(d.type||"Serment")+'</b><span>'+h(d.arme||"Arme du serment")+' | PV +'+h(d.pvN||0)+' / EP +'+h(d.epN||0)+' / EM +'+h(d.emN||0)+' / DMG '+h(d.dmg||0)+'</span></button>';
    }).join("");
    return '<div class="rpg-form"><input id="rpg-name-input" value="'+h(s.name)+'" maxlength="24" placeholder="Nom du personnage"><button class="btn btn-sm" onclick="rpgSaveIdentity()"><span>Renommer</span></button></div><div class="rpg-oaths">'+oathHtml+'</div>';
  }
  function questHtml(s){
    var steps=[
      ["firstMove","Quitter le camp"],
      ["firstWin","Gagner un combat"],
      ["firstEquip","Equiper un objet"],
      ["ruins","Atteindre les Ruines de Nacre"]
    ];
    var done=steps.filter(function(x){ return s.flags[x[0]]; }).length;
    var html='<div class="rpg-tags"><span>'+done+'/'+steps.length+' complete</span><span>Recompense: 40 or + potion</span></div><div class="rpg-quest">';
    html+=steps.map(function(x){ var ok=!!s.flags[x[0]]; return '<div class="rpg-step '+(ok?'done':'')+'"><i>'+(ok?'ok':'')+'</i><span>'+h(x[1])+'</span></div>'; }).join("");
    html+='</div>';
    if(done===steps.length && !s.flags.questClaimed) html+='<div class="rpg-actions"><button class="btn btn-sm btn-gold" onclick="rpgClaimQuest()"><span>Reclamer</span></button></div>';
    if(s.flags.questClaimed) html+='<p class="rpg-desc">Objectif valide. La prochaine etape pourra brancher ces objectifs cote serveur.</p>';
    return html;
  }
  function shopHtml(s,loc){
    if(!loc.shop) return '<div class="rpg-empty">Pas de marchand dans cette zone.</div>';
    return ["potion","baies","acier","manteau","amulette"].map(function(id){
      var it=items[id];
      return '<div class="rpg-item"><div><b>'+h(it.name)+'</b><span>'+h(it.price)+' or - '+h(it.desc)+'</span></div><button class="btn btn-sm btn-gold" onclick="rpgBuy(\''+id+'\')"><span>Acheter</span></button></div>';
    }).join("");
  }
  window.renderRpgPrototype=render;
  window.openRpgPrototype=function(){
    try{
      document.querySelectorAll(".screen").forEach(function(el){ el.classList.remove("active","screen-enter"); });
      var app=document.getElementById("s-app");
      if(app) app.classList.add("active","screen-enter");
    }catch(e){}
    try{ if(typeof switchTab==="function") switchTab("rpg-prototype",null); }catch(e){ render("p-rpg-prototype-c"); }
  };
  window.addEventListener("load",function(){
    if(window.location.hash==="#rpg-prototype") setTimeout(function(){ window.openRpgPrototype(); },80);
  });
  window.rpgMove=function(id){ var s=load(); if(id!==s.loc&&world[s.loc].links.indexOf(id)<0) return; s.loc=id; s.combat=null; s.energy=Math.max(0,s.energy-1); s.visited[id]=true; if(id!=="camp") s.flags.firstMove=true; if(id==="ruins") s.flags.ruins=true; addLog(s,"Deplacement vers "+world[id].name+"."); save(s); render("p-rpg-prototype-c"); };
  window.rpgExplore=function(){ var s=load(), loc=world[s.loc]; if(s.combat) return; if(s.energy<=0){ addLog(s,"EP insuffisante pour explorer."); save(s); render("p-rpg-prototype-c"); return; } var key=loc.enemies[Math.floor(Math.random()*loc.enemies.length)], e=Object.assign({},enemies[key]); e.id=key; e.maxHp=e.hp; s.energy=Math.max(0,s.energy-6); s.combat={enemy:e}; addLog(s,"Rencontre: "+e.name+"."); save(s); render("p-rpg-prototype-c"); };
  window.rpgAttack=function(){ var s=load(); if(!s.combat) return; var st=stats(s), e=s.combat.enemy; e.hp-=Math.max(1,st.atk-Math.floor(e.def/2)+Math.floor(Math.random()*5)); if(e.hp<=0){ var def=enemies[e.id]; gain(s,def.xp,def.gold); s.inv[def.drop]=(s.inv[def.drop]||0)+1; s.flags.firstWin=true; addLog(s,"Victoire contre "+e.name+" : +"+def.xp+" XP, +"+def.gold+" or, butin "+items[def.drop].name+"."); s.combat=null; } else { s.hp-=Math.max(1,e.atk-Math.floor(st.def/2)+Math.floor(Math.random()*4)); addLog(s,e.name+" riposte."); if(s.hp<=0){ s.hp=Math.ceil(s.maxHp/2); s.gold=Math.max(0,s.gold-12); s.combat=null; s.loc="camp"; addLog(s,"Defaite. Retour au camp, or perdu."); } } save(s); render("p-rpg-prototype-c"); };
  window.rpgUse=function(id){ var s=load(), it=items[id]; if(!it||!s.inv[id]) return; if(it.heal){ s.hp=Math.min(s.maxHp,s.hp+it.heal); s.inv[id]--; addLog(s,"Utilise "+it.name+"."); } save(s); render("p-rpg-prototype-c"); };
  window.rpgEquip=function(id){ var s=load(), it=items[id]; if(!it||!it.slot||!s.inv[id]) return; var old=s.equip[it.slot]; if(old) s.inv[old]=(s.inv[old]||0)+1; s.equip[it.slot]=id; s.inv[id]--; s.flags.firstEquip=true; addLog(s,"Equipe "+it.name+"."); save(s); render("p-rpg-prototype-c"); };
  window.rpgBuy=function(id){ var s=load(), it=items[id]; if(!it||s.gold<it.price) { addLog(s,"Pas assez d'or."); save(s); render("p-rpg-prototype-c"); return; } s.gold-=it.price; s.inv[id]=(s.inv[id]||0)+1; addLog(s,"Achat: "+it.name+"."); save(s); render("p-rpg-prototype-c"); };
  window.rpgRest=function(){ var s=load(); s.hp=s.maxHp; s.energy=s.maxEnergy; s.mana=s.maxMana; s.combat=null; addLog(s,"Repos complet: PV, EP et EM recuperes."); save(s); render("p-rpg-prototype-c"); };
  window.rpgFlee=function(){ var s=load(); s.combat=null; s.energy=Math.max(0,s.energy-6); addLog(s,"Fuite prudente: EP depensee."); save(s); render("p-rpg-prototype-c"); };
  window.rpgChoice=function(kind){
    var s=load(), loc=world[s.loc];
    if(s.combat){ addLog(s,"Impossible pendant un combat."); save(s); render("p-rpg-prototype-c"); return; }
    if(kind==="search"){
      if(s.energy<=0){ addLog(s,"EP insuffisante pour fouiller."); save(s); render("p-rpg-prototype-c"); return; }
      s.energy=Math.max(0,s.energy-4);
      if(Math.random()<0.62){ var found=loc.shop?"potion":"baies"; s.inv[found]=(s.inv[found]||0)+1; addLog(s,"Fouille utile: "+items[found].name+" trouve."); }
      else { s.gold+=8; addLog(s,"Fouille prudente: 8 or recuperes."); }
    }
    if(kind==="talk"){
      s.reputation++;
      if(s.reputation%3===0){ s.gold+=12; addLog(s,"Un local te donne une piste et 12 or."); }
      else addLog(s,"Discussion locale: reputation +1.");
    }
    if(kind==="scout"){
      if(s.energy<=0){ addLog(s,"EP insuffisante pour observer."); save(s); render("p-rpg-prototype-c"); return; }
      s.energy=Math.max(0,s.energy-3);
      var next=loc.links[Math.floor(Math.random()*loc.links.length)];
      addLog(s,"Observation: route sure vers "+world[next].name+".");
    }
    save(s); render("p-rpg-prototype-c");
  };
  window.rpgSaveIdentity=function(){
    var input=geLocal("rpg-name-input");
    var name=input?String(input.value||"").trim().slice(0,24):"";
    if(!name) name="Voyageur";
    localStorage.setItem("np_rpg_proto_name",name);
    var s=load(); s.name=name; addLog(s,"Identite mise a jour: "+name+"."); save(s); render("p-rpg-prototype-c");
  };
  window.rpgSelectCreateClass=function(id){
    id=normalizeClass(id);
    var root=geLocal("rpg-create-class");
    if(root) root.dataset.value=id;
    document.querySelectorAll("[data-rpg-create-class]").forEach(function(btn){
      btn.classList.toggle("is-active", btn.getAttribute("data-rpg-create-class")===id);
    });
  };
  window.rpgSelectCreateSpawn=function(id){
    if(!world[id]) id="camp";
    var root=geLocal("rpg-create-spawn");
    if(root) root.dataset.value=id;
    document.querySelectorAll("[data-rpg-create-spawn]").forEach(function(btn){
      btn.classList.toggle("is-active", btn.getAttribute("data-rpg-create-spawn")===id);
    });
  };
  window.rpgCreateCharacter=function(){
    var nameEl=geLocal("rpg-create-name");
    var classRoot=geLocal("rpg-create-class");
    var spawnRoot=geLocal("rpg-create-spawn");
    var s=createCharacter(nameEl?nameEl.value:"", classRoot?classRoot.dataset.value:"Duelliste", spawnRoot?spawnRoot.dataset.value:"camp");
    save(s);
    render("p-rpg-prototype-c");
  };
  window.rpgSetOath=function(id){
    id=normalizeClass(id);
    if(!classDef(id)) return;
    var s=load(), next=classDef(id);
    var hpRatio=s.maxHp?Math.max(.15,s.hp/s.maxHp):1;
    var epRatio=s.maxEnergy?Math.max(0,s.energy/s.maxEnergy):1;
    var emRatio=s.maxMana?Math.max(0,s.mana/s.maxMana):1;
    s.oath=id;
    s.maxHp=maxPvFor(s);
    s.maxEnergy=maxEpFor(s);
    s.maxMana=maxEmFor(s);
    s.hp=Math.max(1,Math.round(s.maxHp*hpRatio));
    s.energy=Math.round(s.maxEnergy*epRatio);
    s.mana=Math.round(s.maxMana*emRatio);
    addLog(s,"Classe choisie: "+id+" - "+(next.arme||"Arme du serment")+".");
    save(s); render("p-rpg-prototype-c");
  };
  window.rpgClaimQuest=function(){
    var s=load();
    if(!(s.flags.firstMove&&s.flags.firstWin&&s.flags.firstEquip&&s.flags.ruins)||s.flags.questClaimed) return;
    s.flags.questClaimed=true; s.gold+=40; s.inv.potion=(s.inv.potion||0)+1;
    addLog(s,"Objectif MVP valide: +40 or et une potion.");
    save(s); render("p-rpg-prototype-c");
  };
  window.rpgResetPrototype=function(){
    localStorage.removeItem(STORE);
    dbSync.loaded=true;
    dbSync.loading=false;
    dbSync.saving=false;
    dbSync.status=canUseDb()?"db":"local";
    render("p-rpg-prototype-c");
  };
})();
