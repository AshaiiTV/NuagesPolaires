import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import { DEMO_IDS } from '$lib/server/db/seed';
import { auditLog } from '$lib/server/db/schema';
import { actorFor, ensureTestEnv } from '$lib/server/auth/testing';
import type { Actor } from '$lib/server/permissions';
import { AUDIT_PAGE_SIZE, auditAsText, listAudit, recordAudit } from './audit';

let t: TestDb;
let admin: Actor;
let mj: Actor;
let alice: Actor;

beforeAll(async () => {
	ensureTestEnv();
	t = await createTestDb({ demo: true });
	admin = await actorFor(t.db, DEMO_IDS.accounts.admin);
	mj = await actorFor(t.db, DEMO_IDS.accounts.mj);
	alice = await actorFor(t.db, DEMO_IDS.accounts.alice);
	const base = Date.UTC(2026, 8, 20, 12); // 20 septembre 2026, 12:00 UTC
	const rows = Array.from({ length: 120 }, (_, i) => ({
		ts: new Date(base + i * 3600_000),
		source: i % 2 === 0 ? 'auth' : 'accounts',
		action: i % 3 === 0 ? 'login_success' : 'admin_set_role',
		actorAccountId: i % 4 === 0 ? DEMO_IDS.accounts.alice : DEMO_IDS.accounts.admin,
		actorPseudo: i % 4 === 0 ? 'alice' : 'admin',
		actorRole: i % 4 === 0 ? 'joueur' : 'admin',
		ip: '10.0.0.1',
		details: { n: i }
	}));
	await t.db.insert(auditLog).values(rows);
});
afterAll(async () => {
	await t.close();
});

describe('recordAudit', () => {
	it('écrit une ligne avec acteur, ip, origine et agent (tronqué à 240)', async () => {
		await recordAudit(t.db, {
			source: 'test',
			action: 'probe',
			actor: mj,
			details: { a: 1 },
			ip: '1.2.3.4',
			origin: 'https://np.test',
			userAgent: 'x'.repeat(500)
		});
		const page = await listAudit(t.db, admin, { action: 'probe' });
		expect(page.rows).toHaveLength(1);
		expect(page.rows[0]).toMatchObject({ source: 'test', actorPseudo: 'mj', actorRole: 'mj', ip: '1.2.3.4', origin: 'https://np.test', details: { a: 1 } });
		expect(page.rows[0].userAgent).toHaveLength(240);
	});
});

describe('listAudit (06 §B.8)', () => {
	it('administrateur seulement', async () => {
		await expect(listAudit(t.db, mj)).rejects.toMatchObject({ status: 403 });
		await expect(listAudit(t.db, alice)).rejects.toMatchObject({ status: 403 });
		await expect(listAudit(t.db, null)).rejects.toMatchObject({ status: 401 });
	});

	it('pagine du plus récent au plus ancien', async () => {
		const first = await listAudit(t.db, admin, { action: 'admin_set_role' });
		expect(first.rows).toHaveLength(AUDIT_PAGE_SIZE);
		expect(first.page).toBe(1);
		expect(first.pages).toBe(2); // 80 lignes
		const times = first.rows.map((r) => Date.parse(r.at));
		expect([...times].sort((a, b) => b - a)).toEqual(times);
		const second = await listAudit(t.db, admin, { action: 'admin_set_role', page: 2 });
		expect(second.rows).toHaveLength(30);
		// Page au-delà de la dernière : ramenée à la dernière.
		expect((await listAudit(t.db, admin, { action: 'admin_set_role', page: 9 })).page).toBe(2);
	});

	it('filtre par acteur (insensible à la casse) et par action', async () => {
		const page = await listAudit(t.db, admin, { actor: 'ALI', action: 'login_success' });
		expect(page.rows.length).toBeGreaterThan(0);
		expect(page.rows.every((r) => r.actorPseudo === 'alice' && r.action === 'login_success')).toBe(true);
		expect((await listAudit(t.db, admin, { actor: '%' })).rows).toHaveLength(0);
	});

	it('filtre par dates : jour entier ou instant exact', async () => {
		const day = await listAudit(t.db, admin, { from: '2026-09-21', to: '2026-09-21', source: undefined } as never);
		expect(day.rows.length + (day.pages - 1) * AUDIT_PAGE_SIZE).toBe(24);
		expect(day.rows.every((r) => r.at.startsWith('2026-09-21'))).toBe(true);
		const exact = await listAudit(t.db, admin, { from: '2026-09-20T12:00:00Z', to: '2026-09-20T14:00:00Z' });
		expect(exact.rows).toHaveLength(3);
		await expect(listAudit(t.db, admin, { from: 'hier' })).rejects.toMatchObject({ status: 400 });
	});
});

describe('auditAsText', () => {
	it('exporte toutes les lignes filtrées, une par ligne, sans pagination', async () => {
		const text = await auditAsText(t.db, admin, { action: 'admin_set_role' });
		const lines = text.trim().split('\n');
		expect(lines[0]).toMatch(/journal d’audit/);
		expect(lines).toHaveLength(2 + 80);
		expect(lines[2].split('\t')).toHaveLength(6);
		await expect(auditAsText(t.db, mj, {})).rejects.toMatchObject({ status: 403 });
	});
});
