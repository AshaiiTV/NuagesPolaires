# Changelog

## v278 — Robustesse auth & comptes admin

- Messages d'erreur connexion/inscription plus explicites avec recommandations selon le code HTTP.
- Bannière maintenance front quand Auth/DB/Netlify est indisponible.
- Mode recovery admin consommé une fois par mot de passe temporaire pour éviter les resets répétés.
- Interface comptes admin enrichie : recherche, filtres par rôle, statut liaison/reset, actions mot de passe.
- Ajout `scripts/test-auth-flows.js` et `npm run test:auth` pour tester inscription, login, mauvais mot de passe et santé admin.

## v277 — Diagnostic serveur admin

- Ajout d'un diagnostic serveur réservé au dashboard admin : Auth, DB, variables Netlify critiques, récupération admin et contexte de déploiement.
- Ajout d'une action backend `admin_health` sans exposition de secrets.

## v276 — Récupération admin

- Ajout d'un bootstrap admin serveur via `NP_ADMIN_PSEUDO` et `NP_ADMIN_PASSWORD` quand la base ne contient encore aucun admin.
- Ajout du mode temporaire `NP_ADMIN_RECOVERY=true` pour réinitialiser un admin existant.
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
