# 05 — Backend, modèle de données, auth et permissions

Audit en lecture seule du dépôt `C:\Users\sacha\NuagesPolaires` (v297.0.0 d'après `package.json`). Ce document est la **spécification source** du backend actuel pour l'overhaul : tout ce qui n'est pas écrit ici sera perdu. Les références sont données sous la forme `fichier:ligne`.

Sources lues intégralement : `netlify/functions/auth.js` (1 097 lignes), `netlify/functions/db.js` (1 053), `netlify/functions/_shared/auth-store.js` (138), `scripts/helpers/local-app.js`, `scripts/helpers/store-backup.js`, `scripts/backup-store.js`, `scripts/verify-backup.js`, `assets/js/api-hardening.js`, `assets/js/progression.js`, `docs/security-and-data.md`, `docs/env-vars.md`, `docs/backups.md`, `docs/infrastructure-review-2026-09-21.md`, `docs/deploy-netlify.md`, `docs/fusion-xp.md`, `netlify.toml`, `.env.example`, les tests `scripts/test-auth-security.js`, `test-db-security.js`, `test-integration.js`, et les portions de `assets/js/main.js` qui appellent le backend (couche `_jsonPost`/`_authCall`/`_dbCall`, normalisations, flux login/register/reset/logout, actions admin, archives de combat, événements, lieux, journal système, spawn lab).

---

## 0. Résumé exécutif

- **Une seule table PostgreSQL** (`np_store`, clé texte → JSONB) héberge **toutes** les données : comptes, personnages, bestiaire, événements, lieux, serments personnalisés, thèmes, journal staff, archives de combat (3 familles de clés par propriétaire), état du « laboratoire d'apparitions », personnages du prototype RPG, journal d'audit, compteurs de rate-limit, jeton de récupération admin. Le 21/09/2026 la base réelle contenait 84 lignes (`docs/infrastructure-review-2026-09-21.md:26`).
- **Deux fonctions Netlify** (`auth.js`, `db.js`) exposent chacune un endpoint `POST` unique piloté par `body.action`. Elles dupliquent ~120 lignes (CORS, cookie, JWT, client SQL, `normalizeRole`).
- **Session** : cookie `np_session` HttpOnly/Secure/SameSite=Strict, 30 jours, contenant un JWT HS256 « maison » (`exp`/`iat` en millisecondes). Révocation par `sessionVersion` stocké sur le compte.
- **Mots de passe** : le navigateur envoie `sha256:<hex>` du mot de passe ; le serveur stocke `pbkdf2:<salt>:<hex>` (PBKDF2-SHA512, 100 000 itérations, clé 64 octets) calculé **sur le hash client**. Migration transparente des anciens formats au login.
- **Rôles** : `joueur`, `mj`, `designer`, `admin` (chaîne normalisée, défaut `joueur`). Un compte joueur est lié à un personnage par `pid` (= `players[].id`). La liaison est faite manuellement par l'admin.
- **Concurrence** : chaque clé a une « version » = `md5(value::text)`. Les écritures génériques exigent `expectedVersion` (428 sinon, 409 `VERSION_CONFLICT` si périmée). Les comptes ont en plus une fusion champ-par-champ (`auth-store.js`).
- **Permissions** : matrice codée en dur par clé et par rôle (`db.js:75-103`, `156-207`), plus des actions métier dédiées (joueur : journal/avatar, consommation d'objet, notifications, participation aux événements).
- **Dérives structurelles** : identités par *nom* (archives de combat par pseudo, inscriptions d'événements par nom de personnage), collections monolithiques réécrites entièrement, troncatures silencieuses (historique 200, syslog 500), clés serveur jamais utilisées par le client (`theme_catalog`, `serment_catalog`, `page_content`, `themes_admin_store`), prototype RPG (`rpg_characters`) à supprimer.

---

## 1. Topologie et infrastructure

| Élément | Valeur | Source |
|---|---|---|
| Hébergement | Netlify, build `npm run build` (check + tests + `scripts/build.js`), publication `dist/`, fonctions `netlify/functions` | `netlify.toml:1-5` |
| Runtime | Node 24 (`NODE_VERSION = "24"`, `engines >=24 <25`), npm 10 ; fonctions publiées observées en `nodejs20.x` avant v296 | `netlify.toml:7-9`, `package.json:6-8`, `docs/infrastructure-review-2026-09-21.md:18` |
| Base | Neon PostgreSQL (17.11 observé), pilote HTTP `@neondatabase/serverless ^0.10.4`, client mémoïsé par instance Lambda | `auth.js:26-38`, `db.js:13-25`, `package.json:9-11` |
| Endpoints | `POST /.netlify/functions/auth` et `POST /.netlify/functions/db`, JSON uniquement, `credentials: 'same-origin'` | `main.js:534-556` |
| Dépendance front→back | `progression.js` (module UMD) est `require`-é par les deux fonctions : `auth.js:2`, `db.js:4` | |
| En-têtes statiques | CSP `default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: https://i.imgur.com blob:` ; HSTS ; COOP/CORP same-origin ; `X-Frame-Options DENY` | `netlify.toml:11-24` |
| Tests | `node --test` sur PGlite (PostgreSQL en mémoire) via `scripts/helpers/local-app.js` ; Playwright pour le navigateur ; le build exécute les tests | `package.json:14-21` |

### 1.1 Variables d'environnement

| Variable | Rôle | Obligatoire | Source |
|---|---|---|---|
| `NETLIFY_DATABASE_URL` | URL Postgres ; priorité 1 | oui | `auth.js:7-9`, `db.js:7-9` |
| `DATABASE_URL` | Fallback 2 | non | idem |
| `NETLIFY_DATABASE_URL_UNPOOLED` | Fallback 3 | non | idem |
| `NP_JWT_SECRET` | Secret HMAC des sessions, **≥ 32 caractères** sinon 503 « Service non configuré » | oui | `auth.js:50-53`, `auth.js:620`, `db.js:36-39` |
| `NP_SITE_URL` | Origine autorisée (CORS + contrôle Origin/Referer). **Si absente, toute origine est acceptée** (`isTrustedOrigin` retourne `true`) | oui en prod | `auth.js:55-85`, `db.js:41-71` ; absente sur le site réel au 21/09 (`infrastructure-review:13`) |
| `NP_ADMIN_PSEUDO` / `ADMIN_PSEUDO` | Pseudo du compte admin à bootstrapper (2–32, regex pseudo) | non | `auth.js:331-338` |
| `NP_ADMIN_PASSWORD` / `ADMIN_PASSWORD` | Mot de passe temporaire (≥ 8 caractères, tronqué à 256) | non | idem |
| `NP_ADMIN_RECOVERY` | `"true"` → récupération forcée d'un admin existant (consommée une fois par couple pseudo/mdp) | non | `auth.js:336`, `345-385` |
| `CONTEXT`, `DEPLOY_ID` | Renvoyés par `admin_health` | fournis par Netlify | `auth.js:22-23` |
| `NP_BACKUP_SOURCE_URL` | Seule source acceptée par `scripts/backup-store.js` (jamais de fallback) | pour backup | `backup-store.js:3-4, 61` |
| `NP_TEST_BASE_URL` | Cible du test distant `npm run test:auth` (crée un compte sur la cible) | pour test distant | `docs/deploy-netlify.md` |

`.env.example` liste les 6 variables `NP_*`/`NETLIFY_DATABASE_URL`. Scope Netlify recommandé : **Functions** (`docs/deploy-netlify.md`).

### 1.2 Garde-fous communs aux deux handlers

Ordre exact dans `auth.js:616-626` :
1. `OPTIONS` → 200 vide.
2. Méthode ≠ `POST` → 405 `{"error":"Méthode non autorisée"}`.
3. Secret manquant/court → 503 `{"ok":false,"error":"Service non configuré"}`.
4. DB non configurée → 503 `{"ok":false,"error":"Base de données non configurée ou indisponible","offline":true}`.
5. Origine non fiable → 403 `{"error":"Origine non autorisée"}` (Origin exact, sinon Referer préfixé par l'origine, sinon refus si `NP_SITE_URL` défini).
6. `Content-Type` sans `application/json` → 415 `{"error":"Content-Type invalide"}`.
7. Corps > **32 KiB** → 413 `{"error":"Requête trop volumineuse"}`.
8. `ensureTable()` (`CREATE TABLE IF NOT EXISTS` **à chaque requête**, `auth.js:306-314`).
9. JSON non-objet → 400 `{"ok":false,"error":"Objet JSON attendu"}` ; `SyntaxError` → 400 `{"ok":false,"error":"JSON invalide"}`.

`db.js:714-731` est identique sauf : `ensureTable()` **avant** le contrôle de méthode (un `GET` touche donc la base), corps max **1 MiB** (`MAX_REQUEST_BODY`, `db.js:81`).

En-têtes de réponse (`auth.js:60-77`) : `Content-Type: application/json`, `Access-Control-Allow-Origin` uniquement si l'Origin est exactement `NP_SITE_URL`, `Access-Control-Allow-Credentials: true`, `Vary: Origin`, `Cache-Control: no-store, no-cache, must-revalidate`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: same-origin`.

IP client = premier élément de `x-forwarded-for` ou `client-ip`, sinon `"unknown"` (`auth.js:627`, `db.js:519`).

---

## 2. Schéma SQL exact de `np_store`

### 2.1 DDL (identique dans les 3 endroits qui le créent)

```sql
CREATE TABLE IF NOT EXISTS np_store (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
Sources : `auth.js:306-314`, `db.js:551-559`, `local-app.js:17`, `verify-backup.js:13`.

- **Index** : uniquement l'index implicite de la clé primaire sur `key`. Aucun index GIN/JSONB, aucun index sur `updated_at`.
- **Schéma** : `public`. Le script de sauvegarde vérifie `relkind = 'r'`, **absence de RLS** (`relrowsecurity = false`) et la liste exacte des colonnes `[key text NOT NULL PK, value jsonb NOT NULL, updated_at timestamptz NULL]` (`backup-store.js:27-50`). La base réelle ne contient **que** cette table (`infrastructure-review:26`).
- **Versionnage** : pas de colonne de version ; la révision optimiste est calculée à la volée : `md5(value::text)` (`db.js:566`, `auth-store.js:40`, `auth.js:534`). Elle décrit le **JSON brut stocké**, pas la valeur normalisée renvoyée (`db.js:568`).
- **Requêtes utilisées** : `SELECT value[, md5(value::text) AS version] FROM np_store WHERE key = $1` ; `SELECT key, value, md5(value::text) FROM np_store` (bundle public et `get_all` lisent **toute la table**, `db.js:771`, `859`) ; `INSERT … ON CONFLICT (key) DO UPDATE` (`auth.js:319-325`) ; `INSERT … ON CONFLICT DO NOTHING RETURNING` (création conditionnelle, `db.js:575-580`) ; `UPDATE … WHERE key = $1 AND md5(value::text) = $expected RETURNING updated_at, md5(value::text)` (`db.js:582-586`) ; `UPDATE … WHERE key = $1 AND value = $raw::jsonb` (CAS par égalité JSONB, `auth-store.js:27, 109`) ; `DELETE … WHERE key = $1 AND md5(value::text) = $expected` (`db.js:1038-1041`) ; suppression atomique compte+personnage avec `WITH locked AS MATERIALIZED (… FOR UPDATE)` (`auth.js:401-415`) ; upsert du journal d'audit avec `jsonb_array_elements … WITH ORDINALITY … LIMIT 1000` (`db.js:615-630`).
- Aucune transaction explicite dans les handlers (le pilote HTTP Neon exécute chaque requête isolément) ; seule la sauvegarde utilise `sql.transaction(…, {isolationLevel:'RepeatableRead', readOnly:true})` (`backup-store.js:24-41`).

### 2.2 Inventaire exhaustif des clés

Légende lecture/écriture : A = admin, M = MJ, D = designer, J = joueur (lié), P = public/anonyme. « générique » = actions `get`/`set`/`delete` de `db.js` ; « auth » = actions de `auth.js`.

| Clé | Forme | Lecture | Écriture | Notes / source |
|---|---|---|---|---|
| `accounts` | tableau de comptes (§3.1) | A tout (sans `pass`) ; autres : uniquement leur propre compte | **jamais** via générique (`db.js:170`, refus 403) ; uniquement via actions auth (`createRecordStore`) | Version dans `session_bundle`. `db.js` strip `pass`, `sessionVersion`, `resetExpiresAt` (`db.js:668-675`) ; `auth.js` ne strip que `pass` (`auth.js:551-555, 563-566`) |
| `players` | tableau de personnages (§3.2) | A, M tout ; J/D avec `pid` : son personnage seulement ; sans pid : `get` → 401, bundle → `[]` | générique A, M (M contrôlé par `validatePlayerWrite`) ; J via `patch_own_player`, `consume_own_item`, `dismiss_notifications` | Normalisé par `progression.normalizePlayer` à chaque lecture (`db.js:305`, `auth.js:542`) ; historique tronqué à 200, inventaire 500, statuts 64 |
| `beasts` | tableau de créatures (§3.3) | P/J : sans `hidden`/`archived`, notes staff retirées ; staff complet | A, M, D | Clé publique |
| `serments_custom` | objet `{ [nomSerment]: définition }` (§3.4) | P (aucun filtrage de `hidden`) | A, D | Sert aussi de définition de croissance pour `players` |
| `events` | tableau d'événements (§3.5) | P/J : sans événements masqués, notes staff retirées ; staff complet | A, M, D ; J via `set_event_participation` | |
| `lieux` | tableau de lieux (§3.6) | P **sans filtrage** (`visible`, `notes` exposés) | A seulement | Carte dormante côté UI (`plan-du-site:140`) |
| `event_themes` | tableau (ou objet legacy) d'entrées de thème (§3.7) | P | A, D ; auth `admin_set_theme_autogrant`, `admin_set_theme_visibility` | |
| `theme_visibility` | objet `{ [themeId]: bool }` | P ; dans `session_bundle` | A ; auth `admin_set_theme_visibility` | Le client ne l'écrit jamais en générique (`_LOCAL_ONLY_KEYS`, `main.js:1369`) |
| `theme_catalog` | objet ou tableau (jamais produit) | P | A, D | **Aucune occurrence côté client** (dette) |
| `serment_catalog` | idem | P | A, D | idem |
| `page_content` | objet (jamais produit) | P | A, D | idem |
| `spawn_lab_staff` | objet (§3.8) | A, M, D | A, M, D | `schemaVersion: 2`, `lastDbSyncAt` forcés serveur (`db.js:328-333`) |
| `np_syslog` | tableau d'entrées (§3.9), max 500 | A, M | A, M | Client empile jusqu'à 2 000 (`main.js:1162`) → tronqué à 500 à chaque écriture |
| `np_syslog_archive` | tableau d'archives (§3.9), max 50 | A | A | MJ ne peut ni lire ni écrire |
| `combat_arc_<owner>` | tableau d'archives complètes, max 500 serveur / 50 client (§3.10) | A, M tout ; J propriétaire | A, M, J propriétaire | `owner` = pseudo / id / nom du personnage lié |
| `combat_arc_idx_<owner>` | tableau de métadonnées `_stub`, max 5 000 | idem | idem | Index publié **après** les détails |
| `combat_arc_rec_<owner>__<id>` | objet archive complète | idem | idem | Seules clés supprimables via `delete` (avec les deux ci-dessus) |
| `rpg_characters` | tableau de personnages RPG, un par `ownerId` (§3.11) | via `rpg_get_character` (le sien) | via `rpg_save_character` (le sien) | Refusé en `get`/`set` (pas dans `isValidKey`, pas public) — **dérive à supprimer** |
| `np_audit_log` | tableau, plus récent en tête, max 1 000 (§6) | A via `admin_get_audit_log` (auth), `get_audit_log` (db), et `get`/`get_all` admin | serveur uniquement (`BLOCKED_CLIENT_KEYS`) | |
| `np_rate_auth` | objet `{ "<scope>:<val>": {count, first} }` | personne | serveur (`mutateJsonStore`) | Bloquée client |
| `np_admin_recovery_consumed` | `{ fingerprint, pseudo, consumedAt }` | personne | serveur | `auth.js:353, 382` |
| `themes_admin_store` | inconnue | personne (bloquée) | personne | Référencée seulement dans `BLOCKED_CLIENT_KEYS` et les fixtures de test : aucun producteur dans le code |
| `public_stats` | **pas une clé stockée** : calculée dans `get_public_bundle` | P | — | `db.js:836-842` |

---

## 3. Formes JSON des enregistrements

### 3.1 Compte (`accounts[]`)

Création à l'inscription (`auth.js:743-751`) :
```json
{
  "id": "a1727712000000_9f3a1c2b",
  "pseudo": "Ashaii",
  "pass": "pbkdf2:<64 hex de sel>:<128 hex>",
  "role": "joueur",
  "pid": null,
  "createdAt": 1727712000000,
  "lastSeen": 1727712000000
}
```
Champs ajoutés au fil de la vie du compte (normalisation `auth.js:254-271`, `main.js:676-690`, fixture `local-app.js:25`) :
```json
{
  "sessionVersion": 3,
  "forcePasswordReset": false,
  "resetExpiresAt": 1727715600000,
  "selectedTheme": "dark",
  "unlockedThemes": ["violet", "halloween"],
  "blockedThemes": [],
  "updatedAt": 1727712000000
}
```
- `id` : `"a" + Date.now() + "_" + 4 octets hex` (inscription) ; `"admin_" + Date.now() + "_" + hex` (bootstrap, `auth.js:368`) ; fallback de normalisation `"a_" + index`.
- `pseudo` : regex `^[A-Za-z0-9_\-À-ÿ ]{2,32}$` (`auth.js:194`), unicité **insensible à la casse** (`auth.js:641, 739`, `auth-store.js:102-103`), tronqué à 32.
- `role` ∈ `joueur | mj | designer | admin`, toute autre valeur → `joueur` (`auth.js:500-503`).
- `pid` : `players[].id` ou `null` ; regex `^[A-Za-z0-9_:\-]{1,128}$` à la liaison (`auth.js:195, 865-866`).
- `pass` : formats acceptés à la vérification (`auth.js:160-175`) : `pbkdf2:<salt>:<hash>` (comparaison `timingSafeEqual`), `sha256:<hex>` (égalité stricte avec le hash client), ou hex brut (legacy, comparé au hash client sans préfixe). Tout format non-PBKDF2 est ré-encodé au prochain login réussi (`auth.js:668-675`).
- `sessionVersion` : entier ≥ 0, défaut 0 pour les comptes historiques (`auth.js:449-451`).
- `forcePasswordReset` + `resetExpiresAt` : reset valide si `true` et `resetExpiresAt > now` (`auth.js:455-457`) ; sinon le compte **ne peut plus se connecter** (login refuse, `auth.js:659`).
- `unlockedThemes` / `blockedThemes` : identifiants normalisés par `normalizeThemeId` (alias `auth.js:199-223` : `default/themedefault/nuagespolaires/original/base → dark`, `brumeclaire/modeclair/clair → light`, `abyssal → violet`, `ecarlate/scarlet → red`, `sylvan → green`, `printempseveille/paques → easter`, `christmas → noel`, `lunedesang → bloodmoon`, `aquaris`) ; dédoublonnés.
- **Champs inconnus conservés** (spread), ce qui explique `updatedAt` posé uniquement par le bootstrap.

### 3.2 Personnage (`players[]`)

Fixture canonique (`local-app.js:26`) :
```json
{
  "id": "p_alice", "name": "Alice", "classe": "Mizu", "level": 1,
  "xp": 0, "xpMax": 30,
  "pvMax": 30, "pvCur": 30, "epMax": 50, "epCur": 50, "emMax": 20, "emCur": 20,
  "progressionVersion": 1, "branch": "Aucune", "journal": "Journal alice", "avatar": "",
  "inventory": [], "history": [], "statuts": [],
  "equipment": { "helmet": null, "chest": null, "legs": null }
}
```
Champs supplémentaires rencontrés : `arme` (string, `main.js:722`), `notifDeleted` (tableau de `ts` masqués, `db.js:921-924`), `unlockedThemes`/`blockedThemes` (legacy côté personnage, `main.js:729-730`, lus par `getUnlockedThemes` `main.js:1106`), `class` (alias legacy de `classe`), `sLevel/sXp/sXpMax` (anciens compteurs de serment, **supprimés** par `normalizePlayer`, `progression.js:76-78`).

- Normalisation serveur (`db.js:293-307`, `auth.js:272-283`) : `id` (fallback `p_<idx>`), `name` ≤ 80, `classe` ≤ 80, `level ≥ 1`, `inventory.slice(0,500)`, `history.slice(-200)`, `statuts.slice(0,64)`, `equipment` réduit à 3 slots, puis `progression.normalizePlayer`.
- **Progression commune** (`progression.js`) : `xpMax = level × 30` ; migration v1 : on garde le niveau le plus avancé entre piste personnage (`level/xp/xpMax`, seuil `niveau×30`) et piste serment (`sLevel/sXp/sXpMax`, seuil `niveau×10`), à égalité la meilleure fraction ; `xp = min(xpMax−1, ceil(fraction×xpMax − 1e-10))` ; gains de stats `pvN/epN/emN` × Δniveau selon `DEFAULT_GROWTH` (`progression.js:8-14`, ex. Duelliste `[6,6,2]`, Arcaniste `[1,1,8]`) fusionnés avec `serments_custom[classe]` ; base PV 30 / EP 50 / EM 20 ; un personnage à 0 PV reste à 0 ; `progressionVersion: 1` rend la migration idempotente.
- Inventaire : `{ id: "i<ts>" | "gem_<ts>", name, category, qty, desc? }` (`main.js:9517`, `12574`) ; les gemmes ont `category: "Gemme"`.
- Historique : `{ ts, type, text, by }` avec `type` ∈ `xp | gemme | item | level | stat | serment | combat | add | event` (grep `main.js` lignes 6757–15272) ; l'entrée serveur de consommation est `{ ts, type:"item", text:"Consommé : <nom> — <note>", by:"<nom perso> (joueur)" }` avec texte **échappé HTML** (`db.js:481-487, 915`). Le client rend l'historique comme HTML (commentaire `db.js:482`).
- Champs modifiables par un MJ via `set players` (`db.js:428-432`) : `xp, xpMax, level, pvCur, pvMax, epCur, epMax, emCur, emMax, inventory, history, equipment, statuts` ; sur son propre personnage aussi `avatar`, `journal`. Tout autre changement (`name`, `classe`, `branch`, `arme`, `journal`…) → 403 « Modification réservée à l'admin : <champ>. » ; suppression → 403 « La suppression d'un personnage est réservée à l'admin. » ; **création** de personnage autorisée au MJ (`db.js:459-461`).
- `avatar` : `validateAvatar` (`db.js:410-427`) accepte `data:image/(png|jpe?g|webp|gif);base64,…` ≤ 350 000 caractères, `http(s)://` sans identifiants, ou chemin relatif sans schéma/`//`/`&` ; interdit `<>"'\`\\`, contrôle, espace.

### 3.3 Créature (`beasts[]`)

Normalisation serveur minimale (`db.js:308-318`) : `id` (fallback `b_<idx>`), `name` ≤ 80, `level ≥ 1`, `statuts ≤ 64`. Le **client** produit le vrai schéma (`main.js:733-815`), avec doublons d'alias conservés en base :
```json
{
  "id": "b_loup-des-brumes",
  "nom": "Loup des brumes", "name": "Loup des brumes",
  "sub": "", "subtitle": "",
  "beh": "Neutre", "behavior": "Neutre", "comportement": "Neutre",
  "niv": 3, "level": 3,
  "pv": 40, "hp": 40, "pvMax": 40,
  "ep": 20, "energy": 20, "epMax": 20,
  "frappe": "", "attack": "", "comp": "", "skill": "", "ability": "",
  "drops": "", "loot": "", "gem": "", "gemme": "",
  "desc": "", "description": "", "img": "", "image": "",
  "hidden": false, "archived": false,
  "statuts": [], "qtyMin": 1, "qtyMax": 3, "spawnWeight": 1,
  "tags": [], "zones": ["[🌳]-forêt-centre"],
  "style": "", "citation": "", "adminNote": "",
  "createdAt": 1727712000000, "updatedAt": 1727712000000,
  "catalog": { "id": "…", "name": "…", "subtitle": "…", "behavior": "…", "level": 3, "pv": 40, "ep": 20, "frappe": "", "comp": "", "drops": "", "gem": "", "desc": "", "img": "", "hidden": false, "archived": false, "qtyMin": 1, "qtyMax": 3, "spawnWeight": 1, "tags": [], "zones": [] }
}
```
Filtrage public : `hidden` ou `archived` retirés ; clés `adminNote(s)`, `noteAdmin`, `staffNote(s)`, `mjNote(s)` retirées récursivement (`db.js:399-409, 676-683`).

### 3.4 Serments personnalisés (`serments_custom`)

Objet `{ "<Nom du serment>": définition }`. La définition de base vit **dans le code** (`SD`, `main.js:213-485`, 13 serments : Duelliste, Bretteur, Claymore, Lame d'Honneur, Sauvageon, Croisé, Rôdeur, Traqueur, Flécheur, Elementaliste, Evocateur, Conjurateur, Arcaniste). Une entrée custom est la fusion `Object.assign({}, SD[nom], custom[nom])` (`main.js:6503-6511`) :
```json
{
  "Duelliste": {
    "arme": "Épée moyenne du serment", "pvN": 6, "epN": 6, "emN": 2, "dmg": 11, "type": "Tranchant",
    "sermLevel": "seasoned", "hidden": false, "evolvesFrom": "Duelliste",
    "lore": "…", "icon": "⚔", "cat": "melee",
    "bA": { "nom": "Branche A — L'Élan Tranchant", "style": "Brutalité", "descPhys": "…", "flavor": "…",
            "paliers": [ { "niv": 2, "nom": "Élan Tranchant", "cout": "6 EM — 1 action", "desc": "…" } ] },
    "bB": { "…": "…" },
    "branches": [ "…" ]
  }
}
```
Le serveur n'impose que « objet ou liste » (`db.js:265-267`) et lit `pvN/epN/emN` pour la progression (`progression.js:22-26`).

### 3.5 Événement (`events[]`)

Écrit par l'éditeur staff (`main.js:15246-15257`) :
```json
{
  "id": "e1727712000000", "nom": "Chasse au Loup", "type": "combat",
  "desc": "…", "date": 1727798400000, "max": 6, "hidden": false,
  "inscrits": ["Alice", "Bob"], "createdBy": "Maitre", "updatedAt": 1727712000000
}
```
- `type` ∈ `combat | exploration | social | evenement | autre` (`EV_TYPES`, `main.js:15013-15019`).
- Alias legacy tolérés en lecture serveur : `hidden` absent → `published === false` (`db.js:488-490`) ; `date` absent → `dateTs` (`db.js:491-494`). L'accueil attend `titre/dateTs/published` (`plan-du-site:164-168`).
- **`inscrits` contient des noms de personnages**, pas des identifiants (`db.js:933-935`) ; les homonymes sont refusés (409 `EVENT_UNAVAILABLE`).
- `max` : entier ≥ 0, `0` = illimité.

### 3.6 Lieu (`lieux[]`) — `main.js:15615-15622`
```json
{ "id": "l1727712000000", "nom": "Havre Blanc", "type": "…", "desc": "…", "notes": "…", "visible": true, "lat": 500, "lng": 800 }
```
Écriture admin uniquement ; lecture publique **sans filtrage** de `visible` ni de `notes`.

### 3.7 Thèmes (`event_themes`, `theme_visibility`)

- `event_themes` : tableau `{ id, name, cls, preview:[bg,accent,gold], desc, event:true, availableUntil, createdAt, visible?, autoGrantAll? }` (`main.js:499-500, 935-940, 4059-4072`). Le serveur accepte un objet legacy `{ [id]: entry }` et le convertit en tableau lors des mutations (`auth.js:224-240`). Exemples embarqués : `easter` « Printemps Éveillé » (`availableUntil: 1777593600000`), `halloween` « Nuit des Âmes » (`1793577600000`), `noel` « Veillée Hivernale » (`1799193600000`), `bloodmoon` « Lune de Sang » (`0`).
- Thèmes de base codés en dur : `dark` « Nuages Polaires », `light` « Brume Claire », `violet` « Galactique », `green` « Sylvan », `aquaris` « Aquaris » (`main.js:491-497`). Rareté/catégorie canoniques (`main.js:512-521`) : Base, Rares, Événement/Saisonnier, Fondateur.
- `theme_visibility` : `{ "violet": true, "halloween": false }` ; clés normalisées (`db.js:334-339`, `auth.js:1035-1042`). `dark` et `light` sont toujours accordés côté client (`ALWAYS_GRANTED_THEME_IDS`, `main.js:932`).

### 3.8 Laboratoire d'apparitions (`spawn_lab_staff`) — `main.js:13873-13913`, `db.js:328-333`
```json
{
  "schemaVersion": 2, "lastDbSyncAt": 1727712000000,
  "totals": { "b_loup": 12 }, "lastRuns": [ "…max 24…" ],
  "totalDraws": 57, "lastGeneratedAt": 1727712000000, "lastGeneratedBy": "Maitre",
  "customZones": ["[🌳]-forêt-aux-lianes", "[🌳]-forêt-aux-arbres-sombres", "[🌳]-arbre-géant", "[🌳]-forêt-centre", "[🌳]-lisière-du-canyon"]
}
```
Constantes de pondération : `_spawnLabCumulativeCoef 0.22`, `_spawnLabCatchupCoef 0.14`, `_spawnLabSameEncounterCoef 0.95` (`main.js:13861-13863`) ; zones max 80.

### 3.9 Journal système staff (`np_syslog`, `np_syslog_archive`) — `main.js:1156-1189`
```json
{ "ts": 1727712000000, "action": "liaison", "detail": "Compte 'Ashaii' lié au personnage 'Alice'", "actor": "Admin" }
```
Actions rencontrées : `connexion`, `liaison`, `deliaison`, `compte_supprime`, `mdp_reset`, `history_delete`, `event_cree`, `event_modif`, `event_visibilite`, `event_supprime`, `event_notif`. Seuls `admin`/`mj` écrivent (`main.js:1159`). Archive :
```json
{ "archivedAt": 1727712000000, "label": "Archive du 30/09/2026 14:02", "filename": "archive-2026-09-30_14h02",
  "entries": [ { "ts": 0, "action": "…", "detail": "…", "actor": "…", "target": "Alice (Mizu)", "src": "syslog|history" } ] }
```
`archiveSysLog` vide aussi `history` de **tous** les personnages après archivage (`main.js:1195-1196`).

### 3.10 Archives de combat (3 familles de clés)

État de combat (`combatBlankState`, `main.js:10982`) :
```json
{ "active": false, "round": 1, "initiative": 0, "fighters": [], "log": [], "id": "c1727712000000", "name": "", "order": [], "turn": 0, "phase": "idle", "_new": true, "notes": "", "_iv": {}, "decl": {}, "pendingDrops": [] }
```
Archive complète = état + `savedAt`, `_owner`, `_autosaveAt`, `_autosaveReason` (`'autosave'|…`), `_manualSaved`, `_inProgress`, `_draft`, `label?`, `entries?` (`main.js:11006-11013`). Combattants : `{ type:"player", pid, name, classe, level, … }` ou `{ type:"beast", bid, name, level, pvCur, … }` (`main.js:12410, 12434`), max 80 par archive, `log`/`entries` max 1 200 (`main.js:816-824`).

Métadonnée d'index (`_stub: true`, `auth.js:504-524`, `main.js:11079-11100`) :
```json
{ "id": "c1727712000000", "name": "Chasse", "label": "", "savedAt": 1727712000000, "round": 3, "phase": "idle", "active": false,
  "fighters": [ "…≤80…" ], "_owner": "Maitre", "_manualSaved": true, "_autosaveAt": 0, "_autosaveReason": "", "_inProgress": false, "_draft": false, "_new": false, "_stub": true }
```
- **Propriétaire** (`owner`) : chaîne dérivée de `CU.pseudo` puis `CU.name` (`main.js:11053-11063`) ; côté serveur, un joueur possède les clés dont l'owner ∈ {`sub` (id compte), `pseudo`, `name` du JWT, nom du personnage lié} (`db.js:125-137, 188-207`). Un admin voit dans son bundle les archives de tous les pseudos admin/MJ (`auth.js:574-579`).
- Séquence d'écriture client (`main.js:11270-11295`) : résolution des révisions (liste, index, chaque `rec`) → écriture de chaque `combat_arc_rec_<owner>__<id>` manquant/modifié → liste de compatibilité `combat_arc_<owner>` (**50 premiers**) → index `combat_arc_idx_<owner>`. Une liste legacy sans index est « promue » automatiquement (`main.js:11126-11138`).
- `get_public_bundle` compte les créatures tuées : archives `rec` + listes legacy des owners sans index/rec ; une créature est « tuée » si `type === "beast"` et `pvCur ≤ 0` dans une archive `phase idle`, non `active/_draft/_inProgress` (`db.js:703-712, 810-834`).

### 3.11 Personnage du prototype RPG (`rpg_characters[]`) — `db.js:347-380` (dérive)
```json
{ "id": "rpg_<accountId>", "ownerId": "<accountId>", "ownerPid": "p_alice", "ownerPseudo": "Alice", "schemaVersion": 4,
  "sourcePlayerId": "p_alice", "created": true, "name": "Alice", "oath": "Duelliste", "level": 1, "xp": 0, "gold": 45,
  "loc": "camp", "spawn": "camp", "hp": 30, "maxHp": 30, "energy": 50, "maxEnergy": 50, "mana": 20, "maxMana": 20, "reputation": 0,
  "inv": { "potion": 2, "baies": 1 }, "equip": { "weapon": null, "armor": null, "trinket": null }, "combat": null, "result": null,
  "visited": { "camp": true }, "flags": { "firstMove": false }, "log": [ "…≤12×240…" ], "updatedAt": 1727712000000 }
```
Version = `md5(JSON canonique du personnage)` (`db.js:590-592`), indépendante des autres propriétaires ; CAS sur la collection entière avec 6 tentatives (`db.js:596-614`). Monde, ennemis, objets et « joueurs fictifs » sont codés dans `rpg-prototype.js:10-22`. **À supprimer dans l'overhaul** (objectif « compagnon de jeu »).

---

## 4. Authentification (`auth.js`)

### 4.1 Cookie et JWT

- Cookie : `np_session=<jwt>; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000; Path=/` (30 jours, `auth.js:134-141`) ; effacement par `Max-Age=0`. Lecture par regex sur l'en-tête `Cookie` (`auth.js:142-146`).
- JWT maison HS256 (`auth.js:104-132`) : header `{"alg":"HS256","typ":"JWT"}`, signature HMAC-SHA256 base64url, comparaison `timingSafeEqual`. **`iat` et `exp` sont en millisecondes** (non standard) ; un token est refusé si `Date.now() >= exp`.
- Claims (`makeSessionPayload`, `auth.js:463-474`) :
```json
{ "sub": "<account.id>", "name": "<pseudo>", "role": "joueur", "pid": "p_alice", "sessionVersion": 3, "forcePasswordReset": false, "iat": 1727712000000, "exp": 1730304000000 }
```
  `exp` = `iat + 30 j`, ou `min(resetExpiresAt, iat + 1 h)` en session de réinitialisation.
- Chaque appel authentifié recharge `accounts`, retrouve le compte par `sub`, vérifie `sessionVersion` identique, et refuse toute session en `forcePasswordReset` sauf pour `verify`, `logout`, `complete_forced_reset` (`getCallerAccount(event, allowForcedReset)`, `auth.js:484-498`). `db.js:646-667` applique la même règle (aucune tolérance de reset) et construit `caller = { sub, pid, role, pseudo, name }`.
- Révocation : `revokeSessions(account)` incrémente `sessionVersion` (`auth.js:452-454`) lors de : logout, changement de mot de passe (self/admin/forcé), reset admin, bootstrap/récupération.
- Le client ne lit jamais le cookie ; il garde un flag UX `localStorage.np_session_flag` (`main.js:2202-2207`). La case « Se souvenir » (`login-remember`, `main.js:2326-2328`) **ne change pas la durée du cookie** (toujours 30 jours) : `toggleSession` annonce « tu resteras connecté 30 jours » à tort comme un choix.

### 4.2 Mots de passe

- Client : `hashPass` = SHA-256 WebCrypto → `"sha256:" + hex` (`main.js:171-177`) ; format vérifié serveur `^sha256:[a-f0-9]{64}$` (`auth.js:193`). Longueur minimale imposée **seulement côté client** : 4 caractères (`main.js:2135, 3177, 5332`).
- Serveur : PBKDF2 `sha512`, 100 000 itérations, clé 64 octets, sel 32 octets aléatoires hex ; entrée = hex SHA-256 sans préfixe (`auth.js:148-179`). Conséquence : la valeur `sha256:…` **est** le secret d'authentification (pass-the-hash possible si elle fuit).
- Mot de passe temporaire admin : 24 octets aléatoires base64url (32 caractères), stocké `pbkdf2(sha256(temp))`, jamais journalisé (`auth.js:817-819`, test `test-auth-security.js:119-132`).

### 4.3 Limitation de tentatives

- Mémoire par instance : 10 tentatives / 15 min par IP (`auth.js:87-102`).
- Persistante dans `np_rate_auth` (`auth.js:429-446`) : compteurs `ip:<ip>`, `login:<pseudo minuscule>`, `register:<pseudo minuscule>`, 10 / 15 min chacun, nettoyage des entrées expirées à chaque mutation. Format : `{ "ip:1.2.3.4": { "count": 3, "first": 1727712000000 } }`.
- Un **admin** avec le bon mot de passe traverse la limite (compteurs réinitialisés, `auth.js:643-652`). Refus : 429 « Trop de tentatives. Réessaie dans 15 minutes. » + audit `login_rate_limited` / `register_rate_limited`. Succès → compteurs remis à zéro.

### 4.4 Flux

**Inscription** (`register`, `auth.js:727-758`) : validation pseudo/hash → rate-limit → `ensureBootstrapAdmin` → unicité pseudo (409 « Ce pseudo est déjà pris. ») → création du compte joueur non lié → audit `register_success` → **201** + cookie + `{ ok, role:"joueur", pid:null, name, forcePasswordReset:false }`. Le client recharge ensuite `session_bundle` et affiche l'état « compte en attente de liaison » (`main.js:2165-2179`).

**Connexion** (`login`, `auth.js:635-679`) : validation → bootstrap admin → recherche insensible à la casse → rate-limit → 401 générique « Identifiant ou mot de passe incorrect » (délai 200 ms si compte inconnu) → migration PBKDF2 si nécessaire → `lastSeen` → audit `login_success` → 200 + cookie + `{ ok, role, pid, name, forcePasswordReset }`. Le client enchaîne `get_public_bundle` + `session_bundle`, construit `CU` (`main.js:2333-2359`), appelle `touch_last_seen` et écrit `sysLog("connexion")`.

**Reprise de session** (`verify`, `auth.js:681-689`) : accepte les sessions de reset ; renouvelle le cookie et `lastSeen` ; 401 + cookie effacé sinon. Le client (`_tryAutoLogin`, `main.js:2210-2262`) bascule sur l'écran `s-reset` si `forcePasswordReset`.

**Déconnexion** (`logout`, `auth.js:718-725`) : révoque `sessionVersion` si la session est valide, efface le cookie, **toujours 200**. Le client purge caches et `localStorage` privés puis recharge la page (`main.js:5247-5322`).

**Changement de mot de passe** (`self_change_password`) : `currentPassHash` + `newPassHash` → 403 « Mot de passe actuel incorrect » → PBKDF2 → `finishPasswordReset` (révocation) → nouveau cookie.

**Réinitialisation par l'admin** (`admin_reset_password`) → `{ ok, temporaryPassword, expiresAt }` (1 h) ; le compte passe en `forcePasswordReset`, ses sessions sont révoquées ; le titulaire se connecte avec le code, obtient une session restreinte (`exp ≤ 1 h`), et doit appeler `complete_forced_reset` (`newPassHash`) ; 403 « Aucune réinitialisation autorisée » si la session n'est pas une session de reset valide ; ensuite le code temporaire est invalide.

**Suppression de son compte** (`self_delete_account`) : mot de passe requis, admin refusé (403 « Le compte administrateur ne peut pas être supprimé. »), compte + personnage lié supprimés en **une seule instruction SQL** verrouillant `accounts` et `players` et vérifiant les deux instantanés bruts (`auth.js:387-421`) ; 409 « Les données ont changé. Recharge la page puis réessaie. » en cas de course.

**Bootstrap / récupération admin** (`ensureBootstrapAdmin`, `auth.js:345-385`, exécuté à chaque `login`/`register`) : si `NP_ADMIN_PSEUDO`+`NP_ADMIN_PASSWORD` définis et (aucun admin, ou `NP_ADMIN_RECOVERY=true` non encore consommé pour ce couple) → le compte du pseudo est promu `admin` avec mot de passe temporaire, `forcePasswordReset`, expiration 1 h, sessions révoquées ; sinon compte admin créé. Empreinte consommée = `sha256(pseudo minuscule + "\0" + mot de passe)` écrite dans `np_admin_recovery_consumed`.

### 4.5 Table exhaustive des actions `auth`

Toutes : `POST`, corps `{ "action": "<nom>", … }`. « Session » = cookie valide non-reset sauf mention. Codes d'erreur communs : 400 « Action inconnue », 401 « Non authentifié », 403 « Admin uniquement », 404 « Compte introuvable », 409 `{ ok:false, error, conflict:true }`, 503 offline, 500 « Erreur interne ».

| Action | Entrée | Rôle | Sortie 200 | Erreurs spécifiques | Source |
|---|---|---|---|---|---|
| `login` | `pseudo`, `passHash` | public | `{ok, role, pid, name, forcePasswordReset}` + cookie | 400 « Champs manquants » / « Format invalide » ; 401 ; 429 | 635-679 |
| `register` | `pseudo`, `passHash` | public | **201** idem | 400 « Pseudo invalide » / « Format de mot de passe invalide » ; 409 « Ce pseudo est déjà pris. » ; 429 | 727-758 |
| `verify` | — | session (reset acceptée) | idem + cookie renouvelé | 401 + cookie effacé | 681-689 |
| `session_bundle` | — | session | `{ok, role, pid, name, forcePasswordReset, source:"db", versions, data}` (§5.2) | 401 + cookie effacé | 691-716 |
| `logout` | — | tous | `{ok:true}` + cookie effacé | — | 718-725 |
| `touch_last_seen` | — | session | `{ok:true}` | 401 | 760-766 |
| `self_change_password` | `currentPassHash`, `newPassHash` | session | session response | 400 « Paramètres invalides » ; 403 « Mot de passe actuel incorrect » | 768-782 |
| `complete_forced_reset` | `newPassHash` | session de reset | session response | 401 « Session expirée » ; 403 « Aucune réinitialisation autorisée » ; 400 « Mot de passe invalide » | 784-796 |
| `self_delete_account` | `currentPassHash` | session non-admin | `{ok:true}` + cookie effacé | 400 « Mot de passe requis » ; 403 admin / « Mot de passe incorrect » ; 409 | 798-808 |
| `admin_reset_password` | `accountId` | admin | `{ok, temporaryPassword, expiresAt}` | 400 « Compte invalide » ; 404 | 810-826 |
| `admin_set_password` | `accountId`, `newPassHash` | admin | `{ok:true}` | 400 « Mot de passe invalide » ; 404 | 828-842 |
| `admin_delete_account` | `accountId` | admin | `{ok:true}` | 400 « Impossible de supprimer le dernier compte Admin. » ; 404 | 844-858 |
| `admin_link_account` = `admin_set_pid` | `accountId`, `pid` (vide → délie) | admin | `{ok, pid}` | 400 « PID invalide » ; 404 « Compte introuvable » / « Personnage introuvable » | 860-879 |
| `admin_unlink_account` | `accountId` | admin | `{ok:true}` | 404 | 881-892 |
| `admin_set_role` | `accountId`, `role` | admin | `{ok, role}` | 400 « Impossible de changer le rôle du dernier Admin. » ; 404 | 894-910 |
| `self_unlock_theme` | — | — | **toujours 403** « Déblocage direct désactivé. Utilise un thème auto-distribué ou un don admin. » | — | 913-915 |
| `self_set_theme` | `themeId` | session | session response + `{selectedTheme}` | 401 « Connexion requise » ; 404 | 917-929 |
| `admin_grant_theme` | `accountId`, `themeId` | admin | `{ok:true}` | 400 « Ce don est réservé aux joueurs. » ; 404 | 931-948 |
| `admin_grant_theme_all` | `themeId` | admin | `{ok, changed}` | 400 « Thème invalide » | 950-969 |
| `admin_set_theme_autogrant` | `themeId`, `enabled` | admin | `{ok, themeId, autoGrantAll}` | 400 | 971-982 |
| `admin_revoke_theme` | `accountId`, `themeId` (**non normalisé**) | admin | `{ok:true}` ; remet `selectedTheme` à `dark` si révoqué | 400 ; 404 | 984-999 |
| `admin_block_theme` / `admin_unblock_theme` | `accountId`, `themeId` | admin | `{ok, blocked}` | 400 ; 404 | 1003-1026 |
| `admin_set_theme_visibility` | `themeId`, `visible` | admin | `{ok, themeId, visible, themeVisibility, eventThemes}` ; écrit `theme_visibility` **et** `event_themes[id].{visible, event:true}` | 400 | 1028-1050 |
| `admin_get_audit_log` | — | admin | `{ok, logs:[…]}` | 403 | 1052-1057 |
| `admin_health` | — | admin | `{ok, at, env:{databaseConfigured, jwtConfigured, siteUrlConfigured, siteOrigin, adminBootstrapConfigured, adminRecoveryEnabled, netlifyContext, deployId}, db:{configured, table:"np_store", reachable}, auth:{session, accountId, role, admins}}` | 403 | 1059-1084 |

Chaque écriture sur `accounts` passe par `saveAccounts` → `createRecordStore.save` (§7.1) et peut donc renvoyer 409 « Les accès ont changé. Reconnecte-toi puis réessaie. » ou « Ce pseudo est déjà pris. » ou « Impossible de supprimer le dernier compte Admin. ».

---

## 5. Base de données (`db.js`)

### 5.1 Matrice de permissions

Lecture (`canRead`, `db.js:156-166`, complétée par `canReadResolved` pour le nom du personnage lié) :

| Clé | Public | Joueur (sans pid) | Joueur (avec pid) | Designer | MJ | Admin |
|---|---|---|---|---|---|---|
| `beasts`, `events` | filtré | filtré | filtré | complet | complet | complet |
| `serments_custom`, `lieux`, `event_themes`, `theme_visibility`, `theme_catalog`, `serment_catalog`, `page_content` | oui | oui | oui | oui | oui | oui |
| `accounts` | non | le sien | le sien | le sien | le sien | tous |
| `players` | non | **401** | le sien | 401 (sans pid) / le sien | tous | tous |
| `spawn_lab_staff` | non | non | non | oui | oui | oui |
| `np_syslog` | non | non | non | non | oui | oui |
| `np_syslog_archive`, `np_audit_log` | non | non | non | non | non | oui |
| `combat_arc_*` | non | ses clés | ses clés (+ nom du perso) | non | toutes | toutes |
| autre clé | 401 | 401 | 401 | 401 | 401 | 401 |

Les refus de lecture renvoient **401 « Authentification requise »** même pour un appelant authentifié (devrait être 403).

Écriture générique (`canWrite`, `db.js:89-103, 167-176`) :

| Rôle | Clés exactes | Préfixes |
|---|---|---|
| admin | `players, beasts, serments_custom, events, np_syslog, np_syslog_archive, lieux, event_themes, theme_visibility, theme_catalog, serment_catalog, page_content, spawn_lab_staff` | `combat_arc_` |
| mj | `players, events, beasts, np_syslog, spawn_lab_staff` | `combat_arc_` |
| designer | `beasts, serments_custom, events, event_themes, theme_catalog, serment_catalog, page_content, spawn_lab_staff` | — |
| joueur | — | `combat_arc_*` dont il est propriétaire |

`accounts` n'est **jamais** inscriptible en générique. `delete` refuse `CRITICAL_COLLECTION_KEYS` (`accounts, players, beasts, serments_custom, events, lieux, event_themes, theme_visibility, theme_catalog, serment_catalog, page_content, spawn_lab_staff, np_syslog, np_syslog_archive`) : seules les clés `combat_arc_*` sont supprimables. Clés bloquées client : `np_audit_log`, `np_rate_auth`, `themes_admin_store`. Longueur de clé ≤ 180.

### 5.2 Bundles

**`get_public_bundle`** (`db.js:770-845`, sans session requise) → `{ ok, data, versions, source:"db", warnings:[{key,error}] }` avec `data` = toutes les clés de `PUBLIC_KEYS` présentes (filtrées si non-staff) + `public_stats` :
```
players          = players.length
linkedPlayers    = max(#accounts avec pid, players.length)
activeWeek       = #accounts avec lastSeen > now − 7 j
totalGemmes      = max( Σ inventory[category="Gemme"].qty , #history[type="gemme"] )
creatureKills    = Σ créatures (type "beast", pvCur ≤ 0) des archives idle/non-brouillon
```
`versions` = md5 par clé publique. Le client met en cache `np_<clé>` en `localStorage` pour `beasts, serments_custom, events, event_themes, theme_visibility, lieux, public_stats` (`main.js:1313, 1257`) et invalide via `np_cache_version = "np_v9_private_cache"` (`main.js:1237`).

**`session_bundle`** (`auth.js:530-614`, session requise) → `{ ok, role, pid, name, forcePasswordReset, source:"db", versions, data }` avec :
- `data.accounts` : admin → tous (sans `pass`) ; joueur → le sien (sans `pass`) ; MJ/designer → `[]`.
- `data.players` : admin/MJ → tous (normalisés progression) ; joueur → le sien ; designer → `[]`.
- `data.beasts` : staff → complet ; joueur → absent.
- `data.themeVisibility` : objet (toujours).
- `data.spawn_lab_staff` : staff → objet ; joueur → absent.
- `data.combatArchivesByOwner` / `data.combatArchiveIndexByOwner` : `{ [owner]: [...] }` pour les owners autorisés (admin : pseudos admin/MJ ; autres : pseudo, id, nom du perso lié). Index reconstruit depuis la liste legacy si vide.
- `versions` : `accounts`, `players`, `theme_visibility`, (+ `beasts`, `spawn_lab_staff` staff), `combat_arc_idx_<owner>`, `combat_arc_<owner>`.
- `serments_custom` est lu pour normaliser mais **n'est pas renvoyé** (le client le tient du bundle public).

**`get_all`** (`db.js:854-873`, staff) → `{ data, versions, source:"db" }` : toutes les lignes que `canRead` autorise, filtrées (donc pour l'admin : accounts sans secrets, players normalisés, toutes les archives, `np_syslog`, `np_syslog_archive`, `np_audit_log`, `spawn_lab_staff`, clés publiques). Utilisé par le client après retour en ligne (`main.js:4472`).

### 5.3 Sanitisation et bornes (`db.js:81-87, 208-346`)

- `MAX_VALUE_SIZE` 4 MiB par valeur, `MAX_ARRAY_ITEMS` 5 000, `MAX_OBJECT_KEYS` 5 000, `MAX_STRING_LENGTH` 25 000, `MAX_IMAGE_DATA_URL_LENGTH` 350 000, `MAX_DEPTH` 24.
- `sanitizeText` : suppression des caractères de contrôle, `\r\n → \n`, suppression des blocs `<script>` et des `javascript:` ; les data-URL image sûres sont conservées telles quelles.
- `sanitizeDeep` : nombres non finis → `null`, clés `__proto__/prototype/constructor` ignorées, autres types → `null`.
- `enforceShape` : `accounts/players/beasts/np_syslog_archive` = liste ; `theme_visibility/page_content/spawn_lab_staff` = objet ; `theme_catalog/serment_catalog/event_themes/serments_custom/events/lieux/np_syslog` = objet ou liste ; `combat_arc_rec_*` = objet ; autres `combat_arc_*` = liste.
- `normalizeStoreValue` : voir §3 ; troncatures `np_syslog` 500, `np_syslog_archive` 50, `combat_arc_idx_` 5 000, `combat_arc_` 500.

### 5.4 Contrôle de version (`expectedVersion`)

- Présence obligatoire pour `set`, `delete`, `patch_own_player`, `consume_own_item`, `dismiss_notifications`, `set_event_participation`, `rpg_save_character` ; valeur `null` (clé absente) ou 32 hex (`db.js:462-465`). Absent → **428** `{ ok:false, code:"VERSION_REQUIRED", error:"Recharge les données avant de les modifier (version attendue requise)." }`.
- Vérification **dans la requête SQL** (`compareAndSetStore`, `db.js:571-587`) : `null` → `INSERT … ON CONFLICT DO NOTHING`, sinon `UPDATE … WHERE md5(value::text) = $expected`. Zéro ligne → **409** `{ ok:false, code:"VERSION_CONFLICT", key, error:"Ces données ont été modifiées par une autre session. Recharge-les avant de réessayer." }`.
- Réponse d'écriture : `{ ok:true, key, value (filtré pour l'appelant), version, updatedAt }`.
- Côté client (`_enqueueDbMutation`, `main.js:1512-1552`) : file d'écriture **par clé**, chaînage de la version confirmée précédente, mémorisation dans `_dbVersions`, aucune relance automatique après conflit ; message « Une modification plus récente existe. Copie ton travail puis recharge la page avant de réessayer. ».

### 5.5 Table exhaustive des actions `db`

| Action | Entrée | Rôle | Sortie 200 | Erreurs | Source |
|---|---|---|---|---|---|
| `ping` | — | public | `{ok:true, source:"db", now}` | — | 736-738 |
| `get` | `key` | selon §5.1 | `{value, key, version}` (`value:null` si absente) | 400 « key requis » ; 401 | 762-768 |
| `get_public_bundle` | — | public | §5.2 | — | 770-845 |
| `get_audit_log` | — | admin | `{logs}` | 403 « Admin uniquement » | 847-852 |
| `get_all` | — | staff | §5.2 | 403 « Action non autorisée » | 854-873 |
| `rpg_get_character` | — | session | `{ok, character\|null, version\|null}` | 401 | 740-745 |
| `rpg_save_character` | `character`, `expectedVersion` | session | `{ok, character, version}` | 428 ; 400 « Personnage RPG invalide » ; 409 | 747-760 |
| `consume_own_item` | `itemId`, `note?` (≤ 2 000), `expectedVersion` (de `players`) | joueur lié | `{ok, key:"players", value:[perso filtré], version, updatedAt}` | 403 « Aucun personnage lié. » ; 400 « Paramètres non autorisés pour cette action. » / « Item ou note invalide (2 000 caractères maximum). » ; 404 « Personnage introuvable. » / « Item introuvable dans ton inventaire. » ; 409 `ITEM_UNAVAILABLE` « Cet item n'est plus disponible. » ; 409 `VERSION_CONFLICT` | 877-958 |
| `dismiss_notifications` | `timestamp` **ou** `all:true`, `expectedVersion` | joueur lié | idem | 400 « Choisis une notification ou toutes les notifications. » ; 404 « Notification introuvable. » | idem |
| `set_event_participation` | `eventId`, `participating` (bool), `expectedVersion` (de `events`) | joueur lié | `{ok, key:"events", value:[events filtrés], version, updatedAt}` | 400 « Événement ou participation invalide. » / « Ton personnage doit avoir un nom pour participer. » ; 404 « Événement introuvable. » (aussi si masqué à l'inscription) ; 409 `EVENT_UNAVAILABLE` (homonymes, liste ou capacité malformée), `EVENT_CLOSED` « Les inscriptions à cet événement sont fermées. » (date absente ou passée), `EVENT_FULL` « Événement complet. » | idem |
| `set` | `key`, `value`, `expectedVersion` | §5.1 | `{ok, key, value, version, updatedAt}` | 400 « key et value requis » / message de validation ; 403 « Permission refusée » ou message MJ ; 428 ; 409 | 960-1000 |
| `patch_own_player` | `patch:{journal?, avatar?}`, `expectedVersion` | joueur lié | `{ok, key:"players", value:[son perso], version, updatedAt}` | 403 « Aucun personnage lié. » ; 400 « Seuls le journal et l'avatar peuvent être modifiés. » / « Journal invalide ou trop long. » / avatar ; 404 ; 409 | 1002-1029 |
| `delete` | `key`, `expectedVersion` | §5.1 (archives seulement) | `{ok, key, value:null, version:null}` | 403 « Permission refusée » ; 428 ; 409 | 1031-1045 |
| autre | — | — | — | 400 « action inconnue » (401 « Non authentifié » d'abord si pas de session) | 875, 1047 |

Les trois actions joueur refusent tout champ non listé (`hasOnlyActionFields`, `db.js:478-480`) et dérivent le personnage de la session ; les identifiants doivent respecter `validActionId` (≤ 180, sans espace en bordure ni caractère de contrôle).

---

## 6. Journal d'audit (`np_audit_log`)

Deux producteurs, un même tableau **plus récent en tête, plafonné à 1 000** :
- `auth.js:286-304` via `mutateJsonStore` : `{ ts, actorId, actorPseudo, actorRole, action, ip, details }`.
- `db.js:615-645` via un upsert SQL unique : `{ ts, source:"db", action, actorId, actorPseudo, actorRole, ip, origin, ua (≤240), details }`.

Actions auditées — auth : `login_rate_limited`, `register_rate_limited`, `login_failed`, `login_success`, `register_success`, `self_change_password`, `complete_forced_reset`, `admin_reset_password`, `admin_set_password`, `admin_delete_account`, `admin_link_account`, `admin_unlink_account`, `admin_set_role`, `self_set_theme`, `admin_grant_theme`, `admin_grant_theme_all`, `admin_set_theme_autogrant`, `admin_revoke_theme`, `admin_block_theme`, `admin_unblock_theme`, `admin_set_theme_visibility`. Non auditées : `logout`, `self_delete_account`, `verify`, `touch_last_seen`, `session_bundle`.
Actions auditées — db : `rpg_save_character`, `consume_own_item`, `dismiss_notifications`, `set_event_participation`, `db_set` (`details.summary` = `{kind, length, sampleIds}` ou `{kind, keys, keyCount}`), `db_set_denied`, `db_set_rejected`, `db_patch_own_player`, `db_delete`, `db_delete_denied`.

Consommation UI : onglet « Historiques » de l'administration (`loadAuditLogAdmin`, `main.js:4627-4647`, libellé « journal de sécurité »).

---

## 7. Concurrence et intégrité

### 7.1 `createRecordStore` (comptes et personnages, `auth-store.js:34-136`)

- `load(versions)` : lit la ligne, normalise, mémorise un instantané normalisé et l'instantané **brut** (WeakMap par tableau).
- `save(records, source)` : jusqu'à 5 tentatives : relit la base, fusionne **champ par champ** (base = dernier état en base, delta = différence entre instantané et proposition) ; `lastSeen` fusionné par `max` ; conflit (409) si le même champ a changé des deux côtés, si un enregistrement supprimé a changé entre-temps, si un id ajouté existe déjà ; pour `accounts` (`protectAccounts`) : conflit « Les accès ont changé. Reconnecte-toi puis réessaie. » si un des `SECURITY_FIELDS` (`pass, role, pid, sessionVersion, forcePasswordReset, resetExpiresAt`) de l'appelant (`guard`) ou d'un enregistrement modifié a changé ; unicité de pseudo ; dernier admin. Écriture par CAS d'égalité JSONB. Références des objets appelants rafraîchies en place.
- `snapshot(records)` renvoie l'instantané brut (utilisé par la suppression atomique).

### 7.2 `mutateJsonStore` (`auth-store.js:21-32`)
8 tentatives lire → muter → CAS ; sert à `np_audit_log`, `np_rate_auth`, `event_themes`, `theme_visibility` côté auth.

### 7.3 Suppression atomique compte + personnage
`auth.js:401-415` : `WITH locked AS MATERIALIZED (SELECT … FOR UPDATE)`, condition d'égalité sur les deux valeurs brutes, `UPDATE … CASE WHEN key = 'accounts' … ELSE …` ; 409 si `accounts` non renvoyé.

### 7.4 Limites reconnues
PGlite (tests) n'a qu'une connexion : la concurrence Neon réelle n'est pas reproduite (`docs/security-and-data.md:69`). Le rate-limit mémoire est par instance Lambda.

---

## 8. Couche client (résumé du contrat)

- `_jsonPost(url, payload, opts)` (`main.js:534-556`) : `fetch` POST JSON, `credentials:'same-origin'`, ajoute `status`, force `ok:false` si HTTP ≥ 400, `console.warn` sauf `silent`. Toute réponse est liée à `_dbSessionGeneration` (compteur incrémenté à chaque login/logout) et rejetée avec `SESSION_CHANGED` si la session a changé (`main.js:526-533`).
- `_authCall` / `_dbCall` (`main.js:572-601`) : enveloppes ; `_dbCall` mémorise `version`/`versions` dans `_dbVersions` et met en cache `get`.
- `api-hardening.js` (v274) enveloppe `fetch`, `_dbCall`, `_authCall`, `_jsonPost` ; sur HTTP ≥ 500/503 ou réseau : bannière « DB indisponible — HTTP 503. Le site reste ouvert, mais certaines données peuvent ne pas se sauvegarder. » ; ping périodique (`ping`, et `verify` seulement si une zone privée est visible) ; événement `np:api-status` ; rejet silencieux des erreurs d'une session périmée.
- `sv(key, value)` (`main.js:1561-1580`) : `accounts` → refus local « Les comptes se modifient uniquement via les actions de gestion dédiées. » ; `theme_visibility` → **local seulement** ; clés `_isDbBackedKey` (`accounts, players, beasts, serments_custom, events, lieux, event_themes, theme_visibility, np_syslog, np_syslog_archive, spawn_lab_staff, combat_arc_*`) → `set` ; autres → « Cette donnée ne dispose pas de sauvegarde serveur. ».
- Clés privées jamais persistées en `localStorage` et purgées au démarrage/logout : `accounts, players, spawn_lab_staff, np_syslog*, np_audit_log, combat_arc_*` (sauf anciennes copies `np_combat_arc_*` **mises en quarantaine** pour récupération manuelle, `main.js:1342-1464`).
- `localStorage` restant : `np_<clé publique>`, `np_cache_version`, `np_theme`, `np_theme_visibility`, `np_session_flag`, `np_spawn_lab_ui_v2`, `np_rpg_guest_v2`, `np_last_app_tab`.
- Matrice UI `can()` (`main.js:1915-1925`) : admin `manage_players, manage_mjs, manage_beasts, manage_items, manage_xp, manage_stats, adjust_levels, delete_player, delete_beast` ; mj `manage_items, manage_xp, manage_players` ; designer `manage_beasts, delete_beast` ; joueur rien.
- Objet `CU` (`main.js:2342-2354`) : `{ type:"player"|"staff", role, pid, name, pseudo, pending? }` ; pour un staff sans `pid`, `pid` = **premier personnage de la liste** (`main.js:2242, 2352`).
- Import/export JSON de l'admin : partiel (`players, beasts, serments_custom` ; comptes ignorés, `main.js:10875-10900`).

---

## 9. Sauvegardes (`scripts/`)

- `npm run backup:store -- --output <nouveau fichier>` : source `NP_BACKUP_SOURCE_URL` uniquement (URL `postgres(ql):` avec hôte, utilisateur et base) ; transaction `RepeatableRead` lecture seule ; vérifie schéma/RLS ; lit `key, value, updated_at` en **texte** (parsers OID 3802/1184 neutralisés pour préserver grands nombres et microsecondes) ; fichier `0600`, répertoires `0700`, refus si le fichier existe.
- Format `np-store-backup-v1` : `{ format, exportedAt (ISO ms), valueEncoding:"postgresql-jsonb-text", count, rows:[{key, value:"<jsonb text>", updated_at:"<pg text>"|null}] triés par clé, sha256 }` ; empreinte = SHA-256 du JSON canonique (clés triées) sans `sha256`.
- `npm run backup:verify -- --input <fichier>` : valide format/empreinte/ordre/unicité, restaure dans PGlite mémoire, relit et compare texte à texte. Codes d'erreur : `SOURCE_REQUIRED, INVALID_SOURCE, OUTPUT_REQUIRED, OUTPUT_EXISTS, INVALID_ARGUMENTS, UNEXPECTED_STORE_TABLE, UNEXPECTED_STORE_SCHEMA, INVALID_SOURCE_RESULT, UNREADABLE_BACKUP, INVALID_FORMAT, INVALID_ROWS, INVALID_ROW, DUPLICATE_KEY, INVALID_JSONB, COUNT_MISMATCH, INVALID_ROW_ORDER, CHECKSUM_MISMATCH, RESTORE_COUNT_MISMATCH, RESTORE_CONTENT_MISMATCH`.
- Snapshot réel du 21/09/2026 : 84 lignes, SHA-256 `900e2f78…67d4`, hors dépôt (`infrastructure-review:28-34`). Rétention Neon/Netlify native **non vérifiée** (API 400).

---

## 10. Fixtures et tests utiles à la reprise

`scripts/helpers/local-app.js` seed : comptes `admin` (pid `p_admin`), `alice` (`p_alice`), `bob` (`p_bob`), `mj` (sans pid), `designer` (sans pid), mots de passe `sha256:` ; 3 personnages `Mizu` niveau 1 ; `beasts` (dont un `hidden` avec `adminNote`), `events:[]`, `lieux:[]`, `serments_custom:{}`, `event_themes:[]`, `theme_visibility:{}`, `spawn_lab_staff:{schemaVersion:2}`, `np_rate_auth:{}`, `themes_admin_store`, `np_admin_recovery_consumed`. Les handlers sont chargés dans un `vm` avec `neon()` remplacé par PGlite ; `signToken`/`makeSessionPayload` exportés pour fabriquer des cookies.

Comportements verrouillés par les tests (à conserver comme exigences) : `test-auth-security.js` (sessionVersion implicite 0, reset admin aléatoire ≤ 1 h, session de reset restreinte, logout révoque, fusion de comptes concurrente, dernier admin), `test-db-security.js` (clés internes invisibles, filtrage public, 428/409, MJ limité, avatars malveillants refusés, archives 3 préfixes, sessions révoquées), `test-integration.js`, `test-player-actions.js` (consommation, notifications, participation, homonymes, capacité), `test-rpg-persistence.js`, `test-store-backup.js`, `test-unified-progression.js`, `test-progression-concurrency.js`.

---

## 11. Incohérences serveur / menus / documentation

1. **`self_unlock_theme`** : le client l'appelle encore (`main.js:3857`) ; le serveur répond toujours 403 (`auth.js:913-915`).
2. **Réinitialisation de mot de passe** : `resetAccountPass` autorise `can('manage_players')` donc un **MJ** (`main.js:5349`), mais `admin_reset_password` est admin-only → 403 tardif.
3. **Bestiaire** : le serveur laisse le **MJ** écrire `beasts` (`db.js:95`) alors que l'UI réserve `manage_beasts` à admin/designer (`main.js:1920-1922`). Inversement le serveur laisse le **designer** écrire `serments_custom`, mais le menu ne lui montre pas l'Atelier serments (`plan-du-site:138, 151`) et `toggleSermVisibility` exige admin (`main.js:6498`).
4. **Journal staff** : un MJ peut écrire `np_syslog` mais pas `np_syslog_archive` ; `archiveSysLog` (`main.js:1165`) échouerait pour un MJ dès la première écriture.
5. **Exposition des comptes** : `session_bundle` retire seulement `pass` (`auth.js:551-555`) alors que `db.js` retire aussi `sessionVersion` et `resetExpiresAt` (`db.js:668-675`) ; `forcePasswordReset` est visible dans les deux.
6. **`admin_revoke_theme`** compare un `themeId` brut (non normalisé) à des identifiants normalisés (`auth.js:989-994`) : révoquer `theme-violet` ne fait rien.
7. **Clés fantômes** : `theme_catalog`, `serment_catalog`, `page_content` (publiques, inscriptibles) et `themes_admin_store` (bloquée) n'ont **aucun producteur ni consommateur** dans `assets/` ou `index.html`.
8. **Lieux** : `notes` (staff) et `visible:false` sont servis au public (`filterValueForCaller` ne traite que `beasts` et `events`, `db.js:676-683`), tout comme `serments_custom[x].hidden`.
9. **Format d'événement** : éditeur `nom/date/hidden` vs accueil `titre/dateTs/published` (`plan-du-site:164-168`) ; le serveur tolère les deux.
10. **Case « Se souvenir »** sans effet serveur (cookie toujours 30 jours) ; message « Session sauvegardée — tu resteras connecté 30 jours » (`main.js:3199`).
11. **Codes HTTP** : lectures interdites → 401 au lieu de 403 ; `logout` renvoie 200 même sans session ; `get_all` renvoie 403 « Action non autorisée » mais `get` 401.
12. **Troncatures silencieuses** : `history` à 200 à chaque lecture/écriture serveur et client, `np_syslog` à 500 (client empile 2 000), `combat_arc_<owner>` à 50 côté client / 500 serveur.
13. **Identités par nom** : archives de combat par pseudo/nom, `events.inscrits` par nom de personnage ; un renommage orpheline les données (`docs/security-and-data.md:31`).
14. **Rôle `red`** : `normalizeThemeId` serveur mappe `ecarlate/scarlet → red` (`auth.js:203`) alors que le client mappe `red/ecarlate → dark` (`main.js:508`).
15. **`ensureTable` à chaque requête** et lecture de **toute la table** pour le bundle public (`docs/security-and-data.md:71`).
16. **Bootstrap admin** exécuté à chaque `login`/`register`, y compris pour des tentatives échouées.

---

## 12. Questions ouvertes

1. La troncature de l'historique à 200 entrées (serveur `history.slice(-200)`, `db.js:302`, `auth.js:279`) est-elle un choix produit ou une limite technique ? L'archivage (`archiveSysLog`) suppose qu'on copie l'historique complet avant de le vider.
2. Le hachage SHA-256 côté client puis PBKDF2 côté serveur : conserver ce schéma (pass-the-hash) ou passer au hachage serveur du mot de passe brut sous TLS ? Le minimum de 4 caractères est-il assumé ?
3. Faut-il garder les champs `unlockedThemes`/`blockedThemes` **sur le personnage** (lus par `getUnlockedThemes`, `main.js:1106`) ou seulement sur le compte ?
4. Les `lieux` et la carte sont dormants : les `notes` de lieu doivent-elles être privées staff (elles fuient aujourd'hui) ?
5. `theme_catalog` / `serment_catalog` / `page_content` / `themes_admin_store` : intention abandonnée ou fonctionnalité prévue (contenu éditorial en base) ?
6. Propriété des archives de combat : par compte (id) ou par personnage ? Les archives d'un admin doivent-elles rester visibles par tous les admins (comportement actuel `auth.js:574-579`) ?
7. Un staff sans personnage lié « emprunte » le premier personnage comme `pid` d'affichage (`main.js:2352`) — bug ou raccourci voulu ?
8. `NP_SITE_URL` absent en production au 21/09 : l'overhaul doit-il rendre la variable obligatoire (échec de démarrage) plutôt que « toute origine acceptée » ?

---

## 13. Ce qu'il faut absolument préserver dans l'overhaul

- **Le modèle de rôles à quatre valeurs** `joueur / mj / designer / admin` et ses règles fortes : `accounts` jamais modifiable en générique ; MJ ne supprime pas de personnage ni ne touche identité/serment/journal ; designer sans accès aux personnages ; joueur limité à journal/avatar/consommation/notifications/participation sur **son** personnage lié ; protection du dernier admin ; admin non supprimable par lui-même.
- **La liaison compte ↔ personnage par `pid`** décidée par l'admin, avec l'état « compte en attente de liaison » (`pending`) et les libellés associés (« Nouveau compte en attente de liaison ! », « Ton compte n'est pas encore lié à un personnage. Un administrateur doit terminer la liaison avant d'ouvrir la fiche. »).
- **Le cycle de session** : cookie HttpOnly/Secure/SameSite=Strict 30 jours, révocation par `sessionVersion`, session de reset limitée à 1 h et à `verify/complete_forced_reset/logout`, mot de passe temporaire aléatoire affiché une seule fois (« Mot de passe temporaire », « À transmettre au propriétaire du compte. Il devra choisir un nouveau mot de passe à la connexion. »), récupération admin par variables d'environnement consommée une fois.
- **Le contrôle de concurrence optimiste** : version par ressource, `expectedVersion` obligatoire, 428 `VERSION_REQUIRED` / 409 `VERSION_CONFLICT`, prédicat dans l'instruction SQL, aucune relance automatique côté client, messages « Recharge la page… ». Fusion champ-par-champ des comptes et `lastSeen` par max.
- **Les règles métier serveur des actions joueur** : consommation = −1 unité + entrée d'historique échappée ; notifications = masques `notifDeleted` sans suppression d'historique ; participation = visibilité, date future, capacité (`max`, 0 = illimité), refus des homonymes, codes `ITEM_UNAVAILABLE / EVENT_CLOSED / EVENT_FULL / EVENT_UNAVAILABLE`.
- **La progression commune** (`progression.js`) : `xpMax = niveau × 30`, gains `pvN/epN/emN` par serment (`DEFAULT_GROWTH`), bases 30/50/20, migration idempotente `progressionVersion: 1`, gemmes +5/+20/+50 XP (`docs/fusion-xp.md`).
- **Le filtrage public** : créatures `hidden`/`archived` et notes staff (`adminNote(s)`, `noteAdmin`, `staffNote(s)`, `mjNote(s)`) retirées, événements masqués retirés, `public_stats` (formules §5.2), aucune donnée privée en `localStorage`.
- **La validation d'avatar et l'échappement HTML** de l'historique ; les bornes de taille (4 MiB, 5 000 éléments, 25 000 caractères, images 350 000).
- **Le journal d'audit serveur** (actions listées §6, IP, acteur, rôle) et le **journal staff** (`np_syslog`) avec ses actions nommées.
- **Les données** : 13 serments de base + surcharges custom (`pvN/epN/emM/dmg/type/branches/paliers/hidden/icon/cat`), bestiaire avec `zones/tags/qtyMin/qtyMax/spawnWeight/citation/style`, thèmes (identifiants, noms, dates `availableUntil`, rareté/catégorie), zones d'apparition par défaut et coefficients du spawn lab, archives de combat existantes (récupérables via les trois familles de clés) — à **migrer**, pas à recréer.
- **La sauvegarde logique** (`np-store-backup-v1`) et la procédure de vérification isolée : conserver l'outil jusqu'à la migration et produire un snapshot **avant** toute transformation.
- **La stratégie de test** : handlers réels sur PostgreSQL en mémoire, comptes fictifs, scénarios de concurrence et d'isolation de session.

---

## 14. Ce qui relève de la dérive / dette

- **Prototype RPG** : action `rpg_get_character`/`rpg_save_character`, clé `rpg_characters`, `rpg-prototype.js`, `np_rpg_guest_v2` → supprimer (objectif compagnon, pas jeu en ligne).
- **Table unique clé/JSONB** : collections entières réécrites à chaque modification (un MJ qui ajoute un objet renvoie **tous** les personnages), `md5` de la collection comme version, lecture de toute la table pour le bundle public, `CREATE TABLE IF NOT EXISTS` à chaque requête, aucune contrainte relationnelle (`pid` orphelin possible, `inscrits` par nom, owners d'archives par pseudo).
- **Duplication** auth/db (CORS, JWT, SQL, rôles) et **deux implémentations** du journal d'audit ; JWT non standard (`exp` en ms) ; rate-limit mixte mémoire/JSON.
- **Clés mortes** (`theme_catalog`, `serment_catalog`, `page_content`, `themes_admin_store`), action morte (`self_unlock_theme`), alias legacy (`admin_set_pid`, `class`, `dateTs/published/titre`, objets `event_themes`, champs dupliqués du bestiaire `nom/name`, `beh/behavior/comportement`…).
- **Troncatures silencieuses** et caps incohérents (historique 200, syslog 500 vs 2 000, archives 50 vs 500 vs 5 000).
- **Fuites mineures** : `lieux.notes`/`visible`, `serments_custom.hidden`, `forcePasswordReset`/`sessionVersion` dans le bundle de session.
- **Thèmes** : logique dispersée (compte, personnage, `event_themes`, `theme_visibility`, `localStorage`, `_LOCAL_ONLY_KEYS`, patch `ui-patches.js:210-229`), alias divergents client/serveur.
- **Archives de combat** : trois représentations parallèles (liste legacy, index de stubs, enregistrements) avec promotion automatique et quarantaine `localStorage` ; à réduire à une table.
- **Sécurité** : `NP_SITE_URL` optionnel = CORS ouvert, mot de passe minimum 4 caractères côté client seulement, pass-the-hash, `unsafe-inline` en CSP.

---

## 15. Mapping proposé `np_store` → schéma relationnel propre

Principes : une table par entité, identifiants stables (`uuid` ou `text` conservés à la migration), clés étrangères, colonne `revision integer` (ou `updated_at` + `xmin`) par ligne pour le contrôle optimiste **par enregistrement**, `jsonb` résiduel uniquement pour les blocs éditoriaux libres. Toutes les tables : `created_at timestamptz default now()`, `updated_at timestamptz`.

| Table | Colonnes principales | jsonb résiduel | Origine |
|---|---|---|---|
| `accounts` | `id text PK`, `pseudo text UNIQUE (lower)`, `password_hash text`, `role account_role` (enum joueur/mj/designer/admin), `character_id text NULL FK characters`, `session_version int default 0`, `force_password_reset bool`, `reset_expires_at timestamptz NULL`, `selected_theme text FK themes`, `last_seen_at`, `created_at` | — | `accounts[]` |
| `account_theme_grants` | `account_id FK`, `theme_id FK`, `kind` (`unlocked`/`blocked`), `granted_by FK accounts NULL`, PK (`account_id, theme_id, kind`) | — | `unlockedThemes`, `blockedThemes` |
| `characters` | `id text PK`, `name text`, `oath_id text FK oaths` (= `classe`), `branch text`, `level int`, `xp int`, `pv_cur/pv_max/ep_cur/ep_max/em_cur/em_max int`, `weapon text` (= `arme`), `avatar_url text`, `journal text`, `progression_version int`, `revision int` | `equipment jsonb {helmet,chest,legs}`, `statuses jsonb` (ou table `character_statuses`) | `players[]` |
| `character_items` | `id text PK`, `character_id FK`, `name`, `category text` (dont « Gemme »), `qty int check ≥ 0`, `description text` | — | `players[].inventory` |
| `character_history` | `id bigserial PK`, `character_id FK`, `ts timestamptz`, `type text` (xp/gemme/item/level/stat/serment/combat/add/event), `text text` (stocké **brut**, échappé au rendu), `actor text`, `actor_account_id FK NULL` | — | `players[].history` (sans cap 200) |
| `character_notification_dismissals` | `character_id FK`, `history_id FK`, PK (les deux) | — | `players[].notifDeleted` (ts → id) |
| `beasts` | `id text PK`, `name`, `subtitle`, `behavior`, `level int`, `pv int`, `ep int`, `strike text`, `skill text`, `drops text`, `gem text`, `description text`, `image_url`, `style`, `quote`, `hidden bool`, `archived bool`, `qty_min int`, `qty_max int`, `spawn_weight int`, `admin_note text` (jamais servi au public), `revision int` | `tags text[]`, `zones text[]`, `statuses jsonb` | `beasts[]` (dédoublonner les alias) |
| `oaths` | `id text PK` (nom), `weapon`, `pv_growth`, `ep_growth`, `em_growth`, `base_damage`, `damage_type`, `rank` (`sermLevel`), `hidden bool`, `evolves_from FK`, `icon`, `category` (`cat`), `is_builtin bool`, `revision` | `lore text`, `branches jsonb` (bA/bB/paliers) ou tables `oath_branches`/`oath_tiers(level, name, cost, description)` | `SD` (code) + `serments_custom` |
| `events` | `id text PK`, `title` (= `nom`), `type event_type`, `description`, `starts_at timestamptz NULL`, `capacity int` (0 = illimité), `hidden bool`, `created_by FK accounts`, `revision` | — | `events[]` |
| `event_participants` | `event_id FK`, `character_id FK`, `registered_at`, PK (`event_id, character_id`) | — | `events[].inscrits` (noms → ids ; les homonymes doivent être résolus **à la migration**) |
| `places` | `id text PK`, `name`, `type`, `description`, `staff_notes text` (privé), `visible bool`, `lat numeric`, `lng numeric` | — | `lieux[]` |
| `themes` | `id text PK`, `name`, `css_class`, `description`, `is_event bool`, `available_until timestamptz NULL`, `visible bool`, `auto_grant_all bool`, `rarity`, `category`, `is_builtin bool` | `preview jsonb [bg,accent,gold]` | `THEMES_BASE` + `event_themes` + `theme_visibility` |
| `combat_archives` | `id text PK`, `owner_account_id FK accounts` (**plus de pseudo**), `name`, `label`, `saved_at`, `round int`, `phase text`, `active bool`, `manual_saved bool`, `autosave_at`, `autosave_reason`, `in_progress bool`, `draft bool`, `revision` | `state jsonb` (fighters, log, order, notes, decl, pendingDrops…) | `combat_arc_rec_*` + index + listes legacy (dédupliqués par `id`) |
| `staff_log` | `id bigserial`, `ts`, `action text`, `detail text`, `actor_account_id FK NULL`, `actor_name text` | — | `np_syslog` (sans cap) |
| `staff_log_archives` | `id`, `archived_at`, `label`, `filename` | `entries jsonb` (ou vue sur `staff_log` + `character_history` avec `archived_at`) | `np_syslog_archive` |
| `audit_log` | `id bigserial`, `ts`, `source` (auth/db), `action`, `actor_account_id`, `actor_pseudo`, `actor_role`, `ip inet/text`, `origin`, `user_agent` | `details jsonb` | `np_audit_log` |
| `auth_rate_limits` | `scope text` (ip/login/register), `subject text`, `count int`, `window_start timestamptz`, PK (`scope, subject`) — ou remplacer par un service dédié | — | `np_rate_auth` |
| `admin_recovery_consumptions` | `fingerprint text PK`, `pseudo`, `consumed_at` | — | `np_admin_recovery_consumed` |
| `spawn_lab` | ligne unique ou par zone : `zone text PK`, `draw_count int`, `last_generated_at`, `last_generated_by FK` ; `spawn_lab_runs(id, generated_at, actor, zone, payload jsonb)` ; `spawn_zones(name text PK, is_default bool)` | `payload jsonb` des tirages | `spawn_lab_staff` |
| *(supprimé)* | — | — | `rpg_characters`, `themes_admin_store`, `theme_catalog`, `serment_catalog`, `page_content` (à moins de créer une vraie table `pages(slug, body)` pour le contenu éditorial) |

Notes de migration :
- Convertir à partir d'un snapshot `np-store-backup-v1` vérifié ; passer `accounts[].pass` tel quel (les formats `sha256:`/hex seront migrés au prochain login si le schéma de hachage est conservé, sinon forcer un reset).
- Résoudre les propriétaires d'archives : `owner` ∈ {pseudo, id de compte, nom de personnage} → `owner_account_id` ; consigner les orphelins.
- Résoudre `events.inscrits` par nom → `character_id` ; refuser/journaliser les homonymes.
- Remplacer `md5(collection)` par `revision` par ligne ; l'API renvoie `revision` sur chaque ressource et exige `expectedRevision` sur chaque mutation (conserver la sémantique 428/409).
- Conserver `session_version` et `force_password_reset` sur `accounts` ; envisager une table `sessions` seulement si l'on veut lister/révoquer par appareil.
