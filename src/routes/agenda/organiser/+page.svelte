<script lang="ts">
	// Organiser : nouveau rendez-vous (MJ, designer, administrateur).
	import Organiser from './Organiser.svelte';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
</script>

<Organiser {data} {form} />
