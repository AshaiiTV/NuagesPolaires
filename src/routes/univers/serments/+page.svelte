<script lang="ts">
	// Les Serments : un chapitre par catégorie, une ligne par Serment (nom, arme, rang en laiton).
	// En marge : les catégories et le filtre de rang, l'état courant marqué d'un losange aurore.
	import Page from '$lib/ui/Page.svelte';
	import Chapitre from '$lib/ui/Chapitre.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import Depliant from '../Depliant.svelte';
	import { typo } from '../typo';
	import { OATH_CATEGORY_LABELS, OATH_RANK_LABELS } from '$lib/game/oaths';
	import type { OathCategory } from '$lib/game/types';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();

	const categories: OathCategory[] = ['melee', 'distance', 'magie', 'soutien'];
	const groupes = $derived(
		categories
			.map((id) => ({
				id,
				libelle: OATH_CATEGORY_LABELS[id],
				serments: data.oaths.filter((oath) => oath.category === id)
			}))
			.filter((groupe) => groupe.serments.length > 0)
	);
	const numero = (i: number) => String(i + 1).padStart(2, '0');
</script>

<svelte:head
	><title>Les Serments — Nuages Polaires</title><meta
		name="description"
		content="Les armes, les branches et les paliers de chaque Serment."
	/></svelte:head
>

{#snippet reperes()}
	{#if groupes.length}
		<nav class="categories" aria-label="Catégories">
			<p class="repere">Catégories</p>
			<ul>
				{#each groupes as groupe, i (groupe.id)}
					<li>
						<a href={'#' + groupe.id}
							><span class="numero chiffres">{numero(i)}</span>{groupe.libelle}</a
						>
					</li>
				{/each}
			</ul>
		</nav>
	{/if}
	<nav class="rangs" aria-label="Filtrer par rang">
		<p class="repere">Rang</p>
		<ul>
			<li>
				<a
					class:courant={!data.rank}
					href="/univers/serments"
					aria-current={!data.rank ? 'true' : undefined}
					><span class="marque" aria-hidden="true"></span>Tous les rangs</a
				>
			</li>
			{#each data.ranks as rank (rank)}
				<li>
					<a
						class="rang"
						class:courant={data.rank === rank}
						href={'/univers/serments?rang=' + rank}
						aria-current={data.rank === rank ? 'true' : undefined}
						><span class="marque" aria-hidden="true"></span>{OATH_RANK_LABELS[rank]}</a
					>
				</li>
			{/each}
		</ul>
	</nav>
{/snippet}

<Page repere="NP / 05 — L’univers" titre="Les" titreVoix="Serments" grain>
	{#snippet marge()}
		<p class="voix">« Nul ne choisit son Serment. C’est le Serment qui reconnaît son porteur. »</p>
		<div class="reperes">{@render reperes()}</div>
	{/snippet}
	{#snippet bande()}<Depliant libelle="Catégories et rangs">{@render reperes()}</Depliant>{/snippet}

	{#if !groupes.length}<Vide>Cette page ne porte pas de Serment pour ce rang.</Vide>{/if}
	{#each groupes as groupe, i (groupe.id)}
		<Chapitre numero={numero(i)} titre={groupe.libelle} id={groupe.id}>
			<ul class="serments">
				{#each groupe.serments as oath (oath.id)}
					<li>
						<a class="serment" href={'/univers/serments/' + oath.id}>
							<span class="nom">{typo(oath.name)}</span>
							<span class="arme">{typo(oath.weapon)}</span>
							<span class="rang-serment">{OATH_RANK_LABELS[oath.rank]}</span>
							<span class="fleche" aria-hidden="true">→</span>
						</a>
					</li>
				{/each}
			</ul>
		</Chapitre>
	{/each}
</Page>

<style>
	/* Marge */
	.reperes {
		margin-top: var(--ligne);
		border-top: 1px solid var(--reglure);
	}
	nav {
		padding: calc(var(--ligne) / 2) 0 calc(var(--ligne) / 2 - 1px);
		border-bottom: 1px solid var(--reglure);
	}
	nav .repere {
		line-height: var(--ligne);
	}
	nav a {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: var(--cible);
		font: var(--t-libelle);
		color: var(--encre-2);
		text-decoration: none;
		transition: color 160ms;
	}
	nav a:hover,
	nav a.courant {
		color: var(--encre);
	}
	.numero {
		min-width: 22px;
		font: var(--t-repere);
		letter-spacing: 0.12em;
		color: var(--tampon);
	}
	.marque {
		flex: none;
		width: 5px;
		height: 5px;
		rotate: 45deg;
	}
	.courant .marque {
		background: var(--encre-humide);
	}
	/* Le rang s'écrit en laiton, capitales espacées. */
	nav a.rang,
	nav a.rang:hover {
		font: var(--t-repere);
		letter-spacing: var(--approche-repere);
		text-transform: uppercase;
		color: var(--tampon);
	}

	/* Corps : une ligne de registre par Serment */
	.serment {
		display: grid;
		grid-template-columns: minmax(0, 200px) minmax(0, 1fr) auto var(--ligne);
		column-gap: 16px;
		align-items: baseline;
		min-height: calc(var(--ligne) * 2);
		padding: calc(var(--ligne) / 2) 0 calc(var(--ligne) / 2 - 1px);
		border-bottom: 1px solid var(--reglure);
		text-decoration: none;
	}
	.nom {
		font: 500 22px / var(--ligne) var(--voix);
		color: var(--encre);
		transition: color 160ms;
	}
	.arme {
		font: var(--t-liste);
		color: var(--encre-2);
	}
	.rang-serment {
		font: var(--t-repere);
		line-height: var(--ligne);
		letter-spacing: var(--approche-repere);
		text-transform: uppercase;
		white-space: nowrap;
		color: var(--tampon);
	}
	.fleche {
		justify-self: end;
		font: 400 18px / var(--ligne) var(--corps);
		color: var(--encre-2);
		transition:
			translate 200ms,
			color 160ms;
	}
	.serment:hover .nom,
	.serment:hover .fleche {
		color: var(--encre-humide);
	}
	.serment:hover .fleche {
		translate: 4px 0;
	}

	@media (max-width: 760px) {
		.serment {
			grid-template-columns: minmax(0, 1fr) auto var(--ligne);
		}
		.arme {
			grid-column: 1 / -1;
			grid-row: 2;
		}
		nav:last-child {
			border-bottom: 0;
		}
	}
</style>
