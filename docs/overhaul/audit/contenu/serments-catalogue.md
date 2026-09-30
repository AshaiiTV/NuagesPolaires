# Serments — catalogue natif et textes de présentation (verbatim)

Sources :
- Données natives `SD` : `assets/js/main.js:213–485` (13 serments). Les serments personnalisés (`serments_custom`, `gsd()`, `main.js:1617`) sont fusionnés par `getAllSD()` (`main.js:1620`) et écrasent un natif de même nom.
- Page publique **Univers → Serments** : `renderAllSerments` (`main.js:6166`), `renderSermCard` (`main.js:6520`).
- Constantes : `WEAPON_ICONS` (`main.js:6078`), `STYLE_COLORS` (`main.js:6083`), `SERM_CATS` (`main.js:6091`), `SERM_LEVELS` (`main.js:6096`), `SERM_LEVEL_ALIASES` (`main.js:6105`).

## Forme JSON d'un serment natif

```json
{
  "Duelliste": {
    "arme": "Épée moyenne du serment",
    "pvN": 6, "epN": 6, "emN": 2, "dmg": 11, "type": "Tranchant",
    "sermLevel": "seasoned",      // absent = basic ; alias : base→basic, found/unique→singular, evolved/expert→emeritus, major/divine→transcended
    "hidden": true,               // true = hors vitrine publique (isSermVisibleInLibrary)
    "evolvesFrom": "Duelliste",   // lignée : « Évolution de <nom> »
    "lore": "…",
    "bA": { "nom": "Branche A — …", "style": "Brutalité", "descPhys": "…", "flavor": "…",
            "paliers": [ { "niv": 2, "nom": "…", "cout": "6 EM — 1 action", "desc": "…" }, … ] },
    "bB": { … }
  }
}
```
Un serment custom peut porter `branches: [ {nom, style, desc, paliers[]} ]` à la place de `bA/bB` (`getBranches`, `main.js:6617`) et `cat` (`melee|distance|magie|soutien`).

## Texte d'en-tête de la page Serments (`main.js:6172–6173`)

- Titre : **Rangs et progression des serments**
- Texte : « Les capacités se renforcent avec le niveau du personnage et son expérience commune. Les Serments du départ sont **Basiques**. Leur première évolution forme les **Aguerris**, actuellement gardés hors vitrine le temps d’être retravaillés. Plus loin, certains chemins deviennent **Émérites**, tandis que les voies **Singulières** peuvent tendre vers le **Transcendé** ou le **Corrompu**. »
- Filtres **Type** : `Tous` · `Mêlée` · `Distance` · `Magie` · `Soutien`
- Filtres **Rang** : `Toutes` · `Basique` · `Émérite` · `Singulier` · `Transcendé` · `Corrompu` (l'option `Aguerri` n'est volontairement pas proposée)

## Libellés de la carte serment (`renderSermCard`)
- Badge `Nouveau` pour un serment custom ; pilule de rang (`rank-<clé>`) ; lignée « *Évolution de* **<nom>** » ; catégorie ; aperçu du lore tronqué à 260 caractères (`getSermLorePreview`)
- Stats : `PV/niv` · `EP/niv` · `EM/niv` · `Dmg`
- Branche : `<summary>` nom + style ; `descPhys` ; `desc` ; bloc `Montée en puissance` — `N étape(s)` ; chips `<étiquette> · Niv. <niveaux>` où l'étiquette vient de `getPalierStageLabel` (`main.js:6158`) : index 0 → `Débloqué`, dernier → `Parachevé`, index 1 → `Renforcé`, index 2 → `Maîtrisé`, sinon `Palier N`
- Vide : « Aucune branche définie. »

## Rangs (`SERM_LEVELS`)
`basic:"Basique"`, `seasoned:"Aguerri"`, `emeritus:"Émérite"`, `singular:"Singulier"`, `transcended:"Transcendé"`, `corrupted:"Corrompu"`, `other:"Autre"`. Un serment custom sans `sermLevel` est `singular` ; un natif sans `sermLevel` est `basic` (`getSermLevelKey`, `main.js:6114`).

## Icônes et catégories
| Serment | Icône | Catégorie |
|---|---|---|
| Duelliste, Bretteur, Claymore, Lame d'Honneur | ⚔ | melee |
| Sauvageon | 🪓 | melee |
| Croisé | 🛡 | melee |
| Rôdeur | 🗡 | melee |
| Traqueur | 🏹 | melee |
| Flécheur | 🏹 | distance |
| Elementaliste | 👊 | melee |
| Evocateur | 🪄 | magie |
| Conjurateur | ⛓ | soutien |
| Arcaniste | 🔮 | magie |

Couleurs de style (`STYLE_COLORS`) : Brutalité→red, Fluidité→glacier, AOE→purple, Précision→purple, Offensif→red, Aggro→gold, Mêlée→red, Distance→glacier, Épuisement→purple, Contrôle→glacier, Concentration→gold, Soin→green, Tank→gold, Équilibre offensif→red, Équilibre d'accumulation→glacier, AOE Indéfendable→red, Précision Défendable→glacier.

---

# Les 13 serments natifs (verbatim)

## Duelliste — Épée moyenne du serment
`pvN:6, epN:6, emN:2, dmg:11, type:"Tranchant"` — Basique

**Lore :** Le Duelliste n'est pas appelé par la violence. Il est appelé par l'instant juste. Ce serment choisit les êtres capables de garder une ligne claire quand le combat devient confus, ceux qui savent que la victoire se joue parfois dans un demi-pas, une respiration retenue, un angle refusé. Son épée moyenne du serment ne cherche pas à impressionner : elle répond. Elle se place dans la main comme une décision ancienne, sobre, précise, presque familière. Le Duelliste est le combattant de la mesure et de l'exigence. Pas le plus brutal, pas le plus spectaculaire, mais celui qui transforme chaque mouvement en phrase nette. Face à lui, l'adversaire ne combat pas seulement une lame : il combat une lecture.

### Branche A — L'Élan Tranchant (style : Brutalité)
- descPhys : De loin, le sol crisse sous une impulsion brusque. Le corps s'élance, bas, rapide, et la lame arrive avec lui — avant même que l'adversaire ait compris ce qui s'est passé. De près : aucun élan. La lame s'enfonce plein centre, et dans le même geste, le porteur pousse — bras, épaule, poids du corps. L'adversaire part en arrière, les pieds quittent le sol une fraction de seconde.
- flavor : Cette branche donne au Duelliste son autorité la plus simple : décider de la distance. De loin, il transforme l'espace en accélération. De près, il transforme l'impact en recul forcé. L'adversaire ne choisit plus vraiment où se tient le combat ; il découvre seulement où le Duelliste l'a déplacé.
- Paliers (nom « Élan Tranchant », coût « 6 EM — 1 action ») :
  - Niv 2 : À distance : dash vers la cible + frappe 6+Niv. Au corps à corps : frappe 10+Niv + repousse l'adversaire à distance (les deux doivent utiliser une action de déplacement pour se rapprocher).
  - Niv 5 : À distance : 10+Niv. Au corps à corps : 14+Niv + repousse.
  - Niv 7 : À distance : 14+Niv. Au corps à corps : 18+Niv + repousse.
  - Niv 10 : À distance : 18+Niv. Au corps à corps : 22+Niv + repousse.

### Branche B — Taille Double (style : Fluidité)
- descPhys : La lame trace une première ligne, puis revient sans pause dans l'autre sens. Deux mouvements qui n'en font qu'un — fluides, enchaînés, comme écrits d'avance.
- flavor : Taille Double n'est pas une pluie de coups. C'est une phrase en deux syllabes. La première oblige la défense à se révéler, la seconde punit l'espace qu'elle vient d'ouvrir. Le Duelliste ne frappe pas plus vite pour faire joli : il coupe le temps de réaction adverse en deux.
- Paliers (nom « Taille Double », coût « 5 EM — 1 action ») :
  - Niv 2 : 2 frappes consécutives traitées individuellement. L'adversaire doit dépenser une défense séparée pour chacune. 5+Niv par frappe (total : 10+Niv×2).
  - Niv 5 : 8+Niv par frappe (total : 16+Niv×2).
  - Niv 7 : 11+Niv par frappe (total : 22+Niv×2).
  - Niv 10 : 14+Niv par frappe (total : 28+Niv×2).

## Bretteur — Épée fine du serment
`pvN:5, epN:7, emN:3, dmg:12, type:"Tranchant", sermLevel:"seasoned", hidden:true, evolvesFrom:"Duelliste"`

**Lore :** Le Bretteur est ce que devient le Duelliste quand la maîtrise cesse d'être droite et devient insaisissable. Il ne cherche plus seulement l'ouverture : il la fabrique. Sa lame fine du serment vit dans les appuis, les feintes, les micro-reculs, les gestes qui ressemblent à des erreurs jusqu'à ce qu'il soit trop tard. Le Bretteur impose un rythme nerveux, presque insolent. Il provoque une défense, la déplace d'un souffle, puis frappe exactement là où l'adversaire vient de se trahir. On ne le tient jamais tout à fait. On croit l'avoir lu, et c'est souvent à cet instant précis qu'il a déjà changé de phrase.

### Branche A — Feinte de Fer (style : Précision)
- descPhys : La lame part trop tôt, trop visible — presque volontairement. L'adversaire réagit, et c'est là que le vrai coup arrive, décalé d'un souffle, porté dans l'angle que la défense vient d'abandonner.
- flavor : Le Bretteur vend une erreur comme d'autres vendent une menace. Il donne à l'adversaire quelque chose à défendre, puis retire le sens du geste au dernier moment. La cible ne tombe pas dans un piège grossier ; elle tombe dans sa propre bonne réaction.
- Paliers (nom « Feinte de Fer », coût « 6 EM — 1 action ») :
  - Niv 10 : Frappe 8+Niv. Si la cible utilise une défense, elle dépense 2 EP supplémentaires. Si elle ne défend pas, la frappe gagne +4 dégâts.
  - Niv 13 : Frappe 12+Niv. Défense adverse : +3 EP dépensés. Sans défense : +6 dégâts.
  - Niv 16 : Frappe 16+Niv. Défense adverse : +4 EP dépensés. Sans défense : +8 dégâts.
  - Niv 20 : Frappe 20+Niv. Défense adverse : +5 EP dépensés. Sans défense : +10 dégâts.

### Branche B — Pas Rompu (style : Fluidité)
- descPhys : Le Bretteur pivote au dernier instant. Le corps se décale, la lame accompagne le mouvement, et l'attaque adverse glisse dans le vide pendant qu'une ligne nette apparaît en retour.
- flavor : Pas Rompu n'est pas une fuite. C'est une disparition minuscule. Le Bretteur laisse l'attaque passer à l'endroit où il était, puis revient dans l'angle mort avec la cruauté tranquille de quelqu'un qui avait prévu le coup avant son départ.
- Paliers (nom « Pas Rompu », coût « 5 EM — réaction ») :
  - Niv 10 : Lorsqu'une attaque ciblée est esquivée, le Bretteur peut riposter : 5+Niv dégâts. Utilisable 1 fois par tour.
  - Niv 13 : Riposte après esquive : 8+Niv dégâts. Le Bretteur peut aussi se replacer à distance courte.
  - Niv 16 : Riposte après esquive : 11+Niv dégâts. La prochaine attaque du Bretteur contre cette cible coûte -1 EP.
  - Niv 20 : Riposte après esquive : 14+Niv dégâts. Si la cible a raté son attaque, elle perd 1 action de déplacement ce tour.

## Claymore — Claymore du serment
`pvN:7, epN:4, emN:2, dmg:16, type:"Tranchant lourd", sermLevel:"seasoned", hidden:true, evolvesFrom:"Duelliste"`

**Lore :** Le Claymore naît quand un Duelliste renonce à la finesse comme unique réponse et choisit le poids. Ce serment ne récompense pas la vitesse : il récompense l'engagement total. Sa grande lame du serment impose une question simple à chaque adversaire : es-tu vraiment prêt à recevoir ça ? Le porteur avance peu, mais chaque pas change la géographie du combat. Il lève la lame comme on lève une menace, accepte d'être lisible, et transforme cette lisibilité en terreur. Le Claymore ne surprend pas par l'angle. Il prévient, puis frappe quand même. Sa force est là : l'adversaire voit venir le coup et doute malgré tout de pouvoir l'arrêter.

### Branche A — Posture Haute (style : Pression lourde)
- descPhys : Le porteur remonte l'espadon au-dessus de l'épaule. La garde paraît ouverte, presque provocante, mais la lame suspendue annonce un coup si lourd que l'adversaire doit décider avant même qu'il parte.
- flavor : Posture Haute fait de la préparation une arme. Le Claymore annonce le danger, garde la lame suspendue, et force l'adversaire à vivre une seconde entière sous la promesse de l'impact. Ce n'est pas discret. C'est pire : c'est inévitable.
- Paliers (nom « Posture Haute », coût « 6 EM — 1 action ») :
  - Niv 10 : Entre en posture jusqu'au prochain tour. La prochaine Frappe Haute coûte 10 EP, inflige 20+Niv dégâts et retire 12 EP si la cible bloque.
  - Niv 13 : Frappe Haute : 24+Niv dégâts, 10 EP. Si la cible bloque, elle perd 14 EP.
  - Niv 16 : Frappe Haute : 28+Niv dégâts, 10 EP. Si la cible bloque, elle perd 16 EP et ne peut pas se déplacer au prochain round.
  - Niv 20 : Frappe Haute : 32+Niv dégâts, 10 EP. Si la cible bloque, elle perd 20 EP. Sur défense réussie, la cible subit tout de même 25% des dégâts sous forme d'impact.

### Branche B — Fendre la Ligne (style : Brise-ligne)
- descPhys : L'espadon part en arc large, lent, plein. Ce n'est pas une coupe élégante : c'est une masse de métal qui traverse la garde, les appuis et la certitude de tenir bon.
- flavor : Fendre la Ligne n'est pas fait pour courir après les fuyards. C'est une réponse aux gardes, aux fronts, aux certitudes. Le Claymore frappe là où l'ennemi pensait tenir, jusqu'à ce que la position cesse d'être une protection et devienne un piège.
- Paliers (nom « Fendre la Ligne », coût « 7 EM — 1 action ») :
  - Niv 10 : Frappe 10+Niv dégâts. Brise-ligne : si la cible bloque, le coup traverse le blocage et ajoute en dégâts le bonus que le blocage aurait retiré. Si la cible a déjà défendu ce tour, elle dépense +3 EP pour défendre cette attaque.
  - Niv 13 : Frappe 14+Niv dégâts. Brise-ligne : si la cible bloque, le coup traverse le blocage et ajoute en dégâts le bonus que le blocage aurait retiré. Contre une cible en garde, parade ou protection, ajoute +4 dégâts.
  - Niv 16 : Frappe 18+Niv dégâts. Brise-ligne : si la cible bloque, le coup traverse le blocage et ajoute en dégâts le bonus que le blocage aurait retiré. Une défense réussie ne permet pas à la cible de se replacer gratuitement.
  - Niv 20 : Frappe 22+Niv dégâts. Brise-ligne : si la cible bloque, le coup traverse le blocage et ajoute en dégâts le bonus que le blocage aurait retiré. Si la cible défend, sa prochaine défense coûte +2 EP jusqu'à la fin du tour suivant.

## Lame d'Honneur — Épée claire du serment
`pvN:7, epN:5, emN:3, dmg:10, type:"Tranchant", sermLevel:"seasoned", hidden:true, evolvesFrom:"Duelliste"`

**Lore :** La Lame d'Honneur ne protège pas le monde entier. Elle choisit une cible et transforme ce choix en serment. Là où d'autres combattants dispersent leur attention, elle resserre le champ de bataille jusqu'à ce qu'il ne reste qu'un duel, une faute à punir, une promesse à tenir. Sa lame claire ne brille pas pour faire joli : elle désigne. Une fois le duel juré, la Lame d'Honneur devient terrifiante contre l'adversaire choisi et presque volontairement médiocre contre le reste. Ce n'est pas une faiblesse accidentelle, c'est le prix de sa foi. Elle gagne en puissance parce qu'elle accepte de n'avoir qu'une obsession.

### Branche A — Duel Juré (style : Duel)
- descPhys : La Lame d'Honneur pointe une cible. Le monde ne disparaît pas, mais tout semble se resserrer entre deux corps, deux souffles, deux volontés. Chaque pas hors de ce duel paraît plus lourd, presque moins légitime.
- flavor : Duel Juré ferme la porte. L'EM investi devient une mise à prix spirituelle : il ne revient pas simplement avec le temps, parce qu'il appartient désormais à la promesse. La Lame d'Honneur gagne le droit de frapper sa cible comme une sentence, mais tout ce qui n'est pas cette cible devient secondaire, presque indigne de sa lame.
- Paliers (nom « Duel Juré », coût « 5 EM — 1 action — EM non régénérable ») :
  - Niv 10 : Désigne une cible jusqu'à sa mort, la fin du combat ou rupture validée staff. Contre elle : +40% dégâts. Contre toute autre cible : -60% dégâts. Si la cible meurt, récupère jusqu'à 6 EP dépensés pendant ce duel.
  - Niv 13 : Contre la cible jurée : +55% dégâts. Contre les autres : -70% dégâts. Si la cible meurt, récupère jusqu'à 9 EP dépensés pendant ce duel.
  - Niv 16 : Contre la cible jurée : +70% dégâts. Contre les autres : -80% dégâts. Si la cible meurt, récupère jusqu'à 12 EP dépensés pendant ce duel.
  - Niv 20 : Contre la cible jurée : +90% dégâts. Contre les autres : -90% dégâts. Si la cible meurt, récupère toute l'EP dépensée pendant ce duel, dans la limite de son maximum d'EP.

### Branche B — Sentence du Duel (style : Exécution)
- descPhys : La lame claire ne cherche plus les ouvertures générales. Elle revient toujours vers la même présence, le même angle, la même faute. Chaque coup ressemble moins à une attaque qu'à une ligne de plus dans une condamnation.
- flavor : Sentence du Duel est la partie la plus froide du serment. Pas de panache inutile, pas de grande protection héroïque : seulement la même cible, encore, jusqu'à rupture. Chaque frappe rappelle que la Lame d'Honneur a choisi son ennemi et que ce choix doit aller au bout.
- Paliers (nom « Sentence du Duel », coût « 4 EM — 1 action — cible jurée uniquement ») :
  - Niv 10 : Frappe 10+Niv dégâts. Si la cible est sous Duel Juré, ajoute +4 dégâts et marque 1 EP dépensé comme récupérable si elle meurt.
  - Niv 13 : Frappe 14+Niv dégâts. Si la cible est sous Duel Juré, ajoute +7 dégâts et marque 2 EP dépensés comme récupérables si elle meurt.
  - Niv 16 : Frappe 18+Niv dégâts. Si la cible est sous Duel Juré, ajoute +10 dégâts. Si elle défend, sa défense coûte +2 EP.
  - Niv 20 : Frappe 22+Niv dégâts. Si la cible est sous Duel Juré, ajoute +14 dégâts. Si cette attaque tue la cible, la récupération d'EP du Duel Juré se déclenche immédiatement.

## Sauvageon — Hache à deux mains du serment
`pvN:5, epN:8, emN:1, dmg:14, type:"Tranchant"` — Basique

**Lore :** Le Sauvageon est le serment de ceux qui ont appris à vivre avant d'apprendre à se tenir droits. Il ne leur offre pas la brutalité : il la reconnaît déjà là, enfouie dans les épaules, dans la mâchoire, dans cette façon d'avancer quand tout conseille de reculer. Sa hache à deux mains du serment est une évidence primitive, lourde, presque insultante dans sa simplicité. Elle ne promet ni élégance ni pardon. Elle promet que quelque chose va céder. Le Sauvageon n'est pas seulement fort : il est habité par une survie ancienne, une rage utile, une endurance qui donne l'impression que le monde l'a cogné longtemps sans réussir à le coucher.

### Branche A — Spirale Brisante (style : AOE)
- descPhys : La hache s'abat sur le sol avec tout le poids du porteur. Le sol se fissure sous l'impact. Une onde de choc se propage en cercle — quiconque se tient à portée sent le sol lui échapper sous les pieds.
- flavor : Spirale Brisante est une décision sans nuance. Le Sauvageon ne demande pas au champ de bataille de se ranger proprement : il frappe le point qui doit exploser et accepte que tout ce qui traîne trop près paie le prix. C'est violent, dangereux, parfois sale, mais jamais hésitant.
- Paliers (nom « Spirale Brisante », coût « 5 EM — 1 action ») :
  - Niv 2 : Frappe le sol. Toutes entités au corps à corps — ennemies ET alliées — subissent 8+Niv dégâts contondants.
  - Niv 5 : 12+Niv à toutes entités au CAC.
  - Niv 7 : 16+Niv à toutes entités au CAC.
  - Niv 10 : 20+Niv à toutes entités au CAC.

### Branche B — Lancer Bestial (style : Précision)
- descPhys : Aucune préparation. Aucun calcul apparent. Le Sauvageon saisit sa hache, pivote, et la lâche avec une force brute qui n'a rien d'élégant — et pourtant elle file droit, implacable, comme si la violence elle-même avait décidé de l'endroit où elle devait atterrir.
- flavor : Lancer Bestial transforme la hache en verdict. Le Sauvageon abandonne volontairement son arme pour envoyer toute sa force en ligne droite. Le risque fait partie de la beauté du geste : pendant un instant, il n'a plus rien en main, mais l'adversaire, lui, doit vivre avec ce qui vient de le percuter.
- Paliers (nom « Lancer Bestial », coût « 8 EM — 1 action ») :
  - Niv 2 : Lance la hache sur une cible à distance : 18+Niv. Après le lancer, le porteur n'a plus son arme — réinvoquer (1 EM, 1 action) ou aller la récupérer (2 actions).
  - Niv 5 : 24+Niv.
  - Niv 7 : 30+Niv.
  - Niv 10 : 38+Niv.

## Croisé — Bouclier du serment
`pvN:8, epN:3, emN:2, dmg:6, type:"Contondant"` — Basique

**Lore :** Le Croisé est un refus. Refus de reculer, refus de céder la place, refus de laisser le chaos décider seul de ce qui tombe. Ce serment ne cherche pas les âmes douces ; il cherche celles qui portent déjà un devoir trop lourd et qui continuent malgré tout. Son bouclier du serment n'est pas un accessoire défensif. C'est une frontière mobile, un morceau de mur arraché au monde et confié à deux bras. Le Croisé avance avec une gravité presque cérémonielle. Quand il se place, il dit sans parler : ici, ça ne passe plus. Ses victoires ne sont pas toujours rapides, mais elles ont la solidité des choses qu'on n'a pas réussi à faire plier.

### Branche A — Bash Cinglant (style : Offensif)
- descPhys : Le bouclier s'illumine d'une lueur jaunâtre, brève et sourde. Puis il part en travers — un choc brut, sans élégance. À chaque impact, quelque chose se renforce dans le Croisé — une résistance qui monte, comme si le combat lui-même nourrissait sa capacité à encaisser.
- flavor : Bash Cinglant rappelle que le bouclier n'est pas un objet passif. Chaque impact est une déclaration : le Croisé ne se contente pas d'encaisser, il répond avec le poids même de sa défense. Plus il frappe, plus son corps semble comprendre qu'il doit rester debout.
- Paliers (nom « Bash Cinglant ») :
  - Niv 2 (coût « 6 EM — 1 action (CAC uniquement) ») : Frappe avec le bouclier : 5+Niv dégâts. Chaque hit augmente les PV maximum du Croisé de +3 PV max. Ces PV bonus disparaissent à la fin du combat.
  - Niv 5 (« 6 EM — 1 action ») : 7+Niv dégâts. +5 PV max par hit.
  - Niv 7 : 10+Niv dégâts. +7 PV max par hit.
  - Niv 10 : 13+Niv dégâts. +10 PV max par hit.

### Branche B — Appel du Bouclier (style : Aggro)
- descPhys : Le bouclier s'illumine d'une lueur jaunâtre, intense, presque aveuglante. Le Croisé le frappe contre le sol avec fracas. Il se dresse, immobile, regard fixe — et quelque chose dans cette lumière et cette posture dit aux ennemis que c'est lui, et lui seul, qu'ils doivent abattre.
- flavor : Appel du Bouclier n'est pas un cri pour attirer l'attention. C'est une injonction. Le Croisé devient le problème central de la scène, la cible qu'on ne peut plus ignorer. Chaque ennemi qui mord à l'appel renforce le mur qu'il essaie d'abattre.
- Paliers (nom « Appel du Bouclier », coût « 6 EM — 1 action ») :
  - Niv 2 : Provoque toutes les entités ennemies à portée. +3+Niv PV max par monstre provoqué. Mobs intelligents : effet 1 tour. Mobs agressifs : permanent. Désactivable sans action.
  - Niv 5 : +5+Niv PV max par monstre provoqué.
  - Niv 7 : +7+Niv PV max par monstre provoqué.
  - Niv 10 : +10+Niv PV max par monstre provoqué.

## Rôdeur — Dague du serment
`pvN:2, epN:5, emN:3, dmg:8, type:"Tranchant"` — Basique

**Lore :** Le Rôdeur appartient aux bords du monde : couloirs mal éclairés, routes secondaires, ruines où l'on entend trop tard le pas qui approche. Ce serment choisit les êtres qui survivent par mouvement, par silence, par instinct. Sa dague du serment n'a rien d'une arme glorieuse. Elle est courte, nerveuse, personnelle, faite pour apparaître au moment exact où l'adversaire croyait encore contrôler la distance. Le Rôdeur ne domine pas le combat, il l'échappe. Il glisse hors des prises, revient dans les angles morts, transforme la fragilité en vitesse. Le danger chez lui n'est pas massif : il est soudain.

### Branche A — Rafale de Lames (style : Mêlée)
- descPhys : La dague ne s'arrête pas. Premier coup, deuxième, troisième — enchaînés sans temps mort, sans respiration. La main du Rôdeur disparaît dans une succession de gestes trop rapides pour être lus séparément.
- flavor : Rafale de Lames ne cherche pas le coup parfait. Elle noie la défense sous des décisions trop rapprochées. Trois entailles, trois urgences, une seule respiration pour comprendre. Le Rôdeur gagne parce que la cible n'a pas le temps de répondre correctement à tout.
- Paliers (nom « Rafale de Lames », coût « 6 EM — 1 action ») :
  - Niv 2 : 3 frappes consécutives sur une même cible. Chaque frappe traitée individuellement (défense séparée pour chacune). 1+Niv par frappe (total : 3+Niv×3).
  - Niv 5 : 3+Niv par frappe (total : 9+Niv×3).
  - Niv 7 : 5+Niv par frappe (total : 15+Niv×3).
  - Niv 10 : 7+Niv par frappe (total : 21+Niv×3).

### Branche B — Lancer Lié (style : Distance)
- descPhys : La dague quitte la main, frappe, et revient — comme si un fil invisible la ramenait. Le Rôdeur n'attend pas. La lame est déjà de retour avant même que l'adversaire ait compris qu'elle était partie.
- flavor : Lancer Lié donne au Rôdeur une menace impossible à confisquer. La dague part, mord, revient. L'adversaire ne peut pas compter sur la perte de l'arme pour respirer : elle est déjà revenue, comme une mauvaise nouvelle qui connaît le chemin.
- Paliers (nom « Lancer Lié », coût « 5 EM — 1 action ») :
  - Niv 2 : Lance la dague sur une cible à distance (hors CAC uniquement). 5+Niv. La dague revient automatiquement et gratuitement.
  - Niv 5 : 9+Niv. Retour automatique.
  - Niv 7 : 13+Niv. Retour automatique.
  - Niv 10 : 17+Niv. Retour automatique.

## Traqueur — Lance du serment
`pvN:2, epN:7, emN:2, dmg:8, type:"Tranchant"` — Basique

**Lore :** Le Traqueur ne chasse pas pour courir. Il chasse pour réduire les options. Ce serment reconnaît les esprits qui savent attendre, lire les habitudes, rendre chaque fuite un peu plus coûteuse que la précédente. Sa lance du serment n'est pas seulement une arme d'allonge ; c'est un compas froid, une manière de garder l'adversaire à la distance exacte où il souffre le plus. Le Traqueur ne cherche pas forcément la mort rapide. Il préfère l'épuisement, la pression, le terrain qui se referme. Face à lui, on a d'abord l'impression d'avoir encore le choix. Puis l'on comprend que ces choix étaient déjà prévus.

### Branche A — Lance Drainante (style : Épuisement)
- descPhys : La lance entre, ressort. Mais quelque chose reste — une douleur sourde, diffuse, qui court dans les membres. La cible bouge encore, mais chaque geste lui coûte un peu plus qu'avant.
- flavor : Lance Drainante est une blessure qui continue de parler après l'impact. La cible bouge encore, mais chaque geste devient plus lourd, chaque défense moins naturelle. Le Traqueur ne vole pas seulement de l'énergie : il vole la durée du combat.
- Paliers (nom « Lance Drainante », coût « 5 EM — 1 action ») :
  - Niv 2 : Frappe la cible : 4+Niv dégâts. Simultanément : la cible perd 8 EP.
  - Niv 5 : 8+Niv dégâts. Cible perd 12 EP.
  - Niv 7 : 12+Niv dégâts. Cible perd 16 EP.
  - Niv 10 : 16+Niv dégâts. Cible perd 20 EP.

### Branche B — Tenue de Ligne (style : Contrôle)
- descPhys : De loin : la lance se tend, précise, contrôlée. Elle atteint sans que le porteur ait bougé d'un pas. De près : la lance s'enfonce avec toute la puissance du Traqueur derrière elle, puis pousse — un mouvement brusque, sec, qui recrée la distance de force.
- flavor : Tenue de Ligne est la grammaire du Traqueur : loin, il atteint ; près, il repousse. Il ne gagne pas parce qu'il bouge davantage, mais parce qu'il impose à l'autre la distance exacte où la lance a raison.
- Paliers (nom « Tenue de Ligne », coût « 5 EM — 1 action ») :
  - Niv 2 : À distance : frappe à portée de lance, 4+Niv. Au corps à corps : frappe puissante 10+Niv + repousse la cible à distance (les deux doivent utiliser une action de déplacement).
  - Niv 5 : Distance : 8+Niv. CAC : 16+Niv + repousse.
  - Niv 7 : Distance : 12+Niv. CAC : 22+Niv + repousse.
  - Niv 10 : Distance : 16+Niv. CAC : 28+Niv + repousse.

## Flécheur — Arc du serment
`pvN:3, epN:5, emN:4, dmg:10, type:"Tranchant"` — Basique (catégorie : distance)

**Lore :** Le Flécheur est le serment de ceux qui savent attendre sans faiblir. Il ne récompense pas seulement la bonne vue ou la main stable ; il récompense la capacité à garder le monde entier immobile dans sa tête jusqu'à ce que la cible devienne évidente. Son arc du serment n'est pas une arme de panique. C'est une ligne tendue entre patience et conséquence. Le Flécheur paraît souvent distant, presque absent du tumulte, mais cette distance est une concentration. Il voit les trajectoires, les erreurs d'appui, les secondes où l'ennemi cesse de protéger son propre avenir. Quand il tire, ce n'est pas pour participer au combat. C'est pour le corriger.

### Branche A — Salve Aveugle (style : AOE)
- descPhys : Plusieurs flèches partent en même temps, en arc large. Elles ne cherchent pas une cible précise — elles saturent l'espace. Quiconque se trouve dans la zone reçoit.
- flavor : Salve Aveugle est le moment où le Flécheur renonce à la perfection pour contrôler une zone entière. Ce n'est pas élégant, pas propre, pas toujours confortable pour les alliés. Mais pendant quelques secondes, le terrain cesse d'appartenir à ceux qui s'y trouvent.
- Paliers (nom « Salve Aveugle », coût « 6 EM — 1 action ») :
  - Niv 2 : Zone à distance. Toutes entités dans la zone — ennemies ET alliées — subissent 7+Niv.
  - Niv 5 : 9+Niv à toutes entités dans la zone.
  - Niv 7 : 12+Niv à toutes entités dans la zone.
  - Niv 10 : 15+Niv à toutes entités dans la zone.

### Branche B — Flèche de Jugement (style : Concentration)
- descPhys : Le Flécheur s'immobilise. Tout le reste disparaît — le mouvement, le bruit, les alliés. Il ne reste que la cible et la corde tendue à l'extrême. Plus il attend, plus la flèche porte loin et fort. Quand elle part, c'est une sentence.
- flavor : Flèche de Jugement transforme l'attente en poids. Chaque action conservée devient de la tension dans la corde, du silence dans le bras, de la certitude dans le tir. Quand la flèche part enfin, elle porte avec elle tout ce que le Flécheur a refusé de faire avant.
- Paliers (nom « Flèche de Jugement ») :
  - Niv 2 (coût « 8 EM — coûte toutes les actions restantes du tour ») : 0 action sacrifiée : 7+Niv. 1 action : 14+Niv. 2 actions : 20+Niv. Interdit en surcadençage.
  - Niv 5 (« 8 EM ») : 0 action : 11+Niv. 1 action : 18+Niv. 2 actions : 26+Niv.
  - Niv 7 : 0 action : 15+Niv. 1 action : 22+Niv. 2 actions : 32+Niv.
  - Niv 10 : 0 action : 19+Niv. 1 action : 28+Niv. 2 actions : 38+Niv.

## Elementaliste — Poing américain du serment serti de gemmes
`pvN:4, epN:4, emN:4, dmg:7, type:"Contondant"` — Basique (clé de données sans accent : `"Elementaliste"`)

**Lore :** L'Élémentaliste est choisi par les âmes capables de porter deux catastrophes contraires sans se déchirer. Ce serment ne donne pas le feu, la glace, la foudre ou l'eau à quelqu'un qui veut seulement faire du bruit. Il répond à ceux qui savent alterner, contenir, relâcher, reprendre. Son poing américain serti de gemmes ressemble moins à une arme qu'à un verrou posé sur des forces trop anciennes pour être aimables. Chaque gemme retient une humeur du monde. Chaque frappe ouvre une serrure différente. L'Élémentaliste paraît souvent calme parce qu'il doit l'être : s'il cesse de tenir l'équilibre, ce ne sont plus ses poings qui parlent, mais les éléments qui commencent à le manger vivant.

RÈGLE UNIVERSELLE — LE COMPTEUR ÉLÉMENTAIRE : Quelle que soit la branche choisie, l'Élémentaliste obéit à une loi fondamentale — les éléments exigent l'alternance. Chaque utilisation consécutive d'un même élément fait monter un compteur interne. À ±2, switcher vers l'élément opposé déclenche une combinaison élémentaire. Le compteur revient à 0. Un troisième coup consécutif sans switcher applique un malus de −25% aux dégâts (puis −50%, −75%...). Le corps de l'Élémentaliste trahit toujours son état : à ±2, le dernier élément utilisé commence à recouvrir son corps — flammes, givre, crépitements ou humidité — de plus en plus visible et incontrôlable.

### Branche A — Feu & Glace (style : Équilibre offensif)
- descPhys : Le poing s'embrase ou se couvre de givre à l'impact. Si le porteur insiste sans alterner, les flammes deviennent incontrôlables sur son bras, ou le givre commence à remonter sur ses articulations. Ce n'est plus lui qui contrôle — c'est l'élément qui le gagne.
- flavor : Feu & Glace est une danse dangereuse entre morsure et fracture. Le feu donne l'assaut, cher, violent, impatient. La glace répond plus sobrement, mais elle prépare les os, les plaques, les défenses à céder au mauvais moment. GIVRE-BRÛLURE transforme le froid accumulé en brûlure brutale ; EMBRASEMENT laisse la cible fissurée, prête à payer plus cher le prochain impact.
- Paliers :
  - Niv 2 — nom « Poing Ardent (6 EM) / Poing Polaire (4 EM) », coût « 6 EM Feu / 4 EM Glace — 1 action CAC » : Feu : 8+Niv (brûlure). Glace : 5+Niv (gel). GIVRE-BRÛLURE : +7+Niv bonus brûlure. EMBRASEMENT : Brise Armure +10 sur prochain coup reçu par la cible.
  - Niv 5 — nom « Poing Ardent / Poing Polaire », coût « 6 EM / 4 EM » : Feu : 11+Niv. Glace : 8+Niv. GIVRE-BRÛLURE : +12+Niv. EMBRASEMENT : +16.
  - Niv 7 : Feu : 14+Niv. Glace : 11+Niv. GIVRE-BRÛLURE : +17+Niv. EMBRASEMENT : +22.
  - Niv 10 : Feu : 17+Niv. Glace : 14+Niv. GIVRE-BRÛLURE : +24+Niv. EMBRASEMENT : +30.

### Branche B — Foudre & Eau (style : Équilibre d'accumulation)
- descPhys : Le poing crépite ou s'humidifie à l'impact. Si le porteur abuse de la foudre, les crépitements remontent sous sa peau. L'eau en excès commence à peser, à perler, à s'épaissir autour de lui.
- flavor : Foudre & Eau ne cherche pas seulement à blesser : cette branche dérègle le souffle du combat. La foudre réveille le porteur, relance ses muscles, lui rend de l'élan. L'eau alourdit l'adversaire, s'infiltre dans ses appuis, rend chaque mouvement moins naturel. ÉLECTROCUTION recharge le corps ; NOYADE ÉLECTRIQUE vide celui d'en face. Le duel devient une circulation volée.
- Paliers :
  - Niv 2 — nom « Poing Foudre (4 EM) / Poing Aquatique (6 EM) », coût « 4 EM Foudre / 6 EM Eau — 1 action CAC » : Foudre : 6+Niv. Eau : 4+Niv (contondant). ÉLECTROCUTION : porteur regagne +10 EP. NOYADE ÉLECTRIQUE : cible perd -5 EP.
  - Niv 5 — nom « Poing Foudre / Poing Aquatique », coût « 4 EM / 6 EM » : Foudre : 9+Niv. Eau : 6+Niv. ÉLECTROCUTION : +16 EP. NOYADE : -8 EP.
  - Niv 7 : Foudre : 12+Niv. Eau : 8+Niv. ÉLECTROCUTION : +22 EP. NOYADE : -11 EP.
  - Niv 10 : Foudre : 15+Niv. Eau : 10+Niv. ÉLECTROCUTION : +30 EP. NOYADE : -15 EP.

## Evocateur — Bâton du serment orné de runes et d'anneaux
`pvN:2, epN:3, emN:6, dmg:4, type:"Contondant"` — Basique (catégorie : magie ; clé sans accent `"Evocateur"`)

**Lore :** L'Évocateur n'est jamais complètement seul, même au milieu d'une pièce vide. Ce serment choisit les porteurs capables d'entendre une présence derrière le silence et de lui donner assez de forme pour qu'elle agisse. Il ne s'agit pas de dominer une créature comme un outil. Il s'agit de maintenir un pacte instable : appeler, nourrir, guider, puis assumer ce qui répond. Son bâton orné de runes et d'anneaux tinte parfois sans contact, comme si quelque chose testait déjà la solidité du lien. L'Évocateur ne porte pas toute sa puissance dans ses bras. Il la tient autour de lui, au bord du visible, prête à entrer en scène dès qu'il accepte d'en payer le prix.

RÈGLES DES INVOCATIONS : Chaque invocation ne peut être appelée qu'une seule fois par combat. Si elle tombe, elle ne peut pas être réinvoquée. Les invocations agissent après leur porteur à chaque tour. Elles obéissent aux ordres gratuitement (sans action). En l'absence d'ordre, elles agissent de façon autonome. Elles ne peuvent pas surcadencer (2 actions max). Chaque action coûte de l'EM au porteur. Si le porteur n'a plus assez d'EM, l'invocation disparaît. Elles possèdent leurs propres PV — à 0, elles disparaissent définitivement.

### Branche A — La Tortue Bipède (style : Tank)
- descPhys : Elle émerge lentement, comme tirée d'un espace qui n'existe pas tout à fait. Sa carapace est dense, presque minérale, parcourue de lignes lumineuses qui pulsent au rythme de son porteur. Elle ne grogne pas. Elle se place. Et quand elle frappe, c'est avec la lenteur pesante de quelque chose qui n'a jamais eu besoin d'être rapide pour être dévastateur.
- flavor : La Tortue Bipède est une promesse de rempart. Elle ne brille pas par la vitesse, mais par cette certitude calme de se placer là où le danger arrive. En l'absence d'ordre, elle protège d'instinct son porteur. Elle frappe peu, mais chaque coup rappelle que même une défense peut avoir des poings.
- Paliers (nom « Tortue Bipède ») :
  - Niv 2 (coût « 10 EM invoc / 6 EM par action ») : PV : 8+Niv. Frappe CAC : 4+Niv (contondants). 2 actions/tour. S'interpose automatiquement.
  - Niv 5 (« 8 EM invoc / 5 EM par action ») : PV : 14+Niv. Frappe : 5+Niv.
  - Niv 7 (« 6 EM invoc / 4 EM par action ») : PV : 20+Niv. Frappe : 6+Niv.
  - Niv 10 (« 4 EM invoc / 3 EM par action ») : PV : 28+Niv. Frappe : 7+Niv.

### Branche B — Le Crabe Canon (style : Distance)
- descPhys : Il apparaît en claquant ses pinces — deux masses d'énergie condensée qui crépitent à chaque chargement. Son corps translucide laisse voir les flux d'énergie qui circulent en lui. Quand il tire, le recul le fait reculer d'un pas. Il n'a pas d'yeux à proprement parler — juste deux points lumineux fixés en permanence sur ce que son porteur veut abattre.
- flavor : Le Crabe Canon est une batterie nerveuse posée sur pattes. Fragile, bruyant, presque ridicule jusqu'au premier tir. Il n'a aucune noblesse de duel, aucune solution au corps à corps : toute son existence est un angle, une ligne, un recul violent après l'impact. En l'absence d'ordre, il vise la menace la plus proche du porteur et transforme la distance en pression constante.
- Paliers (nom « Crabe Canon ») :
  - Niv 2 (« 10 EM invoc / 6 EM par action ») : PV : 4+Niv. Tir à distance : 5+Niv (contondants). 2 actions/tour. Ne peut pas frapper au CAC.
  - Niv 5 (« 8 EM invoc / 5 EM par action ») : PV : 8+Niv. Tir : 6+Niv.
  - Niv 7 (« 6 EM invoc / 4 EM par action ») : PV : 12+Niv. Tir : 7+Niv.
  - Niv 10 (« 4 EM invoc / 3 EM par action ») : PV : 16+Niv. Tir : 8+Niv.

## Conjurateur — Chaîne du serment
`pvN:2, epN:2, emN:7, dmg:6, type:"Contondant"` — Basique (catégorie : soutien)

**Lore :** Le Conjurateur est le serment des liens qui refusent de rompre. Il choisit les porteurs capables de sentir ce qui lâche chez les autres avant que la chute soit visible : une respiration trop courte, une posture qui tremble, une volonté qui se fend. Sa chaîne du serment est froide, lourde, presque brutale, mais elle ne sert pas seulement à frapper. Chaque maillon est un passage. La douleur peut y circuler, la force aussi, la vie parfois. Le Conjurateur combat rarement pour prendre la lumière. Il combat pour que les autres restent dans la scène assez longtemps pour gagner. Là où le champ de bataille disperse, il rattache. Là où les corps cèdent, il insiste.

### Branche A — Frappe Déchaînée (style : Offensif)
- descPhys : La chaîne siffle dans l'air et frappe avec une précision froide. Au moment de l'impact, un fil de lumière s'échappe du point de contact — invisible à l'œil non averti — et rejoint l'allié désigné. Ce n'est pas de la magie spectaculaire. C'est un transfert silencieux, presque médical.
- flavor : Frappe Déchaînée transforme l'offensive en circulation vitale. La chaîne blesse devant elle et rend ailleurs ce qu'elle vient d'arracher. Le Conjurateur ne choisit pas entre aider et frapper : il lie les deux gestes dans le même mouvement, comme si chaque impact ouvrait une veine de secours.
- Paliers (nom « Frappe Déchaînée », coût « 5 EM — 1 action ») :
  - Niv 2 : Frappe : 4+Niv dégâts. Soin automatique : 4 PV sur un allié au choix (même tour, sans action supp.).
  - Niv 5 : 6+Niv dégâts. Soin : 6 PV.
  - Niv 7 : 8+Niv dégâts. Soin : 8 PV.
  - Niv 10 : 10+Niv dégâts. Soin : 10 PV.

### Branche B — Soin Enchaîné (style : Soin)
- descPhys : Le Conjurateur s'immobilise. La chaîne cesse de siffler — elle pend, tendue, comme si elle retenait quelque chose d'invisible. Plus il attend, plus la lumière qui court le long des maillons s'intensifie. Quand il relâche, ce n'est pas un geste — c'est une libération. La lumière quitte la chaîne d'un coup et rejoint sa cible comme une vague. Ce qui était brisé se referme.
- flavor : Soin Enchaîné est le refus pur de laisser quelqu'un tomber. Le Conjurateur cesse presque de combattre pour tenir un seul lien à deux mains. Plus il sacrifie de temps, plus la chaîne accumule de lumière, jusqu'à relâcher une vague de réparation massive. Ce n'est pas rapide. C'est obstiné.
- Paliers (nom « Soin Enchaîné ») :
  - Niv 2 (coût « 12 EM — coûte toutes les actions restantes du tour ») : 0 action sacrifiée : 10+Niv PV soignés. 1 action : 18+Niv. 2 actions : 28+Niv. Interdit en surcadençage.
  - Niv 5 (« 12 EM ») : 0 action : 15+Niv. 1 action : 25+Niv. 2 actions : 38+Niv.
  - Niv 7 : 0 action : 20+Niv. 1 action : 32+Niv. 2 actions : 48+Niv.
  - Niv 10 : 0 action : 26+Niv. 1 action : 40+Niv. 2 actions : 60+Niv.

## Arcaniste — Orbe du serment
`pvN:1, epN:1, emN:8, dmg:4, type:"Contondant (coup de poing pour les non-magiques)"` — Basique (catégorie : magie)

**Lore :** L'Arcaniste voit les coutures. Là où les autres perçoivent un mur, un corps, une trajectoire, lui devine les fils qui tiennent tout cela ensemble et les tensions qui pourraient les défaire. Ce serment ne donne pas une magie spectaculaire par accident : il confie à son porteur le droit terrible de toucher à la structure même des choses. Son orbe renferme une lueur captive, calme en apparence, mais dense comme une étoile tenue sous verre. L'Arcaniste semble souvent absent parce qu'une partie de lui écoute le monde craquer à bas bruit. Quand il agit, le geste peut être presque délicat. Le résultat, lui, ne l'est jamais. Chez lui, la destruction n'est pas une perte de contrôle : c'est une correction appliquée à la réalité.

### Branche A — Domaine Étoilé (style : AOE Indéfendable)
- descPhys : L'orbe s'illumine d'un blanc froid. Autour du porteur, l'air se troue — de petites perles lumineuses apparaissent, suspendues, presque silencieuses. Elles ne bougent pas. Elles attendent. Puis elles explosent toutes en même temps, dans un souffle sec et aveuglant.
- flavor : Domaine Étoilé ne vise pas une personne : il condamne un espace. Les défenses classiques n'ont rien à attraper, rien à parer, rien à bloquer. Il reste seulement une question : sortir à temps ou subir l'effondrement lumineux. Alliés et ennemis y sont traités avec la même indifférence cosmique.
- Paliers (nom « Domaine Étoilé », coût « 8 EM — 1 action ») :
  - Niv 2 : Zone ciblée. Toutes entités dans la zone (alliées ET ennemies) : 14+Niv. INDÉFENDABLE — esquive, parade, blocage inefficaces. Seul le déplacement hors zone avant l'explosion permet d'échapper.
  - Niv 5 : 20+Niv. Indéfendable sauf déplacement.
  - Niv 7 : 26+Niv. Indéfendable sauf déplacement.
  - Niv 10 : 34+Niv. Indéfendable sauf déplacement.

### Branche B — Rayon Étoilé (style : Précision Défendable)
- descPhys : L'orbe monte lentement, comme appelé. Au-dessus du porteur, une étoile prend forme — grande, presque tranquille, d'un blanc qui brûle les yeux sans prévenir. L'orbe s'aligne. Il n'y a pas d'hésitation. Le rayon part d'un seul coup, droit, absolu, comme si la distance entre le porteur et sa cible n'avait jamais existé. Ce qui est touché ne l'oublie pas.
- flavor : Rayon Étoilé est l'inverse du domaine : une seule ligne, une seule cible, une seule erreur possible. La puissance est monstrueuse, mais lisible. La cible peut tout tenter pour survivre. L'Arcaniste accepte ce risque parce qu'un rayon qui passe n'a plus besoin d'explication.
- Paliers (nom « Rayon Étoilé », coût « 10 EM — 1 action ») :
  - Niv 2 : Rayon unique sur cible précise : 20+Niv. ENTIÈREMENT DÉFENDABLE — la cible peut esquiver, parer ou bloquer normalement. En contrepartie : dégâts les plus élevés du Serment.
  - Niv 5 : 28+Niv. Entièrement défendable.
  - Niv 7 : 36+Niv. Entièrement défendable.
  - Niv 10 : 46+Niv. Entièrement défendable.

---

## Tableau de synthèse des statistiques natives

| Serment | Arme | PV/niv | EP/niv | EM/niv | Dmg | Type | Rang | Vitrine |
|---|---|---|---|---|---|---|---|---|
| Duelliste | Épée moyenne du serment | 6 | 6 | 2 | 11 | Tranchant | Basique | oui |
| Bretteur | Épée fine du serment | 5 | 7 | 3 | 12 | Tranchant | Aguerri (← Duelliste) | non (`hidden`) |
| Claymore | Claymore du serment | 7 | 4 | 2 | 16 | Tranchant lourd | Aguerri (← Duelliste) | non |
| Lame d'Honneur | Épée claire du serment | 7 | 5 | 3 | 10 | Tranchant | Aguerri (← Duelliste) | non |
| Sauvageon | Hache à deux mains du serment | 5 | 8 | 1 | 14 | Tranchant | Basique | oui |
| Croisé | Bouclier du serment | 8 | 3 | 2 | 6 | Contondant | Basique | oui |
| Rôdeur | Dague du serment | 2 | 5 | 3 | 8 | Tranchant | Basique | oui |
| Traqueur | Lance du serment | 2 | 7 | 2 | 8 | Tranchant | Basique | oui |
| Flécheur | Arc du serment | 3 | 5 | 4 | 10 | Tranchant | Basique | oui |
| Elementaliste | Poing américain du serment serti de gemmes | 4 | 4 | 4 | 7 | Contondant | Basique | oui |
| Evocateur | Bâton du serment orné de runes et d'anneaux | 2 | 3 | 6 | 4 | Contondant | Basique | oui |
| Conjurateur | Chaîne du serment | 2 | 2 | 7 | 6 | Contondant | Basique | oui |
| Arcaniste | Orbe du serment | 1 | 1 | 8 | 4 | Contondant (coup de poing pour les non-magiques) | Basique | oui |
