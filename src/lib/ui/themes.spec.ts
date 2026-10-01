import { describe, expect, it } from 'vitest';
import { THEMES, contrastRatio, tonOf, validateTheme } from './themes';

describe('thèmes personnels', () => {
	it.each(THEMES)('$id passe les contrastes et annonce son ton', (theme) => {
		expect(validateTheme(theme.tokens)).toEqual({ valid: true, insufficient: [] });
		expect(tonOf(theme.tokens)).toBe(theme.ton);
		expect(Object.keys(theme.tokens)).toHaveLength(8);
	});
	it('refuse chaque couple insuffisant', () => {
		const result = validateTheme({
			...THEMES[0].tokens,
			'--page': '#fff',
			'--encre': '#eee',
			'--encre-2': '#aaa'
		});
		expect(result.valid).toBe(false);
		expect(result.insufficient.map((p) => [p.foreground, p.background])).toEqual([
			['--encre', '--page'],
			['--encre-2', '--page']
		]);
	});
	it('calcule les rapports connus', () => {
		expect(contrastRatio('#000000', '#ffffff')).toBe(21);
		expect(contrastRatio('#fff', '#000')).toBe(21);
		expect(contrastRatio('#777777', '#777777')).toBe(1);
		expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.478, 3);
	});
	it('refuse les couleurs invalides', () => {
		expect(() => contrastRatio('white', '#000')).toThrow();
	});
});
