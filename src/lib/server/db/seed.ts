// Semis idempotent (04-architecture §3.3, §3.4, §3.8, §3.12, §10.10) :
//   - référentiels : thèmes, zones par défaut, clés de réglages (vides), ligne unique
//     `spawn_settings` et Serments natifs. Les DONNÉES vivent dans referentials.ts ; elles sont
//     écrites en production par la migration de données `drizzle/0001_referentiels.sql` (présentes
//     dès que les migrations ont tourné, quel que soit le lanceur). seedDatabase() réécrit les mêmes
//     lignes par Drizzle (`ON CONFLICT DO NOTHING` : une ligne déjà présente, éventuellement éditée
//     par un admin, n'est jamais écrasée) : tests, reprise d'une base vidée, migration héritée ;
//   - jeu de démonstration FICTIF (seedDemo), réservé à la base locale ou à NP_ALLOW_DEMO_SEED=true,
//     et toujours refusé en production (NETLIFY=true ou NODE_ENV=production).
// Ce module contient seedDemo : il ne doit pas être importé par le code applicatif (check-bundle) ;
// les constantes de référentiels s'importent depuis referentials.ts.

import { createHash } from 'node:crypto';
import { THEMES } from '../../ui/themes';
import { eq, inArray } from 'drizzle-orm';
import { isProductionEnv, type Db, type Tx } from './index';
import {
	addFighter,
	createCombat,
	declareAction,
	endCombat,
	resolveRound,
	startCombat
} from '../../game/combat';
import { findBranch } from '../../game/oaths';
import { oathDefinitionFromRow } from '../domain/combat-context';
import {
	SETTING_SEED,
	SPAWN_SETTINGS_SEED,
	THEME_SEED,
	ZONE_SEED,
	oathRowsFor,
	type OathSeedDefinition
} from './referentials';
import {
	accounts,
	accountThemeGrants,
	beasts,
	beastZones,
	characterHistory,
	characterItems,
	characters,
	combatParticipants,
	combats,
	eventParticipants,
	events,
	journalEntries,
	oaths,
	readingMarks,
	sceneParticipants,
	scenes,
	settings,
	spawnSettings,
	themes,
	zones,
	type AccountRole,
	type NewAccount
} from './schema';

// Compatibilité : les données de référentiels restent importables depuis seed.ts.
export {
	ALWAYS_GRANTED_THEME_IDS,
	SETTING_KEYS,
	SETTING_SEED,
	SPAWN_SETTINGS_ID,
	SPAWN_SETTINGS_SEED,
	THEME_ID_ALIASES,
	THEME_SEED,
	ZONE_SEED,
	oathRowsFor,
	type OathSeedDefinition,
	type SettingKey
} from './referentials';

// ---------------------------------------------------------------------------
// Semis des référentiels
// ---------------------------------------------------------------------------

type Writer = Db | Tx;

export type SeedReport = {
	themesInserted: number;
	zonesInserted: number;
	settingsInserted: number;
	/** 1 si la ligne unique `spawn_settings` (id = 1) a été créée, 0 si elle existait. */
	spawnSettingsInserted: number;
	oathsInserted: number;
};

/** Sème les thèmes (sans écraser une ligne existante). */
export async function seedThemes(db: Writer): Promise<number> {
	const rows = await db
		.insert(themes)
		.values(
			THEME_SEED.map((t) => {
				const natif = THEMES.find((n) => n.id === t.id);
				return {
					...t,
					name: natif?.name ?? t.name,
					description: natif?.description ?? t.description
				};
			})
		)
		.onConflictDoNothing({ target: themes.id })
		.returning({ id: themes.id });
	return rows.length;
}

/** Sème les zones par défaut (sans écraser une ligne existante). */
export async function seedZones(db: Writer): Promise<number> {
	const rows = await db
		.insert(zones)
		.values([...ZONE_SEED])
		.onConflictDoNothing({ target: zones.id })
		.returning({ id: zones.id });
	return rows.length;
}

/** Sème les clés de réglages avec une valeur vide (sans écraser une valeur saisie). */
export async function seedSettings(db: Writer): Promise<number> {
	const rows = await db
		.insert(settings)
		.values([...SETTING_SEED])
		.onConflictDoNothing({ target: settings.key })
		.returning({ key: settings.key });
	return rows.length;
}

/** Crée la ligne unique `spawn_settings` (id = 1, cumul 0) si elle manque (04 §10.10). */
export async function seedSpawnSettings(db: Writer): Promise<number> {
	const rows = await db
		.insert(spawnSettings)
		.values([...SPAWN_SETTINGS_SEED])
		.onConflictDoNothing({ target: spawnSettings.id })
		.returning({ id: spawnSettings.id });
	return rows.length;
}

/**
 * Sème le catalogue de Serments transmis (04 §3.3), sans écraser l'existant. Les parents sont
 * insérés avant leurs évolutions (FK `evolves_from`) ; un parent introuvable (ni dans le catalogue,
 * ni en base) donne `evolves_from = NULL`. `is_builtin` vaut `true` sauf mention contraire.
 */
export async function seedOaths(
	db: Writer,
	definitions: readonly OathSeedDefinition[]
): Promise<number> {
	const existing = await db.select({ id: oaths.id, name: oaths.name }).from(oaths);
	let inserted = 0;
	for (const row of oathRowsFor(definitions, existing)) {
		const rows = await db
			.insert(oaths)
			.values(row)
			.onConflictDoNothing({ target: oaths.id })
			.returning({ id: oaths.id });
		inserted += rows.length;
	}
	return inserted;
}

/**
 * Semis complet et idempotent des référentiels : thèmes, zones, réglages, ligne `spawn_settings`,
 * et Serments si fournis. Après les migrations, tout est déjà présent (migration 0001) : le rapport
 * ne compte alors que ce qui manquait.
 */
export async function seedDatabase(
	db: Writer,
	options: { oaths?: readonly OathSeedDefinition[] } = {}
): Promise<SeedReport> {
	const themesInserted = await seedThemes(db);
	const zonesInserted = await seedZones(db);
	const settingsInserted = await seedSettings(db);
	const spawnSettingsInserted = await seedSpawnSettings(db);
	const oathsInserted = options.oaths ? await seedOaths(db, options.oaths) : 0;
	return { themesInserted, zonesInserted, settingsInserted, spawnSettingsInserted, oathsInserted };
}

// ---------------------------------------------------------------------------
// Jeu de démonstration FICTIF (développement, tests de parcours, Playwright).
// Ne doit JAMAIS atteindre une base réelle : seedDemo refuse de s'exécuter en production
// (NETLIFY=true ou NODE_ENV=production, sans exception), et ailleurs hors PGlite sauf
// NP_ALLOW_DEMO_SEED=true explicite. Les mots de passe sont stockés au format hérité
// `sha256:<hex>` pour exercer le ré-encodage scrypt à la première connexion (04 §4, §10.9).
// ---------------------------------------------------------------------------

/** Mots de passe de démonstration (valeurs de test publiques, sans valeur hors de ce jeu). */
export const DEMO_PASSWORDS = {
	admin: 'Admin-audit-123!',
	alice: 'Alice-audit-123!',
	bob: 'Bob-audit-123!',
	mj: 'Maitre-audit-123!',
	designer: 'Designer-audit-123!',
	nova: 'Nova-audit-123!'
} as const;

export type DemoPseudo = keyof typeof DEMO_PASSWORDS;

/** Identifiants stables du jeu de démonstration (référencés par les tests de parcours). */
export const DEMO_IDS = {
	accounts: {
		admin: 'a_demo_admin',
		alice: 'a_demo_alice',
		bob: 'a_demo_bob',
		mj: 'a_demo_mj',
		designer: 'a_demo_designer',
		nova: 'a_demo_nova'
	},
	characters: { aria: 'p_demo_aria', kael: 'p_demo_kael', seren: 'p_demo_seren' },
	beasts: {
		loup: 'b_demo_loup',
		corbeau: 'b_demo_corbeau',
		golem: 'b_demo_golem',
		vouivre: 'b_demo_vouivre',
		ombre: 'b_demo_ombre',
		sanglier: 'b_demo_sanglier'
	},
	events: {
		chasse: 'e_demo_chasse',
		conseil: 'e_demo_conseil',
		passe: 'e_demo_passe',
		masque: 'e_demo_masque'
	},
	combat: 'c_demo_lisiere',
	openCombat: 'c_demo_table_ouverte',
	scene: 's_demo_brume'
} as const;

/** Serments requis par le jeu de démonstration (à semer avant, via seedOaths(BUILTIN_OATHS)). */
export const DEMO_REQUIRED_OATHS = ['duelliste', 'arcaniste', 'rodeur'] as const;

/** Format hérité `sha256:<hex>` (04 §4). */
export function legacySha256Hash(password: string): string {
	return `sha256:${createHash('sha256').update(password, 'utf8').digest('hex')}`;
}

/**
 * Vrai si l'environnement autorise le jeu de démonstration (PGlite, ou autorisation explicite).
 * 04 §10.2 : JAMAIS en production (NETLIFY=true ou NODE_ENV=production), quelle que soit
 * l'autorisation — un script lancé avec NP_ALLOW_DEMO_SEED=true contre la base Neon de production
 * y écrirait sinon des comptes (dont un admin) aux mots de passe publics.
 */
export function isDemoSeedAllowed(env: Record<string, string | undefined>): boolean {
	if (isProductionEnv(env)) return false;
	return (
		(env.NP_DB_DRIVER ?? '').trim().toLowerCase() === 'pglite' ||
		(env.NP_ALLOW_DEMO_SEED ?? '').trim().toLowerCase() === 'true'
	);
}

export type DemoSeedReport = {
	/** `false` si le jeu était déjà présent (idempotence : rien n'est réécrit). */
	applied: boolean;
	accounts: number;
	characters: number;
	beasts: number;
	events: number;
	combats: number;
	scenes: number;
};

/**
 * Sème le jeu de démonstration, en une transaction, une seule fois (présence du compte
 * `a_demo_admin` = déjà semé). Exige thèmes, zones et les Serments de DEMO_REQUIRED_OATHS.
 * `env` = l'environnement réel de l'appelant (par défaut process.env).
 */
export async function seedDemo(
	db: Db,
	env: Record<string, string | undefined> = process.env
): Promise<DemoSeedReport> {
	if (isProductionEnv(env)) {
		throw new Error(
			'seedDemo refusé : le jeu de démonstration est interdit en production (NETLIFY=true ou NODE_ENV=production).'
		);
	}
	if (!isDemoSeedAllowed(env)) {
		throw new Error(
			'seedDemo refusé : le jeu de démonstration exige NP_DB_DRIVER=pglite ou NP_ALLOW_DEMO_SEED=true.'
		);
	}
	const none: DemoSeedReport = {
		applied: false,
		accounts: 0,
		characters: 0,
		beasts: 0,
		events: 0,
		combats: 0,
		scenes: 0
	};
	return db.transaction(async (tx) => {
		const already = await tx
			.select({ id: accounts.id })
			.from(accounts)
			.where(eq(accounts.id, DEMO_IDS.accounts.admin));
		if (already.length > 0) return none;

		const present = new Set(
			(
				await tx
					.select({ id: oaths.id })
					.from(oaths)
					.where(inArray(oaths.id, [...DEMO_REQUIRED_OATHS]))
			).map((r) => r.id)
		);
		const missing = DEMO_REQUIRED_OATHS.filter((id) => !present.has(id));
		if (missing.length > 0) {
			throw new Error(
				`seedDemo : Serments absents (${missing.join(', ')}) — sème d'abord BUILTIN_OATHS via seedOaths.`
			);
		}
		await seedThemes(tx);
		for (const theme of THEMES)
			await tx
				.update(themes)
				.set({ name: theme.name, description: theme.description })
				.where(eq(themes.id, theme.id));
		await seedZones(tx);

		const now = Date.now();
		const DAY = 86_400_000;
		const at = (offsetDays: number, hour = 20): Date => {
			const d = new Date(now + offsetDays * DAY);
			d.setUTCHours(hour, 13 + ((Math.abs(offsetDays) * 7) % 43), 0, 0);
			return d;
		};
		const A = DEMO_IDS.accounts;
		const P = DEMO_IDS.characters;
		const B = DEMO_IDS.beasts;
		const E = DEMO_IDS.events;

		// --- Personnages (avant les comptes : FK accounts.character_id) -----------------------
		await tx.insert(characters).values([
			{
				id: P.aria,
				name: 'Aria Lunval',
				oathId: 'duelliste',
				branch: "Branche A — L'Élan Tranchant",
				level: 7,
				xp: 140,
				// maxAtLevel(7, Duelliste 6/6/2) = 66 / 86 / 32
				pvCur: 51,
				pvMax: 66,
				epCur: 70,
				epMax: 86,
				emCur: 32,
				emMax: 32,
				weapon: 'Épée moyenne du serment',
				journal: 'Avant le carnet : la lisière m’a appris à écouter le vent avant la lame.',
				equipment: { helmet: null, chest: 'Cape de brume', legs: null },
				statuses: [
					{
						id: 'saignement',
						desc: 'Saignement léger : −2 PV au début de chaque tour.',
						posedBy: 'MJ mj',
						posedAt: now - 2 * DAY
					},
					{
						id: 'inspire',
						desc: 'Inspirée par le conseil : +1 à la prochaine frappe.',
						posedBy: 'MJ mj',
						posedAt: now - DAY
					}
				]
			},
			{
				id: P.kael,
				name: 'Kael Morvan',
				oathId: 'arcaniste',
				level: 3,
				xp: 40,
				// maxAtLevel(3, Arcaniste 1/1/8) = 32 / 52 / 36
				pvCur: 32,
				pvMax: 32,
				epCur: 44,
				epMax: 52,
				emCur: 36,
				emMax: 36,
				weapon: 'Orbe du serment'
			},
			{
				id: P.seren,
				name: 'Seren Vallombre',
				oathId: 'rodeur',
				level: 1,
				xp: 0
			}
		]);

		// --- Comptes -------------------------------------------------------------------------
		const demoAccounts: {
			id: string;
			pseudo: DemoPseudo;
			role: AccountRole;
			characterId?: string | null;
		}[] = [
			{ id: A.admin, pseudo: 'admin', role: 'admin' },
			{ id: A.alice, pseudo: 'alice', role: 'joueur', characterId: P.aria },
			{ id: A.bob, pseudo: 'bob', role: 'joueur', characterId: P.kael },
			{ id: A.mj, pseudo: 'mj', role: 'mj' },
			{ id: A.designer, pseudo: 'designer', role: 'designer' },
			// Compte en attente de liaison : aucun personnage.
			{ id: A.nova, pseudo: 'nova', role: 'joueur', characterId: null }
		];
		const accountRows: NewAccount[] = demoAccounts.map((a) => ({
			...a,
			passwordHash: legacySha256Hash(DEMO_PASSWORDS[a.pseudo])
		}));
		await tx.insert(accounts).values(accountRows);
		await tx.insert(accountThemeGrants).values({
			accountId: A.alice,
			themeId: 'violet',
			kind: 'unlocked',
			grantedBy: A.admin
		});
		await tx
			.insert(readingMarks)
			.values({ accountId: A.alice, lastReadAt: at(-3), bookmarkText: 'Reprendre au gué.' });

		// --- Inventaire d'Aria (dont gemmes) ---------------------------------------------------
		await tx.insert(characterItems).values([
			{
				id: 'i_demo_potion',
				characterId: P.aria,
				legacyId: 'it1',
				name: 'Potion de soin',
				category: 'Consommable',
				qty: 2,
				description: 'Rend 15 PV.',
				position: 0
			},
			{
				id: 'i_demo_gemme_blanche',
				characterId: P.aria,
				legacyId: 'it2',
				name: 'Gemme Blanche',
				category: 'Gemme',
				qty: 3,
				position: 1
			},
			{
				id: 'i_demo_gemme_incarnate',
				characterId: P.aria,
				name: 'Gemme Incarnate',
				category: 'Gemme',
				qty: 1,
				position: 2
			},
			{
				id: 'i_demo_cape',
				characterId: P.aria,
				name: 'Cape de brume',
				category: 'Équipement',
				qty: 1,
				description: 'Tissée de brouillard de lisière.',
				position: 3
			},
			{
				id: 'i_demo_carte',
				characterId: P.aria,
				name: 'Carte du canyon',
				category: 'Divers',
				qty: 1,
				position: 4
			},
			{
				id: 'i_demo_kael_potion',
				characterId: P.kael,
				name: 'Potion de soin',
				category: 'Consommable',
				qty: 1,
				position: 0
			}
		]);

		// --- Créatures et zones ---------------------------------------------------------------
		await tx.insert(beasts).values([
			{
				id: B.loup,
				name: 'Loup des lianes',
				subtitle: 'Chasseur en meute',
				behavior: 'Agressif',
				level: 2,
				pv: 24,
				ep: 30,
				strike: 'Morsure (6)',
				drops: 'Croc',
				gem: 'Gemme Blanche',
				description: 'Il suit les lianes comme d’autres suivent une piste.',
				qtyMin: 2,
				qtyMax: 4,
				spawnWeight: 3,
				tags: ['meute']
			},
			{
				id: B.corbeau,
				name: 'Corbeau d’encre',
				behavior: 'Neutre',
				level: 1,
				pv: 10,
				ep: 20,
				strike: 'Bec (3)',
				qtyMin: 1,
				qtyMax: 3,
				spawnWeight: 2
			},
			{
				id: B.golem,
				name: 'Golem de racines',
				behavior: 'Neutre',
				level: 5,
				pv: 60,
				ep: 20,
				strike: 'Poing de bois (12)',
				skill: 'Enracinement',
				qtyMin: 1,
				qtyMax: 1,
				spawnWeight: 1
			},
			{
				id: B.vouivre,
				name: 'Vouivre du canyon',
				behavior: 'Agressif',
				level: 7,
				pv: 90,
				ep: 60,
				strike: 'Queue (16)',
				gem: 'Gemme Incarnate',
				qtyMin: 1,
				qtyMax: 1,
				spawnWeight: 1
			},
			{
				id: B.ombre,
				name: 'Ombre sans nom',
				behavior: 'Très agressif',
				level: 9,
				pv: 120,
				ep: 80,
				hidden: true,
				adminNote: 'Réservée à l’arc de la lune rouge : ne pas révéler.',
				qtyMin: 1,
				qtyMax: 1,
				spawnWeight: 0
			},
			{
				id: B.sanglier,
				name: 'Sanglier ancien',
				behavior: 'Agressif',
				level: 3,
				pv: 40,
				ep: 25,
				archived: true,
				qtyMin: 1,
				qtyMax: 2,
				spawnWeight: 1
			}
		]);
		await tx.insert(beastZones).values([
			{ beastId: B.loup, zoneId: 'foret-aux-lianes' },
			{ beastId: B.loup, zoneId: 'foret-centre' },
			{ beastId: B.corbeau, zoneId: 'foret-aux-arbres-sombres' },
			{ beastId: B.golem, zoneId: 'arbre-geant' },
			{ beastId: B.vouivre, zoneId: 'lisiere-du-canyon' },
			{ beastId: B.ombre, zoneId: 'foret-aux-arbres-sombres' },
			{ beastId: B.sanglier, zoneId: 'foret-centre' }
		]);

		// --- Rendez-vous -----------------------------------------------------------------------
		await tx.insert(events).values([
			{
				id: E.chasse,
				title: 'Chasse dans la forêt aux lianes',
				type: 'combat',
				description: 'Une meute a été aperçue près des lianes basses.',
				startsAt: at(3),
				capacity: 4,
				discordUrl: 'https://discord.com/channels/demo/foret-aux-lianes',
				createdBy: A.mj,
				createdByLabel: 'mj'
			},
			{
				id: E.conseil,
				title: 'Conseil à l’arbre géant',
				type: 'social',
				description: 'Deux places seulement autour du feu.',
				startsAt: at(7),
				capacity: 2,
				createdBy: A.designer,
				createdByLabel: 'designer'
			},
			{
				id: E.passe,
				title: 'Exploration de la lisière',
				type: 'exploration',
				startsAt: at(-10),
				capacity: 0,
				createdBy: A.mj,
				createdByLabel: 'mj'
			},
			{
				id: E.masque,
				title: 'Préparatifs de la lune rouge',
				type: 'evenement',
				startsAt: at(14),
				capacity: 0,
				hidden: true,
				createdBy: A.mj,
				createdByLabel: 'mj'
			}
		]);
		await tx.insert(eventParticipants).values([
			{ eventId: E.chasse, characterId: P.aria },
			{ eventId: E.conseil, characterId: P.aria },
			{ eventId: E.conseil, characterId: P.kael }, // complet : 2 / 2
			{ eventId: E.passe, characterId: P.kael },
			{ eventId: E.passe, characterId: P.aria }
		]);

		// --- Combat terminé et archivé ---------------------------------------------------------
		const combatClosedAt = at(-10, 19);
		combatClosedAt.setUTCMinutes(47);
		const demoState = async (
			id: string,
			name: string,
			beastIds: string[],
			rounds: number,
			startedAt: number
		) => {
			let state = createCombat({
				id,
				name,
				ownerAccountId: A.mj,
				notes: 'Surveiller le passage derrière les racines.'
			});
			const sheets = await tx
				.select()
				.from(characters)
				.where(inArray(characters.id, [P.aria, P.kael]));
			for (const sheet of sheets) {
				const [oath] = await tx.select().from(oaths).where(eq(oaths.id, sheet.oathId));
				const branch = findBranch(oathDefinitionFromRow(oath), sheet.branch);
				state = addFighter(state, {
					type: 'player',
					characterId: sheet.id,
					name: sheet.name,
					oathName: oath.name,
					level: sheet.level,
					pvCur: sheet.pvCur,
					pvMax: sheet.pvMax,
					epCur: sheet.epCur,
					epMax: sheet.epMax,
					emCur: sheet.emCur,
					emMax: sheet.emMax,
					dmgBase: oath.baseDamage,
					branch: branch ? { name: branch.nom, tiers: branch.paliers } : null
				});
			}
			for (const beastId of beastIds) {
				const [beast] = await tx.select().from(beasts).where(eq(beasts.id, beastId));
				state = addFighter(state, {
					type: 'beast',
					beastId,
					name: beast.name,
					level: beast.level,
					pv: beast.pv,
					ep: beast.ep,
					strike: beast.strike,
					skill: beast.skill,
					behavior: beast.behavior,
					gem: beast.gem
				});
			}
			state = startCombat(state, undefined, { now: startedAt });
			for (let n = 0; n < rounds; n++) {
				for (const id of state.order) {
					const fighter = state.fighters.find((f) => f.id === id)!;
					if (fighter.type === 'player')
						state = declareAction(state, id, 'frappe', { target: state.fighters.at(-1)!.id });
					state = declareAction(state, id, 'passer');
				}
				const debut = state.log.length;
				state = resolveRound(state, () => 0.5);
				const instant = new Intl.DateTimeFormat('fr-FR', {
					timeZone: 'Europe/Paris',
					hour: '2-digit',
					minute: '2-digit'
				}).format(new Date(startedAt + (n + 1) * 93000));
				state.log = state.log.map((e, i) =>
					i >= debut && e.kind === 'round' && /Résolution Round/.test(e.text)
						? { ...e, text: e.text + ' · résolu à ' + instant }
						: e
				);
			}
			return {
				state,
				characterRevisions: Object.fromEntries(sheets.map((s) => [s.id, s.revision]))
			};
		};
		const archived = await demoState(
			DEMO_IDS.combat,
			'Embuscade à la lisière',
			[B.corbeau, B.vouivre],
			2,
			combatClosedAt.getTime() - 3600000
		);
		const ending = endCombat(archived.state, { now: combatClosedAt.getTime() });
		await tx.insert(combats).values({
			id: DEMO_IDS.combat,
			ownerAccountId: A.mj,
			ownerLabel: 'mj',
			name: 'Embuscade à la lisière',
			label: 'Vouivre du canyon',
			status: 'termine',
			round: ending.state.round,
			phase: 'idle',
			state: { ...ending.state, characterRevisions: archived.characterRevisions },
			savedAt: combatClosedAt,
			manualSaved: true,
			visibleToParticipants: true,
			discordUrl: 'https://discord.com/channels/demo/lisiere-du-canyon',
			closedAt: combatClosedAt
		});
		await tx.insert(combatParticipants).values([
			{
				combatId: DEMO_IDS.combat,
				characterId: P.aria,
				outcome: {
					pvCur: 51,
					pvMax: 66,
					epCur: 70,
					emCur: 32,
					xpGain: 70,
					drops: ['Gemme Incarnate']
				}
			},
			{
				combatId: DEMO_IDS.combat,
				characterId: P.kael,
				outcome: { pvCur: 32, pvMax: 32, epCur: 44, emCur: 36, xpGain: 35, drops: [] }
			}
		]);
		const opened = await demoState(
			DEMO_IDS.openCombat,
			'Aux racines de la lisière',
			[B.loup, B.golem],
			1,
			now - 300000
		);
		await tx.insert(combats).values({
			id: DEMO_IDS.openCombat,
			ownerAccountId: A.mj,
			ownerLabel: 'mj',
			name: opened.state.name,
			status: 'en_cours',
			round: opened.state.round,
			phase: opened.state.phase,
			state: { ...opened.state, characterRevisions: opened.characterRevisions },
			savedAt: new Date(now),
			visibleToParticipants: true,
			discordUrl: 'https://discord.com/channels/demo/lisiere-du-canyon'
		});
		await tx
			.insert(combatParticipants)
			.values(
				[P.aria, P.kael].map((characterId) => ({ combatId: DEMO_IDS.openCombat, characterId }))
			);

		// --- Historique d'Aria (registre des conséquences) -------------------------------------
		await tx.insert(characterHistory).values([
			{
				characterId: P.aria,
				ts: at(-30),
				type: 'add',
				text: 'Personnage créé.',
				actorName: 'Système',
				actorRole: 'regles'
			},
			{
				characterId: P.aria,
				ts: at(-12),
				type: 'gemme',
				text: '+5 XP (Gemme Blanche).',
				actorName: 'Aria Lunval (joueur)',
				actorAccountId: A.alice,
				actorRole: 'joueur',
				field: 'xp',
				oldValue: '65',
				newValue: '70'
			},
			{
				characterId: P.aria,
				ts: combatClosedAt,
				type: 'combat',
				text: '+70 XP — Vouivre du canyon (participation 100 %).',
				actorName: 'MJ mj',
				actorAccountId: A.mj,
				actorRole: 'mj',
				combatId: DEMO_IDS.combat,
				field: 'xp',
				oldValue: '70',
				newValue: '140',
				motif: 'Clôture de l’embuscade à la lisière.'
			},
			{
				characterId: P.aria,
				ts: combatClosedAt,
				type: 'item',
				text: 'Reçu : Gemme Incarnate ×1.',
				actorName: 'MJ mj',
				actorAccountId: A.mj,
				actorRole: 'mj',
				combatId: DEMO_IDS.combat,
				field: 'item',
				newValue: 'Gemme Incarnate ×1',
				motif: 'Butin de la vouivre.'
			},
			{
				characterId: P.aria,
				ts: at(-2),
				type: 'stat',
				text: 'PV : 66 → 51.',
				actorName: 'MJ mj',
				actorAccountId: A.mj,
				actorRole: 'mj',
				field: 'pv',
				oldValue: '66',
				newValue: '51',
				motif: 'Blessure reçue au gué.'
			}
		]);
		await tx.insert(characterHistory).values({
			characterId: P.kael,
			ts: combatClosedAt,
			type: 'combat',
			text: '+35 XP — Vouivre du canyon (participation 50 %).',
			actorName: 'MJ mj',
			actorAccountId: A.mj,
			actorRole: 'mj',
			combatId: DEMO_IDS.combat,
			field: 'xp',
			oldValue: '5',
			newValue: '40',
			motif: 'Clôture de l’embuscade à la lisière.'
		});
		await tx.insert(journalEntries).values([
			{
				id: 'j_demo_aria_1',
				characterId: P.aria,
				ts: at(-30),
				text: 'Avant le carnet : la lisière m’a appris à écouter le vent avant la lame.'
			},
			{
				id: 'j_demo_aria_2',
				characterId: P.aria,
				ts: at(-1),
				text: 'La brume ne se lève pas. Kael dit qu’elle écoute.',
				inScene: true
			}
		]);

		// --- Scène ouverte ---------------------------------------------------------------------
		await tx.insert(scenes).values({
			id: DEMO_IDS.scene,
			title: 'Brume sur la forêt-centre',
			discordUrl: 'https://discord.com/channels/demo/foret-centre',
			status: 'ouverte',
			summary: 'Aria et Kael suivent une piste effacée par la brume.',
			openQuestion: 'Qui a allumé le feu au pied du grand chêne ?',
			createdBy: A.alice,
			lastActivityAt: at(-1)
		});
		await tx.insert(sceneParticipants).values([
			{
				sceneId: DEMO_IDS.scene,
				characterId: P.aria,
				bookmarkText: 'Je venais de trouver les cendres encore tièdes.',
				pinned: true
			},
			{ sceneId: DEMO_IDS.scene, characterId: P.kael }
		]);

		return {
			applied: true,
			accounts: accountRows.length,
			characters: 3,
			beasts: 6,
			events: 4,
			combats: 2,
			scenes: 1
		};
	});
}
