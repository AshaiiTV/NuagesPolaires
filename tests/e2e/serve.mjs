import { createServer } from 'vite';

if (process.env.NP_DB_DRIVER !== 'pglite' || process.env.NP_E2E_RESET !== 'true') {
	throw new Error('Ce serveur est réservé aux parcours locaux de démonstration.');
}
const server = await createServer({
	server: { port: 4173, strictPort: true },
	plugins: [
		{
			name: 'np-parcours-arret',
			enforce: 'pre',
			configureServer(vite) {
				vite.middlewares.use((request, response, next) => {
					if (request.method !== 'POST' || request.url !== '/__tests/stop') return next();
					response.end('Serveur de parcours fermé.');
					setImmediate(() => {
						void vite.close().then(() => process.exit(0));
					});
				});
			}
		}
	]
});
await server.listen();
