// Journal d'audit serveur : la version complète de ce que chaque page montre déjà (04-architecture §3.10).
// `recordAudit` s'appelle dans la MÊME transaction que la mutation auditée.
import type { Db, Tx } from '$lib/server/db';
import { auditLog } from '$lib/server/db/schema';
import type { Actor } from '$lib/server/permissions';

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
