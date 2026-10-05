<script lang="ts">
	// L'emblème de Nuages Polaires : une boussole, signature du carnet (jamais canonique dans l'univers).
	// Redessinée dans la palette Mystique polaire : anneau aurore, aiguilles ivoire, cœur laiton.
	interface Props {
		taille?: number;
		/** `discret` : trait seul, pour le fond d'un chapitre. */
		variante?: 'pleine' | 'discrete';
		titre?: string;
	}
	let { taille = 44, variante = 'pleine', titre }: Props = $props();
</script>

<svg
	class="boussole"
	class:discrete={variante === 'discrete'}
	width={taille}
	height={taille}
	viewBox="0 0 340 340"
	role={titre ? 'img' : undefined}
	aria-label={titre}
	aria-hidden={titre ? undefined : 'true'}
>
	<g transform="translate(170 170)" fill="none" stroke-linecap="round">
		<circle class="anneau" r="116" stroke-width="2" />
		<circle class="pointille" r="130" stroke-width="1.2" stroke-dasharray="6 14" />
		<path
			class="graduations"
			d="M0-134v-30M95-95l21-21M134 0h30M95 95l21 21M0 134v30M-95 95l-21 21M-134 0h-30M-95-95l-21-21"
			stroke-width="1.6"
		/>
	</g>
	<g transform="translate(170 170)">
		<path class="aiguille nord" d="M0-118 20-34 0-16-20-34z" />
		<path class="aiguille" d="M118 0 34 20 16 0 34-20z" />
		<path class="aiguille" d="M0 118 20 34 0 16-20 34z" />
		<path class="aiguille" d="M-118 0-34 20-16 0-34-20z" />
		<path
			class="diagonales"
			d="M82-82 27-17 12-12 17-27zM82 82 17 27 12 12 27 17zM-82 82-27 17-12 12-17 27zM-82-82-17-27-12-12-27-17z"
		/>
		<rect
			class="coeur"
			x="-22"
			y="-22"
			width="44"
			height="44"
			transform="rotate(45)"
			stroke-width="4"
		/>
		<rect class="eclat" x="-10" y="-10" width="20" height="20" transform="rotate(45)" />
	</g>
</svg>

<style>
	.boussole {
		flex: none;
	}
	.anneau {
		stroke: var(--encre-humide);
		opacity: 0.7;
	}
	.pointille {
		stroke: var(--encre-humide);
		opacity: 0.32;
	}
	.graduations {
		stroke: var(--encre-humide);
		opacity: 0.5;
	}
	.aiguille {
		fill: var(--encre);
		opacity: 0.86;
	}
	.aiguille.nord {
		opacity: 1;
	}
	.diagonales {
		fill: var(--encre-2);
		opacity: 0.7;
	}
	.coeur {
		fill: var(--bureau);
		stroke: var(--tampon);
	}
	.eclat {
		fill: var(--tampon);
	}
	.discrete .aiguille,
	.discrete .diagonales {
		fill: none;
		stroke: var(--encre-humide);
		stroke-width: 1.4;
		opacity: 0.45;
	}
	.discrete .coeur {
		fill: none;
		stroke-width: 2;
		opacity: 0.7;
	}
	.discrete .eclat {
		opacity: 0.8;
	}
</style>
