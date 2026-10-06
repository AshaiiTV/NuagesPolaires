<script lang="ts">
	// Une page du carnet : marge à gauche (repère, date, sommaire, tampons, annotations), corps à droite.
	// Sur téléphone, la marge devient une bande sous le titre et les annotations passent en fin de page.
	import type { Snippet } from 'svelte';

	interface Props {
		/** Coordonnée de la page : « NP / 02 — Mon carnet ». */
		repere: string;
		titre: string;
		/** Dernier mot du titre en italique (la voix du carnet). */
		titreVoix?: string;
		/** Grain de papier : accueil, Dernières pages, journal, références seulement. */
		grain?: boolean;
		/** Réglure visible : journal, notes du MJ, journal d'audit. */
		reglure?: boolean;
		marge?: Snippet;
		/** Bande sous le titre sur téléphone (repère · date · tampon). */
		bande?: Snippet;
		children: Snippet;
		pied?: Snippet;
	}
	let {
		repere,
		titre,
		titreVoix,
		grain = false,
		reglure = false,
		marge,
		bande,
		children,
		pied
	}: Props = $props();
</script>

<article class="page" class:grain class:reglure>
	<aside class="marge">
		<p class="repere">{repere}</p>
		{#if marge}<div class="annotations">{@render marge()}</div>{/if}
	</aside>
	<div class="corps">
		<header class="tete">
			<p class="repere mobile">{repere}</p>
			<h1>
				{titre}{#if titreVoix}&nbsp;<em>{titreVoix.endsWith('.') ? titreVoix : titreVoix + '.'}</em
					>{:else}{titre.endsWith('.') ? '' : '.'}{/if}
			</h1>
			{#if bande}<div class="bande">{@render bande()}</div>{/if}
		</header>
		{@render children()}
		{#if pied}<footer class="pied">{@render pied()}</footer>{/if}
	</div>
</article>

<style>
	.page {
		position: relative;
		view-transition-name: feuille;
		display: grid;
		grid-template-columns: 34fr 66fr;
		column-gap: var(--gouttiere);
		width: 100%;
		max-width: var(--page-max);
		min-height: calc(100svh - var(--ligne) * 4);
		margin: 0 auto;
		padding: calc(var(--ligne) * 2) calc(var(--ligne) * 2) calc(var(--ligne) * 3);
		background: var(--page);
		border: 1px solid var(--reglure);
		box-shadow: var(--ombre-page);
	}
	/* La page est une vitre posée sur le ciel (Ciel.svelte) ; opaque si le flou n'est pas rendu. */
	@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) {
		.page {
			background: color-mix(in srgb, var(--page) 84%, transparent);
			-webkit-backdrop-filter: blur(18px) saturate(1.1);
			backdrop-filter: blur(18px) saturate(1.1);
			border-color: color-mix(in srgb, var(--encre) 9%, transparent);
			box-shadow: 0 30px 80px rgb(0 0 0 / 0.45);
		}
	}
	/* Grain statique, 3 % : la seule matière de la page. */
	.grain {
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.03 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E");
	}
	.reglure .corps {
		background-image: repeating-linear-gradient(
			to bottom,
			transparent 0 calc(var(--ligne) - 1px),
			var(--reglure) calc(var(--ligne) - 1px) var(--ligne)
		);
		background-position: 0 calc(var(--ligne) * 4);
	}
	.marge {
		position: sticky;
		top: calc(var(--ligne) * 2);
		align-self: start;
		padding-right: var(--gouttiere);
	}
	.annotations {
		margin-top: var(--ligne);
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}
	.corps {
		min-width: 0;
		max-width: calc(var(--lecture) + 12ch);
	}
	.tete {
		margin-bottom: var(--ligne);
	}
	.mobile {
		display: none;
	}
	h1 {
		font: var(--t-titre);
		font-variant-numeric: lining-nums tabular-nums;
		letter-spacing: -0.02em;
		color: var(--encre);
	}
	h1 em {
		font-style: italic;
		color: var(--encre-2);
	}
	.bande {
		display: none;
	}
	.pied {
		margin-top: calc(var(--ligne) * 2);
		padding-top: var(--ligne);
		border-top: 1px solid var(--reglure);
	}

	:global([data-regime='serre']) .page {
		align-content: start;
		grid-template-columns: 1fr;
		padding: var(--ligne);
	}
	:global([data-regime='serre']) .marge {
		position: static;
		padding: 0 0 var(--ligne);
	}
	:global([data-regime='serre']) .corps {
		max-width: none;
	}

	@media (max-width: 1100px) {
		.page {
			grid-template-columns: 26fr 74fr;
			padding: var(--ligne);
		}
	}
	@media (max-width: 760px) {
		.repere.mobile {
			padding-right: 106px;
		}
		.page {
			display: block;
			min-height: 100svh;
			padding: var(--ligne) var(--gouttiere) calc(var(--ligne) * 4);
			border-inline: 0;
			box-shadow: none;
		}
		.marge {
			display: none;
		}
		.mobile {
			display: block;
			margin-bottom: 12px;
		}
		.bande {
			display: flex;
			flex-wrap: wrap;
			gap: 4px 12px;
			margin-top: 12px;
			font: var(--t-libelle);
			font-variant-numeric: lining-nums tabular-nums;
			color: var(--encre-2);
		}
	}
	@media (prefers-contrast: more) {
		.grain {
			background-image: none;
		}
	}
</style>
