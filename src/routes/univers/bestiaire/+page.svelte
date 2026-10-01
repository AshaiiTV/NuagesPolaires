<script lang="ts">
	import Page from '$lib/ui/Page.svelte';
	import Losange from '$lib/ui/Losange.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import Depliant from '../Depliant.svelte';
	import Filtres from './Filtres.svelte';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<svelte:head
	><title>Le bestiaire — Nuages Polaires</title><meta
		name="description"
		content="Les créatures de Nuages Polaires et les observations de leurs rencontres."
	/></svelte:head
>

<Page repere="NP / 05 — L’univers" titre="Le" titreVoix="bestiaire" grain>
	{#snippet marge()}<Filtres filters={data.filters} zones={data.zones} />{/snippet}
	{#snippet bande()}<Depliant libelle="Recherche et repères"
			><Filtres filters={data.filters} zones={data.zones} prefixe="bestiaire-mobile" /></Depliant
		>{/snippet}
	<p class="chapeau voix">
		Les pages décrivent les créatures. Les observations gardent les rencontres.
	</p>
	{#if !data.beasts.length}<Vide>Aucune créature ne correspond.</Vide>{:else}
		<ul class="creatures">
			{#each data.beasts as beast (beast.id)}
				<li>
					<a class="creature" href="/univers/bestiaire/{beast.id}">
						<span class="nom">{beast.name}</span><span class="niveau chiffres"
							>Niveau {beast.level}</span
						>
						{#if beast.subtitle}<span class="sous-titre">{beast.subtitle}</span>{/if}
						<span class="comportement"
							><Losange couleur={beast.behaviorColor} libelle={beast.behavior} /></span
						>
						<span class="fleche" aria-hidden="true">→</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</Page>

<style>
	.chapeau {
		margin-bottom: var(--ligne);
	}
	.creatures {
		border-top: 1px solid var(--reglure);
	}
	.creature {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto 16px;
		gap: 0 16px;
		align-items: baseline;
		padding: calc(var(--ligne) / 2) 0;
		border-bottom: 1px solid var(--reglure);
		color: inherit;
		text-decoration: none;
	}
	.nom {
		font: 500 22px / var(--ligne) var(--voix);
	}
	.niveau,
	.sous-titre {
		font: var(--t-libelle);
		line-height: var(--ligne);
		color: var(--encre-2);
	}
	.sous-titre {
		grid-column: 1;
	}
	.comportement {
		grid-column: 1 / 3;
		line-height: var(--ligne);
	}
	.fleche {
		grid-column: 3;
		grid-row: 1 / 4;
		align-self: center;
		color: var(--encre-2);
	}
	.creature:hover .nom {
		color: var(--encre-humide);
	}
	.creature > span {
		overflow-wrap: anywhere;
	}
</style>
