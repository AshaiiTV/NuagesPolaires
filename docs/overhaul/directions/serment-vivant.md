# Direction « Serment vivant »

Direction de création rédigée le 30 septembre 2026 pour l'overhaul de Nuages Polaires, depuis l'angle « l'identité d'abord ». Lecture préalable : brief créatif du lead, charte Mystique polaire, plan du site, lecture produit de GPT, audit de l'accueil, code des Serments (`SD`) et de la progression commune (`fusion-xp.md`). Aucune règle de jeu ni contenu d'univers n'est inventé ici : tout ce qui touche au lore reste à remplir par le staff dans les ateliers.

## 1. Nom et principe

**Serment vivant** — le Serment est l'interface : il reconnaît son porteur à l'entrée, il grandit avec lui sous la forme d'une marque qui s'étend, et il teinte tout ce que le compagnon lui montre.

## 2. Critique du brief du lead

Ce qu'il a raison de tenir : compagnon et non jeu ; la trace comme idée directrice ; Mystique polaire approfondie plutôt que remplacée ; une seule façon de faire chaque chose ; la voix de carnet ; le mode En scène ; la Table en lecture ; le codex qui se révèle par les archives ; SvelteKit avec CSS natif et tokens. Tout cela reste.

Ce qu'il rate :

- **La trace est une idée d'archiviste, pas une identité.** Un fil chronologique dit « voilà ce qui s'est passé » ; il ne dit pas « voilà qui tu es ». Le site le proclame déjà en page d'accueil : « Nul ne choisit son Serment. C'est le Serment qui reconnaît son porteur. » Le brief laisse cette phrase à l'accueil et ne la fait jamais entrer dans le compagnon. Résultat prévisible : un Fil élégant mais interchangeable, le même pour tout le monde, où le Serment n'est qu'un chapitre parmi quatre.
- **La progression est traitée comme une donnée** (niveau, XP, paliers) alors que les données existantes racontent une forme : deux branches, quatre paliers, un rang, une lignée. C'est un dessin qui attend d'être dessiné.
- **Les thèmes personnels sont gardés « comme récompense »** sans être reliés à quoi que ce soit ; deux systèmes de couleur sans hiérarchie finissent toujours par se contredire. Cette direction subordonne le thème à la marque (§7).
- **« De l'air et de la matière »** sans dire d'où vient la matière. Ici elle vient du Serment, et c'est ce qui la rend non générique.

## 3. Métaphore d'interface et système de composition

**Métaphore** : le compagnon est un portrait tenu à jour par la marque. Le porteur ne consulte pas un tableau de bord ; il regarde sa marque, et la marque lui montre ce qu'elle a enregistré. Tout écran connecté se compose autour de trois objets : le **portrait** (image du personnage), la **marque** (dessin vectoriel du Serment, généré) et le **lavis** (teinte du Serment diffusée sur l'encre, jamais opaque).

**La marque** est un tracé SVG à traits fins généré à partir des données du Serment :

- un tronc (le rang : Basique, Aguerri, etc.) ;
- deux rameaux (branches A et B ; la branche choisie en trait plein, l'autre en pointillé) ;
- quatre nœuds par rameau (les paliers du rang : 2, 5, 7, 10 en Basique ; 10, 13, 16, 20 en Aguerri) ; un nœud atteint est plein ;
- le tronçon vers le prochain nœud se remplit d'encre proportionnellement à l'XP du niveau courant (`xp / (niveau × 30)`) ;
- aucun chiffre sur la marque elle-même ; les chiffres sont à côté, en petit ;
- un changement de Serment redessine la marque en conservant les nœuds atteints, puisque le niveau est conservé.

**Grille** : 12 colonnes à 1440 px, contenu 1200 px maximum, marges 64, gouttière 24. Tablette : 8 colonnes, marges 32. Téléphone : 4 colonnes, marges 16, jamais de défilement horizontal. Une seule colonne de lecture (68 caractères maximum) pour tout texte long. Les écrans connectés partagent un gabarit : rail gauche 72 px (ordinateur) ou barre basse 64 px (téléphone), en-tête d'écran de 96 px avec repère de coordonnées, corps, pied éventuel.

**Rythme** : base 8 px, interligne 28 px pour le corps, sections espacées de 56 ou 96 px. Les chapitres sont numérotés à la manière de l'accueil (`01`, `02`), en Manrope 11 px capitales espacées.

**Matière** : grain SVG (turbulence, 3 % d'opacité) sur toute surface ; lavis radial de la teinte du Serment à 8 % d'opacité, ancré derrière la marque ; traits ivoire à 14 % pour les séparateurs ; surfaces mates `#102327` et `#172E32`. Pas d'ombre portée, pas de flou d'arrière-plan.

**Mouvement** : trois durées — 240 ms (états), 480 ms (entrées d'écran), 900 ms (la marque se dessine, `stroke-dashoffset`). Courbe `cubic-bezier(.2,.7,.2,1)`. Les changements d'écran glissent de 12 px vers le haut avec fondu ; le lavis change de teinte en 480 ms quand on passe d'un personnage à un autre. `prefers-reduced-motion` : tout est instantané, la marque apparaît déjà tracée.

**Interdit** : halos, verre dépoli, cadres imbriqués, tuiles à gros chiffres, barres de progression avec pourcentage, badges et trophées, compteurs de présence, boutique, objectifs, icônes décoratives, ombres, confettis, toute couleur pleine sur plus d'un quart d'écran, tout vocabulaire de jeu vidéo.

## 4. Navigation complète

Ordinateur : rail gauche fixe (emblème boussole en haut, entrées empilées, portrait du personnage en bas qui ouvre le compte). Téléphone : barre basse à cinq emplacements, la cinquième entrée `Plus` ouvre une feuille depuis le bas. L'ordre est le même partout. Les libellés sont exacts.

- **Visiteur** (site public, en-tête horizontal comme aujourd'hui) : `L'univers` · `Les Serments` · `Le bestiaire` · `Premiers pas` · `Espace joueur ↗`. Pied : `Règlement` · `Système de jeu` · `Rejoindre sur Discord`.
- **Joueur** (rail) : `Ma marque` · `Personnage` · `Journal` · `Agenda` · `Monde`. Téléphone : `Ma marque` · `Personnage` · `Journal` · `Agenda` · `Plus` (→ `Monde`, `En scène`, `Compte`, `Se déconnecter`). `Monde` ouvre un sous-menu : `Serments`, `Bestiaire`, `Système de jeu`, `Règlement`, `Premiers pas`, `Synopsis`.
- **Compte en attente de liaison** : même navigation ; `Ma marque` et `Personnage` affichent l'état d'attente (§8, texte 4) ; `Journal` est masqué.
- **MJ** : entrées joueur plus `Table` (sous-menu : `Combat`, `Apparitions`, `Personnages`, `Archives`, `Événements`). Téléphone : `Ma marque` · `Personnage` · `Table` · `Agenda` · `Plus`.
- **Designer** : entrées joueur plus `Ateliers` (sous-menu : `Bestiaire`, `Serments` si le droit est accordé, `Événements`). Téléphone : `Table` remplacé par `Ateliers`.
- **Admin** : entrées MJ et designer plus `Administration` (sous-menu : `Comptes`, `Liaisons`, `Thèmes`, `Journal d'audit`, `Données`). Téléphone : `Ma marque` · `Table` · `Ateliers` · `Administration` · `Plus`. Un admin sans personnage voit `Ma marque` remplacée par `Vue d'ensemble`.
- **Compte** (depuis le portrait, jamais dans le rail) : `Identité`, `Mot de passe et session`, `Apparence`, `Export de la fiche`, `Supprimer mon compte`.
- **En scène** est un mode, pas une rubrique : accessible depuis `Ma marque` (bouton primaire) et depuis `Plus`. Il s'ouvre en feuille pleine hauteur sur téléphone.

## 5. Les écrans clés

### Accueil public

- Haut : masthead actuel conservé (wordmark, navigation, `Espace joueur ↗`). Hero conservé tel quel : paysage, `Nuages / Polaires.`, tagline, description, bouton sauge `Rejoindre l'aventure ↗`, `Découvrir l'univers ↓`, note « Une histoire collective, sur Discord. », coordonnée `NP / 01 — APRÈS LE BASCULEMENT`, légende.
- Milieu, bloc 1 — **« Les Serments portés »** remplace les cinq compteurs : une rangée horizontale de marques réelles (une par Serment porté par au moins un personnage visible), chacune à sa teinte, nom du Serment dessous et nombre de porteurs en Cormorant 28 px. Aucun autre chiffre.
- Milieu, bloc 2 — `01 L'UNIVERS` inchangé.
- Milieu, bloc 3 — `02 LES SERMENTS` garde sa citation ; le visuel « orbite » est remplacé par la marque du Serment survolé dans la rangée du dessus (au repos : la boussole).
- Milieu, bloc 4 — `03 LA CHRONIQUE`, nouveau : deux colonnes, à gauche les trois prochains événements publics (bloc date, titre, type), à droite les trois derniers récits publiés par le staff (titre, date, première ligne). État vide propre (§8, texte 7).
- Bas : invitation « Laissez votre trace. », colophon sans le RPG.
- Téléphone : hero à 100 svh avec le texte en bas, rangée des marques en défilement horizontal doux, chronique en une colonne.

### Entrée du joueur connecté — « Ma marque »

- Haut (96 px, puis 320 px) : repère `NP / MARQUE` à gauche, date du jour à droite. Portrait (160 px, rond adouci) au centre gauche, marque dessinée en grand (280 px) au centre droit, lavis derrière. Sous le portrait : nom en Cormorant 36 px, ligne « Serment · Rang · Branche choisie » en Manrope 13 px laiton, `Niveau 5 · 30 / 150` en petit. Ligne de reconnaissance en Cormorant italique 22 px (§8, textes 1 à 3).
- Milieu, bloc 1 — **Ce que la marque a enregistré** : traces depuis la dernière visite, une par ligne de 28 px, nœud à gauche relié par un trait vertical : palier atteint, gemme fusionnée, XP reçue, combat archivé, événement passé, note du MJ. Du plus récent au plus ancien ; lien `Tout l'historique`.
- Milieu, bloc 2 — **Ce qui vient** : prochain événement (bloc date, titre, `Inscrit` ou `Participer`) ; si une Table est ouverte pour ce personnage, bandeau `La Table est ouverte — suivre`.
- Milieu, bloc 3 — **Ce qui attend** : liaison, inscription non confirmée, consommation en attente, mot de passe à renouveler.
- Bas : `En scène` (primaire, sauge) et `Ouvrir Discord ↗`.
- Téléphone : portrait et marque côte à côte sur 180 px, blocs en pleine largeur, les deux boutons collés au bas de l'écran.

### Personnage

Un portrait en dossier, quatre chapitres numérotés en ancres ; navigation collante en haut qui déplace aussi le focus.

- Haut : portrait 120 px, nom, Serment, arme du Serment (`arme`), progression en petit, `Modifier le portrait`.
- `01 RESSOURCES` : trois traits horizontaux fins (PV, EP, EM) sans pourcentage, valeur courante sur valeur max en Cormorant 28 px, chaque trait à sa couleur de sens (§7) ; bonus et malus actifs listés sous chaque trait ; `Déclarer une consommation` ouvre une feuille avec l'inventaire, confirmation serveur avant affichage.
- `02 SERMENT` : la marque à 200 px à gauche ; à droite la branche choisie, un palier par ligne (nœud, titre, coût), texte complet en dessous en lecture directe, paliers non atteints en ivoire à 40 % avec la mention `Niveau 7`. `descPhys` et `flavor` de la branche présentés en Cormorant 19 px comme une page de carnet. L'autre branche repliée derrière `Voir l'autre branche`.
- `03 ÉQUIPEMENT ET INVENTAIRE` : deux listes à traits fins ; gemmes avec compteur par type et `Fusionner des gemmes` (feuille : quantité, XP résultante calculée par le serveur, `Confirmer`).
- `04 HISTORIQUE` : traces complètes filtrées par type, chronologiques, exportées avec la fiche.
- Bas : `Exporter en PDF`.
- Téléphone : chapitres empilés, navigation collante réduite à `01 02 03 04`, la marque passe au-dessus des paliers.

### Journal

Le seul écran en typographie de carnet : Cormorant Garamond 19 px, interligne 1,6, ivoire sur pierre sombre.

- Haut : `Journal de bord`, mention exacte de visibilité (« Lu par toi, les MJ et les administrateurs. ») ; elle doit correspondre aux droits réels.
- Milieu : entrées datées (date en marge gauche, Manrope 11 px), texte, et une marge droite de 200 px à la teinte du Serment où le compagnon accroche les traces validées du même jour (palier, combat, événement) en petit. Le récit du joueur et les faits enregistrés se lisent côte à côte sans se mélanger.
- Zone d'écriture en bas de la liste, toujours visible, `Ajouter au journal` ; l'entrée rejoint la liste après confirmation serveur.
- Bas : `Exporter le journal (texte)`.
- Téléphone : la marge devient une ligne repliée sous chaque entrée (`2 traces ce jour`).

### Agenda

- Haut : `Agenda`, bascule `À venir` / `Passés` ; pour le staff, `Créer un événement`.
- Milieu : liste par mois ; chaque événement en bloc calendrier (jour en Cormorant 36 px, mois en capitales espacées), titre, type, heure, capacité réelle, participants en petits portraits chacun cerclé de la teinte de son Serment (le seul endroit où les teintes se croisent volontairement), état : `Participer`, `Inscrit — se désinscrire`, `Complet`, `Passé`.
- Détail en feuille latérale (ordinateur) ou pleine page (téléphone) : description, lien du salon Discord, liste complète des participants.
- Bas : `S'abonner (ICS)` si prévu.
- Téléphone : blocs en pleine largeur, boutons de participation à 44 px minimum.

### Référence — Serments et bestiaire

- Serments, haut : galerie de marques (une par Serment visible) ; chaque tuile ne montre que la marque, le nom et l'arme. Le porteur connecté voit sa propre marque signalée `Le tien`.
- Serments, page : lore en Cormorant 19 px, deux branches et leurs paliers en lecture directe, gains par niveau, rang et lignée.
- Bestiaire, haut : recherche, filtres et tris conservés.
- Bestiaire, fiche : silhouette de la créature dans la brume (image à 20 % de netteté) tant qu'aucune archive de combat terminée ne la mentionne, puis nette. Les **observations** (comportements, zones, compétences autorisées) se déverrouillent par rencontre, chacune avec en note le titre de l'archive. Les statistiques réservées au MJ n'apparaissent jamais côté joueur.
- Téléphone : fiches en pleine page, retour par le navigateur.

### Table — combat vu par le MJ

- Haut : `Table · Combat`, nom de la rencontre, round courant en Cormorant 36 px, initiative en rangée horizontale de portraits (personnages cerclés de leur teinte, créatures en gris brume), `Round suivant`, `Sauvegarder`, `Terminer le combat`.
- Milieu, colonne gauche : combattants (ressources en traits fins, statuts en petites capsules, invocations rattachées en retrait).
- Milieu, colonne droite : phase en cours — `Déclarations` (une ligne par combattant : action, cible, note) puis `Résolution` (conséquences saisies par le MJ, annulables jusqu'à validation). Chaque validation écrit une trace horodatée.
- Bas : notes du MJ, `Exporter en texte`, accès à `Apparitions` pour ajouter une créature tirée.
- Téléphone : une colonne, initiative collante en haut, phases en onglets `Déclarations` / `Résolution`.

### Table — combat vu par un joueur

Lecture seule. Aucune commande de jeu.

- Haut : `La Table est ouverte`, nom de la rencontre, round en grand, initiative.
- Milieu : la ligne de son personnage en premier, à sa teinte, ressources telles que le MJ les tient ; alliés ensuite ; créatures en gris avec seulement ce que le MJ a rendu visible. Sous sa ligne : la déclaration enregistrée pour lui ce round, ou `En attente de ta déclaration sur Discord`.
- Bas : `Copier mon état pour Discord`, `Ouvrir le salon ↗`.
- Les changements de round arrivent par mise à jour serveur.
- Téléphone : c'est l'écran principal de la Table, conçu d'abord pour lui.

### Gestion des personnages (MJ / admin)

- Haut : `Personnages`, recherche, filtres par Serment (chaque option précédée de sa marque miniature), par compte lié / non lié.
- Milieu : liste dense à traits fins ; par ligne : portrait, nom, Serment, niveau, compte lié, dernière trace. L'ouverture donne le même dossier que le joueur, avec des actions staff en feuille : `Attribuer de l'XP` (source combat ou gemmes), `Donner un objet`, `Modifier les ressources`, `Ajouter une note de MJ`. Admin seul : `Changer de Serment`, `Renommer`, `Lier à un compte`, `Supprimer`.
- Chaque action passe par confirmation serveur et laisse une trace visible par le joueur (sauf la note MJ marquée privée).
- Bas : `Créer un personnage`.
- Téléphone : liste, puis dossier en pleine page, actions dans `Plus`.

### Administration (admin)

Même gabarit que le reste, aucune exception visuelle.

- Haut : `Administration`, sous-onglets `Comptes` · `Liaisons` · `Thèmes` · `Journal d'audit` · `Données`.
- `Comptes` : liste, rôle, dernier passage, `Réinitialiser le mot de passe` (jeton à usage unique affiché une fois), `Changer le rôle`.
- `Liaisons` : deux colonnes, comptes en attente à gauche, personnages sans compte à droite, sélection puis `Lier`. C'est l'écran qui réduit la friction d'entrée signalée par GPT.
- `Thèmes` : catalogue et attribution par compte. `Journal d'audit` : filtres acteur / action / dates, lignes horodatées. `Données` : export complet, import sur fixtures, état de la migration.
- Bas : rien.
- Téléphone : sous-onglets en défilement horizontal, tableaux transformés en listes.

## 6. Cinq moments signature

1. **La reconnaissance.** À la connexion, l'écran est encre pure ; la marque se dessine en 900 ms trait par trait, le lavis à la teinte du Serment monte depuis la marque, puis la ligne de reconnaissance apparaît en italique. Ensuite seulement les traces se déroulent. Avec réduction des animations : tout est déjà là, sans perte de sens.
2. **La marque qui s'étend.** Quand un palier est atteint (XP attribuée par le staff), la première ouverture de `Ma marque` dessine le nouveau tronçon jusqu'au nœud, le nœud se remplit, et le titre de la capacité débloquée s'écrit lettre par lettre en Cormorant sous la marque ; la trace correspondante reste épinglée en tête jusqu'à l'ouverture du chapitre `02 SERMENT`.
3. **L'encre qui monte.** Entre deux paliers, l'XP n'est pas une barre : c'est l'encre qui monte dans le tronçon courant de la marque, visible partout où la marque apparaît (rail, dossier, agenda). Une gemme fusionnée fait monter l'encre sous les yeux du joueur après confirmation serveur, jamais avant.
4. **Le bloc de scène.** En mode En scène, un appui long sur le portrait (ou `Copier pour Discord`) produit un bloc de statut en texte brut : nom, Serment, PV/EP/EM, capacités disponibles à ce niveau, statuts. La confirmation n'est pas un toast mais une seule pulsation de la teinte le long de la marque. Le bloc est identique à ce que le MJ voit sur la Table.
5. **La Table reflétée.** Sur le téléphone du joueur, chaque nouveau round arrive comme une page qu'on tourne (glissement 12 px, fondu 480 ms) ; sa propre ligne reste ancrée en haut à sa teinte, et quand le MJ enregistre une conséquence qui le concerne, la valeur change en place avec un soulignement bref, sans que rien ne soit cliquable.

## 7. Direction visuelle

**On garde** de Mystique polaire : la palette de marque, Cormorant Garamond et Manrope, la boussole comme emblème, le paysage sans constructions, les repères de coordonnées, les chapitres numérotés, les panneaux mats, les séparateurs fins, la hauteur de cible 44 px.

**On ajoute** : la marque générée, le lavis, le grain, la teinte par Serment, les portraits cerclés, la typographie de carnet du journal, les transitions d'écran.

**On retire** : Cinzel, les halos, les cadres imbriqués, les compteurs, les tuiles à chiffres, les capsules arrondies sans hiérarchie, le RPG, le mot « joueurs » comme mesure de présence.

**Palette** (tokens CSS sur `:root`, thème sombre de base) :

| Token | Valeur | Usage |
|---|---|---|
| `--encre` | `#091519` | fond |
| `--pierre` | `#102327` | surface |
| `--brume-profonde` | `#172E32` | surface secondaire |
| `--ivoire` | `#F0EEE5` | texte |
| `--brume-claire` | `#BDCDC8` | texte secondaire |
| `--aurore` | `#95CDBB` | liens, focus, réussite |
| `--laiton` | `#C6B38B` | Serments, numérotation |
| `--sauge` | `#C6D8C4` | action principale |
| `--trait` | `rgba(240,238,229,.14)` | séparateurs |
| `--pv` / `--ep` / `--em` | `#C97B6A` / `#A9C6A0` / `#8FB6D6` | sens des ressources |
| `--attention` / `--erreur` | `#D9BC7A` / `#D9917F` | états |

**Teinte du Serment** : `--serment-h` (teinte en degrés, fixée dans l'atelier), déclinée en `--serment-trait` (HSL, saturation 62 %, luminosité 66 %, pour la marque et les cercles), `--serment-lavis` (même teinte à 8 % d'opacité) et `--serment-lueur` (16 %, réservée aux pulsations). Huit teintes proposées par défaut, à 45° d'intervalle, toutes vérifiées à un contraste de 3:1 minimum sur l'encre pour les traits. Le texte n'est jamais écrit dans la teinte.

**Typographie** : Cormorant Garamond 64 px (56 px sur téléphone) pour le titre d'accueil, 36 px pour les noms et les rounds, 28 px pour les valeurs, 22 px italique pour les lignes de reconnaissance, 19 px pour la lecture (lore, journal, paliers). Manrope 16 px corps (15 px sur téléphone), 13 px secondaire, 11 px capitales espacées 0,18 em pour les repères. Chiffres tabulaires activés partout où une valeur peut changer.

**Motifs** : la marque (traits 1,25 px), le nœud (cercle de 6 px, plein quand atteint), le trait de trace (vertical, 1 px), le losange de repère de la charte. La forme des rameaux varie selon la catégorie de combat déclarée dans l'atelier (mêlée, distance, etc.) : droits, courbes ou brisés ; six formes prédéfinies, choisies par le designer, jamais inventées par le code.

**Thèmes personnels** : ils redéfinissent uniquement les tokens de surface et de texte (encre, pierre, brume, ivoire, brume claire) et gardent la teinte du Serment, les couleurs de sens et la structure. Un thème clair inverse les surfaces et porte le lavis à 12 % pour rester visible. Un thème ne peut jamais recolorer la marque : cette hiérarchie évite la contradiction entre les deux systèmes.

## 8. Voix

Règles : tutoiement, présent, phrases courtes, pas d'exclamation, pas de faux enthousiasme, aucun chiffre non confirmé par le serveur, aucun succès annoncé avant confirmation. Le compagnon parle comme un carnet qui aurait une voix. Le Serment, lui, ne parle jamais en son nom propre tant que le staff n'a pas rempli les trois lignes de signature dans l'atelier (salutation, état vide, transition) ; sans signature, la voix neutre ci-dessous s'applique.

1. Reconnaissance, retour habituel : « La marque te reconnaît. Voici ce qu'elle a retenu. »
2. Reconnaissance, rien depuis la dernière visite : « Rien de nouveau depuis ton dernier passage. Le monde attend. »
3. Reconnaissance, première visite avec personnage lié : « Ta marque est tracée. Elle grandira avec toi. »
4. Compte en attente de liaison : « Aucun personnage n'est encore lié à ce compte. Le staff s'en occupe sur Discord ; tu peux lire le monde en attendant. »
5. Journal vide : « Les récits restent à écrire. »
6. Historique vide : « La marque n'a encore rien enregistré. »
7. Agenda vide : « Aucun rendez-vous prévu. Le prochain s'annoncera ici. »
8. Bestiaire, créature non rencontrée : « Personne ne l'a encore croisée. La brume garde sa forme. »
9. Confirmation de sauvegarde (journal, consommation, inscription) : « Enregistré. »
10. Erreur de sauvegarde : « Rien n'a été enregistré. Réessaie, ou préviens le staff si ça persiste. »
11. Conflit de version : « Quelqu'un a modifié cette fiche entre-temps. Recharge avant de continuer. »
12. Notification de palier : « Niveau 7. Un nouveau palier s'ouvre dans ta branche. »

Transition entre écrans : aucun texte. Transition vers En scène : « En scène. Seul l'utile. » en 11 px capitales, disparaît après 900 ms.

## 9. Position sur les six conséquences du brief

1. **Le Fil** — transformer. Il devient `Ma marque` : même contenu (depuis la dernière fois, ce qui vient, ce qui attend), mais tenu par la marque, trié du plus récent au plus ancien, et précédé de la reconnaissance. Un fil sans porteur est un flux ; un fil tenu par la marque est une identité.
2. **En scène** — garder, avec le bloc de scène comme signature. C'est le mode qui justifie le compagnon pendant la partie.
3. **La Table** — garder et transformer : lecture seule conservée, la teinte du porteur devient le repère de sa ligne, et la vue joueur est conçue en premier pour le téléphone.
4. **Le Codex qui se révèle** — garder tel quel. La silhouette dans la brume est la forme visuelle de la règle « seulement ce que le serveur a rencontré ».
5. **La Chronique publique** — transformer : la chronique existe (`03 LA CHRONIQUE`), mais l'accueil s'ouvre d'abord sur les Serments portés, parce que c'est l'identité du serveur avant son activité. Aucun compteur ne revient.
6. **Discord chez lui** — garder, discret : connexion Discord en option, liens de salons dans l'agenda et la Table, blocs prêts à coller, webhook facultatif. Discord est la table ; le compagnon ne la remplace pas.

## 10. Risques et difficultés de construction

- **Le générateur de marque** est un composant à part entière : dessin déterministe à partir du rang, de la branche, des paliers et de la catégorie ; redessin lors d'un changement de Serment ; six motifs ; rendu à quatre tailles ; animation `stroke-dashoffset` et repli réduit. Il faut le prototyper seul, en Svelte, avant tout écran.
- **Deux systèmes de couleur** (teinte du Serment et thèmes personnels) restent un risque de contradiction même avec la hiérarchie du §7 ; il faut un test visuel automatique de contraste pour chaque paire teinte × thème, et une règle dure : le texte n'est jamais dans la teinte.
- **La Table reflétée** demande une diffusion serveur vers les téléphones (polling court ou SSE sur Netlify), une gestion des déconnexions et une sémantique claire de « ce que le MJ a rendu visible » ; c'est la fonctionnalité la plus coûteuse et la plus dépendante du modèle de permissions.
- **La signature des Serments** (teinte, motif, trois lignes de voix) est un travail de contenu pour le staff ; tant qu'il n'est pas fait, le compagnon parle d'une seule voix, et la promesse « chaque Serment colore le compagnon » n'est tenue qu'à moitié. Le repli neutre doit être beau en soi.
- **Le portrait dans la brume** du bestiaire exige un traitement d'image (`filter`, masque) lisible sur téléphone et qui n'évoque pas un contenu verrouillé de jeu vidéo ; le ton des observations doit rester celui d'un carnet, pas d'une liste de déblocages.
