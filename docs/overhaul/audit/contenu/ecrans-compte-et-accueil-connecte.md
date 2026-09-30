# Écrans de compte et accueil connecté — textes verbatim

## 1. Inscription (`#s-register`, `index.html:6696–6778`)

- Titre : **Nuages Polaires** — sous-titre : « Créer un compte joueur »
- Champs : `Pseudo` (placeholder « Ton pseudo »), `Mot de passe` (placeholder `••••••••`), `Confirmer le mot de passe`
- Encart or (italique) : « Choisissez un mot de passe unique, différent de vos autres comptes. »
- Bouton : `Créer mon compte` · `← Retour`
- Bouton œil : aria-label/title « Afficher le mot de passe »

## 2. Connexion (`#s-login`, `index.html:6781–6863`)

- Titre : **Nuages Polaires** — sous-titre : « Connexion »
- Champs : `Identifiant` (placeholder « Ton pseudo »), `Mot de passe`
- Interrupteur : **RESTER CONNECTÉ**
- Bouton : `Se connecter` · `← Retour à l'accueil`
- Fond : canevas de particules `#login-particles-canvas` + brumes `.home-fog`

## 3. Nouveau mot de passe (`#s-reset`, `index.html:6866–6883`)

- Icône 🔑 — Titre : **Nuages Polaires** — sous-titre : « Nouveau mot de passe »
- Texte : « Choisis un mot de passe pour sécuriser ton compte. Il te sera demandé à chaque connexion. »
- Champs : `Nouveau mot de passe`, `Confirmer` — Bouton : `Définir le mot de passe`

## 4. Compte en attente (`#s-pending`, `index.html:6886–6948`)

- Icône ⏳ — Kicker : **COMPTE EN ATTENTE**
- Texte : « Ton compte a bien été créé. Un administrateur doit lier ton compte à ton personnage avant que tu puisses accéder à ta fiche. / Reviens te connecter une fois que tu as reçu la confirmation. »
- Zone `#pending-pseudo` (pseudo en monospace) — Bouton : `Se déconnecter`

## 5. Shell applicatif (`#s-app`, `index.html:6951–7120`)

- Bannière `#pending-banner` : « ⏳ Ton compte est en attente de liaison — un administrateur doit te lier à ton personnage. »
- Wordmark : **Nuages Polaires** / *Le Compagnon* ; boutons `←` (Retour) et `↻` (Rafraîchir)
- Menu **⌂ Mon aventure** (`#dd-aventure`, en-tête `MON AVENTURE`) : `Tableau de bord` · `Mon personnage` · `Archives de combat`
- Menu **◎ Univers** (`#dd-joueurs`) : en-tête `UNIVERS` → `✦ Synopsis` · `⚜ Serments` · `◈ Bestiaire` ; en-tête `RÈGLES` → `◇ Premiers pas` · `⚔ Système de jeu` · `§ Règlement HRP`
- Boutons : `📅 Événements` · `* RPG — expérimental` (**dérive**)
- Menu staff **⚙ Outils** (`#dd-staff`, label de groupe `Staff`) : en-tête `MAÎTRISER UNE PARTIE` → `👥 Personnages` · `⚔ Simulation` · `🜂 Apparitions` ; en-tête `CRÉATION` → `✦ Atelier bestiaire` (perm designer) · `⚜ Atelier serments` (perm admin) ; en-tête `ADMIN` → `🗄 Administration`
- Header droit : cloche `🔔` (Notifications), profil (badge par défaut « Joueur »), `⚙` « Mon compte et ma collection »
- Rôles (`ROLE_LABELS`, `main.js:2453`) : `joueur:"Joueur", admin:"Admin", mj:"MJ", designer:"Designer"`

## 6. Tableau de bord connecté (`renderAccueil`, `main.js:8104–8278`)

Structure « carnet de voyage » (`.np-logbook`).

- Eyebrow : **Le Compagnon / Tableau de bord**
- Titre : **L’aventure continue.**
- Salutation : `Bonne nuit` (<6h) / `Bonjour` (<12h) / `Bon après-midi` (<18h) / `Bonsoir`, suivi du prénom, puis :
  - staff : « Retrouve les récits et les rendez-vous du serveur. »
  - joueur : « Ton personnage, tes rendez-vous, la suite de ton histoire. »
- Sceau : `./assets/favicon.svg`
- Bloc Premiers pas compact (joueurs uniquement, voir `premiers-pas.md`)

### Statistiques (`<dl class="np-logbook-stats">`)
Staff : **Personnages** (« Dans le registre ») · **Comptes actifs** (« Ces sept derniers jours ») · **Combats archivés** (« Avec ton personnage » / « Dans tes archives ») · **Rendez-vous** (« À venir »)
Joueur : **Niveau** (« De ton personnage ») · **Combats archivés** (« Avec ton personnage ») · **Gemmes en réserve** (« Dans ton inventaire ») · **Rendez-vous** (« À venir »)

### Section 01 — Prochain événement
- Avec événement : eyebrow `<type> · Dans N jour(s)`, titre = nom, date longue fr-FR + heure, description tronquée à 180 caractères, bouton `Voir les événements ↗`
- Sans événement : **Un nouveau chapitre se prépare.** — « Aucun événement à venir pour le moment. Les prochains rendez-vous seront affichés ici. » — bouton `Ouvrir l’agenda ↗`

### Section 02 — Derniers combats
- Liste des 3 derniers : nom (`Combat sans titre` par défaut), date · `Round N`, résultat : `Brouillon` (violet) / `Victoire` (vert) / `Défaite` (rouge) / `Inachevé` (faint)
- Vide : **Les récits restent à écrire.** — « Les combats archivés apparaîtront ici, avec leur résultat et leur date. »
- Bouton (sauf designer) : `Retrouver mes combats ↗`

### Carte personnage (aside)
- Eyebrow : `Personnage consulté` (staff avec perso) / `Ton personnage` / `Dans les coulisses` (staff sans perso) / `Tes premiers pas`
- Avec personnage : portrait (initiale + avatar), nom, serment (`Serment à définir` si vide), branche si ≠ « Aucune », statuts ; bouton `Ouvrir la fiche` (staff) / `Ouvrir mon personnage`
- Staff sans perso : **L’atelier du monde.** — « <Rôle> · Tes outils de création et de gestion sont accessibles depuis le menu Outils. » ; bouton `Voir les personnages` (manage_players) ou `Ouvrir l’atelier bestiaire` (manage_beasts)
- Joueur non lié : **Le premier chapitre.** — « Ton compte attend d’être lié à ton personnage par un administrateur. En attendant, découvre les serments et l’univers. » ; bouton `Découvrir les serments ↗`

### Les pages du monde (liens)
- **Les serments** — *Voies et héritages*
- **Le bestiaire** — *Créatures et rencontres*
- **Le système de jeu** — *Mécaniques et combats*
- **Le règlement** — *Le cadre de nos histoires*

### Accès rapides staff (eyebrow « Au service des histoires »)
`Simulation` · `Apparitions` · `Personnages` (manage_players) ; `Administration` · `N compte(s) en attente` (admin)

## 7. Fiche personnage — têtes de chapitres (`index.html:7136–7258`)

- Kicker : **Le Compagnon / Dossier de personnage**
- Nav : `01 Ressources` · `02 Équipement` · `03 Journal` · `04 Serment`
- CHAPITRE 01 — **Les forces du moment.** — « Ressources, progression et état du personnage. » (cartes `Statistiques` : Points de Vie / Énergie Physique / Énergie Magique ; `Progression` : Niveau / Expérience, note « Un seul niveau fait progresser tes statistiques et les capacités de ton serment. » ; `Gemmes de Sang` ; `Statuts`)
- CHAPITRE 02 — **Ce que tu emportes.** — « Équipement, objets et traces de leurs usages. » (`Équipement`, `Inventaire`, `Déclarer une consommation` : « Objet à consommer », « Contexte de la consommation », placeholder « Décris quand et comment ton personnage utilise cet objet… », bouton `Confirmer la consommation` ; `Historique`)
- CHAPITRE 03 — **Les traces du voyage.** — « Notes de personnage et comptes rendus des combats. » (`Journal de bord`, `Historique de combat`)
- CHAPITRE 04 — **Le lien qui te définit.** — « Ton serment, ses branches et les capacités débloquées par ton niveau. » (`renderSerm`, `main.js:7058` : badge `Ma branche`, libellés `Palier actif`, `Départ` / `Aucun palier débloqué`, `Prochain : Niv. N · <nom> · <coût>`, stats `PV/niv`, `EP/niv`, `EM/niv`, `Dmg frappe`)
