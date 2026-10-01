// Erreurs typées du serveur (04-architecture §10 : `throw new NpError('EVENT_FULL', 'Événement complet.', 409)`).
// Les form actions traduisent une NpError en `fail(status, { code, message })` ; les endpoints api/ en JSON.

/** Message officiel du conflit de version (04-architecture §6). */
export const VERSION_CONFLICT_MESSAGE =
	'Ces données ont été modifiées par une autre session. Recharge-les avant de réessayer.';

/** Message officiel quand `expectedRevision` manque (04-architecture §6, statut 428). */
export const VERSION_REQUIRED_MESSAGE =
	'La version attendue de la ressource est requise pour cette modification.';

export class NpError extends Error {
	readonly code: string;
	readonly status: number;

	constructor(code: string, message: string, status = 400) {
		super(message);
		this.name = 'NpError';
		this.code = code;
		this.status = status;
	}

	/** 428 VERSION_REQUIRED : mutation reçue sans `expectedRevision` (04-architecture §6). */
	static versionRequired(): NpError {
		return new NpError('VERSION_REQUIRED', VERSION_REQUIRED_MESSAGE, 428);
	}

	/** 409 VERSION_CONFLICT : `UPDATE … WHERE revision = $n` n'a touché aucune ligne (04-architecture §6). */
	static versionConflict(): NpError {
		return new NpError('VERSION_CONFLICT', VERSION_CONFLICT_MESSAGE, 409);
	}

	/** 403 FORBIDDEN : capacité absente pour le rôle (04-architecture §5). */
	static forbidden(message = 'Action non autorisée.'): NpError {
		return new NpError('FORBIDDEN', message, 403);
	}

	/** 404 NOT_FOUND : ressource absente ou invisible pour le rôle. */
	static notFound(message = 'Ressource introuvable.'): NpError {
		return new NpError('NOT_FOUND', message, 404);
	}

	/** 401 UNAUTHENTICATED : aucune session valide. */
	static unauthenticated(message = 'Connexion requise.'): NpError {
		return new NpError('UNAUTHENTICATED', message, 401);
	}

	/** Forme sérialisable pour `fail()` ou une réponse JSON. */
	toJSON(): { code: string; message: string; status: number } {
		return { code: this.code, message: this.message, status: this.status };
	}
}

export function isNpError(e: unknown): e is NpError {
	return (
		e instanceof NpError ||
		(typeof e === 'object' &&
			e !== null &&
			(e as { name?: unknown }).name === 'NpError' &&
			typeof (e as { code?: unknown }).code === 'string' &&
			typeof (e as { status?: unknown }).status === 'number')
	);
}

/**
 * Convertit une erreur quelconque en `{ status, code, message }` sans divulguer les détails internes :
 * une erreur inattendue devient un 500 générique.
 */
export function toErrorPayload(e: unknown): { status: number; code: string; message: string } {
	if (isNpError(e)) return { status: e.status, code: e.code, message: e.message };
	return { status: 500, code: 'INTERNAL', message: 'Une erreur inattendue est survenue.' };
}
