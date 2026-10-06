// P1–P9 de 03-vision §10. Les tests de domaine et les autres fichiers approfondissent chaque geste.
import { test, expect } from './fixtures';
import { connecter, lire, mesurer, ouvrirTable, passerLeRound } from './parcours-helpers';
import { contrastRatio } from '../../src/lib/ui/themes';

test('P1 — retrouver ses ressources, ses attentes et le même marque-page sur deux appareils', async ({
	page,
	browser
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await connecter(page, 'alice');
	await page.route('**/carnet/__data.json*', async (route) => {
		const response = await route.fetch();
		const payload = await response.json();
		for (const node of payload.nodes ?? []) {
			const values = node?.data;
			if (!Array.isArray(values)) continue;
			for (const value of values) {
				if (value && typeof value === 'object' && 'daysAway' in value) {
					value.daysAway = values.push(40) - 1;
					value.lastReadAt = values.push(new Date(Date.now() - 40 * 86400000).toISOString()) - 1;
				}
				if (value && typeof value === 'object' && 'kind' in value && values[value.kind] === 'table')
					value.text =
						values.push(
							'La Table est ouverte : Aux racines de la lisière, là où les brumes gardent les récits du passage'
						) - 1;
			}
		}
		await route.fulfill({ response, json: payload });
	});
	await lire(page, '/agenda');
	await page.getByRole('link', { name: 'Carnet', exact: true }).click();
	await expect(page.locator('.absence')).toContainText('40 jours');
	await expect(page.locator('body')).toContainText('Aria Lunval');
	await expect(page.locator('body')).toContainText('Reprendre au gué.');
	await expect(page.locator('body')).toContainText('Ce qui attend ta main');
	await expect(page.locator('progress, meter, [role="progressbar"]')).toHaveCount(0);
	const attentes = page.locator('#attend li');
	await expect(attentes).toHaveCount(3);
	const navigation = await page
		.locator('nav')
		.filter({ has: page.getByRole('link', { name: 'Plus', exact: true }) })
		.last()
		.boundingBox();
	const derniereAction = await attentes.last().locator('a').last().boundingBox();
	expect(derniereAction!.y + derniereAction!.height).toBeLessThanOrEqual(navigation!.y);
	expect(derniereAction!.height).toBeGreaterThanOrEqual(44);
	const context = await browser.newContext();
	try {
		const autre = await context.newPage();
		await connecter(autre, 'alice');
		await lire(autre, '/carnet');
		await expect(autre.locator('body')).toContainText('Reprendre au gué.');
		const corne = page.locator('ol.lignes button.ligne').first();
		await expect(corne).toBeVisible();
		const avant = await autre.locator('ol.lignes button.ligne').count();
		await corne.click();
		await page.waitForURL((u) => u.pathname !== '/carnet');
		await lire(autre, '/carnet');
		await expect(autre.locator('ol.lignes button.ligne')).toHaveCount(avant - 1);
	} finally {
		await context.close();
	}
});

test('P2 — déclarer sans changer le relevé, annuler, copier les trois lignes et reposer', async ({
	page,
	context
}) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.setViewportSize({ width: 390, height: 844 });
	await connecter(page, 'alice');
	await lire(page, '/agenda');
	await page
		.getByRole('link', { name: /^En scène/ })
		.first()
		.click();
	await expect(page.locator('[data-regime="scene"]').first()).toBeVisible();
	const avant = await page.locator('.etat').first().textContent();
	await page.getByRole('button', { name: 'Déclarer', exact: true }).nth(1).click();
	await page.selectOption('#choix-ep', 'regle:esquive');
	await page.locator('form.ligne-carnet button[type="submit"]').click();
	await page
		.locator('.decl')
		.filter({ hasText: /−8\s?EP \(Esquive\)/ })
		.getByRole('button', { name: /Annuler/ })
		.click();
	await expect(page.locator('.decl.rayee s')).toContainText(/−8\s?EP/);
	expect(await page.locator('.etat').first().textContent()).toBe(avant);
	const bloc = await page.locator('pre.apercu-bloc').textContent();
	expect(bloc?.split('\n')).toHaveLength(3);
	await page.getByRole('button', { name: 'Copier pour Discord' }).click();
	expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n')).toBe(
		bloc
	);
	await page.getByRole('button', { name: 'Règle', exact: true }).click();
	await expect(page.locator('#panneau-feuillet section')).toHaveCount(1);
	await expect(page.getByRole('link', { name: /Voir dans le système/ })).toHaveAttribute(
		'href',
		/^\/univers\/systeme#/
	);
	await page.getByRole('button', { name: 'Reposer', exact: true }).click();
	await expect(page.locator('form.reposer')).toBeVisible();
	await lire(page, '/agenda');
	await page.setViewportSize({ width: 1440, height: 900 });
	await page
		.getByRole('link', { name: /^En scène/ })
		.first()
		.click();
	await expect(page.getByRole('dialog', { name: 'En scène' })).toBeVisible();
	await expect(
		page
			.locator('body > div')
			.filter({ has: page.locator('main') })
			.first()
	).toBeVisible();
	await expect(page.locator('[inert]')).toHaveCount(1);
	await page.getByRole('button', { name: 'Déclarer', exact: true }).nth(1).click();
	await page.selectOption('#choix-ep', 'regle:esquive');
	await page.locator('form.ligne-carnet button[type="submit"]').click();
	await expect(
		page
			.locator('.decl')
			.filter({ hasText: /−8\s?EP \(Esquive\)/ })
			.last()
	).toBeVisible();
	await page.getByRole('button', { name: 'Reposer', exact: true }).click();
	await expect(page.locator('form.reposer')).toBeVisible();
	await page.locator('form.reposer').getByRole('button', { name: 'Reposer', exact: true }).click();
	await expect(page).toHaveURL(/\/agenda$/);
	await expect(page.locator('[inert]')).toHaveCount(0);
});

test('P3 — suivre trois rounds, une rature, puis le retard réseau et le refus de Bob', async ({
	browser
}) => {
	test.setTimeout(90_000);
	const cm = await browser.newContext();
	const cj = await browser.newContext({ viewport: { width: 390, height: 844 } });
	const cb = await browser.newContext();
	try {
		const mj = await cm.newPage();
		await connecter(mj, 'mj');
		const id = await ouvrirTable(mj, 'Trois rounds au gué');
		await mj.getByRole('button', { name: 'Gestes sur Aria Lunval', exact: true }).click();
		const depart = mj.locator('.panneau form.geste');
		await depart.locator('input[type="number"]').fill('24');
		await depart.getByRole('button', { name: 'Noter', exact: true }).click();
		await mj.getByRole('button', { name: 'Sauvegarder', exact: true }).click();
		await expect(mj.locator('.releve')).not.toContainText('non sauvegardé');
		await mj.getByRole('button', { name: 'Démarrer', exact: true }).click();
		const alice = await cj.newPage();
		await connecter(alice, 'alice');
		await lire(alice, `/carnet/table/${id}`);
		await expect(alice.locator('[data-regime="scene"]').first()).toBeVisible();
		await expect(
			alice.locator('[data-zone-table] a, [data-zone-table] button, [data-zone-table] input')
		).toHaveCount(0);
		await expect(alice.getByText(/^(Léger|Grave|Critique)$/i).first()).toBeVisible();
		for (let n = 1; n <= 3; n++) {
			await passerLeRound(mj);
			if (n === 3) {
				await mj.getByRole('button', { name: 'Gestes sur Aria Lunval', exact: true }).click();
				const ajustement = mj.locator('.panneau form.geste');
				await ajustement.locator('input[type="number"]').fill('18');
				await ajustement
					.locator('input[maxlength="200"]')
					.fill('Blessure vérifiée au troisième round.');
				await ajustement.getByRole('button', { name: 'Noter', exact: true }).click();
			}
			await mj.getByRole('button', { name: 'Clore le round' }).click();
			if (n === 3) {
				await expect(alice.locator('.moi s').first()).toContainText('24', { timeout: 5000 });
				await expect(alice.locator('.moi ins').first()).toContainText('18');
			}
			await expect(alice.locator('[data-zone-table]')).toContainText(`Round ${n} · résolu à`, {
				timeout: 5000
			});
		}
		const valeursVisibles = () =>
			alice.locator('.moi .trois').evaluate((element) => {
				const copie = element.cloneNode(true) as HTMLElement;
				copie.querySelectorAll('s, .sr-only').forEach((e) => e.remove());
				return copie.textContent?.replace(/\s/g, '');
			});
		const valeurs = await valeursVisibles();
		await alice.bringToFront();
		await cj.setOffline(true);
		await expect(alice.getByText(/Dernier état reçu.*en retard de \d+ s/)).toBeVisible({
			timeout: 10000
		});
		expect(await valeursVisibles()).toBe(valeurs);
		await cj.setOffline(false);
		const bob = await cb.newPage();
		await connecter(bob, 'bob');
		expect((await lire(bob, `/table/combat/${id}`))?.status()).toBe(404);
		await expect(bob.getByText('Cette Table n’est pas la tienne.')).toBeVisible();
		await expect(bob.locator('.precis')).toHaveCount(0);
		await expect(
			bob.getByText('Cette page n’existe pas dans le carnet.', { exact: true })
		).toHaveCount(0);
	} finally {
		await Promise.all([cm.close(), cj.close(), cb.close()]);
	}
});

test('P4 — tamponner +18 XP après réponse, vérifier le motif et le journal d’audit', async ({
	page,
	browser
}) => {
	await connecter(page, 'mj');
	await lire(page, '/table/personnages/p_demo_aria');
	const saisie = page
		.locator('details')
		.filter({ has: page.locator('form[action="?/xp"]') })
		.last();
	await saisie.locator('summary').click();
	const form = page.locator('form[action="?/xp"]');
	await form.locator('[name="beastId"]').selectOption('b_demo_sanglier');
	await form.locator('[name="participationPct"]').fill('60');
	await form.locator('[name="motif"]').fill('Traversée vérifiée ensemble.');
	await expect(form).toContainText('+18 XP proposés');
	await page.route('**/*?/xp', async (route) => {
		const response = await route.fetch();
		await new Promise((r) => setTimeout(r, 3000));
		await route.fulfill({ response });
	});
	await form.locator('[name="motif"]').press('Enter');
	await expect(form.getByText('L’encre sèche…')).toBeVisible();
	await expect(page.locator('#consequences')).not.toContainText('Traversée vérifiée ensemble.');
	await expect(page.locator('#consequences')).toContainText('Traversée vérifiée ensemble.', {
		timeout: 10000
	});
	await expect(form.locator('[name="beastId"]')).toHaveValue('');
	await expect(form.locator('[name="participationPct"]')).toHaveValue('100');
	await expect(form.locator('[name="motif"]')).toHaveValue('');
	await expect(form.locator('[name="motif"]')).toHaveAttribute('required', '');
	const correction = page.locator('form[action="?/corriger"]');
	await page.locator('details').filter({ has: correction }).last().locator('summary').click();
	await correction.locator('[name="resource"]').selectOption('pv');
	await correction.locator('[name="newValue"]').fill('50');
	await correction.locator('[name="motif"]').fill('Valeur revue après la traversée.');
	await correction.locator('[name="motif"]').press('Enter');
	await expect(page.locator('#consequences')).toContainText('Valeur revue après la traversée.');
	await expect(
		page
			.locator('#consequences li')
			.filter({ hasText: 'Valeur revue après la traversée.' })
			.locator('s, ins')
	).toHaveCount(0);
	await correction
		.locator('[name="replacesId"]')
		.selectOption({ label: 'PV : 51 → 50. · Valeur revue après la traversée.' });
	await correction.locator('[name="newValue"]').fill('49');
	await correction.locator('[name="motif"]').fill('Erreur de report corrigée.');
	await correction.locator('[name="motif"]').press('Enter');
	await expect(
		page.locator('#consequences li').filter({ hasText: 'Erreur de report corrigée.' }).locator('s')
	).toHaveText(/50$/);
	await expect(
		page
			.locator('#consequences li')
			.filter({ hasText: 'Erreur de report corrigée.' })
			.locator('ins')
	).toHaveText(/49$/);
	const ca = await browser.newContext();
	const cr = await browser.newContext();
	try {
		const alice = await ca.newPage();
		await connecter(alice, 'alice');
		await lire(alice, '/carnet');
		expect(await alice.locator('ol.lignes button.ligne').count()).toBeGreaterThan(0);
		await lire(alice, '/carnet/fiche');
		await expect(alice.locator('#consequences')).toContainText('+18 XP');
		await expect(alice.locator('#consequences')).toContainText('Traversée vérifiée ensemble.');
		await expect(alice.locator('#consequences .tampon').first()).toContainText(/MJ ·/);
		const corrigee = alice
			.locator('#consequences li')
			.filter({ hasText: 'Erreur de report corrigée.' });
		await expect(corrigee).toContainText('PV : 50 → 49.');
		await expect(corrigee.locator('s')).toHaveText(/50$/);
		await expect(corrigee.locator('ins')).toHaveText(/49$/);
		const admin = await cr.newPage();
		await connecter(admin, 'admin');
		await lire(admin, '/registre/journal');
		await expect(admin.locator('body')).toContainText('XP tamponnée');
		await expect(admin.locator('body')).toContainText('Traversée vérifiée ensemble.');
		await expect(admin.locator('body')).toContainText(/avant\s*: niveau 7 · 140 XP/);
		await expect(admin.locator('body')).toContainText(/après\s*: niveau 7 · 158 XP/);
	} finally {
		await Promise.all([ca.close(), cr.close()]);
	}
});

test('P5 — dix combattants, clavier, annulation, sauvegarde et conflit entre deux MJ', async ({
	page,
	browser
}) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await connecter(page, 'mj');
	await ouvrirTable(page, 'Dix à la lisière', true);
	const autreContexte = await browser.newContext();
	try {
		const autreMj = await autreContexte.newPage();
		await connecter(autreMj, 'admin');
		await lire(autreMj, new URL(page.url()).pathname);
		await expect(page.locator('.combattants li.combattant')).toHaveCount(10);
		await page.getByRole('button', { name: 'Démarrer', exact: true }).click();
		expect(
			await page
				.locator('.combattants li.combattant')
				.last()
				.evaluate((e) => e.getBoundingClientRect().bottom)
		).toBeLessThanOrEqual(900);
		await passerLeRound(page);
		await expect(page.locator('p.entete')).toContainText(/Round\s+1\s+·\s+résolu\s+à/);
		await page.getByRole('button', { name: 'Annuler le round' }).click();
		await expect(page.getByRole('button', { name: 'Résoudre le round' })).toBeEnabled();
		await page.getByRole('button', { name: 'Résoudre le round' }).click();
		await page.getByRole('button', { name: 'Clore le round' }).click();
		await expect(page.locator('.releve')).not.toContainText('non sauvegardé');
		await page.reload();
		await expect(page.getByText(/Round 2/).first()).toBeVisible();
		await page.setViewportSize({ width: 390, height: 844 });
		await expect(
			page
				.locator('li.combattant')
				.first()
				.getByRole('button', { name: /Gestes sur/ })
		).toBeVisible();
		await autreMj.getByRole('button', { name: 'Sauvegarder', exact: true }).click();
		await expect(
			autreMj.getByText(
				'Quelqu’un a écrit sur cette page entre-temps. Relis avant d’écrire par-dessus.'
			)
		).toBeVisible();
		await expect(autreMj.getByRole('button', { name: 'Garder la mienne' })).toBeVisible();
		await autreMj.getByRole('button', { name: 'Reprendre leur version' }).click();
		await expect(autreMj.locator('p.etat')).toContainText('Round 2');
	} finally {
		await autreContexte.close();
	}
});

test('P6 — lire sans compte, s’inscrire et relier en trois gestes', async ({ page, browser }) => {
	await lire(page, '/univers/premiers-pas');
	await expect(page.locator('body')).not.toContainText('<pseudo>');
	await lire(page, '/entrer/inscription');
	await page.getByRole('button', { name: /J’accepte — Continuer/ }).click();
	await page.fill('[name="pseudo"]', 'nouvelle-plume');
	await page.fill('[name="password"]', 'Plume-audit-123!');
	await page.fill('[name="passwordConfirm"]', 'Plume-audit-123!');
	await page.getByRole('button', { name: 'Ouvrir mon carnet' }).click();
	await page.waitForURL(/\/carnet/);
	await expect(page.locator('body')).toContainText('nouvelle-plume');
	const c = await browser.newContext();
	try {
		const admin = await c.newPage();
		await connecter(admin, 'admin');
		await lire(admin, '/registre');
		await admin.getByText('nouvelle-plume', { exact: true }).click();
		await admin.getByText('Seren Vallombre', { exact: true }).click();
		await admin.getByRole('button', { name: 'Lier', exact: true }).click();
		await expect(admin.locator('.liaison-faite')).toContainText('Seren Vallombre');
		await lire(page, '/carnet/fiche');
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Seren Vallombre.');
	} finally {
		await c.close();
	}
});

test('P7 — publier une observation tamponnée et protéger les réponses publiques', async ({
	page,
	browser
}) => {
	await connecter(page, 'mj');
	const id = await ouvrirTable(page, 'Traces au gué');
	await page.getByRole('button', { name: 'Démarrer', exact: true }).click();
	await page.locator('.gestes').getByRole('button', { name: 'Terminer le combat' }).click();
	const feuillet = page.locator('dialog.feuillet');
	await feuillet.getByRole('button', { name: 'Tamponner tout', exact: true }).click();
	await feuillet.getByRole('button', { name: 'Tamponner tout', exact: true }).click();
	await feuillet.getByLabel('Publier un extrait', { exact: true }).check();
	await feuillet
		.locator('[name="extrait"]')
		.fill('Le col a gardé nos traces.\nLa vouivre a regagné le canyon.');
	await feuillet.getByRole('button', { name: 'Archiver le récit', exact: true }).click();
	await expect(feuillet).toContainText('combat archivé');
	await lire(page, `/table/archives/${id}`);
	await expect(page.locator('body')).toContainText('Le col a gardé nos traces.');
	const c = await browser.newContext();
	try {
		const visiteur = await c.newPage();
		await lire(visiteur, '/');
		await expect(visiteur.locator('body')).toContainText('Le col a gardé nos traces.');
		await expect(visiteur.locator('body')).toContainText(/MJ ·/);
		const publicResponse = await visiteur.request.get('/univers/bestiaire/b_demo_loup');
		const html = await publicResponse.text();
		expect(html).toContain('La vouivre a regagné le canyon.');
		expect(html).not.toContain('b_demo_ombre');
		expect(html).not.toContain('Notes du MJ');
		await connecter(visiteur, 'alice');
		expect((await visiteur.request.get('/table/personnages/p_demo_kael')).status()).toBe(404);
	} finally {
		await c.close();
	}
});

test('P8 — états vides et brouillon gardé après un refus réseau', async ({ page }) => {
	await connecter(page, 'nova');
	await lire(page, '/carnet');
	await expect(page.locator('body')).toContainText('Ta fiche attend qu’un administrateur la relie');
	await page.request.post('/entrer/quitter');
	await connecter(page, 'alice');
	await lire(page, '/carnet/journal');
	await page.route('**/carnet/journal?/noter', (route) => route.abort());
	await page.getByLabel(/Aujourd’hui/).fill('Ce brouillon reste dans mon carnet.');
	await page.getByRole('button', { name: 'Noter', exact: true }).click();
	await expect(
		page.getByText('L’encre n’a pas pris. Ta page est gardée ici ; réessaie quand tu veux.')
	).toBeVisible();
	await page.unroute('**/carnet/journal?/noter');
	await page.reload();
	await expect(page.getByLabel(/Aujourd’hui/)).toHaveValue('Ce brouillon reste dans mon carnet.');
});

test('P9 — trois thèmes, trois largeurs, focus et mouvement réduit', async ({ page, browser }) => {
	test.setTimeout(90_000);
	await connecter(page, 'alice');
	for (const theme of ['dark', 'light', 'violet']) {
		await lire(page, '/compte/collection');
		await page
			.locator('label.feuillet')
			.filter({ has: page.locator(`input[name="themeId"][value="${theme}"]`) })
			.click();
		await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
		for (const width of [390, 768, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			await lire(page, '/carnet/fiche');
			const m = await mesurer(page);
			expect(m.contenu).toBeLessThanOrEqual(m.largeur);
			expect(m.petits).toEqual([]);
			const tenue = await page.evaluate(() => {
				const style = getComputedStyle(document.documentElement);
				return {
					page: style.getPropertyValue('--page').trim(),
					encre: style.getPropertyValue('--encre').trim(),
					secondaire: style.getPropertyValue('--encre-2').trim(),
					petitesCibles: [...document.querySelectorAll('button:not(:disabled), a[href]')]
						.filter((e) => e.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true }))
						.map((e) => ({ texte: e.textContent?.trim(), taille: e.getBoundingClientRect() }))
						.filter((e) => e.taille.width < 44 || e.taille.height < 44)
						.map((e) => e.texte)
				};
			});
			expect(tenue.petitesCibles).toEqual([]);
			expect(contrastRatio(tenue.encre, tenue.page)).toBeGreaterThanOrEqual(4.5);
			expect(contrastRatio(tenue.secondaire, tenue.page)).toBeGreaterThanOrEqual(4.5);
		}
	}
	await page.setViewportSize({ width: 1440, height: 900 });
	for (const chemin of ['/univers/systeme', '/univers/site-et-donnees', '/univers/reglement']) {
		await lire(page, chemin);
		expect(
			await page
				.locator('.tableau')
				.evaluateAll((tableaux) =>
					tableaux
						.filter((t) => t.scrollWidth > t.clientWidth)
						.map((t) => t.textContent?.slice(0, 100))
				)
		).toEqual([]);
	}
	await page.emulateMedia({ reducedMotion: 'reduce', contrast: 'more' });
	await lire(page, '/carnet/scene');
	expect(
		await page.locator('[data-feuillet]').evaluate((e) => getComputedStyle(e).animationName)
	).toBe('none');
	await page.keyboard.press('Tab');
	expect(
		await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle)
	).not.toBe('none');
	await lire(page, '/carnet/fiche');
	for (const tampon of await page.locator('.tampon').all()) {
		expect(await tampon.evaluate((e) => getComputedStyle(e).rotate)).toBe('0deg');
	}
	await lire(page, '/univers/systeme');
	expect(
		await page.locator('.page.grain').evaluate((e) => getComputedStyle(e).backgroundImage)
	).toBe('none');
	const contexte = await browser.newContext();
	try {
		const admin = await contexte.newPage();
		await connecter(admin, 'admin');
		await lire(admin, '/registre/themes');
		await admin.fill('[name="name"]', 'Brume sans contraste');
		await admin.fill('[name="id"]', 'brume-sans-contraste');
		await admin.fill('[name="--encre-2"]', '#2a3d40');
		await expect(admin.getByText(/Le thème n’est pas proposé/)).toBeVisible();
		await expect(admin.getByRole('button', { name: 'Enregistrer ce thème' })).toHaveCount(0);
	} finally {
		await contexte.close();
	}
});
