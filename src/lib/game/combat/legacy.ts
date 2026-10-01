import type { CombatState, Fighter, CombatAction, LogKind } from './types';
import { CombatError } from './types';
import { createCombat, makePlayerFighter, makeBeastFighter } from './state';
import { emptyAction } from './actions';
import { isStatusId } from './statuses';

type RecordValue = Record<string, unknown>;
function object(value: unknown): RecordValue {
	return value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {};
}
function list(value: unknown): unknown[] {
	if (typeof value === 'string') { try { return list(JSON.parse(value)); } catch { return []; } }
	return Array.isArray(value) ? value : [];
}
function num(value: unknown, fallback = 0): number {
	return value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? fallback : Number(value);
}
function str(value: unknown, fallback = ''): string { return typeof value === 'string' ? value : fallback; }
const kinds: LogKind[] = ['info', 'round', 'turn', 'damage', 'heal', 'spell', 'summon'];

/** Tolère également le détail intégral encodé en JSON, comme les valeurs de np_store. */
export function fromLegacyArchive(legacy: unknown): CombatState {
	if (typeof legacy === 'string') {
		try { legacy = JSON.parse(legacy); } catch { throw new CombatError('COMBAT_INVALID_INPUT', 'Archive JSON invalide.'); }
	}
	const source = object(legacy);
	if (source._stub) throw new CombatError('COMBAT_INVALID_INPUT', 'Le détail de cette archive est requis.');
	if (source.schemaVersion === 2) return structuredClone(source) as unknown as CombatState;
	const s = createCombat({ id: str(source.id, 'legacy-combat'), name: str(source.name), notes: str(source.notes) });
	const fighters = list(source.fighters).map((v, i): Fighter => {
		const f = object(v), type = f.type === 'beast' ? 'beast' : 'player';
		const name = str(f.name, str(f.nom, `Combattant ${i + 1}`));
		const level = Math.max(1, num(f.level ?? f.niv, 1));
		let result: Fighter;
		if (type === 'beast') result = makeBeastFighter(s, { type, beastId: str(f.bid, str(f.id, `legacy-beast-${i}`)), name, level,
			pv: num(f.pvMax ?? f.pv, num(f.pvCur)), ep: num(f.epMax ?? f.ep, num(f.epCur)), strike: str(f.frappe), skill: str(f.comp), behavior: str(f.beh, 'Neutre'), gem: str(f.gem) || null }, name);
		else result = makePlayerFighter(s, { type, characterId: str(f.pid, `legacy-character-${i}`), name, oathName: str(f.classe ?? f.class), level,
			pvCur: num(f.pvCur, num(f.pvMax)), pvMax: num(f.pvMax), epCur: num(f.epCur, num(f.epMax)), epMax: num(f.epMax), emCur: num(f.emCur, num(f.emMax)), emMax: num(f.emMax), dmgBase: num(f.dmgBase, 6) });
		result.id = str(f._cid, str(f.id, result.id));
		result.pvCur = num(f.pvCur, result.pvCur); result.epCur = num(f.epCur, result.epCur); result.emCur = num(f.emCur, result.emCur);
		result.dmgBase = num(f.dmgBase, result.dmgBase); result.imageUrl = str(f.img) || null;
		result.isSummon = f.isSummon === true; result.ownerCharacterId = str(f.ownerPid) || null;
		result.summonName = result.isSummon ? name.split(' · ').at(-1)! : null;
		result.autoInterpose = f.autoInterpose === true; result.actionsMax = result.isSummon ? num(f.actionsMax, 2) : null;
		result.rangeType = f.rangeType === 'distance' ? 'distance' : result.isSummon ? 'cac' : null;
		result.statuses = list(f.statuts).flatMap((v) => { const st = object(v); return isStatusId(st.id) ? [{ id: st.id, tours: Math.max(1, num(st.tours, 2)) }] : []; });
		result.pvMaxBonus = num(f.pvMaxBonus); result.briseArmureBonus = num(f.briseArmureBonus); result.defenseTaxNext = num(f.defenseTaxNext);
		result.noFreeRepositionRound = f.noFreeRepositionRound == null ? null : num(f.noFreeRepositionRound);
		const p = object(f.claymorePosture);
		if (Object.keys(p).length) result.claymorePosture = { damage: num(p.damage), epCost: num(p.epCost, 10), blockEpDrain: num(p.blockEpDrain), noReposition: p.noReposition === true, defenseChipPct: num(p.defenseChipPct), desc: str(p.desc) };
		return result;
	});
	// Les identifiants hérités dupliqués ne doivent pas fusionner deux instances.
	const seen = new Set<string>();
	for (const f of fighters) { if (seen.has(f.id)) f.id = `legacy-${s.seq++}`; seen.add(f.id); }
	s.fighters = fighters;
	const idAt = (index: unknown): string | null => fighters[num(index, -1)]?.id ?? null;
	s.round = Math.max(1, num(source.round, 1)); s.active = source.active === true;
	s.phase = source.phase === 'resolution' || source.phase === 'declaration' ? source.phase : 'idle';
	const texts = list(source.log).map((entry) => typeof entry === 'string' ? entry : str(object(entry).text));
	s.ended = source.ended === true || source.closedAt != null || source.endedAt != null || source.status === 'termine' || texts.some((text) => /Combat terminé\s*[—-]\s*Round/i.test(text));
	const started = s.active || s.ended || s.phase !== 'idle' || s.round > 1 || texts.some((text) => /Combat démarré|Résolution Round/i.test(text));
	s.startedAt = started ? num(source.startedAt, num(source.savedAt)) : null;
	s.endedAt = s.ended ? num(source.endedAt ?? source.closedAt, num(source.savedAt)) : null;
	s.initiative = idAt(source.initiative ?? 0);
	s.order = list(source.order).map(idAt).filter((v): v is string => v !== null);
	if (!s.order.length) s.order = fighters.map((f) => f.id);
	s.turn = Math.max(0, num(source.turn));
	for (const [index, entries] of Object.entries(object(source.decl))) {
		const id = idAt(index); if (!id) continue;
		s.declarations[id] = list(entries).map((v): CombatAction => {
			const a = object(v), entry = emptyAction();
			// Conserver uniquement les champs connus et leur type JSON primitif.
			for (const key of Object.keys(entry) as Array<keyof CombatAction>) {
				const value = a[key];
				if (value !== undefined && value !== null && typeof value !== 'object' && (typeof value === typeof entry[key]) && (typeof value !== 'number' || Number.isFinite(value))) Object.assign(entry, { [key]: value });
			}
			entry.abilityName = str(a.palNom) || null;
			entry.target = a.target == null ? null : idAt(a.target); entry.healTarget = a.healTarget == null ? null : idAt(a.healTarget);
			entry.statusToTarget = isStatusId(a.statusToTarget) ? a.statusToTarget : null;
			entry.elementKey = ['fire', 'ice', 'thunder', 'water'].includes(str(a.elementKey)) ? a.elementKey as CombatAction['elementKey'] : null;
			const summon = object(a.summon), posture = object(a.claymorePosture);
			if (Object.keys(summon).length) entry.summon = { name: str(summon.name), pv: num(summon.pv), dmg: num(summon.dmg), actCost: num(summon.actCost), ownerCharacterId: str(summon.ownerPid), autoInterpose: summon.autoInterpose === true, rangeType: summon.rangeType === 'distance' ? 'distance' : 'cac' };
			if (Object.keys(posture).length) entry.claymorePosture = { damage: num(posture.damage), epCost: num(posture.epCost, 10), blockEpDrain: num(posture.blockEpDrain), noReposition: posture.noReposition === true, defenseChipPct: num(posture.defenseChipPct), desc: str(posture.desc) };
			entry.tauntSourceName = str(a.tauntSourceName) || null;
			return entry;
		});
	}
	s.log = list(source.log).map((v, i) => {
		const e = object(v), kind = str(e.type) as LogKind;
		return { n: i + 1, round: num(e.round, s.round), kind: kinds.includes(kind) ? kind : 'info', text: typeof v === 'string' ? v : str(e.text), actorId: null, targetId: null, private: true };
	});
	s.usedSummons = s.log.flatMap((e) => e.kind === 'summon' ? [...e.text.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]!) : []);
	for (const f of fighters) {
		if (f.isSummon && f.ownerCharacterId && f.summonName) s.usedSummons.push(`${f.ownerCharacterId}:${f.summonName}`);
	}
	s.usedSummons = [...new Set(s.usedSummons)];
	s.drops = list(source.pendingDrops).map((v, i) => {
		const d = object(v); return { id: str(d.id, `legacy-drop-${i}`), fighterId: idAt(d.fi) ?? '', beastId: str(d.beastId) || null, beastName: str(d.beastName), round: num(d.round, s.round), roll: d.roll == null ? null : num(d.roll), gem: str(d.gem) || null, assignedTo: null, assignedName: null };
	});
	// Taunts utilisent les _cid, pas les indices.
	list(source.fighters).forEach((v, i) => {
		const t = object(object(v).taunt), f = fighters[i];
		if (f && str(t.sourceCid) && fighters.some((x) => x.id === t.sourceCid)) f.taunt = { sourceId: str(t.sourceCid), sourceName: str(t.sourceName), permanent: t.permanent === true, untilRound: num(t.untilRound) };
	});
	return s;
}
