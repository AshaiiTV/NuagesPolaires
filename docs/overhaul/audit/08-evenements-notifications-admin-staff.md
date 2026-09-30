# Audit 08 — Événements / agenda, participation, notifications, outil Personnages staff, administration, diagnostics, journal système

Spécification source pour l'overhaul. Lecture seule du dépôt `C:\Users\sacha\NuagesPolaires` (v297). Toutes les références sont `fichier:ligne`. Les libellés entre guillemets sont les textes exacts affichés (ils portent l'identité du site).

Sources parcourues intégralement pour ce domaine : `assets/js/main.js` (sections Événements 15010–15348, Notifications 9943–10244, Log système 1146–1230, Database/administration 4578–5245, Joueurs/Personnages 8854–9836, progression 9180–9453, stats 10283–10500, export/import 10856–10900, tab guards 5494–5522, bootstrap 1232–1321, bundles 859–929), `assets/js/admin-dashboard.js`, `assets/js/database-admin-polish.js`, `assets/js/diagnostics.js`, `assets/js/site-self-test.js`, `assets/js/staff-navigation.js`, `assets/js/first-steps.js`, `netlify/functions/db.js`, `netlify/functions/auth.js` (actions admin, bundle de session, audit), `index.html` (nav staff, cloche, drawer, onglets), `scripts/test-event-staff.js`, `scripts/test-event-staff-browser.js`, `scripts/test-system-log.js`, `scripts/test-first-steps.js`, `scripts/test-integration.js` (log), `scripts/backup-store.js`, `scripts/verify-backup.js`, `docs/security-and-data.md`, `docs/plan-du-site-2026-09-23.md`, `docs/backups.md`.

---

## 0. Vocabulaire et rôles (rappel indispensable)

- Rôles serveur : `joueur`, `mj`, `designer`, `admin` (`db.js:108-111 normalizeRole`, `auth.js` idem). Libellés UI : `ROLE_LABELS={joueur:"Joueur",admin:"Admin",mj:"MJ",designer:"Designer"}` (`main.js:2453`). Couleurs de rôle : admin `var(--red)`, mj `var(--gold)`, designer `var(--purple)`, joueur `var(--glacier)`/`var(--glacier-dim)` (`main.js:2484`, `4800`, `9063`).
- Objet session client `CU` (`main.js:1930`) : `{type:"staff"|"player", role, pid, name, pseudo, pending?}`. Construit à la connexion (`main.js:2342-2354`) et à l'auto-login (`2230-2244`). **Pour le staff, `CU.pid = pid du compte || id du premier personnage de la liste** (`main.js:2352`, `2242`, `2172`). Conséquence : un staff sans personnage lié "porte" le premier personnage (cloche, fiche par défaut, `has-character`).
- Permissions client `can(action)` (`main.js:1915-1925`) :
  - admin : `manage_players, manage_mjs, manage_beasts, manage_items, manage_xp, manage_stats, adjust_levels, delete_player, delete_beast`
  - mj : `manage_items, manage_xp, manage_players`
  - designer : `manage_beasts, delete_beast`
  - joueur : rien (retourne toujours `false`).
  - `manage_mjs` est en pratique le synonyme de "admin" dans tout le code (badge comptes en attente, thèmes, log…).
- Helpers : `roleKey(user)` (`main.js:1082`), `isAdminRole` (`1085`), `isStaffRole` (`1088`), `isAdminLike` (`1092`).
- Règles d'écriture serveur `db.js:89-102` (`EXACT_WRITE_RULES`) :
  - admin : `players, beasts, serments_custom, events, np_syslog, np_syslog_archive, lieux, event_themes, theme_visibility, theme_catalog, serment_catalog, page_content, spawn_lab_staff` + préfixe `combat_arc_`
  - mj : `players, events, beasts, np_syslog, spawn_lab_staff` + préfixe `combat_arc_`
  - designer : `beasts, serments_custom, events, event_themes, theme_catalog, serment_catalog, page_content, spawn_lab_staff`
  - joueur : uniquement ses propres `combat_arc_*` (`db.js:171`) ; `accounts` n'est jamais écrivable par `set` (`db.js:170`).
- Règles de lecture serveur `db.js:156-166 canRead` : `accounts` → admin ou tout compte connecté (filtré à son propre compte, `db.js:684-691`) ; `players` → admin/mj complet, joueur lié → son personnage seul (`692-699`) ; `np_audit_log` → admin ; `spawn_lab_staff` → staff ; `np_syslog_archive` → admin ; `np_syslog` → admin/mj ; le reste → `PUBLIC_KEYS` (`db.js:75-78` : `beasts, serments_custom, events, lieux, event_themes, theme_visibility, theme_catalog, serment_catalog, page_content`).
- Toute écriture `set`/`delete`/action dédiée exige `expectedVersion` (md5 du JSON stocké, ou `null` si la clé n'existe pas encore) → `428 VERSION_REQUIRED` sinon, `409 VERSION_CONFLICT` si périmée (`db.js:462-471`, `571-587`).

---

## 1. Événements / agenda

### 1.1 Stockage et forme JSON

- Collection `events` (clé publique, tableau). Lecture publique filtrée : les événements masqués sont retirés pour les non-staff (`db.js:676-683 filterValueForCaller`, `isEventHidden` `db.js:488-490`).
- Client : `getEvents()` (`main.js:15021-15032`) lit `sto("events")`, ne garde que les objets, et **normalise à la lecture** :
  - `nom = String(ev.nom || ev.titre || 'Sans titre')`
  - `date = Number(ev.date ?? ev.dateTs)` si fini et > 0, sinon `null`
  - `hidden = ev.hidden === undefined ? ev.published === false : !!ev.hidden`
  - `inscrits = Array.isArray(ev.inscrits) ? copie : []`
  - tous les autres champs sont conservés tels quels (`Object.assign({}, ev, …)`).
- Serveur : mêmes équivalences dans `isEventHidden` et `eventDate` (`db.js:488-494`). Écriture : `enforceShape` accepte tableau **ou objet** pour `events` (`db.js:265-267`) ; `sanitizeDeep` supprime les balises `<script>`, `javascript:`, tronque les chaînes à 25 000 caractères, limite 5 000 éléments/clés, profondeur 24 (`db.js:81-87`, `216-255`). Aucune normalisation métier des événements côté serveur (pas de dédoublonnage d'id, pas de tri).

Forme écrite par l'éditeur staff (`main.js:15246-15257`) :

```json
{
  "id": "ev1727700000000ab12cd",
  "nom": "Expédition vers la faille",
  "type": "combat",
  "desc": "Texte libre, \\n conservés",
  "date": 1893528000000,
  "max": 0,
  "hidden": false,
  "inscrits": ["Aurore", "Bob"],
  "createdBy": "Admin",
  "updatedAt": 1727700000000
}
```

- `id` : `"ev" + Date.now() + Math.random().toString(36).slice(2,8)` (`main.js:15198`).
- `type` : clé de `EV_TYPES` (section 1.2) ; valeur par défaut du formulaire `combat` (`main.js:15200`).
- `date` : timestamp ms ou `null` ("Date à confirmer").
- `max` : entier ≥ 0 ; `0` = "sans limite".
- `hidden` : booléen (true = masqué, visible staff uniquement).
- `inscrits` : **liste de noms de personnages** (pas d'ids) — voir 1.7.
- `createdBy` : conservé si présent, sinon `CU.name || CU.pseudo || "Staff"`.
- `updatedAt` : posé à chaque sauvegarde. Il n'existe **pas** de `createdAt`.
- Les champs inconnus (ex. `extra`) sont préservés par `Object.assign({}, previous, …)` — testé (`scripts/test-event-staff.js:64`, `test-event-staff-browser.js:51`).

**Incohérences de format héritées (à unifier dans l'overhaul)** :

| Ancien champ | Champ actuel | Où l'ancien est encore toléré |
|---|---|---|
| `titre` | `nom` | `getEvents` `main.js:15026` |
| `dateTs` | `date` | `getEvents` `main.js:15024`, `db.js:492` |
| `published:false` | `hidden:true` | `getEvents` `main.js:15028`, `db.js:489` ; la case de l'éditeur s'appelle encore `ev-published` (`main.js:3542`) |

Le "Prochain événement" de l'accueil utilise désormais le format normalisé (`main.js:8149-8150` : `!e.hidden && e.date && e.date > Date.now()`), donc l'écart signalé dans `docs/plan-du-site-2026-09-23.md §5.B` est résolu en v297 par `getEvents()`.

### 1.2 Types d'événement (`EV_TYPES`, `main.js:15013-15019`)

| clé | icône | couleur | libellé carte | libellé du `<select>` de l'éditeur (`main.js:3536`) |
|---|---|---|---|---|
| `combat` | ⚔ | `var(--red)` | "Combat / Chasse" | "Combat" |
| `exploration` | 🗺 | `var(--gold)` | "Exploration" | "Exploration" |
| `social` | 💬 | `var(--glacier)` | "Social / Roleplay" | "Social" |
| `evenement` | 🌟 | `var(--purple)` | "Événement majeur" | "Événement majeur" |
| `autre` | ☁️ | `var(--faint)` | "Autre" | "Autre" |

Un `type` inconnu retombe sur `autre` (`main.js:15124`). L'accueil utilise `{icon:"☁",col:"var(--glacier)",label:"Événement"}` comme repli (`main.js:8193`).

### 1.3 Page agenda (`renderEvents`, `main.js:15079-15121`) — onglet `evenements`, conteneur `#p-events-c`

- Accessible connecté ou non (onglet non `data-private`, `index.html:7318`) ; entrée de nav "📅 Événements" (`index.html:7018`) et drawer mobile "Événements" (`7081`). Rendu déclenché par `switchTab("evenements")` (`main.js:5618`).
- Tri par `date` croissante (`null` → 0, donc les non datés en tête) ; non-staff : filtre `!hidden`.
- Répartition : `upcoming` = `!date || date >= now` ; `past` = `date < now`. Les passés sont affichés **inversés et limités à 8** (`main.js:15116`), avec la note "Les 8 derniers rendez-vous." si > 8, sinon "Les rendez-vous précédents.".
- Textes exacts de l'en-tête : eyebrow "Nuages Polaires · Le calendrier", H1 "Les rendez-vous<br><em>du monde.</em>", intro "Une expédition, une rencontre, une histoire à écrire ensemble. Retrouve ici les événements de Nuages Polaires.", résumé "À venir" / "Passés" avec la marque ✧, note staff "Les événements masqués restent visibles au staff." ou joueur "Choisis un rendez-vous et rejoins l’aventure.".
- Section à venir : eyebrow "Le prochain chapitre", H2 "À venir", note "Les dates suivent l’heure de ton appareil." État vide : "Un horizon encore ouvert." / "Aucun événement à venir pour le moment. Les prochains rendez-vous apparaîtront ici." + bouton staff "Créer le premier événement".
- Section passés : eyebrow "Les traces du voyage", H2 "Passés".
- Bouton staff principal : "+ Nouvel événement" (`openEventModal()`).

Carte (`renderEventCard`, `main.js:15123-15185`) :

- Date : `toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) + ' à ' + heure 2-digit` ; bloc calendrier (jour court, numéro, mois court + année, `<time datetime=ISO>`). Sans date : "À définir" / "—" / "Prochainement" et texte "Date à confirmer".
- État calculé (`main.js:15138`) dans l'ordre : `hidden` > `past` > `undated` > `joined` > `full` > `open` ; libellés : `{hidden:'Masqué · staff', past:'Passé', undated:'Date à confirmer', joined:'Vous participez', full:'Complet', open:'Inscriptions ouvertes'}`. Classes `np-agenda-card np-agenda-type-<type> [np-agenda-past] [np-agenda-hidden]`, `np-agenda-state-<state>`.
- Capacité : `max = Number.isSafeInteger(Number(ev.max)) && > 0 ? … : 0` ; `isFull = max>0 && inscrits.length >= max`. Bloc "Le groupe" : `"<n>[ / max] participant(s)"` (pluriel si `(max||n) > 1`) ; barre `width = min(100, round(n/max*100))%` ; texte "Toutes les places sont prises." ou `"<k> place(s) disponible(s)."` (non affiché pour les passés) ; sans max : "Sans limite de places.".
- Participants : liste `aria-label="Personnages inscrits"`, entrée propre marquée `· vous` (comparaison **par nom** avec `gpid(CU.pid).name`) ; vide : "Aucun participant pour le moment.".
- Actions joueur (seulement si `!isPast && !isStaff && !isHidden`) : sans personnage lié → "Un personnage doit être lié à ton compte pour participer." ; sans date ou date passée → "Inscriptions fermées — date à confirmer." ; inscrit → "Ta place est réservée" + bouton "Se désinscrire" ; ouvert → "Rejoins le groupe" + bouton "✓ Participer" ; complet → "Ce rendez-vous est complet.". Les boutons portent `data-own-player-action="event:<id>"` et sont désactivés (`disabled aria-busy`) pendant la requête.
- Actions staff (`canEdit`) : label "Gestion du rendez-vous", boutons "👁 Publier" / "🔒 Masquer" (`toggleEventHidden`), "✎ Modifier" (`openEventModal(id)`), "Supprimer" (`deleteEvent`), tous avec `data-event-staff-action` (désactivés pendant une action staff). Le staff **ne peut jamais s'inscrire** depuis la carte (condition `!isStaff`). Pour un passé sans droits : "Rendez-vous passé".

### 1.4 Éditeur staff — modale `#m-event` (`main.js:3528-3551`, construite par `_buildStaffModals` uniquement pour le staff)

Champs : `ev-id` (hidden), "Titre" `ev-nom` (placeholder "Nom de l'événement"), "Type" `ev-type`, "Date" `ev-date` (`datetime-local`), "Places disponibles" `ev-max` (`number min=0 step=1`, aide "0 = sans limite. Les inscriptions existantes sont conservées."), "Description" `ev-desc`, interrupteur `ev-published` avec libellé dynamique "Publié — visible par tous les joueurs" / "Masqué — visible staff uniquement", case `ev-notify` "Notifier les joueurs à la création, si publié" (ligne `ev-notify-row`), aide `ev-notify-help`, boutons "Annuler" / "Enregistrer".

`openEventModal(id)` (`main.js:15187-15225`) :
- refuse si `!_canManageEvents()` avec le toast "La gestion des événements est réservée au staff." ; refuse silencieusement si une action staff est en cours ; "Événement introuvable. Recharge la page." si l'id n'existe plus.
- réactive tous les contrôles laissés désactivés par une session précédente ; titre "Modifier l'événement" ou "Nouvel événement".
- pré-remplit ; `ev-max` = max valide ou 0 ; `ev-notify` cochée **seulement en création et si `_canNotifyEventPlayers()`** ; la ligne est cachée en modification ou pour un designer ; aide : admin/mj création → "La notification est enregistrée après la création de l’événement." ; admin/mj modification → "Modifier ou publier cet événement ne renvoie pas de notification." ; designer → "L’événement publié apparaît dans l’agenda des joueurs. Les notifications sont gérées par les MJ et administrateurs.".
- interrupteur Publié coché par défaut en création ; `ev-date` rempli au format `YYYY-MM-DDTHH:MM` local.
- mémorise `_EVENT_EDITOR={generation:_dbSessionGeneration,id}` ; focus sur le titre après 100 ms si la session n'a pas changé.

### 1.5 Opérations staff

Droits client : `_canManageEvents()` = admin/mj/designer (`main.js:15033`) ; `_canNotifyEventPlayers()` = admin/mj (`15036`). Droits serveur : `events` écrivable par admin, mj, designer (`db.js:89-97`) ; `players` (notification) écrivable admin/mj seulement — le designer serait refusé `403 "Permission refusée"` + audit `db_set_denied`, d'où la case masquée.

Garde-fou commun `_runEventStaffAction(work)` (`main.js:15054-15077`) : refus "La gestion des événements est réservée au staff." si non staff ; une seule action à la fois (`_EVENT_STAFF_ACTION` lié à la génération de session) ; désactive tous les `[data-event-staff-action]` et les champs de `#m-event` pendant l'attente ; en cas d'erreur (hors changement de session ou logout) toast "Événement non enregistré : <message>" ; à la fin restaure l'état des contrôles.

`saveEvents(arr)` (`main.js:15047-15053`) : `_enqueueDbWrite('events', arr)` puis remplace le cache par la valeur renvoyée par le serveur.

**Créer / modifier — `saveEvent()`** (`main.js:15227-15294`) :
1. Validations, dans l'ordre, avec toasts `err` : titre vide → "Donne un titre à l'événement." ; date non parsable → "Choisis une date valide." ; `max` non entier sûr ou < 0 → "Le nombre de places doit être un entier positif, ou 0 pour aucune limite." ; id inexistant alors qu'on éditait → "Cet événement n’existe plus. Recharge la page." ; `max > 0 && max < inscrits.length` → "La capacité ne peut pas être inférieure au nombre de participants déjà inscrits.".
2. Construit l'objet (1.1), `isHidden = !ev-published.checked`, `shouldNotify = isNew && !isHidden && _canNotifyEventPlayers() && ev-notify.checked` (le droit est re-vérifié côté client à la sauvegarde ; testé `test-event-staff.js:86-93`).
3. Écrit `events` ; puis `sysLog(isNew ? "event_cree" : "event_modif", "Événement '<nom>'[ le <date fr-FR>]", actor)`.
4. Si `shouldNotify` : clone de **tous** les personnages, ajoute à chaque `history` : `{ts:Date.now(), type:"event", text:escHtml("📅 Nouvel événement : <nom>[ — <weekday long day month> à <HH:MM>]"), by:escHtml(actor)}` puis `set players` ; succès → `sysLog("event_notif","Notification envoyée à <n> joueur(s) pour '<nom>'",actor)` ; échec → conservé dans `notificationError`, l'événement reste enregistré.
5. Ferme la modale, re-rend l'agenda ; toast `ok` "Événement créé — <nom>[ · Joueurs notifiés ✓]" / "Événement modifié — <nom>" ; ou toast `err` "Événement enregistré — <nom>. Les notifications n’ont pas été confirmées. Recharge la page pour vérifier avant toute nouvelle tentative.".
6. Un échec d'écriture (409/503) laisse la modale ouverte, le brouillon intact, le cache inchangé, aucun `sysLog`, aucun toast de succès (`test-event-staff.js:113-131`, browser `:66-74`). Une réponse tardive après changement de session est ignorée (`:124-131`, `:133-138`).

**Masquer / publier — `toggleEventHidden(id)`** (`main.js:15296-15310`) : bascule `hidden`, écrit, `sysLog("event_visibilite","Événement '<nom>' masqué|publié",actor)`, toast "Événement masqué aux joueurs." / "Événement publié." (`ok`). Pas de confirmation.

**Supprimer — `deleteEvent(id)`** (`main.js:15312-15327`) : `confirm("Supprimer cet événement ?")`, filtre la liste, `sysLog("event_supprime","Événement '<nom>' supprimé",actor)`, toast "Événement supprimé." (`inf`).

### 1.6 Notification de création — détails

- Ne concerne que la **création d'un événement publié** par admin/mj ; les modifications et la publication ultérieure ne notifient jamais (texte d'aide explicite).
- Elle écrit dans **la collection `players` entière** (tous les personnages, pas seulement ceux liés à un compte). Le serveur tronque `history` à 200 entrées par personnage (`db.js:302`), donc une notification globale consomme une place d'historique chez chacun.
- Le texte est échappé HTML à l'écriture (`escHtml`) car l'historique est rendu en HTML brut côté client (`main.js:10234`, `5964`, `9281`) — testé `test-event-staff.js:95-103`.
- Pas de dédoublonnage : recréer un événement renvoie une nouvelle entrée.

### 1.7 Participation joueur

Client `_setOwnEventParticipation(id, participating)` (`main.js:15329-15348`, boutons `eventInscrit` / `eventDesinscrit`) :
- exige `CU.pid` avec personnage en cache, sinon "Ton compte doit être lié à un personnage pour participer aux événements." ou "Connecte-toi pour t'inscrire." ; événement absent → "Événement introuvable. Recharge la page.".
- passe par `_runOwnPlayerMutation('events', {action:'set_event_participation', eventId, participating}, 'event:'+id)` (`main.js:6021-6053`) : verrou par clé, `expectedVersion` = version connue de `events`, remplace le cache `events` par la réponse ; toast "Inscription confirmée — <nom> ✓" (`ok`) ou "Désinscription effectuée." (`inf`) ; échec → "Modification non enregistrée : <message>".

Serveur `set_event_participation` (`db.js:877-958`) :
- requiert session **et** `caller.pid` (sinon `403 "Aucun personnage lié."`), `expectedVersion` (428), corps strictement `{action, expectedVersion, eventId, participating:boolean}` (`400 "Paramètres non autorisés pour cette action."`, `400 "Événement ou participation invalide."`).
- conflit de version → 409 `VERSION_CONFLICT`. Personnage introuvable → 404. Nom vide → `400 "Ton personnage doit avoir un nom pour participer."`.
- **homonymes** : si plusieurs personnages portent le même nom → `409 EVENT_UNAVAILABLE "Plusieurs personnages portent ton nom : demande à l'équipe de les distinguer avant de modifier ta participation."` ; `inscrits` non-tableau → `409 EVENT_UNAVAILABLE "La liste des participants doit être corrigée par l'équipe."`.
- inscription : événement masqué → `404 "Événement introuvable."` ; sans date ou date passée → `409 EVENT_CLOSED "Les inscriptions à cet événement sont fermées."` ; `max` invalide → `409 EVENT_UNAVAILABLE "La capacité de cet événement doit être corrigée par l'équipe."` ; `max>0 && n>=max` → `409 EVENT_FULL "Événement complet."` ; sinon ajoute le **nom** si absent.
- désinscription : retire toutes les occurrences du nom (`filter(participant !== name)`), autorisée même sur un événement masqué/passé.
- CAS sur `events`, audit `set_event_participation {pid, eventId, participating}`, réponse `{ok, key:"events", value (filtrée), version, updatedAt}`.
- Côté client, les refus métier `400/403/404` et `409` avec code `ITEM_UNAVAILABLE|EVENT_CLOSED|EVENT_FULL|EVENT_UNAVAILABLE` sont considérés "sans écriture" : la file n'est pas bloquée (`main.js:1530-1547`) ; un vrai `VERSION_CONFLICT` bloque la clé jusqu'au rechargement.

Les inscriptions sont donc **identifiées par nom de personnage** ; renommer un personnage ne migre pas ses inscriptions (`docs/security-and-data.md:31`).

### 1.8 Verrous et générations de session

- `_dbSessionGeneration` incrémenté à chaque login/logout ; toutes les promesses vérifient `_assertDbSessionGeneration` avant de toucher le cache ou l'UI (`main.js:15050`, `15263`, `6032`).
- `_eventStaffBusy()` et `_ownPlayerActionBusy(key)` (`main.js:15041`, `6002`) empêchent les doubles clics ; les boutons sont re-rendus avec `disabled aria-busy="true"`.
- Après un `409` sur une clé, `_DB_WRITE_QUEUE[key]._failed` reste posé : toute nouvelle écriture sur cette clé est refusée sans requête réseau jusqu'à ce qu'une nouvelle version soit apprise (`main.js:1298-1303`, `1545-1550`) ; test "Conflicted collection stays blocked until refresh" (`test-event-staff.js:122`).

### 1.9 Accueil connecté — "Prochain événement" (`main.js:8149-8204`)

- `eventsAVenir = getEvents().filter(!hidden && date && date>now)` trié croissant ; le premier est mis en avant : eyebrow "<label type> · Dans <n> jour(s)" (`n = ceil((date-now)/86400000)`), H3 nom, date longue + heure, description tronquée à 180 caractères + "…", bouton "Voir les événements". Vide : "Un nouveau chapitre se prépare." / "Aucun événement à venir pour le moment. Les prochains rendez-vous seront affichés ici." + "Ouvrir l’agenda".
- Statistique "Rendez-vous / À venir" = `eventsAVenir.length` (staff et joueur, `main.js:8176`, `8181`).
- Les événements sans date ne comptent pas comme "à venir" ici, mais **sont** listés "À venir" dans l'agenda (1.3) — divergence mineure.

### 1.10 Tests existants

- `scripts/test-event-staff.js` (node --test, VM sur des tranches de `main.js`) : édition de capacité par admin/mj/designer sans perte de `inscrits/createdBy/extra`, double clic, `expectedVersion`, refus joueur/inconnu, capacités invalides (`'1'` sous les 2 inscrits, `-1`, `1.5`, `Infinity`, `NaN`) sans écriture, designer sans écriture `players`, notification une seule fois après confirmation avec texte échappé, échec de notification = succès partiel sans `event_notif`, échecs save/hide/delete sans effet, réponses tardives ignorées, réouverture par une nouvelle session.
- `scripts/test-event-staff-browser.js` (Playwright, comptes `Admin`, `Maitre` (mj), `Designer`) : événement hérité `{nom, date, type:'evenement', max:4, inscrits:['Alice','Bob'], createdBy, extra, hidden:true}` visible au staff ; refus capacité 1 → toast contenant "inférieure" ; sauvegarde ; publication ; création avec `ev-date` `2030-01-01T20:00` ; case notification visible sauf Designer ; écriture `players` seulement hors Designer ; échec 503 conserve le brouillon "Brouillon conservé" ; notification partielle (MJ) ; suppression ; formulaire mobile 390×844 sans débordement.

---

## 2. Notifications (cloche)

### 2.1 Modèle : la cloche est une vue de l'historique du personnage

Il n'existe **aucune collection "notifications"**. `getPlayerNotifs(pid)` (`main.js:9965-9972`) = `history` du personnage, filtré par `notifDeleted` (timestamps), trié par `ts` décroissant, **50 max**.

Forme d'une entrée d'historique (identique côté serveur, `db.js:915`) :

```json
{ "ts": 1727700000000, "type": "item", "text": "Ajout : 2× Potion — note", "by": "MJ Admin" }
```

Champs optionnels observés : `combatId` (`main.js:12376`), anciens `msg` (`main.js:4923` tolère `h.msg`). Le champ `ts` sert d'**identifiant** (dédoublonné côté serveur pour `consume_own_item`, `db.js:912-914`, mais pas pour les écritures staff qui utilisent `Date.now()` brut).

Producteurs d'entrées (type → texte → auteur → source) :

| `type` | Texte exact | `by` | Où |
|---|---|---|---|
| `event` | `📅 Nouvel événement : <nom>[ — <date> à <heure>]` (échappé) | acteur staff (échappé) | `main.js:15272` |
| `item` | `Ajout : <q>× <nom>[ — <note>]` / `Retrait : <q>× <nom>[ — <note>]` | `MJ <CU.name>` | `9518`, `9538` |
| `item` | `Consommé : <nom>[ — <note>]` | `<nom perso> (joueur)` | serveur `db.js:915` |
| `xp` | `+<n> XP (<mob>, <part>%)` | `MJ <CU.name>` | `9375` |
| `gemme` | `+<n> XP (fusion de <q>× <Gemme …>)` | `MJ <CU.name>` | `9427` |
| `gemme` | `💎 <gemme> (sur <bête>[ · <roll>/100])` | `MJ <CU.name|Staff>` | `12577` |
| `level` | `⬆ Niveau <n> ! PV:<pv> EP:<ep> EM:<em>[ — <palier> débloqué]` | `Système` | `9316` |
| `add` / `remove` | `Ajust. Niveau|XP : <old> → <new>` | `MJ <CU.name>` | `9443` |
| `stat` | `Stats mises à jour — Niveau <n> (PV:… EP:… EM:…)` | `CU.name` | `9596` |
| `stat` | `⚠ <statut>[ (<desc>)]` / `✓ Retiré : <statut>` | `CU.name|MJ` | `12829`, `12838` |
| `stat` | `Serment synchronisé — données mises à jour depuis l'onglet Serments` | `Système` | `6757` |
| `serment` | `Branche : <old> → <new>` / `Serment : <old> -> <new>` / `Branche synchronisée — …` / `Branche retirée — retour à Aucune` | `Admin <CU.name>` ou `Système` | `7019`, `7049`, `6820`, `6846` |
| `combat` | `⚔ <nom combat> — <round>R · PV:… EP:…` (+`combatId`) | `MJ <…>` | `12376` |
| `add` | texte libre | `by || "Système"` | `addNotifToPlayer` `12841` (helper, aucun appelant trouvé) |

Filtres d'historique de la fiche (`HIST_TYPES`, `main.js:5928-5939`) : `all "Tous"`, `level "Niveaux" ⬆`, `xp "XP" ✦`, `gemme "Gemmes" 💎`, `combat "Combats" ⚔`, `item "Items" ◎`, `stat "Stats" 📊`, `serment "Serment" ⚜`, `de "Dés" 🎲`, `add "Divers" +`. Le type `event` n'a pas de filtre dédié (classé "Divers" par défaut).

### 2.2 Classification visuelle `notifType(n)` (`main.js:9982-9992`) — heuristique sur le texte, dans l'ordre

1. texte contient "Niveau" ou "⬆" → `{icon:"⬆", col:var(--gold), label:"Niveau"}`
2. "Gemme"/"gemme" → `{💎, var(--purple), "Gemme"}`
3. "Combat"/"combat"/"PV:" → `{⚔, var(--red), "Combat"}`
4. "XP"/"xp" → `{✦, var(--glacier), "XP"}`
5. `type==="add"` → `{+, var(--green), "Ajout"}` ; `remove` → `{−, var(--red), "Retrait"}` ; `consume` → `{◎, var(--gold), "Consommation"}`
6. sinon `{·, var(--faint), ""}`.

(Note : une notification d'événement dont le nom contient "Combat" sera classée "Combat" ; une entrée `stat` "Stats mises à jour — Niveau 3 (PV:…)" est classée "Niveau".)

### 2.3 Badge (`updateNotifBadge`, `main.js:9994-10010`)

`total = notifs du personnage CU.pid (si CU.pid) + (si can("manage_mjs")) nombre de comptes joueur sans pid`. Affiche `total` ou `"9+"` dans `#notif-count`. Appelé 500 ms après `launchApp` (`main.js:4571`), après une consommation (`6072`) et après un effacement (`9959`). **Il n'est pas rafraîchi après une attribution staff ni par un polling** : un joueur ne voit une nouvelle notification qu'au rechargement.

Visibilité de la cloche `#notif-bell` (`index.html:7053`, classe `player-only-tab`) : masquée par défaut, affichée si `.is-player` ou `.has-character` (`index.html:441-443`). Le staff a `has-character` dès que `CU.pid` est posé (donc quasi toujours, cf. §0).

### 2.4 Panneau (`toggleNotifPanel` `main.js:10012-10022`, `renderNotifPanel` `10182-10244`)

- Panneau `#notif-panel` (largeur 300 px, `index.html:7054`), ouverture manuelle ; commentaire de code : "NE PAS auto-marquer comme lus — le joueur gère manuellement".
- Sans `CU.pid` : "Non connecté.".
- En-tête "NOTIFICATIONS" + bouton "TOUT EFFACER" (si ≥ 1 notification) → `clearAllNotifs(pid)`.
- Section staff (si `can("manage_mjs")` et comptes en attente) : titre "EN ATTENTE DE LIAISON", lignes `⏳ <pseudo>` / "Sans personnage lié · Cliquer pour lier" / badge "NEW" ; clic → `goToPending()` (onglet Joueurs + scroll sur la section) puis fermeture du panneau.
- Vide : 🔔 "Aucune notification.". Si les deux sections coexistent, sous-titre "ACTIVITÉ".
- Chaque ligne : icône/label `notifType`, `n.text` (HTML non échappé ici), `n.by · fdt(ts)` ou `fdt(ts)`, bouton "✕" (title "Effacer") → `deleteNotif(pid, ts)`. Liste limitée à 360 px de haut avec défilement.

### 2.5 Effacement (`_saveNotifDeleted`, `main.js:9950-9963` ; serveur `dismiss_notifications` `db.js:877-925`)

- Client : refuse si `pid !== CU.pid` ("Tu peux effacer uniquement tes propres notifications."). Payload `{action:'dismiss_notifications', timestamp:<ts>}` ou `{…, all:true}` via `_runOwnPlayerMutation('players', …, 'notifications')` ; après confirmation : badge + panneau re-rendus, toast "Notifications effacées." pour "tout".
- Serveur : exige `caller.pid` (403 "Aucun personnage lié."), `expectedVersion` sur `players`, exactement `timestamp` (entier > 0) **ou** `all:true` (`400 "Choisis une notification ou toutes les notifications."`), timestamp inconnu → `404 "Notification introuvable."`. Effet : `player.notifDeleted = [timestamps existants déjà masqués ∪ nouveaux]` — la liste est **purgée des timestamps qui n'existent plus dans `history`**. L'historique n'est jamais supprimé par le joueur. Audit `dismiss_notifications {pid, all}`. Réponse `players` filtrée au personnage du joueur ; le client fusionne (`main.js:6035-6040`).
- Conséquence : un staff sans compte lié (CU.pid = premier personnage) voit la cloche de ce personnage mais le serveur refusera l'effacement (`403`).

Forme sur le personnage :

```json
{ "id": "p_alice", "name": "Alice", "history": [ … ], "notifDeleted": [1727700000000, 1727700001000] }
```

---

## 3. Outil staff « Personnages » (onglet `joueurs`, menu "Personnages", conteneur `#p-joueurs-c`)

Accès : onglet `joueurs` ∈ `STAFF_TABS` et `MJ_TABS` → admin/mj uniquement (`main.js:5501-5510`) ; le designer est redirigé vers l'accueil. Menu : item "Personnages" classe `perm-mj` (`index.html:7034`, drawer `7099`). Construit par `_buildJoueursTab()` à la connexion staff non-designer (`main.js:4549`, `4554`).

### 3.1 Structure (`_buildJoueursTab`, `main.js:8985-9019`)

- Hero : kicker "Registre staff", titre "Joueurs", stats `#players-hero-stats` : "<n> personnages", "<n> comptes liés", "<n> staff", "<n> niv. moyen" (moyenne arrondie) (`9030-9041`), bouton "+ Nouveau joueur" (modale `m-addp`).
- Recherche `#players-search-input` (placeholder "Rechercher un profil, un serment, un compte ou un rôle...") sur `name, classe, branch, pseudo du compte lié, rôle, libellé de rôle` ; méta "<shown> / <total> profils" ; bouton "Effacer".
- Section `#pending-accounts-section` (admin seulement, cf. 3.4) : "⏳ Comptes en attente" + badge `#pending-badge`, repliable (`_togglePending`).
- Liste `#s-plist` (`renderSPList`, `9093-9162`). États vides : "Aucun profil trouvé" / "Essaie un nom, un serment, un pseudo de compte ou un rôle." ; "Aucun joueur" / "Les personnages apparaîtront ici une fois créés.".

### 3.2 Carte personnage (`main.js:9127-9161`)

Avatar ou initiale ; nom (+ tag "Affiché" si `CU.pid===p.id`) ; "<classe> — Niveau <n>[ · <date création>]" ; badges "Niv. <n>" et rôle du compte lié (`ROLE_LABELS` ou "Non lié") ; vitals `PV`, `EP`, `EM`, `XP` (`cur/max`) ; boutons selon droits :

| Bouton | Condition | Action |
|---|---|---|
| "+Item" / "−Item" | `manage_items` (admin, mj) | `oAI` / `oRI` |
| "Stats" | `manage_stats` (admin) | `oES` |
| "XP" | `manage_xp` (admin, mj) | `openProgPanel` |
| "Accéder" | toujours | `loadPlayer` (affiche la fiche, `_viewPid`) |
| "Sup." | `delete_player` (admin) | `delP` |

Bloc admin `_playerAccountAdminBlock` (`9058-9091`, admin uniquement) : "Compte" + `<select>` "— Lier un compte —"/"— Délier le compte —" listant les comptes libres ou déjà lié (`setPlayerAccountLink`), "Rôle" + puces Joueur/MJ/Designer/Admin (`setPlayerAccountRole`) ; "Admin principal" si dernier admin ; "Aucun compte lié".

### 3.3 Opérations (qui, effet sur la fiche, effet sur l'historique, journal)

**Créer — `addPlayer()`** (`main.js:9468-9487`), `manage_players` (admin, mj), modale `m-addp` (champs `np-n` nom, `np-c` serment via `popSSelects`, `np-av` avatar). Erreur "Nom et Serment obligatoires.". Forme initiale :

```json
{ "id": "p<Date.now()>", "name": "…", "classe": "<serment>", "level": 1, "xp": 0, "xpMax": 30,
  "pvCur": 30, "pvMax": 30, "epCur": 50, "epMax": 50, "emCur": 20, "emMax": 20,
  "avatar": "", "arme": "<arme du serment>", "progressionVersion": 1, "branch": "Aucune",
  "equipment": { "helmet": null, "chest": null, "legs": null }, "inventory": [], "history": [] }
```
Écrit `players` complet ; échec → "Sauvegarde impossible en base." + toast "Création impossible : la base n'a pas enregistré le personnage." ; succès → `sysLog("personnage_cree","Personnage '<n>' (<serment>) créé")`, toast "<n> ajouté.".

**Supprimer — `delP(id)`** (`9489-9499`), `delete_player` (admin), `confirm("Supprimer ce joueur ? Irréversible.")`, `sysLog("personnage_supprime",…)` **avant** l'écriture (journalisé même si l'écriture échoue), toast "Joueur supprimé.". Serveur : un MJ qui retire un personnage est refusé (`db.js:450 "La suppression d'un personnage est réservée à l'admin."`).

**Objets — `addItem()` / `removeItem()`** (`9504-9542`), `manage_items` (admin, mj), modales `m-addi` (nom `ai-n`, catégorie `ai-c`, quantité `ai-q`, note `ai-note`) et `m-remi` (select `ri-s`, quantité `ri-q`, note). Item : `{id:"i<Date.now()>", name, category, qty}` ; ajout cumule sur `name+category` identiques ; retrait borne à 0 (l'item reste en inventaire avec `qty:0`, filtré à l'affichage). Historique `type:"item"` (2.1). Toasts "<q>× <nom> → <perso>." / "<q>× <nom> retiré.". Pas de `sysLog`.

**Stats — `oES()` / `saveStats()`** (`9547-9602`), `manage_stats` (admin), modale `m-edits`. Champs : PV/EP/EM courants, max en lecture seule (title "Calculé automatiquement selon le niveau"), niveau `es-niv`, XP `es-xp`, équipement `es-hel/es-che/es-leg`, branche (`bropt`). Formules (`9577-9592`) : `pvMax = 30 + (niveau-1)*s.pvN`, `epMax = 50 + (niveau-1)*s.epN`, `emMax = 20 + (niveau-1)*s.emN` (s = définition du serment ; sinon valeurs saisies/30/50/20) ; courants plafonnés au max ; `xpMax = NPProgression.xpRequired(level)` ; `doLvlUp` appliqué. Historique `type:"stat"` "Stats mises à jour — …" ; `sysLog("stats_modif","Stats de '<n>' modifiées — Niv.<l> PV:<c>/<m> EP:… EM:…")` ; toast "Stats de <n> sauvegardées.". Un MJ appelant ce chemin serait refusé serveur pour tout champ hors `MJ_PLAYER_FIELDS` (`db.js:428-458` : `xp, xpMax, level, pvCur, pvMax, epCur, epMax, emCur, emMax, inventory, history, equipment, statuts` ; message `"Modification réservée à l'admin : <champ>."`).

**XP — modale `m-prog` "Progression du joueur"** (`renderProgPanel`, `9202-9286`), onglets conditionnels : "Expérience" (`manage_xp`), "Ajustement" (`adjust_levels`, admin), "Inventaire", "Historique" (15 dernières entrées). Texte : "Une seule expérience fait progresser les statistiques et les capacités du serment.".
- Récompense de combat `applyXP` (`9363-9381`) : `xpGain = ceil(niv_mob * 10 * part/100)` avec `part` ∈ [0,100] (slider "Participation du joueur", défaut 100) ; erreurs "Sélectionne un mob." / "XP = 0. Ajuste la participation." ; historique `type:"xp"` ; toasts "⬆ <n> — Niveau <l> !" ou "+<xp> XP → <n>.".
- Gemmes `applyGemXP` (`9414-9433`) : Gemme Blanche +5 XP, Gemme Incarnate +20 XP, Gemme Écarlate +50 XP (`{b:5,i:20,e:50}`), quantité 1–99 ; stock = items `category==="Gemme"` dont le nom normalisé (sans accents) vaut `gemme blanche|incarnate|ecarlate` ou le mot seul (`gemXPStock` `9395`) ; refus "Pas assez de gemmes en inventaire (<n> disponible(s))." ; retire les gemmes puis historique `type:"gemme"` "+<n> XP (fusion de <q>× <Gemme>)" ; bouton "Fusionner les gemmes".
- Ajustement `adjVal(pid, 'level'|'xp', delta)` (`9435-9453`), admin : boutons ±1 niveau, ±10/±50/±100 XP. Niveau : `xpMax=xpRequired(level)`, `xp = min(xpMax-1, ceil(fraction_precedente * xpMax))`, max PV/EP/EM recalculés (formules ci-dessus) et courants plafonnés ; XP : `doLvlUp`. Historique `type:"add"|"remove"` "Ajust. Niveau|XP : <old> → <new>" ; `sysLog("adj_level"|"adj_xp", "[<n>] Niveau|XP : <old> → <new> (Δ+<d>)")`.
- `doLvlUp(p)` (`9307-9319`) : tant que `xp >= xpMax` → `xp -= xpMax; level++; xpMax = xpRequired(level)` ; `pvMax += s.pvN` (etc.) et **courants remis au max** ; entrée `type:"level"` avec palier (`SERM_PALIERS` niv 2/5/7/10 "Palier I — Éveil" … "Palier IV — Plénitude" ; `SERM_PALIERS_SEASONED` 10/13/16/20 "Aguerri I — Éveil" …, `9299-9300`).
- Sauvegarde `saveProgressionPlayer` (`9323-9340`) : une seule progression à la fois ("Une seule sauvegarde de progression est déjà en cours…"), restauration du cache si refus, toast "Progression non enregistrée : …".

**Historique** : depuis la fiche, `delHistEntry(pid, idx)` (`5989-5998`, `manage_players`, `confirm("Supprimer cette entrée de l'historique ?")`, sans `sysLog`) ; depuis l'onglet Log admin, `deleteHistoryEntry` et `clearAllHistory` (voir §5). Un MJ peut supprimer des entrées (le champ `history` est dans `MJ_PLAYER_FIELDS`).

**Liaison et rôle depuis la carte** (admin) : `setPlayerAccountLink` → `setMJPid(accountId, pid|"")` → `admin_set_pid` ; `setPlayerAccountRole` → `setMJRole` → `admin_set_role` ("Lie d'abord un compte à ce personnage." si aucun compte) (`9711-9735`).

**Chemins d'écriture** : toutes ces opérations envoient la **collection `players` entière** (`up(p)` → `sp` → `sv("players")`, `main.js:1601-1628`) avec CAS ; aucune opération métier serveur pour XP/stats (dette reconnue, `docs/security-and-data.md:17`, `db.js:459-461`).

### 3.4 Comptes en attente de liaison (admin)

- Définition : compte `role==="joueur"` (ou sans rôle) **et** `!pid` (`main.js:4580`, `8861`, `10001`).
- `renderPendingAccounts()` (`8854-8902`) : titre "Comptes en attente de liaison (<n>)", replié par défaut si > 2, par compte : pseudo, "<date> — <heure>", select "— Choisir un personnage —" (personnages non déjà liés : `<nom> — <serment>`), boutons "Lier ce compte" (`linkAccount`) et "Refuser" (`deleteAccount`).
- `linkAccount(accountId)` (`8912-8925`) : "Choisis un personnage." si vide ; `admin_link_account {accountId, pid}` ; `sysLog("liaison","Compte '<pseudo>' lié au personnage '<nom>'")` ; toast "Compte '<pseudo>' lié à <nom>." ; recharge les caches privés.
- `deleteAccount(accountId)` (`8959-8970`) : `confirm("Supprimer ce compte ?")`, `admin_delete_account`, `sysLog("compte_supprime","Compte '<pseudo>' supprimé")`, toast "Compte supprimé.".
- Badges (`updatePendingBadge` `4578-4590`) : `#pending-badge` (section), `#nav-pending-badge` (bouton "Outils"), `#dd-joueurs-pending-badge` (item Personnages) ; visibles si n > 0.
- **Poll** `startAdminPoll()` (`5227-5245`) : toutes les 10 s, compare le nombre de comptes en attente **du cache local** (`getAccounts()`) au badge ; ne fait **aucun appel réseau** ; toast "Nouveau compte en attente de liaison !" seulement si le cache a changé entre-temps (donc après une action admin). Une inscription réelle n'est vue qu'au rechargement.
- Serveur `admin_link_account`/`admin_set_pid` (`auth.js:860-879`) : vérifie l'existence du personnage (`404 "Personnage introuvable"`), `pid` vide = déliaison ; audit `admin_link_account {accountId, pid}`. `admin_unlink_account` (`881-892`). `admin_delete_account` (`844-858`) : refus "Impossible de supprimer le dernier compte Admin." ; **ne supprime pas le personnage lié** (contrairement à `self_delete_account`, `auth.js:387-421`, qui supprime compte + personnage d'un joueur en une transaction).
- Guide "Premiers pas" (`first-steps.js`) explique ce flux côté joueur : état `pending` "Compte créé · liaison à venir" / "Ton histoire peut déjà prendre forme." / "…Un administrateur doit maintenant le lier à ton personnage. Transmets-lui ton pseudo de compte sur le serveur Discord…", "Pseudo à transmettre : <pseudo>", "Après la confirmation de l’administrateur, recharge la page pour retrouver ta fiche." ; état staff "Repères pour l’équipe" / "Accompagner les premiers pas." (`first-steps.js:34-61`, tests `scripts/test-first-steps.js`).

### 3.5 Code mort dans ce périmètre

- `renderMJList()` (`main.js:9750-9836`, liste de comptes avec recherche, filtre par rôle "Tous/Admins/MJ/Designers/Joueurs (n)", boutons "Reset"/"MDP"/"Suppr.", puces de rôle, select personnage, "Actualiser") cible `#mjlist` qui **n'existe plus** dans `index.html` (seule une règle CSS `#mjlist-section` subsiste, `index.html:2482`). Appelé à la connexion admin et après plusieurs actions, il retourne immédiatement.
- `renderPendingTab()` (`main.js:4592-4625`, cible `#t-pending-c`, textes "Aucune fiche n'est en attente", "<n> compte(s) en attente de liaison", "Inscrit le …", "Lier ce compte à un personnage") : conteneur absent du DOM → inerte.
- `delMJ`, `setMJRole`, `setMJPid` (`9688-9717`) ne servent plus qu'aux puces de la carte personnage.

---

## 4. Administration (onglet `database`, menu "Administration", admin uniquement)

Accès : `ADMIN_TABS=["serments-admin","database"]` (`main.js:5503`, redirection silencieuse vers `accueil` sinon) ; `renderDatabase()` vide le conteneur si non admin (`4796`). Entrée menu : "🗄 Administration" classe `perm-admin` (`index.html:7043`, drawer `7105`) ; `staff-navigation.js:326` ajoute le title "Administration : tableau de bord, comptes, thèmes et logs". Alias : `switchTab('stats')` → `database` (`main.js:5496`).

### 4.1 Cadre commun (`renderDatabase`, `main.js:4794-4998`)

- Bandeau "⚠ Données confidentielles — Accès administrateur uniquement." (re-stylé par `database-admin-polish.js:284-293` en "Données confidentielles / Accès administrateur uniquement. Vérifie toujours l’onglet actif avant une action sensible.").
- Onglets internes `window._dbTab` : `dashboard` "Vue d'ensemble", `comptes` "Comptes", `themes` "Thèmes", `historiques` "Log" (`4807`). L'ancien `audit` est **redirigé** vers `historiques` (`4650`, `4806`).
- `database-admin-polish.js` : uniquement du style + une note de pied "Astuce : les onglets Comptes, Thèmes et Log sont des zones sensibles. Les boutons rouges ou destructifs doivent toujours être confirmés avant validation." ; les boutons dont le `onclick` contient `delete|reset|wipe|clear` sont colorés en rouge ; rafraîchi toutes les 2,5 s + MutationObserver.

### 4.2 Vue d'ensemble

`renderStats("p-admin-dashboard-c")` (`main.js:10283-10500`) :
- Titre "NUAGES POLAIRES / Tableau de Bord", boutons "⬇ Export JSON partiel" (`exportDB`) et "⬆ Import JSON" (`importDB`, input `.json`).
- KPI : "Aventuriers" (personnages, "personnages actifs"), "Niveau moyen" (arrondi 0,1), "Actifs / 7j" (comptes avec `lastSeen > now-7j`), "Combats" (archives), "Gemmes" (entrées `history.type==="gemme"`, "distribuées"), "Comptes" ("membres inscrits").
- Graphiques canvas : "SERMENTS LES PLUS JOUÉS" (`#chart-serments`), "DISTRIBUTION DES NIVEAUX" (`#chart-levels`), "BRANCHES" (`#chart-branches`, A/B/aucune par présence de "Branche A" dans `branch`), "CRÉATURES LES PLUS AFFRONTÉES" (top 6 depuis les archives de combat, "Sur <n> combat(s) archivé(s)").
- "PROGRESSION SERVEUR" : Niveau moyen (/10), XP total cumulé, Gemmes distribuées, Joueurs liés (x/total), En attente, Staff ; "TOP NIVEAUX" (5, médailles 🥇🥈🥉).
- "DERNIÈRES CONNEXIONS" : 8 comptes par `lastSeen` décroissant, pastille verte si < 1 h, "À l'instant"/"<n> min"/"<n>h"/"<n>j".

Console technique (`admin-dashboard.js` partie 1, montée sous `#np-dashboard-console`, admin détecté par `CU.role==='admin'` ou classe `is-admin`) :
- Hero "Admin · console intégrée" / "Santé technique & diagnostics" / "Le tableau de bord admin regroupe maintenant les statistiques serveur et la console technique. Les actions ci-dessous sont des vérifications sûres : elles ne modifient pas la DB.".
- Cartes : "DB" (état `npApiHardening.state().db`), "Auth", "Thème" (`themeMaxAuditReport().active` ou `data-theme-active`), "Modules" ("OK"/"Incomplet" selon présence de `npDiagnostics` et `npSiteSelfTest`).
- "Actions sûres" (badge "Aucune écriture DB") : "Test complet" (`runDashboardConsoleSelfTest` → `npSiteSelfTest.run`), "Diagnostic serveur" (`runDashboardServerHealth`), "Diagnostic DB/Auth" (`runDashboardConsoleDiag` → `npDiagnostics.run`), "Réessayer API" (`npApiHardening.retry`), "Vider erreurs front", "Copier rapport", "Exporter .json" (fichier `nuages-polaires-console-<ISO>.json`).
- Sections "Diagnostic serveur", "Résultats" (cartes "OK"/"Warnings"/"Erreurs" + liste), "Dernières actions console" (24 max, en mémoire).
- Rapport complet (`buildFullReport`, `:674-686`) : `{version:'v267', at, url, role, user, status:{api, db, auth, theme, activeTheme, diagnostics, selfTest, storage, lastError, events}, health, lastReport, actions}`.
- Re-rendu toutes les 5 s et après chaque `renderStats` (wrapping de la fonction globale, `:688-706`). `installAdminGate` cache `#np-diagnostics-button/panel` hors admin (`:280-311`).
- Partie 2 (polish) insère l'en-tête "Tableau de bord admin / Vue d’ensemble serveur / Un point d’entrée unique pour surveiller le site : statistiques, santé DB/Auth, moteur de thèmes, diagnostics et actions sûres. Le tableau de bord reste réservé aux administrateurs." + 4 cartes d'état, séparateurs "Statistiques serveur" et "Santé technique".
- `runQaSmokeAndRefresh` / `renderQaReport` (`main.js:5001-5042`, "QA rapide", routes accueil/joueurs/simulation/database) : `renderQaReport` n'est appelé nulle part → mort.

### 4.3 Comptes (`main.js:4822-4910`)

Tableau "Tous les comptes (<n>)", recherche "Rechercher (pseudo, rôle, perso)...", compteur "<filtrés> / <total>", tri par colonne (Pseudo, Rôle, Dernière activité, Créé le). Colonnes et opérations :

| Colonne | Contenu | Opération → action serveur (`auth.js`) |
|---|---|---|
| Pseudo | `pseudo` | — |
| Mot de passe | "••••••••" ou "⚠ RÉINITIALISÉ" si `forcePasswordReset` ; bouton "✎" (title "Changer le mot de passe") ; bouton "🔑 Reset" (title "Générer un mot de passe temporaire unique valable une heure") | `openEditPass` → modale `m-editpass` (min 4 caractères, "4 caractères minimum.") → `admin_set_password {accountId, newPassHash}` (`:828-842`, `finishPasswordReset` révoque les sessions) ; `resetAccountPass` (`main.js:5348-5371`) → `confirm("Réinitialiser le mot de passe de <pseudo> ? Un mot de passe temporaire unique, valable une heure, sera affiché pour le lui transmettre.")` → `admin_reset_password` (`:810-826`, `crypto.randomBytes(24).toString("base64url")`, `forcePasswordReset:true`, `resetExpiresAt = now + 1 h`, sessions révoquées) → `sysLog("mdp_reset","Mot de passe de <pseudo> réinitialisé")` → modale éphémère "Mot de passe temporaire" / "À transmettre au propriétaire du compte. Il devra choisir un nouveau mot de passe à la connexion." / "Code temporaire" / "Expire le <date>. Ce code ne sera plus affiché après fermeture." / "Fermer et effacer" |
| Rôle | select Joueur/MJ/Designer/Admin, désactivé pour le dernier admin | `dbSetRole` → `admin_set_role` (`:894-910`, refus "Impossible de changer le rôle du dernier Admin.") ; toast "Rôle mis à jour." |
| Personnage lié | select "— Aucun —"/personnages ; "✕" délier ; "→" (title "Aller à la fiche") | `setAccountPid` (ignore la valeur vide !) → `admin_set_pid` ; `unlinkAccount` → `confirm("Délier ce compte de son personnage ?")` → `admin_unlink_account` → `sysLog("deliaison","Compte '<pseudo>' délié de son personnage")` |
| Thèmes | puces des `unlockedThemes` (joueurs seulement), sélectionné en surbrillance, "✕" (title "Retirer ce thème") | `adminRevokeThemeFromAccount` → `confirm('Retirer le thème "<n>" à <pseudo> ?')` → `admin_revoke_theme` (`:984-999`, remet `selectedTheme:"dark"` si c'était le thème actif) ; toast "🧹 Thème « <n> » retiré à <pseudo>." |
| Dernière activité | "Jamais connecté" ou "<ago> — jj/mm/aa" | — |
| Créé le | date + heure | — |
| (vide) | "Suppr." sauf dernier admin | `deleteAccount` (3.4) |

Forme d'un compte telle que reçue par l'admin (bundle de session, `auth.js:551-555`, `pass` retiré ; `db.js:668-675` retire aussi `sessionVersion` et `resetExpiresAt` sur `get`) :

```json
{ "id": "a1727700000000_ab12cd34", "pseudo": "Aurore", "role": "joueur", "pid": "p_alice",
  "createdAt": 1727700000000, "lastSeen": 1727790000000,
  "unlockedThemes": ["sylvan"], "blockedThemes": [], "selectedTheme": "dark",
  "forcePasswordReset": false, "sessionVersion": 3 }
```
Normalisation `auth.js:254-271` (pseudo ≤ 32, `createdAt` 0 par défaut, `lastSeen` = `createdAt`), client `main.js:676-690`. Inscription (`auth.js:743-751`) : `{id:"a"+Date.now()+"_"+hex, pseudo, pass, role:"joueur", pid:null, createdAt, lastSeen}`. Bootstrap admin (`:367-378`) : `id:"admin_…"`, `forcePasswordReset:true`, `sessionVersion:1`.

Note : `sv("accounts", …)` est refusé côté client ("Les comptes se modifient uniquement via les actions de gestion dédiées.", `main.js:1563-1567`) ; toutes les mutations passent par `auth.js` avec fusion par instantané (`_shared/auth-store.js`, `protectAccounts:true`).

### 4.4 Thèmes (`renderAdminThemes("p-admin-themes-db-c")`, `main.js:3974-4057`)

- Titre "Gestion des thèmes", texte "Même bibliothèque visuelle que la Collection : tu pilotes ici la visibilité et la distribution, sans changer la DA côté joueurs.", bouton "+ Créer un thème", compteur "<n> joueur(s) ciblable(s)".
- Par thème : rareté/catégorie (canon ou `sylvan`/`galactic` = "Rare", `event` = "Saisonnier"/"Événement", sinon "Classique"), état "Toujours visible"/"Visible"/"Masqué", pastille "Auto tous" si `autoGrantAll`, bouton "Modifier" (`openEditTheme`), "Don manuel" select "Choisir un joueur…" (+ " • déjà débloqué") + "Donner" (`grantThemeToAccount` → `admin_grant_theme`, réservé aux comptes joueur, toast "🎨 Thème « n » donné à <pseudo>."), interrupteur de visibilité (`setThemeVisibility` → `admin_set_theme_visibility`, écrit `theme_visibility` **et** `event_themes`, toast "Visibilité du thème « n » mise à jour." ; thèmes `dark`/`light` toujours visibles : "Les thèmes donnés à tout le monde restent visibles."), "Donner à tous" (`admin_grant_theme_all`, toasts "🎁 Thème « n » donné à <k> joueur(s)." / "Tous les joueurs possèdent déjà ce thème.") ou "Attribué à tout le monde" (désactivé).
- `toggleThemeAutoGrant` (`4237-4245`, non câblé dans ce rendu) écrit `event_themes` directement ; textes "Distribution automatique activée/désactivée pour « n ».".
- Modale `m-theme` (`4247-4283`) : "Nom du thème" (placeholder "Pâques..."), "Description", "Classe CSS (optionnel)" (placeholder "theme-easter"), couleurs "Fond"/"Accent"/"Or" (défauts `#0d0e18`, `#7eb8d4`, `#c9a84c`), "Disponible jusqu'au". `saveTheme` (`4324-4346`) écrit dans `event_themes` :

```json
{ "id": "theme_1727700000000", "name": "Pâques", "desc": "…", "cls": "theme-easter",
  "preview": ["#0d0e18", "#7eb8d4", "#c9a84c"], "event": true, "availableUntil": 0,
  "createdAt": 1727700000000, "autoGrantAll": false, "visible": false }
```
Ces opérations sont gardées par `can("manage_mjs")`/`isAdminRole` côté client et `isAdmin` côté serveur. Le détail du moteur de thèmes relève d'un autre audit.

### 4.5 Log (`_tab==="historiques"`, `main.js:4918-4988`, `_renderLogEntries` `5044-5157`)

- Fusion de deux sources triées par `ts` décroissant : (a) toutes les entrées `history` de tous les personnages → `{ts, action:h.type||"stat", detail:h.text||h.msg, actor:h.by||"?", target:"<nom> (<serment>)", pid, hidx, src:"history"}` ; (b) `getSysLog()` → `{…, target:"", src:"syslog"}`.
- En-tête "LOG SYSTÈME", boutons "En cours (<n>)", "Archives (<n>)" (si archives), "📦 Archiver" (title "Archiver les logs actifs et repartir à zéro"), "Tout vider" (si entrées).
- Pagination `_LOG_PAGE_SIZE=50` ("Page x / y (<n> entrées)", « ‹ › », fenêtre ±3).
- Ligne : icône/couleur `ACTION_META` (voir §5.3), texte (HTML brut), `fdt(ts)`, "par <acteur>", "→ <cible>", badge action en majuscules (sauf `stat`) ; bouton "✕" (title "Supprimer") uniquement pour les entrées `history` du log actif → `deleteHistoryEntry(pid, hidx)` (`5170-5181`, `manage_players`, `sysLog("history_delete","Entrée supprimée pour '<nom>' : <texte>")`, sans confirmation).
- "Tout vider" → `clearAllHistory` (`5159-5169`, `confirm("Vider tout le log de tous les personnages ?")`, vide `history` de tous les personnages, `sysLog("history_clear","Historique complet vidé (<n> entrées)")`, toast "Log vidé."). **Ne vide pas `np_syslog`** malgré le libellé.
- Vue archives : liste `label` / "<n> entrée(s) · <filename>.txt", boutons "👁 Voir", "⬇ DL" (`downloadArchive`), "✕" (`deleteArchive`, admin, `confirm("Supprimer cette archive ? Cette action est irréversible.")`, toast "Archive supprimée."). Vue d'une archive : "← Archives", "<label> — <n> entrée(s)", "⬇ Télécharger", "✕ Supprimer".
- Journal de sécurité serveur (`np_audit_log`) : `loadAuditLogAdmin` (`4627-4647`, `admin_get_audit_log`, "Impossible de charger le journal de sécurité.") et `_renderAuditEntries` (`4660-4749`, filtres "Filtres premium" recherche/action/acteur/du/au, pagination `_AUDIT_PAGE_SIZE`, "Aucune entrée dans le journal de sécurité.", "⟳ Rafraîchir") ne sont **plus atteignables** : `_dbTab==='audit'` est réécrit en `historiques` avant le chargement (`4650`, `4806`, `5609`) et `_renderAuditEntries` n'a aucun appelant. L'audit serveur n'est donc visible dans aucune UI.

### 4.6 Import / export JSON (`main.js:10856-10900`)

Export `exportDB()` — fichier `nuages-polaires-export-partiel-YYYY-MM-DD.json` :

```json
{ "version": 2, "scope": "functional-export",
  "notice": "Export partiel. Les comptes sont des métadonnées non restaurables, sans mots de passe. Archives, événements et lieux exclus.",
  "exported": "2026-09-30T…Z",
  "players": [ … ], "accounts": [ … ], "beasts": [ … ], "serments_custom": { … } }
```
Toast "Export partiel téléchargé : personnages, bestiaire, serments et métadonnées des comptes. Ce fichier ne remplace pas une sauvegarde serveur.". **Les événements, lieux, thèmes, logs et archives ne sont pas exportés.**

Import `importDB(input)` : refuse JSON invalide ("Erreur de lecture JSON."), absence de `version` ("Fichier invalide."), collections mal typées ("Format des collections invalide. Aucune donnée importée.") ; n'importe que `serments_custom` (objet), `beasts`, `players` (tableaux) ; **jamais `accounts`** ("Aucune collection importable. Les comptes ne sont jamais restaurés depuis ce fichier." / confirm "Remplacer les collections présentes dans cet export partiel ? Les comptes seront ignorés et leurs mots de passe conservés. Les collections seront enregistrées séparément.") ; écritures séquentielles non transactionnelles, message de reprise "Import interrompu. Collections confirmées : <liste|aucune>. <erreur> Comptes inchangés." ; succès "Import enregistré : <liste>. Comptes ignorés ; mots de passe conservés. Ceci est un import partiel.". Aucune entrée `sysLog` n'est écrite pour un import/export.

Bestiaire (hors domaine mais même famille) : `exportBeastJson(id)` (un fichier `<nom-slug>.json` par créature) et `importBeastJson()` (`manage_beasts`, objet ou tableau, ids régénérés en cas de doublon, "<n> créature(s) importée(s)."), `main.js:7826-7864`.

Sauvegarde complète hors UI : `npm run backup:store -- --output <fichier>` (`scripts/backup-store.js`, format `np-store-backup-v1 {exportedAt, valueEncoding:"postgresql-jsonb-text", count, rows:[{key,value,updated_at}], sha256}`, source `NP_BACKUP_SOURCE_URL` seulement, fichier 0600) et `npm run backup:verify -- --input <fichier>` (restauration dans PGlite en mémoire, `scripts/verify-backup.js`, `docs/backups.md`).

---

## 5. Journal système (`np_syslog`) et archives

### 5.1 Écriture (`sysLog(action, detail, actor)`, `main.js:1156-1164`)

- Réservé aux rôles `admin` et `mj` côté client (les joueurs/designers ne tentent plus l'écriture ; testé `test-player-actions-browser.js:300`) et serveur (`EXACT_WRITE_RULES`).
- Entrée : `{ts:Date.now(), action, detail, actor: actor || CU.name || "Système"}` ; insérée **en tête** ; tronquée à **2 000** côté client, à **500** côté serveur (`db.js:340`, test `test-integration.js:86-95`). Archive : 50 lots max (`db.js:341`, `main.js:1189`).
- Chaque appel réécrit la collection complète via `sv(_LOG_KEY)` → CAS.

### 5.2 Actions réellement émises (liste exhaustive des `sysLog(` de `main.js`)

| action | detail | acteur | ligne |
|---|---|---|---|
| `connexion` | "Connexion au Compagnon" | `name` (à chaque login par formulaire, pas à l'auto-login) | 2358 |
| `history_clear` | "Historique complet vidé (<n> entrées)" | `CU.name` | 5166 |
| `history_delete` | "Entrée supprimée pour '<nom>' : <texte>" | | 5177 |
| `mdp_reset` | "Mot de passe de <pseudo> réinitialisé" | | 5355 |
| `serment_visibilite` | "Serment '<nom>' masqué|rendu visible" | | 6515 |
| `branche_change` | "'<nom>' : Branche <old> → <new>" | | 7020 |
| `serment_change` | "'<nom>' : Serment <old> → <new>" | | 7051 |
| `liaison` | "Compte '<pseudo>' lié au personnage '<nom>'" | | 8921 |
| `deliaison` | "Compte '<pseudo>' délié de son personnage" | | 8938 |
| `compte_supprime` | "Compte '<pseudo>' supprimé" | | 8966 |
| `adj_level` / `adj_xp` | "[<nom>] Niveau|XP : <old> → <new> (Δ±d)" | | 9445 |
| `personnage_cree` | "Personnage '<nom>' (<serment>) créé" | | 9484 |
| `personnage_supprime` | "Personnage '<nom>' supprimé" | | 9493 |
| `stats_modif` | "Stats de '<nom>' modifiées — Niv.<l> PV:… EP:… EM:…" | | 9598 |
| `event_cree` / `event_modif` | "Événement '<nom>'[ le <date>]" | | 15265 |
| `event_notif` | "Notification envoyée à <n> joueur(s) pour '<nom>'" | | 15278 |
| `event_visibilite` | "Événement '<nom>' masqué|publié" | | 15305 |
| `event_supprime` | "Événement '<nom>' supprimé" | | 15322 |

### 5.3 `ACTION_META` (icônes/couleurs, `main.js:5051-5105`) — clés connues du rendu

`stat 📊`, `add ➕`, `remove ➖`, `consume ◎`, `connexion 🔑`, `deconnexion 🚪`, `compte_cree 👤`, `compte_supprime 🗑️`, `mdp_change 🔒`, `mdp_reset 🔓`, `liaison 🔗`, `deliaison 🔗`, `personnage_cree 👤`, `personnage_supprime 🗑️`, `stats_modif ✎`, `serment_change ⇄`, `branche_change ⇄`, `adj_level ⬆`, `adj_xp ✦`, `adj_sLevel ⬆`, `adj_sXp ✦`, `gemme_ajout 💎`, `gemme_supprime 💎`, `drop_gemme 💎`, `creature_ajout 🐾`, `creature_supprime 🐾`, `creature_modif 🐾`, `combat_debut ⚔`, `combat_action ⚔`, `combat_fin ⚔`, `drop 🎲`, `roll 🎲`, `history_clear 🗑️`, `history_delete 🗑️`, `statut_pose ⚠`, `statut_retire ✓`, `event_cree 📅`, `event_modif 📅`, `event_supprime 📅`, `event_visibilite 👁`, `event_inscription ✓`, `event_desinscription ✕`. Inconnue → `•`.

Jamais émises aujourd'hui : `deconnexion, compte_cree, mdp_change, adj_sLevel, adj_sXp, gemme_*, drop_gemme, creature_*, combat_*, drop, roll, statut_pose, statut_retire, event_inscription, event_desinscription, serment_visibilite n'a pas de méta, event_notif n'a pas de méta`.

### 5.4 Archivage (`archiveSysLog`, `main.js:1165-1200`)

- Collecte `np_syslog` **et** tous les `history` des personnages (`{ts, action:type||"stat", detail:text, actor:by||"?", target:"<nom> (<serment>)", src:"history"}`), tri décroissant ; "Aucun log à archiver." si vide ; `confirm("Archiver et vider TOUT le log ?\n\n<n> entrées seront archivées puis supprimées du log actif.")`.
- Lot : `{archivedAt:Date.now(), label:"Archive du JJ/MM/AAAA HH:MM", filename:"archive-YYYY-MM-DD_HHhMM", entries:[…]}`, inséré en tête, 50 max.
- Séquence : écrire `np_syslog_archive` → vérifier que la version/contenu de `np_syslog` n'a pas bougé (sinon "Le log a changé pendant l’archivage. Les nouvelles entrées sont conservées.") → écrire `np_syslog=[]` → vérifier les fiches (sinon "Les fiches ont changé pendant l’archivage. Leurs historiques sont conservés.") → vider tous les `history` et écrire `players`. Toast "Archivé (<n> entrées). Log vidé." ou "Archivage incomplet : <message>". Tests : `scripts/test-system-log.js`.
- Téléchargement `downloadArchive(idx)` (`1202-1216`) : `.txt` UTF-8, lignes `"NUAGES POLAIRES — <label>"`, `"Exporté le <date>"`, vide, `"DATE | ACTION | DÉTAIL | PAR | CIBLE"`, `"---"`, puis `d | action | detail | actor | target`.
- `np_syslog_archive` : lecture/écriture admin seulement, suppression globale refusée (`db.js:79 CRITICAL_COLLECTION_KEYS`, test `test-integration.js:70-84`).

### 5.5 Chargement du journal — constat de lecture de code

Ni `session_bundle` (`auth.js:530-614` : `accounts, players, beasts (staff), themeVisibility, spawn_lab_staff, combatArchives*`) ni `get_public_bundle` (clés publiques uniquement) ne renvoient `np_syslog` / `np_syslog_archive`. Aucun `_dbCall({action:'get', key:'np_syslog'})` n'existe dans le front (recherche exhaustive). Seul le chemin de reconnexion hors-ligne `get_all` (`main.js:4472`, hydraté par `_hydrateBundleData` `871`) les charge. Par conséquent, en session normale :
- l'onglet Log affiche uniquement les entrées écrites pendant la session courante (+ les historiques des personnages) ;
- la première écriture `np_syslog` d'une session part avec `expectedVersion:null` (clé non connue) ; si la ligne existe déjà en base, `compareAndSetStore` fait `INSERT … ON CONFLICT DO NOTHING` → 0 ligne → `409 VERSION_CONFLICT` (`db.js:574-580`, `985-986`), et la clé reste bloquée pour le reste de la session (`main.js:1545-1550`). Les tests navigateur ne le détectent pas car les requêtes suivantes sur cette clé sont rejetées localement sans appel réseau.
À confirmer en recette avant l'overhaul ; mais dans tous les cas, la nouvelle architecture doit **charger explicitement le journal** pour le staff et écrire par **append serveur** (comme `np_audit_log`) et non par réécriture CAS de la collection entière.

### 5.6 Journal d'audit serveur (`np_audit_log`, 1 000 entrées, append côté SQL)

- Côté `auth.js:289-304` : `{ts, actorId, actorPseudo, actorRole, action, ip, details}` ; actions : `login_rate_limited, login_failed, login_success, register_rate_limited, register_success, self_change_password, complete_forced_reset, self_set_theme, admin_reset_password, admin_set_password, admin_delete_account, admin_link_account, admin_unlink_account, admin_set_role, admin_grant_theme, admin_grant_theme_all, admin_set_theme_autogrant, admin_revoke_theme, admin_block_theme, admin_unblock_theme, admin_set_theme_visibility`.
- Côté `db.js:631-645` : `{ts, source:"db", action, actorId, actorPseudo, actorRole, ip, origin, ua (≤240), details}` ; actions : `rpg_save_character, consume_own_item, dismiss_notifications, set_event_participation, db_set {key, summary:{kind,length,sampleIds|keys,keyCount}}, db_set_denied {key, reason?}, db_set_rejected {key, reason}, db_patch_own_player {pid, fields}, db_delete, db_delete_denied`.
- Lecture : `get_audit_log` (db, admin) / `admin_get_audit_log` (auth, admin). Clé bloquée en écriture client (`BLOCKED_CLIENT_KEYS`). Aucune UI opérationnelle (4.5).

---

## 6. Diagnostics et self-test

### 6.1 `assets/js/diagnostics.js` (v258, `window.npDiagnostics`)

- Ouverture : `Ctrl+Alt+D` (pose `localStorage.np_diag_visible=1`), URL `?diag=1` ou `?debug=1` (ouverture auto après 200 ms), hash contenant `diag|debug`, `npDiagnostics.open()`, `window.npDiag()`. Le bouton flottant `#np-diagnostics-button` est systématiquement retiré (`removeButton`) ; hors admin le panneau est masqué par `admin-dashboard.js` (`installAdminGate`).
- Panneau `#np-diagnostics-panel` : titre "Diagnostics Nuages Polaires v258", sous-titre "DB, Auth, bundle public, session et erreurs front lisibles. Raccourci : Ctrl + Alt + D.", boutons "Relancer les tests", "Copier le rapport", "Vider les logs", aide "Si la home affiche une erreur, ouvre ce panel puis copie le rapport. Les erreurs 503 indiquent généralement une variable Netlify manquante ou une DB indisponible. Les 401 côté Auth peuvent simplement vouloir dire que tu n’es pas connecté.", section "Derniers événements" (20 affichés, 80 conservés).
- Tests (`runDiagnostics`, `:378-431`), chacun `{title, kind, status, timeMs, summary, error}` : "DB ping" (`db ping`), "Bundle public" (`get_public_bundle`), "Auth verify" (`auth verify`, 401 toléré = `warn`), "Session bundle" (`auth session_bundle`, 401 toléré). Classification `classifyHttp` : ok / `warn` (401 toléré, 4xx, `ok:false`) / `bad` (503, ≥500, erreur réseau). Résumés : "OK", "Réponse OK", "Non connecté ou session expirée", "Service non configuré ou DB indisponible", "Réponse HTTP <n>", "Pas de réponse". Événement final "Diagnostics terminés : <b> erreur(s), <w> avertissement(s).".
- Capture globale : `window.error`, `unhandledrejection`, et wrapping de `fetch` pour journaliser les réponses ≥ 500 et échecs réseau sur `/.netlify/functions/` (`:452-496`).
- Rapport copié : `{at, version, url, userAgent, results, events(30)}`.

### 6.2 `assets/js/site-self-test.js` (v260, `window.npSiteSelfTest`, boutons "Test site" / "Copier self-test" injectés dans le panneau diagnostics)

Items `{name, status:ok|warn|bad, detail, extra}` :
1. "DOM / scripts" : présence de `#s-app` et des scripts `main.js, ui-patches.js, theme-max.js, api-hardening.js, diagnostics.js, site-self-test.js` (`bad` si ≥ 3 manquants).
2. "Scripts critiques" : globals `themeMaxAuditReport, normalizeThemeId, themeMeta, npDiagnostics, npApiHardening`.
3. "LocalStorage" : lecture/écriture.
4. "Theme Engine" : `data-theme-engine="v257"` sur `html` et `body` + `themeMeta(active)`.
5. "Collection thèmes" : cartes `.theme-card-premium,.collection-card`, `.np-theme-toolbar`, `.np-theme-hero`.
6. "Diagnostic UI".
7. "Netlify DB" (`ping`), "Bundle public", "Auth verify" ("Pas connecté : normal si tu es en visiteur." en 401), "API hardening state" ("État API : DB=…, Auth=…").
Rapport `{version, at, durationMs, url, userAgent, items}` ; événement DOM `np:self-test-complete`.

### 6.3 Diagnostic serveur (`admin-dashboard.js:527-584`, action `admin_health` `auth.js:1059-1084`)

Réponse serveur : `{ok, at, env:{databaseConfigured, jwtConfigured, siteUrlConfigured, siteOrigin, adminBootstrapConfigured, adminRecoveryEnabled, netlifyContext, deployId}, db:{configured:true, table:"np_store", reachable:true}, auth:{session:true, accountId, role, admins}}` (`_safeEnvStatus` `auth.js:13-25`). Items UI : "Auth admin", "Base de données" ("Ping DB OK en <n> ms."), "NP_JWT_SECRET", "NP_SITE_URL", "Récupération admin" ("Mode recovery actif temporairement." / "Bootstrap admin configuré." / "Aucun recovery admin actif."), "Contexte Netlify". Conseils (`healthAdvice`) : "Vérifie NETLIFY_DATABASE_URL dans Netlify puis redéploie.", "Vérifie NP_JWT_SECRET : 32 caractères minimum.", "Vérifie NP_SITE_URL : il doit matcher exactement l’URL publique du site.", "Reconnecte-toi admin après un redéploiement ou une rotation de NP_JWT_SECRET.", "Supprime NP_ADMIN_PASSWORD et NP_ADMIN_RECOVERY après récupération du compte admin.".

---

## 7. Navigation staff et matrice rôle × opération

Menu "Outils" (`index.html:7024-7047`, template injecté après auth staff `main.js:4529-4539`) : sections "MAÎTRISER UNE PARTIE" (`perm-mj` : Personnages, Simulation, Apparitions), "CRÉATION" (`perm-designer` : Atelier bestiaire ; `perm-admin` : Atelier serments), "ADMIN" (`perm-admin` : Administration). `staff-navigation.js` synchronise `body.np-is-admin|np-is-mj|np-is-designer|np-is-staff` (masque `perm-*` par CSS, `:221-244`), ajoute une pastille de rôle ("Admin"/"MJ"/"Designer"/"Staff", icône ♛/⚙/✦), le hint "Admin · outils de gestion, données et santé technique." / "Staff · outils disponibles selon ton rôle.", et des titles ("Personnages", "Simulation", "Apparitions", "Atelier bestiaire", "Atelier serments", "Administration"). Le drawer mobile reprend la même liste (`index.html:7096-7106`). Garde-fous d'onglets : `main.js:5501-5521`.

| Opération | Joueur | MJ | Designer | Admin | Menu/UI | Serveur |
|---|---|---|---|---|---|---|
| Voir l'agenda (publiés) | ✔ | ✔ | ✔ | ✔ | onglet public | `events` public filtré |
| Voir les événements masqués | ✘ | ✔ | ✔ | ✔ | `_canManageEvents` | `isStaff` |
| S'inscrire / se désinscrire | ✔ (perso lié) | ✘ (boutons cachés) | ✘ | ✘ | `!isStaff` | `set_event_participation` (tout rôle avec `pid`) |
| Créer / modifier / masquer / supprimer un événement | ✘ | ✔ | ✔ | ✔ | `_canManageEvents` | `events` : admin, mj, designer |
| Notifier les joueurs à la création | ✘ | ✔ | ✘ (case cachée) | ✔ | `_canNotifyEventPlayers` | `players` : admin, mj |
| Cloche / effacer ses notifications | ✔ | (visible si `has-character`) | idem | idem | `player-only-tab` | `dismiss_notifications` (`caller.pid` requis) |
| Onglet Personnages | ✘ | ✔ | ✘ | ✔ | `MJ_TABS` | — |
| Créer un personnage | ✘ | ✔ | ✘ | ✔ | `manage_players` | `players` (mj/admin) |
| Supprimer un personnage | ✘ | ✘ | ✘ | ✔ | `delete_player` | `validatePlayerWrite` refuse MJ |
| +Item / −Item | ✘ | ✔ | ✘ | ✔ | `manage_items` | `inventory,history` ∈ `MJ_PLAYER_FIELDS` |
| XP combat / fusion gemmes | ✘ | ✔ | ✘ | ✔ | `manage_xp` | idem |
| Ajustement niveau/XP | ✘ | ✘ | ✘ | ✔ | `adjust_levels` | champs autorisés MJ (non bloqué serveur) |
| Stats / branche / équipement | ✘ | ✘ | ✘ | ✔ | `manage_stats` | `branch` refusé MJ serveur |
| Supprimer une entrée d'historique | ✘ | ✔ | ✘ | ✔ | `manage_players` | `history` autorisé MJ |
| Lier / délier / rôle / supprimer un compte, reset MDP | ✘ | ✘ | ✘ | ✔ | `isAdminRole`/`manage_mjs` | `isAdmin` (auth.js) |
| Reset MDP (bouton table) | — | (client accepte `manage_players`, `main.js:5349`) | ✘ | ✔ | | serveur refuse non-admin |
| Administration (4 onglets) | ✘ | ✘ | ✘ | ✔ | `ADMIN_TABS` | `np_syslog_archive`, `accounts` complets : admin |
| Écrire `np_syslog` | ✘ | ✔ | ✘ | ✔ | `sysLog` | admin, mj |
| Lire `np_syslog` | ✘ | ✔ | ✘ | ✔ | (aucune UI MJ) | admin, mj |
| Archiver / supprimer une archive de log | ✘ | ✘ | ✘ | ✔ | onglet Log | admin |
| Import/export JSON | ✘ | ✘ | ✘ | ✔ | Vue d'ensemble | `set` sur `players/beasts/serments_custom` |
| Thèmes (créer, donner, visibilité) | ✘ | ✘ | ✘ | ✔ | `manage_mjs` | `isAdmin` / `event_themes` (designer aussi autorisé par `set` !) |
| Diagnostics / self-test / santé serveur | (panneau masqué) | masqué | masqué | ✔ | `installAdminGate` | `admin_health` : admin ; `ping`, `get_public_bundle`, `verify` : publics |
| Atelier bestiaire | ✘ | ✘ (menu) | ✔ | ✔ | `manage_beasts` | `beasts` : admin, mj, designer |
| Atelier serments | ✘ | ✘ | ✘ (menu) | ✔ | `ADMIN_TABS` | `serments_custom` : admin, designer |

Écarts menu ↔ serveur notables : le MJ peut écrire `beasts` et le designer `serments_custom`/`event_themes` par `set` alors que l'UI ne le propose pas ; le designer est autorisé à écrire `events` mais n'a pas l'onglet Personnages ni la notification ; `resetAccountPass` est offert côté client à `manage_players` (MJ) mais refusé serveur.

---

## 8. Questions ouvertes

1. **Journal système non chargé** (§5.5) : est-il réellement persistant en production, ou l'onglet Log ne montre-t-il que la session courante ? Si le comportement décrit est confirmé, quel usage le staff en a-t-il réellement (le "Log" est-il surtout l'historique des fiches) ?
2. **Inscriptions par nom** : faut-il migrer `inscrits` vers des ids de personnage (le serveur refuse déjà les homonymes) ? Que faire des inscriptions d'un personnage renommé ?
3. **Notification = entrée d'historique globale** : doit-elle rester dans `history` (compte dans la limite de 200 entrées, archivée avec le log, supprimable par "Tout vider") ou devenir une collection dédiée avec état lu/non lu ?
4. **Staff et cloche** : le staff sans personnage lié hérite du premier personnage (`CU.pid = gp()[0].id`). Est-ce voulu (voir son personnage de MJ) ou un effet de bord à supprimer ?
5. **Modification/publication sans notification** : choix assumé ("Modifier ou publier cet événement ne renvoie pas de notification.") ou manque ? Un événement créé masqué puis publié ne notifie jamais.
6. **Événements sans date** : "À venir" dans l'agenda mais ignorés par l'accueil et fermés à l'inscription ("Inscriptions fermées — date à confirmer."). Quel statut leur donner ?
7. **Rôle designer** : doit-il conserver un rôle sur les événements (`events` écrivable, création offerte) ? Le plan de site (§5.D) demandait de "définir qui organise les événements".
8. **"Tout vider" du Log** ne vide que les historiques de personnages, pas `np_syslog` ; l'archivage vide les deux. Quel comportement est attendu ? Et la suppression admin d'un compte doit-elle (comme l'auto-suppression) retirer le personnage lié ?

---

## 9. Ce qu'il faut absolument préserver dans l'overhaul

- **L'agenda comme rendez-vous de la table Discord** : types `combat/exploration/social/evenement/autre` avec leurs icônes et libellés ("Combat / Chasse", "Social / Roleplay", "Événement majeur"), ton éditorial ("Les rendez-vous du monde.", "Le prochain chapitre", "Les traces du voyage", "Un horizon encore ouvert.", "Choisis un rendez-vous et rejoins l’aventure."), capacité optionnelle avec `0 = sans limite`, liste nominative des participants avec le marqueur "· vous", états "Inscriptions ouvertes / Vous participez / Complet / Passé / Date à confirmer / Masqué · staff", 8 derniers passés, "Prochain événement" en tête de l'accueil avec "Dans <n> jour(s)".
- **Règles métier de participation** (à porter au serveur, déjà en place) : personnage lié obligatoire, événement publié, date future, capacité, interdiction pour le staff de s'inscrire depuis la carte, messages d'erreur explicites (`EVENT_CLOSED`, `EVENT_FULL`, `EVENT_UNAVAILABLE`), confirmation seulement après réponse serveur, verrou anti double-clic, réponses tardives ignorées après changement de session.
- **Brouillon staff préservé et succès partiel explicité** : un échec de sauvegarde ne ferme pas la modale ni ne signale un succès ; la notification échouée est distinguée ("Les notifications n’ont pas été confirmées.") ; validation de capacité ("La capacité ne peut pas être inférieure au nombre de participants déjà inscrits.") ; conservation de `inscrits`, `createdBy` et des champs inconnus à l'édition.
- **Notification de création** (admin/MJ seulement, opt-in, texte "📅 Nouvel événement : <nom> — <date> à <heure>") et la cloche avec effacement manuel, jamais automatique ("le joueur gère manuellement"), effacement individuel ou "TOUT EFFACER", section "EN ATTENTE DE LIAISON" pour l'admin.
- **Le flux d'arrivée d'un joueur** : inscription → compte en attente → liaison par un administrateur → rechargement ; textes du guide Premiers pas ; badges de comptes en attente sur "Outils" et "Personnages" ; "Lier ce compte" / "Refuser".
- **L'outil Personnages comme registre de MJ** : recherche multi-critères, cartes avec vitals PV/EP/EM/XP, opérations +Item/−Item avec note et trace d'historique, XP de combat `ceil(niv_mob × 10 × participation%)`, fusion de gemmes 5/20/50 XP liée au stock réel de l'inventaire, montée de niveau avec paliers de serment, ajustement admin, et la séparation stricte des droits MJ (objets, XP, historique, création) / Admin (stats, serment, branche, suppression, comptes).
- **Le modèle de droits serveur** (`EXACT_WRITE_RULES`, `MJ_PLAYER_FIELDS`, filtrage des lectures par rôle, `expectedVersion` CAS, actions dédiées limitées au propriétaire, audit serveur systématique, dernier admin protégé, reset temporaire d'une heure à usage unique).
- **Le journal staff lisible** (action, détail, acteur, cible, icônes par action), l'archivage daté téléchargeable en texte, et le journal d'audit serveur (même si son UI est à refaire).
- **Diagnostics sûrs et lisibles** ("Aucune écriture DB") : ping DB, bundle public, verify, session bundle, variables d'environnement critiques avec conseils en français, rapport JSON copiable/téléchargeable, capture des erreurs front.
- **Export partiel honnête** ("Ce fichier ne remplace pas une sauvegarde serveur.") et l'outillage de sauvegarde logique `np_store` hors UI.

## 10. Ce qui relève de la dérive / dette

- Journal système : lecture jamais chargée en session normale, écriture par réécriture CAS de la collection entière (conflits probables), double limite 2 000/500, deux journaux distincts (`np_syslog` client, `np_audit_log` serveur) et UI d'audit orpheline (`_renderAuditEntries`, onglet `audit` redirigé) ; "Tout vider" au libellé trompeur ; `sysLog` de suppression écrit avant l'écriture effective (`delP`).
- Notifications = historique : pas d'état lu/non lu, pas de rafraîchissement (badge figé jusqu'au rechargement), classification par recherche de mots dans le texte (`notifType`), `text` rendu en HTML brut (d'où l'échappement à l'écriture), diffusion à **tous** les personnages y compris non liés, une seule trace d'événement occupe l'historique de chaque fiche, aucun filtre "événement" dans la fiche.
- Événements : formats hérités (`titre/dateTs/published`) et champ `ev-published` inversé de `hidden` ; `inscrits` par nom ; pas de `createdAt` ; règles de rôles designer/MJ non alignées avec le menu ; modale partagée re-activée "à la main" ; notification uniquement à la création.
- Administration : `renderMJList` et `renderPendingTab` morts (conteneurs absents), `renderQaReport` mort, `startAdminPoll` sans appel réseau (toast "Nouveau compte en attente…" inatteignable), rendu des tableaux par concaténation de chaînes avec styles inline, `setAccountPid` ignore la valeur vide, `resetAccountPass` proposé au MJ côté client, suppression admin d'un compte laissant le personnage orphelin.
- Outil Personnages : chaque opération réécrit `players` entier (pas d'opération métier serveur pour XP/stats — dette reconnue), `up()` et `_confirmDbSave` sans verrou de double clic, XP/gemmes calculés côté client, `CU.pid` de staff détourné vers le premier personnage, `delMJ/setMJ*` et puces de rôle dupliquées entre carte personnage et table Comptes.
- Modules "polish" (`admin-dashboard.js` partie 2, `database-admin-polish.js`, `staff-navigation.js`) : MutationObserver + `setInterval` (1 s, 1,5 s, 2,5 s, 5 s) qui réécrivent le DOM produit par `main.js`, wrapping de fonctions globales (`renderStats`, `renderDatabase`, `renderDashboardConsole`) — couches à supprimer au profit d'un rendu unique.
- Import/export partiel (sans événements, thèmes, logs, comptes restaurables), non transactionnel ; deux formats concurrents (`version:2 functional-export` UI vs `np-store-backup-v1` scripts).
- Diagnostics : trois modules qui se superposent (diagnostics, self-test, console dashboard) avec trois formats de rapport ; wrapping global de `fetch` ; conditions d'ouverture multiples (raccourci, URL, hash, localStorage) ; tests de "Collection thèmes"/"Theme Engine v257" liés à des versions de modules.
- Dérive "jeu en ligne" hors périmètre mais visible ici : entrée "RPG — expérimental" dans la nav et le drawer, KPI "Créatures les plus affrontées"/"Combats" dans le tableau de bord admin et `creatureKills` dans `public_stats` — à retirer avec le prototype.
