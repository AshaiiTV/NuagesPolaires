// Paquet U4 — Agenda. 03-vision §5.6 : inscription explicite (« Je viens » → après la réponse du
// serveur seulement « Tu viens · Rayer ma place »), compte non lié en lecture seule, complet, et
// « Organiser » pour MJ, designer, administrateur (le designer ne prévient pas, §12.5).
import { expect, test, type Page } from './fixtures';

const MDP: Record<string, string> = {
	alice: 'Alice-audit-123!',
	bob: 'Bob-audit-123!',
	mj: 'Maitre-audit-123!',
	designer: 'Designer-audit-123!',
	nova: 'Nova-audit-123!'
};

async function connecter(page: Page, pseudo: string) {
	await page.goto('/entrer');
	await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', { timeout: 15_000 });
	await page.fill('input[name="pseudo"]', pseudo);
	await page.fill('input[name="password"]', MDP[pseudo]);
	await page.click('form button[type="submit"]');
	await page.waitForURL((u) => !u.pathname.startsWith('/entrer'));
}

async function sansDebordement(page: Page) {
	const { scroll, client } = await page.evaluate(() => ({
		scroll: document.documentElement.scrollWidth,
		client: document.documentElement.clientWidth
	}));
	expect(scroll).toBeLessThanOrEqual(client);
}

const ligne = (page: Page, titre: string) =>
	page.locator('li', { has: page.getByRole('heading', { name: titre }) }).first();

test.describe('Agenda — joueur', () => {
	test('un visiteur est renvoyé vers /entrer', async ({ page }) => {
		await page.goto('/agenda');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await expect(page).toHaveURL(/\/entrer/);
	});

	test('Je viens, puis Rayer ma place : la confirmation suit le serveur', async ({ page }) => {
		await connecter(page, 'bob');
		await page.goto('/agenda');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await expect(page.getByText('Les dates sont à l’heure de Paris.')).toBeVisible();
		await expect(page.getByRole('link', { name: /Organiser/ })).toHaveCount(0);
		const chasse = ligne(page, 'Chasse dans la forêt aux lianes');
		await chasse.getByRole('button', { name: 'Je viens' }).click();
		await expect(
			page.getByText('Tu viens. Le rendez-vous est en marge de ton carnet.')
		).toBeVisible();
		await expect(chasse.getByText('Tu viens', { exact: true })).toBeVisible();
		await chasse.getByRole('button', { name: 'Rayer ma place' }).click();
		await expect(page.getByText('Rayé. Ta place est libre.')).toBeVisible();
		await expect(chasse.getByRole('button', { name: 'Je viens' })).toBeVisible();
	});

	test('un rendez-vous complet ne propose pas de place', async ({ page }) => {
		await connecter(page, 'alice');
		await page.goto('/agenda');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		const conseil = ligne(page, 'Conseil à l’arbre géant');
		await expect(conseil.getByText('2 inscrits sur 2')).toBeVisible();
		await expect(conseil.getByRole('button', { name: 'Je viens' })).toHaveCount(0);
	});

	test('compte en attente de liaison : lecture seule et la phrase', async ({ page }) => {
		await connecter(page, 'nova');
		await page.goto('/agenda');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await expect(page.getByText(/Ton compte attend sa liaison pour venir\./)).toBeVisible();
		await expect(page.getByRole('button', { name: 'Je viens' })).toHaveCount(0);
	});

	test('sans débordement à 390 px', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await connecter(page, 'alice');
		await page.goto('/agenda');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await sansDebordement(page);
	});
});

test.describe('Agenda — organiser', () => {
	test('un joueur reçoit une 404 sur /agenda/organiser', async ({ page }) => {
		await connecter(page, 'alice');
		const reponse = await page.goto('/agenda/organiser');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		expect(reponse?.status()).toBe(404);
	});

	test('le MJ note un rendez-vous ; il apparaît avec son tampon', async ({ page }) => {
		await connecter(page, 'mj');
		await page.goto('/agenda/organiser');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await expect(page.locator('[data-regime="serre"]').first()).toBeVisible();
		await expect(page.getByText('Prévenir les joueurs à la création')).toBeVisible();
		await page.fill('input[name="titre"]', 'Veillée au gué');
		await page.locator('input[name="type"]').first().check();
		await page.fill('input[name="date"]', '2031-05-12');
		await page.fill('input[name="heure"]', '21:00');
		await page.fill('input[name="places"]', '5');
		await page.getByRole('button', { name: 'Noter le rendez-vous' }).click();
		await expect(page.getByText(/Noté · \d\d:\d\d/).first()).toBeVisible();
		await expect(page.getByText('Veillée au gué').first()).toBeVisible();
	});

	test('le designer organise mais ne prévient pas', async ({ page }) => {
		await connecter(page, 'designer');
		await page.goto('/agenda/organiser');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await expect(page.getByRole('button', { name: 'Noter le rendez-vous' })).toBeVisible();
		await expect(page.getByText('Prévenir les joueurs à la création')).toHaveCount(0);
	});

	test('organiser sans débordement à 390 px', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await connecter(page, 'mj');
		await page.goto('/agenda/organiser');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await sansDebordement(page);
	});
});
