# Contrat du système de thèmes

Ce document décrit le chantier progressif des thèmes. Il distingue les modules de rendu, leurs adaptateurs historiques et le parcours compte. Une vérification d'une famille ne certifie pas toutes les pages : conserver les couches précédentes jusqu'à couverture des usages correspondants.

## Responsabilités

- `assets/js/theme-catalog.js` expose `NPThemeCatalog`, un catalogue partagé sans accès au DOM, au stockage ni aux droits. Il normalise les identifiants, fournit les neuf packs intégrés et les palettes personnalisées, valide la palette résolue et produit les variables.
- `assets/js/theme-max.js` expose `NPThemeEngine`. Son application visuelle met à jour la palette immédiatement ; elle ne doit pas attribuer un thème ni enregistrer une préférence. Les décors de packs restent dans ce module. Les attributs historiques `data-theme-engine="v257"`, `data-theme-active` et `data-theme-tone` restent compatibles avec leurs sélecteurs existants.
- `assets/css/theme-surfaces.css`, chargée après les feuilles historiques, applique les couleurs aux familles migrées : panneaux, menus et portails, fenêtres, champs, tableaux, collection, barre d'aperçu, ressources et accueil public connecté. Elle ne modifie ni grille, ni typographie, ni taille des composants.
- Le parcours compte décide des possessions, de l'aperçu, de l'annulation et de la sauvegarde serveur. Le moteur de couleurs n'est jamais une autorisation.

Les contrôles `canUseTheme`, l'API `self_set_theme` et la migration des anciens droits appartiennent au chantier compte. Leur intégration et leurs tests doivent être évalués avec le rendu ; les seuls tests du catalogue ne démontrent pas que la sauvegarde et les droits sont sûrs.

## Portée et activation

Les couleurs connectées sont activées sous `html[data-np-design="polar"] body[data-np-authenticated="true"][data-theme-engine]`. Le moteur synchronise le marqueur depuis `CU`. Les chemins d'ouverture/fermeture de session doivent aussi appeler `NPThemeEngine.syncAuthentication()` afin qu'une déconnexion retire immédiatement cette portée, même sans changement de thème.

Le marqueur est un état visuel public, jamais une preuve d'authentification pour l'API. Aucun identifiant de compte n'est nécessaire dans le DOM.

L'accueil visiteur conserve la palette de `polar-identity.css`. L'accueil et les pages publiques visités pendant une session héritent de la palette du joueur. Les images et le logo conservent leur identité. Les aperçus dans la collection utilisent la palette de chaque pack, indépendamment du thème actif : ne pas recolorer `.theme-preview-mini` avec les variables du thème actif.

Les portails de navigation et les fenêtres placés directement sous `body` héritent aussi des variables. La feuille cible leurs classes et identifiants connus, pas leurs couleurs inline ou le texte d'un attribut `style`. Les nouveaux éléments insérés après le changement reçoivent leurs couleurs par la cascade, sans parcours récurrent du DOM.

## Variables à employer

| Rôle | Variables |
| --- | --- |
| Fond de page, surfaces unies | `--tm-bg`, `--tm-bg2`, `--tm-bg3`, `--tm-bg4` |
| Surface décorée, surface élevée | `--tm-card-bg`, `--tm-card-bg-strong` |
| Texte principal, secondaire, aide | `--tm-text`, `--tm-text-soft`, `--tm-text-muted` |
| Traits et contours | `--tm-border`, `--tm-border-strong` |
| Commande, survol, champ | `--tm-control-bg`, `--tm-control-bg-hover`, `--tm-input-bg` |
| Action primaire solide | `--tm-primary-bg`, `--tm-primary-text` |
| Lien et focus lisibles | `--tm-link`, `--tm-focus` |
| Décoration d'ambiance | `--tm-accent`, `--tm-accent-bright`, `--theme-tint` |
| Voile et sélection | `--tm-overlay`, `--tm-selection-bg`, `--tm-selection-text` |
| Ombres | `--tm-shadow`, `--tm-shadow-soft` |
| Sens d'un état | `--status-danger`, `--status-success`, `--status-warning`, `--status-info` et leurs suffixes `-bg`, `-border`, `-on` |

Ne pas employer un accent brut pour un petit texte : `--tm-link` est adapté à la lisibilité. `--tm-primary-text` est calculé pour **le fond solide** `--tm-primary-bg`, pas pour un dégradé arbitraire. Un bouton primaire qui remplace ce fond doit recalculer et vérifier le contraste de son texte. De même, un badge rempli avec `--status-danger` emploie `--status-danger-on` pour son texte ; les autres états disposent du même contrat.

Les variables de compatibilité `--bg*`, `--text`, `--dim`, `--faint`, `--glacier*`, `--theme-*`, `--np-ui-*` restent disponibles. Elles évitent une réécriture massive des pages ; elles ne justifient pas de nouvelles couches de correction. Les alias `--red`, `--green`, `--gold`, `--purple` gardent désormais un sens stable selon le mode clair/sombre, indépendant de l'accent du pack.

Les ressources de fiche sont explicites : `.bpv` → danger/PV, `.bep` → avertissement/EP, `.bem` → information/EM, `.bxp` → réussite/XP. Les valeurs, libellés et géométries des jauges ne changent pas. Le code ne doit pas utiliser un seul accent de thème pour représenter toutes les ressources.

## Nouveau composant

Un composant doit séparer structure, ambiance, sens et décor. Les dimensions et espacements vivent dans sa propre feuille ; ses couleurs utilisent les variables ci-dessus. Aucun code hexadécimal/RGB d'ambiance n'est ajouté dans le composant ou son HTML.

Exceptions documentées : définition de palette, images/illustrations, identité spécifique d'un serment, couleurs sémantiques déclarées et palette d'export. Une exception sémantique garde une étiquette ou un symbole ; la couleur seule ne porte pas l'information.

Les attributs facultatifs `data-np-surface="page|panel|raised"` appliquent les couleurs standards sans imposer de géométrie. `data-np-status="danger|success|warning|info"` applique un état. Préférer ces contrats ou une classe métier explicite à une règle `[style*="rgb(...)"]`.

```html
<section class="quest-summary" data-np-surface="panel">
  <h2>Expédition</h2>
  <p class="quest-summary-description">Les préparatifs sont enregistrés.</p>
  <p data-np-status="success">✓ Prête</p>
</section>
```

```css
.quest-summary { border: 1px solid var(--tm-border); }
.quest-summary-description { color: var(--tm-text-soft); }
```

## Palettes personnalisées et compatibilité

La palette complète résolue contient `bg`, `bg2`, `bg3`, `bg4`, `text`, `dim`, `faint`, `accent`, `accentDim`, `accentBright`, `accentRgb`, `accent2Rgb` et `pageBg`, ainsi qu'un mode clair/sombre et des couleurs d'aperçu cohérentes. Le schéma versionné est actuellement `schemaVersion: 1`.

Les anciens thèmes d'événement avec seulement trois couleurs d'aperçu sont pris en charge par l'adaptateur du catalogue : il dérive une palette complète. Cette compatibilité doit être distinguée de l'édition native d'une palette complète. Le champ `paletteStatus` permet de distinguer palette intégrée, personnalisée, dérivée, réparée ou de repli. Si aucun texte commun n'est lisible sur les quatre fonds personnalisés, le fond de page est conservé et les surfaces incompatibles sont ajustées ; `paletteStatus: 'repaired'` et `repairedSurfaces` indiquent cette correction. Un thème dérivé conserve son identifiant et ne doit pas être présenté comme le pack Nuages Polaires.

Avant d'appliquer un thème personnalisé, résoudre via le catalogue puis vérifier `NPThemeCatalog.validate(theme)`. La validation de palette ne valide pas possession, période d'acquisition ou droit de sauvegarde. Aucun CSS libre ni URL arbitraire n'est accepté comme substitut à une palette structurée. Les nouveaux éditeurs doivent fournir tous les champs nécessaires plutôt que seulement changer la vignette.

## Aperçu, accès et sauvegarde

La collection emploie `data-theme-state="selected|owned|available|locked|blocked"`. Le style de l'aperçu est distinct de celui d'une possession ; `data-theme-preview` identifie l'action et n'accorde aucun droit, tandis que `data-theme-preview-active="true"` marque la carte actuellement prévisualisée. La barre `#np-theme-preview-bar` comprend les commandes `#np-theme-preview-apply` et `#np-theme-preview-cancel`. `aria-busy="true"` représente l'attente d'enregistrement ; une erreur ou un refus doivent être annoncés en texte par le parcours compte.

Le compte est la source de vérité. Une migration des possessions historiques du personnage doit préserver les droits et rester rejouable. Masquer un thème ne le révoque pas. Une saison terminée ferme l'acquisition, pas l'usage d'une possession permanente. Un blocage individuel interdit l'usage ; une révocation retire le droit. Un simple choix mémorisé ne prouve pas une possession. Le cache de l’appareil ne sert qu’au mode visiteur. Pendant une session, la préférence du compte est prioritaire, même si elle vaut sombre.

## Validation et limites

Pour une modification, exécuter le contrôle de syntaxe du dépôt, les tests du catalogue, puis la matrice navigateur appropriée. Les scripts dédiés sont `scripts/test-theme-catalog.js` et `scripts/test-theme-matrix-browser.js`. Les scénarios de compte doivent couvrir séparément réseau, 409, réponses désordonnées, annulation, déconnexion, changement de compte et droits expirés/révoqués.

La suite navigateur parcourt neuf packs, deux formats et huit familles : fiche, tableau de bord, agenda, références, compte, collection, modale et menu. Elle contrôle les palettes synchrones, les ressources, la conservation des saisies et de la navigation, les composants insérés après changement, la réduction des animations, les contrastes calculables et les débordements. Elle vérifie aussi que le diagnostic administrateur restaure un aperçu sans modifier la préférence. Compléter cette couverture par les parcours de sélection et une revue des états survol, focus, erreur et désactivation. Les captures doivent être relues : un test automatique sans exception JavaScript ne démontre pas une absence de régression visuelle.

Mesurer le contraste sur le fond réellement composé : texte courant ≥ 4,5:1, grand texte ≥ 3:1 selon [W3C 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) ; informations nécessaires aux commandes et états ≥ 3:1 selon [W3C 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). Un outil qui ignore transparence, image ou dégradé doit les signaler comme non mesurés, jamais comme conformes.

La règle `@media print` fournit une palette dédiée pour l'impression du navigateur. L'export jsPDF reste un renderer séparé dans `main.js` : ses couleurs ne sont pas contrôlées par cette feuille, et son résultat nécessite sa propre vérification. La feuille ne prétend pas traiter tout HTML historique ni les couleurs incorporées aux assets.

## Migration et retour arrière

La nouvelle couche conserve les anciens adaptateurs et sélecteurs pour permettre un retour par famille. Les `!important` présents dans `theme-surfaces.css` servent uniquement à prendre la priorité sur les anciens styles ; les nouveaux composants n'en ont pas besoin. Ne pas ajouter de nouvelle recherche de couleurs dans les attributs `style`.

Pour une régression ciblée, rétablir la règle précédente de la famille touchée et garder les données de compte. Retirer l'inclusion de `theme-surfaces.css` désactive l'ensemble de cette couche visuelle sans retirer le catalogue ni supprimer une possession. Ne supprimer une couche historique qu'après inventaire de ses usages, matrice verte et inspection des captures correspondantes. Une correction visuelle n'autorise jamais une réinitialisation des préférences ou de l'inventaire.
