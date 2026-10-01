// Captures d'écran de contrôle visuel : node scripts/capture.mjs <chemin> [<chemin>…] [--base=http://localhost:5173]
// Options : --tailles=390,768,1440  --theme=light  --pleine (page entière)  --sortie=test-results/captures
// Écrit un PNG par chemin et par largeur, et signale tout débordement horizontal.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const option = (nom, defaut) => {
	const trouve = args.find((a) => a.startsWith(`--${nom}=`));
	return trouve ? trouve.slice(nom.length + 3) : defaut;
};
const base = option('base', 'http://localhost:5173');
const tailles = option('tailles', '390,768,1440').split(',').map(Number);
const theme = option('theme', '');
const sortie = option('sortie', 'test-results/captures');
const pleine = args.includes('--pleine');
// Comptes fictifs de la base de démonstration (src/lib/server/db/seed.ts) : --compte=alice
const compte = option('compte', '');
const COMPTES_DEMO = {
	admin: 'Admin-audit-123!',
	alice: 'Alice-audit-123!',
	bob: 'Bob-audit-123!',
	mj: 'Maitre-audit-123!',
	designer: 'Designer-audit-123!',
	nova: 'Nova-audit-123!'
};
const chemins = args.filter((a) => !a.startsWith('--'));
if (chemins.length === 0) chemins.push('/');

const hauteurs = { 390: 844, 768: 1024, 1440: 900 };
await mkdir(sortie, { recursive: true });
const navigateur = await chromium.launch();
let debordements = 0;

for (const largeur of tailles) {
	const contexte = await navigateur.newContext({
		viewport: { width: largeur, height: hauteurs[largeur] ?? 900 },
		deviceScaleFactor: 1,
		isMobile: largeur < 768,
		hasTouch: largeur < 768,
		locale: 'fr-FR',
		timezoneId: 'Europe/Paris'
	});
	const page = await contexte.newPage();
	if (compte) {
		// Connexion par le formulaire public, avec un compte fictif de la base de démonstration.
		const motDePasse = COMPTES_DEMO[compte] ?? option('mot-de-passe', '');
		await page.goto(base + '/entrer', { waitUntil: 'networkidle' });
		await page.fill('input[name="pseudo"]', compte);
		await page.fill('input[name="password"]', motDePasse);
		await page.click('form button[type="submit"]');
		await page.waitForURL((u) => !u.pathname.startsWith('/entrer'), { timeout: 10000 }).catch(() => {});
		if (new URL(page.url()).pathname.startsWith('/entrer')) console.log(`CONNEXION REFUSÉE pour ${compte} (toujours sur ${page.url()})`);
	}
	const erreurs = [];
	page.on('console', (m) => m.type() === 'error' && erreurs.push(m.text()));
	page.on('pageerror', (e) => erreurs.push(String(e)));
	for (const chemin of chemins) {
		await page.goto(base + chemin, { waitUntil: 'networkidle' });
		if (theme) {
			await page.evaluate((t) => {
				document.documentElement.dataset.theme = t;
				document.documentElement.dataset.ton = t === 'light' ? 'clair' : 'sombre';
			}, theme);
		}
		await page.evaluate(() => document.fonts.ready);
		const mesure = await page.evaluate(() => ({
			scroll: document.documentElement.scrollWidth,
			client: document.documentElement.clientWidth,
			petits: [...document.querySelectorAll('body *')]
				.filter((e) => e.children.length === 0 && e.textContent.trim() && e.getClientRects().length)
				.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 12)
				.slice(0, 5)
				.map((e) => `${e.tagName.toLowerCase()}.${e.className} (${getComputedStyle(e).fontSize}) « ${e.textContent.trim().slice(0, 30)} »`)
		}));
		const nom =
			(chemin === '/' ? 'accueil' : chemin.replace(/^\//, '').replace(/[\/?#=&]/g, '-')) +
			`${compte ? '-' + compte : ''}-${largeur}${theme ? '-' + theme : ''}.png`;
		await page.screenshot({ path: path.join(sortie, nom), fullPage: pleine });
		const deborde = mesure.scroll > mesure.client + 1;
		if (deborde) debordements++;
		console.log(
			`${nom}  ${deborde ? `DÉBORDEMENT ${mesure.scroll} > ${mesure.client}` : 'sans débordement'}` +
				(mesure.petits.length ? `  TEXTE < 12px : ${mesure.petits.join(' | ')}` : '') +
				(erreurs.length ? `  ERREURS : ${erreurs.join(' | ')}` : '')
		);
		erreurs.length = 0;
	}
	await contexte.close();
}
await navigateur.close();
process.exit(debordements ? 1 : 0);
