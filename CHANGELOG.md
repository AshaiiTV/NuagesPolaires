# Changelog

## v276 — Récupération admin

- Ajout d'un bootstrap admin serveur via `NP_ADMIN_PSEUDO` et `NP_ADMIN_PASSWORD` quand la base ne contient encore aucun admin.
- Documentation Netlify mise à jour pour la récupération du premier accès admin.

## v275 — Git Ready

- Ajout `.gitignore`.
- Ajout `.env.example`.
- Ajout `README.md`.
- Ajout docs Git / Netlify / architecture / versioning.
- Préparation du projet pour GitHub + Netlify.

## v274 — Fix connexion admin

- Correction critique dans `assets/js/api-hardening.js`.
- Le wrapper API conserve maintenant correctement les arguments de `_authCall`, `_dbCall`, `_jsonPost`.
- Ajout `scripts/check-api-hardening-wrapper.js`.
- Auth check passif avant login.

## v273 — Database admin polish

- Ajout `assets/js/database-admin-polish.js`.
- Header admin dédié dans Database.
- Onglets internes plus lisibles.
- Actions sensibles mieux marquées.

## v272 — Mobile polish

- Ajout `assets/js/mobile-polish.js`.
- Amélioration home mobile, drawer Staff, dashboard, database, bestiaire, simulateur, modales.

## v271 — Staff navigation cleanup

- Remplacement de `staff-ux-polish.js` par `staff-navigation.js`.

## v270 — Connected pages polish

- Ajout `assets/js/connected-pages-polish.js`.

## v269 — Home readability polish

- Ajout `assets/js/home-readability-polish.js`.
- Amélioration de la lisibilité du thème de base.

## v268 — Theme regression tests

- Ajout `assets/js/theme-regression.js`.
- Tests anti-régression thèmes dans le dashboard admin.

## v267 — Admin dashboard fusion

- Fusion `staff-console.js` + `dashboard-admin-polish.js` vers `admin-dashboard.js`.

## v266 — Safe patch cleanup

- Nettoyage des restes de l’ancien onglet Console.
- Ajout registre des modules.

## v274 et avant

Historique complet détaillé dans `docs/PATCHES.md`.
