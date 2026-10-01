<script lang="ts">
	// Enveloppe du cahier Agenda : régime carnet pour l'agenda, régime serré pour « Organiser ».
	import { page } from '$app/state';
	import Enveloppe from '$lib/ui/Enveloppe.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
	const regime = $derived(page.url.pathname.startsWith('/agenda/organiser') ? 'serre' : 'carnet');
</script>

<Enveloppe compte={data.compte} discord={data.discord} {regime}>{@render children()}</Enveloppe>
