// Schémas d'entrée de l'authentification (06-contrats §B.1) — partagés client / serveur.
// Règles : audit 05 §3.1 (pseudo), 04-architecture §4 (mot de passe ≥ 8 pour un nouveau mot de
// passe ; les anciens de 4 caractères restent acceptés à la connexion).
import { z } from 'zod';

/** Regex de pseudo (audit 05 §3.1, legacy auth.js:194). */
export const PSEUDO_RE = /^[A-Za-z0-9_\-À-ÿ ]{2,32}$/;

/** Longueur minimale d'un NOUVEAU mot de passe (04 §4). */
export const MIN_PASSWORD_LENGTH = 8;
/** Longueur maximale d'un mot de passe (borne le coût du hachage). */
export const MAX_PASSWORD_LENGTH = 256;

export const PSEUDO_INVALID_MESSAGE =
	'Pseudo invalide : 2 à 32 caractères (lettres, chiffres, espaces, « _ » ou « - »).';
export const PASSWORD_TOO_SHORT_MESSAGE = 'Le mot de passe doit faire au moins 8 caractères.';
export const RULES_REQUIRED_MESSAGE = 'Accepte le règlement pour continuer.';

/** Case à cocher de formulaire : `on`, `true`, `1` ou `true` booléen. */
export const checkbox = z.preprocess(
	(v) => v === true || v === 'true' || v === 'on' || v === '1',
	z.boolean()
);

export const pseudoSchema = z.string().trim().regex(PSEUDO_RE, PSEUDO_INVALID_MESSAGE);

export const newPasswordSchema = z
	.string({ error: PASSWORD_TOO_SHORT_MESSAGE })
	.min(MIN_PASSWORD_LENGTH, PASSWORD_TOO_SHORT_MESSAGE)
	.max(MAX_PASSWORD_LENGTH, 'Le mot de passe est trop long (256 caractères au plus).');

const requestFields = {
	ip: z.string().max(128).optional().nullable(),
	userAgent: z.string().max(1024).optional().nullable()
};

export const registerInput = z.object({
	pseudo: pseudoSchema,
	password: newPasswordSchema,
	acceptRules: z.preprocess(
		(v) => v === true || v === 'true' || v === 'on' || v === '1',
		z.literal(true, { error: RULES_REQUIRED_MESSAGE })
	),
	...requestFields
});
export type RegisterInput = z.input<typeof registerInput>;

export const loginInput = z.object({
	pseudo: z.string({ error: 'Champs manquants.' }).trim().min(1, 'Champs manquants.').max(64),
	password: z
		.string({ error: 'Champs manquants.' })
		.min(1, 'Champs manquants.')
		.max(MAX_PASSWORD_LENGTH),
	...requestFields
});
export type LoginInput = z.input<typeof loginInput>;

export const changeOwnPasswordInput = z.object({
	current: z
		.string({ error: 'Mot de passe actuel requis.' })
		.min(1, 'Mot de passe actuel requis.')
		.max(MAX_PASSWORD_LENGTH),
	next: newPasswordSchema
});
export type ChangeOwnPasswordInput = z.input<typeof changeOwnPasswordInput>;

export const completeForcedResetInput = z.object({ next: newPasswordSchema });
export type CompleteForcedResetInput = z.input<typeof completeForcedResetInput>;

export const deleteOwnAccountInput = z.object({
	password: z
		.string({ error: 'Mot de passe requis.' })
		.min(1, 'Mot de passe requis.')
		.max(MAX_PASSWORD_LENGTH)
});
export type DeleteOwnAccountInput = z.input<typeof deleteOwnAccountInput>;

export const discordCallbackInput = z.object({
	code: z.string().min(1).max(512),
	state: z.string().min(1).max(256)
});
export type DiscordCallbackInput = z.input<typeof discordCallbackInput>;

// ---------------------------------------------------------------------------
// Vues
// ---------------------------------------------------------------------------

export type SessionScopeView = 'full' | 'reset';

/** Résultat d'une connexion : le jeton va dans le cookie `np_session`, jamais dans une page. */
export interface LoginResultView {
	sessionToken: string;
	scope: SessionScopeView;
	/** ISO 8601 : échéance de la session (Max-Age du cookie). */
	expiresAt: string;
	/** Mot de passe hérité de moins de 8 caractères : inviter à le changer (04 §4). */
	weakPassword: boolean;
}

/** Résultat d'une écriture qui ouvre une nouvelle session (inscription, changement, finalisation). */
export interface SessionResultView {
	sessionToken: string;
	expiresAt: string;
}
