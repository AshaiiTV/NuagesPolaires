'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const main=fs.readFileSync(path.join(root,'assets/js/main.js'),'utf8');
const linear=require('../assets/js/serments-linear');
const clone=value=>JSON.parse(JSON.stringify(value));
const start=main.indexOf('var SD='),end=main.indexOf('\n};',start);
assert.ok(start>=0&&end>start,'Historical catalogue can be loaded without starting the app');
const native=clone(vm.runInNewContext(main.slice(start,end+3)+';SD'));
const names=['Duelliste','Sauvageon','Croisé','Rôdeur','Traqueur','Archer','Elementaliste','Evocateur','Conjurateur','Arcaniste'];
const levels=[1,2,4,5,7,10,11,20,35];
const rawBranch=(name,index)=>native[name][index?'bB':'bA'];
function normalized(name,index,branch=rawBranch(name,index)){
  return linear.normalizeBranch(name,branch,index,native[name],rawBranch(name,index));
}
function independentRule(parts,level){
  return parts.map(part=>{
    if(typeof part==='string')return part;
    const numerator=part.base+part.perLevel*level,value=numerator/(part.divisor||1);
    return part.round==='ceil'?Math.ceil(value):part.round==='floor'?Math.floor(value):value;
  }).join('');
}
function loadFunction(name,context){
  const start=main.indexOf('function '+name+'('),end=main.indexOf('\nfunction ',start+1);
  assert.ok(start>=0,name+' exists');
  return vm.runInNewContext(main.slice(start,end===-1?undefined:end)+'\n;'+name,context);
}

// Independently reviewed combat expectations: exact numerical effects and fixed
// action/resource budgets, rather than another implementation of resolveTree.
const expected={
 'Duelliste':[
  [{id:'dash',em:6,at:n=>({value:2+3*n})},{id:'push',em:6,at:n=>({value:6+3*n,repulse:true})}],
  [{id:'double',em:5,at:n=>({value:3+2*n,hits:2})}]
 ],
 'Sauvageon':[
  [{id:'spiral',em:5,at:n=>({value:4+3*n,aoe:true,aoeIncludesAllies:true})}],
  [{id:'throw',em:8,at:n=>({value:12+4*n,disarm:true})}]
 ],
 'Croisé':[
  [{id:'bash',em:6,at:n=>({value:3+2*n,selfPvMaxBonus:1+n})}],
  [{id:'call',em:6,at:n=>({kind:'buff',provoke:true,perEnemyPvMax:1+2*n})}]
 ],
 'Rôdeur':[
  [{id:'flurry',em:6,at:n=>({value:-1+2*n,hits:3})}],
  [{id:'throw',em:5,at:n=>({value:1+3*n})}]
 ],
 'Traqueur':[
  [{id:'drain',em:5,at:n=>({value:3*n,epDrain:4+2*n})}],
  [{id:'reach',em:5,at:n=>({value:3*n})},{id:'push',em:5,at:n=>({value:6+3*n,repulse:true})}]
 ],
 'Archer':[
  [{id:'volley',em:6,at:n=>({value:5+2*n,aoe:true,aoeIncludesAllies:true})}],
  [{id:'judge1',em:8,actions:1,at:n=>({value:3+3*n,actsSacr:0,noOverclock:true})},{id:'judge2',em:8,actions:2,at:n=>({value:10+3*n,actsSacr:1,noOverclock:true})},{id:'judge3',em:8,actions:3,at:n=>({value:16+3*n,actsSacr:2,noOverclock:true})}]
 ],
 'Elementaliste':[
  [{id:'fire',em:6,at:n=>({value:6+2*n,comboDamage:3+3*n,briseArmure:4+3*n,elementKey:'fire',statusToTarget:'brulure'})},{id:'ice',em:4,at:n=>({value:3+2*n,comboDamage:3+3*n,briseArmure:4+3*n,elementKey:'ice',statusToTarget:'gel'})}],
  [{id:'thunder',em:4,at:n=>({value:4+2*n,comboSelfEpGain:4+3*n,comboEpDrain:3+n,elementKey:'thunder'})},{id:'water',em:6,at:n=>({value:2+2*n,comboSelfEpGain:4+3*n,comboEpDrain:3+n,elementKey:'water'})}]
 ],
 'Evocateur':[
  [{id:'turtle',em:10,at:n=>({kind:'summon',summon:{name:'Tortue Bipède',pv:2+4*n,dmg:4+n,actCost:6,autoInterpose:true,rangeType:'cac'}})}],
  [{id:'crab',em:10,at:n=>({kind:'summon',summon:{name:'Crabe Canon',pv:3*n,dmg:5+n,actCost:6,autoInterpose:false,rangeType:'distance'}})}]
 ],
 'Conjurateur':[
  [{id:'strike',em:5,at:n=>({action:'frappe_dechainees',value:2+2*n,healAmt:2+n,healTargetType:'ally'})}],
  [{id:'heal1',em:12,actions:1,at:n=>({action:'soin',kind:'heal',healAmt:6+3*n,actsSacr:0,noOverclock:true})},{id:'heal2',em:12,actions:2,at:n=>({action:'soin',kind:'heal',healAmt:12+4*n,actsSacr:1,noOverclock:true})},{id:'heal3',em:12,actions:3,at:n=>({action:'soin',kind:'heal',healAmt:20+5*n,actsSacr:2,noOverclock:true})}]
 ],
 'Arcaniste':[
  [{id:'domain',em:8,at:n=>({value:8+4*n,aoe:true,aoeIncludesAllies:true,undefendable:true})}],
  [{id:'ray',em:10,at:n=>({value:14+4*n,targetType:'enemy'})}]
 ]
};

test('ten public historical oaths have twenty complete stable linear abilities without mutating SD',()=>{
  assert.deepEqual(Object.keys(linear.specifications).filter(name=>!native[name].hidden).sort(),[...names].sort());
  const before=JSON.stringify(native);let count=0;
  for(const name of names)for(const index of [0,1]){
    const raw=rawBranch(name,index),out=normalized(name,index);count++;
    assert.notEqual(out,raw);assert.equal(out.progression,'linear');assert.equal(out.ability.niv,1);
    assert.equal(out.paliers.length,1);assert.equal(out.paliers[0],out.ability);
    assert.equal(out.ability.combatRules.native,true);
    assert.deepEqual(out.legacyPaliers,raw.paliers,'The old rules remain available after a normalized branch is saved');
    assert.equal(linear.normalizeBranch(name,out,index,native[name],raw),out,'Normalization is idempotent');
    const operations=out.ability.combatRules.operations;
    assert.deepEqual(operations.map(op=>op.id),expected[name][index].map(op=>op.id));
    for(const level of levels){
      const options=linear.combatOptions(out.ability,level,3);
      assert.equal(options.length,operations.length,name+' has no extra unlock at N='+level);
      options.forEach((option,i)=>{
        const wanted=expected[name][index][i];
        assert.equal(option.label,operations[i].label);assert.equal(option.linear,true);
        assert.equal(option.consumeActions,wanted.actions||1);assert.equal(option.epCost,0);assert.equal(option.emCost,wanted.em);
        assert.equal(option.descText,independentRule(operations[i].ruleParts,level),name+' combat and readable effect agree at N='+level);
        for(const [key,value] of Object.entries(wanted.at(level)))assert.deepEqual(option[key],value,name+' '+wanted.id+' '+key+' at N='+level);
      });
    }
  }
  assert.equal(count,20);assert.equal(JSON.stringify(native),before,'No raw definition or nested tier has changed');
});

test('one-, two- and three-action options obey the remaining budget, including zero',()=>{
  for(const name of ['Archer','Conjurateur']){
    const ability=normalized(name,1).ability;
    for(const level of levels)for(const remaining of [0,1,2,3]){
      const options=linear.combatOptions(ability,level,remaining);
      assert.deepEqual(options.map(op=>op.consumeActions),[1,2,3].filter(n=>n<=remaining));
      assert.deepEqual(options.map(op=>op.actsSacr),[0,1,2].filter(n=>n<remaining));
      assert.ok(options.every(op=>op.noOverclock===true));
      assert.ok(options.every(op=>op.emCost===(name==='Archer'?8:12)),'Taking longer never discounts the resource cost');
    }
  }
  assert.equal(linear.combatOptions(normalized('Duelliste',0).ability,20,0).length,0);
});

test('printed damage, healing and summon resources use the actual level and fixed multi-hit rules',()=>{
  for(const level of levels){
    const double=linear.combatOptions(normalized('Duelliste',1).ability,level,1)[0];
    assert.equal(double.hits,2);assert.match(double.descText,new RegExp('Deux frappes de '+double.value+' dégâts chacune'));
    const flurry=linear.combatOptions(normalized('Rôdeur',0).ability,level,1)[0];
    assert.equal(flurry.hits,3);assert.match(flurry.descText,new RegExp('Trois frappes de '+flurry.value+' dégâts'));
    const strike=linear.combatOptions(normalized('Conjurateur',0).ability,level,1)[0];
    assert.match(strike.descText,new RegExp(strike.value+' dégâts'));assert.match(strike.descText,new RegExp(strike.healAmt+' PV'));
    for(const index of [0,1]){
      const summon=linear.combatOptions(normalized('Evocateur',index).ability,level,1)[0];
      assert.match(summon.descText,new RegExp(summon.summon.pv+' PV'));assert.match(summon.descText,new RegExp(summon.summon.dmg+' dégâts'));
      assert.match(summon.descText,/Deux actions par tour, chacune coûte 6 EM/);assert.match(summon.descText,/Une invocation par combat/);
      assert.equal(summon.consumeActions,1);assert.equal(summon.emCost,10);assert.equal(summon.summon.actCost,6);
    }
  }
});

test('staff prose and costs, including empty costs, stay authoritative before and after normalization',()=>{
  for(const change of [p=>{p.desc='Le staff accorde un effet différent.';},p=>{p.cout='9 EM';},p=>{p.cout='';}]){
    const raw=clone(rawBranch('Conjurateur',1));change(raw.paliers[2]);
    const before=JSON.stringify(raw),out=normalized('Conjurateur',1,raw);
    assert.equal(out.ability.desc,raw.paliers[2].desc);assert.equal(out.ability.cout,raw.paliers[2].cout);
    assert.deepEqual(out.legacyPaliers,raw.paliers);assert.equal(linear.combatOptions(out.ability,35,3),null);
    assert.equal(JSON.stringify(raw),before,'A staff record is not rewritten');
  }
  for(const change of [p=>{p.desc='Autre effet';},p=>{p.cout='9 EM';},p=>{p.cout='';}]){
    const out=clone(normalized('Duelliste',0));change(out.ability);
    assert.equal(linear.combatOptions(out.ability,35,3),null,'Native combat cannot contradict an edited linear ability');
  }
  const custom={nom:'Branche du staff',paliers:[{niv:2,nom:'Premier pouvoir',cout:'1 EM',desc:'Texte original du staff'},{niv:7,nom:'Autre pouvoir',cout:'',desc:'Autre texte du staff'}]};
  const before=JSON.stringify(custom),out=linear.normalizeBranch('Serment custom',custom,0,{evolvesFrom:''},undefined);
  assert.equal(out.ability.desc,custom.paliers[0].desc);assert.deepEqual(out.legacyPaliers,custom.paliers);assert.equal(JSON.stringify(custom),before);
  const retired={retired:true};assert.equal(linear.normalizeBranch('Ancienne classe',custom,0,retired,undefined),custom,'Archived rules retain their own engine');
});

test('published Conjurateur one/two/three-action wording recognizes the equivalent historical rule',()=>{
  const branch=clone(rawBranch('Conjurateur',1));
  branch.paliers.forEach(p=>{p.desc=p.desc.replace(/\b([012]) action/g,(_,n)=>(Number(n)+1)+' action');});
  const before=JSON.stringify(branch),out=normalized('Conjurateur',1,branch);
  assert.equal(out.ability.combatRules.native,true);assert.equal(out.paliers.length,1);
  assert.deepEqual(linear.combatOptions(out.ability,11,3).map(op=>op.healAmt),[39,56,75]);
  assert.equal(JSON.stringify(branch),before);assert.deepEqual(out.legacyPaliers,branch.paliers);
  const grammatical=clone(rawBranch('Conjurateur',1));
  grammatical.paliers.forEach(p=>{p.desc=p.desc.replace(/\b([012]) actions?/g,(_,n)=>{const count=Number(n)+1;return count+' action'+(count>1?'s':'');});});
  assert.equal(normalized('Conjurateur',1,grammatical).ability.combatRules.native,true,'Plural-corrected action labels describe the same rule');
  branch.paliers[1].desc+=' Le staff ajoute une condition.';
  assert.equal(linear.combatOptions(normalized('Conjurateur',1,branch).ability,11,3),null,'Recognizing a wording variant must not erase an actual staff edit');
});

test('main keeps historical branches in active legacy combats and uses linear abilities in new fights',()=>{
  const player={id:'p1',classe:'Conjurateur',branch:native.Conjurateur.bB.nom,level:7};
  const fighter={pid:'p1',level:7},custom={};
  const context={SD:native,gsd:()=>custom,_cs:{active:true,reforgedVersion:2,fighters:[fighter]},cGetFighterPlayer:()=>player};
  context.normalizeBranchLabel=loadFunction('normalizeBranchLabel',context);
  context.branchMatchesLabel=loadFunction('branchMatchesLabel',context);
  context.getRawSermentBranches=loadFunction('getRawSermentBranches',context);
  context.getPlayerSermentBundle=()=>({def:native.Conjurateur,branch:normalized('Conjurateur',1)});
  const getInfo=loadFunction('cGetFighterSerment',context);
  let info=getInfo(0);assert.equal(info.branch,native.Conjurateur.bB);assert.equal(info.palier.niv,7);
  delete context._cs.reforgedVersion;assert.equal(getInfo(0).palier.niv,7,'Unmarked active saves keep historical selection');
  context._cs.reforgedVersion=3;info=getInfo(0);assert.equal(info.branch.progression,'linear');assert.equal(info.palier.niv,1);
  context._cs.active=false;delete context._cs.reforgedVersion;assert.equal(getInfo(0).palier.niv,1,'Preparation for a new fight uses linear rules');
  const stored=clone(normalized('Conjurateur',1));custom.Conjurateur={branches:[clone(native.Conjurateur.bA),stored]};
  context._cs.active=true;context._cs.reforgedVersion=2;
  assert.equal(getInfo(0).palier.niv,7,'A previously normalized imported branch retains its historical abilities via legacyPaliers');
});

test('the six hidden evolution branches remain hidden and use stable N10–35 formulas',()=>{
  const hidden=['Bretteur','Claymore',"Lame d'Honneur"];
  assert.equal(Object.keys(linear.specifications).length,13);
  for(const name of hidden)for(const index of [0,1]){
    assert.equal(native[name].hidden,true);
    const out=normalized(name,index),ability=out.ability,ops=ability.combatRules.operations;
    assert.equal(ability.niv,10);assert.equal(out.minLevel,10);assert.equal(ability.combatRules.minLevel,10);
    assert.equal(out.paliers.length,1);assert.deepEqual(out.legacyPaliers,rawBranch(name,index).paliers);
    assert.deepEqual(linear.combatOptions(ability,9,3),[]);
    for(const n of [10,11,20,35]){
      const options=linear.combatOptions(ability,n,3);
      assert.equal(options.length,ops.length);
      options.forEach((op,i)=>{assert.equal(op.descText,independentRule(ops[i].ruleParts,n));assert.equal(op.consumeActions,ops[i].cost.actions);assert.equal(op.emCost,ops[i].cost.em);});
      if(name==='Bretteur'&&index===0)assert.equal(options[0].value,2*n-2);
      if(name==='Bretteur'&&index===1){assert.equal(options[0].riposte.damage,2*n-5);assert.equal(options[0].consumeActions,0);assert.equal(options[0].riposte.emCost,5);}
      if(name==='Claymore'&&index===0){assert.equal(options[0].claymorePosture.damage,10+2*n);assert.equal(options[0].claymorePosture.epCost,10);assert.equal(options[0].claymorePosture.blockEpDrain,12);}
      if(name==='Claymore'&&index===1){assert.equal(options[0].value,2*n);assert.equal(options[0].blockBreakLine,true);assert.equal(options[0].defenseAfterFirstEp,3);}
      if(name==="Lame d'Honneur"&&index===0){assert.equal(options[0].duel.refundCap,n-4);assert.equal(options[0].duel.targetBonusPct,40);assert.equal(options[0].duel.otherPenaltyPct,60);}
      if(name==="Lame d'Honneur"&&index===1){assert.equal(options[0].duel.targetBonusPct,0);assert.equal(options[0].emCost,5);assert.equal(options[1].value,2*n);assert.equal(options[1].duelBonus,4);assert.equal(options[1].duelOnly,true);}
    }
  }
});

test('an explicit earlier Bretteur grant keeps minimum two and anchors its former first effects there',()=>{
  for(const index of [0,1]){
    const raw=clone(rawBranch('Bretteur',index));raw.paliers[0].niv=2;const before=JSON.stringify(raw);
    const out=normalized('Bretteur',index,raw);
    assert.equal(out.ability.niv,2);assert.equal(out.minLevel,2);
    assert.deepEqual(linear.combatOptions(out.ability,1,3),[]);
    for(const n of [2,10,11,20,35]){
      const op=linear.combatOptions(out.ability,n,3)[0];
      assert.equal(index?op.riposte.damage:op.value,(index?7:10)+2*(n-2));
    }
    raw.paliers[0].desc='Règle explicite du staff.';raw.paliers[0].cout='';
    const override=normalized('Bretteur',index,raw);
    assert.equal(override.ability.niv,2);assert.equal(override.ability.desc,raw.paliers[0].desc);assert.equal(override.ability.cout,'');
    assert.equal(linear.combatOptions(override.ability,2,3),null);
    raw.paliers[0].desc=JSON.parse(before).paliers[0].desc;raw.paliers[0].cout=JSON.parse(before).paliers[0].cout;
    assert.equal(JSON.stringify(raw),before);
  }
});

function signatureEnv(name,index=0,level=10){
  const branch=normalized(name,index),f={name:'Porteur',type:'player',pid:'p0',classe:name,level,pvCur:100,pvMax:100,epCur:100,epMax:100,emCur:100,emMax:100,statuts:[]};
  const enemy=i=>({name:'Ennemi '+i,type:'beast',pvCur:100,pvMax:100,epCur:100,epMax:100,emCur:100,emMax:100,statuts:[]});
  const c={Math,JSON,Date,Number,String,Object,Array,setTimeout:()=>{},logs:[],STATUT_EFFECTS:{},NPSermentsLinear:linear,
    _cs:{active:true,reforgedVersion:3,phase:'declaration',round:1,turn:0,order:[0,1,2],decl:{},fighters:[f,enemy(1),enemy(2)]},
    getAllSD:()=>native,cActionsMax:()=>3,cGetForcedTargetInfo:()=>null,cFindAutoInterpose:()=>null,
    cApplyElementalLogic:(f,a,t,dmg)=>({dmg}),cAddOrRefreshStatut:()=>{},cTickStatuts:()=>{},cTickShieldCallTaunts:()=>{},
    combatSnapshot:()=>{},combatQueueFx:()=>{},combatPlayPendingFx:()=>{},rCombat:()=>{},openDropModal:()=>{},
    cLog:m=>c.logs.push(m),notif:m=>c.logs.push(m),cEnsureFighterCid:t=>t._cid||(t._cid='fighter'+c._cs.fighters.indexOf(t))};
  c.window=c;
  ['cDecl','cDeclCount','cActionsLeft','_nextDeclarant','cLinearDuelTarget','cLinearFinishDuels','cDeclareAction','cUndoLastDecl','cGetAttackTargets','cApplyRawDamage','cResolveAttackInstance','combatResolve','cBuildAbilityOptionsForPalier'].forEach(n=>c[n]=loadFunction(n,c));
  c.options=()=>c.cBuildAbilityOptionsForPalier({fighter:f,player:{id:'p0'},level},branch.ability,c.cActionsLeft(0));
  c.use=(op=0,extra={})=>{const option=c.options()[op];assert.ok(option,'Option exists');c.cDeclareAction(0,option.action,{...option,...extra});};
  c.declare=(action,opts={})=>c.cDeclareAction(0,action,opts);
  c.defend=(fi,action='bloquer')=>(c._cs.decl[fi]||=[]).push({action,kind:'defense',consumeActions:1,epCost:0,blockPct:50});
  c.attack=(value=20,extra={})=>(c._cs.decl[1]||=[]).push({action:'frappe',kind:'attack',consumeActions:1,epCost:0,value,target:0,...extra});
  c.finish=()=>{c._cs.phase='resolution';c.combatResolve();};
  return c;
}

test('Feinte applies its alternative bonus or actual defense tax, never both',()=>{
  const open=signatureEnv('Bretteur');open.use(0,{target:1});open.finish();
  assert.equal(open._cs.fighters[1].pvCur,78);assert.equal(open._cs.fighters[0].emCur,94);
  const blocked=signatureEnv('Bretteur');blocked.use(0,{target:1});blocked.defend(1);blocked.finish();
  assert.equal(blocked._cs.fighters[1].pvCur,91);assert.equal(blocked._cs.fighters[1].epCur,98);
  const dodged=signatureEnv('Bretteur');dodged.use(0,{target:1});dodged.defend(1,'esquive');dodged.finish();
  assert.equal(dodged._cs.fighters[1].pvCur,100);assert.equal(dodged._cs.fighters[1].epCur,98);
});

test('Pas Rompu is a reversible zero-action choice, pays only after a targeted dodge and triggers once',()=>{
  const c=signatureEnv('Bretteur',1);c.use();
  assert.equal(c.cDeclCount(0),0);assert.equal(c._cs.turn,0);assert.equal(c.options()[0].disabled,true);
  c.use();assert.equal(c._cs.decl[0].length,1,'Duplicate reaction is rejected');
  c.cUndoLastDecl(0);assert.equal(c.options()[0].disabled,false);c.use();
  c.declare('esquive');c.declare('esquive');assert.equal(c.cDeclCount(0),2);
  c.attack();c.attack();c.defend(1,'parer');c.finish();
  assert.equal(c._cs.fighters[0].pvCur,100);assert.equal(c._cs.fighters[0].epCur,84);assert.equal(c._cs.fighters[0].emCur,95);
  assert.equal(c._cs.fighters[1].pvCur,88,'The 15-damage riposte can be parried to 12');
  assert.equal(c._cs.fighters[0]._linearRiposteRound,1);assert.equal(c.options()[0].disabled,false,'Next round can reserve another reaction');
  for(const mode of ['unused','aoe','unaffordable']){
    const idle=signatureEnv('Bretteur',1);if(mode==='unaffordable')idle._cs.fighters[0].emCur=4;
    idle.use();idle.declare('esquive');if(mode!=='unused')idle.attack(20,{aoe:mode==='aoe'});idle.finish();
    assert.equal(idle._cs.fighters[0].emCur,mode==='unaffordable'?4:100,mode+' does not charge a reaction');
    assert.equal(idle._cs.fighters[1].pvCur,100);
  }
});

test('Posture Haute prepares a single heavy strike with fixed costs and expires after the next round',()=>{
  const c=signatureEnv('Claymore');c.use();c.declare('frappe',{target:1});c.declare('frappe',{target:1});
  assert.equal(c._cs.decl[0][1].value,30);assert.equal(c._cs.decl[0][1].epCost,10);
  assert.equal(c._cs.decl[0][2].value,native.Claymore.dmg+10);assert.equal(c._cs.decl[0][2].epCost,6);
  c.defend(1);c.finish();assert.equal(c._cs.fighters[1].pvCur,100-15-(native.Claymore.dmg+10));
  assert.equal(c._cs.fighters[1].epCur,88);assert.equal(c._cs.fighters[0].epCur,84);assert.equal(c._cs.fighters[0].emCur,94);assert.equal(c._cs.fighters[0].claymorePosture,undefined);
  const expire=signatureEnv('Claymore');expire.use();expire.finish();assert.equal(expire._cs.fighters[0].claymorePosture.damage,30);expire.finish();assert.equal(expire._cs.fighters[0].claymorePosture,undefined);
  const empty=signatureEnv('Claymore');empty._cs.fighters[0].emCur=0;empty.use();empty.declare('frappe',{target:1});empty.finish();assert.equal(empty._cs.fighters[1].pvCur,100);assert.equal(empty._cs.fighters[0].epCur,100,'An unpaid preparation cannot charge a dependent strike');
});

test('Fendre la Ligne punishes a block and taxes only a defense after a previous defense',()=>{
  const first=signatureEnv('Claymore',1);first.use(0,{target:1});first.defend(1);first.finish();
  assert.equal(first._cs.fighters[1].pvCur,70);assert.equal(first._cs.fighters[1].epCur,100);
  const second=signatureEnv('Claymore',1);second.declare('frappe',{target:1});second.use(0,{target:1});second.defend(1,'esquive');second.defend(1);second.finish();
  assert.equal(second._cs.fighters[1].pvCur,70);assert.equal(second._cs.fighters[1].epCur,97);
});

test('Duel Juré modifies all attacks, keeps one target and refunds only actual EP at death',()=>{
  const c=signatureEnv("Lame d'Honneur");c.use(0,{target:1});c.declare('frappe',{target:1});c.declare('frappe',{target:2});c.finish();
  const damage=native["Lame d'Honneur"].dmg+10;
  assert.equal(c._cs.fighters[1].pvCur,100-Math.ceil(damage*1.4));assert.equal(c._cs.fighters[2].pvCur,100-Math.ceil(damage*.4));
  const f=c._cs.fighters[0];assert.equal(f.emCur,95);assert.equal(f.emMax,95);assert.equal(f._linearDuel.epSpent,12);
  c.use(0,{target:2});assert.equal(c.cDecl(0).length,0,'Cannot retarget a living duel');
  c._cs.fighters[1].pvCur=1;c.declare('frappe',{target:1});c.finish();
  assert.equal(f.epCur,88,'18 spent and6 refunded at N10');assert.equal(f.emMax,100);assert.equal(f.emCur,95);assert.equal(f._linearDuel,undefined);
  const empty=signatureEnv("Lame d'Honneur");empty.use(0,{target:1});empty.finish();empty._cs.fighters[1].pvCur=0;empty.finish();assert.equal(empty._cs.fighters[0].epCur,100,'No EP created when none was spent');
});

test('Sentence has its own designation, strict target, fixed costs and capped recovery',()=>{
  const c=signatureEnv("Lame d'Honneur",1);c.use(1,{target:1});assert.equal(c.cDecl(0).length,0,'A Sentence requires a duel');
  c.use(0,{target:1});c.use(1,{target:2});assert.equal(c.cDecl(0).length,1,'Wrong target rejected');
  c.use(1,{target:1});c.declare('frappe',{target:2});c.finish();
  assert.equal(c._cs.fighters[1].pvCur,76);assert.equal(c._cs.fighters[2].pvCur,100-(native["Lame d'Honneur"].dmg+10),'Branch B has no global damage modifier');
  assert.equal(c._cs.fighters[0].emCur,91);assert.equal(c._cs.fighters[0]._linearDuel.sentenceEp,1);
  c._cs.fighters[1].pvCur=1;c.use(1,{target:1});c.finish();assert.equal(c._cs.fighters[0].epCur,96,'Only two actual EP become recoverable');
  const free=signatureEnv("Lame d'Honneur",1);free._cs.fighters[1].pvCur=24;free.use(0,{target:1});free.use(1,{target:1});free.finish();assert.equal(free._cs.fighters[0].epCur,100,'A zero-EP Sentence cannot create EP');
  const poor=signatureEnv("Lame d'Honneur",1);poor._cs.fighters[0].emCur=4;poor.use(0,{target:1});poor.use(1,{target:1});poor.finish();assert.equal(poor._cs.fighters[1].pvCur,100);assert.equal(poor._cs.fighters[0].emCur,4,'An unpaid designation and its dependent Sentence spend nothing');
});

test('editing an existing level-two evolution ability preserves its explicit grant level',async()=>{
  const raw=clone(rawBranch('Bretteur',0));raw.paliers[0].niv=2;
  const branch=normalized('Bretteur',0,raw),fields={'mpal-nom':'Feinte du staff','mpal-cout':'','mpal-desc':'Description du staff.'};let saved;
  const context={CU:{},can:()=>true,_palierSermNom:'Bretteur',_palierBrIdx:0,
    ge:id=>({value:fields[id]}),gsd:()=>({}),getAllSD:()=>native,getBranches:()=>[branch],
    ssd:custom=>{saved=custom;return true;},_confirmDbSave:async result=>result,closeModal:()=>{},_refreshSermentViews:()=>{},notif:()=>{}};
  const begin=main.indexOf('async function savePalier('),end=main.indexOf('\nvar _palierIdx=',begin);
  const save=vm.runInNewContext(main.slice(begin,end)+'\n;savePalier',context);await save();
  assert.equal(saved.Bretteur.branches[0].ability.niv,2);assert.equal(saved.Bretteur.branches[0].ability.cout,'');
  assert.equal(saved.Bretteur.branches[0].paliers[0],saved.Bretteur.branches[0].ability);
  assert.equal(branch.ability.nom,raw.paliers[0].nom,'Editing does not mutate the normalized input');
});

test('zero-action reaction rules remain visible in the real ability renderer',()=>{
  const ability=normalized('Bretteur',1).ability,context={esc:s=>String(s)};
  for(const name of ['getSermentOperationText','getSermentTierOperations','renderSermentOperations'])context[name]=loadFunction(name,context);
  assert.equal(ability.cout,'0 action / 5 EM');
  assert.equal(context.getSermentTierOperations(ability).length,1);
  const html=context.renderSermentOperations(ability,10);
  assert.match(html,/0 action/);assert.match(html,/5 EM/);assert.match(html,/15 dégâts/);assert.doesNotMatch(html,/1 action/);
});
