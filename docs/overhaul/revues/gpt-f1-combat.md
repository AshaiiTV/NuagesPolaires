Livré dans les seuls chemins autorisés, sans git ni installation.

Fichiers écrits : `combat/{types,state,actions,statuses,abilities,resolve,outcomes,projection,legacy,index,combat.spec}.ts`, `rules.ts` et `rules.spec.ts`.

Tous les exports demandés sont disponibles dans `combat/index.ts`. Le moteur est pur et déterministe, avec état JSON `schemaVersion: 2`, snapshots d’annulation, outcomes excluant les invocations et projection joueur filtrée. Les drops disposent aussi de `rollDrop` et `assignDrop`.

Vérifications finales :

- `npx vitest run --project server src/lib/game` : **code 0 — 6 fichiers réussis, 222 tests réussis**.
- `npx svelte-check --tsconfig ./tsconfig.json` : **code 0 — 878 fichiers, 0 erreur, 0 avertissement**.

`RULE_DIVERGENCES` documente : initiative choisie par le MJ ; déclarations puis résolution ; Parer gratuit ; Bloquer joueur à 5 EP/−50 % ; Pugilat à 4+niveau ; absence de Tir, d’invocation du Serment et d’actions d’objet ; déplacement narratif ; actions exécutées malgré l’épuisement EP ; absence de surcadençage ; posture persistante ; compteur élémentaire réinitialisé et coûts Foudre/Eau 6/4 EM ; invocations sans consommation EM du porteur ; bouton « repos court » retirant de l’EP.

Aucune règle bloquante ne reste à trancher : le simulateur fait foi. Les intentions suivantes restent toutefois inconnues :

- effets spécifiques de Bretteur, Lame d’Honneur et descriptions personnalisées : fallback legacy conservé (`legacy/assets/js/main.js:11705-11707`) ;
- sens du repos court qui retire de l’EP (`legacy/assets/js/main.js:13732`).

Limites connues : historique d’annulation limité à 30 rounds ; journaux legacy libres conservés côté MJ mais exclus de la projection par précaution ; paliers textuels interprétés par les heuristiques legacy. La persistance, l’application des récompenses aux fiches et les autorisations serveur restent à la couche domaine.