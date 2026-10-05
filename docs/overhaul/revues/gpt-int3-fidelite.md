INT-3 est terminé. Aucun git, aucune installation ni dépendance ajoutée.

| Point | Résultat |
|---|---|
| A1 | Fait — aucun statut de fiche importé en combat. |
| A2 | Fait — invocation ajoutée sans tour. |
| A3 | Fait — préparation, arrêt et clôture distingués ; contexte courant restauré. |
| A4 | Fait — dégâts courants du Serment ; repli `dmgBase || 6`. |
| A5 | Fait — `findBranch`, toutes les branches conservées, dont les supplémentaires. |
| A6 | Fait — croissance partielle complétée : 39/56/22. |
| A7 | Fait — ancienne note, auteur et date conservés. |
| A8 | Fait — participation tronquée et historisée : 33 %, 10 XP. |
| A9 | Fait — Atelier prioritaire ; migration des plages effectives et rapport des différences. |
| A10 | Fait — aucun drop après KO de statut. |
| A11 | Fait — phase et curseur conformes au legacy. |
| A12 | Fait — photographies des quatre gestes et `undoLastGesture` exporté. |
| A13 | Fait — compteur fidèle, journal intégral et notes staff ; joueur filtré. |
| A14 | Fait — coût implicite 0 EM ; durée manuelle sans plafond. |
| B1 | Fait — archive moteur à deux résolutions et Table ouverte au round 2. |
| B2 | Fait — statut, clôture et identifiant du récit dans la vue joueur. |
| B3 | Fait — publications du combat avec créatures, tampon et rature. |
| B4 | Fait — participants ; notes et journal intégral réservés au staff. |
| B5 | Fait — filtre `combatId` sur les conséquences. |
| B6 | Fait — anomalies durables, consultables depuis le registre. |
| B7 | Fait — `rateLimitMax()` utilisé ; plafond Playwright 100000. |
| C1–C7 | Fait — les sept écarts assumés sont documentés. |
| C, décisions propriétaire | Fait — paragraphe demandé ajouté à la fin de la section 1. |

Les fichiers modifiés, regroupés par dossier :

- `src/lib/game/` : `types.ts`, `oaths.ts`, `progression.ts`, `spawn.ts`.
- `src/lib/game/combat/` : `types.ts`, `state.ts`, `actions.ts`, `statuses.ts`, `resolve.ts`, `outcomes.ts`, `legacy.ts`, `index.ts`, `combat.spec.ts`, **`fidelity.spec.ts`**.
- `src/lib/server/domain/` : `accounts.ts`, `admin.ts`, `characters.ts`, `combats.ts`, `oaths.ts`, `publications.ts`, **`combat-context.ts`**, **`int3-fidelity.spec.ts`**, `admin.spec.ts`, `combats.spec.ts`, `reading.spec.ts`, `scenes.spec.ts`.
- `src/lib/server/db/` : `schema.ts`, `seed.ts`, `seed.spec.ts`, `index.spec.ts`, `schema.spec.ts`.
- `src/lib/server/legacy/` : `normalize.ts`, `migrate.ts`, `normalize.spec.ts`.
- `src/lib/server/auth/` : **`int3-rate-limit.spec.ts`**.
- `src/lib/schemas/` : `admin.ts`, `characters.ts`, `combats.ts`, `oaths.ts`.
- `src/lib/ui/table/texte.ts` : export texte uniquement.
- `drizzle/` : **`0004_fidelite.sql`**, **`meta/0004_snapshot.json`**, ajout au journal des migrations.
- `playwright.config.ts`, `docs/overhaul/05-fondation.md`, `docs/overhaul/decisions-proprietaire.md`.

Résultats des vérifications :

| Commande / contrôle | Résultat |
|---|---|
| `npx svelte-check --tsconfig ./tsconfig.json` | **Code 0 — 0 erreur, 0 avertissement** |
| `npx vitest run --project server` | **Code 0 — 975 tests, 56 fichiers verts** |
| Tests ciblés INT-3 | **25 tests verts** ; régressions rouges vérifiées |
| `npm run build` | **Code 0 — build et adaptation Netlify réussis** |
| `npx tsx scripts/check-bundle.ts` | **Code 0 — 529 fichiers ; ni PGlite ni seedDemo** |
| `http://localhost:5173/` | **HTTP 200** |
| `getRecit` pour Alice après recréation de la base mémoire | **Réussi pour `c_demo_lisiere`** |

Aucun point du paquet ne reste ouvert. La migration **0004** devra être appliquée lors de la mise à jour d’une base persistante.