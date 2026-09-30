# Bestiaire — libellés d'interface (public et atelier), verbatim

## Page publique **Univers → Bestiaire** (`index.html:7270–7288`)

- Recherche : placeholder « 🔍  Rechercher une créature, un niveau, une compétence… »
- Filtres : voir `comportements-creatures.md` §6
- Carte publique (`bCard`, `beast-admin.js:315` — surcharge de `main.js:8010`) :
  - Nom (`.bnm`), sous-titre (`.bsub`), tag comportement, `Niv. N`
  - Description enrichie (`_beastExtendedDesc`, `main.js:7978`) — voir fichier principal §2.6
  - Tableau : `PV` (vert) · `EP` (or) · `Frappe`
  - Blocs : `COMPÉTENCE` · `BUTIN` · `DROP GEMME (D100)` (+ `STYLE DE COMBAT` si `style` renseigné dans la version `main.js`)
  - Placeholder image : initiale du nom + première partie du sous-titre (split sur ` — `) en capitales, sinon `CRÉATURE`
- Aucune créature : « Aucune créature pour ces filtres. » (beast-admin) / « Aucune créature ne correspond à "<q>". » ou « Aucune créature pour ce filtre. » (main.js:7397)
- Description par défaut si vide : « Créature répertoriée dans le bestiaire de Nuages Polaires. »

## Page **Outils → Création → Atelier bestiaire** (`renderBestiaryAdminPage`, `beast-admin.js:268`)

- Accès refusé : titre « Accès réservé » — « Création bestiaire est réservée aux admins et designers. »
- En-tête : titre **Création bestiaire** — sous-titre « Espace réservé admin/designer pour créer, corriger, archiver, importer et préparer les créatures. Le Bestiaire reste une page de consultation propre. »
- Actions : `+ Nouvelle créature` · `Zones d’apparition`
- Recherche : placeholder « Rechercher une créature, note, niveau, compétence... »
- Bloc **Atelier Bestiaire** (tag `Admin`) : « Recherche, tri et édition rapide. Les outils lourds sont rangés pour garder la page lisible. »
  - Menu `Outils` : `Importer JSON` · `Exporter tout` · `Reset filtres`
  - Filtre **Statut** : `Actives` (défaut) · `Toutes` · `Publiées` · `Masquées` · `Archivées`
  - **Tri** : `Modifiées récemment` (défaut) · `Plus anciennes` · `Nom A → Z` · `Nom Z → A` · `Niveau décroissant` · `Niveau croissant` · `Dangerosité` · `Usage combat` · `Publiées d'abord`
  - **Filtres avancés** : Image (`Toutes`/`Avec image`/`Sans image`) · Usage en combat (`Toutes`/`Utilisées récemment`/`Déjà utilisées`/`Jamais utilisées`) · Boss (`Tous`/`Boss`/`Normales`) · Menace (`Toutes`/`Modérée`/`Sérieuse`/`Élevée`/`Majeure`) · Complétude (`Toutes`/`Complètes`/`À finir`) · `Niveau min.` (placeholder 1) · `Niveau max.` (placeholder 30)
  - Compteurs : `Total` · `Affichées` · `À finir` · `Jouées`
- Chips carte : `Archivée` / `Masquée` / `Publiée` ; `Boss` ; `Complète` / `N manque(s)` ; `N apparition(s)`
- Actions carte : `Éditer` · `+ Combat` · menu `Plus` → `Aperçu` · `Dupliquer` · `JSON` · `Archiver`/`Restaurer` · `Purger` (delete_beast)
- Stats carte : `Niveau` · `PV` · `EP` · `Usage` ; blocs `Frappe`, `COMPÉTENCE`, `Détails` → `STYLE DE COMBAT`, `BUTIN`, `DROP GEMME (D100)`
- Panneau latéral (`bestiary-admin-pass2.js`) : vide → « Fiche staff » / « Sélectionne une créature » / « Tu verras ici une fiche staff propre, les actions rapides, l’historique d’usage et les passerelles vers le simulateur. » ; rempli → actions `Éditer`, `+ Combat`, `Plus` (`Aperçu`, `Dupliquer`, `+ x2`, `+ x3`, `Archiver`/`Restaurer`, `JSON`) ; stats `Niveau`/`PV`/`EP`/`Apparitions` ; blocs `Résumé staff` (« Aucune description pour le moment. »), `Complétude` (« La fiche est prête à être jouée. » / « Cette fiche mérite encore une petite finition. » ; chips « Fiche complète » ou « Manque : <x> »), `Combat & simulateur` (« Morts enregistrées », « Dernière apparition », « Frappe », « Compétence »), `Historique` (« Dernières archives où cette créature a été utilisée. » / « Cette créature n’a pas encore de trace dans les archives de combat. » / « Aucune apparition »), `Suivi staff` (« Créée : … · par … », « Modifiée : … »), `Notes admin` (« Aucune note staff pour le moment. »)
- Dates relatives : `Jamais` · `Il y a N j` · `Il y a N h` · `Il y a N min` · `À l’instant` / `Récent` ; format long `dd/mm/yyyy hh:mm` fr-FR

## Modales (`main.js:3315–3390`)

- **Nouvelle créature** (`m-addb`) / **Modifier la créature** (`m-editb`) — champs : `Nom` (« Nom de la créature »), `Sous-titre` (« Prédateur du givre... »), `Comportement`, `Niveau` (défaut 1), `PV` (défaut 20), `EP` (défaut 20), `Image` (« https://... »), `Zones` (« Forêt gelée, Ruines, Grotte... »), `Frappe` (« Description des frappes... »), `Compétences` (« Compétences... »), `Drops` (« Ressources récupérables... »), `Gemmes` (« Gemmes potentielles... »), `Description` (« Description narrative... »), `Note admin` (« Script MJ, gimmick, faiblesse cachée, loot spécial... »), cases `Masquée côté joueurs` · `Archivée` ; boutons `Annuler` · `Créer` / `Enregistrer`
- Ajouts `beast-admin.js:176–194` : case `Boss` « Marquer comme boss », `Notes admin` (« Notes MJ, gimmicks, IA, points faibles... »)
- **Aperçu bestiaire** (`m-beast-admin-preview`) : `Niveau` · `PV` · `EP` · `Menace` ; `Complétude` (« Fiche complète. » / « Éléments manquants : … »), `Usage combat` (« Apparitions », « Morts », « Dernière apparition »), `COMPÉTENCE`, `FRAPPE`, `BUTIN`, `DROP GEMME`, `Notes admin` (« Aucune note staff. »)
- **Zones d’apparition** (`m-beast-zones`, `main.js:7648`) : « Crée une zone, puis coche les mobs qui appartiennent à ce groupe. Le roll d’apparitions tirera uniquement parmi ces mobs. » ; compteur « N mob(s) dans la zone » ; colonne `ZONES` (« Aucune zone créée. ») ; champs `Nom de la zone` (« Nouvelle zone ou nom existant »), `Rechercher un mob` (« Nom, comportement, niveau... ») ; boutons `Tout cocher visible` · `Décocher visible` · `Supprimer la zone` ; colonnes `Dans la zone` (« Drop ici pour ajouter ») / `Hors zone` (« Drop ici pour retirer ») ; ligne : nom, `Niv. N · <comportement>`, « Glisse vers l’autre colonne », bouton `Modifier` ; erreurs « Nom de zone requis. » ; boutons `Fermer` · `Enregistrer`
- **Recadrage image** : titre « Importer / recadrer l'image — <nom> », champ `crop-url` placeholder « https://i.imgur.com/... », libellé source « Image actuelle »

## Notifications (toasts)

`<nom> ajouté.` · `<nom> mis à jour.` · `Créature supprimée.` / `Créature supprimée définitivement.` · `<nom> archivée.` / `<nom> restaurée.` · `<nom> (copie) créée.` · `Import JSON terminé.` / `N créature(s) importée(s).` · `<nom> masqué aux joueurs.` / `<nom> publié.` · `Créature ajoutée au simulateur (N).` / `Créature envoyée au simulateur.` · `Zone enregistrée.` · `Zone supprimée.` · `<nom> retiré de la zone.` · erreurs : `Nom requis.`, `Permission insuffisante.`, `Non autorisé.`, `JSON invalide.`, `Le fichier doit contenir une créature ou une liste de créatures.`, `Impossible de lire le fichier.`, `Une sauvegarde du bestiaire est déjà en cours.`, `La sauvegarde du bestiaire a échoué.`, `Créature introuvable.`, `Export impossible.`
- Confirmations : « Purger définitivement "<nom>" ? L'archive et l'historique d'usage ne seront pas supprimés des combats déjà joués. » · « Archiver cette créature ? » · « Supprimer définitivement cette créature ? Cette action est irréversible. » · « Retirer la zone '<zone>' de tous les mobs ? »
