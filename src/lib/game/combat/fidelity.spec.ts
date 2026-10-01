import { describe, expect, it } from 'vitest';
import { addFighter, addSummon, actionsMax, applyStatus, buildDeclaration, createCombat, declareAction, fromLegacyArchive, removeFighter, resolveRound, startCombat } from './index';
import type { CombatState } from './types';
import { findBranch, oathBranches, oathFromLegacyCustom } from '../oaths';
import { combatXp, normalizeLegacyProgression } from '../progression';
import { normalizeBeast } from '../../server/legacy/normalize';

function preparation() {
 let s = createCombat({ id: 'fidelite' });
 s = addFighter(s, { type: 'player', characterId: 'p', name: 'Élève', oathName: 'Duelliste', level: 2, pvCur: 30, pvMax: 30, epCur: 50, epMax: 50, emCur: 20, emMax: 20, statuses: [{ id: 'etourdi', tours: 2 }, { id: 'saignement', tours: 2 }] });
 return addFighter(s, { type: 'beast', beastId: 'b', name: 'Créature', level: 2, pv: 100, ep: 50, strike: '0', gem: '1–100 : Gemme Blanche' });
}
function round(s: CombatState) {
 while (s.phase === 'declaration') s = declareAction(s, s.order[s.turn]!, 'passer');
 return resolveRound(s, () => 0.5);
}
describe('INT-3 : exemples chiffrés de la revue', () => {
 it('A1 : entrée sans statut, 3 actions et 30 PV au premier round', () => {
  const s = startCombat(preparation());
  expect(s.fighters[0]!.statuses).toEqual([]);
  expect(actionsMax(s, s.fighters[0]!.id)).toBe(3);
  expect(round(s).fighters[0]!.pvCur).toBe(30);
 });
 it('A2 : invocation sans tour, ordre de 2 et adversaire à 100 PV', () => {
  let s = startCombat(preparation());
  s = addSummon(s, s.fighters[0]!.id, { name: 'Tortue', pv: 10, dmg: 6, actCost: 1, autoInterpose: false, rangeType: 'cac', ownerCharacterId: 'p' });
  expect(s.order).toHaveLength(2);
  expect(round(round(s)).fighters[1]!.pvCur).toBe(100);
 });
 it('A3 : journal d’initiative en préparation, démarrage round 1 autorisé', () => {
  const s = fromLegacyArchive({ id: 'archive', fighters: [{ type: 'player', pid: 'p', name: 'Élève', pvMax: 30 }, { type: 'beast', bid: 'b', name: 'Loup', pvMax: 100 }], log: ['★ Initiative'], active: false, phase: 'idle' });
  expect(s.ended).toBe(false);
  expect(s.startedAt).toBeNull();
  expect(startCombat(s)).toMatchObject({ active: true, round: 1 });
 });
 it('A4 : frappe de créature base zéro = 6 + niveau 2', () => {
  expect(buildDeclaration(preparation().fighters[1]!, 'frappe').value).toBe(8);
 });
 it('A5 : trois branches custom, branche C retrouvée', () => {
  const oath = oathFromLegacyCustom('Custom', { branches: ['A', 'B', 'C'].map((nom) => ({ nom, paliers: [{ niv: 2, nom: 'Coup', cout: '1 EM', desc: '9+Niv dégâts' }] })) });
  expect(oathBranches(oath)).toHaveLength(3);
  expect(findBranch(oath, 'C')?.paliers).toHaveLength(1);
 });
 it('A6 : croissance partielle, maxima 39/56/22 et courants 29/46/12', () => {
  const c = normalizeLegacyProgression({ classe: 'Duelliste', level: 1, xp: 0, sLevel: 2, sXp: 0, pvMax: 30, epMax: 50, emMax: 20, pvCur: 20, epCur: 40, emCur: 10 }, () => ({ pvN: 9 }));
  expect([c.pvMax, c.epMax, c.emMax, c.pvCur, c.epCur, c.emCur]).toEqual([39, 56, 22, 29, 46, 12]);
 });
 it('A8 : 33,5 % au niveau 3 donnent 10 XP', () => {
  expect(combatXp(3, 33.5)).toBe(10);
 });
 it('A9 : migration quantité saisie 5/5 vers plage effective 1/2', () => {
  expect(normalizeBeast({ id: 'b', niv: 3, beh: 'Agressif', qtyMin: 5, qtyMax: 5 }).row).toMatchObject({ qtyMin: 1, qtyMax: 2 });
 });
 it('A10 : saignement létal à 3 PV, zéro drop', () => {
  let s = startCombat(preparation());
  s.fighters[1]!.pvCur = 3;
  s = round(applyStatus(s, s.fighters[1]!.id, 'saignement'));
  expect(s.fighters[1]!.pvCur).toBe(0);
  expect(s.drops).toHaveLength(0);
 });
 it('A11 : retrait en résolution conserve phase et ramène le curseur hors limites à 0', () => {
  let s = startCombat(preparation());
  while (s.phase === 'declaration') s = declareAction(s, s.order[s.turn]!, 'passer');
  expect(removeFighter(s, s.fighters[1]!.id)).toMatchObject({ phase: 'resolution', turn: 0, declarations: {} });
 });
 it('A14 : Frappe Déchaînée 0 EM par défaut, durée manuelle 11', () => {
  const s = preparation();
  expect(buildDeclaration(s.fighters[0]!, 'frappe_dechainees').emCost).toBe(0);
  expect(applyStatus(s, s.fighters[0]!.id, 'gel', 11).fighters[0]!.statuses).toEqual([{ id: 'gel', tours: 11 }]);
 });
});
