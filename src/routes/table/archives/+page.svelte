<script lang="ts">
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { chemin } from '$lib/ui/adresse';
	// /table/archives — les récits de toutes les Tables repliées, du plus récent au plus ancien ;
	// recherche par titre ou nom de combat ; 20 par page. 03-vision §5.8.
	import Page from '$lib/ui/Page.svelte';
	import Chapitre from '$lib/ui/Chapitre.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import Sommaire from '$lib/ui/table/Sommaire.svelte';
	import { dateCourte, heure } from '$lib/ui/dates';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const lien = (page: number) => {
		const p = new SvelteURLSearchParams();
		if (data.recherche) p.set('q', data.recherche);
		if (page > 1) p.set('page', String(page));
		const s = p.toString();
		return `/table/archives${s ? `?${s}` : ''}`;
	};
</script>

<svelte:head><title>Archives — La Table — Nuages Polaires</title></svelte:head>

<Page repere="NP / 06 — La Table · archives" titre="Les" titreVoix="Récits.">
	{#snippet marge()}
		<Sommaire />
	{/snippet}
	{#snippet bande()}
		<Sommaire />
	{/snippet}

	<form class="recherche" method="GET" role="search">
		<label for="q" class="sr-only">Chercher un récit</label>
		<input
			id="q"
			type="search"
			name="q"
			value={data.recherche}
			placeholder="Chercher un récit par son titre…"
			autocomplete="off"
		/>
		<Bouton variante="trait" type="submit">Chercher</Bouton>
		{#if data.recherche}<Bouton variante="texte" href="/table/archives">Tout relire</Bouton>{/if}
	</form>

	<Chapitre numero="01" titre={data.recherche ? `« ${data.recherche} »` : 'Tous les récits'}>
		{#if data.recits.length}
			<ol class="recits">
				{#each data.recits as r (r.id)}
					<li>
						<a class="titre" href={chemin(`/table/archives/${r.id}`)}>{r.titre}</a>
						<span class="combat">{r.titre !== r.nom ? r.nom : ''}</span>
						<span class="quand chiffres">{dateCourte(r.at)} · {heure(r.at)}</span>
						<span class="rounds chiffres">{r.rounds} round{r.rounds > 1 ? 's' : ''}</span>
						<span class="lisible"
							>{r.lisible ? 'lisible par ses participants' : 'réservé à la Table'}</span
						>
						<Bouton variante="texte" href="/table/archives/{r.id}" fleche="→">Lire le récit</Bouton>
					</li>
				{/each}
			</ol>
		{:else if data.recherche}
			<Vide>
				Aucun récit ne porte ce titre.
				{#snippet action()}<Bouton variante="texte" href="/table/archives" fleche="→"
						>Relire tous les récits</Bouton
					>{/snippet}
			</Vide>
		{:else}
			<Vide>
				Aucun récit encore. Une Table repliée s’écrit ici.
				{#snippet action()}<Bouton variante="texte" href="/table" fleche="→"
						>Ouvrir une Table</Bouton
					>{/snippet}
			</Vide>
		{/if}

		{#if data.page > 1 || data.suivante}
			<nav class="pages" aria-label="Pages des récits">
				{#if data.page > 1}<Bouton variante="texte" href={lien(data.page - 1)}
						>← Plus récents</Bouton
					>{:else}<span></span>{/if}
				<span class="numero chiffres">page {data.page}</span>
				{#if data.suivante}<Bouton variante="texte" href={lien(data.page + 1)} fleche="→"
						>Plus anciens</Bouton
					>{:else}<span></span>{/if}
			</nav>
		{/if}
	</Chapitre>
</Page>

<style>
	.recherche {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 16px;
		margin-bottom: var(--ligne);
	}
	.recherche input {
		flex: 1 1 280px;
		min-height: 44px;
		padding: 8px 0;
		border: 0;
		border-bottom: 1px solid color-mix(in srgb, var(--encre) 28%, transparent);
		background: transparent;
		font: var(--t-corps);
		color: var(--encre);
	}
	.recherche input::placeholder {
		color: var(--encre-grise);
		font-style: italic;
	}
	.recits li {
		display: grid;
		grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) 150px 90px 200px auto;
		align-items: center;
		gap: 0 24px;
		min-height: 48px;
		border-bottom: 1px solid var(--reglure);
	}
	.titre {
		font: 500 16px/24px var(--corps);
		color: var(--encre);
		text-decoration: none;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.titre:hover {
		text-decoration: underline;
	}
	.combat,
	.quand,
	.rounds,
	.lisible {
		font: var(--t-libelle);
		color: var(--encre-2);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.pages {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding-top: 24px;
	}
	.numero {
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	@media (max-width: 1100px) {
		.recits li {
			grid-template-columns: minmax(0, 1fr) 140px 80px auto;
		}
		.recits .combat,
		.recits .lisible {
			display: none;
		}
	}
	@media (max-width: 760px) {
		.recits li {
			grid-template-columns: minmax(0, 1fr) auto;
			grid-template-areas: 'titre action' 'meta action';
			padding: 8px 0;
		}
		.titre {
			grid-area: titre;
			white-space: normal;
		}
		.quand {
			grid-area: meta;
		}
		.rounds {
			display: none;
		}
		.recits li > :global(.bouton) {
			grid-area: action;
		}
	}
</style>
