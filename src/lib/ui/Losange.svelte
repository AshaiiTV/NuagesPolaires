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

	/** Une couleur très claire (gemme Blanche) disparaît sur l'ivoire : elle reçoit un contour d'encre. */
	function claire(c: string): boolean {
		const v = c.trim().toLowerCase();
		if (v === 'white' || v === '#fff' || v === '#ffffff') return true;
		const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v);
		if (!m) return false;
		const h = m[1].length === 3 ? [...m[1]].map((x) => x + x).join('') : m[1];
		const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
		return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.8;
	}
	const contour = $derived(claire(couleur));
</script>

<span class="sens">
	<span class="losange" class:contour style:background={couleur} aria-hidden="true"></span>
	<span class="libelle">{libelle}</span>{#if detail}<span class="detail chiffres">{detail}</span
		>{/if}
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
	.contour {
		box-shadow: 0 0 0 1px var(--encre-grise);
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
