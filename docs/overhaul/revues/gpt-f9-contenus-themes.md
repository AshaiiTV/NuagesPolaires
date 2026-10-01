Implémentation terminée dans les seuls chemins autorisés.

Fichiers écrits :

- Les cinq Markdown dans `src/content/`.
- `src/lib/content/index.ts` et `index.spec.ts` : chargement, YAML minimal, ancres et HTML brut échappé.
- `src/lib/ui/styles/themes.css`, `themes.ts` et `themes.spec.ts`.

Comptage hors YAML et balisage, apostrophes internes conservées :

| Contenu | Source legacy | Livré |
|---|---:|---:|
| Synopsis | 282 | 282 |
| Règlement | 3 215 | 3 215 |
| Site et données | 1 086 | 1 086 |
| Système de jeu | 2 500 | 2 500 |
| Premiers pas¹ | 687 | 651 |

Les quatre premiers textes sont identiques mot à mot au legacy.  
¹ Guide regroupant les cinq états et variantes : 42 mots retirés concernant le RPG, six mots ajoutés pour les titres des états.

Retraits : carte « Un RPG à explorer à part » et bouton « Découvrir le RPG expérimental ». Aucun passage sur la carte explorable ou la boutique dans ces contenus. Commentaires d’audit exclus.

Contrastes : aucun ajustement nécessaire ; les neuf thèmes passent. `tokens.css` inchangé.

Vérifications :

- Commande Vitest demandée : **12 tests réussis**.
- Avec les tests du contenu : **15 tests réussis**.
- Svelte-check : **aucune erreur dans mes fichiers**. La commande reste en échec sur une erreur hors périmètre : import `./resolve` absent dans `src/lib/game/combat/actions.ts`.