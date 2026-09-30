'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const expansion=require('../assets/js/serments-expansion-data');
const source=fs.readFileSync(path.join(__dirname,'../assets/js/serments-combat.js'),'utf8');
const clone=x=>JSON.parse(JSON.stringify(x));
function environment(name='Arbalétrier',branch='A',level=2){
  const players=[{id:'p1',classe:name,branch,level,sermentBranches:{Evocateur:'Tortue Bipède'}}];
  const ctx={console,Date,Math,Number,JSON,Array,Object,String,Infinity,NPSermentsExpansion:expansion,CU:{type:'staff'},document:null,logs:[],attacks:[],snapshots:[],oldCalls:0};
  ctx.window=ctx;
  ctx._cs={active:true,phase:'declaration',round:1,turn:0,order:[0,1],decl:{},fighters:[{pid:'p1',name:'Porteur',classe:name,level,type:'player',pvCur:300,pvMax:300,epCur:500,emCur:500},{name:'Adversaire',type:'beast',level,pvCur:500,pvMax:500,epCur:500,emCur:500}]};
  ctx.cActiveSummonForOwner=id=>ctx._cs.fighters.find(f=>f.isSummon&&f.ownerPid===id&&f.pvCur>0);
  ctx.cGetFighterPlayer=fi=>players.find(p=>p.id===ctx._cs.fighters[fi].pid);
  ctx.getPlayerSermentBundle=p=>({branch:expansion.definitions[p.classe]?.branches.find(b=>b.combatRules.key===p.branch)});
  ctx.cGetAbilityOptions=()=>{ctx.oldCalls++;return ['legacy'];};
  ctx.cBuildAbilityOptionsForPalier=()=>['legacy'];ctx.cRenderAbilityButtons=()=>'<legacy>';
  ctx.cDeclCount=fi=>(ctx._cs.decl[fi]||[]).reduce((n,a)=>n+(a.consumeActions||1),0);
  ctx.cActionsLeft=fi=>Math.max(0,(ctx._cs.fighters[fi].isSummon?2:3)-ctx.cDeclCount(fi));
  ctx._nextDeclarant=()=>{if(ctx._cs.turn>=ctx._cs.order.length)ctx._cs.phase='resolution';};
  ctx.cDeclareAction=(fi,action,opts={})=>{
    const a={action,kind:action==='frappe'?'attack':'utility',label:action,consumeActions:1,epCost:action==='frappe'?6:0,emCost:0,value:action==='frappe'?20+level:0,...opts};
    (ctx._cs.decl[fi]??=[]).push(a);if(ctx.cActionsLeft(fi)<=0){ctx._cs.turn++;ctx._nextDeclarant();}return a;
  };
  ctx.cResolveAttackInstance=(f,fi,a)=>{
    ctx.attacks.push(clone(a));let target=ctx._cs.fighters[a.target];if(!target)return;
    const defs=(ctx._cs.decl[a.target]||[]).filter(d=>['esquive','parer','bloquer'].includes(d.action));
    const used=ctx._cs._usedDefs??={},di=used[a.target+'_def']||0,def=defs[di];let dmg=a.value||0;
    if(def&&!a.undefendable){used[a.target+'_def']=di+1;if(def.action==='esquive')dmg=0;else dmg=Math.ceil(dmg*(def.action==='parer'?.75:.5));}
    target.pvCur=Math.max(0,target.pvCur-dmg);
  };
  ctx.combatResolve=()=>{
    if(ctx._cs.phase!=='resolution')return;
    for(const fi of ctx._cs.order){const f=ctx._cs.fighters[fi];for(const a of ctx._cs.decl[fi]||[]){f.epCur-=a.epCost||0;f.emCur-=a.emCost||0;}}
    for(const fi of ctx._cs.order){ctx.NPSermentsCombat.beginTurn(fi);for(const a of ctx._cs.decl[fi]||[])if(a.kind==='attack'&&a.action!=='annule')ctx.cResolveAttackInstance(ctx._cs.fighters[fi],fi,a);ctx.NPSermentsCombat.endTurn(fi);}
    ctx._cs.decl={};ctx._cs._usedDefs={};ctx._cs.round++;ctx._cs.turn=0;ctx._cs.phase='declaration';
  };
  ctx.rCombat=()=>{};ctx.combatStart=()=>{};ctx.notif=msg=>ctx.logs.push(msg);ctx.cLog=msg=>ctx.logs.push(msg);ctx.combatSnapshot=()=>ctx.snapshots.push(clone(ctx._cs));
  vm.createContext(ctx);vm.runInContext(source,ctx);ctx.players=players;
  ctx.act=(id,params={})=>ctx.NPSermentsCombat.perform(0,id,{sceneVerified:true,note:'Conditions vérifiées',target:1,...params});
  ctx.finish=()=>{ctx._cs.phase='resolution';ctx.combatResolve();};return ctx;
}

test('all 140 branches use exact canonical primary costs and never the legacy text parser',()=>{
  for(const e of expansion.entries)for(const b of e.branches){
    const c=environment(e.name,b.key,20),options=c.NPSermentsCombat.getOptions(0),main=options.find(o=>o.np70.op.id==='main');
    assert.ok(main,e.name+' '+b.key);assert.equal(main.consumeActions,b.cost.actions);assert.equal(main.epCost,b.cost.ep);assert.equal(main.emCost,b.cost.em);assert.equal(c.oldCalls,0);
    for(const op of options){assert.ok(Number.isInteger(op.consumeActions)&&op.consumeActions>=0);assert.ok(Number.isFinite(op.epCost)&&op.epCost>=0);assert.ok(Number.isFinite(op.emCost)&&op.emCost>=0);}
  }
});
test('new evolution tiers are locked below 10; exclusive branch remains fixed during combat',()=>{
  const low=environment('Astronome','A',9);assert.equal(low.NPSermentsCombat.getOptions(0).length,0);
  const c=environment('Massier','A',7);assert.equal(c.NPSermentsCombat.getOptions(0)[0].palierNiv,7);c.players[0].branch='B';assert.equal(c.NPSermentsCombat.info(0).key,'A');
});
test('crossbow recharge does no damage; paid shot consumes exactly one of six real bolts',()=>{
  const c=environment();assert.equal(c.NPSermentsCombat.getOptions(0).find(o=>o.np70.op.id==='shoot').disabled,true);
  assert.equal(c.act('main').ok,true);assert.equal(c._cs.fighters[0].epCur,500,'declaration reserves without debit');
  assert.equal(c.act('shoot').ok,true);c.finish();assert.equal(c._cs.fighters[0].epCur,492);assert.equal(c._cs.fighters[1].pvCur,478);assert.equal(c.attacks.length,1);assert.equal(c.NPSermentsCombat.getState(0).inventory.bolt,5);
  for(let i=0;i<5;i++){assert.equal(c.act('main').ok,true);assert.equal(c.act('shoot').ok,true);c.finish();}
  assert.equal(c.NPSermentsCombat.getState(0).inventory.bolt,0);assert.equal(c.act('main').ok,false);
  c.act('recall');c.finish();assert.equal(c.NPSermentsCombat.getState(0).inventory.bolt,0);assert.equal(c.NPSermentsCombat.getState(0).loaded,false);
});
test('recall preserves a loaded bolt and never fills ammunition; ordinary attack cannot bypass loading',()=>{
  const c=environment();c.act('main');c.act('recall');c.finish();assert.equal(c.NPSermentsCombat.getState(0).loaded,true);assert.equal(c.NPSermentsCombat.getState(0).inventory.bolt,6);
  c.cDeclareAction(0,'frappe',{target:1});assert.equal((c._cs.decl[0]||[]).length,0);
});
test('level one crossbow has physical equipment actions without unlocking either branch',()=>{
  const c=environment('Arbalétrier',null,1);const inf=c.NPSermentsCombat.info(0);assert.equal(inf.equipmentOnly,true);assert.equal(c.act('main').ok,true);assert.equal(c.act('shoot').ok,true);c.finish();assert.equal(c.attacks.length,1);
});
test('canceling a declaration removes its projected state and never pays twice',()=>{
  const c=environment();c.act('main');assert.equal(c.NPSermentsCombat.getState(0).loaded,true);c._cs.decl[0].pop();assert.equal(c.NPSermentsCombat.getState(0).loaded,false);c.finish();assert.equal(c._cs.fighters[0].epCur,500);assert.equal(c.attacks.length,0);
});
test('delayed preparation cannot resolve early, can resolve next own turn, and is consumed',()=>{
  const c=environment('Porte-Fléau','A',7);c.act('main');assert.equal(c.act('release').ok,false);c.finish();assert.equal(c.attacks.length,0);assert.equal(c.act('release').ok,true);c.finish();assert.equal(c.attacks.length,1);assert.equal(c._cs.fighters[1].pvCur,481);assert.equal(c.act('release').ok,false);
});
test('utility text containing distances, damage prevention and HP creates no implicit damage or healing',()=>{
  for(const name of ['Illusionniste','Prêtre','Sculpteur de Givre','Bastion','Cryomancien']){
    const c=environment(name,'A',20),before=c._cs.fighters.map(f=>f.pvCur);assert.equal(c.act('main').ok,true);c.finish();assert.deepEqual(c._cs.fighters.map(f=>f.pvCur),before,name);assert.equal(c.attacks.length,0,name);
  }
});
test('reserved Frondeur interception cancels exactly one selected projectile and consumes one galet',()=>{
  const c=environment('Frondeur','A',5);c.act('main');
  c._cs.decl[1]=[{action:'frappe',kind:'attack',label:'Flèche visible',target:0,value:25,epCost:4,consumeActions:1},{action:'frappe',kind:'attack',label:'Seconde flèche',target:0,value:25,epCost:4,consumeActions:1}];
  assert.equal(c.NPSermentsCombat.assignReaction(0,1,0,'Flèche 50 g, trajectoire vue à moins de 3 m').ok,true);
  assert.equal(c.NPSermentsCombat.assignReaction(0,1,1,'Deuxième flèche').ok,false);c.finish();assert.equal(c._cs.fighters[0].pvCur,275);assert.equal(c._cs.fighters[0].epCur,496);assert.equal(c._cs.fighters[0].emCur,498);assert.equal(c.NPSermentsCombat.getState(0).inventory.galet,9);
});
test('resource shortage cancels the dependent shot before debit rather than producing a free attack',()=>{
  const c=environment();c.act('main');c.act('shoot');c._cs.fighters[0].epCur=4;c.finish();assert.equal(c.attacks.length,0);assert.equal(c._cs.fighters[0].epCur,0);assert.equal(c.NPSermentsCombat.getState(0).loaded,true);
});
test('expiry upkeep is payable at the required turn and finite upkeep never extends maximum lifetime',()=>{
  const c=environment('Pyromancien','A',5);c.act('main');c.finish();assert.equal(c.act('maintain').ok,true);c.finish();assert.equal(c.act('maintain').ok,true);c.finish();assert.equal(c.act('maintain').ok,false);
  const d=environment('Druide','A',5);d.act('main');d.finish();d.finish();d.finish();assert.equal(d.act('maintain').ok,true);d.finish();assert.equal(d.NPSermentsCombat.getState(0).expiresRound,7);
});
test('a zero-action abandonment consumes no extra action and no energy',()=>{
  const c=environment('Piquier','A',5);c.act('main');c.act('release');assert.equal(c.cDeclCount(0),1);c.finish();assert.equal(c._cs.fighters[0].epCur,496);assert.equal(c.NPSermentsCombat.getState(0).stage,'idle');
});
test('the thirteen existing serments retain their legacy ability and damage route',()=>{
  for(const name of ['Duelliste','Bretteur','Claymore','Lame d’Honneur','Sauvageon','Croisé','Rôdeur','Traqueur','Archer','Elementaliste','Evocateur','Conjurateur','Arcaniste']){
    const c=environment(name,'A',10);assert.deepEqual(c.cGetAbilityOptions(0),['legacy']);assert.equal(c.oldCalls,1);c.cDeclareAction(0,'frappe',{target:1});c.finish();assert.equal(c.attacks.length,1,name);
  }
});
test('intercepted explicit shot still consumes its loaded bolt and cannot become a free reload',()=>{
  const c=environment('Arbalétrier','A',5);
  c._cs.fighters.push({pid:'p2',name:'Frondeur',classe:'Frondeur',level:5,type:'beast',pvCur:200,epCur:200,emCur:200});
  c.players.push({id:'p2',classe:'Frondeur',branch:'A',level:5});c._cs.order=[2,0,1];c._cs.turn=0;
  assert.equal(c.NPSermentsCombat.perform(2,'main',{sceneVerified:true,note:'Trajectoire vue'}).ok,true);
  c._cs.turn=1;c.act('main');c.act('shoot',{target:2});
  assert.equal(c.NPSermentsCombat.assignReaction(2,0,1,'Carreau de 100 g à 3 m, visible').ok,true);
  c.finish();assert.equal(c.NPSermentsCombat.getState(0).loaded,false);assert.equal(c.NPSermentsCombat.getState(0).inventory.bolt,5);assert.equal(c._cs.fighters[2].pvCur,200);
});
test('material interception rejects a typed magical ray despite a referee note',()=>{
  const c=environment('Frondeur','A',10);c.act('main');
  c._cs.decl[1]=[{action:'np70',kind:'attack',label:'Rayon',value:56,target:0,np70:{id:'ray',op:{damage:46},context:{}}}];
  assert.equal(c.NPSermentsCombat.assignReaction(0,1,0,'Tentative').ok,false);
});
test('new companions are unique, have their native two actions and charge the owner 3 EM per action',()=>{
  const c=environment('Chimériste','A',10);assert.equal(c.act('summonTurtle').ok,true);c.finish();
  const si=c._cs.fighters.findIndex(f=>f._np70Native);assert.ok(si>=0);assert.equal(c._cs.fighters[si].actionsMax,2);assert.equal(c._cs.fighters[0].emCur,496);assert.equal(c.act('summonCrab').ok,false);assert.equal(c.cGetAbilityOptions(si).length,0);
  c._cs.turn=c._cs.order.indexOf(si);c.cDeclareAction(si,'frappe',{target:1});c.cDeclareAction(si,'deplacer');assert.equal(c.cDeclCount(si),2);assert.equal(c.cDeclCount(0),0,'owner pays resources, not extra actions');c.finish();assert.equal(c._cs.fighters[0].emCur,490);assert.equal(c._cs.fighters[si].epCur,999);
});
test('Totem package replaces two native 3 EM payments by prepaid 5 EM without adding actions',()=>{
  const c=environment('Totémiste','A',10);c.act('plant');c.act('summonTurtle');c.finish();const si=c._cs.fighters.findIndex(f=>f._np70Native);
  c.NPSermentsCombat.setTotemRange(0,true);assert.equal(c.act('main').ok,true);c._cs.turn=c._cs.order.indexOf(si);c.cDeclareAction(si,'frappe',{target:1});c.cDeclareAction(si,'deplacer');c.finish();assert.equal(c._cs.fighters[0].emCur,489,'4 invocation +2 plantation +5 package');assert.equal(c.NPSermentsCombat.getState(0).credits,0);assert.equal(c.cActionsLeft(si),2);
});
test('Totem exit loses the remaining package and charges normal costs without refund',()=>{
  const c=environment('Totémiste','A',10);c.act('plant');c.act('summonTurtle');c.finish();const si=c._cs.fighters.findIndex(f=>f._np70Native);
  c.NPSermentsCombat.setTotemRange(0,false);c.act('main');c._cs.turn=c._cs.order.indexOf(si);c.cDeclareAction(si,'frappe',{target:1});c.finish();assert.equal(c._cs.fighters[0].emCur,486,'4+2+5+3 EM paid');assert.equal(c.NPSermentsCombat.getState(0).credits,0);
});
test('weapon recall cannot recreate Sondeur instrument or missing Empaleur segments',()=>{
  for(const name of ['Sondeur','Empaleur']){const c=environment(name,'B',10);c.act('main');c.act('recall');c.finish();const s=c.NPSermentsCombat.getState(0);assert.equal(s.inventory[name==='Sondeur'?'sonde':'segment'],name==='Sondeur'?0:2);}
});
test('editing companion declarations removes orphaned owner fees and credit uses',()=>{
  const c=environment('Chimériste','A',10);c.act('summonTurtle');c.finish();const si=c._cs.fighters.findIndex(f=>f._np70Native);c._cs.turn=c._cs.order.indexOf(si);
  c.cDeclareAction(si,'frappe',{target:1});c.cDeclareAction(si,'deplacer');assert.equal(c._cs.decl[0].filter(a=>a.np70?.nativeFee).length,2);
  c._cs.decl[si]=[];c.NPSermentsCombat.pruneOrphans();assert.equal(c._cs.decl[0].filter(a=>a.np70?.nativeFee).length,0);c.finish();assert.equal(c._cs.fighters[0].emCur,496);
});
test('an unpaid native action is canceled if owner resources change after declaration',()=>{
  const c=environment('Chimériste','A',10);c.act('summonTurtle');c.finish();const si=c._cs.fighters.findIndex(f=>f._np70Native);c._cs.turn=c._cs.order.indexOf(si);c.cDeclareAction(si,'frappe',{target:1});c._cs.fighters[0].emCur=1;c.finish();assert.equal(c.attacks.length,0);assert.equal(c._cs.fighters[0].emCur,1);
});
test('Totem purchase preserves its planted deadline and replanting destroys old credit',()=>{
  const c=environment('Totémiste','B',10);c.act('plant');c.act('summonTurtle');c.finish();const deadline=c.NPSermentsCombat.getState(0).expiresRound;c.act('main');assert.equal(c.NPSermentsCombat.getState(0).expiresRound,deadline);assert.equal(c.NPSermentsCombat.getState(0).credits,4);c.act('plant');assert.equal(c.NPSermentsCombat.getState(0).credits,0);c.finish();assert.equal(c.NPSermentsCombat.getState(0).credits,0);
});
test('only the actually acquired Evocateur companion is offered',()=>{
  const c=environment('Totémiste','A',10);let options=c.NPSermentsCombat.getOptions(0);assert.ok(options.some(o=>o.np70.op.id==='summonTurtle'));assert.ok(!options.some(o=>o.np70.op.id==='summonCrab'));
  c.players[0].sermentBranches.Evocateur='Branche B — Crabe Canon';options=c.NPSermentsCombat.getOptions(0);assert.ok(!options.some(o=>o.np70.op.id==='summonTurtle'));assert.ok(options.some(o=>o.np70.op.id==='summonCrab'));
});
test('canceling the target attack removes the unpaid Ricocheteur reaction fee',()=>{
  const c=environment('Ricocheteur','B',10);c.act('main');c._cs.decl[1]=[{action:'frappe',kind:'attack',label:'Flèche',target:0,value:25,epCost:4,consumeActions:1}];assert.equal(c.NPSermentsCombat.assignReaction(0,1,0,'Projectile vu').ok,true);assert.equal(c._cs.decl[0].reduce((v,a)=>v+(a.epCost||0),0),12);
  c._cs.decl[1]=[];c.NPSermentsCombat.pruneOrphans();assert.equal(c._cs.decl[0].reduce((v,a)=>v+(a.epCost||0),0),4);assert.equal(c._cs.np70Reactions.length,0);
});
