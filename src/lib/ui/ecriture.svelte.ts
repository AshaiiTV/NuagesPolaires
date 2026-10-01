// L'encre sèche — assistant commun à tous les formulaires du carnet.
//
//   const ecriture = creerEcriture();
//   <form method="POST" action="?/noter" use:enhance={ecriture.enhance()}>…</form>
//   <Encre etat={ecriture.etat}>…</Encre>   {#if ecriture.note}<NoteDeMarge ton={ecriture.note.ton}>…
//
// Règles (03-vision.md §2, §6.1, §8) : aucune écriture n'est annoncée réussie avant la réponse du
// serveur ; pas de message de succès, une confirmation est une heure ; un refus garde la saisie et dit
// ce qui n'a pas été fait ; un conflit de version porte la phrase officielle.
import type { SubmitFunction } from '@sveltejs/kit';
import { applyAction } from '$app/forms';
import { invalidateAll } from '$app/navigation';
import type { EtatEncre } from './Encre.svelte';

export const PHRASE_ATTENTE = 'L’encre sèche…';
export const PHRASE_REFUS = 'L’encre n’a pas pris. Ta page est gardée ici ; réessaie quand tu veux.';
export const PHRASE_CONFLIT = 'Quelqu’un a écrit sur cette page entre-temps. Relis avant d’écrire par-dessus.';
export const PHRASE_FERME = 'Le carnet s’est refermé. Rouvre-le en te reconnectant.';

export interface NoteEcriture {
	ton: 'attente' | 'fait' | 'refus';
	texte: string;
	/** Code d'erreur métier renvoyé par le serveur (VERSION_CONFLICT, EVENT_FULL…). */
	code?: string;
}

/** Heure de Paris, format du carnet : « 21:14 ». */
export function heure(date: Date = new Date()): string {
	return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).format(date);
}

interface OptionsEcriture {
	/** Libellé de confirmation : « Noté », « Tamponné », « Rayé ». Suivi de l'heure. */
	verbe?: string;
	/** Appelé après une écriture prise (ex. vider le champ). */
	apres?: () => void;
	/** Ne pas recharger les données de la page après succès. */
	sansRechargement?: boolean;
}

export function creerEcriture() {
	let etat = $state<EtatEncre>('prise');
	let note = $state<NoteEcriture | null>(null);
	let enCours = $state(false);

	function enhance(options: OptionsEcriture = {}): SubmitFunction {
		return ({ cancel }) => {
			// Une seule écriture à la fois : les doubles clics ne partent pas.
			if (enCours) {
				cancel();
				return;
			}
			enCours = true;
			etat = 'humide';
			note = { ton: 'attente', texte: PHRASE_ATTENTE };

			return async ({ result }) => {
				enCours = false;
				if (result.type === 'success' || result.type === 'redirect') {
					etat = 'prise';
					note = { ton: 'fait', texte: `${options.verbe ?? 'Noté'} · ${heure()} — l’encre a pris.` };
					options.apres?.();
					if (result.type === 'redirect') {
						await applyAction(result);
						return;
					}
					if (!options.sansRechargement) await invalidateAll();
					await applyAction(result);
					return;
				}
				etat = 'refusee';
				if (result.type === 'failure') {
					const donnees = (result.data ?? {}) as { code?: string; message?: string };
					const conflit = result.status === 409 && donnees.code === 'VERSION_CONFLICT';
					const ferme = result.status === 401;
					note = {
						ton: 'refus',
						code: donnees.code,
						texte: conflit ? PHRASE_CONFLIT : ferme ? PHRASE_FERME : (donnees.message ?? PHRASE_REFUS)
					};
					// La saisie reste dans le formulaire : on n'applique pas de remise à zéro.
					await applyAction(result);
					return;
				}
				note = { ton: 'refus', texte: PHRASE_REFUS };
			};
		};
	}

	return {
		get etat() {
			return etat;
		},
		get note() {
			return note;
		},
		get enCours() {
			return enCours;
		},
		enhance,
		effacer() {
			note = null;
			etat = 'prise';
		}
	};
}
