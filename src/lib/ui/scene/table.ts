// Ce que dit la Table, en une phrase (03-vision §5.3, §5.9). Une seule source pour la Table vue par
// un joueur (`/carnet/table/[id]`) et la seconde ligne du feuillet (`/carnet/scene`) : au même
// instant, les deux pages écrivent la même chose.

/** L'état minimal d'une Table : actif, round, phase. */
export interface EtatTable {
	/** La Table a commencé (la projection le dit ; le feuillet le lit sur `status === 'en_cours'`). */
	active: boolean;
	round: number;
	phase: string;
}

/** La Table n'a pas encore commencé : ni active, ni aucun round joué. */
export function enPreparation(t: EtatTable): boolean {
	return !t.active && t.round === 0;
}

/** « en préparation », « déclarations », « résolution », « entre deux rounds ». */
export function phaseLibelle(t: EtatTable): string {
	if (enPreparation(t)) return 'en préparation';
	if (t.phase === 'declaration') return 'déclarations';
	if (t.phase === 'resolution') return 'résolution';
	return 'entre deux rounds';
}

/**
 * La consigne de la Table pour ce joueur. `attendu` : nom de celui dont on attend la déclaration
 * (`null` : c'est toi, ou personne de désigné).
 */
export function consigne(t: EtatTable, attendu: string | null = null): string {
	if (enPreparation(t)) return 'La Table se prépare.';
	if (t.phase === 'resolution') return 'Le MJ résout.';
	if (t.phase === 'declaration') {
		return attendu ? `Le MJ attend la déclaration de ${attendu}.` : 'Le MJ attend ta déclaration sur Discord.';
	}
	return 'Le MJ prépare le round suivant.';
}

/** Seconde ligne du feuillet : « Round 3 · déclarations », « Le MJ résout. », « La Table se prépare. ». */
export function ligneFeuillet(t: EtatTable): string {
	if (enPreparation(t)) return 'La Table se prépare.';
	if (t.phase === 'resolution') return 'Le MJ résout.';
	return `Round ${t.round} · ${phaseLibelle(t)}`;
}
