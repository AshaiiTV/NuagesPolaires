/** Adaptateur des paliers éditoriaux hérités (main.js:11446-11717).
 * Le cœur consomme des effets structurés ; les regex sont isolées dans cet adaptateur.
 * Une branche custom peut fournir directement une Declaration sans passer par ces heuristiques.
 */
import type { CombatState, Fighter, AbilityOption, OathTier } from './types';
import { actionsLeft } from './actions';
import { findFighterOrThrow } from './state';
import { actionRule } from '../rules';

function numbers(text: string): number[] {
	return (text.match(/-?\d+/g) ?? []).map(Number);
}
function first(text: string, fallback = 6): number {
	return Number(text.match(/(\d+)\s*\+\s*Niv/i)?.[1] ?? text.match(/\d+/)?.[0] ?? fallback);
}
function mechanics(desc: string): Partial<AbilityOption> {
	const ns = numbers(desc),
		extra = desc.match(/\+(\d+)\s*EP[^.]{0,42}d[ée]fend|d[ée]fend[^.]{0,42}\+(\d+)\s*EP/i);
	return {
		defenseExtraEp: Number(extra?.[1] || extra?.[2] || 0),
		defenseChipPct: /25\s*%/.test(desc) ? 25 : 0,
		guardBonusDmg: /garde|parade|protection/i.test(desc) ? ns[1] || 0 : 0,
		noReposition: /replac|d[ée]placer/i.test(desc),
		nextDefenseTax: Number(desc.match(/prochaine d[ée]fense co[ûu]te \+(\d+)\s*EP/i)?.[1] || 0),
		onlyDodge: /uniquement esquivable|seulement esquivable|non\s*parable/i.test(desc),
		undefendable: /ind[ée]fendable|imparable|non\s*esquivable/i.test(desc),
		repulse: /repousse|recul/i.test(desc)
	};
}

export function buildTierAbilityOptions(f: Fighter, tier: OathTier, left = 3): AbilityOption[] {
	const desc = tier.desc,
		name = tier.nom,
		ns = numbers(desc),
		level = f.level || 1;
	const em = first(tier.cout, 0);
	const opts: AbilityOption[] = [];
	const push = (spec: Partial<AbilityOption>) =>
		opts.push({
			action: 'capacite',
			kind: 'attack',
			label: name,
			abilityName: name,
			targetType: 'enemy',
			healTargetType: null,
			descText: desc,
			tierLevel: tier.niv,
			sourceType: 'oath',
			emCost: em,
			...spec
		});
	if (
		(f.oathName === 'Conjurateur' && /Soin Encha/i.test(name)) ||
		(f.oathName === 'Flécheur' && /Jugement/i.test(name))
	) {
		let sacrifices = [...desc.matchAll(/([012])\s*action[^:]*:\s*(\d+)\+Niv/gi)].map((m) => ({
			sac: Number(m[1]),
			base: Number(m[2])
		}));
		if (!sacrifices.length && ns.length >= 3)
			sacrifices = ns.slice(0, 3).map((base, sac) => ({ sac, base }));
		for (const { sac, base } of sacrifices)
			if (left >= 1 + sac) {
				const heal = f.oathName === 'Conjurateur';
				push({
					action: heal ? 'soin' : 'capacite',
					kind: heal ? 'heal' : 'attack',
					label: `${name} · -${sac} action`,
					targetType: heal ? 'ally' : 'enemy',
					consumeActions: 1 + sac,
					actsSacr: sac,
					...(heal ? { healAmt: base + level } : { value: base + level })
				});
			}
	} else if (f.oathName === 'Elementaliste' && /Feu/i.test(desc) && /Glace/i.test(desc)) {
		push({
			label: '🔥 Poing Ardent',
			emCost: actionRule('poing_ardent').cost!,
			value: (ns[0] || 8) + level,
			elementKey: 'fire',
			statusToTarget: 'brulure',
			comboDamage: (ns[2] || 7) + level,
			briseArmure: ns[3] || 10
		});
		push({
			label: '❄ Poing Polaire',
			emCost: actionRule('poing_polaire').cost!,
			value: (ns[1] || 5) + level,
			elementKey: 'ice',
			statusToTarget: 'gel',
			comboDamage: (ns[2] || 7) + level,
			briseArmure: ns[3] || 10
		});
	} else if (f.oathName === 'Elementaliste' && /Foudre/i.test(desc) && /Eau/i.test(desc)) {
		push({
			label: '⚡ Poing Foudre',
			emCost: actionRule('poing_foudre').cost!,
			value: (ns[0] || 6) + level,
			elementKey: 'thunder',
			comboSelfEpGain: ns[2] || 10,
			comboEpDrain: Math.abs(ns[3] || 5)
		});
		push({
			label: '💧 Poing Aquatique',
			emCost: actionRule('poing_aquatique').cost!,
			value: (ns[1] || 4) + level,
			elementKey: 'water',
			comboSelfEpGain: ns[2] || 10,
			comboEpDrain: Math.abs(ns[3] || 5)
		});
	} else if (f.oathName === 'Evocateur') {
		const turtle = /Tortue/i.test(name),
			crab = /Crabe/i.test(name),
			summonName = turtle ? 'Tortue Bipède' : crab ? 'Crabe Canon' : name;
		push({
			kind: 'summon',
			label: `${turtle ? '🐢' : '🦀'} ${summonName}`,
			targetType: 'none',
			summon: {
				name: summonName,
				pv: (ns[0] || 8) + level,
				dmg: (ns[1] || 4) + level,
				actCost: ns[2] || 6,
				autoInterpose: turtle,
				rangeType: crab ? 'distance' : 'cac',
				ownerCharacterId: f.characterId!
			}
		});
	} else if (/Taille Double|Rafale de Lames/i.test(name)) {
		push({
			value: first(desc, /Taille Double/i.test(name) ? 5 : 1) + level,
			hits: /Taille Double/i.test(name) ? 2 : 3
		});
	} else if (/Spirale Brisante|Salve Aveugle|Domaine Étoilé/i.test(name)) {
		push({
			value: first(desc, 8) + level,
			aoe: true,
			aoeIncludesAllies: true,
			targetType: 'none',
			undefendable: /ind[ée]fendable/i.test(desc)
		});
	} else if (/Appel du Bouclier/i.test(name)) {
		push({
			kind: 'buff',
			targetType: 'none',
			provoke: true,
			perEnemyPvMax: first(desc, 3) + level
		});
	} else if (/Bash Cinglant/i.test(name)) {
		push({ value: (ns[0] || 5) + level, selfPvMaxBonus: ns[1] || 3 });
	} else if (/Lance Drainante/i.test(name)) {
		push({ value: (ns[0] || 4) + level, epDrain: ns[1] || 8 });
	} else if (f.oathName === 'Conjurateur' && /Frappe Décha[iî]n[ée]e/i.test(name)) {
		push({
			action: 'frappe_dechainees',
			value: (ns[0] || 4) + level,
			healAmt: ns[1] || 4,
			healTargetType: 'ally'
		});
	} else if (f.oathName === 'Claymore' && /Posture Haute/i.test(name)) {
		const drain = desc.match(
			/bloqu[^.]*?(?:perd|retire)\s*(\d+)\s*EP|(?:perd|retire)\s*(\d+)\s*EP[^.]*?bloqu/i
		);
		push({
			kind: 'buff',
			label: `🗡 ${name}`,
			targetType: 'none',
			claymorePosture: {
				damage: first(desc, ns[0] || 20) + level,
				epCost: Number(desc.match(/(\d+)\s*EP/i)?.[1]) || actionRule('frappe_haute').cost!,
				blockEpDrain: Number(drain?.[1] || drain?.[2] || 0),
				noReposition: /replac|d[ée]placer/i.test(desc),
				defenseChipPct: /25\s*%/.test(desc) ? 25 : 0,
				desc
			}
		});
	} else if (f.oathName === 'Claymore' && /Fendre la Ligne/i.test(name)) {
		push({
			label: `🪓 ${name}`,
			value: first(desc, ns[0] || 10) + level,
			defenseExtraEp: Number(desc.match(/\+(\d+)\s*EP/i)?.[1] || 0),
			guardBonusDmg: /garde|parade|protection/i.test(desc) ? ns[1] || 4 : 0,
			blockBreakLine: /brise-ligne|traverse le blocage/i.test(desc),
			noReposition: /replac/i.test(desc),
			nextDefenseTax: Number(desc.match(/prochaine d[ée]fense co[ûu]te \+(\d+)\s*EP/i)?.[1] || 0)
		});
	} else if (/Lancer Bestial|Lancer Li[ée]|Rayon Étoilé/i.test(name)) {
		push({
			value: first(desc, /Bestial/i.test(name) ? 18 : /Rayon/i.test(name) ? 20 : 5) + level,
			disarm: /Bestial/i.test(name)
		});
	} else if (/Élan Tranchant|Tenue de Ligne/i.test(name)) {
		push({
			value: Math.max(ns[0] || 0, ns[1] || 0, first(desc)) + level,
			repulse: /repousse/i.test(desc)
		});
	} else if (/Toutes entit[ée]s|Zone/i.test(desc)) {
		push({
			value: first(desc, 8) + level,
			aoe: true,
			aoeIncludesAllies: /alli[ée]es? ET ennemies?/i.test(desc),
			targetType: 'none',
			undefendable: /ind[ée]fendable/i.test(desc)
		});
	} else push({ value: first(desc) + level, ...mechanics(desc) });
	return opts;
}

export function getAbilityOptions(state: CombatState, fighterId: string): AbilityOption[] {
	const f = findFighterOrThrow(state, fighterId),
		left = actionsLeft(state, fighterId);
	if (f.type === 'beast') {
		const option = parseBeastAbility(f, state.round);
		return option && (option.consumeActions ?? 1) <= left ? [option] : [];
	}
	const tiers = new Map<string, OathTier>();
	for (const t of f.branch?.tiers ?? [])
		if (t.niv <= f.level) {
			const key = t.nom.toLowerCase(),
				old = tiers.get(key);
			if (!old || old.niv < t.niv) tiers.set(key, t);
		}
	return [...tiers.values()]
		.flatMap((t) => buildTierAbilityOptions(f, t, left))
		.filter(
			(a) =>
				(a.consumeActions ?? 1) <= left &&
				(!a.summon ||
					(!state.usedSummons.includes(`${f.characterId}:${a.summon.name}`) &&
						!state.fighters.some(
							(x) => x.isSummon && x.ownerCharacterId === f.characterId && x.pvCur > 0
						)))
		);
}

export function parseBeastAbility(f: Fighter, round: number): AbilityOption | null {
	const comp = f.skill?.trim();
	if (!comp) return null;
	const title = comp.split(/\s*[—-]\s*/)[0]!.trim() || 'Compétence';
	const fullDesc = comp.replace(/^[^—-]+\s*[—-]\s*/, '').trim();
	const firstDesc = comp.match(
		/Premi[eè]re action du combat\s*:\s*([^.]+(?:\.[^A-ZÉÈÀÂÎÔÛÇ]|$)?)/i
	)?.[1];
	const later = comp.match(/En cours de combat\s*:\s*([^.]+(?:\.[^A-ZÉÈÀÂÎÔÛÇ]|$)?)/i)?.[1];
	const desc = ((round <= 1 && firstDesc) || later || fullDesc || comp).trim();
	const damage = Number(desc.match(/(\d+)\s*d[ée]g[âa]ts?/i)?.[1] ?? numbers(desc)[0] ?? 0);
	const heal = Number(
		(desc.match(/(?:soign[ée]?|r[ée]cup[èe]re?)[^\d]*(\d+)\s*PV/i) ||
			desc.match(/(\d+)\s*PV[^.]*soign/i))?.[1] ?? 0
	);
	const lower = `${desc} ${fullDesc}`.toLowerCase();
	const statusToTarget = /br[ûu]l/.test(lower)
		? 'brulure'
		: /gel|givre/.test(lower)
			? 'gel'
			: /empoison|poison/.test(lower)
				? 'empoisonne'
				: /saign/.test(lower)
					? 'saignement'
					: /fragilis/.test(lower)
						? 'fragilise'
						: null;
	const aoe = /zone|toutes? les entit|tous les ennemis|autour de|adjacents?/i.test(fullDesc);
	const kind = heal > 0 && !damage ? 'heal' : 'attack';
	const hits = Number(desc.match(/(\d+)\s*(?:coups?|frappes?|tirs?)/i)?.[1] || 1);
	return {
		action: kind === 'heal' ? 'soin' : 'capacite',
		kind,
		label: `⚡ ${title}`,
		abilityName: title,
		targetType: aoe ? 'none' : kind === 'heal' ? 'ally' : 'enemy',
		healTargetType: null,
		descText: desc,
		tierLevel: 0,
		sourceType: 'beast',
		value: damage,
		healAmt: heal,
		epCost: Number(comp.match(/(\d+)\s*EP/i)?.[1] || 0),
		emCost: Number(comp.match(/(\d+)\s*EM/i)?.[1] || 0),
		consumeActions: Math.max(1, Number(comp.match(/(\d+)\s*action/i)?.[1] || 1)),
		hits: hits > 1 ? hits : 0,
		aoe,
		statusToTarget,
		repulse: /repouss/i.test(fullDesc),
		onlyDodge: /uniquement esquivable|seulement esquivable|non\s*parable/i.test(fullDesc),
		undefendable: /imparable|ind[ée]fendable|non\s*esquivable/i.test(fullDesc),
		dmgStatic: true
	};
}
