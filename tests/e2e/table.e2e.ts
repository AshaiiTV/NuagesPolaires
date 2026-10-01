// Paquet U5 — La Table (MJ) : combat, apparitions, archives. 03-vision §5.8, P5 (arbitrer à dix),
// P7 (publier et protéger). Comptes fictifs de la base de démonstration (src/lib/server/db/seed.ts).
import { expect, test, type Browser, type Page } from '@playwright/test';

const MDP: Record<string, string> = {
	admin: 'Admin-audit-123!',
	alice: 'Alice-audit-123!',
	bob: 'Bob-audit-123!',
	mj: 'Maitre-audit-123!',
	designer: 'Designer-audit-123!'
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

/** Ouvre une Table par le formulaire de /table : tous les personnages et `adversaires` créatures. */
async function ouvrirTable(page: Page, nom: string, adversaires = 8): Promise<string> {
	await page.goto('/table');
	await page.fill('input[name="nom"]', nom);
	for (const c of await page.locator('input[name="personnages"]').all()) await c.check();
	let reste = adversaires;
	for (const q of await page.locator('input[name^="qte_"]').all()) {
		if (reste <= 0) break;
		const n = Math.min(reste, 3);
		await q.fill(String(n));
		reste -= n;
	}
	await Promise.all([page.waitForURL(/\/table\/combat\//), page.getByRole('button', { name: 'Ouvrir la Table' }).click()]);
	return page.url();
}

/** Déclare au clavier pour chaque combattant : Entrée sur le formulaire (Frappe par défaut), puis Passer. */
async function declarerTout(page: Page) {
	for (let i = 0; i < 30; i++) {
		const form = page.locator('form.declarer');
		if (!(await form.count())) break;
		await form.locator('select').first().focus();
		await page.keyboard.press('Enter');
		const encore = page.locator('form.declarer');
		if (await encore.count()) await encore.getByRole('button', { name: 'Passer' }).click();
	}
}

const releve = (page: Page) => page.locator('.releve');

test.describe('La Table — droits', () => {
	test('un visiteur est renvoyé vers /entrer', async ({ page }) => {
		await page.goto('/table');
		await expect(page).toHaveURL(/\/entrer/);
	});

	for (const chemin of ['/table', '/table/apparitions', '/table/archives', '/table/combat/c_demo_lisiere']) {
		test(`un joueur reçoit une 404 sur ${chemin}`, async ({ page }) => {
			await connecter(page, 'alice');
			const r = await page.goto(chemin);
			expect(r?.status()).toBe(404);
		});
	}

	test('le designer n’a pas accès à la Table', async ({ page }) => {
		await connecter(page, 'designer');
		const r = await page.goto('/table');
		expect(r?.status()).toBe(404);
	});
});

test.describe('La Table — combat (P5)', () => {
	test('liste vide ou ouverte, régime serré', async ({ page }) => {
		await connecter(page, 'mj');
		await page.goto('/table');
		await expect(page.locator('html')).toHaveAttribute('data-regime', 'serre');
		await expect(page.getByRole('heading', { name: /Ouvrir une Table/ })).toBeVisible();
	});

	test('dix combattants tiennent sans défilement à 1440 × 900', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await connecter(page, 'mj');
		await ouvrirTable(page, 'Col des brumes');
		await expect(page.locator('.combattants li.combattant')).toHaveCount(10);
		await page.getByRole('button', { name: 'Démarrer' }).click();
		await expect(page.getByText(/Round 1 · 0\/10 déclarés/)).toBeVisible();
		const bas = await page.locator('.combattants li.combattant').last().evaluate((e) => e.getBoundingClientRect().bottom);
		expect(bas).toBeLessThanOrEqual(900);
	});

	test('déclarer, résoudre, clore : le relevé ne change qu’à la réponse ; annuler restaure', async ({ page }) => {
		await connecter(page, 'mj');
		await ouvrirTable(page, 'Gué des saules', 3);
		await page.getByRole('button', { name: 'Démarrer' }).click();
		await expect(releve(page)).toContainText('relevé');
		await declarerTout(page);
		const resoudre = page.getByRole('button', { name: 'Résoudre le round' });
		await expect(resoudre).toBeEnabled();
		await resoudre.click();
		await expect(page.getByText(/Round 1 · résolu à \d\d:\d\d\./)).toBeVisible();
		// Annuler le round revient au snapshot : les déclarations sont de nouveau complètes.
		await page.getByRole('button', { name: 'Annuler le round' }).click();
		await expect(page.getByRole('button', { name: 'Résoudre le round' })).toBeEnabled();
		await page.getByRole('button', { name: 'Résoudre le round' }).click();
		await page.getByRole('button', { name: 'Clore le round' }).click();
		await expect(releve(page)).not.toContainText('non sauvegardé');
		// Le brouillon survit au rechargement.
		await page.reload();
		await expect(page.getByText(/Round 2/).first()).toBeVisible();
	});

	test('un ajustement demande un motif et montre ancienne → nouvelle valeur', async ({ page }) => {
		await connecter(page, 'mj');
		await ouvrirTable(page, 'Lisière d’essai', 2);
		const ligne = page.locator('.combattants li.combattant').first();
		await ligne.getByRole('button', { name: /Gestes sur/ }).click();
		const panneau = ligne.locator('.panneau');
		await panneau.locator('input[type="number"]').fill('10');
		await expect(panneau.locator('.apercu del, .apercu s, .apercu .rature').first()).toBeVisible();
		await expect(panneau.locator('input[required]').first()).toHaveValue('ajustement en cours de combat');
		await panneau.getByRole('button', { name: 'Noter' }).click();
		await expect(page.locator('.journal li').last()).toContainText('ajustement en cours de combat · mj ·');
	});

	test('deux MJ sur la même Table : conflit lisible, sans écrasement', async ({ browser }) => {
		const a = await nouvellePage(browser);
		const b = await nouvellePage(browser);
		await connecter(a, 'mj');
		await connecter(b, 'admin');
		const url = await ouvrirTable(a, 'Table disputée', 2);
		await b.goto(url);
		await a.getByRole('button', { name: 'Sauvegarder' }).click();
		await expect(releve(a)).not.toContainText('non sauvegardé');
		await b.getByRole('button', { name: 'Sauvegarder' }).click();
		await expect(b.getByText('Quelqu’un a écrit sur cette page entre-temps. Relis avant d’écrire par-dessus.')).toBeVisible();
		await expect(b.getByRole('button', { name: 'Reprendre leur version' })).toBeVisible();
		await expect(b.getByRole('button', { name: 'Garder la mienne' })).toBeVisible();
		await b.getByRole('button', { name: 'Reprendre leur version' }).click();
		await expect(b.getByText('Quelqu’un a écrit sur cette page entre-temps.')).toHaveCount(0);
	});

	test('feuillet Conséquences : tamponner tout puis archiver ; « Archivé » après la réponse', async ({ page }) => {
		await connecter(page, 'mj');
		await ouvrirTable(page, 'Récit d’essai', 2);
		await page.getByRole('button', { name: 'Démarrer' }).click();
		await page.locator('.gestes').getByRole('button', { name: 'Terminer le combat' }).click();
		const feuillet = page.locator('dialog.feuillet');
		await expect(feuillet).toBeVisible();
		await expect(feuillet.getByRole('heading', { name: 'Conséquences' })).toBeVisible();
		await expect(feuillet.getByText('Archivé ·')).toHaveCount(0);
		await feuillet.getByRole('button', { name: 'Tamponner tout' }).click();
		await feuillet.getByRole('button', { name: 'Tamponner tout' }).click();
		await feuillet.getByRole('button', { name: 'Archiver le récit' }).click();
		await expect(feuillet.getByText(/Archivé · \d\d:\d\d/)).toBeVisible();
		await feuillet.getByRole('link', { name: /Lire le récit/ }).click();
		await expect(page).toHaveURL(/\/table\/archives\//);
		await expect(page.getByRole('heading', { name: /Notes du MJ/ })).toBeVisible();
	});

	test('à 390 px : accordéon, parties en onglets, sans débordement', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await connecter(page, 'mj');
		await ouvrirTable(page, 'Table de poche', 3);
		await sansDebordement(page);
		await page.getByRole('button', { name: 'Démarrer' }).click();
		await expect(page.getByRole('tab', { name: 'Déclarations' })).toBeVisible();
		await page.getByRole('tab', { name: 'Journal' }).click();
		await expect(page.getByRole('heading', { name: 'Journal du combat' })).toBeVisible();
		await sansDebordement(page);
	});
});

test.describe('Apparitions et archives', () => {
	test('tirer puis envoyer à la Table', async ({ page }) => {
		await connecter(page, 'mj');
		await page.goto('/table/apparitions');
		await page.getByRole('button', { name: 'Tirer' }).click();
		await expect(page.getByText(/Tiré · \d\d:\d\d/)).toBeVisible();
		await expect(page.locator('.groupes li').first()).toBeVisible();
		await Promise.all([page.waitForURL(/\/table\/combat\//), page.getByRole('button', { name: /Envoyer à la Table/ }).click()]);
	});

	test('archives : le récit de démonstration, la recherche, le vide', async ({ page }) => {
		await connecter(page, 'mj');
		await page.goto('/table/archives');
		await expect(page.locator('.recits li').first()).toBeVisible();
		await page.fill('input[name="q"]', 'zzzz-introuvable');
		await page.getByRole('button', { name: 'Chercher' }).click();
		await expect(page.getByText('Aucun récit ne porte ce titre.')).toBeVisible();
	});

	test('publier un extrait a posteriori puis le rayer avec motif', async ({ page }) => {
		await connecter(page, 'mj');
		await page.goto('/table/archives/c_demo_lisiere');
		await page.fill('textarea[name="extrait"]', 'La lisière a tenu.\nLe vouivre est reparti vers le canyon.');
		await page.getByRole('button', { name: 'Publier l’extrait' }).click();
		await expect(page.getByText(/Publié · \d\d:\d\d/).first()).toBeVisible();
		await page.getByRole('button', { name: 'Rayer la publication' }).first().click();
		await page.fill('input[name="motif"]', 'extrait trop bavard');
		await page.locator('form.rature').getByRole('button', { name: 'Rayer la publication' }).click();
		await expect(page.getByText(/il ne se lit plus nulle part/).first()).toBeVisible();
	});

	for (const chemin of ['/table', '/table/apparitions', '/table/archives']) {
		test(`${chemin} sans débordement à 390 px`, async ({ page }) => {
			await page.setViewportSize({ width: 390, height: 844 });
			await connecter(page, 'mj');
			await page.goto(chemin);
			await sansDebordement(page);
		});
	}
});

async function nouvellePage(browser: Browser) {
	const ctx = await browser.newContext();
	return ctx.newPage();
}
