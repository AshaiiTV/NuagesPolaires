import { test, expect, type Page, type BrowserContext } from './fixtures';

// U7 / P7–P9 : les parcours utilisent les comptes fictifs et les vrais formulaires.
const passwords = {
	designer: 'Designer-audit-123!',
	admin: 'Admin-audit-123!',
	alice: 'Alice-audit-123!',
	nova: 'Nova-audit-123!'
};
async function entrer(page: Page, pseudo: keyof typeof passwords) {
	await page.goto('/entrer', { waitUntil: 'networkidle' });
	await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', { timeout: 15_000 });
	await page.getByLabel('Pseudo', { exact: true }).fill(pseudo);
	await page.locator('input[name="password"]').fill(passwords[pseudo]);
	await page.locator('form button[type="submit"]').click();
	await page.waitForURL((url) => !url.pathname.startsWith('/entrer'));
}
async function sansDebordement(page: Page) {
	await expect
		.poll(() =>
			page.evaluate(
				() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
			)
		)
		.toBe(true);
	const petits = await page.evaluate(() =>
		[...document.querySelectorAll<HTMLElement>('body *')]
			.filter(
				(e) =>
					!e.children.length &&
					e.textContent?.trim() &&
					e.getClientRects().length &&
					parseFloat(getComputedStyle(e).fontSize) < 12
			)
			.map((e) => e.textContent)
	);
	expect(petits).toEqual([]);
}
async function nouvelleCreature(page: Page, nom: string) {
	await page.goto('/atelier/bestiaire/nouveau', { waitUntil: 'networkidle' });
	await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', { timeout: 15_000 });
	await page.getByLabel('Nom', { exact: true }).fill(nom);
	await page.getByLabel('Description publique', { exact: true }).fill('Une créature de recette.');
	await page
		.getByLabel('Note réservée', { exact: true })
		.fill('Note réservée U7, absente des lectures publiques.');
	await page.getByRole('button', { name: 'Créer la créature', exact: true }).click();
	await page.waitForURL((url) => /\/atelier\/bestiaire\/b_/.test(url.pathname));
	return new URL(page.url()).pathname.split('/').at(-1)!;
}
async function avecCompte(context: BrowserContext, pseudo: keyof typeof passwords) {
	const page = await context.newPage();
	await entrer(page, pseudo);
	return page;
}

test('le visiteur lit le bestiaire, ses repères et les observations blanches à 390 px', async ({
	page
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/univers/bestiaire', { waitUntil: 'networkidle' });
	await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', { timeout: 15_000 });
	await page.locator('summary').filter({ hasText: 'Recherche et repères' }).click();
	await page.locator('.depliant').getByLabel('Chercher une créature').fill('introuvable-u7');
	await page.locator('.depliant').getByRole('button', { name: 'Chercher', exact: true }).click();
	await page.waitForURL((url) => url.searchParams.get('recherche') === 'introuvable-u7');
	await expect(page.getByText('Aucune créature ne correspond.')).toBeVisible();
	await sansDebordement(page);
	await page.goto('/univers/bestiaire/b_demo_corbeau');
	await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', { timeout: 15_000 });
	await expect(
		page.getByText('Cette page reste blanche tant que personne ne l’a rencontré.')
	).toBeVisible();
	await expect(page.getByRole('switch', { name: 'Calque' })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Proposer une observation' })).toHaveCount(0);
	await sansDebordement(page);
	const hidden = await page.goto('/univers/bestiaire/b_demo_ombre');
	await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', { timeout: 15_000 });
	expect(hidden?.status()).toBe(404);
});

test('les droits de l’Atelier sont gardés et tu es ici suit la branche d’Alice', async ({
	page
}) => {
	await entrer(page, 'alice');
	expect((await page.goto('/atelier/bestiaire'))?.status()).toBe(404);
	await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', { timeout: 15_000 });
	expect((await page.goto('/atelier/serments/duelliste'))?.status()).toBe(404);
	await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', { timeout: 15_000 });
	await page.goto('/univers/serments/duelliste');
	await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', { timeout: 15_000 });
	await expect(page.getByText('tu es ici', { exact: true })).toHaveCount(1);
	await page.setViewportSize({ width: 390, height: 844 });
	await sansDebordement(page);
});

test('le designer lit le calque, sans lien vers la Table ni Atelier Serments', async ({ page }) => {
	await entrer(page, 'designer');
	await page.goto('/univers/bestiaire/b_demo_loup');
	await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', { timeout: 15_000 });
	await page.getByRole('switch', { name: 'Calque' }).check();
	await expect(page.getByRole('complementary', { name: 'Calque réservé' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Modifier dans l’Atelier' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Envoyer à la Table' })).toHaveCount(0);
	expect((await page.goto('/atelier/serments'))?.status()).toBe(404);
	await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', { timeout: 15_000 });
});

test('créer, corriger, refuser une quantité incohérente et garder la saisie', async ({ page }) => {
	await entrer(page, 'designer');
	const id = await nouvelleCreature(page, `Créature U7 ${Date.now()}`);
	await page.getByLabel('Sous-titre', { exact: true }).fill('Rencontre au bord du cahier');
	await page.getByRole('button', { name: 'Noter les modifications' }).click();
	await expect(page.getByRole('status')).toContainText('l’encre a pris');
	await page.reload();
	await expect(page.getByLabel('Sous-titre', { exact: true })).toHaveValue(
		'Rencontre au bord du cahier'
	);
	await page.getByLabel('Quantité minimale').fill('3');
	await page.getByLabel('Quantité maximale').fill('1');
	await page.getByRole('button', { name: 'Noter les modifications' }).click();
	await expect(page.getByRole('alert')).toContainText('La quantité maximale');
	await expect(page.getByLabel('Quantité minimale')).toHaveValue('3');
	await page.setViewportSize({ width: 390, height: 844 });
	await sansDebordement(page);
	await page.goto(`/atelier/bestiaire/${id}`);
	await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', { timeout: 15_000 });
	await page.getByRole('button', { name: 'Dupliquer', exact: true }).click();
	await page.waitForURL((url) => !url.pathname.endsWith(id));
	await expect(page.getByLabel('Nom', { exact: true })).toHaveValue(/\(copie\)$/);
});

test('masquer, archiver et restaurer garde les pages réservées hors de la réponse publique', async ({
	page,
	browser
}) => {
	await entrer(page, 'designer');
	const id = await nouvelleCreature(page, `Visibilité U7 ${Date.now()}`);
	const publicContext = await browser.newContext({ baseURL: test.info().project.use.baseURL });
	const visiteur = await publicContext.newPage();
	expect((await visiteur.goto(`/univers/bestiaire/${id}`))?.status()).toBe(404);
	await expect(visiteur.locator('html')).toHaveAttribute('data-app-ready', 'true', {
		timeout: 15_000
	});
	await page.getByRole('button', { name: 'Publier', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Masquer', exact: true })).toBeVisible();
	const response = await visiteur.goto(`/univers/bestiaire/${id}`);
	await expect(visiteur.locator('html')).toHaveAttribute('data-app-ready', 'true', {
		timeout: 15_000
	});
	expect(response?.status()).toBe(200);
	expect(await response!.text()).not.toContain('Note réservée U7');
	await page.getByRole('button', { name: 'Archiver', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Restaurer', exact: true })).toBeVisible();
	expect((await visiteur.goto(`/univers/bestiaire/${id}`))?.status()).toBe(404);
	await expect(visiteur.locator('html')).toHaveAttribute('data-app-ready', 'true', {
		timeout: 15_000
	});
	await page.getByRole('button', { name: 'Restaurer', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Archiver', exact: true })).toBeVisible();
	await page.getByRole('button', { name: 'Masquer', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Publier', exact: true })).toBeVisible();
	await publicContext.close();
});

test('deux éditions concurrentes donnent le conflit officiel sans perdre le brouillon', async ({
	page,
	context
}) => {
	await entrer(page, 'designer');
	const id = await nouvelleCreature(page, `Révision U7 ${Date.now()}`);
	const seconde = await context.newPage();
	await seconde.goto(`/atelier/bestiaire/${id}`);
	await expect(seconde.locator('html')).toHaveAttribute('data-app-ready', 'true', {
		timeout: 15_000
	});
	await page.getByLabel('Sous-titre', { exact: true }).fill('La première ligne');
	await page.getByRole('button', { name: 'Noter les modifications' }).click();
	await expect(page.getByRole('status')).toContainText('l’encre a pris');
	await seconde.getByLabel('Sous-titre', { exact: true }).fill('Le brouillon gardé');
	await seconde.getByRole('button', { name: 'Noter les modifications' }).click();
	await expect(seconde.getByRole('alert')).toContainText(
		'Quelqu’un a écrit sur cette page entre-temps. Relis avant d’écrire par-dessus.'
	);
	await expect(seconde.getByLabel('Sous-titre', { exact: true })).toHaveValue('Le brouillon gardé');
});

test('une observation attend le tampon et un refus conserve son texte', async ({ browser }) => {
	const joueurContext = await browser.newContext({ baseURL: test.info().project.use.baseURL });
	const designerContext = await browser.newContext({ baseURL: test.info().project.use.baseURL });
	const joueur = await avecCompte(joueurContext, 'alice');
	const designer = await avecCompte(designerContext, 'designer');
	const text = `Observation U7 ${Date.now()} : une trace dans la brume.`;
	await joueur.goto('/univers/bestiaire/b_demo_corbeau');
	await expect(joueur.locator('html')).toHaveAttribute('data-app-ready', 'true', {
		timeout: 15_000
	});
	await joueur.getByLabel('Proposer une observation', { exact: true }).fill(text);
	await joueur.getByRole('button', { name: 'Proposer une observation', exact: true }).click();
	await expect(joueur.getByText('Ton observation attend un tampon.')).toBeVisible();
	await joueur.goto('/univers/bestiaire/b_demo_corbeau');
	await expect(joueur.locator('html')).toHaveAttribute('data-app-ready', 'true', {
		timeout: 15_000
	});
	await expect(joueur.locator('.observations').getByText(text)).toHaveCount(0);
	await designer.goto('/atelier/bestiaire');
	await expect(designer.locator('html')).toHaveAttribute('data-app-ready', 'true', {
		timeout: 15_000
	});
	const ligne = designer.locator('.observation').filter({ hasText: text });
	await ligne.getByLabel('Motif du tampon ou du refus').fill('Rencontre relue sur Discord.');
	await ligne.getByRole('button', { name: 'Tamponner', exact: true }).click();
	await expect(ligne).toHaveCount(0);
	await joueur.goto('/univers/bestiaire/b_demo_corbeau');
	await expect(joueur.locator('html')).toHaveAttribute('data-app-ready', 'true', {
		timeout: 15_000
	});
	await expect(joueur.locator('.observations').getByText(text)).toBeVisible();
	const refuse = `${text} Refus.`;
	await joueur.getByLabel('Proposer une observation', { exact: true }).fill(refuse);
	await joueur.getByRole('button', { name: 'Proposer une observation', exact: true }).click();
	await expect(joueur.getByText('Ton observation attend un tampon.')).toBeVisible();
	await designer.goto('/atelier/bestiaire');
	await expect(designer.locator('html')).toHaveAttribute('data-app-ready', 'true', {
		timeout: 15_000
	});
	const ligneRefusee = designer.locator('.observation').filter({ hasText: refuse });
	await ligneRefusee.getByRole('button', { name: 'Refuser', exact: true }).click();
	await expect(ligneRefusee).toBeVisible(); // Le motif requis bloque ce refus sans écriture.
	await ligneRefusee
		.getByLabel('Motif du tampon ou du refus')
		.fill('La rencontre reste à préciser.');
	await ligneRefusee.getByRole('button', { name: 'Refuser', exact: true }).click();
	await expect(ligneRefusee).toHaveCount(0);
	await joueur.goto('/univers/bestiaire/b_demo_corbeau');
	await expect(joueur.locator('html')).toHaveAttribute('data-app-ready', 'true', {
		timeout: 15_000
	});
	await expect(joueur.locator('.observations').getByText(refuse, { exact: true })).toHaveCount(0);
	await joueurContext.close();
	await designerContext.close();
});

test('administrateur : créer un Serment, écrire ses branches et changer sa visibilité', async ({
	page
}) => {
	await entrer(page, 'admin');
	await page.goto('/atelier/serments/duelliste');
	await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', { timeout: 15_000 });
	await expect(
		page.getByText(
			'Modifier un Serment change la fiche de ses porteurs à leur prochaine ouverture.'
		)
	).toBeVisible();
	await page.setViewportSize({ width: 390, height: 844 });
	await sansDebordement(page);
	await page.goto('/atelier/serments/nouveau');
	await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', { timeout: 15_000 });
	await page.getByLabel('Nom', { exact: true }).fill(`Serment U7 ${Date.now()}`);
	await page.locator('input[name="bA.label"]').fill('Branche A — La trace');
	for (let i = 0; i < 4; i++)
		await page.locator(`input[name="bA.${i}.name"]`).fill(`Capacité ${i + 1}`);
	await page.getByRole('button', { name: 'Créer le Serment' }).click();
	await page.waitForURL((url) => !url.pathname.endsWith('/nouveau'));
	await page.getByLabel('Arme', { exact: true }).fill('Plume du Serment');
	await page.getByLabel('Motif des modifications').fill('Recette de la fiche.');
	await page.getByRole('button', { name: 'Noter les modifications' }).click();
	await expect(page.getByRole('status')).toContainText('l’encre a pris');
	await page.reload();
	await expect(page.getByLabel('Arme', { exact: true })).toHaveValue('Plume du Serment');
	await page.getByRole('button', { name: 'Publier', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Masquer', exact: true })).toBeVisible();
	await sansDebordement(page);
});

test('le compte en attente peut proposer une rencontre sans accéder à l’Atelier', async ({
	page
}) => {
	await entrer(page, 'nova');
	await page.goto('/univers/bestiaire/b_demo_loup');
	await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', { timeout: 15_000 });
	await expect(page.getByRole('button', { name: 'Proposer une observation' })).toBeVisible();
	await expect(page.getByRole('switch', { name: 'Calque' })).toHaveCount(0);
	expect((await page.goto('/atelier/bestiaire'))?.status()).toBe(404);
	await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', { timeout: 15_000 });
});
