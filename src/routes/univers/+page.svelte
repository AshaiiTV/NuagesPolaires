<script lang="ts">
	import { chemin } from '$lib/ui/adresse';
	// Sommaire du cahier « L'univers » : une ligne par chapitre, numéro à l’encre, résumé, flèche.
	import Page from '$lib/ui/Page.svelte';
	import { typo } from './typo';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	const intro = 'Ouvre un chapitre. Le carnet garde les repères à portée de main.';
</script>

<svelte:head
	><title>L’univers — Nuages Polaires</title><meta
		name="description"
		content="Les textes et les repères de L’univers de Nuages Polaires."
	/></svelte:head
>

<Page repere="NP / 05 — L’univers" titre="L’univers" grain>
	{#snippet marge()}
		<p class="voix">{intro}</p>
	{/snippet}
	{#snippet bande()}<p class="voix">{intro}</p>{/snippet}
	<ol class="sommaire">
		{#each data.chapters as chapter, i (chapter.href)}
			<li>
				<a href={chemin(chapter.href)}>
					<span class="entree"
						><span class="titre">{chapter.title}</span><span class="conduite" aria-hidden="true"
						></span><span class="numero chiffres">{String(i + 1).padStart(2, '0')}</span></span
					>
					<span class="resume">{typo(chapter.resume ?? '')}</span>
				</a>
			</li>
		{/each}
	</ol>
</Page>

<style>
	.sommaire {
		border-top: 1px solid var(--reglure);
	}
	li {
		border-bottom: 1px solid var(--reglure);
	}
	a {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		align-items: baseline;
		padding: var(--ligne) 0 calc(var(--ligne) - 1px);
		text-decoration: none;
	}
	.numero {
		font: 400 32px/var(--ligne) var(--voix);
		font-variant-numeric: oldstyle-nums proportional-nums;
		color: var(--encre-2);
	}
	.titre {
		font: 500 28px / var(--ligne) var(--voix);
		font-variant-numeric: lining-nums tabular-nums;
		letter-spacing: -0.01em;
		color: var(--encre);
		transition: color 160ms;
	}

	.resume {
		grid-column: 1;
		max-width: 46ch;
		font: italic 400 18px / var(--ligne) var(--voix);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}
	.entree {
		display: flex;
		align-items: baseline;
		width: 100%;
	}
	.conduite {
		flex: 1;
		border-bottom: 1px dotted var(--encre-grise);
		margin: 0 12px 7px;
	}
	a:hover .titre {
		color: var(--encre-humide);
	}
</style>
