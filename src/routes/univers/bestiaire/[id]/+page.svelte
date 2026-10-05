<script lang="ts">
	import { signature } from '$lib/ui/tampons';
	import { enhance } from '$app/forms';
	import Page from '$lib/ui/Page.svelte';
	import Chapitre from '$lib/ui/Chapitre.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import Champ from '$lib/ui/Champ.svelte';
	import Encre from '$lib/ui/Encre.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import Tampon from '$lib/ui/Tampon.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import { creerEcriture } from '$lib/ui/ecriture.svelte';
	import { dateLongue, heure } from '$lib/ui/dates';
	import Fiche from '../Fiche.svelte';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
	let calque = $derived(data.calque);
	const ecriture = creerEcriture();
	$effect(() => {
		if (ecriture.note?.ton === 'fait') {
			const timer = setTimeout(ecriture.effacer, 3000);
			return () => clearTimeout(timer);
		}
	});
</script>

<svelte:head
	><title>{data.beast.name} — Le bestiaire</title><meta
		name="description"
		content={data.beast.subtitle || data.beast.name}
	/></svelte:head
>

{#snippet reperes()}
	<Bouton variante="texte" href="/univers/bestiaire">← Le bestiaire</Bouton>
	<nav class="reperes" aria-label="Chapitres de la créature">
		<a href="#fiche">La fiche</a><a href="#observations">Observations</a>
	</nav>
	{#if data.beast.reserved}<label class="interrupteur"
			><input
				type="checkbox"
				role="switch"
				bind:checked={calque}
				aria-controls="calque-reserve"
			/>Calque</label
		>{/if}
{/snippet}

<Page repere="NP / 05 — L’univers" titre={data.beast.name} grain>
	{#snippet marge()}{@render reperes()}{/snippet}
	{#snippet bande()}{@render reperes()}{/snippet}
	<section id="fiche" aria-label="La fiche"><Fiche beast={data.beast} /></section>
	{#if data.beast.reserved && calque}
		<aside id="calque-reserve" class="calque" aria-label="Calque réservé">
			<p class="repere">Calque réservé</p>
			<p>
				{data.beast.reserved.archived
					? 'Archivée'
					: data.beast.reserved.hidden
						? 'Masquée'
						: 'Visible dans le bestiaire'}{#if data.beast.reserved.archived && data.beast.reserved.hidden}
					· masquée{/if}
			</p>
			{#if data.beast.reserved.adminNote}<p class="note-reservee">
					{data.beast.reserved.adminNote}
				</p>{:else}<p>Aucune note réservée.</p>{/if}
			{#if data.beast.reserved.usage.history.length}
				<p>Rencontrée dans les récits suivants.</p>
				<ul>
					{#each data.beast.reserved.usage.history as usage, index (index)}<li>
							{usage.name}{#if usage.at}
								· {dateLongue(usage.at)}{/if}
						</li>{/each}
				</ul>
			{:else}<p>Aucun récit ne garde encore son passage.</p>{/if}
			<div class="gestes">
				{#if data.canEdit}<Bouton
						variante="texte"
						href="/atelier/bestiaire/{data.beast.id}"
						fleche="→">Modifier dans l’Atelier</Bouton
					>{/if}{#if data.canTable}<Bouton
						variante="texte"
						href="/table?creature={data.beast.id}"
						fleche="→">Envoyer à la Table</Bouton
					>{/if}
			</div>
		</aside>
	{/if}
	<Chapitre numero="01" titre="Observations" id="observations">
		{#if data.beast.observations.length}<ul class="observations">
				{#each data.beast.observations as observation (observation.id)}<li>
						<p class="extrait">{observation.text}</p>
						<p class="date">{dateLongue(observation.at)} · {heure(observation.at)}</p>
						{#if observation.stamp}<Tampon cle={observation.id}
								>{signature(observation.stamp.role, observation.stamp.name, observation.at)}</Tampon
							>{/if}
						{#if observation.combatId && data.recits.includes(observation.combatId)}<div
								class="gestes"
							>
								<Bouton variante="texte" href="/carnet/recits/{observation.combatId}" fleche="→"
									>Lire le récit</Bouton
								>
							</div>{/if}
					</li>{/each}
			</ul>{:else}<Vide>Cette page reste blanche tant que personne ne l’a rencontré.</Vide>{/if}
		{#if data.connected}
			<form
				class="proposer"
				method="POST"
				action="?/proposer"
				use:enhance={ecriture.enhance({ verbe: 'Proposé' })}
			>
				<Champ
					libelle="Proposer une observation"
					name="text"
					required
					maxlength={1000}
					value={form && 'values' in form ? String(form.values?.text ?? '') : ''}
					aide="Une ligne de rencontre. Elle attend un tampon avant de paraître ici."
				/>
				<Bouton type="submit"><Encre etat={ecriture.etat}>Proposer une observation</Encre></Bouton>
			</form>
			{#if ecriture.note}<NoteDeMarge ton={ecriture.note.ton}
					>{ecriture.note.ton === 'fait'
						? 'Ton observation attend un tampon.'
						: ecriture.note.texte}</NoteDeMarge
				>{:else if form && 'message' in form}<NoteDeMarge ton="refus"
					>L’observation n’est pas proposée. {form.message}</NoteDeMarge
				>{:else if form && 'observationProposee' in form}<NoteDeMarge
					>Ton observation attend un tampon.</NoteDeMarge
				>{/if}
		{/if}
	</Chapitre>
</Page>

<style>
	.reperes {
		display: flex;
		flex-wrap: wrap;
		gap: 0 24px;
	}
	.reperes a,
	.interrupteur {
		min-height: var(--cible);
		display: flex;
		align-items: center;
		font: var(--t-libelle);
	}
	.interrupteur {
		gap: 12px;
	}
	.interrupteur input {
		accent-color: var(--encre-humide);
		width: 18px;
		height: 18px;
	}
	.calque {
		margin: var(--ligne) 0 var(--ligne) 8px;
		padding-left: 16px;
		border-left: 1px solid var(--reglure);
		color: var(--encre-2);
		font: var(--t-libelle);
		line-height: var(--ligne);
		overflow-wrap: anywhere;
	}
	.calque .repere {
		color: var(--encre-2);
	}
	.note-reservee {
		white-space: pre-line;
	}
	.gestes {
		display: flex;
		flex-wrap: wrap;
		gap: 0 24px;
	}
	.observations li {
		border-bottom: 1px solid var(--reglure);
		padding: var(--ligne) 0;
		overflow-wrap: anywhere;
	}
	.extrait {
		font: var(--t-recit);
		white-space: pre-line;
	}
	.date {
		font: var(--t-libelle);
		color: var(--encre-2);
		margin-bottom: calc(var(--ligne) / 2);
	}
	.proposer {
		display: grid;
		gap: var(--ligne);
		justify-items: start;
		margin-top: var(--ligne);
	}
	.proposer :global(.champ) {
		width: 100%;
	}
</style>
