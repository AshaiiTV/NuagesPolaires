/**
 * Règles de progression du compagnon : XP, niveaux, ressources, Gemmes de Sang et
 * migration des anciennes fiches (double piste personnage / serment).
 * Module pur : aucune I/O, aucune date, aucune permission. Les fonctions retournent de
 * nouveaux objets et ne modifient jamais leurs entrées.
 *
 * Sources : audit 02 §2, §3, §6 ; `legacy/assets/js/progression.js` (formules figées) ;
 * `legacy/assets/js/main.js:9299-9453` (doLvlUp, applyXP, gemmes, adjVal) ;
 * `legacy/docs/fusion-xp.md` (décision du 24/09/2026).
 */

import type {
	GemKind,
	Growth,
	HistoryEntryDraft,
	InventoryItemLike,
	OathRank,
	ProgressionState,
	Resources
} from './types';
import { BUILTIN_OATHS, findOath, tierMilestoneAt } from './oaths';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Seuil d'XP par niveau : `xpMax = niveau × 30`. legacy progression.js:21, fusion-xp.md */
export const XP_PER_LEVEL = 30;

/** Marque d'une fiche déjà unifiée. legacy progression.js:7 */
export const PROGRESSION_VERSION = 1;

/** Ressources de base au niveau 1, identiques pour tous. audit 02 §0, main.js:9468-9487 */
export const BASE_STATS = { pv: 30, ep: 50, em: 20 } as const;

/** Croissance d'un Serment inconnu. legacy progression.js:23 */
export const ZERO_GROWTH: Readonly<Growth> = { pvN: 0, epN: 0, emN: 0 };

/** XP par grade de Gemme de Sang. audit 02 §6, main.js:9418, fusion-xp.md */
export const GEM_XP: Readonly<Record<GemKind, number>> = { blanche: 5, incarnate: 20, ecarlate: 50 };

/** Noms exacts des objets d'inventaire. audit 02 §6, main.js:9418 */
export const GEM_NAMES: Readonly<Record<GemKind, string>> = {
	blanche: 'Gemme Blanche',
	incarnate: 'Gemme Incarnate',
	ecarlate: 'Gemme Écarlate'
};

/** Catégorie d'inventaire des gemmes. audit 02 §7.1 */
export const GEM_CATEGORY = 'Gemme';

/** Quantité de gemmes fusionnables en une fois (1–99). main.js:9417 */
export const GEM_FUSION_MIN_QTY = 1;
export const GEM_FUSION_MAX_QTY = 99;

// ---------------------------------------------------------------------------
// Utilitaires numériques (mêmes tolérances que progression.js)
// ---------------------------------------------------------------------------

/** `finite` : null/undefined/'' ou non fini → repli. legacy progression.js:15-19 */
export function finiteOr(value: unknown, fallback: number): number {
	if (value === null || value === undefined || value === '') return fallback;
	const n = Number(value);
	return Number.isFinite(n) ? n : fallback;
}

/** Niveau entier ≥ 1. legacy progression.js:20 */
export function levelNumber(value: unknown): number {
	return Math.max(1, Math.floor(finiteOr(value, 1)));
}

// ---------------------------------------------------------------------------
// Formules
// ---------------------------------------------------------------------------

/** `xpRequired(level) = max(1, floor(level)) × 30`. legacy progression.js:21, audit 02 §2.1 */
export function xpMax(level: number): number {
	return levelNumber(level) * XP_PER_LEVEL;
}

/**
 * Croissance effective d'un Serment : valeurs natives (par id ou nom, `[0,0,0]` si inconnu)
 * fusionnées avec une surcharge partielle `customOverrides[oathId|name]`.
 * `effectiveDefinition`, legacy progression.js:22-26 ; audit 02 §3.1.
 */
export function growthFor(
	oathIdOrName: string | null | undefined,
	customOverrides?: Readonly<Record<string, Partial<Growth> | null | undefined>> | null
): Growth {
	const oath = findOath(oathIdOrName, BUILTIN_OATHS);
	const base: Growth = oath ? { ...oath.growth } : { ...ZERO_GROWTH };
	if (!customOverrides || !oathIdOrName) return base;
	const key = String(oathIdOrName).trim();
	const custom =
		customOverrides[key] ??
		(oath ? (customOverrides[oath.name] ?? customOverrides[oath.id]) : undefined);
	if (!custom || typeof custom !== 'object') return base;
	return {
		pvN: finiteOr(custom.pvN, base.pvN),
		epN: finiteOr(custom.epN, base.epN),
		emN: finiteOr(custom.emN, base.emN)
	};
}

/**
 * Maxima théoriques à un niveau : `base + (niveau − 1) × gain`. audit 02 §2.3
 * (saveStats main.js:9578-9580, adjVal main.js:9440). Écrase tout bonus de maximum.
 */
export function maxAtLevel(level: number, growth: Growth): Pick<Resources, 'pvMax' | 'epMax' | 'emMax'> {
	const steps = levelNumber(level) - 1;
	return {
		pvMax: BASE_STATS.pv + steps * growth.pvN,
		epMax: BASE_STATS.ep + steps * growth.epN,
		emMax: BASE_STATS.em + steps * growth.emN
	};
}

/**
 * Récompense de combat : `ceil(niveau_mob × 10 × participation / 100)`.
 * audit 02 §2.4, main.js:9372. Un résultat ≤ 0 doit être refusé par l'appelant
 * (« XP = 0. Ajuste la participation. »).
 */
export function combatXp(beastLevel: number, participationPercent: number): number {
	const base = Math.max(1, Math.floor(finiteOr(beastLevel, 1)));
	const part = finiteOr(participationPercent, 0);
	return Math.ceil(base * 10 * (part / 100));
}

/** Texte d'historique d'une récompense de combat : `+X XP (<mob>, <part>%)`. audit 02 §8 */
export function combatXpEntryText(xpGain: number, beastName: string, participationPercent: number): string {
	return `+${xpGain} XP (${beastName}, ${participationPercent}%)`;
}

// ---------------------------------------------------------------------------
// Montée de niveau
// ---------------------------------------------------------------------------

export type ApplyXpOptions = {
	/** Rang du Serment : détermine la table des paliers nommés dans l'historique. main.js:9315 */
	rank?: OathRank;
	/**
	 * Soin complet à chaque niveau (comportement hérité de `doLvlUp`, main.js:9313).
	 * `false` conserve le déficit de chaque ressource (règle de la migration, progression.js:72) ;
	 * voir audit 02 §16 question 1.
	 */
	healOnLevelUp?: boolean;
};

export type ApplyXpResult<T extends ProgressionState> = {
	character: T;
	/** Nombre de niveaux gagnés. */
	levelsGained: number;
	/** Niveaux atteints, dans l'ordre (ex. `[2, 3]`). */
	levelsReached: number[];
	/** Entrées d'historique `level` à enregistrer (« Système »). */
	entries: HistoryEntryDraft[];
};

/**
 * Crédite de l'XP puis résout les montées de niveau (`doLvlUp`, main.js:9307-9319) :
 * tant que `xp ≥ xpMax` : `xp −= xpMax ; level += 1 ; xpMax = level × 30` (excédent conservé) ;
 * si le Serment est connu (`growth` non nul) : `xMax += gain` et, par défaut, `xCur = xMax`.
 * Un montant négatif plancher l'XP à 0 sans descente de niveau (`adjVal('xp')`, main.js:9439, 9441).
 * Entrée d'historique : `⬆ Niveau N ! PV:x EP:y EM:z[ — <palier> débloqué]`.
 */
export function applyXp<T extends ProgressionState>(
	character: T,
	amount: number,
	growth: Growth | null,
	options: ApplyXpOptions = {}
): ApplyXpResult<T> {
	const heal = options.healOnLevelUp ?? true;
	const rank: OathRank = options.rank ?? 'basic';
	const next: T = { ...character };
	next.level = levelNumber(next.level);
	next.xp = Math.max(0, Math.floor(finiteOr(next.xp, 0) + Math.floor(finiteOr(amount, 0))));
	let threshold = xpMax(next.level);
	const levelsReached: number[] = [];
	const entries: HistoryEntryDraft[] = [];
	while (next.xp >= threshold) {
		next.xp -= threshold;
		next.level += 1;
		threshold = xpMax(next.level);
		if (growth) {
			next.pvMax += growth.pvN;
			next.epMax += growth.epN;
			next.emMax += growth.emN;
			if (heal) {
				next.pvCur = next.pvMax;
				next.epCur = next.epMax;
				next.emCur = next.emMax;
			} else {
				// Déficit conservé, un personnage à 0 PV reste à 0 PV. progression.js:72
				next.pvCur = next.pvCur === 0 ? 0 : Math.max(0, next.pvCur + growth.pvN);
				next.epCur = Math.max(0, next.epCur + growth.epN);
				next.emCur = Math.max(0, next.emCur + growth.emN);
			}
		}
		levelsReached.push(next.level);
		const milestone = tierMilestoneAt(rank, next.level);
		entries.push({
			type: 'level',
			text:
				`⬆ Niveau ${next.level} ! PV:${next.pvMax} EP:${next.epMax} EM:${next.emMax}` +
				(milestone ? ` — ${milestone} débloqué` : ''),
			actorName: 'Système'
		});
	}
	return { character: next, levelsGained: levelsReached.length, levelsReached, entries };
}

/**
 * Aperçu sans effet : niveau et XP après un gain (`updateXPPreview`, main.js:9356-9357).
 */
export function previewXp(
	character: Pick<ProgressionState, 'level' | 'xp'>,
	amount: number
): { level: number; xp: number; xpMax: number; levelsGained: number } {
	let level = levelNumber(character.level);
	let xp = Math.max(0, Math.floor(finiteOr(character.xp, 0) + Math.floor(finiteOr(amount, 0))));
	let max = xpMax(level);
	let gained = 0;
	while (xp >= max) {
		xp -= max;
		level += 1;
		max = xpMax(level);
		gained += 1;
	}
	return { level, xp, xpMax: max, levelsGained: gained };
}

/**
 * Ajustement manuel du niveau (`adjVal('level')`, main.js:9440, audit 02 §2.5) :
 * `level = max(1, old + delta)` ; `xp = min(xpMax − 1, ceil(fraction × xpMax))` où
 * `fraction = xp / max(1, ancien xpMax)` ; si le Serment est connu, maxima § 2.3 et
 * `xCur = min(xCur, xMax)`. Aucune entrée d'historique ici (texte « Ajust. Niveau : a → b »
 * produit par le domaine avec l'auteur).
 */
export function adjustLevel<T extends ProgressionState>(
	character: T,
	delta: number,
	growth: Growth | null
): T {
	const next: T = { ...character };
	const oldLevel = levelNumber(next.level);
	const oldFraction = Math.max(0, finiteOr(next.xp, 0)) / Math.max(1, xpMax(oldLevel));
	next.level = Math.max(1, oldLevel + Math.floor(finiteOr(delta, 0)));
	const max = xpMax(next.level);
	next.xp = Math.min(max - 1, Math.ceil(oldFraction * max));
	if (growth) {
		const maxima = maxAtLevel(next.level, growth);
		next.pvMax = maxima.pvMax;
		next.pvCur = Math.min(next.pvCur, next.pvMax);
		next.epMax = maxima.epMax;
		next.epCur = Math.min(next.epCur, next.epMax);
		next.emMax = maxima.emMax;
		next.emCur = Math.min(next.emCur, next.emMax);
	}
	return next;
}

// ---------------------------------------------------------------------------
// Gemmes de Sang
// ---------------------------------------------------------------------------

/** XP d'une gemme selon son grade : Blanche +5, Incarnate +20, Écarlate +50. audit 02 §6 */
export function gemXp(kind: GemKind): number {
	return GEM_XP[kind];
}

function normalizeGemName(name: unknown): string {
	return String(name ?? '')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.trim();
}

/**
 * Grade d'un objet d'inventaire s'il est une Gemme de Sang reconnue (`gemXPStock`,
 * main.js:9395-9401) : catégorie `Gemme` et nom normalisé (NFD, accents retirés, minuscules)
 * valant « gemme blanche » / « blanche », etc. Sinon `null`.
 */
export function gemKindOf(item: Pick<InventoryItemLike, 'name' | 'category'>): GemKind | null {
	if (item.category !== GEM_CATEGORY) return null;
	const name = normalizeGemName(item.name);
	for (const kind of ['blanche', 'incarnate', 'ecarlate'] as const) {
		if (name === `gemme ${kind}` || name === kind) return kind;
	}
	return null;
}

/** Stock fusionnable d'un grade : somme des `qty > 0` des objets reconnus. main.js:9399, 9408 */
export function gemStock(items: readonly InventoryItemLike[], kind: GemKind): number {
	return items.reduce((sum, item) => {
		if (gemKindOf(item) !== kind) return sum;
		const qty = Math.floor(finiteOr(item.qty, 0));
		return qty > 0 ? sum + qty : sum;
	}, 0);
}

export type FuseGemsOptions = ApplyXpOptions & {
	/** Auteur de l'entrée `gemme` (« MJ <nom> »). Défaut « Système ». */
	actorName?: string;
};

export type FuseGemsResult<T extends ProgressionState, I extends InventoryItemLike> =
	| {
			ok: true;
			character: T;
			/** Inventaire après retrait (nouveaux objets, ordre conservé, `qty` plancher 0). */
			items: I[];
			/** XP créditée (`valeur × qty`). */
			total: number;
			qty: number;
			levelsGained: number;
			levelsReached: number[];
			/** Entrée `gemme` suivie des entrées `level`. */
			entries: HistoryEntryDraft[];
	  }
	| {
			ok: false;
			code: 'GEM_STOCK_INSUFFICIENT';
			message: string;
			stock: number;
			qty: number;
	  };

/**
 * Fusion de Gemmes de Sang (`applyGemXP`, main.js:9414-9433 ; fusion-xp.md) :
 * quantité bornée 1–99, refus « Pas assez de gemmes en inventaire (n disponible(s)). » si le
 * stock est insuffisant, retrait objet par objet, crédit `valeur × qty` puis montées de niveau.
 * Le crédit et le retrait sont retournés ensemble : le domaine les persiste dans une seule
 * transaction (aucun des deux n'est confirmé si la sauvegarde échoue).
 */
export function fuseGems<T extends ProgressionState, I extends InventoryItemLike>(
	character: T,
	items: readonly I[],
	kind: GemKind,
	qty: number,
	growth: Growth | null,
	options: FuseGemsOptions = {}
): FuseGemsResult<T, I> {
	const wanted = Math.max(
		GEM_FUSION_MIN_QTY,
		Math.min(GEM_FUSION_MAX_QTY, Math.floor(finiteOr(qty, 1)))
	);
	const stock = gemStock(items, kind);
	if (stock < wanted) {
		return {
			ok: false,
			code: 'GEM_STOCK_INSUFFICIENT',
			message: `Pas assez de gemmes en inventaire (${stock} disponible(s)).`,
			stock,
			qty: wanted
		};
	}
	let remaining = wanted;
	const nextItems: I[] = items.map((item) => {
		if (remaining <= 0 || gemKindOf(item) !== kind) return item;
		const have = Math.floor(finiteOr(item.qty, 0));
		if (have <= 0) return item;
		const taken = Math.min(remaining, have);
		remaining -= taken;
		return { ...item, qty: have - taken };
	});
	const total = gemXp(kind) * wanted;
	const gemEntry: HistoryEntryDraft = {
		type: 'gemme',
		text: `+${total} XP (fusion de ${wanted}× ${GEM_NAMES[kind]})`,
		actorName: options.actorName ?? 'Système'
	};
	const applied = applyXp(character, total, growth, options);
	return {
		ok: true,
		character: applied.character,
		items: nextItems,
		total,
		qty: wanted,
		levelsGained: applied.levelsGained,
		levelsReached: applied.levelsReached,
		entries: [gemEntry, ...applied.entries]
	};
}

// ---------------------------------------------------------------------------
// Migration v1 des anciennes fiches (double piste)
// ---------------------------------------------------------------------------

/** Ancienne fiche telle que lue dans `np_store` (champs tolérés absents, null ou mal typés). */
export type LegacyProgressionRecord = {
	level?: unknown;
	xp?: unknown;
	xpMax?: unknown;
	sLevel?: unknown;
	sXp?: unknown;
	sXpMax?: unknown;
	progressionVersion?: unknown;
	/** Nom du Serment ; alias hérité `class`. audit 02 §1.2 */
	classe?: unknown;
	class?: unknown;
	pvCur?: unknown;
	pvMax?: unknown;
	epCur?: unknown;
	epMax?: unknown;
	emCur?: unknown;
	emMax?: unknown;
	[key: string]: unknown;
};

/** Fiche après migration : progression unifiée, anciens champs de serment supprimés. */
export type NormalizedProgressionRecord = {
	level: number;
	xp: number;
	xpMax: number;
	progressionVersion: number;
	sLevel?: never;
	sXp?: never;
	sXpMax?: never;
	[key: string]: unknown;
};

/**
 * Résout une ancienne piste d'XP (`legacyTrack`, progression.js:27-44) : si `xp ≥ seuil`,
 * consomme d'abord le seuil enregistré, puis saute la série arithmétique `niveau × scale`.
 * Renvoie le niveau atteint et la fraction d'avancement vers le suivant.
 */
export function legacyTrack(
	level: unknown,
	xp: unknown,
	threshold: unknown,
	scale: number
): { level: number; fraction: number } {
	let lvl = levelNumber(level);
	let points = Math.max(0, Math.floor(finiteOr(xp, 0)));
	let seuil = Math.max(1, Math.floor(finiteOr(threshold, lvl * scale)));
	if (points >= seuil) {
		points -= seuil;
		lvl += 1;
		// Saut d'une série arithmétique entière au lieu d'une boucle par niveau (imports).
		const skipped = Math.max(
			0,
			Math.floor((Math.sqrt(Math.pow(2 * lvl - 1, 2) + (8 * points) / scale) - (2 * lvl - 1)) / 2)
		);
		points -= (scale * skipped * (2 * lvl + skipped - 1)) / 2;
		lvl += skipped;
		seuil = lvl * scale;
		// Correction d'arrondi flottant à une borne exacte.
		if (points < 0) {
			lvl -= 1;
			points += lvl * scale;
			seuil = lvl * scale;
		}
		if (points >= seuil) {
			points -= seuil;
			lvl += 1;
			seuil = lvl * scale;
		}
	}
	return { level: lvl, fraction: points / seuil };
}

/** Résolveur de croissance par nom de Serment (surcharges custom incluses). */
export type GrowthResolver = (oathName: string) => Partial<Growth> | Growth | null | undefined;

/**
 * Migration v1 d'une ancienne fiche (`normalizePlayer`, progression.js:45-80 ; fusion-xp.md ;
 * audit 02 §3.1). Idempotente : une fiche `progressionVersion ≥ 1` garde son niveau et son XP
 * (seuil réparé à `niveau × 30`, champs `sLevel/sXp/sXpMax` ignorés puis supprimés).
 *
 * Ancienne fiche : pistes personnage (`× 30`) et serment (`× 10`) résolues, on retient le niveau
 * le plus élevé (à égalité, la fraction la plus avancée), jamais l'addition ; puis
 * `xp = min(xpMax − 1, max(0, ceil(fraction × xpMax − 1e-10)))`.
 * Si le niveau retenu dépasse l'ancien : `xMax += Δ × gain`, déficit conservé, un personnage à
 * 0 PV reste à 0 PV, les bonus de maximum existants sont conservés.
 * L'objet source n'est pas modifié.
 */
export function normalizeLegacyProgression(
	record: LegacyProgressionRecord | null | undefined,
	resolveGrowth: GrowthResolver = (name) => growthFor(name)
): NormalizedProgressionRecord {
	const source: LegacyProgressionRecord =
		record && typeof record === 'object' && !Array.isArray(record) ? record : {};
	const out: Record<string, unknown> = { ...source };
	const oldLevel = levelNumber(out.level);
	const alreadyUnified = finiteOr(out.progressionVersion, 0) >= PROGRESSION_VERSION;
	let level: number;
	let max: number;
	let xp: number;
	if (!alreadyUnified) {
		const characterTrack = legacyTrack(oldLevel, out.xp, out.xpMax, XP_PER_LEVEL);
		const oathTrack = legacyTrack(out.sLevel, out.sXp, out.sXpMax, 10);
		const chosen =
			oathTrack.level > characterTrack.level ||
			(oathTrack.level === characterTrack.level && oathTrack.fraction > characterTrack.fraction)
				? oathTrack
				: characterTrack;
		level = chosen.level;
		max = xpMax(level);
		xp = Math.min(max - 1, Math.max(0, Math.ceil(chosen.fraction * max - 1e-10)));
	} else {
		level = oldLevel;
		max = xpMax(level);
		xp = Math.max(0, Math.floor(finiteOr(out.xp, 0)));
	}
	out.level = level;
	out.xpMax = max;
	out.xp = xp;

	const delta = level - oldLevel;
	if (delta > 0) {
		const oathName =
			typeof out.classe === 'string' && out.classe
				? out.classe
				: typeof out.class === 'string'
					? out.class
					: '';
		const resolved = resolveGrowth(oathName) ?? {};
		const growth: Growth = {
			pvN: finiteOr(resolved.pvN, 0),
			epN: finiteOr(resolved.epN, 0),
			emN: finiteOr(resolved.emN, 0)
		};
		const resources: Array<['pv' | 'ep' | 'em', number, keyof Growth]> = [
			['pv', BASE_STATS.pv, 'pvN'],
			['ep', BASE_STATS.ep, 'epN'],
			['em', BASE_STATS.em, 'emN']
		];
		for (const [stat, base, gainKey] of resources) {
			const gain = Math.max(0, finiteOr(growth[gainKey], 0));
			const maxKey = `${stat}Max`;
			const curKey = `${stat}Cur`;
			const oldMaximum = Math.max(
				stat === 'pv' ? 1 : 0,
				finiteOr(out[maxKey], finiteOr(out[curKey], base + gain * (oldLevel - 1)))
			);
			const current = Math.max(0, finiteOr(out[curKey], oldMaximum));
			const nextMaximum = oldMaximum + delta * gain;
			out[maxKey] = nextMaximum;
			// Ressources dépensées conservées ; un personnage KO n'est jamais relevé.
			out[curKey] =
				stat === 'pv' && current === 0 ? 0 : Math.max(0, nextMaximum - (oldMaximum - current));
		}
	}
	out.progressionVersion = Math.max(
		PROGRESSION_VERSION,
		Math.floor(finiteOr(out.progressionVersion, PROGRESSION_VERSION))
	);
	delete out.sLevel;
	delete out.sXp;
	delete out.sXpMax;
	return out as NormalizedProgressionRecord;
}

/**
 * Clamps des ressources après migration (`_normalizePlayerRecord`, main.js:713-720) :
 * `xpMax ≥ 1`, `xp ≥ 0`, `pvMax ≥ 1` (repli `pvCur` puis 30), `epMax/emMax ≥ 0` (repli 50 / 20),
 * `xCur ≥ 0` (repli `xMax`), valeurs entières.
 */
export function clampResources(record: Record<string, unknown>): ProgressionState & { xpMax: number } {
	const level = levelNumber(record.level);
	const max = Math.max(1, Math.floor(finiteOr(record.xpMax, xpMax(level))));
	const xp = Math.max(0, Math.floor(finiteOr(record.xp, 0)));
	const pvMax = Math.max(1, Math.floor(finiteOr(record.pvMax, finiteOr(record.pvCur, BASE_STATS.pv))));
	const pvCur = Math.max(0, Math.floor(finiteOr(record.pvCur, pvMax)));
	const epMax = Math.max(0, Math.floor(finiteOr(record.epMax, finiteOr(record.epCur, BASE_STATS.ep))));
	const epCur = Math.max(0, Math.floor(finiteOr(record.epCur, epMax)));
	const emMax = Math.max(0, Math.floor(finiteOr(record.emMax, finiteOr(record.emCur, BASE_STATS.em))));
	const emCur = Math.max(0, Math.floor(finiteOr(record.emCur, emMax)));
	return { level, xp, xpMax: max, pvMax, pvCur, epMax, epCur, emMax, emCur };
}

/** Fiche neuve au niveau 1 : 0/30 XP, 30/50/20. audit 02 §1.3, main.js:9468-9487 */
export function newProgressionState(): ProgressionState {
	return {
		level: 1,
		xp: 0,
		pvCur: BASE_STATS.pv,
		pvMax: BASE_STATS.pv,
		epCur: BASE_STATS.ep,
		epMax: BASE_STATS.ep,
		emCur: BASE_STATS.em,
		emMax: BASE_STATS.em
	};
}
