<script lang="ts">
	// Même page et sous-navigation que La Table ; le sommaire ou les filtres occupent sa marge.
	import type { Snippet } from 'svelte';
	import Page from '$lib/ui/Page.svelte';
	import Sommaire from '$lib/ui/table/Sommaire.svelte';
	let { titre, reperes, children }: { titre: string; reperes: Snippet<[string]>; children: Snippet } = $props();
</script>

<div class="personnages">
	<div class="navigation"><Sommaire /></div>
	<Page repere="NP / 06 — La Table · Personnages" {titre}>
		{#snippet marge()}{@render reperes('bureau')}{/snippet}
		{#snippet bande()}{@render reperes('telephone')}{/snippet}
		{@render children()}
	</Page>
</div>

<style>
	.navigation { max-width: var(--page-max); margin: 0 auto; padding: 0 var(--ligne) var(--ligne); }
	:global([data-regime='serre']) .personnages :global(.page) { grid-template-columns: minmax(12rem, 2fr) minmax(0, 10fr); gap: calc(var(--ligne) * 2); align-content: start; }
	:global([data-regime='serre']) .personnages :global(.marge) { position: sticky; top: var(--ligne); }
	@media (max-width: 1100px) {
		:global([data-regime='serre']) .personnages :global(.page) { grid-template-columns: minmax(11rem, 3fr) minmax(0, 9fr); gap: var(--gouttiere); }
	}
	@media (max-width: 760px) {
		.navigation { padding: 0 var(--gouttiere); }
		:global([data-regime='serre']) .personnages :global(.page) { display: block; padding: var(--ligne) var(--gouttiere) calc(var(--ligne) * 4); }
	}
</style>
