**1. Ce qu’est le site, pour qui et dans quel contexte**

Nuages Polaires est le **compagnon d’un serveur de RP textuel Discord**, dans un univers post-apocalyptique original : il porte les références, les personnages et la mémoire des parties. Discord accueille l’écriture collective ; le site aide à préparer, comprendre et retrouver ce qui s’y joue.

Les preuves concordent : [README.md](C:/Users/sacha/NuagesPolaires/README.md) annonce « Compagnon de jeu et portail staff » ; [index.html:6588](C:/Users/sacha/NuagesPolaires/index.html:6588) précise « Une histoire collective, sur Discord » ; le [plan du site](C:/Users/sacha/NuagesPolaires/docs/plan-du-site-2026-09-23.md), §1 et §4, distingue visiteurs, joueurs, MJ, designers et administrateurs.

Le produit actuel contient aussi un prototype solo autonome. Sa suppression, décidée par le propriétaire, remplace donc les anciennes recommandations du plan qui envisageaient son maintien.

**2. Fonctionnalités existantes, regroupées**

| Groupe | Fonctionnalités et qualification |
|---|---|
| Découverte et références | **COEUR** — accueil narratif, synopsis, Premiers pas, règlement HRP, système de jeu, catalogue des Serments, bestiaire avec recherche et filtres. |
| Dossier du personnage | **COEUR** — identité, portrait, ressources, niveau/XP, branches du Serment, équipement, inventaire, consommation, journal, historique, export PDF. |
| Vie des parties | **COEUR** — agenda, participation, notifications, comptes rendus, archives de combat, recherche et export texte. |
| Préparation MJ | **COEUR** — gestion des personnages, attribution d’objets/XP, tirages de rencontres, simulation arbitrée, notes et validation des conséquences. Le simulateur sert la partie tant que le MJ en garde la conduite. |
| Création éditoriale | **COEUR** — ateliers bestiaire et Serments, aperçu, duplication, publication, masquage et archivage. |
| Prototype RPG | **DERIVE** — exploration, carte jouable, combats solo, boutique, objectifs, inventaire et progression propres, sauvegarde, présence simulée. |
| Accès et exploitation | **SUPPORT** — comptes, rôles, liaison personnage, sessions, récupération, administration, diagnostics, tests, imports/exports et sauvegardes. |
| Apparence | **SUPPORT** — thèmes, collection et personnalisation ; utiles au confort, secondaires face aux parcours RP. |
| Carte historique du compagnon | **COEUR potentiel** — lieux et carte dormants, sans parcours actif ; aucun intérêt à les reconduire sans usage narratif précis. |

Sources : plan §3 et suivis v296/v297, [CHANGELOG.md](C:/Users/sacha/NuagesPolaires/CHANGELOG.md), navigation d’`index.html` et modules `assets/js`.

**3. Les cinq plus gros problèmes actuels**

1. **Deux produits concurrents occupent la même interface.** Le RPG figure dans le menu principal et le pied de page ; son module possède son propre monde, ses récompenses et sa progression. Cela détourne l’attention et multiplie les concepts à comprendre. Preuves : `index.html:7020–7021`, `rpg-prototype.js`, changelog v297.

2. **La promesse narrative reste dominée par les compteurs de combat.** L’accueil compte créatures vaincues et gemmes distribuées ; le tableau de bord et les archives privilégient les combats. Le journal existe, mais la mémoire collective du RP paraît moins structurante que la progression mécanique. Preuves : `index.html:6594`, plan §2–3.

3. **L’entrée dans la communauté dépend d’un passage administratif.** L’inscription produit un compte en attente, puis un administrateur doit le lier au personnage. Le guide explique désormais cet état, mais cette dépendance reste un point de friction avant l’usage principal. Preuves : plan §4 et suivi « Premiers pas ».

4. **Le front concentre trop de responsabilités et de chargements.** `main.js` pèse **1 016 115 octets**, `index.html` **472 342**, et vingt scripts externes sont référencés, dont RPG et outils staff. C’est une charge structurelle pour le mobile et un foyer de conflits pour des agents travaillant simultanément ; ces tailles ne constituent pas une mesure de performance réelle.

5. **Les correctifs deviennent une architecture parallèle.** `ui-patches`, `*-polish`, `finish-audit`, `bestiary-admin-pass2` injectent des styles, enveloppent des fonctions et dépendent de globals comme `CU`, `can` ou `renderAdminThemes`. L’ordre de chargement et les interactions deviennent difficiles à maîtriser. Preuves : leurs en-têtes et premières fonctions ; `netlify.toml` conserve aussi `unsafe-inline` pour l’héritage.

Les défauts de consommation, d’inscription et de format d’événement du bilan initial sont **documentés comme corrigés** dans les suivis : je ne les présente pas comme des bugs actuels. Cette lecture n’est pas une recette du site déployé.

**4. Les trois choses à garder absolument**

- **L’identité Mystique polaire** : immensité naturelle, brume, encre, ivoire, aurore discrète, boussole et typographie éditoriale. La [charte](C:/Users/sacha/NuagesPolaires/docs/charte-graphique-mystique-polaire.md) fournit déjà une direction distinctive et cohérente avec le lore.
- **La voix qui laisse une place aux joueurs** : « Le monde n’est pas mort. Il attend. » et « Laissez votre trace. » invitent à écrire plutôt qu’à accomplir une liste de tâches.
- **La matière du monde et des personnages** : Serments, bestiaire, règles, journaux et archives existantes ; conserver leurs contenus et leur provenance, même si leur présentation change entièrement.

**5. Vision : un carnet des traces, ouvert à côté de Discord**

Sa réussite se mesurerait à la facilité de reprendre un RP, de préparer une réponse et de retrouver une conséquence validée.

- **Quoi :** une page « Reprendre le fil » réunissant dernière scène, liens Discord, participants et questions laissées ouvertes.  
  **Utilité :** retrouver rapidement le contexte après plusieurs jours d’absence.  
  **Originalité :** un marque-page narratif centré sur les fils encore vivants.

- **Quoi :** un carnet à trois voix : notes personnelles, souvenirs partagés, faits validés par le MJ, avec visibilité explicite.  
  **Utilité :** préserver la mémoire tout en distinguant savoir du joueur, du personnage et du groupe.  
  **Originalité :** juxtaposer des versions subjectives d’un même événement.

- **Quoi :** un dossier de scène mobile : ressources utiles, capacités, règle pertinente et texte prêt à copier dans Discord.  
  **Utilité :** soutenir l’écriture et l’arbitrage pendant la partie.  
  **Originalité :** faire apparaître seulement les références nécessaires à cette scène.

- **Quoi :** un bestiaire de témoignages, révélant progressivement observations et connaissances autorisées.  
  **Utilité :** transmettre le lore sans dévoiler les secrets ni les statistiques réservées aux MJ.  
  **Originalité :** faire découvrir une créature par les traces laissées dans les récits.

- **Quoi :** une constellation de relations entre personnages, Serments et événements, construite à partir de faits validés.  
  **Utilité :** retrouver dettes, promesses et raisons de relancer un RP.  
  **Originalité :** donner une forme visuelle à l’histoire sociale du serveur.

**6. Stack cible : je recommande SvelteKit + TypeScript**

**Vanilla reste viable**, mais il faudrait recréer des conventions de composants, de routage, d’état et de chargement que l’empilement actuel ne fournit pas. Pour un overhaul complet avec plusieurs agents, ce travail offre peu d’avantages.

**SvelteKit convient au mélange vitrine + application connectée** : pages publiques prérendues, espaces privés rendus côté serveur, composants interactifs ciblés. Son adaptateur Netlify prend en charge ces modes et les fonctions serveur. [Documentation Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/sveltekit/).

Je garderais **Neon Postgres et les garanties serveur existantes**, avec accès SQL exclusivement côté serveur, permissions explicites, contrats typés et contrôle de concurrence. La migration du front ne doit pas entraîner automatiquement une réécriture de la persistance.

Pour les agents parallèles : découpage par domaines — personnage, scènes, références, agenda, staff — et composants partagés stabilisés avant délégation. Pour le mobile : vrais liens, formulaires accessibles, chargement par route et actions essentielles immédiatement disponibles.

**Astro serait mon alternative pour une vitrine surtout éditoriale** ; ici, la richesse des parcours connectés favorise SvelteKit. Le framework organise le travail : l’originalité viendra du carnet, du lore et de la place donnée aux récits. Aucun fichier modifié.