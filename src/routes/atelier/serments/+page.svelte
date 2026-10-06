<script lang="ts">
	import { chemin } from '$lib/ui/adresse';
	import Sceau from '$lib/ui/Sceau.svelte';
	import PageAtelier from '../PageAtelier.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import { PUBLIC_RANKS } from '$lib/game/oaths';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<svelte:head><title>Serments — L’Atelier</title></svelte:head>
<PageAtelier titre="Les Serments" serments>
	<NoteDeMarge
		>Modifier un Serment change la fiche de ses porteurs à leur prochaine ouverture.</NoteDeMarge
	>
	<div class="gestes">
		<Bouton variante="ruban" href="/atelier/serments/nouveau" fleche="→">Nouveau Serment</Bouton
		><Bouton variante="texte" href="/univers/serments" fleche="→">Lire les Serments</Bouton>
	</div>
	{#if !data.oaths.length}<Vide>Les Serments restent à écrire.</Vide>{:else}<ul class="lignes">
			{#each data.oaths as oath, index (index)}<li>
					<a class="ligne-lien" href={chemin(`/atelier/serments/${oath.id}`)}>
						<span class="nom"><Sceau serment={oath.name} taille={28} nu />{oath.name}</span><span
							>{oath.weapon}</span
						><span>{oath.rankLabel}</span><span aria-hidden="true">→</span>
						<span class="meta"
							>{#if !oath.reserved?.isBuiltin}<span>écrit dans l’Atelier</span
								>{/if}{#if oath.reserved?.hidden}<span class="marque">masqué</span
								>{/if}{#if !PUBLIC_RANKS.includes(oath.rank)}<span class="marque">hors vitrine</span
								>{/if}</span
						>
					</a>
				</li>{/each}
		</ul>{/if}
</PageAtelier>

<style>
	.nom {
		display: flex;
		align-items: center;
		gap: 12px;
		color: var(--encre-2);
	}
	.ligne-lien > span {
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.meta {
		grid-column: 1 / -1;
	}
	@media (max-width: 760px) {
		:global(.atelier) .ligne-lien {
			grid-template-columns: minmax(0, 1fr) auto;
		}
		.ligne-lien > span:nth-child(2) {
			grid-column: 1 / -1;
			grid-row: 2;
			color: var(--encre-2);
		}
		.ligne-lien > span:nth-child(3) {
			grid-column: 1;
			grid-row: 3;
		}
		.ligne-lien > span:nth-child(4) {
			grid-column: 2;
			grid-row: 1;
		}
	}
</style>
