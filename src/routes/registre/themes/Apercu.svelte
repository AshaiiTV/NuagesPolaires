<script lang="ts">
	// Aperçu d'un thème : une petite page du carnet peinte avec ses huit tokens, et rien d'autre
	// (bureau, page, page secondaire, réglure, trois encres, ruban). Les teintes de sens (aurore,
	// laiton, rouille) ne changent pas d'un thème à l'autre : elles n'y figurent pas.
	import type { ThemeTokensView } from '$lib/schemas/accounts';

	interface Props {
		tokens: ThemeTokensView;
		nom?: string;
		grand?: boolean;
	}
	let { tokens, nom = '', grand = false }: Props = $props();
</script>

<div
	class="apercu"
	class:grand
	role="img"
	aria-label={`Aperçu du thème ${nom}`}
	style:--bureau={tokens['--bureau']}
	style:--page={tokens['--page']}
	style:--page-2={tokens['--page-2']}
	style:--reglure={tokens['--reglure']}
	style:--encre={tokens['--encre']}
	style:--encre-2={tokens['--encre-2']}
	style:--encre-grise={tokens['--encre-grise']}
	style:--ruban={tokens['--ruban']}
>
	<div class="feuille">
		<span class="ruban" aria-hidden="true"></span>
		<p class="repere-a">NP / 02 — Mon carnet</p>
		<p class="titre">Dernières <em>pages.</em></p>
		<p class="ligne encre">Kael déclare −8 EP.</p>
		<p class="ligne encre-2">PV 24/30 · relevé 21:14</p>
		<p class="ligne grise"><s>120</s> 150</p>
		<div class="volant"><span></span><span></span></div>
	</div>
</div>

<style>
	.apercu {
		padding: 14px 14px 0;
		background: var(--bureau);
		overflow: hidden;
	}
	.feuille {
		position: relative;
		height: 132px;
		padding: 12px 14px;
		background: var(--page);
		border: 1px solid var(--reglure);
		border-bottom: 0;
		background-image: repeating-linear-gradient(
			to bottom,
			transparent 0 17px,
			var(--reglure) 17px 18px
		);
		background-position: 0 50px;
	}
	.ruban {
		position: absolute;
		top: -1px;
		right: 18px;
		width: 18px;
		height: 30px;
		background: var(--ruban);
		clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%);
	}
	/* Textes de l'aperçu : ce sont des échantillons de couleur, à la taille minimale du carnet. */
	.repere-a {
		font: 500 12px/16px var(--corps);
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--encre-2);
		white-space: nowrap;
		overflow: hidden;
		/* Le ruban ne recouvre pas le repère. */
		margin-right: 28px;
	}
	.titre {
		margin: 2px 0 6px;
		font: 500 24px/28px var(--voix);
		color: var(--encre);
		white-space: nowrap;
	}
	.titre em {
		color: var(--encre-2);
	}
	.ligne {
		font: 500 12px/18px var(--corps);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.encre {
		color: var(--encre);
	}
	.encre-2 {
		color: var(--encre-2);
	}
	.grise {
		color: var(--encre-grise);
	}
	.volant {
		position: absolute;
		right: 14px;
		bottom: 12px;
		display: grid;
		gap: 5px;
		width: 34%;
		padding: 8px;
		background: var(--page-2);
		border: 1px solid var(--reglure);
	}
	.volant span {
		height: 2px;
		background: var(--encre-grise);
	}
	.volant span + span {
		width: 60%;
	}
	.grand .feuille {
		height: 196px;
		padding: 18px 22px;
	}
	.grand .titre {
		font-size: 34px;
		line-height: 40px;
	}
	.grand .ligne {
		font-size: 14px;
		line-height: 22px;
	}
</style>
