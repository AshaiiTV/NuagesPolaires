// Arbre de 06-contrats §C : chaque page autorisée, chaque compte de démonstration, deux largeurs.
import { test, expect } from './fixtures';
import { connecter, lire, mesurer } from './parcours-helpers';

const publiques = [
	'/',
	'/univers',
	'/univers/synopsis',
	'/univers/systeme',
	'/univers/reglement',
	'/univers/premiers-pas',
	'/univers/site-et-donnees',
	'/univers/serments',
	'/univers/serments/duelliste',
	'/univers/bestiaire',
	'/univers/bestiaire/b_demo_loup'
];
const compte = ['/carnet', '/agenda', '/compte', '/compte/collection', '/plus'];
const liees = [
	'/carnet/fiche',
	'/carnet/fiche/pdf',
	'/carnet/fiche/imprimer',
	'/carnet/journal',
	'/carnet/journal?voix=faits',
	'/carnet/journal?voix=recits',
	'/carnet/recits/c_demo_lisiere',
	'/carnet/scene',
	'/carnet/table/c_demo_table_ouverte',
	'/carnet/table/c_demo_lisiere'
];
const organiser = [
	'/agenda/organiser',
	'/agenda/organiser/e_demo_chasse',
	'/agenda/organiser/e_demo_masque'
];
const table = [
	'/table',
	'/table/combat/c_demo_table_ouverte',
	'/table/apparitions',
	'/table/archives',
	'/table/archives/c_demo_lisiere',
	'/table/personnages',
	'/table/personnages/p_demo_aria'
];
const atelier = [
	'/atelier/bestiaire',
	'/atelier/bestiaire/b_demo_loup',
	'/atelier/bestiaire/b_demo_ombre'
];
const administration = [
	'/atelier/serments',
	'/atelier/serments/duelliste',
	'/registre',
	'/registre/comptes',
	'/registre/themes',
	'/registre/journal',
	'/registre/journal?voix=staff',
	'/registre/donnees'
];

for (const pseudo of ['visiteur', 'alice', 'bob', 'nova', 'mj', 'designer', 'admin']) {
	for (const largeur of [390, 1440]) {
		test(`${pseudo} · ${largeur} px · toutes les pages autorisées`, async ({ page }) => {
			test.setTimeout(240_000);
			await page.setViewportSize({ width: largeur, height: 900 });
			if (pseudo !== 'visiteur') await connecter(page, pseudo);
			const erreurs: string[] = [];
			page.on('pageerror', (e) => erreurs.push(e.message));
			page.on('console', (m) => {
				if (m.type() === 'error') erreurs.push(m.text());
			});
			page.on('response', (r) => {
				if (r.status() >= 500) erreurs.push(`${r.status()} ${r.url()}`);
			});
			const routes = [
				...publiques,
				...(pseudo === 'visiteur'
					? ['/entrer', '/entrer/inscription', '/entrer/inscription?etape=compte&reglement=accepte']
					: compte),
				...(['alice', 'bob'].includes(pseudo) ? liees : []),
				...(['mj', 'designer', 'admin'].includes(pseudo) ? organiser : []),
				...(['mj', 'admin'].includes(pseudo) ? table : []),
				...(['designer', 'admin'].includes(pseudo) ? atelier : []),
				...(pseudo === 'admin' ? administration : [])
			];
			const defauts: string[] = [];
			for (const route of routes) {
				await test.step(route, async () => {
					const r = await lire(page, route);
					if (!r?.ok()) defauts.push(`${route} : HTTP ${r?.status()}`);
					const m = await mesurer(page);
					if (m.contenu > m.largeur) defauts.push(`${route} : largeur ${m.contenu} > ${m.largeur}`);
					if (m.petits.length)
						defauts.push(`${route} : textes sous 12 px : ${m.petits.join(' ; ')}`);
				});
			}
			if (['alice', 'bob'].includes(pseudo))
				expect((await page.request.get('/api/table/c_demo_table_ouverte/etat')).status()).toBe(200);
			expect(defauts, `${pseudo}, ${largeur} px`).toEqual([]);
			expect(erreurs, `${pseudo}, ${largeur} px`).toEqual([]);
		});
	}
}

for (const largeur of [390, 1440]) {
	test(`bob · session de réinitialisation · ${largeur} px`, async ({ page, browser }) => {
		await connecter(page, 'admin');
		await lire(page, '/registre/comptes?q=bob');
		await page.locator('summary', { hasText: 'bob' }).click();
		await page.getByRole('button', { name: 'Réinitialiser le mot de passe' }).click();
		const code = await page.locator('.code .secret').innerText();
		const context = await browser.newContext({ viewport: { width: largeur, height: 900 } });
		try {
			const bob = await context.newPage();
			const erreurs: string[] = [];
			bob.on('pageerror', (e) => erreurs.push(e.message));
			bob.on('console', (m) => {
				if (m.type() === 'error') erreurs.push(m.text());
			});
			bob.on('response', (r) => {
				if (r.status() >= 500) erreurs.push(`${r.status()} ${r.url()}`);
			});
			await lire(bob, '/entrer');
			await bob.fill('[name="pseudo"]', 'bob');
			await bob.fill('[name="password"]', code);
			await bob.click('form button[type="submit"]');
			await bob.waitForURL(/\/entrer\/nouveau-mot-de-passe/);
			await lire(bob, '/entrer/nouveau-mot-de-passe');
			const m = await mesurer(bob);
			expect(m.contenu).toBeLessThanOrEqual(m.largeur);
			expect(m.petits).toEqual([]);
			expect(erreurs).toEqual([]);
		} finally {
			await context.close();
		}
	});
}
