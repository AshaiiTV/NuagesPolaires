<script lang="ts">
	import { SvelteDate } from 'svelte/reactivity';
	import { signature } from '$lib/ui/tampons';
	// Ce qui attend : la page d'entrée du Registre. Pas de compteur ni de tableau de bord : seulement ce
	// qui demande la main d'un administrateur, avec le geste qui le règle.
	import { enhance } from '$app/forms';
	import Chapitre from '$lib/ui/Chapitre.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import Tampon from '$lib/ui/Tampon.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import { creerEcriture } from '$lib/ui/ecriture.svelte';
	import { heure, relatif } from '$lib/ui/dates';
	import { le, leA } from './format';
	import PageRegistre from './PageRegistre.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const ecriture = creerEcriture();

	let compteChoisi = $state('');
	let personnageChoisi = $state('');

	const pending = $derived(data.pending);
	const compte = $derived(pending.pendingAccounts.find((a) => a.id === compteChoisi) ?? null);
	const personnage = $derived(
		pending.unlinkedCharacters.find((c) => c.id === personnageChoisi) ?? null
	);
	const lie = $derived(form && 'lie' in form ? form.lie : null);
	const maintenant = $derived(new SvelteDate(data.releve).getTime());
	const echu = (iso: string | null) => !!iso && new SvelteDate(iso).getTime() <= maintenant;
	const rien = $derived(
		pending.pendingAccounts.length === 0 &&
			pending.openResets.length === 0 &&
			data.anomalies.length === 0
	);

	const numLiaisons = $derived(pending.pendingAccounts.length > 0 ? '01' : null);
	const numResets = $derived(pending.openResets.length > 0 ? (numLiaisons ? '02' : '01') : null);
</script>

<svelte:head><title>Ce qui attend — Le Registre</title></svelte:head>

<PageRegistre titre="Ce qui" titreVoix="attend.">
	{#snippet reperes()}
		<span>relevé <span class="chiffres">{heure(data.releve)}</span></span>
		<span class="voix-courte">Les dates sont à l’heure de Paris.</span>
	{/snippet}

	<div class="trace" aria-live="polite">
		{#if lie && ecriture.note?.ton !== 'refus'}
			<p class="liaison-faite">
				<span><strong>{lie.pseudo}</strong> est relié à <strong>{lie.personnage}</strong>.</span>
				<Tampon cle={lie.id + lie.at}>{signature('admin', lie.par, lie.at)}</Tampon>
			</p>
		{/if}
	</div>

	{#if rien}
		<Vide>Rien n’attend. Le registre est à jour.</Vide>
	{/if}

	{#if data.anomalies.length}
		<Chapitre titre="Reprise à vérifier" id="reprise">
			<ul>
				{#each data.anomalies as anomalie, index (index)}<li>{anomalie.message}</li>{/each}
			</ul>
			<Bouton variante="texte" href="/registre/donnees" fleche="→">Ouvrir les données</Bouton>
		</Chapitre>
	{/if}
	{#if numLiaisons}
		<Chapitre numero={numLiaisons} titre="Liaisons" id="liaisons">
			<p class="consigne">
				Choisis un compte, puis son personnage, puis lie-les. Le joueur verra sa fiche au prochain
				rechargement.
			</p>
			<form method="POST" action="?/lier" use:enhance={ecriture.enhance({ verbe: 'Lié' })}>
				<div class="colonnes">
					<fieldset>
						<legend class="repere">Comptes en attente</legend>
						<ul class="choix">
							{#each pending.pendingAccounts as a (a.id)}
								<li>
									<label class:choisi={compteChoisi === a.id}>
										<input
											type="radio"
											name="accountId"
											value={a.id}
											bind:group={compteChoisi}
											required
										/>
										<span class="marque" aria-hidden="true"></span>
										<span class="nom">{a.pseudo}</span>
										<span class="date"
											>inscrit le {le(a.createdAt)} · {relatif(a.createdAt, maintenant)}</span
										>
									</label>
									<input type="hidden" name={'revision.' + a.id} value={a.revision} />
								</li>
							{/each}
						</ul>
					</fieldset>
					<fieldset>
						<legend class="repere">Personnages sans compte</legend>
						{#if pending.unlinkedCharacters.length}
							<ul class="choix">
								{#each pending.unlinkedCharacters as c (c.id)}
									<li>
										<label class:choisi={personnageChoisi === c.id}>
											<input
												type="radio"
												name="characterId"
												value={c.id}
												bind:group={personnageChoisi}
												required
											/>
											<span class="marque" aria-hidden="true"></span>
											<span class="nom">{c.name}</span>
											<span class="date">{c.oathName}</span>
										</label>
									</li>
								{/each}
							</ul>
						{:else}
							<Vide
								>Aucun personnage n’attend de compte. Il s’écrit d’abord dans La Table ›
								Personnages.</Vide
							>
						{/if}
					</fieldset>
				</div>
				<div class="geste">
					<p class="phrase" aria-live="polite">
						{#if compte && personnage}
							Relier <strong>{compte.pseudo}</strong> à <strong>{personnage.name}</strong>.
						{:else if compte}
							<strong>{compte.pseudo}</strong> attend son personnage.
						{:else}
							Choisis un compte et un personnage.
						{/if}
					</p>
					{#if pending.unlinkedCharacters.length}
						<Bouton variante="tampon" type="submit" disabled={ecriture.enCours}>Lier</Bouton>
					{/if}
				</div>
				{#if ecriture.note && ecriture.note.ton !== 'fait'}
					<NoteDeMarge ton={ecriture.note.ton}>{ecriture.note.texte}</NoteDeMarge>
				{/if}
			</form>
		</Chapitre>
	{/if}

	{#if numResets}
		<Chapitre numero={numResets} titre="Réinitialisations en cours" id="reinitialisations">
			<p class="consigne">
				Un code temporaire a été remis ; le compte doit encore choisir son nouveau mot de passe.
			</p>
			<ul class="lignes">
				{#each pending.openResets as a (a.id)}
					<li>
						<span class="nom">{a.pseudo}</span>
						{#if a.resetExpiresAt && !echu(a.resetExpiresAt)}
							<span class="echeance"
								>code valable jusqu’à <span class="chiffres">{heure(a.resetExpiresAt)}</span></span
							>
						{:else if a.resetExpiresAt}
							<span class="echeance echu"
								>code échu depuis le <span class="chiffres">{leA(a.resetExpiresAt)}</span> — il en faut
								un nouveau</span
							>
						{:else}
							<span class="echeance echu">sans échéance — il faut un nouveau code</span>
						{/if}
						<Bouton
							variante="texte"
							href={'/registre/comptes?q=' + encodeURIComponent(a.pseudo)}
							fleche="→">Ouvrir le compte</Bouton
						>
					</li>
				{/each}
			</ul>
		</Chapitre>
	{/if}
</PageRegistre>

<style>
	.voix-courte {
		color: var(--encre-grise);
	}
	.trace:empty {
		display: none;
	}
	.liaison-faite {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 20px;
		padding: 12px 0;
		border-block: 1px solid var(--reglure);
		font: var(--t-corps);
		color: var(--encre);
	}
	.consigne {
		padding: 12px 0;
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.colonnes {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0 var(--ligne);
	}
	fieldset {
		min-width: 0;
		margin: 0;
		padding: 0;
		border: 0;
	}
	legend {
		padding: 0;
		line-height: var(--ligne);
	}
	.choix {
		border-top: 1px solid var(--reglure);
	}
	.choix li {
		border-bottom: 1px solid var(--reglure);
	}
	.choix label {
		position: relative;
		display: grid;
		grid-template-columns: 20px minmax(0, auto) 1fr;
		align-items: center;
		gap: 0 12px;
		min-height: calc(var(--ligne) * 2);
		padding: 0 12px 0 8px;
		cursor: pointer;
		transition: background 160ms;
	}
	.choix label:hover {
		background: color-mix(in srgb, var(--encre-humide) 6%, transparent);
	}
	.choix input {
		position: absolute;
		opacity: 0;
		width: 1px;
		height: 1px;
	}
	.choix label:has(input:focus-visible) {
		outline: 2px solid var(--encre-humide);
		outline-offset: -2px;
	}
	/* La sélection : un losange d'aurore plein, comme l'onglet courant de la tranche. */
	.marque {
		justify-self: center;
		width: 9px;
		height: 9px;
		border: 1px solid var(--encre-2);
		rotate: 45deg;
		transition:
			background 160ms,
			border-color 160ms;
	}
	.choisi .marque {
		background: var(--encre-humide);
		border-color: var(--encre-humide);
	}
	.choisi {
		background: color-mix(in srgb, var(--encre-humide) 9%, transparent);
	}
	.nom {
		font: 600 15px/24px var(--corps);
		color: var(--encre);
		overflow-wrap: anywhere;
	}
	.date {
		justify-self: end;
		text-align: right;
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.geste {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px 24px;
		padding: var(--ligne) 0 12px;
	}
	.phrase {
		font: var(--t-corps);
		color: var(--encre-2);
	}
	.phrase strong,
	.liaison-faite strong {
		font-weight: 600;
		color: var(--encre);
	}
	.lignes {
		border-top: 1px solid var(--reglure);
	}
	.lignes li {
		display: grid;
		grid-template-columns: minmax(8rem, 1fr) 2fr auto;
		align-items: center;
		gap: 4px 24px;
		min-height: calc(var(--ligne) * 2);
		border-bottom: 1px solid var(--reglure);
	}
	.echeance {
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.echu {
		color: var(--rouille);
	}
	@media (max-width: 760px) {
		.colonnes {
			grid-template-columns: 1fr;
			gap: var(--ligne);
		}
		.choix label {
			grid-template-columns: 20px 1fr;
			padding: 6px 8px;
		}
		.date {
			grid-column: 2;
			justify-self: start;
			text-align: left;
		}
		.lignes li {
			grid-template-columns: 1fr;
			padding: 8px 0;
		}
		.geste :global(.bouton) {
			width: 100%;
			justify-content: center;
		}
	}
</style>
