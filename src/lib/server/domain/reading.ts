import { assertFreshAccount } from '$lib/server/auth/context';
// Le ruban, la corne et le marque-page (06-contrats §B.4 ; 03-vision §5.2, §6.2, §9.8 ;
// 04-architecture §3.12 `reading_marks`).
//
// Modèle des cornes : une « page » est quelque chose d'écrit qui concerne le lecteur. Les lignes sont
// CALCULÉES par requête à chaque lecture (aucune table de notifications) ; tout ce qui est écrit
// après le signet (`reading_marks.last_read_at`) porte une corne. Identifiant de ligne stable =
// préfixe de type + identifiant de la source :
//   s:<historique>   conséquence tamponnée hors combat (character_history, actor_role mj|admin, motif)
//   c:<combat>       conséquences tamponnées d'un même combat, regroupées (« le combat du 26 septembre »)
//   f:<fait>         fait validé ; fr:<fait> fait réglé
//   e:<rendez-vous>  rendez-vous annoncé (« Prévenir les joueurs », events.announcedAt)
//   r:<combat>       récit où figure le personnage (combat clos, lisible par ses participants)
//   d:<déclaration>  déclaration reportée, rayée par un MJ, ou non reportée après 7 jours
//   j:<entrée>       note du journal (dernière version, non rayée)
// Ouvrir une page avance le signet jusqu'à elle (jamais en arrière) ; « Déplier toutes les cornes »
// le pose à maintenant. Les horodatages sont comparés à la milliseconde (précision du signet).
import { and, asc, desc, eq, gt, gte, inArray, isNotNull, isNull, ne, or, sql } from 'drizzle-orm';
import type { z } from 'zod';
import type { Db, Tx } from '$lib/server/db';
import {
	accounts,
	characterHistory,
	characters,
	combatParticipants,
	combats,
	declarations,
	eventParticipants,
	events,
	journalEntries,
	oaths,
	readingMarks,
	sceneParticipants,
	scenes,
	validatedFacts
} from '$lib/server/db/schema';
import { NpError } from '$lib/server/http';
import { requireActor, requireOwnCharacter, type Actor } from '$lib/server/permissions';
import { OATH_RANK_LABELS } from '$lib/game/oaths';
import { xpMax } from '$lib/game/progression';
import {
	LAST_PAGES_PER_PAGE,
	lastPagesInputSchema,
	openPageSchema,
	setBookmarkSchema,
	type BookmarkView,
	type LastPagesInput,
	type LastPagesView,
	type OpenPageInput,
	type OpenPageResult,
	type PageLineView,
	type SetBookmarkInput,
	type SheetSummary,
	type WaitingView
} from '$lib/schemas/reading';
import { channelFromTitle } from '$lib/schemas/scenes';
import { dateLongue, heureRonde, jour, jourSemaine, joursCalendaires } from '$lib/ui/dates';
import { announcedAtOf, listUpcomingEvents } from './events';

type Conn = Db | Tx;

function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
	const result = schema.safeParse(input);
	if (!result.success) {
		throw new NpError('INVALID', result.error.issues[0]?.message ?? 'Saisie invalide.', 400);
	}
	return result.data;
}

const DAY_MS = 86_400_000;

// ---------------------------------------------------------------------------
// Signet
// ---------------------------------------------------------------------------

interface Mark {
	lastReadAt: Date;
	bookmarkText: string;
	bookmarkUrl: string;
}

/** Signet du compte ; sans signet, tout ce qui suit la création du compte est à lire. */
async function loadMark(db: Conn, actor: Actor): Promise<Mark> {
	const [mark] = await db
		.select()
		.from(readingMarks)
		.where(eq(readingMarks.accountId, actor.accountId));
	if (mark) {
		return {
			lastReadAt: mark.lastReadAt,
			bookmarkText: mark.bookmarkText,
			bookmarkUrl: mark.bookmarkUrl
		};
	}
	const [account] = await db
		.select({ createdAt: accounts.createdAt })
		.from(accounts)
		.where(eq(accounts.id, actor.accountId));
	if (!account)
		throw NpError.unauthenticated('Le carnet s’est refermé. Rouvre-le en te reconnectant.');
	return { lastReadAt: account.createdAt, bookmarkText: '', bookmarkUrl: '' };
}

/** Avance le signet jusqu'à `at` (jamais en arrière). */
async function advanceMark(db: Conn, accountId: string, at: Date): Promise<Date> {
	const [row] = await db
		.insert(readingMarks)
		.values({ accountId, lastReadAt: at })
		.onConflictDoUpdate({
			target: readingMarks.accountId,
			set: {
				lastReadAt: sql`greatest(${readingMarks.lastReadAt}, excluded.last_read_at)`,
				updatedAt: new Date()
			}
		})
		.returning({ lastReadAt: readingMarks.lastReadAt });
	return row.lastReadAt;
}

// ---------------------------------------------------------------------------
// Lignes (pages)
// ---------------------------------------------------------------------------

interface Line {
	id: string;
	at: Date;
	text: string;
	href: string;
}

interface LineContext {
	characterId: string;
	accountId: string;
	now: Date;
}

/** Filtre d'une source : pages postérieures à `after`, ou une seule page par son identifiant. */
interface LineFilter {
	after: Date | null;
	sourceId: string | null;
}

type LineSource = (db: Conn, ctx: LineContext, filter: LineFilter) => Promise<Line[]>;

const FICHE_HREF = '/carnet/fiche#consequences';
const JOURNAL_HREF = '/carnet/journal';
const FACTS_HREF = '/carnet/journal#faits';

function staffWho(role: string | null | undefined): string {
	return role === 'admin' ? 'Un administrateur' : 'Un MJ';
}

const FACT_KIND_WORDS: Record<string, string> = {
	dette: 'dette',
	promesse: 'promesse',
	alliance: 'alliance',
	consequence: 'conséquence',
	observation: 'observation'
};

function factWords(kind: string, counterpart: string, text: string): string {
	const tail = counterpart.trim() || (text.length > 60 ? `${text.slice(0, 59)}…` : text);
	return `${FACT_KIND_WORDS[kind] ?? kind} ${tail}`.trim();
}

function declarationWords(resource: string, delta: number, word: string): string {
	const sign = delta < 0 ? '−' : '+';
	const label = `${sign}${Math.abs(delta)} ${resource.toUpperCase()}`;
	return word.trim() ? `${label} (${word.trim()})` : label;
}

/** « samedi 20 h » dans la semaine, « samedi 17 octobre, 20 h » au-delà. */
function when(date: Date, now: Date): string {
	const days = joursCalendaires(date, now) ?? 99;
	return days >= 0 && days <= 6
		? `${jourSemaine(date)} ${heureRonde(date)}`
		: `${jour(date)}, ${heureRonde(date)}`;
}

function countWords(n: number): string {
	return n === 0 ? 'personne d’inscrit encore' : `${n} inscrit${n > 1 ? 's' : ''}`;
}

/** Strictement après le signet, à la milliseconde. */
function isAfter(at: Date, after: Date | null): boolean {
	return after === null || at.getTime() > after.getTime();
}

const stampedConsequences: LineSource = async (db, ctx, { after, sourceId }) => {
	if (sourceId !== null && !/^\d+$/.test(sourceId)) return [];
	const rows = await db
		.select({
			id: characterHistory.id,
			ts: characterHistory.ts,
			text: characterHistory.text,
			role: characterHistory.actorRole
		})
		.from(characterHistory)
		.where(
			and(
				eq(characterHistory.characterId, ctx.characterId),
				inArray(characterHistory.actorRole, ['mj', 'admin']),
				ne(characterHistory.motif, ''),
				eq(characterHistory.dismissed, false),
				isNull(characterHistory.combatId),
				isNull(characterHistory.declarationId),
				after ? gt(characterHistory.ts, after) : undefined,
				sourceId !== null ? eq(characterHistory.id, Number(sourceId)) : undefined
			)
		);
	return rows.map((r) => ({
		id: `s:${r.id}`,
		at: r.ts,
		text: `${staffWho(r.role)} a tamponné ta fiche — ${r.text}`,
		href: FICHE_HREF
	}));
};

const stampedCombats: LineSource = async (db, ctx, { after, sourceId }) => {
	const rows = await db
		.select({
			combatId: characterHistory.combatId,
			ts: characterHistory.ts,
			role: characterHistory.actorRole
		})
		.from(characterHistory)
		.where(
			and(
				eq(characterHistory.characterId, ctx.characterId),
				inArray(characterHistory.actorRole, ['mj', 'admin']),
				ne(characterHistory.motif, ''),
				eq(characterHistory.dismissed, false),
				isNotNull(characterHistory.combatId),
				isNull(characterHistory.declarationId),
				after ? gt(characterHistory.ts, after) : undefined,
				sourceId !== null ? eq(characterHistory.combatId, sourceId) : undefined
			)
		);
	const byCombat = new Map<string, { at: Date; role: string | null }>();
	for (const r of rows) {
		if (!r.combatId) continue;
		const prev = byCombat.get(r.combatId);
		if (!prev || r.ts.getTime() > prev.at.getTime())
			byCombat.set(r.combatId, { at: r.ts, role: r.role });
	}
	return [...byCombat.entries()].map(([combatId, { at, role }]) => ({
		id: `c:${combatId}`,
		at,
		text: `${staffWho(role)} a tamponné le combat du ${dateLongue(at, ctx.now)}`,
		href: FICHE_HREF
	}));
};

const facts: LineSource = async (db, ctx, { after, sourceId }) => {
	const rows = await db
		.select({
			id: validatedFacts.id,
			kind: validatedFacts.kind,
			counterpart: validatedFacts.counterpart,
			text: validatedFacts.text,
			status: validatedFacts.status,
			validatedAt: validatedFacts.validatedAt,
			settledAt: validatedFacts.settledAt,
			validatorRole: accounts.role
		})
		.from(validatedFacts)
		.leftJoin(accounts, eq(accounts.id, validatedFacts.validatedBy))
		.where(
			and(
				eq(validatedFacts.characterId, ctx.characterId),
				inArray(validatedFacts.status, ['validated', 'settled', 'rejected']),
				isNotNull(validatedFacts.validatedAt),
				sourceId !== null ? eq(validatedFacts.id, sourceId) : undefined
			)
		);
	const lines: Line[] = [];
	for (const r of rows) {
		const words = factWords(r.kind, r.counterpart, r.text);
		if (r.validatedAt) {
			lines.push({
				id: `f:${r.id}`,
				at: r.validatedAt,
				text: `${staffWho(r.validatorRole)} ${r.status === 'rejected' ? 'a refusé' : 'a validé'} un fait : ${words}`,
				href: FACTS_HREF
			});
		}
		if (r.status === 'settled' && r.settledAt) {
			lines.push({
				id: `fr:${r.id}`,
				at: r.settledAt,
				text: `Un fait est réglé : ${words}`,
				href: FACTS_HREF
			});
		}
	}
	return lines.filter((l) => isAfter(l.at, after));
};

const announcedEvents: LineSource = async (db, ctx, { sourceId }) => {
	const rows = await db
		.select()
		.from(events)
		.where(
			and(
				eq(events.hidden, false),
				isNotNull(events.announcedAt),
				sourceId !== null ? eq(events.id, sourceId) : undefined
			)
		);
	if (rows.length === 0) return [];
	const counts = await db
		.select({ eventId: eventParticipants.eventId, n: sql<number>`count(*)::int` })
		.from(eventParticipants)
		.innerJoin(characters, eq(characters.id, eventParticipants.characterId))
		.where(
			and(
				isNull(characters.struckAt),
				inArray(
					eventParticipants.eventId,
					rows.map((r) => r.id)
				)
			)
		)
		.groupBy(eventParticipants.eventId);
	const countBy = new Map(counts.map((c) => [c.eventId, c.n]));
	const lines: Line[] = [];
	for (const r of rows) {
		const at = announcedAtOf(r);
		if (!at) continue;
		const n = countBy.get(r.id) ?? 0;
		const date = r.startsAt
			? `${when(r.startsAt, ctx.now)} : ${r.title}`
			: `à date à confirmer : ${r.title}`;
		lines.push({
			id: `e:${r.id}`,
			at,
			text: `Rendez-vous ${date} — ${countWords(n)}`,
			href: '/agenda'
		});
	}
	return lines;
};

const recits: LineSource = async (db, ctx, { after, sourceId }) => {
	const rows = await db
		.select({
			id: combats.id,
			name: combats.name,
			label: combats.label,
			closedAt: combats.closedAt
		})
		.from(combats)
		.innerJoin(combatParticipants, eq(combatParticipants.combatId, combats.id))
		.where(
			and(
				eq(combatParticipants.characterId, ctx.characterId),
				isNotNull(combats.closedAt),
				eq(combats.visibleToParticipants, true),
				after ? gt(combats.closedAt, after) : undefined,
				sourceId !== null ? eq(combats.id, sourceId) : undefined
			)
		);
	return rows
		.filter((r): r is typeof r & { closedAt: Date } => r.closedAt !== null)
		.map((r) => ({
			id: `r:${r.id}`,
			at: r.closedAt,
			text: `Le récit « ${r.name || r.label || 'Combat'} » est dans ton journal`,
			href: `/carnet/recits/${r.id}`
		}));
};

const declarationPages: LineSource = async (db, ctx, { after, sourceId }) => {
	const rows = await db
		.select({
			id: declarations.id,
			resource: declarations.resource,
			delta: declarations.delta,
			word: declarations.word,
			status: declarations.status,
			reportedBy: declarations.reportedBy,
			reportedAt: declarations.reportedAt,
			updatedAt: declarations.updatedAt,
			reporterRole: accounts.role
		})
		.from(declarations)
		.leftJoin(accounts, eq(accounts.id, declarations.reportedBy))
		.where(
			and(
				eq(declarations.characterId, ctx.characterId),
				or(
					eq(declarations.status, 'reportee'),
					eq(declarations.status, 'non_reportee'),
					and(
						eq(declarations.status, 'rayee'),
						isNotNull(declarations.reportedBy),
						ne(declarations.reportedBy, ctx.accountId)
					)
				),
				sourceId !== null ? eq(declarations.id, sourceId) : undefined
			)
		);
	const lines: Line[] = [];
	for (const r of rows) {
		const words = declarationWords(r.resource, r.delta, r.word);
		const at = r.status === 'non_reportee' ? r.updatedAt : (r.reportedAt ?? r.updatedAt);
		const text =
			r.status === 'reportee'
				? `${staffWho(r.reporterRole)} a reporté ta déclaration : ${words}`
				: r.status === 'rayee'
					? `${staffWho(r.reporterRole)} a rayé ta déclaration : ${words}`
					: `Ta déclaration ${words} n’a pas été reportée`;
		lines.push({ id: `d:${r.id}`, at, text, href: FICHE_HREF });
	}
	return lines.filter((l) => isAfter(l.at, after));
};

const journalNotes: LineSource = async (db, ctx, { after, sourceId }) => {
	const rows = await db
		.select({ id: journalEntries.id, ts: journalEntries.ts, inScene: journalEntries.inScene })
		.from(journalEntries)
		.where(
			and(
				eq(journalEntries.characterId, ctx.characterId),
				eq(journalEntries.struck, false),
				sql`not exists (select 1 from ${journalEntries} as later where later.replaces_id = ${journalEntries.id})`,
				after ? gt(journalEntries.ts, after) : undefined,
				sourceId !== null ? eq(journalEntries.id, sourceId) : undefined
			)
		);
	return rows.map((r) => ({
		id: `j:${r.id}`,
		at: r.ts,
		text: `Ta note du ${dateLongue(r.ts, ctx.now)}${r.inScene ? ' · notée en scène' : ''}`,
		href: JOURNAL_HREF
	}));
};

const SOURCES: Readonly<Record<string, LineSource>> = {
	s: stampedConsequences,
	c: stampedCombats,
	f: facts,
	fr: facts,
	e: announcedEvents,
	r: recits,
	d: declarationPages,
	j: journalNotes
};

function compareLines(a: Line, b: Line): number {
	return a.at.getTime() - b.at.getTime() || a.id.localeCompare(b.id);
}

/** Toutes les pages écrites après `after` (chronologiques, les plus anciennes d'abord). */
async function collectLines(db: Conn, ctx: LineContext, after: Date): Promise<Line[]> {
	const [active] = await db
		.select({ id: characters.id })
		.from(characters)
		.where(and(eq(characters.id, ctx.characterId), isNull(characters.struckAt)));
	if (!active) return [];
	const sources = [...new Set(Object.values(SOURCES))];
	const batches = await Promise.all(
		sources.map((source) => source(db, ctx, { after, sourceId: null }))
	);
	return batches
		.flat()
		.filter((line) => isAfter(line.at, after))
		.sort(compareLines);
}

/** Retrouve une page par son identifiant stable, lue ou non. */
async function findLine(db: Conn, ctx: LineContext, lineId: string): Promise<Line | null> {
	const [active] = await db
		.select({ id: characters.id })
		.from(characters)
		.where(and(eq(characters.id, ctx.characterId), isNull(characters.struckAt)));
	if (!active) return null;
	const sep = lineId.indexOf(':');
	if (sep <= 0) return null;
	const prefix = lineId.slice(0, sep);
	const sourceId = lineId.slice(sep + 1);
	const source = SOURCES[prefix];
	if (!source || sourceId === '') return null;
	const lines = await source(db, ctx, { after: null, sourceId });
	return lines.find((l) => l.id === lineId) ?? null;
}

function toView(line: Line, lastReadAt: Date): PageLineView {
	return {
		id: line.id,
		at: line.at.toISOString(),
		text: line.text,
		href: line.href,
		cornered: line.at.getTime() > lastReadAt.getTime()
	};
}

// ---------------------------------------------------------------------------
// Fiche résumée et « Ce qui attend ta main »
// ---------------------------------------------------------------------------

async function loadSheetSummary(db: Conn, characterId: string): Promise<SheetSummary | null> {
	const [row] = await db
		.select({ character: characters, oathName: oaths.name, rank: oaths.rank })
		.from(characters)
		.innerJoin(oaths, eq(oaths.id, characters.oathId))
		.where(and(eq(characters.id, characterId), isNull(characters.struckAt)));
	if (!row) return null;
	const c = row.character;
	const pending = await db
		.select({
			resource: declarations.resource,
			total: sql<number>`coalesce(sum(${declarations.delta}), 0)::int`
		})
		.from(declarations)
		.where(and(eq(declarations.characterId, characterId), eq(declarations.status, 'proposee')))
		.groupBy(declarations.resource);
	const pendingDeclared = { pv: 0, ep: 0, em: 0 };
	for (const p of pending) pendingDeclared[p.resource] = p.total;
	return {
		id: c.id,
		name: c.name,
		portraitUrl: c.avatarUrl,
		oathName: row.oathName,
		rank: row.rank,
		rankLabel: OATH_RANK_LABELS[row.rank] ?? row.rank,
		level: c.level,
		xp: c.xp,
		xpMax: xpMax(c.level),
		pv: { cur: c.pvCur, max: c.pvMax },
		ep: { cur: c.epCur, max: c.epMax },
		em: { cur: c.emCur, max: c.emMax },
		releveAt: c.updatedAt.toISOString(),
		pendingDeclared
	};
}

/** Scène ouverte d'abord, puis Table ouverte où le personnage figure, puis prochain rendez-vous où il vient (≤ 3). */
async function loadWaiting(db: Conn, characterId: string, now: Date): Promise<WaitingView[]> {
	const openScenes = await db
		.select({
			id: scenes.id,
			title: scenes.title,
			discordUrl: scenes.discordUrl,
			combatId: scenes.combatId,
			lastActivityAt: scenes.lastActivityAt
		})
		.from(scenes)
		.innerJoin(sceneParticipants, eq(sceneParticipants.sceneId, scenes.id))
		.where(and(eq(sceneParticipants.characterId, characterId), eq(scenes.status, 'ouverte')))
		.orderBy(desc(scenes.lastActivityAt), asc(scenes.id));
	const waiting: WaitingView[] = [];
	const tables = await db
		.select({
			id: combats.id,
			name: combats.name,
			label: combats.label,
			discordUrl: combats.discordUrl,
			updatedAt: combats.updatedAt
		})
		.from(combats)
		.innerJoin(combatParticipants, eq(combatParticipants.combatId, combats.id))
		.where(
			and(
				eq(combatParticipants.characterId, characterId),
				isNull(combats.closedAt),
				ne(combats.status, 'termine'),
				eq(combats.visibleToParticipants, true)
			)
		)
		.orderBy(desc(combats.updatedAt), asc(combats.id));
	const tableIds = new Set(tables.map((t) => t.id));
	const tableSalons = new Set(tables.map((t) => t.discordUrl).filter(Boolean));
	const salons = new Set<string>();
	for (const s of openScenes) {
		const salon = s.discordUrl || channelFromTitle(s.title) || s.id;
		if (
			(s.combatId && tableIds.has(s.combatId)) ||
			tableSalons.has(s.discordUrl) ||
			salons.has(salon)
		)
			continue;
		salons.add(salon);
		const channel = channelFromTitle(s.title) || null;
		waiting.push({
			kind: 'scene',
			id: s.id,
			text: `Scène ouverte · ${channel ?? s.title}`,
			href: '/carnet/scene',
			discordUrl: s.discordUrl || null,
			channel,
			at: s.lastActivityAt.toISOString()
		});
		break;
	}
	for (const t of tables.slice(0, 1)) {
		const name = t.name || t.label || 'sans titre';
		waiting.push({
			kind: 'table',
			id: t.id,
			text: `La Table est ouverte : ${name}`,
			href: `/carnet/table/${t.id}`,
			discordUrl: t.discordUrl || null,
			channel: channelFromTitle(name) || null,
			at: t.updatedAt.toISOString()
		});
	}

	const [next] = await db
		.select({
			id: events.id,
			title: events.title,
			startsAt: events.startsAt,
			discordUrl: events.discordUrl
		})
		.from(events)
		.innerJoin(eventParticipants, eq(eventParticipants.eventId, events.id))
		.where(
			and(
				eq(eventParticipants.characterId, characterId),
				eq(events.hidden, false),
				gte(events.startsAt, now)
			)
		)
		.orderBy(asc(events.startsAt), asc(events.id))
		.limit(1);
	if (next?.startsAt) {
		waiting.push({
			kind: 'event',
			id: next.id,
			text: `Rendez-vous ${when(next.startsAt, now)} — tu viens`,
			href: '/agenda',
			discordUrl: next.discordUrl || null,
			channel: null,
			at: next.startsAt.toISOString()
		});
	}
	return waiting.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Fonctions exportées
// ---------------------------------------------------------------------------

/**
 * « Dernières pages » (`/carnet`), dans l'ordre imposé par 03-vision §5.2 : état de la fiche,
 * marque-page, ce qui attend ta main, ce qui s'est écrit depuis (20 par page), ce qui vient (2).
 * Compte sans personnage : état `pending` (rien n'est écrit pour lui, l'agenda reste lisible) ;
 * liaison vers une fiche introuvable : état `unavailable`.
 */
export async function getLastPages(
	db: Db,
	actor: Actor | null,
	input: LastPagesInput = {}
): Promise<LastPagesView> {
	const present = requireActor(actor);
	const { page } = parse(lastPagesInputSchema, input ?? {});
	const now = new Date();
	const mark = await loadMark(db, present);
	const lastReadAt = mark.lastReadAt;
	const base = {
		pseudo: present.pseudo,
		lastReadAt: lastReadAt.toISOString(),
		daysAway: Math.max(0, Math.floor((now.getTime() - lastReadAt.getTime()) / DAY_MS)),
		bookmark:
			mark.bookmarkText || mark.bookmarkUrl
				? { text: mark.bookmarkText, url: mark.bookmarkUrl }
				: null,
		upcoming: await listUpcomingEvents(db, present, 2, now)
	};
	const empty = { waiting: [], since: [], sincePage: 1, sincePages: 1 };

	if (!present.characterId) {
		const staff = present.role !== 'joueur';
		const open = staff
			? await db
					.select()
					.from(combats)
					.where(and(isNull(combats.closedAt), ne(combats.status, 'termine')))
					.orderBy(desc(combats.updatedAt))
					.limit(3)
			: [];
		return {
			...base,
			...empty,
			state: staff ? 'staff' : 'pending',
			sheet: null,
			waiting: open.map((t) => ({
				kind: 'table' as const,
				id: t.id,
				text: `La Table est ouverte : ${t.name || t.label}`,
				href: `/table/combat/${t.id}`,
				discordUrl: t.discordUrl || null,
				channel: null,
				at: t.updatedAt.toISOString()
			}))
		};
	}
	const sheet = await loadSheetSummary(db, present.characterId);
	if (!sheet) return { state: 'unavailable', sheet: null, ...base, ...empty };

	const ctx: LineContext = { characterId: present.characterId, accountId: present.accountId, now };
	const lines = await collectLines(db, ctx, lastReadAt);
	const sincePages = Math.max(1, Math.ceil(lines.length / LAST_PAGES_PER_PAGE));
	const sincePage = Math.min(page ?? 1, sincePages);
	const since = lines
		.slice((sincePage - 1) * LAST_PAGES_PER_PAGE, sincePage * LAST_PAGES_PER_PAGE)
		.map((l) => toView(l, lastReadAt));

	return {
		state: 'linked',
		sheet,
		...base,
		waiting: await loadWaiting(db, present.characterId, now),
		since,
		sincePage,
		sincePages
	};
}

/** Des pages non lues existent-elles ? (corne du ruban et de l'onglet, sans nombre). */
export async function hasCorners(db: Db, actor: Actor | null): Promise<boolean> {
	const present = requireActor(actor);
	if (!present.characterId) return false;
	const mark = await loadMark(db, present);
	const ctx: LineContext = {
		characterId: present.characterId,
		accountId: present.accountId,
		now: new Date()
	};
	const lines = await collectLines(db, ctx, mark.lastReadAt);
	return lines.length > 0;
}

/** Ouvre une page : la corne se déplie et le signet avance jusqu'à elle (jamais en arrière). */
export async function openPage(
	db: Db,
	actor: Actor | null,
	input: OpenPageInput
): Promise<OpenPageResult> {
	const present = requireActor(actor);
	const { lineId } = parse(openPageSchema, input);
	return db.transaction(async (tx) => {
		await assertFreshAccount(tx, present);
		if (present.characterId && !(await loadSheetSummary(tx, present.characterId)))
			throw NpError.forbidden('Ta fiche est indisponible.');
		if (!present.characterId) throw NpError.notFound('Cette page n’est pas dans ton carnet.');
		const ctx: LineContext = {
			characterId: present.characterId,
			accountId: present.accountId,
			now: new Date()
		};
		const line = await findLine(tx, ctx, lineId);
		if (!line) throw NpError.notFound('Cette page n’est pas dans ton carnet.');
		const lastReadAt = await advanceMark(tx, present.accountId, line.at);
		return { href: line.href, lastReadAt: lastReadAt.toISOString() };
	});
}

/** « Déplier toutes les cornes » : le signet se pose à maintenant. */
export async function unfoldAll(db: Db, actor: Actor | null): Promise<{ lastReadAt: string }> {
	const present = requireActor(actor);
	return db.transaction(async (tx) => {
		await assertFreshAccount(tx, present);
		if (present.characterId && !(await loadSheetSummary(tx, present.characterId)))
			throw NpError.forbidden('Ta fiche est indisponible.');
		const lastReadAt = await advanceMark(tx, present.accountId, new Date());
		return { lastReadAt: lastReadAt.toISOString() };
	});
}

/**
 * Marque-page : une phrase (≤ 280) et un lien de message Discord facultatifs (`https://discord.com/…`
 * ou `https://discordapp.com/…`, sinon 400). Vides tous deux : le marque-page est retiré. Avec
 * `sceneId`, la phrase est aussi notée comme reprise de cette scène (participant seulement).
 */
export async function setBookmark(
	db: Db,
	actor: Actor | null,
	input: SetBookmarkInput
): Promise<BookmarkView> {
	const present = requireActor(actor);
	const data = parse(setBookmarkSchema, input ?? {});
	const now = new Date();
	return db.transaction(async (tx) => {
		await assertFreshAccount(tx, present);
		if (present.characterId && !(await loadSheetSummary(tx, present.characterId)))
			throw NpError.forbidden('Ta fiche est indisponible.');
		if (data.sceneId) {
			const { characterId } = requireOwnCharacter(present);
			const [participation] = await tx
				.select({ status: scenes.status })
				.from(sceneParticipants)
				.innerJoin(scenes, eq(scenes.id, sceneParticipants.sceneId))
				.where(
					and(
						eq(sceneParticipants.sceneId, data.sceneId),
						eq(sceneParticipants.characterId, characterId)
					)
				);
			if (!participation) throw NpError.notFound('Cette scène n’est pas la tienne.');
			await tx
				.update(sceneParticipants)
				.set({ bookmarkText: data.text, bookmarkUrl: data.url })
				.where(
					and(
						eq(sceneParticipants.sceneId, data.sceneId),
						eq(sceneParticipants.characterId, characterId)
					)
				);
			if (participation.status === 'ouverte') {
				await tx.update(scenes).set({ lastActivityAt: now }).where(eq(scenes.id, data.sceneId));
			}
		}
		const [mark] = await tx
			.insert(readingMarks)
			.values({
				accountId: present.accountId,
				bookmarkText: data.text,
				bookmarkUrl: data.url,
				lastReadAt: await defaultLastRead(tx, present)
			})
			.onConflictDoUpdate({
				target: readingMarks.accountId,
				set: { bookmarkText: data.text, bookmarkUrl: data.url, updatedAt: now }
			})
			.returning();
		return {
			text: mark.bookmarkText,
			url: mark.bookmarkUrl,
			updatedAt: mark.updatedAt.toISOString()
		};
	});
}

/** Signet initial d'un compte qui n'en a pas encore (création du compte). */
async function defaultLastRead(db: Conn, actor: Actor): Promise<Date> {
	return (await loadMark(db, actor)).lastReadAt;
}
