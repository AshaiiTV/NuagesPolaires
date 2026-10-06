# Contrôle final — table-3

Note : 7,5/10 (tour 1 : 6,5/10 ; tour 2 : 6,5/10)

La Table tient désormais. Chaque largeur n'a plus qu'un support, et le sommaire est rentré dans la page. Le laiton et la rouille sont revenus sur leurs boutons. Les statuts passent sous le nom, les colonnes tiennent dans 900 px, et le feuillet comme l'archivage portent un tampon daté au motif réel. Le récit composé en Cormorant est la plus belle page de la zone. Une réserve demeure, dans le chapitre 04 de la fiche MJ : chaque archivage imprime des lignes sans changement et des valeurs en double, et après un niveau, du JSON brut. Le séchage de la Résolution, annoncé comme fait, ne se voit pas.

## Défauts du second tour

| # | État | Preuve (capture) |
|---|---|---|
| N1 | corrigé | Une seule marge à 1440, une seule bande à 390, sur les huit pages et aux deux largeurs (s4.json). Un seul sommaire et un seul formulaire de filtres : table-mj-1440, table-apparitions-mj-1440, table-personnages-mj-1440. La fiche s'ouvre sur l'identité : table-personnages-p_demo_aria-mj-1440. |
| N2 | partiel | Le coût est sur la ligne de son action, et les Frappes identiques sont regroupées (« Frappe (4)×2 »). On voit 5 déclarants sur 10, contre 4 au tour précédent (dix-declare-1440). Reste, sous chaque nom, une bande vide de 22 px créée par le bouton « Modifier » de 44 px, et le « ×8 » est collé à la parenthèse : retouche 3. |
| N3 | partiel | Textes réécrits : « Niveau 2 atteint · PV 32 · EP 55 · EM 23 · Palier I — Éveil atteint », « Statuts reportés depuis la Table. Lire le récit → ». Restent le nom du combat répété, les valeurs en double et le JSON (seren-consequences-1440, seren-json-1440) : réserve 1. |
| N4 | corrigé | « TAMPONNER » en laiton #c6b38b (seren-attribuer-1440) et « Rayer ce personnage » en rouille #c9836b (s6.json). |
| N5 | corrigé | Le sommaire est dans la page, sous le titre, et le ruban ne le couvre plus (table-personnages-mj-390, table-personnages-p_demo_aria-mj-390). À 1440, il est dans la marge (table-personnages-mj-1440). Le repère touche encore le ruban : retouche 6. |
| N6 | corrigé | Bande de 116 px : « Tous les personnages · Chapitres », puis « relevé 02:21 · 6 octobre » (table-personnages-p_demo_aria-mj-390). |
| N7 | corrigé (code relu) | SaisieTampon.svelte remet le formulaire à zéro quand `revision` change, et Attributions.svelte remet la créature et les 100 %. Pas rejoué : Seren est désormais relié au compte d'un autre relecteur. |
| N8 | corrigé | Plus aucune « Déclaration de », Plex Mono 13/24 (demo-declare-1440). Les intertitres bruts du moteur restent : retouche 7. |
| N9 | corrigé | « non relié » et « niv. 7 » sont bien espacés (table-personnages-mj-1440, table-personnages-mj-390). `&nbsp;` dans table/+page.svelte, l. 160, et dans EntreeJournal.svelte, l. 12. |
| N10 | corrigé | En-tête « Archivé », suivi du tampon « MJ · 6 OCT. 02:20 », bien espacé. Le tampon de ligne porte « … MOTIF : COMBAT ARCHIVÉ · RIVE DES CENDRES » (dix-archive-1440). |
| N11 | corrigé | Dans le récit, le repère lit « ROUND 1 · RÉSOLU À 02:19 », sans « Combat démarré » ni round vide (recit-rive-1440). Les réécritures « d’ » et « aucun dégât » sont dans texte.ts, mais aucune esquive ni aucun blocage ne s'est produit dans mes rounds. |
| N12 | corrigé | Sceau de 40 px en laiton et « Basique » en laiton sur la fiche (table-personnages-p_demo_aria-mj-1440). Sceaux et signature « MJ · 6 OCT. 02:21 » dans la liste (table-personnages-mj-1440). Effet de bord : le sceau apparaît deux fois, retouche 4. |
| T1 | corrigé | « SAIGNEMENT 2 t. · INSPIRÉ 2 t. » s'écrit en entier sous le nom (statuts-1440). « 6/6 » et « 8/8 » au-delà de cinq actions (dix-declare-1440). |
| T4 | corrigé | Avec « non sauvegardé depuis 02:17 » dans l'en-tête, la page ne défile plus : 900 px de défilement pour 900 px de fenêtre, et les colonnes s'arrêtent à 827 px (demo-declare-1440). |
| T6 | corrigé | La double impression a disparu (voir N1). |
| T7 | corrigé | Le ruban reste ancré en haut sur téléphone après défilement (`position: fixed`, rature-390). La réserve de la bande est donc justifiée. |
| T9 | partiel | La 404 d'une non-participante dit encore « Cette page n’existe pas dans le carnet. » puis « Cette Table n’est pas la tienne. » (s7.json). Dans src/routes/+error.svelte, l. 33 et 36, la comparaison attend l'apostrophe droite, or le message arrive avec « ’ ». Écrire `/^Cette Table n['’]est pas la tienne\.$/.test(precis ?? '')`. |
| T14 | corrigé (sauf la base de démonstration) | On lit « Kael Morvan empoisonné −2 PV (32→30) » et « Round 2 · résolu à 02:26. » (rature-390). L'heure des rounds de démonstration est écrite dans seed.ts, l. 688. Mais la base en mémoire n'a pas été re-semée : la Table de démonstration affiche encore « Round 1 · résolu. ». À revoir après un redémarrage. |

## Propositions réalisées

| Proposition | Réussie / à retoucher | Remarque |
|---|---|---|
| 1. Écrire le récit, pas le journal | réussie | Cormorant 18/28 posé sur la réglure, round en marge à 32 px, repère tamponné en laiton, juste aussi en Papier (recit-rive-1440, recit-lisiere-1440-light). Seuls les chiffres elzéviriens gênent : retouche 2. |
| 2. Faire sécher la Résolution | à retoucher | Invisible. `.recit.humide li` passe bien de #95cdbb à #f0eee5 en 1 200 ms (s1-1440.json), mais `.texte` impose `color: var(--encre)` : le texte reste ivoire du début à la fin (demo-resolu-1440). Retouche 1. |
| 3. Le laiton partout où quelqu'un a décidé | réussie, à retoucher | Tampons inclinés dans la liste, sceau et rang en laiton sur la fiche (table-personnages-mj-1440). Mais le cadre du tampon s'étire sur 180 px pour 17 caractères, et le sceau double le portrait-sceau : retouches 4 et 5. |

## Réserves importantes

| # | Page | Largeur | Défaut (capture) | Correction précise (fichier, sélecteur, valeur) |
|---|---|---|---|---|
| 1 | /table/personnages/<id>, chapitre 04 Conséquences | 1440 (et 390, chapitre déplié) | Après un niveau, on lit `{"max":20}` barré, puis `{"max":23}` : du JSON brut (seren-json-1440). Chaque ligne d'archivage répète sa valeur (« EP : 55 → 43 », puis « ~~55~~ 43 ») ou le nom du combat (« Rive des cendres · 2 rounds · … », puis « Rive des cendres »). Le « 2 rounds » contredit le « 1 round » des Archives. L'archivage tamponne aussi des lignes sans changement : « EM : 23 → 23 » chez Seren, et chez Aria « +0 XP », « PV : 51 → 51 », « EP : 70 → 70 ». Un seul combat imprime donc six entrées tamponnées par participant ; Seren en compte 20, soit 3 220 px (seren-consequences-1440). Ce chapitre est celui que le feuillet annonce (« les conséquences s'impriment sur les fiches ») : le MJ l'ouvre dès son premier archivage. | (a) src/routes/table/personnages/[id]/+page.svelte, l. 378 : ne rendre `<Rature>` que pour une correction, comme la fiche du joueur (carnet/fiche/+page.svelte, l. 237) : `{#if c.replacesId && c.oldValue !== null && c.newValue !== null && c.oldValue !== c.newValue}`. (b) src/lib/server/domain/combats.ts, l. 677 à 694 : n'appeler `stamp` pour PV, EP et EM que si `sheet[`${key}Cur`] !== next[`${key}Cur`]`, pour les statuts que si `JSON.stringify(sheet.statuses) !== JSON.stringify(statuses)`, et pour l'XP que si `consequence.xp > 0`. (c) src/lib/ui/table/texte.ts, l. 40 à 44 : retirer « · n rounds » de `texteConsequence`, qui devient `${titre} · PV ${pv}/${pvMax} · EP ${ep}/${epMax}`, puisque la durée se lit dans le récit lié. |

## Retouches mineures

1. Séchage invisible. Dans src/lib/ui/table/Resolution.svelte, ajouter `.recit.humide li:not(.raye):not(.titre) .texte { color: var(--encre-humide); }` et déplacer `transition: color 1200ms` de `.recit li` vers `.texte`, y compris dans la règle `prefers-reduced-motion`.
2. Chiffres du récit. Dans src/routes/table/archives/[id]/+page.svelte, ajouter `.round li, .numero-round { font-variant-numeric: lining-nums tabular-nums; }`. Aujourd'hui, « −10 PV (10→0) » se lit « -ıo PV (ıo→o) », et la marge alterne « I » et « 2 ».
3. Déclarations. Dans src/lib/ui/table/Declarations.svelte, écrire `.tete > .geste { min-height: 22px; line-height: 22px; position: relative; }` et `.tete > .geste::after { content: ''; position: absolute; inset: -11px 0; }`. La cible reste à 44 px, chaque déclarant gagne 22 px. Écrire aussi `&#8239;×{a.repetitions}`, pour lire « Frappe (18) ×8 ».
4. Sceau doublé. Dans personnages/[id]/+page.svelte, l. 248, entourer le sceau de `{#if sheet.portraitUrl}<span class="sceau">…</span>{/if}` : sans photo, le portrait est déjà le sceau.
5. Tampons étirés. Dans src/routes/table/personnages/+page.svelte, ajouter `justify-items: start;` à `.tampon` (l. 222).
6. Repère sous le ruban à 390. « NP / 06 — LA TABLE · PERSONNAGES » finit à 284 px, et le ruban commence à 276 px (même chose sur Apparitions). Dans src/lib/ui/Page.svelte, sous `@media (max-width: 760px)`, ajouter `.repere.mobile { padding-right: 106px; }`.
7. Journal du combat. Les intertitres du moteur restent bruts : « — Résolution Round 2 — · résolu à 02:18 », « — Round 3 — Déclarations ». Dans src/lib/ui/table/Marge.svelte, l. 18, écarter `/^— Round \d+ — Déclarations/` et réécrire `/^— Résolution Round (\d+) —(?: · résolu à (\d\d:\d\d))?$/` en « Round $1 · résolu à $2 », comme le repère du récit.
8. Archives : on lit « La page de Corbeau d’encre ×3 ». Dans archives/[id]/+page.server.ts, l. 51, garder `nom: g.nom` et ajouter `qty: g.qty` ; n'imprimer `&#8239;×{a.qty}` que dans « À la table ».

## Verdict

Montrable sans réserve importante : non (réserve n° 1). Le chapitre Conséquences de la fiche MJ montre du JSON brut après un niveau et double chaque ligne d'archivage ; trois corrections courtes le règlent, et le reste de la zone peut être montré tel quel.

*Conditions : 20 images lues. Le serveur n'a pas été redémarré depuis le second tour : la base contient encore Gué des saules et Talus aux loups, et les corrections de seed.ts n'y sont pas visibles. Sur c_demo_table_ouverte, je n'ai fait que des gestes locaux (déclarations, Résoudre, Clore, statuts, rature), avec tous les POST bloqués. Rien n'a été sauvegardé. Le cycle complet (démarrage, déclarations, résolution, clôture, feuillet, archivage) a été joué sur une Table ouverte pour l'occasion, « Rive des cendres » (Seren et neuf créatures), archivée à 02:20 : Seren y a gagné +10 XP. Une première tentative, interrompue par mon script, a laissé une seconde « Rive des cendres » ouverte au round 1, avec Seren, à refermer ou à ignorer. Un autre relecteur travaillait en même temps sur le serveur : il a ouvert les Tables « Revue indépendante — … », relié Seren au compte plume-revue-finale et tamponné Aria à 02:21.*
