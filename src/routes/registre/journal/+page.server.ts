// Registre › Journal d'audit (03-vision §5.11) : une ligne par action, filtres acteur · action · dates
// en paramètres d'URL, 50 par page, jamais éditable. `?vue=staff` : le journal du staff, présenté de la
// même façon. `?format=txt` renvoie vers l'export texte (mêmes filtres).
import { redirect } from '@sveltejs/kit';
import { requireCapability } from '$lib/server/guards';
import { listAudit } from '$lib/server/domain/audit';
import { listStaffLog } from '$lib/server/domain/staff-log';
import { isNpError } from '$lib/server/http';
import type { PageServerLoad } from './$types';

const JOUR = /^\d{4}-\d{2}-\d{2}$/;

export const load: PageServerLoad = async (event) => {
	const actor = requireCapability(event, 'admin.audit');
	const params = event.url.searchParams;
	const vue: 'audit' | 'staff' = params.get('vue') === 'staff' ? 'staff' : 'audit';
	const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);

	const filtres = {
		acteur: (params.get('acteur') ?? '').trim().slice(0, 64),
		action: (params.get('action') ?? '').trim().slice(0, 64),
		du: JOUR.test(params.get('du') ?? '') ? (params.get('du') as string) : '',
		au: JOUR.test(params.get('au') ?? '') ? (params.get('au') as string) : ''
	};

	if (params.get('format') === 'txt') {
		const q = new URLSearchParams();
		for (const [k, v] of Object.entries(filtres)) if (v) q.set(k, v);
		const s = q.toString();
		redirect(303, '/registre/journal/texte' + (s ? '?' + s : ''));
	}

	if (vue === 'staff') {
		const staff = await listStaffLog(event.locals.db, actor, { page });
		return { vue, filtres, audit: null, staff, releve: new Date().toISOString() };
	}

	try {
		const audit = await listAudit(event.locals.db, actor, {
			actor: filtres.acteur || undefined,
			action: filtres.action || undefined,
			from: filtres.du || undefined,
			to: filtres.au || undefined,
			page
		});
		return { vue, filtres, audit, staff: null, releve: new Date().toISOString() };
	} catch (e) {
		// Un filtre refusé par le serveur (date impossible) : la page reste lisible et dit pourquoi.
		if (isNpError(e) && e.status === 400) {
			return {
				vue,
				filtres,
				audit: { rows: [], page: 1, pages: 1 },
				staff: null,
				refus: e.message,
				releve: new Date().toISOString()
			};
		}
		throw e;
	}
};
