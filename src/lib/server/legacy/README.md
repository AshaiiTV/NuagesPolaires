# Migration héritée — paquet G

Les fichiers de ce dossier importent un snapshot **local vérifié**, hors des fonctions de domaine de l’interface. La signature `migrateSnapshot(db, snapshot, { dryRun })` est celle demandée par le paquet G : pas d’Actor ni de révision fournie par un formulaire. La CLI exige `NP_MIGRATE_CONFIRM=oui` pour écrire. Les mises à jour de référentiels semés et les liaisons sont protégées sous verrou, avec la révision dans le WHERE quand l’agrégat en dispose.

## Fichiers livrés

- `snapshot.ts`, `normalize.ts`, `migrate.ts`, `report.ts`.
- `snapshot.spec.ts`, `normalize.spec.ts`, `migrate.spec.ts`.
- `scripts/migrate-legacy.ts`, `scripts/make-fixture-snapshot.ts`.
- `tests/fixtures/np-store-demo.json` : 25 clés fictives, 8 comptes, 8 personnages et une entrée null, 12 créatures, 8 rendez-vous, 6 récits après fusion.
- `package.json` : ajout des seuls scripts `migrate:legacy` et `fixtures:legacy`.

## Signatures exportées

Les lignes normalisées utilisent les types d’insertion du schéma Drizzle existant ; aucun type de vue de l’interface n’est ajouté. `LegacyRecord = Record<string, unknown>`.

| Fonction | Signature et résultat |
|---|---|
| `readSnapshot` | `(filename: string): Promise<Snapshot>` |
| `validateSnapshot` | `(value: unknown): Snapshot` |
| `makeSnapshot` | `(rows: SnapshotRow[], exportedAt?: string): Snapshot` |
| `canonicalJson` | `(value: unknown): string` |
| `checksum` | `(value: unknown): string` |
| `normalizeAccount` | `(value: unknown, identity?: unknown)` → `{ row, characterId, unlocked, blocked }` |
| `normalizeOaths` | `(value: unknown): OathDefinition[]` ; réutilise `mergeOathCatalogue` |
| `unknownOath` | `(name: string): OathDefinition` |
| `normalizeOath` | `(o: OathDefinition, catalogue: readonly OathDefinition[])` → ligne `oaths` |
| `normalizeCharacter` | `(value: unknown, catalogue: readonly OathDefinition[], identity?: unknown)` → `{ row, oath, items, history, unlocked, blocked }` ; réutilise `normalizeLegacyProgression` |
| `normalizeItem` | `(value: unknown, characterId: string, position: number)` → ligne `character_items` |
| `normalizeHistory` | `(value: unknown, characterId: string, position: number, dismissed?: unknown[])` → ligne `character_history` |
| `normalizeBeast` | `(value: unknown, identity?: unknown)` → `{ row, zones }` |
| `normalizeEvent` | `(value: unknown, identity?: unknown)` → `{ row, participants }` |
| `normalizeCombat` | `(value: unknown, owner: string, identity?: unknown)` → `{ row, legacyId, rawState, participants }` ; réutilise `fromLegacyArchive` |
| `normalizeStaffLog` | `(value: unknown, identity: unknown, archiveId?: string \| null)` → ligne `staff_log` |
| `normalizeStaffArchive` | `(value: unknown, identity: unknown)` → `{ row, entries }` |
| `normalizeAudit` | `(value: unknown, identity: unknown)` → ligne `audit_log` |
| `normalizeSpawn` | `(value: unknown)` → `{ totals, totalDraws, zones, runs }` |
| `normalizeThemes` | `(value: unknown, visibility: unknown)` → lignes `themes` fusionnées avec `THEME_SEED` |
| `normalizeThemeId` | `(value: unknown): string` |
| `decodeEntities` | `(value: string): string` ; un seul décodage |
| `object` | `(value: unknown): LegacyRecord` ; validation Zod |
| `list` | `(value: unknown): unknown[]` |
| `text` | `(value: unknown, fallback?: string): string` |
| `integer` | `(value: unknown, fallback?: number, min?: number): number` |
| `strings` | `(value: unknown): string[]` |
| `date` | `(value: unknown, fallback?: Date \| null): Date \| null` |
| `stableId` | `(prefix: string, value: unknown): string` |
| `sourceId` | `(raw: LegacyRecord, prefix: string, identity: unknown): string` ; id source, sinon hash du contenu |
| `migrateSnapshot` | `(db: Db, snapshot: Snapshot, options: MigrationOptions): Promise<MigrationReport>` ; `MigrationOptions = { dryRun: boolean }` |
| `createReport` | `(dryRun: boolean): MigrationReport` |
| `tableCounts` | `(report: MigrationReport, table: string): TableCounts` |
| `renderReport` | `(report: MigrationReport): string` ; Markdown |

`SnapshotError` expose les codes du vérificateur hérité : format, lignes, JSONB, doublon, ordre, compte, empreinte et lecture du fichier. Les types `Snapshot`, `SnapshotRow`, `SnapshotErrorCode`, `MigrationOptions`, `MigrationReport`, `MigrationAnomaly` et `TableCounts` sont exportés ; les constantes `EPOCH` et `TRANSFORMER_VERSION` le sont aussi.

## Décisions et conservation

- Transaction globale et `pg_advisory_xact_lock` obligatoires, y compris sur PGlite. Une panne annule cibles, registre, journal staff et audit. Le dry-run exécute l’import et les relectures puis annule la transaction entière.
- Les contrôles de sortie figurent dans le rapport ; la CLI termine avec le code 2 si une projection diverge ou une cible demande arbitrage. Les quarantaines connues du fixture restent visibles sans faire échouer une simulation conforme.
- Une source ou projection modifiée pour une identité enregistrée donne « à arbitrer ». Un changement de version du transformateur n’autorise pas à écraser une ancienne cible. Les cibles existantes divergentes restent intactes ; seules les valeurs exactes des référentiels semés peuvent recevoir la première surcharge héritée.
- Registre : espaces de sources normalisés (`themes`, `oaths`, `combat_archives`, enfants…) et identités stables ; les trois familles d’archives partagent une identité propriétaire + id. Priorité détail > liste > index. Les noms et IDs de comptes/personnages du snapshot servent à résoudre les identités historiques, indépendamment des renommages postérieurs.
- Les IDs techniques des objets et récits sont des hashes avec leur propriétaire : un même `legacy_id` dans deux inventaires, ou un même id de récit chez deux propriétaires, ne crée pas de collision. L’id de récit original reste dans `state.legacy.id` ou dans l’état brut.
- Alias de créatures : premier alias non vide du premier niveau, puis `catalog` ; l’ordre précis suit `legacy/assets/js/main.js:733-815` et est documenté dans `normalizeBeast`. Zéro et faux restent des valeurs explicites. Le brut est gardé dans `beasts.extra.legacy`.
- Les inventaires et historiques bruts restent dans `characters.extra`, en plus des projections relationnelles. Les quantités négatives/fractionnaires/chaînes sont normalisées en entier non négatif et signalées. Les doublons locaux sont mis en quarantaine sans perdre le brut.
- Les liens historiques `combatId` sont résolus après les récits, uniquement pour les entrées nouvellement importées. Un lien ambigu reste dans le brut, avec anomalie.
- Journal : colonne de transition complète et première entrée pour les textes ≤ 20 000 caractères. Au-delà, le texte intégral reste dans la colonne de transition et la première entrée est mise en quarantaine.
- Apparitions : les derniers runs importés sont retranchés des bases cumulatives, puis additionnés par `spawnTotals`. Le total rendu reste exactement celui de la source, sans double comptage. Les métadonnées `rolledAt`, `rolledBy` et `zoneValue` sont reprises.
- `np_admin_recovery_consumed` est conservé. Les rate-limits transitoires, le prototype RPG et les clés mortes sont ignorés et comptés. Les lieux ne sont que dans le rapport.
- Aucun hash de mot de passe dans les rapports ou erreurs de la CLI. Les erreurs SQL inattendues sont masquées, car Drizzle inclut les paramètres dans son message.

## Exécution

```powershell
npm run fixtures:legacy
$env:NP_DB_DRIVER = 'pglite'
$env:NP_DEMO_SEED = 'false'
npm run migrate:legacy -- --input tests/fixtures/np-store-demo.json --dry-run
```

Pour une base Neon, appliquer les migrations relationnelles avant l’import, puis configurer l’URL et la confirmation. Aucun basculement ni import de données réelles n’a été effectué.

Questions ouvertes : aucune pour ce paquet. Les homonymes, archives orphelines, journaux trop longs et collisions réelles se tranchent au moyen du rapport lors du basculement.

## Vérification de livraison

- `npm run fixtures:legacy` : code 0 ; 25 clés ; empreinte `f51abffaac328ece508ddd4366d7fc98dec675aeb064a316166f43c8729bce0a`.
- `npx vitest run --project server src/lib/server/legacy` : code 0 ; **3 fichiers et 33 tests passent** ; dernière exécution, 22,28 s.
- `npx svelte-check --tsconfig ./tsconfig.json` : code 1 global ; **aucune erreur dans le paquet G**. À cette exécution, 6 erreurs et 3 avertissements dans les routes d’autres paquets (`registre/comptes`, `univers/premiers-pas`, `compte/collection`, `entrer`, `entrer/inscription`), laissés intacts.
- `npm run migrate:legacy -- --input tests/fixtures/np-store-demo.json --dry-run` avec `NP_DB_DRIVER=pglite` et `NP_DEMO_SEED=false` : code 0 ; 155 lignes importées ou initialisées simulées, tous les contrôles de sortie conformes ; transaction annulée intégralement. Ce compteur exclut le registre et les deux lignes de journalisation de l’opération elle-même ; les liaisons complètent des lignes déjà comptées.

Écarts ou adaptations : les ids des récits sont volontairement qualifiés par leur propriétaire pour éviter les collisions de l’audit B9 ; le cumul initial des apparitions exclut les runs retenus pour éviter leur double addition ; les rate-limits éphémères ne sont pas repris. Ces décisions sont détaillées ci-dessus. L’entrée CLI est un fichier backup, conformément au livrable demandé ; la variante URL du store évoquée dans l’architecture n’est pas implémentée.
