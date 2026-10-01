<script lang="ts">
 import Page from '$lib/ui/Page.svelte';
 import type { PageProps } from './$types';
 let { data }: PageProps = $props();
</script>
<svelte:head><title>L’univers — Nuages Polaires</title><meta name="description" content="Les textes et les repères de L’univers de Nuages Polaires." /></svelte:head>
<Page repere="NP / 05 — L’univers" titre="L’univers" grain>
 {#snippet marge()}<p class="voix">Ouvre un chapitre. Le carnet garde les repères à portée de main.</p>{/snippet}
 <ol>{#each data.chapters as chapter, i}<li><a href={chapter.href}><span class="numero">{String(i + 1).padStart(2, '0')}</span><span><span class="titre">{chapter.title}</span><span class="resume">{chapter.resume}</span></span><span aria-hidden="true">→</span></a></li>{/each}</ol>
</Page>
<style>
 ol { border-top: 1px solid var(--reglure); } li { border-bottom: 1px solid var(--reglure); }
 a { display: grid; grid-template-columns: 28px minmax(0,1fr) 20px; gap: 16px; padding: 28px 0; min-height: 44px; text-decoration: none; align-items: baseline; }
 .numero { color: var(--tampon); font: var(--t-repere); font-variant-numeric: tabular-nums; }
 .titre { display: block; font: var(--t-chapitre); } .resume { display: block; font: var(--t-corps); color: var(--encre-2); }
 a:hover .titre { color: var(--encre-humide); }
</style>
