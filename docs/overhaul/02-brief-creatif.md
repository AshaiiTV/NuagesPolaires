# Nuages Polaires — brief créatif de l'overhaul

Rédigé le 30 septembre 2026 par le lead (Claude), après lecture du dépôt v297, du plan du site, de la charte Mystique polaire, de l'avis indépendant de GPT (`audit/gpt-lecture-produit.md`) et d'une visite du site actuel.

## Décision du propriétaire

Tout refaire. Carte blanche sur la forme et la technique. Une seule contrainte, non négociable : **le site est un compagnon de jeu**, pas un jeu. Le jeu se joue sur Discord, en texte. Le prototype RPG, la carte explorable, les combats jouables en solo disparaissent. Le propriétaire veut être **surpris par la qualité** : beau, original, créatif, "all in".

## Ce qu'est un compagnon de jeu ici

La table est sur Discord. Le compagnon tient ce que Discord ne tient pas :

| Besoin de la table | Ce que le compagnon garde |
|---|---|
| Savoir qui je suis | mon personnage, son Serment, ses capacités au niveau actuel |
| Savoir où j'en suis | PV / énergies, niveau et XP, équipement, inventaire, gemmes |
| Se souvenir | journal, récits de combat, historique des récompenses, événements passés |
| Se coordonner | agenda, inscriptions, notifications, prochain rendez-vous |
| Comprendre le monde | synopsis, Serments, bestiaire, système de jeu, règlement, premiers pas |
| Arbitrer (MJ) | simulation de combat, apparitions, récompenses, archives, gestion des personnages |
| Faire vivre (designers, admin) | ateliers bestiaire et Serments, comptes, rôles, liaisons, thèmes, journaux |

Tout ce qui n'entre pas dans ce tableau est suspect.

## L'idée directrice : la trace

Le site actuel parle déjà de traces ("Les traces de notre passage", "Laissez votre trace", "Les traces du voyage"). C'est la bonne idée, elle n'est pas encore tenue jusqu'au bout. **Chaque acte de jeu laisse une trace ; le compagnon est l'endroit où les traces s'accumulent et redeviennent lisibles.** Un personnage n'est pas un tableau de bord avec quatre gros chiffres : c'est un fil de traces (niveau gagné, gemme fusionnée, combat archivé, note de journal, rendez-vous honoré) que l'on remonte. Le serveur n'est pas une liste de métriques : c'est une chronique.

Conséquences de design :

1. **Le Fil** remplace le tableau de bord. En ouvrant le compagnon, on lit ce qui s'est passé depuis la dernière fois, ce qui vient, et ce qui attend une action. Le fil est le cœur de l'expérience joueur.
2. **En scène** : un mode compact, mobile d'abord, pensé pour être ouvert *pendant* une scène Discord. Ressources avec ajustements déclarés, capacités disponibles à ce niveau, règle pertinente sous la main, bloc de statut prêt à coller dans Discord. Jamais plus de ce qui sert à la scène en cours.
3. **La Table** : quand un MJ conduit un combat dans le simulateur, les joueurs concernés voient l'état du combat se mettre à jour sur leur téléphone, en lecture. Le MJ arbitre, les joueurs écrivent sur Discord, le compagnon reflète. Ce n'est pas un jeu : personne ne clique pour attaquer.
4. **Le Codex qui se révèle** : le bestiaire public ne montre d'une créature que ce que le serveur a réellement rencontré (archives de combat) ; les observations se débloquent avec les rencontres. Les secrets MJ restent secrets. La référence devient une mémoire collective.
5. **La Chronique publique** : la page d'accueil montre un monde vivant (événements passés et à venir, récits publiés) au lieu de compteurs.
6. **Discord est chez lui ici** : connexion par Discord (optionnelle, à côté du mot de passe), liens directs vers les salons, blocs prêts à coller, notifications d'événements vers Discord (optionnel, webhook).

## Identité visuelle

On garde et on approfondit **Mystique polaire** : nuit d'encre, ivoire, aurore, laiton pâle ; Cormorant Garamond pour la voix, Manrope pour l'interface ; la boussole ; le paysage sans constructions ; les repères de coordonnées ("NP / 01 — APRÈS LE BASCULEMENT") ; les chapitres numérotés. La page d'accueil actuelle est belle : l'objectif est de mettre **tout le site** à ce niveau, y compris les outils staff, et de tenir la promesse sur téléphone.

Ce qu'on ajoute : de l'air, de la matière (grain, encre, brume animée avec respect de `prefers-reduced-motion`), des transitions de pages qui donnent l'impression de tourner une page, une typographie de carnet pour le journal, une seule façon de faire chaque chose. Ce qu'on retire : les halos, les cadres imbriqués, les six couches de patchs qui se contredisent, les tableaux de bord à gros chiffres, tout vocabulaire de jeu vidéo ("joueurs ici", boutique, objectifs).

Les thèmes personnels (collection débloquée par le staff) sont conservés comme récompense : ils changent les couleurs, jamais la structure.

## Voix

Tutoiement, phrases courtes, présent. Le compagnon s'adresse au joueur comme un carnet qui aurait une voix : « Les récits restent à écrire. » est le bon ton. Jamais de faux enthousiasme, jamais de chiffres inventés, jamais d'annonce de succès avant confirmation serveur.

## Technique (décidée)

- **SvelteKit 2 + Svelte 5 + TypeScript**, adapter Netlify. Pages publiques prérendues ou rendues serveur ; espaces connectés rendus serveur puis hydratés ; chargement par route. Vanilla CSS avec design tokens (pas de framework CSS) pour garder une identité non générique.
- **Neon Postgres** conservé, avec un **schéma relationnel propre** (comptes, personnages, serments, créatures, événements, participations, archives de combat, notifications, journal d'audit) et un **script de migration depuis `np_store`** testé sur fixtures. Accès SQL uniquement côté serveur, permissions explicites par rôle, contrôle de version optimiste conservé.
- **Auth** : sessions serveur (cookie httpOnly), mots de passe rehachés en scrypt à la première connexion (les hashes hérités `sha256:` sont vérifiés puis remplacés), rôles joueur / MJ / designer / admin, liaison compte ↔ personnage, réinitialisation admin à usage unique. Discord OAuth en option (variables d'environnement).
- **Tests** : Vitest (règles de jeu, permissions, migration) sur PGlite ; Playwright (parcours de référence) ; contrôle visuel à 390 / 768 / 1440 px.
- **Livraison** : branche `overhaul`, l'ancien site conservé dans `legacy/` le temps de la migration ; `main` reste la production jusqu'au basculement décidé par le propriétaire.

## Ce qu'on préserve à l'identique

Les règles de jeu (progression `niveau × 30`, gains par Serment, paliers, gemmes +5/+20/+50, système de combat du simulateur), les contenus éditoriaux (synopsis, règlement, système de jeu, Serments), les données des joueurs, les permissions serveur, les garanties de non-écrasement.

## Critère de fin

Claude et GPT relisent le produit livré — parcours joueur, MJ, designer, admin, sur téléphone et ordinateur — et n'ont plus rien à corriger d'important. Tant qu'un des deux a une réserve, on continue.
