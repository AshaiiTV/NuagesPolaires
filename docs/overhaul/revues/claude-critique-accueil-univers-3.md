# Contrôle final — accueil-univers-3

Note : 8/10 (tour 1 : 6/10 ; tour 2 : 7/10)

Les trois défauts qui bloquaient sont corrigés et vérifiés à l'image. Sur ordinateur, les tableaux du système, des mentions légales et du règlement se lisent sans coupure ni défilement (0 cadre sur 18). Le calque des Serments a la même mise en page que celui du bestiaire. Les titres longs de chapitre tiennent sur deux lignes qui se suivent. La note de marge du système est enfin rendue. Le sommaire en table des matières et le sceau en filigrane sont réussis. Restent des retouches de finition : l'une des corrections est sans effet (les chiffres d'étape), un tampon tombe à cheval sur le bord du feuillet et un tableau est rogné à 390 px. Aucune n'entame la confiance.

Captures dans `.claude/captures/critique-3/accueil-univers-3/` (23 images lues sur 25). Les autres constats viennent de mesures DOM (`mesures.mjs`).

## Défauts du second tour

| # | État | Preuve (capture) |
|---|---|---|
| N1 (bloquant) | partiel | À 1440, aucun des 15 tableaux du système, des 2 des mentions légales ni de celui du règlement ne défile, et les cellules longues passent à la ligne (u-systeme-1440-tableau, u-site-1440). À 390, un seul tableau reste en défaut : les paliers du chapitre XI, rognés de 12 px, avec « APPROFONDISSEMEN / T » coupé au milieu du mot (u-systeme-390-paliers). Voir la retouche 4. |
| N2 (majeur) | corrigé | `aside.calque` avec filet, retrait, repère « Calque réservé · En vitrine » et Bouton texte. L'interrupteur « Calque » est dans la marge à 1440 et dans la bande à 390 (s-duel-admin-calque-1440, s-duel-admin-calque-390). Reste la case à cocher native bleue (retouche 3). |
| N3 (majeur) | corrigé | « Du premier regard / au premier récit » tient sur deux lignes consécutives. Le h2 mesure 84 px, soit trois réglures sans trou (pp-alice-390-chapitre). |
| N4 | non corrigé | Les numéros se lisent toujours « OI », « O2 », « O3 » (pp-alice-390-chapitre, pp-nova-390). La valeur calculée de `font-variant-numeric` est `normal`, parce que la déclaration est placée avant le raccourci `font:`, qui la remet à zéro (retouche 1). |
| N5 | corrigé | À 390, la légende est entière (y 716 à 769) au-dessus de la bande (y 787), et la coordonnée est masquée (a-390-haut). |
| N6 | corrigé | DOM : « Forêt aux lianes », « Lisière du canyon » dans le menu Zone et sur la fiche du loup. |
| N7 | corrigé | DOM : « Zone » et « Tri » sont en `span.repere` capitales, comme la légende « Comportement ». |
| N8 | corrigé | DOM : `.arrivee::after` vaut `none`, la corne décorative a disparu. |
| N9 | corrigé | DOM : « (total : 16+Niv × 2) », avec une espace de chaque côté du signe. |
| N10 | corrigé | DOM, calque ouvert : « Talus aux loups · 6 octobre ». |
| T3 | corrigé | DOM : pour alice, « Retrouver mon Serment ↗ » mène à /carnet/fiche ; le visiteur garde « Faire le premier pas ↗ ». |
| T4 | corrigé | « 25 SEPT. · PASSÉ », « 8 OCT. · À VENIR », extrait « Rendez-vous passé · vendredi 25 septembre », tampon « MJ · 6 OCT. » sans l'heure (a-1440-feuillets). |
| T5 | corrigé | À 1440, la note est dans la marge du système (u-systeme-1440-haut). À 390, elle est en pied de page (retouche 8). |
| T6 | arbitré | Dessin de la police, hors critique. |

## Propositions réalisées

| Proposition | Résultat | Remarque |
|---|---|---|
| Feuillets : nature écrite en marge | réussie | « PASSÉ », « À VENIR », « RÉCIT » se lisent d'un coup d'œil, à côté de la date (a-1440-feuillets, a-390-feuillets). |
| Feuillets : deux colonnes quand il y en a deux | réussie | La grille fait 300 + 300 px, sans colonne vide. Avec trois feuillets (récit publié pendant la session), elle repasse proprement à trois colonnes (a-1440-light-feuillets). |
| Feuillets : tampon qui mord le bord | à retoucher | Le texte du tampon tombe pile sur le bord. Une moitié des lettres est hors du papier, en laiton sombre `#8a7440` sur le fond nuit, et se lit mal en taille réelle (a-1440-tampon-zoom, a-390-feuillets). Retouche 2. |
| Sceau de 240 px en filigrane | réussie | Trait `--reglure`, discret, sans collision avec le lore (épée et lance vérifiées), masqué à 390 à juste titre (s-duel-1440-haut, s-traqueur-1440-haut). La normalisation des tracés n'a pas été faite (sceaux.ts intact), mais à 20 px la liste reste lisible (s-liste-1440). |
| Sommaire en table des matières | réussie | Points de conduite et numéros en Cormorant 32 reportés à droite : la page dit « livre » à 1440 comme à 390 (u-univers-1440, u-univers-390). Les points sont presque invisibles et le résumé est en Manrope penché (retouche 6). |

## Réserves importantes

Aucune.

## Retouches mineures

1. **Premiers pas, chiffres d'étape (N4).** Dans `src/routes/univers/premiers-pas/+page.svelte`, sous `.rang`, déplacer `font-variant-numeric: lining-nums tabular-nums;` après `font: 400 32px / var(--ligne) var(--voix);`.
2. **Accueil, tampon des feuillets.** Dans `src/lib/ui/Feuillet.svelte`, remplacer `footer { translate: 0 50%; }` par `translate: 0 9px;`. Le texte du tampon reste alors sur le papier et seul son cadre bas mord le bord.
3. **Serment (admin), interrupteur Calque.** Dans `src/routes/univers/serments/[nom]/+page.svelte`, ajouter `.interrupteur input { accent-color: var(--encre-humide); width: 18px; height: 18px; }`, comme dans bestiaire/[id] l. 151-155. La case native est aujourd'hui bleue (s-duel-admin-calque-1440).
4. **Système à 390, tableau des paliers (XI).** Dans `src/routes/univers/Lecture.svelte`, sous `@media (max-width: 760px)`, ajouter `.lecture :global(td) { overflow-wrap: anywhere; hyphens: auto; }`. Le tableau tient alors dans 358 px et le mot se coupe avec un trait d'union (le `lang="fr"` est déjà posé).
5. **Page d'erreur d'un Serment inconnu.** « Cette page n'existe pas dans le carnet. » s'affiche deux fois (err-390). Dans `src/routes/+error.svelte`, ajouter `'Cette page n’existe pas dans le carnet.'` à `GENERIQUES`.
6. **Sommaire de L'univers.** Dans `src/routes/univers/+page.svelte`, écrire `.resume { font: italic 400 18px / var(--ligne) var(--voix); }` pour avoir le vrai italique de Cormorant au lieu du Manrope penché, et `.conduite { border-bottom-color: var(--encre-grise); }` pour que les points de conduite se voient.
7. **Premiers pas (nova).** « Recharger cette page » apparaît deux fois, dans le bloc d'arrivée et à l'étape 03 (pp-nova-390). Dans `src/routes/univers/premiers-pas/+page.svelte`, l. 216, passer `null` à l'étape 03 au lieu de `liens3`, puisque le bloc d'arrivée porte déjà ce bouton dans les deux états concernés.
8. **Système à 390, note « Valeurs appliquées à la Table ».** Elle n'arrive qu'en pied de page, après 18 800 px. Dans `src/routes/univers/Lecture.svelte`, déplacer le `<NoteDeMarge>` du snippet `pied()` dans le snippet `bande()`, sous le chapeau.

## Verdict

Montrable sans réserve importante : oui. Les défauts bloquants et majeurs du second tour sont réglés à l'image, et il ne reste que huit retouches de finition, dont deux lignes de CSS pour les chiffres d'étape et le tampon.
