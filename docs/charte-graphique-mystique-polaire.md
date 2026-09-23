# Nuages Polaires — Mystique polaire

Direction choisie avec le propriétaire du projet le 23 septembre 2026.

## Intention

Un monde silencieux et immense, une lumière étrange, des histoires encore possibles. La nouvelle identité fait du paysage et des Serments les premiers signes distinctifs du serveur. Elle remplace la page d'entrée centrée sur les boutons par une ouverture narrative, puis présente le compagnon comme un carnet de voyage.

**Précision de lore validée pendant la refonte : les constructions ont presque toutes disparu.** L'illustration finale représente uniquement des reliefs naturels, de l'eau, de la brume et des nuages. Le texte de présentation et le synopsis ont été alignés sur cette précision. Les reflets d'aurore constituent une direction artistique, sans ajouter de phénomène ou d'objet au canon.

## Palette

| Couleur | Valeur | Usage |
|---|---|---|
| Nuit d'encre | `#091519` | Fond principal, respiration |
| Pierre sombre | `#102327` | Surfaces du compagnon |
| Brume profonde | `#172E32` | Surfaces secondaires |
| Ivoire | `#F0EEE5` | Titres et texte principal |
| Brume claire | `#BDCDC8` | Texte secondaire |
| Aurore | `#95CDBB` | Liens actifs, repères, interactions |
| Laiton pâle | `#C6B38B` | Serments, numérotation, détails rares |
| Sauge claire | `#C6D8C4` | Action principale de l'accueil |

L'accueil public conserve cette palette de marque. Les thèmes personnels du compagnon gardent leurs couleurs, avec une structure et une typographie communes. Les couleurs de danger, de réussite, de statut et de serment conservent leur sens.

## Typographie

- **Cormorant Garamond** pour les grands titres, les citations et les chiffres de présentation. L'italique donne une voix au récit ; il reste rare dans l'interface.
- **Manrope** pour les paragraphes, les champs, les menus et les actions. Les longues capitales espacées sont réservées aux petits repères éditoriaux.
- Cinzel reste disponible pour les repères des modules existants. Les trois familles sont hébergées dans `assets/fonts/`, avec leurs licences SIL Open Font License. Les caractères français et les ligatures œ/Œ sont inclus.

## Emblème et formes

La boussole existante reste l'emblème de NP. Elle est utilisée comme signature, jamais présentée comme une représentation canonique du Dimenséa. Les lignes fines, les interruptions de cadre et les petits losanges évoquent les repères perdus et la réalité pliée.

Les panneaux sont mats, les angles discrets et les séparateurs fins. Éviter les halos omniprésents, les panneaux de verre à répétition et les groupes de boutons arrondis sans hiérarchie. Les grandes images appartiennent aux pages de découverte ; les pages de jeu privilégient les données.

## Parcours et écrans

- **Accueil public** : paysage original, titre, invitation à rejoindre, découverte de l'univers, chiffres réels du serveur, présentation des Serments et règlement. Le prototype RPG reste accessible dans le pied de page.
- **Connexion et règlement** : champs lisibles, boutons identifiables, surfaces cohérentes avec la marque.
- **Tableau de bord** : entrée éditoriale, statistiques adaptées au rôle, prochain événement, derniers combats, personnage et accès au monde.
- **Compagnon** : menus, fiches, formulaires, listes et outils reprennent les mêmes règles de composition, avec les couleurs du thème choisi.

Les valeurs affichées proviennent du projet : aucun faux nombre de joueurs en ligne, aucune activité ou récompense inventée. Les captures locales utilisent exclusivement les données de démonstration du serveur de test.

## Mise en œuvre

- `assets/css/polar-identity.css` : polices, accueil public et formulaires de connexion.
- `assets/css/polar-connected.css` : navigation, carnet connecté, fiches et composants.
- `assets/js/theme-max.js` : nouvelle palette du thème de base dans sa configuration d'origine.
- `assets/images/nuages-polaires-horizon.jpg` : illustration finale optimisée pour le site.
- Le chargement de l'ancienne couche `home-readability-polish.js` a été remplacé par la nouvelle feuille d'identité. Les correctifs fonctionnels du lot précédent sont conservés.

Les règles prévoient le clavier, un focus visible, les écrans étroits et la préférence de réduction des animations. Les boutons principaux offrent une hauteur de cible d'au moins 44 px.

## Validation locale

Les 110 tests automatisés passent, ainsi que les trois suites Chromium du projet (compagnon, RPG et actions joueur). Les contrôles graphiques couvrent l'accueil, l'univers, le règlement, la connexion, le tableau de bord, les fiches et les événements ; les thèmes sombre, clair et violet ont été examinés. Les parcours bureau et mobile conservent leurs actions et ne présentent pas de débordement horizontal aux largeurs vérifiées. Aucun déploiement n'a été effectué.

## Illustration et prompts

Outil utilisé : **Imagegen intégré**, puis édition ciblée du même visuel. Le fichier livré est `assets/images/nuages-polaires-horizon.jpg` ; les originaux PNG sont conservés dans le répertoire de génération Codex. La conversion JPEG sert uniquement à réduire le poids du fichier.

### Prompt de génération initial

> Create an original premium website hero environment illustration for Nuages Polaires, a French text roleplaying world. Wide landscape 16:9 composition, cinematic matte painting with sophisticated photographic atmosphere and very fine painterly texture. Lore fidelity: humanity has been projected into a distant future; enormous pale WHITE cloud masses have swallowed the sky and dimmed its light; empty architecture stands silent, distant city silhouettes appear through veils of cold mist. Show an immense quiet valley with dark rugged foreground and sparse forgotten architectural silhouettes on the far right horizon, beneath sculptural low white cloud banks, an uncanny luminous slit of pale jade light in the sky like a very faint auroral atmospheric reflection. No snow kingdom, no fantasy castle, no fire, no creatures, no people, no physical magical relic. Colors: deep blue-black ink, muted jade green, fog ivory, very restrained desaturated warm pale-gold horizon light. The LEFT 45% should be dark and low-detail negative space with only mist so ivory website text could be overlaid; the RIGHT half contains the focal landscape and mysterious distant city. Extremely refined, contemplative, mysterious, tangible atmosphere, visually distinctive and beautiful. Upper areas dark enough for navigation, bottom edges smoothly dark, no UI, no frame, absolutely no letters, text, watermark, logos, rune glyphs or charts. Asset type: original landscape background for a live website; not a mockup.

### Prompt d'édition final — correction du lore

Le premier prompt suivait le synopsis alors présent dans le code. La précision du propriétaire remplace cette interprétation : les constructions ont été retirées avec le prompt suivant.

> Edit this exact landscape illustration. The user loves its mood and asks for one lore correction: there are no longer constructions in Nuages Polaires. Remove EVERY building, tower, city silhouette, architectural ruin, artificial column, wall, or other man-made structure from the entire image, including all tiny skyline shapes near the distant central/right horizon, the towers by the right lake, and the far right cliff structures. Replace their footprints seamlessly with natural irregular weathered rock ridges, eroded cliffs, soft rolling slopes and atmospheric mist. Do not introduce new constructions or ambiguous straight artificial pillars. Keep EXACTLY the overall composition, wide format, dark low-detail LEFT negative space, mountainous valley, distant water, gorgeous massive pale cloud formation, very subtle jade auroral opening, restrained warm horizon, cinematic painterly detail, lighting, color palette and contemplative mood. Nature only: rocks, mountains, water, mist, sky. No people, no letters, no symbols, no logo, no frame. Make this a faithful targeted removal, not a redesign.
