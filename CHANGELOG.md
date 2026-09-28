# Changelog

## v298 — Personnalisation unifiée (publiée le 24 septembre 2026)

- Catalogue partagé par le client et le serveur : neuf thèmes existants, alias historiques et palettes personnalisées validées.
- Application immédiate des couleurs, surfaces et contrastes cohérents sur les écrans du compagnon.
- Collection avec aperçu réversible, découverte isolée des thèmes non possédés, confirmation explicite et retour au thème enregistré en cas d’erreur.
- Préférence du compte prioritaire sur celle de l’appareil, sans écriture pendant un aperçu ni à la simple ouverture.
- Sélection contrôlée côté serveur : possession, blocage, accès Early Clouds et fenêtre de distribution ; droits réévalués lors des écritures concurrentes.
- Réponses de sélection sans renouvellement du cookie : une réponse tardive ne remplace pas la session d’un autre compte.

## v297 — Parcours du compagnon et progression commune

- Guide Premiers pas, archives de combat accessibles depuis Mon aventure et événements staff fiabilisés.
- Refonte Mystique polaire des références, de la fiche, de l'agenda et du compte ; navigation clavier et mobile améliorée.
- Export PDF autonome avec jsPDF local.
- Un niveau et une barre d'XP pour le personnage et les capacités de son serment, dans la fiche, les outils staff, le combat et l'export PDF.
- Récompenses de combat et Gemmes de Sang alimentant la même XP ; rang et branche du serment conservés comme choix distincts.
- Fusion des gemmes liée au stock de l'inventaire, avec refus d'un stock insuffisant et sauvegarde commune du retrait et du gain d'XP.
- Reprise des personnages existants par leur progression la plus avancée, avec transposition de la fraction d'XP vers le seuil commun `niveau × 30`, sans addition des anciens compteurs.
- Conversion versionnée des données héritées et des imports ; changement de serment sans remise à zéro de la progression.
- Règlement, système de jeu et documentation harmonisés. Le prototype RPG garde sa progression indépendante.

## v296 — Reprise sur la version publiée

- Intégration de toutes les évolutions v290–v295 du prototype RPG depuis `origin/main`.
- Sauvegarde du personnage RPG isolée par propriétaire, conflits détectés et réponses de session périmées ignorées.
- Fin de combat : les invocations ne remplacent plus les statistiques du propriétaire ; une fiche actualisée pendant l’archivage est conservée.
- Gains de niveaux alignés sur les serments personnalisés et les modifications des serments natifs.
- Cible explicite obligatoire pour les tests distants créant des comptes.
- Outils de sauvegarde logique de `np_store` et de restauration de vérification en base locale éphémère.
- Revue de la configuration Netlify/Neon et préparation des environnements de recette.

## Préparation locale sur v289 — Sécurité et fiabilité après audit

- Accès publics limités aux contenus publiés ; clés internes et notes staff filtrées.
- Sessions révocables au changement/récupération du mot de passe et à la déconnexion ; reset temporaire aléatoire, expirant et à usage unique.
- Écritures avec contrôle atomique de version et conflits explicites ; fusion des modifications indépendantes des comptes.
- Protection des comptes contre les imports génériques, sauvegarde du journal/avatar via une opération limitée au propriétaire.
- Archives détaillées enregistrées avant l'index, refus d'annoncer un succès après erreur ; arrêt des nouveaux caches privés persistants et récupération explicite des anciennes archives locales.
- Validation des URL et échappement du rendu ; labels et autocomplétion du formulaire de connexion.
- Tests de régression serveur, SQL PostgreSQL en mémoire et Chromium ; build contrôlé dans `dist/`, hors sources serveur/tests.
- Références de version alignées et passage à Node 24 LTS.

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
