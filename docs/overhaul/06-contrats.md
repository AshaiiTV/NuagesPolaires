# Nuages Polaires — contrats entre le serveur et l'interface

Décisions du lead (Claude), 1er octobre 2026. Ce document fixe **les noms et les formes** que partagent les domaines serveur (`src/lib/server/domain/*`) et les routes (`src/routes/*`), pour que les deux se construisent en parallèle. Normatif, avec `03-vision.md` (écrans, lexique) et `04-architecture.md` (données, sécurité). Les détails de règles viennent des audits.

## A. Conventions communes

- **Acteur.** `type Actor = { accountId: string; role: Role; characterId: string | null; pseudo: string }`, construit par `hooks.server.ts` et disponible en `event.locals.actor` (`null` pour un visiteur). `event.locals.db` est la base de la requête ; `event.locals.account`, `event.locals.character` les enregistrements chargés.
- **Navigation et thème.** `hooks.server.ts` remplit aussi `event.locals.compteNav` (`CompteNav` de `src/lib/ui/navigation.ts` : `{ pseudo, role, relie, portrait, cornes, tableOuverte }`, `null` pour un visiteur), `event.locals.theme` (`{ id, ton }` du thème choisi) et `event.locals.discordInvite` ; le `load` du layout racine les expose en `data.compte`, `data.theme`, `data.discord`. Le hook remplace `data-theme="dark" data-ton="sombre"` de `app.html` par le thème du compte (`transformPageChunk`). Les pages s'enveloppent dans `Enveloppe` (`src/lib/ui/Enveloppe.svelte`) : carnet pour un compte, masthead public pour un visiteur.
- **Signature.** Toute fonction de domaine : `(db: Db, actor: Actor | null, input) => Promise<…>`. Elle vérifie le droit (`assertCan`), valide l'entrée (Zod, `src/lib/schemas/*`), applique `expectedRevision` (428 / 409) et lève `NpError(code, message, status)`. Elle renvoie des **vues** déjà filtrées pour le rôle : aucune route ne filtre.
- **Vues.** Types `…View` exportés depuis `src/lib/schemas/<domaine>.ts` (à côté des schémas Zod d'entrée ; types purs, importables côté client ; `src/lib/schemas/index.ts` ré-exporte tout). Dates en ISO 8601 (`string`) ; l'interface formate en `fr-FR`, fuseau `Europe/Paris` (`src/lib/ui/dates.ts` : `jour()`, `heure()`, `dateLongue()`, `relatif()`).
- **Routes.** Lectures dans `+page.server.ts` (`load`), mutations en **form actions** nommées, avec `use:enhance={ecriture.enhance()}` (`src/lib/ui/ecriture.svelte.ts`). Une action renvoie `fail(status, { code, message })` en attrapant `NpError` via l'assistant `actionGuard` de `src/lib/server/actions.ts` : `export const actions = { noter: action(async (event, data) => …) }` où `action()` lit le `FormData`, convertit `expectedRevision`, attrape les `NpError` et renvoie `fail`.
- **Garde d'accès.** `src/lib/server/guards.ts` : `requireAccount(event)`, `requireCharacter(event)` (redirige vers `/carnet` avec l'état « en attente de liaison »), `requireCapability(event, capability)` (404 si non autorisé : ce qui n'est pas autorisé n'est pas rendu), `redirectIfConnected(event)`.
- **Erreurs métier et phrases officielles** : `VERSION_REQUIRED` 428, `VERSION_CONFLICT` 409 (« Quelqu'un a écrit sur cette page entre-temps. Relis avant d'écrire par-dessus. »), `UNAUTHENTICATED` 401 (« Le carnet s'est refermé. Rouvre-le en te reconnectant. »), `FORBIDDEN` 403, `NOT_FOUND` 404, `ITEM_UNAVAILABLE`, `EVENT_CLOSED`, `EVENT_FULL` (« La dernière place vient d'être prise. »), `EVENT_UNAVAILABLE`, `RATE_LIMITED` 429, `LAST_ADMIN`, `PSEUDO_TAKEN`, `INVALID` 400.

## B. Domaines serveur — fonctions exportées

### B.1 `accounts.ts` et `auth/*` (paquet Auth)
`register({ pseudo, password, acceptRules: true })` → `{ sessionToken }` · `login({ pseudo, password, ip, userAgent })` → `{ sessionToken, scope }` · `logout(sessionToken)` · `readSession(db, token)` → `{ session, account, character } | null` · `changeOwnPassword(actor, { current, next })` · `completeForcedReset(resetActor, { next })` · `deleteOwnAccount(actor, { password })`.
Admin : `listAccounts(actor)` → `AccountView[]` (`id, pseudo, role, characterId, characterName, lastSeenAt, createdAt, forcePasswordReset, resetExpiresAt, discordLinked, revision`) · `listPending(actor)` → `{ pendingAccounts: AccountView[]; unlinkedCharacters: { id, name, oathName }[]; openResets: AccountView[] }` · `linkCharacter(actor, { accountId, characterId, expectedRevision })` · `unlinkCharacter` · `setRole(actor, { accountId, role, expectedRevision })` · `adminResetPassword(actor, { accountId })` → `{ temporaryPassword, expiresAt }` (affiché une fois) · `adminSetPassword` · `strikeAccount(actor, { accountId, typedPseudo })`.
Thèmes : `listThemes(actor)` → `ThemeView[]` (`id, name, description, tone, tokens, owned, active, blocked, visible, isBuiltin, category`) · `selectTheme(actor, { themeId })` · admin : `grantTheme`, `grantThemeToAll`, `revokeTheme`, `blockTheme`, `unblockTheme`, `setThemeVisibility`, `setThemeAutoGrant`, `createTheme(actor, { id, name, description, tokens })` (refus si contraste < 4,5:1 via `validateTheme` de `src/lib/ui/themes.ts`).
Discord : `discordAuthUrl(actor)`, `discordCallback(actor, { code, state })`, `discordLogin({ code, state })` ; inactifs si `DISCORD_CLIENT_ID` vide (`isDiscordEnabled()`).

### B.2 `characters.ts`
`getOwnSheet(actor)` → `SheetView | null` · `getSheet(actor, characterId)` (MJ, admin) · `listCharacters(actor, { search?, oathId?, linked? })` → `CharacterRowView[]`.
`SheetView` : `{ id, name, portraitUrl, oath: { id, name, rank, rankLabel, weapon, lineage, category }, branch: string | null, level, xp, xpMax, pv: { cur, max }, ep: { cur, max }, em: { cur, max }, pendingDeclared: { pv, ep, em }, statuses: { id, label, color, turns }[], gems: { kind, label, color, qty }[], equipment: { helmet, chest, legs }, items: ItemView[], tiers: { reached: TierView[]; next: TierView[] }, releveAt: string, linkedPseudo: string | null, revision }` · `ItemView = { id, name, category, qty, description }` · `TierView = { level, name, cost, description, stage }`.
Mutations staff (toutes avec `motif` obligatoire et `expectedRevision`, toutes produisent une **conséquence tamponnée** et une corne chez le joueur) : `createCharacter`, `correctResource(actor, { characterId, resource, newValue, motif })`, `grantCombatXp(actor, { characterId, beastLevel, participationPct, motif })` (`ceil(niveau × 10 × %)`), `fuseGems(actor, { characterId, kind, qty, motif })`, `addItem`, `removeItem`, `setStatus`, `removeStatus`, `setEquipment`. Admin : `updateIdentity` (nom, Serment, branche, arme, niveau ±), `strikeCharacter(actor, { characterId, typedName })`.
Joueur : `setOwnPortrait(actor, { url, expectedRevision })`, `consumeOwnItem(actor, { itemId, note?, expectedRevision })`.
Conséquences : `listConsequences(actor, { characterId, filter?: 'xp'|'gemme'|'combat'|'item'|'status'|'serment', page })` → `{ rows: ConsequenceView[]; page; pages }` · `ConsequenceView = { id, at, kind, text, field, oldValue, newValue, stamp: { role, name } | null, signature: 'toi' | 'regles' | null, motif, struck, combatId }`.
PDF : `sheetForExport(actor, characterId?)` → données complètes de la fiche.

### B.3 `journal.ts`, `facts.ts`, `declarations.ts`
Journal : `listEntries(actor, { characterId?, page })` → `{ rows: JournalEntryView[]; page; pages; count }` (`id, at, text, inScene, struck, previous: JournalEntryView | null`) · `writeEntry(actor, { text, inScene? })` · `amendEntry(actor, { entryId, text })` (l'ancienne reste en rature) · `strikeEntry(actor, { entryId })`. Lecture : propriétaire, MJ, admin.
Faits validés : `listFacts(actor, { characterId? })` → `FactView[]` (`id, kind, counterpart, text, status, witness, proposedAt, stamp, settledAt, revision`) · `proposeFact(actor, { kind, counterpart, text })` · MJ/admin : `validateFact`, `rejectFact`, `settleFact` (avec `motif`).
Déclarations : `declare(actor, { resource, delta, word, sceneId?, combatId? })` → `DeclarationView` (`id, text` = « Kael déclare −8 EP (Esquive). », `resource, delta, word, status, at, cancelUntil`) · `cancelDeclaration(actor, { id })` (≤ 10 s) · `strikeOwnDeclaration(actor, { id })` · `listOwnPending(actor)` · MJ/admin : `listPendingFor(actor, characterId)`, `reportDeclaration(actor, { id, motif, expectedRevision })` (applique le delta, conséquence tamponnée), `strikeDeclaration(actor, { id, motif })`. Entretien : `expireDeclarations(db)` (7 jours → `non_reportee`).

### B.4 `reading.ts` (ruban, cornes, marque-page) et `scenes.ts`
`getLastPages(actor)` → `LastPagesView` : `{ state: 'linked' | 'pending' | 'unavailable', pseudo, sheet: SheetSummary | null, lastReadAt, daysAway, bookmark: { text, url } | null, waiting: WaitingView[] (≤ 3 : scène ouverte d'abord, Table ouverte, rendez-vous où je viens), since: PageLineView[] (cornées, chronologiques, 20 par page), upcoming: EventRowView[] (2) }` · `PageLineView = { id, at, text, href, cornered }` · `hasCorners(actor)` → `boolean` (pour le ruban et l'onglet) · `openPage(actor, { lineId })` (déplie une corne) · `unfoldAll(actor)` · `setBookmark(actor, { text?, url? })`.
Scènes : `openScene(actor, { title, discordUrl, characterIds? })` · `listOpenScenes(actor)` → `SceneView[]` (`id, title, discordUrl, channel, summary, openQuestion, participants, pins, bookmark, openedAt, revision`) · `getSceneContext(actor)` → la scène courante (ou Table) pour le feuillet · `setSummary`, `setOpenQuestion`, `pin`, `unpin`, `closeScene`, entretien `autoCloseScenes(db)` (14 jours).

### B.5 `events.ts` (Agenda)
`listAgenda(actor | null, { pastPage? })` → `{ upcoming: EventRowView[]; past: EventRowView[]; pastPages }` · `EventRowView = { id, title, type, typeLabel, typeColor, description, startsAt, capacity, count, participants: { name, me }[], registered: boolean, canRegister: boolean, closedReason: 'undated'|'past'|'full'|'unlinked'|null, discordUrl, hidden, organizer, recitId, revision }` · `setParticipation(actor, { eventId, participating, expectedRevision })`.
Staff : `createEvent`, `updateEvent`, `setEventHidden`, `strikeEvent`, `notifyEvent(actor, { eventId })` (MJ/admin : dépose une corne chez chaque compte relié).

### B.6 `combats.ts` (La Table), `spawn.ts`, `publications.ts`
`listTables(actor, { status? })` → `TableRowView[]` · `createTable(actor, { name, discordUrl?, characterIds, beasts: { beastId, qty }[] })` · `getTable(actor, id)` → `{ state: CombatState, row: TableRowView, pendingDeclarations: DeclarationView[], revision }` (MJ/admin) · `saveTable(actor, { id, state, expectedRevision, reason: 'manual'|'round'|'auto' })` · `setShowEnemyNumbers`, `setVisibleToParticipants`.
Joueur : `getPlayerTable(actor, id)` → `{ projection: PlayerProjection, name, discordUrl, revision, at }` (participant uniquement, sinon `NOT_FOUND` « Cette Table n'est pas la tienne. ») · endpoint `GET /api/table/[id]/etat` (ETag = revision, 304).
Clôture : `closeTable(actor, { id, expectedRevision, consequences: { characterId, pv, ep, em, statuses, xp, drops, motif }[], recit: { title, visibleToParticipants }, extract?: { text, onHome, beastIds } })` — une transaction.
Récits : `listRecits(actor, { page, search? })` → `RecitRowView[]` (ceux où mon personnage figure ; tous pour MJ/admin) · `getRecit(actor, id)` → `RecitView` (journal du combat filtré, sans notes du MJ) · `recitAsText(actor, id)`.
Apparitions : `drawSpawn(actor, { zoneId, count? })` → `SpawnRunView` · `spawnHistory(actor)` · `spawnTotals(actor)` · `spawnToTable(actor, { runId, characterIds })`.
Publications : `listHomeLeaves(db)` (public) → `HomeLeaf[]` (≤ 3 : dernier extrait publié, dernier rendez-vous passé visible, prochain rendez-vous visible) · `publishExtract(actor, …)` · `strikePublication(actor, { id, motif })`.

### B.7 `beasts.ts`, `zones.ts`, `oaths.ts`, `observations.ts`
`listBeasts(actor | null, { search?, behavior?, zoneId?, sort? })` → `BeastRowView[]` · `getBeast(actor | null, id)` → `BeastView` (`id, name, subtitle, behavior, behaviorColor, level, pv, ep, strike, skill, drops, gem, description, imageUrl, quote, zones, observations: ObservationView[], reserved: { hidden, archived, adminNote, usage } | null` — `reserved` seulement pour MJ, designer, admin : c'est le calque) · atelier (designer, admin) : `createBeast`, `updateBeast`, `duplicateBeast`, `setBeastHidden`, `archiveBeast`, `restoreBeast`.
`listZones(actor | null)`, `createZone`, `renameZone`.
`listOaths(actor | null, { rank?, category? })` → `OathRowView[]` · `getOath(actor | null, idOrSlug)` → `OathView` (`id, name, weapon, rank, rankLabel, lineage, category, lore, growth, baseDamage, damageType, branches: { label, style, physical, flavor, tiers: TierView[] }[], reserved`) · atelier (admin) : `updateOath`, `setOathHidden`, `createOath`.
Observations : `listObservations(db, beastId)` (validées) · `proposeObservation(actor, { beastId, text })` · `listPendingObservations(actor)` · `validateObservation`, `rejectObservation`.

### B.8 `staff-log.ts`, `audit.ts`, `settings.ts`, `admin.ts`
`listAudit(actor, { actor?, action?, from?, to?, page })` → `{ rows: AuditRowView[]; page; pages }` · `auditAsText(actor, filters)` · `getPublicSettings(db)` → `{ discordInvite: string | null }` · `setSetting(actor, { key, value })` · `exportData(actor)` → JSON partiel (mention « Ce n'est pas une sauvegarde complète du site. ») · `migrationStatus(actor)` · `diagnostics(actor)` → `{ dbReachable, env: { … booléens }, version }`.

## C. Arbre des routes

Groupes : `(public)` (masthead + colophon, accessible à tous), `(carnet)` (enveloppe `Cahier`, compte requis), `(serre)` (enveloppe `Cahier` en régime serré, staff), `(scene)` (régime scène).

| Route | Groupe | `load` | Actions |
|---|---|---|---|
| `/` | racine | `listHomeLeaves`, `listOaths` (publics), `getPublicSettings` | — |
| `/univers` | public | sommaire des six pages | — |
| `/univers/synopsis`, `/univers/systeme`, `/univers/reglement`, `/univers/premiers-pas`, `/univers/site-et-donnees` | public | `getContent(slug)` (`src/lib/content`) ; premiers pas reçoit l'état du compte | — |
| `/univers/serments`, `/univers/serments/[nom]` | public | `listOaths`, `getOath` (+ palier du joueur relié : « tu es ici ») | — |
| `/univers/bestiaire`, `/univers/bestiaire/[id]` | public | `listBeasts`, `getBeast`, `listZones` | `proposer` (observation, compte requis) |
| `/entrer` | public | `redirectIfConnected` | `entrer` (login), `discord` |
| `/entrer/inscription` | public | règlement (`getContent('reglement')`) puis formulaire | `inscrire` |
| `/entrer/nouveau-mot-de-passe` | public | session `reset` requise | `terminer` |
| `/carnet` | carnet | `getLastPages` | `ouvrir` (corne), `deplier`, `marquePage`, `participer` |
| `/carnet/fiche` | carnet | `getOwnSheet`, `listConsequences`, `listOwnPending` | `portrait`, `consommer`, `declarer`, `annulerDeclaration` |
| `/carnet/fiche/pdf` | carnet | `sheetForExport` → PDF (pdf-lib ou HTML imprimable `@media print`) | — |
| `/carnet/journal` | carnet | `listEntries`, `listFacts`, `listRecits` | `noter`, `corriger`, `rayer`, `proposerFait` |
| `/carnet/recits/[id]` | carnet | `getRecit` | — (`?format=txt` → `recitAsText`) |
| `/carnet/scene` | scene | `getSceneContext`, `getOwnSheet`, `listOwnPending` | `declarer`, `annuler`, `consommer`, `noter`, `marquePage`, `ouvrirScene` |
| `/agenda` | carnet | `listAgenda` | `participer` |
| `/agenda/organiser`, `/agenda/organiser/[id]` | serre | `listAgenda` (staff) | `creer`, `modifier`, `masquer`, `rayer`, `prevenir` |
| `/table` | serre | `listTables` | `ouvrir` |
| `/table/combat/[id]` | serre (MJ) ou scene (joueur) | `getTable` ou `getPlayerTable` selon le rôle | `sauver`, `terminer`, `montrerChiffres`, `reporter` |
| `/table/apparitions` | serre | `spawnHistory`, `spawnTotals`, `listZones` | `tirer`, `envoyer` |
| `/table/archives` | serre | `listRecits` (tous) | `publier`, `rayerPublication` |
| `/table/personnages`, `/table/personnages/[id]` | serre | `listCharacters`, `getSheet`, `listConsequences`, `listPendingFor`, `listFacts` | `creer`, `corriger`, `xp`, `gemmes`, `objet`, `statut`, `reporter`, `rayerDeclaration`, `fait`, `identite`, `rayerPersonnage` |
| `/atelier/bestiaire`, `/atelier/bestiaire/[id]` | serre | `listBeasts` (staff), `getBeast`, `listPendingObservations` | `creer`, `modifier`, `dupliquer`, `masquer`, `archiver`, `valider`, `rejeter`, `zone` |
| `/atelier/serments`, `/atelier/serments/[id]` | serre | `listOaths`, `getOath` | `modifier`, `masquer`, `creer` |
| `/registre` | serre | `listPending` | `lier` |
| `/registre/comptes` | serre | `listAccounts` | `lier`, `delier`, `role`, `reinitialiser`, `rayer` |
| `/registre/themes` | serre | `listThemes` (admin) | `donner`, `donnerATous`, `retirer`, `visibilite`, `creer` |
| `/registre/journal` | serre | `listAudit` | — (`?format=txt`) |
| `/registre/donnees` | serre | `migrationStatus`, `diagnostics`, `getPublicSettings` | `exporter`, `reglage` |
| `/compte`, `/compte/collection` | carnet | compte, `listThemes` | `motDePasse`, `theme`, `discord`, `quitter`, `fermer` |
| `/api/table/[id]/etat` | — | `getPlayerTable` (ETag) | — |

## D. Jeu de composants (`src/lib/ui/`) — à utiliser tel quel, ne pas dupliquer

`Cahier` (enveloppe : tranche, bande basse, ruban) · `Page` (marge + corps, `grain`, `reglure`) · `Chapitre` (numéro, titre, repliable) · `LigneEtat` · `Corne` · `Rature` · `Tampon` · `Consequence` · `Feuillet` · `Bouton` (`ruban`, `trait`, `texte`, `tampon`, `rouille`) · `Champ` · `Encre` + `creerEcriture()` · `NoteDeMarge` · `Losange` · `Vide` · `Portrait` · `Boussole` · `Masthead` · `Colophon`. Planche : `/kit`.

Règles : les composants ne lisent que les tokens de `styles/tokens.css` ; aucune couleur en dur hors accueil ; le laiton (`--tampon`, `Bouton variante="tampon"`, `Tampon`) est réservé aux décisions des MJ et des administrateurs ; un état vide est un `Vide` avec une phrase de `03-vision.md` §8 ; aucun texte sous 12 px ; cibles ≥ 44 px ; sélecteurs de régime écrits `:global(html[data-regime='serre']) .x`. Un nouveau composant partagé se crée dans `src/lib/ui/` avec un commentaire d'en-tête disant à quoi il sert dans le carnet ; un composant propre à une page reste dans le dossier de la route.
