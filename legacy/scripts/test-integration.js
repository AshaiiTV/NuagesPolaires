'use strict';
const {test,before,after,beforeEach}=require('node:test');
const assert=require('node:assert/strict');
const {createLocalApp,hashPassword}=require('./helpers/local-app');
let app;
before(async()=>{app=await createLocalApp();});
after(async()=>{await app.close();});
beforeEach(async()=>{await app.seed('accounts',app.accounts);await app.seed('players',app.players);await app.seed('np_rate_auth',{});});
const session=id=>app.cookie(id);
const denied=r=>assert.ok(r.status>=400&&r.status<500,JSON.stringify(r));

test('Anonymous responses exclude internal keys, hidden creatures and staff notes',async()=>{
 for(const key of ['np_rate_auth','themes_admin_store','np_admin_recovery_consumed','accounts','players','spawn_lab_staff','unknown_private_key'])denied(await app.call('db',{action:'get',key}));
 const bundle=await app.call('db',{action:'get_public_bundle'});assert.equal(bundle.status,200);assert.deepEqual(bundle.data.data.beasts.map(b=>b.id),['visible']);assert.ok(!JSON.stringify(bundle.data.data).includes('SECRET'));assert.ok(!bundle.data.data.np_admin_recovery_consumed);
 const direct=await app.call('db',{action:'get',key:'beasts'});assert.deepEqual(direct.data.value.map(b=>b.id),['visible']);
});
test('Staff bundle preserves staff content and uses the exact SQL revisions',async()=>{
 const r=await app.call('auth',{action:'session_bundle'},await session('admin'));assert.equal(r.status,200);const data=r.data.data;assert.equal(data.beasts.length,2);assert.ok(data.beasts.some(b=>b.adminNotes==='SECRET STAFF'));const versions=r.data.versions||data.versions;assert.equal(versions.players,(await app.read('players')).version);assert.equal(versions.beasts,(await app.read('beasts')).version);
});
test('Normal sessions cannot bypass password verification through forced reset',async()=>{
 const original=(await app.read('accounts')).value.find(a=>a.id==='alice').pass;
 denied(await app.call('auth',{action:'complete_forced_reset',newPassHash:hashPassword('unexpected')},await session('alice')));
 assert.equal((await app.read('accounts')).value.find(a=>a.id==='alice').pass,original);
});
test('Admin reset uses an expiring random secret, restricts session and consumes it',async()=>{
 const r=await app.call('auth',{action:'admin_reset_password',accountId:'alice'},await session('admin'));assert.equal(r.status,200);assert.ok(r.data.temporaryPassword.length>=16);assert.notEqual(r.data.temporaryPassword,'reset');assert.ok(r.data.expiresAt>Date.now());
 const bad=await app.call('auth',{action:'login',pseudo:'Alice',passHash:hashPassword('reset')});denied(bad);
 const login=await app.call('auth',{action:'login',pseudo:'Alice',passHash:hashPassword(r.data.temporaryPassword)});assert.equal(login.status,200);assert.equal(login.data.forcePasswordReset,true);const restricted=login.headers['Set-Cookie'].split(';')[0];
 denied(await app.call('auth',{action:'session_bundle'},restricted));denied(await app.call('db',{action:'get',key:'players'},restricted));
 const done=await app.call('auth',{action:'complete_forced_reset',newPassHash:hashPassword('Alice-new-password!')},restricted);assert.equal(done.status,200);
 denied(await app.call('auth',{action:'complete_forced_reset',newPassHash:hashPassword('reuse')},restricted));
 const loginAgain=await app.call('auth',{action:'login',pseudo:'Alice',passHash:hashPassword('Alice-new-password!')});assert.equal(loginAgain.status,200);assert.equal(loginAgain.data.forcePasswordReset,false);
});
test('Password changes revoke previously issued cookies in both handlers',async()=>{
 const old=await session('alice');const change=await app.call('auth',{action:'self_change_password',currentPassHash:hashPassword('Alice-audit-123!'),newPassHash:hashPassword('new secure password')},old);assert.equal(change.status,200);
 denied(await app.call('auth',{action:'verify'},old));denied(await app.call('db',{action:'get',key:'players'},old));assert.equal((await app.call('auth',{action:'verify'},change.headers['Set-Cookie'].split(';')[0])).status,200);
});
test('Logout invalidates the issued session on the server',async()=>{
 const old=await session('alice');assert.equal((await app.call('auth',{action:'logout'},old)).status,200);denied(await app.call('auth',{action:'verify'},old));
});
test('Generic account writes and critical collection deletion are refused',async()=>{
 const admin=await session('admin');const original=await app.read('accounts');const data=await app.call('db',{action:'get',key:'accounts'},admin);denied(await app.call('db',{action:'set',key:'accounts',value:data.data.value,expectedVersion:original.version},admin));denied(await app.call('db',{action:'delete',key:'accounts',expectedVersion:original.version},admin));assert.deepEqual((await app.read('accounts')).value,original.value);
 denied(await app.call('db',{action:'delete',key:'players',expectedVersion:(await app.read('players')).version},await session('mj')));
});
test('SQL compare-and-swap rejects a stale replacement without overwriting',async()=>{
 await app.seed('events',[]);const version=(await app.read('events')).version;const admin=await session('admin');
 const r=await Promise.all([app.call('db',{action:'set',key:'events',value:[{id:'one'}],expectedVersion:version},admin),app.call('db',{action:'set',key:'events',value:[{id:'two'}],expectedVersion:version},admin)]);
 assert.deepEqual(r.map(x=>x.status).sort(),[200,409]);assert.equal((await app.read('events')).value[0].id,r[0].status===200?'one':'two');
 denied(await app.call('db',{action:'set',key:'events',value:[]},admin));
});
test('Concurrent account updates retain both users changes',async()=>{
 const alice=await session('alice'),bob=await session('bob');const r=await Promise.all([app.call('auth',{action:'self_set_theme',themeId:'violet'},alice),app.call('auth',{action:'self_set_theme',themeId:'green'},bob)]);assert.deepEqual(r.map(x=>x.status),[200,200]);const a=(await app.read('accounts')).value;assert.equal(a.find(x=>x.id==='alice').selectedTheme,'violet');assert.equal(a.find(x=>x.id==='bob').selectedTheme,'green');
});
test('Own profile patch changes only own journal and avatar and requires current revision',async()=>{
 const old=await app.read('players'),alice=await session('alice');const r=await app.call('db',{action:'patch_own_player',patch:{journal:'New journal',avatar:'data:image/png;base64,aGVsbG8='},expectedVersion:old.version},alice);assert.equal(r.status,200);assert.equal(r.data.value.length,1);assert.equal(r.data.value[0].id,'p_alice');
 const saved=(await app.read('players')).value;assert.equal(saved.find(p=>p.id==='p_alice').journal,'New journal');assert.deepEqual(saved.find(p=>p.id==='p_bob'),old.value.find(p=>p.id==='p_bob'));
 denied(await app.call('db',{action:'patch_own_player',patch:{journal:'stale'},expectedVersion:old.version},alice));denied(await app.call('db',{action:'patch_own_player',patch:{level:999},expectedVersion:r.data.version},alice));
});
test('MJ cannot drop an existing character or store an executable avatar',async()=>{
 const old=await app.read('players'),mj=await session('mj');denied(await app.call('db',{action:'set',key:'players',value:old.value.slice(1),expectedVersion:old.version},mj));
 const attack=structuredClone(old.value);attack[0].avatar='x" onerror="window.__NP_AUDIT_XSS=1"';denied(await app.call('db',{action:'set',key:'players',value:attack,expectedVersion:old.version},mj));assert.deepEqual((await app.read('players')).value,old.value);
});
test('Detailed combat archives retain their complete object on save and read',async()=>{
 const key='combat_arc_rec_Alice__integration',alice=await session('alice');const prior=await app.read(key);const value={id:'integration',name:'Combat',log:['turn one','turn two'],fighters:[],round:2};const write=await app.call('db',{action:'set',key,value,expectedVersion:prior.version},alice);assert.equal(write.status,200);const read=await app.call('db',{action:'get',key},alice);assert.deepEqual(read.data.value.log,value.log);assert.equal(read.data.value.id,'integration');assert.equal(read.data.version,write.data.version);
});
test('Malformed JSON returns a client error without logging internal exceptions',async()=>{
 for(const mod of [app.auth,app.db]){const r=await mod.module.exports.handler({httpMethod:'POST',headers:{origin:app.origin,'content-type':'application/json'},body:'{'});assert.equal(r.statusCode,400);}
 assert.equal(app.errors.length,0,app.errors.join('\n'));
});
test('System log archives are private, admin writable with CAS and protected from global deletion',async()=>{
 const key='np_syslog_archive',admin=await session('admin'),mj=await session('mj');
 await app.seed(key,[]);
 const original=await app.read(key),value=[{archivedAt:Date.now(),label:'Private archive',entries:[{detail:'Private character journal'}]}];
 denied(await app.call('db',{action:'get',key}));
 denied(await app.call('db',{action:'get',key},mj));
 denied(await app.call('db',{action:'set',key,value,expectedVersion:original.version},mj));
 assert.equal((await app.call('db',{action:'set',key,value},admin)).status,428);
 const saved=await app.call('db',{action:'set',key,value,expectedVersion:original.version},admin);
 assert.equal(saved.status,200);
 assert.deepEqual((await app.call('db',{action:'get',key},admin)).data.value,value);
 assert.equal((await app.call('db',{action:'set',key,value:[],expectedVersion:original.version},admin)).status,409);
 denied(await app.call('db',{action:'delete',key,expectedVersion:saved.data.version},admin));
 assert.deepEqual((await app.read(key)).value,value);
});

test('System log limits retain newest entries and newest archive batches',async()=>{
 const admin=await session('admin');
 for(const [key,limit] of [['np_syslog',500],['np_syslog_archive',50]]){
  await app.seed(key,[]);
  const value=Array.from({length:limit+2},(_,i)=>({id:'entry-'+i,ts:limit+2-i}));
  const saved=await app.call('db',{action:'set',key,value,expectedVersion:(await app.read(key)).version},admin);
  assert.equal(saved.status,200);
  assert.deepEqual((await app.read(key)).value,value.slice(0,limit));
 }
});
