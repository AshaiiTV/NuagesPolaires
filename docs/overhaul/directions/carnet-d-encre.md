# Direction « Carnet d'encre »

Direction de création rédigée le 30 septembre 2026 pour l'overhaul de Nuages Polaires, en réponse au brief du lead (`02-brief-creatif.md`). Lecture seule du dépôt ; aucune règle de jeu ni contenu d'univers n'est inventé ici : uniquement des formes, des parcours, des écrans et des textes d'interface.

## 1. Nom et principe

**Carnet d'encre** — le compagnon n'est pas un site que l'on consulte mais un carnet que l'on tient ouvert à côté de Discord : chaque acte de jeu y dépose une ligne d'encre, chaque écran est une page que l'on tourne, annote, rature ou tamponne, et rien de ce qui a été écrit ne disparaît jamais.

## 2. Critique du brief du lead

Ce qu'il a raison de tenir : la contrainte « compagnon, pas jeu » ; l'idée de la trace ; la fin des tableaux de bord à gros chiffres ; le mode « En scène » mobile ; la Table en lecture pour les joueurs ; le Codex qui se révèle ; la voix (« Les récits restent à écrire. ») ; Mystique polaire comme socle ; SvelteKit et le CSS vanilla à tokens, sans lesquels aucune matière n'est possible.

Ce qu'il rate, vu depuis le carnet :

- **La trace n'a pas de support.** Le brief dit « chaque acte laisse une trace » mais ne dit pas *sur quoi*. Une trace sans support devient un flux : « le Fil » est un mot de réseau social. Un fil est infini, un carnet est fini, daté, paginé. Ce n'est pas un détail : un fil se scrolle, un carnet se feuillette et se ferme. Le joueur doit pouvoir arriver « au bout » de ce qui s'est passé depuis sa dernière lecture.
- **La typographie de carnet est cantonnée au journal.** Le brief la réserve à une rubrique. Si le journal est une page de carnet et la fiche un formulaire, l'objet se casse. Toute l'application, outils staff compris, doit être faite de pages — sinon le simulateur restera un panneau d'administration posé à côté d'un joli site.
- **Rien sur l'auteur de l'écriture.** Sur un carnet, on sait qui a écrit : l'encre du joueur, le tampon du MJ, la mention du système. Le brief parle de traces sans dire qui les laisse. C'est pourtant la seule façon lisible de séparer le déclaré (joueur), le validé (MJ) et l'automatique (règles) sans badge ni couleur criarde.
- **La suppression n'est pas traitée.** Le brief préserve « les garanties de non-écrasement » côté serveur ; côté interface, rien. Un carnet ne connaît pas la suppression, il connaît la rature. C'est une position produit, pas un effet visuel.
- **« Discord est chez lui ici » est un risque de dilution.** Discord est la table ; le carnet est posé à côté. S'il commence à ressembler à Discord (avatars ronds, bulles, présence), il perd sa raison d'être.

## 3. Métaphore d'interface et système de composition

**Vocabulaire fixe (les seuls mots de l'interface) :** *carnet* (l'application), *cahier* (un espace : Mon carnet, Références, Table, Atelier, Registre), *page* (un écran), *chapitre* (une section numérotée d'une page), *marge* (colonne d'annotations et de repères), *ruban* (le signet : là où tu t'es arrêté), *corne* (coin plié : page non encore lue), *rature* (ancienne valeur barrée, jamais supprimée), *tampon* (validation d'un MJ ou d'un admin, datée), *feuillet volant* (carte détachable : le mode En scène), *encre* (toute écriture ; elle « prend » quand le serveur confirme).

**Grille.** Ordinateur (≥ 1100 px) : double page. Colonne de gauche 34 % = *marge* (repères NP / 03, date, sommaire des chapitres, tampons, annotations) ; colonne de droite 66 % = *corps* (texte, listes, formulaires). Une seule page à la fois ; jamais deux pages côte à côte avec du contenu concurrent. Tablette : marge réduite à 26 %. Téléphone : page simple ; la marge devient une bande horizontale sous le titre (repère + date + tampon), et les annotations passent en fin de page sous un filet. Gouttière de 16 px minimum, 24 px sur ordinateur. Largeur de lecture du corps : 62 caractères maximum.

**Rythme.** Réglure de 28 px : tout texte de corps et toute ligne de liste s'aligne sur une ligne de base de 28 px (Manrope 16 / 28 ; Cormorant 18 / 28 pour le journal). Les espacements verticaux sont des multiples de 28 (28, 56, 84). Les titres de chapitre occupent deux lignes de réglure. La réglure est visible (très fine) uniquement dans le journal et dans les notes du MJ ; ailleurs elle est invisible mais respectée.

**Matière.** Le bureau (fond de fenêtre) est nuit d'encre ; la page est pierre sombre avec un grain SVG à 3 % d'opacité et un bord de 1 px brume profonde ; la tranche du carnet (bord droit sur ordinateur, bas sur téléphone) porte les onglets. Pas d'ombre portée large : une ombre de 0 / 1 px / 2 px sous la page suffit. Un seul thème structurel : le carnet de nuit (encre ivoire sur page sombre). Les thèmes personnels changent l'encre et le papier, jamais la structure (voir §7).

**Mouvement.** Trois mouvements, pas un de plus : *tourner* (changement de page : la page sortante glisse de 24 px vers la gauche et s'estompe, la nouvelle arrive de la droite, 320 ms, courbe `cubic-bezier(.2,.7,.2,1)` ; retour arrière = sens inverse) ; *sécher* (toute écriture confirmée : apparition en encre humide aurore puis passage à l'ivoire en 1 200 ms) ; *tamponner* (le tampon descend de 6 px avec une rotation fixe de ±3° déterminée par l'identifiant, 180 ms). Avec `prefers-reduced-motion`, tourner devient un fondu de 120 ms, sécher devient un changement de couleur immédiat, tamponner devient une apparition sèche.

**Interdit.** Fenêtres modales empilées (une seule, dite *feuillet*, jamais deux) ; toasts en pile (une seule note de marge à la fois) ; squelettes gris de chargement (une page vide porte le texte « L'encre sèche… ») ; carrousels ; cartes dans des cartes ; dégradés sur les boutons ; icônes sans libellé ; pastilles de compteur dans la navigation (sauf la corne) ; avatars ronds ; halos ; toute mention de présence en ligne ; tout tableau de quatre gros chiffres.

## 4. Navigation complète

Les cahiers apparaissent comme des onglets sur la tranche du carnet : bord droit sur ordinateur (verticaux, lisibles, pas d'icônes seules), bande basse sur téléphone. Ordre et libellés exacts, du haut vers le bas :

| Cahier (onglet) | Pages | Visiteur | Joueur | MJ | Designer | Admin |
|---|---|---|---|---|---|---|
| **Accueil** | page publique | oui | — | — | — | — |
| **L'univers** | Synopsis · Les Serments · Le bestiaire · Le système de jeu · Le règlement · Premiers pas | oui (contenus publics) | oui | oui | oui | oui |
| **Mon carnet** | Dernières pages · Ma fiche · Mon journal · Mes récits | — | oui | oui (si personnage lié) | idem | idem |
| **Agenda** | À venir · Passés · (staff) Organiser | — | oui | oui | oui | oui |
| **La Table** | Combat · Apparitions · Archives · Personnages | — | — | oui | — | oui |
| **L'Atelier** | Bestiaire · Serments (si droit accordé) · Événements | — | — | — | oui | oui |
| **Le Registre** | Vue d'ensemble · Comptes et liaisons · Thèmes · Journal d'audit · Données | — | — | — | — | oui |
| **Entrer** / avatar | Connexion ; connecté : Mon compte · Ma collection · Quitter le carnet | Entrer | avatar | avatar | avatar | avatar |

Le **ruban** est un second accès permanent : une bande sauge de 6 px sur le bord supérieur droit de toute page connectée. Clic ou tirer vers le bas : ouvre le *feuillet volant* En scène (joueur avec personnage) ou la page « Dernières pages » (compte en attente). Il n'apparaît pas pour le visiteur.

**Téléphone.** Bande basse à cinq positions : `Carnet` · `Fiche` · `Agenda` · `Univers` · `Plus`. Pour MJ, designer et admin, `Plus` ouvre la tranche complète (tous les cahiers autorisés, plus le compte). Pour le joueur, `Plus` contient Univers détaillé, Compte, Collection, Quitter. Pour le visiteur, la bande basse contient `Accueil` · `Univers` · `Serments` · `Entrer`. Chaque page a un lien réel (`/carnet/journal`, `/table/combat/42`), le bouton retour du navigateur tourne la page en arrière.

**Compte en attente de liaison** : voit Accueil, L'univers, Agenda (lecture), Mon carnet réduit à « Dernières pages » avec le message de §8, et son compte. Rien d'autre n'est grisé : ce qui n'existe pas n'est pas montré.

## 5. Les écrans clés

### 5.1 Accueil public
Haut : masthead actuel conservé (wordmark, `L'univers` · `Les Serments` · `Entrer ↗`), puis le paysage et le titre en Cormorant italique tels quels, coordonnée `NP / 01 — APRÈS LE BASCULEMENT`, citation « Le monde n'est pas mort. Il attend. ». Bouton sauge « Rejoindre l'aventure ↗ », bouton discret « Découvrir l'univers ↓ », note « Une histoire collective, sur Discord. Comment commencer ? ».
Milieu : la section des cinq compteurs est remplacée par **« Dernières pages »** : trois pages publiées au plus (un récit archivé et rendu public par un MJ, un événement passé, un événement à venir), présentées comme trois feuillets ivoire posés de biais (±2°) avec date en marge, titre en Cormorant, deux lignes d'extrait, et le tampon qui les a publiées. S'il n'y a rien de publié : un seul feuillet blanc avec « Les récits restent à écrire. ». Puis les chapitres 01 L'UNIVERS et 02 LES SERMENTS actuels, inchangés dans leurs textes, mis en page comme deux pages avec marge gauche (numéro, marginal) et corps.
Bas : invitation « Laissez votre trace. » conservée ; colophon avec `Règlement` · `Le site et vos données` · `Discord ↗`. Le bouton RPG disparaît.
Téléphone : paysage en 16:10 rogné à droite (zone sombre gauche conservée pour le titre), feuillets empilés verticalement sans inclinaison, bande basse visiteur.

### 5.2 Entrée du joueur connecté — « Dernières pages »
Le carnet s'ouvre sur le ruban : là où le joueur s'est arrêté. Haut : marge avec « NP / 02 — MON CARNET », le nom du personnage en Cormorant, le Serment et son rang en laiton, la date de dernière lecture (« Lu pour la dernière fois le 27 septembre »). Corps : les pages écrites *depuis* cette date, une par ligne de réglure, chacune cornée tant qu'elle n'est pas ouverte : « Le MJ a tamponné le combat du 26 septembre » (→ fiche, chapitre Conséquences), « Rendez-vous samedi 20 h — 4 inscrits » (→ agenda), « Ta note du 25 septembre » (→ journal). Ordre chronologique, pas antéchronologique : on lit un carnet dans le sens de l'écriture. Quand la liste est vide : « Rien depuis ta dernière lecture. Le carnet reste ouvert. ». Sous un filet : **« Ce qui vient »** (les deux prochains événements) et **« Ce qui attend ta main »** (inscription à confirmer, consommation à déclarer) — deux titres seulement, jamais plus.
Bas : liens texte « Ouvrir ma fiche → », « Écrire dans mon journal → ». Le ruban en haut à droite ouvre le feuillet En scène.
Téléphone : même page, la marge devient une bande sous le titre ; les entrées cornées se lisent d'un pouce ; le ruban se tire vers le bas.

### 5.3 Ma fiche — le personnage
Une page longue à quatre chapitres numérotés (repris de v297), la marge gauche servant de sommaire fixe qui suit le défilement et déplace le focus clavier.
Haut : portrait carré à coins droits, nom, Serment · rang (libellé distinct du niveau), niveau et une seule ligne d'XP dessinée comme un trait d'encre qui s'allonge sur la réglure (`niveau × 30`, valeur en texte à côté, jamais un pourcentage seul).
Chapitre 01 — Ressources : PV, énergie physique, énergie magique en trois lignes ; la valeur courante en ivoire, la valeur maximale en brume claire après une barre oblique ; les ajustements déclarés par le joueur (consommation) apparaissent comme une annotation de marge en encre du joueur avec l'heure ; les modifications du MJ portent un tampon.
Chapitre 02 — Équipement et inventaire : listes à deux colonnes (objet · quantité), gemmes +5 / +20 / +50 sur une ligne chacune, état vide « Rien dans les poches. ». Déclarer une consommation = bouton discret par ligne « Déclarer », confirmation en marge « Tu déclares avoir utilisé … ? Oui, je le note. », puis encre humide jusqu'à confirmation serveur.
Chapitre 03 — Serment : rang, branche, paliers accessibles au niveau actuel en ivoire, paliers suivants en encre grise avec le niveau requis ; descriptions complètes dépliées, pas de survol.
Chapitre 04 — Conséquences : historique des récompenses et corrections, chaque ligne signée (tampon MJ ou mention « règles »). Une valeur corrigée reste visible en rature au-dessus de la nouvelle.
Bas : « Exporter cette fiche (PDF) » et « Voir mes récits → ». Téléphone : chapitres repliables, sommaire dans la bande sous le titre, boutons à 44 px.

### 5.4 Mon journal
Le centre de gravité. Haut : marge avec le nombre de pages écrites et le filtre « Mes notes · Récits partagés · Faits validés » (les trois voix, chacune avec sa mention de visibilité écrite en toutes lettres : « Toi seul et les administrateurs », « Ta table », « Validé par un MJ »). Cette visibilité est celle des droits réels, jamais une promesse.
Corps : réglure visible ; les entrées se suivent par date, chaque entrée commence par sa date en marge en Manrope 11 capitales ; le texte en Cormorant 18 / 28. Écrire : on clique sous la dernière ligne, le curseur se pose sur la réglure, pas de champ encadré. Enregistrer : bouton « Noter » ; l'entrée passe en encre humide puis sèche. Modifier : l'ancienne version reste en rature, la nouvelle s'écrit dessous ; un lien de marge « voir les ratures » les montre ou les cache. Aucune suppression : « rayer » une entrée la barre entièrement et la laisse lisible.
Bas : « Page suivante → » (pagination de 20 entrées, pas de défilement infini). Téléphone : plein écran, la réglure guide la lecture, clavier virtuel sans perte de la date de l'entrée.

### 5.5 Agenda
Haut : marge avec le mois en Cormorant et la coordonnée « NP / 04 — AGENDA ». Corps : les rendez-vous en lignes datées (bloc-date à gauche : jour en Cormorant 32, mois en capitales ; à droite : titre, type, heure, lieu Discord en lien texte, « 4 inscrits sur 6 »). Inscription : « Je viens » ; état inscrit : « Tu viens · Rayer ma place ». Passés en encre grise sous un filet « Passés ». Tout événement publié par le staff porte le tampon de son organisateur.
Staff : page « Organiser » dans le même cahier, formulaire sur réglure, visibilité écrite (« Visible par tous les comptes » / « Masqué »), notification Discord facultative avec son propre état d'échec séparé de l'enregistrement.
Téléphone : même liste, bloc-date à 56 px, bouton « Je viens » à 44 px sous la ligne.

### 5.6 Références — Les Serments, Le bestiaire
Les Serments : sommaire en marge (catégories), corps = une page par Serment avec rang, lignées, branches et paliers dépliés ; « Tourner » entre Serments avec les flèches clavier. Ce qui est volontairement hors vitrine n'apparaît pas.
Le bestiaire : une **page par créature**, et cette page est d'abord **blanche** : nom, zone, et « Cette page reste blanche tant que personne ne l'a rencontré. ». Chaque combat archivé par un MJ où la créature apparaît y inscrit un paragraphe d'observation (extrait choisi par le MJ à l'archivage, jamais les statistiques réservées), daté et tamponné. Recherche et filtres en marge ; les créatures masquées ou archivées n'existent pas ici. Un MJ voit la même page avec un onglet de marge « Fiche complète » réservé.

### 5.7 La Table — combat, vu par le MJ
Double page dense mais toujours sur réglure. Marge : liste des combattants (nom, PV / EP / EM en chiffres, statuts en petites capitales, initiative), le round courant en Cormorant 48, les raccourcis clavier écrits en toutes lettres. Corps, chapitre 01 — Déclarations : une ligne par combattant, saisie en encre humide tant que le round n'est pas résolu. Chapitre 02 — Résolution : le MJ résout ; chaque effet s'écrit comme une ligne de récit (« Le loup des brumes subit 12 »), modifiable en rature tant que le round est ouvert. Chapitre 03 — Notes du MJ (réglure visible, encre laiton). Bas : « Clore le round », puis « Terminer le combat » qui ouvre le feuillet « Conséquences » : récompenses par personnage, chacune à tamponner ; « Tamponner tout » demande un appui long ; archivage avec choix « Publier un extrait » (alimente l'accueil et le bestiaire). Invocations, annulation d'action et sauvegardes gardent leurs fonctions actuelles, présentées comme ratures et signets.

### 5.8 La Table — combat, vu par un joueur
Sur téléphone d'abord. Page simple sans aucun bouton d'action : titre « À la table — round 3 », son personnage en haut avec ses trois ressources telles que le MJ les tient, les autres combattants dessous en brume claire, statuts en capitales. Sous un filet, les lignes de récit du round résolu apparaissent au rythme du MJ, en encre humide (« Le MJ écrit… » en italique pendant la saisie). Les conséquences arrivent avec le tampon en temps réel. Le ruban ouvre En scène par-dessus pour retrouver ses capacités et copier son bloc de statut. Le joueur écrit son action sur Discord ; le lien « Ouvrir le salon ↗ » est en marge.

### 5.9 Personnages (gestion, MJ et admin)
Marge : recherche, filtre par Serment et par compte lié. Corps : une ligne par personnage (nom, Serment · rang, niveau, dernier tampon). Ouvrir = tourner vers la fiche complète en mode MJ : mêmes quatre chapitres que le joueur, mais avec un cinquième, « Attribuer » (objets, XP par combat ou par gemme), chaque attribution tamponnée et datée. L'identité, le Serment et la suppression restent hors de portée du MJ et n'apparaissent pas ; l'admin les voit dans un chapitre 06 « Opérations sensibles », séparé par un filet double et une confirmation dactylographiée.

### 5.10 Le Registre (administration)
Vue d'ensemble : pas de métriques, une page « Ce qui attend » (comptes à lier, réinitialisations demandées, thèmes à attribuer), une ligne par attente, chacune actionnable. Comptes et liaisons : liste, rôles en petites capitales, liaison compte ↔ personnage en une ligne « relié à … » ; la liaison est un tampon d'admin. Thèmes : galerie de feuillets ivoire (possédé / actif / attribué), sélection au clavier. Journal d'audit : réglure visible, une ligne par action serveur, filtres en marge, jamais éditable. Données : export et import JSON avec la mention exacte « Ce n'est pas une sauvegarde complète du site. ». Téléphone : consultable, opérations sensibles indiquées comme « Sur ordinateur ».

## 6. Cinq moments signature

1. **L'encre sèche.** Toute écriture (note, déclaration, inscription, attribution) apparaît en aurore humide et ne devient ivoire qu'à la confirmation serveur. Si le serveur refuse, l'encre « bave » (léger flou 1 px, 600 ms) et une note de marge dit ce qui s'est passé ; le texte reste sur la page, jamais perdu. Le principe « aucun succès annoncé avant confirmation » devient visible sans un seul message de succès.
2. **Le ruban et la corne.** Le carnet s'ouvre toujours là où l'on s'est arrêté ; tout ce qui a été écrit depuis porte un coin corné (triangle ivoire 12 px en haut à droite de la ligne). Ouvrir la page déplie la corne (90 ms). Le ruban se tire pour arracher le feuillet En scène.
3. **Le tampon.** Le MJ valide une conséquence par un appui long de 600 ms ; le tampon descend, tourne de ±3° (angle déterministe par identifiant, donc identique pour tous), s'imprime avec date et rôle en laiton. Sur le téléphone du joueur, le même tampon s'imprime au même instant. Le laiton n'est utilisé nulle part ailleurs : quand on voit du laiton, c'est une décision du staff.
4. **La rature.** Rien ne s'efface. Modifier barre l'ancien et écrit dessous ; une correction d'XP par le MJ se lit « ~~120~~ 150, tamponné le 26 septembre ». Un lien de marge montre ou cache les ratures. Le journal d'audit n'est que la version complète de ce que chaque page montre déjà.
5. **Le feuillet volant.** En scène est un feuillet arraché (bord supérieur dentelé, ombre courte) qui reste au-dessus de n'importe quelle page de référence ; il contient les trois ressources avec ajustements déclarés, les capacités du niveau actuel, la règle du système ouverte en dernier, et « Copier pour Discord » qui produit un bloc monospace prêt à coller. On le repose en le tirant vers le haut.

## 7. Direction visuelle

**On garde de Mystique polaire** : la palette, Cormorant Garamond pour la voix, Manrope pour l'interface, la boussole comme signature (jamais canonique), le paysage sur l'accueil seulement, les coordonnées « NP / 0x — … », les chapitres numérotés, l'italique rare, les panneaux mats, les séparateurs fins, les petits losanges.

**On ajoute** : le grain de page (SVG `feTurbulence`, 3 %), la réglure, la tranche à onglets, le ruban, la corne, la rature, le tampon, le feuillet dentelé, une fonte monospace pour les blocs à coller (**IBM Plex Mono**, OFL, hébergée localement comme les autres).

**On retire** : les halos, les panneaux de verre, les cadres imbriqués, les dégradés, les tuiles de chiffres, les icônes seules, Cinzel (retiré progressivement : ses repères passent en Manrope capitales espacées), les couches de correctifs CSS.

**Palette (tokens).**

| Token | Hex | Rôle |
|---|---|---|
| `--bureau` | `#091519` | fond de fenêtre (nuit d'encre) |
| `--page` | `#102327` | la page (pierre sombre) |
| `--page-2` | `#172E32` | feuillet volant, tampon de fond de marge |
| `--reglure` | `#1C3439` | lignes de réglure, filets |
| `--encre` | `#F0EEE5` | écriture confirmée (ivoire) |
| `--encre-2` | `#BDCDC8` | écriture secondaire, valeurs maximales |
| `--encre-grise` | `#7E8F8B` | ratures, paliers non atteints, passés |
| `--encre-humide` | `#95CDBB` | écriture en attente de confirmation, liens, focus (aurore) |
| `--tampon` | `#C6B38B` | tampons, rang de Serment, décisions du staff (laiton) |
| `--ruban` | `#C6D8C4` | ruban, action principale (sauge) |
| `--rouille` | `#C9836B` | danger, PV bas, opérations sensibles |

**Typographie.** Cormorant Garamond : titres de page 48 / 52 (ordinateur), 34 / 38 (téléphone) ; titres de chapitre 28 / 28 × 2 ; journal et récits 18 / 28 regular, italique pour la voix du carnet ; chiffres de marge (round, jour) 32 à 48. Manrope : corps 16 / 28, listes 15 / 28, libellés et dates 13, repères en capitales 11 avec approche 0,18 em. IBM Plex Mono 14 / 28 pour les blocs à coller. Jamais plus de trois tailles sur une page hors marge.

**Motifs.** Réglure, filets simples et doubles, coin corné, tranche (trois traits fins), bord dentelé (`clip-path` polygonal), tampon rectangulaire à bord légèrement irrégulier (SVG), losanges de 4 px comme puces de marge.

**Thèmes personnels.** Un thème redéfinit uniquement `--bureau`, `--page`, `--page-2`, `--reglure`, `--encre`, `--encre-2`, `--encre-grise` et `--ruban`. `--encre-humide`, `--tampon` et `--rouille` restent fixes pour garder leur sens partout. Le thème « Papier » (clair) inverse la matière : page `#EFEAD9`, bureau `#DCD6C5`, encre `#1B2A2E`, réglure `#D9D2BF`. Le thème violet et les thèmes débloqués suivent la même liste de tokens. Un thème ne touche jamais la réglure de 28 px, les fontes, les mouvements ni la signification des tampons. L'accueil public ignore les thèmes.

## 8. Voix

Règles : tutoiement, présent, phrases courtes, pas de point d'exclamation, pas d'émoji, pas de « succès », pas de « oups ». Le carnet parle comme un carnet : il *note*, *garde*, *tient*, il ne « traite » pas et ne « charge » pas. Le staff est nommé par son rôle (« un MJ », « un administrateur »), jamais par « l'équipe ». Aucune valeur affichée n'est inventée ; aucune confirmation avant le serveur. Les textes d'interface :

1. Journal vide — « Cette page est blanche. Elle t'attend. »
2. Dernières pages, rien de nouveau — « Rien depuis ta dernière lecture. Le carnet reste ouvert. »
3. Écriture en attente — « L'encre sèche… »
4. Écriture confirmée (note de marge, 3 s) — « Noté. L'encre a pris. »
5. Erreur réseau ou refus serveur — « L'encre n'a pas pris. Ta page est gardée ici ; réessaie quand tu veux. »
6. Conflit de version — « Quelqu'un a écrit sur cette page entre-temps. Relis avant d'écrire par-dessus. »
7. Inscription confirmée — « Tu viens. Le rendez-vous est en marge de ton carnet. »
8. Désinscription confirmée — « Rayé. Ta place est libre. »
9. Compte en attente de liaison — « Ton compte existe. Ta fiche attend qu'un administrateur la relie à ton personnage. »
10. Créature non rencontrée — « Cette page reste blanche tant que personne ne l'a rencontré. »
11. Notification de tampon — « Un MJ a tamponné le combat du 26 septembre. Tes conséquences sont sur ta fiche. »
12. Session expirée — « Le carnet s'est refermé. Rouvre-le en te reconnectant. »

Transition de page (lecteurs d'écran, `aria-live`) : « Page : Mon journal ». Suppression de compte (admin exclu) : « Le carnet se ferme pour de bon. Ce qui est écrit ne se rouvre pas. » avec saisie du nom du compte.

## 9. Position sur les six conséquences du brief

1. **Le Fil** — *transformer* en « Dernières pages » : fini, chronologique, corné, paginé. Un fil infini contredit l'objet et pousse à la consultation compulsive ; un carnet se referme.
2. **En scène** — *garder*, sous la forme du feuillet volant : c'est la conséquence la plus juste du brief, elle gagne une matière et un geste (arracher, reposer) qui la rendent mémorisable.
3. **La Table** — *garder et durcir* : lecture seule absolue côté joueur, encre humide au rythme du MJ, tampon simultané. C'est là que « compagnon, pas jeu » se prouve : le joueur voit la page s'écrire et va écrire sur Discord.
4. **Le Codex qui se révèle** — *garder* avec la page blanche : la révélation devient un extrait choisi par le MJ à l'archivage, ce qui protège les secrets mieux qu'un déverrouillage automatique de champs.
5. **La Chronique publique** — *transformer* : trois feuillets publiés au lieu d'une chronique ; sans contenu publié, un feuillet blanc honnête. Aucun compteur, même « réel », ne revient : un nombre de créatures vaincues est déjà un vocabulaire de jeu vidéo.
6. **Discord est chez lui ici** — *garder mais contenir* : connexion Discord optionnelle, liens de salon en marge, blocs à coller, webhook facultatif à la création d'événement. Rien d'incorporé (pas de widget, pas de présence, pas d'avatars ronds) : Discord est la table, le carnet reste à côté.

## 10. Risques et difficultés de construction

- **La Table en temps réel sur Netlify** : pas de websocket persistant en fonctions serverless ; il faudra soit un polling court (3 s) sur une route SvelteKit, soit des SSE via une fonction edge avec Neon. Le rythme « le MJ écrit… » doit tolérer une latence de quelques secondes sans paraître cassé.
- **La rature exige un modèle immuable** : le schéma relationnel doit journaliser chaque changement de valeur (ancienne, nouvelle, auteur, tampon) pour le journal, les ressources et l'XP ; la migration depuis `np_store` ne pourra reconstituer que l'état courant et devra marquer l'historique hérité « repris sans rature ».
- **La densité de l'outil MJ contre la réglure** : un combat à dix combattants sur 28 px de ligne est long ; il faudra une variante « serrée » (24 px) réservée à la Table, et vérifier au clavier que déclaration et résolution restent plus rapides qu'aujourd'hui.
- **Contraste et grain** : encre grise `#7E8F8B` sur page `#102327` frôle le seuil AA pour le texte courant ; la réserver aux ratures et aux paliers non atteints, jamais au corps. Le grain doit être désactivable (`prefers-contrast: more`) et le thème « Papier » testé à part. L'appui long du tampon a besoin d'une alternative clavier (Entrée maintenue ou bouton « Tamponner » avec confirmation).
