# Nuages Polaires

Compagnon de jeu et portail staff Nuages Polaires. Version **v300 publiée le 28 septembre 2026** : 24 nouveaux serments retravaillés, armes peintes et effets de combat automatiques. Voir la [fiche de publication](docs/release-v300-2026-09-28.md).

Le compagnon utilise un niveau et une barre d'XP communs aux statistiques et aux capacités du serment. La reprise des anciennes fiches conserve la progression la plus avancée. Règles et migration : [docs/fusion-xp.md](docs/fusion-xp.md).

## Démarrer

Node **24 LTS** et npm 10.9 ou supérieur sont nécessaires.

```bash
npm ci
npm run check
npm test
npm run build
```

`check` vérifie tous les scripts applicatifs et de test. `test` exécute les scénarios serveur et les requêtes PostgreSQL sur une base PGlite en mémoire, sans identifiants ni données réelles. `build` exécute ces contrôles puis copie uniquement l'HTML et les assets dans `dist/`.

Pour vérifier les parcours dans Chromium :

```bash
npx playwright install chromium
npm run test:browser
```

Le test démarre une application locale avec les véritables handlers serveur et une base fictive. Il couvre notamment connexion, journal, conflits de sauvegarde, XSS avatar, archives après rechargement, import et déconnexion. Captures dans `test-results/browser/`, dossier ignoré par Git.

## Structure

- `index.html` et `assets/js/` : application et modules front.
- `netlify/functions/auth.js` : authentification et gestion des comptes.
- `netlify/functions/db.js` : lectures filtrées et écritures autorisées/versionnées.
- `netlify/functions/_shared/` : persistance atomique partagée.
- `scripts/` : contrôles, tests locaux et génération du site statique.
- `docs/security-and-data.md` : contrat de sauvegarde, récupération et limites restantes.
- `docs/fusion-xp.md` : progression commune du compagnon et conversion des anciennes fiches.

## Configuration Netlify

La configuration versionnée utilise `npm run build`, publie `dist/` et garde les fonctions dans `netlify/functions/`.

Définir dans Netlify : `NETLIFY_DATABASE_URL`, `NP_JWT_SECRET` (au moins 32 caractères) et `NP_SITE_URL` (origine publique exacte). Voir `.env.example` et `docs/env-vars.md`. Ne jamais ajouter les vraies valeurs au dépôt.

Les variables `NP_ADMIN_PSEUDO`, `NP_ADMIN_PASSWORD` et `NP_ADMIN_RECOVERY` servent uniquement à la récupération contrôlée d'un accès admin. Les anciennes réinitialisations sans échéance doivent être renouvelées. Voir `docs/deploy-netlify.md` et `docs/infrastructure-review-2026-09-21.md` avant une mise en ligne.

## Sauvegardes

L'export JSON de l'interface est **partiel**. Les comptes qu'il contient sont des métadonnées, sans mots de passe, et sont ignorés à l'import. Une sauvegarde complète doit être faite côté PostgreSQL/Neon et sa restauration testée sur une base isolée.

Les conflits de version sont refusés par le serveur. Conserver son brouillon, recharger les données puis réappliquer la modification ; le client ne force pas l'écrasement d'une modification concurrente.

Les commandes `npm run backup:store -- --output <nouveau-fichier>` et `npm run backup:verify -- --input <fichier>` permettent un snapshot logique complet de `np_store` et une restauration de vérification locale. Voir `docs/backups.md` pour la connexion source explicite et les précautions de conservation.
