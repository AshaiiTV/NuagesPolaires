/** Port pur de legacy/assets/js/main.js:11778-11844,12091-12354.
 * L'ordre des passes (budget, attaques, utilitaires, statuts) est normatif.
 * Aucun jet de précision : toutes les attaques réussissent, sauf défense déclarée.
 */
import type { CombatState, Fighter, CombatAction, Rng, SummonSpec } from './types';
import { CombatError } from './types';
import {
	cloneState,
	findFighter,
	findFighterOrThrow,
	pushLog,
	advanceDeclarant,
	makePlayerFighter,
	newDropId
} from './state';
import { addOrRefreshStatus, tickStatuses } from './statuses';

export function forcedTargetInfo(
	state: CombatState,
	fighter: Fighter
): { source: Fighter; sourceName: string } | null {
	const t = fighter.taunt;
	if (!t) return null;
	const source = findFighter(state, t.sourceId);
	return source && source.pvCur > 0 && source.type !== fighter.type
		? { source, sourceName: t.sourceName || source.name }
		: null;
}

function rawDamage(state: CombatState, target: Fighter, damage: number) {
	let dmg = Math.max(0, Math.ceil(damage));
	if (target.briseArmureBonus > 0) {
		dmg += target.briseArmureBonus;
		pushLog(
			state,
			'damage',
			`💔 ${target.name} subit +${target.briseArmureBonus} dégâts (Brise-Armure)`,
			null,
			target.id
		);
		target.briseArmureBonus = 0;
	}
	const old = target.pvCur;
	const absorbed = Math.min(target.pvMaxBonus, dmg);
	target.pvMaxBonus -= absorbed;
	target.pvMax -= absorbed;
	target.pvCur = Math.max(0, old - dmg);
	return { old, newPv: target.pvCur, dmg, ko: old > 0 && target.pvCur === 0 };
}

function elemental(state: CombatState, f: Fighter, a: CombatAction, target: Fighter): number {
	if (!a.elementKey) return a.value;
	const e = f.elemState ?? { last: null, count: 0 };
	let dmg = a.value;
	if (e.last === a.elementKey) {
		e.count++;
		if (e.count >= 3) {
			const penalty = Math.max(0.1, 1 - 0.25 * (e.count - 2));
			dmg = Math.ceil(dmg * penalty);
			pushLog(
				state,
				'info',
				`⚖ ${f.name} subit un malus élémentaire sur ${a.label || a.abilityName || 'attaque'} (x${penalty.toFixed(2)})`,
				f.id
			);
		}
	} else {
		if (e.last && e.count >= 2) {
			if (e.last === 'ice' && a.elementKey === 'fire' && a.comboDamage) {
				const b = rawDamage(state, target, a.comboDamage);
				pushLog(
					state,
					'damage',
					`🔥❄ Givre-Brûlure : ${target.name} subit −${b.dmg} PV bonus (${b.old}→${b.newPv})`,
					f.id,
					target.id
				);
			} else if (e.last === 'fire' && a.elementKey === 'ice' && a.briseArmure) {
				target.briseArmureBonus = a.briseArmure;
				pushLog(
					state,
					'info',
					`🔥❄ Embrasement : prochain coup sur ${target.name} infligera +${a.briseArmure} dégâts`,
					f.id,
					target.id
				);
			} else if (e.last === 'thunder' && a.elementKey === 'water' && a.comboSelfEpGain) {
				const old = f.epCur;
				f.epCur = Math.min(f.epMax || 999, old + a.comboSelfEpGain);
				pushLog(state, 'heal', `⚡💧 Électrocution : ${f.name} regagne +${f.epCur - old} EP`, f.id);
			} else if (e.last === 'water' && a.elementKey === 'thunder' && a.comboEpDrain) {
				const old = target.epCur;
				target.epCur = Math.max(0, old - a.comboEpDrain);
				pushLog(
					state,
					'info',
					`💧⚡ Noyade électrique : ${target.name} perd ${old - target.epCur} EP`,
					f.id,
					target.id
				);
			}
		}
		e.last = a.elementKey;
		e.count = 1;
	}
	f.elemState = e;
	return dmg;
}

function queueDrop(state: CombatState, target: Fighter): void {
	target.koCause = 'attack';
	if (target.type !== 'beast' || !target.gem || state.drops.some((d) => d.fighterId === target.id))
		return;
	state.drops.push({
		id: newDropId(state),
		fighterId: target.id,
		beastId: target.beastId,
		beastName: target.name,
		round: state.round,
		roll: null,
		gem: null,
		assignedTo: null,
		assignedName: null
	});
}

function attack(
	state: CombatState,
	f: Fighter,
	a: CombatAction,
	used: Record<string, number>
): void {
	const targets = a.aoe
		? state.fighters.filter(
				(t) => t.id !== f.id && t.pvCur > 0 && (a.aoeIncludesAllies || t.type !== f.type)
			)
		: [findFighter(state, a.target ?? '')].filter((t): t is Fighter => t !== null);
	if (!targets.length) return;
	for (let t of targets) {
		if (t.pvCur <= 0) continue;
		const interpose = state.fighters.find(
			(x) =>
				x.isSummon &&
				x.autoInterpose &&
				x.pvCur > 0 &&
				x.ownerCharacterId &&
				x.ownerCharacterId === t.characterId &&
				x.type === t.type
		);
		if (interpose) {
			pushLog(state, 'info', `🛡 ${interpose.name} s'interpose pour ${t.name}`, interpose.id, t.id);
			t = interpose;
		}
		const raw = a.value;
		let dmg = elemental(state, f, a, t),
			suffix = '';
		if (!a.undefendable) {
			const defenses = (state.declarations[t.id] ?? []).filter((d) =>
				['esquive', 'bloquer', 'parer'].includes(d.action)
			);
			let di = used[t.id] ?? 0;
			while (di < defenses.length && a.onlyDodge && defenses[di]!.action !== 'esquive') di++;
			const def = defenses[di];
			// Legacy ne consomme les défenses sautées que lorsqu'une esquive est trouvée.
			if (def) {
				used[t.id] = di + 1;
				const extra = a.defenseExtraEp + t.defenseTaxNext;
				if (extra > 0) {
					t.epCur = Math.max(0, t.epCur - extra);
					t.defenseTaxNext = 0;
					pushLog(
						state,
						'info',
						`⚡ ${t.name} paie +${extra} EP pour défendre ${a.abilityName || a.label || "l'attaque"}`,
						t.id
					);
				}
				if (def.action === 'esquive') {
					if (!a.defenseChipPct) {
						pushLog(
							state,
							'info',
							`🛡 ${t.name} esquive l'attaque de ${f.name} — 0 dégâts`,
							f.id,
							t.id
						);
						continue;
					}
					dmg = Math.ceil((raw * a.defenseChipPct) / 100);
					suffix = ` (défense traversée ${a.defenseChipPct}%)`;
				} else if (def.action === 'bloquer') {
					const pct = def.blockPct;
					if (a.blockBreakLine) {
						const bonus = Math.ceil((raw * pct) / 100);
						dmg = raw + bonus;
						suffix = ` (${t.type === 'beast' ? 'blocage corporel' : 'blocage'} brisé +${bonus})`;
					} else {
						dmg = Math.ceil(dmg * (1 - pct / 100));
						suffix = ` (bloqué${t.type === 'beast' ? ' avec le corps' : ''} −${pct}%)`;
					}
					if (a.blockEpDrain) {
						const old = t.epCur;
						t.epCur = Math.max(0, old - a.blockEpDrain);
						pushLog(
							state,
							'damage',
							`🗡 Blocage puni : ${t.name} perd ${old - t.epCur} EP en encaissant la Frappe Haute.`,
							f.id,
							t.id
						);
					}
				} else {
					dmg = Math.ceil(dmg * 0.75);
					suffix = t.type === 'beast' ? ' (bloqué avec le corps −25%)' : ' (paré −25%)';
				}
				if (a.guardBonusDmg) {
					dmg += a.guardBonusDmg;
					suffix += ' + brise-garde';
				}
				if (a.defenseChipPct) dmg = Math.max(dmg, Math.ceil((raw * a.defenseChipPct) / 100));
				if (a.noReposition) {
					t.noFreeRepositionRound = state.round + 1;
					pushLog(
						state,
						'info',
						`↔ ${t.name} ne peut pas se déplacer au prochain round.`,
						f.id,
						t.id
					);
				}
				if (a.nextDefenseTax) {
					t.defenseTaxNext += a.nextDefenseTax;
					pushLog(
						state,
						'info',
						`⚡ Prochaine défense de ${t.name} : +${a.nextDefenseTax} EP`,
						f.id,
						t.id
					);
				}
			}
		}
		const res = rawDamage(state, t, dmg);
		pushLog(
			state,
			'damage',
			`💥 ${f.name} → ${t.name} : −${res.dmg} PV${suffix} (${res.old}→${res.newPv})${res.ko ? ' 💀 KO!' : ''}`,
			f.id,
			t.id
		);
		if (a.statusToTarget) addOrRefreshStatus(state, t, a.statusToTarget, 2);
		if (a.epDrain) {
			const old = t.epCur;
			t.epCur = Math.max(0, old - a.epDrain);
			pushLog(state, 'info', `⚡ ${t.name} perd ${old - t.epCur} EP`, f.id, t.id);
		}
		if (a.selfEpGain) {
			const old = f.epCur;
			f.epCur = Math.min(f.epMax || 999, old + a.selfEpGain);
			pushLog(state, 'heal', `⚡ ${f.name} regagne +${f.epCur - old} EP`, f.id);
		}
		if (a.briseArmure && !a.elementKey) {
			t.briseArmureBonus = a.briseArmure;
			pushLog(
				state,
				'info',
				`💔 ${t.name} est fragilisé : prochain coup +${a.briseArmure} dégâts`,
				f.id,
				t.id
			);
		}
		if (a.repulse) pushLog(state, 'info', `↔ ${t.name} est repoussé par ${f.name}`, f.id, t.id);
		if (a.disarm)
			pushLog(state, 'info', `🪓 ${f.name} a lancé son arme — à récupérer ou réinvoquer IRP`, f.id);
		if (a.selfPvMaxBonus) {
			bonusPv(f, a.selfPvMaxBonus);
			pushLog(state, 'heal', `🛡 ${f.name} gagne +${a.selfPvMaxBonus} PV max`, f.id);
		}
		if (res.ko || t.pvCur <= 0) queueDrop(state, t);
		if (a.action === 'frappe_dechainees' && a.healAmt && a.healTarget) {
			const ht = findFighter(state, a.healTarget);
			if (ht) {
				const old = ht.pvCur;
				ht.pvCur = Math.min(ht.pvMax, old + a.healAmt);
				pushLog(state, 'heal', `💚 Soin auto → ${ht.name} +${ht.pvCur - old} PV`, f.id, ht.id);
			}
		}
	}
	if (a.consumeClaymorePosture) {
		f.claymorePosture = null;
		pushLog(state, 'info', `🗡 ${f.name} quitte Posture Haute après la Frappe Haute.`, f.id);
	}
}

function bonusPv(f: Fighter, n: number): void {
	f.pvMaxBonus += n;
	f.pvMax += n;
	f.pvCur = Math.min(f.pvMax, f.pvCur + n);
}

function taunt(state: CombatState, f: Fighter, perEnemy: number): void {
	const enemies = state.fighters.filter((t) => t.type !== f.type && t.pvCur > 0);
	let temp = 0,
		perm = 0;
	for (const t of enemies) {
		const permanent = t.type === 'beast' && /Agressif|Très agressif/i.test(t.behavior ?? '');
		t.taunt = {
			sourceId: f.id,
			sourceName: f.name,
			permanent,
			untilRound: permanent ? 0 : state.round + 1
		};
		if (permanent) perm++;
		else temp++;
	}
	const total = enemies.length * perEnemy;
	if (total > 0) {
		bonusPv(f, total);
		pushLog(state, 'heal', `🛡 ${f.name} attire l'aggro et gagne +${total} PV max`, f.id);
	}
	const parts: string[] = [];
	if (temp) parts.push(`${temp} bloqué${temp > 1 ? 's' : ''} 1 tour`);
	if (perm) parts.push(`${perm} verrouillé${perm > 1 ? 's' : ''} tant que l'appel reste actif`);
	if (parts.length) pushLog(state, 'info', `🎯 ${f.name} fixe ${parts.join(' · ')}`, f.id);
}

export function disableShieldCall(state: CombatState, sourceId: string): CombatState {
	const s = cloneState(state),
		f = findFighterOrThrow(s, sourceId);
	let count = 0;
	for (const t of s.fighters)
		if (t.taunt?.sourceId === sourceId) {
			t.taunt = null;
			count++;
		}
	if (count)
		pushLog(
			s,
			'info',
			`🛑 ${f.name} désactive son Appel du Bouclier (${count} cible${count > 1 ? 's' : ''} libérée${count > 1 ? 's' : ''})`,
			f.id
		);
	return s;
}

/** Une invocation vivante par propriétaire ; chaque nom une seule fois par combat.
 * actCost est conservé mais non appliqué, comme le simulateur. */
export function addSummon(state: CombatState, ownerId: string, spec: SummonSpec): CombatState {
	const s = cloneState(state);
	addSummonDraft(s, findFighterOrThrow(s, ownerId), spec);
	return s;
}
function addSummonDraft(s: CombatState, owner: Fighter, spec: SummonSpec): void {
	if (!owner.characterId || owner.isSummon || owner.pvCur <= 0)
		throw new CombatError('COMBAT_INVALID_INPUT', 'Porteur invalide.');
	const pid = owner.characterId,
		marker = `${pid}:${spec.name}`;
	if (
		s.usedSummons.includes(marker) ||
		s.fighters.some((f) => f.isSummon && f.ownerCharacterId === pid && f.pvCur > 0)
	)
		return;
	if (!Number.isFinite(spec.pv) || spec.pv <= 0 || !Number.isFinite(spec.dmg) || spec.dmg < 0)
		throw new CombatError('COMBAT_INVALID_INPUT', 'Invocation invalide.');
	const summon = makePlayerFighter(s, {
		type: 'player',
		characterId: pid,
		name: `${owner.name} · ${spec.name}`,
		oathName: `${owner.oathName} — Invocation`,
		level: owner.level,
		pvCur: spec.pv,
		pvMax: spec.pv,
		epCur: 999,
		epMax: 999,
		emCur: 0,
		emMax: 0,
		dmgBase: spec.dmg
	});
	summon.type = owner.type;
	summon.isSummon = true;
	summon.ownerCharacterId = pid;
	summon.summonName = spec.name;
	summon.actionsMax = 2;
	summon.autoInterpose = spec.autoInterpose;
	summon.rangeType = spec.rangeType;
	s.fighters.push(summon);
	s.usedSummons.push(marker);
	pushLog(s, 'summon', `🌀 ${owner.name} invoque ${spec.name} [${marker}]`, owner.id, summon.id);
}

/** L’arrêt automatique ne clôture pas les outcomes : seul endCombat le fait. */
export function isFinished(state: CombatState): boolean {
	return (
		state.ended ||
		(state.startedAt !== null &&
			(!state.fighters.some((f) => f.type === 'player' && f.pvCur > 0) ||
				!state.fighters.some((f) => f.type === 'beast' && f.pvCur > 0)))
	);
}

export function resolveRound(state: CombatState, _rng: Rng): CombatState {
	if (!state.active || state.phase !== 'resolution')
		throw new CombatError('COMBAT_NOT_RESOLUTION_PHASE', 'Les déclarations ne sont pas complètes.');
	const s = cloneState(state);
	const { history: _history, gestureHistory: _gestures, ...snapshot } = cloneState(state);
	s.history = [...s.history, snapshot].slice(-30);
	s.gestureHistory = [];
	pushLog(s, 'round', `— Résolution Round ${s.round} —`);
	// L'ordre reste celui du simulateur ; une invocation ajoutée ne reçoit aucun tour.
	const order = [...s.order];
	for (const id of order) {
		const f = findFighter(s, id);
		if (!f || f.pvCur <= 0) continue;
		const acts = s.declarations[id] ?? [];
		let ep = acts.reduce((n, a) => n + a.epCost, 0);
		const em = acts.reduce((n, a) => n + a.emCost, 0);
		if (ep > f.epCur) {
			pushLog(
				s,
				'info',
				`⚡ ${f.name} : EP insuffisant (${f.epCur} dispo, ${ep} requis) — actions réduites`,
				id
			);
			ep = f.epCur;
		}
		if (em > f.emCur) {
			pushLog(
				s,
				'info',
				`⚡ ${f.name} : EM insuffisante (${f.emCur} dispo, ${em} requis) — capacités annulées`,
				id
			);
			let acc = 0;
			for (const a of acts)
				if (a.emCost > 0) {
					acc += a.emCost;
					if (acc > f.emCur) {
						a.action = 'annule';
						a.label = '[Annulé — EM]';
					}
				}
		}
		f.epCur = Math.max(0, f.epCur - ep);
		f.emCur = Math.max(0, f.emCur - em);
	}
	const used: Record<string, number> = {};
	for (const id of order) {
		const f = findFighter(s, id);
		if (!f || f.pvCur <= 0) continue;
		for (const a of s.declarations[id] ?? []) {
			if (a.action === 'annule') continue;
			if (
				a.kind === 'attack' ||
				['frappe', 'pugilat', 'frappe_dechainees'].includes(a.action) ||
				(a.action === 'capacite' && (a.value > 0 || a.hits || a.aoe))
			)
				for (let hit = 0; hit < Math.max(1, a.hits); hit++) attack(s, f, a, used);
		}
	}
	for (const id of order) {
		const f = findFighter(s, id);
		if (!f || f.pvCur <= 0) continue;
		for (const a of s.declarations[id] ?? []) {
			if (a.action === 'annule') continue;
			if ((a.action === 'soin' || a.action === 'capacite') && a.healAmt > 0) {
				const ht = findFighter(s, a.healTarget ?? id);
				if (ht) {
					const old = ht.pvCur;
					ht.pvCur = Math.min(ht.pvMax, old + a.healAmt);
					pushLog(s, 'heal', `💚 ${f.name} → ${ht.name} +${ht.pvCur - old} PV`, id, ht.id);
				}
			}
			if (a.action === 'capacite') {
				if (a.provoke) taunt(s, f, a.perEnemyPvMax);
				if (a.claymorePosture) {
					f.claymorePosture = structuredClone(a.claymorePosture);
					pushLog(
						s,
						'spell',
						`🗡 ${f.name} entre en Posture Haute : prochaine Frappe Haute ${a.claymorePosture.damage} dégâts.`,
						id
					);
				}
				if (a.kind === 'summon' && a.summon) addSummonDraft(s, f, a.summon);
				pushLog(
					s,
					'spell',
					`✨ ${f.name} : ${a.abilityName || a.label || 'Capacité'}${a.emCost ? ` (−${a.emCost} EM)` : ''}`,
					id
				);
			}
			if (a.action === 'deplacer') pushLog(s, 'info', `🏃 ${f.name} se déplace`, id);
		}
	}
	for (const id of order) {
		const f = findFighter(s, id);
		if (f && f.pvCur > 0) tickStatuses(s, f);
	}
	s.declarations = {};
	s.round++;
	s.turn = 0;
	s.phase = 'declaration';
	for (const f of s.fighters) {
		f.elemState = null;
		if (f.taunt) {
			if (!forcedTargetInfo(s, f)) f.taunt = null;
			else if (!f.taunt.permanent && f.taunt.untilRound > 0 && s.round > f.taunt.untilRound) {
				pushLog(s, 'info', `✓ ${f.name} n'est plus bloqué par ${f.taunt.sourceName}`, null, f.id);
				f.taunt = null;
			}
		}
	}
	if (isFinished(s)) {
		pushLog(
			s,
			'round',
			s.fighters.some((f) => f.type === 'player' && f.pvCur > 0)
				? '🏆 Tous les monstres sont KO !'
				: '💀 Tous les joueurs sont KO !'
		);
		s.active = false;
		s.phase = 'idle';
	} else {
		pushLog(s, 'round', `— Round ${s.round} — Déclarations`);
		advanceDeclarant(s);
	}
	return s;
}

export function undoRound(state: CombatState): CombatState {
	if (state.ended) throw new CombatError('COMBAT_ALREADY_ENDED', 'Ce combat est clos.');
	const snapshot = state.history.at(-1);
	return snapshot
		? {
				...structuredClone(snapshot),
				history: structuredClone(state.history.slice(0, -1)),
				gestureHistory: []
			}
		: cloneState(state);
}
