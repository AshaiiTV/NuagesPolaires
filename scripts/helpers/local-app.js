'use strict';

// Run the production handlers against PostgreSQL in memory. No Neon URL or real
// account is used; SQL statements are executed by PGlite rather than pattern mocks.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const crypto = require('node:crypto');
const { PGlite } = require('@electric-sql/pglite');
const ROOT = path.resolve(__dirname, '../..');
const hashPassword = value => 'sha256:' + crypto.createHash('sha256').update(value).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));

async function createLocalApp() {
  const database = new PGlite();
  await database.exec('CREATE TABLE np_store (key TEXT PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT now())');
  const stamp = Date.now();
  const accounts = [
    { id:'admin', pseudo:'Admin', role:'admin', pid:'p_admin', pass:hashPassword('Admin-audit-123!') },
    { id:'alice', pseudo:'Alice', role:'joueur', pid:'p_alice', pass:hashPassword('Alice-audit-123!') },
    { id:'bob', pseudo:'Bob', role:'joueur', pid:'p_bob', pass:hashPassword('Bob-audit-123!') },
    { id:'mj', pseudo:'Maitre', role:'mj', pid:null, pass:hashPassword('Maitre-audit-123!') },
    { id:'designer', pseudo:'Designer', role:'designer', pid:null, pass:hashPassword('Designer-audit-123!') }
  ].map(a=>({...a,createdAt:stamp,lastSeen:stamp,sessionVersion:0,forcePasswordReset:false,selectedTheme:'dark',unlockedThemes:[],blockedThemes:[]}));
  const players = ['admin','alice','bob'].map(id=>({id:'p_'+id,name:id[0].toUpperCase()+id.slice(1),classe:'Mizu',level:1,xp:0,xpMax:30,pvMax:30,pvCur:30,epMax:50,epCur:50,emMax:20,emCur:20,sLevel:1,sXp:0,sXpMax:10,branch:'Aucune',journal:'Journal '+id,avatar:'',inventory:[],history:[],statuts:[],equipment:{helmet:null,chest:null,legs:null}}));
  async function seed(key, value) { await database.query('INSERT INTO np_store(key,value) VALUES($1,$2::jsonb) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()', [key, JSON.stringify(value)]); }
  async function read(key) { const rows=(await database.query('SELECT value,md5(value::text) AS version FROM np_store WHERE key=$1',[key])).rows;return rows[0]||{value:null,version:null}; }
  const publicData = {beasts:[{id:'visible',name:'Loup',nom:'Loup',niv:1,pv:30,ep:10,beh:'Neutre',adminNotes:'SECRET STAFF'},{id:'hidden',name:'Boss',nom:'Boss',hidden:true,adminNote:'SECRET BOSS'}],events:[],lieux:[],serments_custom:{},event_themes:[],theme_visibility:{},spawn_lab_staff:{schemaVersion:2},np_rate_auth:{},themes_admin_store:{meta:{private:true}},np_admin_recovery_consumed:{pseudo:'Admin',fingerprint:'fixture'}};
  for(const [key,value] of Object.entries({accounts,players,...publicData}))await seed(key,value);
  const errors=[];
  const env={NP_JWT_SECRET:'np-local-test-only-secret-0123456789abcdef',NETLIFY_DATABASE_URL:'postgresql://fixture.invalid/test',NP_SITE_URL:'http://127.0.0.1'};
  const sql = async (strings,...values) => {
    const query = strings.reduce((text,part,i)=>text+(i?'$'+i:'')+part,'');
    return (await database.query(query,values)).rows;
  };
  const cache = new Map();
  function load(file) {
    const filename=path.resolve(file);
    if(cache.has(filename))return cache.get(filename);
    const module={exports:{}};
    const ctx={module,exports:module.exports,Buffer,URL,setTimeout,clearTimeout,process:{env},console:{...console,error:(...args)=>errors.push(args.map(x=>x&&x.stack||String(x)).join(' '))}};
    ctx.require = name => {
      if(name==='@neondatabase/serverless')return {neon:()=>sql};
      if(name.startsWith('.')){let resolved=path.resolve(path.dirname(filename),name);if(!path.extname(resolved))resolved+='.js';return load(resolved).module.exports;}
      return require(name);
    };
    vm.createContext(ctx);cache.set(filename,ctx);vm.runInContext(fs.readFileSync(filename,'utf8'),ctx,{filename});return ctx;
  }
  let auth, db;
  const requests=[];
  const server=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://127.0.0.1');
    if(url.pathname.startsWith('/.netlify/functions/')) {
      let body='';req.on('data',d=>body+=d);req.on('end',async()=>{
        try { const name=url.pathname.endsWith('/auth')?'auth':'db';const handler=name==='auth'?auth:db;const response=await handler.module.exports.handler({httpMethod:req.method,headers:req.headers,body});
          let parsed={};try{parsed=JSON.parse(body);}catch{}
          requests.push({name,action:parsed.action,key:parsed.key,status:response.statusCode});
          res.writeHead(response.statusCode,response.headers);res.end(response.body);
        }catch(e){errors.push(e.stack);res.writeHead(500,{'Content-Type':'application/json'});res.end('{"ok":false,"error":"local fixture error"}');}
      });return;
    }
    const relative=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).slice(1);
    const file=path.resolve(ROOT,relative);
    if(!(relative==='index.html'||relative.startsWith('assets/'))||!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
    const type=file.endsWith('.js')?'application/javascript':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.css')?'text/css':file.endsWith('.jpg')?'image/jpeg':file.endsWith('.woff2')?'font/woff2':'text/html';
    const headers={'Content-Type':type};
    if(file.endsWith('.html')){const match=fs.readFileSync(path.join(ROOT,'netlify.toml'),'utf8').match(/Content-Security-Policy = "([^"]+)"/);if(match)headers['Content-Security-Policy']=match[1];}
    res.writeHead(200,headers);res.end(fs.readFileSync(file));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;env.NP_SITE_URL=origin;
  auth=load(path.join(ROOT,'netlify/functions/auth.js'));db=load(path.join(ROOT,'netlify/functions/db.js'));
  async function cookie(id) {
    const account=(await read('accounts')).value.find(a=>a.id===id);
    return 'np_session='+auth.signToken(auth.makeSessionPayload(account));
  }
  async function call(name,body,session) {
    const response=await (name==='auth'?auth:db).module.exports.handler({httpMethod:'POST',headers:{'content-type':'application/json',origin,'x-forwarded-for':'192.0.2.5',...(session?{cookie:session}:{})},body:JSON.stringify(body)});
    return {status:response.statusCode,data:JSON.parse(response.body||'{}'),headers:response.headers};
  }
  return {ROOT,database,origin,auth,db,seed,read,cookie,call,errors,requests,accounts:clone(accounts),players:clone(players),close:async()=>{await new Promise(resolve=>server.close(resolve));await database.close();}};
}
module.exports={createLocalApp,hashPassword};
