<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount, untrack } from 'svelte';
	import PagePersonnages from './PagePersonnages.svelte';
	import Choix from './Choix.svelte';
	import Chapitre from '$lib/ui/Chapitre.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import Champ from '$lib/ui/Champ.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import Encre from '$lib/ui/Encre.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import { creerEcriture } from '$lib/ui/ecriture.svelte';
	import { dateCourte, heure } from '$lib/ui/dates';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
	const ecriture = creerEcriture();
	let search = $state(untrack(() => data.search));
	let oathFilter = $state(untrack(() => data.oathId));
	let linkedFilter = $state(untrack(() => data.liaison));
	let newName = $state(untrack(() => String(form?.values?.name ?? '')));
	let newOath = $state(untrack(() => String(form?.values?.oathId ?? '')));
	let portrait = $state(untrack(() => String(form?.values?.portraitUrl ?? '')));
	let motif = $state(untrack(() => String(form?.values?.motif ?? 'Nouveau personnage.')));
	let createOpen = $state(untrack(() => !!form));
	onMount(() => {
		const chapter = document.getElementById('nouveau');
		if (!(chapter instanceof HTMLDetailsElement)) return;
		const remember = () => {
			createOpen = chapter.open;
		};
		chapter.addEventListener('toggle', remember);
		return () => chapter.removeEventListener('toggle', remember);
	});
	$effect(() => {
		search = data.search;
		oathFilter = data.oathId;
		linkedFilter = data.liaison;
	});
</script>

<svelte:head><title>Personnages — Nuages Polaires</title></svelte:head>

{#snippet filtres(support: string)}
	<form method="GET" class="filtres">
		<Champ
			libelle="Rechercher un personnage"
			name="recherche"
			id={'recherche-' + support}
			bind:value={search}
			maxlength={120}
			type="search"
		/>
		<Choix
			libelle="Serment"
			name="serment"
			id={'serment-' + support}
			bind:value={oathFilter}
			required={false}
		>
			<option value="">Tous les Serments</option>
			{#each data.oaths as oath (oath.id)}<option value={oath.id}>{oath.name}</option>{/each}
		</Choix>
		<Choix
			libelle="Liaison au compte"
			name="liaison"
			id={'liaison-' + support}
			bind:value={linkedFilter}
			required={false}
		>
			<option value="">Tous les personnages</option><option value="relie">Relié à un compte</option
			><option value="non-relie">Non relié</option>
		</Choix>
		<Bouton variante="trait" type="submit">Rechercher</Bouton>
		{#if data.search || data.oathId || data.liaison}<Bouton
				variante="texte"
				href="/table/personnages">Tous les personnages</Bouton
			>{/if}
	</form>
{/snippet}

<PagePersonnages titre="Personnages." reperes={filtres}>
	<div class="ouverture">
		<p>Attribue une ligne. Le motif reste avec le tampon.</p>
		{#if data.canCreate}<Bouton variante="trait" href="#nouveau" onclick={() => (createOpen = true)}
				>Nouveau personnage</Bouton
			>{/if}
	</div>
	{#if data.characters.length}
		<div class="tete-liste" aria-hidden="true">
			<span>Personnage · Serment</span><span>Niveau</span><span>PV · EP · EM</span><span
				>Dernier tampon</span
			>
		</div>
		<ul class="liste">
			{#each data.characters as c (c.id)}
				<li>
					<a class="ligne" href="/table/personnages/{c.id}">
						<span class="identite"
							><strong>{c.name}</strong><span>{c.oath.name} · {c.oath.rankLabel}</span><span
								class="liaison">{c.linkedPseudo ? `relié à ${c.linkedPseudo}` : 'non relié'}</span
							></span
						>
						<span class="niveau chiffres"><span class="mobile">niv. </span>{c.level}</span>
						<span class="ressources chiffres"
							><span>PV {c.pv.cur}<span class="max">/{c.pv.max}</span></span><span
								>EP {c.ep.cur}<span class="max">/{c.ep.max}</span></span
							><span>EM {c.em.cur}<span class="max">/{c.em.max}</span></span><span
								class="dernier-mobile"
								>{#if c.lastStamp}<time datetime={c.lastStamp.at}
										>tampon · {dateCourte(c.lastStamp.at)} · {heure(c.lastStamp.at)}</time
									>{:else}Aucun tampon.{/if}</span
							></span
						>
						<span class="tampon"
							>{#if c.lastStamp}<time datetime={c.lastStamp.at}
									>{dateCourte(c.lastStamp.at)} · {heure(c.lastStamp.at)}</time
								><span>{c.lastStamp.role} {c.lastStamp.name}</span>{:else}Aucun tampon.{/if}</span
						>
						<span class="tourner" aria-hidden="true">→</span>
					</a>
				</li>
			{/each}
		</ul>
	{:else}<Vide>Aucun personnage. Le premier s’écrit ici.</Vide>{/if}
	{#if data.canCreate}
		<Chapitre titre="Nouveau personnage" id="nouveau" repliable ouvert={createOpen}>
			<form
				method="POST"
				action="?/creer"
				class="creation"
				use:enhance={ecriture.enhance({ verbe: 'Tamponné' })}
			>
				<div class="deux">
					<Champ
						libelle="Nom"
						name="name"
						bind:value={newName}
						required
						maxlength={80}
						autocomplete="off"
					/><Choix libelle="Serment du personnage" name="oathId" bind:value={newOath}
						><option value="">Choisis un Serment</option
						>{#each data.creationOaths as oath (oath.id)}<option value={oath.id}
								>{oath.name} · {oath.rankLabel}</option
							>{/each}</Choix
					>
				</div>
				<Champ
					libelle="Portrait"
					name="portraitUrl"
					bind:value={portrait}
					aide="Facultatif. Lien vers une image ou chemin du carnet."
					maxlength={25000}
				/>
				<Champ libelle="Motif du tampon" name="motif" bind:value={motif} required maxlength={500} />
				<Bouton variante="tampon" type="submit" disabled={ecriture.enCours}
					><Encre etat={ecriture.etat}>Tamponner</Encre></Bouton
				>
				{#if ecriture.note}<NoteDeMarge ton={ecriture.note.ton}>{ecriture.note.texte}</NoteDeMarge
					>{:else if form?.message}<NoteDeMarge ton="refus">{form.message}</NoteDeMarge>{/if}
			</form>
		</Chapitre>
	{/if}
</PagePersonnages>

<style>
	.filtres {
		display: grid;
		gap: var(--ligne);
		justify-items: stretch;
	}
	.ouverture {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--ligne);
		margin-bottom: var(--ligne);
	}
	.ouverture p {
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.tete-liste,
	.ligne {
		display: grid;
		grid-template-columns: minmax(0, 2fr) 4rem minmax(13rem, 1.5fr) minmax(8rem, 1fr) var(--ligne);
		align-items: center;
		gap: var(--gouttiere);
	}
	.tete-liste {
		min-height: calc(var(--ligne) * 2);
		border-bottom: 1px solid var(--reglure);
		font: var(--t-repere);
		text-transform: uppercase;
		letter-spacing: var(--approche-repere);
		color: var(--encre-grise);
	}
	.ligne {
		min-height: calc(var(--ligne) * 4);
		padding: var(--ligne) 0;
		border-bottom: 1px solid var(--reglure);
		text-decoration: none;
		font: var(--t-liste);
	}
	.ligne:hover {
		background: color-mix(in srgb, var(--encre) 4%, transparent);
	}
	.identite,
	.tampon {
		display: grid;
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.identite strong {
		font-weight: 600;
	}
	.identite > span,
	.tampon {
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.identite .liaison {
		color: var(--encre-grise);
	}
	.ressources {
		display: flex;
		flex-wrap: wrap;
		gap: 0 12px;
	}
	.ressources > span {
		white-space: nowrap;
	}
	.max {
		color: var(--encre-2);
	}
	.tourner {
		color: var(--encre-humide);
	}
	.mobile,
	.dernier-mobile {
		display: none;
	}
	.creation {
		display: grid;
		gap: var(--ligne);
		padding-top: var(--ligne);
		justify-items: start;
	}
	.creation > :global(.champ),
	.deux {
		width: 100%;
	}
	.deux {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--gouttiere);
	}
	@media (max-width: 1100px) {
		.tete-liste {
			display: none;
		}
		.ligne {
			grid-template-columns: minmax(0, 1fr) auto var(--ligne);
			grid-template-areas: 'nom niveau tourner' 'ressources tampon tampon';
		}
		.identite {
			grid-area: nom;
		}
		.niveau {
			grid-area: niveau;
		}
		.ressources {
			grid-area: ressources;
		}
		.tampon {
			grid-area: tampon;
		}
		.tourner {
			grid-area: tourner;
		}
		.mobile {
			display: inline;
		}
	}
	@media (max-width: 760px) {
		.filtres {
			grid-template-columns: 1fr 1fr;
			gap: var(--ligne) var(--gouttiere);
			width: 100%;
		}
		.filtres > :global(.champ) {
			grid-column: 1 / -1;
		}
		.ligne {
			grid-template-areas: 'nom niveau tourner' 'ressources ressources ressources';
			gap: 0 var(--gouttiere);
		}
		.identite {
			display: block;
		}
		.identite strong {
			display: block;
		}
		.identite .liaison {
			display: inline;
			margin-left: 8px;
		}
		.tampon {
			display: none;
		}
		.ressources .dernier-mobile {
			display: block;
			width: 100%;
			white-space: normal;
			font: var(--t-libelle);
			color: var(--encre-2);
		}
		.ressources {
			font-size: 13px;
			gap: 0 16px;
		}
		.deux {
			grid-template-columns: 1fr;
		}
	}
</style>
