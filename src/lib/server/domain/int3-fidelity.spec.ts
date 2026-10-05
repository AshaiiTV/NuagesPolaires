import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import { DEMO_IDS as D } from '../db/seed';
import { characters, oaths, combats, characterHistory, beasts } from '../db/schema';
import type { Actor } from '../permissions';
import { getTable, getRecit, getPlayerTable, createTable } from './combats';
import { listConsequences, setStatus, grantCombatXp } from './characters';
import { getOath, updateOath } from './oaths';
import { publishExtract, listPublications, strikePublication } from './publications';
import { migrationStatus } from './admin';
import {
	fromLegacyArchive,
	getAbilityOptions,
	buildDeclaration,
	resolveRound,
	declareAction,
	rollDrop,
	assignDrop,
	type CombatState
} from '../../game/combat';
import { oathFromLegacyCustom } from '../../game/oaths';
import { normalizeOath } from '../legacy/normalize';
import { makeSnapshot, readSnapshot } from '../legacy/snapshot';
import { migrateSnapshot } from '../legacy/migrate';

const alice: Actor = {
	accountId: D.accounts.alice,
	pseudo: 'alice',
	role: 'joueur',
	characterId: D.characters.aria
};
const mj: Actor = { accountId: D.accounts.mj, pseudo: 'mj', role: 'mj', characterId: null };
const admin: Actor = {
	accountId: D.accounts.admin,
	pseudo: 'admin',
	role: 'admin',
	characterId: null
};
let t: TestDb;
beforeAll(async () => {
	t = await createTestDb({ demo: true });
});
afterAll(async () => {
	await t?.close();
});

describe('INT-3 : contexte et contrats de domaine', () => {
	it('B1/B2/B4 : démonstration réinitialisée, récit alice à deux résolutions et Table ouverte round 2', async () => {
		const recit = await getRecit(t.db, alice, D.combat);
		expect(recit.log.filter((e) => e.text.includes('Résolution Round'))).toHaveLength(2);
		expect(recit.participants).toEqual(
			expect.arrayContaining(['Aria Lunval', 'Kael Morvan', 'Vouivre du canyon'])
		);
		expect(recit).not.toHaveProperty('notes');
		expect((await getRecit(t.db, mj, D.combat)).notes).toContain('racines');
		const closed = await getPlayerTable(t.db, alice, D.combat);
		expect(closed).toMatchObject({ status: 'termine', recitId: D.combat });
		expect(closed.closedAt).not.toBeNull();
		const opened = await getTable(t.db, mj, D.openCombat);
		expect(opened.state).toMatchObject({ active: true, phase: 'declaration', round: 2 });
		expect(opened.state.fighters).toHaveLength(4);
		expect((await getPlayerTable(t.db, alice, D.openCombat)).status).toBe('en_cours');
		// Un redémarrage réel du handle mémoire doit reconstituer un récit lisible.
		const restarted = await createTestDb({ demo: true });
		try {
			expect((await getRecit(restarted.db, alice, 'c_demo_lisiere')).log.length).toBeGreaterThan(0);
		} finally {
			await restarted.close();
		}
	});
	it('A3/A4/A5 : archive enrichie, Taille Double 2×7 pour 5 EM, frappe courante 22 et D100 51', async () => {
		const pid = 'p_int3_archive';
		await t.db
			.insert(characters)
			.values({
				id: pid,
				name: 'Duelliste',
				oathId: 'duelliste',
				branch: 'Taille Double',
				level: 2,
				statuses: [{ id: 'gel', desc: 'Fiche IRP', posedBy: 'MJ', posedAt: 1 }]
			});
		await t.db
			.update(beasts)
			.set({ gem: '1–100 : Gemme Blanche' })
			.where(eq(beasts.id, D.beasts.loup));
		const raw = {
			id: 'c_int3_archive',
			active: true,
			phase: 'declaration',
			order: [0, 1],
			round: 1,
			notes: 'Secret ancien',
			fighters: [
				{
					type: 'player',
					pid,
					name: 'Duelliste',
					classe: 'Duelliste',
					level: 2,
					pvMax: 30,
					epMax: 50,
					emMax: 20,
					dmgBase: 11
				},
				{ type: 'beast', bid: D.beasts.loup, name: 'Loup', level: 2, pvMax: 10, epMax: 30 }
			],
			log: ['Impact hérité −8 PV']
		};
		await t.db
			.insert(combats)
			.values({
				id: raw.id,
				state: { ...fromLegacyArchive(raw), legacy: raw },
				status: 'en_cours'
			});
		await t.db.update(oaths).set({ baseDamage: 20 }).where(eq(oaths.id, 'duelliste'));
		let s = (await getTable(t.db, mj, raw.id)).state;
		expect(getAbilityOptions(s, s.fighters[0]!.id)[0]).toMatchObject({
			hits: 2,
			value: 7,
			emCost: 5
		});
		expect(buildDeclaration(s.fighters[0]!, 'frappe').value).toBe(22);
		s = declareAction(s, s.fighters[0]!.id, 'frappe', { target: s.fighters[1]!.id });
		while (s.phase === 'declaration') s = declareAction(s, s.order[s.turn]!, 'passer');
		s = resolveRound(s, () => 0.5);
		s = rollDrop(s, s.fighters[1]!.id, () => 0.5);
		expect(s.drops[0]).toMatchObject({ roll: 51, gem: 'Gemme Blanche' });
		expect(assignDrop(s, s.drops[0]!.id, pid).drops[0]!.assignedTo).toBe(pid);
		await t.db.update(oaths).set({ baseDamage: 11 }).where(eq(oaths.id, 'duelliste'));
		const added = await createTable(t.db, mj, {
			name: 'Branche abrégée',
			characterIds: [pid],
			beasts: []
		});
		expect(getAbilityOptions(added.state, added.state.fighters[0]!.id)).toHaveLength(1);
		expect(added.state.fighters[0]!.statuses).toHaveLength(0);
	});
	it('A5 : troisième branche conservée en jsonb, migration et vue, capacité 11 dégâts', async () => {
		const custom = oathFromLegacyCustom('Serment INT3', {
			branches: ['A', 'B', 'C'].map((nom) => ({
				nom,
				style: '',
				paliers: [{ niv: 2, nom: 'Coup', cout: '1 EM', desc: '9+Niv dégâts' }]
			}))
		});
		await t.db.insert(oaths).values(normalizeOath(custom, [custom]));
		expect((await getOath(t.db, admin, custom.id)).branches).toHaveLength(3);
		const updated = await updateOath(t.db, admin, {
			id: custom.id,
			expectedRevision: 1,
			motif: 'Formulaire à deux branches',
			branches: { bA: custom.branches.bA, bB: custom.branches.bB }
		});
		expect(updated.branches).toHaveLength(3);
		await t.db
			.insert(characters)
			.values({ id: 'p_int3_c', name: 'Branche C', oathId: custom.id, branch: 'C', level: 2 });
		const table = await createTable(t.db, mj, {
			name: 'Troisième branche',
			characterIds: ['p_int3_c'],
			beasts: []
		});
		expect(getAbilityOptions(table.state, table.state.fighters[0]!.id)[0]!.value).toBe(11);
	});
	it('A7/A8/B5 : note, auteur, date conservés ; participation historisée 33 %, gain 10 XP', async () => {
		const pid = D.characters.seren;
		const old = { id: 'gel', desc: 'bras gelé', posedBy: 'Ancien MJ', posedAt: 123456789 };
		await t.db
			.update(characters)
			.set({ statuses: [old] })
			.where(eq(characters.id, pid));
		await setStatus(t.db, mj, {
			characterId: pid,
			statusId: 'gel',
			expectedRevision: 1,
			motif: 'Reposé'
		});
		const [after] = await t.db.select().from(characters).where(eq(characters.id, pid));
		expect(after.statuses).toEqual([old]);
		const sheet = await grantCombatXp(t.db, mj, {
			characterId: pid,
			beastLevel: 3,
			participationPct: 33.5,
			expectedRevision: after.revision,
			beastName: 'Créature',
			motif: 'Récompense distincte',
			combatId: D.combat
		});
		expect(sheet.xp).toBe(10);
		const consequences = await listConsequences(t.db, mj, { characterId: pid, combatId: D.combat });
		expect(consequences.rows).toHaveLength(1);
		expect(consequences.rows[0].text).toBe('+10 XP (Créature, 33%)');
	});
	it('B3 : publications du combat avec créatures, tampon et rature, refus du joueur', async () => {
		const publication = await publishExtract(t.db, mj, {
			combatId: D.combat,
			text: 'Première ligne.\nSeconde ligne.',
			beastIds: [D.beasts.loup],
			onHome: true
		});
		await strikePublication(t.db, mj, { id: publication.id, motif: 'Correction' });
		const list = await listPublications(t.db, mj, { combatId: D.combat });
		expect(list[0]).toMatchObject({
			id: publication.id,
			onHome: true,
			struck: true,
			raye: true,
			creatures: [{ id: D.beasts.loup, name: 'Loup des lianes' }],
			tampon: { name: 'mj', role: 'mj' }
		});
		await expect(listPublications(t.db, alice, { combatId: D.combat })).rejects.toMatchObject({
			code: 'FORBIDDEN'
		});
	});
	it('B4/A13 : récit staff intégral avec notes, récit joueur filtré', async () => {
		const [row] = await t.db.select().from(combats).where(eq(combats.id, D.combat));
		const state = row.state as unknown as CombatState;
		state.log.push({
			n: state.log.length + 1,
			round: 2,
			kind: 'info',
			text: 'Héritage privé −8 PV',
			actorId: null,
			targetId: null,
			private: true
		});
		await t.db
			.update(combats)
			.set({ state: { ...row.state, ...state } })
			.where(eq(combats.id, D.combat));
		expect((await getRecit(t.db, mj, D.combat)).log.at(-1)!.text).toContain('Héritage privé');
		expect(JSON.stringify(await getRecit(t.db, alice, D.combat))).not.toContain('Héritage privé');
	});
	it('A9/B6 : plage effective importée et anomalies durables (homonymes, propriétaires, quantités)', async () => {
		const fresh = await createTestDb();
		try {
			const snapshot = await readSnapshot('tests/fixtures/np-store-demo.json');
			const altered = makeSnapshot(
				snapshot.rows.map((r) => {
					if (r.key === 'beasts')
						return {
							...r,
							value: JSON.stringify([
								{ id: 'b_quantite', nom: 'Quantité', niv: 3, beh: 'Agressif', qtyMin: 5, qtyMax: 5 }
							])
						};
					if (r.key === 'serments_custom')
						return {
							...r,
							value: JSON.stringify({
								...JSON.parse(r.value),
								'Trois branches INT3': {
									branches: ['A', 'B', 'C'].map((nom) => ({ nom, paliers: [] }))
								}
							})
						};
					return r;
				})
			);
			const report = await migrateSnapshot(fresh.db, altered, { dryRun: false });
			expect(report.anomalies.map((a) => a.code)).toEqual(
				expect.arrayContaining(['HOMONYM', 'OWNER_QUARANTINE', 'BEAST_QUANTITY_RECALCULATED'])
			);
			const [beast] = await fresh.db.select().from(beasts).where(eq(beasts.id, 'b_quantite'));
			expect(beast).toMatchObject({ qtyMin: 1, qtyMax: 2 });
			expect((await getOath(fresh.db, admin, 'trois-branches-int3')).branches).toHaveLength(3);
			expect((await migrationStatus(fresh.db, admin)).anomalies.map((a) => a.code)).toEqual(
				expect.arrayContaining(['HOMONYM', 'OWNER_QUARANTINE', 'BEAST_QUANTITY_RECALCULATED'])
			);
			// Les archives migrées reprennent le contexte courant et restent lisibles par le domaine.
			const archives = await fresh.db.select().from(combats);
			const valid = archives.find((a) => a.state.schemaVersion === 2)!;
			expect((await getTable(fresh.db, mj, valid.id)).state.id).toBe(valid.id);
		} finally {
			await fresh.close();
		}
	});
});
