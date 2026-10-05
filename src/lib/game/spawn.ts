/**
 * Règles d'apparition (« Labo d'apparitions staff ») — module pur, sans I/O.
 *
 * Sources : audit 03 §10 (formules exactes) et legacy/assets/js/main.js
 * l. 13849-14260 (`_spawnLabBaseWeight`, `_spawnLabQtyRange`,
 * `_spawnLabAdjustedWeight`, `_spawnLabPickWeighted`, `_spawnLabGenerateEncounter`).
 * Le hasard est injecté (`rng: () => number` dans [0, 1[), ce qui permet de
 * tester les distributions.
 *
 * Aucun import de `$lib/server` : ce fichier est partagé client/serveur.
 */

// ─── Coefficients ────────────────────────────────────────────────────────────

/** Fatigue : 1 + over × 0.22 (audit 03 §10.3 / legacy main.js:13861). */
export const CUMULATIVE_COEF = 0.22;
/** Rattrapage : 1 + under × 0.14 (audit 03 §10.3 / legacy main.js:13862). */
export const CATCHUP_COEF = 0.14;
/** Pénalité « déjà tiré dans cette rencontre » : 1 + n × 0.95 (legacy main.js:13863). */
export const SAME_ENCOUNTER_COEF = 0.95;
/** Multiplicateur si la créature est déjà dans la rencontre et pool > 1 (legacy main.js:14137). */
export const SAME_ENCOUNTER_MULT = 0.55;
/** Un candidat n'est retenu que si son poids dépasse ce seuil (legacy main.js:14181). */
export const MIN_CANDIDATE_WEIGHT = 0.5;
/** Nombre de runs conservés dans l'historique (audit 03 §10.1). */
export const MAX_LAST_RUNS = 24;
/** Nombre maximal de zones personnalisées (audit 03 §10.2 / legacy main.js:13895). */
export const MAX_CUSTOM_ZONES = 80;
/** Quantité maximale transférée vers un pré-combat (audit 03 §10.6). */
export const MAX_TRANSFER_QTY = 30;

/** Zones par défaut : noms de salons Discord (audit 03 §10.2 / legacy main.js:13854-13860). */
export const DEFAULT_ZONES: readonly string[] = [
	'[🌳]-forêt-aux-lianes',
	'[🌳]-forêt-aux-arbres-sombres',
	'[🌳]-arbre-géant',
	'[🌳]-forêt-centre',
	'[🌳]-lisière-du-canyon'
];

/** Libellé de la zone virtuelle des créatures sans zone (legacy main.js:14062). */
export const NO_ZONE_LABEL = 'Sans zone';
/** Valeur technique de « Sans zone » (legacy main.js:14066). */
export const NO_ZONE_VALUE = '__none__';
/** Valeur technique « Toutes zones », uniquement s'il n'existe aucune option (legacy main.js:14091). */
export const ALL_ZONES_VALUE = '__all__';
export const ALL_ZONES_LABEL = 'Toutes zones';

// ─── Comportements ───────────────────────────────────────────────────────────

export type BehaviorLabel = 'Gibier' | 'Passif' | 'Neutre' | 'Agressif' | 'Très agressif' | 'Boss';

/** Table `BHL` des alias de comportement (legacy main.js:7427-7440, audit 04 §3). */
const BEHAVIOR_ALIASES: Record<string, BehaviorLabel> = {
	passive: 'Passif',
	passif: 'Passif',
	neutre: 'Neutre',
	neutral: 'Neutre',
	agressif: 'Agressif',
	aggressive: 'Agressif',
	'tres agressif': 'Très agressif',
	very_aggressive: 'Très agressif',
	gibier: 'Gibier',
	prey: 'Gibier',
	boss: 'Boss'
};

/** Clé normalisée d'un comportement (`cBehaviorKey`, legacy main.js:7443-7448). */
export function behaviorKey(raw: unknown): string {
	return String(raw ?? '')
		.trim()
		.toLowerCase()
		.replace(/[’']/g, '')
		.replace(/\s+/g, ' ')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '');
}

/**
 * Libellé canonique d'un comportement (`cBehaviorLabel`, legacy main.js:7451-7454).
 * Les formulaires legacy stockaient aussi un indice 1..5 (legacy main.js:9610) :
 * `["", "Gibier", "Passif", "Neutre", "Agressif", "Très agressif"]`.
 * Une valeur inconnue renvoie `null` (traitée comme Neutre pour les poids).
 */
export function behaviorLabel(raw: unknown): BehaviorLabel | null {
	if (typeof raw === 'number' || /^[1-5]$/.test(String(raw ?? '').trim())) {
		const idx = Number(raw);
		const byIndex: (BehaviorLabel | null)[] = [
			null,
			'Gibier',
			'Passif',
			'Neutre',
			'Agressif',
			'Très agressif'
		];
		return byIndex[idx] ?? null;
	}
	return BEHAVIOR_ALIASES[behaviorKey(raw)] ?? null;
}

/** Multiplicateur de comportement (`_spawnLabBehaviorMult`, legacy main.js:14019-14029). */
export function behaviorMultiplier(raw: unknown): number {
	switch (behaviorLabel(raw)) {
		case 'Gibier':
			return 1.08;
		case 'Passif':
			return 0.92;
		case 'Neutre':
			return 1;
		case 'Agressif':
			return 1.12;
		case 'Très agressif':
			return 1.2;
		case 'Boss':
			return 0.4;
		default:
			return 1;
	}
}

// ─── Types ───────────────────────────────────────────────────────────────────

/** Projection minimale d'une créature nécessaire au tirage (colonnes `beasts`, 04-architecture §3.4). */
export interface SpawnBeast {
	id: string;
	name: string;
	level: number;
	behavior: string | number | null;
	hidden?: boolean;
	archived?: boolean;
	/** Poids explicite ; `null`/`0` ⇒ poids calculé (audit 03 §10.3). */
	spawnWeight?: number | null;
	/** Bornes de quantité saisies ; valides si min > 0 et max ≥ min (audit 03 §10.4). */
	qtyMin?: number | null;
	qtyMax?: number | null;
	zones?: readonly string[] | null;
}

/** Historique global partagé : sorties cumulées par créature (`totals`, audit 03 §10.1). */
export interface SpawnHistory {
	totals: Readonly<Record<string, number>>;
}

export type Rng = () => number;

export interface QtyRange {
	min: number;
	max: number;
}

/** Détail du poids dynamique d'un candidat (affiché « Poids dynamique », audit 03 §10.5). */
export interface WeightDetail {
	beastId: string;
	weight: number;
	base: number;
	count: number;
	avg: number;
	catchup: number;
	fatigue: number;
	/** Probabilité de tirage parmi les candidats retenus (0 si non retenu). */
	prob: number;
	/** Retenu si `weight > MIN_CANDIDATE_WEIGHT`. */
	eligible: boolean;
}

/** Un groupe tiré (`packs[]` de `spawn_lab_staff`, audit 03 §10.1). */
export interface SpawnPack {
	id: string;
	name: string;
	level: number;
	behavior: BehaviorLabel | null;
	hidden: boolean;
	qty: number;
	prob: number;
	/** Sorties cumulées AVANT ce tirage. */
	total: number;
	range: QtyRange;
	baseWeight: number;
	weightNow: number;
	catchup: number;
	fatigue: number;
}

export interface Encounter {
	packs: SpawnPack[];
	/** Historique mis à jour (`totals[id] += qty`). */
	totals: Record<string, number>;
	/** Poids de tous les membres du pool au moment du tirage (pour la légende des poids). */
	weights: WeightDetail[];
}

export interface ZoneOption {
	value: string;
	label: string;
}

// ─── Zones ───────────────────────────────────────────────────────────────────

/**
 * Liste de zones normalisée : défauts en tête, dédoublonnée, 80 max
 * (`_spawnLabNormalizeZoneList`, legacy main.js:13886-13896).
 */
export function normalizeZoneList(list: readonly unknown[] | null | undefined): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const raw of [...DEFAULT_ZONES, ...(Array.isArray(list) ? list : [])]) {
		const z = String(raw ?? '').trim();
		if (!z || seen.has(z)) continue;
		seen.add(z);
		out.push(z);
	}
	return out.slice(0, MAX_CUSTOM_ZONES);
}

/** Zones d'une créature, ou `['Sans zone']` (`_spawnLabBeastZones`, legacy main.js:14059-14063). */
export function beastZones(beast: Pick<SpawnBeast, 'zones'>): string[] {
	const zones = (Array.isArray(beast.zones) ? beast.zones : [])
		.map((z) => String(z ?? '').trim())
		.filter(Boolean);
	return zones.length ? zones : [NO_ZONE_LABEL];
}

export function zoneValue(label: string): string {
	const l = String(label ?? '').trim();
	return l === NO_ZONE_LABEL ? NO_ZONE_VALUE : l;
}

export function zoneLabel(value: string): string {
	const v = String(value ?? '').trim();
	return v === NO_ZONE_VALUE ? NO_ZONE_LABEL : v;
}

/**
 * Options de zone = zones custom (défauts inclus) ∪ zones des créatures visibles ;
 * tri français, « Sans zone » en dernier (`_spawnLabZoneOptions`, legacy main.js:14073-14090).
 */
export function zoneOptions(
	customZones: readonly string[] | null | undefined,
	beasts: readonly SpawnBeast[]
): ZoneOption[] {
	const seen = new Set<string>();
	const labels: string[] = [];
	for (const label of normalizeZoneList(customZones)) {
		if (!seen.has(label)) {
			seen.add(label);
			labels.push(label);
		}
	}
	for (const b of beasts) {
		if (!b || b.hidden || b.archived) continue;
		for (const label of beastZones(b)) {
			if (!seen.has(label)) {
				seen.add(label);
				labels.push(label);
			}
		}
	}
	labels.sort((a, b) => {
		if (a === NO_ZONE_LABEL) return 1;
		if (b === NO_ZONE_LABEL) return -1;
		return a.localeCompare(b, 'fr', { sensitivity: 'base' });
	});
	return labels.map((label) => ({ value: zoneValue(label), label }));
}

/**
 * Résout la zone courante : première option si inconnue ; « Toutes zones »
 * seulement s'il n'y a aucune option (`_spawnLabResolveZone`, legacy main.js:14091-14098).
 */
export function resolveZone(
	current: string | null | undefined,
	options: readonly ZoneOption[]
): ZoneOption {
	if (!options.length) return { value: ALL_ZONES_VALUE, label: ALL_ZONES_LABEL };
	const wanted = String(current ?? '').trim();
	return options.find((o) => o.value === wanted) ?? options[0]!;
}

/**
 * Pool d'une zone = créatures visibles dont les zones contiennent le libellé
 * (`_spawnLabZonePool`, legacy main.js:14099-14107). `__all__` ⇒ toutes les visibles.
 * Les créatures archivées (nouveau statut, 04-architecture §3.4) sont exclues comme les masquées.
 */
export function zonePool<B extends SpawnBeast>(zone: string, beasts: readonly B[]): B[] {
	const z = String(zone ?? '').trim();
	const visible = beasts.filter((b) => b && !b.hidden && !b.archived);
	if (z === ALL_ZONES_VALUE) return visible;
	const label = zoneLabel(z);
	return visible.filter((b) => beastZones(b).includes(label));
}

// ─── Pondération ─────────────────────────────────────────────────────────────

function beastLevel(beast: Pick<SpawnBeast, 'level'>): number {
	const lvl = Math.trunc(Number(beast.level));
	return Math.max(1, Number.isFinite(lvl) ? lvl : 1);
}

/**
 * Poids de base (`_spawnLabBaseWeight`, legacy main.js:14030-14040, audit 03 §10.3) :
 * poids explicite > 0 arrondi (un poids dans ]0, 0.5[ donne donc 0, quirk legacy conservé),
 * sinon 96 × behMult × levelFactor, Boss plafonné à 22, plancher 8.
 */
export function baseWeight(beast: Pick<SpawnBeast, 'level' | 'behavior' | 'spawnWeight'>): number {
	const explicit = beast.spawnWeight;
	if (explicit !== undefined && explicit !== null) {
		const n = Number(explicit);
		if (Number.isFinite(n) && n > 0) return Math.round(n);
	}
	const lvl = beastLevel(beast);
	const levelFactor = Math.max(0.24, 1.42 - (lvl - 1) * 0.09);
	let base = 96 * behaviorMultiplier(beast.behavior) * levelFactor;
	if (behaviorLabel(beast.behavior) === 'Boss') base = Math.min(base, 22);
	return Math.max(8, Math.round(base));
}

/**
 * Fourchette de quantité (`_spawnLabQtyRange`, legacy main.js:14041-14058, audit 03 §10.4).
 * Les bornes saisies (`qtyMin`/`qtyMax`, colonnes `qty_min`/`qty_max`) priment si valides ;
 * le legacy lisait `spawnMin/spawnMax` jamais renseignés (dette signalée audit 03 §10.4).
 */
export function qtyRange(
	beast: Pick<SpawnBeast, 'level' | 'behavior' | 'qtyMin' | 'qtyMax'>
): QtyRange {
	const minV = Math.trunc(Number(beast.qtyMin));
	const maxV = Math.trunc(Number(beast.qtyMax));
	if (Number.isFinite(minV) && Number.isFinite(maxV) && maxV >= minV && minV > 0) {
		return { min: minV, max: maxV };
	}
	const lvl = beastLevel(beast);
	const beh = behaviorLabel(beast.behavior);
	let min = 1;
	let max = 2;
	if (beh === 'Gibier') max = 4;
	else if (beh === 'Passif') max = 3;
	else if (beh === 'Neutre') max = 3;
	else if (beh === 'Agressif') max = 2;
	else if (beh === 'Très agressif') max = 2;
	else if (beh === 'Boss') max = 1;
	if (lvl <= 2) max += 1;
	else if (lvl >= 7) max = Math.max(2, max - 1);
	if (beh === 'Gibier' && lvl <= 2) max += 1;
	if (lvl >= 9 || beh === 'Boss') {
		min = 1;
		max = 1;
	}
	return { min, max: Math.max(min, max) };
}

/** Bornes réellement lues par l’ancien tirage ; les qtyMin/qtyMax saisis étaient ignorés. */
export function legacyQtyRange(
	level: number,
	behavior: unknown,
	spawnMin?: unknown,
	spawnMax?: unknown
): QtyRange {
	return qtyRange({
		level,
		// Le legacy ne traduisait pas les indices numériques avant le tirage.
		behavior: /^[1-5]$/.test(String(behavior).trim()) ? 'indice hérité' : String(behavior ?? ''),
		qtyMin: Number.parseInt(String(spawnMin ?? ''), 10),
		qtyMax: Number.parseInt(String(spawnMax ?? ''), 10)
	});
}

function countOf(counts: Readonly<Record<string, number>> | undefined, id: string): number {
	const n = Math.trunc(Number(counts?.[id]));
	return Number.isFinite(n) ? n : 0;
}

/** Moyenne des sorties sur le pool (`_spawnLabAverageCount`, legacy main.js:14119-14125). */
export function averageCount(
	pool: readonly SpawnBeast[],
	totals: Readonly<Record<string, number>>
): number {
	if (!pool.length) return 0;
	let sum = 0;
	for (const b of pool) sum += countOf(totals, b.id);
	return sum / pool.length;
}

/**
 * Poids dynamique d'une créature dans un pool
 * (`_spawnLabAdjustedWeight`, legacy main.js:14126-14138, audit 03 §10.3) :
 * weight = base × catchup / (fatigue × encounterPenalty), × 0.55 si déjà dans la rencontre et pool > 1.
 */
export function adjustedWeight(
	beast: SpawnBeast,
	pool: readonly SpawnBeast[],
	totals: Readonly<Record<string, number>>,
	encounterCounts: Readonly<Record<string, number>> = {}
): Omit<WeightDetail, 'prob'> {
	const base = baseWeight(beast);
	const count = countOf(totals, beast.id);
	const avg = averageCount(pool, totals);
	const over = Math.max(0, count - avg);
	const under = Math.max(0, avg - count);
	const fatigue = 1 + over * CUMULATIVE_COEF;
	const catchup = 1 + under * CATCHUP_COEF;
	const already = countOf(encounterCounts, beast.id);
	const encounterPenalty = 1 + already * SAME_ENCOUNTER_COEF;
	let weight = (base * catchup) / (fatigue * encounterPenalty);
	if (already > 0 && pool.length > 1) weight *= SAME_ENCOUNTER_MULT;
	return {
		beastId: beast.id,
		weight,
		base,
		count,
		avg,
		catchup,
		fatigue,
		eligible: weight > MIN_CANDIDATE_WEIGHT
	};
}

/** Tirage proportionnel (`_spawnLabPickWeighted`, legacy main.js:14108-14118). */
export function pickWeighted<T extends { weight: number }>(list: readonly T[], rng: Rng): T | null {
	let total = 0;
	for (const x of list) total += x.weight;
	if (total <= 0) return null;
	const roll = rng() * total;
	let acc = 0;
	let chosen: T | null = list[0] ?? null;
	for (const x of list) {
		acc += x.weight;
		if (roll <= acc) {
			chosen = x;
			break;
		}
	}
	return chosen;
}

/** Entier uniforme dans [min, max] (`_spawnLabRollQty`, legacy main.js:14164-14170). */
export function rollQty(min: number, max: number, rng: Rng): number {
	if (max <= min) return min;
	const span = max - min + 1;
	const n = min + Math.floor(rng() * span);
	return n > max ? max : n;
}

/**
 * Tirage d'une rencontre dans une zone : **un seul groupe par roll**
 * (`_spawnLabGenerateEncounter`, legacy main.js:14171-14210, audit 03 §10.5).
 *
 * @param zone valeur de zone (libellé, `__none__` ou `__all__`)
 * @param beasts catalogue (les masquées/archivées sont exclues ici)
 * @param history historique global (`totals`)
 * @param rng générateur dans [0, 1[
 * @returns `null` si le pool est vide (« Aucun mob dans cette zone. ») ou si aucun
 *          candidat ne dépasse le seuil (« Aucun tirage possible. »).
 */
export function drawEncounter(
	zone: string,
	beasts: readonly SpawnBeast[],
	history: SpawnHistory,
	rng: Rng
): Encounter | null {
	const pool = zonePool(zone, beasts);
	if (!pool.length) return null;

	const totals: Record<string, number> = {};
	for (const [id, n] of Object.entries(history.totals ?? {})) {
		const v = Math.trunc(Number(n));
		if (Number.isFinite(v) && v > 0) totals[id] = v;
	}
	const encounterCounts: Record<string, number> = {};

	const details = pool.map((b) => ({
		beast: b,
		...adjustedWeight(b, pool, totals, encounterCounts)
	}));
	const cands = details.filter((d) => d.eligible);
	const sum = cands.reduce((s, c) => s + c.weight, 0);
	const weights: WeightDetail[] = details.map(({ beast: _b, ...d }) => ({
		...d,
		prob: d.eligible && sum > 0 ? d.weight / sum : 0
	}));

	const chosen = pickWeighted(cands, rng);
	if (!chosen) return null;

	const range = qtyRange(chosen.beast);
	const qty = rollQty(range.min, range.max, rng);
	const pack: SpawnPack = {
		id: chosen.beast.id,
		name: chosen.beast.name,
		level: beastLevel(chosen.beast),
		behavior: behaviorLabel(chosen.beast.behavior),
		hidden: !!chosen.beast.hidden,
		qty,
		prob: sum > 0 ? chosen.weight / sum : 0,
		total: chosen.count,
		range,
		baseWeight: chosen.base,
		weightNow: chosen.weight,
		catchup: chosen.catchup,
		fatigue: chosen.fatigue
	};
	encounterCounts[chosen.beast.id] = qty;
	totals[chosen.beast.id] = (totals[chosen.beast.id] ?? 0) + qty;

	return { packs: [pack], totals, weights };
}

// ─── Présentation ────────────────────────────────────────────────────────────

export type WeightTone = 'Réduit' | 'Stable' | 'Boost';

/** Ton du poids dynamique : ratio < 0.94 → Réduit, > 1.06 → Boost (legacy main.js:14139-14147). */
export function weightTone(baseWeightValue: number, weightNow: number): WeightTone {
	const base = Math.max(1, Math.round(baseWeightValue));
	const current = Math.max(1, Math.round(weightNow));
	const ratio = current / base;
	if (ratio < 0.94) return 'Réduit';
	if (ratio > 1.06) return 'Boost';
	return 'Stable';
}

/** Nom du pré-combat créé par transfert (audit 03 §10.6) : « Apparition — <zone> — JJ/MM/AA HH:MM — <auteur> ». */
export function transferCombatName(zone: string, rolledAt: Date, rolledBy: string): string {
	const dd = String(rolledAt.getDate()).padStart(2, '0');
	const mm = String(rolledAt.getMonth() + 1).padStart(2, '0');
	const yy = String(rolledAt.getFullYear() % 100).padStart(2, '0');
	const hh = String(rolledAt.getHours()).padStart(2, '0');
	const mi = String(rolledAt.getMinutes()).padStart(2, '0');
	return `Apparition — ${zoneLabel(zone)} — ${dd}/${mm}/${yy} ${hh}:${mi} — ${rolledBy}`;
}

/** Récap copiable (audit 03 §10.5) : `**Générateur d'apparitions**` / `Zone <zone>` / `**Roll** — 2x Loup • 1x Ours`. */
export function encounterRecap(
	zone: string,
	packs: readonly Pick<SpawnPack, 'qty' | 'name'>[]
): string {
	const line = packs.map((p) => `${p.qty}x ${p.name}`).join(' • ');
	return `**Générateur d'apparitions**\nZone ${zoneLabel(zone)}\n**Roll** — ${line}`;
}
