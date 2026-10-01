// Journal du staff : ce que les MJ et les administrateurs ont fait, en clair (04-architecture §3.10).
// `appendStaffLog` s'appelle dans la MÊME transaction que la mutation.
import type { Db, Tx } from '$lib/server/db';
import { staffLog } from '$lib/server/db/schema';
import type { Actor } from '$lib/server/permissions';

export interface StaffLogInput {
	/** Action nommée (audit 05 §3.9 : `liaison`, `deliaison`, `mdp_reset`, `event_cree`…). */
	action: string;
	/** Phrase lisible : « Compte 'Ashaii' lié au personnage 'Alice' ». */
	detail: string;
	actor: Actor | null;
	/** Cible lisible : « Alice (Duelliste) ». */
	target?: string;
}

export async function appendStaffLog(db: Db | Tx, input: StaffLogInput): Promise<void> {
	await db.insert(staffLog).values({
		action: input.action,
		detail: input.detail,
		actorAccountId: input.actor?.accountId ?? null,
		actorName: input.actor?.pseudo ?? '',
		target: input.target ?? ''
	});
}
