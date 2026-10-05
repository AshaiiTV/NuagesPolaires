// Paquet U3 — En scène (le feuillet volant) et la Table vue par un joueur.
// Parcours P2 (préparer une réponse en scène) et P3 (suivre la Table) de 03-vision §10, sur la base
// de démonstration en mémoire (comptes fictifs de src/lib/server/db/seed.ts).
// Les connexions sont limitées à 10 par adresse et par quart d'heure : chaque compte se connecte une
// seule fois par le formulaire /entrer, puis sa session est réutilisée.
import { expect, test, type Browser, type BrowserContext, type Page } from './fixtures';

const MDP: Record<string, string> = {
	alice: 'Alice-audit-123!',
	bob: 'Bob-audit-123!',
	mj: 'Maitre-audit-123!',
	nova: 'Nova-audit-123!'
};
const ARIA = 'p_demo_aria';
const LOUP = 'b_demo_loup';
const COMBAT_ARCHIVE = 'c_demo_lisiere';
const TELEPHONE = { width: 390, height: 844 };

type Etat = Awaited<ReturnType<BrowserContext['storageState']>>;
const sessions = new Map<string, Etat>();

/** Un contexte connecté au compte (connexion par le formulaire la première fois seulement). */
async function connecte(
	browser: Browser,
	pseudo: string,
	viewport = TELEPHONE
): Promise<{ contexte: BrowserContext; page: Page }> {
	sessions.clear();
	const connue = sessions.get(pseudo);
	const contexte = await browser.newContext({
		viewport,
		...(connue ? { storageState: connue } : {})
	});
	const page = await contexte.newPage();
	if (!connue) {
		await page.goto('/entrer');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await page.fill('input[name="pseudo"]', pseudo);
		await page.fill('input[name="password"]', MDP[pseudo]);
		await page.click('form button[type="submit"]');
		await page.waitForURL((u) => !u.pathname.startsWith('/entrer'));
		sessions.set(pseudo, await contexte.storageState());
	}
	return { contexte, page };
}

async function sansDebordement(page: Page) {
	const { scroll, client } = await page.evaluate(() => ({
		scroll: document.documentElement.scrollWidth,
		client: document.documentElement.clientWidth
	}));
	expect(scroll).toBeLessThanOrEqual(client);
}

/** Le MJ ouvre une Table avec Aria et deux loups ; renvoie son identifiant. */
async function ouvrirTable(browser: Browser, nom: string): Promise<string> {
	const { contexte, page } = await connecte(browser, 'mj', { width: 1440, height: 900 });
	await page.goto('/table');
	await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', { timeout: 15_000 });
	await page.fill('input[name="nom"]', nom);
	await page.fill('input[name="salon"]', 'https://discord.com/channels/demo/col-des-brumes');
	await page.check(`input[name="personnages"][value="${ARIA}"]`);
	const plus = page.locator(`li:has(input[name="qte_${LOUP}"]) button[aria-label$="de plus"]`);
	await plus.click();
	await plus.click();
	await page.getByRole('button', { name: 'Ouvrir la Table' }).click();
	await page.waitForURL(/\/table\/combat\//);
	const id = new URL(page.url()).pathname.split('/').pop()!;
	await contexte.close();
	return id;
}

test.describe('En scène — le feuillet volant', () => {
	let contexte: BrowserContext;
	let page: Page;
	test.beforeEach(async ({ browser }) => {
		({ contexte, page } = await connecte(browser, 'alice'));
	});
	test.afterEach(async () => {
		await contexte.close();
	});

	test('le régime scène se lit sur html, sans débordement à 390 px', async () => {
		await page.goto('/carnet/scene');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await expect(page.locator('[data-regime="scene"]').first()).toBeVisible();
		await expect(page.getByRole('heading', { level: 1, name: 'Aria Lunval' })).toBeVisible();
		await expect(page.getByRole('navigation', { name: 'Gestes du feuillet' })).toBeVisible();
		// La bande des cahiers laisse le bas de l'écran à la barre du feuillet.
		await expect(page.getByRole('navigation', { name: 'Cahiers' }).last()).toBeHidden();
		await sansDebordement(page);
	});

	test('une déclaration s’écrit humide, s’annule avant 10 s, le relevé ne bouge pas', async () => {
		await page.goto('/carnet/scene');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		const releve = await page.locator('.etat').first().textContent();
		await page.getByRole('button', { name: 'Déclarer' }).nth(1).click();
		await page.selectOption('#choix-ep', 'regle:esquive');
		await expect(page.locator('.ligne-carnet .apercu')).toHaveText(
			/^Aria Lunval déclare −8\s?EP \(Esquive\)\.$/
		);
		await page.locator('form.ligne-carnet button[type="submit"]').click();
		const ligne = page.locator('.decl', { hasText: /Aria Lunval déclare −8\s?EP \(Esquive\)\./ });
		await expect(ligne).toBeVisible();
		const annuler = ligne.getByRole('button', { name: /Annuler · \d+ s/ });
		await expect(annuler).toBeVisible();
		await annuler.click();
		await expect(page.locator('.decl.rayee s', { hasText: /−8\s?EP \(Esquive\)/ })).toBeVisible();
		expect(await page.locator('.etat').first().textContent()).toBe(releve);
	});

	test('« autre… » exige un chiffre et un mot', async () => {
		await page.goto('/carnet/scene');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await page.getByRole('button', { name: 'Déclarer' }).nth(1).click();
		await page.selectOption('#choix-ep', 'autre');
		await expect(page.locator('input[name="chiffre"]')).toBeVisible();
		await expect(page.locator('input[name="mot"]')).toBeVisible();
		await page.fill('input[name="chiffre"]', '5');
		await page.fill('input[name="mot"]', 'Course dans la neige');
		await expect(page.locator('.ligne-carnet .apercu')).toHaveText(
			/^Aria Lunval déclare −5\s?EP \(Course dans la neige\)\.$/
		);
	});

	test('les libellés de la ligne de déclaration n’ont aucun émoji', async () => {
		await page.goto('/carnet/scene');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await page.getByRole('button', { name: 'Déclarer' }).nth(1).click();
		const libelles = await page.locator('#choix-ep option').allTextContents();
		expect(libelles.length).toBeGreaterThan(1);
		for (const l of libelles) expect(l).not.toMatch(/\p{Extended_Pictographic}/u);
		expect(libelles.map((l) => l.replace(/\s/g, ' '))).toContain('Esquive · 8 EP');
	});

	test('« Copier pour Discord » copie exactement les trois lignes de l’aperçu', async () => {
		await contexte.grantPermissions(['clipboard-read', 'clipboard-write']);
		await page.goto('/carnet/scene');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		const apercu = (await page.locator('pre.apercu-bloc').textContent()) ?? '';
		expect(apercu.split('\n')).toHaveLength(3);
		await page.getByRole('button', { name: 'Copier pour Discord' }).click();
		await expect(page.getByText(/^Copié · \d{2}:\d{2} — colle-le dans le salon\.$/)).toBeVisible();
		expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n')).toBe(
			apercu.replace(/\r\n/g, '\n')
		);
	});

	test('« Règle » ouvre une seule carte avec une ancre vers le système de jeu', async () => {
		await page.goto('/carnet/scene');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await page.getByRole('button', { name: 'Règle' }).click();
		await expect(page.locator('#panneau-feuillet section')).toHaveCount(1);
		const lien = page.getByRole('link', { name: /Voir dans le système de jeu/ });
		await expect(lien).toHaveAttribute('href', /^\/univers\/systeme#/);
		await page.keyboard.press('Escape');
		await expect(page.locator('#panneau-feuillet section')).toHaveCount(0);
	});

	test('« Reposer » propose le marque-page puis rend la page', async () => {
		await page.goto('/carnet');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await page.goto('/carnet/scene');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await page.getByRole('button', { name: 'Reposer' }).click();
		await expect(page.locator('form.reposer input[name="text"]')).toBeVisible();
		await expect(page.getByLabel('Lien du message Discord')).toBeVisible();
		await page.locator('form.reposer input[name="text"]').fill('Aria guette le gué.');
		await page.locator('form.reposer button[type="submit"]').click();
		await page.waitForURL((u) => u.pathname === '/carnet');
	});

	test('pas de réseau : la déclaration reste humide avec « Réessayer »', async () => {
		await page.goto('/carnet/scene');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await contexte.setOffline(true);
		await page.getByRole('button', { name: 'Déclarer' }).nth(1).click();
		await page.locator('form.ligne-carnet button[type="submit"]').click();
		await expect(
			page.getByText(/^Pas de réseau\. Tes chiffres restent ceux de \d{2}:\d{2}\.$/).first()
		).toBeVisible();
		await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible();
		await contexte.setOffline(false);
	});
});

test.describe('En scène — droits', () => {
	test('un compte en attente de liaison est renvoyé vers Dernières pages', async ({ browser }) => {
		const { contexte, page } = await connecte(browser, 'nova');
		await page.goto('/carnet/scene');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await expect(page).toHaveURL(/\/carnet$/);
		await page.goto(`/carnet/table/${COMBAT_ARCHIVE}`);
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await expect(page).toHaveURL(/\/carnet$/);
		await contexte.close();
	});

	test('un visiteur est renvoyé vers l’entrée', async ({ page }) => {
		await page.goto('/carnet/scene');
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await expect(page).toHaveURL(/\/entrer/);
	});
});

test.describe('La Table vue par un joueur', () => {
	test('Table repliée : la phrase exacte et le lien vers le récit', async ({ browser }) => {
		const { contexte, page } = await connecte(browser, 'alice');
		await page.goto(`/carnet/table/${COMBAT_ARCHIVE}`);
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await expect(
			page.getByText('La Table est repliée. Le récit est dans ton journal.')
		).toBeVisible();
		await expect(page.getByRole('link', { name: /Lire le récit/ })).toHaveAttribute(
			'href',
			`/carnet/recits/${COMBAT_ARCHIVE}`
		);
		await sansDebordement(page);
		await contexte.close();
	});

	test('Table en cours : lecture seule, adversaires en état narratif, refus du non participant', async ({
		browser
	}) => {
		const id = await ouvrirTable(browser, 'Col des brumes');

		const { contexte, page: alice } = await connecte(browser, 'alice');
		await alice.goto(`/carnet/table/${id}`);
		await expect(alice.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await expect(alice.locator('[data-regime="scene"]').first()).toBeVisible();
		await expect(alice.getByRole('heading', { level: 1 })).toContainText(
			'À la table — Col des brumes'
		);
		await expect(alice.getByText(/^Dernier état reçu à \d{2}:\d{2}\.$/)).toBeVisible();
		// Aucun élément cliquable dans la zone de la Table.
		const zone = alice.locator('[data-zone-table]');
		await expect(zone).toBeVisible();
		await expect(zone.locator('a, button, input, select, textarea, [tabindex]')).toHaveCount(0);
		// Les PV des adversaires apparaissent comme un état narratif.
		await expect(zone.getByText(/^(Léger|Grave|Critique)$/i).first()).toBeVisible();
		// Seuls trois gestes en bas.
		const gestes = alice.getByRole('navigation', { name: 'Gestes de la Table' });
		await expect(gestes.getByRole('button', { name: 'Copier pour Discord' })).toBeVisible();
		await expect(gestes.getByRole('button', { name: 'Règle' })).toBeVisible();
		await expect(gestes.getByRole('link', { name: /Ouvrir le salon/ })).toBeVisible();
		await sansDebordement(alice);

		// Le sondage interroge l'état versionné avec If-None-Match.
		const sondage = await alice.waitForRequest((r) => r.url().includes(`/api/table/${id}/etat`), {
			timeout: 10_000
		});
		expect(sondage.headers()['if-none-match']).toBeTruthy();

		// Réseau coupé : « en retard de N s », les chiffres ne bougent pas.
		const chiffres = await alice.locator('.moi .trois').textContent();
		await contexte.setOffline(true);
		await expect(
			alice.getByText(/^Dernier état reçu à \d{2}:\d{2} · en retard de \d+ s\.$/)
		).toBeVisible({ timeout: 12_000 });
		expect(await alice.locator('.moi .trois').textContent()).toBe(chiffres);
		await contexte.setOffline(false);
		await contexte.close();

		const { contexte: cb, page: bob } = await connecte(browser, 'bob');
		const reponse = await bob.goto(`/carnet/table/${id}`);
		await expect(bob.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		expect(reponse?.status()).toBe(404);
		await expect(bob.getByText('Cette Table n’est pas la tienne.')).toBeVisible();
		const api = await bob.request.get(`/api/table/${id}/etat`);
		expect(api.status()).toBe(404);
		await cb.close();
	});
});
