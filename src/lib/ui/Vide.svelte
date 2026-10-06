<script lang="ts">
	// Le vide : une phrase du carnet. Jamais « 0 », « — », « aucun résultat ».
	import type { Snippet } from 'svelte';
	interface Props {
		children: Snippet;
		action?: Snippet;
	}
	let { children, action }: Props = $props();
</script>

<div class="vide">
	<p>{@render children()}</p>
	{#if action}<div class="action">{@render action()}</div>{/if}
</div>

<style>
	.vide {
		padding: var(--ligne) 0;
	}
	p {
		font: var(--t-recit);
		font-variant-numeric: lining-nums tabular-nums;
		font-style: italic;
		color: var(--encre-2);
	}
	.action {
		margin-top: calc(var(--ligne) / 2);
	}
	:global([data-regime='serre']) p,
	:global([data-regime='scene']) p {
		font: var(--t-corps);
		font-variant-numeric: lining-nums tabular-nums;
		font-style: normal;
	}
</style>
