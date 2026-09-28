# Personnalisation des thèmes — v298 publiée

Le catalogue `assets/js/theme-catalog.js` définit les neuf thèmes existants : Nuages Polaires, Brume Claire, Galactique, Sylvan, Aquaris, Pâques, Halloween, Noël et Lune de Sang. Il expose le même schéma côté navigateur et côté serveur, normalise les alias historiques et dérive une palette sûre pour les thèmes personnalisés hérités. Les métadonnées de distribution configurées en base sont conservées.

## Choisir une ambiance

Dans Compte → Ma collection, « Prévisualiser » permet d’essayer un thème utilisable sans sauvegarde. « Appliquer » attend la confirmation du serveur ; « Annuler » ou quitter la collection rétablit la préférence enregistrée. Une requête en attente bloque les confirmations répétées. Si la sauvegarde échoue, le thème confirmé revient et un message permet de réessayer.

Un thème non possédé ou bloqué s’affiche dans un échantillon isolé. Cet aperçu ne change pas l’apparence générale et n’accorde aucun droit. La carte « Équipé » correspond toujours au choix confirmé, même pendant un essai. Le thème du compte est prioritaire sur un ancien choix enregistré sur l’appareil, y compris lorsqu’il est sombre.

## Contrat d’accès

- Sombre et clair sont accessibles à tous ; les rôles admin, MJ et designer conservent l’accès aux thèmes connus.
- Pour un joueur, la possession vient de `unlockedThemes` du compte ou de son propre personnage. `selectedTheme` ne prouve pas une attribution.
- Un blocage sur le compte ou le personnage interdit l’usage, sauf thèmes de base. Les restrictions Early Clouds restent applicables.
- Masquer un thème ou terminer sa saison ne retire pas une possession existante.
- Une distribution automatique active est acquise lors d’une sélection confirmée. Une simple lecture ou un aperçu ne distribue rien. Une borne de distribution invalide ferme cette possibilité.
- La sélection compare les versions des trois collections concernées dans une opération SQL ; une modification concurrente des droits déclenche une nouvelle vérification. Le retrait ou blocage d’un thème réévalue la préférence sur le dernier état du compte.
- Une réponse tardive ne modifie ni le compte courant ni son cookie de session.

Le fonctionnement visuel et les règles pour ajouter un composant sont détaillés dans [theme-system.md](theme-system.md).

## Mise en œuvre et livraison

`theme-max.js` applique synchroniquement les tokens du catalogue. Les surfaces du compagnon utilisent des couleurs sémantiques pour conserver la lecture des actions, statuts et ressources. Les miniatures montrent leur propre palette, indépendamment de celle actuellement essayée.

Cette version a été vérifiée sur des comptes fictifs dans une base PostgreSQL locale éphémère, puis publiée le 24 septembre 2026. La livraison n’a exécuté aucune migration ni attribution de thèmes en production. Le déploiement, la sauvegarde et les contrôles sont consignés dans la [fiche de publication](release-v298-2026-09-24.md).

## Recette du 24 septembre 2026

- Contrôle de syntaxe : 64 fichiers ; 212 tests automatisés réussis ; construction statique réussie.
- Neuf suites Chromium réussies sur base isolée : compagnon, RPG, actions joueur, événements staff, archives, clavier, progression, sélection de thème et matrice graphique.
- Matrice : neuf palettes × deux formats × huit familles d’écrans, soit 144 vues ; aucun débordement ni erreur JavaScript détecté. Les captures de collection, fiche, menu et recadrage ont été relues.
- 14 921 échantillons de contraste calculables passent. Les 712 échantillons sur images, dégradés, transparence ou icônes non calculables sont signalés comme non mesurés ; ce résultat ne constitue pas une certification globale d’accessibilité.
- Les archives Netlify des deux fonctions ont été construites localement ; le catalogue partagé et le helper d’accès sont inclus dans `auth`.

Les rapports et captures de travail restent dans `test-results/`, exclus du dépôt et du site publié.
