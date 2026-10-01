Paquet H livré dans les seuls chemins assignés. Clôture atomique, conséquences tamponnées, projection joueur, récits filtrés, apparitions, publications et endpoint ETag sont implémentés.

Fichiers écrits :

- Domaines : [combats.ts](/C:/Users/sacha/NuagesPolaires/src/lib/server/domain/combats.ts), [spawn.ts](/C:/Users/sacha/NuagesPolaires/src/lib/server/domain/spawn.ts), [publications.ts](/C:/Users/sacha/NuagesPolaires/src/lib/server/domain/publications.ts), avec leurs trois fichiers `.spec.ts`.
- Schémas et vues : [combats.ts](/C:/Users/sacha/NuagesPolaires/src/lib/schemas/combats.ts), [spawn.ts](/C:/Users/sacha/NuagesPolaires/src/lib/schemas/spawn.ts), [publications.ts](/C:/Users/sacha/NuagesPolaires/src/lib/schemas/publications.ts).
- Endpoint : [+server.ts](/C:/Users/sacha/NuagesPolaires/src/routes/api/table/[id]/etat/+server.ts) et [etat.spec.ts](/C:/Users/sacha/NuagesPolaires/src/routes/api/table/[id]/etat/etat.spec.ts).

Fonctions exportées : toutes prennent d’abord `db: Db, actor: Actor | null` et renvoient une `Promise`, sauf `listHomeLeaves(db)`.

| Fonction et dernier argument | Résultat |
|---|---|
| `listTables(input: { status? })` | `TableRowView[]` |
| `createTable(input: CreateTableInput)` | `TableView` |
| `getTable(id: string)` | `TableView` |
| `saveTable(input: SaveTableInput)` | `TableRowView` |
| `setShowEnemyNumbers(input: TableFlagInput)` | `TableRowView` |
| `setVisibleToParticipants(input: TableFlagInput)` | `TableRowView` |
| `getPlayerTable(id: string)` | `PlayerTableView` |
| `closeTable(input: CloseTableInput)` | `RecitRowView` |
| `listRecits(input: { page?, search? })` | `RecitRowView[]` |
| `getRecit(id: string)` | `RecitView` |
| `recitAsText(id: string)` | `string` |
| `drawSpawn(input: DrawSpawnInput)` | `SpawnRunView` |
| `spawnHistory()` | `SpawnRunView[]` |
| `spawnTotals()` | `SpawnTotalsView` |
| `spawnToTable(input: SpawnToTableInput)` | `TableView` |
| `publishExtract(input: PublishExtractInput)` | `PublicationView` |
| `strikePublication(input: StrikePublicationInput)` | `void` |
| `listHomeLeaves(db: Db)` | `HomeLeaf[]` |

L’endpoint exporte `GET: RequestHandler`. `TableFlagInput` contient `{ id, value, expectedRevision? }`.

Vérifications finales :

```powershell
npx vitest run --project server src/lib/server/domain/combats.spec.ts src/lib/server/domain/spawn.spec.ts src/lib/server/domain/publications.spec.ts 'src/routes/api/table/[id]/etat'
```

Code de sortie **0** — **4 fichiers, 57 tests réussis**, durée **37,31 s**. Les tests couvrent notamment les rollback complets, les clôtures concurrentes, les refus par rôle, les sessions révoquées, les projections narratives et le 304.

```powershell
npx svelte-check --tsconfig ./tsconfig.json
```

Code de sortie **0** — **979 fichiers, 0 erreur, 0 avertissement**.

Extensions au contrat : `rng?` dans `DrawSpawnInput` pour les tirages reproductibles ; `expectedRevision?` par conséquence pour fournir explicitement la révision d’une fiche. Sans ce dernier champ, la clôture utilise la révision conservée à son ajout à la Table.

Accueil non modifié. Son agent peut appeler `await listHomeLeaves(locals.db)` dans le `load` et affecter le résultat à `leaves`.

Questions ouvertes : aucune.