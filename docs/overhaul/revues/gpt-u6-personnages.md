U6 est terminé et branché aux domaines serveur.

- **Fichiers écrits** : les pages et actions de liste/fiche dans [personnages](C:/Users/sacha/NuagesPolaires/src/routes/table/personnages), avec les composants locaux `Attributions`, `OperationsSensibles`, `SaisieTampon`, `Choix`, `PagePersonnages`, `EntreeJournal` et `serveur.ts` ; [personnages.e2e.ts](C:/Users/sacha/NuagesPolaires/tests/e2e/personnages.e2e.ts).
- **Couverture** : recherche et filtres, création, six chapitres, attributions, déclarations, faits et journal. États vides, refus, conflit avec « Relire », réseau interrompu et compte en attente vérifiés.
- **Vérifications** : **21 tests Playwright passent**. Svelte-check : **0 erreur, 0 avertissement**. Prettier conforme. Aucun U+FFFD ni accent remplacé par `?`.
- **Visuel** : 168 PNG produits, contrôle en image effectué, MJ/admin, 1440/390 px, nuit/Papier. Aucun débordement, texte sous 12 px ou erreur de console dans les captures finales.

[Captures principales](C:/Users/sacha/NuagesPolaires/test-results/captures/u6) · [Chapitres et états](C:/Users/sacha/NuagesPolaires/test-results/captures/u6-etats)

Aucun composant partagé ajouté, aucun écart fonctionnel identifié, rien à brancher dans U6. La configuration temporaire de vérification a été retirée.