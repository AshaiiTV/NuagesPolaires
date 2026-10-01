<script lang="ts">
	// Pied des pages publiques. Le lien Discord n'apparaît que si un administrateur l'a saisi.
	interface Props {
		discord?: string | null;
	}
	let { discord = null }: Props = $props();
</script>

<footer class="colophon">
	<p class="signature">
		NUAGES POLAIRES
		<small>Le compagnon d’un monde à écrire.</small>
	</p>
	<nav aria-label="Pied de page">
		<a href="/univers/reglement">Règlement</a>
		<a href="/univers/premiers-pas">Premiers pas</a>
		<a href="/univers/site-et-donnees">Le site et vos données</a>
		{#if discord}
			<a href={discord} rel="noopener noreferrer" target="_blank">Discord <span aria-hidden="true">↗</span></a>
		{/if}
	</nav>
</footer>

<style>
	.colophon {
		width: 88%;
		max-width: 1408px;
		margin: 0 auto;
		padding: 35px 0 40px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
	}
	.signature {
		font: 500 12px/16px var(--corps);
		letter-spacing: 0.1em;
		color: var(--encre-2);
	}
	small {
		display: block;
		margin-top: 8px;
		font: 400 13px/20px var(--corps);
		letter-spacing: 0;
		color: var(--encre-grise);
	}
	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 28px;
	}
	a {
		display: inline-flex;
		align-items: center;
		min-height: var(--cible);
		font: 500 13px/20px var(--corps);
		color: var(--encre-2);
		text-decoration: none;
	}
	a:hover {
		color: var(--encre);
	}
	@media (max-width: 760px) {
		.colophon {
			flex-direction: column;
			align-items: flex-start;
			gap: 14px;
			padding: 30px 0 96px;
		}
	}
</style>
