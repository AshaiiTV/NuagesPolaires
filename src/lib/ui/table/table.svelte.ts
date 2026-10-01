// La Table du MJ — l'état du combat vit ici, côté client, piloté par les fonctions PURES du moteur
// (src/lib/game/combat). Rien n'est « enregistré » avant la réponse du serveur : chaque clôture de round
// et chaque « Sauvegarder » envoient l'état complet à l'action ?/sauver ; le relevé ne change qu'à la
// réponse ; un refus du moteur garde l'état et dit ce qui n'a pas été fait (03-vision §5.8, P5).
import {
	addFighter,
	addSummon,
	adjustResource,
	applyStatus,
	declareAction,
	editDeclaration,
	endCombat,
	getAbilityOptions,
	isCombatError,
	isFinished,
	moveFighterPosition,
	removeFighter,
	removeStatus,
	renameCombat,
	resolveRound,
	restoreEnergy,
	setInitiative,
	setNotes,
	startCombat,
	undoLastDeclaration,
	undoRound,
	type AbilityOption,
	type CombatState,
	type DeclareOptions,
	type ActionId,
	type ResourceKey,
	type StatusId,
	type SummonSpec
} from '$lib/game/combat';
import { assignDrop, rollDrop } from '$lib/game/combat/outcomes';
import { actionsLeft, actionsMax } from '$lib/game/combat/actions';
import { heure } from '$lib/ui/dates';
import { correctionDe, sansEmoji } from './texte';

export type NoteTable = { ton: 'fait' | 'refus' | 'attente' | 'info'; texte: string };
export type RaisonSauvegarde = 'manual' | 'round' | 'auto';

export class TableMJ {
	/** État du combat ; remplacé à chaque geste (les fonctions du moteur renvoient un nouvel état). */
	etat = $state.raw<CombatState>(null as unknown as CombatState);
	/** Révision sur laquelle l'état local est fondé (mise à jour par les seules réponses de nos écritures). */
	revision = $state(0);
	/** Dernière sauvegarde confirmée par le serveur (ISO). */
	releve = $state<string | null>(null);
	/** Premier changement non sauvegardé (ms), null si l'état est celui du relevé. */
	nonSauve = $state<number | null>(null);
	/** La dernière tentative de sauvegarde a échoué (réseau ou refus). */
	echec = $state(false);
	/** Raison de la sauvegarde à rejouer avec « Réessayer ». */
	raisonEnAttente = $state<RaisonSauvegarde>('manual');
	/** Round résolu dont la résolution reste ouverte (rature possible) jusqu'à « Clore le round ». */
	revue = $state<number | null>(null);
	/** Heure (ms) de la résolution ouverte, pour « Round 3 · résolu à 21:47. ». */
	revueA = $state<number | null>(null);
	/** Note de marge locale (refus du moteur, copie) ; une seule à la fois. */
	note = $state<NoteTable | null>(null);
	/** Compteur de gestes : permet de savoir si l'état a changé pendant qu'une sauvegarde partait. */
	private gestes = 0;
	private envoye = 0;

	constructor(
		initial: CombatState,
		revision: number,
		releve: string | null,
		private pseudo: string
	) {
		this.etat = initial;
		this.revision = revision;
		this.releve = releve;
	}

	// ── Lectures ────────────────────────────────────────────────────────────────────────────────
	get demarre() {
		return this.etat.startedAt !== null;
	}
	get termine() {
		return this.demarre && isFinished(this.etat);
	}
	get declarant(): string | null {
		const s = this.etat;
		if (!s.active || s.phase !== 'declaration' || this.revue !== null) return null;
		return s.order[s.turn] ?? null;
	}
	get peutResoudre() {
		return this.etat.active && this.etat.phase === 'resolution' && this.revue === null;
	}
	get peutAnnulerRound() {
		return this.etat.history.length > 0 && !this.etat.ended;
	}
	actionsMax(id: string) {
		return actionsMax(this.etat, id);
	}
	actionsRestantes(id: string) {
		return actionsLeft(this.etat, id);
	}
	capacites(id: string): AbilityOption[] {
		try {
			return getAbilityOptions(this.etat, id);
		} catch {
			return [];
		}
	}
	/** Signature d'un geste du MJ : motif · auteur · heure (chaque changement est daté et signé). */
	signature(motif: string) {
		return `${motif.trim()} · ${this.pseudo} · ${heure(new Date())}`;
	}

	// ── Écriture locale ──────────────────────────────────────────────────────────────────────────
	/**
	 * Applique un geste du moteur. Refus (CombatError) : l'état ne bouge pas, la note dit ce qui n'a
	 * pas été fait. `signer` ajoute motif · auteur · heure aux lignes de journal nouvelles.
	 */
	appliquer(geste: (s: CombatState) => CombatState, signer?: string): boolean {
		const avant = this.etat;
		try {
			let suivant = geste(avant);
			if (signer && suivant.log.length > avant.log.length) {
				const sig = this.signature(signer);
				suivant = {
					...suivant,
					log: suivant.log.map((e, i) =>
						i >= avant.log.length && !e.text.includes(' · ' + this.pseudo + ' · ') ? { ...e, text: `${e.text} — ${sig}` } : e
					)
				};
			}
			this.etat = suivant;
			this.gestes += 1;
			if (this.nonSauve === null) this.nonSauve = Date.now();
			if (this.note?.ton === 'refus' || this.note?.ton === 'info') this.note = null;
			return true;
		} catch (e) {
			this.note = { ton: 'refus', texte: isCombatError(e) ? sansEmoji(e.message) : 'Ce geste n’a pas pu s’écrire sur la Table.' };
			return false;
		}
	}

	renommer(nom: string) {
		if (nom.trim() && nom.trim() !== this.etat.name) this.appliquer((s) => renameCombat(s, nom));
	}
	noter(notes: string) {
		if (notes !== this.etat.notes) this.appliquer((s) => setNotes(s, notes));
	}
	demarrer() {
		return this.appliquer((s) => startCombat(s, Math.random, { now: Date.now() }));
	}
	initiative(id: string) {
		return this.appliquer((s) => setInitiative(s, id));
	}
	position(id: string, position: number, motif: string) {
		return this.appliquer((s) => moveFighterPosition(s, id, position), motif);
	}
	retirer(id: string, motif: string) {
		return this.appliquer((s) => removeFighter(s, id), motif);
	}
	declarer(id: string, action: ActionId, options: DeclareOptions = {}) {
		return this.appliquer((s) => declareAction(s, id, action, options));
	}
	passer(id: string) {
		return this.appliquer((s) => declareAction(s, id, 'passer'));
	}
	retirerDerniere(id: string) {
		return this.appliquer((s) => undoLastDeclaration(s, id));
	}
	reprendreDeclaration(id: string) {
		return this.appliquer((s) => editDeclaration(s, id));
	}
	resoudre() {
		const round = this.etat.round;
		const ok = this.appliquer((s) => resolveRound(s, Math.random));
		if (ok) {
			this.revue = round;
			this.revueA = Date.now();
		}
		return ok;
	}
	/** « Clore le round » : la résolution se referme (plus de rature) ; l'appelant sauvegarde. */
	clore() {
		this.revue = null;
		this.revueA = null;
	}
	annulerRound() {
		const ok = this.appliquer((s) => undoRound(s));
		if (ok) {
			this.revue = null;
			this.revueA = null;
		}
		return ok;
	}
	/** Ajustement d'une ressource : la nouvelle valeur, jamais un delta implicite. */
	ajuster(id: string, ressource: ResourceKey, nouvelle: number, motif: string) {
		const f = this.etat.fighters.find((x) => x.id === id);
		if (!f) return false;
		const ancienne = f[`${ressource}Cur`];
		const delta = Math.trunc(nouvelle) - ancienne;
		if (!delta) {
			this.note = { ton: 'info', texte: 'Valeur inchangée : rien n’a été noté.' };
			return false;
		}
		return this.appliquer((s) => adjustResource(s, id, ressource, delta, this.signature(motif)));
	}
	restaurer(id: string, motif: string) {
		return this.appliquer((s) => restoreEnergy(s, id), motif);
	}
	poserStatut(id: string, statut: StatusId, tours: number, motif: string) {
		return this.appliquer((s) => applyStatus(s, id, statut, tours), motif);
	}
	retirerStatut(id: string, statut: StatusId, motif: string) {
		return this.appliquer((s) => removeStatus(s, id, statut), motif);
	}
	invoquer(id: string, spec: SummonSpec, motif: string) {
		return this.appliquer((s) => addSummon(s, id, spec), motif);
	}
	/** Rature d'une ligne de résolution tant que le round est ouvert : la correction inverse est notée. */
	rayer(n: number, motif: string) {
		const e = this.etat.log.find((x) => x.n === n);
		const c = e ? correctionDe(e) : null;
		if (!e || !c || this.revue === null) return false;
		return this.appliquer((s) => adjustResource(s, c.cible, c.ressource, c.delta, this.signature(`rature de la ligne ${n} : ${motif}`)));
	}
	lancerD100(fighterId: string) {
		return this.appliquer((s) => rollDrop(s, fighterId, Math.random), 'D100 lancé');
	}
	attribuer(dropId: string, characterId: string) {
		return this.appliquer((s) => assignDrop(s, dropId, characterId), 'gemme attribuée');
	}
	/** Ajout de combattants préparé par le serveur (fiches et créatures relues) : remplace l'état. */
	remplacer(etat: CombatState, revision: number, releve: string | null) {
		this.etat = etat;
		this.revision = revision;
		this.releve = releve;
		this.nonSauve = null;
		this.echec = false;
		this.gestes += 1;
		this.envoye = this.gestes;
	}
	ajouterLocalement(input: Parameters<typeof addFighter>[1]) {
		return this.appliquer((s) => addFighter(s, input));
	}

	/** Proposition de conséquences (moteur) : XP par participation, PV plafonnés, statuts, drops attribués. */
	propositions(participation: Record<string, number>) {
		try {
			return endCombat({ ...this.etat, ended: false }, { participation, now: Date.now() }).outcomes;
		} catch {
			return [];
		}
	}

	// ── Sauvegarde ───────────────────────────────────────────────────────────────────────────────
	/** Instantané envoyé au serveur ; mémorise le geste couvert par cet envoi. */
	instantane(): string {
		this.envoye = this.gestes;
		return JSON.stringify(this.etat);
	}
	sauvee(revision: number, releve: string | null) {
		this.revision = revision;
		this.releve = releve ?? new Date().toISOString();
		this.echec = false;
		// Un geste fait pendant le vol de la sauvegarde reste non sauvegardé.
		if (this.gestes === this.envoye) this.nonSauve = null;
	}
	refusee(raison: RaisonSauvegarde) {
		this.echec = true;
		this.raisonEnAttente = raison;
		if (this.nonSauve === null) this.nonSauve = Date.now();
	}
	/** « Reprendre leur version » : l'état du serveur remplace le nôtre. */
	reprendre(etat: CombatState, revision: number, releve: string | null) {
		this.remplacer(etat, revision, releve);
		this.revue = null;
		this.revueA = null;
	}

	// ── Lecture de la ligne d'état ───────────────────────────────────────────────────────────────
	/** Combattants vivants dans l'ordre, et combien ont fini de déclarer ce round. */
	get compteDeclares(): { faits: number; vivants: number } {
		const s = this.etat;
		const vivants = s.order.filter((id) => (s.fighters.find((f) => f.id === id)?.pvCur ?? 0) > 0);
		if (!s.active) return { faits: 0, vivants: vivants.length };
		if (s.phase === 'resolution') return { faits: vivants.length, vivants: vivants.length };
		const faits = vivants.filter((id) => s.order.indexOf(id) < s.turn).length;
		return { faits, vivants: vivants.length };
	}
}
