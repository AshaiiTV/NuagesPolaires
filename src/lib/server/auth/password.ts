// Mots de passe (04-architecture §4, amendement §10.9 ; audit 05 §4.2 ; revue GPT B8).
//
// Format courant : `scrypt$N$r$p$<selBase64>$<cléBase64>` (N = 2^15, r = 8, p = 1, sel 16 octets,
// clé 64 octets, `maxmem` borné). Le mot de passe ORIGINAL (texte clair reçu sous TLS) est l'entrée.
//
// Formats hérités acceptés à la vérification, ré-encodés en scrypt à la connexion suivante :
//   - `pbkdf2:<selHex>:<hashHex>` = pbkdf2(hexSha256DuMotDePasse SANS préfixe, sel passé COMME CHAÎNE
//     (non décodé), 100 000, 64, 'sha512') — legacy/netlify/functions/auth.js:151-172 (`pbkdf2Hash`,
//     `verifyPassword`) ;
//   - `sha256:<hex>` et hex nu (64) : comparaison à temps constant avec le SHA-256 du mot de passe
//     (legacy auth.js:173-174, client `hashPass` main.js:171-177).
// Validation stricte AVANT tout calcul : un hash malformé renvoie `false`, sans exception ni calcul
// démesuré (paramètres scrypt bornés : N ≤ 2^17, mémoire ≤ 128 Mio).
import {
	createHash,
	pbkdf2 as pbkdf2Callback,
	randomBytes,
	scrypt as scryptCallback,
	timingSafeEqual,
	type ScryptOptions
} from 'node:crypto';

/** Paramètres scrypt courants (04 §4). */
export const SCRYPT_PARAMS = { N: 2 ** 15, r: 8, p: 1, saltBytes: 16, keyBytes: 64 } as const;

/** Bornes acceptées à la vérification (04 §10.9 : N ≤ 2^17). */
const SCRYPT_LIMITS = {
	minLogN: 10,
	maxLogN: 17,
	maxR: 16,
	maxP: 4,
	maxMemoryBytes: 128 * 1024 * 1024
};

/** PBKDF2 hérité (legacy auth.js:148-150). */
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha512';

/** Longueur maximale d'un mot de passe en clair (borne le coût du hachage). */
export const MAX_PASSWORD_LENGTH = 256;

const SCRYPT_RE =
	/^scrypt\$(\d{4,6})\$(\d{1,2})\$(\d)\$([A-Za-z0-9+/]{16,88}={0,2})\$([A-Za-z0-9+/]{43,88}={0,2})$/;
const PBKDF2_RE = /^pbkdf2:([0-9a-f]{16,128}):([0-9a-f]{128})$/i;
const SHA256_PREFIXED_RE = /^sha256:([0-9a-f]{64})$/i;
const HEX64_RE = /^[0-9a-f]{64}$/i;

export type PasswordHashFormat = 'scrypt' | 'pbkdf2' | 'sha256' | 'hex' | 'invalid';

function scryptAsync(
	password: string,
	salt: Buffer,
	keylen: number,
	options: ScryptOptions
): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		scryptCallback(password, salt, keylen, options, (err, key) =>
			err ? reject(err) : resolve(key)
		);
	});
}

function pbkdf2Async(input: string, salt: string): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		pbkdf2Callback(input, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST, (err, key) =>
			err ? reject(err) : resolve(key)
		);
	});
}

/** Mémoire réservée à scrypt : 2 × 128·N·r (64 Mio pour les paramètres courants). */
function maxmemFor(N: number, r: number): number {
	return 2 * 128 * N * r;
}

/** Hex SHA-256 du mot de passe (sans préfixe), comme le client legacy. */
export function sha256Hex(password: string): string {
	return createHash('sha256').update(password, 'utf8').digest('hex');
}

/** Comparaison à temps constant de deux tampons (longueurs différentes ⇒ false). */
function safeEqual(a: Buffer, b: Buffer): boolean {
	if (a.length !== b.length || a.length === 0) return false;
	return timingSafeEqual(a, b);
}

/** Paramètres d'un hash scrypt bien formé et borné, sinon `null`. */
function parseScrypt(
	stored: string
): { N: number; r: number; p: number; salt: Buffer; key: Buffer } | null {
	const m = SCRYPT_RE.exec(stored);
	if (!m) return null;
	const N = Number(m[1]);
	const r = Number(m[2]);
	const p = Number(m[3]);
	const logN = Math.log2(N);
	if (!Number.isInteger(logN) || logN < SCRYPT_LIMITS.minLogN || logN > SCRYPT_LIMITS.maxLogN)
		return null;
	if (r < 1 || r > SCRYPT_LIMITS.maxR || p < 1 || p > SCRYPT_LIMITS.maxP) return null;
	if (128 * N * r > SCRYPT_LIMITS.maxMemoryBytes) return null;
	const salt = Buffer.from(m[4], 'base64');
	const key = Buffer.from(m[5], 'base64');
	if (salt.length < 16 || salt.length > 64) return null;
	if (key.length !== SCRYPT_PARAMS.keyBytes) return null;
	return { N, r, p, salt, key };
}

/** Format d'un hash stocké, après validation stricte. */
export function passwordHashFormat(stored: string | null | undefined): PasswordHashFormat {
	if (typeof stored !== 'string' || stored.length > 400) return 'invalid';
	if (stored.startsWith('scrypt$')) return parseScrypt(stored) ? 'scrypt' : 'invalid';
	if (stored.startsWith('pbkdf2:')) return PBKDF2_RE.test(stored) ? 'pbkdf2' : 'invalid';
	if (stored.startsWith('sha256:')) return SHA256_PREFIXED_RE.test(stored) ? 'sha256' : 'invalid';
	return HEX64_RE.test(stored) ? 'hex' : 'invalid';
}

/** Encode un mot de passe au format courant `scrypt$N$r$p$sel$clé`. */
export async function hashPassword(password: string): Promise<string> {
	if (
		typeof password !== 'string' ||
		password.length === 0 ||
		password.length > MAX_PASSWORD_LENGTH
	) {
		throw new Error('hashPassword : mot de passe vide ou trop long.');
	}
	const { N, r, p, saltBytes, keyBytes } = SCRYPT_PARAMS;
	const salt = randomBytes(saltBytes);
	const key = await scryptAsync(password, salt, keyBytes, { N, r, p, maxmem: maxmemFor(N, r) });
	return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

/**
 * Vérifie un mot de passe en clair contre un hash stocké (courant ou hérité). Ne lève jamais :
 * hash malformé, paramètres hors bornes ou erreur de calcul ⇒ `false`.
 */
export async function verifyPassword(
	password: string,
	stored: string | null | undefined
): Promise<boolean> {
	if (
		typeof password !== 'string' ||
		password.length === 0 ||
		password.length > MAX_PASSWORD_LENGTH
	)
		return false;
	const format = passwordHashFormat(stored);
	try {
		switch (format) {
			case 'scrypt': {
				const parsed = parseScrypt(stored as string);
				if (!parsed) return false;
				const computed = await scryptAsync(password, parsed.salt, parsed.key.length, {
					N: parsed.N,
					r: parsed.r,
					p: parsed.p,
					maxmem: maxmemFor(parsed.N, parsed.r)
				});
				return safeEqual(computed, parsed.key);
			}
			case 'pbkdf2': {
				const m = PBKDF2_RE.exec(stored as string);
				if (!m) return false;
				// Convention legacy exacte : entrée = hex SHA-256 sans préfixe, sel = la CHAÎNE hex.
				const computed = await pbkdf2Async(sha256Hex(password), m[1]);
				return safeEqual(computed, Buffer.from(m[2], 'hex'));
			}
			case 'sha256':
			case 'hex': {
				const hex = (
					format === 'sha256' ? (stored as string).slice(7) : (stored as string)
				).toLowerCase();
				return safeEqual(Buffer.from(sha256Hex(password), 'hex'), Buffer.from(hex, 'hex'));
			}
			default:
				return false;
		}
	} catch {
		return false;
	}
}

/** Vrai si le hash n'est pas au format scrypt courant (format hérité ou paramètres différents). */
export function needsRehash(stored: string | null | undefined): boolean {
	if (passwordHashFormat(stored) !== 'scrypt') return true;
	const parsed = parseScrypt(stored as string);
	if (!parsed) return true;
	return (
		parsed.N !== SCRYPT_PARAMS.N ||
		parsed.r !== SCRYPT_PARAMS.r ||
		parsed.p !== SCRYPT_PARAMS.p ||
		parsed.salt.length !== SCRYPT_PARAMS.saltBytes
	);
}

let dummyHash: Promise<string> | null = null;

/**
 * Vérification factice (compte inconnu) : même coût qu'une vraie vérification scrypt, pour que la
 * durée d'une réponse 401 ne révèle pas l'existence d'un pseudo (audit 05 §4.4 : délai constant).
 */
export async function burnPasswordCheck(password: string): Promise<void> {
	if (!dummyHash) dummyHash = hashPassword('np-dummy-password-for-timing');
	await verifyPassword(password || 'x', await dummyHash);
}

/** Secret aléatoire base64url (24 octets ⇒ 32 caractères `[A-Za-z0-9_-]`, audit 06 A7). */
export function randomSecret(bytes = 24): string {
	return randomBytes(bytes).toString('base64url');
}
