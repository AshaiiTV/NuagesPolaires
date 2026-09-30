# 06 — Les tests comme spécification comportementale

> Audit de lecture seule du dépôt `C:\Users\sacha\NuagesPolaires`, domaine « tests ».
> Sources lues intégralement : les 27 fichiers `scripts/test-*.js` (4 392 lignes) et les 2 helpers `scripts/helpers/*.js` (173 lignes), plus `assets/js/progression.js` (82 lignes) pour vérifier les formules que les tests figent.
> Toutes les références sont de la forme `fichier:ligne`. Les libellés entre guillemets sont recopiés à l'identique (ils portent l'identité du site).

---

## 0. Périmètre, méthode et limites

### 0.1 Ce que couvre ce document

Chaque fichier de test a été relu comme un cahier des charges : chaque assertion est reformulée en **exigence** (« Le serveur refuse X quand Y », « Après rechargement, Z est conservé »). Les fixtures (comptes, personnages, créatures, événements, archives, serments, sauvegardes) sont extraites en JSON car elles décrivent les **formes réelles des données** stockées dans `np_store`.

### 0.2 Pipeline de test (package.json)

| Commande | Contenu | Runner |
|---|---|---|
| `npm run check` | `node --check` sur tous les `.js` de `assets/js`, `netlify/functions`, `scripts` + `check-api-hardening-wrapper.js` (vérifie deux chaînes littérales dans `api-hardening.js`) | `scripts/check.js:1-10` |
| `npm test` | 19 fichiers `node --test` (dont 3 qui sont en réalité des scripts autonomes exécutés par `node --test` : `test-auth-security.js`, `test-db-security.js`, `test-beast-persistence.js`) | PGlite (PostgreSQL en mémoire) |
| `npm run test:browser` | 7 scripts Playwright/Chromium headless, séquentiels | vrai navigateur + vrais handlers Netlify + PGlite |
| `npm run test:auth` | `test-auth-flows.js` contre un déploiement distant (`NP_TEST_BASE_URL`) | fetch réel |
| `npm run build` | `check` puis `test` puis `scripts/build.js` | — |

### 0.3 Trois familles techniques de tests

1. **Tests serveur « vrais handlers »** : `createLocalApp()` charge `netlify/functions/auth.js` et `db.js` dans un `vm` Node, remplace `@neondatabase/serverless` par PGlite et expose `app.call('auth'|'db', body, cookie)` (`scripts/helpers/local-app.js:15-83`).
2. **Tests client « tranches de main.js »** : ils découpent `assets/js/main.js` par repères textuels (`section('function doLvlUp(p){', '// Save a detached draft;')`) et exécutent la tranche dans un `vm` avec un contexte simulé. **Conséquence critique pour l'overhaul** : ces tests figent des *noms de fonctions* et des *commentaires-repères* du monolithe (voir §5, dette).
3. **Tests navigateur** : Playwright pilote `index.html` servi par `local-app.js`, toutes les URL `https://**` sont bloquées (`page.route('https://**/*', route => route.abort())`), aucune ressource externe n'est tolérée.

### 0.4 Ce que les tests NE couvrent PAS (à documenter ailleurs)

- Aucun test de la carte du monde, du constructeur, du bestiaire côté joueur, de l'inscription réelle en navigateur, de la fonction `register` côté serveur hors concurrence, des thèmes d'événement côté rendu, des lieux, du spawn lab.
- Aucun test de rendu visuel autre que « pas de débordement horizontal » et des captures d'écran non comparées.
- Aucun test de `scripts/build.js` ni des 18 scripts de polish (sauf `npDashboardPolish.refresh()` dans `test-browser.js:78-79`).

---

## 1. Infrastructure de test (helpers) — la « base de référence » implicite

### 1.1 `scripts/helpers/local-app.js` — fixture PostgreSQL + handlers de production

**Schéma unique** (`local-app.js:17`) :
```sql
CREATE TABLE np_store (key TEXT PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT now())
```
La « version » d'une collection est `md5(value::text)` (`local-app.js:28`) — une chaîne hexadécimale de 32 caractères (vérifié par `assert.match(bundle.data.versions.accounts, /^[a-f0-9]{32}$/)` dans `test-auth-security.js:149`).

**Comptes de référence** (`local-app.js:19-25`) — forme réelle d'un enregistrement `accounts[]` :
```json
{
  "id": "alice",
  "pseudo": "Alice",
  "role": "joueur",
  "pid": "p_alice",
  "pass": "sha256:<hex64 de 'Alice-audit-123!'>",
  "createdAt": 1700000000000,
  "lastSeen": 1700000000000,
  "sessionVersion": 0,
  "forcePasswordReset": false,
  "selectedTheme": "dark",
  "unlockedThemes": [],
  "blockedThemes": []
}
```
Cinq comptes : `admin` (role `admin`, pid `p_admin`), `alice` et `bob` (role `joueur`), `mj` (pseudo `Maitre`, role `mj`, `pid: null`), `designer` (role `designer`, `pid: null`). Les mots de passe suivent le motif `<Pseudo>-audit-123!` et sont hachés côté client en `sha256:<hex>` (`local-app.js:12`). **Les rôles reconnus par les tests sont donc exactement : `admin`, `mj`, `designer` (staff) et `joueur`.**

**Personnages de référence** (`local-app.js:26`) — forme réelle d'un enregistrement `players[]` :
```json
{
  "id": "p_alice",
  "name": "Alice",
  "classe": "Mizu",
  "level": 1, "xp": 0, "xpMax": 30,
  "pvMax": 30, "pvCur": 30,
  "epMax": 50, "epCur": 50,
  "emMax": 20, "emCur": 20,
  "progressionVersion": 1,
  "branch": "Aucune",
  "journal": "Journal alice",
  "avatar": "",
  "inventory": [],
  "history": [],
  "statuts": [],
  "equipment": { "helmet": null, "chest": null, "legs": null }
}
```
Valeurs de base d'un personnage niveau 1 : **PV 30, EP 50, EM 20, xpMax 30**.

**Données publiques de référence** (`local-app.js:29`) :
```json
{
  "beasts": [
    { "id": "visible", "name": "Loup", "nom": "Loup", "niv": 1, "pv": 30, "ep": 10, "beh": "Neutre", "adminNotes": "SECRET STAFF" },
    { "id": "hidden", "name": "Boss", "nom": "Boss", "hidden": true, "adminNote": "SECRET BOSS" }
  ],
  "events": [], "lieux": [], "serments_custom": {}, "event_themes": [], "theme_visibility": {},
  "spawn_lab_staff": { "schemaVersion": 2 },
  "np_rate_auth": {},
  "themes_admin_store": { "meta": { "private": true } },
  "np_admin_recovery_consumed": { "pseudo": "Admin", "fingerprint": "fixture" }
}
```
Cela fixe la **liste des clés de `np_store`** connues des tests : `accounts`, `players`, `beasts`, `events`, `lieux`, `serments_custom`, `event_themes`, `theme_visibility`, `spawn_lab_staff`, `np_rate_auth`, `themes_admin_store`, `np_admin_recovery_consumed`, plus (vues ailleurs) `np_syslog`, `np_syslog_archive`, `rpg_characters`, `combat_arc_<Owner>`, `combat_arc_idx_<Owner>`, `combat_arc_rec_<Owner>__<id>`.

**Environnement** (`local-app.js:32`) : `NP_JWT_SECRET`, `NETLIFY_DATABASE_URL`, `NP_SITE_URL` (l'origine du serveur local, utilisée pour la vérification `Origin`). Le cookie de session est `np_session=<JWT>` signé via `auth.signToken(auth.makeSessionPayload(account))` (`local-app.js:74-77`), ce qui expose deux fonctions internes de `auth.js` comme API de test.

**Serveur statique** (`local-app.js:63-69`) : ne sert que `index.html` et `assets/**`, et **réinjecte le `Content-Security-Policy` lu dans `netlify.toml`** sur les pages HTML (`local-app.js:68`). Exigence implicite : *le site doit fonctionner sous la CSP de production sans aucune ressource externe.*

`app.requests` journalise `{name, action, key, status}` de chaque appel (`local-app.js:58`) — les tests navigateur s'en servent pour vérifier qu'aucune écriture inattendue n'a eu lieu.

### 1.2 `scripts/test-auth-security.js` — harnais mémoire alternatif

`createMemorySql` (`test-auth-security.js:15-43`) simule 4 requêtes SQL uniquement : `CREATE TABLE`, `SELECT value…`, `UPDATE np_store … (CAS)`, `INSERT INTO np_store … [DO NOTHING]`. Le `raceOnce(hook)` permet d'injecter une modification concurrente **entre la lecture et l'écriture** (`test-auth-security.js:28,35`). Il charge `auth.js` via `Module._compile` (`test-auth-security.js:52-70`) et exporte `createRecordStore` depuis `netlify/functions/_shared/auth-store` (`test-auth-security.js:10`).

Le JWT de test (`test-auth-security.js:47-51`) : `HS256`, charge `{ exp: Date.now()+60000, sub, sessionVersion?, forcePasswordReset? }` — **`exp` est en millisecondes**, pas en secondes (question ouverte §5).

### 1.3 `scripts/helpers/store-backup.js` — format de sauvegarde logique

Format figé (`store-backup.js:7-8, 36-57`) :
```json
{
  "format": "np-store-backup-v1",
  "exportedAt": "2026-09-21T10:11:12.000Z",
  "valueEncoding": "postgresql-jsonb-text",
  "count": 3,
  "rows": [
    { "key": "accounts", "value": "[{\"id\": \"fictional\", \"pass\": \"fixture-only-not-a-real-hash\"}]", "updated_at": "2026-09-21 10:11:12.123456+00" },
    { "key": "large_numbers", "value": "{\"huge\": 9007199254740993123456789}", "updated_at": null },
    { "key": "players", "value": "[…]", "updated_at": "2026-09-21 10:11:12.123456+00" }
  ],
  "sha256": "<hex64>"
}
```
Règles : `value` reste du **texte JSONB brut** (jamais re-parsé, pour ne pas arrondir les grands nombres, `store-backup.js:10-11`), `updated_at` reste du texte PostgreSQL (microsecondes conservées), lignes triées par `key`, `count === rows.length`, `sha256` = SHA-256 du JSON canonique (clés triées) de tous les champs sauf `sha256`. Codes d'erreur : `INVALID_ROWS`, `INVALID_ROW`, `DUPLICATE_KEY`, `INVALID_JSONB`, `INVALID_FORMAT`, `COUNT_MISMATCH`, `INVALID_ROW_ORDER`, `CHECKSUM_MISMATCH`, `UNREADABLE_BACKUP`, `OUTPUT_REQUIRED`, `OUTPUT_EXISTS`, `INVALID_ARGUMENTS` (`store-backup.js:19-88`). Écriture en `wx` mode `0o600` dans un dossier `0o700`, jamais d'écrasement, jamais de symlink (`store-backup.js:64-83`).

---

## 2. Fixtures — formes réelles de données rencontrées dans les tests

### 2.1 Compte (variantes)

- Compte minimal historique (`test-auth-security.js:91-94`) : `{ id, pseudo, role, pass, createdAt }` **sans** `sessionVersion` → doit être traité comme `sessionVersion: 0` (« Historic normal sessions work with implicit sessionVersion zero », `:99-101`). Un compte sans `role` est normalisé en `joueur` (`:200`).
- Champs ajoutés par les flux : `resetExpiresAt` (supprimé après `complete_forced_reset`, `:151`), `forcePasswordReset`, `sessionVersion` (incrémenté à chaque révocation), `selectedTheme`, `lastSeen`.
- Le mot de passe temporaire admin n'est **jamais** stocké ni journalisé en clair (`:126`).

### 2.2 Personnage (variantes)

- Personnage hérité **bi-piste** avant migration (`test-unified-progression.js:11-16`) :
```json
{ "id": "p_alice", "name": "Alice", "classe": "Duelliste", "branch": "Aucune",
  "level": 2, "xp": 15, "xpMax": 60, "sLevel": 5, "sXp": 25, "sXpMax": 50,
  "pvMax": 41, "pvCur": 31, "epMax": 56, "epCur": 20, "emMax": 22, "emCur": 7,
  "inventory": [], "history": [] }
```
- Alias hérité `class` au lieu de `classe` (`test-unified-progression.js:178`) ; enregistrement `null` dans la liste (`:179`) ; collection `players` entière `null` (`:189`) → doivent tous être tolérés.
- Personnage « legacy » opaque `{ id: 'legacy', name: 'Legacy', opaque: { kept: true } }` (`test-db-security.js:81`) : un patch joueur ne doit **pas** le réécrire.
- Variante navigateur avec `arme` et branche nommée (`test-unified-progression-browser.js:33-42`) : `"arme": "Épée moyenne du serment"`, `"branch": "Branche A — L'Élan Tranchant"`.

### 2.3 Inventaire

```json
{ "id": "potion", "name": "Potion", "category": "Consommable", "qty": 2, "effect": "+20 PV", "arbitrary": "keep" }
{ "id": "gemme-blanche", "name": "Gemme Blanche", "category": "Gemme", "qty": 3 }
{ "id": "gem", "name": "Gemme", "qty": 1 }
{ "id": "potion", "name": "Potion boréale", "category": "Consommable", "qty": 4 }
```
(`test-player-actions.js:15-16`, `test-unified-progression-browser.js:40`, `test-db-security.js:118`, `test-player-actions-browser.js:33`). Les champs inconnus (`arbitrary`, `effect`) doivent être **préservés tels quels**. Quantités invalides testées : `0`, `-1`, `1.5`, `"2"` → `ITEM_UNAVAILABLE` (`test-player-actions.js:17,100-104`). Catégorie `Gemme` : seules les `qty` entières `> 0` comptent dans `public_stats.totalGemmes` (`test-unified-progression.js:195-206`).

### 2.4 Historique / notifications d'un personnage

```json
{ "ts": 101, "type": "item", "text": "Message 101", "by": "MJ" }
{ "ts": 1700000000000, "type": "xp", "text": "XP de la dernière session", "by": "Maitre" }
{ "type": "combat", "ts": 1700000000000, "text": "⚔ Récit de la fiche — 2 rounds · PV : 12/30", "by": "Maitre" }
{ "ts": 1, "type": "combat", "text": null }
```
(`test-player-actions.js:19`, `test-player-actions-browser.js:34-37`, `test-adventure-browser.js:11`). Une entrée générée par consommation : `{ ts, type: 'item', text: 'Consommé : <nom échappé> — <note échappée>', by: '<nom échappé> (joueur)' }` (`test-player-actions.js:63-67`). Le masquage de notifications est stocké dans `notifDeleted: [ts, ts, …]` sur le personnage (`test-player-actions.js:20,123`). Un `text: null` doit être rendu « Combat sans titre » (`test-adventure-browser.js:47`).

### 2.5 Créature (bestiaire)

```json
{ "id": "beast", "nom": "Loup", "beh": "Neutre", "niv": 1, "pv": 20, "ep": 20, "hidden": false, "archived": false }
{ "id": "public", "name": "Loup", "adminNotes": "secret", "nested": { "mjNote": "secret", "description": "visible" } }
{ "id": "hidden", "hidden": true, "name": "Boss" }
{ "id": "archived", "archived": true, "name": "Old boss" }
```
(`test-beast-persistence.js:10`, `test-db-security.js:40-44`). Champs de formulaire admin : `ab-n`/`eb-n` (nom), `-beh` (comportement, valeur `'3'`), `-niv`, `-pv`, `-ep`, `eb-id` (`test-beast-persistence.js:40-47`). Note : coexistence de `name` et `nom`, de `adminNotes` et `adminNote` (question ouverte).

### 2.6 Événement

```json
{ "id": "open", "nom": "Ouvert", "date": 1700086400000, "max": 2, "inscrits": ["Bob"],
  "adminNotes": "Staff secret", "nested": { "mjNote": "Hidden note", "label": "Visible" }, "arbitrary": "keep" }
{ "id": "hidden", "nom": "Masqué", "date": …, "hidden": true, "inscrits": ["Personnage Alice", "Bob"] }
{ "id": "undated", "nom": "Sans date", "date": null, "inscrits": [] }
{ "id": "legacy", "titre": "Ancien", "dateTs": …, "published": true, "inscrits": [] }
{ "id": "legacy-hidden", "titre": "Ancien masqué", "dateTs": …, "published": false, "inscrits": [] }
{ "id": "republished", "titre": "Republié", "dateTs": …, "published": false, "hidden": false, "inscrits": [] }
{ "id": "quest", "nom": "Expédition", "date": …, "max": 4, "inscrits": ["Alice","Bob"], "type": "exploration",
  "desc": "Ancienne description", "createdBy": "Auteur", "extra": { "kept": true }, "hidden": false }
{ "id": "expedition", "nom": "Expédition du navigateur", "date": …, "type": "exploration", "desc": "Rendez-vous au camp.", "max": 3, "hidden": false, "inscrits": ["Bob"] }
{ "id": "secret", "nom": "Événement masqué de test", "date": …, "type": "social", "max": 0, "hidden": true, "inscrits": [] }
{ "id": "legacy", "nom": "Événement hérité", "date": …, "type": "evenement", "max": 4, "inscrits": ["Alice","Bob"], "createdBy": "Auteur original", "extra": { "preserved": true }, "hidden": true }
```
(`test-player-actions.js:23-32`, `test-event-staff.js:23`, `test-player-actions-browser.js:41-42`, `test-event-staff-browser.js:17`). **Deux schémas cohabitent** : canonique `{nom, date, hidden}` et hérité `{titre, dateTs, published}` ; règle de précédence : `hidden` explicite (`false`) l'emporte sur `published:false` (`republished` est inscriptible, `test-player-actions.js:229-239`). Types d'événements vus : `exploration`, `social`, `evenement`, `autre` (`EV_TYPES` mocké `{ autre: { icon, col, label } }`, `test-event-staff.js:38`). `max: 0` = capacité illimitée (`test-event-staff.js:83`). Les `inscrits` sont des **noms de personnages** (chaînes), pas des identifiants (`test-player-actions.js:151-171`).

### 2.7 Archive de combat (trois clés par propriétaire)

```json
// combat_arc_rec_<Owner>__<id>  (détail complet)
{ "id": "record", "phase": "idle", "log": ["Tour 1", "Tour 2"], "fighters": [{ "id": "wolf", "pvCur": 0, "type": "beast" }] }
{ "id": "arc-0", "name": "Expédition 00", "savedAt": 1700000000000, "round": 2,
  "fighters": [{ "type": "player", "pid": "p_alice", "name": "Alice", "pvCur": 12, "pvMax": 30 }],
  "log": [{ "text": "Une trace <b>polaire</b>." }, { "text": "<img src=x onerror=\"window.archiveXss=1\">Fin du combat." }] }
// combat_arc_idx_<Owner>  (index de métadonnées, sans log ; peut contenir _stub:true)
[{ "id": "arc-0", "name": "Expédition 00", "savedAt": …, "round": 2, "fighters": [...], "_stub": true }]
// combat_arc_<Owner>  (liste de compatibilité, plafonnée à 50)
[{ "id": "browser-arc", "name": "Browser combat", "log": ["turn stored"], "fighters": [], "savedAt": … }]
```
(`test-db-security.js:155`, `test-adventure-browser.js:13-16`, `test-browser.js:44-51`). Le `log` peut être un tableau de chaînes **ou** d'objets `{text}`. L'`Owner` est le pseudo du compte **ou** le nom du personnage lié (`test-db-security.js:150-161`). Une entrée `history` de type `combat` porte un `combatId` (`test-gameplay-persistence.js:123`).

### 2.8 Serments (définitions de croissance)

Table native figée dans `assets/js/progression.js:8-14` et vérifiée contre `var SD=` de `main.js` (`test-unified-progression.js:84-93`) — `[pvN, epN, emN]` par niveau :

| Serment | pvN | epN | emN |
|---|---|---|---|
| Duelliste | 6 | 6 | 2 |
| Sauvageon | 5 | 8 | 1 |
| Croisé | 8 | 3 | 2 |
| Rôdeur | 2 | 5 | 3 |
| Traqueur | 2 | 7 | 2 |
| Flécheur | 3 | 5 | 4 |
| Elementaliste | 4 | 4 | 4 |
| Evocateur | 2 | 3 | 6 |
| Conjurateur | 2 | 2 | 7 |
| Arcaniste | 1 | 1 | 8 |
| Bretteur | 5 | 7 | 3 |
| Claymore | 7 | 4 | 2 |
| Lame d'Honneur | 7 | 5 | 3 |

Forme d'une définition : `{ "pvN": 6, "epN": 6, "emN": 2, "arme": "Épée moyenne" }` (`test-progression-concurrency.js:36-37`) ; clé `serments_custom` = `{ "<Serment>": { pvN, epN, emN } }` et **peut valoir `null`** (`test-unified-progression.js:111,180`). Serment inconnu (« Mizu », « Glacier », « Custom ») → croissance `[0,0,0]` sauf définition custom. Paliers : `getSermPalierDefsFor()` renvoie `[{ niv: 5, nom: 'Palier II' }]` (`test-progression-concurrency.js:49`).

### 2.9 Thèmes

`event_themes: [{ id: 'violet', label: 'Original label', visible?, autoGrantAll? }]`, `theme_visibility: { violet: true, green: true }` (`test-auth-security.js:349-368`). Identifiants de thèmes vus : `dark` (défaut), `light`, `violet`, `green` (verrouillé pour Alice, `test-account-keyboard-browser.js:43-48`).

### 2.10 Sauvegarde / journal système / stores internes

- `np_syslog` : liste d'entrées `{ id, ts, detail? }`, plafond **500** ; `np_syslog_archive` : lots `{ archivedAt, label, entries: [...] }`, plafond **50**, les plus récents conservés (`test-integration.js:70-95`).
- Clés localStorage héritées quarantinées : `np_combat_arc_<Owner>`, `combat_arc_idx_<Owner>`, `np_combat_arc_rec_<Owner>__<id>` ; clés privées purgées : `np_players`, `np_spawn_lab_staff` (`test-legacy-recovery.js:62-70`).

### 2.11 Dérive RPG (à ne pas reprendre, documenté pour mémoire)

```json
{ "created": true, "name": "Alice", "loc": "camp", "level": 1, "gold": 45, "hp": 30, "maxHp": 30,
  "inv": { "potion": 2 }, "equip": { "weapon": null, "armor": null, "trinket": null }, "log": ["Départ"],
  "sourcePlayerId": "p_alice", "result": { "title": "Victoire", "text": "Brouillon" },
  "ownerId": "alice", "ownerPid": "p_alice", "ownerPseudo": "Alice", "id": "rpg_alice" }
```
(`test-rpg-persistence.js:12,31-35`). Lieux : `camp`, `ridge` (« Crête »), `cave`, `forest`, `ruins`. Classes RPG : `Duelliste`. localStorage : `np_rpg_proto_v1` (ancien global), `np_rpg_guest_v2` (invité).

---

## 3. Exigences par domaine

Convention : **[S]** = testé côté serveur (handlers réels), **[C]** = testé côté client (tranche de `main.js`/module en vm), **[B]** = testé en navigateur réel.

### 3.A Authentification (`auth.js`)

Fichiers : `test-auth-security.js`, `test-integration.js`, `test-auth-flows.js`, `test-auth-target.js`, `test-browser.js`.

**Format des requêtes.** Toute requête est un `POST` JSON `{ action, ... }` avec en-têtes `content-type: application/json`, `origin` égal à `NP_SITE_URL`, et un `x-forwarded-for` (rate-limiting) (`local-app.js:79`, `test-auth-security.js:77-80`). Réponses : `{ ok, ... }` ; en succès d'authentification un en-tête `Set-Cookie: np_session=…` (`test-integration.js:28`).

| # | Exigence | Réf. |
|---|---|---|
| A1 | Le serveur répond **400** à tout corps JSON qui n'est pas un objet (`null`, `[]`, `"login"`, `42`) et à un JSON malformé (`{`), **sans** journaliser d'exception interne. | `test-auth-security.js:284-286`, `test-integration.js:66-69` |
| A2 | `register {pseudo, passHash}` renvoie **201** et un cookie ; un doublon de pseudo renvoie **409** ; deux inscriptions simultanées de pseudos distincts réussissent toutes deux ; deux inscriptions simultanées du même pseudo donnent exactement `[201, 409]` et un seul compte. | `test-auth-flows.js:78-87`, `test-auth-security.js:176-186` |
| A3 | `login {pseudo, passHash}` renvoie **401** sur mauvais mot de passe et **200** + cookie sinon ; la réponse porte `forcePasswordReset: boolean`. | `test-auth-flows.js:89-98`, `test-auth-security.js:128-130` |
| A4 | `verify` renvoie 200 avec un cookie valide, 401 sinon. Un JWT historique sans `sessionVersion` est accepté comme version 0. | `test-auth-security.js:99-101` |
| A5 | `logout` révoque le JWT **côté serveur** (un `verify` ultérieur avec le même cookie → 401) et est idempotent (second `logout` → 200). | `test-auth-security.js:153-157`, `test-integration.js:38-40`, `test-browser.js:61-63` |
| A6 | `self_change_password {currentPassHash, newPassHash}` exige le mot de passe courant (403 sinon), révoque **tous** les anciens cookies (dans `auth` **et** `db`) et renvoie un cookie de remplacement immédiatement valide. | `test-auth-security.js:107-116`, `test-integration.js:34-37` |
| A7 | `admin_reset_password {accountId}` (admin) génère un secret aléatoire `[A-Za-z0-9_-]{32}` retourné dans `temporaryPassword`, avec `expiresAt` ≤ maintenant + 1 h, révoque les sessions de la cible, ne stocke jamais le secret en clair, et refuse l'ancien mot de passe « reset ». | `test-auth-security.js:119-132`, `test-integration.js:25-33` |
| A8 | Un login avec le mot de passe temporaire ouvre une **session restreinte** (`forcePasswordReset: true`) : `verify` passe (200) mais `session_bundle`, `touch_last_seen`, `self_set_theme`, `admin_health`, `self_change_password`, `self_delete_account` et toute lecture `db` privée sont bloqués (401/403). | `test-auth-security.js:133-139`, `test-integration.js:29`, `test-db-security.js:186-189` |
| A9 | `complete_forced_reset {newPassHash}` : refusé (403) à une session normale ; accepté une seule fois par la session restreinte ; rejoue → 401 ; le mot de passe temporaire ne fonctionne plus ; la réponse porte `forcePasswordReset:false` et un cookie plein ; `resetExpiresAt` est effacé du compte. | `test-auth-security.js:102-106,140-152`, `test-integration.js:20-24,30-32` |
| A10 | Un compte marqué `forcePasswordReset:true` **sans** `resetExpiresAt` (héritage) ou avec `resetExpiresAt` dépassé ne peut ni se connecter ni vérifier ni compléter la réinitialisation (401 partout). | `test-auth-security.js:165-175` |
| A11 | `admin_set_password {accountId, newPassHash}` (admin) remplace le mot de passe et révoque les sessions de la cible. | `test-auth-security.js:158-164` |
| A12 | **Récupération admin par variables d'environnement** (`NP_ADMIN_PSEUDO`, `NP_ADMIN_PASSWORD`, `NP_ADMIN_RECOVERY=true`) : le login admin réussit en mode `forcePasswordReset:true`, les sessions admin historiques sont révoquées, et la session de récupération ne peut pas appeler `admin_health` (403). | `test-auth-security.js:189-198` |
| A13 | `session_bundle` (session pleine) renvoie `{ ok, versions: {accounts: <md5>, players, beasts, …}, data: {…} }` ; les comptes renvoyés **ne contiennent jamais `pass`**. | `test-auth-security.js:147-150`, `test-integration.js:17-19` |
| A14 | `self_delete_account {currentPassHash}` supprime **en une seule instruction SQL** le compte et son personnage lié ; les autres personnages (même avec un `history` de 250 entrées) sont strictement conservés ; le cookie devient invalide. | `test-auth-security.js:287-299` |
| A15 | Si, pendant `self_delete_account`, le `sessionVersion` du compte change (réinitialisation concurrente) **ou** le personnage est modifié (journal concurrent), la suppression est annulée en bloc (**409**) : compte et personnage subsistent, la modification concurrente est conservée. Le SQL de suppression contient un CTE `WITH locked`. | `test-auth-security.js:300-345` |
| A16 | `self_set_theme {themeId}` : deux comptes qui changent de thème simultanément conservent chacun leur choix. | `test-integration.js:51-53` |
| A17 | `admin_health` répond 200 à un admin connecté (test distant). | `test-auth-flows.js:112-115` |
| A18 | Le script de tests distants exige une origine `http(s)` **sans identifiants, chemin ni query** et refuse toute autre valeur avec le message « NP_TEST_BASE_URL doit être une origine http(s) sans identifiants, chemin ni paramètres. » sans jamais écho des secrets. | `test-auth-flows.js:54-66`, `test-auth-target.js:8-15` |

**Fusion d'enregistrements de comptes (`createRecordStore`)** — `netlify/functions/_shared/auth-store` :

| # | Exigence | Réf. |
|---|---|---|
| A19 | Deux sauvegardes concurrentes de la liste `accounts` modifiant des **champs différents** du même compte sont fusionnées (les deux survivent), et le `pass` n'est jamais écrasé par une copie périmée. | `test-auth-security.js:201-213` |
| A20 | Une modification qui arrive **pendant** l'écriture SQL (CAS échoué) est réintégrée par relecture + réessai. | `:214-223` |
| A21 | Si `sessionVersion`/`pass` d'un compte changent pendant qu'une autre requête modifie ce compte, la seconde est rejetée **409** (l'authentification périmée ne survit pas). | `:224-232` |
| A22 | Deux modifications concurrentes du **même champ** : la seconde est rejetée 409 au lieu d'écraser silencieusement. | `:233-243` |
| A23 | Une réinitialisation (pass + sessionVersion) sur un compte et un changement de thème sur un autre compte survivent tous deux ; `store.guard(list, 'admin')` marque le compte agissant. | `:244-259` |
| A24 | Si le compte **admin agissant** voit son `sessionVersion` changer pendant sa propre édition d'un autre compte, l'édition est rejetée 409. | `:260-269` |
| A25 | La suppression concurrente d'un compte non concerné est conservée (une édition parallèle ne le ressuscite pas). `store.save(next, previous)` accepte une base explicite. | `:270-280` |

### 3.B Sessions côté client (génération de session, réponses tardives)

Fichiers : `test-session-isolation.js`, `test-player-actions-front.js`, `test-event-staff.js`, `test-gameplay-persistence.js`, `test-archive-persistence.js`, `test-player-actions-browser.js`, `test-adventure-browser.js`.

Le client maintient un compteur `_dbSessionGeneration` incrémenté à chaque login/logout ; toute réponse asynchrone est comparée à la génération capturée au départ et rejetée avec une erreur `{ code: 'SESSION_CHANGED', message: 'La session a changé pendant le chargement.' }` (`test-session-isolation.js:238`).

| # | Exigence | Réf. |
|---|---|---|
| B1 | Une réponse `get` normale hydrate `_dbCache[key]` et `_dbVersions[key]`. | `test-session-isolation.js:69-76` |
| B2 | Une réponse `get` qui arrive **après** un logout/changement de session ne restaure ni cache ni version ; la promesse est rejetée `SESSION_CHANGED`. Idem si la session change pendant le `json()` du corps. | `:78-101` |
| B3 | Un bundle reçu dans une session ne peut pas être hydraté dans une autre (`_hydrateBundleData` lève `SESSION_CHANGED`). | `:103-111` |
| B4 | Un login en cours (`_finishLogin`) émet exactement 2 requêtes (bundle privé + autre) ; si la session change avant leurs réponses, `CU` reste `null`, le cache reste vide, aucune animation de transition n'est lancée. | `:113-123` |
| B5 | Une réponse de login **plus ancienne** ne peut pas remplacer l'identité d'un login plus récent ; une animation de transition différée ne rouvre pas l'app après logout (`launchApp` non appelé). | `:125-143` |
| B6 | Un auto-login remplacé (`_tryAutoLogin`) renvoie `false` et n'efface pas le cache de la nouvelle session dans son gestionnaire d'erreur. | `:145-156` |
| B7 | Un `_refreshPrivateCaches()` périmé s'arrête avant d'émettre une lecture privée dans la nouvelle session. | `:158-167` |
| B8 | Pendant qu'un logout est en cours (`__logoutBusy`), toute lecture privée est rejetée `SESSION_CHANGED` sans requête ; l'appel `logout` lui-même passe. | `:169-177` |
| B9 | `loginUnified()` et `register()` ne peuvent pas émettre deux requêtes porteuses de cookie en parallèle (`_authEntryPending`) ; un login refusé (401 « Incorrect ») réautorise un nouvel essai. | `:179-193` |
| B10 | Un hachage de mot de passe qui se termine après un logout ne démarre pas de requête de login. | `:195-207` |
| B11 | Les wrappers de résilience (`api-hardening.js`) laissent passer `SESSION_CHANGED` comme rejet **silencieux** (aucun `handleFailure`, état service inchangé) ; un 503 ou un échec réseau d'une **ancienne** session est ignoré ; un appel remplacé avant même son démarrage n'atteint jamais la fonction sous-jacente ; un 503 de la session **courante** est bien signalé (`STATE.db`). | `:233-290` |
| B12 | Actions joueur, actions staff événements, fin de combat, sauvegarde d'archives : toute réponse arrivant après changement de session renvoie `false`, ne touche ni cache, ni versions, ni brouillons de formulaire, n'émet **aucune** notification, aucun rendu, aucun log, ne ferme aucune modale. | `test-player-actions-front.js:161-175,241-263`, `test-event-staff.js:124-138`, `test-gameplay-persistence.js:173-184`, `test-archive-persistence.js:80-86` |
| B13 | **[B]** Une consommation d'objet d'Alice dont la réponse (200 côté serveur) arrive après la connexion de Bob : Bob reste connecté, son cache est intact, `gpid('p_alice')` est absent, aucune notice, le texte « La session a changé pendant le chargement » n'apparaît jamais à l'écran ; l'objet a bien été consommé côté serveur. | `test-player-actions-browser.js:264-296` |
| B14 | **[B]** Un détail d'archive qui arrive après logout : l'onglet archives a disparu (`#p-archives-c` absent) et `_dbCache` ne contient pas ce récit. | `test-adventure-browser.js:49-54` |
| B15 | **[B]** Le login d'un joueur ne tente **aucune** écriture `np_syslog` (réservée au staff) : aucune requête `key === 'np_syslog'` en erreur ≥ 400. | `test-player-actions-browser.js:300` |

### 3.C Permissions et lecture (`db.js` : `get`, `get_all`, `get_public_bundle`)

Fichiers : `test-db-security.js`, `test-integration.js`, `test-player-actions.js`, `test-unified-progression.js`.

| # | Exigence | Réf. |
|---|---|---|
| C1 | Stores **internes** (`np_rate_auth`, `themes_admin_store`, `np_admin_recovery_consumed`) et toute clé inconnue (`future_private_store`, `unknown_private_key`) : `get` → **401** même pour un admin ; jamais présents dans `get_public_bundle` (ni `data`, ni `versions`). | `test-db-security.js:26-37`, `test-integration.js:12-16` |
| C2 | `accounts`, `players`, `spawn_lab_staff` : refusés à l'anonyme (4xx) et exclus du bundle public. | `test-integration.js:13-14` |
| C3 | `get_public_bundle` est accessible sans session et renvoie `{ ok, data: { beasts, events, …, public_stats: { totalGemmes } }, versions }`. Il ne contient jamais la chaîne « SECRET ». | `test-integration.js:14`, `test-unified-progression.js:203-205` |
| C4 | Lecture publique/joueur de `beasts` : les créatures `hidden:true` **et** `archived:true` sont retirées ; les champs `adminNotes` sont retirés **y compris imbriqués** (`nested.mjNote` supprimé, `nested.description` conservé). La `version` renvoyée reste celle du store brut. | `test-db-security.js:39-56` |
| C5 | Staff (`admin`, `mj`, `designer`) : `get_all` et `get_public_bundle` renvoient les créatures **intégrales** (hidden, archived, notes). | `test-db-security.js:57-63` |
| C6 | Lecture publique/joueur de `events` : filtre `hidden:true` **et** `published:false` sans `hidden:false` explicite ; retire `adminNotes` et `nested.mjNote` ; `get` et `get_public_bundle` renvoient exactement la même liste ; staff reçoit les originaux. | `test-player-actions.js:256-274` |
| C7 | Un joueur lisant `players` reçoit **uniquement son propre personnage** (`value.length === 1`) et jamais le journal d'un autre (« Journal bob » absent). | `test-player-actions.js:71-73,131-133` |
| C8 | `get` d'une clé absente (archives) → 200 `{ value: null, version: null }`. | `test-db-security.js:144-149` |
| C9 | Une session révoquée (`sessionVersion` incrémenté) ou en réinitialisation forcée reçoit 401 sur toute lecture privée et toute mutation, mais `get_public_bundle` continue de fonctionner (données publiques filtrées). | `test-db-security.js:175-190`, `test-player-actions.js:282-289` |
| C10 | `get`, `get_all` et `session_bundle` renvoient des personnages **identiques** (même normalisation de progression, mêmes `versions` = md5 brut). | `test-unified-progression.js:114-133` |

### 3.D Écritures génériques et conflits (`set`, `delete`, CAS)

| # | Exigence | Réf. |
|---|---|---|
| D1 | `set` sans `expectedVersion` → **428** (`VERSION_REQUIRED`) ; avec une version périmée → **409** `{ code: 'VERSION_CONFLICT', key }` ; deux `set` concurrents sur la même version donnent exactement `[200, 409]` et le gagnant est celui stocké. La création d'une nouvelle clé se fait avec `expectedVersion: null` et deux créations concurrentes donnent aussi `[200, 409]`. | `test-db-security.js:124-141`, `test-integration.js:45-50` |
| D2 | La réponse d'un `set` réussi porte `{ ok, key, value, version }` où `version` est le nouveau md5 du store. | `test-db-security.js:91,134` |
| D3 | **Personne** (pas même admin) ne peut faire `set` sur `accounts` (403) ; **personne** ne peut `delete` `accounts`, `players`, `beasts`, `events` (403) ; MJ ne peut pas `delete` `players`. | `test-db-security.js:66-76`, `test-integration.js:41-44` |
| D4 | `delete {key, expectedVersion}` : version périmée → 409 ; version courante → 200 et `get` renvoie `version: null`. | `test-db-security.js:169-172` |
| D5 | Un joueur ne peut pas faire `set` sur `players` ni sur `events` (403) même avec la bonne version. | `test-db-security.js:93`, `test-player-actions.js:276-281`, `test-unified-progression.js:166` |
| D6 | Le MJ peut `set` `players` pour modifier `xp`, `inventory`, ajouter un personnage ; il ne peut **pas** retirer un personnage existant ni modifier `name`, `classe`, `branch`, `journal`, `avatar` d'un personnage existant (403 par champ). | `test-db-security.js:108-122`, `test-unified-progression.js:151-162` |
| D7 | Un avatar dangereux est rejeté **400** avant toute sanitisation, sur `patch_own_player` comme sur `set players` admin : `x" onerror="alert(1)`, `javascript:alert(1)`, `data:image/svg+xml;base64,…`, `//evil.example/x`, `\evil.example/x`. Un avatar `data:image/png;base64,…` est accepté. | `test-db-security.js:97-106`, `test-integration.js:55,59-62` |
| D8 | `combat_arc_idx_<Owner>` est tronqué à **5 000** entrées (les premières conservées) ; `combat_arc_<Owner>` à **50** (test navigateur) ; `np_syslog` à **500** ; `np_syslog_archive` à **50** — toujours les plus récentes (début de liste). | `test-db-security.js:162-168`, `test-browser.js:49-51`, `test-integration.js:86-95` |
| D9 | `np_syslog_archive` : privé (anonyme et MJ → 4xx en lecture **et** écriture), admin peut `set` avec CAS, `delete` refusé même à l'admin. | `test-integration.js:70-84` |
| D10 | Un `set players` par l'admin **migre** les enregistrements hérités à l'écriture (progression unifiée, définitions custom courantes) ; rejouer le même import avec l'ancienne version → 409 sans double migration. | `test-unified-progression.js:135-149` |
| D11 | Les archives détaillées `combat_arc_rec_<Owner>__<id>` sont restituées **à l'identique** (round-trip complet de l'objet). | `test-integration.js:63-65`, `test-db-security.js:143-161` |

### 3.E Personnages (patch joueur, protection)

| # | Exigence | Réf. |
|---|---|---|
| E1 | `patch_own_player {patch, expectedVersion}` ne peut modifier que `journal` et `avatar` du **propre** personnage ; la réponse renvoie `value` = `[personnage propre]` et la nouvelle `version` ; les autres enregistrements (y compris un enregistrement legacy opaque) sont **byte-à-byte** inchangés. | `test-db-security.js:78-95`, `test-integration.js:54-58` |
| E2 | `patch { level: 99 }` ou `{ xp: 500 }` → **400**. Version périmée → 4xx. | `test-db-security.js:92`, `test-integration.js:57`, `test-unified-progression.js:167` |
| E3 | **[B]** Après un vrai login navigateur, `saveJournalFiche('p_alice')` persiste le journal et émet une notice `type:'ok'` ; si un autre personnage a été modifié entre-temps (version périmée), la sauvegarde est refusée, **aucune** notice `ok`, le journal serveur est conservé. | `test-browser.js:26-40` |
| E4 | **[B]** Un avatar hérité malveillant déjà en cache (`x" onerror="…"`) est neutralisé par `_normalizePlayerRecord` (avatar vidé) et n'exécute rien lors de `updateHdrProfile()`. | `test-browser.js:41-43` |
| E5 | **[B]** Un `importDB` admin (fichier `{version:1, accounts:[{id:'admin', role:'joueur'}], players}`) affiche « Import enregistré… » et **ne touche jamais** aux `pass` ni aux `role` existants. | `test-browser.js:69-73` |
| E6 | Le rendu d'un personnage en combat via `cGetFighterSerment(index)` renvoie `{ level, palier: {niv}, paliers: [...] }` cohérents avec la fiche (`.np-sheet-branch.is-chosen .serm-mini-step.is-unlocked` / `.is-current .serm-mini-level` = « Niv. N »). | `test-unified-progression-browser.js:98-114` |

### 3.F Progression (XP, niveaux, migration, gemmes, audit)

Fichiers : `test-unified-progression.js`, `test-unified-progression-browser.js`, `test-gameplay-persistence.js:22-48`, `test-progression-concurrency.js`, `test-progression-reads.js`, `assets/js/progression.js`.

**Formules figées** (`progression.js:21,27-79`, vérifiées par les tests) :

- `xpRequired(level) = level × 30`. Base niveau 1 : PV 30, EP 50, EM 20.
- Passage de niveau (`doLvlUp`) : tant que `xp ≥ xpMax` → `xp -= xpMax ; level++ ; xpMax = level×30 ; pvMax += pvN ; epMax += epN ; emMax += emN` et **les courants sont remis au maximum** (`pvCur = pvMax`, etc.). Exemple figé : level 1, xp 90, croissance `{7,8,9}` → niveaux gagnés `[2,3]`, état final `level 3, xp 0, xpMax 90, pv 44/44, ep 66/66, em 38/38` (`test-gameplay-persistence.js:26-42`).
- Retrait manuel d'un niveau (`adjVal(pid,'level',-1)`) : `level--`, `xpMax = level×30`, maxima **diminués** de la croissance, courants **plafonnés** au nouveau max (44→37, 66→58, 38→29) (`test-gameplay-persistence.js:43-46`).
- **Migration bi-piste → unifiée** (`normalizePlayer`, `progression.js:45-79`) : on résout d'abord chaque piste héritée (personnage : seuil `level×30` ; serment : seuil `sLevel×10`) en `{level, fraction}` ; on garde la piste au **niveau le plus élevé** (à égalité, la fraction la plus haute) ; `xpMax = level×30`, `xp = min(xpMax−1, ceil(fraction × xpMax))` ; puis pour `delta = newLevel − oldLevel > 0` on **ajoute** `delta × croissance` aux maxima ET aux courants (les ressources dépensées restent dépensées ; un personnage à `pvCur 0` reste à 0). On pose `progressionVersion = 1` et on **supprime** `sLevel`, `sXp`, `sXpMax`.
  - Exemple canonique : `{level 2, xp 15/60, sLevel 5, sXp 25/50, pvMax 41, pvCur 31, epMax 56/20, emMax 22/7}` Duelliste → `level 5, xp 75, xpMax 150, pv 59/49, ep 74/38, em 28/13` (`test-unified-progression.js:25-36`).
  - Custom `{pvN 11, epN 0, emN 7}` → `pv 74/0 (KO conservé), ep 56/20, em 43/28` (`:67-77`).
  - `{level 7, xp 105/210}` vs `{sLevel 4, sXp 39/40}` → 7, 105 (pas de somme des pistes) (`:38-43`).
  - `{sLevel 5, sXp 1/7}` → xp 22 ; `{sLevel 5, sXp 999/1000}` → xp 149 (jamais un niveau bonus) (`:50-53`).
  - XP héritée au-delà du seuil : `{1, 30/30}` → `2, 0` ; `{sLevel 1, sXp 65/10}` → `4, 15` ; `xpMax undefined` → seuil `level×30` (`:55-59`).
  - Idempotence : `normalize(normalize(x)) ≡ normalize(x)` ; des `sLevel/sXp` ressuscités après `progressionVersion:1` sont ignorés ; `progressionVersion:'legacy'` = non migré (`:61-65,95-100`).
  - Champs absents/malformés (`level:'bad'`, `xp:-2`, `sXp:Infinity`) → `1, 0` (`:79-82`).
  - Alias `class` accepté pour `classe`, et `serments_custom: null` toléré, avec résultat identique entre `db.get` et `auth.session_bundle` (`:177-193`).
- **Gemme Blanche** (`_selGem:'b'`) : **+5 XP** par gemme, consomme `qty` d'une unité, ajoute une entrée `history` (`test-progression-concurrency.js:97-99`, `test-unified-progression-browser.js:168-175`).
- Combat : `applyXP` avec `#xpp-mob` = `visible` → « +10 XP » (`test-unified-progression-browser.js:163-167`).

| # | Exigence | Réf. |
|---|---|---|
| F1 | Le calcul de niveau utilise **toujours** la définition de serment courante via `getAllSD()` (custom > native), jamais `SD` natif seul. | `test-gameplay-persistence.js:24-48` |
| F2 | Le serveur (`db.get`, `get_all`, `auth.session_bundle`) applique la migration **à la lecture** sans modifier le store brut, avec les définitions `serments_custom` courantes (ex. custom Duelliste `{10,0,9}` → `pv 71, ep 56, em 49`). | `test-unified-progression.js:114-133` |
| F3 | **[B]** Une fiche héritée `{2, 15/60 ; s4, 35/40}` s'affiche au login comme `level 4, xp 105/120`, une seule barre XP (`#xp-b` présent, `#sxp-b`/`#p-sniv` absents), palier courant « Niv. 2 » avec 1 étape débloquée ; le rechargement **n'applique pas deux fois** les gains de stats. | `test-unified-progression-browser.js:118-131` |
| F4 | **[B]** L'export PDF de la fiche (`exportFichePDF()` → vrai téléchargement via jsPDF vendored) contient exactement une fois « 105 / 120 XP » et jamais « XP Serment », « XP Personnage », « SERMENT NIV. ». | `:133-155` |
| F5 | **[B]** Le panneau staff `#m-prog` a un seul onglet « Expérience », aucun `#prog-serm`, `#adj-slvl`, `#adj-sxp`, aucun texte « XP Serment / XP Personnage / Niv. Serment ». | `:157-162` |
| F6 | **[B]** +10 XP combat puis +5 XP gemme → `4, 115` puis `5, 0/150`, stats `+6/+6/+2` (Duelliste), gemme `3→2`, palier « Niv. 5 » avec 2 étapes. | `:163-179` |
| F7 | **[B]** Échec de sauvegarde (503) d'une fusion de gemme : aucune XP, aucune gemme consommée dans le cache, version serveur inchangée, notice `err` sans `ok`. Stock insuffisant (`changeGemQty(99)`) : refusé **avant** toute écriture, message contenant « insuffisant | disponible | possède | stock ». | `:181-214` |
| F8 | **[B]** Changement de serment (`openChangeSerm` → `#mcs-sel` = « Croisé ») conserve `level 5, xp 0/150`, `branch: 'Aucune'`, l'inventaire ; persiste après reload et après reconnexion du joueur. | `:218-238` |
| F9 | **[B]** `importDB` d'un export v2 `{version:2, players, serments_custom}` charge la définition custom **avant** la migration : `{1, 0/30 ; s3, 15/30}` avec `{11,9,7}` → `3, 45/90`, `pv 52/47, ep 68/58, em 34/24`, une seule fois, persistant après reload. | `:240-268` |
| F10 | **[C]** Fusion de gemme : une seconde `applyGemXP` (même ou autre personnage) pendant qu'un instantané `players` est en attente renvoie `false` ; une seule écriture ; les brouillons ne mutent pas les sources ; le verrou de collection se libère après confirmation. | `test-progression-concurrency.js:85-110` |
| F11 | **[C]** Fusion refusée → restauration exacte de XP, stock, historique ; notice `err` et pas `ok` ; aucun rendu ; `_progressionSaving.players` libéré. Le rollback ne remplace pas un cache plus récent arrivé pendant l'écriture rejetée. | `:112-139` |
| F12 | **[C]** Une réponse de persistance `undefined`, `{ok:false}` ou `{ok:true, skipped:true}` **n'accorde pas** la récompense. | `:141-151` |
| F13 | **[C]** `adjVal xp`, `saveStats`, `saveChangeSerm` : l'entrée d'audit (`sysLog('adj_xp'|'stats_modif'|'serment_change')`) n'est écrite **qu'après** confirmation ; aucune entrée en cas d'échec ; le cache est restauré. | `:153-184` |
| F14 | **[C]** Une lecture (`session_bundle`, `get_all`, `get players`) lancée **avant** une écriture ne peut pas effacer l'XP quand sa réponse périmée arrive, que l'écriture soit encore en attente ou déjà confirmée : `get` renvoie `{skipped:true}` sans `value/version` ; les bundles hydratent les autres clés (`accounts`, `beasts`) mais **omettent** `players` de `data` et `versions`. Les deux gains séquentiels survivent. | `test-progression-reads.js:77-107` |
| F15 | **[C]** Une lecture lancée **pendant** une écriture reste périmée même après confirmation de l'écriture. | `:109-120` |
| F16 | **[C]** Après un 409 (`Reload required`), l'XP non confirmée est annulée, la file `_DB_WRITE_QUEUE.players._failed = true` bloque les écritures ; une lecture acceptée débloque la file et une nouvelle sauvegarde réussit avec la version fraîche. | `:122-141` |
| F17 | **[C]** Un bundle reçu puis hydraté après le début d'une écriture est revérifié à l'hydratation (`players` omis). `get_all` n'expose jamais une nouvelle révision `players` avec des données périmées. | `:144-174` |
| F18 | **[C]** `_refreshPrivateCaches()` : le bundle public est accepté (`beasts`), le bundle privé chevauchant une écriture XP ne l'écrase pas. | `:176-191` |

### 3.G Archives de combat (récits)

Fichiers : `test-archive-persistence.js`, `test-legacy-recovery.js`, `test-db-security.js:143-173`, `test-adventure-browser.js`, `test-browser.js:44-60`.

| # | Exigence | Réf. |
|---|---|---|
| G1 | **[S]** Propriété : un joueur peut créer `combat_arc_rec_<Owner>__<id>`, `combat_arc_idx_<Owner>`, `combat_arc_<Owner>` quand `Owner` est son pseudo **ou** le nom de son personnage ; un autre joueur reçoit 401 en lecture. | `test-db-security.js:150-161` |
| G2 | **[C]** `saveCombatArchives(list, owner)` écrit d'abord chaque détail `rec`, puis l'index, puis la liste de compatibilité ; deux sauvegardes chevauchées : la seconde est rejetée `VERSION_CONFLICT` et **ne supprime pas** l'archive confirmée par la première ; son détail n'est jamais écrit. | `test-archive-persistence.js:40-48` |
| G3 | **[C]** Un rafraîchissement de bundle pendant l'écriture des détails ne peut pas prêter une révision plus récente à un index périmé (index et liste non écrits). Une révision distante non hydratée bloque aussi le remplacement. Des révisions inconnues (`_dbVersions` vide) ne peuvent pas écraser une liste serveur existante (aucune écriture). | `:50-65,74-78` |
| G4 | **[C]** Une suppression intentionnelle conserve l'index restant et la liste, mais **laisse le détail `rec` récupérable** sur le serveur. | `:67-72` |
| G5 | **[C]** Une sauvegarde en file d'une ancienne session est rejetée `SESSION_CHANGED` sans écriture. | `:80-86` |
| G6 | **[B]** Après login réel, `saveCombatArchives` persiste le détail, et **aucune clé** `combat_arc*`/`spawn_lab_staff` n'existe en localStorage (avant et après logout). | `test-browser.js:44-47,64` |
| G7 | **[B]** 55 archives → index 55, liste de compatibilité 50 ; après reload, `combatArchiveFetchRecord('Alice','archive-0', meta)` relit le détail au-delà des 50. | `test-browser.js:49-55` |
| G8 | **[B]** Un 503 sur l'écriture d'un détail fait échouer `saveCombatArchives` (throw) et l'index garde sa version. | `test-browser.js:56-60` |
| G9 | **[B]** Page « Archives de combat » (menu `#dd-aventure-btn` → bouton « Archives de combat ») : titre `#p-archives-c h1`, compteur « 53 récits » (51 index + 2 entrées `history` de type combat), **20 récits par page**, bouton « Suivant », champ `searchbox` « Rechercher un récit », détail `.np-archive-detail h2`, log `.np-archive-log` avec HTML échappé (« Une trace polaire. » affiché, `<img onerror>` inerte), bouton « Exporter ce récit » (téléchargement sans `<img`), bouton « Réessayer » sur échec de chargement d'un détail. Les archives d'un autre propriétaire (« SECRET BOB ») ne s'affichent jamais. | `test-adventure-browser.js:22-46` |
| G10 | **[B]** La lecture des archives **n'écrit jamais** (`set`, `patch_own_player`, `delete` absents des requêtes). | `test-adventure-browser.js:56` |
| G11 | **[B]** Fermer le popup archives (`#archives > .tab-popup-close`) ramène au hash `#accueil` ; `openFirstSteps()` puis `history.back()` revient sur `#archives.active` **sans** augmenter `history.length`. | `test-adventure-browser.js:24-27` |

**Récupération des copies localStorage héritées** (`test-legacy-recovery.js`) :

| # | Exigence | Réf. |
|---|---|---|
| G12 | Au démarrage, `_purgePrivateBrowserStorage()` supprime `np_players`, `np_spawn_lab_staff`, et **conserve en quarantaine** toutes les clés contenant `combat_arc` (même un JSON cassé), à chaque rechargement. Sans session, aucune bannière `#legacy-combat-recovery`. | `:72-85` |
| G13 | Connecté, `_showLegacyCombatArchiveRecovery()` affiche la bannière ; le bouton `#legacy-combat-recovery-erase` est **désactivé** tant qu'aucun export n'a réussi ; `_exportLegacyCombatArchiveRecovery()` télécharge `{ storage: [{ key, rawValue }] }` contenant **uniquement** les clés du propriétaire courant (`np_combat_arc_Alice`, `combat_arc_idx_Alice`, `np_combat_arc_rec_Alice__…`, pas `np_combat_arc_AliceExtra` ni Bob) avec les valeurs brutes ; rien n'est mis en cache ni ajouté aux propriétaires connus ; une sauvegarde serveur ordinaire `sv('combat_arc_Alice', …)` **ne touche pas** la copie locale ; « Plus tard » (`_dismiss…`) ne fait que masquer. | `:87-104` |
| G14 | La suppression exige un export vérifié **et** un `confirm()` ; les copies modifiées depuis l'export et celles d'autres propriétaires survivent. | `:106-120` |
| G15 | Un changement de session invalide l'export (Bob admin ne peut pas supprimer les copies d'Alice) ; le buffer `_LEGACY_COMBAT_ARCHIVE_BUFFER` est remis à `null` à la purge ; déconnecté, export et suppression renvoient `false`. Un `createObjectURL` qui échoue → export `false`, suppression impossible, données intactes. | `:122-145` |

### 3.H Événements

**Participation joueur — serveur** (`test-player-actions.js`) :

| # | Exigence | Réf. |
|---|---|---|
| H1 | `set_event_participation {eventId, participating:boolean, expectedVersion}` : anonyme → 401 ; staff sans personnage (`mj`) → 403 ; sans version → 428 ; version `'bad'` → 428 ; `null` → 409 ; compte lié à un personnage supprimé → 404. | `:76-91` |
| H2 | L'inscription ajoute le **nom du personnage lié** à `inscrits`, préserve tous les autres attributs de l'événement (`adminNotes`, `nested`, `arbitrary`) et les autres participants ; la réponse est la liste **filtrée joueur** (`key:'events'`, sans hidden, sans notes) ; `players` est inchangé ; inscription répétée idempotente ; désinscription restaure exactement l'état initial. | `:151-171` |
| H3 | Payload invalide (`eventId:''`, `participating:1`, champs supplémentaires `name`, `pid`, `inscrits`, `max`) → 400. Événement absent, `hidden`, ou hérité `published:false` → 404. Passé, sans date, ou complet → **409**. | `:173-189` |
| H4 | Un joueur peut **se désinscrire** d'un événement masqué ou passé. | `:191-198` |
| H5 | Homonymes (deux personnages du même nom) → 409 `EVENT_UNAVAILABLE`, message « Plusieurs personnages portent ton nom : demande à l'équipe de les distinguer avant de modifier ta participation. » ; rien n'est modifié. | `:200-216` |
| H6 | Liste `inscrits` non-tableau, `max` `-1`/`1.5`/`'unknown'` → 409 `EVENT_UNAVAILABLE` sans réécriture (messages « La liste des participants doit être corrigée par l'équipe. » / « La capacité de cet événement doit être corrigée par l'équipe. »). | `:218-227` |
| H7 | Les événements hérités (`titre`, `dateTs`, `published:true`) et `republished` (`published:false, hidden:false`) restent inscriptibles. | `:229-239` |
| H8 | Deux inscriptions concurrentes pour la dernière place → `[200, 409]` ; le perdant qui réessaie avec la version fraîche reçoit 409 `EVENT_FULL` (« Événement complet. »). | `:241-254` |

**Participation joueur — client** (`test-player-actions-front.js`) :

| # | Exigence | Réf. |
|---|---|---|
| H9 | `eventInscrit(id)` envoie exactement `{ action:'set_event_participation', eventId, participating:true, expectedVersion }` ; double clic → `false` ; l'événement local **n'est pas** muté avant confirmation ; `eventDesinscrit` avec `participating:false` ; un 409 `VERSION_CONFLICT` laisse `inscrits` à l'état confirmé. | `:130-144` |
| H10 | Compte non lié (`CU.pid = null`) : aucune requête, notice contenant « lié à un personnage », carte contenant « personnage doit être lié ». | `:146-152` |
| H11 | `renderEventCard` d'un événement `hidden`, sans `date`, ou passé ne propose **aucun** bouton `eventInscrit`/`eventDesinscrit`. | `:154-159` |
| H12 | Un refus métier confirmé (409 `EVENT_FULL`) n'avance pas la version, libère la file et autorise l'action suivante avec la même version. | `:177-188` |

**Édition staff — client** (`test-event-staff.js`) :

| # | Exigence | Réf. |
|---|---|---|
| H13 | `admin`, `mj`, `designer` peuvent ouvrir `openEventModal(id)` (champ `ev-max` pré-rempli à 4), modifier `ev-nom`/`ev-max`, `saveEvent()` (double clic → `false`), champs désactivés pendant l'écriture, `expectedVersion:'e1'`, puis l'événement conserve `createdBy`, `inscrits`, `extra` ; une notice `ok`. | `:51-67` |
| H14 | `joueur` et rôle inconnu : `openEventModal` → `false`, `saveEvent`/`toggleEventHidden`/`deleteEvent` → `false`, aucune requête. | `:69-75` |
| H15 | Capacité `'1'` (< 2 inscrits), `'-1'`, `'1.5'`, `'Infinity'`, `'NaN'` → refus sans écriture, brouillon conservé ; `'0'` accepté (illimité). | `:77-84` |
| H16 | Un `designer` crée un événement publié **sans** tenter d'écriture `players` ; la ligne `#ev-notify-row` est masquée (`display:none`) et la case cochée est ignorée (permission revérifiée à la sauvegarde) ; pas de « notifiés » dans la notice. | `:86-93` |
| H17 | Un événement nouvellement publié par admin/MJ notifie les joueurs **une fois, après** confirmation de l'événement : seconde requête `key:'players'` ajoutant une entrée `history` au texte **échappé** (`&lt;img`) ; notice finale contenant « Joueurs notifiés ». | `:95-103` |
| H18 | Si la notification échoue : événement conservé, historiques d'origine intacts, aucune notice `ok`, message « Événement enregistré … notifications n'ont pas été confirmées », aucun `sysLog('event_notif')`. | `:105-111` |
| H19 | Échec (409) de `save`/`hide`/`delete` : cache et brouillon intacts, aucun log, modale non fermée, aucune notice `ok`/`inf` ; la collection reste **bloquée** jusqu'au rafraîchissement (`toggleEventHidden` suivant → `false`, une seule requête). | `:113-123` |
| H20 | Une nouvelle session staff peut rouvrir l'éditeur partagé (champs réactivés) pendant qu'une ancienne écriture se termine silencieusement ; le nouveau brouillon n'est pas écrasé. | `:140-147` |

**Édition staff — navigateur** (`test-event-staff-browser.js`, pour `Admin`, `Maitre`, `Designer`) :

| # | Exigence | Réf. |
|---|---|---|
| H21 | Un événement `hidden:true` est visible et éditable par le staff dans l'onglet `evenements` ; `#ev-max` = `'4'`, `#ev-type` = `'evenement'`. Saisir `1` déclenche une notice contenant « inférieure » et ne sauvegarde pas. | `:43-48` |
| H22 | Sauvegarde `max:3` + `#ev-desc` → persistée avec `inscrits`, `createdBy`, `extra` intacts ; la modale `#m-event` perd la classe `open`. `toggleEventHidden` persiste `hidden:false`. | `:49-53` |
| H23 | Création (`openEventModal()` sans id, `#ev-nom`, `#ev-max`, `#ev-date` = `2030-01-01T20:00`) : `#ev-notify-row` visible sauf pour Designer ; une écriture `players` suit sauf pour Designer ; aucune écriture ≥ 400 ; jamais « Permission refusée ». Après reload, l'événement apparaît. | `:54-63` |
| H24 | Un 503 sur `set events` : modale reste ouverte, brouillon « Brouillon conservé » intact, cache inchangé, pas de notice `ok`, `_eventStaffBusy()` repasse à `false`. | `:64-74` |
| H25 | (Maitre) Un 503 sur la notification `players` → notice « notifications n'ont pas été confirmées », pas de `ok`, événement bien créé. | `:76-85` |
| H26 | `deleteEvent` (dialog accepté) supprime côté serveur. | `:86-88` |
| H27 | Mobile 390×844 : pas de débordement horizontal ; le champ `#ev-nom` de la modale de création est réellement cliquable (`elementFromPoint` au centre = le champ) une fois les toasts `.np-api-toast` disparus. | `:89-97` |

### 3.I Actions joueur (consommation d'objet, notifications)

**Serveur** (`test-player-actions.js`) :

| # | Exigence | Réf. |
|---|---|---|
| I1 | `consume_own_item {itemId, note?, expectedVersion}` : décrémente `qty` d'une unité, ajoute une entrée `history` `{ts entier sûr, type:'item', text:'Consommé : <nom> — <note trimée>', by:'<nom> (joueur)'}` avec **échappement HTML** (`&lt;`, `&gt;`, `&quot;`, `&amp;`), préserve tous les autres champs de l'objet et du personnage, et tous les autres personnages ; répond `{key:'players', value:[propre personnage], version}`. | `:47-74` |
| I2 | Auth/liaison/version : identiques à H1 (401 / 403 staff / 428 / 428 / 409 / 404). | `:76-91` |
| I3 | Payload invalide → 400 : `itemId` `''`, `10`, `' potion'` (espace), `note` `42` ou > **2000** caractères, tout champ supplémentaire (`pid`, `name`, `qty`, `history`, `pvCur`). Objet d'un autre personnage → 404. Quantité `0`, `-1`, `1.5`, `'2'` → 409 `ITEM_UNAVAILABLE` (« Cet item n'est plus disponible. »). | `:93-106` |
| I4 | Deux consommations concurrentes avec la même version → `[200, 409]` `VERSION_CONFLICT`, une seule unité retirée, une seule entrée d'historique. | `:108-117` |
| I5 | `dismiss_notifications {timestamp}` fusionne `notifDeleted` (union triée `[101,102]`) ; `{all:true}` masque tout l'historique existant `[101,102,103]` ; `history` intact ; un `notifDeleted` hérité contenant un ts inconnu (`999`) est **nettoyé** à la première écriture. | `:119-134` |
| I6 | Invalide → 400 : `{}`, `timestamp:'102'`, `-1`, `2.5`, `{timestamp, all:true}`, `{all:false}`, champs `pid`/`notifDeleted`. `timestamp` inconnu → 404. Une entrée ajoutée entre-temps rend `{all:true}` avec l'ancienne version → 409 (ne masque pas une entrée future). | `:136-149` |

**Client** (`test-player-actions-front.js`) :

| # | Exigence | Réf. |
|---|---|---|
| I7 | `playerConsume()` lit `#p-csel` (objet) et `#p-cnote` (note, trimée), envoie `{ action:'consume_own_item', itemId, note, expectedVersion }` ; double clic → `false` ; le bouton `button[onclick="playerConsume()"]` est désactivé pendant l'attente ; la quantité locale n'est **pas** décrémentée avant confirmation ; après succès : cache remplacé par la réponse, autres personnages intacts, note vidée, version mise à jour, bouton réactivé, une notice `ok`. | `:69-88` |
| I8 | Échec (503) : cache, note, sélection intacts, aucun rendu, aucune notice `ok`. | `:90-100` |
| I9 | Un staff regardant **un autre profil** (`viewPid !== CU.pid`) ne peut ni consommer ni effacer ses notifications (aucune requête). | `:102-108` |
| I10 | `deleteNotif(pid, ts)` envoie `{ action:'dismiss_notifications', timestamp, expectedVersion }` ; `clearAllNotifs` pendant l'attente → `false` ; aucun rendu avant confirmation ; `clearAllNotifs` envoie `{ all:true }` ; `getPlayerNotifs` reflète `notifDeleted`. | `:110-128` |
| I11 | Après un 409 `VERSION_CONFLICT`, les écritures suivantes sur la collection sont **bloquées** jusqu'à un rafraîchissement (`clearAllNotifs` → `false`, une seule requête). | `:190-198` |
| I12 | Un instantané staff `set players`/`set events` mis en file **après** une action propre ne peut pas la défaire : rejeté `VERSION_CONFLICT` sans jamais atteindre l'API ; la version locale devient celle de la réponse de l'action propre. Vaut aussi à travers deux commandes propres chaînées. | `:200-239` |

**Navigateur** (`test-player-actions-browser.js`) :

| # | Exigence | Réf. |
|---|---|---|
| I13 | Après login réel, `switchTab('accueil')` affiche l'événement visible dans `#p-accueil-c` et jamais l'événement masqué. | `:130-132` |
| I14 | Profil : menu `#dd-aventure-btn` → bouton « Mon personnage » → `#p-csel` visible. Double clic sur `playerConsume()` → **une seule** requête `consume_own_item` ; `qty 4→3`, historique 3 entrées dont « Après la chasse » ; Bob inchangé ; après reload, `#p-hist` contient la note. | `:155-188` |
| I15 | Cloche `#notif-bell` → panneau `#notif-panel` avec boutons `deleteNotif('p_alice', <ts>)` ; masquer une notification conserve l'historique ; après reload la notification a disparu ; bouton « TOUT EFFACER » ; en 503 rien n'est masqué localement ni sur le serveur ; après tout effacer et reload, le panneau affiche « Aucune notification ». | `:190-212` |
| I16 | Onglet `[data-app-tab="evenements"]` → boutons `eventInscrit('expedition')` / `eventDesinscrit('expedition')` ; inscription persistée `['Bob','Alice']`, événement masqué intact ; désinscription persistée après reload ; 503 → pas de fausse inscription, version serveur inchangée. | `:214-234` |
| I17 | Consommation en 503 : cache identique, version inchangée, brouillon `#p-cnote` conservé. Consommation avec version périmée (Bob modifié entre-temps) → 409, notice `err`, pas de `ok`, quantité et modification concurrente conservées. | `:236-262` |

### 3.J Thèmes et collection

| # | Exigence | Réf. |
|---|---|---|
| J1 | **[S]** `admin_set_theme_visibility {themeId, visible}` : deux appels concurrents (`violet`, `green`) écrivent `theme_visibility = { violet:true, green:true }`, `event_themes` reste un tableau, le `label` existant est préservé et le thème `green` est créé avec `visible:true`. | `test-auth-security.js:346-356` |
| J2 | **[S]** `admin_set_theme_autogrant {themeId, enabled}` en parallèle d'un `admin_set_theme_visibility` : les deux persistent (`autoGrantAll:true` sur violet, `visible:false` sur green), structure de tableau préservée. | `:357-369` |
| J3 | **[B]** Page compte : `#hdr-settings-btn` → bouton « Ma collection » → cartes `.np-theme-vault-card[data-theme-id]`. `Enter` ou `Space` sur une carte possédée déclenche `self_set_theme` (200), `_currentTheme` = id, `aria-pressed="true"`. Ré-équiper le thème actif est **également** envoyé (4 sauvegardes pour light, dark, dark, dark). Un thème verrouillé (`green`) ne déclenche aucune requête et ne change pas le thème. | `test-account-keyboard-browser.js:28-48` |
| J4 | **[B]** Une carte de thème n'agit pas quand une modale est ouverte (`m-avatar-crop` ou `m-editpass`), même par événement `keydown` ou `click()` programmatique. | `:66-70,79-84` |

### 3.K Sauvegarde / restauration du store (`test-store-backup.js`)

| # | Exigence | Réf. |
|---|---|---|
| K1 | Une sauvegarde restaure **exactement** les nombres JSONB géants (`9007199254740993123456789`), les timestamps à la microseconde, les `updated_at` null, et les clés privées ; `losslessTypes` force le texte pour JSONB (OID 3802) et TIMESTAMPTZ (1184) mais convertit BOOL (16) `'t'` → `true`. | `:51-58` |
| K2 | Le checksum est indépendant de l'ordre des propriétés et change pour tout contenu ou métadonnée modifié (`CHECKSUM_MISMATCH`). | `:60-68` |
| K3 | Doublon de clé, `count` faux, JSON invalide, lignes non triées → rejet **avant** restauration. Un `updated_at` non-timestamp passe la validation de format mais est rejeté par PostgreSQL à la vérification. | `:70-84` |
| K4 | Le fichier de sortie est créé `0o600` dans un dossier `0o700`, relu à l'identique, jamais écrasé (fichier existant ou symlink → `OUTPUT_EXISTS`), et **aucune connexion** à la base n'est ouverte si la sortie existe déjà. | `:86-103` |
| K5 | `readSnapshot` exécute 4 requêtes dans une transaction `readOnly` + `RepeatableRead` (en-têtes Neon `Neon-Batch-Read-Only: true`, `Neon-Batch-Isolation-Level: RepeatableRead`), la 4e étant exactement `SELECT key, value, updated_at FROM public.np_store ORDER BY key` ; une seconde table `np_store` dans un autre schéma → `UNEXPECTED_STORE_TABLE` ; une colonne en plus → `UNEXPECTED_STORE_SCHEMA`. | `:105-123,153-179` |
| K6 | Un store vide se sauvegarde et se vérifie (`count:0`). | `:125-128` |
| K7 | CLI : `backup-store.js --output <f>` exige `NP_BACKUP_SOURCE_URL` (ignore `DATABASE_URL`/`NETLIFY_DATABASE_URL`, `SOURCE_REQUIRED`), ne crée pas le fichier, n'écho jamais l'URL ; `verify-backup.js --input <f>` affiche « N entrées » ; tout flag supplémentaire → `INVALID_ARGUMENTS` sans écho de secret. | `:130-151` |

### 3.L Journal système (`test-system-log.js`, `test-integration.js`)

| # | Exigence | Réf. |
|---|---|---|
| L1 | `archiveSysLog()` écrit **dans l'ordre** : archive (`saveSysLogArchive`), puis vidage du log (`saveSysLog`), puis vidage des `history` de tous les personnages (`sp`) ; l'archive regroupe log + historiques ; notice `ok`. | `test-system-log.js:15-18` |
| L2 | Si une entrée de log arrive pendant la sauvegarde de l'archive (version `np_syslog` changée), le vidage s'arrête : le log conserve la nouvelle entrée, les historiques ne sont pas vidés, pas de notice `ok`. | `:19-22` |
| L3 | Si un historique arrive après la sauvegarde du log (version `players` changée), les historiques ne sont pas vidés non archivés. | `:23-26` |
| L4 | Plafonds : cf. D8/D9. | — |

### 3.M Premiers pas / onboarding (`test-first-steps.js`, `assets/js/first-steps.js`)

États rendus via `data-onboarding-state="guest|pending|unavailable|linked|staff"` :

| # | Exigence | Réf. |
|---|---|---|
| M1 | Invité : `openFirstSteps()` ouvre l'écran `s-first-steps` avec état `guest` ; toutes les actions `npFirstStepsGo('register'|'rules'|'character'|'account'|'events')` mènent uniquement à l'écran `s-hrp` (règlement) — jamais d'onglet privé ni de profil. | `:32-41` |
| M2 | Compte non lié (`pid:null`) : état `pending`, texte « Un administrateur doit maintenant le lier » et « Pseudo à transmettre : <strong>Nouveau</strong> » ; **aucune** case à cocher, barre de progression, « étape terminée » ou « règlement lu/validé » ; `CU` non muté. | `:43-54` |
| M3 | Le `pid` du **compte** (`getCurrentAccount()`) fait autorité sur `CU.pid` : `account.pid` défini mais personnage absent → `unavailable` ; personnage présent → `linked` avec « Aurore, la suite t'appartient » ; `account.pid null` avec `CU.pid` défini → `pending`. | `:56-70` |
| M4 | Staff (`admin`, `mj`, `designer`) : état `staff`, jamais le nom du personnage consulté, `renderFirstStepsHome()` renvoie `''`. | `:72-81` |
| M5 | Pseudo et nom de personnage sont échappés dans le guide et l'invitation du tableau de bord. | `:83-92` |
| M6 | Un guide rendu avant logout ne peut plus naviguer vers profil/paramètres ; le re-rendu repasse en `guest` sans le nom. | `:94-105` |
| M7 | Actions inconnues (`constructor`, `database`) ignorées ; `openFirstSteps()` connecté → `switchDropTab('premiers-pas')` ; `events` → `switchDropTab('evenements')` ; cible DOM absente → `false`. | `:107-118` |

### 3.N Navigation, accessibilité et UX navigateur

| # | Exigence | Réf. |
|---|---|---|
| N1 | Accueil desktop 1440×1000 et mobile 390×844 : jamais `scrollWidth > innerWidth` (tolérance +1 px sur certains tests). Vaut pour accueil, profil, archives, éditeur d'événement mobile, fiche progression mobile, RPG. | `test-browser.js:20-23`, `test-player-actions-browser.js:133-142`, `test-event-staff-browser.js:90,97`, `test-adventure-browser.js:39`, `test-unified-progression-browser.js:237` |
| N2 | Écran login : `#login-id` et `#login-pass` ont exactement **un** `<label>` chacun ; bouton `button[onclick="loginUnified()"]` ; après login, `window.CU.role`/`CU.pseudo` définis, l'overlay `#login-transition-overlay` perd `active` et `#lto-flash` revient à opacité 0. | `test-browser.js:26-30` |
| N3 | Mobile : tiroir `#mobile-drawer` hors écran (`right <= 1`) au repos, `#burger-btn` l'ouvre (`left === 0`), boutons « Événements » et « Tableau de bord » ; le tiroir se referme après navigation. | `test-player-actions-browser.js:135-152` |
| N4 | Menu staff `#dd-staff-btn` → `#dd-staff-menu` bouton « Administration » → `#np-admin-dashboard-overview` visible ; deux `npDashboardPolish.refresh()` sans changement de données produisent **0 mutation DOM** dans `#p-admin-dashboard-c`. | `test-browser.js:74-80` |
| N5 | Aucune erreur `pageerror` ni erreur handler (`app.errors`) sur l'ensemble des parcours couverts. | tous les tests navigateur |
| N6 | Modale avatar (`#m-avatar-crop`, ouverte par le bouton « Importer ou recadrer l'avatar ») : `role="dialog"` `aria-modal="true"`, premier focus sur `.mclose`, **piège de focus** cyclique (Shift+Tab → « Appliquer », 22 Tab restent dans la modale), un focus programmatique en arrière-plan est renvoyé dans la modale, `Escape` ferme et **restaure le focus** sur le bouton d'ouverture sans fermer la page compte (`#profil.active`), « Annuler » restaure aussi le focus. | `test-account-keyboard-browser.js:50-77` |
| N7 | Raccourcis clavier du simulateur de combat (`Space` = `combatPassTurn`, `Shift+Enter` = `combatNextRound`, `Control+z` = `combatUndo`) : inactifs hors de l'onglet `combat-mj` même si `_cs.active`, actifs sur cet onglet, inactifs quand le focus est dans un input (`#c-name`) ou un bouton, ignorés si l'événement est déjà `preventDefault`, suspendus quand une modale est ouverte. | `:86-125` |
| N8 | Onglets « popup » : `switchTab(id, null)` programmatique ; `.tab-popup-close` ; hash d'URL synchronisé (`#accueil`, `#archives`). | `test-adventure-browser.js:24-27` |
| N9 | Le cookie `np_session` est `httpOnly`, `sameSite: Strict` (injecté tel quel par les tests). | `test-browser.js:66` |

### 3.O Bestiaire admin (`test-beast-persistence.js`, `assets/js/beast-admin.js`)

| # | Exigence | Réf. |
|---|---|---|
| O1 | `addBeast`, `saveEditBeast`, `delBeast(id)`, `toggleBeastArchived(id)`, `duplicateBeast(id)`, `toggleBeastHidden(id)`, `beastImportJsonFile(text)` renvoient tous une **promesse** de persistance ; ils gardent la modale ouverte et n'annoncent aucun succès avant confirmation. | `:52-66` |
| O2 | Succès → exactement une notice non-`err`. Échec (« Conflit de sauvegarde ») → résultat `false`, modale ouverte, champs de formulaire conservés (« Nouveau nom »), cache optimiste **restauré**, une seule notice `err` contenant « Conflit ». | `:67-82` |
| O3 | Double clic sur `duplicateBeast` → second appel `false` ; un échec ne remplace pas un cache rafraîchi entre-temps. | `:85-94` |
| O4 | Les créatures s'importent depuis un fichier JSON `[{ id, nom }]`. | `:55` |

### 3.P Combat (fin de combat → fiches) — *à requalifier dans l'overhaul*

`test-gameplay-persistence.js:117-196` (`combatEnd()` de `main.js`) :

| # | Exigence | Réf. |
|---|---|---|
| P1 | Terminer un combat persiste **une seule fois** les stats du personnage propriétaire (`pvMax, pvCur, epCur, emCur` copiés du combattant `type:'player'`), ajoute une entrée `history` avec `combatId`, **exclut les invocations** (`isSummon:true`, même `pid`), laisse les autres personnages intacts, une notice `ok`. | `:117-126` |
| P2 | Si le journal d'un autre personnage est rafraîchi pendant l'archivage, `combatEnd` renvoie `false`, aucune écriture, pas de `ok` ; une modification distante **non rafraîchie** est protégée par le CAS PostgreSQL. | `:128-141,160-171` |
| P3 | Un combat ne peut pas hériter de la révision d'une écriture `sp()` en file ; le `sp` aboutit, le combat échoue. | `:143-158` |
| P4 | Double clic pendant l'archivage → second `false`, une seule entrée d'historique, une seule écriture. | `:186-196` |

`_cs` fixture : `{ id, name, round, active, phase:'declaration', fighters:[{ type:'player', pid, name, pvMax, pvCur, epMax, epCur, emMax, emCur, isSummon? }] }` (`:88-91`). Ce comportement est un **pont simulateur → fiche** : la partie « report des PV/EP/EM et récit dans l'historique » est un besoin de compagnon de table ; la partie « simulateur jouable » est de la dérive (voir §6).

### 3.Q Dérive RPG (prototype « jeu en ligne ») — **à ne pas reprendre**

`test-rpg-persistence.js` et `test-rpg-browser.js` figent un jeu solo complet : actions `rpg_get_character` / `rpg_save_character {character, expectedVersion}` sur la clé `rpg_characters`, un personnage par compte (`id: 'rpg_<accountId>'`, `ownerId`/`ownerPid` forcés côté serveur, `level` plafonné à 100, `gold` ≥ 0), sauvegardes débouncées à **450 ms**, statut `#rpg-sync-status` « Synchronisé » / « Brouillon non enregistré » / « non enregistrées », bouton « Télécharger le brouillon », lieux `camp`/`ridge`(« Crête »)/`cave`/`forest`/`ruins`, oaths `.rpg-oath`, invité en `np_rpg_guest_v2`, ancien global `np_rpg_proto_v1` jamais uploadé. Exigences transverses **réutilisables** qui y sont testées (déjà couvertes ailleurs) : CAS 428/409, isolation de session, pas d'écriture localStorage en mode connecté, échappement des noms de serments custom dans attribut HTML **et** chaîne JS (`test-rpg-browser.js:23-26`).

`test-account-keyboard-browser.js:86-125` (raccourcis du simulateur de combat) et `test-gameplay-persistence.js:117-196` (`combatEnd`) relèvent du simulateur de combat MJ, à trier (§6).

---

## 4. Catalogue des actions API déduit des tests

### 4.1 `/.netlify/functions/auth`

| action | corps | qui | codes vus |
|---|---|---|---|
| `register` | `{pseudo, passHash}` | anonyme | 201, 409 |
| `login` | `{pseudo, passHash}` | anonyme | 200 (`forcePasswordReset`), 401 |
| `verify` | — | cookie | 200, 401 |
| `logout` | — | cookie | 200 (idempotent) |
| `session_bundle` | — | session pleine | 200 `{versions, data}`, 401/403 |
| `touch_last_seen` | — | session pleine | bloqué en reset |
| `self_set_theme` | `{themeId}` | session pleine | 200 |
| `self_change_password` | `{currentPassHash, newPassHash}` | session pleine | 200 + cookie, 403 |
| `self_delete_account` | `{currentPassHash}` | session pleine | 200, 409 |
| `complete_forced_reset` | `{newPassHash}` | session restreinte | 200 + cookie, 401, 403 |
| `admin_reset_password` | `{accountId}` | admin | 200 `{temporaryPassword, expiresAt}` |
| `admin_set_password` | `{accountId, newPassHash}` | admin | 200 |
| `admin_health` | — | admin | 200, 403 |
| `admin_set_theme_visibility` | `{themeId, visible}` | admin | 200 |
| `admin_set_theme_autogrant` | `{themeId, enabled}` | admin | 200 |

### 4.2 `/.netlify/functions/db`

| action | corps | qui | codes vus |
|---|---|---|---|
| `ping` | — | anonyme | 200 |
| `get_public_bundle` | — | anonyme | 200 |
| `get` | `{key}` | selon clé | 200 `{value, version}`, 401 |
| `get_all` | — | staff | 200 `{data, versions}` |
| `set` | `{key, value, expectedVersion}` | selon clé/rôle | 200 `{key, value, version}`, 400, 403, 409 `VERSION_CONFLICT`, 428 `VERSION_REQUIRED` |
| `delete` | `{key, expectedVersion}` | admin, clés non critiques | 200, 403, 409 |
| `patch_own_player` | `{patch:{journal?, avatar?}, expectedVersion}` | joueur lié | 200, 400, 401 |
| `consume_own_item` | `{itemId, note?, expectedVersion}` | joueur lié | 200, 400, 401, 403, 404, 409 `ITEM_UNAVAILABLE`/`VERSION_CONFLICT`, 428 |
| `dismiss_notifications` | `{timestamp}` ou `{all:true}` + `expectedVersion` | joueur lié | 200, 400, 404, 409, 428 |
| `set_event_participation` | `{eventId, participating, expectedVersion}` | joueur lié | 200, 400, 404, 409 `EVENT_FULL`/`EVENT_UNAVAILABLE`/`VERSION_CONFLICT`, 428 |
| `rpg_get_character` / `rpg_save_character` | — | *dérive* | — |

Forme d'erreur : `{ ok:false, code?, key?, error:'<message français> ' }` ; messages figés : « Recharge les données avant de les modifier (version attendue requise). » (428), « Ces données ont été modifiées par une autre session. Recharge-les avant de réessayer. » (409), « Cet item n'est plus disponible. », « Événement complet. », « Plusieurs personnages portent ton nom : … », « La liste des participants doit être corrigée par l'équipe. », « La capacité de cet événement doit être corrigée par l'équipe. » (`netlify/functions/db.js:467,470,908,935-945`).

---

## 5. Questions ouvertes

1. **`exp` du JWT en millisecondes** : le harnais signe `exp: Date.now() + 60000` (`test-auth-security.js:49`) alors que le standard JWT utilise des secondes. À confirmer dans `auth.js` avant de réécrire la vérification.
2. **Doublons de nommage** dans les fixtures : `name`/`nom` et `adminNotes`/`adminNote` pour les créatures (`local-app.js:29`), `nom/date/hidden` vs `titre/dateTs/published` pour les événements. Le filtre public retire `adminNotes` (testé) — retire-t-il aussi `adminNote` au singulier ? Non testé.
3. **Précédence `hidden` vs `published`** : `republished` (`published:false, hidden:false`) est inscriptible (`test-player-actions.js:31,229-239`). La règle exacte (« `hidden` explicite prime ») est déduite ; le canon n'est écrit nulle part.
4. **`Owner` des archives** = pseudo **ou** nom du personnage (`test-db-security.js:150-161`) : deux espaces de noms qui peuvent se chevaucher (un joueur nommant son personnage comme le pseudo d'un autre). Le test homonymes (H5) ne couvre que les événements.
5. **Rôle `designer`** : staff pour la lecture intégrale (C5) et l'édition d'événements (H13), mais sans notification des joueurs (H16). Périmètre exact du rôle non spécifié ailleurs.
6. **Deux plafonds d'archives** : index 5 000, liste de compatibilité 50. La liste `combat_arc_<Owner>` doit-elle survivre à l'overhaul ou n'est-elle qu'un format de transition ?
7. **`beh` des créatures** : valeur formulaire `'3'` (`test-beast-persistence.js:43`) vs valeur stockée `'Neutre'` (`:10`). Mapping non testé.
8. **Fusion des comptes** (A19-A25) : les tests supposent un merge champ-par-champ + 409 sur collision de champ. Le comportement en cas d'ajout simultané de champs nouveaux ou de tableaux (`unlockedThemes`) n'est pas couvert.
9. **Événement notifié** : la notification écrit dans `history` de **tous** les joueurs via un `set players` complet (H17). Sur une table nombreuse, cela crée un point de contention CAS. À repenser (écriture dédiée) ?
10. Les tests navigateur attendent `waitForTimeout(2200)` après le chargement (`test-browser.js:19`) : quel délai de démarrage l'application impose-t-elle réellement (animation d'intro ?) ?

---

## 6. Ce qu'il faut absolument préserver dans l'overhaul

1. **Le modèle de concurrence bout en bout** : version = md5 du JSONB, `expectedVersion` obligatoire (428), CAS PostgreSQL (409 `VERSION_CONFLICT`), création avec `expectedVersion:null`, et côté client une file d'écriture par collection qui **se bloque après un conflit jusqu'à une relecture acceptée** (F16, I11, H19) et qui rejette tout instantané staff périmé sans l'envoyer (I12).
2. **L'isolation de session côté client** (`_dbSessionGeneration` / `SESSION_CHANGED`) : aucune réponse tardive ne peut restaurer un cache, une identité, un brouillon, une notice, une modale ou une animation d'une session précédente (§3.B, B12-B14). C'est le comportement le plus testé du dépôt — 30+ assertions.
3. **La discipline « rien avant confirmation »** : pas de décrément local, pas de notice `ok`, pas de fermeture de modale, pas de log d'audit, pas de rendu, tant que le serveur n'a pas répondu ; en échec, restauration exacte du cache **sans écraser un cache plus récent** (F11, O2, I8, H19). Résultats `undefined` / `{ok:false}` / `{skipped:true}` ne valent jamais succès (F12).
4. **Le modèle de sécurité des données** : stores internes invisibles même aux admins ; `accounts` jamais écrivable en générique ni supprimable ; `players`/`beasts`/`events` jamais supprimables ; joueur = lecture de son seul personnage + 4 actions dédiées ; MJ = XP/inventaire/ajout mais jamais identité/serment/journal/avatar/suppression ; filtrage public récursif de `hidden`, `archived`, `published:false`, `adminNotes`, `*.mjNote` ; `pass` jamais renvoyé.
5. **Le cycle de vie des mots de passe** : hachage client `sha256:`, secrets temporaires aléatoires expirant sous 1 h, session restreinte `forcePasswordReset` n'autorisant que `verify` + `complete_forced_reset`, révocation par `sessionVersion` dans les deux handlers, logout serveur idempotent, récupération admin par variables d'environnement.
6. **Les règles de progression** (`progression.js`) : `xpMax = level×30`, bases 30/50/20, table de croissance native des 13 serments, définitions custom prioritaires, migration bi-piste idempotente (« la piste la plus avancée gagne, jamais de somme, jamais de niveau bonus, ressources dépensées conservées, KO conservé »), gemme blanche +5 XP, level-up remet les courants au max, retrait de niveau plafonne. Le **même module** doit servir navigateur et serveur.
7. **Les invariants de suppression de compte** : compte + personnage lié en une transaction, annulée si le compte ou le personnage bouge (A14-A15).
8. **Les 4 actions joueur** (journal/avatar, consommer, masquer notifications, participer) avec leurs validations strictes (champs supplémentaires → 400, note ≤ 2000, quantité entière > 0, homonymes → refus, capacité `max:0` = illimité, complet → `EVENT_FULL`), l'échappement HTML **côté serveur** du texte d'historique, et le fait que les `inscrits` sont des noms de personnages.
9. **Les récits de combat comme archives lisibles** : détail intégral round-trip, index paginé (20 par page, compteur « N récits », recherche, export texte sûr, « Réessayer »), lecture sans aucune écriture, propriété par joueur, détails récupérables même après retrait de l'index, purge stricte du localStorage privé avec quarantaine + export vérifié avant suppression des copies héritées.
10. **La sauvegarde logique** `np-store-backup-v1` (texte JSONB brut, checksum canonique, `0o600`, lecture seule RepeatableRead, refus d'écraser, zéro secret en sortie).
11. **L'onboarding honnête** : états `guest/pending/unavailable/linked/staff`, autorité du `pid` du compte, invité renvoyé au règlement, aucune fausse coche « étape terminée », texte « Un administrateur doit maintenant le lier » / « Pseudo à transmettre : … ».
12. **Les garanties d'accessibilité** : labels uniques sur le login, dialogues `aria-modal` avec piège de focus et restauration du focus, cartes de thème activables au clavier (Enter/Space) mais inertes derrière une modale, raccourcis globaux jamais actifs dans un champ/bouton/modale, zéro débordement horizontal à 390 px.
13. **Le triptyque staff `admin` / `mj` / `designer`** avec ses différences testées (designer : pas de notification joueurs ; MJ : pas d'accès `np_syslog_archive`).
14. **Les libellés français** listés en §4.2 et §3 (notices, messages d'erreur, boutons « TOUT EFFACER », « Aucune notification », « Mon personnage », « Archives de combat », « Ma collection », « Exporter ce récit », « Rechercher un récit », « Suivant », « Réessayer », « Joueurs notifiés », « Import enregistré »).
15. **La CSP de `netlify.toml` et l'absence totale de ressource externe** (tous les tests navigateur bloquent `https://**`).

---

## 7. Ce qui relève de la dérive / dette

### 7.1 Dérive « jeu en ligne » (à supprimer, ne pas reporter les tests)

- **Prototype RPG** : `test-rpg-persistence.js` (131 l.), `test-rpg-browser.js` (50 l.), actions `rpg_get_character`/`rpg_save_character`, clé `rpg_characters`, `assets/js/rpg-prototype.js`, localStorage `np_rpg_proto_v1`/`np_rpg_guest_v2`, lieux/or/équipement. Les seules idées à conserver (CAS, isolation, « Télécharger le brouillon » en cas de conflit) sont déjà spécifiées ailleurs.
- **Simulateur de combat jouable** : raccourcis clavier `combatPassTurn`/`combatNextRound`/`combatUndo` (`test-account-keyboard-browser.js:86-125`), état `_cs` avec phases/rounds/invocations, `combatEnd()` (`test-gameplay-persistence.js:117-196`). À requalifier : ce qui doit survivre est le **report** d'un résultat de scène (PV/EP/EM, récit dans `history` avec `combatId`) et le récit archivé — pas la boucle de jeu.
- Le bouton « rpg » de l'onboarding (`openRpgPrototype`, `test-first-steps.js:23`) et l'onglet `combat-mj`.

### 7.2 Dette de test (structure)

- **Tests couplés au texte de `main.js`** : 11 fichiers découpent le monolithe par repères littéraux (`section('function doLvlUp(p){', '// Save a detached draft;')`, `'// ==========================================\n// PLAYER MGMT'`, `'var WEAPON_ICONS='`, `'// CARTE DU MONDE'`…). Ils cassent au premier renommage et figent des commentaires comme API. L'overhaul doit remplacer ces tranches par des **modules importables** (comme `progression.js`, seul module déjà testé proprement).
- **Trois runners** hétérogènes : scripts autonomes avec compteur maison (`test-auth-security.js`, `test-db-security.js`, `test-beast-persistence.js`) exécutés sous `node --test` ; `node:test` ; Playwright ad hoc sans reporter. À unifier.
- **Deux harnais serveur** (`createMemorySql` maison vs PGlite) qui testent les mêmes flux d'auth : le mock SQL maison (`test-auth-security.js:15-43`) ne reconnaît que 4 formes de requêtes et lève sur toute autre — fragile.
- **Fixtures dupliquées** (`hashPassword` défini 3 fois, `section()` copié 8 fois, `ready()`/`spyNotices()`/`login()` copiés dans 4 tests navigateur).
- **Attentes temporelles** (`waitForTimeout(2200/1500/450/400/300/250/100)`) et délai de debounce **450 ms** figé par les tests RPG.
- **Assertions sur des sélecteurs `onclick="…"` inline** (`button[onclick="playerConsume()"]`, `button[onclick="eventInscrit('expedition')"]`, `button[onclick="deleteNotif('p_alice',<ts>)"]`) : le HTML inline est lui-même une dette (CSP) et les tests la figent.
- **Fonctions globales exposées comme API de test** : `showScreen`, `switchTab`, `forceOpenOwnProfile`, `renderJournalFiche`, `saveJournalFiche`, `gpid`, `gp`, `_dbCache`, `_normalizePlayerRecord`, `updateHdrProfile`, `_loadSessionBundle`, `saveCombatArchives`, `getCombatArchives`, `combatArchiveFetchRecord`, `logout`, `importDB`, `npDashboardPolish`, `openProgPanel`, `applyXP`, `applyGemXP`, `changeGemQty`, `openChangeSerm`, `exportFichePDF`, `loadPlayer`, `cGetFighterSerment`, `openModal`, `closeModal`, `_currentTheme`, `_eventStaffBusy`, `getEvents`, `getPlayerNotifs`, `openFirstSteps`, `npResetRpgSession`, `auth.signToken`, `auth.makeSessionPayload`. Une architecture par modules devra offrir un point d'entrée de test explicite plutôt que `window.*`.

### 7.3 Dette de modèle de données mise en évidence par les tests

- Deux schémas d'événement (`nom/date/hidden` vs `titre/dateTs/published`) et la règle de précédence implicite.
- `name`/`nom`, `adminNotes`/`adminNote`, `classe`/`class`.
- Trois clés par propriétaire pour les archives, dont une liste de compatibilité plafonnée à 50.
- `inscrits` par nom de personnage (collision d'homonymes gérée par refus).
- `notifDeleted` = liste de timestamps ; `history` sert à la fois de journal d'audit, de flux de notifications et d'index de récits.
- Notification d'événement = réécriture complète de `players`.
- Copies localStorage héritées (`np_combat_arc_*`) nécessitant un flux de récupération dédié.
- `serments_custom` pouvant valoir `null` ; `players` pouvant contenir `null` ou valoir `null`.
