// Migration CLI hors session : contrat explicite du paquet G, architecture §7 / §10.10.
// Aucune correction de fiche existante : les conflits sont seulement rapportés.
import { and, eq, getTableColumns, getTableName, sql } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { Db } from '../db';
import * as s from '../db/schema';
import { THEME_SEED, ZONE_SEED, oathRowsFor } from '../db/referentials';
import { BUILTIN_OATHS, findOath, oathSlug } from '../../game/oaths';
import { appendStaffLog } from '../domain/staff-log';
import { recordAudit } from '../domain/audit';
import { checksum, validateSnapshot, type Snapshot } from './snapshot';
import * as n from './normalize';
import { createReport, tableCounts, type MigrationReport } from './report';
import { enrichCombatState } from '../domain/combat-context';
import type { CombatState } from '../../game/combat';

export const TRANSFORMER_VERSION = 1;
export interface MigrationOptions {
	dryRun: boolean;
}
type Outcome = 'created' | 'unchanged' | 'arbitration';
type Row = Record<string, unknown>;
class DryRunRollback extends Error {
	constructor(readonly report: MigrationReport) {
		super('Simulation terminée.');
	}
}
function comparable(value: unknown): unknown {
	if (value instanceof Date) return value.toISOString();
	if (Array.isArray(value)) return value.map(comparable);
	if (value && typeof value === 'object')
		return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, comparable(v)]));
	return value;
}
function matches(existing: Row, expected: Row): boolean {
	return Object.entries(expected).every(
		([k, v]) => checksum(comparable(existing[k])) === checksum(comparable(v))
	);
}

/** Verrou et rollback uniques : une erreur annule tout ; les écarts de projection sont rapportés. */
export async function migrateSnapshot(
	db: Db,
	snapshot: Snapshot,
	options: MigrationOptions
): Promise<MigrationReport> {
	const valid = validateSnapshot(snapshot),
		report = createReport(options.dryRun);
	const store = new Map(valid.rows.map((r) => [r.key, JSON.parse(r.value) as unknown]));
	const anomaly = (code: string, sourceKey: string, sourceId: string, message: string) =>
		report.anomalies.push({ code, sourceKey, sourceId, message });
	try {
		return await db.transaction(async (tx) => {
			// Verrou global obligatoire, fourni aussi par PGlite (04 §10.10, revue B9).
			await tx.execute(sql`SELECT pg_advisory_xact_lock(724031010)`);

			/** SQL construit uniquement depuis les colonnes Drizzle ; valeurs liées via leurs encodeurs.
			 * Les identités composites sont représentées par un objet, jamais par du SQL source.
			 */
			async function importRow(
				table: PgTable,
				row: Row,
				identity: Row,
				sourceKey: string,
				sourceId: string,
				source: unknown,
				baseline?: Row
			): Promise<Outcome> {
				const tableName = getTableName(table),
					counts = tableCounts(report, tableName);
				counts.read++;
				const digest = checksum({ source, projection: comparable(row) }),
					targetId =
						Object.keys(identity).length === 1
							? String(Object.values(identity)[0])
							: JSON.stringify(identity);
				const registered = await tx
					.select()
					.from(s.migrationRegistry)
					.where(
						and(
							eq(s.migrationRegistry.sourceKey, sourceKey),
							eq(s.migrationRegistry.sourceId, sourceId),
							eq(s.migrationRegistry.transformerVersion, TRANSFORMER_VERSION)
						)
					);
				if (registered.length) {
					if (registered[0].checksum === digest) {
						counts.unchanged++;
						return 'unchanged';
					}
					counts.arbitration++;
					anomaly(
						'SOURCE_CHANGED',
						sourceKey,
						sourceId,
						'Source modifiée pour une cible déjà migrée : à arbitrer, sans écrasement.'
					);
					return 'arbitration';
				}
				// Une nouvelle version du transformateur ne donne pas le droit d'écraser une ancienne cible.
				const occupied = await tx
					.select()
					.from(s.migrationRegistry)
					.where(
						and(
							eq(s.migrationRegistry.targetTable, tableName),
							eq(s.migrationRegistry.targetId, targetId)
						)
					);
				const columns = getTableColumns(table);
				const where = sql.join(
					Object.entries(identity).map(
						([k, v]) => sql`${columns[k]} = ${sql.param(v, columns[k])}`
					),
					sql` AND `
				);
				const [existing] = await tx.select().from(table).where(where).for('update');
				// Contraintes naturelles (04 §10.4) : un pseudo/nom déjà pris est à arbitrer,
				// sans casser toute la transaction ni écraser le compte de démonstration.
				const naturalKey =
					table === s.accounts ? 'pseudo' : table === s.oaths || table === s.zones ? 'name' : null;
				if (!existing && naturalKey) {
					const insensitive = table !== s.zones;
					const collision = await tx
						.select()
						.from(table)
						.where(
							insensitive
								? sql`lower(${columns[naturalKey]}) = lower(${sql.param(row[naturalKey], columns[naturalKey])})`
								: sql`${columns[naturalKey]} = ${sql.param(row[naturalKey], columns[naturalKey])}`
						);
					if (collision.length) {
						counts.arbitration++;
						anomaly(
							'NATURAL_KEY_COLLISION',
							sourceKey,
							sourceId,
							'Pseudo ou nom déjà occupé : à arbitrer.'
						);
						return 'arbitration';
					}
				}
				if (
					occupied.length ||
					(existing && !matches(existing, row) && !(baseline && matches(existing, baseline)))
				) {
					counts.arbitration++;
					anomaly(
						'TARGET_OCCUPIED',
						sourceKey,
						sourceId,
						'Cible existante différente ou déjà enregistrée : à arbitrer.'
					);
					return 'arbitration';
				}
				if (!existing) {
					const entries = Object.entries(row).filter(([, v]) => v !== undefined);
					await tx.execute(
						sql`INSERT INTO ${table} (${sql.join(
							entries.map(([k]) => sql.identifier(columns[k].name)),
							sql`, `
						)}) VALUES (${sql.join(
							entries.map(([k, v]) => sql.param(v, columns[k])),
							sql`, `
						)})`
					);
					counts.created++;
					report.writes++;
				} else if (!matches(existing, row)) {
					// Seules les valeurs EXACTES du catalogue semé peuvent être remplacées au premier import.
					const entries = Object.entries(row).filter(
						([k, v]) => !Object.hasOwn(identity, k) && v !== undefined
					);
					await tx.execute(
						sql`UPDATE ${table} SET ${sql.join(
							entries.map(
								([k, v]) => sql`${sql.identifier(columns[k].name)} = ${sql.param(v, columns[k])}`
							),
							sql`, `
						)} WHERE ${where}${columns.revision ? sql` AND ${columns.revision} = 1` : sql``}`
					);
					counts.created++;
					report.writes++;
				} else counts.unchanged++;
				await tx.insert(s.migrationRegistry).values({
					sourceKey,
					sourceId,
					transformerVersion: TRANSFORMER_VERSION,
					targetTable: tableName,
					targetId,
					checksum: digest
				});
				return existing && matches(existing, row) ? 'unchanged' : 'created';
			}
			const importId = (
				table: PgTable,
				row: Row,
				key: string,
				id: string,
				raw: unknown,
				baseline?: Row
			) => importRow(table, row, { id: row.id }, key, id, raw, baseline);
			const themeRows = n.normalizeThemes(store.get('event_themes'), store.get('theme_visibility'));
			for (const row of themeRows)
				await importId(
					s.themes,
					row,
					'themes',
					row.id,
					{
						events: store.get('event_themes'),
						visibility: store.get('theme_visibility'),
						id: row.id
					},
					THEME_SEED.find((t) => t.id === row.id)
						? { ...THEME_SEED.find((t) => t.id === row.id)!, revision: 1 }
						: undefined
				);
			const availableThemes = new Set(
				(await tx.select({ id: s.themes.id }).from(s.themes)).map((t) => t.id)
			);
			const rawPlayers = n.list(store.get('players')).filter((v) => v !== null),
				rawAccounts = n.list(store.get('accounts')).filter((v) => v !== null);
			if (n.list(store.get('players')).includes(null))
				anomaly('NULL_PLAYER', 'players', 'null', 'Entrées null ignorées.');
			const catalogue = n.normalizeOaths(store.get('serments_custom'));
			for (const raw of rawPlayers) {
				const r = n.object(raw),
					name = n.text(r.classe || r.class, 'Mizu');
				if (!findOath(name, catalogue)) {
					catalogue.push(n.unknownOath(name));
					anomaly(
						'UNKNOWN_OATH',
						'players',
						n.text(r.id),
						'Serment inconnu conservé, masqué et à croissance nulle.'
					);
				}
			}
			const baselineOaths = oathRowsFor(BUILTIN_OATHS);
			// Deux temps pour les FK de lignée : parents d'abord, cycle explicite signalé.
			const remaining = [...catalogue],
				inserted = new Set<string>();
			while (remaining.length) {
				const index = remaining.findIndex(
					(o) =>
						!findOath(o.evolvesFrom, catalogue) ||
						findOath(o.evolvesFrom, catalogue)?.id === o.id ||
						inserted.has(findOath(o.evolvesFrom, catalogue)!.id)
				);
				const o = remaining.splice(index < 0 ? 0 : index, 1)[0],
					row = n.normalizeOath(o, catalogue);
				if (index < 0) {
					row.evolvesFrom = null;
					anomaly('OATH_CYCLE', 'serments_custom', o.id, 'Lignée cyclique : parent non lié.');
				}
				await importId(
					s.oaths,
					row,
					'oaths',
					o.id,
					o,
					baselineOaths.find((b) => b.id === o.id)
						? { ...baselineOaths.find((b) => b.id === o.id)!, revision: 1 }
						: undefined
				);
				inserted.add(o.id);
			}
			const beastRows = n
				.list(store.get('beasts'))
				.filter((v) => v !== null)
				.map((v, i) => ({ raw: v, ...n.normalizeBeast(v, ['beasts', i]) }));
			const spawn = n.normalizeSpawn(store.get('spawn_lab_staff'));
			const zoneNames = [
				...new Set([
					...spawn.zones,
					...beastRows.flatMap((b) => b.zones),
					...spawn.runs.map((r) => r.zoneName).filter((v) => v && !v.startsWith('__'))
				])
			];
			const zoneMap = new Map((await tx.select().from(s.zones)).map((z) => [z.name, z.id]));
			for (const [i, name] of zoneNames.entries()) {
				const seeded = ZONE_SEED.find((z) => z.name === name),
					row = seeded ?? {
						id: oathSlug(name) || n.stableId('z', name),
						name,
						emoji: '',
						isDefault: false,
						position: i + ZONE_SEED.length
					};
				const result = await importId(s.zones, { ...row }, 'zones', name, name);
				if (result !== 'arbitration') zoneMap.set(name, row.id);
			}
			for (const b of beastRows) {
				if (b.quantityRecalculated)
					anomaly(
						'BEAST_QUANTITY_RECALCULATED',
						'beasts',
						b.row.id,
						`${b.row.name} : quantité saisie ${b.enteredQuantity.min ?? 'absente'}–${b.enteredQuantity.max ?? 'absente'}, plage effective héritée ${b.row.qtyMin}–${b.row.qtyMax}.`
					);
				if ((await importId(s.beasts, b.row, 'beasts', b.row.id, b.raw)) === 'arbitration')
					continue;
				for (const name of b.zones) {
					const zoneId = zoneMap.get(name);
					if (zoneId)
						await importRow(
							s.beastZones,
							{ beastId: b.row.id, zoneId },
							{ beastId: b.row.id, zoneId },
							'beast_zones',
							JSON.stringify([b.row.id, name]),
							[b.row.id, name]
						);
				}
			}
			const accounts = rawAccounts.map((v, i) => ({
				raw: v,
				...n.normalizeAccount(v, ['accounts', i])
			}));
			const accountOutcome = new Map<string, Outcome>();
			for (const a of accounts) {
				if (!availableThemes.has(a.row.selectedTheme)) {
					anomaly(
						'UNKNOWN_THEME',
						'accounts',
						a.row.id,
						'Thème choisi inconnu ; sélection dark, valeur conservée.'
					);
					a.row.extra.selectedTheme = a.row.selectedTheme;
					a.row.selectedTheme = 'dark';
				}
				accountOutcome.set(
					a.row.id,
					await importId(s.accounts, a.row, 'accounts', a.row.id, a.raw)
				);
			}
			const characters = rawPlayers.map((v, i) => ({
				raw: v,
				...n.normalizeCharacter(v, catalogue, ['players', i])
			}));
			const characterOutcome = new Map<string, Outcome>();
			const newHistoryIds = new Set<number>();
			const expectedHistoryCombat = new Map<number, string | null>();
			for (const c of characters) {
				const result = await importId(s.characters, c.row, 'players', c.row.id, c.raw);
				characterOutcome.set(c.row.id, result);
				if (result === 'arbitration') continue;
				const itemIds = new Set<string>();
				for (const item of c.items) {
					if (itemIds.has(item.id)) {
						tableCounts(report, 'character_items').quarantined++;
						anomaly(
							'DUPLICATE_ITEM',
							'players',
							c.row.id,
							'Identifiant d’objet dupliqué dans le même personnage : en quarantaine.'
						);
						continue;
					}
					itemIds.add(item.id);
					await importId(s.characterItems, item, 'character_items', item.id, item);
				}
				for (const [i, item] of n
					.list(n.object(c.raw).inventory)
					.filter((v) => v !== null)
					.entries()) {
					const quantity = n.object(item).qty;
					if (
						quantity !== undefined &&
						(typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 0)
					)
						anomaly(
							'ITEM_QUANTITY_NORMALIZED',
							'players',
							c.row.id,
							`Quantité de l’objet ${i} corrigée ; inventaire brut conservé dans extra.`
						);
				}
				for (const h of c.history)
					if (
						(await importId(s.characterHistory, h, 'character_history', String(h.id), h)) ===
						'created'
					)
						newHistoryIds.add(h.id);
				if (c.row.journal.length > 20000) {
					const counts = tableCounts(report, 'journal_entries');
					counts.read++;
					counts.quarantined++;
					anomaly(
						'JOURNAL_TOO_LONG',
						'players',
						c.row.id,
						'Journal conservé intégralement dans la colonne de transition ; première entrée trop longue, à arbitrer.'
					);
				} else if (c.row.journal) {
					const row = {
						id: n.stableId('j', c.row.id),
						characterId: c.row.id,
						ts: n.date(n.object(c.raw).createdAt, n.EPOCH)!,
						text: c.row.journal,
						inScene: false
					};
					await importId(s.journalEntries, row, 'journal', c.row.id, c.row.journal);
				}
			}
			const knownCharacters = new Set(
				(await tx.select({ id: s.characters.id }).from(s.characters)).map((c) => c.id)
			);
			for (const a of accounts) {
				// Seul le premier import peut réaliser la liaison ; jamais sur un compte déjà repris.
				if (accountOutcome.get(a.row.id) !== 'created' || !a.characterId) continue;
				const owners = accounts.filter((other) => other.characterId === a.characterId);
				const claims = await tx
					.select({ id: s.accounts.id })
					.from(s.accounts)
					.where(eq(s.accounts.characterId, a.characterId))
					.for('update');
				if (
					!knownCharacters.has(a.characterId) ||
					owners.length !== 1 ||
					claims.some((claim) => claim.id !== a.row.id)
				) {
					anomaly(
						'UNRESOLVED_LINK',
						'accounts',
						a.row.id,
						'Personnage absent ou liaison multiple : compte gardé sans liaison.'
					);
					continue;
				}
				const linked = await tx
					.update(s.accounts)
					.set({ characterId: a.characterId, updatedAt: a.row.updatedAt })
					.where(and(eq(s.accounts.id, a.row.id), eq(s.accounts.revision, 1)))
					.returning({ id: s.accounts.id });
				if (!linked.length) throw new Error('La liaison a changé pendant la migration.');
			}
			const actualAccounts = await tx.select().from(s.accounts),
				actualCharacters = await tx.select().from(s.characters);
			function resolveAccount(label: string): string | null {
				const key = label.toLowerCase();
				// L'identité historique vient du snapshot, pas d'un pseudo renommé après import.
				const sourceCandidates = accounts.filter(
					(a) =>
						a.row.id.toLowerCase() === key ||
						a.row.pseudo.toLowerCase() === key ||
						characters.some((c) => c.row.id === a.characterId && c.row.name.toLowerCase() === key)
				);
				if (sourceCandidates.length)
					return sourceCandidates.length === 1 &&
						actualAccounts.some((a) => a.id === sourceCandidates[0].row.id)
						? sourceCandidates[0].row.id
						: null;
				const candidates = actualAccounts.filter(
					(a) =>
						a.id.toLowerCase() === key ||
						a.pseudo.toLowerCase() === key ||
						actualCharacters.some((c) => c.id === a.characterId && c.name.toLowerCase() === key)
				);
				return candidates.length === 1 ? candidates[0].id : null;
			}
			for (const a of accounts) {
				if (accountOutcome.get(a.row.id) === 'arbitration') continue;
				const linkedId = actualAccounts.find((account) => account.id === a.row.id)?.characterId;
				const character = characters.find(
					(c) =>
						c.row.id === linkedId &&
						c.row.id === a.characterId &&
						characterOutcome.get(c.row.id) !== 'arbitration'
				);
				for (const [kind, ids] of [
					['unlocked', [...a.unlocked, ...(character?.unlocked ?? []), 'dark', 'light']],
					['blocked', [...a.blocked, ...(character?.blocked ?? [])]]
				] as const)
					for (const themeId of new Set(ids)) {
						if (!availableThemes.has(themeId)) {
							anomaly(
								'UNKNOWN_GRANT',
								'accounts',
								a.row.id,
								`Thème ${themeId} absent : don non lié.`
							);
							continue;
						}
						if (kind === 'blocked' && ['dark', 'light'].includes(themeId)) continue;
						const row = { accountId: a.row.id, themeId, kind };
						await importRow(
							s.accountThemeGrants,
							row,
							row,
							'theme_grants',
							JSON.stringify(row),
							row
						);
					}
			}
			for (const [i, raw] of n.list(store.get('events')).entries()) {
				if (raw === null) continue;
				const e = n.normalizeEvent(raw, ['events', i]);
				const row = { ...e.row, createdBy: resolveAccount(e.row.createdByLabel) };
				if ((await importId(s.events, row, 'events', row.id, raw)) === 'arbitration') continue;
				for (const name of e.participants) {
					const matches = characters
						.map((c) => c.row)
						.filter(
							(c) => knownCharacters.has(c.id) && c.name.toLowerCase() === name.toLowerCase()
						);
					if (matches.length !== 1) {
						const counts = tableCounts(report, 'event_participants');
						counts.read++;
						counts.quarantined++;
						anomaly(
							matches.length ? 'HOMONYM' : 'PARTICIPANT_MISSING',
							'events',
							row.id,
							`Inscription de ${name} non résolue : ${matches.length} personnages.`
						);
						continue;
					}
					const p = { eventId: row.id, characterId: matches[0].id };
					await importRow(s.eventParticipants, p, p, 'event_participants', JSON.stringify(p), p);
				}
			}
			// B9 : priorité détail > compatibilité > index, identité propriétaire + id.
			const archives = new Map<
				string,
				{ raw: unknown; owner: string; key: string; priority: number; id: string }
			>();
			for (const [key, value] of store) {
				if (!key.startsWith('combat_arc_')) continue;
				const detailed = key.startsWith('combat_arc_rec_'),
					indexed = key.startsWith('combat_arc_idx_');
				const suffix = key.slice(detailed ? 15 : indexed ? 15 : 11),
					split = detailed ? suffix.lastIndexOf('__') : -1;
				if (detailed && split < 1) {
					anomaly('INVALID_ARCHIVE_KEY', key, '', 'Propriétaire ou identifiant absent.');
					continue;
				}
				const owner = detailed ? suffix.slice(0, split) : suffix,
					priority = detailed ? 3 : indexed ? 1 : 2;
				for (const [i, raw] of (detailed ? [value] : n.list(value)).entries()) {
					const r = n.object(raw),
						id = n.text(r.id) || (detailed ? suffix.slice(split + 2) : n.stableId('c', [key, i]));
					const resolved = resolveAccount(owner),
						identity = JSON.stringify([resolved ?? owner, id]),
						previous = archives.get(identity);
					if (
						previous &&
						checksum(previous.raw) !== checksum(raw) &&
						previous.priority === priority
					)
						anomaly(
							'ARCHIVE_COLLISION',
							key,
							id,
							'Copies divergentes de même priorité : première copie conservée, à arbitrer.'
						);
					if (!previous || priority > previous.priority)
						archives.set(identity, { raw: { ...r, id }, owner, key, priority, id });
				}
			}
			const combatReferences: { legacyId: string; targetId: string; participants: string[] }[] = [];
			for (const [identity, a] of archives) {
				const ownerId = resolveAccount(a.owner),
					c = n.normalizeCombat(a.raw, ownerId ?? a.owner),
					row = { ...c.row, ownerAccountId: ownerId };
				if (!ownerId) {
					tableCounts(report, 'combats').quarantined++;
					anomaly(
						'OWNER_QUARANTINE',
						a.key,
						a.id,
						`Propriétaire ${a.owner} absent ou ambigu : archive conservée sans attribution.`
					);
				}
				if (c.rawState)
					anomaly(
						'RAW_ARCHIVE',
						a.key,
						a.id,
						'Détail indisponible : archive brute conservée avec schemaVersion 0.'
					);
				if (!c.rawState)
					row.state = {
						...(await enrichCombatState(tx, row.state as unknown as CombatState)),
						legacy: n.object(a.raw)
					};
				if ((await importId(s.combats, row, 'combat_archives', identity, a.raw)) === 'arbitration')
					continue;
				combatReferences.push({ legacyId: a.id, targetId: row.id, participants: c.participants });
				for (const characterId of c.participants) {
					if (!knownCharacters.has(characterId)) {
						anomaly('COMBAT_PARTICIPANT_MISSING', a.key, a.id, `Personnage ${characterId} absent.`);
						continue;
					}
					const p = { combatId: row.id, characterId };
					await importRow(s.combatParticipants, p, p, 'combat_participants', JSON.stringify(p), p);
				}
			}
			// Audit 06 §2.7 : l'historique porte parfois combatId. Les FK sont liées après les combats,
			// seulement pour des entrées nouvellement créées, sans réécrire un historique déjà importé.
			for (const character of characters)
				for (const [i, raw] of n
					.list(n.object(character.raw).history)
					.filter((v) => v !== null)
					.entries()) {
					const legacyCombatId = n.text(n.object(raw).combatId),
						entry = character.history[i];
					if (!legacyCombatId || !entry) continue;
					const candidates = combatReferences.filter((c) => c.legacyId === legacyCombatId);
					const participantMatches = candidates.filter((c) =>
						c.participants.includes(character.row.id)
					);
					const resolved =
						participantMatches.length === 1
							? participantMatches[0]
							: candidates.length === 1
								? candidates[0]
								: null;
					if (!resolved) {
						anomaly(
							'HISTORY_COMBAT_UNRESOLVED',
							'players',
							character.row.id,
							'Récit historique absent ou ambigu ; identifiant brut conservé dans extra.'
						);
						continue;
					}
					expectedHistoryCombat.set(entry.id, resolved.targetId);
					if (!newHistoryIds.has(entry.id)) continue;
					const linked = await tx
						.update(s.characterHistory)
						.set({ combatId: resolved.targetId })
						.where(
							and(
								eq(s.characterHistory.id, entry.id),
								sql`${s.characterHistory.combatId} IS NULL`,
								sql`EXISTS (SELECT 1 FROM ${s.characters} WHERE ${s.characters.id} = ${character.row.id} AND ${s.characters.revision} = 1)`
							)
						)
						.returning({ id: s.characterHistory.id });
					if (!linked.length) {
						anomaly(
							'HISTORY_COMBAT_CONFLICT',
							'players',
							character.row.id,
							'Historique modifié : lien non écrit.'
						);
						continue;
					}
					await tx.insert(s.migrationRegistry).values({
						sourceKey: 'history_combat_links',
						sourceId: String(entry.id),
						transformerVersion: TRANSFORMER_VERSION,
						targetTable: 'character_history',
						targetId: String(entry.id),
						checksum: checksum([legacyCombatId, resolved.targetId])
					});
				}
			for (const [i, raw] of n.list(store.get('np_syslog')).entries()) {
				const row = n.normalizeStaffLog(raw, ['np_syslog', i]);
				await importId(
					s.staffLog,
					{ ...row, actorAccountId: resolveAccount(row.actorName) },
					'np_syslog',
					String(i),
					raw
				);
			}
			for (const [i, raw] of n.list(store.get('np_syslog_archive')).entries()) {
				const a = n.normalizeStaffArchive(raw, ['np_syslog_archive', i]);
				if (
					(await importId(s.staffLogArchives, a.row, 'np_syslog_archive', String(i), raw)) ===
					'arbitration'
				)
					continue;
				for (const [j, entry] of a.entries.entries()) {
					const row = n.normalizeStaffLog(entry, [a.row.id, j], a.row.id);
					await importId(
						s.staffLog,
						{ ...row, actorAccountId: resolveAccount(row.actorName) },
						'np_syslog_archive_entries',
						`${a.row.id}:${j}`,
						entry
					);
				}
			}
			for (const [i, raw] of n.list(store.get('np_audit_log')).entries()) {
				const row = n.normalizeAudit(raw, ['np_audit_log', i]);
				await importId(
					s.auditLog,
					{
						...row,
						actorAccountId: resolveAccount(n.text(n.object(raw).actorId) || row.actorPseudo)
					},
					'np_audit_log',
					String(i),
					raw
				);
			}
			const knownBeasts = new Set(
				(await tx.select({ id: s.beasts.id }).from(s.beasts)).map((b) => b.id)
			);
			// B10 : la base cumulative EXCLUT les runs importés, qui seront additionnés par spawnTotals.
			// Sans cette soustraction, les 24 derniers tirages seraient comptés deux fois.
			const retainedRuns = [...new Map(spawn.runs.map((run) => [run.id, run])).values()];
			const represented: Record<string, number> = {};
			let representedDraws = 0;
			for (const run of retainedRuns) {
				representedDraws += run.payload.drawCount;
				for (const pack of run.payload.packs)
					represented[pack.id] = (represented[pack.id] ?? 0) + pack.qty;
			}
			for (const [beastId, total] of Object.entries(spawn.totals)) {
				const migratedDraws = Math.max(0, total - (represented[beastId] ?? 0));
				if (total < (represented[beastId] ?? 0))
					anomaly(
						'SPAWN_TOTAL_INCONSISTENT',
						'spawn_lab_staff',
						beastId,
						'Les runs conservés dépassent le cumul : à arbitrer.'
					);
				if (!knownBeasts.has(beastId)) {
					anomaly(
						'SPAWN_BEAST_MISSING',
						'spawn_lab_staff',
						beastId,
						'Cumul sans créature : en quarantaine.'
					);
					tableCounts(report, 'spawn_counters').quarantined++;
					continue;
				}
				await importRow(
					s.spawnCounters,
					{ beastId, migratedDraws },
					{ beastId },
					'spawn_totals',
					beastId,
					{ total, represented: represented[beastId] ?? 0 }
				);
			}
			if (spawn.totalDraws < representedDraws)
				anomaly(
					'SPAWN_TOTAL_INCONSISTENT',
					'spawn_lab_staff',
					'totalDraws',
					'Les runs conservés dépassent le cumul global : à arbitrer.'
				);
			if (store.has('spawn_lab_staff'))
				await importId(
					s.spawnSettings,
					{ id: 1, migratedTotalDraws: Math.max(0, spawn.totalDraws - representedDraws) },
					'spawn_total_draws',
					'1',
					{ total: spawn.totalDraws, represented: representedDraws },
					{ id: 1, migratedTotalDraws: 0 }
				);
			for (const run of spawn.runs) {
				const { zoneName, actorLabel, ...rest } = run;
				const row = {
					...rest,
					zoneId: zoneMap.get(zoneName) ?? null,
					actorAccountId: resolveAccount(actorLabel)
				};
				await importId(s.spawnRuns, row, 'spawn_runs', row.id, row.payload);
			}
			// Audit 05 §2.2 : les consommations de récupération empêchent un ancien secret de rejouer.
			const recovery = n.object(store.get('np_admin_recovery_consumed'));
			if (n.text(recovery.fingerprint)) {
				const row = {
					fingerprint: n.text(recovery.fingerprint),
					pseudo: n.text(recovery.pseudo),
					consumedAt: n.date(recovery.consumedAt, n.EPOCH)!
				};
				await importRow(
					s.adminRecoveryConsumptions,
					row,
					{ fingerprint: row.fingerprint },
					'np_admin_recovery_consumed',
					row.fingerprint,
					recovery
				);
			}
			for (const [key, value] of store) {
				if (key === 'lieux') {
					report.places = n.list(value).map((v) => JSON.stringify(v));
					continue;
				}
				if (
					[
						'rpg_characters',
						'themes_admin_store',
						'theme_catalog',
						'serment_catalog',
						'page_content',
						'np_rate_auth'
					].includes(key) ||
					(![
						'accounts',
						'players',
						'beasts',
						'events',
						'serments_custom',
						'event_themes',
						'theme_visibility',
						'spawn_lab_staff',
						'np_syslog',
						'np_syslog_archive',
						'np_audit_log',
						'np_admin_recovery_consumed'
					].includes(key) &&
						!key.startsWith('combat_arc_'))
				) {
					report.ignored[key] = Array.isArray(value)
						? value.length
						: Object.keys(n.object(value)).length || 1;
					if (key === 'np_rate_auth')
						anomaly(
							'EXPIRED_RATE_LIMITS',
							key,
							'',
							'Compteurs de connexion temporaires ignorés au basculement.'
						);
				}
			}
			const rereadAccounts = await tx.select().from(s.accounts);
			if (store.has('spawn_lab_staff')) {
				const counters = await tx.select().from(s.spawnCounters);
				const [settings] = await tx.select().from(s.spawnSettings).where(eq(s.spawnSettings.id, 1));
				const outputTotals: Record<string, number> = Object.fromEntries(
					counters.map((c) => [c.beastId, c.migratedDraws])
				);
				let outputDraws = settings?.migratedTotalDraws ?? 0;
				for (const run of await tx.select().from(s.spawnRuns)) {
					outputDraws += n.integer(run.payload.drawCount, 1);
					for (const pack of n.list(run.payload.packs).map(n.object)) {
						const id = n.text(pack.id ?? pack.beastId);
						outputTotals[id] = (outputTotals[id] ?? 0) + n.integer(pack.qty, 1);
					}
				}
				report.checks.push({
					name: 'Cumuls d’apparitions',
					passed:
						outputDraws === spawn.totalDraws &&
						Object.entries(spawn.totals).every(([id, total]) => outputTotals[id] === total),
					detail: `${outputDraws} tirages / ${spawn.totalDraws} source ; quantités par créature vérifiées.`
				});
			}
			report.checks.push({
				name: 'Comptes = comptes source',
				passed:
					rereadAccounts.length === accounts.length &&
					accounts.every((a) => rereadAccounts.some((row) => row.id === a.row.id)),
				detail: `${rereadAccounts.length} en base / ${accounts.length} source ; identifiants vérifiés.`
			});
			for (const c of characters) {
				const [row] = await tx.select().from(s.characters).where(eq(s.characters.id, c.row.id));
				const items = await tx
					.select()
					.from(s.characterItems)
					.where(eq(s.characterItems.characterId, c.row.id));
				const history = await tx
					.select()
					.from(s.characterHistory)
					.where(eq(s.characterHistory.characterId, c.row.id));
				const validProjection =
					!!row &&
					matches(row, c.row) &&
					items.length === c.items.length &&
					c.items.every((item) => items.some((existing) => matches(existing, item))) &&
					history.length === c.history.length &&
					c.history.every((h) =>
						history.some((existing) =>
							matches(existing, { ...h, combatId: expectedHistoryCombat.get(h.id) ?? null })
						)
					);
				report.checks.push({
					name: `Projection ${c.row.id}`,
					passed: validProjection,
					detail: `Niveau, XP, ressources, objets et historique (${history.length}/${c.history.length}).`
				});
				if (!validProjection)
					anomaly(
						'OUTPUT_PROJECTION',
						'players',
						c.row.id,
						'Projection différente : à vérifier avant le basculement.'
					);
			}
			// Même un import sans écriture cible peut produire une quarantaine à arbitrer.
			await tx
				.insert(s.migrationRegistry)
				.values({
					sourceKey: 'migration_report',
					sourceId: valid.sha256,
					transformerVersion: TRANSFORMER_VERSION,
					targetTable: 'migration_report',
					targetId: valid.sha256,
					checksum: checksum(report.anomalies),
					anomalies: report.anomalies
				})
				.onConflictDoNothing();
			if (report.writes) {
				await appendStaffLog(tx, {
					action: 'migration_legacy',
					detail: `${report.writes} lignes héritées reprises.`,
					actor: null
				});
				await recordAudit(tx, {
					source: 'legacy',
					action: 'migration_legacy',
					actor: null,
					details: {
						snapshotSha256: valid.sha256,
						writes: report.writes,
						transformerVersion: TRANSFORMER_VERSION
					}
				});
			}
			if (options.dryRun) throw new DryRunRollback(report);
			return report;
		});
	} catch (error) {
		if (error instanceof DryRunRollback) return error.report;
		throw error;
	}
}
