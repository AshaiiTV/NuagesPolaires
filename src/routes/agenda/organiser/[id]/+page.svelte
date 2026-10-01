<script lang="ts">
	// Organiser : un rendez-vous ouvert (modifier, masquer, prévenir, rayer).
	import Organiser from '../Organiser.svelte';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
</script>

<Organiser {data} {form} />
