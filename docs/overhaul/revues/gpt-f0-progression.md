La valeur correcte est **`0.125`**, conformément au code legacy et à `fusion-xp.md` :

1. Niveau 1 : premier seuil enregistré de 10 XP consommé → niveau 2, reste 55.
2. Niveau 2 : seuil `2 × 10 = 20` consommé → niveau 3, reste 35.
3. Niveau 3 : seuil `3 × 10 = 30` consommé → niveau 4, reste 5.
4. Seuil suivant : `4 × 10 = 40` ; fraction **`5 / 40 = 0.125`**.

J’ai corrigé uniquement [progression.spec.ts](/C:/Users/sacha/NuagesPolaires/src/lib/game/progression.spec.ts:353), avec un commentaire explicatif. L’implémentation est conforme au legacy.

Les autres attentes du bloc sont correctes : niveau 2 avec fraction 0 ; niveau 5 avec `25/50 = 0.5` ; niveau 2 avec seuil par défaut 60 et `15/60 = 0.25` ; données invalides ramenées au niveau 1 avec fraction 0.

Commande exécutée :
`npx vitest run --project server src/lib/game/progression.spec.ts`

**Résultat : 1 fichier réussi, 40 tests réussis, code de sortie 0.**