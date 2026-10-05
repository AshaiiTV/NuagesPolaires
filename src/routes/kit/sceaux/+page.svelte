<script lang="ts">
	// Planche de contrôle des sceaux de Serment (page de travail, comme /kit).
	import Sceau from '$lib/ui/Sceau.svelte';
	import { SERMENTS_DESSINES } from '$lib/ui/sceaux';

	const noms = [...SERMENTS_DESSINES, 'serment-sans-dessin'];
</script>

<svelte:head><title>Sceaux — kit</title></svelte:head>

<main>
	<h1>Sceaux des Serments</h1>
	<ul>
		{#each noms as nom (nom)}
			<li>
				<span class="grand"><Sceau serment={nom} taille={96} /></span>
				<span class="laiton"><Sceau serment={nom} taille={48} /></span>
				<Sceau serment={nom} taille={32} />
				<Sceau serment={nom} taille={24} nu />
				<span class="nom">{nom}</span>
			</li>
		{/each}
	</ul>
</main>

<style>
	main {
		padding: 28px;
		background: var(--page);
		color: var(--encre);
		min-height: 100vh;
	}
	h1 {
		font: var(--t-titre);
		margin: 0 0 28px;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 28px;
	}
	li {
		display: flex;
		align-items: center;
		gap: 16px;
	}
	.grand {
		color: var(--encre);
	}
	.laiton {
		color: var(--tampon);
	}
	.nom {
		font: var(--t-repere);
		color: var(--encre-2);
	}
</style>
