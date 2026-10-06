<script lang="ts">
	import { adresse } from '$lib/ui/adresse';
	// Feuillet ivoire posé de biais (accueil seulement, ordinateur seulement) : une page publiée.
	import type { Snippet } from 'svelte';

	interface Props {
		/** Date ou repère écrit dans la marge du feuillet. */
		marge?: string;
		titre?: string;
		href?: string;
		/** Inclinaison en degrés ; ignorée sur téléphone et sous prefers-contrast. */
		biais?: number;
		blanc?: boolean;
		children?: Snippet;
		pied?: Snippet;
	}
	let { marge, titre, href, biais = 0, blanc = false, children, pied }: Props = $props();
</script>

<article class="feuillet" class:blanc style:--biais="{biais}deg">
	{#if marge}<p class="marge">{marge}</p>{/if}
	{#if titre}
		<h3>
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- adresse résout les chemins internes et conserve les URL externes. -->
			{#if href}<a href={adresse(href)}>{titre}</a>{:else}{titre}{/if}
		</h3>
	{/if}
	{#if children}<div class="texte">{@render children()}</div>{/if}
	{#if pied}<footer>{@render pied()}</footer>{/if}
</article>

<style>
	.feuillet {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 14px;
		min-height: 252px;
		padding: 28px 28px 24px;
		background: var(--papier);
		color: var(--papier-encre);
		box-shadow: var(--ombre-feuillet);
		rotate: var(--biais);
		transition: rotate var(--tourner);
		/* Réglure du feuillet : très fine, alignée sur 28 px. */
		background-image: repeating-linear-gradient(
			to bottom,
			transparent 0 27px,
			rgb(27 42 46 / 0.07) 27px 28px
		);
		background-position: 0 14px;
	}
	.feuillet:hover,
	.feuillet:focus-within {
		rotate: 0deg;
	}
	.marge {
		font: var(--t-repere);
		letter-spacing: var(--approche-repere);
		text-transform: uppercase;
		color: var(--papier-encre-2);
	}
	h3 {
		font: 500 28px/28px var(--voix);
		letter-spacing: -0.01em;
	}
	h3 a {
		text-decoration: none;
	}
	h3 a::after {
		content: '';
		position: absolute;
		inset: 0;
	}
	.texte {
		font: 400 18px/28px var(--voix);
		color: var(--papier-encre-2);
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	footer {
		translate: 0 50%;
		margin-top: auto;
		margin-bottom: -24px;
		padding-top: 6px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.blanc {
		justify-content: center;
		align-items: center;
		text-align: center;
	}
	.blanc .texte {
		font-style: italic;
		font-size: 22px;
	}
	.feuillet :global(a:focus-visible) {
		outline-color: var(--papier-encre);
	}
	@media (max-width: 760px), (prefers-contrast: more) {
		.feuillet {
			rotate: 0deg;
		}
	}
	@media (max-width: 760px) {
		footer {
			margin-bottom: -20px;
		}
		.feuillet {
			min-height: 0;
			padding: 24px 20px 20px;
		}
	}
</style>
