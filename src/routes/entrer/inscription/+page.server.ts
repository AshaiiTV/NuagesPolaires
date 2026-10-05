// Inscription (03-vision §4 « L'inscription passe toujours par le règlement » ; P6 ; 06-contrats §C).
// Étape 1 : le règlement, puis « J'accepte — Continuer ». Étape 2 (?etape=compte&reglement=accepte) :
// pseudo, mot de passe, confirmation ; l'acceptation est transmise à l'action (acceptRules), et le
// domaine la vérifie encore. Après l'inscription, le carnet s'ouvre en attente de liaison.
import { redirect } from '@sveltejs/kit';
import { getContent, renderMarkdown } from '$lib/content';
import { action } from '$lib/server/actions';
import { register } from '$lib/server/domain/accounts';
import { setSessionCookie } from '$lib/server/auth/session';
import { redirectIfConnected } from '$lib/server/guards';
import { NpError } from '$lib/server/http';
import {
	MIN_PASSWORD_LENGTH,
	PASSWORD_TOO_SHORT_MESSAGE,
	PSEUDO_INVALID_MESSAGE,
	PSEUDO_RE
} from '$lib/schemas/auth';
import { preparer } from '../../univers/lecture';
import type { Actions, PageServerLoad } from './$types';

/** Refus de la confirmation : propre à ce formulaire (le domaine ne reçoit qu'un mot de passe). */
const CONFIRMATION_MESSAGE = 'Les deux mots de passe ne sont pas les mêmes.';

export const load: PageServerLoad = async (event) => {
	redirectIfConnected(event);
	const { searchParams } = event.url;
	if (searchParams.get('etape') === 'compte') {
		// L'étape du compte ne s'ouvre qu'après l'acceptation du règlement.
		if (searchParams.get('reglement') !== 'accepte') redirect(303, '/entrer/inscription');
		return { etape: 'compte' as const, reglement: null };
	}
	const content = getContent('reglement');
	const lecture = preparer(renderMarkdown(content.body), content.title, content.resume);
	return {
		etape: 'reglement' as const,
		reglement: {
			titre: content.title,
			resume: content.resume,
			html: lecture.html,
			entrees: lecture.entrees
		}
	};
};

export const actions: Actions = {
	inscrire: action(async (event, data) => {
		const pseudo = String(data.pseudo ?? '').trim();
		const password = String(data.password ?? '');
		// Même ordre que la lecture du formulaire : pseudo, mot de passe, confirmation.
		if (!PSEUDO_RE.test(pseudo)) throw new NpError('INVALID_PSEUDO', PSEUDO_INVALID_MESSAGE, 400);
		if (password.length < MIN_PASSWORD_LENGTH)
			throw new NpError('INVALID_PASSWORD', PASSWORD_TOO_SHORT_MESSAGE, 400);
		if (password !== String(data.passwordConfirm ?? ''))
			throw new NpError('MISMATCH', CONFIRMATION_MESSAGE, 400);
		const result = await register(event.locals.db, {
			pseudo,
			password,
			acceptRules: String(data.acceptRules ?? ''),
			ip: event.getClientAddress(),
			userAgent: event.request.headers.get('user-agent') ?? ''
		});
		setSessionCookie(event.cookies, result.sessionToken, new Date(result.expiresAt));
		// Le carnet s'ouvre sur Dernières pages, à l'état « en attente de liaison ».
		redirect(303, '/carnet');
	})
};
