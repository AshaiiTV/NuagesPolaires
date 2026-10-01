// Réglages : lecture publique du lien d'invitation, écriture réservée à l'administrateur.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../../../../tests/helpers/db';
import { DEMO_IDS } from '../db/seed';
import * as schema from '../db/schema';
import type { Actor } from '../permissions';
import { getPublicSettings, listSettings, setSetting } from './settings';

const A = DEMO_IDS.accounts;
const actors = {
	admin: { accountId: A.admin, role: 'admin', characterId: null, pseudo: 'admin' },
	alice: {
		accountId: A.alice,
		role: 'joueur',
		characterId: DEMO_IDS.characters.aria,
		pseudo: 'alice'
	},
	mj: { accountId: A.mj, role: 'mj', characterId: null, pseudo: 'mj' },
	designer: { accountId: A.designer, role: 'designer', characterId: null, pseudo: 'designer' }
} satisfies Record<string, Actor>;

let t: TestDb;
beforeAll(async () => {
	t = await createTestDb({ demo: true });
});
afterAll(async () => {
	await t.close();
});

describe('réglages', () => {
	it('sans lien saisi : le colophon n’a pas de lien Discord', async () => {
		expect(await getPublicSettings(t.db)).toEqual({ discordInvite: null });
	});

	it('l’administrateur saisit l’invitation : audit et journal staff', async () => {
		const saved = await setSetting(t.db, actors.admin, {
			key: 'discord_invite_url',
			value: '  https://discord.gg/nuages  '
		});
		expect(saved).toMatchObject({ key: 'discord_invite_url', value: 'https://discord.gg/nuages' });
		expect(await getPublicSettings(t.db)).toEqual({ discordInvite: 'https://discord.gg/nuages' });
		const [row] = await t.db
			.select()
			.from(schema.settings)
			.where(eq(schema.settings.key, 'discord_invite_url'));
		expect(row.updatedBy).toBe(A.admin);
		const [audit] = await t.db
			.select()
			.from(schema.auditLog)
			.where(eq(schema.auditLog.action, 'set_setting'));
		expect(audit.details).toEqual({
			key: 'discord_invite_url',
			value: 'https://discord.gg/nuages'
		});
		const [log] = await t.db
			.select()
			.from(schema.staffLog)
			.where(eq(schema.staffLog.action, 'reglage'));
		expect(log.detail).toBe("Réglage 'discord_invite_url' modifié");

		await setSetting(t.db, actors.admin, {
			key: 'discord_invite_url',
			value: 'https://discord.com/invite/abc-12'
		});
		expect((await getPublicSettings(t.db)).discordInvite).toBe('https://discord.com/invite/abc-12');
		await setSetting(t.db, actors.admin, { key: 'discord_invite_url', value: '' });
		expect(await getPublicSettings(t.db)).toEqual({ discordInvite: null });
	});

	it('valide chaque clé', async () => {
		await expect(
			setSetting(t.db, actors.admin, {
				key: 'discord_invite_url',
				value: 'https://exemple.org/invite'
			})
		).rejects.toMatchObject({ code: 'INVALID', status: 400 });
		await expect(
			setSetting(t.db, actors.admin, {
				key: 'discord_default_channel_url',
				value: 'http://discord.com/x'
			})
		).rejects.toMatchObject({ code: 'INVALID' });
		await expect(
			setSetting(t.db, actors.admin, { key: 'mot_de_passe', value: 'x' } as never)
		).rejects.toMatchObject({
			code: 'INVALID',
			message: 'Réglage inconnu.'
		});
		const contact = await setSetting(t.db, actors.admin, {
			key: 'contact_text',
			value: 'Écris à un administrateur sur Discord.'
		});
		expect(contact.value).toBe('Écris à un administrateur sur Discord.');
		const channel = await setSetting(t.db, actors.admin, {
			key: 'discord_default_channel_url',
			value: 'https://discord.com/channels/1/2'
		});
		expect(channel.value).toBe('https://discord.com/channels/1/2');
		expect((await listSettings(t.db, actors.admin)).map((s) => s.key)).toEqual([
			'discord_invite_url',
			'discord_default_channel_url',
			'contact_text'
		]);
	});

	it('refus : MJ, designer, joueur 403 ; visiteur 401', async () => {
		for (const actor of [actors.mj, actors.designer, actors.alice]) {
			await expect(
				setSetting(t.db, actor, { key: 'contact_text', value: 'x' })
			).rejects.toMatchObject({
				code: 'FORBIDDEN',
				status: 403
			});
			await expect(listSettings(t.db, actor)).rejects.toMatchObject({ status: 403 });
		}
		await expect(setSetting(t.db, null, { key: 'contact_text', value: 'x' })).rejects.toMatchObject(
			{ status: 401 }
		);
	});
});
