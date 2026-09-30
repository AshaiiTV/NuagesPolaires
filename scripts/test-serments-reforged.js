'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const legacy=require('../assets/js/serments-expansion-data');
const legacyBefore=JSON.stringify(legacy);
const reforged=require('../assets/js/serments-reforged-data');
const growth=require('../assets/js/progression');
const main=fs.readFileSync(path.join(root,'assets/js/main.js'),'utf8');
function fn(name,ctx){const start=main.indexOf('function '+name+'(');const end=main.indexOf('\nfunction ',start+1);return vm.runInNewContext(main.slice(start,end)+';'+name,ctx);}

test('24 revised choices replace the public expansion without losing 46 existing classes',()=>{
  assert.equal(JSON.stringify(legacy),legacyBefore,'The compatibility module must remain immutable.');
  assert.equal(reforged.entries.length,24);
  assert.equal(reforged.activeNames.length,24);
  assert.equal(reforged.retiredNames.length,46);
  assert.equal(Object.keys(reforged.definitions).length,70);
  assert.equal(reforged.legacyEntries.length,70);
  assert.equal(new Set([...reforged.activeNames,...reforged.retiredNames]).size,70);
  let branches=0,tiers=0;
  for(const name of reforged.activeNames){
    const d=reforged.definitions[name];
    assert.equal(d.reforged,true,name);
    assert.equal(d.hidden,false,name);
    for(const key of ['tagline','playstyle','decision','counterplay','lore','arme'])assert.ok(d[key]&&d[key].trim().length>10,name+' '+key);
    assert.equal(d.branches.length,2,name);
    assert.notEqual(d.branches[0].nom,d.branches[1].nom,name);
    for(const branch of d.branches){
      branches++;tiers+=branch.paliers.length;
      assert.deepEqual(branch.paliers.map(p=>p.niv),[d.evolvesFrom?10:1],name);
      assert.equal(branch.ability,branch.paliers[0],name+' uses one compatibility object');
      assert.equal(branch.linear,true);
      assert.equal(branch.ability.linear,true);
      assert.ok(branch.legacyNames.length>0,name+' preserves existing branch selection');
      assert.equal(branch.combatRules.tiers,undefined,name+' has no threshold table');
      assert.deepEqual(branch.ability.scaling,branch.scaling);
      assert.ok(branch.combatRules.operations.length>0,name+' final operation contract required');
    }
    const old=legacy.definitions[name];
    for(const key of ['pvN','epN','emN'])assert.equal(d[key],old[key],name+' character growth unchanged');
    for(const key of ['pvN','epN','emN'])assert.equal(growth.effectiveDefinition(name)[key],d[key],name+' server growth');
  }
  assert.equal(branches,48);assert.equal(tiers,48);
  for(const name of reforged.retiredNames){
    const d=reforged.definitions[name];
    assert.equal(d.retired,true,name);assert.equal(d.hidden,true,name);
    assert.deepEqual(d.branches,legacy.definitions[name].branches,name+' old rules retained');
  }
});

test('Retirement is enforced in selectors even for an old visibility override',()=>{
  const visible=fn('isSermVisibleInLibrary',{window:{NPSermentsExpansion:reforged}});
  assert.equal(visible('Massier',{hidden:false}),false);
  assert.equal(visible('Pugiliste',{hidden:false}),true);
  assert.equal(visible('Serment du staff',{hidden:false}),true);
  assert.equal(visible('Serment du staff',{hidden:true}),false);
});

test('Authored identities remain intact and each stable ability matches the linear combat contract',()=>{
  const source=JSON.parse(fs.readFileSync(path.join(root,'docs/serments-reforged-source.json'),'utf8'));
  const contract=JSON.parse(fs.readFileSync(path.join(root,'docs/serments-reforged-mechanics.json'),'utf8'));
  const clean=text=>text.replaceAll('corrosion reforgée','corrosion alchimique').replaceAll('protection reforgée','protection de serment').replaceAll('empoisonnement natif','empoisonnement');
  for(const entry of source.entries){
    const runtime=reforged.definitions[entry.name],mechanics=contract.entries.find(item=>item.name===entry.name);
    for(const key of ['vow','awakening','worldRole','evolutionMeaning']){
      assert.ok(entry[key]?.trim(),entry.name+' '+key);
      assert.equal(runtime[key],entry[key]);
    }
    assert.equal(entry.lore.split(/\n\s*\n/).length,2,entry.name+' readable story paragraphs');
    for(const [bi,branch] of entry.branches.entries()){
      const rendered=runtime.branches[bi],rules=mechanics.branches[bi];
      assert.equal(rendered.roleplay,branch.roleplay);
      assert.equal(new Set(branch.tierNames).size,4);
      assert.deepEqual(rendered.combatRules.cost,rules.cost);
      assert.equal(rendered.combatRules.model,rules.model);
      const ability=rendered.ability;
      assert.equal(ability.nom,branch.name);
      assert.equal(ability.manifestation,branch.visual);
      assert.ok(ability.manifestation?.trim());
      assert.equal(ability.desc,clean(rules.ability.effectFormula));
      assert.deepEqual(ability.combatRules.cost,rules.ability.cost);
      assert.deepEqual(ability.scaling,rules.ability.scaling);
      assert.equal(ability.combatRules.operations.length,rules.ability.operations.length);
    }
  }
});

test('Historical branch labels resolve to the same exclusive branch without rewriting a character',()=>{
  const normalize=fn('normalizeBranchLabel',{});
  const matches=fn('branchMatchesLabel',{normalizeBranchLabel:normalize});
  for(const name of reforged.activeNames){
    for(const [i,branch] of reforged.definitions[name].branches.entries()){
      for(const old of branch.legacyNames){assert.equal(matches(branch,old),true,name+' '+old);assert.equal(matches(reforged.definitions[name].branches[1-i],old),false,name+' must not cross branches');}
    }
  }
});

test('Every public and historical weapon has a painted master and lightweight delivery assets; unknown labels stay text',()=>{
  const context={};context.window=context;
  vm.runInNewContext(fs.readFileSync(path.join(root,'assets/js/serments-emblems.js'),'utf8'),context);
  const names=[...reforged.activeNames,'Duelliste','Sauvageon','Croisé','Rôdeur','Traqueur','Archer','Elementaliste','Evocateur','Conjurateur','Arcaniste','Bretteur','Claymore',"Lame d'Honneur"];
  const paths=new Set();
  for(const name of names){
    const file=context.NPSermentArt[name];assert.match(file,/^assets\/serments\/painted\/[a-z0-9-]+\.jpg$/,name);
    paths.add(file);
    const full=fs.readFileSync(path.join(root,file));
    assert.equal(full.readUInt16BE(0),0xffd8,name+' JPEG');
    assert.ok(full.length<400000,name+' delivery size');
    assert.ok(fs.existsSync(path.join(root,file.replace('.jpg','.png'))),name+' original kept');
    const thumb=fs.statSync(path.join(root,file.replace('.jpg','-thumb.jpg')));
    assert.ok(thumb.size<30000,name+' small combat image');
    assert.match(context.npSermentEmblem(name,32),/-thumb\.jpg/);
    assert.doesNotMatch(context.npSermentEmblem(name,320),/-thumb\.jpg/);
  }
  assert.equal(paths.size,37);
  assert.doesNotMatch(context.npSermentEmblem('<img src=x onerror=alert(1)>',32),/<img src=x/);
});

test('Legacy registry, revised data, painted renderer and both combat engines load in dependency order',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const scripts=['serments-expansion-data.js','serments-reforged-data.js','serments-emblems.js','main.js','serments-combat.js','serments-reforged-combat.js'];
  const positions=scripts.map(name=>html.indexOf('assets/js/'+name));
  assert.ok(positions.every((p,i)=>p>=0&&(!i||p>positions[i-1])));
});

test('generated operation formulas exactly match the executable rules through level 100',()=>{
  const engine=require('../assets/js/serments-reforged-combat');
  const clean=text=>text.replaceAll('corrosion reforgée','corrosion alchimique').replaceAll('protection reforgée','protection de serment').replaceAll('empoisonnement natif','empoisonnement');
  let rounded=0;
  for(const entry of reforged.entries)for(const branch of reforged.definitions[entry.name].branches){
    const operations=branch.ability.combatRules.operations;
    for(const level of [branch.minLevel,branch.minLevel+1,branch.minLevel+2,20,35,36,57,100]){
      const actual=engine.describe(entry.name,branch.key,level).operations;
      assert.deepEqual(actual.map(op=>op.id),operations.map(op=>op.id));
      operations.forEach((operation,index)=>{
        assert.equal(operation.unlock,undefined);
        const text=operation.ruleParts.map(part=>{
          if(typeof part==='string')return part;
          const value=(part.base+part.perLevel*level)/(part.divisor||1);
          if(part.round==='ceil'){rounded++;return Math.ceil(value);}
          return value;
        }).join('');
        assert.equal(text,clean(actual[index].rule),entry.name+' '+branch.key+' '+operation.id+' N='+level);
        assert.deepEqual(operation.cost,actual[index].cost);
      });
    }
  }
  assert.ok(rounded>0,'Half-values are verified, including odd-number rounding');
});
