/* New serments use explicit operations, never the legacy prose-to-damage parser.
 * Scene geometry, material availability and consent remain the referee's facts.
 * Every declared operation is journaled and its resources are reserved exactly once.
 */
(function (w) {
  'use strict';
  var specs = Object.create(null);
  var clone = function (x) { return JSON.parse(JSON.stringify(x)); };
  var C = function (a, ep, em) { return {actions:a, ep:ep||0, em:em||0}; };
  function O(id, label, a, ep, em, more) { return Object.assign({id:id,label:label,cost:C(a,ep,em),requires:'active',next:'active'},more||{}); }
  function add(name,key,main,extras) { specs[name+'|'+key]=Object.assign({duration:2,main:{label:'Activer',next:'active'},extras:[]},main||{}); specs[name+'|'+key].extras=extras||[]; }
  function both(name, config, extras) { add(name,'A',clone(config||{}),clone(extras||[])); add(name,'B',clone(config||{}),clone(extras||[])); }
  var end = function(id,label,a,ep,em) { return O(id,label,a,ep,em,{next:'idle'}); };
  var maintain = function(ep,em) { return O('maintain','Entretenir',1,ep,em,{maintain:true}); };
  var recover = function(ep) { return O('recover','Récupérer à portée',1,ep,0,{requires:null,next:'idle',recoverWeapon:true}); };
  both('Massier',{},[end('release','Relâcher',0,0,0)]);
  specs['Massier|A'].main={label:'Percussion et bascule',damage:[3,5,7,9],target:'enemy',contactControl:true,next:'active'};
  specs['Massier|B'].main={label:'Maintenir sans dégâts',target:'enemy',control:true,next:'active',weaponBusy:true};
  both('Frondeur',{duration:1,main:{label:'Armer et réserver une interception',next:'active',reserve:'projectile'}},[end('unload','Décharger le galet',1,1,0),O('recover','Récupérer un galet intact',1,2,0,{requires:null,material:'galet',recover:1,next:null})]);
  both('Arbalétrier',{duration:0,main:{label:'Recharger',requires:'unloaded',next:null,load:true}},[
    O('shoot','Tirer le carreau chargé',1,4,0,{requires:'loaded',next:null,shot:true,damage:20,target:'enemy',projectile:true}),
    O('unload','Décharger sans tirer',1,2,0,{requires:'loaded',next:null,unload:true}),
    O('recover','Ramasser un carreau intact',1,2,0,{requires:null,next:null,material:'bolt',recover:1}),
    O('butt','Frapper de la crosse',1,6,0,{requires:null,next:null,damage:4,target:'enemy'})]);
  specs['Arbalétrier|B'].extras[0].damage=[12,13,14,15];
  add('Pugiliste','A',{main:{label:'Engager une main',damage:9,target:'enemy',hand:1,next:'active'}},[O('guard','Remettre une main en garde',1,2,0,{requires:null,next:null,hand:-1})]);
  add('Pugiliste','B',{duration:1,main:{label:'Reprendre les deux mains en garde',next:'active',resetHands:true}},[O('strike','Frapper et quitter la garde',1,6,0,{damage:7,target:'enemy',next:'idle'})]);
  both('Moine',{duration:2,main:{label:'Changer de prise',next:'active'}},[O('strike','Frapper dans la prise',1,6,0,{damage:8,target:'enemy'}),end('neutral','Reprendre la prise neutre',1,2,0)]);
  both('Hallebardier',{main:{label:'Crocheter sans dégâts',target:'enemy',control:true,next:'active',weaponBusy:true}},[end('release','Relâcher le crochet',0,0,0)]);
  specs['Hallebardier|B'].main.weaponBusy=false;
  both('Piquier',{duration:1,main:{label:'Installer la réception défensive',next:'active',reserve:'approach'}},[end('release','Abandonner la réception',0,0,0)]);
  both('Javelinier',{duration:3,main:{label:'Fixer sans dégâts',next:'active',weaponAway:true}},[recover(2)]);
  Object.assign(specs['Javelinier|A'],{duration:2}); Object.assign(specs['Javelinier|A'].main,{target:'enemy',control:true});
  add('Voleur','A',{main:{label:'Repérer un objet accessible',next:'active'}},[O('take','Soustraire l’objet repéré',1,4,0,{next:'held'}),O('deposit','Redéposer l’objet',1,1,0,{requires:'held',next:'idle'})]);
  add('Voleur','B',{main:{label:'Examiner le fermoir',next:'active'}},[O('open','Défaire le fermoir',1,3,0,{next:'open'}),O('take','Prendre l’objet dégrafé',1,3,0,{requires:'open',next:'held'}),O('deposit','Redéposer et rattacher',1,2,0,{requires:'held',next:'idle'})]);
  both('Porte-Fléau',{main:{label:'Armer le trajet sans attaque',next:'active',weaponBusy:true}},[O('release','Résoudre au prochain tour',1,6,0,{damage:12,target:'enemy',delay:1,next:'idle'}),end('cancel','Ramener la tête sans frappe',1,2,0)]);
  specs['Porte-Fléau|B'].extras[0].damage=8;
  both('Pyromancien',{duration:1,maxDuration:3,main:{label:'Allumer le foyer matériel',next:'active'}},[maintain(0,2),end('extinguish','Éteindre',1,0,1)]);
  specs['Pyromancien|B'].extras.push(O('advance','Avancer le foyer et entretenir',1,0,2,{maintain:true}));
  both('Cryomancien',{duration:2,main:{label:'Former la glace sur la surface',next:'active'}},[end('melt','Dégeler',1,0,1)]);
  both('Aéromancien',{duration:1,maxDuration:3,main:{label:'Créer le courant orienté',next:'active'}},[maintain(0,2),O('reverse','Inverser le sens',1,0,2),end('end','Dissiper',0,0,0)]);
  both('Géomancien',{duration:3,main:{label:'Transférer et modeler la terre',next:'active'}},[O('reverse','Remanier ou inverser',1,0,3),end('level','Remettre à niveau',1,0,3)]);
  both('Enchanteur',{duration:3,main:{label:'Déposer une charge',next:'active',charges:1}},[end('remove','Retirer la charge',1,0,1),O('give','Transmettre l’objet',1,1,0)]);
  both('Prêtre',{duration:[3,4,5,6],main:{label:'Consacrer un volontaire',next:'active',charges:1}},[end('remove','Retirer la consécration',1,0,1)]);
  both('Druide',{duration:3,main:{label:'Planter et développer',next:'active',growth:1}},[O('grow','Ajouter une longueur',1,0,3,{growth:1}),maintain(0,2),end('remove','Enlever à la racine',1,2,0)]);
  specs['Druide|B'].extras.push(O('harvest','Récolter la fibre et détruire le pied',1,2,0,{next:'harvested'}),O('tie','Nouer ou dénouer une extrémité',1,2,0,{requires:'harvested',next:null}));
  both('Barde',{duration:3,main:{label:'Annoncer deux jalons ordonnés',next:'active',milestones:2}},[O('close','Clore les deux jalons accomplis',1,0,2,{delay:1,requiresMilestones:2,next:'idle'})]);
  both('Illusionniste',{duration:3,main:{label:'Créer une image sans dégâts',next:'active'}},[O('modify','Modifier ou repositionner l’image',1,0,2),end('end','Dissiper',0,0,0)]);
  both('Alchimiste',{duration:3,main:{label:'Prélever et analyser',next:'active'}},[O('prepare','Préparer une dose matérielle',1,0,3,{next:'prepared'}),O('apply','Appliquer et consommer la dose',1,2,0,{requires:'prepared',next:'idle'})]);
  both('Porte-Enclume',{duration:2,main:{label:'Poser le contrepoids',next:'active',weaponBusy:true}},[maintain(2,0),end('remove','Décrocher et récupérer',1,2,0)]);
  specs['Porte-Enclume|B'].extras=[O('move','Manœuvrer au sol',1,10,0),end('remove','Démonter et récupérer',1,2,0)];
  both('Ébranleur',{main:{label:'Amorcer un support sans dégâts',next:'active'}},[O('release','Libérer la secousse',1,4,2,{delay:1,next:'idle'}),end('end','Éteindre sans effet',1,0,0)]);
  add('Ricocheteur','A',{main:{label:'Tirer par un rebond',damage:5,target:'enemy',material:'galet',consume:1,next:null,projectile:true}},[O('recover','Ramasser un galet intact',1,2,0,{requires:null,next:null,material:'galet',recover:1})]);
  add('Ricocheteur','B',{duration:1,main:{label:'Préparer et réserver le rebond',next:'active',reserve:'projectile',reactionEp:8}},[end('end','Annuler sans rendre la réserve',1,0,0),O('recover','Ramasser un galet intact',1,2,0,{requires:null,next:null,material:'galet',recover:1})]);
  both('Sondeur',{duration:3,main:{label:'Poser la sonde sans dégâts',next:'active',weaponAway:true}},[O('read','Relever l’état présent',1,0,1),recover(2)]);
  both('Guetteur',{duration:0,main:{label:'Observer la préparation visible',next:null}},[]);
  both('Pavoisier',{duration:2,main:{label:'Fermer le pavois et fixer le front',next:'active',weaponBusy:true}},[maintain(2,0),O('orient','Réorienter',1,2,0),end('open','Ouvrir le pavois',1,2,0)]);
  specs['Pavoisier|B'].extras.push(O('move','Marcher à couvert, 3 m maximum',1,10,0));
  both('Lutteur',{main:{label:'Établir la prise sans dégâts',target:'enemy',control:true,next:'active',weaponBusy:true}},[end('release','Relâcher la prise',1,0,0)]);
  both('Cestuaire',{duration:1,main:{label:'Armer une chambre vide',next:'active',reserve:'impact'}},[end('end','Dissiper la chambre',1,0,0)]);
  specs['Cestuaire|A'].extras.push(O('release','Frapper avec la charge réellement reçue',1,6,0,{requires:'charged',damage:10,addCharge:true,target:'enemy',next:'idle'}));
  both('Ascète',{duration:1,main:{label:'Poser le sceau défensif et réserver',next:'active',reserve:'preparation'}},[end('end','Dissiper le sceau',1,0,0)]);
  specs['Ascète|A'].main={label:'Toucher et interrompre la préparation',target:'enemy',control:true,next:null};
  add('Voltigeur','A',{main:{label:'Planter la perche',next:'active',weaponBusy:true}},[O('climb','Se hisser et réceptionner',1,10,0,{next:'idle'}),end('remove','Retirer sans ascension',1,2,0)]);
  add('Voltigeur','B',{duration:2,main:{label:'Accrocher la perche',next:'active',weaponBusy:true}},[O('hang','Se suspendre',1,10,0,{next:'hanging'}),O('maintain','Maintenir la suspension',1,4,0,{requires:'hanging',maintain:true,next:null}),O('down','Redescendre et reprendre',1,2,0,{requires:'hanging',next:'idle'})]);
  add('Faucheur','A',{main:{label:'Accrocher le lien',next:'active',weaponBusy:true}},[O('cut','Sectionner et retenir la charge',1,4,0,{next:'held'}),O('deposit','Déposer la charge',1,2,0,{requires:'held',next:'idle'}),end('release','Relâcher sans section',1,0,0)]);
  add('Faucheur','B',{main:{label:'Accrocher le lien',next:'active',weaponBusy:true}},[O('cut','Sectionner au prochain tour',1,6,0,{delay:1,next:'idle'}),end('remove','Retirer sans section',1,2,0)]);
  both('Rabatteur',{duration:2,main:{label:'Disposer deux issues et un front',next:'active',weaponBusy:true}},[O('orient','Réorienter',1,4,0),maintain(2,0),end('remove','Retirer',1,0,0)]);
  specs['Rabatteur|B'].duration=1; specs['Rabatteur|B'].extras.splice(1,1);
  both('Verrouilleur',{duration:3,main:{label:'Installer et fermer la traverse',next:'active',weaponAway:true,devicePV:20}},[O('toggle','Ouvrir ou fermer le verrou',1,2,0),end('remove','Démonter et reprendre',1,4,0)]);
  specs['Verrouilleur|B'].main.devicePV=16; specs['Verrouilleur|B'].extras[1].cost.ep=2; specs['Verrouilleur|B'].extras.push(maintain(2,0));
  both('Empaleur',{duration:3,main:{label:'Poser un segment sans dégâts',next:'active',material:'segment',consume:1}},[O('extract','Extraire le segment accessible',1,2,0,{next:'idle'}),O('recover','Ramasser un segment au sol',1,2,0,{requires:null,next:null,material:'looseSegment',recover:1}),O('mount','Remonter un segment récupéré',1,2,0,{requires:null,next:null,mount:true})]);
  Object.assign(specs['Empaleur|A'].main,{label:'Frapper et détacher un segment',damage:12,target:'enemy'}); specs['Empaleur|A'].duration=2;
  both('Harponneur',{duration:3,main:{label:'Accrocher sans dégâts',next:'active',weaponAway:true}},[O('slack','Régler le mou',1,2,0),O('haul','Se haler de 3 m maximum',1,10,0),end('detach','Détacher',1,2,0),recover(2)]);
  specs['Harponneur|B'].duration=2; specs['Harponneur|B'].extras=[O('tension','Tendre une fois sans dégâts',1,6,1,{target:'enemy',control:true,next:'idle'}),end('cut','Donner du mou ou couper',1,2,0),recover(2)];
  both('Relieur',{duration:3,main:{label:'Installer une ancre sans frappe',next:'active',weaponAway:true}},[O('swap','Permuter sur le chemin vérifié',1,6,4,{next:'idle'}),recover(2)]);
  specs['Relieur|B'].duration=2; specs['Relieur|B'].extras[0].cost=C(1,8,5);
  both('Faussaire',{duration:10,main:{label:'Façonner le substitut matériel',next:'active',material:'paste',consume:200}},[O('swap','Échanger les objets accessibles',1,2,0,{next:'held'}),O('deposit','Déposer l’objet',1,0,0,{requires:'held',next:'idle'})]);
  specs['Faussaire|A'].main.outOfCombat=true; specs['Faussaire|B'].duration=3;
  both('Escamoteur',{duration:10,main:{label:'Aménager l’étui réel',next:'active'}},[O('deposit','Déposer un objet déjà acquis',1,2,0,{next:'held'}),O('take','Retirer le contenu',1,2,0,{requires:'held',next:'active'}),end('remove','Démonter l’étui vide',1,2,0)]);
  specs['Escamoteur|B'].duration=5; specs['Escamoteur|B'].extras.push(O('handoff','Poser l’étui pour la remise',1,2,0,{requires:'held',next:'offered'}));
  both('Entraveur',{main:{label:'Relier deux équipements sans dégâts',target:'enemy',control:true,next:'active',material:'chain',consume:1}},[end('open','Libérer au contact',1,2,0),O('recover','Reprendre la chaîne libre',1,2,0,{requires:null,next:null,material:'looseChain',recover:1}),O('mount','Remonter la chaîne',1,2,0,{requires:null,next:null,mountChain:true})]);
  both('Pendulier',{duration:3,main:{label:'Monter le pivot sans frappe',next:'active',weaponBusy:true}},[O('attack','Attaque orbitale unique',1,6,1,{damage:12,target:'enemy'}),maintain(2,0),end('remove','Démonter et reprendre',1,2,0)]);
  specs['Pendulier|B'].duration=2; specs['Pendulier|B'].extras[1]=O('slide','Faire coulisser le pivot',1,4,0);
  both('Forgeron de Braise',{duration:3,main:{label:'Chauffer la pièce matérielle',next:'active'}},[O('shape','Façonner ou fermer au marteau',1,4,0,{next:'shaped'}),O('cool','Refroidir et fixer la forme',1,0,2,{requires:'shaped',next:'idle'})]);
  both('Semeur de Cendres',{duration:3,main:{label:'Allumer le combustible',next:'active'}},[O('collect','Étouffer et recueillir',1,0,1,{next:'collected',renew:6}),O('deposit','Déposer les cendres',1,0,0,{requires:'collected',next:'deposited'}),O('read','Lire les traces',1,0,0,{requires:'deposited',next:null}),O('sample','Prélever la preuve',1,0,0,{requires:'deposited',next:'idle'})]);
  specs['Semeur de Cendres|B'].extras=[O('collect','Éteindre et partager la réserve',1,0,1,{next:'collected',renew:6,charges:[3,4,5,6]}),O('measure','Lancer une portion et observer',1,0,0,{requires:'collected',next:null,spendCharge:true})];
  both('Sculpteur de Givre',{duration:2,maxDuration:4,main:{label:'Poser un étai matériel',next:'active',devicePV:20}},[maintain(0,2),end('release','Libérer l’étai',1,0,0)]);
  specs['Sculpteur de Givre|B'].main.devicePV=12; specs['Sculpteur de Givre|B'].extras.push(O('second','Poser le second appui',1,0,2,{once:true}),O('share','Réallouer ou dégeler un appui',1,0,2));
  both('Patineur',{duration:3,main:{label:'Tracer la piste et les îlots',next:'active'}},[O('slide','Glisser sur la piste',1,10,0),O('repair','Réparer un îlot au contact',1,0,2),end('end','Dégeler',1,0,0)]);
  specs['Patineur|B'].extras[1]=O('extend','Sacrifier l’îlot et prolonger une fois',1,0,3,{once:true});
  both('Danseur des Vents',{duration:1,maxDuration:3,main:{label:'Créer le courant et son pivot',next:'active'}},[O('share','Ajuster le débit partagé',1,0,2),maintain(0,2),end('end','Fermer les deux sorties',1,0,0)]);
  specs['Danseur des Vents|B'].extras.push(O('reverse','Inverser le sens commun',1,0,2));
  both('Siffleur',{duration:3,main:{label:'Tracer le conduit réel',next:'active'}},[O('use','Transmettre une phrase de 20 mots',1,0,0),O('orient','Changer la sortie',1,0,2),end('end','Fermer',1,0,0)]);
  specs['Siffleur|B'].extras[0].label='Écouter un relevé'; specs['Siffleur|B'].extras[1].label='Changer l’entrée';
  both('Fossoyeur',{duration:2,main:{label:'Excaver une section de 1 m',next:'active',sections:1}},[O('excavate','Excaver une autre section',1,4,4,{sections:1}),O('brace','Étayer avec 10 kg de bois réel',1,4,0),O('fill','Reboucher une section libre',1,4,2,{sections:-1}),O('crawl','Ramper, 3 m maximum',1,10,0)]);
  specs['Fossoyeur|B'].extras[1]=O('maintain','Stabiliser une fois',1,0,2,{maintain:true,once:true}); specs['Fossoyeur|B'].maxDuration=3;
  both('Fendeur',{duration:3,main:{label:'Amorcer une section',next:'active',sections:1}},[O('extend','Ajouter une section',1,2,2,{sections:1}),O('open','Ouvrir le préfixe préparé',1,4,2,{next:'idle'}),end('end','Abandonner',1,0,0)]);
  specs['Fendeur|B'].duration=4; specs['Fendeur|B'].extras=[O('extend','Tracer un autre côté',1,2,2,{sections:1,maxSections:3}),O('open','Ouvrir les trois côtés',1,4,2,{minSections:3,next:'opened'}),O('detach','Détacher le dernier côté',1,4,4,{requires:'opened',next:'detached'}),O('remove','Retirer le panneau',1,4,0,{requires:'detached',next:'idle'})];
  both('Tisserand',{duration:3,main:{label:'Relier et charger une seule charge',next:'active',charges:1}},[O('transfer','Transférer la charge existante',1,0,1),end('end','Dénouer et détruire la charge',1,0,0)]);
  specs['Tisserand|B'].extras[0]=O('transfer','Transférer et fixer la charge',1,0,2,{next:'fixed'});
  both('Orfèvre',{duration:3,main:{label:'Sertir un choix exclusif',next:'active',charges:1}},[end('end','Démonter et annuler les deux options',1,0,0)]);
  both('Porte-Lanterne',{duration:3,main:{label:'Consacrer la lanterne',next:'active',charges:1,devicePV:20}},[end('end','Fermer et annuler',1,0,0)]);
  specs['Porte-Lanterne|B'].extras.push(O('assign','Changer le bénéficiaire prioritaire',1,0,1));
  both('Exorciste',{duration:2,main:{label:'Extraire un effet compatible',next:'active',devicePV:20}},[maintain(0,2),O('dispel','Dissiper au tour ultérieur',2,0,4,{delay:1,next:'idle'}),end('restore','Restituer le reliquat de l’effet',1,0,0)]);
  specs['Exorciste|B'].extras=[O('dispel','Achever le rite au prochain tour',1,0,6,{delay:1,next:'idle'}),end('restore','Restituer l’effet',1,0,0)];
  both('Roncier',{duration:0,main:{label:'Planter une racine',next:'active',growth:1}},[O('grow','Développer une longueur',1,0,3,{growth:1}),O('carry','Détacher et arrimer la plante',1,0,2,{next:'carried',renew:3}),O('tie','Changer une extrémité',1,2,0,{requires:'carried',next:null}),O('root','Reprendre racine',1,0,2,{requires:'carried',next:'active'})]);
  specs['Roncier|B'].extras[1].renew=2;
  both('Greffeur',{duration:0,main:{label:'Planter la source',next:'active',growth:1}},[O('grow','Prolonger une branche',1,0,3,{growth:1}),O('bud','Prélever le bourgeon',1,2,0,{next:'bud',renew:3}),O('root','Replanter le bourgeon',1,0,4,{requires:'bud',next:'fork'}),O('trim','Tailler une branche',1,2,0,{requires:'fork',next:null}),O('growFork','Prolonger la fourche',1,0,3,{requires:'fork',next:null,growth:1})]);
  specs['Greffeur|B'].extras[3].cost.em=2; specs['Greffeur|B'].extras[3].label='Tailler et réattribuer';
  both('Carillonneur',{duration:3,main:{label:'Annoncer deux jalons ordonnés',next:'active',milestones:2}},[O('close','Clore le préfixe accompli',1,0,2,{delay:1,requiresMilestones:1,next:'idle'})]);
  both('Chef de Chœur',{duration:3,main:{label:'Annoncer les deux partitions',next:'active',milestones:4}},[O('close','Clore une voix, deux partitions complètes',1,0,2,{delay:1,requiresMilestones:4,next:'idle'})]);
  specs['Chef de Chœur|B'].extras[0].next='secondVoice'; specs['Chef de Chœur|B'].extras[0].renew=2;
  specs['Chef de Chœur|B'].extras.push(O('secondClose','Clore la seconde voix au tour suivant',1,0,2,{requires:'secondVoice',delay:1,next:'idle'}));
  both('Verrier',{duration:3,main:{label:'Poser et orienter le relais',next:'active'}},[O('orient','Réorienter au contact',1,0,1),O('open','Ouvrir le relais',1,0,1),end('recover','Masquer ou récupérer',1,2,0)]);
  specs['Verrier|B'].duration=4; specs['Verrier|B'].extras[1].label='Ouvrir, observer et refermer'; specs['Verrier|B'].extras.push(O('give','Changer d’observateur au contact',1,2,0));
  both('Masquier',{duration:3,main:{label:'Activer après les observations',next:'active',needsObservations:3}},[O('observe','Observer réellement un élément de routine',1,0,0,{requires:null,next:null,observation:1}),O('gesture','Rejouer un geste observé',1,2,0),O('walk','Rejouer un déplacement observé',1,10,0)]);
  specs['Masquier|B'].main.needsObservations=2; specs['Masquier|B'].extras[2]=O('renew','Renouveler une fois le même rôle',1,0,3,{renew:3,once:true});
  both('Distillateur',{duration:3,main:{label:'Charger et analyser l’échantillon réel',next:'active'}},[O('separate','Séparer ou chauffer',1,0,2,{next:'separated'}),O('collect','Refroidir et collecter',1,0,0,{requires:'separated',next:'idle'}),end('end','Arrêter le cycle',1,0,0)]);
  specs['Distillateur|B'].duration=4; specs['Distillateur|B'].extras[1].next='collected'; specs['Distillateur|B'].extras.push(O('second','Recueillir une seconde fraction',1,0,0,{requires:'collected',next:'twoFractions'}),O('mix','Recombiner ou jeter les fractions',1,0,0,{requires:'twoFractions',next:'idle'}));
  both('Essayeur',{duration:3,main:{label:'Prélever et mesurer deux échantillons',next:'active'}},[O('test','Appliquer le même essai aux deux portions',1,0,2,{next:'tested'}),O('read','Lire et sceller',1,0,0,{requires:'tested',next:'idle'})]);
  specs['Essayeur|B'].extras[1].next='read'; specs['Essayeur|B'].extras.push(O('seal','Sceller le reliquat',1,0,0,{requires:'read',next:'idle'}),O('countertest','Consommer le reliquat en contre-épreuve',1,0,3,{requires:'read',next:'retested',renew:2}),O('readAgain','Lire la contre-épreuve',1,0,0,{requires:'retested',next:'idle'}));
  add('Ravageur','A',{main:{label:'Coupe orientée',damage:14,target:'enemy',next:'active',momentum:true}},[end('brake','Freiner et effacer l’élan',1,4,0)]);
  add('Ravageur','B',{duration:1,main:{label:'Freiner en garde',requires:'rotation',next:'active'}},[O('rotate','Amorcer sans frappe',1,2,0,{requires:null,next:'rotation',renew:2}),O('strike','Frapper et amorcer',1,6,0,{requires:null,damage:14,target:'enemy',next:'rotation',renew:2})]);
  add('Déchaîné','A',{duration:3,main:{label:'Lancer avec frappe',damage:14,target:'enemy',next:'active',weaponAway:true}},[O('return','Retour offensif payé',1,6,3,{damage:[14,16,18,20],target:'enemy',next:'idle',recoverWeapon:true,oncePerRound:true}),recover(2)]);
  add('Déchaîné','B',{duration:4,main:{label:'Placer le fer sans attaque',next:'active',weaponAway:true}},[O('move','Rapprocher le fer sans dégâts',1,4,2),O('return','Retour offensif payé',1,6,4,{damage:18,target:'enemy',next:'idle',recoverWeapon:true,oncePerRound:true}),recover(2)]);
  both('Bastion',{duration:4,main:{label:'Déployer la réserve partagée',next:'active',pool:[24,28,32,36]}},[end('fold','Replier',1,2,0),O('share','Réorienter ou réaffecter la réserve',1,2,0)]);
  specs['Bastion|A'].extras[1].next='idle';
  both('Porte-Étendard',{duration:4,main:{label:'Annoncer trois places de formation',next:'active'}},[end('end','Mettre fin à la formation',0,0,0)]);
  specs['Porte-Étendard|B'].extras.push(O('relief','Lancer la relève',1,2,2,{next:'relief',renew:2}),O('close','Clore une relève terminée',1,0,1,{requires:'relief',next:'active',renew:4}));
  both('Cartographe',{duration:5,main:{label:'Relever un itinéraire ordonné',next:'active'}},[end('end','Abandonner le tracé',0,0,0)]);
  specs['Cartographe|B'].duration=3; specs['Cartographe|B'].extras.push(O('revise','Réviser le segment ou le sens',1,1,2,{renew:3}));
  both('Veneur',{duration:4,main:{label:'Frapper et déposer la marque visible',damage:8,target:'enemy',contactControl:true,next:'active'}},[O('read','Lire un tronçon visible',1,0,2),end('end','Abandonner la piste',0,0,0)]);
  specs['Veneur|B'].duration=5; specs['Veneur|B'].extras[0].cost=C(1,1,3); specs['Veneur|B'].extras[0].label='Reconstituer une portion visible';
  both('Totémiste',{duration:5,main:{label:'Acheter le forfait, sans action native ajoutée',requires:'totem',next:null,credits:2}},[O('plant','Planter ou replanter le totem',1,2,2,{requires:null,next:'totem',devicePV:12,renew:5,credits:0}),O('lift','Relever le totem et perdre les crédits',1,2,0,{requires:'totem',next:'idle',credits:0})]);
  specs['Totémiste|B'].main.credits=4;
  both('Chimériste',{duration:4,main:{label:'Transformer le compagnon existant',next:'active',needsSummon:true}},[end('compact','Rendre la forme compacte',1,0,3)]);
  both('Astronome',{main:{label:'Préparer les options, sans dégâts',next:'active'}},[O('release','Résoudre une seule option annoncée',1,0,8,{delay:1,damage:34,target:'zone',undefendable:true,next:'idle'}),end('cancel','Annuler toutes les options',0,0,0)]);
  specs['Astronome|B'].extras[0].damage=[30,32,34,36];
  both('Prismancien',{duration:5,main:{label:'Émettre par la facette alignée',requires:'active',next:null,damage:46,target:'enemy',needsDevice:true}},[O('place','Poser et orienter la facette',1,0,3,{requires:null,next:'active',devicePV:[10,12,14,16],renew:5}),O('adjust','Régler au contact',1,2,0,{requires:'device',next:'active',renew:5}),O('recover','Reprendre la facette accessible',1,2,0,{requires:'device',next:'idle',recoverDevice:true})]);
  specs['Prismancien|B'].duration=2; specs['Prismancien|B'].main.next='device'; specs['Prismancien|B'].extras[0].devicePV=10; specs['Prismancien|B'].extras[0].renew=2; specs['Prismancien|B'].extras[1].label='Réaccorder les axes'; specs['Prismancien|B'].extras[1].cost=C(1,0,2); specs['Prismancien|B'].extras[1].renew=2;

  specs['Forgeron de Braise|B'].main.weaponBusy=true;
  specs['Exorciste|A'].main.weaponBusy=true; specs['Exorciste|A'].maxDuration=2;
  ['A','B'].forEach(function(key){specs['Totémiste|'+key].main.needsSummon=true;specs['Sondeur|'+key].main.material='sonde';specs['Sondeur|'+key].main.consume=1;Object.assign(specs['Sondeur|'+key].extras[1],{material:'sonde',recover:1});});
  ['A','B'].forEach(function(key){
    specs['Alchimiste|'+key].extras[0].renew=3;
    ['Roncier','Greffeur'].forEach(function(name){specs[name+'|'+key].duration=3;specs[name+'|'+key].extras.push(maintain(0,2));});
    specs['Roncier|'+key].extras.find(function(o){return o.id==='root';}).renew=3;
    specs['Greffeur|'+key].extras.find(function(o){return o.id==='root';}).renew=3;
  });
  specs['Verrier|A'].extras=[O('orient','Réorienter au contact',1,0,1),O('mask','Masquer le relais',1,2,0,{next:'masked'}),O('open','Rouvrir sans prolonger',1,0,1,{requires:'masked',next:'active'}),O('recover','Récupérer le relais',1,2,0,{requires:null,next:'idle'})];

  function data(){ return w.NPSermentsExpansion||{entries:[]}; }
  function fight(){ return w._cs; }
  function round(){ return (fight()&&fight().round)||1; }
  function entryFor(f){
    if(!f||f.isSummon)return null;
    var def=typeof w.getAllSD==='function'&&w.getAllSD()[f.classe];
    // An active archived V1 fight keeps its original rules until a new combat starts.
    var legacy=!!(f._np70&&!f._rf&&fight()&&fight().active);
    if(def&&def.reforged&&!legacy)return null;
    var entries=(legacy&&data().legacyEntries)||data().entries||[];
    return entries.find(function(e){return e.name===f.classe;});
  }
  function info(fi){
    var cs=fight(), f=cs&&cs.fighters[fi], entry=entryFor(f); if(!entry) return null;
    var p=typeof w.cGetFighterPlayer==='function'?w.cGetFighterPlayer(fi):f;
    var bundle=p&&typeof w.getPlayerSermentBundle==='function'?w.getPlayerSermentBundle(p):null;
    var selected=bundle&&bundle.branch, key=selected&&selected.combatRules&&selected.combatRules.key;
    if(!key && selected) entry.branches.forEach(function(b){ if(selected.nom===b.name||selected.nom==='Branche '+b.key+' — '+b.name) key=b.key; });
    if(cs.active){if(f._np70Branch===undefined)f._np70Branch=key||null;key=f._np70Branch;}
    var branch=entry.branches.find(function(b){return b.key===key;});
    var level=Number((p&&p.level)||f.level||1);
    var tier=branch?branch.tiers.filter(function(t){return t.level<=level;}).pop():null;
    var equipmentOnly=!tier&&['Arbalétrier','Guetteur','Pavoisier'].indexOf(entry.name)>=0;
    if(equipmentOnly){branch=Object.assign({},entry.branches[0],{key:'equipment',name:'Arbalète — gestes ordinaires',cost:C(1,4,0)});key='equipment';tier={level:1,effect:'Recharge 1 action/4 EP hors contact ; tir 1 action/4 EP, '+entry.damage+'+L ; 6 carreaux réels au plus. Crosse : 4+L pour 1 action/6 EP.'};}
    return {fi:fi,fighter:f,player:p,entry:entry,branch:branch,key:key,level:level,tier:tier,tierIndex:equipmentOnly?0:(branch&&tier?branch.tiers.indexOf(tier):-1),equipmentOnly:equipmentOnly,spec:equipmentOnly?specs['Arbalétrier|A']:(branch?specs[entry.name+'|'+key]:null)};
  }
  function fresh(){ return {stage:'idle',createdRound:0,expiresRound:0,inventory:{bolt:6,galet:10,segment:3,looseSegment:0,chain:1,looseChain:0,paste:1000,sonde:1},loaded:false,hands:0,charges:0,sections:0,growth:0,observations:0,used:{},records:[],devicePV:null,weaponAway:false,weaponBusy:false}; }
  function savedState(fi){ var f=fight().fighters[fi]; if(!f._np70) f._np70=fresh(); return f._np70; }
  function n(value,i){ return Array.isArray(value)?value[i]:value; }
  function expire(s,r){
    if(s.expiresRound&&s.expiresRound<=r){
      s.expiredAt=s.expiresRound; s.previousStage=s.stage; s.stage=s.devicePV!==null?'device':'expired'; s.charges=0; s.reserve=null; s.credits=0; s.weaponBusy=false; s.expiresRound=0;
    }
  }
  function state(fi,project){
    var s=clone(savedState(fi)); expire(s,round());
    if(project!==false) ((fight().decl||{})[fi]||[]).forEach(function(a){if(a.np70&&a.np70.op&&!a.np70.scene) apply(s,a.np70.op,a.np70.context,true);if(a.np70&&a.np70.nativeFee&&a.np70.useCredit)s.credits=Math.max(0,s.credits-1);if(a.np70Ordinary){if(a.np70Ordinary.material)s.inventory[a.np70Ordinary.material]--;if(a.np70Ordinary.weaponAway)s.weaponAway=true;}});
    return s;
  }
  function apply(s,op,ctx,projection){
    var r=ctx.round, ti=ctx.tierIndex;
    if(op.id==='recall') { s.stage='idle'; s.reserve=null; s.credits=0; s.charges=0; s.weaponAway=false; s.weaponBusy=false; s.expiresRound=0; return; }
    if(op.id==='main' && op.next==='active') { s.createdRound=r; if(!op.momentum)s.used={}; s.sections=0; s.growth=0; s.weaponBusy=false; s.milestones=[]; }
    if(op.next!==undefined&&op.next!==null) {
      if(op.next!==s.stage) s.stageRound=r;
      s.stage=op.next;
      if(op.next==='idle'){ s.reserve=null; s.charges=0; s.credits=0; s.weaponBusy=false; s.expiresRound=0; }
    }
    if(op.id==='main' && op.next==='active' && ctx.duration) s.expiresRound=r+ctx.duration;
    if(op.renew) s.expiresRound=r+op.renew;
    if(op.maintain){ var limit=ctx.maxDuration?s.createdRound+ctx.maxDuration:Infinity; var due=s.expiresRound||s.expiredAt||r; s.expiresRound=Math.min(limit,Math.max(due,r)+(ctx.duration||1)); s.stage=s.previousStage&&s.stage==='expired'?s.previousStage:'active'; delete s.expiredAt; }
    if(op.weaponAway!==undefined) s.weaponAway=op.weaponAway;
    if(op.weaponBusy!==undefined) s.weaponBusy=op.weaponBusy;
    if(op.recoverWeapon){s.weaponAway=false;s.weaponBusy=false;}
    if(op.load) s.loaded=true;
    if(op.shot){s.loaded=false;s.inventory.bolt--;}
    if(op.unload) s.loaded=false;
    if(op.material&&op.consume) s.inventory[op.material]-=op.consume;
    if(op.material&&op.recover) s.inventory[op.material]+=op.recover;
    if(op.mount){s.inventory.looseSegment--;s.inventory.segment++;}
    if(op.mountChain){s.inventory.looseChain--;s.inventory.chain++;}
    if(op.hand) s.hands+=op.hand;
    if(op.resetHands) s.hands=0;
    if(op.reserve) s.reserve={type:op.reserve,armedRound:r,used:false,reactionEp:op.reactionEp||0};
    if(op.charges!==undefined) s.charges=n(op.charges,ti);
    if(op.spendCharge) s.charges--;
    if(op.sections) s.sections+=op.sections;
    if(op.growth) s.growth+=op.growth;
    if(op.observation) s.observations+=op.observation;
    if(op.needsObservations) s.observations=0;
    if(op.summon)s.summoned=true;
    if(op.devicePV!==undefined){ if(s.devicePV===null) s.devicePV=n(op.devicePV,ti); s.devicePlaced=true; }
    if(op.recoverDevice) s.devicePlaced=false;
    if(op.pool!==undefined) s.pool=n(op.pool,ti);
    if(op.credits!==undefined){s.credits=op.credits;s.creditRound=r;}
    if(op.milestones!==undefined){s.milestoneCount=op.milestones;s.milestones=[];}
    if(op.once) s.used[op.id]=true;
    if(op.oncePerRound) s.used[op.id+'Round']=r;
    if(op.momentum){s.momentum=true;s.momentumRound=r;}
    if(op.addCharge) s.charge=0;
    if(!projection){s.records=s.records||[];s.records.push({round:r,label:op.label,cost:clone(op.cost),state:op.damage?'attaque résolue':'constat de scène à consigner',note:ctx.note||'',source:ctx.branchName});if(s.records.length>80)s.records.shift();}
  }
  function check(op,s,ctx){
    if(op.outOfCombat&&fight().active) return 'Cette fabrication exige 10 minutes hors combat.';
    if(op.requires==='loaded'&&!s.loaded) return 'Arbalète déchargée : recharge nécessaire.';
    if(op.requires==='unloaded'&&s.loaded) return 'Un carreau est déjà chargé.';
    if(op.requires==='device'&&(!s.devicePlaced||s.devicePV<=0)) return 'Dispositif absent ou détruit.';
    if(op.requires&&['loaded','unloaded','device'].indexOf(op.requires)<0&&s.stage!==op.requires&&!(op.maintain&&s.expiredAt===ctx.round&&s.previousStage===op.requires)) return 'Étape préalable : '+op.requires+'.';
    if(op.delay&&ctx.round<(s.stageRound||s.createdRound)+op.delay) return 'Disponible au prochain tour propre.';
    if(op.id==='main'&&op.next==='active'&&s.stage==='active'&&!op.damage&&ctx.entry.name!=='Fossoyeur') return 'Un dispositif est déjà engagé : utiliser ses étapes ou le terminer.';
    if(op.id==='main'&&s.weaponAway&&op.weaponAway) return 'Récupérer l’arme avant une nouvelle pose.';
    if(op.load&&s.inventory.bolt<1) return 'Aucun carreau disponible.';
    if(op.shot&&s.inventory.bolt<1) return 'Aucun carreau disponible.';
    if(op.shot&&s.weaponBusy) return 'Ouvrir le pavois avant de tirer.';
    if(op.material&&op.consume&&s.inventory[op.material]<op.consume) return 'Réserve matérielle insuffisante.';
    if(op.material&&op.recover){var caps={sonde:1,bolt:6,galet:10,looseSegment:3-s.inventory.segment,looseChain:1-s.inventory.chain};if(caps[op.material]!==undefined&&s.inventory[op.material]>=caps[op.material])return 'Réserve déjà complète ; aucune création de matériau.';}
    if(op.mount&&(!s.inventory.looseSegment||s.inventory.segment>=3))return 'Aucun segment récupéré à remonter.';
    if(op.mountChain&&(!s.inventory.looseChain||s.inventory.chain))return 'Aucune chaîne récupérée à remonter.';
    if(op.reserve==='projectile'&&s.inventory.galet<=0)return 'Aucun galet disponible.';
    if(op.hand>0&&s.hands>=2)return 'Deux mains engagées : retour en garde nécessaire.';
    if(op.hand<0&&s.hands<=0)return 'Les deux mains sont déjà en garde.';
    if(op.spendCharge&&s.charges<1)return 'Réserve épuisée.';
    if(op.once&&s.used[op.id])return 'Déjà effectué sur ce dispositif.';
    if(op.oncePerRound&&s.used[op.id+'Round']===ctx.round)return 'Déjà effectué pendant ce tour.';
    if(op.minSections&&s.sections<op.minSections)return 'Préparer toutes les sections requises.';
    if(op.maxSections&&s.sections>=op.maxSections)return 'Nombre maximal de sections atteint.';
    if(op.sections<0&&s.sections<=0)return 'Aucune section à reboucher.';
    if(op.needsObservations&&s.observations<op.needsObservations)return 'Observations payées requises : '+op.needsObservations+'.';
    if(op.requiresMilestones&&(s.milestones||[]).length<op.requiresMilestones)return 'Jalons ordonnés à constater avant clôture.';
    if(op.needsDevice&&(!s.devicePlaced||s.devicePV<=0))return 'Facette absente ou détruite.';
    if(op.summon&&(s.summoned||(typeof w.cActiveSummonForOwner==='function'&&w.cActiveSummonForOwner(ctx.playerId))))return 'Le compagnon acquis ne peut être invoqué qu’une fois par combat.';
    if(op.needsSummon&&!(typeof w.cActiveSummonForOwner==='function'&&w.cActiveSummonForOwner(ctx.playerId)))return 'Aucun compagnon vivant acquis présent.';
    if(op.maintain&&s.expiresRound&&s.expiresRound>ctx.round)return 'Entretien au tour de l’échéance seulement.';
    if(op.maintain&&ctx.maxDuration&&ctx.round>=s.createdRound+ctx.maxDuration)return 'Durée totale maximale atteinte.';
    return '';
  }
  function context(inf,params){return {round:round(),level:inf.level,tierIndex:inf.tierIndex,duration:n(inf.spec.duration,inf.tierIndex),maxDuration:inf.spec.maxDuration,entry:{name:inf.entry.name},playerId:inf.player&&inf.player.id,branchName:inf.branch.name,note:(params&&params.note)||''};}
  function acquiredCompanion(inf){var known=inf.player&&inf.player.sermentBranches&&inf.player.sermentBranches.Evocateur;if(known&&/Tortue/i.test(known))return 'turtle';if(known&&/Crabe/i.test(known))return 'crab';return savedState(inf.fi).acquiredCompanion||null;}
  function setAcquiredCompanion(fi,kind,note){var inf=info(fi);if(!inf||['Totémiste','Chimériste'].indexOf(inf.entry.name)<0||acquiredCompanion(inf)||['turtle','crab'].indexOf(kind)<0||!note)return tell('Indiquer le compagnon acquis avant l’évolution et la référence du MJ.');if(typeof w.combatSnapshot==='function')w.combatSnapshot();savedState(fi).acquiredCompanion=kind;return adjudicate(fi,'Compagnon antérieurement acquis : '+(kind==='turtle'?'Tortue':'Crabe')+'. '+note);}
  function operations(inf){
    var main=Object.assign({id:'main',cost:clone(inf.branch.cost)},clone(inf.spec.main));
    var ops=[main].concat(clone(inf.spec.extras));
    if(!inf.equipmentOnly&&['Guetteur','Pavoisier'].indexOf(inf.entry.name)>=0){
      ops.push(O('reload','Recharger l’arbalète',1,4,0,{requires:'unloaded',next:null,load:true}));
      ops.push(O('shoot','Tirer le carreau chargé',1,4,0,{requires:'loaded',next:null,shot:true,damage:inf.entry.damage,target:'enemy',projectile:true}));
      ops.push(O('recoverBolt','Reprendre un carreau intact',1,2,0,{requires:null,next:null,material:'bolt',recover:1}));
    }
    if(['Totémiste','Chimériste'].indexOf(inf.entry.name)>=0){var known=acquiredCompanion(inf);if(known==='turtle')ops.push(O('summonTurtle','Invoquer la Tortue déjà acquise',1,0,4,{requires:null,next:null,summon:'turtle'}));if(known==='crab')ops.push(O('summonCrab','Invoquer le Crabe déjà acquis',1,0,4,{requires:null,next:null,summon:'crab'}));}
    ops.push(O('recall','Rappeler l’arme · ne recharge rien',1,0,1,{requires:null,next:'idle'}));
    return ops;
  }
  function getOptions(fi){
    var inf=info(fi);if(!inf||!inf.branch||!inf.tier||!inf.spec)return [];
    var s=state(fi), ctx=context(inf), queued=((fight().decl||{})[fi]||[]), ep=queued.reduce(function(v,a){return v+(a.epCost||0);},0), em=queued.reduce(function(v,a){return v+(a.emCost||0);},0);
    return operations(inf).map(function(op){
      var reason=check(op,s,ctx), actions=typeof w.cActionsLeft==='function'?w.cActionsLeft(fi):3;
      if(!reason&&op.cost.actions>actions)reason='Actions restantes insuffisantes.';
      if(!reason&&op.cost.ep>inf.fighter.epCur-ep)reason='EP restants insuffisants.';
      if(!reason&&op.cost.em>inf.fighter.emCur-em)reason='EM restante insuffisante.';
      var value=op.damage!==undefined?n(op.damage,inf.tierIndex)+inf.level:0;
      if(op.addCharge)value+=s.charge||0;
      if(op.momentum&&s.momentum&&s.used.momentumBonusRound!==round()) value+=n([2,3,4,5],inf.tierIndex);
      return {action:'np70',kind:op.damage!==undefined?'attack':'utility',label:op.label,palNom:inf.branch.name,palierNiv:inf.tier.level,consumeActions:op.cost.actions,epCost:op.cost.ep,emCost:op.cost.em,value:value,targetType:op.target||'none',descText:inf.tier.effect,np70:{op:op,context:ctx,branch:inf.key,name:inf.entry.name},disabled:!!reason,reason:reason};
    });
  }
  function tell(msg){if(typeof w.notif==='function')w.notif(msg,'err');return {ok:false,error:msg};}
  function redraw(){if(typeof w.rCombat==='function')w.rCombat('p-combat-mj-c');}
  function log(msg,type){if(typeof w.cLog==='function')w.cLog(msg,type||'info');}
  function perform(fi,opId,params){
    params=params||{};var cs=fight(), inf=info(fi);
    if(!cs||!inf||!inf.branch||!inf.tier)return tell('Choisir une branche et atteindre son premier palier.');
    if(cs.phase!=='declaration'||cs.order[cs.turn]!==fi)return tell('Cette opération se déclare pendant le tour propre du porteur.');
    var choice=getOptions(fi).find(function(o){return o.np70.op.id===opId;});
    if(!choice)return tell('Opération indisponible.'); if(choice.disabled)return tell(choice.reason);
    var op=choice.np70.op;
    if(op.target==='enemy' && (!Number.isInteger(params.target)||!cs.fighters[params.target]||cs.fighters[params.target].pvCur<=0||params.target===fi))return tell('Choisir une cible vivante.');
    if(op.target==='zone' && (!Array.isArray(params.targets)||!params.targets.length||params.targets.some(function(t){return !Number.isInteger(t)||!cs.fighters[t]||cs.fighters[t].pvCur<=0;})))return tell('Cocher toutes les entités dans l’unique option retenue, alliés compris.');
    if(!params.sceneVerified&&['recall','cancel','end','release','remove','fold','brake'].indexOf(op.id)<0)return tell('Le MJ doit constater les conditions matérielles, la portée et le consentement dans la fiche de capacité.');
    if(typeof w.combatSnapshot==='function')w.combatSnapshot();
    choice=clone(choice); delete choice.disabled;delete choice.reason;
    choice.action='np70';choice.kind='attack'; // dispatched in turn order; utility never reaches the damage resolver.
    choice.np70.context.note=String(params.note||'Conditions matérielles constatées par le MJ.').slice(0,1500);
    choice.target=params.target;choice.np70.targets=params.targets||[];choice.np70.id='np-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
    cs.decl=cs.decl||{};(cs.decl[fi]=cs.decl[fi]||[]).push(choice);
    if(w.cActionsLeft(fi)<=0){cs.turn++;w._nextDeclarant();}
    redraw();return {ok:true,entry:choice};
  }
  function html(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function stageLabel(stage){return ({idle:'Aucune préparation',active:'Dispositif actif',expired:'Préparation expirée',device:'Dispositif inerte',loaded:'Chargé',held:'Objet tenu',open:'Attache ouverte',prepared:'Dose préparée',charged:'Chambre chargée',rotation:'Rotation amorcée',hanging:'Suspension',harvested:'Fibre récoltée',collected:'Réserve recueillie',deposited:'Dépôt posé',opened:'Panneau ouvert',detached:'Pièce détachée',fixed:'Charge fixée',carried:'Plante portée',bud:'Bourgeon prélevé',fork:'Fourche développée',secondVoice:'Seconde voix en attente',separated:'Mélange séparé',twoFractions:'Deux fractions recueillies',tested:'Essai réalisé',read:'Premier résultat lu',retested:'Contre-épreuve réalisée',relief:'Relève en cours',totem:'Totem planté',offered:'Étui déposé pour remise',shaped:'Pièce façonnée',masked:'Relais masqué'})[stage]||stage;}
  function render(fi){
    var inf=info(fi);if(!inf)return '';
    if(!inf.branch)return '<p class="np70-hint">Choisir une branche exclusive sur la fiche pour utiliser ce serment.</p>';
    if(!inf.tier)return '<p class="np70-hint">'+html(inf.branch.name)+' · premier palier au niveau '+inf.branch.tiers[0].level+'.</p>';
    var s=state(fi), form=((fight().np70Forms||{})[fi]||{}), h='<section class="np70-combat"><h4>'+html(inf.branch.name)+' · Niv. '+inf.tier.level+'</h4>';
    h+='<p class="np70-state">État : '+html(stageLabel(s.stage))+(s.expiresRound?' · échéance au tour '+s.expiresRound:'')+'</p>';
    if(['Arbalétrier','Guetteur','Pavoisier'].indexOf(inf.entry.name)>=0)h+='<p class="np70-state">'+(s.loaded?'Chargée':'Déchargée')+' · '+s.inventory.bolt+'/6 carreaux (celui chargé compris)</p>';
    if(['Frondeur','Ricocheteur'].indexOf(inf.entry.name)>=0)h+='<p class="np70-state">'+s.inventory.galet+'/10 galets · '+(s.reserve?'interception réservée':'aucune interception')+'</p>';
    if(inf.entry.name==='Empaleur')h+='<p class="np70-state">'+s.inventory.segment+'/3 segments montés · '+s.inventory.looseSegment+' récupérés</p>';
    h+='<details class="np70-rules"><summary>Règle complète et conditions de scène</summary><p>'+html(inf.tier.effect)+'</p>';
    ['timing','range','targets','duration','cycle','defense','limits'].forEach(function(k){h+='<p>'+html(inf.branch[k])+'</p>';});h+='</details>';
    h+='<label class="np70-verify"><input type="checkbox" id="np70-verify-'+fi+'" '+(form.verified?'checked':'')+' onchange="NPSermentsCombat.saveForm('+fi+',this.checked,null)"> Conditions de portée, matière et géométrie constatées.</label>';
    h+='<input id="np70-note-'+fi+'" class="np70-note" value="'+html(form.note||'')+'" oninput="NPSermentsCombat.saveForm('+fi+',null,this.value)" placeholder="Cible, position, objet, secteur ou choix annoncé…" aria-label="Constat de scène">';
    if(getOptions(fi).some(function(o){return o.targetType==='zone';})){
      h+='<fieldset class="np70-zone"><legend>Entités dans l’unique zone choisie (alliés inclus)</legend>';
      fight().fighters.forEach(function(f,ti){if(f.pvCur>0)h+='<label><input type="checkbox" data-np70-zone="'+fi+'" value="'+ti+'"> '+html(f.name)+'</label>';});h+='</fieldset>';
    }
    getOptions(fi).forEach(function(op){
      h+='<button class="np70-op" '+(op.disabled?'disabled title="'+html(op.reason)+'"':'onclick="NPSermentsCombat.click('+fi+',\''+op.np70.op.id+'\')"')+'><span>'+html(op.label)+(op.value?' · '+op.value+' dégâts':'')+'</span><small>'+op.consumeActions+' action'+(op.consumeActions>1?'s':'')+' · '+op.epCost+' EP · '+op.emCost+' EM'+(op.disabled?' — '+html(op.reason):'')+'</small></button>';
    });
    h+='<p class="np70-hint">Coûts, étapes et attaques chiffrées sont suivis. Les autres effets (placements, réductions, bonus, contrôles) demandent un constat MJ et, si nécessaire, un ajustement manuel des valeurs. Aucun dégât ou soin n’est déduit du texte.</p></section>';return h;
  }
  function click(fi,id){
    var get=function(s){return w.document.getElementById(s);}, target=get('decl-tgt-'+fi), verify=get('np70-verify-'+fi), note=get('np70-note-'+fi);
    return perform(fi,id,{target:target&&target.value!==''?Number(target.value):undefined,targets:Array.from(w.document.querySelectorAll('[data-np70-zone="'+fi+'"]:checked')).map(function(e){return Number(e.value);}),sceneVerified:!!(verify&&verify.checked),note:note&&note.value});
  }

  var originals={};
  function beginTurn(fi){
    var f=fight().fighters[fi];if(!f||!f._np70)return;
    var s=f._np70, before=s.stage;expire(s,round());
    if(before!==s.stage)log('⌛ '+f.name+' : fin de préparation ; aucun coût ni matériau rendu.');
    s._turnStarted=round();
  }
  function endTurn(fi){
    var f=fight().fighters[fi];if(!f)return;
    if(f._np70Native){var oi=fight().fighters.findIndex(function(o){return !o.isSummon&&o.pid===f.ownerPid;});if(oi>=0){var os=savedState(oi),oiInfo=info(oi);if(os.credits&&os.creditRound<=round()){var spent=(os.creditSpentByRound||{})[round()]||0;os.credits=Math.max(0,os.credits-Math.max(0,2-spent));if(oiInfo&&oiInfo.key==='A'||round()>os.creditRound)os.credits=0;}}return;}
    if(!f._np70)return;
    var s=f._np70;
    if(s.reserve&&s.reserve.type==='impact'&&s.stage==='active'&&s.reserve.armedRound<round())s.reserve=null;
  }
  function nextDefense(ti){
    var defs=((fight().decl||{})[ti]||[]).filter(function(d){return ['esquive','bloquer','parer'].indexOf(d.action)>=0;});
    var used=(fight()._usedDefs||{})[ti+'_def']||0;return {def:defs[used],index:used};
  }
  function controlDefense(ti){
    var next=nextDefense(ti);if(!next.def)return false;
    (fight()._usedDefs=fight()._usedDefs||{})[ti+'_def']=next.index+1;
    log('🛡 '+fight().fighters[ti].name+' défend le contact : aucun contrôle, aucun dégât.');return true;
  }
  function consumeAssignedReaction(attacker,fi,atk){
    var id=atk.np70?atk.np70.id:atk._np70Id;if(!id)return false;
    var assignment=(fight().np70Reactions||[]).find(function(r){return r.attackId===id&&!r.used;});if(!assignment)return false;
    var owner=fight().fighters[assignment.owner], s=owner&&owner._np70;
    if(!s||!s.reserve||s.reserve.used||owner.pvCur<=0)return false;
    if(s.reserve.type==='projectile'){
      if(atk.np70&&!atk.np70.op.projectile)return false;
      if(s.inventory.galet<=0)return false;
      if(atk.aoe||(atk.hits||1)>1||atk.undefendable)return false;
      s.inventory.galet--;
    }
    if(s.reserve.reactionEp){var fee=((fight().decl||{})[assignment.owner]||[]).find(function(a){return a.np70ReactionFee===id;});if(!fee||fee.action==='annule')return false;}
    s.reserve.used=true;s.reserve=null;s.stage='idle';assignment.used=true;
    log('🛡 '+owner.name+' : réserve consommée sur '+(atk.label||'l’attaque')+' ; attaque annulée sans riposte. '+assignment.note,'info');return true;
  }
  function resolve(attacker,fi,atk){
    var intercepted=consumeAssignedReaction(attacker,fi,atk);
    if(!atk.np70){
      if(atk.np70Ordinary){var ordinaryState=savedState(fi);if(atk.np70Ordinary.material)ordinaryState.inventory[atk.np70Ordinary.material]--;if(atk.np70Ordinary.weaponAway)ordinaryState.weaponAway=true;}
      if(intercepted)return;
      var beforeTarget=atk.target!==undefined?fight().fighters[atk.target]:null;
      var beforePv=beforeTarget&&beforeTarget.pvCur, defense=beforeTarget?nextDefense(atk.target).def:null;
      var result=originals.cResolveAttackInstance.apply(this,arguments);
      recordImpact(beforeTarget,beforePv,defense);return result;
    }
    var np=atk.np70;
    if(np.nativeFee){var os=savedState(fi);if(np.useCredit){os.credits=Math.max(0,os.credits-1);os.creditSpentByRound=os.creditSpentByRound||{};os.creditSpentByRound[round()]=(os.creditSpentByRound[round()]||0)+1;}else if(np.breakCredit)os.credits=0;log('◈ '+attacker.name+' paie une action native de son compagnon : '+(np.useCredit?'1 crédit':'3 EM')+'.');return;}
    if(np.scene){log('📋 '+attacker.name+' : '+atk.label+' — '+np.context.note,'info');if(np.sourceFi!==undefined&&np.endSource){var ss=savedState(np.sourceFi);ss.stage='idle';ss.reserve=null;ss.weaponBusy=false;}return;}
    var inf=info(fi);if(!inf||!inf.tier||np.name!==inf.entry.name||np.branch!==inf.key)return;
    var s=savedState(fi), op=np.op, ctx=np.context, invalid=check(op,s,ctx);
    if(invalid){log('⚠ '+attacker.name+' : '+op.label+' sans effet ('+invalid+'). Coût engagé conservé.');return;}
    if(op.control&&Number.isInteger(atk.target)&&controlDefense(atk.target)){
      log('📋 '+attacker.name+' : '+op.label+' défendu ; préparation non installée.');return;
    }
    var defended=Number.isInteger(atk.target)?nextDefense(atk.target).def:null;
    var contactPrevented=!!(op.contactControl&&defended);
    apply(s,op,ctx,false);
    if(op.summon){var turtle=op.summon==='turtle',level=inf.level,ownerId=inf.player&&inf.player.id;var summon={type:attacker.type,isSummon:true,_np70Native:true,ownerPid:ownerId,pid:ownerId,name:attacker.name+' · '+(turtle?'Tortue Bipède':'Crabe Canon'),classe:inf.entry.name+' — Invocation',level:level,pvCur:(turtle?28:16)+level,pvMax:(turtle?28:16)+level,epCur:999,epMax:999,emCur:0,emMax:0,dmgBase:turtle?7:8,statuts:[],actionsMax:2,autoInterpose:turtle,rangeType:turtle?'cac':'distance',img:''};fight().fighters.push(summon);var si=fight().fighters.length-1;(fight().np70NewSummons=fight().np70NewSummons||[]).push({owner:fi,index:si});log('🌀 '+attacker.name+' invoque son compagnon déjà acquis, une fois pour ce combat. Deux actions natives à partir de son prochain tour ; chaque action coûte 3 EM ou un crédit valable.','summon');}
    if(op.momentum&&atk.value>14+ctx.level)s.used.momentumBonusRound=ctx.round;
    if(contactPrevented){s.stage='idle';s.expiresRound=0;log('🛡 L’effet de contact est empêché par la défense.');}
    if(op.damage!==undefined&&!intercepted){
      var attack=Object.assign({},atk,{np70:undefined,action:'capacite',kind:'attack',aoe:false,undefendable:!!op.undefendable});
      var targets=op.target==='zone'?np.targets:[atk.target];
      targets.forEach(function(ti){
        var target=fight().fighters[ti];if(!target||target.pvCur<=0)return;
        var before=target.pvCur, def=nextDefense(ti).def;
        attack.target=ti;originals.cResolveAttackInstance.call(w,attacker,fi,attack);recordImpact(target,before,def);
      });
    }
    log((op.damage!==undefined?'⚔ ':'📋 ')+attacker.name+' · '+inf.branch.name+' : '+op.label+' ['+op.cost.actions+' action(s), '+op.cost.ep+' EP, '+op.cost.em+' EM] — '+ctx.note,(op.damage!==undefined?'spell':'info'));
    if(op.damage===undefined)log('🗺 Effet de scène à constater : '+inf.tier.effect+' Durée : '+inf.branch.duration,'info');
  }
  function recordImpact(target,before,def){
    if(!target||!target._np70||!def||def.action!=='parer')return;
    var s=target._np70;if(!s.reserve||s.reserve.type!=='impact'||s.stage!=='active')return;
    var fi=fight().fighters.indexOf(target), inf=info(fi);if(!inf)return;
    var cap=(inf.key==='A'?3:4)+inf.tierIndex;
    s.charge=Math.min(cap,Math.max(0,before-target.pvCur));s.stage='charged';s.reserve=null;s.expiresRound=round()+2;
    log('◈ '+target.name+' stocke '+s.charge+' dégâts réellement subis après parade.');
  }
  function assignReaction(ownerFi,attackerFi,index,note){
    var cs=fight(), owner=cs.fighters[ownerFi], atk=((cs.decl||{})[attackerFi]||[])[index];
    var s=state(ownerFi), raw=savedState(ownerFi);if(!s.reserve&&raw.reserve)s=clone(raw);
    if(!s.reserve||!atk||!(atk.value>0)||!note)return tell('Choisir une attaque matérielle visible compatible et décrire le constat.');
    if(s.reserve.type!=='projectile'&&s.reserve.type!=='preparation')return tell('Cette réserve ne peut pas annuler une attaque.');
    var inf=info(ownerFi);
    if(inf&&inf.entry.name==='Frondeur'&&((inf.key==='A'&&atk.target!==ownerFi)||(inf.key==='B'&&atk.target===ownerFi)))return tell('Le bénéficiaire ne correspond pas à cette branche.');
    if(s.reserve.type==='projectile'&&((atk.np70&&!atk.np70.op.projectile)||(!atk.np70&&/Rayon|Domaine|Poing|Foudre|Polaire/i.test(atk.palNom||atk.label||''))))return tell('Cette capacité n’est pas un projectile matériel.');
    if(atk.aoe||(atk.hits||1)>1||atk.undefendable)return tell('Zone, salve et attaque indéfendable incompatibles avec cette interception.');
    if(!raw.reserve&&cs.order.indexOf(ownerFi)>=cs.order.indexOf(attackerFi))return tell('La préparation doit être résolue avant cette attaque dans l’ordre des tours.');
    var id=atk.np70?atk.np70.id:(atk._np70Id||(atk._np70Id='atk-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)));
    cs.np70Reactions=cs.np70Reactions||[];
    if(cs.np70Reactions.some(function(r){return !r.used&&(r.owner===ownerFi||r.attackId===id);}))return tell('Une réserve ou cette attaque est déjà affectée.');
    var fee=s.reserve.reactionEp||0, spent=((cs.decl||{})[ownerFi]||[]).reduce(function(v,a){return v+(a.epCost||0);},0);
    if(owner.epCur-spent<fee)return tell('EP insuffisants pour la réponse défensive.');
    if(typeof w.combatSnapshot==='function')w.combatSnapshot();
    if(fee)(cs.decl[ownerFi]=cs.decl[ownerFi]||[]).push({action:'np70fee',kind:'utility',consumeActions:0,epCost:fee,emCost:0,label:'Interception : '+fee+' EP',np70Free:true,np70ReactionFee:id});
    cs.np70Reactions.push({owner:ownerFi,attackId:id,note:String(note).slice(0,1000),used:false});
    log('🛡 '+owner.name+' affecte sa réserve à une trajectoire constatée.');redraw();return {ok:true};
  }
  function sceneAction(fi,params){
    var cs=fight(), f=cs.fighters[fi];params=params||{};
    if(!f||cs.phase!=='declaration'||cs.order[cs.turn]!==fi)return tell('Action de scène à déclarer au tour propre de son acteur.');
    var cost=params.cost||{}, a=Number(cost.actions),ep=Number(cost.ep),em=Number(cost.em);
    if(!Number.isInteger(a)||a<0||a>3||!Number.isInteger(ep)||ep<0||!Number.isInteger(em)||em<0||!params.note||!params.label)return tell('Nom, constat et coûts numériques de la règle requis.');
    var queued=(cs.decl||{})[fi]||[],e=queued.reduce(function(v,x){return v+(x.epCost||0);},0),m=queued.reduce(function(v,x){return v+(x.emCost||0);},0);
    if(a>w.cActionsLeft(fi)||ep>f.epCur-e||em>f.emCur-m)return tell('Budget d’actions ou ressources insuffisant.');
    if(typeof w.combatSnapshot==='function')w.combatSnapshot();
    var entry={action:'np70',kind:'attack',label:String(params.label).slice(0,120),consumeActions:a,epCost:ep,emCost:em,value:0,np70:{scene:true,context:{note:String(params.note).slice(0,1500)},sourceFi:params.sourceFi,endSource:!!params.endSource}};
    (cs.decl[fi]=cs.decl[fi]||[]).push(entry);
    if(w.cActionsLeft(fi)<=0){cs.turn++;w._nextDeclarant();}redraw();return {ok:true};
  }
  function markMilestone(fi,note){
    var s=savedState(fi),inf=info(fi);if(!inf||!s.milestoneCount||!note)return tell('Aucune partition active ou constat absent.');
    if(s.milestones.length>=s.milestoneCount)return tell('Tous les jalons sont déjà accomplis.');
    if(typeof w.combatSnapshot==='function')w.combatSnapshot();
    s.milestones.push({round:round(),note:String(note).slice(0,1000)});log('♫ '+inf.fighter.name+' : jalon '+s.milestones.length+'/'+s.milestoneCount+' constaté : '+note);redraw();return {ok:true};
  }
  function adjudicate(fi,note){
    var f=fight().fighters[fi];if(!f||!note)return tell('Un constat est nécessaire.');
    if(typeof w.combatSnapshot==='function')w.combatSnapshot();
    var s=savedState(fi);s.records.push({round:round(),label:'Arbitrage MJ',state:'constaté',note:String(note).slice(0,1500)});log('🗺 '+f.name+' — constat MJ : '+note);redraw();return {ok:true};
  }
  function saveForm(fi,verified,note){var cs=fight();cs.np70Forms=cs.np70Forms||{};var f=cs.np70Forms[fi]=cs.np70Forms[fi]||{};if(verified!==null)f.verified=!!verified;if(note!==null)f.note=String(note).slice(0,1500);}
  function consumeCharge(fi,note){var s=savedState(fi);if(s.charges<1||!note)return tell('Une charge active et le constat de son usage ordinaire payé sont nécessaires.');if(typeof w.combatSnapshot==='function')w.combatSnapshot();s.charges--;if(!s.charges)s.stage='idle';return adjudicate(fi,'Charge consommée pendant l’usage payé : '+note);}
  function damageDevice(fi,amount,note){var s=savedState(fi);amount=Number(amount);if(s.devicePV===null||!Number.isInteger(amount)||amount<1||!note)return tell('Indiquer les dégâts matériels réellement résolus et leur origine.');if(typeof w.combatSnapshot==='function')w.combatSnapshot();s.devicePV=Math.max(0,s.devicePV-amount);if(!s.devicePV){s.stage='device';s.charges=0;s.credits=0;s.reserve=null;}return adjudicate(fi,'Structure : −'+amount+' PV, '+s.devicePV+' restants. '+note);}
  function setTotemRange(fi,within){var s=savedState(fi);s.withinTotem=!!within;if(!within)s.credits=0;log('◈ '+fight().fighters[fi].name+' : compagnon '+(within?'constaté dans le rayon du totem.':'hors rayon, crédits perdus.'));redraw();}
  function consumeImpact(fi,note){var s=savedState(fi),inf=info(fi);if(!inf||inf.entry.name!=='Cestuaire'||inf.key!=='B'||!s.charge||!note)return tell('Une charge et le constat de la défense payée sont nécessaires.');if(typeof w.combatSnapshot==='function')w.combatSnapshot();var amount=s.charge;s.charge=0;s.stage='idle';return adjudicate(fi,'Décompression '+amount+' après défense normale payée, ajustement PV constaté : '+note);}
  function consumePool(fi,amount,note){var s=savedState(fi),inf=info(fi);amount=Number(amount);if(!inf||inf.entry.name!=='Bastion'||!Number.isInteger(amount)||amount<1||amount>s.pool||amount>n(inf.key==='A'?[8,10,12,14]:[6,8,10,12],inf.tierIndex)||!note)return tell('Respecter la réserve, le plafond par impact et indiquer la réaction défensive payée.');if(typeof w.combatSnapshot==='function')w.combatSnapshot();s.pool-=amount;if(!s.pool)s.stage='idle';return adjudicate(fi,'Réserve −'+amount+' ; '+s.pool+' restants, après réaction payée et ajustement PV constaté : '+note);}
  function ledger(){
    var cs=fight();if(!cs||!cs.active||!w.document||!w.CU||w.CU.type!=='staff')return '';
    var expanded=cs.fighters.map(function(f,i){return {f:f,i:i};}).filter(function(x){return !!entryFor(x.f);});if(!expanded.length)return '';
    var h='<details class="np70-ledger"><summary>Registre des dispositifs, réactions et arbitrages</summary><p>Les positions et matières sont constatées en scène. Les réserves n’autorisent qu’une défense annoncée ; les opérations ci-dessous conservent une trace dans l’archive.</p>';
    expanded.forEach(function(x){
      var s=savedState(x.i),projected=state(x.i),inf=info(x.i);h+='<article><h4>'+html(x.f.name)+' · '+html(x.f.classe)+'</h4><p>'+html(stageLabel(s.stage))+(s.expiresRound?' · échéance tour '+s.expiresRound:'')+(s.devicePV!==null?' · structure '+s.devicePV+' PV':'')+(s.credits?' · '+s.credits+' crédits':'')+'</p>';
      h+='<input id="np70-ledger-note-'+x.i+'" placeholder="Constat de scène, expiration ou contre-mesure" aria-label="Constat MJ pour '+html(x.f.name)+'"><button onclick="NPSermentsCombat.adjudicate('+x.i+',document.getElementById(\'np70-ledger-note-'+x.i+'\').value)">Consigner le constat</button>';
      if(s.charge>0)h+='<p>Impact stocké : '+s.charge+' points. La décompression défensive se consigne après sa parade ou son blocage payé.</p><button onclick="NPSermentsCombat.consumeImpact('+x.i+',document.getElementById(\'np70-ledger-note-'+x.i+'\').value)">Consigner la décompression défensive payée</button>';
      if(s.pool>0)h+='<p>Réserve partagée : '+s.pool+' points. Chaque absorption exige une réaction défensive payée et un ajustement PV du MJ.</p><input id="np70-pool-'+x.i+'" type="number" min="1" max="'+s.pool+'" value="1"><button onclick="NPSermentsCombat.consumePool('+x.i+',document.getElementById(\'np70-pool-'+x.i+'\').value,document.getElementById(\'np70-ledger-note-'+x.i+'\').value)">Consigner et déduire l’absorption payée</button>';
      if(s.charges>0)h+='<p>Charges restantes : '+s.charges+'</p><button onclick="NPSermentsCombat.consumeCharge('+x.i+',document.getElementById(\'np70-ledger-note-'+x.i+'\').value)">Consommer une charge après l’usage payé constaté</button>';
      if(inf&&['Totémiste','Chimériste'].indexOf(inf.entry.name)>=0&&!acquiredCompanion(inf))h+='<p>Historique de la branche Évocateur absent : confirmer une fois le compagnon déjà acquis.</p><select id="np70-acquired-'+x.i+'"><option value="turtle">Tortue Bipède</option><option value="crab">Crabe Canon</option></select><button onclick="NPSermentsCombat.setAcquiredCompanion('+x.i+',document.getElementById(\'np70-acquired-'+x.i+'\').value,document.getElementById(\'np70-ledger-note-'+x.i+'\').value)">Consigner le compagnon acquis</button>';
      if(s.devicePV!==null)h+='<label>Dégâts matériels résolus <input id="np70-device-damage-'+x.i+'" type="number" min="1" value="1"></label><button onclick="NPSermentsCombat.damageDevice('+x.i+',document.getElementById(\'np70-device-damage-'+x.i+'\').value,document.getElementById(\'np70-ledger-note-'+x.i+'\').value)">Déduire de la structure</button>';
      if(inf&&inf.entry.name==='Totémiste')h+='<label><input type="checkbox" '+(s.withinTotem?'checked':'')+' onchange="NPSermentsCombat.setTotemRange('+x.i+',this.checked)"> Compagnon réellement dans le rayon du totem (sortie : crédits perdus)</label>';
      if(s.milestoneCount&&s.stage==='active')h+='<button onclick="NPSermentsCombat.markMilestone('+x.i+',document.getElementById(\'np70-ledger-note-'+x.i+'\').value)">Valider le prochain jalon payé ('+(s.milestones||[]).length+'/'+s.milestoneCount+')</button>';
      if((projected.reserve||s.reserve)&&['projectile','preparation'].indexOf((projected.reserve||s.reserve).type)>=0){
        h+='<select id="np70-reaction-'+x.i+'"><option value="">Attaque déclarée à intercepter</option>';
        cs.fighters.forEach(function(f,afi){((cs.decl||{})[afi]||[]).forEach(function(a,ai){if(a.value>0)h+='<option value="'+afi+':'+ai+'">'+html(f.name+' · '+a.label)+'</option>';});});h+='</select>';
        h+='<button onclick="NPSermentsCombat.assignFromUI('+x.i+')">Affecter la réserve à cette trajectoire</button>';
      }
      h+='<details><summary>Derniers constats</summary>';s.records.slice(-5).forEach(function(r){h+='<p>R'+r.round+' · '+html(r.label)+' — '+html(r.note)+'</p>';});h+='</details></article>';
    });
    var cur=cs.phase==='declaration'?cs.order[cs.turn]:undefined;
    if(cur!==undefined){
      h+='<article class="np70-scene"><h4>Action de scène de '+html(cs.fighters[cur].name)+'</h4><p>Pour une sortie de contrôle, une manipulation alliée ou un effet décrit dans la règle. Aucun dégât ou soin n’est déduit du texte.</p><input id="np70-scene-label" placeholder="Ex. se relever, ouvrir le verrou, refuser l’emprise"><input id="np70-scene-note" placeholder="Règle et conditions constatées"><label>Actions <input id="np70-scene-a" type="number" min="0" max="3" value="1"></label><label>EP <input id="np70-scene-ep" type="number" min="0" value="0"></label><label>EM <input id="np70-scene-em" type="number" min="0" value="0"></label><label>Dispositif auquel cette action met fin <select id="np70-scene-source"><option value="">Aucun — constat seul</option>'+expanded.map(function(x){return '<option value="'+x.i+'">'+html(x.f.name)+' · '+html(x.f.classe)+'</option>';}).join('')+'</select></label><button onclick="NPSermentsCombat.sceneFromUI('+cur+')">Déclarer et réserver les coûts</button></article>';
    }
    return h+'</details>';
  }
  function pruneOrphans(){var cs=fight();if(!cs)return;var ids=[],attackIds=[];Object.keys(cs.decl||{}).forEach(function(fi){(cs.decl[fi]||[]).forEach(function(a){if(a.np70NativeId)ids.push(a.np70NativeId);if(a.np70&&a.np70.id)attackIds.push(a.np70.id);if(a._np70Id)attackIds.push(a._np70Id);});});cs.np70Reactions=(cs.np70Reactions||[]).filter(function(r){return attackIds.indexOf(r.attackId)>=0;});Object.keys(cs.decl||{}).forEach(function(fi){cs.decl[fi]=cs.decl[fi].filter(function(a){if(a.np70&&a.np70.nativeFee)return ids.indexOf(a.np70.nativeActionId)>=0;if(a.np70ReactionFee)return cs.np70Reactions.some(function(r){return r.attackId===a.np70ReactionFee;});return true;});});}
  function install(){
    if(api.installed||typeof w.cGetAbilityOptions!=='function'||!data().entries.length)return false;
    ['cGetAbilityOptions','cBuildAbilityOptionsForPalier','cRenderAbilityButtons','cDeclareAction','cDeclCount','cResolveAttackInstance','combatResolve','rCombat','combatStart'].forEach(function(k){originals[k]=w[k];});
    w.cGetAbilityOptions=function(fi,left){if(fight().fighters[fi]&&fight().fighters[fi]._np70Native)return [];return info(fi)?getOptions(fi):originals.cGetAbilityOptions.apply(this,arguments);};
    w.cBuildAbilityOptionsForPalier=function(inf,pal,left){if(inf&&inf.fighter&&entryFor(inf.fighter))return getOptions(fight().fighters.indexOf(inf.fighter));return originals.cBuildAbilityOptionsForPalier.apply(this,arguments);};
    w.cRenderAbilityButtons=function(fi){if(fight().fighters[fi]&&fight().fighters[fi]._np70Native)return '';return info(fi)?render(fi):originals.cRenderAbilityButtons.apply(this,arguments);};
    w.cDeclCount=function(fi){return ((fight().decl||{})[fi]||[]).reduce(function(v,a){return v+(typeof a.consumeActions==='number'?a.consumeActions:1);},0);};
    w.cDeclareAction=function(fi,action,opts){
      var inf=info(fi),cs=fight();opts=opts||{};
      var native=cs.fighters[fi];
      if(native&&native._np70Native&&action!=='passer'){
        if(native.rangeType==='distance'&&action==='pugilat')return tell('Le Crabe acquis ne dispose pas d’attaque de mêlée.');
        var ownerFi=cs.fighters.findIndex(function(o){return !o.isSummon&&o.pid===native.ownerPid;}),owner=cs.fighters[ownerFi];if(!owner||owner.pvCur<=0)return tell('Porteur indisponible pour payer les actions natives.');
        if(['frappe','pugilat','deplacer','parer','esquive','bloquer','subit'].indexOf(action)<0)return tell('Action native non disponible.');
        var ownerState=state(ownerFi),pendingFees=((cs.decl||{})[ownerFi]||[]).filter(function(a){return a.np70&&a.np70.nativeFee;});
        var paid= pendingFees.filter(function(a){return a.np70.useCredit;}).length,ownerInf=info(ownerFi);
        var useCredit=!!(ownerState.withinTotem&&ownerState.stage==='totem'&&ownerState.credits>0&&paid<2&&ownerState.creditRound<=round()&&round()<=ownerState.creditRound+(ownerInf.key==='B'?1:0));
        var required=useCredit?0:3,spentEm=((cs.decl||{})[ownerFi]||[]).reduce(function(v,a){return v+(a.emCost||0);},0);
        if(owner.emCur-spentEm<required)return tell('Le porteur ne peut pas payer les 3 EM de cette action native.');
        if(ownerInf.entry.name==='Chimériste'&&ownerInf.key==='B'&&ownerState.stage==='active'&&['frappe','pugilat'].indexOf(action)>=0&&((cs.decl||{})[fi]||[]).some(function(a){return a.kind==='attack';}))return tell('Forme rehaussée : une attaque native maximum par tour.');
        var beforeNative=((cs.decl||{})[fi]||[]).length;var nativeResult=originals.cDeclareAction.apply(this,arguments);var nativeAdded=((cs.decl||{})[fi]||[])[beforeNative];
        if(nativeAdded){nativeAdded.np70NativeId='native-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);nativeAdded.epCost=0;nativeAdded.emCost=0;(cs.decl[ownerFi]=cs.decl[ownerFi]||[]).push({action:'np70',kind:'attack',label:'Coût action native',value:0,consumeActions:0,epCost:0,emCost:required,np70:{scene:true,nativeFee:true,nativeActionId:nativeAdded.np70NativeId,useCredit:useCredit,breakCredit:!ownerState.withinTotem,context:{note:'Action du compagnon'}}});}
        redraw();return nativeResult;
      }
      if(opts.np70)return perform(fi,opts.np70.op.id,opts);
      if(inf){
        if(['capacite','soin','frappe_dechainees'].indexOf(action)>=0)return tell('Employer les opérations explicites de la branche choisie.');
        var s=state(fi);
        if(action==='frappe'&&['Arbalétrier','Guetteur','Pavoisier'].indexOf(inf.entry.name)>=0)return tell('Utiliser Tirer le carreau chargé, après la recharge.');
        if(action==='frappe'&&(s.weaponAway||s.weaponBusy))return tell('L’arme est engagée ou absente : récupération requise.');
        if(action==='parer'&&(s.weaponAway||s.weaponBusy))return tell('L’arme engagée ne peut pas parer.');
        var ranged=data().definitions[inf.entry.name].cat==='distance';
        if(action==='frappe'&&ranged&&['Frondeur','Ricocheteur','Sondeur'].indexOf(inf.entry.name)>=0&&s.inventory.galet<1)return tell('Aucun galet disponible.');
        var cost={frappe:ranged?4:6,pugilat:6,esquive:8,parer:2,bloquer:5,deplacer:10,subit:0,passer:0}[action];
        var spent=((cs.decl||{})[fi]||[]).reduce(function(v,a){return v+(a.epCost||0);},0);
        if(cost!==undefined&&cost>inf.fighter.epCur-spent)return tell('EP insuffisants après les coûts déjà réservés.');
        var before=((cs.decl||{})[fi]||[]).length;
        var result=originals.cDeclareAction.apply(this,arguments);
        var decl=(cs.decl||{})[fi]||[],added=decl[before];
        if(added&&action==='frappe'&&ranged){added.epCost=4;added.np70Ordinary={material:['Frondeur','Ricocheteur','Sondeur'].indexOf(inf.entry.name)>=0?'galet':null,weaponAway:['Javelinier','Harponneur','Relieur'].indexOf(inf.entry.name)>=0};}
        if(added&&action==='parer')added.epCost=2;
        if(added&&action==='pugilat')added.value=3+inf.level;
        redraw();return result;
      }
      return originals.cDeclareAction.apply(this,arguments);
    };
    w.cResolveAttackInstance=resolve;
    w.combatResolve=function(){
      var cs=fight();if(cs.phase!=='resolution')return originals.combatResolve.apply(this,arguments);
      pruneOrphans();
      // Preflight every new operation against paid dependencies, before legacy resource debit.
      cs.fighters.forEach(function(f,fi){
        if(!entryFor(f))return;
        var s=clone(savedState(fi));expire(s,round());var ep=f.epCur,em=f.emCur;
        ((cs.decl||{})[fi]||[]).forEach(function(a){
          var reason='';
          if(a.np70&&!a.np70.scene)reason=check(a.np70.op,s,a.np70.context);
          if((a.epCost||0)>ep||(a.emCost||0)>em)reason=reason||'Ressources devenues insuffisantes.';
          if(reason){a.action='annule';a.kind='utility';a.epCost=0;a.emCost=0;log('⚠ '+f.name+' : '+a.label+' annulé avant paiement — '+reason);}
          else{ep-=a.epCost||0;em-=a.emCost||0;if(a.np70&&!a.np70.scene)apply(s,a.np70.op,a.np70.context,true);}
        });
      });
      cs.fighters.forEach(function(f,fi){if(!f._np70Native)return;((cs.decl||{})[fi]||[]).forEach(function(a){if(!a.np70NativeId)return;var fee;Object.keys(cs.decl||{}).some(function(oi){fee=cs.decl[oi].find(function(x){return x.np70&&x.np70.nativeActionId===a.np70NativeId;});return !!fee;});if(!fee||fee.action==='annule'){a.action='annule';a.kind='utility';log('⚠ Action native annulée : paiement du porteur indisponible.');}});});
      var result=originals.combatResolve.apply(this,arguments);
      (cs.np70NewSummons||[]).forEach(function(pair){if(cs.order.indexOf(pair.index)<0)cs.order.splice(cs.order.indexOf(pair.owner)+1,0,pair.index);});cs.np70NewSummons=[];
      cs.np70Reactions=(cs.np70Reactions||[]).filter(function(r){return !r.used;});return result;
    };
    w.rCombat=function(tid){pruneOrphans();var result=originals.rCombat.apply(this,arguments);var el=w.document&&w.document.getElementById(tid||'p-combat-mj-c');if(el&&w.CU&&w.CU.type==='staff'){var old=el.querySelector('.np70-ledger');if(old)old.remove();el.insertAdjacentHTML('beforeend',ledger());}return result;};
    w.combatStart=function(){var cs=fight();if(!cs.active)cs.fighters.forEach(function(f){if(entryFor(f)){f._np70=fresh();delete f._np70Branch;}});return originals.combatStart.apply(this,arguments);};
    api.installed=true;return true;
  }
  var api={version:'1.0.0',consumeImpact:consumeImpact,consumePool:consumePool,pruneOrphans:pruneOrphans,setAcquiredCompanion:setAcquiredCompanion,saveForm:saveForm,consumeCharge:consumeCharge,damageDevice:damageDevice,setTotemRange:setTotemRange,specs:specs,install:install,info:info,getOptions:getOptions,getState:state,perform:perform,click:click,beginTurn:beginTurn,endTurn:endTurn,assignReaction:assignReaction,sceneAction:sceneAction,markMilestone:markMilestone,adjudicate:adjudicate,render:render,
    assignFromUI:function(fi){var v=w.document.getElementById('np70-reaction-'+fi).value.split(':').map(Number);return assignReaction(fi,v[0],v[1],w.document.getElementById('np70-ledger-note-'+fi).value);},
    sceneFromUI:function(fi){var v=function(id){return w.document.getElementById(id).value;};return sceneAction(fi,{label:v('np70-scene-label'),note:v('np70-scene-note'),cost:{actions:Number(v('np70-scene-a')),ep:Number(v('np70-scene-ep')),em:Number(v('np70-scene-em'))},sourceFi:v('np70-scene-source')!==''?Number(v('np70-scene-source')):undefined,endSource:v('np70-scene-source')!==''});},
    _test:{fresh:fresh,apply:apply,check:check,context:context,expire:expire}};
  w.NPSermentsCombat=api;
  install();
})(typeof window!=='undefined'?window:globalThis);
