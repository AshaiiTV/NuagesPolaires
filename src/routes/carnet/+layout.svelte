<script lang="ts">
	// L'enveloppe de Mon carnet. Le feuillet En scène et la Table vue par un joueur
	// (`/carnet/scene`, `/carnet/table/…`) posent eux-mêmes leur enveloppe en régime scène :
	// on ne les enveloppe pas deux fois. La fiche à imprimer (`/carnet/fiche/imprimer`) est une
	// feuille seule, sans tranche ni ruban.
	import { page } from '$app/state';
	import Enveloppe from '$lib/ui/Enveloppe.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	const feuillet = $derived(/^\/carnet\/((scene|table)(\/|$)|fiche\/imprimer\/?$)/.test(page.url.pathname));
</script>

{#if feuillet}
	{@render children()}
{:else}
	<Enveloppe compte={data.compte} discord={data.discord}>{@render children()}</Enveloppe>
{/if}
