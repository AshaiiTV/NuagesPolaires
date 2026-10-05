# Nuages Polaires — le compagnon

Le compagnon d'un serveur de roleplay textuel sur Discord. Le jeu se joue sur Discord ; le compagnon tient ce que Discord ne tient pas : la fiche et son Serment, les traces (journal, récits, conséquences tamponnées), l'agenda, les références de l'univers, et les outils des MJ et des administrateurs. Ce n'est pas un jeu en ligne.

Cette branche (`overhaul`) est la refonte complète, « Carnet d'encre ». L'ancien site (v297) est conservé tel quel dans [`legacy/`](legacy/) et reste en production sur `main` tant que le basculement n'a pas été décidé.

## Où lire quoi

| Document                                                                                                   | Contenu                                                                                   |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [docs/overhaul/03-vision.md](docs/overhaul/03-vision.md)                                                   | La vision : lexique (ruban, corne, rature, tampon, relevé), écrans, voix, parcours de fin |
| [docs/overhaul/04-architecture.md](docs/overhaul/04-architecture.md)                                       | Données, sécurité, droits, concurrence, migration, tests, déploiement                     |
| [docs/overhaul/06-contrats.md](docs/overhaul/06-contrats.md)                                               | Fonctions de domaine, arbre des routes, jeu de composants                                 |
| [docs/overhaul/05-fondation.md](docs/overhaul/05-fondation.md)                                             | Carte des modules serveur, décisions d'intégration, écarts assumés au simulateur hérité   |
| [docs/overhaul/decisions-proprietaire.md](docs/overhaul/decisions-proprietaire.md)                         | **Ce qui reste à trancher par le propriétaire** (règles de combat, Discord, basculement)  |
| [docs/overhaul/01-etat-des-lieux.md](docs/overhaul/01-etat-des-lieux.md) et [audit/](docs/overhaul/audit/) | L'audit de l'ancien site : la spécification source                                        |
| [docs/overhaul/revues/](docs/overhaul/revues/)                                                             | Les relectures croisées (GPT relit Claude, Claude relit GPT)                              |

## Démarrer

Node 24 et npm 10.

```bash
npm ci
cp .env.example .env   # puis NP_DB_DRIVER=pglite pour une base de démonstration en mémoire
npm run dev
```

Avec `NP_DB_DRIVER=pglite`, le serveur de développement crée une base en mémoire, y applique les migrations et sème des données fictives. Comptes de démonstration : `admin`, `alice`, `bob`, `mj`, `designer`, `nova` (mots de passe dans `src/lib/server/db/seed.ts`, données fictives uniquement).

## Vérifier

```bash
npm run check          # typage (svelte-check)
npm run lint           # prettier + eslint
npm run test:server    # règles de jeu, domaines, sécurité, migration — sur PostgreSQL en mémoire
npm run test:e2e       # parcours Playwright sur le serveur de développement
npm run build          # build Netlify
npm run check:bundle   # le bundle de production ne contient ni base en mémoire ni données de démonstration
```

## Structure

- `src/lib/game/` — règles pures : progression, Serments, moteur de la Table, apparitions, inscriptions.
- `src/lib/server/` — base (Drizzle, Neon), authentification, domaines, migration de l'ancien `np_store`.
- `src/lib/ui/` — le système de design du carnet (tokens, composants).
- `src/routes/` — les cahiers : accueil, L'univers, Mon carnet, Agenda, La Table, L'Atelier, Le Registre.
- `src/content/` — textes éditoriaux repris mot pour mot (synopsis, règlement, système de jeu).
- `scripts/` — migration héritée, entretien, contrôle du bundle, captures.

## Production

Netlify (adapter SvelteKit) et Neon Postgres. Variables : `DATABASE_URL` ou `NETLIFY_DATABASE_URL`, `NP_SESSION_SECRET` (32 caractères au moins), `NP_SITE_URL`. La migration des données de l'ancien site se fait avec `npm run migrate:legacy` à partir d'une sauvegarde `np-store-backup-v1` ; elle n'a été exécutée que sur des données fictives. Voir `docs/overhaul/decisions-proprietaire.md` avant tout basculement.
