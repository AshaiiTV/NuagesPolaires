<script lang="ts">
	import Enveloppe from '$lib/ui/Enveloppe.svelte';
	import type { LayoutProps } from './$types';
	let { data, children }: LayoutProps = $props();
</script>

<Enveloppe compte={data.compte} discord={data.discord}>{@render children()}</Enveloppe>
