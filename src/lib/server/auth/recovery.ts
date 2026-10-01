// Bootstrap et récupération d'un accès administrateur par variables d'environnement
// (04-architecture §4 ; audit 05 §4.4 « Bootstrap / récupération admin » ; audit 06 A12 ;
// legacy/netlify/functions/auth.js:331-385 `getBootstrapAdminConfig`, `ensureBootstrapAdmin`).
//
// Différences voulues avec l'ancien code :
// - exécuté UNIQUEMENT depuis `login`, et seulement quand la tentative porte exactement le pseudo et le
//   mot de passe de NP_ADMIN_PSEUDO / NP_ADMIN_PASSWORD (connexion admin explicite) — jamais à chaque
//   requête ni à l'inscription ;
// - le mot de passe d'environnement devient le SECRET de réinitialisation (`reset_secret_hash`) :
//   le compte entre en réinitialisation forcée (1 h), ses sessions sont révoquées, et la connexion
//   qui suit n'ouvre qu'une session restreinte (`scope = reset`) ;
// - verrou commun sur les lignes admin (04 §10.7) avant de décider s'il existe un administrateur ;
// - empreinte consommée UNE fois (`admin_recovery_consumptions`) quand NP_ADMIN_RECOVERY=true.
import { createHash, timingSafeEqual } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { Db } from '$lib/server/db';
import { accounts, adminRecoveryConsumptions, sessions } from '$lib/server/db/schema';
import { recordAudit } from '$lib/server/domain/audit';
import { appendStaffLog } from '$lib/server/domain/staff-log';
import { PSEUDO_RE } from '$lib/schemas/auth';
import { hashPassword } from './password';
import { RESET_SESSION_MS } from './session';

type Env = Record<string, string | undefined>;

export interface AdminRecoveryConfig {
	pseudo: string;
	password: string;
	recovery: boolean;
}

/** Configuration de récupération, ou `null` si absente ou invalide (legacy auth.js:331-338). */
export function adminRecoveryConfig(env: Env = process.env): AdminRecoveryConfig | null {
	const pseudo = (env.NP_ADMIN_PSEUDO ?? '').trim();
	const password = env.NP_ADMIN_PASSWORD ?? '';
	if (!pseudo || !password) return null;
	if (!PSEUDO_RE.test(pseudo) || password.length < 8 || password.length > 256) return null;
	return {
		pseudo,
		password,
		recovery: (env.NP_ADMIN_RECOVERY ?? '').trim().toLowerCase() === 'true'
	};
}

/** Empreinte consommée : sha256(pseudo minuscule + "\0" + mot de passe) (legacy auth.js:342-344). */
export function recoveryFingerprint(cfg: { pseudo: string; password: string }): string {
	return createHash('sha256')
		.update(`${cfg.pseudo.toLowerCase()}\0${cfg.password}`, 'utf8')
		.digest('hex');
}

function sameSecret(a: string, b: string): boolean {
	const ha = createHash('sha256').update(a, 'utf8').digest();
	const hb = createHash('sha256').update(b, 'utf8').digest();
	return timingSafeEqual(ha, hb);
}

export type RecoveryOutcome = 'none' | 'created' | 'promoted';

/**
 * Appelée par `login` AVANT la vérification ordinaire. Si la tentative est la connexion admin
 * explicite configurée et qu'il faut amorcer (aucun admin) ou récupérer (NP_ADMIN_RECOVERY=true,
 * empreinte non consommée), le compte est créé ou promu administrateur en réinitialisation forcée.
 */
export async function maybeRecoverAdmin(
	db: Db,
	attempt: { pseudo: string; password: string; ip?: string | null; userAgent?: string | null },
	env: Env = process.env,
	now: Date = new Date()
): Promise<RecoveryOutcome> {
	const cfg = adminRecoveryConfig(env);
	if (!cfg) return 'none';
	if (attempt.pseudo.trim().toLowerCase() !== cfg.pseudo.toLowerCase()) return 'none';
	if (!sameSecret(attempt.password, cfg.password)) return 'none';

	const fingerprint = recoveryFingerprint(cfg);
	// Pré-contrôle sans verrou pour éviter un scrypt inutile ; la décision est reprise sous verrou.
	const quick = await db
		.select({ id: accounts.id })
		.from(accounts)
		.where(eq(accounts.role, 'admin'))
		.limit(1);
	if (quick.length > 0) {
		if (!cfg.recovery) return 'none';
		const used = await db
			.select({ fingerprint: adminRecoveryConsumptions.fingerprint })
			.from(adminRecoveryConsumptions)
			.where(eq(adminRecoveryConsumptions.fingerprint, fingerprint));
		if (used.length > 0) return 'none';
	}

	const secretHash = await hashPassword(cfg.password);
	const resetExpiresAt = new Date(now.getTime() + RESET_SESSION_MS);

	return db.transaction(async (tx) => {
		await tx.execute(sql`select pg_advisory_xact_lock(298, 1)`);
		// Verrou commun sur les administrateurs (04 §10.7), puis décision.
		const admins = await tx
			.select({ id: accounts.id })
			.from(accounts)
			.where(eq(accounts.role, 'admin'))
			.orderBy(accounts.id)
			.for('update');
		if (admins.length > 0) {
			if (!cfg.recovery) return 'none' as const;
			const used = await tx
				.select({ fingerprint: adminRecoveryConsumptions.fingerprint })
				.from(adminRecoveryConsumptions)
				.where(eq(adminRecoveryConsumptions.fingerprint, fingerprint))
				.for('update');
			if (used.length > 0) return 'none' as const;
		}

		// Consommer avant toute modification, m?me lors de l'amor?age sans ligne admin.
		const consumed = await tx
			.insert(adminRecoveryConsumptions)
			.values({ fingerprint, pseudo: cfg.pseudo, consumedAt: now })
			.onConflictDoNothing()
			.returning({ fingerprint: adminRecoveryConsumptions.fingerprint });
		if (consumed.length === 0) return 'none' as const;

		const [existing] = await tx
			.select()
			.from(accounts)
			.where(sql`lower(${accounts.pseudo}) = ${cfg.pseudo.toLowerCase()}`)
			.for('update');

		let outcome: RecoveryOutcome;
		let accountId: string;
		if (existing) {
			accountId = existing.id;
			await tx
				.update(accounts)
				.set({
					role: 'admin',
					discordId: null,
					discordUsername: null,
					forcePasswordReset: true,
					resetExpiresAt,
					resetSecretHash: secretHash,
					sessionVersion: sql`${accounts.sessionVersion} + 1`,
					revision: sql`${accounts.revision} + 1`
				})
				.where(eq(accounts.id, existing.id));
			await tx.delete(sessions).where(eq(sessions.accountId, existing.id));
			outcome = 'promoted';
		} else {
			accountId = `a_${nanoid(16)}`;
			await tx.insert(accounts).values({
				id: accountId,
				pseudo: cfg.pseudo,
				passwordHash: secretHash,
				role: 'admin',
				forcePasswordReset: true,
				resetExpiresAt,
				resetSecretHash: secretHash,
				sessionVersion: 1
			});
			outcome = 'created';
		}

		const actor = {
			accountId,
			role: 'admin' as const,
			characterId: null,
			pseudo: existing?.pseudo ?? cfg.pseudo
		};
		await recordAudit(tx, {
			source: 'auth',
			action: outcome === 'created' ? 'admin_bootstrap' : 'admin_recovery',
			actor,
			details: {
				pseudo: actor.pseudo,
				recovery: cfg.recovery,
				resetExpiresAt: resetExpiresAt.toISOString()
			},
			ip: attempt.ip ?? null,
			userAgent: attempt.userAgent ?? null
		});
		await appendStaffLog(tx, {
			action: outcome === 'created' ? 'admin_amorce' : 'admin_recuperation',
			detail:
				outcome === 'created'
					? `Compte administrateur '${actor.pseudo}' amorcé par la configuration du serveur.`
					: `Accès administrateur de '${actor.pseudo}' récupéré par la configuration du serveur.`,
			actor,
			target: actor.pseudo
		});
		return outcome;
	});
}
