Le bestiaire public et l’Atelier sont intégrés. Les Serments lisent le domaine, et « tu es ici » suit le personnage du lecteur.

27 fichiers écrits dans les chemins autorisés :

- [Bestiaire](/C:/Users/sacha/NuagesPolaires/src/routes/univers/bestiaire/+page.svelte) : recherche, filtres, fiches, portrait, calque réservé et observations.
- [Atelier](/C:/Users/sacha/NuagesPolaires/src/routes/atelier/+layout.svelte) : listes, création et édition des créatures et Serments, visibilité, duplication, archivage, restauration et révisions.
- [Source des Serments](/C:/Users/sacha/NuagesPolaires/src/routes/univers/serments/source.ts) et leurs deux chargements serveur.
- [Tests Playwright](/C:/Users/sacha/NuagesPolaires/tests/e2e/atelier.e2e.ts).

Vérifications : **9 tests passent** sur la démonstration. `svelte-check` rapporte zéro erreur et aucun avertissement dans U7 ; un avertissement CSS subsiste dans le Carnet, hors périmètre. Les 27 fichiers sont valides en UTF-8, sans U+FFFD ni accent remplacé.

96 PNG couvrent les pages à 1440 et 390 px, en nuit et Papier : états vides, remplis, calque, compte en attente, observations à tamponner, refus et conflit. Les captures examinées et les mesures finales ne signalent aucun débordement, texte sous 12 px ou erreur de console. Aucun composant partagé ajouté.

Restent à raccorder :

- **Calque public des Serments** : son rendu nécessite leur `+page.svelte`, hors chemins assignés.
- **Préselection à la Table** : le lien transmet `beastId`, que le paquet Table doit consommer.
- **Valeurs actuelles des quantités et du poids** : absentes de `BeastView`. Les champs permettent de les modifier ; laissés blancs, ils préservent les valeurs enregistrées.

Les filtres mobiles reprennent le dépliant existant de L’univers.