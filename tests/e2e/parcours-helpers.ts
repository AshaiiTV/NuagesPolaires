import { expect, type Page } from './fixtures';

export const motsDePasse: Record<string, string> = {
	admin: 'Admin-audit-123!',
	alice: 'Alice-audit-123!',
	bob: 'Bob-audit-123!',
	mj: 'Maitre-audit-123!',
	designer: 'Designer-audit-123!',
	nova: 'Nova-audit-123!'
};

export async function lire(page: Page, adresse: string) {
	const response = await page.goto(adresse);
	await expect(page.locator('html')).toHaveAttribute('data-app-ready', 'true', { timeout: 15_000 });
	return response;
}

export async function connecter(page: Page, pseudo: string) {
	await lire(page, '/entrer');
	await page.fill('[name="pseudo"]', pseudo);
	await page.fill('[name="password"]', motsDePasse[pseudo]);
	await page.click('form button[type="submit"]');
	await page.waitForURL((u) => !u.pathname.startsWith('/entrer'));
}

export async function ouvrirTable(page: Page, titre: string, dix = false) {
	await lire(page, '/table?creature=b_demo_loup');
	await expect(page.locator('[name="qte_b_demo_loup"]')).toHaveValue('1');
	await page.fill('[name="nom"]', titre);
	await page.check('[name="personnages"][value="p_demo_aria"]');
	await page.fill('[name="salon"]', 'https://discord.com/channels/demo/parcours');
	if (dix) {
		await page.check('[name="personnages"][value="p_demo_kael"]');
		await page.fill('[name="qte_b_demo_loup"]', '8');
	}
	await page.getByRole('button', { name: 'Ouvrir la Table', exact: true }).click();
	await page.waitForURL(/\/table\/combat\//);
	// L'adresse change avant que la feuille soit tournée (transition de vue) : attendre la Table.
	await expect(page.locator('article.table-mj')).toBeVisible();
	return new URL(page.url()).pathname.split('/').pop()!;
}

export async function passerLeRound(page: Page) {
	for (let n = 0; n < 40; n++) {
		const form = page.locator('form.declarer');
		if (!(await form.count())) break;
		await form.getByRole('button', { name: 'Passer', exact: true }).focus();
		await page.keyboard.press('Enter');
	}
	await expect(page.getByRole('button', { name: 'Résoudre le round' })).toBeEnabled();
	await page.getByRole('button', { name: 'Résoudre le round' }).focus();
	await page.keyboard.press('Enter');
}

export async function mesurer(page: Page) {
	return page.evaluate(() => {
		const petits: string[] = [];
		const arbre = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
		let node: Node | null;
		while ((node = arbre.nextNode())) {
			const el = node.parentElement;
			if (!el || !node.textContent?.trim() || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName))
				continue;
			if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
			if (el.closest('.sr-only, [aria-hidden="true"]')) continue;
			const range = document.createRange();
			range.selectNode(node);
			if (!range.getBoundingClientRect().width) continue;
			if (parseFloat(getComputedStyle(el).fontSize) < 12)
				petits.push(node.textContent.trim().slice(0, 80));
		}
		return {
			largeur: document.documentElement.clientWidth,
			contenu: document.documentElement.scrollWidth,
			petits
		};
	});
}
