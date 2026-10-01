// Réglages saisis par un administrateur (06-contrats §B.8 ; 04-architecture §3.12 `settings` ;
// 03-vision §12.6) : lien d'invitation Discord du colophon, salon par défaut, texte de contact.
import { asc, eq } from 'drizzle-orm';
import type { z } from 'zod';
import type { Db } from '$lib/server/db';
import { settings } from '$lib/server/db/schema';
import { NpError } from '$lib/server/http';
import { assertCan, type Actor } from '$lib/server/permissions';
import {
	DISCORD_INVITE_PATTERN,
	SETTING_KEYS,
	setSettingSchema,
	type PublicSettingsView,
	type SetSettingInput,
	type SettingKey,
	type SettingView
} from '$lib/schemas/admin';
import { DISCORD_URL_MESSAGE, isDiscordUrl } from '$lib/schemas/reading';
import { appendStaffLog } from './staff-log';
import { recordAudit } from './audit';

function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
	const result = schema.safeParse(input);
	if (!result.success) {
		throw new NpError('INVALID', result.error.issues[0]?.message ?? 'Saisie invalide.', 400);
	}
	return result.data;
}

const INVITE_MESSAGE =
	'Le lien d’invitation doit être une invitation Discord (https://discord.gg/…).';

/** Validation propre à chaque clé ; une valeur vide retire le réglage (le lien disparaît du colophon). */
function validateSetting(key: SettingKey, value: string): void {
	if (value === '') return;
	if (key === 'discord_invite_url' && !DISCORD_INVITE_PATTERN.test(value)) {
		throw new NpError('INVALID', INVITE_MESSAGE, 400);
	}
	if (key === 'discord_default_channel_url' && !isDiscordUrl(value)) {
		throw new NpError('INVALID', DISCORD_URL_MESSAGE, 400);
	}
}

/** Réglages publics (colophon) : lecture libre, visiteur compris. */
export async function getPublicSettings(db: Db): Promise<PublicSettingsView> {
	const [row] = await db
		.select({ value: settings.value })
		.from(settings)
		.where(eq(settings.key, 'discord_invite_url'));
	const invite = row?.value.trim() ?? '';
	return { discordInvite: invite !== '' && DISCORD_INVITE_PATTERN.test(invite) ? invite : null };
}

/** Tous les réglages connus, pour le Registre › Données (administrateur). */
export async function listSettings(db: Db, actor: Actor | null): Promise<SettingView[]> {
	assertCan(actor, 'admin.data');
	const rows = await db.select().from(settings).orderBy(asc(settings.key));
	const byKey = new Map(rows.map((r) => [r.key, r]));
	return SETTING_KEYS.map((key) => {
		const row = byKey.get(key);
		return {
			key,
			value: row?.value ?? '',
			updatedAt: (row?.updatedAt ?? new Date(0)).toISOString()
		};
	});
}

/** Écrit un réglage (administrateur) ; audit et journal staff dans la même transaction. */
export async function setSetting(
	db: Db,
	actor: Actor | null,
	input: SetSettingInput
): Promise<SettingView> {
	const present = assertCan(actor, 'admin.data');
	const data = parse(setSettingSchema, input);
	validateSetting(data.key, data.value);
	return db.transaction(async (tx) => {
		const now = new Date();
		const [row] = await tx
			.insert(settings)
			.values({ key: data.key, value: data.value, updatedBy: present.accountId })
			.onConflictDoUpdate({
				target: settings.key,
				set: { value: data.value, updatedBy: present.accountId, updatedAt: now }
			})
			.returning();
		await recordAudit(tx, {
			source: 'settings',
			action: 'set_setting',
			actor: present,
			details: { key: data.key, value: data.value }
		});
		await appendStaffLog(tx, {
			action: 'reglage',
			detail: data.value === '' ? `Réglage '${data.key}' retiré` : `Réglage '${data.key}' modifié`,
			actor: present,
			target: data.key
		});
		return { key: data.key, value: row.value, updatedAt: row.updatedAt.toISOString() };
	});
}
