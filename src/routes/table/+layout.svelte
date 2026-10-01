<script lang="ts">
	// La Table se tient en régime serré : réglure 24, Manrope 14 tabulaire, colonnes fixes, aucune matière.
	import Enveloppe from '$lib/ui/Enveloppe.svelte';
	import type { LayoutProps } from './$types';
	let { data, children }: LayoutProps = $props();
</script>

<Enveloppe compte={data.compte} discord={data.discord} regime="serre">{@render children()}</Enveloppe>
