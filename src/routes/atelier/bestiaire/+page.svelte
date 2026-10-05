<script lang="ts">
	import { chemin } from '$lib/ui/adresse';
	import { enhance } from '$app/forms';
	import PageAtelier from '../PageAtelier.svelte';
	import Chapitre from '$lib/ui/Chapitre.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import Champ from '$lib/ui/Champ.svelte';
	import Losange from '$lib/ui/Losange.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import Encre from '$lib/ui/Encre.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import { creerEcriture } from '$lib/ui/ecriture.svelte';
	import { dateLongue } from '$lib/ui/dates';
	import Filtres from '../../univers/bestiaire/Filtres.svelte';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
	const ecriture = creerEcriture();
	$effect(() => {
		if (ecriture.note?.ton === 'fait') {
			const timer = setTimeout(ecriture.effacer, 3000);
			return () => clearTimeout(timer);
		}
	});
</script>

<svelte:head><title>Bestiaire — L’Atelier</title></svelte:head>
<PageAtelier titre="Le bestiaire" serments={data.atelierSerments}>
	<Filtres cible="/atelier/bestiaire" filters={data.filters} zones={data.zones} />
	<div class="gestes">
		<Bouton variante="ruban" href="/atelier/bestiaire/nouveau" fleche="→">Nouvelle créature</Bouton
		><Bouton variante="texte" href="/univers/bestiaire" fleche="→">Lire le bestiaire</Bouton>
	</div>
	<Chapitre numero="01" titre="Les créatures">
		{#if !data.beasts.length}<Vide>Aucune créature ne correspond.</Vide>{:else}<ul class="lignes">
				{#each data.beasts as beast (beast.id)}<li>
						<a class="ligne-lien" href={chemin(`/atelier/bestiaire/${beast.id}`)}>
							<span class="nom"
								>{beast.name}{#if beast.subtitle}<span class="sous-titre">{beast.subtitle}</span
									>{/if}</span
							>
							<span><Losange couleur={beast.behaviorColor} libelle={beast.behavior} /></span><span
								class="chiffres">Niveau {beast.level}</span
							><span aria-hidden="true">→</span>
							{#if beast.reserved?.hidden || beast.reserved?.archived}<span class="meta"
									>{#if beast.reserved.hidden}<span class="marque">masquée</span
										>{/if}{#if beast.reserved.archived}<span class="marque">archivée</span
										>{/if}</span
								>{/if}
						</a>
					</li>{/each}
			</ul>{/if}
	</Chapitre>
	<Chapitre numero="02" titre="Observations en attente" id="observations">
		{#if ecriture.note}<NoteDeMarge ton={ecriture.note.ton}>{ecriture.note.texte}</NoteDeMarge
			>{:else if form && 'message' in form}<NoteDeMarge ton="refus"
				>L’observation reste en attente. {form.message}</NoteDeMarge
			>{/if}
		{#if !data.pending.length}<Vide>Aucune observation n’attend de tampon.</Vide>{:else}<ul>
				{#each data.pending as observation (observation.id)}<li class="observation">
						<a class="retour" href={chemin(`/univers/bestiaire/${observation.beastId}`)}
							>{data.beasts.find((b) => b.id === observation.beastId)?.name ?? 'Lire la créature'} →</a
						>
						<p class="voix">{observation.text}</p>
						<p class="rappel">
							Proposée {observation.author ? `par ${observation.author}` : 'depuis un compte'} le {dateLongue(
								observation.proposedAt
							)}.
						</p>
						<form
							method="POST"
							action="?/valider"
							use:enhance={ecriture.enhance({ verbe: 'Tamponné' })}
						>
							<input type="hidden" name="observationId" value={observation.id} /><input
								type="hidden"
								name="expectedRevision"
								value={observation.revision}
							/>
							<Champ
								id="motif-{observation.id}"
								libelle="Motif du tampon ou du refus"
								name="motif"
								required
								maxlength={1000}
							/>
							<div class="gestes">
								<Bouton type="submit" variante={data.compte?.role === 'admin' ? 'tampon' : 'trait'}
									><Encre etat={ecriture.etat}>Tamponner</Encre></Bouton
								><Bouton type="submit" variante="rouille" formaction="?/rejeter">Refuser</Bouton>
							</div>
						</form>
					</li>{/each}
			</ul>{/if}
	</Chapitre>
</PageAtelier>

<style>
	.sous-titre {
		display: block;
		color: var(--encre-2);
		font: var(--t-libelle);
	}
	.observation {
		padding: var(--ligne) 0;
		border-bottom: 1px solid var(--reglure);
	}
	.observation p {
		overflow-wrap: anywhere;
	}
	@media (max-width: 760px) {
		:global(.atelier) .ligne-lien {
			grid-template-columns: minmax(0, 1fr) auto;
		}
		.ligne-lien > span:nth-child(2) {
			grid-column: 1 / -1;
			grid-row: 2;
		}
		.ligne-lien > span:nth-child(3) {
			grid-column: 1;
		}
		.ligne-lien > span:nth-child(4) {
			grid-column: 2;
			grid-row: 1;
		}
	}
</style>
