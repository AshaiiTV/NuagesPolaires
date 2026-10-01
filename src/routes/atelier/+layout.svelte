<script lang="ts">
	import Enveloppe from '$lib/ui/Enveloppe.svelte';
	import type { LayoutProps } from './$types';
	import './atelier.css';
	let { data, children }: LayoutProps = $props();
</script>

<Enveloppe compte={data.compte} discord={data.discord} regime="serre"
	>{@render children()}</Enveloppe
>
