// Scènes (06-contrats §B.4 ; 04-architecture §3.9, §3.12 ; 03-vision §12.3) : schémas Zod d'entrée
// et vues. Types purs, importables côté client.
import { z } from 'zod';
import { discordUrlSchema, expectedRevisionSchema, idSchema } from './reading';

export const SCENE_TITLE_MAX = 120;
export const SCENE_SUMMARY_MAX = 2000;
export const SCENE_QUESTION_MAX = 500;
export const SCENE_PIN_NOTE_MAX = 280;
/** Épingles par participant et par scène (la marge reste lisible). */
export const SCENE_PINS_MAX = 24;
/** Une scène sans activité depuis 14 jours se referme d'elle-même (03-vision §12.3). */
export const SCENE_IDLE_DAYS = 14;

export const SCENE_PIN_KINDS = ['capacite', 'regle', 'objet', 'creature'] as const;
export type ScenePinKind = (typeof SCENE_PIN_KINDS)[number];

/**
 * Nom du salon tiré du titre saisi (aucun appel à Discord) : le premier `#mot` du titre s'il y en a
 * un (« Embuscade #col-des-brumes » → `#col-des-brumes`), sinon le titre réduit en mots-clés
 * (« Col des brumes » → `#col-des-brumes`).
 */
export function channelFromTitle(title: string): string {
	const tagged = /#([\p{L}\p{N}_-]+)/u.exec(title);
	if (tagged) return `#${tagged[1].toLowerCase()}`;
	const slug = title
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60);
	return slug ? `#${slug}` : '';
}

// ---------------------------------------------------------------------------
// Entrées
// ---------------------------------------------------------------------------

export const openSceneSchema = z.object({
	title: z
		.string({ error: 'Donne un titre à la scène.' })
		.trim()
		.min(1, 'Donne un titre à la scène.')
		.max(SCENE_TITLE_MAX, `Le titre tient en ${SCENE_TITLE_MAX} caractères.`),
	discordUrl: discordUrlSchema,
	/** Personnages de la scène (MJ et administrateurs) ; un joueur n'ouvre que pour lui-même. */
	characterIds: z
		.preprocess(
			(v) => (typeof v === 'string' ? (v.trim() === '' ? [] : [v]) : v),
			z.array(idSchema).max(30, 'Trente personnages au plus par scène.')
		)
		.optional()
});

export const setSummarySchema = z.object({
	sceneId: idSchema,
	summary: z
		.string()
		.max(SCENE_SUMMARY_MAX, `« Où nous en sommes » tient en ${SCENE_SUMMARY_MAX} caractères.`)
		.transform((v) => v.replace(/\r\n/g, '\n').trim()),
	expectedRevision: expectedRevisionSchema
});

export const setOpenQuestionSchema = z.object({
	sceneId: idSchema,
	openQuestion: z
		.string()
		.max(SCENE_QUESTION_MAX, `La question ouverte tient en ${SCENE_QUESTION_MAX} caractères.`)
		.transform((v) => v.replace(/\r\n/g, '\n').trim()),
	expectedRevision: expectedRevisionSchema
});

export const pinSchema = z.object({
	sceneId: idSchema,
	kind: z.enum(SCENE_PIN_KINDS, { error: 'Épingle inconnue.' }),
	ref: z.string().trim().min(1, 'Que veux-tu épingler ?').max(160, 'Épingle invalide.'),
	note: z
		.string()
		.trim()
		.max(SCENE_PIN_NOTE_MAX, `La note tient en ${SCENE_PIN_NOTE_MAX} caractères.`)
		.optional()
		.transform((v) => v ?? '')
});

export const unpinSchema = z.object({ pinId: idSchema });

export const closeSceneSchema = z.object({
	sceneId: idSchema,
	expectedRevision: expectedRevisionSchema
});

export type OpenSceneInput = z.input<typeof openSceneSchema>;
export type SetSummaryInput = z.input<typeof setSummarySchema>;
export type SetOpenQuestionInput = z.input<typeof setOpenQuestionSchema>;
export type PinInput = z.input<typeof pinSchema>;
export type UnpinInput = z.input<typeof unpinSchema>;
export type CloseSceneInput = z.input<typeof closeSceneSchema>;

// ---------------------------------------------------------------------------
// Vues
// ---------------------------------------------------------------------------

export interface SceneParticipantView {
	characterId: string;
	name: string;
	me: boolean;
}

export interface ScenePinView {
	id: string;
	kind: ScenePinKind;
	ref: string;
	note: string;
	characterId: string;
	mine: boolean;
}

export interface SceneView {
	id: string;
	title: string;
	discordUrl: string;
	/** Nom du salon tiré du titre (« #col-des-brumes »). */
	channel: string;
	status: 'ouverte' | 'close';
	summary: string;
	openQuestion: string;
	participants: SceneParticipantView[];
	/** Épingles du lecteur (toutes pour les MJ et les administrateurs). */
	pins: ScenePinView[];
	/** Marge de reprise du lecteur dans cette scène. */
	bookmark: { text: string; url: string } | null;
	openedAt: string;
	closedAt: string | null;
	autoClosed: boolean;
	revision: number;
}

/** Table ouverte où figure le personnage (seconde ligne du feuillet : « Round 3 · … »). */
export interface SceneTableContext {
	id: string;
	name: string;
	discordUrl: string;
	round: number;
	phase: string;
	status: 'preparation' | 'en_cours' | 'termine';
}

/** Contexte du feuillet « En scène » : la scène courante, ou la Table ouverte. */
export interface SceneContextView {
	scene: SceneView | null;
	table: SceneTableContext | null;
	/** Salon affiché dans la bande « SCÈNE · #salon · 21:42 » (`null` : « SCÈNE · 21:42 »). */
	channel: string | null;
}

export interface AutoCloseResult {
	closed: string[];
}
