# 09 — Dérive « jeu en ligne », dette technique et couches de patchs

Audit en lecture seule du dépôt `C:\Users\sacha\NuagesPolaires` (état v297, `package.json` 297.0.0). Ce document sert de spécification source pour l'overhaul : il délimite exactement ce qu'il faut **retirer** (prototype RPG, carte dormante), ce que chaque couche de patch **corrige réellement** (à reformuler comme exigences dans le nouveau code), et la **dette** à ne pas reproduire. Toutes les références sont de la forme `fichier:ligne`.

Méthode : lecture intégrale de `assets/js/rpg-prototype.js`, des 10 modules de patch/polish, de `netlify.toml`, `scripts/build.js`, `scripts/check.js`, `docs/module-registry.json`, `docs/PATCHES.md`, `docs/architecture.md` ; lecture ciblée par grep de `assets/js/main.js` (16 855 lignes, 747 fonctions), `index.html` (9 040 lignes), `netlify/functions/db.js`, des tests et des docs.

---

## 0. Synthèse en dix lignes

1. Le prototype RPG est un module **autonome et bien isolé** : 1 fichier front (`assets/js/rpg-prototype.js`, 212 lignes / 58 Ko), 2 actions serveur (`rpg_get_character`, `rpg_save_character`), 1 clé `np_store` (`rpg_characters`), 4 lignes de couplage dans `main.js`, 5 points d'entrée dans `index.html`, 1 article dans `first-steps.js`, 2 fichiers de test, 1 clé `localStorage`. Il se retire proprement.
2. La carte du monde (`main.js:15352-15655`) est **dormante et cassée** : onglet commenté, Leaflet jamais chargé (bug `document.head.appendChild(s)` avec `s` non défini), modale `m-lieu` absente du DOM, CDN interdit par la CSP. Seule la donnée `lieux` (clé publique) subsiste.
3. Vingt scripts sont chargés en série, sans `defer`, pour **2 142 533 octets** de sources front (`main.js` 1 016 115 ; `index.html` 472 342 ; `theme-max.js` 129 718).
4. `home-readability-polish.js` est documenté comme actif (`docs/PATCHES.md:15`, `docs/architecture.md:18`) mais **n'est chargé nulle part** dans `index.html` : fichier mort.
5. Onze `MutationObserver` sur `document.body` (subtree) et onze `setInterval` (1 s à 10 s) tournent en permanence pour « re-polir » le DOM après chaque rendu.
6. `!important` apparaît **2 418 fois** ; `onclick=` **427 fois** ; `style="` **898 fois** ; la CSP conserve `'unsafe-inline'` pour `script-src` et `style-src` (`netlify.toml:23-24`).
7. Le monkey-patching est systémique : `_loadSessionBundle` est enveloppé **trois fois** dans le même fichier (`ui-patches.js:14-31`, `:210-229`, `:232-252`), `window.fetch` deux fois (`api-hardening.js:336`, `diagnostics.js:494`), `renderBGrid` deux fois, `renderStats` deux fois, `switchTab` une fois, `applyTheme` une fois, `renderDatabase` une fois, `renderCollection` une fois.
8. Tout `main.js` vit dans le scope global : 747 fonctions top-level, 126 `var/let/const` top-level, 72 affectations `window.X =`, `esc` défini deux fois (`main.js:155` et `:10269`).
9. Le pipeline est minimal et sain dans son principe : `check` (syntaxe `node --check`) → `test` (19 suites `node --test` sur PGlite) → `build` (copie `index.html` + `assets/` dans `dist/`). Pas de bundler, pas de lint, pas de CI, pas de hash de cache.
10. Les garanties **serveur** (versions opaques, `expectedVersion`, CAS, isolation de session, purge du `localStorage` privé) sont la partie la plus solide du dépôt et doivent survivre à l'overhaul telles quelles.

---

## 1. Périmètre exact de la dérive RPG (à retirer)

### 1.1 Inventaire des fichiers et emplacements

| Emplacement | Nature | Action overhaul |
|---|---|---|
| `assets/js/rpg-prototype.js` (212 l., 58 298 o.) | Module complet (monde, ennemis, objets, combat, boutique, quêtes, présence, sauvegarde) | Supprimer |
| `index.html:7290-7291` | `<div id="rpg-prototype" class="tab-content"><div id="p-rpg-prototype-c"></div></div>` | Supprimer |
| `index.html:7019` | Bouton nav desktop `<button class="rpg-nav-btn" data-app-tab="rpg-prototype" onclick="openRpgPrototype()"><span class="nav-icon">*</span> RPG — expérimental</button>` | Supprimer |
| `index.html:7094` | Drawer mobile `<button onclick="openRpgPrototype();closeMobileDrawer();" class="drawer-item">RPG — expérimental</button>` (dans son propre bloc `<div style="padding:4px 0;border-top:…">` `7093-7095`) | Supprimer le bloc |
| `index.html:6626` | Pied de page public `<footer class="np-colophon">` : `<button type="button" onclick="openRpgPrototype()">RPG — expérimental <span aria-hidden="true">↗</span></button>` | Supprimer le bouton (garder « Règlement ») |
| `index.html:9038` | `<script src="./assets/js/rpg-prototype.js"></script>` (dernier script) | Supprimer |
| `index.html:202-203` | CSS `.rpg-nav-btn{…}` — classe **nommée** RPG mais utilisée aussi par le bouton « Événements » (`index.html:7018`) | Renommer/absorber (ex. `.nav-top-btn`) ; ne pas supprimer sans reprendre « Événements » |
| `assets/css/polar-connected.css:35,52` | Sélecteur `:is(.nav-dropdown-btn,.nav-group-btn,.rpg-nav-btn)` | Même remarque |
| `assets/js/main.js:2315` | `_finishLogin` : `if(typeof window.npResetRpgSession === 'function') window.npResetRpgSession();` | Supprimer |
| `assets/js/main.js:5251` | `logout` : idem | Supprimer |
| `assets/js/main.js:4353` | `_tabDropIdFor` : `if(id==='evenements'\|\|id==='rpg-prototype') return '';` | Retirer `rpg-prototype` |
| `assets/js/main.js:5580-5585` | `switchTab` : branche `id==="rpg-prototype"` qui force l'écran `s-app` actif et appelle `renderRpgPrototype("p-rpg-prototype-c")` | Supprimer |
| `assets/js/first-steps.js:102` | Article « Un RPG à explorer à part » + bouton « Découvrir le RPG expérimental » (action `'rpg'`) | Supprimer l'article |
| `assets/js/first-steps.js:135` | `if (action === 'rpg') { … window.openRpgPrototype() … }` | Supprimer |
| `netlify/functions/db.js:319-327` | Normalisation de la collection `rpg_characters` (dédoublonnage par `ownerId`) | Supprimer |
| `netlify/functions/db.js:347-380` | `normalizeRpgCharacter(entry, idx)` | Supprimer |
| `netlify/functions/db.js:588-614` | `rpgCharacterVersion`, `ownRpgCharacter`, `saveOwnRpgCharacter` (CAS, 6 tentatives) | Supprimer |
| `netlify/functions/db.js:740-760` | Handlers `action === "rpg_get_character"` et `"rpg_save_character"` (+ audit `auditDb(event, caller, "rpg_save_character", {character, level, loc})` l.758) | Supprimer (voir question ouverte Q1 sur la réponse à renvoyer) |
| `scripts/test-rpg-persistence.js` (131 l.) | Tests serveur + client (vm) du RPG | Supprimer |
| `scripts/test-rpg-browser.js` (50 l.) | Parcours Playwright RPG (captures `test-results/rpg/`) | Supprimer |
| `scripts/test-first-steps.js:23` | Mock `openRpgPrototype: () => calls.push(['rpg'])` | Retirer |
| `package.json:16` | `scripts/test-rpg-persistence.js` dans `npm test` | Retirer |
| `package.json:17` | `node scripts/test-rpg-browser.js` dans `test:browser` | Retirer |
| `docs/module-registry.json:22` | `"./assets/js/rpg-prototype.js"` dans `runtime_scripts` | Retirer |
| Docs mentionnant le RPG | `VERSION.txt` (l.14, 17, 21), `CHANGELOG.md:13,17-18`, `docs/security-and-data.md:59-65`, `docs/plan-du-site-2026-09-23.md` (l.13, 19, 21, 25, 35, 41, 49, 51, 64, 75, 112, 141, 147, 182-192, 236, 278, 296, 299, 306, 310, 329), `docs/fusion-xp.md:44`, `docs/backups.md:3`, `docs/charte-graphique-mystique-polaire.md:40`, `docs/infrastructure-review-2026-09-21.md:5,26,45,51` | Archiver/annoter comme historique ; ne plus promettre le RPG |

Le module n'est référencé par aucune autre couche de patch (`ui-patches`, `*-polish`, `theme-max`, `api-hardening`…) : vérifié par grep `rpg|Rpg|RPG` sur `assets/js/` (seuls `main.js`, `first-steps.js` et `rpg-prototype.js` matchent).

### 1.2 API globale exposée par le module (22 globals `window.*`)

`rpg-prototype.js:179-211` : `renderRpgPrototype`, `openRpgPrototype`, `rpgMove`, `rpgExplore`, `rpgAttack`, `rpgUse`, `rpgEquip`, `rpgBuy`, `rpgRest`, `rpgFlee`, `rpgDismissResult`, `rpgChoice`, `rpgSaveIdentity`, `rpgSelectCreateClass`, `rpgSelectCreateSpawn`, `rpgCreateCharacter`, `rpgSetOath`, `rpgClaimQuest`, `npResetRpgSession`, `rpgExportDraft`, `rpgReloadCharacter`, `rpgResetPrototype`.

Tous sont appelés via `onclick="…"` inline générés dans le HTML du module (13 occurrences `onclick=` dans le fichier). Aucun autre fichier ne les appelle, sauf `main.js` (`npResetRpgSession`, `renderRpgPrototype`) et `index.html`/`first-steps.js` (`openRpgPrototype`).

### 1.3 Couplages entrants (ce que le RPG lit dans `main.js`)

Le module dépend, en lecture seule et de façon défensive (`typeof … === "function"`), de :

- `getAllSD()` / `window.SD` (`rpg-prototype.js:53`) : catalogue des Serments (classes) ; `normalizeClass` (`:54`) et `legacyClassMap` (`:24`) `{duelliste:"Duelliste", veilleur:"Croisé", souffle:"Rôdeur", "Souffle-Givre":"Rôdeur"}` — trace d'anciens noms de Serments (« Veilleur », « Souffle-Givre ») utile à l'audit Serments.
- `resolveOwnProfilePid()`, `gpid(pid)`, `CU` (`:58-60`) : lecture de la fiche compagnon liée (`name`, `classe`, `level`, `pvMax/pvCur`, `epMax/epCur`, `emMax/emCur`) pour pré-remplir le personnage RPG (`applyLinkedPlayer`, `:59`). **Sens unique** : le RPG ne réécrit jamais la fiche compagnon.
- `_dbCall({action:"rpg_*"}, {silent:true})` (`:103`, `:121`), `_dbSessionGeneration` (`:63`), `window.__logoutBusy` (`:65`, `:76`) : transport et isolation de session.
- `switchTab("rpg-prototype", null)` (`:180`), `esc` (`:48`).

Conclusion : aucune donnée du compagnon ne dépend du RPG. Supprimer le module ne casse rien d'autre que les 4 lignes de `main.js` listées.

### 1.4 Contrat serveur et clé de données

- Clé `np_store` : `rpg_characters` = **tableau** d'objets, au plus un par `ownerId` (`db.js:319-327`). Elle n'est **ni** dans `PUBLIC_KEYS` (`db.js:75-78`) **ni** dans `isValidKey` (`db.js:117-121`) : les actions génériques `get/set/delete` la refusent (test `test-rpg-persistence.js:20-23`). Seules les deux actions dédiées y accèdent.
- `rpg_get_character` (`db.js:740-745`) : 401 sans session ; réponse `{ok:true, character: <normalisé>|null, version: <md5 32 hex>|null}`. La version est **par personnage** (`rpgCharacterVersion`, `db.js:590-592` : md5 de `stableValue(character)`), pas par collection.
- `rpg_save_character` (`db.js:747-760`) : 401 sans session ; 428 si `expectedVersion` absent (`hasExpectedVersion`) ; 400 « Personnage RPG invalide » si `character` n'est pas un objet ; force `ownerId=caller.sub`, `ownerPid=caller.pid`, `ownerPseudo`, `updatedAt` ; 409 `VERSION_CONFLICT` via `conflictResponse(headers,"rpg_characters")` si la version propre a changé ; CAS de collection jusqu'à 6 tentatives (`db.js:597`) ; refus silencieux (`null`) si la valeur stockée n'est pas un tableau (`db.js:600`).
- Bornes de normalisation (`db.js:347-380`) : `id ≤128`, `name ≤32` (défaut « Voyageur »), `oath ≤80` (défaut « Duelliste »), `level` 1..100, `xp ≥0`, `gold` 0..999 999, `loc/spawn ≤80` (défaut « camp »), `log` ≤12 lignes × 240 caractères, `updatedAt` numérique.
- Audit serveur : chaque sauvegarde écrit `rpg_save_character` avec `{character:<nom>, level, loc}` dans `np_audit_log` (`db.js:758`). Les entrées existantes du journal d'audit portant cette action resteront lisibles dans l'admin après retrait — prévoir un libellé de repli pour actions inconnues.
- Données réelles : au 21/09/2026 la base de production contenait **1 personnage RPG** parmi 84 entrées (`docs/infrastructure-review-2026-09-21.md:26`). Le snapshot `backup:store` l'inclut (`docs/backups.md:3`).

Exemple de document stocké (forme reconstituée depuis `baseState()` `rpg-prototype.js:61` et la normalisation serveur) :

```json
{
  "id": "rpg_alice",
  "ownerId": "alice",
  "ownerPid": "p_alice",
  "ownerPseudo": "Alice",
  "schemaVersion": 4,
  "sourcePlayerId": "p_alice",
  "created": true,
  "name": "Alice",
  "oath": "Duelliste",
  "level": 1, "xp": 0, "gold": 45,
  "loc": "camp", "spawn": "camp",
  "hp": 30, "maxHp": 30, "energy": 50, "maxEnergy": 50, "mana": 20, "maxMana": 20,
  "reputation": 0,
  "inv": { "potion": 2, "baies": 1 },
  "equip": { "weapon": null, "armor": null, "trinket": null },
  "combat": null,
  "result": null,
  "visited": { "camp": true },
  "flags": { "firstMove": false, "firstWin": false, "firstEquip": false, "ruins": false, "questClaimed": false },
  "log": ["Création de Alice — Duelliste.", "Spawn choisi : Camp des Brumes."],
  "updatedAt": 1790000000000
}
```

### 1.5 Stockage navigateur et canaux

- `localStorage["np_rpg_guest_v2"]` (`rpg-prototype.js:3`, `:81`, `:89`) : sauvegarde **invité uniquement** (jamais écrit quand `CU` est défini — test `test-rpg-persistence.js:92`). À purger dans le nouveau code (clé orpheline).
- `localStorage["np_rpg_proto_v1"]` : ancienne clé (v295) **conservée volontairement sans réimport** parce que son propriétaire n'était pas identifié (`docs/security-and-data.md:65`, tests `:96,127`, `test-rpg-browser.js:22,46`). Décision à prendre (Q1).
- `BroadcastChannel("np-rpg-prototype")` (`:138`) : « présence » entre onglets du même navigateur, tick 2 500 ms (`setInterval(publishPresence,2500)`), expiration 9 000 ms (`:140`), mélangée à 4 joueurs fictifs `fakePlayers` (`:21` : Maelia/camp/3/Soigneuse, Soren/ridge/4/Éclaireur, Ivara/market/2/Marchande, Noam/cave/5/Traqueur). Libellé : « Présences de démonstration — Personnages fictifs et autres onglets de ce navigateur. » (`:161`), « Autre onglet de ce navigateur » / « personnage fictif » (`:142`).
- Hash `#rpg-prototype` ouvert automatiquement au `load` (`:181`).
- Style injecté `<style id="np-rpg-prototype-style">` (`:26-46`, ~14 Ko de CSS dans une template string).

### 1.6 Contenu de jeu (pour mémoire — à ne pas transposer)

Monde (`:10-18`), 7 lieux avec `x,y` en % sur une carte SVG maison (`mapHtml`, `:168`) :

| id | Nom | Type | danger | boutique | liens | ennemis |
|---|---|---|---|---|---|---|
| camp | Camp des Brumes | Refuge | 1 | oui | ridge, market, forest | lutinivre |
| market | Marché d'Astragivre | Boutique | 1 | oui | camp, harbor | rat |
| ridge | Crête des Serments | Frontière | 2 | non | camp, ruins, cave | renegat, lutinivre |
| forest | Taillis du Nord | Chasse | 2 | non | camp, cave | rat, renegat |
| cave | Grotte d'Éclats | Donjon | 3 | non | ridge, forest | sentinelle, renegat |
| ruins | Ruines de Nacre | Élite | 4 | non | ridge, harbor | sentinelle |
| harbor | Havre Blanc | Port | 1 | oui | market, ruins | rat |

Noms de régions sur la carte (`:168`) : « Mer blanche », « Dorsale gelée », « Taillis noir », « Route des Serments ». Le lieu `ruins` mentionne « Un ancien relais twinoïdien » (`:16`) — référence lore à vérifier avec l'audit univers.

Ennemis (`:19`) : Rat de givre (18 PV/4 ATQ/1 DEF/8 XP/8 or, drop baies), Pilleur lutinivre (24/5/2/12/12, acier), Rôdeur renié (34/7/3/18/18, amulette), Sentinelle de nacre (48/9/4/30/32, cristal). Objets (`:20`) : Potion chaude 18 or (+26 PV), Baies polaires 9 or (+12 PV), Lame d'acier froid 65 or (+5 ATQ), Manteau de laine noire 55 or (+4 DEF), Amulette de souffle 80 or (+2/+2), Cristal de nacre 120 or (+4/+3). Spawns (`:22`) : camp « 2 potions de départ », market « +20 or de départ », harbor « 1 amulette à équiper ».

Formules (`:57`, `:133-134`, `:182-197`) :
- `maxPv = 30 + (level-1)·pvN`, `maxEp = 50 + (level-1)·epN`, `maxEm = 20 + (level-1)·emN` (pvN/epN/emN lus dans la définition du Serment).
- `atk = (dmg‖8) + ⌊level/2⌋ + Σ equip.atk` ; `def = 1 + ⌊(pvN+epN)/4⌋ + ⌊level/2⌋ + Σ equip.def`.
- XP requise : `level × 35` ; au passage de niveau PV/EP/EM restaurés.
- Attaque : `dégâts = max(1, atk − ⌊def_ennemi/2⌋ + rand(0..4))` ; riposte `max(1, atk_ennemi − ⌊def/2⌋ + rand(0..3))` ; défaite → `hp = ⌈maxHp/2⌉`, `gold −12`, retour `camp`.
- Coûts d'énergie : déplacement −1, explorer −6, fuir −6, fouiller −4 (62 % objet sinon +8 or), observer −3 ; parler : réputation +1, tous les 3 → +12 or.
- Quête d'initiation (4 étapes « Quitter le camp », « Gagner un combat », « Équiper un objet », « Atteindre les Ruines de Nacre ») → « 40 or + potion ».

Sauvegarde : débounce 450 ms (`:96`), libellés d'état `syncLabel()` (`:130`) : « Sauvegarde sur cet appareil », « Chargement du personnage », « Brouillon non enregistré », « Enregistrement en cours », « Modifications non enregistrées », « Synchronisé », « Chargement indisponible » ; erreurs : « Une autre session a modifié ce personnage. Conserve ton brouillon avant de recharger. », « Sauvegarde non confirmée. Ton brouillon reste dans cette page. », « Impossible de charger le personnage. Réessaie avant de jouer. » ; actions « Télécharger le brouillon » (fichier `np-rpg-brouillon.json`) et « Recharger le personnage ».

Textes de la promesse (à faire disparaître partout) : « RPG — expérimental » ; « Nuages Polaires RPG » ; « Explore les lieux, affronte les créatures et équipe ton personnage dans ce prototype solo. Ta progression est sauvegardée ; le multijoueur à distance n'est pas encore disponible. » (`:164`) ; « Le RPG est un prototype solo expérimental, avec sa propre progression et son inventaire. Ses récompenses ne sont pas versées sur ta fiche du compagnon. » (`first-steps.js:102`).

### 1.7 Ce qui, dans le RPG, mérite d'être **retenu comme pattern** (pas comme fonctionnalité)

- Version opaque **par enregistrement** + brouillon local non perdu + bouton de téléchargement du brouillon en cas de conflit (`:106`, `:131`, `:199-202`) : c'est la meilleure UX de conflit du dépôt. Le compagnon (fiche, journal) devrait offrir la même chose.
- Isolation de session par `sessionKey()` = `generation:accountId:pid` (`:62-66`) et rejet des réponses tardives (`sameSession`) : déjà généralisé dans `main.js` (`_dbSessionGeneration`), à conserver.
- Le test client en `vm` (`test-rpg-persistence.js:67-83`) qui exécute le vrai fichier front dans un contexte simulé : approche à garder pour tester les modules front sans navigateur.

### 1.8 Procédure de retrait (checklist)

1. Supprimer les 5 emplacements `index.html` (§1.1) et renommer `.rpg-nav-btn`.
2. Supprimer les 4 hooks `main.js` et l'article `first-steps.js`.
3. Supprimer `assets/js/rpg-prototype.js`, `scripts/test-rpg-*.js`, les entrées `package.json` et `module-registry.json`.
4. Serveur : supprimer handlers + helpers `db.js` ; décider de la réponse pour un client obsolète (recommandé : 410 `{ok:false,error:"Fonction retirée"}` plutôt que 400 générique).
5. Données : exporter puis supprimer la clé `rpg_characters` (1 entrée) via un script de migration explicite, après sauvegarde `npm run backup:store` — ou la laisser orpheline (elle est inaccessible aux actions génériques). Ajouter `np_rpg_guest_v2` et `np_rpg_proto_v1` à la purge `localStorage` du nouveau code (voir Q1 pour `np_rpg_proto_v1`).
6. Docs : marquer les mentions comme historiques.

---

## 2. Carte du monde du compagnon : statut « dormante et inopérante »

### 2.1 Code

- `assets/js/main.js:15351-15655` (~300 lignes) : `_carteMap`, `_carteLayer`, `_carteLoaded` (jamais lu), `_cartePendingClick`, `LIEU_TYPES`, `getLieux()`, `saveLieux()`, `renderCarte()`, `_initCarte()`, `_drawMapBackground()`, `_renderMarkers()`, `carteAddMode()`, `carteToggleFog()`, `_openLieuModal()`, `saveLieu()`, `_editLieu()`, `_deleteLieu()`, `_toggleLieuVisible()`.
- `LIEU_TYPES` (`:15358-15365`) : `ville` 🏙 #7eb8d4 « Ville / Village », `ruine` 🏚 #c9a84c « Ruines », `donjon` ⚔ #c94a4a « Zone dangereuse », `nature` 🌿 #6db88a « Zone naturelle », `poi` ★ #c084d4 « Point d'intérêt », `secret` 👁 #585878 « Zone secrète ».
- Carte Leaflet en `CRS.Simple`, bornes `[[0,0],[1000,1600]]`, zoom −2..3 (`:15413-15422`), fond SVG procédural (océan, continent, montagnes, forêts, rivières, île, grille 100 px, rose des vents) converti en `data:image/svg+xml` (`:15450-15517`). Fog of war : un joueur ne voit pas les lieux `visible:false` ; le staff les voit à opacité 0,35 avec « ? » (`:15524-15532`). Marqueurs draggables par le staff (`:15561-15567`), popup avec « ✎ Modifier », « ✕ Supprimer », « 👁 Révéler » / « 🌫 Masquer » (`:15548-15551`). Libellés : « CARTE DU MONDE », « + Ajouter un lieu », « 🌫 Fog », « CLIQUER SUR LA CARTE POUR PLACER LE LIEU », « Nouveau lieu » / « Modifier le lieu », « Donne un nom au lieu. », « Lieu ajouté/modifié — {nom} », « Lieu supprimé. », « {nom} révélé aux joueurs. / masqué. ».

### 2.2 Modèle de données `lieux` (toujours vivant côté serveur)

```json
{ "id": "l1712345678901", "nom": "Havre Blanc", "type": "ville",
  "desc": "Description publique", "notes": "Notes staff (non publiques)",
  "visible": true, "lat": 500, "lng": 800 }
```

- Clé **publique** `lieux` (`db.js:76`), critique (`db.js:79`), écriture admin uniquement (`db.js:92`), normalisée comme « objet ou liste » (`db.js:265`).
- Front : préchargée depuis `localStorage["np_lieux"]` (`main.js:1313`), purgée au changement de `np_cache_version` (`:1240`), clé offline (`:1275`), DB-backed (`:1498`), exclue de l'export JSON de l'admin (« Archives, événements et lieux exclus. », `:10860`), incluse dans le bundle de session (`:871`).
- Fixture de test : `lieux:[]` (`scripts/helpers/local-app.js:29`). Contenu en production inconnu (à vérifier via `backup:store`).

### 2.3 Preuves d'inopérance

1. Onglet HTML commenté : `index.html:7320-7322` `<!-- CARTE DU MONDE HIDDEN <div id="carte" class="tab-content"><div id="p-carte-c"></div></div> -->`.
2. Rendu commenté : `main.js:5619` `// CARTE HIDDEN: if(id==="carte"){ renderCarte("p-carte-c"); }`.
3. Aucune entrée de navigation ni dans `_canUseTabNow` (`main.js:4362-4366`) ; `'carte'` reste pourtant dans `TAB_POPUP_IDS` (`main.js:5422`).
4. **Bug bloquant** : `renderCarte` (`:15375-15380`) crée un `<link>` Leaflet mais appelle `document.head.appendChild(s)` où `s` n'existe pas → `ReferenceError` ; ni la feuille ni le script Leaflet ne sont jamais chargés ; `_initCarte` n'est atteint que si `window.L` existe déjà.
5. La modale `m-lieu` et ses champs (`lieu-id`, `lieu-nom`, `lieu-type`, `lieu-desc`, `lieu-notes`, `lieu-visible`, `m-lieu-title`) **n'existent pas** dans `index.html` (grep vide) → `_openLieuModal` lèverait `TypeError`.
6. La CSP (`netlify.toml:24`) n'autorise que `script-src 'self'` : le CDN `cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/` (`:15379`) serait bloqué même si le code était correct.
7. CSS mort : `index.html:979-986` (`.carte-popup .leaflet-*`, `.leaflet-control-zoom`) et `:6253-6260` (`body.light #carte-map`, `.carte-popup`).

Verdict : retirer le code et le CSS. La **donnée** `lieux` (lieux nommés, type, description publique, notes staff, visibilité) est en revanche un actif narratif potentiel pour un « atlas des lieux » sans carte interactive (voir Q2 et l'audit produit `gpt-lecture-produit.md:21`).

---

## 3. Couches de patch : ce qu'elles corrigent vraiment

### 3.1 Ordre de chargement réel (`index.html`) et registre

| # | Script | Ligne `index.html` | Version interne | Style injecté (`id`) | Observers / timers | Wrappers |
|---|---|---|---|---|---|---|
| 1 | `progression.js` | 7464 | 1 (UMD) | — | — | — |
| 2 | `main.js` | 7465 | `APP_BUILD="np_v18"` (`:16309`) | — (CSS dans `index.html`) | 5 `setInterval` | 26 captures `_old*` internes |
| 3 | `first-steps.js` | 7466 | — | — | — | — |
| 4 | `adventure-archives.js` | 7467 | — | — | — | — |
| 5 | `ui-patches.js` | 7507 | v38/v42/v47 | — | — | `_loadSessionBundle` ×3, `applySessionBundle`, `renderCollection`, `renderBGrid` |
| 6 | `beast-admin.js` | 8613 | v230 | (CSS inline `index.html:8141-8612`) | — | définit `renderBGrid` |
| 7 | `bestiary-admin-pass2.js` | 8614 | — | — | — | `renderBGrid` (`:259`), `switchTab` (`:279`) |
| 8 | `finish-audit.js` | 8615 | v243 | `np-finish-audit-style` | MO (documentElement, subtree) | — |
| 9 | `theme-max.js` | 9027 | v257 | `np-theme-engine-v257` | MO (body) + 2 timeouts | `applyTheme` (`:2094`) + `wrapRenderers` (`:2085`) |
| 10 | `api-hardening.js` | 9028 | v274 | `np-api-hardening-style-v259` | check 1 200 ms après boot, `visibilitychange`, `online` | `window.fetch`, `_dbCall`, `_authCall`, `_jsonPost` |
| 11 | `diagnostics.js` | 9029 | v258 | `np-diagnostics-style-v258` | — | `window.fetch` (2ᵉ wrap, `:494`) |
| 12 | `site-self-test.js` | 9030 | v260 | `np-site-self-test-style-v260` | MO (body) | — |
| 13 | `admin-dashboard.js` | 9031 | v267 (2 parties v263/v264) | `np-dashboard-console-style-v263`, gate | `setInterval` 1 000 ms, 5 000 ms, 5 000 ms ; MO (body) | `renderStats` ×2, `renderDashboardConsole` |
| 14 | `theme-regression.js` | 9032 | v268 | `np-theme-regression-style-v268` | `setInterval` 1 000 ms ; MO (body) | — |
| 15 | `staff-navigation.js` | 9033 | v271 | `np-staff-navigation-style-v271` | `setInterval` 1 500 ms ; MO (body) | — |
| 16 | `connected-pages-polish.js` | 9034 | v270 | `np-connected-pages-polish-v270` | `setInterval` 1 200 ms ; MO (body) | — |
| 17 | `mobile-polish.js` | 9035 | v272 | `np-mobile-polish-v272` | MO (body) ; `resize`/`orientationchange` | — |
| 18 | `visual-audit-polish.js` | 9036 | v280 | `np-visual-audit-polish-v280` | MO (body, + characterData) ; resize | — |
| 19 | `database-admin-polish.js` | 9037 | v273 | `np-database-admin-polish-v273` | `setInterval` 2 500 ms ; MO (body) | `renderDatabase` |
| 20 | `rpg-prototype.js` | 9038 | schéma 4 | `np-rpg-prototype-style` | `setInterval` 2 500 ms (présence) | — |
| — | `home-readability-polish.js` | **absent** | v269 | `np-home-readability-polish-v269` | MO (body) | — |

`docs/module-registry.json` (`"version":"v297"`) liste 19 `runtime_scripts` : il **omet** `progression.js` (pourtant chargé) et **inclut** `home-readability-polish.js`… non, il ne l'inclut pas non plus, alors que `docs/PATCHES.md:15` et `docs/architecture.md:18` le disent « Actif ». Le registre est donc désynchronisé sur deux points. `docs/PATCHES.md:44-46` répète trois fois « Décomposer `ui-patches.js` en modules spécialisés » (copier-coller).

Au total, au chargement d'une page : **11 `MutationObserver`** sur le corps (subtree, souvent avec `attributes`), **11 `setInterval`** permanents (`main.js:1799` 1 800 ms `_reconcileScrollLocks` ; `:2111` 5 000 ms home ; `:4461` 30 000 ms retry offline ; `:5229` 10 000 ms comptes en attente ; `:11348` poll `combat-mj` ; + ceux du tableau), et plusieurs dizaines de `setTimeout(refresh, 80/300/1000)` en cascade. Chaque rendu (`innerHTML=` — 131 occurrences dans `main.js`) déclenche tous les observers, qui réinjectent classes/attributs, ce qui redéclenche les observers (amorti par des débounces de 80-90 ms).

### 3.2 `ui-patches.js` (252 l.)

**Ce qu'il fait réellement**
- `:9-13` `toggleThemeVisibility(themeId)` → `setThemeVisibility(id, !getThemeVisibilityState(id))` (fonctions de `main.js`, appelées 3× dans `main.js`).
- `:14-31`, `:210-229`, `:232-252` : **trois** enveloppes successives de `_loadSessionBundle` qui font la même chose : lire `bundle.data.themeVisibility` (ou `bundle.themeVisibility`), normaliser les ids, poser `window.VISIBLE_THEMES` (liste des ids `true`), `_dbCache.theme_visibility` (ou `sv("theme_visibility", map)`), et `localStorage["np_theme_visibility"]`.
- `:34-125` (« v42 restored tail code ») : modèle de la collection de thèmes — `_visibleThemeIdsForPlayer` = `THEME_BASE_VISIBLE ∪ {thèmes visibles pour le joueur}` ; `buildThemeCollectionModel` (id, label, rarity, category — « Équipé » si équipé —, tagline, preview, owned=`canUseTheme`, locked, secret, equipped) + `THEME_SECRET_SLOTS` (2 « Secret scellé ») ; tri `categoryOrder` puis `localeCompare(…,'fr')` ; `renderCollectionSummary` (4 cartes : « Collection x/y — thèmes visibles obtenus », « Progression n % — de la galerie visible », « Saisonniers a/b — dans la galerie », « Fondateur a/b — traces rares ») ; `renderThemePreviewMini` ; `renderThemeCollectionPremium` (badges « Équipé », « Secret », « Obtenu », « Non obtenu » ; boutons « Inconnu » (secret, disabled), « Équipé », « Appliquer », « Indisponible » ; `onclick="applyTheme('id')"`).
- `:127-154` : contrôles admin de thèmes dans Database (`renderAdminThemeControls(acc)` : liste `unlockedThemes ∪ blockedThemes`, chip « {label} · Bloqué », boutons « Retirer » → `adminRevokeThemeFromDb`, « Bloquer »/« Débloquer » → `adminToggleBlockTheme` → `apiAuth('admin_block_theme'|'admin_unblock_theme', {accountId, themeId})` ; toasts « Thème bloqué », « Thème débloqué », « Action réservée aux admins », « Aucun thème attribué ou bloqué. »).
- `:157-160` `isAdminGrantOnlyTheme` = non base ∧ non événement verrouillé ∧ non « early clouds ».
- `:163-177` (`__v38CollectionPatch`) : remplace `window.renderCollection` pour rendre dans `#collection-wrap` | `#collection-view` | `[data-collection-wrap]`.
- `:180-187` : enveloppe `applySessionBundle` pour poser `VISIBLE_THEMES` et `THEME_META_SERVER`.
- `:191-207` (`__v47BestiaryGuard`) : `try/catch` autour de `renderBGrid` avec repli « Bestiaire indisponible — Une erreur a empêché le chargement du bestiaire. Rafraîchis la vue ou reviens plus tard. »

**Exigences à préserver**
- R-UI1 : la visibilité des thèmes est une donnée serveur (`theme_visibility`, action auth `admin_set_theme_visibility`) hydratée au bundle de session ; un thème absent de la map ou `false` est invisible pour les joueurs, sauf les thèmes de base (`THEME_BASE_VISIBLE`).
- R-UI2 : la collection distingue « visible » (galerie), « obtenu » (`unlockedThemes` du compte, moins `blockedThemes`), « équipé » (`selectedTheme`), « secret » (emplacements inconnus sans aperçu). Le résumé affiche obtenus/visibles, un pourcentage, les saisonniers et les « Fondateur ».
- R-UI3 : l'admin peut retirer, bloquer, débloquer un thème par compte, et l'action est confirmée par un message.
- R-UI4 : un composant qui échoue au rendu affiche un état d'erreur lisible sans casser la page (pattern « error boundary »).

**Cosmétique / obsolète** : les 3 wrappers redondants de `_loadSessionBundle`, le double `applySessionBundle`, la recherche de conteneur par 3 sélecteurs, les `onclick` inline, `localStorage["np_theme_visibility"]` (donnée serveur mise en cache local : acceptable seulement comme cache non-autoritaire).

### 3.3 `finish-audit.js` (134 l., v243)

**Ce qu'il fait** : injecte une feuille de « finition globale » (`:7-73`) et répare le DOM à la volée (MO sur `documentElement`, `:116-127`).
- `min-width:0; overflow:hidden` sur 25 classes de cartes/panneaux et `min-width:0` sur tous leurs descendants ; `overflow-wrap:anywhere; word-break:break-word` sur titres/chips.
- `flex-wrap:wrap` sur toute barre d'actions/filtres (sélecteurs `[class*="actions"]`, `[class*="toolbar"]`, `[class*="filters"]`, `[class*="controls"]`, `[class*="chips"]`).
- Boutons : `min-height:38px` (42 px sous 560 px), `white-space:normal`, `text-wrap:balance`, `max-width:100%` sur contrôles.
- Menus déroulants : `max-width:min(96vw,1280px)`, `max-height:min(68vh,560px)`, `overflow:auto` ; `img,svg,canvas,video {max-width:100%;height:auto}` ; `scrollbar-gutter:stable both-edges` sur listes scrollables ; rayons 20 px (18 px < 900 px).
- Mode clair : `.muted/.dim/... {color:#50627b !important}`, placeholders `#7486a0`.
- `normalizeDataUrl` (`:80-91`) : répare les `src="data:image/...base64XXXX"` **sans virgule** (`data:image/png;base64XXXX` → `data:image/png;base64,XXXX`) — des avatars historiques ont été stockés dans ce format cassé. Exposé comme `window.__npNormalizeBrokenDataImages`.
- `softenOverflows` : `style.minWidth='0'` sur les cartes ajoutées.

**Exigences à préserver**
- R-FA1 : aucun conteneur ne doit provoquer de débordement horizontal (`min-width:0` sur les enfants de grille/flex ; textes longs coupables cassés).
- R-FA2 : cibles tactiles ≥ 38 px desktop / ≥ 42-44 px mobile ; libellés de boutons autorisés à passer à la ligne.
- R-FA3 : **normaliser à la lecture** (ou migrer une fois) les data-URL d'images mal formées présentes en base (avatars/bestiaire) ; le nouveau code ne doit pas dépendre d'un observer pour ça.
- R-FA4 : menus et modales bornés à la fenêtre avec défilement interne.

**Obsolète** : tout le reste (rayons, ombres, couleurs), le MO global.

### 3.4 `theme-max.js` (2 155 l., v257 « moteur unique »)

**Ce qu'il fait** : unique moteur de thèmes (remplace « Theme Max v1-v8 »). `CONFIG` par thème (`:19+`) avec `id, label, cls, rarity, category, tagline, desc, colors[3], tone (dark|light), vars {bg…accent2Rgb, pageBg}, signature`. Thèmes : `dark` « Nuages Polaires » (`bg #091519`, accent `#95cdbb`, accent2 `#c6b38b` — palette « Mystique polaire »), `light` « Brume Claire », `violet` Galactique (pluie de météores `scheduleGalaxyMeteor`, `:1660`), `green` Sylvan, `easter` Pâques, `halloween`, `noel` Noël, `aquaris`, `bloodmoon`, `red` (présent dans `THEME_CLASSES` de `theme-regression.js:22`). Applique les variables `--tm-*` et `data-theme-active`, `data-theme-tone`, `data-theme-engine` sur `body` ; patche les métadonnées globales `THEMES_BASE`, `THEMES_EVENT_BUILTIN`, `THEME_BASE_VISIBLE`, `THEME_SECRET_SLOTS` (`:1666-1690`) ; helpers `normalizeThemeId`, `themeMeta`, `prettyThemeName`, `categoryOrder`, `rarityTone`, `themeRestrictionLabel`, `themeMaxPreviewColors`, `themeMaxAuditReport`, `themeMaxRefresh` ; enveloppe `applyTheme` (`:2094-2103`) et des renderers (`wrapRenderers`, `:2085`) pour re-polir après rendu ; MO body ; filtres de collection mémorisés dans `localStorage["np_theme_collection_filters_v257"]` (`:16`).

**Exigences à préserver**
- R-TM1 : une **seule source** de métadonnées de thème (id, libellé, rareté, catégorie, tagline, description, 3 couleurs d'aperçu, ton clair/sombre, variables). Exemple de forme :
  ```json
  {"id":"dark","label":"Nuages Polaires","rarity":"Base","category":"Base","tone":"dark",
   "tagline":"Mystique polaire — un monde à écrire.","colors":["#091519","#95cdbb","#c6b38b"]}
  ```
- R-TM2 : application d'un thème = jeu de variables CSS + attribut de ton sur la racine, sans réécriture DOM ; persistance locale `np_theme` + serveur `self_set_theme`.
- R-TM3 : normalisation des ids (`theme-violet` ≡ `violet`, minuscules) partout — clé de compatibilité avec les comptes existants (`unlockedThemes`, `blockedThemes`, `selectedTheme`, `theme_visibility`).
- R-TM4 : les thèmes saisonniers (`rarity:'Saisonnier'`) peuvent être verrouillés temporairement et débloqués par l'admin (`admin_grant_theme`, `admin_grant_theme_all`, `admin_set_theme_autogrant`).

**Obsolète** : 130 Ko de CSS injecté (323 `!important`), effets (météores), wrappers, MO, 3 palettes concurrentes pour le thème sombre (voir §4.5).

### 3.5 `api-hardening.js` (507 l., v274)

**Ce qu'il fait**
- Bandeau fixe `#np-api-status-banner` (états `warn|bad|ok`, boutons « Réessayer », « Diag », « × ») et pile de toasts `#np-api-toast-stack` (max 2, dédoublonnage 9 s / 18 s pour `bad`, durée 5 200 ms).
- `wrapFetch` (`:310-337`) : classe l'URL (`/.netlify/functions/db` → `db`, `/auth` → `auth`), marque `bad` sur HTTP ≥ 500 / erreur réseau, `ok` sinon, **en ignorant les réponses d'une génération de session périmée**.
- `wrapApiFunctions` (`:350-397`) : enveloppe `_dbCall`, `_authCall`, `_jsonPost` ; **conserve les arguments** (`Array.prototype.slice.call(arguments)` — le bug v274 qui envoyait un payload vide au login, verrouillé par `scripts/check-api-hardening-wrapper.js`) ; lève `SESSION_CHANGED` si la session a changé pendant l'appel ; en cas d'erreur renvoie `{ok:false, offline:true, status:0, error, source:'api-hardening', at, action}` sauf `opts.throwOnError`.
- `checkServices` (`:417-455`) : `ping` DB ; `verify` Auth **seulement si** l'app privée est visible ou en manuel (« v274: before login, stay passive… they can clear cookies or pollute the login flow ») ; 401 = `warn` (pas une panne).
- Événements `visibilitychange` (visible) et `online` → recheck ; `offline` → bandeau « Réseau navigateur hors ligne. Les sauvegardes peuvent échouer. » ; `unhandledrejection` filtré par regex.
- Messages : « DB indisponible — HTTP {n}. Le site reste ouvert, mais certaines données peuvent ne pas se sauvegarder. », « Auth indisponible… », « Service indisponible… », « Connexion aux services rétablie. », « Vérification des services… », « Réseau navigateur de retour. Vérification des services… ».
- API : `window.npApiHardening {version, state(), check, retry, toast, showBanner, hideBanner}` (consommée par `database-admin-polish.js:264`).

**Exigences à préserver (toutes)**
- R-API1 : un état de santé global `{online, db:'unknown|ok|warn|bad|idle', auth, lastError, lastStatus, lastCheckAt, failures}` visible dans l'UI (bandeau non bloquant + action « Réessayer » + accès diagnostic).
- R-API2 : **aucun appel `verify`/session automatique avant connexion** ; 401 n'est pas une panne.
- R-API3 : toute réponse réseau est liée à la génération de session qui l'a émise ; une réponse tardive après logout/changement de compte est ignorée (erreur typée `SESSION_CHANGED`).
- R-API4 : une erreur réseau ne casse pas l'UI : payload d'erreur normalisé et message humain ; les toasts sont dédoublonnés et limités.
- R-API5 : revérification à `visibilitychange`, `online`, et sur action manuelle ; message dédié en `offline`.

**Obsolète** : les wrappers (le nouveau client HTTP doit intégrer ces règles nativement), la double enveloppe de `fetch` avec `diagnostics.js`.

### 3.6 `diagnostics.js` (537 l., v258) et `site-self-test.js` (410 l., v260)

- Diagnostics : panneau `#np-diagnostics-panel` ouvert par `Ctrl+Alt+D`, `?diag=1` ou `npDiagnostics.open()` ; journal de 80 événements (`addEvent`), capture des erreurs globales, tests DB/Auth lisibles ; persistance `localStorage["np_diag_visible"]` ; **deuxième** wrapper de `window.fetch` (`:471-494`, flag `__npDiagWrapped`).
- Self-test : bouton « Test site » injecté dans le panneau diagnostics (MO body), rapport copiable.

**Exigences** : R-DG1 un panneau de diagnostic accessible aux admins (santé API, variables critiques via `admin_health`, derniers événements, rapport copiable). Le raccourci clavier et `?diag=1` sont des conforts. Les wrappers et l'injection par MO sont de la dette.

### 3.7 `admin-dashboard.js` (1 111 l., v267 = fusion v263 console + v264 polish)

- Console technique dans Staff → Tableau de bord (`#p-admin-dashboard-c`) : santé serveur (`runDashboardServerHealth` → auth `admin_health`), diag, self-test, rapport copiable/téléchargeable, 24 dernières actions, gate admin (`installAdminGate`, `syncAdminOnly` toutes les 1 000 ms), re-rendu **toutes les 5 000 ms** (`:714-717`) plus `setInterval(refresh,5000)` (`:1080`), enveloppe `renderStats` deux fois (flags `__dashboardConsoleV263` et `__dashboardPolishV264`) et `renderDashboardConsole`.
- Alias de compatibilité : `npDashboardConsole`, `npDashboardPolish`, `npAdminDashboard`, `renderDashboardConsole`.

**Exigences** : R-AD1 un tableau de bord admin unique : statistiques, santé serveur, diagnostic, self-test, tests thèmes, dernières actions ; réservé au rôle admin **côté serveur et côté client**. Le polling 5 s et les enveloppes ne sont pas des exigences.

### 3.8 `theme-regression.js` (519 l., v268)

- Bouton « Tester les thèmes » + « Copier rapport thèmes » dans le tableau de bord admin (injection toutes les 1 000 ms + MO) ; applique successivement 9 thèmes (`dark, light, violet, green, easter, halloween, noel, aquaris, bloodmoon`) de façon non destructive et vérifie contrastes/variables.

**Exigence** : R-TR1 un test automatisé des thèmes (contraste texte/fond, variables présentes) — à déplacer dans la suite de tests (Playwright) plutôt que dans l'UI admin.

### 3.9 `staff-navigation.js` (410 l., v271)

- Calcule le rôle (`CU.role` ou classes `is-admin|is-mj|is-designer` sur `#app-root`/`#s-app`), pose ces classes sur `body` (`syncBodyRole`) — **d'autres modules dépendent de ces classes** (`admin-dashboard.js:22`, `database-admin-polish.js:18`, `theme-regression.js:31`).
- Pastille de rôle dans l'en-tête, hint sur le menu Staff, `title`/`data-staff-tool` sur les entrées (`joueurs`→« Personnages », `combat-mj`→« Simulation », `apparitions`→« Apparitions », `bestiaire-admin`→« Atelier bestiaire », `serments-admin`→« Atelier serments », `database`→« Administration : tableau de bord, comptes, thèmes et logs »), en-tête « Staff » du drawer avec pastille « Admin | Designer | MJ », séparateur avant les entrées admin.
- Refresh toutes les 1 500 ms + MO.

**Exigences** : R-SN1 la navigation staff est dérivée du rôle (`admin`, `mj`, `designer`) avec les intitulés ci-dessus ; les entrées admin sont invisibles aux non-admins ; le rôle est affiché. Tout le reste (injection, polling) est dette.

### 3.10 `connected-pages-polish.js` (501 l., v270)

- Jetons de lisibilité `--np-readable-card/-strong/-border/-border-strong/-soft/-shadow/-shadow-strong` définis sur `#app-root` à partir des `--tm-*` ; variantes clair (`body.light`, `[data-theme-tone="light"]`, `[data-theme-active="light"]`).
- **Hack notable** (`:94-132`) : sélecteurs d'attribut `[style*="background:rgba(7,8,16"]`, `[style*="linear-gradient(160deg,#0e1020,#0d0e18)"]`, etc. pour neutraliser en mode clair des **fonds sombres écrits en inline** par `main.js` (ex. `main.js:13351`, `:13375`, `:13746`).
- Boutons : rayon 13 px, `min-height:38px`, bouton primaire = dégradé accent→accent-bright, texte `--tm-primary-text` ; inputs : rayon 13 px, `min-height:40px`, focus ring `0 0 0 3px rgba(accent,.12)` ; tables : en-tête teinté, survol de ligne.
- En-tête : `.hdr-profile` 50 px, avatar 44 px `object-fit:contain` sur fond `--bg4`, pseudo tronqué à 132 px, badge 17 px.
- Fondu d'onglet `.18s` ; attribut `data-active-connected-tab` posé toutes les 1 200 ms (`markActivePage`).

**Exigences** : R-CP1 un système de jetons (surface, bordure, ombre, texte, texte atténué, accent, accent-2, primaire) **dérivé du thème actif** et unique ; R-CP2 états de focus visibles sur tous les contrôles ; R-CP3 en-tête stable (avatar carré à ratio conservé, pseudo tronqué, badge de rôle) ; R-CP4 **aucun fond de couleur en inline** dans le HTML généré (cause directe du hack `[style*=…]`).

### 3.11 `mobile-polish.js` (439 l., v272)

- `html,body{max-width:100%;overflow-x:hidden}` ; ≤ 860 px : `--np-mobile-pad:14px`, grilles en 1 colonne, boutons `min-height:44px; padding:10px 13px; touch-action:manipulation`, **inputs `font-size:16px; min-height:44px`** (évite le zoom iOS), textarea 104 px ; en-tête 62 px, avatar 42 px, pseudo 120 px ; drawer `min(88vw,360px)` ; Database : barre d'onglets en défilement horizontal, tables `overflow-x:auto`, `th/td nowrap`, inputs 100 % ; Bestiaire admin en colonne ; simulateur en 1 colonne, logs `max-height:55svh` ; modales `max-width:calc(100vw − 18px); max-height:calc(100svh − 24px)` ; classe `np-mobile-polish-active` posée sur `html/body` selon `matchMedia('(max-width: 860px)')`.

**Exigences** : R-MO1 point de rupture mobile 860 px (et 760/720/560/520 utilisés ailleurs — à unifier), R-MO2 cibles 44 px et inputs 16 px sur mobile, R-MO3 aucune barre de défilement horizontale (`scrollWidth ≤ innerWidth` est vérifié par `test-browser.js:20,23` et `test-rpg-browser.js:31`), R-MO4 tables larges en défilement interne, R-MO5 modales/menus bornés à la fenêtre avec safe-area.

### 3.12 `visual-audit-polish.js` (392 l., v280, contient v279)

- Icônes de nav atténuées (opacité .46 → .82 au survol), menus `min-width:236px`.
- **Compteurs de la home** (`stabilizeHomeCounters`, `:298-317`) sur `#hf-joueurs`, `#hf-creatures`, `#hf-actifs`, `#hf-gemmes`, `#hf-serments` : `''`/`'—'` → `'...'` + classe `is-loading` ; `'NaN'|'undefined'|'null'` → `'0'` + `is-unavailable`.
- Formulaires login/register/reset/HRP : bouton primaire 48 px marqué `np-visual-primary`.
- **Fiche personnage** : `#fiche .shero` en grille `auto minmax(0,1fr) auto` ; sections annotées `data-visual-section` = « Ressources » (`#p-gems`), « Etat IRP » (`#p-statuts-content`), « Equipement » (`#p-equip`), « Inventaire » (`#p-inv-c`), « Action » (`#p-csel`), « Historique » (`#p-hist`), « Journal » (`#p-journal-fiche-content`), « Combat » (`#p-combat-hist-content`) ; sections vides → pseudo-élément « Chargement... ».
- « Frames inside frames » (`:172-189`) : une carte **imbriquée** dans une carte devient transparente, sans bordure latérale ni ombre, séparée par un filet — règle de design explicite.
- Drawer mobile : `aria-label` auto sur `.drawer-item`, largeur `min(86vw,340px)`, puce colorée par section (accent / or pour staff).

**Exigences** : R-VA1 les compteurs publics ont trois états explicites (chargement, valeur, indisponible) et ne montrent jamais `NaN`/`undefined` ; R-VA2 la fiche est découpée en sections nommées (les 8 libellés ci-dessus) avec état vide/chargement ; R-VA3 **pas de carte dans une carte** ; R-VA4 un seul bouton primaire par formulaire d'entrée.

### 3.13 `database-admin-polish.js` (410 l., v273)

- Actif seulement si admin (`CU.role==='admin'` ou classe `is-admin`).
- Réécrit le `.warnbox` contenant « Données confidentielles » en : « ⚠️ **Données confidentielles** — Accès administrateur uniquement. Vérifie toujours l'onglet actif avant une action sensible. » (`:284-293`).
- Transforme la barre d'onglets interne (détectée par `style` contenant `border-bottom` et `onclick*="openDatabaseInnerTab"`) en pilules ; libellés de section `{dashboard:'Vue d'ensemble', comptes:'Comptes', themes:'Thèmes', historiques:'Log'}` (`:274`) ; note de pied : « Astuce : les onglets Comptes, Thèmes et Log sont des zones sensibles. Les boutons rouges ou destructifs doivent toujours être confirmés avant validation. » ; pastille « ADMIN » en `::after` de chaque `.card-title` ; boutons destructifs détectés par `[onclick*="delete"|"reset"|"wipe"|"clear"]` (`:185-194`).
- `ensureHero` (`:278-282`) **supprime** tout `.np-db-admin-hero` : reliquat d'un hero retiré ; `updateStatus` alimente des `[data-db-status]` qui n'existent plus.
- `setInterval(refresh, 2500)` + MO + enveloppe `renderDatabase`.

**Exigences** : R-DB1 l'écran Administration affiche un avertissement de confidentialité permanent et distingue visuellement les actions destructives (qui doivent en outre demander confirmation) ; R-DB2 quatre zones : Vue d'ensemble, Comptes, Thèmes, Log. Tout le reste est dette (détection par `onclick`, hero fantôme).

### 3.14 `home-readability-polish.js` (372 l., v269) — **non chargé**

Contenu : override de la palette sombre de base (`--bg:#070a12`, `--bg2:#0d1220`, `--text:#f8fbff`, `--glacier:#9bd8f4`, `--gold:#e4bf66`…) et de la home (`#s-home`, CTA `.home-btn-primary` dégradé `#d9f4ff→#9bd8f4→#e4bf66`, compteurs `.home-footer-*`). Ces sélecteurs (`.home-title-1`, `.home-btn`, `.home-footer`) ne correspondent plus à la home « Mystique polaire » (`index.html:6590-6626` utilise `.np-metric`, `.np-colophon`, `.np-action`). Verdict : **mort**, à supprimer ; sa palette contredit `theme-max.js` (`#091519/#95cdbb/#c6b38b`) et `index.html:20-28` (`#0d0e18/#7eb8d4/#c9a84c`).

### 3.15 `beast-admin.js` (512 l.) et `bestiary-admin-pass2.js` (302 l.)

Fonctionnels (atelier bestiaire), hors périmètre détaillé de cet audit mais construits en style « patch » : `beast-admin.js` redéfinit `window.renderBGrid`, `bCard`, `beastSearch`, `setBeastFilter`… (25 globals) ; `bestiary-admin-pass2.js` enveloppe `renderBGrid` (`:259`) et `switchTab` (`:279`) pour injecter un panneau de détail desktop (≥ 1 180 px), la complétude (`image, description, frappe, compétence, butin`), l'usage et les dates relatives (« Il y a n j/h/min », « À l'instant », « Jamais »). `_beastPersist` (`beast-admin.js:10-32`) illustre la bonne règle : verrou d'écriture, restauration de l'optimiste uniquement si la valeur en cache est encore celle de la tentative, message d'erreur dans le formulaire. À reprendre comme exigence par l'audit bestiaire.

### 3.16 Modules « propres » à prendre pour modèle

`progression.js` (UMD partagé navigateur/serveur, règles pures, `xpRequired(level) = level × 30`, `DEFAULT_GROWTH` par Serment), `first-steps.js` (rendu sans état, lit la session à chaque rendu), `adventure-archives.js` (lecture seule, DOM construit par `createElement`/`textContent`, sanitisation via `<template>`). Aucun observer, aucun wrapper, aucun `!important`.

### 3.17 Couches de style inline dans `index.html` (16 blocs empilés)

| `id` du `<style>` | Lignes | Intention |
|---|---|---|
| (sans id, feuille principale) | 19-5569 | ~5 550 lignes : variables, composants, écrans, thèmes, mobile ; contient des lignes vides `body.light /* removed light residue */` (`:44-46,49,60`) |
| `v99-popup-stability-reset` | 5571-5595 | Onglets « popup » rendus en flux (annule un ancien lightbox fixe) |
| `np-theme-global-propagation` | 5597-5674 | Variables `--np-theme-*` par thème |
| `np-theme-header-contrast-v184` | 5676-5766 | Contraste en-tête par thème |
| `np-theme-header-contrast-v185` | 5769-5852 | Idem, spécial aquaris/easter |
| `np-theme-refresh-v188` | 5855-6091 | Variables `--np-ui-*` |
| `np-theme-readability-v205` | 6094-6201 | « calmer premium themes, less glow » |
| `np-light-consistency-v217` | 6204-6363 | Mode clair `--panel-*` |
| `np-theme-aquaris-v231` | 6366-6542 | Thème aquaris |
| `v104-overlay-cmdk-fix` | 7510-7651 | `#runtime-guard`, palette de commandes |
| `mac-home-premium-pass` | 7653-7925 | « v214 — Page d'entrée premium, Mac-safe » |
| `np-theme-easter-contrast-v227` | 7927-8070 | Thème easter |
| `np-theme-easter-garden-v228` | 8073-8138 | Décors easter (`::before/::after` forcés) |
| `beast-admin-v230-style` | 8141-8612 | Atelier bestiaire |
| `np-accessibility-serious-pass` | 8618-8766 | Focus ring `--np-focus-ring`, sélection, `prefers-reduced-motion` |
| `theme-consistency-final-pass` | 8769-8908 | « v237 uniformisation finale des thèmes » |
| `mobile-global-pass-v240` | 8911-9025 | Mobile ≤ 980/560/400 px |

Plus 8 feuilles externes (`assets/css/polar-*.css`, `first-steps.css`, `adventure-archives.css`, chargées `index.html:6546-6553` **au milieu du body**). Chaque « passe » a été ajoutée sans retirer la précédente : 959 `!important` dans `index.html`, 167 dans `polar-connected.css`. L'overhaul doit repartir d'une seule feuille par domaine, avec les jetons de §3.4/§3.10.

---

## 4. Dette technique

### 4.1 Globals et couplage par ordre de chargement

- `main.js` : 747 fonctions top-level (`function …`), 126 déclarations top-level, 72 `window.X =`, aucune IIFE englobante : tout est global, y compris l'état (`CU`, `_dbCache`, `_dbVersions`, `_dbSessionGeneration`, `_DB_WRITE_QUEUE`, `_cs` (simulateur), `_viewPid`, `_dbTab`…).
- Les modules patch **lisent ces globals par nom** (`CU`, `can`, `ge`, `gp`, `gpid`, `sto`, `sv`, `notif`, `getAllSD`, `renderAdminThemes`…) et se **réveillent par timers** parce qu'ils ne savent pas quand `main.js` a fini de rendre (`wrapApiFunctions` relance toutes les 300 ms jusqu'à trouver `_dbCall`, `api-hardening.js:394-396`).
- `esc` est défini deux fois (`main.js:155` et `:10269` `function esc(s){ return escAttr(s); }`) : la seconde écrase la première silencieusement.
- Dépendance inversée : `main.js` appelle `toggleThemeVisibility` (3 refs) défini dans `ui-patches.js`, chargé après.
- `isAdmin()`/`escapeHtml()`/`safeJson()` sont recopiés dans 4-5 modules.

**Exigence** : modules ES avec imports explicites, état applicatif dans un store unique, aucune lecture de `window.*` entre modules, aucun timer de « découverte ».

### 4.2 Gestionnaires inline et CSP

- `onclick=` : 427 occurrences (`index.html` 103, `main.js` 283, `beast-admin.js` 11, `rpg-prototype.js` 13, `admin-dashboard.js` 7, `adventure-archives.js` 5, `ui-patches.js` 3…) ; `oninput`, `onfocus`, `onblur` également (`index.html:7273`).
- `style="` : 898 occurrences (`main.js` 761, `index.html` 97, `beast-admin.js` 23…).
- CSP (`netlify.toml:24`) : `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://i.imgur.com blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;` — commentaire l.23 : « unsafe-inline reste nécessaire aux handlers et styles inline historiques ». `docs/security-and-data.md:53` classe le retrait comme « étape distincte ».
- Les échappements de chaînes JS dans des attributs (`jsesc`, `q()` dans le RPG, test XSS `test-rpg-browser.js:23-26`) n'existent que parce que le code injecte du JS dans le HTML.
- Autres en-têtes (`netlify.toml:11-21`) : `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`, `X-Permitted-Cross-Domain-Policies: none`.
- Google Fonts : préchargées `index.html:13-18` (Cinzel, Crimson Pro, JetBrains Mono) alors que `assets/fonts/` contient Cinzel, Cormorant Garamond, Manrope en woff2 locaux (charte Mystique polaire) — double source de polices, CSP ouverte à `fonts.googleapis.com` pour rien si les locales suffisent.

**Exigences** : R-CSP1 CSP **stricte** dès le départ (`script-src 'self'` sans `unsafe-inline`, styles externes ou nonce), zéro `on*=` et zéro `style=` généré ; R-CSP2 conserver les autres en-têtes tels quels ; R-CSP3 polices locales uniquement (retirer `fonts.googleapis.com`/`gstatic` de la CSP) ; R-CSP4 `img-src` : garder `data:` et `blob:` tant que les avatars base64 existent, réévaluer `i.imgur.com`.

### 4.3 `localStorage` — inventaire des clés et règles à conserver

| Clé | Écrite par | Contenu | Statut |
|---|---|---|---|
| `np_theme` | `main.js:3745`, `:16318` | id du thème | Confort, OK |
| `np_theme_visibility` | `main.js:898,4110,4200`, `ui-patches.js:25,245` | map id→bool | Cache de donnée serveur ; `_LOCAL_ONLY_KEYS=["theme_visibility"]` (`main.js:1369`) contredit `EXACT_WRITE_RULES.admin` (`db.js:92`) et l'action auth `admin_set_theme_visibility` (Q8) |
| `np_cache_version` = `"np_v9_private_cache"` | `main.js:1237-1265` | invalidation du cache public | À remplacer par un vrai versionnage |
| `np_beasts`, `np_serments_custom`, `np_events`, `np_event_themes`, `np_theme_visibility`, `np_lieux`, `np_public_stats` | `main.js:1257-1259,1313-1319` | cache offline des clés publiques | Seul `public_stats` est réécrit au bootstrap ; les autres sont lus s'ils existent |
| `np_session_flag`, `np_session` | `main.js:2203-2206,1982,3148,3192` | drapeau « se souvenir » (pseudo) | Le cookie `np_session` httpOnly reste la vraie session |
| `np_last_app_tab` | `main.js:4348,4384` | `{id, settingsTab, at}` | Confort (restauration d'onglet) |
| `np_app_build` = `"np_v18"` | `main.js:16309-16321` | migration one-shot (`np_runtime_guard`, `np_cmdk_recent`, renommage `violet`→`theme-violet`) | Dette : migration codée en dur |
| `np_runtime_visible`, `np_diag_visible` | `main.js:16474-16475`, `diagnostics.js` | panneaux debug | Confort admin |
| `np_theme_collection_filters_v257` | `theme-max.js:16` | filtres de la collection | Confort |
| `np_spawn_lab_state_v1` (legacy) + `_spawnLabUiKey` | `main.js:13852,14003` | état UI Apparitions | Purgé |
| `np_rpg_guest_v2`, `np_rpg_proto_v1` | RPG | voir §1.5 | À purger / décider |
| `np_combat_arc_*` (legacy) | ancien code | archives de combat locales **en quarantaine** | Récupération explicite (`_showLegacyCombatArchiveRecovery`, `main.js:1440-1470`) : boutons « Télécharger ma copie JSON », « Effacer les copies exportées… » (activé seulement après téléchargement), « Plus tard » |

Règles en vigueur à **préserver** (`main.js:1345-1369`, `:1559-1580`, `docs/security-and-data.md:55`) :
- R-LS1 `_isPrivateKey` : `accounts`, `players`, `spawn_lab_staff`, `np_syslog*`, `np_audit_log`, `audit_log`, `combat_arc_*`, `recent_crop_images` ne sont **jamais** écrits en `localStorage` ; `_purgePrivateBrowserStorage()` s'exécute au chargement (`:1559`), au login (`:2316`) et au logout (`:5254,5264`).
- R-LS2 une valeur non confirmée par le serveur n'est jamais présentée comme « sauvegardée » ; le brouillon reste en mémoire.
- R-LS3 les archives locales héritées ne sont ni réimportées ni effacées sans action explicite du propriétaire connecté.
- R-LS4 `sv('accounts', …)` est refusé côté client (« Les comptes se modifient uniquement via les actions de gestion dédiées. », `:1564`).

### 4.4 Doublons et redéfinitions

- `_loadSessionBundle` enveloppé 3× (`ui-patches.js`), `applySessionBundle` 1× ; `window.fetch` 2× (`api-hardening.js:336`, `diagnostics.js:494`) ; `renderBGrid` défini par `beast-admin.js` puis enveloppé par `ui-patches.js:193` et `bestiary-admin-pass2.js:259` ; `renderStats` enveloppé 2× dans `admin-dashboard.js` (`:696-703`, `:1035-1045`) ; `switchTab` enveloppé (`bestiary-admin-pass2.js:279`) ; `applyTheme` enveloppé (`theme-max.js:2094`) ; `renderDatabase` enveloppé (`database-admin-polish.js:378`) ; `renderCollection` remplacé (`ui-patches.js:166`).
- Chaîne de sélecteurs `body:not(.light):not(.theme-violet):not(.theme-red):not(.theme-green):not(.theme-easter):not(.theme-halloween):not(.theme-noel):not(.theme-aquaris):not(.theme-bloodmoon)` répétée dans `home-readability-polish.js` et `connected-pages-polish.js` (liste de thèmes codée en dur, à maintenir à chaque nouveau thème).
- Points de rupture mobiles divergents : 980, 900, 860, 760, 720, 680, 640, 560, 520, 400 px selon les fichiers.
- Trois palettes « sombre de base » (§3.14).
- `docs/PATCHES.md:44-46` triple entrée identique ; `docs/architecture.md` et `module-registry.json` désynchronisés (§3.1).

### 4.5 Code mort et reliquats

- Carte du monde (§2) ; `home-readability-polish.js` (§3.14) ; `'carte'` dans `TAB_POPUP_IDS` ; `_carteLoaded` jamais lu ; CSS Leaflet.
- `index.html:7314` `<!-- JOURNAL DE BORD -->` : commentaire orphelin, plus d'onglet.
- `index.html:5` `<!-- NP v3.6.5 — 2026-04-01 -->` : version stale (le site est v297).
- `index.html:44-49,60` : lignes `body.light /* removed light residue */` (sélecteurs vides laissés en place).
- `main.js:1324-1334` `npQaHeartbeat` : filet de sécurité qui recrée `_dbCache`/`VISIBLE_THEMES` s'ils manquent.
- `main.js:16306-16321` migration `APP_BUILD` one-shot.
- `database-admin-polish.js` : `ensureHero` supprime un hero jamais créé ; `updateStatus` cible des `[data-db-status]` absents.
- `ui-patches.js:34` commentaire « v42 restored tail code » : code restauré d'une version antérieure.
- Dossier `Nuages Polaires/` à la racine contenant un `README.md` de 2 lignes (« Nouveau dossier. ») : reliquat.
- `.rpg-nav-btn` : nommage RPG pour un composant générique.
- 132 `catch(e){}` vides dans `main.js` (erreurs avalées).

### 4.6 Performance et chargement

- Poids source total front : **2 142 533 octets** (hors `assets/vendor/jspdf/jspdf.umd.min.js`, `assets/fonts/*.woff2` ≈ 127 Ko, `assets/images/nuages-polaires-horizon.jpg` 270 170 o.). `index.html` 472 342 o. (dont ~7 000 lignes de CSS inline), `main.js` 1 016 115 o., `theme-max.js` 129 718 o. Aucune minification, aucun hash, aucun `defer`/`async`/`type="module"` : 20 scripts bloquants en fin de body, CSS externes chargées au milieu du body (`:6546`).
- Tout est servi à tout le monde : un visiteur anonyme télécharge le simulateur MJ, l'admin, le bestiaire staff, les diagnostics et le RPG.
- Runtime : 11 MO + 11 intervalles (§3.1) ; `main.js:1799` `_reconcileScrollLocks` toutes les 1,8 s ; `admin-dashboard.js:714-717` re-rend la console toutes les 5 s **même hors de l'onglet** (seul `dashboardTargetId()` conditionne) ; `connected-pages-polish.js:491` pose un attribut toutes les 1,2 s.
- jsPDF chargé à la demande depuis `./assets/vendor/jspdf/jspdf.umd.min.js` (`main.js:15974-15984`) : bon pattern (lazy) à généraliser.
- Cache : `np_cache_version` manuel ; pas de `Cache-Control` explicite dans `netlify.toml` (Netlify par défaut).

**Exigences** : R-PF1 découpage par route/rôle (public / joueur / staff / admin) avec chargement différé ; R-PF2 budget indicatif : page publique < 150 Ko JS gz, aucune boucle d'observation permanente ; R-PF3 assets hashés + `Cache-Control` long ; R-PF4 polices et image d'accueil optimisées (l'image de 270 Ko en jpg mérite un format moderne + `srcset`).

### 4.7 Accessibilité

État : `aria-*` 39 dans `index.html` / 84 dans `main.js` ; `role=` 3 dans `index.html` ; `aria-live` 1/1 ; `<label` 16/129 ; `alt=` 3/6 ; `tabindex` 5/3 ; `:focus-visible` 24/2 ; `prefers-reduced-motion` 5/3 (bloc `np-accessibility-serious-pass`, `index.html:8618-8766`).
- Navigation par `<button onclick>` et hash `#tab` (`main.js:5534-5539`, `popstate` `:5635`) : pas de liens réels, pas d'URL partageable hors hash ; `.hdr-profile` est un `div onclick` (`index.html:7056`).
- Modales : une seule `role="dialog"` dans `index.html`, focus non piégé de façon systématique ; le RPG en avait une (`aria-modal`).
- Points positifs à garder : labels associés aux champs de connexion (vérifié par `test-browser.js:27`), navigation clavier fiche/thèmes/avatar (VERSION.txt v297), focus ring défini par variables, réduction des animations, `aria-label` sur le bouton réglages, `aria-hidden` sur décors SVG, `aria-labelledby` sur les sections de la home.

**Exigences** : R-A11Y1 vraies routes/liens (`<a href>`), R-A11Y2 modales avec `role="dialog"`, `aria-modal`, piège de focus, fermeture Échap, retour du focus, R-A11Y3 `aria-live` pour toasts/bannière API, R-A11Y4 contraste vérifié par thème (reprendre R-TR1), R-A11Y5 `prefers-reduced-motion` respecté (météores, fondus, particules login `main.js:15660`).

---

## 5. Pipeline build / check / test / déploiement actuel

### 5.1 Scripts npm (`package.json:13-21`)

| Script | Commande | Rôle |
|---|---|---|
| `check` | `node scripts/check.js` | `node --check` sur tous les `.js/.cjs` de `assets/js`, `netlify/functions`, `scripts` (+ `scripts/check-api-hardening-wrapper.js` qui vérifie textuellement que `api-hardening.js` contient `var args = Array.prototype.slice.call(arguments)` et pas `return fn.apply(this, arguments);`). Aucun lint, aucun typage. |
| `test` | `node --test` sur 19 fichiers | Suites serveur/SQL sur PGlite : `test-auth-security`, `test-db-security`, `test-integration`, `test-beast-persistence`, `test-archive-persistence`, `test-session-isolation`, `test-legacy-recovery`, `test-system-log`, `test-auth-target`, `test-gameplay-persistence`, `test-rpg-persistence` (à retirer), `test-store-backup`, `test-player-actions`, `test-player-actions-front`, `test-event-staff`, `test-first-steps`, `test-unified-progression`, `test-progression-concurrency`, `test-progression-reads` |
| `test:browser` | 7 scripts Playwright | `test-browser`, `test-rpg-browser` (à retirer), `test-player-actions-browser`, `test-event-staff-browser`, `test-adventure-browser`, `test-account-keyboard-browser`, `test-unified-progression-browser` ; captures dans `test-results/` (ignoré git) ; requêtes `https://**` bloquées (polices) |
| `test:auth` | `node scripts/test-auth-flows.js` | **Crée un compte** sur `NP_TEST_BASE_URL` — jamais en local par défaut |
| `build` | `npm run check && npm test && node scripts/build.js` | `build.js` : `rm -rf dist`, copie `index.html` et `assets/` (filtre `.DS_Store`) |
| `backup:store` / `backup:verify` | `scripts/backup-store.js` / `verify-backup.js` | Snapshot logique complet de `np_store` (lecture seule) / restauration de vérification en PGlite |

### 5.2 Harnais de test local (`scripts/helpers/local-app.js`)

Crée `np_store (key TEXT PK, value JSONB, updated_at)` dans PGlite, seed 5 comptes (`admin/Admin`, `alice`, `bob` joueurs liés `p_*`, `mj/Maitre`, `designer`), 3 fiches, données publiques (`beasts`, `events`, `lieux:[]`, `serments_custom`, `event_themes`, `theme_visibility`, `spawn_lab_staff`), puis charge `auth.js`/`db.js` dans un `vm` avec `@neondatabase/serverless` remplacé par PGlite, derrière un serveur HTTP local `/.netlify/functions/*` servant aussi le front. `env` de test : `NP_JWT_SECRET`, `NETLIFY_DATABASE_URL` fictif, `NP_SITE_URL=http://127.0.0.1`. C'est un actif à **conserver** (mêmes handlers que la prod, SQL réel).

### 5.3 Déploiement Netlify (`netlify.toml`)

`[build] command="npm run build"`, `publish="dist"`, `functions="netlify/functions"` ; `NODE_VERSION="24"`, `NPM_VERSION="10"` ; `.nvmrc` 24 ; `engines node >=24 <25` ; `.npmrc` `fund=false audit=false`. Dépendances : runtime `@neondatabase/serverless ^0.10.4` ; dev `@electric-sql/pglite ^0.5.8`, `playwright ^1.62.1` (les devDependencies doivent être installées au build car `build` exécute `npm test`, `docs/deploy-netlify.md:18`). Variables : `NETLIFY_DATABASE_URL`, `NP_JWT_SECRET` (≥ 32 car.), `NP_SITE_URL` (scope Functions) ; temporaires `NP_ADMIN_PSEUDO`, `NP_ADMIN_PASSWORD` (≥ 8), `NP_ADMIN_RECOVERY=true` (`docs/env-vars.md`). Site prod `nuages-polaires.netlify.app`, dépôt `AshaiiTV/NuagesPolaires` branche `main` (`docs/infrastructure-review-2026-09-21.md:7`) ; au 21/09 le runtime publié était `nodejs20.x` et l'ancienne config publiait `.` sans commande (l.18-19). Pas de `.github/` ni CI ; conventions de commit `vXXX - description` (`docs/versioning.md`) ; la version est répétée à la main dans `package.json`, `VERSION.txt`, `CHANGELOG.md`, `module-registry.json`, `index.html:5` (désynchronisé).

### 5.4 Ce qu'il faut garder du pipeline

- R-PL1 `build` = contrôle + tests + génération ; les tests serveur tournent sur SQL réel (PGlite) avec les vrais handlers ; les parcours Chromium utilisent le vrai front.
- R-PL2 aucun test d'écriture ne vise la production ; `test:auth` reste opt-in avec cible explicite.
- R-PL3 sauvegarde logique avant toute publication (`backup:store` + `backup:verify`), preview Netlify avec base et secret **dédiés** (`docs/deploy-netlify.md:18`).
- R-PL4 Node 24, publication `dist/` seule (jamais les sources serveur/tests).
- À ajouter : lint/typage, CI, hash d'assets, contrôle CSP automatisé (test qui échoue si `on*=` ou `style=` apparaissent dans le HTML généré).

---

## 6. Questions ouvertes

1. **Données RPG en base** : que faire de l'entrée `rpg_characters` (1 personnage en prod) et de `localStorage["np_rpg_proto_v1"]` (conservé sans propriétaire identifié) ? Proposition : export dans la sauvegarde, suppression de la clé par migration explicite, purge locale des deux clés `np_rpg_*` ; le serveur répond 410 aux actions `rpg_*`. À valider.
2. **Lieux** : la donnée `lieux` (clé publique, écriture admin) doit-elle survivre comme « atlas » narratif (nom, type, description publique, notes staff, visible/masqué) sans carte interactive, ou être supprimée avec la carte ? Contenu réel en production non vérifié ici.
3. **Simulateur MJ (`combat-mj`, « Simulation »)** : l'audit produit le classe cœur (« tant que le MJ en garde la conduite »). Confirmer que « combats jouables en solo » ne vise que le RPG et que le simulateur, les Apparitions et les archives restent des outils de table.
4. **Collection de thèmes** : raretés (« Base », « Saisonnier », « Fondateur », « Secret scellé »), pourcentage de progression, déblocages automatiques — gamification à conserver, simplifier ou retirer ?
5. **Palette sombre canonique** : `theme-max.js` (`#091519 / #95cdbb / #c6b38b`, charte Mystique polaire) vs `index.html:20-28` (`#0d0e18 / #7eb8d4 / #c9a84c`) vs `home-readability-polish.js` (`#070a12 / #9bd8f4 / #e4bf66`, non chargé). Laquelle fait foi ?
6. **URL et partage** : les onglets sont adressés par hash (`#fiche`, `#evenements`). Faut-il des URL profondes partageables sur Discord (fiche d'un personnage, événement, archive) — ce qui impose de vraies routes et une politique d'accès par URL ?
7. **CSP stricte** : le retrait de `'unsafe-inline'` (script et style) est-il une exigence ferme de l'overhaul ? (Recommandé oui ; cela interdit tout `onclick`/`style=` généré.)
8. **`theme_visibility`** : `main.js:1369` la déclare « locale uniquement » (`_LOCAL_ONLY_KEYS`) alors que le serveur l'accepte en écriture admin (`db.js:92`) et via `admin_set_theme_visibility` (`auth.js`), et que `ui-patches.js` l'hydrate depuis le bundle. Quelle est la source de vérité ?

---

## 7. Ce qu'il faut absolument préserver dans l'overhaul

1. **Toutes les garanties serveur** de `db.js`/`auth.js` : versions opaques par clé, `expectedVersion` obligatoire (428 sinon), 409 `VERSION_CONFLICT` sans écrasement, CAS atomique, clés publiques explicites, règles d'écriture par rôle (`EXACT_WRITE_RULES`, `PREFIX_WRITE_RULES`), `BLOCKED_CLIENT_KEYS`, bornes de taille (`MAX_VALUE_SIZE` 4 Mo, `MAX_ARRAY_ITEMS` 5 000, `MAX_STRING_LENGTH` 25 000, `MAX_IMAGE_DATA_URL_LENGTH` 350 000, `MAX_DEPTH` 24), actions métier dédiées (`patch_own_player`, `consume_own_item`, `dismiss_notifications`, `set_event_participation`), audit serveur, `sessionVersion` révocable.
2. **Isolation de session côté client** : génération de session, rejet des réponses tardives, purge du stockage privé au login/logout, `SESSION_CHANGED` (R-API3, R-LS1-4).
3. **UX de conflit** : brouillon conservé en mémoire, jamais annoncé comme sauvegardé, téléchargeable, rechargement explicite (pattern du RPG §1.7 et de `main.js:1504-1552`).
4. **Bandeau de santé API non bloquant** avec « Réessayer » et diagnostic, vérification passive avant connexion (R-API1-5).
5. **Récupération des archives de combat locales héritées** : téléchargement puis effacement confirmé (R-LS3).
6. **Règles d'ergonomie** issues des passes : pas de débordement horizontal, cibles 44 px, inputs 16 px mobile, menus/modales bornés, pas de carte dans une carte, compteurs à trois états, fiche en sections nommées, un bouton primaire par formulaire, focus visible, `prefers-reduced-motion` (R-FA1-4, R-MO1-5, R-VA1-4, R-CP2-4).
7. **Thèmes** : une source unique de métadonnées, normalisation des ids compatible avec les comptes existants, visibilité pilotée par l'admin, distinction visible/obtenu/équipé/secret (R-TM1-4, R-UI1-3).
8. **Navigation staff par rôle** avec les intitulés en vigueur : « Mon aventure » (Tableau de bord, Mon personnage, Archives de combat), « Univers » (Synopsis, Serments, Bestiaire), « Règles » (Premiers pas, Système de jeu, Règlement HRP), « Événements », Staff → « Maîtriser une partie » (Personnages, Simulation, Apparitions), « Création » (Atelier bestiaire, Atelier serments), « Admin » (Administration) (`index.html:6992-7045`, R-SN1).
9. **Normalisation à la lecture** des data-URL d'images mal formées (R-FA3) et validation des URL d'images.
10. **Harnais de test** (PGlite + handlers réels + Playwright), `backup:store`/`backup:verify`, publication `dist/` seule, Node 24, en-têtes de sécurité (hors CSP à durcir).
11. **Modules modèles** : `progression.js` (règles partagées navigateur/serveur), `first-steps.js`, `adventure-archives.js`.
12. **Textes et libellés** listés dans ce document (états de synchronisation, messages d'erreur API, avertissement Administration, libellés de sections de fiche, intitulés de navigation) : ils portent la voix du site.

## 8. Ce qui relève de la dérive / dette

**Dérive « jeu en ligne » (à supprimer)** : `assets/js/rpg-prototype.js` et tous ses points d'entrée (§1.1) ; actions `rpg_get_character`/`rpg_save_character` et clé `rpg_characters` ; présence simulée (`BroadcastChannel`, `fakePlayers`) ; boutique, or, XP `level×35`, combats solo, quête d'initiation ; carte SVG du RPG ; carte Leaflet dormante du compagnon et sa gestion de lieux (§2) ; promesse « RPG — expérimental » dans la home, la nav, le drawer et Premiers pas.

**Dette structurelle (à ne pas reproduire)** : monolithe global (`main.js` 16 855 l., `index.html` 9 040 l.) ; 20 scripts bloquants ; 16 blocs `<style>` de passes successives + 8 CSS + CSS injecté par 11 modules ; 2 418 `!important` ; 427 `onclick=`, 898 `style=`, CSP `unsafe-inline` ; 11 `MutationObserver` + 11 `setInterval` de re-polish ; monkey-patching en chaîne (`_loadSessionBundle` ×3, `fetch` ×2, `renderBGrid` ×2, `renderStats` ×2, `switchTab`, `applyTheme`, `renderDatabase`, `renderCollection`) ; hacks `[style*="background:rgba(7,8,16"]` ; détection de boutons destructifs par contenu d'`onclick` ; `esc` défini deux fois ; 132 `catch` vides ; `isAdmin`/`escapeHtml` recopiés ; points de rupture mobiles divergents ; trois palettes sombres ; `home-readability-polish.js` mort mais documenté actif ; registre de modules désynchronisé ; versions répétées à la main (`index.html:5` en v3.6.5) ; migrations `localStorage` codées en dur (`np_app_build`, `np_cache_version`) ; polices Google + locales ; dossier `Nuages Polaires/` parasite ; absence de lint, de CI, de hash d'assets.
