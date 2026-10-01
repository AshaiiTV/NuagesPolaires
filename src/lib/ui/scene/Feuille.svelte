<script lang="ts" module>
	// Bord supérieur dentelé du feuillet volant : un `clip-path` statique, seule marque de papier du
	// régime scène (03-vision §3). Quarante-huit dents de 6 px, calculées une fois.
	const DENTS = 48;
	const points: string[] = ['0 6px'];
	for (let i = 1; i < DENTS * 2; i++) {
		points.push(`${((i * 100) / (DENTS * 2)).toFixed(3)}% ${i % 2 ? '0' : '6px'}`);
	}
	points.push('100% 6px', '100% 100%', '0 100%');
	export const DENTELURE = `polygon(${points.join(', ')})`;
</script>

<script lang="ts">
	// Le feuillet du régime scène (En scène, la Table vue par un joueur) : une colonne sans matière,
	// une bande de contexte ancrée en haut (« SCÈNE · #salon · 21:42 »), une barre de 56 px ancrée en
	// bas (« Règle » · « Copier pour Discord » · « Reposer »), et une seule carte ouverte à la fois
	// au-dessus de la barre (jamais une modale). Téléphone d'abord : 390 px, une main.
	// Ordinateur : `volant` = colonne de 420 px posée à droite du bureau nu (ou à gauche) ;
	// `centre` = colonne centrée de 640 px (la Table).
	import type { Snippet } from 'svelte';

	interface Props {
		disposition?: 'volant' | 'centre';
		/** Feuillet posé à gauche du bureau (ordinateur seulement). */
		gauche?: boolean;
		/** Contenu de la bande de contexte (24 px, ancrée en haut). */
		bande: Snippet;
		children: Snippet;
		/** Les trois gestes de la barre basse. */
		barre: Snippet;
		/** Libellé de la barre pour les lecteurs d'écran. */
		etiquetteBarre?: string;
		/** Carte ouverte au-dessus de la barre (règle, reposer), ou rien. */
		panneau?: Snippet | null;
		/** Note de marge posée juste au-dessus de la barre (copie, réseau). */
		note?: Snippet | null;
	}
	let {
		disposition = 'volant',
		gauche = false,
		bande,
		children,
		barre,
		etiquetteBarre = 'Gestes du feuillet',
		panneau = null,
		note = null
	}: Props = $props();
</script>

<div class="feuille {disposition}" class:gauche style:--dentelure={DENTELURE}>
	<div class="papier">
		<div class="bande chiffres">{@render bande()}</div>
		<div class="contenu">{@render children()}</div>
	</div>
	{#if panneau}
		<div class="panneau">{@render panneau()}</div>
	{/if}
	{#if note}
		<div class="note-barre">{@render note()}</div>
	{/if}
	<nav class="barre" aria-label={etiquetteBarre}>{@render barre()}</nav>
</div>

<style>
	.feuille {
		position: relative;
		animation: resserrer 240ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
	}
	/* Le carnet se resserre : la colonne arrive de 24 px et prend sa place (un cas de « tourner »). */
	@keyframes resserrer {
		from {
			opacity: 0;
			translate: 24px 0;
		}
		to {
			opacity: 1;
			translate: 0 0;
		}
	}
	.gauche {
		animation-name: resserrer-gauche;
	}
	@keyframes resserrer-gauche {
		from {
			opacity: 0;
			translate: -24px 0;
		}
		to {
			opacity: 1;
			translate: 0 0;
		}
	}

	.papier {
		position: relative;
		padding-top: 6px;
		background: var(--page-2);
		clip-path: var(--dentelure);
	}

	/* ── Bande de contexte : 24 px, ancrée en haut ── */
	.bande {
		position: sticky;
		z-index: 3;
		top: 0;
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 24px;
		padding: 0 12px;
		background: var(--page-2);
		border-bottom: 1px solid var(--filet);
		font: 500 12px/24px var(--corps);
		color: var(--encre-2);
	}
	.contenu {
		padding: 12px 12px 24px;
	}

	/* ── Barre basse : trois gestes, 56 px ── */
	.barre {
		z-index: 4;
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: 1fr;
		min-height: 56px;
		background: var(--page-2);
		border-top: 1px solid var(--reglure);
	}
	.barre :global(:is(a, button)) {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-height: 56px;
		padding: 4px 8px;
		border: 0;
		border-left: 1px solid var(--filet);
		background: none;
		font: 600 13px/16px var(--corps);
		color: var(--encre);
		text-align: center;
		text-decoration: none;
		cursor: pointer;
	}
	.barre :global(:is(a, button):first-child) {
		border-left: 0;
	}
	.barre :global(:is(a, button):hover) {
		background: color-mix(in srgb, var(--encre-humide) 7%, transparent);
	}
	.barre :global(:is(a, button):focus-visible) {
		outline-offset: -4px;
	}
	/* Geste ouvert : un trait de ruban, comme l'onglet courant de la bande basse. */
	.barre :global([aria-expanded='true'])::before {
		content: '';
		position: absolute;
		top: -1px;
		left: 24%;
		right: 24%;
		height: 2px;
		background: var(--ruban);
	}

	/* ── Carte ouverte au-dessus de la barre (une seule) ── */
	.panneau {
		z-index: 5;
		overflow-y: auto;
		overscroll-behavior: contain;
		background: var(--page-2);
		border-top: 1px solid var(--reglure);
		box-shadow: var(--ombre-feuillet);
	}
	.note-barre {
		z-index: 5;
		padding: 0 12px;
		background: var(--page-2);
		border-top: 1px solid var(--filet);
	}

	/* ── Téléphone : la colonne prend l'écran, bande et barre ancrées ── */
	@media (max-width: 760px) {
		.papier {
			min-height: 100svh;
		}
		.contenu {
			padding-bottom: calc(56px + env(safe-area-inset-bottom) + 48px);
		}
		.barre {
			position: fixed;
			inset: auto 0 0 0;
			padding-bottom: env(safe-area-inset-bottom);
		}
		.panneau,
		.note-barre {
			position: fixed;
			left: 0;
			right: 0;
			bottom: calc(56px + env(safe-area-inset-bottom));
		}
		.panneau {
			max-height: 72svh;
		}
	}

	/* ── Ordinateur : feuillet volant de 420 px posé sur le bureau nu ── */
	@media (min-width: 761px) {
		.volant {
			position: fixed;
			z-index: 6;
			top: 24px;
			bottom: 0;
			right: 32px;
			display: flex;
			flex-direction: column;
			width: 420px;
			filter: drop-shadow(var(--ombre-feuillet));
		}
		.volant.gauche {
			right: auto;
			left: 32px;
		}
		.volant .papier {
			flex: 1;
			min-height: 0;
			overflow-y: auto;
			overscroll-behavior: contain;
		}
		.volant .panneau,
		.volant .note-barre {
			position: absolute;
			left: 0;
			right: 0;
			bottom: 56px;
		}
		.volant .panneau {
			max-height: 72%;
		}

		/* La Table : colonne centrée de 640 px, barre collée au bas de la fenêtre. */
		.centre {
			filter: drop-shadow(var(--ombre-feuillet));
		}
		.centre .papier {
			min-height: calc(100svh - 48px - 56px);
		}
		.centre .barre {
			position: sticky;
			bottom: 0;
		}
		.centre .panneau,
		.centre .note-barre {
			position: sticky;
			bottom: 56px;
		}
		.centre .panneau {
			max-height: 60svh;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.feuille {
			animation: fondu 120ms both;
		}
		@keyframes fondu {
			from {
				opacity: 0;
			}
		}
	}
</style>
