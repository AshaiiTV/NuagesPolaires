<script lang="ts">
	// Le sceau d'un Serment : un dessin au trait dans son anneau. Décoratif par défaut (le nom du
	// Serment est toujours écrit à côté) ; `titre` le rend lisible seul.
	import { sceauPour } from './sceaux';

	interface Props {
		/** Nom ou adresse du Serment : « Duelliste », « lame-d-honneur ». */
		serment: string;
		/** Côté en pixels. */
		taille?: number;
		/** Sans anneau : le dessin seul, pour une ligne de liste. */
		nu?: boolean;
		titre?: string | null;
	}
	let { serment, taille = 48, nu = false, titre = null }: Props = $props();
	const trace = $derived(sceauPour(serment));
</script>

<svg
	class="sceau"
	width={taille}
	height={taille}
	viewBox="0 0 48 48"
	fill="none"
	stroke="currentColor"
	stroke-linecap="round"
	stroke-linejoin="round"
	role={titre ? 'img' : undefined}
	aria-label={titre ?? undefined}
	aria-hidden={titre ? undefined : 'true'}
>
	{#if !nu}
		<circle cx="24" cy="24" r="23" stroke-width="1" vector-effect="non-scaling-stroke" />
		{#if taille >= 64}
			<circle
				class="grenetis"
				cx="24"
				cy="24"
				r="20.6"
				stroke-width="1.2"
				stroke-dasharray="0.1 5"
				vector-effect="non-scaling-stroke"
			/>
		{/if}
	{/if}
	<path
		d={trace}
		stroke-width={taille < 32 ? 1.2 : 1.5}
		vector-effect="non-scaling-stroke"
		transform={nu ? undefined : 'translate(5.3 5.3) scale(0.78)'}
	/>
</svg>

<style>
	.sceau {
		flex: none;
		display: block;
	}
	.grenetis {
		opacity: 0.6;
	}
</style>
