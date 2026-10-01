<script lang="ts">
	import Lecture from '../Lecture.svelte';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<Lecture
	slug={data.slug}
	titre={data.titre}
	resume={data.resume}
	lecture={data.lecture}
	previous={data.previous}
	next={data.next}
/>
