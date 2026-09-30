# Audit 02 — Modèle du personnage, progression et serments

> Spécification source pour l'overhaul. Domaine : règles de jeu du compagnon (fiche, stats, XP, level-up, Gemmes de Sang, inventaire, équipement, consommation, historique, journal, notifications, avatar, export PDF, catalogue des serments, conversion des anciennes fiches).
>
> Sources auditées (lecture intégrale des zones concernées) : `assets/js/main.js` (16 855 l.), `assets/js/progression.js` (82 l.), `docs/fusion-xp.md`, `index.html` (section `#fiche` l. 7136-7259, écran `#s-register`), `netlify/functions/db.js`, `netlify/functions/auth.js`, `scripts/test-unified-progression*.js`, `scripts/test-gameplay-persistence.js`, `scripts/test-player-actions*.js`, `scripts/test-progression-reads.js`, `scripts/test-progression-concurrency.js`, `scripts/helpers/local-app.js`, `assets/js/first-steps.js`, `assets/js/rpg-prototype.js` (pour délimiter la dérive).
>
> Convention : `fichier:ligne` renvoie à l'état du dépôt audité. Les libellés entre guillemets sont **verbatim** (ils portent l'identité du site).

---

## 0. Vue d'ensemble (à lire en premier)

- Le personnage ("joueur" dans le code, collection `players`) est **une fiche unique par compte**, liée par `accounts[].pid → players[].id`. La création est réservée au staff (`can("manage_players")`, MJ ou admin) ; l'inscription d'un compte ne crée jamais de fiche (`first-steps.js:95`). Un compte non lié est "en attente" ; l'admin fait la liaison.
- **Une seule progression** : `level`, `xp`, `xpMax = level × 30`, marquée `progressionVersion: 1`. L'ancienne progression de serment (`sLevel/sXp/sXpMax`) est convertie à la lecture selon `docs/fusion-xp.md` et `assets/js/progression.js` (module partagé navigateur + Netlify).
- Trois ressources : **PV** (base 30), **EP** (Énergie Physique, base 50), **EM** (Énergie Magique, base 20). Au niveau 1 tout le monde a 30/50/20 ; à partir du niveau 2 chaque serment applique sa croissance `pvN/epN/emN`.
- **Serment** = classe du personnage (`classe`), avec une **arme liée**, des **dégâts de base** (`dmg`), une **catégorie de combat** (mêlée/distance/magie/soutien), un **rang** (Basique, Aguerri, Émérite, Singulier, Transcendé, Corrompu, Autre), une **lignée** (`evolvesFrom`), deux **branches** (A/B) et pour chaque branche 4 **paliers** (niveaux 2/5/7/10 pour Basique, 10/13/16/20 pour Aguerri).
- Deux sources d'XP, même compteur : **récompense de combat** (`ceil(niveau_du_mob × 10 × participation%)`) et **fusion de Gemmes de Sang** (Blanche +5, Incarnate +20, Écarlate +50, retirées de l'inventaire).
- Le joueur ne peut modifier lui-même que : **journal**, **avatar**, **consommation d'un objet** (−1), **effacement de ses notifications**, **inscription à un événement**. Tout le reste est staff, avec une matrice de droits précise (§ 9).
- Le PDF « Nuages Polaires — Document Officiel » exporte la fiche (§ 13).

---

## 1. Forme JSON complète d'un personnage

### 1.1 Exemple complet (tous les champs rencontrés)

```json
{
  "id": "p1727700000000",
  "name": "Alice",
  "classe": "Duelliste",
  "arme": "Épée moyenne du serment",
  "branch": "Branche A — L'Élan Tranchant",
  "level": 5,
  "xp": 75,
  "xpMax": 150,
  "progressionVersion": 1,
  "pvCur": 49, "pvMax": 54,
  "epCur": 38, "epMax": 74,
  "emCur": 13, "emMax": 28,
  "avatar": "data:image/jpeg;base64,...",
  "equipment": { "helmet": "Heaume de givre", "chest": null, "legs": null },
  "inventory": [
    { "id": "i1727700001000", "name": "Potion boréale", "category": "Consommable", "qty": 2 },
    { "id": "gem_1727700002000", "name": "Gemme Blanche", "category": "Gemme", "qty": 3, "desc": "Obtenue sur : Loup des brumes" }
  ],
  "history": [
    { "ts": 1727700003000, "type": "xp", "text": "+10 XP (Loup des brumes, 100%)", "by": "MJ Maitre" },
    { "ts": 1727700004000, "type": "level", "text": "⬆ Niveau 5 ! PV:54 EP:74 EM:28 — Palier II — Densité débloqué", "by": "Système" },
    { "ts": 1727700005000, "type": "combat", "text": "⚔ Embuscade — 3R · PV:19/30 EP:35/50", "by": "MJ Maitre", "combatId": "arc_..." }
  ],
  "statuts": [
    { "id": "saignement", "desc": "flanc gauche", "posedBy": "Maitre", "posedAt": 1727700006000 }
  ],
  "journal": "Notes personnelles, lore, secrets…",
  "notifDeleted": [1727700003000],
  "unlockedThemes": ["violet"],
  "blockedThemes": [],
  "createdAt": 1727700000000
}
```

### 1.2 Dictionnaire des champs

| Champ | Type | Sens / règle | Références |
|---|---|---|---|
| `id` | string | Créé côté client `"p"+Date.now()` (`main.js:9473`). Normalisation : `String(id || slug("p_", name))` (`main.js:709`), serveur `"p_"+idx` (`db.js:297`, `auth.js:274`). Clé de liaison avec `accounts[].pid`. | |
| `name` | string ≤ 80 | Nom IRP du personnage. Trim, tronqué à 80 (`main.js:710`, `db.js:298`). Sert d'identifiant dans les listes d'inscrits d'événements (héritage : par nom, pas par id, `db.js:933-935`). | |
| `classe` | string ≤ 80 | **Nom du serment** (clé du catalogue `SD` ou de `serments_custom`). Alias hérité `class` accepté (`main.js:711`, `progression.js:64`, `db.js:299`). | |
| `arme` | string | Arme liée, copiée depuis `serment.arme` à la création (`main.js:9473`) et au changement de serment (`main.js:7047`) ; resynchronisée quand l'admin modifie le serment (`main.js:6747`). L'affichage privilégie `serment.arme` sur `p.arme` (`main.js:6673`). | |
| `branch` | string | `"Aucune"` par défaut, sinon le **nom complet** de la branche (ex. `"Branche A — L'Élan Tranchant"`). Rapprochement tolérant par `branchMatchesLabel` (préfixe `Branche A/B —` ignoré, casse ignorée, inclusion) (`main.js:6626-6643`). | |
| `level` | int ≥ 1 | Niveau unique du personnage. | `progression.js:20` |
| `xp` | int ≥ 0 | XP courante vers le niveau suivant. Après migration : `min(xpMax−1, …)`. | `progression.js:56-60` |
| `xpMax` | int | Toujours recalculé `= level × 30` à la normalisation (`progression.js:21,55,59`). Stocké malgré tout. | |
| `progressionVersion` | int | `1` = fiche déjà unifiée ; absent/`< 1` = ancienne fiche à convertir. | `progression.js:7,48,75` |
| `pvCur`, `pvMax` | int | Points de Vie. `pvMax ≥ 1`, `pvCur ≥ 0`. Défaut 30. | `main.js:715-716` |
| `epCur`, `epMax` | int | Énergie Physique. `≥ 0`. Défaut 50. | `main.js:717-718` |
| `emCur`, `emMax` | int | Énergie Magique. `≥ 0`. Défaut 20. | `main.js:719-720` |
| `avatar` | string | `""` ou data-URL raster (`png/jpe?g/gif/webp/avif` côté client, `png/jpe?g/webp/gif` côté serveur) ou URL http(s) sans identifiants. Serveur : ≤ 350 000 caractères (`MAX_IMAGE_DATA_URL_LENGTH`), accepte aussi un chemin relatif sans schéma (`db.js:410-427`). Client : recadrage canvas puis compression, refus > 350 000 (`main.js:2965`). | |
| `equipment` | objet | `{ helmet, chest, legs }`, chaque slot `string \| null`. Toujours normalisé à ces 3 clés (`main.js:724-725`, `db.js:304`). | |
| `inventory` | tableau ≤ 500 | Objets `{ id, name, category, qty, desc?, … }` (§ 7). Champs arbitraires conservés (test `test-player-actions.js:16,69`). | `main.js:726`, `db.js:301` |
| `history` | tableau, **200 dernières** entrées conservées | Entrées `{ ts, type, text, by, combatId? }` (§ 8). Le texte est rendu **en HTML non échappé** côté client (`main.js:5964`), d'où l'échappement serveur des entrées joueur (`db.js:481-487`). | `main.js:727`, `db.js:302` |
| `statuts` | tableau ≤ 64 | `{ id, desc, posedBy, posedAt }` (§ 10). | `main.js:728`, `db.js:303` |
| `journal` | string ≤ 25 000 | Journal de bord (§ 11). `sanitizeText` serveur (retire `<script>`, `javascript:`). | `db.js:85,1010-1012` |
| `notifDeleted` | int[] | Timestamps `ts` des entrées d'historique masquées du panneau de notifications (§ 12). Le serveur ne conserve que les ts existant encore dans `history` (`db.js:919-924`). | |
| `unlockedThemes`, `blockedThemes` | string[] | Thèmes d'interface possédés / bloqués **au niveau du personnage** (en plus des mêmes champs sur le compte). Normalisés `normalizeThemeId` (`main.js:729-730`, `db.js:442`). Domaine thèmes, hors périmètre de cet audit mais présent sur l'objet. | |
| `earlyClouds` / `isEarlyClouds` / `early_clouds` / `foundingClouds` | bool (optionnel) | Marque « joueur des premiers nuages » pour les thèmes `earlyCloudsOnly` (`main.js:1050-1053`). Jamais écrit par l'UI auditée. | |
| `createdAt` | number (optionnel) | Lu par la liste staff (`main.js:9147`) mais **jamais écrit** par `addPlayer`. | |
| `sLevel`, `sXp`, `sXpMax` | hérités | Ancienne progression de serment, **supprimés** par `normalizePlayer` (`progression.js:76-78`). | |

Champ combat transitoire (hors fiche) : lors d'un combat, un combattant est construit à partir de la fiche avec `{type:"player", pid, name, classe, level, pvCur, pvMax, epCur, epMax, emCur, emMax, dmgBase: serment.dmg||6, statuts:[], img: avatar, _cid}` (`main.js:12410-12412`) ; `pvMaxBonus` est un bonus temporaire (Bash Cinglant / Appel du Bouclier) retiré en fin de combat (`main.js:12371`).

### 1.3 Valeurs à la création (`addPlayer`, `main.js:9468-9487`)

Formulaire « Nouveau joueur » (`main.js:3393-3415`) : « Nom du personnage » (placeholder « Nom IRP »), « Serment » (liste des serments visibles, `popSSelects` `main.js:9458`), « Avatar (URL ou import) ». Erreur : « Nom et Serment obligatoires. ».

```json
{ "id": "p<Date.now()>", "name": "<nom>", "classe": "<serment>", "level": 1, "xp": 0, "xpMax": 30,
  "pvCur": 30, "pvMax": 30, "epCur": 50, "epMax": 50, "emCur": 20, "emMax": 20,
  "avatar": "<url ou ''>", "arme": "<serment.arme>", "progressionVersion": 1, "branch": "Aucune",
  "equipment": { "helmet": null, "chest": null, "legs": null }, "inventory": [], "history": [] }
```

Journal système : `sysLog("personnage_cree", "Personnage '<n>' (<c>) créé", <staff>)`. Notification « <n> ajouté. ».

### 1.4 Normalisation à la lecture (client et serveur)

Ordre client `_normalizePlayerRecord` (`main.js:707-732`) : id → name → classe (alias `class`) → **`NPProgression.normalizePlayer(out, getAllSD()[classe])`** → clamps numériques → avatar → arme → branch (`"Aucune"` si vide) → equipment → inventory(500) → history(−200) → statuts(64) → thèmes.

Serveur `normalizeStoreValue("players", …, serments)` (`db.js:293-307`) : mêmes clamps + `progression.normalizePlayer(out, progression.effectiveDefinition(out.classe, serments_custom))`. Appliqué à chaque lecture (`get`, `get_all`, `session_bundle` `auth.js:542`) **sans réécrire la base** ; la migration est persistée « à la prochaine sauvegarde autorisée » (`auth.js:541`, `docs/fusion-xp.md`).

Seed de test représentatif (`scripts/helpers/local-app.js:26`) : `{id:'p_alice', name:'Alice', classe:'Mizu', level:1, xp:0, xpMax:30, pvMax:30, pvCur:30, epMax:50, epCur:50, emMax:20, emCur:20, progressionVersion:1, branch:'Aucune', journal:'Journal alice', avatar:'', inventory:[], history:[], statuts:[], equipment:{helmet:null,chest:null,legs:null}}`.

---

## 2. Formules de progression (exactes)

### 2.1 Seuil d'XP

`xpRequired(level) = max(1, floor(level)) × 30` (`progression.js:21`). Niveau 1 : 0/30 ; niveau 2 : /60 ; niveau 5 : /150 ; niveau 10 : /300.

### 2.2 Montée de niveau (`doLvlUp`, `main.js:9307-9319`)

```
tant que xp ≥ xpMax :
  xp -= xpMax ; level += 1 ; xpMax = level × 30
  si le serment est connu (getAllSD()[classe]) :
    pvMax += pvN ; pvCur = pvMax
    epMax += epN ; epCur = epMax
    emMax += emN ; emCur = emMax          ← soin complet à chaque niveau
  history.push({ ts, type:"level",
    text:"⬆ Niveau "+level+" ! PV:"+pvMax+" EP:"+epMax+" EM:"+emMax + (palier ? " — "+palier.nom+" débloqué" : ""),
    by:"Système" })
```

L'XP excédentaire est conservée (plusieurs niveaux possibles d'un coup). `palier` provient de `getSermPalierDefsFor(classe)` (§ 4.3). Testé par `test-gameplay-persistence.js:25-47` (xp 90 au niveau 1 → niveau 3, 0/90, stats 30+7+7=44 etc.).

### 2.3 Maxima théoriques à un niveau donné (recalcul staff)

`pvMax = 30 + (level − 1) × pvN`, `epMax = 50 + (level − 1) × epN`, `emMax = 20 + (level − 1) × emN`.
Utilisé par : `saveStats` (`main.js:9578-9580`), `adjVal('level')` (`main.js:9440`), `saveSerm` propagation si `level > 1` (`main.js:6749-6754`), et comme secours dans la migration (`progression.js:67`). Dans ces trois cas, les valeurs courantes sont plafonnées : `xCur = min(xCur, xMax)`.

> Attention : ce recalcul **écrase** tout bonus/malus de maximum accumulé (le test de migration mentionne explicitement « includes the existing +5 maximum bonus », `test-unified-progression.js:29`). Voir Questions ouvertes.

### 2.4 Récompense de combat (`updateXPPreview`/`applyXP`, `main.js:9347-9381`)

- Sélection d'un mob du bestiaire (`data-xp = beast.niv`) et d'un curseur « Participation du joueur » 0–100 % (défaut 100).
- `xpGain = ceil(niveau_mob × 10 × participation / 100)` ; refus si `≤ 0` (« XP = 0. Ajuste la participation. »).
- Historique : `{type:"xp", text:"+"+xpGain+" XP ("+nomMob+", "+part+"%)", by:"MJ "+CU.name}` puis `doLvlUp`.
- Toasts : « ⬆ <nom> — Niveau N ! » ou « +X XP → <nom>. ». Permission `manage_xp` (MJ, admin).
- Aperçu : « +X XP ⬆×k » / « Niveau a → b ! » / « XP : a → b / max ».

### 2.5 Ajustement manuel (admin, `adjVal`, `main.js:9435-9453`, permission `adjust_levels`)

- `field = "level"` (±1) : `level = max(1, old+delta)` ; `xpMax = level×30` ; `xp = min(xpMax−1, ceil(fractionAncienne × xpMax))` où `fractionAncienne = xp/max(1,xpMax)` ; recalcul § 2.3.
- `field = "xp"` (±10, ±50, ±100) : `xp = max(0, xp+delta)` puis `doLvlUp` (pas de descente de niveau par XP négative).
- Historique : `{type: delta<0 ? "remove" : "add", text:"Ajust. Niveau|XP : old → new", by:"MJ "+CU.name}` ; sysLog `adj_level`/`adj_xp` « [nom] Niveau : a → b (Δ+n) ».

### 2.6 Édition complète des stats (admin, `saveStats`, `main.js:9570-9602`)

Modale « Modifier les statistiques » (`main.js:3256-3280`) : PV/EP/EM actuels saisis, **max en lecture seule** (« Calculé automatiquement selon le niveau »), Niveau, XP, Casque/Torse/Jambes, Branche (boutons `Aucune`, `A — <style>`, `B — <style>` **construits depuis `SD` natif uniquement**, `main.js:9562-9566`).
Traitement : maxima § 2.3 (ou valeurs saisies si serment inconnu) ; `xCur = min(saisie, max)` ; `level`, `xp`, `xpMax` ; `doLvlUp` ; branche ; équipement ; historique `{type:"stat", text:"Stats mises à jour — Niveau L (PV:… EP:… EM:…)", by: CU.name}` ; sysLog `stats_modif`.

### 2.7 Combat → fiche (`combatEnd`, `main.js:12357-12400`)

Pour chaque combattant joueur non-invocation : `pvMax = f.pvMax − (f.pvMaxBonus||0)` ; `pvCur = min(f.pvCur, pvMax)` ; `epCur`, `emCur` copiés ; statuts de combat non présents ajoutés `{id, desc:"", posedBy, posedAt}` ; historique `{type:"combat", text:"⚔ "+nomCombat+" — "+round+"R · PV:"+f.pvCur+"/"+f.pvMax+" EP:"+f.epCur+"/"+f.epMax, by:"MJ "+nom, combatId}`. Aucune XP n'est distribuée automatiquement par le combat (l'XP passe par § 2.4). Écriture protégée par version (test `test-gameplay-persistence.js`).

### 2.8 Dégâts (rappel des règles publiques, `renderCombat`)

- « Dégâts = Damage de base (Serment) + Niveau du personnage. Exemple : Duelliste niveau 3 — Frappe = 11 + 3 = 14 PV infligés. » (`main.js:8717`) ; implémenté `cDamageWithLevel(base, level) = base + level` (`main.js:11470`), `dmgBase = serment.dmg || 6`.
- « Pugilat : … 3 + Niveau du porteur, 6 EP, 1 action. » (`main.js:8718`).
- Les capacités de palier lisent « N+Niv » dans leur description (`cFirstNumber`, `main.js:11466`) : le niveau utilisé est **le niveau du personnage** (`cGetFighterSerment` → `p.level`, `main.js:11461`).
- Surcadençage : `cSurcCost(base, n) = ceil(base × (1 + n × 0.5))` (`main.js:11441`), table publique ×2, ×2.5, ×3… (`main.js:8726-8734`).

---

## 3. Conversion des anciennes fiches (`progressionVersion`)

Source de vérité : `assets/js/progression.js` (UMD partagé) + `docs/fusion-xp.md` (décision du 24/09/2026, v297).

### 3.1 Algorithme `normalizePlayer(player, definition)` (`progression.js:45-80`)

1. `oldLevel = max(1, floor(level))`. Si `progressionVersion ≥ 1` → fiche unifiée : `xpMax = level×30`, `xp = max(0, floor(xp))` (les champs `sLevel…` résiduels sont **ignorés** puis supprimés).
2. Sinon (ancienne fiche) :
   - `character = legacyTrack(level, xp, xpMax, 30)` et `oath = legacyTrack(sLevel, sXp, sXpMax, 10)` : chaque piste résout d'abord les niveaux acquis si `xp ≥ seuil` (seuil initial = `xpMax` stocké ou `level×scale`, puis `level×scale` par sauts arithmétiques, `progression.js:27-44`) et renvoie `{level, fraction = xp/seuil}`.
   - Choix : niveau le plus élevé ; à égalité, fraction la plus élevée. **Jamais d'addition** des deux XP.
   - `level = chosen.level` ; `xpMax = level×30` ; `xp = min(xpMax−1, max(0, ceil(fraction×xpMax − 1e-10)))`.
3. `delta = level − oldLevel`. Si `delta > 0` : `growth = effectiveDefinition(classe) ⊕ definition` ; pour `pv(30)`, `ep(50)`, `em(20)` :
   - `oldMax = max(pv?1:0, xMax ?? xCur ?? base + gain×(oldLevel−1))`, `cur = max(0, xCur ?? oldMax)`
   - `nextMax = oldMax + delta × gain` ; `xMax = nextMax` ; `xCur = (pv && cur===0) ? 0 : max(0, nextMax − (oldMax − cur))` → **le déficit est conservé, un personnage à 0 PV reste à 0 PV, les bonus de max existants sont conservés**.
4. `progressionVersion = max(1, floor(progressionVersion))` ; suppression de `sLevel`, `sXp`, `sXpMax`.

`effectiveDefinition(classe, custom)` : `{pvN, epN, emN}` = `DEFAULT_GROWTH[classe]` (ou `[0,0,0]` si inconnu) fusionné avec `serments_custom[classe]` (`progression.js:22-26`). `DEFAULT_GROWTH` (`progression.js:8-14`) : Duelliste [6,6,2], Sauvageon [5,8,1], Croisé [8,3,2], Rôdeur [2,5,3], Traqueur [2,7,2], Flécheur [3,5,4], Elementaliste [4,4,4], Evocateur [2,3,6], Conjurateur [2,2,7], Arcaniste [1,1,8], Bretteur [5,7,3], Claymore [7,4,2], Lame d'Honneur [7,5,3] — un test vérifie l'égalité avec `SD` (`test-unified-progression.js:84-93`).

### 3.2 Exemples validés (`docs/fusion-xp.md` + tests)

| Avant : personnage | Avant : serment | Après |
|---|---|---|
| Niv 5, 30/150 | Niv 3, 20/30 | Niv 5, 30/150 |
| Niv 3, 60/90 | Niv 5, 20/50 | Niv 5, 60/150 (+2 niveaux de stats) |
| Niv 5, 30/150 | Niv 5, 30/50 | Niv 5, 90/150 |
| Niv 2, 15/60 ; PV 41/31 EP 56/20 EM 22/7 (Duelliste) | Niv 5, 25/50 | Niv 5, 75/150 ; PV 59/49, EP 74/38, EM 28/13 (`test-unified-progression.js:25-36`) |
| Niv 1, 0/30 | Niv 1, 65/10 | Niv 4, 15/120 |
| `progressionVersion:1, level:3, xp:10, xpMax:999, sLevel:100` | — | Niv 3, 10/90 (seuil réparé, XP historique ignorée) |

### 3.3 Où la conversion s'applique

- Lecture serveur : `get`, `get_all`, `session_bundle`, réponses des actions joueur (`db.js:305,865,957,1028`, `auth.js:542`).
- Écriture admin/MJ (`set players`) : `sanitizeForKey` normalise avec `serments_custom` courant (`db.js:968-969`) → migration persistée « une seule fois » (test `Admin imports migrate old records once`).
- Import JSON admin (`importDB`, `main.js:10875-10900`) : écrit `serments_custom` **avant** `players` (ordre des `entries`), pour que les gains personnalisés s'appliquent (test navigateur : Duelliste custom pvN 11 → niv 3, PV 52).
- Client : `_normalizePlayerRecord` à l'hydratation de chaque bundle (`main.js:870`).
- Idempotence garantie (`test-unified-progression.js:61-65`) ; les textes d'historique anciens ne sont pas réécrits.

---

## 4. Catalogue des serments — structure

### 4.1 Définition d'un serment (objet `SD[nom]`, `main.js:213-485`)

| Clé | Type | Sens |
|---|---|---|
| `arme` | string | Arme liée (affichée sous le nom, copiée dans `p.arme`). |
| `pvN`, `epN`, `emN` | int | Gains de PV/EP/EM par niveau (à partir du niveau 2). |
| `dmg` | int | « Dmg frappe » : dégâts de base de la frappe (+ niveau). |
| `type` | string | Type de dégâts de la frappe (« Tranchant », « Tranchant lourd », « Contondant », « Contondant (coup de poing pour les non-magiques) »). Non exploité mécaniquement. |
| `lore` | string | Texte narratif (peut contenir une « RÈGLE UNIVERSELLE » ou « RÈGLES DES INVOCATIONS » après `\n\n`). |
| `sermLevel` | string (optionnel) | Rang : absent = `basic` pour un serment natif, `singular` pour un custom (`getSermLevelKey`, `main.js:6114-6119`). |
| `hidden` | bool (optionnel) | Masqué de la vitrine publique, du sélecteur de création et du changement de serment (sauf serment actuel) (`main.js:6149-6152, 7035, 9463`). |
| `evolvesFrom` | string (optionnel) | Serment parent (lignée) ; affiché « Évolution de <parent> » ; `getSermFamilyRoot` remonte jusqu'à 12 niveaux. |
| `bA`, `bB` | objet | Branches natives A et B. Un custom utilise `branches:[]` à la place (`getBranches`, `main.js:6617-6625`). |
| `icon`, `cat` | string (custom seulement) | Icône et catégorie ; les natifs les prennent dans `WEAPON_ICONS` / `SERM_CATS`. |

Branche `{ nom, style, descPhys, flavor, paliers[] }` ; palier `{ niv, nom, cout, desc }`.
Les branches custom créées par l'atelier n'ont que `{ nom, style, desc, paliers }` (`main.js:6808`) — `descPhys`/`flavor` sont perdus (voir dette).

### 4.2 Tables de référence

**Rangs** (`SERM_LEVELS`, `main.js:6096-6104`) : `basic` « Basique », `seasoned` « Aguerri », `emeritus` « Émérite », `singular` « Singulier », `transcended` « Transcendé », `corrupted` « Corrompu », `other` « Autre ». Alias (`main.js:6105-6113`) : `base→basic`, `found/unique→singular`, `evolved/expert→emeritus`, `major/divine→transcended`.
Texte vitrine (`main.js:6173`) : « Les capacités se renforcent avec le niveau du personnage et son expérience commune. Les Serments du départ sont **Basiques**. Leur première évolution forme les **Aguerris**, actuellement gardés hors vitrine le temps d'être retravaillés. Plus loin, certains chemins deviennent **Émérites**, tandis que les voies **Singulières** peuvent tendre vers le **Transcendé** ou le **Corrompu**. »
Filtre public des rangs : `basic, emeritus, singular, transcended, corrupted` (pas `seasoned`, `main.js:6185`).

**Catégories de combat** (`SERM_CATS`, `main.js:6091-6095` ; libellés `getSermCatLabel`) : `melee` « Mêlée », `distance` « Distance », `magie` « Magie », `soutien` « Soutien ».
Duelliste, Bretteur, Claymore, Lame d'Honneur, Sauvageon, Croisé, Rôdeur, Traqueur, Elementaliste → `melee` ; Flécheur → `distance` ; Evocateur, Arcaniste → `magie` ; Conjurateur → `soutien`. Le sélecteur admin utilise la valeur `"mêlée"` (`main.js:3484`) normalisée en `melee`.

**Icônes** (`WEAPON_ICONS`, `main.js:6078-6082`) : ⚔ Duelliste/Bretteur/Claymore/Lame d'Honneur ; 🪓 Sauvageon ; 🛡 Croisé ; 🗡 Rôdeur (et « Rodeur ») ; 🏹 Traqueur/Flécheur (et « Flecheur ») ; 👊 Elementaliste (et « Élémentaliste ») ; 🪄 Evocateur (et « Évocateur ») ; ⛓ Conjurateur ; 🔮 Arcaniste ; défaut ✦.

**Couleurs de style** (`STYLE_COLORS`, `main.js:6083-6090`) : Brutalité rouge, Fluidité glacier, AOE violet, Précision violet, Offensif rouge, Aggro or, Mêlée rouge, Distance glacier, Épuisement violet, Contrôle glacier, Concentration or, Soin vert, Tank or, Équilibre offensif rouge, Équilibre d'accumulation glacier, AOE Indéfendable rouge, Précision Défendable glacier. (Une seconde table `STYLE_COLS`/`STYLE_GLYPHS` différente sert la modale de changement de branche, `main.js:6971-6972`.)

**Couleur PDF / bandeau** (`_sermColor`, `main.js:16274-16281`) : Duelliste #7eb8d4, Bretteur #89d89a, Claymore #c9a84c, Lame d'Honneur #c9a84c, Sauvageon #c94a4a, Croisé #c9a84c, Rôdeur #6db88a, Traqueur #c084d4, Flécheur #7eb8d4, « Élémentaliste » #c9a84c, « Évocateur » #c084d4, Conjurateur #6db88a, Arcaniste #a8d4f0, défaut #7eb8d4.

### 4.3 Paliers : niveaux et noms

| Rang | Niveaux | Noms (`SERM_PALIERS*`, `main.js:9299-9300`) |
|---|---|---|
| Basique (défaut) | 2, 5, 7, 10 | « Palier I — Éveil », « Palier II — Densité », « Palier III — Maîtrise », « Palier IV — Plénitude » |
| Aguerri (`seasoned`) | 10, 13, 16, 20 | « Aguerri I — Éveil », « Aguerri II — Densité », « Aguerri III — Maîtrise », « Aguerri IV — Plénitude » |

- `getSermPalierDefsFor(classe)` choisit la table selon le rang du serment (`main.js:9301-9304`) ; sert aux entrées d'historique de level-up et au PDF (`_palierNum` I–IV / `_palierLabel` Éveil/Densité/Maîtrise/Plénitude).
- Étiquettes d'étape dans la vitrine (`getPalierStageLabel`, `main.js:6158-6164`) : 1er « Débloqué », 2e « Renforcé », 3e « Maîtrisé », dernier « Parachevé », sinon « Palier n ».
- Table publique (`main.js:8795-8800`) : « I — Éveil / Niveau 2 / OUVERTURE — Première capacité. Le Serment s'ouvre. », « II — Densité / Niveau 5 / APPROFONDISSEMENT — La capacité se renforce. Le lien se densifie. », « III — Maîtrise / Niveau 7 / MAÎTRISE — La capacité se perfectionne. La maîtrise prend forme. », « IV — Plénitude / Niveau 10 / PLÉNITUDE — La capacité atteint son dernier palier basique. Le Serment atteint sa plénitude. »
- Règle : « Le rang (Basique, Aguerri, etc.) et la branche sont distincts du niveau chiffré. Atteindre un palier débloque les capacités prévues pour la branche ; cela ne transforme pas automatiquement un serment Basique en Aguerri. » (`docs/fusion-xp.md`).
- Sur la fiche, le palier **actif** est le dernier palier de la branche choisie dont `niv ≤ level` ; « Prochain : Niv. N · nom · coût » ; sans branche choisie, aucune capacité n'est active en combat (`cGetFighterSerment` retourne `null` si `!bundle.branch`, `main.js:11451`). En combat, si plusieurs paliers portent le même nom, seule la version débloquée la plus récente est proposée (`main.js:11452-11460`).
- Modale palier admin : « Niveau requis » limité à `2/5/7/10` (`main.js:3505`) — impossible de saisir 13/16/20 via l'UI.

### 4.4 Serments personnalisés (`serments_custom`)

Collection DB `serments_custom` : objet `{ "<nom>": { arme, lore, pvN, epN, emN, dmg, cat, sermLevel, hidden, icon, branches:[{nom, style, desc, paliers:[{niv, nom, cout, desc}]}] } }` (`main.js:6729-6738`). Fusion runtime `getAllSD() = SD ⊕ custom` (le custom **remplace** entièrement l'entrée native de même nom, `main.js:1620-1626`). Défauts de création : pvN 3, epN 5, emN 2, dmg 8, cat « mêlée », icône ✦, rang `singular`, visible. Un natif ne peut pas être supprimé (`main.js:6380`), seulement surchargé. `toggleSermVisibility` copie le natif dans le custom avec `hidden` inversé.
Écriture : admin (et designer côté serveur, `db.js:96`) ; l'UI exige `manage_stats` (admin) pour créer/éditer.
Propagation à la sauvegarde d'un serment existant (`main.js:6741-6767`) : pour chaque fiche de cette classe, `arme` resynchronisée, maxima recalculés § 2.3 si `level > 1`, historique `{type:"stat", text:"Serment synchronisé — données mises à jour depuis l'onglet Serments", by:"Système"}`. Renommer une branche renomme `p.branch` des porteurs (historique `type:"serment"` « Branche synchronisée — A → B ») ; supprimer une branche remet `"Aucune"` (« Branche retirée — retour à Aucune »).

---

## 5. Catalogue des serments — contenu intégral (`SD`, `main.js:213-485`)

Légende des colonnes numériques : `pvN/epN/emN` gains par niveau, `dmg` dégâts de base. Textes verbatim.

### 5.1 Duelliste — Basique, Mêlée, ⚔

Arme : « Épée moyenne du serment » · pvN 6 · epN 6 · emN 2 · dmg 11 · type « Tranchant ».

> Le Duelliste n'est pas appelé par la violence. Il est appelé par l'instant juste. Ce serment choisit les êtres capables de garder une ligne claire quand le combat devient confus, ceux qui savent que la victoire se joue parfois dans un demi-pas, une respiration retenue, un angle refusé. Son épée moyenne du serment ne cherche pas à impressionner : elle répond. Elle se place dans la main comme une décision ancienne, sobre, précise, presque familière. Le Duelliste est le combattant de la mesure et de l'exigence. Pas le plus brutal, pas le plus spectaculaire, mais celui qui transforme chaque mouvement en phrase nette. Face à lui, l'adversaire ne combat pas seulement une lame : il combat une lecture.

**Branche A — L'Élan Tranchant** · style « Brutalité »
- descPhys : « De loin, le sol crisse sous une impulsion brusque. Le corps s'élance, bas, rapide, et la lame arrive avec lui — avant même que l'adversaire ait compris ce qui s'est passé. De près : aucun élan. La lame s'enfonce plein centre, et dans le même geste, le porteur pousse — bras, épaule, poids du corps. L'adversaire part en arrière, les pieds quittent le sol une fraction de seconde. »
- flavor : « Cette branche donne au Duelliste son autorité la plus simple : décider de la distance. De loin, il transforme l'espace en accélération. De près, il transforme l'impact en recul forcé. L'adversaire ne choisit plus vraiment où se tient le combat ; il découvre seulement où le Duelliste l'a déplacé. »

| Niv | Nom | Coût | Description |
|---|---|---|---|
| 2 | Élan Tranchant | 6 EM — 1 action | À distance : dash vers la cible + frappe 6+Niv. Au corps à corps : frappe 10+Niv + repousse l'adversaire à distance (les deux doivent utiliser une action de déplacement pour se rapprocher). |
| 5 | Élan Tranchant | 6 EM — 1 action | À distance : 10+Niv. Au corps à corps : 14+Niv + repousse. |
| 7 | Élan Tranchant | 6 EM — 1 action | À distance : 14+Niv. Au corps à corps : 18+Niv + repousse. |
| 10 | Élan Tranchant | 6 EM — 1 action | À distance : 18+Niv. Au corps à corps : 22+Niv + repousse. |

**Branche B — Taille Double** · style « Fluidité »
- descPhys : « La lame trace une première ligne, puis revient sans pause dans l'autre sens. Deux mouvements qui n'en font qu'un — fluides, enchaînés, comme écrits d'avance. »
- flavor : « Taille Double n'est pas une pluie de coups. C'est une phrase en deux syllabes. La première oblige la défense à se révéler, la seconde punit l'espace qu'elle vient d'ouvrir. Le Duelliste ne frappe pas plus vite pour faire joli : il coupe le temps de réaction adverse en deux. »

| Niv | Nom | Coût | Description |
|---|---|---|---|
| 2 | Taille Double | 5 EM — 1 action | 2 frappes consécutives traitées individuellement. L'adversaire doit dépenser une défense séparée pour chacune. 5+Niv par frappe (total : 10+Niv×2). |
| 5 | Taille Double | 5 EM — 1 action | 8+Niv par frappe (total : 16+Niv×2). |
| 7 | Taille Double | 5 EM — 1 action | 11+Niv par frappe (total : 22+Niv×2). |
| 10 | Taille Double | 5 EM — 1 action | 14+Niv par frappe (total : 28+Niv×2). |

### 5.2 Bretteur — Aguerri, masqué, évolution de Duelliste, Mêlée, ⚔

Arme : « Épée fine du serment » · pvN 5 · epN 7 · emN 3 · dmg 12 · type « Tranchant » · `sermLevel:"seasoned"`, `hidden:true`, `evolvesFrom:"Duelliste"`.

> Le Bretteur est ce que devient le Duelliste quand la maîtrise cesse d'être droite et devient insaisissable. Il ne cherche plus seulement l'ouverture : il la fabrique. Sa lame fine du serment vit dans les appuis, les feintes, les micro-reculs, les gestes qui ressemblent à des erreurs jusqu'à ce qu'il soit trop tard. Le Bretteur impose un rythme nerveux, presque insolent. Il provoque une défense, la déplace d'un souffle, puis frappe exactement là où l'adversaire vient de se trahir. On ne le tient jamais tout à fait. On croit l'avoir lu, et c'est souvent à cet instant précis qu'il a déjà changé de phrase.

**Branche A — Feinte de Fer** · style « Précision »
- descPhys : « La lame part trop tôt, trop visible — presque volontairement. L'adversaire réagit, et c'est là que le vrai coup arrive, décalé d'un souffle, porté dans l'angle que la défense vient d'abandonner. »
- flavor : « Le Bretteur vend une erreur comme d'autres vendent une menace. Il donne à l'adversaire quelque chose à défendre, puis retire le sens du geste au dernier moment. La cible ne tombe pas dans un piège grossier ; elle tombe dans sa propre bonne réaction. »

| Niv | Nom | Coût | Description |
|---|---|---|---|
| 10 | Feinte de Fer | 6 EM — 1 action | Frappe 8+Niv. Si la cible utilise une défense, elle dépense 2 EP supplémentaires. Si elle ne défend pas, la frappe gagne +4 dégâts. |
| 13 | Feinte de Fer | 6 EM — 1 action | Frappe 12+Niv. Défense adverse : +3 EP dépensés. Sans défense : +6 dégâts. |
| 16 | Feinte de Fer | 6 EM — 1 action | Frappe 16+Niv. Défense adverse : +4 EP dépensés. Sans défense : +8 dégâts. |
| 20 | Feinte de Fer | 6 EM — 1 action | Frappe 20+Niv. Défense adverse : +5 EP dépensés. Sans défense : +10 dégâts. |

**Branche B — Pas Rompu** · style « Fluidité »
- descPhys : « Le Bretteur pivote au dernier instant. Le corps se décale, la lame accompagne le mouvement, et l'attaque adverse glisse dans le vide pendant qu'une ligne nette apparaît en retour. »
- flavor : « Pas Rompu n'est pas une fuite. C'est une disparition minuscule. Le Bretteur laisse l'attaque passer à l'endroit où il était, puis revient dans l'angle mort avec la cruauté tranquille de quelqu'un qui avait prévu le coup avant son départ. »

| Niv | Nom | Coût | Description |
|---|---|---|---|
| 10 | Pas Rompu | 5 EM — réaction | Lorsqu'une attaque ciblée est esquivée, le Bretteur peut riposter : 5+Niv dégâts. Utilisable 1 fois par tour. |
| 13 | Pas Rompu | 5 EM — réaction | Riposte après esquive : 8+Niv dégâts. Le Bretteur peut aussi se replacer à distance courte. |
| 16 | Pas Rompu | 5 EM — réaction | Riposte après esquive : 11+Niv dégâts. La prochaine attaque du Bretteur contre cette cible coûte -1 EP. |
| 20 | Pas Rompu | 5 EM — réaction | Riposte après esquive : 14+Niv dégâts. Si la cible a raté son attaque, elle perd 1 action de déplacement ce tour. |

### 5.3 Claymore — Aguerri, masqué, évolution de Duelliste, Mêlée, ⚔

Arme : « Claymore du serment » · pvN 7 · epN 4 · emN 2 · dmg 16 · type « Tranchant lourd » · `seasoned`, `hidden`, `evolvesFrom:"Duelliste"`.

> Le Claymore naît quand un Duelliste renonce à la finesse comme unique réponse et choisit le poids. Ce serment ne récompense pas la vitesse : il récompense l'engagement total. Sa grande lame du serment impose une question simple à chaque adversaire : es-tu vraiment prêt à recevoir ça ? Le porteur avance peu, mais chaque pas change la géographie du combat. Il lève la lame comme on lève une menace, accepte d'être lisible, et transforme cette lisibilité en terreur. Le Claymore ne surprend pas par l'angle. Il prévient, puis frappe quand même. Sa force est là : l'adversaire voit venir le coup et doute malgré tout de pouvoir l'arrêter.

**Branche A — Posture Haute** · style « Pression lourde »
- descPhys : « Le porteur remonte l'espadon au-dessus de l'épaule. La garde paraît ouverte, presque provocante, mais la lame suspendue annonce un coup si lourd que l'adversaire doit décider avant même qu'il parte. »
- flavor : « Posture Haute fait de la préparation une arme. Le Claymore annonce le danger, garde la lame suspendue, et force l'adversaire à vivre une seconde entière sous la promesse de l'impact. Ce n'est pas discret. C'est pire : c'est inévitable. »

| Niv | Nom | Coût | Description |
|---|---|---|---|
| 10 | Posture Haute | 6 EM — 1 action | Entre en posture jusqu'au prochain tour. La prochaine Frappe Haute coûte 10 EP, inflige 20+Niv dégâts et retire 12 EP si la cible bloque. |
| 13 | Posture Haute | 6 EM — 1 action | Frappe Haute : 24+Niv dégâts, 10 EP. Si la cible bloque, elle perd 14 EP. |
| 16 | Posture Haute | 6 EM — 1 action | Frappe Haute : 28+Niv dégâts, 10 EP. Si la cible bloque, elle perd 16 EP et ne peut pas se déplacer au prochain round. |
| 20 | Posture Haute | 6 EM — 1 action | Frappe Haute : 32+Niv dégâts, 10 EP. Si la cible bloque, elle perd 20 EP. Sur défense réussie, la cible subit tout de même 25% des dégâts sous forme d'impact. |

**Branche B — Fendre la Ligne** · style « Brise-ligne »
- descPhys : « L'espadon part en arc large, lent, plein. Ce n'est pas une coupe élégante : c'est une masse de métal qui traverse la garde, les appuis et la certitude de tenir bon. »
- flavor : « Fendre la Ligne n'est pas fait pour courir après les fuyards. C'est une réponse aux gardes, aux fronts, aux certitudes. Le Claymore frappe là où l'ennemi pensait tenir, jusqu'à ce que la position cesse d'être une protection et devienne un piège. »

| Niv | Nom | Coût | Description |
|---|---|---|---|
| 10 | Fendre la Ligne | 7 EM — 1 action | Frappe 10+Niv dégâts. Brise-ligne : si la cible bloque, le coup traverse le blocage et ajoute en dégâts le bonus que le blocage aurait retiré. Si la cible a déjà défendu ce tour, elle dépense +3 EP pour défendre cette attaque. |
| 13 | Fendre la Ligne | 7 EM — 1 action | Frappe 14+Niv dégâts. Brise-ligne : si la cible bloque, le coup traverse le blocage et ajoute en dégâts le bonus que le blocage aurait retiré. Contre une cible en garde, parade ou protection, ajoute +4 dégâts. |
| 16 | Fendre la Ligne | 7 EM — 1 action | Frappe 18+Niv dégâts. Brise-ligne : si la cible bloque, le coup traverse le blocage et ajoute en dégâts le bonus que le blocage aurait retiré. Une défense réussie ne permet pas à la cible de se replacer gratuitement. |
| 20 | Fendre la Ligne | 7 EM — 1 action | Frappe 22+Niv dégâts. Brise-ligne : si la cible bloque, le coup traverse le blocage et ajoute en dégâts le bonus que le blocage aurait retiré. Si la cible défend, sa prochaine défense coûte +2 EP jusqu'à la fin du tour suivant. |

### 5.4 Lame d'Honneur — Aguerri, masqué, évolution de Duelliste, Mêlée, ⚔

Arme : « Épée claire du serment » · pvN 7 · epN 5 · emN 3 · dmg 10 · type « Tranchant » · `seasoned`, `hidden`, `evolvesFrom:"Duelliste"`.

> La Lame d'Honneur ne protège pas le monde entier. Elle choisit une cible et transforme ce choix en serment. Là où d'autres combattants dispersent leur attention, elle resserre le champ de bataille jusqu'à ce qu'il ne reste qu'un duel, une faute à punir, une promesse à tenir. Sa lame claire ne brille pas pour faire joli : elle désigne. Une fois le duel juré, la Lame d'Honneur devient terrifiante contre l'adversaire choisi et presque volontairement médiocre contre le reste. Ce n'est pas une faiblesse accidentelle, c'est le prix de sa foi. Elle gagne en puissance parce qu'elle accepte de n'avoir qu'une obsession.

**Branche A — Duel Juré** · style « Duel »
- descPhys : « La Lame d'Honneur pointe une cible. Le monde ne disparaît pas, mais tout semble se resserrer entre deux corps, deux souffles, deux volontés. Chaque pas hors de ce duel paraît plus lourd, presque moins légitime. »
- flavor : « Duel Juré ferme la porte. L'EM investi devient une mise à prix spirituelle : il ne revient pas simplement avec le temps, parce qu'il appartient désormais à la promesse. La Lame d'Honneur gagne le droit de frapper sa cible comme une sentence, mais tout ce qui n'est pas cette cible devient secondaire, presque indigne de sa lame. »

| Niv | Nom | Coût | Description |
|---|---|---|---|
| 10 | Duel Juré | 5 EM — 1 action — EM non régénérable | Désigne une cible jusqu'à sa mort, la fin du combat ou rupture validée staff. Contre elle : +40% dégâts. Contre toute autre cible : -60% dégâts. Si la cible meurt, récupère jusqu'à 6 EP dépensés pendant ce duel. |
| 13 | Duel Juré | 5 EM — 1 action — EM non régénérable | Contre la cible jurée : +55% dégâts. Contre les autres : -70% dégâts. Si la cible meurt, récupère jusqu'à 9 EP dépensés pendant ce duel. |
| 16 | Duel Juré | 5 EM — 1 action — EM non régénérable | Contre la cible jurée : +70% dégâts. Contre les autres : -80% dégâts. Si la cible meurt, récupère jusqu'à 12 EP dépensés pendant ce duel. |
| 20 | Duel Juré | 5 EM — 1 action — EM non régénérable | Contre la cible jurée : +90% dégâts. Contre les autres : -90% dégâts. Si la cible meurt, récupère toute l'EP dépensée pendant ce duel, dans la limite de son maximum d'EP. |

**Branche B — Sentence du Duel** · style « Exécution »
- descPhys : « La lame claire ne cherche plus les ouvertures générales. Elle revient toujours vers la même présence, le même angle, la même faute. Chaque coup ressemble moins à une attaque qu'à une ligne de plus dans une condamnation. »
- flavor : « Sentence du Duel est la partie la plus froide du serment. Pas de panache inutile, pas de grande protection héroïque : seulement la même cible, encore, jusqu'à rupture. Chaque frappe rappelle que la Lame d'Honneur a choisi son ennemi et que ce choix doit aller au bout. »

| Niv | Nom | Coût | Description |
|---|---|---|---|
| 10 | Sentence du Duel | 4 EM — 1 action — cible jurée uniquement | Frappe 10+Niv dégâts. Si la cible est sous Duel Juré, ajoute +4 dégâts et marque 1 EP dépensé comme récupérable si elle meurt. |
| 13 | Sentence du Duel | 4 EM — 1 action — cible jurée uniquement | Frappe 14+Niv dégâts. Si la cible est sous Duel Juré, ajoute +7 dégâts et marque 2 EP dépensés comme récupérables si elle meurt. |
| 16 | Sentence du Duel | 4 EM — 1 action — cible jurée uniquement | Frappe 18+Niv dégâts. Si la cible est sous Duel Juré, ajoute +10 dégâts. Si elle défend, sa défense coûte +2 EP. |
| 20 | Sentence du Duel | 4 EM — 1 action — cible jurée uniquement | Frappe 22+Niv dégâts. Si la cible est sous Duel Juré, ajoute +14 dégâts. Si cette attaque tue la cible, la récupération d'EP du Duel Juré se déclenche immédiatement. |

### 5.5 Sauvageon — Basique, Mêlée, 🪓

Arme : « Hache à deux mains du serment » · pvN 5 · epN 8 · emN 1 · dmg 14 · type « Tranchant ».

> Le Sauvageon est le serment de ceux qui ont appris à vivre avant d'apprendre à se tenir droits. Il ne leur offre pas la brutalité : il la reconnaît déjà là, enfouie dans les épaules, dans la mâchoire, dans cette façon d'avancer quand tout conseille de reculer. Sa hache à deux mains du serment est une évidence primitive, lourde, presque insultante dans sa simplicité. Elle ne promet ni élégance ni pardon. Elle promet que quelque chose va céder. Le Sauvageon n'est pas seulement fort : il est habité par une survie ancienne, une rage utile, une endurance qui donne l'impression que le monde l'a cogné longtemps sans réussir à le coucher.

**Branche A — Spirale Brisante** · style « AOE »
- descPhys : « La hache s'abat sur le sol avec tout le poids du porteur. Le sol se fissure sous l'impact. Une onde de choc se propage en cercle — quiconque se tient à portée sent le sol lui échapper sous les pieds. »
- flavor : « Spirale Brisante est une décision sans nuance. Le Sauvageon ne demande pas au champ de bataille de se ranger proprement : il frappe le point qui doit exploser et accepte que tout ce qui traîne trop près paie le prix. C'est violent, dangereux, parfois sale, mais jamais hésitant. »

| Niv | Nom | Coût | Description |
|---|---|---|---|
| 2 | Spirale Brisante | 5 EM — 1 action | Frappe le sol. Toutes entités au corps à corps — ennemies ET alliées — subissent 8+Niv dégâts contondants. |
| 5 | Spirale Brisante | 5 EM — 1 action | 12+Niv à toutes entités au CAC. |
| 7 | Spirale Brisante | 5 EM — 1 action | 16+Niv à toutes entités au CAC. |
| 10 | Spirale Brisante | 5 EM — 1 action | 20+Niv à toutes entités au CAC. |

**Branche B — Lancer Bestial** · style « Précision »
- descPhys : « Aucune préparation. Aucun calcul apparent. Le Sauvageon saisit sa hache, pivote, et la lâche avec une force brute qui n'a rien d'élégant — et pourtant elle file droit, implacable, comme si la violence elle-même avait décidé de l'endroit où elle devait atterrir. »
- flavor : « Lancer Bestial transforme la hache en verdict. Le Sauvageon abandonne volontairement son arme pour envoyer toute sa force en ligne droite. Le risque fait partie de la beauté du geste : pendant un instant, il n'a plus rien en main, mais l'adversaire, lui, doit vivre avec ce qui vient de le percuter. »

| Niv | Nom | Coût | Description |
|---|---|---|---|
| 2 | Lancer Bestial | 8 EM — 1 action | Lance la hache sur une cible à distance : 18+Niv. Après le lancer, le porteur n'a plus son arme — réinvoquer (1 EM, 1 action) ou aller la récupérer (2 actions). |
| 5 | Lancer Bestial | 8 EM — 1 action | 24+Niv. |
| 7 | Lancer Bestial | 8 EM — 1 action | 30+Niv. |
| 10 | Lancer Bestial | 8 EM — 1 action | 38+Niv. |

### 5.6 Croisé — Basique, Mêlée, 🛡

Arme : « Bouclier du serment » · pvN 8 · epN 3 · emN 2 · dmg 6 · type « Contondant ».

> Le Croisé est un refus. Refus de reculer, refus de céder la place, refus de laisser le chaos décider seul de ce qui tombe. Ce serment ne cherche pas les âmes douces ; il cherche celles qui portent déjà un devoir trop lourd et qui continuent malgré tout. Son bouclier du serment n'est pas un accessoire défensif. C'est une frontière mobile, un morceau de mur arraché au monde et confié à deux bras. Le Croisé avance avec une gravité presque cérémonielle. Quand il se place, il dit sans parler : ici, ça ne passe plus. Ses victoires ne sont pas toujours rapides, mais elles ont la solidité des choses qu'on n'a pas réussi à faire plier.

**Branche A — Bash Cinglant** · style « Offensif »
- descPhys : « Le bouclier s'illumine d'une lueur jaunâtre, brève et sourde. Puis il part en travers — un choc brut, sans élégance. À chaque impact, quelque chose se renforce dans le Croisé — une résistance qui monte, comme si le combat lui-même nourrissait sa capacité à encaisser. »
- flavor : « Bash Cinglant rappelle que le bouclier n'est pas un objet passif. Chaque impact est une déclaration : le Croisé ne se contente pas d'encaisser, il répond avec le poids même de sa défense. Plus il frappe, plus son corps semble comprendre qu'il doit rester debout. »

| Niv | Nom | Coût | Description |
|---|---|---|---|
| 2 | Bash Cinglant | 6 EM — 1 action (CAC uniquement) | Frappe avec le bouclier : 5+Niv dégâts. Chaque hit augmente les PV maximum du Croisé de +3 PV max. Ces PV bonus disparaissent à la fin du combat. |
| 5 | Bash Cinglant | 6 EM — 1 action | 7+Niv dégâts. +5 PV max par hit. |
| 7 | Bash Cinglant | 6 EM — 1 action | 10+Niv dégâts. +7 PV max par hit. |
| 10 | Bash Cinglant | 6 EM — 1 action | 13+Niv dégâts. +10 PV max par hit. |

**Branche B — Appel du Bouclier** · style « Aggro »
- descPhys : « Le bouclier s'illumine d'une lueur jaunâtre, intense, presque aveuglante. Le Croisé le frappe contre le sol avec fracas. Il se dresse, immobile, regard fixe — et quelque chose dans cette lumière et cette posture dit aux ennemis que c'est lui, et lui seul, qu'ils doivent abattre. »
- flavor : « Appel du Bouclier n'est pas un cri pour attirer l'attention. C'est une injonction. Le Croisé devient le problème central de la scène, la cible qu'on ne peut plus ignorer. Chaque ennemi qui mord à l'appel renforce le mur qu'il essaie d'abattre. »

| Niv | Nom | Coût | Description |
|---|---|---|---|
| 2 | Appel du Bouclier | 6 EM — 1 action | Provoque toutes les entités ennemies à portée. +3+Niv PV max par monstre provoqué. Mobs intelligents : effet 1 tour. Mobs agressifs : permanent. Désactivable sans action. |
| 5 | Appel du Bouclier | 6 EM — 1 action | +5+Niv PV max par monstre provoqué. |
| 7 | Appel du Bouclier | 6 EM — 1 action | +7+Niv PV max par monstre provoqué. |
| 10 | Appel du Bouclier | 6 EM — 1 action | +10+Niv PV max par monstre provoqué. |

### 5.7 Rôdeur — Basique, Mêlée, 🗡

Arme : « Dague du serment » · pvN 2 · epN 5 · emN 3 · dmg 8 · type « Tranchant ».

> Le Rôdeur appartient aux bords du monde : couloirs mal éclairés, routes secondaires, ruines où l'on entend trop tard le pas qui approche. Ce serment choisit les êtres qui survivent par mouvement, par silence, par instinct. Sa dague du serment n'a rien d'une arme glorieuse. Elle est courte, nerveuse, personnelle, faite pour apparaître au moment exact où l'adversaire croyait encore contrôler la distance. Le Rôdeur ne domine pas le combat, il l'échappe. Il glisse hors des prises, revient dans les angles morts, transforme la fragilité en vitesse. Le danger chez lui n'est pas massif : il est soudain.

**Branche A — Rafale de Lames** · style « Mêlée »
- descPhys : « La dague ne s'arrête pas. Premier coup, deuxième, troisième — enchaînés sans temps mort, sans respiration. La main du Rôdeur disparaît dans une succession de gestes trop rapides pour être lus séparément. »
- flavor : « Rafale de Lames ne cherche pas le coup parfait. Elle noie la défense sous des décisions trop rapprochées. Trois entailles, trois urgences, une seule respiration pour comprendre. Le Rôdeur gagne parce que la cible n'a pas le temps de répondre correctement à tout. »

| Niv | Nom | Coût | Description |
|---|---|---|---|
| 2 | Rafale de Lames | 6 EM — 1 action | 3 frappes consécutives sur une même cible. Chaque frappe traitée individuellement (défense séparée pour chacune). 1+Niv par frappe (total : 3+Niv×3). |
| 5 | Rafale de Lames | 6 EM — 1 action | 3+Niv par frappe (total : 9+Niv×3). |
| 7 | Rafale de Lames | 6 EM — 1 action | 5+Niv par frappe (total : 15+Niv×3). |
| 10 | Rafale de Lames | 6 EM — 1 action | 7+Niv par frappe (total : 21+Niv×3). |

**Branche B — Lancer Lié** · style « Distance »
- descPhys : « La dague quitte la main, frappe, et revient — comme si un fil invisible la ramenait. Le Rôdeur n'attend pas. La lame est déjà de retour avant même que l'adversaire ait compris qu'elle était partie. »
- flavor : « Lancer Lié donne au Rôdeur une menace impossible à confisquer. La dague part, mord, revient. L'adversaire ne peut pas compter sur la perte de l'arme pour respirer : elle est déjà revenue, comme une mauvaise nouvelle qui connaît le chemin. »

| Niv | Nom | Coût | Description |
|---|---|---|---|
| 2 | Lancer Lié | 5 EM — 1 action | Lance la dague sur une cible à distance (hors CAC uniquement). 5+Niv. La dague revient automatiquement et gratuitement. |
| 5 | Lancer Lié | 5 EM — 1 action | 9+Niv. Retour automatique. |
| 7 | Lancer Lié | 5 EM — 1 action | 13+Niv. Retour automatique. |
| 10 | Lancer Lié | 5 EM — 1 action | 17+Niv. Retour automatique. |

### 5.8 Traqueur — Basique, Mêlée, 🏹

Arme : « Lance du serment » · pvN 2 · epN 7 · emN 2 · dmg 8 · type « Tranchant ».

> Le Traqueur ne chasse pas pour courir. Il chasse pour réduire les options. Ce serment reconnaît les esprits qui savent attendre, lire les habitudes, rendre chaque fuite un peu plus coûteuse que la précédente. Sa lance du serment n'est pas seulement une arme d'allonge ; c'est un compas froid, une manière de garder l'adversaire à la distance exacte où il souffre le plus. Le Traqueur ne cherche pas forcément la mort rapide. Il préfère l'épuisement, la pression, le terrain qui se referme. Face à lui, on a d'abord l'impression d'avoir encore le choix. Puis l'on comprend que ces choix étaient déjà prévus.

**Branche A — Lance Drainante** · style « Épuisement »
- descPhys : « La lance entre, ressort. Mais quelque chose reste — une douleur sourde, diffuse, qui court dans les membres. La cible bouge encore, mais chaque geste lui coûte un peu plus qu'avant. »
- flavor : « Lance Drainante est une blessure qui continue de parler après l'impact. La cible bouge encore, mais chaque geste devient plus lourd, chaque défense moins naturelle. Le Traqueur ne vole pas seulement de l'énergie : il vole la durée du combat. »

| Niv | Nom | Coût | Description |
|---|---|---|---|
| 2 | Lance Drainante | 5 EM — 1 action | Frappe la cible : 4+Niv dégâts. Simultanément : la cible perd 8 EP. |
| 5 | Lance Drainante | 5 EM — 1 action | 8+Niv dégâts. Cible perd 12 EP. |
| 7 | Lance Drainante | 5 EM — 1 action | 12+Niv dégâts. Cible perd 16 EP. |
| 10 | Lance Drainante | 5 EM — 1 action | 16+Niv dégâts. Cible perd 20 EP. |

**Branche B — Tenue de Ligne** · style « Contrôle »
- descPhys : « De loin : la lance se tend, précise, contrôlée. Elle atteint sans que le porteur ait bougé d'un pas. De près : la lance s'enfonce avec toute la puissance du Traqueur derrière elle, puis pousse — un mouvement brusque, sec, qui recrée la distance de force. »
- flavor : « Tenue de Ligne est la grammaire du Traqueur : loin, il atteint ; près, il repousse. Il ne gagne pas parce qu'il bouge davantage, mais parce qu'il impose à l'autre la distance exacte où la lance a raison. »

| Niv | Nom | Coût | Description |
|---|---|---|---|
| 2 | Tenue de Ligne | 5 EM — 1 action | À distance : frappe à portée de lance, 4+Niv. Au corps à corps : frappe puissante 10+Niv + repousse la cible à distance (les deux doivent utiliser une action de déplacement). |
| 5 | Tenue de Ligne | 5 EM — 1 action | Distance : 8+Niv. CAC : 16+Niv + repousse. |
| 7 | Tenue de Ligne | 5 EM — 1 action | Distance : 12+Niv. CAC : 22+Niv + repousse. |
| 10 | Tenue de Ligne | 5 EM — 1 action | Distance : 16+Niv. CAC : 28+Niv + repousse. |

### 5.9 Flécheur — Basique, Distance, 🏹

Arme : « Arc du serment » · pvN 3 · epN 5 · emN 4 · dmg 10 · type « Tranchant ».

> Le Flécheur est le serment de ceux qui savent attendre sans faiblir. Il ne récompense pas seulement la bonne vue ou la main stable ; il récompense la capacité à garder le monde entier immobile dans sa tête jusqu'à ce que la cible devienne évidente. Son arc du serment n'est pas une arme de panique. C'est une ligne tendue entre patience et conséquence. Le Flécheur paraît souvent distant, presque absent du tumulte, mais cette distance est une concentration. Il voit les trajectoires, les erreurs d'appui, les secondes où l'ennemi cesse de protéger son propre avenir. Quand il tire, ce n'est pas pour participer au combat. C'est pour le corriger.

**Branche A — Salve Aveugle** · style « AOE »
- descPhys : « Plusieurs flèches partent en même temps, en arc large. Elles ne cherchent pas une cible précise — elles saturent l'espace. Quiconque se trouve dans la zone reçoit. »
- flavor : « Salve Aveugle est le moment où le Flécheur renonce à la perfection pour contrôler une zone entière. Ce n'est pas élégant, pas propre, pas toujours confortable pour les alliés. Mais pendant quelques secondes, le terrain cesse d'appartenir à ceux qui s'y trouvent. »

| Niv | Nom | Coût | Description |
|---|---|---|---|
| 2 | Salve Aveugle | 6 EM — 1 action | Zone à distance. Toutes entités dans la zone — ennemies ET alliées — subissent 7+Niv. |
| 5 | Salve Aveugle | 6 EM — 1 action | 9+Niv à toutes entités dans la zone. |
| 7 | Salve Aveugle | 6 EM — 1 action | 12+Niv à toutes entités dans la zone. |
| 10 | Salve Aveugle | 6 EM — 1 action | 15+Niv à toutes entités dans la zone. |

**Branche B — Flèche de Jugement** · style « Concentration »
- descPhys : « Le Flécheur s'immobilise. Tout le reste disparaît — le mouvement, le bruit, les alliés. Il ne reste que la cible et la corde tendue à l'extrême. Plus il attend, plus la flèche porte loin et fort. Quand elle part, c'est une sentence. »
- flavor : « Flèche de Jugement transforme l'attente en poids. Chaque action conservée devient de la tension dans la corde, du silence dans le bras, de la certitude dans le tir. Quand la flèche part enfin, elle porte avec elle tout ce que le Flécheur a refusé de faire avant. »

| Niv | Nom | Coût | Description |
|---|---|---|---|
| 2 | Flèche de Jugement | 8 EM — coûte toutes les actions restantes du tour | 0 action sacrifiée : 7+Niv. 1 action : 14+Niv. 2 actions : 20+Niv. Interdit en surcadençage. |
| 5 | Flèche de Jugement | 8 EM | 0 action : 11+Niv. 1 action : 18+Niv. 2 actions : 26+Niv. |
| 7 | Flèche de Jugement | 8 EM | 0 action : 15+Niv. 1 action : 22+Niv. 2 actions : 32+Niv. |
| 10 | Flèche de Jugement | 8 EM | 0 action : 19+Niv. 1 action : 28+Niv. 2 actions : 38+Niv. |

### 5.10 Elementaliste — Basique, Mêlée, 👊

Clé de catalogue **sans accent** : `"Elementaliste"`. Arme : « Poing américain du serment serti de gemmes » · pvN 4 · epN 4 · emN 4 · dmg 7 · type « Contondant ».

> L'Élémentaliste est choisi par les âmes capables de porter deux catastrophes contraires sans se déchirer. Ce serment ne donne pas le feu, la glace, la foudre ou l'eau à quelqu'un qui veut seulement faire du bruit. Il répond à ceux qui savent alterner, contenir, relâcher, reprendre. Son poing américain serti de gemmes ressemble moins à une arme qu'à un verrou posé sur des forces trop anciennes pour être aimables. Chaque gemme retient une humeur du monde. Chaque frappe ouvre une serrure différente. L'Élémentaliste paraît souvent calme parce qu'il doit l'être : s'il cesse de tenir l'équilibre, ce ne sont plus ses poings qui parlent, mais les éléments qui commencent à le manger vivant.
>
> RÈGLE UNIVERSELLE — LE COMPTEUR ÉLÉMENTAIRE : Quelle que soit la branche choisie, l'Élémentaliste obéit à une loi fondamentale — les éléments exigent l'alternance. Chaque utilisation consécutive d'un même élément fait monter un compteur interne. À ±2, switcher vers l'élément opposé déclenche une combinaison élémentaire. Le compteur revient à 0. Un troisième coup consécutif sans switcher applique un malus de −25% aux dégâts (puis −50%, −75%...). Le corps de l'Élémentaliste trahit toujours son état : à ±2, le dernier élément utilisé commence à recouvrir son corps — flammes, givre, crépitements ou humidité — de plus en plus visible et incontrôlable.

**Branche A — Feu & Glace** · style « Équilibre offensif »
- descPhys : « Le poing s'embrase ou se couvre de givre à l'impact. Si le porteur insiste sans alterner, les flammes deviennent incontrôlables sur son bras, ou le givre commence à remonter sur ses articulations. Ce n'est plus lui qui contrôle — c'est l'élément qui le gagne. »
- flavor : « Feu & Glace est une danse dangereuse entre morsure et fracture. Le feu donne l'assaut, cher, violent, impatient. La glace répond plus sobrement, mais elle prépare les os, les plaques, les défenses à céder au mauvais moment. GIVRE-BRÛLURE transforme le froid accumulé en brûlure brutale ; EMBRASEMENT laisse la cible fissurée, prête à payer plus cher le prochain impact. »

| Niv | Nom | Coût | Description |
|---|---|---|---|
| 2 | Poing Ardent (6 EM) / Poing Polaire (4 EM) | 6 EM Feu / 4 EM Glace — 1 action CAC | Feu : 8+Niv (brûlure). Glace : 5+Niv (gel). GIVRE-BRÛLURE : +7+Niv bonus brûlure. EMBRASEMENT : Brise Armure +10 sur prochain coup reçu par la cible. |
| 5 | Poing Ardent / Poing Polaire | 6 EM / 4 EM | Feu : 11+Niv. Glace : 8+Niv. GIVRE-BRÛLURE : +12+Niv. EMBRASEMENT : +16. |
| 7 | Poing Ardent / Poing Polaire | 6 EM / 4 EM | Feu : 14+Niv. Glace : 11+Niv. GIVRE-BRÛLURE : +17+Niv. EMBRASEMENT : +22. |
| 10 | Poing Ardent / Poing Polaire | 6 EM / 4 EM | Feu : 17+Niv. Glace : 14+Niv. GIVRE-BRÛLURE : +24+Niv. EMBRASEMENT : +30. |

**Branche B — Foudre & Eau** · style « Équilibre d'accumulation »
- descPhys : « Le poing crépite ou s'humidifie à l'impact. Si le porteur abuse de la foudre, les crépitements remontent sous sa peau. L'eau en excès commence à peser, à perler, à s'épaissir autour de lui. »
- flavor : « Foudre & Eau ne cherche pas seulement à blesser : cette branche dérègle le souffle du combat. La foudre réveille le porteur, relance ses muscles, lui rend de l'élan. L'eau alourdit l'adversaire, s'infiltre dans ses appuis, rend chaque mouvement moins naturel. ÉLECTROCUTION recharge le corps ; NOYADE ÉLECTRIQUE vide celui d'en face. Le duel devient une circulation volée. »

| Niv | Nom | Coût | Description |
|---|---|---|---|
| 2 | Poing Foudre (4 EM) / Poing Aquatique (6 EM) | 4 EM Foudre / 6 EM Eau — 1 action CAC | Foudre : 6+Niv. Eau : 4+Niv (contondant). ÉLECTROCUTION : porteur regagne +10 EP. NOYADE ÉLECTRIQUE : cible perd -5 EP. |
| 5 | Poing Foudre / Poing Aquatique | 4 EM / 6 EM | Foudre : 9+Niv. Eau : 6+Niv. ÉLECTROCUTION : +16 EP. NOYADE : -8 EP. |
| 7 | Poing Foudre / Poing Aquatique | 4 EM / 6 EM | Foudre : 12+Niv. Eau : 8+Niv. ÉLECTROCUTION : +22 EP. NOYADE : -11 EP. |
| 10 | Poing Foudre / Poing Aquatique | 4 EM / 6 EM | Foudre : 15+Niv. Eau : 10+Niv. ÉLECTROCUTION : +30 EP. NOYADE : -15 EP. |

> Note d'implémentation : le simulateur applique en dur Feu 6 EM / Glace 4 EM, mais pour Foudre & Eau il code **Foudre 6 EM / Eau 4 EM** (`main.js:11625-11626`), à l'inverse de la description (Foudre 4 / Eau 6). Voir Questions ouvertes.

### 5.11 Evocateur — Basique, Magie, 🪄

Clé de catalogue **sans accent** : `"Evocateur"`. Arme : « Bâton du serment orné de runes et d'anneaux » · pvN 2 · epN 3 · emN 6 · dmg 4 · type « Contondant ».

> L'Évocateur n'est jamais complètement seul, même au milieu d'une pièce vide. Ce serment choisit les porteurs capables d'entendre une présence derrière le silence et de lui donner assez de forme pour qu'elle agisse. Il ne s'agit pas de dominer une créature comme un outil. Il s'agit de maintenir un pacte instable : appeler, nourrir, guider, puis assumer ce qui répond. Son bâton orné de runes et d'anneaux tinte parfois sans contact, comme si quelque chose testait déjà la solidité du lien. L'Évocateur ne porte pas toute sa puissance dans ses bras. Il la tient autour de lui, au bord du visible, prête à entrer en scène dès qu'il accepte d'en payer le prix.
>
> RÈGLES DES INVOCATIONS : Chaque invocation ne peut être appelée qu'une seule fois par combat. Si elle tombe, elle ne peut pas être réinvoquée. Les invocations agissent après leur porteur à chaque tour. Elles obéissent aux ordres gratuitement (sans action). En l'absence d'ordre, elles agissent de façon autonome. Elles ne peuvent pas surcadencer (2 actions max). Chaque action coûte de l'EM au porteur. Si le porteur n'a plus assez d'EM, l'invocation disparaît. Elles possèdent leurs propres PV — à 0, elles disparaissent définitivement.

**Branche A — La Tortue Bipède** · style « Tank »
- descPhys : « Elle émerge lentement, comme tirée d'un espace qui n'existe pas tout à fait. Sa carapace est dense, presque minérale, parcourue de lignes lumineuses qui pulsent au rythme de son porteur. Elle ne grogne pas. Elle se place. Et quand elle frappe, c'est avec la lenteur pesante de quelque chose qui n'a jamais eu besoin d'être rapide pour être dévastateur. »
- flavor : « La Tortue Bipède est une promesse de rempart. Elle ne brille pas par la vitesse, mais par cette certitude calme de se placer là où le danger arrive. En l'absence d'ordre, elle protège d'instinct son porteur. Elle frappe peu, mais chaque coup rappelle que même une défense peut avoir des poings. »

| Niv | Nom | Coût | Description |
|---|---|---|---|
| 2 | Tortue Bipède | 10 EM invoc / 6 EM par action | PV : 8+Niv. Frappe CAC : 4+Niv (contondants). 2 actions/tour. S'interpose automatiquement. |
| 5 | Tortue Bipède | 8 EM invoc / 5 EM par action | PV : 14+Niv. Frappe : 5+Niv. |
| 7 | Tortue Bipède | 6 EM invoc / 4 EM par action | PV : 20+Niv. Frappe : 6+Niv. |
| 10 | Tortue Bipède | 4 EM invoc / 3 EM par action | PV : 28+Niv. Frappe : 7+Niv. |

**Branche B — Le Crabe Canon** · style « Distance »
- descPhys : « Il apparaît en claquant ses pinces — deux masses d'énergie condensée qui crépitent à chaque chargement. Son corps translucide laisse voir les flux d'énergie qui circulent en lui. Quand il tire, le recul le fait reculer d'un pas. Il n'a pas d'yeux à proprement parler — juste deux points lumineux fixés en permanence sur ce que son porteur veut abattre. »
- flavor : « Le Crabe Canon est une batterie nerveuse posée sur pattes. Fragile, bruyant, presque ridicule jusqu'au premier tir. Il n'a aucune noblesse de duel, aucune solution au corps à corps : toute son existence est un angle, une ligne, un recul violent après l'impact. En l'absence d'ordre, il vise la menace la plus proche du porteur et transforme la distance en pression constante. »

| Niv | Nom | Coût | Description |
|---|---|---|---|
| 2 | Crabe Canon | 10 EM invoc / 6 EM par action | PV : 4+Niv. Tir à distance : 5+Niv (contondants). 2 actions/tour. Ne peut pas frapper au CAC. |
| 5 | Crabe Canon | 8 EM invoc / 5 EM par action | PV : 8+Niv. Tir : 6+Niv. |
| 7 | Crabe Canon | 6 EM invoc / 4 EM par action | PV : 12+Niv. Tir : 7+Niv. |
| 10 | Crabe Canon | 4 EM invoc / 3 EM par action | PV : 16+Niv. Tir : 8+Niv. |

### 5.12 Conjurateur — Basique, Soutien, ⛓

Arme : « Chaîne du serment » · pvN 2 · epN 2 · emN 7 · dmg 6 · type « Contondant ».

> Le Conjurateur est le serment des liens qui refusent de rompre. Il choisit les porteurs capables de sentir ce qui lâche chez les autres avant que la chute soit visible : une respiration trop courte, une posture qui tremble, une volonté qui se fend. Sa chaîne du serment est froide, lourde, presque brutale, mais elle ne sert pas seulement à frapper. Chaque maillon est un passage. La douleur peut y circuler, la force aussi, la vie parfois. Le Conjurateur combat rarement pour prendre la lumière. Il combat pour que les autres restent dans la scène assez longtemps pour gagner. Là où le champ de bataille disperse, il rattache. Là où les corps cèdent, il insiste.

**Branche A — Frappe Déchaînée** · style « Offensif »
- descPhys : « La chaîne siffle dans l'air et frappe avec une précision froide. Au moment de l'impact, un fil de lumière s'échappe du point de contact — invisible à l'œil non averti — et rejoint l'allié désigné. Ce n'est pas de la magie spectaculaire. C'est un transfert silencieux, presque médical. »
- flavor : « Frappe Déchaînée transforme l'offensive en circulation vitale. La chaîne blesse devant elle et rend ailleurs ce qu'elle vient d'arracher. Le Conjurateur ne choisit pas entre aider et frapper : il lie les deux gestes dans le même mouvement, comme si chaque impact ouvrait une veine de secours. »

| Niv | Nom | Coût | Description |
|---|---|---|---|
| 2 | Frappe Déchaînée | 5 EM — 1 action | Frappe : 4+Niv dégâts. Soin automatique : 4 PV sur un allié au choix (même tour, sans action supp.). |
| 5 | Frappe Déchaînée | 5 EM — 1 action | 6+Niv dégâts. Soin : 6 PV. |
| 7 | Frappe Déchaînée | 5 EM — 1 action | 8+Niv dégâts. Soin : 8 PV. |
| 10 | Frappe Déchaînée | 5 EM — 1 action | 10+Niv dégâts. Soin : 10 PV. |

**Branche B — Soin Enchaîné** · style « Soin »
- descPhys : « Le Conjurateur s'immobilise. La chaîne cesse de siffler — elle pend, tendue, comme si elle retenait quelque chose d'invisible. Plus il attend, plus la lumière qui court le long des maillons s'intensifie. Quand il relâche, ce n'est pas un geste — c'est une libération. La lumière quitte la chaîne d'un coup et rejoint sa cible comme une vague. Ce qui était brisé se referme. »
- flavor : « Soin Enchaîné est le refus pur de laisser quelqu'un tomber. Le Conjurateur cesse presque de combattre pour tenir un seul lien à deux mains. Plus il sacrifie de temps, plus la chaîne accumule de lumière, jusqu'à relâcher une vague de réparation massive. Ce n'est pas rapide. C'est obstiné. »

| Niv | Nom | Coût | Description |
|---|---|---|---|
| 2 | Soin Enchaîné | 12 EM — coûte toutes les actions restantes du tour | 0 action sacrifiée : 10+Niv PV soignés. 1 action : 18+Niv. 2 actions : 28+Niv. Interdit en surcadençage. |
| 5 | Soin Enchaîné | 12 EM | 0 action : 15+Niv. 1 action : 25+Niv. 2 actions : 38+Niv. |
| 7 | Soin Enchaîné | 12 EM | 0 action : 20+Niv. 1 action : 32+Niv. 2 actions : 48+Niv. |
| 10 | Soin Enchaîné | 12 EM | 0 action : 26+Niv. 1 action : 40+Niv. 2 actions : 60+Niv. |

### 5.13 Arcaniste — Basique, Magie, 🔮

Arme : « Orbe du serment » · pvN 1 · epN 1 · emN 8 · dmg 4 · type « Contondant (coup de poing pour les non-magiques) ».

> L'Arcaniste voit les coutures. Là où les autres perçoivent un mur, un corps, une trajectoire, lui devine les fils qui tiennent tout cela ensemble et les tensions qui pourraient les défaire. Ce serment ne donne pas une magie spectaculaire par accident : il confie à son porteur le droit terrible de toucher à la structure même des choses. Son orbe renferme une lueur captive, calme en apparence, mais dense comme une étoile tenue sous verre. L'Arcaniste semble souvent absent parce qu'une partie de lui écoute le monde craquer à bas bruit. Quand il agit, le geste peut être presque délicat. Le résultat, lui, ne l'est jamais. Chez lui, la destruction n'est pas une perte de contrôle : c'est une correction appliquée à la réalité.

**Branche A — Domaine Étoilé** · style « AOE Indéfendable »
- descPhys : « L'orbe s'illumine d'un blanc froid. Autour du porteur, l'air se troue — de petites perles lumineuses apparaissent, suspendues, presque silencieuses. Elles ne bougent pas. Elles attendent. Puis elles explosent toutes en même temps, dans un souffle sec et aveuglant. »
- flavor : « Domaine Étoilé ne vise pas une personne : il condamne un espace. Les défenses classiques n'ont rien à attraper, rien à parer, rien à bloquer. Il reste seulement une question : sortir à temps ou subir l'effondrement lumineux. Alliés et ennemis y sont traités avec la même indifférence cosmique. »

| Niv | Nom | Coût | Description |
|---|---|---|---|
| 2 | Domaine Étoilé | 8 EM — 1 action | Zone ciblée. Toutes entités dans la zone (alliées ET ennemies) : 14+Niv. INDÉFENDABLE — esquive, parade, blocage inefficaces. Seul le déplacement hors zone avant l'explosion permet d'échapper. |
| 5 | Domaine Étoilé | 8 EM — 1 action | 20+Niv. Indéfendable sauf déplacement. |
| 7 | Domaine Étoilé | 8 EM — 1 action | 26+Niv. Indéfendable sauf déplacement. |
| 10 | Domaine Étoilé | 8 EM — 1 action | 34+Niv. Indéfendable sauf déplacement. |

**Branche B — Rayon Étoilé** · style « Précision Défendable »
- descPhys : « L'orbe monte lentement, comme appelé. Au-dessus du porteur, une étoile prend forme — grande, presque tranquille, d'un blanc qui brûle les yeux sans prévenir. L'orbe s'aligne. Il n'y a pas d'hésitation. Le rayon part d'un seul coup, droit, absolu, comme si la distance entre le porteur et sa cible n'avait jamais existé. Ce qui est touché ne l'oublie pas. »
- flavor : « Rayon Étoilé est l'inverse du domaine : une seule ligne, une seule cible, une seule erreur possible. La puissance est monstrueuse, mais lisible. La cible peut tout tenter pour survivre. L'Arcaniste accepte ce risque parce qu'un rayon qui passe n'a plus besoin d'explication. »

| Niv | Nom | Coût | Description |
|---|---|---|---|
| 2 | Rayon Étoilé | 10 EM — 1 action | Rayon unique sur cible précise : 20+Niv. ENTIÈREMENT DÉFENDABLE — la cible peut esquiver, parer ou bloquer normalement. En contrepartie : dégâts les plus élevés du Serment. |
| 5 | Rayon Étoilé | 10 EM — 1 action | 28+Niv. Entièrement défendable. |
| 7 | Rayon Étoilé | 10 EM — 1 action | 36+Niv. Entièrement défendable. |
| 10 | Rayon Étoilé | 10 EM — 1 action | 46+Niv. Entièrement défendable. |

### 5.14 Récapitulatif numérique

| Serment | Rang | Cat. | Arme | pvN | epN | emN | dmg | PV/EP/EM au niv 10 |
|---|---|---|---|---|---|---|---|---|
| Duelliste | Basique | Mêlée | Épée moyenne du serment | 6 | 6 | 2 | 11 | 84 / 104 / 38 |
| Bretteur | Aguerri (masqué, ← Duelliste) | Mêlée | Épée fine du serment | 5 | 7 | 3 | 12 | 75 / 113 / 47 |
| Claymore | Aguerri (masqué, ← Duelliste) | Mêlée | Claymore du serment | 7 | 4 | 2 | 16 | 93 / 86 / 38 |
| Lame d'Honneur | Aguerri (masqué, ← Duelliste) | Mêlée | Épée claire du serment | 7 | 5 | 3 | 10 | 93 / 95 / 47 |
| Sauvageon | Basique | Mêlée | Hache à deux mains du serment | 5 | 8 | 1 | 14 | 75 / 122 / 29 |
| Croisé | Basique | Mêlée | Bouclier du serment | 8 | 3 | 2 | 6 | 102 / 77 / 38 |
| Rôdeur | Basique | Mêlée | Dague du serment | 2 | 5 | 3 | 8 | 48 / 95 / 47 |
| Traqueur | Basique | Mêlée | Lance du serment | 2 | 7 | 2 | 8 | 48 / 113 / 38 |
| Flécheur | Basique | Distance | Arc du serment | 3 | 5 | 4 | 10 | 57 / 95 / 56 |
| Elementaliste | Basique | Mêlée | Poing américain du serment serti de gemmes | 4 | 4 | 4 | 7 | 66 / 86 / 56 |
| Evocateur | Basique | Magie | Bâton du serment orné de runes et d'anneaux | 2 | 3 | 6 | 4 | 48 / 77 / 74 |
| Conjurateur | Basique | Soutien | Chaîne du serment | 2 | 2 | 7 | 6 | 48 / 68 / 83 |
| Arcaniste | Basique | Magie | Orbe du serment | 1 | 1 | 8 | 4 | 39 / 59 / 92 |

(Niveau 10 = base + 9 × gain.)

---

## 6. Gemmes de Sang

- Définition publique (glossaire, `main.js:8543`) : « Fragment cristallin extrait des créatures vaincues. Il en existe trois grades : Blanche (+5 XP), Incarnate (+20 XP) et Écarlate (+50 XP). Consommée lors de la fusion, elle apporte de l'expérience au personnage et contribue à débloquer les capacités de son serment. »
- Table publique (`main.js:8804-8808`) : « 💎 Gemme Blanche / +5 XP / Tout type de mob », « 💎 Gemme Incarnate / +20 XP / Mobs moyens ou puissants », « 💎 Gemme Écarlate / +50 XP / Mobs puissants / Élites uniquement ».
- **Représentation** : objets d'inventaire `category:"Gemme"`, `name` exact `"Gemme Blanche"`, `"Gemme Incarnate"`, `"Gemme Écarlate"` (créés par le drop, `main.js:12574`, id `"gem_"+Date.now()`, `qty:1`, `desc:"Obtenue sur : <créature>"` ; cumul par `name+category`).
- **Obtention (drop)** : à la mort d'une créature dont `beast.gem` contient une table `"1–50 : Aucune / 51–90 : Gemme Blanche / 91–100 : Gemme Incarnate"` (format `min[–-]max : gemme`, séparateur `/`, `parseGemTable` `main.js:12556-12561`), le MJ lance un D100 (« 🎲 Lancer le D100 »), attribue à un joueur du combat ou « ⏳ Décider plus tard » (drop en attente `{id:'pd…', beastId, beastName, gem, roll, round, fi, createdAt}` dans l'état du combat). Attribution : historique `{type:"gemme", text:"💎 "+gem+" (sur "+créature+" · "+roll+"/100)", by:"MJ "+nom}` ; toast « <gem> attribuée à <nom> ✓ ».
- **Fusion** (`applyGemXP`, `main.js:9414-9433`, permission `manage_xp`) : choix « Gemme Blanche +5 XP » / « Gemme Incarnate +20 XP » / « Gemme Écarlate +50 XP », quantité 1–99, bouton « Fusionner les gemmes ». Stock = somme des `qty` des items `category==="Gemme"` dont le nom normalisé (NFD, accents retirés, minuscules) vaut `"gemme blanche"`/`"blanche"`, etc. (`gemXPStock`, `main.js:9395-9401`). Refus « Pas assez de gemmes en inventaire (n disponible(s)). » ; aperçu « Après fusion : niveau L · xp / max XP · stock : n » ou « Stock insuffisant : n gemme(s) disponible(s). ». Retrait des gemmes item par item, `total = valeur × qty`, historique `{type:"gemme", text:"+"+total+" XP (fusion de "+qty+"× "+nom+")", by:"MJ "+nom}`, puis `doLvlUp`. **Crédit d'XP et retrait dans la même sauvegarde** ; un échec de sauvegarde annule les deux et n'affiche aucun succès (tests concurrence + navigateur).
- Affichage fiche (« Gemmes de Sang », `main.js:5768-5779`) : totaux par nom contenant `Blanche` (tag « ☾ Blanche ×n », classe `gb`), `Incarnate` (« ✦ Incarnate ×n », `gi`), `carlate` (« ✦ Écarlate ×n », `ge`) ; autres gemmes listées « nom ×qty » ; vide : « Aucune gemme. ». PDF : section « GEMMES DE SANG » (« Blanche xN », « Incarnate xN », « Ecarlate xN »).
- Statistique publique (`db.js:797-806, 840`) : `totalGemmes = max(stock actuel de gemmes, nombre d'entrées d'historique de type "gemme")`.

---

## 7. Inventaire, équipement, consommation

### 7.1 Objet d'inventaire

```json
{ "id": "i1727700001000", "name": "Potion boréale", "category": "Consommable", "qty": 2 }
```
- `id` : `"i"+Date.now()` (staff) ou `"gem_"+Date.now()` (drop) ; serveur : identifiant libre ≤ 180 caractères sans blancs de bord (`validActionId`).
- `category` (sélecteur « Catégorie », `main.js:3290`) : `"Équipement"`, `"Consommable"`, `"Gemme"`, `"Divers"`. Aucune autre validation ; champs supplémentaires (`desc`, `effect`, …) conservés.
- `qty` : entier ; un item à `qty ≤ 0` reste stocké mais est **invisible** (fiche, sélecteur de consommation, PDF, stock de gemmes) ; le retrait staff plancher à 0 sans supprimer (`main.js:9537`).
- Rendu fiche : groupé par catégorie (ordre d'apparition), carte « nom / catégorie / ×qty », vide « Inventaire vide. ». Prog-panel : grille simple.

### 7.2 Actions staff (`manage_items` : MJ, admin)

- « + Ajouter un item » (modale « Ajouter un item » : « Nom de l'item », « Quantité », « Catégorie », « Note IRP » placeholder « Contexte narratif... ») : fusion si même `name` **et** `category`, sinon nouvel item ; historique `{type:"item", text:"Ajout : "+q+"× "+nom+(note?" — "+note:""), by:"MJ "+nom}` ; toast « q× nom → <perso>. ».
- « − Retirer un item » (modale « Retirer un item » : sélection « nom (×qty) », « Quantité », « Note IRP ») : `qty = max(0, qty−q)` ; historique `{type:"item", text:"Retrait : q× nom — note", by:"MJ "+nom}`.

### 7.3 Consommation par le joueur (`playerConsume` + serveur `consume_own_item`)

- UI fiche « Déclarer une consommation » : « Objet à consommer » (items `qty>0`), « Contexte de la consommation » (placeholder « Décris quand et comment ton personnage utilise cet objet… »), bouton « Confirmer la consommation ». Actif uniquement sur **sa propre fiche** (`getViewPid()===CU.pid`) ; sinon tooltip « La consommation se déclare depuis ton propre personnage. ». Erreurs : « Choisis un item. », « La note ne doit pas dépasser 2 000 caractères. », « Item indisponible. ».
- Requête `{action:"consume_own_item", itemId, note, expectedVersion}` (champs stricts). Serveur (`db.js:903-917`) : compte lié requis (403 « Aucun personnage lié. »), item trouvé (404), `qty` entier sûr `> 0` sinon 409 `ITEM_UNAVAILABLE` ; `qty −= 1` ; historique `{ts (unique, incrémenté si collision), type:"item", text:"Consommé : "+escape(nom)+(note?" — "+escape(note):""), by: escape(perso.name)+" (joueur)"}`. **Aucune vérification de catégorie** (un « Équipement » est consommable). Réponse : uniquement la fiche du joueur (`filterValueForCaller`). Le cache client n'est mis à jour qu'après confirmation ; double-clic bloqué ; toast « <nom> consommé. » (`test-player-actions-front.js`).

### 7.4 Équipement

- Trois slots (`main.js:5898`) : `helmet` « Casque », `chest` « Plastron » (modale staff : « Torse »), `legs` « Jambières » (modale : « Jambes »). Valeurs = texte libre ou `null` ; vide affiché « Aucun équipement ». Silhouette SVG avec zones survolables `ez-h/ez-c/ez-l` (`index.html:7193-7207`).
- Édition : uniquement via la modale admin « Modifier les statistiques » (`saveStats`). Aucun lien mécanique entre équipement et stats ; aucune liaison avec les objets d'inventaire de catégorie « Équipement ».

---

## 8. Historique et récompenses (formats des entrées)

Structure : `{ ts:number, type:string, text:string(HTML autorisé côté client), by:string, combatId?:string }`. Conservé aux **200 dernières** entrées ; affiché 60 (avec filtres) ou 40 (sans), 15 dans le panneau staff, 6 dans le PDF (`text` tronqué à 70 caractères). Suppression d'une entrée : staff `manage_players` (« Supprimer cette entrée de l'historique ? »).

| `type` | Libellé filtre / icône / couleur (`HIST_TYPES`, `main.js:5928-5939, 5960`) | Producteurs et format exact du `text` | `by` |
|---|---|---|---|
| `level` | « Niveaux » ⬆ or | `doLvlUp` : `⬆ Niveau N ! PV:x EP:y EM:z[ — <palier> débloqué]` | « Système » |
| `xp` | « XP » ✦ glacier | `applyXP` : `+X XP (<mob>, <part>%)` | « MJ <nom> » |
| `gemme` | « Gemmes » 💎 violet | fusion : `+X XP (fusion de q× Gemme <T>)` ; drop : `💎 Gemme <T> (sur <créature> · r/100)` | « MJ <nom> » |
| `combat` | « Combats » ⚔ rouge | `combatEnd` : `⚔ <nom du combat> — <round>R · PV:a/b EP:c/d` + `combatId` | « MJ <nom> » |
| `item` | « Items » ◎ vert | `Ajout : q× nom[ — note]`, `Retrait : q× nom[ — note]`, `Consommé : nom[ — note]` | « MJ <nom> » / « <perso> (joueur) » |
| `stat` | « Stats » 📊 dim | `Stats mises à jour — Niveau L (PV:… EP:… EM:…)` ; `Serment synchronisé — données mises à jour depuis l'onglet Serments` ; statuts `⚠ <label>[ (<note>)]` / `✓ Retiré : <label>` | `CU.name` / « Système » / nom MJ |
| `serment` | « Serment » ⚜ glacier-dim | `Serment : <ancien> -> <nouveau>` ; `Branche : <ancienne> → <nouvelle>` ; `Branche synchronisée — A → B` ; `Branche retirée — retour à Aucune` | « Admin <nom> » / « Système » |
| `de` | « Dés » 🎲 or | **aucun producteur trouvé** dans `assets/js` (type hérité) | — |
| `add` | « Divers » + faint | `adjVal` delta ≥ 0 : `Ajust. Niveau|XP : a → b` ; `addNotifToPlayer` (texte libre) | « MJ <nom> » / « Système » |
| `remove` | (rendu comme « Divers ») | `adjVal` delta < 0 | « MJ <nom> » |

L'onglet « Historique de combat » de la fiche (`renderCombatHistFiche`, `main.js:5832-5894`) **re-parse** le texte des entrées `combat` : `(\d+) round`, `PV : (\d+)/(\d+)`, `EP : (\d+)/(\d+)`, nom = texte avant « — » sans « ⚔ ». Le format écrit par `combatEnd` (`3R · PV:19/30`) **ne correspond pas** à ces regex (pas d'espace avant « : », « R » et non « round ») → rounds « ? » et barres absentes pour les entrées récentes (voir Questions ouvertes).

Sélecteur de participation combat ne crée pas d'entrée `de`. Les jets D100 des drops sont uniquement loggés dans le combat (`cLog`).

---

## 9. Permissions et rôles (matrice)

Rôles (`_normalizeRoleClient`, `main.js:650-653`) : `joueur`, `mj`, `designer`, `admin`. `can(action)` (`main.js:1915-1925`) :

| Action | admin | mj | designer | joueur |
|---|---|---|---|---|
| `manage_players` (créer perso, supprimer entrée d'historique, lire journal, simulateur) | ✔ | ✔ | — | — |
| `manage_items` (ajouter/retirer items) | ✔ | ✔ | — | — |
| `manage_xp` (récompense combat, fusion gemmes) | ✔ | ✔ | — | — |
| `manage_stats` (stats, serment, branche, statuts, avatar d'autrui, atelier serments) | ✔ | — | — | — |
| `adjust_levels` (±niveau/XP) | ✔ | — | — | — |
| `delete_player` | ✔ | — | — | — |
| `manage_beasts`, `delete_beast` | ✔ | — | ✔ | — |
| `manage_mjs` | ✔ | — | — | — |

Serveur (`db.js`) : écriture `players` par `set` : admin et mj (`EXACT_WRITE_RULES`) ; pour un **MJ**, `validatePlayerWrite` (`db.js:428-461`) n'autorise que les champs `xp, xpMax, level, pvCur, pvMax, epCur, epMax, emCur, emMax, inventory, history, equipment, statuts` (+ `avatar`/`journal` de sa propre fiche) et interdit la suppression d'un personnage ; tout autre changement → 403 « Modification réservée à l'admin : <champ>. ». Lecture `players` : admin/mj toutes les fiches ; joueur uniquement la sienne (`filterValueForCaller`, `db.js:692-699`) ; designer aucune. `serments_custom` : écriture admin et designer.
Joueur : `patch_own_player` (`journal`, `avatar` seulement — « Seuls le journal et l'avatar peuvent être modifiés. »), `consume_own_item`, `dismiss_notifications`, `set_event_participation`. Toutes les écritures exigent `expectedVersion` (md5 de la collection) → 428 `VERSION_REQUIRED` / 409 `VERSION_CONFLICT`.

Règle publique de changement de serment (`main.js:8449-8454`) : « Voie IRP — Par l'aventure … validé par [le staff] » ; « Voie HRP — Correction administrative : possible uniquement si le personnage est encore au niveau 1. Dès le niveau 2, seule la voie narrative reste ouverte. » ; « Un changement de serment conserve le niveau et l'expérience du personnage. » — non appliquée par le code (l'admin peut changer à tout niveau).

---

## 10. Statuts (états IRP)

Catalogue `STATUT_EFFECTS` (`main.js:12474-12487`) : `saignement` « Saignement » #c94a4a 🩸 ; `empoisonne` « Empoisonné » #77b36b ☠ ; `brulure` « Brûlure » #d88a3d 🔥 ; `gel` « Gel » #7eb8d4 ❄ ; `etourdi` « Étourdi » #d7b56d 💫 ; `entrave` « Entravé » #8aa0b6 ⛓ ; `aveugle` « Aveuglé » #c7c4b8 ◌ ; `silence` « Silence » #8f8aa8 🔇 ; `peur` « Peur » #9e7bc2 😨 ; `fragilise` « Fragilisé » #d77c7c 🩹 ; `renforce` « Renforcé » #77b38f 🛡 ; `inspire` « Inspiré » #d8c27a ✦.

Sur la fiche (`renderStatutsFiche`, `main.js:12796-12840`, admin `manage_stats`) : `{id, desc, posedBy, posedAt}` ; sélecteur « + Ajouter… », champ « Note (optionnel) », bouton « Poser » ; toasts « <label> posé. » / « <label> retiré. » ; historique type `stat`. Vide : « Aucun statut actif. ». En combat, les statuts portent `{id, tours}` ; effets mécaniques : Saignement −3 PV/tour, Empoisonné −ceil(5 % PV max)/tour (`main.js:12512-12518`) ; en fin de combat, les statuts restants sont recopiés sur la fiche avec `desc:""`.

---

## 11. Journal de bord et visibilité

- Champ `journal` (string). Deux surfaces : carte « Journal de bord » de la fiche (`renderJournalFiche`, `main.js:5789-5830`) et onglet « 📓 Journal de bord — <nom> » (`renderJournal`, `main.js:10249-10278`).
- Droits UI fiche : édition si **propriétaire** (`CU.pid===p.id`) ou **admin** (`manage_stats`) ; **lecture seule pour MJ** (`manage_players`) ; sinon « Accès restreint. ». Mentions : « Visible par toi, les maîtres du jeu et les administrateurs. » (fiche) ; « Vous lisez le journal de <nom> en tant qu'Admin. » ; « Journal en lecture seule. » ; « Aucune entrée. ».
- Onglet Journal : placeholder « Tes notes, ton lore, tes secrets… Personne ne peut lire ceci sauf toi et les admins. » et mention « Visible uniquement par toi et les administrateurs. » — **contradiction** avec la fiche et avec `first-steps.js:101` (« Le journal de ta fiche est lisible par toi, les maîtres du jeu et les administrateurs … ce n'est pas un espace de notes réservé à toi seul. »). Le serveur renvoie bien le journal aux MJ (lecture de toutes les fiches).
- Sauvegarde : joueur via `patch_own_player` (`sanitizeText`, ≤ 25 000) ; admin via `set players`. Toast « Journal sauvegardé. » / « Journal non enregistré : <erreur> ».

---

## 12. Notifications

- Les notifications **sont** les entrées d'historique du personnage lié, triées par `ts` décroissant, max 50, moins les `ts` listés dans `notifDeleted` (`getPlayerNotifs`, `main.js:9965-9972`). Le staff voit en plus les comptes « EN ATTENTE DE LIAISON ».
- Classification visuelle par texte (`notifType`, `main.js:9982-9992`) : contient « Niveau » ou « ⬆ » → « Niveau » ⬆ ; « Gemme/gemme » → « Gemme » 💎 ; « Combat/combat/PV: » → « Combat » ⚔ ; « XP/xp » → « XP » ✦ ; sinon selon `type` `add` « Ajout » +, `remove` « Retrait » −, `consume` « Consommation » ◎ (type jamais produit).
- Effacement : bouton « TOUT EFFACER » ou ✕ par entrée → `{action:"dismiss_notifications", timestamp | all:true, expectedVersion}` ; **propre personnage uniquement** (« Tu peux effacer uniquement tes propres notifications. ») ; serveur 404 « Notification introuvable. » si le `ts` n'existe pas ; `notifDeleted` fusionné et purgé des ts disparus. Toast « Notifications effacées. ».
- Badge `#notif-count` = notifications + comptes en attente (staff).

---

## 13. Avatar et export PDF

### 13.1 Avatar
- Sources : URL saisie à la création, ou recadrage (`m-avatar-crop`, zoom, images récentes) exportant une data-URL compressée ≤ 350 000 caractères. Propriétaire : « Modifier l'avatar » depuis « Mon compte » (`renderProfil`, `main.js:3120,3128`) ou bouton ✎ sur la fiche (admin pour autrui, `main.js:5726`). Sauvegarde joueur via `patch_own_player {avatar}`. Toast « Avatar mis à jour. ». Fallback visuel : initiale du nom (`.savph`).

### 13.2 PDF (`exportFichePDF` / `_buildPDF`, `main.js:15964-16253`, jsPDF chargé à la demande depuis `./assets/vendor/jspdf/jspdf.umd.min.js`)
- Déclenché par le propriétaire (« Télécharger le PDF », « Ta fiche, avec toi. »). A4 portrait, fond `#09090f`, barre gauche 3 mm couleur du serment, bandeau « NUAGES POLAIRES », nom (22 pt), « <SERMENT> · NIV. n ».
- Blocs : PV/EP/EM (valeur/max + barre ; couleurs vert #6db88a / or #c9a84c / glacier #7eb8d4) ; « BRANCHE » (nom sans préfixe « Branche A — », « Capacité active : <palier.nom> — <palier.cout> ») et à droite « PALIER I–IV » + « Éveil/Densité/Maîtrise/Plénitude » ; « Expérience » `xp / xpMax XP` + barre ; « INVENTAIRE » (2 colonnes, 12 lignes, « ... et n autres items » au-delà de 24) ; « GEMMES DE SANG » ; « HISTORIQUE RÉCENT » (6 dernières, pastille colorée `add` vert, `remove`/`combat` rouge, `gemme` violet) ; pied « Nuages Polaires — Document Officiel » + date. Fichier `Fiche_<Nom_avec_underscores>.pdf`. Toast « Fiche de <nom> exportée. ».
- Test navigateur : le PDF ne doit contenir **qu'une** ligne d'XP et aucune mention « XP Serment / XP Personnage / SERMENT NIV. » (`test-unified-progression-browser.js:152-155`).

---

## 14. Fiche : structure et libellés (`index.html:7136-7259`)

Kicker « Le Compagnon / Dossier de personnage » ; en-tête : avatar, nom (`h1`), serment, arme, « Branche : <nom> ». Navigation « 01 Ressources », « 02 Équipement », « 03 Journal », « 04 Serment ».
- Chapitre 01 « Les forces du moment. » — « Ressources, progression et état du personnage. » : « Statistiques » (Points de Vie / Énergie Physique / Énergie Magique, `cur / max` + barres), « Progression » (« Niveau n », `xp / max XP`, barre ; note « Un seul niveau fait progresser tes statistiques et les capacités de ton serment. »), « Gemmes de Sang », « Statuts ».
- Chapitre 02 « Ce que tu emportes. » — « Équipement, objets et traces de leurs usages. » : « Équipement » (silhouette + slots), « Inventaire », « Déclarer une consommation », panneau MJ « ⚙ MJ — Inventaire », « Historique » avec filtres.
- Chapitre 03 « Les traces du voyage. » — « Notes de personnage et comptes rendus des combats. » : « Journal de bord », « Historique de combat ».
- Chapitre 04 « Le lien qui te définit. » — « Ton serment, ses branches et les capacités débloquées par ton niveau. » : carte serment (`renderSerm`, `main.js:7058-7150`) : icône, nom, arme, lignée, pastille de rang, stats « PV/niv, EP/niv, EM/niv, Dmg frappe », lore, branches avec badge « Ma branche », mini-progression des paliers (« Niv. n », `is-unlocked/is-current`), bloc « Palier actif » / « Départ — Aucun palier débloqué », « Prochain : Niv. n · nom · coût ».
- Boutons admin sur la fiche : « ✎ Stats », « ⇄ Serment », « ⇄ Branche ». États d'erreur : « Connexion requise », « Compte en attente — Ton compte n'est pas encore lié à un personnage. Un administrateur doit terminer la liaison avant d'ouvrir la fiche. », « Chargement de la fiche », « Fiche indisponible », « Fiche temporairement indisponible ».
- Liste staff « Joueurs » (`renderSPList`, `main.js:9093-9162`) : carte par personnage (avatar, nom, « <serment> — Niveau n », badges « Niv. n » + rôle du compte lié / « Non lié », vitals PV/EP/EM/XP, boutons « +Item », « −Item », « Stats », « XP », « Accéder », « Sup. »). Recherche sur nom, serment, branche, pseudo, rôle.
- Panneau « Progression du joueur » (`renderProgPanel`, `main.js:9202-9286`) : onglets « Expérience » (`manage_xp`), « Ajustement » (`adjust_levels`), « Inventaire », « Historique » ; texte « Une seule expérience fait progresser les statistiques et les capacités du serment. » ; « Récompense de combat » (« Mob vaincu », « Participation du joueur », « XP à attribuer », bouton « Attribuer l'XP ») ; « Choisir une gemme » … « Fusionner les gemmes » ; onglet Ajustement : « Le niveau détermine les statistiques et les capacités. Un ajout d'XP peut faire gagner des niveaux. ».

---

## 15. Garanties de persistance (à reproduire)

- Toute mutation de progression (`saveProgressionPlayer`, `main.js:9323-9340`) travaille sur un **brouillon cloné** ; le cache n'est réputé à jour qu'après `ok:true` non `skipped` ; en échec, rollback sauf si des données plus récentes sont arrivées entre-temps ; un verrou par collection interdit deux sauvegardes de progression simultanées (« Une sauvegarde de progression est déjà en cours. Réessaie après sa confirmation. »). `sysLog` n'est écrit qu'après confirmation (`test-progression-concurrency.js`).
- Une lecture (`get`, `get_all`, `session_bundle`) commencée avant/pendant une écriture ne peut pas écraser l'XP confirmée (`test-progression-reads.js`).
- Les actions joueur : requête minimale (intention), pas de mutation optimiste, double-clic bloqué, réponse tardive ignorée après changement de session, conflit 409 bloque la file jusqu'à rechargement (`test-player-actions-front.js`).
- Fin de combat : archive puis fiches, abandon si la révision `players` a changé (`test-gameplay-persistence.js`).

---

## 16. Questions ouvertes

1. **Soin complet au level-up vs déficits conservés à la migration.** `doLvlUp` remet PV/EP/EM au maximum (`main.js:9313`) ; `normalizePlayer` conserve le déficit et laisse un KO à 0 PV (`progression.js:72`). Quelle règle pour l'overhaul ?
2. **Recalcul des maxima « 30 + (L−1) × gain ».** `saveStats`, `adjVal('level')` et la propagation `saveSerm` écrasent tout bonus/malus de maximum, alors que la migration les préserve explicitement. Les bonus permanents de max font-ils partie du jeu (hors bonus temporaires de combat) ?
3. **Changement de serment sans recalcul des stats** (`saveChangeSerm`, `main.js:7047`) : le niveau/XP sont conservés (règle documentée) mais les maxima restent ceux de l'ancienne croissance. Faut-il recalculer selon le nouveau serment ?
4. **Journal : visible des MJ ou non ?** Fiche et guide de départ disent « toi, les MJ et les admins » ; l'onglet Journal dit « toi et les administrateurs ». Le serveur expose le journal aux MJ.
5. **Historique de combat de la fiche** : le parseur attend `N round` / `PV : a/b` alors que `combatEnd` écrit `NR · PV:a/b` (et `f.pvMax` avec bonus temporaire dans le texte). Le format à retenir doit être structuré (champs) plutôt que reparsé.
6. **Elementaliste, branche Foudre & Eau** : coûts EM inversés entre le texte (Foudre 4 / Eau 6) et le simulateur (`main.js:11625-11626`). Lequel fait foi ?
7. **Rangs Aguerris** : masqués « le temps d'être retravaillés » ; les paliers 13/16/20 ne sont pas saisissables dans l'atelier (`mpal-niv` = 2/5/7/10). Le passage Basique → Aguerri est « soumis aux règles d'évolution du serment » sans procédure codée. Quel flux prévoir ?
8. **Fiche narrative** : le règlement exige « nom, âge, Serment, statistiques de niveau, et présentation narrative minimale » (`main.js:8445`) ; le modèle n'a ni âge ni présentation. À ajouter ?
9. **Consommation** : aucun contrôle de catégorie (« Équipement » consommable) ni d'effet (`effect` libre). Faut-il un modèle d'effet (ex. « +20 PV ») ou rester purement déclaratif (note IRP) ?
10. **`createdAt` des personnages** jamais écrit ; **type d'historique `de`** jamais produit ; **`_sermColor`** utilise « Élémentaliste »/« Évocateur » accentués alors que les clés catalogue sont « Elementaliste »/« Evocateur » (couleur de repli). Nettoyer et fixer les clés canoniques (avec accents ?) et les alias.
11. **Branches custom** perdent `descPhys`/`flavor` ; la modale « Modifier les statistiques » ne propose que les branches natives `SD` (pas les branches custom ni un serment custom). Unifier sur `getBranches`.
12. **Inscription aux événements par nom de personnage** (homonymes refusés, `db.js:935`) : migrer vers l'id du personnage.
13. **Seuils XP** : `30 × niveau` ; le glossaire dit « quatre paliers adaptés à son rang ». Confirmer la courbe et l'éventuel plafond de niveau (aucun dans le compagnon ; 100 dans le prototype RPG).

---

## 17. Ce qu'il faut absolument préserver dans l'overhaul

1. **Une seule progression** : `level`, `xp`, `xpMax = level × 30`, `progressionVersion = 1` ; XP excédentaire conservée ; deux sources (combat `ceil(niv_mob × 10 × part%)`, gemmes 5/20/50) alimentant le même compteur ; fusion = crédit + retrait atomiques, refusée si stock insuffisant.
2. **Bases 30 PV / 50 EP / 20 EM** au niveau 1 pour tous, puis croissance `pvN/epN/emN` propre au serment (valeurs § 5.14), dégâts `dmg + niveau`, pugilat `3 + niveau`.
3. **Algorithme de conversion des anciennes fiches** (§ 3) et sa persistance « une seule fois », idempotente, définitions custom appliquées avant migration, gains jamais doublés.
4. **Le catalogue des 13 serments intégral** (lores, branches, descPhys/flavor, 4 paliers × 2 branches, coûts, noms d'armes, types de dégâts, rangs, lignée Duelliste → Bretteur/Claymore/Lame d'Honneur, catégories de combat, icônes, couleurs). Ce texte est l'identité du site.
5. **Paliers liés au niveau du personnage** : 2/5/7/10 (Basique) et 10/13/16/20 (Aguerri) ; noms « Éveil / Densité / Maîtrise / Plénitude » ; libellés « Débloqué / Renforcé / Maîtrisé / Parachevé » ; rang ≠ niveau ; palier actif = dernier palier ≤ niveau de la **branche choisie** ; « Aucune » branche = aucune capacité.
6. **Les taxonomies** : rangs (Basique, Aguerri, Émérite, Singulier, Transcendé, Corrompu, Autre), catégories (Mêlée, Distance, Magie, Soutien), catégories d'objets (Équipement, Consommable, Gemme, Divers), statuts (12 états et leurs libellés), types d'historique et leurs icônes/couleurs, formats des textes d'historique et le `by` (« Système », « MJ <nom> », « Admin <nom> », « <perso> (joueur) »).
7. **Gemmes de Sang** : noms exacts « Gemme Blanche / Incarnate / Écarlate », tags « ☾ Blanche », « ✦ Incarnate », « ✦ Écarlate », table de drop par créature + D100, drops en attente, `desc:"Obtenue sur : …"`.
8. **Matrice de droits** (§ 9) : joueur = journal, avatar, consommation, notifications, événements ; MJ = XP/gemmes/items/création de fiche/champs listés ; admin = stats, niveau, serment, branche, statuts, atelier serments, suppression. Contrôle de version obligatoire sur toute écriture, confirmation serveur avant tout affichage de succès, pas d'audit avant confirmation.
9. **Compagnon de table** : la fiche reste un dossier consulté pendant le RP Discord (ressources, progression, gemmes, statuts, équipement, inventaire, journal partagé avec les MJ, historique/notifications des décisions staff, PDF « Document Officiel »). La création et la liaison compte↔personnage restent des actes du staff ; l'inscription ne crée pas de fiche.
10. **Serments personnalisables** par le staff (création, surcharge d'un natif, masquage, branches/paliers, propagation aux fiches existantes avec entrée « Serment synchronisé »).
11. **Libellés de la fiche** (chapitres 01-04 et leurs sous-titres, « Le Compagnon / Dossier de personnage », « Un seul niveau fait progresser tes statistiques et les capacités de ton serment. », messages d'erreur/état) et du PDF.
12. Les **tests de règles** existants (`test-unified-progression*.js`, `test-progression-*.js`, `test-player-actions*.js`, `test-gameplay-persistence.js`) décrivent des invariants à reporter dans la nouvelle architecture.

## 18. Ce qui relève de la dérive / dette

- **Prototype RPG** (`assets/js/rpg-prototype.js`, collection `rpg_characters`, `db.js:347-376`) : progression parallèle (`need = level × 35`, `gold`, `hp/maxHp`, `equip weapon/armor/trinket`, carte de zones, `createCharacterFromLinkedPlayer` copiant `classe` → `oath`). Hors objectif « compagnon » ; à supprimer, ainsi que ses tests `test-rpg-*.js` et le pont depuis la fiche.
- **Historique reparsé en regex** (`renderCombatHistFiche`, `notifType` par mots-clés) et **texte HTML non échappé** dans `history[].text` (échappement serveur bricolé pour les entrées joueur) : passer à des entrées structurées `{kind, data}` rendues côté client.
- **Trois tables de couleurs/glyphes de styles** divergentes (`STYLE_COLORS`, `STYLE_COLS`/`STYLE_GLYPHS`, `_sermColor`) et clés de serments à l'orthographe hétérogène (`Elementaliste`/`Élémentaliste`, `Rodeur`/`Rôdeur`).
- **Recalcul des maxima « par formule »** dans trois endroits + soin complet au level-up, en contradiction avec la migration (déficits/bonus conservés).
- **Champ `xpMax` stocké** alors qu'il est toujours dérivé de `level`.
- **Filtre `de`** sans producteur, `type:"consume"` jamais émis, `createdAt` jamais écrit, bloc « m-addmj » informatif, doublons d'IDs de branches dans `oES` (natif seulement) vs `openChangeBranch` (bundle complet).
- **Atelier serments** : palier `niv` limité à 2/5/7/10 ; branches custom sans `descPhys`/`flavor` ; le custom remplace le natif entier (pas de diff) ; `cat` saisi « mêlée » puis normalisé.
- **Inscriptions d'événements par nom** de personnage (homonymes bloqués).
- **Contradiction de visibilité du journal** entre trois surfaces.
- **Doublons de normalisation** (client `_normalizePlayerRecord`, serveur `normalizeStoreValue`, `auth.js normalizePlayerRecord`) à unifier en un seul schéma partagé (comme `progression.js` l'a fait pour l'XP).
- **Statistique publique `totalGemmes = max(stock, fusions)`** : indicateur incohérent (mélange stock et flux).
- **Gestion des thèmes portée par le personnage** (`unlockedThemes`, `blockedThemes`, `earlyClouds*`) en doublon avec le compte : à rattacher au compte uniquement.
