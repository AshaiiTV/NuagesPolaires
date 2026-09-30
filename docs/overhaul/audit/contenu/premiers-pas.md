# Premiers pas (guide de départ) — textes verbatim

Source : `assets/js/first-steps.js` (148 lignes). Rendu (1) public sur l'écran `#s-first-steps` (`index.html:6556`, conteneur `#public-first-steps-c`) via `openFirstSteps()` hors connexion, (2) connecté dans l'onglet `#premiers-pas` (`#p-first-steps-c`), et (3) en résumé compact sur le tableau de bord (`renderFirstStepsHome()`, inséré par `renderAccueil`, `main.js:8170`, jamais pour le staff). Styles : `assets/css/first-steps.css`. Le guide ne stocke aucune progression ; il lit l'état de session à chaque rendu.

## États détectés (`state()`, l. 13–28)

| kind | Condition |
|---|---|
| `guest` | pas de `CU` |
| `staff` | rôle ≠ `joueur` |
| `pending` | joueur sans `pid` (compte non lié) |
| `unavailable` | `pid` existant mais fiche introuvable |
| `linked` | fiche trouvée |

## Bloc de statut (`statusCopy`, l. 34–61)

### `pending`
- Label : **Compte créé · liaison à venir**
- Titre : **Ton histoire peut déjà prendre forme.**
- Texte : « Ton compte est bien enregistré. Un administrateur doit maintenant le lier à ton personnage. Transmets-lui ton pseudo de compte sur le serveur Discord ; tu peux déjà lire l’univers, les règles et les serments. »
- Action : `Découvrir les serments` (→ onglet `serments`)
- Complément : « Pseudo à transmettre : **<pseudo>** » ; version complète : « Après la confirmation de l’administrateur, recharge la page pour retrouver ta fiche. » + bouton `La liaison est faite ? Recharger`

### `linked`
- Label : **Personnage lié**
- Titre : **<Nom du personnage>, la suite t’appartient.**
- Texte : « Ta fiche est disponible. Retrouve ton serment, ton équipement et ton journal, puis consulte les événements pour préparer la prochaine aventure. »
- Action : `Ouvrir mon personnage`

### `unavailable`
- Label : **Fiche indisponible**
- Titre : **Retrouvons ton personnage.**
- Texte : « Une liaison existe sur ton compte, mais la fiche n’est pas disponible pour le moment. Recharge la page. Si le problème persiste, indique ton pseudo à un administrateur sur le serveur Discord. »
- Action : `Recharger la page`

### `staff`
- Label : **Repères pour l’équipe**
- Titre : **Accompagner les premiers pas.**
- Texte : « Ce parcours explique l’arrivée d’un joueur. La liaison entre compte et personnage relève d’un administrateur ; tes propres outils restent accessibles dans le menu Outils. »
- Action : `Revenir au tableau de bord`

### `guest`
- Label : **Bienvenue dans Nuages Polaires**
- Titre : **Une place dans une histoire collective.**
- Texte : « Nuages Polaires se joue en roleplay textuel sur Discord. Ce site en est le compagnon : l’univers, les règles, ta fiche et les rendez-vous de l’aventure. »
- Action : `Lire le règlement et rejoindre` ; bouton secondaire (version complète) : `J’ai déjà un compte`

Version compacte (tableau de bord) : bouton unique `Consulter les premiers pas`.

## Page complète (`renderFirstSteps`, l. 86–111)

- Eyebrow : **Le Compagnon / Guide de départ**
- Titre : **Les premiers pas.**
- Sous-titre : « Prendre ses repères, trouver son serment, puis écrire la suite ensemble. »

### Section « Du premier regard au premier récit »
Sous-titre : « Quatre repères pour comprendre le parcours. »

1. **Découvrir le cadre** — « Lis le règlement HRP et le système de jeu. Le synopsis et les serments t’aident à imaginer un personnage qui trouve sa place dans un monde où les constructions ont presque toutes disparu. » Boutons : `Lire le règlement HRP` (+ `Comprendre le système de jeu` si connecté)
2. **Créer ton compte** — « L’inscription vient après la lecture du règlement. Ton compte te permet de te connecter au site ; il ne crée pas automatiquement ta fiche de personnage. » Bouton : `Consulter mon compte` (connecté) ou `Lire le règlement et m’inscrire`
3. **Faire lier ton personnage** — « Échange avec un administrateur sur le serveur Discord et communique ton pseudo de compte. L’administrateur réalise la liaison avec ta fiche. Une fois la liaison confirmée, recharge le site. » Bouton (si lié) : `Retrouver ma fiche`
4. **Préparer ta première aventure** — « Consulte ta fiche et les événements à venir. Lorsqu’un personnage est lié à ton compte et que les inscriptions sont ouvertes, tu peux participer depuis l’agenda. » Bouton (connecté) : `Consulter les événements`

### Section « Trois repères à garder » (aria-label « Bien utiliser le compagnon »)

- ◇ **Une fiche suivie par l’équipe** — « Les statistiques et les récompenses sont gérées par l’équipe selon ses droits. Ton inventaire te permet de déclarer une consommation ; elle retire un exemplaire et conserve une trace dans l’historique, sans appliquer automatiquement ses effets en combat. »
- ≋ **Un journal partagé avec les MJ** — « Le journal de ta fiche est lisible par toi, les maîtres du jeu et les administrateurs. Il accompagne ton personnage et ses aventures ; ce n’est pas un espace de notes réservé à toi seul. »
- ✧ **Un RPG à explorer à part** — « Le RPG est un prototype solo expérimental, avec sa propre progression et son inventaire. Ses récompenses ne sont pas versées sur ta fiche du compagnon. Le multijoueur à distance n’est pas disponible. » + bouton `Découvrir le RPG expérimental` — **carte à supprimer dans l'overhaul (dérive jeu en ligne)**.

### Section « Avant de partir » (FAQ, `<details>`)

- **Mon compte est créé, pourquoi ma fiche est-elle absente ?** — « La création du compte et sa liaison à un personnage sont deux étapes différentes. Tant qu’un administrateur n’a pas effectué la liaison, tu peux consulter le contenu du site, mais ta fiche et l’inscription aux événements nécessitent encore un personnage lié. Si la liaison a été confirmée, recharge la page. »
- **Comment rejoindre le serveur Discord ?** — « Demande le lien d’invitation à l’équipe ou à la personne qui t’a présenté Nuages Polaires. L’inscription sur le site ne rejoint pas automatiquement le serveur. »
- **Qui contacter pour une correction de ma fiche ?** — « Transmets ta demande à l’équipe sur Discord avec ton pseudo et le nom de ton personnage. Un MJ ou un administrateur peut gérer les récompenses selon ses droits ; la liaison du compte et les ajustements de statistiques relèvent d’un administrateur. »

### Pied de page
- « Les liens se tissent dans les récits. »
- Bouton : `Revenir au tableau de bord` (connecté) / `Retour à l’accueil`

## Table de navigation des actions (`npFirstStepsGo`, l. 129–147)

`guide` → openFirstSteps ; `reload` ; `login` → `s-login` ; `register` → `s-hrp` ; `rpg` → openRpgPrototype (dérive) ; hors connexion `rules` → `s-hrp`, `dashboard` → `s-home` ; connecté : `character` → `forceOpenOwnProfile()`, `account` → `openSettings('compte')`, `rules` → onglet `reglement`, `system` → `combat`, `events` → `evenements`, `serments` → `serments`, `dashboard` → `accueil`.
