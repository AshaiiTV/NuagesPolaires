import { assertFreshAccount, auditContextOf } from '../auth/context';
import { and, asc, eq, sql } from 'drizzle-orm';
import type { z } from 'zod';
import type { Db, Tx } from '../db';
import { oaths, characters, characterHistory, type Oath, type OathBranch } from '../db/schema';
import { seedOaths } from '../db/seed';
import { assertCan, can, type Actor } from '../permissions';
import { NpError } from '../http';
import {
	BUILTIN_OATHS,
	OATH_RANK_LABELS,
	PUBLIC_RANKS,
	oathSlug,
	visibleOaths,
	unlockedTiers,
	tierLevelsFor,
	branchMatchesLabel
} from '$lib/game/oaths';
import type { OathDefinition } from '$lib/game/types';
import {
	createOathSchema,
	updateOathSchema,
	setOathHiddenSchema,
	listOathsSchema,
	type CreateOathInput,
	type UpdateOathInput,
	type OathView,
	type OathRowView,
	type TierView
} from '$lib/schemas/oaths';
import { referenceIdSchema } from '$lib/schemas/beasts';
import { appendStaffLog } from './staff-log';
import { recordAudit } from './audit';
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
	const result = schema.safeParse(input);
	if (!result.success)
		throw new NpError('INVALID', result.error.issues[0]?.message ?? 'Entrée invalide.');
	return result.data;
}
function definition(row: Oath): OathDefinition {
	const branch = (b: OathBranch | null | undefined) => (b ? { ...b, style: b.style ?? '' } : null);
	return {
		id: row.id,
		name: row.name,
		weapon: row.weapon,
		growth: { pvN: row.pvGrowth, epN: row.epGrowth, emN: row.emGrowth },
		baseDamage: row.baseDamage,
		damageType: row.damageType,
		rank: row.rank,
		hidden: row.hidden,
		evolvesFrom: row.evolvesFrom,
		icon: row.icon,
		category: row.category,
		lore: row.lore,
		branches: { bA: branch(row.branches.bA), bB: branch(row.branches.bB) },
		isBuiltin: row.isBuiltin
	};
}
function tierViews(branch: OathBranch, rank: Oath['rank']): TierView[] {
	// Audit 02 §4.3 : niveaux enregistrés ; table pure pour les valeurs de repli.
	return branch.paliers
		.map((tier, index) => ({
			level: tier.niv || tierLevelsFor(rank)[index],
			name: tier.nom,
			cost: tier.cout,
			description: tier.desc,
			stage:
				['I Éveil', 'II Densité', 'III Maîtrise', 'IV Plénitude'][index] ?? `Palier ${index + 1}`
		}))
		.sort((a, b) => a.level - b.level);
}
export function tiersFor(
	oath: Oath | OathDefinition | OathView,
	branch: string | null,
	level: number
): { reached: TierView[]; next: TierView[] } {
	if ('reserved' in oath) {
		const selected = oath.branches.find((b) =>
			branchMatchesLabel({ nom: b.label, style: b.style, paliers: [] }, branch)
		);
		return {
			reached: selected?.tiers.filter((tier) => tier.level <= level) ?? [],
			next: selected?.tiers.filter((tier) => tier.level > level).slice(0, 1) ?? []
		};
	}
	const def = 'pvGrowth' in oath ? definition(oath) : oath;
	const result = unlockedTiers(def, branch, level);
	const tiers = result.branch ? tierViews(result.branch, def.rank) : [];
	return {
		reached: tiers.filter((tier) => tier.level <= level),
		next: tiers.filter((tier) => tier.level > level).slice(0, 1)
	};
}
export async function ensureBuiltinOaths(db: Db): Promise<void> {
	await db.transaction(async (tx) => {
		// 04 §3.3 : semis seulement si vide, sérialisé ; ensuite la base fait foi.
		await tx.execute(sql`SELECT pg_advisory_xact_lock(73129017)`);
		if ((await tx.select({ id: oaths.id }).from(oaths).limit(1)).length === 0)
			await seedOaths(tx, BUILTIN_OATHS);
	});
}
function rowView(row: Oath, catalogue: Oath[], reserved: boolean): OathRowView {
	const parent = catalogue.find((candidate) => candidate.id === row.evolvesFrom);
	return {
		id: row.id,
		name: row.name,
		weapon: row.weapon,
		rank: row.rank,
		rankLabel: OATH_RANK_LABELS[row.rank],
		category: row.category,
		lineage:
			parent && (reserved || (!parent.hidden && PUBLIC_RANKS.includes(parent.rank)))
				? parent.name
				: null,
		revision: row.revision
	};
}
export async function listOaths(
	db: Db,
	actor: Actor | null,
	input: z.input<typeof listOathsSchema> = {}
): Promise<OathRowView[]> {
	const filters = parse(listOathsSchema, input);
	const reserved = can(actor?.role, 'oaths.manage');
	const catalogue = await db.select().from(oaths).orderBy(asc(oaths.name));
	const visible = new Set(visibleOaths(catalogue.map(definition)).map((row) => row.id));
	return catalogue
		.filter(
			(row) =>
				(reserved || (visible.has(row.id) && PUBLIC_RANKS.includes(row.rank))) &&
				(!filters.rank || row.rank === filters.rank) &&
				(!filters.category || row.category === filters.category)
		)
		.map((row) => rowView(row, catalogue, reserved));
}
export async function getOath(db: Db, actor: Actor | null, input: string): Promise<OathView> {
	const id = parse(referenceIdSchema, input);
	const reserved = can(actor?.role, 'oaths.manage');
	const catalogue = await db.select().from(oaths);
	const row = catalogue.find((candidate) => candidate.id === id || candidate.id === oathSlug(id));
	if (!row || (!reserved && (row.hidden || !PUBLIC_RANKS.includes(row.rank))))
		throw NpError.notFound('Serment introuvable.');
	return {
		...rowView(row, catalogue, reserved),
		lore: row.lore,
		growth: { pvN: row.pvGrowth, epN: row.epGrowth, emN: row.emGrowth },
		baseDamage: row.baseDamage,
		damageType: row.damageType,
		branches: [row.branches.bA, row.branches.bB]
			.filter((b): b is OathBranch => !!b)
			.map((b) => ({
				label: b.nom,
				style: b.style ?? '',
				physical: b.descPhys ?? b.desc ?? '',
				flavor: b.flavor ?? '',
				tiers: tierViews(b, row.rank)
			})),
		reserved: reserved
			? {
					hidden: row.hidden,
					isBuiltin: row.isBuiltin,
					icon: row.icon,
					evolvesFrom: row.evolvesFrom
				}
			: null
	};
}
async function checkedActor(tx: Tx, actor: Actor): Promise<Actor> {
	const account = await assertFreshAccount(tx, actor);
	if (!account || account.forcePasswordReset) throw NpError.unauthenticated();
	return assertCan(actor, 'oaths.manage');
}
async function validateLineage(tx: Tx, id: string, parentId: string | null | undefined) {
	if (!parentId) return;
	const rows = await tx.select({ id: oaths.id, parent: oaths.evolvesFrom }).from(oaths);
	const visited = new Set([id]);
	let cursor: string | null = parentId;
	while (cursor) {
		if (visited.has(cursor))
			throw new NpError('INVALID', 'La lignée ne peut pas former une boucle.');
		visited.add(cursor);
		const parent = rows.find((row) => row.id === cursor);
		if (!parent) throw new NpError('INVALID', 'Serment parent introuvable.');
		cursor = parent.parent;
	}
}
async function log(tx: Tx, actor: Actor, action: string, row: Oath, motif?: string) {
	await appendStaffLog(tx, {
		action,
		detail: `Serment : ${row.name}.${motif ? ` Motif : ${motif}` : ''}`,
		actor,
		target: row.id
	});
	await recordAudit(tx, {
		source: 'oaths',
		...auditContextOf(actor),
		action,
		actor,
		details: { id: row.id, revision: row.revision, ...(motif ? { motif } : {}) }
	});
}
export async function createOath(
	db: Db,
	actor: Actor | null,
	input: CreateOathInput
): Promise<OathView> {
	const present = assertCan(actor, 'oaths.manage');
	const { growth, ...data } = parse(createOathSchema, input);
	const id = oathSlug(data.name);
	if (!id) throw new NpError('INVALID', 'Nom requis.');
	return db.transaction(async (tx) => {
		const current = await checkedActor(tx, present);
		await tx.execute(sql`SELECT pg_advisory_xact_lock(73129017)`);
		await validateLineage(tx, id, data.evolvesFrom);
		const [row] = await tx
			.insert(oaths)
			.values({
				...data,
				id,
				pvGrowth: growth.pvN,
				epGrowth: growth.epN,
				emGrowth: growth.emN,
				isBuiltin: false
			})
			.onConflictDoNothing()
			.returning();
		if (!row) throw new NpError('INVALID', 'Ce Serment existe déjà.');
		await log(tx, current, 'oath_created', row);
		return getOath(tx, current, id);
	});
}
export async function updateOath(
	db: Db,
	actor: Actor | null,
	input: UpdateOathInput
): Promise<OathView> {
	const present = assertCan(actor, 'oaths.manage');
	const { id, expectedRevision, motif, growth, ...data } = parse(updateOathSchema, input);
	if (expectedRevision === undefined) throw NpError.versionRequired();
	return db.transaction(async (tx) => {
		const current = await checkedActor(tx, present);
		await tx.execute(sql`SELECT pg_advisory_xact_lock(73129017)`);
		await validateLineage(tx, id, data.evolvesFrom);
		const [old] = await tx.select().from(oaths).where(eq(oaths.id, id)).for('update');
		const [row] = await tx
			.update(oaths)
			.set({
				...data,
				...(growth ? { pvGrowth: growth.pvN, epGrowth: growth.epN, emGrowth: growth.emN } : {}),
				revision: sql`${oaths.revision} + 1`
			})
			.where(and(eq(oaths.id, id), eq(oaths.revision, expectedRevision)))
			.returning();
		if (!row || !old) throw NpError.versionConflict();
		// Audit 02 §4.4, legacy/assets/js/main.js:6741-6767 : synchronisation atomique des porteurs.
		const carriers = await tx
			.select()
			.from(characters)
			.where(eq(characters.oathId, id))
			.orderBy(asc(characters.id))
			.for('update');
		for (const character of carriers) {
			let branch = character.branch;
			for (const key of ['bA', 'bB'] as const) {
				const previous = old.branches[key];
				if (previous && branchMatchesLabel({ ...previous, style: previous.style ?? '' }, branch)) {
					branch = row.branches[key]?.nom ?? 'Aucune';
					break;
				}
			}
			const values = {
				weapon: row.weapon,
				branch,
				...(character.level > 1 && growth
					? {
							pvMax: 30 + (character.level - 1) * row.pvGrowth,
							epMax: 50 + (character.level - 1) * row.epGrowth,
							emMax: 20 + (character.level - 1) * row.emGrowth
						}
					: {})
			};
			const next = { ...character, ...values };
			next.pvCur = Math.min(next.pvCur, next.pvMax);
			next.epCur = Math.min(next.epCur, next.epMax);
			next.emCur = Math.min(next.emCur, next.emMax);
			const fields = [
				'weapon',
				'branch',
				'pvMax',
				'epMax',
				'emMax',
				'pvCur',
				'epCur',
				'emCur'
			] as const;
			const changes = fields.filter((field) => character[field] !== next[field]);
			if (!changes.length) continue;
			const updated = await tx
				.update(characters)
				.set({
					...values,
					pvCur: next.pvCur,
					epCur: next.epCur,
					emCur: next.emCur,
					revision: sql`${characters.revision} + 1`
				})
				.where(and(eq(characters.id, character.id), eq(characters.revision, character.revision)))
				.returning({ id: characters.id });
			if (!updated.length) throw NpError.versionConflict();
			for (const field of changes)
				await tx.insert(characterHistory).values({
					characterId: character.id,
					type: field === 'branch' ? 'serment' : 'stat',
					text: `Serment synchronisé — ${field} : ${character[field]} → ${next[field]}`,
					field:
						field === 'weapon'
							? 'equipment'
							: field === 'branch'
								? 'branch'
								: field.startsWith('pv')
									? 'pv'
									: field.startsWith('ep')
										? 'ep'
										: 'em',
					oldValue: String(character[field]),
					newValue: String(next[field]),
					motif,
					actorRole: current.role,
					actorName: current.pseudo,
					actorAccountId: current.accountId
				});
		}
		await log(tx, current, 'oath_updated', row, motif);
		return getOath(tx, current, id);
	});
}
export async function setOathHidden(
	db: Db,
	actor: Actor | null,
	input: z.input<typeof setOathHiddenSchema>
): Promise<OathView> {
	const present = assertCan(actor, 'oaths.manage');
	const data = parse(setOathHiddenSchema, input);
	if (data.expectedRevision === undefined) throw NpError.versionRequired();
	return db.transaction(async (tx) => {
		const current = await checkedActor(tx, present);
		const [row] = await tx
			.update(oaths)
			.set({ hidden: data.hidden, revision: sql`${oaths.revision} + 1` })
			.where(and(eq(oaths.id, data.id), eq(oaths.revision, data.expectedRevision!)))
			.returning();
		if (!row) throw NpError.versionConflict();
		await log(tx, current, 'oath_visibility', row);
		return getOath(tx, current, row.id);
	});
}
