'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const catalog = require('../assets/js/theme-catalog');

test('the nine existing packs keep their palette identity and have complete schemas', () => {
  const identity = {
    dark:['#091519','#95cdbb'], light:['#f4f5fa','#3a8fba'],
    violet:['#03020b','#9b7cff'], green:['#031108','#51c56d'],
    aquaris:['#011018','#48d6ef'], easter:['#effbe9','#63c76c'],
    halloween:['#0a0911','#ff8f2b'], noel:['#08140d','#d84a52'],
    bloodmoon:['#050102','#e3133f']
  };
  assert.equal(catalog.schemaVersion, 1);
  assert.equal(catalog.list().length, 9);
  assert.deepEqual(catalog.baseIds, ['dark','light']);
  for (const theme of catalog.list()) {
    assert.deepEqual([theme.vars.bg,theme.vars.accent], identity[theme.id]);
    assert.deepEqual(catalog.validate(theme), {valid:true,errors:[]});
    assert.equal(theme.name,theme.label);
    assert.equal(theme.description,theme.desc);
    assert.equal(theme.paletteStatus,'builtin');
  }
});

test('historical aliases share canonical identities while custom ids remain stable', () => {
  const aliases = {
    'theme-default':'dark', 'Nuages Polaires':'dark', 'original':'dark', 'base':'dark',
    'Écarlate':'dark', 'theme-red':'dark', 'scarlet':'dark', 'themered':'dark',
    'Brume Claire':'light', 'Mode Clair':'light', 'clair':'light',
    'themeviolet':'violet', 'Abyssal':'violet', 'Sylvan':'green', 'themegreen':'green',
    'Aquarius':'aquaris', 'themeaquaris':'aquaris', 'Printemps Éveillé':'easter',
    'Pâques':'easter', 'paque':'easter', 'springawakened':'easter', 'themeeaster':'easter',
    'Christmas':'noel', 'themenoel':'noel', 'themehalloween':'halloween',
    'blood-moon':'bloodmoon', 'Lune de Sang':'bloodmoon', 'themebloodmoon':'bloodmoon',
    'bloodmoonlegacy':'bloodmoon', 'lunebloodmoon':'bloodmoon'
  };
  for (const [alias,id] of Object.entries(aliases)) assert.equal(catalog.normalizeId(alias),id,alias);
  assert.equal(catalog.normalizeId('my_pack-42'),'my_pack-42');
  assert.equal(catalog.get('missing-pack'),null);
});

test('array and map overrides merge aliases while retaining acquisition data and canonical visuals', () => {
  const raw = [{id:'aquarius',autoGrantAll:true,visible:false,availableUntil:42,earlyCloudsOnly:true,name:'Legacy name',preview:['#000','#000','#000']},
    {id:'theme-aquaris',blockedReason:'retired',createdAt:123}];
  const before = JSON.stringify(raw);
  const theme = catalog.get('aquaris',raw);
  assert.equal(JSON.stringify(raw),before);
  assert.equal(catalog.list(raw).length,9);
  assert.equal(theme.label,'Aquaris — Royaume englouti');
  assert.equal(theme.vars.accent,'#48d6ef');
  assert.equal(theme.autoGrantAll,true);
  assert.equal(theme.visible,false);
  assert.equal(theme.availableUntil,42);
  assert.equal(theme.earlyCloudsOnly,true);
  assert.equal(theme.blockedReason,'retired');
  assert.equal(theme.createdAt,123);
  assert.deepEqual(catalog.get('aquaris',{aquarius:{visible:false,autoGrantAll:true}}).preview,theme.preview);
  const copy = catalog.get('dark'); copy.vars.bg='#ffffff';
  assert.equal(catalog.get('dark').vars.bg,'#091519');
});

test('seasonal windows survive missing database entries and explicit overrides', () => {
  for(const [id,until] of Object.entries({easter:1777593600000,halloween:1793577600000,noel:1799193600000})) {
    assert.equal(catalog.get(id).availableUntil,until);
    assert.equal(catalog.get(id,[{id,visible:false}]).availableUntil,until);
    assert.equal(catalog.get(id,[{id,availableUntil:0}]).availableUntil,0);
  }
  assert.equal(catalog.get('bloodmoon').event,false);
  for(const invalid of ['not-a-date','',null,false,{}]) {
    const theme=catalog.get('easter',[{id:'easter',availableUntil:invalid}]);
    assert.deepEqual(theme.availableUntil,invalid);
    assert.equal(theme.acquisitionInvalid,true);
  }
  assert.equal(catalog.get('custom',[{id:'custom'}]).availableUntil,0);
  assert.equal(catalog.get('custom',[{id:'custom'}]).acquisitionInvalid,undefined);
});

test('legacy custom previews become complete palettes and retain their identity', () => {
  const theme = catalog.get('custom-mist', {'custom-mist':{name:'Brume personnelle',preview:['#123','#A7D','#fed'],visible:true,autoGrantAll:false}});
  assert.equal(theme.paletteStatus,'derived');
  assert.equal(theme.cls,'theme-custom-mist');
  assert.deepEqual(theme.preview,['#112233','#aa77dd','#ffeedd']);
  assert.equal(theme.visible,true);
  assert.equal(theme.autoGrantAll,false);
  assert.equal(catalog.validate(theme).valid,true);
  const tokens = catalog.tokens(theme);
  assert.equal(tokens['--bg'],'#112233');
  assert.equal(tokens['--tm-accent'],'#aa77dd');
});

test('explicit palettes derive missing roles, repair unreadable text and never accept CSS as a color', () => {
  const raw = [{id:'day',palette:{bg:'#ffffff',accent:'#777777',accentBright:'#bb4488',text:'#ffffff'}}];
  const theme = catalog.get('day',raw);
  assert.equal(theme.paletteStatus,'custom');
  assert.equal(theme.tone,'light');
  assert.ok(catalog.contrast(theme.vars.text,theme.vars.bg2)>=4.5);
  const bad = catalog.get('bad',[{id:'bad',preview:['#fff','#aaa','#333'],palette:{accent:'red; background:url(https://example.invalid/a)'}}]);
  assert.equal(bad.paletteStatus,'fallback');
  assert.equal(bad.id,'bad');
  assert.equal(bad.vars.accent,catalog.get('dark').vars.accent);
  assert.equal(catalog.validate(bad).valid,true);
  assert.equal(JSON.stringify(catalog.tokens(bad)).includes('url('),false);
  const malformed=catalog.get('dark');malformed.vars.bg='url(x)';
  assert.equal(catalog.validate(malformed).valid,false);
  assert.throws(()=>catalog.tokens(malformed),TypeError);
});

test('unsafe ids and prototype keys cannot enter the catalogue', () => {
  const raw=JSON.parse('{"__proto__":{"id":"__proto__","polluted":true},"good":{"id":"good","preview":["#112233","#abcdef","#aa8877"],"__proto__":{"polluted":true}}}');
  assert.equal(catalog.get('__proto__',raw),null);
  assert.equal(catalog.get('bad" onclick=x',[{id:'bad" onclick=x'}]),null);
  assert.equal(catalog.get('good',raw).polluted,undefined);
  assert.equal({}.polluted,undefined);
});

test('computed controls, links and muted text are readable across packs and accent extremes', () => {
  const themes=catalog.list();
  for(const accent of ['#000000','#ffffff','#777777','#ffff00','#ff00ff','#00ffff']) {
    themes.push(catalog.get('stress',[{id:'stress',preview:['#123456',accent,'#e6b880']} ]));
  }
  for(const theme of themes) {
    const t=catalog.tokens(theme);
    assert.ok(catalog.contrast(t['--tm-primary-text'],t['--tm-primary-bg'])>=4.5,theme.id);
    for(const surface of ['bg','bg2','bg3','bg4']) {
      for(const token of ['--tm-link','--accent','--tm-text-muted','--tm-faint','--faint','--glacier-dim']) {
        assert.ok(catalog.contrast(t[token],theme.vars[surface])>=4.5,theme.id+' '+token+' on '+surface);
      }
    }
    for(const kind of ['danger','success','warning','info']) {
      assert.ok(catalog.contrast(t['--status-'+kind+'-on'],t['--status-'+kind])>=4.5,theme.id+' '+kind+' filled badge');
    }
    assert.equal(t['--glacier'],t['--tm-accent']);
    assert.equal(t['--accent'],t['--tm-link']);
    assert.equal(t['--tm-primary-bg'],theme.vars.accent);
    assert.equal(t['--glacier-dimcss'],t['--glacier-dim']);
    assert.equal(t['--accent-dim'],t['--tm-accent-dim']);
    assert.equal(t['--theme-contrast'],t['--tm-primary-text']);
    assert.ok(Object.values(t).every(value=>typeof value==='string'&&value.length));
  }
});

test('semantic status colors remain independent from decorative accents', () => {
  const dark=catalog.tokens('dark'),galaxy=catalog.tokens('violet'),blood=catalog.tokens('bloodmoon');
  for(const token of ['--red','--green','--gold','--status-danger','--status-success','--status-warning','--status-info']) {
    assert.equal(dark[token],galaxy[token]);
    assert.equal(dark[token],blood[token]);
  }
  assert.notEqual(blood['--gold'],blood['--tm-accent-bright']);
  assert.equal(new Set(['--status-danger','--status-success','--status-warning','--status-info'].map(t=>blood[t])).size,4);
});

test('generic controls and inputs use their theme surfaces while pack decorations remain intact', () => {
  for(const theme of catalog.list()) {
    const before=JSON.stringify(theme.vars);
    const t=catalog.tokens(theme);
    assert.equal(JSON.stringify(theme.vars),before);
    if(theme.id==='violet' || theme.id==='green') {
      assert.ok(t['--tm-control-bg'].includes('linear-gradient'));
      assert.ok(t['--tm-card-bg'].includes('radial-gradient'));
    }else{
      assert.ok(t['--tm-control-bg'].endsWith(theme.vars.bg3),theme.id+' control');
      assert.ok(t['--tm-control-bg-hover'].endsWith(theme.vars.bg4),theme.id+' hover');
      assert.ok(t['--tm-input-bg'].endsWith(theme.vars.bg),theme.id+' input');
    }
  }
});

test('custom middle grays and incompatible explicit surfaces receive readable roles without changing page color', () => {
  const samples=['#707070','#727272','#747474'].map(bg=>({id:'middle-'+bg.slice(1),preview:[bg,'#55aa88','#bb8877']}));
  samples.push({id:'extreme',palette:{bg:'#000000',bg2:'#777777',bg3:'#ffffff',bg4:'#ffffff',accent:'#55aa88',accentBright:'#bb8877'}});
  for(const raw of samples){
    const theme=catalog.get(raw.id,[raw]),tokens=catalog.tokens(theme);
    assert.equal(theme.vars.bg,raw.palette?raw.palette.bg:raw.preview[0]);
    assert.equal(catalog.validate(theme).valid,true);
    assert.equal(theme.paletteStatus,'repaired');
    assert.ok(theme.repairedSurfaces.length>0);
    assert.equal(theme.repairedSurfaces.includes('bg'),false);
    for(const key of ['bg','bg2','bg3','bg4']){
      for(const role of ['--text','--dim','--faint','--tm-text-soft','--tm-text-muted','--tm-link','--glacier-dim','--status-danger','--status-success','--status-warning','--status-info']){
        assert.ok(catalog.contrast(tokens[role],theme.vars[key])>=4.5,raw.id+' '+role+' on '+key);
      }
    }
  }
  // Mixed extremes alone still admit a shared gray: avoid unnecessary surface edits.
  const compatible=catalog.get('mixed',[{id:'mixed',palette:{bg:'#000000',bg2:'#ffffff',bg3:'#000000',bg4:'#ffffff',accent:'#55aa88',accentBright:'#bb8877'}}]);
  assert.equal(compatible.paletteStatus,'custom');
  assert.equal(compatible.vars.bg2,'#ffffff');
  assert.equal(compatible.repairedSurfaces,undefined);
  assert.ok(catalog.contrast(compatible.vars.text,'#000000')>=4.5);
  assert.ok(catalog.contrast(compatible.vars.text,'#ffffff')>=4.5);
});

test('browser and CommonJS expose the same catalogue without DOM or storage dependencies', () => {
  const sandbox={};
  vm.runInNewContext(fs.readFileSync(require.resolve('../assets/js/theme-catalog'),'utf8'),sandbox);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.NPThemeCatalog.list())),catalog.list());
});
