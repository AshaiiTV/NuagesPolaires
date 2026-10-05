<script lang="ts">
	// Les quatre cahiers publics restent accessibles sous le pouce, accueil compris.
	import { bandeVisiteur } from './navigation';
	let { chemin }: { chemin: string } = $props();
</script>

<nav class="bande-basse" aria-label="Navigation">
	{#each bandeVisiteur(chemin) as onglet (onglet.id)}
		<a
			class:courant={onglet.courant}
			href={onglet.href}
			aria-current={onglet.courant ? 'page' : undefined}>{onglet.libelle}</a
		>
	{/each}
</nav>

<style>
	.bande-basse {
		display: none;
	}
	@media (max-width: 760px) {
		.bande-basse {
			position: fixed;
			z-index: 10;
			inset: auto 0 0;
			display: grid;
			grid-template-columns: repeat(4, minmax(0, 1fr));
			padding-bottom: env(safe-area-inset-bottom);
			background: var(--bureau);
			border-top: 1px solid var(--reglure);
		}
		a {
			display: grid;
			place-items: center;
			min-height: 56px;
			font: 500 13px/16px var(--corps);
			color: var(--encre-2);
			text-decoration: none;
		}
		a.courant {
			color: var(--encre);
			border-top: 2px solid var(--ruban);
		}
	}
</style>
