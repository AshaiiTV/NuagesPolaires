// Parcours de bout en bout (03-vision §10 ; 04-architecture §8, décision INT-1).
// PGlite est exclu du bundle Netlify (04 §10.2) : les parcours tournent sur `vite dev` avec la base
// de démonstration en mémoire (NP_DB_DRIVER=pglite), jamais sur le build de production.
import { defineConfig } from '@playwright/test';

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
	testDir: 'tests/e2e',
	testMatch: '**/*.e2e.ts',
	fullyParallel: false,
	workers: 1,
	use: {
		baseURL: BASE_URL,
		locale: 'fr-FR',
		timezoneId: 'Europe/Paris'
	},
	webServer: {
		command: `npm run dev -- --port ${PORT} --strictPort`,
		url: BASE_URL,
		reuseExistingServer: false,
		timeout: 120_000,
		env: {
			NP_DB_DRIVER: 'pglite',
			NP_RATE_LIMIT_MAX: '100000',
			// Secret de TEST uniquement (≥ 32 caractères), jamais utilisé hors de ce serveur local.
			NP_SESSION_SECRET: 'np-e2e-secret-de-test-uniquement-0123456789',
			NP_SITE_URL: BASE_URL
		}
	}
});
