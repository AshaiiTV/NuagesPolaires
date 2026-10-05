// Dates du carnet : toujours en français (fr-FR) et à l'heure de Paris (Europe/Paris), quel que soit
// le fuseau du serveur ou de l'appareil (06-contrats §A « Vues » ; 03-vision §5.6 « Les dates sont à
// l'heure de Paris. »). Module pur, sans I/O : importable par l'interface et par les domaines serveur
// (textes des lignes de « Dernières pages »).
//
// Toutes les fonctions acceptent une date ISO 8601 (`string`), un `Date` ou un horodatage en
// millisecondes ; une valeur absente ou invalide donne une chaîne vide (l'interface affiche alors sa
// phrase de vide, jamais « Invalid Date »).

export const LOCALE = 'fr-FR';
export const TIME_ZONE = 'Europe/Paris';

export type DateInput = string | number | Date | null | undefined;

/** Convertit l'entrée en `Date` valide, ou `null`. */
export function toDate(value: DateInput): Date | null {
	if (value === null || value === undefined || value === '') return null;
	const d = value instanceof Date ? new Date(value.getTime()) : new Date(value);
	return Number.isFinite(d.getTime()) ? d : null;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(options: Intl.DateTimeFormatOptions, locale = LOCALE): Intl.DateTimeFormat {
	const key = locale + JSON.stringify(options);
	let f = formatters.get(key);
	if (!f) {
		f = new Intl.DateTimeFormat(locale, { timeZone: TIME_ZONE, ...options });
		formatters.set(key, f);
	}
	return f;
}

/** Composantes du calendrier de Paris pour un instant donné. */
export interface ParisParts {
	year: number;
	month: number; // 1-12
	day: number;
	hour: number; // 0-23
	minute: number;
	second: number;
}

/** Lit l'instant dans le calendrier et l'horloge de Paris (heure d'été comprise). */
export function parisParts(value: DateInput): ParisParts | null {
	const d = toDate(value);
	if (!d) return null;
	const parts = formatter(
		{
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric',
			second: 'numeric',
			hourCycle: 'h23'
		},
		'en-US'
	).formatToParts(d);
	const get = (type: Intl.DateTimeFormatPartTypes): number =>
		Number(parts.find((p) => p.type === type)?.value ?? NaN);
	return {
		year: get('year'),
		month: get('month'),
		day: get('day'),
		hour: get('hour') % 24,
		minute: get('minute'),
		second: get('second')
	};
}

/** Décalage de Paris par rapport à UTC à cet instant, en minutes (+60 l'hiver, +120 l'été). */
export function parisOffsetMinutes(value: DateInput): number {
	const d = toDate(value);
	const p = parisParts(d);
	if (!d || !p) return 0;
	const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
	const instant = Math.floor(d.getTime() / 1000) * 1000;
	return Math.round((wall - instant) / 60000);
}

/**
 * Interprète une heure murale de Paris (`2030-01-01T20:00`, valeur d'un champ `datetime-local`)
 * et renvoie l'instant correspondant. Au changement d'heure de printemps, une heure inexistante
 * (02:30) glisse d'une heure (03:30) ; à l'automne, l'heure ambiguë prend la première occurrence
 * (heure d'été). Renvoie `null` si la saisie n'a pas cette forme.
 */
export function parisLocalToDate(local: string): Date | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(local.trim());
	if (!m) return null;
	const [, y, mo, d, h, mi, s] = m;
	const wall = Date.UTC(
		Number(y),
		Number(mo) - 1,
		Number(d),
		Number(h),
		Number(mi),
		Number(s ?? 0)
	);
	if (!Number.isFinite(wall)) return null;
	const check = new Date(wall);
	if (
		check.getUTCFullYear() !== Number(y) ||
		check.getUTCMonth() !== Number(mo) - 1 ||
		check.getUTCDate() !== Number(d) ||
		Number(h) > 23 ||
		Number(mi) > 59
	) {
		return null;
	}
	// Décalages de part et d'autre (au plus un changement d'heure en 48 h) : chaque décalage donne
	// un instant candidat ; on garde ceux dont l'heure murale retombe sur la saisie.
	const before = parisOffsetMinutes(wall - 86_400_000);
	const after = parisOffsetMinutes(wall + 86_400_000);
	const lands = (instant: number): boolean => {
		const p = parisParts(instant);
		return p !== null && Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) === wall;
	};
	const candidates = [wall - before * 60000, wall - after * 60000].filter(lands);
	// Automne (deux occurrences) : la plus tôt ; printemps (aucune) : décalage d'avant le saut.
	return new Date(candidates.length > 0 ? Math.min(...candidates) : wall - before * 60000);
}

/** Formate pour un champ `datetime-local` (heure murale de Paris) : `2030-01-01T20:00`. */
export function versChampLocal(value: DateInput): string {
	const p = parisParts(value);
	if (!p) return '';
	const two = (n: number) => String(n).padStart(2, '0');
	return `${p.year}-${two(p.month)}-${two(p.day)}T${two(p.hour)}:${two(p.minute)}`;
}

/** « samedi 26 septembre » (jour de la semaine, jour, mois). */
export function jour(value: DateInput): string {
	const d = toDate(value);
	return d ? premier(formatter({ weekday: 'long', day: 'numeric', month: 'long' }), d) : '';
}

/** Le premier jour du mois est ordinal en français, dans tous les formats du carnet. */
function premier(f: Intl.DateTimeFormat, d: Date): string {
	return f
		.formatToParts(d)
		.map((p) => (p.type === 'day' && p.value === '1' ? '1er' : p.value))
		.join('');
}

/** « samedi » (jour de la semaine seul). */
export function jourSemaine(value: DateInput): string {
	const d = toDate(value);
	return d ? formatter({ weekday: 'long' }).format(d) : '';
}

/** « 21:14 » — heure de relevé, tabulaire. */
export function heure(value: DateInput): string {
	const p = parisParts(value);
	if (!p) return '';
	return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

/** « 20 h » ou « 20 h 30 » — heure d'un rendez-vous dans la voix du carnet (03-vision §5.2). */
export function heureRonde(value: DateInput): string {
	const p = parisParts(value);
	if (!p) return '';
	return p.minute === 0 ? `${p.hour} h` : `${p.hour} h ${String(p.minute).padStart(2, '0')}`;
}

/**
 * « 26 septembre » ; l'année est ajoutée quand elle diffère de l'année en cours à Paris
 * (« 26 septembre 2025 »).
 */
export function dateLongue(value: DateInput, now: DateInput = Date.now()): string {
	const d = toDate(value);
	if (!d) return '';
	const p = parisParts(d);
	const n = parisParts(now);
	const sameYear = !!p && !!n && p.year === n.year;
	return premier(
		formatter(
			sameYear
				? { day: 'numeric', month: 'long' }
				: { day: 'numeric', month: 'long', year: 'numeric' }
		),
		d
	);
}

/** « 26 sept. » (marge, tampons, agenda). L'année s'ajoute si elle diffère de l'année en cours. */
export function dateCourte(value: DateInput, now: DateInput = Date.now()): string {
	const d = toDate(value);
	if (!d) return '';
	const p = parisParts(d);
	const n = parisParts(now);
	const sameYear = !!p && !!n && p.year === n.year;
	return premier(
		formatter(
			sameYear
				? { day: 'numeric', month: 'short' }
				: { day: 'numeric', month: 'short', year: 'numeric' }
		),
		d
	);
}

/** « 26 septembre, 21:47 » — format du tampon (03-vision §8, micro-texte 16). */
export function dateHeure(value: DateInput, now: DateInput = Date.now()): string {
	const d = toDate(value);
	return d ? `${dateLongue(d, now)}, ${heure(d)}` : '';
}

/** « septembre 2026 » — repère de mois de l'agenda et des pages groupées par mois. */
export function mois(value: DateInput): string {
	const d = toDate(value);
	return d ? formatter({ month: 'long', year: 'numeric' }).format(d) : '';
}

/** Numéro de jour du calendrier de Paris (jours depuis l'époque), pour comparer des journées. */
function parisDayNumber(value: DateInput): number | null {
	const p = parisParts(value);
	return p ? Date.UTC(p.year, p.month - 1, p.day) / 86_400_000 : null;
}

/** Écart en jours calendaires de Paris entre `now` et `value` (positif = dans le futur). */
export function joursCalendaires(value: DateInput, now: DateInput = Date.now()): number | null {
	const a = parisDayNumber(value);
	const b = parisDayNumber(now);
	return a === null || b === null ? null : a - b;
}

const relativeFormatter = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });

/**
 * Temps relatif : « à l'instant », « il y a 5 minutes », « il y a 3 heures », « hier »,
 * « avant-hier », « il y a 12 jours », « demain », « dans 3 jours »… Les jours se comptent en
 * journées calendaires de Paris (un changement d'heure ne décale jamais d'un jour).
 */
export function relatif(value: DateInput, now: DateInput = Date.now()): string {
	const d = toDate(value);
	const n = toDate(now);
	if (!d || !n) return '';
	const diffMs = d.getTime() - n.getTime();
	const abs = Math.abs(diffMs);
	if (abs < 60_000) return 'à l’instant';
	const days = joursCalendaires(d, n) ?? 0;
	if (days === 0) {
		if (abs < 3_600_000) return relativeFormatter.format(Math.trunc(diffMs / 60_000), 'minute');
		return relativeFormatter.format(Math.trunc(diffMs / 3_600_000), 'hour');
	}
	if (Math.abs(days) < 60) return relativeFormatter.format(days, 'day');
	const months = Math.trunc(days / 30);
	if (Math.abs(months) < 12) return relativeFormatter.format(months, 'month');
	return relativeFormatter.format(Math.trunc(days / 365), 'year');
}
