// Registre › Données (03-vision §5.11, §12.6) : export JSON partiel (avec la mention exacte), état de
// la migration héritée, diagnostics sûrs (présence des variables, jamais leur valeur) et réglages
// saisis par un administrateur (lien d'invitation du colophon, salon par défaut).
import { requireCapability } from '$lib/server/guards';
import { action } from '$lib/server/actions';
import { EXPORT_EXCLUDED, diagnostics, exportData, migrationStatus } from '$lib/server/domain/admin';
import { listSettings, setSetting } from '$lib/server/domain/settings';
import type { SettingKey } from '$lib/schemas/admin';
import type { Actions, PageServerLoad } from './$types';

const texte = (v: unknown): string => (typeof v === 'string' ? v : '');

export const load: PageServerLoad = async (event) => {
	const actor = requireCapability(event, 'admin.data');
	const db = event.locals.db;
	const migration = await migrationStatus(db, actor);
	const diag = await diagnostics(db, actor);
	const reglages = await listSettings(db, actor);
	return { migration, diag, reglages, exclus: [...EXPORT_EXCLUDED], releve: new Date().toISOString() };
};

export const actions: Actions = {
	exporter: action(async (event) => {
		const donnees = await exportData(event.locals.db, event.locals.actor);
		const jour = donnees.exportedAt.slice(0, 10);
		// Le fichier part une fois vers la page qui l'a demandé ; il n'est gardé nulle part ailleurs.
		return {
			fichier: { nom: `nuages-polaires-export-${jour}.json`, contenu: JSON.stringify(donnees, null, 2), at: donnees.exportedAt }
		};
	}),
	reglage: action(async (event, data) => {
		const r = await setSetting(event.locals.db, event.locals.actor, {
			key: texte(data.key) as SettingKey,
			value: texte(data.value)
		});
		return { reglage: { key: r.key, at: r.updatedAt } };
	})
};
