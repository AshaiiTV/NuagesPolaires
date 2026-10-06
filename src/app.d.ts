// See https://svelte.dev/docs/kit/types#app.d.ts
// Ce que `hooks.server.ts` pose sur chaque requête (06-contrats §A ; 04-architecture §4, §10.1).
import type { Db } from '$lib/server/db';
import type { Account, Character } from '$lib/server/db/schema';
import type { Actor } from '$lib/server/permissions';
import type { CompteNav } from '$lib/ui/navigation';

declare global {
	namespace App {
		interface Error {
			message: string;
			code?: string;
		}
		interface Locals {
			/** Base de la requête (ouverte et fermée par le hook). */
			db: Db;
			/** Session lue depuis le cookie `np_session` ; `reset` = réinitialisation forcée en cours. */
			session: { id: string; scope: 'full' | 'reset' } | null;
			/** Compte de la session (ligne complète : ne jamais la renvoyer telle quelle à une page). */
			account: Account | null;
			/** Personnage relié (session pleine seulement). */
			character: Character | null;
			/** Acteur des fonctions de domaine ; `null` pour un visiteur ou une session `reset`. */
			actor: Actor | null;
			/** Ce que l'enveloppe sait du compte (navigation, ruban, cornes). */
			compteNav: CompteNav | null;
			/** Thème du compte (visiteur : `dark`). */
			theme: { id: string; ton: 'sombre' | 'clair' };
			/** Lien d'invitation Discord du colophon (réglage), ou `null`. */
			discordInvite: string | null;
		}
		// interface PageData {}
		interface PageState {
			feuillet?: import('./routes/carnet/scene/$types').PageData;
		}
		// interface Platform {}
	}
}

export {};
