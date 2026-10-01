// Personnages : fiche, conséquences tamponnées, attributions du staff, actions du joueur.
// Spécification : 06-contrats §B.2 ; 04 §3.2, §3.12, §5, §6 ; audit 02 ; audit 05 §3.2, §5.5 ;
// audit 06 §3.E, §3.F, §3.I.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import { DEMO_IDS } from '../db/seed';
import type { Db } from '../db/index';
import {
	accounts,
	auditLog,
	characterHistory,
	characterItems,
	characters,
	declarations,
	staffLog
} from '../db/schema';
import type { Actor } from '../permissions';
import {
	addItem,
	consumeOwnItem,
	correctResource,
	createCharacter,
	fuseGems,
	getOwnSheet,
	getSheet,
	grantCombatXp,
	listCharacters,
	listConsequences,
	removeItem,
	removeStatus,
	setEquipment,
	setOwnPortrait,
	setStatus,
	sheetForExport,
	strikeCharacter,
	updateIdentity
} from './characters';
import { isSafePortraitUrl } from '../../schemas/characters';

const A = DEMO_IDS.accounts;
const P = DEMO_IDS.characters;
const alice: Actor = { accountId: A.alice, role: 'joueur', characterId: P.aria, pseudo: 'alice' };
const bob: Actor = { accountId: A.bob, role: 'joueur', characterId: P.kael, pseudo: 'bob' };
const nova: Actor = { accountId: A.nova, role: 'joueur', characterId: null, pseudo: 'nova' };
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

async function character(db: Db, id: string) {
	const [row] = await db.select().from(characters).where(eq(characters.id, id));
	return row;
}

async function rev(db: Db, id: string): Promise<number> {
	return (await character(db, id)).revision;
}

async function historyCount(db: Db, id: string): Promise<number> {
	const [{ n }] = await db
		.select({ n: count() })
		.from(characterHistory)
		.where(eq(characterHistory.characterId, id));
	return n;
}

async function lastHistory(db: Db, id: string) {
	const [row] = await db
		.select()
		.from(characterHistory)
		.where(eq(characterHistory.characterId, id))
		.orderBy(desc(characterHistory.id))
		.limit(1);
	return row;
}

async function staffLogCount(db: Db): Promise<number> {
	const [{ n }] = await db.select({ n: count() }).from(staffLog);
	return n;
}

async function itemQty(db: Db, itemId: string): Promise<number> {
	const [row] = await db.select().from(characterItems).where(eq(characterItems.id, itemId));
	return row.qty;
}

/** Fait échouer toute insertion dans `table` (dernière étape des mutations) : test de rollback. */
async function failInsertsInto(db: Db, table: 'staff_log' | 'audit_log') {
	await db.execute(
		sql.raw(
			`CREATE OR REPLACE FUNCTION np_test_fail() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'échec simulé'; END $$ LANGUAGE plpgsql`
		)
	);
	await db.execute(
		sql.raw(
			`CREATE TRIGGER np_test_fail_${table} BEFORE INSERT ON ${table} FOR EACH ROW EXECUTE FUNCTION np_test_fail()`
		)
	);
	return async () => {
		await db.execute(sql.raw(`DROP TRIGGER np_test_fail_${table} ON ${table}`));
	};
}

describe('lectures de la fiche', () => {
	let t: TestDb;
	beforeAll(async () => {
		t = await createTestDb({ demo: true });
	});
	afterAll(async () => t.close());

	it('getOwnSheet construit la fiche complète du joueur relié', async () => {
		await t.db.insert(declarations).values([
			{ id: 'd_t1', characterId: P.aria, resource: 'ep', delta: -8, word: 'Esquive' },
			{ id: 'd_t2', characterId: P.aria, resource: 'ep', delta: -2, word: 'Bloquer' },
			{
				id: 'd_t3',
				characterId: P.aria,
				resource: 'pv',
				delta: -5,
				word: 'subis',
				status: 'annulee'
			}
		]);
		const sheet = await getOwnSheet(t.db, alice);
		expect(sheet).not.toBeNull();
		if (!sheet) return;
		expect(sheet.name).toBe('Aria Lunval');
		expect(sheet.oath).toMatchObject({
			id: 'duelliste',
			name: 'Duelliste',
			rank: 'basic',
			rankLabel: 'Basique',
			weapon: 'Épée moyenne du serment',
			lineage: null,
			category: 'melee'
		});
		expect(sheet.branch).toBe("Branche A — L'Élan Tranchant");
		expect(sheet).toMatchObject({ level: 7, xp: 140, xpMax: 210 });
		expect(sheet.pv).toEqual({ cur: 51, max: 66 });
		expect(sheet.pendingDeclared).toEqual({ pv: 0, ep: -10, em: 0 });
		expect(sheet.statuses.map((s) => [s.id, s.label, s.color, s.turns])).toEqual([
			['saignement', 'Saignement', '#c94a4a', null],
			['inspire', 'Inspiré', '#d8c27a', null]
		]);
		expect(sheet.gems).toEqual([
			{ kind: 'blanche', label: 'Blanche', color: '#e8e8f8', qty: 3 },
			{ kind: 'incarnate', label: 'Incarnate', color: '#9a74c4', qty: 1 }
		]);
		// Paliers 2/5/7/10 (Basique) : trois atteints au niveau 7, le suivant au niveau 10.
		expect(sheet.tiers.reached.map((tier) => tier.level)).toEqual([2, 5, 7]);
		expect(sheet.tiers.reached[0].stage).toBe('Débloqué');
		expect(sheet.tiers.next.map((tier) => [tier.level, tier.stage])).toEqual([[10, 'Parachevé']]);
		expect(sheet.equipment).toEqual({ helmet: null, chest: 'Cape de brume', legs: null });
		expect(sheet.items.map((i) => i.id)).toContain('i_demo_potion');
		expect(sheet.linkedPseudo).toBe('alice');
		expect(new Date(sheet.releveAt).toString()).not.toBe('Invalid Date');
		expect(sheet.revision).toBe(1);
	});

	it('un Serment d’évolution donne sa lignée', async () => {
		await t.db.update(characters).set({ oathId: 'bretteur' }).where(eq(characters.id, P.seren));
		const sheet = await getSheet(t.db, mj, P.seren);
		expect(sheet.oath.lineage).toBe('Duelliste');
		expect(sheet.oath.rankLabel).toBe('Aguerri');
		expect(sheet.branch).toBeNull();
		expect(sheet.tiers).toEqual({ reached: [], next: [] });
		await t.db.update(characters).set({ oathId: 'rodeur' }).where(eq(characters.id, P.seren));
	});

	it('getOwnSheet : null pour un compte en attente ou un staff sans personnage, 401 sans session', async () => {
		expect(await getOwnSheet(t.db, nova)).toBeNull();
		expect(await getOwnSheet(t.db, mj)).toBeNull();
		await expectNpError(getOwnSheet(t.db, null), 'UNAUTHENTICATED', 401);
	});

	it('getSheet : MJ et admin lisent toute fiche ; un autre joueur et le designer sont refusés', async () => {
		expect((await getSheet(t.db, mj, P.aria)).id).toBe(P.aria);
		expect((await getSheet(t.db, admin, P.kael)).id).toBe(P.kael);
		expect((await getSheet(t.db, alice, P.aria)).id).toBe(P.aria);
		await expectNpError(getSheet(t.db, bob, P.aria), 'FORBIDDEN', 403);
		await expectNpError(getSheet(t.db, designer, P.aria), 'FORBIDDEN', 403);
		await expectNpError(getSheet(t.db, null, P.aria), 'UNAUTHENTICATED', 401);
		await expectNpError(getSheet(t.db, mj, 'p_inconnu'), 'NOT_FOUND', 404);
	});

	it('listCharacters : filtres, liaison, dernier tampon ; réservé MJ et admin', async () => {
		const all = await listCharacters(t.db, mj);
		expect(all.map((r) => r.name)).toEqual(['Aria Lunval', 'Kael Morvan', 'Seren Vallombre']);
		const aria = all.find((r) => r.id === P.aria);
		expect(aria?.linkedPseudo).toBe('alice');
		expect(aria?.oath).toMatchObject({ name: 'Duelliste', rankLabel: 'Basique' });
		expect(aria?.lastStamp).toMatchObject({
			role: 'MJ',
			name: 'mj',
			motif: 'Blessure reçue au gué.'
		});
		expect(all.find((r) => r.id === P.seren)?.lastStamp).toBeNull();
		expect((await listCharacters(t.db, admin, { linked: false })).map((r) => r.id)).toEqual([
			P.seren
		]);
		expect((await listCharacters(t.db, mj, { linked: true })).length).toBe(2);
		expect((await listCharacters(t.db, mj, { search: 'kael' })).map((r) => r.id)).toEqual([P.kael]);
		expect((await listCharacters(t.db, mj, { search: 'alice' })).map((r) => r.id)).toEqual([
			P.aria
		]);
		expect((await listCharacters(t.db, mj, { oathId: 'arcaniste' })).map((r) => r.id)).toEqual([
			P.kael
		]);
		await expectNpError(listCharacters(t.db, alice), 'FORBIDDEN', 403);
		await expectNpError(listCharacters(t.db, designer), 'FORBIDDEN', 403);
		await expectNpError(listCharacters(t.db, null), 'UNAUTHENTICATED', 401);
	});

	it('listConsequences : tampon, signature, filtres, droits', async () => {
		const page = await listConsequences(t.db, alice);
		expect(page.page).toBe(1);
		expect(page.pages).toBe(1);
		const first = page.rows[0];
		expect(first.text).toBe('PV : 66 → 51.');
		expect(first.stamp).toEqual({ role: 'MJ', name: 'mj' });
		expect(first).toMatchObject({ field: 'pv', oldValue: '66', newValue: '51', struck: false });
		const gem = page.rows.find((r) => r.kind === 'gemme');
		expect(gem?.signature).toBe('toi');
		expect(gem?.stamp).toBeNull();
		const created = page.rows.find((r) => r.kind === 'add');
		expect(created?.signature).toBe('regles');
		expect(
			(await listConsequences(t.db, mj, { characterId: P.aria, filter: 'item' })).rows
		).toHaveLength(1);
		expect(
			(await listConsequences(t.db, mj, { characterId: P.aria, filter: 'combat' })).rows[0].combatId
		).toBe(DEMO_IDS.combat);
		await expectNpError(listConsequences(t.db, bob, { characterId: P.aria }), 'FORBIDDEN', 403);
		await expectNpError(
			listConsequences(t.db, designer, { characterId: P.aria }),
			'FORBIDDEN',
			403
		);
		await expectNpError(listConsequences(t.db, nova), 'NOT_LINKED', 403);
	});

	it('listConsequences : 20 lignes par page, les plus récentes d’abord', async () => {
		await t.db.insert(characterHistory).values(
			Array.from({ length: 25 }, (_, i) => ({
				characterId: P.seren,
				ts: new Date(Date.UTC(2026, 0, 1, 0, i)),
				type: 'add' as const,
				text: `Ligne ${i}`,
				actorName: 'Système',
				actorRole: 'regles' as const
			}))
		);
		const p1 = await listConsequences(t.db, mj, { characterId: P.seren });
		expect(p1.pages).toBe(2);
		expect(p1.rows).toHaveLength(20);
		expect(p1.rows[0].text).toBe('Ligne 24');
		const p2 = await listConsequences(t.db, mj, { characterId: P.seren, page: 2 });
		expect(p2.rows).toHaveLength(5);
		expect(p2.rows[4].text).toBe('Ligne 0');
	});

	it('sheetForExport : le propriétaire et le staff, jamais un autre joueur', async () => {
		const own = await sheetForExport(t.db, alice);
		expect(own.sheet.id).toBe(P.aria);
		expect(own.consequences.length).toBeGreaterThan(0);
		expect((await sheetForExport(t.db, mj, P.kael)).sheet.id).toBe(P.kael);
		await expectNpError(sheetForExport(t.db, bob, P.aria), 'FORBIDDEN', 403);
		await expectNpError(sheetForExport(t.db, nova), 'NOT_LINKED', 403);
	});
});

describe('mutations du staff', () => {
	let t: TestDb;
	beforeAll(async () => {
		t = await createTestDb({ demo: true });
	});
	afterAll(async () => t.close());

	it('createCharacter : bases 30/50/20, niveau 1, arme du Serment, tampon et journal staff', async () => {
		const before = await staffLogCount(t.db);
		const sheet = await createCharacter(t.db, mj, {
			name: '  Lys Ombreval ',
			oathId: 'croise',
			portraitUrl: 'https://i.imgur.com/lys.png'
		});
		expect(sheet.id).toMatch(/^p_/);
		expect(sheet).toMatchObject({ name: 'Lys Ombreval', level: 1, xp: 0, xpMax: 30, revision: 1 });
		expect([sheet.pv, sheet.ep, sheet.em]).toEqual([
			{ cur: 30, max: 30 },
			{ cur: 50, max: 50 },
			{ cur: 20, max: 20 }
		]);
		expect(sheet.oath.weapon).toBe('Bouclier du serment');
		expect(sheet.portraitUrl).toBe('https://i.imgur.com/lys.png');
		expect(sheet.branch).toBeNull();
		const h = await lastHistory(t.db, sheet.id);
		expect(h).toMatchObject({ actorRole: 'mj', actorName: 'MJ mj', motif: 'Nouveau personnage.' });
		expect(await staffLogCount(t.db)).toBe(before + 1);
		const [log] = await t.db.select().from(staffLog).orderBy(desc(staffLog.id)).limit(1);
		expect(log).toMatchObject({ action: 'personnage_cree', actorName: 'mj' });
		const [audit] = await t.db.select().from(auditLog).orderBy(desc(auditLog.id)).limit(1);
		expect(audit).toMatchObject({ source: 'characters', action: 'character_create' });
	});

	it('createCharacter : refus par rôle et saisies invalides', async () => {
		await expectNpError(
			createCharacter(t.db, alice, { name: 'X', oathId: 'croise' }),
			'FORBIDDEN',
			403
		);
		await expectNpError(
			createCharacter(t.db, designer, { name: 'X', oathId: 'croise' }),
			'FORBIDDEN',
			403
		);
		await expectNpError(
			createCharacter(t.db, null, { name: 'X', oathId: 'croise' }),
			'UNAUTHENTICATED',
			401
		);
		await expectNpError(
			createCharacter(t.db, admin, { name: '', oathId: 'croise' }),
			'INVALID',
			400
		);
		await expectNpError(
			createCharacter(t.db, admin, { name: 'X'.repeat(81), oathId: 'croise' }),
			'INVALID',
			400
		);
		await expectNpError(
			createCharacter(t.db, admin, { name: 'X', oathId: 'inconnu' }),
			'NOT_FOUND',
			404
		);
		// Serment masqué (Aguerri) : absent du sélecteur de création.
		await expectNpError(
			createCharacter(t.db, admin, { name: 'X', oathId: 'bretteur' }),
			'INVALID',
			400
		);
		await expectNpError(
			createCharacter(t.db, admin, {
				name: 'X',
				oathId: 'croise',
				portraitUrl: 'javascript:alert(1)'
			}),
			'INVALID',
			400
		);
	});

	it('correctResource : ancienne → nouvelle valeur, tampon, révision incrémentée', async () => {
		const r = await rev(t.db, P.kael);
		const sheet = await correctResource(t.db, mj, {
			characterId: P.kael,
			resource: 'ep',
			newValue: 30,
			motif: 'Erreur de report',
			expectedRevision: r
		});
		expect(sheet.ep).toEqual({ cur: 30, max: 52 });
		expect(sheet.revision).toBe(r + 1);
		const h = await lastHistory(t.db, P.kael);
		expect(h).toMatchObject({
			type: 'stat',
			text: 'EP : 44 → 30.',
			field: 'ep',
			oldValue: '44',
			newValue: '30',
			motif: 'Erreur de report',
			actorRole: 'mj',
			actorAccountId: A.mj
		});
		const page = await listConsequences(t.db, bob);
		expect(page.rows[0].stamp).toEqual({ role: 'MJ', name: 'mj' });
	});

	it('correctResource : une correction rature la conséquence visée', async () => {
		const target = await lastHistory(t.db, P.kael);
		await correctResource(t.db, admin, {
			characterId: P.kael,
			resource: 'ep',
			newValue: 44,
			motif: 'Retour à la valeur juste',
			replacesId: String(target.id),
			expectedRevision: await rev(t.db, P.kael)
		});
		const rows = (await listConsequences(t.db, mj, { characterId: P.kael })).rows;
		expect(rows[0]).toMatchObject({
			replacesId: String(target.id),
			stamp: { role: 'Admin', name: 'admin' }
		});
		expect(rows.find((r) => r.id === String(target.id))?.struck).toBe(true);
	});

	it('correctResource : 428 sans version, 409 périmée, 400 hors bornes ou sans motif, 403 joueur et designer', async () => {
		const base = { characterId: P.kael, resource: 'pv' as const, newValue: 10, motif: 'm' };
		await expectNpError(correctResource(t.db, mj, base as never), 'VERSION_REQUIRED', 428);
		await expectNpError(
			correctResource(t.db, mj, { ...base, expectedRevision: 1 }),
			'VERSION_CONFLICT',
			409
		);
		const r = await rev(t.db, P.kael);
		await expectNpError(
			correctResource(t.db, mj, { ...base, newValue: 999, expectedRevision: r }),
			'INVALID',
			400
		);
		await expectNpError(
			correctResource(t.db, mj, { ...base, newValue: -1, expectedRevision: r }),
			'INVALID',
			400
		);
		await expectNpError(
			correctResource(t.db, mj, { ...base, motif: '  ', expectedRevision: r }),
			'INVALID',
			400
		);
		await expectNpError(
			correctResource(t.db, bob, { ...base, expectedRevision: r }),
			'FORBIDDEN',
			403
		);
		await expectNpError(
			correctResource(t.db, designer, { ...base, expectedRevision: r }),
			'FORBIDDEN',
			403
		);
		await expectNpError(
			correctResource(t.db, mj, { ...base, characterId: 'p_x', expectedRevision: r }),
			'NOT_FOUND',
			404
		);
		expect(await rev(t.db, P.kael)).toBe(r);
	});

	it('grantCombatXp : ceil(niveau × 10 × participation %), montée de niveau et gains du Serment', async () => {
		// Kael : Arcaniste (1/1/8), niveau 3, 40/90 XP.
		const r = await rev(t.db, P.kael);
		const before = await historyCount(t.db, P.kael);
		const sheet = await grantCombatXp(t.db, mj, {
			characterId: P.kael,
			beastLevel: 5,
			participationPct: 100,
			beastName: 'Vouivre du canyon',
			combatId: DEMO_IDS.combat,
			motif: 'Combat archivé',
			expectedRevision: r
		});
		expect(sheet).toMatchObject({ level: 4, xp: 0, xpMax: 120 });
		expect(sheet.pv).toEqual({ cur: 33, max: 33 });
		expect(sheet.em).toEqual({ cur: 44, max: 44 });
		expect(await historyCount(t.db, P.kael)).toBe(before + 2);
		const rows = (await listConsequences(t.db, bob, { filter: 'xp' })).rows;
		const xpRow = rows.find((x) => x.kind === 'xp');
		const levelRow = rows.find((x) => x.kind === 'level');
		expect(xpRow).toMatchObject({
			text: '+50 XP (Vouivre du canyon, 100%)',
			oldValue: 'niv. 3 · 40 XP',
			newValue: 'niv. 4 · 0 XP',
			motif: 'Combat archivé',
			combatId: DEMO_IDS.combat,
			stamp: { role: 'MJ', name: 'mj' }
		});
		expect(levelRow).toMatchObject({
			text: '⬆ Niveau 4 ! PV:33 EP:53 EM:44',
			signature: 'regles',
			oldValue: '3',
			newValue: '4'
		});
	});

	it('grantCombatXp : arrondi supérieur, XP nulle refusée, combat inconnu, droits', async () => {
		const r = await rev(t.db, P.kael);
		const sheet = await grantCombatXp(t.db, admin, {
			characterId: P.kael,
			beastLevel: 3,
			participationPct: 33,
			motif: 'Escarmouche',
			expectedRevision: r
		});
		expect(sheet.xp).toBe(10); // ceil(3 × 10 × 0,33) = ceil(9,9)
		const base = { characterId: P.kael, beastLevel: 3, participationPct: 0, motif: 'm' };
		await expectNpError(
			grantCombatXp(t.db, mj, { ...base, expectedRevision: r + 1 }),
			'INVALID',
			400
		);
		await expect(grantCombatXp(t.db, mj, { ...base, expectedRevision: r + 1 })).rejects.toThrow(
			'XP = 0. Ajuste la participation.'
		);
		await expectNpError(
			grantCombatXp(t.db, mj, {
				...base,
				participationPct: 50,
				combatId: 'c_x',
				expectedRevision: r + 1
			}),
			'NOT_FOUND',
			404
		);
		await expectNpError(
			grantCombatXp(t.db, mj, { ...base, participationPct: 50 } as never),
			'VERSION_REQUIRED',
			428
		);
		await expectNpError(
			grantCombatXp(t.db, mj, { ...base, participationPct: 50, expectedRevision: r }),
			'VERSION_CONFLICT',
			409
		);
		await expectNpError(
			grantCombatXp(t.db, alice, { ...base, participationPct: 50, expectedRevision: r + 1 }),
			'FORBIDDEN',
			403
		);
	});

	it('fuseGems : +5 par Gemme Blanche, stock retiré, une transaction', async () => {
		const r = await rev(t.db, P.aria);
		const sheet = await fuseGems(t.db, mj, {
			characterId: P.aria,
			kind: 'blanche',
			qty: 2,
			motif: 'Fusion demandée en scène',
			expectedRevision: r
		});
		expect(sheet.xp).toBe(150);
		expect(sheet.gems.find((g) => g.kind === 'blanche')?.qty).toBe(1);
		expect(await itemQty(t.db, 'i_demo_gemme_blanche')).toBe(1);
		const h = await lastHistory(t.db, P.aria);
		expect(h).toMatchObject({
			type: 'gemme',
			text: '+10 XP (fusion de 2× Gemme Blanche)',
			field: 'xp',
			oldValue: '140',
			newValue: '150',
			motif: 'Fusion demandée en scène'
		});
	});

	it('fuseGems : +20 par Incarnate ; refus si le stock est insuffisant, rien n’est écrit', async () => {
		const r = await rev(t.db, P.aria);
		const before = await historyCount(t.db, P.aria);
		await expectNpError(
			fuseGems(t.db, mj, {
				characterId: P.aria,
				kind: 'incarnate',
				qty: 2,
				motif: 'm',
				expectedRevision: r
			}),
			'GEM_STOCK_INSUFFICIENT',
			409
		);
		await expect(
			fuseGems(t.db, mj, {
				characterId: P.aria,
				kind: 'ecarlate',
				qty: 1,
				motif: 'm',
				expectedRevision: r
			})
		).rejects.toThrow('Pas assez de gemmes en inventaire (0 disponible(s)).');
		expect(await rev(t.db, P.aria)).toBe(r);
		expect(await historyCount(t.db, P.aria)).toBe(before);
		await expectNpError(
			fuseGems(t.db, mj, {
				characterId: P.aria,
				kind: 'incarnate',
				qty: 100,
				motif: 'm',
				expectedRevision: r
			}),
			'INVALID',
			400
		);
		const sheet = await fuseGems(t.db, admin, {
			characterId: P.aria,
			kind: 'incarnate',
			qty: 1,
			motif: 'Fusion',
			expectedRevision: r
		});
		expect(sheet.xp).toBe(170);
		expect(sheet.gems.find((g) => g.kind === 'incarnate')).toBeUndefined();
		await expectNpError(
			fuseGems(t.db, bob, {
				characterId: P.aria,
				kind: 'blanche',
				qty: 1,
				motif: 'm',
				expectedRevision: r + 1
			}),
			'FORBIDDEN',
			403
		);
	});

	it('fuseGems : un échec en fin de transaction annule tout (XP, stock, historique, révision)', async () => {
		const r = await rev(t.db, P.aria);
		const xp = (await character(t.db, P.aria)).xp;
		const qty = await itemQty(t.db, 'i_demo_gemme_blanche');
		const before = await historyCount(t.db, P.aria);
		const restore = await failInsertsInto(t.db, 'staff_log');
		try {
			await expect(
				fuseGems(t.db, mj, {
					characterId: P.aria,
					kind: 'blanche',
					qty: 1,
					motif: 'm',
					expectedRevision: r
				})
			).rejects.toThrow();
		} finally {
			await restore();
		}
		expect(await rev(t.db, P.aria)).toBe(r);
		expect((await character(t.db, P.aria)).xp).toBe(xp);
		expect(await itemQty(t.db, 'i_demo_gemme_blanche')).toBe(qty);
		expect(await historyCount(t.db, P.aria)).toBe(before);
	});

	it('addItem : cumul si même nom et même catégorie, sinon nouvel objet', async () => {
		let sheet = await addItem(t.db, mj, {
			characterId: P.aria,
			name: 'Potion de soin',
			category: 'Consommable',
			qty: 2,
			note: 'Trouvée au gué',
			motif: 'Butin',
			expectedRevision: await rev(t.db, P.aria)
		});
		expect(sheet.items.find((i) => i.id === 'i_demo_potion')?.qty).toBe(4);
		const h = await lastHistory(t.db, P.aria);
		expect(h).toMatchObject({
			type: 'item',
			text: 'Ajout : 2× Potion de soin — Trouvée au gué',
			oldValue: 'Potion de soin ×2',
			newValue: 'Potion de soin ×4'
		});
		sheet = await addItem(t.db, mj, {
			characterId: P.aria,
			name: 'Potion de soin',
			category: 'Divers',
			qty: 1,
			motif: 'Butin',
			expectedRevision: sheet.revision
		});
		expect(sheet.items.filter((i) => i.name === 'Potion de soin')).toHaveLength(2);
		await expectNpError(
			addItem(t.db, mj, {
				characterId: P.aria,
				name: 'X',
				category: 'Arme' as 'Divers',
				qty: 1,
				motif: 'm',
				expectedRevision: sheet.revision
			}),
			'INVALID',
			400
		);
		await expectNpError(
			addItem(t.db, designer, {
				characterId: P.aria,
				name: 'X',
				category: 'Divers',
				qty: 1,
				motif: 'm',
				expectedRevision: sheet.revision
			}),
			'FORBIDDEN',
			403
		);
	});

	it('removeItem : quantité planchée à 0, objet conservé mais invisible ; ITEM_UNAVAILABLE ensuite', async () => {
		const sheet = await removeItem(t.db, mj, {
			characterId: P.aria,
			itemId: 'i_demo_carte',
			qty: 5,
			note: 'Perdue dans le canyon',
			motif: 'Scène du gué',
			expectedRevision: await rev(t.db, P.aria)
		});
		expect(await itemQty(t.db, 'i_demo_carte')).toBe(0);
		expect(sheet.items.find((i) => i.id === 'i_demo_carte')).toBeUndefined();
		expect((await lastHistory(t.db, P.aria)).text).toBe(
			'Retrait : 1× Carte du canyon — Perdue dans le canyon'
		);
		await expectNpError(
			removeItem(t.db, mj, {
				characterId: P.aria,
				itemId: 'i_demo_carte',
				qty: 1,
				motif: 'm',
				expectedRevision: sheet.revision
			}),
			'ITEM_UNAVAILABLE',
			409
		);
		// L'objet d'un autre personnage n'est jamais trouvé par son seul identifiant global.
		await expectNpError(
			removeItem(t.db, mj, {
				characterId: P.aria,
				itemId: 'i_demo_kael_potion',
				qty: 1,
				motif: 'm',
				expectedRevision: sheet.revision
			}),
			'NOT_FOUND',
			404
		);
	});

	it('setStatus / removeStatus : les 12 statuts, note, tampon', async () => {
		let sheet = await setStatus(t.db, mj, {
			characterId: P.kael,
			statusId: 'gel',
			note: 'jambe gauche',
			motif: 'Souffle de la vouivre',
			expectedRevision: await rev(t.db, P.kael)
		});
		expect(sheet.statuses).toEqual([
			{ id: 'gel', label: 'Gel', color: '#7eb8d4', turns: null, note: 'jambe gauche' }
		]);
		expect((await lastHistory(t.db, P.kael)).text).toBe('⚠ Gel (jambe gauche)');
		await expectNpError(
			setStatus(t.db, mj, {
				characterId: P.kael,
				statusId: 'invisible' as 'gel',
				motif: 'm',
				expectedRevision: sheet.revision
			}),
			'INVALID',
			400
		);
		await expectNpError(
			removeStatus(t.db, mj, {
				characterId: P.kael,
				statusId: 'peur',
				motif: 'm',
				expectedRevision: sheet.revision
			}),
			'NOT_FOUND',
			404
		);
		sheet = await removeStatus(t.db, admin, {
			characterId: P.kael,
			statusId: 'gel',
			motif: 'Dégel',
			expectedRevision: sheet.revision
		});
		expect(sheet.statuses).toEqual([]);
		expect(await lastHistory(t.db, P.kael)).toMatchObject({
			text: '✓ Retiré : Gel',
			field: 'status'
		});
		await expectNpError(
			setStatus(t.db, bob, {
				characterId: P.kael,
				statusId: 'peur',
				motif: 'm',
				expectedRevision: sheet.revision
			}),
			'FORBIDDEN',
			403
		);
	});

	it('setEquipment : une ligne par emplacement changé ; rien à changer refusé', async () => {
		const sheet = await setEquipment(t.db, mj, {
			characterId: P.aria,
			equipment: { helmet: 'Heaume de givre', chest: 'Cape de brume' },
			motif: 'Armurerie',
			expectedRevision: await rev(t.db, P.aria)
		});
		expect(sheet.equipment).toEqual({
			helmet: 'Heaume de givre',
			chest: 'Cape de brume',
			legs: null
		});
		expect(await lastHistory(t.db, P.aria)).toMatchObject({
			text: 'Casque : rien → Heaume de givre',
			field: 'equipment'
		});
		await expectNpError(
			setEquipment(t.db, mj, {
				characterId: P.aria,
				equipment: { helmet: 'Heaume de givre' },
				motif: 'm',
				expectedRevision: sheet.revision
			}),
			'INVALID',
			400
		);
		await expectNpError(
			setEquipment(t.db, alice, {
				characterId: P.aria,
				equipment: { legs: 'Bottes' },
				motif: 'm',
				expectedRevision: sheet.revision
			}),
			'FORBIDDEN',
			403
		);
	});

	it('updateIdentity : admin seulement ; nom, branche, Serment (arme reprise), niveau ±', async () => {
		const r = await rev(t.db, P.aria);
		await expectNpError(
			updateIdentity(t.db, mj, {
				characterId: P.aria,
				name: 'Aria',
				motif: 'm',
				expectedRevision: r
			}),
			'FORBIDDEN',
			403
		);
		let sheet = await updateIdentity(t.db, admin, {
			characterId: P.aria,
			// Rapprochement tolérant (branchMatchesLabel) : le nom court suffit, le nom complet est stocké.
			branch: 'taille double',
			motif: 'Choix de branche validé',
			expectedRevision: r
		});
		expect(sheet.branch).toBe('Branche B — Taille Double');
		await expectNpError(
			updateIdentity(t.db, admin, {
				characterId: P.aria,
				branch: 'Branche Z — Inventée',
				motif: 'm',
				expectedRevision: sheet.revision
			}),
			'INVALID',
			400
		);
		sheet = await updateIdentity(t.db, admin, {
			characterId: P.aria,
			oathId: 'croise',
			name: 'Aria Lunval-Croisée',
			motif: 'Changement de Serment validé en scène',
			expectedRevision: sheet.revision
		});
		expect(sheet.name).toBe('Aria Lunval-Croisée');
		expect(sheet.oath.id).toBe('croise');
		expect(sheet.oath.weapon).toBe('Bouclier du serment');
		expect(sheet.branch).toBeNull(); // la branche du Duelliste n'existe pas chez le Croisé
		expect(sheet.level).toBe(7); // niveau et XP conservés
		const serment = (
			await listConsequences(t.db, admin, { characterId: P.aria, filter: 'serment' })
		).rows;
		expect(serment.map((s) => s.field).sort()).toEqual(['branch', 'branch', 'oath']);
		sheet = await updateIdentity(t.db, admin, {
			characterId: P.aria,
			levelDelta: -1,
			motif: 'Correction de niveau',
			expectedRevision: sheet.revision
		});
		// Croisé 8/3/2 au niveau 6 : 70 / 65 / 30.
		expect(sheet.level).toBe(6);
		expect([sheet.pv.max, sheet.ep.max, sheet.em.max]).toEqual([70, 65, 30]);
		expect(await lastHistory(t.db, P.aria)).toMatchObject({
			text: 'Ajust. Niveau : 7 → 6',
			field: 'level'
		});
		await expectNpError(
			updateIdentity(t.db, admin, {
				characterId: P.aria,
				motif: 'm',
				expectedRevision: sheet.revision
			}),
			'INVALID',
			400
		);
		await expectNpError(
			updateIdentity(t.db, admin, {
				characterId: P.aria,
				name: 'Z',
				motif: 'm',
				expectedRevision: r
			}),
			'VERSION_CONFLICT',
			409
		);
	});
});

describe('rayer un personnage', () => {
	let t: TestDb;
	beforeAll(async () => {
		t = await createTestDb({ demo: true });
	});
	afterAll(async () => t.close());

	it('saisie du nom exigée, admin seulement', async () => {
		const r = await rev(t.db, P.kael);
		await expectNpError(
			strikeCharacter(t.db, mj, {
				characterId: P.kael,
				typedName: 'Kael Morvan',
				expectedRevision: r
			}),
			'FORBIDDEN',
			403
		);
		await expectNpError(
			strikeCharacter(t.db, admin, { characterId: P.kael, typedName: 'Kael', expectedRevision: r }),
			'INVALID',
			400
		);
		await expectNpError(
			strikeCharacter(t.db, admin, { characterId: P.kael, typedName: 'Kael Morvan' } as never),
			'VERSION_REQUIRED',
			428
		);
		expect((await character(t.db, P.kael)).extra).not.toHaveProperty('struckAt');
	});

	it('le personnage rayé sort des pages, son compte est délié, rien n’est supprimé', async () => {
		const r = await rev(t.db, P.kael);
		const res = await strikeCharacter(t.db, admin, {
			characterId: P.kael,
			typedName: 'Kael Morvan',
			expectedRevision: r
		});
		expect(res.id).toBe(P.kael);
		expect((await listCharacters(t.db, admin)).map((c) => c.id)).not.toContain(P.kael);
		await expectNpError(getSheet(t.db, mj, P.kael), 'NOT_FOUND', 404);
		expect(await getOwnSheet(t.db, bob)).toBeNull();
		const [account] = await t.db.select().from(accounts).where(eq(accounts.id, A.bob));
		expect(account.characterId).toBeNull();
		expect(await character(t.db, P.kael)).toBeDefined();
		// L'administrateur peut encore l'exporter (Registre › Données).
		expect((await sheetForExport(t.db, admin, P.kael)).sheet.id).toBe(P.kael);
		const [log] = await t.db.select().from(staffLog).orderBy(desc(staffLog.id)).limit(1);
		expect(log.action).toBe('personnage_supprime');
	});
});

describe('actions du joueur', () => {
	let t: TestDb;
	beforeAll(async () => {
		t = await createTestDb({ demo: true });
	});
	afterAll(async () => t.close());

	it('isSafePortraitUrl : formats acceptés et charges dangereuses refusées (audit 05 §3.2)', () => {
		const png = `data:image/png;base64,${'A'.repeat(100)}`;
		expect(isSafePortraitUrl('')).toBe(true);
		expect(isSafePortraitUrl(png)).toBe(true);
		expect(isSafePortraitUrl('data:image/jpeg;base64,QUJD')).toBe(true);
		expect(isSafePortraitUrl('https://i.imgur.com/a.png')).toBe(true);
		expect(isSafePortraitUrl('images/portraits/aria.webp')).toBe(true);
		expect(isSafePortraitUrl(`data:image/png;base64,${'A'.repeat(350_001)}`)).toBe(false);
		for (const bad of [
			'javascript:alert(1)',
			'data:image/svg+xml;base64,PHN2Zz4=',
			'data:text/html;base64,PGI+',
			'https://user:pass@example.com/a.png',
			'x" onerror="alert(1)',
			'//evil.example/a.png',
			'a.png?x=1&y=2',
			'https://exa mple.com/a.png',
			'vbscript:msgbox',
			'<img src=x>'
		]) {
			expect(isSafePortraitUrl(bad), bad).toBe(false);
		}
	});

	it('setOwnPortrait : propre fiche, contrôle de version, 400 sur un portrait dangereux', async () => {
		const r = await rev(t.db, P.aria);
		const sheet = await setOwnPortrait(t.db, alice, {
			url: 'https://cdn.discordapp.com/a.png',
			expectedRevision: r
		});
		expect(sheet.portraitUrl).toBe('https://cdn.discordapp.com/a.png');
		expect(sheet.revision).toBe(r + 1);
		await expectNpError(setOwnPortrait(t.db, alice, { url: '' } as never), 'VERSION_REQUIRED', 428);
		await expectNpError(
			setOwnPortrait(t.db, alice, { url: '', expectedRevision: r }),
			'VERSION_CONFLICT',
			409
		);
		await expectNpError(
			setOwnPortrait(t.db, alice, { url: 'javascript:alert(1)', expectedRevision: r + 1 }),
			'INVALID',
			400
		);
		await expectNpError(
			setOwnPortrait(t.db, alice, {
				url: '',
				expectedRevision: r + 1,
				characterId: P.kael
			} as never),
			'INVALID',
			400
		);
		await expectNpError(
			setOwnPortrait(t.db, nova, { url: '', expectedRevision: 1 }),
			'NOT_LINKED',
			403
		);
		await expectNpError(
			setOwnPortrait(t.db, mj, { url: '', expectedRevision: 1 }),
			'NOT_LINKED',
			403
		);
		await expectNpError(
			setOwnPortrait(t.db, null, { url: '', expectedRevision: 1 }),
			'UNAUTHENTICATED',
			401
		);
		const cleared = await setOwnPortrait(t.db, alice, { url: '', expectedRevision: r + 1 });
		expect(cleared.portraitUrl).toBe('');
	});

	it('consumeOwnItem : quantité − 1, ligne « Consommé : <nom> — <note> » signée par le joueur, révision', async () => {
		const r = await rev(t.db, P.aria);
		const sheet = await consumeOwnItem(t.db, alice, {
			itemId: 'i_demo_potion',
			note: '  Après la chasse <b>  ',
			expectedRevision: r
		});
		expect(sheet.items.find((i) => i.id === 'i_demo_potion')?.qty).toBe(1);
		expect(sheet.revision).toBe(r + 1);
		const h = await lastHistory(t.db, P.aria);
		expect(h).toMatchObject({
			type: 'item',
			text: 'Consommé : Potion de soin — Après la chasse <b>',
			actorName: 'Aria Lunval (joueur)',
			actorRole: 'joueur',
			actorAccountId: A.alice
		});
		expect((await listConsequences(t.db, alice)).rows[0].signature).toBe('toi');
		// Kael n'a pas bougé.
		expect(await itemQty(t.db, 'i_demo_kael_potion')).toBe(1);
	});

	it('consumeOwnItem : identifiant hérité, objet d’un autre personnage, quantité nulle, saisies strictes', async () => {
		let r = await rev(t.db, P.aria);
		await consumeOwnItem(t.db, alice, { itemId: 'it1', expectedRevision: r });
		expect(await itemQty(t.db, 'i_demo_potion')).toBe(0);
		r += 1;
		await expectNpError(
			consumeOwnItem(t.db, alice, { itemId: 'i_demo_potion', expectedRevision: r }),
			'ITEM_UNAVAILABLE',
			409
		);
		await expectNpError(
			consumeOwnItem(t.db, alice, { itemId: 'i_demo_kael_potion', expectedRevision: r }),
			'NOT_FOUND',
			404
		);
		await expectNpError(
			consumeOwnItem(t.db, alice, { itemId: ' potion', expectedRevision: r }),
			'INVALID',
			400
		);
		await expectNpError(
			consumeOwnItem(t.db, alice, { itemId: '', expectedRevision: r }),
			'INVALID',
			400
		);
		await expectNpError(
			consumeOwnItem(t.db, alice, {
				itemId: 'i_demo_cape',
				note: 'x'.repeat(2001),
				expectedRevision: r
			}),
			'INVALID',
			400
		);
		await expectNpError(
			consumeOwnItem(t.db, alice, { itemId: 'i_demo_cape', expectedRevision: r, qty: 3 } as never),
			'INVALID',
			400
		);
		await expectNpError(
			consumeOwnItem(t.db, alice, { itemId: 'i_demo_cape' } as never),
			'VERSION_REQUIRED',
			428
		);
		await expectNpError(
			consumeOwnItem(t.db, alice, { itemId: 'i_demo_cape', expectedRevision: r - 1 }),
			'VERSION_CONFLICT',
			409
		);
		await expectNpError(
			consumeOwnItem(t.db, mj, { itemId: 'i_demo_cape', expectedRevision: r }),
			'NOT_LINKED',
			403
		);
		await expectNpError(
			consumeOwnItem(t.db, null, { itemId: 'i_demo_cape', expectedRevision: r }),
			'UNAUTHENTICATED',
			401
		);
		expect(await rev(t.db, P.aria)).toBe(r);
	});

	it('consumeOwnItem : deux consommations avec la même version → une seule passe (409 pour l’autre)', async () => {
		const r = await rev(t.db, P.kael);
		const before = await historyCount(t.db, P.kael);
		const results = await Promise.allSettled([
			consumeOwnItem(t.db, bob, { itemId: 'i_demo_kael_potion', expectedRevision: r }),
			consumeOwnItem(t.db, bob, { itemId: 'i_demo_kael_potion', expectedRevision: r })
		]);
		expect(results.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
		const rejected = results.find((x) => x.status === 'rejected');
		expect(rejected && rejected.status === 'rejected' ? rejected.reason : null).toMatchObject({
			code: 'VERSION_CONFLICT',
			status: 409
		});
		expect(await itemQty(t.db, 'i_demo_kael_potion')).toBe(0);
		expect(await historyCount(t.db, P.kael)).toBe(before + 1);
	});

	it('consumeOwnItem : un échec en fin de transaction annule quantité, historique et révision', async () => {
		const r = await rev(t.db, P.aria);
		const before = await historyCount(t.db, P.aria);
		const restore = await failInsertsInto(t.db, 'audit_log');
		try {
			await expect(
				consumeOwnItem(t.db, alice, { itemId: 'i_demo_cape', expectedRevision: r })
			).rejects.toThrow();
		} finally {
			await restore();
		}
		expect(await itemQty(t.db, 'i_demo_cape')).toBe(1);
		expect(await historyCount(t.db, P.aria)).toBe(before);
		expect(await rev(t.db, P.aria)).toBe(r);
		const [{ n }] = await t.db
			.select({ n: count() })
			.from(auditLog)
			.where(and(eq(auditLog.action, 'consume_own_item'), eq(auditLog.actorAccountId, A.alice)));
		expect(n).toBeGreaterThan(0);
	});
});
