<script lang="ts">
 import Page from '$lib/ui/Page.svelte';
 import Sommaire from '../../Sommaire.svelte';
 import Tourner from '../../Tourner.svelte';
 import { OATH_CATEGORY_LABELS, OATH_RANK_LABELS } from '$lib/game/oaths';
 import type { PageProps } from './$types';
 let { data }: PageProps = $props();
 const sections = $derived([{ id: 'lore', title: 'Lore', level: 2 }, ...data.branches.map((branch, i) => ({ id: 'branche-' + i, title: branch.nom, level: 2 }))]);
 const reached = $derived(data.tuEsIci === null ? -1 : data.levels.reduce((last, level, i) => level <= data.tuEsIci! ? i : last, -1));
</script>
<svelte:head><title>{data.oath.name} — Nuages Polaires</title><meta name="description" content={data.oath.lore} /></svelte:head>
{#snippet identite()}
 <p>{OATH_CATEGORY_LABELS[data.oath.category]}</p><p class="rang">{OATH_RANK_LABELS[data.oath.rank]}</p><p>{data.oath.weapon}</p>
 {#if data.oath.evolvesFrom}<p>Évolution de {data.oath.evolvesFrom}</p>{/if}
 <p class="croissance">+{data.oath.growth.pvN} PV · +{data.oath.growth.epN} EP · +{data.oath.growth.emN} EM par niveau · frappe {data.oath.baseDamage}</p>
{/snippet}
<Page repere="NP / 05 — L’univers" titre={data.oath.name} grain>
 {#snippet marge()}{@render identite()}<Sommaire {sections} />{/snippet}
 {#snippet bande()}<div>{@render identite()}<details><summary>Sommaire</summary><Sommaire {sections} /></details></div>{/snippet}
 <section id="lore"><h2>Lore</h2><p class="lore">{data.oath.lore}</p></section>
 {#each data.branches as branch, b}<section id={'branche-' + b}>
 <h2>{branch.nom}</h2><p class="style">{branch.style}</p>
 {#if branch.descPhys || branch.desc}<p>{branch.descPhys ?? branch.desc}</p>{/if}
 {#if branch.flavor}<p class="flavor">{branch.flavor}</p>{/if}
 <ol>{#each branch.paliers as tier, i}<li class="palier"><span class="niveau">Niv. {data.levels[i] ?? tier.niv}</span><div><h3>{tier.nom}</h3><p class="cout">{tier.cout}</p>{#if data.readerBranch === branch.nom && reached === i}<p class="ici"><span aria-hidden="true">◆</span> tu es ici</p>{/if}<p>{tier.desc}</p></div></li>{/each}</ol>
 </section>{/each}
 {#snippet pied()}<Tourner previous={data.previous} next={data.next} serments />{/snippet}
</Page>
<style>
 section { max-width: 62ch; margin-bottom: 28px; scroll-margin-top: 84px; overflow-wrap: anywhere; } h2 { font: var(--t-chapitre); margin-bottom: 28px; } p { margin-bottom: 28px; font: var(--t-corps); white-space: pre-line; }
 .lore { font: var(--t-recit); } .flavor { font: italic 400 18px/28px var(--voix); } .style { font: var(--t-libelle); color: var(--encre-2); }
 .rang { color: var(--tampon); font: var(--t-repere); font-variant-caps: small-caps; } .croissance { font: var(--t-libelle); font-variant-numeric: tabular-nums; }
 .palier { display: grid; grid-template-columns: 64px minmax(0,1fr); gap: 16px; border-top: 1px solid var(--reglure); padding-top: 28px; } .niveau { font: var(--t-libelle); font-variant-numeric: tabular-nums; padding-top: 6px; } h3 { font: 500 22px/28px var(--voix); } .cout { font: var(--t-repere); font-variant-caps: small-caps; color: var(--encre-2); margin: 8px 0 28px; } .ici { color: var(--encre-humide); font: var(--t-libelle); }
 summary { min-height: 44px; padding: 12px 0; cursor: pointer; }
</style>
