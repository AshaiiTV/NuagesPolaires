<script lang="ts">
	// /table/apparitions — « Tirer » dans une zone, les groupes tirés en lignes (créature × quantité),
	// « Envoyer à la Table » avec les Élèves du Serment choisis ; puis les 24 derniers tirages et les
	// totaux par créature. Rien ne s'affiche comme tiré avant la réponse du serveur. 03-vision §5.8.
	import { enhance } from '$app/forms';
	import Page from '$lib/ui/Page.svelte';
	import Chapitre from '$lib/ui/Chapitre.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import Losange from '$lib/ui/Losange.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import Encre from '$lib/ui/Encre.svelte';
	import Sommaire from '$lib/ui/table/Sommaire.svelte';
	import { creerEcriture } from '$lib/ui/ecriture.svelte';
	import { dateCourte, heure } from '$lib/ui/dates';
	import { nomSalon } from '$lib/ui/table/texte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const tirer = creerEcriture();
	const envoyer = creerEcriture();

	let zone = $state('');
	let nombre = $state(1);
	$effect(() => {
		if (!zone) zone = (data.zones.find((z) => z.defaut) ?? data.zones[0])?.id ?? '';
	});

	// Le tirage montré : celui que la réponse vient de confirmer, sinon celui choisi dans l'historique.
	let choisi = $state<string | null>(null);
	const dernierConfirme = $derived((form as { tirage?: string } | null)?.tirage ?? null);
	const courant = $derived(data.tirages.find((t) => t.id === (choisi ?? dernierConfirme)) ?? null);
	$effect(() => {
		if (dernierConfirme) choisi = null;
	});
	let personnages = $state<string[]>([]);

	const nomZone = (n: string) => (n.startsWith('[') || n.startsWith('#') ? nomSalon(n) : n);
	const resumeGroupes = (g: { nom: string; quantite: number }[]) =>
		g.map((x) => `${x.nom} ×${x.quantite}`).join(' · ');
</script>

<svelte:head><title>Apparitions — La Table — Nuages Polaires</title></svelte:head>

<Page repere="NP / 06 — La Table · apparitions" titre="Les" titreVoix="Apparitions.">
	{#snippet marge()}
		<Sommaire />
	{/snippet}
	{#snippet bande()}
		<Sommaire />
	{/snippet}

	<Chapitre numero="01" titre="Tirer">
		<div class="tirer">
			<form
				method="POST"
				action="?/tirer"
				class="zones"
				use:enhance={tirer.enhance({ verbe: 'Tiré' })}
			>
				<fieldset>
					<legend>Zone</legend>
					<ul class="liste-zones">
						{#each data.zones as z (z.id)}
							<li>
								<label class:pris={zone === z.id}>
									<input type="radio" name="zone" value={z.id} bind:group={zone} />
									<span>{nomZone(z.nom)}</span>
								</label>
							</li>
						{/each}
					</ul>
				</fieldset>
				<div class="lancer">
					<label class="nombre">
						<span>Rencontres</span>
						<select name="nombre" bind:value={nombre}>
							{#each [1, 2, 3, 4, 5] as n (n)}<option value={n}>{n}</option>{/each}
						</select>
					</label>
					<Bouton variante="ruban" type="submit" disabled={tirer.enCours || !zone}>Tirer</Bouton>
				</div>
				{#if tirer.note}
					<div aria-live="polite">
						<NoteDeMarge ton={tirer.note.ton}>{tirer.note.texte}</NoteDeMarge>
					</div>
				{/if}
			</form>

			<div class="resultat" aria-live="polite">
				{#if courant}
					<p class="titre-tirage chiffres">
						{#if tirer.etat === 'humide'}<Encre etat="humide">Tirage en cours…</Encre>{:else}
							{nomZone(courant.zone)} · {heure(courant.at)} · {dateCourte(courant.at)}
						{/if}
					</p>
					<ul class="groupes">
						{#each courant.groupes as g, i (i)}
							<li>
								<span class="nom">Rencontre {i + 1} · {g.nom}</span>
								<span class="detail">
									niv. {g.niveau}
									{#if g.comportement}<Losange couleur={g.couleur} libelle={g.comportement} />{/if}
								</span>
								<span class="quantite chiffres">× {g.quantite}</span>
							</li>
						{/each}
					</ul>

					<form
						method="POST"
						action="?/envoyer"
						class="envoyer"
						use:enhance={envoyer.enhance({ verbe: 'Envoyé' })}
					>
						<input type="hidden" name="tirage" value={courant.id} />
						<fieldset>
							<legend>Élèves du Serment à la Table</legend>
							{#if data.personnages.length}
								<ul class="cases">
									{#each data.personnages as p (p.id)}
										<li>
											<label>
												<input
													type="checkbox"
													name="personnages"
													value={p.id}
													bind:group={personnages}
												/>
												<span class="nom">{p.nom}</span>
												<span class="detail">{p.serment} · niv. {p.niveau}</span>
											</label>
										</li>
									{/each}
								</ul>
							{:else}
								<Vide>Aucun personnage. Le premier s’écrit dans Personnages.</Vide>
							{/if}
						</fieldset>
						<div class="valider">
							<p class="detail">
								{personnages.length
									? `${personnages.length} Élève${personnages.length > 1 ? 's' : ''} du Serment et ce tirage ouvriront une Table.`
									: 'La Table peut s’ouvrir sans Élève ; tu les ajoutes avant de démarrer.'}
							</p>
							<Bouton variante="trait" type="submit" disabled={envoyer.enCours} fleche="→"
								>Envoyer à la Table</Bouton
							>
						</div>
						{#if envoyer.note && envoyer.note.ton !== 'fait'}
							<NoteDeMarge ton={envoyer.note.ton}>{envoyer.note.texte}</NoteDeMarge>
						{/if}
					</form>
				{:else}
					<Vide>Choisis une zone et tire : les groupes s’écrivent ici, créature par créature.</Vide>
				{/if}
			</div>
		</div>
	</Chapitre>

	<Chapitre
		numero="02"
		titre="Derniers tirages"
		chapeau="Les 24 derniers, du plus récent au plus ancien."
	>
		{#if data.tirages.length}
			<ol class="historique">
				{#each data.tirages as t (t.id)}
					<li class:courant={courant?.id === t.id}>
						<span class="quand chiffres">{heure(t.at)} · {dateCourte(t.at)}</span>
						<span class="zone">{nomZone(t.zone)}</span>
						<span class="groupes-ligne">{resumeGroupes(t.groupes)}</span>
						<button
							type="button"
							class="geste"
							onclick={() => (choisi = t.id)}
							aria-pressed={courant?.id === t.id}
						>
							{t.combatId ? 'Envoyé à la Table' : 'Pas encore envoyé'}
						</button>
					</li>
				{/each}
			</ol>
		{:else}
			<Vide>Aucun tirage encore. Le premier s’écrit en haut de cette page.</Vide>
		{/if}
	</Chapitre>

	<Chapitre
		numero="03"
		titre="Totaux par créature"
		chapeau="Sorties cumulées par créature ; elles pondèrent les tirages suivants."
	>
		{#if data.totaux.length}
			<ul class="totaux">
				{#each data.totaux as t (t.id)}
					<li>
						<span class="nom">{t.nom}</span>
						<span class="chiffres total">{t.total} sortie{t.total > 1 ? 's' : ''}</span>
					</li>
				{/each}
			</ul>
		{:else}
			<Vide>Aucune créature n’est encore sortie.</Vide>
		{/if}
	</Chapitre>
</Page>

<style>
	.tirer {
		display: grid;
		grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
		gap: 48px;
		align-items: start;
		padding-top: 24px;
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
		line-height: 24px;
		border-bottom: 1px solid var(--reglure);
	}
	.liste-zones {
		max-height: calc(var(--ligne) * 14);
		overflow-y: auto;
	}
	.liste-zones li,
	.cases li {
		border-bottom: 1px solid var(--reglure);
	}
	.liste-zones label,
	.cases label {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 44px;
		font: 500 14px/24px var(--corps);
		color: var(--encre-2);
		cursor: pointer;
	}
	.liste-zones label.pris {
		color: var(--encre);
	}
	input[type='radio'],
	input[type='checkbox'] {
		flex: none;
		width: 20px;
		height: 20px;
		margin: 0;
		accent-color: var(--ruban);
	}
	.lancer {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 24px;
		margin-top: 24px;
	}
	.nombre {
		display: grid;
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	select {
		min-width: 96px;
		min-height: 44px;
		padding: 8px 0;
		border: 0;
		border-bottom: 1px solid color-mix(in srgb, var(--encre) 28%, transparent);
		border-radius: 0;
		background: var(--page);
		font: 500 14px/24px var(--corps);
		color: var(--encre);
	}
	.titre-tirage {
		min-height: 48px;
		font: 600 14px/48px var(--corps);
		color: var(--encre);
		border-bottom: 1px solid var(--reglure);
	}
	.groupes li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto 64px;
		align-items: center;
		gap: 0 16px;
		min-height: 48px;
		border-bottom: 1px solid var(--reglure);
	}
	.nom {
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
	.quantite {
		font: 600 14px/24px var(--corps);
		text-align: right;
		color: var(--encre);
	}
	.envoyer {
		display: grid;
		gap: 16px;
		margin-top: 48px;
	}
	.cases {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		column-gap: 24px;
	}
	.cases label {
		color: var(--encre);
	}
	.valider {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px 24px;
	}
	.historique li {
		display: grid;
		grid-template-columns: 150px 200px minmax(0, 1fr) auto;
		align-items: center;
		gap: 0 24px;
		min-height: 48px;
		border-bottom: 1px solid var(--reglure);
	}
	.historique li.courant .zone,
	.historique li.courant .groupes-ligne {
		color: var(--encre-humide);
	}
	.quand {
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.zone {
		font: 500 14px/24px var(--corps);
		color: var(--encre);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.groupes-ligne {
		font: 500 14px/24px var(--corps);
		color: var(--encre-2);
	}
	.geste {
		min-width: 44px;
		min-height: 44px;
		padding: 0 10px;
		border: 0;
		background: none;
		font: 500 14px/24px var(--corps);
		color: var(--encre-2);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--encre-humide) 45%, transparent);
		text-underline-offset: 4px;
	}
	.geste[aria-pressed='true'] {
		color: var(--encre-humide);
		text-decoration: none;
	}
	.totaux {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		column-gap: 48px;
	}
	.totaux li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		min-height: 48px;
		border-bottom: 1px solid var(--reglure);
	}
	.total {
		font: var(--t-libelle);
		color: var(--encre-2);
	}

	@media (max-width: 1100px) {
		.tirer {
			grid-template-columns: minmax(0, 1fr);
			gap: 24px;
		}
	}
	@media (max-width: 760px) {
		.historique li {
			grid-template-columns: minmax(0, 1fr) auto;
			grid-template-areas: 'quand geste' 'zone geste' 'groupes groupes';
			padding: 8px 0;
		}
		.quand {
			grid-area: quand;
		}
		.zone {
			grid-area: zone;
		}
		.groupes-ligne {
			grid-area: groupes;
		}
		.geste {
			grid-area: geste;
		}
		.groupes li {
			grid-template-columns: minmax(0, 1fr) auto;
			grid-template-areas: 'nom qte' 'detail qte';
			padding: 8px 0;
		}
		.groupes .nom {
			grid-area: nom;
		}
		.groupes .detail {
			grid-area: detail;
		}
		.quantite {
			grid-area: qte;
		}
		.valider :global(.bouton) {
			width: 100%;
			justify-content: center;
		}
	}
</style>
