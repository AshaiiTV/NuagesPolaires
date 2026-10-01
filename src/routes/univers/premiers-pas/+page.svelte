<script lang="ts">
 import Lecture from '../Lecture.svelte';
 import type { PageProps } from './$types';
 let { data }: PageProps = $props();
</script>
<Lecture {...data} />
