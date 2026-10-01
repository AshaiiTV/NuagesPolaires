<script lang="ts">
	// Le tampon : validation datée d'un MJ ou d'un administrateur. Le laiton n'apparaît que pour une
	// décision du staff. L'angle (± 3°) est déterminé par l'identifiant : le même tampon penche du même
	// côté sur tous les écrans.
	import type { Snippet } from 'svelte';

	interface Props {
		/** Identifiant stable dont l'angle est dérivé. */
		cle?: string;
		/** `papier` : posé sur un feuillet ivoire (accueil). */
		support?: 'page' | 'papier';
		children: Snippet;
	}
	let { cle = '', support = 'page', children }: Props = $props();

	function angle(source: string): number {
		let somme = 0;
		for (let i = 0; i < source.length; i++) somme = (somme * 31 + source.charCodeAt(i)) >>> 0;
		// Sept positions entre −3° et +3°, jamais 0 : un tampon n'est pas droit.
		const positions = [-3, -2, -1.2, 1.2, 2, 2.6, 3];
		return positions[somme % positions.length];
	}
	const rotation = $derived(angle(cle));
</script>

<span class="tampon" class:papier={support === 'papier'} style:--angle="{rotation}deg">
	{@render children()}
</span>

<style>
	.tampon {
		display: inline-block;
		padding: 3px 9px 2px;
		border: 1.5px solid currentColor;
		border-radius: 1px;
		color: var(--tampon);
		font: var(--t-repere);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		white-space: nowrap;
		rotate: var(--angle);
		/* Bord irrégulier : l'encre du tampon ne prend jamais tout à fait. */
		filter: url(#np-encre-seche);
		animation: tamponner var(--tamponner) both;
	}
	.tampon.papier {
		color: var(--papier-tampon);
	}
	@keyframes tamponner {
		from {
			translate: 0 -6px;
			opacity: 0;
		}
		to {
			translate: 0 0;
			opacity: 1;
		}
	}
</style>
