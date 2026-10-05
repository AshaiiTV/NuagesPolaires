<script lang="ts">
	import { chemin } from '$lib/ui/adresse';
	// Une page du Registre : la page du carnet en régime serré, avec la sous-navigation du cahier
	// (Ce qui attend · Comptes et liaisons · Thèmes · Journal d'audit · Données) dans la marge sur
	// ordinateur et dans la bande sous le titre sur téléphone.
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import Page from '$lib/ui/Page.svelte';

	interface Props {
		titre: string;
		titreVoix?: string;
		reglure?: boolean;
		/** Repères ajoutés sous la sous-navigation (relevé, rappel). */
		reperes?: Snippet;
		children: Snippet;
		pied?: Snippet;
	}
	let { titre, titreVoix, reglure = false, reperes, children, pied }: Props = $props();

	const PAGES = [
		{ href: '/registre', libelle: 'Ce qui attend' },
		{ href: '/registre/comptes', libelle: 'Comptes et liaisons' },
		{ href: '/registre/themes', libelle: 'Thèmes' },
		{ href: '/registre/journal', libelle: 'Journal d’audit' },
		{ href: '/registre/donnees', libelle: 'Données' }
	];
	const cheminCourant = $derived(page.url.pathname);
	const courante = (href: string) =>
		href === '/registre'
			? cheminCourant === href
			: cheminCourant === href || cheminCourant.startsWith(href + '/');
</script>

{#snippet sommaire()}
	<nav class="sommaire" aria-label="Pages du Registre">
		<ul>
			{#each PAGES as p, i (p.href)}
				<li>
					<a
						href={chemin(p.href)}
						class:courant={courante(p.href)}
						aria-current={courante(p.href) ? 'page' : undefined}
					>
						<span class="numero chiffres" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span
						>{p.libelle}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
{/snippet}

<div class="registre">
	<Page repere="NP / 09 — Le Registre" {titre} {titreVoix} {reglure} {pied}>
		{#snippet marge()}
			{@render sommaire()}
			{#if reperes}<div class="reperes">{@render reperes()}</div>{/if}
		{/snippet}
		{#snippet bande()}
			{@render sommaire()}
			{#if reperes}<div class="reperes">{@render reperes()}</div>{/if}
		{/snippet}
		{@render children()}
	</Page>
</div>

<style>
	/* Une page courte ne s'étire pas : la marge reste collée au titre (la page du carnet a une hauteur
	   minimale, ses rangées ne doivent pas se répartir le vide). */
	.registre :global(.page) {
		align-content: start;
	}
	.sommaire {
		width: 100%;
	}
	.sommaire ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0 4px;
		border-bottom: 1px solid var(--reglure);
	}
	.sommaire a {
		position: relative;
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: calc(var(--ligne) * 2);
		padding: 0 16px 0 0;
		margin-right: 12px;
		font: 500 14px/24px var(--corps);
		color: var(--encre-2);
		text-decoration: none;
		transition: color 160ms;
	}
	.sommaire a:hover {
		color: var(--encre);
	}
	.sommaire a.courant {
		color: var(--encre);
	}
	/* L'onglet courant : un trait d'encre posé sur le filet, comme le ruban de la bande basse. */
	.sommaire a.courant::after {
		content: '';
		position: absolute;
		left: 0;
		right: 16px;
		bottom: -1px;
		height: 2px;
		background: var(--encre-humide);
	}
	.numero {
		font: var(--t-repere);
		letter-spacing: 0.12em;
		color: var(--encre-2);
	}
	.reperes {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 24px;
		padding-top: 12px;
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	@media (max-width: 760px) {
		.sommaire ul {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 0 12px;
			border-bottom: 0;
		}
		.sommaire li {
			border-bottom: 1px solid var(--reglure);
		}
		.sommaire a {
			min-height: var(--cible);
			margin: 0;
			padding: 0;
			font: var(--t-libelle);
		}
		.sommaire a.courant::after {
			right: 0;
		}
		.reperes {
			padding-top: 8px;
		}
	}
</style>
