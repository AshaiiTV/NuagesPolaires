# Nuages Polaires — Vision retenue : « Carnet d'encre »

Synthèse rédigée le 30 septembre 2026 à partir de la direction gagnante (`directions/carnet-d-encre.md`, 145 points cumulés), des greffes retenues par les trois juges (En scène, Les Lisières de GPT, La Veillée, Observatoire, Serment vivant), de leurs avertissements, du brief du lead (`02-brief-creatif.md`) et de la critique de GPT (`audit/gpt-direction-creative.md`, §1). Rien ici n'invente une règle de jeu ni un élément d'univers : les valeurs citées (coûts, paliers, seuils, rangs, types) sont celles des audits. Lecture seule du dépôt ; ce fichier est le seul écrit.

## 1. Nom, principe, promesse

**Carnet d'encre.** Le compagnon n'est pas un site que l'on consulte : c'est un carnet tenu ouvert à côté de Discord. Chaque acte de jeu y dépose une ligne d'encre signée (le joueur déclare, le MJ tamponne, les règles notent), rien ne s'y efface jamais (on rature), et le carnet s'ouvre toujours là où l'on s'est arrêté.

**Promesse au joueur.** En trois secondes, sur ton téléphone, entre deux messages Discord : où j'en suis (mes trois ressources au dernier relevé confirmé), ce qui attend ma main (une scène ouverte, une Table en cours, un rendez-vous), puis seulement ce qui s'est écrit depuis ma dernière lecture. Un feuillet arraché pour la scène : déclarer, retrouver mes capacités, la règle qui sert, coller mon état dans le salon. Rien qui ressemble à un jeu vidéo : on déclare, on ne frappe pas.

**Promesse au MJ.** Une Table lisible à dix combattants, chaque changement de valeur écrit avec ancienne valeur, nouvelle valeur, auteur, motif et date, confirmé par le serveur avant d'être affiché, annulable par rature. Ce que le MJ tamponne s'imprime au même instant sur le téléphone du joueur, avec l'heure du dernier état reçu, jamais une fausse fluidité. Le laiton n'apparaît que pour une décision du staff : quand on voit du laiton, quelqu'un a décidé.

**Promesse au propriétaire.** Un seul objet, un seul vocabulaire, un seul jeu de composants, de l'accueil public à la Table et au Registre, y compris sur téléphone à 390 px ; beau et utile avec seulement les données qui existent (fiche, agenda, journal, archives), sans un chiffre inventé ni un compteur.

## 2. Ce que le compagnon fait et ne fait pas

**Il fait, et seulement cela :**
- Tient la fiche : Serment, rang, branche et paliers atteints au niveau courant ; PV, EP, EM au dernier relevé confirmé ; niveau et XP (`niveau × 30`) ; équipement, inventaire, gemmes (+5 / +20 / +50), statuts.
- Garde les traces : journal (notes, récits, faits validés), conséquences tamponnées (XP, objets, corrections, statuts), archives de combat lisibles par leurs participants, marque-page.
- Coordonne : agenda et inscriptions, prochain rendez-vous, cornes sur ce qui s'est écrit depuis la dernière lecture, lien du salon Discord.
- Explique : synopsis, Serments, bestiaire avec observations tamponnées, système de jeu, règlement, premiers pas, accessibles au visiteur.
- Sert la scène : feuillet volant En scène (ressources et déclarations, capacités du niveau, règle sous le pouce, bloc à coller, note rapide, marque-page).
- Reflète la Table : l'état du combat conduit par le MJ, en lecture, sur le téléphone des participants, avec l'heure du dernier état reçu.
- Outille le MJ : Table de combat, apparitions, archives, personnages avec attributions motivées et tamponnées, report des déclarations.
- Fait vivre : ateliers bestiaire et Serments, comptes, liaisons, rôles, thèmes, journal d'audit, données.

**Il ne fait pas :**
- Aucune action de jeu sous le pouce : pas de bouton qui frappe, esquive ou tire ; une déclaration est une phrase notée, jamais un coup porté. La Table vue par un joueur est en lecture seule absolue.
- Aucun combat solo, aucune carte explorable, aucune boutique, aucun objectif, aucun prototype : le RPG et la carte dormante disparaissent avec leurs données (`rpg_characters`, `lieux`).
- Aucun compteur, classement, valeur agrégée entre personnages, indicateur de présence ou d'activité, même « réel », même déguisé (cercle qui se réordonne, dernières connexions, top niveaux).
- Aucun chiffre non confirmé par le serveur, aucune annonce de succès avant la réponse, aucun squelette gris : une page qui attend porte « L'encre sèche… ».
- Aucune suppression visible : on rature ; le journal d'audit est la version complète de ce que chaque page montre déjà.
- Aucun contenu réservé masqué par le rendu : le serveur filtre par rôle avant d'envoyer (notes MJ, créatures masquées, comptes, statistiques réservées).
- Aucun widget Discord, avatar rond, bulle, présence en ligne ; Discord est la table, le carnet reste posé à côté. Webhook de notification en phase 2.
- Aucune génération de texte de jeu : « Préparer ma réponse » ouvre le feuillet, il n'écrit rien à la place du joueur.
- Aucun objet dont l'existence dépend d'une saisie humaine régulière : scène, marque-page, faits validés, extraits publiés sont facultatifs, beaux vides, absents de la navigation quand ils n'existent pas.

## 3. Système de composition

**Métaphore et vocabulaire fixe.** *Carnet* (l'application connectée), *cahier* (un espace : Mon carnet, L'univers, Agenda, La Table, L'Atelier, Le Registre), *page* (un écran, une route), *chapitre* (section numérotée), *marge* (colonne de repères, dates, tampons, annotations), *ruban* (signet : là où tu t'es arrêté ; il ouvre aussi le feuillet En scène), *corne* (coin plié : page écrite depuis ta dernière lecture), *rature* (ancienne valeur barrée, jamais supprimée), *tampon* (validation datée d'un MJ ou d'un administrateur, avec motif), *feuillet volant* (En scène), *encre* (toute écriture ; humide tant que le serveur n'a pas confirmé, elle « prend » ensuite), *relevé* (dernier état confirmé, horodaté).

**Trois régimes, un seul jeu de composants** (attribut `data-regime` sur `html`, les composants ne lisent que des tokens) :
- `carnet` (défaut) : double page, réglure 28 px, grain, Cormorant pour la voix. Accueil, Dernières pages, fiche, journal, agenda, références, compte.
- `serre` (outils staff denses) : réglure 24 px, Manrope 14 tabulaire, colonnes fixes, aucune matière. Table MJ, Personnages, Registre, ateliers.
- `scene` (feuillet volant et Table vue joueur) : le carnet se resserre en 240 ms, grain et paysage disparaissent, marges à 12 px, Manrope tabulaire, coordonnée réécrite « SCÈNE · #salon · 21:42 ». Seul écran sans matière, pour la lisibilité et la batterie ; son bord supérieur dentelé (`clip-path` statique) est sa seule marque de papier.

**Grille.** Ordinateur (≥ 1100 px) : double page, marge 34 % à gauche (repère « NP / 0x — … », date, sommaire des chapitres, tampons, annotations), corps 66 % à droite, largeur de lecture 62 caractères, gouttière 24 px. Tablette : marge 26 %. Téléphone : page simple, la marge devient une bande sous le titre (repère · date · tampon), les annotations passent en fin de page sous un filet, gouttière 16 px, jamais de défilement horizontal. Régime `serre` : pleine largeur, 12 colonnes, gouttière 16 px. Régime `scene` : une colonne, 12 px, bande de contexte 24 px ancrée en haut, barre de 56 px ancrée en bas (« Règle » · « Copier pour Discord » · « Reposer »).

**Rythme.** Tout texte de corps et toute ligne de liste s'aligne sur la réglure (28 px en `carnet`, 24 px en `serre`) ; espacements verticaux en multiples (28 / 56 / 84 ; 24 / 48). Les titres de chapitre occupent deux lignes de réglure. La réglure n'est visible (très fine) que dans le journal, les notes du MJ et le journal d'audit ; ailleurs elle est invisible mais respectée. Jamais plus de trois tailles de texte sur une page hors marge.

**Matière, une seule par écran.** Bureau nuit d'encre ; page pierre sombre à bord 1 px brume profonde ; grain SVG (`feTurbulence`, 3 %, statique) uniquement sur l'accueil, Dernières pages, le journal et les pages de référence ; feuillets ivoire posés de biais (± 2°, ordinateur seulement) uniquement sur l'accueil ; tampon rectangulaire à bord irrégulier ; corne triangle ivoire 12 px ; tranche à onglets (trois traits fins) sur le bord droit. Pas d'ombre large : 0 1px 2px sous la page, 0 8px 24px sous le feuillet volant. Aucune brume animée, aucun paysage hors accueil, aucun lavis, aucune lueur. `prefers-contrast: more` retire le grain et le biais ; `prefers-reduced-motion` retire tout mouvement sans perte de sens.

**Mouvement, trois et pas un de plus.** *Tourner* (changement de page : sortante glisse de 24 px vers la gauche et s'estompe, entrante arrive de la droite, 320 ms, `cubic-bezier(.2,.7,.2,1)` ; retour arrière en sens inverse). *Sécher* (toute écriture confirmée : encre humide aurore puis ivoire en 1 200 ms ; refus serveur : l'encre bave, flou 1 px 600 ms, et une note de marge dit ce qui s'est passé). *Tamponner* (le tampon descend de 6 px avec une rotation fixe de ± 3° déterminée par l'identifiant, 180 ms). Sous `prefers-reduced-motion` : fondu 120 ms, changement de couleur immédiat, apparition sèche. Le resserrement (240 ms) est un cas de *tourner*. Interdits : pulsation, chiffres qui roulent, titres écrits lettre par lettre, fil qui se dessine, page qui se tourne en 3D, animation de récompense.

**Interdits de composition.** Deux modales (une seule, le feuillet) ; toasts empilés (une note de marge à la fois) ; squelettes ; carrousels ; cartes dans des cartes ; dégradés ; icônes sans libellé ; pastilles de compteur dans la navigation (seule la corne, sans nombre) ; avatars ronds ; halos ; tableau de gros chiffres ; jauges colorées pleines ; boutons de moins de 44 px ; texte sous 12 px ; commande réservée à un geste (tout appui long a un bouton et une touche) ; texte réservé flouté en CSS.

## 4. Navigation finale

Cahiers = onglets sur la tranche (bord droit, verticaux, lisibles) sur ordinateur ; bande basse sur téléphone. Ce qui n'est pas autorisé n'est pas rendu (jamais grisé). Chaque page a une adresse réelle ; le bouton retour du navigateur tourne la page en arrière.

| Cahier (libellé exact) | Pages (ordre) | Routes | Visiteur | Joueur | MJ | Designer | Admin |
|---|---|---|---|---|---|---|---|
| **Accueil** | page publique | `/` | oui | — | — | — | — |
| **L'univers** | Synopsis · Les Serments · Le bestiaire · Le système de jeu · Le règlement · Premiers pas | `/univers/…` | oui | oui | oui | oui (calque) | oui (calque) |
| **Mon carnet** | Dernières pages · Ma fiche · Mon journal | `/carnet`, `/carnet/fiche`, `/carnet/journal`, `/carnet/recits/[id]`, `/carnet/scene` | — | oui | si personnage relié | idem | idem |
| **Agenda** | À venir · Passés · Organiser (staff) | `/agenda`, `/agenda/organiser` | — | oui | oui | oui | oui |
| **La Table** | Combat · Apparitions · Archives · Personnages | `/table/combat/[id]`, `/table/apparitions`, `/table/archives`, `/table/personnages/[id]` | — | — | oui | — | oui |
| **L'Atelier** | Bestiaire · Serments (si droit accordé) | `/atelier/bestiaire`, `/atelier/serments` | — | — | — | oui | oui |
| **Le Registre** | Ce qui attend · Comptes et liaisons · Thèmes · Journal d'audit · Données | `/registre`, `/registre/comptes`, `/registre/themes`, `/registre/journal`, `/registre/donnees` | — | — | — | — | oui |
| **Entrer** / portrait | Entrer · Inscription (règlement d'abord) ; connecté : Mon compte · Ma collection · Quitter le carnet | `/entrer`, `/entrer/inscription`, `/compte`, `/compte/collection` | Entrer | portrait | portrait | portrait | portrait |

**Le ruban** : second accès permanent sur toute page connectée, un onglet sauge de 44 px accroché en haut à droite de la page, libellé « En scène » (Manrope 12 capitales). Joueur relié : ouvre le feuillet volant par-dessus la page courante (`/carnet/scene`, retour = reposer). MJ avec une Table ouverte : mène à cette Table. Compte en attente : ouvre Dernières pages. Visiteur et designer sans personnage : pas de ruban. Il porte une corne (sans nombre) quand des pages non lues existent.

**Téléphone.** Bande basse joueur : `Carnet` · `Fiche` · `Agenda` · `Univers` · `Plus` (Journal, Compte, Collection, Quitter). MJ, designer, admin : `Plus` ouvre la tranche complète. Visiteur : `Accueil` · `Univers` · `Serments` · `Entrer`. Le ruban reste en haut à droite. Compte en attente de liaison : Accueil, L'univers, Agenda (lecture), Mon carnet réduit à Dernières pages, Mon compte.

**Visiteur** : masthead actuel `L'univers` · `Les Serments` · `Entrer ↗` ; Synopsis, Serments, bestiaire, système de jeu, règlement et premiers pas s'ouvrent sans compte (aujourd'hui enfermés dans le shell connecté). L'inscription passe toujours par le règlement (« J'accepte — Continuer »).

## 5. Écrans clés

Convention : *But · Contenu · Actions · États · Téléphone*. Les états difficiles communs : **absence prolongée** (dernière lecture > 30 jours), **compte non lié**, **conflit de sauvegarde** (409), **synchronisation interrompue** (relevé ancien, réseau absent). Toute erreur dit ce qui n'a pas été fait et ce qui reste vrai.

### 5.1 Accueil public (`/`, régime carnet, ignore les thèmes)
- *But* : dire ce qu'est le monde et donner envie d'entrer, sans compteur.
- *Contenu* : masthead et hero conservés tels quels (paysage, « Nuages / *Polaires.* », « Le monde attend. Votre histoire commence. », « Un futur inconnu. Une marque en vous. Et tout ce qui reste à écrire, ensemble. », « Rejoindre l'aventure ↗ », « Découvrir l'univers ↓ », « Une histoire collective, sur Discord. Comment commencer ? », coordonnée « NP / 01 — APRÈS LE BASCULEMENT », « Le monde n'est pas mort. Il attend. »). Puis **« Dernières pages »** à la place des cinq compteurs : trois feuillets ivoire au plus, posés de biais (récit publié par un MJ à l'archivage, dernier rendez-vous passé visible, prochain rendez-vous visible), chacun avec date en marge, titre Cormorant, deux lignes d'extrait, tampon du publiant (« MJ Maitre · 26 sept. ») ; aucun nom de participant. Puis les chapitres 01 L'UNIVERS et 02 LES SERMENTS, textes inchangés, mis en page comme deux pages avec marge ; sous 02, la liste des Serments publics (nom, arme, une ligne) vers leurs pages. Invitation « Laissez votre trace. » conservée. Colophon : « NUAGES POLAIRES — Le compagnon d'un monde à écrire. » · Règlement · Premiers pas · Le site et vos données (mentions légales et confidentialité sorties du règlement) · Discord ↗ (lien d'invitation saisi par un administrateur, sinon absent). Le bouton RPG disparaît.
- *Actions* : entrer, s'inscrire, lire.
- *États* : rien de publié → un seul feuillet blanc « Les récits restent à écrire. » ; serveur muet → la page prérendue s'affiche sans les feuillets, avec « Les dernières pages reviendront quand le serveur répondra. »
- *Téléphone* : paysage en 16:10 rogné à droite (zone sombre gauche gardée pour le titre), feuillets empilés sans inclinaison, bande basse visiteur.

### 5.2 Entrée du joueur connecté — « Dernières pages » (`/carnet`)
- *But* : répondre en trois secondes à « où j'en suis, quoi faire ».
- *Contenu*, dans cet ordre imposé par les juges : **marge** « NP / 02 — MON CARNET », nom en Cormorant, Serment · rang en laiton, ligne d'état « PV 24/30 · EP 38/50 · EM 12/20 · relevé 21:14 » en Manrope tabulaire (identique partout, elle devient la bande de contexte du feuillet), « −8 EP déclaré depuis le relevé » si des déclarations attendent un MJ, « Lu pour la dernière fois le 27 septembre ». **Corps** : (1) le marque-page s'il existe : « Tu t'étais arrêté ici. » puis la phrase notée en Cormorant italique et « Reprendre sur Discord ↗ » ; (2) **« Ce qui attend ta main »**, zéro à trois lignes, absent si vide : la scène ouverte en premier (« Scène ouverte · #col-des-brumes ») avec deux actions dominantes « Ouvrir sur Discord ↗ » et « Préparer ma réponse » (ouvre le feuillet sur les capacités, objets et règle, sans rien générer), « La Table est ouverte : Col des brumes — Suivre → », « Rendez-vous samedi 20 h — tu viens · Ouvrir le salon ↗ » ; (3) **« Depuis ta dernière lecture »** : les pages écrites depuis, une par ligne de réglure, chronologiques (on lit un carnet dans le sens de l'écriture), cornées tant qu'elles ne sont pas ouvertes : « Un MJ a tamponné le combat du 26 septembre » (→ fiche, chapitre Conséquences), « Rendez-vous samedi 20 h — 4 inscrits » (→ agenda), « Ta note du 25 septembre » (→ journal), « Un MJ a validé un fait : dette envers Aria » (→ journal) ; 20 par page, « Page suivante → » ; (4) **« Ce qui vient »** : les deux prochains rendez-vous avec l'état « Tu viens » / « Je viens ». Bas : « Ouvrir ma fiche → », « Écrire dans mon journal → ».
- *Actions* : ouvrir une page (la corne se déplie en 90 ms et le signet serveur avance), « Déplier toutes les cornes », suivre la Table, préparer, reprendre.
- *États* : rien de nouveau → « Rien depuis ta dernière lecture. Le carnet reste ouvert. » ; **absence prolongée** → en tête « Le carnet t'a gardé 42 jours de pages. Commence par ce qui attend ta main. », les pages groupées par mois sous un filet, jamais de reproche ; **compte non lié** → marge avec le pseudo, « Ton compte existe. Ta fiche attend qu'un administrateur la relie à ton personnage. Transmets ton pseudo sur Discord : Ashaii. », liens vers Premiers pas, Les Serments, Agenda (lecture), « Recharger cette page » ; **fiche introuvable malgré une liaison** → « Une liaison existe, mais ta fiche n'a pas pu s'ouvrir. Recharge ; si ça persiste, donne ton pseudo à un administrateur sur Discord. » ; **synchronisation interrompue** → la ligne d'état garde son relevé et la marge note « Le carnet n'a pas pu se mettre à jour depuis 21:14. » ; l'écriture du marque-page qui échoue → « L'encre n'a pas pris. Ta page est gardée ici ; réessaie quand tu veux. »
- *Téléphone* : marge en bande sous le titre, une ligne = une corne lisible d'un pouce, le ruban en haut à droite.

### 5.3 Le feuillet volant — « En scène » (`/carnet/scene`, régime scene)
- *But* : tout ce que la scène demande, rien d'autre, avec une main.
- *Contenu* : bande de contexte « SCÈNE · #col-des-brumes · 21:42 » (salon de la scène ouverte ou de la Table ; sinon « SCÈNE · 21:42 ») + ligne d'état ; si une Table implique ce personnage, une seconde ligne « Round 3 · déclarations » ou « Le MJ résout. ».
  - Chapitre **Ressources** : PV, EP, EM sur trois lignes, chiffre 24 px tabulaire, maximum en encre secondaire après la barre oblique, statuts en petites capitales précédés d'un losange de leur couleur (Saignement, Empoisonné, Brûlure, Gel, Étourdi, Entravé, Aveuglé, Silence, Peur, Fragilisé, Renforcé, Inspiré) ; sous chaque ressource, les déclarations de la scène en encre du joueur.
  - **Déclarer** (un lien texte par ressource) ouvre *une ligne de carnet*, pas une barre de touches : « Kael déclare … » suivi d'un menu de mots tirés de la table du système de jeu avec leur coût imprimé après le mot (Frappe · 6 EP, Tir à l'arc · 4 EP, Esquive · 8 EP, Bloquer sans bouclier · 2 EP, Bloquer avec bouclier · 5 EP, Se déplacer · 10 EP, Utiliser un objet · 0 EP, Invoquer son Serment · 1 EM, chaque capacité de la branche au coût saisi dans l'atelier, « subis … PV », « soigné de … PV », « autre… » avec chiffre et mot obligatoires). La ligne devient « Kael déclare −8 EP (Esquive). » en encre humide, sèche à la confirmation serveur, reste annulable 10 s (« Annuler »), puis seulement rayable (la rature reste lisible, datée). Le chiffre du relevé ne change pas : la déclaration est une annotation de marge que le MJ voit sur la Table et reporte d'un tampon.
  - Chapitre **Capacités à ton niveau** : uniquement les paliers atteints de la branche choisie (nom, coût, texte complet), le suivant en encre grise « Palier III — Maîtrise · au niveau 7 » ; sans branche : « Aucune branche choisie. Un administrateur la note avec toi. »
  - Chapitre **Objets** : liste plate (objet · quantité), « Consommer » → confirmation en une ligne « Tu déclares avoir utilisé une Potion boréale ? Oui, je le note. » avec contexte facultatif (parcours de consommation existant : −1 et trace).
  - **Bloc à coller** : aperçu IBM Plex Mono de trois lignes, exactement le rendu Discord (« Kael · niv. 7 · Duelliste (Basique) » / « PV 24/30 · EP 38/50 (−8 déclaré) · EM 12/20 · relevé 21:14 » / « Saignement 2 t. ») ; « Copier pour Discord » devient « Copié · 21:44 — colle-le dans le salon. » 4 s.
  - **Note rapide** : une ligne « Noter pour le journal », datée, mention « notée en scène ».
  - Barre basse : « Règle » (une seule carte choisie par contexte, jamais une recherche : phase de déclaration → actions et coûts ; statut actif → sa définition ; EP sous 20 % → récupération ; hors combat → glossaire ; toujours « Voir dans le système de jeu → » ; le sélecteur est une table de correspondance testée, pas un calcul), « Copier pour Discord », « Reposer ».
- *Reposer* (tirer vers le haut ou le bouton) propose une ligne facultative « Où j'en suis » et un champ « Lien du message Discord » : c'est le marque-page.
- *États* : pas de réseau → « Pas de réseau. Tes chiffres restent ceux de 21:14. », la déclaration reste humide avec « Réessayer », jamais de file d'attente silencieuse ; compte non lié → le ruban ouvre Dernières pages ; Table fermée pendant la scène → la seconde ligne devient « La Table est repliée · 21:52 ».
- *Ordinateur* : même colonne à 420 px ancrée à droite sur fond nu, « Déplacer à gauche ».

### 5.4 Ma fiche (`/carnet/fiche`)
- *But* : le dossier du personnage, consulté pendant le RP, jamais un tableau de bord.
- *Contenu* : marge = sommaire fixe des chapitres (suit le défilement, déplace le focus clavier), « NP / 03 — MA FICHE », « relevé 21:14 » (dernier changement confirmé). Haut : portrait carré à coins droits, nom, Serment · rang (libellé distinct du niveau), niveau et une seule ligne d'XP dessinée comme un trait d'encre sur la réglure avec « 132 / 210 XP » en texte. **01 Ressources** : trois lignes (valeur du relevé en ivoire, maximum en encre secondaire) ; déclarations en attente en marge en encre du joueur « −8 EP · 21:42 · attend un MJ » ; corrections du MJ avec tampon ; statuts en petites capitales avec losange ; gemmes sur une ligne « Blanche ×3 · Incarnate ×1 » ou « Aucune gemme. ». **02 Équipement et inventaire** : « Casque — Heaume de givre », « Plastron — rien », « Jambières — rien » ; inventaire en deux colonnes (objet · quantité) groupé par catégorie (Équipement, Consommable, Gemme, Divers) ; « Déclarer » par ligne (consommation) ; vide « Rien dans les poches. ». **03 Serment** : arme, rang, lignée, branche choisie ; paliers atteints en ivoire avec leur texte complet déplié, suivants en encre grise avec le niveau requis (2 / 5 / 7 / 10 ; Aguerri 10 / 13 / 16 / 20) ; « Voir le Serment complet → ». **04 Conséquences** : chaque ligne signée (tampon MJ avec motif et date, mention « règles » pour le système, « toi » pour tes déclarations et consommations) ; une correction se lit « ~~120~~ 150 · tamponné par MJ Maitre le 26 septembre, 21:47 — motif : erreur de report » ; filtres en marge (Tous · XP · Gemmes · Combats · Objets · Statuts · Serment), 20 par page, « voir les ratures ». Bas : « Exporter cette fiche (PDF) » (PDF refait aux couleurs de Mystique polaire), « Lire mes récits → ».
- *Actions du joueur* : portrait, consommation, déclaration ; tout le reste est staff.
- *États* : compte non lié → la phrase de 5.2 ; fiche indisponible → « Ta fiche n'a pas pu s'ouvrir. Recharge la page. » ; conflit (consommation ou portrait sur une fiche modifiée entre-temps) → « Quelqu'un a écrit sur cette page entre-temps. Relis avant d'écrire par-dessus. », la fiche se recharge, ta saisie est gardée ; synchronisation interrompue → « relevé 21:14 · le carnet n'a pas pu se mettre à jour depuis 21:40 » en rouille.
- *Téléphone* : chapitres repliables (01 ouvert), sommaire dans la bande sous le titre, cibles 44 px.

### 5.5 Mon journal (`/carnet/journal`) — trois voix
- *But* : le centre de gravité de la mémoire ; typographie de carnet.
- *Contenu* : marge = nombre de pages écrites, les trois voix avec leur visibilité écrite en toutes lettres et conforme aux droits serveur : **Mes notes** — « Lu par toi, les MJ et les administrateurs. » ; **Récits** — « Les combats archivés où ton personnage figure. » (archives filtrées par le serveur : notes du MJ jamais envoyées ; « Lire → », « Exporter (.txt) ») ; **Faits validés** — « Tamponnés par un MJ, avec témoin et date. Tu peux en proposer. » (dette, promesse, alliance, conséquence narrative, observation ; un fait réglé n'est pas supprimé : rayé, « réglée · tamponné le 2 novembre »). Corps : réglure visible, entrées par date (date en marge, Manrope 12 capitales), texte Cormorant 18 / 28 ; écrire = cliquer sous la dernière ligne, le curseur se pose sur la réglure, pas de champ encadré ; « Noter » → encre humide → l'encre prend ; modifier = l'ancienne version reste en rature dessous ; « rayer » barre l'entrée entière, lisible ; les notes prises en scène portent « notée en scène ». Proposer un fait = une ligne (type · envers · texte) qui attend un tampon. Le journal actuel (un seul texte) devient une première entrée datée « Avant le carnet » à la migration. 20 entrées par page.
- *États* : vide → « Cette page est blanche. Elle t'attend. » ; faits vides → « Aucun fait validé. Ils s'écrivent d'abord sur Discord ; propose-en un ici quand un MJ peut le tamponner. » ; récits vides → « Les récits restent à écrire. » ; refus serveur → « L'encre n'a pas pris. Ta page est gardée ici ; réessaie quand tu veux. » (brouillon gardé dans le navigateur) ; conflit (même entrée modifiée sur deux appareils) → la phrase de conflit, les deux versions visibles ; compte non lié → le journal n'apparaît pas.
- *Téléphone* : plein écran, réglure guide, « Noter » ancré au-dessus du clavier, la date de l'entrée reste visible.

### 5.6 Agenda (`/agenda`, `/agenda/organiser`)
- *But* : les rendez-vous de la table Discord, avec inscription explicite.
- *Contenu* : marge = mois en Cormorant, « NP / 04 — AGENDA », « Les dates sont à l'heure de Paris. » Corps : une ligne datée par rendez-vous (bloc-date à gauche : jour Cormorant 32, mois en capitales ; à droite : titre, type en petites capitales avec losange de sa couleur — Combat / Chasse, Exploration, Social / Roleplay, Événement majeur, Autre —, heure, « 4 inscrits sur 6 » ou « sans limite », inscrits nommés avec « · toi », lien « Ouvrir le salon ↗ » si renseigné, tampon de l'organisateur). Passés en encre grise sous un filet « Passés », 8 derniers, « Page suivante → ». **Organiser** (MJ, admin, designer selon droit) : formulaire sur réglure (titre, type, date et heure, places avec « 0 = sans limite », description, lien du salon, visibilité « Visible par tous les comptes » / « Masqué : visible des MJ et des administrateurs », « Prévenir les joueurs à la création » réservé MJ/admin) ; la notification est une corne sur Dernières pages, pas une entrée d'historique ; son échec est distinct de l'enregistrement. Les inscriptions sont rattachées à l'identifiant du personnage (plus au nom) : les homonymes ne bloquent plus.
- *Actions* : « Je viens » → « Tu viens · Rayer ma place » après confirmation serveur seulement.
- *États* : vide → « Rien de prévu. Le monde attend. » ; compte non lié → « Ton compte attend sa liaison pour venir. » ; date à confirmer → « Date à confirmer · inscriptions fermées » ; complet → « Complet » ; dernière place prise entre-temps (409) → « La dernière place vient d'être prise. » ; conflit staff → la phrase de conflit, brouillon conservé ; synchronisation interrompue → « Les rendez-vous affichés datent de 21:14. » ; passé avec récit publié → « Lire le récit → ».
- *Téléphone* : bloc-date 56 px, « Je viens » à 44 px sous la ligne, formulaire Organiser sans débordement à 390 px.

### 5.7 Références — Les Serments (`/univers/serments/[nom]`) et Le bestiaire (`/univers/bestiaire/[id]`)
- *Serments* — *But* : lire un Serment comme une page de carnet. Marge = sommaire par catégorie (Mêlée, Distance, Magie, Soutien), filtre par rang (Basique, Émérite, Singulier, Transcendé, Corrompu ; les Aguerris restent hors vitrine). Corps = une page par Serment : arme, rang, lignée (« Évolution de Duelliste »), lore en Cormorant 18 / 28, croissance en une ligne (« +6 PV · +6 EP · +2 EM par niveau · frappe 11 »), deux branches avec leur description physique, leur texte narratif et leurs quatre paliers dépliés (niveau, nom, coût, description) ; joueur relié : « tu es ici » sur son palier, sans autre changement ; « Tourner » entre Serments aux flèches.
- *Bestiaire* — *But* : la référence du designer et la mémoire des rencontres, sans déblocage. Marge = recherche, filtres comportement (Gibier, Passif, Neutre, Agressif, Très agressif) et zone, tri. Liste : nom, sous-titre, comportement en petites capitales, niveau. Page : portrait carré s'il est publié, nom, sous-titre, comportement, zones, description publique, puis la fiche du designer en lignes (« Niveau 3 · PV 40 · EP 20 », Frappe, Compétence, Butin, Drop de gemme au D100), puis le chapitre **Observations**, blanc tant qu'aucun MJ n'a publié : chaque observation est un extrait choisi et écrit par un MJ à l'archivage d'un combat (ou depuis la Table pour une rencontre hors combat), daté, tamponné, avec « Lire le récit → » si le lecteur y a droit. Créatures masquées ou archivées : absentes du rendu public, filtrées par le serveur.
- **Calque réservé** (MJ, designer, admin) : un interrupteur « Calque » imprime en laiton, décalées de 8 px, les données servies uniquement aux rôles autorisés (notes, masqué / archivé, usage dans les archives, Serments hors vitrine, paliers Aguerris) et les ancres « Modifier dans l'Atelier → », « Envoyer à la Table → ».
- *États* : aucune correspondance → « Aucune créature ne correspond. » ; pas d'observation → « Cette page reste blanche tant que personne ne l'a rencontré. » ; Serment sans branche définie → « Aucune branche définie. »
- *Téléphone* : sommaire et filtres dans une feuille glissante, pages en pleine largeur, retour par le navigateur.

### 5.8 La Table — combat vu par le MJ (`/table/combat/[id]`, régime serre)
- *But* : arbitrer à dix combattants sans erreur de saisie.
- *Contenu* : haut = nom du combat (éditable), ligne d'état factuelle « 6 combattants · 2 KO · Round 3 · 4/6 déclarés », « relevé 21:47 » (dernière sauvegarde confirmée), « Sauvegarder », « Résoudre le round » / « Clore le round », « Terminer le combat », « Copier pour Discord » (export texte existant).
  - Avant démarrage : « Élèves du Serment » / « Adversaires » à cocher, transfert depuis Apparitions, initiative (« Initiative : Kael », fixe pour tout le combat sauf choix explicite), « Démarrer ».
  - Trois colonnes à 1100 px : gauche **Combattants**, une ligne par combattant à colonnes fixes (nom · PV · EP · EM · statuts · déclaré ●●○), chiffres tabulaires 14 px, et un menu « … » par ligne (±5 EP, repos court, restauration, statut avec durée, invocation, initiative, retirer) ; tout ajustement s'écrit en ligne avec ancienne → nouvelle valeur et un motif obligatoire (prérempli « ajustement en cours de combat », modifiable) ; centre **01 Déclarations** (une ligne par combattant dans l'ordre : action, cible, coût ; les déclarations envoyées depuis le feuillet du joueur y apparaissent en encre du joueur, « proposée à 21:42 », le MJ les reprend d'un clic ou les ignore) puis **02 Résolution** (chaque effet en ligne de récit « Le loup des brumes subit 12 », rature possible tant que le round est ouvert, « Annuler le round » sur snapshot) ; droite **Journal du combat** (log existant), **Règle** (même mécanisme que le joueur), **Notes du MJ** (réglure visible, encre laiton).
  - Chaque clôture de round sauvegarde un brouillon (fin de la perte de combat au rechargement).
  - « Terminer le combat » ouvre le feuillet **Conséquences** : par personnage, PV / EP / EM (ancienne → nouvelle), statuts recopiés, XP proposée (formule existante `ceil(niveau de la créature × 10 × participation %)`, participation réglable), drops en attente (D100, gemme → inventaire « Obtenue sur : … »), chacun avec motif et bouton « Tamponner » (touche Entrée) ; « Tamponner tout » demande une confirmation par bouton ; puis archivage : titre du récit, « Publier un extrait » (deux à quatre lignes écrites par le MJ, destinations cochées : accueil, page de chaque créature présente), visibilité « Lisible par ses participants » ; « Archivé · 21:52 » n'apparaît qu'après la réponse serveur.
- *États* : aucune Table → « Aucune Table ouverte. » + « Ouvrir une Table » ; conflit (un autre MJ a écrit sur ce combat ou une fiche a changé) → « Quelqu'un a écrit sur cette page entre-temps. Relis avant d'écrire par-dessus. », différences affichées (ancienne / nouvelle par champ), « Reprendre leur version » / « Garder la mienne » ; les déclarations des joueurs ne touchent jamais les ressources, donc le MJ gagne par construction ; synchronisation interrompue → « relevé 21:47 · non sauvegardé depuis 21:50 » en rouille, « Réessayer », rien n'est perdu à l'écran ; fin automatique (tous KO) → ouvre le feuillet Conséquences au lieu de fermer sans synchroniser.
- *Téléphone* (dépannage) : bande d'état ancrée, combattants en accordéon (nom · PV EP EM sur une ligne), Déclarations / Résolution / Journal en onglets, tout reste possible.

### 5.9 La Table — combat vu par un joueur (`/table/combat/[id]`, régime scene, téléphone d'abord)
- *But* : lever les yeux de Discord et comprendre en une seconde ce qui a changé, sans pouvoir agir.
- *Contenu* : « À la table — Col des brumes · Round 3 · déclarations », « Dernier état reçu à 21:47 ». Mon personnage en haut : trois ressources 24 px tabulaires telles que le MJ les tient, statuts, puis « Le MJ attend ta déclaration sur Discord. » ou « Le MJ résout. ». Les autres combattants en lignes compactes (alliés puis adversaires) : nom, statuts, et pour les adversaires l'état narratif issu des seuils du système de jeu (LÉGER 66–100 %, GRAVE 33–65 %, CRITIQUE 0–32 %) à la place des chiffres, sauf si le MJ choisit « Montrer les chiffres des adversaires ». Sous un filet, les lignes de récit des rounds résolus, la plus récente en bas, en encre humide à l'arrivée ; à chaque résolution, une valeur modifiée garde son ancienne valeur en rature 4 s (« ~~24~~ 18 ») et la ligne « Round 3 · résolu à 21:47 » s'écrit. Les conséquences tamponnées s'impriment avec le même tampon que sur la fiche. Bas : « Copier pour Discord », « Règle », « Ouvrir le salon ↗ » ; le ruban ouvre le feuillet par-dessus. Mise à jour par interrogation courte (3 à 5 s, arrêtée hors onglet visible) d'un état de combat versionné ; aucune promesse « en direct ».
- *Actions* : aucune sur le combat ; aucun élément cliquable dans la zone de la Table (critère testé).
- *États* : en retard → « Dernier état reçu à 21:47 · en retard de 8 s. » ; interrompue → « Plus de nouvelles de la Table depuis 21:47. » + « Réessayer », les chiffres restent ceux de 21:47 ; Table repliée → « La Table est repliée. Le récit est dans ton journal. » (lien si archivé) ; non participant → la page n'est pas servie (« Cette Table n'est pas la tienne. »).
- *Ordinateur* : même colonne centrée à 640 px.

### 5.10 Personnages — gestion (MJ, admin) (`/table/personnages`, régime serre)
- *But* : attribuer et corriger vite, en laissant une trace lisible par le joueur.
- *Contenu* : marge = recherche, filtre par Serment, compte relié / non relié ; corps = une ligne par personnage (nom, Serment · rang, niveau, PV EP EM tabulaires, « relié à Ashaii » ou « non relié » en encre grise, dernier tampon daté). Ouvrir = la fiche du joueur en mode MJ : mêmes quatre chapitres, plus **05 Attribuer** (XP par créature vaincue et participation, ou fusion de gemmes selon le stock réel ; objet ajouté ou retiré avec note ; statut posé ou retiré ; correction de ressource ancienne → nouvelle) et **« Reporter les déclarations »** (liste des déclarations en attente de ce personnage : « Reporter » applique et tamponne, « Rayer » les barre avec motif). Chaque attribution se saisit en ligne, motif obligatoire, « Tamponner » → serveur → ligne tamponnée dans 04 Conséquences du joueur et corne sur ses Dernières pages ; le motif est écrit sur le tampon à côté de la date et du nom du MJ. « Nouveau personnage » (nom, Serment, portrait). Admin seul : **06 Opérations sensibles** sous un filet double (identité, Serment, branche, niveau ±, « Rayer ce personnage » avec saisie dactylographiée du nom ; le personnage rayé sort de toutes les pages et reste exportable dans Données).
- *États* : vide → « Aucun personnage. Le premier s'écrit ici. » ; conflit → la phrase de conflit, le tampon de l'autre auteur visible, « Relire » recharge en gardant ta saisie ; synchronisation interrompue → « Le registre n'a pas pu se mettre à jour depuis 21:14. »
- *Téléphone* : une ligne = deux rangs (nom · Serment / chiffres), fiche en chapitres repliables, attributions possibles, 06 marqué « Sur ordinateur ».

### 5.11 Le Registre — administration (`/registre/…`, régime serre)
- *But* : remplacer les métriques par des attentes actionnables.
- *Contenu* : **Ce qui attend** (entrée) : « Liaisons » en deux colonnes (comptes en attente à gauche avec date d'inscription ; personnages sans compte à droite ; sélection puis « Lier », tampon d'administrateur, trois gestes), réinitialisations de mot de passe non achevées avec leur échéance, homonymes de personnages signalés par la migration ; vide → « Rien n'attend. Le registre est à jour. ». **Comptes et liaisons** : une ligne par compte (pseudo, rôle en petites capitales, « relié à … », dernière venue datée), actions en ligne : lier / délier, changer le rôle (dernier administrateur protégé), « Réinitialiser le mot de passe » (code temporaire affiché une seule fois, valable une heure), « Rayer ce compte » (saisie du pseudo). **Thèmes** : galerie de feuillets (possédé · actif · attribué), don à un compte, « Donner à tous », visibilité, création d'un thème = huit couleurs (les huit tokens) vérifiées à 4,5:1, sinon le thème n'est pas proposé. **Journal d'audit** : réglure visible, une ligne par action (serveur et staff, source en marge), filtres acteur · action · dates, jamais éditable ; « Exporter (.txt) » ; plus de « Tout vider ». **Données** : export JSON avec la mention exacte « Ce n'est pas une sauvegarde complète du site. », import sur fixtures (ordinateur), état de la migration (« 12 fiches reprises sans rature »), diagnostics sûrs (base joignable, variables d'environnement, version) sans écriture.
- *États* : conflit → la phrase de conflit ; synchronisation interrompue → « Le registre n'a pas pu se mettre à jour depuis 21:14. »
- *Téléphone* : consultable ; les opérations sensibles indiquées « Sur ordinateur ».

## 6. Moments signature retenus (8) et faisabilité

1. **L'encre sèche.** Toute écriture apparaît en aurore humide et ne devient ivoire qu'à la confirmation serveur ; refus → l'encre bave et la marge explique ; le texte reste. Aucun message de succès n'existe. *Faisabilité haute* : machine d'état par écriture (humide · prise · refusée), une transition CSS.
2. **Le ruban, la corne et le marque-page.** Le carnet s'ouvre là où l'on s'est arrêté ; le signet est tenu côté serveur par compte (identique sur téléphone et ordinateur) ; les pages écrites depuis portent une corne ; le marque-page ajoute une phrase et un lien Discord facultatifs. *Faisabilité moyenne* : table `lectures` (compte, dernier relevé lu, phrase, lien) ; les cornes se calculent à la lecture.
3. **Le tampon avec motif.** Un MJ valide par le bouton « Tamponner » (touche Entrée), le tampon descend et tourne de ± 3° (angle déterministe), s'imprime avec rôle, nom, date et motif ; le même tampon s'imprime sur le téléphone du joueur. Le laiton n'est utilisé nulle part ailleurs. *Faisabilité haute* : chaque attribution est une ligne structurée `{kind, field, old, new, actor, motif, at}`.
4. **La rature.** Rien ne s'efface : modifier barre l'ancien et écrit dessous ; « ~~120~~ 150, tamponné le 26 septembre ». *Faisabilité moyenne, coûteuse côté schéma* : historique immuable des changements de valeur (ressources, XP, objets, journal, faits) ; la migration ne reconstitue que l'état courant et marque « repris sans rature ».
5. **Le feuillet qui resserre.** Arracher le ruban : le carnet se resserre en 240 ms (grain et paysage disparaissent, marges 12 px, Manrope tabulaire, « SCÈNE · #salon · 21:42 »), et l'on retrouve ressources, déclarations, capacités, la règle sous le pouce et le bloc à coller ; on le repose en tirant vers le haut. *Faisabilité moyenne* : `data-regime` sur `html`, composants à tokens, table de correspondance de la règle testée avec Vitest.
6. **La déclaration en ligne d'encre.** « Kael déclare −8 EP (Esquive). » : une phrase, pas une touche ; humide, annulable 10 s, visible par le MJ sur la Table, reportée d'un tampon. *Faisabilité moyenne à élevée* : nouvelle action serveur limitée au propre personnage, table `declarations` (personnage, scène ou combat, ressource, delta, mot, état : proposée · annulée · reportée · rayée), aucune écriture sur les ressources.
7. **La Table qui s'écrit.** Sur le téléphone du joueur, la page s'écrit au rythme du MJ : « ~~24~~ 18 », « Round 3 · résolu à 21:47 », tampon simultané, « Dernier état reçu à 21:47 ». *Faisabilité élevée* : état de combat versionné (`revision`), route d'interrogation 3 à 5 s arrêtée hors onglet visible, filtrage serveur par participant, chiffres des adversaires remplacés par l'état narratif.
8. **Les Dernières pages publiques.** À l'archivage, « Publier un extrait » dépose un feuillet sur l'accueil et une observation tamponnée sur la page de chaque créature rencontrée ; sans publication, un seul feuillet blanc honnête. *Faisabilité moyenne* : table `publications` (extrait, destinations, tampon, rayable) ; aucune donnée réservée ne transite.

Ce que la vision demande au schéma en plus du brief : `lectures`, `marque_pages` (peut être une colonne de `lectures`), `scenes` (titre, lien du salon, participants, ouverte par), `declarations`, `faits_valides`, `publications`, `changements` (rature), participations d'agenda par identifiant de personnage, archives lisibles par leurs participants, champ « lien du salon » sur les rendez-vous.

## 7. Direction visuelle et tokens

**Palette (tokens sur `:root`, thème de base « Carnet de nuit »).**

| Token | Hex | Rôle |
|---|---|---|
| `--bureau` | `#091519` | fond de fenêtre (nuit d'encre) |
| `--page` | `#102327` | la page (pierre sombre) |
| `--page-2` | `#172E32` | feuillet volant, fond de tampon, surfaces secondaires |
| `--reglure` | `#1C3439` | réglure, filets, bord de page |
| `--encre` | `#F0EEE5` | écriture confirmée (ivoire) |
| `--encre-2` | `#BDCDC8` | écriture secondaire, valeurs maximales, adversaires |
| `--encre-grise` | `#7E8F8B` | ratures, passés, paliers non atteints, « non relié » ; jamais du corps de texte |
| `--encre-humide` | `#95CDBB` | écriture en attente, liens, focus (aurore) |
| `--tampon` | `#C6B38B` | tampons, rang de Serment, notes du MJ, toute décision du staff (laiton) |
| `--ruban` | `#C6D8C4` | ruban, action principale (sauge) ; seule surface pleine de couleur |
| `--rouille` | `#C9836B` | danger, PV sous 32 %, relevé en retard, opérations sensibles |

Couleurs de sens conservées comme losange de 4 px devant un libellé, jamais comme fond : les douze statuts (`#c94a4a` Saignement … `#d8c27a` Inspiré), les cinq types de rendez-vous, les cinq comportements de créature, les trois gemmes. Aucune couleur par Serment, aucune jauge colorée : PV / EP / EM sont des chiffres tabulaires et un trait d'encre d'1 px.

**Typographie** (trois familles hébergées localement, OFL ; Cinzel et JetBrains Mono retirés).

| Usage | Fonte | Taille / interligne |
|---|---|---|
| Titre de page | Cormorant Garamond 500 | 48 / 52 ordinateur, 34 / 38 téléphone, approche −0,02 em |
| Titre de chapitre | Cormorant Garamond 500 | 28 / 56 (deux lignes de réglure) |
| Journal, récits, lore, citations | Cormorant Garamond 400, italique pour la voix du carnet | 18 / 28 |
| Chiffres de marge (jour, round) | Cormorant Garamond 400 | 32 |
| Corps, formulaires, menus | Manrope 400 | 16 / 28 (listes 15 / 28) |
| Libellés, dates, marge | Manrope 500 | 13 / 20 |
| Repères en capitales | Manrope 500, approche 0,18 em | 12 / 16 (jamais moins de 12 px) |
| Régime serré et scène | Manrope 500, `tabular-nums` partout | 14 / 24 ; ressources du feuillet 24 / 28 |
| Blocs à coller, journal de combat | IBM Plex Mono 400 | 14 / 28 (13 / 24 en scène) |

Le titre de l'accueil garde sa taille actuelle (`clamp(76px, 7.8vw, 120px)`). L'italique est réservé à la voix du carnet et au dernier mot d'un titre.

**Espacements** : multiples de 28 en `carnet` (28 · 56 · 84), de 24 en `serre` (24 · 48), de 12 en `scene` (12 · 24) ; gouttière 16 / 24 ; largeur de lecture 62 caractères ; page centrée à 1 200 px maximum, Table MJ à 1 440 px.
**Rayons** : 0 sur les pages et feuillets, 2 px sur boutons et champs, 2 px sur les portraits (carrés à coins droits). **Ombres** : page `0 1px 2px rgba(0,0,0,.35)` ; feuillet volant `0 8px 24px rgba(0,0,0,.28)` ; rien d'autre. **Focus** : `outline 2px solid var(--encre-humide)`, décalage 2 px. **Cibles** : 44 px minimum, 48 px dans les barres ancrées.
**Motifs** : réglure ; filets simples et doubles ; corne ; tranche à trois traits ; bord dentelé (`clip-path`) du feuillet ; tampon SVG rectangulaire à bord irrégulier ; losange 4 px comme puce ; grain `feTurbulence` 3 % ; boussole comme signature (favicon, colophon, orbite des Serments), jamais canonique ; paysage sur l'accueil seulement ; coordonnées « NP / 0x — … » ; chapitres numérotés.

**Thèmes personnels.** Un thème redéfinit uniquement les huit tokens `--bureau`, `--page`, `--page-2`, `--reglure`, `--encre`, `--encre-2`, `--encre-grise`, `--ruban`. `--encre-humide`, `--tampon` et `--rouille` gardent leur teinte partout ; sur un thème de ton clair ils prennent leurs valeurs « sur papier » (`#3E8A72`, `#8A7440`, `#A6533A`) pour rester lisibles sans changer de sens. Thème « Papier » (l'actuel « Brume Claire ») : page `#EFEAD9`, bureau `#DCD6C5`, page-2 `#E6E0CF`, réglure `#D9D2BF`, encre `#1B2A2E`, encre-2 `#4C5B5B`, encre-grise `#8A928C`, ruban `#7FA089`. Les neuf thèmes existants (dark, light, violet, green, aquaris, easter, halloween, noel, bloodmoon) sont retranscrits en huit tokens depuis leurs `vars` actuelles (bg → bureau, bg2 → page, bg3 → page-2, bg4 → réglure, text → encre, dim → encre-2, faint → encre-grise, accentBright → ruban) et perdent leurs ambiances animées (étoiles, météores, neige, œufs). Un thème ne touche jamais la réglure, les fontes, les mouvements, la signification des tampons ; l'accueil public l'ignore ; obtention inchangée (base, don d'un administrateur, distribution), sans prix ni boutique ; contraste 4,5:1 vérifié à la création, sinon refusé.

## 8. Voix et lexique officiel

**Règles.** Tutoiement, présent, phrases courtes ; pas de point d'exclamation, pas d'émoji, pas de « succès », pas de « oups », pas de faux enthousiasme, pas de reproche d'absence. Le carnet *note*, *garde*, *tient* ; il ne « traite » pas, ne « charge » pas. Une confirmation est une date, pas une félicitation. Aucun chiffre non confirmé, aucune annonce avant le serveur. En scène, il parle moins qu'ailleurs (moins de douze mots). Les lecteurs d'écran entendent les changements de page (« Page : Mon journal ») et les confirmations en `aria-live`.

**Une seule façon de nommer chaque chose.**

| Chose | Mot retenu | Bannis |
|---|---|---|
| Le produit / l'espace connecté | le compagnon / le carnet | site, app, tableau de bord, espace joueur (sauf « Entrer ») |
| Un espace, un écran, une section | cahier, page, chapitre | onglet, module, panneau, popup |
| Là où je me suis arrêté / accès En scène | le ruban | signet, marque-page (réservé à la phrase de reprise), bouton flottant |
| Page écrite depuis la dernière lecture | la corne | notification, non lu, badge, cloche |
| Ancienne valeur conservée | la rature | suppression, effacer, vider, historique effacé |
| Validation du staff, datée, motivée | le tampon (tamponner) | valider, approuver, confirmer (réservé au serveur) |
| Dernier état confirmé, horodaté | le relevé | synchro, à jour, live, en direct |
| Phrase du joueur en attente | la déclaration (déclarer) | action, coup, attaque, ajustement |
| Ligne tamponnée qui change un chiffre | la conséquence | récompense, loot, gain, drop (sauf « drop de gemme » dans les règles) |
| Fait narratif tamponné (dette, promesse, alliance, observation) | le fait validé | promesse consignée, consigner |
| Combat archivé | le récit | archive (mot du Registre), log |
| Rendez-vous de la table | le rendez-vous | événement (sauf le type « Événement majeur ») |
| Canal Discord | le salon | channel, chan |
| Situation ouverte (titre + lien) | la scène | partie, session, fil |
| Combat conduit par le MJ | la Table (round, déclaration, résolution, combattant, Élèves du Serment, Adversaires) | simulateur, simulation, arène, tactique |
| Le personnage et sa page | le personnage, Ma fiche | profil, joueur (pour un personnage), avatar (réservé à l'image : portrait) |
| Rattachement compte ↔ personnage | la liaison, « relié à », « en attente de liaison » | pending, activation |
| Les rôles | un MJ, un administrateur, un designer, un joueur ; « les MJ et les administrateurs » | l'équipe, le staff (dans l'interface) |
| Serment | Serment · rang (Basique, Aguerri, Émérite, Singulier, Transcendé, Corrompu, Autre) · branche · palier (I Éveil, II Densité, III Maîtrise, IV Plénitude) · capacité | classe, niveau de Serment, arbre, skill, débloquer (on *atteint* un palier) |
| Ressources | PV, EP, EM ; « au dernier relevé » | jauge, barre de vie, HUD |
| Le vide | une phrase du carnet | 0, —, aucun résultat, N/A |

**Vingt micro-textes exacts.**
1. Journal vide — « Cette page est blanche. Elle t'attend. »
2. Dernières pages, rien de nouveau — « Rien depuis ta dernière lecture. Le carnet reste ouvert. »
3. Absence prolongée — « Le carnet t'a gardé 42 jours de pages. Commence par ce qui attend ta main. »
4. Marque-page au retour — « Tu t'étais arrêté ici. » puis la phrase, puis « Reprendre sur Discord ↗ »
5. Rien n'attend — « Aucune scène ouverte. Ta fiche et l'agenda sont à jour. »
6. Écriture en attente — « L'encre sèche… »
7. Écriture confirmée (note de marge, 3 s) — « Noté · 21:14 — l'encre a pris. »
8. Refus serveur ou réseau — « L'encre n'a pas pris. Ta page est gardée ici ; réessaie quand tu veux. »
9. Conflit de version — « Quelqu'un a écrit sur cette page entre-temps. Relis avant d'écrire par-dessus. »
10. Déclaration notée — « Kael déclare −8 EP (Esquive). Annuler · 10 s »
11. Pas de réseau en scène — « Pas de réseau. Tes chiffres restent ceux de 21:14. »
12. Copie du bloc — « Copié · 21:44 — colle-le dans le salon. »
13. Table, état reçu / en retard — « Dernier état reçu à 21:47. » / « Dernier état reçu à 21:47 · en retard de 8 s. »
14. Table, plus de nouvelles — « Plus de nouvelles de la Table depuis 21:47. Réessayer »
15. Round résolu — « Round 3 · résolu à 21:47. »
16. Tampon (format) — « +18 XP · Col des brumes · tamponné par MJ Maitre le 26 septembre, 21:47 — motif : combat archivé. »
17. Inscription / désinscription confirmées — « Tu viens. Le rendez-vous est en marge de ton carnet. » / « Rayé. Ta place est libre. »
18. Compte en attente — « Ton compte existe. Ta fiche attend qu'un administrateur la relie à ton personnage. Transmets ton pseudo sur Discord : Ashaii. »
19. Créature sans observation — « Cette page reste blanche tant que personne ne l'a rencontré. »
20. Session expirée / suppression de compte — « Le carnet s'est refermé. Rouvre-le en te reconnectant. » / « Le carnet se ferme pour de bon. Ce qui est écrit ne se rouvre pas. »

## 9. Écarts assumés par rapport au brief

1. **Le Fil devient « Dernières pages », fini et chronologique, et il passe après l'état.** Le brief faisait du fil « le cœur de l'expérience joueur » ; un fil infini contredit l'objet (un carnet se referme) et met la réponse à « il me reste combien d'EP » au bout d'un défilement (Observatoire, GPT). L'ordre retenu : ligne d'état, marque-page, ce qui attend ta main, ce qui s'est écrit depuis, ce qui vient (avertissement commun des juges).
2. **La typographie de carnet n'est pas réservée au journal.** Si le journal est une page et la fiche un formulaire, l'objet se casse ; toute l'application, outils staff compris, est faite de pages, avec deux variantes de densité (serré, scène) et un seul jeu de composants.
3. **Le Codex ne se « débloque » pas.** Le brief montrait d'une créature « uniquement ce que le serveur a réellement rencontré » ; GPT objecte qu'une archive ne prouve ni l'observation ni qui sait, et les juges refusent toute silhouette à révéler. Retenu : la fiche publique du designer reste lisible (référence utile pour préparer), et un chapitre Observations s'écrit par extraits choisis, écrits et tamponnés par un MJ, y compris hors combat. Rien n'est caché puis révélé ; quelqu'un décide.
4. **La Chronique publique devient trois feuillets publiés par décision explicite.** Pas de flux d'événements, pas de compteur même « réel » (la charte prévoyait « chiffres réels du serveur » : abandonné, un nombre de créatures vaincues est déjà un vocabulaire de jeu vidéo). Politique éditoriale (demande de GPT) : seul un MJ publie, à l'archivage, un extrait qu'il écrit ; le tampon le signe ; il peut être rayé ; aucun nom de participant sur l'accueil.
5. **« Discord est chez lui ici » est contenu.** Liens de salon, blocs à coller, connexion Discord optionnelle par variables d'environnement : oui. Widget, présence, avatars ronds, bulles : non. Webhook de notification : phase 2, après une première mise en service fiable (deux directions et les juges convergent).
6. **Les « ajustements déclarés » ne modifient pas les ressources.** Le brief les listait sans dire ce qu'on en fait ; En scène en faisait une écriture concurrente avec celles du MJ. Retenu : une déclaration est une annotation de marge en encre du joueur, reportée par un tampon de MJ (ou absorbée par la résolution d'un round). Le joueur n'écrit jamais ses chiffres, la matrice de droits reste celle du serveur, et il n'y a pas de conflit joueur / MJ à arbitrer.
7. **Pas de brume animée, pas de page qui se tourne en 3D.** Le brief ajoutait « brume animée » et « transitions qui donnent l'impression de tourner une page » ; retenu : trois mouvements sobres (tourner en glissant, sécher, tamponner), un seul effet de matière par écran, aucun dans les outils denses. Le skeuomorphisme cumulé frôle le kitsch (juges) et coûte batterie et lisibilité en scène.
8. **Cinzel disparaît, la cloche aussi.** La charte gardait Cinzel « disponible » ; ses repères passent en Manrope capitales espacées. Les notifications ne sont plus une cloche ni des entrées d'historique diffusées à tous les personnages : ce sont des cornes calculées depuis le signet, et les tampons.
9. **Les archives de combat deviennent lisibles par leurs participants** (aujourd'hui propriété du MJ qui les sauve), filtrées par le serveur (notes du MJ jamais servies). Sans cela, la voix « Récits » du journal et le lien « Lire le récit » n'existent pas.
10. **Le critère de fin devient observable** (§10) avant la relecture par Claude et GPT, que le brief gardait comme seul juge.
11. **Ce qui n'est pas repris de la direction gagnante** : la Table MJ sur réglure 28 avec le round en Cormorant 48 (remplacée par la ligne d'état factuelle et la variante serrée), le tampon par appui long (bouton et touche), l'onglet de marge « Fiche complète » (remplacé par le calque réservé), la page bestiaire entièrement blanche (voir 3), la page « Mes récits » (absorbée par la voix Récits du journal).

## 10. Parcours observables de fin

Chaque parcours est un test Playwright sur le build de production, à 390 / 768 / 1440 px, en thème de nuit et Papier, avec les comptes de fixtures (`admin`, `alice`, `bob`, `mj`, `designer`). « C'est fini » quand P1 à P9 passent sans assistance, puis que Claude et GPT relisent sans réserve importante.

| # | Parcours | Critères testables |
|---|---|---|
| P1 | Retrouver où j'en suis | Alice se connecte après 40 jours : à 390 px, sans défiler, on lit nom, Serment · rang, trois ressources avec « relevé hh:mm », le marque-page, « Ce qui attend ta main » (≤ 3 lignes) ; la première corne mène à la bonne page et se déplie ; le signet est identique après connexion sur un second navigateur ; aucune valeur agrégée, aucun compteur dans le DOM. |
| P2 | Préparer une réponse en scène | Depuis n'importe quelle page connectée, le feuillet s'ouvre en un geste ; `html[data-regime="scene"]` sans image ni grain ; « Kael déclare −8 EP (Esquive). » apparaît humide, sèche après le 200 serveur, s'annule avant 10 s (ligne rayée conservée) ; le relevé n'a pas changé ; le presse-papiers contient exactement les trois lignes de l'aperçu ; « Règle » affiche une seule carte avec une ancre vers `/univers/systeme#…` ; reposer propose le marque-page. |
| P3 | Suivre la Table | Le MJ résout le round 3 : en moins de 5 s le téléphone d'Alice montre « ~~24~~ 18 » puis « Round 3 · résolu à hh:mm » ; réseau coupé : en moins de 10 s « Dernier état reçu à hh:mm · en retard de N s », aucun chiffre ne change ; la zone de la Table ne contient aucun bouton ni lien hors « Copier pour Discord », « Règle », « Ouvrir le salon » ; Bob, non participant, reçoit un refus ; les PV d'un adversaire apparaissent comme LÉGER / GRAVE / CRITIQUE. |
| P4 | Vérifier une conséquence | Le MJ attribue +18 XP avec motif ; Alice voit une corne, puis dans 04 Conséquences une ligne tamponnée avec rôle, nom, date, motif ; une correction montre « ~~120~~ 150 » ; le journal d'audit contient la même ligne ; aucune notice de succès n'a été affichée avant la réponse serveur (réseau ralenti à 3 s). |
| P5 | Arbitrer à dix | Table MJ avec 10 combattants à 1440 px : toutes les lignes visibles sans défilement vertical ; déclaration puis résolution d'un round au clavier seul ; chaque changement affiche ancienne → nouvelle valeur, auteur, motif, date ; « Annuler le round » restaure ; le brouillon survit à un rechargement ; deux MJ sur le même combat obtiennent un conflit lisible, sans écrasement ; à 390 px, tout reste faisable en accordéon. |
| P6 | Entrer | Visiteur : règlement → inscription → « en attente de liaison » avec le pseudo à transmettre ; l'administrateur relie en trois gestes depuis « Ce qui attend » ; après rechargement Alice voit sa fiche ; les pages de L'univers sont lisibles sans compte. |
| P7 | Publier et protéger | Le MJ archive avec « Publier un extrait » : le feuillet apparaît sur l'accueil et l'observation sur la page de la créature, tamponnés ; les réponses servies au visiteur et à Alice ne contiennent aucune créature masquée, aucune note MJ, aucun compte ; le journal d'un autre personnage n'est jamais servi. |
| P8 | Honnêteté et états vides | Chaque état vide affiche une phrase de §8, jamais « 0 », « — » ni un trou ; en mode hors-ligne, aucune écriture n'est annoncée réussie ; « L'encre sèche… » remplace tout squelette ; le marque-page et la note gardent leur brouillon après un refus. |
| P9 | Tenue et accessibilité | 390 / 768 / 1440 × trois thèmes : aucun défilement horizontal, cibles ≥ 44 px, aucune police < 12 px, contraste ≥ 4,5:1 pour le corps ; `prefers-reduced-motion` supprime toute animation ; `prefers-contrast: more` supprime grain et biais ; navigation clavier complète avec focus visible ; tout tampon a un bouton ; un thème créé avec un contraste insuffisant est refusé. |
| P10 | Relecture finale | Claude et GPT parcourent joueur, MJ, designer, administrateur sur téléphone et ordinateur et n'ont plus rien d'important à corriger. |

## 12. Réponses du lead (1er octobre 2026) — normatives

1. **Table de coûts.** Une seule source : `src/lib/game/rules.ts`, utilisée par le moteur de la Table, la ligne de déclaration et la règle sous le pouce. Ses valeurs sont celles **du simulateur** (ce que les MJ appliquent réellement). La page Système de jeu garde son texte verbatim ; les divergences (Parer, Bloquer, Pugilat, Tir) sont listées dans `docs/overhaul/decisions-proprietaire.md` pour arbitrage par le propriétaire ; tant qu'il n'a pas tranché, l'interface affiche les valeurs de `rules.ts` et la page publique porte une note de marge « Valeurs appliquées à la Table : voir la règle sous le pouce ».
2. **Journal.** Lisible par son propriétaire, les MJ et les administrateurs ; l'interface l'écrit en toutes lettres partout où le journal apparaît.
3. **Scènes.** Un joueur ouvre une scène pour lui-même (titre + lien du salon) ; un MJ ou un administrateur pour plusieurs personnages ; une Table ouvre automatiquement une scène pour ses participants (titre du combat, salon saisi sur la Table) et la ferme à l'archivage. Une scène sans activité depuis 14 jours se referme d'elle-même (« refermée d'elle-même · date »), lisible dans le journal.
4. **Déclarations.** Hors Table : report manuel par tampon de MJ (Personnages › Reporter les déclarations). Pendant une Table : absorbées par la résolution du round (le MJ les reprend ou les ignore). Une déclaration non reportée après 7 jours passe en rature automatique « non reportée », visible par le joueur.
5. **Designer.** Organise des rendez-vous (sans « Prévenir les joueurs »), dispose du calque réservé sur le bestiaire, édite le bestiaire ; pas d'Atelier Serments (administrateur seul), aucun accès aux personnages ni à la Table.
6. **Discord.** Connexion Discord livrée en première version mais **désactivée** tant que `DISCORD_CLIENT_ID` est vide ; lien d'invitation du colophon et lien de salon = réglages saisis par un administrateur (Registre › Données) ; page « Le site et vos données » extraite du règlement (`audit/contenu/reglement-hrp.md`, sections informations/données) ; webhook en phase 2.

## 11. Questions ouvertes pour le lead

1. **Quelle table de coûts fait foi ?** La page Système de jeu (Frappe 6 EP, Tir 4 EP, Esquive 8 EP, Bloquer 2 / 5 EP, Se déplacer 10 EP, Invoquer 1 EM, Pugilat 3 + niveau) et le simulateur (Parer 0 EP −25 %, Bloquer 5 EP −50 %, Pugilat 4 + niveau, pas de tir) divergent. La ligne de déclaration, la règle sous le pouce et la Table doivent lire la même source.
2. **Le journal reste-t-il lisible par les MJ ?** Le serveur le sert aujourd'hui ; la vision l'écrit partout (« Lu par toi, les MJ et les administrateurs »). Trancher avant la mise en ligne, dans un sens ou dans l'autre.
3. **Qui ouvre une scène ?** Proposé : le joueur pour lui-même (titre + lien), un MJ pour plusieurs personnages, et une Table ouvre automatiquement une scène pour ses participants. À confirmer, ainsi que la durée après laquelle une scène sans activité se referme d'elle-même.
4. **Report des déclarations.** Proposé : report manuel par tampon de MJ hors Table, absorption automatique par la résolution pendant une Table. Faut-il un délai au-delà duquel une déclaration non reportée s'efface en rature d'elle-même ?
5. **Périmètre du designer** : Organiser des rendez-vous ? Atelier Serments ? Calque réservé sur les références ? Aucun accès aux personnages est conservé.
6. **Connexion Discord et lien d'invitation** : OAuth en première livraison ou en phase 2 avec le webhook ; le lien d'invitation du colophon et le champ « lien du salon » sont-ils acceptables au regard des mentions légales à sortir du règlement ?
