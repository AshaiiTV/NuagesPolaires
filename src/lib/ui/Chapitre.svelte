<script lang="ts">
	// Un chapitre numéroté. Son titre occupe deux lignes de réglure.
	import type { Snippet } from 'svelte';

	interface Props {
		numero?: string;
		titre: string;
		id?: string;
		/** Phrase de présentation, en voix du carnet. */
		chapeau?: string;
		/** Repliable sur téléphone (fiche) ; ouvert par défaut. */
		repliable?: boolean;
		ouvert?: boolean;
		children: Snippet;
		actions?: Snippet;
	}
	let { numero, titre, id, chapeau, repliable = false, ouvert = true, children, actions }: Props = $props();
</script>

{#if repliable}
	<details class="chapitre" {id} open={ouvert}>
		<summary>
			{#if numero}<span class="numero chiffres">{numero}</span>{/if}
			<h2>{titre}</h2>
			<span class="pli" aria-hidden="true"></span>
		</summary>
		{#if chapeau}<p class="chapeau">{chapeau}</p>{/if}
		{@render children()}
	</details>
{:else}
	<section class="chapitre" {id} tabindex="-1">
		<header>
			{#if numero}<span class="numero chiffres">{numero}</span>{/if}
			<h2>{titre}</h2>
			{#if actions}<div class="actions">{@render actions()}</div>{/if}
		</header>
		{#if chapeau}<p class="chapeau">{chapeau}</p>{/if}
		{@render children()}
	</section>
{/if}

<style>
	.chapitre {
		margin-top: calc(var(--ligne) * 2);
		outline: none;
	}
	header,
	summary {
		display: flex;
		align-items: baseline;
		gap: 14px;
		min-height: calc(var(--ligne) * 2);
		border-bottom: 1px solid var(--reglure);
	}
	summary {
		cursor: pointer;
		list-style: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	.numero {
		font: var(--t-repere);
		letter-spacing: var(--approche-repere);
		color: var(--tampon);
	}
	h2 {
		font: var(--t-chapitre);
		letter-spacing: -0.01em;
		color: var(--encre);
	}
	.actions {
		margin-left: auto;
		align-self: center;
	}
	.pli {
		margin-left: auto;
		align-self: center;
		width: 9px;
		height: 9px;
		border-right: 1px solid var(--encre-2);
		border-bottom: 1px solid var(--encre-2);
		rotate: 45deg;
		transition: rotate 200ms;
	}
	details:not([open]) .pli {
		rotate: -45deg;
	}
	.chapeau {
		padding-top: calc(var(--ligne) / 2);
		font: var(--t-recit);
		font-style: italic;
		color: var(--encre-2);
	}
	:global([data-regime='serre']) h2,
	:global([data-regime='scene']) h2 {
		font: 600 14px/48px var(--corps);
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	:global([data-regime='serre']) .chapitre,
	:global([data-regime='scene']) .chapitre {
		margin-top: var(--ligne);
	}
</style>
