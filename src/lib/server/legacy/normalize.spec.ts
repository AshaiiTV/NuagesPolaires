import { describe, expect, it } from 'vitest';
import { BUILTIN_OATHS } from '../../game/oaths';
import * as n from './normalize';
describe('formes héritées (audit 06 §2)', () => {
	it('comptes : rôle inconnu, version implicite, hash intact, thèmes, extra', () => {
		for (const pass of ['sha256:' + 'a'.repeat(64), 'pbkdf2:sel:empreinte', 'b'.repeat(64)]) {
			const a = n.normalizeAccount({
				id: 'a',
				pseudo: 'Alice',
				role: 'inconnu',
				pass,
				selectedTheme: 'theme-violet',
				unlockedThemes: ['brumeclaire'],
				opaque: { kept: true }
			});
			expect(a.row).toMatchObject({
				role: 'joueur',
				sessionVersion: 0,
				passwordHash: pass,
				selectedTheme: 'violet',
				extra: { opaque: { kept: true } }
			});
			expect(a.unlocked).toEqual(['light']);
		}
	});
	it('bi-piste : maximum et déficit conservés, aucun double gain', () => {
		const raw = {
			id: 'p',
			name: 'Alice',
			class: 'Duelliste',
			level: 2,
			xp: 15,
			xpMax: 60,
			sLevel: 5,
			sXp: 25,
			sXpMax: 50,
			pvMax: 41,
			pvCur: 31,
			epMax: 56,
			epCur: 20,
			emMax: 22,
			emCur: 7
		};
		const c = n.normalizeCharacter(raw, BUILTIN_OATHS);
		expect(c.row).toMatchObject({
			level: 5,
			xp: 75,
			pvMax: 59,
			pvCur: 49,
			epMax: 74,
			epCur: 38,
			emMax: 28,
			emCur: 13,
			progressionVersion: 1,
			oathId: 'duelliste'
		});
		const second = n.normalizeCharacter({ ...raw, ...c.row, progressionVersion: 1 }, BUILTIN_OATHS);
		expect(second.row).toMatchObject({ level: 5, xp: 75, pvMax: 59, pvCur: 49 });
		expect(raw.level).toBe(2);
	});
	it('null, Serment inconnu, inventaires locaux, historique et masques', () => {
		expect(n.list(null)).toEqual([]);
		expect(n.unknownOath('Mizu')).toMatchObject({
			id: 'mizu',
			hidden: true,
			isBuiltin: false,
			growth: { pvN: 0, epN: 0, emN: 0 }
		});
		const c = n.normalizeCharacter(
			{
				id: 'p',
				inventory: [null, { id: 'potion', name: 'Potion', qty: 2, effect: '+20 PV' }],
				history: [{ ts: 101, type: 'item', text: '&lt;p&gt; &amp;lt; &#xE9;', by: 'MJ' }],
				notifDeleted: [101],
				journal: 'Ma note',
				opaque: { kept: true }
			},
			BUILTIN_OATHS
		);
		expect(c.row).toMatchObject({ journal: 'Ma note', extra: { opaque: { kept: true } } });
		expect(c.items[0]).toMatchObject({ legacyId: 'potion', extra: { effect: '+20 PV' } });
		expect(c.items[0].id).not.toBe(n.normalizeItem({ id: 'potion' }, 'autre', 0).id);
		expect(c.history[0]).toMatchObject({ text: '<p> &lt; é', dismissed: true });
		expect(n.normalizeHistory({ type: 'combat', text: null }, 'p', 2).text).toBe(
			'Combat sans titre'
		);
	});
	it('créatures : tous les alias, catalog en repli, 0/false prioritaires', () => {
		const b = n.normalizeBeast({
			id: 'b',
			nom: 'Nom',
			name: 'Perdu',
			beh: 'Passif',
			behavior: 'Boss',
			niv: 3,
			level: 9,
			pv: 40,
			hp: 99,
			ep: 0,
			energy: 8,
			frappe: 'A',
			attack: 'B',
			comp: 'C',
			skill: 'D',
			drops: 'E',
			loot: 'F',
			gem: 'G',
			gemme: 'H',
			desc: 'I',
			description: 'J',
			img: 'K',
			image: 'L',
			sub: 'M',
			subtitle: 'N',
			spawnWeight: 0,
			hidden: false,
			catalog: { hidden: true },
			zones: ['Ruines']
		});
		expect(b.row).toMatchObject({
			name: 'Nom',
			behavior: 'Passif',
			level: 3,
			pv: 40,
			ep: 0,
			strike: 'A',
			skill: 'C',
			drops: 'E',
			gem: 'G',
			description: 'I',
			imageUrl: 'K',
			subtitle: 'M',
			spawnWeight: 0,
			hidden: false
		});
		expect(b.zones).toEqual(['Ruines']);
		expect(
			n.normalizeBeast({ catalog: { name: 'Repli', ability: 'Souffle', comportement: 'Gibier' } })
				.row
		).toMatchObject({ name: 'Repli', skill: 'Souffle', behavior: 'Gibier' });
		expect(
			n.normalizeBeast({
				name: 'Anglais',
				behavior: 'Agressif',
				level: 2,
				hp: 30,
				energy: 10,
				attack: 'A',
				ability: 'B',
				loot: 'C',
				gemme: 'D',
				description: 'E',
				image: 'F',
				subtitle: 'G'
			}).row
		).toMatchObject({
			name: 'Anglais',
			pv: 30,
			ep: 10,
			strike: 'A',
			skill: 'B',
			drops: 'C',
			gem: 'D',
			description: 'E',
			imageUrl: 'F',
			subtitle: 'G'
		});
	});
	it('Serments natifs et surcharges partiels fusionnés', () => {
		const catalogue = n.normalizeOaths({ Duelliste: { pvN: 7 }, 'Serment fictif': { pvN: 2 } });
		expect(catalogue).toHaveLength(14);
		expect(catalogue.find((o) => o.id === 'duelliste')?.growth).toEqual({ pvN: 7, epN: 6, emN: 2 });
		expect(catalogue.find((o) => o.id === 'serment-fictif')?.isBuiltin).toBe(false);
	});
	it('rendez-vous : hidden explicite, deux dates, auteur brut et extra', () => {
		expect(
			n.normalizeEvent({
				id: 'e',
				titre: 'Ancien',
				dateTs: 1700000000000,
				published: false,
				hidden: false,
				createdBy: 'Auteur',
				arbitrary: 'keep',
				inscrits: ['Alice', 'Alice']
			})
		).toMatchObject({
			row: {
				title: 'Ancien',
				hidden: false,
				createdByLabel: 'Auteur',
				extra: { arbitrary: 'keep' }
			},
			participants: ['Alice']
		});
		expect(n.normalizeEvent({ titre: 'Masqué', published: false }).row.hidden).toBe(true);
		expect(n.normalizeEvent({ date: null, dateTs: 1700000000000 }).row.startsAt).toBeNull();
	});
	it('combats : conversion des chaînes, statut, participants, index brut', () => {
		const c = n.normalizeCombat(
			{
				id: 'c',
				log: ['Tour'],
				fighters: [
					{ type: 'player', pid: 'p', name: 'Alice', pvMax: 30 },
					{ type: 'player', pid: 'p', isSummon: true },
					{ type: 'beast', bid: 'b' }
				]
			},
			'Maitre'
		);
		expect(c.row.state.schemaVersion).toBe(2);
		expect(c.participants).toEqual(['p']);
		expect(c.row.status).toBe('termine');
		for (const flag of ['active', '_inProgress', '_draft'])
			expect(n.normalizeCombat({ [flag]: true }, 'Maitre').row.status).toBe('en_cours');
		expect(n.normalizeCombat({ _stub: true }, 'Maitre')).toMatchObject({
			rawState: true,
			row: { state: { schemaVersion: 0 } }
		});
		expect(n.normalizeCombat({ id: 'c' }, 'Autre').row.id).not.toBe(c.row.id);
	});
	it('lots staff, audit, apparitions et thèmes', () => {
		expect(
			n.normalizeStaffArchive({ label: 'Lot', filename: 'archive', entries: [{}] }, 'lot')
		).toMatchObject({ row: { label: 'Lot', filename: 'archive' }, entries: [{}] });
		expect(
			n.normalizeStaffLog({ actor: 'MJ', detail: 'Trace', target: 'Alice' }, 'log')
		).toMatchObject({ actorName: 'MJ', detail: 'Trace', target: 'Alice' });
		expect(
			n.normalizeAudit({ actor: { pseudo: 'Admin', role: 'admin' }, details: { kept: true } }, 'a')
		).toMatchObject({ actorPseudo: 'Admin', actorRole: 'admin', details: { kept: true } });
		expect(
			n.normalizeSpawn({
				totals: { b: 12 },
				totalDraws: 57,
				lastRuns: [{ id: 'r', packs: [{ id: 'b', qty: 2 }] }]
			})
		).toMatchObject({ totals: { b: 12 }, totalDraws: 57, runs: [{ beastIds: ['b'] }] });
		expect(
			n
				.normalizeThemes({ halloween: { name: 'Fiction' } }, { halloween: false })
				.find((t) => t.id === 'halloween')
		).toMatchObject({ name: 'Fiction', visible: false });
	});
	it('identifiants sans id : hash stable de la source, indépendant de sa position', () => {
		const raw = { pseudo: 'Sans id', pass: 'hash fictif' };
		expect(n.normalizeAccount(raw, ['accounts', 0]).row.id).toBe(
			n.normalizeAccount({ ...raw }, ['accounts', 9]).row.id
		);
		expect(n.normalizeCharacter({ name: 'Sans id' }, BUILTIN_OATHS, 0).row.id).toBe(
			n.normalizeCharacter({ name: 'Sans id' }, BUILTIN_OATHS, 9).row.id
		);
	});
});
