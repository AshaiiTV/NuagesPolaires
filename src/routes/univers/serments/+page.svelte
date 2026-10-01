<script lang="ts">
 import Page from '$lib/ui/Page.svelte';
 import Vide from '$lib/ui/Vide.svelte';
 import { OATH_CATEGORY_LABELS, OATH_RANK_LABELS } from '$lib/game/oaths';
 import type { OathCategory } from '$lib/game/types';
 import type { PageProps } from './$types';
 let { data }: PageProps = $props();
 const categories: OathCategory[] = ['melee', 'distance', 'magie', 'soutien'];
</script>
<svelte:head><title>Les Serments — Nuages Polaires</title><meta name="description" content="Les armes, les branches et les paliers de chaque Serment." /></svelte:head>
{#snippet reperes()}
 <nav aria-label="Catégories">{#each categories as category}<a href={'#' + category}>{OATH_CATEGORY_LABELS[category]}</a>{/each}</nav>
 <nav class="rangs" aria-label="Filtrer par rang"><a href="/univers/serments" aria-current={!data.rank ? 'page' : undefined}>Tous les rangs</a>{#each data.ranks as rank}<a href={'?rang=' + rank} aria-current={data.rank === rank ? 'page' : undefined}>{OATH_RANK_LABELS[rank]}</a>{/each}</nav>
{/snippet}
<Page repere="NP / 05 — L’univers" titre="Les Serments" grain>
 {#snippet marge()}{@render reperes()}{/snippet}
 {#snippet bande()}<details><summary>Catégories et rangs</summary>{@render reperes()}</details>{/snippet}
 {#if !data.oaths.length}<Vide>Cette page ne porte pas de Serment pour ce rang.</Vide>{/if}
 {#each categories as category}<section id={category}><h2>{OATH_CATEGORY_LABELS[category]}</h2><ul>{#each data.oaths.filter(oath => oath.category === category) as oath}<li><a class="serment" href={'/univers/serments/' + oath.id}><span class="nom">{oath.name}</span><span class="rang">{OATH_RANK_LABELS[oath.rank]}</span><span class="arme">{oath.weapon}</span><span class="fleche" aria-hidden="true">→</span></a></li>{/each}</ul></section>{/each}
</Page>
<style>
 nav a { display: block; padding: 12px 0; min-height: 44px; font: var(--t-libelle); text-decoration: none; } .rangs { margin-top: 28px; } .rangs a { color: var(--tampon); } .rangs a:first-child { color: var(--encre-2); } a[aria-current] { text-decoration: underline; }
 details { width: 100%; } summary { min-height: 44px; padding: 12px 0; cursor: pointer; }
 section { margin-bottom: 28px; scroll-margin-top: 84px; } h2 { font: var(--t-chapitre); } li { border-bottom: 1px solid var(--reglure); }
 .serment { display: grid; grid-template-columns: minmax(0,1fr) auto 16px; gap: 0 12px; padding: 14px 0; min-height: 56px; text-decoration: none; align-items: baseline; }
 .nom { font: 500 22px/28px var(--voix); } .rang { font: var(--t-repere); color: var(--tampon); font-variant-caps: small-caps; } .arme { grid-column: 1 / 3; font: var(--t-libelle); color: var(--encre-2); } .fleche { grid-column: 3; grid-row: 1; }
 .serment:hover .nom { color: var(--encre-humide); }
</style>
