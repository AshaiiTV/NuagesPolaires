**La stack cible est cohérente, sous réserve de valider l’ensemble des versions par un build Netlify réel.** Les risques principaux sont la migration des mots de passe, l’atomicité métier avec Neon HTTP et la conservation des garanties de concurrence. Aucun fichier modifié, aucune base distante contactée.

### 1. Les 12 risques techniques

Probabilités qualitatives estimées pour cette migration ; elles ne constituent pas des mesures de production.

| # | Risque | Probabilité | Impact | Parade concrète |
|---|---|---|---|---|
| 1 | Compatibilité Kit 2.63 / Svelte 5.56 / TS 6 / Vite 8 / adapter 6 | Moyenne | Build ou typage bloqué | Épingler les versions exactes, y compris plugin Svelte, Vitest, Drizzle et pilote Neon ; vérifier les peer dependencies sans `--force`, puis `npm ci`, `svelte-check`, tests et build sous Node 24. Les versions annoncées seules ne prouvent pas leur compatibilité. |
| 2 | Adapter et configuration héritée | Élevée | SSR absent, routes concurrentes, ancien endpoint encore accessible | Déclarer `adapter({ edge: false })`, aligner `publish` sur sa sortie, remplacer le build statique actuel ; retirer les anciennes fonctions actives au basculement. Vérifier le runtime Node 24 effectif et les surcharges dashboard. [Adapter officiel](https://svelte.dev/docs/kit/adapter-netlify). |
| 3 | Cold starts Netlify + réveil Neon + scrypt | Élevée | Connexion lente, saturation CPU/mémoire | Mesurer les latences à froid et p95 ; rapprocher région Functions et Neon, réduire imports et allers-retours, utiliser scrypt asynchrone avec budget mémoire explicite et limitation avant calcul. |
| 4 | Taille et durée des fonctions | Moyenne | 413, timeout, réponse incertaine après écriture | Plafonner les corps en octets, paginer archives et journal, limiter les requêtes ; exécuter migration/import massif hors requête web. Limites synchrones documentées : **60 s, 6 MB en requête/réponse bufferisée**. [Netlify](https://docs.netlify.com/build/functions/configuration/?fn-language=js). |
| 5 | Cookies, HTTPS et origine derrière Netlify | Élevée | Connexion perdue, OAuth cassé, contrôle CSRF erroné | Cookie `HttpOnly; Secure; SameSite=Lax; Path=/`, sans `Domain` ; vérifier `event.url.origin` sur domaine réel et preview. `Lax` convient au retour OAuth GET, contrairement au cookie `Strict` actuel. Tester création et suppression sur HTTPS. |
| 6 | Prerender et SSR mal séparés | Élevée | Données privées publiées ou contenu périmé | `prerender=false` pour espaces connectés et actions ; prerender seulement les contenus publics indépendants de session. Chronique/Codex vivants en SSR ou reconstruits explicitement. Aucun secret de production nécessaire au build public. |
| 7 | CSP sans `unsafe-inline` | Élevée | Hydratation, thèmes ou animations bloqués | `kit.csp.mode='auto'` : hashes au prerender, nonces au SSR ; CSS externe, supprimer handlers/attributs inline et transitions injectant des styles. Remplacer la CSP héritée ; vérifier aussi les headers SSR. Garder `frame-ancestors` en header HTTP pour le statique. [Configuration Kit](https://svelte.dev/docs/kit/configuration). |
| 8 | Transactions avec Neon HTTP | Élevée | Combat partiellement appliqué | Pas de transaction interactive JS avec `neon-http` : utiliser batch transactionnel prédéfini ou fonction SQL atomique pour les décisions dépendant des résultats. Un `UPDATE` affectant zéro ligne ne provoque pas automatiquement un rollback. [Drizzle/Neon](https://orm.drizzle.team/docs/connect-neon). |
| 9 | Drizzle + PGlite trop rassurants | Élevée | Courses et différences de pilote découvertes en production | Même schéma et migrations SQL, adaptateurs `pglite`/`neon-http` distincts ; tester SQL réel et rollback. Compléter par Neon isolé avec plusieurs connexions : le helper actuel remplace Neon et ne reproduit pas le transport HTTP ni toute la concurrence. |
| 10 | Playwright en CI | Élevée | Tests instables ou fausse recette | Version navigateur liée au lockfile, `playwright install --with-deps chromium`, serveur du build de production, fixtures isolées, un worker initialement, traces à l’échec. Tester aussi une preview HTTPS isolée. [CI officielle](https://playwright.dev/docs/ci). |
| 11 | Cache HTTP/CDN | Moyenne | Fuite entre utilisateurs, données périmées | `Cache-Control: private, no-store` sur HTML/données authentifiés, auth et reset ; aucun cache CDN partagé. Cache public uniquement sur réponses réellement identiques, invalidation après publication ; assets hashés immuables. Vérifier les réponses Netlify réelles. |
| 12 | Dates françaises et timezone | Élevée | Rendez-vous décalés, inscriptions fermées trop tôt | Instants en `timestamptz`, échanges ISO avec offset, affichage `fr-FR`/`Europe/Paris`. Dates civiles en `date` ; interprétation explicite des anciennes chaînes locales. Tester heure d’été/hiver et éviter tout parsing implicite `DD/MM/YYYY`. |

### 2. Authentification

- **Constat déterminant :** l’actuel reçoit `passHash=sha256:<hex>` du navigateur ; il stocke aussi `pbkdf2:<sel>:<hash>`, calculé sur les caractères hexadécimaux du SHA-256. Migrer uniquement `sha256:` casserait les comptes déjà renforcés.
- Le nouveau formulaire transmet le **mot de passe original sous HTTPS**. Vérifier les formats hérités : SHA-256 préfixé, hex nu accepté historiquement, et PBKDF2 avec les paramètres actuels (`100000`, SHA-512, 64 octets). Comparaison à temps constant après validation stricte du format.
- Après vérification réussie, calculer scrypt **sur le mot de passe original**, avec sel aléatoire individuel ≥16 octets. Stocker un format versionné contenant `N,r,p`, sel et dérivé ; fixer des plafonds de paramètres et `maxmem`. Calibrer sur Functions ; ne jamais rehacher directement le hash hérité pour prétendre avoir migré le mot de passe. [API Node](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback).
- Remplacement conditionnel sur ancien hash/version et création de session atomiques. Si reset ou révocation concurrente : refuser la session issue de l’ancienne vérification. Une panne technique ne devient pas « mauvais mot de passe » ; conserver le hash pour réessayer.
- Nouvelles inscriptions et resets : scrypt immédiatement. Comptes inactifs : migration au prochain login, puis éventuelle campagne de reset ; aucun traitement hors ligne ne récupère leurs mots de passe.
- **Recommandation : table `sessions`, pas JWT signé.** Cookie contenant un jeton opaque aléatoire de 32 octets ; table avec empreinte HMAC-SHA-256 sous `NP_SESSION_SECRET`, `account_id`, `session_version`, création, expiration absolue/inactivité, révocation et périmètre normal/reset. Secret à forte entropie, uniquement serveur.
- Charger session et compte dans `hooks.server.ts` ; vérifier expiration, révocation et `sessionVersion`, puis dériver les droits du compte actuel. Incrémenter la version lors de changement/reset de mot de passe et révocation globale ; préserver la déconnexion globale actuelle. Révocation individuelle par ligne possible.
- Au basculement, invalider les anciens JWT et expirer `np_session` ; une reconnexion ponctuelle est plus sûre qu’un pont JWT durable. Le mot de passe reste compatible.
- **CSRF :** conserver le contrôle d’origine Kit, `trustedOrigins: []`, mutations uniquement POST et autorisation dans chaque action. Pour endpoints JSON personnalisés : contrôle explicite d’origine, type de contenu strict, CORS fermé ; jeton CSRF lié à session si nécessaire. Tester sur build de production : Kit ne contrôle pas les origines en développement. [Kit](https://svelte.dev/docs/kit/configuration).
- **Brute force :** remplacer le JSON global `np_rate_auth` par des compteurs persistants par IP fiable Netlify et identifiant normalisé, incrémentés atomiquement ; conserver comme départ les 10 tentatives/15 minutes. Ajouter expiration/nettoyage, réponse générique, `Retry-After`, calcul factice pour compte inconnu après limitation. Retirer l’exception actuelle permettant aux admins une vérification après dépassement.
- **Reset admin :** secret aléatoire affiché une fois, empreinte seule en base, échéance d’une heure, consommation atomique au premier échange contre session restreinte. Celle-ci permet uniquement reset/état/logout ; finalisation consomme le parcours, remplace le hash et révoque les sessions dans la même transaction. Aucun secret dans logs ou stockage navigateur.
- **Discord optionnel :** `state` aléatoire à usage unique et expirant, PKCE si supporté, URI de retour exacte ; liaison via ID Discord unique et confirmation depuis un compte authentifié. Aucun rôle staff ni rapprochement automatique par pseudo/email.

### 3. Concurrence et transactions

Conserver `expectedVersion` obligatoire, HTTP 428 si absent et HTTP 409 `VERSION_CONFLICT` si périmé. Remplacer les MD5 par `version bigint NOT NULL DEFAULT 1`, exposé comme chaîne opaque pour éviter les limites numériques JavaScript.

```sql
UPDATE characters
SET journal = $1, version = version + 1, updated_at = now()
WHERE id = $2 AND version = $3
RETURNING version;
```

Zéro ligne retournée ⇒ conflit, sans écrasement ni rejeu automatique sur une version fraîche. Même principe pour suppression ; création avec version attendue `null` et `INSERT ... ON CONFLICT DO NOTHING`.

- Versionner **l’agrégat métier** : une modification d’inventaire/historique doit aussi incrémenter la version du personnage. Une inscription modifie la version de l’événement ; capacité et participation doivent être contrôlées ensemble.
- La granularité par personnage réduit les conflits entre joueurs. Elle ne reproduit pas la fusion actuelle champ par champ des comptes : utiliser des commandes ciblées, éviter qu’un `lastSeen` modifie la version de sécurité.
- **Fin de combat : transaction indispensable** pour archive, toutes les fiches concernées, progression/récompenses, historique et audit. Verrouiller dans un ordre stable, vérifier toutes les versions et les droits actuels avant application ; exclure les invocations comme aujourd’hui.
- Avec HTTP, privilégier une fonction SQL appelée une fois : elle lève une exception au moindre conflit, donc annule tout. Ajouter une clé d’idempotence unique de clôture pour empêcher les doubles récompenses après timeout. Un batch sans exception sur les conflits est insuffisant.
- Transactions également pour consommation + historique, inscription + capacité, compte + personnage, reset + révocation. Protéger le dernier admin par verrou partagé entre toutes les opérations de retrait ; des versions par compte seules ne suffisent pas.

### 4. Migration `np_store` → relationnel

1. **Inventaire exhaustif** des clés et formats ; schéma additif, conservation de `np_store` et copie source intacte. Classer chaque clé : migrée, conservée en JSONB, mise en quarantaine ou volontairement retirée du produit ; aucune suppression implicite du prototype RPG.
2. Script hors Functions, mode dry-run, étapes transactionnelles et reprise : registre avec version de migration et checksum source ; table de correspondance `(source_key, source_id/position, target_table, target_id, checksum)`, identités déterministes et contraintes uniques.
3. Idempotence : deuxième exécution identique sans changement ni doublon ; source différente ⇒ arrêt ou procédure explicite. Un `upsert` aveugle ne doit jamais écraser des modifications relationnelles postérieures.
4. Ordre : référentiels/serments/créatures → comptes et personnages → liaisons → inventaire/historique → événements/participations → archives → notifications/audit/thèmes. Installer les FK après résolution des dépendances cycliques.
5. Participations historiques par **nom** : correspondance uniquement si univoque ; homonymes et orphelins dans un rapport à résoudre. Dédupliquer archives détail/index/alias sans perdre les détails non référencés, y compris au-delà de 50 archives.
6. Vérifier comptes, formats de hashes, rôles, `sessionVersion`, liens, quantités, XP/niveaux, dates, visibilité et archives ; comparer les projections métier source/cible, pas seulement les nombres de lignes. Préserver `progressionVersion:1` sans appliquer deux fois les gains.
7. **Basculement recommandé : pause des écritures**, snapshot final, migration, vérification, déploiement, réouverture. Avant cela, comparaison des lectures en recette ; éviter le fallback automatique vers `np_store`, qui peut ressusciter données supprimées ou obsolètes. Pas de double écriture sans protocole atomique.
8. **Sans accès production :** réutiliser un snapshot logique déjà fourni ou des fixtures. `npm run backup:store -- --output <fichier>` nécessite explicitement `NP_BACKUP_SOURCE_URL` ; il ne crée pas un snapshot de production sans accès. `npm run backup:verify -- --input <fichier>` vérifie sa restauration dans PGlite.
9. Ce snapshot conserve `np_store` en JSONB textuel et `updated_at`, avec checksum et lecture cohérente ; il contient des secrets, doit rester privé et ne couvre pas les futures tables relationnelles. Étendre les fixtures du helper actuel aux anomalies, grands ensembles, hashes PBKDF2 et archives orphelines.
10. Tester migration deux fois, panne intermédiaire/reprise, contraintes, comparaisons et parcours sur PGlite, puis concurrence sur Neon isolé. **Rollback avant réouverture :** ancien déploiement + ancien store. Après nouvelles écritures : pause et migration inverse testée ou restauration avec rejeu ; republier simplement l’ancien site perdrait les nouveaux changements.

### 5. Checklist de mise en production

1. Versions exactes verrouillées ; Node 24 build/runtime vérifié ; typage, tests et build réussis.
2. Adapter Node, publication, routes et suppression des anciens endpoints validés sur preview.
3. Preview avec Neon et secrets dédiés ; `NETLIFY_DATABASE_URL`, `NP_SESSION_SECRET`, origine et OAuth au bon scope.
4. Migrations DDL hors requêtes ; rôle SQL applicatif restreint ; aucun secret embarqué dans le client.
5. Sauvegarde finale indépendante, restauration vérifiée, rapport de migration sans anomalie bloquante.
6. Connexions SHA-256/PBKDF2, scrypt, expiration, révocation, reset et OAuth testés.
7. Permissions de tous les rôles, données masquées, CSRF, CSP et cache vérifiés sur HTTPS réel.
8. Conflits simultanés, dernier admin, capacité événement et clôture atomique/idempotente testés sur Neon isolé.
9. Playwright sur build de production ; contrôle visuel 390/768/1440 ; latences à froid et tailles mesurées.
10. Pause des écritures, basculement coordonné front/API/données, surveillance et procédure de rollback répétée.