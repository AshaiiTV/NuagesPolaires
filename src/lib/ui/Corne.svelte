<script lang="ts">
	import { adresse } from '$lib/ui/adresse';
	// Une ligne de « Dernières pages ». La corne (coin plié) marque une page écrite depuis ta dernière
	// lecture ; elle se déplie quand on l'ouvre. Jamais de nombre.
	import type { Snippet } from 'svelte';

	interface Props {
		href: string;
		cornee?: boolean;
		/** Date ou heure, écrite en marge de la ligne. */
		date?: string;
		children: Snippet;
	}
	let { href, cornee = false, date, children }: Props = $props();
</script>

<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- adresse résout les chemins internes et conserve les URL externes. -->
<a class="ligne" class:cornee href={adresse(href)}>
	{#if date}<span class="date">{date}</span>{/if}
	<span class="texte">{@render children()}</span>
	{#if cornee}<span class="corne" aria-hidden="true"></span><span class="sr-only"
			>— page non lue</span
		>{/if}
</a>

<style>
	.ligne {
		position: relative;
		display: grid;
		grid-template-columns: 7.5em 1fr;
		gap: 0 16px;
		align-items: baseline;
		min-height: calc(var(--ligne) * 2);
		padding: calc(var(--ligne) / 2) 28px calc(var(--ligne) / 2) 0;
		border-bottom: 1px solid var(--reglure);
		font: var(--t-liste);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
		text-decoration: none;
	}
	.ligne:hover .texte,
	.cornee .texte {
		color: var(--encre);
	}
	.date {
		font: var(--t-repere);
		font-variant-numeric: lining-nums tabular-nums;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--encre-grise);
	}
	.corne {
		position: absolute;
		top: 0;
		right: 0;
		width: 0;
		height: 0;
		border-style: solid;
		border-width: 0 14px 14px 0;
		border-color: transparent var(--encre) transparent transparent;
		filter: drop-shadow(-1px 1px 0 rgb(0 0 0 / 0.25));
		transition: border-width 90ms linear;
	}
	.ligne:active .corne {
		border-width: 0;
	}
	@media (max-width: 760px) {
		.ligne {
			grid-template-columns: 1fr;
		}
	}
</style>
