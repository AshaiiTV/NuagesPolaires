# Contrôle final — carnet-3

Note : 8/10 (tour 1 : 6,5/10 ; tour 2 : 7/10)

Les douze défauts du second tour sont corrigés, preuves à l'appui. L'encre se lit dans les boutons sauge (10,9:1 dans le thème de nuit, 5,7:1 en Papier), la fiche ne répète plus ses changements, le récit n'a plus d'émoji, les trois lignes à traiter tiennent à 390 px et une correction garde la date de l'entrée. La vraie réussite du tour est le feuillet posé par-dessus la page : à 1440 px, Dernières pages reste visible sous le feuillet, assombrie, et Reposer rend la page. Le sceau en guise de portrait donne enfin un visage au carnet, mais il a créé un doublon : la feuille imprimable montre deux sceaux identiques côte à côte en tête. Le récit est mieux composé, mais il ne parle pas encore avec la voix du carnet.

## Défauts du second tour

| # | État | Preuve (capture) |
|---|---|---|
| N1 | corrigé | « Oui, je le note. » s'écrit à l'encre sombre sur la sauge : rgb(16,35,39) sur rgb(198,216,196), soit 10,85:1 dans le thème de nuit et 5,65:1 en Papier (etat-fiche-consommer-1440.png, mesures.mjs couleurs). Le « Noter » du journal passe au sombre après le séchage de 1,2 s. |
| N2 | corrigé | Une seule formulation par ligne : « PV : 66 → 51. », « +70 XP — … », sans rature parasite (etat-fiche-bas-1440.png). |
| N3 | corrigé | Plus d'émoji. Les « Déclaration de : … » sont retirés du récit, et l'export .txt passe par `getRecit`, donc il est nettoyé aussi. « Participants » est à 28 px du dernier round (carnet-recits-c_demo_lisiere-alice-1440.png). |
| N4 | corrigé | Les trois lignes se voient sans défiler. Le geste du rendez-vous finit vers 772 px, la bande basse commence à 787 px. Les deux gestes de la scène tiennent sur une ligne (carnet-alice-390.png). |
| N5 | corrigé | L'entrée affiche « 4 OCT. 22:00 · notée en scène · corrigée le 6 oct., 01:07 », la rature en dessous (etat-journal-brouillon-390.png). Dernières pages écrit « Ta note du 4 octobre ». La note de marge suit `corriger:${r.id}`, l'identifiant de la première version (journal l.202, l.272). |
| N6 | corrigé | La bande se lit en entier : « TABLE · #aux-racines-de-la-… · 02:17 » (carnet-table-c_demo_table_ouverte-alice-390.png). En état replié, la barre ne garde que « Mon carnet » et « Ouvrir le salon ↗ ». |
| N7 | corrigé | Le panneau est bordé et son ombre monte vers le haut : il se lit comme une feuille posée (etat-scene-regle-390.png). Reposer n'a plus qu'un titre, « Reposer le feuillet », et « Où j'en suis » reste au seul champ. |
| N8 | corrigé | Huit lignes, toutes des actions de joueur : Frappe, Pugilat, Esquive, Bloquer, Parer, Subit, Déplacement, Soin. Plus de règle de créature ni d'autre Serment (etat-scene-regle-390.png). |
| N9 | corrigé | Le rang est en laiton rgb(198,179,139) sur Dernières pages, à 390 comme à 1440, et dans l'en-tête imprimable (carnet-alice-1440.png, carnet-fiche-imprimer-alice-1440.png). |
| N10 | corrigé | Plus de bulle native. La note de marge dit « Ce lien ne mène pas à une image http(s). Ton portrait n'a pas changé. » (etat-fiche-portrait-390.png). Le « Noter » refusé reste peu lisible : voir la retouche 7. |
| N11 | corrigé | Sur la fiche, Branche occupe deux colonnes, et « Branche A — L'Élan Tranchant » tient sur une ligne (etat-fiche-consommer-1440.png). À l'impression, la grille passe à deux colonnes et « Épée moyenne du serment » tient sur une ligne. |
| N12 | corrigé | En bas de la fiche, le sommaire désigne « 04 Conséquences », que l'on descende à la molette ou avec la touche Fin (etat-fiche-bas-1440.png). |
| T6 | corrigé | Même correction que N1. |
| T12 | corrigé | La ponctuation est la même partout : « MJ · 3 OCT. 22:00 », « toi · 23 sept. 22:00 ». Les heures varient (21:47). Le pseudo « mj » est gardé, comme l'intégrateur l'a choisi. |

## Propositions réalisées

| Proposition | Verdict | Remarque |
|---|---|---|
| Le sceau comme visage du personnage | à retoucher | Réussi sur /carnet, la fiche, /compte, /plus et en tête du feuillet : laiton, cercle pointillé, sceau de 24 px devant « Duelliste ». Mais la feuille imprimable montre maintenant deux sceaux identiques côte à côte (réserve n° 1). |
| Le feuillet vraiment volant sur ordinateur | réussie | Le feuillet se pose sur /carnet ou sur la fiche, la page dessous est assombrie à 40 % et inerte, et Reposer ou Échap rendent la page. Trois retouches : la marge de navigation dépasse à droite, un rechargement retombe sur le vide, et le marque-page disparaît de Reposer (retouches 1, 2 et 8). |
| Que le récit se lise comme un récit | à retoucher | Cormorant 18/28, chiffres de marge et tampons de round : la page est enfin composée. Mais elle parle encore comme le moteur (« Aria Lunval → Vouivre du canyon : impact »), et le « 1 » de Cormorant se lit « I » à côté de « ROUND 1 » (retouches 3 et 4). |

## Réserves importantes

| # | Page | Largeur | Défaut (capture) | Correction précise |
|---|---|---|---|---|
| 1 | /carnet/fiche/imprimer (et le PDF exporté) | 1440 et 390, à l'écran comme à l'impression (`media: print`) | En tête, le sceau nu de 76 px (l.76) côtoie le Portrait, qui, sans image, affiche maintenant le même sceau dans un carré de 104 px. On voit deux épées cerclées identiques côte à côte, en tête du document que le joueur exporte et partage (carnet-fiche-imprimer-alice-1440.png). | src/routes/carnet/fiche/imprimer/+page.svelte l.77-84 : entourer `<div class="portrait">…</div>` de `{#if fiche.portraitUrl}…{/if}`. Sans portrait, le sceau de 76 px reste seul. Sur la fiche, le sceau de 40 px devant « Duelliste » peut rester : il sert d'icône, comme sur /carnet. |

## Retouches mineures

1. À 1440 px, la marge de navigation dépasse de 22 px à droite du feuillet superposé, de x 1376 à x 1398 (carnet-scene-superpose-alice-1440.png, carnet-scene-superpose-bob-1440-light.png). Correction : src/routes/+layout.svelte, `.superposition :global(.feuille.volant) { margin-right: 0; }`, ce qui porte le bord droit à 1408 px.
2. Quand on ouvre ou recharge /carnet/scene directement à 761 px ou plus, le feuillet flotte encore sur le vide (carnet-scene-alice-1440.png). Correction : dans le `onMount` de +layout.svelte, si `page.url.pathname === chemin('/carnet/scene') && innerWidth >= 761 && !page.state.feuillet`, faire `await goto(chemin('/carnet'), { replaceState: true })`, puis le même `preloadData` et `pushState` que dans `ouvrir`.
3. Dans le récit, le « 1 » de Cormorant (chiffre elzévirien) se lit « I ». Le tampon « ROUND 1 » répète le chiffre quand le round n'a pas d'heure de résolution (carnet-recits-c_demo_lisiere-alice-390.png). Correction : recits/[id]/+page.svelte, `.numero-round { font-variant-numeric: lining-nums; }` et `{#if r.resolution}<Tampon …>Résolu à {r.resolution}</Tampon>{/if}`.
4. Le récit garde la voix du moteur. Correction : ajouter `voixRecit()` dans src/lib/ui/table/texte.ts, qui transforme `/^(.+) → (.+) : impact$/u` en « $1 frappe $2. » et `/^(.+) : déclaration$/u` en « $1 déclare. », puis l'appliquer à l'affichage dans recits/[id]/+page.svelte. projection.ts reste intact.
5. Sur /carnet/table/[id], la même déclaration s'écrit de deux façons : « Déclaration de : Aria Lunval », puis « Loup des lianes : déclaration » (carnet-table-c_demo_table_ouverte-alice-390.png). Correction : table/[id]/+page.svelte l.209, `if (texte && !/^Déclaration de\s*:/u.test(texte))`. C'est la règle déjà suivie par recits/[id], Marge.svelte et les archives.
6. Dans la carte « Actions et coûts », la mention « · Joueur » reste accolée à Pugilat, Bloquer et Parer (etat-scene-regle-390.png). Correction : scene/+page.server.ts l.38-40, ajouter après le `filter` : `.map((a) => (a.pour === 'joueur' ? { ...a, conditions: undefined } : a))`.
7. Le « Noter » refusé s'écrit en rouille sur la sauge, environ 2,1:1 (etat-fiche-portrait-390.png). Correction : src/lib/ui/Bouton.svelte l.73, `.bouton:is(.ruban, .tampon, .rouille) :global(.encre)` sans `:not(.refusee)`. La note de marge en rouille dit déjà le refus.
8. Sur le feuillet superposé, « Reposer » ferme sans proposer le marque-page, alors qu'à 390 px le panneau « Où j'en suis » s'ouvre. Correction : scene/+page.svelte l.304, supprimer la sortie anticipée. Le panneau s'ouvre alors, et son envoi (redirect) appelle déjà `onreposer` (l.93).

## Verdict

Montrable sans réserve importante : non (réserve n° 1). Tous les défauts du second tour sont corrigés et le feuillet superposé est réussi. Reste la feuille imprimable, qui montre deux sceaux identiques en tête depuis l'arrivée du portrait en sceau ; une seule condition suffit à la corriger.

_Trace : 20 images lues. Aucune écriture de ma part : le lien de portrait envoyé a été refusé par le serveur, et le brouillon du journal comme la déclaration d'objet n'ont pas été envoyés. Pendant le contrôle, d'autres relecteurs ont modifié la base de démonstration : le thème d'alice est passé un moment à « violet » (d'où le fond d'etat-scene-regle-390.png), et une Table « Revue indépendante — dix au gué » est apparue. Ces changements ne touchent aucun constat ci-dessus. Scripts jetables : .claude/captures/critique-3/carnet/ (mesures.mjs, etats.mjs, bords.mjs, portraits.mjs, divers.mjs)._
