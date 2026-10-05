// Registre › Données : export partiel sans secret, état de la migration, diagnostics sans écriture.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import type { Db } from '../db';
import { DEMO_IDS } from '../db/seed';
import * as schema from '../db/schema';
import type { Actor } from '../permissions';
import packageJson from '../../../../package.json';
import { EXPORT_NOTICE } from '../../schemas/admin';
import { diagnostics, exportData, migrationStatus } from './admin';

const A = DEMO_IDS.accounts;
const actors = {
	admin: { accountId: A.admin, role: 'admin', characterId: null, pseudo: 'admin' },
	alice: {
		accountId: A.alice,
		role: 'joueur',
		characterId: DEMO_IDS.characters.aria,
		pseudo: 'alice'
	},
	mj: { accountId: A.mj, role: 'mj', characterId: null, pseudo: 'mj' },
	designer: { accountId: A.designer, role: 'designer', characterId: null, pseudo: 'designer' }
} satisfies Record<string, Actor>;

let t: TestDb;
beforeAll(async () => {
	t = await createTestDb({ demo: true });
});
afterAll(async () => {
	await t.close();
});

async function auditCount(): Promise<number> {
	return (await t.db.select({ id: schema.auditLog.id }).from(schema.auditLog)).length;
}

describe('refus par rôle', () => {
	it('MJ, designer, joueur : 403 ; visiteur : 401', async () => {
		for (const actor of [actors.mj, actors.designer, actors.alice]) {
			await expect(exportData(t.db, actor)).rejects.toMatchObject({
				code: 'FORBIDDEN',
				status: 403
			});
			await expect(migrationStatus(t.db, actor)).rejects.toMatchObject({ status: 403 });
			await expect(diagnostics(t.db, actor)).rejects.toMatchObject({ status: 403 });
		}
		await expect(exportData(t.db, null)).rejects.toMatchObject({ status: 401 });
		await expect(diagnostics(t.db, null)).rejects.toMatchObject({ status: 401 });
	});
});

describe('exportData', () => {
	it('JSON partiel avec la mention exacte, sans aucun secret ; audité', async () => {
		await t.db
			.update(schema.accounts)
			.set({ resetSecretHash: 'scrypt$secret-de-reinitialisation', discordId: '1234567890' })
			.where(eq(schema.accounts.id, A.alice));
		const before = await auditCount();
		const data = await exportData(t.db, actors.admin);
		expect(data.notice).toBe("Ce n'est pas une sauvegarde complète du site.");
		expect(data.notice).toBe(EXPORT_NOTICE);
		expect(data.format).toBe('nuages-polaires-export-partiel');
		expect(data.excluded.length).toBeGreaterThan(0);

		const json = JSON.stringify(data);
		for (const forbidden of [
			'passwordHash',
			'password_hash',
			'sha256:',
			'resetSecretHash',
			'secret-de-reinitialisation',
			'1234567890',
			'sessionVersion'
		]) {
			expect(json).not.toContain(forbidden);
		}
		expect(data.accounts.find((a) => a.id === A.alice)).toMatchObject({
			pseudo: 'alice',
			role: 'joueur',
			characterId: DEMO_IDS.characters.aria,
			discordLinked: true
		});
		const aria = data.characters.find((c) => c.id === DEMO_IDS.characters.aria)!;
		expect((aria.items as unknown[]).length).toBe(5);
		expect(typeof aria.updatedAt).toBe('string');
		const loup = data.beasts.find((b) => b.id === DEMO_IDS.beasts.loup)!;
		expect(loup.zones).toEqual(['foret-aux-lianes', 'foret-centre']);
		const masque = data.events.find((e) => e.id === DEMO_IDS.events.masque);
		expect(masque).toBeDefined();
		const conseil = data.events.find((e) => e.id === DEMO_IDS.events.conseil)!;
		expect((conseil.participants as unknown[]).length).toBe(2);
		expect(data.oaths.length).toBeGreaterThan(10);
		expect(data.settings.map((s) => s.key)).toContain('discord_invite_url');

		expect(await auditCount()).toBe(before + 1);
		const [audit] = await t.db
			.select()
			.from(schema.auditLog)
			.where(eq(schema.auditLog.action, 'export_data'));
		expect(audit.actorPseudo).toBe('admin');
	});
});

describe('migrationStatus', () => {
	it('base jamais migrée, puis lecture du registre par table', async () => {
		expect(await migrationStatus(t.db, actors.admin)).toEqual({
			anomalies: [],
			migrated: false,
			total: 0,
			lastMigratedAt: null,
			transformerVersions: [],
			tables: [],
			charactersMigrated: 0
		});
		const at = new Date('2026-09-30T12:00:00Z');
		await t.db.insert(schema.migrationRegistry).values([
			{
				sourceKey: 'players',
				sourceId: 'p1',
				targetTable: 'characters',
				targetId: 'p1',
				checksum: 'a',
				migratedAt: at
			},
			{
				sourceKey: 'players',
				sourceId: 'p2',
				targetTable: 'characters',
				targetId: 'p2',
				checksum: 'b',
				migratedAt: at
			},
			{
				sourceKey: 'accounts',
				sourceId: 'a1',
				transformerVersion: 2,
				targetTable: 'accounts',
				targetId: 'a1',
				checksum: 'c',
				migratedAt: new Date('2026-09-30T13:00:00Z')
			}
		]);
		const before = await auditCount();
		const status = await migrationStatus(t.db, actors.admin);
		expect(status).toEqual({
			anomalies: [],
			migrated: true,
			total: 3,
			lastMigratedAt: '2026-09-30T13:00:00.000Z',
			transformerVersions: [1, 2],
			tables: [
				{ table: 'accounts', count: 1, lastMigratedAt: '2026-09-30T13:00:00.000Z' },
				{ table: 'characters', count: 2, lastMigratedAt: '2026-09-30T12:00:00.000Z' }
			],
			charactersMigrated: 2
		});
		// Lecture seule.
		expect(await auditCount()).toBe(before);
	});
});

describe('diagnostics', () => {
	it('base joignable, présence des variables en booléens, version ; aucune écriture, aucun secret', async () => {
		const secret = 'x'.repeat(40);
		const env = {
			DATABASE_URL: 'postgres://user:motdepasse@hote/base',
			NP_SESSION_SECRET: secret,
			NP_SITE_URL: 'https://nuages.example',
			NP_ADMIN_PSEUDO: 'gardien-du-col',
			NP_ADMIN_RECOVERY: 'true',
			DISCORD_CLIENT_ID: '',
			DISCORD_EVENTS_WEBHOOK_URL: 'https://discord.com/api/webhooks/1/abc'
		};
		const before = await auditCount();
		const report = await diagnostics(t.db, actors.admin, { env });
		expect(report.dbReachable).toBe(true);
		expect(report.dbLatencyMs).toBeGreaterThanOrEqual(0);
		expect(report.env).toEqual({
			databaseConfigured: true,
			pgliteDriver: false,
			sessionSecretConfigured: true,
			siteUrlConfigured: true,
			adminBootstrapConfigured: false,
			adminRecoveryEnabled: true,
			discordLoginConfigured: false,
			discordWebhookConfigured: true,
			production: false
		});
		expect(report.version).toBe(packageJson.version);
		const json = JSON.stringify(report);
		for (const value of Object.values(env).filter((v) => v.length > 4))
			expect(json).not.toContain(value);
		expect(await auditCount()).toBe(before);

		expect(
			(await diagnostics(t.db, actors.admin, { env: { NP_SESSION_SECRET: 'court' } })).env
				.sessionSecretConfigured
		).toBe(false);
	});

	it('base injoignable : dbReachable faux, sans exception', async () => {
		const broken = {
			execute: () => Promise.reject(new Error('connexion refusée'))
		} as unknown as Db;
		const report = await diagnostics(broken, actors.admin, { env: {} });
		expect(report).toMatchObject({ dbReachable: false, dbLatencyMs: null });
	});
});
