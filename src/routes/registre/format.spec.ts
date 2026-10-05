// Empêche l’affichage d’un nom technique après l’ajout d’un geste dans un domaine.
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import {
	ACTIONS_AUDIT,
	ACTIONS_STAFF,
	actionAudit,
	actionDecision,
	detailsLisibles
} from './format';

describe('journaux lisibles', () => {
	it('nomme chaque action littérale écrite par un domaine et les actions dynamiques connues', () => {
		const actions = new Set([
			'observation_validated',
			'observation_rejected',
			'scene_summary',
			'scene_open_question',
			'scene_resume',
			'scene_question'
		]);
		const dossier = resolve('src/lib/server/domain');
		for (const fichier of readdirSync(dossier).filter(
			(f) => f.endsWith('.ts') && !f.includes('.spec')
		)) {
			const source = ts.createSourceFile(
				fichier,
				readFileSync(resolve(dossier, fichier), 'utf8'),
				ts.ScriptTarget.Latest,
				true
			);
			function visiter(node: ts.Node) {
				if (
					ts.isPropertyAssignment(node) &&
					['action', 'staffAction'].includes(node.name.getText(source)) &&
					ts.isStringLiteral(node.initializer)
				)
					actions.add(node.initializer.text);
				if (
					ts.isCallExpression(node) &&
					/^(logMutation|log|staffAction)$/.test(node.expression.getText(source))
				) {
					for (const argument of node.arguments)
						if (ts.isStringLiteral(argument) && argument.text.includes('_'))
							actions.add(argument.text);
				}
				ts.forEachChild(node, visiter);
			}
			visiter(source);
		}
		const absentes = [...actions].filter((a) => !(ACTIONS_AUDIT[a] || ACTIONS_STAFF[a]));
		expect(absentes).toEqual([]);
	});
	it('n’imprime jamais les noms inconnus ni les clés techniques', () => {
		expect(actionAudit('future_action')).toBe('Action non décrite');
		expect(actionDecision('future_action')).toBe('Action non décrite');
		expect(detailsLisibles({ id: 'c_secret', unknown_field: 'secret', detail: 'auto' })).toBe(
			'détail\u00a0: automatique'
		);
	});
});
