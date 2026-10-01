# 04 — Bestiaire et contenu d'univers

Audit de spécification. Tous les chemins sont relatifs à `legacy\` (ex. `assets/js/main.js:733` = `legacy\assets\js\main.js` ligne 733). Les extraits de contenu verbatim sont dans `docs\overhaul\audit\contenu\` (index commenté en §4).

## 0. Périmètre et sources

| Sujet | Fichier(s) | Lignes clés |
|---|---|---|
| Normalisation d'une créature (client) | `assets/js/main.js` | `_normalizeBeastRecord` 733–815, `gb`/`sb` 1603–1607 |
| Normalisation d'une créature (serveur) | `netlify/functions/db.js` | 308–318 ; filtrage public 676–683 ; `stripInternalNotes` 399–409 |
| Bestiaire public (écran) | `index.html` | 7269–7288 (`#bestiaire`, `#p-bgrd`) |
| Bestiaire public (rendu **actif**) | `assets/js/beast-admin.js` | `renderBGrid` 323–375, `bCard` 299–321 (surchargent `main.js:7328` et `main.js:8010`) |
| Description étendue, menace, comportements | `assets/js/main.js` | 7413–7519, 7943–8008 |
| Atelier bestiaire (page, filtres, opérations) | `assets/js/beast-admin.js` | 136–298 (UI), 377–510 (opérations) |
| Panneau latéral « Fiche staff » | `assets/js/bestiary-admin-pass2.js` | 191–248 |
| Modales `m-addb` / `m-editb` | `assets/js/main.js` | 3315–3390 |
| Recadrage image | `assets/js/main.js` | `openBeastImgCrop` 2704–2718, `cropLoadLocalFile` 2773–2798, `_normalizeImageDataUrl` 692–703 |
| Zones d'apparition (gestionnaire) | `assets/js/main.js` | 7521–7786 |
| Zones côté générateur d'apparitions | `assets/js/main.js` | 13854–13860, 14019–14107 |
| Lieux (carte, masquée) | `assets/js/main.js` | `LIEU_TYPES` 15358–15365, 15367–15655 ; `TAB_POPUP_IDS` 5422 ; `// CARTE HIDDEN` 5619 |
| Permissions client | `assets/js/main.js` | `can` 1915–1925 ; gardes d'onglet 4365–4375, 5502–5513 |
| Permissions serveur | `netlify/functions/db.js` | `PUBLIC_KEYS` 75–78, `EXACT_WRITE_RULES` 89–97 |
| Ordre de chargement des scripts | `index.html` | `main.js` 7465 → `ui-patches.js` 7507 → `beast-admin.js` 8613 → `bestiary-admin-pass2.js` 8614 |

Rappel de l'objectif du propriétaire : **compagnon de jeu, pas jeu en ligne**. Le bestiaire est une page de consultation ; l'atelier est un outil de création staff. Le prototype RPG, la carte explorable et les combats jouables sont hors périmètre et cités uniquement comme dette.

---

## 1. Modèle de données

### 1.1 Forme JSON complète d'une créature

La forme canonique est produite **côté client** par `_normalizeBeastRecord` (`main.js:733–815`), appelée à chaque lecture (`gb()`) et à chaque écriture (`sb()`). L'objet est **reconstruit de zéro** : tout champ non listé ci-dessous est perdu à la première sauvegarde (voir §6.1). Les alias sont écrits en double dans la base.

```json
{
  "id": "b1727712000000",
  "nom": "Loup des brumes",          "name": "Loup des brumes",
  "sub": "Prédateur du givre",       "subtitle": "Prédateur du givre",
  "beh": "Agressif",                 "behavior": "Agressif",   "comportement": "Agressif",
  "niv": 3,                          "level": 3,
  "pv": 40,                          "hp": 40,                 "pvMax": 40,
  "ep": 20,                          "energy": 20,             "epMax": 20,
  "frappe": "8 + Niv. Tranchant",    "attack": "8 + Niv. Tranchant",
  "comp": "Morsure glacée : ...",    "skill": "...",           "ability": "...",
  "drops": "Fourrure, crocs",        "loot": "Fourrure, crocs",
  "gem": "1-10 Blanche",             "gemme": "1-10 Blanche",
  "desc": "Première phrase. Suite.", "description": "...",
  "img": "https://... | data:image/webp;base64,...", "image": "...",
  "hidden": false,
  "archived": false,
  "statuts": [],
  "qtyMin": 1, "qtyMax": 1, "spawnWeight": 1,
  "tags": [],
  "zones": ["[🌳]-forêt-centre", "Ruines"],
  "style": "",
  "citation": "",
  "adminNote": "Script MJ, gimmick, faiblesse cachée...",
  "createdAt": 1727712000000,
  "updatedAt": 1727712000000,
  "catalog": {
    "id": "…", "name": "…", "subtitle": "…", "behavior": "…", "level": 3, "pv": 40, "ep": 20,
    "frappe": "…", "comp": "…", "drops": "…", "gem": "…", "desc": "…", "img": "…",
    "hidden": false, "archived": false, "qtyMin": 1, "qtyMax": 1, "spawnWeight": 1, "tags": [], "zones": ["…"]
  }
}
```

Alias **lus** en entrée (`main.js:735–746, 778–786`) puis résolus vers le champ canonique : `name|label→nom`, `subtitle|sousTitre|sous_titre|typeLabel→sub`, `behavior|comportement|behaviour→beh` (défaut `Neutre`), `level→niv` (≥ 1), `hp|pvMax→pv` (≥ 1, défaut 20), `energy|epMax→ep` (≥ 0, défaut 20), `attack|basicAttack→frappe`, `skill|ability|signature→comp`, `loot|drop→drops`, `gemme|gemDrop→gem`, `description|lore→desc`, `image|avatar→img`, `statuses→statuts` (≤ 64), `minQty→qtyMin`, `maxQty→qtyMax`, `weight→spawnWeight` (forcé ≥ 1), `combatStyle→style`, `quote→citation`, `noteAdmin|mjNote→adminNote`. `tags` et `zones` : chaînes non vides, 24 max. `img` passe par `_normalizeImageDataUrl` (`main.js:692–703`) : seuls `data:image/(png|jpe?g|gif|webp|avif);base64,…` ou une URL `http(s)` sans identifiants sont conservés, sinon `''`.

Champs **écrits par `beast-admin.js` mais absents du modèle canonique** (`beast-admin.js:34–47, 390, 399`) : `isBoss`, `adminNotes`, `createdBy`, `updatedBy`, et les alias lus `isArchived`, `boss`, `mjNotes`, `staffNotes`, `ts`, `author`. Ils sont supprimés par `sb()` avant envoi (§6.1). Le générateur d'apparitions lit aussi `spawnMin`/`spawnMax` (`main.js:14042`) qui n'existent nulle part.

Normalisation **serveur** (`db.js:308–318`), minimale : `id` (défaut `b_<idx>`), `name` (défaut `Créature N`, ≤ 80 car.), `level` ≥ 1, `statuts` ≤ 64, dédoublonnage par `id`. Le serveur ne lit que `name`/`level` : il ne connaît ni `nom` ni `niv`. La valeur doit être une liste (`db.js:257–259`).

### 1.2 Tableau des champs : saisie, affichage, public

| Champ | Saisie atelier (`m-addb`/`m-editb`, `main.js:3321–3383`) | Carte publique | Atelier / staff |
|---|---|---|---|
| `nom` | `Nom` (placeholder « Nom de la créature »), **requis** | `.bnm` | titre, tri, recherche |
| `sub` | `Sous-titre` (« Prédateur du givre... ») | `.bsub` + placeholder image | idem |
| `beh` | `Comportement` select 1..5 = Gibier, Passif, Neutre, Agressif, Très agressif | tag coloré | tag, filtres |
| `niv` | `Niveau` (défaut 1, min 1) | `Niv. N` | stat, filtres min/max, tri |
| `pv`, `ep` | `PV` (défaut 20), `EP` (défaut 20) | table `PV`/`EP` | stats |
| `img` | `Image` (« https://... ») + recadrage | image ou placeholder | complétude |
| `zones` | `Zones` (« Forêt gelée, Ruines, Grotte... »), séparateurs `,` `;` retour ligne, 24 max (`main.js:7521–7532`) | — (jamais affiché) | gestionnaire de zones |
| `frappe` | `Frappe` (« Description des frappes... ») | table `Frappe` (texte brut) | complétude |
| `comp` | `Compétences` (« Compétences... ») | `COMPÉTENCE` | complétude |
| `drops` | `Drops` (« Ressources récupérables... ») | `BUTIN` | complétude (`butin` = drops ou gem) |
| `gem` | `Gemmes` (« Gemmes potentielles... ») | `DROP GEMME (D100)` | idem |
| `desc` | `Description` (« Description narrative... ») | description étendue (§3.3) | complétude |
| `adminNote` | `Note admin` (« Script MJ, gimmick, faiblesse cachée, loot spécial... ») ; doublon `Notes admin` injecté (`beast-admin.js:183,192`, « Notes MJ, gimmicks, IA, points faibles... ») | **jamais** (retiré serveur) | aperçu, panneau latéral |
| `hidden` | case `Masquée côté joueurs` | exclu | chip `Masquée` |
| `archived` | case `Archivée` | exclu | chip `Archivée`, filtre Statut |
| `isBoss` | case `Boss` « Marquer comme boss » (`beast-admin.js:182,191`) | — | chip `Boss`, filtre, +8 au score de danger — **non persisté** |
| `style`, `citation`, `tags`, `statuts`, `qtyMin/qtyMax`, `spawnWeight` | **aucune saisie** | `style` : jamais dans la carte active ; `citation` : jamais | `style` dans `Détails` (`STYLE DE COMBAT`) |
| `createdAt`, `updatedAt` | automatiques | — | tri, `Suivi staff` |

### 1.3 Comportements (référentiel)

Six valeurs connues (`BHL`, `main.js:7427–7440`) : `Gibier`, `Passif`, `Neutre`, `Agressif`, `Très agressif`, `Boss`, avec alias anglais/sans accent normalisés par `cBehaviorKey` (`main.js:7443–7448`). Couleurs `BHC` (`main.js:7413–7426`), icônes/indices `BHM` (`main.js:7475–7486`), textes longs `_beastBehaviorBlurb` (`main.js:7959–7969`) : tout est verbatim dans `contenu\comportements-creatures.md`. **Les formulaires ne proposent que 5 valeurs** ; `Boss` n'est atteignable que par import JSON, et une créature `beh: "Boss"` n'apparaît sous aucun bouton de filtre sauf `Tous` (`beast-admin.js:329`).

### 1.4 Menace, dangerosité, complétude, usage

- **Bande de menace** (`_beastThreatBand`, `main.js:7970–7977`) : `score = niv×2 + pv/8 + ep/10` → `≥ 28` **Menace majeure**, `≥ 18` **Menace élevée**, `≥ 10` **Menace sérieuse**, sinon **Menace modérée**. Affichée en minuscule dans la description publique (« … • menace modérée. »), en chip dans le panneau staff et l'aperçu (`Menace`).
- **Score de dangerosité** (tri `Dangerosité`, `beast-admin.js:51–54`) : même formule `+ 8` si `isBoss`.
- **Clé de menace** pour le filtre (`beast-admin.js:55–61`) : `major` / `high` / `serious` / `moderate` par regex sur la bande.
- **Complétude** (`beast-admin.js:62–70` et `bestiary-admin-pass2.js:31–39`) : manques possibles `image`, `description`, `frappe`, `compétence`, `butin` (ni `drops` ni `gem`). L'ancienne version `main.js:7162–7169` n'avait pas `butin`.
- **Usage en combat** (`beast-admin.js:83–108`) : parcourt les archives (`getAllCombatArchives` si `manage_mjs`, sinon `getCombatArchives`), ignore `_inProgress`, compte les `fighters` de `type:'beast'` par `bid|id` : `uses`, `deaths` (`pvCur ≤ 0`), `lastAt`, 5 derniers libellés de combat (`name|label`, défaut « Combat sans nom »). « Récent » = `lastAt` ≤ 30 jours (`beast-admin.js:343`).

### 1.5 Zones d'apparition

- Une zone est une **chaîne libre** portée par `beast.zones[]`. Le référentiel des noms = `spawn_lab_staff.customZones` (toujours préfixé des 5 zones par défaut, 80 max, `main.js:13854–13860, 13884–13893`) ∪ toutes les `zones` des créatures (`_beastZoneNames`, `main.js:7533–7550`, tri fr insensible à la casse).
- Zones par défaut (noms de salons Discord) : `[🌳]-forêt-aux-lianes`, `[🌳]-forêt-aux-arbres-sombres`, `[🌳]-arbre-géant`, `[🌳]-forêt-centre`, `[🌳]-lisière-du-canyon`.
- Côté générateur, une créature sans zone est rangée sous `Sans zone` (`__none__`) ; le pool exclut les créatures `hidden` mais **pas** les `archived` (`main.js:14059–14107`) — voir audit 03 §10.
- Aucun lien entre `zones` et `lieux` (§1.6) : deux vocabulaires disjoints.

Forme JSON du référentiel (extrait de `spawn_lab_staff`, `main.js:13873–13882`) :
```json
{ "schemaVersion": 2, "customZones": ["[🌳]-forêt-aux-lianes", "Ruines"], "totals": {}, "lastRuns": [], "totalDraws": 0, "lastGeneratedAt": 0, "lastGeneratedBy": "" }
```

### 1.6 Lieu (`lieux[]`) — donnée orpheline

```json
{ "id": "l1727712000000", "nom": "Havre Blanc", "type": "ville", "desc": "…", "notes": "…", "visible": true, "lat": 500, "lng": 800 }
```
(`saveLieu`, `main.js:15606–15629`). `type` ∈ `ville` « Ville / Village » 🏙 `#7eb8d4` · `ruine` « Ruines » 🏚 `#c9a84c` · `donjon` « Zone dangereuse » ⚔ `#c94a4a` · `nature` « Zone naturelle » 🌿 `#6db88a` · `poi` « Point d'intérêt » ★ `#c084d4` · `secret` « Zone secrète » 👁 `#585878` (`LIEU_TYPES`, `main.js:15358–15365`). L'onglet `#carte` existe (`index.html:7321`) mais son rendu est commenté (`main.js:5619`) et aucun bouton de navigation n'y mène ; la clé reste **publique en lecture** et écrite par l'admin (`db.js:76, 91`), sans filtrage de `visible` ni de `notes` (audit 05 §3.6). Toasts encore présents : « Donne un nom au lieu. », « Lieu ajouté — <nom> » / « Lieu modifié — <nom> », « Supprimer ce lieu ? », « Lieu supprimé. », « <nom> révélé aux joueurs. » / « <nom> masqué. ». À traiter comme dette (§6.6).

### 1.7 Règles de visibilité par rôle

| Acteur | Lecture `beasts` | Écriture `beasts` | UI |
|---|---|---|---|
| Visiteur (sans session) | clé publique (`db.js:75–78`) ; serveur retire `hidden` **ou** `archived` puis les clés `adminNote(s)`, `noteAdmin`, `staffNote(s)`, `mjNote(s)` récursivement, y compris dans `catalog` (`db.js:399–409, 676–683`) | non | Bestiaire public uniquement |
| `joueur` | idem visiteur (non staff) | non | idem |
| `mj` | liste complète (staff) | **autorisée serveur** (`EXACT_WRITE_RULES.mj`, `db.js:95`) mais `can('manage_beasts')` = faux (`main.js:1921`) → aucune UI ; l'onglet `bestiaire-admin` est refusé (`main.js:4374, 5511`) | Bestiaire public + `+ Combat` absent |
| `designer` | complète | `manage_beasts`, `delete_beast` (`main.js:1922`) ; serveur : `beasts`, `spawn_lab_staff` | Atelier complet, mais **pas** `combat-mj` ni `apparitions` (`mjTabs`, `main.js:4365`) |
| `admin` | complète | tout | Atelier complet + simulateur |

Côté client, le bestiaire public refiltre `!hidden && !archived` (`beast-admin.js:330`) ; en mode atelier, le filtre `Statut` gouverne (§2.2). Le bundle staff conserve `adminNotes` (`scripts/test-integration.js:18`) et le test `scripts/test-db-security.js:41–54` fige le retrait des notes en lecture publique.

---

## 2. Atelier bestiaire — opérations

### 2.1 Accès et écran (`renderBestiaryAdminPage`, `beast-admin.js:268–282`)

- Entrée : menu **Outils → Atelier bestiaire** (`index.html:7039`, classe `perm-designer`) et tiroir mobile (`7103`). Onglet `bestiaire-admin` (`data-private="true"`, `index.html:7294`), gardé par `can('manage_beasts')`.
- Refus : carte **Accès réservé** — « Création bestiaire est réservée aux admins et designers. »
- Tête : **Création bestiaire** — « Espace réservé admin/designer pour créer, corriger, archiver, importer et préparer les créatures. Le Bestiaire reste une page de consultation propre. » ; boutons `+ Nouvelle créature`, `Zones d’apparition`.
- Recherche `#beast-admin-search-input`, placeholder « Rechercher une créature, note, niveau, compétence... » (synchronisée avec la recherche publique, `beast-admin.js:217–221`). **La note n'est pas cherchée** : champs réellement parcourus `nom, sub, desc, comp, frappe, drops, gem, niv` (`beast-admin.js:331`).
- Mêmes boutons de comportement/tri que le public (§3.2), puis bloc **Atelier Bestiaire** (tag `Admin`) « Recherche, tri et édition rapide. Les outils lourds sont rangés pour garder la page lisible. » avec menu `Outils` (`Importer JSON`, `Exporter tout`, `Reset filtres`).
- Compteurs (`beast-admin.js:125–135`) : `Total` (toutes créatures) · `Affichées` (après filtres) · `À finir` (incomplètes, toutes) · `Jouées` (usage > 0).
- Sur desktop ≥ 1180 px, `bestiary-admin-pass2.js` (117–137) place la grille dans une coquille deux colonnes avec un panneau `aside#beast-admin-detail` collant (§2.15).

### 2.2 Filtres et tris propres à l'atelier (`beast-admin.js:156–166, 332–364`)

| Filtre | Valeurs (défaut en gras) | Règle |
|---|---|---|
| Statut | **Actives** (`active`), Toutes, Publiées, Masquées, Archivées | `active` : `!archived` ; `published` : `!hidden && !archived` ; `hidden` : `hidden && !archived` ; `archived` : `archived` |
| Tri | **Modifiées récemment**, Plus anciennes, Nom A → Z, Nom Z → A, Niveau décroissant, Niveau croissant, Dangerosité, Usage combat, Publiées d'abord | `updated_desc` sur `updatedAt||createdAt` ; `published_first` : publiée 0 < masquée 1 < archivée 2 puis nom |
| Image | **Toutes**, Avec image, Sans image | `img` non vide |
| Usage en combat | **Toutes**, Utilisées récemment, Déjà utilisées, Jamais utilisées | `recent` ≤ 30 j ; `used` uses > 0 ; `never` uses = 0 |
| Boss | **Tous**, Boss, Normales | `isBoss` (jamais vrai après rechargement, §6.1) |
| Menace | **Toutes**, Modérée, Sérieuse, Élevée, Majeure | clé §1.4 |
| Complétude | **Toutes**, Complètes, À finir | §1.4 |
| Niveau min. / Niveau max. | vides (placeholders `1` / `30`) | bornes inclusives sur `niv` |

Les tris publics `PV ↕` / `Niv ↕` / `A→Z` s'appliquent **après** le tri atelier et l'écrasent (`beast-admin.js:368–370`). `Reset filtres` (`beastAdminResetFilters`, 284–292) remet tout, vide la recherche et réactive `Tous`.

### 2.3 Créer (`addBeast`, `beast-admin.js:384–392`)

- Qui : `manage_beasts` ; sinon toast `Permission insuffisante.` (err).
- Entrée : modale **Nouvelle créature** (`m-addb`, champs §1.2), boutons `Annuler` / `Créer`.
- Validation : `Nom` non vide, sinon `Nom requis.` (err). Aucune autre validation ; `niv` invalide → 1, `pv`/`ep` invalides → 20.
- Effet : `id = 'b' + Date.now()`, `beh` = valeur du select (défaut `Neutre`), `zones` parsées, `createdAt = updatedAt = now`, ajout **en fin** de liste (`push`), sauvegarde par `_beastPersist` (§2.14). Succès : fermeture, remise à zéro du formulaire, toast `<nom> ajouté.` (ok).

### 2.4 Éditer (`openEditBeast` / `saveEditBeast`, `beast-admin.js:377–400`)

- Qui : `manage_beasts` ; sinon `Non autorisé.` (err).
- Entrée : bouton `Éditer` (carte, panneau, aperçu) → modale **Modifier la créature** (`m-editb`), pré-remplie ; `Comportement` remappé `Gibier→1 … Très agressif→5`, `Boss→3` (donc **un Boss importé redevient Neutre** à la première édition). Boutons `Annuler` / `Enregistrer`.
- Validation : créature introuvable → `#eb-err` « Créature introuvable. ». Un `Nom` vide, un `Niveau`/`PV`/`EP` invalide ou une `Frappe` vide **conservent l'ancienne valeur** (`||b.nom`, `||b.frappe`…) : impossible de vider la frappe par ce formulaire.
- Effet : `updatedAt = now`, sauvegarde, fermeture, toast `<nom> mis à jour.` (ok). Si l'édition venait du gestionnaire de zones, celui-ci se rouvre sur la même zone (`main.js:9674–9678`, chemin `beastZoneOpenEditMob`).

### 2.5 Image (`openBeastImgCrop`, `main.js:2704–2718`)

- Qui : `manage_beasts` ; sinon `Non autorisé.`.
- Entrée : clic sur la vignette de la carte atelier (`title="Importer / recadrer une image"`, overlay `✎`) → modale de recadrage titrée « Importer / recadrer l'image — <nom> », champ `crop-url` (« https://i.imgur.com/... »), source « Image actuelle » si une image existe, fichier local.
- Validation fichier (`main.js:2773–2798`) : type `image/*` sinon « Le fichier sélectionné n'est pas une image. » ; taille ≤ 10 Mo sinon « Image trop lourde. Garde un fichier de 10 Mo max avant recadrage. » ; lecture impossible → « Impossible de lire le fichier local. ».
- Effet : le recadrage produit une data-URL stockée dans `img` (le pipeline de recadrage est partagé avec l'avatar de personnage, `main.js:2720–2753`). Le champ texte `Image` de la modale d'édition accepte aussi une URL directe.

### 2.6 Aperçu (`previewBeastAdmin`, `beast-admin.js:420–452`)

- Qui : tout appelant staff de l'atelier (pas de garde explicite).
- Entrée : menu `Plus → Aperçu`. Modale **Aperçu bestiaire** (`m-beast-admin-preview`, `beast-admin.js:201–211`).
- Contenu : image ou initiale ; chips comportement, `Boss`, statut, complétude ; nom, sous-titre, description étendue ; grille `Niveau` / `PV` / `EP` / `Menace` ; bloc `Complétude` (« Fiche complète. » ou « Éléments manquants : <liste> », puis `Créée : <date>` / `Modifiée : <date>`) ; bloc `Usage combat` (`Apparitions`, `Morts`, `Dernière apparition`, liste des combats) ; `COMPÉTENCE`, `FRAPPE`, `BUTIN`, `DROP GEMME` ; `Notes admin` (« Aucune note staff. »). Dates `dd/mm/yyyy hh:mm` fr-FR ou `Jamais`.
- Ce n'est **pas** un aperçu de la carte publique : mise en page différente de `bCard`.

### 2.7 Dupliquer (`duplicateBeast`, `beast-admin.js:413–419`)

- Qui : `manage_beasts`. Entrée : `Plus → Dupliquer`.
- Effet : copie profonde, `id = 'b' + now`, `nom + " (copie)"`, dates remises à `now`, `archived = false` (le `hidden` est conservé), insertion **en tête** (`unshift`). Toast `<nom> (copie) créée.`.

### 2.8 Publier / masquer

- Chemin **réel** dans l'atelier : case `Masquée côté joueurs` de la modale d'édition (§2.4). Aucune carte ni panneau n'expose de bascule.
- `toggleBeastHidden` (`beast-admin.js:501–510`) existe (toasts `<nom> masqué aux joueurs.` / `<nom> publié.`) mais n'est appelée par aucun élément d'interface actif ; l'interrupteur de l'ancienne carte `main.js:8064–8067` est mort (surcharge). Elle reste sous test (`test-beast-persistence.js:55`).

### 2.9 Archiver / restaurer (`toggleBeastArchived`, `beast-admin.js:408–412`)

- Qui : `manage_beasts`. Entrée : `Plus → Archiver` / `Restaurer` (libellé selon état), sans confirmation.
- Effet : bascule `archived`, `updatedAt = now`, toast `<nom> archivée.` / `<nom> restaurée.`. Une archivée disparaît du public, du filtre `Actives`, mais **reste** dans le pool du générateur (§1.5).

### 2.10 Purger (`delBeast`, `beast-admin.js:401–407`)

- Qui : `delete_beast` (admin, designer) ; sinon `Permission insuffisante.`. Entrée : `Plus → Purger` (bouton rouge, visible seulement si `delete_beast`).
- Confirmation native : « Purger définitivement "<nom>" ? L'archive et l'historique d'usage ne seront pas supprimés des combats déjà joués. »
- Effet : retrait de la liste, toast `Créature supprimée.` (inf). Les archives de combat gardent leurs `fighters` (`bid` orphelin) ; le compteur d'accueil `Créatures vaincues` (`hf-creatures`, `db.js:703–711, 793–841`) n'est pas affecté.

### 2.11 JSON — export et import (`beast-admin.js:453–492`)

- `Plus → JSON` : téléchargement `<nom-slug>.json` (caractères hors `[a-z0-9-_]` → `_`, minuscules) contenant la créature **telle qu'en cache** (`adminNote` et `catalog` inclus).
- `Outils → Exporter tout` : `bestiaire-nuages-polaires.json`, tableau complet (masquées et archivées incluses). C'est le seul moyen d'extraire le contenu réel du bestiaire (§7).
- `Outils → Importer JSON` : sélecteur `.json`. Formats acceptés : tableau, objet `{ "beasts": [...] }`, ou objet unique ; chaque entrée doit être un objet (sinon « Le fichier doit contenir une créature ou une liste de créatures. »). Erreurs : « JSON invalide. » (syntaxe), « Impossible de lire le fichier. ». Effet : `id` régénéré si absent ou en collision (`'b' + now.toString(36) + idx`), `createdAt` conservé si numérique, `updatedAt = now`, insertion en tête, alias résolus par `sb()` (donc `{ "name": "Loup", "level": 3, "hp": 40 }` est valide). Toast `Import JSON terminé.`.

### 2.12 Envoyer au simulateur (`bestiaryAddToCombat`, `beast-admin.js:493–500`)

- Qui : `manage_beasts`. Entrées : `+ Combat` (×1) sur la carte et le panneau ; `Plus → + x2` / `+ x3` dans le panneau (`bestiary-admin-pass2.js:227–228`).
- Effet : crée `_cs` si absent, `combatAddBeast(id)` N fois (`main.js:12422–12439` : combattant `{type:'beast', bid, name (numéroté), level, pvCur/pvMax = pv, epCur/epMax = ep, dmgBase = premier entier de frappe (défaut 6), frappe, comp, img, beh}`), puis `switchTab('combat-mj')`, toast `Créature ajoutée au simulateur (N).`.
- Pour un **designer**, `combat-mj` est refusé (`mjTabs`, `main.js:4365`) : redirection silencieuse vers l'accueil alors que le toast annonce le succès.

### 2.13 Zones d'apparition (`openBeastZoneManager`, `main.js:7555–7786`)

- Qui : `manage_beasts` ; sinon `Permission insuffisante.`. Entrée : bouton `Zones d’apparition` de l'en-tête. Modale `m-beast-zones` (libellés complets dans `contenu\bestiaire-libelles.md`).
- Interactions : liste des zones à gauche (`ZONES`, compte par zone, « Aucune zone créée. ») ; champ `Nom de la zone` (crée ou renomme), `Rechercher un mob` (filtre sur nom, sous-titre, niveau, comportement, zones) ; deux colonnes `Dans la zone` / `Hors zone` avec cases, glisser-déposer (« Glisse vers l’autre colonne »), `Tout cocher visible`, `Décocher visible`, `Modifier` (ouvre l'édition et revient ensuite), `Supprimer la zone`.
- `Enregistrer` (`saveBeastZoneAssignments`, `main.js:7750–7770`) : nom requis sinon `#bz-err` « Nom de zone requis. » ; **deux écritures séquentielles** : `spawn_lab_staff.customZones` (ajout du nom) puis `beasts` (pour chaque créature : retire l'ancien nom et le nouveau, ajoute le nouveau si cochée, `updatedAt = now` **sur toutes les créatures**). Renommer une zone déplace donc ses membres. Toast `Zone enregistrée.`.
- `Supprimer la zone` (`deleteBeastZone`, `main.js:7771–7786`) : confirmation « Retirer la zone '<zone>' de tous les mobs ? », retrait de `customZones` puis de toutes les créatures, toast `Zone supprimée.`. Retrait individuel (`beastZoneRemoveMob`, 7566–7579) : toast `<nom> retiré de la zone.` — fonction sans bouton dans le rendu actuel.

### 2.14 Persistance et conflits (`_beastPersist`, `beast-admin.js:9–32`)

- Un seul enregistrement à la fois : `Une sauvegarde du bestiaire est déjà en cours.` (inf) si un second est déclenché.
- Écriture optimiste via `sb()` ; en cas d'échec, restauration du cache **uniquement** si personne n'a rechargé entre-temps, message d'erreur dans `#ab-err`/`#eb-err` et toast (message serveur ou « La sauvegarde du bestiaire a échoué. »), la modale reste ouverte et les champs sont conservés. Comportement figé par `scripts/test-beast-persistence.js` (audit 06 §3.O : O1–O4).
- Le gestionnaire de zones utilise l'autre chemin `_confirmDbSave` (« Modification non enregistrée : <message> », `main.js:1594–1600`), sans verrou anti-double-clic.

### 2.15 Panneau « Fiche staff » (`bestiary-admin-pass2.js:191–248`)

- Sélection par clic sur une carte (hors boutons), première carte sélectionnée par défaut ; sous 1180 px le panneau passe au-dessus de la liste et défile jusqu'à lui.
- Vide : `Fiche staff` / **Sélectionne une créature** / « Tu verras ici une fiche staff propre, les actions rapides, l’historique d’usage et les passerelles vers le simulateur. ».
- Rempli : chips (comportement, `Boss`, statut, bande de menace), titre, sous-titre (« Sans sous-titre »), actions `Éditer`, `+ Combat`, `Plus` (`Aperçu`, `Dupliquer`, `+ x2`, `+ x3`, `Archiver`/`Restaurer`, `JSON`) — **pas de `Purger`** ici ; stats `Niveau` / `PV` / `EP` / `Apparitions` ; blocs `Résumé staff` (« Aucune description pour le moment. »), `Complétude` (« La fiche est prête à être jouée. » / « Cette fiche mérite encore une petite finition. » ; chips « Fiche complète » ou « Manque : <x> »), `Combat & simulateur` (« Morts enregistrées », « Dernière apparition », `Frappe`, `Compétence`), `Historique` (« Dernières archives où cette créature a été utilisée. » / « Cette créature n’a pas encore de trace dans les archives de combat. » / « Aucune apparition »), `Suivi staff` (`Créée : … · par …`, `Modifiée : …` — le « par » n'apparaît jamais, §6.1), `Notes admin` (« Aucune note staff pour le moment. »). Dates relatives `À l’instant` / `Il y a N min` / `Il y a N h` / `Il y a N j` puis date longue au-delà de 30 j.

---

## 3. Écran public du bestiaire

### 3.1 Accès

Onglet `bestiaire` (`index.html:7270`), menu **Univers → Bestiaire** (`index.html:7009`) et tiroir mobile (`7087`), accessible à tout utilisateur connecté (pas de `data-private`). Pas de version hors connexion : la page d'accueil publique renvoie aux Serments et au règlement, pas au bestiaire (`contenu\accueil-public.md`). Le tableau de bord connecté propose la carte **Le bestiaire** — *Créatures et rencontres* (`contenu\ecrans-compte-et-accueil-connecte.md`).

### 3.2 Recherche, filtres, tris (`index.html:7272–7286`, `beast-admin.js:293–297, 329–331, 365–370`)

- Recherche `#beast-search-input`, placeholder « 🔍  Rechercher une créature, un niveau, une compétence… », sous-chaîne insensible à la casse sur `nom sub desc comp frappe drops gem niv` concaténés.
- Filtres exclusifs : `Tous` (défaut, actif) · `🐇 Gibier` · `😐 Passif` · `⚖ Neutre` · `⚠ Agressif` · `☠ Très agressif` (égalité stricte avec le libellé `BHL`).
- Tris exclusifs, à bascule : `PV ↕` → `PV ↑` (croissant) → `PV ↓` ; `Niv ↕` → `Niv ↑` → `Niv ↓` ; `A→Z` → `Z→A`. Activer l'un remet les deux autres à leur libellé neutre. Sans tri actif : ordre alphabétique fr, insensible à la casse et aux accents.
- Population : uniquement `!hidden && !archived` (double filtrage serveur + client).
- Après chaque rendu, la vue est recentrée sur l'onglet (`_focusOnScreen`, `beast-admin.js:327, 372, 374`).

### 3.3 Carte publique (`bCard` vue publique, `beast-admin.js:308–316`)

Il n'existe **pas de fiche détaillée** : la carte est la fiche. Contenu, dans l'ordre :

1. Média : image (`onerror` → retirée) ou placeholder = initiale du nom + première partie du sous-titre avant ` — ` en capitales (défaut `CRÉATURE`).
2. Nom, sous-titre.
3. Tag comportement (couleur `BHC`, libellé `BHL`) + `Niv. N`.
4. Description étendue (`_beastExtendedDesc`, `main.js:7978–8008`), phrases jointes par un espace :
   - première phrase de `desc` (coupure sur `. ! ?`), sinon « Créature répertoriée dans le bestiaire de Nuages Polaires. » ;
   - « <Sous-titre> • menace <bande en minuscule>. » (capitalisée) ;
   - texte long du comportement (`contenu\comportements-creatures.md` §4) ;
   - « Style de combat : <style> » si renseigné ;
   - « Frappe principale : <frappe> » ; « Capacité signature : <comp> » ;
   - reste de `desc` ;
   - « Récompenses potentielles : <drops> • Gemme <gem>. ».
5. Table : `PV` (vert) · `EP` (or) · `Frappe` (texte brut ; l'ancienne carte `main.js:8081–8086` décomposait « N + Niv.X = total »).
6. Blocs `COMPÉTENCE`, `BUTIN`, `DROP GEMME (D100)`.

Non affichés côté public : `zones`, `style` (sauf dans la description), `citation`, `tags`, `adminNote`, bande de menace en chip, dates.

### 3.4 États vides et erreurs

- Aucune créature après filtres : « Aucune créature pour ces filtres. » (italique, `beast-admin.js:372`). Les messages « Aucune créature ne correspond à "<q>". » / « Aucune créature pour ce filtre. » (`main.js:7397`) sont morts.
- Erreur de rendu : le garde **Bestiaire indisponible** / « Une erreur a empêché le chargement du bestiaire. Rafraîchis la vue ou reviens plus tard. » (`ui-patches.js:191–207`) enveloppe `renderBGrid` **avant** que `beast-admin.js` ne le remplace (`index.html:7507` puis `8613`) : il n'est plus jamais exécuté.
- Compteur d'accueil public `hf-creatures` **Créatures vaincues** (`index.html:6599`) = combattants `type:'beast'` à `pvCur ≤ 0` dans les archives (`db.js:703–711`).

---

## 4. Index commenté de `docs\overhaul\audit\contenu\`

| Fichier | Contenu | Source legacy | Complétude / remarques |
|---|---|---|---|
| `accueil-public.md` (82 l.) | Masthead, hero, compteurs, sections univers/serments/invitation, colophon, écran règlement pré-inscription | `index.html:6561–6693`, `updateHomeCounters` `main.js:2002` | Complet. Mentionne le bouton `RPG — expérimental ↗` à supprimer. |
| `bestiaire-libelles.md` (45 l.) | Libellés public, atelier, panneau, modales, zones, recadrage, toasts, confirmations | `beast-admin.js`, `bestiary-admin-pass2.js`, `main.js:3315–3390, 7648–7749` | Complet mais **mélange libellés actifs et morts** : « Aucune créature ne correspond à… », « Créature supprimée définitivement. », « N créature(s) importée(s). », « Créature envoyée au simulateur. », « Archiver cette créature ? », « Supprimer définitivement cette créature ?… », « Export impossible. » viennent des fonctions `main.js` surchargées (§6.2). Le présent document (§2) indique la version active. |
| `comportements-creatures.md` (55 l.) | Tables `BHC`/`BHL`/`BHM`, textes longs, texte de la page Système de jeu, filtres, pondérations d'apparition | `main.js:7413–7519, 7959–7969, 8819–8826, 14019–14058` | Complet. Signale l'incohérence de couleur `Agressif` (`#c45858` vs `#c97a4a`). |
| `ecrans-compte-et-accueil-connecte.md` (89 l.) | Inscription, connexion, nouveau mot de passe, compte en attente, tableau de bord connecté, têtes de chapitres de la fiche | `index.html:6696–6948, 7136–7258`, `renderAccueil` `main.js:8104` | Complet pour les libellés ; le corps de la fiche relève de l'audit 02. |
| `premiers-pas.md` (82 l.) | Guide de départ : états, bloc de statut, 4 étapes, repères, FAQ, table de navigation | `assets/js/first-steps.js` (148 l.) | Complet. Carte « Un RPG à explorer à part » à supprimer. |
| `reglement-hrp.md` (383 l.) | Règlement complet : préambule, Parties I–IV, glossaire (20 termes), mentions légales, politique de confidentialité (« Dernière mise à jour : mai 2026. ») | `renderRegles` `main.js:8307–8628` | Complet (verbatim). Placement des mentions légales/RGPD dans le règlement à revoir (audit 01 §5.10). |
| `serments-catalogue.md` (384 l.) | Forme JSON d'un serment, en-tête de page, libellés de carte, rangs, icônes/catégories, 13 serments natifs avec branches et paliers, tableau de synthèse | `SD` `main.js:213–485`, `renderAllSerments` 6166, `renderSermCard` 6520, constantes 6078–6105 | Complet pour les **natifs**. Les serments personnalisés (`serments_custom`, base de données) ne sont pas extraits. |
| `synopsis.md` (39 l.) | Hero, manuscrit en trois temps, titre de clôture, note de structure | `renderSynopsis` `main.js:8280–8305` | Complet. Point de lore « les constructions ont presque toutes disparu » à conserver tel quel. |
| `systeme-de-jeu.md` (263 l.) | Système de combat I–XI, comportements des créatures, constantes de progression | `renderCombat` `main.js:8630–8839`, `SERM_PALIERS` 9299–9300 | Complet. |

**Absents de `contenu\`** (à produire ou à obtenir du propriétaire) : les créatures elles-mêmes (données de production, aucun jeu de données dans le dépôt hormis les fixtures de test `scripts/helpers/local-app.js:29`) ; les serments personnalisés ; les événements ; les lieux ; le contenu de la clé publique `page_content` (`db.js:77`, usage non identifié dans cet audit) ; les libellés de l'agenda (couverts par l'audit 01 §5.11) ; la charte graphique (`legacy/docs/charte-graphique-mystique-polaire.md`, audit 07).

---

## 5. À préserver

1. **Le vocabulaire de la fiche** : `Nom`, `Sous-titre`, `Comportement`, `Niveau`, `PV`, `EP`, `Frappe`, `Compétence(s)`, `Butin`/`Drops`, `Drop gemme (D100)`/`Gemmes`, `Description`, `Note admin`, `Zones`, `Masquée côté joueurs`, `Archivée` — et les placeholders de la modale (§1.2). C'est le langage du serveur Discord.
2. **Les six comportements** avec libellés, icônes, couleurs, indices courts et textes longs (`contenu\comportements-creatures.md`), en une seule table de référence.
3. **La bande de menace** (formule et 4 libellés, §1.4) : simple, lisible par un MJ, déjà connue des joueurs via la description publique.
4. **La séparation public / atelier** voulue par le propriétaire (« Le Bestiaire reste une page de consultation propre ») et la règle de visibilité : masquée ou archivée = invisible hors staff, notes admin jamais servies aux joueurs (`db.js:676–683`).
5. **Le cycle de vie** créer → compléter (indicateur de complétude à 5 critères) → publier/masquer → archiver → purger (confirmation, `delete_beast`), avec la promesse de persistance et la conservation des champs en cas de conflit (§2.14, tests O1–O4).
6. **Dupliquer**, **Aperçu**, **export/import JSON** (formats tolérants aux alias) : outils de préparation utiles au staff.
7. **Les zones d'apparition comme groupes nommés** (noms de salons Discord) et leur gestionnaire à deux colonnes : c'est un besoin de table (« quels mobs peuplent ce salon ? »), indépendant du générateur.
8. **La recherche plein texte** et les trois tris publics ; la description étendue comme gabarit rédactionnel (phrase d'accroche, rôle, comportement, frappe, capacité, récompenses), à condition de ne plus dupliquer les champs dans la carte.
9. **Le compteur « Créatures vaincues »** de l'accueil, si les archives de combat MJ sont conservées comme journal de table.
10. Les textes d'univers extraits (synopsis, règlement, système de jeu, serments natifs, premiers pas, accueil) : verbatim, à réinjecter sans réécriture.

## 6. Dérive et dette

### 6.1 Champs fantômes (perte de données silencieuse)
`sb()` reconstruit chaque créature via `_normalizeBeastRecord` (`main.js:747–790`) qui **ne copie pas les clés inconnues**. Conséquences vérifiées dans le code : `isBoss` (case `Boss`, filtre `Boss`, chip, +8 de dangerosité), `adminNotes` (doublon de `adminNote`), `createdBy`/`updatedBy` (« par <auteur> » du `Suivi staff`) ne sont **jamais persistés** — ils ne survivent qu'en mémoire jusqu'au rechargement. À l'inverse, `qtyMin`/`qtyMax`/`spawnWeight` sont persistés mais **non éditables**, et le générateur lit `spawnMin`/`spawnMax` (`main.js:14042`), jamais `qtyMin`/`qtyMax` ; `spawnWeight` forcé ≥ 1 neutralise le poids calculé (audit 03 §10.3). Le modèle cible doit fixer une liste de champs unique, sans alias en double (`nom/name`, `niv/level`, `pv/hp/pvMax`, `catalog`…).

### 6.2 Trois générations d'atelier superposées
`main.js` (toolbar `renderBeastAdminToolbar` 7241–7273, carte admin 8029–8069, `archiveBeast`/`hardDeleteBeast`/`importBeastJson`/`beastSendToCombat` 7789–7928, aperçu `m-beast-preview-admin` 7865–7915), puis `beast-admin.js` qui **remplace** `renderBGrid`, `bCard`, `addBeast`, `saveEditBeast`, `delBeast`, `duplicateBeast`, `previewBeastAdmin`, `toggleBeastHidden`, puis `bestiary-admin-pass2.js` qui enveloppe `renderBGrid` et `switchTab`. `delBeast` signifie « archiver » dans `main.js:9681` et « purger » dans `beast-admin.js:401`. Le garde d'erreur de `ui-patches.js` est perdu (§3.4). Deux jeux de filtres (`_beastAdminFilters` `main.js:7153` vs `window._beastAdminFilters` `beast-admin.js:2`) et deux calculs d'usage/complétude coexistent.

### 6.3 Incohérences fonctionnelles
- Placeholder « Rechercher une créature, note, niveau, compétence... » alors que la note n'est pas cherchée (§2.1).
- Édition : impossible de vider `Frappe`, `Nom` ; un Boss importé redevient `Neutre` (§2.4).
- Archivées exclues du public et de `Actives` mais **tirables** par le générateur (`main.js:14100`).
- `+ Combat` pour un designer : créature ajoutée à un simulateur inaccessible, toast de succès (§2.12).
- Serveur : le rôle `mj` peut écrire `beasts` (`db.js:95`) sans aucune UI ni permission client — surface d'écriture plus large que l'interface.
- Couleur `Agressif` : `#c45858` (tag) vs `#c97a4a` (page Système de jeu).
- `renderBGrid` recentre la vue à chaque frappe de recherche (`_focusOnScreen`).

### 6.4 Redondance de la carte publique
La description étendue répète `frappe`, `comp`, `drops`, `gem`, `sub` qui sont aussi affichés en table et en blocs juste dessous ; le libellé `DROP GEMME (D100)` suppose une règle de tirage (d100) documentée nulle part dans les textes extraits.

### 6.5 Couplage au simulateur et aux archives
Usage, morts, « dernière apparition », « Jouées », filtres `Usage en combat`, tri `Usage combat`, boutons `+ Combat`/`+ x2`/`+ x3`, historique par archive : tout dépend des archives du simulateur de combat (audit 03). À requalifier selon le sort du simulateur ; si un « journal de rencontres » MJ subsiste, ces indicateurs restent pertinents, sinon ils disparaissent avec lui.

### 6.6 Données orphelines
`lieux[]` (carte Leaflet masquée, §1.6) : clé publique non filtrée exposant `notes` et lieux `visible:false`. Le prototype RPG (`rpg-prototype.js`) consomme ses propres lieux et créatures fictives. Les zones d'apparition (`customZones`) vivent dans `spawn_lab_staff`, un objet global du générateur, et non dans une collection dédiée.

### 6.7 Images
Data-URL base64 stockées dans la ligne `beasts` (jusqu'à 350 000 caractères pour un avatar, `db.js:86`) : chaque sauvegarde du bestiaire renvoie toute la liste avec toutes les images (`sb()` écrit la collection entière). Prévoir un stockage d'images séparé.

## 7. Questions ouvertes

1. Le propriétaire dispose-t-il d'un export `bestiaire-nuages-polaires.json` récent ? Sans lui, aucune créature réelle n'est disponible pour la reconstruction (seules des fixtures existent dans le dépôt).
2. `Boss` doit-il devenir un vrai comportement (6e valeur du select) ou un drapeau indépendant (`isBoss`) cumulable avec un comportement ?
3. Les champs `style`, `citation`, `tags` doivent-ils entrer dans le formulaire ou être retirés du modèle ?
4. Quelle règle de tirage se cache derrière `DROP GEMME (D100)` ? Le libellé mérite d'être documenté ou renommé.
5. Les zones d'apparition doivent-elles rester des chaînes libres calées sur les salons Discord, ou devenir une collection avec identifiants (et remplacer `lieux`) ?
6. Que contient la clé publique `page_content` (`db.js:77`) et qui l'édite ?
7. Les indicateurs d'usage (apparitions, morts, historique) sont-ils conservés si le simulateur de combat est réduit à un journal de table ?
8. Faut-il maintenir un « aperçu joueur » fidèle à la carte publique (aujourd'hui l'aperçu staff a sa propre mise en page) ?
