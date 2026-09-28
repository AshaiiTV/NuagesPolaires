'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const engine=fs.readFileSync(path.join(__dirname,'../assets/js/serments-reforged-combat.js'),'utf8');
const main=fs.readFileSync(path.join(__dirname,'../assets/js/main.js'),'utf8');
const contract=require('../docs/serments-reforged-mechanics.json');
const copy=x=>JSON.parse(JSON.stringify(x));
function realFunction(name){const start=main.indexOf('function '+name+'(');assert.notEqual(start,-1);const end=main.indexOf('\nfunction ',start+1);return main.slice(start,end===-1?undefined:end);}
function env(name='Arbalétrier',key='A',level=2){
 const definitions=Object.fromEntries(contract.entries.map(e=>[e.name,{reforged:true,dmg:20,branches:e.branches.map(b=>({key:b.key,nom:b.name,combatRules:{key:b.key},paliers:b.levels.map(niv=>({niv,nom:b.name}))}))}]));
 const players=[{id:'p0',name:'Porteur',classe:name,branch:key,level}];
 const c={console,Math,JSON,Date,Number,String,Object,Array,Infinity,logs:[],attacks:[],CU:{type:'staff'},document:null,STATUT_EFFECTS:{},setTimeout:()=>{},combatSnapshot:()=>{},combatQueueFx:()=>{},combatPlayPendingFx:()=>{},cTickShieldCallTaunts:()=>{},cTickStatuts:()=>{},cFindAutoInterpose:()=>null,cApplyElementalLogic:(f,a,t,d)=>({dmg:d}),cAddOrRefreshStatut:()=>{},openDropModal:()=>{},rCombat:()=>{},notif:x=>c.logs.push(x),cLog:x=>c.logs.push(x),_nextDeclarant:()=>{if(c._cs.turn>=c._cs.order.length)c._cs.phase='resolution';},cEnsureFighterCid:f=>(f.cid||= 'id'+c._cs.fighters.indexOf(f)),cActionsMax:()=>3,cGetAbilityOptions:()=>[{legacy:true}],cBuildAbilityOptionsForPalier:()=>[{legacy:true}],cRenderAbilityButtons:()=>'<legacy>',combatStart:()=>{c._cs.active=true;c._cs.round=1;c._cs.phase='declaration';c._cs.order=c._cs.fighters.map((_,i)=>i);},cGetForcedTargetInfo:()=>null};
 c.window=c;c._cs={active:true,phase:'declaration',round:1,turn:0,order:[0,1,2,3],decl:{},_usedDefs:{},log:[],fighters:[{pid:'p0',name:'Porteur',classe:name,type:'player',level,pvCur:500,pvMax:500,epCur:500,emCur:500,statuts:[]},{name:'Ennemi',type:'beast',pvCur:500,pvMax:500,epCur:500,emCur:500,statuts:[]},{name:'Allié',type:'player',pvCur:500,pvMax:500,epCur:500,emCur:500,statuts:[]},{name:'Autre ennemi',type:'beast',pvCur:500,pvMax:500,epCur:500,emCur:500,statuts:[]}]};
 c.cGetFighterPlayer=fi=>players.find(p=>p.id===c._cs.fighters[fi].pid);c.getPlayerSermentBundle=p=>({branch:definitions[p.classe].branches.find(b=>b.key===p.branch)});c.getAllSD=()=>definitions;c.cDeclCount=fi=>(c._cs.decl[fi]||[]).reduce((n,a)=>n+(a.consumeActions||1),0);c.cActionsLeft=fi=>Math.max(0,c.cActionsMax(fi)-c.cDeclCount(fi));
 c.cDeclareAction=(fi,action,opts={})=>{const a={action,kind:['frappe','pugilat','capacite'].includes(action)?'attack':'utility',consumeActions:1,epCost:action==='frappe'?6:action==='parer'?0:action==='esquive'?8:0,emCost:0,value:20,target:1,...opts};(c._cs.decl[fi]||=[]).push(a);if(c.cActionsLeft(fi)<=0){c._cs.turn++;c._nextDeclarant();}return a;};
 vm.createContext(c);['cGetAttackTargets','cApplyRawDamage','cResolveAttackInstance','combatResolve'].forEach(n=>vm.runInContext(realFunction(n),c));vm.runInContext(engine,c);c.api=c.NPSermentsReforgedCombat;c.players=players;c.definitions=definitions;
 c.act=(id,params={})=>c.api.perform(0,id,params);
 c.finish=()=>{c._cs.phase='resolution';c.combatResolve();};
 c.enemy=(value=20,target=0,extra={})=>{(c._cs.decl[1]||=[]).push({action:'frappe',kind:'attack',consumeActions:1,epCost:0,emCost:0,value,target,...extra});};
 c.defend=(fi=1,action='esquive')=>{(c._cs.decl[fi]||=[]).push({action,kind:'defense',consumeActions:1,epCost:0,value:0});};
 return c;
}

test('24 distinct identities, 48 distinct models, costs and qualitative unlocks are generated from the engine',()=>{
 const c=env();assert.equal(c.api.catalog.length,24);assert.equal(new Set(c.api.catalog.flatMap(e=>e.branches.map(b=>b.model))).size,48);
 let upgrades=0;
 for(const e of c.api.catalog)for(const b of e.branches){const tiers=b.levels.map(n=>c.api.describe(e.name,b.key,n));for(const x of tiers){assert.ok(x.operations.length>=1);for(const o of x.operations){assert.ok(o.rule);assert.ok(o.cost.actions>=1&&o.cost.actions<=2);assert.ok(o.cost.ep>=0&&o.cost.em>=0);assert.ok(!/MJ|constat/.test(o.rule));}}if(tiers[3].operations.length>tiers[0].operations.length)upgrades++;}
 assert.ok(upgrades>=40,'At least 40 branches gain concrete choices beyond number scaling');
});
test('all 48 branches expose explicit operations and valid turn/resource checks',()=>{
 for(const e of contract.entries)for(const b of e.branches){const c=env(e.name,b.key,20);const ops=c.api.getOptions(0);assert.ok(ops.length>=2,e.name+' '+b.key);for(const op of ops){assert.equal(op.action,'reforged');assert.equal(op.rf.model,b.model);assert.ok(op.consumeActions>=1);}c._cs.turn=1;assert.equal(c.act(ops[0].rf.id,{target:1,second:3}).ok,false);}
});
test('level 1 crossbow has ordinary load/shot even without any branch; a dry shot and ordinary bypass are rejected',()=>{
 const c=env('Arbalétrier',null,1);assert.equal(c.act('shoot',{target:1}).ok,false);assert.equal(c.act('load').ok,true);assert.equal(c.act('shoot',{target:1}).ok,true);c.finish();assert.equal(c._cs.fighters[1].pvCur,479);assert.equal(c._cs.fighters[0].epCur,492);assert.equal(c.api.getState(0).ammo,5);assert.equal(c.cDeclareAction(0,'frappe',{target:1}).ok,false);
});
test('crossbow projection supports load then shot, debits once, consumes no ammunition on undo',()=>{
 const c=env();assert.equal(c.act('load').ok,true);assert.equal(c.act('shoot',{target:1}).ok,true);assert.equal(c._cs.fighters[0].epCur,500);c._cs.decl[0].pop();assert.equal(c.api.getState(0).ammo,6);assert.equal(c.api.getState(0).loaded,1);assert.equal(c.act('shoot',{target:1}).ok,true);c.finish();assert.equal(c._cs.fighters[1].pvCur,478);assert.equal(c._cs.fighters[0].epCur,490);assert.equal(c.api.getState(0).ammo,5);
});
test('unaffordable preparation cancels its dependent shot before any payment',()=>{
 const c=env();c.act('load');c.act('shoot',{target:1});c._cs.fighters[0].epCur=4;c.finish();assert.equal(c._cs.fighters[0].epCur,4);assert.equal(c.api.getState(0).ammo,6);assert.equal(c._cs.fighters[1].pvCur,500);
});
test('single-target and two-target abilities reject wrong teams, dead targets and duplicate targets',()=>{
 const c=env('Entraveur','A',10);assert.equal(c.act('link',{target:1,second:1}).ok,false);assert.equal(c.act('link',{target:1,second:2}).ok,false);c._cs.fighters[3].pvCur=0;assert.equal(c.act('link',{target:1,second:3}).ok,false);assert.equal(c._cs.decl[0],undefined);
 const a=env('Enchanteur','A',2);assert.equal(a.act('inscribe',{target:1}).ok,false);assert.equal(a.act('inscribe',{target:2}).ok,true);
});
test('crossbow shot is physical and is blocked by weapon grip, not treated as magical damage',()=>{
 const c=env();c.act('load');c.finish();c._cs.fighters[0]._rfEffects=[{kind:'grip',owner:'id1',mode:'weapon',expires:5}];assert.equal(c.act('shoot',{target:1}).ok,false);assert.equal(c.api.perform(0,'break',{}).ok,true);c.finish();assert.equal(c.act('shoot',{target:1}).ok,true);c.finish();assert.equal(c._cs.fighters[1].pvCur,478);
});
test('magical grip blocks a reforged preparation at declaration and resolution',()=>{
 const c=env('Enchanteur','A',2);c._cs.fighters[0]._rfEffects=[{kind:'grip',owner:'id1',mode:'magic',expires:5}];assert.equal(c.act('inscribe',{target:2}).ok,false);delete c._cs.fighters[0]._rfEffects;c.act('inscribe',{target:2});c._cs.fighters[0]._rfEffects=[{kind:'grip',owner:'id1',mode:'magic',expires:5}];c.finish();assert.equal((c._cs.fighters[2]._rfEffects||[]).length,0);
});
test('Guetteur spends action/ammo at reservation and reacts at most once before a later attack',()=>{
 const c=env('Guetteur','A',10);c.act('load');c.act('watch',{target:1});c.enemy(20);c.enemy(20);c.finish();assert.equal(c._cs.fighters[1].pvCur,470);assert.equal(c._cs.fighters[0].pvCur,460);assert.equal(c.api.getState(0).ammo,5);assert.equal(c.api.getState(0).stage,'idle');assert.equal(c._cs.fighters[0].emCur,496);
});
test('Guetteur reserve expires without shooting when the enemy never attacks',()=>{
 const c=env('Guetteur','A',10);c.act('load');c.act('watch',{target:1});c.finish();c.finish();assert.equal(c.api.getState(0).stage,'idle');assert.equal(c._cs.fighters[1].pvCur,500);assert.equal(c.api.getState(0).ammo,5);
});
test('Pavoisier finite protection is consumed automatically and firing sacrifices the remainder',()=>{
 const c=env('Pavoisier','A',10);c.act('close');c.act('load');c.enemy(10);c.finish();assert.equal(c._cs.fighters[0].pvCur,500);assert.equal(c._cs.fighters[0]._rfEffects.find(e=>e.kind==='shield').amount,14);c.act('shoot',{target:1});c.enemy(10);c.finish();assert.equal(c._cs.fighters[0].pvCur,490);assert.equal(c._cs.fighters[1].pvCur,468);
});
test('hands expose the Pugiliste and returning to guard removes the exposure, never a free third punch',()=>{
 const c=env('Pugiliste','A',2);c.act('punch',{target:1});c.act('punch',{target:1});assert.equal(c.act('punch',{target:1}).ok,false);c.enemy(10);c.finish();assert.equal(c._cs.fighters[0].pvCur,486);assert.equal(c._cs.fighters[1].pvCur,468);c.act('guard');c.enemy(10);c.finish();assert.equal(c._cs.fighters[0].pvCur,476);
});
test('Lutteur contact can be defended; a successful grip offers an automatic escape action',()=>{
 const defended=env('Lutteur','A',10);defended.act('grip',{target:1});defended.defend();defended.finish();assert.equal(defended.api.getState(0).stage,'idle');assert.equal(defended._cs.fighters[1].pvCur,500);
 const c=env('Lutteur','A',10);c.act('grip',{target:1});c.enemy(20);c.finish();assert.equal(c._cs.fighters[0].pvCur,500);c._cs.turn=1;assert.equal(c.api.perform(1,'break',{}).ok,true);c.finish();assert.equal(c.api.getState(0).stage,'idle');
});
test('Cestuaire banks actual residual damage, not the incoming attack value',()=>{
 const c=env('Cestuaire','A',10);c.act('arm');c.defend(0,'bloquer');c.enemy(20);c.finish();assert.equal(c._cs.fighters[0].pvCur,490);assert.equal(c.api.getState(0).pool,10);c.act('release',{target:1});c.finish();assert.equal(c._cs.fighters[1].pvCur,462);assert.equal(c.api.getState(0).pool,0);
});
test('flail cannot release on its preparation round and a paid defense cancels the rotation',()=>{
 const c=env('Porte-Fléau','A',2);c.act('wind',{target:1});assert.equal(c.act('release').ok,false);c.finish();c.cDeclareAction(0,'parer');assert.equal(c.act('release').ok,false);c.finish();assert.equal(c.api.getState(0).stage,'idle');assert.equal(c._cs.fighters[1].pvCur,500);
});
test('chain redistributes existing damage without creating damage and breaks on request',()=>{
 const c=env('Entraveur','A',10);c.act('link',{target:1,second:3});c.cDeclareAction(0,'frappe',{target:1,value:40});c.finish();assert.equal(c._cs.fighters[1].pvCur,470);assert.equal(c._cs.fighters[3].pvCur,490);
});
test('Barde gives immediate half protection and completes only attack then used defense',()=>{
 const c=env('Barde','A',2);c.act('sing',{target:2});c.enemy(5,2);c.finish();assert.equal(c._cs.fighters[2].pvCur,500);assert.equal(c.api.getState(0).sequence,0);assert.equal(c.act('close').ok,false);
 c._cs.decl[2]=[{action:'frappe',kind:'attack',value:10,target:1,consumeActions:1,epCost:0}];c.defend(2,'parer');c._cs.order=[0,2,1,3];c.enemy(20,2);c.finish();assert.equal(c.api.getState(0).sequence,2);assert.equal(c.act('close').ok,true);c.finish();assert.ok(c._cs.fighters[2]._rfEffects.some(e=>e.kind==='shield'&&e.amount===20&&!e.spent));
});
test('acid ticks automatically and rinse cancels all remaining ticks',()=>{
 const c=env('Alchimiste','A',2);c.act('brew');c.act('throw',{target:1});c.finish();assert.equal(c._cs.fighters[1].pvCur,490);c._cs.turn=1;assert.equal(c.api.perform(1,'rinse',{}).ok,true);c.finish();assert.equal(c._cs.fighters[1].pvCur,490);assert.equal(c.api.getState(0).vials,2);
});
test('Distillateur extracts a real remaining protection without duplication',()=>{
 const c=env('Distillateur','B',10);assert.equal(c.act('extract',{target:2}).ok,false);c._cs.fighters[2]._rfEffects=[{kind:'shield',owner:'id2',amount:24,expires:4}];assert.equal(c.act('extract',{target:2}).ok,true);c.finish();assert.equal(c.api.getState(0).pool,24);assert.ok(c._cs.fighters[2]._rfEffects[0].spent);c.act('release',{target:0});c.finish();assert.equal(c._cs.fighters[0]._rfEffects.find(e=>e.kind==='shield').amount,24);
});
test('Bastion debt is deferred, can be paid with actions, and settles without a second reduction',()=>{
 const c=env('Bastion','A',10);c.act('brace');c.enemy(40);c.finish();assert.equal(c._cs.fighters[0].pvCur,490);assert.equal(c.api.getState(0).debt,30);c.act('pay');c.finish();assert.equal(c._cs.fighters[0].pvCur,478);assert.equal(c.api.getState(0).debt,0);
});
test('Totémiste idole has no free turn and its destruction cancels stored charges',()=>{
 const c=env('Totémiste','A',10);c.act('plant');c.finish();const s=c.api.getState(0),idole=c._cs.fighters.find(f=>f._rfDevice);assert.ok(idole);assert.equal(c.cActionsMax(c._cs.fighters.indexOf(idole)),0);assert.equal(c._cs.order.includes(c._cs.fighters.indexOf(idole)),false);assert.equal(s.charges,1);c.act('command',{target:1});c.finish();assert.equal(c._cs.fighters[1].pvCur,466);c.enemy(50,c._cs.fighters.indexOf(idole));c.finish();assert.equal(c.api.getState(0).stage,'idle');assert.equal(c.act('plant').ok,false);
});
test('Astronome counterplay removes announced targets, preventing paid invalid release',()=>{
 const c=env('Astronome','A',10);c.act('align',{target:1,second:3});c.finish();c._cs.turn=1;assert.equal(c.api.perform(1,'eclipse',{}).ok,true);c.finish();assert.equal(c.act('release',{target:1}).ok,false);assert.equal(c.act('release',{target:3}).ok,true);c.finish();assert.equal(c._cs.fighters[3].pvCur,394);assert.equal(c._cs.fighters[1].pvCur,500);
});
test('Prismancien residual requires a real defense and another target',()=>{
 const c=env('Prismancien','B',10);c.act('shoot',{target:1});c.defend();c.finish();assert.equal(c.api.getState(0).pool,16);assert.equal(c.act('release',{target:1}).ok,false);assert.equal(c.act('release',{target:3}).ok,true);c.finish();assert.equal(c._cs.fighters[3].pvCur,446);
});
test('combat state, reserves and effects serialize and restore without free refill',()=>{
 const c=env('Arbalétrier','B',7);c.act('load');c.act('shoot',{target:1});c.finish();const snapshot=copy(c._cs);c._cs=copy(snapshot);assert.equal(c.api.getState(0).ammo,5);assert.equal(c.api.getState(0).loaded,1);assert.equal(c.act('shoot',{target:1}).ok,true);c.finish();assert.equal(c.api.getState(0).ammo,4);
});
test('legacy original oath path and old archived _np70 state are preserved',()=>{
 const c=env();c._cs.fighters[0]._np70={stage:'active',inventory:{bolt:3}};assert.equal(c.api.info(0),null);assert.equal(c.cGetAbilityOptions(0)[0].legacy,true);c._cs.active=false;c.combatStart();assert.equal(c._cs.fighters[0]._np70,undefined);assert.equal(c.api.info(0).entry.name,'Arbalétrier');
 c._cs.fighters[0].classe='Duelliste';assert.equal(c.api.info(0),null);assert.equal(c.cGetAbilityOptions(0)[0].legacy,true);
});

test('a reserved defense used before the Fléau turn breaks its pending release',()=>{
 const c=env('Porte-Fléau','A',2);c.act('wind',{target:1});c.finish();c.act('release');c.defend(0,'parer');c.enemy(20);c._cs.order=[1,0,2,3];c.finish();assert.equal(c._cs.fighters[1].pvCur,500);assert.equal(c.api.getState(0).stage,'idle');
});
test('Croisé taunt redirects a reforged shot at declaration and again at resolution',()=>{
 const c=env();c.act('load');c.cGetForcedTargetInfo=()=>({source:c._cs.fighters[1]});c.act('shoot',{target:3});assert.equal(c._cs.decl[0][1].target,1);c.finish();assert.equal(c._cs.fighters[1].pvCur,478);assert.equal(c._cs.fighters[3].pvCur,500);
});
test('Eclipse reserved by a slower enemy counters the announced ray before initiative resolution',()=>{
 const c=env('Astronome','B',10);c.act('align',{target:1});c.finish();c.act('release',{target:1});c._cs.turn=1;assert.equal(c.api.perform(1,'eclipse',{}).ok,true);c.finish();assert.equal(c._cs.fighters[1].pvCur,500);assert.equal(c._cs.fighters[1].epCur,496);
});
test('smoke only absorbs physical damage and survives beneficiary attacks',()=>{
 const c=env('Alchimiste','B',2);c.act('brew');c.act('throw',{target:2});c.finish();c._cs.decl[2]=[{action:'frappe',kind:'attack',value:10,target:1,consumeActions:1,epCost:0}];c.enemy(10,2);c.finish();assert.equal(c._cs.fighters[2].pvCur,500);let smoke=c._cs.fighters[2]._rfEffects.find(e=>e.smoke&&!e.spent);assert.equal(smoke.amount,22);c.enemy(10,2,{action:'capacite',emCost:3});c.finish();assert.equal(c._cs.fighters[2].pvCur,490);
});
test('an entirely absorbed impact cannot open a Pugiliste prepared punch',()=>{
 const c=env('Pugiliste','B',2);c.act('guard');c._cs.fighters[0]._rfEffects=[{kind:'shield',owner:'id2',amount:100,expires:4}];c.enemy(40);c.finish();assert.equal(c._cs.fighters[0].pvCur,500);assert.equal(c.api.getState(0).stage,'guard');assert.equal(c.act('punch',{target:1}).ok,false);
});
test('Bastion defers only one impact and an unpaid remainder settles once',()=>{
 const c=env('Bastion','A',10);c.act('brace');c.enemy(10);c.enemy(10);c.finish();assert.equal(c._cs.fighters[0].pvCur,490);assert.equal(c.api.getState(0).debt,10);c.finish();assert.equal(c._cs.fighters[0].pvCur,480);c.finish();assert.equal(c._cs.fighters[0].pvCur,480);
});
test('Veneur rescue opening follows actual harm to allies and is lost when the hunter is struck',()=>{
 const c=env('Veneur','B',10);c.act('mark',{target:1});c.enemy(10,2);c.finish();assert.equal(c.api.getState(0).charges,1);c.enemy(10,0);c.finish();assert.equal(c.api.getState(0).charges,0);c.enemy(10,2);c.finish();assert.equal(c.api.getState(0).charges,1);c.act('strike',{target:1});c.finish();assert.equal(c._cs.fighters[1].pvCur,458);
});
test('Distillateur can purge native poison, but never restores lost PV or invents material',()=>{
 const c=env('Distillateur','A',10);c._cs.fighters[2].statuts=[{id:'empoisonne',tours:2}];c._cs.fighters[2].pvCur=430;c.act('extract',{target:2});c.finish();assert.equal(c._cs.fighters[2].statuts.length,0);assert.equal(c._cs.fighters[2].pvCur,430);assert.equal(c.api.getState(0).pool,30);c.act('release',{target:1});c.finish();assert.equal(c._cs.fighters[1].pvCur,470);c.act('mother');c.finish();assert.equal(c.api.getState(0).pool,14);c.act('release',{target:1});c.finish();assert.equal(c.act('mother').ok,false);
});
test('corrosion hurts through the afterHurt event and breaks a risky gem',()=>{
 const c=env('Orfèvre','B',10);c.act('grow');c._cs.fighters[0]._rfEffects=[{kind:'acid',owner:'id1',amount:5,ticks:2,expires:4}];c.finish();assert.equal(c._cs.fighters[0].pvCur,495);assert.equal(c.api.getState(0).stage,'idle');
});
test('magical grip stops a native heal declared before the grip resolves',()=>{
 const c=env('Lutteur','B',10);c._cs.fighters[1].pvCur=400;c.act('grip',{target:1});c._cs.decl[1]=[{action:'soin',kind:'heal',emCost:5,epCost:0,consumeActions:1,healAmt:40,healTarget:1}];c.finish();assert.equal(c._cs.fighters[1].pvCur,400);assert.ok(c.logs.some(v=>v.includes('capacité énergétique interrompue')));
});
test('blood declarations reserve their future HP payments and reject an unaffordable second wager',()=>{
 const c=env('Ravageur','B',10);c._cs.fighters[0].pvCur=10;assert.equal(c.act('strike',{target:1}).ok,true);assert.equal(c.act('strike',{target:1}).ok,false);c.finish();assert.equal(c._cs.fighters[0].pvCur,6);
});
test('actual interposed defender drives defense watchers, not the original victim',()=>{
 const c=env('Guetteur','B',10);c.act('load');c.act('watch',{target:3});c.finish();c._cs.fighters[3].type='beast';c.cFindAutoInterpose=t=>t===c._cs.fighters[1]?c._cs.fighters[3]:null;c.defend(3,'parer');c._cs.decl[2]=[{action:'frappe',kind:'attack',value:20,target:1,consumeActions:1,epCost:0}];c.finish();assert.equal(c._cs.fighters[1].pvCur,500);assert.equal(c._cs.fighters[3].pvCur,455);assert.equal(c.api.getState(0).stage,'idle');
});

test('one real Undo restores conjonction, reserved counter and resources before resolution',()=>{
 const c=env('Astronome','B',10);c._csHist=[];vm.runInContext(realFunction('combatSnapshot'),c);vm.runInContext(realFunction('combatUndo'),c);c.act('align',{target:1});c.finish();c.act('release',{target:1});c._cs.turn=1;c.api.perform(1,'eclipse',{});c._cs.phase='resolution';const before=JSON.stringify(c._cs),hist=c._csHist.length;c.combatResolve();assert.equal(c._csHist.length,hist+1,'Exactly one resolution snapshot');c.combatUndo();assert.equal(JSON.stringify(c._cs),before);assert.equal(c._cs.decl[1][0].rf.resolved,undefined);
});
test('an unaffordable eclipse never clears the conjonction for free',()=>{
 const c=env('Astronome','B',10);c.act('align',{target:1});c.finish();c.act('release',{target:1});c._cs.turn=1;c.api.perform(1,'eclipse',{});c._cs.fighters[1].epCur=3;c.finish();assert.ok(c._cs.fighters[1].pvCur<500);assert.equal(c._cs.fighters[1].epCur,3);
});
test('removing a fighter keeps an idole outside initiative and next-declarant skips archived devices',()=>{
 const c=env('Totémiste','A',10);vm.runInContext(realFunction('_nextDeclarant'),c);vm.runInContext(realFunction('combatRemoveFighter'),c);c.act('plant');c.finish();c.combatRemoveFighter(2);const deviceIndex=c._cs.fighters.findIndex(f=>f._rfDevice);assert.ok(deviceIndex>=0);assert.equal(c._cs.order.includes(deviceIndex),false);c._cs.order=[deviceIndex,0,1];c._cs.turn=0;c._nextDeclarant();assert.equal(c._cs.order[c._cs.turn],0);
});

test('automatic interposition redirects acid and grip contacts, including their defense and effects',()=>{
 for(const name of ['Alchimiste','Lutteur']){const c=env(name,'A',10);c.cFindAutoInterpose=t=>t===c._cs.fighters[1]?c._cs.fighters[3]:null;if(name==='Alchimiste'){c.act('brew');c.act('throw',{target:1});}else c.act('grip',{target:1});c.defend(3,'parer');c.finish();assert.equal(c._cs.fighters[1].pvCur,500);assert.equal(c._cs.fighters[3].pvCur,500);assert.equal((c._cs.fighters[1]._rfEffects||[]).length,0);assert.equal((c._cs.fighters[3]._rfEffects||[]).length,0);}
 const c=env('Lutteur','A',10);c.cFindAutoInterpose=t=>t===c._cs.fighters[1]?c._cs.fighters[3]:null;c.act('grip',{target:1});c.finish();assert.ok(c._cs.fighters[3]._rfEffects.some(e=>e.kind==='grip'));assert.equal(c.api.getState(0).targets[0],'id3');
});
test('old scene utilities dispatched as attack-kind never trigger a new reserved shot',()=>{
 const c=env('Guetteur','A',10);c.act('load');c.act('watch',{target:1});c.finish();c._cs.decl[1]=[{action:'np70',kind:'attack',consumeActions:1,epCost:0,emCost:2,value:0,np70:{op:{id:'prepare'},context:{}}}];c.finish();assert.equal(c._cs.fighters[1].pvCur,500);
});

test('settling an existing debt never adds or consumes a newly applied Brise-Armure bonus',()=>{
 const c=env('Bastion','A',10);c.act('brace');c.enemy(10);c.finish();assert.equal(c.api.getState(0).debt,10);c.enemy(2,0,{briseArmure:7});c.finish();assert.equal(c._cs.fighters[0].pvCur,488);assert.equal(c._cs.fighters[0].briseArmureBonus,7);
});
test('a corrosion tick is not a new weapon hit and preserves Brise-Armure for an actual strike',()=>{
 const c=env('Alchimiste','A',2);c.act('brew');c.act('throw',{target:1});c._cs.fighters[1].briseArmureBonus=7;c.finish();assert.equal(c._cs.fighters[1].pvCur,490);assert.equal(c._cs.fighters[1].briseArmureBonus,7);
});
