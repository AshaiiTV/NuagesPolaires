# Nuages Polaires — État des lieux consolidé (référence de l'overhaul)

Synthèse du 30 septembre 2026, établie à partir des neuf audits `docs\overhaul\audit\0*.md`, des extraits `docs\overhaul\audit\contenu\*.md` et des trois avis indépendants de GPT (`gpt-lecture-produit.md`, `gpt-direction-creative.md`, `gpt-revue-risques-techniques.md`). Dépôt audité : v297 (`legacy\package.json:3`). Chaque affirmation renvoie à un fichier d'audit ; aucune n'est inventée.

**Convention de référence.** L'ancien site vit dans `legacy\`. Les abréviations ci-dessous désignent :

| Abréviation | Fichier réel |
|---|---|
| `main.js:N` | `legacy\assets\js\main.js` ligne N |
| `progression.js:N` | `legacy\assets\js\progression.js` |
| `db.js:N` | `legacy\netlify\functions\db.js` |
| `auth.js:N` | `legacy\netlify\functions\auth.js` |
| `auth-store.js:N` | `legacy\netlify\functions\_shared\auth-store.js` |
| `index.html:N` | `legacy\index.html` |
| autres `assets/js/*.js`, `assets/css/*.css`, `scripts/*.js`, `docs/*.md` | sous `legacy\` |
| `A01 §x` … `A09 §x` | `docs\overhaul\audit\01-…md` … `09-…md`, section x |
| `GPT-P`, `GPT-C`, `GPT-R` | `gpt-lecture-produit.md`, `gpt-direction-creative.md`, `gpt-revue-risques-techniques.md` |

---

## 1. Résumé exécutif

1. **Produit** : Nuages Polaires est le compagnon web d'un serveur de roleplay textuel francophone sur Discord (univers post-apocalyptique « Mystique polaire ») : fiche de personnage, références (synopsis, Serments, bestiaire, système de jeu, règlement), agenda, outils MJ/designer/admin (A01 §0, GPT-P §1). Le propriétaire a tranché : **compagnon de jeu, pas jeu en ligne** ; le prototype RPG, la carte explorable et les combats jouables en solo disparaissent (A01 §0, A09 §1).
2. **Forme actuelle** : une seule page `index.html` (9 040 lignes) + `main.js` (16 855 lignes, 747 fonctions globales) + 18 scripts de patch/polish, deux fonctions Netlify (`auth.js`, `db.js`) et une seule table PostgreSQL `np_store` (clé texte → JSONB, 84 lignes en production au 21/09/2026) (A05 §0, A09 §0).
3. **Ce qui est solide et à préserver tel quel** : les règles de jeu (progression `niveau × 30`, bases 30 PV / 50 EP / 20 EM, 13 Serments avec gains, paliers 2/5/7/10, gemmes +5/+20/+50), le contenu éditorial verbatim, les garanties serveur (`expectedVersion` 428/409, matrice de rôles, filtrage public, audit) et l'isolation de session côté client (A02 §17, A05 §13, A06 §6).
4. **Identité visuelle** : la charte « Mystique polaire » (encre `#091519`, aurore `#95cdbb`, laiton `#c6b38b`, ivoire `#f0eee5`, Cormorant Garamond + Manrope, boussole) est validée et réussie sur l'accueil et les pages refondues ; elle est superposée par `!important` (2 418 occurrences) à l'ancienne identité « Nuit glaciaire » bleue (A07 §0-1, A09 §0).
5. **Dérive « jeu en ligne »** : le prototype RPG est isolé (1 fichier, 2 actions serveur, 1 clé, 4 lignes de couplage) et se retire proprement ; la carte du monde est dormante et cassée ; l'accueil et l'admin mettent en avant des compteurs de combat (A09 §1-2, A01 §11, GPT-P §3).
6. **Dette structurelle** : 20 scripts bloquants (2,1 Mo de sources), 11 `MutationObserver` + 11 `setInterval` permanents, 427 `onclick=`, 898 `style=`, CSP `unsafe-inline`, monkey-patching en chaîne, 16 blocs `<style>` empilés (A09 §3-4).
7. **Dette de données** : identités par nom (archives de combat par pseudo, inscriptions d'événements par nom de personnage), alias dupliqués (`nom/name`, `beh/behavior/comportement`, `titre/dateTs/published`), troncatures silencieuses (historique 200, syslog 500), collections réécrites entièrement à chaque écriture, clés mortes (`theme_catalog`, `serment_catalog`, `page_content`, `themes_admin_store`) (A05 §11-14).
8. **Bugs bloquants constatés** : chargement d'archive de combat cassé (`cHydrateCombatState` inexistante), raccourcis `combatPassTurn`/`combatNextRound` inexistants, tout combat terminé archivé en « Brouillon » (`_new`), pondération d'apparition neutralisée (`spawnWeight` forcé à 1), journal système jamais chargé en session normale, bouton « Débloquer » de thème toujours refusé (403) (A03 §14, A08 §5.5, A07 §8.8).
9. **Avis GPT convergents** : SvelteKit + TypeScript sur Netlify, Neon conservé avec schéma relationnel et versions par enregistrement, sessions serveur (table) plutôt que JWT, scrypt sur le mot de passe original, transactions SQL pour les opérations composées, migration idempotente avec rapport, CSP stricte (GPT-P §6, GPT-R §1-5) ; direction créative « Les Lisières » (scènes ouvertes comme entrée, marge de références, voix parallèles) (GPT-C §2).
10. **Décisions à prendre par le propriétaire** (§10) : périmètre exact du simulateur MJ, staff sans personnage, contenu public, schéma d'authentification, divergences règles publiques ↔ moteur, propriété des archives et des inscriptions, snapshot de production, rôle designer.

---

## 2. Définition du produit et matrice rôle × capacités

### 2.1 Définition

Nuages Polaires est **le compagnon d'un serveur Discord de roleplay textuel** : le jeu se joue en texte sur Discord ; le site tient ce que Discord ne tient pas — qui je suis (personnage, Serment, capacités au niveau actuel), où j'en suis (PV/EP/EM, niveau, XP, équipement, inventaire, gemmes, statuts), la mémoire (journal, historique, comptes rendus de combat, événements), la coordination (agenda, inscriptions, notifications), la compréhension du monde (synopsis, Serments, bestiaire, système de jeu, règlement, premiers pas), l'arbitrage MJ (simulation, apparitions, récompenses, archives, registre des personnages) et l'animation (ateliers bestiaire et Serments, comptes, rôles, liaisons, thèmes, journaux) (GPT-P §1, A01 §0, A01 §10). Voix du site : « LE COMPAGNON », « Le monde attend. Votre histoire commence. », « Le monde n'est pas mort. Il attend. », « Laissez votre trace. », « L'aventure continue. » (A01 §2.1, §5.1, §10).

Modèle d'identité : **un compte ≠ un personnage**. L'inscription crée un compte `joueur` sans fiche (`pid: null`, état « en attente de liaison ») ; un administrateur crée la fiche et lie le compte (`admin_link_account`) ; le joueur recharge (A01 §7.2, A05 §3.1, A08 §3.4). Rôles serveur : `joueur | mj | designer | admin` (`auth.js:500-503`, `db.js:108-111`).

### 2.2 Matrice rôle × capacités (état v297, client `can()` `main.js:1915-1925` ; serveur `EXACT_WRITE_RULES` `db.js:89-103`, `canRead` `db.js:156-166`, `validatePlayerWrite` `db.js:428-461`)

| Capacité | Visiteur | Compte en attente | Joueur lié | MJ | Designer | Admin | Source |
|---|---|---|---|---|---|---|---|
| Accueil public, règlement HRP (`s-hrp`), guide Premiers pas (état `guest`) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | A01 §2, §7.1 |
| Synopsis, Serments, Bestiaire (filtré), Système de jeu, Règlement, Événements (publiés) | ✘ (onglets réservés à `s-app`) | ✔ | ✔ | ✔ | ✔ | ✔ | A01 §0.3, §7.1 ; `_canUseTabNow` `main.js:4358-4378` |
| Tableau de bord connecté | ✘ | ✔ (« Le premier chapitre. ») | ✔ | ✔ | ✔ (onglet initial `bestiaire`) | ✔ | A01 §5.1, §3.5 |
| Lire sa fiche (4 chapitres), son historique, ses notifications | ✘ | ✘ (« Compte en attente ») | ✔ (sa fiche seule) | toutes les fiches | ✘ (`players` → `[]`) | toutes | A01 §5.4 ; `db.js:692-699` |
| Modifier journal, avatar ; consommer un objet (−1) ; masquer une notification ; participer à un événement | ✘ | ✘ | ✔ (son personnage) | ✘ (boutons cachés ; serveur accepte avec `pid`) | ✘ | ✘ | A02 §9 ; `db.js:877-1029` |
| Archives de combat (lecture « Mon aventure / Les récits ») | ✘ | ✔ (vide) | ✔ (ses owners) | ✔ | ✘ | ✔ (tous) | A01 §5.3 ; A03 §9.7 |
| Export PDF de sa fiche | ✘ | ✘ | ✔ | (fiche consultée) | ✘ | ✔ | A02 §13.2 |
| Registre « Personnages » : créer une fiche, +Item/−Item, XP de combat, fusion de gemmes, supprimer une entrée d'historique | ✘ | ✘ | ✘ | ✔ | ✘ | ✔ | A08 §3 ; `MJ_PLAYER_FIELDS` `db.js:428-432` |
| Stats/maxima, niveau ±, serment, branche, statuts, avatar d'autrui, suppression de personnage | ✘ | ✘ | ✘ | ✘ (403 « Modification réservée à l'admin : <champ>. ») | ✘ | ✔ | A02 §9 |
| Simulation (`combat-mj`), Apparitions, archives staff, clôture de combat, drops | ✘ | ✘ | ✘ | ✔ | ✘ | ✔ | A03 §1 ; `mjTabs` `main.js:4364-4366` |
| Atelier bestiaire (créer, éditer, publier/masquer, archiver, purger, JSON, zones) | ✘ | ✘ | ✘ | ✘ (UI) / ✔ (serveur `beasts`) | ✔ | ✔ | A04 §1.7, §2 |
| Atelier serments (`serments_custom`) | ✘ | ✘ | ✘ | ✘ | ✘ (UI) / ✔ (serveur) | ✔ | A02 §4.4 ; A05 §11.3 |
| Événements : créer, modifier, masquer, supprimer | ✘ | ✘ | ✘ | ✔ | ✔ | ✔ | A08 §1.5 |
| Notifier les joueurs à la création d'un événement | ✘ | ✘ | ✘ | ✔ | ✘ (case masquée) | ✔ | A08 §1.6 |
| Journal staff `np_syslog` (écrire/lire) ; archives du log | ✘ | ✘ | ✘ | ✔ / ✘ archives | ✘ | ✔ | A08 §5 ; `db.js:95` |
| Comptes (lier, délier, rôle, supprimer, reset MDP 1 h), thèmes (donner, visibilité), import/export JSON, journal d'audit, diagnostics | ✘ | ✘ | ✘ | ✘ | ✘ | ✔ | A08 §4 ; A05 §4.5 |
| Écrire ses propres `combat_arc_*` | ✘ | ✔ (owner = pseudo/id/nom) | ✔ | ✔ | ✘ | ✔ | `db.js:171` |

Particularité à trancher (§10) : un **staff sans personnage lié** reçoit `CU.pid = id du premier personnage du registre` (`main.js:2242, 2352, 2172`) — l'en-tête, la cloche et « Mon personnage » affichent alors le personnage d'un joueur (A01 §0.4, A05 §8, A08 §0).

---

## 3. Inventaire des fonctionnalités (COEUR / SUPPORT / DÉRIVE)

| Fonctionnalité | Tag | Audit détaillé |
|---|---|---|
| Accueil public narratif (masthead, hero, 5 métriques, L'univers, Les Serments, invitation, colophon) | COEUR | A01 §2.1 ; A07 §5 ; `contenu\accueil-public.md` |
| Parcours d'entrée « règlement d'abord » : accueil → `s-hrp` → inscription → compte en attente → liaison admin → rechargement | COEUR | A01 §2.2-2.3, §7.2 ; A08 §3.4 |
| Guide « Premiers pas » à 5 états (`guest/pending/linked/unavailable/staff`), sans stockage | COEUR | A01 §5.2 ; A06 §3.M ; `contenu\premiers-pas.md` |
| Tableau de bord connecté (salutation, stats, prochain événement, derniers combats, carte personnage, pages du monde, accès staff) | COEUR | A01 §5.1 ; `contenu\ecrans-compte-et-accueil-connecte.md` §6 |
| Synopsis (trois temps) | COEUR | A01 §5.6 ; `contenu\synopsis.md` |
| Catalogue des Serments (filtres Type/Rang, cartes, branches, paliers) | COEUR | A01 §5.7 ; A02 §4-5 ; `contenu\serments-catalogue.md` |
| Bestiaire public (recherche, 5 filtres de comportement, 3 tris, carte = fiche) | COEUR | A04 §3 ; `contenu\bestiaire-libelles.md` |
| Système de jeu (document I-XI + comportements) | COEUR | A01 §5.9 ; `contenu\systeme-de-jeu.md` |
| Règlement HRP (Parties I-IV, glossaire 20 termes) | COEUR | A01 §5.10 ; `contenu\reglement-hrp.md` |
| Fiche de personnage en 4 chapitres (Ressources, Équipement, Journal, Serment) | COEUR | A01 §5.4 ; A02 §14 |
| Progression : XP de combat, fusion de gemmes, level-up, paliers | COEUR | A02 §2, §6 ; A08 §3.3 |
| Inventaire, équipement (3 slots), déclaration de consommation avec note | COEUR | A02 §7 |
| Journal de bord partagé (propriétaire, MJ lecture, admin) | COEUR | A02 §11 |
| Historique typé et filtrable ; cloche de notifications (vue de l'historique) | COEUR | A02 §8, §12 ; A08 §2 |
| Statuts IRP (12 états) sur la fiche | COEUR | A02 §10 ; A03 §7.1 |
| Export PDF « Nuages Polaires — Document Officiel » | COEUR | A02 §13.2 |
| Agenda : types, capacité, participants nommés, états, 8 derniers passés, « Prochain événement » | COEUR | A08 §1 |
| Participation joueur (inscription/désinscription, règles serveur) | COEUR | A08 §1.7 ; A06 §3.H |
| Notification de création d'événement (admin/MJ, opt-in) | COEUR | A08 §1.6 |
| Archives de combat côté joueur (« Les récits », recherche, pagination 20, export texte) | COEUR | A01 §5.3 ; A03 §9.7 ; A06 §3.G |
| Registre staff « Personnages » (recherche, cartes, +Item/−Item, XP, Stats, Accéder, Sup.) | COEUR | A08 §3 |
| Comptes en attente de liaison (section, badges, « Lier ce compte » / « Refuser ») | COEUR | A08 §3.4 |
| Simulateur de combat MJ (déclaration → résolution, actions, capacités, statuts, invocations, taunt, élémentaire) | COEUR (outil d'arbitrage ; décision §10-1) | A03 §2-7 |
| Drops de gemmes (D100, table par créature, drops différés) | COEUR | A03 §8.1 |
| Fin de combat → synchronisation des fiches + entrée `combat` avec `combatId` | COEUR | A03 §8.2 ; A06 §3.P |
| Archives de combat staff (détail + index, statuts, filtres) et export texte Discord | COEUR | A03 §8.5, §9 |
| Générateur d'apparitions (zones = salons Discord, pondération, historique partagé, transfert en pré-combat) | COEUR | A03 §10 |
| Atelier bestiaire (créer, éditer, image, aperçu, dupliquer, publier/masquer, archiver, purger, JSON) | COEUR | A04 §2 |
| Zones d'apparition (gestionnaire à deux colonnes) | COEUR | A04 §2.13 |
| Atelier serments (serments custom, branches, paliers, propagation aux fiches) | COEUR | A02 §4.4 ; A01 §5.17 |
| Gestion staff des événements (modale, validations, brouillon conservé) | COEUR | A08 §1.4-1.5 |
| Comptes, sessions (cookie 30 j), mot de passe, reset admin 1 h, récupération admin par env | SUPPORT | A05 §4 |
| Administration : Vue d'ensemble (KPI, graphes), Comptes, Thèmes, Log, import/export partiel | SUPPORT | A08 §4 |
| Journal staff `np_syslog` + archives téléchargeables | SUPPORT | A08 §5 |
| Journal d'audit serveur `np_audit_log` (UI orpheline) | SUPPORT | A05 §6 ; A08 §5.6 |
| Diagnostics, self-test, console admin, `admin_health` | SUPPORT | A08 §6 ; A09 §3.6-3.7 |
| Thèmes (9 canoniques) et collection ; administration des thèmes | SUPPORT | A07 §3 |
| Bannière de santé API / mode hors-ligne / maintenance | SUPPORT | A09 §3.5 ; A01 §3.1, §4.7 |
| Palette de commandes `Ctrl+K`, restauration d'onglet, tiroir mobile | SUPPORT | A01 §3.3, §4.4, §4.6 |
| Sauvegarde logique `np-store-backup-v1` + vérification PGlite | SUPPORT | A05 §9 ; A06 §3.K |
| Harnais de tests (PGlite + handlers réels, Playwright) | SUPPORT | A06 §0-1 |
| Compteurs publics `public_stats` (Serments, Élèves invoqués, Créatures vaincues, Actifs, Gemmes distribuées) | SUPPORT, orientation combat à rééquilibrer | A01 §2.1, §11 ; A05 §5.2 ; GPT-P §3.2 |
| Prototype RPG (`rpg-prototype.js`, `rpg_characters`, 5 entrées de nav, article Premiers pas, présence simulée) | DÉRIVE | A09 §1 ; A01 §5.12 ; A02 §18 ; A05 §3.11 ; A06 §3.Q |
| Carte du monde Leaflet dormante (`renderCarte`, `LIEU_TYPES`, clé `lieux`) | DÉRIVE | A09 §2 ; A04 §1.6 ; A01 §5.19 |
| KPI admin « Créatures les plus affrontées », « Combats » ; `creatureKills` public | DÉRIVE (à rééquilibrer) | A08 §4.2, §10 |
| Hero/toolbar/progression de collection injectés par `theme-max.js`, « Secret scellé », bouton « Débloquer » mort | DÉRIVE | A07 §3.4, §8.8-10 |
| 18 scripts de patch/polish, 16 blocs `<style>`, moteur `theme-max.js` | DETTE (§8) | A09 §3 ; A07 §1 |

---

## 4. Registre des règles de jeu

### 4.1 Progression du personnage

| Règle | Valeur / formule exacte | Source |
|---|---|---|
| Une seule progression | `level`, `xp`, `xpMax`, marquée `progressionVersion: 1` ; `sLevel/sXp/sXpMax` supprimés | `legacy\assets\js\progression.js:7,48,75-78` |
| Seuil d'XP | `xpRequired(level) = max(1, floor(level)) × 30` ; niv 1 : 0/30, niv 5 : /150, niv 10 : /300 | `legacy\assets\js\progression.js:21` |
| Bases niveau 1 (tous Serments) | PV 30, EP 50, EM 20 ; création `{level:1, xp:0, xpMax:30, branch:"Aucune"}` | `legacy\assets\js\main.js:9468-9487` ; `legacy\docs\fusion-xp.md` |
| Montée de niveau | tant que `xp ≥ xpMax` : `xp −= xpMax ; level++ ; xpMax = level×30 ; pvMax += pvN ; epMax += epN ; emMax += emN ; courants remis au max` ; XP excédentaire conservée ; entrée `level` « ⬆ Niveau N ! PV:x EP:y EM:z — <palier> débloqué » par « Système » | `legacy\assets\js\main.js:9307-9319` |
| Maxima théoriques (recalcul staff) | `pvMax = 30 + (L−1)×pvN`, `epMax = 50 + (L−1)×epN`, `emMax = 20 + (L−1)×emN` ; courants plafonnés | `legacy\assets\js\main.js:9578-9580, 9440, 6749-6754` |
| Récompense de combat | `xpGain = ceil(niv_mob × 10 × participation/100)`, participation 0-100 (défaut 100), refus si ≤ 0 ; entrée `xp` « +X XP (<mob>, P%) » par « MJ <nom> » | `legacy\assets\js\main.js:9347-9381` |
| Ajustement admin | niveau ±1 : `level = max(1, old+δ)`, `xpMax = level×30`, `xp = min(xpMax−1, ceil(fraction×xpMax))` ; XP ±10/±50/±100 : `xp = max(0, xp+δ)` puis level-up (pas de descente par XP) | `legacy\assets\js\main.js:9435-9453` |
| Conversion des anciennes fiches | pistes `legacyTrack(level,xp,xpMax,30)` et `legacyTrack(sLevel,sXp,sXpMax,10)` ; niveau le plus élevé gagne (égalité : fraction la plus haute), jamais d'addition ; `xp = min(xpMax−1, ceil(fraction×xpMax − 1e-10))` ; `Δ>0` → maxima et courants `+ Δ×gain`, déficit conservé, KO à 0 PV conservé ; idempotent | `legacy\assets\js\progression.js:27-80` ; `legacy\docs\fusion-xp.md` |
| Gains par défaut si Serment inconnu | `[0,0,0]` ; `serments_custom[classe]` fusionné par-dessus `DEFAULT_GROWTH` | `legacy\assets\js\progression.js:22-26` |
| Changement de Serment (règle publique, non codée) | voie IRP validée par le staff ; voie HRP possible uniquement au niveau 1 ; niveau et XP conservés | `legacy\assets\js\main.js:8449-8454` |
| Changement de Serment (code) | admin à tout niveau ; conserve `level/xp/branch:"Aucune"`, maxima non recalculés | `legacy\assets\js\main.js:7047` ; A02 §16.3 |
| Bornes de la fiche | `name ≤ 80`, `classe ≤ 80`, `inventory ≤ 500`, `history` = 200 dernières, `statuts ≤ 64`, `journal ≤ 25 000`, avatar data-URL ≤ 350 000 car. | `legacy\netlify\functions\db.js:293-307, 85, 410-427` |

### 4.2 Serments : table des 13 croissances (`SD`, `legacy\assets\js\main.js:213-485` ; vérifiée contre `DEFAULT_GROWTH` `legacy\assets\js\progression.js:8-14` par `legacy\scripts\test-unified-progression.js:84-93`)

| Serment | Rang | Cat. | Icône | Arme liée | pvN | epN | emN | dmg | Type | Branche A (style) | Branche B (style) | PV/EP/EM niv 10 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Duelliste | Basique | melee | ⚔ | Épée moyenne du serment | 6 | 6 | 2 | 11 | Tranchant | L'Élan Tranchant (Brutalité) | Taille Double (Fluidité) | 84 / 104 / 38 |
| Bretteur | Aguerri, `hidden`, ← Duelliste | melee | ⚔ | Épée fine du serment | 5 | 7 | 3 | 12 | Tranchant | Feinte de Fer (Précision) | Pas Rompu (Fluidité) | 75 / 113 / 47 |
| Claymore | Aguerri, `hidden`, ← Duelliste | melee | ⚔ | Claymore du serment | 7 | 4 | 2 | 16 | Tranchant lourd | Posture Haute (Pression lourde) | Fendre la Ligne (Brise-ligne) | 93 / 86 / 38 |
| Lame d'Honneur | Aguerri, `hidden`, ← Duelliste | melee | ⚔ | Épée claire du serment | 7 | 5 | 3 | 10 | Tranchant | Duel Juré (Duel) | Sentence du Duel (Exécution) | 93 / 95 / 47 |
| Sauvageon | Basique | melee | 🪓 | Hache à deux mains du serment | 5 | 8 | 1 | 14 | Tranchant | Spirale Brisante (AOE) | Lancer Bestial (Précision) | 75 / 122 / 29 |
| Croisé | Basique | melee | 🛡 | Bouclier du serment | 8 | 3 | 2 | 6 | Contondant | Bash Cinglant (Offensif) | Appel du Bouclier (Aggro) | 102 / 77 / 38 |
| Rôdeur | Basique | melee | 🗡 | Dague du serment | 2 | 5 | 3 | 8 | Tranchant | Rafale de Lames (Mêlée) | Lancer Lié (Distance) | 48 / 95 / 47 |
| Traqueur | Basique | melee | 🏹 | Lance du serment | 2 | 7 | 2 | 8 | Tranchant | Lance Drainante (Épuisement) | Tenue de Ligne (Contrôle) | 48 / 113 / 38 |
| Flécheur | Basique | distance | 🏹 | Arc du serment | 3 | 5 | 4 | 10 | Tranchant | Salve Aveugle (AOE) | Flèche de Jugement (Concentration) | 57 / 95 / 56 |
| Elementaliste (clé sans accent) | Basique | melee | 👊 | Poing américain du serment serti de gemmes | 4 | 4 | 4 | 7 | Contondant | Feu & Glace (Équilibre offensif) | Foudre & Eau (Équilibre d'accumulation) | 66 / 86 / 56 |
| Evocateur (clé sans accent) | Basique | magie | 🪄 | Bâton du serment orné de runes et d'anneaux | 2 | 3 | 6 | 4 | Contondant | La Tortue Bipède (Tank) | Le Crabe Canon (Distance) | 48 / 77 / 74 |
| Conjurateur | Basique | soutien | ⛓ | Chaîne du serment | 2 | 2 | 7 | 6 | Contondant | Frappe Déchaînée (Offensif) | Soin Enchaîné (Soin) | 48 / 68 / 83 |
| Arcaniste | Basique | magie | 🔮 | Orbe du serment | 1 | 1 | 8 | 4 | Contondant (coup de poing pour les non-magiques) | Domaine Étoilé (AOE Indéfendable) | Rayon Étoilé (Précision Défendable) | 39 / 59 / 92 |

Lores, `descPhys`, `flavor` et les 4 paliers × 2 branches × 13 Serments sont verbatim dans A02 §5 et `contenu\serments-catalogue.md`. Taxonomies : rangs `SERM_LEVELS` `basic` Basique, `seasoned` Aguerri, `emeritus` Émérite, `singular` Singulier, `transcended` Transcendé, `corrupted` Corrompu, `other` Autre (`main.js:6096-6104`) ; catégories `SERM_CATS` melee Mêlée, distance Distance, magie Magie, soutien Soutien (`main.js:6091-6095`) ; filtre public des rangs sans `seasoned` (`main.js:6185`). Serment custom : défauts pvN 3, epN 5, emN 2, dmg 8, cat « mêlée », icône ✦, rang `singular` ; un custom **remplace** entièrement le natif de même nom (`main.js:6729-6738, 1620-1626`).

### 4.3 Paliers

| Règle | Valeur | Source |
|---|---|---|
| Paliers Basique | niveaux **2 / 5 / 7 / 10** : « Palier I — Éveil », « Palier II — Densité », « Palier III — Maîtrise », « Palier IV — Plénitude » | `legacy\assets\js\main.js:9299` |
| Paliers Aguerri | niveaux **10 / 13 / 16 / 20** : « Aguerri I — Éveil » … « Aguerri IV — Plénitude » | `legacy\assets\js\main.js:9300` |
| Étiquettes d'étape | 1er « Débloqué », 2e « Renforcé », 3e « Maîtrisé », dernier « Parachevé » | `legacy\assets\js\main.js:6158-6164` |
| Palier actif | dernier palier de la **branche choisie** dont `niv ≤ level` ; branche « Aucune » = aucune capacité en combat ; doublons de nom → version la plus haute | `legacy\assets\js\main.js:11451-11460` |
| Rang ≠ niveau | « Atteindre un palier débloque les capacités prévues pour la branche ; cela ne transforme pas automatiquement un serment Basique en Aguerri. » | `legacy\docs\fusion-xp.md` |
| Saisie atelier | « Niveau requis » limité à 2/5/7/10 (13/16/20 impossibles) | `legacy\assets\js\main.js:3505` |

### 4.4 Gemmes de Sang

| Règle | Valeur | Source |
|---|---|---|
| Trois grades | « Gemme Blanche » **+5 XP** (tout mob), « Gemme Incarnate » **+20 XP** (mobs moyens/puissants), « Gemme Écarlate » **+50 XP** (puissants/élites) | `legacy\assets\js\main.js:8804-8808, 9414-9433` (`{b:5,i:20,e:50}`) |
| Représentation | objet d'inventaire `{ "id":"gem_<ts>", "name":"Gemme Blanche", "category":"Gemme", "qty":1, "desc":"Obtenue sur : <créature>" }`, cumul par `name+category` | `legacy\assets\js\main.js:12574` |
| Fusion | quantité 1-99 ; stock = Σ `qty` des items `category==="Gemme"` au nom normalisé ; crédit XP + retrait **dans la même sauvegarde**, refusée si stock insuffisant ; entrée `gemme` « +X XP (fusion de q× Gemme <T>) » | `legacy\assets\js\main.js:9395-9433` ; A06 §3.F F7, F10-F12 |
| Table de drop | `beast.gem` = entrées `min–max : libellé` séparées par ` / ` (ex. `1–60 : Aucune / 61–90 : Gemme Blanche / 91–100 : Gemme Incarnate`) ; tirage D100 ; attribution immédiate ou « ⏳ Décider plus tard » (`pendingDrops`) ; entrée `gemme` « 💎 <gemme> (sur <mob> · N/100) » | `legacy\assets\js\main.js:12539-12654` |
| Statistique publique | `totalGemmes = max(Σ qty gemmes en stock, nombre d'entrées history type "gemme")` | `legacy\netlify\functions\db.js:797-806, 840` |

### 4.5 Combat (moteur du simulateur MJ)

| Règle | Valeur / formule | Source |
|---|---|---|
| Initiative | choisie par le MJ (`combatSetInit`), défaut index 0 ; `order = [initiative] + autres dans l'ordre d'ajout`, fixe pour tout le combat ; retirer un combattant réinitialise `order` (initiative perdue) | `legacy\assets\js\main.js:12452-12456, 11901-11903, 12441-12450` |
| Phases | `idle → declaration → resolution` ; chaque combattant déclare ses actions dans l'ordre, le MJ résout | `legacy\assets\js\main.js:10968-10983, 11912-12063, 12265-12354` |
| Actions par tour | `actionsMax = max(1, 3 − malus) + bonus` ; `malus = max(2 si étourdi, 1 si entravé)` ; `bonus = max(0, level − cible.level)` sur les attaques déclarées ; invocation : 2 | `legacy\assets\js\main.js:11845-11890` |
| Dégâts | `dmg = dmgBase + level` ; joueur `dmgBase = SD[classe].dmg` (déf. 6) ; créature `dmgBase` = 1er nombre de `frappe` (déf. 6) ; capacités `base du palier + level` ; compétences de créature **sans** +niveau ; arrondi `Math.ceil` partout | `legacy\assets\js\main.js:11470, 12410-12439, 11498-11569` |
| Pugilat | résolution **4 + level** ; page publique et bouton **3 + Niveau** (contradiction, §10-5) | `legacy\assets\js\main.js:11955, 8718, 13603` |
| Coûts de base | Frappe **6 EP** ; Pugilat **6 EP** ; Esquive **8 EP** (annule tout) ; Bloquer joueur **5 EP −50 %** / créature **2 EP −25 %** ; Parer joueur **0 EP −25 %** ; Déplacement **10 EP** ; capacités en EM/EP selon `cout` du palier ; « Subit » 0 EP sans effet | `legacy\assets\js\main.js:11950-12038` |
| Page publique (divergente) | Frappe 6 EP ; Tir 4 EP ; Invoquer son Serment 1 EM ; Esquive 8 EP ; Bloquer sans bouclier 2 EP −25 % / avec bouclier 5 EP −50 % ; Se déplacer 10 EP ; objets 0 EP ; surcadençage ×2, ×2.5, ×3, ×3.5, ×4 (+0.5/palier) ; EP insuffisante → évanouissement | `legacy\assets\js\main.js:8704-8742` ; A03 §11 |
| Surcadençage (code) | `cSurcCost(base, n) = ceil(base × (1 + n×0.5))` — défini, **jamais appelé** | `legacy\assets\js\main.js:11441` |
| Budget d'énergie | `epSpent > epCur` → journal « EP insuffisant … actions réduites » mais toutes les actions s'exécutent, EP clampée à 0 ; `emSpent > emCur` → capacités au-delà du cumul annulées « [Annulé — EM] » | `legacy\assets\js\main.js:12273-12291` |
| Ordre de résolution | attaques dans `order`, un combattant KO plus tôt n'attaque pas ; chaque attaque `max(1,hits)` fois ; défenses de la cible (esquive/bloquer/parer) consommées **une par instance d'attaque, dans l'ordre déclaré** | `legacy\assets\js\main.js:12293-12301, 12164-12264` |
| Blocage brise-ligne | `dmg = raw + ceil(raw×pct/100)` au lieu de `ceil(raw×(1−pct/100))` ; parer `ceil(dmg×0.75)` | `legacy\assets\js\main.js:12164-12264` |
| Statuts (12) | `saignement` −3 PV/round ; `empoisonne` −max(1, ceil(pvMax×5 %))/round ; `etourdi` −2 actions ; `entrave` −1 action ; `brulure`, `gel`, `aveugle`, `silence`, `peur`, `fragilise`, `renforce`, `inspire` narratifs ; durée 1-10 tours (défaut 2), pose par capacité = 2 tours rafraîchis au max ; libellés/couleurs/icônes : Saignement `#c94a4a` 🩸, Empoisonné `#77b36b` ☠, Brûlure `#d88a3d` 🔥, Gel `#7eb8d4` ❄, Étourdi `#d7b56d` 💫, Entravé `#8aa0b6` ⛓, Aveuglé `#c7c4b8` ◌, Silence `#8f8aa8` 🔇, Peur `#9e7bc2` 😨, Fragilisé `#d77c7c` 🩹, Renforcé `#77b38f` 🛡, Inspiré `#d8c27a` ✦ | `legacy\assets\js\main.js:12474-12521` |
| Posture Haute (Claymore) | entrée 6 EM, 1 action ; prochaine Frappe devient « Frappe Haute » : `damage = N + level`, `epCost` 10, `blockEpDrain` 12/14/16/20, `noReposition` (niv 16), `defenseChipPct` 25 (niv 20) ; consommée après résolution, **n'expire pas d'elle-même** | `legacy\assets\js\main.js:11672-11677` ; A03 §6 |
| Fendre la Ligne | `blockBreakLine`, `defenseExtraEp` (+3 niv 10, +2 niv 20), `guardBonusDmg` +4 (niv 13), `noReposition` (niv 16), `nextDefenseTax` +2 (niv 20) | `legacy\assets\js\main.js:11678-11682` |
| Appel du Bouclier (Croisé B) | taunt sur tous les ennemis vivants : permanent si créature `Agressif`/`Très agressif`, sinon 1 tour ; `pvMaxBonus += perEnemyPvMax × nbEnnemis` (bouclier consommé en premier, retiré en fin de combat) ; désactivable sans action | `legacy\assets\js\main.js:11778-11844, 12091-12107` |
| Compteur élémentaire (Elementaliste) | même élément : `count++` ; `count ≥ 3` → `penalty = max(0.1, 1 − 0.25×(count−2))` (0.75, 0.5, 0.25, 0.1) ; changement avec `count ≥ 2` → combo (glace→feu `comboDamage`, feu→glace `briseArmure`, foudre→eau `+comboSelfEpGain` EP, eau→foudre `−comboEpDrain` EP) ; état **réinitialisé chaque round** (lore : « ±2 » persistant) ; coûts codés Feu 6 / Glace 4 / **Foudre 6 / Eau 4** (texte SD : Foudre 4 / Eau 6) | `legacy\assets\js\main.js:12117-12149, 12342, 11617-11628` |
| Invocations (Evocateur) | une vivante par porteur, une par nom et par combat (marqueur dans le journal) ; 2 actions, `epCur 999`, `emCur 0` ; PV/dégâts = base + niveau du porteur ; Tortue `autoInterpose` ; coût EM par action et disparition à court d'EM **non implémentés** | `legacy\assets\js\main.js:11492-11497, 11630-11640, 12324-12330` |
| Multi-coups / AOE | Taille Double `hits:2`, Rafale de Lames `hits:3` ; Spirale Brisante, Salve Aveugle, Domaine Étoilé : AOE alliés + ennemis, `undefendable` si « INDÉFENDABLE » | `legacy\assets\js\main.js:11641-11652` |
| Fin de round | tick des statuts ; `_usedDefs`/`decl` vidés ; `round++` ; taunts expirés ; état élémentaire remis à zéro ; fin automatique : aucun `player` vivant → « 💀 Tous les joueurs sont KO ! », aucun `beast` vivant → « 🏆 Tous les monstres sont KO ! » (phase `idle`, **sans** `combatEnd`) | `legacy\assets\js\main.js:12336-12353` |
| Fin de combat (« ■ FIN ») | pour chaque joueur non-invocation : `pvMax = f.pvMax − pvMaxBonus`, `pvCur = min(f.pvCur, pvMax)`, `epCur`, `emCur` copiés, statuts ajoutés `{id, desc:"", posedBy, posedAt}`, entrée `combat` « ⚔ <nom> — <round>R · PV:a/b EP:c/d » avec `combatId` ; archive d'abord, puis `players` si révision inchangée (sinon `VERSION_CONFLICT`) ; anti double-clic ; aucune XP/gemme distribuée | `legacy\assets\js\main.js:12357-12400` ; `legacy\scripts\test-gameplay-persistence.js:117-196` |
| Statut d'une archive | `draft` Brouillon → `progress` En cours → `victory` Victoire (toutes créatures KO) → `defeat` Défaite (tous joueurs KO) → `mixed` Résultat mixte ; `_draft = _inProgress || _new` (bug : `_new` jamais remis à `false` sauf au chargement) | `legacy\assets\js\main.js:14675-14685, 12719-12735, 12751` |
| Compteur « Créatures vaincues » | créatures `type:"beast"` à `pvCur ≤ 0` dans les archives `phase idle`, non `active/_draft/_inProgress` | `legacy\netlify\functions\db.js:703-712, 810-834` |
| Export Discord | `## ⚔ <nom>` / `*<date> · N round(s)*` / `**Joueurs :**` / `**Adversaires :**` (☠ si KO) / journal préfixé (💥 damage, 💚 heal, 📋 turn, ✨ spell, · autres) / `**État final :**` 🟢 > 60 %, 🟡 > 30 %, 🔴 / `**Résultat : Victoire ✓ | Défaite ✗**` / `**Drops :**` / `**Notes MJ :**` / `*— Nuages Polaires ☁️*` | `legacy\assets\js\main.js:12665-12700` |
| Numérotation des créatures | 1re instance `nom`, dès la 2e : `nom 1`, `nom 2`… | `legacy\assets\js\main.js:12424-12433` |
| Repos court « ☕ » | `cAdj(fi,'ep', −ceil(epMax×0.5))` — retire 50 % d'EP max (probable inversion) | `legacy\assets\js\main.js:12524-12536` |

### 4.6 Apparitions (générateur MJ)

| Règle | Valeur / formule | Source |
|---|---|---|
| Zones par défaut | `[🌳]-forêt-aux-lianes`, `[🌳]-forêt-aux-arbres-sombres`, `[🌳]-arbre-géant`, `[🌳]-forêt-centre`, `[🌳]-lisière-du-canyon` (noms de salons Discord) ; zones custom 80 max ; pool = créatures non `hidden` dont `zones` contient le libellé (les `archived` restent tirables) | `legacy\assets\js\main.js:13854-13860, 14059-14107` |
| Pondération | `behMult` Gibier 1.08 · Passif 0.92 · Neutre 1 · Agressif 1.12 · Très agressif 1.2 · Boss 0.4 ; `levelFactor = max(0.24, 1.42 − (niv−1)×0.09)` ; `baseCalc = 96 × behMult × levelFactor` (Boss : `min(·, 22)`, plancher 8) ; `base = spawnWeight` si défini > 0 sinon `baseCalc` ; `fatigue = 1 + over×0.22` ; `catchup = 1 + under×0.14` ; `encounterPenalty = 1 + déjàTiré×0.95` ; `weight = base × catchup / (fatigue × encounterPenalty)` (× 0.55 si déjà dans la rencontre) ; retenu si `> 0.5` ; tirage proportionnel | `legacy\assets\js\main.js:13861-13863, 14019-14040, 14126-14138` |
| Bug de base | `_normalizeBeastRecord` force `spawnWeight = max(1, …)` → `baseCalc` jamais utilisé, toutes les créatures sans poids saisi ont `base = 1` ; aucun formulaire n'expose `spawnWeight` | `legacy\assets\js\main.js:781` ; A03 §10.3 |
| Quantités | `[spawnMin, spawnMax]` si valides (jamais écrits : la normalisation produit `qtyMin/qtyMax`) ; sinon min 1, max Gibier 4 · Passif 3 · Neutre 3 · Agressif 2 · Très agressif 2 · Boss 1 ; niv ≤ 2 : +1 (Gibier ≤ 2 : +1 encore) ; niv ≥ 7 : `max(2, max−1)` ; niv ≥ 9 ou Boss : [1,1] | `legacy\assets\js\main.js:14041-14058` |
| Tirage | un seul groupe par roll ; `totals[id] += qty` ; `lastRuns` 24 max ; fusion de deux versions par `lastGeneratedAt` | `legacy\assets\js\main.js:14171-14257, 13932-13946` |
| Transfert en pré-combat | nom « Apparition — <zone> — JJ/MM/AA HH:MM — <rolledBy> », `qty` bornée à 30, instances numérotées | `legacy\assets\js\main.js:14365-14402` |
| Droits | générer : tout staff ; supprimer un roll : `manage_beasts` ; réinitialiser le global et voir les poids : `admin|fondateur|founder` | `legacy\assets\js\main.js:14171-14257` |

### 4.7 Bestiaire (référentiels)

| Règle | Valeur | Source |
|---|---|---|
| Comportements | Gibier 🐇 « Fuit ou évite le combat. » · Passif 😐 « N'attaque pas sans raison. » · Neutre ⚖ « Réagit selon le contexte. » · Agressif ⚠ « Attaque facilement. » · Très agressif ☠ « Attaque à vue. » · Boss 👑 « Créature d'élite. » ; formulaires : 5 valeurs seulement (`Boss` uniquement par import) | `legacy\assets\js\main.js:7427-7440, 7475-7486, 3323` ; `contenu\comportements-creatures.md` |
| Couleurs de comportement | page Système de jeu : Gibier `#6db88a`, Passif `#7eb8d4`, Neutre `#c9a84c`, Agressif `#c97a4a`, Très agressif `#c94a4a` ; tag bestiaire `agressif` `#c45858` (incohérence) | `legacy\assets\js\main.js:8819-8826, 7413-7426` |
| Bande de menace | `score = niv×2 + pv/8 + ep/10` → ≥ 28 « Menace majeure », ≥ 18 « élevée », ≥ 10 « sérieuse », sinon « modérée » ; dangerosité = score + 8 si `isBoss` | `legacy\assets\js\main.js:7970-7977` ; `legacy\assets\js\beast-admin.js:51-54` |
| Complétude | manques possibles `image`, `description`, `frappe`, `compétence`, `butin` (ni `drops` ni `gem`) | `legacy\assets\js\beast-admin.js:62-70` |
| Visibilité | `hidden` ou `archived` retirés du public ; clés `adminNote(s)`, `noteAdmin`, `staffNote(s)`, `mjNote(s)` retirées récursivement ; défauts création `niv 1`, `pv 20`, `ep 20`, `beh Neutre` | `legacy\netlify\functions\db.js:399-409, 676-683` ; A04 §2.3 |

### 4.8 Événements et participation

| Règle | Valeur | Source |
|---|---|---|
| Types | `combat` ⚔ « Combat / Chasse » (`--red`), `exploration` 🗺 (`--gold`), `social` 💬 « Social / Roleplay » (`--glacier`), `evenement` 🌟 « Événement majeur » (`--purple`), `autre` ☁️ (`--faint`) ; inconnu → `autre` | `legacy\assets\js\main.js:15013-15019` |
| Capacité | `max` entier ≥ 0, `0` = « Sans limite de places. » ; `isFull = max>0 && inscrits.length ≥ max` ; refus staff « La capacité ne peut pas être inférieure au nombre de participants déjà inscrits. » | `legacy\assets\js\main.js:15138, 15227-15294` |
| Visibilité | `hidden:true` = « Masqué · staff » ; alias hérité `published:false` ; `hidden` explicite prime ; non-staff ne voient pas les masqués | `legacy\netlify\functions\db.js:488-494` ; A06 §2.6 |
| État d'une carte | ordre `hidden > past > undated > joined > full > open` ; libellés « Masqué · staff », « Passé », « Date à confirmer », « Vous participez », « Complet », « Inscriptions ouvertes » | `legacy\assets\js\main.js:15138` |
| Inscription (serveur) | personnage lié requis (403 « Aucun personnage lié. ») ; masqué → 404 ; sans date ou passé → 409 `EVENT_CLOSED` ; complet → 409 `EVENT_FULL` « Événement complet. » ; homonymes → 409 `EVENT_UNAVAILABLE` ; ajoute le **nom du personnage** ; désinscription toujours autorisée ; `expectedVersion` de `events` obligatoire | `legacy\netlify\functions\db.js:877-958` |
| Staff | ne peut pas s'inscrire depuis la carte ; admin/mj/designer créent, modifient, masquent, suppriment | `legacy\assets\js\main.js:15033, 15123-15185` |
| Notification | uniquement à la **création** d'un événement publié par admin/MJ, opt-in ; entrée `history` `{type:"event", text:"📅 Nouvel événement : <nom> — <date> à <heure>"}` échappée, écrite sur **tous** les personnages ; succès partiel signalé | `legacy\assets\js\main.js:15272-15294` |
| Agenda | tri par date croissante (non datés en tête) ; « Passés » = 8 derniers ; accueil : « <type> · Dans N jour(s) » (`ceil((date−now)/86400000)`), description tronquée à 180 car. | `legacy\assets\js\main.js:15079-15121, 8149-8204` |

### 4.9 Comptes, sessions et limites

| Règle | Valeur | Source |
|---|---|---|
| Pseudo | regex serveur `^[A-Za-z0-9_\-À-ÿ ]{2,32}$`, unicité insensible à la casse ; client `^[a-zA-ZÀ-ÿ0-9_ -]{2,32}$` | `legacy\netlify\functions\auth.js:194, 641, 739` ; `legacy\assets\js\main.js:2122-2193` |
| Mot de passe | client : ≥ 4 caractères, `sha256:<hex>` ; serveur : `pbkdf2:<sel 32 o hex>:<hex>` PBKDF2-SHA512 100 000 itérations, 64 octets, **calculé sur le hash client** ; formats hérités `sha256:`/hex nu migrés au login | `legacy\netlify\functions\auth.js:148-179, 668-675` |
| Session | cookie `np_session` HttpOnly/Secure/SameSite=Strict, 30 jours ; JWT HS256 maison, `exp` en **millisecondes** ; révocation par `sessionVersion` ; session de reset ≤ 1 h limitée à `verify/complete_forced_reset/logout` | `legacy\netlify\functions\auth.js:104-146, 463-498` |
| Reset admin | secret 24 octets base64url (32 car.) affiché une fois, `forcePasswordReset`, `resetExpiresAt = now + 1 h` ; expiré → connexion impossible | `legacy\netlify\functions\auth.js:810-826, 455-457` |
| Rate-limit | 10 tentatives / 15 min par IP, `login:<pseudo>`, `register:<pseudo>` (mémoire + `np_rate_auth`) ; l'admin avec bon mot de passe traverse la limite | `legacy\netlify\functions\auth.js:87-102, 429-446, 643-652` |
| Dernier admin | non supprimable, rôle verrouillé | `legacy\netlify\functions\auth.js:844-858, 894-910` |
| Bornes de valeur | `MAX_VALUE_SIZE` 4 MiB, `MAX_ARRAY_ITEMS` 5 000, `MAX_OBJECT_KEYS` 5 000, `MAX_STRING_LENGTH` 25 000, `MAX_IMAGE_DATA_URL_LENGTH` 350 000, `MAX_DEPTH` 24 ; corps ≤ 32 KiB (`auth`) / 1 MiB (`db`) | `legacy\netlify\functions\db.js:81-87` ; `legacy\netlify\functions\auth.js:616-626` |
| Concurrence | version = `md5(value::text)` ; `expectedVersion` obligatoire → 428 `VERSION_REQUIRED` ; périmée → 409 `VERSION_CONFLICT` ; création avec `null` | `legacy\netlify\functions\db.js:462-471, 571-587` |

---

## 5. Modèle de données actuel et mapping relationnel

### 5.1 Clés `np_store` (`CREATE TABLE np_store (key TEXT PK, value JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT now())`, `auth.js:306-314`, `db.js:551-559`)

| Clé | Forme (JSON compact) | Lecture / écriture | Source |
|---|---|---|---|
| `accounts` | `[{ "id":"a1727712000000_9f3a1c2b", "pseudo":"Ashaii", "pass":"pbkdf2:<sel>:<hash>", "role":"joueur", "pid":null, "createdAt":1727712000000, "lastSeen":1727712000000, "sessionVersion":3, "forcePasswordReset":false, "resetExpiresAt":1727715600000, "selectedTheme":"dark", "unlockedThemes":["violet"], "blockedThemes":[], "updatedAt":… }]` | A : tous sans `pass` ; autres : le sien ; jamais écrivable en générique | A05 §3.1 ; `auth.js:743-751, 254-271` |
| `players` | `{ "id":"p1727700000000", "name":"Alice", "classe":"Duelliste", "arme":"Épée moyenne du serment", "branch":"Branche A — L'Élan Tranchant"\|"Aucune", "level":5, "xp":75, "xpMax":150, "progressionVersion":1, "pvCur":49, "pvMax":54, "epCur":38, "epMax":74, "emCur":13, "emMax":28, "avatar":"data:image/jpeg;base64,…"\|"https://…"\|"", "equipment":{"helmet":"Heaume de givre","chest":null,"legs":null}, "inventory":[{"id":"i…","name":"Potion boréale","category":"Consommable","qty":2}], "history":[{"ts":…,"type":"xp","text":"+10 XP (Loup des brumes, 100%)","by":"MJ Maitre","combatId?":"c…"}], "statuts":[{"id":"saignement","desc":"flanc gauche","posedBy":"Maitre","posedAt":…}], "journal":"…", "notifDeleted":[…ts], "unlockedThemes":[], "blockedThemes":[], "createdAt?":…, "class?":"(alias)", "sLevel/sXp/sXpMax?":"(hérités, supprimés)" }` | A, M tout ; J lié : le sien ; D : `[]` ; écriture A, M (champs MJ limités), J via actions dédiées | A02 §1 ; `db.js:293-307` |
| `beasts` | `{ "id":"b1727712000000", "nom":"Loup des brumes","name":…, "sub":…,"subtitle":…, "beh":"Agressif","behavior":…,"comportement":…, "niv":3,"level":3, "pv":40,"hp":40,"pvMax":40, "ep":20,"energy":20,"epMax":20, "frappe":"8 + Niv. Tranchant","attack":…, "comp":"Morsure glacée : …","skill":…,"ability":…, "drops":…,"loot":…, "gem":"1–10 Blanche","gemme":…, "desc":…,"description":…, "img":…,"image":…, "hidden":false, "archived":false, "statuts":[], "qtyMin":1,"qtyMax":1,"spawnWeight":1, "tags":[], "zones":["[🌳]-forêt-centre"], "style":"", "citation":"", "adminNote":"…", "createdAt":…,"updatedAt":…, "catalog":{…doublon…} }` ; champs fantômes non persistés : `isBoss`, `adminNotes`, `createdBy`, `updatedBy` | P/J filtré ; staff complet ; écriture A, M, D | A04 §1.1 ; `main.js:733-815` ; `db.js:308-318` |
| `serments_custom` | `{ "<Nom>": { "arme", "lore", "pvN", "epN", "emN", "dmg", "type?", "cat":"melee|distance|magie|soutien", "sermLevel":"basic|seasoned|emeritus|singular|transcended|corrupted|other", "hidden", "icon", "evolvesFrom?", "bA?":{…}, "bB?":{…}, "branches":[{ "nom","style","desc","paliers":[{ "niv","nom","cout","desc" }] }] } }` (peut valoir `null`) | P (sans filtrage de `hidden`) ; écriture A, D | A02 §4.4 ; A05 §3.4 |
| `events` | `{ "id":"ev1727700000000ab12cd", "nom":"Chasse au givre", "type":"combat", "desc":"…", "date":1729000000000\|null, "max":0, "hidden":false, "inscrits":["Aurore"], "createdBy":"MJ Lune", "updatedAt":… }` + alias hérités `titre`, `dateTs`, `published` ; champs inconnus conservés | P/J sans masqués et sans notes ; écriture A, M, D ; J via `set_event_participation` | A08 §1.1 ; `db.js:488-494` |
| `lieux` | `{ "id":"l1727712000000", "nom":"Havre Blanc", "type":"ville|ruine|donjon|nature|poi|secret", "desc":"…", "notes":"(staff, fuite)", "visible":true, "lat":500, "lng":800 }` | P **sans filtrage** ; écriture A | A05 §3.6 ; A09 §2.2 |
| `event_themes` | `[{ "id":"theme_1727712345678", "name", "desc", "cls":"theme-xxx", "preview":["#0d0e18","#7eb8d4","#c9a84c"], "event":true, "availableUntil":1777593600000\|0, "createdAt", "autoGrantAll":false, "visible":false, "label?" }]` (objet legacy `{id: entry}` toléré) | P ; écriture A, D ; auth `admin_set_theme_*` | A07 §3.1 ; `main.js:4339` |
| `theme_visibility` | `{ "violet":true, "halloween":false }` | P ; A (déclaré « local seulement » côté client) | `auth.js:1035-1042` ; A09 §4.3 |
| `spawn_lab_staff` | `{ "schemaVersion":2, "lastDbSyncAt", "totals":{"<beastId>":7}, "lastRuns":[{ "id":"roll_<ts>_<rand>", "idx":1, "zone", "zoneValue", "rolledBy", "rolledAt", "packs":[{ "id","nom","niv","beh","hidden","qty","prob","total","range":{"min","max"},"baseWeight","weightNow","catchup","fatigue" }] }], "totalDraws":12, "lastGeneratedAt", "lastGeneratedBy", "customZones":["[🌳]-forêt-aux-lianes", …] }` | staff (A, M, D) | A03 §10.1 |
| `np_syslog` / `np_syslog_archive` | `[{ "ts", "action":"liaison", "detail":"Compte 'Ashaii' lié au personnage 'Alice'", "actor":"Admin" }]` (500 max) ; archive `[{ "archivedAt", "label":"Archive du 30/09/2026 14:02", "filename":"archive-2026-09-30_14h02", "entries":[{ "ts","action","detail","actor","target":"Alice (Mizu)","src":"syslog|history" }] }]` (50 max) | A, M / A seulement | A05 §3.9 ; A08 §5 |
| `combat_arc_rec_<owner>__<id>` | archive complète = clone de `_cs` + méta : `{ "id":"c1727700000000", "name":"Combat du 30/09/2026", "notes", "active":false, "phase":"idle", "round":4, "turn":0, "order":[0,1,2], "initiative":0, "fighters":[{ "type":"player","pid","name","classe","level","pvCur","pvMax","epCur","epMax","emCur","emMax","dmgBase","statuts":[{"id","tours"}],"img","_cid" } \| { "type":"beast","bid","name":"Loup 2","level","pvCur","pvMax","epCur","epMax","emCur":0,"emMax":0,"dmgBase","frappe","comp","img","beh","statuts","_cid" } \| invocation { "isSummon":true,"ownerPid",…,"actionsMax":2,"autoInterpose","rangeType" }], "log":[{ "round","text","ts","type":"info|round|turn|damage|heal|spell|summon" }], "decl":{}, "pendingDrops":[{ "id":"pd…","beastId","beastName","gem","roll","round","fi","createdAt" }], "_iv":{}, "savedAt", "_owner", "_manualSaved", "_autosaveAt", "_autosaveReason", "_inProgress", "_draft", "_new" }` ; `fighters` ≤ 80, `log` ≤ 1 200 | A, M tout ; J propriétaire (owner ∈ {sub, pseudo, name, nom du personnage}) | A03 §2, §9.2 ; `db.js:98-102, 164-207` |
| `combat_arc_idx_<owner>` | `[{ "id","name","label","savedAt","round","phase","active","fighters":[≤80],"_owner","_manualSaved","_autosaveAt","_autosaveReason","_inProgress","_draft","_new","_stub":true }]` (5 000 max) | idem | A03 §9.2 ; `auth.js:504-524` |
| `combat_arc_<owner>` | liste de compatibilité : 50 archives complètes côté client (500 serveur) | idem | A03 §9.1 |
| `rpg_characters` (dérive) | `[{ "id":"rpg_<accountId>", "ownerId", "ownerPid", "ownerPseudo", "schemaVersion":4, "sourcePlayerId", "created", "name", "oath", "level", "xp", "gold", "loc", "spawn", "hp","maxHp","energy","maxEnergy","mana","maxMana", "reputation", "inv":{}, "equip":{"weapon","armor","trinket"}, "combat", "result", "visited":{}, "flags":{}, "log":[≤12×240], "updatedAt" }]` | actions `rpg_*` uniquement | A09 §1.4 ; `db.js:347-380` |
| `np_audit_log` | plus récent en tête, 1 000 max : auth `{ "ts","actorId","actorPseudo","actorRole","action","ip","details" }` ; db `{ …, "source":"db","origin","ua" }` | A (lecture) ; serveur seul (écriture) | A05 §6 |
| `np_rate_auth` | `{ "ip:1.2.3.4":{ "count":3, "first":… }, "login:<pseudo>":…, "register:<pseudo>":… }` | serveur seul | `auth.js:429-446` |
| `np_admin_recovery_consumed` | `{ "fingerprint", "pseudo", "consumedAt" }` | serveur seul | `auth.js:353, 382` |
| `theme_catalog`, `serment_catalog`, `page_content`, `themes_admin_store` | aucun producteur ni consommateur (clés mortes) | — | A05 §2.2, §11.7 |
| `public_stats` (calculé, non stocké) | `{ "players", "linkedPlayers":max(#comptes avec pid, #players), "activeWeek":#lastSeen > now−7 j, "totalGemmes", "creatureKills" }` | P via `get_public_bundle` | `db.js:836-842` |

Objets côté client : session `CU = { "type":"player"|"staff", "role", "pid", "name", "pseudo", "pending?":true }` (`main.js:1930, 2312-2370`) ; `localStorage` : `np_theme`, `np_theme_visibility`, `np_cache_version` (= `"np_v9_private_cache"`), `np_beasts`/`np_serments_custom`/`np_events`/`np_event_themes`/`np_lieux`/`np_public_stats` (cache public), `np_session_flag`, `np_last_app_tab` (`{ "id","settingsTab","at" }`), `np_app_build` (= `"np_v18"`), `np_runtime_visible`, `np_diag_visible`, `np_theme_collection_filters_v257`, `np_recent_crop_images`, `np_rpg_guest_v2`, `np_rpg_proto_v1`, `np_combat_arc_*` (quarantaine) ; jamais en local : `accounts`, `players`, `spawn_lab_staff`, `np_syslog*`, `np_audit_log`, `combat_arc_*` (A09 §4.3 ; `main.js:1345-1369`).

### 5.2 Mapping proposé vers un schéma relationnel (repris de A05 §15, complété par A02 §18, A03 §14, A04 §6, GPT-R §3-4)

Principes : une table par entité ; identifiants texte conservés à la migration ; `revision integer` par agrégat (remplace `md5(collection)`, sémantique 428/409 conservée) ; `created_at`/`updated_at` partout ; `jsonb` uniquement pour les blocs libres ; clés étrangères réelles ; migration idempotente depuis un snapshot `np-store-backup-v1` avec rapport d'anomalies (GPT-R §4).

| Table cible | Colonnes principales | jsonb résiduel | Origine | Notes de migration |
|---|---|---|---|---|
| `accounts` | `id PK`, `pseudo UNIQUE(lower)`, `password_hash`, `role enum(joueur,mj,designer,admin)`, `character_id FK NULL`, `session_version int`, `force_password_reset bool`, `reset_expires_at`, `selected_theme FK`, `last_seen_at`, `created_at` | — | `accounts[]` | `pass` conservé tel quel ; formats hérités vérifiés puis ré-encodés au login (GPT-R §2) |
| `account_theme_grants` | `(account_id, theme_id, kind enum(unlocked,blocked)) PK`, `granted_by` | — | `unlockedThemes`, `blockedThemes` (compte **et** personnage) | rattacher au compte uniquement (A02 §18) |
| `sessions` (nouveau, recommandé GPT-R §2) | `id` (empreinte HMAC du jeton), `account_id`, `session_version`, `scope enum(full,reset)`, `created_at`, `expires_at`, `revoked_at` | — | JWT `np_session` | anciens JWT invalidés au basculement |
| `characters` | `id PK`, `name`, `oath_id FK`, `branch`, `level`, `xp`, `pv_cur/pv_max/ep_cur/ep_max/em_cur/em_max`, `weapon`, `avatar_url`, `journal`, `progression_version`, `revision` | `equipment {helmet,chest,legs}`, `statuses` | `players[]` | `xpMax` dérivé, non stocké ; `class` → `oath_id` |
| `character_items` | `id`, `character_id FK`, `name`, `category`, `qty ≥ 0`, `description` | `extra` (champs inconnus conservés) | `players[].inventory` | |
| `character_history` | `id bigserial`, `character_id FK`, `ts`, `type` (xp/gemme/item/level/stat/serment/combat/add/remove/event), `text` (brut, échappé au rendu), `actor`, `actor_account_id`, `combat_id FK NULL`, `dismissed bool` | — | `players[].history` + `notifDeleted` (ts → ligne) | sans plafond 200 ; entrées structurées à terme (A02 §18) |
| `beasts` | `id`, `name`, `subtitle`, `behavior`, `level`, `pv`, `ep`, `strike`, `skill`, `drops`, `gem`, `description`, `image_url`, `style`, `quote`, `hidden`, `archived`, `qty_min`, `qty_max`, `spawn_weight`, `admin_note`, `revision` | `tags text[]`, `zones text[]`, `statuses` | `beasts[]` | fusion des alias `nom/name`, `beh/behavior/comportement`, `niv/level`, `pv/hp/pvMax`, `ep/energy/epMax`, `frappe/attack`, `comp/skill/ability`, `drops/loot`, `gem/gemme`, `desc/description`, `img/image`, `sub/subtitle`, `catalog` ; `isBoss` à décider (§10) |
| `zones` | `name PK`, `is_default`, `position` | — | `spawn_lab_staff.customZones` ∪ `beasts[].zones` | |
| `oaths` | `id` (nom), `weapon`, `pv_growth`, `ep_growth`, `em_growth`, `base_damage`, `damage_type`, `rank`, `hidden`, `evolves_from FK`, `icon`, `category`, `is_builtin`, `revision` | `lore`, `branches` (bA/bB/paliers `{niv,nom,cout,desc}` + `descPhys`, `flavor`) | `SD` (code) + `serments_custom` | semer les 13 natifs puis fusionner les customs |
| `events` | `id`, `title`, `type enum`, `description`, `starts_at NULL`, `capacity` (0 = illimité), `hidden`, `created_by FK`, `revision` | — | `events[]` | `titre/dateTs/published` normalisés |
| `event_participants` | `(event_id, character_id) PK`, `registered_at` | — | `events[].inscrits` (noms) | résolution par nom ; homonymes consignés (GPT-R §4.5) |
| `places` | `id`, `name`, `type`, `description`, `staff_notes` (privé), `visible`, `lat`, `lng` | — | `lieux[]` | à ne conserver que si décision « atlas » (§10) |
| `themes` | `id`, `name`, `css_class`, `description`, `is_event`, `available_until`, `visible`, `auto_grant_all`, `rarity`, `category`, `is_builtin` | `preview [bg,accent,gold]` | `CONFIG` theme-max + `THEMES_BASE` + `event_themes` + `theme_visibility` | source unique (A07 §3.1) |
| `combat_archives` | `id`, `owner_account_id FK NULL` (+ `owner_label` orphelins), `name`, `label`, `saved_at`, `round`, `phase`, `active`, `manual_saved`, `autosave_at`, `autosave_reason`, `in_progress`, `draft`, `revision` | `state` (fighters, log, order, notes, decl, pendingDrops) | `combat_arc_rec_*` + index + listes legacy | dédoublonner par `id` ; owner résolu pseudo/id/nom de personnage ; détails au-delà de 50 récupérés |
| `spawn_runs` / `spawn_totals` | `id`, `generated_at`, `actor`, `zone`, `payload jsonb` ; totaux calculés | `payload` | `spawn_lab_staff` | |
| `staff_log` | `id bigserial`, `ts`, `action`, `detail`, `actor_account_id`, `actor_name`, `target` | — | `np_syslog` | sans plafond ; écriture par **append** (A08 §5.5) |
| `staff_log_archives` | `id`, `archived_at`, `label`, `filename` | `entries` | `np_syslog_archive` | |
| `audit_log` | `id bigserial`, `ts`, `source`, `action`, `actor_account_id`, `actor_pseudo`, `actor_role`, `ip`, `origin`, `user_agent` | `details` | `np_audit_log` | |
| `auth_rate_limits` | `(scope, subject) PK`, `count`, `window_start` | — | `np_rate_auth` | incréments atomiques (GPT-R §2) |
| `admin_recovery_consumptions` | `fingerprint PK`, `pseudo`, `consumed_at` | — | `np_admin_recovery_consumed` | |
| *(supprimé)* | — | — | `rpg_characters`, `themes_admin_store`, `theme_catalog`, `serment_catalog`, `page_content` | exportés dans le snapshot, non repris |

Invariants de migration : passer `accounts[].pass` tel quel ; résoudre les owners d'archives et les `inscrits` par nom ; préserver `progressionVersion:1` sans double gain ; remplacer `md5(collection)` par `revision` par ligne ; snapshot vérifié **avant** toute transformation ; comparaison de projections métier source/cible, pas seulement des comptes de lignes (A05 §15 ; GPT-R §4.6).

---

## 6. Inventaire du contenu éditorial (`docs\overhaul\audit\contenu\`, index commenté A04 §4)

| Fichier | Contenu | Source legacy | Complétude |
|---|---|---|---|
| `accueil-public.md` (82 l.) | Masthead, hero, 5 compteurs, sections L'univers / Les Serments / invitation, colophon, écran règlement pré-inscription | `index.html:6561-6693` ; `main.js:2002` | **Complet.** Contient le bouton « RPG — expérimental ↗ » à supprimer. |
| `synopsis.md` (39 l.) | Hero « L'Argonaute a chuté. », manuscrit « La chute / Le basculement / Le réveil », clôture « Ce qui reste à écrire dépend de ceux qui se relèvent. » | `main.js:8280-8305` | **Complet.** Point de lore à conserver : « les constructions ont presque toutes disparu ». |
| `reglement-hrp.md` (383 l.) | Préambule, Partie I HRP (I.1-I.7), Partie II RP (II.1-II.4), Partie III Sanctions (tableau, recours 48 h), Partie IV Dispositions finales, Glossaire (20 termes), Mentions légales, Politique de confidentialité (« mai 2026 ») | `main.js:8307-8628` | **Complet (verbatim).** Mentions légales/RGPD à sortir du règlement (A01 §5.10, §9.8). |
| `systeme-de-jeu.md` (263 l.) | Système de combat I-XI (philosophie, statistiques, récupération, structure, actions/coûts, surcadençage, épuisement, plusieurs entités, fin, interprétation des dégâts par type, Serments & progression, gemmes), comportements des créatures, constantes `SERM_PALIERS` | `main.js:8630-8839, 9299-9300` | **Complet.** Diverge du moteur sur plusieurs points (A03 §11 ; §10-5). |
| `serments-catalogue.md` (384 l.) | Forme JSON d'un Serment, en-tête de page, libellés de carte, rangs, icônes/catégories, 13 Serments natifs (lore, branches, `descPhys`, `flavor`, paliers) | `main.js:213-485, 6078-6105, 6166, 6520` | **Complet pour les natifs.** Les `serments_custom` de production ne sont pas extraits. |
| `premiers-pas.md` (82 l.) | 5 états, bloc de statut, 4 étapes, 3 repères, FAQ, pied, table de navigation | `assets/js/first-steps.js` | **Complet.** Carte « Un RPG à explorer à part » à supprimer. |
| `ecrans-compte-et-accueil-connecte.md` (89 l.) | Inscription, connexion, nouveau mot de passe, compte en attente (écran mort), shell, tableau de bord, têtes de chapitres de la fiche | `index.html:6696-6948, 7136-7258` ; `main.js:8104` | **Complet pour les libellés** ; corps de la fiche dans A02. |
| `bestiaire-libelles.md` (45 l.) | Libellés public, atelier, panneau, modales, zones, recadrage, toasts, confirmations | `beast-admin.js`, `bestiary-admin-pass2.js`, `main.js:3315-3390, 7648-7749` | **Complet mais mélange libellés actifs et morts** (A04 §4 indique la version active). |
| `comportements-creatures.md` (55 l.) | Tables `BHC`/`BHL`/`BHM`, textes longs, texte de la page Système de jeu, filtres, pondérations d'apparition | `main.js:7413-7519, 7959-7969, 8819-8826, 14019-14058` | **Complet.** Incohérence de couleur `Agressif` signalée. |

**Absents du dépôt** (à obtenir du propriétaire, A04 §4, A05 §9) : les créatures réelles (seules des fixtures existent, `legacy\scripts\helpers\local-app.js:29`), les Serments personnalisés, les événements, les lieux, les archives de combat, le contenu de `page_content` — tous uniquement dans la base de production (snapshot du 21/09/2026 : 84 lignes, hors dépôt).

---

## 7. Identité visuelle à conserver

### 7.1 Palette « Mystique polaire » (charte `legacy\docs\charte-graphique-mystique-polaire.md:11-24` ; A07 §2.1)

| Nom | Hex | Usage |
|---|---|---|
| Nuit d'encre | `#091519` | fond principal (`theme-color`), `--bg` |
| Pierre sombre | `#102327` | surfaces `--bg2` |
| Brume profonde | `#172E32` | surfaces secondaires `--bg3` |
| (4e niveau) | `#213b3e` | `--bg4` |
| Ivoire | `#F0EEE5` | titres, texte |
| Brume claire | `#BDCDC8` | texte secondaire `--dim` |
| (texte effacé) | `#92aaa3` | `--faint` |
| Aurore | `#95CDBB` | liens, repères, interactions, focus (`--glacier`) |
| Aurore sombre | `#648f83` | `--glacier-dim` |
| Laiton pâle | `#C6B38B` | Serments, numérotation, détails rares |
| Sauge claire | `#C6D8C4` | action principale de l'accueil (hover `#e0e8d8`) |

Sélection `#95cdbb40` ; bordures `#d4e4dd17/20/30`, `#95cdbb30/50/60`, `#c6b38b60`. Les couleurs sémantiques restent fixes quel que soit le thème : PV rouge `#c94a4a`, EP or `#c9a84c`, EM glacier `#7eb8d4`, XP vert `#5aaa7a` ; 12 statuts (§4.5) ; 5 types d'événement ; comportements et dangerosité ; gemmes (blanche `#e8e8f8`, incarnate `--purple`, écarlate `--red`) ; rôles (admin rouge, MJ or, designer violet, joueur glacier) ; notifications ok vert / err rouge / inf glacier ; couleurs par Serment `_sermColor` (Duelliste `#7eb8d4`, Bretteur `#89d89a`, Claymore `#c9a84c`, Lame d'Honneur `#c9a84c`, Sauvageon `#c94a4a`, Croisé `#c9a84c`, Rôdeur `#6db88a`, Traqueur `#c084d4`, Flécheur `#7eb8d4`, Élémentaliste `#c9a84c`, Évocateur `#c084d4`, Conjurateur `#6db88a`, Arcaniste `#a8d4f0`) (A07 §2.4 ; `main.js:16274-16282`).

### 7.2 Typographie et mesures (A07 §2.5-2.6)

- **Cormorant Garamond** (400-600, italique 400-500) pour les grands titres, citations, chiffres : hero `400 clamp(76px,7.8vw,120px)/.83`, `letter-spacing −.045em` ; H1 connectés `500 clamp(40-44px,4.7-5vw,62-68px)/1.03-1.05`, `−.02/−.025em` ; nom du personnage `500 clamp(42px,4.2vw,64px)` ; chiffres `lining-nums tabular-nums`.
- **Manrope** (400-700) pour le corps, champs, menus, boutons : body `14px/1.65` ; eyebrows `500 10px`, `.2em`, capitales ; boutons `500 11px`, 44 px min ; champs `13-14px`, 44-48 px.
- **Cinzel** optionnel pour de rares repères. Polices locales woff2 sous licence OFL (`legacy\assets\fonts\`), `font-display: swap`, préchargement.
- Rayons mats : cartes 3-4 px, boutons/champs 3 px, chips 2 px, portrait en arche `48px 48px 2px 2px`. Aucune ombre sur les cartes ; menus `0 12px 28px rgba(0,0,0,.18)`. Échelle d'espacement 4-48 px ; transitions `.12/.2/.35s` ; header 78 px ; gabarits 1320 / 1200 / 1180 px ; ruptures 1200 (nav → burger), 900, 760, 600.
- Accessibilité : skip-link « Aller au contenu », focus `2px solid var(--glacier)` offset 2-4 px, cibles ≥ 44 px, inputs 16 px sur mobile, `prefers-reduced-motion`, `color-scheme`, `aria-pressed/aria-label` des cartes de thème, aucun débordement horizontal à 390 px (A07 §2.7 ; A06 §3.N ; A09 §3.11).

### 7.3 Catalogue des thèmes (A07 §3.2 ; ordre `dark, light, violet, green, aquaris, easter, halloween, noel, bloodmoon`)

| id | Libellé theme-max (production) | Libellé main.js | Rareté / catégorie | `colors` | tone | `availableUntil` | Obtention |
|---|---|---|---|---|---|---|---|
| `dark` | Nuages Polaires | Nuages Polaires | Base | `#091519 / #95cdbb / #c6b38b` | dark | — | toujours accordé |
| `light` | Brume Claire | Brume Claire | Base | `#f4f5fa / #3a8fba / #9a7020` | light | — | toujours accordé (palette encore legacy) |
| `violet` | Galactique | Galactique | Rare | `#03020b / #9b7cff / #73d8ff` | dark | — | don admin (météores, étoiles) |
| `green` | Sylvan | Sylvan | Rare | `#031108 / #51c56d / #d8c16a` | dark | — | don admin (sous-bois) |
| `aquaris` | Aquaris — Royaume englouti | Aquaris | Rare | `#011018 / #48d6ef / #e5c878` | dark | — | don admin (rayures) |
| `easter` | Pâques enchantées | Printemps Éveillé | Saisonnier / « Événement » | `#f7fff2 / #7fdc82 / #ffd86b / #ffb6d8` | light | 1er mai 2026 (échu) | saisonnier |
| `halloween` | Veille d'Halloween | Nuit des Âmes | Saisonnier | `#0a0911 / #ff8f2b / #7c59ff / #d8d2ff` | dark | 2 nov. 2026 | saisonnier |
| `noel` | Noël en fête | Veillée Hivernale | Saisonnier | `#08140d / #d84a52 / #2ea85f / #f2c66d` | dark | 6 janv. 2027 | saisonnier (neige) |
| `bloodmoon` | BloodMoon | Lune de Sang | Fondateur | `#050102 / #e3133f / #f0c76f` | dark | 0 (toujours ouvert) | don admin (lune) |

Règles d'attribution à reproduire (A07 §3.3) : `dark`/`light` toujours accordés ; visibilité admin par thème (`theme_visibility`) ; don individuel (`admin_grant_theme`, joueurs seulement), « Donner à tous », auto-distribution (`autoGrantAll`), blocage, révocation (remet `dark`), possession définitive même après expiration, staff voit tout ; aucun prix ni boutique ; déblocage direct par le joueur **désactivé** (403). États de la collection : « Équipé » / « Possédé » / « À débloquer » / « Indisponible » ; actions « Thème actif » / « Équiper » / « Débloquer » / « Non disponible ». Alias d'id : `aquarius→aquaris`, `blood-moon`/`lune-de-sang→bloodmoon`, `red/ecarlate→dark`, `default→dark`, `theme-x→x`.

### 7.4 Ton et composants réussis (A07 §7 ; A01 §10 ; GPT-P §4 ; GPT-C §2)

- **Voix** : tutoiement, phrases courtes, présent ; eyebrows « Le Compagnon / … » ; chapitres de fiche « Les forces du moment. » / « Ce que tu emportes. » / « Les traces du voyage. » / « Le lien qui te définit. » ; agenda « Les rendez-vous du monde. », « Le prochain chapitre », « Un horizon encore ouvert. » ; vides honnêtes (« Les récits restent à écrire. », « Aucune notification. ») ; jamais de faux chiffres (« aucun faux nombre de joueurs en ligne », charte l. 48) ; jamais de succès annoncé avant confirmation serveur.
- **Composants** : accueil Mystique polaire complet (hero avec `nuages-polaires-horizon.jpg`, sections numérotées, citations laiton, colophon) ; emblème boussole (favicon, wordmark, sceau, orbite des Serments, logo cliquable recoloré par thème) ; boutons 44 px bordés sans effet ; champs 44-48 px ; cartes `bg2` + bordure 1 px + rayon 3-4 px avec filet supérieur 2 px pour les vedettes ; listes à filets plutôt que cartes ; bloc calendrier ; portrait en arche ; chips 2 px ; stats en colonnes séparées ; eyebrows 10 px `.13em` ; numéros de section laiton ; grille de collection 3/2/1 ; test de contraste ≥ 3:1 par thème ; jsPDF vendorisé (MIT) chargé à la demande.
- **Direction créative recommandée par GPT** (GPT-C §2) : composition asymétrique, marge généreuse, aplats ivoire ponctuels pour les extraits ; retirer cadres gigognes, halos, troisième police, numérotation décorative systématique, textures derrière les données ; mouvement minimal ; états en texte et forme, pas seulement en couleur.

---

## 8. Dette et dérive à supprimer (liste ferme)

**Dérive « jeu en ligne » — supprimer intégralement**
1. `legacy\assets\js\rpg-prototype.js` ; onglet `#rpg-prototype` (`index.html:7290-7291`) ; boutons nav (`index.html:7019`), tiroir (`7093-7095`), colophon (`6626`) ; script (`9038`) ; hooks `main.js:2315, 5251, 4353, 5580-5585` ; article et action `first-steps.js:102, 135` ; handlers `rpg_get_character`/`rpg_save_character` et helpers `db.js:319-327, 347-380, 588-614, 740-760` ; clé `rpg_characters` ; `scripts/test-rpg-*.js` ; `localStorage` `np_rpg_guest_v2`, `np_rpg_proto_v1` ; `BroadcastChannel("np-rpg-prototype")` et joueurs fictifs ; promesse « RPG — expérimental » partout (A09 §1).
2. Carte du monde : `main.js:15351-15655` (`renderCarte`, `_initCarte`, `LIEU_TYPES`, modale `m-lieu` inexistante), `'carte'` dans `TAB_POPUP_IDS` (`main.js:5422`), CSS Leaflet (`index.html:979-986, 6253-6260`) ; clé `lieux` à arbitrer (§10) (A09 §2).
3. Compteurs et KPI orientés combat : « Élèves invoqués », « Créatures vaincues », « Gemmes distribuées », `public_stats.creatureKills`, KPI admin « Créatures les plus affrontées » / « Combats » — à rééquilibrer vers les récits (A01 §11 ; A08 §10 ; GPT-P §3.2).
4. Gamification des thèmes : hero/toolbar/progression de collection injectés par `theme-max.js`, « Secret scellé », bouton « Débloquer » et `self_unlock_theme` (403 permanent), `THEME_CANON_META`, `renderThemeCollectionPremium` (`ui-patches.js:94-171`), preview `red`, drapeaux `earlyClouds*` (A07 §8, §12).

**Dette structurelle front — ne pas reproduire**
5. Monolithe global : `main.js` (747 fonctions top-level, 72 `window.X=`, `esc` défini deux fois `main.js:155, 10269`, 132 `catch` vides), `index.html` 9 040 lignes dont 5 550 lignes de `<style>` + 15 blocs de patch (`index.html:5571-6542, 7510-9025`), 20 scripts bloquants sans `defer` (A09 §3.17, §4.1, §4.6).
6. Les 18 scripts de patch/polish (`ui-patches`, `finish-audit`, `theme-max` moteur, `api-hardening` wrappers, `diagnostics`, `site-self-test`, `admin-dashboard`, `theme-regression`, `staff-navigation`, `connected-pages-polish`, `mobile-polish`, `visual-audit-polish`, `database-admin-polish`, `home-readability-polish` (mort), `beast-admin`, `bestiary-admin-pass2`) : 11 `MutationObserver` + 11 `setInterval`, monkey-patching (`_loadSessionBundle` ×3, `fetch` ×2, `renderBGrid` ×2, `renderStats` ×2, `switchTab`, `applyTheme`, `renderDatabase`, `renderCollection`), hacks `[style*="background:rgba(7,8,16"]`, détection de boutons destructifs par contenu d'`onclick` — leurs apports utiles sont reformulés en exigences R-* (A09 §3, §8.2).
7. `onclick=` (427), `style=` (898), CSP `script-src 'unsafe-inline'`/`style-src 'unsafe-inline'` (`legacy\netlify.toml:24`), Google Fonts distantes (Cinzel en double, Crimson Pro, JetBrains Mono), `--fh` non défini, `--fm` monospace pour les valeurs (A09 §4.2 ; A07 §8.5).
8. 2 418 `!important`, halos, verre, `backdrop-filter`, `text-shadow`, rayons 18-28 px, pills 999 px, `color-mix` décoratifs, ancien accueil « Mac premium pass » (`index.html:7653-7925`), brumes `.home-fog`, canvas de particules de connexion, overlay de transition à flash bleu, œufs de Pâques, palette bleue résiduelle (favicon, `.login-emblem`, PDF `main.js:16015-16061`, formulaire admin de thème) (A07 §8, §12).
9. Navigation : écrans publics sans URL, hash seulement pour les onglets connectés, `logout` par `location.reload()`, mode « popup » généralisé, `s-pending`/`renderPendingTab`/`renderMJList`/`renderQaReport` morts, champs cachés obsolètes du login, modale `m-addmj` jamais ouverte, alias `arena`/`stats`, trois gestionnaires `Escape`, deux bannières de service concurrentes (A01 §11 ; A08 §3.5, §4.2).
10. Simulateur : moteur piloté par regex sur le **texte** des paliers et compétences (Bretteur, Lame d'Honneur, customs non modélisés), règle portée par le journal (`type:"summon"`), `defenseOf` mort, `subit` sans effet, `_surc`, `_csRedoHist`, `combatMovePos` non exposé, 400 lignes de CSS injectées, `data-opts` sérialisés dans `onclick` (A03 §14).

**Dette de données et backend — solder à la migration**
11. Table unique clé/JSONB : collections entières réécrites (un MJ qui ajoute un objet renvoie tous les personnages), `md5` de collection comme version, lecture de toute la table pour le bundle public, `CREATE TABLE IF NOT EXISTS` à chaque requête, bootstrap admin à chaque `login`/`register`, aucune contrainte relationnelle (A05 §14 ; A08 §3.3).
12. Identités par nom : owners d'archives (pseudo / id / nom de personnage), `events.inscrits` par nom de personnage (homonymes refusés) ; trois familles de clés d'archives + quarantaine `localStorage` ; deux schémas d'événement ; alias dupliqués du bestiaire et champs fantômes (`isBoss`, `adminNotes`, `createdBy`) ; `qtyMin/qtyMax` vs `spawnMin/spawnMax` (A05 §11.13 ; A04 §6.1 ; A06 §7.3).
13. Troncatures silencieuses : `history` 200, `np_syslog` 500 (client 2 000), archives 50/500/5 000 ; journal système jamais chargé (première écriture 409 probable) ; notification d'événement = réécriture complète de `players` ; `notifType` par mots-clés ; `history[].text` rendu en HTML brut (A05 §11.12 ; A08 §5.5, §10 ; A02 §18).
14. Doublons auth/db (CORS, JWT, SQL, rôles), JWT `exp` en ms, rate-limit mixte, `NP_SITE_URL` optionnel = CORS ouvert, mot de passe ≥ 4 caractères côté client seulement, pass-the-hash, `admin_revoke_theme` non normalisé, `self_unlock_theme` mort, fuites mineures (`lieux.notes`/`visible`, `serments_custom.hidden`, `forcePasswordReset`/`sessionVersion` dans le bundle), clés mortes (`theme_catalog`, `serment_catalog`, `page_content`, `themes_admin_store`) (A05 §11, §14).
15. Métadonnées de thèmes en triple (`CONFIG`, `THEMES_BASE`/`THEMES_EVENT_BUILTIN`, `THEME_CANON_META`, DB) avec noms et catégories divergents ; `theme_visibility` déclarée « locale » côté client mais écrite côté serveur ; thèmes custom admin sans CSS ; trois palettes sombres concurrentes (A07 §8.6 ; A09 §4.3, §6.5, §6.8).
16. Trois tables de couleurs de styles de Serment (`STYLE_COLORS`, `STYLE_COLS`/`STYLE_GLYPHS`, `_sermColor`), clés à orthographe hétérogène (`Elementaliste`/`Élémentaliste`, `Rodeur`/`Rôdeur`), `xpMax` stocké, filtre `de` sans producteur, `createdAt` de personnage jamais écrit, branches custom sans `descPhys`/`flavor`, palier custom limité à 2/5/7/10 (A02 §18).
17. Pipeline : `build.js` copie tout (code mort et outils admin publiés à tous), `check.js` sans lint ni typage, `check-api-hardening-wrapper.js` (garde-fou d'un bug de wrapper), tests découpant `main.js` par repères textuels (11 fichiers), trois runners hétérogènes, sélecteurs `onclick="…"` figés par les tests, aucune CI, aucun hash d'assets, version répétée à la main (`index.html:5` en v3.6.5), dossier parasite `legacy\Nuages Polaires\` (A09 §5, §8 ; A06 §7.2).

**Bugs constatés à ne pas reporter** (A03 §14 ; A08 §10 ; A04 §6.3) : `cHydrateCombatState` inexistante (archives inchargeables), `combatPassTurn`/`combatNextRound` inexistantes, `_new` → « Brouillon » permanent, `spawnWeight` forcé à 1, `spawnMin/Max` jamais lus, regex de `renderCombatHistFiche` incompatibles avec `combatEnd`, « ☕ » inversé, « actions réduites » mensonger, `renderCarte` `ReferenceError`, `+ Combat` pour un designer vers un onglet interdit, un Boss importé redevient Neutre à l'édition, `setAccountPid` ignore la valeur vide, `startAdminPoll` sans appel réseau, `resetAccountPass` proposé au MJ puis refusé serveur, suppression admin d'un compte laissant le personnage orphelin, `sysLog` de suppression écrit avant l'écriture effective.

---

## 9. Invariants de sécurité et de concurrence à préserver (A05 §13, A06 §6, A09 §7)

**Sécurité et permissions**
1. Rôles `joueur / mj / designer / admin` ; `accounts` jamais modifiable en générique (`set` → 403) ni supprimable ; `players`, `beasts`, `events` et toutes les `CRITICAL_COLLECTION_KEYS` jamais supprimables (seules les `combat_arc_*` le sont) ; stores internes (`np_rate_auth`, `themes_admin_store`, `np_admin_recovery_consumed`, clés inconnues) invisibles même aux admins (`db.js:75-103, 156-207` ; A06 C1-C2, D3).
2. Joueur = lecture de **son seul** personnage + quatre actions dédiées (`patch_own_player` journal/avatar, `consume_own_item`, `dismiss_notifications`, `set_event_participation`) ; tout champ supplémentaire → 400 ; identité dérivée de la session, jamais du corps ; MJ = `xp, xpMax, level, pvCur, pvMax, epCur, epMax, emCur, emMax, inventory, history, equipment, statuts` (+ avatar/journal de sa propre fiche), création autorisée, suppression et identité/serment/branche/journal refusées par champ ; designer sans accès aux personnages (`db.js:428-461, 877-1029` ; A06 D5-D6, E1-E2, I1-I6).
3. Filtrage public récursif avant envoi : créatures `hidden`/`archived` et clés `adminNote(s)`, `noteAdmin`, `staffNote(s)`, `mjNote(s)` (y compris imbriquées) ; événements masqués ou `published:false` ; `pass` jamais renvoyé ; `public_stats` calculé serveur (`db.js:399-409, 668-699` ; A06 C4-C6, A13).
4. Validation d'avatar avant sanitisation : `data:image/(png|jpe?g|webp|gif);base64,…` ≤ 350 000, `http(s)://` sans identifiants, chemin relatif sans schéma ; rejet 400 de `x" onerror=`, `javascript:`, `data:image/svg+xml`, `//evil`, `\evil` ; échappement HTML côté serveur du texte d'historique produit par un joueur ; `sanitizeText` (contrôles, `<script>`, `javascript:`) ; `sanitizeDeep` (`__proto__`, nombres non finis) ; bornes de taille (§4.9) (`db.js:410-427, 208-255` ; A06 D7).
5. Cycle des mots de passe et sessions : cookie HttpOnly/Secure/SameSite, révocation par `sessionVersion` appliquée dans **les deux** handlers (logout, changement, reset, récupération), logout serveur idempotent, session de reset restreinte ≤ 1 h à `verify` + `complete_forced_reset` + `logout`, secret temporaire aléatoire jamais stocké ni journalisé en clair, `forcePasswordReset` sans `resetExpiresAt` valide = connexion impossible, récupération admin par variables d'environnement consommée une fois, dernier admin protégé, admin non auto-supprimable, 401 générique avec délai sur compte inconnu (A06 A4-A12 ; A05 §4).
6. Journal d'audit serveur systématique (actions auth et db listées A05 §6, avec IP, acteur, rôle) ; journal staff nommé (`np_syslog` actions A08 §5.2) ; aucune donnée privée en `localStorage` (`_isPrivateKey`, purge au chargement/login/logout) ; archives locales héritées ni réimportées ni effacées sans export vérifié + confirmation (A09 R-LS1-4 ; A06 G12-G15).
7. CSP et en-têtes : `X-Frame-Options DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS preload, COOP/CORP `same-origin` conservés (`legacy\netlify.toml:14-21`) ; CSP à durcir (aucun `on*=`/`style=` généré, polices locales) ; contrôle d'origine `Origin`/`Referer` = `NP_SITE_URL`, `Content-Type` JSON strict, corps borné (A09 R-CSP1-4 ; A05 §1.2).

**Concurrence et intégrité**
8. Contrôle optimiste bout en bout : version par ressource, `expectedVersion` obligatoire (428 `VERSION_REQUIRED` « Recharge les données avant de les modifier (version attendue requise). »), prédicat **dans l'instruction SQL** (`UPDATE … WHERE version = $expected`, zéro ligne → 409 `VERSION_CONFLICT` « Ces données ont été modifiées par une autre session. Recharge-les avant de réessayer. »), création avec `expectedVersion: null` + `ON CONFLICT DO NOTHING`, deux écritures concurrentes → exactement `[200, 409]`, jamais de relance automatique (A06 D1, §6.1 ; A05 §5.4 ; GPT-R §3).
9. Côté client : file d'écriture **par collection** chaînant la version confirmée, **bloquée après un 409 jusqu'à une relecture acceptée**, rejet sans requête de tout instantané staff périmé (I12), refus métier (`ITEM_UNAVAILABLE`, `EVENT_CLOSED`, `EVENT_FULL`, `EVENT_UNAVAILABLE`) sans blocage ; une lecture lancée avant/pendant une écriture ne peut jamais écraser une valeur confirmée (`get` → `{skipped:true}`, bundles omettant la clé) (A06 F14-F18, I11-I12, H12, H19).
10. Isolation de session côté client : `_dbSessionGeneration` incrémenté à chaque login/logout, toute réponse tardive rejetée `SESSION_CHANGED` sans toucher cache, versions, brouillons, notifications, rendu, modales ni animations ; aucun appel `verify`/session automatique avant connexion ; 401 n'est pas une panne (A06 §3.B ; A09 R-API1-5).
11. Discipline « rien avant confirmation » : pas de décrément local, pas de notice `ok`, pas de fermeture de modale, pas d'entrée d'audit, pas de rendu tant que le serveur n'a pas répondu ; en échec, restauration exacte du cache sans écraser un cache plus récent ; `undefined`/`{ok:false}`/`{skipped:true}` ne valent jamais succès ; brouillon conservé et téléchargeable en cas de conflit (A06 F10-F13, O1-O3, H24 ; A09 §1.7, §7.3).
12. Opérations atomiques : suppression de compte + personnage lié en **une** instruction SQL verrouillée (`WITH locked … FOR UPDATE`), annulée en bloc si le compte ou le personnage a bougé ; fusion champ par champ des comptes avec 409 sur collision du même champ et sur changement des `SECURITY_FIELDS` (`pass, role, pid, sessionVersion, forcePasswordReset, resetExpiresAt`), `lastSeen` par `max` ; fin de combat = archive puis fiches, abandon si la révision `players` a changé, une seule entrée d'historique, invocations exclues, anti double-clic ; fusion de gemme = crédit + retrait dans la même sauvegarde ; consommation = −1 + historique ; participation = capacité + insertion ; archivage du log = archive → log → historiques avec vérification de version à chaque étape (A06 A14-A15, A19-A25, P1-P4, L1-L3 ; A05 §7). GPT-R §3 recommande d'implémenter ces cas par **transactions SQL** (fonction SQL ou batch transactionnel), avec clé d'idempotence de clôture de combat.
13. Règle de progression partagée : le **même module** de règles sert navigateur et serveur (`progression.js` UMD) ; migration appliquée à la lecture sans réécrire le store, persistée « une seule fois » à l'écriture autorisée, idempotente, définitions custom appliquées avant migration, gains jamais doublés (A06 F1-F3, F9 ; A02 §3).
14. Sauvegarde logique `np-store-backup-v1` : texte JSONB brut, `updated_at` texte, lignes triées, `sha256` canonique, fichier `0o600` jamais écrasé, lecture `RepeatableRead` lecture seule, aucun secret en sortie ; snapshot obligatoire **avant** toute transformation (A06 §3.K ; A05 §9).

---

## 10. Décisions ouvertes pour le propriétaire

Chaque décision cite la question d'origine ; la recommandation est celle du synthétiseur.

| # | Décision | Origine | Recommandation |
|---|---|---|---|
| 1 | **[BLOQUANT] Périmètre du simulateur MJ, des Apparitions et des archives** : « combats jouables en solo » ne vise-t-il que le RPG ? Le simulateur reste-t-il un outil d'arbitrage MJ ? | A09 Q3 ; GPT-P §2 ; A06 §7.1 | Garder Simulation, Apparitions et archives comme **outils de table conduits par le MJ** (moteur en données structurées, joueurs en lecture) ; supprimer uniquement RPG et carte. |
| 2 | **[BLOQUANT] Staff sans personnage lié** : conserver l'emprunt du premier personnage du registre comme `pid` d'affichage ? | A01 Q1 ; A05 Q7 ; A08 Q4 | Supprimer : un compte staff a `pid = null` sauf liaison explicite à un personnage propre ; en-tête, cloche et « Mon personnage » reflètent cet état. |
| 3 | **[BLOQUANT] Frontière public / connecté** : Synopsis, Serments, Bestiaire (filtré), Système de jeu, Événements publiés doivent-ils être lisibles sans compte ? | A01 Q3 ; `legacy\docs\plan-du-site-2026-09-23.md:274-276` | Oui, en lecture publique avec routes réelles ; la fiche, l'agenda avec inscription et les outils restent connectés. |
| 4 | **[BLOQUANT] Schéma d'authentification** : conserver le hachage client `sha256:` + PBKDF2 (pass-the-hash), le minimum de 4 caractères et le JWT maison ? | A05 Q2 ; GPT-R §2 | Mot de passe original sous TLS, vérification des formats hérités (`pbkdf2:`, `sha256:`, hex nu) puis ré-encodage scrypt ; minimum 8 caractères pour les nouveaux ; table `sessions` avec jeton opaque, `session_version` conservé. |
| 5 | **[BLOQUANT] Divergences règles publiques ↔ moteur** : Pugilat 3+Niv ou 4+Niv ; défenses (trio Esquive 8 / Bloquer 5 −50 % / Parer 0 −25 % vs Bloquer 2 EP −25 % sans bouclier / 5 EP −50 % avec bouclier) ; EP insuffisante (clamp vs évanouissement) ; surcadençage (×2, ×2.5… non implémenté) ; « Subit » sans effet. | A03 Q1-4, §11 | La **page publique fait foi** : Pugilat 3+Niv ; défenses selon la page (bouclier = Croisé) ; EP insuffisante = action annulée et journalisée, effondrement laissé au MJ ; surcadençage implémenté avec `cSurcCost` existant ; « Subit » supprimé. |
| 6 | **[BLOQUANT] Propriété des archives et des inscriptions** : owner par compte (id) ou par personnage ; `inscrits` par id de personnage ; archives d'un admin visibles par tous les admins ? | A05 Q6 ; A08 Q2 ; A06 Q4 ; A02 Q12 | Archives possédées par le **compte** (id), lisibles par les personnages participants ; participations par **id de personnage** ; homonymes résolus au rapport de migration ; archives staff visibles par tout le staff MJ/admin. |
| 7 | **[BLOQUANT] Snapshot de production** : disposer d'un export `np-store-backup-v1` récent et d'un export bestiaire (`bestiaire-nuages-polaires.json`). Sans eux, aucune créature, Serment custom, événement ni archive réelle n'est disponible. | A04 Q1 ; A05 §9 ; GPT-R §4.8 | Produire `npm run backup:store` + `backup:verify` avant tout ; c'est l'entrée de la migration et de ses fixtures. |
| 8 | **[BLOQUANT] Rôle designer** : périmètre exact (bestiaire ; événements sans notification ; Serments ? archives ? personnages ?). | A01 Q5 ; A06 Q5 ; A08 Q7 ; A05 §11.3 | Designer = bestiaire (création, publication, zones) + événements sans notification ; pas de Serments, pas de personnages, pas d'archives ; le serveur s'aligne sur l'UI. |
| 9 | **[BLOQUANT] Elementaliste** : coûts Foudre/Eau 4/6 EM (texte SD) ou 6/4 (code) ; compteur élémentaire persistant entre rounds (lore « ±2 ») ou remis à zéro chaque round (code). | A02 Q6 ; A03 Q5 | Le texte fait foi : Foudre 4 / Eau 6 ; compteur persistant pendant le combat, remis à zéro à la fin. |
| 10 | **[BLOQUANT] Journal de bord** : visible des MJ (fiche, guide, serveur) ou « toi et les administrateurs » (onglet Journal) ? | A01 Q4 ; A02 Q4 | Lisible par le propriétaire, les MJ et les admins ; modifiable par le propriétaire et l'admin ; une seule formulation partout. |
| 11 | **[BLOQUANT] Clôture de combat** : proposer XP (`ceil(niv × 10 × %)`) et drops en attente à la clôture avec traçabilité `combatId` ; la fin automatique (tous KO) déclenche-t-elle la synchronisation des fiches ? | A03 Q10-11 | Oui : la clôture MJ propose récompenses et drops, tout est écrit en une transaction avec `combatId` ; la fin automatique ne synchronise rien sans validation MJ mais propose la clôture. |
| 12 | **[NON BLOQUANT] Bonus/malus de maximum permanents** : recalcul « 30 + (L−1)×gain » (écrase) vs migration (conserve) ; soin complet au level-up ; recalcul au changement de Serment. | A02 Q1-3 | Formule = source de vérité (pas de bonus permanent hors combat), soin complet au level-up conservé, maxima recalculés au changement de Serment. |
| 13 | **[NON BLOQUANT] Statut d'une archive terminée** (« Brouillon » par bug `_new`) et autosauvegarde par round. | A03 Q8 | Statut « Terminé » (victoire/défaite/mixte) à la clôture ; autosauvegarde à chaque résolution de round. |
| 14 | **[NON BLOQUANT] Apparitions** : un seul groupe par roll ; exposer `spawnWeight`, `spawnMin/Max` dans l'atelier ; corriger la base = 1. | A03 Q9 | Un groupe par roll conservé ; poids et bornes éditables dans l'atelier ; `baseCalc` rétabli quand aucun poids n'est saisi. |
| 15 | **[NON BLOQUANT] Posture Haute** expire-t-elle au tour suivant ; invocations : coût EM par action du porteur et disparition à court d'EM ; « ☕ Repos court » retire 50 % d'EP. | A03 Q6-7, Q12 | Expiration au round suivant ; règles d'invocation de la lore implémentées ; « ☕ » rend 50 % d'EP max. |
| 16 | **[NON BLOQUANT] Rangs Aguerris** : paliers 13/16/20 saisissables ; procédure Basique → Aguerri ; vitrine. | A02 Q7 | L'atelier accepte tout niveau de palier ; l'évolution est un « Changer de Serment » admin conservant niveau et XP ; les Aguerris restent hors vitrine jusqu'à décision. |
| 17 | **[NON BLOQUANT] Fiche narrative** : ajouter âge et présentation exigés par le règlement (II.3) ; modèle d'effet pour la consommation. | A02 Q8-9 | Champs facultatifs `age` et `presentation` ; consommation purement déclarative (note IRP), sans effet automatique. |
| 18 | **[NON BLOQUANT] Bestiaire** : `Boss` comme 6e comportement ou drapeau `isBoss` ; sort de `style`, `citation`, `tags` ; règle derrière « DROP GEMME (D100) » ; aperçu joueur fidèle. | A04 Q2-4, Q8 | Drapeau `isBoss` cumulable ; `style` et `citation` saisissables, `tags` retiré ; libellé « Drop gemme (D100) » documenté par la règle §4.4 ; aperçu identique à la carte publique. |
| 19 | **[NON BLOQUANT] Zones et lieux** : zones = collection avec identifiants (noms de salons Discord) ; `lieux` conservés comme atlas sans carte ou supprimés. | A04 Q5 ; A05 Q4 ; A09 Q2 | Collection `zones` ; `lieux` non repris (consignés au rapport de migration), notes staff jamais publiques si conservés. |
| 20 | **[NON BLOQUANT] Historique et notifications** : plafond 200 ; notifications = historique ou collection dédiée ; notifier à la publication ; statut des événements sans date ; « Tout vider » ; suppression admin d'un compte et personnage lié. | A05 Q1 ; A08 Q3, Q5-6, Q8 | Historique sans plafond, paginé, `dismissed` par ligne ; notification écrite par append à la **première publication** ; « Date à confirmer » = à venir, inscriptions fermées ; « Tout vider » vide log et historiques ; la suppression admin délie sans supprimer le personnage. |
| 21 | **[NON BLOQUANT] Thèmes** : noms canoniques (theme-max vs main.js), catégorie « Saisonniers »/« Événement », mode clair Mystique polaire, thèmes custom avec CSS réel, `--gold` variable par thème, emblème recoloré, `theme_visibility` source de vérité, gamification. | A07 Q1-8 ; A09 Q4, Q8 | Libellés theme-max (vus en production), catégorie « Saisonnier » ; palette claire à dériver de la charte ; pas de thèmes custom sans rendu ; or des Serments fixe `#c6b38b` ; emblème en aurore/laiton ; visibilité = donnée serveur ; retirer progression et « secrets ». |
| 22 | **[NON BLOQUANT] Palette sombre canonique** : `#091519/#95cdbb/#c6b38b` (charte, theme-max) vs `#0d0e18/#7eb8d4/#c9a84c` (`index.html:20-28`). | A09 Q5 | La charte : `#091519 / #95cdbb / #c6b38b`. |
| 23 | **[NON BLOQUANT] URL, CSP, `NP_SITE_URL`** : routes profondes partageables sur Discord ; CSP stricte sans `unsafe-inline` ; `NP_SITE_URL` obligatoire. | A09 Q6-7 ; A05 Q8 ; A01 Q6-7 | Oui aux trois : routes réelles (fiche, événement, archive), CSP `script-src 'self'` + nonces, échec de démarrage sans `NP_SITE_URL`. |
| 24 | **[NON BLOQUANT] Données RPG en base** (`rpg_characters`, 1 entrée) et clés locales `np_rpg_*`. | A09 Q1 | Export dans le snapshot, suppression par migration explicite, purge locale, 410 « Fonction retirée » sur les actions `rpg_*`. |
| 25 | **[NON BLOQUANT] Mentions légales et politique de confidentialité** imbriquées dans le règlement. | A01 Q8 | Page dédiée en pied de site. |
| 26 | **[NON BLOQUANT] Journal système** : usage réel du « Log » staff ; chargement explicite et append. | A08 Q1 | Charger explicitement pour le staff, écrire par append serveur, une seule UI de journal (staff + audit). |
| 27 | **[NON BLOQUANT] Plafond de niveau et courbe XP** (« quatre paliers adaptés à son rang »). | A02 Q13 | Courbe `30 × niveau` confirmée, aucun plafond. |

---

## 11. Index des fichiers d'audit

| Fichier | Domaine | Sections clés |
|---|---|---|
| `audit\01-ecrans-et-parcours.md` | Écrans, navigation, parcours par rôle, modales, libellés | §0 modèle mental et rôles ; §2 écrans publics ; §5 onglets un par un ; §6 modales ; §7 parcours ; §9 questions ; §10 à préserver ; §11 dérive/dette |
| `audit\02-personnage-progression-serments.md` | Fiche, XP, level-up, migration, catalogue des 13 Serments, gemmes, inventaire, journal, notifications, PDF, matrice de droits | §1 forme JSON ; §2 formules ; §3 conversion ; §4-5 Serments ; §6 gemmes ; §9 droits ; §16 questions ; §17 à préserver ; §18 dette |
| `audit\03-combat-simulation-apparitions.md` | Simulateur MJ, résolution, statuts, drops, fin de combat, archives, apparitions | §2 état ; §4 déclaration ; §5 résolution ; §7 statuts/taunt/élémentaire/invocations ; §8 drops/fin/export ; §9 archives ; §10 apparitions ; §11 divergences ; §12 questions ; §13 à préserver ; §14 dette |
| `audit\04-bestiaire-et-contenu-univers.md` | Créatures, atelier, bestiaire public, zones, lieux, index du contenu éditorial | §1 modèle ; §2 atelier ; §3 public ; §4 index `contenu\` ; §5 à préserver ; §6 dette ; §7 questions |
| `audit\05-backend-donnees-permissions.md` | Infra, schéma `np_store`, formes JSON, auth, permissions, bundles, audit, concurrence, sauvegardes, mapping relationnel | §2 clés ; §3 formes ; §4 auth ; §5 db ; §7 concurrence ; §11 incohérences ; §12 questions ; §13 à préserver ; §14 dette ; §15 mapping |
| `audit\06-tests-comme-specification.md` | Exigences déduites des 27 tests, fixtures réelles, catalogue des actions API | §1 helpers ; §2 fixtures ; §3.A-Q exigences par domaine ; §4 API ; §6 à préserver ; §7 dette |
| `audit\07-identite-visuelle-themes.md` | Charte, tokens, typographie, thèmes, emblème, accueil, composants | §2 tokens ; §3 catalogue des thèmes ; §4 emblème ; §5 accueil ; §6 composants ; §7 réussites ; §8 faiblesses ; §11 à préserver ; §12 dette |
| `audit\08-evenements-notifications-admin-staff.md` | Agenda, participation, notifications, outil Personnages, administration, journaux, diagnostics | §1 événements ; §2 cloche ; §3 Personnages ; §4 administration ; §5 journal ; §6 diagnostics ; §7 matrice ; §8 questions ; §9 à préserver ; §10 dette |
| `audit\09-derive-rpg-dette-et-patchs.md` | Retrait du RPG, carte dormante, couches de patch → exigences R-*, dette, pipeline | §1 RPG ; §2 carte ; §3 patchs ; §4 dette ; §5 pipeline ; §6 questions ; §7 à préserver ; §8 grille de décision par fichier, index R-* |
| `audit\gpt-lecture-produit.md` | Avis indépendant : lecture produit, cinq problèmes, trois choses à garder, vision « carnet des traces », stack SvelteKit | §2 tableau COEUR/SUPPORT/DERIVE ; §3 problèmes ; §5 vision ; §6 stack |
| `audit\gpt-direction-creative.md` | Avis indépendant : critique du brief, direction « Les Lisières », navigation, écran d'entrée, voix, risques | §1 critique ; §2 direction ; §3 décisions sur les six conséquences |
| `audit\gpt-revue-risques-techniques.md` | Avis indépendant : 12 risques, authentification, concurrence/transactions, migration, checklist de production | §1 risques ; §2 auth ; §3 concurrence ; §4 migration ; §5 checklist |
| `audit\contenu\*.md` (9 fichiers) | Textes verbatim (accueil, synopsis, règlement, système de jeu, Serments, premiers pas, écrans de compte, bestiaire, comportements) | voir §6 |
| `02-brief-creatif.md`, `04-architecture.md` (dossier `overhaul\`) | Brief du lead et décisions d'architecture (normatif quand il tranche une question ci-dessus) | — |
