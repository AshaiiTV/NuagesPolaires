# Revue finale — GPT

## Verdict

RÉSERVES IMPORTANTES : 1

La refonte est cohérente, singulière et convaincante comme compagnon de Discord. Une promesse centrale reste manquée : retrouver toutes ses attentes dès le premier écran après une longue absence.

## Résultats des commandes (exacts)

Commandes exécutées dans l’ordre demandé ; toutes terminent avec le code **0**.

| Commande | Résultat |
|---|---|
| `npx svelte-check --tsconfig ./tsconfig.json` | `COMPLETED 1226 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS` |
| `npx vitest run --project server` | `Test Files  58 passed (58)` ; `Tests  981 passed (981)` ; `Duration  112.15s` |
| `npx playwright test` | `Running 131 tests using 1 worker` ; `131 passed (5.1m)` |
| `npm run lint` | `prettier --check . && eslint .` ; `All matched files use Prettier code style!` ; ESLint termine sans erreur. |
| `npm run build` | `✓ 516 modules transformed.` côté serveur ; `✓ 559 modules transformed.` côté client ; `✓ built in 5.86s` ; `Using @sveltejs/adapter-netlify` ; `✔ done`. |
| `npx tsx scripts/check-bundle.ts` | `check-bundle : OK — 549 fichier(s) analysé(s) dans C:\Users\sacha\NuagesPolaires\.netlify\functions-internal, C:\Users\sacha\NuagesPolaires\.netlify\server, C:\Users\sacha\NuagesPolaires\build ; ni PGlite ni seedDemo.` |

Le build émet aussi un avertissement informatif `PLUGIN_TIMINGS` ; Playwright émet des avertissements `NO_COLOR/FORCE_COLOR`. Aucun échec associé.

## Parcours P1–P9

Revue sur **http://localhost:5173**, visiteur et comptes alice, bob, nova, mj, designer, admin, à **390 et 1440 px**. **41 captures produites et effectivement regardées**, avec des vérifications interactives supplémentaires. Les neuf tests nommés P1–P9 de [parcours.e2e.ts](C:/Users/sacha/NuagesPolaires/tests/e2e/parcours.e2e.ts) passent ; leur réussite ne démontre pas tous les critères de la vision.

| Parcours | tenu / partiel / non tenu | Preuve : test, capture, observation |
|---|---|---|
| **P1 — Revenir** | **partiel** | Test : ressources, attentes, corne et marque-page partagé. À la main : corne vers les conséquences et reprise lisible. Mais le retour après 40 jours fait disparaître le rendez-vous du premier écran : [capture](C:/Users/sacha/NuagesPolaires/.claude/captures/revue-finale/interaction-retour-40-jours-390.png). Le test ne prépare ni cette absence ni une assertion de position dans le viewport. |
| **P2 — Jouer une scène** | **partiel** | Test et geste réel : déclaration sans débit de ressources, annulation rayée, copie conforme de trois lignes, règle unique, marque-page proposé sur mobile. [Superposition à 1440](C:/Users/sacha/NuagesPolaires/.claude/captures/revue-finale/interaction-scene-superpose-1440.png) fonctionnelle au clavier. Sur cette version superposée, « Reposer » ferme directement sans proposer le marque-page ; branche non couverte par le test P2. |
| **P3 — Suivre la Table** | **tenu** | Test : trois rounds, dégâts/rature, retard réseau et refus du non-participant. À la main : vue Alice sans commandes de résolution ; coupure réseau avec chiffres conservés et message de retard avant dix secondes ; Bob refusé sur une Table réservée à Alice. Les ennemis sont décrits par leur état narratif. |
| **P4 — Tamponner** | **partiel** | Test et geste réel : +18 XP, motif, auteur/date et corne. Réponse retardée de trois secondes : [attente visible](C:/Users/sacha/NuagesPolaires/.claude/captures/revue-finale/interaction-tampon-attente-1440.png), aucune conséquence annoncée avant confirmation. La correction ordinaire ne produit pas la rature demandée ; l’audit technique ne reprend pas le motif et les valeurs avant/après. Le test vérifie surtout la présence de l’événement d’audit. |
| **P5 — Conduire un round** | **tenu** | Test et session réelle : [dix combattants à 1440](C:/Users/sacha/NuagesPolaires/.claude/captures/revue-finale/interaction-table-dix-1440.png), déclarations/résolution au clavier, annulation, sauvegarde et rechargement. Deux sessions provoquent un conflit explicite, sans écrasement silencieux. Mobile utilisable. L’état combinant dix combattants et bandeau de conflit présente un défaut de cadrage mineur. |
| **P6 — Entrer** | **tenu** | Test et inscription réelle depuis les règles : pseudo en attente, puis liaison administrateur en trois gestes et accès à la fiche. [Fiche après liaison](C:/Users/sacha/NuagesPolaires/.claude/captures/revue-finale/interaction-liaison-fiche-390.png). Nova reçoit une explication et une prochaine action, sans écran vide muet. |
| **P7 — Publier sans divulguer** | **tenu** | Test et publication réelle après tampon : extrait retrouvé à l’accueil et sur la créature. [Publication mobile](C:/Users/sacha/NuagesPolaires/.claude/captures/revue-finale/interaction-publication-390.png). Réponses HTML et `__data.json` inspectées : pas de créature masquée, note MJ, journal d’autrui ni liste de comptes dans les projections joueur/visiteur ; accès directs interdits refusés. |
| **P8 — Vides et refus** | **partiel** | Test des états vides et du brouillon refusé. À la main : interruption d’écriture, aucune réussite fictive, brouillon de note récupéré après rechargement — [capture](C:/Users/sacha/NuagesPolaires/.claude/captures/revue-finale/interaction-note-refusee-390.png). Le brouillon de marque-page reste après le refus immédiat, mais disparaît après rechargement. Ce prolongement et l’ensemble des états vides ne sont pas couverts exhaustivement. |
| **P9 — Lire et agir partout** | **partiel** | Test trois thèmes/trois largeurs. À la main : fiche en neuf combinaisons, changements réels de thème, clavier, mouvement réduit, contraste renforcé et refus d’une couleur invalide. Aucun débordement horizontal sur les pages examinées. Le bouton de nouvelle tentative descend à **2,14:1** dans l’état refusé ; cet état échappe aux contrôles. La matrice complète de toutes les pages et tous leurs états reste non démontrée. |

Les mesures et vérifications complémentaires sont conservées dans [complement.json](C:/Users/sacha/NuagesPolaires/.claude/captures/revue-finale/complement.json). L’absence de 40 jours a été **simulée dans la réponse réseau**, sans modifier la base. Les tests navigateur utilisent le serveur de développement et PGlite : ils ne valident pas une exploitation HTTPS sur Neon.

## Réserves importantes

| # | Où : page, largeur, rôle | Ce que je constate — preuve | Correction précise |
|---|---|---|---|
| **1** | **Carnet, 390 × 844, Alice revenant après 40 jours** | Le message d’absence repousse les attentes. La troisième ligne, le rendez-vous, finit à **y = 900**, alors que la navigation fixe commence à **y = 787** ; elle est absente du premier écran. [Capture](C:/Users/sacha/NuagesPolaires/.claude/captures/revue-finale/interaction-retour-40-jours-390.png). Cela manque précisément P1 : le joueur revenu doit voir ce qui l’attend sans chercher. Le test passant n’exerce pas ce cas. | Dans [carnet/+page.svelte](C:/Users/sacha/NuagesPolaires/src/routes/carnet/+page.svelte), compacter `.absence`, les espacements du marque-page et les lignes `.attend` sur mobile ; éviter que chaque groupe `.gestes` impose une nouvelle rangée quand elle est inutile, tout en conservant les cibles de 44 px. Ajouter au test P1 une absence de 40 jours, trois attentes et un titre long ; vérifier que la dernière action reste entièrement au-dessus de la navigation fixe. |

## Réserves mineures

- **Contraste après refus** : « Noter » en rouille sur ruban clair mesure **2,14:1** ([mesure](C:/Users/sacha/NuagesPolaires/.claude/captures/revue-finale/quality.json)). Dans `src/lib/ui/Bouton.svelte`, faire hériter `.encre.refusee` de la couleur contrastée du bouton ; signaler le refus par le texte et la bordure.
- **Marque-page refusé perdu au rechargement** : dans `src/routes/carnet/+page.svelte`, conserver le brouillon texte/lien par compte et ne l’effacer qu’après confirmation serveur.
- **Reposer sur ordinateur** : dans `src/routes/carnet/scene/+page.svelte`, `basculer()` court-circuite le panneau lorsque `superpose` est vrai ; présenter aussi le marque-page avant fermeture.
- **Conflit avec dix combattants** : [le bas de la liste sort du papier](C:/Users/sacha/NuagesPolaires/.claude/captures/revue-finale/interaction-table-conflit-1440.png). Dans `src/routes/table/combat/[id]/+page.svelte`, donner aussi à `.combattants` un défilement vertical et `min-height: 0` dans le breakpoint large.
- **Correction sans rature** : `Attributions.svelte` ne propose pas de relier une correction à la conséquence remplacée, alors que la fiche exige `replacesId` pour raturer. Ajouter « Corriger cette conséquence » avec cet identifiant ; conserver les simples variations ordinaires sans rature.
- **Audit XP incomplet** : dans `src/lib/server/domain/characters.ts`, `grantCombatXp()` enregistre gain et niveaux dans `recordAudit()`, mais pas motif ni valeurs avant/après. Les ajouter ; le motif existe déjà dans les conséquences et le journal MJ, donc la trace n’est pas perdue.

## Ce qui est réussi

- Le carnet, ses cornes, ses tampons et ses ratures constituent une identité précise ; les pages publiques et les outils MJ appartiennent au même produit.
- La scène superposée et les trois lignes à copier servent concrètement Discord ; aucun reste de boutique, carte explorable ou combat solo trouvé.
- La Table dense demeure lisible avec dix combattants ; sauvegarde, annulation et conflit protègent le travail du MJ.
- Les rôles ont des parcours distincts et honnêtes ; la confidentialité est assurée dans les réponses serveur examinées.
- Les **429 fragments hérités comparés** conservent leurs textes, hors balisage/espacement ; les actions examinées utilisent les règles centralisées. [Comparaison](C:/Users/sacha/NuagesPolaires/.claude/captures/revue-finale/fidelity.json).

## Ce que le propriétaire doit savoir avant la mise en ligne

- P10 reste ouvert : corriger la réserve P1 et faire confirmer la relecture finale par Claude et GPT sur cette version.
- Répéter sur une copie réelle la migration, la restauration d’une sauvegarde et les écritures concurrentes sous HTTPS/Neon ; cette revue locale ne les certifie pas.
- Les quinze divergences connues entre textes historiques et moteur restent des arbitrages du propriétaire documentés ; la refonte ne les a pas tranchées.
- Discord reste optionnel ; OAuth exige sa configuration, et les notifications externes par webhook relèvent de la phase suivante.
- Suivre l’exploitation documentée : maintenance et sauvegarde avant bascule, pas d’écriture simultanée ancien/nouveau site, pas de migration inverse automatique.