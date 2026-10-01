# Nuages Polaires — fondation livrée

Ce document décrit ce que la fondation fournit réellement, section par section. Il complète `04-architecture.md` (normatif) : en cas d'écart, l'écart est listé ici avec sa raison.

## Consolidation INT-2 — 1er octobre 2026

Cette section remplace les états de chantier plus anciens ci-dessous. Aucune migration SQL existante n'a été réécrite, aucune dépendance ajoutée, aucun nom de fonction ou de champ de vue supprimé.

### Carte des modules

| Modules | Responsabilité |
| --- | --- |
| `auth/context.ts`, `session.ts`, `request.ts` et `hooks.server.ts` | Acteur du hook, revalidation transactionnelle, sessions opaques, contrôle d'origine, base par requête et fermeture. |
| `auth/password.ts`, `rate-limit.ts`, `recovery.ts`, `discord.ts`, `redirect.ts` | Scrypt et héritage, quotas, récupération admin, OAuth et retour interne normalisé. |
| `domain/accounts.ts`, `characters.ts` | Comptes, thèmes et tokens persistés, liaisons, fiches, objets, conséquences, rature et export. |
| `domain/events.ts`, `reading.ts`, `scenes.ts` | Agenda et annonces persistées, cornes et signets, scènes et contexte de Table. |
| `domain/journal.ts`, `facts.ts`, `declarations.ts` | Notes personnelles et corrections, faits tamponnés, déclarations et expiration. |
| `domain/combats.ts`, `spawn.ts`, `publications.ts` | Tables, clôture et récits, apparitions, extraits et observations associées. |
| `domain/beasts.ts`, `zones.ts`, `oaths.ts`, `observations.ts` | Référentiels, calque staff, validation/refus des observations. |
| `domain/settings.ts`, `admin.ts`, `audit.ts`, `staff-log.ts` | Réglages, export partiel audité en transaction, diagnostics, journaux. |
| `domain/maintenance.ts`, `scripts/entretien.ts` | Scènes inactives, déclarations anciennes, sessions et quotas expirés, audit de plus de 180 jours. |
| `db/*`, `legacy/*`, `schemas/*`, `game/colors.ts` | Connexions et migrations, import hérité idempotent, contrats partagés, couleurs de sens. |

### Décisions INT-1 vérifiées

| Point | État et résultat |
| --- | --- |
| A1 | Déjà fait : message officiel de conflit. |
| A2 | Déjà fait : exports des schémas et résolution explicite des collisions. |
| A3 | Colonnes déjà livrées ; fini : annonces/récits depuis les colonnes, tokens depuis `themes.tokens`, motif d'observation persisté ; migrations 0000–0003 conservées. |
| A3 bis | Fait : personnages rayés exclus des fiches ordinaires, listes, participants et inscriptions, Tables et récits joueur, scènes, cornes, déclarations, faits et journal. L'export admin conserve leur lecture. |
| A4 | Déjà fait : couleurs hex centralisées pour statuts, rendez-vous, comportements et gemmes. |
| A5 | Fait : état `staff` sans fiche ; agenda et attente servis ; faits refusés ajoutés aux cornes ; conséquences, autres faits, déclarations, annonces, récits et notes vérifiés. La Table ouverte figure dans l'attente. |
| A6 | Fait : Table visible par défaut, y compris `spawnToTable` qui appelle `createTable` ; tests du contexte et du ruban. |
| A7 | Fait : import non littéral avec extension, chemin Vite adapté à Windows, contournement du hook retiré ; build et garde verts, serveur 5173 en HTTP 200. |
| A8 | Déjà fait : retour Discord `/entrer/discord/retour`. |
| A9 | Déjà fait : `ActionRule.name`, `label` conservé. |
| A10 | Fait : script d'entretien et script npm existant désormais exécutable, fermeture de la base et rapport de chaque opération. |
| A11 | Déjà fait : scripts de tests et garde du bundle, configuration Playwright sur serveur dev isolé. |
| A12 | Déjà fait et conservé : MJ autorisé à valider/refuser les observations ; journal écrit uniquement par son propriétaire. |
| A13 | Conservé : LAST_ADMIN 409, compte rayé conservant le personnage, soin de montée de niveau, refus du reset et de la rature de son propre compte. Suites de comptes et personnages vertes. |

### Corrections de sécurité

| Point | Correction et preuve de régression |
| --- | --- |
| B1 | Discord effacé lors de toute promotion/récupération ; pseudo d'environnement réservé sans distinction de casse. `auth/recovery.spec.ts` couvre les deux modes et l'inscription. |
| B2 | Revalidation du compte et de la session avant les verrous métier, liaison fraîche obligatoire. Les mutations joueur auparavant hors transaction sont regroupées. `domain/int2-security.spec.ts` compare toutes les données avant/après révocation, expiration et déliaison ; mutations staff testées dans chaque famille, déclassement compris. Verrou commun pour les opérations sur plusieurs comptes ; rature du personnage verrouillant son compte lié avant la fiche. |
| B3 | Quotas IP et couple IP/pseudo conservés ; dépassement global du pseudo = délai de 250 ms, sans 429. Tests d'une attaque distribuée suivie d'une connexion correcte, quota IP encore bloquant, récupération d'environnement après dépassement global. |
| B4 | Verrou transactionnel commun `(298, 1)` et consommation avec RETURNING avant toute modification ; empreinte déjà consommée = aucune écriture. Tests de deux appels simultanés avec/sans compte préexistant et d'une consommation antérieure sans admin. PGlite sérialise les transactions : une recette Neon avec deux connexions reste nécessaire. |
| B5 | Session relue entièrement : expiration, portée, version et état de reset à l'heure du contrôle ; session verrouillée en lecture. Tests de compte et staff, scope modifié, version modifiée et reset activé. |
| B6 | Échec hérité/malformé complété par scrypt factice ; budget minimal commun de 200 ms pour les 401 génériques. `domain/login-cost.spec.ts` compte les appels scrypt réels pour inconnu, SHA-256, hex, PBKDF2, scrypt et malformé. Les distributions sous charge en production restent à mesurer. |
| B7 | Droits du MJ conservés, conformément à la décision A12 ; matrice de validation et refus des observations testée. |
| B8 | `auth/redirect.ts` normalise le retour via URL, refuse contrôles et origine externe ; route `/entrer` utilise ce helper au load et à l'action. Tests de tabulations, contrôles, antislashs, URLs externes, normalisation et origine identique. |

Les tests de régression ont aussi été exécutés contre des copies isolées réintroduisant les défauts de la revue (4 fichiers, 61 tests en échec et 31 réussis, code 1) ; le code du serveur actif n'a jamais été rétabli à une version vulnérable. La garde de bundle admet exclusivement l'identifiant contractuel `pgliteDriver`, sans autoriser le paquet ou le pilote. L'import des seules métadonnées de version évite d'embarquer `devDependencies`.

### Commandes d'exploitation et de recette

```powershell
npx svelte-check --tsconfig ./tsconfig.json
npx vitest run --project server
npm run build
npx tsx scripts/check-bundle.ts
curl.exe -s -o NUL -w "%{http_code}" http://localhost:5173/
npm run entretien
npx tsx src/lib/server/db/migrate.ts
npm run migrate:legacy -- --input <snapshot.json> --dry-run --report <rapport.md>
```

`npm run test:server`, `npm run test:e2e` et `npm run check:bundle` restent disponibles. L'entretien et la migration lisent l'environnement du processus : configurer `DATABASE_URL`/`NETLIFY_DATABASE_URL` pour Neon ; en local PowerShell, `$env:NP_DB_DRIVER='pglite'` sélectionne PGlite. Une base en mémoire disparaît à la fermeture ; configurer `NP_PGLITE_DIR` pour entretenir une base locale persistante. L'entretien ferme le pool et les handles locaux dans `finally` ; chaque opération est idempotente. Le test d'intégration vérifie un second passage sans effet. Les tests PGlite ont un délai de 30 secondes pour l'initialisation WASM et scrypt sous charge, sans modifier leurs assertions métier.

Résultats finaux (1er octobre 2026) :

| Commande | Résultat |
| --- | --- |
| `npx svelte-check --tsconfig ./tsconfig.json` | Code 0 ; 1 200 fichiers, 0 erreur, 1 avertissement CSS hors périmètre (`src/routes/carnet/scene/+page.svelte`). |
| `npx vitest run --project server` | Code 0 ; 52 fichiers, 942 tests réussis ; durée 114,94 s. |
| `npm run build` | Code 0 ; build Vite et adapter Netlify terminés. |
| `npx tsx scripts/check-bundle.ts` | Code 0 ; 517 fichiers analysés, ni pilote local ni démonstration. |
| `curl.exe -s -o NUL -w "%{http_code}" http://localhost:5173/` | HTTP 200 ; serveur existant finalement sain après régénération. |
| `npm run entretien` avec `NP_DB_DRIVER=pglite` | Code 0 ; scenes fermées [], declarations expirées 0, sessions 0, quotas 0, audit 0 ; fermeture effective. |

Restent ouverts : recette Neon sur deux connexions pour les récupérations et retraits concurrents des derniers admins ; mesure des distributions de temps des échecs de connexion sur le déploiement. Le seul avertissement Svelte est dans une route hors périmètre. Aucune route ou composant d'interface n'a été édité hors de la correction autorisee de `/entrer/+page.server.ts`.

## Base de données

Code : `src/lib/server/db/` (`schema.ts`, `index.ts`, `migrations-folder.ts`, `pglite.ts`, `migrate.ts`, `referentials.ts`, `generate-referentials.ts`, `seed.ts`) ; helper de test `tests/helpers/db.ts` ; garde de bundle `scripts/check-bundle.ts`.

Migrations (`drizzle/`) :

- `0000_fondation.sql` : tout le DDL, généré par `npx drizzle-kit generate --name fondation`, aucune retouche manuelle ;
- `0001_referentiels.sql` : migration de **données** (entrée de journal créée par `npx drizzle-kit generate --custom --name referentiels`, SQL rendu par `npx tsx src/lib/server/db/generate-referentials.ts`, aucune retouche manuelle). Elle écrit les référentiels sans lesquels une base est inutilisable : les 9 thèmes (dont `dark` et `light`, défaut et FK RESTRICT de `accounts.selected_theme`), les 5 zones par défaut, les 3 clés de réglages (valeurs vides), la ligne unique `spawn_settings` (id 1, cumul 0) et les 13 Serments natifs de `BUILTIN_OATHS` (04 §3.3 « semé dans `oaths` à la première migration » ; FK RESTRICT de `characters.oath_id`). `ON CONFLICT DO NOTHING` partout. Ainsi **n'importe quel lanceur** — `npm run db:migrate` (`drizzle-kit migrate`), `npx tsx src/lib/server/db/migrate.ts`, la base locale de développement — livre une base Neon neuve où le premier compte et le premier personnage s'insèrent.

### Tables (35)

Comptes et accès

| Table                         | Rôle                                                                                                                                                                                                                                                                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `accounts`                    | Compte : pseudo (unique sur `lower(pseudo)`), empreinte du mot de passe (scrypt ou format hérité), rôle, personnage lié (unique, SET NULL), version de session, réinitialisation forcée (`reset_expires_at`, `reset_secret_hash`), thème choisi (RESTRICT), Discord (`discord_id` unique, `discord_username`), `extra`, `revision`. |
| `sessions`                    | Session opaque : id = HMAC du jeton, compte (CASCADE), `scope` full/reset, copie de `session_version`, expiration (CHECK `expires_at > created_at`), dernier usage, agent, IP.                                                                                                                                                      |
| `account_theme_grants`        | Thèmes débloqués ou bloqués par compte (CASCADE), auteur du don (SET NULL).                                                                                                                                                                                                                                                         |
| `auth_rate_limits`            | Compteurs de tentatives par `(scope, subject)` ; fenêtre glissante.                                                                                                                                                                                                                                                                 |
| `admin_recovery_consumptions` | Empreintes de récupération admin déjà consommées.                                                                                                                                                                                                                                                                                   |
| `reading_marks`               | Signet de lecture par compte (« la corne ») et marque-page (phrase, lien).                                                                                                                                                                                                                                                          |
| `settings`                    | Réglages saisis par un admin : `discord_invite_url`, `discord_default_channel_url`, `contact_text`.                                                                                                                                                                                                                                 |

Personnages et carnet

| Table               | Rôle                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `characters`        | Fiche : Serment (RESTRICT), branche, niveau, XP, ressources (CHECK `*_cur >= 0`, `*_max >= 1`), arme, avatar, `journal` (colonne de transition), équipement, statuts, `extra`, `revision`.                                                                                                                                                                                                               |
| `character_items`   | Inventaire : id technique global + `legacy_id` unique par personnage, catégorie (dont `Gemme`), `qty >= 0`, `extra`, position.                                                                                                                                                                                                                                                                           |
| `character_history` | Registre des conséquences : type, texte brut, acteur (SET NULL) et `actor_role`, `field` / `old_value` / `new_value` / `motif` (tampon), `declaration_id`, `replaces_id` (rature), `combat_id`, `dismissed`.                                                                                                                                                                                             |
| `journal_entries`   | Journal en entrées datées : texte ≤ 20 000, « notée en scène », rature (`replaces_id`, `struck`).                                                                                                                                                                                                                                                                                                        |
| `declarations`      | Déclarations de ressource (pv/ep/em, delta signé, mot), statut proposée → annulée/reportée/rayée/non reportée, fenêtre d'annulation `cancel_until` = `created_at` + 10 s, **colonne générée** (`GENERATED ALWAYS AS … STORED`, ni insérable ni modifiable : une ligne datée explicitement a toujours sa fenêtre calée sur sa création ; calcul en UTC car `timestamptz + interval` n'est pas IMMUTABLE). |
| `validated_facts`   | Dettes, promesses, alliances, conséquences, observations ; proposé → validé → soldé/rejeté ; `revision`.                                                                                                                                                                                                                                                                                                 |

Référentiels

| Table                | Rôle                                                                                                                                                                                                                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `themes`             | Catalogue des thèmes (9, écrits par la migration 0001), aperçu, disponibilité, `revision`.                                                                                                                                                                                                                                                        |
| `oaths`              | Serments : croissance, dégâts, rang, catégorie, branches (jsonb), lignée `evolves_from` (FK SET NULL, pas d'auto-évolution), `revision`. Défauts de colonne = ceux de la création d'un **custom** (audit 02 §4.4) : pvN 3, epN 5, emN 2, dmg 8, ✦, mêlée, rang `singular`, `is_builtin = false` ; un natif porte toujours ses valeurs explicites. |
| `zones`              | Zones d'apparition (libellé de salon unique), `revision`.                                                                                                                                                                                                                                                                                         |
| `beasts`             | Créatures : caractéristiques, visibilité (`hidden`, `archived`), quantités (CHECK `qty_min >= 1`, `qty_max >= qty_min`), `spawn_weight >= 0`, tags, note staff, `extra`, `revision`.                                                                                                                                                              |
| `beast_zones`        | Zones d'une créature (remplace l'ancien `text[]`), CASCADE des deux côtés.                                                                                                                                                                                                                                                                        |
| `beast_observations` | Observations du Codex : proposée/validée/rejetée, auteur et validateur (SET NULL), combat et publication d'origine, `revision`.                                                                                                                                                                                                                   |

Agenda, Table, scènes, publications

| Table                 | Rôle                                                                                                                                                                                                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `events`              | Rendez-vous : type, date, `capacity >= 0` (0 = illimité), masqué, lien du salon, auteur (SET NULL) + `created_by_label`, `extra`, `revision`.                                                                                                                                            |
| `event_participants`  | Inscriptions par identifiant de personnage (CASCADE).                                                                                                                                                                                                                                    |
| `combats`             | Simulateur / Table / archives : propriétaire (SET NULL) + `owner_label`, statut, état jsonb, sauvegardes, `visible_to_participants`, `discord_url`, `show_enemy_numbers`, `scene_id`, `published_extract_id`, `closed_at` (idempotence de clôture ; CHECK : clos ⇒ terminé), `revision`. |
| `combat_participants` | Participants d'un combat et `outcome` (CASCADE).                                                                                                                                                                                                                                         |
| `scenes`              | Scènes : titre, salon, statut, « où nous en sommes », question ouverte, combat d'origine, `last_activity_at`, `auto_closed`, `closed_at`, `revision`.                                                                                                                                    |
| `scene_participants`  | Participants et marque-page personnel (CASCADE).                                                                                                                                                                                                                                         |
| `scene_pins`          | Épingles de la marge (capacité, règle, objet, créature) (CASCADE).                                                                                                                                                                                                                       |
| `publications`        | Extraits publiés (« Dernières pages ») : texte non vide, accueil, tampon, rature.                                                                                                                                                                                                        |
| `publication_beasts`  | Créatures visées par une publication (CASCADE).                                                                                                                                                                                                                                          |

Apparitions, journaux, migration

| Table                | Rôle                                                                                                                                                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spawn_runs`         | Tirages : acteur (SET NULL), zone (RESTRICT), groupes tirés, créatures.                                                                                                                                                           |
| `spawn_counters`     | Cumul historique migré par créature (`migrated_draws >= 0`).                                                                                                                                                                      |
| `spawn_settings`     | Ligne unique (`id = 1`) : cumul global migré ; **toujours présente** (créée à 0 par la migration 0001, mise à jour par la migration héritée) : total affiché = `migrated_total_draws` + tirages de `spawn_runs`, sans `COALESCE`. |
| `staff_log`          | Journal staff : action, détail, acteur (SET NULL) + nom, cible, archive (`archive_id`, SET NULL).                                                                                                                                 |
| `staff_log_archives` | Archives du journal staff (date, libellé, fichier hérité).                                                                                                                                                                        |
| `audit_log`          | Journal d'audit : source, action, acteur (SET NULL) + pseudo/rôle, IP, origine, agent, détails.                                                                                                                                   |
| `migration_registry` | Idempotence de la migration héritée : clé `(source_key, source_id, transformer_version)`, cible, checksum.                                                                                                                        |

Contraintes transverses : `revision integer NOT NULL DEFAULT 1` avec CHECK `revision >= 1` sur `accounts`, `characters`, `beasts`, `oaths`, `events`, `combats`, `scenes`, `beast_observations`, `zones`, `themes`, `validated_facts`. Les politiques `ON DELETE` de 04 §10.4 sont toutes explicites et listées en tête de `schema.ts`.

Horodatage (04 §3, « `created_at` / `updated_at timestamptz` partout ») : les 26 tables dont une ligne peut changer après insertion portent `created_at` **et** `updated_at` (`timestamptz NOT NULL DEFAULT now()`). `updated_at` est remis à l'heure par Drizzle à chaque `UPDATE` qui ne le fixe pas lui-même (`$onUpdate`) ; une requête SQL brute doit le poser explicitement. Les horodatages métier (`character_history.ts`, `journal_entries.ts`, `staff_log.ts`, `publications.stamped_at`…) restent distincts : ils portent la date du fait, éventuellement héritée, `created_at` celle de l'écriture de la ligne. Exceptions (voir écart 13).

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
- **Développement et tests (PGlite)** : `NP_DB_DRIVER=pglite` (refusé si `NETLIFY=true` ou `NODE_ENV=production`). Base en mémoire par défaut, sur dossier si `NP_PGLITE_DIR`. Le handle est **partagé par le processus** (une base mémoire par requête serait vide) ; à sa première ouverture il est migré exactement comme Neon (référentiels compris, migration 0001), puis reçoit le jeu de démonstration sauf `NP_DEMO_SEED=false`. Son `close()` ne ferme rien ; `closeSharedDb()` le ferme réellement (fin de script ou de suite).
- **Migrations hors requête** : `npm run db:migrate` (`drizzle-kit migrate`) suffit, données de référence comprises. `npx tsx src/lib/server/db/migrate.ts` fait de même (ouvre sa connexion, migre, ferme) puis **vérifie** les référentiels (`checkReferentials` : thèmes `dark`/`light`, au moins un Serment natif, clés de réglages, ligne `spawn_settings`) et sort en code 1 s'il en manque. En PGlite : `NP_DB_DRIVER=pglite npx tsx src/lib/server/db/migrate.ts`.
- `migrate.ts` n'est **pas** importé par `index.ts` : la fabrique ne tire que `schema.ts` et `migrations-folder.ts` (localisation de `drizzle/`), rien qui contienne les semis.
- `executeRows<T>(db, sql\`…\`)`renvoie les lignes d'une requête brute quel que soit le pilote ;`Db`et`Tx` typent la base et une transaction.

### Semis

- **Données** : `referentials.ts` (module pur, sans E/S ni jeu de démonstration) porte `THEME_SEED` (`is_event` = rareté `Saisonnier`, la valeur que theme-max.js affiche après réécriture, audit 07 §3.1 : seuls `easter`, `halloween`, `noel` sont des événements ; `bloodmoon`, Fondateur, ne l'est pas et ne s'obtient que par don admin), `ALWAYS_GRANTED_THEME_IDS`, `THEME_ID_ALIASES`, `ZONE_SEED`, `SETTING_KEYS`, `SPAWN_SETTINGS_SEED`, `oathRowsFor()` (catalogue → lignes `oaths`, lignée résolue par nom ou identifiant, parents d'abord, parent inconnu ⇒ `NULL`) et `buildReferentialsSql()` (rendu de la migration 0001 : colonnes et conversions prises dans le schéma Drizzle). **Le code applicatif importe ces constantes depuis `referentials.ts`**, jamais depuis `seed.ts` (qui contient `seedDemo`, interdit dans le bundle) ; `seed.ts` les réexporte pour compatibilité.
- `seedDatabase(db, { oaths })` : réécrit les mêmes lignes par Drizzle (thèmes, zones, réglages, `spawn_settings`, Serments si fournis) et rapporte ce qui **manquait** (`{ themesInserted, zonesInserted, settingsInserted, spawnSettingsInserted, oathsInserted }`, tous à 0 après les migrations). Idempotent (`ON CONFLICT DO NOTHING`) : une ligne éditée n'est jamais écrasée. Usages : tests, base vidée, migration héritée.
- `seedOaths(db, BUILTIN_OATHS)` : accepte directement `OathDefinition[]` (via `oathRowsFor`).
- **Cohérence** : un test exige que `drizzle/0001_referentiels.sql` soit identique au rendu courant et que la migration produise exactement les lignes de `seedDatabase` sur base vierge. Avant la mise en production, toute évolution de `BUILTIN_OATHS` ou des référentiels se répercute par `npx tsx src/lib/server/db/generate-referentials.ts` ; **après**, une migration appliquée ne change plus : on écrit une nouvelle migration (la base fait foi, 04 §3.3).
- `seedDemo(db, env = process.env)` : jeu **fictif**, **toujours refusé en production** (`isProductionEnv` : `NETLIFY=true` ou `NODE_ENV=production`, même avec `NP_ALLOW_DEMO_SEED=true`), et ailleurs refusé sauf `NP_DB_DRIVER=pglite` ou `NP_ALLOW_DEMO_SEED=true` ; le bootstrap PGlite lui transmet le vrai `process.env` (pilote forcé) pour que cette garde s'y applique aussi ; une seule transaction ; idempotent (présence de `a_demo_admin`). Contenu : comptes `admin`, `alice`, `bob`, `mj`, `designer` et `nova` (en attente de liaison) avec des mots de passe au format hérité `sha256:<hex>` (valeurs dans `DEMO_PASSWORDS`, pour exercer le ré-encodage scrypt) ; Aria Lunval (alice, Duelliste niveau 7 : inventaire, gemmes Blanche et Incarnate, statuts, historique avec tampons, journal), Kael Morvan (bob, Arcaniste niveau 3), Seren Vallombre (non reliée) ; 6 créatures (dont une masquée, une archivée) rattachées à des zones ; 4 rendez-vous (2 à venir dont un complet, 1 passé, 1 masqué) ; 1 combat terminé et clos avec 2 participants ; 1 scène ouverte. Identifiants stables dans `DEMO_IDS`.

### Tester

```ts
import { createTestDb } from '../../../../tests/helpers/db';

const t = await createTestDb({ demo: true }); // { db, handle, seed, demo, close }
// … t.db …
await t.close();
```

Chaque appel crée une base PGlite en mémoire **isolée** (jamais le handle partagé), migrée avec `drizzle/` (référentiels compris), puis passée à `seedDatabase` (rapport `seed`, à zéro normalement) ; `demo: true` ajoute le jeu de démonstration ; `seed: false` s'en tient aux migrations ; `referentials: false` vide les tables de la migration 0001 (`REFERENTIAL_TABLES`) et, sauf `seed: true`, ne sème rien — pour tester le semis Drizzle sur base vierge.

Commande : `npx vitest run --project server src/lib/server/db` (77 tests : sélection du pilote dans tous les cas, pool Neon par appel, singleton PGlite, chaque contrainte de 04 §10.4 et chaque contrainte ajoutée (écart 7) vérifiée par son effet, `created_at` / `updated_at` sur chaque table et remise à l'heure de `updated_at`, `cancel_until` généré (ligne antidatée, fuseau de session, refus d'écriture), défauts d'un Serment custom, migration 0001 (fichier à jour, équivalence avec `seedDatabase`, base seulement migrée utilisable, `checkReferentials`), `spawn_settings` présente, semis idempotent, drapeau `is_event` des thèmes, cohérence du jeu de démonstration, garde de bundle sur les modules serveur embarqués compilés).

Garde de bundle, après `npm run build` : `npx tsx scripts/check-bundle.ts` (code 1 si `.netlify/functions-internal`, `.netlify/server` ou `build/` contient le mot `pglite` **sous toute casse** — contenu ou nom de fichier — ou `seedDemo` ; les motifs précis, paquet, pilote Drizzle, binaire, ne servent qu'au diagnostic).

### Écarts par rapport à l'architecture, et pourquoi

1. **Sélection du pilote** : `DATABASE_URL=pglite://…` (04 §1) n'est plus accepté ; seul `NP_DB_DRIVER=pglite` active PGlite (04 §10.2 prime). Les scripts Playwright doivent donc poser `NP_DB_DRIVER=pglite` au lieu de `DATABASE_URL=pglite://memory` (04 §8).
2. **PGlite et build de production** : PGlite étant exclu du bundle (§10.2), `npm run preview` sur le build de production ne peut pas ouvrir PGlite (le module `./pglite` n'existe pas dans `.netlify/server`). Les parcours Playwright sur PGlite tournent donc sur `vite dev` (ou sur un build dédié aux tests), pas sur le build Netlify ; à trancher par le lot qui écrit `playwright.config.ts`.
3. **check-bundle** — plus d'écart : le mot « pglite », sous toute casse, est **bloquant** (04 §10.2 à la lettre). Pour que la fabrique de connexion puisse malgré tout reconnaître `NP_DB_DRIVER=pglite` et le refuser en production, `index.ts` ne nomme le pilote local qu'en position de type (effacée à la compilation) et le reconstruit à l'exécution (`LOCAL_DRIVER`, `LOCAL_DIR_VAR`) ; ses commentaires, messages et identifiants ne le contiennent pas (`getSharedHandle`, `closeSharedHandles` dans `pglite.ts`) ; `schema.ts`, `migrations-folder.ts` et `referentials.ts` non plus. `bundle.spec.ts` compile ces modules (commentaires conservés, pire cas), les passe à `scanBundle` et vérifie que `index.ts` n'importe statiquement rien d'autre. **Conséquence pour les autres lots** : aucun module serveur embarqué ne doit écrire ce mot (comparer `handle.driver` à `LOCAL_DRIVER` ; importer les constantes de thèmes et de réglages depuis `referentials.ts`). Le script analyse aussi `.netlify/server`, où vit réellement le code serveur importé par `.netlify/functions-internal`. Au moment de la livraison, aucune route n'importe encore la base : la vérification sur build réel devra être relancée quand `hooks.server.ts` existera (un minifieur qui replierait `['pg', 'lite'].join('')` serait alors détecté, dans le sens sûr).
4. **`staff_log.archived_at` supprimé** au profit de `archive_id` → `staff_log_archives` (04 §10.12 « remplacent »).
5. **`beasts.zones text[]` supprimé** au profit de `beast_zones` (04 §10.4) ; la migration héritée résout les libellés de salon par `zones.name` (unique).
6. **`spawn_runs.zone_id`** passe de SET NULL à RESTRICT (04 §10.4).
7. **Contraintes ajoutées au-delà de la liste de 04 §10.4** — liste complète (le schéma et `drizzle/0000_fondation.sql` n'en contiennent pas d'autre). Elles peuvent **rejeter des données héritées** : le transformateur de migration (§7) doit normaliser avant écriture ou consigner la ligne en quarantaine dans le rapport.

   | Contrainte                                                                         | Règle                                      | Donnée héritée qui échouerait                                                  | Normalisation attendue                                                                                                      |
   | ---------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
   | `oaths_name_lower_uidx` (UNIQUE)                                                   | `lower(name)` unique                       | Serment custom ne différant d'un natif (ou d'un autre custom) que par la casse | fusion avec le natif s'il s'agit d'une surcharge (04 §3.3), sinon suffixe de désambiguïsation consigné                      |
   | `oaths_growth_check`                                                               | `pv_growth`, `ep_growth`, `em_growth >= 0` | custom à gain négatif                                                          | ramené à 0, consigné                                                                                                        |
   | `oaths_base_damage_check`                                                          | `base_damage >= 0`                         | custom à dégâts négatifs                                                       | ramené à 0, consigné                                                                                                        |
   | `oaths_no_self_evolution_check`                                                    | `evolves_from <> id`                       | custom qui se désigne comme parent                                             | `evolves_from = NULL`                                                                                                       |
   | `zones_name_uidx` (UNIQUE)                                                         | `name` unique                              | deux zones de même libellé de salon                                            | fusion (le libellé sert à résoudre `beasts.zones`, écart 5)                                                                 |
   | `beasts_level_check`                                                               | `level >= 1`                               | créature de niveau 0 ou négatif                                                | ramené à 1, consigné                                                                                                        |
   | `beasts_pv_ep_check`                                                               | `pv >= 1`, `ep >= 0`                       | créature à 0 PV ou énergie négative                                            | `pv` ramené à 1, `ep` à 0, consigné                                                                                         |
   | `combats_round_check`                                                              | `round >= 1`                               | archive au tour 0                                                              | ramené à 1                                                                                                                  |
   | `combats_closed_status_check`                                                      | `closed_at` non nul ⇒ `status = 'termine'` | — (`closed_at` n'existe pas dans l'ancien site)                                | —                                                                                                                           |
   | `accounts_session_version_check`, `sessions_session_version_check`                 | `session_version >= 0`                     | compte à version négative                                                      | ramenée à 0                                                                                                                 |
   | `sessions_expiry_check`                                                            | `expires_at > created_at`                  | — (sessions non migrées)                                                       | —                                                                                                                           |
   | `auth_rate_limits_count_check`                                                     | `count >= 0`                               | — (non migré)                                                                  | —                                                                                                                           |
   | `journal_entries_text_check`                                                       | `char_length(text) <= 20000`               | journal hérité > 20 000                                                        | découpé en plusieurs entrées « Avant le carnet » (la colonne de transition `characters.journal` n'a pas de borne, écart 11) |
   | `publications_text_check`                                                          | texte non vide                             | — (table nouvelle)                                                             | —                                                                                                                           |
   | `spawn_counters_migrated_draws_check`, `spawn_settings_migrated_total_draws_check` | cumuls `>= 0`                              | cumul hérité négatif                                                           | ramené à 0, consigné                                                                                                        |
   | `spawn_settings_singleton_check`                                                   | `id = 1`                                   | —                                                                              | —                                                                                                                           |
   | `migration_registry_transformer_version_check`                                     | `transformer_version >= 1`                 | —                                                                              | —                                                                                                                           |

   Les autres bornes du schéma viennent de 04 §3 lui-même et sont tout aussi bloquantes : enums (`role`, `type` d'historique, `type` d'événement, `rank` et `category` de Serment…), `varchar(80)` des noms de personnage et de créature, `varchar(32)` du pseudo.

8. **`migration_registry.transformer_version`** est un entier (défaut 1) et fait partie de la clé primaire (clé unique demandée par §10.10).
9. **`validated_facts`** porte `revision` (04 §3.12) bien qu'absente de la liste §10.13.
10. **Tables possédées ajoutées à la liste CASCADE** : `journal_entries`, `declarations`, `validated_facts` (personnage), `reading_marks` (compte), `publication_beasts` et `spawn_counters` (créature) ; les références de contexte (scène, combat, publication, validateur, archive) sont SET NULL.
11. **`characters.journal`** est conservée comme colonne de transition (04 §3.12) ; aucune contrainte de longueur en base pour ne pas bloquer la migration d'un journal hérité trop long (la borne de 20 000 reste appliquée par Zod).
12. **Mot de passe de `nova`** : non fourni par la commande ; valeur fictive `Nova-audit-123!` au même format.
13. **Horodatage, exceptions au « partout » de 04 §3** : les tables en ajout seul gardent leur seul horodatage d'événement, sans `updated_at` (une ligne n'y change jamais) — `audit_log` (`ts`), `spawn_runs` (`generated_at`), `migration_registry` (`migrated_at`), `admin_recovery_consumptions` (`consumed_at`), `staff_log_archives` (`archived_at`), `event_participants` (`registered_at`), `account_theme_grants` (`created_at`, conforme à 04 §3.1 : un don se crée ou se supprime) ; les tables de liaison pures `beast_zones` et `publication_beasts` n'en portent aucun. Ajoutés au-delà du texte de 04 §3 / §3.12 pour appliquer le principe : `updated_at` sur `sessions`, `combat_participants`, `scene_pins`, `declarations` ; `created_at` + `updated_at` sur `auth_rate_limits`, `character_history`, `journal_entries`, `publications`, `staff_log` ; `created_at` sur `reading_marks`, `scene_participants`, `spawn_counters`, `spawn_settings`, `settings`.
14. **Thème `bloodmoon`** : `is_event = false` bien que le catalogue `THEMES_EVENT_BUILTIN` déclare `event:true` ; c'est la valeur réécrite par theme-max.js (`event = rarity === 'Saisonnier'`, audit 07 §3.1) qui s'affiche dans l'ancien site. Un `is_event = true` sans date d'échéance aurait rangé la carte non possédée dans « À débloquer » (audit 07 §3.3) au lieu d'« Indisponible ».

## Écarts assumés au simulateur hérité

Décisions INT-3, explicites et conservées après la revue de fidélité :

1. L’XP est **proposée** à la clôture dans le feuillet Conséquences (vision §5.8). Le legacy n’attribuait aucune XP à la clôture ; le MJ peut mettre 0 avant de tamponner.
2. Les drops et les conséquences sont crédités au tampon de clôture, pas pendant le combat.
3. Un Serment personnalisé incomplet est complété depuis le natif ; le legacy pouvait produire `NaN`.
4. Les créatures archivées sont exclues des apparitions.
5. Un comportement numérique hérité est traduit en libellé. La migration calcule toutefois les quantités avec le comportement que l’ancien tirage lisait réellement.
6. Le MJ pose des statuts et change l’équipement : le serveur hérité l’autorisait, seul l’ancien menu cachait ces gestes.
7. La projection joueur emploie les états narratifs **LÉGER / GRAVE / CRITIQUE**, aux seuils de la page Système de jeu (66–100 %, 33–65 %, 0–32 % ; architecture §3.12).

Pour les apparitions, `qtyMin` / `qtyMax` saisis dans l’Atelier sont désormais prioritaires. À l’import, ces colonnes reçoivent la plage effective héritée (`spawnMin` / `spawnMax` valides, sinon niveau et comportement), et le rapport signale toute quantité saisie différente.
