/* Nuages Polaires — shared, versioned theme catalogue.
 * No DOM, storage or authorization side effects. Theme ownership is server data.
 */
(function(root, factory){
  'use strict';
  var catalogue = factory();
  if(typeof module === 'object' && module.exports) module.exports = catalogue;
  else root.NPThemeCatalog = catalogue;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';
  var BUILTINS = {
    dark: {
      id:'dark', label:'Nuages Polaires', cls:'', rarity:'Base', category:'Base',
      tagline:'Mystique polaire — un monde à écrire.',
      desc:'Nuit d’encre, lumière d’aurore et ivoire. La signature visuelle de Nuages Polaires.',
      colors:['#091519','#95cdbb','#c6b38b'],
      tone:'dark',
      vars:{
        bg:'#091519', bg2:'#102327', bg3:'#172e32', bg4:'#213b3e',
        text:'#f0eee5', dim:'#bdcdc8', faint:'#92aaa3',
        accent:'#95cdbb', accentDim:'#648f83', accentBright:'#c6b38b',
        accentRgb:'149,205,187', accent2Rgb:'198,179,139',
        pageBg:'radial-gradient(ellipse at 90% 0%,rgba(149,205,187,.07),transparent 40rem),linear-gradient(180deg,#091519,#0b1a1d)'
      }
    },
    light: {
      id:'light', label:'Brume Claire', cls:'light', rarity:'Base', category:'Base',
      tagline:'Une lecture plus claire et apaisée.',
      desc:'Mode clair, propre et doux.',
      colors:['#f4f5fa','#3a8fba','#9a7020'],
      tone:'light',
      vars:{
        bg:'#f4f5fa', bg2:'#e8edf4', bg3:'#dce4ee', bg4:'#cbd8e5',
        text:'#15202b', dim:'#405363', faint:'#6f8190',
        accent:'#3a8fba', accentDim:'#1e6384', accentBright:'#9a7020',
        accentRgb:'58,143,186', accent2Rgb:'154,112,32',
        pageBg:'radial-gradient(circle at 18% 12%, rgba(58,143,186,.16), transparent 24rem),radial-gradient(circle at 82% 82%, rgba(154,112,32,.09), transparent 26rem),linear-gradient(180deg,#f7f9fc 0%,#e9eff6 52%,#dfe7f1 100%)'
      }
    },
    violet: {
      id:'violet', label:'Galactique', cls:'theme-violet', rarity:'Rare', category:'Rares',
      tagline:'Constellations, nébuleuses et lumière d’orbite.',
      desc:'Un thème spatial franc : ciel profond, étoiles vives, halos stellaires et verre cosmique.',
      colors:['#03020b','#9b7cff','#73d8ff'],
      tone:'dark',
      vars:{
        bg:'#03020b', bg2:'#090621', bg3:'#140d3d', bg4:'#21145f',
        text:'#fcfaff', dim:'#d9d4f4', faint:'#9a93c7',
        accent:'#9b7cff', accentDim:'#5a4ac4', accentBright:'#73d8ff',
        accentRgb:'155,124,255', accent2Rgb:'115,216,255',
        pageBg:'radial-gradient(ellipse at 50% -12%,rgba(203,194,255,.32),transparent 31rem),radial-gradient(circle at 14% 18%,rgba(124,84,255,.34),transparent 26rem),radial-gradient(circle at 86% 18%,rgba(71,206,255,.24),transparent 24rem),radial-gradient(ellipse at 74% 86%,rgba(220,92,255,.20),transparent 32rem),linear-gradient(180deg,#020108 0%,#07041b 34%,#100830 62%,#020108 100%)'
      }
    },
    green: {
      id:'green', label:'Sylvan', cls:'theme-green', rarity:'Rare', category:'Rares',
      tagline:'Jungle dense, canopée vivante et sève lumineuse.',
      desc:'Un thème jungle organique : feuillage humide, lianes mouvantes, mousse profonde et lumière dorée filtrée par la canopée.',
      colors:['#031108','#51c56d','#d8c16a'],
      tone:'dark',
      vars:{
        bg:'#031108', bg2:'#082111', bg3:'#12381d', bg4:'#1e552d',
        text:'#f3fff0', dim:'#c9edbf', faint:'#8db883',
        accent:'#51c56d', accentDim:'#1f7d40', accentBright:'#d8c16a',
        accentRgb:'81,197,109', accent2Rgb:'216,193,106',
        pageBg:'radial-gradient(ellipse at 12% -8%, rgba(118,229,133,.30), transparent 27rem),radial-gradient(circle at 82% 8%, rgba(216,193,106,.16), transparent 22rem),radial-gradient(ellipse at 44% 112%, rgba(8,73,28,.82), transparent 45rem),repeating-linear-gradient(108deg, rgba(129,229,118,.055) 0 2px, transparent 2px 42px),linear-gradient(180deg,#031108 0%,#082111 42%,#031008 100%)'
      }
    },
    easter: {
      id:'easter', label:'Pâques enchantées', cls:'theme-easter', rarity:'Saisonnier', category:'Saisonniers',
      tagline:'Printemps vivant, mignon et coloré.',
      desc:'Un printemps joyeux : fleurs, herbe, lumière douce et couleurs pastel.',
      colors:['#f7fff2','#7fdc82','#ffd86b','#ffb6d8'],
      tone:'light',
      vars:{
        bg:'#effbe9', bg2:'#e5f7de', bg3:'#d7f2cf', bg4:'#c6ebbd',
        text:'#203227', dim:'#49655a', faint:'#668378',
        accent:'#63c76c', accentDim:'#38914a', accentBright:'#ff83bc',
        accentRgb:'127,220,130', accent2Rgb:'255,182,216',
        pageBg:'radial-gradient(circle at 12% 10%, rgba(255,216,107,.34), transparent 20rem),radial-gradient(circle at 88% 14%, rgba(255,182,216,.28), transparent 18rem),radial-gradient(circle at 70% 82%, rgba(127,220,130,.28), transparent 25rem),linear-gradient(180deg,#f5fff1 0%,#eaf9e4 50%,#def2d5 100%)'
      }
    },
    halloween: {
      id:'halloween', label:'Veille d’Halloween', cls:'theme-halloween', rarity:'Saisonnier', category:'Saisonniers',
      tagline:'Presque creepy, entre citrouille et brume.',
      desc:'Nuit violette, lueur orange et ambiance inquiétante.',
      colors:['#0a0911','#ff8f2b','#7c59ff','#d8d2ff'],
      tone:'dark',
      vars:{
        bg:'#0a0911', bg2:'#110d18', bg3:'#191224', bg4:'#251830',
        text:'#fff4ea', dim:'#e8ccb6', faint:'#a98e8d',
        accent:'#ff8f2b', accentDim:'#a04b12', accentBright:'#d8d2ff',
        accentRgb:'255,143,43', accent2Rgb:'124,89,255',
        pageBg:'radial-gradient(circle at 84% 16%, rgba(255,143,43,.16), transparent 18rem),radial-gradient(circle at 18% 84%, rgba(124,89,255,.14), transparent 22rem),linear-gradient(180deg,#0a0911 0%,#110d18 50%,#05040a 100%)'
      }
    },
    noel: {
      id:'noel', label:'Noël en fête', cls:'theme-noel', rarity:'Saisonnier', category:'Saisonniers',
      tagline:'Festif, chaleureux, rouge, vert et or.',
      desc:'Un Noël lumineux, rouge, vert, doré et enneigé.',
      colors:['#08140d','#d84a52','#2ea85f','#f2c66d'],
      tone:'dark',
      vars:{
        bg:'#08140d', bg2:'#0d1e12', bg3:'#132816', bg4:'#1d361f',
        text:'#fbfff9', dim:'#d8ead7', faint:'#9bb59e',
        accent:'#d84a52', accentDim:'#8d2430', accentBright:'#f2c66d',
        accentRgb:'216,74,82', accent2Rgb:'46,168,95',
        pageBg:'radial-gradient(circle at 16% 14%, rgba(216,74,82,.16), transparent 22rem),radial-gradient(circle at 84% 18%, rgba(242,198,109,.12), transparent 20rem),radial-gradient(circle at 74% 82%, rgba(46,168,95,.12), transparent 24rem),linear-gradient(180deg,#08140d 0%,#102016 50%,#050b08 100%)'
      }
    },
    aquaris: {
      id:'aquaris', label:'Aquaris — Royaume englouti', cls:'theme-aquaris', rarity:'Rare', category:'Rares',
      tagline:'Royaume englouti, cyan abyssal et or ancien.',
      desc:'Palais noyés, lumière abyssale, cyan profond et or ancien.',
      colors:['#011018','#48d6ef','#e5c878'],
      tone:'dark',
      vars:{
        bg:'#011018', bg2:'#041a24', bg3:'#082b37', bg4:'#0d3f4e',
        text:'#f0fcff', dim:'#c8e8ef', faint:'#8fb6c0',
        accent:'#48d6ef', accentDim:'#15849a', accentBright:'#e5c878',
        accentRgb:'72,214,239', accent2Rgb:'229,200,120',
        pageBg:'repeating-linear-gradient(106deg,rgba(130,238,255,.055) 0 2px,transparent 2px 34px),radial-gradient(ellipse 780px 260px at 50% -8%, rgba(177,249,255,.16), transparent 72%),radial-gradient(circle at 15% 18%, rgba(72,214,239,.16), transparent 27rem),radial-gradient(circle at 84% 82%, rgba(229,200,120,.10), transparent 27rem),linear-gradient(180deg,#011018 0%,#062431 46%,#02090f 100%)'
      }
    },
    bloodmoon: {
      id:'bloodmoon', label:'BloodMoon', cls:'theme-bloodmoon', rarity:'Fondateur', category:'Fondateur',
      tagline:'Lune rouge souveraine et tension rituelle.',
      desc:'Noir rituel, lune carmine, menace souveraine et éclat cramoisi.',
      signature:'Lune de sang',
      colors:['#050102','#e3133f','#f0c76f'],
      tone:'dark',
      vars:{
        bg:'#050102', bg2:'#0c0305', bg3:'#17060a', bg4:'#260912',
        text:'#fff6f3', dim:'#f0c4bd', faint:'#b07d82',
        accent:'#e3133f', accentDim:'#76061f', accentBright:'#ff7d92',
        accentRgb:'227,19,63', accent2Rgb:'240,199,111',
        pageBg:'radial-gradient(circle at 82% 12%, rgba(255,226,210,.98) 0 1rem, rgba(227,19,63,.98) 1.05rem 5.1rem, rgba(95,4,22,.62) 5.2rem 8.2rem, transparent 8.4rem),radial-gradient(circle at 18% 78%, rgba(227,19,63,.18), transparent 26rem),radial-gradient(circle at 74% 74%, rgba(240,199,111,.08), transparent 22rem),linear-gradient(180deg,#050102 0%,#120407 52%,#020101 100%)'
      }
    }
  };

  var ORDER = ['dark','light','violet','green','aquaris','easter','halloween','noel','bloodmoon'];

  var BASE_IDS = ['dark','light'];
  var COLOR_KEYS = ['bg','bg2','bg3','bg4','text','dim','faint','accent','accentDim','accentBright'];
  var ALIASES = {
    dark:'dark',default:'dark',themedefault:'dark',nuagespolaires:'dark',original:'dark',base:'dark',
    red:'dark',ecarlate:'dark',scarlet:'dark',themered:'dark',
    light:'light',brumeclaire:'light',modeclair:'light',clair:'light',themelight:'light',
    violet:'violet',abyssal:'violet',themeviolet:'violet',
    green:'green',sylvan:'green',themegreen:'green',
    aquaris:'aquaris',aquarius:'aquaris',themeaquaris:'aquaris',
    bloodmoon:'bloodmoon',themebloodmoon:'bloodmoon',lunedesang:'bloodmoon',bloodmoonlegacy:'bloodmoon',lunebloodmoon:'bloodmoon',
    easter:'easter',themeeaster:'easter',printempseveille:'easter',paques:'easter',paque:'easter',springawakened:'easter',
    halloween:'halloween',themehalloween:'halloween',noel:'noel',themenoel:'noel',christmas:'noel'
  };
  // Existing acquisition windows are preserved; the database can override them.
  var ACQUISITION_DEFAULTS = {easter:{availableUntil:1777593600000},halloween:{availableUntil:1793577600000},noel:{availableUntil:1799193600000}};
  function normalizeId(value){
    var id = String(value == null ? '' : value).trim().toLowerCase().replace(/^theme-/, '');
    if(!id) return 'dark';
    var loose=id.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
    return Object.prototype.hasOwnProperty.call(ALIASES,loose) ? ALIASES[loose] : id;
  }
  function clone(value){ return JSON.parse(JSON.stringify(value)); }
  function safeAssign(target, source){
    Object.keys(source || {}).forEach(function(key){
      if(key !== '__proto__' && key !== 'constructor' && key !== 'prototype') target[key] = source[key];
    });
    return target;
  }
  function safeId(id){ return /^[a-z0-9][a-z0-9_-]{0,127}$/.test(id) && ['__proto__','constructor','prototype'].indexOf(id)<0; }
  function hex(value){
    if(typeof value !== 'string' || !/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(value)) return null;
    var h=value.toLowerCase();
    return h.length===4 ? '#'+h[1]+h[1]+h[2]+h[2]+h[3]+h[3] : h;
  }
  function rgb(value){ var h=hex(value); return h ? [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)] : null; }
  function mix(a,b,t){ var x=rgb(a), y=rgb(b); return '#'+x.map(function(v,i){return Math.round(v+(y[i]-v)*t).toString(16).padStart(2,'0');}).join(''); }
  function luminance(value){
    var values=rgb(value);
    if(!values) return null;
    values=values.map(function(v){v/=255;return v<=0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4);});
    return values[0]*.2126+values[1]*.7152+values[2]*.0722;
  }
  function contrast(a,b){ var x=luminance(a),y=luminance(b);return x===null||y===null ? null : (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
  function foreground(bg){ return contrast('#000000',bg)>=contrast('#ffffff',bg) ? '#000000' : '#ffffff'; }
  function readable(color,bg){
    if(contrast(color,bg)>=4.5) return color;
    var target=foreground(bg);
    for(var i=1;i<=20;i++){var candidate=mix(color,target,i/20);if(contrast(candidate,bg)>=4.5)return candidate;}
    return target;
  }
  function findReadableOn(color,backgrounds){
    function minimum(candidate){return Math.min.apply(null,backgrounds.map(function(bg){return contrast(candidate,bg);}));}
    if(minimum(color)>=4.5) return color;
    var target=minimum('#000000')>=minimum('#ffffff') ? '#000000':'#ffffff';
    for(var i=1;i<=100;i++){
      var candidate=mix(color,target,i/100);
      if(minimum(candidate)>=4.5) return candidate;
    }
    // Mixed surfaces can share a middle gray even when neither black nor white works.
    var best=null, distance=Infinity;
    for(var gray=0;gray<=255;gray++){
      var channel=gray.toString(16).padStart(2,'0'), neutral='#'+channel+channel+channel;
      var delta=Math.abs(luminance(neutral)-luminance(color));
      if(minimum(neutral)>=4.5 && delta<distance){best=neutral;distance=delta;}
    }
    return best;
  }
  function readableOn(color,backgrounds){
    return findReadableOn(color,backgrounds) || foreground(backgrounds[0]);
  }
  function entriesArray(entries){
    if(Array.isArray(entries)) return entries;
    if(!entries || typeof entries!=='object') return [];
    return Object.keys(entries).map(function(id){var item=entries[id];return item && typeof item==='object' && !Array.isArray(item) ? safeAssign({id:id},item) : null;}).filter(Boolean);
  }
  function derivePalette(preview, explicit){
    var colors=Array.isArray(preview) ? preview : [];
    var p=explicit && typeof explicit==='object' && !Array.isArray(explicit) ? explicit : {};
    var invalid=Object.keys(p).some(function(k){return COLOR_KEYS.indexOf(k)>=0 && !hex(p[k]);});
    var bg=hex(p.bg)||hex(colors[0]);
    var accent=hex(p.accent)||hex(colors[1]);
    var bright=hex(p.accentBright)||hex(colors[2]);
    var fallback=invalid || !bg || !accent || !bright;
    if(fallback){ bg=BUILTINS.dark.vars.bg;accent=BUILTINS.dark.vars.accent;bright=BUILTINS.dark.vars.accentBright;p={}; }
    var tone=luminance(bg)>.35 ? 'light':'dark';
    var endpoint=tone==='light' ? '#000000':'#ffffff';
    var vars={bg:bg,bg2:mix(bg,endpoint,.04),bg3:mix(bg,endpoint,.08),bg4:mix(bg,endpoint,.12),text:mix(endpoint,bg,.06),dim:mix(endpoint,bg,.22),faint:mix(endpoint,bg,.34),accent:accent,accentDim:mix(accent,bg,.30),accentBright:bright};
    COLOR_KEYS.forEach(function(key){if(hex(p[key]))vars[key]=hex(p[key]);});
    var surfaceKeys=['bg','bg2','bg3','bg4'];
    var surfaces=surfaceKeys.map(function(key){return vars[key];});
    var repairedSurfaces=[];
    if(!findReadableOn(vars.text,surfaces)){
      // A custom palette must have one readable text role. Preserve the chosen
      // page background and tint only incompatible surfaces toward a safe tone.
      var ink=foreground(vars.bg);
      surfaceKeys.forEach(function(key){
        if(contrast(ink,vars[key])<4.5){
          vars[key]=readable(vars[key],ink);
          repairedSurfaces.push(key);
        }
      });
      surfaces=surfaceKeys.map(function(key){return vars[key];});
    }
    ['text','dim','faint'].forEach(function(key){vars[key]=readableOn(vars[key],surfaces);});
    vars.accentRgb=rgb(vars.accent).join(',');
    vars.accent2Rgb=rgb(vars.accentBright).join(',');
    vars.pageBg='linear-gradient(180deg,'+vars.bg+','+vars.bg2+')';
    return {vars:vars,tone:tone,repairedSurfaces:repairedSurfaces,status:fallback?'fallback':(repairedSurfaces.length?'repaired':(Object.keys(p).length?'custom':'derived'))};
  }
  function resolve(raw,id){
    var builtin=Object.prototype.hasOwnProperty.call(BUILTINS,id) ? BUILTINS[id] : null;
    var entry=safeAssign(safeAssign({},ACQUISITION_DEFAULTS[id]),raw || {});
    if(builtin){
      safeAssign(entry,clone(builtin));
      entry.event=['easter','halloween','noel'].indexOf(id)>=0;
      entry.paletteStatus='builtin';
    }else{
      var derived=derivePalette(entry.preview || entry.colors,entry.palette || entry.vars);
      entry.id=id;entry.cls='theme-'+id;
      entry.label=String(entry.label || entry.name || id).slice(0,160);
      entry.desc=String(entry.desc || entry.description || '').slice(0,2000);
      entry.tagline=String(entry.tagline || entry.desc || 'Un thème de ta collection.').slice(0,300);
      entry.rarity=String(entry.rarity || 'Saisonnier').slice(0,80);
      entry.category=String(entry.category || 'Saisonniers').slice(0,80);
      entry.tone=derived.tone;entry.vars=derived.vars;entry.paletteStatus=derived.status;
      if(derived.repairedSurfaces.length) entry.repairedSurfaces=derived.repairedSurfaces;
      entry.colors=[derived.vars.bg,derived.vars.accent,derived.vars.accentBright];
      entry.event=entry.event!==false;
    }
    entry.schemaVersion=1;entry.name=entry.label;entry.description=entry.desc;
    entry.preview=entry.colors.slice(0,3);entry.previewColors=entry.colors.slice();
    if(entry.availableUntil === undefined) entry.availableUntil=0;
    else if((typeof entry.availableUntil==='number' || (typeof entry.availableUntil==='string' && entry.availableUntil.trim()!=='')) && Number.isFinite(Number(entry.availableUntil))) entry.availableUntil=Number(entry.availableUntil);
    else entry.acquisitionInvalid=true; // Preserve the bad value: never turn it into an unlimited window.
    return entry;
  }
  function list(entries){
    var byId=Object.create(null), order=ORDER.slice();
    order.forEach(function(id){byId[id]={};});
    entriesArray(entries).forEach(function(raw){
      if(!raw || typeof raw!=='object' || !raw.id) return;
      var id=normalizeId(raw.id);
      if(!safeId(id)) return;
      if(!Object.prototype.hasOwnProperty.call(byId,id)){byId[id]={};order.push(id);}
      safeAssign(byId[id],clone(raw));
    });
    return order.map(function(id){return resolve(byId[id],id);});
  }
  function get(id,entries){var normalized=normalizeId(id);return list(entries).find(function(t){return t.id===normalized;}) || null;}
  function validate(entry){
    var errors=[];
    if(!entry || typeof entry!=='object') return {valid:false,errors:['Theme must be an object']};
    if(!safeId(entry.id || '')) errors.push('Invalid id');
    if(entry.tone!=='dark' && entry.tone!=='light') errors.push('Invalid tone');
    if(!Array.isArray(entry.colors) || entry.colors.length<3 || entry.colors.some(function(c){return !hex(c);})) errors.push('Invalid preview colors');
    COLOR_KEYS.forEach(function(key){if(!entry.vars || !hex(entry.vars[key]))errors.push('Invalid palette '+key);});
    ['accentRgb','accent2Rgb'].forEach(function(key){if(!entry.vars || !/^\d{1,3},\d{1,3},\d{1,3}$/.test(entry.vars[key]) || entry.vars[key].split(',').some(function(n){return Number(n)>255;}))errors.push('Invalid '+key);});
    if(!entry.vars || typeof entry.vars.pageBg!=='string' || /url\s*\(|[{};<>]/i.test(entry.vars.pageBg)) errors.push('Invalid page background');
    return {valid:errors.length===0,errors:errors};
  }
  function tokensFor(theme){
    var c=typeof theme==='string' ? get(theme) : theme;
    if(!validate(c).valid) throw new TypeError('Invalid theme palette');
    var v=c.vars, tokens={};
    var surfaces=[v.bg,v.bg2,v.bg3,v.bg4];
    var textSoft = readableOn(v.dim,surfaces);
    var textMuted = readableOn(v.faint,surfaces);
    var dimAccent = readableOn(v.accentDim,surfaces);
    var linkAccent = readableOn(v.accent,surfaces);
    var panelBase = c.tone === 'light'
      ? 'linear-gradient(180deg,rgba(255,255,255,.92),rgba(255,255,255,.74)),rgba(' + v.accentRgb + ',.045)'
      : 'linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.014)),linear-gradient(180deg,' + v.bg2 + ',' + v.bg + ')';
    var panelStrong = c.tone === 'light'
      ? 'linear-gradient(180deg,rgba(255,255,255,.98),rgba(255,255,255,.82)),rgba(' + v.accentRgb + ',.070)'
      : 'linear-gradient(180deg,rgba(255,255,255,.060),rgba(255,255,255,.018)),linear-gradient(180deg,' + v.bg3 + ',' + v.bg2 + ')';
    var controlBase = c.tone === 'light'
      ? 'linear-gradient(180deg,rgba(255,255,255,.97),rgba(255,255,255,.80)),' + v.bg3
      : 'linear-gradient(180deg,rgba(255,255,255,.065),rgba(255,255,255,.020)),' + v.bg3;
    var controlHover = c.tone === 'light'
      ? 'linear-gradient(180deg,rgba(255,255,255,.97),rgba(255,255,255,.62)),' + v.bg4
      : 'linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.032)),' + v.bg4;
    var inputBase = c.tone === 'light'
      ? 'linear-gradient(180deg,rgba(255,255,255,.98),rgba(255,255,255,.90)),' + v.bg
      : v.bg;
    var shadow = c.tone === 'light'
      ? '0 20px 42px rgba(31,57,88,.11), inset 0 1px 0 rgba(255,255,255,.78)'
      : '0 22px 46px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.04)';
    var shadowSoft = c.tone === 'light'
      ? '0 12px 28px rgba(31,57,88,.09), inset 0 1px 0 rgba(255,255,255,.72)'
      : '0 12px 28px rgba(0,0,0,.20), inset 0 1px 0 rgba(255,255,255,.035)';
    if(c.id === 'violet'){
      panelBase = 'linear-gradient(180deg,rgba(255,255,255,.085),rgba(255,255,255,.028)),radial-gradient(ellipse at 12% 0%,rgba(155,124,255,.18),transparent 44%),radial-gradient(ellipse at 92% 100%,rgba(115,216,255,.10),transparent 36%),rgba(8,5,28,.72)';
      panelStrong = 'linear-gradient(180deg,rgba(255,255,255,.115),rgba(255,255,255,.040)),radial-gradient(ellipse at 10% 0%,rgba(155,124,255,.24),transparent 46%),radial-gradient(ellipse at 90% 100%,rgba(115,216,255,.14),transparent 38%),rgba(13,8,42,.82)';
      controlBase = 'linear-gradient(180deg,rgba(255,255,255,.105),rgba(255,255,255,.032)),linear-gradient(100deg,rgba(155,124,255,.18),rgba(115,216,255,.08)),rgba(11,8,35,.76)';
      controlHover = 'linear-gradient(180deg,rgba(255,255,255,.145),rgba(255,255,255,.048)),linear-gradient(100deg,rgba(155,124,255,.28),rgba(115,216,255,.14)),rgba(16,10,50,.88)';
      inputBase = 'linear-gradient(180deg,rgba(255,255,255,.060),rgba(255,255,255,.018)),rgba(5,3,20,.78)';
      shadow = '0 26px 58px rgba(2,0,16,.44),0 0 34px rgba(155,124,255,.10),inset 0 1px 0 rgba(255,255,255,.08)';
      shadowSoft = '0 16px 34px rgba(2,0,16,.34),0 0 22px rgba(115,216,255,.07),inset 0 1px 0 rgba(255,255,255,.06)';
    }
    if(c.id === 'green'){
      panelBase = 'radial-gradient(ellipse at 12% 0%,rgba(57,182,107,.13),transparent 42%),radial-gradient(ellipse at 92% 100%,rgba(213,183,93,.08),transparent 36%),linear-gradient(180deg,rgba(255,255,255,.050),rgba(255,255,255,.016)),linear-gradient(180deg,#12351d,#07180d)';
      panelStrong = 'radial-gradient(ellipse at 10% 0%,rgba(57,182,107,.18),transparent 44%),radial-gradient(ellipse at 86% 100%,rgba(213,183,93,.11),transparent 38%),linear-gradient(180deg,rgba(255,255,255,.070),rgba(255,255,255,.022)),linear-gradient(180deg,#1a4728,#0b2212)';
      controlBase = 'linear-gradient(180deg,rgba(255,255,255,.070),rgba(255,255,255,.024)),linear-gradient(90deg,rgba(57,182,107,.16),rgba(213,183,93,.07)),rgba(8,32,16,.82)';
      controlHover = 'linear-gradient(180deg,rgba(255,255,255,.105),rgba(255,255,255,.034)),linear-gradient(90deg,rgba(57,182,107,.24),rgba(213,183,93,.12)),rgba(11,45,22,.90)';
      inputBase = 'linear-gradient(180deg,rgba(255,255,255,.040),rgba(255,255,255,.014)),rgba(3,17,8,.82)';
      shadow = '0 24px 50px rgba(0,18,6,.34), inset 0 1px 0 rgba(198,255,210,.045)';
      shadowSoft = '0 14px 30px rgba(0,18,6,.24), inset 0 1px 0 rgba(198,255,210,.035)';
    }
    var finalSoft = textSoft;
    var finalStrong = v.text;
    var finalPress = c.tone === 'light'
      ? controlBase
      : 'linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.018)),linear-gradient(90deg,rgba(' + v.accentRgb + ',.12),rgba(' + v.accentRgb + ',.05))';
    var finalPressStrong = c.tone === 'light'
      ? controlHover
      : 'linear-gradient(180deg,rgba(255,255,255,.085),rgba(255,255,255,.03)),linear-gradient(90deg,rgba(' + v.accentRgb + ',.18),rgba(' + v.accentRgb + ',.08))';
    tokens['--tm-bg'] = v.bg;
    tokens['--tm-bg2'] = v.bg2;
    tokens['--tm-bg3'] = v.bg3;
    tokens['--tm-bg4'] = v.bg4;
    tokens['--tm-text'] = v.text;
    tokens['--tm-dim'] = v.dim;
    tokens['--tm-faint'] = textMuted;
    tokens['--tm-accent'] = v.accent;
    tokens['--tm-accent-dim'] = v.accentDim;
    tokens['--tm-accent-bright'] = v.accentBright;
    tokens['--tm-accent-rgb'] = v.accentRgb;
    tokens['--tm-accent-2-rgb'] = v.accent2Rgb;
    tokens['--tm-page-bg'] = v.pageBg;
    tokens['--tm-text-soft'] = textSoft;
    tokens['--tm-text-muted'] = textMuted;
    tokens['--tm-border'] = 'rgba(' + v.accentRgb + ',.18)';
    tokens['--tm-border-strong'] = 'rgba(' + v.accent2Rgb + ',.25)';
    tokens['--tm-card-bg'] = panelBase;
    tokens['--tm-card-bg-strong'] = panelStrong;
    tokens['--tm-control-bg'] = controlBase;
    tokens['--tm-control-bg-hover'] = controlHover;
    tokens['--tm-input-bg'] = inputBase;
    tokens['--tm-shadow'] = shadow;
    tokens['--tm-shadow-soft'] = shadowSoft;

    tokens['--bg'] = v.bg;
    tokens['--bg2'] = v.bg2;
    tokens['--bg3'] = v.bg3;
    tokens['--bg4'] = v.bg4;
    tokens['--border'] = 'rgba(' + v.accentRgb + ',.15)';
    tokens['--border2'] = 'rgba(' + v.accentRgb + ',.25)';
    tokens['--glacier'] = v.accent;
    tokens['--glacier-dim'] = dimAccent;
    tokens['--glacier-bright'] = v.accentBright;
    tokens['--glacier-dimcss'] = dimAccent;
    tokens['--glow'] = 'rgba(' + v.accentRgb + ',.08)';
    tokens['--glow2'] = 'rgba(' + v.accentRgb + ',.05)';
    tokens['--text'] = v.text;
    tokens['--text-soft'] = textSoft;
    tokens['--dim'] = v.dim;
    tokens['--faint'] = textMuted;
    tokens['--gold'] = v.accentBright;
    tokens['--purple'] = v.accentDim;
    tokens['--theme-accent'] = v.accent;
    tokens['--theme-accent-rgb'] = v.accentRgb;
    tokens['--accent-rgb'] = v.accentRgb;
    tokens['--theme-contrast'] = v.text;
    tokens['--theme-contrast-soft'] = textSoft;
    tokens['--theme-panel'] = 'rgba(' + v.accentRgb + ',.08)';
    tokens['--theme-panel-strong'] = 'rgba(' + v.accentRgb + ',.16)';
    tokens['--theme-ring'] = 'rgba(' + v.accentRgb + ',.35)';
    tokens['--theme-glow-strong'] = 'rgba(' + v.accentRgb + ',.18)';
    tokens['--theme-tint'] = 'rgba(' + v.accentRgb + ',.04)';
    tokens['--theme-ui-soft'] = 'rgba(' + v.accentRgb + ',.16)';
    tokens['--theme-ui-strong'] = 'rgba(' + v.accentRgb + ',.24)';
    tokens['--theme-ui-fg'] = v.text;
    tokens['--theme-ui-fg-soft'] = textSoft;
    tokens['--theme-ui-panel'] = panelBase;
    tokens['--theme-ui-panel-strong'] = panelStrong;
    tokens['--theme-ui-press'] = 'linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02)),linear-gradient(90deg,rgba(' + v.accentRgb + ',.09),rgba(' + v.accentRgb + ',.045))';
    tokens['--theme-ui-press-active'] = 'linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.03)),linear-gradient(90deg,rgba(' + v.accentRgb + ',.15),rgba(' + v.accentRgb + ',.08))';
    tokens['--theme-final-border-soft'] = 'rgba(' + v.accentRgb + ',.18)';
    tokens['--theme-final-border-strong'] = 'rgba(' + v.accentRgb + ',.34)';
    tokens['--theme-final-panel'] = panelBase;
    tokens['--theme-final-panel-soft'] = panelStrong;
    tokens['--theme-final-press'] = finalPress;
    tokens['--theme-final-press-strong'] = finalPressStrong;
    tokens['--theme-final-table-even'] = 'rgba(' + v.accentRgb + ',.05)';
    tokens['--theme-final-table-hover'] = 'rgba(' + v.accentRgb + ',.09)';
    tokens['--theme-final-soft'] = finalSoft;
    tokens['--theme-final-strong'] = finalStrong;
    tokens['--theme-final-shadow'] = shadowSoft;
    tokens['--np-ui-text'] = v.text;
    tokens['--np-ui-text-soft'] = textSoft;
    tokens['--np-ui-muted'] = textMuted;
    tokens['--np-ui-border-soft'] = 'rgba(' + v.accentRgb + ',.18)';
    tokens['--np-ui-border-strong'] = 'rgba(' + v.accentRgb + ',.30)';
    tokens['--np-ui-panel-surface'] = panelBase;
    tokens['--np-ui-panel-surface-strong'] = panelStrong;
    tokens['--np-ui-button-bg'] = controlBase;
    tokens['--np-ui-button-hover'] = controlHover;
    tokens['--np-ui-input-bg'] = inputBase;
    tokens['--np-ui-header-bg'] = panelStrong;
    tokens['--np-ui-dropdown-bg'] = panelStrong;
    tokens['--np-ui-chip-bg'] = 'linear-gradient(90deg,rgba(' + v.accentRgb + ',.13),rgba(' + v.accentRgb + ',.08))';
    tokens['--np-ui-shadow'] = shadowSoft;
    tokens['--np-ui-header-shadow'] = shadowSoft;
    tokens['--accent-solid-fg'] = c.tone === 'light' ? '#071019' : '#f8fcff';
    tokens['--accent-solid-shadow'] = c.tone === 'light' ? 'rgba(255,255,255,.45)' : 'rgba(0,0,0,.35)';


    // Semantic controls stay readable independently of the decorative palette.
    var isLight=c.tone==='light';
    var primaryText=foreground(v.accent);
    tokens['--accent']=linkAccent;
    tokens['--accent-dim']=v.accentDim;
    tokens['--accent-bright']=v.accentBright;
    tokens['--tm-primary-bg']=v.accent;
    tokens['--tm-primary-text']=primaryText;
    tokens['--accent-solid-fg']=primaryText;
    tokens['--theme-contrast']=primaryText;
    tokens['--theme-contrast-soft']=primaryText;
    tokens['--tm-link']=linkAccent;
    tokens['--tm-focus']=linkAccent;
    tokens['--tm-overlay']=isLight?'rgba(9,21,25,.38)':'rgba(0,0,0,.68)';
    tokens['--tm-selection-bg']=v.accent;
    tokens['--tm-selection-text']=primaryText;
    var statuses=isLight ? {danger:'#a5263a',success:'#216238',warning:'#775100',info:'#215e89'} : {danger:'#ff9aae',success:'#9ce3b0',warning:'#f5d486',info:'#9dcff5'};
    Object.keys(statuses).forEach(function(kind){
      var color=c.paletteStatus==='builtin' ? readable(statuses[kind],v.bg2) : readableOn(statuses[kind],surfaces);
      tokens['--status-'+kind]=color;
      tokens['--status-'+kind+'-on']=foreground(color);
      tokens['--status-'+kind+'-bg']='rgba('+rgb(color).join(',')+',.12)';
      tokens['--status-'+kind+'-border']='rgba('+rgb(color).join(',')+',.38)';
    });
    tokens['--red']=tokens['--status-danger'];tokens['--green']=tokens['--status-success'];tokens['--gold']=tokens['--status-warning'];
    tokens['--purple']=c.paletteStatus==='builtin' ? readable(isLight?'#6944a1':'#c6afff',v.bg2) : readableOn(isLight?'#6944a1':'#c6afff',surfaces);
    return tokens;
  }
  return Object.freeze({schemaVersion:1,normalizeId:normalizeId,builtinIds:Object.freeze(ORDER.slice()),baseIds:Object.freeze(BASE_IDS.slice()),list:list,get:get,validate:validate,contrast:contrast,foreground:foreground,tokens:tokensFor});
});
