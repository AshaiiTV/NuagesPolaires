// Relecture du contexte courant, comme le simulateur à la reprise d’une archive.
// Les ressources, niveaux de combat, statuts et journaux photographiés restent ceux du combat.
import { eq, inArray } from 'drizzle-orm';
import type { Db, Tx } from '../db';
import { beasts, characters, oaths, type Oath } from '../db/schema';
import type { CombatState } from '../../game/combat';
import type { OathDefinition } from '../../game/types';
import { findBranch } from '../../game/oaths';

export function oathDefinitionFromRow(row: Oath): OathDefinition {
	const branch = (b: Oath['branches']['bA']) => (b ? { ...b, style: b.style ?? '' } : null);
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
		isBuiltin: row.isBuiltin,
		branches: {
			bA: branch(row.branches.bA),
			bB: branch(row.branches.bB),
			extraBranches: (row.branches.extraBranches ?? []).map((b) => ({ ...b, style: b.style ?? '' }))
		}
	};
}

export async function enrichCombatState(db: Db | Tx, state: CombatState): Promise<CombatState> {
	const draft = structuredClone(state);
	const pids = [
		...new Set(
			draft.fighters.filter((f) => !f.isSummon && f.characterId).map((f) => f.characterId!)
		)
	];
	const bids = [...new Set(draft.fighters.filter((f) => f.beastId).map((f) => f.beastId!))];
	const sheets = pids.length
		? await db.select().from(characters).where(inArray(characters.id, pids))
		: [];
	const creatures = bids.length
		? await db.select().from(beasts).where(inArray(beasts.id, bids))
		: [];
	for (const f of draft.fighters) {
		if (f.isSummon) continue;
		const sheet = sheets.find((p) => p.id === f.characterId);
		if (sheet) {
			const [row] = await db.select().from(oaths).where(eq(oaths.id, sheet.oathId));
			if (row) {
				const oath = oathDefinitionFromRow(row);
				const branch = findBranch(oath, sheet.branch);
				f.oathName = oath.name;
				f.dmgBase = oath.baseDamage;
				f.oathDamage = oath.baseDamage;
				f.branch = branch ? { name: branch.nom, tiers: branch.paliers } : null;
			}
		} else if (f.type === 'player') f.oathDamage = null;
		const beast = creatures.find((b) => b.id === f.beastId);
		if (beast) {
			f.gem = beast.gem;
			f.skill = beast.skill;
		}
	}
	return draft;
}
