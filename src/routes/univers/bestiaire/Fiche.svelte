<script lang="ts">
	// La fiche publique est aussi la référence de l’aperçu dans l’Atelier.
	import Losange from '$lib/ui/Losange.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import Portrait from '$lib/ui/Portrait.svelte';
	import { nomZone } from './affichage';
	import type { BeastView } from '$lib/schemas/beasts';
	let { beast, portrait = true }: { beast: BeastView; portrait?: boolean } = $props();
	const lignes = $derived([
		{ titre: 'Frappe', texte: beast.strike },
		{ titre: 'Compétence', texte: beast.skill },
		{ titre: 'Butin', texte: beast.drops },
		{ titre: 'Drop de gemme', texte: beast.gem }
	]);
</script>

<div class="fiche">
	{#if portrait && beast.imageUrl}<div class="image-publiee">
			{#key beast.imageUrl}<Portrait nom={beast.name} src={beast.imageUrl} taille={320} />{/key}
		</div>{/if}
	{#if beast.subtitle}<p class="sous-titre">{beast.subtitle}</p>{/if}
	<div class="reperes">
		<Losange
			couleur={beast.behaviorColor}
			libelle={beast.behavior}
		/>{#each beast.zones as zone}<span>{nomZone(zone.name)}</span>{/each}
	</div>
	{#if beast.quote}<blockquote class="voix">« {beast.quote} »</blockquote>{/if}
	{#if beast.description}<p class="description">{beast.description}</p>{:else}<Vide
			>La description reste à écrire.</Vide
		>{/if}
	<p class="ressources chiffres">Niveau {beast.level} · PV {beast.pv} · EP {beast.ep}</p>
	<dl>
		{#each lignes as ligne}<div class="ligne">
				<dt>{ligne.titre}</dt>
				<dd>
					{#if ligne.texte}{ligne.texte}{:else}<span class="blanc">Cette ligne reste à écrire.</span
						>{/if}
				</dd>
			</div>{/each}
	</dl>
</div>

<style>
	.fiche {
		overflow-wrap: anywhere;
	}
	.image-publiee {
		width: min(100%, 320px);
		aspect-ratio: 1;
		margin-bottom: var(--ligne);
	}
	.image-publiee :global(.portrait) {
		width: 100%;
		height: 100%;
	}
	.sous-titre {
		font: var(--t-recit);
		margin-bottom: calc(var(--ligne) / 2);
	}
	.reperes {
		display: flex;
		flex-wrap: wrap;
		gap: 0 16px;
		font: var(--t-libelle);
		line-height: var(--ligne);
		color: var(--encre-2);
	}
	blockquote {
		padding-left: 20px;
		border-left: 1px solid var(--reglure);
		margin-top: var(--ligne);
	}
	.description {
		white-space: pre-line;
		margin-top: var(--ligne);
	}
	.ressources {
		border-block: 1px solid var(--reglure);
		padding: calc(var(--ligne) / 2) 0;
		margin-top: var(--ligne);
		font: var(--t-libelle);
		line-height: var(--ligne);
	}
	.ligne {
		display: grid;
		grid-template-columns: 140px minmax(0, 1fr);
		gap: 16px;
		border-bottom: 1px solid var(--reglure);
		padding: calc(var(--ligne) / 2) 0;
	}
	dt {
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	dd {
		white-space: pre-line;
	}
	.blanc {
		color: var(--encre-2);
		font: var(--t-libelle);
	}
	@media (max-width: 760px) {
		.ligne {
			grid-template-columns: minmax(0, 1fr);
			gap: 0;
		}
	}
</style>
