<script lang="ts">
	// Ma collection : une galerie de feuillets de thèmes. Ceux de ta collection se portent (groupe de
	// boutons radio, clavier compris) ; le carnet se recolore après la réponse du serveur, jamais avant.
	// Les autres se montrent, sans prix ni « débloquer » : un administrateur les donne (03-vision §7).
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import Enveloppe from '$lib/ui/Enveloppe.svelte';
	import Page from '$lib/ui/Page.svelte';
	import Chapitre from '$lib/ui/Chapitre.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import Encre from '$lib/ui/Encre.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import { creerEcriture } from '$lib/ui/ecriture.svelte';
	import { THEMES } from '$lib/ui/themes';
	import { dateLongue } from '$lib/ui/dates';
	import ApercuTheme from './ApercuTheme.svelte';

	let { data } = $props();
	const ecriture = creerEcriture();

	const possedes = $derived(data.themes.filter((t) => t.owned));
	const ailleurs = $derived(data.themes.filter((t) => !t.owned));
	const porte = $derived(data.themes.find((t) => t.active) ?? null);

	// Le choix suit la sélection ; le thème porté est celui que le serveur a noté.
	let choisi = $state(untrack(() => data.themes.find((t) => t.active)?.id ?? 'dark'));
	let formulaire: HTMLFormElement | undefined = $state();
	let enAttente = false;

	function changer() {
		// Une écriture à la fois : un choix fait pendant que l'encre sèche part juste après.
		if (ecriture.enCours) {
			enAttente = true;
			return;
		}
		formulaire?.requestSubmit();
	}
	$effect(() => {
		if (ecriture.enCours || !enAttente) return;
		enAttente = false;
		if (choisi !== porte?.id) formulaire?.requestSubmit();
	});

	// Thème créé dans le Registre (sans règle CSS) : ses huit tokens s'écrivent ici pour que le carnet
	// puisse se recolorer sans rechargement.
	const connus = new Set(THEMES.map((t) => t.id));
	const HEX = /^#[0-9a-fA-F]{3,6}$/;
	const SUR = /^[a-z0-9-]{1,64}$/;
	const stylesCrees = $derived(
		possedes
			.filter((t) => !connus.has(t.id) && SUR.test(t.id))
			.map(
				(t) =>
					`html[data-theme="${t.id}"]{` +
					Object.entries(t.tokens)
						.filter(([k, v]) => /^--[a-z0-9-]+$/.test(k) && HEX.test(v))
						.map(([k, v]) => `${k}:${v}`)
						.join(';') +
					'}'
			)
			.join('')
	);

	// « jusqu’au 1er mai » : le premier du mois s'écrit en ordinal.
	const saison = (iso: string | null) =>
		iso ? `jusqu’au ${dateLongue(iso).replace(/^1 /, '1er ')}` : null;
</script>

<svelte:head>
	<title>Ma collection — Nuages Polaires</title>
	{#if stylesCrees}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- tokens validés (#hex) d'un thème créé -->
		{@html `<style>${stylesCrees}</style>`}
	{/if}
</svelte:head>

<Enveloppe compte={data.compte} discord={data.discord}>
	<Page repere="NP / 07 — Ma collection" titre="Ma" titreVoix="collection.">
		{#snippet marge()}
			<p class="voix">
				Les couleurs de ton carnet. Un thème change les teintes, jamais les mots ni les tampons ;
				l’accueil public garde les siennes.
			</p>
			{#if porte}
				<p class="porte-marge">
					<span class="repere">Porté</span><span class="nom">{porte.name}</span>
				</p>
			{/if}
			<div class="retour">
				<Bouton variante="texte" href="/compte" fleche="→">Mon compte</Bouton>
			</div>
		{/snippet}
		{#snippet bande()}
			{#if porte}<span>Porté : {porte.name}</span>{/if}
		{/snippet}

		<Chapitre
			numero="01"
			titre="Dans ta collection"
			id="collection"
			chapeau="Choisis-en un : le carnet se recolore dès que le serveur l’a noté."
		>
			<div class="reponse" aria-live="polite">
				{#if ecriture.note}
					<NoteDeMarge ton={ecriture.note.ton}>{ecriture.note.texte}</NoteDeMarge>
				{/if}
			</div>
			<form
				method="POST"
				action="?/theme"
				bind:this={formulaire}
				use:enhance={ecriture.enhance({ verbe: 'Porté' })}
			>
				<fieldset class="galerie" role="radiogroup" aria-describedby="consigne">
					<legend class="sr-only">Thème porté</legend>
					<p id="consigne" class="sr-only">
						Les flèches parcourent la collection ; le thème choisi se porte aussitôt.
					</p>
					{#each possedes as theme (theme.id)}
						{@const sechage = ecriture.enCours && choisi === theme.id}
						<label class="feuillet" class:porte={theme.active}>
							<input
								class="sr-only"
								type="radio"
								name="themeId"
								value={theme.id}
								bind:group={choisi}
								onchange={changer}
							/>
							<span class="cadre">
								<ApercuTheme tokens={theme.tokens} nom={theme.name} />
								<span class="legende">
									<span class="titre">{theme.name}</span>
									{#if theme.description}<span class="description">{theme.description}</span>{/if}
									<span class="etat">
										{#if sechage}
											<Encre etat="humide">L’encre sèche…</Encre>
										{:else if theme.active}
											<span class="marque" aria-hidden="true"></span>Porté
										{:else}
											<span
												>Dans ta collection{#if saison(theme.availableUntil)}&nbsp;·&nbsp;{saison(
														theme.availableUntil
													)}{/if}</span
											>
										{/if}
									</span>
								</span>
							</span>
						</label>
					{/each}
				</fieldset>
				<noscript>
					<div class="sans-js"><Bouton variante="ruban" type="submit">Porter ce thème</Bouton></div>
				</noscript>
			</form>
		</Chapitre>

		<Chapitre
			numero="02"
			titre="Les autres thèmes"
			id="ailleurs"
			chapeau="Ils se donnent : un administrateur les offre, ou le carnet les distribue à leur saison."
		>
			{#if ailleurs.length}
				<ul class="galerie">
					{#each ailleurs as theme (theme.id)}
						<li class="feuillet hors">
							<span class="cadre">
								<ApercuTheme tokens={theme.tokens} nom={theme.name} />
								<span class="legende">
									<span class="titre">{theme.name}</span>
									{#if theme.description}<span class="description">{theme.description}</span>{/if}
									<span class="etat"
										><span
											>Hors collection{#if saison(theme.availableUntil)}&nbsp;·&nbsp;{saison(
													theme.availableUntil
												)}{/if}</span
										></span
									>
								</span>
							</span>
						</li>
					{/each}
				</ul>
			{:else}
				<Vide>Tous les thèmes du carnet sont dans ta collection.</Vide>
			{/if}
		</Chapitre>
	</Page>
</Enveloppe>

<style>
	.porte-marge .repere {
		display: block;
	}
	.porte-marge {
		margin-top: var(--ligne);
		padding-top: calc(var(--ligne) / 2);
		border-top: 1px solid var(--reglure);
	}
	.porte-marge .nom {
		display: block;
		font: 500 22px / var(--ligne) var(--voix);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
	}
	.retour {
		margin-top: calc(var(--ligne) / 2);
	}
	.reponse {
		min-height: var(--ligne);
		margin-top: calc(var(--ligne) / 2);
	}

	/* ── La galerie : des feuillets posés côte à côte ── */
	fieldset {
		margin: 0;
		padding: 0;
		border: 0;
		min-width: 0;
	}
	.galerie {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(208px, 1fr));
		gap: var(--ligne) var(--gouttiere);
		padding-top: calc(var(--ligne) / 2);
	}
	.feuillet {
		position: relative;
		display: block;
		min-width: 0;
	}
	label.feuillet {
		cursor: pointer;
	}
	.cadre {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--page-2);
		border: 1px solid var(--reglure);
		border-radius: 0;
		box-shadow: var(--ombre-page);
		transition:
			border-color 160ms,
			translate 160ms;
	}
	label.feuillet:hover .cadre {
		border-color: color-mix(in srgb, var(--encre-humide) 55%, var(--reglure));
		translate: 0 -2px;
	}
	.porte .cadre {
		border-color: var(--encre-humide);
		box-shadow:
			var(--ombre-page),
			inset 0 0 0 1px var(--encre-humide);
	}
	input:focus-visible + .cadre {
		outline: 2px solid var(--encre-humide);
		outline-offset: 3px;
	}
	.legende {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 14px 16px 16px;
		flex: 1;
	}
	.titre {
		font: 500 22px / var(--ligne) var(--voix);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
	}
	.description {
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}
	.etat {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: auto;
		padding-top: 10px;
		font: var(--t-repere);
		font-variant-numeric: lining-nums tabular-nums;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--encre-grise);
	}
	.porte .etat {
		color: var(--encre-humide);
	}
	.marque {
		width: 5px;
		height: 5px;
		rotate: 45deg;
		background: var(--encre-humide);
	}
	.hors .cadre {
		box-shadow: none;
	}
	.sans-js {
		margin-top: var(--ligne);
	}

	@media (max-width: 760px) {
		.galerie {
			grid-template-columns: minmax(0, 1fr);
			gap: 16px 12px;
		}
		.legende {
			padding: 10px 12px 12px;
		}
		.titre {
			font-size: 19px;
			line-height: 24px;
		}
		.description {
			display: block;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		label.feuillet:hover .cadre {
			translate: none;
		}
	}
</style>
