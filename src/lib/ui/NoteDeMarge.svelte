<script lang="ts">
	// Une note de marge : la seule façon dont le carnet répond (jamais de toasts empilés, une note à la
	// fois). Ton `fait` : « Noté · 21:14 — l'encre a pris. » ; ton `refus` : ce qui n'a pas été fait.
	import type { Snippet } from 'svelte';

	interface Props {
		ton?: 'fait' | 'refus' | 'attente' | 'info';
		children: Snippet;
		action?: Snippet;
	}
	let { ton = 'info', children, action }: Props = $props();
</script>

<p
	class="note {ton}"
	role={ton === 'refus' ? 'alert' : 'status'}
	aria-live={ton === 'refus' ? 'assertive' : 'polite'}
>
	<span class="trait" aria-hidden="true"></span>
	<span class="texte">{@render children()}</span>
	{#if action}<span class="action">{@render action()}</span>{/if}
</p>

<style>
	.note {
		display: flex;
		align-items: baseline;
		gap: 12px;
		padding: calc(var(--ligne) / 4) 0;
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		line-height: var(--ligne);
		color: var(--encre-2);
	}
	.trait {
		flex: none;
		width: 18px;
		height: 1px;
		background: currentColor;
		translate: 0 -4px;
	}
	.fait {
		color: var(--encre-2);
	}
	.attente {
		color: var(--encre-humide);
		font-style: italic;
	}
	.refus {
		color: var(--rouille);
	}
	.action {
		margin-left: auto;
	}
</style>
