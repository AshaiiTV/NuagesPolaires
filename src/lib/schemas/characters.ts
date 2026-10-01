// Personnages : schémas Zod des entrées et vues exposées (06-contrats §B.2).
// Module pur, importable côté client : aucune dépendance serveur.
// Sources : audit 02 (fiche, XP, gemmes, inventaire, équipement, statuts, paliers), audit 05 §3.2,
// §5.3, §5.5 (consume_own_item, patch_own_player, validateAvatar), 03-vision §5.4 et §5.10.
import { z } from 'zod';
import { MEANING_COLORS, UNKNOWN_STATUS_COLOR } from '$lib/game/colors';

// ---------------------------------------------------------------------------
// Référentiels d'affichage — couleurs : table unique `$lib/game/colors` (décision INT-1)
// ---------------------------------------------------------------------------

const S = MEANING_COLORS.status;

/** Les 12 statuts IRP (`STATUT_EFFECTS`, legacy main.js:12474-12487 ; audit 02 §10). */
export const STATUS_CATALOG = [
	{ id: 'saignement', label: 'Saignement', color: S.saignement },
	{ id: 'empoisonne', label: 'Empoisonné', color: S.empoisonne },
	{ id: 'brulure', label: 'Brûlure', color: S.brulure },
	{ id: 'gel', label: 'Gel', color: S.gel },
	{ id: 'etourdi', label: 'Étourdi', color: S.etourdi },
	{ id: 'entrave', label: 'Entravé', color: S.entrave },
	{ id: 'aveugle', label: 'Aveuglé', color: S.aveugle },
	{ id: 'silence', label: 'Silence', color: S.silence },
	{ id: 'peur', label: 'Peur', color: S.peur },
	{ id: 'fragilise', label: 'Fragilisé', color: S.fragilise },
	{ id: 'renforce', label: 'Renforcé', color: S.renforce },
	{ id: 'inspire', label: 'Inspiré', color: S.inspire }
] as const;

export type StatusId = (typeof STATUS_CATALOG)[number]['id'];
export const STATUS_IDS = STATUS_CATALOG.map((s) => s.id) as [StatusId, ...StatusId[]];

/** Libellé et couleur (hex) d'un statut ; un identifiant hérité inconnu garde son id comme libellé. */
export function statusMeta(id: string): { label: string; color: string } {
	const found = STATUS_CATALOG.find((s) => s.id === id);
	return found
		? { label: found.label, color: found.color }
		: { label: id, color: UNKNOWN_STATUS_COLOR };
}

/**
 * Gemmes de Sang : libellés (audit 02 §6 : « Blanche », « Incarnate », « Écarlate ») et couleurs
 * hex de la table unique (audit 07 §2).
 */
export const GEM_META = {
	blanche: { label: 'Blanche', color: MEANING_COLORS.gem.blanche },
	incarnate: { label: 'Incarnate', color: MEANING_COLORS.gem.incarnate },
	ecarlate: { label: 'Écarlate', color: MEANING_COLORS.gem.ecarlate }
} as const;
export const GEM_KINDS = ['blanche', 'incarnate', 'ecarlate'] as const;

/** Catégories d'objets (audit 02 §7.1, sélecteur « Catégorie » legacy main.js:3290). */
export const ITEM_CATEGORIES = ['Équipement', 'Consommable', 'Gemme', 'Divers'] as const;

/** Emplacements d'équipement (audit 02 §7.4) et leurs libellés de fiche (03-vision §5.4). */
export const EQUIPMENT_SLOTS = ['helmet', 'chest', 'legs'] as const;
export const EQUIPMENT_LABELS = { helmet: 'Casque', chest: 'Plastron', legs: 'Jambières' } as const;

/** Ressources et leurs libellés courts. */
export const RESOURCES = ['pv', 'ep', 'em'] as const;
export const RESOURCE_LABELS = { pv: 'PV', ep: 'EP', em: 'EM' } as const;

/** Filtres du chapitre Conséquences (03-vision §5.4 : Tous · XP · Gemmes · Combats · Objets · Statuts · Serment). */
export const CONSEQUENCE_FILTERS = ['xp', 'gemme', 'combat', 'item', 'status', 'serment'] as const;

/** 20 lignes par page (03-vision §5.4). */
export const CONSEQUENCES_PAGE_SIZE = 20;

/** Bornes (audit 05 §3.2, §5.3, §5.5). */
export const LIMITS = {
	name: 80,
	motif: 500,
	note: 2000,
	itemName: 120,
	itemDescription: 2000,
	equipment: 120,
	weapon: 160,
	branch: 160,
	/** `MAX_IMAGE_DATA_URL_LENGTH` (audit 05 §5.3). */
	avatarDataUrl: 350_000,
	/** `MAX_STRING_LENGTH` (audit 05 §5.3) pour une URL ou un chemin. */
	avatarUrl: 25_000,
	/** `validActionId` : ≤ 180 (audit 05 §5.5). */
	actionId: 180,
	statuses: 64,
	gemQtyMin: 1,
	gemQtyMax: 99,
	itemQtyMax: 9999
} as const;

// ---------------------------------------------------------------------------
// Briques communes
// ---------------------------------------------------------------------------

const expectedRevision = z.int({ error: 'Version attendue invalide.' }).min(1, {
	error: 'Version attendue invalide.'
});
const characterId = z
	.string({ error: 'Personnage invalide.' })
	.trim()
	.min(1, { error: 'Personnage invalide.' })
	.max(LIMITS.actionId, { error: 'Personnage invalide.' });
/** Motif du tampon : obligatoire, texte brut (04 §3.12 : un tampon = rôle staff + motif non vide). */
export const motifSchema = z
	.string({ error: 'Le motif est obligatoire.' })
	.trim()
	.min(1, { error: 'Le motif est obligatoire.' })
	.max(LIMITS.motif, { error: `Le motif ne doit pas dépasser ${LIMITS.motif} caractères.` });
const optionalNote = z
	.string({ error: 'Note invalide.' })
	.trim()
	.max(LIMITS.note, { error: `La note ne doit pas dépasser ${LIMITS.note} caractères.` })
	.optional();

/**
 * Identifiant d'action (`validActionId`, audit 05 §5.5) : chaîne non vide ≤ 180, sans blanc de
 * bord ni caractère de contrôle (pas de `trim` : « ' potion' » est refusé, audit 06 I3).
 */
export const actionIdSchema = z
	.string({ error: 'Identifiant invalide.' })
	.min(1, { error: 'Identifiant invalide.' })
	.max(LIMITS.actionId, { error: 'Identifiant invalide.' })
	// eslint-disable-next-line no-control-regex
	.refine((v) => v === v.trim() && !/[\u0000-\u001f\u007f]/.test(v), {
		error: 'Identifiant invalide.'
	});

// ---------------------------------------------------------------------------
// Validation du portrait (validateAvatar, legacy db.js:410-427 ; audit 05 §3.2)
// ---------------------------------------------------------------------------

const DATA_URL_RE = /^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/;
/** Caractères interdits hors data-URL : `<>"'\`\\`, contrôle, espace (audit 05 §3.2). */
// eslint-disable-next-line no-control-regex
const FORBIDDEN_URL_CHARS = /[<>"'`\\\s\u0000-\u001f\u007f]/;

/**
 * Vrai si l'URL de portrait est sûre : vide (retrait), data-URL raster base64 ≤ 350 000
 * caractères (png, jpeg, webp, gif), `http(s)://` sans identifiants, ou chemin relatif sans
 * schéma, sans `//` initial ni `&`. Tout autre schéma (`javascript:`, `data:text/html`, `svg`…) est
 * refusé.
 */
export function isSafePortraitUrl(raw: string): boolean {
	if (raw === '') return true;
	if (raw.startsWith('data:')) {
		return raw.length <= LIMITS.avatarDataUrl && DATA_URL_RE.test(raw);
	}
	if (raw.length > LIMITS.avatarUrl) return false;
	if (FORBIDDEN_URL_CHARS.test(raw)) return false;
	if (/^https?:\/\//i.test(raw)) {
		let url: URL;
		try {
			url = new URL(raw);
		} catch {
			return false;
		}
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
		return url.username === '' && url.password === '' && url.hostname !== '';
	}
	// Chemin relatif : aucun schéma (`xxx:` avant le premier « / »), pas de `//` initial, pas de `&`.
	if (raw.startsWith('//') || raw.includes('&')) return false;
	const firstSlash = raw.indexOf('/');
	const head = firstSlash === -1 ? raw : raw.slice(0, firstSlash);
	return !head.includes(':');
}

export const portraitUrlSchema = z
	.string({ error: 'Portrait invalide.' })
	.trim()
	.refine(isSafePortraitUrl, {
		error:
			'Portrait refusé : image png, jpeg, webp ou gif de 350 000 caractères au plus, ou lien http(s) sans identifiants.'
	});

// ---------------------------------------------------------------------------
// Entrées (staff)
// ---------------------------------------------------------------------------

export const listCharactersSchema = z.object({
	search: z.string().trim().max(120).optional(),
	oathId: z.string().trim().min(1).max(LIMITS.actionId).optional(),
	linked: z.boolean().optional()
});

export const createCharacterSchema = z.object({
	name: z
		.string({ error: 'Nom et Serment obligatoires.' })
		.trim()
		.min(1, { error: 'Nom et Serment obligatoires.' })
		.max(LIMITS.name, { error: `Le nom ne doit pas dépasser ${LIMITS.name} caractères.` }),
	oathId: z
		.string({ error: 'Nom et Serment obligatoires.' })
		.trim()
		.min(1, { error: 'Nom et Serment obligatoires.' }),
	portraitUrl: portraitUrlSchema.optional(),
	/** Facultatif à la création : « Nouveau personnage. » par défaut (le tampon garde un motif). */
	motif: z.string().trim().max(LIMITS.motif).optional()
});

export const correctResourceSchema = z.object({
	characterId,
	resource: z.enum(RESOURCES, { error: 'Ressource invalide.' }),
	newValue: z.int({ error: 'La nouvelle valeur doit être un entier.' }).min(0, {
		error: 'La nouvelle valeur ne peut pas être négative.'
	}),
	motif: motifSchema,
	/** Conséquence raturée par cette correction (04 §3.12 : la rature porte `replaces_id`). */
	replacesId: z.string().regex(/^\d+$/, { error: 'Conséquence invalide.' }).optional(),
	expectedRevision
});

export const grantCombatXpSchema = z.object({
	characterId,
	beastLevel: z.int({ error: 'Niveau de créature invalide.' }).min(1).max(1000),
	participationPct: z
		.number({ error: 'Participation invalide.' })
		.min(0, { error: 'Participation invalide.' })
		.max(100, { error: 'Participation invalide.' }),
	/** Nom de la créature pour la ligne « +X XP (<créature>, <part>%) » (audit 02 §8). */
	beastName: z.string().trim().max(LIMITS.name).optional(),
	combatId: z.string().trim().min(1).max(LIMITS.actionId).optional(),
	motif: motifSchema,
	expectedRevision
});

export const fuseGemsSchema = z.object({
	characterId,
	kind: z.enum(GEM_KINDS, { error: 'Gemme invalide.' }),
	qty: z
		.int({ error: 'Quantité invalide.' })
		.min(LIMITS.gemQtyMin, { error: 'Quantité invalide (1 à 99).' })
		.max(LIMITS.gemQtyMax, { error: 'Quantité invalide (1 à 99).' }),
	motif: motifSchema,
	expectedRevision
});

export const addItemSchema = z.object({
	characterId,
	name: z
		.string({ error: "Nom de l'objet obligatoire." })
		.trim()
		.min(1, { error: "Nom de l'objet obligatoire." })
		.max(LIMITS.itemName, { error: `Le nom ne doit pas dépasser ${LIMITS.itemName} caractères.` }),
	category: z.enum(ITEM_CATEGORIES, { error: 'Catégorie invalide.' }),
	qty: z
		.int({ error: 'Quantité invalide.' })
		.min(1, { error: 'Quantité invalide.' })
		.max(LIMITS.itemQtyMax, { error: 'Quantité invalide.' }),
	description: z.string().trim().max(LIMITS.itemDescription).optional(),
	note: optionalNote,
	motif: motifSchema,
	expectedRevision
});

export const removeItemSchema = z.object({
	characterId,
	itemId: actionIdSchema,
	qty: z
		.int({ error: 'Quantité invalide.' })
		.min(1, { error: 'Quantité invalide.' })
		.max(LIMITS.itemQtyMax, { error: 'Quantité invalide.' }),
	note: optionalNote,
	motif: motifSchema,
	expectedRevision
});

export const setStatusSchema = z.object({
	characterId,
	statusId: z.enum(STATUS_IDS, { error: 'Statut inconnu.' }),
	note: z.string().trim().max(LIMITS.motif).optional(),
	motif: motifSchema,
	expectedRevision
});

export const removeStatusSchema = z.object({
	characterId,
	statusId: z.string().trim().min(1, { error: 'Statut inconnu.' }).max(64),
	motif: motifSchema,
	expectedRevision
});

const equipmentValue = z
	.string()
	.trim()
	.max(LIMITS.equipment, {
		error: `Un emplacement ne doit pas dépasser ${LIMITS.equipment} caractères.`
	})
	.nullable();

export const setEquipmentSchema = z.object({
	characterId,
	/** Emplacements à changer ; `null` ou `''` = rien. */
	equipment: z
		.object({
			helmet: equipmentValue.optional(),
			chest: equipmentValue.optional(),
			legs: equipmentValue.optional()
		})
		.refine((e) => Object.values(e).some((v) => v !== undefined), {
			error: 'Aucun emplacement à changer.'
		}),
	motif: motifSchema,
	expectedRevision
});

export const updateIdentitySchema = z.object({
	characterId,
	name: z
		.string()
		.trim()
		.min(1, { error: 'Le nom est obligatoire.' })
		.max(LIMITS.name, { error: `Le nom ne doit pas dépasser ${LIMITS.name} caractères.` })
		.optional(),
	oathId: z.string().trim().min(1).max(LIMITS.actionId).optional(),
	/** Nom complet d'une branche du Serment, ou « Aucune ». */
	branch: z.string().trim().min(1).max(LIMITS.branch).optional(),
	weapon: z.string().trim().max(LIMITS.weapon).optional(),
	/** Niveau ± (audit 02 §2.5, `adjVal('level')`). */
	levelDelta: z
		.int({ error: 'Ajustement de niveau invalide.' })
		.min(-99)
		.max(99)
		.refine((v) => v !== 0, { error: 'Ajustement de niveau invalide.' })
		.optional(),
	motif: motifSchema,
	expectedRevision
});

export const strikeCharacterSchema = z.object({
	characterId,
	typedName: z.string({ error: 'Saisis le nom du personnage.' }).trim(),
	motif: z.string().trim().max(LIMITS.motif).optional(),
	expectedRevision
});

export const listConsequencesSchema = z.object({
	characterId: characterId.optional(),
	filter: z.enum(CONSEQUENCE_FILTERS).optional(),
	page: z.int().min(1).optional()
});

// ---------------------------------------------------------------------------
// Entrées (joueur) — commandes strictes : tout champ en plus est refusé (audit 06 I3)
// ---------------------------------------------------------------------------

export const setOwnPortraitSchema = z.strictObject({
	url: portraitUrlSchema,
	expectedRevision
});

export const consumeOwnItemSchema = z.strictObject({
	itemId: actionIdSchema,
	note: z
		.string({ error: 'Item ou note invalide (2 000 caractères maximum).' })
		.max(LIMITS.note, { error: 'Item ou note invalide (2 000 caractères maximum).' })
		.optional(),
	expectedRevision
});

export type ListCharactersInput = z.input<typeof listCharactersSchema>;
export type CreateCharacterInput = z.input<typeof createCharacterSchema>;
export type CorrectResourceInput = z.input<typeof correctResourceSchema>;
export type GrantCombatXpInput = z.input<typeof grantCombatXpSchema>;
export type FuseGemsInput = z.input<typeof fuseGemsSchema>;
export type AddItemInput = z.input<typeof addItemSchema>;
export type RemoveItemInput = z.input<typeof removeItemSchema>;
export type SetStatusInput = z.input<typeof setStatusSchema>;
export type RemoveStatusInput = z.input<typeof removeStatusSchema>;
export type SetEquipmentInput = z.input<typeof setEquipmentSchema>;
export type UpdateIdentityInput = z.input<typeof updateIdentitySchema>;
export type StrikeCharacterInput = z.input<typeof strikeCharacterSchema>;
export type ListConsequencesInput = z.input<typeof listConsequencesSchema>;
export type SetOwnPortraitInput = z.input<typeof setOwnPortraitSchema>;
export type ConsumeOwnItemInput = z.input<typeof consumeOwnItemSchema>;

// ---------------------------------------------------------------------------
// Vues (06-contrats §B.2)
// ---------------------------------------------------------------------------

export type ResourceKey = (typeof RESOURCES)[number];
export type GemKindKey = (typeof GEM_KINDS)[number];
export type ConsequenceFilter = (typeof CONSEQUENCE_FILTERS)[number];

export type ItemView = {
	id: string;
	name: string;
	category: string;
	qty: number;
	description: string;
};

/** Palier : niveau requis, nom, coût, texte complet, étiquette d'étape (« Débloqué »…). */
export type TierView = {
	level: number;
	name: string;
	cost: string;
	description: string;
	stage: string;
};

export type StatusView = {
	id: string;
	label: string;
	color: string;
	/** Durée en tours : seulement en combat ; `null` sur la fiche (audit 02 §10). */
	turns: number | null;
	/** Note IRP du statut (`desc`), texte brut. */
	note: string;
};

export type GemView = { kind: GemKindKey; label: string; color: string; qty: number };

export type SheetView = {
	id: string;
	name: string;
	portraitUrl: string;
	oath: {
		id: string;
		name: string;
		rank: string;
		rankLabel: string;
		weapon: string;
		/** Nom du Serment parent (« Évolution de <lineage> »), `null` sans lignée. */
		lineage: string | null;
		category: string;
	};
	/** Nom complet de la branche, `null` si « Aucune ». */
	branch: string | null;
	level: number;
	xp: number;
	xpMax: number;
	pv: { cur: number; max: number };
	ep: { cur: number; max: number };
	em: { cur: number; max: number };
	/** Somme des déclarations « proposée » par ressource (jamais appliquée aux chiffres). */
	pendingDeclared: { pv: number; ep: number; em: number };
	statuses: StatusView[];
	/** Gemmes en stock (quantité > 0 seulement). */
	gems: GemView[];
	equipment: { helmet: string | null; chest: string | null; legs: string | null };
	/** Objets de quantité > 0 (un objet à 0 reste stocké mais invisible, audit 02 §7.1). */
	items: ItemView[];
	tiers: { reached: TierView[]; next: TierView[] };
	/** Relevé : date ISO du dernier changement confirmé de la fiche. */
	releveAt: string;
	linkedPseudo: string | null;
	revision: number;
};

export type StampView = {
	/** Libellé du rôle sur le tampon : « MJ », « Admin ». */
	role: string;
	name: string;
};

export type ConsequenceView = {
	id: string;
	at: string;
	kind: string;
	text: string;
	field: string | null;
	oldValue: string | null;
	newValue: string | null;
	stamp: StampView | null;
	signature: 'toi' | 'regles' | null;
	motif: string;
	/** Vrai si une entrée ultérieure rature celle-ci. */
	struck: boolean;
	combatId: string | null;
	/** Entrée raturée par celle-ci (la rature), sinon `null`. */
	replacesId: string | null;
};

export type ConsequencePageView = { rows: ConsequenceView[]; page: number; pages: number };

export type CharacterRowView = {
	id: string;
	name: string;
	oath: { id: string; name: string; rank: string; rankLabel: string };
	level: number;
	pv: { cur: number; max: number };
	ep: { cur: number; max: number };
	em: { cur: number; max: number };
	linkedPseudo: string | null;
	/** Dernier tampon daté (« dernier tampon daté », 03-vision §5.10). */
	lastStamp: { at: string; role: string; name: string; motif: string } | null;
	revision: number;
};

export type SheetExportView = {
	sheet: SheetView;
	consequences: ConsequenceView[];
	exportedAt: string;
};
