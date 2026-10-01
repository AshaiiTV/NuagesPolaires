# Nuages Polaires — fondation livrée

Ce document décrit ce que la fondation fournit réellement, section par section. Il complète `04-architecture.md` (normatif) : en cas d'écart, l'écart est listé ici avec sa raison.

## Base de données

Code : `src/lib/server/db/` (`schema.ts`, `index.ts`, `pglite.ts`, `migrate.ts`, `seed.ts`) ; migration unique `drizzle/0000_fondation.sql` (générée par `npx drizzle-kit generate --name fondation`, aucune retouche manuelle) ; helper de test `tests/helpers/db.ts` ; garde de bundle `scripts/check-bundle.ts`.

### Tables (35)

Comptes et accès

| Table | Rôle |
|---|---|
| `accounts` | Compte : pseudo (unique sur `lower(pseudo)`), empreinte du mot de passe (scrypt ou format hérité), rôle, personnage lié (unique, SET NULL), version de session, réinitialisation forcée (`reset_expires_at`, `reset_secret_hash`), thème choisi (RESTRICT), Discord (`discord_id` unique, `discord_username`), `extra`, `revision`. |
| `sessions` | Session opaque : id = HMAC du jeton, compte (CASCADE), `scope` full/reset, copie de `session_version`, expiration (CHECK `expires_at > created_at`), dernier usage, agent, IP. |
| `account_theme_grants` | Thèmes débloqués ou bloqués par compte (CASCADE), auteur du don (SET NULL). |
| `auth_rate_limits` | Compteurs de tentatives par `(scope, subject)` ; fenêtre glissante. |
| `admin_recovery_consumptions` | Empreintes de récupération admin déjà consommées. |
| `reading_marks` | Signet de lecture par compte (« la corne ») et marque-page (phrase, lien). |
| `settings` | Réglages saisis par un admin : `discord_invite_url`, `discord_default_channel_url`, `contact_text`. |

Personnages et carnet

| Table | Rôle |
|---|---|
| `characters` | Fiche : Serment (RESTRICT), branche, niveau, XP, ressources (CHECK `*_cur >= 0`, `*_max >= 1`), arme, avatar, `journal` (colonne de transition), équipement, statuts, `extra`, `revision`. |
| `character_items` | Inventaire : id technique global + `legacy_id` unique par personnage, catégorie (dont `Gemme`), `qty >= 0`, `extra`, position. |
| `character_history` | Registre des conséquences : type, texte brut, acteur (SET NULL) et `actor_role`, `field` / `old_value` / `new_value` / `motif` (tampon), `declaration_id`, `replaces_id` (rature), `combat_id`, `dismissed`. |
| `journal_entries` | Journal en entrées datées : texte ≤ 20 000, « notée en scène », rature (`replaces_id`, `struck`). |
| `declarations` | Déclarations de ressource (pv/ep/em, delta signé, mot), statut proposée → annulée/reportée/rayée/non reportée, fenêtre d'annulation `cancel_until` = création + 10 s. |
| `validated_facts` | Dettes, promesses, alliances, conséquences, observations ; proposé → validé → soldé/rejeté ; `revision`. |

Référentiels

| Table | Rôle |
|---|---|
| `themes` | Catalogue des thèmes (9 semés), aperçu, disponibilité, `revision`. |
| `oaths` | Serments : croissance, dégâts, rang, catégorie, branches (jsonb), lignée `evolves_from` (FK SET NULL, pas d'auto-évolution), `revision`. |
| `zones` | Zones d'apparition (libellé de salon unique), `revision`. |
| `beasts` | Créatures : caractéristiques, visibilité (`hidden`, `archived`), quantités (CHECK `qty_min >= 1`, `qty_max >= qty_min`), `spawn_weight >= 0`, tags, note staff, `extra`, `revision`. |
| `beast_zones` | Zones d'une créature (remplace l'ancien `text[]`), CASCADE des deux côtés. |
| `beast_observations` | Observations du Codex : proposée/validée/rejetée, auteur et validateur (SET NULL), combat et publication d'origine, `revision`. |

Agenda, Table, scènes, publications

| Table | Rôle |
|---|---|
| `events` | Rendez-vous : type, date, `capacity >= 0` (0 = illimité), masqué, lien du salon, auteur (SET NULL) + `created_by_label`, `extra`, `revision`. |
| `event_participants` | Inscriptions par identifiant de personnage (CASCADE). |
| `combats` | Simulateur / Table / archives : propriétaire (SET NULL) + `owner_label`, statut, état jsonb, sauvegardes, `visible_to_participants`, `discord_url`, `show_enemy_numbers`, `scene_id`, `published_extract_id`, `closed_at` (idempotence de clôture ; CHECK : clos ⇒ terminé), `revision`. |
| `combat_participants` | Participants d'un combat et `outcome` (CASCADE). |
| `scenes` | Scènes : titre, salon, statut, « où nous en sommes », question ouverte, combat d'origine, `last_activity_at`, `auto_closed`, `closed_at`, `revision`. |
| `scene_participants` | Participants et marque-page personnel (CASCADE). |
| `scene_pins` | Épingles de la marge (capacité, règle, objet, créature) (CASCADE). |
| `publications` | Extraits publiés (« Dernières pages ») : texte non vide, accueil, tampon, rature. |
| `publication_beasts` | Créatures visées par une publication (CASCADE). |

Apparitions, journaux, migration

| Table | Rôle |
|---|---|
| `spawn_runs` | Tirages : acteur (SET NULL), zone (RESTRICT), groupes tirés, créatures. |
| `spawn_counters` | Cumul historique migré par créature (`migrated_draws >= 0`). |
| `spawn_settings` | Ligne unique (`id = 1`) : cumul global migré. |
| `staff_log` | Journal staff : action, détail, acteur (SET NULL) + nom, cible, archive (`archive_id`, SET NULL). |
| `staff_log_archives` | Archives du journal staff (date, libellé, fichier hérité). |
| `audit_log` | Journal d'audit : source, action, acteur (SET NULL) + pseudo/rôle, IP, origine, agent, détails. |
| `migration_registry` | Idempotence de la migration héritée : clé `(source_key, source_id, transformer_version)`, cible, checksum. |

Contraintes transverses : `revision integer NOT NULL DEFAULT 1` avec CHECK `revision >= 1` sur `accounts`, `characters`, `beasts`, `oaths`, `events`, `combats`, `scenes`, `beast_observations`, `zones`, `themes`, `validated_facts`. Les politiques `ON DELETE` de 04 §10.4 sont toutes explicites et listées en tête de `schema.ts`.

### Ouvrir et fermer une base

```ts
import { openDb, resolveDbTarget, closeSharedDb, type Db } from '$lib/server/db';

const handle = await openDb(); // = openDb(resolveDbTarget(process.env))
try {
	await handle.db.select()…;
} finally {
	await handle.close();
}
```

- **Production (Neon)** : sans `NP_DB_DRIVER`, une URL `postgres://` est exigée (`DATABASE_URL`, sinon `NETLIFY_DATABASE_URL` ; deux URL différentes ⇒ erreur). Chaque `openDb()` crée un `Pool` neuf (`max 2`, `connectionTimeoutMillis 5000`, `idleTimeoutMillis 10000`) : il n'existe aucun pool global. `hooks.server.ts` ouvre le handle, l'expose en `event.locals.db` et le ferme dans un `finally` après `resolve`.
- **Développement et tests (PGlite)** : `NP_DB_DRIVER=pglite` (refusé si `NETLIFY=true` ou `NODE_ENV=production`). Base en mémoire par défaut, sur dossier si `NP_PGLITE_DIR`. Le handle est **partagé par le processus** (une base mémoire par requête serait vide) ; à sa première ouverture il est migré puis semé (référentiels, Serments natifs, jeu de démonstration sauf `NP_DEMO_SEED=false`). Son `close()` ne ferme rien ; `closeSharedDb()` le ferme réellement (fin de script ou de suite).
- **Migrations hors requête** : `npx tsx src/lib/server/db/migrate.ts` (ouvre sa connexion, migre, ferme). En PGlite : `NP_DB_DRIVER=pglite npx tsx src/lib/server/db/migrate.ts`.
- `executeRows<T>(db, sql\`…\`)` renvoie les lignes d'une requête brute quel que soit le pilote ; `Db` et `Tx` typent la base et une transaction.

### Semis

- `seedDatabase(db, { oaths })` : thèmes, zones, clés de réglages (valeurs vides), et Serments si fournis. Idempotent (`ON CONFLICT DO NOTHING`) : une ligne éditée n'est jamais écrasée.
- `seedOaths(db, BUILTIN_OATHS)` : accepte directement `OathDefinition[]` ; `evolvesFrom` (nom ou identifiant du parent) est résolu en identifiant, parents insérés avant leurs évolutions, parent inconnu ⇒ `NULL`.
- `seedDemo(db, env = process.env)` : jeu **fictif**, refusé sauf `NP_DB_DRIVER=pglite` ou `NP_ALLOW_DEMO_SEED=true` ; une seule transaction ; idempotent (présence de `a_demo_admin`). Contenu : comptes `admin`, `alice`, `bob`, `mj`, `designer` et `nova` (en attente de liaison) avec des mots de passe au format hérité `sha256:<hex>` (valeurs dans `DEMO_PASSWORDS`, pour exercer le ré-encodage scrypt) ; Aria Lunval (alice, Duelliste niveau 7 : inventaire, gemmes Blanche et Incarnate, statuts, historique avec tampons, journal), Kael Morvan (bob, Arcaniste niveau 3), Seren Vallombre (non reliée) ; 6 créatures (dont une masquée, une archivée) rattachées à des zones ; 4 rendez-vous (2 à venir dont un complet, 1 passé, 1 masqué) ; 1 combat terminé et clos avec 2 participants ; 1 scène ouverte. Identifiants stables dans `DEMO_IDS`.

### Tester

```ts
import { createTestDb } from '../../../../tests/helpers/db';

const t = await createTestDb({ demo: true }); // { db, handle, seed, demo, close }
// … t.db …
await t.close();
```

Chaque appel crée une base PGlite en mémoire **isolée** (jamais le handle partagé), migrée avec `drizzle/`, semée (thèmes, zones, réglages, `BUILTIN_OATHS`) ; `demo: true` ajoute le jeu de démonstration ; `seed: false` laisse la base vide.

Commande : `npx vitest run --project server src/lib/server/db` (57 tests : sélection du pilote dans tous les cas, pool Neon par appel, singleton PGlite, chaque contrainte de 04 §10.4 vérifiée par son effet, semis idempotent, cohérence du jeu de démonstration).

Garde de bundle, après `npm run build` : `npx tsx scripts/check-bundle.ts` (code 1 si `.netlify/functions-internal`, `.netlify/server` ou `build/` contient le paquet PGlite, son pilote Drizzle, son binaire ou `seedDemo`).

### Écarts par rapport à l'architecture, et pourquoi

1. **Sélection du pilote** : `DATABASE_URL=pglite://…` (04 §1) n'est plus accepté ; seul `NP_DB_DRIVER=pglite` active PGlite (04 §10.2 prime). Les scripts Playwright doivent donc poser `NP_DB_DRIVER=pglite` au lieu de `DATABASE_URL=pglite://memory` (04 §8).
2. **PGlite et build de production** : PGlite étant exclu du bundle (§10.2), `npm run preview` sur le build de production ne peut pas ouvrir PGlite (le module `./pglite` n'existe pas dans `.netlify/server`). Les parcours Playwright sur PGlite tournent donc sur `vite dev` (ou sur un build dédié aux tests), pas sur le build Netlify ; à trancher par le lot qui écrit `playwright.config.ts`.
3. **check-bundle** : le mot nu « pglite » est **toléré** (signalé, non bloquant) parce que le sélecteur de pilote doit lire `NP_DB_DRIVER=pglite` pour le refuser en production ; le script échoue sur ce qui prouve une inclusion réelle (`@electric-sql/pglite`, `drizzle-orm/pglite`, `new PGlite`, `pglite.wasm`/`pglite.data`, fichier nommé `pglite*`) et sur `seedDemo`. Il analyse aussi `.netlify/server`, où vit réellement le code serveur importé par `.netlify/functions-internal`. Au moment de la livraison, aucune route n'importe encore la base : la vérification passe trivialement et devra être relancée quand `hooks.server.ts` existera.
4. **`staff_log.archived_at` supprimé** au profit de `archive_id` → `staff_log_archives` (04 §10.12 « remplacent »).
5. **`beasts.zones text[]` supprimé** au profit de `beast_zones` (04 §10.4) ; la migration héritée résout les libellés de salon par `zones.name` (unique).
6. **`spawn_runs.zone_id`** passe de SET NULL à RESTRICT (04 §10.4).
7. **Contraintes ajoutées au-delà de la liste** (cohérence, sans effet sur les données héritées normalisées) : `sessions.expires_at > created_at`, `session_version >= 0`, `auth_rate_limits.count >= 0`, `combats` clos ⇒ `termine`, Serment sans auto-évolution, `journal_entries.text` ≤ 20 000, `publications.text` non vide, `declarations.cancel_until >= created_at`, `spawn_settings.id = 1`, compteurs ≥ 0, `migration_registry.transformer_version >= 1`.
8. **`migration_registry.transformer_version`** est un entier (défaut 1) et fait partie de la clé primaire (clé unique demandée par §10.10).
9. **`validated_facts`** porte `revision` (04 §3.12) bien qu'absente de la liste §10.13.
10. **Tables possédées ajoutées à la liste CASCADE** : `journal_entries`, `declarations`, `validated_facts` (personnage), `reading_marks` (compte), `publication_beasts` et `spawn_counters` (créature) ; les références de contexte (scène, combat, publication, validateur, archive) sont SET NULL.
11. **`characters.journal`** est conservée comme colonne de transition (04 §3.12) ; aucune contrainte de longueur en base pour ne pas bloquer la migration d'un journal hérité trop long (la borne de 20 000 reste appliquée par Zod).
12. **Mot de passe de `nova`** : non fourni par la commande ; valeur fictive `Nova-audit-123!` au même format.
