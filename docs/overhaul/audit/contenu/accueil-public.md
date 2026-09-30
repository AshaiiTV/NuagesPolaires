# Accueil public — textes verbatim

Source : `index.html` lignes 6561–6627 (section `#s-home`). Ces textes sont statiques dans le HTML. Les compteurs (`hf-*`) sont alimentés par `updateHomeCounters()` (`assets/js/main.js:2002`).

## Masthead (en-tête)

- Wordmark : `Nuages` / `Polaires` avec la note **LE COMPAGNON** (`index.html:6566`)
- Navigation publique : `L’univers` · `Les Serments` · `Espace joueur ↗`
- Lien d'évitement : `Aller au contenu`

## Hero (`index.html:6576–6592`)

- Image : `./assets/images/nuages-polaires-horizon.jpg` (1672×941), alt : « Un vaste paysage naturel se dessine sous d’immenses nuages blancs, éclairés d’une lueur froide. »
- Eyebrow : **ROLEPLAY TEXTUEL · UNIVERS ORIGINAL**
- Titre : **Nuages** / ***Polaires.***
- Tagline : « Le monde attend. / Votre histoire commence. »
- Description : « Un futur inconnu. Une marque en vous. / Et tout ce qui reste à écrire, ensemble. »
- Bouton primaire : `Rejoindre l’aventure ↗` (→ écran règlement HRP `s-hrp`)
- Bouton discret : `Découvrir l’univers ↓` (scroll vers `#np-univers`)
- Note plateforme : « Une histoire collective, sur Discord. » + lien `Comment commencer ?` (→ `openFirstSteps()`)
- Coordonnée décorative : `NP / 01` — `APRÈS LE BASCULEMENT`
- Légende : « Le monde n’est pas mort. / *Il attend.* »

## Section communauté — compteurs (`index.html:6594–6603`)

- Eyebrow : **LES TRACES DE NOTRE PASSAGE**
- Titre : « Un monde qui s’écrit à plusieurs. »
- Cinq métriques (libellés exacts) :
  - `hf-serments` → **Serments** (= `Object.keys(getAllSD()).length`, `main.js:2027`)
  - `hf-joueurs` → **Élèves invoqués** (= nombre de personnages ; hors connexion `public_stats.players` puis `linkedPlayers`)
  - `hf-creatures` → **Créatures vaincues** (= somme des combattants `type:'beast'` avec `pvCur<=0` dans les archives de combat terminées ; `_countKilledCreaturesFromArchives`, `main.js:1990` ; côté serveur `public_stats.creatureKills`, `db.js:817`)
  - `hf-actifs` → **Actifs cette semaine** (comptes avec `lastSeen` < 7 jours)
  - `hf-gemmes` → **Gemmes distribuées** (= `max(stock de gemmes en inventaire, nombre d'entrées d'historique type "gemme")`, `main.js:2050–2058`)
  - Valeur affichée quand indisponible : `—`

## Section 01 — L’UNIVERS (`index.html:6605–6613`)

- Label de section : `01` **L’UNIVERS**
- Titre : « Tout commence / *après la chute.* »
- Marginal : « Le passé s’est dérobé. / Le reste vous appartient. »
- Texte :

> L’Argonaute a perdu. Le Dimenséa a changé de mains. Alors les nuages ont couvert le ciel, et la réalité s’est pliée.
>
> L’humanité s’éveille dans un futur lointain. Les anciens repères se sont effacés. Un horizon méconnaissable s’étend dans le silence. Parmi les survivants, certains portent une marque intérieure : un **Serment**.
>
> Ce qui reste à écrire dépend de ceux qui se relèvent.

## Section 02 — LES SERMENTS (`index.html:6615–6619`)

- Label de section : `02` **LES SERMENTS**
- Visuel : orbite + emblème `favicon.svg` + mention `LE LIEN · LE CHOIX · LA TRACE`
- Eyebrow : **CE QUI VOUS LIE À CE MONDE**
- Titre : « Une marque. / *Un chemin.* »
- Citation :

> « Nul ne choisit son Serment.
> C’est le Serment qui reconnaît son porteur. »

- Texte :

> Votre Serment grandit à travers vos choix, vos sorties et vos combats. Ici, votre personnage se construit autant dans l’histoire que vous écrivez que dans les pouvoirs qu’il découvre.

- Lien : `Faire le premier pas ↗` (→ `s-hrp`)

## Section invitation (`index.html:6621–6623`)

- Eyebrow : **LA SUITE N’EST PAS ENCORE ÉCRITE**
- Titre : « Laissez votre trace. »
- Texte : « Découvrez les règles, créez votre compte et rejoignez une histoire collective. »
- Bouton : `Commencer l’aventure ↗` (→ `s-hrp`)

## Colophon (`index.html:6626`)

- **NUAGES POLAIRES** — *Le compagnon d’un monde à écrire.*
- Boutons : `Règlement` · `RPG — expérimental ↗` (→ `openRpgPrototype()`; **dérive à supprimer dans l'overhaul**)

## Écran règlement HRP avant inscription (`index.html:6630–6693`)

- Titre : **Nuages Polaires** — sous-titre : « Règlement Hors-Roleplay »
- Contenu : injecté par `renderRegles("hrp-content")` (`main.js:1975`) — voir `reglement-hrp.md`
- Actions : `← Retour` · `J'accepte — Continuer` (→ écran inscription `s-register`)
