# Progression commune du compagnon

Décision du 24 septembre 2026, intégrée à la version v297. Ce document décrit la fusion de l'XP du personnage et de son serment. Les anciennes fiches sont converties à la lecture ; les données converties sont persistées à leur prochaine sauvegarde autorisée.

## Règles de jeu

Le personnage possède un seul niveau et une seule barre d'expérience. Il commence au niveau 1 avec 0/30 XP. Le seuil pour passer au niveau suivant vaut `niveau × 30` ; l'XP excédentaire est conservée après chaque montée de niveau.

Les récompenses de combat et la fusion des Gemmes de Sang alimentent le même compteur. Les gemmes donnent toujours respectivement +5, +20 ou +50 XP selon leur type. La fusion retire les gemmes utilisées de l'inventaire ; elle est refusée si le stock est insuffisant. Le crédit d'XP et le retrait sont enregistrés dans la même sauvegarde de fiche : aucun des deux n'est annoncé comme confirmé si cette sauvegarde échoue. Les gains de PV, EP et EM utilisent les valeurs du serment effectif, y compris ses personnalisations. Les dégâts et les capacités de la branche utilisent le niveau du personnage.

| Rang du serment | Niveaux des paliers de branche |
|---|---|
| Basique | 2, 5, 7, 10 |
| Aguerri | 10, 13, 16, 20 |

Le rang (Basique, Aguerri, etc.) et la branche sont distincts du niveau chiffré. Atteindre un palier débloque les capacités prévues pour la branche ; cela ne transforme pas automatiquement un serment Basique en Aguerri. Changer de serment conserve le niveau et l'XP acquis.

La fiche, les outils staff et le PDF présentent la même progression. Les formulaires de récompense distinguent seulement la source du gain : combat ou gemmes.

## Reprise des personnages existants

La règle validée par le propriétaire est de **conserver la progression la plus avancée**, sans additionner les deux anciennes XP.

1. Lire les anciennes progressions personnage (`level`, `xp`, `xpMax`) et serment (`sLevel`, `sXp`, `sXpMax`). Si l'XP atteint déjà un seuil, résoudre d'abord les niveaux acquis selon la courbe correspondante : personnage `niveau × 30`, serment `niveau × 10`, en tenant compte du premier seuil enregistré.
2. Retenir le niveau le plus élevé. À égalité de niveau, retenir la fraction d'XP la plus avancée vers le suivant.
3. Fixer le nouveau seuil à `niveau × 30`, puis y transposer la fraction retenue. Arrondir au point d'XP supérieur, avec un maximum de `seuil − 1` pour ne pas créer un niveau supplémentaire par arrondi.
4. Si le niveau retenu dépasse l'ancien niveau du personnage, ajouter les gains de statistiques correspondant à la différence, selon le serment effectif. Conserver les bonus/malus existants et le déficit de chaque ressource ; un personnage à 0 PV reste à 0 PV.
5. Enregistrer `progressionVersion: 1`. Cette marque empêche toute nouvelle fusion ou attribution répétée des gains lors d'un rechargement ou d'un import.

| Avant : personnage | Avant : serment | Après : progression commune |
|---|---|---|
| Niveau 5, 30/150 XP | Niveau 3, 20/30 XP | Niveau 5, 30/150 XP |
| Niveau 3, 60/90 XP | Niveau 5, 20/50 XP | Niveau 5, 60/150 XP |
| Niveau 5, 30/150 XP | Niveau 5, 30/50 XP | Niveau 5, 90/150 XP |

Le deuxième exemple augmente les statistiques pour les deux niveaux supplémentaires du personnage. La progression la moins avancée ne constitue pas une réserve d'XP à ajouter ultérieurement.

## Données et compatibilité

Les champs actifs sont `level`, `xp`, `xpMax` et `progressionVersion`. Le second triplet historique n'est plus un compteur de jeu. La conversion s'applique aux anciennes fiches et aux imports hérités ; une fiche déjà marquée version 1 garde sa progression commune, même si d'anciens champs subsistent dans une source historique.

La normalisation ne réécrit pas les sauvegardes historiques sur disque et ne modifie pas le texte des récompenses déjà enregistrées dans l'historique. Ces éléments peuvent donc encore mentionner l'ancien système. Les écritures des fiches continuent à utiliser les permissions et contrôles de version existants.

Le prototype RPG conserve sa progression et ses récompenses indépendantes. La fusion concerne le compagnon de JDR et ses outils staff.
