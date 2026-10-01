// Paquet U8 — Le Registre (administration). Parcours P6 (l'administrateur relie en trois gestes depuis
// « Ce qui attend ») et P9 (un thème au contraste insuffisant n'est pas proposé), droits (404 pour un
// MJ), états vides, absence de débordement à 390 px. Base de démonstration en mémoire (seed.ts).
import { expect, test, type Page } from '@playwright/test';

const MDP: Record<string, string> = {
	admin: 'Admin-audit-123!',
	alice: 'Alice-audit-123!',
	mj: 'Maitre-audit-123!',
	nova: 'Nova-audit-123!'
};

async function connecter(page: Page, pseudo: string) {
	await page.goto('/entrer');
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

const PAGES = ['/registre', '/registre/comptes', '/registre/themes', '/registre/journal', '/registre/donnees'];

test.describe('Le Registre — droits', () => {
	test('un MJ reçoit une 404, jamais une page grisée', async ({ page }) => {
		await connecter(page, 'mj');
		for (const chemin of PAGES) {
			const reponse = await page.goto(chemin);
			expect(reponse?.status(), chemin).toBe(404);
			await expect(page.getByText('Cette page n’existe pas dans le carnet.')).toBeVisible();
		}
	});

	test('un joueur ne voit pas le cahier dans sa tranche', async ({ page }) => {
		await connecter(page, 'alice');
		await page.goto('/carnet');
		await expect(page.getByRole('link', { name: 'Le Registre' })).toHaveCount(0);
		const reponse = await page.goto('/registre/journal/texte');
		expect(reponse?.status()).toBe(404);
	});

	test('un visiteur est renvoyé vers /entrer', async ({ page }) => {
		await page.goto('/registre');
		await expect(page).toHaveURL(/\/entrer/);
	});
});

test.describe('Le Registre — administrateur', () => {
	test.beforeEach(async ({ page }) => {
		await connecter(page, 'admin');
	});

	test('les cinq pages s’ouvrent sans débordement à 390 px', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		for (const chemin of PAGES) {
			await page.goto(chemin);
			await expect(page.getByRole('navigation', { name: 'Pages du Registre' }).first()).toBeVisible();
			await sansDebordement(page);
		}
	});

	test('P6 — relier nova à Seren en trois gestes, tampon après la réponse', async ({ page }) => {
		await page.goto('/registre');
		await expect(page.getByRole('heading', { name: 'Liaisons' })).toBeVisible();
		await page.getByText('nova', { exact: true }).click();
		await page.getByText('Seren Vallombre', { exact: true }).click();
		await expect(page.getByText('Relier nova à Seren Vallombre.')).toBeVisible();
		await page.getByRole('button', { name: 'Lier' }).click();
		await expect(page.getByText(/Lié · \d\d:\d\d — l’encre a pris\./)).toBeVisible();
		await expect(page.locator('.liaison-faite')).toContainText('nova est relié à Seren Vallombre');
		// Plus rien n'attend : la phrase du carnet, jamais « 0 ».
		await page.reload();
		await expect(page.getByText('Rien n’attend. Le registre est à jour.')).toBeVisible();
	});

	test('comptes : recherche et filtre par rôle en paramètres d’URL ; vide honnête', async ({ page }) => {
		await page.goto('/registre/comptes?role=mj');
		await expect(page.locator('.comptes > li')).toHaveCount(1);
		await page.goto('/registre/comptes?q=personne-de-ce-nom');
		await expect(page.getByText('Aucun compte ne correspond à cette recherche.')).toBeVisible();
	});

	test('comptes : le dernier administrateur est protégé par le serveur', async ({ page }) => {
		await page.goto('/registre/comptes?q=admin');
		await page.locator('summary', { hasText: 'admin' }).first().click();
		await page.locator('select[name="role"]').first().selectOption('joueur');
		await page.getByRole('button', { name: 'Changer le rôle' }).first().click();
		await expect(page.getByRole('alert')).toBeVisible();
		await page.reload();
		await expect(page.locator('.comptes > li').first()).toContainText(/administrateur/i);
	});

	test('comptes : le code temporaire s’affiche une seule fois', async ({ page }) => {
		await page.goto('/registre/comptes?q=bob');
		await page.locator('summary', { hasText: 'bob' }).click();
		await page.getByRole('button', { name: 'Réinitialiser le mot de passe' }).click();
		const code = page.locator('.code .secret');
		await expect(code).toBeVisible();
		await expect(page.getByText('À transmettre au propriétaire du compte. Il devra choisir un nouveau mot de passe à la connexion.')).toBeVisible();
		await expect(page.getByText(/valable une heure/)).toBeVisible();
		// Rien n'est gardé dans le navigateur : un rechargement ne le montre plus.
		const stockage = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
		expect(stockage).not.toContain(await code.innerText());
		await page.reload();
		await expect(page.locator('.code .secret')).toHaveCount(0);
	});

	test('P9 — un thème au contraste insuffisant n’est pas proposé, la raison est écrite', async ({ page }) => {
		await page.goto('/registre/themes');
		await page.fill('input[name="name"]', 'Brume trop pâle');
		await page.fill('input[name="id"]', 'brume-pale');
		await page.fill('input[name="--encre-2"]', '#2a3d40');
		await expect(page.getByText(/Le thème n’est pas proposé : sur la page, l’encre secondaire n’atteint que/)).toBeVisible();
		await expect(page.getByRole('button', { name: 'Enregistrer ce thème' })).toHaveCount(0);
		// Un contraste suffisant rend le bouton ; l'enregistrement s'imprime d'un tampon après la réponse.
		await page.fill('input[name="--encre-2"]', '#bdcdc8');
		await page.getByRole('button', { name: 'Enregistrer ce thème' }).click();
		await expect(page.getByText(/Créé · \d\d:\d\d — l’encre a pris\./)).toBeVisible();
		await expect(page.locator('#crees')).toContainText('Brume trop pâle');
	});

	test('journal : réglure, filtres en URL, export texte', async ({ page }) => {
		await page.goto('/registre/journal');
		await expect(page.locator('.registre-lignes li').first()).toBeVisible();
		await expect(page.locator('.registre-lignes input, .registre-lignes button')).toHaveCount(0);
		await page.goto('/registre/journal?action=login_success&acteur=admin');
		await expect(page.locator('.registre-lignes li').first()).toContainText('Entrée dans le carnet');
		const reponse = await page.request.get('/registre/journal/texte?action=login_success');
		expect(reponse.status()).toBe(200);
		expect(reponse.headers()['content-type']).toContain('text/plain');
		expect(await reponse.text()).toContain('login_success');
		await page.goto('/registre/journal?vue=staff');
		await expect(page.getByRole('link', { name: 'Journal du staff' })).toHaveAttribute('aria-current', 'page');
	});

	test('données : mention exacte, diagnostics sans valeur, réglage refusé hors Discord', async ({ page }) => {
		await page.goto('/registre/donnees');
		await expect(page.getByText('Ce n’est pas une sauvegarde complète du site.')).toBeVisible();
		await expect(page.locator('body')).not.toContainText('np-e2e-secret');
		const champ = page.locator('#reglage-discord_invite_url');
		await champ.fill('https://exemple.org/invitation');
		await champ.locator('xpath=ancestor::form').getByRole('button', { name: 'Enregistrer' }).click();
		await expect(page.getByText(/invitation Discord/)).toBeVisible();
		await expect(champ).toHaveValue('https://exemple.org/invitation');
	});
});
