Les corrections sont appliquées et les **131 tests navigateur passent**. Le lint global reste en échec sur des fichiers hors du périmètre autorisé.

**Critique Carnet**

| N° | État |
|---|---|
| 1 | Déjà corrigé |
| 2 | Corrigé |
| 3 | Déjà corrigé |
| 4 | Déjà corrigé |
| 5 | Déjà corrigé — marque-page unique du compte |
| 6 | Déjà corrigé |
| 7 | Corrigé |
| 8 | Déjà corrigé |
| 9 | Déjà corrigé |
| 10 | Déjà corrigé |
| 11 | Déjà corrigé |
| 12 | Corrigé |
| 13 | Déjà corrigé |
| 14 | Corrigé |
| 15 | Déjà corrigé |

**Critique Table**

| N° | État |
|---|---|
| 1 | Corrigé |
| 2 | Corrigé |
| 3 | Corrigé |
| 4 | Corrigé |
| 5 | Corrigé |
| 6 | Corrigé |
| 7 | Corrigé |
| 8 | Corrigé |
| 9 | Corrigé — redirection 303 vers la vue joueur |
| 10 | Corrigé |
| 11 | Corrigé |
| 12 | Corrigé |
| 13 | Corrigé — quatre liens sur une ligne à 390 px |
| 14 | Corrigé — heure conservée pour les nouveaux rounds |
| 15 | Corrigé |

**Critique Entrée, Agenda, Registre**

| N° | État |
|---|---|
| 1 | Corrigé |
| 2 | Déjà corrigé |
| 3 | Déjà corrigé |
| 4 | Corrigé |
| 5 | Corrigé |
| 6 | Déjà corrigé — accès designer et libellé conservés |
| 7 | Déjà corrigé |
| 8 | Déjà corrigé |
| 9 | Déjà corrigé |
| 10 | Corrigé |
| 11 | Déjà corrigé |
| 12 | Déjà corrigé |
| 13 | Déjà corrigé |
| 14 | Déjà corrigé |
| 15 | Déjà corrigé — toujours « En scène » |

**Critique Accueil, Univers**

| N° | État |
|---|---|
| 1 | Déjà corrigé |
| 2 | Corrigé |
| 3 | Corrigé |
| 4 | Corrigé |
| 5 | Corrigé |
| 6 | Non corrigé volontairement — dessin de police validé par le lead |
| 7 | Déjà corrigé |
| 8 | Déjà corrigé |
| 9 | Déjà corrigé |
| 10 | Corrigé — losanges colorés, contenu propriétaire conservé verbatim |
| 11 | Corrigé |
| 12 | Déjà corrigé |
| 13 | Déjà corrigé |

Tous les points ouverts ont été traités :

- Préselection `?creature=`, exposition de `qtyMin`, `qtyMax`, `spawnWeight` et champs dans l’Atelier.
- Calque administrateur des Serments, mentions hors vitrine et liens vers l’Atelier.
- Participants et conséquences des récits ; publications et notes des archives lues par les domaines.
- État « Table repliée » fondé sur `PlayerTableView.status`.
- Anomalies dans « Ce qui attend » et libellés lisibles des actions d’audit et des décisions.
- Tampons partagés, dates « 1er », thèmes et semis cohérents, confirmation de consommation unique.
- P1 à P9 ajoutés, avec contrôles transversaux par profil à 390 et 1440 px.
- Serveur Vite dédié sur 4173, un worker et remise à zéro du semis avant chaque test, réservée au développement local.

**Résultats exacts**

| Commande | Résultat |
|---|---|
| `npx svelte-check --tsconfig ./tsconfig.json` | Code 0 — 1 226 fichiers, **0 erreur, 0 avertissement** |
| `npx vitest run --project server` | Code 0 — **58 fichiers, 981 tests réussis**, 102,36 s |
| `npx playwright test` | Code 0 — **131 tests réussis**, 4,7 min, sans retry |
| `npm run lint` | Code 1 — Prettier signale **26 fichiers hors périmètre** ; arrêt avant ESLint |
| Prettier et ESLint du périmètre autorisé | Codes 0 |
| `npm run build` | Code 0 — compilation réussie ; avertissement informatif de timings Vite |
| `npx tsx scripts/check-bundle.ts` | Code 0 — **544 fichiers**, aucune trace de PGlite ou `seedDemo` |

Le script de capture a produit **116 captures** sur le serveur 5173 : aucun débordement horizontal, texte visible sous 12 px ou erreur de console signalé. Aucun U+FFFD dans les 322 fichiers contrôlés.

Les preuves sont conservées dans [corrections-1.log](C:/Users/sacha/NuagesPolaires/tests/verification/corrections-1.log).

Il reste à rendre le **lint global** vert : les fichiers signalés comprennent notamment `eslint.config.js`, `vite.config.ts`, `scripts/capture.mjs`, `src/app.html` et des modules de jeu hors du périmètre autorisé. L’autorisation d’élargissement demandée n’a pas été reçue. Les anciens journaux dépourvus d’horodatage ne permettent pas non plus de reconstituer leur heure de résolution.