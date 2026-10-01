import { lt } from 'drizzle-orm';
import type { Db } from '../db';
import { auditLog } from '../db/schema';
import { purgeExpiredSessions } from '../auth/session';
import { purgeRateLimits } from '../auth/rate-limit';
import { autoCloseScenes } from './scenes';
import { expireDeclarations } from './declarations';

/** Entretien rejouable : chaque requête cible uniquement les lignes encore concernées. */
export async function maintainDatabase(db: Db, now = new Date()) {
	const scenes = await autoCloseScenes(db, now);
	const declarations = await expireDeclarations(db);
	const sessions = await purgeExpiredSessions(db, now);
	const rateLimits = await purgeRateLimits(db, now);
	const audit = await db
		.delete(auditLog)
		.where(lt(auditLog.ts, new Date(now.getTime() - 180 * 86_400_000)))
		.returning({ id: auditLog.id });
	return { scenes, declarations, sessions, rateLimits, audit: audit.length };
}
