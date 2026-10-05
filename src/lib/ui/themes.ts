export type ThemeToken =
	| '--bureau'
	| '--page'
	| '--page-2'
	| '--reglure'
	| '--encre'
	| '--encre-2'
	| '--encre-grise'
	| '--ruban';
export type ThemeTokens = Record<ThemeToken, string>;
export type Theme = {
	id: string;
	name: string;
	ton: 'sombre' | 'clair';
	tokens: ThemeTokens;
	description: string;
};

export const THEMES: Theme[] = [
	{
		id: 'dark',
		name: 'Carnet de nuit',
		ton: 'sombre',
		tokens: {
			'--bureau': '#091519',
			'--page': '#102327',
			'--page-2': '#172e32',
			'--reglure': '#1c3439',
			'--encre': '#f0eee5',
			'--encre-2': '#bdcdc8',
			'--encre-grise': '#7e8f8b',
			'--ruban': '#c6d8c4'
		},
		description: 'Nuit d’encre, lumière d’aurore et ivoire.'
	},
	{
		id: 'light',
		name: 'Papier',
		ton: 'clair',
		tokens: {
			'--bureau': '#dcd6c5',
			'--page': '#efead9',
			'--page-2': '#e6e0cf',
			'--reglure': '#d9d2bf',
			'--encre': '#1b2a2e',
			'--encre-2': '#4c5b5b',
			'--encre-grise': '#8a928c',
			'--ruban': '#7fa089'
		},
		description: 'Encre noire sur papier clair.'
	},
	{
		id: 'violet',
		name: 'Galactique',
		ton: 'sombre',
		tokens: {
			'--bureau': '#03020b',
			'--page': '#090621',
			'--page-2': '#140d3d',
			'--reglure': '#21145f',
			'--encre': '#fcfaff',
			'--encre-2': '#d9d4f4',
			'--encre-grise': '#9a93c7',
			'--ruban': '#73d8ff'
		},
		description: 'Nuit violette, encre pâle, ruban bleu ciel.'
	},
	{
		id: 'green',
		name: 'Sylvan',
		ton: 'sombre',
		tokens: {
			'--bureau': '#031108',
			'--page': '#082111',
			'--page-2': '#12381d',
			'--reglure': '#1e552d',
			'--encre': '#f3fff0',
			'--encre-2': '#c9edbf',
			'--encre-grise': '#8db883',
			'--ruban': '#d8c16a'
		},
		description: 'Vert de sous-bois, encre de mousse, ruban d’or pâle.'
	},
	{
		id: 'aquaris',
		name: 'Aquaris',
		ton: 'sombre',
		tokens: {
			'--bureau': '#011018',
			'--page': '#041a24',
			'--page-2': '#082b37',
			'--reglure': '#0d3f4e',
			'--encre': '#f0fcff',
			'--encre-2': '#c8e8ef',
			'--encre-grise': '#8fb6c0',
			'--ruban': '#e5c878'
		},
		description: 'Bleu des grands fonds, encre d’écume, ruban d’or ancien.'
	},
	{
		id: 'easter',
		name: 'Printemps Éveillé',
		ton: 'clair',
		tokens: {
			'--bureau': '#effbe9',
			'--page': '#e5f7de',
			'--page-2': '#d7f2cf',
			'--reglure': '#c6ebbd',
			'--encre': '#203227',
			'--encre-2': '#49655a',
			'--encre-grise': '#668378',
			'--ruban': '#ff83bc'
		},
		description: 'Vert tendre, encre de feuille, ruban rose.'
	},
	{
		id: 'halloween',
		name: 'Nuit des Âmes',
		ton: 'sombre',
		tokens: {
			'--bureau': '#0a0911',
			'--page': '#110d18',
			'--page-2': '#191224',
			'--reglure': '#251830',
			'--encre': '#fff4ea',
			'--encre-2': '#e8ccb6',
			'--encre-grise': '#a98e8d',
			'--ruban': '#d8d2ff'
		},
		description: 'Prune nocturne, encre chaude, ruban lilas.'
	},
	{
		id: 'noel',
		name: 'Veillée Hivernale',
		ton: 'sombre',
		tokens: {
			'--bureau': '#08140d',
			'--page': '#0d1e12',
			'--page-2': '#132816',
			'--reglure': '#1d361f',
			'--encre': '#fbfff9',
			'--encre-2': '#d8ead7',
			'--encre-grise': '#9bb59e',
			'--ruban': '#f2c66d'
		},
		description: 'Vert sapin, encre de neige, ruban doré.'
	},
	{
		id: 'bloodmoon',
		name: 'Lune de Sang',
		ton: 'sombre',
		tokens: {
			'--bureau': '#050102',
			'--page': '#0c0305',
			'--page-2': '#17060a',
			'--reglure': '#260912',
			'--encre': '#fff6f3',
			'--encre-2': '#f0c4bd',
			'--encre-grise': '#b07d82',
			'--ruban': '#ff7d92'
		},
		description: 'Noir rougi, encre rosée, ruban carmin.'
	}
];

const NATIFS = new Map(THEMES.map((t) => [t.id, t]));

/**
 * Nom et description d'un thème natif tels que le carnet les écrit (03-vision §7) : huit couleurs,
 * sans ambiance ni mouvement. Un thème créé dans le Registre garde les siens.
 */
export function libelleTheme<T extends { id: string; name: string; description?: string | null }>(
	theme: T
): T {
	const natif = NATIFS.get(theme.id);
	return natif ? { ...theme, name: natif.name, description: natif.description } : theme;
}

function luminance(hex: string): number {
	const match = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(hex);
	if (!match) throw new Error(`Couleur hexadécimale invalide : ${hex}`);
	const full = match[1].length === 3 ? [...match[1]].map((c) => c + c).join('') : match[1];
	const channels = [0, 2, 4].map((i) => {
		const c = parseInt(full.slice(i, i + 2), 16) / 255;
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
export function contrastRatio(hexA: string, hexB: string): number {
	const a = luminance(hexA),
		b = luminance(hexB);
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
export function validateTheme(tokens: ThemeTokens): {
	valid: boolean;
	insufficient: { foreground: ThemeToken; background: ThemeToken; ratio: number }[];
} {
	const insufficient = (['--encre', '--encre-2'] as const)
		.map((foreground) => ({
			foreground,
			background: '--page' as const,
			ratio: contrastRatio(tokens[foreground], tokens['--page'])
		}))
		.filter((pair) => pair.ratio < 4.5);
	return { valid: insufficient.length === 0, insufficient };
}
export function tonOf(tokens: ThemeTokens): 'clair' | 'sombre' {
	return luminance(tokens['--page']) > 0.5 ? 'clair' : 'sombre';
}
