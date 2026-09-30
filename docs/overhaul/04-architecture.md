# Nuages Polaires — architecture de l'overhaul

Décisions du lead (Claude), 30 septembre 2026, à partir de l'audit (`audit/05-backend-donnees-permissions.md`, `audit/06-tests-comme-specification.md`, `audit/02-personnage-progression-serments.md`) et de la revue de risques de GPT (`audit/gpt-revue-risques-techniques.md`). Ce document est **normatif** pour les agents qui construisent : quand il contredit un fichier d'audit, c'est qu'un choix a été fait ; quand il ne dit rien, l'audit fait foi.

La navigation, les écrans et le lexique sont dans `03-vision.md`. Ce document couvre la structure du code, les données, la sécurité, la concurrence, la migration, les tests et le déploiement.

## 1. Stack et versions

| Couche | Choix | Notes |
|---|---|---|
| Framework | SvelteKit 2.63, Svelte 5.56 (runes obligatoires), TypeScript 6 strict | scaffold déjà à la racine, `vite.config.ts` porte l'adapter |
| Hébergement | Netlify, `@sveltejs/adapter-netlify` 6, fonctions Node 24 (`edge: false`) | `netlify.toml` à la racine : `command = "npm run build"`, `publish = "build"` |
| Base | Neon Postgres, `@neondatabase/serverless` | **pilote WebSocket (`Pool`) + `drizzle-orm/neon-serverless`** pour disposer de vraies transactions (`db.transaction`) ; le pilote HTTP est exclu |
| ORM | Drizzle ORM + drizzle-kit (migrations SQL versionnées dans `drizzle/`) | `casing: 'snake_case'` |
| Dev et tests | `@electric-sql/pglite` + `drizzle-orm/pglite`, en mémoire, **même schéma et mêmes migrations** | sélection par `DATABASE_URL` : vide ou `pglite://memory` → PGlite ; `postgres://…` → Neon |
| Validation | Zod (schémas partagés client/serveur dans `src/lib/schemas/`) | |
| Tests | Vitest (unitaires + intégration sur PGlite), Playwright (parcours sur le build de prod, PGlite en mémoire) | |
| Qualité | ESLint, Prettier, `svelte-check` | `npm run lint && npm run check && npm test` doivent passer avant tout commit |
| CSS | Vanilla, tokens en custom properties, styles scoped Svelte ; pas de framework CSS | polices locales Cormorant Garamond / Manrope / Cinzel reprises de `legacy/assets/fonts/` |

Versions épinglées exactement dans `package.json` (pas de `^`) une fois la fondation validée.

## 2. Structure du dépôt

```
src/
  app.html, app.d.ts, hooks.server.ts, hooks.ts
  content/                    contenus éditoriaux (markdown) : synopsis, reglement-hrp, systeme-de-jeu, premiers-pas
  lib/
    game/                     RÈGLES PURES, sans I/O, partagées client/serveur, testées unitairement
      progression.ts          xpMax = niveau × 30, gains par serment, migration v1, gemmes
      oaths.ts                catalogue natif des 13 Serments (données), fusion avec les surcharges
      combat/                 moteur du simulateur : initiative, actions, postures, statuts, dégâts, fin de combat
      spawn.ts                tirages d'apparitions (pondérations, coefficients)
      events.ts               règles d'inscription (visibilité, date, capacité)
    schemas/                  Zod : entrées des actions, formes des entités exposées
    server/
      db/                     index.ts (fabrique Neon/PGlite), schema.ts, migrate.ts, seed.ts
      auth/                   password.ts (scrypt + vérification héritée), session.ts, rate-limit.ts, recovery.ts, discord.ts
      domain/                 un module par agrégat : accounts, characters, oaths, beasts, zones, events, combats, spawn, themes, notifications, staff-log, audit, scenes, observations
      permissions.ts          matrice rôle × capacité (source unique)
      legacy/                 lecture d'un snapshot np-store-backup-v1 et migration vers le schéma
      http.ts                 helpers de réponse JSON, erreurs typées (NpError → code HTTP)
    ui/                       composants (un dossier par composant, styles scoped), tokens.css, themes.css, motion.css
    i18n/                     micro-textes (lexique officiel de 03-vision.md) — français uniquement, mais centralisé
  routes/                     voir 03-vision.md pour l'arborescence ; groupes (public), (app), (equipe), (compte), api/
static/                       fonts/, images/, favicon.svg, robots.txt, manifest.webmanifest
drizzle/                      migrations SQL générées
scripts/                      migrate-legacy.ts, make-fixture-snapshot.ts, check-visual.ts
tests/                        e2e/ (Playwright), fixtures/ (snapshots np_store fictifs), helpers/
legacy/                       ancien site, lecture seule
docs/overhaul/                audit, brief, vision, architecture, plan de construction, journal des revues
```

Règles : un fichier de `lib/game` n'importe jamais `lib/server` ; un composant n'appelle jamais la base ; les routes appellent `lib/server/domain`, jamais `db` directement ; toute mutation passe par une **form action** SvelteKit (ou un endpoint `api/` pour les rares appels programmatiques : sondage de La Table, recherche) et par la validation Zod.

## 3. Modèle de données

Principes : une table par entité ; identifiants texte stables (ceux de l'ancien site sont conservés à la migration, les nouveaux sont des `nanoid` de 16 caractères préfixés : `a_`, `p_`, `b_`, `e_`, `c_`, `s_`) ; `revision integer NOT NULL DEFAULT 1` sur chaque agrégat modifiable ; `created_at` / `updated_at timestamptz` partout ; `jsonb` uniquement pour les blocs libres listés ; clés étrangères réelles ; `ON DELETE` explicite.

### 3.1 Comptes et sessions

- `accounts` : `id`, `pseudo` (unique insensible à la casse, index sur `lower(pseudo)`), `password_hash` (format `scrypt$N$r$p$<sel>$<clé>` ; formats hérités `pbkdf2:…`, `sha256:…`, hex nu conservés jusqu'à la première connexion), `role` (enum `joueur | mj | designer | admin`), `character_id` (FK `characters`, nullable, unique — un personnage n'a qu'un compte), `session_version`, `force_password_reset`, `reset_expires_at`, `reset_secret_hash` (empreinte du mot de passe temporaire, nullable), `selected_theme` (FK `themes`), `discord_id` (unique, nullable), `discord_username`, `last_seen_at`, `revision`.
- `sessions` : `id` (empreinte HMAC-SHA-256 du jeton opaque, PK), `account_id`, `scope` (enum `full | reset`), `session_version` (copie au moment de la création), `created_at`, `expires_at`, `last_used_at`, `user_agent`, `ip`. Cookie `np_session` = jeton aléatoire 32 octets base64url, `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=30 jours` (`Lax` pour le retour OAuth). Une session est valide si non expirée, si `sessions.session_version = accounts.session_version`, et si `scope = full` (sauf pour les actions de réinitialisation). La déconnexion supprime la session **et** incrémente `session_version` (déconnexion de tous les appareils, comme aujourd'hui).
- `account_theme_grants` : `(account_id, theme_id, kind enum unlocked | blocked)`, `granted_by`, `created_at`.
- `auth_rate_limits` : `(scope, subject)` PK, `count`, `window_start`. Scopes `ip`, `login`, `register` ; 10 tentatives / 15 minutes ; l'exception admin de l'ancien code est supprimée.
- `admin_recovery_consumptions` : `fingerprint` PK, `pseudo`, `consumed_at`.

### 3.2 Personnages

- `characters` : `id`, `name` (≤ 80), `oath_id` (FK `oaths`), `branch` (texte, `'Aucune'` par défaut), `level`, `xp`, `pv_cur`, `pv_max`, `ep_cur`, `ep_max`, `em_cur`, `em_max`, `weapon`, `avatar_url`, `journal` (texte, ≤ 20 000), `progression_version` (1), `equipment jsonb` (`{helmet, chest, legs}`), `statuses jsonb` (≤ 64), `revision`.
- `character_items` : `id`, `character_id`, `name`, `category` (dont `Gemme`), `qty` (≥ 0), `description`, `extra jsonb` (champs inconnus hérités conservés), `position`.
- `character_history` : `id bigserial`, `character_id`, `ts`, `type` (`xp | gemme | item | level | stat | serment | combat | add | event | scene`), `text` (**brut**, échappé au rendu ; les textes hérités déjà échappés sont dés-échappés à la migration), `actor_name`, `actor_account_id`, `combat_id` (FK nullable), `dismissed` (bool : remplace `notifDeleted`). Pas de plafond à 200 : l'historique complet est conservé, paginé à la lecture.

### 3.3 Serments

- `oaths` : `id` (slug), `name`, `weapon`, `pv_growth`, `ep_growth`, `em_growth`, `base_damage`, `damage_type`, `rank` (`basic | seasoned | …`, valeurs exactes de l'audit 02), `hidden`, `evolves_from`, `icon`, `category` (`melee | distance | magie | soutien`), `is_builtin`, `lore`, `branches jsonb` (structure `bA`/`bB` avec `paliers[{niv, nom, cout, desc}]`, conservée telle quelle car purement éditoriale), `revision`.
- Le catalogue natif vit dans `src/lib/game/oaths.ts` (données extraites de `audit/contenu/serments-catalogue.md`) et est **semé** dans `oaths` à la première migration ; les surcharges `serments_custom` sont fusionnées à la migration. Ensuite la base fait foi (l'Atelier serments édite `oaths`).

### 3.4 Bestiaire et zones

- `beasts` : `id`, `name`, `subtitle`, `behavior`, `level`, `pv`, `ep`, `strike`, `skill`, `drops`, `gem`, `description`, `image_url`, `style`, `quote`, `hidden`, `archived`, `qty_min`, `qty_max`, `spawn_weight`, `tags text[]`, `zones text[]`, `statuses jsonb`, `admin_note` (jamais servi hors staff), `extra jsonb`, `revision`. Les alias hérités (`nom/name`, `beh/behavior/comportement`, `niv/level`, `pv/hp`, `ep/energy`, `frappe/attack`, `comp/skill/ability`, `drops/loot`, `gem/gemme`, `desc/description`, `img/image`, `sub/subtitle`, `catalog`) sont **fusionnés à la migration** avec une règle de priorité documentée dans `legacy/`.
- `zones` : `id` (slug), `name`, `emoji`, `is_default`, `position`.
- `beast_observations` (nouveau, vision) : `id`, `beast_id`, `text`, `author_account_id`, `status` (`proposed | validated | rejected`), `validated_by`, `validated_at`, `combat_id` nullable. Sert le Codex qui se révèle : seules les observations `validated` sont publiques.

### 3.5 Événements

- `events` : `id`, `title`, `type` (enum `combat | exploration | social | evenement | autre`), `description`, `starts_at timestamptz` (nullable), `capacity` (0 = illimité), `hidden`, `discord_url`, `created_by`, `revision`.
- `event_participants` : `(event_id, character_id)` PK, `registered_at`. Les inscriptions héritées par nom sont résolues à la migration ; les homonymes non résolus sont consignés dans le rapport de migration.

### 3.6 Combats (simulateur, Table, archives)

- `combats` : `id`, `owner_account_id` (FK, nullable pour les archives orphelines avec `owner_label` conservé), `name`, `label`, `status` (enum `preparation | en_cours | termine`), `round`, `phase`, `state jsonb` (fighters, order, log, notes, decl, pendingDrops… — format défini par `lib/game/combat`), `saved_at`, `manual_saved`, `autosave_at`, `autosave_reason`, `visible_to_participants` (bool, La Table), `revision`.
- `combat_participants` : `(combat_id, character_id)` PK, `outcome jsonb` (PV finaux, récompenses appliquées). Alimente « mes combats » et La Table.
- Fin de combat = **une transaction** : passage à `termine`, écriture des `outcome`, mise à jour des fiches (avec contrôle de `revision` de chaque personnage), entrées d'historique, journal staff, audit ; échec d'une vérification ⇒ tout est annulé, 409. Clé d'idempotence : `combats.closed_at` non nul ⇒ refus d'une seconde clôture.

### 3.7 Apparitions

- `spawn_runs` : `id`, `generated_at`, `actor_account_id`, `zone_id`, `payload jsonb` (groupes tirés), `beast_ids text[]`. Les totaux (`totals`, `totalDraws`) sont calculés par requête ; `lastRuns` = les 24 dernières lignes. Coefficients `0.22 / 0.14 / 0.95` dans `lib/game/spawn.ts`.

### 3.8 Thèmes

- `themes` : `id`, `name`, `css_class`, `description`, `is_event`, `available_until`, `visible`, `auto_grant_all`, `rarity`, `category`, `is_builtin`, `preview jsonb`. Semés depuis l'audit 07 (catalogue complet) ; `dark` et `light` toujours accordés.

### 3.9 Scènes (nouveau, vision « ce qui est encore ouvert »)

- `scenes` : `id`, `title`, `discord_url`, `status` (`ouverte | close`), `summary` (« où nous en sommes », facultatif), `open_question` (facultatif), `created_by`, `closed_at`, `revision`.
- `scene_participants` : `(scene_id, character_id)` PK, `bookmark_text` (phrase de reprise personnelle), `bookmark_url` (message Discord), `pinned` (bool), `updated_at`.
- `scene_pins` : `id`, `scene_id`, `character_id`, `kind` (`capacite | regle | objet | creature`), `ref` (identifiant), `note`. La marge qui accompagne.

### 3.10 Journaux

- `staff_log` : `id bigserial`, `ts`, `action`, `detail`, `actor_account_id`, `actor_name`, `target`, `archived_at` (nullable ; l'archivage marque au lieu de déplacer).
- `audit_log` : `id bigserial`, `ts`, `source`, `action`, `actor_account_id`, `actor_pseudo`, `actor_role`, `ip`, `origin`, `user_agent`, `details jsonb`. Plafond supprimé ; purge par âge (180 jours) dans un script d'entretien.
- `migration_registry` : `source_key`, `source_id`, `target_table`, `target_id`, `checksum`, `migrated_at` — idempotence de la migration.

### 3.11 Supprimé volontairement

`rpg_characters`, `themes_admin_store`, `theme_catalog`, `serment_catalog`, `page_content`, listes de compatibilité `combat_arc_<owner>`, index `combat_arc_idx_<owner>` (fusionnés dans `combats`), `lieux` (les lieux dormants sont importés dans `zones` s'ils correspondent à une zone, sinon consignés dans le rapport de migration et non repris).

## 4. Sécurité

- **Mots de passe** : le formulaire envoie le mot de passe en clair sous TLS. Vérification : format `scrypt$…` → scrypt ; `pbkdf2:<sel>:<hash>` → PBKDF2-SHA512 100 000 itérations 64 octets **sur l'hex SHA-256 du mot de passe** (compatibilité) ; `sha256:<hex>` ou hex nu → comparaison à temps constant avec SHA-256 du mot de passe. Après succès sur un format hérité, ré-encodage scrypt (N = 2^15, r = 8, p = 1, sel 16 octets, clé 64 octets, `maxmem` 64 MiB) dans la même transaction que la création de session. Longueur minimale **8** caractères pour les nouveaux mots de passe (les anciens de 4 restent acceptés à la connexion, avec invitation à changer).
- **Sessions** : voir 3.1. Rechargement du compte à chaque requête dans `hooks.server.ts` (`event.locals.session`, `event.locals.account`, `event.locals.character`). Session `reset` : uniquement `verify`, `complete_forced_reset`, `logout`.
- **Réinitialisation admin** : secret aléatoire 24 octets base64url affiché une fois, empreinte scrypt stockée dans `reset_secret_hash`, `reset_expires_at = now + 1 h`, révocation des sessions ; le compte ne peut plus se connecter qu'avec ce secret jusqu'à `complete_forced_reset` ; un secret expiré bloque la connexion (comportement actuel conservé, message explicite).
- **Récupération par variables d'environnement** : `NP_ADMIN_PSEUDO` / `NP_ADMIN_PASSWORD` / `NP_ADMIN_RECOVERY`, consommée une fois par empreinte, exécutée **uniquement** au démarrage d'une connexion admin explicite (pas à chaque requête).
- **CSRF** : form actions SvelteKit avec contrôle d'origine (`csrf.trustedOrigins: []`) ; endpoints `api/` : POST uniquement, `Content-Type: application/json` strict, contrôle `Origin === NP_SITE_URL`. `NP_SITE_URL` **obligatoire** en production (échec au démarrage sinon).
- **CSP** : `kit.csp` en mode `auto` (nonces en SSR, hashes en prerender) : `default-src 'self'; script-src 'self' 'nonce-…'; style-src 'self' 'unsafe-inline'` (les styles inline restent nécessaires aux transitions Svelte ; à retirer si possible en fin de chantier) ; `img-src 'self' data: blob: https://i.imgur.com https://cdn.discordapp.com`; `connect-src 'self'`; `frame-ancestors 'none'`. Aucun gestionnaire inline, aucun `{@html}` sans passage par le sanitiseur maison (`lib/server/html.ts`, liste blanche : `b i em strong br p`).
- **Filtrage par rôle côté serveur** avant tout envoi (créatures masquées/archivées, notes staff, événements masqués, journaux, observations non validées, état complet du simulateur). Un composant ne reçoit jamais plus que ce que le rôle peut voir.
- **En-têtes** : `Cache-Control: private, no-store` sur toute réponse authentifiée ; HSTS ; `X-Content-Type-Options` ; `Referrer-Policy: strict-origin-when-cross-origin` ; `Permissions-Policy` ; COOP.
- **Discord OAuth** (optionnel, activé si `DISCORD_CLIENT_ID` défini) : `state` aléatoire à usage unique (cookie signé, 10 minutes), PKCE, redirection exacte `NP_SITE_URL/connexion/discord/retour`. Liaison à un compte **existant et connecté** uniquement (« Lier mon compte Discord ») ; connexion ensuite par `discord_id`. Aucun rôle ni liaison de personnage par Discord.

## 5. Permissions (source unique : `lib/server/permissions.ts`)

| Capacité | joueur (lié) | mj | designer | admin |
|---|---|---|---|---|
| Lire références publiques (Serments visibles, bestiaire filtré, règles, événements visibles) | oui (aussi visiteur) | oui | oui | oui |
| Lire sa fiche, son journal, son historique, ses combats, ses scènes | oui | — | — | — |
| Modifier journal, avatar, consommer un objet, masquer une notification, participer à un événement, marque-page de scène, épingles | oui (son personnage) | — | — | — |
| Proposer une observation de créature | oui | oui | oui | oui |
| Lire tous les personnages ; modifier ressources, XP, niveau, inventaire, équipement, statuts, historique ; créer un personnage | — | oui | — | oui |
| Modifier identité, Serment, branche, arme, journal d'un personnage ; supprimer un personnage | — | — | — | oui |
| Simulation, apparitions, archives (toutes), clôture de combat, récompenses | — | oui | — | oui |
| Événements : créer, modifier, masquer, supprimer, notifier | — | oui | oui (sans notifier) | oui |
| Bestiaire : créer, modifier, publier, masquer, archiver ; valider une observation | — | — | oui | oui |
| Atelier serments | — | — | — | oui |
| Journal staff (lecture, écriture) | — | oui | — | oui |
| Comptes, rôles, liaisons, mots de passe, thèmes, journaux d'audit, diagnostics, migration | — | — | — | oui |
| Scènes : ouvrir, clore, résumé « où nous en sommes » | participant (ouvrir, marque-page) | oui | — | oui |

Décisions tranchées par rapport aux incohérences de l'audit (§11 de 05) : le MJ **n'édite pas** le bestiaire ; le designer **n'édite pas** les Serments ; la réinitialisation de mot de passe est admin ; le journal d'un personnage est lisible par son propriétaire, les MJ et les admins, et l'interface le dit ; le journal staff est lisible et archivable par MJ et admin.

## 6. Concurrence

- Chaque agrégat porte `revision`. Toute mutation reçoit `expectedRevision` (champ caché du formulaire) ; absent ⇒ **428** `VERSION_REQUIRED` ; `UPDATE … WHERE id = $1 AND revision = $2 RETURNING revision` ; zéro ligne ⇒ **409** `VERSION_CONFLICT` avec le message officiel (« Ces données ont été modifiées par une autre session. Recharge-les avant de réessayer. »). Jamais de relance automatique.
- Les actions joueur (consommer, participer, masquer, marque-page) sont des **commandes** serveur : l'identité vient de la session, le corps ne contient que l'identifiant ciblé et `expectedRevision`.
- Transactions (`db.transaction`) obligatoires pour : clôture de combat, consommation (item + historique), participation (capacité + insertion), suppression de compte (+ personnage), réinitialisation (+ révocation), migration héritée, changement de rôle du dernier admin (verrou `SELECT … FOR UPDATE` sur les admins).
- La Table : les participants sondent `GET /api/combats/[id]/etat` toutes les 4 s avec `If-None-Match: "<revision>"` ; 304 si inchangé ; l'état renvoyé est la **projection joueur** (ressources visibles, tour en cours, dernières lignes du récit), jamais l'état complet.

## 7. Migration depuis `np_store`

- Entrée : un fichier `np-store-backup-v1` (produit par `legacy/scripts/backup-store.js`) **ou** une URL Postgres contenant `np_store` (lecture seule). Commande : `npm run migrate:legacy -- --input <fichier> [--dry-run] [--report <fichier.md>]`.
- Idempotente via `migration_registry` (checksum par enregistrement source) ; seconde exécution identique ⇒ aucun changement ; source différente pour une cible déjà migrée ⇒ ligne « à arbitrer » dans le rapport, jamais d'écrasement silencieux.
- Ordre : thèmes → serments (natifs + custom) → zones → créatures → comptes → personnages (+ objets, historique, notifications masquées) → liaisons → événements → participations (résolution par nom, homonymes consignés) → combats (fusion des trois familles de clés, dédoublonnage par `id`, propriétaire résolu par pseudo / id / nom de personnage, orphelins conservés avec `owner_label`) → journal staff → audit → spawn runs → lieux (rapport).
- Vérifications de sortie : comptes = comptes source ; chaque personnage relu = projection source (niveau, XP, ressources, objets, nombre d'entrées d'historique) ; `progressionVersion` respecté sans double gain ; rapport markdown avec chiffres et anomalies.
- Tests : `tests/fixtures/np-store-*.json` (générés par `scripts/make-fixture-snapshot.ts` à partir des formes de l'audit 06, y compris cas tordus : comptes sans `sessionVersion`, personnages bi-piste, `players` avec `null`, alias `class`, événements hérités `titre/dateTs/published`, archives avec `log` de chaînes, hashes `sha256:` et `pbkdf2:`).
- Basculement (à décider avec le propriétaire, hors chantier) : pause des écritures, snapshot, migration, vérification, déploiement, réouverture ; l'ancien déploiement + l'ancien store restent le plan de retour.

## 8. Tests et recette

- `lib/game/*` : tests unitaires exhaustifs (toutes les formules et tables de l'audit 02 et 03, exemples chiffrés de `legacy/docs/fusion-xp.md`).
- `lib/server/*` : tests d'intégration Vitest sur PGlite avec les migrations réelles : chaque exigence de `audit/06-tests-comme-specification.md` marquée [S] est reprise comme test (auth, sessions, permissions, 428/409, actions joueur, filtrage, fin de combat, migration).
- Playwright : parcours de référence de `03-vision.md` §10 sur le build de production servi par `npm run preview` avec `DATABASE_URL=pglite://memory` et un seed de démonstration ; captures à 390 / 768 / 1440 px conservées dans `test-results/` (ignoré par git) ; test « aucun débordement horizontal » sur chaque page.
- Revue croisée : chaque lot livré est relu par un agent Claude critique **et** par GPT (Codex, lecture seule) ; les réserves sont consignées dans `docs/overhaul/revues/` et traitées avant le lot suivant.

## 9. Déploiement

- `netlify.toml` : `[build] command = "npm run build"`, `publish = "build"`, `NODE_VERSION = "24"` ; en-têtes de sécurité statiques pour les assets ; les en-têtes des réponses SSR sont posés dans `hooks.server.ts`.
- Variables : `DATABASE_URL` ou `NETLIFY_DATABASE_URL`, `NP_SESSION_SECRET` (≥ 32), `NP_SITE_URL`, `NP_ADMIN_*` (temporaires), `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_EVENTS_WEBHOOK_URL`.
- Migrations DDL exécutées par `npm run db:migrate` hors requête web (étape de build Netlify **uniquement** si `NP_MIGRATE_ON_BUILD=true`, sinon manuellement).
- Prérendu : pages publiques sans session (accueil, univers, règles, premiers pas, Serments, bestiaire public) avec revalidation par redéploiement ; tout le reste en SSR `no-store`.

## 10. Conventions de code

- Français pour les libellés, l'interface, les messages d'erreur et les commentaires ; anglais pour les identifiants de code (`character`, `oath`, `beast`, `event`, `combat`, `scene`) — un glossaire dans `03-vision.md` fait le lien (Serment = `oath`, personnage = `character`, créature = `beast`, apparition = `spawn`).
- Erreurs métier : `throw new NpError('EVENT_FULL', 'Événement complet.', 409)` ; les form actions renvoient `fail(status, { code, message, values })` et les pages affichent le message officiel.
- Aucune donnée privée en `localStorage` ; uniquement des préférences d'affichage (`np:theme`, `np:regime`, `np:last-tab`).
- Accessibilité : focus visible, cibles ≥ 44 px, `prefers-reduced-motion` respecté, contrastes AA, navigation clavier complète, `aria-live` pour les confirmations.
- Performance : aucune page connectée au-dessus de 150 kB de JS gzippé ; images `width`/`height` déclarées ; polices `font-display: swap`, préchargées.
