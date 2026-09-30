'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.resolve(__dirname, '../assets/js/main.js'), 'utf8');
const clone = value => JSON.parse(JSON.stringify(value));
function section(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, 'Production boundaries must exist');
  return source.slice(from, to);
}
const code = [
  section('function _dbSessionChangedError(){', 'async function _jsonPost('),
  section('function _dbWriteFailure(key, response){', 'function _deleteDbKey('),
  section('function getEvents(){', 'async function _setOwnEventParticipation(')
].join('\n');
const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture(role = 'mj') {
  const requests = [], notices = [], logs = [], fields = new Map(), renders = [];
  function element() { return { value:'', checked:false, textContent:'', innerHTML:'', disabled:false, style:{}, setAttribute(){}, removeAttribute(){}, focus(){} }; }
  const event = { id:'quest', nom:'Expédition', date:Date.now()+86400000, max:4, inscrits:['Alice','Bob'], type:'exploration', desc:'Ancienne description', createdBy:'Auteur', extra:{kept:true}, hidden:false };
  const context = {
    Date, Math, Promise, setTimeout: callback => callback(), CU:{ role, name:'Staff', pseudo:'Staff' },
    _dbToken:true, _dbOffline:false, _dbSessionGeneration:1,
    _dbVersions:{events:'e1',players:'p1'}, _dbCache:{events:[event], players:[{id:'alice',name:'Alice',history:[]}]}, _DB_WRITE_QUEUE:{},
    _cloneForDb:clone, _normalizeDbValueForKey:(key,value)=>clone(value),
    _reportDbWriteError(){}, _reportDbWriteSuccess(){},
    roleKey:user=>user.role.toLowerCase(), sto:key=>context._dbCache[key], gp:()=>context._dbCache.players,
    gpid:()=>null, _ownPlayerActionBusy:()=>false,
    document:{querySelectorAll:()=>Array.from(fields.values())},
    ge(id){ if(!fields.has(id)) fields.set(id,element()); return fields.get(id); },
    _dbCall:payload=>new Promise(resolve=>requests.push({payload:clone(payload),resolve})),
    notif:(message,type)=>notices.push({message,type}), sysLog:(...args)=>logs.push(args),
    confirm:()=>true, openModal:id=>renders.push(['open',id]), closeModal:id=>renders.push(['close',id]),
    escHtml:value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'), escAttr:String, jsesc:String,
    EV_TYPES:{autre:{icon:'.',col:'#666',label:'Autre'}}
  };
  context.window=context;
  vm.createContext(context); vm.runInContext(code,context);
  context.renderEvents=id=>renders.push(['events',id]);
  return {context,requests,notices,logs,fields,renders,event,
    open(id='quest'){context.openEventModal(id);},
    respond(index,value){ const request=requests[index]; request.resolve({ok:true,key:request.payload.key,value:clone(value===undefined?request.payload.value:value),version:request.payload.key+'2'}); },
    fail(index,status=503,code){ requests[index].resolve({ok:false,status,code,error:'Échec simulé'}); },
    changeSession(){ context._dbSessionGeneration++; context.CU={role:'joueur',name:'Bob'}; context._dbCache={events:[],players:[{id:'bob',name:'Bob',history:[]}]}; context._dbVersions={};context._DB_WRITE_QUEUE={}; }
  };
}

for (const role of ['admin','mj','designer']) {
  test(role+' edits capacity without losing participants, author or metadata; confirmation and double clicks are handled', async()=>{
    const f=fixture(role);f.open();
    assert.equal(f.context.ge('ev-max').value,4);
    f.context.ge('ev-nom').value='Nouvelle expédition';f.context.ge('ev-max').value='3';
    const pending=f.context.saveEvent();
    assert.equal(await f.context.saveEvent(),false); await tick();
    assert.equal(f.requests.length,1);assert.equal(f.context.getEvents()[0].nom,'Expédition');
    assert.equal(f.context.ge('ev-nom').disabled,true);assert.equal(f.logs.length,0);
    assert.equal(f.requests[0].payload.expectedVersion,'e1');
    f.respond(0);assert.equal(await pending,true);
    const saved=f.context.getEvents()[0];
    assert.equal(saved.nom,'Nouvelle expédition'); assert.equal(saved.max,3);assert.equal(saved.createdBy,'Auteur');
    assert.deepEqual(clone(saved.inscrits),['Alice','Bob']); assert.deepEqual(clone(saved.extra),{kept:true});
    assert.equal(f.context.ge('ev-nom').disabled,false);assert.equal(f.notices.filter(n=>n.type==='ok').length,1);
  });
}

test('Players and unknown roles cannot open the editor or mutate staff events',async()=>{
  for(const role of ['joueur','inconnu']){
    const f=fixture(role); assert.equal(f.context.openEventModal('quest'),false);
    assert.equal(await f.context.saveEvent(),false);assert.equal(await f.context.toggleEventHidden('quest'),false);assert.equal(await f.context.deleteEvent('quest'),false);
    assert.equal(f.requests.length,0);
  }
});

test('Invalid capacities and capacity below current attendance keep the draft without writes',async()=>{
  const f=fixture();f.open();
  for(const value of ['1','-1','1.5','Infinity','NaN']){
    f.context.ge('ev-max').value=value;assert.equal(await f.context.saveEvent(),false);
  }
  assert.equal(f.requests.length,0);assert.equal(f.context.ge('ev-nom').value,'Expédition');
  f.context.ge('ev-max').value='0';const pending=f.context.saveEvent();await tick();f.respond(0);assert.equal(await pending,true);
});

test('A designer creates a published event without attempting a players write',async()=>{
  const f=fixture('designer');f.open(null);f.context.ge('ev-nom').value='Rencontre';
  assert.equal(f.context.ge('ev-notify-row').style.display,'none');
  f.context.ge('ev-notify').checked=true; // Permission is checked again when saving.
  const pending=f.context.saveEvent();await tick();f.respond(0);assert.equal(await pending,true);
  assert.equal(f.requests.length,1);assert.equal(f.requests[0].payload.key,'events');
  assert.doesNotMatch(f.notices.at(-1).message,/notifiés/);
});

test('A newly published event notifies once, after event confirmation, with escaped history text',async()=>{
  const f=fixture();f.open(null);f.context.ge('ev-nom').value='<img src=x onerror=alert(1)> Festival';
  const pending=f.context.saveEvent(); await tick(); assert.equal(f.requests.length,1);
  f.respond(0);await tick();assert.equal(f.requests.length,2);assert.equal(f.requests[1].payload.key,'players');
  assert.equal(f.context.gp()[0].history.length,0);assert.equal(f.notices.length,0);
  assert.match(f.requests[1].payload.value[0].history[0].text,/&lt;img/);
  f.respond(1);assert.equal(await pending,true);assert.equal(f.context.gp()[0].history.length,1);
  assert.match(f.notices.at(-1).message,/Joueurs notifiés/);
});

test('Failed notifications report partial success and leave confirmed event plus original histories intact',async()=>{
  const f=fixture();f.open(null);f.context.ge('ev-nom').value='Rencontre';
  const pending=f.context.saveEvent();await tick();f.respond(0);await tick();f.fail(1);
  assert.equal(await pending,true);assert.equal(f.context.getEvents().length,2);assert.equal(f.context.gp()[0].history.length,0);
  assert.equal(f.notices.some(n=>n.type==='ok'),false);assert.match(f.notices.at(-1).message,/Événement enregistré.*notifications n’ont pas été confirmées/);
  assert.equal(f.logs.some(entry=>entry[0]==='event_notif'),false);
});

for(const action of ['save','hide','delete']){
  test('Failed '+action+' leaves the cache and draft intact with no success or premature log',async()=>{
    const f=fixture();f.open();const before=clone(f.context._dbCache);
    f.context.ge('ev-nom').value='Mon brouillon';
    const pending=action==='save'?f.context.saveEvent():action==='hide'?f.context.toggleEventHidden('quest'):f.context.deleteEvent('quest');
    await tick();f.fail(0,409,'VERSION_CONFLICT');assert.equal(await pending,false);
    assert.deepEqual(clone(f.context._dbCache),before);assert.equal(f.context.ge('ev-nom').value,'Mon brouillon');
    assert.equal(f.logs.length,0);assert.equal(f.renders.some(r=>r[0]==='close'),false);
    assert.equal(f.notices.some(n=>n.type==='ok'||n.type==='inf'),false);
    assert.equal(await f.context.toggleEventHidden('quest'),false);assert.equal(f.requests.length,1,'Conflicted collection stays blocked until refresh');
  });
  test('A late '+action+' response cannot change another session, close its modal or emit success',async()=>{
    const f=fixture();f.open();
    const pending=action==='save'?f.context.saveEvent():action==='hide'?f.context.toggleEventHidden('quest'):f.context.deleteEvent('quest');
    await tick();f.changeSession();f.respond(0);assert.equal(await pending,false);
    assert.deepEqual(clone(f.context._dbCache.events),[]);assert.equal(f.context._dbCache.players[0].id,'bob');
    assert.equal(f.notices.length,0);assert.equal(f.logs.length,0);assert.equal(f.renders.some(r=>r[0]==='close'),false);
  });
}

test('A session change while notifications are pending cannot touch the next player cache or UI',async()=>{
  const f=fixture();f.open(null);f.context.ge('ev-nom').value='Rencontre';
  const pending=f.context.saveEvent();await tick();f.respond(0);await tick();f.changeSession();f.respond(1);
  assert.equal(await pending,false);assert.equal(f.context._dbCache.players[0].id,'bob');assert.equal(f.notices.length,0);
  assert.equal(f.logs.some(entry=>entry[0]==='event_notif'),false);assert.equal(f.renders.some(r=>r[0]==='close'),false);
});

test('A new staff session can reopen the shared editor while an old write finishes silently',async()=>{
  const f=fixture();f.open();const pending=f.context.saveEvent();await tick();
  assert.equal(f.context.ge('ev-nom').disabled,true);
  f.changeSession();f.context.CU={role:'designer',name:'Autre staff'};
  assert.equal(f.context.openEventModal(),true);assert.equal(f.context.ge('ev-nom').disabled,false);
  f.context.ge('ev-nom').value='Nouveau brouillon';f.respond(0);assert.equal(await pending,false);
  assert.equal(f.context.ge('ev-nom').value,'Nouveau brouillon');assert.equal(f.context.ge('ev-nom').disabled,false);assert.equal(f.notices.length,0);
});
