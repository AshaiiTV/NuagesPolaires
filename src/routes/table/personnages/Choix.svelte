<script lang="ts">
	// Un choix sur la réglure, pour les formulaires de ce cahier seulement.
	import type { Snippet } from 'svelte';
	let { libelle, name, id = name, value = $bindable(''), required = true, children }: {
		libelle: string; name: string; id?: string; value?: string; required?: boolean; children: Snippet;
	} = $props();
</script>

<label class="choix" for={id}>
	<span>{libelle}</span>
	<select {id} {name} bind:value {required}>{@render children()}</select>
</label>

<style>
	.choix { display: grid; min-width: 0; font: var(--t-libelle); color: var(--encre-2); }
	select { width: 100%; min-width: 0; min-height: var(--cible); padding: 8px 0; background: transparent; border: 0; border-bottom: 1px solid color-mix(in srgb, var(--encre) 28%, transparent); border-radius: 0; font: var(--t-corps); color: var(--encre); }
	select :global(option) { background: var(--page); color: var(--encre); }
	select:focus-visible { border-bottom-color: var(--encre-humide); }
</style>
