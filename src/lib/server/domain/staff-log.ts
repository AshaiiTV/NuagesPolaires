// Journal du staff : ce que les MJ et les administrateurs ont fait, en clair (04-architecture §3.10).
// `appendStaffLog` s'appelle dans la MÊME transaction que la mutation.
// Lecture et archivage : MJ et administrateurs (04 §5 : « le journal staff est lisible et archivable
// par MJ et admin »). L'archivage MARQUE les lignes (`archive_id`, 04 §10.12) au lieu de les déplacer ;
// contrairement à l'ancien `archiveSysLog` (main.js:1195-1196), il ne vide plus aucun historique de
// personnage (historique complet conservé, 04 §3.2).
import { count, desc, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { Db, Tx } from '$lib/server/db';
import { staffLog, staffLogArchives } from '$lib/server/db/schema';
import { assertCan, type Actor } from '$lib/server/permissions';
import {
	archiveStaffLogInput,
	staffLogPageInput,
	type ArchiveStaffLogInput,
	type StaffLogPageInput,
	type StaffLogPageView
} from '$lib/schemas/accounts';
import { assertFreshAccount, auditContextOf } from '$lib/server/auth/context';
import { parseInput } from '$lib/server/auth/validate';
import { recordAudit } from './audit';

export interface StaffLogInput {
	/** Action nommée (audit 05 §3.9 : `liaison`, `deliaison`, `mdp_reset`, `event_cree`…). */
	action: string;
	/** Phrase lisible : « Compte 'Ashaii' lié au personnage 'Alice' ». */
	detail: string;
	actor: Actor | null;
	/** Cible lisible : « Alice (Duelliste) ». */
	target?: string;
}

export async function appendStaffLog(db: Db | Tx, input: StaffLogInput): Promise<void> {
	await db.insert(staffLog).values({
		action: input.action,
		detail: input.detail,
		actorAccountId: input.actor?.accountId ?? null,
		actorName: input.actor?.pseudo ?? '',
		target: input.target ?? ''
	});
}

/** Lignes par page du journal staff. */
export const STAFF_LOG_PAGE_SIZE = 50;

/** Journal staff courant (non archivé), du plus récent au plus ancien. */
export async function listStaffLog(
	db: Db,
	actor: Actor | null,
	input: StaffLogPageInput = {}
): Promise<StaffLogPageView> {
	assertCan(actor, 'staff_log.read');
	const { page } = parseInput(staffLogPageInput, input);
	const [{ total }] = await db
		.select({ total: count() })
		.from(staffLog)
		.where(isNull(staffLog.archiveId));
	const pages = Math.max(1, Math.ceil(total / STAFF_LOG_PAGE_SIZE));
	const current = Math.min(page, pages);
	const rows = await db
		.select()
		.from(staffLog)
		.where(isNull(staffLog.archiveId))
		.orderBy(desc(staffLog.ts), desc(staffLog.id))
		.limit(STAFF_LOG_PAGE_SIZE)
		.offset((current - 1) * STAFF_LOG_PAGE_SIZE);
	return {
		rows: rows.map((r) => ({
			id: r.id,
			at: r.ts.toISOString(),
			action: r.action,
			detail: r.detail,
			actorName: r.actorName,
			target: r.target
		})),
		page: current,
		pages
	};
}

function defaultArchiveLabel(now: Date): string {
	const fmt = new Intl.DateTimeFormat('fr-FR', {
		timeZone: 'Europe/Paris',
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
	return `Archive du ${fmt.format(now).replace(',', '')}`;
}

/**
 * Archive le journal courant : crée une archive et y rattache toutes les lignes courantes visibles au
 * moment de l'archivage, dans une transaction ; une ligne validée après reste dans le journal courant.
 * Renvoie l'archive et le nombre de lignes archivées.
 */
export async function archiveStaffLog(
	db: Db,
	actor: Actor | null,
	input: ArchiveStaffLogInput = {}
): Promise<{ archiveId: string; label: string; archived: number }> {
	const present = assertCan(actor, 'staff_log.read');
	const data = parseInput(archiveStaffLogInput, input);
	return db.transaction(async (tx) => {
		await assertFreshAccount(tx, present);
		const now = new Date();
		const archiveId = `l_${nanoid(16)}`;
		const label = data.label && data.label.length > 0 ? data.label : defaultArchiveLabel(now);
		await tx.insert(staffLogArchives).values({ id: archiveId, archivedAt: now, label });
		const rows = await tx
			.update(staffLog)
			.set({ archiveId })
			.where(isNull(staffLog.archiveId))
			.returning({ id: staffLog.id });
		await recordAudit(tx, {
			source: 'staff_log',
			action: 'staff_log_archive',
			actor: present,
			details: { archiveId, label, archived: rows.length },
			...auditContextOf(present)
		});
		await appendStaffLog(tx, {
			action: 'journal_archive',
			detail: `Journal archivé : ${label} (${rows.length} ligne${rows.length > 1 ? 's' : ''}).`,
			actor: present
		});
		return { archiveId, label, archived: rows.length };
	});
}
