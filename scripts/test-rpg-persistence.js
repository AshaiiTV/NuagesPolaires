'use strict';
const assert = require('node:assert/strict');
const { test, before, after, beforeEach } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createLocalApp } = require('./helpers/local-app');
let app;
before(async () => { app = await createLocalApp(); });
after(async () => { if (app) await app.close(); });
beforeEach(async () => { await app.seed('accounts', app.accounts); await app.seed('rpg_characters', []); });
const character = name => ({ created:true, name, loc:'camp', level:1, gold:45, hp:30, maxHp:30, inv:{potion:2}, equip:{weapon:null,armor:null,trinket:null}, log:['Départ'], sourcePlayerId:'p_alice', result:{title:'Victoire',text:'Brouillon'} });
const get = async id => app.call('db', {action:'rpg_get_character'}, await app.cookie(id));
const save = async (id, state, version) => app.call('db', {action:'rpg_save_character',character:state,expectedVersion:version}, await app.cookie(id));

test('RPG reads require a session and never expose another owner through generic stores', async () => {
  await app.seed('rpg_characters',[{...character('Secret Bob'), ownerId:'bob'}]);
  assert.equal((await app.call('db',{action:'rpg_get_character'})).status,401);
  const own = await get('alice');assert.equal(own.status,200);assert.equal(own.data.character,null);assert.equal(own.data.version,null);
  for (const action of ['get','set','delete']) {
    const response=await app.call('db',{action,key:'rpg_characters',value:[],expectedVersion:(await app.read('rpg_characters')).version},await app.cookie('alice'));
    assert.ok(response.status>=400);
  }
  assert.equal((await app.read('rpg_characters')).value[0].name,'Secret Bob');
});

test('RPG save validates revision and payload, enforces ownership, and returns persistent source/result fields', async () => {
  const session=await app.cookie('alice');
  assert.equal((await app.call('db',{action:'rpg_save_character',character:character('Alice')},session)).status,428);
  assert.equal((await app.call('db',{action:'rpg_save_character',character:[],expectedVersion:null},session)).status,400);
  const response=await save('alice',{...character('<b>Alice</b>'),id:'bob-record',ownerId:'bob',ownerPid:'p_bob',ownerPseudo:'Bob',level:900,gold:-2},null);
  assert.equal(response.status,200);assert.match(response.data.version,/^[a-f0-9]{32}$/);
  assert.equal(response.data.character.ownerId,'alice');assert.equal(response.data.character.ownerPid,'p_alice');assert.equal(response.data.character.id,'rpg_alice');
  assert.equal(response.data.character.level,100);assert.equal(response.data.character.gold,0);
  const loaded=await get('alice');assert.deepEqual(loaded.data,response.data);assert.equal(loaded.data.character.sourcePlayerId,'p_alice');assert.equal(loaded.data.character.result.title,'Victoire');
});

test('Two owners can save from their own unchanged revisions without losing either character', async () => {
  const answers=await Promise.all([save('alice',character('Alice'),null),save('bob',character('Bob'),null)]);
  assert.deepEqual(answers.map(response=>response.status),[200,200]);
  const [alice,bob]=await Promise.all([get('alice'),get('bob')]);
  const legacy=(await app.read('rpg_characters')).value;legacy.find(record=>record.ownerId==='bob').legacy={untouched:['unknown',42]};await app.seed('rpg_characters',legacy);
  const nextAlice=await save('alice',{...alice.data.character,gold:80},alice.data.version);assert.equal(nextAlice.status,200);
  assert.deepEqual((await app.read('rpg_characters')).value.find(record=>record.ownerId==='bob').legacy,{untouched:['unknown',42]});
  // A real independent character edit changes only that owner's revision.
  const currentBob=await get('bob');const nextBob=await save('bob',{...currentBob.data.character,gold:90},currentBob.data.version);assert.equal(nextBob.status,200);
  const records=(await app.read('rpg_characters')).value;assert.equal(records.find(r=>r.ownerId==='alice').gold,80);assert.equal(records.find(r=>r.ownerId==='bob').gold,90);
  assert.notEqual(bob.data.version,currentBob.data.version);
});

test('Two sessions editing the same character reject the stale save and preserve the winning state', async () => {
  const first=await save('alice',character('Alice'),null);
  const answers=await Promise.all([save('alice',{...first.data.character,gold:70},first.data.version),save('alice',{...first.data.character,gold:99},first.data.version)]);
  assert.deepEqual(answers.map(r=>r.status).sort(),[200,409]);
  const winner=answers.find(r=>r.status===200);assert.equal((await get('alice')).data.character.gold,winner.data.character.gold);
  assert.equal((await save('alice',character('reset stale'),null)).status,409);
});

test('Forced-reset or revoked sessions cannot access RPG data', async () => {
  const session=await app.cookie('alice');const accounts=(await app.read('accounts')).value;accounts.find(a=>a.id==='alice').sessionVersion++;await app.seed('accounts',accounts);
  assert.equal((await app.call('db',{action:'rpg_get_character'},session)).status,401);
  assert.equal((await app.call('db',{action:'rpg_save_character',character:character('Alice'),expectedVersion:null},session)).status,401);
  accounts.find(a=>a.id==='alice').forcePasswordReset=true;await app.seed('accounts',accounts);
  assert.equal((await app.call('db',{action:'rpg_get_character'},await app.cookie('alice'))).status,401);
});

const source=fs.readFileSync(path.join(__dirname,'../assets/js/rpg-prototype.js'),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function clientFixture(){
  const nodes=new Map(), requests=[], timers=new Map(), storage=new Map();let nextTimer=0;
  const node=id=>{if(!nodes.has(id))nodes.set(id,{id,innerHTML:'',textContent:'',value:'',dataset:{},classList:{add(){},remove(){},toggle(){}},appendChild(){},remove(){},click(){}});return nodes.get(id);};
  node('rpg-create-name').value='Alice';node('rpg-create-class').dataset.value='Duelliste';node('rpg-create-spawn').dataset.value='camp';
  const context={CU:{pseudo:'Alice',pid:'p_alice'},_dbSessionGeneration:1,__logoutBusy:false,console,URL,Blob,Date,Math,
    document:{getElementById:id=>id==='np-rpg-prototype-style'?null:node(id),createElement:()=>node('created'),head:{appendChild(){}},body:{appendChild(){}},querySelectorAll:()=>[]},
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
    setTimeout:(fn,delay)=>{const id=++nextTimer;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id),setInterval:()=>++nextTimer,clearInterval(){},
    addEventListener(){},confirm:()=>true,
    _dbCall:payload=>new Promise((resolve,reject)=>requests.push({payload:JSON.parse(JSON.stringify(payload)),resolve,reject}))};
  context.window=context;vm.createContext(context);vm.runInContext(source,context,{filename:'production-rpg-prototype.js'});
  function flushSave(){const entry=[...timers].find(([,timer])=>timer.delay===450);assert.ok(entry,'A debounced save must be pending');timers.delete(entry[0]);entry[1].fn();}
  async function loadAccount(value=null,version=null){context.renderRpgPrototype('p-rpg-prototype-c');const request=requests.at(-1);assert.equal(request.payload.action,'rpg_get_character');request.resolve({ok:true,character:value,version});await tick();}
  return {context,nodes,requests,timers,storage,node,flushSave,loadAccount};
}

test('RPG client waits for load and serializes saves without a late response erasing newer actions', async () => {
  const f=clientFixture();await f.loadAccount();f.context.rpgCreateCharacter();f.flushSave();const first=f.requests.at(-1);assert.equal(first.payload.expectedVersion,null);
  f.context.rpgMove('ridge');f.flushSave();assert.equal(f.requests.filter(r=>r.payload.action==='rpg_save_character').length,1);
  first.resolve({ok:true,character:{...first.payload.character,ownerId:'alice',loc:'camp'},version:'a'.repeat(32)});await tick();
  assert.match(f.node('rpg-sync-status').textContent,/non enregistrées/);f.flushSave();const second=f.requests.at(-1);
  assert.equal(second.payload.expectedVersion,'a'.repeat(32));assert.equal(second.payload.character.loc,'ridge');
  second.resolve({ok:true,character:second.payload.character,version:'b'.repeat(32)});await tick();assert.equal(f.node('rpg-sync-status').textContent,'Synchronisé');
  assert.equal(f.storage.size,0,'Authenticated RPG state must never be written to localStorage');
});

test('RPG client ignores responses after account changes and never uploads the old global local character', async () => {
  const f=clientFixture();f.storage.set('np_rpg_proto_v1',JSON.stringify({...character('Old Alice'),ownerId:'alice'}));
  f.context.renderRpgPrototype('p-rpg-prototype-c');const aliceLoad=f.requests.at(-1);
  f.context.npResetRpgSession();f.context._dbSessionGeneration++;f.context.CU={pseudo:'Bob',pid:'p_bob'};f.context.renderRpgPrototype('p-rpg-prototype-c');const bobLoad=f.requests.at(-1);
  aliceLoad.resolve({ok:true,character:{...character('Alice'),ownerId:'alice'},version:'a'.repeat(32)});await tick();assert.doesNotMatch(f.node('p-rpg-prototype-c').innerHTML,/Old Alice|Alice/);
  bobLoad.resolve({ok:true,character:null,version:null});await tick();assert.equal(f.requests.filter(r=>r.payload.action==='rpg_save_character').length,0);
  f.node('rpg-create-name').value='Bob';f.context.rpgCreateCharacter();f.flushSave();const saving=f.requests.at(-1);
  f.context.npResetRpgSession();f.context._dbSessionGeneration++;f.context.CU=null;
  saving.resolve({ok:true,character:{...saving.payload.character,name:'SECRET BOB'},version:'b'.repeat(32)});await tick();
  assert.equal(f.node('p-rpg-prototype-c').innerHTML,'');assert.ok(![...f.storage.values()].some(value=>value.includes('SECRET BOB')));
});

test('RPG load errors do not become a synchronized empty character, and conflicts retain the draft', async () => {
  const f=clientFixture();f.context.renderRpgPrototype('p-rpg-prototype-c');f.requests.at(-1).resolve({ok:false,status:503});await tick();
  assert.match(f.node('p-rpg-prototype-c').innerHTML,/Impossible de charger/);assert.equal(f.requests.length,1);
  f.context.rpgReloadCharacter();f.requests.at(-1).resolve({ok:true,character:null,version:null});await tick();f.context.rpgCreateCharacter();f.flushSave();
  f.requests.at(-1).resolve({ok:false,status:409,code:'VERSION_CONFLICT'});await tick();assert.equal(f.node('rpg-sync-status').textContent,'Brouillon non enregistré');
  assert.match(f.node('rpg-sync-feedback').innerHTML,/Télécharger le brouillon/);const count=f.requests.length;f.context.rpgMove('ridge');assert.equal(f.requests.length,count);
  assert.ok(![...f.timers.values()].some(timer=>timer.delay===450),'No automatic conflict retry');
});


test('RPG reset persists through the same versioned queue instead of only erasing a local copy', async () => {
  const f=clientFixture();await f.loadAccount({...character('Alice'),gold:999,loc:'ruins'},'a'.repeat(32));
  f.context.rpgResetPrototype();f.flushSave();const request=f.requests.at(-1);
  assert.equal(request.payload.action,'rpg_save_character');assert.equal(request.payload.expectedVersion,'a'.repeat(32));
  assert.equal(request.payload.character.gold,45);assert.equal(request.payload.character.loc,'camp');
  request.resolve({ok:true,character:request.payload.character,version:'b'.repeat(32)});await tick();
});


test('Guest saves keep their chosen identity separately from legacy authenticated data', () => {
  const f=clientFixture();f.context.CU=null;f.storage.set('np_rpg_proto_v1',JSON.stringify({...character('Private old owner'),ownerId:'alice'}));
  f.node('rpg-create-name').value='Voyageuse invitée';f.context.rpgCreateCharacter();f.context.rpgMove('ridge');
  const guest=JSON.parse(f.storage.get('np_rpg_guest_v2'));assert.equal(guest.name,'Voyageuse invitée');assert.equal(guest.loc,'ridge');
  assert.equal(JSON.parse(f.storage.get('np_rpg_proto_v1')).name,'Private old owner');assert.equal(f.requests.length,0);
});
