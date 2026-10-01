<script lang="ts">
	// Le Registre se tient en régime serré : réglure 24, Manrope tabulaire, aucune matière.
	import Enveloppe from '$lib/ui/Enveloppe.svelte';
	import type { LayoutProps } from './$types';
	let { data, children }: LayoutProps = $props();
</script>

<Enveloppe compte={data.compte} discord={data.discord} regime="serre">{@render children()}</Enveloppe>
