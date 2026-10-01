<script lang="ts">
	// L'enveloppe d'une page : le carnet (tranche, bande basse, ruban) pour un compte connecté,
	// le masthead public et le colophon pour un visiteur. Les pages de L'univers utilisent les deux.
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import Cahier from './Cahier.svelte';
	import Masthead from './Masthead.svelte';
	import Colophon from './Colophon.svelte';
	import { bandePour, bandeVisiteur, cahiersPour, rubanPour, LIBELLES_ROLE, type CompteNav } from './navigation';

	interface Props {
		compte: CompteNav | null;
		discord?: string | null;
		children: Snippet;
	}
	let { compte, discord = null, children }: Props = $props();
	const chemin = $derived(page.url.pathname);
</script>

{#if compte}
	<Cahier
		cahiers={cahiersPour(compte, chemin)}
		bande={bandePour(compte, chemin)}
		ruban={rubanPour(compte)}
		compte={{ pseudo: compte.pseudo, portrait: compte.portrait, role: LIBELLES_ROLE[compte.role] }}
	>
		{@render children()}
	</Cahier>
{:else}
	<a class="evitement" href="#page">Aller à la page</a>
	<div class="visiteur">
		<Masthead />
		<main class="bureau" id="page" tabindex="-1">
			{@render children()}
		</main>
		<Colophon {discord} />
	</div>
	<nav class="bande-basse" aria-label="Navigation">
		{#each bandeVisiteur(chemin) as onglet (onglet.id)}
			<a class:courant={onglet.courant} href={onglet.href} aria-current={onglet.courant ? 'page' : undefined}>{onglet.libelle}</a>
		{/each}
	</nav>
{/if}

<style>
	.visiteur {
		min-height: 100svh;
		background: var(--bureau);
	}
	.bureau {
		padding: calc(var(--ligne) * 2) var(--gouttiere);
		outline: none;
	}
	.bande-basse {
		display: none;
	}
	@media (max-width: 760px) {
		.bureau {
			padding: 0;
		}
		.visiteur {
			padding-bottom: calc(56px + env(safe-area-inset-bottom));
		}
		.bande-basse {
			position: fixed;
			z-index: 10;
			inset: auto 0 0 0;
			display: grid;
			grid-auto-flow: column;
			grid-auto-columns: 1fr;
			min-height: 56px;
			padding-bottom: env(safe-area-inset-bottom);
			background: color-mix(in srgb, var(--bureau) 94%, transparent);
			border-top: 1px solid var(--reglure);
			backdrop-filter: blur(8px);
		}
		.bande-basse a {
			position: relative;
			display: grid;
			place-items: center;
			min-height: 56px;
			font: 500 13px/16px var(--corps);
			color: var(--encre-2);
			text-decoration: none;
		}
		.bande-basse a.courant {
			color: var(--encre);
		}
		.bande-basse a.courant::before {
			content: '';
			position: absolute;
			top: -1px;
			left: 28%;
			right: 28%;
			height: 2px;
			background: var(--ruban);
		}
	}
</style>
