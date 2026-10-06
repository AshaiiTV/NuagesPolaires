<script lang="ts">
	// La chaîne de versions d'une note reste lisible, en lecture seule pour les MJ.
	import type { JournalEntryView } from '$lib/schemas/journal';
	import { dateLongue, heure } from '$lib/ui/dates';
	import EntreeJournal from './EntreeJournal.svelte';
	let { entry, ancienne = false }: { entry: JournalEntryView; ancienne?: boolean } = $props();
</script>

<article class="entree" class:rayee={entry.struck || ancienne}>
	<p class="date">
		{entry.label ?? dateLongue(entry.at)} · {heure(entry.at)}{#if entry.inScene}&nbsp;· notée en
			scène{/if}{#if ancienne}&nbsp;· ancienne version{/if}
	</p>
	<p class="texte">{entry.text}</p>
	{#if entry.previous}<EntreeJournal entry={entry.previous} ancienne />{/if}
</article>

<style>
	.entree {
		padding: var(--ligne) 0;
		border-bottom: 1px solid var(--reglure);
	}
	.date {
		font: var(--t-repere);
		line-height: var(--ligne);
		color: var(--encre-2);
	}
	.texte {
		font: var(--t-recit);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.rayee > .texte {
		text-decoration: line-through;
		color: var(--encre-grise);
	}
</style>
