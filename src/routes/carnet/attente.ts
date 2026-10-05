// Composition de « Ce qui attend ta main » (03-vision §5.2), module pur testé avec Vitest.
import type { WaitingView } from '$lib/schemas/reading';
import type { EventRowView } from '$lib/schemas/events';
import type { SceneTableContext } from '$lib/schemas/scenes';
import { channelFromTitle } from '$lib/schemas/scenes';
import { heureRonde, jour, jourSemaine, joursCalendaires } from '$lib/ui/dates';

/** « samedi 20 h » dans la semaine, « 12 octobre, 20 h » au-delà (même phrase que le domaine). */
function quand(iso: string, maintenant: Date): string {
	const jours = joursCalendaires(iso, maintenant) ?? 99;
	return jours >= 0 && jours <= 6
		? `${jourSemaine(iso)} ${heureRonde(iso)}`
		: `${jour(iso)}, ${heureRonde(iso)}`;
}

/**
 * « Ce qui attend ta main » : zéro à trois lignes, dans l'ordre de la vision (§5.2) — une scène,
 * puis la Table, puis le rendez-vous. Une scène n'est écrite qu'une fois (même salon, même lien), et
 * la scène que la Table a ouverte pour elle-même n'est pas répétée : la ligne de la Table la porte.
 */
export function composerAttente(
	waiting: WaitingView[],
	upcoming: EventRowView[] = [],
	maintenant: Date = new Date(),
	tableDuFeuillet: SceneTableContext | null = null
): WaitingView[] {
	const tables = waiting.filter((w) => w.kind === 'table');
	// La liste reçue peut avoir été coupée avant la Table : on reprend celle que lit le feuillet.
	if (!tables.length && tableDuFeuillet) {
		tables.push({
			kind: 'table',
			id: tableDuFeuillet.id,
			text: `La Table est ouverte : ${tableDuFeuillet.name}`,
			href: `/table/combat/${tableDuFeuillet.id}`,
			discordUrl: tableDuFeuillet.discordUrl || null,
			channel: channelFromTitle(tableDuFeuillet.name) || null,
			at: null
		});
	}
	const deLaTable = (w: WaitingView) =>
		tables.some(
			(t) =>
				(t.channel && w.channel === t.channel) || (t.discordUrl && w.discordUrl === t.discordUrl)
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
	// La liste reçue peut avoir été coupée avant le rendez-vous : on le retrouve dans « Ce qui vient ».
	if (!rendezVous.length) {
		const e = upcoming.find(
			(u) => u.registered && u.startsAt && Date.parse(u.startsAt) >= maintenant.getTime()
		);
		if (e?.startsAt)
			rendezVous.push({
				kind: 'event',
				id: e.id,
				text: `Rendez-vous ${quand(e.startsAt, maintenant)} — tu viens`,
				href: '/agenda',
				discordUrl: e.discordUrl || null,
				channel: null,
				at: e.startsAt
			});
	}
	return [...scenes.slice(0, 1), ...tables.slice(0, 1), ...rendezVous.slice(0, 1)];
}
