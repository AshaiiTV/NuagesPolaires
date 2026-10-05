// Chaque parcours part du même semis, même après une liaison, une rature ou une clôture.
import { test as base, expect } from '@playwright/test';
export { expect };
export type { Browser, BrowserContext, Page, Locator } from '@playwright/test';
export const test = base.extend<{ semis: void }>({
	semis: [
		async ({ request }, use) => {
			const response = await request.post('/__tests/reset');
			expect(response.status()).toBe(200);
			await use();
		},
		{ auto: true }
	]
});
