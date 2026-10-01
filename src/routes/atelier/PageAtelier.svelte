<script lang="ts">
	// La sous-navigation de l’Atelier suit le rythme de celle du Registre.
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import Page from '$lib/ui/Page.svelte';
	let {
		titre,
		serments = false,
		children
	}: { titre: string; serments?: boolean; children: Snippet } = $props();
	const pages = $derived([
		{ href: '/atelier/bestiaire', libelle: 'Bestiaire' },
		...(serments ? [{ href: '/atelier/serments', libelle: 'Serments' }] : [])
	]);
</script>

{#snippet sommaire()}
	<nav class="sommaire" aria-label="Pages de l’Atelier">
		<ul>
			{#each pages as p, i}<li>
					<a
						href={p.href}
						class:courant={page.url.pathname.startsWith(p.href)}
						aria-current={page.url.pathname === p.href ? 'page' : undefined}
						><span class="numero chiffres">{String(i + 1).padStart(2, '0')}</span>{p.libelle}</a
					>
				</li>{/each}
		</ul>
	</nav>
{/snippet}
<div class="atelier">
	<Page repere="NP / 08 — L’Atelier" {titre}>
		{#snippet marge()}{@render sommaire()}{/snippet}
		{#snippet bande()}{@render sommaire()}{/snippet}
		{@render children()}
	</Page>
</div>

<style>
	.atelier :global(.page) {
		align-content: start;
	}
	.sommaire {
		width: 100%;
	}
	.sommaire ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0 24px;
		border-bottom: 1px solid var(--reglure);
	}
	.sommaire a {
		position: relative;
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: calc(var(--ligne) * 2);
		padding-right: 16px;
		font: var(--t-libelle);
		text-decoration: none;
		color: var(--encre-2);
	}
	.sommaire a.courant {
		color: var(--encre);
	}
	.sommaire a.courant::after {
		content: '';
		position: absolute;
		inset: auto 0 -1px;
		height: 2px;
		background: var(--encre-humide);
	}
	.numero {
		font: var(--t-repere);
		color: var(--encre-2);
	}
</style>
