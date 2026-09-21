'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const {createLocalApp}=require('./helpers/local-app');
(async()=>{
 const app=await createLocalApp();let browser;
 const output=path.resolve('test-results/rpg');fs.mkdirSync(output,{recursive:true});
 try{
  browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();const errors=[];
  page.on('pageerror',error=>errors.push(error.message));await page.route('https://**/*',route=>route.abort());
  const session=await app.cookie('alice');await context.addCookies([{name:'np_session',value:session.slice('np_session='.length),url:app.origin,httpOnly:true,sameSite:'Strict'}]);
  await page.goto(app.origin,{waitUntil:'load'});await page.waitForFunction(()=>window.CU&&CU.pseudo==='Alice');
  await page.evaluate(()=>{localStorage.setItem('np_rpg_proto_v1',JSON.stringify({ownerId:'other',name:'OLD PRIVATE RPG',loc:'ruins',inv:{},equip:{},created:true}));openRpgPrototype();});
  await page.waitForFunction(()=>document.querySelector('#rpg-sync-status')?.textContent==='Synchronisé');
  let records=(await app.read('rpg_characters')).value;assert.equal(records.length,1);assert.equal(records[0].ownerId,'alice');assert.equal(records[0].loc,'camp');assert.notEqual(records[0].name,'OLD PRIVATE RPG');
  await page.evaluate(()=>rpgMove('ridge'));await page.waitForFunction(()=>document.querySelector('#rpg-sync-status')?.textContent==='Synchronisé');
  assert.equal((await app.read('rpg_characters')).value[0].loc,'ridge');
  await page.reload();await page.waitForFunction(()=>window.CU&&CU.pseudo==='Alice');await page.evaluate(()=>openRpgPrototype());await page.waitForFunction(()=>document.querySelector('#rpg-sync-status')?.textContent==='Synchronisé');
  assert.match(await page.locator('.rpg-location-name').textContent(),/Crête/);
  assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('np_rpg_')).sort().join(',')),'np_rpg_proto_v1');
  // Custom serment names cross both an HTML attribute and a JavaScript string.
  await page.evaluate(()=>{window.__rpgOriginalSD=getAllSD;window.__rpgQuotedClass="Lame');window.__rpgXss=1;//";window.getAllSD=function(){return {...__rpgOriginalSD(),[__rpgQuotedClass]:{arme:'Lame',dmg:1,pvN:1,epN:1,emN:1}};};renderRpgPrototype('p-rpg-prototype-c');});
  await page.locator('.rpg-oath').filter({hasText:"Lame');window.__rpgXss=1;//"}).click();
  assert.equal(await page.evaluate(()=>!!window.__rpgXss),false);
  await page.evaluate(()=>{window.getAllSD=__rpgOriginalSD;renderRpgPrototype('p-rpg-prototype-c');});
  await page.waitForFunction(()=>document.querySelector('#rpg-sync-status')?.textContent==='Synchronisé');
  await page.screenshot({path:path.join(output,'rpg-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,'rpg-mobile.png'),fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  // Delay the first save while the player makes a second move. The final stored
  // location must be the newer action, even when the older response arrives late.
  let release,held;const gate=new Promise(resolve=>{release=resolve;});const captured=new Promise(resolve=>{held=resolve;});let delay=true;
  await page.route('**/.netlify/functions/db',async route=>{if(delay&&route.request().postDataJSON().action==='rpg_save_character'){delay=false;held();await gate;}await route.continue();});
  await page.evaluate(()=>rpgMove('cave'));await captured;await page.evaluate(()=>rpgMove('forest'));release();
  await page.waitForFunction(()=>document.querySelector('#rpg-sync-status')?.textContent==='Synchronisé');assert.equal((await app.read('rpg_characters')).value[0].loc,'forest');
  const external=(await app.read('rpg_characters')).value;external[0].gold=123;await app.seed('rpg_characters',external);
  await page.evaluate(()=>rpgMove('camp'));await page.waitForFunction(()=>document.querySelector('#rpg-sync-status')?.textContent==='Brouillon non enregistré');
  assert.equal((await app.read('rpg_characters')).value[0].gold,123);assert.equal((await app.read('rpg_characters')).value[0].loc,'forest');
  assert.ok(await page.getByText('Télécharger le brouillon',{exact:true}).isVisible());
  const downloading=page.waitForEvent('download');await page.getByText('Télécharger le brouillon',{exact:true}).click();const download=await downloading;
  const draftPath=path.join(output,'rpg-draft.json');await download.saveAs(draftPath);assert.equal(JSON.parse(fs.readFileSync(draftPath,'utf8')).loc,'camp');
  await page.evaluate(()=>logout());await page.waitForFunction(()=>!window.CU);
  assert.equal(await page.locator('#p-rpg-prototype-c').textContent(),'');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('np_rpg_proto_v1')).name),'OLD PRIVATE RPG');
  assert.deepEqual(errors,[]);assert.deepEqual(app.errors,[]);
  console.log('OK RPG real handlers: creation, persistence after reload, independent local draft, delayed saves, conflict, logout, legacy data preserved, responsive views.');
 }finally{if(browser)await browser.close();await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
