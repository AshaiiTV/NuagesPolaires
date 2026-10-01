<script lang="ts">
	// En-tête des pages publiques : wordmark à gauche, trois entrées à droite.
	import Boussole from './Boussole.svelte';

	interface Props {
		/** Compte connecté : « Entrer » devient « Mon carnet ». */
		connecte?: boolean;
	}
	let { connecte = false }: Props = $props();
</script>

<header class="masthead">
	<a class="wordmark" href="/" aria-label="Nuages Polaires, accueil">
		<Boussole taille={44} />
		<span class="nom">Nuages<br />Polaires<span class="note">Le compagnon</span></span>
	</a>
	<nav aria-label="Navigation de l'accueil">
		<a class="lien" href="/univers">L’univers</a>
		<a class="lien" href="/univers/serments">Les Serments</a>
		{#if connecte}
			<a class="entrer" href="/carnet">Mon carnet <span aria-hidden="true">↗</span></a>
		{:else}
			<a class="entrer" href="/entrer">Entrer <span aria-hidden="true">↗</span></a>
		{/if}
	</nav>
</header>

<style>
	.masthead {
		position: relative;
		z-index: 3;
		width: min(100%, 1600px);
		height: 104px;
		margin: 0 auto;
		padding: 0 6%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid var(--filet);
	}
	.wordmark {
		display: flex;
		align-items: center;
		gap: 13px;
		color: var(--encre);
		text-decoration: none;
	}
	.nom {
		font: 500 19px/0.95 var(--voix);
		letter-spacing: 0.11em;
		text-transform: uppercase;
	}
	.note {
		display: block;
		margin-top: 8px;
		font: 500 12px/1 var(--corps);
		letter-spacing: 0.16em;
		color: var(--encre-grise);
	}
	nav {
		display: flex;
		align-items: center;
		gap: 30px;
	}
	.lien {
		display: inline-flex;
		align-items: center;
		min-height: var(--cible);
		font: 500 14px/20px var(--corps);
		color: var(--encre-2);
		text-decoration: none;
	}
	.lien:hover {
		color: var(--encre);
	}
	.entrer {
		display: inline-flex;
		align-items: center;
		gap: 30px;
		min-height: var(--cible);
		margin-left: 16px;
		padding: 12px 20px;
		border: 1px solid color-mix(in srgb, var(--encre-humide) 32%, transparent);
		border-radius: var(--rayon);
		font: 500 14px/20px var(--corps);
		color: var(--encre);
		text-decoration: none;
		transition: background 200ms;
	}
	.entrer:hover {
		background: color-mix(in srgb, var(--encre-humide) 8%, transparent);
	}
	@media (max-width: 760px) {
		.masthead {
			height: 84px;
		}
		.lien {
			display: none;
		}
		.entrer {
			margin: 0;
			padding: 10px 14px;
			gap: 16px;
		}
		.nom {
			font-size: 16px;
		}
		.wordmark :global(svg) {
			width: 34px;
			height: 34px;
		}
	}
</style>
