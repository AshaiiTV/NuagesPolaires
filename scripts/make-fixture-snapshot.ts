// Données exclusivement FICTIVES ; formes de l'audit 06 §1.3 / §2, audit 05 §3.
import { createHash, pbkdf2Sync } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { makeSnapshot } from '../src/lib/server/legacy/snapshot';

const ts = 1700000000000;
const names = ['Admin', 'Alice', 'Bob', 'Maitre', 'Designer', 'Nova', 'Echo', 'SansFiche'];
const sha = (v: string) => createHash('sha256').update(v).digest('hex');
const accounts = names.map((pseudo, i) => ({
	id: `fixture_a_${i}`,
	pseudo,
	role: ['admin', 'joueur', 'joueur', 'mj', 'designer', 'inconnu', 'joueur', 'joueur'][i],
	pid: i < 3 || i === 5 || i === 6 ? `fixture_p_${i}` : null,
	pass:
		i === 1
			? `pbkdf2:${'ab'.repeat(32)}:${pbkdf2Sync(sha('Mot-de-passe-fictif-Alice'), 'ab'.repeat(32), 100000, 64, 'sha512').toString('hex')}`
			: `${i === 2 ? '' : 'sha256:'}${sha(`Mot-de-passe-fictif-${pseudo}`)}`,
	createdAt: ts,
	lastSeen: ts,
	selectedTheme: i === 1 ? 'theme-violet' : 'dark',
	unlockedThemes: i === 1 ? ['violet'] : [],
	blockedThemes: [],
	...(i % 2 ? { sessionVersion: i } : {}),
	opaque: { fiction: true }
}));
const players: unknown[] = names.map((name, i) => ({
	id: `fixture_p_${i}`,
	name: i === 5 || i === 6 ? 'Homonyme' : name,
	...(i === 2 ? { class: 'Duelliste' } : { classe: i === 1 ? 'Duelliste' : 'Mizu' }),
	level: i === 1 ? 2 : 1,
	xp: i === 1 ? 15 : 0,
	xpMax: i === 1 ? 60 : 30,
	...(i === 1 ? { sLevel: 5, sXp: 25, sXpMax: 50 } : { progressionVersion: 1 }),
	pvMax: i === 1 ? 41 : 30,
	pvCur: i === 1 ? 31 : i === 7 ? 0 : 30,
	epMax: 50,
	epCur: 20,
	emMax: 20,
	emCur: 7,
	branch: 'Aucune',
	arme: 'Épée',
	journal: `Note fictive ${name}`,
	avatar: '',
	equipment: { helmet: null, chest: null, legs: null },
	inventory:
		i < 3
			? [
					{
						id: 'potion',
						name: i === 2 ? 'Potion boréale' : 'Potion',
						category: 'Consommable',
						qty: i === 2 ? 4 : 2,
						effect: '+20 PV',
						arbitrary: 'keep'
					},
					{ id: 'gemme-blanche', name: 'Gemme Blanche', category: 'Gemme', qty: 3 },
					...(i === 0
						? [
								{ id: 'invalid-zero', name: 'Objet vide', qty: 0 },
								{ id: 'invalid-neg', name: 'Quantité négative', qty: -1 },
								{ id: 'invalid-float', name: 'Fraction', qty: 1.5 },
								{ id: 'invalid-string', name: 'Chaîne', qty: '2' }
							]
						: [])
				]
			: [],
	history: [
		{
			ts: 101,
			type: 'item',
			text: 'Consommé : &lt;potion&gt; &amp;lt;trace&amp;gt;',
			by: 'MJ Maitre'
		},
		{
			ts,
			type: 'combat',
			text: i === 7 ? null : 'Récit fictif',
			by: 'Maitre',
			...(i === 1 ? { combatId: 'arc0' } : {})
		}
	],
	notifDeleted: [101],
	statuts: [],
	...(i === 2 ? { unlockedThemes: ['halloween'], blockedThemes: ['green'] } : {}),
	opaque: { kept: true }
}));
players.push(null);
const beasts = Array.from({ length: 12 }, (_, i) => ({
	id: `fixture_b_${i}`,
	...(i % 3 === 0
		? {
				nom: `Loup fictif ${i}`,
				name: `Alias divergent ${i}`,
				beh: 'Neutre',
				niv: 3,
				pv: 40,
				ep: 20,
				frappe: '8 + Niv.',
				comp: 'Morsure',
				drops: 'Fourrure',
				gem: '1–60 : Aucune',
				desc: 'Créature fictive',
				img: '',
				sub: 'Prédateur'
			}
		: i % 3 === 1
			? {
					name: `Créature fictive ${i}`,
					behavior: 'Agressif',
					level: 2,
					hp: 30,
					energy: 10,
					attack: 'Frappe',
					ability: 'Trace',
					loot: 'Crocs',
					gemme: 'Gemme Blanche',
					description: 'Fiction',
					image: '',
					subtitle: 'Alias anglais'
				}
			: {
					catalog: {
						name: `Catalogue fictif ${i}`,
						comportement: 'Passif',
						level: 1,
						pv: 20,
						ep: 10,
						skill: 'Souffle'
					}
				}),
	hidden: i === 10,
	archived: i === 11,
	adminNotes: 'Note réservée fictive',
	zones: ['Ruines fictives', i % 2 ? '[🌳]-forêt-centre' : 'Grotte fictive'],
	qtyMin: 1,
	qtyMax: 3,
	spawnWeight: i === 0 ? 0 : 1,
	tags: ['fictif'],
	unknown: { kept: true }
}));
const events = Array.from({ length: 8 }, (_, i) => ({
	id: `fixture_e_${i}`,
	...(i % 2
		? { titre: `Ancien rendez-vous ${i}`, dateTs: ts + i * 86400000, published: i !== 3 }
		: { nom: `Rendez-vous ${i}`, date: i === 2 ? null : ts + i * 86400000 }),
	...(i === 3 ? { hidden: false } : i === 4 ? { hidden: true } : {}),
	type: ['combat', 'exploration', 'social', 'evenement', 'autre'][i % 5],
	max: i === 0 ? 0 : 4,
	desc: 'Rendez-vous fictif',
	createdBy: i === 0 ? 'Maitre' : 'Auteur disparu',
	inscrits: i === 6 ? ['Homonyme', 'Absent'] : ['Alice', 'Bob'],
	extra: { kept: true },
	arbitrary: 'keep'
}));
const fighter = {
	type: 'player',
	pid: 'fixture_p_1',
	name: 'Alice',
	pvCur: 12,
	pvMax: 30,
	epCur: 20,
	epMax: 50,
	emCur: 7,
	emMax: 20
};
const archive = (id: string, i: number) => ({
	id,
	name: `Récit fictif ${i}`,
	savedAt: ts + i,
	round: 2,
	phase: 'idle',
	active: i === 1,
	_inProgress: i === 2,
	_draft: i === 3,
	_manualSaved: true,
	fighters: [fighter, { type: 'beast', bid: 'fixture_b_0', name: 'Loup', pvCur: 0, pvMax: 40 }],
	log:
		i % 2
			? ['Tour 1', 'Tour 2']
			: [{ text: 'Une trace <b>polaire</b>.' }, { text: '<img src=x onerror="fiction">Fin.' }]
});
const store: Record<string, unknown> = {
	accounts,
	players,
	beasts,
	events,
	serments_custom: {
		Duelliste: { pvN: 7, lore: 'Surcharge fictive' },
		'Serment fictif': {
			pvN: 3,
			epN: 5,
			emN: 2,
			bA: {
				nom: 'Branche fictive',
				paliers: [{ niv: 2, nom: 'Trace', cout: '2 EP', desc: 'Fiction' }]
			}
		}
	},
	event_themes: {
		halloween: {
			name: 'Nuit fictive',
			cls: 'theme-halloween',
			event: true,
			availableUntil: 1793577600000
		},
		fixture_theme: {
			name: 'Papier fictif',
			preview: ['#102327', '#95CDBB', '#C6B38B'],
			desc: 'Fiction',
			event: true,
			autoGrantAll: true
		}
	},
	theme_visibility: { halloween: false },
	np_syslog: [{ ts, action: 'liaison', detail: 'Liaison fictive', actor: 'Admin' }],
	np_syslog_archive: [
		{
			archivedAt: ts,
			label: 'Lot fictif',
			filename: 'archive-fictive',
			entries: [
				{
					ts: 0,
					action: 'history_delete',
					detail: 'Trace conservée',
					actor: 'Maitre',
					target: 'Alice (Duelliste)',
					src: 'history'
				}
			]
		}
	],
	np_audit_log: [
		{
			ts,
			source: 'auth',
			action: 'login_success',
			actor: { pseudo: 'Admin', role: 'admin' },
			ip: '192.0.2.1',
			details: { fixture: true }
		}
	],
	spawn_lab_staff: {
		schemaVersion: 2,
		totals: { fixture_b_0: 12, fixture_b_1: 7 },
		totalDraws: 57,
		customZones: ['Ruines fictives', '[🌳]-forêt-centre'],
		lastGeneratedBy: 'Maitre',
		lastRuns: [
			{
				id: 'fixture_run',
				ts,
				zone: 'Ruines fictives',
				packs: [{ id: 'fixture_b_0', qty: 2 }],
				by: 'Maitre'
			}
		]
	},
	lieux: [{ id: 'lieu_fictif', nom: 'Havre fictif', notes: 'Fiction', visible: false }],
	rpg_characters: [{ id: 'rpg_fictif', ownerId: 'fixture_a_1', schemaVersion: 4 }],
	theme_catalog: { mort: true },
	serment_catalog: { mort: true },
	page_content: { mort: true },
	themes_admin_store: { meta: { private: true } },
	np_rate_auth: { 'ip:192.0.2.1': { count: 3, first: ts } },
	np_admin_recovery_consumed: {
		fingerprint: sha('Récupération fictive'),
		pseudo: 'Admin',
		consumedAt: ts
	},
	combat_arc_Maitre: [archive('arc0', 0), archive('arc1', 1)],
	combat_arc_idx_Maitre: [
		{ ...archive('arc0', 0), _stub: true, log: [] },
		{ id: 'arc2', name: 'Index seul', _stub: true, _inProgress: true, fighters: [fighter] }
	],
	combat_arc_Alice: [archive('arc3', 3)],
	combat_arc_fixture_a_2: [archive('arc4', 4)],
	combat_arc_rec_Orphelin__arc5: archive('arc5', 5),
	combat_arc_rec_Maitre__arc0: { ...archive('arc0', 0), name: 'Détail prioritaire' }
};
const snapshot = makeSnapshot(
	Object.entries(store).map(([key, value]) => ({
		key,
		value: JSON.stringify(value),
		updated_at: '2026-09-30 12:00:00.123456+00'
	})),
	'2026-09-30T12:00:00.000Z'
);
await mkdir('tests/fixtures', { recursive: true });
await writeFile(
	'tests/fixtures/np-store-demo.json',
	JSON.stringify(snapshot, null, 2) + '\n',
	'utf8'
);
process.stdout.write(`Snapshot fictif : ${snapshot.count} clés, SHA-256 ${snapshot.sha256}.\n`);
