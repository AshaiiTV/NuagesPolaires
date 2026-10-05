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
					<span class="numero chiffres">{String(i + 1).padStart(2, '0')}</span>
					<span class="titre">{chapter.title}</span>
					<span class="fleche" aria-hidden="true">→</span>
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
		grid-template-columns: calc(var(--ligne) * 2) minmax(0, 1fr) var(--ligne);
		align-items: baseline;
		padding: var(--ligne) 0 calc(var(--ligne) - 1px);
		text-decoration: none;
	}
	.numero {
		font: var(--t-repere);
		letter-spacing: var(--approche-repere);
		color: var(--encre-2);
	}
	.titre {
		font: 500 28px / var(--ligne) var(--voix);
		letter-spacing: -0.01em;
		color: var(--encre);
		transition: color 160ms;
	}
	.fleche {
		justify-self: end;
		font: 400 18px / var(--ligne) var(--corps);
		color: var(--encre-2);
		transition:
			translate 200ms,
			color 160ms;
	}
	.resume {
		grid-column: 2;
		max-width: 46ch;
		font: var(--t-corps);
		color: var(--encre-2);
	}
	a:hover .titre,
	a:hover .fleche {
		color: var(--encre-humide);
	}
	a:hover .fleche {
		translate: 4px 0;
	}
	@media (max-width: 760px) {
		a {
			grid-template-columns: calc(var(--ligne) + 12px) minmax(0, 1fr) var(--ligne);
		}
	}
</style>
