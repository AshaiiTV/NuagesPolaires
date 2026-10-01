<script lang="ts">
	// Colonne droite de la Table du MJ : Journal du combat (le journal du moteur, sans pictogramme,
	// le plus récent en bas), Règle (la même carte que sous le pouce du joueur : ruleCardFor) et Notes
	// du MJ (réglure visible, encre laiton ; elles ne quittent jamais la Table). 03-vision §5.8.
	import { tick } from 'svelte';
	import { ruleCardFor, type RuleCard } from '$lib/game/rules';
	import type { TableMJ } from './table.svelte';
	import { sansEmoji } from './texte';

	interface Props {
		table: TableMJ;
		/** Partie à rendre : tout (ordinateur) ou une seule (téléphone). */
		parties?: ('journal' | 'regle' | 'notes')[];
	}
	let { table, parties = ['journal', 'regle', 'notes'] }: Props = $props();

	const log = $derived(table.etat.log.filter((e) => sansEmoji(e.text)));
	let fil = $state<HTMLElement | null>(null);
	$effect(() => {
		void log.length;
		tick().then(() => fil && (fil.scrollTop = fil.scrollHeight));
	});

	const declarant = $derived(table.declarant ? table.etat.fighters.find((f) => f.id === table.declarant) : undefined);
	const carte: RuleCard = $derived(
		ruleCardFor({
			phase: table.etat.phase,
			lowEp: declarant ? declarant.epMax > 0 && declarant.epCur / declarant.epMax < 0.2 : false
		})
	);

	let notes = $state('');
	let notesInitiales = false;
	$effect(() => {
		if (!notesInitiales) {
			notes = table.etat.notes;
			notesInitiales = true;
		}
	});
	function noter() {
		table.noter(notes);
	}
</script>

<div class="marge-table">
	{#if parties.includes('journal')}
		<section aria-labelledby="titre-journal">
			<h3 id="titre-journal" class="repere">Journal du combat</h3>
			{#if log.length}
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<ol class="journal" bind:this={fil} tabindex="0" aria-label="Journal du combat, le plus récent en bas">
					{#each log as e (e.n)}
						<li class={e.kind} class:prive={e.private}>
							{sansEmoji(e.text)}{#if e.private}<span class="sr-only"> (réservé au MJ)</span>{/if}
						</li>
					{/each}
				</ol>
			{:else}
				<p class="vide">Le journal s’écrit au démarrage.</p>
			{/if}
		</section>
	{/if}

	{#if parties.includes('regle')}
		<details class="regle">
			<summary><span class="repere">Règle</span><span class="titre-regle">{carte.title}</span></summary>
			{#if carte.id === 'actions'}
				<ul class="regles">
					{#each carte.actions.filter((a) => a.cost !== null || a.resource === null) as a (a.id)}
						<li>
							<span class="nom-regle">{a.name}</span>
							<span class="chiffres cout">{a.cost ? `${a.cost} ${a.resource?.toUpperCase()}` : 'sans coût'}</span>
							<span class="effet">{a.effect}</span>
						</li>
					{/each}
				</ul>
			{:else if carte.id === 'status'}
				<p class="texte-regle">{carte.definition.description}</p>
			{:else}
				<p class="texte-regle">{carte.text}</p>
			{/if}
			<a class="lien" href={carte.anchor}>Lire dans le Système de jeu →</a>
		</details>
	{/if}

	{#if parties.includes('notes')}
		<section class="notes" aria-labelledby="titre-notes">
			<h3 id="titre-notes" class="repere">Notes du MJ</h3>
			<label class="sr-only" for="notes-mj">Notes du MJ, jamais montrées aux joueurs</label>
			<textarea
				id="notes-mj"
				bind:value={notes}
				onblur={noter}
				onchange={noter}
				maxlength={20000}
				rows="5"
				placeholder="Ce que tu veux garder pour toi. Les joueurs ne le lisent jamais."
			></textarea>
		</section>
	{/if}
</div>

<style>
	.marge-table {
		display: grid;
		gap: 24px;
		min-width: 0;
	}
	.marge-table > :global(*) {
		min-width: 0;
	}
	.repere {
		display: flex;
		align-items: center;
		min-height: 24px;
		font: var(--t-repere);
		letter-spacing: var(--approche-repere);
		text-transform: uppercase;
		color: var(--encre-2);
	}
	h3.repere {
		margin-bottom: 0;
		padding-bottom: 0;
		border-bottom: 1px solid var(--reglure);
		line-height: 24px;
	}
	.journal {
		max-height: calc(var(--ligne) * 11);
		overflow-y: auto;
		overscroll-behavior: contain;
		padding-right: 4px;
	}
	.journal li {
		padding: 0;
		font: 500 13px/24px var(--corps);
		color: var(--encre-2);
		border-bottom: 1px solid color-mix(in srgb, var(--reglure) 60%, transparent);
		overflow-wrap: anywhere;
	}
	.journal li.round {
		font-weight: 600;
		color: var(--encre);
	}
	.journal li.damage,
	.journal li.heal,
	.journal li.spell,
	.journal li.summon {
		color: var(--encre);
	}
	.journal li.prive {
		font-style: italic;
		color: var(--encre-grise);
	}
	.vide {
		padding: 12px 0;
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.regle summary {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 44px;
		border-bottom: 1px solid var(--reglure);
		cursor: pointer;
		list-style: none;
	}
	.regle summary::-webkit-details-marker {
		display: none;
	}
	.regle summary::after {
		content: '+';
		margin-left: auto;
		font: 400 16px/1 var(--corps);
		color: var(--encre-2);
	}
	.regle[open] summary::after {
		content: '−';
	}
	.titre-regle {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font: 500 13px/24px var(--corps);
		color: var(--encre);
	}
	.regles li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0 12px;
		padding: 4px 0;
		border-bottom: 1px solid color-mix(in srgb, var(--reglure) 60%, transparent);
	}
	.nom-regle {
		font: 600 13px/24px var(--corps);
		color: var(--encre);
	}
	.cout {
		font: var(--t-libelle);
		line-height: 24px;
		color: var(--encre-2);
	}
	.effet {
		grid-column: 1 / -1;
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.texte-regle {
		padding: 8px 0;
		font: var(--t-corps);
		color: var(--encre);
	}
	.lien {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		font: var(--t-libelle);
		color: var(--encre-humide);
	}
	textarea {
		display: block;
		width: 100%;
		min-height: calc(var(--ligne) * 5);
		padding: 0;
		border: 0;
		background: repeating-linear-gradient(
			to bottom,
			transparent 0 calc(var(--ligne) - 1px),
			var(--reglure) calc(var(--ligne) - 1px) var(--ligne)
		);
		background-attachment: local;
		font: 500 14px/24px var(--corps);
		color: var(--tampon);
		resize: vertical;
	}
	textarea::placeholder {
		color: var(--encre-grise);
		font-style: italic;
	}
</style>
