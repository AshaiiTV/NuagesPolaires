import { describe, it, expect } from 'vitest';
import { ACTION_RULES, ACTION_COSTS, RULE_DIVERGENCES, ruleCardFor } from './rules';
import { STATUS_IDS } from './combat/statuses';
describe('table unique de règles', () => {
	it('coûts du simulateur et ancres', () => {
		expect(ACTION_COSTS).toEqual({ frappe: 6, pugilat: 6, esquive: 8, bloquerPlayer: 5, bloquerBeast: 2, parer: 0, deplacer: 10, frappeHauteDefault: 10 });
		expect(new Set(ACTION_RULES.map((a) => a.id)).size).toBe(ACTION_RULES.length);
		for (const a of ACTION_RULES) { expect(a.label).not.toBe(''); expect(a.conditions).not.toBe(''); expect(a.effect).not.toBe(''); expect(a.anchor).toMatch(/^\/univers\/systeme#/); }
	});
	it('carte de déclaration et priorité', () => {
		expect(ruleCardFor({ phase: 'declaration', lowEp: true })).toMatchObject({ id: 'actions', actions: ACTION_RULES });
		expect(ruleCardFor({ kind: 'declaration' })).toMatchObject({ id: 'actions' });
		expect(ruleCardFor({ phase: 'declaration', status: 'gel' })).toMatchObject({ id: 'status', title: 'Gel' });
	});
	it.each(STATUS_IDS)('définition du statut %s', (status) => {
		expect(ruleCardFor({ kind: 'status', status })).toMatchObject({ id: 'status', definition: { id: status } });
	});
	it('EP < 20 % sélectionnée par le contexte ; hors combat glossaire', () => {
		expect(ruleCardFor({ phase: 'resolution', lowEp: true })).toMatchObject({ id: 'recovery' });
		expect(ruleCardFor({ kind: 'recovery' })).toMatchObject({ id: 'recovery' });
		expect(ruleCardFor({ kind: 'out-of-combat' })).toMatchObject({ id: 'glossary' });
		expect(ruleCardFor({ phase: 'idle' })).toMatchObject({ id: 'glossary' });
	});
	it('chaque divergence porte les deux règles et la source', () => {
		for (const action of ['Parer', 'Bloquer', 'Pugilat', 'Tir']) expect(RULE_DIVERGENCES.some((d) => d.action === action)).toBe(true);
		for (const d of RULE_DIVERGENCES) { expect(d.simulateur).not.toBe(''); expect(d.pagePublique).not.toBe(''); expect(d.source).toMatch(/legacy\/assets\/js\/main.js:/); }
	});
});
