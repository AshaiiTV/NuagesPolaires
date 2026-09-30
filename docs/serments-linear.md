# Progression linéaire des serments

## Règle de jeu

Un serment conserve ses voies exclusives et sa signature. Chaque voie possède une capacité composée d’actions fixes. Les anciens seuils ne débloquent plus de commandes, de variantes ou de bonus supplémentaires.

Les dégâts, soins, protections et réserves de puissance suivent une formule `base + gain × N`, où `N` est le niveau actuel du personnage. Certaines fractions de protection utilisent un arrondi explicite. Les actions nécessaires, coûts en ressources, munitions, durées et limites d’usage restent constants.

Les bases sont utilisables dès le niveau 1. L’attribution normale d’une évolution garde son prérequis de niveau 10. La forge permet de simuler tout niveau ; sous ce prérequis, elle indique explicitement qu’elle montre les valeurs du niveau minimum de l’évolution.

Les anciennes attributions du staff à un niveau inférieur restent utilisables. Leur première valeur est conservée au niveau d’attribution, puis le même gain linéaire s’applique. Les trois évolutions historiques masquées restent masquées dans le catalogue.

Exemples :

| Action | Formule | Niveau 1 | Niveau 5 | Niveau 10 |
| --- | --- | ---: | ---: | ---: |
| Arbalétrier A, tir chargé | `16 + 3 × N` | 19 | 31 | 46 |
| Duelliste A, élan à distance | `2 + 3 × N` | 5 | 17 | 32 |
| Conjurateur A, soin de la frappe | `2 + N` | 3 | 7 | 12 |

Le gain reste identique au-delà des anciens niveaux maximaux. L’expérience, les gains de caractéristiques et les ressources actuelles des personnages ne sont pas recalculés.

## Source des valeurs

- Les 24 serments refondus utilisent `assets/js/serments-reforged-combat.js`. Les coefficients sont ancrés sur le premier ancien seuil ; la pente est l’augmentation moyenne entre le premier et le dernier ancien seuil, arrondie à un entier. Les dégâts incluent déjà leur ancien `+ N` pour ne jamais compter le niveau deux fois.
- Les 13 serments historiques utilisent `assets/js/serments-linear.js`, avec des opérations structurées correspondant aux signatures du moteur historique. Les effets quantitatifs y sont explicites, y compris les invocations et les actions de soin.
- Ces nouvelles courbes constituent un rééquilibrage : elles ne peuvent pas reproduire exactement chaque valeur des quatre anciens seuils.
- `ruleParts` contient les nombres et coefficients utilisés pour afficher les valeurs. La forge et les fiches affichent le résultat au niveau choisi ; les formules restent consultables dans un détail repliable.

## Compatibilité et édition

Le changement est un adaptateur de lecture, sans migration des données enregistrées. Les personnalisations du staff gardent la priorité. Une description ou un coût modifiés désactivent les opérations natives correspondantes ; une formule explicite du texte personnalisé reste calculable, sans déduire de coefficient à partir d’une prose libre.

Les exports JSON peuvent contenir deux copies distinctes de la même capacité (`ability` et l’alias `paliers[0]`). La lecture les réconcilie en conservant celle dont le texte ou le coût a été personnalisé. Si les deux copies ont des personnalisations contradictoires, `ability` fait référence. Le document importé reste intact.

Les anciennes capacités sont conservées dans les données de compatibilité. Un combat commencé sous les règles précédentes termine avec ses opérations et réserves historiques. Les nouveaux combats utilisent la version 3 du moteur refondu. Les 46 serments retirés du catalogue conservent leur référence historique pour les personnages déjà créés.

L’éditeur propose une capacité par voie. Le champ de texte accepte des formules telles que `8 + 2 × N`. Les anciens tableaux ne sont pas détruits à la consultation.

## Vérification

- Tests des valeurs aux niveaux 1, 2, 4, 5, 7, 10, 11, 20 et 35, et du moteur refondu jusqu’au niveau 100.
- Coûts, nombre de frappes, budget d’actions, invocations et réserves contrôlés indépendamment des descriptions.
- Reprise des anciens combats et priorité des descriptions/coûts personnalisés, y compris un coût vide.
- Parcours navigateur : forge, comparaison des voies, fiche personnage, PDF, éditeur, combat et progression du personnage.

Régénération des données des 24 serments :

```sh
node scripts/generate-serments-reforged-mechanics.js
python3 scripts/generate-serments-reforged.py
```
