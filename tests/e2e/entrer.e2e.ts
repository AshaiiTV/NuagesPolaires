// Paquet U1 — Entrer, inscription, Mon compte, Ma collection, « Plus », page d'erreur.
// Parcours P6 (règlement → inscription → « en attente de liaison ») et P8 (refus honnêtes) de
// 03-vision §10, sur la base de démonstration en mémoire (comptes fictifs de seed.ts).
import { expect, test, type Page } from '@playwright/test';

const MDP: Record<string, string> = {
	admin: 'Admin-audit-123!',
	alice: 'Alice-audit-123!',
	mj: 'Maitre-audit-123!'
};

async function connecter(page: Page, pseudo: string, motDePasse = MDP[pseudo]) {
	await page.goto('/entrer');
	await page.fill('input[name="pseudo"]', pseudo);
	await page.fill('input[name="password"]', motDePasse);
	await page.click('form button[type="submit"]');
}

async function sansDebordement(page: Page) {
	const { scroll, client } = await page.evaluate(() => ({
		scroll: document.documentElement.scrollWidth,
		client: document.documentElement.clientWidth
	}));
	expect(scroll).toBeLessThanOrEqual(client);
}

test.describe('Entrer', () => {
	test('refus : message du serveur, pseudo gardé', async ({ page }) => {
		await connecter(page, 'alice', 'pas-le-bon-mot-de-passe');
		await expect(page.getByText('Identifiant ou mot de passe incorrect')).toBeVisible();
		await expect(page.locator('input[name="pseudo"]')).toHaveValue('alice');
		await expect(page).toHaveURL(/\/entrer/);
	});

	test('destination selon le rôle : joueur → /carnet, MJ sans personnage → /table, admin → /registre', async ({ page, browser }) => {
		await connecter(page, 'alice');
		await page.waitForURL(/\/carnet/);
		// Déjà connecté : /entrer renvoie au carnet.
		await page.goto('/entrer');
		await expect(page).toHaveURL(/\/carnet/);

		for (const [pseudo, destination] of [
			['mj', /\/table/],
			['admin', /\/registre/]
		] as const) {
			const contexte = await browser.newContext();
			const autre = await contexte.newPage();
			await connecter(autre, pseudo);
			await autre.waitForURL(destination);
			await contexte.close();
		}
	});

	test('le mot de passe s’affiche et se masque', async ({ page }) => {
		await page.goto('/entrer');
		const champ = page.locator('input[name="password"]');
		await expect(champ).toHaveAttribute('type', 'password');
		await page.getByRole('button', { name: /Afficher/ }).click();
		await expect(champ).toHaveAttribute('type', 'text');
	});

	test('sans débordement à 390 px', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/entrer');
		await sansDebordement(page);
		await page.goto('/entrer/inscription');
		await sansDebordement(page);
	});
});

test.describe('P6 — Rejoindre l’aventure', () => {
	test('règlement, puis compte, puis carnet en attente de liaison', async ({ page }) => {
		await page.goto('/entrer');
		await page.getByRole('link', { name: /Rejoindre l’aventure/ }).click();
		await expect(page).toHaveURL(/\/entrer\/inscription/);
		await page.getByRole('button', { name: /J’accepte — Continuer/ }).click();
		await expect(page).toHaveURL(/etape=compte/);

		const pseudo = 'lune' + Date.now().toString().slice(-6);
		await page.fill('input[name="pseudo"]', pseudo);
		await page.fill('input[name="password"]', 'Lune-essai-123!');
		await page.fill('input[name="passwordConfirm"]', 'Lune-essai-123!');
		await page.getByRole('button', { name: /Ouvrir mon carnet/ }).click();
		await page.waitForURL(/\/carnet/);
		await expect(page.getByText(/Ta fiche attend qu’un administrateur la relie à ton personnage\./)).toBeVisible();
	});

	test('un pseudo déjà pris est refusé, la saisie reste', async ({ page }) => {
		await page.goto('/entrer/inscription?etape=compte&reglement=accepte');
		await page.fill('input[name="pseudo"]', 'alice');
		await page.fill('input[name="password"]', 'Lune-essai-123!');
		await page.fill('input[name="passwordConfirm"]', 'Lune-essai-123!');
		await page.getByRole('button', { name: /Ouvrir mon carnet/ }).click();
		await expect(page.getByText('Ce pseudo est déjà pris.')).toBeVisible();
		await expect(page.locator('input[name="pseudo"]')).toHaveValue('alice');
	});
});

test.describe('Mon compte, Ma collection, Plus', () => {
	test.beforeEach(async ({ page }) => {
		await connecter(page, 'alice');
		await page.waitForURL(/\/carnet/);
	});

	test('Mon compte : identité, mot de passe, fermeture sous filet double', async ({ page }) => {
		await page.goto('/compte');
		await expect(page.getByText('Aria Lunval').first()).toBeVisible();
		await expect(page.getByText('Les autres appareils seront déconnectés.')).toBeVisible();
		await expect(page.getByText('Le carnet se ferme pour de bon. Ce qui est écrit ne se rouvre pas.')).toBeVisible();
	});

	test('Ma collection : un groupe de boutons radio, sans prix ni « débloquer »', async ({ page }) => {
		await page.goto('/compte/collection');
		await expect(page.getByRole('radiogroup')).toBeVisible();
		await expect(page.locator('body')).not.toContainText(/débloquer|prix/i);
	});

	test('Plus (téléphone) : les lignes du carnet et Quitter', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/plus');
		await expect(page.getByRole('link', { name: /Mon compte/ }).first()).toBeVisible();
		await expect(page.getByText('Quitter le carnet')).toBeVisible();
		await sansDebordement(page);
	});
});

test('404 dans la voix du carnet', async ({ page }) => {
	const reponse = await page.goto('/une-page-qui-n-existe-pas');
	expect(reponse?.status()).toBe(404);
	await expect(page.getByText('Cette page n’existe pas dans le carnet.')).toBeVisible();
});
