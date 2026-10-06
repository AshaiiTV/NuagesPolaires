<script lang="ts">
	import { chemin } from '$lib/ui/adresse';
	// /table — les Tables ouvertes et récentes, et « Ouvrir une Table » (03-vision §5.8).
	import { enhance } from '$app/forms';
	import Page from '$lib/ui/Page.svelte';
	import Chapitre from '$lib/ui/Chapitre.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import Champ from '$lib/ui/Champ.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import Losange from '$lib/ui/Losange.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import Encre from '$lib/ui/Encre.svelte';
	import Sommaire from '$lib/ui/table/Sommaire.svelte';
	import { creerEcriture } from '$lib/ui/ecriture.svelte';
	import { untrack } from 'svelte';
	import { dateCourte, heure } from '$lib/ui/dates';
	import { statutTable } from '$lib/ui/table/texte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const ecriture = creerEcriture();
	const valeurs = $derived(
		(form as { values?: Record<string, string | string[]> } | null)?.values ?? {}
	);

	// La saisie survit à un refus : les cases et les quantités sont tenues ici.
	let nom = $state('');
	let salon = $state('');
	let choisis = $state<string[]>([]);
	let quantites = $state<Record<string, number>>(
		untrack(() => (data.creature ? { [data.creature]: 1 } : {}))
	);
	let filtre = $state('');
	$effect(() => {
		if (valeurs.nom && !nom) nom = String(valeurs.nom);
		if (valeurs.salon && !salon) salon = String(valeurs.salon);
	});

	const creaturesVisibles = $derived(
		filtre.trim()
			? data.creatures.filter((c) =>
					`${c.nom} ${c.sousTitre}`.toLowerCase().includes(filtre.trim().toLowerCase())
				)
			: data.creatures
	);
	const nbAdversaires = $derived(Object.values(quantites).reduce((n, q) => n + (q > 0 ? q : 0), 0));
	const resume = $derived.by(() => {
		const e = choisis.length;
		const a = nbAdversaires;
		if (!e && !a)
			return 'Une Table peut s’ouvrir vide : tu ajoutes les combattants avant de démarrer.';
		const parts = [];
		if (e) parts.push(`${e} Élève${e > 1 ? 's' : ''} du Serment`);
		if (a) parts.push(`${a} adversaire${a > 1 ? 's' : ''}`);
		return `La Table s’ouvrira avec ${parts.join(' et ')}.`;
	});

	function changerQuantite(id: string, delta: number) {
		const q = Math.max(0, Math.min(30, (quantites[id] ?? 0) + delta));
		quantites = { ...quantites, [id]: q };
	}
	const releve = (iso: string | null) =>
		iso ? `relevé ${heure(iso)} · ${dateCourte(iso)}` : 'jamais sauvegardée';
</script>

<svelte:head><title>La Table — Nuages Polaires</title></svelte:head>

<Page repere="NP / 06 — La Table" titre="La" titreVoix="Table.">
	{#snippet marge()}
		<Sommaire />
	{/snippet}
	{#snippet bande()}
		<Sommaire />
	{/snippet}

	<Chapitre numero="01" titre="Tables ouvertes">
		{#if data.ouvertes.length}
			<ul class="tables">
				{#each data.ouvertes as t (t.id)}
					<li>
						<a class="nom" href={chemin(`/table/combat/${t.id}`)}>{t.name}</a>
						<span class="statut">{statutTable(t.status)}</span>
						<span class="round chiffres"
							>{t.status === 'preparation' ? 'avant le round 1' : `Round ${t.round}`}</span
						>
						<span class="releve chiffres">{releve(t.savedAt)}</span>
						<Bouton variante="texte" href="/table/combat/{t.id}" fleche="→">Reprendre</Bouton>
					</li>
				{/each}
			</ul>
		{:else}
			<Vide>
				Aucune Table ouverte.
				{#snippet action()}
					<Bouton variante="texte" href="#ouvrir" fleche="↓">Ouvrir une Table</Bouton>
				{/snippet}
			</Vide>
		{/if}
	</Chapitre>

	{#if data.recentes.length}
		<Chapitre numero="02" titre="Récemment repliées">
			<ul class="tables">
				{#each data.recentes as t (t.id)}
					<li class="repliee">
						<a class="nom" href={chemin(`/table/archives/${t.id}`)}>{t.label || t.name}</a>
						<span class="statut">{statutTable(t.status)}</span>
						<span class="round chiffres"
							>{Math.max(1, t.round - 1)} round{t.round > 2 ? 's' : ''}</span
						>
						<span class="releve chiffres">{releve(t.savedAt)}</span>
						<Bouton variante="texte" href="/table/archives/{t.id}" fleche="→">Lire le récit</Bouton>
					</li>
				{/each}
			</ul>
		</Chapitre>
	{/if}

	<Chapitre numero={data.recentes.length ? '03' : '02'} titre="Ouvrir une Table" id="ouvrir">
		<form
			method="POST"
			action="?/ouvrir"
			class="ouvrir"
			use:enhance={ecriture.enhance({ verbe: 'Ouverte' })}
		>
			<div class="identite">
				<Champ
					libelle="Nom de la Table"
					name="nom"
					bind:value={nom}
					required
					maxlength={200}
					placeholder="Col des brumes"
					autocomplete="off"
				/>
				<Champ
					libelle="Salon Discord"
					name="salon"
					type="url"
					bind:value={salon}
					placeholder="https://discord.com/channels/…"
					aide="Facultatif. Les participants le retrouvent sur leur feuillet."
					autocomplete="off"
				/>
			</div>

			<div class="choix">
				<fieldset>
					<legend>Élèves du Serment</legend>
					{#if data.personnages.length}
						<ul class="cases">
							{#each data.personnages as p (p.id)}
								<li>
									<label>
										<input type="checkbox" name="personnages" value={p.id} bind:group={choisis} />
										<span class="qui">
											<span class="nom-ligne">{p.nom}</span>
											<span class="detail"
												>{p.serment} · niv. {p.niveau}{#if !p.relie}&nbsp;· non relié{/if}</span
											>
										</span>
										<span class="chiffres res"
											>PV {p.pv.cur}/{p.pv.max} · EP {p.ep.cur}/{p.ep.max} · EM {p.em.cur}/{p.em
												.max}</span
										>
									</label>
								</li>
							{/each}
						</ul>
					{:else}
						<Vide>Aucun personnage. Le premier s’écrit dans Personnages.</Vide>
					{/if}
				</fieldset>

				<fieldset>
					<legend>Adversaires</legend>
					{#if data.creatures.length > 8}
						<label class="filtre">
							<span class="sr-only">Chercher une créature</span>
							<input
								type="search"
								bind:value={filtre}
								placeholder="Chercher une créature…"
								autocomplete="off"
							/>
						</label>
					{/if}
					{#if creaturesVisibles.length}
						<ul class="cases">
							{#each creaturesVisibles as c (c.id)}
								{@const q = quantites[c.id] ?? 0}
								<li class:pris={q > 0}>
									<span class="qui">
										<span class="nom-ligne">{c.nom}</span>
										<span class="detail">
											niv. {c.niveau}
											{#if c.comportement}<Losange
													couleur={c.couleur}
													libelle={c.comportement}
												/>{/if}
										</span>
									</span>
									<span class="quantite">
										<button
											type="button"
											class="pas"
											onclick={() => changerQuantite(c.id, -1)}
											disabled={q === 0}
											aria-label="Un {c.nom} de moins">−</button
										>
										<input
											class="chiffres"
											type="number"
											name="qte_{c.id}"
											min="0"
											max="30"
											inputmode="numeric"
											value={q}
											oninput={(e) =>
												(quantites = {
													...quantites,
													[c.id]: Math.max(0, Math.min(30, Number(e.currentTarget.value) || 0))
												})}
											aria-label="Quantité de {c.nom}"
										/>
										<button
											type="button"
											class="pas"
											onclick={() => changerQuantite(c.id, 1)}
											aria-label="Un {c.nom} de plus">+</button
										>
									</span>
								</li>
							{/each}
						</ul>
					{:else if data.creatures.length}
						<Vide>Aucune créature ne correspond.</Vide>
					{:else}
						<Vide>Le bestiaire est vide. L’Atelier y écrit les créatures.</Vide>
					{/if}
				</fieldset>
			</div>

			<div class="valider">
				<p class="resume">
					{#if ecriture.etat === 'humide'}<Encre etat="humide">{resume}</Encre>{:else}{resume}{/if}
				</p>
				<Bouton variante="ruban" type="submit" disabled={ecriture.enCours}>Ouvrir la Table</Bouton>
			</div>
			{#if ecriture.note && ecriture.note.ton !== 'fait'}
				<NoteDeMarge ton={ecriture.note.ton}>{ecriture.note.texte}</NoteDeMarge>
			{/if}
		</form>
	</Chapitre>
</Page>

<style>
	.tables li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 150px 140px 200px auto;
		align-items: center;
		gap: 0 24px;
		min-height: 48px;
		border-bottom: 1px solid var(--reglure);
	}
	.nom {
		font: 500 16px/24px var(--corps);
		color: var(--encre);
		text-decoration: none;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.nom:hover {
		text-decoration: underline;
	}
	.statut {
		font: var(--t-repere);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--encre-humide);
	}
	.repliee .statut {
		color: var(--encre-grise);
	}
	.round,
	.releve {
		font: var(--t-libelle);
		color: var(--encre-2);
	}

	.ouvrir {
		display: grid;
		gap: 48px;
		padding-top: 24px;
	}
	.identite {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 24px 48px;
	}
	.choix {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 48px;
		align-items: start;
	}
	fieldset {
		min-width: 0;
		margin: 0;
		padding: 0;
		border: 0;
	}
	legend {
		width: 100%;
		padding: 0;
		font: var(--t-repere);
		letter-spacing: var(--approche-repere);
		text-transform: uppercase;
		color: var(--encre-2);
		border-bottom: 1px solid var(--reglure);
		line-height: 48px;
	}
	.cases li {
		border-bottom: 1px solid var(--reglure);
	}
	.cases label,
	.cases li:not(:has(label)) {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 0 16px;
		min-height: 48px;
	}
	.cases li:not(:has(label)) {
		grid-template-columns: minmax(0, 1fr) auto;
	}
	.cases label {
		cursor: pointer;
	}
	input[type='checkbox'] {
		width: 20px;
		height: 20px;
		margin: 0;
		accent-color: var(--ruban);
	}
	.qui {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0 12px;
		min-width: 0;
	}
	.nom-ligne {
		font: 500 14px/24px var(--corps);
		color: var(--encre);
	}
	.detail {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.res {
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.pris .nom-ligne {
		color: var(--encre-humide);
	}
	.quantite {
		display: inline-flex;
		align-items: center;
	}
	.pas {
		width: 44px;
		height: 44px;
		border: 0;
		background: none;
		font: 400 18px/1 var(--corps);
		color: var(--encre-2);
		border-radius: var(--rayon);
	}
	.pas:hover:not(:disabled) {
		color: var(--encre);
		background: color-mix(in srgb, var(--encre-humide) 8%, transparent);
	}
	.pas:disabled {
		color: var(--encre-grise);
		cursor: default;
	}
	.quantite input {
		width: 44px;
		min-height: 44px;
		padding: 0;
		border: 0;
		border-bottom: 1px solid color-mix(in srgb, var(--encre) 28%, transparent);
		background: transparent;
		text-align: center;
		font: 500 14px/24px var(--corps);
		-moz-appearance: textfield;
		appearance: textfield;
	}
	.quantite input::-webkit-inner-spin-button,
	.quantite input::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	.filtre input {
		width: 100%;
		min-height: 44px;
		padding: 8px 0;
		border: 0;
		border-bottom: 1px solid color-mix(in srgb, var(--encre) 28%, transparent);
		background: transparent;
		font: var(--t-corps);
	}
	.filtre input::placeholder {
		color: var(--encre-grise);
		font-style: italic;
	}
	.valider {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		padding-top: 24px;
		border-top: 1px solid var(--reglure);
	}
	.resume {
		font: var(--t-corps);
		color: var(--encre-2);
	}

	@media (max-width: 1100px) {
		.tables li {
			grid-template-columns: minmax(0, 1fr) 130px 120px auto;
		}
		.tables .releve {
			display: none;
		}
	}
	@media (max-width: 760px) {
		.tables li {
			grid-template-columns: minmax(0, 1fr) auto;
			grid-template-areas: 'nom action' 'meta action';
			padding: 12px 0;
			gap: 0 12px;
		}
		.tables .nom {
			grid-area: nom;
			white-space: normal;
		}
		.tables .statut,
		.tables .round {
			display: none;
		}
		.tables .releve {
			display: block;
			grid-area: meta;
		}
		.tables li > :global(.bouton) {
			grid-area: action;
		}
		.identite,
		.choix {
			grid-template-columns: 1fr;
			gap: 24px;
		}
		.cases label {
			grid-template-columns: auto minmax(0, 1fr);
			padding: 12px 0;
		}
		.cases label .res {
			grid-column: 2;
		}
		.valider :global(.bouton) {
			width: 100%;
			justify-content: center;
		}
	}
</style>
