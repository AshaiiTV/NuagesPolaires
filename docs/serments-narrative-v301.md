# Serments : incarnation dans le monde de Nuages Polaires

La réécriture porte sur les 24 serments de la sélection refondue : six bases et dix-huit évolutions. Elle conserve les treize serments historiques, les règles de combat, les croissances, les noms de branches et leurs alias. Les quarante-six anciennes additions restent archivées pour les personnages qui les utilisent.

## Appuis canoniques

Le synopsis, le règlement, le glossaire et les paliers d’évolution présents dans `assets/js/main.js` forment la référence :

- L’humanité a été projetée dans un futur lointain. Les constructions ont presque toutes disparu. Le réveil, les déplacements et la confiance entre rescapés fournissent des situations concrètes.
- Les Élèves du Serment sont une minorité. Le lien reconnaît son porteur ; son arme se manifeste, s’invoque et se révoque. Elle ne se transmet pas et disparaît avec lui.
- L’aspect de bois, de cuir ou de métal n’établit ni atelier, ni fabricant, ni tradition ancienne. La forme physique exprime un lien personnel.
- Les bases gardent une silhouette familière. Les évolutions transforment un problème déjà présent dans leur origine : le rechargement de l’Arbalétrier devient le couvert du Pavoisier ; le retour du fléau devient le contrepoids du Pendulier.
- La narration accompagne les opérations réellement disponibles. Elle ne crée ni soin, ni divination, ni immobilisation, ni contrôle d’un autre personnage hors des règles.

## Ce que chaque fiche ajoute

Le récit comporte une amorce courte et un développement. Une phrase d’engagement donne une voix possible au porteur, sans constituer une condition d’obtention, une personnalité obligatoire ou un nouveau prix magique. Une scène d’éveil possible, un rôle parmi les rescapés et le sens de l’évolution aident à construire une histoire personnelle.

Les deux branches possèdent chacune une question de jeu de rôle, une description sensible de l’arme et un échange de combat concret. Les quatre paliers reçoivent chacun un nom propre et une manifestation : le joueur peut suivre ce que change sa progression dans ses gestes, la matière et le comportement de l’arme.

Les principaux risques de confusion sont traités dans les identités : le Veneur lit les actes de l’échange ; l’Entraveur répartit une blessure ; les cristaux de l’Orfèvre ne sont pas des Gemmes de Sang ; l’Astronome annonce des alignements proches ; l’idole du Totémiste dépend des ordres du porteur.

## Données et affichage

L’écriture est conservée dans `docs/serments-reforged-source.json`. Le générateur la réunit au contrat de combat sans modifier coûts, déblocages ou formules. Les champs narratifs restent séparés des effets calculés.

La Forge affiche l’engagement et l’amorce avant la constellation. Les nœuds portent les noms des paliers, et l’inspecteur présente leur manifestation à côté de l’effet. Le récit complet et les pistes de jeu s’ouvrent par un bouton accessible au clavier. La fiche personnelle reprend l’engagement, le récit et la manifestation du palier actif.

Les tests vérifient la transmission des 192 manifestations, l’identité des coûts et effets avec le contrat, le passage entre paliers, la conservation des métadonnées après édition par le staff et la lecture sur mobile. La consultation reste sans effet sur les personnages.
