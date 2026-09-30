# Direction « En scène » — La Marge

Direction de création rédigée le 30 septembre 2026, angle « en scène » (utilité radicale pendant la partie). Lecture préalable : brief créatif, charte Mystique polaire, plan du site, lecture produit de GPT, audit de l'accueil public, règles du système de jeu telles qu'affichées dans `main.js` (coûts d'actions, statuts, paliers, gemmes). Aucune règle ni contenu d'univers n'est inventé ici : les valeurs citées (6 EP la Frappe, 8 EP l'Esquive, +5/+20/+50 XP des gemmes, paliers 2/5/7/10) sont celles du système existant.

## 1. Nom et principe

**La Marge.** Pendant que la scène s'écrit sur Discord, le compagnon est la marge de la page : tout ce dont la scène a besoin tient sous le pouce, en trois secondes, et rien d'autre n'y est.

## 2. Critique du brief du lead

Ce qu'il a raison de tenir : l'idée de la trace (chaque acte laisse une trace lisible), l'interdiction du vocabulaire de jeu vidéo, la voix du carnet, Mystique polaire comme socle, SvelteKit avec CSS vanilla et tokens, « une seule façon de faire chaque chose ». La Table en lecture seule est la meilleure idée du brief : elle transforme le simulateur MJ en instrument de table sans en faire un jeu.

Ce qu'il rate depuis mon angle :

- **Il range « En scène » en deuxième conséquence, comme un mode parmi six.** C'est l'inverse : la partie est le seul moment où le compagnon est réellement ouvert à côté de Discord. Le Fil, le Codex, la Chronique se consultent entre deux parties ; En scène se consulte *pendant*, avec une main, sous pression narrative. Ce moment doit dicter la structure de tout le site, pas en être une pièce.
- **Le Fil comme cœur de l'expérience joueur suppose qu'on ouvre le site pour lire.** On l'ouvre surtout pour vérifier : combien d'EP il me reste, ce que fait mon palier 5, combien coûte une Esquive, quel bloc coller. La lecture des traces vient après, quand la scène est finie. Le Fil reste, mais il n'est pas la première chose sous le pouce.
- **Le brief parle de « brume animée », de « tourner une page », de matière.** Tout cela est juste hors scène et faux en scène : la brume derrière un chiffre de PV est une décoration qui coûte de la lisibilité et de la batterie. Il faut deux régimes visuels assumés, pas un seul regard.
- **Le Codex qui se révèle est une idée de contenu, pas d'usage.** Sa mécanique de déblocage par archives demande une règle de visibilité par champ de créature, coûteuse à construire et à expliquer ; il vaut mieux une révélation binaire (rencontré / jamais rencontré) et un lien vers les récits.
- **Rien sur l'ajustement déclaré comme trace.** Le brief cite « ressources avec ajustements déclarés » sans dire ce qu'on en fait. C'est pourtant l'acte de jeu le plus fréquent : chaque déclaration doit devenir une ligne datée, motivée, annulable, que le MJ voit. C'est ainsi que la trace devient réelle et non éditoriale.

## 3. Métaphore d'interface et système de composition

**Métaphore.** Un manuscrit a une page (Discord, où le texte s'écrit) et une marge (le compagnon), où l'on tient les gloses : chiffres, renvois, notes, rappels de règle. La marge ne raconte pas ; elle sert la page. Le compagnon possède donc **deux régimes** :

- **Régime Carnet** (hors partie) : air, paysage, Cormorant italique, chapitres numérotés, grain d'encre. C'est l'accueil actuel étendu à tout le site.
- **Régime Marge** (en partie) : dense, mat, Manrope et chiffres tabulaires, sans image, sans paysage, sans grain, une seule couleur d'accent. Le passage de l'un à l'autre est un geste unique et réversible (voir § 6, « le resserrement »).

**Grille.** Colonne de texte de 64 caractères maximum en Carnet. En Marge, la page est divisée en trois bandes fixes sur téléphone : *haut* = contexte (24 px de haut : qui je suis, où je suis), *milieu* = matière (défilante), *bas* = la main (barre de 56 px, toujours visible, sous le pouce droit ou gauche selon un réglage de compte). Sur ordinateur, la Marge est une colonne de 420 px maximum, ancrée à droite ou à gauche, pensée pour rester ouverte à côté de la fenêtre Discord ; le reste de l'écran est vide et sombre, sans fausse bannière.

**Rythme.** Base 8 px. Espacements Carnet : 24 / 40 / 72. Espacements Marge : 8 / 12 / 16. Aucune valeur intermédiaire.

**Matière.** Carnet : encre `#091519`, grain à 3 % d'opacité, séparateurs fins de 1 px ivoire à 12 %, paysage uniquement en pages de découverte. Marge : encre pleine sans grain, surfaces `#102327` sans bordure, séparateurs par espacement seul, chiffres toujours en tabulaire.

**Mouvement.** Trois animations autorisées et aucune autre : le resserrement (240 ms), la pulsation d'encre sur un chiffre qui change (400 ms, une fois), la remontée de la règle (200 ms). `prefers-reduced-motion` supprime les trois et remplace par un changement d'état instantané.

**Interdit.** Images et paysage en régime Marge ; modale par-dessus modale ; halos ; cadres imbriqués ; icônes sans libellé ; défilement horizontal ; gestes à deux mains ; toute cible tactile sous 44 px ; tout chiffre affiché sans sa source (un PV affiché est toujours celui du serveur, jamais une estimation) ; tout compteur global (« joueurs actifs », « créatures vaincues ») ; toute animation de récompense.

## 4. Navigation complète

Libellés exacts. Tout ce qui n'est pas autorisé pour le rôle n'est pas rendu (pas grisé : absent).

**Visiteur** (ordinateur : en-tête ; téléphone : menu replié en bas) : `L'univers` · `Les Serments` · `Le bestiaire` · `Les règles` · `L'agenda` · `Espace joueur ↗`. Le colophon garde `Règlement` et ajoute `Premiers pas`. L'entrée RPG disparaît.

**Joueur connecté.** Ordinateur : rail gauche fixe de 200 px, dans cet ordre : `Reprendre` (entrée par défaut), `Mon personnage`, `Journal`, `Agenda`, `Références` (dépliable : `Serments`, `Bestiaire`, `Système de jeu`, `Règlement`), puis, séparé par un trait, `Compte` derrière l'avatar. Un seul bouton d'accent, hors rail, en haut à droite : `En scène`. Téléphone : **barre de main** à cinq emplacements, `Reprendre` · `Personnage` · **`En scène`** (emplacement central, légèrement surélevé, seule surface sauge de l'écran) · `Agenda` · `Plus` (Journal, Références, Compte).

**MJ** : mêmes entrées que le joueur, plus une section `La Table` dans le rail (ordinateur) et dans `Plus` (téléphone) : `Combat`, `Apparitions`, `Archives`, `Personnages`. Quand un combat est ouvert, `En scène` du MJ conduit au combat en cours, pas à sa propre fiche.

**Designer** : entrées joueur, plus `Ateliers` : `Bestiaire`, et `Serments` si le propriétaire tranche en sa faveur (décision ouverte du plan, § 9). Pas de Table.

**Admin** : tout ce qui précède, plus `Administration` : `Comptes`, `Liaisons`, `Thèmes`, `Journal du site`, `Données`. L'admin qui joue voit d'abord ses écrans de joueur ; l'administration est la dernière entrée du rail.

**Adresses** : une route par écran (`/reprendre`, `/personnage`, `/scene`, `/journal`, `/agenda`, `/references/serments`, `/table/combat/[id]`, `/administration/comptes`), pas d'ancres `#`. Le bouton retour du navigateur fait toujours ce qu'on attend.

## 5. Écrans clés, zone par zone

### 5.1 Accueil public (régime Carnet)

Haut : masthead actuel conservé (wordmark, `LE COMPAGNON`, nav publique, `Espace joueur ↗`). Hero conservé tel quel : paysage, `Nuages / Polaires.`, tagline, bouton sauge `Rejoindre l'aventure ↗`, coordonnée `NP / 01 — APRÈS LE BASCULEMENT`, légende « Le monde n'est pas mort. Il attend. ».
Milieu : la section « Les traces de notre passage » **perd ses cinq compteurs** et devient la Chronique, réduite à deux blocs côte à côte (empilés sur téléphone) : *Prochaine scène ouverte* (titre, date en bloc calendrier, salon Discord, `Voir l'agenda →`) et *Dernier récit publié* (titre, date, deux lignes d'extrait, `Lire →`). Si l'un manque, le bloc dit « Rien d'annoncé pour l'instant. » et l'autre s'élargit. Puis `01 L'UNIVERS` et `02 LES SERMENTS` inchangés dans leur texte, avec sous `02` une liste des Serments publics (nom, rang Basique, une ligne). Invitation « Laissez votre trace. » conservée.
Bas : colophon `NUAGES POLAIRES — Le compagnon d'un monde à écrire.` · `Règlement` · `Premiers pas`.
Téléphone : hero réduit à 70 vh, paysage recadré sur la partie droite, texte en bas de l'image ; le reste en une colonne.

### 5.2 Reprendre (entrée du joueur connecté)

Haut (24 px, persistant sur tous les écrans connectés) : **la ligne d'état** — `Kael · niv. 7 · Duelliste · 24/30 PV · 38/50 EP · 12/20 EM`, en Manrope 13 tabulaire, ivoire, ressources en brume claire. Elle est la même partout ; en Marge elle devient la bande de contexte.
Milieu, dans cet ordre : (1) **Ce qui attend** — zéro à trois lignes d'action réelle : « Une scène est ouverte dans #salon — `En scène` », « Le combat *Nom* est en cours — `Suivre la Table` », « Tu es inscrit à *Événement* samedi — `Voir` ». Absent quand il n'y a rien : la page commence alors au Fil. (2) **Le Fil** — traces depuis la dernière visite, une ligne par trace, datées, verbe au présent : « Le MJ valide −18 PV (combat *Nom*). », « Tu fusionnes une Gemme Incarnate (+20 XP). », « Palier 5 atteint : *nom de la capacité*. » Un trait ivoire marque « Depuis ta dernière visite » ; en dessous, les traces plus anciennes, chargées par 20. Aucune trace n'est fabriquée : si rien, « Aucune trace depuis le 12 septembre. »
Bas : barre de main. Sur ordinateur, rail gauche, contenu centré à 640 px, `En scène` en haut à droite.

### 5.3 En scène (régime Marge) — l'écran de l'angle

C'est la fiche réduite à ce que la scène demande. Ouvert par le bouton central ; le site se resserre (§ 6).
Haut : bande de contexte : ligne d'état + à droite `Quitter la scène`. Si un combat de la Table implique ce personnage, une seconde ligne : `Round 3 · déclarations · à toi` (verrouillée sur le serveur).
Milieu, quatre blocs empilés, chacun une carte mate sans bordure : (1) **Ressources** — PV, EP, EM sur trois lignes, chiffre à 24 px tabulaire, jauge d'1 px sous le chiffre ; à droite de chaque ligne, un bouton `Déclarer` qui ouvre la bande de déclaration (§ 6, moment 2). Sous le bloc, les statuts actifs en pastilles texte (`Saignement · 2 tours`), jamais en icônes seules. (2) **Capacités à ton niveau** — uniquement les paliers atteints (niveau 7 : paliers 2, 5 et 7), nom + coût + une ligne d'effet, tels que saisis dans l'atelier Serments ; le prochain palier est une ligne grise : « Palier 10 — au niveau 10. » (3) **Bloc à coller** — aperçu monospace du bloc de statut Discord (§ 6, moment 3) et bouton `Copier pour Discord`. (4) **Note rapide** — un champ d'une ligne, `Noter pour le journal` ; la note part datée dans le journal avec la mention « notée en scène ».
Bas : barre de main réduite à trois emplacements : `Règle` (remonte la règle pertinente, § 6 moment 4), `Inventaire` (liste plate : objet, quantité, bouton `Consommer` avec confirmation en une ligne, parcours de consommation existant), `Journal`.
Ordinateur : la même colonne à 420 px, ancrée à droite, sur fond encre nu ; un bouton `Déplacer à gauche` en bas de colonne.

### 5.4 Mon personnage (Carnet)

Haut : portrait carré 96 px, nom en Cormorant 32, ligne « *Duelliste* — Serment Basique — niveau 7 », barre d'XP unique d'1 px avec `210 / 240 XP` (progression `niveau × 30` existante), ligne d'état.
Milieu : quatre chapitres numérotés `01 Ressources` (mêmes lignes qu'en scène, sans boutons Déclarer ; historique des déclarations dessous), `02 Serment` (rang, branche, quatre paliers en liste verticale avec un marqueur « tu es ici » ; les paliers non atteints en brume, texte complet lisible sans survol), `03 Équipement et inventaire` (équipé en premier, puis inventaire, puis gemmes avec `Fusionner` qui ouvre une confirmation « Fusionner une Gemme Blanche : +5 XP. » ; état vide réel), `04 Traces` (l'historique complet, filtrable : récompenses, combats, déclarations, notes). Navigation par chapitre en haut, ancrée, focus clavier déplacé.
Bas : `Exporter en PDF` · `Modifier le portrait`. Tout le reste (XP, objets, stats) n'est pas éditable ici : le joueur déclare, le staff attribue.
Téléphone : chapitres en accordéon fermé sauf `01`.

### 5.5 Journal (Carnet, typographie de carnet)

Haut : `Journal` en Cormorant, sous-ligne indiquant qui peut lire, alignée sur les droits réels du serveur (à trancher : « Toi et le staff. » tant que le MJ peut lire).
Milieu : entrées datées, texte en Cormorant 18 régulier, interligne 1.6, sans cadre, séparées par une date en petites capitales laiton. Une entrée notée en scène porte la mention `notée en scène · combat Nom` en brume. Champ de saisie en bas de liste, pas de modale.
Bas : `Nouvelle entrée`. Téléphone : identique, champ ancré au-dessus de la barre de main.

### 5.6 Agenda

Haut : `Agenda` · `À venir` / `Passés`.
Milieu : une carte par événement : bloc date (jour en Cormorant 32, mois en capitales), titre, type, salon Discord en lien direct, participants (noms, pas d'avatars), et une seule action : `Je viens` (devient `Inscrit — Me désinscrire`). Confirmation après réponse serveur seulement. Les événements masqués n'existent pas pour les joueurs.
Bas (staff) : `Nouvel événement`, formulaire en page dédiée, capacité, visibilité, notification facultative dont l'échec est distingué de la sauvegarde.

### 5.7 Références

**Serments** : liste (nom, rang, une ligne), puis fiche : quatre paliers en colonne, chaque palier avec son niveau, son nom et son texte ; pour un joueur connecté, son niveau marque « atteint » sans changer le texte. Aucun Serment hors vitrine n'est listé.
**Bestiaire** : recherche + filtres existants ; une fiche affiche le nom, la zone, les observations publiques ; les créatures que le serveur a rencontrées (archives terminées) portent la mention « Rencontrée — 3 récits » avec lien ; les autres portent « Jamais rencontrée. » Les statistiques réservées restent absentes du rendu joueur, pas cachées par CSS.
**Système de jeu et Règlement** : le texte actuel, découpé en sections adressables (`/references/systeme#actions`) pour que la règle sous le pouce (§ 6) pointe vers la bonne ancre.

### 5.8 La Table — combat vu par le MJ

Ordinateur, trois colonnes : gauche (280 px) **Combattants** dans l'ordre d'initiative, chacun : nom, PV/EP/EM en tabulaire, statuts, `Déclaré ●●○` ; centre **Round** : `Round 3 — Déclarations`, liste des déclarations par combattant (action, cible, coût), boutons `Résoudre le round` puis `Round suivant`, `Terminer le combat` ; droite (320 px) **Journal du combat** (log existant, une ligne par effet) et sous lui **Règle** (même mécanisme que côté joueur). Haut : nom du combat, `Sauvegarder`, `Archiver`. Rien de décoratif : pas de bannière « ÉTAT TACTIQUE », les quatre compteurs actuels deviennent une ligne : `6 combattants · 2 KO · Round 3 · 4/6 déclarés`.
Téléphone (MJ dépanne depuis son téléphone) : bande de round ancrée en haut, combattants en accordéon, journal derrière un onglet.
Avant démarrage : composition en deux listes `Élèves du Serment` / `Adversaires` avec cases, transfert depuis Apparitions conservé.

### 5.9 La Table — combat vu par un joueur (lecture seule)

Téléphone, régime Marge : haut `Combat Nom · Round 3 · Déclarations` ; milieu : **ma carte** en grand (PV/EP/EM 24 px, statuts, `Mes déclarations : Frappe → Loup, Esquive`), puis les autres combattants en lignes compactes (nom, PV en jauge d'1 px, statuts), alliés puis adversaires ; puis le journal du round résolu. Aucune commande : le joueur écrit sur Discord ; la page dit seulement « Le MJ résout. » ou « À toi de déclarer sur Discord. » Bas : `Copier mon état` · `Règle`. Rafraîchissement à chaque résolution (voir § 10).

### 5.10 Personnages (gestion, MJ/admin)

Haut : recherche, filtre par Serment et niveau. Milieu : liste dense (portrait 32 px, nom, niveau, Serment, ressources tabulaires, dernière trace) ; clic = volet latéral (ordinateur) ou page (téléphone) avec les mêmes quatre chapitres que la fiche joueur, éditables selon le rôle : `Attribuer XP`, `Donner un objet`, `Donner une gemme`, `Poser un statut`, chacun ouvrant une ligne de saisie inline avec motif obligatoire ; la saisie devient une trace visible par le joueur. Opérations sensibles (identité, Serment, suppression) réservées à l'admin et placées sous un chapitre `05 Sensible`, fermé par défaut.

### 5.11 Administration

Comptes (liste, rôle, état, `Lier à un personnage` en priorité, réinitialisation à usage unique), Liaisons (comptes en attente en tête : c'est la friction d'entrée signalée par GPT), Thèmes (attribution), Journal du site (audit lisible en Fil : « admin lie *compte* à *Kael* »), Données (export, import, sauvegardes). Même composition que Personnages : liste dense, volet latéral, aucune icône seule.

## 6. Cinq moments signature

1. **Le resserrement.** Appuyer sur `En scène` : en 240 ms, le paysage et le grain disparaissent, les marges passent de 24 à 12 px, Cormorant cède à Manrope, la coordonnée `NP / 01 — APRÈS LE BASCULEMENT` se réécrit en `SCÈNE · #salon · 21:42`. Le site n'ouvre pas un mode : il se resserre autour de la scène. `Quitter la scène` le rouvre à l'identique, à l'endroit d'où l'on venait.
2. **La bande de déclaration.** Sur une ressource, `Déclarer` fait remonter une bande d'une ligne de touches préremplies avec les coûts réels du système : pour EP, `−6 Frappe`, `−4 Tir`, `−8 Esquive`, `−2 Bloquer`, `−5 Bouclier`, `−10 Déplacer`, `−… autre` ; pour EM, `−1 Invoquer` puis les capacités du Serment au coût saisi dans l'atelier ; pour PV, `−… subis` et `+… soin`. Un appui = un ajustement déclaré, enregistré côté serveur comme trace « Kael déclare −8 EP (Esquive) », affiché en gris pendant 10 s avec `Annuler`, visible par le MJ sur la Table. Le chiffre ne change que lorsque le serveur confirme.
3. **Le bloc qui se plie.** `Copier pour Discord` produit un bloc monospace de trois lignes exactement tel qu'il s'affichera sur Discord (`Kael · niv. 7 · Duelliste` / `PV 24/30 · EP 30/50 · EM 12/20` / `Saignement 2 t.`) ; l'aperçu est le rendu réel. Après copie, le bouton devient `Copié — colle-le dans le salon.` pendant 4 s. Le MJ dispose du même bloc pour l'ensemble du round.
4. **La règle sous le pouce.** `Règle` ne montre jamais une recherche : il remonte une seule carte choisie par le contexte, avec son ancre. Phase de déclaration → tableau des actions et coûts ; un statut actif → sa définition ; EP sous 20 % → la règle de récupération ; niveau supérieur à la cible déclarée → actions par tour ; hors combat → le glossaire à la lettre du dernier mot cherché. Une ligne `Voir dans le système de jeu →` en bas.
5. **La Table qui respire.** Quand le MJ résout un round, chaque chiffre modifié pulse une fois en ivoire et garde son ancienne valeur en cendre pendant 4 s (`24 → 18`). Rien d'autre ne bouge, aucun son, aucune célébration ; seulement la ligne `Round 3 · résolu à 21:47` qui apparaît. Ainsi, un joueur qui lève les yeux de Discord sait en une seconde ce qui a changé et pourquoi.

## 7. Direction visuelle

**On garde** : palette Mystique polaire intégrale, Cormorant Garamond et Manrope hébergées, la boussole comme signature, le paysage sans constructions, les coordonnées, les chapitres numérotés, le bouton sauge de l'accueil (seule surface pleine de couleur du site).
**On ajoute** : le régime Marge et ses tokens ; une police mono OFL (IBM Plex Mono) pour les blocs Discord et les journaux de combat ; la couleur *Cendre* pour les valeurs fantômes ; les chiffres tabulaires partout ; une lisière d'1 px aurore à gauche de tout ce qui vient d'être confirmé par le serveur.
**On retire** : Cinzel, les compteurs, les halos, les icônes-emoji des statuts (remplacées par le libellé), les cadres imbriqués, les dégradés de panneau, les bannières HUD à quatre cellules, toute image en régime Marge.

Palette : Nuit d'encre `#091519` · Pierre sombre `#102327` · Brume profonde `#172E32` · Ivoire `#F0EEE5` · Brume claire `#BDCDC8` · Aurore `#95CDBB` · Laiton pâle `#C6B38B` · Sauge claire `#C6D8C4` · **Cendre** `#6F8480` (valeurs fantômes, paliers non atteints) · **Braise** `#C97A6A` (dégâts, danger, KO) · **Lichen** `#8FBF9A` (soin, confirmation) · **Encre de scène** `#060E11` (fond du régime Marge, plus fermé que l'encre du Carnet).

Typographie : Carnet — Cormorant 44/36/28 pour les titres, italique réservé au mot final d'un titre ; Manrope 16 texte, 14 secondaire, 12 repères en capitales espacées 0.18 em. Marge — Manrope 13 pour la bande de contexte, 24 tabulaire pour les ressources, 15 pour les capacités, 14 pour les boutons ; IBM Plex Mono 13 pour les blocs. Hauteur de cible 44 px minimum, 48 px dans la barre de main.

Motifs : trait fin ivoire à 12 % comme unique séparateur ; petit losange laiton devant les numéros de chapitre ; la lisière aurore comme marque de confirmation ; grain uniquement sur les pages de découverte.

Thèmes personnels : en régime Carnet, un thème remplace les huit tokens de couleur (les couleurs de danger, soin et Serment gardent leur sens) ; en régime Marge, il ne remplace que l'accent (`Aurore`) et la teinte de la bande de contexte, les fonds et le contraste des chiffres restant verrouillés. La structure ne change jamais.

## 8. Voix

Règles : tutoiement, présent, phrases de moins de douze mots en scène ; le compagnon ne dit jamais qu'une chose a réussi avant la réponse du serveur ; il nomme la cause d'une erreur et la suite possible ; il n'exclame pas ; il n'invente aucun chiffre ; en scène il parle moins qu'ailleurs.

1. Fil vide : « Aucune trace depuis le 12 septembre. »
2. Journal vide : « Les récits restent à écrire. »
3. Inventaire vide : « Rien dans les poches. »
4. Gemmes épuisées : « Plus de gemme à fusionner. »
5. Déclaration en attente : « Déclaré. Le serveur note. »
6. Déclaration confirmée : « −8 EP (Esquive). Annuler ? »
7. Copie réussie : « Copié — colle-le dans le salon. »
8. Erreur réseau en scène : « Pas de réseau. Tes chiffres restent ceux de 21:40. »
9. Conflit de version : « Quelqu'un a modifié la fiche entre-temps. Recharger. »
10. Passage en scène : « Le site se resserre. »
11. Round résolu (Table) : « Round 3 résolu à 21:47. »
12. Compte en attente de liaison : « Ton compte existe. Le staff le lie à ton personnage ; tu le verras ici. »

## 9. Position sur les six conséquences du brief

1. **Le Fil — transformer.** Il reste l'entrée par défaut, mais il passe après « Ce qui attend », et il est nourri d'abord par les déclarations, validations et attributions (traces vraies), pas par une chronique éditoriale.
2. **En scène — garder et élever.** C'est la colonne vertébrale : régime Marge, bande de déclaration, bloc à coller, règle sous le pouce. Tout le reste du site est conçu pour qu'on puisse en sortir et y revenir sans se perdre.
3. **La Table — garder.** Lecture seule stricte, aucune action joueur ; c'est la seule pièce qui exige une mise à jour quasi en direct, à traiter comme telle (§ 10).
4. **Le Codex qui se révèle — transformer.** Révélation binaire (rencontrée / jamais rencontrée) avec lien vers les récits ; pas de déblocage champ par champ. Même idée, dixième du coût, aucun risque de fuite de secret MJ.
5. **La Chronique publique — garder, en la réduisant.** Deux blocs (prochaine scène, dernier récit) au lieu de cinq compteurs. Un monde vivant se montre par une date et un récit, pas par des chiffres.
6. **Discord est chez lui ici — garder l'essentiel, différer le reste.** Blocs à coller et liens directs vers les salons sont indispensables et livrés d'abord ; OAuth Discord en option ; notifications par webhook reportées après la première mise en service, car elles créent une dépendance de plus sans servir la scène.

## 10. Risques et ce qui serait difficile à construire

- **La mise à jour en direct de la Table.** Netlify Functions ne tiennent pas de connexion ouverte durablement ; il faut soit un rafraîchissement par intervalle court (5 s, coût en requêtes acceptable pour une table de six), soit un service temps réel supplémentaire. La direction retient l'intervalle, et l'écran doit rester juste si la mise à jour échoue (horodatage visible, jamais de chiffre supposé).
- **La règle sous le pouce dépend d'un moteur de contexte** (phase, statuts, énergies, écart de niveau) qui touche aux règles ; il doit être testé avec les mêmes tests Vitest que les règles elles-mêmes, et rester une sélection d'ancre, jamais un calcul de règle.
- **Les ajustements déclarés sont une nouvelle action serveur** limitée au propre personnage, avec motif, annulation dans un délai, et cohabitation avec les écritures du MJ (contrôle de version optimiste). C'est le plus gros travail de fond de cette direction, et il faut décider qui peut annuler quoi après le délai.
- **Deux régimes visuels avec un seul jeu de composants.** Le risque est de dupliquer les composants ou de laisser le régime Marge hériter de décorations. La parade : les composants ne lisent que des tokens, le régime est un attribut sur `html`, et la recette visuelle à 390 px teste chaque écran dans les deux régimes.
