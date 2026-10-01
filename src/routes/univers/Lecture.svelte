<script lang="ts">
	// Une page de lecture de L'univers : résumé et sommaire en marge, texte à largeur de lecture,
	// chapitres numérotés en laiton, tableaux sur la réglure, pied « Tourner ».
	import Page from '$lib/ui/Page.svelte';
	import Depliant from './Depliant.svelte';
	import Sommaire from './Sommaire.svelte';
	import Tourner from './Tourner.svelte';
	import { preparer } from './lecture';
	import { titreEnVoix, typo } from './typo';
	import type { Content } from '$lib/content';

	type Voisine = { href: string; title: string };
	let {
		content,
		html,
		previous,
		next
	}: { content: Content; html: string; previous: Voisine | null; next: Voisine | null } = $props();

	const titre = $derived(titreEnVoix(content.title));
	const resume = $derived(typo(content.resume));
	const lecture = $derived(preparer(html, content.title, content.resume));

	// Un tableau plus large que la page défile dans son cadre : l'ombre de bord dit de quel côté
	// il continue, et le cadre devient atteignable au clavier.
	let corps: HTMLElement | undefined = $state();
	$effect(() => {
		void lecture.html;
		if (!corps) return;
		const tableaux = [...corps.querySelectorAll<HTMLElement>('.tableau')];
		const relever = (cadre: HTMLElement) => {
			const reste = cadre.scrollWidth - cadre.clientWidth - cadre.scrollLeft;
			const defile = cadre.scrollWidth > cadre.clientWidth + 1;
			cadre.dataset.suite = [cadre.scrollLeft > 1 ? 'gauche' : '', reste > 1 ? 'droite' : '']
				.join(' ')
				.trim();
			if (defile) {
				cadre.tabIndex = 0;
				cadre.setAttribute('role', 'region');
				cadre.setAttribute('aria-label', 'Tableau, défile horizontalement');
			} else {
				cadre.removeAttribute('tabindex');
				cadre.removeAttribute('role');
				cadre.removeAttribute('aria-label');
			}
		};
		const surDefilement = (event: Event) => relever(event.currentTarget as HTMLElement);
		const observateur = new ResizeObserver((entrees) => {
			for (const entree of entrees) relever(entree.target as HTMLElement);
		});
		for (const cadre of tableaux) {
			relever(cadre);
			cadre.addEventListener('scroll', surDefilement, { passive: true });
			observateur.observe(cadre);
		}
		return () => {
			observateur.disconnect();
			for (const cadre of tableaux) cadre.removeEventListener('scroll', surDefilement);
		};
	});
</script>

<svelte:head>
	<title>{typo(content.title)} — Nuages Polaires</title>
	<meta name="description" content={content.resume} />
</svelte:head>

<Page repere="NP / 05 — L’univers" titre={titre.debut} titreVoix={titre.voix} grain>
	{#snippet marge()}
		<p class="voix">{resume}</p>
		{#if lecture.entrees.length}
			<div class="sommaire"><Sommaire sections={lecture.entrees} /></div>
		{/if}
	{/snippet}
	{#snippet bande()}
		<p class="voix chapeau">{resume}</p>
		{#if lecture.entrees.length}
			<Depliant libelle="Sommaire"><Sommaire sections={lecture.entrees} /></Depliant>
		{/if}
	{/snippet}
	<div class="lecture" bind:this={corps} class:recit={content.slug === 'synopsis'}>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- HTML issu de renderMarkdown : les balises brutes de la source y sont échappées -->
		{@html lecture.html}
	</div>
	{#snippet pied()}<Tourner {previous} {next} />{/snippet}
</Page>

<style>
	.sommaire {
		--sommaire-reserve: calc(var(--ligne) * 12);
		margin-top: var(--ligne);
		padding-top: calc(var(--ligne) / 2);
		border-top: 1px solid var(--reglure);
	}
	.chapeau {
		width: 100%;
		margin-bottom: calc(var(--ligne) / 2);
	}

	.lecture {
		min-width: 0;
		overflow-wrap: break-word;
		font: var(--t-corps);
		color: var(--encre);
	}
	.lecture.recit {
		font: var(--t-recit);
	}
	.lecture > :global(:not(.tableau)) {
		max-width: var(--lecture);
	}
	.lecture > :global(:first-child) {
		margin-top: 0;
	}
	.lecture :global(p),
	.lecture :global(ul),
	.lecture :global(ol),
	.lecture :global(blockquote) {
		margin-bottom: var(--ligne);
	}
	.lecture :global(p) {
		white-space: pre-line;
	}
	.lecture :global(strong) {
		font-weight: 600;
	}
	.lecture.recit :global(strong) {
		font-weight: 500;
	}
	.lecture :global(a) {
		color: var(--encre);
		text-decoration: underline;
	}
	.lecture :global(img) {
		max-width: 100%;
	}
	.lecture :global(pre) {
		max-width: 100%;
		overflow-x: auto;
		margin-bottom: var(--ligne);
		font: var(--t-mono);
	}
	.lecture :global(hr) {
		height: 1px;
		margin: calc(var(--ligne) * 2 - 1px) 0 calc(var(--ligne) * 2);
		border: 0;
		background: var(--reglure);
	}

	/* Chapitre : deux lignes de réglure, numéro en laiton à gauche, filet dessous. */
	.lecture :global(h2) {
		display: flex;
		align-items: baseline;
		gap: 14px;
		margin: calc(var(--ligne) * 2) 0 var(--ligne);
		padding: calc(var(--ligne) / 2) 0 calc(var(--ligne) / 2 - 1px);
		border-bottom: 1px solid var(--reglure);
		font: 500 28px / var(--ligne) var(--voix);
		letter-spacing: -0.01em;
		color: var(--encre);
		scroll-margin-top: calc(var(--ligne) * 3);
		outline: none;
	}
	.lecture :global(h2 .numero) {
		flex: none;
		font: var(--t-repere);
		letter-spacing: var(--approche-repere);
		text-transform: uppercase;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		color: var(--tampon);
	}
	/* Un chiffre romain seul s'écrit en Cormorant : à 12 px, « I » ne serait qu'un trait. */
	.lecture :global(h2 .romain) {
		font: 500 22px / var(--ligne) var(--voix);
		letter-spacing: 0.04em;
	}
	/* Phrase de chute : un dernier titre sans texte, en voix du carnet. */
	.lecture :global(h2.chute) {
		display: block;
		max-width: none;
		margin-top: calc(var(--ligne) * 2);
		margin-bottom: 0;
		padding: var(--ligne) 0 0;
		border: 0;
		border-top: 1px solid var(--reglure);
		font: italic 400 22px / var(--ligne) var(--voix);
		letter-spacing: 0;
	}

	/* Sous-chapitres */
	.lecture :global(h3),
	.lecture :global(h4) {
		display: flex;
		align-items: baseline;
		gap: 12px;
		margin: calc(var(--ligne) * 1.5) 0 calc(var(--ligne) / 2);
		color: var(--encre);
		scroll-margin-top: calc(var(--ligne) * 3);
		outline: none;
	}
	.lecture :global(h3) {
		font: 500 22px / var(--ligne) var(--voix);
	}
	.lecture :global(h4) {
		margin: var(--ligne) 0 0;
		font: 600 16px / var(--ligne) var(--corps);
	}
	.lecture :global(h2 + h3) {
		margin-top: 0;
		padding-top: calc(var(--ligne) / 2);
	}
	.lecture :global(h3 + h4) {
		margin-top: calc(var(--ligne) / 2);
	}
	.lecture :global(h3 .numero),
	.lecture :global(h4 .numero) {
		flex: none;
		font: var(--t-repere);
		letter-spacing: 0.12em;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		color: var(--encre-2);
	}
	/* Signe de la source (⚔, 🔥…) : une case fixe, alignée sur la ligne du titre. */
	.lecture :global(.signe) {
		flex: none;
		width: var(--ligne);
		font: 400 16px / var(--ligne) var(--corps);
		text-align: center;
	}
	.lecture :global(h3.signee) {
		gap: 8px;
	}

	/* Listes : losange de 4 px en puce. */
	.lecture :global(li) {
		position: relative;
		padding-left: 20px;
		font: var(--t-liste);
	}
	.lecture.recit :global(li) {
		font: var(--t-recit);
	}
	.lecture :global(li + li) {
		margin-top: calc(var(--ligne) / 2);
	}
	.lecture :global(li)::before {
		content: '';
		position: absolute;
		left: 2px;
		top: 12px;
		width: 4px;
		height: 4px;
		rotate: 45deg;
		background: var(--encre-grise);
	}

	/* Citation : la voix du carnet, un filet de marge. */
	.lecture :global(blockquote) {
		padding-left: 20px;
		border-left: 1px solid color-mix(in srgb, var(--encre-2) 40%, transparent);
		font: var(--t-recit);
		font-style: italic;
		color: var(--encre-2);
	}
	.lecture :global(blockquote p:last-child) {
		margin-bottom: 0;
	}

	/* Tableaux : en-têtes en capitales espacées, lignes sur la réglure, défilement interne. */
	.lecture :global(.tableau) {
		max-width: 100%;
		margin: 0 0 var(--ligne);
		overflow-x: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--reglure) transparent;
		/* Ombre de bord : seulement du côté où le tableau continue. */
		--ombre: color-mix(in srgb, var(--bureau) 90%, transparent);
		background:
			linear-gradient(to right, var(--ombre-gauche, transparent), transparent) left / 20px 100%
				no-repeat,
			linear-gradient(to left, var(--ombre-droite, transparent), transparent) right / 20px 100%
				no-repeat;
	}
	.lecture :global(.tableau[data-suite~='gauche']) {
		--ombre-gauche: var(--ombre);
	}
	.lecture :global(.tableau[data-suite~='droite']) {
		--ombre-droite: var(--ombre);
	}
	.lecture :global(h3 + .tableau),
	.lecture :global(h4 + .tableau) {
		margin-top: 0;
	}
	.lecture :global(table) {
		width: 100%;
		border-collapse: collapse;
		font: var(--t-liste);
		font-variant-numeric: tabular-nums;
	}
	.lecture :global(th),
	.lecture :global(td) {
		padding: calc(var(--ligne) / 2) 16px calc(var(--ligne) / 2 - 1px) 0;
		border-bottom: 1px solid var(--reglure);
		text-align: left;
		vertical-align: top;
		color: var(--encre-2);
	}
	.lecture :global(th:last-child),
	.lecture :global(td:last-child) {
		padding-right: 0;
	}
	.lecture :global(td:first-child) {
		color: var(--encre);
	}
	.lecture :global(td strong) {
		font-weight: 500;
		color: var(--encre);
	}
	.lecture :global(th) {
		font: var(--t-repere);
		line-height: var(--ligne);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		white-space: nowrap;
	}
	.lecture :global(tr.rubrique th) {
		padding-top: var(--ligne);
		color: var(--encre);
	}

	@media (max-width: 760px) {
		/* Numéro en laiton au-dessus du titre. */
		.lecture :global(h2) {
			display: block;
		}
		.lecture :global(h2 .numero) {
			display: block;
			line-height: var(--ligne);
		}
		.lecture :global(table) {
			min-width: calc(var(--colonnes, 2) * 148px);
		}
		/* Le tableau défile jusqu'au bord de l'écran. */
		.lecture :global(.tableau) {
			max-width: none;
			margin-right: calc(var(--gouttiere) * -1);
			padding-right: var(--gouttiere);
		}
	}
</style>
