/* Linear abilities for the original oaths, plus non-destructive legacy adapters. */
(function(root){
  'use strict';
  function clone(value){return JSON.parse(JSON.stringify(value));}
  function value(base,perLevel){return {base:base,perLevel:perLevel};}
  function evaluate(part,level){var n=(Number(part.base)||0)+(Number(part.perLevel)||0)*Math.max(1,Number(level)||1);n/=Number(part.divisor)||1;return part.round==='ceil'?Math.ceil(n):part.round==='floor'?Math.floor(n):n;}
  function formula(part){var b=Number(part.base)||0,k=Number(part.perLevel)||0,s=k?(k===1?'N':k+' × N'):'';if(b)s=(s?b+' + '+s:String(b));if(!s)s='0';if(part.divisor&&part.divisor!==1)s='('+s+') / '+part.divisor;return part.round==='ceil'?'arrondi supérieur de ('+s+')':'('+s+')';}
  function textParts(parts,level){return (parts||[]).map(function(p){return typeof p==='string'?p:evaluate(p,level);}).join('');}
  function formulaParts(parts){return (parts||[]).map(function(p){return typeof p==='string'?p:formula(p);}).join('');}
  function parts(template,values){var result=[],last=0;String(template).replace(/\{(\w+)\}/g,function(_,key,offset){result.push(template.slice(last,offset));if(!values[key])throw new Error('Unknown oath value: '+key);result.push(values[key]);last=offset+key.length+2;});result.push(template.slice(last));return result;}
  function operation(id,label,em,rule,combat,actions){return {id:id,label:label,cost:{actions:actions==null?1:actions,ep:0,em:em},template:rule,combat:combat||{}};}
  var specifications={
    'Duelliste':[
      {values:{distance:value(2,3),melee:value(6,3)},ops:[operation('dash','Élan à distance',6,'Rejoint une cible à distance et frappe pour {distance} dégâts. Défense normale.',{value:'$distance',targetType:'enemy'}),operation('push','Repousser au contact',6,'Au corps à corps : {melee} dégâts et repousse la cible. Se rapprocher demande ensuite une action de déplacement à chaque combattant.',{value:'$melee',targetType:'enemy',repulse:true})]},
      {values:{damage:value(3,2)},ops:[operation('double','Taille double',5,'Deux frappes de {damage} dégâts chacune. Chaque frappe exige une défense séparée.',{value:'$damage',hits:2,targetType:'enemy'})]}
    ],
    'Sauvageon':[
      {values:{damage:value(4,3)},ops:[operation('spiral','Spirale brisante',5,'{damage} dégâts contondants à toutes les entités au contact, alliées comme ennemies.',{value:'$damage',aoe:true,aoeIncludesAllies:true,targetType:'none'})]},
      {values:{damage:value(12,4)},ops:[operation('throw','Lancer bestial',8,'{damage} dégâts à distance. Le porteur perd son arme : la réinvoquer coûte 1 action et 1 EM, ou la récupérer coûte 2 actions.',{value:'$damage',targetType:'enemy',disarm:true})]}
    ],
    'Croisé':[
      {values:{damage:value(3,2),vitality:value(1,1)},ops:[operation('bash','Bash cinglant',6,'Frappe au contact pour {damage} dégâts. Chaque touche ajoute {vitality} PV maximum jusqu’à la fin du combat.',{value:'$damage',selfPvMaxBonus:'$vitality',targetType:'enemy'})]},
      {values:{vitality:value(1,2)},ops:[operation('call','Appel du bouclier',6,'Provoque les ennemis à portée et ajoute {vitality} PV maximum par ennemi provoqué. Une cible intelligente est provoquée un tour ; une cible agressive le reste jusqu’à désactivation. Désactivation sans action.',{kind:'buff',targetType:'none',provoke:true,perEnemyPvMax:'$vitality'})]}
    ],
    'Rôdeur':[
      {values:{damage:value(-1,2)},ops:[operation('flurry','Rafale de lames',6,'Trois frappes de {damage} dégâts sur la même cible. Chaque frappe exige une défense séparée.',{value:'$damage',hits:3,targetType:'enemy'})]},
      {values:{damage:value(1,3)},ops:[operation('throw','Lancer lié',5,'{damage} dégâts sur une cible hors du contact. La dague revient automatiquement, sans coût.',{value:'$damage',targetType:'enemy'})]}
    ],
    'Traqueur':[
      {values:{damage:value(0,3),drain:value(4,2)},ops:[operation('drain','Lance drainante',5,'Frappe pour {damage} dégâts et retire {drain} EP à la cible.',{value:'$damage',epDrain:'$drain',targetType:'enemy'})]},
      {values:{distance:value(0,3),melee:value(6,3)},ops:[operation('reach','Frappe à portée de lance',5,'Frappe à distance pour {distance} dégâts, sans déplacer le porteur.',{value:'$distance',targetType:'enemy'}),operation('push','Repousser au contact',5,'Au contact : {melee} dégâts et repousse la cible. Se rapprocher demande une action de déplacement.',{value:'$melee',repulse:true,targetType:'enemy'})]}
    ],
    'Flécheur':[
      {values:{damage:value(5,2)},ops:[operation('volley','Salve aveugle',6,'{damage} dégâts à toutes les entités dans la zone visée à distance, alliées comme ennemies.',{value:'$damage',aoe:true,aoeIncludesAllies:true,targetType:'none'})]},
      {values:{quick:value(3,3),aimed:value(10,3),full:value(16,3)},ops:[operation('judge1','Jugement · 1 action',8,'Consacre 1 action à un tir de {quick} dégâts. Interdit en surcadençage.',{value:'$quick',targetType:'enemy',actsSacr:0,noOverclock:true}),operation('judge2','Jugement · 2 actions',8,'Consacre 2 actions à un tir de {aimed} dégâts. Interdit en surcadençage.',{value:'$aimed',targetType:'enemy',actsSacr:1,noOverclock:true},2),operation('judge3','Jugement · 3 actions',8,'Consacre 3 actions à un tir de {full} dégâts. Interdit en surcadençage.',{value:'$full',targetType:'enemy',actsSacr:2,noOverclock:true},3)]}
    ],
    'Elementaliste':[
      {values:{fire:value(6,2),ice:value(3,2),combo:value(3,3),armor:value(4,3)},ops:[operation('fire','Poing ardent',6,'{fire} dégâts et brûlure. L’alternance après deux coups du même élément déclenche la combinaison : {combo} dégâts de brûlure ou {armor} de brise-armure sur le prochain coup reçu.',{value:'$fire',targetType:'enemy',elementKey:'fire',statusToTarget:'brulure',comboDamage:'$combo',briseArmure:'$armor'}),operation('ice','Poing polaire',4,'{ice} dégâts et gel. Partage le compteur d’alternance avec le feu ; répéter un troisième coup sans alterner réduit ses dégâts de 25 %, puis de 25 % supplémentaires par répétition.',{value:'$ice',targetType:'enemy',elementKey:'ice',statusToTarget:'gel',comboDamage:'$combo',briseArmure:'$armor'})]},
      {values:{thunder:value(4,2),water:value(2,2),gain:value(4,3),drain:value(3,1)},ops:[operation('thunder','Poing foudre',4,'{thunder} dégâts. Après deux coups du même élément, l’alternance déclenche la combinaison : récupère {gain} EP ou retire {drain} EP à la cible.',{value:'$thunder',targetType:'enemy',elementKey:'thunder',comboSelfEpGain:'$gain',comboEpDrain:'$drain'}),operation('water','Poing aquatique',6,'{water} dégâts contondants. Partage le compteur d’alternance avec la foudre ; répéter un troisième coup sans alterner réduit ses dégâts de 25 %, puis de 25 % supplémentaires par répétition.',{value:'$water',targetType:'enemy',elementKey:'water',comboSelfEpGain:'$gain',comboEpDrain:'$drain'})]}
    ],
    'Evocateur':[
      {values:{health:value(2,4),damage:value(4,1)},ops:[operation('turtle','Invoquer la Tortue bipède',10,'Invoque une tortue de {health} PV. Frappe au contact pour {damage} dégâts, s’interpose automatiquement. Deux actions par tour, chacune coûte 6 EM au porteur. Une invocation par combat, sans réinvocation après sa perte.',{kind:'summon',targetType:'none',summon:{name:'Tortue Bipède',pv:'$health',dmg:'$damage',actCost:6,autoInterpose:true,rangeType:'cac'}})]},
      {values:{health:value(0,3),damage:value(5,1)},ops:[operation('crab','Invoquer le Crabe canon',10,'Invoque un crabe de {health} PV. Tire à distance pour {damage} dégâts ; aucun coup au contact. Deux actions par tour, chacune coûte 6 EM au porteur. Une invocation par combat, sans réinvocation après sa perte.',{kind:'summon',targetType:'none',summon:{name:'Crabe Canon',pv:'$health',dmg:'$damage',actCost:6,autoInterpose:false,rangeType:'distance'}})]}
    ],
    'Conjurateur':[
      {values:{damage:value(2,2),heal:value(2,1)},ops:[operation('strike','Frappe déchaînée',5,'Frappe pour {damage} dégâts et soigne un allié de {heal} PV dans la même action.',{action:'frappe_dechainees',value:'$damage',healAmt:'$heal',targetType:'enemy',healTargetType:'ally'})]},
      {values:{quick:value(6,3),held:value(12,4),full:value(20,5)},ops:[operation('heal1','Soin enchaîné · 1 action',12,'Consacre 1 action pour soigner {quick} PV à un allié. Interdit en surcadençage.',{action:'soin',kind:'heal',healAmt:'$quick',targetType:'ally',actsSacr:0,noOverclock:true}),operation('heal2','Soin enchaîné · 2 actions',12,'Consacre 2 actions pour soigner {held} PV à un allié. Interdit en surcadençage.',{action:'soin',kind:'heal',healAmt:'$held',targetType:'ally',actsSacr:1,noOverclock:true},2),operation('heal3','Soin enchaîné · 3 actions',12,'Consacre 3 actions pour soigner {full} PV à un allié. Interdit en surcadençage.',{action:'soin',kind:'heal',healAmt:'$full',targetType:'ally',actsSacr:2,noOverclock:true},3)]}
    ],
    // Hidden historical evolutions remain usable by existing owners. Main damage
    // gains 2 per level: a rounded slope between the old N10 and N20 values.
    // Fixed costs, defense taxes and duel percentages never grow with level.
    'Bretteur':[
      {minLevel:10,values:{damage:value(-2,2)},legacySlopes:{damage:1},ops:[operation('feint','Feinte de Fer',6,'Frappe pour {damage} dégâts. Une défense coûte 2 EP supplémentaires ; sans défense, la frappe inflige 4 dégâts supplémentaires.',{value:'$damage',targetType:'enemy',defenseExtraEp:2,undefendedBonus:4})]},
      {minLevel:10,values:{damage:value(-5,2)},legacySlopes:{damage:1},ops:[operation('riposte','Pas Rompu · réaction',5,'Active la riposte pour ce tour, sans action. Après une esquive contre une attaque ciblée, dépense 5 EM pour riposter à {damage} dégâts. La riposte est défendable. Une fois par tour ; aucune EM dépensée si elle ne se déclenche pas.',{kind:'reaction',targetType:'none',riposte:{damage:'$damage',emCost:5}},0)]}
    ],
    'Claymore':[
      {minLevel:10,values:{damage:value(10,2)},legacySlopes:{damage:1},ops:[operation('posture','Posture Haute',6,'Prépare la prochaine Frappe Haute : 1 action et 10 EP pour {damage} dégâts. Si elle est bloquée, la cible perd 12 EP supplémentaires. La posture expire à la fin du tour suivant.',{kind:'buff',targetType:'none',claymorePosture:{linear:true,damage:'$damage',epCost:10,blockEpDrain:12}})]},
      {minLevel:10,values:{damage:value(0,2)},legacySlopes:{damage:1},ops:[operation('cleave','Fendre la Ligne',7,'Frappe pour {damage} dégâts. Un blocage subit les dégâts complets, plus les dégâts qu’il aurait absorbés. Si la cible a déjà défendu ce tour, sa défense contre cette frappe coûte 3 EP supplémentaires.',{value:'$damage',targetType:'enemy',blockBreakLine:true,defenseAfterFirstEp:3})]}
    ],
    "Lame d'Honneur":[
      {minLevel:10,values:{refund:value(-4,1)},legacySlopes:{refund:0},ops:[operation('duel','Duel Juré',5,'Désigne un seul adversaire jusqu’à sa mort ou la fin du combat. Tous tes dégâts contre lui augmentent de 40 % ; contre les autres, ils diminuent de 60 %. Les 5 EM restent non régénérables pendant le duel. À sa mort, récupère jusqu’à {refund} EP réellement dépensés pendant le duel.',{kind:'buff',targetType:'enemy',duel:{targetBonusPct:40,otherPenaltyPct:60,refundCap:'$refund',lockedEm:5}})]},
      {minLevel:10,values:{damage:value(0,2)},legacySlopes:{damage:1},ops:[operation('designate','Désigner l’adversaire',5,'Désigne un adversaire jusqu’à sa mort ou la fin du combat. Les 5 EM restent non régénérables pendant le duel. Cette désignation permet la Sentence ; elle ne modifie pas les autres attaques.',{kind:'buff',targetType:'enemy',duel:{targetBonusPct:0,otherPenaltyPct:0,refundCap:0,lockedEm:5}}),operation('sentence','Sentence du Duel',4,'Sur l’adversaire désigné uniquement : {damage} dégâts, plus 4 dégâts de duel. Chaque Sentence qui touche rend récupérable 1 EP réellement dépensé pendant le duel, rendu à la mort de cet adversaire.',{value:'$damage',targetType:'enemy',duelOnly:true,duelBonus:4,duelRecoverableEp:1})]}
    ],
    'Arcaniste':[
      {values:{damage:value(8,4)},ops:[operation('domain','Domaine étoilé',8,'{damage} dégâts à toutes les entités de la zone, alliées comme ennemies. Indéfendable par esquive, parade ou blocage ; sortir de la zone avant l’explosion permet d’échapper.',{value:'$damage',aoe:true,aoeIncludesAllies:true,targetType:'none',undefendable:true})]},
      {values:{damage:value(14,4)},ops:[operation('ray','Rayon étoilé',10,'{damage} dégâts sur une seule cible. Esquive, parade et blocage fonctionnent normalement.',{value:'$damage',targetType:'enemy'})]}
    ]
  };
  function costText(cost){var a=cost.actions==null?1:cost.actions,parts=[a+' action'+(a>1?'s':'')];['ep','em','pv'].forEach(function(k){if(cost[k])parts.push(cost[k]+' '+k.toUpperCase());});return parts.join(' / ');}
  function nativeAbility(name,branch,index){
    var spec=specifications[name]&&specifications[name][index];if(!spec)return null;
    var first=(branch.paliers||[])[0]||{},minimum=spec.minLevel?Math.min(spec.minLevel,Math.max(1,Number(first.niv)||spec.minLevel)):1,values=clone(spec.values);
    // An explicitly earlier staff grant keeps its old first-tier value at that
    // level; from there the same linear gain applies without negative effects.
    Object.keys(values).forEach(function(key){if(spec.minLevel&&minimum<spec.minLevel)values[key].base+=(spec.minLevel-minimum)*(values[key].perLevel-(spec.legacySlopes&&spec.legacySlopes[key]||0));});
    var ops=spec.ops.map(function(op){var copy=clone(op);copy.ruleParts=parts(copy.template,values);copy.ruleFormula=formulaParts(copy.ruleParts);copy.rule=copy.ruleFormula;delete copy.template;return copy;});
    var desc=ops.map(function(op){return op.ruleFormula;}).join(' '),ability={niv:minimum,nom:first.nom||branch.nom,cout:costText(ops[0].cost),desc:desc,progression:'linear',scaling:values};
    ability.combatRules={native:true,minLevel:minimum,key:index?'B':'A',name:branch.nom,effect:desc,cost:clone(ops[0].cost),operations:ops};return ability;
  }
  function sameOldRules(name,index,branch,original){
    if(!original)return false;var a=branch.paliers||[],b=original.paliers||[];if(a.length!==b.length)return false;
    return a.every(function(p,i){var desc=b[i].desc,actual=p.desc;if(name==='Conjurateur'&&index===1&&actual!==desc){desc=desc.replace(/\b([012]) actions?/g,function(_,n){return (Number(n)+1)+' action';});actual=actual.replace(/\b([123]) actions?/g,'$1 action');}return p.nom===b[i].nom&&p.cout===b[i].cout&&actual===desc;});
  }
  function normalizeBranch(name,branch,index,definition,original){
    if(!branch||definition&&definition.retired)return branch;
    if(branch.ability){
      var ability=branch.ability,alias=(branch.paliers||[]).length===1&&branch.paliers[0];
      if(alias&&alias!==ability){
        var rules=ability.combatRules||alias.combatRules,baseline=rules&&{desc:rules.effect,cout:costText(rules.cost||{})};
        if(baseline){var abilityChanged=ability.desc!==baseline.desc||ability.cout!==baseline.cout,aliasChanged=alias.desc!==baseline.desc||alias.cout!==baseline.cout;if(aliasChanged&&!abilityChanged)ability=Object.assign({},ability,alias);}
      }
      if(branch.progression==='linear'&&branch.paliers&&branch.paliers.length===1&&branch.paliers[0]===ability)return branch;
      return Object.assign({},branch,{ability:ability,paliers:[ability],progression:'linear'});
    }
    var out=Object.assign({},branch),native=sameOldRules(name,index,branch,original)&&nativeAbility(name,branch,index);
    if(native){out.legacyPaliers=branch.legacyPaliers||branch.paliers;out.ability=native;out.minLevel=native.niv;out.scaling=native.scaling;out.paliers=[native];out.progression='linear';return out;}
    if(branch.ability){out.paliers=[branch.ability];out.progression='linear';return out;}
    var old=branch.paliers||[],selected=old[0];
    if(!selected)return out;
    var reference=original&&original.paliers||[];
    var changed=old.find(function(p,i){return reference[i]&&(p.desc!==reference[i].desc||p.cout!==reference[i].cout);});
    selected=changed||selected;
    var ability=Object.assign({},selected,{niv:definition&&definition.evolvesFrom?Math.min(10,Math.max(1,Number(old[0]&&old[0].niv)||10)):1,progression:'linear'});
    // Preserve authored overrides verbatim. Unknown prose is never used to invent coefficients.
    out.legacyPaliers=branch.legacyPaliers||old;out.ability=ability;out.minLevel=ability.niv;out.paliers=[ability];out.progression='linear';
    return out;
  }
  function resolveTree(input,values,level){if(typeof input==='string'&&input[0]==='$')return evaluate(values[input.slice(1)],level);if(Array.isArray(input))return input.map(function(v){return resolveTree(v,values,level);});if(input&&typeof input==='object'){var output={};Object.keys(input).forEach(function(k){output[k]=resolveTree(input[k],values,level);});return output;}return input;}
  function combatOptions(ability,level,actions){
    var rules=ability&&ability.combatRules;if(!rules||!rules.native||ability.desc!==rules.effect||ability.cout!==costText(rules.cost))return null;
    if(Number(level)<(Number(ability.niv)||1))return [];
    var budget=actions==null?1:Math.max(0,Number(actions)||0);
    return rules.operations.filter(function(op){return op.cost.actions<=budget;}).map(function(op){return Object.assign({action:'capacite',kind:'attack',palNom:ability.nom,label:op.label,consumeActions:op.cost.actions,epCost:op.cost.ep||0,emCost:op.cost.em||0,descText:textParts(op.ruleParts,level),linear:true},resolveTree(op.combat,ability.scaling,level));});
  }
  var api={specifications:specifications,evaluate:evaluate,formula:formula,textParts:textParts,formulaParts:formulaParts,costText:costText,nativeAbility:nativeAbility,normalizeBranch:normalizeBranch,combatOptions:combatOptions};
  root.NPSermentsLinear=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
