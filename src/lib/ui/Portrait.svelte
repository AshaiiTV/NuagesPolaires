<script lang="ts">
	// Portrait carré à coins droits. Si l'image manque ou échoue, l'initiale du personnage en Cormorant.
	interface Props {
		nom: string;
		src?: string | null;
		taille?: number;
	}
	let { nom, src = null, taille = 96 }: Props = $props();
	let echec = $state(false);
	const initiale = $derived((nom.trim()[0] ?? '·').toUpperCase());
</script>

<span class="portrait" style:--taille="{taille}px">
	{#if src && !echec}
		<img
			{src}
			alt="Portrait de {nom}"
			width={taille}
			height={taille}
			onerror={() => (echec = true)}
		/>
	{:else}
		<span class="initiale" aria-hidden="true">{initiale}</span>
	{/if}
</span>

<style>
	.portrait {
		display: grid;
		place-items: center;
		flex: none;
		width: var(--taille);
		height: var(--taille);
		background: var(--page-2);
		border: 1px solid var(--reglure);
		border-radius: var(--rayon);
		overflow: hidden;
	}
	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.initiale {
		font: 500 calc(var(--taille) * 0.5) / 1 var(--voix);
		color: var(--encre-humide);
	}
</style>
