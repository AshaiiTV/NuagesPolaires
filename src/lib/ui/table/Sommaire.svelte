<script lang="ts">
	import { chemin } from '$lib/ui/adresse';
	// Sommaire du cahier « La Table » : ses pages dans l'ordre de la vision (03-vision §4) —
	// Tables · Apparitions · Archives · Personnages. Une ligne de repères, jamais d'onglets.
	import { page } from '$app/state';

	interface Props {
		/** Table ouverte à rappeler en tête (« Combat »), si le MJ en conduit une. */
		combat?: { id: string; nom: string } | null;
	}
	let { combat = null }: Props = $props();

	const cheminCourant = $derived(page.url.pathname);
	const pages = $derived([
		{
			href: '/table',
			libelle: 'Tables',
			courant: cheminCourant === '/table' || cheminCourant.startsWith('/table/combat')
		},
		{
			href: '/table/apparitions',
			libelle: 'Apparitions',
			courant: cheminCourant.startsWith('/table/apparitions')
		},
		{
			href: '/table/archives',
			libelle: 'Archives',
			courant: cheminCourant.startsWith('/table/archives')
		},
		{
			href: '/table/personnages',
			libelle: 'Personnages',
			courant: cheminCourant.startsWith('/table/personnages')
		}
	]);
</script>

<nav class="sommaire" aria-label="Pages de La Table">
	<ul>
		{#each pages as p (p.href)}
			<li>
				<a
					href={chemin(p.href)}
					class:courant={p.courant}
					aria-current={p.courant ? 'page' : undefined}>{p.libelle}</a
				>
			</li>
		{/each}
		{#if combat}
			<li class="combat">
				<a href={chemin(`/table/combat/${combat.id}`)}>Reprendre « {combat.nom} »</a>
			</li>
		{/if}
	</ul>
</nav>

<style>
	.sommaire ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0 4px;
		margin-left: -12px;
	}
	a {
		position: relative;
		display: inline-flex;
		align-items: center;
		min-height: var(--cible);
		padding: 0 12px;
		font: 500 14px/24px var(--corps);
		color: var(--encre-2);
		text-decoration: none;
	}
	a:hover {
		color: var(--encre);
	}
	a.courant {
		color: var(--encre);
	}
	a.courant::after {
		content: '';
		position: absolute;
		left: 12px;
		right: 12px;
		bottom: 8px;
		height: 1px;
		background: var(--encre-humide);
	}
	.combat {
		margin-left: auto;
	}
	.combat a {
		color: var(--encre-humide);
	}
	@media (max-width: 760px) {
		ul {
			gap: 0;
		}
		a {
			padding: 0 8px;
		}
		a.courant::after {
			left: 10px;
			right: 10px;
		}
		.combat {
			margin-left: 0;
		}
	}
</style>
