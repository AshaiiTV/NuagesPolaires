**1. Verdict**
Le moteur n’est **pas exactement fidèle** : plusieurs écarts changent les combats, les fiches ou la reprise des archives.  
Le socle concorde sur 128 options de capacités natives, 500 rounds comparés, 2 400 migrations XP et 600 pondérations usuelles.  
Aucun fichier modifié ; vérifications par extraits legacy exécutés en VM, TypeScript transpilé en mémoire et doubles de base pour les opérations de fiche.

**2. Écarts vérifiés**

Références abrégées : `main.js` et `progression.js` désignent `legacy/assets/js/` ; `combat/…`, `oaths.ts`, `spawn.ts`, `progression.ts` désignent `src/lib/game/` ; `domain/…` désigne `src/lib/server/domain/`. Certaines différences réparent des défauts hérités : elles restent incompatibles avec l’objectif de fidélité exacte.

| Gravité / règle | Legacy : référence et comportement | Nouveau : référence et comportement | Exemple vérifié | Correction précise |
|---|---|---|---|---|
| **Bloquant — statuts à l’entrée** | `main.js:12412` : joueur ajouté avec `statuts:[]`. | `combat/state.ts:215` ; `domain/combats.ts:289` : importe les statuts de fiche pour 2 tours. | Étourdi : **3 → 1 action** ; saignement : **30 → 27 PV** au premier round, contre 30 hérités. | Initialiser les statuts de combat à vide ; garder les statuts IRP sur la fiche. |
| **Bloquant — tours des invocations** | `main.js:12327` : ajoute l’invocation aux combattants, **sans modifier `order`**. | `combat/resolve.ts:204` : ajoute aussi son identifiant à l’ordre. | Après invocation puis round suivant : adversaire **100 PV legacy / 92 nouveau** ; ordre de 2 / 3 combattants. | Pour un port exact, ne pas ajouter l’invocation à l’ordre. Documenter séparément toute réparation de ce défaut hérité. |
| **Bloquant — XP à la clôture** | `main.js:12357` : clôture sans XP ; attribution distincte dans `applyXP`, ligne 9363. | `combat/outcomes.ts:54` : propose automatiquement l’XP des créatures KO ; `domain/combats.ts:621` applique l’XP acceptée. | Fiche niv.1, 20 XP, 1 PV ; créature niv.2 KO : legacy reste **niv.1, 20 XP, 1 PV** ; proposition acceptée : **niv.2, 10 XP, 36 PV** pour Duelliste. | Proposer 0 XP à la clôture ; réserver le calcul et l’attribution à une récompense explicitement demandée. |
| **Bloquant — contexte des archives perdu** | `main.js:11448` relit la fiche pour les capacités ; `12540` relit le bestiaire pour les drops. Ces données ne sont pas dans le combattant archivé. | `combat/legacy.ts:35` importe uniquement `f.gem` ; ligne 37 ne restaure aucune branche. `abilities.ts:73` dépend de cette branche. | Archive de Duelliste niv.2, fiche Taille Double : **1 option legacy / 0 nouvelle**. Créature avec table Blanche 1–100 : **drop possible / `COMBAT_DROP_UNAVAILABLE`**. | Enrichir les archives depuis les fiches et le bestiaire actuels, par `pid`/`bid`, avant reprise. |
| **Bloquant — préparation prise pour une clôture** | `main.js:12454` journalise l’initiative avant démarrage ; `11893` autorise ensuite le démarrage. | `combat/legacy.ts:60` : tout état inactif, idle, avec journal devient `ended:true`. | Une seule ligne « ★ Initiative » : démarrage autorisé legacy, **`COMBAT_ALREADY_ENDED`** nouveau. | Ne pas déduire la clôture de la présence du journal ; distinguer préparation, arrêt automatique et clôture explicite. |
| **Bloquant — dégâts figés** | `main.js:11950` relit `getAllSD()[classe].dmg` à chaque déclaration. | `combat/actions.ts:25` utilise le `dmgBase` enregistré à l’ajout. | Duelliste niv.2 ; dégâts du Serment changés de 11 à 20 : **22 legacy / 13 nouveau**. | Fournir la définition effective courante lors de la construction des déclarations. |
| **Bloquant — frappe de base zéro** | `main.js:11951` : hors Serment reconnu, `f.dmgBase || 6`. | `combat/actions.ts:25` : addition directe, zéro conservé. | Créature niv.2, frappe « 0 » : **8 dégâts legacy / 2 nouveaux**. | Reproduire le repli `dmgBase || 6` dans ce cas. |
| **Bloquant — branche abrégée** | `main.js:6640` accepte les libellés normalisés ou inclus. | `domain/combats.ts:273` exige `b.nom === sheet.branch`, malgré le rapprochement tolérant disponible dans `oaths.ts`. | Fiche branche « Taille Double » : reconnue legacy ; branche complète « Branche B — Taille Double » rejetée par l’assemblage nouveau : **0 capacité**. | Utiliser `findBranch()` à l’assemblage du combattant. |
| **Bloquant — troisième branche custom** | `main.js:6619` conserve tout le tableau `branches`. | `oaths.ts:406` et `413` ne conservent que les deux premières. | Custom à 3 branches : **3 legacy / 2 nouvelles** ; capacité de branche C à 11 dégâts perdue. | Représenter et conserver toutes les branches héritées. |
| **Bloquant — migration avec croissance partielle** | `progression.js:65` fusionne croissance native et définition partielle. | `progression.ts:520` replie les composantes absentes du résolveur sur zéro. | Duelliste 1→2, résolveur `{pvN:9}` : maxima **39/56/22 legacy**, **39/50/20 nouveaux**. | Fusionner `growthFor(oathName)` avec le résultat partiel avant calcul. |
| **Bloquant — note de statut effacée** | `main.js:12827` : statut existant, note vide ⇒ ancienne note et métadonnées conservées. | `domain/characters.ts:1158` et `1163` remplacent note, auteur et date. | Gel déjà noté « bras gelé » ; repose sans note : **note conservée / effacée**. | Conserver le statut existant ; ne remplacer sa description que si une nouvelle note non vide est fournie. |
| **Bloquant — participation décimale** | `main.js:9371` : `parseInt` avant calcul. | `progression.ts:125` accepte la fraction ; schéma `src/lib/schemas/characters.ts:215` aussi. | Créature niv.3, **33,5 % : 10 XP legacy / 11 nouveaux**. | Tronquer la participation comme le legacy avant calcul et historisation. |
| **Majeur — surcharge custom complétée** | `main.js:1624` : le custom remplace intégralement le natif ; `9313` utilise ses champs tels quels. | `oaths.ts:428` complète croissance, dégâts et branches depuis le natif. | Custom Duelliste `{pvN:9}` ; montée : **39/NaN/NaN legacy**, **39/56/22 nouveaux**. | Respecter le remplacement intégral ; traiter la réparation des champs absents comme une divergence explicitement décidée. |
| **Majeur — quantité d’apparition** | `main.js:14042` lit `spawnMin/spawnMax`, pas `qtyMin/qtyMax`. | `spawn.ts:313` donne priorité à `qtyMin/qtyMax`. | Niv.3 Agressif, `qtyMin=qtyMax=5` : plage **1–2 legacy / 5–5 nouvelle**. | Reproduire les champs effectivement lus par le legacy ; ne pas activer implicitement les anciennes bornes inutilisées. |
| **Majeur — créatures archivées** | `main.js:14100` exclut seulement les masquées. | `spawn.ts:276` exclut aussi les archivées. | Pool contenant une créature visible archivée : **1 candidate / 0**. | Conserver le filtre hérité pour le mode de simulation fidèle. |
| **Majeur — comportement numérique** | `main.js:7453` laisse « 4 » tel quel ; multiplicateur par défaut 1. | `spawn.ts:88` traduit « 4 » en Agressif, multiplicateur 1,12. | Niv.3, poids implicite : **119 legacy / 133 nouveaux**. | Reproduire `cBehaviorLabel` ; ne pas ajouter une conversion numérique absente de cette fonction. |
| **Majeur — drop sur KO de statut** | `main.js:12515` inflige le saignement sans ouvrir de drop ; déclenchement à `12249` sur KO d’attaque. | `combat/resolve.ts:260` crée un drop après le tick létal. | Créature à **3 PV**, saignement : KO dans les deux ; **0 drop legacy / 1 nouveau**. | Déclencher le drop uniquement dans les circonstances héritées. |
| **Majeur — crédit différé des drops** | `main.js:12570` crédite immédiatement la fiche à l’attribution, y compris un drop auparavant différé. | `combat/outcomes.ts:36` marque l’attribution ; crédit seulement à la clôture, `domain/combats.ts:699`. | Attribution pendant combat : stock **0→1 immédiatement legacy**, reste **0 jusqu’à clôture** nouveau. | Créditer atomiquement à l’attribution et mémoriser le crédit pour éviter une seconde attribution à la clôture. |
| **Majeur — retrait pendant résolution** | `main.js:12444` vide les déclarations mais conserve la phase et généralement le curseur. | `combat/state.ts:287` recommence une déclaration au premier vivant. | Retrait en phase résolution : **resolution legacy / declaration nouvelle**. | Reproduire les changements précis de phase et de curseur hérités. |
| **Majeur — annulation d’ajustement** | `main.js:12526` photographie avant ajustement ; `11036` annule le dernier geste. | `combat/state.ts:361` ne photographie pas ; `resolve.ts:278` revient à la dernière résolution. | Après frappe puis −5 EP : annulation legacy ⇒ **round 2, ennemi 87 PV, EP 44** ; nouvelle ⇒ **round 1, ennemi 100 PV, EP 50**. | Ajouter l’historique des gestes photographiés hérités ; distinguer cette annulation de celle d’un round. |
| **Majeur — droits sur statuts/équipement** | `main.js:1920`, `12812`, `saveStats` : `manage_stats`, réservé admin dans l’outil. | `domain/characters.ts:1149`, `1252` : `characters.stamp`, accordé MJ dans `permissions.ts:60`. | MJ : **0 opération proposée legacy / pose de statut et changement de casque autorisés** nouveaux. | Réserver ces commandes au droit admin équivalent à `manage_stats`. |
| **Majeur — export numérique et historique** | `main.js:12667` exporte `s.round` ; `12673` tout le journal ; `12696` les notes. | `src/lib/ui/table/texte.ts:157` retire un round si inactif ; `165` omet le journal importé privé ; notes absentes. | État arrêté `round=2`, archive avec un impact −8 PV : export **2 rounds et impact legacy / 1 round sans impact nouveau**. | Ajouter un export staff fidèle : compteur, journal intégral et notes ; préserver les restrictions de projection joueur séparément. |
| **Mineur — coût par défaut Déchaînée** | `main.js:12035` : `opts.emCost || 0`. | `combat/actions.ts:255` : défaut 5 si coût absent. | Déclaration sans `emCost` : **0 EM legacy / 5 nouveaux** ; coût explicite 0 concordant. | Défaut 0 dans la déclaration ; laisser le palier fournir ses 5 EM. |
| **Mineur — durée manuelle plafonnée** | `main.js:12495` impose seulement un minimum de 1. | `combat/statuses.ts:117` plafonne à 10. | Durée demandée **11 : 11 legacy / 10 nouvelle**. | Retirer le plafond moteur ; une limite de saisie UI ne remplace pas la règle exécutée. |

**3. Règles héritées absentes du nouveau moteur**

- Relecture des fiches et du bestiaire lors de la reprise d’un combat : capacités de branche et tables de drops.
- Conservation des branches custom au-delà des deux premières.
- Annulation du dernier ajustement, retrait de combattant, retrait de statut ou retouche de déclaration avec leurs snapshots hérités.
- Suppression dédiée d’un drop en attente, équivalente à `main.js:12613`.
- Export staff intégral du journal hérité et des notes MJ.

Le repos court existe bien dans la nouvelle interface : retrait de `ceil(EP max × 0,5)`. Il n’est pas absent.

**4. Règles inventées**

- Import automatique des statuts IRP avec une durée de **2 tours**.
- Attribution de tours aux invocations ajoutées après démarrage.
- Proposition automatique d’XP à la clôture et drops sur KO de statut.
- Exclusion des créatures archivées des apparitions ; interprétation numérique des comportements ; activation de `qtyMin/qtyMax`.
- Complétion des Serments custom incomplets et limitation à deux branches.
- Dans `combat/projection.ts:40`, états narratifs aux seuils **66 % / 33 %**, sans équivalent dans le simulateur hérité. Ils n’affectent pas ses calculs de combat.

**5. Les 10 tests prioritaires à ajouter**

Les sorties suivantes sont celles du **code legacy**, y compris ses défauts.

| # | Entrées | Sortie attendue |
|---|---|---|
| 1 | Fiche 30 PV, Étourdi + Saignement ; ajout au combat, round sans attaque. | **0 statut importé, 3 actions, 30 PV** après résolution. |
| 2 | Évocateur niv.2 invoque Tortue 10 PV / base 6 ; adversaire 100 PV ; round suivant. | Ordre toujours **2 entrées** ; invocation sans tour ; adversaire **100 PV**. |
| 3 | Duelliste niv.1, 20 XP, 1 PV ; créature niv.2 KO ; clôture seule. | **Gain XP 0 ; niv.1, 20 XP, 1 PV**. |
| 4 | Archive active : Duelliste niv.2, fiche « Taille Double » ; créature avec table Blanche 1–100 ; RNG 0,5. | Capacité **2×7 dégâts, 5 EM** ; D100 **51**, **1 Gemme Blanche** attribuable. |
| 5 | Archive idle inactive avec une ligne d’initiative, 2 combattants et aucune résolution. | Démarrage accepté : **round 1, active=true, ordre de 2**. |
| 6 | Duelliste niv.2 ajouté avec base 11, définition actuelle passée à 20 ; puis créature niv.2 à base 0. | Frappes respectives **22** et **8 dégâts**. |
| 7 | Branche stockée « Taille Double » ; autre custom avec branches A/B/C, C contenant `9+Niv` au niv.2. | **1 capacité** dans chaque cas ; Taille Double **2×7**, branche C **11 dégâts**. |
| 8 | Migration Duelliste 1→2, maxima 30/50/20, courants 20/40/10, surcharge partielle `{pvN:9}`. | Maxima **39/56/22**, courants **29/46/12**. |
| 9 | Créature niv.3 Agressif, `qtyMin=qtyMax=5`, tirage quantité RNG 0,999. | Plage **1–2**, quantité **2**. Créature visible archivée : demeure candidate. |
| 10 | Gel existant avec note ; repose sans note. Récompense séparée niv.3 à 33,5 %. | Note, auteur et date conservés ; récompense **10 XP**, participation historisée **33 %**. |