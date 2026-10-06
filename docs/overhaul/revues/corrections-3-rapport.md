# Corrections-3 — rapport d’intégration

6 octobre 2026, branche `overhaul`. Les cinq relectures et `03-vision.md` ont été lus intégralement. Travail réalisé par un seul intégrateur, sans commit, stash, installation ni dépendance nouvelle. Les contenus du propriétaire, le moteur `src/lib/game/combat/*` et `sceaux.ts` sont intacts. Aucun nom de fonction exportée ou de champ de vue existant n’a été renommé.

Les réserves importantes ont été traitées avant les finitions. La revue GPT ne signalait aucune fuite de données : P7 était tenu. Les protections serveur existantes restent exercées par les tests de rôles, projections et accès directs.

## `gpt-revue-finale.md`

| Point | État | Correction ou vérification |
|---|---|---|
| Réserve importante 1 : retour après 40 jours | corrigé | Carnet mobile : absence, marque-page et attentes compactés ; les actions qui n’exigent pas une seconde rangée restent sur leur ligne. P1 simule 40 jours, trois attentes et un long titre ; la dernière action doit tenir entièrement au-dessus de la navigation fixe et mesurer au moins 44 px. |
| Mineure : contraste après refus | corrigé | `Bouton.svelte` laisse `.encre.refusee` hériter de la couleur du bouton. Contraste du texte réellement calculé après un refus réseau, dans les trois thèmes : assertion ≥ 4,5:1. |
| Mineure : marque-page perdu au rechargement | corrigé | Brouillon texte/lien conservé dans le navigateur par pseudo ; suppression après confirmation serveur uniquement. Test du refus, du rechargement et de la réussite suivante. |
| Mineure : Reposer sur ordinateur | corrigé | Le feuillet superposé propose le marque-page avant de se fermer. Le test P2 couvre aussi cette branche. |
| Mineure : conflit avec dix combattants | corrigé | `.combattants` reçoit `overflow-y: auto` et `min-height: 0` dans la composition large. Les colonnes conservent leur hauteur disponible quand le bandeau de conflit apparaît. |
| Mineure : correction sans rature | corrigé | Le formulaire propose « Corriger cette conséquence » avec `replacesId`. Une variation ordinaire ne rature rien ; le remplacement explicite rature l’ancienne valeur sur les fiches MJ et joueur. P4 vérifie les deux cas. |
| Mineure : audit XP incomplet | corrigé | `grantCombatXp()` trace le motif, le niveau et l’XP avant/après. Assertions serveur, puis vérification de leur présentation dans le journal d’audit par P4. |
| P1 partiel | corrigé | Cas d’absence et position dans le premier écran ajoutés au test, sans retirer les contrôles de cornes et de reprise sur deux appareils. |
| P2 partiel | corrigé | Marque-page proposé aussi sur ordinateur, envoi puis retour à la page d’origine vérifiés. |
| P4 partiel | corrigé | Variation sans rature, remplacement avec rature et audit détaillé vérifiés, en conservant le délai réseau et l’absence de confirmation anticipée. |
| P8 partiel | corrigé | Persistance du marque-page après refus/rechargement ajoutée. Un carnet neuf couvre absence de scène, notes, récits et faits vides ; décisions MJ vierges, recherche d’audit sans résultat et agenda vide sont aussi contrôlés. Les autres tests existants couvrent les vides des personnages, comptes, créatures et archives ainsi que le refus de note. |
| P9 partiel | corrigé | Matrice étendue à 50 combinaisons route/rôle, chacune à 390/768/1440 et dans les trois thèmes : 450 contrôles de largeur, police, cibles et contraste des encres principales. Les contrôles existants de clavier, mouvement réduit, contraste renforcé et refus de thème restent présents. Le refus de marque-page est vérifié dans trois thèmes. |

La matrice étendue a aussi révélé des cibles trop petites : « Rayer » dans le journal, titres des listes Tables/Archives et filtres de conséquences MJ. Elles ont été agrandies à 44 px. Les thèmes sont changés par leurs attributs dans la matrice ; P9 et le test du refus exercent également les changements réellement enregistrés dans la collection. Le contrôle statique des raccourcis `font:` a été étendu aux composants partagés et aux pages du produit : nombres alignés et tabulaires rétablis après chaque raccourci ; seuls les grands jours de l’agenda et numéros de marge expressément arbitrés restent elzéviriens.

## `claude-critique-carnet-3.md`

| Point | État | Correction ou vérification |
|---|---|---|
| Réserve importante 1 : deux sceaux imprimables | corrigé | Le Portrait n’est rendu que si `portraitUrl` existe. Sans photo, le sceau de 76 px reste seul, à l’écran et sous `media: print`. Assertions DOM et quatre captures regardées. |
| Retouche 1 : navigation débordant du feuillet | corrigé | `.superposition :global(.feuille.volant) { margin-right: 0; }`. Bord droit vérifié sur la capture de la scène rechargée. |
| Retouche 2 : ouverture directe/rechargement sur le vide | corrigé | À partir de 761 px, ouverture directe sur le carnet puis superposition. L’import du composant est aussi rétabli si l’état de superposition survit au rechargement. Test de la page dessous, du rechargement et d’Échap. |
| Retouche 3 : numéro et tampon de round | corrigé selon arbitrage C | Le tampon n’apparaît que si l’heure de résolution existe. Les grands numéros de marge gardent les chiffres elzéviriens en Cormorant, conformément au lead ; les nombres des lignes du récit sont alignés et tabulaires. La demande de chiffres alignés pour la marge n’est donc pas appliquée. |
| Retouche 4 : voix du moteur | corrigé | Ajout de `voixRecit()` pour « frappe » et « déclare », appliqué au récit joueur ; projection et moteur intacts. |
| Retouche 5 : déclaration répétée sur la Table joueur | corrigé | Filtrage de `Déclaration de :` avant affichage. |
| Retouche 6 : « Joueur » dans Actions et coûts | corrigé avec ajustement | Les conditions réservées au joueur sont rendues vides dans cette carte déjà filtrée. `conditions: ''` remplace le `undefined` proposé : `ActionRule.conditions` est un champ obligatoire de type `string`, et `undefined` provoquait une erreur de typage. |
| Retouche 7 : bouton refusé peu lisible | corrigé | Même correction et même test de contraste que la réserve mineure GPT. |
| Retouche 8 : marque-page absent de Reposer | corrigé | Sortie anticipée supprimée. La relecture du feuillet utilise des données fraîches sans invalider l’état de navigation superficielle ; les actions ne ferment plus prématurément la superposition. |
| Proposition « sceau comme visage » à retoucher | corrigé | Doublon imprimable retiré ; icônes utiles conservées. |
| Proposition « récit » à retoucher | corrigé selon arbitrage C | Voix du récit, tampon conditionnel et nombres des lignes corrigés ; grands numéros de marge conservés selon le lead. |
| Second tour N1–N12, T6 et T12 | déjà corrigé | Aucun de ces points n’était partiel, non corrigé ou en régression dans cette source. Les parcours de carnet, fiche, journal et scène restent dans la suite complète. |

## `claude-critique-table-3.md`

| Point | État | Correction ou vérification |
|---|---|---|
| Réserve importante 1 : JSON, répétitions et conséquences sans changement | corrigé | Rature MJ seulement avec `replacesId`, deux valeurs différentes et aucune valeur JSON. L’archivage ne tamponne PV/EP/EM, maxima, statuts, niveau et objets que lors d’un changement ; XP seulement si positive. La ligne de résumé supplémentaire a été retirée. Le récit reste accessible. |
| Réserve 1 / arbitrage A : combat sans changement | corrigé et testé au serveur | Le test archive deux participants avec les mêmes ressources et aucune XP, conserve un statut existant avec ses métadonnées et un objet déjà présent, puis exige zéro entrée de conséquence en base, sur la fiche joueur et dans son export. Le récit existe toujours. |
| Réserve 1 : « n rounds », « +0 XP », « EM : 23 → 23 » | corrigé | `texteConsequence()` retire la durée du résumé hérité. Le feuillet affiche « Aucune XP à reporter. » et une seule valeur pour une ressource inchangée. Les projections fiche/impression ne reçoivent plus de nouvelles conséquences vides ; assertions serveur et navigateur. |
| Retouche 1 : séchage invisible | corrigé | La couleur humide cible `.texte`, puis transition de couleur de 1 200 ms à la clôture. Sous mouvement réduit : aucune transition. Tests des couleurs calculées humide/sèche et de la durée nulle ; captures avant/après aux deux largeurs. |
| Retouche 2 : chiffres du récit | corrigé selon arbitrage C | `lining-nums tabular-nums` après les raccourcis `font:` sur les lignes ; grands numéros de round en marge conservés elzéviriens. |
| Retouche 3 : déclarations trop hautes et × collé | corrigé | En-tête compacté ; bouton Modifier à 22 px visuels avec extension de cible de 11 px en haut et en bas. Espace fine insécable avant ×. La cible effective reste de 44 px. |
| Retouche 4 : sceau MJ doublé | corrigé | Sceau secondaire seulement si une photo existe ; sans photo, le Portrait porte déjà le sceau. |
| Retouche 5 : tampons étirés | corrigé | `justify-items: start` dans la liste des personnages. |
| Retouche 6 : repère sous le ruban | corrigé | Repère mobile avec `padding-right: 106px`. |
| Retouche 7 : intertitres bruts | corrigé | Intertitres de déclarations écartés ; résolutions réécrites en « Round n · résolu à HH:MM », ou « Round n · résolu » sans heure disponible. |
| Retouche 8 : quantité dans le nom de la page de créature | corrigé | Nom sans quantité et champ `qty` ajouté à la vue Archives ; ×n seulement dans « À la table ». |
| Second tour N2 partiel | corrigé | Retouche 3. |
| Second tour N3 partiel | corrigé | Réserve importante 1. |
| Second tour T9 partiel | corrigé | Page d’erreur : comparaison acceptant les apostrophes droite et typographique. Une seule phrase pour une Table qui n’est pas la tienne ; message serveur intact. |
| Second tour T14, semis | déjà corrigé dans le code | Heures de rounds déjà présentes dans `seed.ts`. Elles nécessitent un nouveau semis ; aucun changement du mécanisme. |
| Proposition « Résolution » à retoucher | corrigé | Retouche 1, y compris le mouvement réduit. |
| Proposition « laiton » à retoucher | corrigé | Retouches 4 et 5. |

## `claude-critique-entree-agenda-registre-3.md`

| Point | État | Correction ou vérification |
|---|---|---|
| Réserves importantes | déjà corrigé | La source n’en relevait aucune. |
| Retouche 1 : heure répétée | corrigé selon arbitrage F | Heure conservée seulement dans le tampon ; colonne d’heure retirée de la vue Décisions et heures retirées de son texte. La proposition inverse de Claude n’est pas appliquée, conformément au lead. Assertion d’une seule heure par ligne, sans `<time>`, sur des décisions réellement écrites pour les captures. |
| Retouche 2 : détails bruts et motifs abîmés | corrigé | Crochets remplacés par une séparation, espace fine avant %, normalisation réservée aux slugs complets ; traits d’union des motifs conservés. |
| Retouche 3 : identifiants et doublon dans l’audit | corrigé | Noms des personnages et thèmes résolus côté serveur ; `zoneId` présenté par `nomZone()` ; détail égal au récit non répété. Motif et valeurs XP avant/après deviennent lisibles. |
| Retouche 4 : Serments de l’Atelier | corrigé | Suppression du span vide pour les Serments d’origine ; mention uniquement pour les ajouts. |
| Retouche 5 : aperçu de Serment | corrigé | `.edition { margin-top: var(--ligne); }`, retour à la ligne avant la frappe. |
| Retouche 6 : filtres d’audit mobile | corrigé | Formulaire et export dans « Filtrer, exporter », repliable sur téléphone. Présentation directe conservée sur ordinateur. Identifiants distincts pour les deux supports ; le test clique le libellé mobile, vérifie le focus puis soumet le filtre. |
| Retouche 7 : étiquettes bestiaire | corrigé | Bas de casse, 13/20, espacement normal, `--encre-2`. |
| Proposition « décisions en tampons » à retoucher | corrigé | Retouches 1 et 2 ; images à 1440 et 390 regardées. |
| Second tour 1–12 | déjà corrigé | Aucun partiel/non corrigé/régression. Pour le point 5, les comportements corrigés du semis nécessitent une nouvelle base de démonstration. |

## `claude-critique-accueil-univers-3.md`

| Point | État | Correction ou vérification |
|---|---|---|
| Réserves importantes | déjà corrigé | La source n’en relevait aucune. |
| Retouche 1 : chiffres d’étape | corrigé | `font-variant-numeric: lining-nums tabular-nums` après `font:`. Valeur calculée vérifiée et captures regardées. |
| Retouche 2 : tampon des feuillets | corrigé | `translate: 0 9px`. Les images ont montré que la marge négative faisait encore déborder les lettres ; elle a été réduite de 8 px, à −16 px sur ordinateur et −12 px sur téléphone. Texte désormais sur le papier, cadre au bord. |
| Retouche 3 : interrupteur Calque | corrigé | Accent encre humide, 18 × 18 px ; le libellé conserve la cible d’interaction. |
| Retouche 4 : tableau des paliers | corrigé avec complément | `overflow-wrap: anywhere` et `hyphens: auto` sur les cellules mobiles, y compris `th` : la demande limitée à `td` ne corrigeait pas l’en-tête long signalé. |
| Retouche 5 : erreur répétée | corrigé | Les deux graphies d’apostrophe de la phrase générique sont reconnues. Une seule phrase pour un Serment inconnu. |
| Retouche 6 : sommaire de L’univers | corrigé | Résumé en vrai Cormorant italique 18 px ; points de conduite en `--encre-grise`. Grands numéros de marge conservés selon C. |
| Retouche 7 : deux rechargements pour nova | corrigé | Étape 03 sans lien supplémentaire ; le bouton du bloc d’arrivée reste disponible. |
| Retouche 8 : note du Système trop tardive | corrigé | Note déplacée dans la bande mobile sous le chapeau ; reste dans la marge sur ordinateur. |
| Second tour N1 partiel | corrigé | Retouche 4, matrice de largeur et tests existants des tableaux. |
| Second tour N4 non corrigé | corrigé | Retouche 1 avec contrôle du style calculé après raccourci. |
| Proposition « tampon mordant le bord » à retoucher | corrigé | Retouche 2, vérifiée à l’image aux deux largeurs. |

## Vérifications obligatoires

Les résultats définitifs sont consignés ci-dessous ; journaux complets dans `.claude/captures/corrections-3/verification/`.

| Commande | Résultat exact | Code |
|---|---|---|
| `npx svelte-check --tsconfig ./tsconfig.json` | `COMPLETED 1227 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS` | 0 |
| `npx vitest run --project server` | `Test Files  58 passed (58)` ; `Tests  982 passed (982)` ; `Duration  109.44s (transform 12.48s, setup 0ms, import 53.76s, tests 628.91s, environment 25ms)` | 0 |
| `npx playwright test` | `Running 139 tests using 1 worker` ; `139 passed (5.9m)` | 0 |
| `npm run lint` | `prettier --check . && eslint .` ; `Checking formatting...` ; `All matched files use Prettier code style!` ; ESLint termine sans erreur | 0 |
| `npm run build` | `✓ 516 modules transformed.` serveur ; `✓ 559 modules transformed.` client ; `✓ built in 1.39s` client ; `✓ built in 5.75s` serveur ; `Using @sveltejs/adapter-netlify` ; `✔ done` | 0 |
| `npx tsx scripts/check-bundle.ts` | `check-bundle : OK — 549 fichier(s) analysé(s) dans C:\Users\sacha\NuagesPolaires\.netlify\functions-internal, C:\Users\sacha\NuagesPolaires\.netlify\server, C:\Users\sacha\NuagesPolaires\build ; ni PGlite ni seedDemo.` | 0 |

`git diff --check` passe. Le contrôle UTF-8 des 100 fichiers modifiés ou ajoutés ne trouve aucun U+FFFD. Le diff est vide pour les contenus propriétaires, le moteur de combat, `sceaux.ts`, `package.json` et `package-lock.json`.

Le build émet l’avertissement informatif `PLUGIN_TIMINGS` ; Playwright émet des avertissements `NO_COLOR/FORCE_COLOR`. Aucun échec associé. Le premier passage complet Playwright avait donné `138 passed (6.6m)` et un échec : un ancien test exigeait une rature pour une variation ordinaire. Ce test vérifie maintenant la variation sans rature puis son remplacement explicite avec rature ; les critères ne sont pas affaiblis. Le passage complet définitif est vert.

## Captures regardées

19 captures dans `.claude/captures/corrections-3/`, hors `test-results/`. La Résolution a été capturée après une frappe effective, pas après un round vide ; les décisions ont été écrites avant leur capture pour éviter une vérification vacue.

| Écran | 1440 px | 390 px |
|---|---|---|
| Fiche MJ, chapitre 04 | `fiche-mj-chapitre-04-1440.png` | `fiche-mj-chapitre-04-390.png` |
| Feuille imprimable, écran | `feuille-imprimable-1440.png` | `feuille-imprimable-390.png` |
| Feuille imprimable, média impression | `feuille-imprimable-print-1440.png` | `feuille-imprimable-print-390.png` |
| Décisions des MJ | `decisions-mj-1440.png` | `decisions-mj-390.png` |
| Résolution humide | `resolution-humide-1440.png` | `resolution-humide-390.png` |
| Résolution sèche | `resolution-seche-1440.png` | `resolution-seche-390.png` |
| Feuillet Conséquences | `feuillet-consequences-1440.png` | `feuillet-consequences-390.png` |
| Feuillets de l’accueil | `accueil-feuillets-1440.png` | `accueil-feuillets-390.png` |
| Premiers pas | `premiers-pas-1440.png` | `premiers-pas-390.png` |
| Scène directe puis rechargée | `scene-rechargee-1440.png` | Le parcours mobile est couvert par P2. |

## Ce qui reste

Aucune réserve de produit recensée dans ces cinq sources n’est laissée sans traitement. Les demandes divergentes ont été résolues par les arbitrages du lead ou par les contraintes TypeScript, avec raisons ci-dessus.

Le lead doit relancer son serveur de développement avec un nouveau semis pour voir les heures de rounds et comportements déjà corrigés dans `seed.ts`. Les tests utilisent leur propre semis neuf ; le mécanisme n’a pas été modifié. Les lignes historiques déjà archivées ne sont pas réécrites en base.

P10 reste une relecture indépendante à faire confirmer sur cette version. Les vérifications locales ne certifient pas une exploitation HTTPS/Neon, une restauration de sauvegarde ni toutes les combinaisons possibles d’états dynamiques. Les quinze arbitrages historiques texte/moteur et la configuration Discord restent hors de ce paquet.
