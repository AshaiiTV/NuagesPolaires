<script lang="ts">
	// Le règlement, lu avant l'inscription : même mise en page que les pages de lecture de L'univers
	// (src/routes/univers/Lecture.svelte), dont l'API impose son repère, son titre et son pied
	// « Tourner ». Le HTML est préparé côté serveur par `preparer()` de univers/lecture.ts, à partir de
	// `renderMarkdown` (balises brutes de la source échappées).
	let { html }: { html: string } = $props();
</script>

<div class="lecture">
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- HTML issu de renderMarkdown puis preparer() -->
	{@html html}
</div>

<style>
	.lecture {
		min-width: 0;
		overflow-wrap: break-word;
		font: var(--t-corps);
		color: var(--encre);
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
	.lecture :global(a) {
		color: var(--encre);
		text-decoration: underline;
	}
	.lecture :global(hr) {
		height: 1px;
		margin: calc(var(--ligne) * 2 - 1px) 0 calc(var(--ligne) * 2);
		border: 0;
		background: var(--reglure);
	}
	/* Chapitre : deux lignes de réglure, numéro en laiton, filet dessous. */
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
	.lecture :global(h2 .romain) {
		font: 500 22px / var(--ligne) var(--voix);
		letter-spacing: 0.04em;
	}
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
	.lecture :global(.signe) {
		flex: none;
		width: var(--ligne);
		font: 400 16px / var(--ligne) var(--corps);
		text-align: center;
	}
	.lecture :global(li) {
		position: relative;
		padding-left: 20px;
		font: var(--t-liste);
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
	/* Tableaux : capitales espacées, lignes sur la réglure, défilement dans leur cadre. */
	.lecture :global(.tableau) {
		max-width: 100%;
		margin: 0 0 var(--ligne);
		overflow-x: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--reglure) transparent;
	}
	.lecture :global(table) {
		width: 100%;
		border-collapse: collapse;
		font: var(--t-liste);
	}
	.lecture :global(th),
	.lecture :global(td) {
		padding: calc(var(--ligne) / 2) 16px calc(var(--ligne) / 2 - 1px) 0;
		border-bottom: 1px solid var(--reglure);
		text-align: left;
		vertical-align: top;
		color: var(--encre-2);
	}
	.lecture :global(td:first-child) {
		color: var(--encre);
	}
	.lecture :global(th) {
		font: var(--t-repere);
		line-height: var(--ligne);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		white-space: nowrap;
	}
	@media (max-width: 760px) {
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
		.lecture :global(.tableau) {
			max-width: none;
			margin-right: calc(var(--gouttiere) * -1);
			padding-right: var(--gouttiere);
		}
	}
</style>
