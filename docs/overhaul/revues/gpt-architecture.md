# Revue critique de l’architecture

**Architecture cohérente, mais validation de la fondation conditionnée aux corrections ci-dessous.**  
Les choix de transactions interactives, sessions opaques et permissions serveur sont solides ; leurs invariants restent insuffisamment spécifiés.  
Revue documentaire et vérification du legacy uniquement : aucun fichier modifié, état intermédiaire de `src/` ignoré.

## 1. Erreurs ou risques bloquants

**B1 — §1, §2, §9 : cycle de vie Neon non défini.**  
`drizzle-orm/neon-serverless` avec `Pool` convient aux transactions interactives ; Node 24 dispose du WebSocket natif, donc `ws` n’est pas intrinsèquement nécessaire. Le risque est un pool global réutilisé sans politique de fermeture, ou un pool créé pour chaque accès DB.  
**Correction :** un contexte DB par requête, partagé entre hook et domaines, ouvert paresseusement ; pool borné, erreurs traitées, clients libérés et `await pool.end()` en `finally`. Fixer délais de connexion/requête et mesurer cold start + réveil Neon + scrypt. [Pilote Neon officiel](https://github.com/neondatabase/serverless).  
Vérifier Node 24 **effectif** sur Functions, y compris une éventuelle surcharge `AWS_LAMBDA_JS_RUNTIME` ; `NODE_VERSION` seul ne neutralise pas celle-ci. [Configuration Netlify](https://docs.netlify.com/build/functions/configuration/?fn-language=js).

**B2 — §1, §9 : absence d’URL ⇒ PGlite, y compris potentiellement en production.**  
Une variable mal configurée pourrait ouvrir une base volatile ; §9 accepte `NETLIFY_DATABASE_URL`, absent du sélecteur §1. Un import conditionnel runtime, même dynamique, peut encore embarquer PGlite/WASM dans les fonctions.  
**Correction :** résoudre explicitement les deux variables, refuser leur divergence et toute URL absente/PGlite en production. Séparer les entrées production/test par alias de build ; inspecter l’artefact Netlify pour prouver l’absence de PGlite et de seed.

**B3 — §3.2 : identité des objets trop ambiguë.**  
Les identifiants hérités d’inventaire sont locaux au personnage ; deux fiches peuvent contenir `potion`. Une PK globale `character_items.id` empêcherait leur migration.  
**Correction :** PK `(character_id, id)`, ou identifiant technique global avec `legacy_id` et unicité `(character_id, legacy_id)` ; toute consommation recherche l’objet dans le personnage issu de la session.

**B4 — §3 : contraintes relationnelles annoncées, mais non décidées.**  
Manquent les PK explicites, nullabilités et politiques de suppression ; `beasts.zones text[]` ne garantit aucune FK. Une suppression peut bloquer ou détruire archives et traces.  
**Correction :** documenter chaque FK : `CASCADE` pour sessions/objets/participations dépendants ; `SET NULL` pour acteurs et propriétaire d’archive avec libellé conservé ; `RESTRICT` pour référentiels encore utilisés. Déclarer `oaths.evolves_from` FK et une table `beast_zones`.  
Imposer `UNIQUE(lower(pseudo))`, liaison personnage unique, grants cohérents et `CHECK` sur ressources, quantités, capacité, croissance, poids et révisions. Indexer les FK et lectures : sessions par compte/expiration, historique `(character_id, ts, id)`, participants par personnage, combats propriétaire/date, observations créature/statut.

**B5 — §3.6, §6 : clôture non protégée contre une course.**  
`closed_at` est utilisé mais absent du schéma ; lire « non nul ⇒ refus » puis écrire permet deux clôtures concurrentes.  
**Correction :** ajouter `closed_at`, réclamer atomiquement la clôture par `UPDATE … WHERE closed_at IS NULL AND revision = … RETURNING`, dans la transaction ; zéro ligne ⇒ exception/rollback. Verrouiller les personnages dans un ordre stable, exclure les invocations et garantir une seule application des récompenses.

**B6 — §6 : la liste des transactions ne suffit pas à garantir les invariants.**  
Capacité lue puis inscription insérée peut dépasser la limite ; le contrôle du dernier admin doit aussi couvrir suppression et récupération. L’autorisation chargée dans le hook peut devenir périmée avant l’écriture.  
**Correction :** verrouiller l’événement avant contrôle/insertion ; consommation et masquage incrémentent la révision du personnage. Suppression vérifie compte **et** personnage ; toutes les sorties du rôle admin utilisent un verrou commun puis recomptent. Revalider acteur/session sous verrou avant les mutations sensibles ; audit métier dans la même transaction.

**B7 — §3.1, §4 : durée et concurrence des sessions reset incomplètes.**  
HMAC du jeton, cookie `Lax` et `session_version` sont corrects ; `Lax` exige des mutations exclusivement POST avec contrôle d’origine. Mais la règle générale de 30 jours ne doit pas s’appliquer au reset.  
**Correction :** expiration reset ≤ échéance du secret et ≤ 1 h ; vérifier aussi `force_password_reset/reset_expires_at` à chaque accès. Finalisation atomique : consommation, nouveau hash, effacement du secret, incrément de version, session pleine. Logout invalide/rejoué reste idempotent sans nouvelle révocation. Secret HMAC aléatoire à forte entropie, politique de rotation explicite.

**B8 — §4 : compatibilité des mots de passe correcte, détails décisifs manquants.**  
Le legacy applique PBKDF2 aux caractères hex SHA-256 **sans préfixe**, avec le sel hex passé comme **chaîne**, pas décodé en octets (`legacy/netlify/functions/auth.js`, fonctions `pbkdf2Hash/verifyPassword`).  
**Correction :** reproduire exactement cette convention ; scrypt porte ensuite sur le mot de passe original. Valider strictement formats/longueurs et borner les paramètres scrypt avant calcul asynchrone. Après vérification hors transaction, verrouiller/revérifier hash et version avant remplacement + session ; un reset concurrent doit empêcher cette connexion.

**B9 — §7 : registre insuffisant pour une migration réellement idempotente.**  
Aucune clé unique ni identité stable des historiques sans ID ; dédoublonner les combats uniquement par `id` peut fusionner des propriétaires différents.  
**Correction :** clé unique incluant source/propriétaire/identité et version du transformateur ; IDs déterministes ; écriture cible et registre atomiques, verrou de migration. Priorité détail > liste > index, collision divergente à arbitrer ; une cible modifiée après import n’est jamais écrasée. Résolution ambiguë de propriétaire ⇒ quarantaine, jamais attribution arbitraire.

**B10 — §3.7, §7 : perte des statistiques d’apparitions historiques.**  
L’ancien store conserve des totaux cumulés mais seulement 24 derniers tirages ; recalculer les totaux depuis `spawn_runs` ne reconstitue pas le passé.  
**Correction :** migrer une base cumulative par créature et `totalDraws`, puis ajouter les nouveaux tirages ; distinguer ces compteurs des runs effectivement disponibles.

**B11 — §4, §9 : CSP des pages prérendues et publication périmée.**  
`auto` et `style-src unsafe-inline` sont cohérents avec les transitions ; laisser Kit générer nonce/hash, sans nonce littéral. Mais `frame-ancestors` est ignoré dans la CSP `<meta>` du prerender. [Documentation SvelteKit](https://svelte.dev/docs/kit/configuration#csp).  
**Correction :** header HTTP Netlify pour `frame-ancestors`, ajouter `object-src 'none'`, `base-uri 'none'`, `form-action 'self'`. Éviter une seconde CSP qui bloque l’hydratation. Bestiaire/Serments modifiables : SSR ou reconstruction garantie après publication/masquage, sinon le contenu retiré reste public.

## 2. Ce qui manque — huit points

1. **Conservation legacy :** grants portés par les personnages, champs inconnus comptes/personnages/événements, auteur textuel `createdBy`, métadonnées des lots `np_syslog_archive` ; mapping ou quarantaine explicite.
2. **Serments inconnus :** une FK stricte doit préserver `Mizu` et autres noms non catalogués via référentiel importé à croissance nulle ; préserver les variantes de branches.
3. **Archives :** schéma versionné de `state`, mapping `active/_draft/_inProgress`, archives index-only et `owner_label` explicitement déclaré.
4. **Révisions :** portée des agrégats thèmes/zones/observations/scènes/épingles ; mises à jour enfants et `updated_at` ; `last_seen` monotone sans conflit métier artificiel.
5. **Contrats des actions :** changement/suppression de compte, liaison/déliaison, notifications d’événement, choix de thème ; clarifier le GET de §6 face au « POST uniquement » de §4.
6. **Permissions :** trancher staff lié à son propre personnage, avatar staff et droits du participant sur clôture/résumé de scène ; tester propriété, champs et projection.
7. **Procédures :** sauvegarde/restauration relationnelle, entretien sessions/rate limits, DDL sérialisé et isolé des previews ; rollback après réouverture avec nouvelles écritures.
8. **Recette réelle :** Neon multi-connexions + preview HTTPS ; `npm run preview` ne valide pas Functions. Reprendre aussi isolation de session et confirmation serveur de l’audit 06 §3.B, pas seulement les exigences `[S]`.

## 3. Simplifications possibles sans perte

1. Garder `character_history.dismissed` plutôt qu’une table de masques : suffisant avec un propriétaire unique et contrôle de révision.
2. Stocker l’historique en texte brut et supprimer `{@html}`/sanitiseur maison pour ces textes ; décoder les anciennes entités une seule fois.
3. Garder un seul pilote transactionnel en production ; HTTP supporte aussi des transactions non interactives, mais ajouter deux chemins n’est pas nécessaire ici.
4. Remplacer les sauvegardes génériques de comptes par commandes ciblées ; préserver les effets attendus sans reproduire la fusion de collections.
5. Prérendre seulement l’éditorial ; servir les référentiels administrables en SSR pour simplifier leur invalidation.

## 4. Tests à faire passer pour la fondation — douze maximum

1. Les mêmes migrations installent PGlite et Neon ; contraintes, FK et suppressions ont les résultats spécifiés.
2. Deux inscriptions `Alice/alice` ⇒ un succès, un 409 ; deux inventaires avec `potion` migrent sans collision.
3. Le bundle Netlify ne contient ni PGlite/WASM ni seed ; URL/secrets absents en production ⇒ échec explicite.
4. Sous Node 24 déployé, transaction réussie/échouée et requêtes répétées libèrent les connexions ; latences à froid mesurées.
5. Vecteurs legacy PBKDF2/`sha256:`/hex nu vérifiés ; rehash scrypt correct ; hash malformé rejeté sans exception ni calcul démesuré.
6. Reset concurrent à un login ⇒ aucune session fondée sur l’ancien hash ; aucun secret/hash dans réponse, logs ou données client.
7. Jeton modifié, expiré ou version révoquée ⇒ refus ; reset expiré ⇒ refus ; finalisation unique ; logout rejoué ⇒ 200.
8. Chaque rôle passe la matrice des droits et échoue sur accès transversal/champs interdits ; révocation concurrente bloque la mutation sensible.
9. Version absente ⇒ 428 ; périmée ⇒ 409 ; consommation unique et rollback total, historique/audit compris.
10. Sur Neon, inscriptions concurrentes respectent la capacité ; retraits concurrents préservent un admin ; suppression conflictuelle préserve compte/personnage.
11. Double clôture ⇒ une seule application ; migration répétée/interrompue conserve archives, progression, grants, statistiques et modifications postérieures.
12. Sur preview HTTPS : cookie, CSRF, CSP SSR/prerender, projection Table, cache privé et rejet des réponses d’une ancienne session passent.