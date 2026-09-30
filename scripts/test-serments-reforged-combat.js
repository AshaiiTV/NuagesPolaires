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
function env(name='Arbalétrier',key='A',level=2,realBudgets=false){
 const definitions=Object.fromEntries(contract.entries.map(e=>[e.name,{reforged:true,dmg:20,branches:e.branches.map(b=>({key:b.key,nom:b.name,combatRules:{key:b.key},paliers:b.levels.map(niv=>({niv,nom:b.name}))}))}]));
 const players=[{id:'p0',name:'Porteur',classe:name,branch:key,level}];
 const c={console,Math,JSON,Date,Number,String,Object,Array,Infinity,logs:[],attacks:[],CU:{type:'staff'},document:null,STATUT_EFFECTS:{},setTimeout:()=>{},combatSnapshot:()=>{},combatQueueFx:()=>{},combatPlayPendingFx:()=>{},cTickShieldCallTaunts:()=>{},cTickStatuts:()=>{},cFindAutoInterpose:()=>null,cApplyElementalLogic:(f,a,t,d)=>({dmg:d}),cAddOrRefreshStatut:()=>{},openDropModal:()=>{},rCombat:()=>{},notif:x=>c.logs.push(x),cLog:x=>c.logs.push(x),_nextDeclarant:()=>{if(c._cs.turn>=c._cs.order.length)c._cs.phase='resolution';},cEnsureFighterCid:f=>(f.cid||= 'id'+c._cs.fighters.indexOf(f)),cActionsMax:()=>3,cGetAbilityOptions:()=>[{legacy:true}],cBuildAbilityOptionsForPalier:()=>[{legacy:true}],cRenderAbilityButtons:()=>'<legacy>',combatStart:()=>{c._cs.active=true;c._cs.round=1;c._cs.phase='declaration';c._cs.order=c._cs.fighters.map((_,i)=>i);},cGetForcedTargetInfo:()=>null};
 c.window=c;c._cs={active:true,phase:'declaration',round:1,turn:0,order:[0,1,2,3],decl:{},_usedDefs:{},log:[],fighters:[{pid:'p0',name:'Porteur',classe:name,type:'player',level,pvCur:500,pvMax:500,epCur:500,emCur:500,statuts:[]},{name:'Ennemi',type:'beast',pvCur:500,pvMax:500,epCur:500,emCur:500,statuts:[]},{name:'Allié',type:'player',pvCur:500,pvMax:500,epCur:500,emCur:500,statuts:[]},{name:'Autre ennemi',type:'beast',pvCur:500,pvMax:500,epCur:500,emCur:500,statuts:[]}]};
 c.cGetFighterPlayer=fi=>players.find(p=>p.id===c._cs.fighters[fi].pid);c.getPlayerSermentBundle=p=>({branch:definitions[p.classe].branches.find(b=>b.key===p.branch)});c.getAllSD=()=>definitions;c.cDeclCount=fi=>(c._cs.decl[fi]||[]).reduce((n,a)=>n+(a.consumeActions||1),0);c.cActionsLeft=fi=>Math.max(0,c.cActionsMax(fi)-c.cDeclCount(fi));
 c.cDeclareAction=(fi,action,opts={})=>{const a={action,kind:['frappe','pugilat','capacite'].includes(action)?'attack':'utility',consumeActions:1,epCost:action==='frappe'?6:action==='parer'?0:action==='esquive'?8:0,emCost:0,value:20,target:1,...opts};(c._cs.decl[fi]||=[]).push(a);if(c.cActionsLeft(fi)<=0){c._cs.turn++;c._nextDeclarant();}return a;};
 vm.createContext(c);['cGetAttackTargets','cApplyRawDamage','cResolveAttackInstance','combatResolve'].forEach(n=>vm.runInContext(realFunction(n),c));
 if(realBudgets){
  const progression=require('../assets/js/progression.js'),definition=require('../assets/js/serments-reforged-data.js').definitions[name],growth=progression.effectiveDefinition(name);
  assert.deepEqual(growth,{pvN:definition.pvN,epN:definition.epN,emN:definition.emN},'The budget uses the same growth as the actual oath definition');
  const leveled=progression.normalizePlayer({classe:name,level:1,xp:0,xpMax:30,sLevel:level,sXp:0,sXpMax:level*10,pvMax:30,pvCur:30,epMax:50,epCur:50,emMax:20,emCur:20},definition);
  assert.equal(leveled.level,level);Object.assign(players[0],leveled);Object.assign(c._cs.fighters[0],leveled);definitions[name].dmg=definition.dmg;c.initialBudget=copy(leveled);
  c._cs.fighters.forEach(f=>{f.level=level;});
  ['cDecl','cDeclCount','cActionsLeft','cGetDeclaredTargetActionBonus','cGetFighterActionDebuff','cGetFighterActionBonus','cActionsMax','cDeclareAction'].forEach(n=>vm.runInContext(realFunction(n),c));
 }
 vm.runInContext(engine,c);c.api=c.NPSermentsReforgedCombat;c.players=players;c.definitions=definitions;
 c.act=(id,params={})=>c.api.perform(0,id,params);
 c.finish=()=>{if(realBudgets){assert.equal(c.cActionsMax(0),3,'Same-level encounter has three actions');assert.ok(c.cDeclCount(0)<=3,'The cycle must fit in its actual action budget');}c._cs.phase='resolution';c.combatResolve();};
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
 const c=env('Guetteur','A',10);c.act('load');c.act('watch',{target:1});c.enemy(20);c.enemy(20);c.finish();assert.equal(c._cs.fighters[1].pvCur,448);assert.equal(c._cs.fighters[0].pvCur,460);assert.equal(c.api.getState(0).ammo,5);assert.equal(c.api.getState(0).stage,'idle');assert.equal(c._cs.fighters[0].emCur,496);
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
 const c=env('Barde','A',2);c.act('sing',{target:2});c.enemy(5,2);c.finish();assert.equal(c._cs.fighters[2].pvCur,500);assert.equal(c.api.getState(0).sequence,0);assert.equal(c.api.getOptions(0).find(o=>o.rf.id==='close').disabled,false);
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
test('Totémiste idole has no free turn and reconstruction starts empty after destruction',()=>{
 const c=env('Totémiste','A',10);c.act('plant');c.finish();const s=c.api.getState(0),idole=c._cs.fighters.find(f=>f._rfDevice);assert.ok(idole);assert.equal(c.cActionsMax(c._cs.fighters.indexOf(idole)),0);assert.equal(c._cs.order.includes(c._cs.fighters.indexOf(idole)),false);assert.equal(s.charges,1);c.act('command',{target:1});c.finish();assert.equal(c._cs.fighters[1].pvCur,466);c.enemy(50,c._cs.fighters.indexOf(idole));c.finish();assert.equal(c.api.getState(0).stage,'idle');assert.equal(c.act('plant').ok,true);assert.equal(c.act('command',{target:1}).ok,false);c.finish();assert.equal(c.api.getState(0).charges,0);assert.equal(c._cs.fighters.filter(f=>f._rfDevice&&f.pvCur>0).length,1);
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
test('an impact entirely absorbed by an earlier outside shield cannot open a Pugiliste prepared punch',()=>{
 const c=env('Pugiliste','B',2);c.act('guard');c._cs.fighters[0]._rfEffects=[{kind:'shield',owner:'id2',amount:100,expires:4}];c.enemy(40);c.finish();assert.equal(c._cs.fighters[0].pvCur,500);assert.equal(c.api.getState(0).stage,'guard');assert.equal(c.act('punch',{target:1}).ok,false);
});
test('Bastion defers only one impact and an unpaid remainder settles once',()=>{
 const c=env('Bastion','A',10);c.act('brace');c.enemy(10);c.enemy(10);c.finish();assert.equal(c._cs.fighters[0].pvCur,490);assert.equal(c.api.getState(0).debt,10);c.finish();assert.equal(c._cs.fighters[0].pvCur,480);c.finish();assert.equal(c._cs.fighters[0].pvCur,480);
});
test('Veneur rescue opening follows actual harm to allies and is lost when the hunter is struck',()=>{
 const c=env('Veneur','B',10);c.act('mark',{target:1});c.enemy(10,2);c.finish();assert.equal(c.api.getState(0).charges,1);c.enemy(10,0);c.finish();assert.equal(c.api.getState(0).charges,0);c.enemy(10,2);c.finish();assert.equal(c.api.getState(0).charges,1);c.act('strike',{target:1});c.finish();assert.equal(c._cs.fighters[1].pvCur,458);
});
test('Distillateur purges the real poison remainder and can pay for another mother dose',()=>{
 const c=env('Distillateur','A',10);c._cs.fighters[2].statuts=[{id:'empoisonne',tours:2}];c._cs.fighters[2].pvCur=430;c.act('extract',{target:2});c.finish();assert.equal(c._cs.fighters[2].statuts.length,0);assert.equal(c._cs.fighters[2].pvCur,430);assert.equal(c.api.getState(0).pool,50);c.act('release',{target:1});c.finish();assert.equal(c._cs.fighters[1].pvCur,450);c.act('mother');c.finish();assert.equal(c.api.getState(0).pool,32);c.act('release',{target:1});c.finish();assert.equal(c.act('mother').ok,true);
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
 const c=env('Guetteur','B',10);c.act('load');c.act('watch',{target:3});c.finish();c._cs.fighters[3].type='beast';c.cFindAutoInterpose=t=>t===c._cs.fighters[1]?c._cs.fighters[3]:null;c.defend(3,'parer');c._cs.decl[2]=[{action:'frappe',kind:'attack',value:20,target:1,consumeActions:1,epCost:0}];c.finish();assert.equal(c._cs.fighters[1].pvCur,500);assert.equal(c._cs.fighters[3].pvCur,433);assert.equal(c.api.getState(0).stage,'idle');
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

test('a paid projected escape allows the next two attacks without removing the real grip early',()=>{
 const c=env('Pugiliste','A',2);c._cs.fighters[0]._rfEffects=[{kind:'grip',owner:'id1',mode:'weapon',expires:5}];
 assert.equal(c.act('punch',{target:1}).ok,false);assert.equal(c.act('break').ok,true);
 assert.equal(c._cs.fighters[0]._rfEffects[0].spent,undefined);
 assert.equal(c.api.getOptions(0).find(o=>o.rf.id==='punch').disabled,false);
 assert.equal(c.act('punch',{target:1}).ok,true);assert.equal(c.act('punch',{target:1}).ok,true);
 assert.equal(c.cActionsLeft(0),0);c.finish();
 assert.equal(c._cs.fighters[1].pvCur,468);assert.equal(c._cs.fighters[0].epCur,486);assert.equal(c._cs.fighters[0].emCur,496);assert.equal(c._cs.fighters[0]._rfEffects[0].spent,true);
});
test('escape undo restores restrictions and an attack before escape is still blocked at resolution',()=>{
 const c=env('Lutteur','A',10);c._cs.fighters[0]._rfEffects=[{kind:'grip',owner:'id1',mode:'weapon',expires:5}];
 c.act('break');assert.ok(c.cDeclareAction(0,'frappe',{target:1}));c._cs.decl[0].pop();c._cs.decl[0].pop();
 assert.equal(c.cDeclareAction(0,'frappe',{target:1}).ok,false);
 c._cs.decl[0]=[{action:'frappe',kind:'attack',consumeActions:1,epCost:6,value:20,target:1}];
 c.act('break');c.finish();assert.equal(c._cs.fighters[1].pvCur,500);assert.equal(c._cs.fighters[0]._rfEffects[0].spent,true);
});
test('exhausted pavois reopens without a cancel action and preserves loaded ammunition',()=>{
 const c=env('Pavoisier','A',10);c.act('load');c.act('close');c.enemy(30);c.finish();
 assert.equal(c.api.getState(0).stage,'idle');assert.equal(c.api.getState(0).ammo,6);assert.equal(c.api.getState(0).loaded,1);
 assert.equal(c.act('close').ok,true);assert.equal(c.cActionsLeft(0),2);c.finish();
 assert.equal(c._cs.fighters[0].pvCur,494);assert.equal(c._cs.fighters[0].epCur,490);assert.equal(c._cs.fighters[0].emCur,492);
});
test('settling all debt permits a new brace in the same declaration without a cancel tax',()=>{
 const c=env('Bastion','A',10);c.act('brace');c.enemy(10);c.finish();assert.equal(c.api.getState(0).debt,10);
 assert.equal(c.act('pay').ok,true);assert.equal(c.api.getState(0).stage,'idle');assert.equal(c.act('brace').ok,true);
 c.enemy(25);c.finish();assert.equal(c.api.getState(0).debt,25);assert.equal(c._cs.fighters[0].pvCur,500);assert.equal(c._cs.fighters[0].epCur,490);assert.equal(c._cs.fighters[0].emCur,492);
});
test('Guetteur can choose a direct 42 damage shot or a paid conditional 52 damage reservation at level 10',()=>{
 for(const key of ['A','B']){
  const c=env('Guetteur',key,10);assert.equal(c.act('load').ok,true);assert.equal(c.act('shoot',{target:1}).ok,true);c.finish();
  assert.equal(c._cs.fighters[1].pvCur,458);assert.equal(c._cs.fighters[0].epCur,490);assert.equal(c._cs.fighters[0].emCur,500);assert.equal(c.api.getState(0).ammo,5);
  const watch=c.api.describe('Guetteur',key,10).operations.find(o=>o.id==='watch');assert.match(watch.rule,/52 dégâts/);assert.equal(watch.cost.actions,1);assert.equal(watch.cost.em,4);
 }
});
test('Pugiliste guard is spent on its first contributing direct impact even without a wound',()=>{
 const c=env('Pugiliste','B',2);c.act('guard');c.enemy(8);c.enemy(8);c.finish();
 assert.equal(c._cs.fighters[0].pvCur,492,'Only the first hit receives the guard');assert.equal(c.api.getState(0).stage,'opening');
 assert.equal(c._cs.fighters[0]._rfEffects.find(e=>e.opensGuard).spent,true);assert.equal(c.act('punch',{target:1}).ok,true);c.finish();assert.equal(c._cs.fighters[1].pvCur,474);
});
test('poison and corrosion never open a Pugiliste punch or consume its direct-impact guard',()=>{
 const c=env('Pugiliste','B',2);c.act('guard');c._cs.fighters[0]._rfEffects=[{kind:'acid',owner:'id1',amount:5,ticks:2,expires:4}];c.finish();
 assert.equal(c._cs.fighters[0].pvCur,495);assert.equal(c.api.getState(0).stage,'guard');assert.equal(c.act('punch',{target:1}).ok,false);
 const guard=c._cs.fighters[0]._rfEffects.find(e=>e.opensGuard);assert.equal(guard.amount,10);assert.equal(guard.spent,undefined);
 c.cApplyRawDamage(c._cs.fighters[0],3);assert.equal(c.api.getState(0).stage,'guard');assert.equal(guard.amount,10);
});
test('Rune de patience consumes its full single-impact reserve on the first hit',()=>{
 const c=env('Enchanteur','B',2);c.act('inscribe',{target:0});c.enemy(8);c.enemy(8);c.finish();
 assert.equal(c._cs.fighters[0].pvCur,492);assert.equal(c._cs.fighters[0]._rfEffects.find(e=>e.breakOnAttack).spent,true);assert.equal(c.api.getState(0).stage,'idle');
});
test('Bastion supports a single companion and one unchanged pool serves two companions',()=>{
 const c=env('Bastion','B',10);assert.equal(c.act('raise',{target:2}).ok,true);c.enemy(20,2);c.finish();assert.equal(c.api.getState(0).pool,40);assert.equal(c._cs.fighters[2].pvCur,500);
 const two=env('Bastion','B',10);two._cs.fighters[3].type='player';assert.equal(two.act('raise',{target:2,second:3}).ok,true);two.enemy(40,2);two.enemy(40,3);two.finish();assert.equal(two._cs.fighters[2].pvCur,500);assert.equal(two._cs.fighters[3].pvCur,480);assert.equal(two.api.getState(0).stage,'idle');
 const invalid=env('Bastion','B',10);assert.equal(invalid.act('raise',{target:0}).ok,false);assert.equal(invalid.act('raise',{target:2,second:2}).ok,false);
});
test('Veneur and Astronome can prepare against one enemy without accepting duplicate second targets',()=>{
 const v=env('Veneur','A',10);assert.equal(v.act('mark',{target:1,second:1}).ok,false);assert.equal(v.act('mark',{target:1}).ok,true);v.enemy(5);v.finish();assert.equal(v.act('strike',{target:1}).ok,true);v.finish();assert.equal(v._cs.fighters[1].pvCur,458);
 const a=env('Astronome','A',10);assert.equal(a.act('align',{target:1,second:1}).ok,false);assert.equal(a.act('align',{target:1}).ok,true);assert.equal(a.act('release',{target:1}).ok,false);a.finish();assert.equal(a.act('release',{target:1}).ok,true);a.finish();assert.equal(a._cs.fighters[1].pvCur,394);
});
test('Tisserand gives one solo bonus or one ordered two-person relay without duplicating it',()=>{
 const c=env('Tisserand','A',10);assert.equal(c.act('weave',{target:0}).ok,true);c.cDeclareAction(0,'frappe',{target:1});c.cDeclareAction(0,'frappe',{target:1});c.finish();assert.equal(c._cs.fighters[1].pvCur,432);assert.equal(c.api.getState(0).stage,'idle');assert.equal(c._cs.fighters[0].emCur,493);
 const two=env('Tisserand','A',10);two.act('weave',{target:0,second:2});two.cDeclareAction(0,'frappe',{target:1});two._cs.decl[2]=[{action:'frappe',kind:'attack',consumeActions:1,epCost:6,value:20,target:1},{action:'frappe',kind:'attack',consumeActions:1,epCost:6,value:20,target:1}];two.finish();assert.equal(two._cs.fighters[1].pvCur,398);assert.equal(two.api.getState(0).stage,'idle');
});
test('Tisserand protection remains a single pool with either one or two beneficiaries',()=>{
 const solo=env('Tisserand','B',10);solo.act('weave',{target:0});solo.enemy(60);solo.finish();assert.equal(solo._cs.fighters[0].pvCur,492);
 const duo=env('Tisserand','B',10);duo.act('weave',{target:0,second:2});duo.enemy(30,0);duo.enemy(30,2);duo.finish();assert.equal(duo._cs.fighters[0].pvCur,500);assert.equal(duo._cs.fighters[2].pvCur,492);assert.equal(duo.api.getState(0).stage,'idle');
});
test('Orfèvre choice pays two actions and eight EM for a real level-10 attack or protection payoff',()=>{
 const attack=env('Orfèvre','A',10);attack.act('grow');attack.act('attack',{target:0});attack.cDeclareAction(0,'frappe',{target:1});attack.finish();assert.equal(attack._cs.fighters[1].pvCur,440);assert.equal(attack._cs.fighters[0].emCur,492);assert.equal(attack._cs.fighters[0].epCur,494);
 const guard=env('Orfèvre','A',10);guard.act('grow');guard.act('protect',{target:0});guard.enemy(70);guard.finish();assert.equal(guard._cs.fighters[0].pvCur,490);assert.equal(guard._cs.fighters[0].emCur,492);
 const risk=env('Orfèvre','B',10);risk.act('grow');risk.finish();risk.finish();assert.equal(risk.api.getState(0).facets,3);risk.act('attack',{target:0});risk.cDeclareAction(0,'frappe',{target:1});risk.finish();assert.equal(risk._cs.fighters[1].pvCur,426);
});
test('both Distillateur branches can pay for an autonomous mother dose and repeat only after emptying it',()=>{
 for(const key of ['A','B']){const c=env('Distillateur',key,10);assert.equal(c.act('mother').ok,true);assert.equal(c.act('mother').ok,false);assert.equal(c.act('release',{target:key==='A'?1:0}).ok,true);assert.equal(c.cActionsLeft(0),1);c.finish();assert.equal(c._cs.fighters[0].emCur,495);assert.equal(c._cs.fighters[0].epCur,498);if(key==='A')assert.equal(c._cs.fighters[1].pvCur,468);else assert.equal(c._cs.fighters[0]._rfEffects.find(e=>e.kind==='shield').amount,32);assert.equal(c.act('mother').ok,true);c.finish();assert.equal(c.api.getState(0).pool,32);assert.equal(c._cs.fighters[0].emCur,490);}
});
test('Distillateur extraction preserves small real values and caps large ones without a duplicate effect',()=>{
 const c=env('Distillateur','B',10);c._cs.fighters[2]._rfEffects=[{kind:'shield',owner:'id2',amount:120,expires:4}];c.act('extract',{target:2});c.finish();assert.equal(c.api.getState(0).pool,80);assert.equal(c._cs.fighters[2]._rfEffects[0].spent,true);c.act('release',{target:0});c.finish();assert.equal(c._cs.fighters[0]._rfEffects.find(e=>e.kind==='shield').amount,80);
});
test('Totémiste reconstruction and voluntary dismantling never refill the first free charge',()=>{
 const c=env('Totémiste','A',20);c.act('plant');c.finish();assert.equal(c.act('plant').ok,false);c.act('dismantle');assert.equal(c.act('plant').ok,true);assert.equal(c.act('command',{target:1}).ok,false);assert.equal(c.act('charge').ok,true);c.finish();assert.equal(c.api.getState(0).charges,2);assert.equal(c._cs.fighters.filter(f=>f._rfDevice&&f.pvCur>0).length,1);assert.equal(c._cs.fighters[0].emCur,482);assert.equal(c._cs.fighters[0].epCur,494);
 c._cs=copy(c._cs);c.act('dismantle');c.act('plant');c.finish();assert.equal(c.api.getState(0).charges,0);assert.equal(c.api.getState(0).planted,true);
});
test('Barde can pay the closing action before allied contributions and it resolves only once',()=>{
 const c=env('Barde','A',2);c.act('sing',{target:2});assert.equal(c.act('close').ok,true);assert.equal(c.act('close').ok,false);
 assert.equal(c.api.getState(0).closeQueued,true);assert.equal(c._cs.fighters[0].emCur,500);
 c._cs.decl[2]=[{action:'frappe',kind:'attack',consumeActions:1,epCost:6,value:20,target:1}];c.defend(2,'parer');c.enemy(20,2);c._cs.order=[0,2,1,3];c.finish();
 assert.equal(c._cs.fighters[0].emCur,494);assert.equal(c._cs.fighters[2].pvCur,495);assert.equal(c._cs.fighters[2]._rfEffects.find(e=>e.kind==='shield'&&!e.spent).amount,20);assert.equal(c.api.getState(0).closeQueued,false);assert.equal(c.api.getState(0).stage,'idle');
 c.enemy(5,2);c.finish();assert.equal(c._cs.fighters[2]._rfEffects.find(e=>e.kind==='shield'&&!e.spent).amount,15);assert.equal(c._cs.fighters[0].emCur,494);
});
test('Barde reserved closing still requires attack before defense, not the reverse',()=>{
 const c=env('Barde','A',2);c.act('sing',{target:2});c.act('close');c._cs.decl[2]=[{action:'frappe',kind:'attack',consumeActions:1,epCost:6,value:20,target:1}];c.defend(2,'parer');c.enemy(20,2);c._cs.order=[0,1,2,3];c.finish();assert.equal(c.api.getState(0).closeQueued,true);assert.equal(c.api.getState(0).sequence,1);assert.equal(c._cs.fighters[2]._rfEffects.some(e=>!e.spent&&e.amount===20),false);
});
test('Chœur attack closing waits for two ordered voices then grants one later attack bonus',()=>{
 const c=env('Chef de Chœur','A',10);const bonus=c.api.info(0).power*2;c.act('conduct',{target:0,second:2});assert.equal(c.act('close').ok,true);c.cDeclareAction(0,'frappe',{target:1});c._cs.decl[2]=[{action:'frappe',kind:'attack',consumeActions:1,epCost:6,value:20,target:1},{action:'frappe',kind:'attack',consumeActions:1,epCost:6,value:20,target:1}];c.finish();assert.equal(c._cs.fighters[1].pvCur,500-60-bonus);assert.equal(c._cs.fighters[0].emCur,492);assert.equal(c.api.getState(0).stage,'idle');assert.equal(c._cs.fighters[2]._rfEffects.find(e=>e.kind==='power').spent,true);
});
test('Chœur defense closing protects both voices after their actual defenses, with one payment',()=>{
 const c=env('Chef de Chœur','B',10);const pool=c.api.info(0).pool;c.act('conduct',{target:0,second:2});c.act('close');c.defend(0,'parer');c.defend(2,'parer');c.enemy(20,0);c.enemy(20,2);c.finish();assert.equal(c.api.getState(0).stage,'idle');assert.equal(c._cs.fighters[0].emCur,492);for(const fi of [0,2]){assert.equal(c._cs.fighters[fi].pvCur,485);assert.equal(c._cs.fighters[fi]._rfEffects.find(e=>e.kind==='shield'&&!e.spent).amount,pool);}
});
test('reserved closing survives serialization and disappears on cancellation or expiry',()=>{
 const c=env('Barde','A',2);c.act('sing',{target:2});c.act('close');c.finish();c._cs=copy(c._cs);assert.equal(c.api.getState(0).closeQueued,true);c.act('cancel');c.finish();assert.equal(c.api.getState(0).closeQueued,false);assert.equal(c.api.getState(0).stage,'idle');assert.equal(c._cs.fighters[2]._rfEffects.some(e=>!e.spent),false);
 const expiry=env('Chef de Chœur','A',10);expiry.act('conduct',{target:0,second:2});expiry.act('close');expiry.finish();expiry.finish();expiry.finish();assert.equal(expiry.api.getState(0).closeQueued,false);assert.equal(expiry.api.getState(0).stage,'idle');assert.equal(expiry._cs.fighters[0].emCur,492);assert.equal((expiry._cs.fighters[2]._rfEffects||[]).length,0);
});
test('removing a closing declaration or losing its reserved EM never grants the final effect',()=>{
 const c=env('Barde','A',2);c.act('sing',{target:2});c.act('close');c._cs.decl[0].pop();assert.equal(c.api.getState(0).closeQueued,false);c.act('close');c._cs.fighters[0].emCur=4;c._cs.decl[2]=[{action:'frappe',kind:'attack',consumeActions:1,epCost:6,value:20,target:1}];c.defend(2,'parer');c.enemy(20,2);c._cs.order=[0,2,1,3];c.finish();assert.equal(c._cs.fighters[0].emCur,0);assert.equal(c.api.getState(0).closeQueued,false);assert.equal(c.api.getState(0).sequence,2);assert.equal(c._cs.fighters[2]._rfEffects.some(e=>!e.spent&&e.amount===20),false);
});
test('one real Undo restores reserved closing, contributed voices, shields and paid resources',()=>{
 const c=env('Barde','A',2);c._csHist=[];vm.runInContext(realFunction('combatSnapshot'),c);vm.runInContext(realFunction('combatUndo'),c);c.act('sing',{target:2});c.act('close');c._cs.decl[2]=[{action:'frappe',kind:'attack',consumeActions:1,epCost:6,value:20,target:1}];c.defend(2,'parer');c.enemy(20,2);c._cs.order=[0,2,1,3];c._cs.phase='resolution';const before=JSON.stringify(c._cs);c.combatResolve();assert.equal(c.api.getState(0).stage,'idle');c.combatUndo();assert.equal(JSON.stringify(c._cs),before);assert.equal(c.api.getState(0).closeQueued,true);
});

test('first-unlock cycles are affordable with actual progression reserves and native three-action turns',()=>{
 function spentExactly(c,ep,em){assert.equal(c._cs.fighters[0].epCur,c.initialBudget.epMax-ep);assert.equal(c._cs.fighters[0].emCur,c.initialBudget.emMax-em);assert.ok(c._cs.fighters[0].epCur>0);assert.ok(c._cs.fighters[0].emCur>0);}
 function use(c,id,params){assert.equal(c.act(id,params).ok,true,c._cs.fighters[0].classe+' can afford '+id);}
 const guetteur=env('Guetteur','A',10,true);
 assert.equal(guetteur.initialBudget.epMax,113);assert.equal(guetteur.initialBudget.emMax,38);
 use(guetteur,'load');use(guetteur,'shoot',{target:1});assert.equal(guetteur.cActionsLeft(0),1);guetteur.finish();spentExactly(guetteur,10,0);assert.equal(guetteur._cs.fighters[1].pvCur,458);
 use(guetteur,'load');use(guetteur,'watch',{target:1});guetteur.enemy(5);guetteur.finish();spentExactly(guetteur,20,4);assert.equal(guetteur._cs.fighters[1].pvCur,406);assert.equal(guetteur.api.getState(0).ammo,4);
 for(const key of ['A','B']){
  const distillateur=env('Distillateur',key,10,true);assert.equal(distillateur.initialBudget.epMax,77);assert.equal(distillateur.initialBudget.emMax,65);
  for(let cycle=1;cycle<=2;cycle++){use(distillateur,'mother');use(distillateur,'release',{target:key==='A'?1:0});assert.equal(distillateur.cActionsLeft(0),1);distillateur.finish();spentExactly(distillateur,2*cycle,5*cycle);}
  if(key==='A')assert.equal(distillateur._cs.fighters[1].pvCur,436);else assert.equal(distillateur._cs.fighters[0]._rfEffects.find(e=>e.kind==='shield'&&!e.spent).amount,32);
 }
 for(const operation of ['attack','protect']){
  const orfevre=env('Orfèvre','A',10,true);use(orfevre,'grow');use(orfevre,operation,{target:0});assert.equal(orfevre.cActionsLeft(0),1);
  if(operation==='attack'){orfevre.cDeclareAction(0,'frappe',{target:1});assert.equal(orfevre.cActionsLeft(0),0);}else orfevre.enemy(10);
  orfevre.finish();spentExactly(orfevre,operation==='attack'?6:0,8);
  if(operation==='attack')assert.equal(orfevre._cs.fighters[1].pvCur,445,'Native damage 5 + level 10, plus the gem 40');else assert.equal(orfevre._cs.fighters[0].pvCur,orfevre.initialBudget.pvMax);
 }
 const tisserand=env('Tisserand','A',10,true);use(tisserand,'weave',{target:0});tisserand.cDeclareAction(0,'frappe',{target:1});assert.equal(tisserand.cActionsLeft(0),1);tisserand.finish();spentExactly(tisserand,6,7);assert.equal(tisserand._cs.fighters[1].pvCur,457,'Native damage 15 plus one woven bonus 28');
 const totemiste=env('Totémiste','A',10,true);assert.equal(totemiste.initialBudget.epMax,77);assert.equal(totemiste.initialBudget.emMax,74);
 use(totemiste,'plant');use(totemiste,'command',{target:1});assert.equal(totemiste.cActionsLeft(0),1);totemiste.finish();spentExactly(totemiste,2,7);assert.equal(totemiste._cs.fighters[1].pvCur,466);
 const firstDevice=totemiste._cs.fighters.findIndex(f=>f._rfDevice&&f.pvCur>0);totemiste.enemy(30,firstDevice);totemiste.finish();assert.equal(totemiste.api.getState(0).stage,'idle');
 use(totemiste,'plant');assert.equal(totemiste.api.getState(0).charges,0);use(totemiste,'charge');use(totemiste,'command',{target:1});assert.equal(totemiste.cActionsLeft(0),0);totemiste.finish();spentExactly(totemiste,4,18);assert.equal(totemiste._cs.fighters[1].pvCur,432);assert.equal(totemiste.api.getState(0).charges,1);
 const barde=env('Barde','A',2,true);assert.equal(barde.initialBudget.epMax,53);assert.equal(barde.initialBudget.emMax,25);use(barde,'sing',{target:2});use(barde,'close');assert.equal(barde.cActionsLeft(0),1);
 barde._cs.decl[2]=[{action:'frappe',kind:'attack',consumeActions:1,epCost:6,value:6,target:1}];barde.defend(2,'parer');barde.enemy(20,2);barde._cs.order=[0,2,1,3];barde.finish();spentExactly(barde,0,6);assert.equal(barde._cs.fighters[2]._rfEffects.find(e=>e.kind==='shield'&&!e.spent).amount,20);assert.equal(barde.api.getState(0).closeQueued,false);
});
