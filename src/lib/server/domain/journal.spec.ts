// Journal : entrées datées, rature des corrections, droits de lecture (propriétaire, MJ, admin),
// transition « Avant le carnet ». Spécification : 06-contrats §B.3 ; 04 §3.12 ; 03-vision §5.5, §12.2.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { count, eq, sql } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import { DEMO_IDS } from '../db/seed';
import type { Db } from '../db/index';
import { accounts, characters, journalEntries } from '../db/schema';
import type { Actor } from '../permissions';
import { amendEntry, listEntries, strikeEntry, writeEntry } from './journal';
import { BEFORE_NOTEBOOK_ID } from '../../schemas/journal';

const A = DEMO_IDS.accounts;
const P = DEMO_IDS.characters;
const alice: Actor = { accountId: A.alice, role: 'joueur', characterId: P.aria, pseudo: 'alice' };
const bob: Actor = { accountId: A.bob, role: 'joueur', characterId: P.kael, pseudo: 'bob' };
const nova: Actor = { accountId: A.nova, role: 'joueur', characterId: null, pseudo: 'nova' };
/** Seren n'a pas de compte dans le jeu de démonstration : acteur de test relié à lui. */
const seren: Actor = { accountId: A.nova, role: 'joueur', characterId: P.seren, pseudo: 'nova' };
const mj: Actor = { accountId: A.mj, role: 'mj', characterId: null, pseudo: 'mj' };
const designer: Actor = {
	accountId: A.designer,
	role: 'designer',
	characterId: null,
	pseudo: 'designer'
};
const admin: Actor = { accountId: A.admin, role: 'admin', characterId: null, pseudo: 'admin' };

async function expectNpError(promise: Promise<unknown>, code: string, status: number) {
	await expect(promise).rejects.toMatchObject({ name: 'NpError', code, status });
}

async function entryCount(db: Db, characterId: string): Promise<number> {
	const [{ n }] = await db
		.select({ n: count() })
		.from(journalEntries)
		.where(eq(journalEntries.characterId, characterId));
	return n;
}

describe('journal', () => {
	let t: TestDb;
	beforeAll(async () => {
		t = await createTestDb({ demo: true });
	});
	afterAll(async () => t.close());

	it('listEntries : le propriétaire lit ses entrées dans l’ordre d’écriture', async () => {
		const page = await listEntries(t.db, alice);
		expect(page).toMatchObject({ page: 1, pages: 1, count: 2 });
		expect(page.rows.map((r) => r.id)).toEqual(['j_demo_aria_1', 'j_demo_aria_2']);
		expect(page.rows[1]).toMatchObject({
			inScene: true,
			struck: false,
			previous: null,
			label: null
		});
	});

	it('listEntries : MJ et admin lisent ; jamais un autre joueur ni le designer', async () => {
		expect((await listEntries(t.db, mj, { characterId: P.aria })).count).toBe(2);
		expect((await listEntries(t.db, admin, { characterId: P.aria })).count).toBe(2);
		await expectNpError(listEntries(t.db, bob, { characterId: P.aria }), 'FORBIDDEN', 403);
		await expectNpError(listEntries(t.db, designer, { characterId: P.aria }), 'FORBIDDEN', 403);
		await expectNpError(listEntries(t.db, null, { characterId: P.aria }), 'UNAUTHENTICATED', 401);
		await expectNpError(listEntries(t.db, nova), 'NOT_LINKED', 403);
		await expectNpError(listEntries(t.db, mj), 'NOT_LINKED', 403);
		await expectNpError(listEntries(t.db, mj, { characterId: 'p_x' }), 'NOT_FOUND', 404);
	});

	it('writeEntry : texte brut ≤ 20 000, « notée en scène », propriétaire seulement', async () => {
		const entry = await writeEntry(t.db, alice, { text: '  Le gué <i>gèle</i>.  ', inScene: true });
		expect(entry).toMatchObject({
			text: 'Le gué <i>gèle</i>.',
			inScene: true,
			struck: false,
			previous: null
		});
		expect(entry.id).toMatch(/^j_/);
		const page = await listEntries(t.db, alice);
		expect(page.rows.at(-1)?.id).toBe(entry.id);
		await expectNpError(writeEntry(t.db, alice, { text: '   ' }), 'INVALID', 400);
		await expectNpError(writeEntry(t.db, alice, { text: 'x'.repeat(20_001) }), 'INVALID', 400);
		expect((await writeEntry(t.db, alice, { text: 'x'.repeat(20_000) })).text).toHaveLength(20_000);
		await expectNpError(
			writeEntry(t.db, alice, { text: 'x', characterId: P.kael } as never),
			'INVALID',
			400
		);
		await expectNpError(writeEntry(t.db, mj, { text: 'x' }), 'NOT_LINKED', 403);
		await expectNpError(writeEntry(t.db, null, { text: 'x' }), 'UNAUTHENTICATED', 401);
	});

	it('amendEntry : nouvelle entrée, l’ancienne reste lisible en rature, à la même place', async () => {
		const amended = await amendEntry(t.db, alice, {
			entryId: 'j_demo_aria_2',
			text: 'La brume ne se lève pas. Kael dit qu’elle nous écoute.'
		});
		expect(amended.previous?.id).toBe('j_demo_aria_2');
		expect(amended.previous?.text).toBe('La brume ne se lève pas. Kael dit qu’elle écoute.');
		expect(amended.inScene).toBe(true);
		const page = await listEntries(t.db, alice);
		expect(page.count).toBe(4);
		expect(page.rows[1].id).toBe(amended.id);
		expect(page.rows[1].previous?.id).toBe('j_demo_aria_2');
		expect(await entryCount(t.db, P.aria)).toBe(5);
		// Corriger une version déjà corrigée (deux appareils) : conflit, rien n'est écrit.
		await expectNpError(
			amendEntry(t.db, alice, { entryId: 'j_demo_aria_2', text: 'autre' }),
			'VERSION_CONFLICT',
			409
		);
		expect(await entryCount(t.db, P.aria)).toBe(5);
		await expectNpError(
			amendEntry(t.db, bob, { entryId: amended.id, text: 'x' }),
			'NOT_FOUND',
			404
		);
		await expectNpError(
			amendEntry(t.db, mj, { entryId: amended.id, text: 'x' }),
			'NOT_LINKED',
			403
		);
	});

	it('strikeEntry : rayée et lisible, idempotent ; une entrée rayée ne se corrige plus', async () => {
		const struck = await strikeEntry(t.db, alice, { entryId: 'j_demo_aria_1' });
		expect(struck).toMatchObject({ id: 'j_demo_aria_1', struck: true });
		expect((await strikeEntry(t.db, alice, { entryId: 'j_demo_aria_1' })).struck).toBe(true);
		expect((await listEntries(t.db, mj, { characterId: P.aria })).rows[0].struck).toBe(true);
		await expectNpError(
			amendEntry(t.db, alice, { entryId: 'j_demo_aria_1', text: 'x' }),
			'ENTRY_STRUCK',
			409
		);
		await expectNpError(strikeEntry(t.db, bob, { entryId: 'j_demo_aria_1' }), 'NOT_FOUND', 404);
	});

	it('« Avant le carnet » : l’ancien journal est la première entrée, matérialisée à la première écriture', async () => {
		await t.db
			.update(characters)
			.set({ journal: 'Notes anciennes de Kael.' })
			.where(eq(characters.id, P.kael));
		const before = await listEntries(t.db, bob);
		expect(before.count).toBe(1);
		expect(before.rows[0]).toMatchObject({
			id: BEFORE_NOTEBOOK_ID,
			text: 'Notes anciennes de Kael.',
			label: 'Avant le carnet'
		});
		expect(await entryCount(t.db, P.kael)).toBe(0);
		await writeEntry(t.db, bob, { text: 'Première note du carnet.' });
		const after = await listEntries(t.db, bob);
		expect(after.count).toBe(2);
		expect(after.rows[0]).toMatchObject({
			label: 'Avant le carnet',
			text: 'Notes anciennes de Kael.'
		});
		expect(after.rows[0].id).not.toBe(BEFORE_NOTEBOOK_ID);
		expect(after.rows[1].text).toBe('Première note du carnet.');
	});

	it('« Avant le carnet » se corrige aussi : matérialisée puis raturée', async () => {
		await t.db
			.update(characters)
			.set({ journal: 'Ancien texte de Seren.' })
			.where(eq(characters.id, P.seren));
		await t.db.update(accounts).set({ characterId: P.seren }).where(eq(accounts.id, A.nova));
		const amended = await amendEntry(t.db, seren, {
			entryId: BEFORE_NOTEBOOK_ID,
			text: 'Texte repris.'
		});
		expect(amended.previous?.text).toBe('Ancien texte de Seren.');
		expect(amended.label).toBe('Avant le carnet');
		const page = await listEntries(t.db, mj, { characterId: P.seren });
		expect(page.count).toBe(1);
		expect(page.rows[0].text).toBe('Texte repris.');
	});

	it('20 entrées par page ; sans page, la dernière', async () => {
		await t.db.update(characters).set({ journal: '' }).where(eq(characters.id, P.seren));
		await t.db.delete(journalEntries).where(eq(journalEntries.characterId, P.seren));
		await t.db.insert(journalEntries).values(
			Array.from({ length: 25 }, (_, i) => ({
				id: `j_page_${String(i).padStart(2, '0')}`,
				characterId: P.seren,
				ts: new Date(Date.UTC(2026, 0, 1, 0, i)),
				text: `Entrée ${i}`
			}))
		);
		const last = await listEntries(t.db, seren);
		expect(last).toMatchObject({ page: 2, pages: 2, count: 25 });
		expect(last.rows.map((r) => r.text)).toEqual([
			'Entrée 20',
			'Entrée 21',
			'Entrée 22',
			'Entrée 23',
			'Entrée 24'
		]);
		const first = await listEntries(t.db, seren, { page: 1 });
		expect(first.rows).toHaveLength(20);
		expect(first.rows[0].text).toBe('Entrée 0');
	});

	it('un échec en fin de transaction n’écrit rien (ni l’entrée, ni « Avant le carnet »)', async () => {
		await t.db
			.update(characters)
			.set({ journal: 'Texte hérité.' })
			.where(eq(characters.id, P.seren));
		await t.db.delete(journalEntries).where(eq(journalEntries.characterId, P.seren));
		await t.db.execute(
			sql.raw(
				`CREATE OR REPLACE FUNCTION np_test_fail() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'échec simulé'; END $$ LANGUAGE plpgsql`
			)
		);
		await t.db.execute(
			sql.raw(
				`CREATE TRIGGER np_test_fail_audit BEFORE INSERT ON audit_log FOR EACH ROW EXECUTE FUNCTION np_test_fail()`
			)
		);
		try {
			await expect(writeEntry(t.db, seren, { text: 'Perdue ?' })).rejects.toThrow();
		} finally {
			await t.db.execute(sql.raw(`DROP TRIGGER np_test_fail_audit ON audit_log`));
		}
		expect(await entryCount(t.db, P.seren)).toBe(0);
	});
});
