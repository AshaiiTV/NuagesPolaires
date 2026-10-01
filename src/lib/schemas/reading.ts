// Ruban, cornes et marque-page (06-contrats §B.4 ; 03-vision §5.2, §6.2) : schémas Zod d'entrée et
// vues. Types purs, importables côté client (aucun import de `$lib/server`).
// Ce fichier porte aussi les briques partagées par les schémas du paquet (révision attendue, lien
// Discord, booléens de formulaire), reprises par `events.ts` et `scenes.ts`.
import { z } from 'zod';
import type { EventRowView } from './events';

// ---------------------------------------------------------------------------
// Briques communes
// ---------------------------------------------------------------------------

/**
 * Lien Discord accepté (marque-page, salon d'une scène, salon d'un rendez-vous) : uniquement
 * `https://discord.com/…` ou `https://discordapp.com/…` (sous-domaines `ptb.` et `canary.` compris).
 */
export const DISCORD_URL_PATTERN = /^https:\/\/((ptb|canary)\.)?(discord|discordapp)\.com\/\S+$/i;

export const DISCORD_URL_MESSAGE =
	'Le lien doit être un lien Discord (https://discord.com/… ou https://discordapp.com/…).';

export function isDiscordUrl(value: string): boolean {
	return DISCORD_URL_PATTERN.test(value.trim()) && value.trim().length <= 500;
}

/** Lien Discord obligatoire. */
export const discordUrlSchema = z
	.string({ error: 'Le lien du salon est obligatoire.' })
	.trim()
	.min(1, 'Le lien du salon est obligatoire.')
	.refine(isDiscordUrl, DISCORD_URL_MESSAGE);

/** Lien Discord facultatif : vide ou absent ⇒ `''`. */
export const optionalDiscordUrlSchema = z
	.string()
	.trim()
	.optional()
	.transform((v) => v ?? '')
	.refine((v) => v === '' || isDiscordUrl(v), DISCORD_URL_MESSAGE);

/** Booléen de formulaire : `true`, `'true'`, `'on'`, `'1'` ⇒ vrai ; `false`, `'false'`, `''`, `'0'`, `'off'` ⇒ faux. */
export const formBoolean = z.preprocess(
	(v) => {
		if (typeof v === 'boolean') return v;
		if (typeof v === 'string') {
			const s = v.trim().toLowerCase();
			if (['true', 'on', '1', 'oui'].includes(s)) return true;
			if (['false', 'off', '0', '', 'non'].includes(s)) return false;
		}
		return v;
	},
	z.boolean({ error: 'Valeur attendue : oui ou non.' })
);

/** Révision attendue (04 §6) ; l'absence est traitée par le domaine (428) avant la validation. */
export const expectedRevisionSchema = z.preprocess(
	(v) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v),
	z.number({ error: 'Révision invalide.' }).int('Révision invalide.').min(1, 'Révision invalide.')
);

/** Identifiant technique (texte stable, ≤ 180, sans espace ni caractère de contrôle). */
export const idSchema = z
	.string({ error: 'Identifiant manquant.' })
	.trim()
	.min(1, 'Identifiant manquant.')
	.max(180, 'Identifiant invalide.')
	.regex(/^[^\s\p{Cc}]+$/u, 'Identifiant invalide.');

/** Numéro de page (≥ 1), tolérant aux chaînes de l'URL. */
export const pageSchema = z.preprocess(
	(v) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v === '' ? undefined : v),
	z.number().int().min(1).max(10_000).optional()
);

// ---------------------------------------------------------------------------
// Entrées
// ---------------------------------------------------------------------------

export const BOOKMARK_TEXT_MAX = 280;
export const LAST_PAGES_PER_PAGE = 20;

export const lastPagesInputSchema = z.object({ page: pageSchema }).default({});

export const openPageSchema = z.object({
	lineId: z
		.string({ error: 'Page introuvable.' })
		.trim()
		.min(3, 'Page introuvable.')
		.max(200, 'Page introuvable.')
});

export const setBookmarkSchema = z.object({
	text: z
		.string()
		.trim()
		.max(BOOKMARK_TEXT_MAX, `Le marque-page tient en ${BOOKMARK_TEXT_MAX} caractères.`)
		.optional()
		.transform((v) => v ?? ''),
	url: optionalDiscordUrlSchema,
	/** Scène en cours : la phrase est aussi notée comme marque-page de cette scène. */
	sceneId: idSchema.optional()
});

export type LastPagesInput = z.input<typeof lastPagesInputSchema>;
export type OpenPageInput = z.input<typeof openPageSchema>;
export type SetBookmarkInput = z.input<typeof setBookmarkSchema>;

// ---------------------------------------------------------------------------
// Vues
// ---------------------------------------------------------------------------

export interface ResourceView {
	cur: number;
	max: number;
}

/** Résumé de fiche en tête de « Dernières pages » (03-vision §5.2, ligne d'état). */
export interface SheetSummary {
	id: string;
	name: string;
	portraitUrl: string;
	oathName: string;
	/** Rang du Serment (`basic`, `seasoned`…) et son libellé (« Basique »). */
	rank: string;
	rankLabel: string;
	level: number;
	xp: number;
	xpMax: number;
	pv: ResourceView;
	ep: ResourceView;
	em: ResourceView;
	/** Dernier changement confirmé de la fiche (« relevé 21:14 »). */
	releveAt: string;
	/** Somme des déclarations en attente d'un MJ (« −8 EP déclaré depuis le relevé »). */
	pendingDeclared: { pv: number; ep: number; em: number };
}

/** « Ce qui attend ta main » : scène ouverte, Table ouverte, rendez-vous où je viens. */
export interface WaitingView {
	kind: 'scene' | 'table' | 'event';
	id: string;
	/** « Scène ouverte · #col-des-brumes », « La Table est ouverte : Col des brumes », « Rendez-vous samedi 20 h — tu viens ». */
	text: string;
	href: string;
	discordUrl: string | null;
	channel: string | null;
	at: string | null;
}

/** Une page écrite depuis la dernière lecture. `id` = type + identifiant source (stable). */
export interface PageLineView {
	id: string;
	at: string;
	text: string;
	href: string;
	cornered: boolean;
}

export interface LastPagesView {
	state: 'linked' | 'pending' | 'unavailable';
	pseudo: string;
	sheet: SheetSummary | null;
	lastReadAt: string;
	daysAway: number;
	bookmark: { text: string; url: string } | null;
	waiting: WaitingView[];
	since: PageLineView[];
	/** Pagination de `since` (20 par page). */
	sincePage: number;
	sincePages: number;
	upcoming: EventRowView[];
}

export interface OpenPageResult {
	/** Où mène la page ouverte. */
	href: string;
	lastReadAt: string;
}

export interface BookmarkView {
	text: string;
	url: string;
	updatedAt: string;
}
