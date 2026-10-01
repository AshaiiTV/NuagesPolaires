// Composition de « Ce qui attend ta main » (03-vision §5.2), module pur testé avec Vitest.
import type { WaitingView } from '$lib/schemas/reading';

/**
 * « Ce qui attend ta main » : zéro à trois lignes, dans l'ordre de la vision (§5.2) — une scène,
 * puis la Table, puis le rendez-vous. Une scène n'est écrite qu'une fois (même salon, même lien), et
 * la scène que la Table a ouverte pour elle-même n'est pas répétée : la ligne de la Table la porte.
 */
export function composerAttente(waiting: WaitingView[]): WaitingView[] {
	const tables = waiting.filter((w) => w.kind === 'table');
	const deLaTable = (w: WaitingView) =>
		tables.some(
			(t) =>
				(t.channel && w.channel === t.channel) ||
				(t.discordUrl && w.discordUrl === t.discordUrl)
		);
	const vues = new Set<string>();
	const scenes = waiting.filter((w) => {
		if (w.kind !== 'scene' || deLaTable(w)) return false;
		const cle = w.channel ?? w.discordUrl ?? w.id;
		if (vues.has(cle)) return false;
		vues.add(cle);
		return true;
	});
	const rendezVous = waiting.filter((w) => w.kind === 'event');
	return [...scenes.slice(0, 1), ...tables.slice(0, 1), ...rendezVous.slice(0, 1)];
}
