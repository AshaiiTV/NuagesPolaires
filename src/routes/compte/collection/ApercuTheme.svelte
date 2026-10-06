<script lang="ts">
	// L'aperçu d'un thème, dessiné comme une petite page du carnet avec ses huit tokens : le bureau
	// autour, la page et son bord de réglure, le repère en encre grise, un titre en encre, deux lignes
	// d'écriture (encre, encre secondaire), le ruban de sauge, un feuillet posé (page-2).
	// Les couleurs viennent des données du thème : c'est un échantillon, pas la palette de la page.
	import type { ThemeTokensView } from '$lib/schemas/accounts';

	let { tokens, nom }: { tokens: ThemeTokensView; nom: string } = $props();
	const style = $derived(
		[
			`--a-bureau:${tokens['--bureau']}`,
			`--a-page:${tokens['--page']}`,
			`--a-page-2:${tokens['--page-2']}`,
			`--a-reglure:${tokens['--reglure']}`,
			`--a-encre:${tokens['--encre']}`,
			`--a-encre-2:${tokens['--encre-2']}`,
			`--a-encre-grise:${tokens['--encre-grise']}`,
			`--a-ruban:${tokens['--ruban']}`
		].join(';')
	);
</script>

<div class="apercu" {style} role="img" aria-label="Aperçu du thème {nom}">
	<div class="page">
		<span class="ruban"></span>
		<span class="repere"></span>
		<span class="titre">Nuages <em>Polaires.</em></span>
		<span class="ligne l1"></span>
		<span class="ligne l2"></span>
		<span class="ligne l3"></span>
		<span class="feuillet"></span>
	</div>
</div>

<style>
	.apercu {
		position: relative;
		aspect-ratio: 16 / 10;
		padding: 10px 12px 0;
		background: var(--a-bureau);
		overflow: hidden;
	}
	.page {
		position: relative;
		height: 100%;
		padding: 14px 16px;
		background-color: var(--a-page);
		border: 1px solid var(--a-reglure);
		border-bottom: 0;
		/* La réglure de la page, fine, alignée sur 14 px (la moitié de la réglure du carnet). */
		background-image: repeating-linear-gradient(
			to bottom,
			transparent 0 13px,
			var(--a-reglure) 13px 14px
		);
		background-position: 0 40px;
	}
	.ruban {
		position: absolute;
		top: -1px;
		right: 14px;
		width: 14px;
		height: 26px;
		background: var(--a-ruban);
		clip-path: polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 5px), 0 100%);
	}
	.repere {
		display: block;
		width: 34%;
		height: 2px;
		background: var(--a-encre-grise);
	}
	.titre {
		display: block;
		margin: 8px 0 10px;
		font: 500 20px/22px var(--voix);
		font-variant-numeric: lining-nums tabular-nums;
		letter-spacing: -0.02em;
		color: var(--a-encre);
		white-space: nowrap;
	}
	.titre em {
		color: var(--a-encre-2);
	}
	.ligne {
		display: block;
		height: 2px;
		margin-top: 12px;
		border-radius: 1px;
	}
	.l1 {
		width: 82%;
		background: var(--a-encre);
	}
	.l2 {
		width: 64%;
		background: var(--a-encre-2);
	}
	.l3 {
		width: 40%;
		background: var(--a-encre-2);
		opacity: 0.7;
	}
	.feuillet {
		position: absolute;
		right: 14px;
		bottom: 12px;
		width: 30%;
		height: 30%;
		background: var(--a-page-2);
		border: 1px solid var(--a-reglure);
	}
</style>
