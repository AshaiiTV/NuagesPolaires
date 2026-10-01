Implémenté uniquement dans `src/routes/univers`.

Fichiers écrits : layout, sommaire, `pages.ts`, composants locaux `Lecture`, `Sommaire`, `Tourner`, cinq pages de lecture avec leurs loads serveur, liste et détail des Serments, `serments/source.ts`.

Mise en page : double page avec marge collante, sommaire mobile repliable, typographie de carnet, tableaux à défilement interne et paliers entièrement dépliés. Navigation précédente/suivante et flèches clavier sur les Serments.

Vérifications :

- `svelte-check` : code 1, **aucune erreur ni aucun avertissement dans univers**. Une erreur extérieure dans `src/lib/game/combat/abilities.ts:65`, concernant `abilityName` nullable.
- `npm run build` : code 0.
- Capture demandée : code 0, **15 captures**, aucun débordement, texte sous 12 px ou erreur navigateur signalé.

À brancher : le domaine serveur dans `serments/source.ts`, puis le niveau et la branche du lecteur pour le repère « tu es ici ».