INT-2 terminé. Aucun git, aucune installation ni dépendance ajoutée. Migrations 0000–0003 conservées ; interface inchangée hors correction autorisée de `/entrer/+page.server.ts`.

| Partie A | État |
|---|---|
| 1 — Message de conflit | Déjà fait, vérifié |
| 2 — Exports des schémas | Déjà fait, vérifié |
| 3 — Colonnes persistées | Colonnes déjà faites ; lectures annonces/récits et écriture du motif terminées |
| 3 bis — Personnages rayés | Fait : exclusion dans les domaines concernés ; export admin conservé |
| 4 — Couleurs | Déjà fait, vérifié |
| 5 — Dernières pages | Fait : état `staff`, faits refusés cornés, sources et Table ouverte vérifiées |
| 6 — Visibilité des Tables | Fait, y compris transfert d’apparition |
| 7 — Import PGlite | Fait : compatible Vite/tsx, contournement du hook retiré, bundle vérifié, dev 5173 en 200 |
| 8 — Retour Discord | Déjà fait, vérifié |
| 9 — `ActionRule.name` | Déjà fait, vérifié |
| 10 — Entretien | Fait : script exécutable, idempotence testée, fermeture et bilan |
| 11 — Scripts et Playwright | Déjà fait, vérifié |
| 12 — Observations MJ et journal | Déjà fait, conservé et vérifié |
| 13 — Autres décisions | Conservées ; tests verts |

| Partie B | État |
|---|---|
| 1 — Discord hostile et pseudo réservé | Fait |
| 2 — Acteur/session/liaison frais en transaction | Fait, avec tests d’absence d’écriture |
| 3 — Quotas et connexion depuis une autre IP | Fait : quotas IP/couple conservés, seuil global transformé en délai |
| 4 — Récupération sérialisée et consommation conditionnelle | Fait ; recette Neon multiconnexion restant ouverte |
| 5 — Expiration, portée et version | Fait |
| 6 — Coût des échecs de connexion | Fait : scrypt factice et budget minimal commun |
| 7 — Droits du MJ | Conservés et testés |
| 8 — Retour normalisé, même origine | Fait |

Les tests sur copies isolées réintroduisant les défauts ont produit **61 échecs**, comme attendu. Ces copies ont été supprimées.

| Commande | Résultat final |
|---|---|
| `npx svelte-check --tsconfig ./tsconfig.json` | **Code 0**, 0 erreur ; 1 avertissement CSS hors périmètre |
| `npx vitest run --project server` | **Code 0**, 52 fichiers et **942 tests réussis**, 114,94 s |
| `npm run build` | **Code 0**, Vite et adapter Netlify terminés |
| `npx tsx scripts/check-bundle.ts` | **Code 0**, **517 fichiers analysés**, ni PGlite ni `seedDemo` |
| `curl` sur `http://localhost:5173/` | **HTTP 200** |
| `npm run entretien` sur PGlite | **Code 0**, aucun élément à traiter |

Fichiers modifiés :

- `auth/` : `context.ts`, `recovery.ts`, `session.ts`, nouveau `redirect.ts`, tests associés.
- `domain/` : `accounts`, `admin`, `characters`, `combats`, `declarations`, `events`, `facts`, `journal`, `observations`, `reading`, `scenes`, `settings` ; nouveau `maintenance.ts` ; tests adaptés et nouvelles suites de sécurité, intégration et coût de connexion.
- `db/index.ts`, tests `index.spec.ts` et `bundle.spec.ts`, `spawn.spec.ts`.
- `schemas/reading.ts`, `hooks.server.ts`, `/entrer/+page.server.ts`, `tests/helpers/db.ts`.
- `scripts/entretien.ts`, `scripts/check-bundle.ts`.
- [05-fondation.md](/C:/Users/sacha/NuagesPolaires/docs/overhaul/05-fondation.md) et [04-architecture.md](/C:/Users/sacha/NuagesPolaires/docs/overhaul/04-architecture.md).

Restent ouverts : la recette Neon à deux connexions pour les récupérations/retraits d’admins concurrents, les mesures temporelles sur le déploiement et l’avertissement CSS de la route hors périmètre.