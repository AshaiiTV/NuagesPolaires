<script lang="ts">
	// La page d'erreur, dans la voix du carnet : 404 « Cette page n'existe pas dans le carnet. » ;
	// 401 « Le carnet s'est refermé. Rouvre-le en te reconnectant. » ; autres « Le carnet n'a pas pu
	// ouvrir cette page. ». Toujours un chemin de retour ; jamais de détail interne.
	import { page } from '$app/state';
	import Enveloppe from '$lib/ui/Enveloppe.svelte';
	import Page from '$lib/ui/Page.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import type { CompteNav } from '$lib/ui/navigation';

	const compte = $derived((page.data?.compte ?? null) as CompteNav | null);
	const discord = $derived((page.data?.discord ?? null) as string | null);
	const statut = $derived(page.status);

	/** Les messages génériques de SvelteKit ou des gardes ne disent rien de plus que la phrase. */
	const GENERIQUES = new Set([
		'Not Found',
		'Page introuvable.',
		'Ressource introuvable.',
		'Internal Error',
		'Error'
	]);

	const texte = $derived.by(() => {
		if (statut === 404 || statut === 403) {
			const precis =
				page.error?.message && !GENERIQUES.has(page.error.message) ? page.error.message : null;
			return {
				repere: 'NP / 404 — Hors du carnet',
				titre: 'Une page',
				voix: 'blanche.',
				phrase: 'Cette page n’existe pas dans le carnet.',
				precis
			};
		}
		if (statut === 401) {
			return {
				repere: 'NP / 401 — Carnet refermé',
				titre: 'Le carnet',
				voix: 's’est refermé.',
				phrase: 'Le carnet s’est refermé. Rouvre-le en te reconnectant.',
				precis: null
			};
		}
		return {
			repere: `NP / ${statut} — Page froissée`,
			titre: 'Une page',
			voix: 'froissée.',
			phrase: 'Le carnet n’a pas pu ouvrir cette page.',
			precis:
				'Ce qui est écrit ailleurs reste écrit. Reviens en arrière, ou recharge dans un instant.'
		};
	});

	/** La première page d'un compte selon son rôle (même règle que le serveur, 03-vision §4). */
	const accueil = $derived.by(() => {
		if (!compte) return { href: '/', libelle: 'Revenir à l’accueil' };
		if (compte.role === 'joueur' || compte.relie)
			return { href: '/carnet', libelle: 'Rouvrir mon carnet' };
		if (compte.role === 'mj') return { href: '/table', libelle: 'Revenir à La Table' };
		if (compte.role === 'designer')
			return { href: '/atelier/bestiaire', libelle: 'Revenir à L’Atelier' };
		return { href: '/registre', libelle: 'Revenir au Registre' };
	});
	const entrer = $derived(page.url.pathname + page.url.search);
</script>

<svelte:head><title>{texte.titre} {texte.voix} — Nuages Polaires</title></svelte:head>

<Enveloppe {compte} {discord}>
	<Page repere={texte.repere} titre={texte.titre} titreVoix={texte.voix}>
		{#snippet marge()}
			<p class="adresse">
				<span class="repere">Adresse demandée</span><span class="chemin">{page.url.pathname}</span>
			</p>
		{/snippet}

		<p class="phrase">{texte.phrase}</p>
		{#if texte.precis}<p class="precis">{texte.precis}</p>{/if}

		<div class="gestes">
			{#if statut === 401}
				<Bouton variante="ruban" href={`/entrer?retour=${encodeURIComponent(entrer)}`} fleche="→"
					>Entrer</Bouton
				>
			{:else}
				<Bouton variante="ruban" href={accueil.href} fleche="→">{accueil.libelle}</Bouton>
			{/if}
			<Bouton variante="texte" href="/univers" fleche="→">Lire L’univers</Bouton>
		</div>
	</Page>
</Enveloppe>

<style>
	.adresse .repere {
		display: block;
		margin-bottom: 4px;
	}
	.chemin {
		font: var(--t-libelle);
		color: var(--encre-grise);
		overflow-wrap: anywhere;
	}
	.phrase {
		max-width: var(--lecture);
		font: italic 400 24px / calc(var(--ligne) * 1.25) var(--voix);
		color: var(--encre);
	}
	.precis {
		max-width: var(--lecture);
		margin-top: calc(var(--ligne) / 2);
		font: var(--t-corps);
		color: var(--encre-2);
	}
	.gestes {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 28px;
		margin-top: calc(var(--ligne) * 2);
	}
</style>
