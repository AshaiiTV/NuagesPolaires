# Comportements des créatures — libellés, couleurs et textes verbatim

Trois tables coexistent dans `assets/js/main.js` ; elles doivent être fusionnées en une seule source de vérité dans l'overhaul.

## 1. `BHC` — couleurs (`main.js:7413–7426`)

| Clé(s) normalisée(s) | Couleur |
|---|---|
| `passive`, `passif` | `#7eb8d4` |
| `neutre`, `neutral` | `#c9a84c` |
| `agressif` | `#c45858` |
| `aggressive` | `#c97a4a` |
| `très agressif`, `tres agressif`, `very_aggressive` | `#c94a4a` |
| `gibier`, `prey` | `#7bcf9b` |
| `boss` | `#b98cff` |

Note : `agressif` (clé française) vaut `#c45858` alors que la page Système de jeu affiche `#c97a4a` pour « Agressif » — incohérence à trancher.

## 2. `BHL` — libellés (`main.js:7427–7440`)

`passive/passif → "Passif"`, `neutre/neutral → "Neutre"`, `agressif/aggressive → "Agressif"`, `très agressif/tres agressif/very_aggressive → "Très agressif"`, `gibier/prey → "Gibier"`, `boss → "Boss"`.

Normalisation `cBehaviorKey` (`main.js:7443`) : minuscules, apostrophes retirées, espaces compactés, accents retirés (NFD). Les clés capitalisées (`'Gibier'`, `'Passif'`, …, `'Boss'`) sont ajoutées par alias (`main.js:7491`).

## 3. `BHM` — icône, court, indice (`main.js:7475–7486`)

| Comportement | Icône | Indice (`hint`, tooltip) |
|---|---|---|
| Gibier | 🐇 | Fuit ou évite le combat. |
| Passif | 😐 | N’attaque pas sans raison. |
| Neutre | ⚖ | Réagit selon le contexte. |
| Agressif | ⚠ | Attaque facilement. |
| Très agressif | ☠ | Attaque à vue. |
| Boss | 👑 | Créature d’élite. |

## 4. Textes longs injectés dans la fiche (`_beastBehaviorBlurb`, `main.js:7959–7969`)

- **Gibier** : « Fuit dès qu'il perçoit une menace. N'engage pas le combat et cherche à rompre le contact au plus vite. »
- **Passif** : « Ignore en général les aventuriers tant qu'on ne l'approche pas trop, qu'on ne le provoque pas ou qu'on ne menace pas les siens. »
- **Neutre** : « Évalue d'abord la situation. Peut attaquer s'il se sent menacé, s'il défend son territoire ou si la faim l'y pousse. »
- **Agressif** : « Attaque facilement. Une simple présence dans son espace peut suffire à déclencher une charge ou une poursuite. »
- **Très agressif** : « Attaque à vue, sans recul ni hésitation. Il ne cherche pas l'avertissement, seulement l'ouverture. »
- **Boss** : « Présence dominante. Dicte le rythme du combat et force le groupe à jouer autour de lui. »

## 5. Texte de la page Système de jeu (`renderCombat`, `main.js:8819–8826`)

Voir `systeme-de-jeu.md`, section « Comportements des Créatures » (intro + 5 descriptions, couleurs `#6db88a`, `#7eb8d4`, `#c9a84c`, `#c97a4a`, `#c94a4a`).

## 6. Filtres de la page Bestiaire (`index.html:7276–7281`)

`Tous` · `🐇 Gibier` · `😐 Passif` · `⚖ Neutre` · `⚠ Agressif` · `☠ Très agressif` — puis tris `PV ↕` · `Niv ↕` · `A→Z`. **Aucun filtre « Boss »** côté public ni côté atelier, et le sélecteur de comportement des formulaires (`ab-beh`/`eb-beh`) ne propose que les 5 valeurs `1..5 → Gibier, Passif, Neutre, Agressif, Très agressif` (`main.js:3323`, `main.js:9610`).

## 7. Pondérations « Apparitions » liées au comportement (`_spawnLabBehaviorMult`, `main.js:14019`)

Gibier 1.08 · Passif 0.92 · Neutre 1 · Agressif 1.12 · Très agressif 1.2 · Boss 0.4 (poids de base plafonné à 22 pour un Boss). Quantités par défaut (`_spawnLabQtyRange`, `main.js:14041`) : min 1 ; max Gibier 4, Passif 3, Neutre 3, Agressif 2, Très agressif 2, Boss 1 ; niveau ≤2 → max+1 (Gibier ≤2 → +1 encore) ; niveau ≥7 → max−1 (plancher 2) ; niveau ≥9 ou Boss → 1/1.
