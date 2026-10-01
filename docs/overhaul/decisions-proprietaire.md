# Nuages Polaires — décisions qui t'appartiennent

Ce document liste ce que l'overhaul ne peut pas trancher à ta place. Pour chaque point : ce qui a été constaté, ce que le nouveau site fait **par défaut** en attendant ta réponse, et ce qu'il suffit de changer. Rien ici ne bloque la construction.

## 1. Les règles de combat : l'ancien simulateur ne suit pas le Système de jeu publié

En reconstruisant le moteur de la Table à partir du code de l'ancien simulateur, quinze écarts sont apparus entre ce que le simulateur **applique** et ce que la page « Système de jeu » **dit**. Le nouveau moteur reproduit fidèlement le simulateur (c'est ce que tes MJ utilisent aujourd'hui), et le texte du Système de jeu est repris mot pour mot. Les deux restent donc en désaccord tant que tu n'as pas choisi.

| Sujet | Ce que le simulateur applique | Ce que dit la page publique |
|---|---|---|
| Initiative | choisie par le MJ, réordonnable | premier agresseur, conservée tout le combat |
| Déroulé d'un round | tout le monde déclare, puis résolution des attaques, puis des soins et capacités | tour séquentiel, J1 puis J2 |
| Parer | 0 EP, −25 % (joueurs) | parade narrative −25 %, sans coût chiffré |
| Bloquer | joueur : 5 EP, −50 % ; créature : 2 EP, −25 % | sans bouclier : 2 EP, −25 % ; avec bouclier : 5 EP, −50 % |
| Pugilat | 4 + niveau, 6 EP | 3 + niveau, 6 EP |
| Tir | n'existe pas (une Frappe à 6 EP) | Tir à l'arc : 4 EP |
| Invoquer son Serment | action absente | 1 EM |
| Objets | pas d'action ; ajustement à la main par le MJ | utiliser ou recevoir un objet : 0 EP |
| Déplacement | 10 EP, purement narratif | 10 EP, met hors de portée du corps à corps |
| Épuisement | EP ramenée à 0, l'action s'exécute quand même | EP à 0 : effondrement ; EP insuffisante : action impossible |
| Surcadençage | non implémenté | multiplicateurs ×2, ×2,5, ×3… |
| Posture Haute (Claymore) | dure jusqu'à une Frappe Haute | « jusqu'au prochain tour » |
| Compteur élémentaire (Elementaliste) | remis à zéro à chaque round ; Foudre 6 EM, Eau 4 EM | compteur ±2 ; Foudre 4 EM, Eau 6 EM |
| Invocations | 2 actions, sans coût en EM pour le porteur | coût en EM par action, disparition si l'EM manque |
| Repos court | le bouton **retire** 50 % de l'EP max | repos et repas **restaurent** EP et EM |

**Par défaut** : la Table, la ligne de déclaration du joueur et la « règle sous le pouce » lisent une seule table (`src/lib/game/rules.ts`) réglée sur le simulateur ; la page Système de jeu porte une note de marge qui le dit. **Pour changer** : chaque ligne de cette table se corrige en une modification ; dis-moi, sujet par sujet, laquelle des deux colonnes est la bonne (ou une troisième valeur). Le repos court qui retire de l'EP ressemble à un bug de l'ancien site : je te recommande de le corriger en priorité.

Les capacités de Bretteur et de Lame d'Honneur, et celles des Serments personnalisés, sont interprétées à partir du texte de leurs paliers (comme dans l'ancien site) : si un effet n'est pas reconnu, le MJ l'applique à la main.

Dans l'ancien simulateur, une invocation ajoutée en cours de combat n'entrait jamais dans l'ordre de tour (elle ne jouait pas). Le nouveau moteur reproduit ce comportement. Si c'était un défaut, dis-le : c'est une ligne à changer.

## 2. Qui lit le journal d'un personnage

Aujourd'hui le serveur le sert au joueur, aux MJ et aux administrateurs, alors que l'ancienne interface annonçait « propriétaire et administrateurs ». **Par défaut** : lisible par le joueur, les MJ et les administrateurs, et l'interface l'écrit en toutes lettres partout où le journal apparaît. **Pour changer** : une ligne dans la matrice des droits et une phrase.

## 3. Connexion par Discord

Elle est construite mais **éteinte**. Pour l'allumer, il faut créer une application sur le portail développeur de Discord (c'est ton compte, je ne peux pas le faire à ta place), puis renseigner `DISCORD_CLIENT_ID` et `DISCORD_CLIENT_SECRET` dans Netlify. La connexion par pseudo et mot de passe reste toujours disponible. Le lien d'invitation du serveur affiché en pied de page se saisit dans Le Registre › Données.

## 4. Les données réelles et le basculement

Le nouveau site utilise un schéma de base différent ; un script de migration reprend comptes, personnages, bestiaire, Serments, rendez-vous, archives, journaux et thèmes depuis l'ancienne table `np_store`. Il est testé sur des données fictives. Avant de basculer, il faudra le faire tourner **sur une copie de tes vraies données** : l'ancien site sait produire cette copie (`npm run backup:store` dans `legacy/`, avec l'adresse de ta base Neon). Je ne l'ai pas fait : je n'ai pas tes identifiants, et c'est une opération que tu dois décider. Tant que tu n'as pas basculé, `main` et le site en ligne ne changent pas.

Les mots de passe sont conservés : chacun se reconnecte avec le sien, et il est ré-enregistré dans un format plus sûr à la première connexion. Nouveau minimum : 8 caractères (les anciens mots de passe plus courts continuent de fonctionner).

## 5. Ce qui disparaît volontairement

- Le prototype RPG, sa carte, ses combats, sa boutique et leurs données.
- La carte du monde dormante et les lieux saisis dedans (listés dans le rapport de migration, non repris).
- Les cinq compteurs de l'accueil (« créatures vaincues », « gemmes distribuées »…), remplacés par des pages publiées par les MJ.
- Les ambiances animées des thèmes (étoiles, neige, œufs) : un thème change les couleurs, plus la mise en page.
- La cloche de notifications : remplacée par les cornes sur « Dernières pages ».

Si l'un de ces points te manque, dis-le : rien n'est supprimé de l'ancien site, qui reste dans `legacy/`.

## 6. Périmètre du designer

**Par défaut** : il édite le bestiaire, organise des rendez-vous (sans prévenir les joueurs), voit le calque réservé du bestiaire ; il n'a accès ni aux Serments (administrateur seul), ni aux personnages, ni à la Table.

## 7. La branche « ajout-dossier-nuages-polaires »

Au début de la session tu m'as demandé un dossier `Nuages Polaires/` ; il est sur une branche à part avec un simple README. L'overhaul vit sur la branche `overhaul`, à la racine du dépôt. La première branche peut être supprimée, sauf si tu avais un autre usage en tête.
