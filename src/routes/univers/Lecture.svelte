<script lang="ts">
	// Une page de lecture de L'univers : résumé et sommaire en marge, texte à largeur de lecture,
	// chapitres numérotés, tableaux sur la réglure, pied « Tourner ».
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import Page from '$lib/ui/Page.svelte';
	import Depliant from './Depliant.svelte';
	import Sommaire from './Sommaire.svelte';
	import Tourner from './Tourner.svelte';
	import { titreEnVoix, typo } from './typo';
	import type { Lecture } from './lecture';

	type Voisine = { href: string; title: string };
	let {
		slug,
		titre: titrePage,
		resume: resumeSource,
		lecture,
		previous,
		next
	}: {
		slug: string;
		titre: string;
		resume: string;
		/** Texte déjà mis en page côté serveur (`charger.ts`). */
		lecture: Lecture;
		previous: Voisine | null;
		next: Voisine | null;
	} = $props();

	const titre = $derived(titreEnVoix(titrePage));
	const resume = $derived(typo(resumeSource));
	// Le résumé se lit en marge, sauf s'il ouvre déjà le texte.
	const enMarge = $derived(!lecture.resumeDansCorps);

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
	<title>{typo(titrePage).replace(/\.$/, '')} — Nuages Polaires</title>
	<meta name="description" content={resume} />
</svelte:head>

<Page repere="NP / 05 — L’univers" titre={titre.debut} titreVoix={titre.voix} grain>
	{#snippet marge()}
		{#if slug === 'systeme'}<NoteDeMarge
				>Valeurs appliquées à la Table : voir la règle sous le pouce</NoteDeMarge
			>{/if}
		{#if enMarge}<p class="voix">{resume}</p>{/if}
		{#if lecture.entrees.length}
			<div class="sommaire" class:seul={!enMarge}><Sommaire sections={lecture.entrees} /></div>
		{/if}
	{/snippet}
	{#snippet bande()}
		{#if enMarge}<p class="voix chapeau">{resume}</p>{/if}
		{#if lecture.entrees.length}
			<Depliant libelle="Sommaire"><Sommaire sections={lecture.entrees} /></Depliant>
		{/if}
	{/snippet}
	<div class="lecture" bind:this={corps} class:recit={slug === 'synopsis'}>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- HTML issu de renderMarkdown : les balises brutes de la source y sont échappées -->
		{@html lecture.html}
	</div>
	{#snippet pied()}
		{#if slug === 'systeme'}<div class="annotation-systeme">
				<NoteDeMarge>Valeurs appliquées à la Table : voir la règle sous le pouce</NoteDeMarge>
			</div>{/if}<Tourner {previous} {next} />{/snippet}
</Page>

<style>
	.lecture :global(li.comportement) {
		list-style: none;
	}
	.lecture :global(li.comportement)::before {
		display: none;
	}
	.lecture :global(li.comportement .signe) {
		position: absolute;
		left: 2px;
		top: 12px;
	}
	.annotation-systeme {
		display: none;
	}
	@media (max-width: 760px) {
		.annotation-systeme {
			display: block;
		}
	}
	.lecture :global(td:nth-child(2)),
	.lecture :global(td:nth-child(3)) {
		white-space: nowrap;
	}
	/* Le sommaire collant commence vers 200 px du haut de la fenêtre : huit lignes de réserve
	   lui laissent toute la hauteur restante, moins une ligne de marge basse. */
	.sommaire {
		--sommaire-reserve: calc(var(--ligne) * 8);
		margin-top: var(--ligne);
		padding-top: calc(var(--ligne) / 2);
		border-top: 1px solid var(--reglure);
	}
	.sommaire.seul {
		margin-top: 0;
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
	/* Un chapitre qui ouvre la page garde deux lignes de réglure sous le titre. */
	.lecture > :global(h2:first-child) {
		margin-top: var(--ligne);
	}
	/* Avis de la source (« ⚠ ») : un filet rouille en marge, sans pictogramme. */
	.lecture :global(.avis) {
		padding-left: 20px;
		border-left: 1px solid var(--rouille);
		color: var(--encre-2);
	}
	.lecture :global(.avis + .avis) {
		margin-top: calc(var(--ligne) / -2);
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

	/* Chapitre : deux lignes de réglure, numéro à gauche, filet dessous. */
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
		color: var(--encre-2);
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
	/* Là où la source posait un pictogramme : un losange, à sa couleur de sens s'il en a une. */
	.lecture :global(.signe) {
		flex: none;
		display: inline-block;
		width: 5px;
		height: 5px;
		rotate: 45deg;
		background: var(--teinte, var(--encre-grise));
	}
	.lecture :global(h3 .signe),
	.lecture :global(h4 .signe) {
		align-self: center;
		margin-left: 2px;
	}
	.lecture :global(td .signe) {
		margin: 0 10px 3px 2px;
		vertical-align: middle;
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

	/* Première colonne courte : sa largeur naturelle, pour que des tableaux frères partagent
	   le même axe et qu'une fourchette (« 66–100 % ») ne se coupe pas. */
	@media (min-width: 761px) {
		.lecture :global(.tableau.axe thead th:first-child),
		.lecture :global(.tableau.axe td:first-child) {
			width: 1%;
			padding-right: 24px;
			white-space: nowrap;
		}
	}

	@media (max-width: 760px) {
		/* Numéro au-dessus du titre. */
		.lecture :global(h2) {
			display: block;
		}
		.lecture :global(h2 .numero) {
			display: block;
			line-height: var(--ligne);
		}
		/* Trois colonnes et moins tiennent dans la page : les en-têtes passent à la ligne. */
		.lecture :global(th),
		.lecture :global(td) {
			padding-right: 12px;
		}
		.lecture :global(thead th) {
			height: calc(var(--ligne) * 2);
			padding-top: 0;
			line-height: calc(var(--ligne) / 2);
			white-space: normal;
			vertical-align: bottom;
		}

		/* Quatre colonnes et plus : chaque ligne du tableau devient une ligne de carnet. */
		.lecture :global(.tableau[data-pile]) {
			border-top: 1px solid var(--reglure);
		}
		.lecture :global([data-pile] table),
		.lecture :global([data-pile] tbody),
		.lecture :global([data-pile] td) {
			display: block;
		}
		.lecture :global([data-pile] thead) {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip: rect(0 0 0 0);
		}
		.lecture :global([data-pile] tr) {
			display: grid;
			column-gap: 12px;
			padding: calc(var(--ligne) / 2 - 1px) 0 calc(var(--ligne) / 2);
			border-bottom: 1px solid var(--reglure);
		}
		.lecture :global([data-pile] td),
		.lecture :global([data-pile] tr.rubrique th) {
			padding: 0;
			border: 0;
		}
		.lecture :global([data-pile] tr.rubrique) {
			display: block;
			padding-top: var(--ligne);
		}
		.lecture :global([data-pile] tr.rubrique th) {
			display: block;
		}
		/* Fiche : le nom et ses deux valeurs sur une ligne, la description dessous. */
		.lecture :global([data-pile='fiche'] tr) {
			grid-template-columns: minmax(0, 1fr) auto auto;
		}
		.lecture :global([data-pile='fiche'] td:first-child) {
			font-weight: 500;
		}
		.lecture :global([data-pile='fiche'] td:last-child) {
			grid-column: 1 / -1;
		}
		/* Liste : chaque valeur précédée du libellé de sa colonne, deux par ligne. */
		.lecture :global([data-pile='liste'] tr) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			column-gap: var(--ligne);
		}
		.lecture :global([data-pile='liste'] td) {
			display: flex;
			align-items: baseline;
			justify-content: space-between;
			gap: 8px;
			color: var(--encre);
		}
		.lecture :global([data-pile='liste'] td)::before {
			content: attr(data-label);
			font: var(--t-repere);
			line-height: var(--ligne);
			letter-spacing: 0.1em;
			text-transform: uppercase;
			color: var(--encre-2);
		}
		.lecture :global([data-pile='liste'] td:first-child),
		.lecture :global([data-pile='liste'] td.long) {
			grid-column: 1 / -1;
		}
		.lecture :global([data-pile='liste'] td:first-child) {
			font-weight: 500;
		}
	}
</style>
