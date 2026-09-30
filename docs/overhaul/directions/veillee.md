# Direction « La Veillée »

Direction de création pour l'overhaul de Nuages Polaires, angle mémoire collective. Rédigée le 30 septembre 2026 après lecture du brief (`02-brief-creatif.md`), de la charte Mystique polaire, du plan du site, de la lecture produit de GPT, de l'audit de contenu de l'accueil et de l'accueil actuel (`index.html:6556-6630`). Lecture seule ; ce document propose des formes, des parcours et des textes d'interface, jamais du lore ni des règles.

## 1. Nom et principe

**La Veillée** — entre deux scènes Discord, le compagnon est le feu autour duquel le serveur se souvient de ce qu'il a vécu ensemble ; on y lit d'abord *nous* (la chronique, les voix, les rendez-vous, les promesses, la table), puis *moi* (ma fiche), et chaque fait qui compte y est déposé par quelqu'un et tenu par le MJ.

## 2. Critique du brief du lead

**Ce qu'il a raison de tenir.** L'idée de la trace est juste et déjà dans la voix du site. Le refus du vocabulaire de jeu vidéo, le mode compact pendant la scène, la Table reflétée en lecture, le Codex qui se révèle avec les rencontres, Discord « chez lui » : tout cela sert la table. La technique (SvelteKit, tokens vanilla, sessions serveur) est la bonne pour tenir une identité non générique. Le critère de fin à deux relecteurs est sain.

**Ce qu'il rate.** Le brief commence par *« savoir qui je suis »* : le Fil est un fil *personnel*, le Codex et la Chronique arrivent en quatrième et cinquième position. Or ce qui manque à un serveur de RP textuel, ce n'est pas un meilleur tableau de bord individuel — Discord et la fiche le font déjà à moitié — c'est une **mémoire commune lisible** : qui a promis quoi à qui, ce que la dernière sortie a changé, ce que le groupe sait d'une créature, qui était là. Le brief traite la relation entre personnages comme absente (elle n'apparaît nulle part dans son tableau des besoins) alors que c'est le carburant du RP : dettes, alliances, rancunes. Il parle de « chronique » pour l'accueil public mais garde un « fil » individuel pour le joueur connecté : deux objets pour la même matière. La Veillée n'en fait qu'un : la chronique est la même pour tous, seul le point de vue change (public, cercle, MJ). Enfin le brief garde le journal comme un carnet solitaire ; il faut lui donner trois registres (pour moi, autour du feu, consigné) sinon la mémoire collective n'a pas de source.

**Ce que je ne touche pas.** Règles de jeu, contenus, permissions serveur, garanties de non-écrasement, thèmes personnels comme récompense.

## 3. Métaphore d'interface et système de composition

**Métaphore : le feu, le cercle, la nuit.** Le feu est la colonne centrale où l'on lit (chronique, journal, table). Le cercle est la rangée des présents : les voix des personnages, toujours affichées comme des noms autour de quelque chose, jamais comme des cartes en grille. La nuit est la marge : sombre, presque vide, où vivent les repères (coordonnées, dates, numéros de chapitre) et les actions secondaires.

**Grille.** Une seule colonne de lecture de **62 ch maximum (≈ 680 px)**, centrée, avec deux marges de veille de 200 px sur ordinateur (à gauche : repères et sommaire du chapitre ; à droite : annotations, témoins, actions contextuelles). Sur tablette la marge droite disparaît, ses annotations passent sous le paragraphe. Sur téléphone tout est une colonne avec gouttière de 20 px ; les marges deviennent des lignes de repère au-dessus des blocs. Aucune grille de cartes nulle part, y compris dans les outils staff : les listes sont des **relevés** (une ligne = un fait, alignée sur une règle verticale de 1 px).

**Rythme.** Chaque écran est un chapitre numéroté (`03 — LA VEILLÉE`), ouvert par un titre Cormorant, puis des relevés espacés de 28 px. Les dates ne sont jamais des « il y a 3 jours » flottants : ce sont des coordonnées `NP / 03 · 12 OCT`, posées dans la marge, avec l'année seulement quand elle change. Le vide est une matière : un chapitre sans relevé garde sa hauteur et sa phrase d'état.

**Matière.** Encre (fond), grain très fin (bruit SVG à 3 % d'opacité, statique), une seule braise par écran (le point chaud : ce qui est en cours maintenant), brume (flou ivoire animé lentement, uniquement pour l'inconnu du Codex et l'arrière-plan de l'accueil, désactivé sous `prefers-reduced-motion`). Les surfaces sont mates, sans ombre portée ; les séparations sont des règles de 1 px à 12 % d'opacité.

**Mouvement.** Trois mouvements autorisés, pas un de plus : *s'asseoir* (l'écran arrive de l'obscurité en 320 ms, opacité + 8 px vers le haut), *le fil qui se trace* (une règle verticale de 1 px laiton se dessine de haut en bas le long des relevés quand un chapitre s'ouvre, 600 ms, `ease-out`), *la braise qui respire* (opacité 70 → 100 % sur 4 s, seulement sur le point chaud). Tous coupés sous `prefers-reduced-motion`.

**Interdit.** Cartes en grille, gros chiffres, badges ronds, jauges empilées (une seule barre : l'XP), icônes emoji, halos, cadres imbriqués, modales pour lire (les modales ne servent qu'à confirmer), compteurs en temps réel, « en ligne », toute animation décorative en continu, tout élément qui n'a pas de nom en français.

## 4. Navigation complète

**Visiteur (ordinateur, en-tête ; téléphone, menu replié derrière « Menu »).** `Accueil` · `L'univers` · `Les Serments` · `La chronique` · `Comment commencer` · `Espace joueur ↗`. La chronique publique ne montre que les récits marqués publics par le MJ et les rendez-vous visibles.

**Joueur connecté (ordinateur : barre gauche fine, 200 px, libellés Manrope 13 ; téléphone : barre basse de quatre entrées + « Plus »).** Ordre exact :
1. `La Veillée` (entrée par défaut)
2. `Les voix` (les personnages du serveur)
3. `Rendez-vous` (agenda et inscriptions)
4. `Le livre des promesses` (relations validées : dettes, promesses, alliances)
5. `La Table` (n'apparaît que lorsqu'un combat concernant mon personnage est ouvert ; sinon absent)
6. `Mémoire` (Serments, Bestiaire, Système de jeu, Règlement, Comment commencer)
7. `Mon personnage`
8. `Sous la main` (mode scène compact, épinglé en bas de la barre gauche ; sur téléphone : bouton flottant en bas à droite, losange laiton)
Téléphone, barre basse : `Veillée` · `Voix` · `Rendez-vous` · `Moi` · `Plus` (Plus ouvre : Livre des promesses, Table si ouverte, Mémoire, Compte, Déconnexion). Le compte (`Mon compte`, `Collection de thèmes`, `Exporter ma fiche`, `Se déconnecter`) est derrière le portrait en haut de la barre.

**MJ.** Même barre que le joueur, plus un second groupe séparé par une règle, titré `CONDUIRE` : `La Table` (toujours présente pour le MJ ; sous-onglets `Conduite`, `Brouillons`, `Archives`) · `Apparitions` · `Personnages` · `Consigner` (validation des promesses et des récits déposés autour du feu) · `Rendez-vous — organiser`. Sur téléphone : « Plus » gagne une section `Conduire` ; la Table MJ sur téléphone est volontairement réduite à lecture + fin de round (la conduite complète se fait sur ordinateur).

**Designer.** Barre joueur, plus le groupe `FAÇONNER` : `Atelier bestiaire` · `Atelier Serments` (si le droit est accordé, voir plan §9) · `Rendez-vous — organiser` (si contributeur).

**Admin.** Tous les groupes, plus `TENIR` : `Comptes et liaisons` · `Rôles` · `Thèmes` · `Journal de sécurité` · `Données` · `État du service`. Sur téléphone, `TENIR` est accessible mais chaque écran affiche en tête « Certaines actions demandent l'ordinateur » quand c'est le cas (import/export, suppression).

**Compte en attente de liaison.** Voit `La Veillée` (lecture), `Les voix`, `Rendez-vous` (lecture), `Mémoire`, `Mon compte`. `Mon personnage` est remplacé par `En attente d'un personnage` avec la phrase d'état de la section 8.

## 5. Les écrans clés

### 5.1 Accueil public
**Haut.** On garde l'accueil actuel presque tel quel : paysage, `Nuages / Polaires.` en Cormorant, ivoire sur encre, bouton sauge `Rejoindre l'aventure ↗`, coordonnée `NP / 01 — APRÈS LE BASCULEMENT`, citation. Un seul changement : l'en-tête gagne `La chronique`.
**Milieu.** La bande des cinq compteurs disparaît. À sa place, `LES TRACES DE NOTRE PASSAGE` devient une **chronique publique** de six relevés maximum : trois passés (récits publics, titre + une ligne + « avec » et les prénoms des personnages présents) et trois à venir (rendez-vous visibles : date en coordonnée, type, titre). Chaque relevé est une ligne alignée sur une règle verticale laiton ; le dernier relevé passé porte la braise. Un lien `Lire toute la chronique →`. Un seul chiffre reste autorisé, en Cormorant 32, s'il est vrai : « Serments portés : N ».
**Bas.** Les sections `01 — L'UNIVERS`, `02 — LES SERMENTS`, l'invitation `Laissez votre trace.` et le colophon restent. Le colophon perd `RPG — expérimental` et gagne `Comment commencer` et `Le staff sur Discord ↗`.
**Téléphone.** Identique ; la chronique publique affiche deux passés et deux à venir, les prénoms des présents passent sur une seconde ligne.

### 5.2 Entrée du joueur connecté — « La Veillée »
**Haut.** Chapitre `03 — LA VEILLÉE`. Titre Cormorant 44 : « Depuis ta dernière veillée. » Sous-ligne Manrope 13, cendre : la date de dernière visite en coordonnée (`Tu étais là le NP / 03 · 12 OCT`). À droite dans la marge : **le cercle**, les six derniers personnages ayant laissé une trace, disposés en arc autour d'un losange laiton (voir 6.1).
**Milieu.** La chronique du cercle, du plus récent au plus ancien, en relevés. Types de relevés, chacun avec son libellé fixe dans la marge gauche : `RÉCIT` (récit de sortie ou de combat archivé, publié au cercle), `CONSIGNÉ` (fait validé par le MJ : dette, promesse, alliance, conséquence), `RENDEZ-VOUS` (créé, modifié, dans 48 h), `VOIX` (un personnage a partagé une page « autour du feu »), `TRACE` (niveau, gemme, Serment : la ligne de mon propre historique, préfixée « Toi — »). Un relevé = titre Cormorant 22, une ligne de corps, « avec » + prénoms, la coordonnée. Le premier relevé non lu porte la braise ; un **signet** laiton marque l'endroit où je m'étais arrêté (6.5).
**Bas.** Bloc `POUR TOI` sur fond pierre : trois lignes maximum, seulement si vraies — prochain rendez-vous où je suis inscrit, une promesse qui me concerne et qui attend, une consommation non déclarée depuis le dernier combat. Puis `Ouvrir Sous la main →`.
**Téléphone.** Le cercle passe au-dessus de la chronique, en une rangée horizontale de portraits ronds de 40 px avec prénom dessous ; `POUR TOI` devient une bande fixe au-dessus de la barre basse, repliable.

### 5.3 Les voix — fiche d'un personnage vue par le cercle
**Haut.** Portrait 96 px à gauche, nom Cormorant 44, Serment en laiton avec le rang (`Sauvageon · Basique`), niveau en texte (`Niveau 6`), jamais de barre pour les autres. Marge droite : `Lié à` (pseudo du compte, si le compte l'autorise dans Mon compte).
**Milieu.** Trois chapitres : `Ce que le feu sait` (ses pages « autour du feu », les plus récentes d'abord), `Ce qui est consigné` (relations validées où ce personnage apparaît, en deux colonnes `Doit` / `On lui doit`, plus `Allié à`), `Où il était` (rendez-vous et archives où il figure).
**Bas.** `Écrire à son joueur sur Discord ↗` (lien profond vers le salon ou le DM si l'admin a renseigné un identifiant Discord), sinon rien.

### 5.4 Mon personnage — la fiche
**Haut.** Portrait 128 px, nom, Serment + rang, une seule barre d'XP (1 px de haut à l'état vide, 3 px rempli, laiton) avec `Niveau 6 · 120 / 180`. Marge gauche : sommaire des chapitres `01 Ressources · 02 Serment · 03 Équipement · 04 Journal · 05 Traces`, navigation clavier conservée.
**Milieu.** `01 RESSOURCES` : PV, énergie physique, énergie magique sur trois lignes, valeur en Cormorant 30, règle horizontale fine dont la longueur est le ratio (jamais une jauge colorée pleine : une règle ivoire sur cendre ; garance seulement sous 25 % de PV). Inventaire et gemmes en relevés ; `Déclarer une consommation` ouvre une ligne inline, pas une modale. `02 SERMENT` : branches et paliers lisibles, le palier actuel porte la braise. `03 ÉQUIPEMENT` : relevés. `04 JOURNAL` : voir 5.5. `05 TRACES` : mon historique typé (niveau, XP, gemme, combat, objet, stat, Serment) en relevés avec `par MJ Untel` dans la marge.
**Bas.** `Exporter en PDF` · `Copier mon bloc de statut` (texte prêt pour Discord). Sur téléphone, les chapitres deviennent des sections repliables, la première ouverte.

### 5.5 Journal — trois registres
**Haut.** Titre « Journal de Nom ». Trois onglets textuels, soulignés : `Pour moi` · `Autour du feu` · `Consigné`. Une phrase de visibilité sous l'onglet, toujours exacte : `Pour moi` → « Toi, les maîtres du jeu et les administrateurs. » ; `Autour du feu` → « Tout le cercle. » ; `Consigné` → « Tout le cercle, validé par un MJ. Tu ne peux pas le modifier. »
**Milieu.** `Pour moi` : le champ texte actuel (tout le journal existant migre ici, intact), typographie de carnet (Cormorant 18, interligne 1.7, sur fond pierre un ton plus clair que la page). `Autour du feu` : pages datées, chacune un titre + texte ; bouton `Partager cette page au cercle` avec confirmation inline. `Consigné` : relevés en lecture avec `témoin : MJ Untel · NP / 03 · 12 OCT`.
**Bas.** `Proposer un fait à consigner` : un formulaire d'une ligne (`Type : dette / promesse / alliance / conséquence`, `Envers`, `Texte`) qui part dans la file `Consigner` du MJ. Sur téléphone, les onglets deviennent un sélecteur segmenté pleine largeur.

### 5.6 Rendez-vous — agenda
**Haut.** Titre « Rendez-vous ». Deux onglets `À venir` · `Passés`. Filtre par type (Combat, Exploration, Social, Événement majeur, Autre) en liens textuels.
**Milieu.** Relevés : date en coordonnée dans la marge (`SAM 18 OCT · 21 h`), type en petites capitales laiton, titre Cormorant 22, description une ligne, `avec` + prénoms inscrits, capacité en texte (`4 places sur 6`). Action à droite : `Je viens` / `Je ne viens plus` ; l'état pend la confirmation serveur (« … »), puis « Inscrit. » en aurore. Le rendez-vous dans les 48 h porte la braise. Un rendez-vous passé avec archive affiche `Lire le récit →`.
**Bas.** Pour MJ/designer autorisés : `Organiser un rendez-vous` ouvre un formulaire inline en bas de liste ; brouillon conservé en cas d'erreur (règle existante). Téléphone : identique, l'action passe sous le titre.

### 5.7 Mémoire — référence
**Serments.** Colonne de lecture ; filtre par rang en liens ; chaque Serment est un chapitre, paliers en relevés numérotés I–IV, le palier lisible au clavier et au toucher. Rien de neuf sur le fond.
**Bestiaire (Codex qui se révèle).** Une fiche = portrait (si publié), nom, zones ; puis `Ce que nous savons` : les observations autorisées, révélées dans l'ordre des rencontres du serveur, avec `premier témoin : archive du NP / 02 · 3 SEPT` ; puis `Encore dans la brume` : le nombre de lignes non révélées, rendues comme des lignes ivoire floutées (brume) de longueur variable, sans texte lisible dans le DOM (ce sont des `<span aria-hidden>` vides stylés, le contenu MJ ne quitte jamais le serveur). Une créature jamais rencontrée n'apparaît que par son nom, si le designer l'a marquée « nom connu », sinon pas du tout.
**Système de jeu, Règlement, Comment commencer.** Colonne de lecture, sommaire dans la marge gauche, ancres.

### 5.8 La Table — vue MJ
**Haut.** Nom du combat en Cormorant 30, `Round 4 · Déclaration` ou `Round 4 · Résolution`, la braise sur la phase en cours. À droite : `Visible par : les participants` / `le cercle entier` (bascule), `Notes` (panneau latéral), `Terminer`.
**Milieu.** L'ordre d'initiative comme une seule ligne horizontale de noms (joueurs en ivoire, créatures en brume claire, invocations en cendre avec `·` devant), le tour actif souligné laiton. Dessous, la colonne de conduite : pour le combattant actif, PV / EP / EM en trois règles, statuts en petites capitales, déclaration en cours ; les boutons d'action existants (déclarer, résoudre, statut, invocation, annuler) en ligne, sobres. À droite dans la marge : le journal du combat (log) en relevés courts, qui est aussi exactement ce que voient les joueurs.
**Bas.** `Fin de round` grand, `Sauvegarder le brouillon`, `Archiver` (avec confirmation). Téléphone MJ : lecture + `Fin de round` seulement, message en tête.

### 5.9 La Table — vue joueur
**Haut.** « La Table est ouverte. » Cormorant 30, nom du combat, `Round 4 · Déclaration`, braise. Sous-ligne : « Le MJ conduit. Tu écris sur Discord. Ici, tu lis. »
**Milieu.** La même ligne d'initiative que le MJ ; mon personnage marqué d'un losange laiton. Puis trois règles pour mes ressources telles que la Table les tient, mes statuts. Puis le journal du combat, relevé par relevé, le dernier arrivant par la bas avec le fil qui se prolonge (6.2). Rien n'est cliquable dans le combat.
**Bas.** `Copier mon état pour Discord` (bloc texte : nom, PV/EP/EM, statuts, round). `Ouvrir mes capacités` (raccourci vers Sous la main). Téléphone : c'est l'écran principal de la Table ; le bouton copier est fixe en bas.

### 5.10 Personnages — gestion (MJ, admin)
**Haut.** Recherche, tri par nom / Serment / niveau, en liens textuels. **Milieu.** Relevés : portrait 32, nom, Serment + rang, niveau, compte lié (ou « non lié » en cendre). Ouvrir = colonne de lecture avec les mêmes chapitres que la fiche joueur, plus la marge droite `CONDUIRE` : `Attribuer de l'XP` (aperçu de participation existant), `Donner un objet`, `Fusionner une gemme`, `Corriger une ressource` ; chaque action écrit une ligne dans `05 TRACES` avec `par MJ Untel`. Les opérations sensibles (identité, Serment, suppression) n'apparaissent que pour l'admin, sous une règle titrée `SENSIBLE`. **Bas.** `Créer un personnage`.

### 5.11 Consigner (MJ) et Administration (admin)
**Consigner.** File de propositions (faits proposés depuis les journaux, pages partagées signalées) : chaque proposition en relevé avec `Valider`, `Reformuler` (champ inline), `Refuser` (motif d'une ligne, visible par l'auteur). Une validation crée un relevé `CONSIGNÉ` dans la chronique et une ligne dans le livre des promesses.
**Administration.** Chapitres `Comptes et liaisons` (relevés : pseudo, rôle, personnage lié, dernière venue ; lier = champ de recherche inline), `Rôles`, `Thèmes` (attribution par relevé), `Journal de sécurité` (filtres existants), `Données` (import/export, avec la phrase « Ce n'est pas une sauvegarde complète du site. »), `État du service`. Pas de « vue d'ensemble » à gros chiffres : l'entrée d'Administration est la liste des dix derniers faits d'exploitation.

## 6. Cinq moments signature

1. **Le cercle qui se réordonne.** Sur la Veillée, les portraits des présents sont disposés en arc autour d'un losange. L'ordre est celui de la dernière trace laissée : quand un personnage dépose une page ou qu'un fait le concernant est consigné, il glisse vers la place la plus proche du feu (transition 600 ms sur `transform`, coupée sous reduced-motion). Survol ou appui long : sa dernière trace en une ligne. On voit littéralement qui s'est approché du feu cette semaine — sans compteur, sans « actif ».
2. **Le fil qui se prolonge pendant le combat.** Sur la Table vue joueur, chaque relevé du MJ arrive par le bas et la règle verticale laiton se prolonge de 28 px pour l'accueillir ; le texte apparaît par un balayage d'opacité de gauche à droite (180 ms), comme une ligne qui sèche. Sur téléphone, le combat se lit comme une page qui s'écrit sous les yeux, sans rechargement, sans son, sans bouton.
3. **La ligne qui raye une promesse.** Dans le livre des promesses, une dette réglée n'est pas supprimée : une règle de 1 px se trace lentement au travers (700 ms), le texte passe en cendre et gagne dans la marge `réglée · témoin MJ Untel · NP / 04 · 2 NOV`. L'histoire sociale garde ses cicatrices lisibles ; on peut lire les promesses tenues comme les promesses trahies.
4. **La brume qui se dissipe dans le Codex.** Une observation nouvellement révélée (parce qu'une archive vient d'être publiée) est d'abord une ligne floutée ; à l'ouverture de la fiche, elle se dissipe en 900 ms vers le texte net, une seule fois par compte (état « vu » côté serveur), puis reste nette. La communauté voit son savoir se déposer, et la fiche indique qui a été le premier témoin.
5. **Le signet.** La chronique retient, côté serveur et par compte, le dernier relevé lu. Au retour, l'écran s'ouvre exactement sur un ruban laiton horizontal portant « Tu t'étais arrêté ici. », les relevés plus récents au-dessus, les anciens dessous ; le fil se trace vers le haut depuis le signet jusqu'au relevé le plus récent. Aucune pastille rouge, aucun compteur de non-lus : une page tenue par un ruban.

## 7. Direction visuelle

**On garde de Mystique polaire.** Palette encre / ivoire / aurore / laiton / sauge, Cormorant Garamond + Manrope, la boussole comme signature (favicon, colophon, orbite des Serments), le paysage sans constructions sur l'accueil seulement, les coordonnées `NP / 01`, les chapitres numérotés, les panneaux mats, les règles fines, les cibles de 44 px, le focus visible.

**On ajoute.** La braise (une seule couleur chaude, rare), la cendre (tertiaire, dates, rayé), la brume (flou ivoire pour l'inconnu), le fil (règle verticale laiton qui structure toutes les listes), le ruban du signet, le grain statique, la typographie de carnet pour le journal, le losange laiton comme marque de « moi » et de « maintenant ».

**On retire.** Compteurs et métriques d'accueil, tableau de bord, cartes en grille, halos, cadres imbriqués, Cinzel (les repères passent en Manrope espacé), emoji dans les libellés (⚔, 🐢, 🦀 deviennent des mots), patchs CSS empilés, toute mention RPG.

**Palette (hex).** Nuit d'encre `#091519` (fond) · Pierre sombre `#102327` (surfaces) · Brume profonde `#172E32` (surfaces secondaires, carnet) · Ivoire `#F0EEE5` (texte) · Brume claire `#BDCDC8` (secondaire) · Cendre `#6E837F` (tertiaire, dates, rayé) · Aurore `#95CDBB` (liens, focus, confirmations) · Laiton pâle `#C6B38B` (Serments, fil, signet, losange) · Sauge claire `#C6D8C4` (action principale) · **Braise `#D8A46B`** (le point chaud, une occurrence par écran) · Garance `#C4685D` (danger, PV bas, refus) · Lichen `#8CB79A` (réussite, réglé) · Améthyste `#A695C9` (gemmes, inchangé de sens). Fil : laiton à 55 % ; règles : ivoire à 12 %.

**Typographie.** Cormorant Garamond : 120/76 (h1 accueil, inchangé), 44 (titre d'écran, `line-height` 1.05), 30 (chapitre, valeur de ressource), 22 (titre de relevé, citation), 18 (carnet, italique pour la voix des récits). Manrope : 15 corps (16 sur téléphone), `line-height` 1.6 ; 13 secondaire et navigation ; 11 marges et témoins ; 9–10 en capitales espacées `.18em` pour les repères de chapitre et les types de relevés. Aucun gras au-dessus de 600.

**Motifs.** Le fil (vertical, 1 px), le losange (8 px, rotation 45°), la coordonnée (`NP / 03 · 12 OCT`), la règle rayante, la brume, la braise. Pas d'icônes hormis la boussole ; les actions sont des mots.

**Thèmes personnels.** Un thème redéfinit uniquement six tokens : `--encre`, `--pierre`, `--brume`, `--ivoire`, `--secondaire`, `--aurore`. Laiton, braise, garance, lichen, améthyste et la structure ne changent jamais ; un thème clair inverse encre/ivoire et rabat la braise à 80 %. Le contraste minimum 4.5:1 est vérifié à l'attribution, sinon le thème n'est pas proposé.

## 8. Voix

**Règles.** Tutoiement ; présent ; phrases de moins de douze mots ; le sujet est la table ou toi, jamais « le système » ; on nomme le témoin quand il y en a un ; on n'annonce un succès qu'après confirmation serveur ; l'état vide dit ce qui remplira l'espace ; l'erreur dit ce qui est conservé.

**Douze micro-textes.**
1. Veillée vide (nouveau serveur ou nouveau compte) : « Le feu est allumé. Personne n'a encore parlé. »
2. Livre des promesses vide : « Aucune promesse consignée. Elles s'écrivent d'abord sur Discord. »
3. Table fermée (menu absent, page directe) : « La Table est repliée. Le MJ l'ouvrira. »
4. En attente de liaison : « Ton compte existe. Un administrateur le lie à ton personnage. Tu peux déjà lire. »
5. Confirmation d'inscription : « Inscrit. Tu es attendu le samedi 18 octobre. »
6. Confirmation de partage au cercle : « Partagé. Tout le cercle peut lire cette page. »
7. Erreur de sauvegarde : « Non enregistré. Ton texte est encore là. Réessaie. »
8. Conflit de version : « Quelqu'un a modifié cette fiche avant toi. Relis, puis reprends. »
9. Transition de connexion : « Tu reviens. On t'attendait. »
10. Notification (fait consigné) : « MJ Untel a consigné une promesse qui te concerne. »
11. Notification (Table) : « La Table s'ouvre : Nom du combat. Tu y es. »
12. Bestiaire, ligne floutée (info-bulle et texte lu par le lecteur d'écran) : « Encore dans la brume. Le serveur ne l'a pas rencontré. »

## 9. Position sur les six conséquences du brief

1. **Le Fil → transformer.** Il devient la Veillée : une chronique commune lue depuis mon point de vue, avec `POUR TOI` en bas. Un fil personnel isolé referme le joueur sur ses chiffres ; la même chronique, filtrée par ce qui me concerne, garde le « nous » devant.
2. **En scène → garder, renommer `Sous la main`.** Contenu inchangé (ressources avec ajustements déclarés, capacités du niveau, règle pertinente, bloc à coller). Ajout d'une seule ligne : la dernière promesse qui me concerne, parce qu'elle sert la scène.
3. **La Table → garder et élargir.** Le MJ choisit la visibilité : participants seulement (défaut) ou cercle entier, pour que la table de combat soit une scène que le serveur peut regarder. Toujours en lecture pour les joueurs.
4. **Le Codex qui se révèle → garder, préciser.** Ajouter le premier témoin et la brume comme rendu de l'inconnu ; interdire strictement que le texte MJ transite vers le client.
5. **La Chronique publique → garder, en faire le cœur.** Ce n'est plus une vitrine de l'accueil : c'est la même chronique que la Veillée, filtrée « public ». Une seule source, trois points de vue.
6. **Discord chez lui → garder, borner.** Connexion Discord optionnelle, liens profonds vers les salons, blocs à coller. Le webhook de notifications vers Discord passe en seconde phase : tant que la chronique n'est pas fiable, ne pas la dupliquer ailleurs.

## 10. Risques et difficultés de construction

- **Le journal à trois registres et le livre des promesses créent des données neuves** (pages partagées, propositions, faits consignés, relations, état « vu », signet par compte). C'est le plus gros travail de schéma et de permissions ; sans MJ qui consigne régulièrement, le livre reste vide et la promesse tombe. Mitigation : `Consigner` doit prendre moins d'une minute par fait, et la Veillée doit rester belle avec le journal seul.
- **La Table en temps réel** demande un canal serveur → client (SSE ou polling court) sur Netlify ; le brief l'assume mais le fil qui se prolonge et la synchronisation des rounds sont sensibles aux latences. Prévoir un état « en retard de N s » honnête plutôt qu'une fausse fluidité.
- **La brume du Codex est un piège de sécurité** : la tentation sera de flouter du vrai texte côté client. Il faut que le serveur ne renvoie que le nombre de lignes cachées et leurs longueurs approximatives.
- **La retenue visuelle est difficile à tenir sur les outils staff** (Personnages, Administration) où la densité pousse vers les tableaux et les grilles ; il faudra des relevés compacts bien conçus, et accepter que certaines opérations restent « ordinateur seulement » sur téléphone.
