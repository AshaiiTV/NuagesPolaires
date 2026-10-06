<script lang="ts">
	// Une ressource du régime scène : « PV 51/66 », chiffre de 24 px tabulaire, maximum en encre
	// secondaire après la barre oblique (03-vision §5.3, §5.9). Quand la Table vient de changer la
	// valeur, l'ancienne reste lisible en rature quelques secondes (« ~~24~~ 18 »).
	// Jamais de jauge : un chiffre et, sous 32 % des PV, la rouille.
	import Rature from '../Rature.svelte';

	interface Props {
		nom: 'PV' | 'EP' | 'EM';
		cur: number;
		max: number;
		/** Ancienne valeur à garder en rature (changement reçu de la Table). */
		ancien?: number | null;
		/** Disposition : `ligne` (feuillet, une ressource par ligne) ou `colonne` (Table, trois côte à côte). */
		disposition?: 'ligne' | 'colonne';
	}
	let { nom, cur, max, ancien = null, disposition = 'ligne' }: Props = $props();

	const TITRES = { PV: 'Points de vie', EP: 'Énergie physique', EM: 'Énergie magique' } as const;
	const bas = $derived(nom === 'PV' && max > 0 && cur / max < 0.32);
</script>

<span class="ressource {disposition}" class:bas>
	<abbr class="nom" title={TITRES[nom]}>{nom}</abbr>
	<span class="chiffre chiffres">
		{#if ancien !== null && ancien !== cur}<Rature {ancien} nouveau={cur} />{:else}<span class="cur"
				>{cur}</span
			>{/if}<span class="max">/{max}</span>
	</span>
</span>

<style>
	.ressource {
		display: inline-flex;
		align-items: baseline;
		gap: 12px;
		min-width: 0;
	}
	.colonne {
		flex-direction: column;
		gap: 0;
	}
	.nom {
		flex: none;
		width: 24px;
		font: 500 12px/24px var(--corps);
		font-variant-numeric: lining-nums tabular-nums;
		letter-spacing: 0.14em;
		text-decoration: none;
		color: var(--encre-2);
	}
	.colonne .nom {
		width: auto;
	}
	.chiffre {
		font: 500 24px/28px var(--corps);
		font-variant-numeric: lining-nums tabular-nums;
		letter-spacing: -0.01em;
		color: var(--encre);
		white-space: nowrap;
	}
	.max {
		font-weight: 400;
		color: var(--encre-2);
	}
	.bas .cur,
	.bas .chiffre :global(ins) {
		color: var(--rouille);
	}
	.chiffre :global(s) {
		margin-right: 4px;
		font-weight: 400;
	}
</style>
