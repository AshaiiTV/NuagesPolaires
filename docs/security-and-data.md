# Sécurité et données — v298 publiée

Les corrections conservent la table `np_store` et ses collections JSON. La fusion de l'XP fait évoluer les champs de progression des personnages selon le contrat de [fusion-xp.md](fusion-xp.md). Les changements de contrat de l'API doivent être livrés avec le front correspondant. Aucun script de migration ni aucune écriture dans la base réelle n’a été exécuté pendant leur préparation. La vérification d’infrastructure et la sauvegarde utilisent des transactions explicitement en lecture seule.

## Sessions et récupération

Chaque compte utilise `sessionVersion`, initialement 0 pour les comptes historiques. Le serveur la vérifie à chaque appel authentifié. Changement/récupération de mot de passe et déconnexion l'incrémentent : les anciens cookies sont alors refusés. La déconnexion retire les sessions du compte sur ses autres appareils également.

Une réinitialisation admin fournit un mot de passe aléatoire unique, affiché une seule fois dans une fenêtre temporaire avec son échéance (une heure). Il n'est pas ajouté aux logs ou au stockage local. L'admin doit le communiquer au propriétaire par un canal approprié. La session obtenue ne peut que vérifier son état, terminer la réinitialisation ou se déconnecter ; les données privées et les autres actions sont refusées. Après changement, ce secret et la session de récupération ne sont plus utilisables.

Les comptes historiques marqués `forcePasswordReset` sans `resetExpiresAt` valide doivent recevoir une nouvelle réinitialisation admin, ou passer par la procédure de récupération d'environnement si l'accès admin est perdu. Les connexions normales historiques restent compatibles.

## Lectures et permissions

Les clés publiques sont explicites. Les créatures masquées/archivées, les événements masqués et les notes admin/MJ/staff sont retirés des lectures publiques et joueur. Les bundles staff incluent les contenus complets nécessaires à l'administration. Les comptes ne quittent le serveur que sans leur hash de mot de passe.

Les opérations génériques `set`/`delete` ne modifient plus les comptes ; les suppressions des collections critiques sont refusées. Un MJ ne peut supprimer des personnages existants ni changer leur identité, serment ou journal. La progression et les statistiques de combat restent permises pour préserver les mécaniques historiques : elles devront être remplacées par des opérations métier calculées au serveur dans une prochaine étape.

`patch_own_player` accepte uniquement `journal` et `avatar` pour le personnage associé au demandeur, sans altérer les autres fiches. Il n'ouvre pas l'écriture générique de toute la collection aux joueurs.

## Écritures et conflits

### Actions du joueur — reprise du 23 septembre 2026

Trois commandes dédiées complètent les modifications du journal et de l'avatar :

- `consume_own_item` : retire une unité d'un objet existant du personnage lié et ajoute une entrée d'historique échappée côté serveur, sans changer ses statistiques.
- `dismiss_notifications` : masque une notification existante ou toutes les notifications du personnage, sans supprimer l'historique.
- `set_event_participation` : inscrit/désinscrit le personnage lié, en vérifiant visibilité, date, capacité et révision des événements.

Le serveur dérive le personnage et son nom depuis la session ; un identifiant de personnage, une quantité ou un nom supplémentaire fourni dans ces commandes est refusé. Elles nécessitent `expectedVersion` et ne donnent aucun droit d'écriture générique aux joueurs. Les réponses sont filtrées selon le rôle. Les inscriptions historiques restent identifiées par nom : les homonymes sont refusés avec une explication ; renommer un personnage ne migre pas ses inscriptions anciennes.

L'interface applique ces changements uniquement après confirmation, bloque les doubles clics et ignore les réponses d'une session terminée. Les refus métier sans écriture permettent une nouvelle tentative ; un conflit de révision ou une réponse incertaine impose de recharger les données. Une sauvegarde complète préparée avant une action dédiée ne peut pas réutiliser la révision de celle-ci pour effacer ses effets.

Le journal du personnage reste lisible par son propriétaire, les MJ et les administrateurs ; le texte de l'interface indique désormais ce périmètre. Les connexions et les actions dédiées sont auditées sur le serveur. Les joueurs et designers ne tentent plus d'écrire le journal système réservé aux MJ/administrateurs.

Les lectures DB et les bundles renvoient une version opaque par clé. `set`, `delete` et `patch_own_player` exigent `expectedVersion` ; `null` signifie une clé encore absente. La condition est vérifiée dans la requête SQL d'écriture. Une version périmée donne HTTP 409 `VERSION_CONFLICT`, sans remplacement de la donnée concurrente. Le hash MD5 sert ici d'identifiant de contenu, pas de protection cryptographique de mot de passe.

Les comptes gardent leur format tableau, mais le serveur fusionne uniquement les champs modifiés à partir d'un instantané d'origine, puis utilise une comparaison atomique. Les changements concurrents compatibles sont conservés ; les changements incompatibles et les droits modifiés entraînent un conflit. La suppression personnelle du compte et de son personnage est effectuée dans une seule opération SQL contrôlée.

Le client ne relance pas automatiquement une écriture devenue obsolète. Une erreur laisse le travail non confirmé en mémoire ; il faut en conserver une copie avant de recharger. Une page hors ligne n'annonce pas une sauvegarde serveur réussie.

## Personnalisation (v298)

`self_set_theme` résout les identifiants via le catalogue commun, vérifie la possession du compte et de son personnage, les blocages et les distributions actives. Le thème sélectionné n’est jamais une preuve de possession. Les thèmes possédés restent utilisables après masquage ou fin de saison ; les conditions Early Clouds et les blocages restent applicables. Les rôles staff conservent leur accès aux thèmes connus.

La confirmation compare atomiquement les versions des comptes, personnages et définitions de thèmes. Les droits sont relus si une version change. Une révocation ou un blocage concurrent réévalue également le thème sélectionné. Les réponses de sélection n’émettent aucun cookie, pour ne pas remplacer une session établie pendant l’attente. Le client ne modifie sa préférence qu’après un succès confirmé pour la même session.

## Archives et imports

Les archives `combat_arc_rec_…` sont des objets ; les index et listes de compatibilité sont des tableaux. Les détails sont enregistrés avant la publication de l'index. Chaque sauvegarde conserve la révision de son instantané initial ; deux sauvegardes incompatibles ou une actualisation intermédiaire entraînent un conflit plutôt qu’un écrasement. Le test navigateur conserve et relit 55 archives, au-delà des 50 détails de la liste de compatibilité.

Les anciennes archives déjà perdues ne peuvent pas être recréées par une correction de code. Les alias et détails non référencés sont conservés pour faciliter une récupération ultérieure ; retirer une archive d'une liste n'est pas une purge définitive de tout son historique en base.

L'export JSON de l'interface est partiel. L'import traite personnages, bestiaire et serments, ignore les comptes et affiche quelles collections ont été confirmées si une étape échoue. L'import de plusieurs collections reste séquentiel, non transactionnel. Il ne remplace pas une sauvegarde/restauration PostgreSQL complète.

## Rendu et stockage navigateur

Les URL d'images sont validées ; les interpolations d'attributs et de chaînes JavaScript des parcours corrigés sont échappées. Les avatars dangereux hérités ne sont pas exécutés par le rendu testé. La CSP conserve `unsafe-inline` à cause des gestionnaires historiques : retirer ces derniers et compléter les tests sur tous les rendus sera une étape distincte.

Les nouvelles données privées (comptes, fiches, logs, archives et données staff d’apparition) ne sont plus écrites en localStorage. Les anciens caches privés sont purgés au démarrage et à la déconnexion, sauf les anciennes copies d’archives de combat qui peuvent être les seules restantes. Ces copies sont isolées du fonctionnement courant : après connexion, leur propriétaire peut télécharger une copie JSON puis confirmer séparément leur effacement. Elles restent présentes sur cet appareil tant que cet effacement n’a pas été confirmé, sans réimport automatique. Le téléchargement ne constitue pas une restauration des archives serveur.

Les réponses réseau et transitions de connexion sont liées à la session qui les a déclenchées. Une réponse tardive ne peut rétablir les caches ou l’identité après déconnexion ou connexion d’un autre compte.

## Combat, progression et prototype RPG

La fin de combat exclut les invocations de la synchronisation des fiches de leurs propriétaires. Elle garde l’instantané et la révision des personnages avant l’attente d’archivage, puis refuse une écriture si la fiche, sa révision, sa file de sauvegarde ou la session ont changé. Archive et fiches restent deux opérations distinctes : un échec partiel est annoncé. Les gains des niveaux utilisent les définitions de serments effectivement en vigueur, y compris les serments personnalisés.

La progression du compagnon utilise uniquement `level`, `xp` et `xpMax`, avec `progressionVersion: 1`. Les anciennes fiches sont converties sans addition des deux progressions : le niveau le plus avancé est retenu, puis la meilleure fraction d'XP à niveau égal. Les capacités du serment, les statistiques et les récompenses de combat ou de gemmes utilisent cette progression commune. La conversion est idempotente ; son application répétée et la réimportation d'une fiche déjà convertie n'ajoutent aucun gain. Les sauvegardes existantes et les anciens libellés d'historique restent des traces de leur époque. Les détails et limites figurent dans [fusion-xp.md](fusion-xp.md).

Le prototype RPG de la v295 reste disponible. Les nouvelles sauvegardes authentifiées restent en mémoire et sur le serveur, avec une version propre à chaque personnage : une modification d’un autre compte ne doit pas être effacée. Les anciennes copies locales du prototype sont conservées sans réimport automatique, car leur propriétaire n’était pas identifié. Les règles et récompenses de ce prototype restent calculées dans le client et ne constituent pas encore une économie multijoueur vérifiée au serveur.

## Vérification et travail restant

`npm test` utilise des comptes fictifs et PostgreSQL en mémoire. PGlite vérifie la syntaxe/les opérations JSONB et les conditions SQL, mais sa connexion unique ne reproduit pas toute la concurrence d'un cluster Neon ; la recette finale devra utiliser une base PostgreSQL isolée. `npm run test:browser` utilise le vrai code front et les handlers branchés sur cette base locale. Les polices externes sont bloquées pendant les captures de test.

À traiter ensuite : correction des contextes Netlify, environnement PostgreSQL distant isolé, vérification de la rétention des sauvegardes Neon natives, recherche des archives historiques manquantes, opérations métier serveur pour XP/statistiques, tests de toutes les mécaniques de combat/thèmes, consolidation des modules et mesure des performances du bundle public. Les requêtes publiques parcourent encore l'ensemble de `np_store` pour certains agrégats.

Le build utilise Node 24 LTS et publie uniquement `dist/`. Node 20 est en fin de vie selon le [calendrier Node.js](https://nodejs.org/en/about/previous-releases). Le choix de version est compatible avec la [configuration actuelle du runtime Netlify](https://docs.netlify.com/build/functions/configuration/#nodejs-version-for-runtime) ; une éventuelle surcharge existante dans le dashboard reste à vérifier lors de la recette de déploiement.
