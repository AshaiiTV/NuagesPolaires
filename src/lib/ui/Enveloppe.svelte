<script lang="ts">
	// L'enveloppe d'une page : le carnet (tranche, bande basse, ruban) pour un compte connecté,
	// le masthead public et le colophon pour un visiteur. Les pages de L'univers utilisent les deux.
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import Cahier from './Cahier.svelte';
	import BandeVisiteur from './BandeVisiteur.svelte';
	import Masthead from './Masthead.svelte';
	import Colophon from './Colophon.svelte';
	import { bandePour, cahiersPour, rubanPour, LIBELLES_ROLE, type CompteNav } from './navigation';

	interface Props {
		compte: CompteNav | null;
		discord?: string | null;
		superpose?: boolean;
		regime?: 'carnet' | 'serre' | 'scene';
		children: Snippet;
	}
	let { compte, discord = null, regime = 'carnet', superpose = false, children }: Props = $props();
	const chemin = $derived(page.url.pathname);
</script>

{#if superpose}
	{@render children()}
{:else if compte}
	<Cahier
		cahiers={cahiersPour(compte, chemin)}
		bande={bandePour(compte, chemin)}
		ruban={rubanPour(compte)}
		{regime}
		compte={{
			pseudo: compte.pseudo,
			portrait: compte.portrait,
			serment: compte.serment,
			role: LIBELLES_ROLE[compte.role]
		}}
	>
		{@render children()}
	</Cahier>
{:else}
	<a class="evitement" href="#page">Aller à la page</a>
	<div class="visiteur" data-regime={regime}>
		<Masthead />
		<main class="bureau" id="page" tabindex="-1">
			{@render children()}
		</main>
		<Colophon {discord} />
	</div>
	<BandeVisiteur {chemin} />
{/if}

<style>
	.visiteur {
		min-height: 100svh;
	}
	.bureau {
		padding: calc(var(--ligne) * 2) var(--gouttiere);
		outline: none;
	}

	@media (max-width: 760px) {
		.bureau {
			padding: 0;
		}
		.visiteur {
			padding-bottom: calc(56px + env(safe-area-inset-bottom));
		}
	}
</style>
