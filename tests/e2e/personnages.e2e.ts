// U6 — 03-vision §5.10, P4 et P9. Connexions et écritures par les formulaires réels.
import { expect, test, type Page, type BrowserContext } from './fixtures';
import { mkdir } from 'node:fs/promises';

const PASSWORDS: Record<string, string> = {
	mj: 'Maitre-audit-123!',
	admin: 'Admin-audit-123!',
	alice: 'Alice-audit-123!',
	bob: 'Bob-audit-123!',
	designer: 'Designer-audit-123!',
	nova: 'Nova-audit-123!'
};
const LIST = '/table/personnages';
const ARIA = `${LIST}/p_demo_aria`;
const CONFLICT = 'Quelqu’un a écrit sur cette page entre-temps. Relis avant d’écrire par-dessus.';
// Une connexion réelle par rôle ; les contextes suivants reprennent sa session. Le seuil d’authentification reste testé ailleurs.
const sessions = new Map<string, Parameters<BrowserContext['addCookies']>[0]>();
test.use({ viewport: { width: 1440, height: 900 } });

async function capturerEtat(page: Page, name: string, chapterId?: string) {
	await mkdir('test-results/captures/u6-etats', { recursive: true });
	for (const width of [1440, 390]) {
		await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
		await page.waitForTimeout(100); // Le media query pose les chapitres avant la capture.
		for (const theme of ['dark', 'light']) {
			await page.evaluate((theme) => {
				document.documentElement.dataset.theme = theme;
				document.documentElement.dataset.ton = theme === 'light' ? 'clair' : 'sombre';
			}, theme);
			if (chapterId) {
				const chapter = page.locator(`#${chapterId}`);
				await chapter.evaluate((el) => {
					for (let p: Element | null = el; p; p = p.parentElement)
						if (p instanceof HTMLDetailsElement) p.open = true;
				});
				await chapter.screenshot({
					path: `test-results/captures/u6-etats/${name}-${width}-${theme}.png`
				});
			} else
				await page.screenshot({
					path: `test-results/captures/u6-etats/${name}-${width}-${theme}.png`,
					fullPage: true
				});
			await tenue(page);
		}
	}
	await page.setViewportSize({ width: 1440, height: 900 });
}

async function connecter(page: Page, pseudo: string) {
	const cookies = sessions.get(pseudo);
	if (cookies) {
		await page.context().addCookies(cookies);
		await page.goto('/compte', { waitUntil: 'networkidle' });
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		if (!new URL(page.url()).pathname.startsWith('/entrer')) return;
		// Un autre paquet peut redémarrer la base de démonstration pendant les vérifications.
		sessions.delete(pseudo);
	}
	await page.goto('/entrer', { waitUntil: 'networkidle' });
	await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', { timeout: 15_000 });
	await page.locator('input[name="pseudo"]').fill(pseudo);
	await page.locator('input[name="password"]').fill(PASSWORDS[pseudo]);
	await page.locator('form button[type="submit"]').click();
	await page.waitForURL((u) => !u.pathname.startsWith('/entrer'));
	await page.waitForLoadState('networkidle');
	sessions.set(pseudo, await page.context().cookies());
}

async function ouvrir(page: Page, id: string) {
	const details = page.locator(`#${id}`);
	if ((await details.getAttribute('open')) === null)
		await details.locator(':scope > summary').click();
	return details;
}

async function tamponner(page: Page, id: string, motif: string) {
	const details = await ouvrir(page, id);
	await details.locator('input[name="motif"]').fill(motif);
	const response = page.waitForResponse(
		(r) => r.request().method() === 'POST' && r.url().includes('?/')
	);
	await details.getByRole('button', { name: 'Tamponner', exact: true }).click();
	expect((await response).status()).toBe(200);
	await expect(page.locator('#consequences')).toContainText(motif);
}

async function creer(page: Page, name: string) {
	await page.goto(LIST, { waitUntil: 'networkidle' });
	await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', { timeout: 15_000 });
	await page.getByRole('link', { name: 'Nouveau personnage', exact: true }).click();
	const details = page.locator('#nouveau');
	await details.locator('input[name="name"]').fill(name);
	await details.locator('select[name="oathId"]').selectOption('duelliste');
	await details.locator('input[name="motif"]').fill('Création pour la lecture du carnet.');
	await details.getByRole('button', { name: 'Tamponner', exact: true }).click();
	await expect(page).toHaveURL(/\/table\/personnages\/p_/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(name + '.');
	return new URL(page.url()).pathname;
}

async function tenue(page: Page) {
	const result = await page.evaluate(() => {
		const visible = [...document.querySelectorAll<HTMLElement>('body *')].filter(
			(e) =>
				e.getClientRects().length &&
				e.children.length === 0 &&
				e.textContent?.trim() &&
				!e.closest('.sr-only')
		);
		return {
			scroll: document.documentElement.scrollWidth,
			width: document.documentElement.clientWidth,
			petits: visible
				.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 12)
				.map((e) => e.textContent),
			petitesCibles: [
				...document.querySelectorAll<HTMLElement>(
					'button, summary, input:not([type="hidden"]), select'
				)
			]
				.filter((e) => e.getClientRects().length && e.getBoundingClientRect().height < 44)
				.map((e) => e.tagName)
		};
	});
	expect(result.scroll).toBeLessThanOrEqual(result.width);
	expect(result.petits).toEqual([]);
	expect(result.petitesCibles).toEqual([]);
}

test.describe('Personnages — lectures et droits', () => {
	test('un visiteur revient au formulaire Entrer', async ({ page }) => {
		await page.goto(LIST);
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await expect(page).toHaveURL(/\/entrer/);
	});
	for (const pseudo of ['alice', 'bob', 'designer', 'nova']) {
		test(`${pseudo} ne reçoit aucune fiche réservée`, async ({ page }) => {
			await connecter(page, pseudo);
			for (const path of [LIST, ARIA]) {
				const response = await page.goto(path);
				await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
					timeout: 15_000
				});
				expect(response?.status()).toBe(404);
				if (pseudo === 'nova' && path === LIST) await capturerEtat(page, 'compte-en-attente-refus');
				await expect(page.locator('#attribuer')).toHaveCount(0);
				await expect(
					page.getByText('La brume ne se lève pas. Kael dit qu’elle écoute.')
				).toHaveCount(0);
			}
			// Le refus de mutation se vérifie avec une session encore ouverte, sans suivre une redirection.
			await connecter(page, pseudo);
			const denied = await page.request.post(`${ARIA}?/corriger`, {
				maxRedirects: 0,
				form: {
					resource: 'pv',
					newValue: '20',
					expectedRevision: '1',
					motif: 'Écriture interdite.'
				}
			});
			expect(denied.status()).toBe(404);
		});
	}
	test('recherche et filtres restent dans l’adresse ; vide en une phrase', async ({ page }) => {
		await connecter(page, 'mj');
		await page.goto(`${LIST}?recherche=Aria&serment=duelliste&liaison=relie`);
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await expect(page.locator('.liste')).toContainText('Aria Lunval');
		await expect(page.locator('.liste')).not.toContainText('Kael Morvan');
		await expect(page.locator('.liste')).toContainText('relié à alice');
		await page.goto(`${LIST}?liaison=non-relie`);
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await expect(page.locator('.liste')).toContainText('Seren Vallombre');
		await expect(page.locator('.liste')).not.toContainText('Aria Lunval');
		await page.goto(`${LIST}?recherche=personnage-inexistant-u6`);
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await expect(page.getByText('Aucun personnage. Le premier s’écrit ici.')).toBeVisible();
		await capturerEtat(page, 'liste-vide');
	});
	test('le MJ lit le journal mais ne reçoit pas les opérations sensibles', async ({ page }) => {
		await connecter(page, 'mj');
		await page.goto(ARIA, { waitUntil: 'networkidle' });
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await expect(page.getByText('Lu par le joueur, les MJ et les administrateurs.')).toBeVisible();
		await expect(page.locator('#journal')).toContainText('La brume ne se lève pas.');
		await expect(page.locator('#sensible')).toHaveCount(0);
		await expect(page.locator('form[action="?/identite"]')).toHaveCount(0);
	});
});

test.describe('Personnages — tampons', () => {
	test('création, objets, gemmes, statuts, équipement et correction laissent une trace', async ({
		page
	}) => {
		await connecter(page, 'mj');
		await creer(page, `Élève des brumes ${Date.now()}`);
		await expect(page.locator('#inventaire')).toContainText('Rien dans les poches.');
		await expect(page.locator('#ressources')).toContainText('Aucune gemme.');
		await expect(page.locator('#journal')).toContainText('Cette page est blanche. Elle t’attend.');
		await capturerEtat(page, 'fiche-vide', 'inventaire');
		let editor = await ouvrir(page, 'objet-ajouter');
		await editor.locator('[name="name"]').fill('Gemme Blanche');
		await editor.locator('[name="category"]').selectOption('Gemme');
		await editor.locator('[name="qty"]').fill('2');
		await editor.locator('[name="note"]').fill('Obtenue sur la lisière.');
		await tamponner(page, 'objet-ajouter', 'Deux gemmes pour le récit.');
		await expect(page.locator('#inventaire')).toContainText('Gemme Blanche');
		editor = await ouvrir(page, 'gemmes');
		await editor.locator('[name="kind"]').selectOption('blanche');
		await expect(editor.locator('[name="qty"]')).toHaveAttribute('max', '2');
		await editor.locator('[name="qty"]').fill('1');
		await expect(editor).toContainText('+5 XP proposés');
		await tamponner(page, 'gemmes', 'Une gemme fusionnée.');
		await expect(editor.locator('[name="qty"]')).toHaveAttribute('max', '1');
		editor = await ouvrir(page, 'statut-poser');
		await editor.locator('[name="statusId"]').selectOption('inspire');
		await editor.locator('[name="note"]').fill('Le récit soutient sa main.');
		await tamponner(page, 'statut-poser', 'Inspiré par la rencontre.');
		await expect(page.locator('#ressources')).toContainText('Inspiré');
		editor = await ouvrir(page, 'statut-retirer');
		await editor.locator('[name="statusId"]').selectOption('inspire');
		await tamponner(page, 'statut-retirer', 'La rencontre est close.');
		await expect(page.locator('#ressources')).toContainText('Aucun statut.');
		editor = await ouvrir(page, 'equipement');
		await editor.locator('[name="helmet"]').fill('Heaume de givre');
		await tamponner(page, 'equipement', 'Heaume reçu au gué.');
		await expect(page.locator('#inventaire')).toContainText('Heaume de givre');
		editor = await ouvrir(page, 'objet-retirer');
		await editor.locator('[name="itemId"]').selectOption({ label: 'Gemme Blanche · stock 1' });
		await tamponner(page, 'objet-retirer', 'Dernière gemme remise au MJ.');
		await expect(page.locator('#inventaire')).toContainText('Rien dans les poches.');
		editor = await ouvrir(page, 'corriger');
		await editor.locator('[name="newValue"]').fill('24');
		await tamponner(page, 'corriger', 'Correction du report au gué.');
		await expect(page.locator('#consequences')).toContainText('PV : 30 → 24.');
		await expect(page.locator('#consequences s, #consequences ins')).toHaveCount(0);
		await editor.locator('[name="replacesId"]').selectOption({
			label: 'PV : 30 → 24. · Correction du report au gué.'
		});
		await editor.locator('[name="newValue"]').fill('23');
		await tamponner(page, 'corriger', 'Erreur de report rectifiée.');
		const rectification = page
			.locator('#consequences li')
			.filter({ hasText: 'Erreur de report rectifiée.' });
		await expect(rectification.locator('s')).toHaveText(/24$/);
		await expect(rectification.locator('ins')).toHaveText(/23$/);
	});

	test('P4 — XP proposée, attente du serveur, même tampon lu par Alice', async ({
		page,
		browser
	}) => {
		await connecter(page, 'mj');
		await page.goto(ARIA, { waitUntil: 'networkidle' });
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		const editor = await ouvrir(page, 'xp');
		const choice = editor
			.locator('select[name="beastId"] option')
			.filter({ hasText: /niveau 3$/ })
			.first();
		await editor.locator('[name="beastId"]').selectOption((await choice.getAttribute('value'))!);
		await editor.locator('[name="participationPct"]').fill('60');
		await expect(editor).toContainText('+18 XP proposés');
		const motif = `Combat lu ensemble ${Date.now()}.`;
		await editor.locator('[name="motif"]').fill(motif);
		await page.route('**/*?/xp', async (route) => {
			const response = await route.fetch();
			await new Promise((resolve) => setTimeout(resolve, 3000));
			await route.fulfill({ response });
		});
		await editor.locator('[name="motif"]').press('Enter');
		await expect(editor.getByText('L’encre sèche…')).toBeVisible();
		await expect(page.locator('#consequences')).not.toContainText(motif);
		await expect(page.locator('#consequences')).toContainText(motif, { timeout: 15000 });
		await expect(page.locator('#consequences')).toContainText('+18 XP');
		await expect(page.locator('#consequences .tampon').first()).toContainText(/MJ ·/);
		const context = await browser.newContext();
		const alice = await context.newPage();
		await connecter(alice, 'alice');
		await alice.goto('/carnet');
		await expect(alice.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await expect(alice.getByText(/Un MJ a tamponné/).first()).toBeVisible();
		await alice.goto('/carnet/fiche');
		await expect(alice.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await alice.locator('#consequences').evaluate((el) => {
			if (el instanceof HTMLDetailsElement) el.open = true;
		});
		await expect(alice.locator('#consequences')).toContainText(motif);
		await context.close();
	});

	test('motif obligatoire ; refus métier et interruption gardent la saisie', async ({ page }) => {
		await connecter(page, 'mj');
		await creer(page, `Saisie gardée ${Date.now()}`);
		const editor = await ouvrir(page, 'corriger');
		await editor.locator('[name="newValue"]').fill('30');
		await expect(editor.locator('[name="motif"]')).toHaveAttribute('required', '');
		await editor.locator('[name="motif"]').fill('Le motif reste ici.');
		await editor.getByRole('button', { name: 'Tamponner' }).click();
		await expect(editor.getByRole('alert')).toContainText('identique à l’ancienne');
		await expect(editor.locator('[name="motif"]')).toHaveValue('Le motif reste ici.');
		await capturerEtat(page, 'refus-metier', 'corriger');
		await editor.locator('[name="newValue"]').fill('29');
		await page.route('**/*?/corriger', (route) => route.abort('internetdisconnected'));
		await editor.getByRole('button', { name: 'Tamponner' }).click();
		await expect(editor.getByRole('alert')).toContainText(
			'Le registre n’a pas pu se mettre à jour depuis'
		);
		await expect(editor.locator('[name="newValue"]')).toHaveValue('29');
		await expect(page.locator('#ressources')).toContainText(/30\s*\/\s*30/);
		await capturerEtat(page, 'reseau-interrompu', 'corriger');
		await page.unroute('**/*?/corriger');
		await tamponner(page, 'corriger', 'Le réseau revient.');
	});

	test('deux MJ : conflit, dernier tampon et Relire sans écrasement', async ({ page, browser }) => {
		await connecter(page, 'mj');
		const path = await creer(page, `Deux écritures ${Date.now()}`);
		const context: BrowserContext = await browser.newContext();
		const other = await context.newPage();
		await connecter(other, 'mj');
		await other.goto(path, { waitUntil: 'networkidle' });
		await expect(other.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		const editor = await ouvrir(other, 'corriger');
		await editor.locator('[name="newValue"]').fill('28');
		await editor.locator('[name="motif"]').fill('Deuxième main, saisie gardée.');
		const first = await ouvrir(page, 'corriger');
		await first.locator('[name="newValue"]').fill('29');
		await tamponner(page, 'corriger', 'Première main, page écrite.');
		await editor.getByRole('button', { name: 'Tamponner' }).click();
		await expect(editor.getByRole('alert')).toContainText(CONFLICT);
		await expect(editor).toContainText('Première main, page écrite.');
		await expect(editor.locator('[name="newValue"]')).toHaveValue('28');
		await capturerEtat(other, 'conflit-deux-mj', 'corriger');
		await editor.getByRole('button', { name: 'Relire', exact: true }).click();
		await expect(editor).toContainText('Le relevé est relu.');
		await expect(editor.locator('[name="motif"]')).toHaveValue('Deuxième main, saisie gardée.');
		await capturerEtat(other, 'conflit-relu', 'corriger');
		await tamponner(other, 'corriger', 'Deuxième main, saisie gardée.');
		await context.close();
	});

	test('report et rature des déclarations ; faits tamponnés, réglés ou refusés', async ({
		page,
		browser
	}) => {
		const ownerContext = await browser.newContext();
		const owner = await ownerContext.newPage();
		await connecter(owner, 'alice');
		// Les commandes testées ici utilisent les form actions du cahier joueur, jamais un appel de domaine direct.
		await owner.goto('/carnet/scene', { waitUntil: 'networkidle' });
		await expect(owner.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await owner.getByRole('button', { name: 'Déclarer', exact: true }).nth(1).click();
		const declaration = owner.locator('#ligne-ep');
		await declaration.locator('[name="choix"]').selectOption('regle:esquive');
		const declared = owner.waitForResponse((r) => r.request().method() === 'POST');
		await declaration.locator('button[type="submit"]').click();
		expect((await declared).status()).toBe(200);
		await connecter(page, 'mj');
		await page.goto(ARIA, { waitUntil: 'networkidle' });
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		const pending = page.locator('#declarations details').first();
		await pending.locator('summary').click();
		await pending.locator('[name="motif"]').fill('Report depuis le salon.');
		await capturerEtat(page, 'declaration-a-reporter', 'declarations');
		await pending.getByRole('button', { name: 'Reporter', exact: true }).click();
		await expect(page.locator('#consequences')).toContainText('Report depuis le salon.');
		await expect(page.locator('#declarations')).toContainText(
			'Aucune déclaration n’attend de report.'
		);
		const beforeStrike = await page.locator('#ressources').innerText();
		await owner.goto('/carnet/scene', { waitUntil: 'networkidle' });
		await expect(owner.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		await owner.getByRole('button', { name: 'Déclarer', exact: true }).nth(1).click();
		await declaration.locator('[name="choix"]').selectOption('regle:esquive');
		const secondDeclaration = owner.waitForResponse((r) => r.request().method() === 'POST');
		await declaration.locator('button[type="submit"]').click();
		expect((await secondDeclaration).status()).toBe(200);
		await page.reload({ waitUntil: 'networkidle' });
		await pending.locator('summary').click();
		await pending.locator('[name="motif"]').fill('Déclaration doublée, gardée en rature.');
		await capturerEtat(page, 'declaration-a-rayer', 'declarations');
		await pending.getByRole('button', { name: 'Rayer', exact: true }).click();
		await expect(page.locator('#declarations')).toContainText(
			'Aucune déclaration n’attend de report.'
		);
		expect(await page.locator('#ressources').innerText()).toBe(beforeStrike);
		await owner.goto('/carnet/journal?voix=faits', { waitUntil: 'networkidle' });
		await expect(owner.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		const proposed = owner.locator('form[action="?/proposerFait"]');
		await proposed.evaluate((el) => {
			for (let p = el.parentElement; p; p = p.parentElement)
				if (p instanceof HTMLDetailsElement) p.open = true;
		});
		await proposed.locator('[name="kind"]').selectOption('promesse');
		await proposed.locator('[name="counterpart"]').fill('Kael');
		await proposed.locator('[name="text"]').fill('Revenir au gué ensemble.');
		const proposedResponse = owner.waitForResponse((r) => r.request().method() === 'POST');
		await proposed.locator('button[type="submit"]').click();
		expect((await proposedResponse).status()).toBe(200);
		await page.reload({ waitUntil: 'networkidle' });
		let fact = page.locator('#faits > .faits > li').filter({ hasText: 'Revenir au gué ensemble.' });
		await ouvrir(page, (await fact.locator('details').getAttribute('id'))!);
		await fact.locator('[name="motif"]').fill('Promesse lue dans le salon.');
		await capturerEtat(page, 'fait-propose', 'faits');
		await fact.getByRole('button', { name: 'Tamponner', exact: true }).click();
		await expect(fact).toContainText('validé');
		await capturerEtat(page, 'fait-tamponne', 'faits');
		await ouvrir(page, (await fact.locator('details').getAttribute('id'))!);
		await fact.locator('[name="motif"]').fill('Retour au gué écrit.');
		await fact.getByRole('button', { name: 'Régler', exact: true }).click();
		await expect(fact).toContainText('réglé');
		await capturerEtat(page, 'fait-regle', 'faits');
		await owner.reload({ waitUntil: 'networkidle' });
		await proposed.evaluate((el) => {
			for (let p = el.parentElement; p; p = p.parentElement)
				if (p instanceof HTMLDetailsElement) p.open = true;
		});
		await proposed.locator('[name="kind"]').selectOption('observation');
		await proposed.locator('[name="text"]').fill('Observation proposée sans témoin.');
		const refusedProposal = owner.waitForResponse((r) => r.request().method() === 'POST');
		await proposed.locator('button[type="submit"]').click();
		expect((await refusedProposal).status()).toBe(200);
		await page.reload({ waitUntil: 'networkidle' });
		fact = page
			.locator('#faits > .faits > li')
			.filter({ hasText: 'Observation proposée sans témoin.' });
		await ouvrir(page, (await fact.locator('details').getAttribute('id'))!);
		await fact.locator('[name="motif"]').fill('Le salon ne porte pas ce récit.');
		await fact.getByRole('button', { name: 'Refuser', exact: true }).click();
		await expect(fact).toContainText('refusé');
		await expect(fact).toContainText('Le salon ne porte pas ce récit.');
		await capturerEtat(page, 'fait-refuse', 'faits');
		await ownerContext.close();
	});

	test('administrateur : identité motivée puis rature par le nom', async ({ page }) => {
		await connecter(page, 'admin');
		const name = `Identité des brumes ${Date.now()}`;
		const path = await creer(page, name);
		const editor = await ouvrir(page, 'identite');
		await editor.locator('[name="name"]').fill(name + ' relue');
		await editor.locator('[name="levelDelta"]').fill('1');
		await capturerEtat(page, 'identite-a-tamponner', 'sensible');
		await tamponner(page, 'identite', 'Niveau et identité relus ensemble.');
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(name + ' relue.');
		const strike = await ouvrir(page, 'rayerPersonnage');
		await strike.locator('[name="typedName"]').fill('Nom incorrect');
		await strike.locator('[name="motif"]').fill('Fiche rayée à la demande du joueur.');
		await strike.getByRole('button', { name: 'Rayer ce personnage', exact: true }).click();
		await expect(strike.getByRole('alert')).toContainText('ne correspond pas');
		await capturerEtat(page, 'rature-nom-refuse', 'sensible');
		await strike.locator('[name="typedName"]').fill(name + ' relue');
		await strike.getByRole('button', { name: 'Rayer ce personnage', exact: true }).click();
		await expect(page).toHaveURL(new RegExp(`${LIST}$`));
		const response = await page.goto(path);
		await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
			timeout: 15_000
		});
		expect(response?.status()).toBe(404);
	});
});

for (const pseudo of ['mj', 'admin']) {
	for (const width of [1440, 390]) {
		for (const theme of ['dark', 'light']) {
			test(`tenue et captures — ${pseudo}, ${width}, ${theme}`, async ({ page }) => {
				await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
				await page.emulateMedia({ reducedMotion: 'reduce' });
				await connecter(page, pseudo);
				const errors: string[] = [];
				page.on('pageerror', (e) => errors.push(e.message));
				await mkdir('test-results/captures/u6-etats', { recursive: true });
				await page.goto(LIST);
				await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
					timeout: 15_000
				});
				await page.evaluate((theme) => {
					document.documentElement.dataset.theme = theme;
					document.documentElement.dataset.ton = theme === 'light' ? 'clair' : 'sombre';
				}, theme);
				await tenue(page);
				await page.screenshot({
					path: `test-results/captures/u6-etats/liste-${pseudo}-${width}-${theme}.png`,
					fullPage: true
				});
				await page.goto(ARIA, { waitUntil: 'networkidle' });
				await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', {
					timeout: 15_000
				});
				await page.evaluate((theme) => {
					document.documentElement.dataset.theme = theme;
					document.documentElement.dataset.ton = theme === 'light' ? 'clair' : 'sombre';
				}, theme);
				for (const id of [
					'ressources',
					'inventaire',
					'serment',
					'consequences',
					'attribuer',
					'declarations',
					'faits',
					'journal',
					...(pseudo === 'admin' ? ['sensible'] : [])
				]) {
					const chapter = await ouvrir(page, id);
					if (id === 'attribuer') {
						const xp = await ouvrir(page, 'xp');
						await xp.locator('[name="beastId"]').selectOption('b_demo_vouivre');
					}
					await tenue(page);
					await chapter.screenshot({
						path: `test-results/captures/u6-etats/${id}-${pseudo}-${width}-${theme}.png`
					});
				}
				await expect(page.locator('#sensible .sur-ordinateur')).toBeVisible({
					visible: pseudo === 'admin' && width === 390
				});
				expect(errors).toEqual([]);
			});
		}
	}
}
