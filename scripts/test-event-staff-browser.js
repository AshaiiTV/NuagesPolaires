'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createLocalApp } = require('./helpers/local-app');

(async()=>{
  const app=await createLocalApp();
  const output=path.resolve(process.env.NP_TEST_OUTPUT||'test-results/event-staff');
  fs.mkdirSync(output,{recursive:true});
  const errors=[], observations=[];
  let browser;
  try{
    browser=await chromium.launch({headless:true});
    for(const pseudo of ['Admin','Maitre','Designer']){
      await app.seed('events',[{id:'legacy',nom:'Événement hérité',date:Date.now()+86400000,type:'evenement',max:4,inscrits:['Alice','Bob'],createdBy:'Auteur original',extra:{preserved:true},hidden:true}]);
      const context=await browser.newContext({viewport:{width:1440,height:1000}});
      const page=await context.newPage();page.setDefaultTimeout(15000);
      page.on('pageerror',e=>errors.push(e.stack||e.message));
      await page.route('https://**/*',route=>route.abort());
      async function ready(){
        await page.waitForFunction(name=>window.CU&&(CU.pseudo||CU.name)===name,pseudo);
        await page.waitForFunction(()=>{
          const overlay=document.getElementById('login-transition-overlay'),flash=document.getElementById('lto-flash');
          return (!overlay||!overlay.classList.contains('active'))&&(!flash||getComputedStyle(flash).opacity==='0');
        });
      }
      async function spy(){
        await page.evaluate(()=>{
          if(!window.__eventSpy){const old=window.notif;window.notif=function(message,type){window.__eventNotices.push({message,type});return old.apply(this,arguments);};window.__eventSpy=true;}
          window.__eventNotices=[];
        });
      }
      async function events(){await page.evaluate(()=>switchTab('evenements',null));await page.locator('#p-events-c').waitFor({state:'visible'});}
      async function responseFor(key){return page.waitForResponse(r=>r.url().endsWith('/.netlify/functions/db')&&r.request().postDataJSON()?.action==='set'&&r.request().postDataJSON()?.key===key);}
      async function save(){const response=responseFor('events');await page.locator('#m-event button[onclick="saveEvent()"]').click();const r=await response;assert.equal(r.status(),200);await page.waitForFunction(()=>!document.getElementById('m-event').classList.contains('open'));}
      await page.goto(app.origin,{waitUntil:'load'});
      await page.waitForFunction(()=>typeof window.loginUnified==='function');
      await page.evaluate(()=>showScreen('s-login'));
      await page.locator('#login-id').fill(pseudo);await page.locator('#login-pass').fill(pseudo+'-audit-123!');
      await page.locator('button[onclick="loginUnified()"]').click();await ready();await spy();await events();
      assert.match(await page.locator('#p-events-c').textContent(),/Événement hérité/);
      await page.locator('button[onclick="openEventModal(\'legacy\')"]').click();
      assert.equal(await page.locator('#ev-max').inputValue(),'4');assert.equal(await page.locator('#ev-type').inputValue(),'evenement');
      await page.locator('#ev-max').fill('1');await page.locator('#m-event button[onclick="saveEvent()"]').click();
      await page.waitForFunction(()=>__eventNotices.some(n=>n.message.includes('inférieure')));
      assert.equal((await app.read('events')).value[0].max,4);
      await page.locator('#ev-max').fill('3');await page.locator('#ev-desc').fill('Description modifiée par '+pseudo);await save();
      let legacy=(await app.read('events')).value[0];
      assert.equal(legacy.max,3);assert.deepEqual(legacy.inscrits,['Alice','Bob']);assert.equal(legacy.createdBy,'Auteur original');assert.deepEqual(legacy.extra,{preserved:true});
      let response=responseFor('events');await page.locator('button[onclick="toggleEventHidden(\'legacy\')"]').click();assert.equal((await response).status(),200);
      await page.waitForFunction(()=>!getEvents()[0].hidden);assert.equal((await app.read('events')).value[0].hidden,false);
      await page.locator('#p-events-c button[onclick="openEventModal()"]').first().click();
      assert.equal(await page.locator('#ev-notify-row').isVisible(),pseudo!=='Designer');
      await page.locator('#ev-nom').fill('Nouvelle expédition '+pseudo);await page.locator('#ev-max').fill('2');await page.locator('#ev-date').fill('2030-01-01T20:00');
      const requestStart=app.requests.length;await save();
      const writes=app.requests.slice(requestStart).filter(r=>r.name==='db'&&r.action==='set');
      assert.equal(writes.some(r=>r.key==='players'),pseudo!=='Designer');
      assert.equal(writes.some(r=>r.status>=400),false);
      assert.equal(await page.evaluate(()=>__eventNotices.some(n=>n.message.includes('Permission refusée'))),false);
      await page.reload({waitUntil:'load'});await ready();await spy();await events();
      assert.match(await page.locator('#p-events-c').textContent(),new RegExp('Nouvelle expédition '+pseudo));
      await page.locator('button[onclick="openEventModal(\'legacy\')"]').click();
      assert.equal(await page.locator('#ev-max').inputValue(),'3');await page.locator('#ev-nom').fill('Brouillon conservé');
      const refuse=route=>{const payload=route.request().postDataJSON();return payload?.action==='set'&&payload.key==='events'?route.fulfill({status:503,contentType:'application/json',body:'{"ok":false,"error":"Échec simulé"}'}):route.continue();};
      await page.route('**/.netlify/functions/db',refuse);
      response=responseFor('events');await page.locator('#m-event button[onclick="saveEvent()"]').click();assert.equal((await response).status(),503);
      await page.waitForFunction(()=>!_eventStaffBusy());
      assert.equal(await page.locator('#m-event').evaluate(el=>el.classList.contains('open')),true);
      assert.equal(await page.locator('#ev-nom').inputValue(),'Brouillon conservé');
      assert.equal(await page.evaluate(()=>getEvents().find(e=>e.id==='legacy').nom),'Événement hérité');
      assert.equal(await page.evaluate(()=>__eventNotices.some(n=>n.type==='ok')),false);
      await page.unroute('**/.netlify/functions/db',refuse);
      await page.reload({waitUntil:'load'});await ready();await spy();await events();
      if(pseudo==='Maitre'){
        await page.locator('#p-events-c button[onclick="openEventModal()"]').first().click();
        await page.locator('#ev-nom').fill('Notification partielle');
        const refusePlayers=route=>{const p=route.request().postDataJSON();return p?.action==='set'&&p.key==='players'?route.fulfill({status:503,contentType:'application/json',body:'{"ok":false,"error":"Échec notification simulé"}'}):route.continue();};
        await page.route('**/.netlify/functions/db',refusePlayers);await save();
        await page.waitForFunction(()=>__eventNotices.some(n=>n.message.includes('notifications n’ont pas été confirmées')));
        assert.equal(await page.evaluate(()=>__eventNotices.some(n=>n.type==='ok')),false);
        assert.ok((await app.read('events')).value.some(e=>e.nom==='Notification partielle'));
        await page.unroute('**/.netlify/functions/db',refusePlayers);
      }
      page.once('dialog',dialog=>dialog.accept());response=responseFor('events');
      await page.locator('button[onclick="deleteEvent(\'legacy\')"]').click();assert.equal((await response).status(),200);
      await page.waitForFunction(()=>!getEvents().some(e=>e.id==='legacy'));assert.equal((await app.read('events')).value.some(e=>e.id==='legacy'),false);
      await page.setViewportSize({width:390,height:844});await page.waitForTimeout(400);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.locator('#p-events-c button[onclick="openEventModal()"]').first().click();
      await page.locator('#ev-nom').fill('Formulaire mobile '+pseudo);
      await page.waitForTimeout(400);
      await page.waitForFunction(()=>!document.querySelector('.np-api-toast'));
      assert.equal(await page.locator('#ev-nom').evaluate(el=>{const rect=el.getBoundingClientRect();return document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2)===el;}),true);
      await page.screenshot({path:path.join(output,pseudo.toLowerCase()+'-mobile-editor.png'),fullPage:true,animations:'disabled'});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      observations.push(pseudo+' : événement masqué accessible ; capacité, édition, création, publication, suppression et persistance confirmées ; échec sans faux succès ; formulaire mobile sans débordement.');
      await context.close();
    }
    assert.deepEqual(errors,[]);assert.deepEqual(app.errors,[]);
    console.log(JSON.stringify({ok:true,observations,requestCount:app.requests.length,screenshots:output},null,2));
  }finally{if(browser)await browser.close();await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
