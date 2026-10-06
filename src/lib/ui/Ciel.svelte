<!--
	Le ciel : l'horizon de l'accueil reste derrière toutes les pages, assombri par un voile de la
	couleur du bureau (un thème le teinte donc avec lui). La page se pose dessus comme une vitre
	(voir Page.svelte). Absent en régime scène (le feuillet est une page nue) et à l'impression.
-->
<div class="ciel" aria-hidden="true"></div>

<style>
	.ciel {
		position: fixed;
		inset: 0;
		z-index: -1;
		background: var(--bureau) url('/images/nuages-polaires-horizon.jpg') center 30% / cover
			no-repeat;
		pointer-events: none;
	}
	.ciel::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--bureau) 58%, transparent) 0%,
			color-mix(in srgb, var(--bureau) 86%, transparent) 46%,
			var(--bureau) 100%
		);
	}
	:global(body:has([data-regime='scene'])) .ciel {
		display: none;
	}
	@media print {
		.ciel {
			display: none;
		}
	}
	@media (prefers-reduced-transparency: reduce) {
		.ciel {
			display: none;
		}
	}
</style>
