// La Table — mots du carnet pour les objets du moteur de combat.
// Le moteur (src/lib/game/combat) écrit ses libellés et son journal avec des pictogrammes hérités du
// simulateur ; le carnet ne parle jamais en émoji (03-vision §8) : tout texte du moteur passe ici avant
// d'être affiché. Module pur, importable côté client.
import { STATUS_EFFECTS } from '$lib/game/combat/statuses';
import type { CombatAction, CombatLogEntry, CombatState, Fighter, StatusId } from '$lib/game/combat/types';
import { ACTION_RULES } from '$lib/game/rules';

/** Pictogrammes, sélecteurs de variante et liants : retirés de tout texte du moteur. */
const PICTOGRAMMES = /[\p{Extended_Pictographic}\u{FE0F}\u{FE0E}\u{200D}\u{20E3}\u{2605}\u{2713}\u{2726}\u{25CC}]/gu;

/** « 💥 Kael → Loup : −12 PV (24→12) 💀 KO! » → « Kael → Loup : −12 PV (24→12) KO ». */
export function sansEmoji(texte: string | null | undefined): string {
	return String(texte ?? '')
		.replace(PICTOGRAMMES, '')
		.replace(/\s*!+/g, '')
		.replace(/\((\d+)T\)/g, '($1 t.)')
		.replace(/\s{2,}/g, ' ')
		.trim();
}

/** Nom de salon Discord d'une zone : « [🌳]-forêt-aux-lianes » → « #forêt-aux-lianes ». */
export function nomSalon(nom: string): string {
	const propre = sansEmoji(nom.replace(/^\[[^\]]*\]-?/, '')).replace(/^#/, '');
	return propre ? `#${propre}` : nom;
}

/** Signe moins typographique. */
export function signe(n: number): string {
	return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0';
}

/** Coût imprimé après le mot : « 6 EP », « 5 EM », « 6 EP · 2 EM », « sans coût ». */
export function cout(a: Pick<CombatAction, 'epCost' | 'emCost'>): string {
	const parts: string[] = [];
	if (a.epCost) parts.push(`${a.epCost} EP`);
	if (a.emCost) parts.push(`${a.emCost} EM`);
	return parts.length ? parts.join(' · ') : 'sans coût';
}

/** Libellé d'une déclaration du moteur, sans pictogramme : « Frappe (13) », « Esquive », « Passer ». */
export function libelleAction(a: Pick<CombatAction, 'label' | 'abilityName' | 'action'>): string {
	if (a.action === 'passer') return 'Passer';
	if (a.action === 'annule') return 'Annulée faute d’EM';
	return sansEmoji(a.label) || sansEmoji(a.abilityName) || a.action;
}

/** Actions de base proposées au déclarant (table de rules.ts, libellés sans émoji). */
export const ACTIONS_DE_BASE = [
	{ id: 'frappe', cible: 'ennemi' },
	{ id: 'pugilat', cible: 'ennemi', joueur: true },
	{ id: 'esquive', cible: null },
	{ id: 'bloquer', cible: null },
	{ id: 'parer', cible: null, joueur: true },
	{ id: 'subit', cible: null },
	{ id: 'deplacer', cible: null }
] as const;

export type ActionDeBase = (typeof ACTIONS_DE_BASE)[number]['id'];

/** Libellé d'une règle d'action de rules.ts sans pictogramme : « Bloquer −50% ». */
export function libelleRegle(id: string): string {
	const r = ACTION_RULES.find((x) => x.id === id);
	return r ? sansEmoji(r.label).replace(/\s*\(N\)$/, '') : id;
}

/** Statut : libellé et couleur de sens (losange de 4 px, jamais un fond). */
export function statut(id: StatusId): { libelle: string; couleur: string } {
	const s = STATUS_EFFECTS[id];
	return { libelle: s?.label ?? id, couleur: s?.color ?? 'currentColor' };
}

/** Statut d'une Table dans la liste. */
export function statutTable(status: 'preparation' | 'en_cours' | 'termine'): string {
	return status === 'preparation' ? 'avant démarrage' : status === 'en_cours' ? 'en cours' : 'repliée';
}

/** Combattant KO. */
export const ko = (f: Pick<Fighter, 'pvCur'>) => f.pvCur <= 0;

/** Chiffres d'une ligne de journal qui a changé une valeur (ajustement MJ) : « PV 24 → 18 ». */
export function changement(e: CombatLogEntry): { champ: string; ancien: number; nouveau: number } | null {
	if (!e.field || e.oldValue === undefined || e.newValue === undefined) return null;
	return { champ: e.field.toUpperCase(), ancien: e.oldValue, nouveau: e.newValue };
}

/** Motif écrit après le tiret d'un ajustement : « Kael : PV 24 → 18 — motif · mj · 21:47 » → « motif · mj · 21:47 ». */
export function motifDe(e: CombatLogEntry): string {
	const i = e.text.indexOf(' — ');
	return i >= 0 ? sansEmoji(e.text.slice(i + 3)) : '';
}

/** Numéros des lignes de résolution rayées (la rature écrit « rature de la ligne N » dans son motif). */
export function lignesRayees(log: readonly CombatLogEntry[]): Set<number> {
	const set = new Set<number>();
	for (const e of log) {
		const m = /rature de la ligne (\d+)/.exec(e.text);
		if (m) set.add(Number(m[1]));
	}
	return set;
}

/**
 * Effet chiffré d'une ligne de résolution, pour la rayer : ressource, cible et correction à
 * appliquer. Seules les lignes écrites par le moteur avec un chiffre lisible sont rayables
 * (dégâts « (24→12) », soins « +6 PV », pertes « perd 8 EP ») ; les autres restent du récit.
 */
export function correctionDe(e: CombatLogEntry): { cible: string; ressource: 'pv' | 'ep'; delta: number } | null {
	if (!e.targetId) return null;
	if (e.kind === 'damage') {
		const m = /\((\d+)→(\d+)\)/.exec(e.text);
		if (m) return { cible: e.targetId, ressource: 'pv', delta: Number(m[1]) - Number(m[2]) };
	}
	if (e.kind === 'heal') {
		const m = /\+(\d+) PV/.exec(e.text);
		if (m && Number(m[1]) > 0) return { cible: e.targetId, ressource: 'pv', delta: -Number(m[1]) };
	}
	const perte = /perd (\d+) EP/.exec(e.text);
	if (perte && Number(perte[1]) > 0) return { cible: e.targetId, ressource: 'ep', delta: Number(perte[1]) };
	return null;
}

/** Lignes de la résolution d'un round (après « — Résolution Round N — »). */
export function lignesResolution(log: readonly CombatLogEntry[], round: number): CombatLogEntry[] {
	let debut = -1;
	for (let i = log.length - 1; i >= 0; i--) {
		if (log[i].kind === 'round' && log[i].text.includes(`Résolution Round ${round} `)) {
			debut = i;
			break;
		}
	}
	if (debut < 0) return [];
	return log.slice(debut + 1).filter((e) => e.round === round && !e.text.startsWith('— Round'));
}

/** Dernier round résolu (0 si aucun). */
export function dernierRoundResolu(log: readonly CombatLogEntry[]): number {
	for (let i = log.length - 1; i >= 0; i--) {
		const m = /Résolution Round (\d+)/.exec(log[i].text);
		if (m) return Number(m[1]);
	}
	return 0;
}

const jourLong = (ms: number) =>
	new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(
		new Date(ms)
	);

/**
 * Bloc « Copier pour Discord » : format de l'export du simulateur (audit 03 §8.5), sans pictogramme
 * staff : journal intégral et notes du MJ. La projection joueur reste filtrée par le moteur.
 */
export function exportDiscord(s: CombatState, maintenant = Date.now()): string {
	const joueurs = s.fighters.filter((f) => f.type === 'player');
	const adversaires = s.fighters.filter((f) => f.type === 'beast');
	const rounds = s.round;
	const lignes: string[] = [];
	lignes.push(`## ${s.name || 'La Table'}`);
	lignes.push(`*${jourLong(s.startedAt || maintenant)} · ${rounds} round${rounds > 1 ? 's' : ''}*`);
	lignes.push('---', '');
	if (joueurs.length) lignes.push(`**Élèves du Serment :** ${joueurs.map((f) => `${f.name} (niv. ${f.level})`).join(' · ')}`);
	if (adversaires.length) lignes.push(`**Adversaires :** ${adversaires.map((f) => `${f.name}${ko(f) ? ' (KO)' : ''}`).join(' · ')}`);
	lignes.push('');
	for (const e of s.log) {
		const texte = e.text;
		if (e.kind === 'round') lignes.push('', `**${texte}**`, '');
		else lignes.push(`· ${texte}`);
	}
	lignes.push('', '**État final :**');
	for (const f of s.fighters) {
		lignes.push(`**${f.name}** · PV \`${f.pvCur}/${f.pvMax}\` EP \`${f.epCur}/${f.epMax}\`${f.emMax ? ` EM \`${f.emCur}/${f.emMax}\`` : ''}${ko(f) ? ' · **KO**' : ''}`);
	}
	const joueursDebout = joueurs.some((f) => !f.isSummon && !ko(f));
	const adversairesDebout = adversaires.some((f) => !ko(f));
	if (s.startedAt !== null && (!joueursDebout || !adversairesDebout)) {
		lignes.push('', joueursDebout ? '**Résultat : victoire**' : '**Résultat : défaite**');
	}
	if (s.notes) lignes.push('', '**Notes du MJ :**', s.notes);
	lignes.push('', '*— Nuages Polaires*');
	return lignes.join('\n');
}
