import { describe, expect, it } from 'vitest';
import {
	burnPasswordCheck,
	hashPassword,
	needsRehash,
	passwordHashFormat,
	randomSecret,
	sha256Hex,
	verifyPassword
} from './password';
import { legacyPbkdf2Hash, legacySha256 } from './testing';
import { pbkdf2Sync } from 'node:crypto';

// Vecteur figé, calculé avec la convention legacy (auth.js:151-158) :
// pbkdf2Sync(hexSha256('Mot-de-passe-1'), '<sel hex en tant que CHAÎNE>', 100000, 64, 'sha512').
const LEGACY_PASSWORD = 'Mot-de-passe-1';
const LEGACY_SHA = '75351391661bd78f2f16ec4016ac63951adf56e66baa652db0e0acbb39598753';
const LEGACY_SALT = '3f1c9a7e5b2d4c6e8a0f1b3d5e7c9a2b4d6f8e0a1c3b5d7f9e2a4c6b8d0f1e3a';
const LEGACY_PBKDF2 =
	'pbkdf2:3f1c9a7e5b2d4c6e8a0f1b3d5e7c9a2b4d6f8e0a1c3b5d7f9e2a4c6b8d0f1e3a:d95f6d2d89649ae5ab33a01acca69efcbf351c05e2397d266d6f395a5422ad1035dea0e3e59c8520ec074b0113159afed20bf39e06c1b54cca35d7677018a149';

describe('scrypt (format courant, 04 §4)', () => {
	it('produit scrypt$32768$8$1$<sel 16 o>$<clé 64 o> et le vérifie', async () => {
		const hash = await hashPassword('correct horse battery');
		const m = /^scrypt\$32768\$8\$1\$([A-Za-z0-9+/=]+)\$([A-Za-z0-9+/=]+)$/.exec(hash);
		expect(m).not.toBeNull();
		expect(Buffer.from(m![1], 'base64')).toHaveLength(16);
		expect(Buffer.from(m![2], 'base64')).toHaveLength(64);
		expect(await verifyPassword('correct horse battery', hash)).toBe(true);
		expect(await verifyPassword('correct horse batterz', hash)).toBe(false);
		expect(passwordHashFormat(hash)).toBe('scrypt');
		expect(needsRehash(hash)).toBe(false);
	});

	it('sale chaque hash différemment', async () => {
		expect(await hashPassword('même')).not.toBe(await hashPassword('même'));
	});

	it('refuse un mot de passe vide ou démesuré', async () => {
		await expect(hashPassword('')).rejects.toThrow();
		await expect(hashPassword('x'.repeat(257))).rejects.toThrow();
		expect(await verifyPassword('', await hashPassword('abc'))).toBe(false);
	});
});

describe('formats hérités (04 §10.9, revue GPT B8)', () => {
	it('le vecteur figé respecte la convention legacy (sel passé comme chaîne)', () => {
		expect(sha256Hex(LEGACY_PASSWORD)).toBe(LEGACY_SHA);
		expect(legacyPbkdf2Hash(LEGACY_PASSWORD, LEGACY_SALT)).toBe(LEGACY_PBKDF2);
	});

	it('vérifie pbkdf2:<selHex>:<hashHex> et refuse un autre mot de passe', async () => {
		expect(passwordHashFormat(LEGACY_PBKDF2)).toBe('pbkdf2');
		expect(await verifyPassword(LEGACY_PASSWORD, LEGACY_PBKDF2)).toBe(true);
		expect(await verifyPassword('Mot-de-passe-2', LEGACY_PBKDF2)).toBe(false);
		expect(needsRehash(LEGACY_PBKDF2)).toBe(true);
	});

	it('un sel DÉCODÉ en octets (mauvaise convention) ne vérifie pas', async () => {
		const wrong = pbkdf2Sync(LEGACY_SHA, Buffer.from(LEGACY_SALT, 'hex'), 100_000, 64, 'sha512').toString('hex');
		expect(await verifyPassword(LEGACY_PASSWORD, `pbkdf2:${LEGACY_SALT}:${wrong}`)).toBe(false);
	});

	it('vérifie sha256:<hex> et hex nu, insensible à la casse de l’hex', async () => {
		const prefixed = legacySha256('Alice-audit-123!');
		expect(await verifyPassword('Alice-audit-123!', prefixed)).toBe(true);
		expect(await verifyPassword('Alice-audit-123!', prefixed.toUpperCase().replace('SHA256:', 'sha256:'))).toBe(true);
		expect(await verifyPassword('alice-audit-123!', prefixed)).toBe(false);
		const bare = prefixed.slice(7);
		expect(passwordHashFormat(bare)).toBe('hex');
		expect(await verifyPassword('Alice-audit-123!', bare)).toBe(true);
		expect(needsRehash(bare)).toBe(true);
		// L'empreinte elle-même n'est pas un mot de passe (fin du pass-the-hash du client legacy).
		expect(await verifyPassword(prefixed, prefixed)).toBe(false);
	});
});

describe('validation stricte des formats', () => {
	const malformed: (string | null | undefined)[] = [
		null,
		undefined,
		'',
		'scrypt$',
		'scrypt$1048576$8$1$AAAAAAAAAAAAAAAAAAAAAA==$' + 'A'.repeat(86) + '==', // N = 2^20 > 2^17
		'scrypt$32768$64$1$AAAAAAAAAAAAAAAAAAAAAA==$' + 'A'.repeat(86) + '==', // r hors bornes
		'scrypt$30000$8$1$AAAAAAAAAAAAAAAAAAAAAA==$' + 'A'.repeat(86) + '==', // N non puissance de 2
		'scrypt$32768$8$1$AAAA$' + 'A'.repeat(86) + '==', // sel trop court
		'pbkdf2:zz:00',
		'pbkdf2:abcd:' + 'a'.repeat(128) + ':extra',
		'pbkdf2:' + 'a'.repeat(64) + ':' + 'a'.repeat(127),
		'sha256:abc',
		'sha256:' + 'g'.repeat(64),
		'a'.repeat(63),
		'x'.repeat(10_000)
	];

	it.each(malformed.map((m) => [String(m).slice(0, 40), m]))('« %s » ⇒ false, sans exception', async (_label, stored) => {
		const started = Date.now();
		expect(passwordHashFormat(stored as string)).toBe('invalid');
		expect(await verifyPassword('peu importe', stored as string)).toBe(false);
		expect(Date.now() - started).toBeLessThan(1000);
		expect(needsRehash(stored as string)).toBe(true);
	});
});

describe('utilitaires', () => {
	it('secret temporaire : 24 octets base64url = 32 caractères [A-Za-z0-9_-] (audit 06 A7)', () => {
		const s = randomSecret();
		expect(s).toMatch(/^[A-Za-z0-9_-]{32}$/);
		expect(randomSecret()).not.toBe(s);
	});

	it('la vérification factice se termine sans erreur', async () => {
		await expect(burnPasswordCheck('quelconque')).resolves.toBeUndefined();
	});
});
