# Nuages Polaires — Registre des modules front

Version de nettoyage : **v266**

Ce document sert à éviter l’effet “patch sur patch” invisible.

## Modules principaux

| Fichier | Statut | Rôle |
|---|---:|---|
| `assets/js/main.js` | Actif | Noyau historique du site : navigation, rendu principal, auth, DB, simulateur, fiches, staff. |
| `assets/js/theme-max.js` | Actif consolidé | Moteur unique de thèmes depuis v257. Remplace l’empilement Theme Max v1-v8. |
| `assets/js/admin-dashboard.js` | Actif fusionné | Dashboard admin + console technique + polish visuel. Fusion de `staff-console.js` et `dashboard-admin-polish.js` depuis v267. |
| `assets/js/theme-regression.js` | Actif admin | Tests anti-régression des thèmes, intégrés au dashboard admin depuis v268. |
| `assets/js/home-readability-polish.js` | Actif | Polish de la home et amélioration de lisibilité du thème de base depuis v269. |
| `assets/js/connected-pages-polish.js` | Actif | Polish global des pages connectées depuis v270 : fiche, cards, tableaux, formulaires, bestiaire, simulateur, staff/database. |
| `assets/js/mobile-polish.js` | Actif | Audit/polish mobile depuis v272 : home, staff drawer, dashboard, database, collection, bestiaire, simulateur, modales. |
| `assets/js/database-admin-polish.js` | Actif admin | Polish de la page Database admin depuis v273 : hero, onglets, zones sensibles, tableaux, mobile. |
| `assets/js/staff-navigation.js` | Actif | Navigation Staff desktop/mobile. Remplace `staff-ux-polish.js` depuis v271. |
| `assets/js/api-hardening.js` | Actif | Bandeau statut API, retry, protection des erreurs DB/Auth. |
| `assets/js/diagnostics.js` | Actif admin | Diagnostic DB/Auth utilisé par le dashboard admin. |
| `assets/js/site-self-test.js` | Actif admin | Self-test du site utilisé par le dashboard admin. |

## Modules patch encore actifs

| Fichier | Statut | Pourquoi il reste chargé |
|---|---:|---|
| `assets/js/ui-patches.js` | À refactoriser | Contient encore la collection premium de thèmes, visibilité DB, wrappers de compatibilité et garde-fous bestiaire. |
| `assets/js/beast-admin.js` | Actif | Refonte admin bestiaire : filtres, export/import, cartes, archives, actions staff. |
| `assets/js/bestiary-admin-pass2.js` | Actif | Améliorations détail bestiaire : sélection, usage, complétude, panneau desktop. |
| `assets/js/finish-audit.js` | À intégrer plus tard | Correctifs globaux de finition : overflow, images cassées, accessibilité visuelle. |

## Nettoyage fait en v266

- Suppression des restes obsolètes de l’ancien onglet `Console` séparé.
- Conservation du dashboard technique fusionné dans `Staff → Tableau de bord`.
- Clarification du rôle de `staff-console.js`.
- Ajout du présent registre pour préparer une future fusion.
- Aucun changement DB.
- Aucun changement de schéma.

## Prochaine fusion recommandée

1. Décomposer `ui-patches.js` en modules spécialisés.
2. Décomposer `ui-patches.js` en modules spécialisés.
3. Décomposer `ui-patches.js` en :
   - `themes-collection.js`
   - `theme-visibility.js`
   - `bestiary-guards.js`
4. Déplacer les correctifs CSS de `finish-audit.js` dans `assets/css/components.css` quand le projet passera en CSS séparé.

## Nettoyage fait en v267

- Fusion de `staff-console.js` et `dashboard-admin-polish.js` en `assets/js/admin-dashboard.js`.
- Suppression des deux anciens fichiers fusionnés.
- Conservation des APIs globales de compatibilité : `renderDashboardConsole`, `npDashboardConsole`, `npDashboardPolish`, `npAdminDashboard`.

## Ajout fait en v268

- Ajout de `assets/js/theme-regression.js`.
- Nouveau bouton admin `Tester les thèmes` dans `Staff → Tableau de bord`.
- Vérification non destructive de `dark`, `light`, `violet`, `red`, `green`, `easter`, `halloween`, `noel`, `aquaris`, `bloodmoon`.

## Ajout fait en v269

- Ajout de `assets/js/home-readability-polish.js`.
- Polish de la home / première impression.
- Amélioration de la lisibilité du thème de base : variables plus contrastées, cards plus lisibles, CTA plus clair.

## Ajout fait en v270

- Ajout de `assets/js/connected-pages-polish.js`.
- Amélioration globale de la lisibilité des pages connectées.
- Focus : fiche joueur, cards, boutons, formulaires, tableaux, bestiaire, simulateur, staff, database, modales.

## Nettoyage fait en v271

- Renommage de `assets/js/staff-ux-polish.js` en `assets/js/staff-navigation.js`.
- Suppression de l’ancien fichier `staff-ux-polish.js`.
- Conservation des alias de compatibilité : `npStaffUxPolish` et `refreshStaffNavigation`.

## Ajout fait en v272

- Ajout de `assets/js/mobile-polish.js`.
- Amélioration responsive mobile : home, header, drawer Staff, dashboard admin, database, collection, bestiaire, simulateur et modales.

## Ajout fait en v273

- Ajout de `assets/js/database-admin-polish.js`.
- Amélioration de `Staff → Database` : header admin, états rapides, onglets internes plus lisibles, zone danger/confidentielle, tables et mobile.

## Correctif fait en v274

- Correction critique dans `assets/js/api-hardening.js` : le wrapper de `_authCall`, `_dbCall` et `_jsonPost` conserve maintenant correctement les arguments.
- Avant v274, le login pouvait envoyer un payload vide au serveur, empêchant notamment la connexion admin.
- Le check automatique Auth est maintenant passif avant connexion.
