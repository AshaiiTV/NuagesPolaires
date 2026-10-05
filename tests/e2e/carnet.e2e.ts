// Paquet U2 — Mon carnet : Dernières pages, Ma fiche, Mon journal, Récits.
// Parcours P1 (retrouver où j'en suis), P4 (vérifier une conséquence) et P8 (honnêteté et états vides)
// de 03-vision §10, sur la base de démonstration en mémoire (comptes fictifs de src/lib/server/db/seed.ts).
import { expect, test, type Page } from './fixtures';

const MDP: Record<string, string> = {
	alice: 'Alice-audit-123!',
	bob: 'Bob-audit-123!',
	mj: 'Maitre-audit-123!',
	nova: 'Nova-audit-123!'
};
const COMBAT_ARCHIVE = 'c_demo_lisiere';
const REFUS = 'L’encre n’a pas pris. Ta page est gardée ici ; réessaie quand tu veux.';

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

/** Aucun texte rendu sous 12 px. */
async function sansPetitTexte(page: Page) {
	const petits = await page.evaluate(() =>
		[...document.querySelectorAll('body *')]
			.filter((e) => e.children.length === 0 && e.textContent?.trim() && e.getClientRects().length)
			.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 12)
			.map((e) => e.textContent?.trim().slice(0, 30))
	);
	expect(petits).toEqual([]);
}

test.describe('Dernières pages', () => {
	test('l’ordre des zones est celui de la vision, sans compteur ni débordement à 390 px', async ({
		page
	}) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await connecter(page, 'alice');
		await page.goto('/carnet');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await expect(page.getByRole('heading', { level: 1 })).toContainText('Dernières');
		const corps = await page.locator('main, body').first().innerText();
		const ordre = [
			'relevé',
			'Ce qui attend ta main',
			'Depuis ta dernière lecture',
			'Ce qui vient'
		].map((t) => corps.indexOf(t));
		expect(ordre.every((i) => i >= 0)).toBe(true);
		expect([...ordre].sort((a, b) => a - b)).toEqual(ordre);
		await expect(page.getByRole('link', { name: /Ouvrir ma fiche/ })).toBeVisible();
		await expect(page.getByRole('link', { name: /Écrire dans mon journal/ })).toBeVisible();
		await sansDebordement(page);
		await sansPetitTexte(page);
	});

	test('ouvrir une corne mène à sa page ; déplier toutes les cornes vide la liste', async ({
		page
	}) => {
		await connecter(page, 'alice');
		await page.goto('/carnet');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		const premiere = page.locator('ol.lignes button.ligne').first();
		if (await premiere.count()) {
			await premiere.click();
			await page.waitForURL((u) => u.pathname !== '/carnet');
			await page.goto('/carnet');
			await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
				timeout: 15_000
			});
		}
		const deplier = page.getByRole('button', { name: 'Déplier toutes les cornes' }).first();
		if (await deplier.isVisible()) {
			await deplier.click();
			await expect(page.getByText(/Déplié · \d\d:\d\d — l’encre a pris\./)).toBeVisible();
			await page.reload();
			await expect(
				page.getByText('Rien depuis ta dernière lecture. Le carnet reste ouvert.')
			).toBeVisible();
		}
	});

	test('un compte en attente de liaison voit la page réduite et le pseudo à transmettre', async ({
		page
	}) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await connecter(page, 'nova');
		await page.goto('/carnet');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await expect(
			page.getByText(
				/Ton compte existe\. Ta fiche attend qu’un administrateur la relie à ton personnage\./
			)
		).toBeVisible();
		await expect(page.getByRole('link', { name: 'Premiers pas' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Recharger cette page' })).toBeVisible();
		await sansDebordement(page);
	});
});

test.describe('Ma fiche', () => {
	test.beforeEach(async ({ page }) => {
		await connecter(page, 'alice');
	});

	test('quatre chapitres, une ligne d’XP en texte, aucune jauge', async ({ page }) => {
		await page.goto('/carnet/fiche');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await expect(page.getByRole('heading', { level: 1, name: 'Aria Lunval' })).toBeVisible();
		for (const titre of ['Ressources', 'Équipement et inventaire', 'Serment', 'Conséquences']) {
			await expect(page.getByRole('heading', { level: 2, name: titre })).toBeVisible();
		}
		await expect(page.getByText(/\d+ \/ \d+ XP|\d+ XP/).first()).toBeVisible();
		await expect(page.locator('progress, meter, [role="progressbar"]')).toHaveCount(0);
		await expect(page.getByRole('link', { name: 'Exporter cette fiche (PDF)' })).toHaveAttribute(
			'href',
			'/carnet/fiche/imprimer'
		);
	});

	test('les conséquences portent leur tampon et se filtrent par paramètre d’URL', async ({
		page
	}) => {
		await page.goto('/carnet/fiche?filtre=combat#consequences');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		const lignes = page.locator('#consequences li.consequence');
		await expect(lignes.first()).toBeVisible();
		await expect(page.locator('#consequences').getByText(/MJ /).first()).toBeVisible();
		await expect(
			page.locator('nav[aria-label="Filtrer les conséquences"] a[aria-current="true"]').first()
		).toHaveText('Combats');
	});

	test('déclarer une consommation : confirmation en une ligne, l’encre prend après le serveur', async ({
		page
	}) => {
		await page.goto('/carnet/fiche#equipement');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		const declarer = page.getByRole('button', { name: 'Déclarer' }).first();
		test.skip(!(await declarer.count()), 'aucun consommable dans la fiche de démonstration');
		await declarer.click();
		await expect(page.getByText(/^Tu déclares avoir utilisé « .+ » \?$/)).toBeVisible();
		await page.getByLabel('Contexte (facultatif)').fill('Après la chute dans le ravin.');
		await page.getByRole('button', { name: 'Oui, je le note.' }).click();
		await expect(page.getByText(/Noté · \d\d:\d\d — l’encre a pris\./)).toBeVisible();
	});

	test('un portrait refusé garde la saisie et dit ce qui n’a pas été fait', async ({ page }) => {
		await page.goto('/carnet/fiche');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await page.getByRole('button', { name: 'Changer de portrait' }).click();
		const champ = page.getByLabel('Lien de l’image');
		await champ.fill('javascript:alert(1)');
		await champ.evaluate((e: HTMLInputElement) => (e.type = 'text'));
		await page.getByRole('button', { name: 'Noter' }).click();
		await expect(page.getByText(/Portrait refusé/)).toBeVisible();
		await expect(champ).toHaveValue('javascript:alert(1)');
	});

	test('la fiche à imprimer est une feuille seule avec son bouton', async ({ page }) => {
		await page.goto('/carnet/fiche/imprimer');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await expect(page.getByRole('button', { name: 'Imprimer / enregistrer en PDF' })).toBeVisible();
		await expect(page.getByRole('heading', { level: 1, name: 'Aria Lunval' })).toBeVisible();
	});

	test('à 390 px : chapitres repliables (01 ouvert), sans débordement', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/carnet/fiche');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await expect(page.locator('details#ressources')).toHaveAttribute('open', '');
		await expect(page.locator('details#serment')).not.toHaveAttribute('open', '');
		await sansDebordement(page);
		await sansPetitTexte(page);
	});

	test('un compte en attente de liaison est renvoyé vers Dernières pages', async ({ browser }) => {
		const contexte = await browser.newContext();
		const page = await contexte.newPage();
		await connecter(page, 'nova');
		await page.goto('/carnet/fiche');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await expect(page).toHaveURL(/\/carnet$/);
		await page.goto('/carnet/journal');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await expect(page).toHaveURL(/\/carnet$/);
		await contexte.close();
	});
});

test.describe('Mon journal', () => {
	test.beforeEach(async ({ page }) => {
		await connecter(page, 'alice');
	});

	test('trois voix, chacune avec sa visibilité écrite en toutes lettres', async ({ page }) => {
		await page.goto('/carnet/journal');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await expect(
			page.getByText('Lu par toi, les MJ et les administrateurs.').first()
		).toBeVisible();
		await page.goto('/carnet/journal?voix=recits');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await expect(
			page.getByText('Les combats archivés où ton personnage figure.').first()
		).toBeVisible();
		await page.goto('/carnet/journal?voix=faits');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await expect(
			page.getByText('Tamponnés par un MJ, avec témoin et date. Tu peux en proposer.').first()
		).toBeVisible();
	});

	test('noter, corriger (la rature reste), rayer (lisible)', async ({ page }) => {
		await page.goto('/carnet/journal');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		const texte = `Le gué était plus froid que prévu ${Date.now()}.`;
		await page.getByLabel(/Aujourd’hui/).fill(texte);
		await page.getByRole('button', { name: 'Noter', exact: true }).click();
		await expect(page.getByText(/Noté · \d\d:\d\d — l’encre a pris\./)).toBeVisible();
		const entree = page.locator('li.entree', { hasText: texte });
		await expect(entree).toBeVisible();

		await entree.getByRole('button', { name: 'Corriger' }).click();
		await page.locator('form[action="?/corriger"] textarea').fill(`${texte} Kael a ri.`);
		await page.getByRole('button', { name: 'Noter la correction' }).click();
		const corrigee = page.locator('li.entree', { hasText: 'Kael a ri.' });
		await expect(corrigee.locator('.ancienne s')).toHaveText(texte);

		await corrigee.getByRole('button', { name: 'Rayer' }).click();
		await corrigee.getByRole('button', { name: 'Oui, la rayer' }).click();
		await expect(corrigee.getByText('rayée')).toBeVisible();
	});

	test('un refus garde le brouillon dans le navigateur', async ({ page }) => {
		await page.goto('/carnet/journal');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await page.route('**/carnet/journal?/noter', (route) => route.abort());
		await page.getByLabel(/Aujourd’hui/).fill('Une page qui ne partira pas.');
		await page.getByRole('button', { name: 'Noter', exact: true }).click();
		await expect(page.getByText(REFUS)).toBeVisible();
		await page.unroute('**/carnet/journal?/noter');
		await page.reload();
		await expect(page.getByLabel(/Aujourd’hui/)).toHaveValue('Une page qui ne partira pas.');
	});

	test('proposer un fait : il attend un tampon', async ({ page }) => {
		await page.goto('/carnet/journal?voix=faits');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await page.getByLabel('Type').selectOption('dette');
		await page.getByLabel('Envers').fill('Kael Morvan');
		await page.getByLabel('Le fait').fill('Je lui dois la traversée du gué.');
		await page.getByRole('button', { name: 'Proposer au tampon' }).click();
		await expect(
			page
				.locator('li.fait', { hasText: 'Je lui dois la traversée du gué.' })
				.getByText(/attend un tampon/)
		).toBeVisible();
	});

	test('récits : lire, exporter en texte, refuser un récit étranger', async ({ page }) => {
		await page.goto('/carnet/journal?voix=recits');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		const lire = page.getByRole('link', { name: 'Lire' }).first();
		if (await lire.count()) {
			await lire.click();
			await expect(page).toHaveURL(/\/carnet\/recits\//);
			await expect(page.getByRole('heading', { level: 2, name: 'Le combat' })).toBeVisible();
		}
		const reponse = await page.request.get(`/carnet/recits/${COMBAT_ARCHIVE}?format=txt`);
		if (reponse.ok()) expect(reponse.headers()['content-type']).toContain('text/plain');
		const etranger = await page.request.get('/carnet/recits/c_inexistant');
		expect(etranger.status()).toBe(404);
	});

	test('à 390 px : la sous-navigation tient, aucun débordement', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		for (const voix of ['notes', 'recits', 'faits']) {
			await page.goto(`/carnet/journal?voix=${voix}`);
			await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
				timeout: 15_000
			});
			await expect(
				page.getByRole('navigation', { name: 'Les trois voix du journal' }).first()
			).toBeVisible();
			await sansDebordement(page);
			await sansPetitTexte(page);
		}
	});
});
