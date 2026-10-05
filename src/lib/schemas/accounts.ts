// Schémas d'entrée et vues du Registre : comptes, liaisons, rôles, thèmes, journaux
// (06-contrats §B.1, §B.8 ; 03-vision §5.11). Types purs, importables côté client.
import { z } from 'zod';
import { newPasswordSchema } from './auth';

export const ROLE_VALUES = ['joueur', 'mj', 'designer', 'admin'] as const;
export type RoleView = (typeof ROLE_VALUES)[number];

const bool = z.preprocess(
	(v) => v === true || v === 'true' || v === 'on' || v === '1',
	z.boolean()
);

/** Identifiant de compte ou de personnage (audit 05 §3.1 : `^[A-Za-z0-9_:-]{1,128}$`). */
export const idSchema = z
	.string({ error: 'Identifiant invalide.' })
	.trim()
	.regex(/^[A-Za-z0-9_:-]{1,128}$/, 'Identifiant invalide.');

/** `expectedRevision` : entier ≥ 1 (son absence est traitée avant, en 428). */
export const revisionSchema = z.number({ error: 'Version attendue invalide.' }).int().min(1);

export const roleSchema = z.enum(ROLE_VALUES, { error: 'Rôle invalide.' });

export const linkCharacterInput = z.object({
	accountId: idSchema,
	characterId: idSchema,
	expectedRevision: revisionSchema
});
export type LinkCharacterInput = z.input<typeof linkCharacterInput>;

export const unlinkCharacterInput = z.object({
	accountId: idSchema,
	expectedRevision: revisionSchema
});
export type UnlinkCharacterInput = z.input<typeof unlinkCharacterInput>;

export const setRoleInput = z.object({
	accountId: idSchema,
	role: roleSchema,
	expectedRevision: revisionSchema
});
export type SetRoleInput = z.input<typeof setRoleInput>;

export const adminResetPasswordInput = z.object({ accountId: idSchema });
export type AdminResetPasswordInput = z.input<typeof adminResetPasswordInput>;

export const adminSetPasswordInput = z.object({ accountId: idSchema, password: newPasswordSchema });
export type AdminSetPasswordInput = z.input<typeof adminSetPasswordInput>;

export const strikeAccountInput = z.object({
	accountId: idSchema,
	typedPseudo: z
		.string({ error: 'Saisis le pseudo du compte.' })
		.trim()
		.min(1, 'Saisis le pseudo du compte.')
		.max(64)
});
export type StrikeAccountInput = z.input<typeof strikeAccountInput>;

// ---------------------------------------------------------------------------
// Thèmes
// ---------------------------------------------------------------------------

export const themeIdSchema = z
	.string({ error: 'Thème invalide.' })
	.trim()
	.min(1, 'Thème invalide.')
	.max(64, 'Thème invalide.');

export const THEME_TOKEN_KEYS = [
	'--bureau',
	'--page',
	'--page-2',
	'--reglure',
	'--encre',
	'--encre-2',
	'--encre-grise',
	'--ruban'
] as const;

const hexColor = z
	.string()
	.trim()
	.regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Couleur hexadécimale invalide.');

export const themeTokensSchema = z.object({
	'--bureau': hexColor,
	'--page': hexColor,
	'--page-2': hexColor,
	'--reglure': hexColor,
	'--encre': hexColor,
	'--encre-2': hexColor,
	'--encre-grise': hexColor,
	'--ruban': hexColor
});

export const selectThemeInput = z.object({ themeId: themeIdSchema });
export const accountThemeInput = z.object({ accountId: idSchema, themeId: themeIdSchema });
export const themeOnlyInput = z.object({ themeId: themeIdSchema });
export const themeVisibilityInput = z.object({ themeId: themeIdSchema, visible: bool });
export const themeAutoGrantInput = z.object({ themeId: themeIdSchema, enabled: bool });
export const createThemeInput = z.object({
	id: z
		.string({ error: 'Identifiant de thème invalide.' })
		.trim()
		.regex(
			/^[a-z0-9][a-z0-9-]{1,39}$/,
			'Identifiant de thème invalide : minuscules, chiffres et tirets.'
		),
	name: z.string({ error: 'Nom requis.' }).trim().min(1, 'Nom requis.').max(60),
	description: z.string().trim().max(300).optional().default(''),
	tokens: themeTokensSchema
});
export type SelectThemeInput = z.input<typeof selectThemeInput>;
export type AccountThemeInput = z.input<typeof accountThemeInput>;
export type ThemeOnlyInput = z.input<typeof themeOnlyInput>;
export type ThemeVisibilityInput = z.input<typeof themeVisibilityInput>;
export type ThemeAutoGrantInput = z.input<typeof themeAutoGrantInput>;
export type CreateThemeInput = z.input<typeof createThemeInput>;

// ---------------------------------------------------------------------------
// Journaux
// ---------------------------------------------------------------------------

const pageSchema = z.coerce.number().int().min(1).max(100_000).optional().default(1);
const dateFilter = z
	.string()
	.trim()
	.regex(/^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2})?)?$/, 'Date invalide.')
	.optional()
	.or(z.literal('').transform(() => undefined));

export const auditFiltersInput = z.object({
	/** Pseudo de l'acteur (recherche insensible à la casse). */
	actor: z.string().trim().max(64).optional(),
	/** Action exacte (`login_success`, `admin_set_role`…). */
	action: z.string().trim().max(64).optional(),
	/** Bornes : `AAAA-MM-JJ` (jour entier) ou date ISO complète. */
	from: dateFilter,
	to: dateFilter,
	page: pageSchema
});
export type AuditFiltersInput = z.input<typeof auditFiltersInput>;

export const staffLogPageInput = z.object({ page: pageSchema });
export type StaffLogPageInput = z.input<typeof staffLogPageInput>;

export const archiveStaffLogInput = z.object({ label: z.string().trim().max(120).optional() });
export type ArchiveStaffLogInput = z.input<typeof archiveStaffLogInput>;

// ---------------------------------------------------------------------------
// Vues (06-contrats §B.1, §B.8) — aucune ne porte de secret (ni hash, ni jeton, ni secret de reset)
// ---------------------------------------------------------------------------

export interface AccountView {
	id: string;
	pseudo: string;
	role: RoleView;
	characterId: string | null;
	characterName: string | null;
	lastSeenAt: string | null;
	createdAt: string;
	forcePasswordReset: boolean;
	resetExpiresAt: string | null;
	discordLinked: boolean;
	revision: number;
}

export interface UnlinkedCharacterView {
	id: string;
	name: string;
	oathName: string;
}

export interface PendingView {
	pendingAccounts: AccountView[];
	unlinkedCharacters: UnlinkedCharacterView[];
	openResets: AccountView[];
}

/** Mon compte (`/compte`) : ce que le titulaire voit de son propre compte. */
export interface OwnAccountView {
	id: string;
	pseudo: string;
	role: RoleView;
	characterId: string | null;
	characterName: string | null;
	createdAt: string;
	lastSeenAt: string | null;
	selectedTheme: string;
	discordLinked: boolean;
	discordUsername: string | null;
	revision: number;
}

export interface AdminResetView {
	/** Secret affiché UNE seule fois, à transmettre au titulaire. */
	temporaryPassword: string;
	expiresAt: string;
}

export type ThemeTokensView = Record<(typeof THEME_TOKEN_KEYS)[number], string>;

export interface ThemeView {
	id: string;
	name: string;
	description: string;
	tone: 'sombre' | 'clair';
	tokens: ThemeTokensView;
	/** Le compte peut l'équiper (toujours accordé, don, distribution automatique, rôle staff). */
	owned: boolean;
	/** Thème actuellement équipé. */
	active: boolean;
	/** Bloqué par un administrateur pour ce compte. */
	blocked: boolean;
	visible: boolean;
	isBuiltin: boolean;
	category: string;
	rarity: string;
	isEvent: boolean;
	availableUntil: string | null;
	autoGrantAll: boolean;
	revision: number;
}

export interface AuditRowView {
	id: number;
	at: string;
	source: string;
	action: string;
	actorPseudo: string;
	actorRole: string;
	ip: string;
	origin: string;
	userAgent: string;
	details: Record<string, unknown>;
}

export interface AuditPageView {
	rows: AuditRowView[];
	page: number;
	pages: number;
}

export interface StaffLogRowView {
	id: number;
	at: string;
	action: string;
	detail: string;
	actorName: string;
	target: string;
}

export interface StaffLogPageView {
	rows: StaffLogRowView[];
	page: number;
	pages: number;
}
