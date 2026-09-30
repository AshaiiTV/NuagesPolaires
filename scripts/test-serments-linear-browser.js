'use strict';
// Integration: all script wrappers and actual capability buttons, against an isolated local database.
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(__dirname,'..'),{chromium}=require(root+'/node_modules/playwright'),{createLocalApp}=require(root+'/scripts/helpers/local-app');
(async()=>{const app=await createLocalApp();let browser;try{
  browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000}}),session=await app.cookie('admin');
  await context.addCookies([{name:'np_session',value:session.slice(11),url:app.origin,httpOnly:true,sameSite:'Strict'}]);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());
  await page.goto(app.origin,{waitUntil:'load'});await page.waitForFunction(()=>window.CU&&(CU.pseudo||CU.name)==='Admin');
  await page.evaluate(()=>{window.__originalGpid=gpid;switchDropTab('combat-mj',null,'');});
  const result=[];
  for(const name of ['Duelliste','Bretteur','Claymore',"Lame d'Honneur"]){for(const index of [0,1]){
    const row=await page.evaluate(({name,index})=>{
      const branch=getBranches(name,getAllSD()[name])[index];
      const player={id:'linear-browser',name:'Porteur',classe:name,branch:branch.nom,level:10};
      window.gpid=id=>id===player.id?player:window.__originalGpid(id);
      _cs={active:true,reforgedVersion:3,phase:'declaration',round:1,turn:0,order:[0,1],decl:{},_usedDefs:{},_iv:{},_surc:{},log:[],fighters:[{pid:player.id,name:'Porteur',classe:name,type:'player',level:10,pvCur:500,pvMax:500,epCur:500,epMax:500,emCur:500,emMax:500,statuts:[]},{name:'Adversaire',type:'beast',pvCur:500,pvMax:500,epCur:500,epMax:500,emCur:0,emMax:0,statuts:[]}]};
      rCombat('p-combat-mj-c');
      const options=cGetAbilityOptions(0),buttons=[...document.querySelectorAll('#p-combat-mj-c button[data-opts]')];
      for(const button of buttons){new Function('event',button.getAttribute('onclick'));JSON.parse(button.getAttribute('data-opts'));}
      return {name,index,labels:options.map(o=>o.label),buttons:buttons.length,hidden:getAllSD()[name].hidden};
    },{name,index});
    assert.equal(!!row.hidden,name!=='Duelliste');assert.ok(row.labels.length>0);assert.ok(row.buttons>=row.labels.length);result.push(row);
    if(name==='Duelliste'&&index===0){
      await page.locator('#decl-tgt-0').selectOption('1');
      await page.locator('#p-combat-mj-c button[data-opts]').filter({hasText:'Élan à distance'}).click();
      assert.equal(await page.evaluate(()=>cDeclCount(0)),1);
      assert.equal(await page.evaluate(()=>_cs.decl[0][0].value),32);
      await page.evaluate(()=>{cDeclareAction(0,'passer');cDeclareAction(1,'passer');combatResolve();});
      assert.deepEqual(await page.evaluate(()=>({target:_cs.fighters[1].pvCur,em:_cs.fighters[0].emCur})),{target:468,em:494});
    }
    if(name==='Bretteur'&&index===1){
      const button=page.locator('#p-combat-mj-c button[data-opts]').filter({hasText:'Pas Rompu'});await button.click();
      assert.equal(await button.isDisabled(),true);
      assert.deepEqual(await page.evaluate(()=>({count:cDeclCount(0),left:cActionsLeft(0),em:_cs.fighters[0].emCur})),{count:0,left:3,em:500});
      await page.evaluate(()=>cUndoLastDecl(0));assert.equal(await button.isDisabled(),false);
    }
  }}
  assert.deepEqual(errors,[]);console.log(JSON.stringify({result,errors},null,2));
}finally{if(browser)await browser.close();await app.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
