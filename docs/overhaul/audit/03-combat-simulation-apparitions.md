# Audit 03 — Simulateur de combat MJ, fin de combat, archives, apparitions

Spécification source pour l'overhaul. Tout ce qui est décrit ici est **tel qu'implémenté** dans le code au 2026-09-30, avec références `fichier:ligne`. Les libellés entre guillemets sont verbatim (ils portent l'identité du site).

Sources parcourues intégralement :

- `assets/js/main.js` : données Serments `SD` (l. 213-485), normalisation bestiaire/archives (l. 735-848), récupération legacy (l. 1342-1500), compteur public (l. 1990-2000), historique de combat fiche (l. 5832-5890), switchTab (l. 5610-5616), page règles publique `renderCombat` (l. 8630-8839), XP manuel (l. 9208-9381), raccourcis clavier (l. 10901-10941), **simulateur** (l. 10943-13847), **labo d'apparitions** (l. 13849-14632), **archives** (l. 14634-15009).
- `assets/js/adventure-archives.js` (lecture seule joueur/MJ), `assets/js/beast-admin.js:493-500`.
- `netlify/functions/db.js` (l. 75-215, 255-395, 703-712, 790-845), `netlify/functions/auth.js` (l. 504-614).
- `scripts/test-archive-persistence.js`, `scripts/test-gameplay-persistence.js`, `scripts/test-beast-persistence.js`, `scripts/test-player-actions.js` (grep), `scripts/test-account-keyboard-browser.js:89-90`.
- `index.html` (onglets l. 7249-7253, 7308-7312 ; modale drop l. 7432-7439).

Convention : **[RÈGLE]** = règle de jeu à préserver ; **[UI]** = rendu/ergonomie à refaire librement ; **[DETTE]** = comportement accidentel ou incohérent.

---

## 1. Périmètre, accès et navigation

| Élément | Implémentation | Réf. |
|---|---|---|
| Onglet simulateur | `id="combat-mj"`, conteneur `#p-combat-mj-c`, `data-private="true"` ; libellé nav **« Simulation »**, palette de commandes « Simulation » / « Outils de combat », touche `C` | `index.html:7309`, `main.js:16355`, `main.js:16602` |
| Onglet apparitions | `id="apparitions"`, conteneur `#p-apparitions-c` ; libellé **« Apparitions »** | `index.html:7312`, `main.js:16356` |
| Alias | `switchTab('arena')` est redirigé vers `combat-mj` | `main.js:5495` |
| Rôles | `mjTabs=["joueurs","combat-mj","apparitions"]` : MJ et admin ; designer exclu | `main.js:4364-4366`, `5501-5502` |
| Rendu | `rCombat("p-combat-mj-c")` refuse si `CU.type!=="staff"` ; `renderSpawnLab` idem | `main.js:12848`, `14411` |
| Poll | à l'ouverture de l'onglet, `_startCombatMJPoll()` : toutes les **30 s**, si l'onglet est actif et **aucun combat actif**, recharge le bundle session + `beasts` et re-rend si `players` ou `beasts` ont changé | `main.js:11346-11358` |
| Ponts depuis le bestiaire | `beastSendToCombat(id, qty)` (staff) et `bestiaryAddToCombat(id,count)` (manage_beasts) : `combatAddBeast` × qty puis `switchTab('combat-mj')` ; notif « Créature envoyée au simulateur. » / « Créature ajoutée au simulateur (N). » | `main.js:7916-7928`, `beast-admin.js:493-500` |
| Lecture joueur | onglet `archives` (« Mon aventure / Les récits »), rôles admin/mj/joueur, module `adventure-archives.js` | `main.js:4361`, `adventure-archives.js:111-124` |
| Page règles publique | onglet `combat` (`renderCombat`) : document narratif des règles, **non branché** sur le simulateur | `main.js:8630-8839` |

---

## 2. Modèle d'état du simulateur

### 2.1 État global `_cs` (`main.js:10968-10983`)

```json
{
  "active": false,
  "round": 1,
  "initiative": 0,
  "fighters": [],
  "log": [],
  "id": null,
  "name": "",
  "order": [],
  "turn": 0,
  "phase": "idle",
  "_new": true,
  "notes": "",
  "_iv": {},
  "decl": {},
  "pendingDrops": []
}
```

- `phase` ∈ `"idle" | "declaration" | "resolution"`.
- `order` : tableau d'index de `fighters` (ordre de déclaration) ; `turn` : position courante dans `order`.
- `decl` : `{ [fighterIndex]: Declaration[] }`.
- `_iv` : cache des sélections d'UI (`csSet/csGet`, clés `"t"+fi` cible, `"h"+fi` cible de soin) **[UI]**.
- Champs runtime ajoutés à la volée : `_usedDefs` (compteur de défenses consommées par cible, réinitialisé chaque round), `_fxQueue` (animations **[UI]**), `_owner`, `_surc` (jamais lu — vestige du surcadençage), `savedAt`, `_manualSaved`, `_autosaveAt`, `_autosaveReason`, `_inProgress`, `_draft` (voir §9).
- Historique undo : `_csHist` (pile de JSON, max **30**) ; `_csRedoHist` déclaré mais jamais utilisé (`main.js:10976-10979`, `11032-11041`).

### 2.2 Combattant joueur (`combatToggleFighter`, `main.js:12403-12420`)

```json
{
  "type": "player", "pid": "p_alice", "name": "Alice", "classe": "Duelliste", "level": 3,
  "pvCur": 30, "pvMax": 30, "epCur": 50, "epMax": 50, "emCur": 20, "emMax": 20,
  "dmgBase": 11, "statuts": [], "img": "<avatar>", "_cid": "cf<ts36><rand>"
}
```

`dmgBase` = `getAllSD()[classe].dmg` (fallback 6). Ajouter un joueur déjà présent le retire (toggle). Seuls les joueurs `level>0` sont listés **[UI]** (`main.js:13354`).

### 2.3 Combattant créature (`combatAddBeast`, `main.js:12422-12439`)

```json
{
  "type": "beast", "bid": "b_loup", "name": "Loup 2", "level": 4,
  "pvCur": 20, "pvMax": 20, "epCur": 20, "epMax": 20, "emCur": 0, "emMax": 0,
  "dmgBase": 6, "frappe": "Morsure 6 dégâts", "comp": "Hurlement — …", "img": "", "beh": "Agressif",
  "statuts": [], "_cid": "cf…"
}
```

- `dmgBase` = premier nombre trouvé dans `b.frappe` (regex `/\d+/`), sinon 6.
- **[RÈGLE] Numérotation** : chaque ajout crée une instance ; la 1ʳᵉ s'appelle `nom`, à la 2ᵉ la 1ʳᵉ est renommée `nom 1` et la 2ᵉ `nom 2`, etc. (`main.js:12424-12433`, même logique dans `_spawnLabPushBeastToCombat` l. 14338-14340).
- Le 2ᵉ argument passé par `beastSendToCombat(id,true)` est ignoré **[DETTE]**.

### 2.4 Invocation (`combatResolve`, `main.js:12327`)

```json
{
  "type": "player", "isSummon": true, "ownerPid": "p_alice", "pid": "p_alice",
  "name": "Alice · Tortue Bipède", "classe": "Evocateur — Invocation", "level": 3,
  "pvCur": 11, "pvMax": 11, "epCur": 999, "epMax": 999, "emCur": 0, "emMax": 0,
  "dmgBase": 7, "statuts": [], "actionsMax": 2, "autoInterpose": true, "rangeType": "cac", "img": ""
}
```

### 2.5 Déclaration (`cDeclareAction`, `main.js:11957-12031`)

```json
{
  "action": "frappe|pugilat|esquive|bloquer|parer|subit|deplacer|capacite|soin|frappe_dechainees|passer|annule",
  "kind": "attack|defense|utility|heal|buff|summon",
  "label": "⚔ Frappe (14)", "target": 2, "defenseOf": null, "consumeActions": 1,
  "value": 14, "epCost": 6, "emCost": 0,
  "palNom": "…", "hits": 0, "aoe": false, "aoeIncludesAllies": false, "undefendable": false, "onlyDodge": false,
  "healAmt": 0, "healTarget": null, "actsSacr": 0,
  "epDrain": 0, "selfEpGain": 0, "comboSelfEpGain": 0, "comboEpDrain": 0,
  "statusToTarget": "", "briseArmure": 0, "comboDamage": 0, "elementKey": "",
  "selfPvMaxBonus": 0, "perEnemyPvMax": 0, "provoke": false, "repulse": false, "disarm": false,
  "summon": null, "claymorePosture": null,
  "defenseExtraEp": 0, "defenseChipPct": 0, "guardBonusDmg": 0, "blockBreakLine": false,
  "noReposition": false, "nextDefenseTax": 0, "blockEpDrain": 0, "blockPct": 50,
  "tauntLocked": false, "tauntSourceName": ""
}
```

`defenseOf` est documenté dans le commentaire d'en-tête (`main.js:10959`) mais **jamais renseigné ni lu** : les défenses ne ciblent pas une attaque précise, elles sont consommées dans l'ordre (voir §5.3) **[DETTE]**.

### 2.6 Entrée de journal (`cLog`, `main.js:11361`)

```json
{ "round": 2, "text": "💥 Alice → Loup : −14 PV (bloqué −25%) (20→6)", "ts": 1727700000000, "type": "damage" }
```

`type` ∈ `info | round | turn | damage | heal | spell | summon`. Le type `summon` sert de **marqueur d'état** : `cHasUsedSummon` cherche `"<ownerPid>:<nom>"` dans le texte (`main.js:11495-11497`) — le journal est donc porteur de règle **[DETTE]**.

---

## 3. Préparation du combat **[RÈGLE + UI]**

1. Sélection : panneaux « ÉLÈVES DU SERMENT » (joueurs) et « ADVERSAIRES » (créatures) ; bandeau « FORMATION » avec « Ordre initiative : ★ d'abord » et un `<select>` « Initiative… » (`main.js:13348-13411`) **[UI]**.
2. **Initiative** : `combatSetInit(fi)` → `_cs.initiative=fi`, log « ★ Initiative : X » (`main.js:12452-12456`). Par défaut `0` (premier ajouté).
3. **Démarrage** `combatStart()` (`main.js:11893-11910`) :
   - refus si déjà actif (« Combat déjà en cours. ») ou sans combattants (« Ajoute des combattants. ») ;
   - `round=1`, `log=[]`, `decl={}`, `phase="declaration"`, `turn=0` ;
   - **[RÈGLE] ordre** = `[initiative]` puis tous les autres **dans l'ordre d'ajout** (`main.js:11901-11903`) ; cet ordre est fixe pour tout le combat (sauf `combatMovePos`, voir plus bas) ;
   - `id="c"+Date.now()` si absent ; nom par défaut **« Combat du JJ/MM/AAAA »** ;
   - log « ⚔ Combat démarré — Round 1 » (type `round`), puis `_nextDeclarant()`.
   - **Ne remet pas `_new` à `false`** (voir §9.4).
4. `combatMovePos(fi,newPos)` réordonne `order` en cours de combat, vide toutes les déclarations, log « ↕ X → pos N » (`main.js:12458-12470`). Non exposé dans le rendu actuel (aucun bouton ne l'appelle) **[DETTE]**.
5. `combatRemoveFighter(fi)` : retire un combattant (snapshot undo), vide `decl`, et **réécrit `order` = index séquentiels** (l'initiative choisie est perdue) (`main.js:12441-12450`) **[DETTE]**.

---

## 4. Tour de jeu : déclaration

### 4.1 Nombre d'actions **[RÈGLE]** (`main.js:11845-11890`)

```
actionsMax(f) =
  si invocation : f.actionsMax (2)
  sinon : max(1, 3 − malusStatut) + bonusNiveau
malusStatut = max(2 si "etourdi", 1 si "entrave")            // max, pas somme
bonusNiveau = max sur les déclarations d'attaque déjà faites de max(0, f.level − cible.level)
              (cible vivante et ennemie uniquement ; 0 pour une invocation)
actionsRestantes = actionsMax − Σ consumeActions des déclarations
```

Le bonus de niveau n'existe qu'**après** avoir déclaré une attaque contre une cible de niveau inférieur (règle « +1 action par niveau d'écart », page règles `main.js:8688-8695`). Le surcadençage (× 2, × 2.5…) décrit dans les règles (`main.js:8724-8735`) **n'est pas implémenté** : `cSurcCost(base,level)=ceil(base×(1+level×0.5))` existe (`main.js:11441`) mais n'est jamais appelé **[DETTE]**.

### 4.2 Flux (`_nextDeclarant`, `cDeclareAction`, `main.js:11912-12063`)

- Le déclarant courant = `fighters[order[turn]]` ; les KO sont sautés ; log « 📋 Déclaration de : X » (type `turn`).
- Quand `turn ≥ order.length` → `phase="resolution"` (bouton « ⚡ RÉSOUDRE LE ROUND »).
- Refus : hors phase (« Phase de déclaration terminée. »), mauvais combattant (« Ce n'est pas le tour de déclaration de X. »), plus d'actions (« X n'a plus d'actions à déclarer. »), coût > restant (« Pas assez d'actions restantes pour cette compétence. »), déplacement verrouillé (« X ne peut pas se déplacer ce round. »).
- Le déclarant passe au suivant dès que ses actions sont épuisées ou qu'il « passe » (`passer` remplit tous les slots restants par `{action:"passer",label:"—"}`).
- `cUndoLastDecl(fi)` retire la dernière déclaration (`main.js:12066-12070`).
- `cEditDecl(fi)` (« ✏ Modifier ») : snapshot, vide les déclarations de `fi` **et de tous les suivants dans l'ordre**, replace `turn` sur `fi`, `phase="declaration"`, log « ✏ Modification déclaration : X » (`main.js:12073-12088`). Fonctionne aussi depuis la phase résolution.
- Cible forcée (Appel du Bouclier, §7.3) : toute déclaration `kind:"attack"` avec une cible est redirigée vers la source du taunt, `tauntLocked:true` (`main.js:12040-12048`).

### 4.3 Table des actions de base **[RÈGLE]** (`main.js:11950-12038` + boutons `main.js:13628-13644`)

Valeurs communes : `dmg = dmgBase + level` (joueur : `SD[classe].dmg` ; créature : 1ᵉʳ nombre de `frappe`) ; `pugDmg` (voir note).

| `action` | Libellé (verbatim) | Coût | Qui | Effet en résolution |
|---|---|---|---|---|
| `frappe` | « ⚔ Frappe (N) » ; en Posture Haute « 🗡 Frappe Haute (N) » | **6 EP** (Posture Haute : `epCost` de la posture, défaut 10) | tous | attaque `value=dmg` |
| `pugilat` | « 👊 Pugilat (N) » | **6 EP** | joueurs seulement (bouton) | attaque `value = 4 + level` (`main.js:11955`) |
| `esquive` | « 🛡 Esquive » | **8 EP** | tous | annule totalement une attaque (sauf chip/indéfendable) |
| `bloquer` | joueur « 🛡 Bloquer −50% » ; créature « 🛡 Bloquer (corps) −25% » | joueur **5 EP**, créature **2 EP** | tous | `blockPct` 50 / 25 |
| `parer` | joueur « 🤜 Parer −25% » ; créature = bloquer corps | joueur **0 EP**, créature 2 EP | joueurs (bouton) | dégâts × 0.75 arrondi sup. |
| `subit` | « 🩸 Subit » | 0 EP | tous | **aucun effet** : la résolution ne retient que esquive/bloquer/parer comme défenses (`main.js:12180`) ; la branche `def.action==="subit"` (l. 12230) est morte **[DETTE]** |
| `deplacer` | « 🏃 Déplacement » | **10 EP** | tous | log « 🏃 X se déplace » ; interdit si `noFreeRepositionRound===round` |
| `passer` | « ⏭ Passer » / « — » | 0 | tous | consomme toutes les actions restantes |
| `capacite` | « ✨ <palNom> » ou libellé fourni | `emCost`/`epCost` du palier | joueurs (branche) / créatures (`comp`) | voir §4.4, §4.5 |
| `soin` | « 💚 Soin (N PV) » | `emCost` | Conjurateur / créature | soigne `healAmt` sur `healTarget` (défaut soi-même) |
| `frappe_dechainees` | « ⚔💚 Frappe Déchaînée (N) » | `emCost` (5) | Conjurateur A | attaque + soin auto `healAmt` (non +Niv) sur `healTarget` |

Sous-libellés des boutons **[UI]** : « annule », « 0% », « corps −25% » / « −50% », « −25% », « bloqué » ; bandeau « 🗡 POSTURE HAUTE · déplacement bloqué » ; « CIBLE », « — Sélectionner — », suffixes « [KO] », « (moi-même) », « (allié) ».

**Note Pugilat [DETTE/contradiction]** : le bouton affiche `3 + level` (`main.js:13603`) et la page règles dit « 3 + Niveau du porteur » (`main.js:8718`), mais `cDeclareAction` ignore la valeur transmise et applique **`4 + level`** (`main.js:11955`).

**Note défenses [contradiction]** : la page règles définit « Bloquer sans bouclier 2 EP −25% » et « Bloquer avec bouclier 5 EP −50% » (`main.js:8709-8710`) ; le simulateur donne à **tout joueur** « Bloquer −50% » à 5 EP et « Parer −25% » à 0 EP, et réserve le « −25% à 2 EP » aux créatures.

### 4.4 Capacités de branche des joueurs (`cGetFighterSerment`, `cBuildAbilityOptionsForPalier`, `main.js:11446-11717`)

Source : `getPlayerSermentBundle(p).branch.paliers` (branche choisie sur la fiche). Paliers retenus : `niv ≤ p.level`, **dédoublonnés par nom (insensible à la casse) en gardant le plus haut palier** ; chaque nom distinct produit ses options (`main.js:11452-11461`). Les nombres sont parsés dans `desc` par regex ; `cDamageWithLevel(base, level) = base + level`. `emCost` par défaut = premier nombre de `cout`.

| Classe / nom (regex) | Options générées | Champs clés | Réf. |
|---|---|---|---|
| Conjurateur « Soin Encha… » | 1 option par `([012]) action… : (N)+Niv` : « Soin Enchaîné · -S action », `consumeActions=1+S`, refusée si actions restantes < 1+S | `action:"soin"`, `healAmt=N+lvl`, `targetType:"ally"`, `actsSacr=S` | 11587-11600 |
| Flécheur « Jugement » | idem avec dégâts | `value=N+lvl`, `consumeActions=1+S` | 11601-11614 |
| Elementaliste, desc contient Feu & Glace | « 🔥 Poing Ardent » (6 EM) et « ❄ Poing Polaire » (4 EM) | `value` = nums[0]/[1]+lvl, `elementKey` fire/ice, `statusToTarget` brulure/gel, `comboDamage`=nums[2]+lvl, `briseArmure`=nums[3] | 11617-11622 |
| Elementaliste, Foudre & Eau | « ⚡ Poing Foudre » (**6 EM**) et « 💧 Poing Aquatique » (**4 EM**) | `comboSelfEpGain`=nums[2], `comboEpDrain`=|nums[3]| | 11623-11628 |
| Evocateur (Tortue / Crabe) | « 🐢 Tortue Bipède » / « 🦀 Crabe Canon », `kind:"summon"`, seulement si aucune invocation vivante **et** jamais invoquée ce combat | `summon:{pv:nums[0]+lvl, dmg:nums[1]+lvl, actCost:nums[2], autoInterpose:Tortue, rangeType:"cac"/"distance"}` | 11630-11640 |
| « Taille Double » | 1 attaque `hits:2` | `value=1ᵉʳ nb+lvl` | 11641-11644 |
| « Rafale de Lames » | `hits:3` | idem | 11645-11648 |
| « Spirale Brisante » / « Salve Aveugle » / « Domaine Étoilé » | AOE alliés+ennemis | `aoe`, `aoeIncludesAllies:true`, `undefendable` si « INDÉFENDABLE » | 11649-11652 |
| « Appel du Bouclier » | `kind:"buff"`, `provoke:true` | `perEnemyPvMax = (1ᵉʳ nb, déf. 3) + lvl` | 11653-11656 |
| « Bash Cinglant » | attaque | `selfPvMaxBonus = nums[1]` | 11657-11661 |
| « Lance Drainante » | attaque | `epDrain = nums[1]` | 11662-11666 |
| Conjurateur « Frappe Déchaînée » | `action:"frappe_dechainees"` | `value=nums[0]+lvl`, `healAmt=nums[1]`, `healTargetType:"ally"` | 11667-11671 |
| Claymore « Posture Haute » | « 🗡 Posture Haute », `kind:"buff"` | `claymorePosture` (voir §6) | 11672-11677 |
| Claymore « Fendre la Ligne » | « 🪓 Fendre la Ligne » | `defenseExtraEp` (regex `\+(\d+)\s*EP`), `guardBonusDmg` (si « garde/parade/protection » → nums[1], déf. 4), `blockBreakLine` (si « brise-ligne » ou « traverse le blocage »), `noReposition` (si « replac »), `nextDefenseTax` (regex « prochaine défense coûte +N EP ») | 11678-11682 |
| « Lancer Bestial » | attaque `disarm:true` | `value` déf. 18 | 11683-11686 |
| « Lancer Lié », « Rayon Étoilé » | attaque simple | déf. 5 / 20 | 11687-11694 |
| « Élan Tranchant » / « Tenue de Ligne » | attaque, `repulse` si « repousse » | `value = max(nums[0], nums[1], 1ᵉʳ nb)+lvl` → **la valeur corps-à-corps (la plus haute) est toujours prise** | 11695-11700 |
| desc « Toutes entités » ou « Zone » | AOE générique | `aoeIncludesAllies` si « alliées ET ennemies » | 11701-11704 |
| Fallback | attaque `value=1ᵉʳ nb (déf. 6)+lvl` + `cParseDescMechanics` | `defenseExtraEp`, `defenseChipPct` (« 25 % »), `guardBonusDmg`, `noReposition`, `nextDefenseTax`, `repulse`, `onlyDodge` (« uniquement esquivable », « non parable »), `undefendable` (« imparable », « indéfendable », « non esquivable ») | 11475-11488, 11705-11707 |

Non modélisées (fallback générique) : Bretteur « Feinte de Fer » (le +EP/+dégâts conditionnel n'est pas parsé), « Pas Rompu » (réaction), Lame d'Honneur, ainsi que tout serment custom dont les descriptions ne suivent pas ces motifs **[DETTE]** — le moteur repose sur le **texte** des paliers.

Sous-labels **[UI]** : « Palier N », « −N EM », « −N EP », « N actions », « N hits », « AOE », « Aggro », « Invocation » ; titre « BRANCHE · <nom sans "Branche X — "> » ; select « — Cible soin — ».

### 4.5 Compétence de créature (`cParseMobSkillOption`, `main.js:11498-11569`)

Le champ libre `beast.comp` est interprété : `"<Titre> — <description>"`.

- Variantes temporelles : « Première action du combat : … » utilisée au round 1, « En cours de combat : … » ensuite (`cExtractCurrentMobSkillDesc`).
- Extraction : `epCost` (« N EP »), `emCost` (« N EM »), `consumeActions` (« N action », min 1), `dmg` (« N dégâts » sinon 1ᵉʳ nombre), `healAmt` (« soigne … N PV »), `hits` (« N coups/frappes/tirs »), statut par mots-clés (brûl → `brulure`, gel/givre → `gel`, poison → `empoisonne`, saign → `saignement`, fragilis → `fragilise`), `aoe` (« zone », « toutes les entités », « tous les ennemis », « autour de », « adjacent »), `onlyDodge`, `undefendable`, `repulse`.
- `kind:"heal"` si soin > 0 et pas de dégâts ; `targetType` `none` (AOE) / `ally` / `enemy`. `dmgStatic:true` : **pas de +Niv** sur les compétences de créature. Label « ⚡ <Titre> ».
- Option masquée si `consumeActions` > actions restantes. Titre de section **[UI]** : « COMPÉTENCE CRÉATURE ».

---

## 5. Résolution du round (`combatResolve`, `main.js:12265-12354`)

Ordre exact des étapes :

### 5.1 Budget d'énergie **[RÈGLE]** (l. 12273-12291)

Pour chaque combattant vivant dans `order` : `epSpent=Σ epCost`, `emSpent=Σ emCost`.

- Si `epSpent > epCur` : log « ⚡ X : EP insuffisant (a dispo, b requis) — actions réduites » et `epSpent=epCur`. **Les actions ne sont pas réduites** (le libellé ment) : toutes s'exécutent, l'EP tombe à 0 **[DETTE]**. La règle « EP insuffisante → évanouissement » (`main.js:8742`) n'est pas appliquée.
- Si `emSpent > emCur` : log « ⚡ X : EM insuffisante (a dispo, b requis) — capacités annulées » ; les capacités sont parcourues dans l'ordre, celles qui dépassent le cumul deviennent `action:"annule"`, label « [Annulé — EM] ».
- Déduction : `epCur=max(0,epCur−epSpent)`, `emCur=max(0,emCur−emSpent)`.

### 5.2 Attaques (l. 12293-12301)

Pour chaque combattant **dans `order`**, seulement s'il est **encore vivant au moment où son tour arrive** (un combattant KO plus tôt dans la même résolution n'attaque pas → l'ordre/initiative a un poids réel). Sont des attaques : `kind==="attack"`, `frappe`, `pugilat`, `frappe_dechainees`, ou `capacite` avec `value>0`/`hits`/`aoe`. Chaque attaque est résolue `max(1,hits)` fois (`cResolveAttackInstance`).

### 5.3 Résolution d'une instance d'attaque (`cResolveAttackInstance`, `main.js:12164-12264`) **[RÈGLE]**

1. **Cibles** (`cGetAttackTargets`) : AOE → tous les vivants sauf l'attaquant, alliés inclus si `aoeIncludesAllies`, sinon ennemis (`type` différent) ; sinon la cible d'index `target`.
2. **Interposition automatique** (`cFindAutoInterpose`, l. 11764-11768) : si une invocation vivante avec `autoInterpose` appartient à la cible (`x.ownerPid===target.pid`, même camp), elle prend le coup ; log « 🛡 <invocation> s'interpose pour <cible> ». Il n'existe **aucune interposition manuelle** (un joueur ne peut pas se placer devant un allié).
3. **Compteur élémentaire** (`cApplyElementalLogic`, l. 12117-12149) — voir §7.4.
4. **Défense** (sauf `undefendable`) : liste des déclarations de la cible parmi `esquive|bloquer|parer`, consommées **séquentiellement** par attaque reçue via `_usedDefs[ti+"_def"]` (une défense par instance d'attaque, dans l'ordre déclaré). `onlyDodge` saute les non-esquives (celles-ci sont quand même consommées). Puis :
   - `extraDefEp = atk.defenseExtraEp + target.defenseTaxNext` → EP de la cible −extraDefEp, `defenseTaxNext=0`, log « ⚡ X paie +N EP pour défendre <attaque> ».
   - **Esquive** : si `defenseChipPct` → `dmg=ceil(raw×pct/100)`, suffixe « (défense traversée N%) » ; sinon log « 🛡 X esquive l'attaque de Y — 0 dégâts », FX `ESQUIVE`, et **fin** (aucun effet secondaire).
   - **Bloquer** : `pct = decl.blockPct` (déf. créature 25 / joueur 50). Si `blockBreakLine` : `dmg = raw + ceil(raw×pct/100)`, suffixe « (blocage brisé +N) » / « (blocage corporel brisé +N) » ; sinon `dmg=ceil(dmg×(1−pct/100))`, suffixe « (bloqué −N%) » / « (bloqué avec le corps −N%) ». Si `blockEpDrain` : EP cible −N, log « 🗡 Blocage puni : X perd N EP en encaissant la Frappe Haute. ».
   - **Parer** : `dmg=ceil(dmg×0.75)`, suffixe « (paré −25%) » (créature : « (bloqué avec le corps −25%) »).
   - Puis si une défense a été utilisée : `guardBonusDmg` ajouté (suffixe « + brise-garde ») ; plancher `dmg=max(dmg, ceil(raw×defenseChipPct/100))` ; `noReposition` → `target.noFreeRepositionRound=round+1`, log « ↔ X ne peut pas se déplacer au prochain round. » ; `nextDefenseTax` → `target.defenseTaxNext += N`, log « ⚡ Prochaine défense de X : +N EP ».
5. **Dégâts bruts** (`cApplyRawDamage`, l. 12091-12107) : `dmg=max(0,ceil(dmg))` ; `+briseArmureBonus` (consommé, log « 💔 X subit +N dégâts (Brise-Armure) ») ; si la cible a `pvMaxBonus>0` (bouclier de PV max), le bonus absorbe d'abord (`pvMaxBonus`, `pvMax` et `pvCur` diminuent ensemble), le reste touche les PV. KO si `pvCur` passe à 0.
6. Log « 💥 A → B : −N PV<suffixe> (old→new) 💀 KO! » (type `damage`), FX « −N PV » / « KO · N PV ».
7. Effets après impact : `statusToTarget` → statut **2 tours** (`cAddOrRefreshStatut`, rafraîchi au max) ; `epDrain` (log « ⚡ X perd N EP ») ; `selfEpGain` (« ⚡ X regagne +N EP ») ; `briseArmure` hors élémentaire → `target.briseArmureBonus=N` (« 💔 X est fragilisé : prochain coup +N dégâts ») ; `repulse` (« ↔ X est repoussé par Y », narratif) ; `disarm` (« 🪓 X a lancé son arme — à récupérer ou réinvoquer IRP », narratif) ; `selfPvMaxBonus` → `pvMaxBonus/pvMax/pvCur` de l'attaquant +N (« 🛡 X gagne +N PV max »).
8. KO d'une créature → `openDropModal` après 1400 ms (§8).
9. `frappe_dechainees` : soin `healAmt` sur `healTarget` (plafond `pvMax`), log « 💚 Soin auto → X +N PV ».
10. Après toutes les cibles : `consumeClaymorePosture` → posture retirée, log « 🗡 X quitte Posture Haute après la Frappe Haute. ».

### 5.4 Passe utilitaire (l. 12303-12334), par combattant vivant dans `order`

- **Soins** (`soin` ou `capacite` avec `healAmt>0`) : cible `healTarget` sinon soi-même ; plafond `pvMax` ; log « 💚 X → Y +N PV ».
- `provoke` → `cApplyShieldCallTaunt` (§7.3).
- `claymorePosture` → `f.claymorePosture=…`, log « 🗡 X entre en Posture Haute : prochaine Frappe Haute N dégâts. » (type `spell`).
- `summon` (si aucune invocation vivante du propriétaire et jamais invoquée) → push du combattant §2.4, log « 🌀 X invoque <nom> [<pid>:<nom>] » (type `summon`, marqueur d'unicité), FX « INVOCATION ».
- Toute `capacite` : log « ✨ X : <palNom> (−N EM) » (type `spell`).
- `deplacer` : log « 🏃 X se déplace ».

### 5.5 Fin de round (l. 12336-12353)

1. `cTickStatuts` pour chaque vivant (§7.1).
2. `_usedDefs={}`, `decl={}`, `round++`, `cTickShieldCallTaunts()` (taunts temporaires expirés : « ✓ X n'est plus bloqué par Y »), `_elemState=null` pour tous (le compteur élémentaire **ne survit pas au round**), `turn=0`, `phase="declaration"`.
3. **Fin automatique** : aucun `type:"player"` vivant → « 💀 Tous les joueurs sont KO ! » ; aucun `type:"beast"` vivant → « 🏆 Tous les monstres sont KO ! » ; dans les deux cas `phase="idle"`, `active=false` (**sans** passer par `combatEnd` : les fiches ne sont pas synchronisées tant que le MJ ne clique pas « ■ FIN »). Sinon « — Round N — Déclarations » et `_nextDeclarant()`. Note : une invocation compte comme `player` vivant.
4. Snapshot undo pris **avant** la résolution (l. 12267) → « ↩ » annule un round entier.

---

## 6. Postures : Posture Haute (Claymore) **[RÈGLE]**

Données source (`main.js:262-265`) :

- Niv 10 : « Entre en posture jusqu'au prochain tour. La prochaine Frappe Haute coûte 10 EP, inflige 20+Niv dégâts et retire 12 EP si la cible bloque. »
- Niv 13 : « Frappe Haute : 24+Niv dégâts, 10 EP. Si la cible bloque, elle perd 14 EP. »
- Niv 16 : « … 28+Niv … perd 16 EP et ne peut pas se déplacer au prochain round. »
- Niv 20 : « … 32+Niv … perd 20 EP. Sur défense réussie, la cible subit tout de même 25% des dégâts sous forme d'impact. »

Objet `claymorePosture` construit (`main.js:11672-11677`) :

```json
{ "damage": 33, "epCost": 10, "blockEpDrain": 12, "noReposition": false, "defenseChipPct": 0, "desc": "…" }
```

- `damage = (N de "N+Niv") + level` ; `epCost` = premier « N EP » de la desc (10) ; `blockEpDrain` via regex `bloqu…(perd|retire) N EP` ; `noReposition` si « replac/déplacer » ; `defenseChipPct=25` si « 25 % ».
- Coût d'entrée : 6 EM (`cout`), 1 action, `kind:"buff"`.
- Effet : la prochaine `frappe` devient « 🗡 Frappe Haute (N) », `epCost=10`, hérite `blockEpDrain`, `defenseExtraEp`, `defenseChipPct`, `noReposition`, et consomme la posture après résolution. La posture **n'expire pas d'elle-même** au tour suivant (contrairement au texte « jusqu'au prochain tour ») **[DETTE]**.
- Le verrou de déplacement infligé à la cible (`noFreeRepositionRound`) bloque le bouton « 🏃 Déplacement » (« Déplacement bloqué par Posture Haute ») au round suivant.

Fendre la Ligne (Claymore B) : `blockBreakLine` (le blocage ajoute au lieu de retirer), `defenseExtraEp` (+3 EP niv 10, +2 niv 20), `guardBonusDmg` +4 (niv 13), `noReposition` (niv 16), `nextDefenseTax` +2 (niv 20). Il n'existe pas d'autre « posture » dans le code.

---

## 7. Statuts, taunt, invocations, élémentaire

### 7.1 Référentiel des statuts **[RÈGLE]** (`STATUT_EFFECTS`, `main.js:12474-12488`)

| id | Libellé | Couleur | Icône | Effet mécanique en combat |
|---|---|---|---|---|
| `saignement` | Saignement | `#c94a4a` | 🩸 | **−3 PV** par round (« 🩸 X saigne −3 PV (→N) ») |
| `empoisonne` | Empoisonné | `#77b36b` | ☠ | **−max(1, ceil(pvMax×5%))** par round (« ☠ X empoisonné −N PV (→N) ») |
| `brulure` | Brûlure | `#d88a3d` | 🔥 | aucun tick (pose par capacité feu) |
| `gel` | Gel | `#7eb8d4` | ❄ | aucun tick |
| `etourdi` | Étourdi | `#d7b56d` | 💫 | **−2 actions** (min 1) |
| `entrave` | Entravé | `#8aa0b6` | ⛓ | **−1 action** |
| `aveugle` | Aveuglé | `#c7c4b8` | ◌ | narratif |
| `silence` | Silence | `#8f8aa8` | 🔇 | narratif |
| `peur` | Peur | `#9e7bc2` | 😨 | narratif |
| `fragilise` | Fragilisé | `#d77c7c` | 🩹 | narratif (le « Brise-Armure » est un champ séparé `briseArmureBonus`) |
| `renforce` | Renforcé | `#77b38f` | 🛡 | narratif |
| `inspire` | Inspiré | `#d8c27a` | ✦ | narratif |

- Forme en combat : `{ "id": "saignement", "tours": 2 }`. Tick en fin de round (`cTickStatuts`, `main.js:12512-12521`) : dégâts, puis `tours−−`, à 0 → « ✓ X : <Libellé> dissipé ».
- Pose manuelle MJ : select « + Statut… » + input tours (1-10, défaut 2), `combatAddStatut` (log « ⚠ X : Libellé (NT) », type `damage` pour saignement/empoisonné) ; retrait `combatRemoveStatut` (« ✓ X : Libellé retiré »).
- Pose par capacité : `cAddOrRefreshStatut(target,sid,2)` (durée 2, rafraîchie au max).
- Sur la fiche joueur, forme différente : `{ "id", "desc", "posedBy", "posedAt" }` sans durée (`main.js:12374`, `12827`).

### 7.2 Ajustements manuels MJ (`cAdj`, `main.js:12524-12536`, boutons l. 13527-13733) **[UI + RÈGLE]**

- ±1 PV/EP/EM par carte ; PV négatif consomme d'abord le bouclier `pvMaxBonus` ; clamp `[0, max||999]`.
- Boutons hors tour : « −5 EP », « +5 EP », « ☕ » (title « Repos court ») = **`cAdj(fi,'ep', −ceil(epMax×0.5))`** — retire 50 % d'EP max (probablement inversé) **[DETTE]**, « ↺ » = EP et EM au max.
- « ★ INITIATIVE » par carte, « ✕ » retirer, « Désactiver » (Appel du Bouclier).

### 7.3 Appel du Bouclier / cible forcée **[RÈGLE]** (`main.js:11778-11844`)

- Applique à **tous les ennemis vivants** un `taunt = { sourceCid, sourceName, permanent, untilRound }` ; `permanent = (créature && beh ~ /Agressif|Très agressif/)`, sinon `untilRound = round+1` (1 tour).
- Bonus : `pvMaxBonus += perEnemyPvMax × nbEnnemis` (idem `pvMax`, `pvCur`), log « 🛡 X attire l'aggro et gagne +N PV max ».
- Log « 🎯 X fixe N bloqué(s) 1 tour · M verrouillé(s) tant que l'appel reste actif ».
- Le taunt tombe si la source est KO ou du même camp ; expiration en fin de round ; désactivation sans action « 🛑 X désactive son Appel du Bouclier (N cible(s) libérée(s)) ».
- Badges **[UI]** : « 🎯 <source> · verrou permanent / bloqué 1 tour », « 🛡 Appel actif · N cible(s) », « 🎯 Cible forcée : X · appui permanent / blocage 1 tour ».
- Les PV bonus sont retirés à la fin du combat (§8.1 : `realPvMax = pvMax − pvMaxBonus`).

### 7.4 Compteur élémentaire (Elementaliste) **[RÈGLE]** (`cApplyElementalLogic`, `main.js:12117-12149`)

État par attaquant `_elemState={last,count}` (réinitialisé chaque round, l. 12342).

- Même élément que le précédent : `count++` ; si `count ≥ 3` : `penalty = max(0.1, 1 − 0.25×(count−2))` → 0.75, 0.5, 0.25, 0.1 ; `dmg=ceil(dmg×penalty)`, log « ⚖ X subit un malus élémentaire sur <attaque> (x0.75) ».
- Changement d'élément avec `count ≥ 2` → combo, puis `last=nouvel élément`, `count=1` :
  - glace → feu : dégâts bruts supplémentaires `comboDamage` (« 🔥❄ Givre-Brûlure : X subit −N PV bonus (a→b) »)
  - feu → glace : `target.briseArmureBonus = briseArmure` (« 🔥❄ Embrasement : prochain coup sur X infligera +N dégâts »)
  - foudre → eau : attaquant EP `+comboSelfEpGain` plafonné (« ⚡💧 Électrocution : X regagne +N EP »)
  - eau → foudre : cible EP `−comboEpDrain` (« 💧⚡ Noyade électrique : X perd N EP »)
- Comme l'état est remis à zéro chaque round, un combo exige **3 attaques du même joueur dans le même round** (2 du même élément puis le switch). La lore parle d'un compteur « ±2 » persistant (`main.js:403`) **[question ouverte]**.

### 7.5 Invocations (Evocateur) **[RÈGLE]** (`main.js:11492-11497`, `11630-11640`, `12324-12330`, `11876-11878`)

- Une seule invocation vivante par propriétaire ; **une seule invocation par nom et par combat** (marqueur dans le journal).
- Invocation = combattant §2.4 : 2 actions/tour, `epCur=999` (ses actions ne coûtent rien), `emCur=0`, PV/dégâts = base du palier + niveau du porteur.
- Tortue : `autoInterpose:true` → prend automatiquement toute attaque visant son porteur. Crabe : `rangeType:"distance"` (aucun effet mécanique).
- **Non implémenté** malgré la lore (`main.js:424`) : coût EM du porteur par action de l'invocation, disparition si EM insuffisante, « agissent après leur porteur » (elles sont ajoutées en fin de `fighters`, donc en fin d'ordre), réinvocation interdite après KO (respectée via le marqueur).
- Fin de combat : les invocations sont exclues de la synchronisation des fiches (`main.js:12369`, testé dans `test-gameplay-persistence.js:117-126`).

---

## 8. Drops, fin de combat, récompenses, export

### 8.1 Drops de gemmes **[RÈGLE]** (`main.js:12539-12654`)

- Déclencheur : KO d'une créature dont `beast.gem` est non vide → modale `#m-drop`, titre « 💀 <nom> KO — Drop ? », section « TABLE DE DROP », bouton « 🎲 Lancer le D100 ».
- Format de `beast.gem` (`parseGemTable`) : entrées séparées par ` / `, chacune `min–max : libellé` (tiret `–` ou `-`), ex. `1–60 : Aucune / 61–90 : Gemme Blanche / 91–100 : Gemme Incarnate`.
- Tirage `roll = 1..100`, gemme = ligne dont `min ≤ roll ≤ max`, sinon « Aucune ». Log « 🎲 Drop <mob> : N → <gemme> ». Couleurs : Aucune → faint, contient « Blanche » → dim, « Incarnate » → violet, sinon rouge.
- Attribution (`combatGrantGemToPlayer`) à un joueur présent (`type:"player"` avec `pid`) : inventaire `{ "id": "gem_<ts>", "name": "<gemme>", "category": "Gemme", "qty": 1, "desc": "Obtenue sur : <mob>" }` (qty++ si déjà présent), historique `{ "type": "gemme", "text": "💎 <gemme> (sur <mob> · N/100)", "by": "MJ <nom>" }`, sauvegarde `up(p)` confirmée ; log « 💎 <gemme> → <joueur> (drop différé) » ; notif « <gemme> attribuée à <joueur> ✓ ».
- « ⏳ Décider plus tard » → `pendingDrops` : `{ "id": "pd<ts><rand>", "beastId", "beastName", "gem", "roll", "round", "fi", "createdAt" }`, log « 💎 Drop différé : … », notif « Drop mis en attente. Tu pourras l'attribuer plus tard. » ; panneau « DROPS EN ATTENTE » (« Round N · D100 : N · Attribution différée », « Aucun joueur lié disponible pour attribuer cette gemme. »), suppression « Retirer ce drop en attente ? ».
- Les drops déclenchent une autosauvegarde d'archive (`combatQueueAutosave`, raisons `drop_attributed`, `pending_drop`, `pending_drop_resolved`, `pending_drop_deleted`).

### 8.2 Fin de combat manuelle **[RÈGLE]** (`combatEnd`, `main.js:12357-12400`)

Bouton « ■ FIN » (confirm « Terminer le combat ? »).

1. Préconditions : pas de double clic (`combatEnd._pending`), aucune écriture `players` en file et révision `players` connue, sinon « Attends la sauvegarde des fiches ou recharge-les avant de terminer le combat. ».
2. Log « 🏁 Combat terminé — Round N ».
3. Pour chaque `type:"player"` non invocation, sur un **clone** des fiches :
   - `p.pvMax = f.pvMax − (f.pvMaxBonus||0)` ; `p.pvCur = min(f.pvCur, p.pvMax)` ; `p.epCur = f.epCur` ; `p.emCur = f.emCur` ;
   - statuts de combat absents de la fiche ajoutés `{id, desc:"", posedBy:<MJ>, posedAt}` (sans durée) ;
   - historique `{ "ts", "type": "combat", "text": "⚔ <nom> — <round>R · PV:<cur>/<max> EP:<cur>/<max>", "by": "MJ <nom>", "combatId": "<id>" }`.
4. `active=false`, `phase="idle"`, puis **`combatSaveArc()`** (sauvegarde manuelle d'archive), puis vérification que `players` n'a pas bougé (file vide, même révision, même contenu) sinon `VERSION_CONFLICT`, puis `sp(players)`.
5. Notifs : « Combat terminé. Archive et fiches sauvegardées. » / « Combat terminé, mais sauvegarde incomplète : <erreur> ».

Propriétés testées (`test-gameplay-persistence.js`) : une seule entrée d'historique, invocation exclue, refus si le journal/XP a été modifié ailleurs, refus après changement de session, anti double-clic.

**Ce que `combatEnd` ne fait pas** : aucune XP, aucun objet, aucune gemme (les drops sont attribués en direct), aucune mise à jour des créatures, aucun effet des statuts sur la fiche au-delà de l'ajout. La fin automatique (§5.5.3) ne l'appelle pas.

### 8.3 Récompenses XP (hors simulateur) **[RÈGLE]** (`main.js:9208-9238`, `9347-9381`)

Modale de progression (permission `manage_xp`), champ « Mob vaincu » (select des créatures, `data-xp = niv`) et participation `%` :

```
xpGain = ceil(niv_du_mob × 10 × (participation / 100))
```

Historique `{ "type": "xp", "text": "+N XP (<mob>, P%)", "by": "MJ <nom>" }`, montée de niveau `doLvlUp` (`xpReq(l) = NPProgression.xpRequired(l)`, règle affichée « 30 × le niveau actuel », `main.js:8809`). Gemmes : Blanche +5 XP, Incarnate +20 XP, Écarlate +50 XP (`main.js:8805-8807`, fusion gérée par le domaine progression). Aucun lien de données entre l'archive de combat et l'attribution d'XP (pas de `combatId` sur l'entrée `xp`).

### 8.4 Historique de combat sur la fiche (`renderCombatHistFiche`, `main.js:5832-5890`)

Filtre `history.type==="combat"`, extrait `/(\d+) round/`, `/PV : (\d+)\/(\d+)/`, `/EP : (\d+)\/(\d+)/`. **Le texte écrit par `combatEnd` est `« 3R · PV:19/30 EP:35/50 »`** : aucune regex ne matche → rounds « ? », pas de barres **[DETTE]**. Le module `adventure-archives.js:43-48` relit ces mêmes entrées comme « Compte rendu de ta fiche ».

### 8.5 Export texte « Discord » (`_exportCombat`, `main.js:12665-12700`) **[RÈGLE de format]**

```
## ⚔ <nom>
*<jour> <n> <mois> <année> · N round(s)*
---

**Joueurs :** A (Niv.3) · B (Niv.2)
**Adversaires :** Loup 1 ☠ · Loup 2

```
  ⚔ Combat démarré — Round 1          ← entrées type round, encadrées de lignes vides
  💥 …  💚 …  📋 …  ✨ …  · …          ← préfixes par type : damage 💥, heal 💚, turn 📋, spell ✨, autres ·
```

**État final :**
🟢 **A** · PV:`x/y` EP:`x/y` EM:`x/y` [**KO**]      ← 🟢 >60 %, 🟡 >30 %, 🔴 sinon

**Résultat : Victoire ✓** | **Résultat : Défaite ✗**   ← tous monstres KO / tous joueurs KO
**Drops :** · <entrées du journal contenant 💎>
**Notes MJ :** > <notes>

*— Nuages Polaires ☁️*
```

Copie presse-papiers (« Copié ✓ »). Disponible depuis le combat courant (« 📋 DISCORD ») et depuis une archive (`combatExportDiscordFromArc`).

### 8.6 Raccourcis clavier (`main.js:10901-10941`)

Actifs seulement si `can('manage_players')`, écran app + onglet `combat-mj` actifs, aucune modale/palette ouverte, focus hors contrôle interactif.

| Touche | Action | État |
|---|---|---|
| Échap | ferme la modale ouverte | OK |
| Espace (combat actif) | `combatPassTurn()` | **fonction inexistante** → `ReferenceError` **[DETTE]** |
| Maj+Entrée (combat actif) | `combatNextRound()` | **fonction inexistante** **[DETTE]** |
| Ctrl/Cmd+Z | `combatUndo()` (« Rien à annuler. » / « Annulé. ») | OK |

`scripts/test-account-keyboard-browser.js:89-90` **stubbe** ces deux fonctions, ce qui masque leur absence.

---

## 9. Archives de combat

### 9.1 Clés de stockage et propriétaire **[RÈGLE de données]**

| Clé | Contenu | Limite |
|---|---|---|
| `combat_arc_rec_<owner>__<id>` | **détail** d'une archive (objet complet = clone de `_cs`) | `fighters` 80, `log` 1200 (client `main.js:816-824`) ; serveur objet (`db.js:269-271`) |
| `combat_arc_idx_<owner>` | **index** : liste de métadonnées `_stub:true` | 5000 (`main.js:844`, `db.js:343`) |
| `combat_arc_<owner>` | liste de **compatibilité** (détails complets, 50 premiers) | 500 (`db.js:344`) ; client écrit `confirmed.slice(0,50)` (`main.js:11292`) |

- `owner` = `combatArchiveOwnerKey(CU.pseudo || CU.name)` (préfixes retirés, `main.js:11044-11068`). Un compte peut avoir deux owners (pseudo et nom) fusionnés à la lecture (`getCombatArchives`, l. 11200-11204) et migrés vers le premier (`_migrateLegacyCombatArchivesForCurrentSession`, l. 1485-1494).
- Serveur (`db.js:98-102`, `164-207`) : lecture/écriture admin et MJ sur tout préfixe `combat_arc_` ; un joueur ne peut lire/écrire que les clés dont l'owner est son `sub`, `pseudo`, `name` ou le nom de son personnage lié. Designer : rien.
- Bundle de session (`auth.js:571-603`) : admin reçoit les index de tous les pseudos admin/MJ ; MJ/joueur reçoivent leurs propres owners (pseudo, id, nom du personnage). Le client hydrate `combat_arc_<owner>` et `combat_arc_idx_<owner>` (`main.js:877-886`).
- Historique : anciennes copies `localStorage` (`np_combat_arc_*`) mises en quarantaine avec bannière de récupération « Des archives de combat de ton compte existent encore dans ce navigateur… » → export JSON `nuages-polaires-archives-locales-<date>.json` au format `{format:'np-local-combat-recovery-v1', exportedAt, storage:[{key,rawValue}]}` puis effacement confirmé (`main.js:1348-1464`) **[DETTE de transition]**.

### 9.2 Forme d'un enregistrement (clone de `_cs` + méta)

```json
{
  "id": "c1727700000000", "name": "Combat du 30/09/2026", "notes": "…",
  "active": false, "phase": "idle", "round": 4, "turn": 0, "order": [0,1,2], "initiative": 0,
  "fighters": [ … §2.2-2.4 … ], "log": [ … §2.6 … ], "decl": {}, "pendingDrops": [], "_iv": {},
  "savedAt": 1727700123456, "_owner": "Alice",
  "_manualSaved": true, "_autosaveAt": 0, "_autosaveReason": "manual",
  "_inProgress": false, "_draft": true, "_new": true
}
```

Méta d'index (`combatArchiveMetaFromRecord`, `main.js:11079-11100` ; serveur `auth.js:504-524`) :

```json
{ "id", "name", "label", "savedAt", "round", "phase", "active", "fighters": [80 max],
  "_owner", "_manualSaved", "_autosaveAt", "_autosaveReason", "_inProgress", "_draft", "_new", "_stub": true }
```

### 9.3 Sauvegarde (`saveCombatArchives`, `main.js:11254-11303`) **[RÈGLE de données, testée]**

1. File par owner (`_combatArchiveSaveQueue`).
2. Snapshots de révision (`_dbVersions`) de la liste, de l'index et de **chaque** détail avant tout appel.
3. Révision inconnue → `get` distant ; si le distant diffère du snapshot local → `VERSION_CONFLICT` (« Une modification plus récente existe. Copie ton travail puis recharge la page avant de réessayer. »).
4. Écriture des **détails d'abord** (seulement s'ils ont changé), puis liste de compatibilité (50), puis index. Un détail indisponible pour un stub bloque tout : « Le détail d'une archive est indisponible. La liste existante est conservée. ».
5. Les détails retirés d'une liste **ne sont pas supprimés** en base (récupérables).
6. Session changée (`SESSION_CHANGED`) ou hors-ligne (« Connexion requise pour sauvegarder les archives. ») → refus.

Tests `test-archive-persistence.js` : chevauchement de sauvegardes, rafraîchissement pendant écriture, révision distante non hydratée, retrait intentionnel, révisions inconnues, session expirée.

### 9.4 Brouillons, autosauvegarde, statut

- `combatSaveArc(opts)` (`main.js:12719-12735`) : `_manualSaved` (vrai sauf `manual:false`), `_autosaveReason` (`manual`, `notes`, `manual_save`, …), `_inProgress = active || phase≠idle || (fighters && log vide)`, **`_draft = _inProgress || _new`**.
- `combatPersistCurrentDraft(reason)` (`main.js:11000-11017`) : idem mais non manuel ; appelé via `combatQueueAutosave` (180 ms debounce) **uniquement** lors des drops, du chargement d'une archive, et du transfert d'apparition. **Aucune autosauvegarde par round** : un combat en cours non sauvé manuellement est perdu au rechargement **[DETTE]**.
- `_new` n'est remis à `false` que par `combatLoadArchive` (`main.js:12751`). Un combat créé via « ＋ »/`combatBlankState` (`_new:true`) et terminé par `combatEnd` est archivé avec **`_draft:true`** → affiché « Brouillon », statut `draft`, exclu du compteur public de créatures tuées (`main.js:1993`, `db.js:705`) **[DETTE majeure]**.
- Statut d'archive (`_archiveStatusKey`, `main.js:14675-14685`) : `draft` (« Brouillon ») → `progress` (« En cours ») → `victory` (« Victoire », toutes créatures KO) → `defeat` (« Défaite », tous joueurs KO) → `mixed` (« Résultat mixte »). Le tableau de bord d'accueil utilise « Brouillon / Victoire / Défaite / Inachevé » (`main.js:8118-8128`).
- Compteur public `creatureKills` = créatures `pvCur ≤ 0` des archives non brouillon, non en cours, `phase idle` (`db.js:703-712`, `810-834`).

### 9.5 Opérations

| Action | Fonction | Détails |
|---|---|---|
| Nouveau | `combatNewFromArchive` (« ＋ ») | `_cs=combatBlankState()`, historique undo vidé ; rendu auto si `!active && !_new && !id` (`main.js:13291`) |
| Sauver | `combatSaveArchive` (« 💾 ») | « Combat sauvegardé. » / « Combat non enregistré : … » |
| Notes | `combatSaveNotes` (« 💾 SAUVEGARDER » sous « NOTES MJ », placeholder « Notes privées… ») | sauvegarde non manuelle raison `notes` |
| Charger | `combatLoadArchive(id)` | fetch du détail (`combatArchiveFetchRecord` : `rec` → liste legacy → cache → fallback), clone dans `_cs`, puis **`cHydrateCombatState(_cs)` — fonction inexistante** → `ReferenceError` capturé par `_arcArchiveActionClick` → « Impossible de reprendre cette archive. » **[DETTE bloquante : le chargement d'archive est cassé dans cette version]** (`main.js:12741-12754`, `14751-14754`) |
| Supprimer | `combatDeleteArchive(id)` (confirm « Supprimer cette archive de combat ? ») | retire l'id de toutes les listes owners où il apparaît ; « Archive supprimée. » / « Suppression impossible. » |
| Exporter | `combatExportDiscordFromArc` | §8.5 |
| Admin | `_primeAllCombatArchivesForAdmin` (`manage_mjs`) | charge les index de tous les owners connus (comptes admin/MJ + clés en cache) |

### 9.6 Vue « Archives de combat » dans le simulateur **[UI]** (`main.js:13803-13841`, `14820-15009`)

Kicker « HISTORIQUE », titre « Archives de combat », sous-titre « Recherche croisée, filtres cumulables et vue détail premium pour retrouver vite le bon combat. » ; filtres « Recherche libre » (placeholder « Nom, créateur, joueur, créature… »), « Créateur », « État » (Tous les états / Brouillons / En cours / Victoires / Défaites / Résultat mixte), « Tri » (Plus récents / Plus anciens / Créateur A → Z / Créateur Z → A / Nom A → Z / Round décroissant), chips « JOUEURS » (filtre ET), « Réinitialiser » ; liste (80 max, « N combats trouvés · 80 affichés dans la liste. ») avec pastilles, barres PV, 3 créatures + « +N » ; boutons « Reprendre »/« Charger », « Exporter », « Supprimer » ; vue détail (« Vue détail », métriques « Joueurs / Créatures / Journal / Tour », « Joueurs », « Créatures affrontées » (14 max, « Tuée » / « Encore vivante »), « Aperçu du journal » (8 dernières)). État vide : « Aucun combat trouvé ».

### 9.7 Lecture joueur « Mon aventure / Les récits » (`adventure-archives.js`) **[UI à refaire, règles à garder]**

- Rôles admin/mj/joueur ; owners = pseudo/nom du compte, id de compte, nom du personnage lié (admin : tous les owners connus). Lecture du cache uniquement, sans promotion legacy.
- Deux types : « Archive » (index ou liste) et « Compte rendu » (`history.type==="combat"` du personnage). Recherche, filtre « Type de récit », pagination 20, détail (Round, brouillon/en cours, combattants PV, « Journal du combat »), « Exporter ce récit » → `nuages-polaires-combat.txt`. Bouton staff « Ouvrir la simulation et ses outils » (`manage_players`).

---

## 10. Générateur d'apparitions (« Labo d'apparitions staff ») **[RÈGLE]**

### 10.1 Stockage

- Clé serveur unique `spawn_lab_staff` (objet, lecture/écriture admin, MJ, designer ; `db.js:95-96`, `161`, `328-333`). Aucun état local : les clés `np_spawn_lab_ui_v2` / `np_spawn_lab_state_v1` sont purgées (`main.js:13851-13852`, `14002-14004`).

```json
{
  "schemaVersion": 2,
  "totals": { "<beastId>": 7 },
  "lastRuns": [ { "id": "roll_<ts>_<rand>", "idx": 1, "zone": "[🌳]-forêt-aux-lianes", "zoneValue": "[🌳]-forêt-aux-lianes",
                  "rolledBy": "Alice", "rolledAt": 1727700000000,
                  "packs": [ { "id": "b_loup", "nom": "Loup", "niv": 3, "beh": "Agressif", "hidden": false, "qty": 2,
                               "prob": 0.31, "total": 5, "range": { "min": 1, "max": 3 },
                               "baseWeight": 1, "weightNow": 1.14, "catchup": 1.14, "fatigue": 1 } ] } ],
  "totalDraws": 12, "lastGeneratedAt": 1727700000000, "lastGeneratedBy": "Alice",
  "customZones": ["[🌳]-forêt-aux-lianes", "…"], "lastDbSyncAt": 1727700000000
}
```

`lastRuns` limité à **24** ; fusion de deux versions par `lastGeneratedAt` avec union des runs et max des totaux (`_spawnLabMergeGlobal`, `main.js:13932-13946`).

### 10.2 Zones

- Zones par défaut (`main.js:13854-13860`) : `[🌳]-forêt-aux-lianes`, `[🌳]-forêt-aux-arbres-sombres`, `[🌳]-arbre-géant`, `[🌳]-forêt-centre`, `[🌳]-lisière-du-canyon` (noms de salons Discord).
- Options = zones custom (`customZones`, toujours préfixées des défauts, 80 max) ∪ `beast.zones` des créatures non masquées ; « Sans zone » (valeur `__none__`) trié en dernier ; `__all__` « Toutes zones » seulement s'il n'y a aucune option (`main.js:14059-14107`).
- Pool = créatures non `hidden` dont `zones` contient le libellé. Gestion des zones via `openBeastZoneManager` (modale `m-beast-zones`, `manage_beasts`).

### 10.3 Pondération **[RÈGLE, formules exactes]** (`main.js:13861-13863`, `14019-14040`, `14126-14138`)

```
behMult : Gibier 1.08 · Passif 0.92 · Neutre 1 · Agressif 1.12 · Très agressif 1.2 · Boss 0.4
levelFactor = max(0.24, 1.42 − (niv − 1) × 0.09)
baseCalc    = 96 × behMult × levelFactor ; Boss : min(baseCalc, 22) ; plancher 8
base        = beast.spawnWeight si défini et > 0 (arrondi), sinon baseCalc

count  = totals[id] ; avg = moyenne des totals sur le pool
over   = max(0, count − avg) ; under = max(0, avg − count)
fatigue = 1 + over × 0.22           (_spawnLabCumulativeCoef)
catchup = 1 + under × 0.14          (_spawnLabCatchupCoef)
encounterPenalty = 1 + (déjà tiré dans cette rencontre) × 0.95   (_spawnLabSameEncounterCoef)
weight = base × catchup / (fatigue × encounterPenalty) ; × 0.55 si déjà dans la rencontre et pool > 1
candidat retenu si weight > 0.5 ; tirage proportionnel (Math.random × Σ weight)
```

**[DETTE majeure]** : `_normalizeBeastRecord` (appelé par `gb()`) force `spawnWeight = max(1, …)` (`main.js:781`) ; le générateur voit donc toujours un poids explicite ≥ 1 et **`baseCalc` n'est jamais utilisé** : toutes les créatures sans poids saisi ont `base = 1`, et aucun formulaire d'admin bestiaire n'expose `spawnWeight`/`weight` (grep `beast-admin.js`, `bestiary-admin-pass2.js` : aucune occurrence). Seuls fatigue/rattrapage différencient les créatures.

### 10.4 Quantités (`_spawnLabQtyRange`, `main.js:14041-14058`)

```
si beast.spawnMin/spawnMax valides (min > 0, max ≥ min) : [spawnMin, spawnMax]
sinon : min = 1 ; max = Gibier 4 · Passif 3 · Neutre 3 · Agressif 2 · Très agressif 2 · Boss 1
        niv ≤ 2 : max + 1 ; niv ≥ 7 : max = max(2, max − 1) ; Gibier et niv ≤ 2 : max + 1
        niv ≥ 9 ou Boss : [1, 1]
qty = entier uniforme dans [min, max]
```

**[DETTE]** : la normalisation produit `qtyMin/qtyMax` (depuis `minQty/maxQty`) mais le générateur lit `spawnMin/spawnMax` : les bornes saisies ne sont jamais prises en compte.

### 10.5 Tirage (`_spawnLabGenerateEncounter`, `spawnLabGenerate`, `main.js:14171-14257`)

- **Un seul groupe par roll** (une créature choisie, une quantité) ; `totals[id] += qty` ; `totalDraws++` ; run préfixé dans `lastRuns`.
- Sauvegarde confirmée (`_confirmDbSave`) ; notif « Apparitions générées et poids globaux synchronisés. » / « Aucun tirage possible. » / « Aucun mob dans cette zone. ».
- Permissions : générer = tout staff ; supprimer un roll = `manage_beasts` (« Roll supprimé de l'historique. », sinon « Réservé à l'admin. ») ; réinitialiser le global = rôle `admin|fondateur|founder` (« Réinitialiser le global », « Historique global d'apparition réinitialisé. », sinon « Réservé au fondateur. ») ; les poids (« Poids dynamique », « Base », « Sorties × N », « Fatigue xN », « Rattrapage xN », « Réduit / Stable / Boost » : ratio < 0.94 / > 1.06) ne sont visibles que par ces rôles.
- « Copier le récap » : `**Générateur d'apparitions**` / `Zone <zone>` / `**Roll** — 2x Loup • 1x Ours`.

### 10.6 Transfert vers un pré-combat (`spawnLabTransferLastToSimulator`, `main.js:14365-14402`) **[RÈGLE]**

1. Si le simulateur contient un état significatif → `combatPersistCurrentDraft('spawn-transfer')`.
2. Nouvel état `combatBlankState()`, `id="c"+now`, **nom** `« Apparition — <zone> — JJ/MM/AA HH:MM — <rolledBy> »`, `_new:true`, `initiative:0`.
3. Pour chaque pack du dernier roll : créature retrouvée par id puis par nom ; `qty` bornée à 30 ; instances numérotées (§2.3).
4. `combatPersistCurrentDraft('spawn-precombat')`, rendu, `switchTab('combat-mj')`. Notifs « Pré-combat créé avec N mob(s) du roll. » / « … Introuvable : … » / « Aucun mob transféré dans le simulateur. » / « Aucun roll à transférer. ».

### 10.7 Textes d'écran **[UI]** (`main.js:14486-14630`)

« OUTIL STAFF — GÉNÉRATEUR D'APPARITIONS », « Roll par zone », « Choisis une zone, lance le roll, et le résultat tombe parmi les mobs configurés dedans. », « Les poids restent globaux : un mob qui sort baisse, les autres remontent. », « Zone du roll », « N mob(s) », « Cette zone ne contient aucun mob visible. », boutons « Roll », « Transférer dans le simulateur », « Copier le récap », « Réinitialiser le global », « Légende des poids », « Résultat » / « Dernier roll » / « Fourchette min-max » / « Historique × N » / « Masquée », « Admin uniquement · gérer les zones », « Gérer les mobs », « Mobs de la zone », « Pool automatique de <zone>. », « Historique », « Les derniers rolls conservés avec le profil qui a tiré. », « Roll par <nom> », « Supprimer », « Aucun roll enregistré pour le moment. ».

---

## 11. Page règles publique vs simulateur (divergences à trancher)

| Sujet | Page règles (`renderCombat`) | Simulateur |
|---|---|---|
| Stats de base niv 1 | 30 PV / 50 EP / 20 EM (`8650-8654`) | lues sur la fiche |
| Initiative | « appartient au premier agresseur… ne peut pas être perdue » (`8668-8670`) | choix MJ, réordonnable, perdue si retrait d'un combattant |
| Séquence | J1 joue tout, J2 ne réagit qu'en défense (`8672-8675`) | déclaration simultanée de tous puis résolution ; les attaques de tous s'appliquent dans l'ordre |
| Actions | 3 + écart de niveau ; surcadençage ×2/×2.5/… (`8687-8695`, `8724-8735`) | 3 − malus + écart ; pas de surcadençage |
| Frappe | 6 EP, dégâts Serment + Niv (`8704`) | identique |
| Tir à l'arc | 4 EP (`8705`) | n'existe pas (Flécheur frappe à 6 EP) |
| Invoquer son Serment | 1 EM (`8706`) | n'existe pas |
| Esquive | 8 EP annule (`8708`) | identique |
| Bloquer | sans bouclier 2 EP −25 % / avec bouclier 5 EP −50 % (`8709-8710`) | joueur : Bloquer 5 EP −50 %, Parer 0 EP −25 % ; créature : 2 EP −25 % |
| Pugilat | 3 + Niv, 6 EP (`8718`) | 4 + Niv (bouton affiche 3 + Niv) |
| Déplacement | 10 EP, hors de portée CAC (`8712`) | 10 EP, sans effet sur la portée |
| EP à 0 / insuffisante | effondrement / évanouissement (`8741-8742`) | actions exécutées, EP clampée à 0 |
| Arrondis | toujours supérieur (`8787`) | `Math.ceil` partout |
| KO / mort | KO à 0 PV, mort narrative (`8759`) | KO, pas de mort |

---

## 12. Questions ouvertes

1. **Pugilat** : 3 + Niv (règles, bouton) ou 4 + Niv (résolution) ?
2. **Défenses joueur** : conserver le trio Esquive 8 EP / Bloquer 5 EP −50 % / Parer 0 EP −25 %, ou revenir aux règles publiques (bloquer sans bouclier 2 EP −25 %, avec bouclier 5 EP −50 %, réservé au Croisé ?) ; que devient « Subit » (aucun effet aujourd'hui) ?
3. **EP insuffisante** : l'action doit-elle être annulée / le personnage s'effondrer (règles) ou le budget simplement clampé (code) ?
4. **Surcadençage** : à implémenter (formule règles ×2, ×2.5, +0.5/palier, arrondi sup.) ou à abandonner ?
5. **Compteur élémentaire** : persistant entre rounds (lore « ±2 ») ou réinitialisé chaque round (code) ? Coûts Foudre/Eau : 4/6 EM (données SD) ou 6/4 EM (code) ?
6. **Invocations** : coût EM par action du porteur et disparition à court d'EM (lore) à implémenter ?
7. **Posture Haute** : expire-t-elle au tour suivant si aucune Frappe Haute n'est portée ?
8. **Archives** : quel statut pour un combat terminé normalement (aujourd'hui « Brouillon » à cause de `_new`) ; faut-il une autosauvegarde à chaque round ; que faire des listes de compatibilité `combat_arc_<owner>` et de la récupération localStorage ?
9. **Apparitions** : un seul groupe par roll est-il voulu ? Faut-il exposer poids/quantités par créature (`spawnWeight`, `spawnMin/Max`) dans l'atelier bestiaire, et corriger la base `=1` ?
10. **Récompenses** : la fin de combat doit-elle proposer l'XP (formule `niv × 10 × %`) et les drops en attente directement, avec traçabilité `combatId` ?
11. **Fin automatique** (tous KO) : doit-elle déclencher `combatEnd` (sync fiches) ?
12. « ☕ Repos court » retire 50 % d'EP max : bug ou règle ?

---

## 13. Ce qu'il faut absolument préserver dans l'overhaul

- **Le modèle déclaration → résolution** : chaque combattant déclare N actions dans l'ordre d'initiative, le MJ résout ; défenses consommées une par attaque reçue dans l'ordre déclaré ; un KO avant son tour n'attaque pas.
- **Formules** : dégâts = `dmg du Serment + niveau` (table `SD` : Duelliste 11, Bretteur 12, Claymore 16, Lame d'Honneur 10, Sauvageon 14, Croisé 6, Rôdeur 8, Traqueur 8, Flécheur 10, Elementaliste 7, Evocateur 4, Conjurateur 6, Arcaniste 4) ; créature = 1ᵉʳ nombre de `frappe` + niveau ; capacités = `base du palier + niveau` ; compétences de créature sans +niveau ; arrondi supérieur ; actions = `max(1, 3 − malus) + écart de niveau`.
- **Coûts** : Frappe 6 EP, Pugilat 6 EP, Esquive 8 EP, Bloquer 5/2 EP, Parer 0 EP, Déplacement 10 EP, capacités en EM selon le palier ; annulation des capacités au-delà du budget EM.
- **Effets spéciaux** : multi-coups (Taille Double ×2, Rafale ×3), AOE alliés/ennemis, indéfendable, esquivable uniquement, brise-ligne, brise-garde, taxe de défense, verrou de déplacement, drain/gain d'EP, brise-armure, PV max bonus (bouclier consommé en premier, retiré en fin de combat), Appel du Bouclier (taunt 1 tour / permanent pour agressifs, +PV max par ennemi), Posture Haute (Frappe Haute 10 EP, punition du blocage, chip 25 %), combos élémentaires et malus de répétition (0.75/0.5/0.25/0.1), invocations (unique par combat, 2 actions, Tortue s'interpose).
- **Statuts** : les 12 ids/libellés/couleurs/icônes ; saignement −3 PV, empoisonné −5 % PV max (min 1), étourdi −2 actions, entravé −1 ; durée en tours, défaut 2.
- **Drops** : format de table `min–max : gemme`, D100, gemme → inventaire `category:"Gemme"` + historique `type:"gemme"`, drops différés.
- **Fin de combat** : synchronisation PV/EP/EM/statuts vers les fiches, entrée d'historique `type:"combat"` avec `combatId`, invocation exclue, protection par révision (archive puis fiches, refus en cas de conflit), anti double-clic.
- **Archives** : détail objet + index + owner ; écriture des détails avant l'index ; conflits de révision au lieu d'écrasement ; suppression logique ; export texte Discord (format §8.5) ; lecture joueur de ses propres archives et comptes rendus ; statut victoire/défaite/mixte ; compteur public de créatures tuées.
- **Apparitions** : zones (salons Discord), pool par zone, fatigue 0.22 / rattrapage 0.14 / pénalité 0.95 / ×0.55, quantités par comportement et niveau, historique global partagé (24 runs), transfert nommé « Apparition — zone — date — auteur » vers un pré-combat, récap copiable.
- **Vocabulaire** : Simulation, Apparitions, Élèves du Serment, Adversaires, Déclaration/Résolution, Round, Frappe Haute, Brise-ligne, Appel du Bouclier, Drop différé, Brouillon/En cours/Victoire/Défaite/Résultat mixte, « — Nuages Polaires ☁️ ».

## 14. Ce qui relève de la dérive / dette

- **Bugs bloquants** : `cHydrateCombatState` inexistante (chargement d'archive impossible) ; `combatPassTurn`/`combatNextRound` inexistantes (raccourcis Espace / Maj+Entrée) ; `_new` jamais remis à `false` → tout combat terminé archivé en « Brouillon » et exclu des statistiques ; `spawnWeight` normalisé à 1 → pondération de base morte ; `spawnMin/Max` jamais lus ; regex de `renderCombatHistFiche` incompatibles avec le texte écrit par `combatEnd`.
- **Moteur piloté par le texte** : capacités et compétences de créatures parsées par regex sur `desc`/`comp` (fragile, non couvert par les tests, plusieurs branches non modélisées : Bretteur, Lame d'Honneur, serments custom). L'overhaul doit stocker les effets en **données structurées** (`{type:"attack", base, hits, aoe, …}`).
- **Règle portée par le journal** (`type:"summon"` comme marqueur), `defenseOf` mort, `subit` sans effet, `_surc`, `_csRedoHist`, `cSurcCost`, `combatMovePos` non exposé, argument ignoré de `combatAddBeast`, « ☕ » inversé, « actions réduites » mensonger.
- **Absence d'autosauvegarde** par round ; fin automatique sans synchronisation des fiches ; posture sans expiration ; compteur élémentaire remis à zéro chaque round.
- **UI** : ~400 lignes de CSS injectées dans le HTML rendu (`main.js:12864-13284`), styles inline massifs, sélecteurs `[style*=…]`, `onclick` avec code JS sérialisé (`data-opts` + `window.__cDeclTarget`), FX (`sim-fx-*`), thème « SIMULATEUR TACTIQUE » pixel-art, polling 30 s, deux CSS d'archives empilés (v238) — tout est à refaire.
- **Données** : triple stockage des archives (rec + idx + liste de compatibilité 50), owners multiples par compte (pseudo/nom/id/nom de personnage), quarantaine localStorage, fusion de deux versions de `spawn_lab_staff`.
- **Périmètre** : la page règles publique et le simulateur divergent (§11) ; l'XP et les gemmes sont attribuées hors simulateur sans lien avec l'archive ; l'onglet « Combat » public n'est qu'un document.
