<script lang="ts">
	// Trois gestes d'écriture : `ruban` (action principale, sauge — seule surface pleine de couleur),
	// `trait` (action secondaire, cadre fin), `texte` (lien fléché souligné).
	// Les décisions du staff utilisent `tampon` (laiton) : quand on voit du laiton, quelqu'un a décidé.
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	type Variante = 'ruban' | 'trait' | 'texte' | 'tampon' | 'rouille';
	type Props = {
		variante?: Variante;
		href?: string;
		/** Signe en fin de libellé : ↗ quitte le carnet, → tourne la page, ↓ descend. */
		fleche?: '↗' | '→' | '↓' | null;
		large?: boolean;
		children: Snippet;
	} & Omit<HTMLButtonAttributes & HTMLAnchorAttributes, 'children'>;

	let { variante = 'trait', href, fleche = null, large = false, children, ...reste }: Props = $props();
</script>

{#if href}
	<a class="bouton {variante}" class:large {href} {...reste}>
		<span>{@render children()}</span>
		{#if fleche}<span class="fleche" aria-hidden="true">{fleche}</span>{/if}
	</a>
{:else}
	<button class="bouton {variante}" class:large type="button" {...reste}>
		<span>{@render children()}</span>
		{#if fleche}<span class="fleche" aria-hidden="true">{fleche}</span>{/if}
	</button>
{/if}

<style>
	.bouton {
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		min-height: var(--cible);
		padding: 10px 18px;
		border: 1px solid transparent;
		border-radius: var(--rayon);
		background: none;
		font: 600 14px/20px var(--corps);
		letter-spacing: 0.01em;
		text-decoration: none;
		cursor: pointer;
		transition:
			background 160ms,
			border-color 160ms,
			color 160ms;
	}
	.large {
		width: 100%;
	}
	.fleche {
		font: 400 18px/1 var(--corps);
	}
	.ruban {
		background: var(--ruban);
		border-color: var(--ruban);
		color: var(--sur-ruban);
	}
	.ruban:hover {
		background: color-mix(in srgb, var(--ruban) 86%, white);
	}
	.trait {
		border-color: color-mix(in srgb, var(--encre) 22%, transparent);
		color: var(--encre);
	}
	.trait:hover {
		border-color: var(--encre-humide);
		background: color-mix(in srgb, var(--encre-humide) 7%, transparent);
	}
	.tampon {
		border-color: var(--tampon);
		color: var(--tampon);
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-size: 12px;
	}
	.tampon:hover {
		background: color-mix(in srgb, var(--tampon) 12%, transparent);
	}
	.rouille {
		border-color: color-mix(in srgb, var(--rouille) 60%, transparent);
		color: var(--rouille);
	}
	.rouille:hover {
		background: color-mix(in srgb, var(--rouille) 10%, transparent);
	}
	.texte {
		padding: 10px 0;
		border-radius: 0;
		border-bottom-color: color-mix(in srgb, var(--encre-humide) 45%, transparent);
		font-weight: 500;
		color: var(--encre);
		gap: 28px;
	}
	.texte:hover {
		border-bottom-color: var(--encre);
	}
	.bouton:disabled,
	.bouton[aria-disabled='true'] {
		opacity: 0.5;
		cursor: default;
	}
</style>
