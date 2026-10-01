Paquet I livré uniquement dans les 12 fichiers assignés : quatre domaines, leurs quatre `.spec.ts`, trois schémas et `src/routes/univers/serments/source.ts`.

Fonctions exportées — préfixe commun `(db: Db, actor: Actor | null, …)`, retour `Promise` :

| Domaine | Signatures |
|---|---|
| Bestiaire | `listBeasts(input?: ListBeastsInput) → BeastRowView[]` ; `getBeast(id: string) → BeastView` ; `createBeast(input: CreateBeastInput)`, `updateBeast(input: UpdateBeastInput)`, `duplicateBeast(input: BeastCommandInput)`, `archiveBeast(input: BeastCommandInput)`, `restoreBeast(input: BeastCommandInput)`, `setBeastHidden(input: BeastCommandInput & { hidden: boolean }) → BeastView` |
| Zones | `listZones() → ZoneView[]` ; `createZone({ name, emoji? })`, `renameZone({ id, name, expectedRevision? }) → ZoneView` |
| Serments | `listOaths({ rank?, category? }?) → OathRowView[]` ; `getOath(idOrSlug: string)`, `createOath(input: CreateOathInput)`, `updateOath(input: UpdateOathInput)`, `setOathHidden({ id, hidden, expectedRevision? }) → OathView` |
| Observations | `proposeObservation(input: ProposeObservationInput)`, `validateObservation(input: ReviewObservationInput)`, `rejectObservation(input: ReviewObservationInput) → ObservationView` ; `listPendingObservations() → PendingObservationView[]` |

Exceptions prévues : `ensureBuiltinOaths(db) → Promise<void>`, `listObservations(db, beastId) → Promise<ObservationView[]>`, `tiersFor(oath, branch, level) → { reached, next }`. Le raccord de route exporte `loadOaths(locals)` et `loadOath(locals, idOrSlug)`.

Vérifications finales :

- `npx vitest run --project server src/lib/server/domain/beasts.spec.ts src/lib/server/domain/zones.spec.ts src/lib/server/domain/oaths.spec.ts src/lib/server/domain/observations.spec.ts` : **code 0, 4 fichiers réussis, 55 tests réussis**, durée **4,18 s**.
- `npx svelte-check --tsconfig ./tsconfig.json` : **code 1, 5 erreurs, 0 avertissement ; aucune erreur dans mes fichiers**. Erreurs externes : trois dans `auth/request.spec.ts`, une dans `legacy/normalize.ts`, une dans `legacy/migrate.ts`.

Écarts et questions ouvertes : le schéma immuable ne contient pas de colonne `motif` pour les observations ; le motif est conservé atomiquement dans les deux journaux. La duplication contrôle la révision par `SELECT … FOR UPDATE`, puisqu’elle insère une copie sans modifier l’original. `updateOath` exige un motif pour tamponner la synchronisation des fiches. Reste à décider avec le lead si le motif d’observation doit aussi devenir une colonne dédiée.