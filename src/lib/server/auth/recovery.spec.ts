import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { createTestDb } from '../../../../tests/helpers/db';
import { DEMO_IDS, DEMO_PASSWORDS } from '$lib/server/db/seed';
import { accounts, adminRecoveryConsumptions, auditLog } from '$lib/server/db/schema';
import { completeForcedReset, listAccounts, login } from '$lib/server/domain/accounts';
import { adminRecoveryConfig, maybeRecoverAdmin, recoveryFingerprint } from './recovery';
import { createSession, readSession } from './session';
import { ensureTestEnv } from './testing';

const ENV_PASSWORD = 'Recuperation-2026!';

beforeAll(() => ensureTestEnv());
afterEach(() => {
	delete process.env.NP_ADMIN_PSEUDO;
	delete process.env.NP_ADMIN_PASSWORD;
	delete process.env.NP_ADMIN_RECOVERY;
});

describe('configuration (legacy auth.js:331-344)', () => {
	it('exige un pseudo valide et un mot de passe de 8 caractères au moins', () => {
		expect(adminRecoveryConfig({})).toBeNull();
		expect(adminRecoveryConfig({ NP_ADMIN_PSEUDO: 'x', NP_ADMIN_PASSWORD: ENV_PASSWORD })).toBeNull();
		expect(adminRecoveryConfig({ NP_ADMIN_PSEUDO: 'Gardien', NP_ADMIN_PASSWORD: 'court' })).toBeNull();
		expect(adminRecoveryConfig({ NP_ADMIN_PSEUDO: 'Gardien', NP_ADMIN_PASSWORD: ENV_PASSWORD, NP_ADMIN_RECOVERY: 'TRUE' })).toEqual({
			pseudo: 'Gardien',
			password: ENV_PASSWORD,
			recovery: true
		});
	});

	it('empreinte = sha256(pseudo minuscule + \\0 + mot de passe)', () => {
		const a = recoveryFingerprint({ pseudo: 'Gardien', password: ENV_PASSWORD });
		expect(a).toMatch(/^[0-9a-f]{64}$/);
		expect(recoveryFingerprint({ pseudo: 'gardien', password: ENV_PASSWORD })).toBe(a);
		expect(recoveryFingerprint({ pseudo: 'gardien', password: 'autre-mot-de-passe' })).not.toBe(a);
	});
});

describe('amorçage : aucun administrateur', () => {
	it('crée l’admin en réinitialisation forcée ; la connexion n’ouvre qu’une session reset', async () => {
		const t = await createTestDb();
		try {
			process.env.NP_ADMIN_PSEUDO = 'Gardien';
			process.env.NP_ADMIN_PASSWORD = ENV_PASSWORD;
			const res = await login(t.db, { pseudo: 'gardien', password: ENV_PASSWORD, ip: '10.0.0.1' });
			expect(res.scope).toBe('reset');
			const [admin] = await t.db.select().from(accounts).where(sql`lower(${accounts.pseudo}) = 'gardien'`);
			expect(admin.role).toBe('admin');
			expect(admin.forcePasswordReset).toBe(true);
			expect(admin.resetSecretHash).toMatch(/^scrypt\$/);
			const read = await readSession(t.db, res.sessionToken);
			expect(read?.session.scope).toBe('reset');
			// La session de récupération ne donne aucun acteur : rien d'administrable (audit 06 A12).
			await expect(listAccounts(t.db, null)).rejects.toMatchObject({ status: 401 });

			const done = await completeForcedReset(t.db, { accountId: admin.id, sessionId: read!.session.id }, { next: 'Nouveau-secret-42' });
			expect((await readSession(t.db, done.sessionToken))?.session.scope).toBe('full');
			// Un admin existe désormais, sans récupération demandée : le mot de passe d'environnement ne sert plus.
			await expect(login(t.db, { pseudo: 'Gardien', password: ENV_PASSWORD, ip: '10.0.0.1' })).rejects.toMatchObject({ status: 401 });
			expect((await login(t.db, { pseudo: 'Gardien', password: 'Nouveau-secret-42', ip: '10.0.0.1' })).scope).toBe('full');
			const actions = (await t.db.select({ action: auditLog.action }).from(auditLog)).map((r) => r.action);
			expect(actions).toContain('admin_bootstrap');
		} finally {
			await t.close();
		}
	});

	it('une tentative qui ne porte pas le mot de passe configuré ne déclenche rien', async () => {
		const t = await createTestDb();
		try {
			const env = { NP_ADMIN_PSEUDO: 'Gardien', NP_ADMIN_PASSWORD: ENV_PASSWORD };
			expect(await maybeRecoverAdmin(t.db, { pseudo: 'Gardien', password: 'mauvais-mot-de-passe' }, env)).toBe('none');
			expect(await maybeRecoverAdmin(t.db, { pseudo: 'Autre', password: ENV_PASSWORD }, env)).toBe('none');
			expect(await t.db.select().from(accounts)).toHaveLength(0);
		} finally {
			await t.close();
		}
	});
});

describe('récupération : NP_ADMIN_RECOVERY=true, empreinte consommée une fois (audit 06 A12)', () => {
	it('promeut le compte, révoque ses sessions, puis ne se rejoue pas', async () => {
		const t = await createTestDb({ demo: true });
		try {
			const env = { NP_ADMIN_PSEUDO: 'admin', NP_ADMIN_PASSWORD: ENV_PASSWORD, NP_ADMIN_RECOVERY: 'true' };
			const [before] = await t.db.select().from(accounts).where(eq(accounts.id, DEMO_IDS.accounts.admin));
			const old = await createSession(t.db, { accountId: before.id, scope: 'full', sessionVersion: before.sessionVersion });

			expect(await maybeRecoverAdmin(t.db, { pseudo: 'admin', password: ENV_PASSWORD }, env)).toBe('promoted');
			expect(await readSession(t.db, old.token)).toBeNull();
			const [after] = await t.db.select().from(accounts).where(eq(accounts.id, before.id));
			expect(after.forcePasswordReset).toBe(true);
			expect(after.sessionVersion).toBe(before.sessionVersion + 1);
			expect(await t.db.select().from(adminRecoveryConsumptions)).toHaveLength(1);

			// L'ancien mot de passe ne suffit plus ; le mot de passe d'environnement ouvre une session reset.
			process.env.NP_ADMIN_PSEUDO = env.NP_ADMIN_PSEUDO;
			process.env.NP_ADMIN_PASSWORD = env.NP_ADMIN_PASSWORD;
			process.env.NP_ADMIN_RECOVERY = 'true';
			await expect(login(t.db, { pseudo: 'admin', password: DEMO_PASSWORDS.admin })).rejects.toMatchObject({ status: 401 });
			const res = await login(t.db, { pseudo: 'admin', password: ENV_PASSWORD });
			expect(res.scope).toBe('reset');

			// Empreinte déjà consommée : aucune nouvelle promotion.
			expect(await maybeRecoverAdmin(t.db, { pseudo: 'admin', password: ENV_PASSWORD }, env)).toBe('none');
		} finally {
			await t.close();
		}
	});

	it('promeut un compte joueur désigné par la configuration', async () => {
		const t = await createTestDb({ demo: true });
		try {
			const env = { NP_ADMIN_PSEUDO: 'nova', NP_ADMIN_PASSWORD: ENV_PASSWORD, NP_ADMIN_RECOVERY: 'true' };
			expect(await maybeRecoverAdmin(t.db, { pseudo: 'NOVA', password: ENV_PASSWORD }, env)).toBe('promoted');
			const [nova] = await t.db.select().from(accounts).where(eq(accounts.id, DEMO_IDS.accounts.nova));
			expect(nova.role).toBe('admin');
		} finally {
			await t.close();
		}
	});
});
