# Nuages Polaires — bilan fonctionnel et plan du site

Établi le 23 septembre 2026 à partir du code v296, branche `codex/reprise-np-v296`, commit `db24688`.

Ce document distingue l'existant, les parcours à réparer et l'organisation proposée. Il résulte d'une lecture du code et des permissions ; il ne constitue pas une nouvelle recette en production. La dernière vérification documentée du site publié, le 21 septembre, indiquait la v295. La présence d'une fonctionnalité dans cette branche ne prouve donc pas son déploiement.

### Suivi de mise en œuvre — premier lot

Le bilan ci-dessous conserve l'état observé au commit indiqué. Depuis ce bilan, la branche de travail a reçu les corrections suivantes, sans déploiement :

- Consommation, inscriptions/désinscriptions et notifications passent par des actions serveur dédiées, avec confirmation et protection contre les conflits/doubles clics.
- L'accueil et l'agenda partagent le même format d'événement ; les événements masqués sont filtrés côté serveur pour les visiteurs/joueurs.
- Le menu propose « Mon aventure », « Univers », « Événements » et un accès unique au « RPG — expérimental », avec les correspondances mobiles. Les ateliers sont regroupés sous Création et le registre staff s'intitule Personnages.
- Le menu se replie aussi sur tablette pour éviter le débordement des outils staff. Le tableau de bord administrateur est corrigé : référence JavaScript hors portée, insertions dans le mauvais parent HTML et reconstructions inutiles de l'aperçu.
- L'interface explique la lecture du journal par les MJ/administrateurs et distingue la présence simulée du prototype d'un multijoueur distant.

Une deuxième étape apporte la charte **Mystique polaire**, un accueil public illustré avec présentation de l'univers et des Serments, un tableau de bord conçu comme un carnet de voyage et une harmonisation des principaux composants. La direction et les assets sont documentés dans `docs/charte-graphique-mystique-polaire.md`. Le paysage et le synopsis tiennent compte de la précision du propriétaire : les constructions ont presque toutes disparu du monde.

Restent notamment l'accompagnement détaillé des premiers pas, l'harmonisation complète des opérations staff sur les événements, une rubrique d'archives plus explicite et les décisions de fond sur la progression RPG et la carte. La capacité des événements existe dans les données mais ne dispose pas encore d'un champ complet dans leur éditeur ; les inscriptions héritées reposent sur le nom du personnage et les homonymes sont désormais refusés.

Validation locale de ce lot : 110 tests automatisés réussis, syntaxe de 46 fichiers vérifiée et construction statique réussie. Les trois suites Chromium couvrent notamment les sauvegardes après rechargement, les conflits, les archives, le RPG, les actions joueur et le changement de compte pendant une requête. Elles utilisent les fonctions serveur du projet avec une base SQL locale ; ces résultats ne constituent pas une validation du site publié.

## 1. Ce qu'est NP aujourd'hui

Le site se présente comme le compagnon officiel d'un serveur de roleplay textuel sur Discord, dans un univers post-apocalyptique original. Il rassemble trois ensembles :

1. **Un compagnon de JDR** : univers, règles, serments, bestiaire, personnages et événements.
2. **Des outils pour l'équipe** : gestion des personnages, rencontres, simulation de combat, création de contenu et administration.
3. **Un prototype RPG jouable** : exploration, combats et progression propres au module.

Le compagnon et les outils d'équipe forment déjà un ensemble substantiel. Le principal besoin produit est de rendre les parcours cohérents et fiables, puis de décider de la place du RPG.

## 2. Plan actuel

Il s'agit principalement d'une application à écrans et onglets, avec des adresses de type `#fiche`, plutôt que d'un ensemble de pages web indépendantes. L'arbre ci-dessous décrit la navigation et les regroupements visibles ; les sections de la fiche ne sont pas des pages séparées.

```text
Nuages Polaires
├── Accueil public
│   ├── Rejoindre l'aventure
│   │   └── Règlement HRP → Inscription → Compte en attente
│   ├── Espace joueur → Connexion
│   │   └── Changement de mot de passe imposé si nécessaire
│   └── Prototype RPG → Accès invité ou connecté
│
├── Application / menu « Explorer »
│   ├── Accueil connecté
│   │   ├── Statistiques et statuts du personnage
│   │   ├── Prochain événement
│   │   ├── Derniers combats
│   │   └── Accès rapides
│   ├── Synopsis
│   ├── Serments
│   ├── Bestiaire
│   ├── Prototype RPG
│   ├── Système de jeu
│   ├── Événements
│   └── Règlement HRP
│
├── Ma fiche — personnage lié requis
│   ├── Identité, avatar et serment
│   ├── PV / énergie physique / énergie magique
│   ├── Niveau, XP et progression du serment
│   ├── Équipement
│   ├── Inventaire et déclaration de consommation
│   ├── Historique des modifications et récompenses
│   ├── Journal de bord
│   ├── Historique de combat
│   └── Branche et paliers du serment
│
├── Notifications — cloche, alimentée par l'historique du personnage
│
├── Paramètres
│   ├── Compte : avatar, mot de passe, session, déconnexion
│   ├── Export de la fiche en PDF
│   ├── Suppression de son compte, hors compte administrateur
│   └── Collection : thèmes possédés et apparence
│
├── Outils — accès selon le rôle
│   ├── Joueurs                         [MJ / admin]
│   ├── Simulation                      [MJ / admin]
│   │   └── Sauvegardes et archives de combat
│   ├── Apparitions                     [MJ / admin]
│   ├── Atelier bestiaire               [designer / admin]
│   ├── Atelier serments                [admin]
│   └── Administration                  [admin]
│       ├── Vue d'ensemble
│       ├── Comptes
│       ├── Thèmes
│       └── Log
│
└── « Jeu RPG » — second raccourci vers le même prototype
```

### Accès et particularités

- Le parcours public principal conduit à l'inscription ou à la connexion. Il n'offre pas encore une vitrine structurée de l'univers avant inscription.
- Le prototype est une exception : il peut ouvrir le shell de l'application sans connexion. Le menu Explorer devient alors accessible par ce détour. Cela ne remplace pas un parcours public explicite.
- Un compte joueur peut exister sans personnage. La liaison compte/personnage relève de l'administration ; la fiche reste indisponible tant qu'elle n'est pas faite. Certains messages parlent encore d'une intervention du MJ : le vocabulaire doit être aligné sur les droits réels.
- « Ma fiche » est accessible par l'avatar, les accès rapides et le menu mobile. Elle mérite une entrée principale plus explicite.
- Le règlement contient aussi les textes d'information sur le site et les données. Leur présence ne vaut pas validation juridique ; le sujet ici est leur emplacement dans la navigation.

## 3. Inventaire des fonctionnalités

« Présent » signifie implémenté dans le code étudié, sans garantir à lui seul chaque parcours sur le site publié.

| Domaine | Fonctionnalités présentes | État et limites |
|---|---|---|
| Univers | Synopsis, système de jeu, règlement HRP | Contenu consultable ; découverte publique à mieux organiser. |
| Serments | Catalogue, catégories de combat, rangs, lignées, branches et paliers | Base riche. Certaines évolutions sont volontairement hors vitrine ; ne pas promettre tout le catalogue comme contenu disponible. |
| Bestiaire | Recherche, filtres, tris, fiches, statistiques, compétences, comportements et zones | Lecture et outils de création présents ; les créatures masquées/archivées ne font pas partie du catalogue joueur. |
| Personnage | Ressources, niveaux, XP, serment, équipement, inventaire, historique, journal, avatar, export PDF | Cœur du compagnon. Plusieurs sections sont réunies dans une longue fiche. La déclaration de consommation nécessite une réparation de son parcours de sauvegarde. |
| Compte et apparence | Inscription, connexion, changement/réinitialisation du mot de passe, session, thèmes et collection, suppression de son compte | Parcours présents. L'inscription ne crée pas automatiquement un personnage jouable dans le compagnon. |
| Événements | Liste à venir/passée, types, date, description, visibilité, participants, boutons d'inscription | Affichage et édition présents. Inscription/désinscription joueur bloquées par les permissions de sauvegarde actuelles ; accueil et événements utilisent des champs différents. |
| Gestion des personnages | Recherche, création, objets, XP personnage/serment, historique ; opérations sensibles réservées à l'admin | Outil opérationnel étendu. Distinguer le personnage du compte qui y est lié. |
| Simulation | Composition des combattants, initiative, rounds, déclaration/résolution, actions, statuts, invocations, notes, annulation, fin de combat, archives, export texte | Un vrai outil de MJ. La fin de combat et l'archivage doivent rester dans la recette des parcours critiques. |
| Apparitions | Tirage par zone, groupes/quantités, pondération, historique, transfert vers un pré-combat | Déjà relié à la préparation des combats. À regrouper avec les outils de partie. |
| Création | Ateliers bestiaire et serments ; images, aperçu, duplication, publication/masquage, archivage et JSON pour le bestiaire | Présent, avec droits différents. Le designer n'a pas accès à l'Atelier serments dans le menu actuel. |
| Administration | Vue d'ensemble, comptes/rôles/liaisons, thèmes, historiques, diagnostics, import/export JSON | L'import/export de l'interface est partiel : ce n'est pas une sauvegarde complète du site. |
| Carte du monde du compagnon | Code de carte et gestion de lieux | Dormant : rendu désactivé et absence d'entrée de navigation. À réintégrer volontairement ou à retirer. Distinct de la carte du RPG. |
| RPG | Exploration, combats, objets, boutique, progression, objectifs et sauvegarde | Prototype solo jouable. Présence simulée/localement partagée, sans multijoueur distant. |

## 4. Qui fait quoi aujourd'hui ?

| Profil | Parcours principal | Limites importantes |
|---|---|---|
| Visiteur | Découvrir l'accueil, lire le règlement, s'inscrire, se connecter, essayer le RPG | Pas encore de navigation publique claire dans les références du compagnon. |
| Compte en attente | Se connecter, consulter les références, personnaliser son compte, attendre une liaison | Pas de fiche de personnage dans le compagnon avant liaison. |
| Joueur avec personnage | Consulter sa fiche, modifier son journal/avatar, voir événements et références, gérer son compte et ses thèmes | Statistiques et récompenses gérées par les outils habilités. Certains boutons de participation/consommation restent à réparer. |
| MJ | Gérer les personnages dans son périmètre, attribuer objets/XP, préparer des rencontres, simuler et archiver | Pas d'administration des comptes/rôles, de suppression des personnages ni de modification de leur identité/serment. |
| Designer | Créer et entretenir le bestiaire ; certaines opérations sur les événements | Pas d'espace MJ ni d'Administration ; Atelier serments absent de son menu actuel. |
| Admin | Tous les espaces, comptes, rôles, liaisons, ateliers, réglages et diagnostics | Séparer au maximum gestion quotidienne et opérations sensibles dans les parcours futurs. |

Cette matrice décrit les accès proposés dans l'interface. Les autorisations serveur ne se superposent pas encore parfaitement aux menus, notamment pour les événements et certains contenus.

## 5. Les écarts à traiter avant d'ajouter des fonctionnalités

### A. Des actions joueur visibles mais non sauvegardables

La déclaration de consommation, l'inscription/désinscription à un événement et l'effacement de notifications utilisent encore des écritures génériques sur les personnages ou événements. Le serveur refuse ces écritures à un joueur. L'action dédiée à son propre personnage n'accepte actuellement que le journal et l'avatar.

**Conséquence :** un bouton présent dans la fiche ou l'agenda n'est pas la preuve d'un parcours terminé. Il faut des opérations dédiées, limitées au joueur concerné, avec confirmation après sauvegarde et vérification après rechargement. Il ne faut pas résoudre le problème en ouvrant l'écriture de toute une collection aux joueurs.

### B. Le prochain événement de l'accueil est déconnecté du format enregistré

L'accueil attend `published`, `dateTs` et `titre`, tandis que l'éditeur enregistre `hidden`, `date` et `nom`. Aucun adaptateur correspondant n'a été trouvé dans le parcours étudié.

**Conséquence :** un événement créé dans l'outil peut ne pas apparaître dans « Prochain événement ». Unifier le format et utiliser la même sélection des événements dans l'accueil et leur page.

### C. L'organisation reflète l'empilement des fonctions

Les événements sont rangés sous « Règles », les archives restent dans Simulation, les paramètres regroupent compte et collection, le prototype dispose de plusieurs entrées. La fiche et la gestion des comptes/personnages gagneraient à être plus faciles à distinguer.

**Conséquence :** la prochaine évolution visible devrait porter sur les parcours et les intitulés, avant une nouvelle couche de décoration ou de menus.

### D. Les rôles des événements sont incohérents

Tous les rôles staff voient la création ; l'interface réserve principalement la modification, la visibilité et la suppression aux admin/designer. La création d'un événement publié tente ensuite d'écrire une notification dans les personnages, alors que le designer n'a pas ce droit générique.

**Conséquence :** définir qui organise les événements, puis aligner affichage, sauvegarde et notifications. La publication doit réussir comme un parcours complet, ou expliquer précisément ce qui a échoué.

### E. La promesse du RPG dépasse certaines fonctions réelles

Le module dispose de 7 zones, 4 ennemis, 6 objets et 4 objectifs d'initiation. La boucle exploration → combat → récompense → équipement existe. En revanche :

- « Joueurs ici » mélange des personnages fictifs et une présence entre onglets du même navigateur ; ce n'est pas une liste de joueurs connectés à distance.
- Les combats proposent attaque, potion et fuite. L'énergie magique est affichée sans compétence qui la dépense dans cette boucle.
- Les achats existent, pas la vente d'objets malgré une mention narrative qui la suggère.
- Le personnage RPG a son inventaire et sa progression, mais récupère aussi des attributs de la fiche du compagnon au chargement. Le contrat entre les deux progressions n'est pas encore clair.
- Les règles et récompenses restent calculées dans le navigateur. Une sauvegarde serveur n'en fait pas une économie multijoueur validée par le serveur.

**Recommandation :** conserver un espace « RPG — expérimental », avec une progression explicitement séparée tant qu'une intégration complète n'est pas décidée.

### F. La visibilité du journal doit correspondre à ce qui est annoncé

L'interface annonce un journal visible uniquement par son propriétaire et les administrateurs, alors que le MJ peut également le lire. Définir le public voulu, puis aligner le message et les accès avant d'encourager les joueurs à y déposer des notes confidentielles.

## 6. Plan cible proposé

Cette arborescence est une proposition d'organisation. Elle ne décrit pas des pages déjà créées. La majorité des fonctions peut être réutilisée.

```text
Nuages Polaires
├── Accueil
│   ├── Présentation de NP et du roleplay sur Discord
│   ├── Découvrir l'univers
│   ├── Comment rejoindre / premiers pas
│   └── Se connecter / reprendre son aventure
│
├── Univers
│   ├── Histoire et synopsis
│   ├── Serments
│   ├── Bestiaire
│   └── Monde et lieux                    [à réintégrer, ensuite]
│
├── Règles
│   ├── Guide de démarrage                [à créer]
│   ├── Système de jeu
│   └── Règlement HRP
│
├── Mon aventure                         [compte connecté]
│   ├── Tableau de bord personnel
│   ├── Mon personnage
│   │   ├── Fiche et progression
│   │   ├── Serment et capacités
│   │   ├── Inventaire et équipement
│   │   └── Journal
│   ├── Mes combats / historique
│   └── Mes inscriptions aux événements [à fiabiliser et regrouper]
│
├── Événements
│   ├── À venir / passés
│   ├── Détail et participants
│   └── Participer / se désinscrire       [à réparer]
│
├── RPG — expérimental
│   ├── Démarrer / reprendre
│   ├── Carte et exploration
│   ├── Combat
│   ├── Personnage, inventaire et boutique
│   └── Objectifs et journal d'aventure
│
├── Équipe                               [visible selon le rôle]
│   ├── Maîtriser une partie
│   │   ├── Personnages
│   │   ├── Rencontres / apparitions
│   │   ├── Simulation
│   │   ├── Archives
│   │   └── Gestion des événements
│   ├── Création
│   │   ├── Atelier bestiaire
│   │   └── Atelier serments             [droits à décider]
│   └── Administration
│       ├── Vue d'ensemble
│       ├── Comptes, rôles et liaisons
│       ├── Thèmes et attributions
│       ├── Données / imports / exports
│       └── Journaux et diagnostics
│
├── Mon compte                           [menu du profil]
│   ├── Identité et avatar
│   ├── Mot de passe et session
│   ├── Collection et apparence
│   └── Export de fiche / suppression du compte
│
└── Pied de page
    ├── Aide / contacter le staff sur Discord
    ├── Informations sur le site et les données
    └── Version / nouveautés              [à formaliser]
```

Principes de navigation :

- **Univers et Règles** regroupent la documentation. Leur ouverture publique explicite est proposée, en conservant le masquage des contenus réservés.
- **Mon aventure** devient l'entrée quotidienne du joueur, avec sa fiche et ses prochaines actions.
- **Événements** obtient sa propre rubrique. La consultation publique éventuelle doit être décidée ; les inscriptions nécessitent un compte.
- **Équipe** n'est montré qu'aux rôles concernés ; chacun ne voit que ses outils autorisés.
- **RPG — expérimental** possède un seul intitulé et une entrée de navigation cohérente.
- **Mon compte** reste distinct de **Mon personnage**.

Sur mobile, présenter les mêmes rubriques dans le même ordre, avec un accès direct à « Mon aventure ». Il n'est pas nécessaire de transformer chaque sous-section en une nouvelle page dès la première itération.

## 7. Parcours de référence à terminer

1. **Nouveau joueur** : comprendre NP → rejoindre la communauté → lire le règlement → créer un compte → voir clairement son attente de liaison → recevoir l'accès à son personnage → savoir quoi faire ensuite.
2. **Joueur régulier** : reprendre sa fiche → voir ses ressources et son prochain événement → s'inscrire ou déclarer une consommation → obtenir une confirmation de sauvegarde → retrouver le même résultat après rechargement.
3. **MJ** : choisir les personnages et une zone → tirer une rencontre → préparer le combat → jouer les rounds → valider les conséquences → retrouver l'archive et les fiches mises à jour.
4. **Créateur de contenu** : créer une créature → vérifier sa fiche → configurer ses apparitions → publier → la retrouver dans le bestiaire et les outils de rencontre.
5. **Joueur du prototype** : comprendre le statut expérimental → démarrer/reprendre → explorer et progresser → retrouver sa sauvegarde → comprendre ce qui est indépendant de sa fiche JDR.

## 8. Ordre de reprise recommandé

| Étape | Travail | Résultat attendu |
|---|---|---|
| 1 — Fiabilité des actions | Réparer consommation, inscriptions, notifications et prochain événement ; harmoniser les droits événementiels | Chaque action proposée aboutit, ou explique son échec sans simuler une réussite. |
| 2 — Navigation | Entrée Mon aventure, séparation personnage/compte, événements hors Règles, regroupement des outils d'équipe, intitulé RPG unique | Joueur, MJ et designer retrouvent leurs tâches sans connaître l'organisation interne du code. |
| 3 — Accueil et premiers pas | Présentation publique, découverte de l'univers, guide de démarrage, état de liaison explicite | Un nouveau venu comprend le projet et la prochaine étape. |
| 4 — Cohérence de la boucle JDR | Parcours rencontres → combat → récompenses → fiche → archives ; recette des rôles sur une base isolée | Une session de jeu complète est cohérente et récupérable en cas d'échec partiel. |
| 5 — Évolution du RPG | Décider progression séparée/commune ; corriger les promesses ; approfondir coûts, capacités et objectifs | Un prototype cohérent avant d'étendre contenu ou multijoueur. |
| 6 — Extension du monde | Décider de réintégrer la carte ; enrichir lieux, liens avec le bestiaire et récits de campagne | Du contenu relié aux usages réels, après stabilisation du socle. |

Les améliorations de déploiement et la recette distante déjà documentées restent un préalable à la publication de la branche corrigée. Elles ne sont pas des rubriques à ajouter dans les parcours joueurs.

## 9. Décisions produit à prendre ensemble

- **Priorité du projet** : recommandation initiale, stabiliser le compagnon de JDR et maintenir le RPG comme expérience distincte.
- **Visibilité de l'univers** : quelles informations un visiteur découvre-t-il librement, et lesquelles dépendent de l'avancement d'un personnage ?
- **Responsabilité des événements** : MJ organisateurs, designers contributeurs, admin superviseur ? Il s'agit d'une proposition, pas des droits actuels.
- **Périmètre du designer** : bestiaire uniquement ou également serments et contenus d'univers ?
- **Carte du monde** : outil narratif du compagnon, carte de jeu du RPG, ou deux vues assumées avec des usages différents ?

## 10. Repères pour l'implémentation

Références relatives au dépôt ; numéros de lignes relevés sur le commit étudié.

| Sujet | Sources |
|---|---|
| Écrans publics et navigation | `index.html:6537`, `:6659`, `:6725`, `:6810`, `:7020`, `:7044`, `:7087` |
| Permissions et lancement | `assets/js/main.js:1870`, `:1914`, `:4325`, `:4395`, `:5481` |
| Profil, collection, fiche | `assets/js/main.js:3000`, `:3908`, `:5675`, `:5761`, `:5804` |
| Bibliothèque et ateliers | `assets/js/main.js:6065`, `:6169`, `:7224` ; `assets/js/beast-admin.js` |
| Accueil et références | `assets/js/main.js:8000`, `:8169`, `:8196`, `:8519` |
| Personnages, simulation, apparitions | `assets/js/main.js:8874`, `:9091`, `:11774`, `:12146`, `:14100`, `:14291` |
| Administration | `assets/js/main.js:4781`, `:10171`, `:10744` ; `assets/js/admin-dashboard.js` |
| Consommation et notifications | `assets/js/main.js:5967`, `:9837` ; chaîne `up` → `sp` → `sv`, lignes `:1585`, `:1559`, `:1533` |
| Événements et incohérence de format | `assets/js/main.js:8060`, `:8112`, `:14905`, `:15029`, `:15089` |
| Autorisation des écritures joueur | `netlify/functions/db.js:89`, `:166`, `:197`, `:849`, `:889` |
| Carte dormante | `assets/js/main.js:5592`, `:15136` |
| Prototype | `assets/js/rpg-prototype.js:10`, `:19`, `:59`, `:78`, `:138`, `:176`, `:182` |
| État technique et publication | `docs/security-and-data.md`, `docs/infrastructure-review-2026-09-21.md` |

Aucun comportement de l'application n'a été modifié pour produire ce plan.
