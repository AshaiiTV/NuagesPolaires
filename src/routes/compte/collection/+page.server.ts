// Ma collection (03-vision §7 « Thèmes personnels » ; 06-contrats §C `/compte/collection`) : les
// thèmes possédés se portent, les autres thèmes visibles se montrent sans prix ni « débloquer » ;
// un thème masqué et non possédé n'est pas servi (filtré par `listThemes`).
import { action } from '$lib/server/actions';
import { listThemes, selectTheme } from '$lib/server/domain/accounts';
import { requireAccount } from '$lib/server/guards';
import { libelleTheme } from '$lib/ui/themes';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const actor = requireAccount(event);
	const themes = await listThemes(event.locals.db, actor);
	return {
		themes: themes
			.filter((t) => t.owned || t.visible || t.active)
			.map(libelleTheme)
			.map((t) => ({
				id: t.id,
				name: t.name,
				description: t.description,
				tone: t.tone,
				tokens: t.tokens,
				owned: t.owned,
				active: t.active,
				isBuiltin: t.isBuiltin,
				availableUntil: t.availableUntil
			}))
	};
};

export const actions: Actions = {
	theme: action(async (event, data) => {
		const actor = requireAccount(event);
		const choisi = await selectTheme(event.locals.db, actor, {
			themeId: String(data.themeId ?? '')
		});
		return { theme: choisi };
	})
};
