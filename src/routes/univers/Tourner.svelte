<script lang="ts">
	// Pied de page « Tourner » : la page d'avant à gauche, la suivante à droite.
	// Entre Serments, les flèches du clavier tournent aussi la page.
	import { goto } from '$app/navigation';
	type Voisine = { href: string; title: string };
	let {
		previous,
		next,
		serments = false
	}: { previous?: Voisine | null; next?: Voisine | null; serments?: boolean } = $props();
	const quoi = $derived(serments ? 'Serment' : 'Page');
	function turn(event: KeyboardEvent) {
		if (
			!serments ||
			event.defaultPrevented ||
			event.altKey ||
			event.ctrlKey ||
			event.metaKey ||
			event.shiftKey
		)
			return;
		const target = event.target;
		if (
			target instanceof HTMLElement &&
			target.closest(
				'input, textarea, select, button, a, summary, [contenteditable="true"], [role="region"]'
			)
		)
			return;
		const destination =
			event.key === 'ArrowLeft' ? previous : event.key === 'ArrowRight' ? next : null;
		if (destination) {
			event.preventDefault();
			void goto(destination.href);
		}
	}
</script>

<svelte:window onkeydown={turn} />

<nav class="tourner" aria-label="Tourner la page">
	{#if previous}
		<a class="precedente" href={previous.href} rel="prev">
			<span class="sens repere">
				<span class="fleche" aria-hidden="true">←</span>
				<span><span class="quoi">{quoi}</span>{serments ? 'précédent' : 'précédente'}</span>
			</span>
			<span class="voisine">{previous.title}</span>
		</a>
	{/if}
	{#if next}
		<a class="suivante" href={next.href} rel="next">
			<span class="sens repere">
				<span><span class="quoi">{quoi}</span>{serments ? 'suivant' : 'suivante'}</span>
				<span class="fleche" aria-hidden="true">→</span>
			</span>
			<span class="voisine">{next.title}</span>
		</a>
	{/if}
</nav>

<style>
	.tourner {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		column-gap: var(--gouttiere);
	}
	a {
		display: flex;
		flex-direction: column;
		min-height: calc(var(--ligne) * 2);
		text-decoration: none;
	}
	.precedente {
		grid-column: 1;
	}
	.suivante {
		grid-column: 2;
		align-items: flex-end;
		text-align: right;
	}
	.sens {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		line-height: var(--ligne);
	}
	.quoi {
		margin-right: 0.5em;
	}
	.fleche {
		font: 400 16px/1 var(--corps);
		letter-spacing: 0;
		color: var(--encre-humide);
		transition: translate 200ms;
	}
	.voisine {
		font: 500 22px / var(--ligne) var(--voix);
		color: var(--encre);
		text-wrap: balance;
		transition: color 160ms;
	}
	a:hover .voisine {
		color: var(--encre-humide);
	}
	.suivante:hover .fleche {
		translate: 4px 0;
	}
	.precedente:hover .fleche {
		translate: -4px 0;
	}
	/* Sur téléphone, « Précédent » et « Suivant » suffisent : le libellé tient sur une ligne. */
	@media (max-width: 760px) {
		.quoi {
			position: absolute;
			width: 1px;
			height: 1px;
			margin: -1px;
			overflow: hidden;
			clip: rect(0 0 0 0);
			white-space: nowrap;
		}
	}
</style>
