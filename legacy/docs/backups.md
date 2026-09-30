# Sauvegardes logiques de np_store

Le JSON exporté depuis l’interface utilisateur reste partiel. Les commandes suivantes sauvegardent toutes les entrées de la table applicative `public.np_store`, y compris les comptes, paramètres privés, archives et personnages RPG.

## Export

Fournir la connexion Neon uniquement dans la variable d’environnement `NP_BACKUP_SOURCE_URL` du processus. Le script n’utilise jamais implicitement `DATABASE_URL` ou la configuration de production. Utiliser un emplacement privé, hors du dépôt :

```sh
npm run backup:store -- --output /chemin/prive/np-store-nouvelle-date.json
```

Le fichier doit être nouveau ; un fichier existant ou un lien symbolique est refusé. Le script vérifie le schéma attendu et l’absence de RLS sur la table, puis lit dans une transaction `RepeatableRead` en lecture seule. Le fichier est créé avec les permissions `0600`, ses nouveaux répertoires avec `0700`. Aucun secret de connexion n’est écrit dans le fichier ou les messages.

Ce fichier contient des données privées et des hashes de mots de passe : le conserver dans un emplacement protégé et sauvegardé. Ce format ne remplace pas un `pg_dump` complet des objets PostgreSQL et ne configure aucune rétention automatique.

## Vérification de restauration

```sh
npm run backup:verify -- --input /chemin/prive/np-store-nouvelle-date.json
```

Cette commande ne prend aucune URL de destination. Elle vérifie le format, l’empreinte d’intégrité, le nombre d’entrées et l’unicité des clés, puis restaure uniquement dans une base PGlite neuve en mémoire. Elle relit et compare intégralement le résultat avant de fermer cette base. Aucune restauration en production n’est incluse dans cet outil.

## Format

`np-store-backup-v1` contient `exportedAt`, `valueEncoding: "postgresql-jsonb-text"`, `count`, `rows` et `sha256`. Chaque ligne conserve `key`, `value` sous forme de texte JSONB PostgreSQL, et `updated_at` sous forme de texte PostgreSQL ou `null`. Ces chaînes préservent les grands nombres et les microsecondes. L’empreinte couvre tous les champs de l’enveloppe sauf `sha256`, avec un ordre canonique des propriétés.

Le [rapport de vérification du 21 septembre](infrastructure-review-2026-09-21.md) décrit le snapshot réel créé lors de la reprise et les points restant à vérifier dans Neon.
