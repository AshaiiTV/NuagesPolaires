<script lang="ts">
 import Page from '$lib/ui/Page.svelte';
 import Sommaire from './Sommaire.svelte';
 import Tourner from './Tourner.svelte';
 import type { Content } from '$lib/content';
 let { content, html, previous, next }: { content: Content; html: string; previous: {href:string;title:string} | null; next: {href:string;title:string} | null } = $props();
</script>
<svelte:head><title>{content.title} — Nuages Polaires</title><meta name="description" content={content.resume} /></svelte:head>
<Page repere="NP / 05 — L’univers" titre={content.title} grain>
 {#snippet marge()}<Sommaire sections={content.sections} />{/snippet}
 {#snippet bande()}<details><summary>Sommaire</summary><Sommaire sections={content.sections} /></details>{/snippet}
 <div class="lecture" class:recit={content.slug === 'synopsis'}>{@html html}</div>
 {#snippet pied()}<Tourner {previous} {next} />{/snippet}
</Page>
<style>
 details { width: 100%; } summary { min-height: 44px; padding: 12px 0; cursor: pointer; }
 .lecture { max-width: 62ch; min-width: 0; overflow-wrap: anywhere; font: var(--t-corps); counter-reset: chapitre; } .lecture.recit { font: var(--t-recit); }
 .lecture :global(p), .lecture :global(ul), .lecture :global(ol), .lecture :global(blockquote) { margin-bottom: 28px; }
 .lecture :global(h2), .lecture :global(h1) { counter-increment: chapitre; font: var(--t-chapitre); margin: 28px 0; scroll-margin-top: 84px; }
 .lecture :global(h2)::before, .lecture :global(h1)::before { content: counter(chapitre, upper-roman) ' · '; color: var(--tampon); font: var(--t-repere); }
 .lecture :global(h3), .lecture :global(h4) { font: var(--t-chapitre); margin: 28px 0; scroll-margin-top: 84px; }
 .lecture :global(li) { position: relative; padding-left: 20px; margin-bottom: 8px; } .lecture :global(li)::before { content: ''; position: absolute; left: 3px; top: 12px; width: 4px; height: 4px; rotate: 45deg; background: var(--encre-humide); }
 .lecture :global(blockquote) { font: italic 400 18px/28px var(--voix); border-left: 1px solid var(--reglure); padding-left: 20px; }
 .lecture :global(table) { display: block; max-width: 100%; overflow-x: auto; border-collapse: collapse; margin: 28px 0; font-variant-numeric: tabular-nums; }
 .lecture :global(th), .lecture :global(td) { padding: 12px; border-bottom: 1px solid var(--reglure); text-align: left; min-width: 100px; }
 .lecture :global(th) { font-weight: 600; } .lecture :global(pre) { max-width: 100%; overflow-x: auto; font: var(--t-mono); }
 .lecture :global(a) { display: inline-block; min-height: 44px; padding-block: 8px; } .lecture :global(img) { max-width: 100%; }
</style>
