# Reprise NP — vérification du 21 septembre 2026

## Versions et branche de travail

Le site publié `nuages-polaires.netlify.app` est en v295, commit `f1c5e99c92f4caeef87a9ec838c0936041f735d8`, déployé le 25 juin 2026. Le dossier local initial était encore en v289. Les sept commits intermédiaires ont été intégrés aux corrections d’audit dans la branche locale `codex/reprise-np-v296`, en conservant le prototype RPG.

Les contrôles de cette reprise n’ont effectué ni push, ni déploiement, ni modification des variables Netlify. La configuration distante reste reliée à `AshaiiTV/NuagesPolaires`, branche `main`, avec builds activés. Ne pas utiliser un push sur cette branche comme simple sauvegarde locale.

## Configuration distante observée

| Point | Constat | Action avant publication |
| --- | --- | --- |
| Origine autorisée | `NP_SITE_URL` absent des variables du site | Définir l’origine exacte de production, et une origine distincte pour chaque environnement de recette |
| Récupération admin | `NP_ADMIN_RECOVERY=true` et mot de passe temporaire encore configurés | Vérifier l’accès admin puis retirer les variables temporaires devenues inutiles |
| Connexion Neon | URL directe et URL poolée présentes avec TLS, contexte `all` | Dédier une base distincte aux previews et vérifier les éventuelles variables partagées de l’équipe |
| Secret de session | Présent, longueur suffisante, contexte `all` | Utiliser un secret distinct sur l’environnement isolé |
| Scopes | Les variables requises sont disponibles dans `functions` | Conserver ce scope ; aucun secret ne doit entrer dans le bundle client |
| Runtime publié | Fonctions actuelles en `nodejs20.x` | La v296 cible Node 24 ; vérifier le runtime effectivement choisi au premier déploiement de recette |
| Build distant | Ancienne configuration : pas de commande, publication `.` | La v296 fournit `npm run build` et `dist/` dans `netlify.toml` |
| Dépendances de test | Pas de variable d’exclusion des devDependencies observée au niveau du site | Conserver l’installation des devDependencies pendant le build |

Le connecteur Netlify demandait une réauthentification ; les lectures ont été effectuées avec la session CLI locale existante. Aucune valeur secrète n’a été copiée dans le dépôt ou ce rapport.

## Base et sauvegarde vérifiées

Les lectures SQL ont été réalisées dans des transactions `RepeatableRead` avec `readOnly: true`. La base répond sur PostgreSQL 17.11 ; son schéma public contient uniquement `np_store`. L’inventaire observé contient 84 entrées, dont 9 comptes, 7 fiches de personnages et un personnage du prototype RPG. Aucune donnée de jeu n’a été modifiée.

Une sauvegarde logique des **84 entrées de `np_store`** a été créée hors du dépôt :

`/Users/sachadegouzon/Documents/NuagesPolaires-backups/np-store-2026-09-21.json`

Fichier privé en mode `0600`, répertoire créé en `0700`. La sauvegarde préserve aussi les clés internes et les hashes de mots de passe. Elle a été restaurée dans PostgreSQL local en mémoire puis comparée intégralement : données JSONB, grands nombres et timestamps compris. SHA-256 :

`900e2f7899533d7d2fd82d4024f7fc3cde60cab73316d4d528a14f41193667d4`

Ce fichier est un snapshot logique complet de la table applicative, pas un `pg_dump` des rôles, grants, extensions et autres objets PostgreSQL. Les endpoints Netlify Database de métadonnées/snapshots ont répondu HTTP 400 : la rétention des sauvegardes natives n’a donc pas été vérifiée. Cela ne prouve pas leur absence.

Les [sauvegardes natives Netlify Database](https://docs.netlify.com/build/data-and-storage/netlify-database/backup-and-recovery/) et son [API de branches et snapshots](https://docs.netlify.com/build/data-and-storage/netlify-database/api/) dépendent du service effectivement provisionné. Ne pas déduire leur disponibilité du seul nom `NETLIFY_DATABASE_URL` utilisé ici avec le pilote Neon.

## Avant une recette distante

1. Disposer d’un accès vérifié au compte admin et au projet Neon associé.
2. Vérifier dans Neon la rétention, les branches et la procédure de restauration ; conserver une sauvegarde indépendante hors de cet ordinateur.
3. Créer/configurer une base de recette distincte et des secrets propres ; ne pas tester les écritures sur la base de production.
4. Exécuter les tests de session, de profils, de fin de combat, d’archives et de RPG sur cette cible. PGlite ne reproduit pas la concurrence réseau réelle de Neon.
5. Publier simultanément le front et les fonctions de la v296 seulement après cette recette.

## Validation locale de la v296

- 72 tests automatisés passent, dont sauvegardes concurrentes, isolation des sessions, progression, fin de combat et persistance RPG.
- Les deux parcours Chromium passent : application principale et prototype RPG, avec contrôles de conflits, déconnexion et affichage mobile.
- Syntaxe de 43 fichiers validée, build `dist/` régénéré, contrôle du diff propre.
- Le snapshot de 84 entrées a été restauré puis intégralement comparé ; les données source et l’absence de RLS ont été confirmées en lecture seule.
