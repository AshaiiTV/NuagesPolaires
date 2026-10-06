# Contrôle final — entree-agenda-registre-3

Note : 8/10 (premier tour : 7/10 ; second tour : 6,5/10)

Les douze défauts du second tour sont corrigés, dont le seul bloquant (la sous-navigation imprimée deux fois) et les trois majeurs (« &nbsp; », « manual », « spawn_… », la fausse attente de liaison des organisateurs). Les trois propositions sont réalisées. La colonne d'aperçu collante du Serment et l'agenda tenu par mois sont réussis. Les décisions en tampons tiennent, mais l'heure s'y lit trois fois. Il ne reste que des finitions de Registre : crochets, « 50% » et identifiants dans les détails, plus deux décalages d'alignement. À noter avant la présentation : le serveur tourne sur la base semée à 00:54, et seed.ts a été corrigé à 01:36. Il faut le relancer, sinon le bestiaire montre encore « Défensif », « Inconnu » et « Territorial ».

Captures et scripts : `.claude/captures/critique-3/entree-agenda-registre-3/` (19 images lues).

## Défauts du second tour

| # | État | Preuve (capture) |
|---|---|---|
| 1 | corrigé | Une seule sous-navigation sur ordinateur, au-dessus du titre (registre-admin-1440.png, registre-journal-admin-1440.png). La bande seule sur téléphone (registre-journal-vue-staff-admin-390.png). L'onglet unique du designer est masqué (atelier-bestiaire-designer-1440.png). |
| 2 | corrigé | « admin · administrateur » tient sur une ligne, sans entité (registre-journal-admin-1440.png). |
| 3 | corrigé | Plus de connexions, « sauvegarde à la main », « fin de round », « forêt aux lianes » sans identifiant (registre-journal-vue-staff-admin-1440.png). Reste « [Seren Vallombre] … 50% » : voir la retouche 2. |
| 4 | corrigé | Rien pour le MJ, la marge porte « Organiser → » (agenda-mj-1440.png). La phrase est absente pour designer et admin (t-designer-*.txt, t-admin-*.txt). Seule nova la lit (t-nova-1440.txt). |
| 5 | corrigé | « Défensif (hors liste) » est choisi dans le select (atelier-bestiaire-b_demo_golem-designer-390.png). seed.ts, lignes 508, 534 et 547 : Neutre, Très agressif, Agressif. La liste montre encore DÉFENSIF, INCONNU et TERRITORIAL (atelier-bestiaire-designer-1440.png) parce que la base en mémoire n'a pas été re-semée : relancer le serveur. |
| 6 | corrigé | Paliers en Cormorant avec un filet, « Niveau 2 » aligné à droite (x-duelliste-paliers-1440.png). Les 13 zones de texte sont en `field-sizing: content` et aucune n'est coupée (serment.mjs). |
| 7 | corrigé | « Chercher, trier » est replié. La première créature apparaît à 407 px (atelier-bestiaire-designer-390.png). |
| 8 | corrigé | Le select n'a plus de doublon. La ligne se lit « par : mot de passe » (registre-journal-admin-1440.png, t-admin-1440.txt). |
| 9 | corrigé | « Pseudo ou mot de passe inconnu. Le carnet reste fermé. » (etats.mjs). GET /entrer/quitter mène à /compte, puis à /entrer?retour=%2Fcompte (t-visiteur-1440.txt). |
| 10 | corrigé | `<main id="page" class="feuille">` sur l'agenda d'alice (etats.mjs). |
| 11 | corrigé | (a) « Évolution d'Arcaniste », « d'Evocateur ». (b) Natif et Ajouté ont disparu (atelier-serments-admin-1440.png). (c) « Tout revoir ». (d) « aucun inscrit · sans limite », « 1 inscrit sur 4 » (agenda-mj-1440.png). (e) Tampon « DESIGNER · 6 OCT. 00:54 » (x-organiser-conseil-mj-390.png). (f) « Agenda. », « Organiser. », « Le bestiaire. », « Les Serments. ». |
| 12 | corrigé | Filtres des comptes à 44 × 44 au moins. `.saut` a `min-height: var(--cible)` (etats.mjs). |

## Propositions réalisées

| Proposition | Verdict | Remarque |
|---|---|---|
| Sceaux dans la liste de l'Atelier | réussie | La liste a perdu son air de table de base de données. Seul défaut : « MASQUÉ · HORS VITRINE » est décalé (retouche 4). |
| Colonne d'aperçu du Serment | réussie | Collante (le sceau reste à 24 px après défilement), recalculée à la saisie (+6 puis +9 PV), rang en laiton. Elle démarre trop haut (retouche 5). |
| Décisions des MJ en tampons | à retoucher | L'angle et le laiton tiennent, en Papier aussi (…-1440-light.png). Mais l'heure s'écrit trois fois (titre de jour, colonne, tampon), ce qui fait un mur de cartouches identiques. |
| Agenda tenu par mois, trait de ruban | réussie | « OCTOBRE 2026 » et « SEPTEMBRE 2026 » sous « À venir » et « Passés ». Le trait de 2 px se lit d'un coup d'œil, à 1440 comme à 390 (agenda-alice-1440.png, agenda-alice-390.png). |

## Réserves importantes

Aucune.

## Retouches mineures

1. **Décisions des MJ, l'heure répétée** (registre-journal-vue-staff-admin-1440.png). Dans src/routes/registre/journal/+page.svelte, ligne 231, remplacer `signature(l.role, l.acteur, l.at)` par `signataire(l.role, l.acteur)`. Le tampon porte le rôle, la colonne garde l'heure et le titre garde le jour.
2. **Décisions des MJ, détails bruts** : « [Seren Vallombre] +10 XP (Loup des lianes, 50%) », « forêt aux lianes ». Le `.replace(/-/g, ' ')` de la ligne 58 casse aussi les traits d'union des motifs (« au-delà » devient « au delà »). Dans le même fichier, vers la ligne 58 : réserver ce remplacement aux détails en forme de slug (`/^[a-zà-ÿ0-9]+(-[a-zà-ÿ0-9]+)+$/`), puis mettre une capitale initiale. Ajouter aussi `.replace(/^\[([^\]]+)\]\s*/, '$1 · ')` et `.replace(/(\d)%/g, '$1 %')`.
3. **Journal d'audit, identifiants et anglais** : « personnage n° : p_demo_seren », « thème : dark », « zone n° : foret-aux-lianes », et « récit : Talus aux loups · détail : Talus aux loups ». Dans src/routes/registre/journal/+page.server.ts, résoudre `characterId` en nom de personnage et `themeId` en nom de thème. Dans src/routes/registre/format.ts, `detailsLisibles` : passer `zoneId` par `nomZone`, et taire `detail` quand il égale `recit`.
4. **Liste des Serments de l'Atelier** : « MASQUÉ HORS VITRINE » est décalé de 16 px, ni sous le sceau ni sous le nom (atelier-serments-admin-1440.png, atelier-serments-admin-390.png). Dans src/routes/atelier/serments/+page.svelte, ligne 29, ne rendre le `<span>` vide que si le Serment n'est pas d'origine : `{#if !oath.reserved?.isBuiltin}<span>écrit dans l'Atelier</span>{/if}`.
5. **Aperçu du Serment** : le sceau de 96 px colle à la consigne (10 px d'écart) et commence 47 px au-dessus de « 01 Le Serment ». La ligne de croissance laisse un « · » en fin de ligne (atelier-serments-duelliste-admin-1440.png). Dans src/routes/atelier/serments/[id]/+page.svelte : `.edition { margin-top: var(--ligne); }`, et un `<br />` avant « frappe {draft.baseDamage} » (ligne 108).
6. **Journal d'audit à 390** : les filtres et l'export remplissent l'écran, la première ligne n'apparaît qu'à 748 px (registre-journal-admin-390.png). Reprendre le motif du bestiaire : `<div class="filtres-telephone"><Depliant libelle="Filtrer, exporter">…</Depliant></div>` autour du formulaire de la ligne 154.
7. **Étiquettes des filtres du bestiaire** : « Chercher une créature » est en bas de casse, à côté de « ZONE » et « TRI » en capitales espacées (atelier-bestiaire-designer-1440.png). Dans src/routes/univers/bestiaire/Filtres.svelte, lignes 42 et 49, donner à `.repere` le style d'étiquette de `Champ` (bas de casse, 13/20, `--encre-2`).

## Verdict

Montrable sans réserve importante : oui. Les défauts qui faisaient paraître le Registre inachevé ont disparu, et ce qui reste relève de la finition. Il faut seulement relancer le serveur avant la présentation pour que la base de démonstration reflète le semis corrigé.
