// Réglages et données (06-contrats §B.8 ; 03-vision §5.11 « Données », §12.6 ; audit 08 §4.6, §6.3) :
// schémas Zod d'entrée et vues. Types purs, importables côté client.
import { z } from 'zod';

/** Mention exacte de l'export (03-vision §5.11). */
export const EXPORT_NOTICE = "Ce n'est pas une sauvegarde complète du site.";

/**
 * Clés de réglage saisies par un administrateur (04 §3.12 ; mêmes clés que le semis de la base) :
 * lien d'invitation du colophon, salon par défaut, texte de contact.
 */
export const SETTING_KEYS = [
	'discord_invite_url',
	'discord_default_channel_url',
	'contact_text'
] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

export const SETTING_VALUE_MAX = 2000;

/** Invitation Discord : `https://discord.gg/…`, `https://discord.com/invite/…` (ou `discordapp.com`). */
export const DISCORD_INVITE_PATTERN =
	/^https:\/\/(discord\.gg\/[A-Za-z0-9-]+|((ptb|canary)\.)?(discord|discordapp)\.com\/invite\/[A-Za-z0-9-]+)\/?$/i;

export const setSettingSchema = z.object({
	key: z.enum(SETTING_KEYS, { error: 'Réglage inconnu.' }),
	value: z
		.string()
		.max(SETTING_VALUE_MAX, `Un réglage tient en ${SETTING_VALUE_MAX} caractères.`)
		.optional()
		.transform((v) => (v ?? '').replace(/\r\n/g, '\n').trim())
});

export type SetSettingInput = z.input<typeof setSettingSchema>;

// ---------------------------------------------------------------------------
// Vues
// ---------------------------------------------------------------------------

export interface PublicSettingsView {
	/** Lien d'invitation du colophon ; `null` ⇒ le lien est absent (03-vision §5.1). */
	discordInvite: string | null;
}

export interface SettingView {
	key: SettingKey;
	value: string;
	updatedAt: string;
}

/** Export JSON partiel (Registre › Données). Jamais de mot de passe, d'empreinte, de jeton ni de secret. */
export interface ExportDataView {
	format: 'nuages-polaires-export-partiel';
	version: 3;
	notice: typeof EXPORT_NOTICE;
	exportedAt: string;
	/** Ce que l'export ne contient pas, en toutes lettres. */
	excluded: string[];
	accounts: {
		id: string;
		pseudo: string;
		role: string;
		characterId: string | null;
		discordLinked: boolean;
		lastSeenAt: string | null;
		createdAt: string;
	}[];
	characters: Record<string, unknown>[];
	oaths: Record<string, unknown>[];
	beasts: Record<string, unknown>[];
	zones: Record<string, unknown>[];
	events: Record<string, unknown>[];
	settings: { key: string; value: string }[];
}

export interface MigrationTableStatus {
	table: string;
	count: number;
	lastMigratedAt: string | null;
}

export interface MigrationStatusView {
	/** Aucune ligne : la base n'a jamais reçu de migration héritée. */
	migrated: boolean;
	total: number;
	lastMigratedAt: string | null;
	transformerVersions: number[];
	tables: MigrationTableStatus[];
	/** Fiches reprises (« 12 fiches reprises sans rature »). */
	charactersMigrated: number;
}

export interface DiagnosticsView {
	dbReachable: boolean;
	/** Durée de la vérification de la base, en millisecondes (`null` si injoignable). */
	dbLatencyMs: number | null;
	/** Variables d'environnement : présence seulement, jamais la valeur. */
	env: {
		databaseConfigured: boolean;
		pgliteDriver: boolean;
		sessionSecretConfigured: boolean;
		siteUrlConfigured: boolean;
		adminBootstrapConfigured: boolean;
		adminRecoveryEnabled: boolean;
		discordLoginConfigured: boolean;
		discordWebhookConfigured: boolean;
		production: boolean;
	};
	version: string;
	at: string;
}
