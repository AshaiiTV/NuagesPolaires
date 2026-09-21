'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const test=require('node:test');
const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
const source=fs.readFileSync(path.join(__dirname,'../assets/js/main.js'),'utf8');
const code=source.slice(source.indexOf('function combatArchiveOwnerKey(owner){'),source.indexOf('var _combatArchiveAdminPrimePromise'));
const arc=id=>({id,name:id,savedAt:1,fighters:[],log:['details '+id]});
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};}
function fixture(initial=[]){
 const server=new Map();let revision=0;const writes=[];let hook;
 const context={console,Date,Promise,_cs:{},CU:{pseudo:'Alice'},_dbToken:true,_dbOffline:false,_dbSessionGeneration:0,_dbVersions:{},_dbCache:{},_DB_WRITE_QUEUE:{},
  _cloneForDb:clone,_normalizeCombatArchiveRecord:clone,_normalizeDbValueForKey:(_key,v)=>clone(v),_safeFiniteNumber:(v,f)=>Number.isFinite(Number(v))?Number(v):f,
  _reportDbWriteError(){},_reportDbWriteSuccess(){},getAccounts:()=>[],
  _mergeCombatArchiveLists:(a,b)=>clone([...a,...b]),
  _assertDbSessionGeneration(g){if(g!==context._dbSessionGeneration){const e=new Error('Session changed');e.code='SESSION_CHANGED';throw e;}},
  _dbWriteFailure(key,response){const e=new Error(response&&response.error||'Conflict '+key);e.code=response&&response.code;return e;},
  sto:key=>context._dbCache[key]??null,
  async _dbCall(payload){
   if(hook)await hook(payload);
   const current=server.get(payload.key)||{value:null,version:null};
   if(payload.action==='get'){
    context._dbVersions[payload.key]=current.version;context._dbCache[payload.key]=clone(current.value);
    return {ok:true,status:200,...clone(current)};
   }
   writes.push(clone(payload));
   if(payload.expectedVersion!==current.version)return {ok:false,status:409,code:'VERSION_CONFLICT'};
   const value=clone(payload.value),version='v'+(++revision);server.set(payload.key,{value,version});return {ok:true,status:200,version};
  }
 };
 context.window=context;vm.createContext(context);vm.runInContext(code,context);
 function seed(key,value,hydrate=true){const entry={value:clone(value),version:'v'+(++revision)};server.set(key,entry);if(hydrate){context._dbCache[key]=clone(value);context._dbVersions[key]=entry.version;}return entry;}
 seed('combat_arc_Alice',initial);seed('combat_arc_idx_Alice',initial.map(a=>context.combatArchiveMetaFromRecord(a,'Alice')));
 initial.forEach(a=>seed('combat_arc_rec_Alice__'+a.id,a));
 return {context,server,writes,seed,hook(fn){hook=fn;},read:key=>clone(server.get(key)?.value),ids:()=>server.get('combat_arc_idx_Alice').value.map(a=>a.id)};
}

test('Overlapping archive saves cannot remove an archive confirmed by the preceding save',async()=>{
 const f=fixture([arc('original')]),entered=deferred(),resume=deferred();
 f.hook(async p=>{if(p.action==='set'&&p.key==='combat_arc_rec_Alice__first'){entered.resolve();await resume.promise;}});
 const first=f.context.saveCombatArchives([arc('original'),arc('first')],'Alice');await entered.promise;
 const second=f.context.saveCombatArchives([arc('original'),arc('second')],'Alice');
 const rejected=assert.rejects(second,e=>e.code==='VERSION_CONFLICT');resume.resolve();await first;await rejected;
 assert.deepEqual(f.ids().sort(),['first','original']);
 assert.equal(f.writes.some(p=>p.key==='combat_arc_rec_Alice__second'),false);
});

test('A bundle refresh while details save cannot lend a newer revision to an old index',async()=>{
 const f=fixture([arc('original')]),entered=deferred(),resume=deferred();
 f.hook(async p=>{if(p.action==='set'&&p.key==='combat_arc_rec_Alice__local'){entered.resolve();await resume.promise;}});
 const saving=f.context.saveCombatArchives([arc('original'),arc('local')],'Alice');const rejected=assert.rejects(saving,e=>e.code==='VERSION_CONFLICT');await entered.promise;
 f.seed('combat_arc_idx_Alice',[arc('original'),arc('remote')].map(a=>f.context.combatArchiveMetaFromRecord(a,'Alice')));
 resume.resolve();await rejected;
 assert.deepEqual(f.ids().sort(),['original','remote']);
 assert.equal(f.writes.some(p=>p.key==='combat_arc_idx_Alice'||p.key==='combat_arc_Alice'),false);
});

test('A remote revision that was not hydrated still prevents replacing its index',async()=>{
 const f=fixture([arc('original')]);
 f.seed('combat_arc_idx_Alice',[arc('original'),arc('remote')].map(a=>f.context.combatArchiveMetaFromRecord(a,'Alice')),false);
 await assert.rejects(f.context.saveCombatArchives([arc('original'),arc('local')],'Alice'),e=>e.code==='VERSION_CONFLICT');
 assert.deepEqual(f.ids().sort(),['original','remote']);
});

test('Intentional removal keeps the remaining index and recoverable record details',async()=>{
 const f=fixture([arc('keep'),arc('remove')]);
 await f.context.saveCombatArchives([arc('keep')],'Alice');
 assert.deepEqual(f.ids(),['keep']);assert.deepEqual(f.read('combat_arc_Alice').map(a=>a.id),['keep']);
 assert.equal(f.read('combat_arc_rec_Alice__remove').id,'remove');
});

test('Unknown revisions cannot overwrite an existing server archive list',async()=>{
 const f=fixture([arc('remote')]);f.context._dbVersions={};f.context._dbCache={};
 await assert.rejects(f.context.saveCombatArchives([arc('local')],'Alice'),e=>e.code==='VERSION_CONFLICT');
 assert.deepEqual(f.ids(),['remote']);assert.deepEqual(f.writes,[]);
});

test('A queued save from an old session cannot publish archives after reconnection',async()=>{
 const f=fixture([arc('original')]),entered=deferred(),resume=deferred();
 f.hook(async p=>{if(p.action==='get'&&p.key==='combat_arc_rec_Alice__local'){entered.resolve();await resume.promise;}});
 const saving=f.context.saveCombatArchives([arc('original'),arc('local')],'Alice');const rejected=assert.rejects(saving,e=>e.code==='SESSION_CHANGED');await entered.promise;
 f.context._dbSessionGeneration++;resume.resolve();await rejected;
 assert.deepEqual(f.ids(),['original']);assert.deepEqual(f.writes,[]);
});
