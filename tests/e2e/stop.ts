/** Arrêt avant le nettoyage Playwright : évite taskkill bloqué dans le bac à sable Windows. */
export default async function stop() {
	await fetch('http://localhost:4173/__tests/stop', { method: 'POST' });
	const fin = Date.now() + 10_000;
	while (Date.now() < fin) {
		try {
			await fetch('http://localhost:4173/', { signal: AbortSignal.timeout(500) });
		} catch {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, 50));
	}
	throw new Error('Le serveur de parcours ne s’est pas arrêté.');
}
