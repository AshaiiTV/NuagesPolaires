// Registre › Ce qui attend (03-vision §5.11) : des attentes actionnables à la place des métriques.
// Liaisons en trois gestes (un compte, un personnage, « Lier »), réinitialisations non achevées.
import { requireCapability } from '$lib/server/guards';
import { action, toRevision } from '$lib/server/actions';
import { NpError } from '$lib/server/http';
import { linkCharacter, listPending } from '$lib/server/domain/accounts';
import { migrationStatus } from '$lib/server/domain/admin';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const actor = requireCapability(event, 'admin.accounts');
	const pending = await listPending(event.locals.db, actor);
	const { anomalies } = await migrationStatus(event.locals.db, actor);
	return { pending, anomalies, releve: new Date().toISOString() };
};

export const actions: Actions = {
	lier: action(async (event, data) => {
		const accountId = typeof data.accountId === 'string' ? data.accountId : '';
		const characterId = typeof data.characterId === 'string' ? data.characterId : '';
		if (!accountId || !characterId) {
			throw new NpError('INVALID', 'Rien n’est lié : choisis un compte puis un personnage.', 400);
		}
		// Chaque compte en attente porte sa propre version attendue (champ caché `revision.<id>`).
		const expectedRevision = toRevision(data[`revision.${accountId}`]) as number | undefined;
		const compte = await linkCharacter(event.locals.db, event.locals.actor, {
			accountId,
			characterId,
			expectedRevision: expectedRevision as number
		});
		return {
			lie: {
				id: compte.id,
				pseudo: compte.pseudo,
				personnage: compte.characterName ?? '',
				par: event.locals.actor?.pseudo ?? '',
				at: new Date().toISOString()
			}
		};
	})
};
