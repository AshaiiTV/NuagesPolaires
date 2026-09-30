# Direction « Observatoire »

Direction de création pour l'overhaul de Nuages Polaires. Rédigée le 30 septembre 2026 après lecture du brief du lead (`02-brief-creatif.md`), de la charte Mystique polaire, du plan du site, de la lecture produit de GPT, de l'audit de contenu de l'accueil, de `fusion-xp.md` et du vocabulaire réel du simulateur (`assets/js/main.js`). Lecture seule ; aucune règle de jeu ni contenu d'univers n'est inventé ici : ce document propose des formes, des parcours, des écrans et des textes d'interface.

## 1. Nom et principe

**L'Observatoire.** Le compagnon est un instrument de relevé posé à côté de Discord : il mesure un monde plié et rend chaque chiffre du jeu (ressources, niveau, paliers, initiative, dates) lisible d'un seul regard, calmement, sans jamais jouer à la place de la table.

## 2. Critique du brief du lead

Ce qu'il a raison de tenir : la contrainte « compagnon, pas jeu » ; Mystique polaire comme socle (l'accueil actuel est effectivement réussi : paysage, Cormorant italique, ivoire sur encre, bouton sauge) ; la Table en lecture seule pendant le combat ; SvelteKit avec tokens CSS ; l'interdiction des chiffres inventés ; le tutoiement court.

Ce qu'il rate, vu depuis l'Observatoire :

- **« La trace » est une métaphore de lecture, pas une métaphore d'usage.** Quatre fois sur cinq, on ouvre le compagnon pour *un chiffre* : il me reste combien d'EP, quel palier à ce niveau, qui a l'initiative, quand est la prochaine sortie. Un fil chronologique met ce chiffre au bout d'un défilement. Le brief remplace le tableau de bord par un fil ; je remplace les deux par un **relevé** : l'état exact, daté, puis seulement ensuite ce qui a changé.
- **Le MJ est traité comme un second public.** Le simulateur est déjà le vrai outil du serveur (composition, initiative, déclaration / résolution, statuts, invocations, notes, annulation, archive). C'est là que l'arbitrage se joue et que la lisibilité manque le plus (polices de 7 à 9 px dans le code actuel). L'Observatoire fait de l'outil MJ l'écran le plus soigné du site, pas le dernier.
- **« Le Codex qui se révèle » frôle la mécanique de déblocage.** Une créature qui « se débloque » avec les rencontres, c'est un succès de jeu vidéo à peine déguisé. Le lore doit rester au designer ; le compagnon peut *dater et compter* les observations, pas conditionner la connaissance.
- **La matière annoncée (grain, brume animée, page qui se tourne) est décorative.** Un instrument bouge quand une mesure change, jamais pour l'ambiance. Tout mouvement doit signifier une valeur.
- **Rien n'est dit de la typographie des chiffres.** Chiffres tabulaires, alignement à droite, unité en petites capitales, différence de valeur imprimée à côté : c'est l'essentiel d'un compagnon de JDR et le brief n'en parle pas.

## 3. Métaphore d'interface et système de composition

**Métaphore.** Une station d'observation dans un monde sans constructions : ce qui reste, ce sont des instruments (boussole, réglettes graduées, tables de relevés, cartouches numérotés) posés sur de l'encre. Chaque écran est une **planche de relevé** : un cartouche en haut (index, titre, date du dernier relevé), des mesures au milieu, des notes en bas.

**Grille.** 12 colonnes, gouttière 24 px (16 px sur téléphone), module vertical de 8 px. Largeur de lecture 72 caractères pour la prose, 100 % pour les tables. Les tables et réglettes s'alignent sur une **règle de graduation** : un trait fin toutes les 8 colonnes de chiffres, pour que l'œil compte sans lire.

**Cartouche.** Chaque planche commence par la même ligne : `NP / 04 — PERSONNAGE — relevé du 30.09.2026 · 21:14`. L'index est stable par rubrique (01 accueil, 02 univers, 03 relevé, 04 personnage, 05 journal, 06 agenda, 07 référence, 08 table, 09 atelier, 10 administration). La date est celle de la dernière sauvegarde confirmée par le serveur ; c'est elle qui sert de confirmation (§ 6).

**Rythme.** Une planche = un cartouche, un à trois **relevés** (blocs de mesures), une **marge** (notes, actions secondaires). Jamais plus de trois relevés au-dessus du pli. Les titres Cormorant sont rares : un par planche.

**Matière.** Encre mate `#091519`, surfaces pierre `#102327`, traits fins laiton à 24 % d'opacité (« filets »), grain papier très léger (2 % de bruit, désactivé sous `prefers-reduced-motion` et sur batterie faible). Pas d'ombres portées : les surfaces se distinguent par la valeur, pas par le relief.

**Mouvement.** Trois mouvements autorisés, tous liés à une mesure : (a) l'aiguille (rotation d'un repère, 240 ms, courbe `cubic-bezier(.2,.8,.2,1)`), (b) le roulement de chiffre (les chiffres tabulaires défilent comme un compteur, 180 ms), (c) le filet qui s'étire (une ligne fine grandit pour révéler un bloc, 200 ms). Transition de page : un filet laiton horizontal balaie du cartouche vers le bas, 260 ms. `prefers-reduced-motion` : tout devient instantané, sans exception.

**Interdits.** Halos et lueurs ; verre dépoli ; dégradés sur les jauges ; cadres imbriqués ; badges ronds de notification avec compteur ; émojis dans l'interface (les icônes sont des glyphes tracés à 1 px) ; grands chiffres décoratifs ; vocabulaire de jeu vidéo (boutique, objectifs, quête, loot, en ligne, XP farm) ; confettis, sons ; toute animation d'ambiance.

## 4. Navigation complète

Une barre unique, à gauche sur ordinateur (rail de 232 px, réductible à 64 px avec les index `01`–`10` seuls), en bas sur téléphone (cinq entrées maximum, le reste sous « Plus »). Les libellés sont exacts, l'ordre aussi.

| Profil | Rubriques (ordre) | Téléphone (barre basse) |
|---|---|---|
| Visiteur | Accueil · L'univers · Les Serments · Le bestiaire · Le système de jeu · Premiers pas · Règlement · **Espace joueur** | Accueil · Univers · Serments · Bestiaire · Espace joueur |
| Compte en attente | Relevé · Référence · Agenda · Compte | Relevé · Référence · Agenda · Compte |
| Joueur lié | Relevé · Personnage · Journal · Agenda · Référence · Compte | Relevé · Personnage · Journal · Agenda · Plus (Référence, Compte) |
| MJ | Joueur lié + **La Table** (Personnages · Apparitions · Combat · Archives · Événements) | Relevé · Personnage · La Table · Agenda · Plus |
| Designer | Joueur lié + **Atelier** (Bestiaire · Serments si le droit est accordé · Événements selon droits) | Relevé · Atelier · Agenda · Référence · Plus |
| Admin | Tout + **Administration** (Vue d'ensemble · Comptes et liaisons · Thèmes · Journal d'audit · Données) | Relevé · La Table · Administration · Agenda · Plus |

« Référence » regroupe Serments, Bestiaire, Système de jeu, Règlement, Premiers pas ; ce sont les mêmes pages que le visiteur voit, avec le calque MJ en plus (§ 6). « Compte » reste distinct de « Personnage ». Les archives de combat d'un joueur se lisent depuis Journal (onglet « Combats »), pas depuis La Table. Le prototype RPG et la carte jouable n'ont aucune entrée, nulle part.

Sur ordinateur, le rail affiche pour chaque rubrique son index et, à droite, une **mesure de veille** en chiffres tabulaires : Agenda `J-3`, Relevé `2 à lire`, La Table `round 4` si un combat est ouvert. Ce sont les seuls chiffres du rail.

## 5. Écrans clés, zone par zone

Convention : *Haut* = cartouche et en-tête ; *Milieu* = relevés ; *Bas* = marge, notes, actions secondaires ; *Téléphone* = ce qui change à 390 px.

### 5.1 Accueil public (`NP / 01`)

- *Haut* : masthead actuel conservé (wordmark, « L'univers », « Les Serments », « Espace joueur ↗ »). Le paysage, le titre `Nuages / Polaires.`, la tagline, le bouton sauge « Rejoindre l'aventure ↗ » et la coordonnée `NP / 01 — APRÈS LE BASCULEMENT` restent tels quels.
- *Milieu* : la section « Les traces de notre passage » remplace ses cinq compteurs par un **relevé du serveur** en une seule ligne de table : `Serments · 12 | Personnages · 41 | Prochain rendez-vous · sam. 4 oct. · 21:00 | Dernier récit publié · il y a 3 jours`. Valeurs réelles uniquement, `—` sinon. « Créatures vaincues » et « Gemmes distribuées » disparaissent : ce sont des scores. Suivent les sections 01 L'univers et 02 Les Serments existantes, puis une section **03 La chronique** : une table datée à trois colonnes (date, événement, type) mêlant les derniers événements passés publics et les prochains, six lignes, lien « Voir l'agenda ». Aucune carte, aucun visuel de créature.
- *Bas* : invitation « Laissez votre trace. », colophon avec « Règlement » et « Premiers pas ». Le bouton RPG disparaît.
- *Téléphone* : le paysage garde 62 vh, la table de relevé devient deux colonnes empilées, la chronique garde ses trois colonnes en 13 px.

### 5.2 Entrée du joueur connecté : le Relevé (`NP / 03`)

- *Haut* : cartouche `NP / 03 — RELEVÉ — Nom du personnage · Serment · niv. 7`. À droite du cartouche, la **boussole d'agenda** (§ 6.1).
- *Milieu*, relevé 1 « État » : trois réglettes PV / EP / EM (§ 6.2) avec valeur `84 / 120` en chiffres tabulaires 28 px, puis une ligne `Niveau 7 · 132 / 210 XP · prochain palier de branche : niv. 10`. Ce bloc est exactement ce qui figure sur la fiche ; il n'est pas résumé, il est le même composant. Relevé 2 « Depuis ton dernier passage » : une table datée (date, source, delta) des entrées d'historique nouvelles : `29.09 · Combat archivé « Col des brumes » · +18 XP`, `28.09 · Gemme fusionnée · +20 XP`, `27.09 · Inscription confirmée · Sortie du 4 oct.`. Les deltas sont alignés à droite, signés. Relevé 3 « À venir » : les deux prochains événements avec état de participation explicite (`Inscrit`, `Non inscrit`, `Complet`).
- *Bas* : « Bloc de scène » (bouton « Copier pour Discord », § 6.3), lien « Ouvrir le salon » si le lien Discord de l'événement est renseigné, et une note en Cormorant italique si le journal est vide : « Les récits restent à écrire. »
- *Compte en attente* : le cartouche indique `RELEVÉ — en attente de liaison` ; le relevé 1 est remplacé par une phrase et un état : « Ton compte existe. Un administrateur doit le lier à ton personnage. Demande-le sur Discord. » avec le lien du salon d'accueil si renseigné.
- *Téléphone* : réglettes sur toute la largeur, valeur au-dessus de la règle ; la table « Depuis ton dernier passage » passe en liste de deux lignes (titre / date et delta).

### 5.3 Fiche personnage (`NP / 04`)

- *Haut* : portrait carré 96 px (initiale en Cormorant si l'image manque), nom, Serment, rang (`Basique`, `Aguerri`, …), branche. Cartouche avec date du dernier relevé.
- *Milieu*, quatre chapitres numérotés dans une table des matières fixe à gauche (`I Ressources · II Équipement et inventaire · III Serment et paliers · IV Historique`) ; le focus clavier suit le chapitre. **I** : les trois réglettes, niveau et XP, statuts actifs en liste sobre (`Saignement · 2 rounds`), bonus / malus en table à deux colonnes. **II** : équipement en table (emplacement, objet, effet), inventaire en table (objet, quantité, action « Déclarer une consommation » sur son propre personnage seulement), gemmes en trois lignes `+5 · +20 · +50` avec stock et bouton « Fusionner » ; le stock à zéro affiche `0` et un bouton désactivé, pas un état vide décoratif. **III** : le Serment en une colonne de prose (Cormorant 18 px) et, à droite, la **règle des paliers** : une réglette verticale graduée par niveau (1 à 20) où les paliers de la branche sont des crans laiton, le niveau actuel une aiguille ; les capacités du palier atteint se lisent en dessous, celles des paliers suivants en brume claire avec la mention `niv. 13`. **IV** : historique en table filtrable (date, type, détail, delta), mêmes filtres qu'aujourd'hui.
- *Bas* : « Exporter en PDF », « Copier le bloc de scène ».
- *Téléphone* : la table des matières devient une barre d'onglets collante sous le cartouche ; la règle des paliers passe à l'horizontale et se fait défiler au doigt, l'aiguille reste centrée.

### 5.4 Journal (`NP / 05`)

- *Haut* : cartouche, deux onglets : « Carnet » et « Combats ».
- *Milieu*, Carnet : une page ivoire sur encre (fond `#0E1F23`, texte `#F0EEE5`, Cormorant 18 px / 1.7), interligne réglé, marge gauche graduée par date (chaque entrée porte sa date dans la marge, en Manrope 12 px laiton). Édition en place, sauvegarde explicite. Sous le titre, une ligne fixe indique la visibilité réelle : « Visible par toi, les MJ et les administrateurs. » (à aligner sur les droits serveur avant mise en ligne, jamais l'inverse). Combats : les archives lisibles par le compte, en table (date, titre, participants, rounds, issue), avec recherche et export texte existants ; l'ouverture d'une archive affiche le récit en Cormorant et le relevé final en table.
- *Bas* : « Exporter le carnet (.txt) ».
- *Téléphone* : la marge de dates passe au-dessus de chaque entrée.

### 5.5 Agenda (`NP / 06`)

- *Haut* : cartouche `NP / 06 — AGENDA — semaine du 29.09`. Boussole d'agenda à droite.
- *Milieu* : une table, pas des cartes. Colonnes : date (bloc `SAM 04 · 21:00` en tabulaire), titre, type, places `6 / 8`, ma participation (bouton « M'inscrire » / « Me désinscrire », état `Complet`). Les événements passés sous un filet, en brume claire. Les événements masqués n'apparaissent jamais aux joueurs.
- *Bas* : pour MJ / admin (et designer selon droits), « Créer un événement » ouvre une planche latérale : titre, date, type, capacité, description, visibilité, lien du salon Discord, option « Prévenir sur Discord » (webhook, MJ / admin uniquement). L'échec de la notification est distingué de la sauvegarde de l'événement.
- *Téléphone* : chaque ligne devient un bloc de deux lignes ; le bouton de participation garde 44 px.

### 5.6 Référence : Serments et bestiaire (`NP / 07`)

- *Serments* : sommaire à gauche par catégorie, fiche à droite. Chaque Serment : prose du designer en Cormorant, puis la même **règle des paliers** que sur la fiche, ici pour toutes les branches côte à côte, chaque cran ouvrant sa description au clavier. Le texte existant sur les rangs (Basiques, Aguerris hors vitrine, etc.) est conservé tel quel.
- *Bestiaire* : recherche, filtres zone / comportement / tri existants. La liste est une table (nom, zones, comportement, observations). La fiche : portrait à gauche, à droite la description publique, puis un relevé « Observations » : `Rencontres archivées · 4 — dernière · 12.09.2026 — zones relevées · Brumes hautes, Col`. Ce relevé est calculé depuis les archives terminées et ne cache rien : la fiche publique montre ce que le designer a publié, point. Pas de silhouette grisée, pas de « ??? ».
- *Calque MJ* (§ 6.4) : pour MJ / designer / admin, un interrupteur « Calque staff » superpose statistiques, compétences et notes réservées.
- *Téléphone* : sommaire et filtres dans une feuille glissante ; les tables gardent trois colonnes.

### 5.7 La Table — outil de combat, vu par le MJ (`NP / 08`)

- *Haut* : cartouche `NP / 08 — LA TABLE — « Col des brumes » — round 4 · déclaration`. À droite, le **cadran d'initiative** (§ 6.5) et deux boutons : « Terminer le round » (ou « Résoudre »), « Fin de combat ».
- *Milieu*, avant lancement : composition en deux colonnes (Personnages / Créatures), ajout depuis le registre ou depuis un tirage d'Apparitions (zone, groupes, quantités, pondération), puis « Fixer l'initiative » (camp du premier agresseur, conservée tout le combat) et « Lancer ». Pendant le combat : une table par camp, **une ligne par combattant**, colonnes fixes : nom · PV `84/120` · EP `40/60` · EM `12/30` · statuts · déclarations `● ● ○` · actions. Les valeurs sont en tabulaire 16 px, alignées à droite, avec un delta signé qui s'imprime à côté pendant 2 s après chaque ajustement (`−12`). Les ajustements MJ (±5 EP, repos court, restauration, statut, invocation) sont dans un menu par ligne, jamais en boutons de 8 px. La phase de déclaration liste les actions déclarées (frappe, esquive, bloquer, parer, déplacer, soin, capacité, passer…) par combattant dans une colonne fine ; la résolution s'écrit dans le **journal de combat** à droite (colonne 4/12), horodaté au round.
- *Bas* : notes du MJ, « Annuler la dernière action », sauvegarde (état `Sauvegardé · 21:14`), « Archiver ». L'archivage est un parcours complet : récapitulatif, récompenses à valider par personnage (XP de combat), puis confirmation serveur avant tout affichage de succès.
- *Téléphone* (MJ en déplacement) : une table par camp, en pleine largeur, lignes repliables ; le journal de combat devient un onglet.

### 5.8 La Table — vue par un joueur concerné

- *Haut* : cartouche `LA TABLE — « Col des brumes » — round 4 · déclaration` et une mention fixe : « Le MJ arbitre. Tu écris sur Discord. Cette page reflète. »
- *Milieu* : la même table que le MJ, **en lecture**, réduite aux colonnes nom · PV · EP · EM · statuts. Ma ligne est soulignée d'un filet laiton. Le cadran d'initiative est identique. Le journal de combat public défile en dessous, dernière entrée en haut. Aucun bouton d'action, aucun ajustement. Les valeurs des créatures ne montrent que ce que le MJ a rendu visible (au minimum le nom et les statuts ; PV en réglette sans chiffre si le MJ le choisit).
- *Bas* : « Copier mon relevé » (bloc de scène de mon personnage tel qu'il est sur la Table).
- *Téléphone* : c'est l'usage principal. Table en trois colonnes (nom, PV, EP/EM empilées), ma ligne épinglée en haut, mise à jour par rafraîchissement court (§ 10).

### 5.9 Gestion des personnages (MJ)

- *Haut* : cartouche `LA TABLE — PERSONNAGES`, recherche, filtre par Serment et par compte lié.
- *Milieu* : table (portrait 32 px, nom, Serment, rang, niveau, PV / EP / EM en tabulaire, compte lié, dernier relevé). Une ligne s'ouvre en planche latérale : la fiche complète en édition, avec les mêmes chapitres que le joueur voit, plus « Attribuer » (objet, XP de combat, gemmes) et « Historique ». Les opérations sensibles (identité, Serment, suppression) sont grisées pour le MJ avec la mention « Réservé à l'administration ».
- *Bas* : « Créer un personnage » (ouvre la même planche, vide).

### 5.10 Administration (`NP / 10`)

- *Haut* : cartouche, cinq onglets : Vue d'ensemble · Comptes et liaisons · Thèmes · Journal d'audit · Données.
- *Milieu* : Vue d'ensemble = une table de relevés serveur (comptes, comptes en attente, personnages, événements à venir, archives, dernière sauvegarde) et la liste des comptes en attente avec bouton « Lier ». Comptes = table (pseudo, rôle en sélecteur, personnage lié, dernière visite, actions : réinitialisation à usage unique, thèmes attribués). Journal d'audit = table filtrable (acteur, rôle, action, détails, date) reprenant les filtres actuels. Données = export / import JSON avec avertissement exact : « Ce fichier n'est pas une sauvegarde complète du site. »
- *Bas* : diagnostics (état de la base, version), en petites capitales.

## 6. Cinq moments signature

1. **La boussole d'agenda.** L'emblème boussole n'est plus un logo posé : sur le Relevé et l'Agenda, son aiguille pointe vers le prochain rendez-vous. Le cadran porte sept crans (les sept prochains jours) ; l'aiguille se pose sur le jour, une seconde graduation fine indique l'heure. Au survol ou au toucher, le cadran écrit `sam. 4 oct. · 21:00 · J-3` en tabulaire. Sans événement, l'aiguille repose au nord et le cadran dit « Rien de prévu. » Elle tourne en 240 ms quand un événement est créé pendant que la page est ouverte.
2. **Les réglettes.** PV, EP, EM ne sont pas des barres remplies mais des règles graduées gravées : ticks tous les 10 points, valeur maximale à droite, aiguille à la valeur actuelle, zone parcourue teintée à 40 %. Quand un MJ ajuste (`−12`), l'aiguille glisse, les chiffres roulent, et le delta signé s'imprime à côté de la valeur en laiton puis s'efface en 2 s, comme une annotation au crayon. On lit une valeur et son mouvement, jamais un pourcentage.
3. **Le bloc de scène.** Un bouton « Copier pour Discord » produit un relevé aligné en texte brut : `NP · Aria — Serment du Croisé · niv. 7 / PV 84/120 · EP 40/60 · EM 12/30 / Statuts : Saignement (2) / relevé 30.09 21:14`. Au clic, un tampon d'encre s'imprime brièvement sur le bloc (200 ms, opacité), le bouton devient « Copié · 21:14 ». Le même bloc existe sur la Table pour son propre combattant.
4. **Le calque staff.** Sur toute page de Référence, MJ, designer et admin disposent d'un interrupteur « Calque staff ». Il pose un papier calque : la fiche publique reste lisible dessous, les données réservées (statistiques, compétences, notes de conception) s'impriment dessus en laiton, décalées de 8 px, comme une annotation de marge. Un joueur ne voit jamais l'interrupteur ; le serveur ne sert jamais ces données à un joueur.
5. **Le cadran d'initiative et la confirmation par la date.** Sur la Table, l'initiative est un cadran à deux positions (Personnages / Créatures) dont l'aiguille se fixe au camp du premier agresseur et ne bouge plus de tout le combat ; le round courant s'inscrit au centre, la phase (déclaration / résolution) sous forme de filet qui s'étire d'un bord à l'autre. Et partout sur le site, il n'y a pas de toast de succès : la sauvegarde confirmée par le serveur fait rouler la date du cartouche (`relevé du 30.09.2026 · 21:14 → 21:16`) et grave un tick laiton à côté pendant une seconde. Une erreur, elle, s'écrit en marge, en toutes lettres.

## 7. Direction visuelle

**On garde** : nuit d'encre, pierre sombre, ivoire, brume claire, aurore, laiton pâle, sauge pour l'action principale de l'accueil ; Cormorant Garamond pour la voix ; Manrope pour l'interface ; la boussole ; le paysage sans constructions ; les coordonnées et chapitres numérotés ; les surfaces mates, angles discrets, séparateurs fins ; cibles de 44 px.

**On ajoute** : des tokens de graduation et de mesure ; une famille de composants d'instrument (cartouche, réglette, règle des paliers, cadran, table de relevés, calque) ; des chiffres tabulaires partout (`font-variant-numeric: tabular-nums`) ; un grain papier à 2 % ; des unités en petites capitales espacées.

**On retire** : Cinzel ; les halos ; les cartes arrondies à rayon 18–22 px et dégradés des ateliers actuels ; les émojis (🛡, 🎯, ☕, ✦) ; les compteurs de l'accueil ; les polices de 7 à 9 px du simulateur ; le vocabulaire de jeu vidéo.

**Palette (hex).** Nuit d'encre `#091519` · Pierre sombre `#102327` · Brume profonde `#172E32` · Ivoire `#F0EEE5` · Brume claire `#BDCDC8` · Aurore `#95CDBB` · Laiton pâle `#C6B38B` · Sauge claire `#C6D8C4`. Nouveaux : Filet `#2A4145` (traits fins) · Graduation `#52706F` (ticks, texte de repère) · Papier `#0E1F23` (fond du journal). Mesures : PV `#D9857A` · EP `#C6B38B` · EM `#95CDBB`. Sémantique : Danger `#D06A5E` · Réussite `#8FC7A3` · Attention `#E0C27C` · Serment `#C6B38B`. Les couleurs de danger, réussite, statut et Serment gardent leur sens dans tous les thèmes.

**Typographie.** Cormorant Garamond : titre de planche 40 / 48 px (28 px sur téléphone), prose du journal et des Serments 18 px / 1.7, citations italiques 22 px. Manrope : interface 14 px / 1.5, notes 13 px, repères en capitales 11 px espacées 0.18 em. Chiffres de relevé (Manrope tabulaire, graisse 500) : 28 px sur le Relevé et la fiche, 16 px dans les tables, 13 px dans le rail. Rien en dessous de 12 px.

**Motifs.** Filets horizontaux laiton à 24 % ; ticks de graduation de 1 × 6 px ; losanges de 4 px comme puces ; cartouche à coins ouverts (les angles du cadre sont interrompus sur 8 px). Aucune texture d'image en dehors du paysage d'accueil.

**Thèmes personnels.** Un thème redéfinit uniquement les huit couleurs de marque et Papier ; Filet et Graduation sont dérivés (mélange calculé à 20 % et 40 % entre fond et texte) ; les couleurs de mesure et sémantiques sont fixes. Structure, typographie, instruments et mouvement ne changent jamais. La galerie de thèmes montre chaque thème sous forme de mini-planche (cartouche + réglette), états possédé / actif / verrouillé, sélection au clavier.

## 8. Voix

Règles : tutoiement, présent, phrases courtes ; le compagnon décrit ce qu'il mesure, jamais ce qu'il ressent ; aucun point d'exclamation ; aucun chiffre non confirmé par le serveur ; une erreur dit ce qui n'a pas été fait et ce qui reste vrai ; une confirmation est une date, pas une félicitation ; les états vides sont des phrases complètes en Cormorant italique, une seule par écran.

1. Relevé, aucune nouveauté : « Rien n'a changé depuis ton dernier passage. »
2. Journal vide : « Les récits restent à écrire. »
3. Agenda vide : « Rien de prévu. Le monde attend. »
4. Bestiaire, aucune observation : « Aucune rencontre archivée. La fiche dit ce que le designer a publié. »
5. Compte en attente : « Ton compte existe. Un administrateur doit le lier à ton personnage. »
6. Sauvegarde confirmée (cartouche) : « relevé du 30.09.2026 · 21:16 »
7. Copie du bloc de scène : « Copié · 21:16 »
8. Inscription confirmée : « Inscrit. Sortie du 4 oct., 21:00. »
9. Erreur de sauvegarde : « La fiche n'a pas été enregistrée. Tes valeurs à l'écran sont conservées. Réessaie. »
10. Conflit de version : « Quelqu'un a modifié cette fiche entre-temps. Relis, puis enregistre à nouveau. »
11. Transition vers la Table : « Le MJ a ouvert une table. Tu y es. »
12. Notification d'événement (Discord ou in-app) : « Nouvel événement · sam. 4 oct. · 21:00 · 6 places. »

## 9. Position sur les six conséquences du brief

1. **Le Fil → transformer en Relevé.** L'état daté d'abord, le « depuis ton dernier passage » ensuite, en table et non en fil. On garde l'idée de reprise, on renonce au défilement chronologique comme entrée.
2. **En scène → garder, absorbé dans le bloc de scène.** Pas de mode à part : le Relevé sur téléphone est déjà le mode de scène, et le bloc copiable est sa sortie. Un mode de plus serait une navigation de plus.
3. **La Table → garder et en faire le centre.** C'est l'instrument le plus lisible du site, dans les deux sens (MJ, joueur). Lecture seule côté joueur, sans exception.
4. **Le Codex qui se révèle → transformer.** On compte et on date les observations, on ne conditionne pas la connaissance. Le designer décide ce qui est public ; le compagnon relève ce qui a été rencontré. Aucun déblocage.
5. **La Chronique publique → transformer.** Oui à un monde vivant, sous forme de table datée sobre et d'un relevé du serveur à quatre valeurs réelles ; non aux compteurs de combat et aux récits en vitrine sans contrôle du MJ (publier un récit reste une décision explicite à l'archivage).
6. **Discord chez lui → garder.** Connexion Discord optionnelle, liens de salon sur les événements, bloc de scène, webhook d'événement MJ / admin. Le bloc de scène est la forme la plus utile de cette conséquence.

## 10. Risques et difficultés de construction

- **Le rafraîchissement de la Table.** Netlify sans connexion persistante : prévoir un rafraîchissement court côté joueur (2 à 3 s, arrêté hors onglet visible) sur un état de combat versionné ; l'expérience « le MJ ajuste, mon téléphone suit » dépend entièrement de ce point.
- **Les tables sur téléphone.** L'Observatoire repose sur des tables ; à 390 px, une table de six colonnes devient illisible. Chaque table doit avoir une forme téléphone dessinée (deux lignes par entrée), sinon la direction s'effondre sur mobile.
- **Le glissement vers le HUD.** Cadran, réglettes, deltas qui s'impriment : le vocabulaire est celui d'un instrument, mais un seul ajout (score, classement, badge) le fait basculer en jeu. Règle : aucune valeur agrégée entre personnages, aucune comparaison, aucun rang.
- **Le calque staff et la visibilité du journal** exigent que le serveur filtre les données par rôle avant envoi ; un calque appliqué en CSS sur des données déjà servies serait une fuite. De même, la mention de visibilité du journal doit décrire les droits réels du serveur, à décider avant la mise en ligne.
