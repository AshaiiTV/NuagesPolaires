# Audit 01 — Écrans, navigation et parcours utilisateur

Dépôt audité : `C:\Users\sacha\NuagesPolaires` (v297, `package.json:3`). Lecture seule. Ce document sert de **spécification source** aux agents qui reconstruiront le site ; il décrit ce qui existe aujourd'hui, écran par écran, avec les libellés exacts (ils portent le ton du site) et les références `fichier:ligne`.

Sources parcourues intégralement pour ce domaine : `index.html` (corps HTML 6555–7508, CSS de navigation 92–446), `assets/js/main.js` (fonctions de navigation, d'authentification, de rendu des onglets et des modales), `assets/js/first-steps.js`, `assets/js/adventure-archives.js`, `assets/js/staff-navigation.js`, `assets/js/mobile-polish.js`, `assets/js/connected-pages-polish.js`, `assets/js/ui-patches.js`, entrées de `assets/js/rpg-prototype.js`, `beast-admin.js`, `admin-dashboard.js`, `database-admin-polish.js`, `api-hardening.js`, `diagnostics.js`, `assets/css/polar-identity.css` (masthead public), `docs/plan-du-site-2026-09-23.md`, `docs/overhaul/audit/gpt-lecture-produit.md`.

Rappel de l'objectif de l'overhaul (propriétaire) : le site redevient un **compagnon de jeu** pour la table Discord. Tout ce qui relève du « jeu en ligne » (prototype RPG, carte explorable, combats jouables en solo) est à supprimer ; il est documenté ici uniquement pour que l'on sache ce qu'on retire et quelles entrées de navigation en dépendent.

---

## 0. Modèle mental de l'application actuelle

### 0.1 Une seule page, deux niveaux d'« écrans »

- **Niveau 1 — `.screen`** : 8 conteneurs frères directs de `<body>`. Un seul est visible à la fois (`.screen{display:none}` / `.screen.active{display:flex;flex-direction:column}`, `index.html:92-93`). Le passage de l'un à l'autre se fait par `showScreen(id)` (`main.js:1952-1986`), qui ajoute `active` puis `screen-enter` (animation) et scrolle vers le haut (`_focusOnScreen`, `main.js:1938-1950`).
- **Niveau 2 — `.tab-content`** : à l'intérieur de `#s-app` (`#app-root`, `index.html:7122`), 19 onglets (`index.html:7126-7325`). Un seul est `.active` (`index.html:229-230`). Le passage se fait par `switchTab(id, btn, _isBack)` (`main.js:5494-5632`) ou son enveloppe `switchDropTab(id,item,ddId)` (`main.js:10146-10167`).
- **Mode « popup »** : tous les onglets sauf `accueil` et `rpg-prototype` s'ouvrent en **panneau flottant modal au-dessus du tableau de bord** (`TAB_POPUP_IDS`, `main.js:5422` ; CSS `.tab-content.tab-popup-active`, `index.html:234`), avec un fond assombri (`#tab-popup-backdrop`), un bouton `✕` injecté (`_ensurePopupCloseButton`, `main.js:5471-5483`, `aria-label="Fermer"`), verrouillage du scroll du body (`body.tab-popup-open{overflow:hidden}`, `index.html:233`) et fermeture par `Escape` (`main.js:5484-5492`). La fermeture ramène à l'onglet non-popup précédent (`_popupReturnTab`, défaut `accueil`, `main.js:5423, 5448-5453`).

### 0.2 Inventaire des écrans de niveau 1

| id | Balise | Lignes | Rôle | Accès | Rendu par |
|---|---|---|---|---|---|
| `s-first-steps` | `<section class="screen">` | `index.html:6556-6558` | Guide « Premiers pas » public | Visiteur (non connecté) | `renderFirstSteps('public-first-steps-c')` (`first-steps.js:86`) |
| `s-home` | `<section class="screen active">` | `6561-6627` | Accueil public « Mystique polaire » | Tous ; écran par défaut | HTML statique + `initHomePage()` (`main.js:2080`) |
| `s-hrp` | `<div class="screen">` | `6630-6693` | Règlement HRP avant inscription | Visiteur | `renderRegles("hrp-content")` (`main.js:8307`) |
| `s-register` | `<div class="screen">` | `6696-6778` | Inscription | Visiteur | statique |
| `s-login` | `<div class="screen">` | `6781-6863` | Connexion | Visiteur | statique + `initLoginParticles()` |
| `s-reset` | `<div class="screen">` | `6866-6883` | Nouveau mot de passe imposé (`forcePasswordReset`) | Compte marqué reset | statique |
| `s-pending` | `<div class="screen">` | `6886-6948` | « Compte en attente » | **Jamais affiché** (aucun `showScreen('s-pending')` dans le code ; l'attente est gérée dans `s-app` par `#pending-banner`) | statique — code mort |
| `s-app` | `<div class="screen">` | `6951-7328` | Application connectée (joueur + staff) | `CU` requis (`showScreen` redirige vers `s-home` sinon, `main.js:1954`) — **exception : le RPG peut l'ouvrir sans session** (voir §5.12) | `launchApp()` (`main.js:4429`) |

### 0.3 Inventaire des onglets de `s-app`

| id | `data-private` | Groupe de nav (`_tabDropIdFor`, `main.js:4351-4356`) | Popup ? | Rôle requis (`_canUseTabNow`, `main.js:4358-4378` ; gardes `switchTab`, `5500-5522`) | Fonction de rendu |
|---|---|---|---|---|---|
| `accueil` | non | `dd-aventure` | non | connecté | `renderAccueil("p-accueil-c")` `main.js:8104` |
| `premiers-pas` | oui | `dd-joueurs` | oui | connecté | `renderFirstSteps('p-first-steps-c')` |
| `archives` | oui | `dd-aventure` | oui | connecté, rôle `admin`/`mj`/`joueur` (pas designer) | `renderAdventureArchives('p-archives-c')` |
| `fiche` | oui | `dd-aventure` | oui | connecté | `renderView()` `main.js:5703` (HTML statique 7136-7259) |
| `profil` | oui | `dd-joueurs` | oui | connecté | `renderProfil()` `main.js:3092` |
| `synopsis` | non | `dd-joueurs` | oui | connecté | `renderSynopsis` `main.js:8280` |
| `serments` | non | `dd-joueurs` | oui | connecté | `renderAllSerments` `main.js:6166` |
| `bestiaire` | non | `dd-joueurs` | oui | connecté | `renderBGrid("p-bgrd",false)` (surchargé `beast-admin.js:323`) |
| `combat` (Système de jeu) | non | `dd-joueurs` | oui | connecté | `renderCombat` `main.js:8630` |
| `reglement` | non | `dd-joueurs` | oui | connecté | `renderRegles("p-regles-c")` |
| `evenements` | non | `''` (bouton direct) | oui | connecté | `renderEvents("p-events-c")` `main.js:15079` |
| `rpg-prototype` | non | `''` (bouton direct) | **non** | **aucun garde** | `renderRpgPrototype` (`rpg-prototype.js:144`) |
| `joueurs` (Personnages) | oui | `dd-staff` | oui | `admin`/`mj` | `_buildJoueursTab` + `renderSPList` `main.js:8985, 9093` |
| `combat-mj` (Simulation) | oui | `dd-staff` | oui | `admin`/`mj` | `rCombat("p-combat-mj-c")` `main.js:12847` |
| `apparitions` | oui | `dd-staff` | oui | `admin`/`mj` | `renderSpawnLab` `main.js:14410` |
| `bestiaire-admin` (Atelier bestiaire) | oui | `dd-staff` | oui | `can("manage_beasts")` → `admin`/`designer` | `renderBestiaryAdminPage` (`beast-admin.js:268`) |
| `serments-admin` (Atelier serments) | oui | `dd-staff` | oui | `admin` | `renderSermentsAdminPage` `main.js:6270` |
| `database` (Administration) | oui | `dd-staff` | oui | `admin` | `renderDatabase` `main.js:4794` |
| `carte` | — | — | (dans `TAB_POPUP_IDS`) | — | **HTML commenté** (`index.html:7320-7322`), `renderCarte` désactivé (`main.js:5619`) — dormant |

Les onglets `data-private="true"` sont **vidés du DOM** (`_clearPrivateShell`, `main.js:1847-1855`) à chaque `showScreen` sans `CU` et restaurés à la connexion (`_restoreAllPrivateShells`, `main.js:1842`). Alias historiques : `switchTab('arena')` → `combat-mj`, `switchTab('stats')` → `database` (`main.js:5495-5499`).

### 0.4 Modèle de session et de rôle

Objet global `CU` (`main.js:1930`), construit dans `_tryAutoLogin` (`2210-2262`), `_finishLogin` (`2312-2370`) et `register` (`2165-2178`) :

```json
{ "type": "player" | "staff",
  "role": "joueur" | "mj" | "designer" | "admin",
  "pid": "p1727..." | null,
  "name": "Aurore",
  "pseudo": "aurore91",
  "pending": true }
```

- `pending` n'existe que pour un joueur sans `pid` (compte créé, non lié).
- **Staff sans personnage lié** : `pid` est forcé au **premier personnage du registre** (`staffPid=pid||(gp()[0]?gp()[0].id:null)`, `main.js:2242, 2352, 2172`). Conséquence : l'en-tête et le tableau de bord d'un MJ/admin affichent le nom/avatar de ce premier personnage (« Personnage consulté »). Voir Questions ouvertes.
- Permissions (`can(action)`, `main.js:1915-1925`) :

```json
{ "admin":    ["manage_players","manage_mjs","manage_beasts","manage_items","manage_xp","manage_stats","adjust_levels","delete_player","delete_beast"],
  "mj":       ["manage_items","manage_xp","manage_players"],
  "designer": ["manage_beasts","delete_beast"],
  "joueur":   [] }
```

- Classes CSS posées à `launchApp` sur `#s-app` et `#app-root` (`main.js:4483-4511`) : `is-staff is-{admin|mj|designer}` ou `is-player` (+ `is-pending`), `has-character` si `CU.pid`. Elles pilotent l'affichage des blocs `.staff-only`, `.perm-mj`, `.perm-designer`, `.perm-admin`, `.panel-mj`, `.panel-admin`, `.player-only-tab`, `#pending-banner` (`index.html:423-446`). `staff-navigation.js:257-265` duplique sur `<body>` : `np-is-admin`, `np-is-mj`, `np-is-designer`, `np-is-staff`.
- Libellés de rôle : en-tête `ROLE_LABELS={joueur:"Joueur",admin:"Admin",mj:"MJ",designer:"Designer"}` (`main.js:2453`) + `"En attente"` ; page compte `{admin:"Administrateur",mj:"Maître du jeu",designer:"Designer",joueur:"Joueur"}` (`main.js:3097`).

---

## 1. Séquence de démarrage (boot)

1. `main.js:9850-9862` crée immédiatement `#db-loader` (plein écran, z-index 9999) : marque boussole SVG, texte **« Nuages Polaires »** / statut **« Connexion... »** et une ligne de progression.
2. `main.js:9867-9875` retire du DOM tout `.staff-only` et `#drawer-staff-section` (réinjectés depuis `<template>` après auth staff).
3. `_dbBootstrap()` puis purge des clés privées `np_accounts`, `np_players` du `localStorage` (`9884-9886`), `_initPublicData()`.
4. `_tryAutoLogin()` (`2210`) : `POST auth {action:'verify'}` (cookie httpOnly). Trois issues :
   - `verification.forcePasswordReset` → `_resetAccountId='self'`, `showScreen('s-reset')` (`2218`, `9892`).
   - connecté → `_removeLoader()` puis `launchApp()` (`9895-9897`).
   - sinon → `_removeLoader()`, `initHomePage()`, `s-home` reçoit `screen-enter` (`9899-9907`). Erreur au boot : `s-home` forcé `active` (`9923-9924`).
5. Hash initial : `main.js:5642-5652` — si `location.hash` est un onglet valide et `CU` existe au `load`, `switchTab(hash,null,true)`. `rpg-prototype.js:181` : `#rpg-prototype` ouvre le prototype au `load` **même sans session**.

Transition visuelle de connexion : `_playLoginTransition` (`main.js:2372-2441`) — overlay `#login-transition-overlay` (`index.html:7469-7504`), logo qui tourne 720° en 900 ms puis file à droite en 280 ms avec flash `#lto-flash`, puis `launchApp()`.

---

## 2. Écrans publics

### 2.1 `s-home` — Accueil public (`index.html:6561-6627`)

**Rôle** : tous. Écran par défaut. Charte « Mystique polaire ».

**Structure et textes verbatim** :

- Lien d'évitement `« Aller au contenu »` (`6562`).
- Masthead `header.np-masthead` (`6563-6573`) : wordmark `Nuages / Polaires` + note **`LE COMPAGNON`** ; nav `aria-label="Navigation de l'accueil"` :
  - `« L’univers »` → `scrollIntoView` vers `#np-univers` (respecte `prefers-reduced-motion`).
  - `« Les Serments »` → `#np-serments`.
  - `« Espace joueur ↗ »` (classe `np-nav-login`) → `showScreen('s-login')`.
- Hero (`6576-6592`) : image `nuages-polaires-horizon.jpg` (alt : `« Un vaste paysage naturel se dessine sous d’immenses nuages blancs, éclairés d’une lueur froide. »`), eyebrow **`ROLEPLAY TEXTUEL · UNIVERS ORIGINAL`**, `<h1>` **`Nuages Polaires.`**, tagline **`Le monde attend. Votre histoire commence.`**, description **`Un futur inconnu. Une marque en vous. Et tout ce qui reste à écrire, ensemble.`**
  - Bouton primaire `« Rejoindre l’aventure ↗ »` → `showScreen('s-hrp')`.
  - Bouton discret `« Découvrir l’univers ↓ »` → scroll `#np-univers`.
  - Note plateforme : **`Une histoire collective, sur Discord.`** + lien `« Comment commencer ? »` → `openFirstSteps()` (`first-steps.js:118`).
  - Coordonnée décorative `NP / 01 — APRÈS LE BASCULEMENT` ; citation **`« Le monde n’est pas mort. Il attend. »`**
- Section communauté (`6594-6603`) `aria-label="La vie du serveur"` : eyebrow **`LES TRACES DE NOTRE PASSAGE`**, titre **`Un monde qui s’écrit à plusieurs.`**, 5 compteurs (`hf-serments` **Serments**, `hf-joueurs` **Élèves invoqués**, `hf-creatures` **Créatures vaincues**, `hf-actifs` **Actifs cette semaine**, `hf-gemmes` **Gemmes distribuées**), valeur initiale `—`. Alimentés par `updateHomeCounters` (`main.js:2002-2078`) : visiteur → `_dbCache.public_stats` (`players|linkedPlayers`, `creatureKills`, `activeWeek`, `totalGemmes`) chargé par `_loadPublicBundle` ; connecté → calcul local. Rafraîchi toutes les 5 s tant que `s-home` est actif (`2110-2116`).
- Section univers `#np-univers` (`6605-6613`) : label `01 L’UNIVERS`, `<h2>` **`Tout commence après la chute.`**, marginale **`Le passé s’est dérobé. Le reste vous appartient.`**, texte : **`L’Argonaute a perdu. Le Dimenséa a changé de mains. Alors les nuages ont couvert le ciel, et la réalité s’est pliée.`** / **`L’humanité s’éveille dans un futur lointain. Les anciens repères se sont effacés. Un horizon méconnaissable s’étend dans le silence. Parmi les survivants, certains portent une marque intérieure : un Serment.`** / fin : **`Ce qui reste à écrire dépend de ceux qui se relèvent.`**
- Section serments `#np-serments` (`6615-6619`) : label `02 LES SERMENTS`, visuel orbital avec **`LE LIEN · LE CHOIX · LA TRACE`**, eyebrow **`CE QUI VOUS LIE À CE MONDE`**, `<h2>` **`Une marque. Un chemin.`**, citation **`« Nul ne choisit son Serment. C’est le Serment qui reconnaît son porteur. »`**, texte **`Votre Serment grandit à travers vos choix, vos sorties et vos combats. Ici, votre personnage se construit autant dans l’histoire que vous écrivez que dans les pouvoirs qu’il découvre.`**, lien `« Faire le premier pas ↗ »` → `s-hrp`.
- Invitation (`6621-6623`) : eyebrow **`LA SUITE N’EST PAS ENCORE ÉCRITE`**, `<h2>` **`Laissez votre trace.`**, **`Découvrez les règles, créez votre compte et rejoignez une histoire collective.`**, bouton `« Commencer l’aventure ↗ »` → `s-hrp`.
- Colophon (`6626`) : **`NUAGES POLAIRES — Le compagnon d’un monde à écrire.`** ; boutons `« Règlement »` → `s-hrp` et `« RPG — expérimental ↗ »` → `openRpgPrototype()` (**dérive**).

**Responsive** (`polar-identity.css:162-165`) : sous 760 px le masthead passe à 84 px, les boutons `« L’univers »` / `« Les Serments »` sont masqués, seul `« Espace joueur »` reste.

**États** : compteurs `—` tant que le bundle public n'est pas chargé ; aucun état d'erreur affiché (échec silencieux `console.warn`, `main.js:2089-2091`). Bannière maintenance globale possible (§4.6).

### 2.2 `s-hrp` — Règlement HRP avant inscription (`index.html:6630-6693`)

**Rôle** : visiteur (étape obligatoire avant inscription dans le parcours nominal).
- Emblème SVG animé (`fadeIn .8s`), `<h1>` **`Nuages Polaires`**, sous-titre **`Règlement Hors-Roleplay`**.
- `#hrp-content` rempli par `renderRegles("hrp-content")` à chaque `showScreen('s-hrp')` (`main.js:1973-1976`) — même contenu que l'onglet Règlement connecté (§5.10).
- Actions : `« ← Retour »` → `s-home` ; `« J'accepte — Continuer »` → `s-register`. Aucune case à cocher : l'acceptation est le clic.

### 2.3 `s-register` — Inscription (`index.html:6696-6778`)

- En-tête : `<h1>` **`Nuages Polaires`**, **`Créer un compte joueur`**.
- Formulaire : `Pseudo` (`#reg-pseudo`, placeholder `« Ton pseudo »`), `Mot de passe` (`#reg-pass`, œil `« Afficher le mot de passe »`), `Confirmer le mot de passe` (`#reg-pass2`, `Enter` → `register()`). Encart italique doré : **`Choisissez un mot de passe unique, différent de vos autres comptes.`**
- Bouton `« Créer mon compte »` (`#reg-btn`) → `register()` (`main.js:2122-2193`) ; `« ← Retour »` → `s-home`.
- **Validations client** (ordre, messages exacts) :
  1. vide → `« Remplis tous les champs. »`
  2. `pass!==pass2` → `« Les mots de passe ne correspondent pas. »`
  3. pseudo < 2 → `« Pseudo trop court. »`
  4. pass < 4 → `« Mot de passe trop court (4 caractères min). »`
  5. regex `^[a-zA-ZÀ-ÿ0-9_ -]{2,32}$` → `« Pseudo invalide (2-32 caractères, lettres/chiffres/espaces/tirets). »`
- Envoi : `hashPass` (sha256) → `POST auth {action:"register", pseudo, passHash}`. Erreur serveur → `npFriendlyApiError` + suffixe ` (HTTP xxx)` ; 409 → `« Inscription : ce pseudo est déjà pris. »` (`main.js:614`). Échec de hachage → `« Erreur interne de hachage du mot de passe. »`
- Succès : cookie posé, `_loadSessionBundle`, `CU` construit (`pending:!pid`), `launchApp()` **sans passer par la transition** ni par `s-pending`.

### 2.4 `s-login` — Connexion (`index.html:6781-6863`)

- Canvas particules `#login-particles-canvas`, emblème, `<h1>` **`Nuages Polaires`**, **`Connexion`**.
- Champs : `Identifiant` (`#login-id`, `autocomplete="username"`, placeholder `« Ton pseudo »`, `autofocus`), `Mot de passe` (`#login-pass`, `Enter` → `loginUnified()`), toggle **`Rester connecté`** (`#login-remember`, pré-coché si `localStorage.np_session_flag`, `main.js:1978-1984`, effet visuel `spawnToggleStars`).
- Bouton `« Se connecter »` → `loginUnified()` (`main.js:2264-2310`) ; `« ← Retour à l'accueil »` → `s-home`.
- Champs cachés obsolètes : `pl-pseudo`, `pl-pass`, `mj-n`, `mj-p`, `err-p`, `err-s` (`6855-6857`) — dette.
- **Validations** : `« Entre ton pseudo. »`, `« Entre ton mot de passe. »` ; hash invalide → `« Erreur interne de hachage. »` ; 401 → `« Identifiant ou mot de passe incorrect. »` ; autres → `npFriendlyApiError(resp,"Connexion")` (`« Connexion : serveur injoignable. Vérifie Netlify ou ta connexion. »`, `« … trop de tentatives. Réessaie dans 15 minutes. »`, etc., `main.js:607-621`). Le mot de passe est vidé et refocalisé après erreur.
- Succès → `_finishLogin` : purge des caches privés, `np_session_flag` posé/retiré selon la case, `forcePasswordReset` → `s-reset`, sinon chargement bundles → `sysLog("connexion","Connexion au Compagnon",name)` → transition → `launchApp()`.

### 2.5 `s-reset` — Nouveau mot de passe imposé (`index.html:6866-6883`)

- Icône 🔑, **`Nuages Polaires`**, **`Nouveau mot de passe`**, texte : **`Choisis un mot de passe pour sécuriser ton compte. Il te sera demandé à chaque connexion.`**
- Champs `Nouveau mot de passe` (`#reset-pass1`, `Enter` → focus pass2), `Confirmer` (`#reset-pass2`, `Enter` → `saveResetPass()`). Bouton `« Définir le mot de passe »`.
- `saveResetPass` (`main.js:5326-5344`) : `« Remplis les deux champs. »`, `« 4 caractères minimum. »`, `« Les mots de passe ne correspondent pas. »` ; `POST auth {action:"complete_forced_reset", newPassHash}` ; succès → toast `« Mot de passe défini. Reconnecte-toi. »` → `s-login` (focus identifiant). Pas de bouton retour.

### 2.6 `s-pending` — Compte en attente (`index.html:6886-6948`) — **écran mort**

Contenu conservé pour le ton : ⏳, **`Compte en attente`**, **`Ton compte a bien été créé. Un administrateur doit lier ton compte à ton personnage avant que tu puisses accéder à ta fiche. Reviens te connecter une fois que tu as reçu la confirmation.`**, `#pending-pseudo`, bouton `« Se déconnecter »`. Jamais atteint : l'attente est traitée dans `s-app` (§4.2, §5.1).

### 2.7 `s-first-steps` — Premiers pas (public) (`index.html:6556-6558`)

Conteneur nu `<main id="public-first-steps-c" class="np-first-steps-public">`, sans masthead. Rempli par `renderFirstSteps` (`first-steps.js:86-111`), état `guest`. Contenu détaillé en §5.2 (identique connecté/public, seuls les boutons changent). Sortie : bouton de pied `« Retour à l’accueil »` → `s-home` ; `« J’ai déjà un compte »` → `s-login` ; `« Lire le règlement et rejoindre »` → `s-hrp`.

---

## 3. Le shell connecté `s-app` (`index.html:6951-7328`)

### 3.1 Bannières au-dessus de l'en-tête

- `#pending-banner` (`6953`, affiché par `.is-pending`) : **`⏳ Ton compte est en attente de liaison — un administrateur doit te lier à ton personnage.`**
- `#legacy-combat-recovery` (injecté par `_showLegacyCombatArchiveRecovery`, `main.js:1440-1464`, si d'anciennes archives locales existent) : **`Des archives de combat de ton compte existent encore dans ce navigateur. Télécharge une copie JSON et vérifie le fichier avant de les effacer. Elles restent conservées ici jusqu’à cet effacement explicite et ne sont pas envoyées au serveur.`** Boutons `« Télécharger ma copie JSON »`, `« Effacer les copies exportées… »` (désactivé tant que non exporté), `« Plus tard »`.
- `#offline-banner` (`index.html:7113-7120`, sticky top 52 px, affiché par `launchApp` si `_dbOffline`, `main.js:4455-4482`) : `⚠` **`MODE HORS-LIGNE`** — **`Base de données indisponible — les données affichées viennent du cache local. Les modifications ne seront pas synchronisées.`** Bouton `« ↺ RÉESSAYER »` (→ `VÉRIFICATION…` puis `location.reload()`). Ping automatique toutes les 30 s ; retour → toast `« Connexion rétablie — rechargement des données. »`.

### 3.2 En-tête `header.app-header` (`index.html:6954-7065`)

**Gauche `.hdr-l`** :
- `#hdr-back` `←` (title `Retour`) → `historyBack()` (`main.js:5412-5420`) — visible seulement si `_navHistory` non vide (`_updateBackBtn`, `5407`). Pile interne de 20 onglets, indépendante de l'historique navigateur.
- `↻` (title `Rafraîchir`) → `location.reload()`.
- Logo SVG `#hdr-logo-svg` → `logoClick(this)` (animation de particules, `main.js:15733`).
- Wordmark **`Nuages Polaires`** / small **`Le Compagnon`**.
- `#burger-btn` (title `Menu`) → `toggleMobileDrawer()` ; visible uniquement `≤1200px` dans `#s-app` (`index.html:190-193`) et `≤600px` (`608-609`).

**Centre `nav.hdr-nav#main-tabs`** (`6988-7022`, masqué `≤1200px`) :
- Dropdown `#dd-aventure` (`⌂ Mon aventure`, affiché seulement `.is-player`/`.is-staff`, `index.html:195-196`) — en-tête **`MON AVENTURE`** : `« Tableau de bord »` → `switchDropTab('accueil')` ; `« Mon personnage »` → `_closeAllNavDrops();forceOpenOwnProfile()` ; `« Archives de combat »` (classe `np-archives-entry`) → `switchDropTab('archives')`.
- Dropdown `#dd-joueurs` (`◎ Univers`) — en-tête **`UNIVERS`** : `✦ Synopsis`, `⚜ Serments`, `◈ Bestiaire` ; séparateur ; en-tête **`RÈGLES`** : `◇ Premiers pas` → `openFirstSteps()`, `⚔ Système de jeu` → `combat`, `§ Règlement HRP` → `reglement` + `scrollTo(0,0)`.
- Bouton direct `📅 Événements` (`data-app-tab="evenements"`) → `switchDropTab('evenements',null,'')`.
- Bouton direct `* RPG — expérimental` (`data-app-tab="rpg-prototype"`) → `openRpgPrototype()` (**dérive**).
- `#staff-nav-placeholder` : reçoit le clone de `<template id="tpl-staff-nav">` (`7024-7047`) à `launchApp` si staff (`main.js:4529-4536`) :
  - séparateur doré + label **`Staff`** ;
  - dropdown `#dd-staff` bouton `⚙ Outils` + badge rouge `#nav-pending-badge` (nombre de comptes joueurs sans `pid`, `updatePendingBadge`, `main.js:4578-4590`). `staff-navigation.js:267-284` remplace l'icône (`♛` admin, `✦` designer, `⚙` MJ) et ajoute une pastille `Admin|MJ|Designer` ; `286-300` insère un hint : **`Admin · outils de gestion, données et santé technique.`** ou **`Staff · outils disponibles selon ton rôle.`**
  - Menu `#dd-staff-menu` : en-tête `perm-mj` **`MAÎTRISER UNE PARTIE`** : `👥 Personnages` (+ badge `#dd-joueurs-pending-badge`), `⚔ Simulation`, `🜂 Apparitions` ; en-tête `perm-designer` **`CRÉATION`** : `✦ Atelier bestiaire` (`perm-designer`), `⚜ Atelier serments` (`perm-admin`) ; en-tête `perm-admin` **`ADMIN`** : `🗄 Administration`. Les suffixes `MJ` / `ADMIN` sont ajoutés en CSS `::after` (`staff-navigation.js:131-138`).

Comportement des dropdowns (`main.js:10027-10180`) : le menu est **déplacé dans un portail `#nav-dropdown-root`** (`position:fixed`, z-index 10135) et positionné sous le bouton (`_positionNavDrop`, largeur min 220 px, max `min(320px, 100vw-16px)`) ; fermeture au clic extérieur, au `resize`/`scroll`, et par `switchDropTab`. `switchDropTab` **ignore le `ddId` passé** et le recalcule via `_tabDropIdFor` (`10147`), marque l'item et le bouton parent `has-active`, blur l'élément actif, puis `switchTab(id,null)` ; cas spécial `bestiaire` : triple `_focusOnScreen` (0/80/220 ms).

**Droite `.hdr-r`** (`7050-7064`) :
- Cloche `#notif-bell` (classe `player-only-tab` → visible `.is-player` ou `.has-character`) + compteur `#notif-count` (`updateNotifBadge`, `main.js:9994-10010` : notifications du personnage + comptes en attente pour `manage_mjs`, affiche `9+` au-delà de 9). Clic → `toggleNotifPanel()` → panneau `#notif-panel` (300 px) rendu par `renderNotifPanel` (`10182-10244`) : en-tête **`NOTIFICATIONS`** + `« TOUT EFFACER »` ; section staff **`EN ATTENTE DE LIAISON`** avec lignes `pseudo` / **`Sans personnage lié · Cliquer pour lier`** / badge `NEW` → `goToPending()` ; section **`ACTIVITÉ`** : entrées de `player.history` (50 max, moins `notifDeleted`), typées par `notifType` (`Niveau ⬆`, `Gemme 💎`, `Combat ⚔`, `XP ✦`, `Ajout +`, `Retrait −`, `Consommation ◎`), bouton `✕` (`deleteNotif`) ; vide : **`Aucune notification.`** ; non connecté : **`Non connecté.`** Fermeture au clic extérieur.
- Profil `#hdr-profile` (masqué tant que non connecté ; `updateHdrProfile`, `main.js:2454-2497`) : avatar (initiale de secours), nom, badge rôle. Clic → `handleProfileClick()` (`3083-3090`) : si aucun personnage résolu → `openSettings("compte")`, sinon `forceOpenOwnProfile()`.
- `#hdr-settings-btn` `⚙` (`aria-label="Mon compte et ma collection"`) → `openSettings()`.

### 3.3 Tiroir mobile `<template id="tpl-mobile-drawer">` (`index.html:7069-7112`)

Injecté dans `#mobile-drawer-root` à `launchApp` (`main.js:4514-4520`) — donc **absent pour un visiteur**. Panneau 280 px glissant depuis la gauche (`toggleMobileDrawer`/`closeMobileDrawer`, `main.js:15893-15927` ; `mobile-polish.js:159-165` porte la largeur à `min(88vw,360px)`), overlay `rgba(0,0,0,.6)` + blur, `Escape` ferme (`15930`), burger animé en croix.
- En-tête **`NAVIGATION`** + `✕`.
- **`MON AVENTURE`** : `Tableau de bord`, `✦ Mon personnage` (`drawer-player-only`), `Archives de combat`, `Événements`.
- **`UNIVERS`** : `Synopsis`, `Serments`, `Bestiaire` ; **`RÈGLES`** : `Premiers pas`, `Système de jeu`, `Règlement HRP`.
- `RPG — expérimental` (**dérive**).
- `#drawer-staff-section` (`display:none` → affiché si staff) : **`STAFF`** (réécrit en `Staff` + pastille rôle par `staff-navigation.js:330-358`), **`MAÎTRISER UNE PARTIE`** : `Personnages`, `Simulation`, `Apparitions` ; **`CRÉATION`** : `Atelier bestiaire`, `Atelier serments` (`perm-admin`), `Administration`.
- Pied : `⚙ Mon compte et ma collection` → `openSettings()`, `← Déconnexion` → `logout()`.
Chaque item appelle `closeMobileDrawer()` après navigation.

### 3.4 Pied de shell : modales statiques, toast, garde d'erreur, palette

- `#staff-modal-root` (`7332`) : reçoit `_buildStaffModals()` (§6.2) à la première connexion staff.
- `#m-avatar-crop` (`7338-7413`), `#m-editpass` (`7415-7430`), `#m-drop` (`7433-7439`) : §6.1.
- `#notif` (`7441`) : toast global `notif(msg, type)` (`main.js:1696-1716`) ; types `ok` (3 s), `inf` (3 s), `err` (3,6 s), `warn` ; dédoublonnage 9 s sur même message.
- `#runtime-guard` (`7443-7450`) : encart d'erreur (`aria-live="polite"`) titre par défaut **`Erreur détectée`**, message **`Erreur 500 — incident interne pendant le chargement.`**, boutons `« Relancer la vue »` → `retryCurrentView()` et `« Fermer »`. Alimenté par `reportRuntimeIssue` (`main.js:16494-16517`) **uniquement en mode diagnostic** (`?diag=1|debug=1|runtime=1`, ou `localStorage.np_runtime_visible/np_diag_visible`, `16470-16478`) ; sinon `console.warn` seulement. Auto-fermeture 6,2 s.
- `#cmdk` (`7452-7461`) : palette « Navigation rapide » — input placeholder **`Rechercher un écran, un outil ou une action…`**, hint **`⌘/Ctrl + K — navigation rapide • / — ouvrir`**, bouton `« Fermer »`. Détails §7.5.

### 3.5 Ordre d'initialisation dans `launchApp` (`main.js:4429-4576`)

1. Thème revalidé, `_removeLoader()`, `initStorage()` une fois, bannières legacy/offline.
2. `_viewPid=CU.pid`, classes de rôle, `has-character`.
3. `rememberedTab=_readLastAppTab()` (hash prioritaire, sinon `localStorage.np_last_app_tab`).
4. `updateHdrProfile()`, injection tiroir mobile, affichage `#hdr-profile` et `#hdr-settings-btn`, injection nav staff + `_buildStaffModals()` si staff.
5. `showScreen("s-app")`.
6. Onglet initial (mémoire suspendue) : designer → `bestiaire` ; autre staff → `accueil` + `_buildJoueursTab/renderSPList/popSSelects` ; admin → + `renderMJList`, `renderPendingAccounts`, `updatePendingBadge`, `startAdminPoll` ; joueur en attente → `accueil` + `renderSynopsis` ; joueur lié → `accueil`.
7. Pré-rendus : `renderView()` (sauf pending), `renderBGrid`, `renderCombat`, `renderRegles`, `renderAllSerments`, `renderSynopsis` ; `updateNotifBadge` à +500 ms.
8. Restauration de l'onglet mémorisé à `setTimeout 0` (`_restoreRememberedAppTab`, `4416-4427` ; cas `profil` → restaure aussi `settingsTab`).

---

## 4. Navigation : cartographie complète

### 4.1 Desktop (≥ 1201 px)

En-tête à trois zones (§3.2). Dropdowns `Mon aventure` / `Univers` / `Outils` + boutons directs `Événements`, `RPG — expérimental`. Tous les onglets sauf `accueil`/`rpg-prototype` s'ouvrent en **popup centrée** `width:min(1280px, 100vw-36px)`, `top:74px`, `max-height:calc(100vh-94px)`, bord 28 px (`index.html:234`), avec `✕` en haut à droite et `Escape`.

### 4.2 Tablette et mobile (≤ 1200 px)

- `#s-app .hdr-nav{display:none}` ; `#burger-btn{display:flex}` (`index.html:190-193`) → tout passe par le tiroir (§3.3). Le seuil de 1200 px a été choisi pour éviter le débordement des outils staff (`docs/plan-du-site:14`).
- `≤ 900 px` : popup `top:62px; left/right:8px; bottom:8px; border-radius:20px`, bouton close 34 px (`index.html:5432`, `242`).
- `≤ 860 px` (`mobile-polish.js:21-62, 96-175`) : padding 14 px, grilles en 1 colonne, boutons ≥ 44 px, inputs `font-size:16px` (anti-zoom iOS), en-tête 62 px, infos profil 126 px max, tiroir `min(88vw,360px)`.
- `≤ 760 px` : modales/popups `max-width:calc(100vw-18px)`, `max-height:calc(100svh-24px)` (`mobile-polish.js:351-379`) ; fiche : hero en colonne (`connected-pages-polish.js:433-451`).
- `≤ 600 px` (`index.html:600-620`) : infos profil masquées, settings 26 px, `#pending-banner` réduit, grilles 1 colonne.
- Accueil public `≤ 760 px` : masthead réduit (§2.1).
- Aucune barre d'onglets basse : la navigation mobile repose entièrement sur le burger et sur les liens internes des pages (tableau de bord, guide).

### 4.3 URL, hash, historique navigateur

- Chaque `switchTab` non-retour fait `history.pushState({tab:id},"","#"+id)` (`main.js:5534-5535`). Un retour interne (`_isBack`) fait `replaceState` si le hash diffère (`5536-5540`), pour que la fermeture d'une popup via `✕` corrige l'adresse sans créer d'entrée.
- `popstate` (`5635-5640`) → `switchTab(e.state.tab, btn, true)`. Le sélecteur `#main-tabs .nav-tab[onclick*=...]` ne correspond à **aucun élément** (il n'existe plus de `.nav-tab`), donc `btn` est toujours `null` — sans effet visible.
- Hash direct au chargement : `#fiche`, `#evenements`, etc. sont honorés après auto-connexion (`_readLastAppTab` priorise le hash, `4404-4407`). Sans session, le hash est ignoré (sauf `#rpg-prototype`, `rpg-prototype.js:181`).
- `logout()` (`main.js:5247-5322`) : `POST auth logout`, purge cookies/`localStorage` (`np_session_flag`, `np_session`, `np_last_app_tab`, `np_cache_version`…), remise à zéro du DOM staff (placeholder, tiroir, profils), `history.replaceState(null,"",pathname+search)`, `showScreen("s-home")` puis **`location.reload()` après 80 ms**.
- `showScreen` ne touche pas à l'URL : les écrans publics (`s-hrp`, `s-login`…) n'ont **pas d'adresse** ; le bouton Précédent du navigateur depuis `s-login` ramène à la page précédente du site externe.

### 4.4 Restauration d'onglet et mémoire locale

Clé `localStorage.np_last_app_tab` (`_lastAppTabKey`, `main.js:4348`) :

```json
{ "id": "fiche", "settingsTab": "compte" | "collection", "at": 1727700000000 }
```

Écrite à chaque `switchTab` si l'onglet est autorisé pour le rôle (`_rememberAppTab`, `4380-4390`), suspendue pendant `launchApp` (`_tabMemorySuspended`). Le sous-onglet du compte est mémorisé par `_rememberAppSubState` (`4392-4402`). Effacée au logout.

Autres clés locales rencontrées dans ce domaine : `np_session_flag` (case « Rester connecté »), `np_recent_crop_images` (images récentes du recadrage, `main.js:2505`), `np_diag_visible` / `np_runtime_visible` (mode diagnostic).

### 4.5 Raccourcis clavier et fermetures

| Touche | Effet | Source |
|---|---|---|
| `Escape` | ferme la modale ouverte, sinon la popup d'onglet | `main.js:5484-5492` |
| `Escape` | ferme le tiroir mobile | `main.js:15930` |
| `Escape` | ferme la palette | `main.js:16690-16694` |
| `Ctrl/⌘ + K` | ouvre/ferme la palette `#cmdk` | `16679-16683` |
| `/` (hors champ) | ouvre la palette | `16684-16688` |
| `↑ ↓ Enter` | navigation dans la palette | `16698-16713` |
| `Ctrl + Alt + D` | panneau diagnostics (`diagnostics.js:527-533`, pose `np_diag_visible=1`) | — |
| `Enter` dans les formulaires | soumission (register, login, reset, mot de passe compte, suppression, `m-editpass`) | attributs `onkeydown` |

Clic sur le fond d'une `.moverlay` → `closeModal` (`main.js:9927-9937`) **sauf** `#m-edits` qui « flashe » et affiche **`SAUVEGARDER OU ✕ POUR FERMER`** (`_editsBackdropWarning`, `15936-15961`).

### 4.6 Palette de commandes (`getCommandItems`, `main.js:16579-16612`)

Visiteur : `Accueil public` (**`Retour à la landing page`**, `H`), `Espace joueur` (**`Ouvrir la connexion`**, `L`), `Rejoindre l’aventure` (**`Parcourir l’entrée HRP`**, `R`), `Premiers pas` (**`Comprendre comment rejoindre NP`**).
Connecté : `Accueil` (**`Tableau d’ensemble du compagnon`**, `A`), `Premiers pas` (**`Guide et prochaine étape`**), `Archives de combat` (**`Retrouver les récits et comptes rendus`**, hors designer), `Synopsis` (**`Univers et contexte`**), `Serments` (**`Explorer les serments`**), `Bestiaire` (**`Voir les créatures`**), `Événements` (**`Suivre les événements`**), `Règlement` (**`Consulter le cadre HRP`**), `Paramètres` (**`Compte, collection et apparence`**, `P`), `Ma fiche` (**`Ouvrir la fiche du personnage`**, si `CU.pid`, `F`) ; admin/MJ : `Joueurs` (**`Annuaire et comptes liés`**, `J`), `Simulation` (**`Outils de combat`**, `C`) ; `manage_beasts` : `Atelier bestiaire` (**`Créer, corriger et organiser les créatures`**, `AB`) ; admin : `Atelier serments` (`AS`), `Administration` (**`Vue d’ensemble, comptes, thèmes et logs`**, `ADM`). Vide : **`Aucun résultat — Essaie un autre mot-clé ou ouvre directement une zone depuis la navigation.`**

### 4.7 Bannières de service (hors shell)

- `npSetMaintenanceBanner` (`main.js:623-638`) : bandeau fixe bas **`Service temporairement indisponible`** + message `npFriendlyApiError(...) + " Les pages publiques restent consultables si elles sont déjà chargées."` (`640-645`), déclenché sur status 0/5xx/503.
- `api-hardening.js:180-230` : seconde bannière `np-api-banner` avec boutons `« Réessayer »` (→ `Vérification…`), `« Diag »` (→ `npDiagnostics.open()`), `×`.

---

## 5. Onglets connectés, un par un

### 5.1 `accueil` — Tableau de bord (`renderAccueil`, `main.js:8104-8278`)

**Rôle** : tout connecté (rendu à chaque ouverture). Non-popup : c'est la « page de fond ».

- En-tête `np-logbook-heading` : eyebrow **`Le Compagnon / Tableau de bord`**, `<h1>` **`L’aventure continue.`**, salutation selon l'heure (`Bonne nuit` <6 h, `Bonjour` <12 h, `Bon après-midi` <18 h, `Bonsoir`) + `, {CU.name}` + staff : **`Retrouve les récits et les rendez-vous du serveur.`** / joueur : **`Ton personnage, tes rendez-vous, la suite de ton histoire.`** Sceau `favicon.svg`.
- Bloc « Premiers pas » compact (`renderFirstStepsHome`, `first-steps.js:80-84`, vide pour staff) : voir §5.2 ; bouton `« Consulter les premiers pas ↗ »`.
- Statistiques `<dl class="np-logbook-stats">` : staff → **Personnages** / `Dans le registre`, **Comptes actifs** / `Ces sept derniers jours`, **Combats archivés** / `Avec ton personnage` ou `Dans tes archives`, **Rendez-vous** / `À venir` ; joueur → **Niveau** / `De ton personnage`, **Combats archivés** / `Avec ton personnage`, **Gemmes en réserve** / `Dans ton inventaire`, **Rendez-vous** / `À venir`.
- Carte 01 **`Prochain événement`** : calendrier (mois/jour/année), eyebrow `{type.label} · Dans N jour(s)`, `<h3>` nom, date longue `fr-FR` + heure, description tronquée à 180 caractères, bouton `« Voir les événements ↗ »`. Vide : **`Un nouveau chapitre se prépare.`** / **`Aucun événement à venir pour le moment. Les prochains rendez-vous seront affichés ici.`** / `« Ouvrir l’agenda ↗ »`.
- Carte 02 **`Derniers combats`** (3 archives où le personnage figure ; admin : toutes) : nom, `fdt(savedAt) · Round N`, résultat `Victoire` (tous monstres KO) / `Défaite` (tous joueurs KO) / `Inachevé` / `Brouillon`. Vide : **`Les récits restent à écrire.`** / **`Les combats archivés apparaîtront ici, avec leur résultat et leur date.`** Bouton `« Retrouver mes combats ↗ »` → `archives` (masqué pour designer).
- Aside « personnage » : eyebrow `Ton personnage` / staff `Personnage consulté` ; portrait, nom, serment (`Serment à définir` si vide), branche, statuts (`STATUT_EFFECTS`, `main.js:12474`), bouton `« Ouvrir mon personnage ↗ »` / staff `« Ouvrir la fiche ↗ »` → `forceOpenOwnProfile()`. Staff sans personnage : **`L’atelier du monde.`** / `{Rôle} · Tes outils de création et de gestion sont accessibles depuis le menu Outils.` + `« Voir les personnages ↗ »` (manage_players) ou `« Ouvrir l’atelier bestiaire ↗ »` (manage_beasts). Joueur en attente : eyebrow **`Tes premiers pas`**, **`Le premier chapitre.`** / **`Ton compte attend d’être lié à ton personnage par un administrateur. En attendant, découvre les serments et l’univers.`** + `« Découvrir les serments ↗ »`.
- Section **`Les pages du monde`** : 4 liens `Les serments` / `Voies et héritages`, `Le bestiaire` / `Créatures et rencontres`, `Le système de jeu` / `Mécaniques et combats`, `Le règlement` / `Le cadre de nos histoires`.
- Staff : section **`Au service des histoires`** : `Simulation`, `Apparitions`, `Personnages` (manage_players) ; admin : `Administration`, `« N compte(s) en attente »` → `joueurs`.
- Appelle enfin `renderAppearanceSection()` (sans effet ici, `#appearance-section` absent).

### 5.2 `premiers-pas` — Guide (`first-steps.js`)

**Rôle** : connecté (popup) ou public (`s-first-steps`). Lecture pure de l'état, aucune donnée stockée.

États (`state()`, `first-steps.js:13-28`) : `guest`, `pending`, `linked`, `unavailable`, `staff`. Textes (`statusCopy`, `34-61`) :
- `pending` : label **`Compte créé · liaison à venir`**, titre **`Ton histoire peut déjà prendre forme.`**, texte **`Ton compte est bien enregistré. Un administrateur doit maintenant le lier à ton personnage. Transmets-lui ton pseudo de compte sur le serveur Discord ; tu peux déjà lire l’univers, les règles et les serments.`**, action `« Découvrir les serments »` ; + **`Pseudo à transmettre : {pseudo}`**, note **`Après la confirmation de l’administrateur, recharge la page pour retrouver ta fiche.`**, bouton `« La liaison est faite ? Recharger »`.
- `linked` : **`Personnage lié`** / **`{Nom}, la suite t’appartient.`** / **`Ta fiche est disponible. Retrouve ton serment, ton équipement et ton journal, puis consulte les événements pour préparer la prochaine aventure.`** / `« Ouvrir mon personnage »`.
- `unavailable` : **`Fiche indisponible`** / **`Retrouvons ton personnage.`** / **`Une liaison existe sur ton compte, mais la fiche n’est pas disponible pour le moment. Recharge la page. Si le problème persiste, indique ton pseudo à un administrateur sur le serveur Discord.`** / `« Recharger la page »`.
- `staff` : **`Repères pour l’équipe`** / **`Accompagner les premiers pas.`** / **`Ce parcours explique l’arrivée d’un joueur. La liaison entre compte et personnage relève d’un administrateur ; tes propres outils restent accessibles dans le menu Outils.`** / `« Revenir au tableau de bord »`.
- `guest` : **`Bienvenue dans Nuages Polaires`** / **`Une place dans une histoire collective.`** / **`Nuages Polaires se joue en roleplay textuel sur Discord. Ce site en est le compagnon : l’univers, les règles, ta fiche et les rendez-vous de l’aventure.`** / `« Lire le règlement et rejoindre »` + `« J’ai déjà un compte »`.

Page complète (`renderFirstSteps`, `86-111`) : eyebrow **`Le Compagnon / Guide de départ`**, `<h1>` **`Les premiers pas.`**, **`Prendre ses repères, trouver son serment, puis écrire la suite ensemble.`** ; section **`Du premier regard au premier récit`** / **`Quatre repères pour comprendre le parcours.`** :
1. **`Découvrir le cadre`** — **`Lis le règlement HRP et le système de jeu. Le synopsis et les serments t’aident à imaginer un personnage qui trouve sa place dans un monde où les constructions ont presque toutes disparu.`** (`« Lire le règlement HRP »`, connecté : `« Comprendre le système de jeu »`).
2. **`Créer ton compte`** — **`L’inscription vient après la lecture du règlement. Ton compte te permet de te connecter au site ; il ne crée pas automatiquement ta fiche de personnage.`** (`« Consulter mon compte »` / `« Lire le règlement et m’inscrire »`).
3. **`Faire lier ton personnage`** — **`Échange avec un administrateur sur le serveur Discord et communique ton pseudo de compte. L’administrateur réalise la liaison avec ta fiche. Une fois la liaison confirmée, recharge le site.`** (`« Retrouver ma fiche »` si lié).
4. **`Préparer ta première aventure`** — **`Consulte ta fiche et les événements à venir. Lorsqu’un personnage est lié à ton compte et que les inscriptions sont ouvertes, tu peux participer depuis l’agenda.`** (`« Consulter les événements »`).
Section **`Trois repères à garder`** : ◇ **`Une fiche suivie par l’équipe`** (consommation : « retire un exemplaire et conserve une trace dans l’historique, sans appliquer automatiquement ses effets en combat »), ≋ **`Un journal partagé avec les MJ`** (« lisible par toi, les maîtres du jeu et les administrateurs … ce n’est pas un espace de notes réservé à toi seul »), ✧ **`Un RPG à explorer à part`** (**dérive** ; « prototype solo expérimental … Ses récompenses ne sont pas versées sur ta fiche du compagnon. Le multijoueur à distance n’est pas disponible. » + `« Découvrir le RPG expérimental »`).
FAQ **`Avant de partir`** : `Mon compte est créé, pourquoi ma fiche est-elle absente ?`, `Comment rejoindre le serveur Discord ?` (« Demande le lien d’invitation à l’équipe ou à la personne qui t’a présenté Nuages Polaires. L’inscription sur le site ne rejoint pas automatiquement le serveur. »), `Qui contacter pour une correction de ma fiche ?`. Pied : **`Les liens se tissent dans les récits.`** + `« Revenir au tableau de bord »` / `« Retour à l’accueil »`.

Routage `npFirstStepsGo(action)` (`129-147`) : `guide`→`openFirstSteps`, `reload`, `login`→`s-login`, `register`→`s-hrp`, `rpg`, `rules`→`reglement`|`s-hrp`, `system`→`combat`, `events`→`evenements`, `serments`, `dashboard`→`accueil`|`s-home`, `character`→`forceOpenOwnProfile`, `account`→`openSettings('compte')`.

### 5.3 `archives` — Archives de combat (`adventure-archives.js`)

**Rôle** : `admin`, `mj`, `joueur` (designer exclu). Lecture seule.
- En-tête : eyebrow **`Mon aventure / Les récits`**, `<h1>` **`Archives de combat`**, **`Retrouve les comptes rendus de ta fiche et les archives accessibles à ton compte.`**
- Barre : `Rechercher un récit` (`type="search"`, placeholder **`Titre, organisateur, compte rendu…`**), `Type de récit` (`Tous les récits` / `Archives sauvegardées` / `Comptes rendus de fiche`), compteur `N récit(s)` (`role="status"`).
- Liste paginée 20/page (`« Précédent »` / `« Suivant »` / `x / y`), items `Compte rendu` ou `Archive` + nom + date (`Date non renseignée`). Vides : **`Aucun récit ne correspond à ces filtres.`** / **`Aucun combat enregistré pour le moment.`**
- Détail (`aria-live="polite"`) : par défaut **`Les traces de ton aventure`** / **`Choisis un récit pour consulter son détail. Les comptes rendus de fiche et les archives sauvegardées sont présentés séparément, sans modifier un combat en cours.`** ; chargement **`Chargement du récit…`** ; archive : eyebrow `Archive sauvegardée`, `Round N · Brouillon|En cours`, liste des combattants `PV x / y`, **`Journal du combat`** (ou **`Aucune entrée de journal dans cette archive.`**) ; compte rendu : eyebrow `Compte rendu de ta fiche`, texte, `Enregistré par …`. Bouton `« Exporter ce récit »` (fichier `nuages-polaires-combat.txt`). Erreur : **`Récit indisponible`** / **`Le chargement a échoué. Tes archives sont conservées ; tu peux réessayer.`** / `« Réessayer »`. Sur mobile (≤760) le détail scrolle en vue.
- Staff `manage_players` : bouton **`Ouvrir la simulation et ses outils`** → `combat-mj`.
- Non connecté : **`Connecte-toi pour retrouver tes combats.`**

Sources : archives par propriétaire (`combatArchiveIndexKey/StoreKey`) + `player.history[type==='combat']` pour un joueur.

### 5.4 `fiche` — Dossier de personnage (`index.html:7136-7259`, `renderView`, `main.js:5703-5785`)

**Rôle** : connecté ; le personnage affiché est `_viewPid` (staff) ou `CU.pid`. `switchTab('fiche')` résout le `pid` propre (`5600-5608`) et rend deux fois (0 et 30 ms).

- Hero `header.shero.np-sheet-hero` : portrait `#p-av` (initiale de secours ; admin `manage_stats` : bouton **`Modifier le portrait de {nom}`** → `openAvatarCropFor(pid)` avec overlay `✎`), kicker **`Le Compagnon / Dossier de personnage`**, `<h1>` nom, serment `#p-cls`, arme `#p-wpn`, branche `#p-br` (`Branche : {nom}`), filigrane du serment en Cinzel (opacité .06), bordure haute colorée `_sermColor`. Boutons admin `#shero-admin-btns` : `« ✎ Stats »` → `oES(pid)`, `« ⇄ Serment »` → `openChangeSerm`, `« ⇄ Branche »` → `openChangeBranch`.
- Nav de fiche `nav.np-sheet-nav` (`aria-label="Sections de la fiche"`) : `01 Ressources`, `02 Équipement`, `03 Journal`, `04 Serment` → `scrollFicheSection(id)` (focus + `scrollIntoView`, `main.js:5697-5702`).
- **CHAPITRE 01 — `Les forces du moment.`** / `Ressources, progression et état du personnage.` : carte **Statistiques** (`Points de Vie`, `Énergie Physique`, `Énergie Magique` : `cur / max` + barres) ; carte **Progression** (`Niveau` → `Niveau N`, `Expérience` → `x / y XP` + barre, note **`Un seul niveau fait progresser tes statistiques et les capacités de ton serment.`**) ; carte **Gemmes de Sang** (`☾ Blanche ×n`, `✦ Incarnate ×n`, `✦ Écarlate ×n`, autres ; vide **`Aucune gemme.`**) ; carte **Statuts** (`renderStatutsFiche`, `main.js:12796-12820` : chips colorées `STATUT_EFFECTS` ; vide **`Aucun statut actif.`** ; admin `manage_stats` : select `+ Ajouter…`, note optionnelle, bouton `« Poser »`, `✕` par statut).
- **CHAPITRE 02 — `Ce que tu emportes.`** / `Équipement, objets et traces de leurs usages.` : carte **Équipement** (silhouette SVG avec zones survolables `Casque`, `Plastron`, `Jambières` ; vide `Aucun équipement`) ; carte **Inventaire** (`renderInv`, `main.js:5909-5980` : sections par catégorie, `×qty` ; vide **`Inventaire vide.`**) ; carte **Déclarer une consommation** : `Objet à consommer` (`#p-csel`, `— Choisir —`), `Contexte de la consommation` (`#p-cnote`, placeholder **`Décris quand et comment ton personnage utilise cet objet…`**), bouton `« Confirmer la consommation »` → `playerConsume()` (`6054-6076` : erreurs `« Choisis un item. »`, `« La note ne doit pas dépasser 2 000 caractères. »`, `« Item indisponible. »` ; toasts `« Ton compte doit être lié à un personnage pour déclarer une consommation. »`, `« La consommation se déclare depuis ton propre personnage. »` ; succès `« {item} consommé. »`) ; panneau **`⚙ MJ — Inventaire`** (`panel-mj`) : `« + Ajouter un item »` → `oAI(getViewPid())`, `« − Retirer un item »` → `oRI(...)` ; carte **Historique** avec filtres dynamiques (`Tous`, `⬆ Niveaux`, `✦ XP`, `💎 Gemmes`, `⚔ Combats`, `◎ Items`, `📊 Stats`, `⚜ Serment`, `🎲 Dés`, `+ Divers`), 60 entrées max filtrées / 40 sans filtre, `✕` de suppression pour `manage_players` ; vides **`Aucune entrée pour ce filtre.`** / **`Aucun historique.`**
- **CHAPITRE 03 — `Les traces du voyage.`** / `Notes de personnage et comptes rendus des combats.` : carte **Journal de bord** (`renderJournalFiche`, `5789-5822` : propriétaire ou admin → textarea placeholder **`Notes personnelles, lore, secrets…`** + `« Sauvegarder »` (toast `« Journal sauvegardé. »`), note **`Visible par toi, les maîtres du jeu et les administrateurs.`** ou **`Vous lisez le journal de {nom} en tant qu'Admin.`** ; MJ → lecture seule **`Journal en lecture seule.`** / **`Aucune entrée.`** ; autre → **`Accès restreint.`**) ; carte **Historique de combat** (`renderCombatHistFiche`, `5832-5894` : entrées `history.type==='combat'` parsées `N round(s)`, barres PV/EP ; vide **`Aucun combat enregistré.`**).
- **CHAPITRE 04 — `Le lien qui te définit.`** / `Ton serment, ses branches et les capacités débloquées par ton niveau.` : `renderSerm` (`7058-7150`) : icône, nom, arme, lignée, pastille de rang, 4 stats (`PV/niv`, `EP/niv`, `EM/niv`, `Dmg frappe`), lore, branches (badge **`Ma branche`**, style coloré, description, rail de paliers `Niv. N` débloqués/verrouillés, **`Palier actif`** + nom + coût + description ou **`Départ — Aucun palier débloqué`**, **`Prochain : Niv. N · nom · coût`**). Erreur : **`Serment introuvable.`**

**États de la fiche** (`renderFicheState`, `5658-5668`) : `« Connexion requise » / « Connecte-toi pour accéder à ta fiche. »` ; `« Compte en attente » / « Ton compte n’est pas encore lié à un personnage. Un administrateur doit terminer la liaison avant d’ouvrir la fiche. »` ; `« Chargement de la fiche » / « Je tente de recharger les données de ton personnage. »` ; `« Fiche indisponible » / « Impossible de retrouver les données du personnage pour le moment. Recharge la page ou reconnecte-toi. »` ; `« Fiche temporairement indisponible » / « Un élément de la fiche a échoué au chargement. Recharge la page ou reconnecte-toi. »`.

`forceOpenOwnProfile` (`3049-3081`) : restaure le shell, `showScreen('s-app')`, `switchTab('fiche')`, puis recharge les caches si le personnage manque (`« Je recharge ton personnage. »`).

### 5.5 `profil` — Mon compte / Ma collection (`renderProfil`, `main.js:3092-3168`)

**Rôle** : connecté. Deux sous-onglets `_settingsTab` (`compte` | `collection`), boutons `« Mon compte »` / `« Ma collection »` (`aria-pressed`), mémorisés.
- En-tête : eyebrow **`Espace personnel / Compte`** ou **`/ Collection`**, `<h1>` **`Un espace à toi.`** / **`Les couleurs du voyage.`**, sous-titre **`Ton identité, ton accès au compagnon et les réglages de ta session.`** / **`Retrouve tes thèmes et choisis l’atmosphère qui accompagne tes récits.`**
- Identité : avatar (bouton `« Importer ou recadrer l’avatar »` si personnage), eyebrow **`Ton compte`**, nom, pastille rôle, `Personnage lié · {nom}` / staff `Fiche consultée · {nom}` / joueur sans fiche **`Ton compte attend sa liaison à un personnage par un administrateur.`** / **`Ta fiche est indisponible pour le moment.`**, lien `« Modifier l’avatar ↗ »`.
- Onglet compte, si personnage : carte **`Une trace à emporter`** / **`Ta fiche, avec toi.`** / **`Télécharge la fiche complète de ton personnage au format PDF.`** + `« Télécharger le PDF ↓ »` → `exportFichePDF()` (jsPDF local).
- `01 Mot de passe — Sécuriser l’accès.` : **`Pour modifier ton mot de passe, confirme d’abord celui que tu utilises actuellement.`** ; champs `Mot de passe actuel`, `Nouveau mot de passe`, `Confirmer le nouveau mot de passe` (placeholder `Une seconde fois`) ; bouton `« Enregistrer le mot de passe ↗ »` → `saveMyPass` (`3169-3186` : `« Remplis tous les champs. »`, `« 4 caractères minimum. »`, `« Les mots de passe ne correspondent pas. »`, serveur `« Impossible de modifier le mot de passe. »`, réseau `« Erreur réseau. Réessaie. »`, succès toast `« Mot de passe modifié. »`).
- `02 Session — Revenir simplement.` : toggle **`Rester connecté`** / **`Se souvenir de moi pendant 30 jours sur ce navigateur.`** (`toggleSession` : toasts `« Session sauvegardée — tu resteras connecté 30 jours. »` / `« Session supprimée — tu devras te reconnecter au prochain chargement. »`) ; **`Tu peux fermer ta session à tout moment.`** + `« Se déconnecter ↗ »`.
- **`Suppression du compte — Une décision définitive.`** : admin → **`Le compte administrateur ne peut pas être supprimé.`** ; sinon **`La suppression de ton compte est irréversible. Ton personnage lié et tout ton historique seront définitivement perdus.`**, bouton `« Supprimer mon compte »` → formulaire `Ton mot de passe pour confirmer` + `« Confirmer la suppression définitive »` → `deleteMyAccount` (`5384-5399` : `« Entre ton mot de passe. »`, `« Non connecté. »`, `« Impossible de supprimer ce compte. »`, `« Erreur réseau. »`, succès `« Compte supprimé définitivement. »` puis `logout()`).
- Onglet collection : **`Ta galerie — Choisis ton atmosphère.`** / **`Équipe un thème possédé ou retrouve les thèmes à débloquer. Le thème actif est indiqué dans la collection.`** + `#appearance-section` → `renderThemeGrid` (`3866-3936` : cartes `Équipé` / `Possédé` / `À débloquer` / `Indisponible`, action `Thème actif` / `Équiper` / `Débloquer` / `Non disponible` ; verrouillé → toast `« Ce thème n'est pas dans ta collection. »`). `theme-max.js:1898` ajoute un hero **`Collection des thèmes`** / **`Construis ta galerie de thèmes, équipe tes trouvailles et suis ta progression entre classiques, événements, rares et fondateurs.`** (domaine thèmes, hors périmètre détaillé).

### 5.6 `synopsis` (`renderSynopsis`, `main.js:8280-8305`)

Kicker **`NUAGES POLAIRES`**, `<h1>` **`L'Argonaute a chuté.`**, chapeau **`Ce monde n'a pas été sauvé. Il commence après l'échec du plus grand héros, dans un futur où chaque survivant peut devenir une légende ou disparaître dans le silence.`** Manuscrit en trois temps **`La chute`**, **`Le basculement`**, **`Le réveil`**, lignes isolées **`Le Dimenséa, sa relique, a changé de mains.`**, **`Puis la réalité s'est pliée.`**, **`Le monde n'est pas mort : il attend.`**, clôture `<h2>` **`Ce qui reste à écrire dépend de ceux qui se relèvent.`** (texte intégral `8292-8301`). Aucune action.

### 5.7 `serments` — Catalogue (`renderAllSerments`, `main.js:6166-6198`)

- Guide **`Rangs et progression des serments`** : **`Les capacités se renforcent avec le niveau du personnage et son expérience commune. Les Serments du départ sont Basiques. Leur première évolution forme les Aguerris, actuellement gardés hors vitrine le temps d’être retravaillés. Plus loin, certains chemins deviennent Émérites, tandis que les voies Singulières peuvent tendre vers le Transcendé ou le Corrompu.`**
- Filtres `Type` (`Tous`, Mêlée, Distance, Magie, Soutien via `getSermCatLabel`) et `Rang` (`Toutes`, `Basique`, `Émérite`, `Singulier`, `Transcendé`, `Corrompu` — `seasoned` volontairement absent, `6185`).
- Cartes (`renderSermCard`, `6520-6590`) : badge `Nouveau` (custom), icône, nom, arme, lignée, pastille de rang, catégorie, aperçu du lore, 4 stats `PV/niv EP/niv EM/niv Dmg`, branches en `<details>` (nom, style, description physique/narrative, `<details>` **`Montée en puissance`** `N étape(s)` avec chips `Palier · Niv. x/y`, nom, coût, description) ; vide **`Aucune branche définie.`**

### 5.8 `bestiaire` (`index.html:7270-7288`, `renderBGrid`/`bCard` surchargés dans `beast-admin.js:299-375`)

- Recherche `#beast-search-input` placeholder **`🔍  Rechercher une créature, un niveau, une compétence…`** (`beastSearch`).
- Filtres comportement : `Tous`, `🐇 Gibier`, `😐 Passif`, `⚖ Neutre`, `⚠ Agressif`, `☠ Très agressif` ; tris `PV ↕`, `Niv ↕`, `A→Z` (bascules ↑/↓, `Z→A`).
- Grille `#p-bgrd` : cartes publiques (image ou placeholder initiale + sous-titre), nom, sous-titre, tag comportement, `Niv. N`, description étendue, table `PV` / `EP` / `Frappe`, **`COMPÉTENCE`**, **`BUTIN`**, **`DROP GEMME (D100)`**. Créatures `hidden`/`archived` exclues (`beast-admin.js:330`). Tri alphabétique par défaut. Vide **`Aucune créature pour ces filtres.`** Erreur de rendu (`ui-patches.js:191-207`) : **`Bestiaire indisponible`** / **`Une erreur a empêché le chargement du bestiaire. Rafraîchis la vue ou reviens plus tard.`**

### 5.9 `combat` — Système de jeu (`renderCombat`, `main.js:8630-8839`)

Document de référence (aucune action). Titre **`Système de Combat`**, citation, sections **I. Philosophie du Combat** (règle fondamentale : **`Toute action déclarée est une réussite.`**), **II. Statistiques** (30 PV / 50 EP / 20 EM au niveau 1), **III. Récupération** (repos + repas), **IV. Structure d'un Combat** (initiative au premier agresseur ; tour séquentiel J1/J2 ; tableau de perception de la vitesse 3 / 4–5 / 6–7 / 8–9 / 10+ ; 3 actions + 1 par niveau d'écart), **V. Actions & Coûts** (Frappe 6 EP, Tir 4 EP, Invoquer 1 EM, Esquive 8 EP, Bloquer 2/5 EP −25 %/−50 %, Se déplacer 10 EP, objets 0 EP ; formule `Dégâts = base Serment + Niveau` ; Pugilat `3 + Niveau`, 6 EP), **VI. Surcadençage** (×2, ×2.5, ×3, ×3.5, ×4, +0.5/palier, arrondi supérieur), **VII. Épuisement Total**, **VIII. Combats à Plusieurs Entités**, **IX. Fin du Combat** (KO / MORT), **X. Interprétation des Dégâts** (LÉGER 66–100 %, GRAVE 33–65 %, CRITIQUE 0–32 % ; 7 types Tranchant/Contondant/Brûlure/Acide/Gel/Poison/Foudre), **XI. Les Serments & Progression** (paliers I Éveil niv 2, II Densité niv 5, III Maîtrise niv 7, IV Plénitude niv 10 ; Gemmes Blanche +5 / Incarnate +20 / Écarlate +50 XP ; `30 × niveau` XP ; aguerris 10/13/16/20), **Comportements des Créatures** (Gibier, Passif, Neutre, Agressif, Très agressif). Les formules exactes relèvent de l'audit « règles » ; elles sont citées ici car elles sont la matière de la page.

### 5.10 `reglement` — Règlement HRP (`renderRegles`, `main.js:8307-8628`)

Même contenu que `s-hrp`. Structure : Préambule (**`Règlement Officiel du Serveur`**, encart **`Ce document constitue la référence absolue…`**), **Partie I — Règlement Hors-Roleplay (HRP)** (I.1 Respect mutuel et bienveillance, I.2 Confidentialité et vie privée, I.3 Langue et communication, I.4 Contenus interdits, I.5 Publicité et autopromotion, I.6 Intégrité du serveur, I.7 Relations avec le staff), **Partie II — Règlement Roleplay (RP)** (II.1 IRP/HRP, Metagaming, Connaissances IRP, Godmodding/Powerplay, La mort du personnage ; II.2 L'arrivée dans le monde « l'étouffement » ; II.3 Fiche, Changement de Serment, Cohérence, Les Serments ; renvoi vers l'onglet **Système de Jeu** ; II.4 Thématiques sensibles), **Partie III — Sanctions et Modération** (tableau Avertissement verbal / formel / Mute / Kick / Bannissement ; Recours 48 h), **Partie IV — Dispositions Finales** (IV.1–IV.6), **Glossaire — Termes du monde** (20 termes : Dimenséa, Élève du Serment, Serment, Arme du Serment, Palier, Gemme de Sang, PV, EP, EM, IRP, HRP, MJ, Metagaming, Godmodding, Powerplay, Surcadençage, Initiative, CAC, L'Argonaute, KO), **Mentions légales et transparence du site** (éditeur, hébergeur Netlify, propriété intellectuelle, limitation de responsabilité), **Politique de confidentialité** (`Dernière mise à jour : mai 2026.`). Le placement des mentions légales/RGPD dans le règlement est signalé comme un choix de navigation à revoir (`docs/plan-du-site:121`).

### 5.11 `evenements` — Agenda (`renderEvents`, `main.js:15079-15185`)

**Rôle** : connecté ; édition si `_canManageEvents()` (staff).
- En-tête : eyebrow **`Nuages Polaires · Le calendrier`**, `<h1>` **`Les rendez-vous du monde.`**, **`Une expédition, une rencontre, une histoire à écrire ensemble. Retrouve ici les événements de Nuages Polaires.`** ; staff : `« + Nouvel événement »`. Index `✧` : `N À venir` / `N Passés`, note staff **`Les événements masqués restent visibles au staff.`** / joueur **`Choisis un rendez-vous et rejoins l’aventure.`**
- Section **`Le prochain chapitre — À venir N`** / **`Les dates suivent l’heure de ton appareil.`** ; vide : **`Un horizon encore ouvert.`** / **`Aucun événement à venir pour le moment. Les prochains rendez-vous apparaîtront ici.`** (+ `« Créer le premier événement »`). Section **`Les traces du voyage — Passés N`** (8 derniers).
- Carte (`renderEventCard`) : date (jour court, numéro, mois année, `<time>` heure ; sans date : `À définir` / `—` / `Prochainement`), type (`EV_TYPES`, `main.js:15013` : `⚔ Combat / Chasse`, `🗺 Exploration`, `💬 Social / Roleplay`, `🌟 Événement majeur`, `☁️ Autre`), état `Masqué · staff` / `Passé` / `Date à confirmer` / `Vous participez` / `Complet` / `Inscriptions ouvertes`, titre, description, bloc **`Le groupe`** `n / max participant(s)`, jauge, `« N place(s) disponible(s). »` / **`Toutes les places sont prises.`** / **`Sans limite de places.`**, liste `aria-label="Personnages inscrits"` (`· vous`) ou **`Aucun participant pour le moment.`**
- Actions joueur : sans personnage **`Un personnage doit être lié à ton compte pour participer.`** ; sans date **`Inscriptions fermées — date à confirmer.`** ; inscrit **`Ta place est réservée`** + `« Se désinscrire »` ; ouvert **`Rejoins le groupe`** + `« ✓ Participer »` ; complet **`Ce rendez-vous est complet.`** Toasts : `« Inscription confirmée — {nom} ✓ »`, `« Désinscription effectuée. »`, `« Ton compte doit être lié à un personnage pour participer aux événements. »`.
- Actions staff : **`Gestion du rendez-vous`** : `« 👁 Publier »` / `« 🔒 Masquer »`, `« ✎ Modifier »`, `« Supprimer »` (confirm `« Supprimer cet événement ? »`).

Forme d'un événement (`saveEvent`, `15246-15257`) :

```json
{ "id": "ev1727...abc", "nom": "Chasse au givre", "type": "combat",
  "desc": "…", "date": 1729000000000, "max": 0, "hidden": false,
  "inscrits": ["Aurore"], "createdBy": "MJ Lune", "updatedAt": 1727700000000 }
```

### 5.12 `rpg-prototype` — **DÉRIVE, à supprimer** (`rpg-prototype.js`)

Documenté pour l'inventaire des entrées à retirer : boutons `RPG — expérimental` dans le colophon public (`index.html:6626`), l'en-tête (`7019`), le tiroir (`7094`), la carte du guide Premiers pas (`first-steps.js:102`), la palette (aucune entrée), le hash `#rpg-prototype` (`rpg-prototype.js:181`), `npResetRpgSession` appelé à login/logout (`main.js:2315, 5251`). `openRpgPrototype` (`rpg-prototype.js:180`) **force `#s-app` actif sans `CU`** puis `switchTab('rpg-prototype')` — un visiteur obtient le shell connecté (en-tête vide de profil). L'onglet n'est pas un popup et est exclu de la mémoire d'onglet. Contenu : création de personnage (`Choisis ton départ`), carte à 7 lieux, `Explorer / combattre`, `Se reposer`, boutique, objectifs, `Présences de démonstration`, journal. Hero : **`Nuages Polaires RPG — Explore les lieux, affronte les créatures et équipe ton personnage dans ce prototype solo. Ta progression est sauvegardée ; le multijoueur à distance n’est pas encore disponible.`**

### 5.13 `joueurs` — Personnages (staff) (`_buildJoueursTab`, `renderSPList`, `main.js:8985-9162`)

**Rôle** : `admin`, `mj`. À l'ouverture, `_refreshPrivateCaches()` puis rendu (`5620-5630`).
- Hero : kicker **`Registre staff`**, titre **`Joueurs`**, stats `#players-hero-stats`, bouton `« + Nouveau joueur »` → modale `m-addp`.
- Recherche `⌕` placeholder **`Rechercher un profil, un serment, un compte ou un rôle...`** + `« Effacer »` + méta.
- Section admin **`⏳ Comptes en attente de liaison (N)`** (repliable, repliée par défaut si > 2, `renderPendingAccounts`, `8854-8902`) : par compte, pseudo + date d'inscription, select `— Choisir un personnage —` (personnages non liés), `« Lier ce compte »` → `linkAccount` (`« Choisis un personnage. »`, succès `« Compte '{pseudo}' lié à {nom}. »`), `« Refuser »` → `deleteAccount` (confirm `« Supprimer ce compte ? »`).
- Liste `#s-plist` : carte par personnage (avatar, nom + tag `Affiché` si c'est la fiche en cours, `{serment} — Niveau N · date`, badges `Niv. N` + rôle du compte lié ou `Non lié`, vitals `PV EP EM XP`, actions selon droits : `+Item` / `−Item` (manage_items), `Stats` (manage_stats), `XP` (manage_xp → `openProgPanel`), `Accéder` (→ `loadPlayer` : `_viewPid` puis `switchTab('fiche')` + panneau XP), `Sup.` (delete_player, confirm `« Supprimer ce joueur ? Irréversible. »`) + bloc admin compte (`_playerAccountAdminBlock`). Vides : **`Aucun profil trouvé`** / **`Essaie un nom, un serment, un pseudo de compte ou un rôle.`** ; **`Aucun joueur`** / **`Les personnages apparaîtront ici une fois créés.`**
- Admin : liste des comptes `#mjlist` (`renderMJList`, `9750-9836`) : recherche **`Rechercher pseudo, rôle, personnage…`**, filtre rôle (`Tous`, `Admins`, `MJ`, `Designers`, `Joueurs` avec compteurs), `« Actualiser »` ; par compte : pseudo, rôle, `En attente de liaison`, `Reset requis`, `⇔ {personnage} — {serment}` ou `Aucun personnage`, boutons `Reset`, `MDP`, `Suppr.`, commutateurs de rôle `Joueur MJ Designer Admin` (dernier admin : **`Compte Admin principal`**), select `— Aucun personnage lié —`.

### 5.14 `combat-mj` — Simulation (staff MJ/admin) (`rCombat`, `main.js:12847-13864`)

Outil d'arbitrage complet (le détail mécanique relève de l'audit combat). Éléments de navigation/écran :
- Barre de commande sticky `.sim-cmd` (étiquette CSS **`SIMULATEUR TACTIQUE`**) : champ `#c-name` placeholder **`Nom du combat…`**, boutons `« ▶ DÉMARRER »` (`combatStart`), `« ⚡ RÉSOUDRE LE ROUND »` (`combatResolve`), `« ■ FIN »` (confirm `« Terminer le combat ? »` → `combatEnd`), `📋` (`combatExportDiscord`), `💾` (`combatSaveArchive`), `↩` (`combatUndo`), `＋` (`combatNewFromArchive`).
- Phases `idle` → `declaration` → `resolution` (`_cs.phase`, `main.js:10972`) ; toasts `« Phase de déclaration terminée. »`, `« Les déclarations ne sont pas complètes. »`.
- Panneaux **`ÉLÈVES DU SERMENT`** / **`ADVERSAIRES`** (sélection), **`FORMATION`**, tracker, cartes de combattants (`★ INITIATIVE`, cibles, `cDeclareAction`, `⏭ PASSER`, `↩ ANNULER`, `✏ Modifier`, `+`/`−` PV/EP/EM, `☕` repos court, statuts), **`ACTIONS DÉCLARÉES`**, **`JOURNAL`** (`#clog-inner`), **`NOTES MJ`** (`« 💾 SAUVEGARDER »`), **`DROPS EN ATTENTE`** (modale `m-drop`, §6.1), **`ÉTAT TACTIQUE`**.
- Archives intégrées **`Archives de combat`** (`13831-13836`, `renderArcFiltered` `14820`) : `Recherche libre` (**`Nom, créateur, joueur, créature…`**), `Créateur`, `État` (`Brouillons`, `En cours`, `Victoires`, `Défaites`, `Résultat mixte`), `Tri` (`Plus récents`, `Plus anciens`, `Créateur A → Z`, `Créateur Z → A`, `Nom A → Z`, `Round décroissant`), chips joueurs, `« Réinitialiser »` ; liste **`Archives filtrées`** / **`Clique une archive pour afficher sa vue détail et ses actions rapides.`** ; vide **`Aucun combat trouvé`**.
- `_startCombatMJPoll()` rafraîchit périodiquement.

### 5.15 `apparitions` — Générateur d'apparitions (staff MJ/admin) (`renderSpawnLab`, `main.js:14410-14637`)

Kicker **`OUTIL STAFF — GÉNÉRATEUR D’APPARITIONS`**, titre **`Roll par zone`**, sous-titre **`Choisis une zone, lance le roll, et le résultat tombe parmi les mobs configurés dedans.`** (+ admin : **`Les poids restent globaux : un mob qui sort baisse, les autres remontent.`**). Select `Zone`, résumé `N mob(s)` + jetons (12 max, `+N autres`) ou **`Cette zone ne contient aucun mob visible.`** Boutons `« Roll »`, `« Transférer dans le simulateur »` (→ `combat-mj`), `« Copier le récap »`, admin `« Réinitialiser le global »`. Légende des poids (`Base`, `Poids dynamique`, `Sorties`, `Fatigue`, `Rattrapage`). Historique des runs.

### 5.16 `bestiaire-admin` — Atelier bestiaire (`beast-admin.js:268-282`)

**Rôle** : `manage_beasts` (admin, designer) ; sinon **`Accès réservé`** / **`Création bestiaire est réservée aux admins et designers.`**
Titre **`Création bestiaire`**, sous-titre **`Espace réservé admin/designer pour créer, corriger, archiver, importer et préparer les créatures. Le Bestiaire reste une page de consultation propre.`** Boutons `« + Nouvelle créature »` (modale `m-addb`), `« Zones d’apparition »` (`openBeastZoneManager`). Recherche **`Rechercher une créature, note, niveau, compétence...`**, mêmes filtres que le bestiaire + filtres avancés (statut publié/masqué/archivé, image, usage, boss, menace, complétude, niveau min/max, tri). Cartes admin : `« Éditer »`, `« + Combat »`, menu `Plus` (`Aperçu`, `Dupliquer`, `JSON`, `Archiver`/`Restaurer`, `Purger` si `delete_beast`), `<details>` **`Détails`** (`STYLE DE COMBAT`, `BUTIN`, `DROP GEMME (D100)`), image cliquable → `openBeastImgCrop`.

### 5.17 `serments-admin` — Atelier serments (admin) (`renderSermentsAdminPage`, `main.js:6270-6497`)

Non-admin : **`Accès réservé`** / **`Atelier serments réservé aux administrateurs.`** Hero `⚜` kicker **`Atelier admin`**, titre **`Serments, branches & paliers`**, **`Forge de conception réservée aux administrateurs. Ici se préparent les voies, les évolutions et les équilibres avant leur apparition dans la vitrine publique.`** Boutons `« + Nouveau serment »`, `« Rafraîchir »`. Métriques `Total` / `Branches` / `Aguerris (gardés hors vitrine)` / `Custom (éditions locales)`. Menu **`Lignées`** (familles), filtres `Recherche` (**`Nom, arme, branche...`**), `Rareté`, `Type`, `Visibilité`. Lignes de serments avec édition de branches/paliers via modales `m-serm`, `m-branch`, `m-palier`, `m-palier-list`.

### 5.18 `database` — Administration (admin) (`renderDatabase`, `main.js:4794-4998`)

Encart **`⚠ Données confidentielles — Accès administrateur uniquement.`** (réécrit par `database-admin-polish.js:290` : **`Données confidentielles — Accès administrateur uniquement. Vérifie toujours l’onglet actif avant une action sensible.`**). Onglets internes `window._dbTab` (`openDatabaseInnerTab`, `4648`) : **`Vue d'ensemble`** (`dashboard`), **`Comptes`**, **`Thèmes`**, **`Log`** (`historiques` ; alias `audit`). Pied : **`Astuce : les onglets Comptes, Thèmes et Log sont des zones sensibles. Les boutons rouges ou destructifs doivent toujours être confirmés avant validation.`**
- Vue d'ensemble : `renderStats` (`10283`) — **`Tableau de Bord`**, `« ⬇ Export JSON partiel »`, `« ⬆ Import JSON »`, KPIs `Aventuriers`, `Niveau moyen`, `Actifs / 7j`, `Combats`, `Gemmes`, `Comptes`, **`SERMENTS LES PLUS JOUÉS`**, distribution des niveaux, créatures les plus affrontées, dernières connexions ; puis console `admin-dashboard.js:444-503` : **`Admin · console intégrée`** / **`Santé technique & diagnostics`**, cartes `DB`/`Auth`/`Thème`/`Modules`, **`Actions sûres — Aucune écriture DB`** : `Test complet`, `Diagnostic serveur`, `Diagnostic DB/Auth`, `Réessayer API`, `Vider erreurs front`, `Copier rapport`, `Exporter .json`.
- Comptes : table triable (`Pseudo`, `Mot de passe` [`••••••••` ou `⚠ RÉINITIALISÉ`, `✎` → `m-editpass`, `🔑 Reset` → `resetAccountPass`], `Rôle` (select, dernier admin verrouillé), `Personnage lié` (select `— Aucun —`, `✕` délier, `→` aller à la fiche), `Thèmes`, `Dernière activité` (`Jamais connecté`, `Nj`/`Nh`/`N min`/`À l'instant`), `Créé le`, `Suppr.`), recherche **`Rechercher (pseudo, rôle, perso)...`**.
- Thèmes : `renderAdminThemes` (hors périmètre).
- Log : **`LOG SYSTÈME`**, `En cours (N)`, `Archives (N)`, `« 📦 Archiver »`, `« Tout vider »` ; vides **`Aucune entrée dans le log.`** / **`Aucune archive.`** ; journal de sécurité (`_renderAuditEntries`, `4660-4749`) avec **`Filtres premium`** (recherche, action, acteur, dates), vide **`Aucune entrée dans le journal de sécurité.`**

### 5.19 `carte` — Carte du monde (dormant)

HTML commenté (`index.html:7320-7322`), rendu désactivé (`main.js:5619`), code `renderCarte/_initCarte` (`15370-15660`) avec `LIEU_TYPES` (Ville / Village, Ruines, Zone dangereuse, Zone naturelle, Point d'intérêt, Zone secrète). Aucune entrée de navigation. À ne pas confondre avec la carte du RPG.

---

## 6. Modales et formulaires

### 6.1 Modales statiques (`index.html`)

- **`m-avatar-crop`** (`7338-7413`, `« Recadrer l'avatar »` ; titres dynamiques `« Importer / recadrer l'avatar »`, `« … — {créature} »`, `« … du personnage »`) : `URL de l'image` (placeholder `https://i.imgur.com/...`, `oninput` → `cropLoadImg`), `Fichier local` (`« Importer depuis l'appareil »`, `« Retirer l'image »`), note **`Tu peux importer une image depuis le PC ou le téléphone. Elle sera optimisée avant stockage, avec un aperçu final avant validation.`**, zone canvas circulaire, `Zoom` 0,5–4, aide **`Glisse l'image pour recentrer · Scroll pour zoomer`**, aside **`Aperçu final`** (`Aucune image chargée.` / **`Export automatique optimisé pour la base.`**), **`Ajustements rapides`** (`Ajustement auto`, `Zoom naturel`, `Recentrer`), **`Images récentes`** (`Vider`). Actions `« Annuler »` / `« Appliquer »` → `cropApply` (`2958-3006` : `« Aucune image chargée. »`, `« Impossible d'optimiser l'image. »`, `« Image trop lourde après compression. Essaie une image plus simple ou zoome davantage. »` [> 350 000 caractères], succès `« Avatar mis à jour. »` / `« Image mise à jour. »` / `« Avatar prêt pour la création du personnage. »`). `role="dialog"`, focus piégé et restitué (`_focusAvatarModal`, `_restoreAvatarModalFocus`).
- **`m-editpass`** (`7415-7430`, admin) : **`Modifier le mot de passe`**, `Compte : {pseudo}`, champ `Nouveau mot de passe` (`type="text"`), `« Annuler »` / `« Enregistrer »` → `saveEditPass`.
- **`m-drop`** (`7433-7439`, seule modale « publique » dans `openModal`, `main.js:1733`) : titre dynamique **`💀 {créature} KO — Drop ?`**, **`TABLE DE DROP`** (plages D100 → gemme), `« 🎲 Lancer le D100 »` (`rollDropDie`), résultat et attribution à un joueur.

### 6.2 Modales staff (`_buildStaffModals`, `main.js:3249-3586`, injectées à la connexion staff)

| id | Titre | Champs (libellés exacts) | Actions / validations |
|---|---|---|---|
| `m-edits` | **Modifier les statistiques** (titre → `{nom} — {serment}`) | `PV actuels`, `PV max` (readonly, `Calculé automatiquement selon le niveau`), `EP actuels`, `EP max`, `EM actuels`, `EM max`, `Niveau`, `XP`, `Casque`, `Torse`, `Jambes`, `Branche` (boutons `Aucune` / `A — style` / `B — style` ou **`Sans branches.`**) | `« Annuler »` / `« Enregistrer »` → `saveStats` (`9570-9602`) : max recalculés `30+(niv-1)·pvN`, `50+…·epN`, `20+…·emN`, valeurs courantes plafonnées, `xpMax=xpReq(level)`, entrée d'historique `Stats mises à jour — Niveau N (PV:… EP:… EM:…)`, toast `« Stats de {nom} sauvegardées. »`. Fond non fermant. |
| `m-addi` | **Ajouter un item** (→ `Joueur : {nom}`) | `Nom de l'item`, `Quantité` (min 1), `Catégorie` (`Équipement`, `Consommable`, `Gemme`, `Divers`), `Note IRP` (`Contexte narratif...`) | `« Ajouter »` → `addItem` : `« Nom obligatoire. »`, `« Joueur introuvable. »`, `« Permission insuffisante. »` ; historique `Ajout : q× nom — note` par `MJ {nom}` ; toast `« q× nom → {joueur}. »` |
| `m-remi` | **Retirer un item** | `Item` (select `— Choisir —` avec `×qty`), `Quantité`, `Note IRP` | `« Retirer »` → `removeItem` : `« Choisis un item. »`, `« Item introuvable. »` ; toast `« q× nom retiré. »` |
| `m-addb` | **Nouvelle créature** | `Nom`, `Sous-titre` (`Prédateur du givre...`), `Comportement` (Gibier…Très agressif), `Niveau`, `PV` (20), `EP` (20), `Image`, `Zones` (`Forêt gelée, Ruines, Grotte...`), `Frappe`, `Compétences`, `Drops`, `Gemmes`, `Description`, `Note admin` (`Script MJ, gimmick, faiblesse cachée, loot spécial...`), cases `Masquée côté joueurs`, `Archivée` | `« Créer »` → `addBeast` (surchargé `beast-admin.js:384`) |
| `m-editb` | **Modifier la créature** | idem + `#eb-id` | `« Enregistrer »` → `saveEditBeast` |
| `m-addp` | **Nouveau joueur** | `Nom du personnage` (`Nom IRP`), `Serment` (select des serments visibles, `popSSelects`), `Avatar (URL ou import)` + aperçu cliquable `✦`, `« Importer / recadrer »`, `« Retirer l'image »`, note **`Tu peux coller une URL ou importer une image depuis l'appareil.`** | `« Créer »` → `addPlayer` (`9468-9487`) : `« Nom et Serment obligatoires. »`, `« Sauvegarde impossible en base. »` ; toast `« {nom} ajouté. »` |
| `m-addmj` | **Ajouter un membre staff** | `Pseudo`, `Rôle` (MJ / Designer / Admin) | Bouton `« Info »` → toast **`Le staff doit s'inscrire, puis modifiez le rôle dans Joueurs.`** — modale jamais ouverte par le code (dette). |
| `m-branch` | **Modifier une branche** | `Nom de la branche` (`Branche A — Nom`), `Style` (`Mêlée, Distance, AOE...`), `Description` | `« Enregistrer »` → `saveBranch` |
| `m-changeserm` | **Changer de Serment** | `Personnage : …`, `Serment actuel : …`, `Nouveau Serment` (select) | `« Changer »` (rouge) → `saveChangeSerm` |
| `m-changebranch` | **Changer de branche** | `Personnage`, `Serment`, options radio | `« Confirmer »` → `saveChangeBranch` |
| `m-serm` | **Serment** (créer/modifier) | `Nom du Serment` (`Duelliste...`), `Icône` (`✦`), `Arme liée` (`Épée du serment`), `Catégorie` (Mêlée/Distance/Magie/Soutien), `Rang du serment` (Basique, Aguerri, Émérite, Singulier, Transcendé, Corrompu, Autre), `PV/niv` (3), `EP/niv` (5), `EM/niv` (2), `Dégâts base` (8), `Lore`, `Masqué côté joueurs` | `« Enregistrer »` → `saveSerm` |
| `m-palier` | **Palier** | `Niveau requis` (2/5/7/10), `Nom de la capacité`, `Coût / conditions` (`6 EM — 1 action`), `Description` (`Description mécanique...`) | `« Enregistrer »` → `savePalier` |
| `m-palier-list` | **Gérer les paliers** | liste | `« Fermer »`, `« + Ajouter un palier »` |
| `m-event` | **Événement** (→ `Nouvel événement` / `Modifier l'événement`) | `Titre` (`Nom de l'événement`), `Type` (Combat, Exploration, Social, Événement majeur, Autre), `Date` (`datetime-local`), `Places disponibles` (help **`0 = sans limite. Les inscriptions existantes sont conservées.`**), `Description`, toggle publication (**`Publié — visible par tous les joueurs`** / **`Masqué — visible staff uniquement`**), case **`Notifier les joueurs à la création, si publié`** (MJ/admin uniquement ; help **`La notification est enregistrée après la création de l’événement.`** / **`Modifier ou publier cet événement ne renvoie pas de notification.`** / designer **`L’événement publié apparaît dans l’agenda des joueurs. Les notifications sont gérées par les MJ et administrateurs.`**) | `« Enregistrer »` → `saveEvent` (`15227-15294`) : `« Donne un titre à l'événement. »`, `« Choisis une date valide. »`, `« Le nombre de places doit être un entier positif, ou 0 pour aucune limite. »`, `« Cet événement n’existe plus. Recharge la page. »`, `« La capacité ne peut pas être inférieure au nombre de participants déjà inscrits. »` ; succès `« Événement créé|modifié — {nom} · Joueurs notifiés ✓ »` ; échec notification `« Événement enregistré — {nom}. Les notifications n’ont pas été confirmées. Recharge la page pour vérifier avant toute nouvelle tentative. »` |
| `m-theme` | **Thème événement** | `Nom du thème`, `Description`, `Classe CSS (optionnel)`, `Fond`/`Accent`/`Or` (color), `Disponible jusqu'au` | `« Enregistrer »` → `saveTheme` |

### 6.3 Modales dynamiques

- **`m-prog`** — **`Progression du joueur`** (`ensureProgModal`/`renderProgPanel`, `main.js:9180-9286`) : en-tête nom + serment + branche, 5 stats, onglets `Expérience` (manage_xp), `Ajustement` (adjust_levels), `Inventaire`, `Historique`. Panneau XP : **`XP actuel`**, note **`Une seule expérience fait progresser les statistiques et les capacités du serment.`**, **`Récompense de combat`** : `Mob vaincu` (select `— Choisir un mob —`), `Participation du joueur` (slider 0–100 %), **`XP à attribuer`** (`Sélectionne un mob`), `« Attribuer l'XP »` ; **`Choisir une gemme`** : `Gemme Blanche +5 XP`, `Gemme Incarnate +20 XP`, `Gemme Écarlate +50 XP`, `Quantité` −/+, `« Fusionner les gemmes »`. Panneau Ajustement : **`Le niveau détermine les statistiques et les capacités. Un ajout d’XP peut faire gagner des niveaux.`**, `Niveau` −/+, `XP` −10/+10, `XP −50/−100/+50/+100`.
- **`m-password-recovery`** (`resetAccountPass`, `5348-5371`) : confirm `« Réinitialiser le mot de passe de {pseudo} ? Un mot de passe temporaire unique, valable une heure, sera affiché pour le lui transmettre. »` → modale **`Mot de passe temporaire`**, **`À transmettre au propriétaire du compte. Il devra choisir un nouveau mot de passe à la connexion.`**, `Code temporaire` (readonly), `Expire le … Ce code ne sera plus affiché après fermeture.`, `« Fermer et effacer »`.
- **`m-beast-admin-preview`** — **`Aperçu bestiaire`** (`beast-admin.js:201-211`).
- Gestionnaire de zones (`openBeastZoneManager`, `main.js:7555`), modale thème (`_ensureThemeModal`, `4247`).

Comportement commun (`openModal`/`closeModal`, `main.js:1731-1754`) : hissage dans `#modal-root`, z-index 12040, `body.modal-open`, réconciliation des verrous de scroll (`_reconcileScrollLocks`, `1763-1786`, watchdog toutes les 1,8 s). `openModal` refuse toute modale sauf `m-drop` sans `CU`.

---

## 7. Parcours de référence (tels qu'implémentés)

### 7.1 Visiteur
`s-home` → lecture (scroll `L’univers`, `Les Serments`) → `« Comment commencer ? »` → `s-first-steps` (guide `guest`) → `« Lire le règlement et rejoindre »` → `s-hrp` → `« J'accepte — Continuer »` → `s-register`. Alternatives : `« Espace joueur »` → `s-login` ; palette `Ctrl+K`. Aucune adresse ne change pendant ce parcours. Le visiteur **ne peut pas** consulter Synopsis/Serments/Bestiaire/Événements (onglets réservés à `s-app`) — seuls l'accueil, le règlement (via `s-hrp`) et le guide sont publics. Détour connu : `« RPG — expérimental »` ouvre le shell `s-app` sans session (**dérive**).

### 7.2 Inscription et attente de liaison
`s-register` → `register()` → `launchApp()` direct (pas de transition) → `s-app` avec `#pending-banner` **`⏳ Ton compte est en attente de liaison…`**, badge en-tête **`En attente`**, tableau de bord `Le premier chapitre.`, guide `pending` (**`Pseudo à transmettre : {pseudo}`**). La cloche est masquée (pas de `pid`), `Mon personnage` mène à `renderFicheState("Compte en attente")`, le clic sur le profil ouvre `Mon compte`. Les événements affichent **`Un personnage doit être lié à ton compte pour participer.`** Déblocage : un admin lie le compte (`Personnages` → `Comptes en attente de liaison` ou `Administration › Comptes`), le joueur **recharge la page** (`« La liaison est faite ? Recharger »`). Aucune notification push ni polling côté joueur.

### 7.3 Joueur lié
Auto-connexion (cookie) → loader → `launchApp` → `accueil` (ou onglet mémorisé / hash). Boucle quotidienne : tableau de bord (niveau, combats, gemmes, prochain événement) → `Mon personnage` (fiche 4 chapitres : consommation, journal, avatar) → `Événements` (`✓ Participer`) → cloche (historique) → `⚙` (`Mon compte`, `Ma collection`, PDF) → `Se déconnecter` (rechargement complet). Sur mobile : burger → tiroir.

### 7.4 MJ
Connexion → `accueil` (**`Retrouve les récits et les rendez-vous du serveur.`**, raccourcis `Simulation`, `Apparitions`, `Personnages`) → `Outils ⚙` (`MAÎTRISER UNE PARTIE`) → `Personnages` (items/XP, `Accéder` → fiche d'un joueur avec `_viewPid`) → `Apparitions` (`Roll` → `Transférer dans le simulateur`) → `Simulation` (démarrer, rounds, drops, archiver, `📋 DISCORD`) → `Archives de combat`. Le MJ n'a pas accès à `Atelier bestiaire`, `Atelier serments`, `Administration`, ni à la suppression de personnage ; il lit les journaux sans les modifier. Son en-tête affiche le premier personnage du registre (voir Questions ouvertes).

### 7.5 Designer
Connexion → onglet initial **`bestiaire`** (`launchApp`, `4545-4546`) → `Outils` ne montre que `CRÉATION › Atelier bestiaire` → créer/éditer/archiver/aperçu/JSON, images, zones d'apparition. Pas d'`Archives de combat` (exclu de `_canUseTabNow` et de la palette), pas de `Mon aventure › Archives`. Peut créer des événements (`_canManageEvents`) mais sans notification.

### 7.6 Admin
Tout ce qui précède + `Atelier serments`, `Administration` (Vue d'ensemble/console, Comptes, Thèmes, Log), badge rouge des comptes en attente sur `Outils`, `Personnages` et la cloche ; `startAdminPoll`. Dernier admin non supprimable / rôle verrouillé. Compte admin : **`Le compte administrateur ne peut pas être supprimé.`**

### 7.7 Mot de passe réinitialisé
Admin `🔑 Reset` → code temporaire (1 h) transmis hors site → joueur `s-login` → réponse `forcePasswordReset` → `s-reset` → `« Définir le mot de passe »` → `s-login`.

---

## 8. États transversaux (chargement, vide, erreur)

- **Chargement** : loader boot **`Connexion...`** ; fiche **`Chargement de la fiche`** ; archives **`Chargement du récit…`** ; RPG `Chargement DB`. Boutons désactivés + `aria-busy` pendant les mutations joueur (`data-own-player-action`, `_refreshOwnPlayerActionControls`) et staff événements (`_eventStaffButtonAttrs`).
- **Vides** : recensés par onglet ci-dessus (accueil, archives, événements, fiche, inventaire, historique, bestiaire, personnages, log).
- **Erreurs** : toasts `notif(...,'err')` ; `#runtime-guard` (mode diag) ; `showRuntimeFallback` (`main.js:16531-16550`) remplace le contenu d'un onglet qui a planté par un encart `Erreur 404|403|408|415|500|503|507` + titre (`Panneau introuvable`, `Accès refusé`, `Temps d'attente dépassé`, `Média ou URL invalide`, `Incident interne`, `Service indisponible`, `Stockage saturé`, `Boucle interne détectée`, `Variable ou fonction manquante`, `Donnée ou composant incomplet`, `Script invalide`), `<details>` **`Détail technique`**, boutons `« Relancer »` / `« Retour accueil »`. `_runtimeViewLabel` (`16341-16364`) donne les noms humains des vues.
- **Hors-ligne / maintenance** : §3.1 et §4.7.
- **Mémoire d'erreurs** : `window.__npRuntimeIssues` (40 max).

---

## 9. Questions ouvertes

1. **Staff sans personnage lié hérite du premier personnage du registre** (`main.js:2242, 2352, 2172`) : l'en-tête, le tableau de bord (`Personnage consulté`), la cloche et `Mon personnage` d'un MJ/admin montrent le personnage d'un joueur. Est-ce voulu (« fiche consultée par défaut ») ou un effet de bord ? L'overhaul doit trancher : un compte staff a-t-il un personnage propre ?
2. **`s-pending` et `renderPendingTab` (`t-pending-c`) sont morts** ; l'attente est gérée par `#pending-banner` dans `s-app`. Faut-il un écran d'attente dédié (hors app) ou l'accès en lecture aux références pendant l'attente (comportement actuel) ?
3. **Contenu public** : aujourd'hui Synopsis, Serments, Bestiaire, Système de jeu, Événements exigent une session (`_canUseTabNow` : `baseTabs` → `!!CU`). Le plan cible (`docs/plan-du-site:274-276`) propose leur ouverture publique ; le règlement, lui, est déjà public via `s-hrp`. Quelle frontière ?
4. **Journal de bord** : lisible par MJ et admin, modifiable par le propriétaire et l'admin (`5794-5799`) — l'UI l'annonce désormais correctement, mais le plan (`docs/plan-du-site:194-196`) signalait un débat sur le public voulu. À confirmer.
5. **Rôle designer** : exclu des archives, des notifications d'événements et de l'atelier serments ; onglet initial `bestiaire`. Périmètre à décider (`docs/plan-du-site:309`).
6. **Mode popup généralisé** : chaque page de référence s'ouvre en modale sur le tableau de bord, avec verrou de scroll et hash `#synopsis`… Sur mobile la popup occupe l'écran. Conserver ce paradigme « une page de fond + panneaux » ou revenir à des pages/routes ?
7. **Écrans publics sans URL** (`s-login`, `s-hrp`, `s-register`, `s-first-steps`) et **rechargement complet au logout** : contraintes acceptables ou à corriger dans la nouvelle architecture (routes réelles) ?
8. **Mentions légales / RGPD dans le règlement** (`main.js:8570-8624`) : à sortir vers un pied de page dédié (`docs/plan-du-site:266-269`) ?

---

## 10. Ce qu'il faut absolument préserver dans l'overhaul

- **La voix et les libellés** de l'accueil, du tableau de bord, du guide et de l'agenda : `LE COMPAGNON`, `Le monde attend. Votre histoire commence.`, `« Le monde n’est pas mort. Il attend. »`, `Laissez votre trace.`, `L’aventure continue.`, `Le premier chapitre.`, `Les rendez-vous du monde.`, `Les traces du voyage`, `Les liens se tissent dans les récits.`, les chapitres de fiche `Les forces du moment.` / `Ce que tu emportes.` / `Les traces du voyage.` / `Le lien qui te définit.`, les eyebrows `Le Compagnon / …`.
- **Le parcours d'entrée « règlement d'abord »** : accueil → règlement HRP → inscription → attente de liaison explicite (pseudo à transmettre sur Discord) → rechargement → fiche. Le guide « Premiers pas » à cinq états (`guest`, `pending`, `linked`, `unavailable`, `staff`) sans stockage de progression.
- **La distinction compte / personnage** (un compte peut exister sans fiche ; la liaison est un acte admin) et la matrice de rôles `joueur / mj / designer / admin` avec ses permissions (`can()`), y compris les gardes côté navigation (`_canUseTabNow`, `switchTab`).
- **Les trois entrées de navigation joueur** `Mon aventure` (Tableau de bord, Mon personnage, Archives de combat) / `Univers` (Synopsis, Serments, Bestiaire ; Règles : Premiers pas, Système de jeu, Règlement HRP) / `Événements`, et pour le staff `Outils` → `MAÎTRISER UNE PARTIE` / `CRÉATION` / `ADMIN` avec badge des comptes en attente.
- **Les contenus de référence** : synopsis, règlement (parties I–IV, glossaire), système de jeu (tableaux, coûts, paliers, gemmes), comportements des créatures — textes intégraux dans `renderSynopsis`, `renderRegles`, `renderCombat`.
- **La fiche en quatre chapitres** avec navigation interne, la déclaration de consommation avec contexte narratif, le journal partagé, l'historique typé et filtrable, les statuts, l'export PDF.
- **L'agenda** : types d'événements, capacité, participants nommés, états (`Inscriptions ouvertes`, `Vous participez`, `Complet`, `Masqué · staff`), notification à la création.
- **La cloche de notifications** alimentée par l'historique du personnage et par les comptes en attente pour les admins.
- **Les outils MJ comme préparation/arbitrage** (Personnages, Apparitions → Simulation → Archives), les comptes rendus exportables pour Discord (`📋 DISCORD`, `Exporter ce récit`).
- **Les états explicites** (vides, attente, indisponible, hors-ligne, maintenance) et leurs formulations ; la restauration d'onglet après auto-connexion ; `Escape`/`✕` partout ; palette de navigation rapide.
- **Le responsive** : burger sous 1200 px, tiroir avec les mêmes rubriques dans le même ordre, cibles tactiles 44 px, inputs 16 px.

---

## 11. Ce qui relève de la dérive / dette

**Dérive « jeu en ligne » (à supprimer)** :
- Prototype RPG : onglet `rpg-prototype`, 4 entrées de navigation (colophon `index.html:6626`, en-tête `7019`, tiroir `7094`, guide `first-steps.js:102`), hash `#rpg-prototype` (`rpg-prototype.js:181`), ouverture du shell sans session (`rpg-prototype.js:180`), `npResetRpgSession` dans login/logout, la carte du guide **`Un RPG à explorer à part`**.
- Carte du monde dormante (`carte`, `renderCarte`, `LIEU_TYPES`) et l'entrée `carte` dans `TAB_POPUP_IDS`.
- Compteurs d'accueil orientés combat (**`Élèves invoqués`**, **`Créatures vaincues`**, **`Gemmes distribuées`**, `public_stats.creatureKills`) et la prépondérance des « Derniers combats » sur le tableau de bord — à rééquilibrer vers les récits (constat partagé par `gpt-lecture-produit.md:29`).

**Dette de navigation / code mort** :
- `s-pending` jamais affiché ; `renderPendingTab` cible `#t-pending-c` inexistant (`main.js:4592-4625`, référence aussi un `_tab` non défini).
- `historyBack`/`popstate` cherchent `.nav-tab` qui n'existe plus (`5417`, `5637`).
- `switchDropTab` ignore son paramètre `ddId` ; `launchApp` passe `"dd-joueurs"` pour `accueil`.
- Champs cachés obsolètes dans `s-login` (`pl-pseudo`, `pl-pass`, `mj-n`, `mj-p`, `err-p`, `err-s`), `switchLTab`, `loginPlayer/loginStaff`, modale `m-addmj` jamais ouverte.
- Alias `arena`/`stats` dans `switchTab`.
- `renderAccueil` appelle `renderAppearanceSection()` sans conteneur.
- Trois gestionnaires `Escape` indépendants ; deux bannières de service concurrentes (`npSetMaintenanceBanner` et `api-hardening`).
- Nav dropdowns « portées » dans un conteneur fixe pour contourner le z-index — symptôme de l'empilement de correctifs.

**Dette structurelle** :
- 18 scripts de « polish » qui patchent le DOM par `MutationObserver` + `setInterval` (`staff-navigation.js:369-386` toutes les 1,5 s ; `connected-pages-polish.js:491` ; `mobile-polish.js:425`), injectent des `<style>` et renomment des menus après coup (`patchStaffMenuItems`, `patchDrawer`, `patchWarning`) — la navigation finale n'est lisible qu'en exécutant le site.
- Rendu par concaténation de chaînes HTML avec handlers `onclick` inline (CSP `unsafe-inline`, `netlify.toml`), fonctions surchargées plusieurs fois (`renderBGrid` redéfini dans `ui-patches.js`, `beast-admin.js`, `bestiary-admin-pass2.js` ; `switchTab`, `showScreen`, `renderView` enveloppés par `main.js:16552-16855`).
- Absence de routes réelles : écrans publics sans URL, `logout` par `location.reload()`, hash uniquement pour les onglets connectés.
- Les onglets publics par nature (synopsis, serments, bestiaire, système de jeu, événements) sont enfermés dans le shell connecté ; le règlement est dupliqué (`s-hrp` + `reglement`).
- Mentions légales et politique de confidentialité imbriquées dans le règlement (`main.js:8570-8624`).
- Staff « emprunte » le premier personnage du registre comme `pid` (voir Questions ouvertes n° 1).
- Panneau de notifications et tiroir mobile construits avec styles inline massifs ; modale `m-editpass` avec mot de passe en clair (`type="text"`).
