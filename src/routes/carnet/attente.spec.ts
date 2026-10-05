import { describe, expect, it } from 'vitest';
import type { WaitingView } from '$lib/schemas/reading';
import type { EventRowView } from '$lib/schemas/events';
import { composerAttente } from './attente';

const scene = (
	id: string,
	channel: string | null,
	discordUrl: string | null = null
): WaitingView => ({
	kind: 'scene',
	id,
	text: `Scène ouverte · ${channel ?? id}`,
	href: '/carnet/scene',
	discordUrl,
	channel,
	at: '2026-09-30T19:00:00.000Z'
});
const table = (
	id: string,
	nom: string,
	channel: string,
	discordUrl: string | null = null
): WaitingView => ({
	kind: 'table',
	id,
	text: `La Table est ouverte : ${nom}`,
	href: `/table/combat/${id}`,
	discordUrl,
	channel,
	at: '2026-09-30T19:00:00.000Z'
});
const rendezVous: WaitingView = {
	kind: 'event',
	id: 'e1',
	text: 'Rendez-vous samedi 20 h — tu viens',
	href: '/agenda',
	discordUrl: null,
	channel: null,
	at: '2026-10-03T18:00:00.000Z'
};

describe('composerAttente (Ce qui attend ta main)', () => {
	it('rien qui attend : aucune ligne', () => {
		expect(composerAttente([])).toEqual([]);
	});

	it('ordre imposé : la scène, puis la Table, puis le rendez-vous', () => {
		const lignes = composerAttente([
			rendezVous,
			table('c1', 'Col des brumes', '#col-des-brumes'),
			scene('s1', '#le-gue')
		]);
		expect(lignes.map((l) => l.kind)).toEqual(['scene', 'table', 'event']);
	});

	it('la scène ouverte par la Table n’est pas répétée : la ligne de la Table la porte', () => {
		const lignes = composerAttente([
			scene('s-table', '#col-des-brumes'),
			table('c1', 'Col des brumes', '#col-des-brumes'),
			rendezVous
		]);
		expect(lignes.map((l) => l.id)).toEqual(['c1', 'e1']);
	});

	it('même lien Discord que la Table : la scène est celle de la Table', () => {
		const url = 'https://discord.com/channels/1/2';
		const lignes = composerAttente([
			scene('s1', '#autre-titre', url),
			table('c1', 'Col des brumes', '#col-des-brumes', url)
		]);
		expect(lignes.map((l) => l.id)).toEqual(['c1']);
	});

	it('deux scènes du même salon : une seule ligne, la plus récente (la première reçue)', () => {
		const lignes = composerAttente([scene('s2', '#le-gue'), scene('s1', '#le-gue'), rendezVous]);
		expect(lignes.map((l) => l.id)).toEqual(['s2', 'e1']);
	});

	it('jamais plus de trois lignes, une de chaque sorte', () => {
		const lignes = composerAttente([
			scene('s1', '#le-gue'),
			scene('s2', '#la-crete'),
			table('c1', 'Col des brumes', '#col-des-brumes'),
			table('c2', 'Lisière', '#lisiere'),
			rendezVous
		]);
		expect(lignes.map((l) => l.id)).toEqual(['s1', 'c1', 'e1']);
	});

	it('rendez-vous coupé de la liste reçue : retrouvé parmi ceux où tu viens', () => {
		const maintenant = new Date('2026-10-01T19:00:00.000Z');
		const prochain = {
			id: 'e9',
			registered: true,
			startsAt: '2026-10-03T18:00:00.000Z',
			discordUrl: ''
		} as unknown as EventRowView;
		const lignes = composerAttente(
			[scene('s1', '#le-gue'), scene('s2', '#le-gue')],
			[prochain],
			maintenant
		);
		expect(lignes.map((l) => [l.kind, l.id])).toEqual([
			['scene', 's1'],
			['event', 'e9']
		]);
		expect(lignes[1].text).toMatch(/^Rendez-vous samedi 20 h — tu viens$/);
	});

	it('Table coupée de la liste reçue : reprise du feuillet, et la scène qu’elle a ouverte s’efface', () => {
		const lignes = composerAttente(
			[scene('s1', '#col-des-brumes'), scene('s2', '#col-des-brumes')],
			[],
			new Date(),
			{
				id: 'c7',
				name: 'Col des brumes',
				discordUrl: '',
				round: 1,
				phase: 'declaration',
				status: 'en_cours'
			}
		);
		expect(lignes.map((l) => [l.kind, l.id])).toEqual([['table', 'c7']]);
	});
});
