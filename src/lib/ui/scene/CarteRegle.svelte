<script lang="ts">
	import { chemin } from '$lib/ui/adresse';
	// La règle sous le pouce : UNE carte, choisie par contexte (ruleCardFor de src/lib/game/rules.ts),
	// jamais une recherche (03-vision §5.3). Phase de déclaration → actions et coûts ; statut actif →
	// sa définition ; EP basse → récupération ; sinon le glossaire. Toujours « Voir dans le système de
	// jeu → ». Posée au-dessus de la barre du feuillet, refermable au clavier (Échap).
	import type { RuleCard } from '$lib/game/rules';
	import Losange from '../Losange.svelte';
	import { ancreSysteme, coutImprime, libelleSansPicto } from './regles';

	interface Props {
		carte: RuleCard;
		/** Identifiant du titre (le geste « Règle » y pose le focus). */
		id?: string;
		onfermer: () => void;
	}
	let { carte, id = 'carte-regle', onfermer }: Props = $props();

	const actions = $derived(
		carte.id === 'actions'
			? carte.actions.filter((a) => a.id !== 'passer' && a.id !== 'capacite')
			: []
	);
</script>

<section class="carte" aria-labelledby={id}>
	<header>
		<p class="repere">Règle</p>
		<h2 {id} tabindex="-1">{carte.title}</h2>
		<button type="button" class="refermer" onclick={onfermer}>Refermer</button>
	</header>

	{#if carte.id === 'actions'}
		<p class="chapeau">Valeurs appliquées à la Table.</p>
		<ul class="actions">
			{#each actions as a (a.id)}
				<li>
					<span class="mot">{libelleSansPicto(a.label)}</span>
					<span class="cout chiffres">{coutImprime(a)}</span>
					<span class="effet"
						>{a.effect}{#if a.conditions !== 'Tous'}&nbsp;·&nbsp;<em>{a.conditions}</em>{/if}</span
					>
				</li>
			{/each}
		</ul>
	{:else if carte.id === 'status'}
		<p class="statut">
			<Losange couleur={carte.definition.color} libelle={carte.definition.label} />
		</p>
		<p class="texte">{carte.definition.description}</p>
	{:else}
		<p class="texte">{carte.text}</p>
	{/if}

	<p class="lien">
		<a href={chemin(ancreSysteme(carte.anchor))}
			>Voir dans le système de jeu <span aria-hidden="true">→</span></a
		>
	</p>
</section>

<style>
	.carte {
		padding: 12px 12px 24px;
	}
	header {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		column-gap: 12px;
	}
	.repere {
		grid-column: 1;
	}
	h2 {
		grid-column: 1;
		font: 600 14px/24px var(--corps);
		color: var(--encre);
		outline: none;
	}
	.refermer {
		grid-column: 2;
		grid-row: 1 / span 2;
		min-height: var(--cible);
		padding: 0 4px 0 12px;
		border: 0;
		background: none;
		font: 500 13px/20px var(--corps);
		color: var(--encre-2);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--encre-humide) 45%, transparent);
		text-underline-offset: 4px;
	}
	.chapeau {
		margin-top: 12px;
		font: 500 13px/24px var(--corps);
		color: var(--encre-2);
	}
	.actions {
		margin-top: 0;
	}
	.actions li {
		display: grid;
		grid-template-columns: 1fr auto;
		column-gap: 12px;
		padding: 6px 0;
		border-bottom: 1px solid var(--filet);
	}
	.mot {
		font: 600 14px/24px var(--corps);
		color: var(--encre);
	}
	.cout {
		font: 500 14px/24px var(--corps);
		color: var(--encre);
		white-space: nowrap;
	}
	.effet {
		grid-column: 1 / -1;
		font: 400 13px/20px var(--corps);
		color: var(--encre-2);
	}
	.effet em {
		font-style: normal;
		color: var(--encre-grise);
	}
	.statut {
		margin-top: 12px;
	}
	.texte {
		margin-top: 12px;
		font: var(--t-corps);
		color: var(--encre);
		max-width: 46ch;
	}
	.lien {
		margin-top: 12px;
	}
	.lien a {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		min-height: var(--cible);
		font: 500 14px/20px var(--corps);
		color: var(--encre);
	}
</style>
