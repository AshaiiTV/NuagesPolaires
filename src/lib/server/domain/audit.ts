// Journal d'audit serveur : la version complète de ce que chaque page montre déjà (04-architecture §3.10).
// `recordAudit` s'appelle dans la MÊME transaction que la mutation auditée.
// Lecture (Registre › Journal d'audit, 03-vision §5.11) : administrateurs seulement ; filtres acteur ·
// action · dates ; jamais éditable ; export texte. Plus de plafond ni de « Tout vider » (purge par âge
// dans le script d'entretien).
import { and, count, desc, eq, gte, lt, lte, sql, type SQL } from 'drizzle-orm';
import type { Db, Tx } from '$lib/server/db';
import { auditLog } from '$lib/server/db/schema';
import { assertCan, type Actor } from '$lib/server/permissions';
import {
	auditFiltersInput,
	type AuditFiltersInput,
	type AuditPageView,
	type AuditRowView
} from '$lib/schemas/accounts';
import { parseInput } from '$lib/server/auth/validate';

export interface AuditInput {
	/** Module d'origine : `auth`, `accounts`, `characters`, `events`, `combats`… */
	source: string;
	/** Action nommée (audit 05 §6 pour les noms hérités : `login_success`, `admin_set_role`…). */
	action: string;
	actor: Actor | null;
	/** Détails structurés. Jamais de secret : ni mot de passe, ni hash, ni jeton. */
	details?: Record<string, unknown>;
	ip?: string | null;
	origin?: string | null;
	userAgent?: string | null;
}

export async function recordAudit(db: Db | Tx, input: AuditInput): Promise<void> {
	await db.insert(auditLog).values({
		source: input.source,
		action: input.action,
		actorAccountId: input.actor?.accountId ?? null,
		actorPseudo: input.actor?.pseudo ?? '',
		actorRole: input.actor?.role ?? '',
		ip: input.ip ?? '',
		origin: input.origin ?? '',
		userAgent: (input.userAgent ?? '').slice(0, 240),
		details: input.details ?? {}
	});
}

/** Lignes par page du journal d'audit. */
export const AUDIT_PAGE_SIZE = 50;
/** Plafond de l'export texte (une requête, pas de pagination). */
export const AUDIT_TEXT_MAX_ROWS = 10_000;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Borne de date : `AAAA-MM-JJ` = jour entier (UTC) ; date ISO complète = instant exact. */
function bound(value: string | undefined, end: boolean): { at: Date; exclusive: boolean } | null {
	if (!value) return null;
	const dayOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
	const at = new Date(dayOnly ? `${value}T00:00:00.000Z` : value);
	if (Number.isNaN(at.getTime())) return null;
	if (dayOnly && end) return { at: new Date(at.getTime() + DAY_MS), exclusive: true };
	return { at, exclusive: false };
}

function whereFor(filters: ReturnType<typeof auditFiltersInput.parse>): SQL | undefined {
	const parts: SQL[] = [];
	if (filters.actor) {
		const needle = `%${filters.actor.toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
		parts.push(sql`lower(${auditLog.actorPseudo}) LIKE ${needle}`);
	}
	if (filters.action) parts.push(eq(auditLog.action, filters.action));
	const from = bound(filters.from, false);
	if (from) parts.push(gte(auditLog.ts, from.at));
	const to = bound(filters.to, true);
	if (to) parts.push(to.exclusive ? lt(auditLog.ts, to.at) : lte(auditLog.ts, to.at));
	return parts.length > 0 ? and(...parts) : undefined;
}

function toRow(r: typeof auditLog.$inferSelect): AuditRowView {
	return {
		id: r.id,
		at: r.ts.toISOString(),
		source: r.source,
		action: r.action,
		actorPseudo: r.actorPseudo,
		actorRole: r.actorRole,
		ip: r.ip,
		origin: r.origin,
		userAgent: r.userAgent,
		details: r.details ?? {}
	};
}

/** Registre › Journal d'audit (06 §B.8 `listAudit`) : du plus récent au plus ancien, 50 par page. */
export async function listAudit(
	db: Db,
	actor: Actor | null,
	input: AuditFiltersInput = {}
): Promise<AuditPageView> {
	assertCan(actor, 'admin.audit');
	const filters = parseInput(auditFiltersInput, input);
	const where = whereFor(filters);
	const [{ total }] = await db.select({ total: count() }).from(auditLog).where(where);
	const pages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
	const page = Math.min(filters.page, pages);
	const rows = await db
		.select()
		.from(auditLog)
		.where(where)
		.orderBy(desc(auditLog.ts), desc(auditLog.id))
		.limit(AUDIT_PAGE_SIZE)
		.offset((page - 1) * AUDIT_PAGE_SIZE);
	return { rows: rows.map(toRow), page, pages };
}

/** Une ligne de l'export texte : date · source · action · acteur (rôle) · ip · détails. */
export function auditLineText(row: AuditRowView): string {
	const who = row.actorPseudo ? `${row.actorPseudo}${row.actorRole ? ` (${row.actorRole})` : ''}` : '—';
	const details = Object.keys(row.details).length > 0 ? JSON.stringify(row.details) : '';
	return [row.at, row.source, row.action, who, row.ip || '—', details].join('\t').replace(/[\r\n]+/g, ' ');
}

/** Export « .txt » du journal d'audit (06 §B.8 `auditAsText`), mêmes filtres, sans pagination. */
export async function auditAsText(
	db: Db,
	actor: Actor | null,
	input: Omit<AuditFiltersInput, 'page'> = {}
): Promise<string> {
	assertCan(actor, 'admin.audit');
	const filters = parseInput(auditFiltersInput, { ...input, page: 1 });
	const rows = await db
		.select()
		.from(auditLog)
		.where(whereFor(filters))
		.orderBy(desc(auditLog.ts), desc(auditLog.id))
		.limit(AUDIT_TEXT_MAX_ROWS);
	const header = 'Nuages Polaires — journal d’audit\nDate (UTC)\tSource\tAction\tActeur\tIP\tDétails';
	return `${[header, ...rows.map((r) => auditLineText(toRow(r)))].join('\n')}\n`;
}
