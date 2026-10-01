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

- `characters` : `id`, `name` (≤ 80), `oath_id` (FK `oaths`), `branch` (texte, `'Aucune'` par défaut), `level`, `xp`, `pv_cur`, `pv_max`, `ep_cur`, `ep_max`, `em_cur`, `em_max`, `weapon`, `avatar_url`, `journal` (texte, ≤ 20 000), `progression_version` (1), `equipment jsonb` (`{helmet, chest, legs}`), `statuses jsonb` (≤ 64), `struck_at` / `struck_by` (FK `accounts`, SET NULL) / `struck_motif` (rature du personnage, INT-1), `revision`.
- `character_items` : `id`, `character_id`, `name`, `category` (dont `Gemme`), `qty` (≥ 0), `description`, `extra jsonb` (champs inconnus hérités conservés), `position`.
- `character_history` : `id bigserial`, `character_id`, `ts`, `type` (`xp | gemme | item | level | stat | serment | combat | add | event | scene`), `text` (**brut**, échappé au rendu ; les textes hérités déjà échappés sont dés-échappés à la migration), `actor_name`, `actor_account_id`, `combat_id` (FK nullable), `dismissed` (bool : remplace `notifDeleted`). Pas de plafond à 200 : l'historique complet est conservé, paginé à la lecture.

### 3.3 Serments

- `oaths` : `id` (slug), `name`, `weapon`, `pv_growth`, `ep_growth`, `em_growth`, `base_damage`, `damage_type`, `rank` (`basic | seasoned | …`, valeurs exactes de l'audit 02), `hidden`, `evolves_from`, `icon`, `category` (`melee | distance | magie | soutien`), `is_builtin`, `lore`, `branches jsonb` (structure `bA`/`bB` avec `paliers[{niv, nom, cout, desc}]`, conservée telle quelle car purement éditoriale), `revision`.
- Le catalogue natif vit dans `src/lib/game/oaths.ts` (données extraites de `audit/contenu/serments-catalogue.md`) et est **semé** dans `oaths` à la première migration ; les surcharges `serments_custom` sont fusionnées à la migration. Ensuite la base fait foi (l'Atelier serments édite `oaths`).

### 3.4 Bestiaire et zones

- `beasts` : `id`, `name`, `subtitle`, `behavior`, `level`, `pv`, `ep`, `strike`, `skill`, `drops`, `gem`, `description`, `image_url`, `style`, `quote`, `hidden`, `archived`, `qty_min`, `qty_max`, `spawn_weight`, `tags text[]`, `zones text[]`, `statuses jsonb`, `admin_note` (jamais servi hors staff), `extra jsonb`, `revision`. Les alias hérités (`nom/name`, `beh/behavior/comportement`, `niv/level`, `pv/hp`, `ep/energy`, `frappe/attack`, `comp/skill/ability`, `drops/loot`, `gem/gemme`, `desc/description`, `img/image`, `sub/subtitle`, `catalog`) sont **fusionnés à la migration** avec une règle de priorité documentée dans `legacy/`.
- `zones` : `id` (slug), `name`, `emoji`, `is_default`, `position`.
- `beast_observations` (nouveau, vision) : `id`, `beast_id`, `text`, `author_account_id`, `status` (`proposed | validated | rejected`), `validated_by`, `validated_at`, `motif` (texte, `''` par défaut : motif de la validation ou du refus, INT-1), `combat_id` nullable. Sert le Codex qui se révèle : seules les observations `validated` sont publiques.

### 3.5 Événements

- `events` : `id`, `title`, `type` (enum `combat | exploration | social | evenement | autre`), `description`, `starts_at timestamptz` (nullable), `capacity` (0 = illimité), `hidden`, `discord_url`, `created_by`, `announced_at` / `announced_by` (FK `accounts`, SET NULL : « Prévenir les joueurs »), `recit_combat_id` (FK `combats`, SET NULL : « Lire le récit »), `revision` (colonnes d'annonce et de récit : INT-1).
- `event_participants` : `(event_id, character_id)` PK, `registered_at`. Les inscriptions héritées par nom sont résolues à la migration ; les homonymes non résolus sont consignés dans le rapport de migration.

### 3.6 Combats (simulateur, Table, archives)

- `combats` : `id`, `owner_account_id` (FK, nullable pour les archives orphelines avec `owner_label` conservé), `name`, `label`, `status` (enum `preparation | en_cours | termine`), `round`, `phase`, `state jsonb` (fighters, order, log, notes, decl, pendingDrops… — format défini par `lib/game/combat`), `saved_at`, `manual_saved`, `autosave_at`, `autosave_reason`, `visible_to_participants` (bool, La Table), `revision`.
- `combat_participants` : `(combat_id, character_id)` PK, `outcome jsonb` (PV finaux, récompenses appliquées). Alimente « mes combats » et La Table.
- Fin de combat = **une transaction** : passage à `termine`, écriture des `outcome`, mise à jour des fiches (avec contrôle de `revision` de chaque personnage), entrées d'historique, journal staff, audit ; échec d'une vérification ⇒ tout est annulé, 409. Clé d'idempotence : `combats.closed_at` non nul ⇒ refus d'une seconde clôture.

### 3.7 Apparitions

- `spawn_runs` : `id`, `generated_at`, `actor_account_id`, `zone_id`, `payload jsonb` (groupes tirés), `beast_ids text[]`. Les totaux (`totals`, `totalDraws`) sont calculés par requête ; `lastRuns` = les 24 dernières lignes. Coefficients `0.22 / 0.14 / 0.95` dans `lib/game/spawn.ts`.

### 3.8 Thèmes

- `themes` : `id`, `name`, `css_class`, `description`, `is_event`, `available_until`, `visible`, `auto_grant_all`, `rarity`, `category`, `is_builtin`, `preview jsonb`, `tokens jsonb` (les huit tokens du thème, INT-1 : semés pour les neuf thèmes natifs depuis `src/lib/ui/themes.ts`, écrits par `createTheme`). Semés depuis l'audit 07 (catalogue complet) ; `dark` et `light` toujours accordés.

### 3.9 Scènes (nouveau, vision « ce qui est encore ouvert »)

- `scenes` : `id`, `title`, `discord_url`, `status` (`ouverte | close`), `summary` (« où nous en sommes », facultatif), `open_question` (facultatif), `created_by`, `closed_at`, `revision`.
- `scene_participants` : `(scene_id, character_id)` PK, `bookmark_text` (phrase de reprise personnelle), `bookmark_url` (message Discord), `pinned` (bool), `updated_at`.
- `scene_pins` : `id`, `scene_id`, `character_id`, `kind` (`capacite | regle | objet | creature`), `ref` (identifiant), `note`. La marge qui accompagne.

### 3.10 Journaux

- `staff_log` : `id bigserial`, `ts`, `action`, `detail`, `actor_account_id`, `actor_name`, `target`, `archived_at` (nullable ; l'archivage marque au lieu de déplacer).
- `audit_log` : `id bigserial`, `ts`, `source`, `action`, `actor_account_id`, `actor_pseudo`, `actor_role`, `ip`, `origin`, `user_agent`, `details jsonb`. Plafond supprimé ; purge par âge (180 jours) dans un script d'entretien.
- `migration_registry` : `source_key`, `source_id`, `target_table`, `target_id`, `checksum`, `migrated_at` — idempotence de la migration.

### 3.12 Tables demandées par la vision « Carnet d'encre » (`03-vision.md` §6 et §12) — normatives

- `reading_marks` : `account_id` PK, `last_read_at` (le signet : tout ce qui est écrit après porte une corne), `bookmark_text`, `bookmark_url`, `updated_at`. Le signet avance quand une page cornée est ouverte ou sur « Déplier toutes les cornes ».
- `journal_entries` : `id`, `character_id`, `ts`, `text` (≤ 20 000), `in_scene` (bool, « notée en scène »), `replaces_id` (FK vers l'entrée précédente : la rature ; l'ancienne reste lisible), `struck` (bool, rayée), `struck_at`. Remplace `characters.journal` (conservé en colonne le temps de la migration, puis migré en une première entrée « Avant le carnet »).
- `declarations` : `id`, `character_id`, `scene_id` (nullable), `combat_id` (nullable), `resource` (enum `pv | ep | em`), `delta` (entier signé), `word` (libellé exact : « Esquive », « subis », « soigné de », capacité…), `status` (enum `proposee | annulee | reportee | rayee | non_reportee`), `created_at`, `cancel_until` (= created_at + 10 s), `reported_by`, `reported_at`, `motif`. Ne modifie jamais les ressources ; le report crée une entrée de `character_history` tamponnée.
- `validated_facts` (faits validés) : `id`, `character_id`, `kind` (enum `dette | promesse | alliance | consequence | observation`), `counterpart` (texte libre : « envers Aria »), `text`, `status` (enum `proposed | validated | settled | rejected`), `witness`, `proposed_by`, `validated_by`, `validated_at`, `settled_at`, `motif`, `revision`.
- `publications` : `id`, `combat_id` (nullable), `text` (2 à 4 lignes), `on_home` (bool), `stamped_by`, `stamped_at`, `struck` (bool), `struck_at`. Table de liaison `publication_beasts (publication_id, beast_id)`. Les observations de créature (`beast_observations`) sont alimentées par les publications ciblant une créature ; `beast_observations.publication_id` nullable.
- `character_history` devient le registre structuré des **conséquences** : ajout de `field` (`pv | ep | em | xp | level | item | status | oath | branch | equipment | note`), `old_value`, `new_value` (texte), `motif`, `actor_role` (`joueur | mj | designer | admin | regles`), `declaration_id` (nullable). Un **tampon** = une entrée dont `actor_role ∈ {mj, admin}` avec `motif` non vide ; le format d'affichage est le micro-texte 16 de `03-vision.md`. Une **rature** de conséquence = une nouvelle entrée avec `old_value` = ancienne valeur et `replaces_id`.
- `combats` : ajout de `discord_url`, `show_enemy_numbers` (bool, « Montrer les chiffres des adversaires »), `scene_id` (scène ouverte automatiquement), `published_extract_id` (FK `publications`, nullable). La projection joueur remplace les PV des adversaires par l'état narratif LÉGER (66–100 %) / GRAVE (33–65 %) / CRITIQUE (0–32 %) sauf si `show_enemy_numbers`.
- `scenes` : ajout de `combat_id` (nullable), `last_activity_at`, `auto_closed` (bool) ; fermeture automatique après 14 jours d'inactivité par le script d'entretien.
- `settings` : `key` PK, `value` (texte), `updated_by`, `updated_at` — lien d'invitation Discord du colophon, salon par défaut, texte de contact.
- Les lieux (`lieux`) ne sont **pas** migrés (vision §2) ; le rapport de migration les liste.

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
- **Discord OAuth** (optionnel, activé si `DISCORD_CLIENT_ID` défini) : `state` aléatoire à usage unique (cookie signé, 10 minutes), PKCE, redirection exacte `NP_SITE_URL/entrer/discord/retour` (route de l'arbre `/entrer`, 06-contrats §C ; décision INT-1). Liaison à un compte **existant et connecté** uniquement (« Lier mon compte Discord ») ; connexion ensuite par `discord_id`. Aucun rôle ni liaison de personnage par Discord.

## 5. Permissions (source unique : `lib/server/permissions.ts`)

| Capacité | joueur (lié) | mj | designer | admin |
|---|---|---|---|---|
| Lire références publiques (Serments visibles, bestiaire filtré, règles, événements visibles) | oui (aussi visiteur) | oui | oui | oui |
| Lire sa fiche, son journal, son historique, ses combats, ses scènes | oui | — | — | — |
| Lire le journal d'un personnage (lecture seule) | — | oui | — | oui |
| Modifier journal, avatar, consommer un objet, masquer une notification, participer à un événement, marque-page de scène, épingles | oui (son personnage ; le journal s'écrit par son propriétaire SEULEMENT) | — | — | — |
| Proposer une observation de créature | oui | oui | oui | oui |
| Lire tous les personnages ; modifier ressources, XP, niveau, inventaire, équipement, statuts, historique ; créer un personnage | — | oui | — | oui |
| Modifier identité, Serment, branche, arme d'un personnage ; rayer un personnage | — | — | — | oui |
| Simulation, apparitions, archives (toutes), clôture de combat, récompenses | — | oui | — | oui |
| Événements : créer, modifier, masquer, supprimer, notifier | — | oui | oui (sans notifier) | oui |
| Bestiaire : créer, modifier, publier, masquer, archiver | — | — | oui | oui |
| Valider ou refuser une observation de créature | — | oui | oui | oui |
| Atelier serments | — | — | — | oui |
| Journal staff (lecture, écriture) | — | oui | — | oui |
| Comptes, rôles, liaisons, mots de passe, thèmes, journaux d'audit, diagnostics, migration | — | — | — | oui |
| Scènes : ouvrir, clore, résumé « où nous en sommes » | participant (ouvrir, marque-page) | oui | — | oui |

Décisions tranchées par rapport aux incohérences de l'audit (§11 de 05) : le MJ **n'édite pas** le bestiaire ; le designer **n'édite pas** les Serments ; la réinitialisation de mot de passe est admin ; le journal d'un personnage est lisible par son propriétaire, les MJ et les admins, et l'interface le dit — il ne s'écrit que par son propriétaire (le staff le lit, ne l'écrit pas) ; le journal staff est lisible et archivable par MJ et admin. Décisions d'intégration INT-1 : le MJ valide aussi les observations de créature (cohérent avec `permissions.ts` et `03-vision.md` §9.3, l'observation est un extrait tamponné par un MJ) ; un personnage rayé garde sa ligne (colonnes `struck_at`, `struck_by`, `struck_motif`) mais sort de toutes les pages, seul l'export administrateur le lit encore.

## 6. Concurrence

- Chaque agrégat porte `revision`. Toute mutation reçoit `expectedRevision` (champ caché du formulaire) ; absent ⇒ **428** `VERSION_REQUIRED` ; `UPDATE … WHERE id = $1 AND revision = $2 RETURNING revision` ; zéro ligne ⇒ **409** `VERSION_CONFLICT` avec le message officiel (« Quelqu’un a écrit sur cette page entre-temps. Relis avant d’écrire par-dessus. », micro-texte 9 de `03-vision.md` §8 — décision d'intégration INT-1, remplace la phrase héritée de l'audit 05). Jamais de relance automatique.
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
- Playwright : parcours de référence de `03-vision.md` §10 sur le serveur `vite dev` avec `NP_DB_DRIVER=pglite` et la base de démonstration (PGlite est exclu du bundle Netlify, donc le build de production ne peut pas l'ouvrir ; la recette du build réel se fait sur une preview Netlify avec une base Neon isolée) ; captures à 390 / 768 / 1440 px conservées dans `test-results/` (ignoré par git) ; test « aucun débordement horizontal » sur chaque page.
- Revue croisée : chaque lot livré est relu par un agent Claude critique **et** par GPT (Codex, lecture seule) ; les réserves sont consignées dans `docs/overhaul/revues/` et traitées avant le lot suivant.

## 9. Déploiement

- `netlify.toml` : `[build] command = "npm run build"`, `publish = "build"`, `NODE_VERSION = "24"` ; en-têtes de sécurité statiques pour les assets ; les en-têtes des réponses SSR sont posés dans `hooks.server.ts`.
- Variables : `DATABASE_URL` ou `NETLIFY_DATABASE_URL`, `NP_SESSION_SECRET` (≥ 32), `NP_SITE_URL`, `NP_ADMIN_*` (temporaires), `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_EVENTS_WEBHOOK_URL`.
- Migrations DDL exécutées par `npm run db:migrate` hors requête web (étape de build Netlify **uniquement** si `NP_MIGRATE_ON_BUILD=true`, sinon manuellement).
- Prérendu : pages publiques sans session (accueil, univers, règles, premiers pas, Serments, bestiaire public) avec revalidation par redéploiement ; tout le reste en SSR `no-store`.

## 10. Amendements après la revue de GPT (`revues/gpt-architecture.md`) — NORMATIFS, ils priment sur les sections précédentes

1. **Cycle de vie de la base (B1).** En production, un `Pool` Neon (`max: 2`, `connectionTimeoutMillis: 5000`, `idleTimeoutMillis: 10000`) est créé **par requête** dans `hooks.server.ts`, exposé en `event.locals.db`, et fermé (`await pool.end()`) dans un `finally` après `resolve`. Aucun pool global. Les scripts CLI créent et ferment leur propre pool. Mesurer au premier déploiement : temps à froid, réveil Neon, scrypt.
2. **Sélection du pilote (B2).** `NP_DB_DRIVER=pglite` est **obligatoire** pour utiliser PGlite (dev, tests) ; sans cette variable, l'application exige une URL `postgres://` (`DATABASE_URL`, sinon `NETLIFY_DATABASE_URL` ; les deux définies et différentes ⇒ erreur au démarrage). En production (`NETLIFY=true` ou `NODE_ENV=production`), `NP_DB_DRIVER=pglite` est refusé. Un script `scripts/check-bundle.ts` échoue si le bundle Netlify (`.netlify/functions-internal`) contient `pglite` ou le seed de démonstration.
3. **Objets d'inventaire (B3).** `character_items.id` reste un identifiant technique global ; ajout de `legacy_id text` avec unicité `(character_id, legacy_id)`. Toute consommation cherche l'objet **dans le personnage de la session**, jamais par id global seul.
4. **Contraintes (B4).** `ON DELETE CASCADE` : `sessions`, `account_theme_grants`, `character_items`, `character_history`, `event_participants`, `combat_participants`, `scene_participants`, `scene_pins`, `beast_zones`, `beast_observations` (sur la créature). `ON DELETE SET NULL` : `events.created_by`, `combats.owner_account_id` (avec `owner_label` conservé), `accounts.character_id`, `character_history.actor_account_id`, `staff_log.actor_account_id`, `audit_log.actor_account_id`, `beast_observations.author_account_id`. `ON DELETE RESTRICT` : `characters.oath_id`, `accounts.selected_theme`, `spawn_runs.zone_id`. `oaths.evolves_from` est une FK vers `oaths` (SET NULL). Les zones d'une créature passent dans une table `beast_zones (beast_id, zone_id)`. `CHECK` : ressources `*_cur >= 0`, `*_max >= 1`, `level >= 1`, `xp >= 0`, `qty >= 0`, `capacity >= 0`, `spawn_weight >= 0`, `qty_min >= 1`, `qty_max >= qty_min`, `revision >= 1`. `UNIQUE (lower(pseudo))`, `accounts.character_id UNIQUE`, `sessions.account_id` indexé, `character_history (character_id, ts, id)`, `event_participants (character_id)`, `combats (owner_account_id, saved_at)`, `beast_observations (beast_id, status)`.
5. **Serments inconnus.** La migration crée pour chaque `classe` non cataloguée (ex. « Mizu ») une ligne `oaths` avec croissance `[0,0,0]`, `is_builtin = false`, `hidden = true`, `lore = ''`, afin que la FK reste stricte sans perdre de personnage.
6. **Clôture de combat (B5).** `combats.closed_at timestamptz` ; la clôture commence par `UPDATE combats SET closed_at = now(), status = 'termine', revision = revision + 1 WHERE id = $1 AND closed_at IS NULL AND revision = $2 RETURNING id` ; zéro ligne ⇒ 409 et rollback. Les personnages sont verrouillés (`SELECT … FOR UPDATE`) par ordre d'`id`, les invocations exclues, les récompenses appliquées une seule fois.
7. **Invariants sous verrou (B6).** Participation : `SELECT … FOR UPDATE` sur l'événement avant le contrôle de capacité et l'insertion. Consommation et masquage de notification incrémentent `characters.revision`. Retrait d'un admin (suppression, changement de rôle, récupération) : verrou commun sur les lignes admin puis recomptage. Suppression de compte : vérification du compte **et** du personnage. Toute mutation sensible relit le compte et la session dans la transaction (session révoquée entre-temps ⇒ 401).
8. **Sessions de réinitialisation (B7).** `expires_at = min(reset_expires_at, now + 1 h)` ; `force_password_reset` et `reset_expires_at` sont vérifiés à chaque accès ; la finalisation (consommation du secret, nouveau hash, effacement de `reset_secret_hash`, incrément de `session_version`, création de la session pleine) est une seule transaction ; `logout` rejoué renvoie 200 sans nouvelle révocation.
9. **Mots de passe hérités (B8).** Le PBKDF2 hérité est `pbkdf2Sync(hexSha256DuMotDePasse, selHexEnTantQueCHAÎNE, 100000, 64, 'sha512')` : le sel est passé **comme chaîne**, non décodé ; l'entrée est l'hex SHA-256 **sans préfixe**. Validation stricte des formats avant tout calcul ; scrypt borné (N ≤ 2^17). Après vérification, la transaction de connexion relit le compte, refuse si `session_version` ou `password_hash` ont changé, puis remplace le hash et crée la session.
10. **Migration (B9, B10).** `migration_registry` : clé unique `(source_key, source_id, transformer_version)` ; identifiants cibles déterministes (l'id source quand il existe, sinon un hash stable de la source) ; écriture cible et registre dans la même transaction ; verrou global de migration (`pg_advisory_xact_lock`). Combats : priorité enregistrement détaillé > liste de compatibilité > index ; propriétaire ambigu ⇒ `owner_account_id = NULL` + `owner_label` + ligne de quarantaine dans le rapport, jamais d'attribution arbitraire. Apparitions : table `spawn_counters (beast_id PK, migrated_draws int)` et `spawn_settings (id = 1, migrated_total_draws int)` pour conserver les cumuls historiques ; les totaux affichés = cumul migré + tirages en base.
11. **CSP (B11).** `frame-ancestors 'none'` posé en en-tête HTTP (Netlify pour le statique, hook pour le SSR) ; la CSP Kit ajoute `object-src 'none'; base-uri 'none'; form-action 'self'`. Seules les pages éditoriales (accueil, univers, règles, premiers pas) sont prérendues ; Serments et bestiaire sont rendus **côté serveur** à chaque requête (contenu administrable).
12. **Champs hérités.** `accounts`, `characters`, `events` reçoivent `extra jsonb` (champs inconnus conservés à la migration) ; `events.created_by_label text` conserve l'auteur textuel ; `staff_log_archives (id, archived_at, label, filename)` + `staff_log.archive_id` remplacent le simple marqueur `archived_at`.
13. **Révisions.** `revision` sur tout agrégat éditable : `accounts`, `characters`, `beasts`, `oaths`, `events`, `combats`, `scenes`, `beast_observations`, `zones`, `themes`. `last_seen_at` et `touch` n'incrémentent jamais la révision.
14. **Lectures.** Les endpoints `GET /api/…` (sondage de La Table, recherche) sont des lectures autorisées, en `Cache-Control: private, no-store` ; toutes les mutations restent en POST avec contrôle d'origine.
15. **Historique en texte brut.** `character_history.text` est du texte, rendu comme texte (jamais `{@html}`) ; les entités HTML héritées sont décodées une fois à la migration. Le sanitiseur maison ne sert qu'au markdown éditorial (`marked` + liste blanche).
16. **Procédures à écrire avant le basculement** (`docs/overhaul/exploitation.md`) : sauvegarde/restauration relationnelle (`pg_dump` Neon), entretien (sessions expirées, rate-limits, audit > 180 j), exécution isolée des DDL, recette sur Neon multi-connexions et preview HTTPS, retour arrière après réouverture. Les exigences [B] et [C] de l'audit 06 (isolation de session, réponses tardives) sont reprises dans les tests Playwright de l'UI.

## 11. Conventions de code

Amendements de sécurité INT-2 (1er octobre 2026), prioritaires sur les formulations antérieures :

- Toute mutation authentifiée relit et verrouille le compte avant les verrous métier, puis relit la session (existence, expiration, portée pleine, version concordante et `scopeMatchesAccount`). Un rôle devenu différent refuse avec 401 ; une liaison de personnage devenue différente refuse avec 403. Les acteurs hors requête restent admis pour les scripts et tests, avec vérification du compte réel. La finalisation d'une session `reset` conserve son contrôle dédié.
- Amorçage et récupération admin : verrou transactionnel commun `pg_advisory_xact_lock(298, 1)`, partagé avec les mutations de comptes multiples ; empreinte consommée par `INSERT … ON CONFLICT DO NOTHING RETURNING` avant toute modification. Sans consommation effective, aucune promotion, révocation ou écriture de journal. Le Discord du compte promu est effacé ; `NP_ADMIN_PSEUDO`, même défini seul, réserve le pseudo à l'inscription publique sans distinction de casse.
- Connexion : quotas fermes IP et couple IP/pseudo, 10 tentatives par 15 minutes. Le compteur global du pseudo impose seulement 250 ms supplémentaires au-delà du seuil ; il ne bloque ni une autre IP légitime ni la récupération admin. Un succès remet les compteurs de pseudo et de couple à zéro. Les échecs hérités ou malformés effectuent une vérification scrypt factice ; les réponses génériques 401 ont un budget minimal commun de 200 ms, sans promesse de durée exacte sous charge.
- Le retour de connexion est analysé avec `new URL(retour, origine)` ; contrôles ASCII refusés, origine identique obligatoire, destination limitée à `pathname + search + hash` normalisés.
- L'import dynamique local utilise une extension `.ts` et un chemin `/src/…` sous le module runner de Vite, un chemin relatif sous tsx. Aucun contournement dans le hook. La garde de bundle autorise uniquement le nom de champ contractuel `pgliteDriver` ; paquets, imports, binaires, nom nu du pilote et démonstration restent bloquants. Les diagnostics n'embarquent que la version du package, jamais ses dépendances.

- Français pour les libellés, l'interface, les messages d'erreur et les commentaires ; anglais pour les identifiants de code (`character`, `oath`, `beast`, `event`, `combat`, `scene`) — un glossaire dans `03-vision.md` fait le lien (Serment = `oath`, personnage = `character`, créature = `beast`, apparition = `spawn`).
- Erreurs métier : `throw new NpError('EVENT_FULL', 'Événement complet.', 409)` ; les form actions renvoient `fail(status, { code, message, values })` et les pages affichent le message officiel.
- Aucune donnée privée en `localStorage` ; uniquement des préférences d'affichage (`np:theme`, `np:regime`, `np:last-tab`).
- Accessibilité : focus visible, cibles ≥ 44 px, `prefers-reduced-motion` respecté, contrastes AA, navigation clavier complète, `aria-live` pour les confirmations.
- Performance : aucune page connectée au-dessus de 150 kB de JS gzippé ; images `width`/`height` déclarées ; polices `font-display: swap`, préchargées.
