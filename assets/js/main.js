function ge(id){return document.getElementById(id);}
// Sanitisation HTML — empêche les injections XSS dans les données rendues depuis la DB
function esc(str){
  if(str===null||str===undefined) return "";
  return String(str)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#x27;");
}

// ==========================================
// HACHAGE DES MOTS DE PASSE (SHA-256)
// ==========================================
// Hache un mot de passe avec SHA-256 via Web Crypto API.
// Retourne une Promise<string> (hex). Préfixe "sha256:" pour distinguer
// les mots de passe hachés des anciens en clair (migration transparente).
async function hashPass(pass){
  var encoder=new TextEncoder();
  var data=encoder.encode(pass);
  var hashBuffer=await window.crypto.subtle.digest("SHA-256",data);
  var hashArray=Array.from(new Uint8Array(hashBuffer));
  return "sha256:"+hashArray.map(function(b){return b.toString(16).padStart(2,"0");}).join("");
}

// Vérifie un mot de passe contre un hash stocké.
// Gère la migration : si le stocké est en clair, compare directement (puis migre).
async function verifyPass(input, stored){
  if(!stored) return false;
  if(stored.indexOf("sha256:")===0){
    // Mot de passe déjà haché — comparer les hashes
    var h=await hashPass(input);
    return h===stored;
  } else {
    // Ancien mot de passe en clair — comparaison directe (migration au prochain login)
    return input===stored;
  }
}

(function(){
  try{
    var t=localStorage.getItem("np_theme")||"dark";
    var themeMap={violet:"theme-violet",red:"theme-red",green:"theme-green",easter:"theme-easter",halloween:"theme-halloween",noel:"theme-noel",bloodmoon:"theme-bloodmoon",aquaris:"theme-aquaris"};
    if(themeMap[t]) t=themeMap[t];
    // Appliquer thèmes de base sans vérification auth (événements vérifiés après)
    var baseOk=["dark","light","theme-violet","theme-red","theme-green"];
    var eventThemes=["theme-easter","theme-halloween","theme-noel","theme-bloodmoon","theme-aquaris"];
    if(t==="light"){ document.body.classList.add("light"); }
    else if(t.indexOf("theme-")===0){
      // Thème couleur de base — appliquer directement
      if(baseOk.indexOf(t)>=0){ document.body.classList.add(t); }
      // Thème événement — on l'applique pour éviter le flash, auth vérifiera après
      else if(eventThemes.indexOf(t)>=0){ document.body.classList.add(t); }
    }
  }catch(e){}
})();
// ==========================================
// DATA — SERMENTS
// ==========================================
var SD={
  "Duelliste":{arme:"Épée moyenne du serment",pvN:6,epN:6,emN:2,dmg:11,type:"Tranchant",
    lore:"Le Serment du Duelliste vient à ceux dont l'âme recherche l'équilibre dans le combat. Il reconnaît les êtres de maîtrise, ceux qui avancent sans brutalité inutile, avec une rigueur calme et une volonté nette. Le duelliste n'est pas seulement celui qui sait frapper : il est celui qui comprend la mesure, le rythme, la retenue et l'instant exact où la lame doit parler. Son épée moyenne du serment naît de cette harmonie. Ni trop lourde, ni trop légère, elle épouse la main de son porteur comme si elle en avait toujours attendu la prise. Elle symbolise la discipline, l'élégance et la fidélité à sa propre parole. Le Duelliste ressemble souvent à quelqu'un de droit, de propre, de stable. Sa présence n'est pas tapageuse, mais assurée. Ses gestes sont maîtrisés, sa posture tenue, son regard lucide. Il incarne le combattant classique dans ce qu'il a de plus noble : un être d'adresse, de sang-froid et d'exigence.",
    bA:{nom:"Branche A — L'Élan Tranchant",style:"Brutalité",
      descPhys:"De loin, le sol crisse sous une impulsion brusque. Le corps s'élance, bas, rapide, et la lame arrive avec lui — avant même que l'adversaire ait compris ce qui s'est passé. De près : aucun élan. La lame s'enfonce plein centre, et dans le même geste, le porteur pousse — bras, épaule, poids du corps. L'adversaire part en arrière, les pieds quittent le sol une fraction de seconde.",
      flavor:"De loin, la distance devient une arme. Le Duelliste ne subit pas l'espace qui le sépare de sa cible — il l'utilise. Un élan, un souffle, et la lame est déjà là où l'adversaire ne l'attendait pas encore. De près, il n'y a pas de danse. Juste un impact brut — la lame qui entre, le corps qui suit, et l'adversaire qui recule sans avoir eu son mot à dire. Le Duelliste ne cherche pas à blesser seulement. Il cherche à replacer. À décider, seul, de là où finit le combat.",
      paliers:[
        {niv:2,nom:"Élan Tranchant",cout:"6 EM — 1 action",desc:"À distance : dash vers la cible + frappe 6+Niv. Au corps à corps : frappe 10+Niv + repousse l'adversaire à distance (les deux doivent utiliser une action de déplacement pour se rapprocher)."},
        {niv:5,nom:"Élan Tranchant",cout:"6 EM — 1 action",desc:"À distance : 10+Niv. Au corps à corps : 14+Niv + repousse."},
        {niv:7,nom:"Élan Tranchant",cout:"6 EM — 1 action",desc:"À distance : 14+Niv. Au corps à corps : 18+Niv + repousse."},
        {niv:10,nom:"Élan Tranchant",cout:"6 EM — 1 action",desc:"À distance : 18+Niv. Au corps à corps : 22+Niv + repousse."}
      ]},
    bB:{nom:"Branche B — Taille Double",style:"Fluidité",
      descPhys:"La lame trace une première ligne, puis revient sans pause dans l'autre sens. Deux mouvements qui n'en font qu'un — fluides, enchaînés, comme écrits d'avance.",
      flavor:"Le premier coup ne cherche pas à finir — il ouvre. Il force l'adversaire à réagir, à se concentrer sur ce qui vient d'arriver. Et c'est là que le second arrive, dans la même respiration, avant que la défense ait eu le temps de se reformer. Deux coups. Un mouvement. L'adversaire n'a pas fait face à deux attaques — il a fait face à une seule réalité qui l'a frappé deux fois.",
      paliers:[
        {niv:2,nom:"Taille Double",cout:"5 EM — 1 action",desc:"2 frappes consécutives traitées individuellement. L'adversaire doit dépenser une défense séparée pour chacune. 5+Niv par frappe (total : 10+Niv×2)."},
        {niv:5,nom:"Taille Double",cout:"5 EM — 1 action",desc:"8+Niv par frappe (total : 16+Niv×2)."},
        {niv:7,nom:"Taille Double",cout:"5 EM — 1 action",desc:"11+Niv par frappe (total : 22+Niv×2)."},
        {niv:10,nom:"Taille Double",cout:"5 EM — 1 action",desc:"14+Niv par frappe (total : 28+Niv×2)."}
      ]}},

  "Sauvageon":{arme:"Hache à deux mains du serment",pvN:5,epN:8,emN:1,dmg:14,type:"Tranchant",
    lore:"Le Serment du Sauvageon s'attache à ceux dont la force naît des entrailles mêmes de l'instinct. Il reconnaît les êtres farouches, ceux qui ne se contentent pas de survivre, mais qui opposent leur existence entière à ce qui menace les leurs. Là où d'autres apprennent la guerre, le sauvageon semble l'avoir toujours portée en lui, brute, rugissante, impossible à contenir tout à fait. Sa hache à deux mains du serment est massive, lourde, presque primitive dans son évidence. Elle n'a pas vocation à séduire, mais à s'imposer. Elle est le prolongement d'un engagement ancien : employer sa puissance pour abattre l'opposant. Le Sauvageon ressemble à une force que le monde a à peine civilisée. Sa carrure, son allure, son regard ou sa manière d'entrer dans l'espace inspirent la rudesse, la rage contenue, l'endurance. Il évoque le berserker, le brutal, celui qui avance malgré les coups.",
    bA:{nom:"Branche A — Spirale Brisante",style:"AOE",
      descPhys:"La hache s'abat sur le sol avec tout le poids du porteur. Le sol se fissure sous l'impact. Une onde de choc se propage en cercle — quiconque se tient à portée sent le sol lui échapper sous les pieds.",
      flavor:"Le Sauvageon ne choisit pas ses victimes. Il choisit son point d'impact, et laisse le reste au chaos. La hache s'abat, le sol répond, et tout ce qui se trouve dans le rayon en paie le prix — qu'il soit ami ou ennemi. Ce n'est pas de la brutalité aveugle. C'est une décision tactique qui n'admet pas les demi-mesures.",
      paliers:[
        {niv:2,nom:"Spirale Brisante",cout:"5 EM — 1 action",desc:"Frappe le sol. Toutes entités au corps à corps — ennemies ET alliées — subissent 8+Niv dégâts contondants."},
        {niv:5,nom:"Spirale Brisante",cout:"5 EM — 1 action",desc:"12+Niv à toutes entités au CAC."},
        {niv:7,nom:"Spirale Brisante",cout:"5 EM — 1 action",desc:"16+Niv à toutes entités au CAC."},
        {niv:10,nom:"Spirale Brisante",cout:"5 EM — 1 action",desc:"20+Niv à toutes entités au CAC."}
      ]},
    bB:{nom:"Branche B — Lancer Bestial",style:"Précision",
      descPhys:"Aucune préparation. Aucun calcul apparent. Le Sauvageon saisit sa hache, pivote, et la lâche avec une force brute qui n'a rien d'élégant — et pourtant elle file droit, implacable, comme si la violence elle-même avait décidé de l'endroit où elle devait atterrir.",
      flavor:"Le risque est réel : après le lancer, il se retrouve sans arme. Ce risque assumé, c'est le prix d'un impact que peu peuvent encaisser. Il peut réinvoquer son arme (1 EM, 1 action) ou aller la récupérer physiquement (1 déplacement + 1 ramassage).",
      paliers:[
        {niv:2,nom:"Lancer Bestial",cout:"8 EM — 1 action",desc:"Lance la hache sur une cible à distance : 18+Niv. Après le lancer, le porteur n'a plus son arme — réinvoquer (1 EM, 1 action) ou aller la récupérer (2 actions)."},
        {niv:5,nom:"Lancer Bestial",cout:"8 EM — 1 action",desc:"24+Niv."},
        {niv:7,nom:"Lancer Bestial",cout:"8 EM — 1 action",desc:"30+Niv."},
        {niv:10,nom:"Lancer Bestial",cout:"8 EM — 1 action",desc:"38+Niv."}
      ]}},

  "Croisé":{arme:"Bouclier du serment",pvN:8,epN:3,emN:2,dmg:6,type:"Contondant",
    lore:"Le Serment du Croisé répond aux âmes que la droiture traverse comme une colonne de pierre. Il reconnaît ceux qui vivent avec le poids du devoir, ceux pour qui tenir bon n'est pas une posture mais une nécessité intérieure. Le croisé avance guidé par quelque chose de plus haut que lui, qu'il s'agisse de foi, de loi, de justice ou d'une promesse qu'il refuse de trahir. Son bouclier du serment n'est pas une simple protection : il est le signe visible d'un engagement. Il symbolise la volonté de se dresser entre le danger et ce qui doit être préservé, d'endurer sans céder, de faire rempart de son propre corps lorsque le monde menace de rompre. Le Croisé ressemble souvent à quelqu'un d'ordonné, de ferme, presque solennel. Il donne le sentiment d'un être difficile à détourner de sa route, capable de demeurer au milieu du chaos sans céder ce qu'il est. Là où d'autres avancent pour vaincre, lui avance d'abord pour tenir la ligne.",
    bA:{nom:"Branche A — Bash Cinglant",style:"Offensif",
      descPhys:"Le bouclier s'illumine d'une lueur jaunâtre, brève et sourde. Puis il part en travers — un choc brut, sans élégance. À chaque impact, quelque chose se renforce dans le Croisé — une résistance qui monte, comme si le combat lui-même nourrissait sa capacité à encaisser.",
      flavor:"Le bouclier n'est pas qu'un rempart — c'est une arme à part entière. Chaque coup de bouclier renforce le Croisé de l'intérieur. Plus il frappe, plus il devient difficile à abattre. La ligne tient parce qu'il choisit de la tenir.",
      paliers:[
        {niv:2,nom:"Bash Cinglant",cout:"6 EM — 1 action (CAC uniquement)",desc:"Frappe avec le bouclier : 5+Niv dégâts. Chaque hit augmente les PV maximum du Croisé de +3 PV max. Ces PV bonus disparaissent à la fin du combat."},
        {niv:5,nom:"Bash Cinglant",cout:"6 EM — 1 action",desc:"7+Niv dégâts. +5 PV max par hit."},
        {niv:7,nom:"Bash Cinglant",cout:"6 EM — 1 action",desc:"10+Niv dégâts. +7 PV max par hit."},
        {niv:10,nom:"Bash Cinglant",cout:"6 EM — 1 action",desc:"13+Niv dégâts. +10 PV max par hit."}
      ]},
    bB:{nom:"Branche B — Appel du Bouclier",style:"Aggro",
      descPhys:"Le bouclier s'illumine d'une lueur jaunâtre, intense, presque aveuglante. Le Croisé le frappe contre le sol avec fracas. Il se dresse, immobile, regard fixe — et quelque chose dans cette lumière et cette posture dit aux ennemis que c'est lui, et lui seul, qu'ils doivent abattre.",
      flavor:"Il attire à lui toute la violence du combat — et pour chaque ennemi qui répond, il grandit un peu plus. Les mobs intelligents restent bloqués 1 tour. Les mobs agressifs restent bloqués en permanence par instinct. L'effet de taunt peut être désactivé volontairement sans action.",
      paliers:[
        {niv:2,nom:"Appel du Bouclier",cout:"6 EM — 1 action",desc:"Provoque toutes les entités ennemies à portée. +3+Niv PV max par monstre provoqué. Mobs intelligents : effet 1 tour. Mobs agressifs : permanent. Désactivable sans action."},
        {niv:5,nom:"Appel du Bouclier",cout:"6 EM — 1 action",desc:"+5+Niv PV max par monstre provoqué."},
        {niv:7,nom:"Appel du Bouclier",cout:"6 EM — 1 action",desc:"+7+Niv PV max par monstre provoqué."},
        {niv:10,nom:"Appel du Bouclier",cout:"6 EM — 1 action",desc:"+10+Niv PV max par monstre provoqué."}
      ]}},

  "Rôdeur":{arme:"Dague du serment",pvN:2,epN:5,emN:3,dmg:8,type:"Tranchant",
    lore:"Le Serment du Rôdeur vient à ceux qui appartiennent aux marges, aux sentiers oubliés, aux silences où le danger se glisse sans bruit. Il reconnaît les êtres de vigilance et de mouvement, ceux qui savent frapper sans se laisser saisir, disparaître sans fuir, survivre là où d'autres s'épuisent à vouloir dominer. Sa dague du serment est légère, discrète, nerveuse. Elle ne réclame ni éclat ni gloire. Elle existe pour accompagner la rapidité, la précision, l'instinct d'esquive et la violence brève. Le Rôdeur ressemble à une silhouette insaisissable. Il paraît léger, mobile, difficile à enfermer dans un affrontement simple. Ses gestes sont rapides, son corps toujours prêt à se dérober ou à surgir. Il évoque la frappe, l'esquive, l'intouchable.",
    bA:{nom:"Branche A — Rafale de Lames",style:"Mêlée",
      descPhys:"La dague ne s'arrête pas. Premier coup, deuxième, troisième — enchaînés sans temps mort, sans respiration. La main du Rôdeur disparaît dans une succession de gestes trop rapides pour être lus séparément.",
      flavor:"Chaque frappe est traitée individuellement — la cible doit dépenser une défense séparée pour chacune. Trois coups. Une action. La cible ne peut pas tout bloquer.",
      paliers:[
        {niv:2,nom:"Rafale de Lames",cout:"6 EM — 1 action",desc:"3 frappes consécutives sur une même cible. Chaque frappe traitée individuellement (défense séparée pour chacune). 1+Niv par frappe (total : 3+Niv×3)."},
        {niv:5,nom:"Rafale de Lames",cout:"6 EM — 1 action",desc:"3+Niv par frappe (total : 9+Niv×3)."},
        {niv:7,nom:"Rafale de Lames",cout:"6 EM — 1 action",desc:"5+Niv par frappe (total : 15+Niv×3)."},
        {niv:10,nom:"Rafale de Lames",cout:"6 EM — 1 action",desc:"7+Niv par frappe (total : 21+Niv×3)."}
      ]},
    bB:{nom:"Branche B — Lancer Lié",style:"Distance",
      descPhys:"La dague quitte la main, frappe, et revient — comme si un fil invisible la ramenait. Le Rôdeur n'attend pas. La lame est déjà de retour avant même que l'adversaire ait compris qu'elle était partie.",
      flavor:"Utilisable uniquement hors corps à corps. La dague revient automatiquement et gratuitement dans sa main après le lancer — elle peut être utilisée à nouveau dès l'action suivante. Aucun risque de se retrouver sans arme.",
      paliers:[
        {niv:2,nom:"Lancer Lié",cout:"5 EM — 1 action",desc:"Lance la dague sur une cible à distance (hors CAC uniquement). 5+Niv. La dague revient automatiquement et gratuitement."},
        {niv:5,nom:"Lancer Lié",cout:"5 EM — 1 action",desc:"9+Niv. Retour automatique."},
        {niv:7,nom:"Lancer Lié",cout:"5 EM — 1 action",desc:"13+Niv. Retour automatique."},
        {niv:10,nom:"Lancer Lié",cout:"5 EM — 1 action",desc:"17+Niv. Retour automatique."}
      ]}},

  "Traqueur":{arme:"Lance du serment",pvN:2,epN:7,emN:2,dmg:8,type:"Tranchant",
    lore:"Le Serment du Traqueur s'attache aux esprits patients, calculateurs et dangereux. Il reconnaît ceux qui ne cherchent pas la victoire dans l'élan brut, mais dans la préparation, l'usure et le contrôle. Le traqueur aime comprendre, anticiper, tendre des pièges, enfermer peu à peu sa cible dans une situation dont elle ne peut plus s'extraire. Là où d'autres frappent pour vaincre vite, lui préfère affaiblir, ralentir, épuiser, jusqu'à rendre toute fuite inutile. Sa lance du serment incarne cette logique implacable. Élancée, précise et menaçante, elle symbolise une promesse de poursuite froide et de domination progressive. Elle n'est pas seulement faite pour atteindre, mais pour maintenir la pression, garder la distance juste, punir les ouvertures. Le Traqueur ressemble souvent à quelqu'un de lucide, attentif et difficile à lire. Il dégage moins une brutalité immédiate qu'un danger froid, calculé. Il n'est pas forcément celui qui terrasse le plus vite, mais bien celui qui fait durer le combat jusqu'à ce que sa cible n'ait plus rien à offrir.",
    bA:{nom:"Branche A — Lance Drainante",style:"Épuisement",
      descPhys:"La lance entre, ressort. Mais quelque chose reste — une douleur sourde, diffuse, qui court dans les membres. La cible bouge encore, mais chaque geste lui coûte un peu plus qu'avant.",
      flavor:"La lance entre, ressort. La cible bouge encore. Mais chaque action lui coûte un peu plus qu'avant. Le Traqueur n'a pas besoin de tuer vite. Il attend que son adversaire n'ait plus rien à offrir. Le drain d'EP s'applique simultanément aux dégâts — sans action supplémentaire.",
      paliers:[
        {niv:2,nom:"Lance Drainante",cout:"5 EM — 1 action",desc:"Frappe la cible : 4+Niv dégâts. Simultanément : la cible perd 8 EP."},
        {niv:5,nom:"Lance Drainante",cout:"5 EM — 1 action",desc:"8+Niv dégâts. Cible perd 12 EP."},
        {niv:7,nom:"Lance Drainante",cout:"5 EM — 1 action",desc:"12+Niv dégâts. Cible perd 16 EP."},
        {niv:10,nom:"Lance Drainante",cout:"5 EM — 1 action",desc:"16+Niv dégâts. Cible perd 20 EP."}
      ]},
    bB:{nom:"Branche B — Tenue de Ligne",style:"Contrôle",
      descPhys:"De loin : la lance se tend, précise, contrôlée. Elle atteint sans que le porteur ait bougé d'un pas. De près : la lance s'enfonce avec toute la puissance du Traqueur derrière elle, puis pousse — un mouvement brusque, sec, qui recrée la distance de force.",
      flavor:"Le Traqueur décide de la distance. L'adversaire ne choisit pas où finit le combat. À distance ou au corps à corps, la réponse est toujours une expression de contrôle absolu du terrain.",
      paliers:[
        {niv:2,nom:"Tenue de Ligne",cout:"5 EM — 1 action",desc:"À distance : frappe à portée de lance, 4+Niv. Au corps à corps : frappe puissante 10+Niv + repousse la cible à distance (les deux doivent utiliser une action de déplacement)."},
        {niv:5,nom:"Tenue de Ligne",cout:"5 EM — 1 action",desc:"Distance : 8+Niv. CAC : 16+Niv + repousse."},
        {niv:7,nom:"Tenue de Ligne",cout:"5 EM — 1 action",desc:"Distance : 12+Niv. CAC : 22+Niv + repousse."},
        {niv:10,nom:"Tenue de Ligne",cout:"5 EM — 1 action",desc:"Distance : 16+Niv. CAC : 28+Niv + repousse."}
      ]}},

  "Flécheur":{arme:"Arc du serment",pvN:3,epN:5,emN:4,dmg:10,type:"Tranchant",
    lore:"Le Serment du Flécheur répond à ceux dont l'âme cherche la justesse avant toute chose. Il reconnaît les êtres capables de silence, de patience, de contrôle, ceux qui savent attendre l'instant exact où un seul geste vaut davantage qu'une pluie de coups. Le flécheur est lié à la précision comme d'autres le sont à la force. Son arc du serment incarne cette promesse. Il existe pour tirer juste, pour ne rien gaspiller, pour transformer l'attention en impact. Dans ses courbes repose l'exigence d'un combat mesuré, où chaque flèche doit avoir un sens. Le Flécheur ressemble à quelqu'un de calme, concentré, presque distant dans son rapport au tumulte. Il observe avant d'agir. Il calcule sans paraître hésiter. Il donne l'image d'un combattant de précision, méthodique, dont la retenue ne fait que renforcer la dangerosité.",
    bA:{nom:"Branche A — Salve Aveugle",style:"AOE",
      descPhys:"Plusieurs flèches partent en même temps, en arc large. Elles ne cherchent pas une cible précise — elles saturent l'espace. Quiconque se trouve dans la zone reçoit.",
      flavor:"Ce n'est pas de la précision. C'est de la pression. Le terrain devient hostile pour tout le monde — alliés inclus. Une décision tactique à ne pas prendre à la légère.",
      paliers:[
        {niv:2,nom:"Salve Aveugle",cout:"6 EM — 1 action",desc:"Zone à distance. Toutes entités dans la zone — ennemies ET alliées — subissent 7+Niv."},
        {niv:5,nom:"Salve Aveugle",cout:"6 EM — 1 action",desc:"9+Niv à toutes entités dans la zone."},
        {niv:7,nom:"Salve Aveugle",cout:"6 EM — 1 action",desc:"12+Niv à toutes entités dans la zone."},
        {niv:10,nom:"Salve Aveugle",cout:"6 EM — 1 action",desc:"15+Niv à toutes entités dans la zone."}
      ]},
    bB:{nom:"Branche B — Flèche de Jugement",style:"Concentration",
      descPhys:"Le Flécheur s'immobilise. Tout le reste disparaît — le mouvement, le bruit, les alliés. Il ne reste que la cible et la corde tendue à l'extrême. Plus il attend, plus la flèche porte loin et fort. Quand elle part, c'est une sentence.",
      flavor:"Les actions sacrifiées ne sont pas perdues — elles sont investies dans la puissance du tir. Cette capacité ne peut pas être utilisée en surcadençage. Le nombre d'actions sacrifiées est limité aux actions de base du tour (maximum 2). Il est possible de surcadencer après.",
      paliers:[
        {niv:2,nom:"Flèche de Jugement",cout:"8 EM — coûte toutes les actions restantes du tour",desc:"0 action sacrifiée : 7+Niv. 1 action : 14+Niv. 2 actions : 20+Niv. Interdit en surcadençage."},
        {niv:5,nom:"Flèche de Jugement",cout:"8 EM",desc:"0 action : 11+Niv. 1 action : 18+Niv. 2 actions : 26+Niv."},
        {niv:7,nom:"Flèche de Jugement",cout:"8 EM",desc:"0 action : 15+Niv. 1 action : 22+Niv. 2 actions : 32+Niv."},
        {niv:10,nom:"Flèche de Jugement",cout:"8 EM",desc:"0 action : 19+Niv. 1 action : 28+Niv. 2 actions : 38+Niv."}
      ]}},

  "Elementaliste":{arme:"Poing américain du serment serti de gemmes",pvN:4,epN:4,emN:4,dmg:7,type:"Contondant",
    lore:"Le Serment de l'Élémentaliste s'attache à ceux dont l'âme sait contenir les contraires sans se briser. Il reconnaît les êtres profondément équilibrés, capables d'accueillir en eux le calme comme la violence, l'apaisement comme la fureur, sans jamais se laisser entièrement dévorer par l'un de ces extrêmes. Car les éléments ne répondent pas à un cœur instable : ils exigent une balance, une maîtrise, une forme d'harmonie intérieure. Son poing américain du serment, serti de gemmes, est le réceptacle de cette tension maîtrisée. L'Élémentaliste ressemble souvent à quelqu'un de mesuré, de posé, presque serein au premier regard. Pourtant, sous cette maîtrise, on sent une force capable d'exploser avec une violence redoutable.\n\nRÈGLE UNIVERSELLE — LE COMPTEUR ÉLÉMENTAIRE : Quelle que soit la branche choisie, l'Élémentaliste obéit à une loi fondamentale — les éléments exigent l'alternance. Chaque utilisation consécutive d'un même élément fait monter un compteur interne. À ±2, switcher vers l'élément opposé déclenche une combinaison élémentaire. Le compteur revient à 0. Un troisième coup consécutif sans switcher applique un malus de −25% aux dégâts (puis −50%, −75%...). Le corps de l'Élémentaliste trahit toujours son état : à ±2, le dernier élément utilisé commence à recouvrir son corps — flammes, givre, crépitements ou humidité — de plus en plus visible et incontrôlable.",
    bA:{nom:"Branche A — Feu & Glace",style:"Équilibre offensif",
      descPhys:"Le poing s'embrase ou se couvre de givre à l'impact. Si le porteur insiste sans alterner, les flammes deviennent incontrôlables sur son bras, ou le givre commence à remonter sur ses articulations. Ce n'est plus lui qui contrôle — c'est l'élément qui le gagne.",
      flavor:"Deux forces opposées — la brûlure et le gel — canalisées par le même poing. L'axe Feu (Poing Ardent) est dominant : plus puissant, plus coûteux (6 EM). L'axe Glace (Poing Polaire) est secondaire : plus sobre, moins cher (4 EM). GIVRE-BRÛLURE (Glace×2 → Feu) : burst de brûlure instantané en plus des dégâts normaux. EMBRASEMENT (Feu×2 → Glace) : pose un Brise Armure — le prochain coup reçu par la cible inflige des dégâts bonus, puis l'effet disparaît.",
      paliers:[
        {niv:2,nom:"Poing Ardent (6 EM) / Poing Polaire (4 EM)",cout:"6 EM Feu / 4 EM Glace — 1 action CAC",desc:"Feu : 8+Niv (brûlure). Glace : 5+Niv (gel). GIVRE-BRÛLURE : +7+Niv bonus brûlure. EMBRASEMENT : Brise Armure +10 sur prochain coup reçu par la cible."},
        {niv:5,nom:"Poing Ardent / Poing Polaire",cout:"6 EM / 4 EM",desc:"Feu : 11+Niv. Glace : 8+Niv. GIVRE-BRÛLURE : +12+Niv. EMBRASEMENT : +16."},
        {niv:7,nom:"Poing Ardent / Poing Polaire",cout:"6 EM / 4 EM",desc:"Feu : 14+Niv. Glace : 11+Niv. GIVRE-BRÛLURE : +17+Niv. EMBRASEMENT : +22."},
        {niv:10,nom:"Poing Ardent / Poing Polaire",cout:"6 EM / 4 EM",desc:"Feu : 17+Niv. Glace : 14+Niv. GIVRE-BRÛLURE : +24+Niv. EMBRASEMENT : +30."}
      ]},
    bB:{nom:"Branche B — Foudre & Eau",style:"Équilibre d'accumulation",
      descPhys:"Le poing crépite ou s'humidifie à l'impact. Si le porteur abuse de la foudre, les crépitements remontent sous sa peau. L'eau en excès commence à peser, à perler, à s'épaissir autour de lui.",
      flavor:"L'axe Foudre (Poing Foudre) est dominant : 4 EM. L'axe Eau (Poing Aquatique) est secondaire : 6 EM. ÉLECTROCUTION (Foudre×2 → Eau) : le porteur regagne de l'EP immédiatement. NOYADE ÉLECTRIQUE (Eau×2 → Foudre) : la cible perd de l'EP. Un cycle qui s'auto-entretient — régénère le porteur autant qu'il épuise l'adversaire.",
      paliers:[
        {niv:2,nom:"Poing Foudre (4 EM) / Poing Aquatique (6 EM)",cout:"4 EM Foudre / 6 EM Eau — 1 action CAC",desc:"Foudre : 6+Niv. Eau : 4+Niv (contondant). ÉLECTROCUTION : porteur regagne +10 EP. NOYADE ÉLECTRIQUE : cible perd -5 EP."},
        {niv:5,nom:"Poing Foudre / Poing Aquatique",cout:"4 EM / 6 EM",desc:"Foudre : 9+Niv. Eau : 6+Niv. ÉLECTROCUTION : +16 EP. NOYADE : -8 EP."},
        {niv:7,nom:"Poing Foudre / Poing Aquatique",cout:"4 EM / 6 EM",desc:"Foudre : 12+Niv. Eau : 8+Niv. ÉLECTROCUTION : +22 EP. NOYADE : -11 EP."},
        {niv:10,nom:"Poing Foudre / Poing Aquatique",cout:"4 EM / 6 EM",desc:"Foudre : 15+Niv. Eau : 10+Niv. ÉLECTROCUTION : +30 EP. NOYADE : -15 EP."}
      ]}},

  "Evocateur":{arme:"Bâton du serment orné de runes et d'anneaux",pvN:2,epN:3,emN:6,dmg:4,type:"Contondant",
    lore:"Le Serment de l'Évocateur répond à ceux qui ne marchent jamais tout à fait seuls. Il reconnaît les âmes capables d'ouvrir un passage vers d'autres présences, de supporter le poids d'un lien avec l'invisible sans s'y dissoudre. L'évocateur n'arrache pas des forces au monde : il les appelle, les guide, les maintient, et accepte en retour la responsabilité de ce qu'il invoque. Son bâton du serment est orné de runes et d'anneaux, signes d'une alliance ancienne entre le porteur et ce qu'il convoque. L'Évocateur ressemble souvent à quelqu'un de posé, de singulier, comme entouré d'un silence peuplé. Sa puissance n'est pas seulement en lui : elle se tient autour de lui, à travers lui, prête à prendre forme.\n\nRÈGLES DES INVOCATIONS : Chaque invocation ne peut être appelée qu'une seule fois par combat. Si elle tombe, elle ne peut pas être réinvoquée. Les invocations agissent après leur porteur à chaque tour. Elles obéissent aux ordres gratuitement (sans action). En l'absence d'ordre, elles agissent de façon autonome. Elles ne peuvent pas surcadencer (2 actions max). Chaque action coûte de l'EM au porteur. Si le porteur n'a plus assez d'EM, l'invocation disparaît. Elles possèdent leurs propres PV — à 0, elles disparaissent définitivement.",
    bA:{nom:"Branche A — La Tortue Bipède",style:"Tank",
      descPhys:"Elle émerge lentement, comme tirée d'un espace qui n'existe pas tout à fait. Sa carapace est dense, presque minérale, parcourue de lignes lumineuses qui pulsent au rythme de son porteur. Elle ne grogne pas. Elle se place. Et quand elle frappe, c'est avec la lenteur pesante de quelque chose qui n'a jamais eu besoin d'être rapide pour être dévastateur.",
      flavor:"En l'absence d'ordre, elle s'interpose automatiquement entre son porteur et tout ennemi qui tente de l'atteindre. Actions disponibles : Frappe (CAC, dégâts contondants) et S'interposer (absorbe le prochain coup destiné au porteur, coûte 1 action).",
      paliers:[
        {niv:2,nom:"Tortue Bipède",cout:"10 EM invoc / 6 EM par action",desc:"PV : 8+Niv. Frappe CAC : 4+Niv (contondants). 2 actions/tour. S'interpose automatiquement."},
        {niv:5,nom:"Tortue Bipède",cout:"8 EM invoc / 5 EM par action",desc:"PV : 14+Niv. Frappe : 5+Niv."},
        {niv:7,nom:"Tortue Bipède",cout:"6 EM invoc / 4 EM par action",desc:"PV : 20+Niv. Frappe : 6+Niv."},
        {niv:10,nom:"Tortue Bipède",cout:"4 EM invoc / 3 EM par action",desc:"PV : 28+Niv. Frappe : 7+Niv."}
      ]},
    bB:{nom:"Branche B — Le Crabe Canon",style:"Distance",
      descPhys:"Il apparaît en claquant ses pinces — deux masses d'énergie condensée qui crépitent à chaque chargement. Son corps translucide laisse voir les flux d'énergie qui circulent en lui. Quand il tire, le recul le fait reculer d'un pas. Il n'a pas d'yeux à proprement parler — juste deux points lumineux fixés en permanence sur ce que son porteur veut abattre.",
      flavor:"Fragile mais redoutable à distance. Il ne peut pas frapper au corps à corps — toute sa puissance est dans ses tirs. En l'absence d'ordre, il cible l'ennemi le plus proche du porteur. Actions disponibles : Tir (distance uniquement, dégâts contondants) et Se déplacer (repositionnement, 1 action).",
      paliers:[
        {niv:2,nom:"Crabe Canon",cout:"10 EM invoc / 6 EM par action",desc:"PV : 4+Niv. Tir à distance : 5+Niv (contondants). 2 actions/tour. Ne peut pas frapper au CAC."},
        {niv:5,nom:"Crabe Canon",cout:"8 EM invoc / 5 EM par action",desc:"PV : 8+Niv. Tir : 6+Niv."},
        {niv:7,nom:"Crabe Canon",cout:"6 EM invoc / 4 EM par action",desc:"PV : 12+Niv. Tir : 7+Niv."},
        {niv:10,nom:"Crabe Canon",cout:"4 EM invoc / 3 EM par action",desc:"PV : 16+Niv. Tir : 8+Niv."}
      ]}},

  "Conjurateur":{arme:"Chaîne du serment",pvN:2,epN:2,emN:7,dmg:6,type:"Contondant",
    lore:"Le Serment du Conjurateur s'attache à ceux dont la magie naît du lien plutôt que de la rupture. Il reconnaît les êtres capables de tisser des fils invisibles entre les vivants, de maintenir ce qui vacille, de soutenir ce qui s'effondre. Le conjurateur ne combat pas pour écraser — il combat pour que les autres tiennent debout. Sa chaîne du serment est lourde, froide, presque brutale dans sa forme. Pourtant, ce n'est pas une arme de destruction. C'est une arme de lien. Chaque maillon est une promesse : celle de ne pas lâcher, de relier ce qui menace de se séparer, de maintenir ensemble ce que le combat cherche à disperser. Le Conjurateur ressemble à un soutien calme, concentré, attentif aux failles comme aux besoins. Il protège, améliore, soulage, renforce. Là où d'autres frappent, lui permet aux autres de tenir.",
    bA:{nom:"Branche A — Frappe Déchaînée",style:"Offensif",
      descPhys:"La chaîne siffle dans l'air et frappe avec une précision froide. Au moment de l'impact, un fil de lumière s'échappe du point de contact — invisible à l'œil non averti — et rejoint l'allié désigné. Ce n'est pas de la magie spectaculaire. C'est un transfert silencieux, presque médical.",
      flavor:"Chaque coup inflige des dégâts ET soigne automatiquement un allié au choix, sans action supplémentaire. Le porteur peut dépenser 1 action supplémentaire pour rediriger le soin vers une cible différente. La douleur infligée devient, ailleurs, un souffle récupéré.",
      paliers:[
        {niv:2,nom:"Frappe Déchaînée",cout:"5 EM — 1 action",desc:"Frappe : 4+Niv dégâts. Soin automatique : 4 PV sur un allié au choix (même tour, sans action supp.)."},
        {niv:5,nom:"Frappe Déchaînée",cout:"5 EM — 1 action",desc:"6+Niv dégâts. Soin : 6 PV."},
        {niv:7,nom:"Frappe Déchaînée",cout:"5 EM — 1 action",desc:"8+Niv dégâts. Soin : 8 PV."},
        {niv:10,nom:"Frappe Déchaînée",cout:"5 EM — 1 action",desc:"10+Niv dégâts. Soin : 10 PV."}
      ]},
    bB:{nom:"Branche B — Soin Enchaîné",style:"Soin",
      descPhys:"Le Conjurateur s'immobilise. La chaîne cesse de siffler — elle pend, tendue, comme si elle retenait quelque chose d'invisible. Plus il attend, plus la lumière qui court le long des maillons s'intensifie. Quand il relâche, ce n'est pas un geste — c'est une libération. La lumière quitte la chaîne d'un coup et rejoint sa cible comme une vague. Ce qui était brisé se referme.",
      flavor:"Soin concentré sur un allié au choix. Les actions sacrifiées augmentent le soin. Interdit en surcadençage. Actions de base max : 2. Il est possible de surcadencer après l'activation.",
      paliers:[
        {niv:2,nom:"Soin Enchaîné",cout:"12 EM — coûte toutes les actions restantes du tour",desc:"0 action sacrifiée : 10+Niv PV soignés. 1 action : 18+Niv. 2 actions : 28+Niv. Interdit en surcadençage."},
        {niv:5,nom:"Soin Enchaîné",cout:"12 EM",desc:"0 action : 15+Niv. 1 action : 25+Niv. 2 actions : 38+Niv."},
        {niv:7,nom:"Soin Enchaîné",cout:"12 EM",desc:"0 action : 20+Niv. 1 action : 32+Niv. 2 actions : 48+Niv."},
        {niv:10,nom:"Soin Enchaîné",cout:"12 EM",desc:"0 action : 26+Niv. 1 action : 40+Niv. 2 actions : 60+Niv."}
      ]}},

  "Arcaniste":{arme:"Orbe du serment",pvN:1,epN:1,emN:8,dmg:4,type:"Contondant (coup de poing pour les non-magiques)",
    lore:"Le Serment de l'Arcaniste répond à ceux dont l'âme perçoit ce que les autres ne font qu'effleurer. Il reconnaît les êtres capables de sentir les fils dissimulés derrière toute chose, les tensions muettes, les lignes invisibles qui traversent le monde et relient l'ordre au chaos. Là où d'autres voient la matière, le mouvement ou le vide, l'arcaniste devine une trame. Et dans cette trame, il apprend à poser la main. Il ne façonne pas avec brutalité. Il approche, observe, comprend, puis tire sur les bons fils avec une précision d'artiste. Chaque geste semble presque délicat, presque beau, mais ce qu'il touche peut se défaire, se rompre, se plier jusqu'à l'anéantissement. Car chez lui, la destruction n'est pas une perte de contrôle. Elle est composition. Son orbe du serment renferme une lueur captive, comme le reflet d'un fil premier emprisonné dans la matière. L'Arcaniste ressemble souvent à quelqu'un de calme, concentré, presque absent par instants, comme si une part de lui écoutait toujours quelque chose derrière le visible.",
    bA:{nom:"Branche A — Domaine Étoilé",style:"AOE Indéfendable",
      descPhys:"L'orbe s'illumine d'un blanc froid. Autour du porteur, l'air se troue — de petites perles lumineuses apparaissent, suspendues, presque silencieuses. Elles ne bougent pas. Elles attendent. Puis elles explosent toutes en même temps, dans un souffle sec et aveuglant.",
      flavor:"Cette capacité ignore toutes les défenses — esquive, parade, blocage — à l'exception du déplacement. Toute entité qui quitte la zone avant l'explosion échappe aux dégâts. Alliés ET ennemis dans la zone subissent les dégâts.",
      paliers:[
        {niv:2,nom:"Domaine Étoilé",cout:"8 EM — 1 action",desc:"Zone ciblée. Toutes entités dans la zone (alliées ET ennemies) : 14+Niv. INDÉFENDABLE — esquive, parade, blocage inefficaces. Seul le déplacement hors zone avant l'explosion permet d'échapper."},
        {niv:5,nom:"Domaine Étoilé",cout:"8 EM — 1 action",desc:"20+Niv. Indéfendable sauf déplacement."},
        {niv:7,nom:"Domaine Étoilé",cout:"8 EM — 1 action",desc:"26+Niv. Indéfendable sauf déplacement."},
        {niv:10,nom:"Domaine Étoilé",cout:"8 EM — 1 action",desc:"34+Niv. Indéfendable sauf déplacement."}
      ]},
    bB:{nom:"Branche B — Rayon Étoilé",style:"Précision Défendable",
      descPhys:"L'orbe monte lentement, comme appelé. Au-dessus du porteur, une étoile prend forme — grande, presque tranquille, d'un blanc qui brûle les yeux sans prévenir. L'orbe s'aligne. Il n'y a pas d'hésitation. Le rayon part d'un seul coup, droit, absolu, comme si la distance entre le porteur et sa cible n'avait jamais existé. Ce qui est touché ne l'oublie pas.",
      flavor:"Les dégâts sont les plus élevés accessibles au Palier I — et les plus élevés du Serment. MAIS la cible peut utiliser toutes ses défenses normalement. Si la cible ne défend pas, les conséquences sont sévères. Le risque est entièrement du côté de l'Arcaniste.",
      paliers:[
        {niv:2,nom:"Rayon Étoilé",cout:"10 EM — 1 action",desc:"Rayon unique sur cible précise : 20+Niv. ENTIÈREMENT DÉFENDABLE — la cible peut esquiver, parer ou bloquer normalement. En contrepartie : dégâts les plus élevés du Serment."},
        {niv:5,nom:"Rayon Étoilé",cout:"10 EM — 1 action",desc:"28+Niv. Entièrement défendable."},
        {niv:7,nom:"Rayon Étoilé",cout:"10 EM — 1 action",desc:"36+Niv. Entièrement défendable."},
        {niv:10,nom:"Rayon Étoilé",cout:"10 EM — 1 action",desc:"46+Niv. Entièrement défendable."}
      ]}}
};


// ==========================================
// DATA — THÈMES
// ==========================================
var THEMES_BASE = [
  { id:"dark",        name:"Nuages Polaires", cls:"",              preview:["#0d0e18","#7eb8d4","#c9a84c"], desc:"Le thème original.", event:false },
  { id:"light",       name:"Brume Claire",    cls:"light",         preview:["#f4f5fa","#3a8fba","#9a7020"], desc:"Mode clair.",        event:false },
  { id:"violet",      name:"Abyssal",         cls:"theme-violet",  preview:["#0e0d18","#b07ae0","#9a74c4"], desc:"Teintes abyssales.", event:false },
  { id:"red",         name:"Écarlate",        cls:"theme-red",     preview:["#160d0d","#d45050","#c9a84c"], desc:"Rouge sang.",        event:false },
  { id:"green",       name:"Sylvan",          cls:"theme-green",   preview:["#0a150e","#50c864","#c9a84c"], desc:"Vert forêt.",        event:false },
];

// Thèmes événement — chargés depuis la DB (clé "event_themes")
// Format: { id, name, cls, preview:[bg,accent,gold], desc, availableUntil (timestamp), createdAt }

// v42 clean bootstrap helpers
function normalizeThemeId(themeId){
  var id = String(themeId || '').trim().toLowerCase();
  if(!id || id === 'theme-default') return 'dark';
  if(id.indexOf('theme-') === 0) id = id.replace(/^theme-/, '');
  if(id === 'default') return 'dark';
  return id;
}
async function _jsonPost(url, payload, opts){
  opts = opts || {};
  var res = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {})
  });
  var data = {};
  try { data = await res.json(); } catch(e) {}
  if(!res.ok && !data.ok) data.ok = false;
  data.status = res.status;
  if(!res.ok && !opts.silent && data && data.error){
    console.warn(url + ' -> ' + res.status + ' ' + data.error);
  }
  return data;
}
async function _authCall(payload, opts){ return _jsonPost('/.netlify/functions/auth', payload, opts); }
async function _dbCall(payload, opts){ return _jsonPost('/.netlify/functions/db', payload, opts); }
async function apiAuth(action, data){
  var payload = Object.assign({ action: action }, data || {});
  return _authCall(payload);
}

function npFriendlyApiError(resp, context){
  var status = resp && Number(resp.status || 0);
  var err = resp && resp.error ? String(resp.error) : "";
  var prefix = context ? String(context) + " : " : "";
  if(status === 0) return prefix + "serveur injoignable. Vérifie Netlify ou ta connexion.";
  if(status === 401) return prefix + (err || "session expirée ou identifiants incorrects.");
  if(status === 403) return prefix + (err || "accès refusé. Vérifie NP_SITE_URL ou tes permissions.");
  if(status === 409) return prefix + (err || "ce pseudo est déjà pris.");
  if(status === 415) return prefix + "requête refusée par le serveur.";
  if(status === 429) return prefix + (err || "trop de tentatives. Réessaie dans 15 minutes.");
  if(status === 503) return prefix + (err || "service indisponible. Vérifie NETLIFY_DATABASE_URL et NP_JWT_SECRET.");
  if(status >= 500) return prefix + (err || "erreur serveur Netlify.");
  if(err) return prefix + err;
  return prefix + "erreur inconnue.";
}

function npSetMaintenanceBanner(message, kind){
  var id = "np-maintenance-banner";
  var banner = ge(id);
  if(!message){
    if(banner) banner.remove();
    return;
  }
  if(!banner){
    banner = document.createElement("div");
    banner.id = id;
    banner.style.cssText = "position:fixed;left:12px;right:12px;bottom:12px;z-index:12000;padding:12px 14px;border:1px solid rgba(242,198,109,.28);background:rgba(17,18,26,.94);color:var(--text);box-shadow:0 18px 42px rgba(0,0,0,.38);font-size:13px;line-height:1.45;display:flex;gap:10px;align-items:flex-start;justify-content:space-between;";
    document.body.appendChild(banner);
  }
  var col = kind === "bad" ? "var(--red)" : "var(--gold)";
  banner.innerHTML = '<div><strong style="color:'+col+';font-family:var(--fd);letter-spacing:1px;text-transform:uppercase;font-size:10px;">Service temporairement indisponible</strong><div style="margin-top:3px;color:var(--dim);">'+esc(message)+'</div></div><button type="button" onclick="npSetMaintenanceBanner(null)" style="background:transparent;border:0;color:var(--faint);font-size:18px;cursor:pointer;line-height:1;">×</button>';
}

function npHandleServiceIssue(resp, context){
  var status = resp && Number(resp.status || 0);
  if(status === 0 || status === 503 || status >= 500){
    npSetMaintenanceBanner(npFriendlyApiError(resp, context) + " Les pages publiques restent consultables si elles sont déjà chargées.", "bad");
  }
}

var _DATA_SCHEMA_VERSION = 2;
var _DB_WRITE_STATUS = { pending:0, lastOkAt:0, lastErrAt:0, lastErrKey:"", lastErrToastAt:0 };
function _npClone(v){ try{ return JSON.parse(JSON.stringify(v)); }catch(e){ return v; } }
function _normalizeRoleClient(role){
  var r = String(role || "joueur").toLowerCase();
  return ["joueur","mj","designer","admin"].indexOf(r) >= 0 ? r : "joueur";
}
function _ensurePlainObject(v){ return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}; }
function _ensureArray(v){ return Array.isArray(v) ? v : []; }
function _safeFiniteNumber(v, fallback){ var n = Number(v); return isFinite(n) ? n : fallback; }
function _slugDataId(prefix, raw, idx){
  var s = String(raw == null ? '' : raw).toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'');
  if(!s) s = prefix + String(idx||0);
  return prefix + s;
}
function _normalizeListById(list, prefix, normalizer){
  var out = [];
  var seen = Object.create(null);
  _ensureArray(list).forEach(function(entry, idx){
    var item = normalizer ? normalizer(entry, idx) : entry;
    if(!item || typeof item !== 'object') return;
    var id = String(item.id || _slugDataId(prefix || 'item_', item.name || item.pseudo || idx, idx));
    item.id = id;
    if(seen[id]) return;
    seen[id] = true;
    out.push(item);
  });
  return out;
}
function _normalizeAccountRecord(acc, idx){
  var out = _ensurePlainObject(_npClone(acc));
  out.id = String(out.id || _slugDataId('a_', out.pseudo || out.name || idx, idx));
  out.pseudo = String(out.pseudo || out.name || ('Joueur ' + (idx+1))).trim().slice(0, 32);
  out.role = _normalizeRoleClient(out.role);
  if(!Object.prototype.hasOwnProperty.call(out, 'pid') || out.pid === '') out.pid = null;
  out.createdAt = _safeFiniteNumber(out.createdAt, Date.now());
  out.lastSeen = _safeFiniteNumber(out.lastSeen, out.createdAt);
  if(Array.isArray(out.unlockedThemes)) out.unlockedThemes = out.unlockedThemes.map(normalizeThemeId).filter(Boolean).filter(function(v, i, arr){ return arr.indexOf(v) === i; });
  else out.unlockedThemes = [];
  if(Array.isArray(out.blockedThemes)) out.blockedThemes = out.blockedThemes.map(normalizeThemeId).filter(Boolean).filter(function(v, i, arr){ return arr.indexOf(v) === i; });
  else out.blockedThemes = [];
  out.selectedTheme = normalizeThemeId(out.selectedTheme || 'dark') || 'dark';
  return out;
}

function _normalizeImageDataUrl(url){
  url = String(url || '').trim();
  if(!url) return '';
  if(/^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(url)) return url;
  var m = url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base(?!64,)(.*)$/i);
  if(m) return 'data:' + m[1] + ';base64,' + String(m[2] || '').replace(/^,+/, '');
  var m2 = url.match(/^data:(image\/[a-zA-Z0-9.+-]+);([^,]+),(.*)$/i);
  if(m2 && /base64/i.test(m2[2])) return 'data:' + m2[1] + ';base64,' + String(m2[3] || '');
  return url;
}
function _normalizePlayerRecord(player, idx){
  var out = _ensurePlainObject(_npClone(player));
  out.id = String(out.id || _slugDataId('p_', out.name || idx, idx));
  out.name = String(out.name || ('Joueur ' + (idx+1))).trim().slice(0, 80);
  out.classe = String(out.classe || out.class || '').trim();
  out.level = Math.max(1, Math.floor(_safeFiniteNumber(out.level, 1)));
  out.xpMax = Math.max(1, Math.floor(_safeFiniteNumber(out.xpMax, 30)));
  out.xp = Math.max(0, Math.floor(_safeFiniteNumber(out.xp, 0)));
  out.pvMax = Math.max(1, Math.floor(_safeFiniteNumber(out.pvMax, _safeFiniteNumber(out.pvCur, 30))));
  out.pvCur = Math.max(0, Math.floor(_safeFiniteNumber(out.pvCur, out.pvMax)));
  out.epMax = Math.max(0, Math.floor(_safeFiniteNumber(out.epMax, _safeFiniteNumber(out.epCur, 50))));
  out.epCur = Math.max(0, Math.floor(_safeFiniteNumber(out.epCur, out.epMax)));
  out.emMax = Math.max(0, Math.floor(_safeFiniteNumber(out.emMax, _safeFiniteNumber(out.emCur, 20))));
  out.emCur = Math.max(0, Math.floor(_safeFiniteNumber(out.emCur, out.emMax)));
  out.sLevel = Math.max(1, Math.floor(_safeFiniteNumber(out.sLevel, 1)));
  out.sXpMax = Math.max(1, Math.floor(_safeFiniteNumber(out.sXpMax, 10)));
  out.sXp = Math.max(0, Math.floor(_safeFiniteNumber(out.sXp, 0)));
  out.avatar = _normalizeImageDataUrl(out.avatar);
  out.arme = String(out.arme || '').trim();
  out.branch = String(out.branch || 'Aucune').trim();
  var eq = _ensurePlainObject(out.equipment);
  out.equipment = { helmet:eq.helmet || null, chest:eq.chest || null, legs:eq.legs || null };
  out.inventory = _ensureArray(out.inventory).slice(0, 500);
  out.history = _ensureArray(out.history).slice(-200);
  out.statuts = _ensureArray(out.statuts).slice(0, 64);
  if(Array.isArray(out.unlockedThemes)) out.unlockedThemes = out.unlockedThemes.map(normalizeThemeId).filter(Boolean).filter(function(v, i, arr){ return arr.indexOf(v) === i; });
  if(Array.isArray(out.blockedThemes)) out.blockedThemes = out.blockedThemes.map(normalizeThemeId).filter(Boolean).filter(function(v, i, arr){ return arr.indexOf(v) === i; });
  return out;
}
function _normalizeBeastRecord(beast, idx){
  var src = _ensurePlainObject(_npClone(beast));
  var primaryName = String(src.nom || src.name || src.label || ('Créature ' + (idx+1))).trim();
  var primarySub = String(src.sub || src.subtitle || src.sousTitre || src.sous_titre || src.typeLabel || '').trim();
  var primaryBeh = String(src.beh || src.behavior || src.comportement || src.behaviour || 'Neutre').trim() || 'Neutre';
  var primaryLevel = Math.max(1, Math.floor(_safeFiniteNumber(src.niv, _safeFiniteNumber(src.level, 1))));
  var primaryPv = Math.max(1, Math.floor(_safeFiniteNumber(src.pv, _safeFiniteNumber(src.hp, _safeFiniteNumber(src.pvMax, 20)))));
  var primaryEp = Math.max(0, Math.floor(_safeFiniteNumber(src.ep, _safeFiniteNumber(src.energy, _safeFiniteNumber(src.epMax, 20)))));
  var primaryFrappe = String(src.frappe || src.attack || src.basicAttack || '').trim();
  var primaryComp = String(src.comp || src.skill || src.ability || src.signature || '').trim();
  var primaryDrops = String(src.drops || src.loot || src.drop || '').trim();
  var primaryGem = String(src.gem || src.gemme || src.gemDrop || '').trim();
  var primaryDesc = String(src.desc || src.description || src.lore || '').trim();
  var primaryImg = _normalizeImageDataUrl(src.img || src.image || src.avatar || '');
  var out = {
    id: String(src.id || _slugDataId('b_', primaryName || idx, idx)),
    nom: primaryName,
    name: primaryName,
    sub: primarySub,
    subtitle: primarySub,
    beh: primaryBeh,
    behavior: primaryBeh,
    comportement: primaryBeh,
    niv: primaryLevel,
    level: primaryLevel,
    pv: primaryPv,
    hp: primaryPv,
    pvMax: primaryPv,
    ep: primaryEp,
    energy: primaryEp,
    epMax: primaryEp,
    frappe: primaryFrappe,
    attack: primaryFrappe,
    comp: primaryComp,
    skill: primaryComp,
    ability: primaryComp,
    drops: primaryDrops,
    loot: primaryDrops,
    gem: primaryGem,
    gemme: primaryGem,
    desc: primaryDesc,
    description: primaryDesc,
    img: primaryImg,
    image: primaryImg,
    hidden: !!src.hidden,
    statuts: _ensureArray(src.statuts || src.statuses).slice(0, 64),
    qtyMin: Math.max(1, Math.floor(_safeFiniteNumber(src.qtyMin, _safeFiniteNumber(src.minQty, 1)))),
    qtyMax: Math.max(1, Math.floor(_safeFiniteNumber(src.qtyMax, _safeFiniteNumber(src.maxQty, Math.max(1, _safeFiniteNumber(src.qtyMin, _safeFiniteNumber(src.minQty, 1))))))),
    spawnWeight: Math.max(1, Math.floor(_safeFiniteNumber(src.spawnWeight, _safeFiniteNumber(src.weight, 1)))),
    tags: _ensureArray(src.tags).map(function(x){ return String(x || '').trim(); }).filter(Boolean).slice(0, 24),
    zones: _ensureArray(src.zones).map(function(x){ return String(x || '').trim(); }).filter(Boolean).slice(0, 24),
    style: String(src.style || src.combatStyle || '').trim(),
    citation: String(src.citation || src.quote || '').trim(),
    adminNote: String(src.adminNote || src.noteAdmin || src.mjNote || '').trim(),
    archived: !!src.archived,
    createdAt: _safeFiniteNumber(src.createdAt, Date.now()),
    updatedAt: _safeFiniteNumber(src.updatedAt, _safeFiniteNumber(src.createdAt, Date.now()))
  };
  if(out.qtyMax < out.qtyMin) out.qtyMax = out.qtyMin;
  out.catalog = {
    id: out.id,
    name: out.nom,
    subtitle: out.sub,
    behavior: out.beh,
    level: out.niv,
    pv: out.pv,
    ep: out.ep,
    frappe: out.frappe,
    comp: out.comp,
    drops: out.drops,
    gem: out.gem,
    desc: out.desc,
    img: out.img,
    hidden: out.hidden,
    archived: out.archived,
    qtyMin: out.qtyMin,
    qtyMax: out.qtyMax,
    spawnWeight: out.spawnWeight,
    tags: out.tags.slice(),
    zones: out.zones.slice()
  };
  return out;
}
function _normalizeCombatArchiveRecord(entry, idx){
  var out = _ensurePlainObject(_npClone(entry));
  out.id = String(out.id || _slugDataId('arc_', out.label || out.title || out.savedAt || idx, idx));
  out.savedAt = _safeFiniteNumber(out.savedAt, _safeFiniteNumber(out.archivedAt, Date.now()));
  if(Array.isArray(out.fighters)) out.fighters = out.fighters.slice(0, 80);
  if(Array.isArray(out.log)) out.log = out.log.slice(-1200);
  if(Array.isArray(out.entries)) out.entries = out.entries.slice(-1200);
  return out;
}
function _normalizeDbValueForKey(key, value){
  var k = String(key || '');
  if(k === 'accounts') return _normalizeListById(value, 'a_', _normalizeAccountRecord);
  if(k === 'players') return _normalizeListById(value, 'p_', _normalizePlayerRecord);
  if(k === 'beasts') return _normalizeListById(value, 'b_', _normalizeBeastRecord);
  if(k === 'spawn_lab_staff'){
    var out = _ensurePlainObject(_npClone(value));
    out.schemaVersion = _DATA_SCHEMA_VERSION;
    out.lastDbSyncAt = _safeFiniteNumber(out.lastDbSyncAt, Date.now());
    return out;
  }
  if(k === 'theme_visibility'){
    var raw = _ensurePlainObject(_npClone(value));
    var map = {};
    Object.keys(raw).forEach(function(themeId){ map[normalizeThemeId(themeId)] = !!raw[themeId]; });
    return map;
  }
  if(k === 'np_syslog' || k === 'np_syslog_archive') return _ensureArray(_npClone(value)).slice(-500);
  if(k.indexOf('combat_arc_idx_') === 0) return _normalizeListById(value, 'arc_', _normalizeCombatArchiveRecord).slice(0, 5000);
  if(k.indexOf('combat_arc_rec_') === 0) return _normalizeCombatArchiveRecord(value || {}, 0);
  if(k.indexOf('combat_arc_') === 0) return _normalizeListById(value, 'arc_', _normalizeCombatArchiveRecord).slice(0, 500);
  return value;
}
function _reportDbWriteError(key, err){
  _DB_WRITE_STATUS.lastErrAt = Date.now();
  _DB_WRITE_STATUS.lastErrKey = String(key || '');
  if(typeof notif === 'function' && (_DB_WRITE_STATUS.lastErrAt - (_DB_WRITE_STATUS.lastErrToastAt || 0) > 6000)){
    _DB_WRITE_STATUS.lastErrToastAt = _DB_WRITE_STATUS.lastErrAt;
    try{ notif('Sauvegarde DB échouée (' + _DB_WRITE_STATUS.lastErrKey + '). Les données locales sont conservées.', 'err'); }catch(e){}
  }
}
function _reportDbWriteSuccess(key){ _DB_WRITE_STATUS.lastOkAt = Date.now(); }

function _hydrateBundleData(bundle){
  try{
    if(!bundle) return bundle;
    var data = bundle.data || bundle;
    if(!data || typeof data !== 'object') return bundle;
    data = _npClone(data);
    Object.keys(data).forEach(function(key){ data[key] = _normalizeDbValueForKey(key, data[key]); });
    ['players','accounts','beasts','events','serments_custom','lieux','event_themes'].forEach(function(k){
      if(Object.prototype.hasOwnProperty.call(data, k)) _dbCache[k] = data[k];
    });
    if(data.combatArchivesByOwner && typeof data.combatArchivesByOwner==='object' && !Array.isArray(data.combatArchivesByOwner)){
      Object.keys(data.combatArchivesByOwner).forEach(function(owner){
        _dbCache['combat_arc_'+owner] = Array.isArray(data.combatArchivesByOwner[owner]) ? data.combatArchivesByOwner[owner] : [];
      });
    }
    if(data.combatArchiveIndexByOwner && typeof data.combatArchiveIndexByOwner==='object' && !Array.isArray(data.combatArchiveIndexByOwner)){
      Object.keys(data.combatArchiveIndexByOwner).forEach(function(owner){
        _dbCache['combat_arc_idx_'+owner] = Array.isArray(data.combatArchiveIndexByOwner[owner]) ? data.combatArchiveIndexByOwner[owner] : [];
      });
    }
    var bundleThemeVisibility = (data.themeVisibility && typeof data.themeVisibility==='object' && !Array.isArray(data.themeVisibility)) ? data.themeVisibility : null;
    if(!bundleThemeVisibility && data.visibleThemes){
      window.VISIBLE_THEMES = Array.isArray(data.visibleThemes) ? data.visibleThemes.map(normalizeThemeId) : [];
      bundleThemeVisibility = {};
      window.VISIBLE_THEMES.forEach(function(id){ bundleThemeVisibility[id] = true; });
    }
    if(bundleThemeVisibility){
      var map = {};
      Object.keys(bundleThemeVisibility).forEach(function(key){ map[normalizeThemeId(key)] = !!bundleThemeVisibility[key]; });
      _dbCache.theme_visibility = map;
      window.VISIBLE_THEMES = Object.keys(map).filter(function(key){ return map[key] === true; });
      try{ localStorage.setItem("np_theme_visibility", JSON.stringify(map)); }catch(e){}
    }
    if(data.themeMetaServer) window.THEME_META_SERVER = data.themeMetaServer;
    if(data.public_stats) _dbCache.public_stats = data.public_stats;
    return bundle;
  }catch(e){
    console.warn('_hydrateBundleData failed', e);
    return bundle;
  }
}

async function _loadPublicBundle(){
  return _dbCall({ action:'get_public_bundle' }, { silent:true }).then(function(bundle){
    if(!bundle || bundle.offline || bundle.status >= 500 || bundle.ok === false){
      throw new Error((bundle && bundle.error) || 'db_unavailable');
    }
    return _hydrateBundleData(bundle);
  });
}
async function _loadSessionBundle(){
  return _authCall({ action:'session_bundle' }, { silent:true }).then(function(bundle){
    if(!bundle || bundle.offline || bundle.status >= 500){
      throw new Error((bundle && bundle.error) || 'auth_unavailable');
    }
    return _hydrateBundleData(bundle);
  });
}

const BUILTIN_THEME_IDS = ['dark','light','violet','red','green'].map(normalizeThemeId);
const ALWAYS_GRANTED_THEME_IDS = ['dark','light'].map(normalizeThemeId);
function isBaseTheme(themeId){ return BUILTIN_THEME_IDS.includes(normalizeThemeId(themeId)); }
function isAlwaysGrantedTheme(themeId){ return ALWAYS_GRANTED_THEME_IDS.includes(normalizeThemeId(themeId)); }
var THEMES_EVENT_BUILTIN = [
  { id:"easter",     name:"Printemps Éveillé", cls:"theme-easter",    preview:["#160f1f","#ffb9df","#fff19a"], desc:"Explosion de Pâques pastel : œufs peints, printemps sucré et éclats festifs partout.", event:true, availableUntil:1777593600000 },
  { id:"halloween",  name:"Nuit des Âmes",     cls:"theme-halloween", preview:["#0a0806","#e07820","#c040e0"], desc:"Thème Halloween.", event:true, availableUntil:1793577600000 },
  { id:"noel",       name:"Veillée Hivernale", cls:"theme-noel",      preview:["#090f0a","#70c060","#f0d060"], desc:"Thème Noël.",     event:true, availableUntil:1799193600000 },
  { id:"bloodmoon",  name:"Lune de Sang",      cls:"theme-bloodmoon", preview:["#040205","#ff5a73","#f4c670"], desc:"Un ciel noir, une lune rouge souveraine et une lumière d'or funèbre. Un thème fondateur, noble et menaçant.", event:true, availableUntil:0 },
  { id:"aquaris",   name:"Aquaris",           cls:"theme-aquaris",   preview:["#020c13","#57dfff","#88ffe7"], desc:"Un royaume englouti s’abat sur l’interface : bulles, lueurs océaniques, verre abyssal et profondeur aquatique partout.", event:true, availableUntil:0 },
];
function _cloneThemeEntry(entry){
  try{ return JSON.parse(JSON.stringify(entry)); }catch(e){ return entry; }
}
function _normalizeThemeEntryRecord(entry, fallbackId){
  var raw = (entry && typeof entry === 'object' && !Array.isArray(entry)) ? _cloneThemeEntry(entry) : {};
  var id = normalizeThemeId((raw && raw.id) || fallbackId);
  if(!id) return null;
  raw.id = id;
  return raw;
}
function _getDbThemeEntries(){
  var db = sto("event_themes") || [];
  if(Array.isArray(db)) return db.map(function(t){ return _normalizeThemeEntryRecord(t, t && t.id); }).filter(Boolean);
  if(db && typeof db === 'object'){
    return Object.keys(db).map(function(key){
      var entry = db[key];
      if(entry && typeof entry === 'object' && !Array.isArray(entry)) return _normalizeThemeEntryRecord(Object.assign({ id:key }, _cloneThemeEntry(entry)), key);
      return null;
    }).filter(Boolean);
  }
  return [];
}
function getAllThemes(){
  var merged = [];
  var byId = Object.create(null);
  THEMES_BASE.concat(THEMES_EVENT_BUILTIN).forEach(function(t){
    var entry = _normalizeThemeEntryRecord(t, t && t.id);
    if(!entry) return;
    byId[entry.id] = entry;
    merged.push(entry);
  });
  _getDbThemeEntries().forEach(function(t){
    if(!t || !t.id) return;
    if(byId[t.id]) Object.assign(byId[t.id], t);
    else {
      byId[t.id] = t;
      merged.push(t);
    }
  });
  return merged;
}
function getThemeVisibilityMap(){
  var raw = sto("theme_visibility");
  var src = (raw && typeof raw==="object" && !Array.isArray(raw)) ? raw : {};
  var map = {};
  Object.keys(src).forEach(function(key){
    map[normalizeThemeId(key)] = !!src[key];
  });
  ALWAYS_GRANTED_THEME_IDS.forEach(function(id){ map[id] = true; });
  BUILTIN_THEME_IDS.forEach(function(id){
    if(!Object.prototype.hasOwnProperty.call(map, id) && !isAlwaysGrantedTheme(id)) map[id] = true;
  });
  return map;
}
function getThemeVisibilityState(themeId){
  var id = normalizeThemeId(themeId);
  if(!id) return false;
  if(isAlwaysGrantedTheme(id)) return true;
  var map = getThemeVisibilityMap();
  if(Object.prototype.hasOwnProperty.call(map, id)) return map[id] === true;
  var t = getThemeById(id);
  if(t && typeof t.visible === 'boolean') return !!t.visible;
  return true;
}
function getAdminThemeVisibilityState(themeId){
  return getThemeVisibilityState(themeId) === true;
}
function isThemeVisibleForPlayer(themeId){
  var id = normalizeThemeId(themeId);
  if(!id) return false;
  if(CU && String(CU.role||"").toLowerCase()==="admin") return true;
  return getThemeVisibilityState(id) === true;
}
function isThemeOwnedByCurrentViewer(themeId){
  var id = normalizeThemeId(themeId);
  if(!id) return false;
  if(typeof isAdminLike === "function" && isAdminLike(CU)) return true;
  if(isAlwaysGrantedTheme(id)) return true;
  try{ if(typeof hasUnlocked === 'function' && hasUnlocked(id)) return true; }catch(e){}
  try{
    var account = (typeof getCurrentAccount === 'function') ? getCurrentAccount() : null;
    if(account && Array.isArray(account.unlockedThemes) && account.unlockedThemes.map(normalizeThemeId).includes(id)) return true;
    var player = (CU && CU.pid && typeof gpid === 'function') ? gpid(CU.pid) : null;
    if(player && Array.isArray(player.unlockedThemes) && player.unlockedThemes.map(normalizeThemeId).includes(id)) return true;
    if(normalizeThemeId(account && account.selectedTheme) === id) return true;
    if(normalizeThemeId(player && player.selectedTheme) === id) return true;
  }catch(e){}
  return false;
}
function isEventThemeTemporarilyLocked(themeId){
  var id = normalizeThemeId(themeId);
  if(!id) return false;
  var t = typeof getThemeById === 'function' ? getThemeById(id) : null;
  if(!t || !t.event) return false;
  if(isThemeOwnedByCurrentViewer(id)) return false;
  var until = Number(t.availableUntil || 0);
  if(!until) return false;
  return until <= Date.now();
}
function isEarlyCloudsOnlyTheme(themeId){
  var t = typeof getThemeById === 'function' ? getThemeById(themeId) : null;
  return !!(t && (t.earlyCloudsOnly === true || t.onlyEarlyClouds === true || t.early_clouds_only === true));
}
function isEarlyCloudsPlayer(player){
  if(!player || typeof player !== 'object') return false;
  return !!(player.earlyClouds === true || player.isEarlyClouds === true || player.early_clouds === true || player.foundingClouds === true);
}
function getVisibleThemesForCurrentViewer(){
  return getAllThemes().filter(function(t){
    return !!t && (isThemeVisibleForPlayer(t.id) || isThemeOwnedByCurrentViewer(t.id));
  });
}

function getEventThemes(){
  return getAllThemes().filter(function(t){ return !!(t && t.event); });
}
function getThemeById(id){
  var wanted = normalizeThemeId(id);
  return getAllThemes().find(function(t){ return normalizeThemeId(t && t.id) === wanted; }) || null;
}
// Thèmes disponibles au déblocage (fenêtre ouverte : availableUntil === 0 OU > now)
function getAvailableEventThemes(){
  return getEventThemes().filter(function(t){
    return t.availableUntil === 0 || t.availableUntil > Date.now();
  });
}
// Compte courant : thèmes débloqués
function getAutoGrantedThemeIds(){
  if(!CU) return [];
  var role = String(CU.role||"joueur").toLowerCase();
  if(role !== "joueur") return [];
  return getAllThemes()
    .filter(function(t){ return !!(t && !isBaseTheme(t.id) && t.autoGrantAll && !isEventThemeTemporarilyLocked(t.id)); })
    .map(function(t){ return t.id; });
}
function roleKey(user){
  return String((user&&user.role)||"joueur").toLowerCase();
}
function isAdminRole(user){
  return roleKey(user)==="admin";
}
function isStaffRole(user){
  var role = roleKey(user);
  return role === "admin" || role === "mj" || role === "designer";
}
function isAdminLike(user){
  if(!user) return false;
  return user.type === "staff" || isStaffRole(user);
}

function getUnlockedThemes(){
  if(CU && String(CU.role||"").toLowerCase()==="admin"){
    return getAllThemes().map(function(t){ return normalizeThemeId(t.id); });
  }
  if(!CU) return ALWAYS_GRANTED_THEME_IDS.slice();
  var account = getCurrentAccount();
  var player = (CU && CU.pid) ? gpid(CU.pid) : null;
  var unlocked = [];
  if(account && Array.isArray(account.unlockedThemes)) unlocked = unlocked.concat(account.unlockedThemes.map(normalizeThemeId));
  if(player && Array.isArray(player.unlockedThemes)) unlocked = unlocked.concat(player.unlockedThemes.map(normalizeThemeId));
  unlocked = unlocked.filter(Boolean).filter(function(v, i, arr){ return arr.indexOf(v) === i; });
  ALWAYS_GRANTED_THEME_IDS.forEach(function(id){ if(unlocked.indexOf(id)<0) unlocked.push(id); });
  getAutoGrantedThemeIds().forEach(function(id){ if(unlocked.indexOf(id)<0) unlocked.push(id); });
  return unlocked;
}
function hasUnlocked(themeId){
  return getUnlockedThemes().indexOf(normalizeThemeId(themeId)) >= 0;
}

function _playerBlockedThemes(p){
  const raw = (p && Array.isArray(p.blockedThemes)) ? p.blockedThemes : [];
  return raw.map(t => normalizeThemeId(t)).filter(Boolean);
}
function isThemeBlockedForPlayer(p, themeId){
  const id = normalizeThemeId(themeId);
  return !!id && _playerBlockedThemes(p).includes(id);
}

function canUseTheme(player, themeId){
  const id = normalizeThemeId(themeId);
  if(!id) return false;
  if(typeof isAdminLike === "function" && isAdminLike(CU)) return true;
  if(isAlwaysGrantedTheme(id)) return true;
  if(isThemeBlockedForPlayer(player, id)) return false;
  const account = getCurrentAccount();
  if(account && Array.isArray(account.blockedThemes) && account.blockedThemes.map(normalizeThemeId).includes(id)) return false;
  if(isEventThemeTemporarilyLocked(id)) return false;
  if(isEarlyCloudsOnlyTheme(id) && !isEarlyCloudsPlayer(player)) return false;
  const playerUnlocked = (player && Array.isArray(player.unlockedThemes)) ? player.unlockedThemes.map(normalizeThemeId) : [];
  const accountUnlocked = (account && Array.isArray(account.unlockedThemes)) ? account.unlockedThemes.map(normalizeThemeId) : [];
  const autoThemes = Array.isArray(window.AUTO_GRANTED_THEMES) ? window.AUTO_GRANTED_THEMES.map(normalizeThemeId) : [];
  const owned = playerUnlocked.includes(id) || accountUnlocked.includes(id) || autoThemes.includes(id);
  if(!isThemeVisibleForPlayer(id) && !owned) return false;
  return owned;
}

// Bootstrap — charge tout d'un coup au démarrage
var _dbOffline = false; // true si DB hors-ligne, fallback cache local

// ==========================================
// LOG SYSTÈME GLOBAL
// ==========================================
var _LOG_KEY="np_syslog";
var _LOG_ARCHIVE_KEY="np_syslog_archive";
var _LOG_PAGE_SIZE=50;
function getSysLog(){ return sto(_LOG_KEY)||[]; }
function saveSysLog(arr){ sv(_LOG_KEY,arr); }
function getSysLogArchive(){ return sto(_LOG_ARCHIVE_KEY)||[]; }
function saveSysLogArchive(arr){ sv(_LOG_ARCHIVE_KEY,arr); }
function sysLog(action,detail,actor){
  var entry={ts:Date.now(),action:action||"",detail:detail||"",actor:actor||(window.CU?CU.name:"Système")};
  var log=getSysLog(); log.unshift(entry);
  if(log.length>2000) log=log.slice(0,2000);
  saveSysLog(log);
}
function archiveSysLog(){
  // Collecter TOUT : syslog global + history de tous les personnages
  var sysEntries=getSysLog();
  var players=gp();
  var histEntries=[];
  players.forEach(function(p){
    (p.history||[]).forEach(function(h){
      histEntries.push({ts:h.ts||0,action:h.type||"stat",detail:h.text||"",actor:h.by||"?",target:p.name+" ("+esc(p.classe)+")",src:"history"});
    });
  });
  var sysForArchive=sysEntries.map(function(e){return {ts:e.ts,action:e.action,detail:e.detail,actor:e.actor,target:"",src:"syslog"};});
  var allEntries=sysForArchive.concat(histEntries);
  allEntries.sort(function(a,b){return b.ts-a.ts;});

  if(!allEntries.length){notif("Aucun log à archiver.","inf");return;}
  if(!confirm("Archiver et vider TOUT le log ?\n\n"+allEntries.length+" entrées seront archivées puis supprimées du log actif."))return;

  var archive=getSysLogArchive();
  var now=new Date();
  var ts=now.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"})+" "+now.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
  var filename="archive-"+now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0")+"-"+String(now.getDate()).padStart(2,"0")+"_"+String(now.getHours()).padStart(2,"0")+"h"+String(now.getMinutes()).padStart(2,"0");
  archive.unshift({archivedAt:Date.now(),label:"Archive du "+ts,filename:filename,entries:allEntries});
  if(archive.length>50) archive=archive.slice(0,50);
  saveSysLogArchive(archive);

  // Vider TOUT — syslog + history de chaque personnage
  saveSysLog([]);
  var ps=gp();
  ps.forEach(function(p){ p.history=[]; });
  sp(ps);

  notif("Archivé ("+allEntries.length+" entrées). Log vidé.","ok");
  renderDatabase();
}

function downloadArchive(idx){
  var archives=getSysLogArchive();
  var arc=archives[idx]; if(!arc) return;
  var lines=["NUAGES POLAIRES — "+arc.label,"Exporté le "+new Date().toLocaleString("fr-FR"),"","DATE | ACTION | DÉTAIL | PAR | CIBLE","---"];
  arc.entries.forEach(function(e){
    var d=e.ts?new Date(e.ts).toLocaleString("fr-FR"):"?";
    lines.push([d,e.action||"",e.detail||"",e.actor||"",e.target||""].join(" | "));
  });
  var blob=new Blob([lines.join("\n")],{type:"text/plain;charset=utf-8"});
  var url=URL.createObjectURL(blob);
  var a=document.createElement("a");
  a.href=url; a.download=(arc.filename||"archive")+".txt";
  document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); },200);
}

function deleteArchive(idx){
  if(!isAdminRole(CU)){ return; }
  if(!confirm("Supprimer cette archive ? Cette action est irréversible.")) return;
  var archives=getSysLogArchive();
  archives.splice(idx,1);
  saveSysLogArchive(archives);
  notif("Archive supprimée.","ok");
  _logShowArchive="list";
  renderDatabase();
}
var _logPage=0;
var _logShowArchive=null;

async function _dbBootstrap() {
  // Mettre à jour le message du loader
  var loaderMsg = document.querySelector("#db-loader div");
  // Version du schéma — si changé, invalider le cache localStorage
  var CACHE_VERSION="np_v8"; // v22 data integrity & schema normalization
  var cacheOk=localStorage.getItem("np_cache_version")===CACHE_VERSION;
  try {
    var timeoutPromise = new Promise(function(_, reject){
      setTimeout(function(){ reject(new Error("timeout")); }, 5000);
    });
    if(loaderMsg) loaderMsg.textContent = "Connexion à la base…";
    // Le cookie httpOnly est envoyé automatiquement avec credentials:"same-origin"
    // Le serveur filtre les clés privées selon l'auth du cookie
    var data = await Promise.race([_loadPublicBundle(), timeoutPromise]);
    _dbCache = data.data || {};
    // Stocker uniquement les clés publiques dans localStorage (fallback offline)
    // Les données privées restent en RAM uniquement et disparaissent au refresh/logout.
    ["beasts","serments_custom","events","lieux","public_stats"].forEach(function(k){
      if(_dbCache[k]!==undefined){
        try{ localStorage.setItem("np_"+k, JSON.stringify(_dbCache[k])); }catch(e2){}
      }
    });
    ["players","accounts"].forEach(function(k){
      try{ localStorage.removeItem("np_"+k); }catch(e2){}
    });
    localStorage.setItem("np_cache_version", CACHE_VERSION);
    _dbReady = true;
    _dbOffline = false;
  } catch (e) {
    console.warn("DB hors ligne ou timeout, fallback localStorage:", e.message||e);
    if(loaderMsg) loaderMsg.textContent = "Mode hors-ligne — chargement du cache local…";
    // Charger depuis localStorage (fallback offline)
    // Clés privées exclues : on ne restaure jamais accounts/players hors-ligne.
    var cacheLoaded=0;
    var offlineKeys = ["beasts","serments_custom","events","lieux","public_stats"];
    offlineKeys.forEach(function(k) {
      try {
        var v = localStorage.getItem("np_"+k);
        if(v){ _dbCache[k] = JSON.parse(v); cacheLoaded++; }
      } catch(e2){ console.warn("Cache corrompu pour",k,e2); }
    });
    // _dbCache en RAM uniquement — pas réécrit dans localStorage ici
    _dbReady = true;
    _dbOffline = true;
    if(cacheLoaded===0){
      console.warn("Aucun cache local disponible — login impossible hors-ligne.");
    }
  }
}

// Lecture synchrone depuis le cache

// Cache mémoire principal du front
var _dbCache = Object.create(null);
var _dbToken = false;
var _auditLoading = false;
var _auditLoadedOnce = false;
var _auditLog = [];
function _dbSetToken(v){
  _dbToken = !!v;
  return _dbToken;
}
(function initDbCache(){
  var preloadKeys = ["beasts","serments_custom","events","event_themes","theme_visibility","lieux","public_stats","np_syslog","np_syslog_archive"];
  for(var i=0;i<preloadKeys.length;i++){
    var k = preloadKeys[i];
    try{
      var raw = localStorage.getItem("np_"+k);
      if(raw!=null) _dbCache[k] = JSON.parse(raw);
    }catch(e){}
  }
})();


function npQaHeartbeat(){
  try{
    if(typeof _dbCache === 'undefined' || !_dbCache) window._dbCache = Object.create(null);
    if(typeof window.VISIBLE_THEMES === 'undefined') window.VISIBLE_THEMES = [];
    return true;
  }catch(e){
    console.error('npQaHeartbeat failed', e);
    return false;
  }
}
try{ npQaHeartbeat(); }catch(_){}

function sto(k) {
  if(typeof _dbCache==='undefined' || !_dbCache) return null;
  var v = _dbCache[k];
  return (v !== undefined && v !== null) ? v : null;
}

// Clés privées — jamais persistées en clair dans le navigateur
var _PRIVATE_KEYS = ["accounts","players"];
var _LOCAL_ONLY_KEYS = ["theme_visibility"];
var _DB_WRITE_QUEUE = window._DB_WRITE_QUEUE || (window._DB_WRITE_QUEUE = Object.create(null));
var _LEGACY_COMBAT_ARCHIVE_BUFFER = null;
var _LEGACY_COMBAT_ARCHIVE_MIGRATION_KEY = "np_combat_arc_migrated_v2";
function _collectLegacyCombatArchivesFromLocalStorage(){
  var out = Object.create(null);
  try{
    for(var i=0;i<localStorage.length;i++){
      var key = localStorage.key(i);
      var match = String(key||'').match(/^(?:np_)?combat_arc_(.+)$/i);
      if(!match) continue;
      var owner = String(match[1]||'').trim();
      if(!owner) continue;
      var raw = localStorage.getItem(key);
      if(!raw) continue;
      var parsed = JSON.parse(raw);
      if(!Array.isArray(parsed) || !parsed.length) continue;
      if(!out[owner]) out[owner] = [];
      parsed.forEach(function(entry){ out[owner].push(entry); });
    }
  }catch(e){}
  return out;
}
function _removeLegacyCombatArchivesFromLocalStorage(){
  try{
    var toRemove = [];
    for(var i=0;i<localStorage.length;i++){
      var key = localStorage.key(i);
      if(/^(?:np_)?combat_arc_/i.test(String(key||''))) toRemove.push(key);
    }
    toRemove.forEach(function(key){ try{ localStorage.removeItem(key); }catch(e2){} });
    try{ localStorage.setItem(_LEGACY_COMBAT_ARCHIVE_MIGRATION_KEY, String(Date.now())); }catch(e3){}
  }catch(e){}
}
function _mergeCombatArchiveLists(base, incoming){
  var merged = [];
  var seen = Object.create(null);
  function add(list){
    (Array.isArray(list)?list:[]).forEach(function(entry, idx){
      if(!entry || typeof entry !== 'object') return;
      var key = String(entry.id || '') || ('ts:' + String(entry.savedAt || '') + ':' + idx);
      if(seen[key]) return;
      seen[key] = true;
      try{ merged.push(JSON.parse(JSON.stringify(entry))); }catch(e){ merged.push(entry); }
    });
  }
  add(base);
  add(incoming);
  merged.sort(function(a,b){ return (b&&b.savedAt||0) - (a&&a.savedAt||0); });
  return merged.slice(0, 5000);
}
function _combatArchiveListsEqual(a,b){
  try{ return JSON.stringify(Array.isArray(a)?a:[]) === JSON.stringify(Array.isArray(b)?b:[]); }catch(e){ return false; }
}
function _migrateLegacyCombatArchivesForCurrentSession(){
  if(!_dbToken || _dbOffline) return Promise.resolve(false);
  var owners = [];
  try{ owners = combatArchiveCurrentOwners ? combatArchiveCurrentOwners() : []; }catch(e){ owners = []; }
  owners = (owners||[]).filter(function(owner, idx, arr){ return !!owner && arr.indexOf(owner) === idx; });
  if(!owners.length) return Promise.resolve(false);
  var legacy = _collectLegacyCombatArchivesFromLocalStorage();
  if(_LEGACY_COMBAT_ARCHIVE_BUFFER && typeof _LEGACY_COMBAT_ARCHIVE_BUFFER === 'object') {
    Object.keys(_LEGACY_COMBAT_ARCHIVE_BUFFER).forEach(function(owner){
      legacy[owner] = _mergeCombatArchiveLists(legacy[owner]||[], _LEGACY_COMBAT_ARCHIVE_BUFFER[owner]||[]);
    });
  }
  var primaryOwner = owners[0];
  var merged = sto('combat_arc_' + primaryOwner) || [];
  var hasLegacy = false;
  owners.forEach(function(owner){
    if(Array.isArray(legacy[owner]) && legacy[owner].length){
      merged = _mergeCombatArchiveLists(merged, legacy[owner]);
      hasLegacy = true;
    }
    if(owner !== primaryOwner){
      var aliasValue = sto('combat_arc_' + owner) || [];
      if(Array.isArray(aliasValue) && aliasValue.length){
        merged = _mergeCombatArchiveLists(merged, aliasValue);
      }
    }
  });
  if(!hasLegacy && owners.length < 2) return Promise.resolve(false);
  if(!_combatArchiveListsEqual(sto('combat_arc_' + primaryOwner) || [], merged)){
    _dbCache['combat_arc_' + primaryOwner] = merged;
  }
  var writes = [_enqueueDbWrite('combat_arc_' + primaryOwner, merged).catch(function(){ return null; })];
  owners.slice(1).forEach(function(owner){
    delete _dbCache['combat_arc_' + owner];
    writes.push(_enqueueDbWrite('combat_arc_' + owner, []).catch(function(){ return null; }));
  });
  return Promise.all(writes).then(function(){
    _LEGACY_COMBAT_ARCHIVE_BUFFER = null;
    _removeLegacyCombatArchivesFromLocalStorage();
    return true;
  }).catch(function(){ return false; });
}
function _isDbBackedKey(k){
  var key = String(k||"");
  if(!key) return false;
  if(["accounts","players","beasts","serments_custom","events","lieux","event_themes","theme_visibility","np_syslog","spawn_lab_staff"].indexOf(key)>=0) return true;
  return key.indexOf("combat_arc_")===0 || key.indexOf("combat_arc_idx_")===0 || key.indexOf("combat_arc_rec_")===0;
}
function _cloneForDb(value){
  try{ return JSON.parse(JSON.stringify(value)); }catch(e){ return value; }
}
function _enqueueDbWrite(key, value){
  var snapshot = _normalizeDbValueForKey(key, _cloneForDb(value));
  var prev = _DB_WRITE_QUEUE[key] || Promise.resolve();
  _DB_WRITE_QUEUE[key] = prev.catch(function(){}).then(function(){
    return _dbCall({ action:"set", key:key, value:snapshot }, { silent:true }).then(function(resp){
      if(!resp || resp.ok===false) throw new Error((resp&&resp.error)||"save_failed");
      _reportDbWriteSuccess(key);
      return resp;
    });
  }).catch(function(err){
    console.warn("sv() DB error pour '" + key + "':", err);
    _reportDbWriteError(key, err);
    throw err;
  });
  return _DB_WRITE_QUEUE[key];
}
try{ _LEGACY_COMBAT_ARCHIVE_BUFFER = _collectLegacyCombatArchivesFromLocalStorage(); }catch(e){}
// Écriture : cache RAM immédiat + persist async en DB.
// Les clés privées restent uniquement hors localStorage, mais sont bien persistées côté base si la session le permet.
function sv(k, v) {
  var normalized = _normalizeDbValueForKey(k, v);
  _dbCache[k] = normalized;
  if(_PRIVATE_KEYS.indexOf(k)===-1){
    try { localStorage.setItem("np_"+k, JSON.stringify(normalized)); } catch(e2) {}
  } else {
    try { localStorage.removeItem("np_"+k); } catch(e2) {}
  }
  if(!_dbOffline && _LOCAL_ONLY_KEYS.indexOf(k)===-1 && _dbToken && _isDbBackedKey(k)){
    return _enqueueDbWrite(k, normalized);
  }
  return Promise.resolve({ ok:true, skipped:true });
}
function gp(){ var v = sto("players")||[]; return Array.isArray(v) ? v : []; }
function sp(p){sv("players",p);}
function gb(){
  var v = sto("beasts")||[];
  return _normalizeListById(Array.isArray(v) ? v : [], 'b_', _normalizeBeastRecord);
}
function sb(b){sv("beasts", _normalizeListById(Array.isArray(b) ? b : [], 'b_', _normalizeBeastRecord));}
function getBeastById(id){
  id = String(id || '');
  return gb().find(function(b){ return String(b && b.id || '') === id; }) || null;
}
function getBeastCatalogEntry(idOrBeast){
  var beast = (idOrBeast && typeof idOrBeast === 'object') ? _normalizeBeastRecord(idOrBeast, 0) : getBeastById(idOrBeast);
  return beast ? _npClone(beast.catalog || _normalizeBeastRecord(beast, 0).catalog) : null;
}
// Serments custom (stock_s, fusionn_s avec SD au runtime)
function gsd(){return sto("serments_custom")||{};}
function ssd(s){sv("serments_custom",s);}
// Retourne SD fusionn_ avec les serments custom
function getAllSD(){
  var all={};
  Object.keys(SD).forEach(function(k){all[k]=SD[k];});
  var custom=gsd();
  Object.keys(custom).forEach(function(k){all[k]=custom[k];});
  return all;
}
function gpid(id){return gp().find(function(p){return p.id===id;});}
function up(p){var ps=gp();var i=ps.findIndex(function(x){return x.id===p.id;});if(i>=0){ps[i]=p;sp(ps);}}

function getThemeActorPlayer(){
  try{
    if(CU && CU.pid) return gpid(CU.pid) || null;
    var account = getCurrentAccount();
    if(account && account.pid){
      if(CU && !CU.pid) CU.pid = account.pid;
      return gpid(account.pid) || null;
    }
    return null;
  }catch(e){ return null; }
}
function getPreferredThemeForCurrentUser(){
  try{
    var account = getCurrentAccount();
    var accountTheme = normalizeThemeId(account && account.selectedTheme ? account.selectedTheme : '');
    var saved = normalizeThemeId(localStorage.getItem('np_theme') || '');
    var hasSaved = !!saved;
    var accountIsDefault = !accountTheme || accountTheme === 'dark';
    var candidate = (hasSaved && accountIsDefault) ? saved : (accountTheme || saved || 'dark');
    if(candidate !== 'dark' && candidate !== 'light'){
      var actor = getThemeActorPlayer();
      if(!canUseTheme(actor, candidate)) candidate = saved || accountTheme || 'dark';
    }
    if(candidate !== 'dark' && candidate !== 'light'){
      var actor2 = getThemeActorPlayer();
      if(!canUseTheme(actor2, candidate)) candidate = 'dark';
    }
    return candidate || 'dark';
  }catch(e){ return normalizeThemeId(localStorage.getItem('np_theme') || 'dark') || 'dark'; }
}

function persistSelectedTheme(themeId){
  var id = normalizeThemeId(themeId || 'dark') || 'dark';
  try{ localStorage.setItem('np_theme', id); }catch(e){}
  try{
    var account = getCurrentAccount();
    if(account) account.selectedTheme = id;
    if(CU) CU.selectedTheme = id;
    var actor = getThemeActorPlayer();
    if(actor) actor.selectedTheme = id;
  }catch(e){}
  if(typeof _authCall !== 'function' || !CU) return Promise.resolve({ ok:true, localOnly:true, themeId:id });
  return _authCall({ action:'self_set_theme', themeId:id }).then(function(r){
    if(r && r.ok){
      try{
        var account = getCurrentAccount();
        if(account) account.selectedTheme = id;
        if(CU) CU.selectedTheme = id;
        var actor = getThemeActorPlayer();
        if(actor) actor.selectedTheme = id;
      }catch(e){}
      return r;
    }
    throw new Error((r && r.error) || 'Sauvegarde du thème impossible');
  }).catch(function(err){
    console.warn('persistSelectedTheme failed', err && err.message ? err.message : err);
    return { ok:false, error: err && err.message ? err.message : String(err||'Erreur') };
  });
}

function getViewPid(){
  return (CU&&CU.role!=="joueur"&&_viewPid)?_viewPid:(CU?CU.pid:null);
}
function pct(a,b){return b>0?Math.round(Math.max(0,Math.min(100,(a/b)*100)))+"%":"0%";}
function fdt(ts){var d=new Date(ts);return d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"})+" "+d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});}
function notif(msg,t){var n=ge("notif");n.textContent=msg;n.className="notif show "+t;setTimeout(function(){n.className="notif";},3200);}
function _ensureGlobalModalRoot(){
  var host=ge('modal-root');
  if(host) return host;
  host=document.createElement('div');
  host.id='modal-root';
  document.body.appendChild(host);
  return host;
}
function _hoistModalToRoot(el){
  if(!el) return null;
  var host=_ensureGlobalModalRoot();
  if(el.parentNode!==host) host.appendChild(el);
  return el;
}
function openModal(id){
  // Guard: modales privées inaccessibles sans auth
  var PUBLIC_MODALS=["m-drop"];
  if(PUBLIC_MODALS.indexOf(id)<0 && !CU){ return; }
  var el=ge(id);
  if(!el) return;
  el=_hoistModalToRoot(el) || el;
  try{
    el.style.zIndex='12040';
    var md=el.querySelector('.modal');
    if(md) md.style.zIndex='12041';
    document.body.classList.add('modal-open');
  }catch(_e){}
  el.classList.add("open");
}
function closeModal(id){var el=ge(id);if(el){el.classList.remove("open");try{el.style.zIndex='';var md=el.querySelector('.modal');if(md) md.style.zIndex='';}catch(_e){}}if(!document.querySelector('.moverlay.open')){try{document.body.classList.remove('modal-open');}catch(_e){}}}
function gc(name){if(name.indexOf("Blanche")>-1)return"gb";if(name.indexOf("Incarnate")>-1)return"gi";if(name.indexOf("carlate")>-1)return"ge";return"";}

function _primeGlobalUiLayers(){
  try{ _ensureGlobalModalRoot(); }catch(_e){}
  try{ _ensureTabPopupBackdrop(); }catch(_e){}
}

function initStorage(){
  // Corriger la faute "am_ricain" dans les données en cache
  var rawPlayers=localStorage.getItem("np_players");
  if(rawPlayers&&rawPlayers.indexOf("am_ricain")>-1){
    localStorage.setItem("np_players",rawPlayers.split("am_ricain").join("am\u00e9ricain"));
  }
  // Validation JSON : supprimer les entrées corrompues pour éviter de bloquer le login
  // Les clés privées ne doivent plus survivre en localStorage.
  ["players","accounts"].forEach(function(k){ try{ localStorage.removeItem("np_"+k); }catch(e){} });
  ["beasts","serments_custom"].forEach(function(k){
    var raw=localStorage.getItem("np_"+k);
    if(raw){
      try{ JSON.parse(raw); }
      catch(e){
        console.warn("initStorage: données corrompues pour",k,"— suppression");
        localStorage.removeItem("np_"+k);
        if(_dbCache) delete _dbCache[k];
      }
    }
  });

  // Joueurs (personnages)
  var players=sto("players");
  if(!players){
    // Aucun joueur en DB — initialiser un tableau vide
    sv("players",[]);
  } else {
    // Migration douce : assurer que chaque joueur a les champs requis
    var changed=false;
    players.forEach(function(p){
      if(!p.equipment){p.equipment={helmet:null,chest:null,legs:null};changed=true;}
      if(!p.inventory){p.inventory=[];changed=true;}
      if(!p.history){p.history=[];changed=true;}
    });
    if(changed) sp(players);
  }

  // === MIGRATION VERS SYSTÈME UNIFIÉ ===
  // Tout passe dans np_accounts. Les anciens np_mjs sont migrés.
  var accounts=sto("accounts")||[];
  var mjs=sto("mjs");
  var migrated=false;

  // Migration historique depuis np_mjs : uniquement si la DB a déjà fourni des comptes.
  // Ne jamais créer de compte admin par défaut côté client.
  var hasAdmin=accounts.find(function(a){return a.role==="admin";});
  if(!hasAdmin){
    if(mjs&&mjs.length&&accounts.length){
      mjs.forEach(function(m){
        if(!accounts.find(function(a){return a.pseudo.toLowerCase()===(m.name||"").toLowerCase();})){
          accounts.push({
            id:"staff_"+Date.now()+"_"+Math.random().toString(36).slice(2),
            pseudo:m.name,
            pass:m.pass,
            role:m.role||"mj",
            pid:m.pid||null,
            createdAt:Date.now()
          });
        }
      });
      migrated=true;
    }
  } else if(mjs&&mjs.length){
    // Migrer les comptes mjs non encore dans accounts
    mjs.forEach(function(m){
      if(!accounts.find(function(a){return a.pseudo.toLowerCase()===(m.name||"").toLowerCase();})){
        accounts.push({
          id:"staff_"+Date.now()+"_"+Math.random().toString(36).slice(2),
          pseudo:m.name, pass:m.pass, role:m.role||"mj", pid:m.pid||null, createdAt:Date.now()
        });
        migrated=true;
      }
    });
  }

  if(migrated){
    sv("accounts",accounts);
    // Nettoyer l'ancien storage mjs
    localStorage.removeItem("np_mjs");
  }
  if(!sto("accounts")) sv("accounts",accounts);

  // Corriger les comptes sans rôle défini (migration sécurisée)
  var allAccounts=sto("accounts")||[];
  var fixed=false;
  allAccounts.forEach(function(a,i){
    if(!a.role){
      // Heuristique : si le pseudo est "Admin" ou si c'est le seul compte, c'est admin
      if(a.pseudo==="Admin"||allAccounts.length===1) a.role="admin";
      else a.role="joueur";
      fixed=true;
    }
  });
  if(fixed) sv("accounts",allAccounts);

  // Bestiaire — aussi initialisé au boot via _initPublicData()
  _initBeasts();
}

// Init données publiques — appelé dès _dbBootstrap(), sans auth requise
var _privateShellTemplates = window._privateShellTemplates || (window._privateShellTemplates = Object.create(null));
function _capturePrivateShells(){
  try{
    document.querySelectorAll("[data-private='true']").forEach(function(el){
      if(!el || !el.id) return;
      var html = el.innerHTML || "";
      if(!_privateShellTemplates[el.id] && html.trim()) _privateShellTemplates[el.id] = html;
    });
  }catch(e){}
}
function _restorePrivateShell(elOrId){
  try{
    var el = (typeof elOrId === "string") ? ge(elOrId) : elOrId;
    if(!el || !el.id) return;
    var tpl = _privateShellTemplates[el.id] || "";
    if(!tpl) return;
    var needsRestore = el.dataset.privateCleared === "1" || !(el.innerHTML||"").trim();
    if(!needsRestore && el.id === "fiche") needsRestore = !el.querySelector("#p-av") || !el.querySelector("#p-serm-c");
    if(!needsRestore && el.id === "profil") needsRestore = !el.querySelector("#p-profil-c");
    if(needsRestore){
      el.innerHTML = tpl;
      delete el.dataset.privateCleared;
    }
  }catch(e){}
}
function _restoreAllPrivateShells(){
  try{
    document.querySelectorAll("[data-private='true']").forEach(function(el){ _restorePrivateShell(el); });
  }catch(e){}
}
function _clearPrivateShell(el){
  if(!el) return;
  if(el.id){
    var html = el.innerHTML || "";
    if(!_privateShellTemplates[el.id] && html.trim()) _privateShellTemplates[el.id] = html;
  }
  el.innerHTML = "";
  if(el.dataset) el.dataset.privateCleared = "1";
}
function _initPublicData(){
  _initBeasts();
  // Purger les données privées visibles. Le HTML source est mémorisé puis restauré après connexion.
  document.querySelectorAll("[data-private='true']").forEach(function(el){
    _clearPrivateShell(el);
  });
}
_capturePrivateShells();

function _initBeasts(){
  var bsts=sto("beasts");
  if(Array.isArray(bsts)) return;
  // Bestiaire piloté par la DB : plus d'injection de créatures codées en dur.
  sv("beasts", []);
}

// ==========================================
// STORAGE COMPTES UNIFIÉ
// ==========================================
function getAccounts(){ var v = sto("accounts")||[]; return Array.isArray(v) ? v : []; }
function saveAccounts(a){ sv("accounts",a); }
function getAccountByPseudo(pseudo){
  return getAccounts().find(function(a){ return a.pseudo.toLowerCase()===pseudo.toLowerCase(); });
}
function getAccountById(accountId){
  return getAccounts().find(function(a){ return String(a.id||'') === String(accountId||''); });
}
function getAccountByPid(pid){
  return getAccounts().find(function(a){ return !!a && String(a.pid||'') === String(pid||''); });
}
function getCurrentAccount(){
  try{
    if(!CU) return null;
    if(CU.accountId){
      var byId = getAccountById(CU.accountId);
      if(byId) return byId;
    }
    if(CU.pseudo){
      var byPseudo = getAccountByPseudo(CU.pseudo);
      if(byPseudo) return byPseudo;
    }
    if(CU.name){
      var byName = getAccountByPseudo(CU.name);
      if(byName) return byName;
    }
    if(CU.pid){
      var byPid = getAccountByPid(CU.pid);
      if(byPid) return byPid;
    }
    return null;
  }catch(e){ return null; }
}
// Rétrocompatibilité — gm/sm lisent depuis accounts (rôles staff)
function gm(){ return getAccounts().filter(function(a){return a.role!=="joueur";}); }
function sm(mjs){
  // sm() n'est plus utilisé directement — les modifs passent par saveAccounts
  // Conservé pour compatibilité mais opération no-op si appelé de l'extérieur
}
// Système de permissions
function can(action){
  if(!CU) return false;
  var role=roleKey(CU);
  if(role==="joueur") return false;
  var perms={
    admin:   ["manage_players","manage_mjs","manage_beasts","manage_items","manage_xp","manage_stats","adjust_levels","delete_player","delete_beast"],
    mj:      ["manage_items","manage_xp","manage_players"],
    designer:["manage_beasts","delete_beast"]
  };
  return (perms[role]||[]).indexOf(action)>-1;
}

// ==========================================
// STATE
// ==========================================
var CU=null;
var _viewPid=null; // fiche affichée (peut différer de CU.pid pour les admins)
var ePid=null,aiPid=null,riPid=null;
var _selGem=null,_gemQty=1,_progPid=null;

// ==========================================
// NAVIGATION _CRANS
// ==========================================
function _focusOnScreen(target, behavior){
  var el = (typeof target === 'string') ? ge(target) : target;
  var top = 0;
  try{
    if(el && el.getBoundingClientRect){
      var rect = el.getBoundingClientRect();
      top = Math.max(0, rect.top + (window.pageYOffset || document.documentElement.scrollTop || 0) - 72);
    }
    window.scrollTo({ top: top, left: 0, behavior: behavior || 'smooth' });
  }catch(e){
    try{ window.scrollTo(0, top); }catch(_e){}
  }
}

function showScreen(id){
  // Guard structurel : s-app inaccessible sans session valide
  if(id==="s-app" && !CU){ id="s-home"; }
  // Vider les contenus privés si pas d'auth. Le shell complet sera restauré après connexion.
  if(!CU){
    document.querySelectorAll("[data-private='true']").forEach(function(el){
      _clearPrivateShell(el);
    });
  } else {
    _restoreAllPrivateShells();
  }
  document.querySelectorAll(".screen").forEach(function(s){
    s.classList.remove("active","screen-enter");
  });
  var el=ge(id);
  el.classList.add("active");
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      el.classList.add("screen-enter");
    });
  });
  if(id==="s-hrp"){
    var c=ge("hrp-content");
    if(c) renderRegles("hrp-content");
  }
  if(id==="s-home") initHomePage();
  if(id==="s-login"){
    // Pré-cocher si une session est sauvegardée
    var cb=ge("login-remember");
    if(cb){
      try{ cb.checked=!!localStorage.getItem("np_session_flag"); }catch(e){}
    }
  }
  setTimeout(function(){ _focusOnScreen(el || ge(id), 'auto'); }, 10);
}

var _homeInterval=null;

function _countKilledCreaturesFromArchives(arcs){
  return (Array.isArray(arcs)?arcs:[]).reduce(function(total, arc){
    if(!arc || typeof arc !== 'object') return total;
    if(arc._draft || arc._inProgress || arc.active) return total;
    if(String(arc.phase||'idle') !== 'idle') return total;
    var fighters = Array.isArray(arc.fighters) ? arc.fighters : [];
    return total + fighters.filter(function(f){
      return f && f.type === 'beast' && (Number(f.pvCur)||0) <= 0;
    }).length;
  }, 0);
}

function updateHomeCounters(){
  var hfJ=ge("hf-joueurs");
  var hfS=ge("hf-serments");
  var hfC=ge("hf-creatures");
  var hfA=ge("hf-actifs");
  var hfG=ge("hf-gemmes");
  if(!hfJ||!hfS||!hfC) return;

  var publicStats = (_dbCache && _dbCache.public_stats) ? _dbCache.public_stats : {};

  // Données privées visibles seulement si authentifié.
  // Pour l'accueil public, on affiche les agrégats publics calculés côté serveur.
  var accounts=CU ? (getAccounts()||[]) : null;
  var players=CU ? (gp()||[]) : null;

  var joueurs="—";
  if(CU){
    var playersCount=(players||[]).length;
    joueurs=playersCount;
  } else if(publicStats && typeof publicStats.players !== "undefined"){
    joueurs=publicStats.players;
  } else if(publicStats && typeof publicStats.linkedPlayers !== "undefined"){
    joueurs=publicStats.linkedPlayers;
  }

  var serments=Object.keys(getAllSD()||{}).length;

  var creatures="—";
  if(publicStats && typeof publicStats.creatureKills !== "undefined") {
    creatures=publicStats.creatureKills;
  } else if(CU && typeof getAllCombatArchives === 'function' && typeof can === 'function' && can("manage_mjs")) {
    creatures=_countKilledCreaturesFromArchives(getAllCombatArchives());
  } else if(typeof getCombatArchives === 'function') {
    creatures=_countKilledCreaturesFromArchives(getCombatArchives());
  }

  var actifs="—";
  if(CU){
    var semaine=Date.now()-7*24*60*60*1000;
    actifs=(accounts||[]).filter(function(a){
      return a && a.lastSeen && a.lastSeen>semaine;
    }).length;
  } else if(publicStats && typeof publicStats.activeWeek !== "undefined"){
    actifs=publicStats.activeWeek;
  }

  var totalGemmes="—";
  if(CU){
    var gemmesStock=(players||[]).reduce(function(acc,p){
      return acc + (p.inventory||[])
        .filter(function(i){ return i && i.category==="Gemme"; })
        .reduce(function(s,i){ return s + (Number(i.qty)||1); },0);
    },0);
    var gemmesFusionnees=(players||[]).reduce(function(acc,p){
      return acc + (p.history||[]).filter(function(h){ return h && h.type==="gemme"; }).length;
    },0);
    totalGemmes=Math.max(gemmesStock, gemmesFusionnees, 0);
  } else if(publicStats && typeof publicStats.totalGemmes !== "undefined"){
    totalGemmes=publicStats.totalGemmes;
  }

  function animUpdate(el,val){
    if(!el) return;
    var next=String(val);
    var cur=String(el.textContent||"");
    if(cur!==next){
      el.style.transition="opacity .2s";
      el.style.opacity="0";
      setTimeout(function(){el.textContent=next;el.style.opacity="1";},200);
    }
  }
  animUpdate(hfJ,joueurs);
  animUpdate(hfS,serments);
  animUpdate(hfC,creatures);
  animUpdate(hfA,actifs);
  animUpdate(hfG,totalGemmes);
}

function initHomePage(){
  // Stats initiales
  updateHomeCounters();
  if(!CU){
    var missingPublicStats = !_dbCache || !_dbCache.public_stats || (typeof _dbCache.public_stats !== 'object');
    var unresolved = [ge('hf-joueurs'), ge('hf-actifs'), ge('hf-gemmes')].some(function(el){ return el && String(el.textContent||'').trim() === '—'; });
    if((missingPublicStats || unresolved) && typeof _loadPublicBundle === 'function'){
      _loadPublicBundle().then(function(){
        try{ updateHomeCounters(); }catch(_e){}
      }).catch(function(err){
        console.warn('home public bundle fallback failed', err && err.message ? err.message : err);
      });
    }
  }
  // Particules home
  var container=ge("home-particles");
  if(container&&container.children.length===0){
    for(var i=0;i<35;i++){
      var p=document.createElement("div");
      p.className="home-particle";
      p.style.left=Math.random()*100+"%";
      p.style.width=p.style.height=(Math.random()<0.3?2:1)+"px";
      p.style.animationDuration=(12+Math.random()*20)+"s";
      p.style.animationDelay=(-Math.random()*20)+"s";
      container.appendChild(p);
    }
  }
  // Particules login canvas
  initLoginParticles();
  // Polling toutes les 5s tant qu'on est sur la home
  if(_homeInterval) clearInterval(_homeInterval);
  _homeInterval=setInterval(function(){
    if(!ge("s-home")||!ge("s-home").classList.contains("active")){
      clearInterval(_homeInterval); _homeInterval=null; return;
    }
    updateHomeCounters();
  },5000);
}

// ==========================================
// INSCRIPTION
// ==========================================
function register(){
  var pseudo=ge("reg-pseudo").value.trim();
  var pass=ge("reg-pass").value;
  var pass2=ge("reg-pass2").value;
  var errEl=ge("err-reg");
  function failRegister(msg){
    errEl.textContent=msg||"Erreur lors de l'inscription.";
    if(btn) btn.disabled=false;
  }
  if(!pseudo||!pass){ errEl.textContent="Remplis tous les champs."; return; }
  if(pass!==pass2){ errEl.textContent="Les mots de passe ne correspondent pas."; return; }
  if(pseudo.length<2){ errEl.textContent="Pseudo trop court."; return; }
  if(pass.length<4){ errEl.textContent="Mot de passe trop court (4 caractères min)."; return; }

  // Validation format pseudo — caractères autorisés
  if(!/^[a-zA-ZÀ-ÿ0-9_ -]{2,32}$/.test(pseudo)){
    errEl.textContent="Pseudo invalide (2-32 caractères, lettres/chiffres/espaces/tirets)."; return;
  }

  var btn=ge("reg-btn"); if(btn) btn.disabled=true;
  errEl.textContent="";

  // Tout passe par le serveur — plus d'écriture directe en DB côté front
  hashPass(pass).then(function(h){
    _authCall({action:"register", pseudo:pseudo, passHash:h}).then(function(r){
      if(!r||!r.ok){
        npHandleServiceIssue(r, "Inscription");
        var msg = npFriendlyApiError(r, "Inscription");
        if(r&&r.status) msg += " (HTTP "+r.status+")";
        failRegister(msg);
        return;
      }
      // Cookie posé par le serveur — recharger les données
      _dbToken=true;
      ge("reg-pseudo").value=""; ge("reg-pass").value=""; ge("reg-pass2").value="";
      // Recharger le cache depuis la DB (le cookie est maintenant valide)
      _loadSessionBundle().then(function(bundle){
        var role=bundle.role||"joueur", pid=bundle.pid||null, name=bundle.name||pseudo;
        if(role==="joueur"){
          var p=pid?gpid(pid):null;
          CU=p?{type:"player",role:"joueur",pid:pid,name:p.name,pseudo:pseudo}:{type:"player",role:"joueur",pid:null,name:name,pseudo:pseudo,pending:!pid};
        } else {
          CU={type:"staff",role:role,pid:pid||(gp()[0]?gp()[0].id:null),name:name,pseudo:pseudo};
        }
        launchApp();
      }).catch(function(){
        CU={type:"player",role:"joueur",pid:null,name:pseudo,pseudo:pseudo,pending:true};
        launchApp();
      });
    }).catch(function(e){
      var r = { status:0, error:e && e.message ? e.message : String(e) };
      npHandleServiceIssue(r, "Inscription");
      failRegister(npFriendlyApiError(r, "Inscription"));
    });
  }).catch(function(){
    failRegister("Erreur interne de hachage du mot de passe.");
  });
}

// ==========================================
// LOGIN
// ==========================================
function switchLTab(t){} // conservé pour compatibilité

// Session UX locale — simple flag sans données sensibles
// La vraie auth est dans le cookie httpOnly géré par le serveur
function _saveSession(account){
  try{ localStorage.setItem("np_session_flag","1"); }catch(e){}
}
function _clearSession(){
  try{ localStorage.removeItem("np_session_flag"); localStorage.removeItem("np_session"); }catch(e){}
}
// _tryAutoLogin — vérifie le cookie httpOnly via le serveur
// Retourne une Promise<bool>
async function _tryAutoLogin(){
  try{
    // Appel au serveur avec credentials — le cookie httpOnly est envoyé automatiquement
    // Utiliser _authCall pour avoir la gestion d'erreur centralisée
    var data = await _loadSessionBundle();
    if(!data||!data.ok) return false;

    if(data.forcePasswordReset){ _resetAccountId="self"; showScreen("s-reset"); return true; }

    // Cookie valide — reconstruire CU depuis les données en cache
    var role = data.role || "joueur";
    var pid  = data.pid  || null;
    _dbToken = true; // flag : authentifié

var accounts = getAccounts();

    if(role==="joueur"){
      if(!pid){
        CU={type:"player",role:"joueur",pid:null,name:data.name||"Joueur",pseudo:data.name||"Joueur",pending:true};
      } else {
        var p=gpid(pid);
        if(!p){
          CU={type:"player",role:"joueur",pid:null,name:data.name||"Joueur",pseudo:data.name||"Joueur",pending:true};
        } else {
          CU={type:"player",role:"joueur",pid:pid,name:p.name,pseudo:data.name||p.name};
        }
      }
    } else {
      var staffPid=pid||(gp()[0]?gp()[0].id:null);
      CU={type:"staff",role:role,pid:staffPid,name:data.name||"Staff"};
    }

    // Mettre à jour lastSeen si compte trouvable
    var account=accounts.find(function(a){ return a.pseudo===(data.name||""); });
    if(account) _trackLastSeen(account.id);

    return true;
  }catch(e){
    // Erreur réseau ou serveur — pas d'auth possible hors-ligne
    console.warn("_tryAutoLogin: serveur inaccessible", e.message||e);
    // Purger le cache privé pour éviter un état incohérent
    _dbCache = Object.create(null);
    ["accounts","players"].forEach(function(k){
      try{ localStorage.removeItem("np_"+k); }catch(e2){}
    });
    return false;
  }
}

function loginUnified(){
  var id=ge("login-id").value.trim();
  var pass=ge("login-pass").value;
  var errEl=ge("err-login");
  if(!id){ errEl.textContent="Entre ton pseudo."; return; }
  errEl.textContent="";

  // Le login va directement au serveur — pas de lecture du cache local avant auth
  if(!pass){ errEl.textContent="Entre ton mot de passe."; ge("login-pass").focus(); return; }

  // Obtenir le cookie httpOnly via le serveur — vérification et migration PBKDF2 côté serveur
  hashPass(pass).then(function(h){
    // Validation format sha256 avant envoi
    if(!h||h.indexOf("sha256:")!==0||h.length<71){
      errEl.textContent="Erreur interne de hachage."; return;
    }
    _authCall({action:"login", pseudo:id, passHash:h}).then(function(serverResp){
      if(!serverResp||!serverResp.ok){
        // Utiliser le message du serveur (rate limit, compte inexistant, etc.)
        npHandleServiceIssue(serverResp, "Connexion");
        var msg = npFriendlyApiError(serverResp, "Connexion");
        if(serverResp && serverResp.status === 401) msg = "Identifiant ou mot de passe incorrect.";
        errEl.textContent=msg;
        ge("login-pass").value=""; ge("login-pass").focus();
        return;
      }
      // Cookie httpOnly posé par le serveur
      _dbToken=true;
      // Continuer le flow de connexion avec les données du serveur
      _finishLogin(serverResp, id);
    }).catch(function(e){
      // Erreur réseau pure (serveur injoignable)
      var r = { status:0, error:e && e.message ? e.message : String(e) };
      npHandleServiceIssue(r, "Connexion");
      errEl.textContent=npFriendlyApiError(r, "Connexion");
      ge("login-pass").value=""; ge("login-pass").focus();
    });
  });
}

function _finishLogin(serverResp, id){
  // serverResp contient: ok, role, pid, name depuis le serveur
  var role = serverResp.role || "joueur";
  var pid  = serverResp.pid  || null;
  var name = serverResp.name || id;

  var remember=ge("login-remember");
  if(remember&&remember.checked) _saveSession({pseudo:name});
  else _clearSession();

  if(serverResp && serverResp.forcePasswordReset){ _resetAccountId="self"; showScreen("s-reset"); ge("login-pass").value=""; return; }

  // Recharger les données privées filtrées via l'endpoint dédié
  _loadSessionBundle().then(function(bundle){
    if(bundle&&bundle.data){
      if(bundle.data.accounts!==undefined) _dbCache.accounts=bundle.data.accounts;
      if(bundle.data.players!==undefined) _dbCache.players=bundle.data.players;
    }

    // Construire CU depuis les données serveur + bundle rechargé
    if(role==="joueur"){
      if(!pid){
        CU={type:"player",role:"joueur",pid:null,name:name,pseudo:id,pending:true};
      } else {
        var p=gpid(pid);
        CU=p
          ?{type:"player",role:"joueur",pid:pid,name:p.name,pseudo:id}
          :{type:"player",role:"joueur",pid:null,name:name,pseudo:id,pending:true};
      }
    } else {
      var staffPid=pid||(gp()[0]?gp()[0].id:null);
      CU={type:"staff",role:role,pid:staffPid,name:name,pseudo:id};
    }

    var account=getAccountByPseudo(id);
    if(account) _trackLastSeen(account.id);
    sysLog("connexion","Connexion au Compagnon",name);
    _playLoginTransition(function(){ launchApp(); });
  }).catch(function(){
    // DB inaccessible après login — construire CU depuis serverResp seulement
    if(role==="joueur"){
      CU={type:"player",role:"joueur",pid:pid||null,name:name,pseudo:id,pending:!pid};
    } else {
      CU={type:"staff",role:role,pid:pid||null,name:name,pseudo:id};
    }
    _playLoginTransition(function(){ launchApp(); });
  });
}

function _playLoginTransition(callback){
  var overlay=ge("login-transition-overlay");
  var logo=ge("lto-logo");
  var flash=ge("lto-flash");
  if(!overlay||!logo||!flash){ callback(); return; }
  updateLaunchTheme();

  overlay.classList.add("active");
  logo.style.transform="translateX(0) scale(1) rotate(0deg)";
  logo.style.transition="none";
  flash.style.opacity="0";
  flash.style.transition="none";
  flash._ltoTriggered=false;

  var W=window.innerWidth;
  var spinStart=null;
  var SPIN_DUR=900;   // accélération + grossissement
  var SHOOT_DUR=280;  // phase filer vers droite
  var shootStart=null;
  var finalDeg=0;
  var finalScale=1;

  // Phase 1 — accélération progressive + scale croissant
  function spinLoop(ts){
    if(!spinStart) spinStart=ts;
    var elapsed=ts-spinStart;
    var p=Math.min(elapsed/SPIN_DUR,1);
    // ease-in : accélère de plus en plus vite
    var ease=p*p*p;
    var deg=ease*720; // jusqu'à 720° (2 tours)
    var scale=1+ease*1.4; // grossit jusqu'à 2.4x
    logo.style.transform="translateX(0) scale("+scale+") rotate("+deg+"deg)";
    finalDeg=deg; finalScale=scale;
    if(p<1){ requestAnimationFrame(spinLoop); }
    else{ shootStart=null; requestAnimationFrame(shootLoop); }
  }

  // Phase 2 — file vers la droite en continuant à grossir
  function shootLoop(ts){
    if(!shootStart) shootStart=ts;
    var elapsed=ts-shootStart;
    var p=Math.min(elapsed/SHOOT_DUR,1);
    // ease-out pour le déplacement (décélère légèrement avant disparition)
    var easeMove=1-Math.pow(1-p,2);
    var dist=(W/2+300)*easeMove; // part du centre, file au-delà du bord droit
    var scale=finalScale+p*3;   // continue de grossir
    var deg=finalDeg+p*180;
    logo.style.transform="translateX("+dist+"px) scale("+scale+") rotate("+deg+"deg)";

    // Flash glacier à mi-chemin
    if(p>0.5&&!flash._ltoTriggered){
      flash._ltoTriggered=true;
      flash.style.transition="opacity 0.18s ease-out";
      flash.style.opacity="1";
      setTimeout(function(){
        overlay.classList.remove("active");
        logo.style.transform="translateX(0) scale(1) rotate(0deg)";
        flash._ltoTriggered=false;
        callback();
        setTimeout(function(){
          flash.style.transition="opacity 0.5s ease-in";
          flash.style.opacity="0";
        },60);
      },180);
    }
    if(p<1) requestAnimationFrame(shootLoop);
  }

  requestAnimationFrame(spinLoop);
}

function _trackLastSeen(accountId){
  _authCall({action:"touch_last_seen"}).catch(function(e){ console.warn("touch_last_seen failed", e&&e.message?e.message:e); });
}



function loginPlayer(){ loginUnified(); }
function loginStaff(){ loginUnified(); }


var ROLE_LABELS={joueur:"Joueur",admin:"Admin",mj:"MJ",designer:"Designer"};
function updateHdrProfile(){
  // Avatar
  var av=ge("hdr-av"); var avTxt=ge("hdr-av-txt");
  var p=CU.pid?gpid(CU.pid):null;
  if(av){
    if(p&&p.avatar){
      av.innerHTML='<img src="'+p.avatar+'" alt="" onerror="this.outerHTML=\'<span class=hdr-av-txt>'+((p?p.name[0]:CU.name[0])||"?")+'</span>\'">';
    } else {
      av.innerHTML='<span class="hdr-av-txt">'+(p?p.name[0]:CU.name[0]).toUpperCase()+'</span>';
    }
  }
  // Nom affiché
  var userEl=ge("hdr-user");
  if(userEl) userEl.textContent=p?esc(p.name):esc(CU.name);
  // Badge rôle
  var badgeEl=ge("hdr-badge");
  if(badgeEl){
    if(CU.type==="staff"){
      var hdrRole=roleKey(CU);
      var lbl=ROLE_LABELS[hdrRole]||"Staff";
      badgeEl.textContent=lbl;
      var roleCol={admin:"var(--red)",mj:"var(--gold)",designer:"var(--purple)"}[hdrRole]||"var(--dim)";
      badgeEl.style.borderColor=roleCol;
      badgeEl.style.color=roleCol;
    } else if(CU.pending){
      badgeEl.textContent="En attente";
      badgeEl.style.borderColor="var(--gold)";
      badgeEl.style.color="var(--gold)";
    } else {
      badgeEl.textContent="Joueur";
      badgeEl.style.borderColor="";
      badgeEl.style.color="";
    }
  }
}

// ==========================================
// AVATAR / IMAGE CROPPER
// ==========================================
var _cropImg=null,_cropX=0,_cropY=0,_cropScale=1,_cropDragging=false,_cropDX=0,_cropDY=0,_cropSize=0;
var _cropTargetPid=null, _cropBeastId=null, _cropDraftInputId=null, _cropDraftPreviewId=null;
var _cropNaturalW=0,_cropNaturalH=0,_cropMinScale=0.5,_cropMaxScale=4,_cropSourceLabel="",_cropSourceBytes=0,_cropLoadedUrl="";
var _cropRecentsKey="np_recent_crop_images";

function _cropBytesLabel(bytes){
  bytes=Number(bytes||0);
  if(!bytes) return "";
  if(bytes>=1024*1024) return (Math.round((bytes/(1024*1024))*10)/10)+" Mo";
  if(bytes>=1024) return Math.round(bytes/1024)+" Ko";
  return bytes+" o";
}
function _cropSetText(id,txt){
  var el=ge(id); if(el) el.textContent=txt||"";
}
function _cropGetZoomInput(){ return ge("crop-zoom"); }
function _cropSyncZoomUi(){
  var input=_cropGetZoomInput();
  if(!input) return;
  var val=parseFloat(input.value)||1;
  var lbl=ge("crop-zoom-val");
  if(lbl) lbl.textContent=Math.round(val*100)+"%";
}
function _cropClampPosition(){
  if(!_cropImg) return;
  var w=_cropImg.width*_cropScale, h=_cropImg.height*_cropScale;
  if(w<=_cropSize) _cropX=(_cropSize-w)/2;
  else _cropX=Math.min(0,Math.max(_cropSize-w,_cropX));
  if(h<=_cropSize) _cropY=(_cropSize-h)/2;
  else _cropY=Math.min(0,Math.max(_cropSize-h,_cropY));
}
function _cropPlaceholderCanvas(canvas,label){
  if(!canvas) return;
  var ctx=canvas.getContext("2d");
  var w=canvas.width||320,h=canvas.height||320;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle="rgba(255,255,255,0.03)";
  ctx.fillRect(0,0,w,h);
  ctx.strokeStyle="rgba(126,184,212,0.18)";
  ctx.strokeRect(0.5,0.5,w-1,h-1);
  ctx.fillStyle="rgba(255,255,255,0.35)";
  ctx.font="12px sans-serif";
  ctx.textAlign="center";
  ctx.fillText(label||"Aucune image",w/2,h/2);
}
function _cropRenderPreview(){
  var preview=ge("crop-preview-canvas");
  if(!preview) return;
  if(!_cropImg){ _cropPlaceholderCanvas(preview,"Aucune image"); return; }
  var ctx=preview.getContext("2d");
  var size=preview.width||320;
  ctx.clearRect(0,0,size,size);
  ctx.imageSmoothingEnabled=true;
  try{ ctx.imageSmoothingQuality="high"; }catch(e){}
  var ratio=size/(_cropSize||size);
  ctx.drawImage(_cropImg,_cropX*ratio,_cropY*ratio,_cropImg.width*_cropScale*ratio,_cropImg.height*_cropScale*ratio);
}
function _cropUpdateUi(){
  _cropSyncZoomUi();
  _cropRenderPreview();
  if(!_cropImg){
    _cropSetText("crop-meta","Aucune image chargée.");
    _cropSetText("crop-export-line","Export automatique optimisé pour la base.");
    return;
  }
  var meta=_cropNaturalW+"×"+_cropNaturalH+" px";
  if(_cropSourceLabel) meta+=" · "+_cropSourceLabel;
  if(_cropSourceBytes) meta+=" · "+_cropBytesLabel(_cropSourceBytes);
  _cropSetText("crop-meta",meta);
  _cropSetText("crop-export-line","Sortie carrée optimisée automatiquement (WebP/JPEG) pour un stockage plus léger.");
}
function _cropGetRecentImages(){
  try{
    var raw=localStorage.getItem(_cropRecentsKey)||"[]";
    var arr=JSON.parse(raw);
    if(!Array.isArray(arr)) return [];
    return arr.filter(function(v){return /^data:image\//i.test(String(v||""));}).slice(0,8);
  }catch(e){ return []; }
}
function _cropStoreRecentImage(dataUrl){
  if(!/^data:image\//i.test(String(dataUrl||""))) return;
  try{
    var arr=_cropGetRecentImages().filter(function(v){return v!==dataUrl;});
    arr.unshift(dataUrl);
    arr=arr.slice(0,8);
    localStorage.setItem(_cropRecentsKey,JSON.stringify(arr));
  }catch(e){}
  _renderCropRecentImages();
}
function _renderCropRecentImages(){
  var host=ge("crop-recents");
  if(!host) return;
  var arr=_cropGetRecentImages();
  if(!arr.length){
    host.innerHTML='<div class="crop-recents-empty">Aucune image récente sur cet appareil.</div>';
    return;
  }
  host.innerHTML=arr.map(function(src,i){
    return '<button type="button" class="crop-recent-btn" onclick="cropUseRecentImage('+i+')"><img src="'+src+'" alt="Image récente '+(i+1)+'"></button>';
  }).join("");
}
function cropUseRecentImage(i){
  var arr=_cropGetRecentImages();
  if(!arr[i]) return;
  if(ge("crop-url")) ge("crop-url").value="";
  _cropSourceLabel="Image récente";
  _cropSourceBytes=0;
  cropLoadImg(arr[i]);
}
function cropClearRecentImages(){
  try{ localStorage.removeItem(_cropRecentsKey); }catch(e){}
  _renderCropRecentImages();
  notif("Historique d'images locales vidé.","ok");
}
function _resetCropState(){
  _cropX=0;_cropY=0;_cropScale=1;_cropImg=null;_cropDragging=false;_cropDX=0;_cropDY=0;
  _cropNaturalW=0;_cropNaturalH=0;_cropMinScale=0.5;_cropMaxScale=4;_cropSourceLabel="";_cropSourceBytes=0;_cropLoadedUrl="";
  if(ge("crop-url")) ge("crop-url").value="";
  if(ge("crop-file")) ge("crop-file").value="";
  if(ge("crop-err")) ge("crop-err").textContent="";
  _cropUpdateUi();
  _renderCropRecentImages();
}
function _initCropCanvas(){
  var zone=ge("crop-zone");
  if(!zone) return;
  _cropSize=zone.offsetWidth||300;
  var canvas=ge("crop-canvas");
  if(canvas){
    canvas.width=_cropSize;canvas.height=_cropSize;
  }
  var preview=ge("crop-preview-canvas");
  if(preview){
    preview.width=320;preview.height=320;
  }
  cropDraw();
}
function _bindCropEvents(){
  var zone=ge("crop-zone");
  if(!zone) return;
  zone.onmousedown=function(e){_cropDragging=true;_cropDX=e.clientX-_cropX;_cropDY=e.clientY-_cropY;e.preventDefault();};
  zone.ontouchstart=function(e){_cropDragging=true;var t=e.touches[0];_cropDX=t.clientX-_cropX;_cropDY=t.clientY-_cropY;e.preventDefault();};
  window.onmousemove=function(e){if(!_cropDragging)return;_cropX=e.clientX-_cropDX;_cropY=e.clientY-_cropDY;cropDraw();};
  window.ontouchmove=function(e){if(!_cropDragging)return;var t=e.touches[0];_cropX=t.clientX-_cropDX;_cropY=t.clientY-_cropDY;cropDraw();e.preventDefault();};
  window.onmouseup=window.ontouchend=function(){_cropDragging=false;};
  zone.onwheel=function(e){
    var input=_cropGetZoomInput();
    var z=parseFloat(input&&input.value)||_cropScale||1;
    var step=(e.deltaY>0?0.08:-0.08);
    z=Math.min(_cropMaxScale,Math.max(_cropMinScale,z-step));
    if(input) input.value=z;
    cropDraw();
    e.preventDefault();
  };
}
function _openCropModal(title){
  _resetCropState();
  if(ge("m-avatar-crop") && ge("m-avatar-crop").querySelector(".mtit")) ge("m-avatar-crop").querySelector(".mtit").textContent=title||"Recadrer l'avatar";
  openModal("m-avatar-crop");
  _initCropCanvas();
  _bindCropEvents();
  _renderCropRecentImages();
}

function openBeastImgCrop(bid){
  if(!can("manage_beasts")){notif("Non autorisé.","err");return;}
  var b=gb().find(function(x){return x.id===bid;});
  if(!b) return;
  _cropTargetPid=null;
  _cropDraftInputId=null;
  _cropDraftPreviewId=null;
  _cropBeastId=bid;
  _openCropModal("Importer / recadrer l'image — "+b.nom);
  if(ge("crop-url")) ge("crop-url").value=(b.img&&b.img.indexOf("data:")<0?b.img:"")||"";
  if(b.img){
    _cropSourceLabel="Image actuelle";
    cropLoadImg(b.img);
  }
}

function openAvatarCrop(){
  if(!CU){ return; }
  openAvatarCropFor(CU.pid);
}

function openAvatarCropFor(pid){
  if(!CU){ return; }
  if(!pid) return;
  _cropTargetPid=pid;
  _cropBeastId=null;
  _cropDraftInputId=null;
  _cropDraftPreviewId=null;
  var p=gpid(pid);
  _openCropModal("Importer / recadrer l'avatar");
  if(ge("crop-url")) ge("crop-url").value=(p&&p.avatar&&p.avatar.indexOf("data:")<0?p.avatar:"")||"";
  if(p&&p.avatar){
    _cropSourceLabel="Avatar actuel";
    cropLoadImg(p.avatar);
  }
}

function openNewPlayerAvatarCrop(){
  _cropTargetPid=null;
  _cropBeastId=null;
  _cropDraftInputId="np-av";
  _cropDraftPreviewId="np-av-preview";
  _openCropModal("Importer / recadrer l'avatar du personnage");
  var cur=ge("np-av")?String(ge("np-av").value||"").trim():"";
  if(ge("crop-url")) ge("crop-url").value=(cur&&cur.indexOf("data:")<0?cur:"")||"";
  if(cur){
    _cropSourceLabel="Aperçu brouillon";
    cropLoadImg(cur);
  }
}

function renderNewPlayerAvatarDraft(){
  var input=ge("np-av"),preview=ge("np-av-preview"),meta=ge("np-av-meta");
  if(!input||!preview) return;
  var val=String(input.value||"").trim();
  if(val){
    preview.innerHTML='<img src="'+val+'" alt="" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display=\'none\';this.parentNode.innerHTML=\'<div style=&quot;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:26px;color:var(--faint);background:var(--bg4);&quot;>✦</div>\';">';
    if(meta) meta.textContent=/^data:/i.test(val)?"Image locale optimisée, prête à être stockée en base.":"Image distante liée au personnage.";
  } else {
    preview.innerHTML='<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:26px;color:var(--faint);background:var(--bg4);">✦</div>';
    if(meta) meta.textContent="Tu peux coller une URL ou importer une image depuis l'appareil.";
  }
}

function clearNewPlayerAvatarDraft(){
  if(ge("np-av")) ge("np-av").value="";
  renderNewPlayerAvatarDraft();
}

function cropLoadLocalFile(input){
  var file=input&&input.files&&input.files[0];
  if(!file) return;
  if(!/^image\//i.test(file.type||"")){
    ge("crop-err").textContent="Le fichier sélectionné n'est pas une image.";
    input.value="";
    return;
  }
  if(file.size>10*1024*1024){
    ge("crop-err").textContent="Image trop lourde. Garde un fichier de 10 Mo max avant recadrage.";
    input.value="";
    return;
  }
  _cropSourceLabel=file.name||"Image locale";
  _cropSourceBytes=file.size||0;
  var reader=new FileReader();
  reader.onload=function(ev){
    if(ge("crop-url")) ge("crop-url").value="";
    cropLoadImg(String(ev&&ev.target&&ev.target.result||""));
  };
  reader.onerror=function(){
    ge("crop-err").textContent="Impossible de lire le fichier local.";
    input.value="";
  };
  reader.readAsDataURL(file);
}

function cropLoadImg(url){
  url=String(url||"").trim();
  if(!url){cropClear();return;}
  var img=new Image();
  if(!/^data:/i.test(url)) img.crossOrigin="anonymous";
  img.onload=function(){
    _cropImg=img;_cropLoadedUrl=url;
    _cropNaturalW=img.width||0;_cropNaturalH=img.height||0;
    var canvas=ge("crop-canvas");
    _cropSize=(canvas&&canvas.width)||((ge("crop-zone")&&ge("crop-zone").offsetWidth)||300);
    var sc=Math.max(_cropSize/img.width,_cropSize/img.height);
    _cropMinScale=Math.max(0.25,sc);
    _cropMaxScale=Math.max(4,Math.ceil(_cropMinScale*4*20)/20);
    var input=_cropGetZoomInput();
    if(input){
      input.min=_cropMinScale;
      input.max=_cropMaxScale;
      input.step=0.02;
      input.value=_cropMinScale;
    }
    _cropScale=_cropMinScale;
    _cropX=(_cropSize-img.width*_cropScale)/2;
    _cropY=(_cropSize-img.height*_cropScale)/2;
    _cropClampPosition();
    cropDraw();
    ge("crop-err").textContent="";
  };
  img.onerror=function(){
    ge("crop-err").textContent="Impossible de charger l'image. Vérifie l'URL ou le fichier choisi.";
    cropClear(true);
  };
  if(/^data:/i.test(url) && !_cropSourceLabel) _cropSourceLabel="Image locale";
  if(!/^data:/i.test(url)){
    _cropSourceLabel="Image distante";
    _cropSourceBytes=0;
  }
  img.src=url;
}

function cropDraw(){
  var canvas=ge("crop-canvas");if(!canvas)return;
  _cropSize=canvas.width||300;
  var ctx=canvas.getContext("2d");
  ctx.clearRect(0,0,_cropSize,_cropSize);
  if(!_cropImg){
    _cropPlaceholderCanvas(canvas,"Dépose une image");
    _cropUpdateUi();
    return;
  }
  var input=_cropGetZoomInput();
  if(input){
    _cropScale=parseFloat(input.value)||_cropScale||1;
    _cropScale=Math.max(parseFloat(input.min)||_cropMinScale,Math.min(parseFloat(input.max)||_cropMaxScale,_cropScale));
    input.value=_cropScale;
  }
  _cropClampPosition();
  ctx.imageSmoothingEnabled=true;
  try{ ctx.imageSmoothingQuality="high"; }catch(e){}
  ctx.drawImage(_cropImg,_cropX,_cropY,_cropImg.width*_cropScale,_cropImg.height*_cropScale);
  _cropUpdateUi();
}

function cropClear(keepInputs){
  var canvas=ge("crop-canvas");if(canvas){ var ctx=canvas.getContext("2d");ctx.clearRect(0,0,canvas.width,canvas.height); }
  _cropImg=null;_cropNaturalW=0;_cropNaturalH=0;_cropLoadedUrl="";
  if(!keepInputs){
    if(ge("crop-url")) ge("crop-url").value="";
    if(ge("crop-file")) ge("crop-file").value="";
    _cropSourceLabel="";_cropSourceBytes=0;
  }
  _cropUpdateUi();
}

function cropRecenter(){
  if(!_cropImg) return;
  _cropX=(_cropSize-_cropImg.width*_cropScale)/2;
  _cropY=(_cropSize-_cropImg.height*_cropScale)/2;
  cropDraw();
}
function cropAutoFit(mode){
  if(!_cropImg) return;
  var sc=_cropMinScale;
  if(mode==="native") sc=Math.max(_cropMinScale,1);
  var input=_cropGetZoomInput();
  if(input) input.value=sc;
  _cropScale=sc;
  cropRecenter();
}
function cropRemoveStoredImage(){
  if(_cropBeastId){
    var beasts=gb();
    var bi=beasts.findIndex(function(x){return x.id===_cropBeastId;});
    if(bi<0){ge("crop-err").textContent="Créature introuvable.";return;}
    beasts[bi].img="";
    sb(beasts);
    cropClear();
    closeModal("m-avatar-crop");
    renderBGrid("p-bgrd",CU&&CU.type==="staff");
    if(typeof renderDatabase==="function" && ge("p-db-editor-body")) try{ renderDatabase(); }catch(e){}
    notif("Image supprimée.","ok");
    return;
  }
  if(_cropDraftInputId){
    var draftInput=ge(_cropDraftInputId);
    if(draftInput) draftInput.value="";
    if(_cropDraftInputId==="np-av") renderNewPlayerAvatarDraft();
    cropClear();
    closeModal("m-avatar-crop");
    notif("Image retirée.","ok");
    return;
  }
  var targetPid=_cropTargetPid||(CU&&CU.pid);
  var p=targetPid?gpid(targetPid):null;
  if(!p){ge("crop-err").textContent="Personnage introuvable.";return;}
  p.avatar="";
  var ps=gp();var i=ps.findIndex(function(x){return x.id===p.id;});
  if(i>=0){ps[i]=p;sp(ps);}
  cropClear();
  closeModal("m-avatar-crop");
  renderView();
  if(CU&&targetPid===CU.pid) renderProfil();
  notif("Avatar supprimé.","ok");
}

function _cropBuildOutputCanvas(size){
  var out=document.createElement("canvas");
  out.width=size; out.height=size;
  var ctx=out.getContext("2d");
  ctx.imageSmoothingEnabled=true;
  try{ ctx.imageSmoothingQuality="high"; }catch(e){}
  var canvas=ge("crop-canvas");
  var ref=((canvas&&canvas.offsetWidth)||_cropSize||size);
  var ratio=size/ref;
  ctx.drawImage(_cropImg,_cropX*ratio,_cropY*ratio,_cropImg.width*_cropScale*ratio,_cropImg.height*_cropScale*ratio);
  return out;
}
function _cropExportCompressed(){
  var sizes=[320,300,280,260,240,220];
  var qualities=[0.90,0.86,0.82,0.78,0.74,0.70,0.64,0.58];
  var formats=["image/webp","image/jpeg"];
  var best="";
  for(var s=0;s<sizes.length;s++){
    var out=_cropBuildOutputCanvas(sizes[s]);
    for(var f=0;f<formats.length;f++){
      for(var q=0;q<qualities.length;q++){
        var data="";
        try{ data=out.toDataURL(formats[f],qualities[q]); }catch(e){ data=""; }
        if(!data) continue;
        if(!best || data.length<best.length) best=data;
        if(data.length<=280000){
          return data;
        }
      }
    }
  }
  return best||"";
}

function cropApply(){
  if(!_cropImg){ge("crop-err").textContent="Aucune image chargée.";return;}
  var dataUrl=_cropExportCompressed();
  if(!dataUrl){
    ge("crop-err").textContent="Impossible d'optimiser l'image.";
    return;
  }
  if(dataUrl.length>350000){
    ge("crop-err").textContent="Image trop lourde après compression. Essaie une image plus simple ou zoome davantage.";
    return;
  }

  _cropStoreRecentImage(dataUrl);

  if(_cropBeastId){
    var beasts=gb();
    var bi=beasts.findIndex(function(x){return x.id===_cropBeastId;});
    if(bi<0){ge("crop-err").textContent="Créature introuvable.";return;}
    beasts[bi].img=dataUrl;
    sb(beasts);
    _cropBeastId=null;
    if(ge("m-avatar-crop") && ge("m-avatar-crop").querySelector(".mtit")) ge("m-avatar-crop").querySelector(".mtit").textContent="Recadrer l'avatar";
    closeModal("m-avatar-crop");
    renderBGrid("p-bgrd",CU&&CU.type==="staff");
    if(typeof renderDatabase==="function" && ge("p-db-editor-body")) try{ renderDatabase(); }catch(e){}
    notif("Image mise à jour.","ok");
    return;
  }

  if(_cropDraftInputId){
    var draftInput=ge(_cropDraftInputId);
    if(!draftInput){ge("crop-err").textContent="Champ cible introuvable.";return;}
    draftInput.value=dataUrl;
    if(_cropDraftInputId==="np-av") renderNewPlayerAvatarDraft();
    closeModal("m-avatar-crop");
    notif("Avatar prêt pour la création du personnage.","ok");
    return;
  }
  var targetPid=_cropTargetPid||CU.pid;
  var p=targetPid?gpid(targetPid):null;
  if(!p){ge("crop-err").textContent="Personnage introuvable.";return;}
  p.avatar=dataUrl;
  var ps=gp();var i=ps.findIndex(function(x){return x.id===p.id;});
  if(i>=0){ps[i]=p;sp(ps);}
  closeModal("m-avatar-crop");
  renderView();
  if(CU&&targetPid===CU.pid) renderProfil();
  notif("Avatar mis à jour.","ok");
}

var _settingsTab="compte";
function switchSettingsTab(tab){
  _settingsTab=(tab==="collection"?"collection":"compte");
  renderProfil();
  setTimeout(function(){
    var target = _settingsTab==="collection" ? ge("appearance-section") : ge("profil");
    _focusOnScreen(target || ge("profil"), 'smooth');
  }, 40);
}

function openSettings(tab){
  if(!CU){ showScreen("s-login"); return; }
  _restorePrivateShell("profil");
  if(tab) _settingsTab=(tab==="collection"?"collection":"compte");
  switchTab("profil", null);
  renderProfil();
  setTimeout(function(){
    var target = _settingsTab==="collection" ? ge("appearance-section") : ge("mp-old");
    if(target){
      target.scrollIntoView({behavior:"smooth",block:"start"});
      if(target.focus && _settingsTab!=="collection") target.focus();
    }
  }, 100);
}

function resolveOwnProfilePid(){
  try{
    if(CU&&CU.pid&&gpid(CU.pid)) return CU.pid;
    var pseudo=CU&&(CU.pseudo||CU.name)||"";
    var acc=(pseudo&&typeof getAccountByPseudo==="function")?getAccountByPseudo(pseudo):null;
    if(acc&&acc.pid){
      if(CU&&!CU.pid) CU.pid=acc.pid;
      return acc.pid;
    }
    return (CU&&CU.pid)||null;
  }catch(e){
    return (CU&&CU.pid)||null;
  }
}

async function forceOpenOwnProfile(){
  if(!CU) return false;
  _restorePrivateShell("fiche");
  var ownPid=resolveOwnProfilePid();
  try{ showScreen("s-app"); }catch(e){}
  if(ownPid&&CU.role!=="joueur") _viewPid=ownPid;
  switchTab("fiche", null);
  if(!ownPid){
    renderFicheState("Compte en attente","Ton compte n’est pas encore lié à un personnage. Un administrateur doit terminer la liaison avant d’ouvrir la fiche.");
    return false;
  }
  var p=gpid(ownPid);
  if(!p){
    renderFicheState("Chargement de la fiche","Je recharge ton personnage.");
    try{ await _refreshPrivateCaches(); }catch(e){}
    p=gpid(ownPid);
  }
  if(!p){
    try{ await _reloadOwnPlayerIntoCache(ownPid); }catch(e){}
    p=gpid(ownPid);
  }
  if(!p){
    renderFicheState("Fiche indisponible","Impossible de retrouver ton personnage pour le moment. Recharge la page ou reconnecte-toi.");
    return false;
  }
  if(CU.role!=="joueur") _viewPid=ownPid;
  renderView();
  setTimeout(function(){
    if(CU&&CU.role!=="joueur") _viewPid=ownPid;
    renderView();
  },40);
  return true;
}

async function handleProfileClick(){
  if(!CU){ return; }
  if(!resolveOwnProfilePid()){
    openSettings("compte");
    return;
  }
  await forceOpenOwnProfile();
}

function renderProfil(){
  var el=ge("p-profil-c"); if(!el) return;
  if(!CU){ el.innerHTML=''; return; }
  var account=getAccountByPseudo(CU.pseudo||CU.name);
  var roleCols={admin:"var(--red)",mj:"var(--gold)",designer:"var(--purple)",joueur:"var(--glacier)"};
  var roleLabels={admin:"Admin",mj:"MJ",designer:"Designer",joueur:"Joueur"};
  var role=roleKey(CU);
  var col=roleCols[role]||"var(--glacier)";

  var isCollectionTab = (_settingsTab === "collection");
  var h='<div class="'+(isCollectionTab?'profile-collection-shell':'')+'" style="max-width:'+(isCollectionTab?'1320px':'560px')+';">';
  h+='<div class="settings-tabs">';
  h+='<button type="button" class="settings-tab'+(!isCollectionTab?' active':'')+'" onclick="switchSettingsTab(\'compte\')">Compte</button>';
  h+='<button type="button" class="settings-tab'+(isCollectionTab?' active':'')+'" onclick="switchSettingsTab(\'collection\')">Collection</button>';
  h+='</div>';

  // En-tête
  // En-tête avec avatar cliquable
  h+='<div style="display:flex;align-items:center;gap:20px;margin-bottom:28px;">';
  var hasPerso=!!CU.pid;
  var p2=hasPerso?gpid(CU.pid):null;
  var avInner=p2&&p2.avatar
    ?'<img src="'+p2.avatar+'" style="width:100%;height:100%;object-fit:cover;">'
    :'<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:var(--fd);font-size:28px;color:var(--dim);">'+(CU.name[0]||"?").toUpperCase()+'</div>';
  if(hasPerso){
    h+='<div onclick="openAvatarCrop()" title="Recadrer l\'avatar" style="width:72px;height:72px;background:var(--bg4);border:1px solid var(--border2);cursor:pointer;position:relative;flex-shrink:0;overflow:hidden;transition:border-color .2s;" onmouseover="this.querySelector(\'.av-overlay\').style.opacity=1" onmouseout="this.querySelector(\'.av-overlay\').style.opacity=0">'
      +avInner
      +'<div class="av-overlay" style="position:absolute;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s;font-size:20px;">✎</div>'
      +'</div>';
  } else {
    h+='<div style="width:72px;height:72px;background:var(--bg4);border:1px solid var(--border2);display:flex;align-items:center;justify-content:center;font-family:var(--fd);font-size:28px;color:var(--dim);">'+(CU.name[0]||"?").toUpperCase()+'</div>';
  }
  h+='<div>';
  h+='<div style="font-family:var(--fd);font-size:20px;letter-spacing:2px;margin-bottom:6px;">'+esc(CU.name)+'</div>';
  h+='<span style="font-family:var(--fd);font-size:10px;letter-spacing:2px;padding:3px 10px;border:1px solid '+col+';color:'+col+';">'+(roleLabels[role]||role)+'</span>';
  if(hasPerso) h+='<div style="font-size:12px;color:var(--dim);margin-top:6px;cursor:pointer;" onclick="openAvatarCrop()">Cliquer sur l\'avatar pour l\'importer ou le recadrer</div>';
  h+='</div></div>';

  if(!isCollectionTab){
  // Export PDF — uniquement si personnage lié
  if(hasPerso&&p2){
    h+='<div class="card" style="margin-bottom:16px;">';
    h+='<div style="display:flex;align-items:center;justify-content:space-between;">';
    h+='<div>';
    h+='<div style="font-family:var(--fd);font-size:13px;letter-spacing:1px;margin-bottom:3px;">Exporter mon personnage</div>';
    h+='<div style="font-size:12px;color:var(--dim);">Télécharge la fiche complète en PDF</div>';
    h+='</div>';
    h+='<button class="btn btn-sm" style="border-color:var(--glacier-dim);color:var(--glacier);flex-shrink:0;" onclick="exportFichePDF()"><span>↓ PDF</span></button>';
    h+='</div>';
    h+='</div>';
  }

  // Modifier mot de passe
  h+='<div class="card">';
  h+='<div class="card-title">Modifier mon mot de passe</div>';
  h+='<div class="frow"><label class="flbl">Mot de passe actuel</label><input type="password" id="mp-old" placeholder="••••••••"></div>';
  h+='<div class="frow"><label class="flbl">Nouveau mot de passe</label><input type="password" id="mp-new" placeholder="••••••••"></div>';
  h+='<div class="frow"><label class="flbl">Confirmer</label><input type="password" id="mp-new2" placeholder="••••••••" onkeydown="if(event.key===\'Enter\')saveMyPass()"></div>';
  h+='<p class="errmsg" id="mp-err"></p>';
  h+='<button class="btn btn-sm btn-grn" style="margin-top:8px;" onclick="saveMyPass()"><span>Enregistrer</span></button>';
  h+='</div>';

  // Rester connecté
  var hasSession=false;
  try{ hasSession=!!localStorage.getItem("np_session_flag"); }catch(e){}
  h+='<div class="card" style="margin-top:16px;">';
  h+='<div class="card-title">Session</div>';
  h+='<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;">';
  h+='<div>';
  h+='<div style="font-family:var(--fd);font-size:13px;letter-spacing:1px;margin-bottom:3px;">Rester connecté</div>';
  h+='<div style="font-size:13px;color:var(--dim);">Se souvenir de moi pendant 30 jours</div>';
  h+='</div>';
  h+='<label class="toggle-sw" id="tog-session"><input type="checkbox" '+(hasSession?'checked':'')+' onchange="toggleSession(this)"><div class="toggle-track"></div><div class="toggle-knob"></div></label>';
  h+='</div>';
  h+='</div>';

  h+='<div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border);">';
  h+='<button class="btn btn-full" style="border-color:rgba(201,74,74,0.4);color:rgba(201,74,74,0.75);letter-spacing:3px;" onclick="logout()"><span>Déconnexion</span></button>';
  h+='</div>';

  // Zone de danger — suppression de compte (masquée pour l'admin)
  if(isAdminRole(CU)){
    h+='<div style="margin-top:24px;padding:16px;border:1px solid var(--border);background:var(--bg3);">';
    h+='<div style="font-family:var(--fd);font-size:9px;letter-spacing:3px;color:var(--faint);margin-bottom:8px;">SUPPRESSION DE COMPTE</div>';
    h+='<div style="font-size:12px;color:var(--faint);font-style:italic;">Le compte administrateur ne peut pas être supprimé.</div>';
    h+='</div>';
  } else {
    h+='<div style="margin-top:24px;padding:16px;border:0.5px solid rgba(201,74,74,.25);background:rgba(201,74,74,.03);border-radius:2px;">';
    h+='<div style="font-family:var(--fd);font-size:9px;letter-spacing:3px;color:var(--red);margin-bottom:10px;">SUPPRESSION DE COMPTE</div>';
    h+='<div style="font-size:12px;color:var(--dim);margin-bottom:12px;line-height:1.5;">La suppression de ton compte est <strong style="color:var(--red);">irréversible</strong>. Ton personnage lié et tout ton historique seront définitivement perdus.</div>';
    h+='<button class="btn btn-sm" id="del-account-open" style="border-color:rgba(201,74,74,.5);color:var(--red);font-size:11px;width:100%;" onclick="toggleDeleteAccount()"><span>Supprimer mon compte</span></button>';
    h+='<div id="del-account-form" style="display:none;margin-top:12px;">';
    h+='<div style="font-size:12px;color:var(--dim);margin-bottom:8px;">Entre ton mot de passe pour confirmer :</div>';
    h+='<input type="password" id="del-account-pass" placeholder="Mot de passe" style="width:100%;margin-bottom:8px;border-color:rgba(201,74,74,.5);" onkeydown="if(event.key===\'Enter\')deleteMyAccount()">';
    h+='<p class="errmsg" id="del-account-err" style="color:var(--red);margin-bottom:8px;"></p>';
    h+='<button class="btn btn-full" style="background:var(--red);border-color:var(--red);color:#fff;" onclick="deleteMyAccount()"><span>⚠ Confirmer la suppression définitive</span></button>';
    h+='</div>';
    h+='</div>';
  }
  } else {
    h+='<div class="card" style="margin-bottom:16px;">';
    h+='<div id="appearance-section"></div>';
    h+='</div>';
  }

  h+='</div>';
  el.innerHTML=h;
  if(isCollectionTab) renderAppearanceSection();

}
function saveMyPass(){
  if(!CU){ return; }
  var oldPass=ge("mp-old").value;
  var newPass=ge("mp-new").value;
  var newPass2=ge("mp-new2").value;
  var errEl=ge("mp-err");
  errEl.textContent="";
  if(!oldPass||!newPass||!newPass2){ errEl.textContent="Remplis tous les champs."; return; }
  if(newPass.length<4){ errEl.textContent="4 caractères minimum."; return; }
  if(newPass!==newPass2){ errEl.textContent="Les mots de passe ne correspondent pas."; return; }
  Promise.all([hashPass(oldPass), hashPass(newPass)]).then(function(vals){
    return _authCall({action:"self_change_password", currentPassHash:vals[0], newPassHash:vals[1]});
  }).then(function(r){
    if(!r||!r.ok){ errEl.textContent=(r&&r.error)||"Impossible de modifier le mot de passe."; return; }
    ge("mp-old").value=""; ge("mp-new").value=""; ge("mp-new2").value="";
    notif("Mot de passe modifié.","ok");
  }).catch(function(){ errEl.textContent="Erreur réseau. Réessaie."; });
}



function toggleSession(chk){
  try{
    var has=!!localStorage.getItem("np_session_flag");
    if(has){
      _clearSession();
      notif("Session supprimée — tu devras te reconnecter au prochain chargement.","inf");
    } else {
      var account=getAccountByPseudo(CU.pseudo||CU.name);
      if(account) _saveSession(account);
      notif("Session sauvegardée — tu resteras connecté 30 jours.","ok");
    }
    if(chk) spawnToggleStars(chk);
  }catch(e){}
}

function toggleTheme(chk){
  var isLight=document.body.classList.contains("light");
  applyTheme(isLight?"dark":"light");
  if(chk) spawnToggleStars(chk);
}

function spawnToggleStars(chk){
  var label=chk.closest("label"); if(!label) return;
  var rect=label.getBoundingClientRect();
  var colors=["#7eb8d4","#c9a84c","#ffffff","#a0c8e0"];
  for(var i=0;i<10;i++){
    (function(i){
      setTimeout(function(){
        var star=document.createElement("div");
        var angle=Math.random()*Math.PI*2;
        var dist=18+Math.random()*28;
        var size=2+Math.random()*3;
        var cx=rect.left+rect.width/2+window.scrollX;
        var cy=rect.top+rect.height/2+window.scrollY;
        star.style.cssText="position:absolute;pointer-events:none;z-index:9999;"
          +"left:"+(cx-size/2)+"px;top:"+(cy-size/2)+"px;"
          +"width:"+size+"px;height:"+size+"px;"
          +"border-radius:50%;"
          +"background:"+colors[Math.floor(Math.random()*colors.length)]+";"
          +"box-shadow:0 0 4px "+colors[0]+";"
          +"transform:translate(0,0);opacity:1;"
          +"transition:transform .45s ease-out,opacity .45s ease-out;";
        document.body.appendChild(star);
        requestAnimationFrame(function(){
          requestAnimationFrame(function(){
            var tx=Math.cos(angle)*dist, ty=Math.sin(angle)*dist;
            star.style.transform="translate("+tx+"px,"+ty+"px) scale(0)";
            star.style.opacity="0";
          });
        });
        setTimeout(function(){ if(star.parentNode) star.parentNode.removeChild(star); }, 500);
      }, i*30);
    })(i);
  }
}

// ── MODALES STAFF — injectées au login ───────────────────
// Ces modales nécessitent des IDs DOM qui n'existent pas en HTML statique.
// Elles sont construites une seule fois après auth staff confirmée.
function _buildStaffModals(){
  var root = ge("staff-modal-root");
  if(!root || ge("m-edits")) return; // déjà construit

  root.innerHTML =

  // ══ ÉDITION STATS (m-edits) ══════════════════════════
  '<div id="m-edits" class="moverlay">'
  +'<div class="modal" style="max-width:520px;">'
  +'<button class="mclose" onclick="closeModal(\'m-edits\')">✕</button>'
  +'<div class="mtit" id="m-edits-n">Modifier les statistiques</div>'
  +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">'
    +'<div class="frow"><label class="flbl">PV actuels</label><input type="number" id="es-pvc" min="0"></div>'
    +'<div class="frow"><label class="flbl">PV max</label><input type="number" id="es-pvm" min="0"></div>'
    +'<div class="frow"><label class="flbl">EP actuels</label><input type="number" id="es-epc" min="0"></div>'
    +'<div class="frow"><label class="flbl">EP max</label><input type="number" id="es-epm" min="0"></div>'
    +'<div class="frow"><label class="flbl">EM actuels</label><input type="number" id="es-emc" min="0"></div>'
    +'<div class="frow"><label class="flbl">EM max</label><input type="number" id="es-emm" min="0"></div>'
    +'<div class="frow"><label class="flbl">Niveau</label><input type="number" id="es-niv" min="1" max="10"></div>'
    +'<div class="frow"><label class="flbl">XP Perso</label><input type="number" id="es-xp" min="0"></div>'
    +'<div class="frow"><label class="flbl">Niveau Serment</label><input type="number" id="es-sniv" min="1" max="4"></div>'
    +'<div class="frow"><label class="flbl">XP Serment</label><input type="number" id="es-sxp" min="0"></div>'
  +'</div>'
  +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">'
    +'<div class="frow"><label class="flbl">Casque</label><input type="text" id="es-hel" placeholder="—"></div>'
    +'<div class="frow"><label class="flbl">Torse</label><input type="text" id="es-che" placeholder="—"></div>'
    +'<div class="frow"><label class="flbl">Jambes</label><input type="text" id="es-leg" placeholder="—"></div>'
  +'</div>'
  +'<div class="frow"><label class="flbl">Branche</label><div id="es-bropts" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;"></div></div>'
  +'<div class="factions">'
    +'<button class="btn btn-sm" onclick="closeModal(\'m-edits\')"><span>Annuler</span></button>'
    +'<button class="btn btn-sm btn-grn" onclick="saveStats()"><span>Enregistrer</span></button>'
  +'</div>'
  +'</div></div>'

  // ══ AJOUTER ITEM (m-addi) ═════════════════════════════
  +'<div id="m-addi" class="moverlay">'
  +'<div class="modal" style="max-width:400px;">'
  +'<button class="mclose" onclick="closeModal(\'m-addi\')">✕</button>'
  +'<div class="mtit" id="m-addi-t">Ajouter un item</div>'
  +'<div class="frow"><label class="flbl">Nom de l\'item</label><input type="text" id="ai-n" placeholder="Nom de l\'item"></div>'
  +'<div class="frow"><label class="flbl">Quantité</label><input type="number" id="ai-q" value="1" min="1"></div>'
  +'<div class="frow"><label class="flbl">Catégorie</label>'
    +'<select id="ai-c"><option value="Équipement">Équipement</option><option value="Consommable">Consommable</option><option value="Gemme">Gemme</option><option value="Divers">Divers</option></select>'
  +'</div>'
  +'<div class="frow"><label class="flbl">Note IRP</label><textarea id="ai-note" placeholder="Contexte narratif..." style="min-height:60px;"></textarea></div>'
  +'<p class="errmsg" id="ai-err"></p>'
  +'<div class="factions">'
    +'<button class="btn btn-sm" onclick="closeModal(\'m-addi\')"><span>Annuler</span></button>'
    +'<button class="btn btn-sm btn-grn" onclick="addItem()"><span>Ajouter</span></button>'
  +'</div>'
  +'</div></div>'

  // ══ RETIRER ITEM (m-remi) ═════════════════════════════
  +'<div id="m-remi" class="moverlay">'
  +'<div class="modal" style="max-width:400px;">'
  +'<button class="mclose" onclick="closeModal(\'m-remi\')">✕</button>'
  +'<div class="mtit" id="m-remi-t">Retirer un item</div>'
  +'<div class="frow"><label class="flbl">Item</label><select id="ri-s"></select></div>'
  +'<div class="frow"><label class="flbl">Quantité</label><input type="number" id="ri-q" value="1" min="1"></div>'
  +'<div class="frow"><label class="flbl">Note IRP</label><textarea id="ri-note" placeholder="Contexte narratif..." style="min-height:60px;"></textarea></div>'
  +'<p class="errmsg" id="ri-err"></p>'
  +'<div class="factions">'
    +'<button class="btn btn-sm" onclick="closeModal(\'m-remi\')"><span>Annuler</span></button>'
    +'<button class="btn btn-sm btn-red" onclick="removeItem()"><span>Retirer</span></button>'
  +'</div>'
  +'</div></div>'

  // ══ AJOUTER CRÉATURE (m-addb) ═══════════════════════
  +'<div id="m-addb" class="moverlay">'
  +'<div class="modal" style="max-width:560px;">'
  +'<button class="mclose" onclick="closeModal(\'m-addb\')">✕</button>'
  +'<div class="mtit">Nouvelle créature</div>'
  +'<div style="display:grid;grid-template-columns:1.1fr .9fr;gap:12px;">'
    +'<div class="frow"><label class="flbl">Nom</label><input type="text" id="ab-n" placeholder="Nom de la créature"></div>'
    +'<div class="frow"><label class="flbl">Sous-titre</label><input type="text" id="ab-sub" placeholder="Prédateur du givre..."></div>'
    +'<div class="frow"><label class="flbl">Comportement</label><select id="ab-beh"><option value="1">Gibier</option><option value="2">Passif</option><option value="3">Neutre</option><option value="4">Agressif</option><option value="5">Très agressif</option></select></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">'
      +'<div class="frow"><label class="flbl">Niveau</label><input type="number" id="ab-niv" value="1" min="1"></div>'
      +'<div class="frow"><label class="flbl">PV</label><input type="number" id="ab-pv" value="20" min="0"></div>'
      +'<div class="frow"><label class="flbl">EP</label><input type="number" id="ab-ep" value="20" min="0"></div>'
    +'</div>'
  +'</div>'
  +'<div class="frow"><label class="flbl">Image</label><input type="text" id="ab-img" placeholder="https://..."></div>'
  +'<div class="frow"><label class="flbl">Zones</label><input type="text" id="ab-zones" placeholder="Forêt gelée, Ruines, Grotte..."></div>'
  +'<div class="frow"><label class="flbl">Frappe</label><textarea id="ab-fr" style="min-height:72px;" placeholder="Description des frappes..."></textarea></div>'
  +'<div class="frow"><label class="flbl">Compétences</label><textarea id="ab-co" style="min-height:72px;" placeholder="Compétences..."></textarea></div>'
  +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
    +'<div class="frow"><label class="flbl">Drops</label><textarea id="ab-dr" style="min-height:68px;" placeholder="Ressources récupérables..."></textarea></div>'
    +'<div class="frow"><label class="flbl">Gemmes</label><textarea id="ab-gm" style="min-height:68px;" placeholder="Gemmes potentielles..."></textarea></div>'
  +'</div>'
  +'<div class="frow"><label class="flbl">Description</label><textarea id="ab-de" style="min-height:96px;" placeholder="Description narrative..."></textarea></div>'
  +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
    +'<div class="frow"><label class="flbl">Note admin</label><textarea id="ab-note" style="min-height:86px;" placeholder="Script MJ, gimmick, faiblesse cachée, loot spécial..."></textarea></div>'
    +'<div class="frow" style="display:flex;flex-direction:column;justify-content:flex-end;gap:10px;padding-top:24px;">'
      +'<label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" id="ab-hidden"> <span>Masquée côté joueurs</span></label>'
      +'<label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" id="ab-archived"> <span>Archivée</span></label>'
    +'</div>'
  +'</div>'
  +'<p class="errmsg" id="ab-err"></p>'
  +'<div class="factions">'
    +'<button class="btn btn-sm" onclick="closeModal(\'m-addb\')"><span>Annuler</span></button>'
    +'<button class="btn btn-sm btn-grn" onclick="addBeast()"><span>Créer</span></button>'
  +'</div>'
  +'</div></div>'

  // ══ MODIFIER CRÉATURE (m-editb) ═════════════════════
  +'<div id="m-editb" class="moverlay">'
  +'<div class="modal" style="max-width:620px;">'
  +'<button class="mclose" onclick="closeModal(\'m-editb\')">✕</button>'
  +'<div class="mtit">Modifier la créature</div>'
  +'<input type="hidden" id="eb-id">'
  +'<div style="display:grid;grid-template-columns:1.1fr .9fr;gap:12px;">'
    +'<div class="frow"><label class="flbl">Nom</label><input type="text" id="eb-n" placeholder="Nom de la créature"></div>'
    +'<div class="frow"><label class="flbl">Sous-titre</label><input type="text" id="eb-sub" placeholder="Prédateur du givre..."></div>'
    +'<div class="frow"><label class="flbl">Comportement</label><select id="eb-beh"><option value="1">Gibier</option><option value="2">Passif</option><option value="3">Neutre</option><option value="4">Agressif</option><option value="5">Très agressif</option></select></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">'
      +'<div class="frow"><label class="flbl">Niveau</label><input type="number" id="eb-niv" min="1"></div>'
      +'<div class="frow"><label class="flbl">PV</label><input type="number" id="eb-pv" min="0"></div>'
      +'<div class="frow"><label class="flbl">EP</label><input type="number" id="eb-ep" min="0"></div>'
    +'</div>'
  +'</div>'
  +'<div class="frow"><label class="flbl">Image</label><input type="text" id="eb-img" placeholder="https://..."></div>'
  +'<div class="frow"><label class="flbl">Zones</label><input type="text" id="eb-zones" placeholder="Forêt gelée, Ruines, Grotte..."></div>'
  +'<div class="frow"><label class="flbl">Frappe</label><textarea id="eb-fr" style="min-height:72px;" placeholder="Description des frappes..."></textarea></div>'
  +'<div class="frow"><label class="flbl">Compétences</label><textarea id="eb-co" style="min-height:72px;" placeholder="Compétences..."></textarea></div>'
  +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
    +'<div class="frow"><label class="flbl">Drops</label><textarea id="eb-dr" style="min-height:68px;" placeholder="Ressources récupérables..."></textarea></div>'
    +'<div class="frow"><label class="flbl">Gemmes</label><textarea id="eb-gm" style="min-height:68px;" placeholder="Gemmes potentielles..."></textarea></div>'
  +'</div>'
  +'<div class="frow"><label class="flbl">Description</label><textarea id="eb-de" style="min-height:110px;" placeholder="Description narrative..."></textarea></div>'
  +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
    +'<div class="frow"><label class="flbl">Note admin</label><textarea id="eb-note" style="min-height:86px;" placeholder="Script MJ, gimmick, faiblesse cachée, loot spécial..."></textarea></div>'
    +'<div class="frow" style="display:flex;flex-direction:column;justify-content:flex-end;gap:10px;padding-top:24px;">'
      +'<label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" id="eb-hidden"> <span>Masquée côté joueurs</span></label>'
      +'<label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" id="eb-archived"> <span>Archivée</span></label>'
    +'</div>'
  +'</div>'
  +'<p class="errmsg" id="eb-err"></p>'
  +'<div class="factions">'
    +'<button class="btn btn-sm" onclick="closeModal(\'m-editb\')"><span>Annuler</span></button>'
    +'<button class="btn btn-sm btn-grn" onclick="saveEditBeast()"><span>Enregistrer</span></button>'
  +'</div>'
  +'</div></div>'

  // ══ AJOUTER / MODIFIER JOUEUR (m-addp) ═══════════════
  +'<div id="m-addp" class="moverlay">'
  +'<div class="modal" style="max-width:420px;">'
  +'<button class="mclose" onclick="closeModal(\'m-addp\')">✕</button>'
  +'<div class="mtit">Nouveau joueur</div>'
  +'<div class="frow"><label class="flbl">Nom du personnage</label><input type="text" id="np-n" placeholder="Nom IRP"></div>'
  +'<div class="frow"><label class="flbl">Serment</label><select id="np-c"></select></div>'
  +'<div class="frow"><label class="flbl">Avatar (URL ou import)</label><input type="text" id="np-av" placeholder="https://i.imgur.com/..." oninput="renderNewPlayerAvatarDraft()"></div>'
  +'<div style="display:grid;grid-template-columns:84px 1fr;gap:12px;align-items:start;margin-top:-4px;margin-bottom:10px;">'
    +'<div id="np-av-preview" onclick="openNewPlayerAvatarCrop()" title="Importer / recadrer l\'avatar" style="width:84px;height:84px;border:1px solid var(--border2);background:var(--bg4);overflow:hidden;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:26px;color:var(--faint);">✦</div>'
    +'<div style="display:flex;flex-direction:column;gap:8px;">'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap;">'
        +'<button type="button" class="btn btn-sm" onclick="openNewPlayerAvatarCrop()"><span>Importer / recadrer</span></button>'
        +'<button type="button" class="btn btn-sm" onclick="clearNewPlayerAvatarDraft()"><span>Retirer l\'image</span></button>'
      +'</div>'
      +'<div id="np-av-meta" style="font-size:12px;color:var(--faint);line-height:1.45;">Tu peux coller une URL ou importer une image depuis l\'appareil.</div>'
    +'</div>'
  +'</div>'
  +'<p class="errmsg" id="np-err"></p>'
  +'<div class="factions">'
    +'<button class="btn btn-sm" onclick="closeModal(\'m-addp\')"><span>Annuler</span></button>'
    +'<button class="btn btn-sm btn-grn" onclick="addPlayer()"><span>Créer</span></button>'
  +'</div>'
  +'</div></div>'

  // ══ AJOUTER STAFF (m-addmj) ══════════════════════════
  +'<div id="m-addmj" class="moverlay">'
  +'<div class="modal" style="max-width:400px;">'
  +'<button class="mclose" onclick="closeModal(\'m-addmj\')">✕</button>'
  +'<div class="mtit">Ajouter un membre staff</div>'
  +'<div class="frow"><label class="flbl">Pseudo</label><input type="text" id="mj-n" placeholder="Pseudo du compte"></div>'
  +'<div class="frow"><label class="flbl">Rôle</label>'
    +'<select id="mj-r"><option value="mj">MJ</option><option value="designer">Designer</option><option value="admin">Admin</option></select>'
  +'</div>'
  +'<p class="errmsg" id="err-s"></p>'
  +'<div class="factions">'
    +'<button class="btn btn-sm" onclick="closeModal(\'m-addmj\')"><span>Annuler</span></button>'
    +'<button class="btn btn-sm btn-grn" onclick="notif(&quot;Le staff doit s\'inscrire, puis modifiez le r&#244;le dans Joueurs.&quot;,&quot;inf&quot;)"><span>Info</span></button>'
  +'</div>'
  +'</div></div>'

  // ══ MODIFIER BRANCHE (m-branch) ═══════════════════════
  +'<div id="m-branch" class="moverlay">'
  +'<div class="modal" style="max-width:480px;">'
  +'<button class="mclose" onclick="closeModal(\'m-branch\')">✕</button>'
  +'<div class="mtit" id="mbr-title">Modifier une branche</div>'
  +'<div class="frow"><label class="flbl">Nom de la branche</label><input type="text" id="mbr-nom" placeholder="Branche A — Nom"></div>'
  +'<div class="frow"><label class="flbl">Style</label><input type="text" id="mbr-style" placeholder="Mêlée, Distance, AOE..."></div>'
  +'<div class="frow"><label class="flbl">Description</label><textarea id="mbr-desc" style="min-height:80px;" placeholder="Description narrative..."></textarea></div>'
  +'<div class="factions">'
    +'<button class="btn btn-sm" onclick="closeModal(\'m-branch\')"><span>Annuler</span></button>'
    +'<button class="btn btn-sm btn-grn" onclick="saveBranch()"><span>Enregistrer</span></button>'
  +'</div>'
  +'</div></div>'

  // ══ CHANGER SERMENT (m-changeserm) ════════════════════
  +'<div id="m-changeserm" class="moverlay">'
  +'<div class="modal" style="max-width:420px;">'
  +'<button class="mclose" onclick="closeModal(\'m-changeserm\')">✕</button>'
  +'<div class="mtit">Changer de Serment</div>'
  +'<div style="margin-bottom:16px;font-size:13px;color:var(--dim);">Personnage : <strong id="mcs-pname" style="color:var(--text);"></strong></div>'
  +'<div style="margin-bottom:16px;font-size:12px;color:var(--faint);font-style:italic;">Serment actuel : <span id="mcs-cur"></span></div>'
  +'<div class="frow"><label class="flbl">Nouveau Serment</label><select id="mcs-sel"></select></div>'
  +'<div class="factions">'
    +'<button class="btn btn-sm" onclick="closeModal(\'m-changeserm\')"><span>Annuler</span></button>'
    +'<button class="btn btn-sm btn-red" onclick="saveChangeSerm()"><span>Changer</span></button>'
  +'</div>'
  +'</div></div>'

  // ══ CHANGER BRANCHE (m-changebranch) ══════════════════
  +'<div id="m-changebranch" class="moverlay">'
  +'<div class="modal" style="max-width:420px;">'
  +'<button class="mclose" onclick="closeModal(\'m-changebranch\')">✕</button>'
  +'<div class="mtit">Changer de branche</div>'
  +'<div style="margin-bottom:8px;font-size:13px;color:var(--dim);">Personnage : <strong id="mcb-pname" style="color:var(--text);"></strong></div>'
  +'<div style="margin-bottom:16px;font-size:12px;color:var(--faint);font-style:italic;">Serment : <span id="mcb-serm"></span></div>'
  +'<div id="mcb-options" style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;"></div>'
  +'<div class="factions">'
    +'<button class="btn btn-sm" onclick="closeModal(\'m-changebranch\')"><span>Annuler</span></button>'
    +'<button class="btn btn-sm btn-red" onclick="saveChangeBranch()"><span>Confirmer</span></button>'
  +'</div>'
  +'</div></div>'

  // ══ CRÉER/MODIFIER SERMENT (m-serm) ═══════════════════
  +'<div id="m-serm" class="moverlay">'
  +'<div class="modal" style="max-width:500px;">'
  +'<button class="mclose" onclick="closeModal(\'m-serm\')">✕</button>'
  +'<div class="mtit" id="mserm-title">Serment</div>'
  +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
    +'<div class="frow"><label class="flbl">Nom du Serment</label><input type="text" id="mserm-nom" placeholder="Duelliste..."></div>'
    +'<div class="frow"><label class="flbl">Icône</label><input type="text" id="mserm-icon" placeholder="✦"></div>'
    +'<div class="frow"><label class="flbl">Arme liée</label><input type="text" id="mserm-arme" placeholder="Épée du serment"></div>'
    +'<div class="frow"><label class="flbl">Catégorie</label><select id="mserm-cat"><option value="mêlée">Mêlée</option><option value="distance">Distance</option><option value="magie">Magie</option><option value="soutien">Soutien</option></select></div>'
    +'<div class="frow"><label class="flbl">PV/niv</label><input type="number" id="mserm-pvN" value="3" min="1"></div>'
    +'<div class="frow"><label class="flbl">EP/niv</label><input type="number" id="mserm-epN" value="5" min="1"></div>'
    +'<div class="frow"><label class="flbl">EM/niv</label><input type="number" id="mserm-emN" value="2" min="0"></div>'
    +'<div class="frow"><label class="flbl">Dégâts base</label><input type="number" id="mserm-dmg" value="8" min="1"></div>'
  +'</div>'
  +'<div class="frow" style="margin-top:4px;"><label class="flbl">Lore</label><textarea id="mserm-lore" style="min-height:80px;" placeholder="Texte narratif..."></textarea></div>'
  +'<div class="factions">'
    +'<button class="btn btn-sm" onclick="closeModal(\'m-serm\')"><span>Annuler</span></button>'
    +'<button class="btn btn-sm btn-grn" onclick="saveSerm()"><span>Enregistrer</span></button>'
  +'</div>'
  +'</div></div>'

  // ══ PALIER (m-palier) ══════════════════════════════════
  +'<div id="m-palier" class="moverlay">'
  +'<div class="modal" style="max-width:440px;">'
  +'<button class="mclose" onclick="closeModal(\'m-palier\')">✕</button>'
  +'<div class="mtit" id="mpal-title">Palier</div>'
  +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
    +'<div class="frow"><label class="flbl">Niveau requis</label><select id="mpal-niv"><option value="2">2</option><option value="5">5</option><option value="7">7</option><option value="10">10</option></select></div>'
    +'<div class="frow"><label class="flbl">Nom de la capacité</label><input type="text" id="mpal-nom" placeholder="Nom..."></div>'
  +'</div>'
  +'<div class="frow"><label class="flbl">Coût / conditions</label><input type="text" id="mpal-cout" placeholder="6 EM — 1 action"></div>'
  +'<div class="frow"><label class="flbl">Description</label><textarea id="mpal-desc" style="min-height:72px;" placeholder="Description mécanique..."></textarea></div>'
  +'<div class="factions">'
    +'<button class="btn btn-sm" onclick="closeModal(\'m-palier\')"><span>Annuler</span></button>'
    +'<button class="btn btn-sm btn-grn" onclick="savePalier()"><span>Enregistrer</span></button>'
  +'</div>'
  +'</div></div>'

  // ══ ÉVÉNEMENT (m-event) ════════════════════════════════
  +'<div id="m-event" class="moverlay">'
  +'<div class="modal" style="max-width:460px;">'
  +'<button class="mclose" onclick="closeModal(\'m-event\')">✕</button>'
  +'<div class="mtit" id="m-event-title">Événement</div>'
  +'<input type="hidden" id="ev-id">'
  +'<div class="frow"><label class="flbl">Titre</label><input type="text" id="ev-nom" placeholder="Nom de l\'événement"></div>'
  +'<div class="frow"><label class="flbl">Type</label>'
    +'<select id="ev-type"><option value="combat">Combat</option><option value="exploration">Exploration</option><option value="social">Social</option><option value="autre">Autre</option></select>'
  +'</div>'
  +'<div class="frow"><label class="flbl">Date</label><input type="datetime-local" id="ev-date"></div>'
  +'<div class="frow"><label class="flbl">Description</label><textarea id="ev-desc" style="min-height:72px;" placeholder="Description..."></textarea></div>'
  +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">'
    +'<label class="toggle-sw"><input type="checkbox" id="ev-published" onchange="var l=ge(\'ev-published-lbl\');if(l)l.textContent=this.checked?\'Publié — visible par tous les joueurs\':\'Masqué — visible staff uniquement\';"><div class="toggle-track"></div><div class="toggle-knob"></div></label>'
    +'<span id="ev-published-lbl" style="font-family:var(--fd);font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--dim);">Publié</span>'
  +'</div>'
  +'<div class="factions">'
    +'<button class="btn btn-sm" onclick="closeModal(\'m-event\')"><span>Annuler</span></button>'
    +'<button class="btn btn-sm btn-grn" onclick="saveEvent()"><span>Enregistrer</span></button>'
  +'</div>'
  +'</div></div>'

  ;

  // ══ THÈME ÉVÉNEMENT (m-theme) ════════════════════════
  +'<div id="m-theme" class="moverlay">'
  +'<div class="modal" style="max-width:460px;">'
  +'<button class="mclose" onclick="closeModal(\'m-theme\')">✕</button>'
  +'<div class="mtit" id="mth-title">Thème événement</div>'
  +'<input type="hidden" id="mth-id">'
  +'<div class="frow"><label class="flbl">Nom du thème</label><input type="text" id="mth-name" placeholder="Pâques..."></div>'
  +'<div class="frow"><label class="flbl">Description</label><input type="text" id="mth-desc" placeholder="Thème de printemps..."></div>'
  +'<div class="frow"><label class="flbl">Classe CSS (optionnel)</label><input type="text" id="mth-cls" placeholder="theme-easter"></div>'
  +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">'
  +'<div class="frow"><label class="flbl">Fond</label><input type="color" id="mth-bg" value="#0d0e18" style="height:42px;padding:4px;cursor:pointer;"></div>'
  +'<div class="frow"><label class="flbl">Accent</label><input type="color" id="mth-accent" value="#7eb8d4" style="height:42px;padding:4px;cursor:pointer;"></div>'
  +'<div class="frow"><label class="flbl">Or</label><input type="color" id="mth-gold" value="#c9a84c" style="height:42px;padding:4px;cursor:pointer;"></div>'
  +'</div>'
  +'<div class="frow"><label class="flbl">Disponible jusqu\'au</label><input type="date" id="mth-until"></div>'
  +'<p class="errmsg" id="mth-err"></p>'
  +'<div class="factions">'
  +'<button class="btn btn-sm" onclick="closeModal(\'m-theme\')"><span>Annuler</span></button>'
  +'<button class="btn btn-sm btn-grn" onclick="saveTheme()"><span>Enregistrer</span></button>'
  +'</div>'
  +'</div></div>'
  ;

  // Attacher les overlay-close listeners
  root.querySelectorAll(".moverlay").forEach(function(o){
    o.addEventListener("click", function(e){
      if(e.target !== o) return;
      if(o.id === "m-edits"){ _editsBackdropWarning(); return; }
      o.classList.remove("open");
    });
  });
}


// ==========================================
// SYSTÈME DE THÈMES
// ==========================================
var _currentTheme = "dark";
var _THEME_CLASSES = ["light","theme-violet","theme-red","theme-green",
                      "theme-easter","theme-halloween","theme-noel","theme-bloodmoon","theme-aquaris"];

function _npParseColor(str){
  if(!str) return null;
  var s=String(str).trim(), m;
  if((m=s.match(/^#([0-9a-f]{3})$/i))) return {r:parseInt(m[1][0]+m[1][0],16),g:parseInt(m[1][1]+m[1][1],16),b:parseInt(m[1][2]+m[1][2],16)};
  if((m=s.match(/^#([0-9a-f]{6})$/i))) return {r:parseInt(m[1].slice(0,2),16),g:parseInt(m[1].slice(2,4),16),b:parseInt(m[1].slice(4,6),16)};
  if((m=s.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i))) return {r:+m[1],g:+m[2],b:+m[3]};
  return null;
}
function _npRgbCss(c,a){ return a==null?('rgb('+c.r+','+c.g+','+c.b+')'):('rgba('+c.r+','+c.g+','+c.b+','+a+')'); }
function _npInv(c){ return {r:255-c.r,g:255-c.g,b:255-c.b}; }
function _npMix(a,b,t){ return {r:Math.round(a.r+(b.r-a.r)*t),g:Math.round(a.g+(b.g-a.g)*t),b:Math.round(a.b+(b.b-a.b)*t)}; }
function _npThemePalette(){
  var cs=getComputedStyle(document.body);
  var bg=_npParseColor(cs.getPropertyValue('--bg'))||{r:9,g:9,b:15};
  var accent=_npParseColor(cs.getPropertyValue('--glacier'))||{r:126,g:184,b:212};
  var text=_npParseColor(cs.getPropertyValue('--text'))||{r:244,g:248,b:252};
  var opposite=_npInv(bg);
  var primary=_npMix(opposite, accent, .28);
  var secondary=_npMix(primary, text, .18);
  var centerOuter=_npMix(bg, accent, .22);
  var centerInner=_npMix(primary, accent, .45);
  return {bg:bg,accent:accent,text:text,primary:primary,secondary:secondary,centerOuter:centerOuter,centerInner:centerInner};
}
function updateHeaderLogoTheme(){
  var svg=ge('hdr-logo-svg'); if(!svg) return;
  var pal=_npThemePalette();
  var stops=svg.querySelectorAll('linearGradient stop');
  if(stops[0]) stops[0].setAttribute('stop-color', _npRgbCss(pal.secondary));
  if(stops[1]) stops[1].setAttribute('stop-color', _npRgbCss(pal.primary));
  var circle=svg.querySelector('circle');
  if(circle){ circle.setAttribute('stroke', _npRgbCss(pal.primary,.78)); circle.setAttribute('opacity','0.72'); }
  var polys=svg.querySelectorAll('polygon');
  polys.forEach(function(p,i){ p.setAttribute('fill', _npRgbCss(i<4?pal.primary:pal.secondary)); if(i>=4) p.setAttribute('opacity','0.88'); });
  var rects=svg.querySelectorAll('rect');
  if(rects[0]){ rects[0].setAttribute('fill', _npRgbCss(pal.centerOuter)); rects[0].setAttribute('stroke', _npRgbCss(pal.primary)); }
  if(rects[1]) rects[1].setAttribute('fill', _npRgbCss(pal.centerInner));
}


function updateLaunchTheme(){
  var overlay=ge("login-transition-overlay");
  var flash=ge("lto-flash");
  var logo=ge("lto-logo");
  if(!overlay||!flash||!logo) return;
  var pal=_npThemePalette();
  var bg=_npRgbCss(pal.bg);
  var accent=_npRgbCss(pal.primary||pal.accent);
  var accent2=_npRgbCss(pal.secondary||pal.text);
  var core=_npRgbCss(_npMix(pal.text, pal.primary||pal.accent, .35));
  document.documentElement.style.setProperty('--launch-bg', bg);
  document.documentElement.style.setProperty('--launch-accent', accent);
  document.documentElement.style.setProperty('--launch-accent-2', accent2);
  document.documentElement.style.setProperty('--launch-core', core);
  var stops=logo.querySelectorAll('#lto-gs stop');
  if(stops[0]) stops[0].setAttribute('stop-color', accent2);
  if(stops[1]) stops[1].setAttribute('stop-color', accent);
  var ringStops=logo.querySelectorAll('#lto-gr stop');
  if(ringStops[0]) ringStops[0].setAttribute('stop-color', accent);
  if(ringStops[1]) ringStops[1].setAttribute('stop-color', _npRgbCss(_npMix(pal.bg, pal.accent, .42)));
  if(ringStops[2]) ringStops[2].setAttribute('stop-color', accent2);
  logo.querySelectorAll('circle').forEach(function(c,i){
    if(i<2){ c.setAttribute('stroke', accent); c.setAttribute('opacity', i===0?'.32':'.18'); }
    else if(i===2){ c.setAttribute('fill', _npRgbCss(_npMix(pal.bg,pal.primary,.18))); c.setAttribute('stroke', accent2); }
    else { c.setAttribute('fill', accent); }
  });
  logo.querySelectorAll('polygon').forEach(function(p,i){
    var col = (i<1)?accent2:(i<4?accent:_npRgbCss(_npMix(pal.primary,pal.text,.25)));
    p.setAttribute('fill', col);
  });
  logo.querySelectorAll('line').forEach(function(l){ l.setAttribute('stroke','url(#lto-gr)'); });
}


function _hexToRgbTuple(hex){
  var h=String(hex||"").trim().replace(/^#/,'');
  if(h.length===3) h=h.split('').map(function(c){return c+c;}).join('');
  if(!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}
function _parseCssColorToRgb(value){
  var v=String(value||'').trim();
  if(!v) return null;
  if(v.indexOf('#')===0) return _hexToRgbTuple(v);
  var m=v.match(/rgba?\(([^)]+)\)/i);
  if(m){
    var parts=m[1].split(',').map(function(x){ return parseFloat(String(x).trim()); });
    if(parts.length>=3) return [parts[0],parts[1],parts[2]];
  }
  return null;
}
function _rgbToCss(rgb){
  return rgb ? rgb.map(function(n){ return Math.max(0,Math.min(255,Math.round(n))); }).join(',') : '126,184,212';
}
function _rgbMix(a,b,t){
  if(!a) return b; if(!b) return a;
  return [
    a[0]*(1-t)+b[0]*t,
    a[1]*(1-t)+b[1]*t,
    a[2]*(1-t)+b[2]*t
  ];
}
function _rgbLuma(rgb){
  if(!rgb) return 0;
  var c=rgb.map(function(v){
    v/=255;
    return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4);
  });
  return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2];
}
function setAdaptiveThemeTokens(){
  try{
    var cs=getComputedStyle(document.body);
    var bg=_parseCssColorToRgb(cs.getPropertyValue('--bg')) || [13,14,24];
    var accent=_parseCssColorToRgb(cs.getPropertyValue('--glacier')) || [126,184,212];
    var bright=_parseCssColorToRgb(cs.getPropertyValue('--glacier-bright')) || accent;
    var mixed=_rgbMix(accent, bright, 0.22);
    var luma=_rgbLuma(mixed);
    var fg = luma > 0.58 ? [8,12,18] : [248,252,255];
    var soft = luma > 0.58 ? 'rgba(8,12,18,.86)' : 'rgba(248,252,255,.86)';
    var shadow = luma > 0.58 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.35)';
    document.body.style.setProperty('--theme-accent', 'rgb('+_rgbToCss(mixed)+')');
    document.body.style.setProperty('--theme-accent-rgb', _rgbToCss(mixed));
    document.body.style.setProperty('--theme-contrast', 'rgb('+_rgbToCss(fg)+')');
    document.body.style.setProperty('--theme-contrast-soft', soft);
    document.body.style.setProperty('--theme-shadow', shadow);
    document.body.style.setProperty('--theme-ring', 'rgba('+_rgbToCss(mixed)+',.35)');
    document.body.style.setProperty('--theme-glow-strong', 'rgba('+_rgbToCss(mixed)+',.18)');
    document.body.style.setProperty('--theme-panel', 'rgba('+_rgbToCss(mixed)+',.08)');
    document.body.style.setProperty('--theme-panel-strong', 'rgba('+_rgbToCss(mixed)+',.16)');
    document.body.style.setProperty('--theme-tint', 'rgba('+_rgbToCss(mixed)+',.05)');
  }catch(e){}
}

function applyTheme(themeId, save){
  var normalized = String(themeId||"dark").trim();
  if(normalized === 'theme-default') normalized = 'dark';
  if(normalized.indexOf("theme-")===0) normalized = normalized.replace(/^theme-/, "");
  var _themePlayer = getThemeActorPlayer();
  if(normalized !== "dark" && !canUseTheme(_themePlayer, normalized)){ notif("Ce thème n'est pas disponible.", "err"); return; }
  var t = getThemeById(normalized);
  if(!t && normalized !== "dark") return;
  // Retirer toutes les classes de thème
  _THEME_CLASSES.forEach(function(cls){ document.body.classList.remove(cls); });
  document.body.classList.remove("light");
  // Appliquer la nouvelle classe
  if(t && t.cls) document.body.classList.add(t.cls);
  else if(normalized === "light") document.body.classList.add("light");
  _currentTheme = normalized;
  if(save !== false){
    try{ localStorage.setItem("np_theme", normalized); }catch(e){}
    try{ persistSelectedTheme(normalized); }catch(e){}
  }
  // Mettre à jour le toggle dark/light dans le profil si présent
  var lbl = ge("tog-theme-lbl");
  var chk = ge("tog-theme");
  if(lbl) lbl.textContent = themeId === "light" ? "Mode Clair" : "Mode Sombre";
  if(chk) chk.checked = (themeId === "light");
  updateHeaderLogoTheme();
  updateLaunchTheme();
  setAdaptiveThemeTokens();
  _easterEggsDestroy();
}

/* ====== EASTER EGG PARTICLE SYSTEM ====== */
var _easterEggsContainer = null;

var _EASTER_EGG_DESIGNS = [
  function(id){return'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 76"><defs><radialGradient id="eg'+id+'a" cx="38%" cy="32%" r="60%"><stop offset="0%" stop-color="#fff8c0"/><stop offset="55%" stop-color="#ffd700"/><stop offset="100%" stop-color="#c8960a"/></radialGradient></defs><ellipse cx="30" cy="38" rx="27" ry="34" fill="url(#eg'+id+'a)"/><g stroke="#c8960a" stroke-width="2.2" fill="none"><line x1="8" y1="28" x2="52" y2="28"/><line x1="5" y1="38" x2="55" y2="38"/><line x1="8" y1="48" x2="52" y2="48"/></g><ellipse cx="30" cy="38" rx="27" ry="34" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1"/></svg>';},
  function(id){return'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 76"><defs><radialGradient id="eg'+id+'b" cx="38%" cy="30%" r="62%"><stop offset="0%" stop-color="#ffe0f0"/><stop offset="55%" stop-color="#ff80c0"/><stop offset="100%" stop-color="#c0308a"/></radialGradient></defs><ellipse cx="30" cy="38" rx="27" ry="34" fill="url(#eg'+id+'b)"/><g fill="rgba(255,255,255,0.7)"><path d="M14,30 C14,27 17,25 19.5,27.5 C22,25 25,27 25,30 C25,34 19.5,38 19.5,38 C19.5,38 14,34 14,30Z"/><path d="M35,20 C35,17.5 37.5,16 39.5,18 C41.5,16 44,17.5 44,20 C44,23.5 39.5,27 39.5,27 C39.5,27 35,23.5 35,20Z"/><path d="M22,46 C22,43.5 24.5,42 26.5,44 C28.5,42 31,43.5 31,46 C31,49.5 26.5,53 26.5,53 C26.5,53 22,49.5 22,46Z"/></g><ellipse cx="30" cy="38" rx="27" ry="34" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1"/></svg>';},
  function(id){return'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 76"><defs><radialGradient id="eg'+id+'c" cx="38%" cy="30%" r="62%"><stop offset="0%" stop-color="#d0eeff"/><stop offset="55%" stop-color="#4ab0ff"/><stop offset="100%" stop-color="#1060c0"/></radialGradient></defs><ellipse cx="30" cy="38" rx="27" ry="34" fill="url(#eg'+id+'c)"/><g fill="rgba(255,255,255,0.8)"><polygon points="13,32 14.8,37.5 20.5,37.5 15.9,40.8 17.7,46.5 13,43.2 8.3,46.5 10.1,40.8 5.5,37.5 11.2,37.5" transform="scale(0.85) translate(2,0)"/><polygon points="42,16 43.5,21 49,21 44.7,24 46.2,29 42,26 37.8,29 39.3,24 35,21 40.5,21" transform="scale(0.75) translate(17,-2)"/><polygon points="42,50 43.2,54 47.5,54 44.2,56.5 45.4,60.5 42,58 38.6,60.5 39.8,56.5 36.5,54 40.8,54" transform="scale(0.7) translate(16,0)"/></g><ellipse cx="30" cy="38" rx="27" ry="34" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="1"/></svg>';},
  function(id){return'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 76"><defs><radialGradient id="eg'+id+'d" cx="38%" cy="30%" r="62%"><stop offset="0%" stop-color="#d8ffd0"/><stop offset="55%" stop-color="#50d860"/><stop offset="100%" stop-color="#208030"/></radialGradient></defs><ellipse cx="30" cy="38" rx="27" ry="34" fill="url(#eg'+id+'d)"/><g fill="rgba(255,255,255,0.75)"><circle cx="20" cy="28" r="4.5"/><circle cx="20" cy="28" r="2.2" fill="rgba(255,220,50,0.9)"/><circle cx="40" cy="28" r="4.5"/><circle cx="40" cy="28" r="2.2" fill="rgba(255,220,50,0.9)"/><circle cx="30" cy="50" r="4.5"/><circle cx="30" cy="50" r="2.2" fill="rgba(255,220,50,0.9)"/><circle cx="17" cy="44" r="3.5"/><circle cx="17" cy="44" r="1.8" fill="rgba(255,220,50,0.9)"/><circle cx="43" cy="44" r="3.5"/><circle cx="43" cy="44" r="1.8" fill="rgba(255,220,50,0.9)"/></g><ellipse cx="30" cy="38" rx="27" ry="34" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="1"/></svg>';},
  function(id){return'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 76"><defs><radialGradient id="eg'+id+'e" cx="38%" cy="30%" r="62%"><stop offset="0%" stop-color="#f0d8ff"/><stop offset="55%" stop-color="#c060ff"/><stop offset="100%" stop-color="#7020b0"/></radialGradient></defs><ellipse cx="30" cy="38" rx="27" ry="34" fill="url(#eg'+id+'e)"/><g fill="rgba(255,255,255,0.55)"><polygon points="10,24 18,24 14,18"/><polygon points="22,24 30,24 26,18"/><polygon points="34,24 42,24 38,18"/><polygon points="16,37 24,37 20,31"/><polygon points="28,37 36,37 32,31"/><polygon points="40,37 48,37 44,31"/><polygon points="10,50 18,50 14,44"/><polygon points="22,50 30,50 26,44"/><polygon points="34,50 42,50 38,44"/></g><ellipse cx="30" cy="38" rx="27" ry="34" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="1"/></svg>';},
  function(id){return'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 76"><defs><radialGradient id="eg'+id+'f" cx="38%" cy="30%" r="62%"><stop offset="0%" stop-color="#fff0d0"/><stop offset="55%" stop-color="#ff9030"/><stop offset="100%" stop-color="#c04808"/></radialGradient></defs><ellipse cx="30" cy="38" rx="27" ry="34" fill="url(#eg'+id+'f)"/><g stroke="rgba(255,255,255,0.65)" stroke-width="2.5" fill="none"><path d="M4,26 Q12,20 20,26 Q28,32 36,26 Q44,20 56,26"/><path d="M3,36 Q11,30 19,36 Q27,42 35,36 Q43,30 57,36"/><path d="M4,46 Q12,40 20,46 Q28,52 36,46 Q44,40 56,46"/></g><ellipse cx="30" cy="38" rx="27" ry="34" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="1"/></svg>';},
  function(id){return'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 76"><defs><radialGradient id="eg'+id+'g" cx="38%" cy="30%" r="62%"><stop offset="0%" stop-color="#ffd0d0"/><stop offset="55%" stop-color="#e02020"/><stop offset="100%" stop-color="#800808"/></radialGradient></defs><ellipse cx="30" cy="38" rx="27" ry="34" fill="url(#eg'+id+'g)"/><g fill="rgba(255,255,255,0.82)"><circle cx="18" cy="22" r="3.5"/><circle cx="32" cy="20" r="3"/><circle cx="44" cy="26" r="3.5"/><circle cx="12" cy="36" r="3"/><circle cx="26" cy="34" r="3.5"/><circle cx="40" cy="36" r="3"/><circle cx="16" cy="50" r="3"/><circle cx="30" cy="52" r="3.5"/><circle cx="44" cy="48" r="3"/></g><ellipse cx="30" cy="38" rx="27" ry="34" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="1"/></svg>';},
  function(id){return'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 76"><defs><radialGradient id="eg'+id+'h" cx="38%" cy="30%" r="62%"><stop offset="0%" stop-color="#d0fff8"/><stop offset="55%" stop-color="#20d8c8"/><stop offset="100%" stop-color="#008070"/></radialGradient></defs><ellipse cx="30" cy="38" rx="27" ry="34" fill="url(#eg'+id+'h)"/><g stroke="rgba(255,255,255,0.65)" stroke-width="1.8" fill="rgba(255,255,255,0.18)"><polygon points="20,22 28,28 20,34 12,28"/><polygon points="38,22 46,28 38,34 30,28"/><polygon points="20,44 28,50 20,56 12,50"/><polygon points="38,44 46,50 38,56 30,50"/></g><ellipse cx="30" cy="38" rx="27" ry="34" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="1"/></svg>';},
  function(id){return'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 76"><defs><linearGradient id="eg'+id+'i" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#ff6060"/><stop offset="25%" stop-color="#ffcc30"/><stop offset="50%" stop-color="#50e050"/><stop offset="75%" stop-color="#40b0ff"/><stop offset="100%" stop-color="#c060ff"/></linearGradient></defs><ellipse cx="30" cy="38" rx="27" ry="34" fill="url(#eg'+id+'i)"/><g stroke="rgba(255,255,255,0.4)" stroke-width="1.5" fill="none"><line x1="6" y1="14" x2="54" y2="14" transform="rotate(0,30,38)"/><line x1="4" y1="23" x2="56" y2="23"/><line x1="3" y1="33" x2="57" y2="33"/><line x1="3" y1="43" x2="57" y2="43"/><line x1="4" y1="53" x2="56" y2="53"/><line x1="6" y1="62" x2="54" y2="62"/></g><ellipse cx="30" cy="38" rx="27" ry="34" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="1.5"/></svg>';},
  function(id){return'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 76"><defs><radialGradient id="eg'+id+'j" cx="38%" cy="30%" r="62%"><stop offset="0%" stop-color="#ffffff"/><stop offset="60%" stop-color="#d8eeff"/><stop offset="100%" stop-color="#90c0f0"/></radialGradient></defs><ellipse cx="30" cy="38" rx="27" ry="34" fill="url(#eg'+id+'j)"/><g stroke="#4090d0" stroke-width="1.2" fill="none" opacity="0.7"><path d="M8,38 Q14,30 20,38 Q26,46 32,38 Q38,30 44,38 Q50,46 56,38"/><path d="M10,28 Q16,20 22,28 Q28,36 34,28 Q40,20 46,28"/><path d="M10,48 Q16,40 22,48 Q28,56 34,48 Q40,40 46,48"/><circle cx="30" cy="20" r="4" stroke-width="1.5"/><circle cx="16" cy="55" r="3"/><circle cx="44" cy="55" r="3"/></g><ellipse cx="30" cy="38" rx="27" ry="34" fill="none" stroke="rgba(100,160,220,0.4)" stroke-width="1.2"/></svg>';},
  function(id){return'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 76"><defs><radialGradient id="eg'+id+'k" cx="38%" cy="30%" r="62%"><stop offset="0%" stop-color="#f0ffc0"/><stop offset="55%" stop-color="#a0d820"/><stop offset="100%" stop-color="#508010"/></radialGradient></defs><ellipse cx="30" cy="38" rx="27" ry="34" fill="url(#eg'+id+'k)"/><g stroke="rgba(255,255,255,0.7)" stroke-width="2.2" fill="none"><polyline points="3,24 13,18 23,24 33,18 43,24 53,18"/><polyline points="3,38 13,32 23,38 33,32 43,38 53,32"/><polyline points="3,52 13,46 23,52 33,46 43,52 53,46"/></g><ellipse cx="30" cy="38" rx="27" ry="34" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="1"/></svg>';},
  function(id){return'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 76"><defs><radialGradient id="eg'+id+'l" cx="38%" cy="30%" r="62%"><stop offset="0%" stop-color="#fff0e8"/><stop offset="55%" stop-color="#ffb090"/><stop offset="100%" stop-color="#d06040"/></radialGradient></defs><ellipse cx="30" cy="38" rx="27" ry="34" fill="url(#eg'+id+'l)"/><g fill="rgba(255,255,255,0.72)"><circle cx="30" cy="22" r="3"/><ellipse cx="30" cy="18" rx="2.5" ry="4.5"/><ellipse cx="30" cy="26" rx="2.5" ry="4.5"/><ellipse cx="24" cy="22" rx="4.5" ry="2.5"/><ellipse cx="36" cy="22" rx="4.5" ry="2.5"/><circle cx="30" cy="22" r="2" fill="rgba(255,200,50,0.9)"/><circle cx="30" cy="50" r="2.8"/><ellipse cx="30" cy="45.5" rx="2.2" ry="4"/><ellipse cx="30" cy="54.5" rx="2.2" ry="4"/><ellipse cx="24.5" cy="50" rx="4" ry="2.2"/><ellipse cx="35.5" cy="50" rx="4" ry="2.2"/><circle cx="30" cy="50" r="1.8" fill="rgba(255,200,50,0.9)"/></g><ellipse cx="30" cy="38" rx="27" ry="34" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="1"/></svg>';}
];

function _easterEggsInit(){
  _easterEggsDestroy();
  var container = document.createElement('div');
  container.id = 'easter-eggs-layer';
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden;';
  document.body.appendChild(container);
  _easterEggsContainer = container;
  var eggCount = 10;
  var usedCols = [];
  for(var i=0; i<eggCount; i++) _easterEggSpawn(container, i, usedCols);
}

function _easterEggSpawn(container, idx, usedCols){
  var designIdx = Math.floor(Math.random() * _EASTER_EGG_DESIGNS.length);
  var id = 'ee'+(Date.now()%99999)+idx;
  var svg = _EASTER_EGG_DESIGNS[designIdx](id);
  var size = 28 + Math.random() * 24;
  var left;
  var tries = 0;
  do { left = 4 + Math.random() * 92; tries++; } while(tries < 24 && usedCols.some(function(c){ return Math.abs(c-left)<8; }));
  usedCols.push(left);
  var startY = -(size + Math.random() * 320);
  var duration = 22 + Math.random() * 18;
  var delay = Math.random() * -34;
  var rotation = (Math.random() - 0.5) * 18;
  var wobble = (Math.random() - 0.5) * 28;
  var blur = Math.random() < 0.35 ? (0.4 + Math.random() * 0.6) : 0;
  var scaleMid = 0.97 + Math.random() * 0.08;
  var fadeIn = 0.34 + Math.random() * 0.16;
  var fadeMid = 0.28 + Math.random() * 0.14;
  var fadeOut = 0.12 + Math.random() * 0.12;
  var div = document.createElement('div');
  div.className = 'easter-egg';
  div.style.cssText = 'position:absolute;width:'+size+'px;height:auto;left:'+left+'%;top:'+startY+'px;opacity:0;will-change:transform,opacity;filter:drop-shadow(0 10px 18px rgba(255,209,232,.10)) blur('+blur.toFixed(2)+'px) saturate(.88) brightness(1.02);';
  div.innerHTML = svg;
  var keyframes = '@keyframes eggFall'+id+'{'+
    '0%{transform:translate3d(0,0,0) rotate('+(-rotation/2).toFixed(2)+'deg) scale(.96);opacity:0;}'+
    '12%{opacity:'+fadeIn.toFixed(2)+';}'+
    '48%{transform:translate3d('+wobble.toFixed(2)+'px,48vh,0) rotate('+rotation.toFixed(2)+'deg) scale('+scaleMid.toFixed(2)+');opacity:'+fadeMid.toFixed(2)+';}'+
    '82%{opacity:'+fadeOut.toFixed(2)+';}'+
    '100%{transform:translate3d('+(wobble*0.45).toFixed(2)+'px,105vh,0) rotate('+(rotation*0.55).toFixed(2)+'deg) scale(.98);opacity:0;}'+
  '}';
  var style = document.createElement('style');
  style.id = 'ks-'+id;
  style.textContent = keyframes;
  document.head.appendChild(style);
  div.style.animation = 'eggFall'+id+' '+duration.toFixed(2)+'s ease-in-out '+delay.toFixed(2)+'s infinite';
  container.appendChild(div);
}

function _easterEggsDestroy(){
  var old = document.getElementById('easter-eggs-layer');
  if(old){ old.parentNode.removeChild(old); }
  _easterEggsContainer = null;
  document.querySelectorAll('style[id^="ks-ee"]').forEach(function(s){ s.parentNode.removeChild(s); });
}
/* ====== FIN EASTER EGG PARTICLE SYSTEM ====== */

function loadSavedTheme(){
  try{
    var saved = localStorage.getItem("np_theme") || "dark";
    if(saved.indexOf("theme-")===0) saved = saved.replace(/^theme-/, "");
    // Si thème événement, vérifier qu'on a le droit (après auth seulement)
    var _themePlayer = getThemeActorPlayer();
    if(saved !== "dark" && saved !== "light" && !canUseTheme(_themePlayer, saved)) saved = "dark";
    applyTheme(saved, false);
    updateHeaderLogoTheme();
    updateLaunchTheme();
    setAdaptiveThemeTokens();
  }catch(e){}
}

function unlockTheme(themeId){
  if(!CU){ notif("Connecte-toi pour débloquer ce thème.", "err"); return; }
  var t = getThemeById(themeId);
  if(!t || !t.event){ return; }
  var avail = getAvailableEventThemes();
  var isAvail = avail.some(function(th){ return th.id === themeId; });
  if(!isAvail){ notif("Ce thème n'est plus disponible au déblocage.", "err"); return; }
  if(hasUnlocked(themeId)){ notif("Tu possèdes déjà ce thème !", "inf"); return; }
  _authCall({action:"self_unlock_theme", themeId:themeId}).then(function(r){
    if(!r||!r.ok){ notif((r&&r.error)||"Impossible de débloquer ce thème.","err"); return; }
    _refreshPrivateCaches().then(function(){ renderAppearanceSection(); });
    notif("🎨 Thème « " + t.name + " » débloqué et ajouté à ta collection !", "ok");
  }).catch(function(){ notif("Erreur réseau.","err"); });
}



function renderThemeGrid(containerId){
  var el = ge(containerId); if(!el) return;
  var all = getVisibleThemesForCurrentViewer();
  var now = Date.now();
  var cur = _currentTheme;

  function themeRarity(t){
    if(t.id === "bloodmoon") return "Mythique";
    if(t.id === "aquaris") return "Premium";
    if(t.event) return "Saisonnier";
    if(t.id === "dark" || t.id === "light") return "Base";
    return "Classique";
  }

  function themeCategory(t){
    if(t.id === "bloodmoon" || t.id === "aquaris") return "Rares";
    if(t.event) return "Événement";
    if(t.id === "dark" || t.id === "light") return "Base";
    return "Classique";
  }

  function swatch(c){
    return '<span class="theme-swatch" style="background:'+esc(c)+';"></span>';
  }

  var h = '<div class="theme-collection-grid">';

  all.forEach(function(t){
    var isActive = cur === t.id;
    var isEvent  = !!t.event;
    var isLocked = !hasUnlocked(t.id);
    var isAvail  = isEvent && (t.availableUntil === 0 || t.availableUntil > now);

    var bg1 = t.preview[0] || "#0d0e18";
    var bg2 = t.preview[1] || "#7eb8d4";
    var bg3 = t.preview[2] || "#c9a84c";
    var rarity = themeRarity(t);
    var category = themeCategory(t);
    var state = isActive ? "selected" : (isLocked ? (isAvail ? "available" : "locked") : "owned");

    var onclick;
    if(isLocked && isEvent && isAvail){
      onclick = "unlockTheme('" + t.id + "')";
    } else if(isLocked){
      onclick = "notif('Ce thème n\\'est pas dans ta collection.','err')";
    } else {
      onclick = "applyTheme('" + t.id + "');renderAppearanceSection();";
    }

    var featured = (rarity === 'Mythique' || rarity === 'Premium' || category === 'Événement');
    h += '<article class="theme-card-premium collection-card np-theme-vault-card'+(featured?' is-featured':'')+(isLocked?' th-locked':'')+'"'
      + ' data-theme-id="'+esc(t.id)+'" data-theme-rarity="'+esc(rarity)+'" data-theme-category="'+esc(category)+'" data-theme-state="'+esc(state)+'"'
      + ' style="--card-bg:'+esc(bg1)+';--card-a:'+esc(bg2)+';--card-b:'+esc(bg3)+';" onclick="' + onclick + '">';
    h += '<div class="theme-topline" data-theme-eyebrow="'+esc(rarity)+'"><span class="theme-card-state">'+(isActive?'Équipé':(isLocked?(isAvail?'À débloquer':'Indisponible'):'Possédé'))+'</span></div>';
    h += '<div class="theme-preview-mini '+esc(t.id)+'" data-preview-theme="'+esc(t.id)+'">';
    h += '<div class="theme-preview-head"></div><div class="theme-preview-cards"><span></span><span></span><span></span></div><div class="theme-preview-bar"></div>';
    h += '</div>';
    h += '<div class="theme-card-body">';
    h += '<div class="theme-title">' + esc(t.name) + '</div>';
    if(t.desc) h += '<div class="tagline">' + esc(t.desc) + '</div>';
    if(isEvent && !isAvail && !isLocked) h += '<div class="theme-card-note">Dans ta collection</div>';
    h += '</div>';
    h += '<div class="theme-meta-row">';
    h += '<span class="theme-meta-pill" data-kind="rarity" data-rarity="'+esc(rarity)+'">'+esc(rarity)+'</span>';
    if(category !== rarity) h += '<span class="theme-meta-pill" data-kind="category">'+esc(category)+'</span>';
    h += '<span class="theme-palette">'+swatch(bg1)+swatch(bg2)+swatch(bg3)+'</span>';
    h += '</div>';
    h += '<div class="theme-card-action">'+(isActive?'Thème actif':(isLocked && isAvail?'Débloquer':(isLocked?'Non disponible':'Équiper')))+'</div>';
    h += '</article>';
  });

  h += '</div>';
  el.innerHTML = h;
}


function renderAppearanceSection(){
  var el = ge("appearance-section"); if(!el) return;
  // Le titre / descriptif sont déjà rendus dans l'écrou : ici on évite le doublon.
  el.innerHTML = "<style id='np-collection-width-polish'>"
    +".profile-collection-shell{width:min(100%,1320px);}"
    +".profile-collection-shell>.card{padding:18px !important;}"
    +".profile-collection-shell .theme-collection-grid{grid-template-columns:repeat(auto-fill,minmax(210px,1fr)) !important;gap:14px !important;align-items:stretch;}"
    +".profile-collection-shell .np-theme-vault-card{min-height:260px !important;border-radius:12px !important;padding:14px !important;}"
    +".profile-collection-shell .np-theme-vault-card.is-featured{grid-column:span 2;min-height:300px !important;}"
    +".profile-collection-shell .np-theme-vault-card.is-featured .theme-preview-mini{min-height:138px;}"
    +".profile-collection-shell .theme-preview-mini{min-height:116px;margin-top:6px !important;border-radius:10px !important;}"
    +".profile-collection-shell .theme-card-body{min-height:74px;}"
    +".profile-collection-shell .theme-title{font-size:15px;line-height:1.2;}"
    +".profile-collection-shell .tagline{font-size:12px;line-height:1.45;min-height:auto !important;}"
    +".profile-collection-shell .theme-meta-row{margin-top:auto;}"
    +"@media(max-width:900px){.profile-collection-shell .np-theme-vault-card.is-featured{grid-column:span 1;}}"
    +"</style><div id='theme-grid-container'></div>";
  renderThemeGrid("theme-grid-container");
}

// ── Admin : gestion thèmes événement ──────────────────
function renderAdminThemes(targetId){
  var target = targetId || (ge("p-admin-themes-db-c") ? "p-admin-themes-db-c" : "p-admin-themes-c");
  var el = ge(target); if(!el) return;
  if(!can("manage_mjs")){ el.innerHTML = ""; return; }
  var allThemes = getAllThemes();
  var playerAccounts = getAccounts().filter(function(a){ return String(a.role||"joueur").toLowerCase()==="joueur"; });
  var h = "<div class='card-title'>Gestion des thèmes</div>";
  h += "<div style='font-size:13px;color:var(--dim);line-height:1.7;margin:0 0 18px;'>Administre la visibilité, la distribution et les restrictions des thèmes. Les noms et descriptifs modifiés ici sont répercutés automatiquement dans la collection joueur.</div>";
  h += "<div style='display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px;'>";
  h += "<button class='btn btn-sm btn-grn' onclick='openCreateTheme()'><span>+ Créer un thème</span></button>";
  h += "<span style='font-family:var(--fd);font-size:10px;letter-spacing:1.8px;padding:7px 10px;border:1px solid var(--border2);color:var(--glacier);background:rgba(126,184,212,.05);'>"+playerAccounts.length+" joueur"+(playerAccounts.length>1?"s":"")+" ciblable"+(playerAccounts.length>1?"s":"")+"</span>";
  h += "</div>";
  if(!allThemes.length){
    h += "<div class='empty-state'><div class='empty-state-icon'>🎨</div><div class='empty-state-title'>Aucun thème</div></div>";
  } else {
    allThemes.forEach(function(t){
      var autoGrant = !!t.autoGrantAll;
      var isVisibleForPlayers = getAdminThemeVisibilityState(t.id);
      var isAlways = isAlwaysGrantedTheme(t.id);
      var bg1 = (t.preview && t.preview[0]) || "#0d0e18";
      var bg2 = (t.preview && t.preview[1]) || "#7eb8d4";
      var bg3 = (t.preview && t.preview[2]) || "#c9a84c";
      var selectId = "theme-grant-player-"+String(t.id).replace(/[^a-zA-Z0-9_-]/g,"_");
      var safeThemeId = jsesc(t.id);
      var options = '<option value="">Choisir un joueur…</option>';
      playerAccounts.forEach(function(acc){
        var owns = Array.isArray(acc.unlockedThemes) && acc.unlockedThemes.map(normalizeThemeId).indexOf(normalizeThemeId(t.id))>=0;
        options += '<option value="'+acc.id+'">'+esc(acc.pseudo)+(owns?' • déjà débloqué':'')+'</option>';
      });
      h += "<div class='card' data-theme-admin-card='"+safeThemeId+"' style='margin-top:14px;padding:18px 18px 16px;background:linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,.012));border-color:rgba(255,255,255,.08);box-shadow:0 18px 40px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.03);'>";
      h += "<div style='display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;'>";
      h += "<div data-theme-admin-preview='"+safeThemeId+"' style='width:110px;min-width:110px;height:74px;border-radius:10px;flex-shrink:0;border:1px solid "+(isVisibleForPlayers?"rgba(126,184,212,.30)":"rgba(255,255,255,.08)")+";box-shadow:0 10px 26px rgba(0,0,0,.22);background:linear-gradient(145deg,"+bg1+", "+bg3+");position:relative;overflow:hidden;opacity:"+(isVisibleForPlayers?"1":".58")+";transition:opacity .18s ease,border-color .18s ease,box-shadow .18s ease;'></div>";
      h += "<div style='flex:1;min-width:260px;'>";
      h += "<div style='display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px;'>";
      h += "<div data-theme-admin-name='"+safeThemeId+"' style='font-family:var(--fd);font-size:12px;letter-spacing:2px;color:var(--text);opacity:"+(isVisibleForPlayers?"1":".72")+";transition:opacity .18s ease;'>"+esc(t.name)+"</div>";
      if(autoGrant) h += "<span style='font-family:var(--fd);font-size:8px;letter-spacing:1.6px;padding:4px 8px;border:1px solid rgba(126,184,212,.35);color:var(--glacier-bright);border-radius:999px;background:rgba(126,184,212,.08);'>AUTO TOUS</span>";
      h += "<button class='btn btn-sm' style='margin-left:auto;' onclick=\"openEditTheme('"+safeThemeId+"')\"><span>✎ Modifier</span></button>";
      h += "</div>";
      h += "<div style='font-size:12px;color:var(--dim);line-height:1.7;margin-bottom:12px;'>"+esc(t.desc||"Aucune description.")+"</div>";
      h += "<div style='display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:10px;align-items:stretch;'>";
      h += "<div style='min-width:0;'>";
      h += "<div style='font-family:var(--fd);font-size:9px;letter-spacing:1.6px;color:var(--faint);margin-bottom:6px;'>DON MANUEL</div>";
      h += "<select id='"+selectId+"' style='width:100%;padding:10px 12px;border:1px solid var(--border2);background:var(--bg3);color:var(--text);font-size:13px;border-radius:8px;'>"+options+"</select>";
      h += "<button class='btn btn-sm' style='width:100%;margin-top:8px;border-color:var(--glacier-dim);color:var(--glacier);' onclick=\"(function(){var sel=ge('"+selectId+"'); if(!sel||!sel.value){notif('Choisis un joueur.','err'); return;} grantThemeToAccount(sel.value,'"+safeThemeId+"');})();\"><span>Donner au joueur</span></button>";
      h += "</div>";
      h += "<div>";
      h += "<div style='font-family:var(--fd);font-size:9px;letter-spacing:1.6px;color:var(--faint);margin-bottom:6px;'>VISIBILITÉ JOUEURS</div>";
      h += "<div data-theme-admin-visibility-box='"+safeThemeId+"' style='width:100%;min-height:42px;padding:10px 12px;border-radius:10px;border:1px solid "+(isVisibleForPlayers?"rgba(126,184,212,.24)":"rgba(255,255,255,.08)")+";background:rgba(6,10,20,.55);display:flex;align-items:center;justify-content:space-between;gap:12px;transition:border-color .18s ease,box-shadow .18s ease;'>";
      h += "<div style='min-width:0;display:flex;flex-direction:column;gap:2px;'>";
      h += "<span data-theme-admin-visibility-label='"+safeThemeId+"' style='font-family:var(--fd);font-size:9px;letter-spacing:1.6px;color:"+(isVisibleForPlayers?"var(--glacier-bright)":"var(--faint)")+";'>"+(isAlways?"TOUJOURS VISIBLE":(isVisibleForPlayers?"VISIBLE":"NON VISIBLE"))+"</span>";
      h += "<span data-theme-admin-visibility-text='"+safeThemeId+"' style='font-size:11px;color:var(--faint);line-height:1.4;'>"+(isAlways?"Attribué à tout le monde. Ce thème reste visible pour tous les joueurs.":(isVisibleForPlayers?"Les joueurs voient ce thème dans leur collection.":"Les joueurs ne voient pas ce thème dans leur collection."))+"</span>";
      h += "</div>";
      h += "<button type='button' class='theme-vis-btn "+(isVisibleForPlayers?"is-on":"")+"' data-action='theme-visibility-toggle' data-theme-id='"+safeThemeId+"' style='margin-left:auto;' "+(isAlways?"disabled aria-disabled='true'":"")+"></button>";
      h += "</div>";
      h += "</div>";
      h += "<div>";
      h += "<div style='font-family:var(--fd);font-size:9px;letter-spacing:1.6px;color:var(--faint);margin-bottom:6px;'>DISTRIBUTION</div>";
      if(isAlways){
        h += '<button class="btn btn-sm" style="width:100%;height:42px;opacity:.6;cursor:not-allowed;" disabled><span>Attribué à tout le monde</span></button>';
        h += "<div style='font-size:11px;color:var(--faint);line-height:1.5;margin-top:8px;'>Le thème est donné automatiquement à tous les comptes joueur.</div>";
      }else{
        h += "<button class='btn btn-sm btn-gold' style='width:100%;height:42px;' onclick=\"grantThemeToAllPlayers('"+safeThemeId+"')\"><span>Donner à tous</span></button>";
        h += "<div style='font-size:11px;color:var(--faint);line-height:1.5;margin-top:8px;'>Ajoute le thème à tous les comptes joueur existants.</div>";
      }
      h += "</div>";
      h += "</div>";
      h += "</div>";
      h += "</div>";
      h += "</div>";
    });
  }
  el.innerHTML = h;
}

function upsertEventTheme(themeId, patch){
  var id = normalizeThemeId(themeId);
  if(!id) return null;
  var themes = sto("event_themes") || [];
  var idx = Array.isArray(themes) ? themes.findIndex(function(t){ return normalizeThemeId(t && t.id) === id; }) : -1;
  var base = idx >= 0 ? _normalizeThemeEntryRecord(themes[idx], id) : (getThemeById(id) || { id: id, event:true, preview:["#0d0e18","#7eb8d4","#c9a84c"] });
  var next = Object.assign({}, base, patch||{});
  if(next.visible===undefined && base && typeof base.visible==='boolean') next.visible = base.visible;
  next.id = id;
  if(next.event !== true) next.event = true;
  if(idx >= 0) themes[idx] = next;
  else themes.push(next);
  sv("event_themes", themes);
  return next;
}
function isThemeAutoGranted(themeId){
  var t = getThemeById(themeId);
  return !!(t && t.autoGrantAll);
}
function grantThemeToAccount(accountId, themeId){
  if(!isAdminRole(CU)) return;
  var t = getThemeById(themeId);
  if(!t){ notif("Thème introuvable.","err"); return; }
  var acc=getAccounts().find(function(a){ return a.id===accountId; });
  _authCall({action:"admin_grant_theme", accountId:accountId, themeId:themeId}).then(function(r){
    if(!r||!r.ok){ notif((r&&r.error)||"Impossible de donner ce thème.","err"); return; }
    notif("🎨 Thème « "+t.name+" » donné à "+(acc?acc.pseudo:"ce joueur")+".","ok");
    _refreshPrivateCaches().then(function(){ renderAdminThemes(); });
  }).catch(function(){ notif("Erreur réseau.","err"); });
}


function grantThemeToAllPlayers(themeId){
  if(!isAdminRole(CU)) return;
  var t = getThemeById(themeId);
  if(!t){ notif("Thème introuvable.","err"); return; }
  _authCall({action:"admin_grant_theme_all", themeId:themeId}).then(function(r){
    if(!r||!r.ok){ notif((r&&r.error)||"Impossible de distribuer ce thème.","err"); return; }
    if(!r.changed){ notif("Tous les joueurs possèdent déjà ce thème.","inf"); return; }
    notif("🎁 Thème « "+t.name+" » donné à "+r.changed+" joueur"+(r.changed>1?"s":"")+".","ok");
    _refreshPrivateCaches().then(function(){ renderAdminThemes(); });
  }).catch(function(){ notif("Erreur réseau.","err"); });
}


function __applyThemeVisibilityLocal(themeId, visible){
  var id = normalizeThemeId(themeId);
  if(!id) return;
  var nextMap = Object.assign({}, getThemeVisibilityMap());
  nextMap[id] = !!visible;
  ALWAYS_GRANTED_THEME_IDS.forEach(function(alwaysId){ nextMap[normalizeThemeId(alwaysId)] = true; });
  _dbCache.theme_visibility = nextMap;
  try{ localStorage.setItem("np_theme_visibility", JSON.stringify(nextMap)); }catch(e){}
  try{ sv("theme_visibility", nextMap); }catch(e){}
  window.VISIBLE_THEMES = Object.keys(nextMap).filter(function(key){ return nextMap[key] === true; });
}
function __syncThemeVisibilityButton(btnEl, visible, busy){
  if(!btnEl) return;
  btnEl.classList.toggle('is-on', !!visible);
  btnEl.classList.toggle('is-busy', !!busy);
  btnEl.setAttribute('aria-pressed', visible ? 'true' : 'false');
  btnEl.setAttribute('aria-busy', busy ? 'true' : 'false');
}
function __forEachThemeAdminNode(attrName, themeId, cb){
  var id = normalizeThemeId(themeId);
  if(!id || !attrName || !cb || typeof document === 'undefined') return;
  Array.prototype.forEach.call(document.querySelectorAll('['+attrName+']'), function(node){
    if(normalizeThemeId(node.getAttribute(attrName)) !== id) return;
    cb(node);
  });
}
function __getThemeAdminVisibilityCopy(themeId, visible){
  var id = normalizeThemeId(themeId);
  var isAlways = isAlwaysGrantedTheme(id);
  var shown = isAlways ? true : !!visible;
  return {
    shown: shown,
    label: isAlways ? 'TOUJOURS VISIBLE' : (shown ? 'VISIBLE' : 'NON VISIBLE'),
    text: isAlways ? 'Attribué à tout le monde. Ce thème reste visible pour tous les joueurs.' : (shown ? 'Les joueurs voient ce thème dans leur collection.' : 'Les joueurs ne voient pas ce thème dans leur collection.'),
    labelColor: shown ? 'var(--glacier-bright)' : 'var(--faint)',
    previewBorder: shown ? 'rgba(126,184,212,.30)' : 'rgba(255,255,255,.08)',
    visibilityBorder: shown ? 'rgba(126,184,212,.24)' : 'rgba(255,255,255,.08)',
    previewOpacity: shown ? '1' : '.58',
    nameOpacity: shown ? '1' : '.72'
  };
}
function __syncThemeAdminCard(themeId, visible, busy){
  var id = normalizeThemeId(themeId);
  if(!id) return;
  var state = __getThemeAdminVisibilityCopy(id, visible);
  __forEachThemeAdminNode('data-theme-admin-preview', id, function(node){
    node.style.opacity = state.previewOpacity;
    node.style.borderColor = state.previewBorder;
  });
  __forEachThemeAdminNode('data-theme-admin-name', id, function(node){
    node.style.opacity = state.nameOpacity;
  });
  __forEachThemeAdminNode('data-theme-admin-visibility-box', id, function(node){
    node.style.borderColor = state.visibilityBorder;
  });
  __forEachThemeAdminNode('data-theme-admin-visibility-label', id, function(node){
    node.textContent = state.label;
    node.style.color = state.labelColor;
  });
  __forEachThemeAdminNode('data-theme-admin-visibility-text', id, function(node){
    node.textContent = state.text;
  });
  Array.prototype.forEach.call(document.querySelectorAll('.theme-vis-btn[data-theme-id]'), function(btn){
    if(normalizeThemeId(btn.getAttribute('data-theme-id')) !== id) return;
    __syncThemeVisibilityButton(btn, state.shown, !!busy);
    if(isAlwaysGrantedTheme(id)) btn.disabled = true;
  });
}
function setThemeVisibility(themeId, visible, inputEl){
  if(!CU || String(CU.role||'').toLowerCase()!=='admin') return false;
  var id = normalizeThemeId(themeId);
  if(!id) return false;
  var t = getThemeById(id);
  if(isAlwaysGrantedTheme(id)){
    __syncThemeAdminCard(id, true, false);
    if(inputEl) inputEl.disabled = true;
    notif("Les thèmes donnés à tout le monde restent visibles.", "inf");
    return false;
  }
  window.__themeVisibilityBusy = window.__themeVisibilityBusy || {};
  if(window.__themeVisibilityBusy[id]) return false;
  var current = getThemeVisibilityState(id);
  var nextVisible = !!visible;
  window.__themeVisibilityBusy[id] = true;
  __syncThemeAdminCard(id, nextVisible, true);
  _authCall({action:'admin_set_theme_visibility', themeId:id, visible:nextVisible}).then(function(r){
    if(!r || !r.ok) throw new Error((r&&r.error)||'Impossible de modifier la visibilité.');
    var nextMap = (r.themeVisibility && typeof r.themeVisibility === 'object' && !Array.isArray(r.themeVisibility)) ? r.themeVisibility : null;
    if(nextMap){
      var normalizedMap = {};
      Object.keys(nextMap).forEach(function(key){ normalizedMap[normalizeThemeId(key)] = !!nextMap[key]; });
      ALWAYS_GRANTED_THEME_IDS.forEach(function(alwaysId){ normalizedMap[normalizeThemeId(alwaysId)] = true; });
      _dbCache.theme_visibility = normalizedMap;
      try{ localStorage.setItem("np_theme_visibility", JSON.stringify(normalizedMap)); }catch(e){}
      try{ sv("theme_visibility", normalizedMap); }catch(e){}
      window.VISIBLE_THEMES = Object.keys(normalizedMap).filter(function(key){ return normalizedMap[key] === true; });
    }else{
      __applyThemeVisibilityLocal(id, nextVisible);
    }
    __syncThemeAdminCard(id, getThemeVisibilityState(id), false);
    notif("Visibilité du thème « "+(t?t.name:id)+" » mise à jour.", 'ok');
    try{ renderAppearanceSection(); }catch(e){}
    try{ if(typeof renderCollection==='function') renderCollection(); }catch(e){}
  }).catch(function(err){
    __syncThemeAdminCard(id, current, false);
    notif((err&&err.message)||'Erreur réseau.', 'err');
  }).finally(function(){
    delete window.__themeVisibilityBusy[id];
  });
  return false;
}
function toggleThemeVisibilityButton(themeId, btnEl){
  var id = normalizeThemeId(themeId);
  if(!id) return false;
  return setThemeVisibility(id, !getThemeVisibilityState(id), btnEl);
}
window.handleThemeVisibilityClick = toggleThemeVisibilityButton;
function __bindThemeVisibilityDelegation(){
  if(window.__themeVisibilityDelegationBound) return;
  window.__themeVisibilityDelegationBound = true;
  document.addEventListener('click', function(ev){
    var btn = ev.target && ev.target.closest ? ev.target.closest('.theme-vis-btn[data-action="theme-visibility-toggle"]') : null;
    if(!btn) return;
    ev.preventDefault();
    ev.stopPropagation();
    if(btn.disabled) return false;
    return toggleThemeVisibilityButton(btn.getAttribute('data-theme-id'), btn);
  });
}
try{ __bindThemeVisibilityDelegation(); }catch(e){}
function toggleThemeAutoGrant(themeId){
  if(!isAdminRole(CU)) return;
  var t = getThemeById(themeId);
  if(!t){ notif("Thème introuvable.","err"); return; }
  var next = !isThemeAutoGranted(themeId);
  upsertEventTheme(themeId, { autoGrantAll: next });
  notif(next ? "Distribution automatique activée pour « "+t.name+" »." : "Distribution automatique désactivée pour « "+t.name+" ».", next?"ok":"inf");
  renderAdminThemes();
}

function _ensureThemeModal(){
  var root = ge("staff-modal-root");
  if(!root) return null;
  var modal = ge("m-theme");
  if(modal) return modal;
  root.insertAdjacentHTML("beforeend", ''
    + '<div id="m-theme" class="moverlay">'
    + '<div class="modal" style="max-width:460px;">'
    + '<button class="mclose" onclick="closeModal(\'m-theme\')">✕</button>'
    + '<div class="mtit" id="mth-title">Thème événement</div>'
    + '<input type="hidden" id="mth-id">'
    + '<div class="frow"><label class="flbl">Nom du thème</label><input type="text" id="mth-name" placeholder="Pâques..."></div>'
    + '<div class="frow"><label class="flbl">Description</label><input type="text" id="mth-desc" placeholder="Thème de printemps..."></div>'
    + '<div class="frow"><label class="flbl">Classe CSS (optionnel)</label><input type="text" id="mth-cls" placeholder="theme-easter"></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">'
    + '<div class="frow"><label class="flbl">Fond</label><input type="color" id="mth-bg" value="#0d0e18" style="height:42px;padding:4px;cursor:pointer;"></div>'
    + '<div class="frow"><label class="flbl">Accent</label><input type="color" id="mth-accent" value="#7eb8d4" style="height:42px;padding:4px;cursor:pointer;"></div>'
    + '<div class="frow"><label class="flbl">Or</label><input type="color" id="mth-gold" value="#c9a84c" style="height:42px;padding:4px;cursor:pointer;"></div>'
    + '</div>'
    + '<div class="frow"><label class="flbl">Disponible jusqu\'au</label><input type="date" id="mth-until"></div>'
    + '<p class="errmsg" id="mth-err"></p>'
    + '<div class="factions">'
    + '<button class="btn btn-sm" onclick="closeModal(\'m-theme\')"><span>Annuler</span></button>'
    + '<button class="btn btn-sm btn-grn" onclick="saveTheme()"><span>Enregistrer</span></button>'
    + '</div>'
    + '</div></div>'
  );
  modal = ge("m-theme");
  if(modal && !modal.dataset.boundClose){
    modal.addEventListener("click", function(e){
      if(e.target !== modal) return;
      modal.classList.remove("open");
    });
    modal.dataset.boundClose = "1";
  }
  return modal;
}

function openCreateTheme(){
  if(!can("manage_mjs")) return;
  _buildStaffModals();
  var m = _ensureThemeModal();
  if(!m){ notif("Recharge la page.", "err"); return; }
  ge("mth-id").value = "theme_"+Date.now();
  ge("mth-name").value = "";
  ge("mth-desc").value = "";
  ge("mth-cls").value = "";
  ge("mth-bg").value = "#0d0e18";
  ge("mth-accent").value = "#7eb8d4";
  ge("mth-gold").value = "#c9a84c";
  ge("mth-until").value = "";
  ge("mth-err").textContent = "";
  ge("mth-title").textContent = "Créer un thème événement";
  openModal("m-theme");
}

function openEditTheme(id){
  if(!can("manage_mjs")) return;
  _buildStaffModals();
  if(!_ensureThemeModal()){ notif("Recharge la page.", "err"); return; }
  var themes = sto("event_themes") || [];
  var t = themes.find(function(th){ return th.id === id; });
  if(!t) return;
  ge("mth-id").value = t.id;
  ge("mth-name").value = t.name;
  ge("mth-desc").value = t.desc||"";
  ge("mth-cls").value = t.cls||"";
  ge("mth-bg").value = t.preview[0]||"#0d0e18";
  ge("mth-accent").value = t.preview[1]||"#7eb8d4";
  ge("mth-gold").value = t.preview[2]||"#c9a84c";
  var d = t.availableUntil && t.availableUntil > 0 ? new Date(t.availableUntil) : null;
  ge("mth-until").value = d ? (d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")) : "";
  ge("mth-err").textContent = "";
  ge("mth-title").textContent = "Modifier le thème";
  openModal("m-theme");
}

function saveTheme(){
  if(!can("manage_mjs")) return;
  var id      = ge("mth-id").value.trim();
  var name    = ge("mth-name").value.trim();
  var desc    = ge("mth-desc").value.trim();
  var cls     = ge("mth-cls").value.trim();
  var bg      = ge("mth-bg").value;
  var accent  = ge("mth-accent").value;
  var gold    = ge("mth-gold").value;
  var until   = ge("mth-until").value;
  if(!name){ ge("mth-err").textContent="Nom obligatoire."; return; }
  var untilTs = until ? new Date(until).getTime() : 0;
  var themes = sto("event_themes") || [];
  var existing = themes.findIndex(function(t){ return t.id===id; });
  var prev = existing >= 0 ? themes[existing] : null;
  var obj = { id:id, name:name, desc:desc, cls:cls, preview:[bg,accent,gold], event:true, availableUntil:untilTs, createdAt:(prev&&prev.createdAt)||Date.now(), autoGrantAll: !!(prev&&prev.autoGrantAll), visible: !!(prev&&prev.visible) };
  if(existing >= 0) themes[existing] = obj;
  else themes.push(obj);
  sv("event_themes", themes);
  closeModal("m-theme");
  renderAdminThemes();
  notif("Thème « "+name+" » enregistré.", "ok");
}

function launchApp(){
  // Revalider le thème — priorité au thème du compte si défini et possédé
  (function(){
    try{
      var saved = getPreferredThemeForCurrentUser();
      if(saved.indexOf("theme-")===0) saved=saved.replace(/^theme-/,"");
      var baseThemes=["dark","light","violet","red","green"];
      if(baseThemes.indexOf(saved)<0){
        if(!isThemeVisibleForPlayer(saved) || !hasUnlocked(saved)){ applyTheme("dark",true); }
        else { _currentTheme=saved; applyTheme(saved,false); }
      } else {
        _currentTheme=saved;
        applyTheme(saved,false);
      }
    }catch(e){}
  })();
  updateLaunchTheme();
  // Retirer le loader immédiatement
  var loader=document.getElementById("db-loader");
  if(loader){ loader.style.display="none"; loader.remove(); }
  // initStorage() uniquement ici — après auth confirmée (CU est défini)
  if(!window._storageInitDone){ window._storageInitDone=true; _primeGlobalUiLayers();
initStorage(); }
  try{ _migrateLegacyCombatArchivesForCurrentSession().then(function(migrated){ if(migrated){ try{ notif("Archives du simulateur restaurées.","ok"); }catch(e){} } }).catch(function(){}); }catch(e){}

  // Bandeau hors-ligne si DB indisponible
  var banner=ge("offline-banner");
  if(banner){
    if(_dbOffline){
      banner.style.display="flex";
      // Tentative de reconnexion silencieuse toutes les 30s
      if(!window._offlineRetryInterval){
        window._offlineRetryInterval=setInterval(function(){
          _dbCall({action:"ping"}).then(function(r){
            if(!r || r.ok !== true) return;
            // DB revenue — recharger silencieusement les données
            _dbOffline=false;
            clearInterval(window._offlineRetryInterval);
            window._offlineRetryInterval=null;
            if(banner) banner.style.display="none";
            notif("Connexion rétablie — données synchronisées.","ok");
            _dbCall({action:"get_all"}).then(function(data){
              if(data&&data.data) _dbCache=data.data;
            }).catch(function(){});
          }).catch(function(){});
        }, 30000);
      }
    } else {
      banner.style.display="none";
    }
  }
  _viewPid=CU.pid; // initialiser la vue sur le perso lié
  var sapp=ge("s-app");
  var root=ge("app-root");
  [sapp,root].forEach(function(el){
    if(!el) return;
    el.className=el.className.replace(/\bis-(staff|admin|mj|designer|player|joueur)\b/g,"").trim();
  });
  var role=roleKey(CU);
  var isStaff=role!=="joueur";
  var isPending=!!(CU.pending)&&role==="joueur"; // jamais pending pour le staff
  if(isStaff){
    sapp.classList.add("is-staff","is-"+role);
    root.classList.add("is-staff","is-"+role);
    CU.type="staff";
  } else if(isPending){
    sapp.classList.add("is-player","is-pending");
    root.classList.add("is-player","is-pending");
    CU.type="player";
  } else {
    sapp.classList.add("is-player");
    root.classList.add("is-player");
    CU.type="player";
  }
  // Afficher les onglets personnage si perso lié
  if(CU.pid){
    sapp.classList.add("has-character");
    root.classList.add("has-character");
  }
  updateHdrProfile();

  // Injecter le drawer mobile depuis template (absent du DOM public)
  var drawerRoot = document.getElementById("mobile-drawer-root");
  var drawerTpl  = document.getElementById("tpl-mobile-drawer");
  if(drawerTpl && drawerRoot && !document.getElementById("mobile-drawer")){
    drawerRoot.appendChild(document.importNode(drawerTpl.content, true));
    closeMobileDrawer();
  }

  // Afficher les éléments privés du header
  var hdrProfile = document.getElementById("hdr-profile");
  var hdrSettings = document.getElementById("hdr-settings-btn");
  if(hdrProfile)  hdrProfile.style.display  = "";
  if(hdrSettings) hdrSettings.style.display = "";

  // Injecter la nav staff depuis le template si rôle staff
  if(isStaff){
    _buildStaffModals(); // toutes les modales staff dans #staff-modal-root
    var tpl = document.getElementById("tpl-staff-nav");
    var placeholder = document.getElementById("staff-nav-placeholder");
    if(tpl && placeholder && !placeholder.querySelector(".nav-dropdown.staff-only")){
      var clone = document.importNode(tpl.content, true);
      placeholder.appendChild(clone);
    }
    var drawerStaff = document.getElementById("drawer-staff-section");
    if(drawerStaff) drawerStaff.style.display = "";
  }

  showScreen("s-app");

  if(isStaff){
    if(role==="designer"){
      switchDropTab("bestiaire",null,"dd-joueurs");
    } else {
      switchDropTab("accueil",null,"dd-joueurs");
      _buildJoueursTab();
      renderSPList();
      popSSelects();
    }
    if(role==="admin"){
      _buildJoueursTab();
      renderMJList();
      setTimeout(function(){ renderPendingAccounts(); updatePendingBadge(); startAdminPoll(); }, 0);
    }
  } else if(isPending){
    switchDropTab("accueil",null,"dd-joueurs");
    renderSynopsis("p-synopsis-c");
    // Message explicite "compte en attente" — pas un échec de connexion
    setTimeout(function(){
      // Retirer l'ancien message si présent
      var old=ge("pending-banner-msg"); if(old) old.remove();
      var banner=document.createElement("div");
      banner.id="pending-banner-msg";
      banner.style.cssText="padding:20px 24px;background:rgba(201,168,76,0.06);border:0.5px solid rgba(201,168,76,0.3);margin:24px 0 0;border-radius:2px;box-shadow:0 4px 20px rgba(0,0,0,.3);";
      banner.innerHTML=
        '<div style="font-family:var(--fd);font-size:8px;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:10px;display:flex;align-items:center;gap:8px;">'
        +'<span style="opacity:.7;">◎</span> En attente de validation'
        +'</div>'
        +'<div style="font-size:14px;color:var(--text);line-height:1.7;">'
        +'Bienvenue, <strong style="color:var(--glacier);">'+esc(CU.pseudo||CU.name)+'</strong>. '
        +'Un Maître du Jeu doit lier ton compte à un personnage avant que tu puisses accéder à ta fiche.'
        +'</div>'
        +'<div style="font-size:12px;color:var(--faint);margin-top:8px;font-style:italic;">Rafraîchis la page une fois la liaison effectuée.</div>';
      var accueilEl=ge("p-accueil-c");
      if(accueilEl) accueilEl.insertBefore(banner,accueilEl.firstChild);
    },400);
  } else {
    switchDropTab("accueil",null,"dd-joueurs");
  }
  if(!isPending) renderView();
  renderBGrid("p-bgrd",isStaff);
  renderCombat("p-combat-c");
  renderRegles("p-regles-c");
  renderAllSerments("p-serments-c");
  renderSynopsis("p-synopsis-c");
  setTimeout(function(){ updateNotifBadge(); }, 500);
  if(!isStaff&&!isPending){
    switchDropTab("synopsis",null,"dd-joueurs");
  }
}

function updatePendingBadge(){
  if(!can("manage_mjs")) return;
  var n=getAccounts().filter(function(a){ return (a.role==="joueur"||!a.role)&&!a.pid; }).length;
  // Badge header
  var badge=ge("pending-badge");
  if(badge){ badge.textContent=n; badge.style.display=n>0?"inline-block":"none"; }
  // Badge bouton Staff (nav)
  var navBadge=ge("nav-pending-badge");
  if(navBadge){ navBadge.textContent=n; navBadge.style.display=n>0?"inline-flex":"none"; }
  // Badge item Joueurs (dans le dropdown)
  var itemBadge=ge("dd-joueurs-pending-badge");
  if(itemBadge){ itemBadge.textContent=n; itemBadge.style.display=n>0?"inline-block":"none"; }
}

function renderPendingTab(){
  var el=ge("t-pending-c"); if(!el) return;
  var accounts=getAccounts();
  var pending=accounts.filter(function(a){ return (a.role==="joueur"||!a.role)&&!a.pid; });
  var players=gp();
  var availablePlayers=players.filter(function(p){
    return !accounts.find(function(a){ return a.pid===p.id; });
  });
  if(!pending.length){
    el.innerHTML='<div class="card" style="text-align:center;padding:40px;"><div style="font-size:32px;margin-bottom:12px;">✓</div><div style="font-family:var(--fd);font-size:12px;letter-spacing:2px;color:var(--green);">Aucune fiche n\'est en attente</div></div>';
    return;
  }
  var html='<div style="font-family:var(--fd);font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--gold);margin-bottom:16px;">'+pending.length+' compte(s) en attente de liaison</div>';
  html+=pending.map(function(a){
    var date=new Date(a.createdAt).toLocaleDateString("fr-FR")+' — '+new Date(a.createdAt).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
    var opts='<option value="">— Choisir un personnage —</option>';
    opts+=availablePlayers.map(function(p){ return '<option value="'+p.id+'">'+esc(p.name)+' — '+esc(p.classe)+'</option>'; }).join("");
    return '<div class="card mb16" style="border-color:var(--gold);background:rgba(201,168,76,.03);">'
      +'<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">'
        +'<div style="width:40px;height:40px;background:var(--bg4);border:1px solid var(--gold);display:flex;align-items:center;justify-content:center;font-family:var(--fd);font-size:16px;color:var(--gold);flex-shrink:0;">'+a.pseudo[0].toUpperCase()+'</div>'
        +'<div><div style="font-family:var(--fd);font-size:14px;letter-spacing:1px;">'+esc(a.pseudo)+'</div>'
        +'<div style="font-size:14px;color:var(--dim);font-style:italic;">Inscrit le '+date+'</div></div>'
        +'<div class="sp"></div>'
        +'<button class="btn btn-sm btn-red" onclick="deleteAccount(\''+a.id+'\')"><span>Refuser</span></button>'
      +'</div>'
      +'<select id="link-sel-'+a.id+'" style="width:100%;margin-bottom:10px;font-size:14px;padding:10px 13px;">'+opts+'</select>'
      +'<button class="btn btn-grn" style="width:100%;padding:11px;" onclick="linkAccount(\''+a.id+'\')"><span>Lier ce compte à un personnage</span></button>'
    +'</div>';
  }).join("");
  el.innerHTML=html;
  if(_tab==="themes"){
    try{ renderAdminThemes("p-admin-themes-db-c"); }catch(e){ console.error("renderAdminThemes DB", e); }
  }
}

async function loadAuditLogAdmin(force){
  if(!isAdminRole(CU)) return [];
  if(_auditLoading) return _auditLog||[];
  if(!force && _auditLoadedOnce) return _auditLog||[];
  _auditLoading=true;
  try{
    var r = await _authCall({action:"admin_get_audit_log"});
    if(r && r.ok){
      _auditLog = Array.isArray(r.logs)?r.logs:[];
      _auditLoadedOnce = true;
    }
    else {
      _auditLoadedOnce = true;
      notif((r&&r.error)||"Impossible de charger le journal de sécurité.","err");
    }
  }catch(e){
    _auditLoadedOnce = true;
    notif("Impossible de charger le journal de sécurité.","err");
  }finally{ _auditLoading=false; }
  return _auditLog||[];
}
function openDatabaseInnerTab(tabKey){
  var next = tabKey || "comptes";
  window._dbTab = next;
  if(next === "audit"){
    _auditPage = 0;
    renderDatabase();
    loadAuditLogAdmin(!_auditLoadedOnce).then(function(){
      if(window._dbTab === "audit") renderDatabase();
    }).catch(function(){
      if(window._dbTab === "audit") renderDatabase();
    });
  } else {
    renderDatabase();
  }
  setTimeout(function(){
    if(typeof _focusOnScreen === 'function') _focusOnScreen('database','smooth');
  },10);
}
function openAuditLogAdmin(){
  openDatabaseInnerTab("audit");
}
function _renderAuditEntries(entries){
  var list = Array.isArray(entries)?entries.slice():[];
  list.sort(function(a,b){ return (b.ts||0)-(a.ts||0); });
  var q=(window._auditFilter||"").toLowerCase();
  var actionFilter=(window._auditActionFilter||"").toLowerCase();
  var actorFilter=(window._auditActorFilter||"").toLowerCase();
  var fromTs=window._auditDateFrom ? new Date(window._auditDateFrom+"T00:00:00").getTime() : 0;
  var toTs=window._auditDateTo ? new Date(window._auditDateTo+"T23:59:59").getTime() : 0;
  if(q || actionFilter || actorFilter || fromTs || toTs){
    list=list.filter(function(e){
      var actor=(e.actor&&e.actor.pseudo)||e.actor||"";
      var role=(e.actor&&e.actor.role)||"";
      var action=(e.action||"").toLowerCase();
      var details=JSON.stringify(e.details||{});
      var blob=(actor+" "+role+" "+action+" "+details).toLowerCase();
      if(q && blob.indexOf(q)===-1) return false;
      if(actionFilter && action!==actionFilter) return false;
      if(actorFilter && (actor+" "+role).toLowerCase().indexOf(actorFilter)===-1) return false;
      var ts=e.ts||0;
      if(fromTs && ts<fromTs) return false;
      if(toTs && ts>toTs) return false;
      return true;
    });
  }
  var total=list.length;
  var totalPages=Math.max(1, Math.ceil(total/_AUDIT_PAGE_SIZE));
  _auditPage=Math.max(0, Math.min(_auditPage,totalPages-1));
  var start=_auditPage*_AUDIT_PAGE_SIZE;
  var page=list.slice(start, start+_AUDIT_PAGE_SIZE);

  var actions=[];
  list.forEach(function(e){ var a=String(e.action||""); if(a && actions.indexOf(a)===-1) actions.push(a); });
  actions.sort();

  var h='';
  h+='<div class="card" style="padding:14px 16px;margin-bottom:14px;background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.015));border-color:var(--border2);">';
  h+='<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:12px;">';
  h+='<div><div style="font-family:var(--fd);font-size:11px;letter-spacing:2px;color:var(--gold);text-transform:uppercase;">Filtres premium</div><div style="font-size:12px;color:var(--faint);margin-top:4px;">Recherche, action, acteur et période.</div></div>';
  h+='<div style="font-family:var(--fm);font-size:11px;color:var(--faint);">'+total+' entrée'+(total>1?'s':'')+'</div>';
  h+='</div>';
  h+='<div style="display:grid;grid-template-columns:1.35fr .9fr .9fr .75fr .75fr auto;gap:8px;align-items:end;">';
  h+='<div><div style="font-size:11px;color:var(--faint);margin-bottom:4px;">Recherche</div><input type="text" placeholder="acteur, rôle, action, détails..." value="'+esc(window._auditFilter||"")+'" oninput="window._auditFilter=this.value;_auditPage=0;renderDatabase()" style="width:100%;padding:10px 12px;font-size:13px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);"></div>';
  h+='<div><div style="font-size:11px;color:var(--faint);margin-bottom:4px;">Action</div><select onchange="window._auditActionFilter=this.value;_auditPage=0;renderDatabase()" style="width:100%;padding:10px 12px;font-size:13px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);"><option value="">Toutes</option>'+actions.map(function(a){ return '<option value="'+esc(a)+'"'+((window._auditActionFilter||"")===a?' selected':'')+'>'+esc(String(a).replace(/_/g,' '))+'</option>'; }).join('')+'</select></div>';
  h+='<div><div style="font-size:11px;color:var(--faint);margin-bottom:4px;">Acteur / rôle</div><input type="text" placeholder="admin, pseudo..." value="'+esc(window._auditActorFilter||"")+'" oninput="window._auditActorFilter=this.value;_auditPage=0;renderDatabase()" style="width:100%;padding:10px 12px;font-size:13px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);"></div>';
  h+='<div><div style="font-size:11px;color:var(--faint);margin-bottom:4px;">Du</div><input type="date" value="'+esc(window._auditDateFrom||"")+'" onchange="window._auditDateFrom=this.value;_auditPage=0;renderDatabase()" style="width:100%;padding:10px 12px;font-size:13px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);"></div>';
  h+='<div><div style="font-size:11px;color:var(--faint);margin-bottom:4px;">Au</div><input type="date" value="'+esc(window._auditDateTo||"")+'" onchange="window._auditDateTo=this.value;_auditPage=0;renderDatabase()" style="width:100%;padding:10px 12px;font-size:13px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);"></div>';
  h+='<div style="display:flex;gap:8px;justify-content:flex-end;">';
  if(window._auditFilter || window._auditActionFilter || window._auditActorFilter || window._auditDateFrom || window._auditDateTo){
    h+='<button class="btn btn-sm" onclick="window._auditFilter=\'\';window._auditActionFilter=\'\';window._auditActorFilter=\'\';window._auditDateFrom=\'\';window._auditDateTo=\'\';_auditPage=0;renderDatabase()"><span>Réinitialiser</span></button>';
  }
  h+='<button class="btn btn-sm" onclick="loadAuditLogAdmin(true).then(function(){renderDatabase();})"><span>⟳ Rafraîchir</span></button>';
  h+='</div>';
  h+='</div>';
  h+='</div>';

  if(!total){ h+='<p class="iempty">Aucune entrée dans le journal de sécurité.</p>'; return h; }
  h+='<div style="display:flex;flex-direction:column;gap:8px;">';
  page.forEach(function(e){
    var actor=(e.actor&&e.actor.pseudo)||e.actor||"Système";
    var role=(e.actor&&e.actor.role)||"";
    var details=e.details||{};
    var detailsHtml='';
    try{
      var keys=Object.keys(details||{});
      if(keys.length){
        detailsHtml='<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;">'+keys.slice(0,8).map(function(k){ return '<span style="font-size:11px;padding:4px 8px;border:1px solid var(--border2);background:var(--bg4);color:var(--faint);">'+esc(k)+': <strong style="color:var(--text);">'+esc(String(details[k]))+'</strong></span>'; }).join('')+'</div>';
      }
    }catch(_e){}
    h+='<div class="card" style="padding:14px 16px;border-left:3px solid var(--glacier);">';
    h+='<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;">';
    h+='<div style="min-width:0;flex:1;">';
    h+='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">';
    h+='<span style="font-family:var(--fd);font-size:10px;letter-spacing:2px;color:var(--glacier);">'+esc(String(e.action||'audit').replace(/_/g,' ')).toUpperCase()+'</span>';
    if(role) h+='<span style="font-size:10px;padding:2px 6px;border:1px solid var(--border2);color:var(--gold);">'+esc(role)+'</span>';
    h+='</div>';
    h+='<div style="margin-top:6px;font-size:14px;color:var(--text);">'+esc(actor)+'</div>';
    h+='<div style="margin-top:4px;font-size:11px;color:var(--faint);">'+esc(fdt(e.ts||0))+'</div>';
    h+=detailsHtml;
    h+='</div></div></div>';
  });
  h+='</div>';
  if(totalPages>1){
    h+='<div style="display:flex;justify-content:center;gap:6px;margin-top:12px;flex-wrap:wrap;">';
    for(var i=Math.max(0,_auditPage-2); i<=Math.min(totalPages-1,_auditPage+2); i++){
      h+='<button class="btn btn-sm'+(i===_auditPage?' btn-gold':'')+'" onclick="_auditPage='+i+';renderDatabase()"><span>'+(i+1)+'</span></button>';
    }
    h+='</div>';
  }
  return h;
}


function _themeNameForDb(themeId){
  var t = getThemeById ? getThemeById(themeId) : null;
  return t && t.name ? t.name : String(themeId||"");
}
function _renderOwnedThemesDb(account){
  var ids = Array.isArray(account && account.unlockedThemes) ? account.unlockedThemes.filter(Boolean) : [];
  if(!ids.length) return '<span style="color:var(--faint);">—</span>';
  return ids.map(function(themeId){
    var selected = normalizeThemeId(account && account.selectedTheme) === normalizeThemeId(themeId);
    var label = _themeNameForDb(themeId);
    return '<span style="display:inline-flex;align-items:center;gap:6px;margin:2px;padding:4px 8px;border:1px solid '+(selected?'var(--glacier)':'var(--border2)')+';background:'+(selected?'rgba(126,184,212,.12)':'var(--bg3)')+';border-radius:999px;font-size:11px;color:'+(selected?'var(--text)':'var(--dim)')+';">'
      + '<span>'+esc(label)+'</span>'
      + '<button type="button" onclick="adminRevokeThemeFromAccount(\''+jsesc(account.id)+'\',\''+jsesc(themeId)+'\')" title="Retirer ce thème" style="border:none;background:transparent;color:var(--red);cursor:pointer;font-size:11px;line-height:1;padding:0;">✕</button>'
      + '</span>';
  }).join('');
}

function jsesc(v){
  return String(v==null ? "" : v)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\\"');
}
function adminRevokeThemeFromDb(accountId, themeId){
  return adminRevokeThemeFromAccount(accountId, themeId);
}

function adminRevokeThemeFromAccount(accountId, themeId){
  if(!isAdminRole(CU)) return;
  var acc = (getAccounts()||[]).find(function(a){ return a && a.id === accountId; });
  var t = getThemeById ? getThemeById(themeId) : null;
  var accountLabel = acc && acc.pseudo ? acc.pseudo : "ce joueur";
  var themeLabel = t && t.name ? t.name : themeId;
  if(!confirm('Retirer le thème "'+themeLabel+'" à '+accountLabel+' ?')) return;
  _authCall({action:"admin_revoke_theme", accountId:accountId, themeId:themeId}).then(function(r){
    if(!r || !r.ok){ notif((r&&r.error)||"Impossible de retirer ce thème.","err"); return; }
    notif('🧹 Thème « '+themeLabel+' » retiré à '+accountLabel+'.',"ok");
    _refreshPrivateCaches().then(function(){
      try{ renderDatabase(); }catch(e){}
      try{ renderAdminThemes(); }catch(e){}
    });
  }).catch(function(){ notif("Erreur réseau.","err"); });
}

function renderDatabase(){
  var el=ge("t-database-c"); if(!el) return;
  if(!isAdminRole(CU)){ el.innerHTML=""; return; }
  // Les comptes sont désormais rechargés via session_bundle si nécessaire.
  var accounts=getAccounts();
  var players=gp();
  var roleCols={admin:"var(--red)",mj:"var(--gold)",designer:"var(--purple)",joueur:"var(--glacier)"};
  var roleLabels={admin:"Admin",mj:"MJ",designer:"Designer",joueur:"Joueur"};
  var roles=["joueur","mj","designer","admin"];
  var _tab=window._dbTab||"comptes";

  // --- Onglets internes ---
  var tabs=[{k:"comptes",l:"Comptes"},{k:"themes",l:"Thèmes"},{k:"historiques",l:"Log"},{k:"audit",l:"Sécurité"}];
  var html='<div class="warnbox" style="margin-bottom:16px;">⚠ Données confidentielles — Accès administrateur uniquement.</div>';
  html+='<div style="display:flex;gap:4px;margin-bottom:20px;border-bottom:1px solid var(--border2);padding-bottom:0;">';
  tabs.forEach(function(t){
    var active=_tab===t.k;
    html+='<button onclick="openDatabaseInnerTab(\''+t.k+'\')" style="font-family:var(--fd);font-size:11px;letter-spacing:2px;text-transform:uppercase;padding:10px 18px;border:none;background:transparent;cursor:pointer;color:'+(active?'var(--glacier)':'var(--dim)')+';border-bottom:2px solid '+(active?'var(--glacier)':'transparent')+';transition:all .2s;">'+t.l+'</button>';
  });
  html+='</div>';

  // ================================================================
  if(_tab==="comptes"){
    html+='<div class="card">';
    html+='<div class="card-title">Tous les comptes ('+accounts.length+')</div>';
    if(!accounts.length){ html+='<p class="iempty">Aucun compte.</p>'; }
    else{
      
    // Filtres DB
    var _dbSort=window._dbSort||{col:"",dir:1};
    var _dbFilter=window._dbFilter||"";
    var accFiltered=accounts.slice();
    if(_dbFilter){
      var q=_dbFilter.toLowerCase();
      accFiltered=accFiltered.filter(function(a){
        return (a.pseudo||"").toLowerCase().indexOf(q)>-1
          ||(a.role||"").toLowerCase().indexOf(q)>-1
          ||((a.pid?players.find(function(x){return x.id===a.pid;}):null)&&(players.find(function(x){return x.id===a.pid;})||{}).name||"").toLowerCase().indexOf(q)>-1;
      });
    }
    if(_dbSort.col){
      accFiltered.sort(function(a,b){
        var va="",vb="";
        if(_dbSort.col==="pseudo"){va=a.pseudo||"";vb=b.pseudo||"";}
        else if(_dbSort.col==="role"){va=a.role||"";vb=b.role||"";}
        else if(_dbSort.col==="lastSeen"){va=a.lastSeen||0;vb=b.lastSeen||0;return _dbSort.dir*(vb-va);}
        else if(_dbSort.col==="createdAt"){va=a.createdAt||0;vb=b.createdAt||0;return _dbSort.dir*(vb-va);}
        return _dbSort.dir*va.localeCompare(vb,"fr");
      });
    }

    function thSort(col,label){
      var isActive=_dbSort.col===col;
      var arrow=isActive?(_dbSort.dir>0?" ↑":" ↓"):"";
      return '<th style="cursor:pointer;user-select:none;'+(isActive?'color:var(--glacier);':'')+'white-space:nowrap;" onclick="window._dbSort={col:\''+col+'\',dir:'+(isActive?'(_dbSort.dir*-1)':'1')+'};renderDatabase()">'+label+arrow+'</th>';
    }

    html+='<div style="display:flex;gap:8px;margin-bottom:12px;align-items:center;">';
    html+='<input type="text" placeholder="Rechercher (pseudo, rôle, perso)..." value="'+(_dbFilter||"")+'" oninput="window._dbFilter=this.value;renderDatabase()" style="flex:1;padding:6px 10px;font-size:13px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);">';
    if(_dbFilter) html+='<button class="btn btn-sm" onclick="window._dbFilter=\'\';renderDatabase()" style="border-color:var(--faint);color:var(--faint);"><span>✕</span></button>';
    html+='<span style="font-family:var(--fm);font-size:11px;color:var(--faint);">'+accFiltered.length+' / '+accounts.length+'</span>';
    html+='</div>';

    html+='<table class="rtbl"><thead><tr>'+thSort("pseudo","Pseudo")+'<th>Mot de passe</th>'+thSort("role","Rôle")+'<th>Personnage lié</th><th>Thèmes</th>'+thSort("lastSeen","Dernière activité")+thSort("createdAt","Créé le")+'<th></th></tr></thead><tbody>';
      accFiltered.forEach(function(a){
        var role=a.role||"joueur";
        var col=roleCols[role]||"var(--dim)";
        var p=a.pid?players.find(function(x){return x.id===a.pid;}):null;
        var date=new Date(a.createdAt).toLocaleDateString("fr-FR")+' — '+new Date(a.createdAt).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
        var isLastAdmin=role==="admin"&&accounts.filter(function(x){return x.role==="admin";}).length<=1;
        var roleSel='<select onchange="dbSetRole(\''+a.id+'\',this.value)" style="font-size:14px;padding:3px 6px;border:1px solid '+col+';color:'+col+';background:var(--bg3);"'+(isLastAdmin?' disabled':'')+' >';
        roles.forEach(function(r){ roleSel+='<option value="'+r+'"'+(role===r?' selected':'')+'>'+roleLabels[r]+'</option>'; });
        roleSel+='</select>';
        var relink='<select onchange="setAccountPid(\''+a.id+'\',this.value)" style="font-size:14px;padding:3px 6px;max-width:120px;"><option value="">— Aucun —</option>';
        players.forEach(function(pl){ relink+='<option value="'+pl.id+'"'+(a.pid===pl.id?' selected':'')+'>'+pl.name+'</option>'; });
        relink+='</select>';
        var ts=a.lastSeen;
        var activite;
        if(!ts){
          activite='<span style="color:var(--faint);font-style:italic;font-size:13px;">Jamais connecté</span>';
        } else {
          var diff=Date.now()-ts;
          var mins=Math.floor(diff/60000);
          var hrs=Math.floor(mins/60);
          var days=Math.floor(hrs/24);
          var ago=days>0?days+"j":(hrs>0?hrs+"h":(mins>0?mins+" min":"À l'instant"));
          var dateStr=new Date(ts).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"2-digit"});
          activite='<span style="font-family:var(--fm);font-size:13px;color:var(--glacier);">'+ago+'</span> <span style="font-size:12px;color:var(--faint);">— '+dateStr+'</span>';
        }
        html+='<tr>'
          +'<td style="font-family:var(--fd);font-size:12px;">'+esc(a.pseudo)+'</td>'
          +'<td>'
          +(a.pass==="reset"
            ?'<span style="font-family:var(--fd);font-size:9px;letter-spacing:1px;color:var(--gold);padding:2px 6px;border:1px solid rgba(201,160,76,.4);">⚠ RÉINITIALISÉ</span>'
            :'<span style="font-family:var(--fm);color:var(--faint);letter-spacing:2px;">••••••••</span>'
          )
          +' <button class="btn btn-sm" style="margin-left:4px;border-color:var(--glacier-dim);color:var(--glacier-dim);" onclick="openEditPassSafe(\''+a.id+'\',\''+encodeURIComponent(a.pseudo||'')+'\')" title="Changer le mot de passe"><span>✎</span></button>'
          +' <button class="btn btn-sm" style="margin-left:2px;border-color:rgba(201,160,76,.5);color:var(--gold);font-size:10px;" onclick="resetAccountPass(\''+a.id+'\')" title="Mot de passe oublié — le joueur pourra se reconnecter avec son pseudo seul et définir un nouveau mot de passe"><span>🔑 Reset</span></button>'
          +'</td>'
          +'<td>'+roleSel+'</td>'
          +'<td>'+relink+(a.pid?'<button class="btn btn-sm" style="margin-left:4px;border-color:var(--faint);color:var(--faint);" onclick="unlinkAccount(\''+a.id+'\')"><span>✕</span></button>':'')+(a.pid?'<button class="btn btn-sm" style="margin-left:4px;border-color:var(--glacier-dim);color:var(--glacier);" onclick="loadPlayer(\''+a.pid+'\');switchTab(\'t-fiche\',null);" title="Aller à la fiche"><span>→</span></button>':'')+'</td>'
          +'<td style="max-width:340px;">'+(role==="joueur"?_renderOwnedThemesDb(a):'<span style="color:var(--faint);">—</span>')+'</td>'
          +'<td>'+activite+'</td>'
          +'<td style="color:var(--dim);">'+date+'</td>'
          +'<td>'+(!isLastAdmin?'<button class="btn btn-sm btn-red" onclick="deleteAccount(\''+a.id+'\')"><span>Suppr.</span></button>':'')+'</td>'
        +'</tr>';
      });
      html+='</tbody></table>';
    }
    html+='</div>';
  }

  // ================================================================
  else if(_tab==="themes"){
    html+='<div id="p-admin-themes-db-c"></div>';
  }

  // ================================================================
  else if(_tab==="historiques"){
    var allEntries=[];
    // — Entrées history des personnages (stat changes, gems, etc.)
    players.forEach(function(p){
      (p.history||[]).forEach(function(h,i){
        allEntries.push({ts:h.ts||0,action:h.type||"stat",detail:h.text||h.msg||"",actor:h.by||"?",target:p.name+" ("+esc(p.classe)+")",pid:p.id,hidx:i,src:"history"});
      });
    });
    // — Log système global
    getSysLog().forEach(function(e){
      allEntries.push({ts:e.ts,action:e.action,detail:e.detail,actor:e.actor,target:"",src:"syslog"});
    });
    allEntries.sort(function(a,b){return b.ts-a.ts;});

    // Archives
    var archives=getSysLogArchive();

    html+='<div class="card">';
    // Header
    html+='<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px;">';
    html+='<div style="font-family:var(--fd);font-size:10px;letter-spacing:3px;color:var(--glacier);">LOG SYSTÈME</div>';
    html+='<div style="display:flex;gap:6px;flex-wrap:wrap;">';
    html+='<button class="btn btn-sm" onclick="_logPage=0;_logShowArchive=null;renderDatabase()" style="border-color:var(--glacier-dim);color:var(--glacier-dim);"><span>En cours ('+allEntries.length+')</span></button>';
    if(archives.length) html+='<button class="btn btn-sm" onclick="_logPage=0;_logShowArchive=\'list\';renderDatabase()" style="border-color:var(--purple);color:var(--purple);"><span>Archives ('+archives.length+')</span></button>';
    html+='<button class="btn btn-sm btn-gold" onclick="archiveSysLog()" title="Archiver les logs actifs et repartir à zéro"><span>📦 Archiver</span></button>';
    if(allEntries.length) html+='<button class="btn btn-sm btn-red" onclick="clearAllHistory()"><span>Tout vider</span></button>';
    html+='</div></div>';

    // Vue archives
    if(_logShowArchive==="list"){
      if(!archives.length){ html+='<p class="iempty">Aucune archive.</p>'; }
      else{
        html+='<div style="display:flex;flex-direction:column;gap:6px;">';
        archives.forEach(function(a,ai){
          html+='<div style="background:var(--bg4);border:1px solid var(--border);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">';
          // Infos
          html+='<div style="flex:1;min-width:0;">';
          html+='<div style="font-family:var(--fd);font-size:12px;color:var(--glacier);margin-bottom:3px;">'+a.label+'</div>';
          html+='<div style="font-size:11px;color:var(--faint);">'+a.entries.length+' entrée'+(a.entries.length>1?'s':'')+(a.filename?' · '+a.filename+'.txt':'')+'</div>';
          html+='</div>';
          // Actions
          html+='<div style="display:flex;gap:6px;flex-shrink:0;">';
          html+='<button class="btn btn-sm" style="border-color:var(--glacier-dim);color:var(--glacier-dim);" onclick="_logPage=0;_logShowArchive='+ai+';renderDatabase()"><span>👁 Voir</span></button>';
          html+='<button class="btn btn-sm btn-gold" onclick="downloadArchive('+ai+')" title="Télécharger en .txt"><span>⬇ DL</span></button>';
          html+='<button class="btn btn-sm btn-red" onclick="deleteArchive('+ai+')" title="Supprimer cette archive"><span>✕</span></button>';
          html+='</div>';
          html+='</div>';
        });
        html+='</div>';
      }
    } else if(typeof _logShowArchive==="number"){
      var arc=archives[_logShowArchive];
      if(arc){
        html+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;">';
        html+='<button class="btn btn-sm" onclick="_logPage=0;_logShowArchive=\'list\';renderDatabase()"><span>← Archives</span></button>';
        html+='<span style="font-family:var(--fd);font-size:11px;color:var(--glacier);flex:1;">'+arc.label+' — '+arc.entries.length+' entrée'+(arc.entries.length>1?'s':'')+'</span>';
        html+='<button class="btn btn-sm btn-gold" onclick="downloadArchive('+_logShowArchive+')" title="Télécharger"><span>⬇ Télécharger</span></button>';
        html+='<button class="btn btn-sm btn-red" onclick="deleteArchive('+_logShowArchive+')" title="Supprimer"><span>✕ Supprimer</span></button>';
        html+='</div>';
        html+=_renderLogEntries(arc.entries,false);
      }
    } else {
      // Vue principale
      if(!allEntries.length){
        html+='<p class="iempty">Aucune entrée dans le log.</p>';
      } else {
        html+=_renderLogEntries(allEntries,true);
      }
    }
    html+='</div>';
  }

  else if(_tab==="audit"){
    if(!_auditLoading && !_auditLoadedOnce){
      loadAuditLogAdmin(true).then(function(){ if(window._dbTab==="audit") renderDatabase(); }).catch(function(){ if(window._dbTab==="audit") renderDatabase(); });
    }
    html+='<div class="card">';
    html+='<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px;">';
    html+='<div><div class="card-title">Journal de sécurité</div><div style="font-size:12px;color:var(--faint);margin-top:4px;">Connexions, resets, rôles, liaisons et actions sensibles.</div></div>';
    html+='<div style="display:flex;gap:8px;flex-wrap:wrap;">';
    html+='<button class="btn btn-sm" onclick="runQaSmokeAndRefresh()"><span>QA rapide</span></button>';
    html+='<button class="btn btn-sm btn-gold" onclick="loadAuditLogAdmin(true).then(function(){renderDatabase();})"><span>⟳ Recharger</span></button>';
    html+='</div>';
    html+='</div>';
    html += renderQaReport();
    if(_auditLoading && !(_auditLog&&_auditLog.length)) html+='<p class="iempty">Chargement du journal de sécurité…</p>';
    else html+=_renderAuditEntries(_auditLog||[]);
    html+='</div>';
  }

  // ================================================================



  el.innerHTML=html;
  if(_tab==="themes"){
    try{ renderAdminThemes("p-admin-themes-db-c"); }catch(e){ console.error("renderAdminThemes DB", e); }
  }
}


function renderQaReport(){
  var rep = window._qaReport;
  if(!rep || !Array.isArray(rep.results)) return '';
  var ok = rep.results.filter(function(x){ return x.ok && !x.skipped; }).length;
  var fail = rep.results.filter(function(x){ return !x.ok && !x.skipped; }).length;
  var skip = rep.results.filter(function(x){ return x.skipped; }).length;
  return '<div class="card" style="margin-bottom:16px;">'
    + '<div class="card-title">QA rapide</div>'
    + '<div style="display:flex;gap:10px;flex-wrap:wrap;">'
    + '<span class="chip ok">OK '+ok+'</span>'
    + '<span class="chip '+(fail?'danger':'')+'">Échecs '+fail+'</span>'
    + '<span class="chip">Ignorés '+skip+'</span>'
    + '</div></div>';
}
async function runQaSmokeAndRefresh(){
  try{
    if(!CU || String(CU.role||'').toLowerCase()!=='admin'){ if(typeof notif==='function') notif('Réservé admin','err'); return; }
    var routes = [
      { key:'accueil', tab:'accueil', el:'p-accueil-c' },
      { key:'joueurs', tab:'joueurs', el:'p-joueurs-c' },
      { key:'simulation', tab:'combat-mj', el:'p-combat-mj-c' },
      { key:'database', tab:'database', el:'t-database-c' }
    ];
    var cur = (typeof _navCurrent!=='undefined' ? _navCurrent : null);
    var results = [];
    for(var i=0;i<routes.length;i++){
      var r = routes[i];
      try{
        if(typeof switchTab==='function') switchTab(r.tab,null,true);
        var el = document.getElementById(r.el);
        results.push({ key:r.key, ok:!!el, skipped:false });
      }catch(err){
        results.push({ key:r.key, ok:false, error:(err&&err.message)||String(err) });
      }
    }
    if(cur && typeof switchTab==='function') switchTab(cur,null,true);
    window._qaReport = { ts: Date.now(), results: results };
    if(typeof renderDatabase==='function') renderDatabase();
  }catch(e){
    console.error('runQaSmokeAndRefresh failed', e);
  }
}

function _renderLogEntries(entries,canDelete){
  var total=entries.length;
  var totalPages=Math.max(1,Math.ceil(total/_LOG_PAGE_SIZE));
  _logPage=Math.max(0,Math.min(_logPage,totalPages-1));
  var start=_logPage*_LOG_PAGE_SIZE;
  var page=entries.slice(start,start+_LOG_PAGE_SIZE);

  var ACTION_META={
    // stats perso (history)
    "stat":{col:"var(--glacier)",icon:"📊"},
    "add":{col:"var(--green)",icon:"➕"},
    "remove":{col:"var(--red)",icon:"➖"},
    "consume":{col:"var(--gold)",icon:"◎"},
    // connexions
    "connexion":{col:"var(--glacier)",icon:"🔑"},
    "deconnexion":{col:"var(--faint)",icon:"🚪"},
    // comptes
    "compte_cree":{col:"var(--green)",icon:"👤"},
    "compte_supprime":{col:"var(--red)",icon:"🗑️"},
    "mdp_change":{col:"var(--gold)",icon:"🔒"},
    "mdp_reset":{col:"var(--red)",icon:"🔓"},
    // liaisons
    "liaison":{col:"var(--glacier)",icon:"🔗"},
    "deliaison":{col:"var(--red)",icon:"🔗"},
    // personnages
    "personnage_cree":{col:"var(--green)",icon:"👤"},
    "personnage_supprime":{col:"var(--red)",icon:"🗑️"},
    "stats_modif":{col:"var(--gold)",icon:"✎"},
    "serment_change":{col:"var(--purple)",icon:"⇄"},
    "branche_change":{col:"var(--purple)",icon:"⇄"},
    // ajustements live
    "adj_level":{col:"var(--gold)",icon:"⬆"},
    "adj_xp":{col:"var(--glacier)",icon:"✦"},
    "adj_sLevel":{col:"var(--glacier-bright)",icon:"⬆"},
    "adj_sXp":{col:"var(--glacier-bright)",icon:"✦"},
    // gemmes
    "gemme_ajout":{col:"var(--purple)",icon:"💎"},
    "gemme_supprime":{col:"var(--red)",icon:"💎"},
    "drop_gemme":{col:"var(--purple)",icon:"💎"},
    // bestiaire
    "creature_ajout":{col:"var(--green)",icon:"🐾"},
    "creature_supprime":{col:"var(--red)",icon:"🐾"},
    "creature_modif":{col:"var(--gold)",icon:"🐾"},
    // combat
    "combat_debut":{col:"var(--red)",icon:"⚔"},
    "combat_action":{col:"var(--red)",icon:"⚔"},
    "combat_fin":{col:"var(--glacier)",icon:"⚔"},
    "drop":{col:"var(--gold)",icon:"🎲"},
    "roll":{col:"var(--gold)",icon:"🎲"},
    // historique
    "history_clear":{col:"var(--red)",icon:"🗑️"},
    "history_delete":{col:"var(--red)",icon:"🗑️"},
    "statut_pose":{col:"var(--gold)",icon:"⚠"},
    "statut_retire":{col:"var(--green)",icon:"✓"},
    // événements
    "event_cree":{col:"var(--green)",icon:"📅"},
    "event_modif":{col:"var(--gold)",icon:"📅"},
    "event_supprime":{col:"var(--red)",icon:"📅"},
    "event_visibilite":{col:"var(--gold)",icon:"👁"},
    "event_inscription":{col:"var(--green)",icon:"✓"},
    "event_desinscription":{col:"var(--red)",icon:"✕"},
  };
  function getMeta(action){
    return ACTION_META[action]||{col:"var(--dim)",icon:"•"};
  }

  var h='';
  // Pagination header
  if(totalPages>1){
    h+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;flex-wrap:wrap;">';
    h+='<span style="font-family:var(--fm);font-size:12px;color:var(--dim);">Page '+((_logPage+1))+' / '+totalPages+' ('+total+' entrées)</span>';
    h+='<div style="display:flex;gap:4px;margin-left:auto;">';
    if(_logPage>0) h+='<button class="btn btn-sm" onclick="_logPage=0;renderDatabase()"><span>«</span></button><button class="btn btn-sm" onclick="_logPage--;renderDatabase()"><span>‹</span></button>';
    if(_logPage<totalPages-1) h+='<button class="btn btn-sm" onclick="_logPage++;renderDatabase()"><span>›</span></button><button class="btn btn-sm" onclick="_logPage='+( totalPages-1)+';renderDatabase()"><span>»</span></button>';
    h+='</div></div>';
  }

  h+='<div style="display:flex;flex-direction:column;gap:4px;">';
  page.forEach(function(e){
    var meta=getMeta(e.action||e.type);
    h+='<div style="display:flex;gap:10px;align-items:flex-start;padding:8px 10px;background:var(--bg3);border-left:2px solid '+meta.col+';margin-bottom:1px;">';
    h+='<span style="font-size:14px;flex-shrink:0;margin-top:1px;">'+meta.icon+'</span>';
    h+='<div style="flex:1;min-width:0;">';
    // Ligne principale
    var mainText=e.detail||e.text||"";
    h+='<div style="font-size:13px;color:var(--text);line-height:1.5;">'+mainText+'</div>';
    // Meta
    h+='<div style="display:flex;gap:10px;margin-top:3px;flex-wrap:wrap;">';
    h+='<span style="font-family:var(--fm);font-size:10px;color:var(--glacier-dim);">'+fdt(e.ts)+'</span>';
    if(e.actor) h+='<span style="font-size:10px;color:var(--dim);">par <strong style="color:var(--text);">'+e.actor+'</strong></span>';
    if(e.target||e.pname) h+='<span style="font-size:10px;color:var(--faint);">→ '+(e.target||e.pname+(e.pclasse?' ('+e.pclasse+')':''))+'</span>';
    if(e.action&&e.action!=="stat") h+='<span style="font-family:var(--fd);font-size:8px;letter-spacing:1px;padding:1px 6px;border:0.5px solid '+meta.col+';color:'+meta.col+';opacity:.7;">'+e.action.toUpperCase()+'</span>';
    h+='</div>';
    h+='</div>';
    // Bouton supprimer (uniquement log actif + historiques perso)
    if(canDelete&&e.src==="history"&&e.pid!=null){
      h+='<button onclick="deleteHistoryEntry(\''+e.pid+'\','+e.hidx+')" style="background:none;border:none;color:var(--faint);cursor:pointer;font-size:13px;padding:0 4px;flex-shrink:0;opacity:.4;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=.4" title="Supprimer">✕</button>';
    }
    h+='</div>';
  });
  h+='</div>';

  // Pagination footer
  if(totalPages>1){
    h+='<div style="display:flex;justify-content:center;gap:4px;margin-top:10px;">';
    var pStart=Math.max(0,_logPage-3); var pEnd=Math.min(totalPages-1,_logPage+3);
    for(var pi=pStart;pi<=pEnd;pi++){
      var isActive=pi===_logPage;
      h+='<button class="btn btn-sm'+(isActive?' btn-gold':'')+'" onclick="_logPage='+pi+';renderDatabase()"><span>'+(pi+1)+'</span></button>';
    }
    h+='</div>';
  }
  return h;
}

function clearAllHistory(){
  if(!can("manage_players")){notif("Non autorisé.","err");return;}
  if(!confirm("Vider tout le log de tous les personnages ?")) return;
  var ps=gp();
  var total=ps.reduce(function(acc,p){return acc+(p.history||[]).length;},0);
  ps.forEach(function(p){p.history=[];});
  sp(ps);
  sysLog("history_clear","Historique complet vidé ("+total+" entrées)",CU?CU.name:"Staff");
  notif("Log vidé.","inf");
  renderDatabase();
}
function deleteHistoryEntry(pid,idx){
  if(!CU||CU.type!=="staff"){ return; }
  if(!can("manage_players")){notif("Non autorisé.","err");return;}
  var ps=gp();
  var p=ps.find(function(x){return x.id===pid;});
  if(!p||!p.history) return;
  var entry=p.history[idx]||{};
  sysLog("history_delete","Entrée supprimée pour '"+esc(p.name)+"' : "+(entry.text||"?"),CU?CU.name:"Staff");
  p.history.splice(idx,1);
  sp(ps);
  renderDatabase();
}

function dbSetRole(accountId,role){
  if(!isAdminRole(CU)){ return; }
  if(!can("manage_mjs")){notif("Admin uniquement.","err");return;}
  _authCall({action:"admin_set_role", accountId:accountId, role:role}).then(function(r){
    if(!r||!r.ok){ notif((r&&r.error)||"Impossible de changer ce rôle.","err"); return; }
    _refreshPrivateCaches().then(function(){ notif("Rôle mis à jour.","ok"); renderDatabase(); });
  }).catch(function(){ notif("Erreur réseau.","err"); });
}



var _editPassId=null;
function openEditPassSafe(accountId, encodedPseudo){
  var pseudo="";
  try{ pseudo=decodeURIComponent(encodedPseudo||""); }catch(e){ pseudo=String(encodedPseudo||""); }
  openEditPass(accountId, pseudo);
}
function openEditPass(accountId, pseudo){
  if(!isAdminRole(CU)){ return; }
  _editPassId=accountId;
  ge("ep-pseudo").textContent=pseudo;
  ge("ep-pass").value="";
  ge("ep-err").textContent="";
  openModal("m-editpass");
  setTimeout(function(){ ge("ep-pass").focus(); },100);
}
function saveEditPass(){
  if(!isAdminRole(CU)){ return; }
  var newPass=ge("ep-pass").value.trim();
  if(!newPass||newPass.length<4){ ge("ep-err").textContent="4 caractères minimum."; return; }
  hashPass(newPass).then(function(h){
    return _authCall({action:"admin_set_password", accountId:_editPassId, newPassHash:h});
  }).then(function(r){
    if(!r||!r.ok){ ge("ep-err").textContent=(r&&r.error)||"Impossible de modifier ce mot de passe."; return; }
    closeModal("m-editpass");
    renderDatabase();
    notif("Mot de passe mis à jour.","ok");
  }).catch(function(){ ge("ep-err").textContent="Erreur réseau."; });
}



// Polling admin — vérifie les comptes en attente toutes les 10s
var _pollInterval=null;
function startAdminPoll(){
  if(_pollInterval) clearInterval(_pollInterval);
  _pollInterval=setInterval(function(){
    if(!CU||CU.type!=="staff"||!isAdminRole(CU)){ clearInterval(_pollInterval); _pollInterval=null; return; }
    var n=getAccounts().filter(function(a){ return (a.role==="joueur"||!a.role)&&!a.pid; }).length;
    var badge=ge("pending-badge");
    if(!badge) return;
    var cur=parseInt(badge.textContent)||0;
    if(n!==cur){
      // Nouveau compte arrivé — mettre à jour badge et section si visible
      updatePendingBadge();
      var section=ge("pending-accounts-section");
      if(section&&section.style.display!=="none") renderPendingAccounts();
      else if(n>0){ renderPendingAccounts(); }
      renderPendingTab();
      if(n>cur) notif("Nouveau compte en attente de liaison !","inf");
    }
  },10000);
}

async function logout(){
  if(window.__logoutBusy) return;
  window.__logoutBusy = true;
  try{
    try{
      await _authCall({action:"logout"}, { silent:true });
    }catch(e){}
    try{
      document.cookie = "np_session=; Max-Age=0; path=/; Secure; SameSite=Strict";
      document.cookie = "np_session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; Secure; SameSite=Strict";
    }catch(e){}
    _clearSession();
    _PRIVATE_KEYS.forEach(function(k){
      try{ localStorage.removeItem("np_"+k); }catch(e){}
    });
    _dbSetToken(null);
    _dbCache = Object.create(null);
    window._storageInitDone = false;
    if(_homeInterval){ clearInterval(_homeInterval); _homeInterval=null; }
    if(_pollInterval){ clearInterval(_pollInterval); _pollInterval=null; }
    CU=null;
    var root=ge("app-root");
    if(root) root.className=root.className.replace(/\bis-(staff|admin|mj|designer|player)\b/g,"").trim();
    var sapp=ge("s-app");
    if(sapp) sapp.className=sapp.className.replace(/\bis-(staff|admin|mj|designer|player)\b|\bhas-character\b/g,"").trim();
    var badge=ge("pending-badge");
    if(badge) badge.style.display="none";
    if(typeof closeMobileDrawer === "function") try{ closeMobileDrawer(); }catch(e){}
    showScreen("s-home");
    if(ge("login-id"))ge("login-id").value="";
    if(ge("login-pass"))ge("login-pass").value="";
    if(ge("err-login"))ge("err-login").textContent="";
    if(ge("pl-pseudo"))ge("pl-pseudo").value="";
    if(ge("pl-pass"))ge("pl-pass").value="";
    if(ge("err-p"))ge("err-p").textContent="";
    if(ge("err-s"))ge("err-s").textContent="";
    ["t-database-c","p-stats-c","p-joueurs-c","p-combat-mj-c","p-apparitions-c",
     "p-gestion-mj-c","p-en-attente-c","p-profil-c","p-serm-c","p-hist",
     "s-plist"].forEach(function(id){
      var el=document.getElementById(id); if(el) el.innerHTML="";
    });
    try{ localStorage.removeItem("np_cache_version"); }catch(e){}
    var staffNavPh = document.getElementById("staff-nav-placeholder");
    if(staffNavPh) staffNavPh.innerHTML = "";
    var drawerRoot2 = document.getElementById("mobile-drawer-root");
    if(drawerRoot2) drawerRoot2.innerHTML = "";
    var hdrPro = document.getElementById("hdr-profile");
    var hdrSet = document.getElementById("hdr-settings-btn");
    if(hdrPro)  hdrPro.style.display  = "none";
    if(hdrSet)  hdrSet.style.display  = "none";
    try{ history.replaceState(null, "", location.pathname + location.search); }catch(e){}
    setTimeout(function(){
      try{ window.location.reload(); }catch(e){}
    }, 80);
  } finally {
    window.__logoutBusy = false;
  }
}

var _resetAccountId=null; // compte en attente de nouveau mot de passe

function saveResetPass(){
  var p1=ge("reset-pass1"), p2=ge("reset-pass2"), errEl=ge("reset-err");
  if(!p1||!p2||!errEl) return;
  var pass1=p1.value, pass2=p2.value;
  errEl.textContent="";
  if(!pass1||!pass2){ errEl.textContent="Remplis les deux champs."; return; }
  if(pass1.length<4){ errEl.textContent="4 caractères minimum."; return; }
  if(pass1!==pass2){ errEl.textContent="Les mots de passe ne correspondent pas."; return; }
  hashPass(pass1).then(function(h){
    _authCall({action:"complete_forced_reset", newPassHash:h}).then(function(r){
      if(!r||!r.ok){ npHandleServiceIssue(r, "Reset mot de passe"); errEl.textContent=npFriendlyApiError(r, "Reset mot de passe"); return; }
      _resetAccountId=null;
      p1.value=""; p2.value="";
      notif("Mot de passe défini. Reconnecte-toi.","ok");
      showScreen("s-login");
      setTimeout(function(){ if(ge("login-id")) ge("login-id").focus(); },150);
    }).catch(function(e){ var r={status:0,error:e&&e.message?e.message:String(e)}; npHandleServiceIssue(r, "Reset mot de passe"); errEl.textContent=npFriendlyApiError(r, "Reset mot de passe"); });
  });
}



function resetAccountPass(accountId){
  if(!can("manage_mjs")&&!can("manage_players")){ notif("Permission insuffisante.","err"); return; }
  var acc=getAccounts().find(function(a){ return a.id===accountId; });
  if(!acc){ notif("Compte introuvable.","err"); return; }
  if(!confirm("Réinitialiser le mot de passe de "+acc.pseudo+" ?\n\nIl pourra se reconnecter avec le mot de passe temporaire « reset » et devra définir un nouveau mot de passe avant d'accéder à l'application.")) return;
  _authCall({action:"admin_reset_password", accountId:accountId}).then(function(r){
    if(!r||!r.ok){ notif((r&&r.error)||"Impossible de réinitialiser ce mot de passe.","err"); return; }
    sysLog("mdp_reset","Mot de passe de '"+acc.pseudo+"' réinitialisé",CU?CU.name:"Staff");
    renderDatabase();
    notif("Mot de passe de "+acc.pseudo+" réinitialisé. Mot de passe temporaire : reset","ok");
  }).catch(function(){ notif("Erreur réseau lors de la réinitialisation.","err"); });
}



function toggleDeleteAccount(){
  if(!CU){ return; }
  var form=ge("del-account-form");
  var btn=ge("del-account-open");
  if(!form) return;
  var isOpen=form.style.display==="block";
  form.style.display=isOpen?"none":"block";
  if(btn) btn.dataset.open=isOpen?"0":"1";
  if(!isOpen) setTimeout(function(){ var p=ge("del-account-pass"); if(p) p.focus(); },50);
}

function deleteMyAccount(){
  var passEl=ge("del-account-pass");
  var errEl=ge("del-account-err");
  if(!passEl||!errEl) return;
  var pass=passEl.value;
  errEl.textContent="";
  if(!pass){ errEl.textContent="Entre ton mot de passe."; return; }
  if(!CU){ errEl.textContent="Non connecté."; return; }
  hashPass(pass).then(function(h){
    return _authCall({action:"self_delete_account", currentPassHash:h});
  }).then(function(r){
    if(!r||!r.ok){ errEl.textContent=(r&&r.error)||"Impossible de supprimer ce compte."; return; }
    notif("Compte supprimé définitivement.","inf");
    logout();
  }).catch(function(){ errEl.textContent="Erreur réseau."; });
}




var _navHistory = [];
var _navCurrent = null;

function _updateBackBtn(){
  var btn = ge("hdr-back");
  if(btn) btn.style.display = _navHistory.length > 0 ? "inline-block" : "none";
}

function historyBack(){
  if(!_navHistory.length) return;
  var prev = _navHistory.pop();
  _navCurrent = prev;
  // Trouver le bouton correspondant
  var btn = document.querySelector("#main-tabs .nav-tab[onclick*=\"'"+prev+"'\"]");
  switchTab(prev, btn, true); // true = ne pas push dans l'historique
  _updateBackBtn();
}

var TAB_POPUP_IDS=['synopsis','serments','bestiaire','combat','reglement','profil','fiche','joueurs','gestion-mj','en-attente','combat-mj','apparitions','stats','evenements','carte','database'];
var _popupReturnTab='accueil';
var _activePopupTab=null;
function _isTabPopup(id){ return !!id && TAB_POPUP_IDS.indexOf(id)>=0; }
function _ensureTabPopupBackdrop(){
  var bg=ge('tab-popup-backdrop');
  if(bg && !bg.dataset.passiveBackdrop){
    var clone=bg.cloneNode(false);
    clone.id='tab-popup-backdrop';
    clone.className='tab-popup-backdrop';
    clone.setAttribute('aria-hidden','true');
    clone.dataset.passiveBackdrop='1';
    clone.addEventListener('click', function(e){ if(e.target!==clone) return; e.preventDefault(); e.stopPropagation(); });
    bg.parentNode.replaceChild(clone,bg);
    bg=clone;
  }
  if(bg) return bg;
  bg=document.createElement('div');
  bg.id='tab-popup-backdrop';
  bg.className='tab-popup-backdrop';
  bg.setAttribute('aria-hidden','true');
  bg.dataset.passiveBackdrop='1';
  bg.addEventListener('click', function(e){ if(e.target!==bg) return; e.preventDefault(); e.stopPropagation(); });
  document.body.appendChild(bg);
  return bg;
}
function _closeActiveTabPopup(targetId){
  if(!_activePopupTab) return;
  var target=targetId||_popupReturnTab||'accueil';
  if(!target || _isTabPopup(target) || target===_activePopupTab) target='accueil';
  switchTab(target, null, true);
}
function _applyTabPopupState(id, prevId){
  var usePopup=_isTabPopup(id);
  var bg=_ensureTabPopupBackdrop();
  if(usePopup && prevId && !_isTabPopup(prevId)) _popupReturnTab=prevId;
  _activePopupTab=usePopup?id:null;
  document.body.classList.toggle('tab-popup-open', usePopup);
  if(bg) bg.classList.toggle('open', usePopup);
  document.querySelectorAll('.tab-content').forEach(function(t){ t.classList.remove('tab-popup-active'); });
  var el=ge(id);
  if(usePopup && el){
    el.classList.add('tab-popup-active');
    _ensurePopupCloseButton(el);
    try{ el.scrollTop=0; }catch(_e){}
    try{ window.scrollTo({top:0,left:0,behavior:'auto'}); }catch(_e){ try{ window.scrollTo(0,0); }catch(__e){} }
  }
}
function _ensurePopupCloseButton(el){
  if(!el) return;
  var btn=el.querySelector(':scope > .tab-popup-close');
  if(!btn){
    btn=document.createElement('button');
    btn.type='button';
    btn.className='tab-popup-close';
    btn.setAttribute('aria-label','Fermer');
    btn.innerHTML='✕';
    btn.addEventListener('click', function(ev){ ev.preventDefault(); ev.stopPropagation(); _closeActiveTabPopup(); });
    el.insertBefore(btn, el.firstChild);
  }
}
if(!window.__npPopupEscBound){
  window.__npPopupEscBound=true;
  document.addEventListener('keydown', function(e){
    if(e.key!=='Escape') return;
    var openModalEl=document.querySelector('.moverlay.open');
    if(openModalEl){ closeModal(openModalEl.id); return; }
    if(_activePopupTab) _closeActiveTabPopup();
  });
}

function switchTab(id, btn, _isBack){
  if(id==='arena') id='combat-mj';
  // ── SECURITY GUARDS ─────────────────────────────────────
  var STAFF_TABS=["joueurs","gestion-mj","en-attente","combat-mj","apparitions","stats","database"];
  var ADMIN_TABS=["stats","database","gestion-mj","en-attente"];
  var isStaffUser = !!(CU && ((CU.type==="staff") || ["admin","mj","designer"].indexOf((CU.role||"").toLowerCase())>=0));
  if(STAFF_TABS.indexOf(id)>=0){
    if(!isStaffUser){
      // Accès non autorisé — silently redirect to accueil
      id="accueil"; btn=null;
    } else if(ADMIN_TABS.indexOf(id)>=0&&String(CU.role||"").toLowerCase()!=="admin"){
      id="accueil"; btn=null;
    }
  }
  // Tabs joueur (fiche, profil) nécessitent auth
  if((id==="fiche"||id==="profil")&&!CU){
    id="accueil"; btn=null;
  }
  // ── FIN GUARDS ───────────────────────────────────────────

  // Pousser dans l'historique (sauf si c'est un retour arrière)
  if(!_isBack && _navCurrent && _navCurrent !== id){
    _navHistory.push(_navCurrent);
    if(_navHistory.length > 20) _navHistory.shift();
  }
  _navCurrent = id;
  _updateBackBtn();

  // Mettre à jour l'URL pour le bouton retour du navigateur
  if(history.pushState){
    history.pushState({tab:id}, "", "#"+id);
  }

  var prevActiveEl=document.querySelector('.tab-content.active');
  var prevActiveId=prevActiveEl?prevActiveEl.id:null;
  document.querySelectorAll("#main-tabs .nav-tab, #main-tabs .nav-dropdown-item").forEach(function(t){t.classList.remove("active");});
  document.querySelectorAll("#main-tabs .nav-dropdown-btn.has-active").forEach(function(t){t.classList.remove("has-active");});
  document.querySelectorAll(".tab-content").forEach(function(t){
    t.classList.remove("active");
    t.style.display="";
  });
  var el=ge(id);
  if(el){
    el.classList.add("active");
    el.style.display="";
  }
  _applyTabPopupState(id, prevActiveId);
  if(btn) btn.classList.add("active");
  // Re-render au besoin si le contenu est vide
  if(id==="accueil"){ renderAccueil("p-accueil-c"); }
  if(id==="synopsis"){
    var c=ge("p-synopsis-c");
    if(c&&!c.innerHTML.trim()) renderSynopsis("p-synopsis-c");
  }
  if(id==="serments"){
    var c=ge("p-serments-c");
    if(c&&!c.innerHTML.trim()) renderAllSerments("p-serments-c");
  }
  if(id==="bestiaire"){
    var c=ge("p-bgrd");
    if(c&&!c.innerHTML.trim()) renderBGrid("p-bgrd",CU&&CU.type==="staff");
  }
  if(id==="combat"){
    var c=ge("p-combat-c");
    if(c&&!c.innerHTML.trim()) renderCombat("p-combat-c");
  }
  if(id==="reglement"){
    var c=ge("p-regles-c");
    if(c&&!c.innerHTML.trim()) renderRegles("p-regles-c");
  }
  if(id==="fiche"){
    if(CU){
      var _ownPid=resolveOwnProfilePid();
      if(CU.role!=="joueur"&&!_viewPid&&_ownPid) _viewPid=_ownPid;
      if(!CU.pid&&_ownPid) CU.pid=_ownPid;
    }
    renderView();
    setTimeout(function(){ try{ renderView(); }catch(e){} }, 30);
  }
  if(id==="database"){ if(window._dbTab==="audit"){ loadAuditLogAdmin(false).then(function(){ renderDatabase(); }); } else { renderDatabase(); } }
  if(id==="combat-mj"){
    rCombat("p-combat-mj-c");
    _startCombatMJPoll();
  }
  if(id==="apparitions"){
    renderSpawnLab("p-apparitions-c");
  }

  if(id==="stats"){ renderStats("p-stats-c"); }
  if(id==="evenements"){ renderEvents("p-events-c"); }
  // CARTE HIDDEN: if(id==="carte"){ renderCarte("p-carte-c"); }
  if(id==="joueurs"&&CU&&CU.type==="staff"){
    _buildJoueursTab(); // construire la structure HTML si absente
    // Re-fetch depuis la DB pour avoir les dernières inscriptions
    _refreshPrivateCaches().then(function(){
      renderSPList();
      if(isAdminRole(CU)){ renderMJList(); renderPendingAccounts(); updatePendingBadge(); }
    }).catch(function(){
      renderSPList();
      if(isAdminRole(CU)){ renderMJList(); renderPendingAccounts(); updatePendingBadge(); }
    });
  }
  setTimeout(function(){ _focusOnScreen(el || ge(id), _isBack ? 'auto' : 'smooth'); }, 24);
}

// Bouton retour du navigateur
window.addEventListener("popstate", function(e){
  if(e.state&&e.state.tab){
    var btn=document.querySelector("#main-tabs .nav-tab[onclick*=\"'"+e.state.tab+"'\"]");
    switchTab(e.state.tab, btn, true);
  }
});
// Gérer l'hash initial (URL directe vers onglet)
(function(){
  var hash=window.location.hash.replace("#","");
  if(hash){
    // Attendre que l'app soit chargée
    window.addEventListener("load",function(){
      if(hash&&ge(hash)) switchTab(hash,null,true);
    });
  }
})();

// ==========================================
// RENDER VIEW (la fiche du joueur courant CU.pid)
// ==========================================

function renderFicheState(title,msg){
  if(ge("p-av")) ge("p-av").innerHTML='<div class="savph">'+esc((title||'?').slice(0,1))+'</div>';
  if(ge("p-nom")) ge("p-nom").textContent=title||"Ma fiche";
  if(ge("p-cls")) ge("p-cls").textContent="";
  if(ge("p-wpn")) ge("p-wpn").textContent="";
  if(ge("p-br")) ge("p-br").innerHTML="";
  ["pv-v","ep-v","em-v","p-niv","xp-v","p-sniv","sxp-v"].forEach(function(id){ if(ge(id)) ge(id).textContent='—'; });
  ["pv-b","ep-b","em-b","xp-b","sxp-b"].forEach(function(id){ if(ge(id)) ge(id).style.width='0%'; });
  ["p-gems","p-equip","p-inv-c","p-hist","p-journal-fiche-content","p-combat-hist-content","p-statuts-content"].forEach(function(id){ if(ge(id)) ge(id).innerHTML=""; });
  if(ge("p-serm-c")) ge("p-serm-c").innerHTML='<div class="card mt16"><div class="card-title">'+esc(title||'Ma fiche')+'</div><p style="color:var(--dim);line-height:1.8;">'+esc(msg||'La fiche est momentanément indisponible.')+'</p></div>';
}
async function _reloadOwnPlayerIntoCache(activePid){
  if(!_dbToken) return false;
  try{
    var resp=await _loadSessionBundle();
    if(resp&&resp.data&&Array.isArray(resp.data.players)) _dbCache.players=resp.data.players;
    return !!gpid(activePid);
  }catch(e){
    console.warn('reload player failed',e&&e.message?e.message:e);
    return false;
  }
}


async function _refreshPrivateCaches(){
  try{
    var pub = await _loadPublicBundle();
    if(pub && pub.data){
      Object.keys(pub.data).forEach(function(k){ _dbCache[k] = pub.data[k]; });
    }
  }catch(e){}
  try{
    var sess = await _loadSessionBundle();
    if(sess && sess.data){
      Object.keys(sess.data).forEach(function(k){ _dbCache[k] = sess.data[k]; });
    }
  }catch(e){}
  return _dbCache;
}

function renderView(){
  try{
    _restorePrivateShell("fiche");
    if(!CU){ renderFicheState("Connexion requise","Connecte-toi pour accéder à ta fiche."); return; }
    var ownResolvedPid=resolveOwnProfilePid();
    var activePid=(CU.role!=="joueur"&&_viewPid)?_viewPid:(CU.pid||ownResolvedPid);
    if(!activePid&&ownResolvedPid) activePid=ownResolvedPid;
    if(CU&&!CU.pid&&ownResolvedPid) CU.pid=ownResolvedPid;
    if(!activePid){ renderFicheState("Compte en attente","Ton compte n’est pas encore lié à un personnage. Un administrateur doit terminer la liaison avant d’ouvrir la fiche."); return; }
    var p=gpid(activePid);
    if(!p){
      renderFicheState("Chargement de la fiche","Je tente de recharger les données de ton personnage.");
      _reloadOwnPlayerIntoCache(activePid).then(function(ok){
        if(ok) renderView();
        else renderFicheState("Fiche indisponible","Impossible de retrouver les données du personnage pour le moment. Recharge la page ou reconnecte-toi.");
      });
      return;
    }
    if(!ge("p-av")||!ge("p-nom")) return;
    updateHdrProfile();
    var av=ge("p-av");
    if(can("manage_stats")){
      var avContent=p.avatar?'<img src="'+p.avatar+'" class="sav" onerror="this.style.display=\'none\'">':'<div class="savph">'+p.name[0]+'</div>';
      av.innerHTML='<div onclick="openAvatarCropFor(\''+p.id+'\')" title="Recadrer l\'avatar" style="position:relative;cursor:pointer;display:inline-block;" onmouseover="this.querySelector(\'.av-overlay\').style.opacity=1" onmouseout="this.querySelector(\'.av-overlay\').style.opacity=0">'+avContent+'<div class="av-overlay" style="position:absolute;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s;font-size:24px;color:#fff;border-radius:inherit;">✎</div></div>';
    }else{
      av.innerHTML=p.avatar?'<img src="'+p.avatar+'" class="sav" onerror="this.style.display=\'none\'">':'<div class="savph">'+p.name[0]+'</div>';
    }
    var sermBundle=getPlayerSermentBundle(p);
    if(ge("p-nom")) ge("p-nom").textContent=p.name;
    ge("p-cls").textContent=p.classe;
    ge("p-wpn").textContent=sermBundle.weapon||p.arme||"";
    ge("p-br").innerHTML=sermBundle.branch?'<div class="brbox">Branche : '+esc(sermBundle.branch.nom)+'</div>':(p.branch&&p.branch!=="Aucune"?'<div class="brbox">Branche : '+esc(p.branch)+'</div>':"");
    var sCol=_sermColor(p.classe);
    var sheroEl=document.querySelector(".shero");
    if(sheroEl){
      sheroEl.style.borderTop="2px solid "+sCol;
      sheroEl.style.paddingTop="18px";
      sheroEl.style.position="relative";
      sheroEl.style.overflow="hidden";
      var wm=sheroEl.querySelector(".serm-watermark");
      if(!wm){ wm=document.createElement("div"); wm.className="serm-watermark"; sheroEl.appendChild(wm); }
      wm.textContent=(p.classe||"").toUpperCase();
      wm.style.cssText="position:absolute;inset:0;display:flex;align-items:center;justify-content:flex-end;padding-right:16px;font-family:'Cinzel',serif;font-size:clamp(36px,6vw,64px);font-weight:700;letter-spacing:6px;color:"+sCol+";opacity:.06;pointer-events:none;white-space:nowrap;overflow:hidden;user-select:none;z-index:0;";
    }
    var adminBtnsEl=ge("shero-admin-btns");
    if(adminBtnsEl){
      if(can("manage_stats")){
        adminBtnsEl.style.display="flex";
        adminBtnsEl.style.position="relative";
        adminBtnsEl.style.zIndex="2";
        adminBtnsEl.innerHTML=''
          +'<button class="btn btn-sm btn-gold" onclick="oES(\''+p.id+'\')" style="white-space:nowrap;"><span>✎ Stats</span></button>'
          +'<button class="btn btn-sm" onclick="openChangeSerm(\''+p.id+'\')" style="border-color:var(--glacier-dim);color:var(--glacier-dim);white-space:nowrap;"><span>⇄ Serment</span></button>'
          +'<button class="btn btn-sm" onclick="openChangeBranch(\''+p.id+'\')" style="border-color:var(--purple);color:var(--purple);white-space:nowrap;"><span>⇄ Branche</span></button>';
      }else adminBtnsEl.style.display="none";
    }
    ge("pv-v").textContent=p.pvCur+" / "+p.pvMax;
    ge("ep-v").textContent=p.epCur+" / "+p.epMax;
    ge("em-v").textContent=p.emCur+" / "+p.emMax;
    ge("pv-b").style.width=pct(p.pvCur,p.pvMax);
    ge("ep-b").style.width=pct(p.epCur,p.epMax);
    ge("em-b").style.width=pct(p.emCur,p.emMax);
    ge("p-niv").textContent="Niveau "+p.level;
    ge("xp-v").textContent=p.xp+" / "+p.xpMax+" XP";
    ge("xp-b").style.width=pct(p.xp,p.xpMax);
    ge("p-sniv").textContent="Niveau "+p.sLevel;
    ge("sxp-v").textContent=p.sXp+" / "+p.sXpMax+" XP";
    ge("sxp-b").style.width=pct(p.sXp,p.sXpMax);
    var gems=(p.inventory||[]).filter(function(i){return i.category==="Gemme";});
    var gd=ge("p-gems");
    if(!gems.length){ gd.innerHTML='<span style="color:var(--faint);font-style:italic;font-size:14px;">Aucune gemme.</span>'; }
    else {
      var wb=gems.filter(function(i){return i.name.indexOf("Blanche")>-1;}).reduce(function(a,i){return a+i.qty;},0);
      var ib=gems.filter(function(i){return i.name.indexOf("Incarnate")>-1;}).reduce(function(a,i){return a+i.qty;},0);
      var eb=gems.filter(function(i){return i.name.indexOf("carlate")>-1;}).reduce(function(a,i){return a+i.qty;},0);
      gd.innerHTML=(wb>0?'<span class="tag tgl">☾ Blanche ×'+wb+'</span>':'')+(ib>0?'<span class="tag tpur">✦ Incarnate ×'+ib+'</span>':'')+(eb>0?'<span class="tag tred">✦ Écarlate ×'+eb+'</span>':'');
    }
    renderEq(p); renderInv(p); renderSerm(p); renderJournalFiche(p); renderCombatHistFiche(p); renderStatutsFiche(p);
  }catch(err){
    console.error('renderView error', err);
    renderFicheState("Fiche temporairement indisponible","Un élément de la fiche a échoué au chargement. Recharge la page ou reconnecte-toi.");
  }
}



function renderJournalFiche(p){
  var btnsEl=ge("p-journal-fiche-btns");
  var contentEl=ge("p-journal-fiche-content");
  if(!contentEl) return;

  // Permissions : le joueur lié OU admin peut modifier
  var isOwner=CU&&CU.pid===p.id;
  var isAdmin=can("manage_stats");
  var canEdit=isOwner||isAdmin;
  // MJ peut lire mais pas modifier
  var canRead=canEdit||can("manage_players");

  if(!canRead){
    contentEl.innerHTML='<p style="color:var(--faint);font-style:italic;font-size:13px;">Accès restreint.</p>';
    if(btnsEl) btnsEl.innerHTML="";
    return;
  }

  var journal=p.journal||"";

  if(canEdit){
    // Zone éditable
    contentEl.innerHTML='<textarea id="journal-fiche-text" style="width:100%;min-height:180px;background:var(--bg4);border:1px solid var(--border2);color:var(--text);font-family:var(--fb);font-size:14px;line-height:1.8;padding:14px;resize:vertical;outline:none;transition:border-color .2s;" onfocus="this.style.borderColor=\'var(--glacier-dim)\'" onblur="this.style.borderColor=\'var(--border2)\'" placeholder="Notes personnelles, lore, secrets…">'+escHtml(journal)+'</textarea>'
      +'<p style="font-size:11px;color:var(--faint);font-style:italic;margin-top:6px;">'+(isAdmin&&!isOwner?'Vous lisez le journal de '+esc(p.name)+' en tant qu\'Admin.':'Visible uniquement par toi et les administrateurs.')+'</p>';
    if(btnsEl) btnsEl.innerHTML='<button class="btn btn-sm btn-grn" onclick="saveJournalFiche(\''+p.id+'\')"><span>Sauvegarder</span></button>';
  } else {
    // Lecture seule pour MJ
    contentEl.innerHTML=journal
      ?'<div style="font-size:14px;color:var(--dim);font-style:italic;line-height:1.8;white-space:pre-wrap;padding:4px 0;">'+escHtml(journal)+'</div>'
        +'<p style="font-size:11px;color:var(--faint);margin-top:8px;">Journal en lecture seule.</p>'
      :'<p style="color:var(--faint);font-style:italic;font-size:13px;">Aucune entrée.</p>';
    if(btnsEl) btnsEl.innerHTML="";
  }
}

function saveJournalFiche(pid){
  var txt=ge("journal-fiche-text"); if(!txt) return;
  var ps=gp();
  var idx=ps.findIndex(function(x){return x.id===pid;});
  if(idx<0) return;
  ps[idx].journal=txt.value;
  sp(ps);
  notif("Journal sauvegardé.","ok");
}

function renderCombatHistFiche(p){
  var el=ge("p-combat-hist-content"); if(!el) return;
  // Récupérer les entrées de type combat dans l'history du joueur
  var combatEntries=(p.history||[]).filter(function(h){ return h.type==="combat"; })
    .sort(function(a,b){return b.ts-a.ts;});
  if(!combatEntries.length){
    el.innerHTML='<p style="color:var(--faint);font-style:italic;font-size:13px;">Aucun combat enregistré.</p>';
    return;
  }
  var h='<div style="display:flex;flex-direction:column;gap:8px;">';
  combatEntries.forEach(function(entry){
    // Extraire rounds et stats depuis le texte
    var roundMatch=entry.text.match(/(\d+) round/);
    var pvMatch=entry.text.match(/PV : (\d+)\/(\d+)/);
    var epMatch=entry.text.match(/EP : (\d+)\/(\d+)/);
    var rounds=roundMatch?roundMatch[1]:"?";
    var pvCur=pvMatch?parseInt(pvMatch[1]):null;
    var pvMax=pvMatch?parseInt(pvMatch[2]):null;
    var epCur=epMatch?parseInt(epMatch[1]):null;
    var epMax=epMatch?parseInt(epMatch[2]):null;
    var pvPct=pvMax?Math.round(pvCur/pvMax*100):0;
    var epPct=epMax?Math.round(epCur/epMax*100):0;
    var pvCol=pvPct>60?"var(--green)":pvPct>30?"var(--gold)":"var(--red)";
    // Nom du combat = texte avant " — "
    var nomCombat=entry.text.split("—")[0].replace("⚔","").trim();
    h+='<div style="background:var(--bg3);border:1px solid var(--border);padding:12px 14px;">';
    h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px;">';
    h+='<div style="font-family:var(--fd);font-size:12px;letter-spacing:1px;color:var(--text);">⚔ '+nomCombat+'</div>';
    h+='<div style="display:flex;gap:8px;align-items:center;">';
    h+='<span style="font-family:var(--fm);font-size:10px;color:var(--faint);">'+rounds+' round'+(rounds>1?'s':'')+'</span>';
    h+='<span style="font-size:10px;color:var(--faint);">'+fdt(entry.ts)+'</span>';
    if(entry.by) h+='<span style="font-size:10px;color:var(--glacier-dim);">'+entry.by+'</span>';
    h+='</div></div>';
    if(pvMax){
      h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">';
      // Barre PV
      h+='<div>';
      h+='<div style="display:flex;justify-content:space-between;margin-bottom:3px;">';
      h+='<span style="font-family:var(--fd);font-size:8px;letter-spacing:2px;color:'+pvCol+';">PV</span>';
      h+='<span style="font-family:var(--fm);font-size:10px;color:var(--text);">'+pvCur+' / '+pvMax+'</span>';
      h+='</div>';
      h+='<div style="height:4px;background:var(--bg4);border-radius:1px;">';
      h+='<div style="height:100%;width:'+pvPct+'%;background:'+pvCol+';border-radius:1px;"></div>';
      h+='</div></div>';
      // Barre EP
      if(epMax){
        h+='<div>';
        h+='<div style="display:flex;justify-content:space-between;margin-bottom:3px;">';
        h+='<span style="font-family:var(--fd);font-size:8px;letter-spacing:2px;color:var(--gold);">EP</span>';
        h+='<span style="font-family:var(--fm);font-size:10px;color:var(--text);">'+epCur+' / '+epMax+'</span>';
        h+='</div>';
        h+='<div style="height:4px;background:var(--bg4);border-radius:1px;">';
        h+='<div style="height:100%;width:'+epPct+'%;background:var(--gold);border-radius:1px;"></div>';
        h+='</div></div>';
      }
      h+='</div>';
    }
    h+='</div>';
  });
  h+='</div>';
  el.innerHTML=h;
}

function renderEq(p){
  var eq=p.equipment||{helmet:null,chest:null,legs:null};
  var SL=[{k:"h",lbl:"Casque",ek:"helmet"},{k:"c",lbl:"Plastron",ek:"chest"},{k:"l",lbl:"Jambières",ek:"legs"}];
  SL.forEach(function(s){var z=ge("ez-"+s.k);if(z)z.classList.toggle("has",!!eq[s.ek]);});
  var c=ge("p-equip");if(!c)return;
  c.innerHTML=SL.map(function(s){
    return'<div class="esl" id="esl-'+s.k+'"><div class="esll">'+s.lbl+'</div><div class="eslv'+(eq[s.ek]?'':' empty')+'">'+(eq[s.ek]?'<span class="edot"></span>'+eq[s.ek]:'Aucun équipement')+'</div></div>';
  }).join("");
}

function hlEq(k){document.querySelectorAll(".esl").forEach(function(s){s.classList.remove("hl");});document.querySelectorAll(".ezon").forEach(function(z){z.classList.remove("act");});var sl=ge("esl-"+k);if(sl)sl.classList.add("hl");var z=ge("ez-"+k);if(z)z.classList.add("act");}
function uhlEq(){document.querySelectorAll(".esl").forEach(function(s){s.classList.remove("hl");});document.querySelectorAll(".ezon").forEach(function(z){z.classList.remove("act");});}

function renderInv(p){
  var inv=p.inventory||[];
  var c=ge("p-inv-c");
  var vis=inv.filter(function(i){return i.qty>0;});
  if(!vis.length){c.innerHTML='<p class="iempty">Inventaire vide.</p>';}
  else{
    var cats=[...new Set(inv.map(function(i){return i.category;}))];
    c.innerHTML=cats.map(function(cat){
      var it=inv.filter(function(i){return i.category===cat&&i.qty>0;});
      if(!it.length)return"";
      return'<div class="isec"><div class="iset">'+cat+'</div><div class="igrd">'+it.map(function(i){return'<div class="iitm '+gc(i.name)+'"><div class="iiname">'+i.name+'</div><div class="iitype">'+i.category+'</div><div class="iiqty">×'+i.qty+'</div></div>';}).join("")+'</div></div>';
    }).join("");
  }
  var sel=ge("p-csel");sel.innerHTML='<option value="">— Choisir —</option>';
  inv.filter(function(i){return i.qty>0;}).forEach(function(i){sel.innerHTML+='<option value="'+i.id+'">'+i.name+' (×'+i.qty+')</option>';});
  var canDelHist=can("manage_players");
  var allHist=[...(p.history||[])].reverse();
  // Construire les filtres disponibles selon les types présents
  var HIST_TYPES={
    "all":{label:"Tous",icon:""},
    "level":{label:"Niveaux",icon:"⬆"},
    "xp":{label:"XP",icon:"✦"},
    "gemme":{label:"Gemmes",icon:"💎"},
    "combat":{label:"Combats",icon:"⚔"},
    "item":{label:"Items",icon:"◎"},
    "stat":{label:"Stats",icon:"📊"},
    "serment":{label:"Serment",icon:"⚜"},
    "de":{label:"Dés",icon:"🎲"},
    "add":{label:"Divers",icon:"+"}
  };
  var presentTypes=["all"];
  Object.keys(HIST_TYPES).forEach(function(t){
    if(t!=="all"&&allHist.some(function(h){return (h.type||"add")===t;})) presentTypes.push(t);
  });
  var filterEl=ge("p-hist-filters");
  if(filterEl&&presentTypes.length>1){
    var activeFilter=filterEl.dataset.active||"all";
    filterEl.innerHTML=presentTypes.map(function(t){
      var td=HIST_TYPES[t];
      var isActive=activeFilter===t;
      return '<button onclick="setHistFilter(\''+p.id+'\',\''+t+'\')" style="font-family:var(--fd);font-size:8px;letter-spacing:1px;padding:3px 8px;background:'+(isActive?'rgba(126,184,212,.15)':'var(--bg3)')+';border:1px solid '+(isActive?'var(--glacier)':'var(--border2)')+';color:'+(isActive?'var(--glacier)':'var(--faint)')+';cursor:pointer;transition:all .15s;">'+(td.icon?td.icon+' ':'')+td.label+'</button>';
    }).join("");
    var filterType=activeFilter==="all"?null:activeFilter;
    var hist=filterType?allHist.filter(function(h){return (h.type||"add")===filterType;}):allHist;
    hist=hist.slice(0,60);
    ge("p-hist").innerHTML=hist.length?hist.map(function(h,i){
      var realIdx=p.history.length-1-allHist.indexOf(h);
      var typeInfo=HIST_TYPES[h.type||"add"]||HIST_TYPES["add"];
      var typeCol={level:"var(--gold)",xp:"var(--glacier)",gemme:"var(--purple)",combat:"var(--red)",item:"var(--green)",stat:"var(--dim)",serment:"var(--glacier-dim)",de:"var(--gold)",add:"var(--faint)"}[h.type||"add"]||"var(--faint)";
      return'<div class="hent '+(h.type||"add")+'" style="position:relative;'+(canDelHist?'padding-right:28px;':'')+';border-left:2px solid '+typeCol+';padding-left:8px;">'
        +'<span class="hdate">'+fdt(h.ts)+'</span>'
        +(typeInfo.icon?'<span style="font-size:9px;color:'+typeCol+';margin:0 4px;">'+typeInfo.icon+'</span>':'')
        +'<span class="htxt">'+h.text+'<br><span class="hby">'+h.by+'</span></span>'
        +(canDelHist?'<button onclick="delHistEntry(\''+p.id+'\','+realIdx+')" title="Supprimer" style="position:absolute;top:50%;right:6px;transform:translateY(-50%);background:none;border:none;color:var(--faint);cursor:pointer;font-size:16px;padding:2px 4px;transition:color .15s;" onmouseover="this.style.color=\'var(--red)\'" onmouseout="this.style.color=\'var(--faint)\'">✕</button>':'')
      +'</div>';
    }).join(""):'<p style="color:var(--faint);font-style:italic;font-size:13px;">Aucune entrée pour ce filtre.</p>';
  } else {
    var hist=allHist.slice(0,40);
    ge("p-hist").innerHTML=hist.length?hist.map(function(h,i){
      var realIdx=p.history.length-1-i;
      return'<div class="hent '+(h.type||"add")+'" style="position:relative;'+(canDelHist?'padding-right:28px;':'')+'">'
        +'<span class="hdate">'+fdt(h.ts)+'</span>'
        +'<span class="htxt">'+h.text+'<br><span class="hby">'+h.by+'</span></span>'
        +(canDelHist?'<button onclick="delHistEntry(\''+p.id+'\','+realIdx+')" title="Supprimer" style="position:absolute;top:50%;right:6px;transform:translateY(-50%);background:none;border:none;color:var(--faint);cursor:pointer;font-size:16px;padding:2px 4px;transition:color .15s;" onmouseover="this.style.color=\'var(--red)\'" onmouseout="this.style.color=\'var(--faint)\'">✕</button>':'')
      +'</div>';
    }).join(""):'<p style="color:var(--faint);font-style:italic;font-size:13px;">Aucun historique.</p>';
  }
}

function setHistFilter(pid,type){
  var filterEl=ge("p-hist-filters");
  if(filterEl) filterEl.dataset.active=type;
  var p=gpid(pid); if(!p) return;
  renderInv(p);
}

function delHistEntry(pid,idx){
  if(!can("manage_players")){notif("Non autorisé.","err");return;}
  if(!confirm("Supprimer cette entrée de l'historique ?")) return;
  var ps=gp();
  var p=ps.find(function(x){return x.id===pid;});
  if(!p||!p.history) return;
  p.history.splice(idx,1);
  sp(ps);
  renderInv(p);
}

function playerConsume(){
  var p=gpid(CU.pid);var id=ge("p-csel").value;var note=ge("p-cnote").value.trim();
  if(!id){ge("p-cerr").textContent="Choisis un item.";return;}
  var item=(p.inventory||[]).find(function(i){return i.id===id;});
  if(!item||item.qty<=0){ge("p-cerr").textContent="Item indisponible.";return;}
  item.qty--;p.history=p.history||[];
  p.history.push({ts:Date.now(),type:"item",text:"Consommé : "+esc(item.name)+(note?" — "+note:""),by:p.name+" (joueur)"});
  up(p);ge("p-cerr").textContent="";ge("p-cnote").value="";renderInv(p);notif(item.name+" consommé.","ok");
}

var WEAPON_ICONS={
  "Duelliste":"⚔","Sauvageon":"🪓","Croisé":"🛡","Rodeur":"🗡","Rôdeur":"🗡",
  "Traqueur":"🏹","Flecheur":"🏹","Flécheur":"🏹","Elementaliste":"👊","Élémentaliste":"👊",
  "Evocateur":"🪄","Évocateur":"🪄","Conjurateur":"⛓","Arcaniste":"🔮"
};
var STYLE_COLORS={
  "Brutalité":"var(--red)","Fluidité":"var(--glacier)","AOE":"var(--purple)",
  "Précision":"var(--purple)","Offensif":"var(--red)","Aggro":"var(--gold)",
  "Mêlée":"var(--red)","Distance":"var(--glacier)","Épuisement":"var(--purple)",
  "Contrôle":"var(--glacier)","Concentration":"var(--gold)","Soin":"var(--green)",
  "Tank":"var(--gold)","Équilibre offensif":"var(--red)","Équilibre d'accumulation":"var(--glacier)",
  "AOE Indéfendable":"var(--red)","Précision Défendable":"var(--glacier)"
};
var SERM_CATS={
  "Duelliste":"melee","Sauvageon":"melee","Croisé":"melee","Rôdeur":"melee",
  "Traqueur":"melee","Flécheur":"distance","Elementaliste":"melee",
  "Evocateur":"magie","Conjurateur":"soutien","Arcaniste":"magie"
};

function renderAllSerments(tid){
  var el=ge(tid); if(!el) return;
  var isAdmin=can("manage_stats");
  var all=getAllSD();
  var html='<div class="serm-shell">';
  html+='<div class="serm-toolbar">';
  html+='<div class="serm-filter" id="serm-filter">';
  html+='<button class="btn btn-sm active" onclick="filterSerments(null,this)"><span>Tous</span></button>';
  ["melee","distance","magie","soutien"].forEach(function(c){
    html+='<button class="btn btn-sm" onclick="filterSerments(this.dataset.c,this)" data-c="'+c+'"><span>'+({"melee":"Mêlée","distance":"Distance","magie":"Magie","soutien":"Soutien"}[c]||c.charAt(0).toUpperCase()+c.slice(1))+'</span></button>';
  });
  html+='</div>';
  if(isAdmin) html+='<button class="btn btn-sm btn-grn serm-create-btn" onclick="openCreateSerm()"><span>+ Nouveau Serment</span></button>';
  html+='</div>';
  html+='<div id="serments-grid" class="serm-grid">';
  Object.keys(all).forEach(function(nom){ html+=renderSermCard(nom,all[nom],isAdmin); });
  html+='</div>';
  html+='</div>';
  el.innerHTML=html;
}

function renderSermCard(nom,s,isAdmin){
  var icon=WEAPON_ICONS[nom]||"✦";
  var cat=SERM_CATS[nom]||s.cat||"melee";
  var isCustom=!SD[nom];
  var branches=getBranches(nom,s);
  var enc=encodeURIComponent(nom);
  var h='<article class="scrd serm-card-premium'+(isAdmin?' has-admin-actions':'')+'" data-cat="'+cat+'">';
  if(isCustom) h+='<div class="serm-badge-new'+(isAdmin?' has-admin':'')+'">Nouveau</div>';
  if(isAdmin){
    h+='<div class="serm-admin-actions">';
    h+='<button class="btn btn-sm btn-gold" onclick="openEditSerm(this.dataset.n)" data-n="'+enc+'"><span>✎</span></button>';
    if(isCustom) h+='<button class="btn btn-sm btn-red" onclick="delSerm(this.dataset.n)" data-n="'+enc+'"><span>×</span></button>';
    h+='</div>';
  }
  h+='<div class="serm-head" style="padding-right:'+(isAdmin?'100px':'44px')+'">';
  h+='<div class="serm-icon">'+icon+'</div>';
  h+='<div class="serm-head-copy"><div class="snm">'+esc(nom)+'</div><div class="swp">'+esc(s.arme)+'</div></div>';
  h+='</div>';
  h+='<div class="serm-cat" style="right:'+(isAdmin?'110px':'14px')+';">'+cat+'</div>';
  h+='<p class="serm-lore">'+esc(s.lore)+'</p>';
  h+='<div class="serm-stats">';
  h+='<div class="sst"><div class="sstv">'+s.pvN+'</div><div class="sstl">PV/niv</div></div>';
  h+='<div class="sst"><div class="sstv">'+s.epN+'</div><div class="sstl">EP/niv</div></div>';
  h+='<div class="sst"><div class="sstv">'+s.emN+'</div><div class="sstl">EM/niv</div></div>';
  h+='<div class="sst"><div class="sstv">'+s.dmg+'</div><div class="sstl">Dmg</div></div>';
  h+='</div>';
  if(branches.length>0){
    h+='<div style="display:flex;flex-direction:column;gap:8px;">';
    branches.forEach(function(br,bi){
      var col=STYLE_COLORS[br.style]||"var(--glacier)";
      var pals=br.paliers||[];
      h+='<section class="serm-branch">';
      // En-tête branche
      h+='<div class="serm-branch-head" style="margin-bottom:'+(br.desc?'6px':'10px')+';">';
      h+='<span style="font-family:var(--fd);font-size:14px;letter-spacing:1px;color:var(--text);">'+esc(br.nom)+'</span>';
      h+='<span style="font-family:var(--fd);font-size:8px;letter-spacing:2px;text-transform:uppercase;padding:2px 8px;border:1px solid '+col+';color:'+col+';">'+esc(br.style)+'</span>';
      if(isAdmin){
        h+='<div class="serm-branch-actions" style="margin-left:auto;gap:4px;">';
        h+='<button class="btn btn-sm btn-gold" style="padding:3px 10px;" onclick="openEditBranch(this.dataset.n,'+bi+')" data-n="'+enc+'"><span>✎</span></button>';
        h+='<button class="btn btn-sm btn-red" style="padding:3px 10px;" onclick="delBranch(this.dataset.n,'+bi+')" data-n="'+enc+'"><span>×</span></button>';
        h+='</div>';
      }
      h+='</div>';
      // Description physique de la capacité (staff/lore visuel)
      if(br.descPhys) h+='<p class="serm-branch-phys">'+esc(br.descPhys)+'</p>';
      // Description narrative joueur
      if(br.desc) h+='<p class="serm-branch-desc" style="border-left-color:'+col+';">'+esc(br.desc)+'</p>';
      // Paliers
      if(pals.length){
        h+='<div class="serm-paliers">';
        pals.forEach(function(p,pi){
          var palId='pal-'+enc+'-'+bi+'-'+pi;
          h+='<div class="serm-palier">';
          h+='<div class="serm-palier-top">';
          h+='<span style="font-family:var(--fm);color:var(--glacier);font-size:10px;font-weight:700;min-width:44px;">Niv.'+p.niv+'</span>';
          h+='<span style="font-family:var(--fd);font-size:12px;color:var(--text);letter-spacing:.5px;">'+p.nom+'</span>';
          if(p.cout) h+='<span class="serm-palier-cost" style="font-family:var(--fm);font-size:10px;color:var(--faint);white-space:nowrap;margin-left:auto;">'+p.cout+'</span>';
          if(isAdmin){
            h+='<div class="serm-palier-actions" style="display:flex;gap:3px;flex-shrink:0;'+(p.cout?'':'margin-left:auto;')+'" onclick="event.stopPropagation()">';
            h+='<button class="btn btn-sm btn-gold" style="padding:2px 7px;font-size:10px;" onclick="openEditPalier(this.dataset.n,'+bi+','+pi+')" data-n="'+enc+'"><span>✎</span></button>';
            h+='<button class="btn btn-sm btn-red" style="padding:2px 7px;font-size:10px;" onclick="delPalier(this.dataset.n,'+bi+','+pi+')" data-n="'+enc+'"><span>×</span></button>';
            h+='</div>';
          }
          h+='</div>';
          if(p.desc){
            h+='<div class="serm-palier-body">';
            h+='<div style="font-size:12px;color:var(--dim);line-height:1.6;">'+p.desc+'</div>';
            h+='</div>';
          }
          h+='</div>';
        });
        h+='</div>';
      }
      if(isAdmin) h+='<button class="btn btn-sm btn-grn" style="margin-top:10px;width:100%;" onclick="openAddPalier(this.dataset.n,'+bi+')" data-n="'+enc+'"><span>+ Ajouter un palier</span></button>';
      h+='</section>';
    });
    h+='</div>';
  } else {
    h+='<p style="color:var(--faint);font-style:italic;font-size:13px;">Aucune branche définie.</p>';
  }
  if(isAdmin) h+='<button class="btn btn-sm" style="margin-top:10px;width:100%;border-color:var(--glacier-dim);" onclick="openAddBranch(this.dataset.n)" data-n="'+enc+'"><span>+ Ajouter une branche</span></button>';
  h+='</article>';
  return h;
}

var _sermFilter=null;
function filterSerments(cat,btn){
  // Normaliser — undefined (pas de data-c) ou chaîne vide = "Tous"
  if(!cat||cat==="undefined") cat=null;
  _sermFilter=cat;
  document.querySelectorAll("#serm-filter .btn").forEach(function(b){b.classList.remove("active");b.style.borderColor="";});
  if(btn) btn.classList.add("active");
  document.querySelectorAll("#serments-grid .scrd").forEach(function(card){
    var cardCat=card.getAttribute("data-cat")||"";
    var show=!cat||cardCat===cat;
    card.style.display=show?"block":"none";
  });
}

function getBranches(nom,s){
  var custom=gsd();
  if(custom[nom]&&custom[nom].branches&&custom[nom].branches.length) return custom[nom].branches;
  if(s.branches&&s.branches.length) return s.branches;
  var arr=[];
  if(s.bA) arr.push(s.bA);
  if(s.bB) arr.push(s.bB);
  return arr;
}
function normalizeBranchLabel(label){
  return String(label||"")
    .replace(/^Branche\s+[AB]\s+—\s*/i,"")
    .replace(/^Branche\s+[AB]\s*-\s*/i,"")
    .replace(/\s+/g," ")
    .trim()
    .toLowerCase();
}
function branchMatchesLabel(branch,label){
  if(!branch||!label||label==="Aucune") return false;
  var raw=String(label||"").trim();
  var bnom=String(branch.nom||"").trim();
  if(!raw||!bnom) return false;
  if(raw===bnom) return true;
  var nr=normalizeBranchLabel(raw);
  var nb=normalizeBranchLabel(bnom);
  return !!(nr&&nb&&(nr===nb||nr.indexOf(nb)>-1||nb.indexOf(nr)>-1));
}
function getPlayerSermentBundle(p){
  var fallback={
    nom:(p&&p.classe)||"",
    def:null,
    branches:[],
    branch:null,
    weapon:(p&&p.arme)||"",
    icon:(p&&WEAPON_ICONS[p.classe])||"✦",
    cat:(p&&SERM_CATS[p.classe])||"melee"
  };
  if(!p||!p.classe) return fallback;
  var all=getAllSD();
  var s=all[p.classe];
  if(!s) return fallback;
  var branches=getBranches(p.classe,s);
  var chosen=null;
  if(p.branch&&p.branch!=="Aucune"){
    for(var i=0;i<branches.length;i++){
      if(branchMatchesLabel(branches[i],p.branch)){
        chosen=branches[i];
        break;
      }
    }
  }
  return {
    nom:p.classe,
    def:s,
    branches:branches,
    branch:chosen,
    weapon:s.arme||p.arme||"",
    icon:(s&&s.icon)||WEAPON_ICONS[p.classe]||"✦",
    cat:(s&&s.cat)||SERM_CATS[p.classe]||"melee"
  };
}

var _editSermNom=null;
function openCreateSerm(){
  if(!CU||!can("manage_beasts")){ return; }
  if(!can("manage_stats")){notif("Admin uniquement.","err");return;}
  _editSermNom=null;
  ge("mserm-title").textContent="Nouveau Serment";
  ge("mserm-nom").value=""; ge("mserm-nom").disabled=false;
  ge("mserm-arme").value=""; ge("mserm-lore").value="";
  ge("mserm-pvN").value="3"; ge("mserm-epN").value="5"; ge("mserm-emN").value="2"; ge("mserm-dmg").value="8";
  ge("mserm-cat").value="mêlée"; ge("mserm-icon").value="✦";
  openModal("m-serm");
}
function openEditSerm(nomEnc){
  if(!CU||!can("manage_beasts")){ return; }
  if(!can("manage_stats")){notif("Admin uniquement.","err");return;}
  var nom=decodeURIComponent(nomEnc); _editSermNom=nom;
  var all=getAllSD(); var s=all[nom]; if(!s) return;
  ge("mserm-title").textContent="Modifier — "+nom;
  ge("mserm-nom").value=nom; ge("mserm-nom").disabled=true;
  ge("mserm-arme").value=s.arme||"";
  ge("mserm-lore").value=s.lore||"";
  ge("mserm-pvN").value=s.pvN||3;
  ge("mserm-epN").value=s.epN||5;
  ge("mserm-emN").value=s.emN||2;
  ge("mserm-dmg").value=s.dmg||8;
  // Normaliser la catégorie en slug sans accent
  var rawCat=s.cat||SERM_CATS[nom]||"melee";
  var catSlug=rawCat.replace(/mêlée/g,"melee").replace(/melee/g,"melee");
  ge("mserm-cat").value=catSlug;
  ge("mserm-icon").value=WEAPON_ICONS[nom]||"✦";
  openModal("m-serm");
}
function saveSerm(){
  if(!CU||!can("manage_beasts")){ return; }
  var nom=_editSermNom||ge("mserm-nom").value.trim();
  if(!nom){notif("Nom obligatoire.","err");return;}
  var custom=gsd();
  var existing=custom[nom]||{};
  // Conserver les branches existantes (custom ou SD de base)
  var existingBranches=existing.branches||getBranches(nom,getAllSD()[nom]||{})||[];
  var newPvN=parseInt(ge("mserm-pvN").value)||3;
  var newEpN=parseInt(ge("mserm-epN").value)||5;
  var newEmN=parseInt(ge("mserm-emN").value)||2;
  var newDmg=parseInt(ge("mserm-dmg").value)||8;
  var icon=ge("mserm-icon").value.trim()||"✦";
  custom[nom]={
    arme:ge("mserm-arme").value.trim(),
    lore:ge("mserm-lore").value.trim(),
    pvN:newPvN, epN:newEpN, emN:newEmN, dmg:newDmg,
    cat:ge("mserm-cat").value,
    icon:icon,
    branches:existingBranches
  };
  WEAPON_ICONS[nom]=icon; SERM_CATS[nom]=custom[nom].cat;
  ssd(custom);
  // Propagation dynamique — recalculer les stats de tous les joueurs avec ce Serment
  if(_editSermNom){
    var updated=0;
    var players=gp();
    players.forEach(function(p){
      if(p.classe===nom){
        p.arme=custom[nom].arme||p.arme||"";
        if(p.level>1){
          p.pvMax=30+(p.level-1)*newPvN;
          p.pvCur=Math.min(p.pvCur,p.pvMax);
          p.epMax=50+(p.level-1)*newEpN;
          p.epCur=Math.min(p.epCur,p.epMax);
          p.emMax=20+(p.level-1)*newEmN;
          p.emCur=Math.min(p.emCur,p.emMax);
        }
        p.history=p.history||[];
        p.history.push({ts:Date.now(),type:"stat",text:"Serment synchronisé — données mises à jour depuis l'onglet Serments",by:"Système"});
        updated++;
      }
    });
    if(updated>0){
      sp(players);
      if(CU&&CU.pid){var cur=gpid(CU.pid);if(cur&&cur.classe===nom)renderView();}
      notif(nom+" modifié — "+updated+" fiche(s) synchronisée(s).","ok");
    } else {
      notif("Serment modifié.","ok");
    }
  } else {
    notif("Serment '"+nom+"' créé.","ok");
  }
  closeModal("m-serm");
  renderAllSerments("p-serments-c"); popSSelects();
}
function delSerm(nomEnc){
  if(!CU||!can("manage_beasts")){ return; }
  var nom=decodeURIComponent(nomEnc);
  if(!confirm("Supprimer le Serment '"+nom+"' ?")) return;
  var custom=gsd(); delete custom[nom]; ssd(custom);
  renderAllSerments("p-serments-c"); notif("Serment supprimé.","inf");
}

var _branchSermNom=null,_branchIdx=-1;
function openAddBranch(nomEnc){
  if(!CU||!can("manage_beasts")){ return; }
  if(!can("manage_stats")){notif("Admin uniquement.","err");return;}
  _branchSermNom=decodeURIComponent(nomEnc); _branchIdx=-1;
  ge("mbr-title").textContent="Nouvelle branche — "+_branchSermNom;
  ge("mbr-nom").value=""; ge("mbr-style").value=""; ge("mbr-desc").value="";
  openModal("m-branch");
}
function openEditBranch(nomEnc,idx){
  if(!CU||!can("manage_beasts")){ return; }
  if(!can("manage_stats")){notif("Admin uniquement.","err");return;}
  var nom=decodeURIComponent(nomEnc); _branchSermNom=nom; _branchIdx=idx;
  var all=getAllSD(); var s=all[nom]; if(!s) return;
  var br=getBranches(nom,s)[idx]; if(!br) return;
  ge("mbr-title").textContent="Modifier branche — "+nom;
  ge("mbr-nom").value=br.nom||""; ge("mbr-style").value=br.style||""; ge("mbr-desc").value=br.desc||"";
  openModal("m-branch");
}
function saveBranch(){
  if(!CU||!can("manage_beasts")){ return; }
  var nom2=ge("mbr-nom").value.trim(); var style=ge("mbr-style").value.trim();
  if(!nom2){notif("Nom obligatoire.","err");return;}
  var custom=gsd(); var all=getAllSD(); var s=all[_branchSermNom];
  var branches=getBranches(_branchSermNom,s).map(function(b){return Object.assign({},b,{paliers:(b.paliers||[]).slice()});});
  var oldBranch=(_branchIdx>=0&&branches[_branchIdx])?Object.assign({},branches[_branchIdx]):null;
  var br={nom:nom2,style:style,desc:ge("mbr-desc").value.trim(),paliers:(_branchIdx>=0&&branches[_branchIdx]?branches[_branchIdx].paliers:[])};
  if(_branchIdx>=0) branches[_branchIdx]=br; else branches.push(br);
  if(!custom[_branchSermNom]) custom[_branchSermNom]=Object.assign({},s,{branches:branches});
  else custom[_branchSermNom].branches=branches;
  ssd(custom);
  if(oldBranch&&oldBranch.nom!==br.nom){
    var players=gp();
    var touched=0;
    players.forEach(function(p){
      if(p.classe===_branchSermNom&&branchMatchesLabel(oldBranch,p.branch)){
        p.branch=br.nom;
        p.history=p.history||[];
        p.history.push({ts:Date.now(),type:"serment",text:"Branche synchronisée — "+oldBranch.nom+" → "+br.nom,by:"Système"});
        touched++;
      }
    });
    if(touched) sp(players);
  }
  closeModal("m-branch");
  if(CU&&CU.pid) renderView();
  renderAllSerments("p-serments-c"); notif("Branche sauvegardée.","ok");
}
function delBranch(nomEnc,idx){
  if(!CU||!can("manage_beasts")){ return; }
  if(!confirm("Supprimer cette branche ?")) return;
  var nom=decodeURIComponent(nomEnc); var custom=gsd(); var all=getAllSD(); var s=all[nom];
  var branches=getBranches(nom,s).map(function(b){return Object.assign({},b);});
  var removed=branches[idx]?Object.assign({},branches[idx]):null;
  branches.splice(idx,1);
  if(!custom[nom]) custom[nom]=Object.assign({},s,{branches:branches}); else custom[nom].branches=branches;
  ssd(custom);
  if(removed){
    var players=gp();
    var touched=0;
    players.forEach(function(p){
      if(p.classe===nom&&branchMatchesLabel(removed,p.branch)){
        p.branch="Aucune";
        p.history=p.history||[];
        p.history.push({ts:Date.now(),type:"serment",text:"Branche retirée — retour à Aucune",by:"Système"});
        touched++;
      }
    });
    if(touched) sp(players);
  }
  if(CU&&CU.pid) renderView();
  renderAllSerments("p-serments-c"); notif("Branche supprimée.","inf");
}

var _palierSermNom=null,_palierBrIdx=-1;
function openAddPalier(nomEnc,brIdx){
  if(!CU||!can("manage_beasts")){ return; }
  if(!can("manage_stats")){notif("Admin uniquement.","err");return;}
  _palierSermNom=decodeURIComponent(nomEnc); _palierBrIdx=brIdx; _palierIdx=-1;
  ge("mpal-title").textContent="Nouveau palier";
  ge("mpal-niv").value="2"; ge("mpal-nom").value=""; ge("mpal-cout").value=""; ge("mpal-desc").value="";
  openModal("m-palier");
}
function savePalier(){
  if(!CU||!can("manage_beasts")){ return; }
  var niv=parseInt(ge("mpal-niv").value)||2;
  var nom2=ge("mpal-nom").value.trim(); var cout=ge("mpal-cout").value.trim(); var desc=ge("mpal-desc").value.trim();
  if(!nom2){notif("Nom du palier obligatoire.","err");return;}
  var custom=gsd(); var all=getAllSD(); var s=all[_palierSermNom];
  var branches=getBranches(_palierSermNom,s).map(function(b){return Object.assign({},b,{paliers:(b.paliers||[]).slice()});});
  var br=branches[_palierBrIdx]; if(!br){notif("Branche introuvable.","err");return;}
  if(_palierIdx>=0){
    // Edition d'un palier existant
    br.paliers[_palierIdx]={niv:niv,nom:nom2,cout:cout,desc:desc};
  } else {
    // Nouveau palier
    br.paliers.push({niv:niv,nom:nom2,cout:cout,desc:desc});
  }
  br.paliers.sort(function(a,b){return a.niv-b.niv;});
  if(!custom[_palierSermNom]) custom[_palierSermNom]=Object.assign({},s,{branches:branches}); else custom[_palierSermNom].branches=branches;
  ssd(custom); closeModal("m-palier");
  renderAllSerments("p-serments-c"); notif(_palierIdx>=0?"Palier modifié.":"Palier ajouté.","ok");
}

var _palierIdx=-1;
function openEditPalier(nomEnc,brIdx,palIdx){
  if(!CU||!can("manage_beasts")){ return; }
  if(!can("manage_stats")){notif("Admin uniquement.","err");return;}
  _palierSermNom=decodeURIComponent(nomEnc); _palierBrIdx=brIdx; _palierIdx=palIdx;
  var all=getAllSD(); var s=all[_palierSermNom];
  var branches=getBranches(_palierSermNom,s);
  var br=branches[brIdx]; if(!br) return;
  var p=br.paliers[palIdx]; if(!p) return;
  ge("mpal-title").textContent="Modifier palier — "+br.nom;
  ge("mpal-niv").value=p.niv||2;
  ge("mpal-nom").value=p.nom||"";
  ge("mpal-cout").value=p.cout||"";
  ge("mpal-desc").value=p.desc||"";
  openModal("m-palier");
}

function delPalier(nomEnc,brIdx,palIdx){
  if(!CU||!can("manage_beasts")){ return; }
  if(!confirm("Supprimer ce palier ?")) return;
  var nom=decodeURIComponent(nomEnc);
  var custom=gsd(); var all=getAllSD(); var s=all[nom];
  var branches=getBranches(nom,s).map(function(b){return Object.assign({},b,{paliers:(b.paliers||[]).slice()});});
  var br=branches[brIdx]; if(!br) return;
  br.paliers.splice(palIdx,1);
  if(!custom[nom]) custom[nom]=Object.assign({},s,{branches:branches}); else custom[nom].branches=branches;
  ssd(custom); renderAllSerments("p-serments-c"); notif("Palier supprimé.","inf");
}

var _changeSermPid=null;
var _changeBranchPid=null;
function openChangeBranch(pid){
  if(!CU||CU.type!=="staff"){ return; }
  if(!can("manage_stats")){notif("Admin uniquement.","err");return;}
  _changeBranchPid=pid;
  var p=gpid(pid); if(!p) return;
  var bundle=getPlayerSermentBundle(p);
  var s=bundle.def;
  ge("mcb-pname").textContent=p.name;
  ge("mcb-serm").textContent=p.classe;
  var opts=ge("mcb-options");
  if(!s||!bundle.branches.length){
    opts.innerHTML='<p style="color:var(--faint);font-style:italic;font-size:13px;">Ce Serment n\'a pas de branches.</p>';
    openModal("m-changebranch"); return;
  }
  var branches=bundle.branches.map(function(br){ return {nom:br.nom,style:br.style,flavor:br.flavor||br.desc||""}; });
  var STYLE_COLS={Brutalité:"var(--red)",Fluidité:"var(--glacier)",AOE:"var(--gold)",Précision:"var(--glacier-bright)",Mêlée:"var(--red)",Distance:"var(--gold)",Épuisement:"var(--purple)",Contrôle:"var(--glacier)","AOE Indéfendable":"var(--red)","Précision Défendable":"var(--glacier)","Équilibre offensif":"var(--gold)","Équilibre d'accumulation":"var(--glacier)",Tank:"var(--green)",Soin:"var(--green)",Offensif:"var(--gold)",Aggro:"var(--red)"};
  var STYLE_GLYPHS={Brutalité:"✦",Fluidité:"❄",AOE:"✺",Précision:"✧",Mêlée:"⚔",Distance:"➶",Épuisement:"☾",Contrôle:"◈","AOE Indéfendable":"✹","Précision Défendable":"✧","Équilibre offensif":"☼","Équilibre d'accumulation":"◌",Tank:"⛨",Soin:"✚",Offensif:"✦",Aggro:"☍"};
  opts.className="branch-choice-list";
  opts.innerHTML=(['Aucune'].concat(branches.map(function(b){return b.nom;}))).map(function(nom){
    var br=branches.find(function(b){return b.nom===nom;});
    var col=br?STYLE_COLS[br.style]||"var(--glacier)":"rgba(160,173,196,.72)";
    var isCur=(nom==="Aucune"&&(!p.branch||p.branch==="Aucune"))||(br&&branchMatchesLabel(br,p.branch));
    var shortNom=esc(nom.replace(/^Branche [AB] — /,""));
    var flavorShort="";
    if(br&&br.flavor){
      var words=br.flavor.split(" ");
      flavorShort=esc(words.slice(0,38).join(" ")+(words.length>38?"…":""));
    }
    var glyph=br?(STYLE_GLYPHS[br.style]||"✦"):"Ø";
    var kicker=br?"Branche disponible":"Désactiver la branche";
    var state=isCur?"Équipée":"Sélectionner";
    return '<label class="branch-choice'+(isCur?' is-active':'')+'" style="--branch-accent:'+col+';">'
      +'<input class="branch-choice-radio" type="radio" name="branch-sel" value="'+esc(nom)+'"'+(isCur?' checked':'')+'>'
      +'<div class="branch-choice-topline">'
        +'<span class="branch-choice-kicker">'+kicker+'</span>'
        +'<span class="branch-choice-state">'+state+'</span>'
      +'</div>'
      +'<div class="branch-choice-main">'
        +'<div class="branch-choice-glyph">'+glyph+'</div>'
        +'<div class="branch-choice-body">'
          +'<div class="branch-choice-head">'
            +'<span class="branch-choice-title">'+shortNom+'</span>'
            +(br?'<span class="branch-choice-badge">'+esc(br.style)+'</span>':'')
          +'</div>'
          +(flavorShort?'<div class="branch-choice-flavor">'+flavorShort+'</div>':'<div class="branch-choice-empty">Retire la branche active et rends le Serment neutre, sans orientation particulière.</div>')
        +'</div>'
      +'</div>'
      +'<div class="branch-choice-foot">'
        +'<span class="branch-choice-cta">'+(isCur?'Branche actuelle':'Cliquer pour choisir')+'</span>'
        +'<span class="branch-choice-line"></span>'
      +'</div>'
    +'</label>';
  }).join("");
  openModal("m-changebranch");
}
function saveChangeBranch(){
  if(!CU||CU.type!=="staff"){ return; }
  var p=gpid(_changeBranchPid); if(!p) return;
  var sel=document.querySelector('input[name="branch-sel"]:checked');
  if(!sel){notif("Sélectionne une branche.","err");return;}
  var old=p.branch||"Aucune";
  p.branch=sel.value;
  p.history=p.history||[];
  p.history.push({ts:Date.now(),type:"serment",text:"Branche : "+old+" → "+p.branch,by:"Admin "+CU.name});
  sysLog("branche_change","'"+esc(p.name)+"' : Branche "+old+" → "+p.branch,CU?CU.name:"Staff");
  up(p); closeModal("m-changebranch");
  if(CU.pid===_changeBranchPid||_viewPid===_changeBranchPid) renderView();
  notif(p.name+" : Branche changée en "+esc(p.branch)+".","ok");
}

function openChangeSerm(pid){
  if(!CU||CU.type!=="staff"){ return; }
  if(!can("manage_stats")){notif("Admin uniquement.","err");return;}
  _changeSermPid=pid; var p=gpid(pid); if(!p) return;
  ge("mcs-pname").textContent=p.name;
  ge("mcs-cur").textContent=p.classe+" — "+(getPlayerSermentBundle(p).weapon||p.arme||"");
  var sel=ge("mcs-sel"); sel.innerHTML='<option value="">— Choisir —</option>';
  var all=getAllSD();
  Object.keys(all).forEach(function(k){ sel.innerHTML+='<option value="'+k+'"'+(p.classe===k?' selected':'')+'>'+k+'</option>'; });
  openModal("m-changeserm");
}
function saveChangeSerm(){
  if(!CU||CU.type!=="staff"){ return; }
  var p=gpid(_changeSermPid); if(!p) return;
  var sel=ge("mcs-sel").value; if(!sel){notif("Choisis un Serment.","err");return;}
  var all=getAllSD(); var s=all[sel]; if(!s){notif("Serment introuvable.","err");return;}
  var old=p.classe;
  p.classe=sel; p.arme=s.arme; p.branch="Aucune"; p.sLevel=1; p.sXp=0; p.sXpMax=10;
  p.history=p.history||[];
  p.history.push({ts:Date.now(),type:"serment",text:"Serment : "+old+" -> "+sel,by:"Admin "+CU.name});
  sysLog("serment_change","'"+esc(p.name)+"' : Serment "+old+" → "+sel,CU?CU.name:"Staff");
  up(p); closeModal("m-changeserm");
  if(CU.pid===_changeSermPid) renderView();
  renderSPList(); notif(p.name+" : Serment changé en "+sel+".","ok");
}


function renderSerm(p){
  var bundle=getPlayerSermentBundle(p);
  var s=bundle.def;
  var c=ge("p-serm-c");
  if(!s){c.innerHTML='<p style="color:var(--dim)">Serment introuvable.</p>';return;}
  var chosenBranch=bundle.branch;
  var hasBr=!!chosenBranch;
  var branches=bundle.branches.slice();
  // Compatibilité bA/bB
  if(!branches.length){if(s.bA)branches.push(s.bA);if(s.bB)branches.push(s.bB);}

  var html='<div class="scrd">';
  // En-tête
  html+='<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;">';
  html+='<div style="font-size:28px;width:48px;height:48px;background:var(--bg4);border:1px solid var(--border2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">'+(bundle.icon||WEAPON_ICONS[p.classe]||"✦")+'</div>';
  html+='<div><div class="snm">'+esc(p.classe)+'</div><div class="swp">'+esc(bundle.weapon||s.arme||p.arme||"")+'</div></div>';
  html+='</div>';
  // Stats
  html+='<div class="sstats"><div class="sst"><div class="sstv">'+s.pvN+'</div><div class="sstl">PV/niv</div></div><div class="sst"><div class="sstv">'+s.epN+'</div><div class="sstl">EP/niv</div></div><div class="sst"><div class="sstv">'+s.emN+'</div><div class="sstl">EM/niv</div></div><div class="sst"><div class="sstv">'+s.dmg+'</div><div class="sstl">Dmg frappe</div></div></div>';
  // Lore
  html+='<p style="font-style:italic;color:var(--dim);font-size:14px;line-height:1.7;margin-bottom:16px;border-left:2px solid var(--glacier-dim);padding-left:12px;">'+esc(s.lore)+'</p>';
  html+='<div class="dv"></div>';

  // Branches
  html+='<div style="display:flex;flex-direction:column;gap:12px;margin-top:14px;">';
  branches.forEach(function(br){
    var isChosen=hasBr&&chosenBranch&&branchMatchesLabel(br,chosenBranch.nom);
    var col=STYLE_COLORS[br.style]||"var(--glacier)";
    var borderCol=isChosen?"var(--glacier)":"var(--border)";
    var bgCol=isChosen?"rgba(126,184,212,0.04)":"var(--bg4)";

    html+='<div style="border:1px solid '+borderCol+';background:'+bgCol+';padding:16px;position:relative;">';

    // Badge "Ma branche" + boutons admin
    if(isChosen){
      var adminBtns='';
      if(can("manage_stats")){
        adminBtns+='<button class="btn btn-sm btn-gold" onclick="oES(\''+p.id+'\')" style="font-size:10px;padding:2px 10px;"><span>✎ Stats</span></button>';
        adminBtns+='<button class="btn btn-sm" onclick="openChangeSerm(\''+p.id+'\')" style="font-size:10px;padding:2px 10px;border-color:var(--glacier-dim);color:var(--glacier-dim);"><span>⇄ Serment</span></button>';
        adminBtns+='<button class="btn btn-sm" onclick="openChangeBranch(\''+p.id+'\')" style="font-size:10px;padding:2px 10px;border-color:var(--purple);color:var(--purple);"><span>⇄ Branche</span></button>';
      }
      html+='<div style="position:absolute;top:-1px;right:8px;display:flex;align-items:center;gap:6px;">';
      if(adminBtns) html+=adminBtns;
      html+='<div style="font-family:var(--fd);font-size:8px;letter-spacing:2px;text-transform:uppercase;padding:2px 10px;background:var(--glacier);color:var(--bg);border-bottom-left-radius:2px;border-bottom-right-radius:2px;">Ma branche</div>';
      html+='</div>';
    }

    // En-tête branche
    html+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:'+(br.desc?'8px':'12px')+'">';
    html+='<span style="font-family:var(--fd);font-size:14px;letter-spacing:1px;color:'+(isChosen?'var(--glacier)':'var(--text)')+';">'+esc(br.nom)+'</span>';
    html+='<span style="font-family:var(--fd);font-size:8px;letter-spacing:2px;text-transform:uppercase;padding:2px 8px;border:1px solid '+col+';color:'+col+';">'+esc(br.style)+'</span>';
    html+='</div>';

    // Description flavor branche
    if(br.flavor) html+='<p style="font-size:13px;color:var(--dim);font-style:italic;margin-bottom:12px;line-height:1.6;border-left:2px solid '+col+';padding-left:10px;opacity:.85;">'+esc(br.flavor)+'</p>';
    else if(br.desc) html+='<p style="font-size:13px;color:var(--dim);font-style:italic;margin-bottom:12px;line-height:1.6;border-left:2px solid '+col+';padding-left:10px;opacity:.8;">'+esc(br.desc)+'</p>';

    // Paliers
    var pals=br.paliers||[];
    if(pals.length){
      html+='<div style="display:flex;flex-direction:column;gap:3px;">';
      pals.forEach(function(pal){
        var unlocked=p.sLevel>=pal.niv;
        var locked=!unlocked;
        html+='<div style="border:1px solid '+(unlocked&&isChosen?'var(--glacier-dim)':(unlocked?'var(--border2)':'var(--border)'))+';background:'+(unlocked?'var(--bg3)':'var(--bg)')+';padding:8px 12px;'+(locked?'opacity:.4;':'')+'">';
        html+='<div style="display:flex;align-items:center;gap:10px;">';
        html+='<span style="font-family:var(--fm);color:'+(unlocked&&isChosen?'var(--glacier)':'var(--glacier-dim)')+';font-size:10px;min-width:44px;font-weight:600;">Niv.'+pal.niv+'</span>';
        html+='<span style="font-family:var(--fd);font-size:12px;color:'+(unlocked?'var(--text)':'var(--faint)')+';">'+esc(pal.nom)+'</span>';
        if(pal.cout) html+='<span style="font-family:var(--fm);font-size:10px;color:var(--faint);margin-left:auto;">'+esc(pal.cout)+'</span>';
        if(locked) html+='<span style="font-size:10px;color:var(--faint);margin-left:4px;">🔒</span>';
        html+='</div>';
        if(pal.desc&&unlocked) html+='<div style="font-size:12px;color:var(--dim);font-style:italic;padding:4px 0 0 54px;">'+esc(pal.desc)+'</div>';
        html+='</div>';
      });
      html+='</div>';
    }
    html+='</div>';
  });
  html+='</div>';
  html+='</div>';
  c.innerHTML=html;
}

var _beastFilter='all', _beastPvSort=null, _beastNivSort=null, _beastAlpha=null, _beastSearch='';
var _beastAdminFilters={visibility:'all',image:'all',usage:'all',archived:'active',completeness:'all',danger:'all',sort:'recent',levelMin:'',levelMax:''};
var _beastUsageCache={stamp:'',map:{}};

function _beastIsBoss(b){
  if(!b) return false;
  if(cBehaviorLabel(b.beh)==='Boss') return true;
  var txt=((b.sub||'')+' '+(b.desc||'')+' '+(b.nom||'')).toLowerCase();
  return txt.indexOf('boss')>-1 || txt.indexOf('élite')>-1 || txt.indexOf('elite')>-1;
}
function _beastCompletenessIssues(b){
  var issues=[];
  if(!b) return issues;
  if(!(b.img||'').trim()) issues.push('image');
  if(!(b.desc||'').trim()) issues.push('description');
  if(!(b.comp||'').trim()) issues.push('compétence');
  if(!(b.frappe||'').trim()) issues.push('frappe');
  return issues;
}
function _beastAgo(ts){
  ts=Number(ts)||0; if(!ts) return 'Jamais';
  var diff=Math.max(0, Date.now()-ts), mins=Math.floor(diff/60000), hrs=Math.floor(diff/3600000), days=Math.floor(diff/86400000);
  return days>0?(days+'j'):(hrs>0?(hrs+'h'):(mins>0?(mins+' min'):'À l\'instant'));
}
function _beastUsageStamp(){
  var arcs=[]; try{ arcs=getAllCombatArchives(); }catch(e){ arcs=[]; }
  var maxTs=0;
  arcs.forEach(function(a){ var ts=Number(a&&a.savedAt||0); if(ts>maxTs) maxTs=ts; });
  return String(gb().length)+'|'+String(arcs.length)+'|'+String(maxTs);
}
function _buildBeastUsageMap(){
  var stamp=_beastUsageStamp();
  if(_beastUsageCache.stamp===stamp && _beastUsageCache.map) return _beastUsageCache.map;
  var byId={}, byName={}, map={};
  gb().forEach(function(b){ byId[String(b&&b.id||'')]=b; byName[String((b&&b.nom)||'').toLowerCase()]=b; });
  var arcs=[]; try{ arcs=getAllCombatArchives(); }catch(e){ arcs=[]; }
  arcs.forEach(function(arc){
    if(!arc || arc._draft) return;
    var savedAt=Number(arc.savedAt)||0;
    var title=String(arc.name||arc.label||arc.title||'Combat sans nom').trim();
    var players=(arc.fighters||[]).filter(function(f){ return f&&f.type==='player'; }).map(function(f){ return String(f.name||'').trim(); }).filter(Boolean);
    (arc.fighters||[]).forEach(function(f){
      if(!f || f.type!=='beast') return;
      var beast=null;
      var id=String(f.bid||'').trim();
      if(id && byId[id]) beast=byId[id];
      if(!beast){
        var nm=String(f.name||'').replace(/\s+\d+$/,'').trim().toLowerCase();
        if(nm && byName[nm]) beast=byName[nm];
      }
      if(!beast) return;
      var key=String(beast.id||'');
      if(!map[key]) map[key]={count:0,lastUsedAt:0,recent:false,combats:[]};
      map[key].count += 1;
      if(savedAt > map[key].lastUsedAt) map[key].lastUsedAt = savedAt;
      if(savedAt >= Date.now()-30*24*60*60*1000) map[key].recent = true;
      if(map[key].combats.length < 6){
        map[key].combats.push({id:String(arc.id||''),title:title,savedAt:savedAt,players:players.slice(0,4),owner:String(arc._owner||arc.owner||'')});
      }
    });
  });
  _beastUsageCache={stamp:stamp,map:map};
  return map;
}
function _beastUsageFor(beast){
  if(!beast) return {count:0,lastUsedAt:0,recent:false,combats:[]};
  var map=_buildBeastUsageMap();
  return map[String(beast.id||'')] || {count:0,lastUsedAt:0,recent:false,combats:[]};
}
function _beastDangerKey(b){
  if(_beastIsBoss(b)) return 'boss';
  switch(_beastThreatBand(b)){
    case 'Menace majeure': return 'majeure';
    case 'Menace élevée': return 'elevee';
    case 'Menace sérieuse': return 'serieuse';
    default: return 'moderee';
  }
}
function _beastAdminSummaryText(total, filtered){
  return String(filtered)+' / '+String(total)+' créature'+(filtered>1?'s':'')+' visibles';
}
function setBeastAdminFilter(key, value){
  _beastAdminFilters[key]=value;
  renderBGrid('p-bgrd', CU&&CU.type==='staff');
}
function resetBeastAdminFilters(){
  _beastAdminFilters={visibility:'all',image:'all',usage:'all',archived:'active',completeness:'all',danger:'all',sort:'recent',levelMin:'',levelMax:''};
  renderBGrid('p-bgrd', CU&&CU.type==='staff');
}
function renderBeastAdminToolbar(total, filteredCount){
  var grid=ge('p-bgrd');
  var host=ge('beast-admin-toolbar');
  if(!host && grid && grid.parentNode){ host=document.createElement('div'); host.id='beast-admin-toolbar'; grid.parentNode.insertBefore(host, grid); }
  if(!host) return;
  if(!(CU && can('manage_beasts'))){ host.innerHTML=''; return; }
  var f=_beastAdminFilters;
  host.innerHTML=''
    +'<div class="card" style="margin-bottom:14px;padding:14px 16px;">'
      +'<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;">'
        +'<div>'
          +'<div class="card-title">Pilotage admin du bestiaire</div>'
          +'<div style="font-size:12px;color:var(--faint);margin-top:4px;">'+esc(_beastAdminSummaryText(total||0, filteredCount||0))+' · filtres cumulables · duplication, aperçu, archivage, JSON et simulateur.</div>'
        +'</div>'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap;">'
          +'<button class="btn btn-sm" onclick="openBeastZoneManager()"><span>Zones</span></button>'
          +'<button class="btn btn-sm" onclick="importBeastJson()"><span>Importer JSON</span></button>'
          +'<button class="btn btn-sm" onclick="resetBeastAdminFilters()"><span>Réinitialiser</span></button>'
        +'</div>'
      +'</div>'
      +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-top:14px;">'
        +'<label><div style="font-size:11px;color:var(--faint);margin-bottom:4px;">Visibilité</div><select onchange="setBeastAdminFilter(\'visibility\',this.value)" style="width:100%;padding:10px 12px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);"><option value="all"'+(f.visibility==='all'?' selected':'')+'>Toutes</option><option value="published"'+(f.visibility==='published'?' selected':'')+'>Publiées</option><option value="hidden"'+(f.visibility==='hidden'?' selected':'')+'>Masquées</option></select></label>'
        +'<label><div style="font-size:11px;color:var(--faint);margin-bottom:4px;">Image</div><select onchange="setBeastAdminFilter(\'image\',this.value)" style="width:100%;padding:10px 12px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);"><option value="all"'+(f.image==='all'?' selected':'')+'>Toutes</option><option value="with"'+(f.image==='with'?' selected':'')+'>Avec image</option><option value="without"'+(f.image==='without'?' selected':'')+'>Sans image</option></select></label>'
        +'<label><div style="font-size:11px;color:var(--faint);margin-bottom:4px;">Usage</div><select onchange="setBeastAdminFilter(\'usage\',this.value)" style="width:100%;padding:10px 12px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);"><option value="all"'+(f.usage==='all'?' selected':'')+'>Tous</option><option value="recent"'+(f.usage==='recent'?' selected':'')+'>Utilisées récemment</option><option value="never"'+(f.usage==='never'?' selected':'')+'>Jamais utilisées</option></select></label>'
        +'<label><div style="font-size:11px;color:var(--faint);margin-bottom:4px;">Archivage</div><select onchange="setBeastAdminFilter(\'archived\',this.value)" style="width:100%;padding:10px 12px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);"><option value="active"'+(f.archived==='active'?' selected':'')+'>Actives</option><option value="all"'+(f.archived==='all'?' selected':'')+'>Toutes</option><option value="archived"'+(f.archived==='archived'?' selected':'')+'>Archivées</option></select></label>'
        +'<label><div style="font-size:11px;color:var(--faint);margin-bottom:4px;">Complétude</div><select onchange="setBeastAdminFilter(\'completeness\',this.value)" style="width:100%;padding:10px 12px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);"><option value="all"'+(f.completeness==='all'?' selected':'')+'>Toutes</option><option value="complete"'+(f.completeness==='complete'?' selected':'')+'>Complètes</option><option value="incomplete"'+(f.completeness==='incomplete'?' selected':'')+'>À compléter</option></select></label>'
        +'<label><div style="font-size:11px;color:var(--faint);margin-bottom:4px;">Menace</div><select onchange="setBeastAdminFilter(\'danger\',this.value)" style="width:100%;padding:10px 12px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);"><option value="all"'+(f.danger==='all'?' selected':'')+'>Toutes</option><option value="boss"'+(f.danger==='boss'?' selected':'')+'>Boss</option><option value="majeure"'+(f.danger==='majeure'?' selected':'')+'>Menace majeure</option><option value="elevee"'+(f.danger==='elevee'?' selected':'')+'>Menace élevée</option><option value="serieuse"'+(f.danger==='serieuse'?' selected':'')+'>Menace sérieuse</option><option value="moderee"'+(f.danger==='moderee'?' selected':'')+'>Menace modérée</option></select></label>'
        +'<label><div style="font-size:11px;color:var(--faint);margin-bottom:4px;">Tri</div><select onchange="setBeastAdminFilter(\'sort\',this.value)" style="width:100%;padding:10px 12px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);"><option value="recent"'+(f.sort==='recent'?' selected':'')+'>Modifiées récemment</option><option value="old"'+(f.sort==='old'?' selected':'')+'>Plus anciennes</option><option value="name_asc"'+(f.sort==='name_asc'?' selected':'')+'>Nom A → Z</option><option value="name_desc"'+(f.sort==='name_desc'?' selected':'')+'>Nom Z → A</option><option value="level_desc"'+(f.sort==='level_desc'?' selected':'')+'>Niveau décroissant</option><option value="threat_desc"'+(f.sort==='threat_desc'?' selected':'')+'>Menace décroissante</option><option value="used_recent"'+(f.sort==='used_recent'?' selected':'')+'>Dernière utilisation</option><option value="used_count"'+(f.sort==='used_count'?' selected':'')+'>Usage total</option><option value="published_first"'+(f.sort==='published_first'?' selected':'')+'>Publiées d\'abord</option></select></label>'
        +'<label><div style="font-size:11px;color:var(--faint);margin-bottom:4px;">Niveau min</div><input type="number" min="1" value="'+esc(f.levelMin||'')+'" oninput="setBeastAdminFilter(\'levelMin\',this.value)" style="width:100%;padding:10px 12px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);"></label>'
        +'<label><div style="font-size:11px;color:var(--faint);margin-bottom:4px;">Niveau max</div><input type="number" min="1" value="'+esc(f.levelMax||'')+'" oninput="setBeastAdminFilter(\'levelMax\',this.value)" style="width:100%;padding:10px 12px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);"></label>'
      +'</div>'
    +'</div>';
}


function beastSearch(q){
  _beastSearch=(q||'').toLowerCase().trim();
  renderBGrid('p-bgrd',CU&&CU.role&&CU.role!=='joueur');
}

function _clearSortBtns(except){
  ['bfilt-pv','bfilt-niv','bfilt-az'].forEach(function(id){
    var b=ge(id); if(!b||id===except) return;
    b.classList.remove('active');
  });
}

function setBeastFilter(beh,btn){
  _beastFilter=beh;
  document.querySelectorAll('.bfilt[data-beh]').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  renderBGrid('p-bgrd',CU&&CU.type==='staff');
}

function toggleBeastPvSort(btn){
  _beastNivSort=null; _beastAlpha=null;
  _clearSortBtns('bfilt-pv');
  ge('bfilt-niv').textContent='Niv ↕'; ge('bfilt-az').textContent='A→Z';
  if(_beastPvSort===null||_beastPvSort==='desc') _beastPvSort='asc';
  else _beastPvSort='desc';
  btn.textContent='PV '+(_beastPvSort==='asc'?'↑':'↓');
  btn.classList.add('active');
  renderBGrid('p-bgrd',CU&&CU.type==='staff');
}

function toggleBeastNivSort(btn){
  _beastPvSort=null; _beastAlpha=null;
  _clearSortBtns('bfilt-niv');
  ge('bfilt-pv').textContent='PV ↕'; ge('bfilt-az').textContent='A→Z';
  if(_beastNivSort===null||_beastNivSort==='desc') _beastNivSort='asc';
  else _beastNivSort='desc';
  btn.textContent='Niv '+(_beastNivSort==='asc'?'↑':'↓');
  btn.classList.add('active');
  renderBGrid('p-bgrd',CU&&CU.type==='staff');
}

function toggleBeastAlpha(btn){
  _beastPvSort=null; _beastNivSort=null;
  _clearSortBtns('bfilt-az');
  ge('bfilt-pv').textContent='PV ↕'; ge('bfilt-niv').textContent='Niv ↕';
  if(_beastAlpha===null||_beastAlpha==='desc') _beastAlpha='asc';
  else _beastAlpha='desc';
  btn.textContent=_beastAlpha==='asc'?'A→Z':'Z→A';
  btn.classList.add('active');
  renderBGrid('p-bgrd',CU&&CU.type==='staff');
}

function renderBGrid(tid,staff){
  var beasts=gb();
  var el=ge(tid);if(!el)return;
  var shouldRefocus = tid==="p-bgrd" && !!(ge("bestiaire") && ge("bestiaire").classList.contains("active"));
  var isDesigner=CU&&(isAdminRole(CU)||roleKey(CU)==="designer");
  var isAdminBestiary=!!(CU&&can("manage_beasts"));
  var _bhl=(typeof BHL!=='undefined'&&BHL)?BHL:{};
  var filtered=_beastFilter==='all'?beasts.slice():beasts.filter(function(b){ return (_bhl[b.beh]||String(b.beh||'').replace(/^./,function(m){return m.toUpperCase();}))===_beastFilter; });
  if(!isDesigner) filtered=filtered.filter(function(b){return !b.hidden && !b.archived;});
  if(_beastSearch){
    var q=_beastSearch;
    filtered=filtered.filter(function(b){
      return (b.nom||'').toLowerCase().indexOf(q)>-1
        ||(b.sub||'').toLowerCase().indexOf(q)>-1
        ||(b.desc||'').toLowerCase().indexOf(q)>-1
        ||(b.adminNote||'').toLowerCase().indexOf(q)>-1
        ||String(b.niv||'').indexOf(q)>-1;
    });
  }
  var usageMap=isAdminBestiary?_buildBeastUsageMap():{};
  if(isAdminBestiary){
    filtered=filtered.filter(function(b){
      var usage=usageMap[String(b&&b.id||'')] || {count:0,lastUsedAt:0,recent:false};
      var issues=_beastCompletenessIssues(b);
      var lvl=Number(b&&b.niv||0);
      if(_beastAdminFilters.visibility==='published' && b.hidden) return false;
      if(_beastAdminFilters.visibility==='hidden' && !b.hidden) return false;
      if(_beastAdminFilters.image==='with' && !(b.img||'').trim()) return false;
      if(_beastAdminFilters.image==='without' && (b.img||'').trim()) return false;
      if(_beastAdminFilters.usage==='recent' && !usage.recent) return false;
      if(_beastAdminFilters.usage==='never' && usage.count>0) return false;
      if(_beastAdminFilters.archived==='active' && b.archived) return false;
      if(_beastAdminFilters.archived==='archived' && !b.archived) return false;
      if(_beastAdminFilters.completeness==='complete' && issues.length) return false;
      if(_beastAdminFilters.completeness==='incomplete' && !issues.length) return false;
      if(_beastAdminFilters.danger!=='all' && _beastDangerKey(b)!==_beastAdminFilters.danger) return false;
      if(_beastAdminFilters.levelMin && lvl < (parseInt(_beastAdminFilters.levelMin,10)||0)) return false;
      if(_beastAdminFilters.levelMax && lvl > (parseInt(_beastAdminFilters.levelMax,10)||999)) return false;
      return true;
    });
  }
  if(_beastPvSort)  filtered.sort(function(a,b){return _beastPvSort==='asc'?(a.pv-b.pv):(b.pv-a.pv);});
  if(_beastNivSort) filtered.sort(function(a,b){return _beastNivSort==='asc'?(a.niv-b.niv):(b.niv-a.niv);});
  if(_beastAlpha)   filtered.sort(function(a,b){var r=(a.nom||'').localeCompare((b.nom||''),'fr');return _beastAlpha==='asc'?r:-r;});
  if(isAdminBestiary){
    filtered.sort(function(a,b){
      var ua=usageMap[String(a&&a.id||'')] || {count:0,lastUsedAt:0};
      var ub=usageMap[String(b&&b.id||'')] || {count:0,lastUsedAt:0};
      switch(_beastAdminFilters.sort){
        case 'old': return (a.createdAt||0)-(b.createdAt||0);
        case 'name_asc': return String(a.nom||'').localeCompare(String(b.nom||''),'fr');
        case 'name_desc': return String(b.nom||'').localeCompare(String(a.nom||''),'fr');
        case 'level_desc': return (Number(b.niv)||0)-(Number(a.niv)||0);
        case 'threat_desc': return ((_beastDangerKey(b)==='boss'?999:0)+(Number(b.niv)||0)+(Number(b.pv)||0)/20) - ((_beastDangerKey(a)==='boss'?999:0)+(Number(a.niv)||0)+(Number(a.pv)||0)/20);
        case 'used_recent': return (ub.lastUsedAt||0)-(ua.lastUsedAt||0);
        case 'used_count': return (ub.count||0)-(ua.count||0);
        case 'published_first': return (a.hidden?1:0)-(b.hidden?1:0) || String(a.nom||'').localeCompare(String(b.nom||''),'fr');
        case 'recent':
        default: return (b.updatedAt||b.createdAt||0)-(a.updatedAt||a.createdAt||0);
      }
    });
  }
  renderBeastAdminToolbar(beasts.length, filtered.length);
  if(!filtered.length){
    var msg=_beastSearch?'Aucune créature ne correspond à "'+_beastSearch+'".':'Aucune créature pour ce filtre.';
    el.innerHTML='<p style="color:var(--faint);font-style:italic;padding:20px 0;">'+msg+'</p>';
    if(shouldRefocus){
      setTimeout(function(){ try{ _focusOnScreen(ge("bestiaire"), 'auto'); }catch(_e){} }, 0);
    }
    return;
  }
  el.innerHTML=filtered.map(function(b){return bCard(b,staff);}).join("");
  if(shouldRefocus){
    setTimeout(function(){ try{ _focusOnScreen(ge("bestiaire"), 'auto'); }catch(_e){} }, 0);
    setTimeout(function(){ try{ _focusOnScreen(ge("bestiaire"), 'smooth'); }catch(_e){} }, 90);
  }
}



var BHC = {
  passive: '#7eb8d4',
  passif: '#7eb8d4',
  neutre: '#c9a84c',
  neutral: '#c9a84c',
  agressif: '#c45858',
  aggressive: '#c97a4a',
  'très agressif': '#c94a4a',
  'tres agressif': '#c94a4a',
  very_aggressive: '#c94a4a',
  gibier: '#7bcf9b',
  prey: '#7bcf9b',
  boss: '#b98cff'
};
var BHL = {
  passive: 'Passif',
  passif: 'Passif',
  neutre: 'Neutre',
  neutral: 'Neutre',
  agressif: 'Agressif',
  aggressive: 'Agressif',
  'très agressif': 'Très agressif',
  'tres agressif': 'Très agressif',
  very_aggressive: 'Très agressif',
  gibier: 'Gibier',
  prey: 'Gibier',
  boss: 'Boss'
};

if(typeof window.cBehaviorKey!=='function'){
  window.cBehaviorKey = function(raw){
    return String(raw||'').trim().toLowerCase()
      .replace(/[’']/g,'')
      .replace(/\s+/g,' ')
      .normalize('NFD').replace(/[̀-ͯ]/g,'');
  };
}
if(typeof window.cBehaviorLabel!=='function'){
  window.cBehaviorLabel = function(raw){
    var key=window.cBehaviorKey(raw);
    return (window.BHL&&window.BHL[key])||String(raw||'').trim()||'';
  };
}
if(typeof window.cBehaviorColor!=='function'){
  window.cBehaviorColor = function(raw){
    var key=window.cBehaviorKey(raw);
    return (window.BHC&&window.BHC[key])||'var(--faint)';
  };
}
if(typeof window.cBehaviorTag!=='function'){
  window.cBehaviorTag = function(raw, opts){
    var label=window.cBehaviorLabel(raw); if(!label) return '';
    var col=window.cBehaviorColor(raw);
    opts=opts||{};
    var fs=opts.fontSize||8;
    var pad=opts.padding||'2px 8px';
    var ls=opts.letterSpacing||'1.2px';
    var radius=opts.radius||'999px';
    return '<span style="display:inline-flex;align-items:center;font-family:var(--fd);font-size:'+fs+'px;letter-spacing:'+ls+';padding:'+pad+';border:1px solid '+col+';border-radius:'+radius+';color:'+col+';background:rgba(0,0,0,0.14);white-space:nowrap;">'+esc(label)+'</span>';
  };
}

var BHM = {
  gibier: { icon: '🐇', short: 'Gibier', hint: 'Fuit ou évite le combat.' },
  prey: { icon: '🐇', short: 'Gibier', hint: 'Fuit ou évite le combat.' },
  passif: { icon: '😐', short: 'Passif', hint: 'N’attaque pas sans raison.' },
  passive: { icon: '😐', short: 'Passif', hint: 'N’attaque pas sans raison.' },
  neutre: { icon: '⚖', short: 'Neutre', hint: 'Réagit selon le contexte.' },
  neutral: { icon: '⚖', short: 'Neutre', hint: 'Réagit selon le contexte.' },
  agressif: { icon: '⚠', short: 'Agressif', hint: 'Attaque facilement.' },
  aggressive: { icon: '⚠', short: 'Agressif', hint: 'Attaque facilement.' },
  'tres agressif': { icon: '☠', short: 'Très agressif', hint: 'Attaque à vue.' },
  boss: { icon: '👑', short: 'Boss', hint: 'Créature d’élite.' }
};
function bNorm(v){
  try{ return String(v||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim(); }
  catch(_e){ return String(v||'').toLowerCase().trim(); }
}
['Gibier','Passif','Neutre','Agressif','Très agressif','Tres agressif','Boss'].forEach(function(k){
  var nk=bNorm(k);
  if(BHC[nk] && !BHC[k]) BHC[k]=BHC[nk];
  if(BHL[nk] && !BHL[k]) BHL[k]=BHL[nk];
});
function bMeta(beh){
  var key=bNorm(beh);
  return BHM[key]||null;
}
function bTag(beh,variant){
  var key=bNorm(beh);
  var meta=bMeta(beh)||{};
  var col=BHC[beh]||BHC[key]||'var(--glacier)';
  var lbl=BHL[beh]||BHL[key]||String(beh||'').replace(/^./,function(m){return m.toUpperCase();});
  var icon=meta.icon||'•';
  var shortTxt=meta.short||lbl;
  var hint=meta.hint||lbl;
  if(!lbl) return '';
  if(variant==='compact'){
    return '<span title="'+esc(hint)+'" style="display:inline-flex;align-items:center;gap:5px;padding:2px 7px;border:1px solid '+col+'55;background:'+col+'12;color:'+col+';font-family:var(--fd);font-size:7px;letter-spacing:1px;border-radius:999px;white-space:nowrap;">'
      +'<span style="font-size:9px;line-height:1;">'+icon+'</span><span>'+lbl+'</span></span>';
  }
  if(variant==='full'){
    return '<span title="'+esc(hint)+'" style="display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border:1px solid '+col+'66;background:'+col+'12;color:'+col+';font-family:var(--fd);font-size:8px;letter-spacing:1.2px;border-radius:999px;white-space:nowrap;">'
      +'<span style="font-size:10px;line-height:1;">'+icon+'</span><span>'+lbl+'</span></span>';
  }
  return '<span title="'+esc(hint)+'" style="display:inline-flex;align-items:center;gap:5px;padding:2px 7px;border:1px solid '+col+'55;background:'+col+'12;color:'+col+';font-family:var(--fd);font-size:7px;letter-spacing:1px;border-radius:999px;white-space:nowrap;">'
    +'<span style="font-size:9px;line-height:1;">'+icon+'</span><span>'+lbl+'</span></span>';
}

function _beastZoneInputValues(id){
  var node=ge(id);
  var raw=node?String(node.value||''):'';
  var seen=Object.create(null), out=[];
  raw.split(/[,;\n]/).forEach(function(part){
    var z=String(part||'').trim();
    if(!z || seen[z]) return;
    seen[z]=1;
    out.push(z);
  });
  return out.slice(0,24);
}
function _beastZoneNames(){
  var seen=Object.create(null), out=[];
  gb().forEach(function(b){
    (Array.isArray(b&&b.zones)?b.zones:[]).forEach(function(z){
      z=String(z||'').trim();
      if(!z || seen[z]) return;
      seen[z]=1;
      out.push(z);
    });
  });
  out.sort(function(a,b){ return a.localeCompare(b,'fr',{sensitivity:'base'}); });
  return out;
}
var _beastZoneReturnAfterEdit='';
function _beastZoneCurrentName(){
  return String((ge("bz-name")&&ge("bz-name").value)||(ge("bz-select")&&ge("bz-select").value)||'').trim();
}
function openBeastZoneManager(zone){
  if(!can("manage_beasts")){ notif("Permission insuffisante.","err"); return; }
  renderBeastZoneManager(zone||(_beastZoneNames()[0]||''));
  openModal("m-beast-zones");
}
function beastZoneOpenEditMob(id){
  if(!can("manage_beasts")){ notif("Permission insuffisante.","err"); return; }
  _beastZoneReturnAfterEdit=_beastZoneCurrentName();
  closeModal("m-beast-zones");
  openEditBeast(id);
}
function beastZoneRemoveMob(id, zone){
  if(!can("manage_beasts")){ notif("Permission insuffisante.","err"); return; }
  zone=String(zone||_beastZoneCurrentName()||'').trim();
  if(!zone) return;
  var beasts=gb();
  var b=beasts.find(function(x){ return String(x&&x.id||'')===String(id||''); });
  if(!b) return;
  b.zones=(Array.isArray(b.zones)?b.zones:[]).filter(function(z){ return z!==zone; });
  b.updatedAt=Date.now();
  sb(beasts);
  renderBeastZoneManager(zone);
  renderBGrid("p-bgrd",!!(CU&&can("manage_beasts")));
  notif((b.nom||"Mob")+" retiré de la zone.","ok");
}
function beastZoneFilterList(q){
  q=String(q||'').trim().toLowerCase();
  document.querySelectorAll("#m-beast-zones .bz-row").forEach(function(row){
    var hay=String(row.getAttribute("data-search")||'').toLowerCase();
    row.style.display=(!q || hay.indexOf(q)>=0)?"flex":"none";
  });
}
function beastZoneSetVisible(checked){
  document.querySelectorAll("#m-beast-zones .bz-row").forEach(function(row){
    if(row.style.display==="none") return;
    var box=row.querySelector(".bz-beast");
    if(box) box.checked=!!checked;
    row.classList.toggle("is-selected", !!checked);
  });
  beastZoneRefreshCount();
}
function beastZoneToggleRow(input){
  if(!input) return;
  var row=input.closest ? input.closest(".bz-row") : null;
  if(row) row.classList.toggle("is-selected", !!input.checked);
  beastZoneRefreshCount();
}
function beastZoneRefreshCount(){
  var count=0;
  document.querySelectorAll("#m-beast-zones .bz-beast").forEach(function(node){ if(node.checked) count++; });
  var el=ge("bz-count");
  if(el) el.textContent=count+" mob"+(count>1?"s":"")+" dans la zone";
}
function renderBeastZoneManager(zone){
  var zones=_beastZoneNames();
  var selected=String(zone||'').trim();
  if(!selected && zones.length) selected=zones[0];
  var beasts=gb().slice().sort(function(a,b){ return String(a.nom||'').localeCompare(String(b.nom||''),'fr'); });
  var modal=ge("m-beast-zones");
  if(!modal){
    modal=document.createElement("div");
    modal.id="m-beast-zones";
    modal.className="moverlay";
    document.body.appendChild(modal);
  }
  var selectedCount=beasts.filter(function(b){ return (Array.isArray(b.zones)?b.zones:[]).indexOf(selected)>=0; }).length;
  var h='';
  h+='<div class="modal" style="max-width:980px;">';
  h+='<style>'
    +'#m-beast-zones .bz-row{display:flex;gap:8px;align-items:flex-start;padding:10px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025);cursor:pointer;transition:border-color .15s,background .15s,box-shadow .15s,transform .15s;}'
    +'#m-beast-zones .bz-row:hover{border-color:rgba(126,184,212,.26);background:rgba(126,184,212,.045);transform:translateY(-1px);}'
    +'#m-beast-zones .bz-row.is-selected{border-color:rgba(201,168,76,.46);background:linear-gradient(180deg,rgba(201,168,76,.12),rgba(201,168,76,.055));box-shadow:0 0 0 1px rgba(201,168,76,.18), inset 0 1px 0 rgba(255,255,255,.04);}'
    +'#m-beast-zones .bz-row .bz-beast{position:absolute;opacity:0;pointer-events:none;width:1px;height:1px;}'
    +'#m-beast-zones .bz-row-label{display:flex;min-width:0;flex:1;cursor:pointer;}'
  +'</style>';
  h+='<button class="mclose" onclick="closeModal(\'m-beast-zones\')">✕</button>';
  h+='<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:14px;">';
  h+='<div><div class="mtit" style="margin-bottom:4px;">Zones d’apparition</div><div style="font-size:12px;color:var(--faint);line-height:1.55;max-width:620px;">Crée une zone, puis coche les mobs qui appartiennent à ce groupe. Le roll d’apparitions tirera uniquement parmi ces mobs.</div></div>';
  h+='<div id="bz-count" style="padding:8px 11px;border:1px solid rgba(201,168,76,.28);background:rgba(201,168,76,.08);color:var(--gold);font-family:var(--fd);font-size:10px;letter-spacing:1.2px;white-space:nowrap;">'+selectedCount+' mob'+(selectedCount>1?'s':'')+' dans la zone</div>';
  h+='</div>';
  h+='<div style="display:grid;grid-template-columns:230px minmax(0,1fr);gap:14px;align-items:start;">';
  h+='<aside style="border:1px solid var(--border2);background:var(--bg3);padding:10px;max-height:520px;overflow:auto;">';
  h+='<div style="font-family:var(--fd);font-size:8px;letter-spacing:3px;color:var(--faint);margin-bottom:8px;">ZONES</div>';
  if(zones.length){
    zones.forEach(function(z){
      var count=beasts.filter(function(b){ return (Array.isArray(b.zones)?b.zones:[]).indexOf(z)>=0; }).length;
      h+='<button type="button" onclick="renderBeastZoneManager(\''+jsesc(z)+'\')" style="width:100%;display:flex;justify-content:space-between;gap:8px;align-items:center;text-align:left;margin-bottom:6px;padding:9px 10px;border:1px solid '+(z===selected?'rgba(201,168,76,.42)':'rgba(255,255,255,.07)')+';background:'+(z===selected?'rgba(201,168,76,.10)':'rgba(255,255,255,.025)')+';color:var(--text);cursor:pointer;">'
        +'<span style="font-family:var(--fd);font-size:10px;letter-spacing:1px;overflow:hidden;text-overflow:ellipsis;">'+esc(z)+'</span>'
        +'<span style="font-size:10px;color:var(--faint);">'+count+'</span>'
      +'</button>';
    });
  }else{
    h+='<div style="font-size:12px;color:var(--faint);line-height:1.55;">Aucune zone créée.</div>';
  }
  h+='</aside>';
  h+='<section>';
  h+='<div style="display:grid;grid-template-columns:minmax(220px,1fr) minmax(220px,1fr);gap:10px;align-items:end;">';
  h+='<div class="frow"><label class="flbl">Nom de la zone</label><input type="text" id="bz-name" value="'+escAttr(selected)+'" placeholder="Nouvelle zone ou nom existant"></div>';
  h+='<div class="frow"><label class="flbl">Rechercher un mob</label><input type="search" id="bz-search" placeholder="Nom, comportement, niveau..." oninput="beastZoneFilterList(this.value)"></div>';
  h+='</div>';
  h+='<input type="hidden" id="bz-select" value="'+escAttr(selected)+'">';
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 10px;">';
  h+='<button type="button" class="btn btn-sm" onclick="beastZoneSetVisible(true)"><span>Tout cocher visible</span></button>';
  h+='<button type="button" class="btn btn-sm" onclick="beastZoneSetVisible(false)"><span>Décocher visible</span></button>';
  if(selected) h+='<button type="button" class="btn btn-sm btn-red" onclick="deleteBeastZone(\''+jsesc(selected)+'\')"><span>Supprimer la zone</span></button>';
  h+='</div>';
  h+='<div style="max-height:390px;overflow:auto;border:1px solid var(--border2);background:var(--bg3);padding:8px;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px;">';
  beasts.forEach(function(b){
    var checked=(Array.isArray(b.zones)?b.zones:[]).indexOf(selected)>=0;
    var search=[b.nom,b.sub,b.niv,cBehaviorLabel(b.beh),Array.isArray(b.zones)?b.zones.join(' '):''].join(' ');
    h+='<div class="bz-row'+(checked?' is-selected':'')+'" data-search="'+escAttr(search)+'">';
    h+='<label class="bz-row-label">';
    h+='<input type="checkbox" class="bz-beast" value="'+escAttr(b.id)+'"'+(checked?' checked':'')+' onchange="beastZoneToggleRow(this)">';
    h+='<span style="min-width:0;"><span style="display:block;font-family:var(--fd);font-size:10px;letter-spacing:1px;color:var(--text);overflow:hidden;text-overflow:ellipsis;">'+esc(b.nom||'Créature')+'</span><span style="display:block;font-size:10px;color:var(--faint);margin-top:3px;">Niv. '+esc(b.niv||1)+' · '+esc(cBehaviorLabel(b.beh)||'Neutre')+'</span></span>';
    h+='</label>';
    h+='<div style="display:flex;gap:6px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;">';
    h+='<button type="button" class="btn btn-sm" style="padding:5px 8px;font-size:10px;" onclick="beastZoneOpenEditMob(\''+jsesc(b.id)+'\')"><span>Modifier</span></button>';
    if(checked) h+='<button type="button" class="btn btn-sm btn-red" style="padding:5px 8px;font-size:10px;" onclick="beastZoneRemoveMob(\''+jsesc(b.id)+'\',\''+jsesc(selected)+'\')"><span>Retirer</span></button>';
    h+='</div>';
    h+='</div>';
  });
  h+='</div>';
  h+='<p class="errmsg" id="bz-err"></p>';
  h+='<div class="factions" style="margin-top:12px;">';
  h+='<button class="btn btn-sm" onclick="closeModal(\'m-beast-zones\')"><span>Fermer</span></button>';
  h+='<button class="btn btn-sm btn-grn" onclick="saveBeastZoneAssignments()"><span>Enregistrer</span></button>';
  h+='</div>';
  h+='</section>';
  h+='</div>';
  h+='</div>';
  modal.innerHTML=h;
}
function saveBeastZoneAssignments(){
  if(!can("manage_beasts")){ notif("Permission insuffisante.","err"); return; }
  var name=String((ge("bz-name")&&ge("bz-name").value)||'').trim();
  var previous=String((ge("bz-select")&&ge("bz-select").value)||'').trim();
  if(!name){ if(ge("bz-err")) ge("bz-err").textContent="Nom de zone requis."; return; }
  var checked=Object.create(null);
  document.querySelectorAll("#m-beast-zones .bz-beast").forEach(function(node){ if(node.checked) checked[String(node.value||'')]=1; });
  var beasts=gb();
  beasts.forEach(function(b){
    var zones=Array.isArray(b.zones)?b.zones.slice():[];
    zones=zones.filter(function(z){ return z!==previous && z!==name; });
    if(checked[String(b.id||'')]) zones.push(name);
    b.zones=zones;
    b.updatedAt=Date.now();
  });
  sb(beasts);
  renderBeastZoneManager(name);
  renderBGrid("p-bgrd",!!(CU&&can("manage_beasts")));
  notif("Zone enregistrée.","ok");
}
function deleteBeastZone(zone){
  if(!can("manage_beasts")){ notif("Permission insuffisante.","err"); return; }
  zone=String(zone||'').trim();
  if(!zone) return;
  if(!confirm("Retirer la zone '"+zone+"' de tous les mobs ?")) return;
  var beasts=gb();
  beasts.forEach(function(b){
    b.zones=(Array.isArray(b.zones)?b.zones:[]).filter(function(z){ return z!==zone; });
    b.updatedAt=Date.now();
  });
  sb(beasts);
  renderBeastZoneManager(_beastZoneNames()[0]||'');
  renderBGrid("p-bgrd",!!(CU&&can("manage_beasts")));
  notif("Zone supprimée.","ok");
}

function _findBeastById(id){ return gb().find(function(x){ return String(x&&x.id||'')===String(id||''); }); }
function duplicateBeast(id){
  if(!can("manage_beasts")){ notif("Permission insuffisante.","err"); return; }
  var src=_findBeastById(id); if(!src) return;
  var copy=JSON.parse(JSON.stringify(src));
  copy.id='b'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  copy.nom=(copy.nom||'Créature')+' (copie)';
  copy.createdAt=Date.now();
  copy.updatedAt=Date.now();
  copy.archived=false;
  var beasts=gb(); beasts.unshift(copy); sb(beasts);
  notif(copy.nom+' créée.','ok');
  renderBGrid("p-bgrd", CU&&CU.type==="staff");
}
function setBeastArchived(id, archived){
  if(!can("manage_beasts")){ notif("Permission insuffisante.","err"); return; }
  var beasts=gb();
  var b=beasts.find(function(x){return String(x&&x.id||'')===String(id||'');});
  if(!b) return;
  b.archived=!!archived;
  b.updatedAt=Date.now();
  sb(beasts);
  notif((b.nom||'Créature')+(b.archived?' archivée.':' restaurée.'),'ok');
  renderBGrid("p-bgrd", CU&&CU.type==="staff");
}
function archiveBeast(id){
  var b=_findBeastById(id); if(!b) return;
  if(!confirm("Archiver cette créature ?")) return;
  setBeastArchived(id, true);
}
function restoreBeast(id){ setBeastArchived(id, false); }
function hardDeleteBeast(id){
  if(!can("delete_beast")){notif("Permission insuffisante.","err");return;}
  if(!confirm("Supprimer définitivement cette créature ? Cette action est irréversible.")) return;
  sb(gb().filter(function(x){ return String(x&&x.id||'')!==String(id||''); }));
  renderBGrid("p-bgrd",!!(CU&&can("manage_beasts")));
  notif("Créature supprimée définitivement.","inf");
}
function exportBeastJson(id){
  var b=_findBeastById(id); if(!b) return;
  try{
    var blob=new Blob([JSON.stringify(b,null,2)], {type:'application/json'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url; a.download=(String(b.nom||'creature').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'creature')+'.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ try{ URL.revokeObjectURL(url); }catch(e){} }, 800);
  }catch(e){ notif('Export impossible.','err'); }
}
function importBeastJson(){
  if(!can("manage_beasts")){ notif("Permission insuffisante.","err"); return; }
  var input=document.createElement('input');
  input.type='file'; input.accept='.json,application/json';
  input.onchange=function(){
    var file=input.files && input.files[0]; if(!file) return;
    var rd=new FileReader();
    rd.onload=function(){
      try{
        var parsed=JSON.parse(String(rd.result||''));
        var arr=Array.isArray(parsed)?parsed:[parsed];
        var beasts=gb();
        arr.forEach(function(entry, idx){
          var norm=_normalizeBeastRecord(entry, idx);
          if(beasts.some(function(b){ return String(b&&b.id||'')===String(norm.id||''); })) norm.id='b'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)+idx;
          norm.createdAt=Date.now();
          norm.updatedAt=Date.now();
          beasts.unshift(norm);
        });
        sb(beasts);
        renderBGrid('p-bgrd', CU&&CU.type==='staff');
        notif(arr.length+' créature(s) importée(s).','ok');
      }catch(e){ notif('JSON invalide.','err'); }
    };
    rd.readAsText(file);
  };
  input.click();
}
function _ensureBeastPreviewModal(){
  var root=ge('m-beast-preview-admin');
  if(root) return root;
  root=document.createElement('div');
  root.id='m-beast-preview-admin';
  root.className='moverlay';
  root.innerHTML='<div class="modal" style="max-width:920px;"><button class="mclose" onclick="closeModal(\'m-beast-preview-admin\')">✕</button><div class="mtit">Aperçu admin — Créature</div><div id="m-beast-preview-admin-body"></div></div>';
  document.body.appendChild(root);
  return root;
}
function previewBeastAdmin(id){
  if(!can("manage_beasts")){ notif("Permission insuffisante.","err"); return; }
  var b=_findBeastById(id); if(!b) return;
  _ensureBeastPreviewModal();
  var body=ge('m-beast-preview-admin-body');
  var usage=_beastUsageFor(b);
  var issues=_beastCompletenessIssues(b);
  var combats=(usage.combats||[]).map(function(c){
    return '<div style="padding:10px 12px;border:1px solid var(--border2);background:var(--bg3);display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">'
      +'<div><div style="font-family:var(--fd);font-size:11px;letter-spacing:1.5px;color:var(--text);">'+esc(c.title||'Combat')+'</div><div style="font-size:11px;color:var(--faint);margin-top:4px;">'+esc((c.players||[]).join(' · ')||'Sans joueurs listés')+'</div></div>'
      +'<div style="font-size:11px;color:var(--faint);text-align:right;">'+esc(_beastAgo(c.savedAt))+'<br>'+esc(c.owner||'')+'</div>'
    +'</div>';
  }).join('');
  body.innerHTML=''
    +'<div style="display:grid;grid-template-columns:minmax(220px,280px) 1fr;gap:18px;align-items:start;">'
      +'<div style="display:flex;flex-direction:column;gap:12px;">'
        +(b.img?'<img src="'+esc(b.img)+'" style="width:100%;aspect-ratio:1/1;object-fit:cover;border:1px solid var(--border2);background:var(--bg3);">':'<div style="width:100%;aspect-ratio:1/1;border:1px solid var(--border2);background:var(--bg3);display:flex;align-items:center;justify-content:center;font-family:var(--fd);font-size:42px;color:var(--faint);">'+esc((b.nom||'C').charAt(0).toUpperCase())+'</div>')
        +'<div style="display:flex;gap:8px;flex-wrap:wrap;">'
          +'<button class="btn btn-sm" onclick="openEditBeast(\''+jsesc(b.id)+'\')"><span>Éditer</span></button>'
          +'<button class="btn btn-sm" onclick="duplicateBeast(\''+jsesc(b.id)+'\')"><span>Dupliquer</span></button>'
          +'<button class="btn btn-sm" onclick="beastSendToCombat(\''+jsesc(b.id)+'\',1)"><span>+ Simu</span></button>'
          +'<button class="btn btn-sm" onclick="beastSendToCombat(\''+jsesc(b.id)+'\',3)"><span>+3 Simu</span></button>'
          +'<button class="btn btn-sm" onclick="exportBeastJson(\''+jsesc(b.id)+'\')"><span>Exporter JSON</span></button>'
          +(b.archived?'<button class="btn btn-sm btn-grn" onclick="restoreBeast(\''+jsesc(b.id)+'\')"><span>Restaurer</span></button>':'<button class="btn btn-sm" onclick="archiveBeast(\''+jsesc(b.id)+'\')"><span>Archiver</span></button>')
          +'<button class="btn btn-sm btn-red" onclick="hardDeleteBeast(\''+jsesc(b.id)+'\')"><span>Supprimer</span></button>'
        +'</div>'
      +'</div>'
      +'<div style="display:flex;flex-direction:column;gap:12px;">'
        +'<div><div style="font-family:var(--fd);font-size:18px;letter-spacing:2px;color:var(--text);">'+esc(b.nom||'Créature')+'</div><div style="font-size:12px;color:var(--faint);margin-top:4px;">'+esc(b.sub||'')+'</div></div>'
        +'<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">'+cBehaviorTag(b.beh,{fontSize:9,padding:'4px 10px',letterSpacing:'1.5px',radius:'999px'})+'<span style="font-size:12px;color:var(--faint);">'+esc(_beastThreatBand(b))+'</span><span style="font-size:12px;color:var(--faint);">Niv. '+esc(b.niv||1)+'</span>'+(b.hidden?'<span style="font-size:11px;color:var(--gold);">Masquée</span>':'')+(b.archived?'<span style="font-size:11px;color:#ff9a9a;">Archivée</span>':'')+'</div>'
        +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;">'
          +'<div class="card" style="padding:10px 12px;"><div style="font-size:11px;color:var(--faint);">Utilisations</div><div style="font-family:var(--fd);font-size:18px;letter-spacing:1px;">'+esc(usage.count||0)+'</div></div>'
          +'<div class="card" style="padding:10px 12px;"><div style="font-size:11px;color:var(--faint);">Dernière apparition</div><div style="font-family:var(--fd);font-size:14px;letter-spacing:1px;">'+esc(_beastAgo(usage.lastUsedAt))+'</div></div>'
          +'<div class="card" style="padding:10px 12px;"><div style="font-size:11px;color:var(--faint);">Complétude</div><div style="font-family:var(--fd);font-size:14px;letter-spacing:1px;">'+(issues.length?('À compléter · '+issues.length):'Complète')+'</div></div>'
        +'</div>'
        +'<div class="card" style="padding:14px;"><div class="card-title" style="margin-bottom:8px;">Note admin</div><div style="font-size:12px;color:var(--text);white-space:pre-wrap;">'+esc((b.adminNote||'').trim()||'Aucune note admin pour le moment.')+'</div></div>'
        +'<div class="card" style="padding:14px;"><div class="card-title" style="margin-bottom:8px;">Historique d\'usage</div>'+(combats||'<div style="font-size:12px;color:var(--faint);">Aucun combat archivé pour cette créature.</div>')+'</div>'
      +'</div>'
    +'</div>';
  openModal('m-beast-preview-admin');
}
function beastSendToCombat(id, qty){
  if(!(CU&&CU.type==='staff')){ notif('Réservé au staff.','err'); return; }
  qty=Math.max(1, parseInt(qty,10)||1);
  try{ if(typeof switchTab==='function') switchTab('combat-mj',null); }catch(e){}
  setTimeout(function(){
    try{
      if(typeof _cs==='undefined' || !_cs || !_cs.fighters) _cs=(typeof combatBlankState==='function'?combatBlankState():{fighters:[],log:[],round:1,phase:'idle'});
      for(var i=0;i<qty;i++) combatAddBeast(id, true);
      if(typeof rCombat==='function') rCombat('p-combat-mj-c');
      notif('Créature envoyée au simulateur.','ok');
    }catch(e){ notif('Impossible d\'injecter la créature dans le simulateur.','err'); }
  }, 80);
}

function toggleBeastHidden(id){
  if(!can("manage_beasts")){ notif("Permission insuffisante.","err"); return; }
  var beasts=gb();
  var b=beasts.find(function(x){return x.id===id;});
  if(!b) return;
  b.hidden=!b.hidden;
  sb(beasts);
  notif(b.nom+(b.hidden?" masqué aux joueurs.":" publié."),"ok");
  renderBGrid("p-bgrd", CU&&CU.type==="staff");
}



function _cleanBeastText(v){
  return String(v||'').replace(/\s+/g,' ').trim();
}
function _splitBeastSentences(raw){
  var txt=_cleanBeastText(raw);
  if(!txt) return [];
  return txt.split(/(?<=[\.!?])\s+/).map(function(x){ return x.trim(); }).filter(Boolean);
}
function _pickLeadSentence(raw, fallback){
  var parts=_splitBeastSentences(raw);
  return parts.length ? parts[0] : (fallback||'');
}
function _pickRemainingSentences(raw){
  var parts=_splitBeastSentences(raw);
  return parts.slice(1).join(' ');
}
function _beastBehaviorBlurb(raw){
  switch(window.cBehaviorLabel ? window.cBehaviorLabel(raw) : String(raw||'')){
    case 'Gibier': return "Fuit dès qu'il perçoit une menace. N'engage pas le combat et cherche à rompre le contact au plus vite.";
    case 'Passif': return "Ignore en général les aventuriers tant qu'on ne l'approche pas trop, qu'on ne le provoque pas ou qu'on ne menace pas les siens.";
    case 'Neutre': return "Évalue d'abord la situation. Peut attaquer s'il se sent menacé, s'il défend son territoire ou si la faim l'y pousse.";
    case 'Agressif': return "Attaque facilement. Une simple présence dans son espace peut suffire à déclencher une charge ou une poursuite.";
    case 'Très agressif': return "Attaque à vue, sans recul ni hésitation. Il ne cherche pas l'avertissement, seulement l'ouverture.";
    case 'Boss': return "Présence dominante. Dicte le rythme du combat et force le groupe à jouer autour de lui.";
    default: return '';
  }
}
function _beastThreatBand(b){
  var niv=Number(b&&b.niv||0), pv=Number(b&&b.pv||0), ep=Number(b&&b.ep||0);
  var score=niv*2 + pv/8 + ep/10;
  if(score>=28) return 'Menace majeure';
  if(score>=18) return 'Menace élevée';
  if(score>=10) return 'Menace sérieuse';
  return 'Menace modérée';
}
function _beastExtendedDesc(b){
  if(!b) return '';
  var lead=_pickLeadSentence(b.desc, 'Créature répertoriée dans le bestiaire de Nuages Polaires.');
  var tail=_pickRemainingSentences(b.desc);
  var role=_cleanBeastText(b.sub);
  var behavior=_beastBehaviorBlurb(b.beh||b.behavior||b.comportement);
  var strike=_cleanBeastText(b.frappe);
  var comp=_cleanBeastText(b.comp);
  var style=_cleanBeastText(b.style);
  var drops=_cleanBeastText(b.drops);
  var gem=_cleanBeastText(b.gem);
  var lines=[];
  if(lead) lines.push(lead);
  var synth=[];
  if(role) synth.push(role);
  var menace=_beastThreatBand(b);
  if(menace) synth.push(menace.toLowerCase());
  if(synth.length) lines.push(synth.join(' • ').replace(/^./, function(m){ return m.toUpperCase(); }) + '.');
  if(behavior) lines.push(behavior);
  if(style) lines.push('Style de combat : '+style);
  if(strike) lines.push('Frappe principale : '+strike);
  if(comp) lines.push('Capacité signature : '+comp);
  if(tail) lines.push(tail);
  if(drops || gem){
    var loot='Récompenses potentielles';
    if(drops) loot+=' : '+drops;
    if(gem) loot+=(drops?' • ':' : ')+'Gemme '+gem;
    lines.push(loot+'.');
  }
  return lines.join(' ');
}

function bCard(b,staff){
  var lbl=cBehaviorLabel(b.beh)||String(b.beh||'').replace(/^./,function(m){return m.toUpperCase();});
  var canEdit=staff&&can("manage_beasts");
  var canDel=staff&&can("delete_beast");
  var canToggle=CU&&(isAdminRole(CU)||roleKey(CU)==="designer");
  var isHidden=!!b.hidden;
  var isArchived=!!b.archived;
  var usage=_beastUsageFor(b);
  var issues=_beastCompletenessIssues(b);
  var notePreview=(b.adminNote||'').trim();
  if(notePreview.length>140) notePreview=notePreview.slice(0,137)+'…';
  var _nom=(b&&b.nom?String(b.nom):'Créature');
  var _sub=(b&&b.sub?String(b.sub):'Créature');
  var placeholder='<div class="bimg-ph" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;">'
    +'<div style="font-family:var(--fd);font-size:28px;color:var(--faint);letter-spacing:2px;">'+_nom.charAt(0).toUpperCase()+'</div>'
    +'<div style="font-family:var(--fd);font-size:7px;letter-spacing:3px;color:var(--faint);opacity:.6;">'+_sub.split(' — ')[0].toUpperCase()+'</div>'
    +'</div>';
  var imgH;
  if(canEdit){
    imgH='<div class="bimg-wrap" onclick="openBeastImgCrop(\''+b.id+'\')" title="Importer / recadrer une image">'
      +(b.img?'<img src="'+esc(b.img)+'" class="bimg" onerror="this.style.display=\'none\'">':placeholder)
      +'<div class="bimg-edit-ov">✎</div></div>';
  } else {
    imgH=b.img?'<img src="'+esc(b.img)+'" class="bimg" onerror="this.style.display=\'none\';this.nextSibling&&(this.nextSibling.style.display=\'flex\');">'+placeholder:placeholder;
  }
  var badges='';
  if(isHidden&&canToggle) badges+='<span style="font-family:var(--fd);font-size:8px;letter-spacing:1.5px;padding:3px 8px;border:1px solid rgba(201,160,76,.45);color:var(--gold);background:rgba(201,160,76,.10);">Masquée</span>';
  if(isArchived&&canToggle) badges+='<span style="font-family:var(--fd);font-size:8px;letter-spacing:1.5px;padding:3px 8px;border:1px solid rgba(201,74,74,.45);color:#ff9a9a;background:rgba(201,74,74,.10);">Archivée</span>';
  badges+='<span style="font-family:var(--fd);font-size:8px;letter-spacing:1.5px;padding:3px 8px;border:1px solid rgba(126,184,212,.25);color:var(--glacier);background:rgba(126,184,212,.08);">'+esc(_beastThreatBand(b))+'</span>';
  badges+=issues.length?'<span style="font-family:var(--fd);font-size:8px;letter-spacing:1.5px;padding:3px 8px;border:1px solid rgba(201,160,76,.35);color:var(--gold);background:rgba(201,160,76,.08);">À compléter · '+issues.length+'</span>':'<span style="font-family:var(--fd);font-size:8px;letter-spacing:1.5px;padding:3px 8px;border:1px solid rgba(109,184,138,.35);color:var(--green);background:rgba(109,184,138,.08);">Complète</span>';
  var adminInsights='';
  if(canEdit){
    adminInsights='<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0 10px;">'
      +'<div style="padding:10px 12px;border:1px solid var(--border2);background:var(--bg4);"><div style="font-size:10px;color:var(--faint);margin-bottom:4px;">Usage</div><div style="font-family:var(--fd);font-size:14px;letter-spacing:1px;color:var(--text);">'+esc(usage.count||0)+'×</div></div>'
      +'<div style="padding:10px 12px;border:1px solid var(--border2);background:var(--bg4);"><div style="font-size:10px;color:var(--faint);margin-bottom:4px;">Dernière fois</div><div style="font-family:var(--fd);font-size:14px;letter-spacing:1px;color:var(--text);">'+esc(_beastAgo(usage.lastUsedAt))+'</div></div>'
      +'<div style="padding:10px 12px;border:1px solid var(--border2);background:var(--bg4);"><div style="font-size:10px;color:var(--faint);margin-bottom:4px;">Maj</div><div style="font-family:var(--fd);font-size:14px;letter-spacing:1px;color:var(--text);">'+esc(_beastAgo(b.updatedAt||b.createdAt))+'</div></div>'
      +'</div>';
  }
  var adminActions='';
  if(canEdit){
    adminActions='<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;">'
      +'<button class="btn btn-sm" onclick="previewBeastAdmin(\''+jsesc(b.id)+'\')"><span>Aperçu</span></button>'
      +'<button class="btn btn-sm" onclick="duplicateBeast(\''+jsesc(b.id)+'\')"><span>Dupliquer</span></button>'
      +'<button class="btn btn-sm" onclick="beastSendToCombat(\''+jsesc(b.id)+'\',1)"><span>+ Simu</span></button>'
      +'<button class="btn btn-sm" onclick="beastSendToCombat(\''+jsesc(b.id)+'\',3)"><span>+3 Simu</span></button>'
      +'<button class="btn btn-sm" onclick="exportBeastJson(\''+jsesc(b.id)+'\')"><span>Exporter JSON</span></button>'
      +'</div>'
      +'<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;align-items:center;justify-content:space-between;">'
        +'<div style="display:flex;flex-wrap:wrap;gap:8px;">'
          +'<button class="btn btn-sm" onclick="openEditBeast(\''+jsesc(b.id)+'\')"><span>Éditer</span></button>'
          +(isArchived?'<button class="btn btn-sm btn-grn" onclick="restoreBeast(\''+jsesc(b.id)+'\')"><span>Restaurer</span></button>':'<button class="btn btn-sm" onclick="archiveBeast(\''+jsesc(b.id)+'\')"><span>Archiver</span></button>')
          +(canDel?'<button class="btn btn-sm btn-red" onclick="hardDeleteBeast(\''+jsesc(b.id)+'\')"><span>Suppression définitive</span></button>':'')
        +'</div>'
        +'<label class="toggle-sw" onclick="event.stopPropagation();">'
          +'<input type="checkbox" '+(isHidden?'':'checked')+' onchange="toggleBeastHidden(\''+jsesc(b.id)+'\')">'
          +'<div class="toggle-track"></div><div class="toggle-knob"></div>'
        +'</label>'
      +'</div>';
  }
  return '<div class="bcrd" style="opacity:'+(isArchived&&canToggle?'.72':'1')+';">'+imgH
    +'<div class="bbody"><div class="bnm">'+esc(b.nom)+'</div><div class="bsub">'+esc(b.sub)+'</div>'
    +'<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;">'
      +(lbl?cBehaviorTag(b.beh,{fontSize:8,padding:'2px 8px',letterSpacing:'1.5px',radius:'2px'}):'')
      +'<span style="color:var(--faint);font-size:10px;">Niv. '+b.niv+'</span>'
      +badges
    +'</div>'
    +'<div class="bdesc">'+esc(_beastExtendedDesc(b)||b.desc||'')+'</div>'
    +adminInsights
    +'<table class="btbl"><tbody>'
      +'<tr><td>PV</td><td style="color:var(--green);font-family:var(--fm)">'+b.pv+'</td><td>EP</td><td style="color:var(--gold);font-family:var(--fm)">'+b.ep+'</td></tr>'
      +'<tr><td colspan="2">Frappe</td><td colspan="2" style="font-family:var(--fm);font-size:13px">'+(function(){
        var raw=b.frappe||""; var num=parseInt(raw.match(/\d+/)||0);
        var type=raw.replace(/\d+\s*\+\s*Niv\.\s*/,"").replace(/\d+\s*/,"");
        var total=num+b.niv;
        return num?'<span style="color:var(--faint);font-size:11px;">'+num+' + Niv.'+b.niv+' = </span><strong style="color:var(--glacier);font-size:14px;">'+total+'</strong><span style="font-size:10px;color:var(--faint);margin-left:4px;">'+type+'</span>':raw;
      })()+'</td></tr>'
    +'</tbody></table>'
    +'<div class="bcomp"><span class="bclbl">COMPÉTENCE</span>'+esc(b.comp)+'</div>'
    +(b.style?'<div class="bcomp" style="border-color:rgba(126,184,212,.15);"><span class="bclbl" style="color:var(--glacier);">STYLE DE COMBAT</span>'+esc(b.style)+'</div>':'')
    +'<div class="bdrop"><span>BUTIN</span>'+esc(b.drops)+'</div>'
    +'<div class="bdrop"><span>DROP GEMME (D100)</span>'+esc(b.gem)+'</div>'
    +(notePreview&&canEdit?'<div style="margin-top:10px;padding:10px 12px;border:1px solid rgba(126,184,212,.12);background:rgba(126,184,212,.05);font-size:11px;color:var(--text);"><div style="font-family:var(--fd);font-size:8px;letter-spacing:1.5px;color:var(--faint);margin-bottom:6px;">NOTE ADMIN</div>'+esc(notePreview)+'</div>':'')
    +(b.citation?'<div style="margin-top:10px;padding:8px 12px;border-left:1px solid rgba(126,184,212,.2);font-size:11px;font-style:italic;color:var(--faint);">'+esc(b.citation)+'</div>':'')
    +adminActions
    +'</div></div>';
}


// ==========================================
// ACCUEIL
// ==========================================
// ACCUEIL — DASHBOARD
// ==========================================
function renderAccueil(tid){
  var el=ge(tid); if(!el) return;
  var isStaff=CU&&CU.type==="staff";
  var isAdmin=can("manage_mjs");
  var players=[];
  var accounts=[];
  var events=[];
  var beasts=[];
  try{ players=Array.isArray(gp())?gp():[]; }catch(e){ players=[]; }
  try{ accounts=Array.isArray(getAccounts())?getAccounts():[]; }catch(e){ accounts=[]; }
  try{ events=(typeof getEvents==='function'&&Array.isArray(getEvents()))?getEvents():[]; }catch(e){ events=[]; }
  try{ beasts=(typeof gb==='function'&&Array.isArray(gb()))?gb():[]; }catch(e){ beasts=[]; }

  function fmtMiniDate(ts){
    ts=Number(ts)||0;
    if(!ts) return '—';
    try{ return new Date(ts).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}); }
    catch(e){ return '—'; }
  }
  function arcFighters(arc){
    return Array.isArray(arc&&arc.fighters) ? arc.fighters : [];
  }
  function combatResultMeta(arc){
    var fighters=arcFighters(arc);
    var joueurs=fighters.filter(function(f){ return f&&f.type==='player'; });
    var monstres=fighters.filter(function(f){ return f&&f.type==='beast'; });
    var allMKO=!!monstres.length && monstres.every(function(f){ return (Number(f.pvCur)||0)<=0; });
    var allJKO=!!joueurs.length && joueurs.every(function(f){ return (Number(f.pvCur)||0)<=0; });
    if(arc&&arc._draft) return {txt:'Brouillon',col:'var(--purple)'};
    if(allMKO) return {txt:'Victoire',col:'var(--green)'};
    if(allJKO) return {txt:'Défaite',col:'var(--red)'};
    return {txt:'Inachevé',col:'var(--faint)'};
  }

  var semaine=Date.now()-7*24*60*60*1000;
  var joueurTotal=players.length;
  var actifsS=accounts.filter(function(a){return a.lastSeen&&a.lastSeen>semaine;}).length;
  var allArcs=[];
  try{ allArcs=isAdmin?getAllCombatArchives():(getCombatArchives?getCombatArchives():[]); }catch(e){ allArcs=[]; }
  if(!Array.isArray(allArcs)) allArcs=[];
  var cleanArcs=allArcs.filter(function(arc){ return arc && typeof arc==='object' && !arc._draft; });
  var myPid=CU?CU.pid:null;
  var myArcs=myPid?allArcs.filter(function(arc){
    return arcFighters(arc).some(function(f){return f&&f.type==="player"&&f.pid===myPid;});
  }):allArcs;
  if(!myPid) myArcs=allArcs;
  if(!Array.isArray(myArcs)) myArcs=[];
  var combatCount=myArcs.length;

  var gemTotal=0;
  if(myPid){
    var myPlayer=gpid(myPid);
    if(myPlayer){
      gemTotal=(myPlayer.history||[]).filter(function(h){return h.type==="gemme";}).length;
      if(!gemTotal) gemTotal=(myPlayer.inventory||[]).filter(function(i){return i.category==="Gemme";}).reduce(function(s,i){return s+(i.qty||1);},0);
    }
  } else {
    players.forEach(function(p){ gemTotal+=(p.history||[]).filter(function(h){return h.type==="gemme";}).length; });
  }

  var eventsAVenir=events.filter(function(e){return e.published&&e.dateTs&&e.dateTs>Date.now();}).sort(function(a,b){return a.dateTs-b.dateTs;});
  var prochainEvent=eventsAVenir[0]||null;
  var derniersCombats=myArcs.slice(0,3);
  var myStatuts=[];
  if(CU&&CU.pid){ var myP=gpid(CU.pid); myStatuts=myP?(myP.statuts||[]): []; }

  var h2=new Date().getHours();
  var greet=h2<6?"Bonne nuit":h2<12?"Bonjour":h2<18?"Bon après-midi":"Bonsoir";
  var displayName=CU?CU.name:"";

  var adminPendingCount=accounts.filter(function(a){return (a.role==="joueur"||!a.role)&&!a.pid;}).length;

  var h='<div style="max-width:1040px;padding:0 0 48px;">';

  h+='<div style="margin-bottom:32px;padding-bottom:24px;border-bottom:0.5px solid rgba(126,184,212,0.08);">';
  h+='<div style="font-family:var(--fd);font-size:8px;letter-spacing:5px;text-transform:uppercase;color:rgba(126,184,212,0.3);margin-bottom:8px;">Nuages Polaires</div>';
  h+='<div style="font-family:var(--fd);font-size:24px;letter-spacing:2px;color:var(--text);">'+greet+', <span style="color:var(--glacier);">'+esc(displayName)+'</span></div>';
  if(myStatuts.length){
    h+='<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;">';
    myStatuts.forEach(function(st){
      var def=STATUT_EFFECTS[st.id]||{label:st.id,col:"var(--dim)"};
      h+='<span style="font-family:var(--fd);font-size:8px;letter-spacing:1.5px;text-transform:uppercase;padding:3px 10px;border:0.5px solid '+def.col+';color:'+def.col+';border-radius:2px;opacity:.9;">'+esc(def.label)+'</span>';
    });
    h+='</div>';
  }
  h+='</div>';

  var stats=[
    {val:joueurTotal,lbl:"Élèves du Serment",col:"var(--glacier)"},
    {val:actifsS||"—",lbl:"Actifs cette semaine",col:"var(--green)"},
    {val:combatCount,lbl:"Combats archivés",col:"var(--gold)"},
    {val:gemTotal||"—",lbl:"Gemmes distribuées",col:"var(--purple)"},
  ];
  h+='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-bottom:24px;">';
  stats.forEach(function(s){
    h+='<div style="background:rgba(7,8,16,0.85);border:1px solid rgba(126,184,212,0.14);padding:16px 18px;border-radius:2px;position:relative;overflow:hidden;">';
    h+='<div style="font-family:var(--fd);font-size:32px;letter-spacing:1px;color:'+s.col+';line-height:1;margin-bottom:6px;">'+s.val+'</div>';
    h+='<div style="font-family:var(--fd);font-size:8px;letter-spacing:2.5px;text-transform:uppercase;color:var(--faint);">'+esc(s.lbl)+'</div>';
    h+='</div>';
  });
  h+='</div>';

  h+='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin-bottom:20px;">';

  h+='<div class="card">';
  h+='<div class="card-title">Prochain événement</div>';
  if(prochainEvent){
    var etype=EV_TYPES&&EV_TYPES[prochainEvent.type]?EV_TYPES[prochainEvent.type]:{icon:"☁",col:"var(--glacier)",label:"Événement"};
    var evDate=new Date(prochainEvent.dateTs);
    var evDateStr=evDate.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});
    var diff=Math.ceil((prochainEvent.dateTs-Date.now())/(1000*60*60*24));
    h+='<span style="font-family:var(--fd);font-size:8px;letter-spacing:2px;text-transform:uppercase;padding:3px 10px;border:0.5px solid '+etype.col+';color:'+etype.col+';border-radius:2px;display:inline-block;margin-bottom:10px;">'+etype.icon+' '+esc(etype.label)+'</span>';
    h+='<div style="font-family:var(--fd);font-size:14px;letter-spacing:1px;color:var(--text);margin-bottom:5px;line-height:1.3;">'+esc(prochainEvent.titre)+'</div>';
    h+='<div style="font-size:12px;color:var(--dim);margin-bottom:4px;">'+evDateStr+'</div>';
    h+='<div style="font-family:var(--fm);font-size:11px;color:var(--gold);margin-bottom:10px;">Dans '+diff+' jour'+(diff>1?'s':'')+'</div>';
    if(prochainEvent.desc) h+='<div style="font-size:12px;color:var(--faint);font-style:italic;line-height:1.6;margin-bottom:12px;">'+esc(prochainEvent.desc.substring(0,120))+(prochainEvent.desc.length>120?'…':'')+'</div>';
    h+='<button class="btn btn-sm" onclick="switchDropTab(\'evenements\',null,\'dd-joueurs\')"><span>Voir les événements →</span></button>';
  } else {
    h+='<div class="empty-state" style="padding:20px 0;"><div class="empty-state-icon">📅</div><div class="empty-state-title">Aucun événement</div><div class="empty-state-sub">Aucun événement à venir pour le moment.</div></div>';
  }
  h+='</div>';

  h+='<div class="card">';
  h+='<div class="card-title">Derniers combats</div>';
  if(derniersCombats.length){
    derniersCombats.forEach(function(arc){
      var result=combatResultMeta(arc);
      h+='<div style="display:flex;align-items:center;gap:10px;padding:9px 10px;background:rgba(7,8,16,0.6);border:0.5px solid rgba(126,184,212,0.07);border-radius:2px;margin-bottom:6px;transition:border-color .15s;" onmouseover="this.style.borderColor=\'rgba(126,184,212,0.18)\'" onmouseout="this.style.borderColor=\'rgba(126,184,212,0.07)\'">';
      h+='<div style="flex:1;min-width:0;">';
      h+='<div style="font-family:var(--fd);font-size:10px;letter-spacing:1px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+esc(arc.name)+'</div>';
      h+='<div style="font-size:10px;color:var(--faint);margin-top:2px;">'+fdt(arc.savedAt)+' · Round '+arc.round+'</div>';
      h+='</div>';
      h+='<span style="font-family:var(--fd);font-size:8px;letter-spacing:1.5px;text-transform:uppercase;color:'+result.col+';padding:2px 8px;border:0.5px solid '+result.col+';border-radius:2px;flex-shrink:0;">'+esc(result.txt)+'</span>';
      h+='</div>';
    });
    if(isStaff) h+='<button class="btn btn-sm" onclick="switchDropTab(\'combat-mj\',null,\'dd-staff\')" style="margin-top:6px;"><span>Simulation →</span></button>';
  } else {
    h+='<div class="empty-state" style="padding:20px 0;"><div class="empty-state-icon">⚔</div><div class="empty-state-title">Aucun combat</div><div class="empty-state-sub">Les combats archivés apparaîtront ici.</div></div>';
  }
  h+='</div>';
  h+='</div>';

  h+='<div class="card">';
  h+='<div class="card-title">Accès rapide</div>';
  h+='<div style="display:flex;flex-wrap:wrap;gap:8px;">';
  if(CU&&CU.pid) h+='<button class="btn btn-sm" onclick="switchTab(\'fiche\',null)" style="border-color:rgba(126,184,212,0.4);color:var(--glacier);"><span>✦ Ma fiche</span></button>';
  h+='<button class="btn btn-sm" onclick="switchDropTab(\'serments\',null,\'dd-joueurs\')"><span>Serments</span></button>';
  h+='<button class="btn btn-sm" onclick="switchDropTab(\'bestiaire\',null,\'dd-joueurs\')"><span>Bestiaire</span></button>';
  h+='<button class="btn btn-sm" onclick="switchDropTab(\'evenements\',null,\'dd-joueurs\')"><span>Événements</span></button>';
  h+='<button class="btn btn-sm" onclick="switchDropTab(\'combat\',null,\'dd-joueurs\')"><span>Système de jeu</span></button>';
  h+='<button class="btn btn-sm" onclick="switchDropTab(\'reglement\',null,\'dd-joueurs\')"><span>Règlement</span></button>';
  if(isStaff){
    h+='<button class="btn btn-sm" style="border-color:rgba(201,168,76,.4);color:var(--gold);" onclick="switchDropTab(\'combat-mj\',null,\'dd-staff\')"><span>Simulation</span></button>';
    h+='<button class="btn btn-sm" style="border-color:rgba(201,168,76,.4);color:var(--gold);" onclick="switchDropTab(\'apparitions\',null,\'dd-staff\')"><span>Apparitions</span></button>';
    h+='<button class="btn btn-sm" style="border-color:rgba(201,168,76,.4);color:var(--gold);" onclick="switchDropTab(\'joueurs\',null,\'dd-staff\')"><span>Joueurs</span></button>';
  }
  if(isAdmin){
    h+='<button class="btn btn-sm" style="border-color:rgba(201,168,76,.5);color:var(--gold);" onclick="switchDropTab(\'database\',null,\'dd-staff\')"><span>Database</span></button>';
    if(adminPendingCount>0) h+='<button class="btn btn-sm" style="border-color:rgba(201,74,74,.5);color:var(--red);" onclick="switchDropTab(\'joueurs\',null,\'dd-staff\')"><span>'+adminPendingCount+' en attente</span></button>';
  }
  h+='</div>';
  h+='</div>';

  h+='</div>';
  el.innerHTML=h;
  renderAppearanceSection();
}


function renderSynopsis(tid){
  var el=ge(tid); if(!el) return;
  var h='<div style="display:flex;justify-content:center;"><div class="rsec" style="max-width:760px;width:100%;">';

  // En-tête cinématique
  h+='<div style="text-align:center;padding:32px 0 24px;">';
  h+='<div style="font-family:var(--fd);font-size:12px;letter-spacing:5px;text-transform:uppercase;color:var(--glacier-dim);margin-bottom:16px;">NUAGES POLAIRES</div>';
  h+='<div style="width:60px;height:1px;background:linear-gradient(90deg,transparent,var(--glacier),transparent);margin:0 auto 20px;"></div>';
  h+='</div>';

  // Texte du synopsis
  h+='<div style="max-width:680px;margin:0 auto;padding:0 20px;">';

  h+='<p style="font-family:var(--fd);font-size:18px;letter-spacing:2px;color:var(--glacier);margin-bottom:24px;line-height:1.4;">L\'Argonaute a chuté.</p>';

  h+='<p style="margin-bottom:20px;line-height:1.9;font-size:15px;">Aucun chant, aucun éclat. Une défaite sèche, sans beauté, qui a arraché au plus grand héros sa certitude. Ceux qu\'il croyait être le sommet des ténèbres n\'étaient qu\'une avant-garde. La vraie puissance demeurait derrière, froide, innombrable, patiente.</p>';

  h+='<p style="margin-bottom:20px;line-height:1.9;font-size:15px;color:var(--dim);">Le Dimenséa, sa relique, a changé de mains.</p>';

  h+='<div style="border-left:2px solid var(--glacier-dim);padding:16px 20px;margin:28px 0;background:rgba(126,184,212,0.03);">';
  h+='<p style="line-height:1.9;font-size:15px;font-style:italic;color:var(--dim);">Alors un champ dimensionnel s\'est levé sur la planète entière, d\'immenses nuages blancs couvrirent le monde en une seconde. Ni incendie, ni tonnerre. Une pression derrière les yeux, dans la gorge. Un souffle coupé. Une seconde trop longue, comme si le cœur refusait de battre au même rythme que le monde. Puis la réalité s\'est pliée.</p>';
  h+='</div>';

  h+='<p style="margin-bottom:20px;line-height:1.9;font-size:15px;font-family:var(--fd);letter-spacing:1px;color:var(--glacier);">Le Dimenséa a projeté l\'humanité dans un futur lointain.</p>';

  h+='<p style="margin-bottom:20px;line-height:1.9;font-size:15px;">Beaucoup n\'ont pas survécu. Ceux qui restent portent une marque intérieure : un serment muet, une cicatrice qui ne se voit pas mais qui répond, parfois, au vide. Le Dimenséa a fait d\'eux des Élèves du Serment — de donner des capacités à ceux qui ne pouvaient le faire, de rendre possible, l\'impossible.</p>';

  h+='<div style="border:1px solid var(--border2);padding:24px;margin:28px 0;background:var(--bg3);">';
  h+='<p style="line-height:1.9;font-size:14px;color:var(--dim);">Puis vient le réveil. Les paupières se soulèvent. L\'air paraît trop propre, trop immobile. Autour, il n\'y a plus d\'armée, plus de frontières, plus de routes habitées, plus de fumées au-dessus des toits. Les villes, si elles existent encore, ne sont que silhouettes lointaines. Les pierres se dressent sans voix. Les bâtisses s\'ouvrent comme des crânes vides. Tout semble à la fois intact et mort, neuf et abandonné, comme si le monde avait continué sans l\'humanité, puis s\'était arrêté pour attendre.</p>';
  h+='</div>';

  h+='<p style="line-height:1.9;font-size:15px;margin-bottom:32px;">Et dans cette première seconde de lucidité, une vérité tombe, lourde, irrévocable.</p>';

  h+='<p style="font-family:var(--fd);font-size:20px;letter-spacing:3px;text-align:center;color:var(--text);padding:16px 0;">L\'humanité a disparu.</p>';

  h+='<div style="width:40px;height:1px;background:linear-gradient(90deg,transparent,var(--glacier),transparent);margin:32px auto 0;"></div>';

  h+='</div></div></div>';
  el.innerHTML=h;
}

function renderRegles(tid){
  var h='<div class="premium-doc premium-doc-rules">';

  // ── PRÉAMBULE ──
  h+='<div class="rsec">';
  h+='<div style="font-family:var(--fd);font-size:8px;letter-spacing:4px;color:var(--glacier);margin-bottom:8px;">NUAGES POLAIRES ☁️</div>';
  h+='<h2>Règlement Officiel du Serveur</h2>';
  h+='<div class="quote">« Nul ne choisit son Serment. C\'est le Serment qui reconnaît son porteur. »</div>';
  h+='<div class="hlbox" style="margin-bottom:20px;"><strong>Ce document constitue la référence absolue pour tout membre du serveur Nuages Polaires.</strong> Il est mis à jour par l\'équipe staff. Toute modification fait l\'objet d\'une annonce officielle. L\'ignorance des règles ne constitue pas une excuse recevable.</div>';
  h+='<p>Nuages Polaires est un serveur de roleplay textuel sur Discord, construit autour d\'un univers original post-apocalyptique. L\'humanité a été projetée dans un futur lointain par le Dimenséa, une relique aux pouvoirs dimensionnels. Ceux qui ont survécu portent en eux une marque — un Serment — qui leur confère des capacités de combat uniques et évolutives.</p>';
  h+='<p>Ce serveur est un espace de création collaborative. Il n\'existe que par l\'investissement de ses membres. Il repose sur deux piliers fondamentaux : le respect humain hors jeu, et la cohérence narrative en jeu.</p>';
  h+='<p><strong>En rejoignant Nuages Polaires, vous acceptez l\'intégralité de ce règlement sans réserve.</strong></p>';
  h+='</div>';

  // ── PARTIE I — HRP ──
  h+='<div class="rsec">';
  h+='<h2>Partie I — Règlement Hors-Roleplay (HRP)</h2>';
  h+='<p>Les règles HRP s\'appliquent à tous les salons du serveur. Elles encadrent vos interactions en tant que personnes réelles, indépendamment de vos personnages.</p>';

  h+='<h3>I.1 — Respect mutuel et bienveillance</h3>';
  h+='<p>Le respect est la condition première de tout le reste. Sans lui, aucune communauté créative ne peut exister.</p>';
  h+='<ul>';
  h+='<li>Tout comportement irrespectueux, moquerie, humiliation publique ou harcèlement envers un membre — public ou en message privé — est strictement interdit.</li>';
  h+='<li>Les insultes, attaques personnelles, discours haineux fondés sur l\'origine, le genre, la sexualité, la religion, le handicap ou tout autre critère discriminatoire sont prohibés et entraînent une sanction immédiate.</li>';
  h+='<li>Les désaccords se règlent calmement, en ouvrant un ticket si un membre du staff doit être impliqué. Aucun conflit ne se règle dans les salons publics.</li>';
  h+='<li>La pression sociale ou l\'intimidation pour forcer un membre à agir contre sa volonté est traitée comme du harcèlement.</li>';
  h+='</ul>';
  h+='<div class="hlbox"><strong>Bonne foi attendue :</strong> Nuages Polaires est une communauté fondée sur la confiance. Nous supposons la bonne foi par défaut. Un comportement récidiviste ou délibérément nuisible sera toutefois traité comme tel.</div>';

  h+='<h3>I.2 — Confidentialité et vie privée</h3>';
  h+='<ul>';
  h+='<li>Il est interdit de divulguer des informations personnelles d\'un autre membre (nom, photo, localisation, données sensibles) sans son consentement explicite.</li>';
  h+='<li>Les captures d\'écran de messages privés ne peuvent être partagées qu\'avec l\'accord de la personne concernée, sauf signalement légitime au staff.</li>';
  h+='<li>Ne partagez pas vos propres informations sensibles publiquement — le staff ne vous le demandera jamais.</li>';
  h+='</ul>';

  h+='<h3>I.3 — Langue et communication</h3>';
  h+='<ul>';
  h+='<li>Le français est la langue officielle du serveur, dans tous les salons sans exception.</li>';
  h+='<li>Un niveau de langage correct est attendu. Les abréviations excessives qui nuisent à la compréhension sont à éviter dans les échanges sérieux.</li>';
  h+='<li>L\'argot et le langage informel sont tolérés dans les salons de discussion libre, mais restent soumis aux règles de respect.</li>';
  h+='</ul>';

  h+='<h3>I.4 — Contenus interdits</h3>';
  h+='<p>Sont strictement interdits dans tous les salons du serveur :</p>';
  h+='<ul>';
  h+='<li>Tout contenu NSFW : images, textes, liens à caractère sexuel, violent ou gore.</li>';
  h+='<li>Tout contenu à caractère politique ou religieux militant, susceptible de diviser ou d\'offenser.</li>';
  h+='<li>La désinformation, les rumeurs non vérifiées présentées comme des faits, et la manipulation de l\'opinion publique interne.</li>';
  h+='<li>Les contenus illégaux de toute nature (piratage, logiciels malveillants, contenus protégés sans droits, etc.).</li>';
  h+='</ul>';
  h+='<div class="warnbox"><strong>Zéro tolérance :</strong> Tout contenu relevant de la pédopornographie, de l\'apologie de la violence réelle ou du terrorisme entraîne un bannissement immédiat et définitif, sans avertissement préalable.</div>';

  h+='<h3>I.5 — Publicité et autopromotion</h3>';
  h+='<ul>';
  h+='<li>Toute forme de publicité pour d\'autres serveurs, projets, streams ou contenus personnels est interdite sans accord préalable du staff.</li>';
  h+='<li>Les demandes de partenariat se font exclusivement via l\'ouverture d\'un ticket partenariat.</li>';
  h+='<li>Le spam (messages répétitifs, flooding, messages vides de sens) est interdit dans tous les salons.</li>';
  h+='</ul>';

  h+='<h3>I.6 — Intégrité du serveur</h3>';
  h+='<ul>';
  h+='<li>Tout comportement visant à nuire techniquement au serveur — exploitation de failles, bots non autorisés, spam automatisé — est sanctionné par un bannissement immédiat.</li>';
  h+='<li>Les tentatives de manipulation du staff (fausses accusations, usurpation d\'identité, pression coordonnée) sont traitées avec la plus grande sévérité.</li>';
  h+='<li>Tout membre ayant connaissance d\'une menace pour la sécurité du serveur est encouragé à ouvrir un ticket pour le signaler au staff.</li>';
  h+='</ul>';

  h+='<h3>I.7 — Relations avec le staff</h3>';
  h+='<ul>';
  h+='<li>Le staff est bénévole. Il agit dans l\'intérêt de la communauté. Les décisions du staff sont souveraines, mais peuvent faire l\'objet d\'un recours calme et argumenté via un ticket.</li>';
  h+='<li>Le staff ne peut pas être contacté pour contourner une règle, obtenir un passe-droit ou faire pression sur un autre membre.</li>';
  h+='<li>Contester une décision publiquement de façon agressive est traité comme un comportement perturbateur.</li>';
  h+='</ul>';
  h+='</div>';

  // ── PARTIE II — RP ──
  h+='<div class="rsec">';
  h+='<h2>Partie II — Règlement Roleplay (RP)</h2>';
  h+='<p>Les règles RP encadrent vos interactions en tant que joueurs et personnages dans l\'univers de Nuages Polaires. Elles garantissent la cohérence narrative, l\'équité entre joueurs, et la qualité de l\'expérience collective.</p>';

  h+='<h3>II.1 — Principes fondamentaux du Roleplay</h3>';

  h+='<h4>II.1.a — Distinction IRP / HRP</h4>';
  h+='<p>L\'une des règles les plus importantes du jeu de rôle textuel est la séparation nette entre ce qui relève du personnage (In Roleplay / IRP) et ce qui vous appartient en tant que joueur (Hors Roleplay / HRP).</p>';
  h+='<ul>';
  h+='<li>Ce que vit votre personnage ne vous appartient pas personnellement. Un conflit entre deux personnages n\'est pas un conflit entre deux joueurs.</li>';
  h+='<li>Inversement, vos opinions personnelles ne doivent pas influencer les décisions de votre personnage de façon non justifiée par la fiction.</li>';
  h+='<li>Toute communication HRP en salon RP doit être clairement balisée : <em>(( message hors rp ))</em> ou <em>//message</em>.</li>';
  h+='</ul>';

  h+='<h4>II.1.b — Metagaming</h4>';
  h+='<p>Le metagaming consiste à utiliser des informations auxquelles votre personnage n\'a pas accès pour influencer ses actions dans le jeu.</p>';
  h+='<ul>';
  h+='<li>Votre personnage ne sait que ce qu\'il a appris IRP. Les informations vues dans d\'autres salons, dites HRP ou connues par d\'autres joueurs ne sont pas accessibles à votre personnage.</li>';
  h+='<li>Le metagaming est une faute grave qui déstabilise la fiction collective. Il est sanctionné selon sa gravité et sa récurrence.</li>';
  h+='</ul>';
  h+='<div class="warnbox"><strong>Exemples de metagaming :</strong> Agir comme si votre personnage connaissait le plan secret d\'un autre personnage, parce que vous l\'avez lu dans un salon auquel votre personnage n\'était pas présent. Utiliser le niveau ou les capacités d\'un personnage ennemi que vous avez vus dans un tableau de stats, mais que votre personnage n\'aurait aucune raison de connaître.</div>';

  h+='<h4>II.1.c — Connaissances IRP</h4>';
  h+='<p>Au fil de l\'aventure, votre personnage va découvrir des choses — des lieux, des créatures, des règles du monde, des vérités sur l\'univers. C\'est à vous, en tant que joueur, de décider ce que votre personnage retient, comprend ou ignore.</p>';
  h+='<ul>';
  h+='<li>Votre personnage est libre d\'intégrer ou non ce qu\'il vit. Certains personnages sont curieux, d\'autres méfiants, d\'autres encore refusent de comprendre ce qui les dépasse.</li>';
  h+='<li>Ce que vous avez vu ou lu en tant que joueur ne confère pas automatiquement une connaissance à votre personnage. L\'expérience IRP prime toujours sur ce que vous savez HRP.</li>';
  h+='</ul>';
  h+='<div class="hlbox"><strong>Ce que le narrateur impose :</strong> Certaines choses seront délibérément maintenues hors de portée de votre personnage — des mystères que le monde garde pour lui. Dans ces cas-là, le MJ vous le fera comprendre clairement. Ce flou n\'est pas une erreur — c\'est de la narration.</div>';

  h+='<h4>II.1.d — Godmodding et Powerplay</h4>';
  h+='<p>Ces deux pratiques brisent l\'équilibre du RP collaboratif en retirant aux autres joueurs leur capacité d\'agir librement.</p>';
  h+='<ul>';
  h+='<li><strong>Godmodding :</strong> jouer son personnage comme invincible, infaillible, ou incapable d\'être affecté par les actions des autres.</li>';
  h+='<li><strong>Powerplay :</strong> contrôler les actions, réactions ou émotions du personnage d\'un autre joueur sans son accord.</li>';
  h+='</ul>';
  h+='<p>Ces deux comportements sont interdits. En combat structuré, le système de règles officiel prévient mécaniquement ces dérives.</p>';

  h+='<h4>II.1.e — La mort du personnage</h4>';
  h+='<p>Sur Nuages Polaires, la mort est une réalité du monde. Elle n\'est pas un événement cosmétique ou symbolique : elle est une conséquence possible et légitime du combat. En rejoignant ce serveur, chaque joueur accepte que son personnage puisse mourir.</p>';
  h+='<div class="warnbox"><strong>Principe fondamental — La mort s\'accepte :</strong> Si le système dicte la mort de votre personnage — PV tombés à 0 dans un contexte où la mort est déclarée, décision narrative du staff, conséquence d\'un combat à mort accepté — vous êtes tenu de l\'accepter sans contestation. Refuser une mort dictée par le système est une infraction grave au règlement.</div>';
  h+='<ul>';
  h+='<li>Un personnage dont les PV tombent à 0 est déclaré KO par défaut. La mort n\'est prononcée que si le contexte du combat le justifie.</li>';
  h+='<li>Le contexte d\'un combat — simple duel, affrontement à mort, événement scénarisé — doit être établi avant son commencement.</li>';
  h+='<li>Un joueur dont le personnage meurt peut créer un nouveau personnage selon les procédures en vigueur.</li>';
  h+='<li>Tenter d\'éviter les conséquences d\'une mort prononcée par une fuite HRP (quitter le salon, déconnecter, ignorer la résolution) est sanctionné comme un refus de règle.</li>';
  h+='</ul>';

  h+='<h3>II.2 — L\'arrivée dans le monde</h3>';
  h+='<p>Chaque nouveau personnage arrive dans le monde de Nuages Polaires de la même façon, sans exception. Cette expérience est universelle — elle fait partie du lore vécu par tous les Élèves du Serment.</p>';
  h+='<div class="hlbox"><strong>Avant l\'arrivée, il y a l\'étouffement.</strong> Une sensation fugace, presque imperceptible — pas une douleur franche, plutôt une pression dans la gorge, un souffle qui se coupe une fraction de seconde trop longtemps. Puis rien. Le personnage s\'endort là où il se trouvait avant, ou tombe dans les pommes sans comprendre pourquoi. Quand il se réveille, tout a changé.</div>';
  h+='<ul>';
  h+='<li>Tout personnage débute le RP en se réveillant dans un environnement qu\'il ne reconnaît pas. Il n\'a aucune connaissance de ce monde.</li>';
  h+='<li>Aucun personnage n\'arrive avec des informations préalables sur le monde, les autres Élèves ou les dangers environnants. Ce que votre personnage sait, il doit l\'apprendre IRP.</li>';
  h+='<li>L\'étouffement est un souvenir commun à tous les Élèves du Serment. C\'est souvent le premier lien qui unit des inconnus.</li>';
  h+='</ul>';

  h+='<h3>II.3 — Création et cohérence du personnage</h3>';

  h+='<h4>II.3.a — Fiche personnage</h4>';
  h+='<ul>';
  h+='<li>Tout joueur doit disposer d\'une fiche personnage validée par le staff avant de participer au RP.</li>';
  h+='<li>La fiche doit comporter : nom, âge, Serment, statistiques de niveau, et présentation narrative minimale.</li>';
  h+='<li>Toute modification majeure du personnage doit être soumise au staff.</li>';
  h+='</ul>';

  h+='<h4>II.3.b — Changement de Serment</h4>';
  h+='<ul>';
  h+='<li><strong>Voie IRP — Par l\'aventure :</strong> un changement de Serment peut survenir au cours du RP si le parcours narratif du personnage le justifie organiquement. Ce processus doit être cohérent avec la fiction, construit avec le staff, et validé par lui avant d\'être joué.</li>';
  h+='<li><strong>Voie HRP — Correction administrative :</strong> possible uniquement si le Serment est encore au niveau 1. Dès le niveau 2, seule la voie narrative reste ouverte.</li>';
  h+='</ul>';
  h+='<div class="hlbox">Niveau 1 sans progression → changement HRP possible sur demande au staff. Niveau 2 et au-delà → changement uniquement par la voie RP, avec validation narrative du staff.</div>';

  h+='<h4>II.3.c — Cohérence narrative</h4>';
  h+='<p>Un personnage doit agir en cohérence avec son histoire, ses capacités et son niveau. Les incohérences répétées et délibérées — pour gagner un avantage ou éviter des conséquences — sont traitées comme des infractions au règlement.</p>';

  h+='<h4>II.3.d — Les Serments</h4>';
  h+='<p>Chaque joueur est lié à un Serment unique, choisi lors de son intégration. Ce Serment définit son arme liée, ses capacités de combat et sa progression.</p>';
  h+='<ul>';
  h+='<li>Le Serment reconnaît son porteur — ce lien est narrativement immuable et ne peut être ignoré en RP.</li>';
  h+='<li>Nul ne peut s\'approprier le Serment d\'un autre, même temporairement. L\'arme d\'un Serment qui ne vous appartient pas ne répond pas.</li>';
  h+='<li>À la mort d\'un personnage, son arme de Serment disparaît instantanément et sans trace.</li>';
  h+='<li>Les capacités se débloquent progressivement à mesure que le Serment évolue. Utiliser une capacité non encore débloquée est considéré comme du cheating.</li>';
  h+='</ul>';

    // Mécanique II.4-II.8 → Système de jeu
  h+='<div class="hlbox" style="border-color:var(--glacier);margin-bottom:16px;">';
  h+='<strong>Statistiques, Interface, Combat, Progression &amp; Drops</strong><br>';
  h+='L\'ensemble des règles mécaniques — statistiques de base, interface du personnage, structure du combat, actions &amp; coûts, surcadençage, progression des Serments, gemmes et drops — est documenté intégralement dans l\'onglet <strong>Système de Jeu</strong>.</div>';
  h+='<div class="hlbox" style="margin-bottom:16px;"><strong>Pugilat :</strong> Tout personnage, quelle que soit sa classe ou son Serment, peut frapper à mains nues. Les dégâts d\'un coup de poing sont de <strong>3 + Niveau du porteur</strong>, coûtent 6 EP, et comptent comme une action standard.</div>';

  h+='<h3>II.4 — Thématiques sensibles et limites narratives</h3>';
  h+='<h4>II.4.a — Contenu adulte</h4>';
  h+='<ul>';
  h+='<li>Tout contenu érotique ou sexuellement explicite est interdit, y compris entre personnages adultes fictifs.</li>';
  h+='<li>La violence narrative est autorisée dans un cadre cohérent avec l\'univers (combat, tension dramatique). La torture gratuite ou la violence sadique hors contexte narratif est découragée et peut être refusée par le staff.</li>';
  h+='</ul>';
  h+='<h4>II.4.b — Sujets réels sensibles</h4>';
  h+='<ul>';
  h+='<li>Les allusions à des événements réels traumatisants utilisées de façon légère ou humoristique dans le RP sont interdites.</li>';
  h+='<li>Si une thématique difficile est abordée (deuil, trauma, maladie), elle doit l\'être avec sérieux et respect.</li>';
  h+='</ul>';
  h+='<h4>II.4.c — Bienséance entre joueurs</h4>';
  h+='<p>Si un joueur se sent mal à l\'aise avec la tournure d\'un RP, il peut ouvrir un ticket et le staff interviendra. Aucun joueur ne doit se sentir forcé de jouer quelque chose qui le met mal à l\'aise.</p>';
  h+='</div>';

  // ── PARTIE III — SANCTIONS ──
  h+='<div class="rsec">';
  h+='<h2>Partie III — Sanctions et Modération</h2>';
  h+='<p>Le staff applique les sanctions avec discernement et proportionnalité. L\'objectif est de préserver la communauté, pas de punir.</p>';
  h+='<table class="rtbl"><thead><tr><th>Sanction</th><th>Description</th><th>Infractions typiques</th></tr></thead><tbody>';
  h+='<tr><td><strong>Avertissement verbal</strong></td><td>Rappel de règle. Aucune sanction formelle.</td><td>Langage inapproprié isolé, maladresse, oubli de règle mineure.</td></tr>';
  h+='<tr><td><strong>Avertissement formel</strong></td><td>Note consignée. 3 avertissements → mute automatique.</td><td>Comportement irrespectueux, metagaming léger, spamming.</td></tr>';
  h+='<tr><td><strong>Mute temporaire</strong></td><td>Quelques heures à plusieurs jours selon gravité.</td><td>Conflit public, insultes légères, infractions RP répétées.</td></tr>';
  h+='<tr><td><strong>Kick</strong></td><td>Expulsion sans bannissement. Le membre peut revenir.</td><td>Comportement perturbateur persistant, non-respect d\'une décision staff.</td></tr>';
  h+='<tr><td><strong>Bannissement</strong></td><td>Exclusion définitive ou temporaire.</td><td>Harcèlement grave, triche délibérée, menace, contenu illégal.</td></tr>';
  h+='</tbody></table>';

  h+='<h3>Recours</h3>';
  h+='<p>Tout membre faisant l\'objet d\'une sanction peut formuler un recours via un ticket, de manière calme et argumentée, dans les 48 heures suivant la sanction. La décision finale du staff après recours est définitive. Contester publiquement une sanction entraîne automatiquement son aggravation.</p>';
  h+='</div>';

  // ── PARTIE IV — DISPOSITIONS FINALES ──
  h+='<div class="rsec">';
  h+='<h2>Partie IV — Dispositions Finales</h2>';

  h+='<h3>IV.1 — Évolution du règlement</h3>';
  h+='<ul>';
  h+='<li>Ce règlement est un document vivant. Le staff se réserve le droit de le modifier à tout moment.</li>';
  h+='<li>Toute modification majeure fait l\'objet d\'une annonce officielle. L\'absence de lecture d\'une mise à jour ne dispense pas de son application.</li>';
  h+='</ul>';

  h+='<h3>IV.2 — Évolution du système de combat</h3>';
  h+='<div class="hlbox">Nuages Polaires est un projet vivant. Le système de combat, aussi complet qu\'il puisse paraître aujourd\'hui, est susceptible d\'évoluer : rééquilibrages, ajouts de mécaniques, clarifications de règles. Les modifications font l\'objet d\'une annonce officielle. Aucune règle ne change en silence.</div>';

  h+='<h3>IV.3 — Transparence et avenir du serveur</h3>';
  h+='<p>Nuages Polaires fait le choix de la transparence. Les règles, les mécaniques de combat, les systèmes de progression, les documents officiels — tout est mis à disposition des joueurs. Le staff ne cache pas son fonctionnement : il le documente, l\'explique et le partage.</p>';
  h+='<div class="hlbox"><strong>La seule zone d\'ombre volontaire — les Serments à venir :</strong> Un seul pan du serveur restera délibérément flou. De nouveaux Serments sont prévus. Leurs capacités, leur identité, leur arme liée — rien de tout cela ne sera dévoilé à l\'avance. La découverte fait partie de l\'expérience.</div>';

  h+='<h3>IV.4 — Propriété intellectuelle et droits d\'usage</h3>';
  h+='<p>L\'ensemble des contenus produits dans le cadre de Nuages Polaires constitue une création originale. Cette protection s\'étend sans exception à : le lore et l\'univers, les mécaniques de jeu, les Serments, la communication du serveur, et les outils créés par le staff.</p>';
  h+='<div class="warnbox"><strong>Reproduction et modification interdites sans accord :</strong> Il est strictement interdit de copier, reproduire, adapter, modifier ou redistribuer tout ou partie de ces contenus sans l\'accord explicite et préalable du staff de Nuages Polaires. Pour toute demande d\'autorisation, ouvrez un ticket.</div>';

  h+='<h3>IV.5 — Zones grises et cas non prévus</h3>';
  h+='<p>Ce règlement ne peut pas couvrir l\'exhaustivité des situations pouvant se présenter. Dans tout cas non explicitement prévu, le staff évalue la situation selon l\'esprit du règlement. Une décision prise dans un cas non prévu fait jurisprudence pour les cas similaires futurs.</p>';

  h+='<h3>IV.6 — Acceptation du règlement</h3>';
  h+='<div class="warnbox" style="text-align:center;"><strong>En rejoignant le serveur Nuages Polaires ou en maintenant votre présence après publication de ce règlement, vous confirmez avoir lu, compris et accepté l\'intégralité des règles qui y figurent, sans réserve ni exception.</strong></div>';
  h+='</div>';

  // ── GLOSSAIRE ──
  h+='<div class="rsec">';
  h+='<h2>Glossaire — Termes du monde</h2>';
  h+='<div class="quote">« Comprendre le monde, c\'est déjà survivre un peu mieux. »</div>';
  var terms=[
    {t:"Dimenséa",d:"Relique aux pouvoirs dimensionnels, autrefois entre les mains de l\'Argonaute. Son changement de mains a déclenché le champ dimensionnel qui a projeté l\'humanité dans le futur. Elle est l\'origine de tout."},
    {t:"Élève du Serment",d:"Terme désignant les survivants qui portent un Serment. Ils forment une minorité parmi les rescapés de la projection dimensionnelle. Le Dimenséa a fait d\'eux ce qu\'ils sont."},
    {t:"Serment",d:"Lien sacré entre un porteur et son arme liée. Il ne se choisit pas — il reconnaît son porteur. Il se déploie à travers quatre paliers (niveaux 2, 5, 7 et 10) à mesure que le porteur s\'en montre digne."},
    {t:"Arme du Serment",d:"Manifestation physique du lien entre le porteur et son Serment. Elle peut être invoquée ou renvoyée à volonté (1 EM). Elle ne peut pas être maniée par quelqu\'un d\'autre. À la mort du porteur, elle disparaît instantanément."},
    {t:"Palier",d:"Seuil de progression d\'un Serment. Il en existe quatre : Palier I (Niv. 2), Palier II (Niv. 5), Palier III (Niv. 7), Palier IV (Niv. 10). Chaque palier débloque ou transforme une capacité."},
    {t:"Gemme de Sang",d:"Fragment cristallin extrait des créatures vaincues. Il en existe trois grades : Blanche (+5 XP), Incarnate (+20 XP) et Écarlate (+50 XP). Fusionnée à l\'arme du Serment, elle fait progresser son porteur."},
    {t:"PV",d:"Points de Vie. Mesure la résistance vitale d\'un personnage. À 0, le personnage est KO (voire mort selon le contexte). Base Niv. 1 : 30 PV."},
    {t:"EP",d:"Énergie Physique. Carburant de toutes les actions physiques (frappes, esquives, déplacements, etc.). À 0, le personnage s\'effondre et est hors combat. Base Niv. 1 : 50 EP."},
    {t:"EM",d:"Énergie Magique. Carburant des capacités de Serment. À 0, les sorts et capacités échouent mais le personnage ne subit aucun effet physique. Base Niv. 1 : 20 EM."},
    {t:"IRP",d:"In Roleplay. Désigne ce qui se passe dans la fiction, du point de vue du personnage. Toutes les actions de combat, toutes les paroles et toutes les réactions appartenant à la narration sont IRP."},
    {t:"HRP",d:"Hors Roleplay. Désigne ce qui est dit ou fait en tant que joueur réel, en dehors de la fiction. Se balise avec (( )) ou // en salon RP."},
    {t:"MJ",d:"Maître Joueur. Membre du staff qui arbitre et narre les combats. Il valide les actions, applique les effets et décrit ce qui se passe réellement dans la scène. Sa narration fait foi."},
    {t:"Metagaming",d:"Utiliser des informations auxquelles votre personnage n\'a pas eu accès IRP pour influencer ses décisions. Faute grave."},
    {t:"Godmodding",d:"Jouer son personnage comme invincible, infaillible ou incapable d\'être affecté. Interdit."},
    {t:"Powerplay",d:"Contrôler les actions, réactions ou émotions du personnage d\'un autre joueur sans son accord. Interdit."},
    {t:"Surcadençage",d:"Forcer son corps au-delà de ses limites naturelles pour effectuer plus d\'actions par tour qu\'autorisé. Chaque action supplémentaire coûte un multiple croissant du coût EP de base."},
    {t:"Initiative",d:"Appartient au premier agresseur (première action offensive déclarée). Ne peut être ni perdue ni volée en cours de combat."},
    {t:"CAC",d:"Corps à Corps. Désigne un combat ou une action à portée de mêlée, nécessitant la proximité physique avec la cible."},
    {t:"L\'Argonaute",d:"Le plus grand héros du monde ancien. Il a perdu face à une puissance qu\'il croyait être le sommet des ténèbres — qui n\'était qu\'une avant-garde. Le Dimenséa lui a été arraché, déclenchant la projection de l\'humanité."},
    {t:"KO",d:"Knock Out. État d\'un personnage dont les PV sont tombés à 0. Le personnage est inconscient mais vivant. La mort n\'est prononcée que si le contexte le justifie."},
  ];
  h+='<div style="display:flex;flex-direction:column;gap:6px;margin-top:16px;">';
  terms.forEach(function(term){
    h+='<div style="display:flex;gap:16px;padding:12px 16px;background:var(--bg3);border:1px solid var(--border);border-left:3px solid var(--glacier-dim);">';
    h+='<div style="font-family:var(--fd);font-size:12px;letter-spacing:1px;color:var(--glacier);min-width:140px;flex-shrink:0;">'+term.t+'</div>';
    h+='<div style="font-size:13px;color:var(--dim);line-height:1.6;">'+term.d+'</div>';
    h+='</div>';
  });
  h+='</div>';
  h+='</div>';


  // ── DONNÉES PERSO ──
  h+='<div class="rsec">';
  h+='<h2>Protection des données personnelles</h2>';
  h+='<div class="warnbox" style="margin-bottom:16px;"><strong>Bon réflexe :</strong> utilisez un mot de passe unique pour Nuages Polaires, différent de vos autres services. Évitez aussi d\'utiliser comme identifiant un pseudo que vous employez partout ailleurs.</div>';
  h+='<h3>Principe général</h3>';
  h+='<p>Nuages Polaires applique un principe de minimisation : seules les données utiles au fonctionnement du site, du compte, du personnage et à la sécurité du service doivent être conservées. Aucune donnée d\'identité civile n\'est demandée pour jouer.</p>';
  h+='<h3>Données collectées</h3>';
  h+='<ul><li><strong>Pseudo de compte</strong> — identifiant de connexion et de gestion interne.</li><li><strong>Mot de passe</strong> — jamais stocké en clair ; il est d\'abord haché côté client puis renforcé côté serveur avant stockage. Le staff ne peut pas le lire.</li><li><strong>Données de personnage</strong> — niveau, statistiques, inventaire, historique, éléments utiles au jeu et au suivi.</li><li><strong>Données techniques de sécurité</strong> — journaux d\'authentification, horodatages, actions administratives et, si nécessaire, adresse IP ou informations techniques associées à une connexion.</li><li><strong>Session technique</strong> — cookie sécurisé strictement nécessaire au maintien de la connexion.</li></ul>';
  h+='<p>Aucun e-mail, nom réel, numéro de téléphone, adresse postale ou document d\'identité n\'est requis pour créer un compte joueur classique.</p>';
  h+='<h3>Finalités</h3>';
  h+='<ul><li>permettre la connexion au site et la gestion du compte ;</li><li>faire fonctionner les personnages, inventaires, progressions et sauvegardes ;</li><li>assurer la modération, la traçabilité des actions sensibles et la sécurité du service ;</li><li>prévenir les abus, intrusions, contournements de sanctions et utilisations malveillantes.</li></ul>';
  h+='<h3>Accès et confidentialité</h3>';
  h+='<ul><li>Les accès sont limités selon le rôle et le besoin de gestion.</li><li>Les mots de passe ne sont pas lisibles par le staff.</li><li>Les données ne sont ni revendues, ni publiquement diffusées, ni utilisées à des fins commerciales externes.</li><li>Toute divulgation non autorisée d\'une donnée personnelle d\'un membre constitue une faute grave.</li></ul>';
  h+='<h3>Conservation</h3>';
  h+='<p>Les données de compte et de personnage sont conservées tant que le compte reste actif ou nécessaire au fonctionnement normal du serveur. Les journaux techniques et de sécurité sont conservés de manière limitée et proportionnée pour l\'audit interne, la protection du service et le traitement d\'un incident.</p>';
  h+='<h3>Vos droits</h3>';
  h+='<ul><li><strong>Accès</strong> — demander la liste des données associées à votre compte.</li><li><strong>Rectification</strong> — demander la correction d\'une donnée inexacte.</li><li><strong>Effacement</strong> — supprimer votre compte depuis les paramètres ; les données de personnage liées au compte joueur sont alors retirées du service, sous réserve des traces techniques strictement nécessaires à la sécurité.</li><li><strong>Sécurisation</strong> — demander un reset de mot de passe ou signaler tout soupçon d\'accès non autorisé.</li></ul>';
  h+='<h3>Responsabilités du membre</h3>';
  h+='<ul><li>Ne partagez jamais votre mot de passe.</li><li>Utilisez un mot de passe fort et distinct.</li><li>Évitez d\'utiliser le même identifiant que sur vos autres services publics.</li><li>Prévenez le staff rapidement en cas de doute sur une compromission de compte.</li></ul>';
  h+='<p style="color:var(--faint);font-style:italic;font-size:13px;margin-top:16px;">Dernière mise à jour : avril 2026.</p>';
  h+='</div>';


  ge(tid).innerHTML=h;
}

function renderCombat(tid){
  var h='<div class="premium-doc premium-doc-system">';

  // ── I. PHILOSOPHIE ──
  h+='<div class="rsec">';
  h+='<div style="font-family:var(--fd);font-size:8px;letter-spacing:4px;color:var(--glacier);margin-bottom:8px;">NUAGES POLAIRES ☁️</div>';
  h+='<h2>Système de Combat</h2>';
  h+='<div class="quote">« Nul ne choisit son Serment. C\'est le Serment qui reconnaît son porteur. »</div>';

  h+='<h3>I. Philosophie du Combat</h3>';
  h+='<p>Le combat sur Nuages Polaires n\'est pas un jeu de hasard. Chaque action déclarée réussit toujours — ce qui compte, c\'est le choix stratégique, la narration et la cohérence avec son Serment.</p>';
  h+='<p>Frapper, esquiver, parer, tirer, se déplacer : tout ce qu\'un personnage décide de faire, il le fait. Le système existe pour donner du poids à ces décisions, pas pour les annuler.</p>';
  h+='<div class="hlbox"><strong>Règle fondamentale :</strong> Toute action déclarée est une réussite. Il n\'y a pas d\'échec sur une frappe, une esquive, une parade ou un déplacement. Ce qui varie, c\'est uniquement l\'impact de l\'action choisie.</div>';
  h+='</div>';

  // ── II. STATISTIQUES ──
  h+='<div class="rsec">';
  h+='<h3>II. Statistiques</h3>';
  h+='<p>Chaque personnage possède trois paires de statistiques définissant son endurance, sa vigueur physique et sa réserve arcanique.</p>';
  h+='<table class="rtbl"><thead><tr><th>Statistique</th><th>Format</th><th>Base (Niv. 1)</th><th>Rôle</th></tr></thead><tbody>';
  h+='<tr><td><strong>Points de Vie (PV)</strong></td><td>Actuel / Max</td><td>30 PV</td><td>Résistance vitale. À 0 : KO ou mort.</td></tr>';
  h+='<tr><td><strong>Énergie Physique (EP)</strong></td><td>Actuelle / Max</td><td>50 EP</td><td>Carburant de toutes les actions physiques.</td></tr>';
  h+='<tr><td><strong>Énergie Magique (EM)</strong></td><td>Actuelle / Max</td><td>20 EM</td><td>Carburant des sorts et capacités de Serment.</td></tr>';
  h+='</tbody></table>';
  h+='<div class="hlbox"><strong>Croissance des statistiques :</strong> Au niveau 1, TOUS les personnages partagent les mêmes statistiques de base (30 PV / 50 EP / 20 EM). À partir du niveau 2, chaque Serment applique sa propre croissance. La différenciation ne commence donc qu\'au niveau 2.</div>';
  h+='</div>';

  // ── III. RÉCUPÉRATION ──
  h+='<div class="rsec">';
  h+='<h3>III. Récupération</h3>';
  h+='<p>L\'énergie physique et l\'énergie magique ne se régénèrent pas automatiquement au fil du combat. Elles se restaurent lors des moments de repos, à condition que le personnage soit nourri.</p>';
  h+='<div class="hlbox"><strong>Condition de récupération — EP &amp; EM :</strong> La récupération se déclenche lors de tout repos, quelle que soit sa durée. Deux conditions sont nécessaires : une volonté de repos (le personnage cesse toute activité intense) ET un repas (le personnage doit être nourri). Si l\'une des deux conditions manque, la récupération n\'a pas lieu. L\'EP et l\'EM sont restaurées à leur maximum après un repos valide.</div>';
  h+='</div>';

  // ── IV. STRUCTURE ──
  h+='<div class="rsec">';
  h+='<h3>IV. Structure d\'un Combat</h3>';

  h+='<h4>Initiative</h4>';
  h+='<p>Le premier personnage à porter une action offensive obtient l\'initiative et la conserve pour toute la durée du combat — même s\'il dispose de moins d\'actions que son adversaire.</p>';
  h+='<div class="hlbox"><strong>Initiative :</strong> appartient au premier agresseur. Elle ne peut pas être perdue ni volée en cours de combat. En cas de combat à plusieurs, l\'initiative appartient au camp dont un membre a frappé en premier.</div>';

  h+='<h4>Déroulement Séquentiel — J1 puis J2</h4>';
  h+='<p>Le combat se déroule en séquences strictes. Chaque joueur joue la totalité de son tour avant que l\'adversaire ne puisse agir. Il n\'y a pas d\'entrelacement d\'actions.</p>';
  h+='<div class="hlbox"><strong>Tour séquentiel :</strong> J1 exécute TOUTES ses actions dans l\'ordre qu\'il choisit. J2 ne peut PAS attaquer pendant le tour de J1. J2 peut uniquement : Esquiver (annule totalement une action ciblée) ou Parer (réduit de 25% les dégâts). Ces réactions défensives consomment des actions du tour de J2. Si J2 utilise toutes ses actions en défense, il n\'en aura plus pour attaquer à son tour.</div>';
  h+='<div class="hlbox"><strong>Ce que ressent le personnage qui subit IRP :</strong> Subir un tour adverse n\'est pas une observation passive. Si J2 esquive, son personnage parvient à se dérober au prix d\'un effort physique. Si J2 pare, il encaisse volontairement une partie du coup. Si J2 ne réagit pas, il subit les dégâts pleinement. IRP, le personnage ressent chaque coup, chaque esquive, chaque parade. La narration doit refléter cet état en temps réel.</div>';

  h+='<h4>Perception de la Vitesse Adverse</h4>';
  h+='<table class="rtbl"><thead><tr><th>Actions reçues</th><th>Ressenti global</th><th>Description narrative IRP</th></tr></thead><tbody>';
  h+='<tr><td><strong>3</strong></td><td>Rythme normal</td><td>L\'adversaire frappe à un rythme lisible. Ses intentions sont perceptibles, ses mouvements anticipables.</td></tr>';
  h+='<tr><td><strong>4–5</strong></td><td>Cadence élevée</td><td>Les coups s\'enchaînent vite. J2 commence à peiner à suivre le fil. Ses marges se réduisent.</td></tr>';
  h+='<tr><td><strong>6–7</strong></td><td>Vitesse oppressante</td><td>L\'adversaire semble être partout à la fois. J2 ne lit plus les attaques — il les subit.</td></tr>';
  h+='<tr><td><strong>8–9</strong></td><td>Limite du perceptible</td><td>J2 ne voit plus les coups arriver. Son corps réagit seul ou pas du tout.</td></tr>';
  h+='<tr><td><strong>10+</strong></td><td>Au-delà du réel</td><td>J2 n\'a aucune prise sur ce qui se passe. Ce n\'est plus un combat — c\'est une tempête.</td></tr>';
  h+='</tbody></table>';
  h+='<p style="font-size:12px;color:var(--faint);font-style:italic;">⚠ Ce tableau est un guide narratif. Il ne modifie aucune mécanique.</p>';

  h+='<h4>Actions par Tour</h4>';
  h+='<p>Chaque personnage dispose toujours d\'un minimum de 3 actions par tour tant qu\'aucun debuff ne réduit ce total. Un bonus d\'actions peut ensuite s\'ajouter en cas d\'écart de niveau positif avec la cible visée : +1 action par niveau d\'écart. Dans le simulateur, ce bonus se débloque dès qu\'une action est déclarée contre une cible de niveau inférieur.</p>';
  h+='<table class="rtbl"><thead><tr><th>Situation</th><th>Écart</th><th>Actions</th></tr></thead><tbody>';
  h+='<tr><td>Niveaux identiques</td><td>0</td><td>3 actions</td></tr>';
  h+='<tr><td>Supérieur d\'1 niveau</td><td>+1</td><td>4 actions</td></tr>';
  h+='<tr><td>Supérieur de 2 niveaux</td><td>+2</td><td>5 actions</td></tr>';
  h+='<tr><td>Supérieur de N niveaux</td><td>+N</td><td>3 + N actions</td></tr>';
  h+='</tbody></table>';
  h+='<p style="font-size:12px;color:var(--faint);font-style:italic;">⚠ L\'écart se calcule toujours par rapport à la cible visée au moment de l\'action, pas par rapport au groupe adverse.</p>';
  h+='</div>';

  // ── V. ACTIONS ──
  h+='<div class="rsec">';
  h+='<h3>V. Actions de Combat &amp; Coûts en Énergie</h3>';
  h+='<p>Chaque action consomme de l\'énergie physique (EP) ou magique (EM). Toute action réussit — seul l\'impact varie.</p>';
  h+='<table class="rtbl"><thead><tr><th>Action</th><th>Type</th><th>Coût</th><th>Effet</th></tr></thead><tbody>';
  h+='<tr><td colspan="4" style="font-family:var(--fd);font-size:9px;letter-spacing:2px;color:var(--glacier);padding:8px 12px;background:rgba(126,184,212,.05);">ATTAQUES</td></tr>';
  h+='<tr><td>Frappe</td><td>Physique</td><td>6 EP</td><td>Dégâts Serment + Niveau du personnage en PV.</td></tr>';
  h+='<tr><td>Tir à l\'arc</td><td>Physique</td><td>4 EP</td><td>Dégâts Serment + Niveau. Action à distance uniquement.</td></tr>';
  h+='<tr><td>Invoquer son Serment</td><td>Magique</td><td>1 EM</td><td>L\'arme du Serment réapparaît dans la main.</td></tr>';
  h+='<tr><td colspan="4" style="font-family:var(--fd);font-size:9px;letter-spacing:2px;color:var(--glacier);padding:8px 12px;background:rgba(126,184,212,.05);">DÉFENSES</td></tr>';
  h+='<tr><td>Esquive</td><td>Physique</td><td>8 EP</td><td>Annule totalement les dégâts de l\'action ciblée.</td></tr>';
  h+='<tr><td>Bloquer sans bouclier</td><td>Physique</td><td>2 EP</td><td>Réduit les dégâts reçus de 25% (arrondi supérieur).</td></tr>';
  h+='<tr><td>Bloquer avec bouclier</td><td>Physique</td><td>5 EP</td><td>Réduit les dégâts reçus de 50% (arrondi supérieur).</td></tr>';
  h+='<tr><td colspan="4" style="font-family:var(--fd);font-size:9px;letter-spacing:2px;color:var(--glacier);padding:8px 12px;background:rgba(126,184,212,.05);">MOUVEMENT</td></tr>';
  h+='<tr><td>Se déplacer</td><td>Physique</td><td>10 EP</td><td>Se met à distance. Empêche les frappes au corps à corps.</td></tr>';
  h+='<tr><td colspan="4" style="font-family:var(--fd);font-size:9px;letter-spacing:2px;color:var(--glacier);padding:8px 12px;background:rgba(126,184,212,.05);">ACTIONS LIBRES</td></tr>';
  h+='<tr><td>Utiliser un objet</td><td>Physique</td><td>0 EP</td><td>Utiliser une potion, un objet non offensif, donner un objet.</td></tr>';
  h+='<tr><td>Recevoir un objet</td><td>Physique</td><td>0 EP</td><td>Recevoir un objet d\'un allié ou ramasser quelque chose.</td></tr>';
  h+='</tbody></table>';
  h+='<div class="hlbox"><strong>Formule des dégâts :</strong> Dégâts = Damage de base (Serment) + Niveau du personnage. <em>Exemple : Duelliste niveau 3 — Frappe = 11 + 3 = 14 PV infligés.</em></div>';
  h+='<div class="hlbox"><strong>Pugilat :</strong> Tout personnage peut frapper à mains nues — <strong>3 + Niveau du porteur</strong>, 6 EP, 1 action. Applicable à tous, quelle que soit la classe ou le Serment.</div>';
  h+='<div class="hlbox"><strong>Note importante :</strong> Se déplacer (10 EP) place le personnage hors de portée de frappe au corps à corps. Pour les porteurs d\'un Serment à arme non-mêlée (Flécheur, Arcaniste), la frappe de base représente un coup de poing.</div>';
  h+='</div>';

  // ── VI. SURCADENÇAGE ──
  h+='<div class="rsec">';
  h+='<h3>VI. Surcadençage</h3>';
  h+='<p>Le surcadençage permet à un personnage de forcer son corps au-delà de ses limites naturelles, en effectuant plus d\'actions par tour que ce que son niveau lui accorde normalement. Chaque action supplémentaire multiplie le coût EP de l\'action concernée de façon exponentielle.</p>';
  h+='<div class="hlbox"><strong>Règle du Surcadençage :</strong><br>→ +1 action : coût × 2<br>→ +2 actions : coût × 2.5<br>→ +3 actions : coût × 3<br>→ +4 actions : coût × 3.5<br>→ +5 actions : coût × 4 (et ainsi de suite, +0.5 par palier)<br><br>⚠ Tout arrondi se fait TOUJOURS à la valeur supérieure. Il n\'y a pas de virgule qui tienne.</div>';
  h+='<table class="rtbl"><thead><tr><th>Actions supp.</th><th>Multiplicateur</th><th>Frappe</th><th>Esquive</th><th>Parer</th><th>Tir</th><th>Déplacement</th></tr></thead><tbody>';
  h+='<tr><td>Base</td><td>×1</td><td>6 EP</td><td>8 EP</td><td>2 EP</td><td>4 EP</td><td>10 EP</td></tr>';
  h+='<tr><td>+1</td><td>×2</td><td>12 EP</td><td>16 EP</td><td>4 EP</td><td>8 EP</td><td>20 EP</td></tr>';
  h+='<tr><td>+2</td><td>×2.5</td><td>15 EP</td><td>20 EP</td><td>5 EP</td><td>10 EP</td><td>25 EP</td></tr>';
  h+='<tr><td>+3</td><td>×3</td><td>18 EP</td><td>24 EP</td><td>6 EP</td><td>12 EP</td><td>30 EP</td></tr>';
  h+='<tr><td>+4</td><td>×3.5</td><td>21 EP</td><td>28 EP</td><td>7 EP</td><td>14 EP</td><td>35 EP</td></tr>';
  h+='<tr><td>+5</td><td>×4</td><td>24 EP</td><td>32 EP</td><td>8 EP</td><td>16 EP</td><td>40 EP</td></tr>';
  h+='</tbody></table>';
  h+='<p style="font-size:12px;color:var(--faint);">⚠ Le Sort offensif consomme de l\'EM, pas de l\'EP. Il n\'est pas affecté par le surcadençage physique.<br>⚠ Les capacités qui consomment toutes les actions restantes du tour ne peuvent pas être déclenchées en surcadençage. Le nombre d\'actions sacrifiées est limité aux actions de base du tour (maximum 2).</p>';
  h+='</div>';

  // ── VII. ÉPUISEMENT ──
  h+='<div class="rsec">';
  h+='<h3>VII. Épuisement Total</h3>';
  h+='<div class="warnbox"><strong>EP à 0 — Effondrement :</strong> Lorsque l\'EP d\'un personnage tombe à 0 ou en dessous, il s\'effondre. Le personnage est physiquement hors d\'état d\'agir : il ne peut plus attaquer, esquiver, parer, se déplacer ni effectuer la moindre action physique. Il n\'est pas mort, mais est totalement incapacité jusqu\'à récupération (repos + repas).</div>';
  h+='<div class="warnbox"><strong>EP insuffisante — Tentative impossible :</strong> Si un personnage tente une action dont le coût dépasse son EP actuelle, il s\'évanouit. L\'action ne se produit pas. Le personnage s\'effondre immédiatement, hors combat.</div>';
  h+='<div class="hlbox"><strong>L\'Énergie Magique — Aucune incidence physique :</strong> L\'EM est une énergie arcanique qui ne sollicite pas le corps du porteur. Un Serment à court d\'EM ne ressent rien — aucune fatigue, aucun effet secondaire. Si un personnage tente un sort avec 0 EM, le sort ne produit rien. L\'EM et l\'EP sont deux réservoirs totalement indépendants.</div>';
  h+='</div>';

  // ── VIII. COMBATS À PLUSIEURS ──
  h+='<div class="rsec">';
  h+='<h3>VIII. Combats à Plusieurs Entités</h3>';
  h+='<table class="rtbl"><thead><tr><th>Configuration</th><th>Règle</th></tr></thead><tbody>';
  h+='<tr><td>1 contre 2 (ou plus)</td><td>L\'écart de niveau se calcule entre le solitaire et l\'adversaire le plus proche en niveau.</td></tr>';
  h+='<tr><td>2 (ou plus) contre 1</td><td>Chaque membre joue normalement. L\'adversaire seul calcule son écart contre sa cible du moment.</td></tr>';
  h+='<tr><td>Chacun pour soi</td><td>L\'écart se calcule individuellement contre la cible visée à ce moment précis.</td></tr>';
  h+='</tbody></table>';
  h+='</div>';

  // ── IX. FIN DU COMBAT ──
  h+='<div class="rsec">';
  h+='<h3>IX. Fin du Combat</h3>';
  h+='<div class="hlbox">Un personnage dont les PV tombent à 0 est hors de combat et tombe KO. <strong>KO :</strong> Le personnage est inconscient mais vivant. <strong>MORT :</strong> Possible selon le contexte et l\'accord des parties impliquées. La nature exacte de la défaite est déterminée par le contexte narratif et les règles du serveur.</div>';
  h+='</div>';

  // ── X. INTERPRÉTATION DES DÉGÂTS ──
  h+='<div class="rsec">';
  h+='<h3>X. Interprétation des Dégâts</h3>';
  h+='<p>Les PV ne sont pas qu\'un compteur abstrait. Ils reflètent l\'état physique réel du personnage. En fonction du pourcentage de PV restants et du type de dégâts reçus, la narration doit s\'adapter.</p>';
  h+='<div class="hlbox"><strong>Seuils d\'état général :</strong><br><strong>LÉGER (66–100% des PV max) :</strong> Le personnage est opérationnel. La douleur est présente mais maîtrisée.<br><strong>GRAVE (33–65% des PV max) :</strong> Des séquelles s\'accumulent. Les mouvements commencent à être affectés.<br><strong>CRITIQUE (0–32% des PV max) :</strong> Le personnage est à bout. Chaque action demande un effort extrême.</div>';

  var dmgTypes=[
    {icon:"⚔",name:"Tranchant",l:"Éraflures et coupures superficielles. Douleur présente mais n\'entrave pas les mouvements.",g:"Entailles profondes, saignements visibles. Les gestes amples deviennent douloureux. Cicatrice probable.",c:"Lacérations sévères, perte de sang importante. Un membre peut être compromis."},
    {icon:"🪨",name:"Contondant",l:"Bleus et chocs mineurs. Légère douleur à la pression, sans conséquence fonctionnelle.",g:"Contusions profondes, possibles fractures légères. La mobilité est réduite.",c:"Os fêlés ou brisés, traumatismes internes probables. Se tenir debout devient un effort conscient."},
    {icon:"🔥",name:"Brûlure",l:"Rougeurs et brûlures du premier degré. Peau sensible, douleur vive mais passagère.",g:"Brûlures du second degré. Cloques, peau à vif. Douleur constante.",c:"Brûlures profondes et carbonisation partielle. Les tissus sont détruits."},
    {icon:"☠",name:"Acide",l:"Irritations cutanées, légère corrosion en surface. Sensation de brûlure froide et piquante.",g:"La peau se décompose par plaques. Les équipements peuvent être altérés.",c:"Corrosion sévère des tissus, jusqu\'aux couches musculaires."},
    {icon:"❄",name:"Gel",l:"Engourdissements localisés, peau bleuie. Les réflexes commencent à ralentir.",g:"Gelures étendues, membres difficiles à contrôler. La coordination est affectée.",c:"Hypothermie avancée, membres partiellement figés. Un gel prolongé peut être fatal."},
    {icon:"💀",name:"Poison",l:"Nausées légères, légère confusion. Le corps tente encore de lutter.",g:"Vertiges prononcés, tremblements, visions altérées.",c:"Paralysie partielle, défaillance organique en cours. Danger vital sans traitement."},
    {icon:"⚡",name:"Foudre",l:"Décharge douloureuse, muscles tétanisés brièvement. Picotements persistants.",g:"Brûlures internes, arythmie cardiaque légère. Coordination motrice perturbée.",c:"Arrêt cardiaque partiel, système nerveux choqué. Risque de perte de conscience."},
  ];
  dmgTypes.forEach(function(d){
    h+='<div style="margin-bottom:12px;">';
    h+='<div style="font-family:var(--fd);font-size:10px;letter-spacing:2px;color:var(--glacier);margin-bottom:6px;">'+esc(d.icon)+' DÉGÂTS '+d.name.toUpperCase()+'</div>';
    h+='<table class="rtbl"><thead><tr><th>Seuil</th><th>Description</th></tr></thead><tbody>';
    h+='<tr><td style="color:var(--green);white-space:nowrap;">LÉGER (66–100%)</td><td style="font-style:italic;color:var(--dim);">'+d.l+'</td></tr>';
    h+='<tr><td style="color:var(--gold);white-space:nowrap;">GRAVE (33–65%)</td><td style="font-style:italic;color:var(--dim);">'+d.g+'</td></tr>';
    h+='<tr><td style="color:var(--red);white-space:nowrap;">CRITIQUE (0–32%)</td><td style="font-style:italic;color:var(--dim);">'+d.c+'</td></tr>';
    h+='</tbody></table>';
    h+='</div>';
  });
  h+='<div class="hlbox"><strong>Règle universelle des arrondis :</strong> Tout calcul produisant un résultat décimal s\'arrondit TOUJOURS à la valeur supérieure. Il n\'y a pas de virgule qui tienne — ni dans les dégâts, ni dans les coûts en EP. Exemple : Parer 9 PV (50% de 19) → 10 PV, pas 9.5.</div>';
  h+='</div>';

  // ── XI. SERMENTS ──
  h+='<div class="rsec">';
  h+='<h3>XI. Les Serments &amp; Progression</h3>';
  h+='<p>Chaque Serment confère une arme liée, des statistiques de progression uniques et des valeurs de dégâts propres. La formule s\'applique à tous : <strong>Damage de base + Niveau du porteur.</strong></p>';
  h+='<p>Les capacités se débloquent à des seuils précis — des moments où le lien entre l\'arme et son porteur franchit un nouveau palier :</p>';
  h+='<table class="rtbl"><thead><tr><th>Palier</th><th>Niveau requis</th><th>Ce qui s\'éveille</th></tr></thead><tbody>';
  h+='<tr><td><strong>I — Éveil</strong></td><td>Niveau 2</td><td>OUVERTURE — Première capacité. Le Serment s\'ouvre.</td></tr>';
  h+='<tr><td><strong>II — Densité</strong></td><td>Niveau 5</td><td>APPROFONDISSEMENT — Deuxième capacité. Le lien se densifie.</td></tr>';
  h+='<tr><td><strong>III — Maîtrise</strong></td><td>Niveau 7</td><td>MAÎTRISE — Troisième capacité. La maîtrise prend forme.</td></tr>';
  h+='<tr><td><strong>IV — Plénitude</strong></td><td>Niveau 10</td><td>PLÉNITUDE — Capacité ultime. Le Serment atteint sa plénitude.</td></tr>';
  h+='</tbody></table>';

  h+='<h4>Gemmes de Sang</h4>';
  h+='<p>Les Gemmes de Sang sont des fragments cristallins imprégnés d\'énergie vitale, extraits des créatures vaincues. Fusionnées à l\'arme du Serment, elles font progresser le porteur vers le prochain palier.</p>';
  h+='<table class="rtbl"><thead><tr><th>Gemme</th><th>XP accordé</th><th>Sources</th></tr></thead><tbody>';
  h+='<tr><td><strong>💎 Gemme Blanche</strong></td><td>+5 XP</td><td>Tout type de mob</td></tr>';
  h+='<tr><td><strong>💎 Gemme Incarnate</strong></td><td>+20 XP</td><td>Mobs moyens ou puissants</td></tr>';
  h+='<tr><td><strong>💎 Gemme Écarlate</strong></td><td>+50 XP</td><td>Mobs puissants / Élites uniquement</td></tr>';
  h+='</tbody></table>';
  h+='<div class="hlbox">La progression est entièrement gérée par le staff. Les drops de gemmes, les fusions et les mises à jour de fiches sont traités côté staff après chaque événement. En cas de question, ouvre un ticket.</div>';

  h+='<h4>Quand un autre prend ton Serment</h4>';
  h+='<p><strong>Nul ne peut s\'approprier le Serment d\'un autre.</strong> Celui qui tente de saisir l\'arme d\'un Serment qui ne lui appartient pas ne rencontre pas de résistance ordinaire. Ce n\'est pas un poids mécanique, ni une barrière visible. C\'est le corps entier qui refuse — une impression de lourdeur sourde qui s\'installe dès le premier contact, et qui empire à chaque seconde. L\'arme ne se soulève pas. Elle ne se manie pas. Elle attend, silencieuse, celui qu\'elle a reconnu.</p>';
  h+='<h4>À la mort de son porteur</h4>';
  h+='<p>Lorsqu\'un Élève du Serment meurt, son arme ne tombe pas. Elle ne reste pas. Elle disparaît — totalement, instantanément, sans laisser de trace. Aucun fragment, aucune empreinte, aucun résidu. Le lien se rompt, et ce qui en était la preuve tangible cesse d\'exister avec lui.</p>';
  h+='</div>';

  // ── COMPORTEMENTS ──
  h+='<div class="rsec">';
  h+='<h3>Comportements des Créatures</h3>';
  h+='<p>Le comportement d\'une créature définit la manière dont elle réagit à la présence d\'un aventurier, avant même que le combat ne s\'engage. Il ne décrit pas sa dangerosité — il décrit une disposition naturelle, un réflexe premier face à l\'inconnu.</p>';
  var behs=[
    {nom:"Gibier",col:"#6db88a",desc:"La créature fuit dès qu\'elle perçoit une menace. Elle n\'attaque jamais en premier et cherche à rompre le contact à la moindre occasion."},
    {nom:"Passif",col:"#7eb8d4",desc:"La créature ignore les aventuriers tant qu\'ils ne s\'approchent pas trop ou ne menacent pas ses petits. Elle peut riposter avec violence si elle se sent acculée."},
    {nom:"Neutre",col:"#c9a84c",desc:"La créature évalue la situation avant d\'agir. Elle peut attaquer si elle se sent menacée, si elle a faim, ou si l\'aventurier entre dans son territoire."},
    {nom:"Agressif",col:"#c97a4a",desc:"La créature attaque facilement, parfois sans raison apparente. La simple présence d\'un aventurier dans son territoire peut déclencher une charge."},
    {nom:"Très agressif",col:"#c94a4a",desc:"La créature attaque à vue, sans hésitation et sans condition. Elle ne recule pas. Elle n\'a pas besoin d\'être provoquée — être là suffit."},
  ];
  h+='<div style="display:flex;flex-direction:column;gap:6px;">';
  behs.forEach(function(b){
    h+='<div style="display:flex;align-items:flex-start;gap:16px;padding:12px 16px;background:var(--bg3);border:1px solid var(--border);border-left:3px solid '+b.col+';">';
    h+='<span style="font-family:var(--fd);font-size:11px;letter-spacing:2px;text-transform:uppercase;color:'+b.col+';min-width:120px;flex-shrink:0;padding-top:2px;">'+esc(b.nom)+'</span>';
    h+='<span style="font-size:13px;color:var(--dim);line-height:1.6;">'+esc(b.desc)+'</span>';
    h+='</div>';
  });
  h+='</div>';
  h+='</div>';

  ge(tid).innerHTML=h;
}

// ==========================================
// STAFF — LISTE JOUEURS (onglet Joueurs)
// ==========================================
var _pendingOpen=true;
function togglePendingList(){
  _pendingOpen=!_pendingOpen;
  var list=ge("pending-accounts-list");
  var icon=ge("pending-toggle-icon");
  if(!list) return;
  list.style.maxHeight=_pendingOpen?(list.scrollHeight+200)+"px":"0px";
  if(icon) icon.style.transform=_pendingOpen?"rotate(0deg)":"rotate(-90deg)";
}

function renderPendingAccounts(){
  if(!isAdminRole(CU)){ return; }
  var section=ge("pending-accounts-section");
  var list=ge("pending-accounts-list");
  if(!section||!list) return;
  if(!can("manage_mjs")){ section.style.display="none"; return; }
  var accounts=getAccounts();
  var pending=accounts.filter(function(a){ return (a.role==="joueur"||!a.role)&&!a.pid; });
  if(!pending.length){ section.style.display="none"; return; }
  section.style.display="block";

  // Replier par défaut si plus de 2
  if(pending.length>2) _pendingOpen=false;
  else _pendingOpen=true;

  var icon=ge("pending-toggle-icon");
  if(icon) icon.style.transform=_pendingOpen?"rotate(0deg)":"rotate(-90deg)";

  // Titre avec compteur
  var titleTxt=ge("pending-title-txt");
  if(titleTxt) titleTxt.textContent="Comptes en attente de liaison ("+pending.length+")";

  var players=gp();
  var availablePlayers=players.filter(function(p){
    return !accounts.find(function(a){ return a.pid===p.id; });
  });
  list.innerHTML=pending.map(function(a){
    var opts='<option value="">— Choisir un personnage —</option>';
    opts+=availablePlayers.map(function(p){
      return '<option value="'+p.id+'">'+esc(p.name)+' — '+esc(p.classe)+'</option>';
    }).join("");
    var date=new Date(a.createdAt).toLocaleDateString("fr-FR")+' — '+new Date(a.createdAt).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
    return '<div style="padding:14px 0;border-bottom:1px solid var(--border);">'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">'
        +'<div style="font-family:var(--fd);font-size:13px;letter-spacing:1px;flex:1;">'+esc(a.pseudo)+'</div>'
        +'<div style="font-size:14px;color:var(--dim);font-style:italic;">'+date+'</div>'
      +'</div>'
      +'<select id="link-sel-'+a.id+'" style="width:100%;margin-bottom:10px;font-size:14px;padding:10px 13px;">'+opts+'</select>'
      +'<div style="display:flex;gap:8px;">'
        +'<button class="btn btn-grn" style="flex:2;padding:10px;" onclick="linkAccount(\''+a.id+'\')"><span>Lier ce compte</span></button>'
        +'<button class="btn btn-red" style="flex:1;padding:10px;" onclick="deleteAccount(\''+a.id+'\')"><span>Refuser</span></button>'
      +'</div>'
    +'</div>';
  }).join("");

  // Appliquer l'état replié/déplié
  list.style.maxHeight=_pendingOpen?(list.scrollHeight+200)+"px":"0px";
  list.style.overflow="hidden";
}

function goToPending(){
  switchDropTab("joueurs",null,"dd-staff");
  renderSPList();
  renderPendingAccounts();
  var sec=ge("pending-accounts-section");
  if(sec) sec.scrollIntoView({behavior:"smooth",block:"start"});
}

function linkAccount(accountId){
  if(!isAdminRole(CU)){ return; }
  var account=getAccounts().find(function(a){ return a.id===accountId; });
  if(!account){ notif("Compte introuvable.","err"); return; }
  var sel=ge("link-sel-"+accountId);
  if(!sel||!sel.value){ notif("Choisis un personnage.","err"); return; }
  _authCall({action:"admin_link_account", accountId:accountId, pid:sel.value}).then(function(r){
    if(!r||!r.ok){ notif((r&&r.error)||"Impossible de lier ce compte.","err"); return; }
    var pName=gpid(sel.value)?gpid(sel.value).name:"?";
    sysLog("liaison","Compte '"+esc(account.pseudo)+"' lié au personnage '"+pName+"'",CU?CU.name:"Staff");
    notif("Compte '"+esc(account.pseudo)+"' lié à "+pName+".","ok");
    _refreshPrivateCaches().then(function(){ renderPendingAccounts(); renderPendingTab(); updatePendingBadge(); renderSPList(); });
  }).catch(function(){ notif("Erreur réseau.","err"); });
}



function unlinkAccount(accountId){
  if(!isAdminRole(CU)){ return; }
  if(!can("manage_mjs")){notif("Admin uniquement.","err");return;}
  if(!confirm("Délier ce compte de son personnage ?")) return;
  var account=getAccounts().find(function(a){ return a.id===accountId; });
  if(!account){ notif("Compte introuvable.","err"); return; }
  var oldName=account.pseudo;
  _authCall({action:"admin_unlink_account", accountId:accountId}).then(function(r){
    if(!r||!r.ok){ notif((r&&r.error)||"Impossible de délier ce compte.","err"); return; }
    sysLog("deliaison","Compte '"+oldName+"' délié de son personnage",CU?CU.name:"Staff");
    notif("Compte '"+oldName+"' délié.","inf");
    _refreshPrivateCaches().then(function(){ renderPendingAccounts(); renderPendingTab(); updatePendingBadge(); renderSPList(); var dbEl=ge("t-database-c"); if(dbEl&&dbEl.innerHTML.trim()) renderDatabase(); });
  }).catch(function(){ notif("Erreur réseau.","err"); });
}



function setAccountPid(accountId,pid){
  if(!pid) return;
  var account=getAccounts().find(function(a){ return a.id===accountId; });
  _authCall({action:"admin_set_pid", accountId:accountId, pid:pid}).then(function(r){
    if(!r||!r.ok){ notif((r&&r.error)||"Impossible de relier ce compte.","err"); return; }
    var p=gpid(pid);
    notif("Compte '"+esc(account?account.pseudo:'Compte')+"' relié à "+(p?p.name:"?")+".","ok");
    _refreshPrivateCaches().then(function(){ renderDatabase(); renderSPList(); updatePendingBadge(); });
  }).catch(function(){ notif("Erreur réseau.","err"); });
}



function deleteAccount(accountId){
  if(!isAdminRole(CU)){ return; }
  if(!confirm("Supprimer ce compte ?")) return;
  var acc=getAccounts().find(function(a){return a.id===accountId;});
  var pseudo=acc?acc.pseudo:"?";
  _authCall({action:"admin_delete_account", accountId:accountId}).then(function(r){
    if(!r||!r.ok){ notif((r&&r.error)||"Impossible de supprimer ce compte.","err"); return; }
    sysLog("compte_supprime","Compte '"+pseudo+"' supprimé",CU?CU.name:"Staff");
    notif("Compte supprimé.","inf");
    _refreshPrivateCaches().then(function(){ renderPendingAccounts(); renderPendingTab(); updatePendingBadge(); var dbEl=ge("t-database-c"); if(dbEl&&dbEl.innerHTML.trim()) renderDatabase(); renderMJList(); });
  }).catch(function(){ notif("Erreur réseau.","err"); });
}




function _togglePending(){
  var l=ge("pending-accounts-list");
  var ic=ge("pending-toggle-icon");
  if(!l) return;
  var open=l.style.display!=="none";
  l.style.display=open?"none":"";
  if(ic) ic.style.transform=open?"rotate(-90deg)":"";
}

// Construit la structure HTML de l'onglet Joueurs si elle n'existe pas encore
function _buildJoueursTab(){
  var root = ge("p-joueurs-c"); if(!root) return;
  if(ge("s-plist")) return;
  var h = "";
  h += "<div id='joueurs-toolbar' style='display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap;'>";
  h += "  <div class='card-title' style='flex:1;'>Joueurs</div>";
  h += "  <button class='btn btn-sm btn-grn' onclick=\"openModal('m-addp');setTimeout(renderNewPlayerAvatarDraft,0)\"><span>+ Nouveau joueur</span></button>";
  h += "</div>";
  h += "<div id='pending-accounts-section' style='display:none;margin-bottom:16px;'>";
  h += "  <div class='card' style='border-color:var(--gold);background:rgba(201,168,76,.03);'>";
  h += "    <div style='display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:2px 0;' onclick='_togglePending()'>";
  h += "      <div style='display:flex;align-items:center;gap:10px;'>";
  h += "        <span style='font-family:var(--fd);font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--gold);'>&#x23F3; <span id='pending-title-txt'>Comptes en attente</span></span>";
  h += "        <span id='pending-badge' style='display:none;background:var(--red);color:#fff;font-size:9px;min-width:18px;height:18px;border-radius:99px;display:inline-flex;align-items:center;justify-content:center;font-family:var(--fd);padding:0 4px;'></span>";
  h += "      </div>";
  h += "      <span id='pending-toggle-icon' style='color:var(--dim);font-size:12px;transition:transform .2s;'>&#9662;</span>";
  h += "    </div>";
  h += "    <div id='pending-accounts-list' style='margin-top:12px;'></div>";
  h += "  </div>";
  h += "</div>";
  h += "<div id='s-plist' class='s-plist'></div>";
  h += "<div id='mjlist-section' style='margin-top:24px;'>";
  h += "  <div class='dv' style='margin-bottom:20px;'></div>";
  h += "  <div class='card-title' style='margin-bottom:12px;'>Comptes Staff</div>";
  h += "  <div id='mjlist'></div>";
  h += "</div>";
  root.innerHTML = h;
}

function renderSPList(){
  if(!CU||CU.type!=="staff"){ var el3=ge("s-plist"); if(el3) el3.innerHTML=""; return; }
  var canItems=can("manage_items");
  var canStats=can("manage_stats");
  var canXP=can("manage_xp");
  var canDel=can("delete_player");
  var plistEl=ge("s-plist"); if(!plistEl) return;
  var players = gp();
  if(!players.length){
    plistEl.innerHTML='<div class="empty-state"><div class="empty-state-icon">⚔</div><div class="empty-state-title">Aucun joueur</div><div class="empty-state-sub">Les personnages apparaîtront ici une fois créés.</div></div>';
    return;
  }
  plistEl.innerHTML=players.map(function(p){
    var av=p.avatar?'<img src="'+p.avatar+'" class="pav" onerror="this.outerHTML=\'<div class=pavph>'+p.name[0]+'</div>\'">'
      :'<div class="pavph">'+p.name[0]+'</div>';
    var isCurrent=CU&&CU.pid===p.id;
    var btns='';
    if(canItems) btns+='<button class="btn btn-sm btn-grn" onclick="oAI(\''+p.id+'\')"><span>+Item</span></button><button class="btn btn-sm btn-red" onclick="oRI(\''+p.id+'\')"><span>−Item</span></button>';
    if(canStats) btns+='<button class="btn btn-sm btn-gold" onclick="oES(\''+p.id+'\')"><span>Stats</span></button>';
    if(canXP) btns+='<button class="btn btn-sm" onclick="openProgPanel(\''+p.id+'\')"><span>XP</span></button>';
    btns+='<button class="btn btn-sm" style="border-color:var(--glacier-dim);color:var(--glacier-dim);" onclick="loadPlayer(\''+p.id+'\')"><span>Accéder</span></button>';
    if(canDel) btns+='<button class="btn btn-sm btn-red" onclick="delP(\''+p.id+'\')"><span>Sup.</span></button>';
    return'<div class="prow'+(isCurrent?" sel":"")+'" id="pr-'+p.id+'">'
      +'<div>'+av+'</div>'
      +'<div><div class="pname">'+esc(p.name)+(isCurrent?' <span class="tag tgl" style="font-size:8px;padding:2px 6px;">Affiché</span>':'')+'</div><div class="pcls">'+esc(p.classe)+' — Niv. Serment '+p.sLevel+(p.createdAt?' <span style="color:var(--faint);font-size:10px;margin-left:6px;">· '+new Date(p.createdAt).toLocaleDateString("fr-FR")+'</span>':'')+'</div></div>'
      +'<div class="fx" style="gap:6px;"><span class="plvl">Niv. '+p.level+'</span>'+btns+'</div></div>';
  }).join("");
}

// Charger un joueur dans la vue principale (staff peut switcher)
function loadPlayer(pid){
  pid=pid||resolveOwnProfilePid();
  if(!pid) return;
  // Pour les admins : on garde CU.pid intact (compte lié en haut à droite)
  // On stocke la fiche affichée dans _viewPid
  if(CU.role!=="joueur") _viewPid=pid;
  else CU.pid=pid;
  renderView();
  renderBGrid("p-bgrd",true);
  document.querySelectorAll(".prow").forEach(function(r){r.classList.remove("sel");});
  var row=ge("pr-"+pid);if(row)row.classList.add("sel");
  switchTab("fiche", null);
  renderProgPanel(pid);
}

function ensureProgModal(){
  var m=ge("m-prog");
  if(m) return m;
  m=document.createElement("div");
  m.id="m-prog";
  m.className="moverlay";
  m.innerHTML=''
    +'<div class="modal" style="max-width:min(1040px,94vw);">'
    +'<button class="mclose" onclick="closeModal(\'m-prog\')">✕</button>'
    +'<div class="mtit">Progression du joueur</div>'
    +'<div id="prog-modal-body"></div>'
    +'</div>';
  document.body.appendChild(m);
  return m;
}

function openProgPanel(pid){
  ensureProgModal();
  renderProgPanel(pid);
  openModal("m-prog");
}

function renderProgPanel(pid){
  var p=gpid(pid);if(!p)return;
  ensureProgModal();
  var det=ge("prog-modal-body");if(!det)return;
  _progPid=pid;
  var mobOpts='<option value="">— Choisir un mob —</option>';
  gb().forEach(function(b){mobOpts+='<option value="'+b.id+'" data-xp="'+b.niv+'" data-nom="'+esc(b.nom)+'">'+esc(b.nom)+' (Niv. '+b.niv+')</option>';});

  det.innerHTML=
    // En-t_te
    '<div class="fx mb16">'
    +'<div style="font-family:var(--fd);font-size:14px;letter-spacing:2px;">'+esc(p.name)+'</div>'
    +'<span class="tag tgl">'+esc(p.classe)+'</span>'+(function(){ var _sb=getPlayerSermentBundle(p); return _sb.branch?'<span class="tag tgold">'+esc(_sb.branch.nom)+'</span>':(p.branch&&p.branch!=="Aucune"?'<span class="tag tgold">'+esc(p.branch)+'</span>':''); })()
    +'<div class="sp"></div>'
    +'<button class="btn btn-sm" onclick="closeModal(\'m-prog\')"><span>Fermer</span></button>'
    +'</div>'
    // Stats 6 cases
    +'<div class="g6" style="margin-bottom:16px;">'
    +'<div class="sst"><div class="sstv">'+p.pvCur+'/'+p.pvMax+'</div><div class="sstl">PV</div></div>'
    +'<div class="sst"><div class="sstv">'+p.epCur+'/'+p.epMax+'</div><div class="sstl">EP</div></div>'
    +'<div class="sst"><div class="sstv">'+p.emCur+'/'+p.emMax+'</div><div class="sstl">EM</div></div>'
    +'<div class="sst"><div class="sstv">'+p.level+'</div><div class="sstl">Niv. Perso</div></div>'
    +'<div class="sst" style="border-color:var(--glacier-dim);"><div class="sstv" style="color:var(--glacier-bright);">'+p.sLevel+'</div><div class="sstl">Niv. Serment</div></div>'
    +'<div class="sst" style="border-color:var(--glacier-dim);"><div class="sstv" style="font-size:12px;color:var(--glacier-bright);">'+p.sXp+'/'+p.sXpMax+'</div><div class="sstl">XP Serment</div></div>'
    +'</div>'
    // Prog tabs — conditionnels selon permission
    +'<div class="prog-tabs">'
    +(can("manage_xp")?'<button class="prog-tab active" onclick="switchProgTab(\'xp\')">XP Personnage</button><button class="prog-tab" onclick="switchProgTab(\'serm\')">XP Serment</button>':'')
    +(can("adjust_levels")?'<button class="prog-tab'+(can("manage_xp")?'':' active')+'" onclick="switchProgTab(\'adj\')">Ajustement</button>':'')
    +'<button class="prog-tab'+(can("manage_xp")||can("adjust_levels")?'':' active')+'" onclick="switchProgTab(\'inv2\')">Inventaire</button>'
    +'<button class="prog-tab" onclick="switchProgTab(\'hist2\')">Historique</button>'
    +'</div>'
    // Panel XP
    +'<div id="prog-xp" class="prog-panel active">'
    +'<div class="xp-prev"><div class="xp-prev-lbl">XP actuel</div><div class="xp-prev-val" id="xpp-cur">'+p.xp+' / '+p.xpMax+' XP</div><div class="xp-prev-sub">Niveau '+p.level+'</div></div>'
    +'<div class="frow"><label class="flbl">Mob vaincu</label><select id="xpp-mob" onchange="updateXPPreview(\''+pid+'\')">'+mobOpts+'</select></div>'
    +'<div><div class="flbl" style="margin-bottom:6px;">Participation du joueur</div><input type="range" class="part-slider" id="xpp-part" min="0" max="100" value="100" oninput="updateXPPreview(\''+pid+'\')"><div class="part-display" id="xpp-pv">100%</div></div>'
    +'<div class="xp-prev" id="xpp-res" style="border-color:var(--glacier-dim);"><div class="xp-prev-lbl">XP à attribuer</div><div class="xp-prev-val" id="xpp-gain">—</div><div class="xp-prev-sub" id="xpp-after">Sélectionne un mob</div></div>'
    +'<button class="btn btn-full btn-grn mt16" onclick="applyXP(\''+pid+'\')"><span>Attribuer l\'XP</span></button>'
    +'<p class="errmsg" id="xpp-err"></p>'
    +'</div>'
    // Panel Serment
    +'<div id="prog-serm" class="prog-panel">'
    +'<div class="xp-prev"><div class="xp-prev-lbl">XP Serment actuel</div><div class="xp-prev-val" id="sxpp-cur">'+p.sXp+' / '+p.sXpMax+' XP</div><div class="xp-prev-sub">Niveau Serment '+p.sLevel+'</div></div>'
    +'<div class="flbl" style="margin-bottom:10px;">Choisir une gemme</div>'
    +'<div class="gem-choice">'
    +'<div class="gem-btn" id="gbtn-b" onclick="selGem(\'b\')"><div style="font-size:20px;margin-bottom:4px;">○</div><div>Gemme Blanche</div><div style="font-family:var(--fm);font-size:14px;color:var(--dim);margin-top:2px;">+5 XP</div></div>'
    +'<div class="gem-btn" id="gbtn-i" onclick="selGem(\'i\')"><div style="font-size:20px;margin-bottom:4px;color:var(--purple);">◆</div><div>Gemme Incarnate</div><div style="font-family:var(--fm);font-size:14px;color:var(--dim);margin-top:2px;">+20 XP</div></div>'
    +'<div class="gem-btn" id="gbtn-e" onclick="selGem(\'e\')"><div style="font-size:20px;margin-bottom:4px;color:var(--red);">◆</div><div>Gemme Écarlate</div><div style="font-family:var(--fm);font-size:14px;color:var(--dim);margin-top:2px;">+50 XP</div></div>'
    +'</div>'
    +'<div class="flbl" style="margin-bottom:8px;">Quantité</div>'
    +'<div class="gem-qty-row"><button class="gem-qty-btn" onclick="changeGemQty(-1)">−</button><div class="gem-qty-val" id="gem-qty">1</div><button class="gem-qty-btn" onclick="changeGemQty(1)">+</button></div>'
    +'<div class="xp-prev" style="border-color:var(--glacier-dim);"><div class="xp-prev-lbl">XP Serment à attribuer</div><div class="xp-prev-val" id="sxpp-gain">—</div><div class="xp-prev-sub" id="sxpp-after">Sélectionne une gemme</div></div>'
    +'<button class="btn btn-full btn-grn mt16" onclick="applySermXP(\''+pid+'\')"><span>Fusionner les gemmes</span></button>'
    +'<p class="errmsg" id="sxpp-err"></p>'
    +'</div>'
    // Panel Ajustement
    +'<div id="prog-adj" class="prog-panel">'
    +'<p style="font-size:13px;color:var(--dim);font-style:italic;margin-bottom:16px;">Modification directe. Les level-ups/downs sont recalculés automatiquement.</p>'
    +'<div style="font-family:var(--fd);font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--text);margin-bottom:10px;border-bottom:1px solid var(--border);padding-bottom:6px;">Personnage</div>'
    +'<div class="g2" style="margin-bottom:10px;">'
    +'<div><div class="flbl" style="margin-bottom:6px;">Niveau</div><div style="display:flex;gap:6px;align-items:center;"><button class="gem-qty-btn" onclick="adjVal(\''+pid+'\',\'level\',-1)">−</button><div id="adj-lvl" style="font-family:var(--fm);font-size:16px;color:var(--glacier);min-width:32px;text-align:center;">'+p.level+'</div><button class="gem-qty-btn" onclick="adjVal(\''+pid+'\',\'level\',1)">+</button></div></div>'
    +'<div><div class="flbl" style="margin-bottom:6px;">XP</div><div style="display:flex;gap:6px;align-items:center;"><button class="gem-qty-btn" onclick="adjVal(\''+pid+'\',\'xp\',-10)">−10</button><div id="adj-xp" style="font-family:var(--fm);font-size:13px;color:var(--glacier);min-width:60px;text-align:center;">'+p.xp+'/'+p.xpMax+'</div><button class="gem-qty-btn" onclick="adjVal(\''+pid+'\',\'xp\',10)">+10</button></div></div>'
    +'</div>'
    +'<div class="fx mb16" style="gap:6px;">'
    +'<button class="btn btn-sm btn-red" onclick="adjVal(\''+pid+'\',\'xp\',-50)"><span>XP −50</span></button>'
    +'<button class="btn btn-sm btn-red" onclick="adjVal(\''+pid+'\',\'xp\',-100)"><span>XP −100</span></button>'
    +'<button class="btn btn-sm btn-grn" onclick="adjVal(\''+pid+'\',\'xp\',50)"><span>XP +50</span></button>'
    +'<button class="btn btn-sm btn-grn" onclick="adjVal(\''+pid+'\',\'xp\',100)"><span>XP +100</span></button>'
    +'</div>'
    +'<div style="font-family:var(--fd);font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--glacier-bright);margin-bottom:10px;border-bottom:1px solid var(--border);padding-bottom:6px;">Serment</div>'
    +'<div class="g2" style="margin-bottom:10px;">'
    +'<div><div class="flbl" style="margin-bottom:6px;">Niveau Serment</div><div style="display:flex;gap:6px;align-items:center;"><button class="gem-qty-btn" onclick="adjVal(\''+pid+'\',\'sLevel\',-1)">−</button><div id="adj-slvl" style="font-family:var(--fm);font-size:16px;color:var(--glacier-bright);min-width:32px;text-align:center;">'+p.sLevel+'</div><button class="gem-qty-btn" onclick="adjVal(\''+pid+'\',\'sLevel\',1)">+</button></div></div>'
    +'<div><div class="flbl" style="margin-bottom:6px;">XP Serment</div><div style="display:flex;gap:6px;align-items:center;"><button class="gem-qty-btn" onclick="adjVal(\''+pid+'\',\'sXp\',-5)">−5</button><div id="adj-sxp" style="font-family:var(--fm);font-size:13px;color:var(--glacier-bright);min-width:60px;text-align:center;">'+p.sXp+'/'+p.sXpMax+'</div><button class="gem-qty-btn" onclick="adjVal(\''+pid+'\',\'sXp\',5)">+5</button></div></div>'
    +'</div>'
    +'<div class="fx mb16" style="gap:6px;">'
    +'<button class="btn btn-sm btn-red" onclick="adjVal(\''+pid+'\',\'sXp\',-20)"><span>sXP −20</span></button>'
    +'<button class="btn btn-sm btn-red" onclick="adjVal(\''+pid+'\',\'sXp\',-50)"><span>sXP −50</span></button>'
    +'<button class="btn btn-sm btn-grn" onclick="adjVal(\''+pid+'\',\'sXp\',20)"><span>sXP +20</span></button>'
    +'<button class="btn btn-sm btn-grn" onclick="adjVal(\''+pid+'\',\'sXp\',50)"><span>sXP +50</span></button>'
    +'</div>'
    +'<div id="adj-fb" style="font-family:var(--fm);font-size:12px;min-height:18px;font-style:italic;"></div>'
    +'</div>'
    // Panel inventaire
    +'<div id="prog-inv2" class="prog-panel">'
    +((p.inventory||[]).filter(function(i){return i.qty>0;}).length
      ?'<div class="igrd">'+((p.inventory||[]).filter(function(i){return i.qty>0;})).map(function(i){return'<div class="iitm '+gc(i.name)+'"><div class="iiname">'+i.name+'</div><div class="iiqty">×'+i.qty+'</div></div>';}).join("")+'</div>'
      :'<p class="iempty">Inventaire vide.</p>')
    +'</div>'
    // Panel historique
    +'<div id="prog-hist2" class="prog-panel">'
    +'<div class="hist">'+([...(p.history||[])].reverse().slice(0,15).map(function(h){return'<div class="hent '+h.type+'"><span class="hdate">'+fdt(h.ts)+'</span><span class="htxt">'+h.text+'<br><span class="hby">'+h.by+'</span></span></div>';}).join("")||'<p style="color:var(--faint);font-style:italic;font-size:13px;">Aucun historique.</p>')+'</div>'
    +'</div>';

  _selGem=null;_gemQty=1;
}

function switchProgTab(tab){
  document.querySelectorAll(".prog-tab").forEach(function(t){t.classList.remove("active");});
  document.querySelectorAll(".prog-panel").forEach(function(p){p.classList.remove("active");});
  var el=ge("prog-"+tab);if(el)el.classList.add("active");
  var map={xp:0,serm:1,adj:2,inv2:3,hist2:4};
  var tabs=document.querySelectorAll(".prog-tab");
  if(tabs[map[tab]])tabs[map[tab]].classList.add("active");
  var modal=document.querySelector('#m-prog .modal, #m-view .modal');
  if(modal) modal.scrollTop=0;
}

// ==========================================
// LEVEL-UP
// ==========================================
var SERM_PALIERS=[{niv:2,nom:"Palier I — Éveil"},{niv:5,nom:"Palier II — Densité"},{niv:7,nom:"Palier III — Maîtrise"},{niv:10,nom:"Palier IV — Plénitude"}];
function xpReq(l){return l*30;}
function sxpReq(l){return l*10;}

function doLvlUp(p){
  var gained=[];
  while(p.xp>=p.xpMax){
    p.xp-=p.xpMax;p.level++;p.xpMax=xpReq(p.level);
    var s=SD[p.classe];if(s){p.pvMax+=s.pvN;p.pvCur=p.pvMax;p.epMax+=s.epN;p.epCur=p.epMax;p.emMax+=s.emN;p.emCur=p.emMax;}
    gained.push(p.level);
    p.history.push({ts:Date.now(),type:"level",text:"⬆ Niveau "+p.level+" ! PV:"+p.pvMax+" EP:"+p.epMax+" EM:"+p.emMax,by:"Système"});
  }
  return gained;
}

function doSLvlUp(p){
  var gained=[];
  while(p.sXp>=p.sXpMax){
    p.sXp-=p.sXpMax;p.sLevel++;p.sXpMax=sxpReq(p.sLevel);
    var pal=SERM_PALIERS.find(function(pl){return pl.niv===p.sLevel;});
    var msg="⬆ Serment Niv. "+p.sLevel+(pal?" — "+pal.nom+" débloqué !":"");
    gained.push({niv:p.sLevel,palier:pal?pal.nom:null});
    p.history.push({ts:Date.now(),type:"add",text:msg,by:"Système"});
  }
  return gained;
}

function updateXPPreview(pid){
  var mobSel=ge("xpp-mob");var partEl=ge("xpp-part");if(!mobSel||!partEl)return;
  var p=gpid(pid);if(!p)return;
  var part=parseInt(partEl.value)||0;
  var pv=ge("xpp-pv");if(pv)pv.textContent=part+"%";
  if(!mobSel.value){var g=ge("xpp-gain");var a=ge("xpp-after");if(g)g.textContent="—";if(a)a.textContent="Sélectionne un mob";return;}
  var selOpt=mobSel.options[mobSel.selectedIndex];
  var baseXP=parseInt(selOpt.getAttribute("data-xp"))||1;
  var xpGain=Math.ceil(baseXP*10*(part/100));
  var simXP=p.xp+xpGain;var simLvl=p.level;var simMax=p.xpMax;var lups=0;
  while(simXP>=simMax){simXP-=simMax;simLvl++;simMax=xpReq(simLvl);lups++;}
  var g=ge("xpp-gain");var a=ge("xpp-after");
  if(g)g.textContent="+"+xpGain+" XP"+(lups?" ⬆×"+lups:"");
  if(a)a.textContent=lups?"Niveau "+p.level+" → "+simLvl+" !":"XP : "+p.xp+" → "+(p.xp+xpGain)+" / "+p.xpMax;
}

function applyXP(pid){
  if(!can("manage_xp")){notif("Permission insuffisante.","err");return;}
  var p=gpid(pid);if(!p)return;
  var mobSel=ge("xpp-mob");var partEl=ge("xpp-part");if(!mobSel||!partEl)return;
  if(!mobSel.value){ge("xpp-err").textContent="Sélectionne un mob.";return;}
  var selOpt=mobSel.options[mobSel.selectedIndex];
  var baseXP=parseInt(selOpt.getAttribute("data-xp"))||1;
  var nom=selOpt.getAttribute("data-nom")||"mob";
  var part=parseInt(partEl.value)||0;
  var xpGain=Math.ceil(baseXP*10*(part/100));
  if(xpGain<=0){ge("xpp-err").textContent="XP = 0. Ajuste la participation.";return;}
  p.xp=(p.xp||0)+xpGain;p.history=p.history||[];
  p.history.push({ts:Date.now(),type:"xp",text:"+"+xpGain+" XP ("+nom+", "+part+"%)",by:"MJ "+CU.name});
  var gained=doLvlUp(p);up(p);
  var curEl=ge("xpp-cur");if(curEl)curEl.textContent=p.xp+" / "+p.xpMax+" XP";
  var msg=gained.length?"⬆ NIVEAU "+gained[gained.length-1]+" !":"XP attribué.";
  var ae=ge("xpp-after");if(ae)ae.textContent=msg;
  mobSel.value="";partEl.value="100";var pv2=ge("xpp-pv");if(pv2)pv2.textContent="100%";
  ge("xpp-err").textContent="";
  renderSPList();if(CU.pid===pid)renderView();
  if(gained.length)notif("⬆ "+esc(p.name)+" — Niveau "+gained[gained.length-1]+" !","ok");
  else notif("+"+xpGain+" XP → "+esc(p.name)+".","ok");
}

function selGem(type){
  _selGem=type;
  ["b","i","e"].forEach(function(t){var btn=ge("gbtn-"+t);if(btn)btn.className="gem-btn"+(t===type?" sel-"+t:"");});
  updateSermPreview();
}

function changeGemQty(delta){
  _gemQty=Math.max(1,Math.min(99,(_gemQty||1)+delta));
  var el=ge("gem-qty");if(el)el.textContent=_gemQty;
  updateSermPreview();
}

function updateSermPreview(){
  var pid=_progPid;if(!pid)return;
  var p=gpid(pid);if(!p)return;
  var type=_selGem;var qty=_gemQty||1;
  if(!type){var g=ge("sxpp-gain");var a=ge("sxpp-after");if(g)g.textContent="—";if(a)a.textContent="Sélectionne une gemme";return;}
  var xpG={b:5,i:20,e:50};var total=xpG[type]*qty;
  var simXP=p.sXp+total;var simLvl=p.sLevel;var simMax=p.sXpMax;var lups=0;var pals=[];
  while(simXP>=simMax){simXP-=simMax;simLvl++;simMax=sxpReq(simLvl);lups++;var pal=SERM_PALIERS.find(function(pl){return pl.niv===simLvl;});if(pal)pals.push(pal.nom);}
  var g=ge("sxpp-gain");var a=ge("sxpp-after");
  if(g)g.textContent="+"+total+" XP Serment"+(lups?" ⬆×"+lups:"");
  if(a)a.textContent=lups?"Serment Niv. "+p.sLevel+" → "+simLvl+(pals.length?" — "+pals[0]+" débloqué !":""):"XP Serment : "+p.sXp+" → "+(p.sXp+total)+" / "+p.sXpMax;
}

function applySermXP(pid){
  if(!CU||!can("manage_xp")){ return; }
  if(!can("manage_xp")){notif("Permission insuffisante.","err");return;}
  var p=gpid(pid);if(!p)return;
  var type=_selGem;var qty=_gemQty||1;
  if(!type){ge("sxpp-err").textContent="Sélectionne une gemme.";return;}
  var xpG={b:5,i:20,e:50};var gN={b:"Gemme Blanche",i:"Gemme Incarnate",e:"Gemme Écarlate"};
  var total=xpG[type]*qty;
  p.sXp=(p.sXp||0)+total;p.history=p.history||[];
  p.history.push({ts:Date.now(),type:"gemme",text:"+"+total+" XP Serment ("+qty+"× "+gN[type]+")",by:"MJ "+CU.name});
  var gained=doSLvlUp(p);up(p);
  var curEl=ge("sxpp-cur");if(curEl)curEl.textContent=p.sXp+" / "+p.sXpMax+" XP";
  var msg=gained.length?"⬆ Serment Niv. "+gained[gained.length-1].niv+(gained[gained.length-1].palier?" — "+gained[gained.length-1].palier:""):"XP Serment attribué.";
  var ae=ge("sxpp-after");if(ae)ae.textContent=msg;
  _selGem=null;_gemQty=1;
  var qEl=ge("gem-qty");if(qEl)qEl.textContent="1";
  ["b","i","e"].forEach(function(t){var btn=ge("gbtn-"+t);if(btn)btn.className="gem-btn";});
  ge("sxpp-err").textContent="";
  renderSPList();if(CU.pid===pid)renderView();
  if(gained.length)notif("⬆ Serment "+esc(p.name)+" — Niv. "+gained[gained.length-1].niv,"ok");
  else notif("+"+total+" XP Serment → "+esc(p.name)+".","ok");
}

function adjVal(pid,field,delta){
  if(!can("adjust_levels")){notif("Réservé à l'Admin.","err");return;}
  var p=gpid(pid);if(!p)return;
  var oldVal=p[field]||0;var newVal=Math.max(0,oldVal+delta);p[field]=newVal;
  if(field==="level"){p.level=Math.max(1,newVal);p.xpMax=xpReq(p.level);var s=SD[p.classe];if(s){p.pvMax=30+(p.level-1)*s.pvN;p.pvCur=Math.min(p.pvCur,p.pvMax);p.epMax=50+(p.level-1)*s.epN;p.epCur=Math.min(p.epCur,p.epMax);p.emMax=20+(p.level-1)*s.emN;p.emCur=Math.min(p.emCur,p.emMax);}}
  if(field==="sLevel"){p.sLevel=Math.max(1,newVal);p.sXpMax=sxpReq(p.sLevel);}
  p.history=p.history||[];var lbls={level:"Niv. perso",xp:"XP perso",sLevel:"Niv. Serment",sXp:"XP Serment"};
  p.history.push({ts:Date.now(),type:(delta<0?"remove":"add"),text:"Ajust. "+lbls[field]+" : "+oldVal+" → "+p[field],by:"MJ "+CU.name});
  sysLog("adj_"+field,"["+esc(p.name)+"] "+lbls[field]+" : "+oldVal+" → "+p[field]+" (Δ"+(delta>0?"+":"")+delta+")",CU.name);
  up(p);
  var lvlEl=ge("adj-lvl");if(lvlEl)lvlEl.textContent=p.level;
  var xpEl=ge("adj-xp");if(xpEl)xpEl.textContent=p.xp+"/"+p.xpMax;
  var slvlEl=ge("adj-slvl");if(slvlEl)slvlEl.textContent=p.sLevel;
  var sxpEl=ge("adj-sxp");if(sxpEl)sxpEl.textContent=p.sXp+"/"+p.sXpMax;
  var fb=ge("adj-fb");if(fb){fb.textContent=lbls[field]+" : "+oldVal+" → "+p[field];fb.style.color=delta>=0?"var(--green)":"var(--red)";clearTimeout(window._aft);window._aft=setTimeout(function(){if(fb)fb.textContent="";},2500);}
  renderSPList();if(CU.pid===pid)renderView();
}

// ==========================================
// PLAYER MGMT
// ==========================================
function popSSelects(){
  var nc=ge("np-c");if(!nc)return;
  nc.innerHTML='<option value="">— Choisir —</option>';
  Object.keys(SD).forEach(function(k){nc.innerHTML+='<option value="'+k+'">'+k+'</option>';});
}

async function addPlayer(){
  if(!CU||!can("manage_players")){ return; }
  var n=ge("np-n").value.trim();var c=ge("np-c").value;var av=ge("np-av").value.trim();
  if(!n||!c){ge("np-err").textContent="Nom et Serment obligatoires.";return;}
  var s=SD[c];
  var p={id:"p"+Date.now(),name:n,classe:c,level:1,xp:0,xpMax:30,pvCur:30,pvMax:30,epCur:50,epMax:50,emCur:20,emMax:20,avatar:av||"",arme:s?s.arme:"",sLevel:1,sXp:0,sXpMax:10,branch:"Aucune",equipment:{helmet:null,chest:null,legs:null},inventory:[],history:[]};
  var prev=gp().slice();
  var next=prev.concat([p]);
  try{
    await Promise.resolve(sp(next));
  }catch(e){
    _dbCache.players = prev;
    ge("np-err").textContent="Sauvegarde impossible en base.";
    notif("Création impossible : la base n'a pas enregistré le personnage.","err");
    return;
  }
  sysLog("personnage_cree","Personnage '"+n+"' ("+c+") créé",CU?CU.name:"Staff");
  closeModal("m-addp");ge("np-n").value="";ge("np-av").value="";ge("np-err").textContent="";renderNewPlayerAvatarDraft();
  renderSPList();notif(n+" ajouté.","ok");
}

function delP(id){
  if(!can("delete_player")){notif("Réservé à l'Admin.","err");return;}
  if(!confirm("Supprimer ce joueur ? Irréversible."))return;
  var victim=gpid(id);
  sysLog("personnage_supprime","Personnage '"+(victim?victim.name:id)+"' supprimé",CU?CU.name:"Staff");
  sp(gp().filter(function(p){return p.id!==id;}));
  if(ge("m-prog")) closeModal("m-prog");
  if(CU.pid===id){CU.pid=gp()[0]?gp()[0].id:null;if(CU.pid)renderView();}
  renderSPList();notif("Joueur supprimé.","inf");
}

// ==========================================
// ITEM MGMT
// ==========================================
function oAI(pid){
  if(!CU||!can("manage_items")){ return; }
  aiPid=pid;var p=gpid(pid);
  ge("m-addi-t").textContent="Joueur : "+(p?p.name:"");
  ge("ai-n").value="";ge("ai-q").value="1";ge("ai-note").value="";ge("ai-err").textContent="";
  openModal("m-addi");
}
function addItem(){
  if(!can("manage_items")){notif("Permission insuffisante.","err");return;}
  var p=gpid(aiPid);var n=ge("ai-n").value.trim();var c=ge("ai-c").value;var q=parseInt(ge("ai-q").value)||1;var note=ge("ai-note").value.trim();
  if(!n){ge("ai-err").textContent="Nom obligatoire.";return;}
  if(!p){ge("ai-err").textContent="Joueur introuvable.";return;}
  p.inventory=p.inventory||[];var ex=p.inventory.find(function(i){return i.name===n&&i.category===c;});
  if(ex){ex.qty+=q;}else{p.inventory.push({id:"i"+Date.now(),name:n,category:c,qty:q});}
  p.history=p.history||[];p.history.push({ts:Date.now(),type:"item",text:"Ajout : "+q+"× "+n+(note?" — "+note:""),by:"MJ "+CU.name});
  up(p);closeModal("m-addi");
  if(CU.pid===aiPid)renderView();
  renderSPList();notif(q+"× "+n+" → "+esc(p.name)+".","ok");
}
function oRI(pid){
  if(!CU||!can("manage_items")){ return; }
  riPid=pid;var p=gpid(pid);
  ge("m-remi-t").textContent="Joueur : "+(p?p.name:"");
  var sel=ge("ri-s");sel.innerHTML='<option value="">— Choisir —</option>';
  (p?p.inventory||[]:[]).filter(function(i){return i.qty>0;}).forEach(function(i){sel.innerHTML+='<option value="'+i.id+'">'+i.name+' (×'+i.qty+')</option>';});
  ge("ri-q").value="1";ge("ri-note").value="";ge("ri-err").textContent="";openModal("m-remi");
}
function removeItem(){
  if(!can("manage_items")){notif("Permission insuffisante.","err");return;}
  var p=gpid(riPid);var iid=ge("ri-s").value;var q=parseInt(ge("ri-q").value)||1;var note=ge("ri-note").value.trim();
  if(!iid){ge("ri-err").textContent="Choisis un item.";return;}
  var item=(p?p.inventory||[]:[]).find(function(i){return i.id===iid;});
  if(!item){ge("ri-err").textContent="Item introuvable.";return;}
  item.qty=Math.max(0,item.qty-q);p.history=p.history||[];
  p.history.push({ts:Date.now(),type:"item",text:"Retrait : "+q+"× "+esc(item.name)+(note?" — "+note:""),by:"MJ "+CU.name});
  up(p);closeModal("m-remi");
  if(CU.pid===riPid)renderView();
  renderSPList();notif(q+"× "+esc(item.name)+" retiré.","inf");
}

// ==========================================
// STATS EDITING
// ==========================================
function oES(pid){
  if(!can("manage_stats")){notif("Réservé à l'Admin.","err");return;}
  ePid=pid;var p=gpid(pid);if(!p)return;
  var s=getAllSD()[p.classe]||SD[p.classe];
  ge("m-edits-n").textContent=p.name+" — "+p.classe;
  ge("es-pvc").value=p.pvCur;
  ge("es-epc").value=p.epCur;
  ge("es-emc").value=p.emCur;
  // Max calculés automatiquement — affichage info
  ge("es-pvm").value=p.pvMax;ge("es-pvm").readOnly=true;ge("es-pvm").style.opacity=".6";ge("es-pvm").title="Calculé automatiquement selon le niveau";
  ge("es-epm").value=p.epMax;ge("es-epm").readOnly=true;ge("es-epm").style.opacity=".6";ge("es-epm").title="Calculé automatiquement selon le niveau";
  ge("es-emm").value=p.emMax;ge("es-emm").readOnly=true;ge("es-emm").style.opacity=".6";ge("es-emm").title="Calculé automatiquement selon le niveau";
  ge("es-niv").value=p.level;ge("es-xp").value=p.xp;
  ge("es-sniv").value=p.sLevel;ge("es-sxp").value=p.sXp;
  var eq=p.equipment||{helmet:null,chest:null,legs:null};
  ge("es-hel").value=eq.helmet||"";ge("es-che").value=eq.chest||"";ge("es-leg").value=eq.legs||"";
  var sd=SD[p.classe];var opts=ge("es-bropts");
  if(sd&&sd.bA&&sd.bB){
    var ch=[{v:"Aucune",l:"Aucune"},{v:sd.bA.nom,l:"A — "+sd.bA.style},{v:sd.bB.nom,l:"B — "+sd.bB.style}];
    opts.innerHTML=ch.map(function(o){return'<button type="button" class="bropt'+(p.branch===o.v?" sel":"")+'" data-val="'+o.v+'" onclick="selBr(this)">'+o.l+'</button>';}).join("");
  } else {opts.innerHTML='<span style="color:var(--dim);font-size:13px;font-style:italic;">Sans branches.</span>';}
  openModal("m-edits");
}
function selBr(btn){document.querySelectorAll(".bropt").forEach(function(b){b.classList.remove("sel");});btn.classList.add("sel");}
function saveStats(){
  if(!can("manage_stats")){notif("Réservé à l'Admin.","err");return;}
  var p=gpid(ePid);if(!p)return;
  var newLevel=parseInt(ge("es-niv").value)||1;
  var s=getAllSD()[p.classe]||SD[p.classe];

  // Recalculer pvMax/epMax/emMax selon le nouveau niveau
  if(s){
    p.pvMax=30+(newLevel-1)*s.pvN;
    p.epMax=50+(newLevel-1)*s.epN;
    p.emMax=20+(newLevel-1)*s.emN;
  } else {
    p.pvMax=parseInt(ge("es-pvm").value)||30;
    p.epMax=parseInt(ge("es-epm").value)||50;
    p.emMax=parseInt(ge("es-emm").value)||20;
  }

  // PV/EP/EM courants : valeur saisie, plafonnée au max
  p.pvCur=Math.min(parseInt(ge("es-pvc").value)||0, p.pvMax);
  p.epCur=Math.min(parseInt(ge("es-epc").value)||0, p.epMax);
  p.emCur=Math.min(parseInt(ge("es-emc").value)||0, p.emMax);

  p.level=newLevel;p.xp=parseInt(ge("es-xp").value)||0;p.xpMax=xpReq(p.level);
  p.sLevel=parseInt(ge("es-sniv").value)||1;p.sXp=parseInt(ge("es-sxp").value)||0;p.sXpMax=sxpReq(p.sLevel);
  var sb2=document.querySelector(".bropt.sel");p.branch=sb2?sb2.getAttribute("data-val"):(p.branch||"Aucune");
  p.equipment={helmet:ge("es-hel").value.trim()||null,chest:ge("es-che").value.trim()||null,legs:ge("es-leg").value.trim()||null};
  p.history=p.history||[];p.history.push({ts:Date.now(),type:"stat",text:"Stats mises à jour — Niveau "+p.level+" (PV:"+p.pvMax+" EP:"+p.epMax+" EM:"+p.emMax+")",by:CU.name});
  sysLog("stats_modif","Stats de '"+esc(p.name)+"' modifiées — Niv."+p.level+" PV:"+p.pvCur+"/"+p.pvMax+" EP:"+p.epCur+"/"+p.epMax+" EM:"+p.emCur+"/"+p.emMax,CU.name);
  up(p);closeModal("m-edits");
  if(CU.pid===ePid||_viewPid===ePid)renderView();
  renderSPList();notif("Stats de "+esc(p.name)+" sauvegardées.","ok");
}

// ==========================================
// BESTIAIRE
// ==========================================
function addBeast(){
  if(!can("manage_beasts")){notif("Permission insuffisante.","err");return;}
  var n=ge("ab-n").value.trim();if(!n)return;
  var behArr=["","Gibier","Passif","Neutre","Agressif","Très agressif"];
  var b={id:"b"+Date.now(),nom:n,sub:(ge("ab-sub")?ge("ab-sub").value.trim():""),beh:behArr[parseInt(ge("ab-beh").value,10)||3]||"Neutre",niv:(ge("ab-niv")?(parseInt(ge("ab-niv").value)||1):1),pv:parseInt(ge("ab-pv").value)||20,ep:parseInt(ge("ab-ep").value)||20,img:ge("ab-img").value.trim(),zones:_beastZoneInputValues("ab-zones"),frappe:ge("ab-fr").value.trim(),comp:ge("ab-co").value.trim(),drops:ge("ab-dr").value.trim(),gem:ge("ab-gm").value.trim(),desc:ge("ab-de").value.trim(),adminNote:(ge("ab-note")&&ge("ab-note").value||'').trim(),hidden:!!(ge("ab-hidden")&&ge("ab-hidden").checked),archived:!!(ge("ab-archived")&&ge("ab-archived").checked),createdAt:Date.now(),updatedAt:Date.now()};
  var bs=gb();bs.unshift(b);sb(bs);closeModal("m-addb");
  ["ab-n","ab-sub","ab-fr","ab-co","ab-dr","ab-gm","ab-de","ab-img","ab-zones","ab-note"].forEach(function(id){if(ge(id)) ge(id).value="";}); if(ge("ab-niv")) ge("ab-niv").value=1; if(ge("ab-hidden")) ge("ab-hidden").checked=false; if(ge("ab-archived")) ge("ab-archived").checked=false;
  renderBGrid("p-bgrd",!!(CU&&can("manage_beasts")));notif(n+" ajouté.","ok");
}
function openEditBeast(id){
  if(!CU||!can("manage_beasts")){ notif("Non autorisé.","err"); return; }
  if(!can("manage_beasts")){notif("Non autorisé.","err");return;}
  var b=gb().find(function(x){return x.id===id;});
  if(!b) return;
  var behMap={"Gibier":"1","Passif":"2","Neutre":"3","Agressif":"4","Très agressif":"5"};
  ge("eb-id").value=b.id;
  ge("eb-n").value=b.nom||"";
  ge("eb-sub").value=b.sub||"";
  ge("eb-beh").value=behMap[b.beh]||"3";
  ge("eb-niv").value=b.niv||1;
  ge("eb-pv").value=b.pv||"";
  ge("eb-ep").value=b.ep||"";
  ge("eb-fr").value=b.frappe||"";
  ge("eb-co").value=b.comp||"";
  ge("eb-dr").value=b.drops||"";
  ge("eb-gm").value=b.gem||"";
  ge("eb-de").value=b.desc||"";
  ge("eb-img").value=b.img||"";
  if(ge("eb-zones")) ge("eb-zones").value=(Array.isArray(b.zones)?b.zones:[]).join(", ");
  if(ge("eb-note")) ge("eb-note").value=b.adminNote||"";
  if(ge("eb-hidden")) ge("eb-hidden").checked=!!b.hidden;
  if(ge("eb-archived")) ge("eb-archived").checked=!!b.archived;
  ge("eb-err").textContent="";
  var modalEl=ge("m-editb");
  if(modalEl) _hoistModalToRoot(modalEl);
  openModal("m-editb");
}
function saveEditBeast(){
  if(!CU||!can("manage_beasts")){ return; }
  if(!can("manage_beasts")){notif("Non autorisé.","err");return;}
  var id=ge("eb-id").value;
  var beasts=gb();
  var b=beasts.find(function(x){return x.id===id;});
  if(!b){ge("eb-err").textContent="Créature introuvable.";return;}
  var behArr=["","Gibier","Passif","Neutre","Agressif","Très agressif"];
  b.nom=ge("eb-n").value.trim()||b.nom;
  b.sub=ge("eb-sub").value.trim();
  b.beh=behArr[parseInt(ge("eb-beh").value)]||b.beh;
  b.niv=parseInt(ge("eb-niv").value)||b.niv;
  b.pv=parseInt(ge("eb-pv").value)||b.pv;
  b.ep=parseInt(ge("eb-ep").value)||b.ep;
  b.frappe=ge("eb-fr").value.trim()||b.frappe;
  b.comp=ge("eb-co").value.trim();
  b.drops=ge("eb-dr").value.trim();
  b.gem=ge("eb-gm").value.trim();
  b.desc=ge("eb-de").value.trim();
  b.img=ge("eb-img").value.trim();
  b.zones=_beastZoneInputValues("eb-zones");
  b.adminNote=(ge("eb-note")&&ge("eb-note").value||'').trim();
  b.hidden=!!(ge("eb-hidden")&&ge("eb-hidden").checked);
  b.archived=!!(ge("eb-archived")&&ge("eb-archived").checked);
  if(!b.createdAt) b.createdAt=Date.now();
  b.updatedAt=Date.now();
  sb(beasts);
  closeModal("m-editb");
  renderBGrid("p-bgrd",true);
  notif(b.nom+" mis à jour.","ok");
  if(_beastZoneReturnAfterEdit){
    var returnZone=_beastZoneReturnAfterEdit;
    _beastZoneReturnAfterEdit='';
    openBeastZoneManager(returnZone);
  }
}

function delBeast(id){
  archiveBeast(id);
}

// ==========================================
// MJ
// ==========================================
function delMJ(accountId){
  if(!can("manage_mjs")){notif("Réservé à l'Admin.","err");return;}
  var a=getAccounts().find(function(x){return x.id===accountId;});
  if(!a){notif("Compte introuvable.","err");return;}
  if(!confirm("Supprimer le compte '"+esc(a.pseudo)+"' ?"))return;
  _authCall({action:"admin_delete_account", accountId:accountId}).then(function(r){
    if(!r||!r.ok){ notif((r&&r.error)||"Impossible de supprimer ce compte.","err"); return; }
    _refreshPrivateCaches().then(function(){ renderMJList(); notif("Compte supprimé.","inf"); });
  }).catch(function(){ notif("Erreur réseau.","err"); });
}



function setMJRole(accountId,role){
  if(!can("manage_mjs")){notif("Réservé à l'Admin.","err");return;}
  _authCall({action:"admin_set_role", accountId:accountId, role:role}).then(function(r){
    if(!r||!r.ok){ notif((r&&r.error)||"Impossible de changer ce rôle.","err"); return; }
    _refreshPrivateCaches().then(function(){ renderMJList(); notif("Rôle mis à jour.","ok"); });
  }).catch(function(){ notif("Erreur réseau.","err"); });
}



function setMJPid(accountId,pid){
  if(!can("manage_mjs")){notif("Réservé à l'Admin.","err");return;}
  _authCall({action:"admin_set_pid", accountId:accountId, pid:pid||null}).then(function(r){
    if(!r||!r.ok){ notif((r&&r.error)||"Impossible de modifier la liaison.","err"); return; }
    _refreshPrivateCaches().then(function(){ var p=pid?gpid(pid):null; var a=getAccounts().find(function(x){return x.id===accountId;}); notif((a?a.pseudo:'Compte')+(p?" lié à "+p.name:" délié."),"ok"); renderMJList(); });
  }).catch(function(){ notif("Erreur réseau.","err"); });
}



var _adminAccountSearch="";
var _adminAccountRoleFilter="all";
function setAdminAccountSearch(v){
  _adminAccountSearch=String(v||"");
  renderMJList();
}
function setAdminAccountRoleFilter(v){
  _adminAccountRoleFilter=String(v||"all");
  renderMJList();
}

function renderMJList(){
  if(!isAdminRole(CU)){ return; }
  var el=ge("mjlist");if(!el)return;
  var accounts=getAccounts();
  var players=gp();
  var roleCols={admin:"var(--red)",mj:"var(--gold)",designer:"var(--purple)",joueur:"var(--glacier-dim)"};
  var q=String(_adminAccountSearch||"").trim().toLowerCase();
  var rf=String(_adminAccountRoleFilter||"all");
  var admins=accounts.filter(function(x){return x.role==="admin";});
  var filtered=accounts.filter(function(a){
    var role=a.role||"joueur";
    if(rf!=="all"&&role!==rf) return false;
    if(!q) return true;
    var linked=a.pid?players.find(function(p){return p.id===a.pid;}):null;
    return String(a.pseudo||"").toLowerCase().indexOf(q)>=0
      || String(role||"").toLowerCase().indexOf(q)>=0
      || String(linked&&linked.name||"").toLowerCase().indexOf(q)>=0;
  });
  var counts={all:accounts.length,admin:0,mj:0,designer:0,joueur:0};
  accounts.forEach(function(a){ var r=a.role||"joueur"; if(counts[r]!=null) counts[r]++; });

  var toolbar='<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px;">'
    +'<input type="search" value="'+esc(_adminAccountSearch)+'" oninput="setAdminAccountSearch(this.value)" placeholder="Rechercher pseudo, rôle, personnage…" style="flex:1;min-width:220px;padding:9px 11px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);">'
    +'<select onchange="setAdminAccountRoleFilter(this.value)" style="padding:9px 11px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);">'
      +['all','admin','mj','designer','joueur'].map(function(r){
        var label={all:'Tous',admin:'Admins',mj:'MJ',designer:'Designers',joueur:'Joueurs'}[r];
        var n=counts[r]||0;
        return '<option value="'+r+'"'+(rf===r?' selected':'')+'>'+label+' ('+n+')</option>';
      }).join('')
    +'</select>'
    +'<button class="btn btn-sm" onclick="_refreshPrivateCaches().then(function(){renderMJList();notif(\'Comptes rechargés.\',\'ok\');})"><span>Actualiser</span></button>'
  +'</div>';

  if(!filtered.length){
    el.innerHTML=toolbar+'<div style="padding:18px;border:1px solid var(--border);background:var(--bg3);color:var(--dim);font-style:italic;">Aucun compte ne correspond au filtre.</div>';
    return;
  }

  el.innerHTML=toolbar+filtered.map(function(m){
    var role=m.role||"joueur";
    var roleCol=roleCols[role]||"var(--dim)";
    var roleLabel=ROLE_LABELS[role]||role;
    var linkedP=m.pid?players.find(function(p){return p.id===m.pid;}):null;
    var isLastAdmin=role==="admin"&&admins.length<=1;
    var pending=role==="joueur"&&!m.pid;
    var forced=!!m.forcePasswordReset;

    var roleSwitches=isLastAdmin
      ?'<span style="font-size:14px;color:var(--faint);font-style:italic;">Compte Admin principal</span>'
      :['joueur','mj','designer','admin'].map(function(r){
          var active=role===r;var rc=roleCols[r]||"var(--dim)";
          var rLabel={joueur:"Joueur",mj:"MJ",designer:"Designer",admin:"Admin"}[r];
          return'<button onclick="setMJRole(\''+m.id+'\',\''+r+'\')" style="padding:5px 10px;font-family:var(--fd);font-size:12px;letter-spacing:1px;text-transform:uppercase;cursor:pointer;border:1px solid '+(active?rc:'var(--border2)')+';background:'+(active?'rgba(0,0,0,0.2)':'transparent')+';color:'+(active?rc:'var(--dim)')+';transition:all .2s;">'+rLabel+'</button>';
        }).join("");

    var pidSel='<select onchange="setMJPid(\''+m.id+'\',this.value)" style="flex:1;font-size:13px;padding:6px 10px;">';
    pidSel+='<option value="">— Aucun personnage lié —</option>';
    players.forEach(function(p){
      pidSel+='<option value="'+p.id+'"'+(m.pid===p.id?' selected':'')+'>'+esc(p.name)+' — '+esc(p.classe)+'</option>';
    });
    pidSel+='</select>';

    return'<div style="padding:14px 0;border-bottom:1px solid var(--border);">'
      +'<div class="fx" style="margin-bottom:8px;">'
        +'<div style="flex:1;">'
          +'<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:3px;">'
            +'<span style="font-family:var(--fd);font-size:13px;letter-spacing:1px;">'+esc(m.pseudo)+'</span>'
            +'<span style="font-family:var(--fd);font-size:9px;letter-spacing:1px;text-transform:uppercase;color:'+roleCol+';border:1px solid '+roleCol+';padding:2px 6px;">'+esc(roleLabel)+'</span>'
            +(pending?'<span style="font-size:10px;color:var(--gold);">En attente de liaison</span>':'')
            +(forced?'<span style="font-size:10px;color:var(--red);">Reset requis</span>':'')
          +'</div>'
      +(linkedP?'<div style="font-size:14px;color:var(--green);">⇔ '+esc(linkedP.name)+' — '+esc(linkedP.classe)+'</div>':'<div style="font-size:14px;color:var(--faint);font-style:italic;">Aucun personnage</div>')
        +'</div>'
        +'<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;">'
          +'<button class="btn btn-sm" onclick="resetAccountPass(\''+m.id+'\')"><span>Reset</span></button>'
          +'<button class="btn btn-sm" onclick="openEditPassSafe(\''+m.id+'\',\''+encodeURIComponent(m.pseudo||'')+'\')"><span>MDP</span></button>'
          +(!isLastAdmin?'<button class="btn btn-sm btn-red" onclick="delMJ(\''+m.id+'\')"><span>Suppr.</span></button>':'')
        +'</div>'
      +'</div>'
      +'<div class="fx" style="gap:6px;margin-bottom:8px;">'+roleSwitches+'</div>'
      +'<div class="fx" style="gap:6px;align-items:center;">'
        +'<span style="font-family:var(--fd);font-size:12px;letter-spacing:1px;color:var(--dim);text-transform:uppercase;white-space:nowrap;">Personnage</span>'
        +pidSel
      +'</div>'
    +'</div>';
  }).join("");
}

// ==========================================
// INIT ASYNC
// ==========================================
function _removeLoader(){
  var l=document.getElementById("db-loader");
  if(l){ l.style.display="none"; try{l.remove();}catch(e){} }
}

// Loader démarrage
var _loaderEl=document.createElement("div");
_loaderEl.id="db-loader";
_loaderEl.style.cssText="position:fixed;inset:0;background:#09090f;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;";
_loaderEl.innerHTML='<svg viewBox="0 0 100 100" width="48" height="48" style="margin-bottom:20px;opacity:.8;"><circle cx="50" cy="50" r="40" fill="none" stroke="#7eb8d4" stroke-width="1" opacity=".2"/><path d="M50,10 L55,38 L50,44 L45,38 Z" fill="#7eb8d4"/><path d="M90,50 L62,55 L56,50 L62,45 Z" fill="#7eb8d4"/><path d="M50,90 L55,62 L50,56 L45,62 Z" fill="#7eb8d4"/><path d="M10,50 L38,55 L44,50 L38,45 Z" fill="#7eb8d4"/><rect x="44" y="44" width="12" height="12" fill="#09090f" stroke="#7eb8d4" stroke-width="1" transform="rotate(45,50,50)"/><rect x="47" y="47" width="6" height="6" fill="#7eb8d4" transform="rotate(45,50,50)"/></svg>'
  +'<div style="font-family:\'Cinzel\',serif;font-size:14px;letter-spacing:4px;color:#4a7d96;text-transform:uppercase;">Connexion...</div>';
document.body.appendChild(_loaderEl);

// Masquage DOM préventif des éléments staff — supprimés si pas de token JWT
// Les classes CSS staff-only existent déjà mais sont DOM-accessible
// On les retire du DOM si pas de session
(function(){
  try{
    // Retirer les éléments staff du DOM au boot — toujours
    // Ils seront réinjectés depuis <template> si auth staff confirmée
    document.querySelectorAll(".staff-only, #drawer-staff-section").forEach(function(el){
      el.parentNode && el.parentNode.removeChild(el);
    });
  }catch(e){}
})();

_dbBootstrap().then(function() {
  try {
    // Purger les clés privées du localStorage au boot
    // Le cookie httpOnly n'est pas lisible en JS — on purge systématiquement
    // Elles seront rechargées depuis la DB si le cookie est valide (get_all filtre côté serveur)
    ["accounts","players"].forEach(function(k){
      try{ localStorage.removeItem("np_"+k); }catch(e){}
    });
    // Données publiques disponibles sans auth (bestiaire, etc.)
    _initPublicData();
    // _tryAutoLogin est maintenant async — vérifie le cookie httpOnly via le serveur
    _tryAutoLogin().then(function(loggedIn){
      if(loggedIn){
        // initStorage() sera appelé par launchApp()
        _removeLoader();
        launchApp();
        setTimeout(function(){ updateHdrProfile(); }, 200);
      } else {
        _removeLoader();
        initHomePage();
        // Pas de bannière hors-ligne pour les visiteurs anonymes
        requestAnimationFrame(function(){
          requestAnimationFrame(function(){
            var home=ge("s-home");
            if(home) home.classList.add("screen-enter");
          });
        });
      }
    }).catch(function(err){
      console.error("Erreur auto-login:", err);
      _removeLoader();
      initHomePage();
    });
  } catch(err) {
    console.error('Erreur au démarrage:', err);
    _removeLoader();
    // Purger le cache en cas d'erreur au boot pour éviter un état corrompu
    _dbCache = Object.create(null);
    ["accounts","players"].forEach(function(k){
      try{ localStorage.removeItem("np_"+k); }catch(e2){}
    });
    var home=ge("s-home");
    if(home){ home.classList.add("active"); home.classList.add("screen-enter"); }
  }
});
document.querySelectorAll(".moverlay").forEach(function(o){
  o.addEventListener("click",function(e){
    if(e.target!==o) return;
    // m-edits : ne pas fermer au clic dehors — seulement via ✕ ou Sauvegarder
    if(o.id==="m-edits"){
      _editsBackdropWarning();
      return;
    }
    o.classList.remove("open");
  });
});

// ==========================================
// RECHERCHE GLOBALE
// ==========================================
// ==========================================
// NOTIFICATIONS
// ==========================================
var _notifPanelOpen=false;

function _getNotifDeleted(pid){
  var p=gpid(pid); return p?(p.notifDeleted||[]):[];
}
function _saveNotifDeleted(pid,arr){
  var p=gpid(pid); if(!p) return;
  p.notifDeleted=arr;
  up(p);
}

function getPlayerNotifs(pid){
  var p=gpid(pid); if(!p) return [];
  var deleted=_getNotifDeleted(pid);
  var hist=p.history||[];
  return hist.filter(function(h){
    return deleted.indexOf(h.ts)===-1;
  }).sort(function(a,b){return b.ts-a.ts;}).slice(0,50);
}

function deleteNotif(pid,ts){
  var deleted=_getNotifDeleted(pid);
  if(deleted.indexOf(ts)===-1) deleted.push(ts);
  // Garder max 200 entrées
  if(deleted.length>200) deleted=deleted.slice(-200);
  _saveNotifDeleted(pid,deleted);
  updateNotifBadge();
  renderNotifPanel();
}

function clearAllNotifs(pid){
  var p=gpid(pid); if(!p) return;
  var allTs=(p.history||[]).map(function(h){return h.ts;});
  _saveNotifDeleted(pid,allTs);
  updateNotifBadge();
  renderNotifPanel();
  notif("Notifications effacées.","ok");
}

function notifType(n){
  var t=n.text||"";
  if(t.indexOf("Niveau")>-1||t.indexOf("⬆")>-1) return {icon:"⬆",col:"var(--gold)",label:"Niveau"};
  if(t.indexOf("Gemme")>-1||t.indexOf("gemme")>-1) return {icon:"💎",col:"var(--purple)",label:"Gemme"};
  if(t.indexOf("Combat")>-1||t.indexOf("combat")>-1||t.indexOf("PV:")>-1) return {icon:"⚔",col:"var(--red)",label:"Combat"};
  if(t.indexOf("XP")>-1||t.indexOf("xp")>-1) return {icon:"✦",col:"var(--glacier)",label:"XP"};
  if(n.type==="add") return {icon:"+",col:"var(--green)",label:"Ajout"};
  if(n.type==="remove") return {icon:"−",col:"var(--red)",label:"Retrait"};
  if(n.type==="consume") return {icon:"◎",col:"var(--gold)",label:"Consommation"};
  return {icon:"·",col:"var(--faint)",label:""};
}

function updateNotifBadge(){
  var badge=ge("notif-count"); if(!badge) return;
  var total=0;
  // Notifs joueur
  if(CU&&CU.pid) total+=getPlayerNotifs(CU.pid).length;
  // Comptes en attente (admin/MJ)
  if(can("manage_mjs")){
    var pending=getAccounts().filter(function(a){return (a.role==="joueur"||!a.role)&&!a.pid;}).length;
    total+=pending;
  }
  if(total>0){
    badge.textContent=total>9?"9+":total;
    badge.style.display="flex";
  } else {
    badge.style.display="none";
  }
}

function toggleNotifPanel(){
  _notifPanelOpen=!_notifPanelOpen;
  var panel=ge("notif-panel"); if(!panel) return;
  if(_notifPanelOpen){
    renderNotifPanel();
    panel.style.display="block";
    // NE PAS auto-marquer comme lus — le joueur gère manuellement
  } else {
    panel.style.display="none";
  }
}

// ==========================================
// NAVIGATION DROPDOWN
// ==========================================
var _openDrop=null;
var _navDropRoot=null;
function _ensureNavDropRoot(){
  if(_navDropRoot && document.body && document.body.contains(_navDropRoot)) return _navDropRoot;
  _navDropRoot = ge("nav-dropdown-root");
  if(!_navDropRoot){
    _navDropRoot = document.createElement("div");
    _navDropRoot.id = "nav-dropdown-root";
    _navDropRoot.style.position = "fixed";
    _navDropRoot.style.inset = "0";
    _navDropRoot.style.pointerEvents = "none";
    _navDropRoot.style.zIndex = "10135";
    _navDropRoot.addEventListener("click", function(e){
      if(e.target === _navDropRoot) try{ _closeAllNavDrops(); }catch(_e){}
    });
    document.body.appendChild(_navDropRoot);
  }
  return _navDropRoot;
}
function _setNavDropLayerActive(active){
  var root = _ensureNavDropRoot();
  if(root) root.style.pointerEvents = active ? "auto" : "none";
}
function _restoreNavDrop(menu){
  if(!menu) return;
  var ownerId = menu.dataset.ownerDrop || "";
  var host = ownerId ? ge(ownerId) : null;
  if(host && menu.parentNode !== host) host.appendChild(menu);
  menu.classList.remove("portal-open");
  menu.removeAttribute("data-floating");
  ["position","top","left","right","bottom","min-width","max-width","max-height","margin","pointer-events","visibility","overflow-y","transform-origin"].forEach(function(prop){
    try{ menu.style.removeProperty(prop); }catch(_e){}
  });
  try{
    menu.style.removeProperty('--np-nav-menu-left');
    menu.style.removeProperty('--np-nav-menu-top');
  }catch(_e){}
}
function _closeAllNavDrops(){
  document.querySelectorAll(".nav-dropdown-menu.open,.nav-group-menu.open").forEach(function(m){
    m.classList.remove("open");
    _restoreNavDrop(m);
  });
  document.querySelectorAll(".nav-dropdown-btn.open,.nav-group-btn.open").forEach(function(b){b.classList.remove("open");});
  _openDrop=null;
  _setNavDropLayerActive(false);
}
function _positionNavDrop(ddId){
  var wrap=ge(ddId);
  var menu=ge(ddId+"-menu");
  var btn=ge(ddId+"-btn");
  if(!wrap||!menu||!btn) return;
  var rect=btn.getBoundingClientRect();
  var header=document.querySelector(".app-header") || document.querySelector(".hdr") || document.querySelector("header");
  var hrect=header ? header.getBoundingClientRect() : null;
  var gap=2;
  var vw=window.innerWidth||document.documentElement.clientWidth||0;
  var vh=window.innerHeight||document.documentElement.clientHeight||0;
  var headerBottom=hrect ? Math.round(hrect.bottom) : Math.round(rect.bottom);
  menu.style.position='fixed';
  menu.style.right='auto';
  menu.style.bottom='auto';
  menu.style.left='0px';
  menu.style.top='0px';
  menu.style.minWidth=Math.max(220, Math.ceil(rect.width))+'px';
  menu.style.maxWidth='min(320px, calc(100vw - 16px))';
  menu.style.maxHeight='calc(100vh - 16px - '+Math.max(0, headerBottom + gap)+'px)';
  menu.style.visibility='hidden';
  void menu.offsetWidth;
  var mr=menu.getBoundingClientRect();
  var mw=Math.max(menu.offsetWidth||Math.round(mr.width)||0,220);
  var left=Math.round(rect.left);
  if(left + mw > vw - 8) left=Math.max(8, vw - mw - 8);
  if(left < 8) left=8;
  var top=Math.max(8, Math.min(vh - 8, headerBottom + gap));
  menu.style.left=left+'px';
  menu.style.top=top+'px';
  menu.style.setProperty('--np-nav-menu-left', left+'px');
  menu.style.setProperty('--np-nav-menu-top', top+'px');
  menu.style.visibility='';
}
function _scheduleNavDropPosition(ddId){
  var place=function(){
    var menu=ge(ddId+"-menu");
    if(!menu||!menu.classList.contains("open")) return;
    try{ _positionNavDrop(ddId); }catch(_e){}
  };
  place();
  if(typeof requestAnimationFrame==="function"){
    requestAnimationFrame(function(){
      place();
      requestAnimationFrame(place);
    });
  } else {
    setTimeout(place,0);
    setTimeout(place,16);
  }
  setTimeout(place,80);
}
function toggleNavDrop(ddId){
  var menu=ge(ddId+"-menu");
  var btn=ge(ddId+"-btn");
  if(!menu) return;
  var isOpen=menu.classList.contains("open");
  _closeAllNavDrops();
  if(!isOpen){
    var root=_ensureNavDropRoot();
    menu.dataset.ownerDrop=ddId;
    if(root && menu.parentNode!==root) root.appendChild(menu);
    _setNavDropLayerActive(true);
    menu.style.pointerEvents='auto';
    menu.classList.add("portal-open");
    menu.classList.add("open");
    if(btn) btn.classList.add("open");
    _openDrop=ddId;
    _scheduleNavDropPosition(ddId);
  }
}

function switchDropTab(id,item,ddId){
  // Fermer le dropdown
  var menu=ge(ddId+"-menu"); var btn=ge(ddId+"-btn");
  try{ _closeAllNavDrops(); }catch(_e){ if(menu){ menu.classList.remove("open"); _restoreNavDrop(menu); } if(btn){ btn.classList.remove("open"); } _openDrop=null; }
  // Marquer l'item actif
  document.querySelectorAll(".nav-dropdown-item.active").forEach(function(i){i.classList.remove("active");});
  if(item) item.classList.add("active");
  // Mettre le label du dropdown
  var btnLabel=item?item.textContent.replace("✓","").trim():"";
  // Activer le dropdown parent si l'item est actif
  document.querySelectorAll(".nav-dropdown-btn.has-active").forEach(function(b){b.classList.remove("has-active");});
  if(btn) btn.classList.add("has-active");
  try{ if(document.activeElement && typeof document.activeElement.blur==='function') document.activeElement.blur(); }catch(_e){}
  // switchTab normal
  switchTab(id, null);
  if(id==="bestiaire"){
    setTimeout(function(){ try{ _focusOnScreen(ge("bestiaire"), 'auto'); }catch(_e){} }, 0);
    setTimeout(function(){ try{ _focusOnScreen(ge("bestiaire"), 'smooth'); }catch(_e){} }, 80);
    setTimeout(function(){ try{ _focusOnScreen(ge("bestiaire"), 'auto'); }catch(_e){} }, 220);
  }
}

// Fermer dropdown au clic dehors
document.addEventListener("click",function(e){
  if(_openDrop&&!e.target.closest(".nav-dropdown")&&!e.target.closest(".nav-dropdown-menu")){
    try{ _closeAllNavDrops(); }catch(_e){}
  }
  if(_notifPanelOpen&&!e.target.closest("#notif-bell")&&!e.target.closest("#notif-panel")){
    _notifPanelOpen=false;
    var panel=ge("notif-panel"); if(panel) panel.style.display="none";
  }
});
window.addEventListener("resize", function(){ if(_openDrop) { try{ _positionNavDrop(_openDrop); }catch(_e){} } });
window.addEventListener("scroll", function(){ if(_openDrop) { try{ _positionNavDrop(_openDrop); }catch(_e){} } }, true);

function renderNotifPanel(){

  var panel=ge("notif-panel"); if(!panel) return;
  if(!CU||!CU.pid){ panel.innerHTML='<div style="padding:16px;font-size:13px;color:var(--faint);">Non connecté.</div>'; return; }
  var pid=CU.pid;
  var notifs=getPlayerNotifs(pid);
  var pendingAccounts=[];
  if(can("manage_mjs")){
    pendingAccounts=getAccounts().filter(function(a){return (a.role==="joueur"||!a.role)&&!a.pid;});
  }

  var h='<div style="padding:10px 14px;border-bottom:0.5px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:8px;">';
  h+='<span style="font-family:var(--fd);font-size:9px;letter-spacing:2px;color:var(--glacier);">NOTIFICATIONS</span>';
  if(notifs.length>0){
    h+='<button onclick="clearAllNotifs(\''+pid+'\')" style="background:transparent;border:0.5px solid rgba(201,74,74,.35);color:rgba(201,74,74,.7);font-family:var(--fd);font-size:7px;letter-spacing:2px;padding:3px 8px;cursor:pointer;transition:all .15s;" onmouseover="this.style.borderColor=\'var(--red)\';this.style.color=\'var(--red)\'" onmouseout="this.style.borderColor=\'rgba(201,74,74,.35)\';this.style.color=\'rgba(201,74,74,.7)\'">TOUT EFFACER</button>';
  }
  h+='</div>';

  // Section comptes en attente (staff)
  if(pendingAccounts.length>0){
    h+='<div style="border-bottom:0.5px solid var(--border);">';
    h+='<div style="padding:7px 14px 5px;font-family:var(--fd);font-size:7px;letter-spacing:3px;color:var(--gold);background:rgba(201,160,76,.05);">EN ATTENTE DE LIAISON</div>';
    pendingAccounts.forEach(function(a){
      h+='<div onclick="goToPending();toggleNotifPanel();" style="padding:9px 14px;display:flex;align-items:center;gap:10px;cursor:pointer;transition:background .15s;border-bottom:0.5px solid var(--border);" onmouseover="this.style.background=\'rgba(201,160,76,.06)\'" onmouseout="this.style.background=\'\'">';
      h+='<div style="width:26px;height:26px;border-radius:50%;background:rgba(201,160,76,.15);border:0.5px solid rgba(201,160,76,.4);display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;">⏳</div>';
      h+='<div style="flex:1;min-width:0;">';
      h+='<div style="font-size:12px;color:var(--text);">'+escHtml(a.pseudo)+'</div>';
      h+='<div style="font-size:10px;color:var(--faint);margin-top:1px;">Sans personnage lié · Cliquer pour lier</div>';
      h+='</div>';
      h+='<span style="font-family:var(--fd);font-size:7px;letter-spacing:2px;padding:2px 6px;background:rgba(201,160,76,.15);border:0.5px solid rgba(201,160,76,.35);color:var(--gold);flex-shrink:0;">NEW</span>';
      h+='</div>';
    });
    h+='</div>';
  }

  // Notifs joueur
  if(!notifs.length&&!pendingAccounts.length){
    h+='<div style="padding:24px 14px;text-align:center;">';
    h+='<div style="font-size:22px;margin-bottom:8px;opacity:.25;">🔔</div>';
    h+='<div style="font-size:12px;color:var(--faint);font-style:italic;">Aucune notification.</div>';
    h+='</div>';
  } else if(notifs.length>0){
    if(pendingAccounts.length>0){
      h+='<div style="padding:7px 14px 5px;font-family:var(--fd);font-size:7px;letter-spacing:3px;color:var(--glacier);background:rgba(126,184,212,.03);">ACTIVITÉ</div>';
    }
    h+='<div style="max-height:360px;overflow-y:auto;">';
    notifs.forEach(function(n){
      var nt=notifType(n);
      h+='<div style="padding:10px 14px;border-bottom:0.5px solid var(--border);display:flex;gap:10px;align-items:flex-start;transition:background .15s;" onmouseover="this.style.background=\'rgba(126,184,212,.03)\'" onmouseout="this.style.background=\'\'">';
      h+='<div style="width:26px;height:26px;border-radius:50%;background:'+nt.col+'1a;border:0.5px solid '+nt.col+'44;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;color:'+nt.col+';">'+nt.icon+'</div>';
      h+='<div style="flex:1;min-width:0;">';
      if(nt.label) h+='<div style="font-family:var(--fd);font-size:7px;letter-spacing:2px;color:'+nt.col+';margin-bottom:2px;">'+nt.label+'</div>';
      h+='<div style="font-size:12px;color:var(--text);line-height:1.4;">'+n.text+'</div>';
      if(n.by) h+='<div style="font-size:10px;color:var(--faint);margin-top:2px;">'+n.by+' · '+fdt(n.ts)+'</div>';
      else h+='<div style="font-size:10px;color:var(--faint);margin-top:2px;">'+fdt(n.ts)+'</div>';
      h+='</div>';
      h+='<button onclick="deleteNotif(\''+pid+'\','+n.ts+')" title="Effacer" style="background:transparent;border:none;color:var(--faint);cursor:pointer;font-size:14px;line-height:1;padding:2px 4px;flex-shrink:0;transition:color .15s;" onmouseover="this.style.color=\'var(--red)\'" onmouseout="this.style.color=\'var(--faint)\'">✕</button>';
      h+='</div>';
    });
    h+='</div>';
  }
  panel.innerHTML=h;
}

// ==========================================
// JOURNAL DE BORD
// ==========================================
function renderJournal(tid){
  var el=ge(tid); if(!el) return;
  if(!CU||!CU.pid){ el.innerHTML='<p style="color:var(--faint);">Non connecté.</p>'; return; }
  var p=gpid(CU.pid); if(!p) return;
  var journal=p.journal||"";
  var h='<div style="max-width:720px;">';
  h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">';
  h+='<div class="card-title">📓 Journal de bord — '+esc(p.name)+'</div>';
  h+='<button class="btn btn-sm btn-grn" onclick="saveJournal()"><span>Sauvegarder</span></button>';
  h+='</div>';
  h+='<div class="card mb16" style="padding:0;">';
  h+='<textarea id="journal-text" style="width:100%;min-height:420px;background:transparent;border:none;color:var(--text);font-family:var(--fb);font-size:15px;line-height:1.8;padding:20px;resize:vertical;outline:none;" placeholder="Tes notes, ton lore, tes secrets… Personne ne peut lire ceci sauf toi et les admins.">'+escHtml(journal)+'</textarea>';
  h+='</div>';
  h+='<p style="font-size:12px;color:var(--faint);font-style:italic;">Visible uniquement par toi et les administrateurs.</p>';
  h+='</div>';
  el.innerHTML=h;
}

function escHtml(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function escAttr(s){ return escHtml(s).replace(/"/g,"&quot;").replace(/'/g,"&#x27;"); }
function esc(s){ return escHtml(s); }

function saveJournal(){
  if(!CU||!CU.pid) return;
  var txt=ge("journal-text"); if(!txt) return;
  var players=gp();
  var idx=players.findIndex(function(x){return x.id===CU.pid;});
  if(idx<0) return;
  players[idx].journal=txt.value;
  sp(players);
  notif("Journal sauvegardé.","ok");
}

// ==========================================
// STATS SERVEUR + EXPORT
// ==========================================
function renderStats(tid){
  if(!isAdminRole(CU)){ var el2=ge(tid); if(el2) el2.innerHTML=""; return; }
  var el=ge(tid); if(!el) return;
  var players=gp();
  var accounts=getAccounts();
  var beasts=gb();

  var totalJ=players.length;
  var avgLevel=totalJ?Math.round(players.reduce(function(a,p){return a+(p.level||1);},0)/totalJ*10)/10:0;
  var maxLevel=totalJ?Math.max.apply(null,players.map(function(p){return p.level||1;})):0;

  var sermentsCount={};
  players.forEach(function(p){ sermentsCount[p.classe]=(sermentsCount[p.classe]||0)+1; });
  var sermentsArr=Object.keys(sermentsCount).sort(function(a,b){return sermentsCount[b]-sermentsCount[a];});

  var branchCount={A:0,B:0,aucune:0};
  players.forEach(function(p){
    if(!p.branch||p.branch==="Aucune") branchCount.aucune++;
    else if(p.branch.indexOf("Branche A")>-1) branchCount.A++;
    else branchCount.B++;
  });

  var lvlDist={};
  players.forEach(function(p){var l=p.level||1; lvlDist[l]=(lvlDist[l]||0)+1;});

  // Créatures les plus affrontées (depuis les archives combat)
  var allArcs=getAllCombatArchives();
  var beastHits={};
  allArcs.forEach(function(arc){
    (arc.fighters||[]).filter(function(f){return f.type==="beast";}).forEach(function(f){
      beastHits[f.name]=(beastHits[f.name]||0)+1;
    });
  });
  var beastArr=Object.keys(beastHits).sort(function(a,b){return beastHits[b]-beastHits[a];}).slice(0,6);

  // Progression — XP total, gemmes totales, combats totaux
  var totalXP=players.reduce(function(a,p){return a+(p.xp||0);},0);
  var totalGemmes=players.reduce(function(a,p){
    return a+(p.history||[]).filter(function(h){return h.type==="gemme";}).length;
  },0);
  var totalCombats=allArcs.length;

  // Dernières connexions (comptes triés par lastSeen)
  var connRecentes=accounts.filter(function(a){return a.lastSeen;})
    .sort(function(a,b){return b.lastSeen-a.lastSeen;})
    .slice(0,8);

  var SERM_COLORS=["#7eb8d4","#c9a84c","#6db88a","#c94a4a","#c084d4","#4a9fd4","#d4a44a","#7ab88a","#d47eb8","#84d4c0"];

  var h='<div style="max-width:980px;">';

  // Titre
  h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:10px;">';
  h+='<div>';
  h+='<div style="font-family:var(--fd);font-size:10px;letter-spacing:4px;color:var(--glacier-dim);margin-bottom:6px;">NUAGES POLAIRES</div>';
  h+='<div style="font-family:var(--fd);font-size:22px;letter-spacing:3px;color:var(--text);">Tableau de Bord</div>';
  h+='</div>';
  h+='<div style="display:flex;gap:8px;">';
  h+='<button class="btn btn-sm btn-grn" onclick="exportDB()"><span>⬇ Export JSON</span></button>';
  h+='<label class="btn btn-sm" style="cursor:pointer;"><span>⬆ Import JSON</span><input type="file" accept=".json" onchange="importDB(this)" style="display:none;"></label>';
  h+='</div></div>';

  // KPIs
  var liee=accounts.filter(function(a){return a.role==="joueur"&&a.pid;}).length;
  var attente=accounts.filter(function(a){return (a.role==="joueur"||!a.role)&&!a.pid;}).length;
  var semaine=Date.now()-7*24*3600*1000;
  var actifs=accounts.filter(function(a){return a.lastSeen&&a.lastSeen>semaine;}).length;
  var kpis=[
    {v:totalJ,       l:"Aventuriers",    sub:"personnages actifs",  col:"var(--glacier)"},
    {v:avgLevel,     l:"Niveau moyen",   sub:"progression globale", col:"var(--gold)"},
    {v:actifs,       l:"Actifs / 7j",    sub:"connexions récentes", col:"var(--green)"},
    {v:totalCombats, l:"Combats",        sub:"archivés",            col:"var(--red)"},
    {v:totalGemmes,  l:"Gemmes",         sub:"distribuées",         col:"var(--purple)"},
    {v:accounts.length, l:"Comptes",     sub:"membres inscrits",    col:"var(--glacier-dim)"},
  ];
  h+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:20px;">';
  kpis.forEach(function(k,i){
    h+='<div class="card" style="text-align:center;padding:20px 10px;border-color:'+k.col+';position:relative;overflow:hidden;">';
    h+='<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 110%,'+k.col+'18,transparent 70%);pointer-events:none;"></div>';
    h+='<div id="kpi-val-'+i+'" style="font-family:var(--fm);font-size:36px;font-weight:700;color:'+k.col+';line-height:1;">0</div>';
    h+='<div style="font-family:var(--fd);font-size:9px;letter-spacing:2px;color:var(--text);margin-top:6px;">'+k.l+'</div>';
    h+='<div style="font-size:10px;color:var(--faint);margin-top:2px;">'+esc(k.sub)+'</div>';
    h+='</div>';
  });
  h+='</div>';

  // Ligne 1 : Serments + Distribution niveaux
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">';
  h+='<div class="card">';
  h+='<div class="card-title" style="font-size:9px;margin-bottom:16px;">SERMENTS LES PLUS JOUÉS</div>';
  if(sermentsArr.length){
    h+='<canvas id="chart-serments" width="360" height="220" style="width:100%;"></canvas>';
  } else {
    h+='<p style="color:var(--faint);font-style:italic;font-size:13px;">Aucun joueur.</p>';
  }
  h+='</div>';
  h+='<div class="card">';
  h+='<div class="card-title" style="font-size:9px;margin-bottom:16px;">DISTRIBUTION DES NIVEAUX</div>';
  if(Object.keys(lvlDist).length){
    h+='<canvas id="chart-levels" width="360" height="220" style="width:100%;"></canvas>';
  } else {
    h+='<p style="color:var(--faint);font-style:italic;font-size:13px;">Aucun joueur.</p>';
  }
  h+='</div>';
  h+='</div>';

  // Ligne 2 : Branches + Créatures affrontées
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">';
  h+='<div class="card">';
  h+='<div class="card-title" style="font-size:9px;margin-bottom:16px;">BRANCHES</div>';
  h+='<canvas id="chart-branches" width="360" height="180" style="width:100%;"></canvas>';
  h+='</div>';
  h+='<div class="card">';
  h+='<div class="card-title" style="font-size:9px;margin-bottom:12px;">CRÉATURES LES PLUS AFFRONTÉES</div>';
  if(beastArr.length){
    var maxHits=Math.max.apply(null,beastArr.map(function(n){return beastHits[n];}));
    h+='<div style="display:flex;flex-direction:column;gap:8px;">';
    beastArr.forEach(function(nom,i){
      var v=beastHits[nom];
      var pct=Math.round(v/maxHits*100);
      var beast=beasts.find(function(b){return b.nom===nom;});
      var beh=beast?BHL[beast.beh]||"":"";
      var behCol=beast?BHC[beast.beh]||"var(--faint)":"var(--faint)";
      h+='<div>';
      h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">';
      h+='<span style="font-family:var(--fd);font-size:10px;letter-spacing:1px;color:var(--text);">'+esc(nom)+'</span>';
      h+='<div style="display:flex;align-items:center;gap:8px;">';
      if(beh) h+=bTag(beh,'compact');
      h+='<span style="font-family:var(--fm);font-size:11px;color:var(--red);">'+v+'×</span>';
      h+='</div></div>';
      h+='<div style="height:4px;background:var(--bg4);border-radius:2px;overflow:hidden;">';
      h+='<div class="stat-bar-anim" style="height:100%;width:0%;background:var(--red);opacity:.7;border-radius:2px;transition:width .8s ease;max-width:'+pct+'%"></div>';
      h+='</div></div>';
    });
    h+='</div>';
    if(allArcs.length>0) h+='<div style="font-size:10px;color:var(--faint);margin-top:10px;">Sur '+allArcs.length+' combat'+(allArcs.length>1?'s':'')+' archivé'+(allArcs.length>1?'s':'')+'</div>';
  } else {
    h+='<p style="color:var(--faint);font-style:italic;font-size:13px;">Aucun combat archivé.</p>';
  }
  h+='</div>';
  h+='</div>';

  // Ligne 3 : Progression + Dernières connexions
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">';

  // Progression moyenne par joueur
  h+='<div class="card">';
  h+='<div class="card-title" style="font-size:9px;margin-bottom:14px;">PROGRESSION SERVEUR</div>';
  var liee2=accounts.filter(function(a){return a.role==="joueur"&&a.pid;}).length;
  var staff2=accounts.filter(function(a){return a.role&&a.role!=="joueur";}).length;
  [
    {l:"Niveau moyen",       v:avgLevel,     max:10,           col:"var(--gold)",    fmt:function(v){return v;}},
    {l:"XP total cumulé",    v:totalXP,      max:Math.max(totalXP,1), col:"var(--glacier)", fmt:function(v){return v+" XP";}},
    {l:"Gemmes distribuées", v:totalGemmes,  max:Math.max(totalGemmes,1), col:"var(--purple)", fmt:function(v){return v;}},
    {l:"Joueurs liés",       v:liee2,        max:Math.max(accounts.length,1), col:"var(--green)",  fmt:function(v){return v+"/"+accounts.length;}},
    {l:"En attente",         v:attente,      max:Math.max(attente,1), col:"var(--gold)",   fmt:function(v){return v;}},
    {l:"Staff",              v:staff2,       max:Math.max(staff2,1),  col:"var(--red)",    fmt:function(v){return v;}},
  ].forEach(function(row){
    var pct=Math.min(100,Math.round(row.v/row.max*100));
    h+='<div style="margin-bottom:10px;">';
    h+='<div style="display:flex;justify-content:space-between;margin-bottom:3px;">';
    h+='<span style="font-size:12px;color:var(--dim);">'+row.l+'</span>';
    h+='<span style="font-family:var(--fm);font-size:12px;color:'+row.col+';">'+row.fmt(row.v)+'</span>';
    h+='</div>';
    h+='<div style="height:4px;background:var(--bg4);border-radius:2px;overflow:hidden;">';
    h+='<div class="stat-bar-anim" style="height:100%;width:0%;background:'+row.col+';border-radius:2px;transition:width .8s ease;max-width:'+pct+'%"></div>';
    h+='</div></div>';
  });
  // Top joueurs par niveau
  var topJ=players.slice().sort(function(a,b){return (b.level||1)-(a.level||1);}).slice(0,5);
  if(topJ.length){
    h+='<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);">';
    h+='<div style="font-family:var(--fd);font-size:8px;letter-spacing:2px;color:var(--faint);margin-bottom:8px;">TOP NIVEAUX</div>';
    topJ.forEach(function(p,i){
      var medals=["🥇","🥈","🥉","",""];
      h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">';
      h+='<span style="font-size:14px;width:20px;text-align:center;">'+medals[i]+'</span>';
      h+='<span style="font-family:var(--fd);font-size:10px;letter-spacing:1px;color:var(--text);flex:1;">'+esc(p.name)+'</span>';
      h+='<span style="font-size:10px;color:var(--faint);">'+esc(p.classe)+'</span>';
      h+='<span style="font-family:var(--fm);font-size:11px;color:var(--gold);">Niv.'+p.level+'</span>';
      h+='</div>';
    });
    h+='</div>';
  }
  h+='</div>';

  // Dernières connexions
  h+='<div class="card">';
  h+='<div class="card-title" style="font-size:9px;margin-bottom:14px;">DERNIÈRES CONNEXIONS</div>';
  if(connRecentes.length){
    h+='<div style="display:flex;flex-direction:column;gap:4px;">';
    connRecentes.forEach(function(a){
      var p=a.pid?players.find(function(x){return x.id===a.pid;}):null;
      var diff=Date.now()-a.lastSeen;
      var mins=Math.floor(diff/60000);
      var hrs=Math.floor(mins/60);
      var days=Math.floor(hrs/24);
      var ago=days>0?days+"j":hrs>0?hrs+"h":mins>0?mins+" min":"À l'instant";
      var isRecent=diff<3600000;
      var rolCol={"admin":"var(--red)","mj":"var(--gold)","designer":"var(--purple)","joueur":"var(--glacier-dim)"}[a.role||"joueur"]||"var(--faint)";
      h+='<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--bg3);border:1px solid var(--border2);">';
      // Pastille online
      h+='<div style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:'+(isRecent?"var(--green)":"rgba(255,255,255,0.12)")+';"></div>';
      h+='<div style="flex:1;min-width:0;">';
      h+='<div style="font-family:var(--fd);font-size:10px;letter-spacing:1px;color:var(--text);">'+esc(a.pseudo)+'</div>';
      if(p) h+='<div style="font-size:10px;color:var(--faint);">'+esc(p.name)+' · '+esc(p.classe)+'</div>';
      h+='</div>';
      h+='<div style="text-align:right;flex-shrink:0;">';
      h+='<div style="font-family:var(--fm);font-size:10px;color:'+(isRecent?"var(--green)":"var(--faint)")+';">'+ago+'</div>';
      h+='<div style="font-family:var(--fd);font-size:7px;letter-spacing:1px;color:'+rolCol+';">'+((a.role||"joueur").toUpperCase())+'</div>';
      h+='</div></div>';
    });
    h+='</div>';
  } else {
    h+='<p style="color:var(--faint);font-style:italic;font-size:13px;">Aucune connexion enregistrée.</p>';
  }
  h+='</div>';

  h+='</div>'; // fin ligne 3
  h+='</div>';
  el.innerHTML=h;

  // === Animations KPI ===
  kpis.forEach(function(k,i){
    var target=parseFloat(k.v)||0;
    var el2=ge("kpi-val-"+i); if(!el2) return;
    var start=0, dur=900, startTime=null;
    function animate(ts){
      if(!startTime) startTime=ts;
      var p=Math.min((ts-startTime)/dur,1);
      var ease=1-Math.pow(1-p,3);
      var cur=start+ease*(target-start);
      el2.textContent=Number.isInteger(target)?Math.round(cur):(Math.round(cur*10)/10);
      if(p<1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  });

  // === Barres animées ===
  setTimeout(function(){
    document.querySelectorAll(".stat-bar-anim").forEach(function(bar){
      bar.style.width=bar.style.maxWidth;
    });
  },100);

  // === Canvas Serments ===
  if(sermentsArr.length){
    setTimeout(function(){
      var cv=ge("chart-serments"); if(!cv) return;
      var ctx=cv.getContext("2d");
      var W=cv.getBoundingClientRect().width*window.devicePixelRatio||360;
      if(W<10) W=360;
      var H=220*window.devicePixelRatio||220;
      cv.width=W; cv.height=H;
      var dpr=window.devicePixelRatio||1;
      var barH=Math.min(28,Math.floor((220-40)/sermentsArr.length)-6);
      var maxVal=Math.max.apply(null,sermentsArr.map(function(n){return sermentsCount[n];}));
      var labelW=110*dpr, padR=40*dpr, padT=10*dpr;
      var barW=(W-labelW-padR);
      var startT=null;
      function draw(ts){
        if(!startT) startT=ts;
        var p=Math.min((ts-startT)/700,1);
        var ease=1-Math.pow(1-p,2);
        ctx.clearRect(0,0,W,H);
        sermentsArr.forEach(function(nom,i){
          var count=sermentsCount[nom];
          var pct=count/maxVal;
          var y=(padT+i*(barH*dpr+(6*dpr)));
          var bw=Math.round(barW*pct*ease);
          var col=SERM_COLORS[i%SERM_COLORS.length];
          ctx.fillStyle="rgba(255,255,255,0.04)";
          ctx.fillRect(labelW,y,barW,barH*dpr);
          var grad=ctx.createLinearGradient(labelW,0,labelW+barW,0);
          grad.addColorStop(0,col); grad.addColorStop(1,col+"60");
          ctx.fillStyle=grad;
          ctx.fillRect(labelW,y,bw,barH*dpr);
          ctx.fillStyle="#a0a4c0";
          ctx.font=(11*dpr)+"px 'Cinzel',serif";
          ctx.textAlign="right"; ctx.textBaseline="middle";
          ctx.fillText(nom.length>12?nom.slice(0,11)+"…":nom,labelW-8*dpr,y+barH*dpr/2);
          if(p>0.5){
            ctx.fillStyle=col;
            ctx.font="bold "+(11*dpr)+"px 'JetBrains Mono',monospace";
            ctx.textAlign="left";
            ctx.fillText(count+" joueur"+(count>1?"s":""),labelW+bw+6*dpr,y+barH*dpr/2);
          }
        });
        if(p<1) requestAnimationFrame(draw);
      }
      requestAnimationFrame(draw);
    },200);
  }

  // === Canvas Niveaux ===
  if(Object.keys(lvlDist).length){
    setTimeout(function(){
      var cv=ge("chart-levels"); if(!cv) return;
      var ctx=cv.getContext("2d");
      var dpr=window.devicePixelRatio||1;
      var w=cv.getBoundingClientRect().width||360;
      if(w<10) w=360;
      var h2=220;
      cv.width=w*dpr; cv.height=h2*dpr;
      var lvls=Object.keys(lvlDist).map(Number).sort(function(a,b){return a-b;});
      var maxC=Math.max.apply(null,lvls.map(function(l){return lvlDist[l];}));
      var padB=24*dpr,padT=16*dpr,padL=8*dpr,padR=8*dpr;
      var chartW=w*dpr-padL-padR;
      var chartH=h2*dpr-padB-padT;
      var barW=Math.floor(chartW/lvls.length*0.7);
      var gap=chartW/lvls.length;
      var startT=null;
      function draw(ts){
        if(!startT) startT=ts;
        var p=Math.min((ts-startT)/800,1);
        var ease=1-Math.pow(1-p,3);
        ctx.clearRect(0,0,w*dpr,h2*dpr);
        ctx.strokeStyle="rgba(255,255,255,0.08)";ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(padL,padT+chartH);ctx.lineTo(padL+chartW,padT+chartH);ctx.stroke();
        lvls.forEach(function(l,i){
          var count=lvlDist[l];
          var pct=count/maxC;
          var bh=Math.round(chartH*pct*ease);
          var x=padL+i*gap+(gap-barW)/2;
          var y=padT+chartH-bh;
          var t=i/Math.max(lvls.length-1,1);
          var r=Math.round(126+t*(201-126));
          var g=Math.round(184+t*(74-184));
          var b=Math.round(212+t*(74-212));
          var col="rgb("+r+","+g+","+b+")";
          var grad=ctx.createLinearGradient(0,y,0,padT+chartH);
          grad.addColorStop(0,col);grad.addColorStop(1,"rgba("+r+","+g+","+b+",0.15)");
          ctx.fillStyle=grad;
          ctx.beginPath();
          ctx.roundRect?ctx.roundRect(x,y,barW,bh,2):ctx.rect(x,y,barW,bh);
          ctx.fill();
          ctx.fillStyle="rgba(255,255,255,0.5)";
          ctx.font=(11*dpr)+"px 'JetBrains Mono',monospace";
          ctx.textAlign="center";
          ctx.fillText(l,x+barW/2,padT+chartH+15*dpr);
          if(p>0.6&&bh>12*dpr){
            ctx.fillStyle=col;
            ctx.font="bold "+(10*dpr)+"px 'JetBrains Mono',monospace";
            ctx.fillText(count,x+barW/2,y-4*dpr);
          }
        });
        if(p<1) requestAnimationFrame(draw);
      }
      requestAnimationFrame(draw);
    },200);
  }

  // === Animations KPI counter ===
  kpis.forEach(function(k,i){
    var target=parseFloat(k.v)||0;
    var el2=ge("kpi-val-"+i); if(!el2) return;
    var start=0, dur=900, startTime=null;
    function animate(ts){
      if(!startTime) startTime=ts;
      var p=Math.min((ts-startTime)/dur,1);
      var ease=1-Math.pow(1-p,3);
      var cur=start+ease*(target-start);
      el2.textContent=Number.isInteger(target)?Math.round(cur):(Math.round(cur*10)/10);
      if(p<1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  });

  // === Barres santé animées ===
  setTimeout(function(){
    document.querySelectorAll(".stat-bar-anim").forEach(function(bar){
      bar.style.width=bar.style.maxWidth;
    });
  },100);

  // === Canvas Serments — barres horizontales ===
  if(sermentsArr.length){
    setTimeout(function(){
      var cv=ge("chart-serments"); if(!cv) return;
      var ctx=cv.getContext("2d");
      var W=cv.getBoundingClientRect().width*window.devicePixelRatio||360;
      if(W<10) W=360;
      var H=220*window.devicePixelRatio||220;
      cv.width=W; cv.height=H;
      var dpr=window.devicePixelRatio||1;
      var w=cv.offsetWidth||360, h2=220;
      var barH=Math.min(28,Math.floor((h2-40)/sermentsArr.length)-6);
      var maxVal=Math.max.apply(null,sermentsArr.map(function(n){return sermentsCount[n];}));
      var labelW=110*dpr, padR=40*dpr, padT=10*dpr;
      var barW=(W-labelW-padR);
      var progress={v:0};
      var startT=null;
      function draw(ts){
        if(!startT) startT=ts;
        var p=Math.min((ts-startT)/700,1);
        var ease=1-Math.pow(1-p,2);
        ctx.clearRect(0,0,W,H*dpr);
        sermentsArr.forEach(function(nom,i){
          var count=sermentsCount[nom];
          var pct=count/maxVal;
          var y=(padT+i*(barH*dpr+(6*dpr)));
          var bw=Math.round(barW*pct*ease);
          var col=SERM_COLORS[i%SERM_COLORS.length];
          // Fond barre
          ctx.fillStyle="rgba(255,255,255,0.04)";
          ctx.fillRect(labelW,y,barW,barH*dpr);
          // Barre colorée avec dégradé
          var grad=ctx.createLinearGradient(labelW,0,labelW+barW,0);
          grad.addColorStop(0,col);
          grad.addColorStop(1,col+"60");
          ctx.fillStyle=grad;
          ctx.fillRect(labelW,y,bw,barH*dpr);
          // Label nom
          ctx.fillStyle="#a0a4c0";
          ctx.font=(11*dpr)+"px 'Cinzel',serif";
          ctx.textAlign="right";
          ctx.textBaseline="middle";
          ctx.fillText(nom.length>12?nom.slice(0,11)+"…":nom,labelW-8*dpr,y+barH*dpr/2);
          // Valeur
          if(p>0.5){
            ctx.fillStyle=col;
            ctx.font="bold "+(11*dpr)+"px 'JetBrains Mono',monospace";
            ctx.textAlign="left";
            ctx.fillText(count,labelW+bw+6*dpr,y+barH*dpr/2);
          }
        });
        if(p<1) requestAnimationFrame(draw);
      }
      requestAnimationFrame(draw);
    },200);
  }

  // === Canvas Niveaux — histogramme animé ===
  if(Object.keys(lvlDist).length){
    setTimeout(function(){
      var cv=ge("chart-levels"); if(!cv) return;
      var ctx=cv.getContext("2d");
      var dpr=window.devicePixelRatio||1;
      var w=cv.getBoundingClientRect().width||cv.offsetWidth||360;
      var h2=220;
      if(w<10) w=360; // fallback si pas encore rendu
      cv.width=w*dpr; cv.height=h2*dpr;
      var lvls=Object.keys(lvlDist).map(Number).sort(function(a,b){return a-b;});
      var maxC=Math.max.apply(null,lvls.map(function(l){return lvlDist[l];}));
      var padB=24*dpr, padT=16*dpr, padL=8*dpr, padR=8*dpr;
      var chartW=w*dpr-padL-padR;
      var chartH=h2*dpr-padB-padT;
      var barW=Math.floor(chartW/lvls.length*0.7);
      var gap=chartW/lvls.length;
      var startT=null;
      function draw(ts){
        if(!startT) startT=ts;
        var p=Math.min((ts-startT)/800,1);
        var ease=1-Math.pow(1-p,3);
        ctx.clearRect(0,0,w*dpr,h2*dpr);
        // Ligne de base
        ctx.strokeStyle="rgba(255,255,255,0.08)";
        ctx.lineWidth=1;
        ctx.beginPath();
        ctx.moveTo(padL,padT+chartH);
        ctx.lineTo(padL+chartW,padT+chartH);
        ctx.stroke();
        lvls.forEach(function(l,i){
          var count=lvlDist[l];
          var pct=count/maxC;
          var bh=Math.round(chartH*pct*ease);
          var x=padL+i*gap+(gap-barW)/2;
          var y=padT+chartH-bh;
          // Couleur dégradée selon niveau
          var t=i/Math.max(lvls.length-1,1);
          var r=Math.round(126+t*(201-126));
          var g=Math.round(184+t*(74-184));
          var b=Math.round(212+t*(74-212));
          var col="rgb("+r+","+g+","+b+")";
          var grad=ctx.createLinearGradient(0,y,0,padT+chartH);
          grad.addColorStop(0,col);
          grad.addColorStop(1,"rgba("+r+","+g+","+b+",0.15)");
          ctx.fillStyle=grad;
          ctx.beginPath();
          ctx.roundRect?ctx.roundRect(x,y,barW,bh,2):ctx.rect(x,y,barW,bh);
          ctx.fill();
          // Label niveau
          ctx.fillStyle="rgba(255,255,255,0.5)";
          ctx.font=(11*dpr)+"px 'JetBrains Mono',monospace";
          ctx.textAlign="center";
          ctx.fillText(l,x+barW/2,padT+chartH+15*dpr);
          // Valeur si animé
          if(p>0.6&&bh>12*dpr){
            ctx.fillStyle=col;
            ctx.font="bold "+(10*dpr)+"px 'JetBrains Mono',monospace";
            ctx.fillText(count,x+barW/2,y-4*dpr);
          }
        });
        if(p<1) requestAnimationFrame(draw);
      }
      requestAnimationFrame(draw);
    },200);
  }

  // === Canvas Branches — donut animé ===
  setTimeout(function(){
    var cv=ge("chart-branches"); if(!cv) return;
    var ctx=cv.getContext("2d");
    var dpr=window.devicePixelRatio||1;
    var w=cv.offsetWidth||360, h2=180;
    cv.width=w*dpr; cv.height=h2*dpr;
    var cx=w*dpr/2, cy=h2*dpr/2, r=Math.min(cx,cy)-20*dpr, ri=r*0.55;
    var data=[
      {l:"Branche A",v:branchCount.A,col:"#7eb8d4"},
      {l:"Branche B",v:branchCount.B,col:"#c9a84c"},
      {l:"Aucune",v:branchCount.aucune,col:"#3a3a58"},
    ].filter(function(d){return d.v>0;});
    var tot=data.reduce(function(a,d){return a+d.v;},0)||1;
    var startT=null;
    function draw(ts){
      if(!startT) startT=ts;
      var p=Math.min((ts-startT)/900,1);
      var ease=1-Math.pow(1-p,2);
      ctx.clearRect(0,0,w*dpr,h2*dpr);
      var angle=-Math.PI/2;
      data.forEach(function(d){
        var sweep=d.v/tot*Math.PI*2*ease;
        ctx.beginPath();
        ctx.moveTo(cx,cy);
        ctx.arc(cx,cy,r,angle,angle+sweep);
        ctx.closePath();
        ctx.fillStyle=d.col;
        ctx.fill();
        // Trou donut
        ctx.beginPath();
        ctx.arc(cx,cy,ri,0,Math.PI*2);
        ctx.fillStyle=getComputedStyle(document.body).getPropertyValue("--bg3").trim()||"#111120";
        ctx.fill();
        // Labels
        if(p>0.8&&d.v>0){
          var mid=angle+sweep/2;
          var lx=cx+Math.cos(mid)*(r*0.72);
          var ly=cy+Math.sin(mid)*(r*0.72);
          ctx.fillStyle="#fff";
          ctx.font="bold "+(11*dpr)+"px 'JetBrains Mono',monospace";
          ctx.textAlign="center";
          ctx.textBaseline="middle";
          ctx.fillText(d.v,lx,ly);
        }
        angle+=sweep;
      });
      // Centre
      if(p>0.5){
        ctx.fillStyle="#a0a4c0";
        ctx.font=(10*dpr)+"px 'Cinzel',serif";
        ctx.textAlign="center";
        ctx.textBaseline="middle";
        ctx.fillText("BRANCHES",cx,cy-7*dpr);
        ctx.fillStyle="#7eb8d4";
        ctx.font="bold "+(16*dpr)+"px 'JetBrains Mono',monospace";
        ctx.fillText(tot,cx,cy+10*dpr);
      }
      if(p<1) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
    // Légende textuelle sous le donut
    var leg=document.createElement("div");
    leg.style.cssText="display:flex;justify-content:center;gap:16px;margin-top:8px;flex-wrap:wrap;";
    data.forEach(function(d){
      var span=document.createElement("span");
      span.style.cssText="font-family:var(--fd);font-size:9px;letter-spacing:1px;color:var(--dim);display:flex;align-items:center;gap:5px;";
      span.innerHTML='<span style="width:10px;height:10px;border-radius:50%;background:'+d.col+';display:inline-block;flex-shrink:0;"></span>'+d.l;
      leg.appendChild(span);
    });
    cv.parentNode.appendChild(leg);
  },200);
}

function exportDB(){
  var data={
    version:1,
    exported:new Date().toISOString(),
    players:gp(),
    accounts:getAccounts(),
    beasts:gb(),
    serments_custom:gsd()
  };
  var blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  var url=URL.createObjectURL(blob);
  var a=document.createElement("a");
  a.href=url; a.download="nuages-polaires-backup-"+new Date().toISOString().slice(0,10)+".json";
  a.click(); URL.revokeObjectURL(url);
  notif("Export téléchargé.","ok");
}

function importDB(input){
  var file=input.files[0]; if(!file) return;
  var reader=new FileReader();
  reader.onload=function(e){
    try{
      var data=JSON.parse(e.target.result);
      if(!data.version){ notif("Fichier invalide.","err"); return; }
      if(data.players) sp(data.players);
      if(data.accounts) saveAccounts(data.accounts);
      if(data.beasts) sb(data.beasts);
      if(data.serments_custom) ssd(data.serments_custom);
      notif("Import réussi — "+( data.players?data.players.length:0)+" joueurs, "+(data.beasts?data.beasts.length:0)+" créatures.","ok");
      renderStats("p-stats-c");
    }catch(err){ notif("Erreur de lecture JSON.","err"); }
  };
  reader.readAsText(file);
  input.value="";
}
document.addEventListener("keydown",function(e){
  // Ignorer si focus dans un input/textarea
  var tag=(document.activeElement||{}).tagName||"";
  var inInput=tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT";

  // Échap — ferme la modale ouverte
  if(e.key==="Escape"){
    var open=document.querySelector(".moverlay.open");
    if(open) open.classList.remove("open");
    return;
  }

  // Raccourcis simulateur — ignorés si focus dans un champ
  if(!inInput&&_cs&&_cs.active){
    // Espace — tour suivant
    if(e.key===" "||e.key==="Space"){
      e.preventDefault();
      combatPassTurn();
      return;
    }
    // Entrée — prochain round
    if(e.key==="Enter"&&e.shiftKey){
      e.preventDefault();
      combatNextRound();
      return;
    }
  }

  // Ctrl+Z — annuler (simulateur)
  if((e.ctrlKey||e.metaKey)&&e.key==="z"&&!e.shiftKey){
    if(_cs&&(_cs.active||_cs.id)){
      e.preventDefault();
      combatUndo();
      return;
    }
  }
});

// ==========================================
// ==========================================
// SIMULATEUR DE COMBAT v2 — DÉCLARATION / RÉSOLUTION
// ==========================================
//
// FLUX : 
//   1. Phase DÉCLARATION — chaque combattant déclare ses actions dans l'ordre
//      J1 déclare d'abord, puis J2, puis J3, etc.
//      Les déclarations ne consomment RIEN — ce sont des intentions.
//   2. Phase RÉSOLUTION — le MJ appuie sur "Résoudre"
//      Le simulateur croise les actions/défenses, applique les dégâts,
//      génère le log complet, met à jour les stats.
//
// STRUCTURE D'UNE DÉCLARATION :
//   { action: "frappe"|"pugilat"|"esquive"|"bloquer"|"parer"|"deplacer"|"capacite"|"soin"|"passer"
//     target: fi (index du combattant ciblé, pour attaques)
//     defenseOf: fi (index de l'action de J_autre que cette défense couvre)
//     value: nombre de dégâts (calculé au moment de la déclaration)
//     label: texte affiché
//     emCost: coût EM (capacités)
//     healAmt: soin (Conjurateur)
//     healTarget: fi (cible du soin)
//     actsSacr: actions sacrifiées (Soin Enchaîné)
//   }

var _cs = {
  active: false, round: 1, initiative: 0,
  fighters: [], log: [], id: null, name: "",
  order: [], turn: 0,
  phase: "idle", // "idle" | "declaration" | "resolution"
  _new: false, notes: "",
  _iv: {}  // cache inputs UI
};
var _csHist = [];
var _csPollId = null;

var _csRedoHist = [];
var _combatAutosaveTimer = null;
function combatBlankState(){
  return {active:false,round:1,initiative:0,fighters:[],log:[],id:null,name:"",order:[],turn:0,phase:"idle",_new:true,notes:"",_iv:{},decl:{},pendingDrops:[]};
}
function combatHasMeaningfulState(state){
  state=state||_cs||{};
  if(state.active) return true;
  if((state.fighters||[]).length) return true;
  if((state.log||[]).length) return true;
  if((state.name||'').trim()) return true;
  if((state.notes||'').trim()) return true;
  return false;
}
function combatIsInProgressState(state){
  state=state||_cs||{};
  if(state.active) return true;
  if(String(state.phase||'idle')!=='idle') return true;
  if((state.fighters||[]).length && !((state.log||[]).length)) return true;
  return false;
}
function combatPersistCurrentDraft(reason){
  if(!combatHasMeaningfulState(_cs)) return null;
  if(!_cs.id) _cs.id='c'+Date.now();
  var owner = combatArchiveOwnerKey((_cs&&_cs._owner) || combatArchiveCurrentOwner());
  var arr=getCombatArchivesForOwner(owner), i=arr.findIndex(function(a){return a.id===_cs.id;});
  var prev=i>=0?arr[i]:null;
  var arc=JSON.parse(JSON.stringify(_cs));
  arc.savedAt=Date.now();
  if(owner) arc._owner = owner;
  arc._autosaveAt=Date.now();
  arc._autosaveReason=reason||'autosave';
  arc._manualSaved=!!(prev&&prev._manualSaved);
  arc._inProgress=combatIsInProgressState(arc);
  arc._draft=arc._inProgress || !!arc._new;
  if(i>=0) arr[i]=arc; else arr.unshift(arc);
  saveCombatArchives(arr, owner).catch(function(){});
  return arc;
}
function combatQueueAutosave(reason, delay){
  if(typeof window==='undefined') return;
  try{ if(_combatAutosaveTimer) clearTimeout(_combatAutosaveTimer); }catch(_e){}
  _combatAutosaveTimer=setTimeout(function(){
    _combatAutosaveTimer=null;
    try{ combatPersistCurrentDraft(reason||'autosave'); }catch(_e){}
  }, typeof delay==='number'?delay:180);
}

// ── Cache inputs ──────────────────────────────────────────────────────────────
function csSet(k,fi,v){ _cs._iv[k+fi]=v; }
function csGet(k,fi){ return _cs._iv[k+fi]||""; }

// ── Snapshot / Undo ───────────────────────────────────────────────────────────
function combatSnapshot(){
  if(_csHist.length>=30) _csHist.shift();
  _csHist.push(JSON.stringify(_cs));
}
function combatUndo(){
  if(!_csHist.length){ notif("Rien à annuler.","inf"); return; }
  _cs=JSON.parse(_csHist.pop());
  notif("Annulé.","ok");
  rCombat("p-combat-mj-c");
}

// ── Archives ──────────────────────────────────────────────────────────────────
function combatArchiveOwnerKey(owner){
  return String(owner||'').trim();
}
function combatArchiveCurrentOwners(){
  var out=[];
  function push(owner){
    owner = combatArchiveOwnerKey(owner);
    if(owner && out.indexOf(owner) < 0) out.push(owner);
  }
  if(CU){
    if(CU.pseudo) push(CU.pseudo);
    if(CU.name) push(CU.name);
  }
  return out;
}
function combatArchiveCurrentOwner(){
  var owners = combatArchiveCurrentOwners();
  return owners.length ? owners[0] : '';
}
function combatArchiveStoreKey(owner){
  return 'combat_arc_'+combatArchiveOwnerKey(owner);
}
function combatArchiveIndexKey(owner){
  return 'combat_arc_idx_'+combatArchiveOwnerKey(owner);
}
function combatArchiveRecordKey(owner,id){
  return 'combat_arc_rec_'+combatArchiveOwnerKey(owner)+'__'+String(id||'');
}
function combatArchiveIsStub(entry){ return !!(entry && entry._stub); }
function combatArchiveMetaFromRecord(entry, owner){
  var arc = _normalizeCombatArchiveRecord(entry || {}, 0);
  var meta = {
    id: arc.id,
    name: arc.name || arc.label || 'Combat sans nom',
    label: arc.label || arc.name || '',
    savedAt: _safeFiniteNumber(arc.savedAt, Date.now()),
    round: Math.max(1, parseInt(arc.round,10)||1),
    phase: String(arc.phase||'idle'),
    active: !!arc.active,
    fighters: Array.isArray(arc.fighters) ? arc.fighters.slice(0,80) : [],
    _owner: combatArchiveOwnerKey(owner || arc._owner || ''),
    _manualSaved: !!arc._manualSaved,
    _autosaveAt: _safeFiniteNumber(arc._autosaveAt, 0),
    _autosaveReason: arc._autosaveReason || '',
    _inProgress: !!arc._inProgress,
    _draft: !!arc._draft,
    _new: !!arc._new,
    _stub: true
  };
  return _normalizeCombatArchiveRecord(meta, 0);
}
function combatArchiveExpandForPersist(owner, entry){
  if(!entry || typeof entry !== 'object') return null;
  if(combatArchiveIsStub(entry)){
    var cached = sto(combatArchiveRecordKey(owner, entry.id));
    if(cached && typeof cached === 'object'){
      var rec = _normalizeCombatArchiveRecord(cached, 0);
      rec._owner = owner;
      return rec;
    }
  }
  var out = _normalizeCombatArchiveRecord(entry, 0);
  out._owner = owner;
  return out;
}
function combatArchiveCacheRecord(owner, record){
  owner = combatArchiveOwnerKey(owner);
  if(!owner || !record || !record.id) return null;
  var key = combatArchiveRecordKey(owner, record.id);
  var normalized = _normalizeCombatArchiveRecord(record, 0);
  normalized._owner = owner;
  _dbCache[key] = normalized;
  return normalized;
}
var _combatArchivePromotionQueue = Object.create(null);
function _combatArchivePromoteLegacyOwner(owner){
  owner = combatArchiveOwnerKey(owner);
  if(!owner || !_dbToken || _dbOffline) return Promise.resolve(false);
  if(_combatArchivePromotionQueue[owner]) return _combatArchivePromotionQueue[owner];
  var idx = sto(combatArchiveIndexKey(owner));
  if(Array.isArray(idx) && idx.length) return Promise.resolve(false);
  var legacy = sto(combatArchiveStoreKey(owner)) || [];
  if(!Array.isArray(legacy) || !legacy.length) return Promise.resolve(false);
  var writes = [];
  var meta = legacy.map(function(arc){ return combatArchiveMetaFromRecord(arc, owner); });
  writes.push(sv(combatArchiveIndexKey(owner), meta).catch(function(){ return null; }));
  legacy.forEach(function(arc){
    var full = combatArchiveExpandForPersist(owner, arc);
    if(full && full.id) writes.push(sv(combatArchiveRecordKey(owner, full.id), full).catch(function(){ return null; }));
  });
  _combatArchivePromotionQueue[owner] = Promise.all(writes).then(function(){ delete _combatArchivePromotionQueue[owner]; return true; }).catch(function(){ delete _combatArchivePromotionQueue[owner]; return false; });
  return _combatArchivePromotionQueue[owner];
}
function _combatArchiveKnownOwners(){
  var owners=[];
  function pushOwner(owner){ owner = combatArchiveOwnerKey(owner); if(owner && owners.indexOf(owner) < 0) owners.push(owner); }
  try{ combatArchiveCurrentOwners().forEach(pushOwner); }catch(e){}
  try{ getAccounts().forEach(function(a){ if(!a) return; if(a.role!=="mj" && a.role!=="admin") return; pushOwner(a.pseudo); pushOwner(a.name); }); }catch(e){}
  try{ Object.keys(_dbCache||{}).forEach(function(key){ if(String(key||'').indexOf('combat_arc_idx_')===0) pushOwner(String(key).slice('combat_arc_idx_'.length)); else if(String(key||'').indexOf('combat_arc_')===0 && String(key||'').indexOf('combat_arc_rec_')!==0) pushOwner(String(key).slice('combat_arc_'.length)); }); }catch(e){}
  try{ for(var i=0;i<localStorage.length;i++){ var key=localStorage.key(i); var match=String(key||'').match(/^(?:np_)?combat_arc_(.+)$/i); if(match) pushOwner(match[1]); } }catch(e){}
  return owners;
}
function combatArchiveGetIndex(owner){
  owner = combatArchiveOwnerKey(owner);
  if(!owner) return [];
  var raw = sto(combatArchiveIndexKey(owner));
  if(Array.isArray(raw) && raw.length) return raw.map(function(entry){ return combatArchiveMetaFromRecord(entry, owner); }).sort(function(a,b){ return (b&&b.savedAt||0)-(a&&a.savedAt||0); });
  return [];
}
function combatArchiveGetRecord(owner, id){
  owner = combatArchiveOwnerKey(owner); id = String(id||'');
  if(!owner || !id) return null;
  var cached = sto(combatArchiveRecordKey(owner, id));
  if(cached && typeof cached === 'object'){ var rec = _normalizeCombatArchiveRecord(cached, 0); rec._owner = owner; return rec; }
  var legacy = sto(combatArchiveStoreKey(owner)) || [];
  var hit = Array.isArray(legacy) ? legacy.find(function(a){ return String(a&&a.id||'')===id; }) : null;
  if(hit){ var fromLegacy = _normalizeCombatArchiveRecord(hit, 0); fromLegacy._owner = owner; _dbCache[combatArchiveRecordKey(owner, id)] = fromLegacy; return fromLegacy; }
  return null;
}
async function combatArchiveFetchRecord(owner, id, fallback){
  owner = combatArchiveOwnerKey(owner); id = String(id||'');
  if(!owner || !id) return null;
  var cached = combatArchiveGetRecord(owner, id); if(cached) return cached;
  if(_dbToken && !_dbOffline){
    try{ var recResp = await _dbCall({action:'get', key:combatArchiveRecordKey(owner, id)}, {silent:true}); if(recResp && recResp.value && typeof recResp.value === 'object') return combatArchiveCacheRecord(owner, recResp.value); }catch(e){}
    try{ var legacyResp = await _dbCall({action:'get', key:combatArchiveStoreKey(owner)}, {silent:true}); var arr = Array.isArray(legacyResp && legacyResp.value) ? legacyResp.value : []; var hit = arr.find(function(a){ return String(a&&a.id||'')===id; }); if(hit) return combatArchiveCacheRecord(owner, hit); }catch(e){}
  }
  if(fallback && !combatArchiveIsStub(fallback)){ var out = _normalizeCombatArchiveRecord(fallback, 0); out._owner = owner; return out; }
  return null;
}
function getCombatArchivesForOwner(owner){
  owner = combatArchiveOwnerKey(owner);
  if(!owner) return [];
  var index = combatArchiveGetIndex(owner);
  if(index.length){
    return index.map(function(meta){ var full = combatArchiveGetRecord(owner, meta.id); if(full) return full; var out = _normalizeCombatArchiveRecord(meta, 0); out._owner = owner; out._stub = true; return out; });
  }
  var legacy = _mergeCombatArchiveLists([], sto(combatArchiveStoreKey(owner)) || []);
  if(legacy.length) _combatArchivePromoteLegacyOwner(owner).catch(function(){});
  return legacy.map(function(arc){ var out = _normalizeCombatArchiveRecord(arc, 0); out._owner = owner; return out; });
}
function getCombatArchives(){
  var merged = [];
  combatArchiveCurrentOwners().forEach(function(owner){ merged = _mergeCombatArchiveLists(merged, getCombatArchivesForOwner(owner)); });
  return merged;
}
function saveCombatArchives(arr, ownerOverride){
  var owner = combatArchiveOwnerKey(ownerOverride || (_cs&&_cs._owner) || combatArchiveCurrentOwner());
  if(!owner) return Promise.resolve({ok:false, skipped:true});
  var seen = Object.create(null), source = Array.isArray(arr) ? arr : [], next = [];
  source.forEach(function(entry){ if(!entry || typeof entry !== 'object') return; var id = String(entry.id || ''); if(!id || seen[id]) return; seen[id]=true; next.push(entry); });
  next.sort(function(a,b){ return (b&&b.savedAt||0) - (a&&a.savedAt||0); });
  var prevIndex = combatArchiveGetIndex(owner), prevIds = Object.create(null); prevIndex.forEach(function(meta){ prevIds[String(meta&&meta.id||'')] = true; });
  var nextIds = Object.create(null), nextIndex = [], nextById = Object.create(null);
  next.forEach(function(entry){ var meta = combatArchiveMetaFromRecord(entry, owner); nextIndex.push(meta); nextIds[meta.id]=true; nextById[meta.id]=entry; });
  nextIndex.sort(function(a,b){ return (b&&b.savedAt||0) - (a&&a.savedAt||0); });
  var writes = [];
  writes.push(sv(combatArchiveStoreKey(owner), next.slice(0,50).map(function(entry){ return combatArchiveExpandForPersist(owner, entry) || entry; })).catch(function(){ return null; }));
  writes.push(sv(combatArchiveIndexKey(owner), nextIndex).catch(function(){ return null; }));
  nextIndex.forEach(function(meta){ var full = combatArchiveExpandForPersist(owner, nextById[meta.id] || meta); if(!full || !full.id) return; writes.push(sv(combatArchiveRecordKey(owner, full.id), full).catch(function(){ return null; })); });
  Object.keys(prevIds).forEach(function(id){ if(nextIds[id]) return; var recKey = combatArchiveRecordKey(owner, id); delete _dbCache[recKey]; if(_dbToken && !_dbOffline) writes.push(_dbCall({action:'delete', key:recKey}, {silent:true}).catch(function(){ return null; })); });
  if(owner === combatArchiveCurrentOwner()){
    combatArchiveCurrentOwners().slice(1).forEach(function(alias){ alias = combatArchiveOwnerKey(alias); if(!alias || alias === owner) return; delete _dbCache[combatArchiveStoreKey(alias)]; delete _dbCache[combatArchiveIndexKey(alias)]; if(_dbToken && !_dbOffline){ writes.push(_enqueueDbWrite(combatArchiveStoreKey(alias), []).catch(function(){ return null; })); writes.push(_enqueueDbWrite(combatArchiveIndexKey(alias), []).catch(function(){ return null; })); } });
  }
  return Promise.all(writes).then(function(){ return {ok:true, owner:owner}; });
}
var _combatArchiveAdminPrimePromise = null;
function _primeAllCombatArchivesForAdmin(force){
  if(!can("manage_mjs")) return Promise.resolve(false);
  if(!_dbToken || _dbOffline) return Promise.resolve(false);
  var owners = _combatArchiveKnownOwners();
  if(!owners.length) return Promise.resolve(false);
  if(_combatArchiveAdminPrimePromise && !force) return _combatArchiveAdminPrimePromise;
  _combatArchiveAdminPrimePromise = Promise.all(owners.map(function(owner){
    return _dbCall({action:"get", key:combatArchiveIndexKey(owner)}, {silent:true}).then(function(resp){
      if(resp && Array.isArray(resp.value) && resp.value.length){ _dbCache[combatArchiveIndexKey(owner)] = _normalizeDbValueForKey(combatArchiveIndexKey(owner), resp.value || []); return true; }
      return _dbCall({action:"get", key:combatArchiveStoreKey(owner)}, {silent:true}).then(function(legacyResp){ var normalizedLegacy = _normalizeDbValueForKey(combatArchiveStoreKey(owner), legacyResp.value || []); _dbCache[combatArchiveStoreKey(owner)] = normalizedLegacy; if(Array.isArray(normalizedLegacy) && normalizedLegacy.length){ _dbCache[combatArchiveIndexKey(owner)] = normalizedLegacy.map(function(arc){ return combatArchiveMetaFromRecord(arc, owner); }); _combatArchivePromoteLegacyOwner(owner).catch(function(){}); return true; } return false; }).catch(function(){ return false; });
    }).catch(function(){ return false; });
  })).then(function(results){ _combatArchiveAdminPrimePromise = null; return results.some(Boolean); }).catch(function(){ _combatArchiveAdminPrimePromise = null; return false; });
  return _combatArchiveAdminPrimePromise;
}
function getAllCombatArchives(){
  var all=[];
  _combatArchiveKnownOwners().forEach(function(owner){ getCombatArchivesForOwner(owner).forEach(function(arc){ var copy; try{ copy = JSON.parse(JSON.stringify(arc)); }catch(e){ copy = arc; } if(copy && typeof copy === 'object') copy._owner = owner; all.push(copy); }); });
  return all.sort(function(a,b){return(b&&b.savedAt||0)-(a&&a.savedAt||0);});
}


// ── Polling ───────────────────────────────────────────────────────────────────
function _startCombatMJPoll(){
  if(_csPollId) clearInterval(_csPollId);
  _csPollId=setInterval(function(){
    var tab=ge("combat-mj");
    if(!tab||!tab.classList.contains("active")){ clearInterval(_csPollId);_csPollId=null;return; }
    if(_cs.active) return;
    Promise.all([_loadSessionBundle(),_dbCall({action:"get",key:"beasts"})]).then(function(r){
      var changed=false;
      var nextPlayers=(r[0]&&r[0].data&&Array.isArray(r[0].data.players))?r[0].data.players:null;
      if(nextPlayers&&JSON.stringify(nextPlayers)!==JSON.stringify(_dbCache.players)){_dbCache.players=nextPlayers;changed=true;}
      if(r[1]&&r[1].value&&JSON.stringify(r[1].value)!==JSON.stringify(_dbCache.beasts)){_dbCache.beasts=r[1].value;changed=true;}
      if(changed) rCombat("p-combat-mj-c");
    }).catch(function(){});
  },30000);
}

// ── Log ───────────────────────────────────────────────────────────────────────
function cLog(text,type){ _cs.log.push({round:_cs.round,text:text,ts:Date.now(),type:type||"info"}); }
function combatQueueFx(ev){
  if(!_cs||!ev) return;
  _cs._fxQueue=_cs._fxQueue||[];
  ev.id=ev.id||("fx"+Date.now().toString(36)+Math.random().toString(36).slice(2,7));
  _cs._fxQueue.push(ev);
  if(_cs._fxQueue.length>36) _cs._fxQueue=_cs._fxQueue.slice(-36);
}
function combatFxCard(cid){
  if(!cid) return null;
  var cards=document.querySelectorAll('#p-combat-mj-c .sim-fighter-card[data-cid]');
  for(var i=0;i<cards.length;i++){
    if(cards[i].getAttribute('data-cid')===cid) return cards[i];
  }
  return null;
}
function combatFxFloat(card, text, kind){
  if(!card||!text) return;
  var r=card.getBoundingClientRect();
  var el=document.createElement('div');
  el.className='sim-fx-float sim-fx-'+(kind||'hit');
  el.textContent=text;
  el.style.left=(r.left+r.width*0.5)+'px';
  el.style.top=(r.top+Math.min(90,r.height*0.38))+'px';
  document.body.appendChild(el);
  setTimeout(function(){ if(el&&el.parentNode) el.parentNode.removeChild(el); }, 1150);
}
function combatFxTrace(fromCard,toCard,kind){
  if(!fromCard||!toCard) return;
  var a=fromCard.getBoundingClientRect(), b=toCard.getBoundingClientRect();
  var x1=a.left+a.width*0.5, y1=a.top+a.height*0.42;
  var x2=b.left+b.width*0.5, y2=b.top+b.height*0.42;
  var dx=x2-x1, dy=y2-y1, len=Math.sqrt(dx*dx+dy*dy);
  if(!len) return;
  var line=document.createElement('div');
  line.className='sim-fx-trace sim-fx-trace-'+(kind||'hit');
  line.style.left=x1+'px';
  line.style.top=y1+'px';
  line.style.width=len+'px';
  line.style.transform='rotate('+Math.atan2(dy,dx)+'rad)';
  document.body.appendChild(line);
  setTimeout(function(){ if(line&&line.parentNode) line.parentNode.removeChild(line); }, 620);
}
function combatPlayFx(ev){
  if(!ev) return;
  var from=combatFxCard(ev.fromCid);
  var to=combatFxCard(ev.toCid);
  var kind=ev.kind||'hit';
  if(from){
    from.classList.add(kind==='heal'?'sim-fx-cast':'sim-fx-lunge');
    setTimeout(function(){ from.classList.remove('sim-fx-lunge','sim-fx-cast'); }, 520);
  }
  if(to){
    if(kind==='heal') to.classList.add('sim-fx-heal');
    else if(kind==='dodge') to.classList.add('sim-fx-dodge');
    else if(kind==='ko') to.classList.add('sim-fx-ko');
    else to.classList.add('sim-fx-hit');
    setTimeout(function(){ to.classList.remove('sim-fx-hit','sim-fx-heal','sim-fx-dodge','sim-fx-ko'); }, 760);
  }
  if(kind==='hit'||kind==='ko') combatFxTrace(from,to,'hit');
  if(kind==='heal') combatFxTrace(from,to,'heal');
  if(kind==='dodge') combatFxTrace(from,to,'dodge');
  combatFxFloat(to||from, ev.text||'', kind);
}
function combatPlayPendingFx(){
  if(!window||!document||!_cs) return;
  var reduce=false;
  try{ reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(_e){}
  var list=(_cs._fxQueue||[]).slice(0,32);
  _cs._fxQueue=[];
  if(reduce||!list.length) return;
  list.forEach(function(ev,i){ setTimeout(function(){ combatPlayFx(ev); }, 140+(i*240)); });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function cCurIdx(){
  if(!_cs.active||_cs.phase!=="declaration") return -1;
  return _cs.order[_cs.turn]??-1;
}
function cCur(){ var i=cCurIdx(); return i>=0?_cs.fighters[i]:null; }
function cSurcCost(base,level){ return Math.ceil(base*(1+level*0.5)); }
function cGetFighterPlayer(fi){
  var f=_cs.fighters[fi];
  return f&&f.pid?gpid(f.pid):null;
}
function cGetFighterSerment(fi){
  var f=_cs.fighters[fi];
  var p=cGetFighterPlayer(fi);
  if(!f||!p) return null;
  var bundle=getPlayerSermentBundle(p);
  if(!bundle||!bundle.def||!bundle.branch) return null;
  var rawPaliers=(bundle.branch.paliers||[]).filter(function(pl){ return (pl.niv||0)<=((p.sLevel||1)); }).sort(function(a,b){ return (a.niv||0)-(b.niv||0); });
  var latestByName=Object.create(null), order=[];
  rawPaliers.forEach(function(pl){
    var key=String(pl&&pl.nom||'Capacité').trim().toLowerCase() || ('palier-'+(pl&&pl.niv||0));
    if(order.indexOf(key)<0) order.push(key);
    latestByName[key]=pl;
  });
  var unlocked=order.map(function(key){ return latestByName[key]; }).sort(function(a,b){ return (a.niv||0)-(b.niv||0); });
  var pal=unlocked.length?unlocked[unlocked.length-1]:null;
  return { fighter:f, player:p, bundle:bundle, branch:bundle.branch, palier:pal, paliers:unlocked, level:p.level||f.level||1, sLevel:p.sLevel||1 };
}
function cNums(desc){
  return String(desc||'').match(/-?\d+/g)||[];
}
function cFirstNumber(desc, fallback){
  var m=String(desc||'').match(/(\d+)\s*\+\s*Niv/i) || String(desc||'').match(/(\d+)/);
  return m?parseInt(m[1],10):(fallback||0);
}
function cDamageWithLevel(base, level){ return (parseInt(base,10)||0) + (parseInt(level,10)||1); }
function cParseEMCost(cout){
  var n=cNums(cout||'');
  return n.length?parseInt(n[0],10):0;
}
function cSerializeOpts(obj){
  return JSON.stringify(obj||{}).replace(/</g,'\u003c').replace(/>/g,'\u003e').replace(/'/g,'&#39;');
}
function cActiveSummonForOwner(ownerPid){
  return (_cs.fighters||[]).find(function(x){ return x&&x.isSummon&&x.ownerPid===ownerPid&&x.pvCur>0; }) || null;
}
function cHasUsedSummon(ownerPid,summonName){
  return !!((_cs.log||[]).find(function(l){ return l && l.type==='summon' && String(l.text||'').indexOf(ownerPid+':'+summonName)>-1; }));
}
function cExtractCurrentMobSkillDesc(comp){
  var full=String(comp||'').trim();
  if(!full) return '';
  var out=full.replace(/^[^—\-]+\s*[—\-]\s*/,'').trim();
  var first=(full.match(/Premi[eè]re action du combat\s*:\s*([^\.]+(?:\.[^A-ZÉÈÀÂÎÔÛÇ]|$)?)/i)||[])[1];
  var later=(full.match(/En cours de combat\s*:\s*([^\.]+(?:\.[^A-ZÉÈÀÂÎÔÛÇ]|$)?)/i)||[])[1];
  if(first||later){
    if((_cs.round||1)<=1 && first) out=first.trim();
    else if(later) out=later.trim();
  }
  return out;
}
function cParseMobSkillOption(fi){
  var f=_cs.fighters[fi];
  if(!f||!f.comp) return null;
  var comp=String(f.comp||'').trim();
  if(!comp) return null;
  var title=(comp.split(/\s*[—\-]\s*/)[0]||'Compétence').trim() || 'Compétence';
  var currentDesc=cExtractCurrentMobSkillDesc(comp) || comp;
  var fullDesc=comp.replace(/^[^—\-]+\s*[—\-]\s*/,'').trim() || currentDesc;
  var epCost=parseInt(((comp.match(/(\d+)\s*EP/i)||[])[1]||'0'),10)||0;
  var emCost=parseInt(((comp.match(/(\d+)\s*EM/i)||[])[1]||'0'),10)||0;
  var consumeActions=Math.max(1, parseInt(((comp.match(/(\d+)\s*action/i)||[])[1]||'1'),10)||1);
  var currentNums=(String(currentDesc).match(/-?\d+/g)||[]).map(function(n){ return parseInt(n,10); });
  var dmgMatch=currentDesc.match(/(\d+)\s*d[ée]g[âa]ts?/i);
  var healMatch=currentDesc.match(/(?:soign[ée]?|r[ée]cup[èe]re?)[^\d]*(\d+)\s*PV/i) || currentDesc.match(/(\d+)\s*PV[^\.]*soign/i);
  var dmg=dmgMatch?parseInt(dmgMatch[1],10):(currentNums.length?currentNums[0]:0);
  var healAmt=healMatch?parseInt(healMatch[1],10):0;
  var hits=parseInt(((currentDesc.match(/(\d+)\s*(?:coups?|frappes?|tirs?)/i)||[])[1]||'1'),10)||1;
  if(hits<1) hits=1;
  var lower=(currentDesc+' '+fullDesc).toLowerCase();
  var statusToTarget='';
  if(/br[ûu]l/.test(lower)) statusToTarget='brulure';
  else if(/gel|givre/.test(lower)) statusToTarget='gel';
  else if(/empoison|poison/.test(lower)) statusToTarget='empoisonne';
  else if(/saign/.test(lower)) statusToTarget='saignement';
  else if(/fragilis/.test(lower)) statusToTarget='fragilise';
  var aoe=/zone|toutes? les entit|tous les ennemis|autour de|adjacents?/i.test(fullDesc);
  var onlyDodge=/uniquement esquivable|seulement esquivable|non\s*parable/i.test(fullDesc);
  var undefendable=/imparable|ind[ée]fendable|non\s*esquivable/i.test(fullDesc);
  var repulse=/repouss/i.test(fullDesc);
  var kind=(healAmt>0 && !dmg)?'heal':'attack';
  var targetType=aoe?'none':(kind==='heal'?'ally':'enemy');
  return {
    action: kind==='heal' ? 'soin' : 'capacite',
    kind: kind,
    palNom: title,
    label: '⚡ '+title,
    descText: currentDesc,
    fullDescText: fullDesc,
    value: dmg,
    healAmt: healAmt,
    targetType: targetType,
    emCost: emCost,
    epCost: epCost,
    consumeActions: consumeActions,
    hits: hits>1?hits:0,
    aoe: aoe,
    statusToTarget: statusToTarget,
    repulse: repulse,
    onlyDodge: onlyDodge,
    undefendable: undefendable,
    dmgStatic: true,
    sourceType: 'beast'
  };
}
function cGetMobAbilityOptions(fi, actLeft){
  var op=cParseMobSkillOption(fi);
  if(!op) return [];
  if((op.consumeActions||1)>(actLeft||1)) return [];
  return [op];
}
function cBuildAbilityOptionsForPalier(info, pal, actLeft){
  if(!pal) return [];
  var f=info.fighter, p=info.player;
  var desc=String(pal.desc||'');
  var out=[];
  var em=cParseEMCost(pal.cout||'0');
  var name=String(pal.nom||'Capacité');
  function push(spec){
    spec=spec||{};
    spec.action=spec.action||'capacite';
    spec.kind=spec.kind||'attack';
    spec.palNom=spec.palNom||name;
    if(spec.emCost===undefined) spec.emCost=em;
    if(spec.descText===undefined) spec.descText=desc;
    if(spec.palierNiv===undefined) spec.palierNiv=pal.niv||0;
    out.push(spec);
  }
  if(f.classe==='Conjurateur' && /Soin Encha/i.test(name)){
    var heals=[];
    var re=/([012])\s*action[^:]*:\s*(\d+)\+Niv/ig, m;
    while((m=re.exec(desc))) heals.push({sac:parseInt(m[1],10), base:parseInt(m[2],10)});
    if(!heals.length){
      var ns=(String(desc).match(/-?\d+/g)||[]); if(ns.length>=3) heals=[{sac:0,base:+ns[0]},{sac:1,base:+ns[1]},{sac:2,base:+ns[2]}];
    }
    heals.forEach(function(h){
      var needed=1+(h.sac||0);
      if((actLeft||1) < needed) return;
      push({ action:'soin', kind:'heal', label:name+' · -'+(h.sac||0)+' action', healAmt:cDamageWithLevel(h.base, info.level), consumeActions:needed, actsSacr:h.sac||0, targetType:'ally' });
    });
    return out;
  }
  if(f.classe==='Flécheur' && /Jugement/i.test(name)){
    var shots=[];
    var re2=/([012])\s*action[^:]*:\s*(\d+)\+Niv/ig, m2;
    while((m2=re2.exec(desc))) shots.push({sac:parseInt(m2[1],10), base:parseInt(m2[2],10)});
    if(!shots.length){
      var ns2=(String(desc).match(/-?\d+/g)||[]); if(ns2.length>=3) shots=[{sac:0,base:+ns2[0]},{sac:1,base:+ns2[1]},{sac:2,base:+ns2[2]}];
    }
    shots.forEach(function(s){
      var needed=1+(s.sac||0);
      if((actLeft||1) < needed) return;
      push({ label:name+' · -'+(s.sac||0)+' action', value:cDamageWithLevel(s.base, info.level), consumeActions:needed, targetType:'enemy' });
    });
    return out;
  }
  if(f.classe==='Elementaliste'){
    var nums=(String(desc).match(/-?\d+/g)||[]).map(function(n){ return parseInt(n,10); });
    if(/Feu/i.test(desc) && /Glace/i.test(desc)){
      var fire=nums[0]||8, ice=nums[1]||5, combo=nums[2]||7, armor=nums[3]||10;
      push({ label:'🔥 Poing Ardent', palNom:name, emCost:6, value:cDamageWithLevel(fire, info.level), targetType:'enemy', elementKey:'fire', statusToTarget:'brulure', comboDamage:cDamageWithLevel(combo, info.level), briseArmure:armor });
      push({ label:'❄ Poing Polaire', palNom:name, emCost:4, value:cDamageWithLevel(ice, info.level), targetType:'enemy', elementKey:'ice', statusToTarget:'gel', comboDamage:cDamageWithLevel(combo, info.level), briseArmure:armor });
      return out;
    }
    if(/Foudre/i.test(desc) && /Eau/i.test(desc)){
      var thunder=nums[0]||6, water=nums[1]||4, selfEp=nums[2]||10, drain=Math.abs(nums[3]||5);
      push({ label:'⚡ Poing Foudre', palNom:name, emCost:6, value:cDamageWithLevel(thunder, info.level), targetType:'enemy', elementKey:'thunder', comboSelfEpGain:selfEp, comboEpDrain:drain });
      push({ label:'💧 Poing Aquatique', palNom:name, emCost:4, value:cDamageWithLevel(water, info.level), targetType:'enemy', elementKey:'water', comboSelfEpGain:selfEp, comboEpDrain:drain });
      return out;
    }
  }
  if(f.classe==='Evocateur'){
    var isTortue=/Tortue/i.test(name), isCrabe=/Crabe/i.test(name);
    var sumName=isTortue?'Tortue Bipède':(isCrabe?'Crabe Canon':name);
    var already=cActiveSummonForOwner(p.id);
    if(!already && !cHasUsedSummon(p.id,sumName)){
      var nums3=(String(desc).match(/-?\d+/g)||[]).map(function(n){ return parseInt(n,10); });
      var pvBase=nums3[0]||8, dmgBase=nums3[1]||4, perAction=nums3[2]||6;
      push({ kind:'summon', label:(isTortue?'🐢 ':'🦀 ')+sumName, targetType:'none', summon:{name:sumName, pv:cDamageWithLevel(pvBase, info.level), dmg:cDamageWithLevel(dmgBase, info.level), actCost:perAction, autoInterpose:isTortue, rangeType:isCrabe?'distance':'cac', ownerPid:p.id} });
    }
    return out;
  }
  if(/Taille Double/i.test(name)){
    push({ label:name, value:cDamageWithLevel(cFirstNumber(desc,5), info.level), hits:2, targetType:'enemy' });
    return out;
  }
  if(/Rafale de Lames/i.test(name)){
    push({ label:name, value:cDamageWithLevel(cFirstNumber(desc,1), info.level), hits:3, targetType:'enemy' });
    return out;
  }
  if(/Spirale Brisante/i.test(name) || /Salve Aveugle/i.test(name) || /Domaine Étoilé/i.test(name)){
    push({ label:name, value:cDamageWithLevel(cFirstNumber(desc,8), info.level), aoe:true, aoeIncludesAllies:true, targetType:'none', undefendable:/IND[ÉE]FENDABLE|ind[ée]fendable/i.test(desc) });
    return out;
  }
  if(/Appel du Bouclier/i.test(name)){
    push({ label:name, kind:'buff', targetType:'none', provoke:true, perEnemyPvMax:cDamageWithLevel(cFirstNumber(desc,3), info.level) });
    return out;
  }
  if(/Bash Cinglant/i.test(name)){
    var nsb=(String(desc).match(/-?\d+/g)||[]).map(function(n){ return parseInt(n,10); });
    push({ label:name, value:cDamageWithLevel(nsb[0]||5, info.level), targetType:'enemy', selfPvMaxBonus:(nsb[1]||3) });
    return out;
  }
  if(/Lance Drainante/i.test(name)){
    var nld=(String(desc).match(/-?\d+/g)||[]).map(function(n){ return parseInt(n,10); });
    push({ label:name, value:cDamageWithLevel(nld[0]||4, info.level), targetType:'enemy', epDrain:(nld[1]||8) });
    return out;
  }
  if(/Frappe Décha[iî]n[ée]e/i.test(name) && f.classe==='Conjurateur'){
    var nfd=(String(desc).match(/-?\d+/g)||[]).map(function(n){ return parseInt(n,10); });
    push({ action:'frappe_dechainees', label:name, value:cDamageWithLevel(nfd[0]||4, info.level), healAmt:(nfd[1]||4), targetType:'enemy', healTargetType:'ally' });
    return out;
  }
  if(/Lancer Bestial/i.test(name)){
    push({ label:name, value:cDamageWithLevel(cFirstNumber(desc,18), info.level), targetType:'enemy', disarm:true });
    return out;
  }
  if(/Lancer Li[ée]/i.test(name)){
    push({ label:name, value:cDamageWithLevel(cFirstNumber(desc,5), info.level), targetType:'enemy' });
    return out;
  }
  if(/Rayon Étoilé/i.test(name)){
    push({ label:name, value:cDamageWithLevel(cFirstNumber(desc,20), info.level), targetType:'enemy' });
    return out;
  }
  if(/Élan Tranchant|Tenue de Ligne/i.test(name)){
    var nums4=(String(desc).match(/-?\d+/g)||[]).map(function(n){ return parseInt(n,10); });
    var base=Math.max(nums4[0]||0, nums4[1]||0, cFirstNumber(desc,6));
    push({ label:name, value:cDamageWithLevel(base, info.level), targetType:'enemy', repulse:/repousse/i.test(desc) });
    return out;
  }
  if(/Toutes entit[ée]s/i.test(desc) || /Zone/i.test(desc)){
    push({ label:name, value:cDamageWithLevel(cFirstNumber(desc,8), info.level), aoe:true, aoeIncludesAllies:/alli[ée]es? ET ennemies?/i.test(desc), targetType:'none', undefendable:/IND[ÉE]FENDABLE|ind[ée]fendable/i.test(desc) });
    return out;
  }
  push({ label:name, value:cDamageWithLevel(cFirstNumber(desc,6), info.level), targetType:'enemy', repulse:/repousse/i.test(desc) });
  return out;
}
function cGetAbilityOptions(fi, actLeft){
  var info=cGetFighterSerment(fi);
  if(!info||!info.paliers||!info.paliers.length||!info.branch) return [];
  var out=[];
  info.paliers.forEach(function(pal){
    cBuildAbilityOptionsForPalier(info, pal, actLeft).forEach(function(op){ out.push(op); });
  });
  return out;
}
function cRenderAbilityButtons(fi, actLeft, accent, accentDim, accentBorder){
  var options=cGetAbilityOptions(fi, actLeft);
  if(!options.length) return '';
  var f=_cs.fighters[fi];
  var info=cGetFighterSerment(fi);
  var h='';
  h+='<div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:8px;margin-bottom:6px;">';
  if(info&&info.branch){
    h+='<div style="font-family:var(--fd);font-size:7px;letter-spacing:2px;color:'+accent+';margin-bottom:6px;">BRANCHE · '+esc(String(info.branch.nom||'').replace(/^Branche\s+[AB]\s+—\s*/,''))+'</div>';
  }
  var allies=_cs.fighters.filter(function(t,ti){ return ti!==fi && t.type===f.type && t.pvCur>0; });
  if(options.some(function(op){ return op.targetType==='ally' || op.healTargetType==='ally'; }) && allies.length){
    h+='<select id="decl-htgt-'+fi+'" onchange="csSet(\'h\','+fi+',this.value)" style="width:100%;font-size:9px;padding:3px 5px;background:rgba(90,170,122,0.04);border:1px solid rgba(90,170,122,0.2);color:var(--green);margin-bottom:6px;">';
    h+='<option value="">— Cible soin —</option>';
    allies.forEach(function(t){ var ti=_cs.fighters.indexOf(t); h+='<option value="'+ti+'">'+esc(t.name)+' · '+t.pvCur+'/'+t.pvMax+' PV</option>'; });
    h+='</select>';
  }
  options.forEach(function(op){
    var isHeal=op.kind==='heal';
    var bg=isHeal?'rgba(90,170,122,0.06)':accentDim;
    var bd=isHeal?'rgba(90,170,122,0.2)':accentBorder;
    var col=isHeal?'var(--green)':accent;
    var sub=[];
    if(op.palierNiv) sub.push('Palier '+op.palierNiv);
    if(op.emCost) sub.push('−'+op.emCost+' EM');
    if(op.epCost) sub.push('−'+op.epCost+' EP');
    if(op.consumeActions&&op.consumeActions>1) sub.push(op.consumeActions+' actions');
    if(op.hits) sub.push(op.hits+' hits');
    if(op.aoe) sub.push('AOE');
    if(op.provoke) sub.push('Aggro');
    if(op.kind==='summon') sub.push('Invocation');
    var payload=cSerializeOpts(op);
    var guard='';
    if(op.targetType==='enemy') guard="var _t=parseInt(document.getElementById('decl-tgt-"+fi+"').value);if(isNaN(_t)){var _s=document.getElementById('decl-tgt-"+fi+"');_s.style.borderColor='var(--red)';_s.style.boxShadow='0 0 0 2px rgba(201,74,74,0.4)';setTimeout(function(){_s.style.borderColor='';_s.style.boxShadow='';},1500);return;}window.__cDeclTarget=_t;";
    if(op.targetType==='ally') guard="var _ht=parseInt((document.getElementById('decl-htgt-"+fi+"')&&document.getElementById('decl-htgt-"+fi+"').value)||csGet('h',"+fi+")||-1);if(isNaN(_ht)||_ht<0){return;}window.__cDeclHealTarget=_ht;";
    if(op.targetType==='enemy'&&op.healTargetType==='ally') guard+="var _hel=document.getElementById('decl-htgt-"+fi+"');var _htv=_hel&&_hel.value?parseInt(_hel.value):-1;if(!isNaN(_htv)&&_htv>=0)window.__cDeclHealTarget=_htv;";
    var onclick=guard+"var _o=JSON.parse(this.getAttribute('data-opts'));if(window.__cDeclTarget!==undefined){_o.target=window.__cDeclTarget;window.__cDeclTarget=undefined;}if(window.__cDeclHealTarget!==undefined){_o.healTarget=window.__cDeclHealTarget;window.__cDeclHealTarget=undefined;}cDeclareAction("+fi+",_o.action||'capacite',_o);";
    h+='<button data-opts=\''+payload+'\' onclick="'+onclick+'" style="width:100%;padding:8px 8px;background:'+bg+';border:1px solid '+bd+';cursor:pointer;text-align:left;transition:all .15s;margin-bottom:6px;" onmouseover="this.style.opacity=\'0.84\'" onmouseout="this.style.opacity=\'1\'">';
    h+='<div style="font-size:10px;color:'+col+';display:flex;justify-content:space-between;gap:8px;align-items:flex-start;"><span>'+esc(op.label||op.palNom||'Capacité')+'</span>'+(op.value?'<span style="color:var(--text);">'+op.value+' dmg</span>':(op.healAmt?'<span style="color:var(--green);">+'+op.healAmt+' PV</span>':''))+'</div>';
    if(op.descText) h+='<div style="font-size:9px;color:rgba(255,255,255,0.45);margin-top:3px;line-height:1.45;">'+esc(op.descText)+'</div>';
    h+='<div style="font-family:var(--fm);font-size:7px;color:rgba(255,255,255,0.22);margin-top:3px;">'+esc(sub.join(' · '))+'</div>';
    h+='</button>';
  });
  h+='</div>';
  return h;
}
function cFindAutoInterpose(target){
  return (_cs.fighters||[]).find(function(x){
    return x&&x.isSummon&&x.autoInterpose&&x.ownerPid&&target&&target.pid===x.ownerPid&&x.type===target.type&&x.pvCur>0;
  })||null;
}
function cEnsureFighterCid(f){
  if(!f) return "";
  if(!f._cid) f._cid="cf"+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  return f._cid;
}
function cFindFighterByCid(cid){
  if(!cid) return null;
  return (_cs.fighters||[]).find(function(x){ return x&&x._cid===cid; }) || null;
}
function cIsAggressiveTauntProfile(f){
  var beh=String((f&&((f.beh!==undefined?f.beh:f.behavior)!==undefined?(f.beh!==undefined?f.beh:f.behavior):f.comportement))||"");
  return /Agressif|Très agressif/i.test(beh);
}
function cGetForcedTargetInfo(fi){
  var f=_cs.fighters[fi];
  if(!f||!f.taunt) return null;
  var t=f.taunt||{};
  var src=cFindFighterByCid(t.sourceCid);
  if(!src||src.pvCur<=0||src.type===f.type){ delete f.taunt; return null; }
  return { source:src, sourceCid:t.sourceCid, sourceName:t.sourceName||src.name, permanent:!!t.permanent, untilRound:parseInt(t.untilRound,10)||0 };
}
function cCountTauntedBySource(fi){
  var src=_cs.fighters[fi]; if(!src) return 0;
  var cid=cEnsureFighterCid(src), n=0;
  (_cs.fighters||[]).forEach(function(t,ti){
    if(!t||ti===fi) return;
    var info=cGetForcedTargetInfo(ti);
    if(info&&info.sourceCid===cid) n++;
  });
  return n;
}
function cApplyShieldCallTaunt(fi, perEnemyPvMax){
  var f=_cs.fighters[fi]; if(!f) return;
  var foes=_cs.fighters.filter(function(t){ return t&&t.type!==f.type&&t.pvCur>0; });
  var sourceCid=cEnsureFighterCid(f);
  var tempCount=0, permCount=0;
  foes.forEach(function(t){
    cEnsureFighterCid(t);
    var permanent=(t.type==='beast'&&cIsAggressiveTauntProfile(t));
    t.taunt={ sourceCid:sourceCid, sourceName:f.name, permanent:permanent, untilRound: permanent?0:((_cs.round||1)+1) };
    if(permanent) permCount++; else tempCount++;
  });
  var tot=(perEnemyPvMax||0)*foes.length;
  if(tot>0){
    f.pvMaxBonus=(f.pvMaxBonus||0)+tot;
    f.pvMax+=tot;
    f.pvCur=Math.min(f.pvCur+tot,f.pvMax);
    cLog("🛡 "+f.name+" attire l'aggro et gagne +"+tot+" PV max","heal");
  }
  if(tempCount||permCount){
    var parts=[];
    if(tempCount) parts.push(tempCount+" bloqué"+(tempCount>1?"s":"")+" 1 tour");
    if(permCount) parts.push(permCount+" verrouillé"+(permCount>1?"s":"")+" tant que l'appel reste actif");
    cLog("🎯 "+f.name+" fixe "+parts.join(" · "),"info");
  }
}
function cDisableShieldCall(fi, silent){
  var f=_cs.fighters[fi]; if(!f) return 0;
  var cid=cEnsureFighterCid(f), removed=0;
  (_cs.fighters||[]).forEach(function(t){
    if(t&&t.taunt&&t.taunt.sourceCid===cid){ delete t.taunt; removed++; }
  });
  if(removed&&!silent) cLog("🛑 "+f.name+" désactive son Appel du Bouclier ("+removed+" cible"+(removed>1?"s":"")+" libérée"+(removed>1?"s":"")+")","info");
  return removed;
}
function cTickShieldCallTaunts(){
  (_cs.fighters||[]).forEach(function(f,fi){
    var info=cGetForcedTargetInfo(fi);
    if(!info) return;
    if(!info.permanent&&info.untilRound>0&&(_cs.round||1)>info.untilRound){
      var srcName=info.sourceName||((info.source&&info.source.name)||"la cible");
      delete f.taunt;
      cLog("✓ "+f.name+" n'est plus bloqué par "+srcName,"info");
    }
  });
}
function cGetDeclaredTargetActionBonus(fi){
  var f=_cs.fighters[fi]; if(!f||f.isSummon) return 0;
  var decls=cDecl(fi);
  var best=0;
  decls.forEach(function(a){
    if(!a) return;
    var ti=parseInt(a.target,10);
    if(!Number.isFinite(ti)) return;
    var target=_cs.fighters[ti];
    if(!target||target.pvCur<=0||target.type===f.type) return;
    best=Math.max(best, Math.max(0,(f.level||1)-(target.level||1)));
  });
  return best;
}

function cGetFighterActionDebuff(fi){
  var f=_cs.fighters[fi]; if(!f) return 0;
  var malus=0;
  (f.statuts||[]).forEach(function(st){
    if(!st||!st.id) return;
    if(st.id==='etourdi') malus=Math.max(malus,2);
    else if(st.id==='entrave') malus=Math.max(malus,1);
  });
  return malus;
}

function cGetFighterActionBonus(fi){
  return cGetDeclaredTargetActionBonus(fi);
}

// Calcul actions disponibles pour un combattant
function cActionsMax(fi){
  var f=_cs.fighters[fi]; if(!f) return 3;
  if(f.isSummon) return f.actionsMax||2;
  var baseActions=3;
  var debuff=cGetFighterActionDebuff(fi);
  var effectiveBase=Math.max(1, baseActions-debuff);
  return effectiveBase + cGetFighterActionBonus(fi);
}

// Déclarations du combattant actuel
function cDecl(fi){ return (_cs.decl=_cs.decl||{})[fi]||[]; }
function cDeclCount(fi){ return cDecl(fi).reduce(function(sum,a){ return sum + (a&&a.consumeActions?a.consumeActions:1); },0); }
function cActionsLeft(fi){
  return Math.max(0, cActionsMax(fi) - cDeclCount(fi));
}

// ── Démarrer ──────────────────────────────────────────────────────────────────
function combatStart(){
  if(_cs.active){ notif("Combat déjà en cours.","inf"); return; }
  if(!_cs.fighters.length){ notif("Ajoute des combattants.","err"); return; }
  _cs.active=true; _cs.round=1;
  _cs.log=[]; _cs.decl={}; _cs._iv={};
  _cs.phase="declaration";
  _cs.turn=0;
  // Ordre : initiateur en premier
  var initFi=typeof _cs.initiative==="number"?_cs.initiative:0;
  var all=_cs.fighters.map(function(_,i){return i;});
  _cs.order=[initFi].concat(all.filter(function(i){return i!==initFi;}));
  if(!_cs.id) _cs.id="c"+Date.now();
  if(!_cs.name) _cs.name="Combat du "+new Date().toLocaleDateString("fr-FR");
  _cs.fighters.forEach(function(f){ f.statuts=f.statuts||[]; cEnsureFighterCid(f); });
  cLog("⚔ Combat démarré — Round 1","round");
  _nextDeclarant();
  rCombat("p-combat-mj-c");
}

function _nextDeclarant(){
  // Avancer au prochain combattant vivant
  while(_cs.turn<_cs.order.length){
    var fi=_cs.order[_cs.turn];
    var f=_cs.fighters[fi];
    if(f&&f.pvCur>0) break;
    _cs.turn++;
  }
  if(_cs.turn>=_cs.order.length){
    // Tout le monde a déclaré → passer en résolution
    _cs.phase="resolution";
  } else {
    var f=_cs.fighters[_cs.order[_cs.turn]];
    if(f) cLog("📋 Déclaration de : "+f.name,"turn");
  }
}

// ── Déclarer une action ───────────────────────────────────────────────────────
function cDeclareAction(fi, action, opts){
  opts=opts||{};
  var f=_cs.fighters[fi]; if(!f) return;
  if(_cs.phase!=="declaration"){ notif("Phase de déclaration terminée.","inf"); return; }
  var curFi=_cs.order[_cs.turn];
  if(curFi!==fi){ notif("Ce n'est pas le tour de déclaration de "+f.name+".","err"); return; }
  var left=cActionsLeft(fi);
  var consume=Math.max(1, parseInt(opts.consumeActions||1,10)||1);
  if(left<=0 && action!=="passer"){
    notif(f.name+" n'a plus d'actions à déclarer.","inf"); return;
  }
  if(action!=="passer" && consume>left){
    notif("Pas assez d'actions restantes pour cette compétence.","err"); return;
  }
  _cs.decl=_cs.decl||{};
  _cs.decl[fi]=_cs.decl[fi]||[];

  var sd=f.type==="player"?(getAllSD()[f.classe]||null):null;
  var dmgBase=sd?sd.dmg:(f.dmgBase||6);
  var dmg=dmgBase+(f.level||1);
  var pugDmg=4+(f.level||1);

  var entry={action:action, label:opts.label||"", target:opts.target, defenseOf:opts.defenseOf, consumeActions:consume, kind:opts.kind||"utility"};

  switch(action){
    case "frappe":
      entry.kind="attack"; entry.value=dmg; entry.label=entry.label||("⚔ Frappe ("+dmg+")"); entry.epCost=6; break;
    case "pugilat":
      entry.kind="attack"; entry.value=pugDmg; entry.label=entry.label||("👊 Pugilat ("+pugDmg+")"); entry.epCost=6; break;
    case "esquive":
      entry.kind="defense"; entry.value=0; entry.label=entry.label||"🛡 Esquive"; entry.epCost=8; break;
    case "bloquer":
      entry.kind="defense"; entry.value=0;
      if(f.type==="beast"){
        entry.label=entry.label||"🛡 Bloquer (corps) −25%";
        entry.epCost=2;
        entry.blockPct=25;
      } else {
        entry.label=entry.label||"🛡 Bloquer −50%";
        entry.epCost=5;
        entry.blockPct=50;
      }
      break;
    case "parer":
      entry.kind="defense"; entry.value=0;
      if(f.type==="beast"){
        entry.label=entry.label||"🛡 Bloquer (corps) −25%";
        entry.epCost=2;
        entry.blockPct=25;
      } else {
        entry.label=entry.label||"🤜 Parer −25%";
        entry.epCost=0;
      }
      break;
    case "subit":
      entry.kind="defense"; entry.value=0; entry.label=entry.label||"🩸 Subit"; entry.epCost=0; break;
    case "deplacer":
      entry.kind="utility"; entry.value=0; entry.label=entry.label||"🏃 Déplacement"; entry.epCost=10; break;
    case "capacite":
      entry.kind=opts.kind||((opts.value||opts.hits||opts.aoe)?"attack":"utility");
      entry.label=entry.label||("✨ "+(opts.palNom||"Capacité"));
      entry.emCost=opts.emCost||0;
      entry.epCost=opts.epCost||0;
      entry.value=opts.value||0;
      entry.palNom=opts.palNom;
      entry.hits=opts.hits||0;
      entry.aoe=!!opts.aoe;
      entry.aoeIncludesAllies=!!opts.aoeIncludesAllies;
      entry.undefendable=!!opts.undefendable;
      entry.onlyDodge=!!opts.onlyDodge;
      entry.healAmt=opts.healAmt||0;
      entry.healTarget=opts.healTarget;
      entry.epDrain=opts.epDrain||0;
      entry.selfEpGain=opts.selfEpGain||0;
      entry.comboSelfEpGain=opts.comboSelfEpGain||0;
      entry.comboEpDrain=opts.comboEpDrain||0;
      entry.statusToTarget=opts.statusToTarget||"";
      entry.briseArmure=opts.briseArmure||0;
      entry.comboDamage=opts.comboDamage||0;
      entry.elementKey=opts.elementKey||"";
      entry.selfPvMaxBonus=opts.selfPvMaxBonus||0;
      entry.perEnemyPvMax=opts.perEnemyPvMax||0;
      entry.provoke=!!opts.provoke;
      entry.repulse=!!opts.repulse;
      entry.disarm=!!opts.disarm;
      entry.summon=opts.summon||null;
      break;
    case "soin":
      entry.kind="heal"; entry.label=entry.label||("💚 Soin ("+(opts.healAmt||0)+" PV)"); entry.emCost=opts.emCost||0; entry.epCost=opts.epCost||0; entry.healAmt=opts.healAmt||0; entry.healTarget=opts.healTarget; entry.actsSacr=opts.actsSacr||0; break;
    case "frappe_dechainees":
      entry.kind="attack"; entry.label=entry.label||("⚔💚 Frappe Déchaînée ("+(opts.value||dmg)+")"); entry.emCost=opts.emCost||0; entry.value=opts.value||dmg; entry.healAmt=opts.healAmt||0; entry.healTarget=opts.healTarget; break;
    case "passer":
      entry.kind="utility"; entry.label=entry.label||"⏭ Passer"; entry.epCost=0; break;
  }

  var forced=cGetForcedTargetInfo(fi);
  if(forced&&entry&&entry.kind==="attack"&&entry.target!==undefined&&entry.target!==null&&entry.target!==""){
    var forcedIndex=_cs.fighters.indexOf(forced.source);
    if(forcedIndex>=0){
      entry.target=forcedIndex;
      entry.tauntLocked=true;
      entry.tauntSourceName=forced.sourceName||forced.source.name;
    }
  }
  if(action==="passer"){
    var toFill=left;
    for(var i=0;i<toFill;i++) _cs.decl[fi].push({action:"passer",label:"—",value:0,epCost:0,consumeActions:1,kind:"utility"});
  } else {
    _cs.decl[fi].push(entry);
  }

  var newLeft=cActionsLeft(fi);
  if(newLeft<=0||action==="passer"){
    _cs.turn++;
    _nextDeclarant();
  }

  rCombat("p-combat-mj-c");
}

// Retirer la dernière déclaration du combattant actuel
function cUndoLastDecl(fi){
  if(!_cs.decl||!_cs.decl[fi]||!_cs.decl[fi].length) return;
  _cs.decl[fi].pop();
  rCombat("p-combat-mj-c");
}

// Revenir à la déclaration d'un combattant précédent
function cEditDecl(fi){
  if(_cs.phase!=="declaration"&&_cs.phase!=="resolution") return;
  // Vider les déclarations de tous les combattants APRÈS fi dans l'ordre
  var pos=_cs.order.indexOf(fi);
  if(pos<0) return;
  combatSnapshot();
  for(var i=pos;i<_cs.order.length;i++){
    var f2=_cs.order[i];
    if(_cs.decl) _cs.decl[f2]=[];
  }
  _cs.turn=pos;
  _cs.phase="declaration";
  var f=_cs.fighters[fi];
  if(f) cLog("✏ Modification déclaration : "+f.name,"info");
  rCombat("p-combat-mj-c");
}

// ── RÉSOLUTION ────────────────────────────────────────────────────────────────
function cApplyRawDamage(target,dmg){
  dmg=Math.max(0,Math.ceil(dmg||0));
  if((target.briseArmureBonus||0)>0){
    dmg+=target.briseArmureBonus;
    cLog("💔 "+target.name+" subit +"+target.briseArmureBonus+" dégâts (Brise-Armure)","damage");
    target.briseArmureBonus=0;
  }
  var old=target.pvCur;
  if((target.pvMaxBonus||0)>0){
    var sa=Math.min(target.pvMaxBonus,dmg), rd=dmg-sa;
    target.pvMaxBonus-=sa; target.pvMax-=sa; target.pvCur=Math.max(0,target.pvCur-sa);
    if(rd>0) target.pvCur=Math.max(0,target.pvCur-rd);
  } else {
    target.pvCur=Math.max(0,target.pvCur-dmg);
  }
  return {old:old,newPv:target.pvCur,ko:(target.pvCur<=0&&old>0),dmg:dmg};
}
function cAddOrRefreshStatut(target, sid, tours){
  if(!sid||!target) return;
  target.statuts=target.statuts||[];
  var ex=target.statuts.find(function(s){ return s.id===sid; });
  if(ex) ex.tours=Math.max(ex.tours||0,tours||2);
  else target.statuts.push({id:sid,tours:tours||2});
  var def=STATUT_EFFECTS[sid]||{label:sid};
  cLog("⚠ "+target.name+" : "+def.label+" ("+(tours||2)+"T)", (sid==="saignement"||sid==="empoisonne"||sid==="brulure")?"damage":"info");
}
function cApplyElementalLogic(attacker, atk, target, baseDmg){
  var state=attacker._elemState||{last:null,count:0};
  var dmg=baseDmg;
  if(!atk.elementKey) return {dmg:dmg};
  if(state.last===atk.elementKey){
    state.count=(state.count||0)+1;
    if(state.count>=3){
      var penalty=Math.max(0.1, 1-0.25*(state.count-2));
      dmg=Math.max(0,Math.ceil(dmg*penalty));
      cLog("⚖ "+attacker.name+" subit un malus élémentaire sur "+(atk.label||atk.palNom||"attaque")+" (x"+penalty.toFixed(2)+")","info");
    }
  } else {
    if(state.last&&state.count>=2&&target){
      if(state.last==="ice" && atk.elementKey==="fire" && atk.comboDamage){
        var burst=cApplyRawDamage(target, atk.comboDamage);
        cLog("🔥❄ Givre-Brûlure : "+target.name+" subit −"+burst.dmg+" PV bonus ("+burst.old+"→"+burst.newPv+")","damage");
      } else if(state.last==="fire" && atk.elementKey==="ice" && atk.briseArmure){
        target.briseArmureBonus=atk.briseArmure;
        cLog("🔥❄ Embrasement : prochain coup sur "+target.name+" infligera +"+atk.briseArmure+" dégâts","info");
      } else if(state.last==="thunder" && atk.elementKey==="water" && atk.comboSelfEpGain){
        var oldEp=attacker.epCur; attacker.epCur=Math.min(attacker.epMax||999, attacker.epCur + atk.comboSelfEpGain);
        cLog("⚡💧 Électrocution : "+attacker.name+" regagne +"+(attacker.epCur-oldEp)+" EP","heal");
      } else if(state.last==="water" && atk.elementKey==="thunder" && atk.comboEpDrain){
        var oldTEp=target.epCur; target.epCur=Math.max(0,(target.epCur||0)-atk.comboEpDrain);
        cLog("💧⚡ Noyade électrique : "+target.name+" perd "+(oldTEp-target.epCur)+" EP","info");
      }
    }
    state.last=atk.elementKey;
    state.count=1;
  }
  attacker._elemState=state;
  return {dmg:dmg};
}
function cGetAttackTargets(fi, attacker, atk){
  if(atk.aoe){
    return _cs.fighters.map(function(t,ti){ return {target:t,ti:ti}; }).filter(function(x){
      if(!x.target||x.target.pvCur<=0||x.ti===fi) return false;
      if(atk.aoeIncludesAllies) return true;
      return x.target.type!==attacker.type;
    });
  }
  var ti=atk.target;
  if(ti===undefined||ti===null||ti===""||isNaN(parseInt(ti,10))) return [];
  ti=parseInt(ti,10);
  var target=_cs.fighters[ti];
  return target?[{target:target,ti:ti}]:[];
}
function cResolveAttackInstance(attacker, fi, atk){
  var targets=cGetAttackTargets(fi, attacker, atk);
  if(!targets.length) return;
  targets.forEach(function(pair){
    var target=pair.target, ti=pair.ti;
    if(!target||target.pvCur<=0) return;
    var redirected=cFindAutoInterpose(target);
    if(redirected){
      cLog("🛡 "+redirected.name+" s'interpose pour "+target.name,"info");
      target=redirected; ti=_cs.fighters.indexOf(redirected);
    }
    var dmg=atk.value||0;
    var elem=cApplyElementalLogic(attacker, atk, target, dmg); dmg=elem.dmg;
    var defDesc="";
    if(!atk.undefendable){
      var tgtDefenses=((_cs.decl||{})[ti]||[]).filter(function(d){ return d.action==="esquive"||d.action==="bloquer"||d.action==="parer"; });
      var usedDefs=_cs._usedDefs=_cs._usedDefs||{};
      var defKey=ti+"_def";
      if(!usedDefs[defKey]) usedDefs[defKey]=0;
      var def=null, defIdx=-1;
      for(var di=usedDefs[defKey]; di<tgtDefenses.length; di++){
        var cand=tgtDefenses[di];
        if(atk.onlyDodge && cand.action!=="esquive") continue;
        def=cand; defIdx=di; break;
      }
      if(def){
        usedDefs[defKey]=defIdx+1;
        if(def.action==="esquive"){
          combatQueueFx({kind:'dodge',fromCid:cEnsureFighterCid(attacker),toCid:cEnsureFighterCid(target),text:'ESQUIVE'});
          cLog("🛡 "+target.name+" esquive l'attaque de "+attacker.name+" — 0 dégâts","info");
          return;
        } else if(def.action==="bloquer"){
          var blockPct=typeof def.blockPct==='number'?def.blockPct:(target&&target.type==="beast"?25:50);
          dmg=Math.ceil(dmg*(1-(blockPct/100)));
          defDesc=target&&target.type==="beast"?" (bloqué avec le corps −"+blockPct+"%)":" (bloqué −"+blockPct+"%)";
        } else if(def.action==="parer"){
          if(target&&target.type==="beast"){
            dmg=Math.ceil(dmg*0.75); defDesc=" (bloqué avec le corps −25%)";
          } else {
            dmg=Math.ceil(dmg*0.75); defDesc=" (paré −25%)";
          }
        }
        else if(def.action==="subit"){
          defDesc=" (subit)";
        }
      }
    }
    var res=cApplyRawDamage(target,dmg);
    combatQueueFx({kind:res.ko?'ko':'hit',fromCid:cEnsureFighterCid(attacker),toCid:cEnsureFighterCid(target),text:(res.ko?'KO · ':'−')+res.dmg+' PV'});
    cLog("💥 "+attacker.name+" → "+target.name+" : −"+res.dmg+" PV"+defDesc+" ("+res.old+"→"+res.newPv+")"+(res.ko?" 💀 KO!":""),"damage");
    if(atk.statusToTarget) cAddOrRefreshStatut(target, atk.statusToTarget, 2);
    if(atk.epDrain){ var oldEp=target.epCur; target.epCur=Math.max(0,(target.epCur||0)-atk.epDrain); cLog("⚡ "+target.name+" perd "+(oldEp-target.epCur)+" EP","info"); }
    if(atk.selfEpGain){ var oldSEp=attacker.epCur; attacker.epCur=Math.min(attacker.epMax||999,(attacker.epCur||0)+atk.selfEpGain); cLog("⚡ "+attacker.name+" regagne +"+(attacker.epCur-oldSEp)+" EP","heal"); }
    if(atk.briseArmure && !atk.elementKey){ target.briseArmureBonus=atk.briseArmure; cLog("💔 "+target.name+" est fragilisé : prochain coup +"+atk.briseArmure+" dégâts","info"); }
    if(atk.repulse) cLog("↔ "+target.name+" est repoussé par "+attacker.name,"info");
    if(atk.disarm) cLog("🪓 "+attacker.name+" a lancé son arme — à récupérer ou réinvoquer IRP","info");
    if(atk.selfPvMaxBonus){ attacker.pvMaxBonus=(attacker.pvMaxBonus||0)+atk.selfPvMaxBonus; attacker.pvMax+=atk.selfPvMaxBonus; attacker.pvCur=Math.min(attacker.pvCur+atk.selfPvMaxBonus, attacker.pvMax); cLog("🛡 "+attacker.name+" gagne +"+atk.selfPvMaxBonus+" PV max","heal"); }
    if(res.ko&&target.type==="beast") setTimeout(function(){openDropModal(target,ti);},1400);
    if(atk.action==="frappe_dechainees"&&atk.healAmt&&atk.healTarget!==undefined){
      var ht=_cs.fighters[parseInt(atk.healTarget,10)];
      if(ht){
        var o2=ht.pvCur;
        ht.pvCur=Math.min(ht.pvMax,ht.pvCur+atk.healAmt);
        combatQueueFx({kind:'heal',fromCid:cEnsureFighterCid(attacker),toCid:cEnsureFighterCid(ht),text:'+'+(ht.pvCur-o2)+' PV'});
        cLog("💚 Soin auto → "+ht.name+" +"+(ht.pvCur-o2)+" PV","heal");
      }
    }
  });
}
function combatResolve(){
  if(_cs.phase!=="resolution"){ notif("Les déclarations ne sont pas complètes.","inf"); return; }
  combatSnapshot();
  cLog("— Résolution Round "+_cs.round+" —","round");

  var decl=_cs.decl||{};
  var order=_cs.order||[];

  order.forEach(function(fi){
    var f=_cs.fighters[fi]; if(!f||f.pvCur<=0) return;
    var actions=decl[fi]||[];
    var epSpent=0, emSpent=0;
    actions.forEach(function(a){ epSpent+=(a.epCost||0); emSpent+=(a.emCost||0); });
    if(epSpent>f.epCur){
      cLog("⚡ "+f.name+" : EP insuffisant ("+f.epCur+" dispo, "+epSpent+" requis) — actions réduites","info");
      epSpent=f.epCur;
    }
    if(emSpent>f.emCur){
      cLog("⚡ "+f.name+" : EM insuffisante ("+f.emCur+" dispo, "+emSpent+" requis) — capacités annulées","info");
      var emAcc=0;
      actions.forEach(function(a){
        if((a.emCost||0)>0){ emAcc+=(a.emCost||0); if(emAcc>f.emCur){ a.action="annule"; a.label="[Annulé — EM]"; } }
      });
    }
    f.epCur=Math.max(0,f.epCur-epSpent);
    f.emCur=Math.max(0,f.emCur-emSpent);
  });

  order.forEach(function(fi){
    var attacker=_cs.fighters[fi]; if(!attacker||attacker.pvCur<=0) return;
    (decl[fi]||[]).forEach(function(atk){
      if(atk.action==="annule") return;
      if(!(atk.kind==="attack" || atk.action==="frappe" || atk.action==="pugilat" || atk.action==="frappe_dechainees" || (atk.action==="capacite" && ((atk.value||0)>0 || atk.hits || atk.aoe)))) return;
      var hits=Math.max(1, atk.hits||1);
      for(var h=0; h<hits; h++) cResolveAttackInstance(attacker, fi, atk);
    });
  });

  order.forEach(function(fi){
    var f=_cs.fighters[fi]; if(!f||f.pvCur<=0) return;
    (decl[fi]||[]).forEach(function(a){
      if(a.action==="annule") return;
      if((a.action==="soin" || (a.action==="capacite"&&a.healAmt>0))&&a.healAmt>0){
        var healIdx=(a.healTarget!==undefined&&a.healTarget!==null&&a.healTarget!=="")?parseInt(a.healTarget,10):fi;
        var ht2=_cs.fighters[healIdx];
        if(ht2){
          var o3=ht2.pvCur;
          ht2.pvCur=Math.min(ht2.pvMax,ht2.pvCur+(a.healAmt||0));
          combatQueueFx({kind:'heal',fromCid:cEnsureFighterCid(f),toCid:cEnsureFighterCid(ht2),text:'+'+(ht2.pvCur-o3)+' PV'});
          cLog("💚 "+f.name+" → "+ht2.name+" +"+(ht2.pvCur-o3)+" PV","heal");
        }
      }
      if(a.action==="capacite"&&a.provoke){
        cApplyShieldCallTaunt(fi, a.perEnemyPvMax||0);
      }
      if(a.action==="capacite"&&a.kind==="summon"&&a.summon){
        var sum=a.summon;
        if(cActiveSummonForOwner(sum.ownerPid) || cHasUsedSummon(sum.ownerPid, sum.name)) return;
        _cs.fighters.push({type:f.type,isSummon:true,ownerPid:sum.ownerPid,pid:sum.ownerPid,name:f.name+" · "+sum.name,classe:f.classe+" — Invocation",level:f.level||1,pvCur:sum.pv,pvMax:sum.pv,epCur:999,epMax:999,emCur:0,emMax:0,dmgBase:sum.dmg,statuts:[],actionsMax:2,autoInterpose:!!sum.autoInterpose,rangeType:sum.rangeType||"cac",img:""});
        combatQueueFx({kind:'heal',fromCid:cEnsureFighterCid(f),toCid:cEnsureFighterCid(_cs.fighters[_cs.fighters.length-1]),text:'INVOCATION'});
        cLog("🌀 "+f.name+" invoque "+sum.name+" ["+sum.ownerPid+":"+sum.name+"]","summon");
      }
      if(a.action==="capacite") cLog("✨ "+f.name+" : "+(a.palNom||a.label||"Capacité")+(a.emCost?" (−"+a.emCost+" EM)":""),"spell");
      if(a.action==="deplacer"){ combatQueueFx({kind:'dodge',fromCid:cEnsureFighterCid(f),toCid:cEnsureFighterCid(f),text:'DÉPLACEMENT'}); cLog("🏃 "+f.name+" se déplace","info"); }
    });
  });

  order.forEach(function(fi){ var f=_cs.fighters[fi]; if(!f||f.pvCur<=0) return; cTickStatuts(f,fi); });

  _cs._usedDefs={};
  _cs.decl={};
  _cs.round++;
  cTickShieldCallTaunts();
  _cs.fighters.forEach(function(f){ f._elemState=null; });
  _cs.turn=0;
  _cs.phase="declaration";

  var aliveP=_cs.fighters.filter(function(f){return f.pvCur>0&&f.type==="player";}).length;
  var aliveB=_cs.fighters.filter(function(f){return f.pvCur>0&&f.type==="beast";}).length;
  if(!aliveP){ cLog("💀 Tous les joueurs sont KO !","round"); _cs.phase="idle"; _cs.active=false; }
  else if(!aliveB){ cLog("🏆 Tous les monstres sont KO !","round"); _cs.phase="idle"; _cs.active=false; }
  else { cLog("— Round "+_cs.round+" — Déclarations","round"); _nextDeclarant(); }

  rCombat("p-combat-mj-c");
  setTimeout(combatPlayPendingFx, 80);
}

// ── Terminer manuellement ─────────────────────────────────────────────────────
function combatEnd(){
  cLog("🏁 Combat terminé — Round "+_cs.round,"round");
  _cs.fighters.forEach(function(f){
    if(f.type!=="player") return;
    var p=gpid(f.pid); if(!p) return;
    var realPvMax=f.pvMax-(f.pvMaxBonus||0);
    p.pvMax=realPvMax; p.pvCur=Math.min(f.pvCur,realPvMax);
    p.epCur=f.epCur; p.emCur=f.emCur;
    if(f.statuts&&f.statuts.length){ p.statuts=p.statuts||[]; f.statuts.forEach(function(st){ if(!p.statuts.find(function(s){return s.id===st.id;})) p.statuts.push({id:st.id,desc:"",posedBy:CU?CU.name:"MJ",posedAt:Date.now()}); }); }
    p.history=p.history||[];
    p.history.push({ts:Date.now(),type:"combat",text:"⚔ "+_cs.name+" — "+_cs.round+"R · PV:"+f.pvCur+"/"+f.pvMax+" EP:"+f.epCur+"/"+f.epMax,by:"MJ "+(CU?CU.name:"Staff"),combatId:_cs.id});
    up(p);
  });
  combatSaveArc();
  _cs.active=false; _cs.phase="idle"; _cs._surc={}; _cs._iv={};
  notif("Combat terminé. Fiches sauvegardées.","ok");
  rCombat("p-combat-mj-c");
}

// ── Combattants ───────────────────────────────────────────────────────────────
function combatToggleFighter(id,type){
  if(type==="player"){
    var i=_cs.fighters.findIndex(function(f){return f.pid===id&&f.type==="player";});
    if(i>=0){ _cs.fighters.splice(i,1); _cs._iv={}; }
    else {
      var p=gpid(id); if(!p) return;
      var sd=getAllSD()[p.classe]||{};
      _cs.fighters.push({type:"player",pid:p.id,name:p.name,classe:p.classe,level:p.level||1,
        pvCur:p.pvCur,pvMax:p.pvMax,epCur:p.epCur,epMax:p.epMax,emCur:p.emCur,emMax:p.emMax,
        dmgBase:sd.dmg||6,statuts:[],img:p.avatar||"",_cid:"cf"+Date.now().toString(36)+Math.random().toString(36).slice(2,8)});
    }
  } else {
    // Monstres : toujours ajouter une nouvelle instance
    combatAddBeast(id);
    return;
  }
  rCombat("p-combat-mj-c");
}

function combatAddBeast(id){
  var b=gb().find(function(x){return x.id===id;}); if(!b) return;
  var existing=_cs.fighters.filter(function(f){return f.bid===id;});
  // Renommer rétroactivement le premier si c'est le deuxième ajout
  if(existing.length===1&&existing[0].name===b.nom){
    existing[0].name=b.nom+" 1";
  }
  var num=existing.length>0?existing.length+1:existing.length===0?1:null;
  var displayName=num!==null?b.nom+" "+num:b.nom;
  // Si c'est le premier ET qu'il n'y a aucun autre du même type, garder sans numéro pour l'instant
  // (sera renommé "1" si un second est ajouté)
  if(existing.length===0) displayName=b.nom;
  _cs.fighters.push({type:"beast",bid:b.id,name:displayName,level:b.niv||1,
    pvCur:b.pv,pvMax:b.pv,epCur:b.ep,epMax:b.ep,emCur:0,emMax:0,
    dmgBase:parseInt((b.frappe||"6").match(/\d+/)||6),frappe:b.frappe||"",comp:b.comp||"",img:b.img||"",beh:b.beh||"Neutre",
    statuts:[],_cid:"cf"+Date.now().toString(36)+Math.random().toString(36).slice(2,8)});
  rCombat("p-combat-mj-c");
}

function combatRemoveFighter(fi){
  combatSnapshot();
  _cs.fighters.splice(fi,1);
  _cs._iv={}; _cs.decl={};
  if(_cs.active){
    _cs.order=_cs.fighters.map(function(_,i){return i;});
    if(_cs.turn>=_cs.fighters.length) _cs.turn=0;
  }
  rCombat("p-combat-mj-c");
}

function combatSetInit(fi){
  _cs.initiative=fi;
  var f=_cs.fighters[fi]; if(f) cLog("★ Initiative : "+f.name,"info");
  rCombat("p-combat-mj-c");
}

function combatMovePos(fi,newPos){
  var o=_cs.order, cur=o.indexOf(fi); if(cur<0) return;
  newPos=Math.max(0,Math.min(o.length-1,newPos-1));
  if(newPos===cur) return;
  o.splice(cur,1); o.splice(newPos,0,fi);
  var ct=_cs.turn;
  if(ct===cur) _cs.turn=newPos;
  else if(cur<ct&&newPos>=ct) _cs.turn=ct-1;
  else if(cur>ct&&newPos<=ct) _cs.turn=ct+1;
  _cs._iv={}; _cs.decl={};
  var f=_cs.fighters[fi]; if(f) cLog("↕ "+f.name+" → pos "+(newPos+1),"info");
  rCombat("p-combat-mj-c");
}


// ── Référentiel central des statuts ──────────────────────────────────────────
var STATUT_EFFECTS = window.STATUT_EFFECTS || {
  saignement: { label:"Saignement", col:"#c94a4a", icon:"🩸" },
  empoisonne: { label:"Empoisonné", col:"#77b36b", icon:"☠" },
  brulure:    { label:"Brûlure", col:"#d88a3d", icon:"🔥" },
  gel:        { label:"Gel", col:"#7eb8d4", icon:"❄" },
  etourdi:    { label:"Étourdi", col:"#d7b56d", icon:"💫" },
  entrave:    { label:"Entravé", col:"#8aa0b6", icon:"⛓" },
  aveugle:    { label:"Aveuglé", col:"#c7c4b8", icon:"◌" },
  silence:    { label:"Silence", col:"#8f8aa8", icon:"🔇" },
  peur:       { label:"Peur", col:"#9e7bc2", icon:"😨" },
  fragilise:  { label:"Fragilisé", col:"#d77c7c", icon:"🩹" },
  renforce:   { label:"Renforcé", col:"#77b38f", icon:"🛡" },
  inspire:    { label:"Inspiré", col:"#d8c27a", icon:"✦" }
};
window.STATUT_EFFECTS = STATUT_EFFECTS;

// ── Statuts de combat ─────────────────────────────────────────────────────────
function combatAddStatut(fi){
  var f=_cs.fighters[fi]; if(!f) return;
  var sel=ge("cst-sel-"+fi), toursEl=ge("cst-t-"+fi);
  if(!sel||!sel.value) return;
  var tours=toursEl?Math.max(1,parseInt(toursEl.value)||2):2;
  f.statuts=f.statuts||[];
  var ex=f.statuts.find(function(s){return s.id===sel.value;});
  if(ex) ex.tours=tours; else f.statuts.push({id:sel.value,tours:tours});
  cLog("⚠ "+f.name+" : "+(STATUT_EFFECTS[sel.value]||{}).label+" ("+tours+"T)",(sel.value==="saignement"||sel.value==="empoisonne")?"damage":"info");
  rCombat("p-combat-mj-c");
}

function combatRemoveStatut(fi,si){
  var f=_cs.fighters[fi]; if(!f) return;
  combatSnapshot();
  var st=f.statuts[si]; if(!st) return;
  cLog("✓ "+f.name+" : "+(STATUT_EFFECTS[st.id]||{}).label+" retiré","info");
  f.statuts.splice(si,1);
  rCombat("p-combat-mj-c");
}

function cTickStatuts(f,fi){
  f.statuts=f.statuts||[]; var rem=[];
  f.statuts.forEach(function(st,si){
    if(st.id==="saignement"){ var d=3; f.pvCur=Math.max(0,f.pvCur-d); cLog("🩸 "+f.name+" saigne −"+d+" PV (→"+f.pvCur+")","damage"); }
    else if(st.id==="empoisonne"){ var d2=Math.max(1,Math.ceil(f.pvMax*0.05)); f.pvCur=Math.max(0,f.pvCur-d2); cLog("☠ "+f.name+" empoisonné −"+d2+" PV (→"+f.pvCur+")","damage"); }
    st.tours--;
    if(st.tours<=0){ cLog("✓ "+f.name+" : "+(STATUT_EFFECTS[st.id]||{}).label+" dissipé","info"); rem.push(si); }
  });
  rem.reverse().forEach(function(si){f.statuts.splice(si,1);});
}

// ── Ajustements manuels ───────────────────────────────────────────────────────
function cAdj(fi,stat,delta){
  var f=_cs.fighters[fi]; if(!f) return;
  combatSnapshot();
  if(stat==="pv"&&delta<0&&(f.pvMaxBonus||0)>0){
    var dmg=Math.abs(delta);
    var sa=Math.min(f.pvMaxBonus,dmg), rd=dmg-sa;
    f.pvMaxBonus-=sa; f.pvMax-=sa; f.pvCur=Math.max(0,f.pvCur-sa);
    if(rd>0) f.pvCur=Math.max(0,f.pvCur-rd);
  } else {
    f[stat+"Cur"]=Math.max(0,Math.min(f[stat+"Max"]||999,(f[stat+"Cur"]||0)+delta));
  }
  rCombat("p-combat-mj-c");
}

// ── Drop ──────────────────────────────────────────────────────────────────────
function openDropModal(beast,fi){
  var b=gb().find(function(x){return x.id===beast.bid;});
  if(!b||!b.gem) return;
  var rows=parseGemTable(b.gem);
  var h='<div style="background:var(--bg3);border:1px solid var(--border);padding:12px;margin-bottom:14px;">';
  h+='<div style="font-family:var(--fd);font-size:8px;letter-spacing:2px;color:var(--faint);margin-bottom:8px;">TABLE DE DROP</div>';
  rows.forEach(function(r){
    var col=r.gem==="Aucune"?"var(--faint)":r.gem.indexOf("Blanche")>-1?"var(--dim)":r.gem.indexOf("Incarnate")>-1?"var(--purple)":"var(--red)";
    h+='<div style="display:flex;justify-content:space-between;margin-bottom:3px;"><span style="font-family:var(--fm);font-size:11px;color:var(--faint);">'+r.range+'</span><span style="font-size:12px;color:'+col+';">'+r.gem+'</span></div>';
  });
  h+='</div>';
  h+='<div id="drop-roll-zone" style="margin-bottom:14px;"><button class="btn" onclick="rollDropDie(\''+beast.bid+'\','+fi+')" style="width:100%;padding:14px;font-size:14px;"><span>🎲 Lancer le D100</span></button></div>';
  h+='<div id="drop-result"></div><div id="drop-attrib"></div>';
  ge("drop-title").textContent="💀 "+beast.name+" KO — Drop ?";
  ge("drop-body").innerHTML=h;
  openModal("m-drop");
}
function parseGemTable(str){
  return str.split(/\s*\/\s*/).map(function(p){
    var m=p.match(/(\d+)[–\-](\d+)\s*:\s*(.+)/);
    return m?{range:m[1]+"–"+m[2],min:+m[1],max:+m[2],gem:m[3].trim()}:null;
  }).filter(Boolean);
}
function combatPendingDrops(){
  if(!_cs||typeof _cs!=="object") _cs=combatBlankState();
  if(!_cs.pendingDrops||!Array.isArray(_cs.pendingDrops)) _cs.pendingDrops=[];
  return _cs.pendingDrops;
}
function combatGemTone(gem){
  return gem==="Aucune"?"var(--faint)":gem.indexOf("Blanche")>-1?"var(--dim)":gem.indexOf("Incarnate")>-1?"var(--purple)":"var(--red)";
}
function combatGrantGemToPlayer(pid,gem,bnom,meta){
  var p=gpid(pid); if(!p) return false;
  var ex=(p.inventory||[]).find(function(i){return i.name===gem&&i.category==="Gemme";});
  if(ex) ex.qty=(ex.qty||1)+1;
  else{ p.inventory=p.inventory||[]; p.inventory.push({id:"gem_"+Date.now(),name:gem,category:"Gemme",qty:1,desc:"Obtenue sur : "+bnom}); }
  p.history=p.history||[];
  var suffix=(meta&&meta.roll)?(" · "+meta.roll+"/100"):"";
  p.history.push({ts:Date.now(),type:"gemme",text:"💎 "+gem+" (sur "+bnom+suffix+")",by:"MJ "+(CU?CU.name:"Staff")});
  up(p);
  cLog("💎 "+gem+" → "+p.name+((meta&&meta.pending)?" (drop différé)":""),"spell");
  notif(gem+" attribuée à "+esc(p.name)+" ✓","ok");
  try{ combatQueueAutosave((meta&&meta.pending)?'pending_drop_attributed':'drop_attributed', 60); }catch(_e){}
  return true;
}
function queuePendingDropDecision(beastId,gem,roll,fi){
  var b=gb().find(function(x){return x.id===beastId;}); if(!b) return;
  var list=combatPendingDrops();
  list.unshift({
    id:'pd'+Date.now()+Math.floor(Math.random()*1000),
    beastId:b.id,
    beastName:b.nom||'Créature',
    gem:gem,
    roll:roll,
    round:_cs&&_cs.round?_cs.round:1,
    fi:typeof fi==='number'?fi:null,
    createdAt:Date.now()
  });
  cLog("💎 Drop différé : "+gem+" sur "+esc(b.nom)+" ("+roll+"/100)","info");
  try{ combatQueueAutosave('pending_drop', 60); }catch(_e){}
  notif("Drop mis en attente. Tu pourras l'attribuer plus tard.","ok");
  closeModal("m-drop");
  rCombat("p-combat-mj-c");
}
function attributePendingDrop(dropId,pid){
  var list=combatPendingDrops();
  var idx=list.findIndex(function(x){ return String(x&&x.id||'')===String(dropId||''); });
  if(idx<0) return;
  var drop=list[idx];
  if(!combatGrantGemToPlayer(pid, drop.gem, drop.beastName, {roll:drop.roll,pending:true})) return;
  list.splice(idx,1);
  try{ combatQueueAutosave('pending_drop_resolved', 60); }catch(_e){}
  rCombat("p-combat-mj-c");
}
function deletePendingDrop(dropId){
  var list=combatPendingDrops();
  var idx=list.findIndex(function(x){ return String(x&&x.id||'')===String(dropId||''); });
  if(idx<0) return;
  var drop=list[idx];
  if(typeof confirm==='function' && !confirm("Retirer ce drop en attente ?")) return;
  list.splice(idx,1);
  cLog("🗑 Drop retiré : "+(drop&&drop.gem?drop.gem:'Gemme')+" sur "+(drop&&drop.beastName?drop.beastName:'Créature'),"info");
  try{ combatQueueAutosave('pending_drop_deleted', 60); }catch(_e){}
  notif("Drop en attente retiré.","inf");
  rCombat("p-combat-mj-c");
}
function rollDropDie(beastId,fi){
  var roll=Math.floor(Math.random()*100)+1;
  var b=gb().find(function(x){return x.id===beastId;}); if(!b) return;
  var rows=parseGemTable(b.gem);
  var r=rows.find(function(row){return roll>=row.min&&roll<=row.max;});
  var gem=r?r.gem:"Aucune";
  var col=combatGemTone(gem);
  ge("drop-result").innerHTML='<div style="text-align:center;padding:16px;background:var(--bg3);border:1px solid var(--border);margin-bottom:14px;"><div style="font-family:var(--fm);font-size:40px;font-weight:700;color:var(--glacier);">'+roll+'</div><div style="font-family:var(--fd);font-size:11px;letter-spacing:2px;color:'+col+';margin-top:6px;">'+gem+'</div></div>';
  cLog("🎲 Drop "+esc(b.nom)+" : "+roll+" → "+gem,"info");
  if(gem==="Aucune"){ge("drop-attrib").innerHTML='<p style="color:var(--faint);text-align:center;font-style:italic;">Aucune gemme.</p>';return;}
  var ps=_cs.fighters.filter(function(f){return f.type==="player"&&f.pid;});
  var h='<div style="font-family:var(--fd);font-size:8px;letter-spacing:2px;color:var(--faint);margin-bottom:8px;">ATTRIBUER À</div><div style="display:flex;flex-direction:column;gap:6px;">';
  ps.forEach(function(f){h+='<button onclick="attributeDrop('+JSON.stringify(f.pid)+','+JSON.stringify(gem)+','+JSON.stringify(b.nom||'')+','+roll+')" class="btn btn-sm btn-grn" style="text-align:left;"><span>'+esc(f.name)+'</span></button>';});
  h+='</div>';
  h+='<div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.08);">';
  h+='<button onclick="queuePendingDropDecision('+JSON.stringify(b.id)+','+JSON.stringify(gem)+','+roll+','+fi+')" class="btn" style="width:100%;"><span>⏳ Décider plus tard</span></button>';
  h+='<div style="font-size:11px;color:var(--faint);line-height:1.5;margin-top:8px;">Le drop restera en attente dans le simulateur jusqu’à attribution.</div>';
  h+='</div>';
  ge("drop-attrib").innerHTML=h;
}
function attributeDrop(pid,gem,bnom,roll,pendingId){
  if(!combatGrantGemToPlayer(pid,gem,bnom,{roll:roll,pending:!!pendingId})) return;
  if(pendingId){
    var list=combatPendingDrops();
    var idx=list.findIndex(function(x){ return String(x&&x.id||'')===String(pendingId||''); });
    if(idx>=0) list.splice(idx,1);
  }
  closeModal("m-drop");
  rCombat("p-combat-mj-c");
}

// ── Export Discord ────────────────────────────────────────────────────────────
function combatExportDiscord(){ _exportCombat(_cs); }
async function combatExportDiscordFromArc(id){
  var arc=(can("manage_mjs")?getAllCombatArchives():getCombatArchives()).find(function(a){return a.id===id;});
  if(!arc) return notif("Archive introuvable.","err");
  var owner = combatArchiveOwnerKey((arc&&arc._owner) || combatArchiveCurrentOwner());
  var full = await combatArchiveFetchRecord(owner, id, arc);
  if(full) _exportCombat(full); else notif("Archive introuvable.","err");
}
function _exportCombat(s){
  var d=new Date(s.savedAt||Date.now()).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  var lines=["## ⚔ "+(s.name||"Combat"),"*"+d+" · "+s.round+" round"+(s.round>1?"s":"")+"*","---",""];
  var joueurs=(s.fighters||[]).filter(function(f){return f.type==="player";});
  var monstres=(s.fighters||[]).filter(function(f){return f.type==="beast";});
  if(joueurs.length) lines.push("**Joueurs :** "+joueurs.map(function(f){return f.name+" (Niv."+f.level+")";}).join(" · "));
  if(monstres.length) lines.push("**Adversaires :** "+monstres.map(function(f){return f.name+(f.pvCur<=0?" ☠":"");}).join(" · "));
  lines.push("","```");
  (s.log||[]).forEach(function(l){
    if(l.type==="round"){lines.push("");lines.push("  "+l.text);lines.push("");}
    else{var p2={"damage":"💥","heal":"💚","turn":"📋","spell":"✨","info":"·"}[l.type]||"·";lines.push("  "+p2+" "+l.text);}
  });
  lines.push("```","");
  if(joueurs.length){
    lines.push("**État final :**");
    joueurs.forEach(function(f){
      var pct=Math.round(f.pvCur/f.pvMax*100);
      var c=pct>60?"🟢":pct>30?"🟡":"🔴";
      var ln=c+" **"+f.name+"** · PV:`"+f.pvCur+"/"+f.pvMax+"` EP:`"+f.epCur+"/"+f.epMax+"`";
      if(f.emMax) ln+=" EM:`"+f.emCur+"/"+f.emMax+"`";
      if(f.pvCur<=0) ln+=" **KO**";
      lines.push(ln);
    });
    lines.push("");
  }
  var allBKO=monstres.length&&monstres.every(function(f){return f.pvCur<=0;});
  var allJKO=joueurs.length&&joueurs.every(function(f){return f.pvCur<=0;});
  if(allBKO) lines.push("**Résultat : Victoire ✓**");
  else if(allJKO) lines.push("**Résultat : Défaite ✗**");
  var drops=(s.log||[]).filter(function(l){return l.text&&l.text.indexOf("💎")>-1;});
  if(drops.length){lines.push("");lines.push("**Drops :**");drops.forEach(function(l){lines.push("· "+l.text);});}
  if(s.notes&&s.notes.trim()){lines.push("");lines.push("**Notes MJ :**");lines.push("> "+s.notes.trim().replace(/\n/g,"\n> "));}
  lines.push("","*— Nuages Polaires ☁️*");
  var text=lines.join("\n");
  try{navigator.clipboard.writeText(text).then(function(){notif("Copié ✓","ok");}).catch(function(){_copyFallback(text);});}catch(e){_copyFallback(text);}
}
function _copyFallback(text){
  var ta=document.createElement("textarea");ta.value=text;ta.style.cssText="position:fixed;opacity:0;";
  document.body.appendChild(ta);ta.select();try{document.execCommand("copy");}catch(e){}
  document.body.removeChild(ta);notif("Copié ✓","ok");
}

// ── Notes + Archives ──────────────────────────────────────────────────────────
function combatSaveNotes(){ var a=ge("c-notes"); if(a) _cs.notes=a.value; if(_cs.id) combatSaveArc({manual:false,reason:'notes'}); notif("Notes sauvegardées.","ok"); }
function combatNewFromArchive(opts){
  opts=opts||{};
  _cs=combatBlankState();
  _csHist=[]; _csRedoHist=[];
  if(!opts.skipRender) rCombat("p-combat-mj-c");
}
function combatSaveArc(opts){
  opts=opts||{};
  if(!_cs.id) _cs.id="c"+Date.now();
  var owner = combatArchiveOwnerKey((_cs&&_cs._owner) || combatArchiveCurrentOwner());
  var arr=getCombatArchivesForOwner(owner), i=arr.findIndex(function(a){return a.id===_cs.id;});
  var prev=i>=0?arr[i]:null;
  var arc=JSON.parse(JSON.stringify(_cs));
  arc.savedAt=Date.now();
  if(owner) arc._owner = owner;
  arc._manualSaved=(opts.manual===false)?!!(prev&&prev._manualSaved):true;
  arc._autosaveAt=opts.manual===false?Date.now():(prev&&prev._autosaveAt)||0;
  arc._autosaveReason=opts.reason|| (opts.manual===false?'autosave':'manual');
  arc._inProgress=combatIsInProgressState(arc);
  arc._draft=arc._inProgress || !!arc._new;
  if(i>=0) arr[i]=arc; else arr.unshift(arc);
  saveCombatArchives(arr, owner).catch(function(){});
  return arc;
}
function combatSaveArchive(){ combatSaveArc({manual:true,reason:'manual_save'}); notif("Combat sauvegardé.","ok"); }
async function combatLoadArchive(id){
  var source=(can("manage_mjs")?getAllCombatArchives():getCombatArchives());
  var arc=source.find(function(a){return a.id===id;});
  if(!arc) return;
  var owner = combatArchiveOwnerKey((arc&&arc._owner) || (_cs&&_cs._owner) || combatArchiveCurrentOwner());
  var full = await combatArchiveFetchRecord(owner, id, arc);
  if(!full) return;
  _cs=JSON.parse(JSON.stringify(full)); _csHist=[]; _csRedoHist=[];
  if(!_cs._owner) _cs._owner = owner || combatArchiveCurrentOwner();
  cHydrateCombatState(_cs);
  _cs._new=false;
  rCombat("p-combat-mj-c");
  try{ combatQueueAutosave('load_archive', 60); }catch(_e){}
}
async function combatDeleteArchive(id){
  var source=(can("manage_mjs")?getAllCombatArchives():getCombatArchives());
  var arc=source.find(function(a){return a.id===id;});
  if(!arc) return;
  var owner = combatArchiveOwnerKey((arc&&arc._owner) || (_cs&&_cs._owner) || combatArchiveCurrentOwner());
  var remaining = getCombatArchivesForOwner(owner).filter(function(a){return a.id!==id;});
  saveCombatArchives(remaining, owner).catch(function(){});
  if(_cs.id===id) combatNewFromArchive();
  else{notif("Supprimé.","inf"); rCombat("p-combat-mj-c");}
}

// ── Statuts IRP fiche ─────────────────────────────────────────────────────────
function renderStatutsFiche(p){
  var el=ge("p-statuts-content"),adminEl=ge("p-statuts-admin"); if(!el) return;
  var sts=p.statuts||[],cm=can("manage_stats");
  if(!sts.length){el.innerHTML='<span style="color:var(--faint);font-style:italic;font-size:13px;">Aucun statut actif.</span>';}
  else{
    var h='<div style="display:flex;flex-wrap:wrap;gap:8px;">';
    sts.forEach(function(st,si){
      var def=STATUT_EFFECTS[st.id]||{label:st.id,col:"var(--dim)"};var col=def.col||"var(--dim)";
      h+='<div style="display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border:1px solid '+col+';color:'+col+';font-family:var(--fd);font-size:9px;letter-spacing:1px;text-transform:uppercase;">'+def.label;
      if(st.desc) h+=' <span style="font-family:var(--fb);font-size:11px;font-style:italic;text-transform:none;opacity:.7;">('+st.desc+')</span>';
      if(cm) h+='<button onclick="removeStatutFiche(\''+p.id+'\','+si+')" style="background:transparent;border:none;cursor:pointer;font-size:12px;padding:0;opacity:.5;color:'+col+';">✕</button>';
      h+='</div>';
    });
    el.innerHTML=h+'</div>';
  }
  if(adminEl){
    if(cm){
      var opts=Object.keys(STATUT_EFFECTS).map(function(k){return'<option value="'+k+'">'+STATUT_EFFECTS[k].label+'</option>';}).join("");
      adminEl.style.display="flex";adminEl.style.gap="6px";adminEl.style.flexWrap="wrap";
      adminEl.innerHTML='<select id="statut-add-sel-'+p.id+'" style="font-size:12px;padding:4px 8px;background:var(--bg3);border:1px solid var(--border2);color:var(--text);"><option value="">+ Ajouter…</option>'+opts+'</select>'
        +'<input type="text" id="statut-add-desc-'+p.id+'" placeholder="Note (optionnel)" style="font-size:12px;padding:4px 8px;width:150px;">'
        +'<button class="btn btn-sm" onclick="addStatutFiche(\''+p.id+'\')" style="border-color:var(--glacier-dim);color:var(--glacier-dim);"><span>Poser</span></button>';
    } else adminEl.style.display="none";
  }
}
function addStatutFiche(pid){
  var p=gpid(pid); if(!p) return;
  var sel=ge("statut-add-sel-"+pid); if(!sel||!sel.value) return;
  var descEl=ge("statut-add-desc-"+pid),desc=descEl?descEl.value.trim():"";
  p.statuts=p.statuts||[];
  var ex=p.statuts.find(function(s){return s.id===sel.value;});
  if(ex){if(desc) ex.desc=desc;} else p.statuts.push({id:sel.value,desc,posedBy:CU?CU.name:"MJ",posedAt:Date.now()});
  var lbl=(STATUT_EFFECTS[sel.value]||{}).label||sel.value;
  p.history=p.history||[];p.history.push({ts:Date.now(),type:"stat",text:"⚠ "+lbl+(desc?" ("+desc+")":""),by:CU?CU.name:"MJ"});
  up(p);if(descEl) descEl.value="";sel.value="";
  notif(lbl+" posé.","ok");renderStatutsFiche(p);
}
function removeStatutFiche(pid,si){
  var p=gpid(pid); if(!p) return;
  var st=p.statuts[si]; if(!st) return;
  var lbl=(STATUT_EFFECTS[st.id]||{}).label||st.id;
  p.statuts.splice(si,1);
  p.history=p.history||[];p.history.push({ts:Date.now(),type:"stat",text:"✓ Retiré : "+lbl,by:CU?CU.name:"MJ"});
  up(p);notif(lbl+" retiré.","ok");renderStatutsFiche(p);
}
function addNotifToPlayer(pid,text,by){
  var p=gpid(pid); if(!p) return;
  p.history=p.history||[];p.history.push({ts:Date.now(),type:"add",text,by:by||"Système"});up(p);
}

// ── rCombat — RENDU v2 (Déclaration / Résolution) ────────────────────────────
function rCombat(tid){
  if(!CU||CU.type!=="staff"){ return; }
  var el=ge(tid); if(!el) return;
  var players=gp(), beasts=gb();
  var archives=getCombatArchives();
  if(can("manage_mjs")){
    _primeAllCombatArchivesForAdmin(false).then(function(changed){
      if(!changed) return;
      var tab = ge("combat-mj");
      if(tab && tab.classList.contains("active")) rCombat("p-combat-mj-c");
    }).catch(function(){});
  }
  var canM=can("manage_stats");
  var active=_cs.active;
  var phase=_cs.phase||"idle"; // "idle"|"declaration"|"resolution"
  var curFi=_cs.active&&phase==="declaration"?(_cs.order[_cs.turn]??-1):-1;

  var h=`<style id="np-sim-readability">
#p-combat-mj-c .sim-ui{max-width:1380px!important;position:relative;padding:18px;border:1px solid rgba(120,176,255,.08);background:
  radial-gradient(circle at top, rgba(82,124,255,.16), transparent 34%),
  radial-gradient(circle at 80% 10%, rgba(255,72,72,.10), transparent 24%),
  linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,0)),
  linear-gradient(180deg,#090b16 0%,#06070f 100%);
  box-shadow:0 0 0 1px rgba(255,255,255,.03) inset, 0 28px 90px rgba(0,0,0,.46), 0 0 0 6px rgba(8,10,18,.62) inset;
  overflow:hidden;}
#p-combat-mj-c .sim-ui::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.16;background:repeating-linear-gradient(180deg,rgba(255,255,255,.06) 0 1px,transparent 1px 4px),linear-gradient(90deg,rgba(126,184,212,.08),transparent 20%,transparent 80%,rgba(201,74,74,.06));mix-blend-mode:screen;}
#p-combat-mj-c .sim-ui::after{content:"";position:absolute;inset:10px;border:1px solid rgba(255,255,255,.04);pointer-events:none;box-shadow:0 0 0 1px rgba(255,255,255,.02) inset;}
#p-combat-mj-c .sim-ui, #p-combat-mj-c .sim-ui *{box-sizing:border-box;}
#p-combat-mj-c .sim-ui *{image-rendering:pixelated;}
#p-combat-mj-c .sim-ui [style*="font-size:5px"]{font-size:8px!important;}
#p-combat-mj-c .sim-ui [style*="font-size:6px"]{font-size:9px!important;}
#p-combat-mj-c .sim-ui [style*="font-size:7px"]{font-size:10px!important;}
#p-combat-mj-c .sim-ui [style*="font-size:8px"]{font-size:11px!important;}
#p-combat-mj-c .sim-ui [style*="font-size:9px"]{font-size:12px!important;}
#p-combat-mj-c .sim-ui [style*="color:rgba(255,255,255,0.1)"]{color:rgba(255,255,255,.46)!important;}
#p-combat-mj-c .sim-ui [style*="color:rgba(255,255,255,0.15)"]{color:rgba(255,255,255,.56)!important;}
#p-combat-mj-c .sim-ui [style*="color:rgba(255,255,255,0.2)"]{color:rgba(255,255,255,.7)!important;}
#p-combat-mj-c .sim-ui [style*="color:rgba(255,255,255,0.25)"]{color:rgba(255,255,255,.78)!important;}
#p-combat-mj-c .sim-ui [style*="color:rgba(255,255,255,0.3)"]{color:rgba(255,255,255,.88)!important;}
#p-combat-mj-c .sim-ui button{border-radius:0!important;line-height:1.2;font-weight:700;text-transform:uppercase;box-shadow:inset 0 -2px 0 rgba(0,0,0,.28);transition:transform .12s ease, box-shadow .12s ease, border-color .12s ease, background .12s ease, color .12s ease;}
#p-combat-mj-c .sim-ui button:hover{transform:translateY(-1px);box-shadow:inset 0 -2px 0 rgba(0,0,0,.2), 0 6px 18px rgba(0,0,0,.22);}
#p-combat-mj-c .sim-ui button:active{transform:translateY(1px);box-shadow:inset 0 2px 0 rgba(0,0,0,.3);}
#p-combat-mj-c .sim-ui input, #p-combat-mj-c .sim-ui select, #p-combat-mj-c .sim-ui textarea{border-radius:0!important;color:var(--text)!important;background:rgba(9,12,24,.96)!important;border:1px solid rgba(145,179,255,.18)!important;box-shadow:0 0 0 1px rgba(255,255,255,.02) inset!important;}
#p-combat-mj-c .sim-ui input:focus, #p-combat-mj-c .sim-ui select:focus, #p-combat-mj-c .sim-ui textarea:focus{outline:none;border-color:rgba(126,184,212,.55)!important;box-shadow:0 0 0 1px rgba(126,184,212,.24), 0 0 18px rgba(126,184,212,.12)!important;}
#p-combat-mj-c .sim-ui input::placeholder, #p-combat-mj-c .sim-ui textarea::placeholder{color:rgba(255,255,255,.42);}
#p-combat-mj-c .sim-cmd{position:sticky;top:10px!important;z-index:20;padding:16px 18px!important;gap:16px!important;margin-bottom:16px!important;border:1px solid rgba(120,176,255,.18)!important;box-shadow:0 20px 50px rgba(0,0,0,.34), inset 0 0 0 1px rgba(255,255,255,.03);backdrop-filter:blur(10px);}
#p-combat-mj-c .sim-cmd::before{content:"SIMULATEUR TACTIQUE";position:absolute;left:16px;top:-10px;padding:2px 8px;background:#08101b;border:1px solid rgba(126,184,212,.25);font-family:var(--fd);font-size:10px;letter-spacing:3px;color:rgba(126,184,212,.82);}
#p-combat-mj-c .sim-cmd #c-name{font-size:16px!important;width:min(400px,100%)!important;background:rgba(255,255,255,.03)!important;padding:10px 12px!important;border:1px solid rgba(255,255,255,.08)!important;}
#p-combat-mj-c .sim-ui button[onclick*="combatStart"], #p-combat-mj-c .sim-ui button[onclick*="combatResolve"], #p-combat-mj-c .sim-ui button[onclick*="combatEnd"]{min-height:42px!important;padding:10px 20px!important;letter-spacing:2px;}
#p-combat-mj-c .sim-hud-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:0 0 18px;position:relative;z-index:1;}
#p-combat-mj-c .sim-hud-cell{position:relative;padding:14px 16px;background:linear-gradient(180deg,rgba(13,18,34,.96),rgba(8,11,21,.96));border:1px solid rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,.02),0 10px 26px rgba(0,0,0,.22);overflow:hidden;}
#p-combat-mj-c .sim-hud-cell::before{content:"";position:absolute;top:0;left:0;width:100%;height:2px;background:linear-gradient(90deg,rgba(126,184,212,.9),rgba(201,74,74,.6));opacity:.8;}
#p-combat-mj-c .sim-hud-k{font-family:var(--fd);font-size:10px;letter-spacing:3px;color:rgba(255,255,255,.56);margin-bottom:6px;}
#p-combat-mj-c .sim-hud-v{font-family:var(--fm);font-size:22px;color:#f6fbff;line-height:1;}
#p-combat-mj-c .sim-hud-sub{margin-top:6px;font-size:12px;color:rgba(255,255,255,.7);}
#p-combat-mj-c .sim-prep-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:18px!important;margin-bottom:18px!important;position:relative;z-index:1;}
#p-combat-mj-c .sim-panel{position:relative;padding:18px!important;border-radius:0!important;box-shadow:0 16px 40px rgba(0,0,0,.22), inset 0 0 0 1px rgba(255,255,255,.02);overflow:hidden;}
#p-combat-mj-c .sim-panel::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(135deg,rgba(255,255,255,.05),transparent 18%,transparent 82%,rgba(255,255,255,.03));opacity:.45;}
#p-combat-mj-c .sim-panel-player{border-color:rgba(126,184,212,.24)!important;box-shadow:0 16px 40px rgba(0,0,0,.24), inset 0 0 0 1px rgba(126,184,212,.08)!important;}
#p-combat-mj-c .sim-panel-enemy{border-color:rgba(201,74,74,.22)!important;box-shadow:0 16px 40px rgba(0,0,0,.24), inset 0 0 0 1px rgba(201,74,74,.07)!important;}
#p-combat-mj-c .sim-select-row{position:relative;padding:11px 12px!important;min-height:58px;border-radius:0!important;isolation:isolate;}
#p-combat-mj-c .sim-select-row::before{content:"";position:absolute;inset:0;border:1px solid rgba(255,255,255,.02);pointer-events:none;}
#p-combat-mj-c .sim-select-row:hover{transform:translateY(-1px);box-shadow:0 10px 20px rgba(0,0,0,.18);}
#p-combat-mj-c .sim-select-row div[style*="width:30px;height:30px"]{width:42px!important;height:42px!important;image-rendering:pixelated;}
#p-combat-mj-c .sim-formation{padding:14px 16px!important;border-radius:0!important;margin-bottom:18px!important;background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.015))!important;position:relative;z-index:1;}
#p-combat-mj-c .sim-tracker{gap:10px!important;margin-bottom:18px!important;padding:4px 2px!important;position:relative;z-index:1;}
#p-combat-mj-c .sim-tracker > div{width:106px!important;transition:transform .12s ease, filter .12s ease;filter:saturate(1.05);}
#p-combat-mj-c .sim-tracker > div:hover{transform:translateY(-2px);}
#p-combat-mj-c .sim-tracker div[style*="width:44px;height:44px"]{width:56px!important;height:56px!important;image-rendering:pixelated;}
#p-combat-mj-c .sim-tracker div[style*="height:3px;background:rgba(255,255,255,0.05)"]{height:6px!important;border-radius:0!important;overflow:hidden;border:1px solid rgba(255,255,255,.05);}
#p-combat-mj-c .sim-fighter-grid{grid-template-columns:repeat(auto-fill,minmax(356px,1fr))!important;gap:16px!important;margin-bottom:18px!important;position:relative;z-index:1;}
#p-combat-mj-c .sim-fighter-card{padding:18px!important;border-width:1px!important;border-radius:0!important;box-shadow:0 18px 40px rgba(0,0,0,.24), inset 0 0 0 1px rgba(255,255,255,.03)!important;overflow:hidden;}
#p-combat-mj-c .sim-fighter-card::before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(255,255,255,.06),transparent 22%),repeating-linear-gradient(90deg,rgba(255,255,255,.02) 0 1px,transparent 1px 6px);opacity:.28;mix-blend-mode:screen;}
#p-combat-mj-c .sim-fighter-card[style*="opacity:.45"]{filter:grayscale(.3) brightness(.78);}
#p-combat-mj-c .sim-fighter-card div[style*="height:7px;background:rgba(255,255,255,0.04)"]{height:11px!important;border-radius:0!important;overflow:hidden;border:1px solid rgba(255,255,255,.06);background:rgba(0,0,0,.28)!important;}
#p-combat-mj-c .sim-fighter-card div[style*="height:5px;background:rgba(255,255,255,0.04)"]{height:9px!important;border-radius:0!important;overflow:hidden;border:1px solid rgba(255,255,255,.06);background:rgba(0,0,0,.28)!important;}
#p-combat-mj-c .sim-fighter-card button[onclick*="cAdj("]{width:22px!important;height:22px!important;font-size:12px!important;border-radius:0!important;}
#p-combat-mj-c .sim-fighter-card select[id^="decl-tgt-"], #p-combat-mj-c .sim-fighter-card select[id^="decl-htgt-"]{min-height:42px!important;padding:9px 10px!important;font-size:13px!important;margin-bottom:7px!important;}
#p-combat-mj-c .sim-fighter-card button[onclick*="cDeclareAction"]{min-height:48px!important;padding:11px 8px!important;letter-spacing:1px;}
#p-combat-mj-c .sim-fighter-card button[onclick*="cUndoLastDecl"], #p-combat-mj-c .sim-fighter-card button[onclick*="cEditDecl"], #p-combat-mj-c .sim-fighter-card button[onclick*="combatSetInit"], #p-combat-mj-c .sim-fighter-card button[onclick*="combatAddStatut"], #p-combat-mj-c .sim-fighter-card button[onclick*="combatRemoveStatut"]{min-height:34px!important;}
#p-combat-mj-c .sim-bottom-grid{grid-template-columns:minmax(0,1fr) 370px!important;gap:16px!important;margin-bottom:18px!important;position:relative;z-index:1;}
#p-combat-mj-c .sim-log, #p-combat-mj-c .sim-notes, #p-combat-mj-c .sim-history{border-radius:0!important;}
#p-combat-mj-c #clog-inner{max-height:430px!important;padding-right:4px;scrollbar-width:thin;scrollbar-color:rgba(126,184,212,.45) rgba(255,255,255,.04);}
#p-combat-mj-c #clog-inner::-webkit-scrollbar{width:8px;height:8px;}
#p-combat-mj-c #clog-inner::-webkit-scrollbar-thumb{background:rgba(126,184,212,.4);border:1px solid rgba(255,255,255,.08);}
#p-combat-mj-c #clog-inner > div{padding:8px 10px!important;border-radius:0!important;margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,.03);}
#p-combat-mj-c .sim-history input, #p-combat-mj-c .sim-history select{min-height:38px!important;padding:9px 10px!important;}
#p-combat-mj-c .sim-ui textarea{line-height:1.6!important;}
#p-combat-mj-c .sim-ui [style*="letter-spacing:5px"]{text-shadow:0 0 10px rgba(126,184,212,.18);}
#p-combat-mj-c .sim-ui [style*="background:linear-gradient(160deg,#0c0e1c,#090a12)"],
#p-combat-mj-c .sim-ui [style*="background:linear-gradient(160deg,#0e1020,#0d0e18)"],
#p-combat-mj-c .sim-ui [style*="background:linear-gradient(160deg,#120e0e,#0d0e18)"]{background:linear-gradient(180deg,rgba(10,13,24,.98),rgba(6,8,15,.98))!important;}
#p-combat-mj-c .sim-ui [style*="background:transparent;border:none;color:var(--text)"]{border:1px solid rgba(255,255,255,.08)!important;background:rgba(255,255,255,.03)!important;}
#p-combat-mj-c .sim-ui [style*="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06)"]{background:rgba(13,18,32,.82)!important;border-color:rgba(255,255,255,.09)!important;}
#p-combat-mj-c .sim-ui [style*="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07)"]{background:rgba(13,18,32,.9)!important;border-color:rgba(255,255,255,.11)!important;}
@media(max-width:1180px){#p-combat-mj-c .sim-hud-strip{grid-template-columns:repeat(2,minmax(0,1fr));}#p-combat-mj-c .sim-bottom-grid{grid-template-columns:1fr!important;}#p-combat-mj-c .sim-prep-grid{grid-template-columns:1fr!important;}}
@media(max-width:820px){#p-combat-mj-c .sim-ui{padding:12px;}#p-combat-mj-c .sim-fighter-grid{grid-template-columns:1fr!important;}#p-combat-mj-c .sim-tracker > div{width:92px!important;}#p-combat-mj-c .sim-hud-strip{grid-template-columns:1fr;}}


/* v238 combat archives ux refresh */
#p-combat-mj-c .arc-shell{display:grid;grid-template-columns:minmax(320px,420px) minmax(0,1fr);gap:16px;align-items:start;}
#p-combat-mj-c .arc-results,#p-combat-mj-c .arc-detail{position:relative;background:linear-gradient(180deg,rgba(255,255,255,.032),rgba(255,255,255,.014));border:1px solid rgba(255,255,255,.08);box-shadow:inset 0 1px 0 rgba(255,255,255,.03),0 16px 34px rgba(0,0,0,.18);}
#p-combat-mj-c .arc-results{padding:14px;min-height:540px;}
#p-combat-mj-c .arc-detail{padding:16px;min-height:540px;}
#p-combat-mj-c .arc-results-head,#p-combat-mj-c .arc-detail-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px;}
#p-combat-mj-c .arc-results-title,#p-combat-mj-c .arc-detail-title{font-family:var(--fd);letter-spacing:1px;color:var(--text);}
#p-combat-mj-c .arc-results-title{font-size:13px;}
#p-combat-mj-c .arc-results-sub,#p-combat-mj-c .arc-detail-sub{font-size:12px;line-height:1.6;color:var(--faint);margin-top:4px;}
#p-combat-mj-c .arc-results-count{padding:8px 10px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);font-size:11px;color:var(--text-soft);}
#p-combat-mj-c .arc-results-list{display:flex;flex-direction:column;gap:10px;max-height:880px;overflow:auto;padding-right:2px;}
#p-combat-mj-c .arc-card{padding:12px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02);cursor:pointer;transition:border-color .15s ease,transform .15s ease,background .15s ease,box-shadow .15s ease;}
#p-combat-mj-c .arc-card:hover{transform:translateY(-1px);border-color:rgba(126,184,212,.22);background:rgba(255,255,255,.03);box-shadow:0 12px 22px rgba(0,0,0,.16);}
#p-combat-mj-c .arc-card.is-selected{border-color:rgba(126,184,212,.34);box-shadow:0 0 0 1px rgba(126,184,212,.08) inset,0 12px 28px rgba(0,0,0,.18);background:linear-gradient(180deg,rgba(126,184,212,.07),rgba(255,255,255,.03));}
#p-combat-mj-c .arc-card.is-current{outline:1px solid rgba(126,184,212,.12);}
#p-combat-mj-c .arc-card-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:8px;}
#p-combat-mj-c .arc-card-main{min-width:0;flex:1;}
#p-combat-mj-c .arc-card-title-row,#p-combat-mj-c .arc-detail-title-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
#p-combat-mj-c .arc-card-title{font-size:13px;font-weight:700;color:var(--text);line-height:1.4;}
#p-combat-mj-c .arc-card-meta{font-size:11px;color:var(--faint);margin-top:5px;line-height:1.5;}
#p-combat-mj-c .arc-pill{display:inline-flex;align-items:center;padding:3px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.04);font-family:var(--fd);font-size:9px;letter-spacing:1px;}
#p-combat-mj-c .arc-pill-soft{border-color:rgba(126,184,212,.2);background:rgba(126,184,212,.08);color:var(--glacier);}
#p-combat-mj-c .arc-mini-metrics{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end;}
#p-combat-mj-c .arc-mini-metrics span,#p-combat-mj-c .arc-beast-chip,#p-combat-mj-c .arc-beast-more{display:inline-flex;align-items:center;padding:4px 8px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.025);font-size:10px;color:var(--text-soft);}
#p-combat-mj-c .arc-player-row,#p-combat-mj-c .arc-beast-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}
#p-combat-mj-c .arc-player-pill{display:flex;align-items:center;gap:6px;padding:5px 7px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.02);min-width:0;}
#p-combat-mj-c .arc-player-name{font-size:10px;color:var(--text-soft);max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
#p-combat-mj-c .arc-player-bar{width:42px;height:5px;border-radius:999px;background:rgba(255,255,255,.06);overflow:hidden;}
#p-combat-mj-c .arc-player-bar>div,#p-combat-mj-c .arc-roster-meter>div{height:100%;}
#p-combat-mj-c .arc-player-val{font-family:var(--fm);font-size:8px;}
#p-combat-mj-c .arc-card-actions,#p-combat-mj-c .arc-detail-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;}
#p-combat-mj-c .arc-card-actions .btn,#p-combat-mj-c .arc-detail-actions .btn{min-height:38px;}
#p-combat-mj-c .arc-detail-kicker{font-family:var(--fd);font-size:8px;letter-spacing:4px;color:rgba(255,255,255,.3);margin-bottom:7px;}
#p-combat-mj-c .arc-detail-title{font-size:18px;font-weight:800;line-height:1.25;}
#p-combat-mj-c .arc-detail-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px;}
#p-combat-mj-c .arc-metric{padding:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.025);}
#p-combat-mj-c .arc-metric-k{font-family:var(--fd);font-size:8px;letter-spacing:3px;color:rgba(255,255,255,.32);margin-bottom:6px;}
#p-combat-mj-c .arc-metric-v{font-family:var(--fm);font-size:22px;color:var(--text);line-height:1;}
#p-combat-mj-c .arc-metric-sub{margin-top:6px;font-size:11px;color:var(--faint);line-height:1.5;}
#p-combat-mj-c .arc-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:12px;}
#p-combat-mj-c .arc-detail-card{padding:14px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02);}
#p-combat-mj-c .arc-detail-card-title{font-family:var(--fd);font-size:11px;letter-spacing:2px;color:var(--text);margin-bottom:10px;}
#p-combat-mj-c .arc-roster{display:flex;flex-direction:column;gap:8px;}
#p-combat-mj-c .arc-roster-row{display:grid;grid-template-columns:minmax(0,1fr) 130px 48px;gap:10px;align-items:center;padding:9px 10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);}
#p-combat-mj-c .arc-roster-name{font-size:12px;font-weight:700;color:var(--text);line-height:1.35;}
#p-combat-mj-c .arc-roster-sub{font-size:11px;color:var(--faint);margin-top:2px;line-height:1.45;}
#p-combat-mj-c .arc-roster-meter{height:8px;border-radius:999px;background:rgba(255,255,255,.06);overflow:hidden;}
#p-combat-mj-c .arc-roster-side{text-align:right;font-family:var(--fm);font-size:11px;}
#p-combat-mj-c .arc-log-list{display:flex;flex-direction:column;gap:8px;}
#p-combat-mj-c .arc-log-row{display:grid;grid-template-columns:44px minmax(0,1fr) 8px;gap:10px;align-items:start;padding:10px 11px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);}
#p-combat-mj-c .arc-log-round{font-family:var(--fd);font-size:9px;letter-spacing:1px;color:var(--glacier-dim);padding-top:2px;}
#p-combat-mj-c .arc-log-text{font-size:12px;line-height:1.6;color:var(--text-soft);}
#p-combat-mj-c .arc-log-dot{width:8px;height:8px;border-radius:999px;margin-top:6px;box-shadow:0 0 0 4px rgba(255,255,255,.03);}
#p-combat-mj-c .arc-empty-line,#p-combat-mj-c .arc-list-note{font-size:12px;line-height:1.6;color:var(--faint);padding:8px 0 2px;}
@media(max-width:1240px){#p-combat-mj-c .arc-shell{grid-template-columns:1fr;}#p-combat-mj-c .arc-detail{order:-1;}#p-combat-mj-c .arc-results-list{max-height:none;}}
@media(max-width:820px){#p-combat-mj-c .arc-detail-metrics{grid-template-columns:repeat(2,minmax(0,1fr));}#p-combat-mj-c .arc-detail-grid{grid-template-columns:1fr;}#p-combat-mj-c .arc-roster-row{grid-template-columns:minmax(0,1fr);}#p-combat-mj-c .arc-log-row{grid-template-columns:36px minmax(0,1fr);}#p-combat-mj-c .arc-log-dot{display:none;}#p-combat-mj-c .arc-results,#p-combat-mj-c .arc-detail{padding:12px;}}

#p-combat-mj-c .arc-toolbar-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:14px;}
#p-combat-mj-c .arc-toolbar-kicker{font-family:var(--fd);font-size:8px;letter-spacing:5px;color:rgba(255,255,255,0.22);margin-bottom:6px;}
#p-combat-mj-c .arc-toolbar-title{font-family:var(--fd);font-size:15px;letter-spacing:1px;color:var(--text);}
#p-combat-mj-c .arc-toolbar-sub{font-size:12px;line-height:1.6;color:var(--faint);margin-top:6px;max-width:720px;}
#p-combat-mj-c .arc-filter-shell{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;padding:12px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(255,255,255,.028),rgba(255,255,255,.016));box-shadow:inset 0 1px 0 rgba(255,255,255,.03);margin-bottom:12px;border-radius:18px;}
#p-combat-mj-c .arc-field{display:flex;flex-direction:column;gap:6px;min-width:0;}
#p-combat-mj-c .arc-field-label{font-family:var(--fd);font-size:8px;letter-spacing:3px;color:rgba(255,255,255,.30);padding-left:2px;}
#p-combat-mj-c .arc-input,#p-combat-mj-c .arc-select{width:100%;min-height:42px;padding:0 12px;border-radius:14px;border:1px solid rgba(255,255,255,.10);background:rgba(9,18,38,.72);color:var(--text);outline:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.025);}
#p-combat-mj-c .arc-input::placeholder{color:rgba(255,255,255,.34);}
#p-combat-mj-c .arc-input:focus,#p-combat-mj-c .arc-select:focus{border-color:rgba(126,184,212,.42);box-shadow:0 0 0 3px rgba(126,184,212,.10), inset 0 1px 0 rgba(255,255,255,.03);}
#p-combat-mj-c .arc-chip-wrap{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;align-items:center;}
#p-combat-mj-c .arc-filter-summary{margin-bottom:10px;}
#p-combat-mj-c .arc-summary-head{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}
#p-combat-mj-c .arc-summary-count{display:inline-flex;align-items:center;min-height:30px;padding:0 12px;border-radius:999px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);font-family:var(--fd);font-size:10px;letter-spacing:2px;color:var(--text-soft);}
#p-combat-mj-c .arc-summary-chip{display:inline-flex;align-items:center;gap:6px;min-height:30px;padding:0 12px;border-radius:999px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.025);font-size:11px;color:var(--faint);}
#p-combat-mj-c .arc-summary-chip strong{color:var(--text);font-weight:700;}
#p-combat-mj-c .arc-summary-chip-glacier{border-color:rgba(126,184,212,.18);background:rgba(126,184,212,.08);}
#p-combat-mj-c .arc-summary-muted{font-size:12px;color:var(--faint);padding-left:4px;}
#p-combat-mj-c .arc-shell{grid-template-columns:minmax(360px,450px) minmax(0,1fr);gap:18px;}
#p-combat-mj-c .arc-results,#p-combat-mj-c .arc-detail{border-radius:22px;overflow:hidden;background:linear-gradient(180deg,rgba(10,18,38,.92),rgba(7,10,20,.92));border-color:rgba(255,255,255,.09);box-shadow:inset 0 1px 0 rgba(255,255,255,.035),0 20px 40px rgba(0,0,0,.22);}
#p-combat-mj-c .arc-results{padding:16px;}
#p-combat-mj-c .arc-detail{padding:18px;position:sticky;top:16px;}
#p-combat-mj-c .arc-results-list{gap:12px;padding-right:4px;}
#p-combat-mj-c .arc-results-list::-webkit-scrollbar{width:8px;}
#p-combat-mj-c .arc-results-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.10);border-radius:999px;}
#p-combat-mj-c .arc-card{border-radius:18px;padding:14px;background:linear-gradient(180deg,rgba(255,255,255,.028),rgba(255,255,255,.016));border:1px solid rgba(255,255,255,.08);box-shadow:inset 0 1px 0 rgba(255,255,255,.02);}
#p-combat-mj-c .arc-card:hover{transform:translateY(-2px);}
#p-combat-mj-c .arc-card.is-selected{border-color:rgba(126,184,212,.42);background:linear-gradient(180deg,rgba(126,184,212,.09),rgba(255,255,255,.03));box-shadow:0 0 0 1px rgba(126,184,212,.10) inset,0 18px 34px rgba(0,0,0,.20);}
#p-combat-mj-c .arc-card.is-current{outline:none;box-shadow:0 0 0 1px rgba(126,184,212,.12) inset,0 0 0 1px rgba(126,184,212,.12),0 18px 34px rgba(0,0,0,.20);}
#p-combat-mj-c .arc-card-meta{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;}
#p-combat-mj-c .arc-card-meta .sep{opacity:.25;}
#p-combat-mj-c .arc-mini-metrics span,#p-combat-mj-c .arc-beast-chip,#p-combat-mj-c .arc-beast-more{border-radius:999px;padding:5px 9px;}
#p-combat-mj-c .arc-player-pill{border-radius:999px;padding:6px 9px;background:rgba(255,255,255,.028);}
#p-combat-mj-c .arc-card-actions .btn,#p-combat-mj-c .arc-detail-actions .btn{border-radius:12px;}
#p-combat-mj-c .arc-detail-head{padding-bottom:14px;border-bottom:1px solid rgba(255,255,255,.08);margin-bottom:14px;}
#p-combat-mj-c .arc-detail-title{font-size:20px;}
#p-combat-mj-c .arc-detail-metrics{margin-bottom:16px;}
#p-combat-mj-c .arc-metric{border-radius:18px;padding:14px;background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.018));}
#p-combat-mj-c .arc-detail-card{border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.026),rgba(255,255,255,.016));}
#p-combat-mj-c .arc-roster-row,#p-combat-mj-c .arc-log-row{border-radius:14px;background:rgba(255,255,255,.025);}
#p-combat-mj-c .arc-log-row{padding:11px 12px;}
#p-combat-mj-c .arc-empty-line,#p-combat-mj-c .arc-list-note{padding:10px 2px 2px;}
@media(max-width:1240px){#p-combat-mj-c .arc-detail{position:relative;top:auto;}#p-combat-mj-c .arc-shell{grid-template-columns:1fr;}#p-combat-mj-c .arc-detail{order:-1;}}
@media(max-width:820px){#p-combat-mj-c .arc-filter-shell{grid-template-columns:1fr;}#p-combat-mj-c .arc-toolbar-title{font-size:14px;}#p-combat-mj-c .arc-summary-head{gap:6px;}#p-combat-mj-c .arc-summary-chip,#p-combat-mj-c .arc-summary-count{min-height:28px;font-size:10px;padding:0 10px;}}


/* v95 header nav stability fix */
html{scrollbar-gutter:stable both-edges;}
body{overflow-y:auto;}
body.tab-popup-open{padding-right:var(--tab-lock-pr,0px)!important;}
.app-header .nav-group-btn,
.app-header .nav-dropdown-btn,
.app-header .hdr-av,
.app-header .hdr-settings,
.app-header #notif-bell,
.app-header .btn-out{
  transform:none !important;
}
.app-header .nav-group-btn:hover,
.app-header .nav-dropdown-btn:hover,
.app-header .hdr-av:hover,
.app-header .hdr-settings:hover,
.app-header #notif-bell:hover,
.app-header .btn-out:hover,
.app-header .nav-group-btn:active,
.app-header .nav-dropdown-btn:active,
.app-header .hdr-av:active,
.app-header .hdr-settings:active,
.app-header #notif-bell:active,
.app-header .btn-out:active,
.app-header .nav-group-btn.open,
.app-header .nav-dropdown-btn.open,
.app-header .nav-group-btn.has-active,
.app-header .nav-dropdown-btn.has-active{
  transform:none !important;
}

/* v97 popup stack fix */
.screen,.app-body,.home-inner,.hdr{z-index:auto!important;}
.app-header{z-index:10120!important;}
.tab-popup-backdrop{z-index:10070!important;}
.tab-content.tab-popup-active{z-index:10090!important;pointer-events:auto!important;}
.nav-dropdown-menu,.nav-group-menu{z-index:10130!important;}

/* v106 nav dropdown under header — vrai menu déroulant sous le bouton */
.hdr-nav,#main-tabs,.app-header,.nav-dropdown,.nav-group{overflow:visible!important;}
.hdr-nav{flex-wrap:nowrap!important;}
.nav-dropdown,.nav-group{position:relative!important;display:inline-flex!important;align-items:center!important;}
.nav-dropdown-menu,.nav-group-menu{
  position:absolute!important;
  top:calc(100% + 10px)!important;
  left:0!important;
  right:auto!important;
  bottom:auto!important;
  margin:0!important;
  transform:none!important;
  display:none;
}
.nav-dropdown-menu.open,.nav-group-menu.open{display:block!important;}
.nav-dropdown-menu.portal-open,.nav-group-menu.portal-open{
  position:fixed!important;
  top:var(--np-nav-menu-top,0px)!important;
  left:var(--np-nav-menu-left,0px)!important;
  right:auto!important;
  bottom:auto!important;
  margin:0!important;
  transform:none!important;
}
#nav-dropdown-root{display:block!important;pointer-events:none!important;position:fixed!important;inset:0!important;z-index:10135!important;}
#nav-dropdown-root .nav-dropdown-menu,#nav-dropdown-root .nav-group-menu{pointer-events:auto!important;}
.tab-content.tab-popup-active :where(button,[role=button],a,input,select,textarea,label,.btn,.mini-btn,.bfilt,.toggle-sw){pointer-events:auto;}


/* v209 readability + menu standardization */
body[data-theme-active]:not([data-theme-active="dark"]):not([data-theme-active="light"]),
body[class*="theme-"]{
  --theme-ui-soft:rgba(var(--theme-accent-rgb,126,184,212), .16);
  --theme-ui-strong:rgba(var(--theme-accent-rgb,126,184,212), .24);
  --theme-ui-fg:rgba(248,252,255,.94);
  --theme-ui-fg-soft:rgba(232,240,248,.76);
  --theme-ui-panel:linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.012)), linear-gradient(180deg, rgba(8,12,22,.96), rgba(6,9,18,.94));
  --theme-ui-panel-strong:linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.015)), linear-gradient(180deg, rgba(9,13,24,.98), rgba(6,9,18,.965));
  --theme-ui-press:linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02)), linear-gradient(90deg, rgba(var(--theme-accent-rgb,126,184,212), .09), rgba(var(--theme-accent-rgb,126,184,212), .045));
  --theme-ui-press-active:linear-gradient(180deg, rgba(255,255,255,.075), rgba(255,255,255,.03)), linear-gradient(90deg, rgba(var(--theme-accent-rgb,126,184,212), .15), rgba(var(--theme-accent-rgb,126,184,212), .08));
}
body[data-theme-active]:not([data-theme-active="dark"]):not([data-theme-active="light"]) :where(.app-header,#mobile-drawer > div:first-child,.nav-group-menu,.nav-dropdown-menu,.tab-content.tab-popup-active),
body[class*="theme-"] :where(.app-header,#mobile-drawer > div:first-child,.nav-group-menu,.nav-dropdown-menu,.tab-content.tab-popup-active){
  background:var(--theme-ui-panel-strong) !important;
  border-color:var(--theme-ui-soft) !important;
  box-shadow:0 14px 34px rgba(0,0,0,.28), 0 0 0 1px rgba(255,255,255,.02) inset !important;
  backdrop-filter:saturate(112%) blur(10px) !important;
}
body[data-theme-active]:not([data-theme-active="dark"]):not([data-theme-active="light"]) :where(.card,.panel,.staff-panel,.modal,.login-card,.tab-content.tab-popup-active,.collection-card,.db-card,.settings-pane,.ev-card,.bcrd,.prog-panel,.role-opt.staff-card,.branch-modal-shell,.summary-card,.home-counter,.home-footer-item),
body[class*="theme-"] :where(.card,.panel,.staff-panel,.modal,.login-card,.tab-content.tab-popup-active,.collection-card,.db-card,.settings-pane,.ev-card,.bcrd,.prog-panel,.role-opt.staff-card,.branch-modal-shell,.summary-card,.home-counter,.home-footer-item){
  background:var(--theme-ui-panel) !important;
  border-color:var(--theme-ui-soft) !important;
  box-shadow:0 14px 32px rgba(0,0,0,.24), 0 0 0 1px rgba(255,255,255,.018) inset !important;
}
body[data-theme-active]:not([data-theme-active="dark"]):not([data-theme-active="light"]) :where(.btn,.btn-out,.mini-btn,.gem-btn,.gem-qty-btn,.home-btn,.tab-btn,.ltab-btn,.settings-tab,.collection-chip,.quick-link,.bfilt,.nav-item,.nav-dropdown-item,.nav-group-btn,.nav-dropdown-btn,.spw-btn,.theme-vis-btn,.hdr-profile,.hdr-settings,#notif-bell,.theme-preview-chip,.home-footer-sep,.drawer-item,.drawer-close,.mclose,.tab-popup-close),
body[class*="theme-"] :where(.btn,.btn-out,.mini-btn,.gem-btn,.gem-qty-btn,.home-btn,.tab-btn,.ltab-btn,.settings-tab,.collection-chip,.quick-link,.bfilt,.nav-item,.nav-dropdown-item,.nav-group-btn,.nav-dropdown-btn,.spw-btn,.theme-vis-btn,.hdr-profile,.hdr-settings,#notif-bell,.theme-preview-chip,.home-footer-sep,.drawer-item,.drawer-close,.mclose,.tab-popup-close){
  background:var(--theme-ui-press) !important;
  border-color:var(--theme-ui-soft) !important;
  color:var(--theme-ui-fg-soft) !important;
  box-shadow:0 0 0 1px rgba(255,255,255,.015) inset !important;
  text-shadow:none !important;
}
body[data-theme-active]:not([data-theme-active="dark"]):not([data-theme-active="light"]) :where(.btn:hover,.btn-out:hover,.mini-btn:hover,.gem-btn:hover,.gem-qty-btn:hover,.home-btn:hover,.tab-btn:hover,.ltab-btn:hover,.settings-tab:hover,.collection-chip:hover,.quick-link:hover,.bfilt:hover,.nav-item:hover,.nav-dropdown-item:hover,.nav-group-btn:hover,.nav-dropdown-btn:hover,.spw-btn:hover,.theme-vis-btn:hover,.hdr-profile:hover,.hdr-settings:hover,#notif-bell:hover,.drawer-item:hover,.drawer-close:hover,.mclose:hover,.tab-popup-close:hover,.btn.active,.tab-btn.active,.ltab-btn.active,.settings-tab.active,.bfilt.active,.nav-item.active,.nav-dropdown-item.active,.nav-group-btn.has-active,.nav-dropdown-btn.has-active,.drawer-item.active),
body[class*="theme-"] :where(.btn:hover,.btn-out:hover,.mini-btn:hover,.gem-btn:hover,.gem-qty-btn:hover,.home-btn:hover,.tab-btn:hover,.ltab-btn:hover,.settings-tab:hover,.collection-chip:hover,.quick-link:hover,.bfilt:hover,.nav-item:hover,.nav-dropdown-item:hover,.nav-group-btn:hover,.nav-dropdown-btn:hover,.spw-btn:hover,.theme-vis-btn:hover,.hdr-profile:hover,.hdr-settings:hover,#notif-bell:hover,.drawer-item:hover,.drawer-close:hover,.mclose:hover,.tab-popup-close:hover,.btn.active,.tab-btn.active,.ltab-btn.active,.settings-tab.active,.bfilt.active,.nav-item.active,.nav-dropdown-item.active,.nav-group-btn.has-active,.nav-dropdown-btn.has-active,.drawer-item.active){
  background:var(--theme-ui-press-active) !important;
  border-color:var(--theme-ui-strong) !important;
  color:var(--theme-ui-fg) !important;
  box-shadow:0 0 0 1px rgba(var(--theme-accent-rgb,126,184,212), .06) inset, 0 10px 20px rgba(0,0,0,.16) !important;
}
body[data-theme-active]:not([data-theme-active="dark"]):not([data-theme-active="light"]) :where(input,select,textarea,.inp,.search-input),
body[class*="theme-"] :where(input,select,textarea,.inp,.search-input){
  background:linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.012)), rgba(7,10,18,.88) !important;
  border-color:var(--theme-ui-soft) !important;
  color:var(--theme-ui-fg) !important;
  box-shadow:none !important;
}
body[data-theme-active]:not([data-theme-active="dark"]):not([data-theme-active="light"]) :where(input,select,textarea,.inp,.search-input):focus,
body[data-theme-active]:not([data-theme-active="dark"]):not([data-theme-active="light"]) :where(input,select,textarea,.inp,.search-input):focus-visible,
body[class*="theme-"] :where(input,select,textarea,.inp,.search-input):focus,
body[class*="theme-"] :where(input,select,textarea,.inp,.search-input):focus-visible{
  border-color:var(--theme-ui-strong) !important;
  box-shadow:0 0 0 1px rgba(var(--theme-accent-rgb,126,184,212), .07) inset, 0 0 0 3px rgba(var(--theme-accent-rgb,126,184,212), .07) !important;
}
body[data-theme-active]:not([data-theme-active="dark"]):not([data-theme-active="light"]) :where(.empty-state-sub,.empty-state p,.field label,.dim,.faint,.muted,.small,.sim-hud-sub,.sim-hud-k,.home-sub,.home-footer-lbl,.spw-sub,.spw-note,.spw-mini,.spw-lines,.quote,.rsec p,.rsec ul,.rsec li,.nav-group-label,.nav-section-label,.nav-section-header,.hdr-user,#hdr-av-txt,.hdr-badge),
body[class*="theme-"] :where(.empty-state-sub,.empty-state p,.field label,.dim,.faint,.muted,.small,.sim-hud-sub,.sim-hud-k,.home-sub,.home-footer-lbl,.spw-sub,.spw-note,.spw-mini,.spw-lines,.quote,.rsec p,.rsec ul,.rsec li,.nav-group-label,.nav-section-label,.nav-section-header,.hdr-user,#hdr-av-txt,.hdr-badge){
  color:rgba(232,240,248,.72) !important;
  text-shadow:none !important;
}
body[data-theme-active]:not([data-theme-active="dark"]):not([data-theme-active="light"]) :where(.card-title,.staff-panel-title,.mtit,.section-title,.settings-title,.modal-title,.panel-title,.empty-state-title,.home-title,.home-footer-num,.summary-value),
body[class*="theme-"] :where(.card-title,.staff-panel-title,.mtit,.section-title,.settings-title,.modal-title,.panel-title,.empty-state-title,.home-title,.home-footer-num,.summary-value){
  color:var(--theme-ui-fg) !important;
  text-shadow:none !important;
}
body[data-theme-active]:not([data-theme-active="dark"]):not([data-theme-active="light"]) :where(.chip,.plvl,.branch-current-pill,.theme-event-badge,.nav-badge,.collection-counter),
body[class*="theme-"] :where(.chip,.plvl,.branch-current-pill,.theme-event-badge,.nav-badge,.collection-counter){
  background:linear-gradient(90deg, rgba(var(--theme-accent-rgb,126,184,212), .13), rgba(var(--theme-accent-rgb,126,184,212), .08)) !important;
  border-color:var(--theme-ui-soft) !important;
  color:var(--theme-ui-fg) !important;
  box-shadow:none !important;
}
body[data-theme-active]:not([data-theme-active="dark"]):not([data-theme-active="light"]) .theme-preview-bar,
body[class*="theme-"] .theme-preview-bar{
  background:linear-gradient(90deg, rgba(var(--theme-accent-rgb,126,184,212), .82), rgba(var(--theme-accent-rgb,126,184,212), .58) 58%, rgba(255,255,255,.72)) !important;
  box-shadow:none !important;
}
body[data-theme-active]:not([data-theme-active="dark"]):not([data-theme-active="light"]) :where(.theme-card-premium,.theme-preview-mini),
body[class*="theme-"] :where(.theme-card-premium,.theme-preview-mini){
  background:var(--theme-ui-panel-strong) !important;
  border-color:var(--theme-ui-soft) !important;
}
body :where(.nav-dropdown-menu,.nav-group-menu,.account-dd,.branch-dd,.menu){
  border-radius:14px !important;
  overflow:hidden !important;
}
#nav-dropdown-root .nav-dropdown-menu.open,
#nav-dropdown-root .nav-group-menu.open{
  position:fixed !important;
  top:var(--np-nav-menu-top, 0px) !important;
  left:var(--np-nav-menu-left, 0px) !important;
  right:auto !important;
  bottom:auto !important;
  margin:0 !important;
  transform:none !important;
}
body .nav-dropdown-menu .nav-section-header,
body .nav-group-menu .nav-section-header{
  padding-top:10px !important;
}
#p-combat-mj-c .sim-fighter-card{
  transform-origin:center;
  will-change:transform,filter,box-shadow;
  overflow:hidden;
}
#p-combat-mj-c .sim-fighter-card::after{
  content:"";
  position:absolute;
  inset:-35%;
  pointer-events:none;
  opacity:0;
  transform:rotate(18deg) translateX(-45%);
  background:linear-gradient(90deg, transparent, rgba(255,255,255,.36), transparent);
}
#p-combat-mj-c .sim-fighter-card.sim-fx-lunge{animation:simFxLunge .48s cubic-bezier(.2,.85,.18,1) both;}
#p-combat-mj-c .sim-fighter-card.sim-fx-cast{animation:simFxCast .55s ease both;}
#p-combat-mj-c .sim-fighter-card.sim-fx-hit{animation:simFxHit .58s cubic-bezier(.16,.88,.24,1) both;}
#p-combat-mj-c .sim-fighter-card.sim-fx-heal{animation:simFxHeal .72s ease both;}
#p-combat-mj-c .sim-fighter-card.sim-fx-dodge{animation:simFxDodge .62s ease both;}
#p-combat-mj-c .sim-fighter-card.sim-fx-ko{animation:simFxKo .78s ease both;}
#p-combat-mj-c .sim-fighter-card.sim-fx-lunge::after,
#p-combat-mj-c .sim-fighter-card.sim-fx-hit::after,
#p-combat-mj-c .sim-fighter-card.sim-fx-ko::after{animation:simFxSheen .46s ease both;}
.sim-fx-float{
  position:fixed;
  z-index:4000;
  pointer-events:none;
  transform:translate(-50%,-50%);
  font-family:var(--fd);
  font-size:12px;
  letter-spacing:2px;
  color:#fff;
  text-shadow:0 2px 12px rgba(0,0,0,.75);
  padding:6px 10px;
  border:1px solid rgba(255,255,255,.18);
  background:rgba(5,8,16,.72);
  box-shadow:0 12px 28px rgba(0,0,0,.35);
  animation:simFxFloat 1.05s ease both;
}
.sim-fx-float.sim-fx-hit,.sim-fx-float.sim-fx-ko{color:#ffd8d8;border-color:rgba(201,74,74,.45);background:rgba(60,8,12,.76);}
.sim-fx-float.sim-fx-heal{color:#d8ffe8;border-color:rgba(90,170,122,.46);background:rgba(6,40,24,.74);}
.sim-fx-float.sim-fx-dodge{color:#d8f2ff;border-color:rgba(126,184,212,.42);background:rgba(8,28,45,.74);}
.sim-fx-trace{
  position:fixed;
  z-index:3999;
  height:2px;
  pointer-events:none;
  transform-origin:left center;
  opacity:0;
  border-radius:999px;
  animation:simFxTrace .56s ease both;
}
.sim-fx-trace-hit{background:linear-gradient(90deg,transparent,rgba(255,245,220,.95),rgba(201,74,74,.88),transparent);box-shadow:0 0 18px rgba(201,74,74,.38);}
.sim-fx-trace-heal{background:linear-gradient(90deg,transparent,rgba(120,255,180,.86),transparent);box-shadow:0 0 18px rgba(90,170,122,.38);}
.sim-fx-trace-dodge{background:linear-gradient(90deg,transparent,rgba(126,184,212,.78),transparent);box-shadow:0 0 14px rgba(126,184,212,.28);}
@keyframes simFxLunge{0%{transform:translateX(0) scale(1);}38%{transform:translateX(10px) scale(1.025);filter:brightness(1.25);}100%{transform:translateX(0) scale(1);}}
@keyframes simFxCast{0%{transform:scale(1);box-shadow:none;}45%{transform:scale(1.018);box-shadow:0 0 0 2px rgba(126,184,212,.18),0 0 34px rgba(126,184,212,.20);}100%{transform:scale(1);box-shadow:none;}}
@keyframes simFxHit{0%{transform:translateX(0);filter:brightness(1);}18%{transform:translateX(-7px);filter:brightness(1.55) saturate(1.3);}34%{transform:translateX(6px);}52%{transform:translateX(-3px);}100%{transform:translateX(0);filter:brightness(1);}}
@keyframes simFxHeal{0%{transform:scale(1);filter:brightness(1);}44%{transform:scale(1.025);filter:brightness(1.28);box-shadow:0 0 0 2px rgba(90,170,122,.22),0 0 30px rgba(90,170,122,.20);}100%{transform:scale(1);filter:brightness(1);box-shadow:none;}}
@keyframes simFxDodge{0%{transform:translateX(0);opacity:1;}32%{transform:translateX(14px) skewX(-3deg);opacity:.72;filter:blur(.2px);}64%{transform:translateX(-5px);opacity:.94;}100%{transform:translateX(0);opacity:1;filter:none;}}
@keyframes simFxKo{0%{transform:scale(1) rotate(0);filter:brightness(1);}24%{transform:scale(1.025) rotate(-1deg);filter:brightness(1.65) saturate(1.35);}100%{transform:scale(.985) rotate(0);filter:brightness(.72) grayscale(.2);}}
@keyframes simFxSheen{0%{opacity:0;transform:rotate(18deg) translateX(-55%);}35%{opacity:.55;}100%{opacity:0;transform:rotate(18deg) translateX(55%);}}
@keyframes simFxFloat{0%{opacity:0;transform:translate(-50%,4px) scale(.92);}18%{opacity:1;transform:translate(-50%,-50%) scale(1.04);}100%{opacity:0;transform:translate(-50%,-86px) scale(.98);}}
@keyframes simFxTrace{0%{opacity:0;clip-path:inset(0 100% 0 0);}20%{opacity:1;}100%{opacity:0;clip-path:inset(0 0 0 100%);}}
@media (prefers-reduced-motion: reduce){
  #p-combat-mj-c .sim-fighter-card,
  .sim-fx-float,
  .sim-fx-trace{animation:none!important;transition:none!important;}
}
</style><div class="sim-ui sim-ultra" style="max-width:1380px;">`;



  // ════════════════════════════════════════════════════════════
  // PAGE D'ACCUEIL
  // ════════════════════════════════════════════════════════════
  if(!active&&!_cs._new&&!_cs.id){ combatNewFromArchive(); return; }

  // ════════════════════════════════════════════════════════════
  // BARRE DE COMMANDE
  // ════════════════════════════════════════════════════════════
  var barBorder=phase==="resolution"?"var(--glacier)":active?"var(--red)":"rgba(126,184,212,0.2)";
  h+='<div class="sim-cmd" style="background:linear-gradient(135deg,#0d0e1c,#0f1025);border:1px solid rgba(255,255,255,0.08);border-bottom:2px solid '+barBorder+';padding:10px 16px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;position:sticky;top:0;z-index:10;">';
  h+='<div style="display:flex;align-items:center;gap:14px;">';
  if(active){
    var phaseInfo=phase==="declaration"?"DÉCLARATION":"RÉSOLUTION";
    var phaseCol=phase==="resolution"?"var(--glacier)":"var(--gold)";
    h+='<div style="display:flex;flex-direction:column;align-items:center;width:60px;padding:6px 4px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);">';
    h+='<div style="font-family:var(--fm);font-size:20px;font-weight:700;color:var(--red);line-height:1;">'+_cs.round+'</div>';
    h+='<div style="font-family:var(--fd);font-size:5px;letter-spacing:2px;color:rgba(255,255,255,0.3);margin-top:2px;">ROUND</div>';
    h+='</div>';
    h+='<div style="width:1px;height:36px;background:rgba(255,255,255,0.08);"></div>';
    h+='<div style="padding:4px 10px;border:1px solid '+phaseCol+';background:'+phaseCol.replace("var","rgba").replace(")",",0.08)")+';">';
    h+='<div style="font-family:var(--fd);font-size:8px;letter-spacing:3px;color:'+phaseCol+';">'+phaseInfo+'</div>';
    if(phase==="declaration"){
      var curF=_cs.fighters[curFi];
      if(curF) h+='<div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:2px;font-family:var(--fb);">'+esc(curF.name)+'</div>';
    } else {
      h+='<div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:2px;font-family:var(--fb);">Toutes les actions déclarées</div>';
    }
    h+='</div>';
  }
  h+='<input id="c-name" value="'+(_cs.name||"").replace(/"/g,"&quot;")+'" oninput="_cs.name=this.value" placeholder="Nom du combat…" style="font-family:var(--fd);font-size:13px;letter-spacing:2px;background:transparent;border:none;color:var(--text);width:220px;outline:none;">';
  h+='</div>';
  h+='<div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;">';
  if(!active){
    h+='<button onclick="combatStart()" style="padding:8px 22px;font-family:var(--fd);font-size:9px;letter-spacing:3px;background:rgba(90,170,122,0.1);border:1px solid rgba(90,170,122,0.4);color:var(--green);cursor:pointer;transition:all .2s;" onmouseover="this.style.background=\'rgba(90,170,122,0.2)\'" onmouseout="this.style.background=\'rgba(90,170,122,0.1)\'">▶ DÉMARRER</button>';
  } else if(phase==="resolution"){
    h+='<button onclick="combatResolve()" style="padding:8px 22px;font-family:var(--fd);font-size:10px;letter-spacing:3px;background:rgba(126,184,212,0.12);border:2px solid var(--glacier);color:var(--glacier);cursor:pointer;transition:all .2s;font-weight:700;" onmouseover="this.style.background=\'rgba(126,184,212,0.22)\'" onmouseout="this.style.background=\'rgba(126,184,212,0.12)\'">⚡ RÉSOUDRE LE ROUND</button>';
  }
  h+='<button onclick="combatUndo()" title="Annuler" style="padding:7px 10px;background:transparent;border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.25);cursor:pointer;font-size:12px;transition:all .15s;" onmouseover="this.style.borderColor=\'rgba(255,255,255,0.2)\';this.style.color=\'var(--faint)\'" onmouseout="this.style.borderColor=\'rgba(255,255,255,0.08)\';this.style.color=\'rgba(255,255,255,0.25)\'">↩</button>';
  if(active) h+='<button onclick="if(confirm(\'Terminer le combat ?\')) combatEnd()" style="padding:7px 12px;font-family:var(--fd);font-size:8px;letter-spacing:2px;background:rgba(201,74,74,0.06);border:1px solid rgba(201,74,74,0.2);color:rgba(201,74,74,0.5);cursor:pointer;transition:all .15s;" onmouseover="this.style.borderColor=\'rgba(201,74,74,0.4)\';this.style.color=\'var(--red)\'" onmouseout="this.style.borderColor=\'rgba(201,74,74,0.2)\';this.style.color=\'rgba(201,74,74,0.5)\'">■ FIN</button>';
  if(_cs.id) h+='<button onclick="combatExportDiscord()" style="padding:7px 10px;background:transparent;border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.25);cursor:pointer;font-size:11px;transition:all .15s;" onmouseover="this.style.borderColor=\'var(--glacier-dim)\'" onmouseout="this.style.borderColor=\'rgba(255,255,255,0.08)\'">📋</button>';
  if(_cs.id) h+='<button onclick="combatSaveArchive()" style="padding:7px 10px;background:transparent;border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.25);cursor:pointer;font-size:11px;transition:all .15s;" onmouseover="this.style.borderColor=\'var(--green)\'" onmouseout="this.style.borderColor=\'rgba(255,255,255,0.08)\'">💾</button>';
  h+='<button onclick="combatNewFromArchive()" style="padding:7px 10px;background:transparent;border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.25);cursor:pointer;font-size:11px;transition:all .15s;" onmouseover="this.style.borderColor=\'var(--glacier-dim)\'" onmouseout="this.style.borderColor=\'rgba(255,255,255,0.08)\'">＋</button>';
  h+='</div></div>';

  var aliveCount=_cs.fighters.filter(function(f){return (f.pvCur||0)>0;}).length;
  var koCount=Math.max(0,_cs.fighters.length-aliveCount);
  var playerCount=_cs.fighters.filter(function(f){return f.type==="player";}).length;
  var enemyCount=Math.max(0,_cs.fighters.length-playerCount);
  var declaredCount=active?_cs.fighters.filter(function(_,fi){ return (((_cs.decl||{})[fi]||[]).length >= cActionsMax(fi)); }).length:0;
  var hud4=active ? (phase==="declaration" ? declaredCount+" / "+_cs.fighters.length : "PRÊT") : (_cs.fighters.length?"SÉLECTION OK":"EN ATTENTE");
  h+='<div class="sim-hud-strip">';
  h+='<div class="sim-hud-cell"><div class="sim-hud-k">COMBATTANTS</div><div class="sim-hud-v">'+_cs.fighters.length+'</div><div class="sim-hud-sub">'+playerCount+' joueurs · '+enemyCount+' adversaires</div></div>';
  h+='<div class="sim-hud-cell"><div class="sim-hud-k">STATUT</div><div class="sim-hud-v">'+aliveCount+'</div><div class="sim-hud-sub">'+koCount+' KO sur le terrain</div></div>';
  h+='<div class="sim-hud-cell"><div class="sim-hud-k">ROUND</div><div class="sim-hud-v">'+(active?_cs.round:'—')+'</div><div class="sim-hud-sub">'+(active?(phase==="declaration"?'Phase déclaration':'Phase résolution'):'Combat non lancé')+'</div></div>';
  h+='<div class="sim-hud-cell"><div class="sim-hud-k">ÉTAT TACTIQUE</div><div class="sim-hud-v">'+hud4+'</div><div class="sim-hud-sub">'+(active?(phase==="declaration"?'Déclarations finalisées':'Round prêt à résoudre'):'Prépare la composition')+'</div></div>';
  h+='</div>';

  // ════════════════════════════════════════════════════════════
  // SÉLECTION COMBATTANTS (avant démarrage)
  // ════════════════════════════════════════════════════════════
  if(!active){
    h+='<div class="sim-prep-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px;">';
    // Joueurs
    h+='<div class="sim-panel sim-panel-player" style="background:linear-gradient(160deg,#0e1020,#0d0e18);border:1px solid rgba(126,184,212,0.15);padding:16px;">';
    h+='<div style="font-family:var(--fd);font-size:7px;letter-spacing:5px;color:var(--glacier-dim);margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid rgba(126,184,212,0.08);">ÉLÈVES DU SERMENT</div>';
    h+='<div style="display:flex;flex-direction:column;gap:4px;">';
    players.filter(function(p){return p.level>0;}).forEach(function(p){
      var inC=_cs.fighters.some(function(f){return f.pid===p.id;});
      var pvPct=Math.round(p.pvCur/p.pvMax*100);
      var pvC=pvPct>60?"var(--green)":pvPct>30?"var(--gold)":"var(--red)";
      h+='<div class="sim-select-row" onclick="combatToggleFighter(\''+p.id+'\',\'player\')" style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:'+(inC?"rgba(126,184,212,0.06)":"transparent")+';border:1px solid '+(inC?"rgba(126,184,212,0.3)":"rgba(255,255,255,0.05)")+';cursor:pointer;transition:all .15s;" onmouseover="this.style.borderColor=\'rgba(126,184,212,0.2)\'" onmouseout="this.style.borderColor=\''+(inC?"rgba(126,184,212,0.3)":"rgba(255,255,255,0.05)")+'\'">';
      if(p.avatar) h+='<div style="width:30px;height:30px;flex-shrink:0;overflow:hidden;border:1px solid '+(inC?"var(--glacier-dim)":"rgba(255,255,255,0.08)")+';"><img src="'+p.avatar+'" style="width:100%;height:100%;object-fit:cover;"></div>';
      else h+='<div style="width:30px;height:30px;flex-shrink:0;border:1px solid '+(inC?"var(--glacier-dim)":"rgba(255,255,255,0.08)")+';display:flex;align-items:center;justify-content:center;font-family:var(--fd);font-size:11px;color:'+(inC?"var(--glacier)":"var(--faint)")+';">'+p.name[0]+'</div>';
      h+='<div style="flex:1;min-width:0;">';
      h+='<div style="font-family:var(--fd);font-size:11px;letter-spacing:1px;color:'+(inC?"var(--text)":"var(--faint)")+';">'+esc(p.name)+'</div>';
      h+='<div style="font-size:10px;color:rgba(255,255,255,0.25);margin-top:1px;">'+esc(p.classe)+' · Niv. '+p.level+'</div>';
      h+='</div>';
      h+='<div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px;">';
      h+='<div style="width:44px;height:3px;background:rgba(255,255,255,0.05);"><div style="height:100%;width:'+pvPct+'%;background:'+pvC+';transition:width .3s;"></div></div>';
      h+='<span style="font-family:var(--fm);font-size:8px;color:'+pvC+';">'+p.pvCur+'/'+p.pvMax+'</span>';
      h+='</div>';
      h+='<div style="font-size:18px;color:'+(inC?"var(--glacier)":"rgba(255,255,255,0.1)")+';">'+(inC?"◉":"○")+'</div>';
      h+='</div>';
    });
    if(!players.length) h+='<div style="color:var(--faint);font-style:italic;font-size:13px;padding:8px 0;">Aucun joueur.</div>';
    h+='</div></div>';
    // Monstres
    h+='<div class="sim-panel sim-panel-enemy" style="background:linear-gradient(160deg,#120e0e,#0d0e18);border:1px solid rgba(201,74,74,0.15);padding:16px;">';
    h+='<div style="font-family:var(--fd);font-size:7px;letter-spacing:5px;color:rgba(201,74,74,0.5);margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid rgba(201,74,74,0.08);">ADVERSAIRES</div>';
    h+='<div style="display:flex;flex-direction:column;gap:4px;">';
    beasts.forEach(function(b){
      var inC=_cs.fighters.some(function(f){return f.bid===b.id;});
      h+='<div class="sim-select-row" onclick="combatToggleFighter(\''+b.id+'\',\'beast\')" style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:'+(inC?"rgba(201,74,74,0.06)":"transparent")+';border:1px solid '+(inC?"rgba(201,74,74,0.3)":"rgba(255,255,255,0.05)")+';cursor:pointer;transition:all .15s;" onmouseover="this.style.borderColor=\'rgba(201,74,74,0.2)\'" onmouseout="this.style.borderColor=\''+(inC?"rgba(201,74,74,0.3)":"rgba(255,255,255,0.05)")+'\'">';
      if(b.img) h+='<div style="width:30px;height:30px;flex-shrink:0;overflow:hidden;border:1px solid '+(inC?"rgba(201,74,74,0.4)":"rgba(255,255,255,0.08)")+';"><img src="'+esc(b.img)+'" style="width:100%;height:100%;object-fit:cover;"></div>';
      else h+='<div style="width:30px;height:30px;flex-shrink:0;border:1px solid '+(inC?"rgba(201,74,74,0.4)":"rgba(255,255,255,0.08)")+';display:flex;align-items:center;justify-content:center;font-size:14px;">👾</div>';
      h+='<div style="flex:1;min-width:0;">';
      h+='<div style="font-family:var(--fd);font-size:11px;letter-spacing:1px;color:'+(inC?"var(--text)":"var(--faint)")+';">'+esc(b.nom)+'</div>';
      h+='<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:10px;color:rgba(255,255,255,0.25);margin-top:2px;"><span>Niv.'+b.niv+' · PV:'+b.pv+'</span>'+bTag(b.beh,'compact')+'</div>';
      h+='</div>';
      h+='<div style="font-size:18px;color:'+(inC?"var(--red)":"rgba(255,255,255,0.1)")+';">'+(inC?"◉":"○")+'</div>';
      h+='</div>';
    });
    if(!beasts.length) h+='<div style="color:var(--faint);font-style:italic;font-size:13px;padding:8px 0;">Aucun monstre.</div>';
    h+='</div></div></div>';
    // Formation
    if(_cs.fighters.length){
      h+='<div class="sim-formation" style="display:flex;align-items:center;gap:10px;padding:10px 16px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);margin-bottom:18px;">';
      h+='<div style="font-family:var(--fd);font-size:7px;letter-spacing:4px;color:rgba(255,255,255,0.2);">FORMATION</div>';
      h+='<div style="width:1px;height:20px;background:rgba(255,255,255,0.08);"></div>';
      _cs.fighters.forEach(function(f){
        var isJ=f.type==="player";
        h+='<span style="font-family:var(--fd);font-size:9px;letter-spacing:1px;padding:2px 8px;border:1px solid '+(isJ?"rgba(126,184,212,0.2)":"rgba(201,74,74,0.2)")+';color:'+(isJ?"rgba(126,184,212,0.6)":"rgba(201,74,74,0.5)")+';">'+esc(f.name)+'</span>';
      });
      h+='<div style="font-family:var(--fd);font-size:7px;letter-spacing:2px;color:rgba(255,255,255,0.2);margin-left:auto;">Ordre initiative : ★ d\'abord</div>';
      // Bouton init
      if(_cs.fighters.length){
        h+=' <select onchange="combatSetInit(parseInt(this.value))" style="font-size:9px;padding:2px 6px;background:var(--bg4);border:1px solid rgba(255,255,255,0.1);color:var(--faint);">';
        h+='<option value="">Initiative…</option>';
        _cs.fighters.forEach(function(f,fi){ h+='<option value="'+fi+'"'+(fi===_cs.initiative?" selected":"")+'>'+esc(f.name)+'</option>'; });
        h+='</select>';
      }
      h+='</div>';
    }
  }

  // ════════════════════════════════════════════════════════════
  // TRACKER INITIATIVE (combat actif)
  // ════════════════════════════════════════════════════════════
  if(active&&_cs.order.length){
    h+='<div class="sim-tracker" style="display:flex;gap:3px;margin-bottom:16px;overflow-x:auto;padding:2px;">';
    _cs.order.forEach(function(fi,pos){
      var f=_cs.fighters[fi]; if(!f) return;
      var isCurDecl=phase==="declaration"&&pos===_cs.turn;
      var isJ=f.type==="player";
      var ko=f.pvCur<=0;
      var accent=isJ?"var(--glacier)":"var(--red)";
      var accentRaw=isJ?"rgba(126,184,212":"rgba(201,74,74";
      var pvPct=Math.round(f.pvCur/f.pvMax*100);
      var pvC=pvPct>60?"var(--green)":pvPct>30?"var(--gold)":"var(--red)";
      var decls=((_cs.decl||{})[fi]||[]).filter(function(d){return d.action!=="passer";});
      var maxActs=cActionsMax(fi);
      var declared=(_cs.decl||{})[fi]?(_cs.decl[fi]||[]).length:0;
      var done=declared>=maxActs;

      h+='<div onclick="'+(isCurDecl||done?"":"cEditDecl("+fi+")")+'" title="'+esc(f.name)+'" style="flex-shrink:0;width:84px;cursor:'+(isCurDecl?"default":"pointer")+';transition:transform .15s;opacity:'+(ko?".35":"1")+';transform:'+(isCurDecl?"scale(1.05)":"scale(1)")+'" onmouseover="if(!'+isCurDecl+'&&!'+ko+') this.style.transform=\'scale(1.02)\'" onmouseout="this.style.transform=\''+(isCurDecl?"scale(1.05)":"scale(1)")+'\'">';
      h+='<div style="background:'+(isCurDecl?accentRaw+",0.1)":"linear-gradient(160deg,#0f1022,#0d0e18)")+';border:1px solid '+(isCurDecl?accent:(done?accentRaw+",0.3)":"rgba(255,255,255,0.07)"))+';padding:7px 5px;text-align:center;position:relative;">';
      if(isCurDecl) h+='<div style="position:absolute;top:0;left:0;right:0;height:2px;background:'+accent+';"></div>';
      if(done&&!ko) h+='<div style="position:absolute;top:0;left:0;right:0;height:2px;background:rgba(90,170,122,0.6);"></div>';
      h+='<div style="font-family:var(--fm);font-size:9px;font-weight:700;color:'+(isCurDecl?accent:done?"rgba(90,170,122,0.5)":"rgba(255,255,255,0.2)")+';">'+(pos+1)+'</div>';
      if(f.img) h+='<div style="width:44px;height:44px;margin:5px auto 4px;overflow:hidden;border-radius:50%;border:2px solid '+(isCurDecl?accent:(done?"rgba(90,170,122,0.4)":"rgba(255,255,255,0.1)"))+';"><img src="'+f.img+'" style="width:100%;height:100%;object-fit:cover;"></div>';
      else h+='<div style="width:44px;height:44px;margin:5px auto 4px;border-radius:50%;border:2px solid '+(isCurDecl?accent:(done?"rgba(90,170,122,0.4)":"rgba(255,255,255,0.1)"))+';display:flex;align-items:center;justify-content:center;font-size:'+(isJ?15:20)+'px;background:rgba(255,255,255,0.02);">'+(isJ?'<span style="font-family:var(--fd);font-size:12px;color:'+accent+';">'+f.name[0]+'</span>':'👾')+'</div>';
      h+='<div style="font-family:var(--fd);font-size:7px;letter-spacing:1px;color:'+(isCurDecl?accent:"var(--dim)")+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:4px;">'+f.name.split(" ")[0]+'</div>';
      // Barre PV
      h+='<div style="height:3px;background:rgba(255,255,255,0.05);margin:0 3px;"><div style="height:100%;width:'+pvPct+'%;background:'+pvC+';transition:width .4s;"></div></div>';
      // Déclarations faites (petits points)
      h+='<div style="display:flex;justify-content:center;gap:2px;margin-top:4px;">';
      for(var aa=0;aa<maxActs;aa++){
        var fil=aa<((_cs.decl||{})[fi]||[]).length;
        h+='<div style="width:5px;height:5px;border-radius:50%;background:'+(fil?(done?"rgba(90,170,122,0.7)":accent):"rgba(255,255,255,0.08)")+';transition:background .2s;"></div>';
      }
      h+='</div>';
      if(done&&!ko) h+='<div style="font-family:var(--fd);font-size:6px;letter-spacing:1px;color:rgba(90,170,122,0.6);margin-top:3px;">✓ DÉCLARÉ</div>';
      if(ko) h+='<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);"><div style="font-family:var(--fd);font-size:8px;letter-spacing:2px;color:var(--red);border:1px solid var(--red);padding:2px 6px;">KO</div></div>';
      h+='</div></div>';
    });
    h+='</div>';
  }

  // ════════════════════════════════════════════════════════════
  // CARTES COMBATTANTS
  // ════════════════════════════════════════════════════════════
  if(_cs.fighters.length){
    h+='<div class="sim-fighter-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:10px;margin-bottom:18px;">';
    _cs.fighters.forEach(function(f,fi){
      var isCurDecl=active&&phase==="declaration"&&_cs.order[_cs.turn]===fi;
      var isDone=active&&((_cs.decl||{})[fi]||[]).length>=cActionsMax(fi);
      var isJ=f.type==="player";
      var isDead=f.pvCur<=0;
      var pvPct=Math.max(0,Math.min(100,Math.round(f.pvCur/f.pvMax*100)));
      var epPct=Math.max(0,Math.min(100,Math.round(f.epCur/f.epMax*100)));
      var emPct=f.emMax?Math.max(0,Math.min(100,Math.round(f.emCur/f.emMax*100))):0;
      var pvCol=pvPct>60?"var(--green)":pvPct>30?"var(--gold)":"var(--red)";
      var accent=isJ?"var(--glacier)":"var(--red)";
      var accentDim=isJ?"rgba(126,184,212,0.1)":"rgba(201,74,74,0.1)";
      var accentBorder=isJ?"rgba(126,184,212,0.25)":"rgba(201,74,74,0.25)";
      var pvBonus=f.pvMaxBonus||0, pvReal=f.pvMax-pvBonus;
      var shieldCur=pvBonus>0?Math.max(0,Math.min(pvBonus,f.pvCur)):0;
      var realCur=Math.max(0,f.pvCur-shieldCur);
      var totalMax=f.pvMax||1;
      var shieldFullPct=Math.round(pvBonus/totalMax*100);
      var realFillPct=Math.round(realCur/totalMax*100);
      var shieldFillPct=Math.round(shieldCur/totalMax*100);
      var decls=(_cs.decl||{})[fi]||[];
      var maxActs=active?cActionsMax(fi):3;
      var actLeft=Math.max(0,maxActs-decls.length);
      var borderStyle=isCurDecl?accent:(isDone&&active?"rgba(90,170,122,0.4)":(isDead?"rgba(201,74,74,0.3)":"rgba(255,255,255,0.07)"));
      var leftBorder=isCurDecl?accent:(isJ?"rgba(126,184,212,0.2)":"rgba(201,74,74,0.2)");
      var incomingTaunt=cGetForcedTargetInfo(fi);
      var outgoingTauntCount=cCountTauntedBySource(fi);
      var fighterCid=cEnsureFighterCid(f);

      h+='<div class="sim-fighter-card" data-cid="'+esc(fighterCid)+'" style="background:'+(isCurDecl?("linear-gradient(160deg,"+accentDim+",rgba(0,0,0,0))"):"linear-gradient(160deg,#0f1022,#0d0e18)")+';border:1px solid '+borderStyle+';border-left:3px solid '+leftBorder+';padding:12px;position:relative;'+(isDead?"opacity:.45;":"")+'">';

      // En-tête
      h+='<div style="position:absolute;top:6px;right:8px;display:flex;align-items:center;gap:5px;">';
      if(active&&_cs.order.indexOf(fi)>=0) h+='<span style="font-family:var(--fm);font-size:10px;color:rgba(255,255,255,0.2);">#'+(_cs.order.indexOf(fi)+1)+'</span>';
      if(isDone&&active&&!isDead) h+='<span style="font-family:var(--fd);font-size:7px;letter-spacing:1px;padding:1px 5px;border:1px solid rgba(90,170,122,0.4);color:rgba(90,170,122,0.7);">✓ DÉCLARÉ</span>';
      if(isCurDecl) h+='<span style="font-family:var(--fd);font-size:7px;letter-spacing:2px;padding:2px 5px;background:'+accent+';color:var(--bg);">TOUR</span>';
      if(isDead) h+='<span style="font-family:var(--fd);font-size:7px;padding:2px 5px;background:var(--red);color:#fff;">KO</span>';
      h+='<button onclick="combatRemoveFighter('+fi+')" style="background:none;border:none;color:rgba(255,255,255,0.1);cursor:pointer;font-size:12px;transition:color .15s;" onmouseover="this.style.color=\'var(--red)\'" onmouseout="this.style.color=\'rgba(255,255,255,0.1)\'">✕</button>';
      h+='</div>';

      // Avatar + Nom
      h+='<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;padding-right:80px;">';
      if(f.img) h+='<div style="width:42px;height:42px;flex-shrink:0;overflow:hidden;border:1px solid '+(isCurDecl?accent:accentBorder)+';"><img src="'+f.img+'" style="width:100%;height:100%;object-fit:cover;"></div>';
      else h+='<div style="width:42px;height:42px;flex-shrink:0;border:1px solid '+(isCurDecl?accent:accentBorder)+';display:flex;align-items:center;justify-content:center;font-size:'+(isJ?15:20)+'px;">'+(isJ?'<span style="font-family:var(--fd);color:'+accent+';font-size:13px;">'+f.name[0]+'</span>':'👾')+'</div>';
      h+='<div>';
      h+='<div style="font-family:var(--fd);font-size:12px;letter-spacing:1.5px;color:'+(isCurDecl?accent:"var(--text)")+';">'+esc(f.name)+'</div>';
      h+='<div style="font-size:10px;color:rgba(255,255,255,0.25);margin-top:1px;">'+(isJ?f.classe+" · Niv. "+f.level:"Créature · Niv. "+f.level)+(canM&&active&&!isCurDecl&&!isDone?'<span onclick="cEditDecl('+fi+')" style="cursor:pointer;color:rgba(126,184,212,0.4);margin-left:6px;">✏ Modifier</span>':'')+'</div>';
      if(!isJ&&f.beh) h+='<div style="margin-top:5px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">'+bTag(f.beh,'full')+'</div>';
      if(incomingTaunt){
        h+='<div style="margin-top:5px;display:inline-flex;align-items:center;gap:5px;padding:3px 6px;background:rgba(201,74,74,0.08);border:1px solid rgba(201,74,74,0.18);font-family:var(--fd);font-size:7px;letter-spacing:1px;color:rgba(201,74,74,0.85);">🎯 '+esc(incomingTaunt.source.name)+' · '+(incomingTaunt.permanent?'verrou permanent':'bloqué 1 tour')+'</div>';
      }
      if(outgoingTauntCount>0){
        h+='<div style="margin-top:5px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">';
        h+='<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 6px;background:rgba(126,184,212,0.08);border:1px solid rgba(126,184,212,0.18);font-family:var(--fd);font-size:7px;letter-spacing:1px;color:rgba(126,184,212,0.85);">🛡 Appel actif · '+outgoingTauntCount+' cible'+(outgoingTauntCount>1?'s':'')+'</span>';
        h+='<button onclick="combatSnapshot();cDisableShieldCall('+fi+');rCombat(\'p-combat-mj-c\');" style="padding:3px 6px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.45);cursor:pointer;font-family:var(--fd);font-size:7px;letter-spacing:1px;">Désactiver</button>';
        h+='</div>';
      }
      h+='</div></div>';

      // Barres PV
      h+='<div style="margin-bottom:5px;">';
      h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">';
      h+='<div style="display:flex;align-items:center;gap:6px;">';
      h+='<span style="font-family:var(--fd);font-size:7px;letter-spacing:3px;color:rgba(255,255,255,0.25);">PV</span>';
      if(pvBonus>0) h+='<span style="font-family:var(--fd);font-size:7px;color:#d4b840;">🛡 '+shieldCur+'/'+pvBonus+'</span>';
      h+='</div>';
      h+='<div style="display:flex;align-items:center;gap:4px;">';
      if(canM) h+='<button onclick="cAdj('+fi+',\'pv\',-1)" style="width:15px;height:15px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.25);cursor:pointer;font-size:10px;transition:all .1s;" onmouseover="this.style.color=\'var(--red)\';this.style.borderColor=\'var(--red)\'" onmouseout="this.style.color=\'rgba(255,255,255,0.25)\';this.style.borderColor=\'rgba(255,255,255,0.07)\'">−</button>';
      h+='<span style="font-family:var(--fm);font-size:12px;color:'+pvCol+';">'+f.pvCur+'<span style="font-size:9px;color:rgba(255,255,255,0.2);">/'+f.pvMax+'</span></span>';
      if(canM) h+='<button onclick="cAdj('+fi+',\'pv\',1)" style="width:15px;height:15px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.25);cursor:pointer;font-size:10px;transition:all .1s;" onmouseover="this.style.color=\'var(--green)\';this.style.borderColor=\'var(--green)\'" onmouseout="this.style.color=\'rgba(255,255,255,0.25)\';this.style.borderColor=\'rgba(255,255,255,0.07)\'">+</button>';
      h+='</div></div>';
      if(pvBonus>0){
        h+='<div style="height:7px;background:rgba(255,255,255,0.04);position:relative;overflow:hidden;">';
        h+='<div style="position:absolute;left:0;top:0;height:100%;width:'+shieldFullPct+'%;background:rgba(212,184,64,0.1);"></div>';
        h+='<div style="position:absolute;left:0;top:0;height:100%;width:'+shieldFillPct+'%;background:linear-gradient(90deg,#a89018,#e8d060);transition:width .4s;"></div>';
        h+='<div style="position:absolute;left:'+shieldFullPct+'%;top:0;height:100%;width:'+realFillPct+'%;background:'+pvCol+';transition:width .4s;"></div>';
        h+='<div style="position:absolute;left:'+shieldFullPct+'%;top:0;height:100%;width:1px;background:rgba(255,255,255,0.15);"></div>';
        h+='</div>';
      } else {
        h+='<div style="height:7px;background:rgba(255,255,255,0.04);overflow:hidden;"><div style="height:100%;width:'+pvPct+'%;background:'+pvCol+';transition:width .4s;"></div></div>';
      }
      h+='</div>';
      // EP
      h+='<div style="margin-bottom:5px;">';
      h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">';
      h+='<span style="font-family:var(--fd);font-size:7px;letter-spacing:3px;color:rgba(255,255,255,0.25);">EP</span>';
      h+='<div style="display:flex;align-items:center;gap:4px;">';
      if(canM) h+='<button onclick="cAdj('+fi+',\'ep\',-1)" style="width:15px;height:15px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.25);cursor:pointer;font-size:10px;transition:all .1s;" onmouseover="this.style.color=\'var(--red)\'" onmouseout="this.style.color=\'rgba(255,255,255,0.25)\'">−</button>';
      h+='<span style="font-family:var(--fm);font-size:12px;color:var(--gold);">'+f.epCur+'<span style="font-size:9px;color:rgba(255,255,255,0.2);">/'+f.epMax+'</span></span>';
      if(canM) h+='<button onclick="cAdj('+fi+',\'ep\',1)" style="width:15px;height:15px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.25);cursor:pointer;font-size:10px;transition:all .1s;" onmouseover="this.style.color=\'var(--green)\'" onmouseout="this.style.color=\'rgba(255,255,255,0.25)\'">+</button>';
      h+='</div></div>';
      h+='<div style="height:5px;background:rgba(255,255,255,0.04);overflow:hidden;"><div style="height:100%;width:'+epPct+'%;background:var(--gold);opacity:.8;transition:width .4s;"></div></div>';
      h+='</div>';
      // EM
      if(isJ){
        h+='<div style="margin-bottom:8px;">';
        h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">';
        h+='<span style="font-family:var(--fd);font-size:7px;letter-spacing:3px;color:rgba(255,255,255,0.25);">EM</span>';
        h+='<div style="display:flex;align-items:center;gap:4px;">';
        if(canM) h+='<button onclick="cAdj('+fi+',\'em\',-1)" style="width:15px;height:15px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.25);cursor:pointer;font-size:10px;transition:all .1s;" onmouseover="this.style.color=\'var(--red)\'" onmouseout="this.style.color=\'rgba(255,255,255,0.25)\'">−</button>';
        h+='<span style="font-family:var(--fm);font-size:12px;color:var(--purple);">'+f.emCur+'<span style="font-size:9px;color:rgba(255,255,255,0.2);">/'+f.emMax+'</span></span>';
        if(canM) h+='<button onclick="cAdj('+fi+',\'em\',1)" style="width:15px;height:15px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.25);cursor:pointer;font-size:10px;transition:all .1s;" onmouseover="this.style.color=\'var(--green)\'" onmouseout="this.style.color=\'rgba(255,255,255,0.25)\'">+</button>';
        h+='</div></div>';
        h+='<div style="height:5px;background:rgba(255,255,255,0.04);overflow:hidden;"><div style="height:100%;width:'+emPct+'%;background:var(--purple);opacity:.65;transition:width .4s;"></div></div>';
        h+='</div>';
      }

      // Statuts — badges lisibles avec fond coloré
      if((f.statuts||[]).length){
        h+='<div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:8px;">';
        f.statuts.forEach(function(st,si){
          var def=STATUT_EFFECTS[st.id]||{label:st.id,col:"#c9a84c",icon:"⚠"};
          var sc=def.col||"#c9a84c";
          // Fond coloré pour lisibilité maximale
          h+='<div style="display:inline-flex;align-items:center;gap:4px;padding:3px 7px;background:'+sc+'22;border:1px solid '+sc+'88;font-family:var(--fd);font-size:8px;letter-spacing:1px;color:'+sc+';border-radius:2px;">';
          h+='<span style="font-size:10px;">'+def.icon+'</span>';
          h+='<span>'+def.label+'</span>';
          if(st.tours) h+='<span style="font-family:var(--fm);font-size:8px;opacity:.7;background:rgba(0,0,0,0.3);padding:0 3px;border-radius:2px;">'+st.tours+'T</span>';
          if(canM) h+='<button onclick="combatRemoveStatut('+fi+','+si+')" style="background:rgba(0,0,0,0.3);border:none;cursor:pointer;font-size:9px;padding:1px 3px;color:'+sc+';border-radius:2px;line-height:1;transition:background .15s;" onmouseover="this.style.background=\'rgba(201,74,74,0.4)\'" onmouseout="this.style.background=\'rgba(0,0,0,0.3)\'">✕</button>';
          h+='</div>';
        });
        h+='</div>';
      }
      // Ajouter statut (MJ seulement)
      if(active&&canM){
        var sopts=Object.keys(STATUT_EFFECTS).map(function(k){return'<option value="'+k+'">'+STATUT_EFFECTS[k].icon+' '+STATUT_EFFECTS[k].label+'</option>';}).join("");
        h+='<div style="display:flex;gap:2px;margin-bottom:8px;">';
        h+='<select id="cst-sel-'+fi+'" style="flex:1;font-size:9px;padding:2px 4px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.3);"><option value="">+ Statut…</option>'+sopts+'</select>';
        h+='<input id="cst-t-'+fi+'" type="number" min="1" max="10" value="2" title="Tours" style="width:30px;font-size:9px;padding:2px 3px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);color:var(--text);text-align:center;">';
        h+='<button onclick="combatAddStatut('+fi+')" style="font-size:9px;padding:2px 6px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.25);cursor:pointer;transition:all .15s;" onmouseover="this.style.borderColor=\'var(--glacier-dim)\'" onmouseout="this.style.borderColor=\'rgba(255,255,255,0.07)\'">+</button>';
        h+='</div>';
      }

      // ── PANNEAU DÉCLARATION (si c'est le tour de ce combattant) ──
      if(isCurDecl&&!isDead){
        h+='<div class="sim-declare-panel" style="border-top:1px solid '+accent.replace("var","rgba").replace(")",",0.2)")+';padding-top:10px;margin-top:4px;">';
        h+='<div style="font-family:var(--fd);font-size:7px;letter-spacing:4px;color:'+accent+';margin-bottom:8px;opacity:.7;">DÉCLARER LES ACTIONS — '+actLeft+' restante'+(actLeft>1?"s":"")+'</div>';

        var sd=isJ?(getAllSD()[f.classe]||null):null;
        var dmgBase=sd?sd.dmg:(f.dmgBase||6);
        var dmg=dmgBase+(f.level||1);
        var pugDmg=3+(f.level||1);

        // Cible pour les attaques
        var prevTgt=csGet("t",fi)||"";
        var forcedEnemyInfo=cGetForcedTargetInfo(fi);
        if(forcedEnemyInfo){ var _forcedIdx=_cs.fighters.indexOf(forcedEnemyInfo.source); if(_forcedIdx>=0) prevTgt=String(_forcedIdx); }
        h+='<div style="margin-bottom:7px;">';
        h+='<div style="font-family:var(--fd);font-size:7px;letter-spacing:2px;color:rgba(255,255,255,0.2);margin-bottom:4px;">CIBLE</div>';
        if(forcedEnemyInfo) h+='<div style="margin-bottom:5px;padding:5px 6px;background:rgba(201,74,74,0.08);border:1px solid rgba(201,74,74,0.18);font-family:var(--fd);font-size:7px;letter-spacing:1px;color:rgba(201,74,74,0.85);">🎯 Cible forcée : '+esc(forcedEnemyInfo.source.name)+' · '+(forcedEnemyInfo.permanent?'appui permanent':'blocage 1 tour')+'</div>';
        h+='<select id="decl-tgt-'+fi+'" '+(forcedEnemyInfo?'disabled':'')+' onchange="csSet(\'t\','+fi+',this.value)" style="width:100%;font-size:11px;padding:4px 6px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);color:var(--dim);margin-bottom:2px;">';
        h+='<option value="">— Sélectionner —</option>';
        _cs.fighters.forEach(function(t,ti){
          var isSelf=ti===fi;
          var label=t.name+(t.pvCur<=0?" [KO]":"")+(isSelf?" (moi-même)":t.type===f.type?" (allié)":"");
          h+='<option value="'+ti+'"'+(prevTgt===String(ti)?" selected":"")+'>'+label+'</option>';
        });
        h+='</select></div>';

        // Grille actions
        h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">';
        var declBtns=[
          {a:"frappe",   l:"⚔ Frappe",    sub:dmg+" dmg",   col:"rgba(201,74,74"},
        ];
        if(isJ){
          declBtns.push({a:"pugilat",  l:"👊 Pugilat",   sub:pugDmg+" dmg",col:"rgba(201,74,74"});
        }
        declBtns.push(
          {a:"esquive",  l:"🛡 Esquive",   sub:"annule",      col:"rgba(126,184,212"},
          {a:"subit",    l:"🩸 Subit",     sub:"0%",          col:"rgba(255,255,255"},
          {a:"bloquer",  l:"🛡 Bloquer",   sub:(f.type==="beast"?"corps −25%":"−50%"), col:"rgba(126,184,212"},
        );
        if(f.type!=="beast"){
          declBtns.push({a:"parer",    l:"🤜 Parer",     sub:"−25%",        col:"rgba(126,184,212"});
        }
        declBtns.push(
          {a:"deplacer", l:"🏃 Déplacement",sub:"",           col:"rgba(255,255,255"},
        );
        declBtns.forEach(function(btn){
          var needsTgt=btn.a==="frappe"||btn.a==="pugilat";
          var val=btn.a==="frappe"?dmg:btn.a==="pugilat"?pugDmg:0;
          // Guard cible obligatoire pour les attaques
          var onclickCode=needsTgt
            ?"var _t=parseInt(document.getElementById('decl-tgt-"+fi+"').value);if(isNaN(_t)){var _s=document.getElementById('decl-tgt-"+fi+"');_s.style.borderColor='var(--red)';_s.style.boxShadow='0 0 0 2px rgba(201,74,74,0.4)';setTimeout(function(){_s.style.borderColor='';_s.style.boxShadow='';},1500);return;}cDeclareAction("+fi+",'"+(btn.a)+"',{target:_t,value:"+val+"})"
            :"cDeclareAction("+fi+",'"+(btn.a)+"',{target:undefined,value:"+val+"})";
          h+='<button onclick="'+onclickCode+'" style="padding:7px 4px;background:'+btn.col+',0.07);border:1px solid '+btn.col+',0.2);cursor:pointer;text-align:center;transition:all .15s;" onmouseover="this.style.background=\''+btn.col+',0.14)\'" onmouseout="this.style.background=\''+btn.col+',0.07)\'">'
            +'<div style="font-size:11px;color:var(--text);">'+btn.l+'</div>'
            +(btn.sub?'<div style="font-family:var(--fm);font-size:8px;color:rgba(255,255,255,0.25);margin-top:1px;">'+btn.sub+'</div>':"")
            +'</button>';
        });
        h+='</div>';

        // Capacités de branche / monstres
        if(isJ&&sd){
          h+=cRenderAbilityButtons(fi, actLeft, accent, accentDim, accentBorder);
        } else if(!isJ&&f.comp){
          var mobOps=cGetMobAbilityOptions(fi, actLeft);
          if(mobOps.length){
            h+='<div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:8px;margin-bottom:6px;">';
            h+='<div style="font-family:var(--fd);font-size:7px;letter-spacing:2px;color:var(--red);margin-bottom:6px;">COMPÉTENCE CRÉATURE</div>';
            mobOps.forEach(function(op){
              var sub=[];
              if(op.epCost) sub.push('−'+op.epCost+' EP');
              if(op.emCost) sub.push('−'+op.emCost+' EM');
              if(op.consumeActions&&op.consumeActions>1) sub.push(op.consumeActions+' actions');
              if(op.hits) sub.push(op.hits+' hits');
              if(op.aoe) sub.push('AOE');
              if(op.onlyDodge) sub.push('esquivable uniquement');
              if(op.undefendable) sub.push('imparable');
              if(op.statusToTarget) sub.push(op.statusToTarget);
              var payload=cSerializeOpts(op);
              var guard='';
              if(op.targetType==='enemy') guard="var _s=document.getElementById('decl-tgt-"+fi+"');var _t=parseInt(((_s&&_s.value)||csGet('t',"+fi+")||-1),10);if(isNaN(_t)||_t<0){if(_s){_s.style.borderColor='var(--red)';_s.style.boxShadow='0 0 0 2px rgba(201,74,74,0.4)';setTimeout(function(){_s.style.borderColor='';_s.style.boxShadow='';},1500);}return;}window.__cDeclTarget=_t;";
              if(op.targetType==='ally') guard="var _hs=document.getElementById('decl-htgt-"+fi+"');var _ht=parseInt(((_hs&&_hs.value)||csGet('h',"+fi+")||-1),10);if(isNaN(_ht)||_ht<0){if(_hs){_hs.style.borderColor='var(--green)';_hs.style.boxShadow='0 0 0 2px rgba(90,170,122,0.35)';setTimeout(function(){_hs.style.borderColor='';_hs.style.boxShadow='';},1500);}return;}window.__cDeclHealTarget=_ht;";
              var onclick=guard+"var _o=JSON.parse(this.getAttribute('data-opts'));if(window.__cDeclTarget!==undefined){_o.target=window.__cDeclTarget;window.__cDeclTarget=undefined;}if(window.__cDeclHealTarget!==undefined){_o.healTarget=window.__cDeclHealTarget;window.__cDeclHealTarget=undefined;}cDeclareAction("+fi+",_o.action||'capacite',_o);";
              h+='<button data-opts=\''+payload+'\' onclick="'+onclick+'" style="width:100%;padding:8px;background:rgba(201,74,74,0.06);border:1px solid rgba(201,74,74,0.2);cursor:pointer;text-align:left;transition:all .15s;margin-bottom:6px;" onmouseover="this.style.background=\'rgba(201,74,74,0.12)\'" onmouseout="this.style.background=\'rgba(201,74,74,0.06)\'">';
              h+='<div style="font-size:10px;color:var(--red);display:flex;justify-content:space-between;gap:8px;align-items:flex-start;"><span>'+esc(op.label||'⚡ Compétence')+'</span>'+(op.value?'<span style="color:var(--text);">'+op.value+' dmg</span>':(op.healAmt?'<span style="color:var(--green);">+'+op.healAmt+' PV</span>':''))+'</div>';
              if(op.descText) h+='<div style="font-size:9px;color:rgba(255,255,255,0.45);margin-top:3px;line-height:1.45;">'+esc(op.descText)+'</div>';
              h+='<div style="font-family:var(--fm);font-size:7px;color:rgba(255,255,255,0.22);margin-top:3px;">'+esc(sub.join(' · '))+'</div>';
              h+='</button>';
            });
            h+='</div>';
          }
        }
        h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">';
        h+='<button onclick="cDeclareAction('+fi+',\'passer\')" style="padding:5px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.25);cursor:pointer;font-family:var(--fd);font-size:8px;letter-spacing:1px;transition:all .15s;" onmouseover="this.style.borderColor=\'rgba(255,255,255,0.15)\'" onmouseout="this.style.borderColor=\'rgba(255,255,255,0.07)\'">⏭ PASSER</button>';
        h+='<button onclick="cUndoLastDecl('+fi+')" style="padding:5px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);color:rgba(255,255,255,0.25);cursor:pointer;font-family:var(--fd);font-size:8px;letter-spacing:1px;transition:all .15s;" onmouseover="this.style.borderColor=\'rgba(255,255,255,0.15)\'" onmouseout="this.style.borderColor=\'rgba(255,255,255,0.07)\'">↩ ANNULER</button>';
        h+='</div>';
        h+='</div>'; // fin panneau déclaration
      }

      // ── RÉSUMÉ DÉCLARATIONS (si déclarations faites) ──
      if(active&&decls.length>0){
        h+='<div style="border-top:1px solid rgba(255,255,255,0.05);padding-top:7px;margin-top:4px;">';
        h+='<div style="font-family:var(--fd);font-size:7px;letter-spacing:3px;color:rgba(255,255,255,0.2);margin-bottom:5px;">ACTIONS DÉCLARÉES</div>';
        h+='<div style="display:flex;flex-direction:column;gap:4px;">';
        decls.forEach(function(d,di){
          var dc={"frappe":"rgba(201,74,74,0.7)","pugilat":"rgba(201,74,74,0.5)","esquive":"rgba(126,184,212,0.6)","bloquer":"rgba(126,184,212,0.5)","parer":"rgba(126,184,212,0.4)","deplacer":"rgba(255,255,255,0.3)","soin":"rgba(90,170,122,0.6)","capacite":accent.replace("var","rgba").replace(")",",0.6)"),"frappe_dechainees":"rgba(126,184,212,0.6)","passer":"rgba(255,255,255,0.15)"}[d.action]||"rgba(255,255,255,0.3)";
          var tgtName=d.target!==undefined&&d.target!==null&&!isNaN(parseInt(d.target))?(_cs.fighters[parseInt(d.target)]?(" → "+_cs.fighters[parseInt(d.target)].name):""):"";
          h+='<div style="display:flex;align-items:center;gap:6px;padding:3px 6px;background:rgba(255,255,255,0.02);border-left:2px solid '+dc+';">';
          h+='<span style="font-family:var(--fm);font-size:8px;color:rgba(255,255,255,0.2);min-width:12px;">'+(di+1)+'</span>';
          h+='<span style="font-size:11px;color:'+dc+';">'+d.label+'</span>';
          if(tgtName) h+='<span style="font-size:10px;color:rgba(255,255,255,0.2);">'+tgtName+'</span>';
          h+='</div>';
        });
        h+='</div>';
        if(!isDone&&isCurDecl===false) h+='<button onclick="cEditDecl('+fi+')" style="margin-top:5px;font-size:8px;padding:2px 8px;background:transparent;border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.2);cursor:pointer;font-family:var(--fd);letter-spacing:1px;transition:all .15s;" onmouseover="this.style.borderColor=\'rgba(255,255,255,0.2)\'" onmouseout="this.style.borderColor=\'rgba(255,255,255,0.08)\'">✏ Modifier</button>';
        h+='</div>';
      }

      // Réglages MJ (hors déclaration)
      if(canM&&active&&!isCurDecl){
        h+='<div style="display:flex;gap:3px;margin-top:6px;">';
        h+='<button onclick="cAdj('+fi+',\'ep\',-5)" style="flex:1;padding:4px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);color:rgba(255,255,255,0.2);cursor:pointer;font-size:8px;font-family:var(--fd);transition:all .15s;" onmouseover="this.style.borderColor=\'rgba(255,255,255,0.15)\'" onmouseout="this.style.borderColor=\'rgba(255,255,255,0.06)\'">−5 EP</button>';
        h+='<button onclick="cAdj('+fi+',\'ep\',5)" style="flex:1;padding:4px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);color:rgba(255,255,255,0.2);cursor:pointer;font-size:8px;font-family:var(--fd);transition:all .15s;" onmouseover="this.style.borderColor=\'rgba(255,255,255,0.15)\'" onmouseout="this.style.borderColor=\'rgba(255,255,255,0.06)\'">+5 EP</button>';
        h+='<button onclick="cAdj('+fi+',\'ep\',-Math.ceil(_cs.fighters['+fi+'].epMax*0.5))" style="flex:1;padding:4px;background:rgba(201,168,76,0.04);border:1px solid rgba(201,168,76,0.1);color:rgba(201,168,76,0.4);cursor:pointer;font-size:8px;font-family:var(--fd);transition:all .15s;" title="Repos court">☕</button>';
        h+='<button onclick="var f=_cs.fighters['+fi+'];f.epCur=f.epMax;f.emCur=f.emMax;rCombat(\'p-combat-mj-c\')" style="flex:1;padding:4px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);color:rgba(255,255,255,0.2);cursor:pointer;font-size:8px;font-family:var(--fd);transition:all .15s;" onmouseover="this.style.borderColor=\'rgba(255,255,255,0.15)\'" onmouseout="this.style.borderColor=\'rgba(255,255,255,0.06)\'">↺</button>';
        h+='</div>';
        // Initiative
        h+='<button onclick="combatSetInit('+fi+')" style="margin-top:4px;width:100%;font-size:7px;padding:3px;background:'+((_cs.initiative===fi)?"rgba(126,184,212,0.08)":"transparent")+';border:1px solid '+((_cs.initiative===fi)?"rgba(126,184,212,0.3)":"rgba(255,255,255,0.06)")+';color:'+((_cs.initiative===fi)?"var(--glacier)":"rgba(255,255,255,0.2)")+';cursor:pointer;font-family:var(--fd);letter-spacing:2px;transition:all .15s;">★ INITIATIVE</button>';
      }
      h+='</div>'; // fin carte
    });
    h+='</div>'; // fin grille
  }

  // ════════════════════════════════════════════════════════════
  // LOG + NOTES
  // ════════════════════════════════════════════════════════════
  if((_cs.log||[]).length||_cs.active||_cs.id){
    h+='<div class="sim-bottom-grid" style="display:grid;grid-template-columns:1fr 320px;gap:12px;margin-bottom:16px;align-items:start;">';
    // LOG
    h+='<div class="sim-panel sim-log" style="background:linear-gradient(160deg,#0c0e1c,#090a12);border:1px solid rgba(255,255,255,0.06);padding:14px;">';
    h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">';
    h+='<div style="font-family:var(--fd);font-size:7px;letter-spacing:5px;color:rgba(255,255,255,0.2);">JOURNAL</div>';
    h+='<button onclick="combatExportDiscord()" style="font-size:8px;padding:3px 10px;background:transparent;border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.2);cursor:pointer;font-family:var(--fd);letter-spacing:1px;transition:all .15s;" onmouseover="this.style.borderColor=\'var(--glacier-dim)\';this.style.color=\'var(--glacier-dim)\'" onmouseout="this.style.borderColor=\'rgba(255,255,255,0.08)\';this.style.color=\'rgba(255,255,255,0.2)\'">📋 DISCORD</button>';
    h+='</div>';
    h+='<div style="max-height:300px;overflow-y:auto;display:flex;flex-direction:column;gap:1px;" id="clog-inner">';
    (_cs.log||[]).slice().reverse().forEach(function(l){
      var cfg={damage:{c:"rgba(201,74,74,0.85)",bg:"rgba(201,74,74,0.04)",bd:"rgba(201,74,74,0.2)"},heal:{c:"rgba(90,170,122,0.85)",bg:"rgba(90,170,122,0.04)",bd:"rgba(90,170,122,0.2)"},round:{c:"rgba(126,184,212,0.65)",bg:"rgba(126,184,212,0.05)",bd:"rgba(126,184,212,0.2)"},turn:{c:"rgba(201,168,76,0.7)",bg:"rgba(201,168,76,0.03)",bd:"rgba(201,168,76,0.15)"},spell:{c:"rgba(154,116,196,0.8)",bg:"rgba(154,116,196,0.04)",bd:"rgba(154,116,196,0.2)"},info:{c:"rgba(255,255,255,0.3)",bg:"transparent",bd:"transparent"}}[l.type]||{c:"rgba(255,255,255,0.25)",bg:"transparent",bd:"transparent"};
      h+='<div style="display:flex;gap:8px;align-items:baseline;padding:3px 6px;background:'+cfg.bg+';'+(cfg.bd!=="transparent"?"border-left:2px solid "+cfg.bd+";":"")+'">';
      h+='<span style="font-family:var(--fm);font-size:7px;color:rgba(255,255,255,0.15);flex-shrink:0;min-width:14px;">'+l.round+'</span>';
      h+='<span style="font-size:'+(l.type==="round"?10:11)+'px;color:'+cfg.c+';'+(l.type==="round"?"font-family:var(--fd);letter-spacing:2px;":"")+'">'+l.text+'</span>';
      h+='</div>';
    });
    h+='</div></div>';
    // NOTES
    h+='<div class="sim-panel sim-notes" style="background:linear-gradient(160deg,#0c0e1c,#090a12);border:1px solid rgba(255,255,255,0.06);padding:14px;">';
    var pendingDrops=combatPendingDrops();
    if(pendingDrops.length){
      var pendingPlayers=(_cs.fighters||[]).filter(function(f){ return f && f.type==='player' && f.pid; });
      h+='<div style="font-family:var(--fd);font-size:7px;letter-spacing:5px;color:rgba(255,255,255,0.2);margin-bottom:10px;">DROPS EN ATTENTE</div>';
      h+='<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">';
      pendingDrops.forEach(function(drop){
        var dropCol=combatGemTone(drop.gem||'Aucune');
        h+='<div style="padding:10px 11px;border:1px solid rgba(255,255,255,0.07);background:linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015));box-shadow:inset 0 1px 0 rgba(255,255,255,0.04);">';
        h+='<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">';
        h+='<div style="min-width:0;flex:1;">';
        h+='<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">';
        h+='<span style="font-family:var(--fd);font-size:7px;letter-spacing:2px;color:'+dropCol+';padding:2px 6px;border:1px solid rgba(255,255,255,0.08);background:rgba(0,0,0,0.16);">'+esc(drop.gem||'Gemme')+'</span>';
        h+='<span style="font-size:10px;color:rgba(255,255,255,0.82);">sur '+esc(drop.beastName||'Créature')+'</span>';
        h+='</div>';
        h+='<div style="font-size:10px;color:rgba(255,255,255,0.5);margin-top:5px;line-height:1.5;">Round '+(drop.round||1)+' · D100 : '+(drop.roll||'—')+' · Attribution différée</div>';
        h+='</div>';
        h+='<button onclick="deletePendingDrop('+JSON.stringify(drop.id)+')" style="padding:4px 8px;background:transparent;border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.42);font-size:10px;">✕</button>';
        h+='</div>';
        if(pendingPlayers.length){
          h+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">';
          pendingPlayers.forEach(function(pf){
            h+='<button onclick="attributePendingDrop('+JSON.stringify(drop.id)+','+JSON.stringify(pf.pid)+')" style="padding:5px 9px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);color:#fff;font-size:10px;">'+esc(pf.name)+'</button>';
          });
          h+='</div>';
        } else {
          h+='<div style="font-size:10px;color:rgba(255,255,255,0.46);margin-top:8px;">Aucun joueur lié disponible pour attribuer cette gemme.</div>';
        }
        h+='</div>';
      });
      h+='</div>';
    }
    h+='<div style="font-family:var(--fd);font-size:7px;letter-spacing:5px;color:rgba(255,255,255,0.2);margin-bottom:10px;">NOTES MJ</div>';
    h+='<textarea id="c-notes" placeholder="Notes privées…" oninput="_cs.notes=this.value" style="width:100%;min-height:160px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);color:rgba(255,255,255,0.5);padding:8px;font-family:var(--fb);font-size:12px;resize:vertical;outline:none;line-height:1.5;" onfocus="this.style.borderColor=\'rgba(255,255,255,0.12)\'" onblur="this.style.borderColor=\'rgba(255,255,255,0.06)\'">'+(_cs.notes||"")+'</textarea>';
    h+='<button onclick="combatSaveNotes()" style="margin-top:5px;width:100%;padding:5px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);color:rgba(255,255,255,0.2);cursor:pointer;font-family:var(--fd);font-size:7px;letter-spacing:2px;transition:all .15s;" onmouseover="this.style.borderColor=\'rgba(255,255,255,0.15)\';this.style.color=\'var(--faint)\'" onmouseout="this.style.borderColor=\'rgba(255,255,255,0.06)\';this.style.color=\'rgba(255,255,255,0.2)\'">💾 SAUVEGARDER</button>';
    h+='</div>';
    h+='</div>';
  }

  // ════════════════════════════════════════════════════════════
  // HISTORIQUE
  // ════════════════════════════════════════════════════════════
  var allArcsH=can("manage_mjs")?getAllCombatArchives():archives;
  if(allArcsH.length){
    var arcCreatorMap=Object.create(null);
    var arcPlayersCatalog=[];
    allArcsH.forEach(function(arc){
      var creatorName=(typeof _archiveCreatorName==='function')?_archiveCreatorName(arc):String((arc&&arc._owner)||'Inconnu');
      if(creatorName) arcCreatorMap[creatorName]=1;
      ((arc&&arc.fighters)||[]).forEach(function(f){
        if(!f || f.type!=='player') return;
        var pid=String(f.pid || f.id || f.name || '').trim();
        var pname=String(f.name || f.nom || pid || 'Joueur').trim();
        if(!pid && !pname) return;
        var key=pid || pname;
        if(!arcPlayersCatalog.some(function(x){ return x.pid===key; })) arcPlayersCatalog.push({pid:key,name:pname||key});
      });
    });
    var arcCreators=Object.keys(arcCreatorMap).sort(function(a,b){ return String(a||'').localeCompare(String(b||''),'fr',{sensitivity:'base'}); });
    arcPlayersCatalog.sort(function(a,b){ return String(a.name||'').localeCompare(String(b.name||''),'fr',{sensitivity:'base'}); });
    h+='<div class="sim-panel sim-history" style="background:linear-gradient(160deg,#0c0e1c,#090a12);border:1px solid rgba(255,255,255,0.06);padding:14px;">';
    h+='<div class="arc-toolbar-head">';
    h+='<div>';
    h+='<div class="arc-toolbar-kicker">HISTORIQUE</div>';
    h+='<div class="arc-toolbar-title">Archives de combat</div>';
    h+='<div class="arc-toolbar-sub">Recherche croisée, filtres cumulables et vue détail premium pour retrouver vite le bon combat.</div>';
    h+='</div>';
    h+='<button class="btn btn-sm" onclick="_arcResetFilters()" style="align-self:flex-start;"><span>Réinitialiser</span></button>';
    h+='</div>';
    h+='<div class="arc-filter-shell">';
    h+='<label class="arc-field arc-field-search"><span class="arc-field-label">Recherche libre</span><input id="arc-search" class="arc-input" placeholder="Nom, créateur, joueur, créature…" oninput="renderArcFiltered()"></label>';
    h+='<label class="arc-field"><span class="arc-field-label">Créateur</span><select id="arc-creator-filter" class="arc-select" onchange="renderArcFiltered()"><option value="">Tous les créateurs</option>';
    arcCreators.forEach(function(name){ h+='<option value="'+esc(name)+'">'+esc(name)+'</option>'; });
    h+='</select></label>';
    h+='<label class="arc-field"><span class="arc-field-label">État</span><select id="arc-status-filter" class="arc-select" onchange="renderArcFiltered()"><option value="">Tous les états</option><option value="draft">Brouillons</option><option value="progress">En cours</option><option value="victory">Victoires</option><option value="defeat">Défaites</option><option value="mixed">Résultat mixte</option></select></label>';
    h+='<label class="arc-field"><span class="arc-field-label">Tri</span><select id="arc-sort-filter" class="arc-select" onchange="renderArcFiltered()"><option value="recent">Plus récents</option><option value="oldest">Plus anciens</option><option value="creator_az">Créateur A → Z</option><option value="creator_za">Créateur Z → A</option><option value="name_az">Nom A → Z</option><option value="round_desc">Round décroissant</option></select></label>';
    h+='</div>';
    h+='<div id="arc-player-chip-wrap" data-options="'+esc(JSON.stringify(arcPlayersCatalog))+'" class="arc-chip-wrap"></div>';
    h+='<div id="arc-filter-summary" class="arc-filter-summary"></div>';
    h+='<div id="arc-list"></div></div>';
  }

  h+='</div>';
  el.innerHTML=h;
  if(typeof renderArcFiltered==="function") renderArcFiltered();
  var clog=ge("clog-inner"); if(clog) clog.scrollTop=0;
}

// ── LABO D'APPARITIONS STAFF ──────────────────────────────────────────────────
var _spawnLabState = null;
var _spawnLabUiKey = 'np_spawn_lab_ui_v2';
var _spawnLabLegacyKey = 'np_spawn_lab_state_v1';
var _spawnLabStoreKey = 'spawn_lab_staff';
var _spawnLabCumulativeCoef = 0.22;
var _spawnLabCatchupCoef = 0.14;
var _spawnLabSameEncounterCoef = 0.95;
function _spawnLabDefaults(){
  return {
    zone: '',
    totals: {},
    lastRuns: [],
    globalVersion: 2,
    lastGlobalAt: 0
  };
}
function _spawnLabGlobalDefaults(){
  return {
    schemaVersion: 2,
    totals: {},
    lastRuns: [],
    totalDraws: 0,
    lastGeneratedAt: 0,
    lastGeneratedBy: ''
  };
}
function _spawnLabNormalizeGlobal(raw){
  var out=_spawnLabGlobalDefaults();
  if(raw && typeof raw==='object' && !Array.isArray(raw)){
    if(raw.totals && typeof raw.totals==='object' && !Array.isArray(raw.totals)) out.totals=raw.totals;
    if(Array.isArray(raw.lastRuns)) out.lastRuns=raw.lastRuns.slice(0,24);
    out.totalDraws=Math.max(0,parseInt(raw.totalDraws,10)||0);
    out.lastGeneratedAt=Math.max(0,parseInt(raw.lastGeneratedAt,10)||0);
    out.lastGeneratedBy=String(raw.lastGeneratedBy||'');
  }
  var clean={};
  Object.keys(out.totals||{}).forEach(function(id){
    var n=parseInt(out.totals[id],10)||0;
    if(n>0) clean[id]=n;
  });
  out.totals=clean;
  out.schemaVersion=2;
  out.lastDbSyncAt=Date.now();
  return out;
}
function _spawnLabGlobal(){
  return _spawnLabNormalizeGlobal(sto(_spawnLabStoreKey) || {});
}
function _spawnLabSaveGlobal(global){
  global=_spawnLabNormalizeGlobal(global);
  sv(_spawnLabStoreKey, global).catch(function(err){
    console.warn('spawn_lab_staff save failed', err);
    try{ notif('Apparitions générées, mais synchronisation globale impossible.','err'); }catch(_e){}
  });
  return global;
}
function _spawnLabLoadUi(){
  var base=_spawnLabDefaults();
  try{
    var raw=localStorage.getItem(_spawnLabUiKey) || localStorage.getItem(_spawnLabLegacyKey);
    if(raw){
      var data=JSON.parse(raw);
      if(data && typeof data==='object'){
        ['zone'].forEach(function(k){ if(data[k]!==undefined) base[k]=data[k]; });
      }
    }
  }catch(_e){}
  return base;
}
function _spawnLabLoad(){
  var base=_spawnLabLoadUi();
  var global=_spawnLabGlobal();
  base.totals=global.totals||{};
  base.lastRuns=Array.isArray(global.lastRuns)?global.lastRuns:[];
  base.lastGlobalAt=global.lastGeneratedAt||0;
  if(!Array.isArray(base.lastRuns)) base.lastRuns=[];
  if(!base.totals || typeof base.totals!=='object' || Array.isArray(base.totals)) base.totals={};
  if(Array.isArray(base.recent) && base.recent.length){
    base.recent.forEach(function(id){ if(id) base.totals[id]=(base.totals[id]||0)+1; });
  }
  delete base.recent;
  delete base.memory;
  delete base.penalty;
  return base;
}
function _spawnLabEnsure(){
  if(!_spawnLabState) _spawnLabState=_spawnLabLoad();
  var global=_spawnLabGlobal();
  _spawnLabState.totals=global.totals||{};
  _spawnLabState.lastRuns=Array.isArray(global.lastRuns)?global.lastRuns:[];
  _spawnLabState.lastGlobalAt=global.lastGeneratedAt||0;
  if(!_spawnLabState.totals || typeof _spawnLabState.totals!=='object' || Array.isArray(_spawnLabState.totals)) _spawnLabState.totals={};
  return _spawnLabState;
}
function _spawnLabSaveUi(){
  if(!_spawnLabState) return;
  var ui={zone:_spawnLabState.zone||''};
  try{ localStorage.setItem(_spawnLabUiKey, JSON.stringify(ui)); localStorage.removeItem(_spawnLabLegacyKey); }catch(_e){}
}
function _spawnLabSyncInputs(){
  var s=_spawnLabEnsure();
  var zone=ge('sl-zone');
  if(zone) s.zone=String(zone.value||'');
  _spawnLabSaveUi();
}
function _spawnLabTotalCounts(s){
  var counts=Object.create(null);
  Object.keys((s&&s.totals)||{}).forEach(function(id){
    var n=parseInt(s.totals[id],10)||0;
    if(n>0) counts[id]=n;
  });
  return counts;
}
function _spawnLabBehaviorMult(raw){
  switch(cBehaviorLabel(raw)){
    case 'Gibier': return 1.08;
    case 'Passif': return 0.92;
    case 'Neutre': return 1;
    case 'Agressif': return 1.12;
    case 'Très agressif': return 1.2;
    case 'Boss': return 0.4;
    default: return 1;
  }
}
function _spawnLabBaseWeight(beast){
  if(beast && beast.spawnWeight!==undefined && beast.spawnWeight!==null && beast.spawnWeight!==''){
    var explicit=parseFloat(beast.spawnWeight);
    if(isFinite(explicit) && explicit>0) return Math.round(explicit);
  }
  var lvl=Math.max(1,parseInt(beast&&beast.niv,10)||1);
  var levelFactor=Math.max(0.24, 1.42 - (lvl-1)*0.09);
  var base=96*_spawnLabBehaviorMult(beast&&beast.beh)*levelFactor;
  if(cBehaviorLabel(beast&&beast.beh)==='Boss') base=Math.min(base,22);
  return Math.max(8, Math.round(base));
}
function _spawnLabQtyRange(beast){
  var minV=parseInt(beast&&beast.spawnMin,10), maxV=parseInt(beast&&beast.spawnMax,10);
  if(isFinite(minV) && isFinite(maxV) && maxV>=minV && minV>0){ return {min:minV,max:maxV}; }
  var lvl=Math.max(1,parseInt(beast&&beast.niv,10)||1);
  var beh=cBehaviorLabel(beast&&beast.beh);
  var min=1, max=2;
  if(beh==='Gibier') max=4;
  else if(beh==='Passif') max=3;
  else if(beh==='Neutre') max=3;
  else if(beh==='Agressif') max=2;
  else if(beh==='Très agressif') max=2;
  else if(beh==='Boss') max=1;
  if(lvl<=2) max+=1;
  else if(lvl>=7) max=Math.max(2, max-1);
  if(beh==='Gibier' && lvl<=2) max+=1;
  if(lvl>=9 || beh==='Boss'){ min=1; max=1; }
  return {min:min,max:Math.max(min,max)};
}
function _spawnLabBeastZones(beast){
  var zones=Array.isArray(beast&&beast.zones)?beast.zones:[];
  zones=zones.map(function(z){ return String(z||'').trim(); }).filter(Boolean);
  return zones.length?zones:['Sans zone'];
}
function _spawnLabZoneValue(label){
  label=String(label||'').trim();
  return label==='Sans zone'?'__none__':label;
}
function _spawnLabZoneLabel(value){
  value=String(value||'').trim();
  return value==='__none__'?'Sans zone':value;
}
function _spawnLabZoneOptions(beasts){
  var seen=Object.create(null), labels=[];
  (beasts||[]).forEach(function(b){
    if(!b || b.hidden) return;
    _spawnLabBeastZones(b).forEach(function(label){
      if(!seen[label]){ seen[label]=1; labels.push(label); }
    });
  });
  labels.sort(function(a,b){
    if(a==='Sans zone') return 1;
    if(b==='Sans zone') return -1;
    return a.localeCompare(b,'fr',{sensitivity:'base'});
  });
  return labels.map(function(label){ return {value:_spawnLabZoneValue(label),label:label}; });
}
function _spawnLabResolveZone(s, beasts){
  var opts=_spawnLabZoneOptions(beasts);
  if(!opts.length){ s.zone='__all__'; return {value:'__all__',label:'Toutes zones'}; }
  var current=String((s&&s.zone)||'').trim();
  var found=opts.find(function(o){ return o.value===current; });
  if(!found){ found=opts[0]; if(s) s.zone=found.value; _spawnLabSaveUi(); }
  return found;
}
function _spawnLabZonePool(zone, beasts){
  zone=String(zone||'').trim();
  var all=(beasts||[]).filter(function(b){ return b && !b.hidden; });
  if(zone==='__all__') return all;
  var label=_spawnLabZoneLabel(zone);
  return all.filter(function(b){
    var zones=_spawnLabBeastZones(b);
    return zones.indexOf(label)>=0;
  });
}
function _spawnLabPickWeighted(list){
  var total=0;
  list.forEach(function(x){ total+=x.weight; });
  if(total<=0) return null;
  var roll=Math.random()*total, acc=0, chosen=list[0]||null;
  for(var i=0;i<list.length;i++){
    acc+=list[i].weight;
    if(roll<=acc){ chosen=list[i]; break; }
  }
  if(chosen) chosen._prob=chosen.weight/total;
  return chosen;
}
function _spawnLabAverageCount(pool, totalCounts){
  if(!pool || !pool.length) return 0;
  var sum=0;
  pool.forEach(function(beast){ sum += parseInt(totalCounts && totalCounts[beast.id],10)||0; });
  return sum / pool.length;
}
function _spawnLabAdjustedWeight(beast, pool, s, totalCounts, encounterCounts){
  var base=_spawnLabBaseWeight(beast);
  var count=parseInt(totalCounts && totalCounts[beast.id],10)||0;
  var avg=_spawnLabAverageCount(pool, totalCounts);
  var over=Math.max(0, count - avg);
  var under=Math.max(0, avg - count);
  var fatigue=1 + over*_spawnLabCumulativeCoef;
  var catchup=1 + under*_spawnLabCatchupCoef;
  var encounterPenalty=1 + ((parseInt(encounterCounts && encounterCounts[beast.id],10)||0)*_spawnLabSameEncounterCoef);
  var weight=(base*catchup)/(fatigue*encounterPenalty);
  if((encounterCounts[beast.id]||0)>0 && pool.length>1) weight*=0.55;
  return {weight:weight, base:base, count:count, avg:avg, catchup:catchup, fatigue:fatigue};
}
function _spawnLabRollQty(min, max){
  if(max<=min) return min;
  var span=max-min+1;
  var n=min+Math.floor(Math.random()*span);
  if(n>max) n=max;
  return n;
}
function _spawnLabGenerateEncounter(pool, s, totals){
  var totalCounts=Object.create(null);
  Object.keys(totals||{}).forEach(function(id){ totalCounts[id]=parseInt(totals[id],10)||0; });
  var encounterCounts=Object.create(null);
  var packs=[];
  var cands=[];
  pool.forEach(function(beast){
    var tuned=_spawnLabAdjustedWeight(beast, pool, s, totalCounts, encounterCounts);
    if(tuned.weight>0.5){ cands.push({beast:beast,weight:tuned.weight,base:tuned.base,total:tuned.count,avg:tuned.avg,catchup:tuned.catchup,fatigue:tuned.fatigue}); }
  });
  var chosen=_spawnLabPickWeighted(cands);
  if(!chosen) return null;
  var range=_spawnLabQtyRange(chosen.beast);
  var qty=_spawnLabRollQty(range.min, range.max);
  packs.push({
    id: chosen.beast.id,
    nom: chosen.beast.nom,
    niv: parseInt(chosen.beast.niv,10)||1,
    beh: cBehaviorLabel(chosen.beast.beh),
    hidden: !!chosen.beast.hidden,
    qty: qty,
    prob: chosen._prob||0,
    total: chosen.total||0,
    range: range,
    baseWeight: chosen.base,
    weightNow: chosen.weight,
    catchup: chosen.catchup,
    fatigue: chosen.fatigue
  });
  encounterCounts[chosen.beast.id]=qty;
  totalCounts[chosen.beast.id]=(totalCounts[chosen.beast.id]||0)+qty;
  if(!packs.length) return null;
  return { packs:packs, totals:totalCounts };
}
function _spawnLabActorName(){
  return (CU && (CU.login || CU.name || CU.pseudo || CU.role)) || 'staff';
}
function _spawnLabRunTimeLabel(ts){
  ts=parseInt(ts,10)||0;
  if(!ts) return 'Date inconnue';
  try{ return new Date(ts).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}); }
  catch(_e){ return 'Date inconnue'; }
}
function spawnLabGenerate(){
  var s=_spawnLabEnsure();
  _spawnLabSyncInputs();
  var beasts=gb().slice();
  var zoneMeta=_spawnLabResolveZone(s, beasts);
  var pool=_spawnLabZonePool(zoneMeta.value, beasts);
  var global=_spawnLabGlobal();
  s.totals=Object.assign({}, global.totals||{});
  s.lastRuns=Array.isArray(global.lastRuns)?global.lastRuns:[];
  if(!pool.length){ notif('Aucun mob dans cette zone.','err'); return; }
  var totals=Object.assign({}, global.totals||{});
  var encounter=_spawnLabGenerateEncounter(pool, s, totals);
  var runs=[];
  if(encounter){
    totals=encounter.totals||totals;
    runs.push({
      id:'roll_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),
      idx:1,
      zone: zoneMeta.label,
      zoneValue: zoneMeta.value,
      rolledBy: _spawnLabActorName(),
      rolledAt: Date.now(),
      packs: encounter.packs
    });
  }
  s.totals=totals;
  s.lastRuns=runs.concat(Array.isArray(global.lastRuns)?global.lastRuns:[]).slice(0,24);
  s.lastGlobalAt=Date.now();
  _spawnLabSaveUi();
  _spawnLabSaveGlobal({
    totals: totals,
    lastRuns: s.lastRuns,
    totalDraws: (parseInt(global.totalDraws,10)||0) + runs.length,
    lastGeneratedAt: s.lastGlobalAt,
    lastGeneratedBy: (CU && (CU.login || CU.name || CU.role)) || 'staff'
  });
  renderSpawnLab('p-apparitions-c');
  notif(runs.length ? 'Apparitions générées et poids globaux synchronisés.' : 'Aucun tirage possible.', runs.length ? 'ok' : 'err');
}
function spawnLabDeleteHistory(id){
  if(!can("manage_beasts")){ notif("Réservé à l’admin.","err"); return; }
  var s=_spawnLabEnsure();
  var global=_spawnLabGlobal();
  var runs=Array.isArray(global.lastRuns)?global.lastRuns.slice():[];
  var before=runs.length;
  runs=runs.filter(function(run, idx){ return String(run&&run.id||idx)!==String(id); });
  if(runs.length===before){ notif("Entrée introuvable.","err"); return; }
  s.lastRuns=runs;
  _spawnLabSaveGlobal({
    totals: global.totals||{},
    lastRuns: runs,
    totalDraws: parseInt(global.totalDraws,10)||0,
    lastGeneratedAt: global.lastGeneratedAt||Date.now(),
    lastGeneratedBy: (CU && (CU.login || CU.name || CU.role)) || 'staff'
  });
  renderSpawnLab('p-apparitions-c');
  notif("Roll supprimé de l’historique.","ok");
}
function spawnLabResetHistory(){
  var s=_spawnLabEnsure();
  s.totals={};
  s.lastRuns=[];
  s.lastGlobalAt=Date.now();
  _spawnLabSaveGlobal({totals:{},lastRuns:[],totalDraws:0,lastGeneratedAt:s.lastGlobalAt,lastGeneratedBy:(CU && (CU.login || CU.name || CU.role)) || 'staff'});
  renderSpawnLab('p-apparitions-c');
  notif('Historique global d’apparition réinitialisé.','inf');
}
function spawnLabCopyLast(){
  var s=_spawnLabEnsure();
  if(!s.lastRuns || !s.lastRuns.length){ notif('Aucun résultat à copier.','err'); return; }
  var lines=[];
  lines.push('**Générateur d’apparitions**');
  lines.push('Zone '+_spawnLabZoneLabel(s.zone||''));
  lines.push('');
  s.lastRuns.slice(0,1).forEach(function(run){
    lines.push('**Roll** — '+run.packs.map(function(p){ return p.qty+'x '+p.nom; }).join(' • '));
  });
  var text=lines.join('\n');
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(function(){ notif('Récap copié.','ok'); }).catch(function(){ notif('Copie impossible.','err'); });
  }else{
    notif('Copie indisponible ici.','err');
  }
}
function spawnLabOpenZoneAdmin(){
  if(!can("manage_beasts")){ notif("Réservé à l’admin bestiaire.","err"); return; }
  var input=ge("sl-admin-zone-name");
  var select=ge("sl-admin-zone-select");
  var zone=String((input&&input.value)||(select&&select.value)||'').trim();
  openBeastZoneManager(zone);
}
function renderSpawnLab(tid){
  if(!CU||CU.type!=='staff'){ return; }
  var el=ge(tid); if(!el) return;
  var s=_spawnLabEnsure();
  var beasts=gb().slice().sort(function(a,b){
    if(!!a.hidden!==!!b.hidden) return a.hidden?1:-1;
    var la=(parseInt(a.niv,10)||1), lb=(parseInt(b.niv,10)||1);
    if(la!==lb) return la-lb;
    return String(a.nom||'').localeCompare(String(b.nom||''),'fr');
  });
  var zoneOptions=_spawnLabZoneOptions(beasts);
  var zoneMeta=_spawnLabResolveZone(s, beasts);
  var zonePool=_spawnLabZonePool(zoneMeta.value, beasts);
  var recentCounts=_spawnLabTotalCounts(s);
  var h='';
  h+='<style id="np-spawn-lab-style">';
  h+='#p-apparitions-c .sl-wrap{max-width:1320px;margin:0 auto;padding:10px 0 38px;}';
  h+='#p-apparitions-c .sl-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-end;flex-wrap:wrap;margin-bottom:18px;}';
  h+='#p-apparitions-c .sl-title{font-family:var(--fd);font-size:24px;letter-spacing:2px;color:var(--text);}';
  h+='#p-apparitions-c .sl-sub{color:var(--dim);font-size:13px;line-height:1.7;max-width:760px;}';
  h+='#p-apparitions-c .sl-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:14px;}';
  h+='#p-apparitions-c .sl-card{background:linear-gradient(180deg,rgba(15,18,31,.96),rgba(8,10,18,.98));border:1px solid rgba(126,184,212,.14);box-shadow:0 18px 48px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.03);padding:16px;position:relative;overflow:hidden;}';
  h+='#p-apparitions-c .sl-card::before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(255,255,255,.035),transparent 40%);opacity:.55;}';
  h+='#p-apparitions-c .sl-card>*{position:relative;z-index:1;}';
  h+='#p-apparitions-c .sl-span-4{grid-column:span 4;} #p-apparitions-c .sl-span-8{grid-column:span 8;} #p-apparitions-c .sl-span-12{grid-column:span 12;}';
  h+='#p-apparitions-c .sl-kicker{font-family:var(--fd);font-size:8px;letter-spacing:4px;color:rgba(126,184,212,.45);margin-bottom:10px;text-transform:uppercase;}';
  h+='#p-apparitions-c .sl-fields{display:grid;grid-template-columns:minmax(220px,420px);gap:10px;}';
  h+='#p-apparitions-c .sl-field label{display:block;font-size:11px;color:var(--faint);margin-bottom:5px;}';
  h+='#p-apparitions-c .sl-field input,#p-apparitions-c .sl-field select{width:100%;padding:11px 12px;background:rgba(6,8,16,.9);border:1px solid rgba(126,184,212,.16);color:var(--text);outline:none;}';
  h+='#p-apparitions-c .sl-field input:focus,#p-apparitions-c .sl-field select:focus{border-color:rgba(126,184,212,.42);}';
  h+='#p-apparitions-c .sl-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;}';
  h+='#p-apparitions-c .sl-btn{padding:10px 13px;border:1px solid rgba(126,184,212,.22);background:linear-gradient(180deg,rgba(24,34,58,.95),rgba(12,18,32,.95));color:var(--text);cursor:pointer;font-family:var(--fd);font-size:10px;letter-spacing:1.4px;text-transform:uppercase;transition:border-color .15s, transform .15s, filter .15s;}';
  h+='#p-apparitions-c .sl-btn:hover{border-color:rgba(126,184,212,.44);transform:translateY(-1px);filter:brightness(1.06);}';
  h+='#p-apparitions-c .sl-btn-gold{border-color:rgba(201,168,76,.28);color:var(--gold);}';
  h+='#p-apparitions-c .sl-btn-red{border-color:rgba(201,74,74,.28);color:var(--red);}';
  h+='#p-apparitions-c .sl-metric{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 13px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.025);margin-bottom:8px;}';
  h+='#p-apparitions-c .sl-metric strong{font-family:var(--fd);font-size:10px;letter-spacing:1.2px;color:var(--text);}';
  h+='#p-apparitions-c .sl-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 9px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);font-size:11px;color:var(--text);}';
  h+='#p-apparitions-c .sl-pool-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:12px;}';
  h+='#p-apparitions-c .sl-pool{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;}';
  h+='#p-apparitions-c .sl-beast{padding:12px;border:1px solid rgba(255,255,255,.07);background:linear-gradient(180deg,rgba(255,255,255,.028),rgba(255,255,255,.015));transition:border-color .15s,transform .15s, box-shadow .15s;}';
  h+='#p-apparitions-c .sl-beast:hover{border-color:rgba(126,184,212,.28);transform:translateY(-1px);}';
  h+='#p-apparitions-c .sl-beast.is-on{border-color:rgba(126,184,212,.4);box-shadow:0 0 0 1px rgba(126,184,212,.18), inset 0 1px 0 rgba(255,255,255,.04);}';
  h+='#p-apparitions-c .sl-beast-name{font-family:var(--fd);font-size:12px;letter-spacing:1px;color:var(--text);}';
  h+='#p-apparitions-c .sl-mini{font-size:10px;color:var(--faint);}';
  h+='#p-apparitions-c .sl-run{padding:14px;border:1px solid rgba(255,255,255,.07);background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.014));margin-bottom:10px;}';
  h+='#p-apparitions-c .sl-runhead{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px;}';
  h+='#p-apparitions-c .sl-pack{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;padding:10px 11px;border:1px solid rgba(255,255,255,.06);background:rgba(5,8,14,.55);margin-bottom:7px;}';
  h+='#p-apparitions-c .sl-pack:last-child{margin-bottom:0;}';
  h+='#p-apparitions-c .sl-pack strong{font-family:var(--fd);font-size:11px;letter-spacing:1px;color:var(--text);}';
  h+='#p-apparitions-c .sl-pack-right{text-align:right;min-width:110px;}';
  h+='@media (max-width:1100px){#p-apparitions-c .sl-span-4,#p-apparitions-c .sl-span-8{grid-column:span 12;}#p-apparitions-c .sl-fields{grid-template-columns:repeat(2,minmax(0,1fr));}}';
  h+='@media (max-width:720px){#p-apparitions-c .sl-fields{grid-template-columns:1fr;}#p-apparitions-c .sl-pack{flex-direction:column;}#p-apparitions-c .sl-pack-right{text-align:left;min-width:0;}}';
  h+='</style>';
  h+='<div class="sl-wrap">';
  h+='<div class="sl-head">';
  h+='<div><div class="sl-kicker">OUTIL STAFF — GÉNÉRATEUR D’APPARITIONS</div><div class="sl-title">Roll par zone</div><div class="sl-sub">Choisis une zone, lance le roll, et le résultat tombe parmi les mobs configurés dedans. Les poids restent globaux : un mob qui sort baisse, les autres remontent.</div></div>';
  h+='</div>';
  h+='<div class="sl-grid">';
  h+='<div class="sl-card sl-span-12">';
  h+='<div class="sl-kicker">ZONE DU ROLL</div>';
  h+='<div class="sl-fields">';
  h+='<div class="sl-field"><label>Zone</label><select id="sl-zone" onchange="_spawnLabSyncInputs();renderSpawnLab(\'p-apparitions-c\')">';
  if(zoneOptions.length){
    zoneOptions.forEach(function(opt){ h+='<option value="'+escAttr(opt.value)+'"'+(zoneMeta.value===opt.value?' selected':'')+'>'+esc(opt.label)+'</option>'; });
  }else{
    h+='<option value="__all__" selected>Toutes zones</option>';
  }
  h+='</select></div>';
  h+='</div>';
  h+='<div class="sl-actions">';
  h+='<button class="sl-btn sl-btn-gold" onclick="spawnLabGenerate()">Roll</button>';
  h+='<button class="sl-btn" onclick="spawnLabCopyLast()">Copier le récap</button>';
  h+='<button class="sl-btn sl-btn-red" onclick="spawnLabResetHistory()">Réinitialiser le global</button>';
  h+='</div>';
  h+='</div>';
  if(can("manage_beasts")){
    h+='<div class="sl-card sl-span-12" style="border-color:rgba(201,168,76,.24);background:linear-gradient(180deg,rgba(34,27,11,.92),rgba(12,10,8,.96));">';
    h+='<div class="sl-pool-head"><div><div class="sl-kicker" style="color:var(--gold);">ADMIN UNIQUEMENT — CRÉATION DE ZONES</div><div style="font-size:12px;color:var(--dim);line-height:1.55;">Cette section sert à créer une zone et à mettre les mobs dedans. Elle est réservée aux admins du bestiaire.</div></div></div>';
    h+='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;align-items:end;">';
    h+='<div class="sl-field"><label>Zone existante</label><select id="sl-admin-zone-select">';
    if(zoneOptions.length){ zoneOptions.forEach(function(opt){ h+='<option value="'+escAttr(opt.label)+'"'+(zoneMeta.label===opt.label?' selected':'')+'>'+esc(opt.label)+'</option>'; }); }
    else h+='<option value="">Aucune zone</option>';
    h+='</select></div>';
    h+='<div class="sl-field"><label>Créer / ouvrir une zone</label><input id="sl-admin-zone-name" type="text" placeholder="Nom de la nouvelle zone"></div>';
    h+='<button class="sl-btn sl-btn-gold" style="min-height:42px;" onclick="spawnLabOpenZoneAdmin()">Gérer les mobs</button>';
    h+='</div>';
    h+='</div>';
  }
  h+='<div class="sl-card sl-span-8">';
  h+='<div class="sl-kicker">RÉSULTAT DU ROLL</div>';
  if(s.lastRuns && s.lastRuns.length){
    s.lastRuns.slice(0,1).forEach(function(run){
      h+='<div class="sl-run">';
      h+='<div class="sl-runhead"><div style="font-family:var(--fd);font-size:12px;letter-spacing:1px;color:var(--text);">Dernier roll</div></div>';
      run.packs.forEach(function(pack){
        var bcol=cBehaviorColor(pack.beh);
        h+='<div class="sl-pack">';
        h+='<div>';
        h+='<strong>'+esc(pack.qty)+'× '+esc(pack.nom)+'</strong>';
        h+='<div class="sl-mini" style="margin-top:4px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;">';
        h+='<span>Niv. '+esc(pack.niv)+'</span>';
        h+=cBehaviorTag(pack.beh,{fontSize:7,padding:'2px 6px',letterSpacing:'1px'});
        if(pack.hidden) h+='<span style="font-size:9px;color:var(--red);padding:2px 6px;border:1px solid rgba(201,74,74,.24);background:rgba(201,74,74,.08);">Masquée</span>';
        h+='</div>';
        h+='</div>';
        h+='<div class="sl-pack-right">';
        h+='<div style="font-family:var(--fd);font-size:10px;letter-spacing:1px;color:'+bcol+';">'+Math.round((pack.prob||0)*100)+'%</div>';
        h+='<div class="sl-mini" style="margin-top:4px;">Poids actuel '+Math.round(pack.weightNow||0)+'</div>';
        h+='<div class="sl-mini">Fourchette '+pack.range.min+'-'+pack.range.max+'</div>';
        if(pack.total) h+='<div class="sl-mini" style="color:var(--gold);">Historique × '+pack.total+'</div>';
        h+='</div>';
        h+='</div>';
      });
      h+='</div>';
    });
  } else {
    h+='<div style="padding:18px;border:1px solid rgba(255,255,255,.06);background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.015));font-size:12px;color:rgba(255,255,255,.48);line-height:1.7;">Aucun tirage pour le moment. Choisis une zone, puis lance le générateur.</div>';
  }
  h+='</div>';
  h+='<div class="sl-card sl-span-12">';
  h+='<div class="sl-pool-head"><div><div class="sl-kicker">MOBS DE LA ZONE</div><div style="font-size:12px;color:var(--dim);line-height:1.55;">Le pool est automatique : tous les mobs visibles rattachés à <strong>'+esc(zoneMeta.label)+'</strong> peuvent tomber au tirage.</div></div></div>';
  h+='<div class="sl-pool">';
  if(!zonePool.length){
    h+='<div style="grid-column:1/-1;padding:18px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.025);font-size:12px;color:rgba(255,255,255,.50);line-height:1.7;">Aucun mob visible dans cette zone. Ajoute une zone aux créatures dans le bestiaire, ou choisis une autre zone.</div>';
  }
  zonePool.forEach(function(b){
    var weight=_spawnLabBaseWeight(b);
    var tuned=_spawnLabAdjustedWeight(b, zonePool.length?zonePool:beasts, s, recentCounts, {});
    var range=_spawnLabQtyRange(b);
    var beh=cBehaviorLabel(b.beh||b.behavior||b.comportement)||'Neutre';
    h+='<div class="sl-beast">';
    h+='<div class="sl-beast-name">'+esc(b.nom||'Créature')+'</div>';
    h+='<div class="sl-mini" style="margin-top:5px;color:var(--dim);line-height:1.5;">Niv. '+esc(b.niv||1)+' · '+esc(beh)+' · Qté '+range.min+'-'+range.max+'</div>';
    if(b.sub) h+='<div class="sl-mini" style="margin-top:6px;color:var(--dim);line-height:1.5;">'+esc(b.sub)+'</div>';
    h+='<div class="sl-mini" style="display:flex;justify-content:space-between;gap:10px;margin-top:10px;padding-top:9px;border-top:1px solid rgba(255,255,255,.06);color:var(--faint);">';
    h+='<span>Poids '+weight+' → '+Math.max(1,Math.round(tuned.weight))+'</span>';
    if(recentCounts[b.id]) h+='<span>Sorties × '+recentCounts[b.id]+'</span>';
    else h+='<span>Jamais sorti</span>';
    h+='</div>';
    h+='</div>';
  });
  h+='</div>';
  h+='</div>';
  h+='<div class="sl-card sl-span-4">';
  h+='<div class="sl-kicker">HISTORIQUE DES ROLLS</div>';
  if(s.lastRuns && s.lastRuns.length){
    s.lastRuns.slice(0,12).forEach(function(run, idx){
      var packs=Array.isArray(run&&run.packs)?run.packs:[];
      var label=packs.map(function(pack){ return (pack.qty||1)+'× '+(pack.nom||'Mob'); }).join(' • ')||'Roll vide';
      var by=String(run&&run.rolledBy||run&&run.by||'Inconnu');
      var zone=String(run&&run.zone||_spawnLabZoneLabel(run&&run.zoneValue||'')||'Zone inconnue');
      var rid=String(run&&run.id||idx);
      h+='<div class="sl-metric" style="align-items:flex-start;">';
      h+='<div style="min-width:0;">';
      h+='<strong style="display:block;white-space:normal;line-height:1.45;">'+esc(label)+'</strong>';
      h+='<div class="sl-mini" style="margin-top:5px;color:var(--dim);line-height:1.45;">'+esc(zone)+' · '+esc(_spawnLabRunTimeLabel(run&&run.rolledAt))+'</div>';
      h+='<div class="sl-mini" style="margin-top:3px;color:var(--faint);">Roll par '+esc(by)+'</div>';
      h+='</div>';
      if(can("manage_beasts")) h+='<button class="sl-btn sl-btn-red" style="padding:6px 8px;font-size:8px;flex-shrink:0;" onclick="spawnLabDeleteHistory(\''+jsesc(rid)+'\')">Supprimer</button>';
      h+='</div>';
    });
  } else {
    h+='<div style="font-size:12px;color:rgba(255,255,255,.48);line-height:1.7;">Aucun roll enregistré pour le moment.</div>';
  }
  h+='</div>';
  h+='</div>';
  h+='</div>';
  el.innerHTML=h;
}

// ── Rendu filtré historique ───────────────────────────────────────────────────
var _arcFilterPlayers=[];
var _arcSelectedId='';
function _archiveCreatorName(arc){
  var raw=arc&&(arc._owner||arc.owner||arc.createdBy||arc.creator||arc.author||arc.mj||arc.staff);
  raw=String(raw||'').trim();
  return raw||'Inconnu';
}
function _archivePlayerEntries(arc){
  var out=[]; var seen=Object.create(null);
  ((arc&&arc.fighters)||[]).forEach(function(f){
    if(!f || f.type!=='player') return;
    var pid=String(f.pid || f.id || f.name || '').trim();
    var name=String(f.name || f.nom || pid || 'Joueur').trim();
    var key=pid || name;
    if(!key || seen[key]) return;
    seen[key]=1;
    out.push({pid:key,name:name||key,pvCur:parseInt(f.pvCur,10)||0,pvMax:Math.max(1,parseInt(f.pvMax,10)||1),dead:(parseInt(f.pvCur,10)||0)<=0});
  });
  return out;
}
function _archiveBeastEntries(arc){
  var out=[];
  ((arc&&arc.fighters)||[]).forEach(function(f){
    if(!f || f.type!=='beast') return;
    out.push({
      id:String(f.id||f.name||f.nom||('beast'+out.length)),
      name:String(f.name||f.nom||'Créature').trim()||'Créature',
      pvCur:parseInt(f.pvCur,10)||0,
      pvMax:Math.max(1,parseInt(f.pvMax,10)||1),
      dead:(parseInt(f.pvCur,10)||0)<=0,
      img:String(f.img||'').trim(),
      niv:parseInt(f.niv,10)||0,
      beh:String(f.beh||'').trim()
    });
  });
  return out;
}
function _archiveBeastNames(arc){
  return _archiveBeastEntries(arc).map(function(f){ return f.name; }).filter(Boolean);
}
function _archiveStatusKey(arc){
  var players=_archivePlayerEntries(arc);
  var beasts=_archiveBeastEntries(arc);
  var allMKO=beasts.length&&beasts.every(function(f){ return f.dead; });
  var allJKO=players.length&&players.every(function(f){ return f.dead; });
  if(arc&&arc._draft) return 'draft';
  if(arc&&arc._inProgress) return 'progress';
  if(allMKO) return 'victory';
  if(allJKO) return 'defeat';
  return 'mixed';
}
function _archiveStatusMeta(arc){
  var key=_archiveStatusKey(arc);
  if(key==='draft') return {key:key,label:'Brouillon',color:'var(--glacier)',bg:'rgba(126,184,212,.10)',bd:'rgba(126,184,212,.22)'};
  if(key==='progress') return {key:key,label:'En cours',color:'var(--glacier)',bg:'rgba(126,184,212,.10)',bd:'rgba(126,184,212,.22)'};
  if(key==='victory') return {key:key,label:'Victoire',color:'var(--green)',bg:'rgba(85,185,102,.10)',bd:'rgba(85,185,102,.22)'};
  if(key==='defeat') return {key:key,label:'Défaite',color:'var(--red)',bg:'rgba(201,74,74,.10)',bd:'rgba(201,74,74,.22)'};
  return {key:key,label:'Résultat mixte',color:'rgba(255,255,255,0.72)',bg:'rgba(255,255,255,.05)',bd:'rgba(255,255,255,.12)'};
}
function _arcPlayerCatalog(arcs){
  var out=[];
  (arcs||[]).forEach(function(arc){
    _archivePlayerEntries(arc).forEach(function(p){ if(!out.some(function(x){ return x.pid===p.pid; })) out.push({pid:p.pid,name:p.name}); });
  });
  out.sort(function(a,b){ return String(a.name||'').localeCompare(String(b.name||''),'fr',{sensitivity:'base'}); });
  return out;
}
function _arcTogglePlayerFilter(pid){
  pid=String(pid||'').trim(); if(!pid) return;
  var idx=_arcFilterPlayers.indexOf(pid);
  if(idx>=0) _arcFilterPlayers.splice(idx,1); else _arcFilterPlayers.push(pid);
  renderArcFiltered();
}
function _arcClearPlayerFilters(){
  _arcFilterPlayers=[];
  renderArcFiltered();
}
function _arcResetFilters(){
  ['arc-search','arc-creator-filter','arc-status-filter','arc-sort-filter'].forEach(function(id){
    var node=ge(id); if(!node) return;
    node.value=(id==='arc-sort-filter')?'recent':'';
  });
  _arcFilterPlayers=[];
  renderArcFiltered();
}
function _arcSetSelected(id){
  _arcSelectedId=String(id||'').trim();
  renderArcFiltered();
}
function _arcDeleteWithConfirm(id){
  if(!confirm('Supprimer cette archive de combat ?')) return;
  combatDeleteArchive(String(id||''));
}
function _arcRenderPlayerChips(options){
  var wrap=ge('arc-player-chip-wrap'); if(!wrap) return;
  options=Array.isArray(options)?options:[];
  if(wrap.dataset && wrap.dataset.selectedPlayers){
    try{ _arcFilterPlayers=JSON.parse(wrap.dataset.selectedPlayers)||[]; }catch(_e){}
  }
  _arcFilterPlayers=_arcFilterPlayers.filter(function(pid){ return options.some(function(p){ return p.pid===pid; }); });
  if(wrap.dataset) wrap.dataset.selectedPlayers=JSON.stringify(_arcFilterPlayers);
  if(!options.length){ wrap.innerHTML=''; return; }
  var h='<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">';
  h+='<span style="font-family:var(--fd);font-size:7px;letter-spacing:3px;color:rgba(255,255,255,0.28);margin-right:2px;">JOUEURS</span>';
  options.forEach(function(p){
    var active=_arcFilterPlayers.indexOf(p.pid)>=0;
    var style='padding:6px 10px;border-radius:999px;border:1px solid '+(active?'rgba(126,184,212,0.38)':'rgba(255,255,255,0.07)')+';background:'+(active?'rgba(126,184,212,0.12)':'rgba(255,255,255,0.02)')+';color:'+(active?'var(--glacier-dim)':'rgba(255,255,255,0.72)')+';font-size:10px;cursor:pointer;transition:all .15s;';
    h+='<button type="button" onclick="_arcTogglePlayerFilter('+JSON.stringify(p.pid)+')" style="'+style+'">'+esc(p.name)+'</button>';
  });
  if(_arcFilterPlayers.length) h+='<button type="button" onclick="_arcClearPlayerFilters()" style="padding:6px 10px;border-radius:999px;border:1px solid rgba(201,74,74,0.18);background:rgba(201,74,74,0.06);color:rgba(201,74,74,0.82);font-size:10px;cursor:pointer;">Vider joueurs</button>';
  h+='</div>';
  wrap.innerHTML=h;
}
function _archiveLogEntries(arc){
  return Array.isArray(arc&&arc.log)?arc.log.filter(function(entry){ return entry && typeof entry.text==='string' && entry.text.trim(); }):[];
}
function _archiveStats(arc){
  var players=_archivePlayerEntries(arc);
  var beasts=_archiveBeastEntries(arc);
  var playerKo=players.filter(function(p){ return p.dead; }).length;
  var beastKo=beasts.filter(function(b){ return b.dead; }).length;
  return {
    players:players,
    beasts:beasts,
    playerKo:playerKo,
    beastKo:beastKo,
    playerAlive:Math.max(0,players.length-playerKo),
    beastAlive:Math.max(0,beasts.length-beastKo),
    logs:_archiveLogEntries(arc)
  };
}
function _arcSummaryHtml(filtered, options, search, creator, status, selectedPlayers){
  var chips=[];
  if(creator) chips.push('<span class="arc-summary-chip arc-summary-chip-glacier">Créateur · <strong>'+esc(creator)+'</strong></span>');
  if(status){
    var map={draft:'Brouillons',progress:'En cours',victory:'Victoires',defeat:'Défaites',mixed:'Résultat mixte'};
    chips.push('<span class="arc-summary-chip">État · <strong>'+esc(map[status]||status)+'</strong></span>');
  }
  if(selectedPlayers.length){
    var names=options.filter(function(p){ return selectedPlayers.indexOf(p.pid)>=0; }).map(function(p){ return p.name; });
    chips.push('<span class="arc-summary-chip">Joueurs · <strong>'+esc(names.join(', '))+'</strong></span>');
  }
  if(search) chips.push('<span class="arc-summary-chip">Recherche · <strong>'+esc(search)+'</strong></span>');
  return '<div class="arc-summary-head">'
    +'<span class="arc-summary-count">'+filtered.length+' combat'+(filtered.length>1?'s':'')+'</span>'
    +(chips.length ? chips.join('') : '<span class="arc-summary-muted">Aucun filtre actif</span>')
    +'</div>';
}
function renderArcFiltered(){
  var el=ge('arc-list'); if(!el) return;
  var summaryEl=ge('arc-filter-summary');
  var allArcs=can('manage_mjs')?getAllCombatArchives():getCombatArchives();
  var options=_arcPlayerCatalog(allArcs);
  _arcRenderPlayerChips(options);
  var search=String(((ge('arc-search')||{}).value||'')).trim().toLowerCase();
  var creator=String(((ge('arc-creator-filter')||{}).value||'')).trim();
  var status=String(((ge('arc-status-filter')||{}).value||'')).trim();
  var sort=String(((ge('arc-sort-filter')||{}).value||'recent')).trim()||'recent';
  var selectedPlayers=_arcFilterPlayers.slice();
  var filtered=allArcs.filter(function(arc){
    var creatorName=_archiveCreatorName(arc);
    var players=_archivePlayerEntries(arc);
    var beasts=_archiveBeastNames(arc);
    if(search){
      var hay=[String((arc&&arc.name)||(arc&&arc.label)||''), creatorName].concat(players.map(function(p){ return p.name; }), beasts).join(' ').toLowerCase();
      if(hay.indexOf(search)<0) return false;
    }
    if(creator && creatorName!==creator) return false;
    if(status && _archiveStatusKey(arc)!==status) return false;
    if(selectedPlayers.length && !selectedPlayers.every(function(pid){ return players.some(function(p){ return p.pid===pid; }); })) return false;
    return true;
  });
  filtered.sort(function(a,b){
    if(sort==='oldest') return (parseInt(a&&a.savedAt,10)||0)-(parseInt(b&&b.savedAt,10)||0);
    if(sort==='creator_az') return _archiveCreatorName(a).localeCompare(_archiveCreatorName(b),'fr',{sensitivity:'base'}) || ((parseInt(b&&b.savedAt,10)||0)-(parseInt(a&&a.savedAt,10)||0));
    if(sort==='creator_za') return _archiveCreatorName(b).localeCompare(_archiveCreatorName(a),'fr',{sensitivity:'base'}) || ((parseInt(b&&b.savedAt,10)||0)-(parseInt(a&&a.savedAt,10)||0));
    if(sort==='name_az') return String((a&&a.name)||'').localeCompare(String((b&&b.name)||''),'fr',{sensitivity:'base'}) || ((parseInt(b&&b.savedAt,10)||0)-(parseInt(a&&a.savedAt,10)||0));
    if(sort==='round_desc') return (parseInt(b&&b.round,10)||0)-(parseInt(a&&a.round,10)||0) || ((parseInt(b&&b.savedAt,10)||0)-(parseInt(a&&a.savedAt,10)||0));
    return (parseInt(b&&b.savedAt,10)||0)-(parseInt(a&&a.savedAt,10)||0);
  });
  if(summaryEl) summaryEl.innerHTML=_arcSummaryHtml(filtered, options, search, creator, status, selectedPlayers);
  if(!filtered.length){
    _arcSelectedId='';
    el.innerHTML='<div class="arc-empty"><div class="empty-state" style="padding:22px 0 10px;"><div class="empty-state-icon">⚔</div><div class="empty-state-title">Aucun combat trouvé</div><div class="empty-state-sub">Ajuste les filtres, puis rouvre une archive pour afficher son aperçu détaillé.</div></div></div>';
    return;
  }
  if(!_arcSelectedId || !filtered.some(function(arc){ return String(arc.id||'')===String(_arcSelectedId||''); })) _arcSelectedId=String(filtered[0].id||'');
  var selectedArc=filtered.find(function(arc){ return String(arc.id||'')===String(_arcSelectedId||''); }) || filtered[0];
  var selectedStats=_archiveStats(selectedArc);
  var selectedMeta=_archiveStatusMeta(selectedArc);
  var selectedSavedAt=parseInt(selectedArc&&selectedArc.savedAt,10)||0;
  var selectedDate=selectedSavedAt?new Date(selectedSavedAt).toLocaleString('fr-FR',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
  var logs=selectedStats.logs.slice(-8).reverse();
  var h='';
  h+='<div class="arc-shell">';
  h+='<div class="arc-results">';
  h+='<div class="arc-results-head">';
  h+='<div><div class="arc-results-title">Archives filtrées</div><div class="arc-results-sub">Clique une archive pour afficher sa vue détail et ses actions rapides.</div></div>';
  h+='<div class="arc-results-count">'+filtered.length+' résultat'+(filtered.length>1?'s':'')+'</div>';
  h+='</div>';
  h+='<div class="arc-results-list">';
  filtered.slice(0,80).forEach(function(arc){
    var stats=_archiveStats(arc);
    var savedAt=parseInt(arc&&arc.savedAt,10)||0;
    var date=savedAt?new Date(savedAt).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}):'—';
    var meta=_archiveStatusMeta(arc);
    var creatorName=_archiveCreatorName(arc);
    var beastNames=stats.beasts.map(function(b){ return b.name; });
    var beastPreview=beastNames.slice(0,3);
    var isCur=_cs && _cs.id===arc.id;
    var isSelected=String(_arcSelectedId||'')===String(arc.id||'');
    h+='<div class="arc-card'+(isSelected?' is-selected':'')+(isCur?' is-current':'')+'" onclick="_arcSetSelected('+JSON.stringify(String(arc.id||''))+')">';
    h+='<div class="arc-card-top">';
    h+='<div class="arc-card-main">';
    h+='<div class="arc-card-title-row">';
    h+='<div class="arc-card-title">'+esc(arc.name||'Combat sans nom')+'</div>';
    if(arc&&arc._draft) h+='<span class="arc-pill arc-pill-soft">Brouillon</span>';
    h+='<span class="arc-pill" style="color:'+meta.color+';border-color:'+meta.bd+';background:'+meta.bg+';">'+esc(meta.label)+'</span>';
    h+='</div>';
    h+='<div class="arc-card-meta"><span>'+esc(creatorName)+'</span><span class="sep">•</span><span>'+date+'</span><span class="sep">•</span><span>Round '+(parseInt(arc&&arc.round,10)||1)+'</span>'+(arc&&arc._autosaveAt?'<span class="sep">•</span><span>auto</span>':'')+'</div>';
    h+='</div>';
    h+='<div class="arc-mini-metrics">';
    h+='<span>'+stats.players.length+' joueur'+(stats.players.length>1?'s':'')+'</span>';
    h+='<span>'+stats.beasts.length+' créature'+(stats.beasts.length>1?'s':'')+'</span>';
    h+='<span>'+stats.beastKo+' tuée'+(stats.beastKo>1?'s':'')+'</span>';
    h+='</div>';
    h+='</div>';
    if(stats.players.length){
      h+='<div class="arc-player-row">';
      stats.players.forEach(function(f){
        var pct=Math.max(0,Math.min(100,Math.round((f.pvCur/Math.max(1,f.pvMax))*100)));
        var c=pct>60?'var(--green)':pct>30?'var(--gold)':'var(--red)';
        h+='<div class="arc-player-pill">';
        h+='<span class="arc-player-name">'+esc(f.name)+'</span>';
        h+='<div class="arc-player-bar"><div style="width:'+pct+'%;background:'+c+';"></div></div>';
        h+='<span class="arc-player-val" style="color:'+c+';">'+f.pvCur+'/'+f.pvMax+'</span>';
        h+='</div>';
      });
      h+='</div>';
    }
    if(beastPreview.length){
      h+='<div class="arc-beast-row">';
      beastPreview.forEach(function(name){ h+='<span class="arc-beast-chip">'+esc(name)+'</span>'; });
      if(beastNames.length>3) h+='<span class="arc-beast-more">+'+(beastNames.length-3)+'</span>';
      h+='</div>';
    }
    h+='<div class="arc-card-actions">';
    h+='<button class="btn btn-sm btn-primary" onclick="event.stopPropagation();combatLoadArchive('+JSON.stringify(String(arc.id||''))+')"><span>'+(arc&&arc._draft?'Reprendre':'Charger')+'</span></button>';
    h+='<button class="btn btn-sm" onclick="event.stopPropagation();combatExportDiscordFromArc('+JSON.stringify(String(arc.id||''))+')"><span>Exporter</span></button>';
    h+='<button class="btn btn-sm btn-red" onclick="event.stopPropagation();_arcDeleteWithConfirm('+JSON.stringify(String(arc.id||''))+')"><span>Supprimer</span></button>';
    h+='</div>';
    h+='</div>';
  });
  if(filtered.length>80) h+='<div class="arc-list-note">'+filtered.length+' combats trouvés · 80 affichés dans la liste.</div>';
  h+='</div></div>';
  h+='<div class="arc-detail">';
  h+='<div class="arc-detail-head">';
  h+='<div style="min-width:0;">';
  h+='<div class="arc-detail-kicker">Vue détail</div>';
  h+='<div class="arc-detail-title-row">';
  h+='<div class="arc-detail-title">'+esc(selectedArc.name||'Combat sans nom')+'</div>';
  h+='<span class="arc-pill" style="color:'+selectedMeta.color+';border-color:'+selectedMeta.bd+';background:'+selectedMeta.bg+';">'+esc(selectedMeta.label)+'</span>';
  if(selectedArc&&selectedArc._draft) h+='<span class="arc-pill arc-pill-soft">Brouillon</span>';
  h+='</div>';
  h+='<div class="arc-detail-sub">Créé par <strong>'+esc(_archiveCreatorName(selectedArc))+'</strong> · '+selectedDate+' · Round '+(parseInt(selectedArc&&selectedArc.round,10)||1)+'</div>';
  h+='</div>';
  h+='<div class="arc-detail-actions">';
  h+='<button class="btn btn-sm btn-primary" onclick="combatLoadArchive('+JSON.stringify(String(selectedArc.id||''))+')"><span>'+(selectedArc&&selectedArc._draft?'Reprendre le combat':'Charger le combat')+'</span></button>';
  h+='<button class="btn btn-sm" onclick="combatExportDiscordFromArc('+JSON.stringify(String(selectedArc.id||''))+')"><span>Exporter Discord</span></button>';
  h+='<button class="btn btn-sm btn-red" onclick="_arcDeleteWithConfirm('+JSON.stringify(String(selectedArc.id||''))+')"><span>Supprimer</span></button>';
  h+='</div>';
  h+='</div>';
  h+='<div class="arc-detail-metrics">';
  h+='<div class="arc-metric"><div class="arc-metric-k">Joueurs</div><div class="arc-metric-v">'+selectedStats.players.length+'</div><div class="arc-metric-sub">'+selectedStats.playerAlive+' encore debout</div></div>';
  h+='<div class="arc-metric"><div class="arc-metric-k">Créatures</div><div class="arc-metric-v">'+selectedStats.beasts.length+'</div><div class="arc-metric-sub">'+selectedStats.beastKo+' tuée'+(selectedStats.beastKo>1?'s':'')+'</div></div>';
  h+='<div class="arc-metric"><div class="arc-metric-k">Journal</div><div class="arc-metric-v">'+selectedStats.logs.length+'</div><div class="arc-metric-sub">entrées archivées</div></div>';
  h+='<div class="arc-metric"><div class="arc-metric-k">Tour</div><div class="arc-metric-v">'+(parseInt(selectedArc&&selectedArc.turn,10)||0)+'</div><div class="arc-metric-sub">phase '+esc(String(selectedArc&&selectedArc.phase||'idle'))+'</div></div>';
  h+='</div>';
  h+='<div class="arc-detail-grid">';
  h+='<div class="arc-detail-card">';
  h+='<div class="arc-detail-card-title">Joueurs</div>';
  if(selectedStats.players.length){
    h+='<div class="arc-roster">';
    selectedStats.players.forEach(function(p){
      var pct=Math.max(0,Math.min(100,Math.round((p.pvCur/Math.max(1,p.pvMax))*100)));
      var c=pct>60?'var(--green)':pct>30?'var(--gold)':'var(--red)';
      h+='<div class="arc-roster-row">';
      h+='<div class="arc-roster-main"><div class="arc-roster-name">'+esc(p.name)+'</div><div class="arc-roster-sub">'+(p.dead?'KO · ':'')+'PV '+p.pvCur+'/'+p.pvMax+'</div></div>';
      h+='<div class="arc-roster-meter"><div style="width:'+pct+'%;background:'+c+';"></div></div>';
      h+='<div class="arc-roster-side" style="color:'+c+';">'+pct+'%</div>';
      h+='</div>';
    });
    h+='</div>';
  } else {
    h+='<div class="arc-empty-line">Aucun joueur enregistré dans cette archive.</div>';
  }
  h+='</div>';
  h+='<div class="arc-detail-card">';
  h+='<div class="arc-detail-card-title">Créatures affrontées</div>';
  if(selectedStats.beasts.length){
    h+='<div class="arc-roster">';
    selectedStats.beasts.slice(0,14).forEach(function(b){
      var pct=Math.max(0,Math.min(100,Math.round((b.pvCur/Math.max(1,b.pvMax))*100)));
      var c=b.dead?'var(--red)':(pct>50?'var(--green)':'var(--gold)');
      h+='<div class="arc-roster-row">';
      h+='<div class="arc-roster-main"><div class="arc-roster-name">'+esc(b.name)+'</div><div class="arc-roster-sub">'+(b.dead?'Tuée':'Encore vivante')+(b.niv?' · Niv. '+b.niv:'')+'</div></div>';
      h+='<div class="arc-roster-meter"><div style="width:'+pct+'%;background:'+c+';"></div></div>';
      h+='<div class="arc-roster-side" style="color:'+c+';">'+(b.dead?'KO':pct+'%')+'</div>';
      h+='</div>';
    });
    if(selectedStats.beasts.length>14) h+='<div class="arc-empty-line">+'+(selectedStats.beasts.length-14)+' autres créatures dans cette archive.</div>';
    h+='</div>';
  } else {
    h+='<div class="arc-empty-line">Aucune créature enregistrée dans cette archive.</div>';
  }
  h+='</div>';
  h+='</div>';
  h+='<div class="arc-detail-card">';
  h+='<div class="arc-detail-card-title">Aperçu du journal</div>';
  if(logs.length){
    h+='<div class="arc-log-list">';
    logs.forEach(function(entry){
      var tone=(entry&&entry.type)==='dmg'?'var(--red)':((entry&&entry.type)==='heal'?'var(--green)':'var(--glacier)');
      h+='<div class="arc-log-row">';
      h+='<div class="arc-log-round">R'+(parseInt(entry&&entry.round,10)||1)+'</div>';
      h+='<div class="arc-log-text">'+esc(entry.text||'')+'</div>';
      h+='<div class="arc-log-dot" style="background:'+tone+';"></div>';
      h+='</div>';
    });
    h+='</div>';
  } else {
    h+='<div class="arc-empty-line">Cette archive ne contient pas encore de journal exploitable.</div>';
  }
  h+='</div>';
  h+='</div>';
  h+='</div>';
  el.innerHTML=h;
}
// ==========================================
// ÉVÉNEMENTS
// ==========================================
var EV_TYPES={
  combat:{icon:"⚔",col:"var(--red)",label:"Combat / Chasse"},
  exploration:{icon:"🗺",col:"var(--gold)",label:"Exploration"},
  social:{icon:"💬",col:"var(--glacier)",label:"Social / Roleplay"},
  evenement:{icon:"🌟",col:"var(--purple)",label:"Événement majeur"},
  autre:{icon:"☁️",col:"var(--faint)",label:"Autre"}
};

function getEvents(){ return sto("events")||[]; }
function saveEvents(arr){ sv("events",arr); }

function renderEvents(tid){
  var el=ge(tid); if(!el) return;
  var canEdit=CU&&(isAdminRole(CU)||roleKey(CU)==="designer");
  var isStaff=CU&&CU.role&&CU.role!=="joueur";
  var events=getEvents().sort(function(a,b){ return (a.date||0)-(b.date||0); });
  // Les joueurs ne voient pas les événements masqués
  if(!canEdit) events=events.filter(function(e){ return !e.hidden; });
  var now=Date.now();
  var upcoming=events.filter(function(e){ return (e.date||0)>=now-3600000; });
  var past=events.filter(function(e){ return (e.date||0)<now-3600000; });

  var h='<div style="max-width:860px;">';
  h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px;">';
  h+='<div class="card-title">Événements</div>';
  if(isStaff) h+='<button class="btn btn-sm btn-grn" onclick="openEventModal()"><span>+ Nouvel événement</span></button>';
  h+='</div>';

  if(upcoming.length){
    h+='<div style="font-family:var(--fd);font-size:9px;letter-spacing:3px;color:var(--glacier);margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid rgba(126,184,212,.2);">À VENIR</div>';
    h+='<div style="display:flex;flex-direction:column;gap:10px;margin-bottom:28px;">';
    upcoming.forEach(function(ev){ h+=renderEventCard(ev,canEdit,isStaff,false); });
    h+='</div>';
  } else {
    h+='<div class="card" style="margin-bottom:28px;text-align:center;padding:32px;">';
    h+='<div style="font-size:28px;margin-bottom:10px;">☁️</div>';
    h+='<div style="color:var(--faint);font-style:italic;font-size:13px;">Aucun événement à venir pour le moment.</div>';
    if(isStaff) h+='<button class="btn btn-sm btn-grn" onclick="openEventModal()" style="margin-top:14px;"><span>Créer le premier événement</span></button>';
    h+='</div>';
  }

  if(past.length){
    h+='<div style="font-family:var(--fd);font-size:9px;letter-spacing:3px;color:var(--faint);margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid var(--border);">PASSÉS</div>';
    h+='<div style="display:flex;flex-direction:column;gap:8px;opacity:.65;">';
    past.slice().reverse().slice(0,8).forEach(function(ev){ h+=renderEventCard(ev,canEdit,isStaff,true); });
    h+='</div>';
  }

  h+='</div>';
  el.innerHTML=h;
}

function renderEventCard(ev,canEdit,isStaff,isPast){
  var type=EV_TYPES[ev.type]||EV_TYPES.autre;
  var date=ev.date?new Date(ev.date):null;
  var dateStr=date?date.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})+" à "+date.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}):"Date inconnue";
  var inscrits=ev.inscrits||[];
  var max=ev.max||0;
  var isFull=max>0&&inscrits.length>=max;
  var myName=CU&&CU.pid?(gpid(CU.pid)||{}).name||CU.name:CU?CU.name:"";
  var isInscrit=myName&&inscrits.indexOf(myName)>-1;
  var isHidden=!!ev.hidden;

  var cardStyle="background:var(--bg2);border:1px solid var(--border);border-left:3px solid "+type.col+";padding:16px 18px;"+(isHidden&&canEdit?"opacity:.65;":"");
  var h='<div style="'+cardStyle+'">';

  // Badge masqué
  if(isHidden&&canEdit){
    h+='<div style="display:inline-flex;align-items:center;gap:5px;font-family:var(--fd);font-size:7px;letter-spacing:2px;padding:2px 8px;background:rgba(201,160,76,.12);border:1px solid rgba(201,160,76,.35);color:var(--gold);margin-bottom:8px;">👁 MASQUÉ</div>';
  }

  h+='<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;">';
  h+='<div style="flex:1;min-width:0;">';
  h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">';
  h+='<span style="font-family:var(--fd);font-size:7px;letter-spacing:2px;padding:2px 7px;background:'+type.col+'22;border:1px solid '+type.col+'55;color:'+type.col+';">'+type.icon+' '+type.label.toUpperCase()+'</span>';
  h+='</div>';
  h+='<div style="font-family:var(--fd);font-size:15px;letter-spacing:1px;color:var(--text);margin-bottom:6px;">'+escHtml(ev.nom||"Sans titre")+'</div>';
  h+='<div style="font-size:12px;color:var(--glacier);margin-bottom:8px;">📅 '+dateStr+'</div>';
  if(ev.desc) h+='<div style="font-size:13px;color:var(--dim);line-height:1.6;margin-bottom:10px;">'+escHtml(ev.desc).replace(/\n/g,"<br>")+'</div>';
  h+='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">';
  h+='<span style="font-family:var(--fd);font-size:9px;letter-spacing:2px;color:var(--faint);">PARTICIPANTS</span>';
  h+='<span style="font-family:var(--fm);font-size:11px;color:'+(isFull?"var(--red)":"var(--text)")+';">'+inscrits.length+(max>0?" / "+max:"")+'</span>';
  if(inscrits.length){
    inscrits.forEach(function(n){
      h+='<span style="font-size:10px;padding:1px 7px;background:rgba(126,184,212,.1);border:1px solid rgba(126,184,212,.25);color:var(--glacier);">'+escHtml(n)+'</span>';
    });
  }
  h+='</div>';
  h+='</div>';

  // Actions
  h+='<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;flex-shrink:0;">';
  if(!isPast&&!isStaff){
    if(isInscrit){
      h+='<button onclick="eventDesinscrit(\''+ev.id+'\')" class="btn btn-sm" style="border-color:var(--red);color:var(--red);font-size:9px;"><span>Se désinscrire</span></button>';
    } else if(!isFull){
      h+='<button onclick="eventInscrit(\''+ev.id+'\')" class="btn btn-sm btn-grn" style="font-size:9px;"><span>✓ Participer</span></button>';
    } else {
      h+='<span style="font-family:var(--fd);font-size:8px;letter-spacing:1px;color:var(--red);">COMPLET</span>';
    }
  }
  if(canEdit){
    // Toggle publié/masqué
    h+='<button onclick="toggleEventHidden(\''+ev.id+'\')" class="btn btn-sm" style="font-size:9px;'+(isHidden?'border-color:var(--gold);color:var(--gold);':'border-color:var(--glacier-dim);color:var(--glacier-dim);')+'"><span>'+(isHidden?'👁 Publier':'🔒 Masquer')+'</span></button>';
    h+='<button onclick="openEventModal(\''+ev.id+'\')" class="btn btn-sm" style="font-size:9px;"><span>✎ Modifier</span></button>';
    h+='<button onclick="deleteEvent(\''+ev.id+'\')" class="btn btn-sm" style="font-size:9px;border-color:rgba(201,74,74,.4);color:var(--red);"><span>Supprimer</span></button>';
  }
  h+='</div>';
  h+='</div></div>';
  return h;
}

function openEventModal(id){
  var ev=id?getEvents().find(function(e){return e.id===id;}):null;
  ge("m-event-title").textContent=ev?"Modifier l'événement":"Nouvel événement";
  ge("ev-id").value=ev?ev.id:"";
  ge("ev-nom").value=ev?ev.nom:"";
  ge("ev-type").value=ev?ev.type:"combat";
  ge("ev-desc").value=ev?ev.desc:"";
  var pubEl=ge("ev-published");
  var pubLbl=ge("ev-published-lbl");
  var isPublished=ev?!ev.hidden:true;
  if(pubEl){ pubEl.checked=isPublished; }
  if(pubLbl){ pubLbl.textContent=isPublished?'Publié — visible par tous les joueurs':'Masqué — visible staff uniquement'; }
  if(ev&&ev.date){
    var d=new Date(ev.date);
    var pad=function(n){return String(n).padStart(2,"0");};
    ge("ev-date").value=d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+pad(d.getHours())+":"+pad(d.getMinutes());
  } else {
    ge("ev-date").value="";
  }
  openModal("m-event");
  setTimeout(function(){ ge("ev-nom").focus(); },100);
}

function saveEvent(){
  var nom=ge("ev-nom").value.trim();
  if(!nom){ notif("Donne un titre à l'événement.","err"); return; }
  var dateVal=ge("ev-date").value;
  var date=dateVal?new Date(dateVal).getTime():null;
  var arr=getEvents();
  var id=ge("ev-id").value||("ev"+Date.now());
  var existing=arr.findIndex(function(e){return e.id===id;});
  var pubEl=ge("ev-published");
  var isHidden=pubEl?!pubEl.checked:false;
  var ev={
    id:id,
    nom:nom,
    type:ge("ev-type").value,
    desc:ge("ev-desc").value.trim(),
    date:date,
    hidden:isHidden,
    inscrits:existing>=0?(arr[existing].inscrits||[]):[],
    createdBy:CU?CU.name:"Staff",
    updatedAt:Date.now()
  };
  var isNew=existing<0;
  if(existing>=0) arr[existing]=ev; else arr.push(ev);
  saveEvents(arr);
  sysLog(isNew?"event_cree":"event_modif","Événement '"+nom+"'"+(date?" le "+new Date(date).toLocaleDateString("fr-FR"):""),CU?CU.name:"Staff");
  // Notifier tous les joueurs si nouvel événement publié
  if(isNew&&!isHidden){
    var players=gp();
    var dateLabel=date?" — "+new Date(date).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})+" à "+new Date(date).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}):"";
    players.forEach(function(p){
      p.history=p.history||[];
      p.history.push({ts:Date.now(),type:"event",text:"📅 Nouvel événement : "+nom+dateLabel,by:CU?CU.name:"Staff"});
    });
    sp(players);
    sysLog("event_notif","Notification envoyée à "+players.length+" joueur(s) pour '"+nom+"'",CU?CU.name:"Staff");
  }
  closeModal("m-event");
  notif((isNew?"Événement créé":"Événement modifié")+" — "+nom+(isNew&&!isHidden?" · Joueurs notifiés ✓":""),"ok");
  renderEvents("p-events-c");
}

function toggleEventHidden(id){
  var arr=getEvents();
  var ev=arr.find(function(e){return e.id===id;}); if(!ev) return;
  ev.hidden=!ev.hidden;
  saveEvents(arr);
  sysLog("event_visibilite","Événement '"+ev.nom+"' "+(ev.hidden?"masqué":"publié"),CU?CU.name:"Staff");
  notif(ev.hidden?"Événement masqué aux joueurs.":"Événement publié.","ok");
  renderEvents("p-events-c");
}

function deleteEvent(id){
  if(!confirm("Supprimer cet événement ?")) return;
  var ev=getEvents().find(function(e){return e.id===id;});
  sysLog("event_supprime","Événement '"+(ev?ev.nom:id)+"' supprimé",CU?CU.name:"Staff");
  saveEvents(getEvents().filter(function(e){return e.id!==id;}));
  notif("Événement supprimé.","inf");
  renderEvents("p-events-c");
}

function eventInscrit(id){
  var myName=CU&&CU.pid?(gpid(CU.pid)||{}).name||CU.name:CU?CU.name:"";
  if(!myName){ notif("Connecte-toi pour t'inscrire.","err"); return; }
  var arr=getEvents();
  var ev=arr.find(function(e){return e.id===id;}); if(!ev) return;
  ev.inscrits=ev.inscrits||[];
  if(ev.inscrits.indexOf(myName)>-1){ notif("Déjà inscrit.","inf"); return; }
  if(ev.max>0&&ev.inscrits.length>=ev.max){ notif("Événement complet.","err"); return; }
  ev.inscrits.push(myName);
  saveEvents(arr);
  sysLog("event_inscription",myName+" s'est inscrit à '"+ev.nom+"'",myName);
  notif("Inscription confirmée — "+ev.nom+" ✓","ok");
  renderEvents("p-events-c");
}

function eventDesinscrit(id){
  var myName=CU&&CU.pid?(gpid(CU.pid)||{}).name||CU.name:CU?CU.name:"";
  if(!myName) return;
  var arr=getEvents();
  var ev=arr.find(function(e){return e.id===id;}); if(!ev) return;
  ev.inscrits=(ev.inscrits||[]).filter(function(n){return n!==myName;});
  saveEvents(arr);
  sysLog("event_desinscription",myName+" s'est désinscrit de '"+ev.nom+"'",myName);
  notif("Désinscription effectuée.","inf");
  renderEvents("p-events-c");
}


// ==========================================
// CARTE DU MONDE
// ==========================================
var _carteMap=null;          // instance Leaflet
var _carteLayer=null;        // layer des marqueurs
var _carteLoaded=false;      // Leaflet chargé
var _cartePendingClick=null; // coords en attente pour nouveau lieu
var LIEU_TYPES={
  ville: {icon:"🏙",col:"#7eb8d4",label:"Ville / Village"},
  ruine: {icon:"🏚",col:"#c9a84c",label:"Ruines"},
  donjon:{icon:"⚔",col:"#c94a4a",label:"Zone dangereuse"},
  nature:{icon:"🌿",col:"#6db88a",label:"Zone naturelle"},
  poi:   {icon:"★",col:"#c084d4",label:"Point d'intérêt"},
  secret:{icon:"👁",col:"#585878",label:"Zone secrète"}
};

function getLieux(){ return sto("lieux")||[]; }
function saveLieux(arr){ sv("lieux",arr); }

function renderCarte(tid){
  var el=ge(tid); if(!el) return;
  var isStaff=CU&&CU.role&&CU.role!=="joueur";

  // Charger Leaflet si pas encore fait
  if(!window.L){
    el.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:300px;gap:12px;color:var(--faint);"><span style="font-size:13px;">Chargement de la carte…</span></div>';
    var link=document.createElement("link");
    link.rel="stylesheet";
    link.href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(s);
  } else {
    _initCarte(tid,isStaff);
  }
}

function _initCarte(tid,isStaff){
  var el=ge(tid); if(!el) return;

  // Détruire l'ancienne instance si elle existe
  if(_carteMap){ try{ _carteMap.remove(); }catch(e){} _carteMap=null; }

  var h='<div style="position:relative;">';
  // Barre d'outils staff
  if(isStaff){
    h+='<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--bg2);border:1px solid var(--border);border-bottom:none;flex-wrap:wrap;gap:8px;">';
    h+='<div style="font-family:var(--fd);font-size:9px;letter-spacing:3px;color:var(--glacier);">CARTE DU MONDE</div>';
    h+='<div style="display:flex;gap:6px;">';
    h+='<button class="btn btn-sm btn-grn" onclick="carteAddMode()" id="btn-carte-add" title="Cliquer sur la carte pour placer un lieu"><span>+ Ajouter un lieu</span></button>';
    h+='<button class="btn btn-sm" onclick="carteToggleFog()" id="btn-carte-fog" style="border-color:var(--faint);color:var(--faint);font-size:9px;"><span>🌫 Fog</span></button>';
    h+='</div>';
    h+='</div>';
  } else {
    h+='<div style="padding:10px 14px;background:var(--bg2);border:1px solid var(--border);border-bottom:none;">';
    h+='<div style="font-family:var(--fd);font-size:9px;letter-spacing:3px;color:var(--glacier);">CARTE DU MONDE</div>';
    h+='</div>';
  }
  h+='<div id="carte-map" style="height:600px;border:1px solid var(--border);background:#0a0e14;"></div>';
  if(isStaff) h+='<div id="carte-hint" style="display:none;position:absolute;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(126,184,212,.15);border:1px solid var(--glacier);color:var(--glacier);font-family:var(--fd);font-size:9px;letter-spacing:2px;padding:6px 16px;pointer-events:none;">CLIQUER SUR LA CARTE POUR PLACER LE LIEU</div>';
  h+='</div>';
  el.innerHTML=h;

  // Init Leaflet avec CRS simple (pas de tuiles géographiques)
  var bounds=[[0,0],[1000,1600]];
  var map=L.map("carte-map",{
    crs:L.CRS.Simple,
    minZoom:-2,
    maxZoom:3,
    zoomControl:true,
    attributionControl:false,
    center:[500,800],
    zoom:0
  });
  _carteMap=map;

  // Fond de carte généré — canvas SVG stylisé fantasy
  _drawMapBackground(map,bounds);

  // Ajuster la vue
  map.fitBounds(bounds);

  // Layer des marqueurs
  _carteLayer=L.layerGroup().addTo(map);
  _renderMarkers(isStaff);

  // Clic pour ajouter un lieu (staff)
  if(isStaff){
    map.on("click",function(e){
      if(!_cartePendingClick) return;
      _cartePendingClick=null;
      var hint=ge("carte-hint"); if(hint) hint.style.display="none";
      var btn=ge("btn-carte-add");
      if(btn){ btn.style.borderColor=""; btn.style.color=""; btn.innerHTML="<span>+ Ajouter un lieu</span>"; }
      map.getContainer().style.cursor="";
      // Ouvrir la modale avec les coordonnées
      _openLieuModal(null,e.latlng.lat,e.latlng.lng);
    });
  }
}

function _drawMapBackground(map,bounds){
  // SVG overlay comme fond de carte fantasy
  var svgElem=document.createElementNS("http://www.w3.org/2000/svg","svg");
  svgElem.setAttribute("xmlns","http://www.w3.org/2000/svg");
  svgElem.setAttribute("width","1600");
  svgElem.setAttribute("height","1000");
  svgElem.style.background="#0a0e14";

  var svg='<defs><filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
  // Fond océan
  svg+='<rect width="1600" height="1000" fill="#060c14"/>';
  // Texture eau
  svg+='<path d="M0 200 Q200 180 400 210 Q600 240 800 195 Q1000 150 1200 200 Q1400 240 1600 190 L1600 1000 L0 1000 Z" fill="#080f1a" opacity="0.8"/>';
  svg+='<path d="M0 350 Q300 320 600 360 Q900 390 1200 340 Q1400 310 1600 360 L1600 1000 L0 1000 Z" fill="#06111e" opacity="0.5"/>';

  // Continent principal — forme organique
  svg+='<path d="M180 120 Q320 80 520 95 Q720 108 850 140 Q1020 170 1150 145 Q1280 118 1380 160 Q1420 200 1400 280 Q1380 350 1340 400 Q1300 460 1280 530 Q1250 600 1200 640 Q1150 680 1080 700 Q1000 720 920 710 Q840 700 780 660 Q700 620 650 580 Q580 530 520 540 Q460 550 400 520 Q340 490 300 450 Q250 410 220 370 Q180 320 160 270 Q140 210 180 120 Z" fill="#0e1a1f" stroke="#1a3040" stroke-width="2"/>';

  // Reliefs — montagnes stylisées
  var mountains=[
    [400,200],[440,180],[480,200],[460,170],[500,185],
    [700,300],[740,275],[780,295],[760,265],
    [1100,250],[1140,230],[1180,255],[1160,220]
  ];
  mountains.forEach(function(m){
    svg+='<path d="M'+(m[0]-20)+' '+m[1]+' L'+m[0]+' '+(m[1]-30)+' L'+(m[0]+20)+' '+m[1]+' Z" fill="#162530" stroke="#1e3548" stroke-width="1" opacity="0.9"/>';
  });

  // Forêts — cercles groupés
  var forests=[[550,420],[570,400],[590,430],[610,410],[560,440],[580,450]];
  forests.forEach(function(f){
    svg+='<circle cx="'+f[0]+'" cy="'+f[1]+'" r="12" fill="#0e2014" stroke="#143020" stroke-width="1" opacity="0.8"/>';
  });
  var forests2=[[850,520],[870,500],[890,525],[910,505],[860,540]];
  forests2.forEach(function(f){
    svg+='<circle cx="'+f[0]+'" cy="'+f[1]+'" r="10" fill="#0e2014" stroke="#143020" stroke-width="1" opacity="0.8"/>';
  });

  // Rivières
  svg+='<path d="M480 200 Q500 280 490 360 Q480 420 510 480" fill="none" stroke="#0d2535" stroke-width="3" opacity="0.7"/>';
  svg+='<path d="M750 300 Q780 380 760 440 Q740 500 770 560" fill="none" stroke="#0d2535" stroke-width="2.5" opacity="0.6"/>';

  // Île secondaire
  svg+='<path d="M1380 650 Q1420 620 1460 650 Q1500 680 1480 720 Q1460 760 1420 750 Q1380 740 1370 710 Q1360 680 1380 650 Z" fill="#0e1a1f" stroke="#1a3040" stroke-width="1.5"/>';

  // Grille de navigation subtile
  for(var gx=0;gx<=1600;gx+=100){
    svg+='<line x1="'+gx+'" y1="0" x2="'+gx+'" y2="1000" stroke="#0f1e2a" stroke-width="0.5" opacity="0.4"/>';
  }
  for(var gy=0;gy<=1000;gy+=100){
    svg+='<line x1="0" y1="'+gy+'" x2="1600" y2="'+gy+'" stroke="#0f1e2a" stroke-width="0.5" opacity="0.4"/>';
  }

  // Rose des vents
  svg+='<g transform="translate(80,80)">';
  svg+='<circle cx="0" cy="0" r="28" fill="#060c14" stroke="#1a3040" stroke-width="1"/>';
  svg+='<path d="M0-24 L4-8 L0-12 L-4-8 Z" fill="#7eb8d4" opacity="0.9"/>';
  svg+='<path d="M0 24 L4 8 L0 12 L-4 8 Z" fill="#3a6070" opacity="0.7"/>';
  svg+='<path d="M-24 0 L-8 4 L-12 0 L-8 -4 Z" fill="#3a6070" opacity="0.7"/>';
  svg+='<path d="M24 0 L8 4 L12 0 L8 -4 Z" fill="#3a6070" opacity="0.7"/>';
  svg+='<text x="0" y="-30" text-anchor="middle" fill="#7eb8d4" font-size="10" font-family="serif">N</text>';
  svg+='<circle cx="0" cy="0" r="3" fill="#7eb8d4"/>';
  svg+='</g>';

  svgElem.innerHTML=svg;
  var svgUrl="data:image/svg+xml,"+encodeURIComponent(svgElem.outerHTML);
  L.imageOverlay(svgUrl,bounds,{opacity:1}).addTo(map);
}

function _renderMarkers(isStaff){
  if(!_carteLayer||!_carteMap) return;
  _carteLayer.clearLayers();
  var lieux=getLieux();
  lieux.forEach(function(l){
    // Fog of war — joueurs ne voient pas les lieux masqués
    if(!isStaff&&!l.visible) return;
    var t=LIEU_TYPES[l.type]||LIEU_TYPES.poi;
    var opacity=l.visible?1:0.35;
    var icon=L.divIcon({
      className:"",
      html:'<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">'
        +'<div style="width:32px;height:32px;border-radius:50%;background:'+t.col+'22;border:2px solid '+t.col+';display:flex;align-items:center;justify-content:center;font-size:14px;opacity:'+opacity+';transition:transform .15s;box-shadow:0 0 8px '+t.col+'44;">'
        +(l.visible?t.icon:'?')
        +'</div>'
        +'<div style="font-family:Cinzel,serif;font-size:9px;letter-spacing:1px;color:'+t.col+';opacity:'+opacity+';white-space:nowrap;text-shadow:0 1px 4px #000;margin-top:2px;background:rgba(6,12,20,.8);padding:1px 4px;">'+escHtml(l.nom)+'</div>'
        +'</div>',
      iconSize:[80,50],
      iconAnchor:[40,16]
    });
    var marker=L.marker([l.lat,l.lng],{icon:icon,draggable:isStaff});
    // Popup
    var popHtml='<div style="background:#09090f;border:1px solid '+t.col+';padding:12px;min-width:200px;font-family:sans-serif;">';
    popHtml+='<div style="font-family:Cinzel,serif;font-size:12px;letter-spacing:2px;color:'+t.col+';margin-bottom:6px;">'+escHtml(l.nom)+'</div>';
    popHtml+='<div style="font-size:10px;color:#7eb8d4;margin-bottom:8px;">'+t.icon+' '+t.label+'</div>';
    if(l.desc) popHtml+='<div style="font-size:12px;color:#a0a4c0;line-height:1.5;margin-bottom:8px;">'+escHtml(l.desc).replace(/\n/g,"<br>")+'</div>';
    if(isStaff){
      if(l.notes) popHtml+='<div style="font-size:11px;color:#585878;border-top:1px solid #1a3040;padding-top:6px;margin-bottom:8px;font-style:italic;">'+escHtml(l.notes).replace(/\n/g,"<br>")+'</div>';
      popHtml+='<div style="display:flex;gap:6px;">';
      popHtml+='<button onclick="_editLieu(\''+l.id+'\')" style="flex:1;background:transparent;border:1px solid #7eb8d4;color:#7eb8d4;font-size:10px;padding:4px;cursor:pointer;">✎ Modifier</button>';
      popHtml+='<button onclick="_deleteLieu(\''+l.id+'\')" style="flex:1;background:transparent;border:1px solid #c94a4a;color:#c94a4a;font-size:10px;padding:4px;cursor:pointer;">✕ Supprimer</button>';
      if(!l.visible) popHtml+='<button onclick="_toggleLieuVisible(\''+l.id+'\')" style="flex:1;background:transparent;border:1px solid #c9a84c;color:#c9a84c;font-size:10px;padding:4px;cursor:pointer;">👁 Révéler</button>';
      else popHtml+='<button onclick="_toggleLieuVisible(\''+l.id+'\')" style="flex:1;background:transparent;border:1px solid #585878;color:#585878;font-size:10px;padding:4px;cursor:pointer;">🌫 Masquer</button>';
      popHtml+='</div>';
    }
    popHtml+='</div>';
    marker.bindPopup(popHtml,{
      className:"carte-popup",
      maxWidth:280,
      closeButton:true
    });
    // Drag & drop staff
    if(isStaff){
      marker.on("dragend",function(e){
        var pos=e.target.getLatLng();
        var lieux2=getLieux();
        var idx=lieux2.findIndex(function(x){return x.id===l.id;});
        if(idx>=0){ lieux2[idx].lat=pos.lat; lieux2[idx].lng=pos.lng; saveLieux(lieux2); }
      });
    }
    marker.addTo(_carteLayer);
  });
}

function carteAddMode(){
  if(!_carteMap) return;
  _cartePendingClick={};
  var hint=ge("carte-hint"); if(hint) hint.style.display="block";
  var btn=ge("btn-carte-add");
  if(btn){ btn.style.borderColor="var(--glacier)"; btn.style.color="var(--glacier)"; btn.innerHTML="<span>✕ Annuler</span>"; }
  _carteMap.getContainer().style.cursor="crosshair";
}

function carteToggleFog(){
  // Toggle l'affichage de tous les lieux masqués (staff)
  var isStaff=CU&&CU.role&&CU.role!=="joueur";
  _renderMarkers(isStaff);
  notif("Affichage du fog mis à jour.","inf");
}

function _openLieuModal(id,lat,lng){
  var lieu=id?getLieux().find(function(l){return l.id===id;}):null;
  ge("m-lieu-title").textContent=lieu?"Modifier le lieu":"Nouveau lieu";
  ge("lieu-id").value=lieu?lieu.id:"";
  ge("lieu-nom").value=lieu?lieu.nom:"";
  ge("lieu-type").value=lieu?lieu.type:"ville";
  ge("lieu-desc").value=lieu?lieu.desc:"";
  ge("lieu-notes").value=lieu?lieu.notes:"";
  ge("lieu-visible").value=lieu?(lieu.visible?"1":"0"):"1";
  // Stocker les coords en data sur la modale
  var m=ge("m-lieu");
  if(lat!==undefined) m.dataset.lat=lat;
  if(lng!==undefined) m.dataset.lng=lng;
  openModal("m-lieu");
  setTimeout(function(){ ge("lieu-nom").focus(); },100);
}

function saveLieu(){
  var nom=(ge("lieu-nom").value||"").trim();
  if(!nom){ notif("Donne un nom au lieu.","err"); return; }
  var m=ge("m-lieu");
  var lieux=getLieux();
  var id=ge("lieu-id").value||("l"+Date.now());
  var existing=lieux.findIndex(function(l){return l.id===id;});
  var lat=existing>=0?lieux[existing].lat:parseFloat(m.dataset.lat||500);
  var lng=existing>=0?lieux[existing].lng:parseFloat(m.dataset.lng||800);
  var lieu={
    id:id, nom:nom,
    type:ge("lieu-type").value,
    desc:(ge("lieu-desc").value||"").trim(),
    notes:(ge("lieu-notes").value||"").trim(),
    visible:ge("lieu-visible").value==="1",
    lat:lat, lng:lng
  };
  if(existing>=0) lieux[existing]=lieu; else lieux.push(lieu);
  saveLieux(lieux);
  closeModal("m-lieu");
  notif((existing>=0?"Lieu modifié":"Lieu ajouté")+" — "+nom,"ok");
  var isStaff=CU&&CU.role&&CU.role!=="joueur";
  _renderMarkers(isStaff);
}

function _editLieu(id){
  if(_carteMap) _carteMap.closePopup();
  _openLieuModal(id);
}

function _deleteLieu(id){
  if(!confirm("Supprimer ce lieu ?")) return;
  saveLieux(getLieux().filter(function(l){return l.id!==id;}));
  notif("Lieu supprimé.","inf");
  var isStaff=CU&&CU.role&&CU.role!=="joueur";
  if(_carteMap) _carteMap.closePopup();
  _renderMarkers(isStaff);
}

function _toggleLieuVisible(id){
  var lieux=getLieux();
  var l=lieux.find(function(x){return x.id===id;});
  if(!l) return;
  l.visible=!l.visible;
  saveLieux(lieux);
  if(_carteMap) _carteMap.closePopup();
  var isStaff=CU&&CU.role&&CU.role!=="joueur";
  _renderMarkers(isStaff);
  notif(l.nom+(l.visible?" révélé aux joueurs.":" masqué."),"ok");
}

// ==========================================
// PARTICULES CANVAS — ÉCRAN LOGIN
// ==========================================
var _loginParticlesRaf=null;

// ==========================================
// LOGO — ROTATION + PARTICULES
// ==========================================
var _logoParts=[];
var _logoRaf=null;
var _logoCanvas=null;
var _logoCtx=null;

function _logoEnsureCanvas(){
  if(_logoCanvas) return;
  _logoCanvas=document.createElement("canvas");
  _logoCanvas.style.cssText="position:fixed;inset:0;z-index:99999;pointer-events:none;";
  document.body.appendChild(_logoCanvas);
  _logoCtx=_logoCanvas.getContext("2d");
  function resize(){ _logoCanvas.width=window.innerWidth; _logoCanvas.height=window.innerHeight; }
  window.addEventListener("resize",resize); resize();
}


function _logoSpawn(x,y,count){
  _logoEnsureCanvas();
  var pal=_npThemePalette();
  var cols=[_npRgbCss(pal.primary),_npRgbCss(pal.secondary),_npRgbCss(pal.accent),_npRgbCss(pal.text),"#c9a84c"];
  for(var i=0;i<count;i++){
    var angle=Math.random()*Math.PI*2;
    var speed=1.5+Math.random()*3.5;
    _logoParts.push({
      x:x, y:y,
      vx:Math.cos(angle)*speed,
      vy:Math.sin(angle)*speed-1,
      r:Math.random()*2.5+0.5,
      life:1,
      decay:0.018+Math.random()*0.022,
      col:cols[Math.floor(Math.random()*cols.length)],
      gravity:0.08
    });
  }
  if(_logoParts.length>400) _logoParts=_logoParts.slice(_logoParts.length-400);
}



function _logoAnimLoop(){
  var ctx=_logoCtx;
  var W=_logoCanvas.width, H=_logoCanvas.height;
  ctx.clearRect(0,0,W,H);
  _logoParts=_logoParts.filter(function(p){return p.life>0;});
  _logoParts.forEach(function(p){
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    // Hexagon étoile optionnel — cercle simple pour perf
    ctx.fillStyle=p.col.indexOf("rgba")<0
      ?p.col.replace(")",","+(p.life*0.85)+")")
        .replace("#","rgba(")
        .replace(/rgba\(([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2}),/,
          function(_,r,g,b){return "rgba("+parseInt(r,16)+","+parseInt(g,16)+","+parseInt(b,16)+",";})
      :p.col;
    ctx.fill();
    p.x+=p.vx; p.y+=p.vy;
    p.vy+=p.gravity;
    p.vx*=0.98;
    p.life-=p.decay;
  });
  if(_logoParts.length>0){
    _logoRaf=requestAnimationFrame(_logoAnimLoop);
  } else {
    _logoRaf=null;
    ctx.clearRect(0,0,_logoCanvas.width,_logoCanvas.height);
  }
}

function logoClick(el){
  // Navigation vers l'accueil si app active
  if(ge("s-app")&&ge("s-app").classList.contains("active")){
    switchDropTab("accueil",null,"dd-joueurs");
  }
  // Rotation accélérée
  var now=Date.now();
  var last=parseFloat(el.dataset.last||0);
  var speed=parseFloat(el.dataset.speed||600);
  var gap=now-last;
  if(gap<800) speed=Math.max(60,speed*0.65); else speed=600;
  el.dataset.speed=speed; el.dataset.last=now;
  var rot=parseFloat(el.dataset.rot||0)+360;
  el.dataset.rot=rot;
  el.style.transition="transform "+speed+"ms cubic-bezier(0.25,0.1,0.25,1)";
  el.style.transform="rotate("+rot+"deg)";

  // Particules depuis le centre du logo
  var rect=el.getBoundingClientRect();
  var cx=rect.left+rect.width/2;
  var cy=rect.top+rect.height/2;
  // Plus on clique vite, plus il y a de particules (8 → 30)
  var count=Math.min(30,Math.round(8+(600-speed)/20));
  _logoSpawn(cx,cy,count);

  // Démarrer la boucle d'anim si elle ne tourne pas
  if(!_logoRaf) _logoRaf=requestAnimationFrame(_logoAnimLoop);
}

function initLoginParticles(){
  var canvas=ge("login-particles-canvas");
  if(!canvas||canvas._init) return;
  canvas._init=true;
  var ctx=canvas.getContext("2d");
  var W,H,pts,lines;

  function resize(){
    W=canvas.width=window.innerWidth;
    H=canvas.height=window.innerHeight;
    buildScene();
  }

  function buildScene(){
    // Points flottants (étoiles/particules)
    pts=[];
    var count=Math.floor(W*H/14000);
    for(var i=0;i<count;i++){
      pts.push({
        x:Math.random()*W, y:Math.random()*H,
        vx:(Math.random()-.5)*.18, vy:(Math.random()-.5)*.12,
        r:Math.random()<.15?1.2:.5,
        a:Math.random()*.5+.1
      });
    }
    // Lignes de topographie — courbes horizontales légères
    lines=[];
    var segments=8;
    for(var l=0;l<segments;l++){
      var baseY=H*.1+l*(H*.11);
      var pts2=[];
      var cols=12;
      for(var c=0;c<=cols;c++){
        pts2.push({
          x:c*(W/cols),
          y:baseY+(Math.random()-.5)*H*.06
        });
      }
      lines.push(pts2);
    }
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    var isLight=document.body.classList.contains("light");
    var gc=isLight?"rgba(58,143,186,":"rgba(126,184,212,";

    // Lignes topo
    lines.forEach(function(lpts){
      ctx.beginPath();
      ctx.moveTo(lpts[0].x,lpts[0].y);
      for(var i=1;i<lpts.length-1;i++){
        var mx=(lpts[i].x+lpts[i+1].x)/2;
        var my=(lpts[i].y+lpts[i+1].y)/2;
        ctx.quadraticCurveTo(lpts[i].x,lpts[i].y,mx,my);
      }
      ctx.strokeStyle=gc+".04)";
      ctx.lineWidth=.8;
      ctx.stroke();
    });

    // Connexions entre pts proches
    for(var i=0;i<pts.length;i++){
      for(var j=i+1;j<pts.length;j++){
        var dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y;
        var d=Math.sqrt(dx*dx+dy*dy);
        if(d<120){
          ctx.beginPath();
          ctx.moveTo(pts[i].x,pts[i].y);
          ctx.lineTo(pts[j].x,pts[j].y);
          ctx.strokeStyle=gc+((.06*(1-d/120)).toFixed(3))+")";
          ctx.lineWidth=.4;
          ctx.stroke();
        }
      }
    }

    // Points
    pts.forEach(function(p){
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=gc+p.a+")";
      ctx.fill();
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0) p.x=W; if(p.x>W) p.x=0;
      if(p.y<0) p.y=H; if(p.y>H) p.y=0;
    });

    // Continuer seulement si login visible
    var login=ge("s-login");
    if(login&&login.classList.contains("active")){
      _loginParticlesRaf=requestAnimationFrame(draw);
    } else {
      _loginParticlesRaf=null;
    }
  }

  window.addEventListener("resize",resize);
  resize();

  // Démarrer quand login actif
  function tryStart(){
    var login=ge("s-login");
    if(login&&login.classList.contains("active")){
      if(!_loginParticlesRaf) _loginParticlesRaf=requestAnimationFrame(draw);
    } else {
      setTimeout(tryStart,200);
    }
  }
  tryStart();
}


function mobileDrawerClosedLeft(drawer){
  if(!drawer) return "-280px";
  var w=0;
  try{ w=drawer.getBoundingClientRect().width || drawer.offsetWidth || 280; }catch(e){ w=280; }
  w=Math.max(280, Math.ceil(Number(w)||280));
  return "-"+w+"px";
}

function toggleMobileDrawer(){
  var drawer=ge("mobile-drawer");
  var overlay=ge("mobile-drawer-overlay");
  var burger=ge("burger-btn");
  if(!drawer) return;
  var isOpen=drawer.style.left==="0px";
  if(isOpen){ closeMobileDrawer(); }
  else {
    drawer.style.left="0px";
    if(overlay){ overlay.style.display="block"; }
    if(burger){
      var lines=burger.querySelectorAll(".burger-line");
      if(lines[0]) lines[0].style.transform="rotate(45deg) translate(4px,4px)";
      if(lines[1]) lines[1].style.opacity="0";
      if(lines[2]){ lines[2].style.transform="rotate(-45deg) translate(4px,-4px)"; lines[2].style.width="16px"; lines[2].style.marginLeft="0"; }
    }
    // Afficher section staff si connecté en staff
    var staffSec=ge("drawer-staff-section");
    if(staffSec) staffSec.style.display=(CU&&CU.type==="staff")?"block":"none";
  }
}

function closeMobileDrawer(){
  var drawer=ge("mobile-drawer");
  var overlay=ge("mobile-drawer-overlay");
  var burger=ge("burger-btn");
  if(drawer) drawer.style.left=mobileDrawerClosedLeft(drawer);
  if(overlay) overlay.style.display="none";
  if(burger){
    var lines=burger.querySelectorAll(".burger-line");
    if(lines[0]) lines[0].style.transform="";
    if(lines[1]) lines[1].style.opacity="1";
    if(lines[2]){ lines[2].style.transform=""; lines[2].style.width="12px"; lines[2].style.marginLeft="2px"; }
  }
}

// Fermer drawer sur Escape
document.addEventListener("keydown",function(e){ if(e.key==="Escape") closeMobileDrawer(); });
window.addEventListener("resize",function(){
  var drawer=ge("mobile-drawer");
  if(drawer && drawer.style.left!=="0px") drawer.style.left=mobileDrawerClosedLeft(drawer);
});

function _editsBackdropWarning(){
  // Flash la modale pour indiquer qu'on ne peut pas fermer comme ça
  var modal=document.querySelector("#m-edits .modal");
  if(!modal) return;
  modal.style.transition="transform .08s ease,box-shadow .08s ease";
  modal.style.transform="scale(1.012)";
  modal.style.boxShadow="0 0 0 2px var(--glacier)";
  setTimeout(function(){
    modal.style.transform="";
    modal.style.boxShadow="";
    setTimeout(function(){ modal.style.transition=""; },100);
  },120);
  // Message discret en bas de la modale
  var hint=document.querySelector("#m-edits-hint");
  if(!hint){
    hint=document.createElement("div");
    hint.id="m-edits-hint";
    hint.style.cssText="position:absolute;bottom:12px;left:50%;transform:translateX(-50%);font-family:'Cinzel',serif;font-size:8px;letter-spacing:2px;color:var(--glacier);opacity:0;transition:opacity .2s;white-space:nowrap;";
    hint.textContent="SAUVEGARDER OU ✕ POUR FERMER";
    var modal2=document.querySelector("#m-edits .modal");
    if(modal2){ modal2.style.position="relative"; modal2.appendChild(hint); }
  }
  hint.style.opacity="1";
  clearTimeout(hint._t);
  hint._t=setTimeout(function(){ hint.style.opacity="0"; },2000);
}


function exportFichePDF(){
  if(!CU||!CU.pid){ notif("Aucun personnage lié.","err"); return; }
  var p=gpid(CU.pid); if(!p){ notif("Personnage introuvable.","err"); return; }
  notif("Génération du PDF…","inf");

  // Charger jsPDF dynamiquement
  if(window.jspdf&&window.jspdf.jsPDF){
    _buildPDF(p);
  } else {
    var s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    s.onerror=function(){ notif("Impossible de charger jsPDF.","err"); };
    document.head.appendChild(s);
  }
}

function _buildPDF(p){
  var jsPDF=window.jspdf.jsPDF;
  var doc=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
  var W=210, H=297;
  var BG="#09090f", GLACIER="#7eb8d4", GOLD="#c9a84c", DIM="#a0a4c0", FAINT="#585878";
  var WHITE="#e8eaf8", RED="#c94a4a", GREEN="#6db88a", PURPLE="#c084d4";

  // === FOND ===
  doc.setFillColor(BG);
  doc.rect(0,0,W,H,"F");

  // === BARRE GAUCHE colorée ===
  var sermentColor=_sermColor(p.classe);
  doc.setFillColor(sermentColor);
  doc.rect(0,0,3,H,"F");

  // === EN-TÊTE ===
  // Bandeau titre
  doc.setFillColor(13,13,24); // #0d0d18
  doc.rect(0,0,W,38,"F");
  doc.setFillColor(sermentColor);
  doc.rect(0,38,W,0.5,"F");

  // Logo ☁️ stylisé
  doc.setFontSize(7);
  doc.setTextColor(FAINT);
  doc.setFont("helvetica","bold");
  doc.text("NUAGES POLAIRES",14,10);

  // Nom du personnage
  doc.setFontSize(22);
  doc.setTextColor(WHITE);
  doc.setFont("helvetica","bold");
  doc.text(p.name||"Inconnu",14,24,{maxWidth:130});

  // Serment + niveau
  doc.setFontSize(9);
  doc.setTextColor(sermentColor);
  doc.setFont("helvetica","normal");
  doc.text((p.classe||"").toUpperCase()+"  ·  NIV. "+(p.level||1)+"  ·  SERMENT NIV. "+(p.sLevel||1),14,32);

  // === STATS PRINCIPALES (PV / EP / EM) ===
  var statsY=46;
  [
    {label:"PV",cur:p.pvCur||p.pvMax,max:p.pvMax,col:GREEN},
    {label:"EP",cur:p.epCur||p.epMax,max:p.epMax,col:GOLD},
    {label:"EM",cur:p.emCur||p.emMax,max:p.emMax,col:GLACIER},
  ].forEach(function(st,i){
    var x=14+i*62;
    // Fond stat
    doc.setFillColor(17,17,32);
    doc.rect(x,statsY,56,22,"F");
    doc.setDrawColor(st.col);
    doc.setLineWidth(0.4);
    doc.rect(x,statsY,56,22,"S");
    // Label
    doc.setFontSize(7);
    doc.setTextColor(st.col);
    doc.setFont("helvetica","bold");
    doc.text(st.label,x+4,statsY+6);
    // Valeur
    doc.setFontSize(16);
    doc.setTextColor(WHITE);
    doc.text(String(st.cur),x+4,statsY+16);
    doc.setFontSize(9);
    doc.setTextColor(DIM);
    doc.text("/"+String(st.max),x+4+doc.getTextWidth(String(st.cur))+2,statsY+16);
    // Barre de progression
    var barY=statsY+20, barW=50, barH=1.5;
    doc.setFillColor(30,30,48);
    doc.rect(x+3,barY,barW,barH,"F");
    var pct=st.max>0?Math.min(1,(st.cur||0)/st.max):0;
    doc.setFillColor(st.col);
    doc.rect(x+3,barY,barW*pct,barH,"F");
  });

  // === SÉPARATEUR ===
  var sepY=statsY+28;
  doc.setDrawColor(FAINT);
  doc.setLineWidth(0.2);
  doc.line(14,sepY,W-14,sepY);

  // === BRANCHE & PALIER ===
  var branchY=sepY+8;
  var sermBundle=getPlayerSermentBundle(p);
  var br=sermBundle.branch||{};
  var palier=br.paliers?br.paliers.filter(function(pl){return pl.niv<=(p.sLevel||1);}).pop():null;

  doc.setFillColor(17,17,32);
  doc.rect(14,branchY,W-28,24,"F");
  doc.setDrawColor(GLACIER);
  doc.setLineWidth(0.3);
  doc.rect(14,branchY,W-28,24,"S");
  doc.setFillColor(GLACIER);
  doc.rect(14,branchY,3,24,"F");

  doc.setFontSize(7);
  doc.setTextColor(GLACIER);
  doc.setFont("helvetica","bold");
  doc.text("BRANCHE",20,branchY+6);
  doc.setFontSize(11);
  doc.setTextColor(WHITE);
  doc.text((br.nom||p.branch||"Aucune").replace(/^Branche [AB] — /,""),20,branchY+14);
  if(palier){
    doc.setFontSize(8);
    doc.setTextColor(DIM);
    doc.text("Capacité active : "+palier.nom+" — "+palier.cout,20,branchY+21);
  }

  // Palier côté droit
  doc.setFontSize(7);
  doc.setTextColor(GOLD);
  doc.setFont("helvetica","normal");
  doc.text("PALIER "+_palierNum(p.sLevel||1),W-30,branchY+10,{align:"right"});
  doc.setFontSize(9);
  doc.setTextColor(GOLD);
  doc.text(_palierLabel(p.sLevel||1),W-18,branchY+18,{align:"right"});

  // === XP SERMENT ===
  var xpY=branchY+30;
  doc.setFontSize(8);
  doc.setTextColor(DIM);
  doc.text("XP Serment",14,xpY);
  doc.setTextColor(WHITE);
  doc.text((p.sXp||0)+" / "+(p.sXpMax||100)+" XP",W-14,xpY,{align:"right"});
  var xpBarY=xpY+3, xpBarW=W-28;
  doc.setFillColor(30,30,48);
  doc.rect(14,xpBarY,xpBarW,2,"F");
  var xpPct=p.sXpMax>0?Math.min(1,(p.sXp||0)/p.sXpMax):0;
  doc.setFillColor(GOLD);
  doc.rect(14,xpBarY,xpBarW*xpPct,2,"F");

  // === XP PERSO ===
  var xp2Y=xpY+10;
  doc.setFontSize(8);
  doc.setTextColor(DIM);
  doc.text("XP Personnage",14,xp2Y);
  doc.setTextColor(WHITE);
  doc.text((p.xp||0)+" / "+(p.xpMax||100)+" XP  ·  Niveau "+(p.level||1),W-14,xp2Y,{align:"right"});
  doc.setFillColor(30,30,48);
  doc.rect(14,xp2Y+3,xpBarW,2,"F");
  var xp2Pct=p.xpMax>0?Math.min(1,(p.xp||0)/p.xpMax):0;
  doc.setFillColor(sermentColor);
  doc.rect(14,xp2Y+3,xpBarW*xp2Pct,2,"F");

  // === SÉPARATEUR ===
  var sep2Y=xp2Y+10;
  doc.setDrawColor(FAINT);
  doc.setLineWidth(0.2);
  doc.line(14,sep2Y,W-14,sep2Y);

  // === INVENTAIRE ===
  var invY=sep2Y+8;
  doc.setFontSize(8);
  doc.setTextColor(GLACIER);
  doc.setFont("helvetica","bold");
  doc.text("INVENTAIRE",14,invY);
  doc.setDrawColor(GLACIER);
  doc.setLineWidth(0.3);
  doc.line(14,invY+2,50,invY+2);

  var inv=(p.inventory||[]);
  if(!inv.length){
    doc.setFontSize(8);
    doc.setTextColor(FAINT);
    doc.setFont("helvetica","normal");
    doc.text("Aucun item.",14,invY+10);
    invY+=10;
  } else {
    var col1=[], col2=[];
    inv.forEach(function(item,i){ if(i%2===0) col1.push(item); else col2.push(item); });
    var rowH=8, curY=invY+7;
    var maxRows=Math.min(col1.length,12);
    for(var i=0;i<maxRows;i++){
      _drawItem(doc,col1[i],14,curY,WHITE,DIM,FAINT,sermentColor);
      if(col2[i]) _drawItem(doc,col2[i],110,curY,WHITE,DIM,FAINT,sermentColor);
      curY+=rowH;
    }
    if(inv.length>24){
      doc.setFontSize(7);
      doc.setTextColor(FAINT);
      doc.text("... et "+(inv.length-24)+" autres items",14,curY+2);
    }
    invY=curY;
  }

  // === GEMMES ===
  var gems=(p.inventory||[]).filter(function(i){return i.category==="Gemme";});
  if(gems.length){
    var gemY=invY+10;
    doc.setFontSize(8);
    doc.setTextColor(GLACIER);
    doc.setFont("helvetica","bold");
    doc.text("GEMMES DE SANG",14,gemY);
    doc.setDrawColor(GLACIER);
    doc.line(14,gemY+2,66,gemY+2);
    var wb=gems.filter(function(i){return i.name.indexOf("Blanche")>-1;}).reduce(function(a,i){return a+(i.qty||1);},0);
    var ib=gems.filter(function(i){return i.name.indexOf("Incarnate")>-1;}).reduce(function(a,i){return a+(i.qty||1);},0);
    var eb=gems.filter(function(i){return i.name.indexOf("carlate")>-1;}).reduce(function(a,i){return a+(i.qty||1);},0);
    doc.setFontSize(9);
    doc.setFont("helvetica","normal");
    var gx=14, gy=gemY+9;
    if(wb){ doc.setTextColor(WHITE); doc.text("Blanche x"+wb,gx,gy); gx+=35; }
    if(ib){ doc.setTextColor(PURPLE); doc.text("Incarnate x"+ib,gx,gy); gx+=42; }
    if(eb){ doc.setTextColor(RED); doc.text("Ecarlate x"+eb,gx,gy); }
    invY=gemY+14;
  }

  // === HISTORIQUE RÉCENT ===
  var histItems=(p.history||[]).slice().reverse().slice(0,6);
  if(histItems.length){
    var histY=invY+10;
    // Vérifier qu'on a assez de place
    if(histY+histItems.length*8+20>H-20){
      doc.addPage();
      doc.setFillColor(BG);
      doc.rect(0,0,W,H,"F");
      doc.setFillColor(sermentColor);
      doc.rect(0,0,3,H,"F");
      histY=20;
    }
    doc.setFontSize(8);
    doc.setTextColor(GLACIER);
    doc.setFont("helvetica","bold");
    doc.text("HISTORIQUE RÉCENT",14,histY);
    doc.setDrawColor(GLACIER);
    doc.line(14,histY+2,74,histY+2);
    histItems.forEach(function(h,i){
      var hy=histY+9+i*8;
      var hcol={add:GREEN,remove:RED,combat:RED,gemme:PURPLE}[h.type]||DIM;
      doc.setFillColor(hcol);
      doc.circle(17,hy-1.5,1,"F");
      doc.setFontSize(7.5);
      doc.setTextColor(WHITE);
      doc.setFont("helvetica","normal");
      var txt=(h.text||"").substring(0,70);
      doc.text(txt,20,hy,{maxWidth:W-40});
      doc.setFontSize(6.5);
      doc.setTextColor(FAINT);
      var d=h.ts?new Date(h.ts).toLocaleDateString("fr-FR"):"";
      doc.text(d,W-14,hy,{align:"right"});
    });
  }

  // === PIED DE PAGE ===
  doc.setFillColor(13,13,24);
  doc.rect(0,H-12,W,12,"F");
  doc.setDrawColor(sermentColor);
  doc.setLineWidth(0.3);
  doc.line(0,H-12,W,H-12);
  doc.setFontSize(7);
  doc.setTextColor(FAINT);
  doc.setFont("helvetica","normal");
  doc.text("Nuages Polaires — Document Officiel",14,H-5);
  doc.text(new Date().toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"}),W-14,H-5,{align:"right"});

  doc.save("Fiche_"+(p.name||"personnage").replace(/\s+/g,"_")+".pdf");
  notif("Fiche de "+esc(p.name)+" exportée.","ok");
}

function _drawItem(doc,item,x,y,WHITE,DIM,FAINT,accentCol){
  if(!item) return;
  doc.setFillColor(17,17,32);
  doc.rect(x,y-5,85,7,"F");
  doc.setFontSize(7.5);
  doc.setTextColor(WHITE);
  doc.setFont("helvetica","bold");
  var nom=(item.name||"").substring(0,28);
  doc.text(nom,x+3,y-0.5);
  doc.setFontSize(7);
  doc.setTextColor(DIM);
  doc.setFont("helvetica","normal");
  if(item.qty>1) doc.text("x"+item.qty,x+3+doc.getTextWidth(nom)+3,y-0.5);
  if(item.category){
    doc.setTextColor(FAINT);
    doc.text(item.category,x+75,y-0.5,{align:"right"});
  }
}

function _sermColor(classe){
  var cols={
    "Duelliste":"#7eb8d4","Sauvageon":"#c94a4a","Croisé":"#c9a84c",
    "Rôdeur":"#6db88a","Traqueur":"#c084d4","Flécheur":"#7eb8d4",
    "Élémentaliste":"#c9a84c","Évocateur":"#c084d4","Conjurateur":"#6db88a","Arcaniste":"#a8d4f0"
  };
  return cols[classe]||"#7eb8d4";
}

function _palierNum(sLevel){
  if(sLevel>=10) return "IV";
  if(sLevel>=7)  return "III";
  if(sLevel>=5)  return "II";
  return "I";
}

function _palierLabel(sLevel){
  if(sLevel>=10) return "Plénitude";
  if(sLevel>=7)  return "Maîtrise";
  if(sLevel>=5)  return "Densité";
  return "Éveil";
}




// ═══════════════════════════════════════════════════════════════
// V18 — Premium polish final pass
// ═══════════════════════════════════════════════════════════════
var APP_BUILD="np_v18";
(function(){
  try{
    var prev=localStorage.getItem("np_app_build");
    if(prev!==APP_BUILD){
      localStorage.setItem("np_app_build", APP_BUILD);
      ["np_runtime_guard","np_cmdk_recent"].forEach(function(k){ try{ localStorage.removeItem(k); }catch(e){} });
      var t=localStorage.getItem("np_theme");
      var themeMap={violet:"theme-violet",red:"theme-red",green:"theme-green",easter:"theme-easter",halloween:"theme-halloween",noel:"theme-noel",bloodmoon:"theme-bloodmoon",aquaris:"theme-aquaris"};
      if(themeMap[t]) localStorage.setItem("np_theme", themeMap[t]);
    }
  }catch(e){}
})();

var _runtimeGuardTimer=null;
function _runtimeEscapeHtml(s){
  return String(s==null?"":s)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/\"/g,"&quot;")
    .replace(/'/g,"&#39;");
}
function _runtimeErrorText(input){
  try{
    if(input==null) return "";
    if(typeof input === "string") return input;
    if(input && input.message) return String(input.message);
    return String(input);
  }catch(_){ return ""; }
}
function _runtimeViewLabel(id){
  var map={
    "accueil":"Accueil",
    "synopsis":"Synopsis",
    "serments":"Serments",
    "bestiaire":"Bestiaire",
    "evenements":"Événements",
    "reglement":"Règlement",
    "profil":"Profil",
    "fiche":"Fiche",
    "joueurs":"Joueurs",
    "combat":"Combat",
    "combat-mj":"Simulation",
    "apparitions":"Apparitions",
    "stats":"Statistiques",
    "database":"Base de données",
    "s-home":"Accueil public",
    "s-login":"Connexion",
    "s-hrp":"Rejoindre l'aventure"
  };
  return map[id] || (id ? String(id) : "cette vue");
}
function _resolveRuntimeIssue(opts){
  opts=opts||{};
  var viewId=String(opts.viewId||"");
  var viewLabel=_runtimeViewLabel(viewId);
  var raw=_runtimeErrorText(opts.detail!=null ? opts.detail : opts.err);
  var msg=_runtimeErrorText(opts.msg);
  var ctx=_runtimeErrorText(opts.context);
  var low=(msg+" "+raw+" "+ctx+" "+viewId).toLowerCase();
  var info={
    code:"500",
    shortLabel:"Erreur 500",
    title:"Incident interne",
    summary:"Le module a rencontré une erreur interne pendant le chargement.",
    hint:"Tu peux relancer la vue. Si le problème revient, cette page a besoin d'un correctif.",
    toast:"Erreur 500 — incident interne pendant le chargement.",
    detail:raw,
    viewLabel:viewLabel
  };
  if(viewId && !ge(viewId)){
    info.code="404";
    info.shortLabel="Erreur 404";
    info.title="Panneau introuvable";
    info.summary="La vue demandée n'existe pas ou n'est plus disponible dans l'interface.";
    info.hint="Le lien vers ce panneau est cassé ou le module n'a pas été chargé.";
    info.toast="Erreur 404 — panneau introuvable.";
    return info;
  }
  if(/\b404\b|not found|introuvable|missing( element| view| panel)?|unknown view/.test(low)){
    info.code="404";
    info.shortLabel="Erreur 404";
    info.title="Panneau introuvable";
    info.summary="La vue demandée n'a pas pu être trouvée.";
    info.hint="Le contenu ciblé n'existe plus, n'a pas été injecté, ou le lien est cassé.";
    info.toast="Erreur 404 — contenu ou panneau introuvable.";
  }else if(/\b403\b|forbidden|unauthorized|denied|interdit|non autoris/.test(low)){
    info.code="403";
    info.shortLabel="Erreur 403";
    info.title="Accès refusé";
    info.summary="Cette action a été bloquée par les droits de l'interface.";
    info.hint="Le compte actuel n'a probablement pas accès à ce module.";
    info.toast="Erreur 403 — accès refusé sur ce panneau.";
  }else if(/timed out|timeout|\b408\b|aborterror/.test(low)){
    info.code="408";
    info.shortLabel="Erreur 408";
    info.title="Temps d'attente dépassé";
    info.summary="La réponse a mis trop de temps à revenir.";
    info.hint="Relance la vue. Si cela revient souvent, il y a un souci de perf ou de réseau.";
    info.toast="Erreur 408 — la vue a expiré avant de répondre.";
  }else if(/failed to fetch|networkerror|network request failed|load failed|\b502\b|\b503\b|\b504\b/.test(low)){
    info.code="503";
    info.shortLabel="Erreur 503";
    info.title="Service indisponible";
    info.summary="Une ressource nécessaire n'a pas pu être récupérée.";
    info.hint="Le front a tenté de charger des données ou un service qui n'a pas répondu.";
    info.toast="Erreur 503 — service ou ressource indisponible.";
  }else if(/err_invalid_url|invalid[_ -]?url|failed to load resource|data:image|unsupported image|malformed/.test(low)){
    info.code="415";
    info.shortLabel="Erreur 415";
    info.title="Média ou URL invalide";
    info.summary="Une image ou une ressource possède une URL invalide ou un format mal formé.";
    info.hint="Vérifie l'image liée à cette vue ou remplace la ressource abîmée.";
    info.toast="Erreur 415 — image ou URL invalide dans cette vue.";
  }else if(/quotaexceeded|localstorage|indexeddb|storage/.test(low)){
    info.code="507";
    info.shortLabel="Erreur 507";
    info.title="Stockage saturé";
    info.summary="Le navigateur n'a pas pu écrire ou relire certaines données locales.";
    info.hint="Vide le cache du site ou supprime les brouillons/images locales trop lourdes.";
    info.toast="Erreur 507 — stockage local saturé ou inaccessible.";
  }else if(/maximum call stack|rangeerror/.test(low)){
    info.code="500";
    info.shortLabel="Erreur 500";
    info.title="Boucle interne détectée";
    info.summary="Le module est entré dans une boucle de rendu ou de rappel.";
    info.hint="Il faut corriger une récursion ou un wrapping qui se rappelle lui-même.";
    info.toast="Erreur 500 — boucle interne détectée.";
  }else if(/referenceerror|is not defined/.test(low)){
    info.code="500";
    info.shortLabel="Erreur 500";
    info.title="Variable ou fonction manquante";
    info.summary="Le code a tenté d'utiliser un élément JavaScript qui n'existe pas.";
    info.hint="Il manque une fonction, une constante ou un module chargé trop tard.";
    info.toast="Erreur 500 — variable ou fonction manquante.";
  }else if(/typeerror|cannot read properties|undefined is not a function/.test(low)){
    info.code="500";
    info.shortLabel="Erreur 500";
    info.title="Donnée ou composant incomplet";
    info.summary="Le code a reçu une valeur invalide ou un élément absent au mauvais moment.";
    info.hint="Il faut sécuriser la donnée ou vérifier qu'un bloc existe avant de le lire.";
    info.toast="Erreur 500 — donnée ou composant incomplet.";
  }else if(/syntaxerror|unexpected token|invalid or unexpected token/.test(low)){
    info.code="500";
    info.shortLabel="Erreur 500";
    info.title="Script invalide";
    info.summary="Un fichier JavaScript n'a pas pu être interprété correctement.";
    info.hint="Le correctif déployé contient probablement une erreur de syntaxe.";
    info.toast="Erreur 500 — script invalide ou incomplet.";
  }
  return info;
}
function closeRuntimeGuard(){
  var box=ge("runtime-guard");
  if(box) box.classList.remove("show");
  if(_runtimeGuardTimer){ clearTimeout(_runtimeGuardTimer); _runtimeGuardTimer=null; }
}
function _runtimeDiagnosticsMode(){
  try{
    var params=new URLSearchParams(location.search||"");
    if(params.get("diag")==="1"||params.get("debug")==="1"||params.get("runtime")==="1") return true;
    if(localStorage.getItem("np_runtime_visible")==="1") return true;
    if(localStorage.getItem("np_diag_visible")==="1") return true;
  }catch(_){}
  return false;
}
function _recordRuntimeIssue(info, msg, detail, opts){
  try{
    window.__npRuntimeIssues=window.__npRuntimeIssues||[];
    window.__npRuntimeIssues.unshift({
      at:new Date().toISOString(),
      code:info&&info.code,
      title:info&&info.title,
      message:String(msg||""),
      detail:String(detail||""),
      context:opts&&opts.context||"",
      viewId:opts&&opts.viewId||""
    });
    if(window.__npRuntimeIssues.length>40) window.__npRuntimeIssues.length=40;
  }catch(_){}
}
function reportRuntimeIssue(msg, detail, opts){
  opts=opts||{};
  var info=_resolveRuntimeIssue(Object.assign({}, opts||{}, {msg:msg, detail:detail}));
  var low=(String(msg||"")+" "+String(detail||"")).toLowerCase();
  if(low.indexOf("chrome-extension://")>=0) return;
  if(low.indexOf("imgur")>=0 && low.indexOf("content security policy")>=0) return;
  _recordRuntimeIssue(info, msg, detail, opts);
  if(!opts.force && !_runtimeDiagnosticsMode()){
    try{ console.warn("[runtime guarded]", info.shortLabel+" · "+info.title, {message:msg, detail:detail, context:opts.context||"", viewId:opts.viewId||""}); }catch(_){}
    return;
  }
  var box=ge("runtime-guard"), body=ge("runtime-guard-msg"), title=ge("runtime-guard-title") || (box ? box.querySelector('.runtime-guard-title') : null);
  if(!box||!body) return;
  if(title) title.textContent=info.shortLabel+" · "+info.title;
  body.textContent=(msg && /^Erreur \d{3}/.test(String(msg))) ? String(msg) : info.toast + (info.viewLabel && info.viewLabel!=="cette vue" ? " — " + info.viewLabel : "");
  box.classList.add("show");
  if(_runtimeGuardTimer) clearTimeout(_runtimeGuardTimer);
  _runtimeGuardTimer=setTimeout(closeRuntimeGuard, 6200);
}
function retryCurrentView(){
  closeRuntimeGuard();
  try{
    if(CU){
      switchTab(_navCurrent||"accueil", null, true);
    }else{
      showScreen("s-home");
      try{ initHomePage(); }catch(e){}
    }
  }catch(err){
    try{ location.reload(); }catch(e){}
  }
}
function showRuntimeFallback(id, err){
  var info=_resolveRuntimeIssue({viewId:id, err:err, context:"switchTab"});
  var el=ge(id)||ge("accueil");
  if(!el) return;
  el.classList.add("active");
  el.style.display="";
  el.innerHTML=''
    +'<div class="runtime-fallback">'
    +'<div class="rf-kicker">'+_runtimeEscapeHtml(info.shortLabel)+'</div>'
    +'<div class="rf-title">'+_runtimeEscapeHtml(info.title)+'</div>'
    +'<div class="rf-text">'+_runtimeEscapeHtml(info.summary)+'</div>'
    +'<div class="rf-hint">'+_runtimeEscapeHtml(info.hint)+'</div>'
    +(info.detail ? '<details class="rf-more"><summary>Détail technique</summary><div class="rf-cause">'+_runtimeEscapeHtml(info.detail)+'</div></details>' : '')
    +'<div class="rf-actions">'
    +'<button class="btn btn-sm" onclick="retryCurrentView()"><span>Relancer</span></button>'
    +'<button class="btn btn-sm" onclick="switchTab(\'accueil\',null,true)"><span>Retour accueil</span></button>'
    +'</div>'
    +'</div>';
  reportRuntimeIssue(info.shortLabel+" — "+info.title, info.detail||err, {viewId:id, context:"switchTab"});
}
window.describeRuntimeError=_resolveRuntimeIssue;
(function(){
  var _rawSwitchTab=switchTab;
  window.switchTab=function(id, btn, _isBack){
    try{
      var res=_rawSwitchTab(id, btn, _isBack);
      setTimeout(decorateActiveView, 30);
      return res;
    }catch(err){
      console.error("switchTab failed", id, err);
      showRuntimeFallback(id, err);
    }
  };
})();
window.addEventListener("error", function(e){
  var src=String((e&&e.filename)||"");
  var msg=String((e&&e.message)||"");
  if(src.indexOf("chrome-extension://")===0) return;
  if(msg.toLowerCase().indexOf("imgur")>=0 && msg.toLowerCase().indexOf("content security policy")>=0) return;
  reportRuntimeIssue("Une erreur a été interceptée. La session continue, mais il vaut mieux relancer la vue active.", msg);
});
window.addEventListener("unhandledrejection", function(e){
  var reason=(e&&e.reason)||"";
  var msg=String(reason&&reason.message ? reason.message : reason || "");
  if(msg.toLowerCase().indexOf("imgur")>=0 && msg.toLowerCase().indexOf("content security policy")>=0) return;
  reportRuntimeIssue("Une réponse asynchrone a échoué. La vue peut être relancée sans reconnecter le compte.", msg);
});

function getCommandItems(){
  var items=[];
  function push(id,title,sub,fn,key){ items.push({id:id,title:title,sub:sub,run:fn,key:key||""}); }
  if(!CU){
    push("home-public","Accueil public","Retour à la landing page",function(){ showScreen("s-home"); try{ initHomePage(); }catch(e){}; },"H");
    push("login-public","Espace joueur","Ouvrir la connexion",function(){ showScreen("s-login"); },"L");
    push("register-public","Rejoindre l’aventure","Parcourir l’entrée HRP",function(){ showScreen("s-hrp"); },"R");
    return items;
  }
  push("accueil","Accueil","Tableau d’ensemble du compagnon",function(){ switchTab("accueil",null); },"A");
  push("synopsis","Synopsis","Univers et contexte",function(){ switchTab("synopsis",null); },"S");
  push("serments","Serments","Explorer les serments",function(){ switchTab("serments",null); },"S");
  push("bestiaire","Bestiaire","Voir les créatures",function(){ switchTab("bestiaire",null); },"B");
  push("evenements","Événements","Suivre les événements",function(){ switchTab("evenements",null); },"E");
  push("reglement","Règlement","Consulter le cadre HRP",function(){ switchTab("reglement",null); },"R");
  if(CU) push("profil","Paramètres","Compte, collection et apparence",function(){ switchTab("profil",null); },"P");
  if(CU&&CU.pid) push("fiche","Ma fiche","Ouvrir la fiche du personnage",function(){ switchTab("fiche",null); },"F");
  var role=String((CU&&CU.role)||"").toLowerCase();
  if(["admin","mj","designer"].indexOf(role)>=0){
    push("joueurs","Joueurs","Annuaire et comptes liés",function(){ switchTab("joueurs",null); },"J");
    push("combat-mj","Simulation","Outils de combat",function(){ switchTab("combat-mj",null); },"C");
  }
  if(role==="admin"){
    push("stats","Tableau de bord","Vue d’ensemble admin",function(){ switchTab("stats",null); },"T");
    push("database","Database","Données et logs",function(){ switchTab("database",null); },"DB");
    if(isAdminRole(CU)) push("audit","Journal sécurité","Logs d'authentification et actions sensibles",function(){ switchTab("database",null); openAuditLogAdmin(); },"SEC");
  }
  return items;
}
var _cmdkIndex=0;
function openCommandPalette(){
  var root=ge("cmdk"), input=ge("cmdk-input");
  if(!root||!input) return;
  document.body.classList.add("cmdk-open");
  root.removeAttribute("hidden");
  root.classList.add("open");
  root.setAttribute("aria-hidden","false");
  input.value="";
  _cmdkIndex=0;
  renderCommandPalette("");
  setTimeout(function(){ try{ input.focus(); input.select(); }catch(e){} }, 30);
}
function closeCommandPalette(){
  var root=ge("cmdk"); if(!root) return;
  root.classList.remove("open");
  root.setAttribute("aria-hidden","true");
  root.setAttribute("hidden","");
  document.body.classList.remove("cmdk-open");
}
function renderCommandPalette(query){
  var list=ge("cmdk-list");
  if(!list) return;
  var q=String(query||"").trim().toLowerCase();
  var items=getCommandItems().filter(function(it){
    return !q || (it.title+" "+it.sub+" "+it.id).toLowerCase().indexOf(q)>=0;
  });
  if(!items.length){
    list.innerHTML='<div class="cmdk-empty"><strong>Aucun résultat</strong>Essaie un autre mot-clé ou ouvre directement une zone depuis la navigation.</div>';
    return;
  }
  if(_cmdkIndex>=items.length) _cmdkIndex=items.length-1;
  list.innerHTML=items.map(function(it,idx){
    return '<button type="button" class="cmdk-item'+(idx===_cmdkIndex?' active':'')+'" data-cmdk-index="'+idx+'" onclick="runCommandPaletteAction('+idx+')">'
      +'<span class="cmdk-item-main"><span class="cmdk-item-title">'+esc(it.title)+'</span><span class="cmdk-item-sub">'+esc(it.sub)+'</span></span>'
      +(it.key?'<span class="cmdk-item-key">'+esc(it.key)+'</span>':'')
      +'</button>';
  }).join("");
}
function runCommandPaletteAction(idx){
  var q=(ge("cmdk-input")||{}).value||"";
  var items=getCommandItems().filter(function(it){
    return !q || (it.title+" "+it.sub+" "+it.id).toLowerCase().indexOf(String(q).trim().toLowerCase())>=0;
  });
  var it=items[idx];
  if(!it) return;
  closeCommandPalette();
  try{ it.run(); }catch(err){ reportRuntimeIssue("La navigation rapide a rencontré une erreur.", err&&err.message?err.message:err); }
}
function decorateActiveView(){
  var root=document.querySelector('.tab-content.active, .screen.active');
  if(!root) return;
  var nodes=root.querySelectorAll('.card,.staff-panel,.bcrd,.ev-card,.prog-panel,.login-card,.branch-choice,.home-counter,.home-footer-item');
  Array.prototype.slice.call(nodes,0,28).forEach(function(el,idx){
    el.removeAttribute('data-premium-reveal');
    el.style.animationDelay='';
    requestAnimationFrame(function(){
      el.setAttribute('data-premium-reveal','1');
      el.style.animationDelay=(idx*22)+'ms';
    });
  });
}
document.addEventListener("keydown", function(e){
  var tag=(document.activeElement||{}).tagName||"";
  var inInput=tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT"||(document.activeElement&&document.activeElement.isContentEditable);
  var paletteOpen=ge("cmdk")&&ge("cmdk").classList.contains("open");
  if((e.ctrlKey||e.metaKey) && String(e.key).toLowerCase()==="k"){
    e.preventDefault();
    if(paletteOpen) closeCommandPalette(); else openCommandPalette();
    return;
  }
  if(!inInput && !paletteOpen && e.key==="/"){
    e.preventDefault();
    openCommandPalette();
    return;
  }
  if(!paletteOpen) return;
  if(e.key==="Escape"){
    e.preventDefault();
    closeCommandPalette();
    return;
  }
  var list=ge("cmdk-list");
  var count=list?list.querySelectorAll('.cmdk-item').length:0;
  if(!count) return;
  if(e.key==="ArrowDown"){
    e.preventDefault();
    _cmdkIndex=(_cmdkIndex+1)%count;
    renderCommandPalette((ge("cmdk-input")||{}).value||"");
    return;
  }
  if(e.key==="ArrowUp"){
    e.preventDefault();
    _cmdkIndex=(_cmdkIndex-1+count)%count;
    renderCommandPalette((ge("cmdk-input")||{}).value||"");
    return;
  }
  if(e.key==="Enter"){
    e.preventDefault();
    runCommandPaletteAction(_cmdkIndex);
  }
});
window.addEventListener('load', function(){ setTimeout(decorateActiveView, 80); });


window.__npStabilityPassV55 = true;
(function(){
  function _npErrText(err){
    try{
      if(!err) return 'Erreur inconnue';
      if(typeof err === 'string') return err;
      return err.message || String(err);
    }catch(_){ return 'Erreur inconnue'; }
  }
  window._safeRun = function(label, fn, fallback){
    try{
      return fn();
    }catch(err){
      console.error('[safeRun]', label, err);
      try{
        reportRuntimeIssue("Erreur 500 — incident sur « "+label+" ».", _npErrText(err), {context:label});
      }catch(_){}
      if(typeof fallback === 'function'){
        try{ return fallback(err); }catch(_){}
      }
      return null;
    }
  };
  window._safeRunAsync = async function(label, fn, fallback){
    try{
      return await fn();
    }catch(err){
      console.error('[safeRunAsync]', label, err);
      try{
        reportRuntimeIssue("Erreur 500 — incident sur « "+label+" ».", _npErrText(err), {context:label});
      }catch(_){}
      if(typeof fallback === 'function'){
        try{ return await fallback(err); }catch(_){}
      }
      return null;
    }
  };

  window.addEventListener('error', function(e){
    try{ console.error('[window.error]', e.error || e.message || e); }catch(_){}
  });
  window.addEventListener('unhandledrejection', function(e){
    try{ console.error('[unhandledrejection]', e.reason || e); }catch(_){}
  });

  var _oldShowScreen = typeof window.showScreen === 'function' ? window.showScreen : null;
  if(_oldShowScreen){
    window.showScreen = function(){
      var args = arguments;
      return _safeRun('showScreen', function(){ return _oldShowScreen.apply(window, args); });
    };
  }

  var _oldSwitchTab = typeof window.switchTab === 'function' ? window.switchTab : null;
  if(_oldSwitchTab){
    window.switchTab = function(){
      var args = arguments;
      return _safeRun('switchTab', function(){ return _oldSwitchTab.apply(window, args); }, function(){
        try{
          var fallback = document.getElementById('accueil') || document.getElementById('p-accueil-c') || document.getElementById('s-home');
          if(fallback && fallback.classList) fallback.classList.add('active');
        }catch(_){}
      });
    };
  }

  var _oldToggleNavDrop = typeof window.toggleNavDrop === 'function' ? window.toggleNavDrop : null;
  if(_oldToggleNavDrop){
    window.toggleNavDrop = function(){
      var args = arguments;
      return _safeRun('toggleNavDrop', function(){ return _oldToggleNavDrop.apply(window, args); });
    };
  }

  var _oldToggleSettingsPanel = typeof window.toggleSettingsPanel === 'function' ? window.toggleSettingsPanel : null;
  if(_oldToggleSettingsPanel){
    window.toggleSettingsPanel = function(){
      var args = arguments;
      return _safeRun('toggleSettingsPanel', function(){ return _oldToggleSettingsPanel.apply(window, args); });
    };
  }

  var _oldRenderView = typeof window.renderView === 'function' ? window.renderView : null;
  if(_oldRenderView){
    window.renderView = function(){
      var args = arguments;
      return _safeRun('renderView', function(){ return _oldRenderView.apply(window, args); }, function(err){
        try{
          if(typeof renderFicheState === 'function'){
            renderFicheState('Fiche indisponible', 'Une erreur a empêché le chargement de la fiche. Recharge la page ou réessaie dans un instant.');
          }
        }catch(_){}
      });
    };
  }

  var _oldRenderAccueil = typeof window.renderAccueil === 'function' ? window.renderAccueil : null;
  if(_oldRenderAccueil){
    window.renderAccueil = function(){
      var args = arguments;
      return _safeRun('renderAccueil', function(){ return _oldRenderAccueil.apply(window, args); });
    };
  }

  var _oldRenderCollection = typeof window.renderCollection === 'function' ? window.renderCollection : null;
  if(_oldRenderCollection){
    window.renderCollection = function(){
      var args = arguments;
      return _safeRun('renderCollection', function(){ return _oldRenderCollection.apply(window, args); });
    };
  }

  var _oldRenderDatabase = typeof window.renderDatabase === 'function' ? window.renderDatabase : null;
  if(_oldRenderDatabase){
    window.renderDatabase = function(){
      var args = arguments;
      return _safeRun('renderDatabase', function(){ return _oldRenderDatabase.apply(window, args); });
    };
  }

  var _oldRefreshPrivate = typeof window._refreshPrivateCaches === 'function' ? window._refreshPrivateCaches : null;
  if(_oldRefreshPrivate){
    window._refreshPrivateCaches = function(){
      var args = arguments;
      return _safeRunAsync('_refreshPrivateCaches', function(){ return _oldRefreshPrivate.apply(window, args); }, async function(){
        return (typeof _dbCache !== 'undefined' && _dbCache) ? _dbCache : {};
      });
    };
  }

  var _oldApplyTheme = typeof window.applyTheme === 'function' ? window.applyTheme : null;
  if(_oldApplyTheme){
    window.applyTheme = function(){
      var args = arguments;
      return _safeRun('applyTheme', function(){ return _oldApplyTheme.apply(window, args); });
    };
  }
})();
