# Accueil — descente dans le paysage

Le paysage d’origine se prolonge sous l’accueil, des falaises brumeuses jusqu’aux cavernes. Les sections existantes restent dans le flux normal du document. Aucun défilement forcé ni blocage du scroll.

## Fichiers

- `assets/css/home-depth.css` : raccord des images, masques, lisibilité, adaptation mobile et thèmes du compte.
- `assets/js/home-depth.js` : trois plans de parallaxe, événements passifs, une mise à jour par frame demandée, arrêt hors accueil et respect dynamique de `prefers-reduced-motion`.
- `assets/images/nuages-polaires-depths-v2.jpg` : prolongation décorative active, 1024 × 1536, environ 549 Kio, chargée à la demande. La première version et le paysage `nuages-polaires-horizon.jpg` sont conservés.

Les variables de mouvement sont mises à jour dans une règle CSS dédiée, afin de ne pas déclencher les observateurs historiques des attributs `style` dans le corps de page.

## Vérification locale

`scripts/check.js` et `scripts/test-browser.js` passent. Contrôles Chromium additionnels : largeurs 320, 390, 768, 1440 et 2200 px sans débordement horizontal ; mouvement borné ; préférence de réduction des animations changée pendant la visite ; aller-retour connexion/accueil ; navigation par ancres ; thèmes connectés clair, sombre et violet. Captures et compte rendu dans `test-results/home-depth/` (non versionnés).

## Illustration

Créée avec l’outil intégré ImageGen, à partir de `assets/images/nuages-polaires-horizon.jpg` comme référence de continuité visuelle. Conversion du PNG en JPEG pour le site. Aucune API de génération n’est appelée par le site.

La V2 réduit les terrasses répétitives, donne plus de relief aux falaises et utilise des reflets sauge et ivoire plus doux dans la caverne. Son cadrage mobile à 62 % garde l’ouverture et le lac dans le champ.

Prompt final de la V2, avec la V1 comme cible et le paysage original comme référence :

> Art-direct and substantially improve the FIRST attached image (the tall underground landscape), using the SECOND attached image (the original wide stormy landscape) as the authoritative reference for world, atmosphere, naturalism and colour. Produce one exceptional finished portrait painting, aspect ratio 2:3, at the highest available resolution, ideally 2048 x 3072. This is a new refined version of the tall image for a website that scrolls from the original landscape down into the depths of the same world. Do not recreate the wide sky image.
>
> Improve the first image's main weaknesses: it has too many similar stacked rectangular cliff shelves, too much even sharp texture, and flat grey fog. Replace that repetitive staircase with a few immense, asymmetrical, organically fractured geological masses, a compelling continuous downward route and a much stronger sense of scale. Sophisticated cinematic matte painting with the same beautiful, subtly painterly realism as the second image; true atmospheric perspective, finely controlled detail and beautiful nuanced light. A believable wild world, not a collage of generic fantasy rocks.
>
> Composition: the upper 10-15% is the continuation of the second image's very bottom foreground: dark wet slate, sparse low moss and soft drifting mist, dark at left, muted reflected ivory light at right. No horizon or sky at the top. Then the land falls away into a vast, steep, winding ravine. A slender natural stream becomes a long delicate waterfall and disappears between massive irregular rock faces. Three distinct depth planes: richly textured near rock at the edges, weathered middle-distance cliffs partly hidden by thin fog, immense distant rock silhouettes softly dissolving into cold light. Avoid repeated shelves and excessive little waterfalls. Suggest traces of hardy vegetation only where plausible. Let the eye follow a subtle S-shaped course down the painting. The lower third gradually reveals one immense natural stone vault, partially obscured, opening onto a still subterranean lake. Restrained icy jade reflected light in deep shadows, luminous mist catching the water's reflection. The cavern should feel ancient and awe-inspiring, not like a bright portal or a game dungeon. Bottom falls gently into very dark green-black water and stone.
>
> Light and palette: preserve the second reference's desaturated slate, midnight blue-green, green-grey mist and tiny touches of warm silver/ivory reflection. One coherent cold daylight source from high above/right progressively fades into the gorge; subtle glacial green water reflection below. More depth and tonal separation, not globally brighter. No flat grey wash, no crushed featureless black, no oversharpening, no oversaturation, no teal neon or bright blue crystals. Highly varied natural rock shapes and convincing erosion. Broad areas of visual quiet amongst the detail.
>
> Website constraints: strongest geological silhouettes near edges, a coherent attractive scene in the central third for a narrow mobile crop. The middle/right areas at roughly 30-65% height should be dark, calm atmospheric negative space where cream HTML text can remain legible. Preserve continuous vertical world geography, no horizontal divisions. This is the image asset only: no text, lettering, typography, logo, UI, frames, people, buildings, monuments, creatures or new lore objects.

Prompt initial (V1) :

> Create a single tall portrait environmental painting for a scrolling website, a seamless downward continuation of the supplied reference landscape. Reference image role: visual continuity / exact world, palette and painterly cinematic style. Output aspect ratio 2:3, high resolution. This image begins BELOW the existing landscape: NO SKY and NO HORIZON. At its very top: dark slate-black wet rocks, sparse moss, low mist matching the very bottom foreground of the reference. Then continue downward into immense layered fractured basalt cliffs and steep ravines, pale cold mist winding between ledges, fine waterfalls descending into shadow; the camera gaze travels downward, increasingly subterranean and ancient. Lower half: immense natural cavern / crevasse walls, distant subtle glacial teal ambient light far within the rock, deep blue-green shadows, delicate mineral reflections in black water at bottom, restrained and believable. All one uninterrupted landscape, no panels or divisions. Cinematic naturalistic fantasy matte painting, intricate organic geological texture, painterly realism matching reference, atmospheric depth. Composition for a web background: strongest visible rock formations at left and right edges, central broad ravine receding into fine mist with darker relatively quiet areas allowing ivory HTML text overlaid later. Dark overall but rich readable rock details, no heavy pure black band. Top smoothly joins original dark foreground; bottom naturally falls to near-black green. No people, structures, characters, runes, text, letters, logos, icons, border or UI. Preserve reference aesthetic: slate, desaturated forest teal, cold gray-green mist, no neon purple, no blue crystals. The output should show only this new downward extension; do not reproduce the reference sky.
