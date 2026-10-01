<script lang="ts">
	// Sur téléphone, la marge se replie sous le titre : un dépliant d'une ligne (« Sommaire »),
	// cible de 44 px, même chevron que le pli d'un Chapitre.
	import type { Snippet } from 'svelte';
	let { libelle, children }: { libelle: string; children: Snippet } = $props();
</script>

<details class="depliant">
	<summary
		><span class="repere">{libelle}</span><span class="pli" aria-hidden="true"></span></summary
	>
	<div class="contenu">{@render children()}</div>
</details>

<style>
	.depliant {
		width: 100%;
		border-block: 1px solid var(--reglure);
	}
	summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		min-height: var(--cible);
		padding-right: 4px;
		cursor: pointer;
		list-style: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	.repere {
		color: var(--encre);
	}
	.pli {
		flex: none;
		width: 9px;
		height: 9px;
		margin-top: -4px;
		border-right: 1px solid var(--encre-2);
		border-bottom: 1px solid var(--encre-2);
		rotate: 45deg;
		transition: rotate 200ms;
	}
	details:not([open]) .pli {
		margin-top: 0;
		rotate: -45deg;
	}
	.contenu {
		padding-bottom: calc(var(--ligne) / 2);
	}
</style>
