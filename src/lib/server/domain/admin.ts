// Registre › Données (06-contrats §B.8 ; 03-vision §5.11 ; audit 08 §4.6 export partiel, §6.3
// diagnostic serveur). Administrateur seulement (`admin.data`).
//   - exportData : JSON PARTIEL, mention exacte « Ce n'est pas une sauvegarde complète du site. » ;
//     jamais de mot de passe, d'empreinte, de jeton, de session, de secret ;
//   - migrationStatus : lecture de `migration_registry` ;
//   - diagnostics : base joignable, variables d'environnement PRÉSENTES (booléens, jamais les
//     valeurs), version du paquet. Aucune écriture.
import { asc, sql } from 'drizzle-orm';
import type { Db } from '$lib/server/db';
import { isProductionEnv } from '$lib/server/db';
import {
	accounts,
	beastZones,
	beasts,
	characterItems,
	characters,
	eventParticipants,
	events,
	migrationRegistry,
	oaths,
	settings,
	zones
} from '$lib/server/db/schema';
import { assertCan, type Actor } from '$lib/server/permissions';
import {
	EXPORT_NOTICE,
	type DiagnosticsView,
	type ExportDataView,
	type MigrationStatusView
} from '$lib/schemas/admin';
import packageJson from '../../../../package.json';
import { recordAudit } from './audit';

type Env = Record<string, string | undefined>;

/** Remplace les dates par leur forme ISO (JSON lisible et stable). */
function plain<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(row)) out[k] = v instanceof Date ? v.toISOString() : v;
	return out;
}

/** Ce que l'export ne contient pas, écrit dans le fichier lui-même. */
export const EXPORT_EXCLUDED = [
	'mots de passe, empreintes, sessions et secrets de réinitialisation',
	'journal d’audit et journal staff',
	'historique des fiches (conséquences), journaux, déclarations et faits validés',
	'combats, récits et publications',
	'scènes, signets et marque-pages',
	'thèmes et dons de thèmes',
	'tirages d’apparitions'
] as const;

/**
 * Export JSON partiel (Registre › Données) : comptes (métadonnées), personnages et inventaires,
 * Serments, bestiaire et zones, rendez-vous et inscriptions, réglages. L'export est audité.
 */
export async function exportData(db: Db, actor: Actor | null): Promise<ExportDataView> {
	const present = assertCan(actor, 'admin.data');

	const accountRows = await db
		.select({
			id: accounts.id,
			pseudo: accounts.pseudo,
			role: accounts.role,
			characterId: accounts.characterId,
			discordId: accounts.discordId,
			lastSeenAt: accounts.lastSeenAt,
			createdAt: accounts.createdAt
		})
		.from(accounts)
		.orderBy(asc(accounts.pseudo));

	const characterRows = await db
		.select()
		.from(characters)
		.orderBy(asc(characters.name), asc(characters.id));
	const itemRows = await db
		.select()
		.from(characterItems)
		.orderBy(asc(characterItems.characterId), asc(characterItems.position), asc(characterItems.id));
	const itemsByCharacter = new Map<string, Record<string, unknown>[]>();
	for (const item of itemRows) {
		const list = itemsByCharacter.get(item.characterId) ?? [];
		const { characterId: _owner, ...rest } = item;
		void _owner;
		list.push(plain(rest));
		itemsByCharacter.set(item.characterId, list);
	}

	const beastRows = await db.select().from(beasts).orderBy(asc(beasts.name), asc(beasts.id));
	const beastZoneRows = await db.select().from(beastZones);
	const zonesByBeast = new Map<string, string[]>();
	for (const bz of beastZoneRows) {
		zonesByBeast.set(bz.beastId, [...(zonesByBeast.get(bz.beastId) ?? []), bz.zoneId].sort());
	}

	const eventRows = await db.select().from(events).orderBy(asc(events.startsAt), asc(events.id));
	const participantRows = await db.select().from(eventParticipants);
	const participantsByEvent = new Map<string, { characterId: string; registeredAt: string }[]>();
	for (const p of participantRows) {
		const list = participantsByEvent.get(p.eventId) ?? [];
		list.push({ characterId: p.characterId, registeredAt: p.registeredAt.toISOString() });
		participantsByEvent.set(p.eventId, list);
	}

	const view: ExportDataView = {
		format: 'nuages-polaires-export-partiel',
		version: 3,
		notice: EXPORT_NOTICE,
		exportedAt: new Date().toISOString(),
		excluded: [...EXPORT_EXCLUDED],
		accounts: accountRows.map((a) => ({
			id: a.id,
			pseudo: a.pseudo,
			role: a.role,
			characterId: a.characterId,
			discordLinked: !!a.discordId,
			lastSeenAt: a.lastSeenAt ? a.lastSeenAt.toISOString() : null,
			createdAt: a.createdAt.toISOString()
		})),
		characters: characterRows.map((c) => ({
			...plain(c),
			items: itemsByCharacter.get(c.id) ?? []
		})),
		oaths: (await db.select().from(oaths).orderBy(asc(oaths.name))).map(plain),
		beasts: beastRows.map((b) => ({ ...plain(b), zones: zonesByBeast.get(b.id) ?? [] })),
		zones: (await db.select().from(zones).orderBy(asc(zones.position), asc(zones.id))).map(plain),
		events: eventRows.map((e) => ({
			...plain(e),
			participants: participantsByEvent.get(e.id) ?? []
		})),
		settings: await db
			.select({ key: settings.key, value: settings.value })
			.from(settings)
			.orderBy(asc(settings.key))
	};

	await recordAudit(db, {
		source: 'admin',
		action: 'export_data',
		actor: present,
		details: {
			accounts: view.accounts.length,
			characters: view.characters.length,
			beasts: view.beasts.length,
			events: view.events.length
		}
	});
	return view;
}

/** État de la migration héritée, lu dans `migration_registry` (aucune écriture). */
export async function migrationStatus(db: Db, actor: Actor | null): Promise<MigrationStatusView> {
	assertCan(actor, 'admin.data');
	const tables = await db
		.select({
			table: migrationRegistry.targetTable,
			count: sql<number>`count(*)::int`,
			lastMigratedAt: sql<Date | string | null>`max(${migrationRegistry.migratedAt})`
		})
		.from(migrationRegistry)
		.groupBy(migrationRegistry.targetTable)
		.orderBy(asc(migrationRegistry.targetTable));
	const versions = await db
		.selectDistinct({ v: migrationRegistry.transformerVersion })
		.from(migrationRegistry)
		.orderBy(asc(migrationRegistry.transformerVersion));
	const iso = (v: Date | string | null): string | null =>
		v === null ? null : new Date(v).toISOString();
	const rows = tables.map((t) => ({
		table: t.table,
		count: t.count,
		lastMigratedAt: iso(t.lastMigratedAt)
	}));
	const total = rows.reduce((sum, r) => sum + r.count, 0);
	const last = rows
		.map((r) => r.lastMigratedAt)
		.filter((v): v is string => v !== null)
		.sort()
		.at(-1);
	return {
		migrated: total > 0,
		total,
		lastMigratedAt: last ?? null,
		transformerVersions: versions.map((v) => v.v),
		tables: rows,
		charactersMigrated: rows.find((r) => r.table === 'characters')?.count ?? 0
	};
}

function present(env: Env, name: string): boolean {
	return (env[name] ?? '').trim() !== '';
}

/**
 * Diagnostics sûrs : la base répond-elle, quelles variables sont présentes, quelle version tourne.
 * Aucune écriture, aucune valeur de variable ni secret dans la réponse. `options.env` sert aux tests.
 */
export async function diagnostics(
	db: Db,
	actor: Actor | null,
	options: { env?: Env } = {}
): Promise<DiagnosticsView> {
	assertCan(actor, 'admin.data');
	const env = options.env ?? process.env;
	let dbReachable = false;
	let dbLatencyMs: number | null = null;
	const started = performance.now();
	try {
		await db.execute(sql`select 1`);
		dbReachable = true;
		dbLatencyMs = Math.round(performance.now() - started);
	} catch {
		// Base injoignable : `dbReachable` reste faux, sans exception (diagnostic sûr).
	}
	return {
		dbReachable,
		dbLatencyMs,
		env: {
			databaseConfigured: present(env, 'DATABASE_URL') || present(env, 'NETLIFY_DATABASE_URL'),
			pgliteDriver: (env.NP_DB_DRIVER ?? '').trim().toLowerCase() === 'pglite',
			sessionSecretConfigured: (env.NP_SESSION_SECRET ?? '').length >= 32,
			siteUrlConfigured: present(env, 'NP_SITE_URL'),
			adminBootstrapConfigured:
				present(env, 'NP_ADMIN_PSEUDO') && present(env, 'NP_ADMIN_PASSWORD'),
			adminRecoveryEnabled: (env.NP_ADMIN_RECOVERY ?? '').trim().toLowerCase() === 'true',
			discordLoginConfigured:
				present(env, 'DISCORD_CLIENT_ID') && present(env, 'DISCORD_CLIENT_SECRET'),
			discordWebhookConfigured: present(env, 'DISCORD_EVENTS_WEBHOOK_URL'),
			production: isProductionEnv(env)
		},
		version: String(packageJson.version ?? ''),
		at: new Date().toISOString()
	};
}
