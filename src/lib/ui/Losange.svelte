<script lang="ts">
	// Couleur de sens : un losange de 4 px devant un libellé en petites capitales, jamais un fond.
	// Statuts, types de rendez-vous, comportements de créature, gemmes.
	interface Props {
		couleur: string;
		libelle: string;
		/** Précision après le libellé : « 2 t. », « ×3 ». */
		detail?: string;
	}
	let { couleur, libelle, detail }: Props = $props();
</script>

<span class="sens">
	<span class="losange" style:background={couleur} aria-hidden="true"></span>
	<span class="libelle">{libelle}</span>{#if detail}<span class="detail chiffres">{detail}</span>{/if}
</span>

<style>
	.sens {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		white-space: nowrap;
	}
	.losange {
		flex: none;
		width: 5px;
		height: 5px;
		rotate: 45deg;
	}
	.libelle {
		font: var(--t-repere);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--encre);
	}
	.detail {
		font: var(--t-libelle);
		color: var(--encre-2);
	}
</style>
