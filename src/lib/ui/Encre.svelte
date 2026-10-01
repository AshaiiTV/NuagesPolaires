<script lang="ts">
	// L'encre sèche : toute écriture apparaît humide (aurore) et ne devient ivoire qu'à la confirmation
	// du serveur. Refus : l'encre bave, et une note de marge dit ce qui s'est passé. Aucun message de
	// succès n'existe ; une confirmation est une date.
	import type { Snippet } from 'svelte';

	export type EtatEncre = 'humide' | 'prise' | 'refusee';
	interface Props {
		etat: EtatEncre;
		children: Snippet;
	}
	let { etat, children }: Props = $props();
</script>

<span class="encre {etat}" aria-busy={etat === 'humide' ? 'true' : undefined}>
	{@render children()}
	{#if etat === 'humide'}<span class="sr-only"> — l'encre sèche…</span>{/if}
</span>

<style>
	.encre {
		transition:
			color var(--secher),
			filter 600ms;
	}
	.humide {
		color: var(--encre-humide);
	}
	.prise {
		color: var(--encre);
	}
	.refusee {
		color: var(--rouille);
		animation: baver 600ms ease-out both;
	}
	@keyframes baver {
		from {
			filter: blur(0);
		}
		40% {
			filter: blur(1px);
		}
		to {
			filter: blur(0);
		}
	}
</style>
