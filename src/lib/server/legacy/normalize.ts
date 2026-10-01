// Transformateurs purs : audit 05 §3 et §15 ; 04-architecture §10.3/5/12/15.
import { z } from 'zod';
import * as s from '../db/schema';
import { isRole } from '../permissions';
import { BUILTIN_OATHS, findOath, mergeOathCatalogue, oathSlug } from '../../game/oaths';
import type { OathDefinition } from '../../game/types';
import { normalizeLegacyProgression, clampResources } from '../../game/progression';
import { fromLegacyArchive } from '../../game/combat/legacy';
import { THEME_ID_ALIASES, THEME_SEED } from '../db/referentials';
import { checksum } from './snapshot';

export type LegacyRecord = Record<string, unknown>;
const objectSchema = z.record(z.string(), z.unknown());
export function object(value: unknown): LegacyRecord {
	const result = objectSchema.safeParse(value);
	return result.success ? result.data : {};
}
export function list(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}
export function text(value: unknown, fallback = ''): string {
	return typeof value === 'string' ? value : fallback;
}
export function integer(value: unknown, fallback = 0, min = 0): number {
	const n = value === null || value === '' ? NaN : Number(value);
	return Number.isFinite(n) ? Math.max(min, Math.min(2147483647, Math.floor(n))) : fallback;
}
export function strings(value: unknown): string[] {
	return [
		...new Set(
			list(value)
				.filter((v): v is string => typeof v === 'string' && !!v.trim())
				.map((v) => v.trim())
		)
	];
}
export function date(value: unknown, fallback: Date | null = null): Date | null {
	if (value === null || value === undefined || value === '' || value === 0) return fallback;
	const d = new Date(typeof value === 'number' ? value : text(value));
	return Number.isFinite(d.getTime()) ? d : fallback;
}
export const EPOCH = new Date(0);
export function stableId(prefix: string, value: unknown): string {
	return `${prefix}_${checksum(value).slice(0, 24)}`;
}
export function sourceId(raw: LegacyRecord, prefix: string, _identity: unknown): string {
	return text(raw.id).trim() || stableId(prefix, raw);
}
function extra(raw: LegacyRecord, known: string[]): LegacyRecord {
	return {
		...object(raw.extra),
		...Object.fromEntries(Object.entries(raw).filter(([k]) => k !== 'extra' && !known.includes(k)))
	};
}

/** Décodage UNE fois : &amp;lt; reste &lt; ; aucun passage HTML (audit 05 §3.2, §9). */
export function decodeEntities(value: string): string {
	const names: Record<string, string> = {
		amp: '&',
		lt: '<',
		gt: '>',
		quot: '"',
		apos: "'",
		nbsp: '\u00a0',
		eacute: 'é',
		Eacute: 'É',
		egrave: 'è',
		agrave: 'à',
		ecirc: 'ê',
		ocirc: 'ô',
		ugrave: 'ù',
		ccedil: 'ç',
		rsquo: '’',
		lsquo: '‘',
		ldquo: '“',
		rdquo: '”',
		ndash: '–',
		mdash: '—',
		hellip: '…'
	};
	return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, key: string) => {
		if (!key.startsWith('#')) return names[key] ?? match;
		const n = key[1].toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : Number(key.slice(1));
		return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff)
			? String.fromCodePoint(n)
			: match;
	});
}
export function normalizeThemeId(value: unknown): string {
	const key = text(value)
		.toLowerCase()
		.replace(/^theme[-_]?/, '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9_-]/g, '');
	return THEME_ID_ALIASES[key] ?? key;
}
export function normalizeAccount(value: unknown, identity: unknown = value) {
	const r = object(value);
	const row = {
		id: sourceId(r, 'a', identity),
		pseudo: text(r.pseudo, 'Compte hérité').slice(0, 32),
		passwordHash: text(r.pass),
		role: isRole(r.role) ? r.role : ('joueur' as const),
		characterId: null,
		sessionVersion: integer(r.sessionVersion),
		forcePasswordReset: r.forcePasswordReset === true,
		resetExpiresAt: date(r.resetExpiresAt),
		selectedTheme: normalizeThemeId(r.selectedTheme) || 'dark',
		discordId: text(r.discordId) || null,
		discordUsername: text(r.discordUsername) || null,
		lastSeenAt: date(r.lastSeen),
		createdAt: date(r.createdAt, EPOCH)!,
		updatedAt: date(r.updatedAt, EPOCH)!,
		extra: extra(r, [
			'id',
			'pseudo',
			'pass',
			'role',
			'pid',
			'sessionVersion',
			'forcePasswordReset',
			'resetExpiresAt',
			'selectedTheme',
			'discordId',
			'discordUsername',
			'lastSeen',
			'createdAt',
			'updatedAt',
			'unlockedThemes',
			'blockedThemes'
		])
	} satisfies typeof s.accounts.$inferInsert;
	return {
		row,
		characterId: text(r.pid) || null,
		unlocked: strings(r.unlockedThemes).map(normalizeThemeId),
		blocked: strings(r.blockedThemes).map(normalizeThemeId)
	};
}
export function normalizeOaths(value: unknown): OathDefinition[] {
	const customs = Object.fromEntries(Object.entries(object(value)).map(([k, v]) => [k, object(v)]));
	return mergeOathCatalogue(BUILTIN_OATHS, customs);
}
export function unknownOath(name: string): OathDefinition {
	return {
		id: oathSlug(name) || stableId('o', name),
		name,
		weapon: '',
		growth: { pvN: 0, epN: 0, emN: 0 },
		baseDamage: 0,
		damageType: '',
		rank: 'other',
		category: 'melee',
		hidden: true,
		evolvesFrom: null,
		icon: '✦',
		lore: '',
		branches: { bA: null, bB: null },
		isBuiltin: false
	};
}
export function normalizeOath(o: OathDefinition, catalogue: readonly OathDefinition[]) {
	return {
		id: o.id,
		name: o.name,
		weapon: o.weapon,
		pvGrowth: integer(o.growth.pvN),
		epGrowth: integer(o.growth.epN),
		emGrowth: integer(o.growth.emN),
		baseDamage: integer(o.baseDamage),
		damageType: o.damageType,
		rank: o.rank,
		hidden: o.hidden,
		evolvesFrom:
			findOath(o.evolvesFrom, catalogue)?.id === o.id
				? null
				: (findOath(o.evolvesFrom, catalogue)?.id ?? null),
		icon: o.icon,
		category: o.category,
		isBuiltin: o.isBuiltin,
		lore: o.lore,
		branches: o.branches
	} satisfies typeof s.oaths.$inferInsert;
}
export function normalizeItem(value: unknown, characterId: string, position: number) {
	const r = object(value),
		legacyId = text(r.id) || null;
	return {
		id: stableId('i', [characterId, legacyId ?? position]),
		characterId,
		legacyId,
		name: text(r.name, 'Objet hérité'),
		category: text(r.category, 'Divers'),
		qty: integer(r.qty, 1),
		description: text(r.desc ?? r.description),
		position,
		extra: extra(r, ['id', 'name', 'category', 'qty', 'desc', 'description'])
	} satisfies typeof s.characterItems.$inferInsert;
}
export function normalizeHistory(
	value: unknown,
	characterId: string,
	position: number,
	dismissed: unknown[] = []
) {
	const r = object(value);
	return {
		id:
			parseInt(checksum(['history', characterId, text(r.id) || position]).slice(0, 12), 16) +
			1_000_000_000_000,
		characterId,
		ts: date(r.ts, EPOCH)!,
		type: s.historyTypeEnum.enumValues.find((v) => v === r.type) ?? 'add',
		text: decodeEntities(text(r.text, r.type === 'combat' ? 'Combat sans titre' : '')),
		actorName: decodeEntities(text(r.by)),
		dismissed: dismissed.some((ts) => String(ts) === String(r.ts)),
		// L'archive est résolue après l'import des combats ; le lien brut reste dans extra du personnage.
		combatId: null
	} satisfies typeof s.characterHistory.$inferInsert;
}
export function normalizeCharacter(
	value: unknown,
	catalogue: readonly OathDefinition[],
	identity: unknown = value
) {
	const r = object(value),
		oathName = text(r.classe || r.class, 'Mizu'),
		oath = findOath(oathName, catalogue) ?? unknownOath(oathName);
	const p = normalizeLegacyProgression(
		r,
		(name) => findOath(name, catalogue)?.growth ?? { pvN: 0, epN: 0, emN: 0 }
	);
	const resources = clampResources(p),
		id = sourceId(r, 'p', identity),
		eq = object(r.equipment);
	const row = {
		id,
		name: text(r.name, 'Personnage hérité').slice(0, 80),
		oathId: oath.id,
		branch: text(r.branch, 'Aucune'),
		level: resources.level,
		xp: resources.xp,
		pvCur: resources.pvCur,
		pvMax: resources.pvMax,
		epCur: resources.epCur,
		epMax: Math.max(1, resources.epMax),
		emCur: resources.emCur,
		emMax: Math.max(1, resources.emMax),
		progressionVersion: integer(p.progressionVersion, 1, 1),
		weapon: text(r.arme ?? r.weapon, oath.weapon),
		avatarUrl: text(r.avatar),
		journal: text(r.journal),
		equipment: {
			helmet: text(eq.helmet) || null,
			chest: text(eq.chest) || null,
			legs: text(eq.legs) || null
		},
		statuses: list(r.statuts)
			.filter((v) => v !== null)
			.map((v) => {
				const st = object(v);
				return {
					id: text(st.id),
					desc: text(st.desc),
					posedBy: text(st.posedBy),
					posedAt: date(st.posedAt)?.getTime() ?? 0
				};
			}),
		extra: {
			...extra(r, [
				'id',
				'name',
				'classe',
				'class',
				'branch',
				'level',
				'xp',
				'xpMax',
				'sLevel',
				'sXp',
				'sXpMax',
				'pvCur',
				'pvMax',
				'epCur',
				'epMax',
				'emCur',
				'emMax',
				'progressionVersion',
				'arme',
				'weapon',
				'avatar',
				'journal',
				'equipment',
				'statuts',
				'inventory',
				'history',
				'notifDeleted',
				'unlockedThemes',
				'blockedThemes'
			]),
			legacyHistory: list(r.history),
			legacyInventory: list(r.inventory),
			legacyThemeGrants: { unlocked: strings(r.unlockedThemes), blocked: strings(r.blockedThemes) }
		}
	} satisfies typeof s.characters.$inferInsert;
	return {
		row,
		oath,
		items: list(r.inventory)
			.filter((v) => v !== null)
			.map((v, i) => normalizeItem(v, id, i)),
		history: list(r.history)
			.filter((v) => v !== null)
			.map((v, i) => normalizeHistory(v, id, i, list(r.notifDeleted))),
		unlocked: strings(r.unlockedThemes).map(normalizeThemeId),
		blocked: strings(r.blockedThemes).map(normalizeThemeId)
	};
}
/** Priorité : premier alias non vide de premier niveau, puis catalog ; 0 et false sont explicites.
 * Ordre des alias = _normalizeBeastRecord, legacy/assets/js/main.js:733-815 (audit 04 §1.1).
 */
export function normalizeBeast(value: unknown, identity: unknown = value) {
	const r = object(value),
		catalog = object(r.catalog);
	const pick = (...keys: string[]): unknown => {
		for (const source of [r, catalog])
			for (const key of keys)
				if (source[key] !== undefined && source[key] !== null && source[key] !== '')
					return source[key];
		return undefined;
	};
	const min = integer(pick('qtyMin', 'minQty', 'spawnMin'), 1, 1);
	const row = {
		id: sourceId(r, 'b', identity),
		name: text(pick('nom', 'name', 'label'), 'Créature héritée').slice(0, 80),
		subtitle: text(pick('sub', 'subtitle', 'sousTitre', 'sous_titre', 'typeLabel')),
		behavior: text(pick('beh', 'behavior', 'comportement', 'behaviour'), 'Neutre'),
		level: integer(pick('niv', 'level'), 1, 1),
		pv: integer(pick('pv', 'hp', 'pvMax'), 20, 1),
		ep: integer(pick('ep', 'energy', 'epMax'), 20),
		strike: text(pick('frappe', 'attack', 'basicAttack')),
		skill: text(pick('comp', 'skill', 'ability', 'signature')),
		drops: text(pick('drops', 'loot', 'drop')),
		gem: text(pick('gem', 'gemme', 'gemDrop')),
		description: text(pick('desc', 'description', 'lore')),
		imageUrl: text(pick('img', 'image', 'avatar')),
		style: text(pick('style', 'combatStyle')),
		quote: text(pick('citation', 'quote')),
		hidden: pick('hidden') === true,
		archived: pick('archived', 'isArchived') === true,
		qtyMin: min,
		qtyMax: integer(pick('qtyMax', 'maxQty', 'spawnMax'), Math.max(3, min), min),
		spawnWeight: integer(pick('spawnWeight', 'weight'), 1),
		tags: strings(pick('tags')),
		statuses: list(pick('statuts', 'statuses')),
		adminNote: text(
			pick('adminNote', 'adminNotes', 'noteAdmin', 'mjNote', 'mjNotes', 'staffNote', 'staffNotes')
		),
		// Le brut permet d'arbitrer les alias divergents sans perdre leurs valeurs.
		extra: { legacy: r }
	} satisfies typeof s.beasts.$inferInsert;
	return { row, zones: strings(pick('zones')) };
}
export function normalizeEvent(value: unknown, identity: unknown = value) {
	const r = object(value);
	return {
		row: {
			id: sourceId(r, 'e', identity),
			title: text(r.nom ?? r.titre ?? r.title, 'Rendez-vous hérité'),
			type: s.eventTypeEnum.enumValues.find((v) => v === r.type) ?? 'autre',
			description: text(r.desc ?? r.description),
			startsAt: date(r.date !== undefined ? r.date : r.dateTs),
			capacity: integer(r.max ?? r.capacity),
			hidden: typeof r.hidden === 'boolean' ? r.hidden : r.published === false,
			discordUrl: text(r.discordUrl),
			createdBy: null,
			createdByLabel: text(r.createdBy),
			extra: extra(r, [
				'id',
				'nom',
				'titre',
				'title',
				'type',
				'desc',
				'description',
				'date',
				'dateTs',
				'max',
				'capacity',
				'hidden',
				'published',
				'discordUrl',
				'createdBy',
				'inscrits'
			])
		} satisfies typeof s.events.$inferInsert,
		participants: strings(r.inscrits)
	};
}
export function normalizeCombat(value: unknown, owner: string, identity: unknown = value) {
	const r = object(value),
		legacyId = sourceId(r, 'c', identity);
	let state: Record<string, unknown>,
		rawState = false;
	try {
		state = { ...fromLegacyArchive(r), legacy: r };
	} catch {
		state = { ...r, schemaVersion: 0 };
		rawState = true;
	}
	const ongoing = r.active === true || r._inProgress === true || r._draft === true;
	return {
		row: {
			id: stableId('c', [owner, legacyId]),
			ownerAccountId: null,
			ownerLabel: owner,
			name: text(r.name),
			label: text(r.label),
			status: ongoing ? 'en_cours' : 'termine',
			round: integer(r.round, 1, 1),
			phase: text(r.phase, 'idle'),
			state,
			savedAt: date(r.savedAt),
			manualSaved: r._manualSaved === true,
			autosaveAt: date(r._autosaveAt),
			autosaveReason: text(r._autosaveReason),
			closedAt: ongoing ? null : date(r.savedAt, EPOCH)!
		} satisfies typeof s.combats.$inferInsert,
		legacyId,
		rawState,
		participants: [
			...new Set(
				list(r.fighters)
					.map(object)
					.filter((f) => f.type === 'player' && !f.isSummon)
					.map((f) => text(f.pid))
					.filter(Boolean)
			)
		]
	};
}
export function normalizeStaffLog(
	value: unknown,
	identity: unknown,
	archiveId: string | null = null
) {
	const r = object(value);
	return {
		id: parseInt(checksum(['staff', identity]).slice(0, 12), 16) + 1_000_000_000_000,
		ts: date(r.ts, EPOCH)!,
		action: text(r.action, 'héritage'),
		detail: text(r.detail ?? r.text),
		actorName: text(r.actor ?? r.by),
		target: text(r.target),
		archiveId
	} satisfies typeof s.staffLog.$inferInsert;
}
export function normalizeStaffArchive(value: unknown, identity: unknown) {
	const r = object(value);
	return {
		row: {
			id: sourceId(r, 'sla', identity),
			archivedAt: date(r.archivedAt, EPOCH)!,
			label: text(r.label),
			filename: text(r.filename)
		} satisfies typeof s.staffLogArchives.$inferInsert,
		entries: list(r.entries)
	};
}
export function normalizeAudit(value: unknown, identity: unknown) {
	const r = object(value),
		actor = object(r.actor);
	return {
		id: parseInt(checksum(['audit', identity]).slice(0, 12), 16) + 1_000_000_000_000,
		ts: date(r.ts, EPOCH)!,
		source: text(r.source, 'auth'),
		action: text(r.action, 'héritage'),
		actorPseudo: text(r.actorPseudo ?? actor.pseudo ?? r.pseudo),
		actorRole: text(r.actorRole ?? actor.role ?? r.role),
		ip: text(r.ip),
		origin: text(r.origin),
		userAgent: text(r.userAgent ?? r.ua),
		details: object(r.details)
	} satisfies typeof s.auditLog.$inferInsert;
}
export function normalizeSpawn(value: unknown) {
	const r = object(value);
	return {
		totals: Object.fromEntries(Object.entries(object(r.totals)).map(([id, n]) => [id, integer(n)])),
		totalDraws: integer(r.totalDraws),
		zones: strings(r.customZones),
		runs: list(r.lastRuns).map((v, i) => {
			const run = object(v),
				packs = list(run.packs)
					.map(object)
					.map((p) => ({ ...p, id: text(p.id ?? p.beastId), qty: integer(p.qty, 1, 1) }));
			return {
				id: sourceId(run, 'sr', [run.ts, i]),
				generatedAt: date(run.rolledAt ?? run.ts ?? run.generatedAt, EPOCH)!,
				zoneName: text(run.zoneValue ?? run.zone ?? run.zoneName),
				actorLabel: text(run.rolledBy ?? run.by ?? run.actor ?? r.lastGeneratedBy),
				payload: { ...run, packs, drawCount: integer(run.drawCount, packs.length || 1, 1) },
				beastIds: [...new Set(packs.map((p) => p.id).filter(Boolean))]
			};
		})
	};
}
export function normalizeThemes(value: unknown, visibility: unknown) {
	const entries = Array.isArray(value)
		? value
		: Object.entries(object(value)).map(([id, v]) => ({ ...object(v), id }));
	const rows = new Map<string, typeof s.themes.$inferInsert>(
		THEME_SEED.map((t) => [t.id, { ...t }])
	);
	for (const v of entries) {
		const r = object(v),
			id = normalizeThemeId(r.id);
		if (!id) continue;
		const base = rows.get(id);
		rows.set(id, {
			...base,
			id,
			name: text(r.name, base?.name ?? id),
			cssClass: text(r.cls, base?.cssClass ?? ''),
			description: text(r.desc, base?.description ?? ''),
			isEvent: r.event !== false,
			availableUntil: date(r.availableUntil),
			visible: typeof r.visible === 'boolean' ? r.visible : (base?.visible ?? true),
			autoGrantAll: r.autoGrantAll === true,
			isBuiltin: base?.isBuiltin ?? false,
			preview: {
				colors: strings(r.preview).length ? strings(r.preview) : (base?.preview?.colors ?? []),
				tone: base?.preview?.tone ?? 'dark',
				tagline: base?.preview?.tagline ?? ''
			}
		});
	}
	for (const [key, visible] of Object.entries(object(visibility))) {
		const id = normalizeThemeId(key),
			row = rows.get(id);
		if (row && typeof visible === 'boolean') rows.set(id, { ...row, visible });
	}
	return [...rows.values()];
}
