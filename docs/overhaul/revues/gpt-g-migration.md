Paquet G livré : migration transactionnelle, normaliseurs, rapport Markdown, deux scripts CLI, fixture fictif et 33 tests.

Fichiers écrits : `src/lib/server/legacy/**`, les deux scripts assignés, `tests/fixtures/np-store-demo.json` et les deux entrées autorisées de `package.json`. Les [signatures exportées et décisions](C:/Users/sacha/NuagesPolaires/src/lib/server/legacy/README.md) sont documentées, notamment :

```ts
migrateSnapshot(db: Db, snapshot: Snapshot, options: { dryRun: boolean }): Promise<MigrationReport>
```

Vérifications :

- Vitest : **33/33 tests**, 3 fichiers, code 0.
- `svelte-check` : **aucune erreur dans mes fichiers** ; code 1 global, 6 erreurs et 3 avertissements hors paquet G.
- Génération du fixture et migration CLI en dry-run : code 0, projections conformes, rollback intégral.

Adaptations : IDs des récits qualifiés par propriétaire, cumuls d’apparitions corrigés du double comptage, rate-limits transitoires ignorés. L’entrée URL du store évoquée dans l’architecture reste non implémentée ; la CLI accepte le fichier demandé.

Aucune question ouverte pour ce paquet.