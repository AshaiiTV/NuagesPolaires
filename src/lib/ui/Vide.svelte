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
		font-style: italic;
		color: var(--encre-2);
	}
	.action {
		margin-top: calc(var(--ligne) / 2);
	}
	:global(html[data-regime='serre']) p,
	:global(html[data-regime='scene']) p {
		font: var(--t-corps);
		font-style: normal;
	}
</style>
