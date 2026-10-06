import { mkdir } from 'node:fs/promises';
import { test, expect, type Page } from './fixtures';
import { connecter, lire, mesurer, ouvrirTable, passerLeRound } from './parcours-helpers';
import { contrastRatio } from '../../src/lib/ui/themes';

const captures = '.claude/captures/corrections-3';
async function capturer(page: Page, nom: string, width: number) {
	await mkdir(captures, { recursive: true });
	await page.evaluate(() => document.fonts.ready);
	await page.waitForTimeout(400);
	await page.screenshot({ path: `${captures}/${nom}-${width}.png` });
}

test('P8/P9 — marque-page refusé conservé au rechargement, bouton lisible dans trois thèmes', async ({
	page
}) => {
	await connecter(page, 'alice');
	for (const theme of ['dark', 'light', 'violet']) {
		await lire(page, '/compte/collection');
		await page
			.locator('label.feuillet')
			.filter({ has: page.locator(`input[value="${theme}"]`) })
			.click();
		await lire(page, '/carnet');
		if (!(await page.locator('#marque-form').count()))
			await page.getByRole('button', { name: 'Réécrire le marque-page' }).click();
		await page.locator('#marque-form [name="text"]').fill(`Brouillon gardé en ${theme}.`);
		await page
			.locator('#marque-form [name="url"]')
			.fill('https://discord.com/channels/demo/brouillon');
		await page.route('**/carnet?/marquePage', (route) => route.abort());
		await page.locator('#marque-form button[type="submit"]').click();
		await expect(page.locator('#marque-form .encre.refusee')).toBeVisible();
		await page.waitForTimeout(650);
		const couleurs = await page.locator('#marque-form button[type="submit"]').evaluate((e) => {
			const canvas = document.createElement('canvas');
			canvas.width = canvas.height = 1;
			const ctx = canvas.getContext('2d')!;
			const hex = (couleur: string) => {
				ctx.fillStyle = couleur;
				ctx.fillRect(0, 0, 1, 1);
				return (
					'#' +
					[...ctx.getImageData(0, 0, 1, 1).data]
						.slice(0, 3)
						.map((n) => n.toString(16).padStart(2, '0'))
						.join('')
				);
			};
			return {
				fond: hex(getComputedStyle(e).backgroundColor),
				texte: hex(getComputedStyle(e.querySelector('.encre')!).color)
			};
		});
		expect(contrastRatio(couleurs.texte, couleurs.fond)).toBeGreaterThanOrEqual(4.5);
		await page.unroute('**/carnet?/marquePage');
		await page.reload();
		await expect(page.locator('#marque-form [name="text"]')).toHaveValue(
			`Brouillon gardé en ${theme}.`
		);
		await expect(page.locator('#marque-form [name="url"]')).toHaveValue(
			'https://discord.com/channels/demo/brouillon'
		);
	}
	await page.locator('#marque-form button[type="submit"]').click();
	await expect(page.locator('.phrase')).toContainText('Brouillon gardé en violet.');
	await expect
		.poll(() => page.evaluate(() => localStorage.getItem('np:marque-page:alice')))
		.toBeNull();
});

for (const width of [1440, 390]) {
	test(`Finitions et captures regardables · ${width}`, async ({ page }) => {
		test.setTimeout(120_000);
		await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
		await lire(page, '/');
		await page
			.locator('article.feuillet')
			.first()
			.evaluate((e) => window.scrollTo(0, window.scrollY + e.getBoundingClientRect().top - 140));
		await capturer(page, 'accueil-feuillets', width);
		await connecter(page, 'alice');
		await lire(page, '/univers/premiers-pas');
		await page.locator('.etapes').scrollIntoViewIfNeeded();
		expect(
			await page
				.locator('.etape .rang')
				.first()
				.evaluate((e) => getComputedStyle(e).fontVariantNumeric)
		).toBe('lining-nums tabular-nums');
		await capturer(page, 'premiers-pas', width);
		await lire(page, '/carnet/fiche/imprimer');
		await expect(page.locator('.sceau-impression')).toHaveCount(1);
		await expect(page.locator('.portrait')).toHaveCount(0);
		await capturer(page, 'feuille-imprimable', width);
		await page.emulateMedia({ media: 'print' });
		await capturer(page, 'feuille-imprimable-print', width);
		await page.emulateMedia({ media: 'screen' });
		if (width === 1440) {
			await lire(page, '/carnet/scene');
			await expect(page.locator('[data-superpose]')).toBeVisible();
			await expect(page.locator('[inert] h1')).toContainText('Dernières');
			await page.reload();
			await expect(page.locator('[data-superpose]')).toBeVisible();
			await capturer(page, 'scene-rechargee', width);
			await page.keyboard.press('Escape');
		}
		await page.request.post('/entrer/quitter');
		await connecter(page, 'admin');
		await lire(page, '/table/personnages/p_demo_aria');
		if (width === 390) await page.locator('#attribuer > summary').click();
		const correction = page.locator('form[action="?/corriger"]');
		await page.locator('details').filter({ has: correction }).last().locator('summary').click();
		await correction.locator('[name="resource"]').selectOption('pv');
		await correction.locator('[name="newValue"]').fill('50');
		await correction.locator('[name="motif"]').fill('Valeur revue à la Table.');
		await correction.locator('[name="motif"]').press('Enter');
		if (width === 390) await page.locator('#consequences > summary').click();
		await expect(page.locator('#consequences')).toContainText('Valeur revue à la Table.');
		await lire(page, '/registre/journal?vue=staff');
		await expect(page.locator('li.decision').first()).toBeVisible();
		for (const ligne of await page.locator('li.decision').all()) {
			await expect(ligne.locator('time')).toHaveCount(0);
			expect((await ligne.innerText()).match(/\b\d{2}:\d{2}\b/g)).toHaveLength(1);
		}
		await capturer(page, 'decisions-mj', width);
		await lire(page, '/table/personnages/p_demo_aria');
		if (width === 390) await page.locator('#consequences > summary').click();
		await page.locator('#consequences').scrollIntoViewIfNeeded();
		await capturer(page, 'fiche-mj-chapitre-04', width);
		await ouvrirTable(page, 'Le calme après les brumes');
		await page.getByRole('button', { name: 'Démarrer', exact: true }).click();
		await page
			.locator('form.declarer')
			.getByRole('button', { name: 'Déclarer', exact: true })
			.click();
		await passerLeRound(page);
		if (width === 390) await page.getByRole('tab', { name: 'Résolution', exact: true }).click();
		const texte = page.locator('.recit li:not(.raye):not(.titre) .texte').first();
		await expect(texte).toBeVisible();
		await expect
			.poll(() => texte.evaluate((e) => getComputedStyle(e).color))
			.toBe('rgb(149, 205, 187)');
		await capturer(page, 'resolution-humide', width);
		await page.getByRole('button', { name: 'Clore le round' }).click();
		await expect
			.poll(() => texte.evaluate((e) => getComputedStyle(e).color))
			.toBe('rgb(240, 238, 229)');
		await capturer(page, 'resolution-seche', width);
		await page.emulateMedia({ reducedMotion: 'reduce' });
		expect(await texte.evaluate((e) => getComputedStyle(e).transitionDuration)).toBe('0s');
		await page.locator('.gestes').getByRole('button', { name: 'Terminer le combat' }).click();
		await expect(page.locator('dialog.feuillet')).not.toContainText('+0 XP');
		await expect(page.locator('dialog.feuillet')).not.toContainText(/EM\s*: 23 → 23/);
		await capturer(page, 'feuillet-consequences', width);
	});
}

const pagesParRole = {
	visiteur: [
		'/',
		'/entrer',
		'/entrer/inscription',
		'/entrer/nouveau-mot-de-passe',
		'/univers',
		'/univers/premiers-pas',
		'/univers/synopsis',
		'/univers/systeme',
		'/univers/reglement',
		'/univers/site-et-donnees',
		'/univers/serments',
		'/univers/serments/duelliste',
		'/univers/bestiaire',
		'/univers/bestiaire/b_demo_loup'
	],
	alice: [
		'/carnet',
		'/carnet/fiche',
		'/carnet/fiche/imprimer',
		'/carnet/recits/c_demo_lisiere',
		'/carnet/table/c_demo_table_ouverte',
		'/carnet/journal',
		'/carnet/journal?voix=recits',
		'/carnet/journal?voix=faits',
		'/carnet/scene',
		'/compte',
		'/compte/collection',
		'/plus',
		'/agenda',
		'/univers/premiers-pas',
		'/univers/systeme',
		'/univers',
		'/univers/serments/duelliste'
	],
	mj: [
		'/table',
		'/table/archives',
		'/agenda/organiser',
		'/agenda/organiser/e_demo_chasse',
		'/table/combat/c_demo_table_ouverte',
		'/table/personnages',
		'/table/personnages/p_demo_aria',
		'/table/apparitions',
		'/table/archives/c_demo_lisiere'
	],
	admin: [
		'/registre',
		'/registre/comptes',
		'/registre/themes',
		'/registre/donnees',
		'/registre/journal',
		'/registre/journal?vue=staff',
		'/atelier/serments',
		'/atelier/serments/duelliste',
		'/atelier/bestiaire',
		'/atelier/bestiaire/b_demo_loup'
	]
};

test('P8 — carnet neuf, trois voix blanches, filtres sans résultat et agenda vide', async ({
	page
}) => {
	await connecter(page, 'admin');
	await lire(page, '/registre/journal?vue=staff');
	await expect(page.getByText('Aucune décision écrite. La prochaine s’écrira ici.')).toBeVisible();
	await lire(page, '/registre/journal?acteur=inexistant');
	await expect(page.getByText('Aucune ligne ne correspond à ces filtres.')).toBeVisible();
	await page.setViewportSize({ width: 390, height: 844 });
	await page.locator('.filtres-telephone summary').click();
	await page.locator('label[for="audit-telephone-acteur"]').click();
	await expect(page.locator('#audit-telephone-acteur')).toBeFocused();
	await page.locator('#audit-telephone-acteur').fill('inexistant-mobile');
	await page
		.locator('.filtres-telephone')
		.getByRole('button', { name: 'Filtrer', exact: true })
		.click();
	await expect(page).toHaveURL(/acteur=inexistant-mobile/);
	await expect(page.getByText('Aucune ligne ne correspond à ces filtres.')).toBeVisible();
	await page.setViewportSize({ width: 1440, height: 900 });
	await lire(page, '/registre');
	await page.getByText('nova', { exact: true }).click();
	await page.getByText('Seren Vallombre', { exact: true }).click();
	await page.getByRole('button', { name: 'Lier', exact: true }).click();
	await expect(page.locator('.liaison-faite')).toContainText('Seren Vallombre');
	await page.request.post('/entrer/quitter');
	await connecter(page, 'nova');
	await lire(page, '/carnet');
	await expect(
		page.getByText('Aucune scène ouverte. Ta fiche et l’agenda sont à jour.')
	).toBeVisible();
	await lire(page, '/carnet/journal');
	await expect(page.getByText('Cette page est blanche. Elle t’attend.')).toBeVisible();
	await lire(page, '/carnet/journal?voix=recits');
	await expect(page.getByText('Les récits restent à écrire.')).toBeVisible();
	await lire(page, '/carnet/journal?voix=faits');
	await expect(
		page.getByText(/Aucun fait validé\. Ils s’écrivent d’abord sur Discord/)
	).toBeVisible();
	await lire(page, '/carnet');
	await page.route('**/agenda/__data.json*', async (route) => {
		const response = await route.fetch();
		const payload = await response.json();
		for (const node of payload.nodes ?? []) {
			const values = node?.data;
			if (!Array.isArray(values)) continue;
			for (const value of values) {
				if (value && typeof value === 'object' && 'upcoming' in value && 'past' in value) {
					value.upcoming = values.push([]) - 1;
					value.past = values.push([]) - 1;
					value.pastPages = values.push(1) - 1;
				}
			}
		}
		await route.fulfill({ response, json: payload });
	});
	await page.getByRole('link', { name: 'Agenda', exact: true }).first().click();
	await expect(page.getByText('Rien de prévu. Le monde attend.')).toBeVisible();
});

for (const [role, routes] of Object.entries(pagesParRole)) {
	test(`P9 — pages retouchées, trois largeurs et trois thèmes · ${role}`, async ({ page }) => {
		test.setTimeout(180_000);
		if (role !== 'visiteur') await connecter(page, role);
		for (const width of [390, 768, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			for (const route of routes) {
				await lire(page, route);
				for (const theme of ['dark', 'light', 'violet']) {
					await page.evaluate((id) => {
						document.documentElement.dataset.theme = id;
						document.documentElement.dataset.ton = id === 'light' ? 'clair' : 'sombre';
					}, theme);
					const mesure = await mesurer(page);
					expect(mesure.contenu, `${route} · ${theme} · ${width}`).toBeLessThanOrEqual(
						mesure.largeur
					);
					expect(mesure.petits, `${route} · ${theme} · ${width}`).toEqual([]);
					const tenue = await page.evaluate(() => {
						const style = getComputedStyle(document.documentElement);
						return {
							page: style.getPropertyValue('--page').trim(),
							encre: style.getPropertyValue('--encre').trim(),
							secondaire: style.getPropertyValue('--encre-2').trim(),
							petitesCibles: [...document.querySelectorAll('button:not(:disabled), a[href]')]
								.filter((e) => e.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true }))
								.filter((e) => !e.closest('[inert]'))
								.map((e) => {
									const taille = e.getBoundingClientRect();
									const apres = getComputedStyle(e, '::after');
									const marge =
										apres.content !== 'none' && apres.position === 'absolute'
											? Math.max(0, -parseFloat(apres.top) || 0) +
												Math.max(0, -parseFloat(apres.bottom) || 0)
											: 0;
									return {
										texte: e.textContent?.trim(),
										largeur: taille.width,
										hauteur: taille.height + marge
									};
								})
								.filter((e) => e.largeur < 44 || e.hauteur < 44)
						};
					});
					expect(tenue.petitesCibles, `${route} · ${theme} · ${width}`).toEqual([]);
					expect(contrastRatio(tenue.encre, tenue.page), route).toBeGreaterThanOrEqual(4.5);
					expect(contrastRatio(tenue.secondaire, tenue.page), route).toBeGreaterThanOrEqual(4.5);
				}
			}
		}
	});
}
