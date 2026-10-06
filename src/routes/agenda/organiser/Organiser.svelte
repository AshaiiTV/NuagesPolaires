<script lang="ts">
	import { resolve } from '$app/paths';
	import { chemin } from '$lib/ui/adresse';
	import { phrasePlaces } from '../agenda';
	import { signature } from '$lib/ui/tampons';
	// « Organiser » (régime serré) : à gauche le registre des rendez-vous, masqués compris ; à droite la
	// page de saisie (nouveau rendez-vous, ou celui qu'on a ouvert). Chaque enregistrement confirmé par
	// le serveur s'imprime d'un tampon sur sa ligne.
	import Page from '$lib/ui/Page.svelte';
	import Chapitre from '$lib/ui/Chapitre.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import Losange from '$lib/ui/Losange.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import Tampon from '$lib/ui/Tampon.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import { dateCourte, heureRonde, jourSemaine } from '$lib/ui/dates';
	import type { EventRowView } from '$lib/schemas/events';
	import { teinte } from '../agenda';
	import type { DonneesOrganiser, RetourOrganiser } from './serveur';
	import Saisie from './Saisie.svelte';

	interface Props {
		data: DonneesOrganiser & { evenement?: EventRowView };
		form: RetourOrganiser | null | undefined;
	}
	let { data, form }: Props = $props();

	const ouvert = $derived(data.evenement ?? null);

	/** Le dernier enregistrement confirmé : son tampon s'imprime sur sa ligne. */
	const confirme = $derived(form && 'geste' in form ? form : null);
	function tamponDe(id: string): string | null {
		if (!confirme || confirme.eventId !== id) return null;
		return signature(data.signataire.role, data.signataire.pseudo, confirme.at);
	}
	const gesteConfirme = $derived(
		confirme?.geste === 'masquer'
			? confirme.hidden
				? 'Masqué'
				: 'Visible'
			: confirme?.geste === 'prevenir'
				? 'Prévenu'
				: 'Noté'
	);
	const echecAnnonce = $derived(
		confirme?.geste === 'creer' && confirme.notifyError
			? { id: confirme.eventId, texte: confirme.notifyError }
			: null
	);

	function quand(ev: EventRowView): string {
		if (!ev.startsAt) return '';
		return `${jourSemaine(ev.startsAt).slice(0, 3)}. ${dateCourte(ev.startsAt, data.lu)} · ${heureRonde(ev.startsAt)}`;
	}
	function places(ev: EventRowView): string {
		return phrasePlaces(ev.count, ev.capacity);
	}
	const page = $derived(data.pagePasses);
	const base = $derived(ouvert ? `/agenda/organiser/${ouvert.id}` : '/agenda/organiser');
</script>

<svelte:head
	><title>{ouvert ? `${ouvert.title} — Organiser` : 'Organiser'} — Nuages Polaires</title
	></svelte:head
>

{#snippet ligne(ev: EventRowView, passe: boolean)}
	{@const marque = tamponDe(ev.id)}
	<li class="rdv" class:passe class:courant={ouvert?.id === ev.id}>
		<a
			href={chemin(`/agenda/organiser/${ev.id}`)}
			aria-current={ouvert?.id === ev.id ? 'page' : undefined}
		>
			<span class="quand chiffres"
				>{#if ev.startsAt}{quand(ev)}{:else}<em>Date à confirmer</em>{/if}</span
			>
			<span class="titre">{ev.title}</span>
			<span class="meta">
				<Losange couleur={teinte(ev.typeColor)} libelle={ev.typeLabel} />
				<span class="places chiffres">{places(ev)}</span>
				{#if ev.hidden}<span class="masque">masqué</span>{/if}
			</span>
		</a>
		{#if marque}
			<span class="marque"
				>{gesteConfirme} · <Tampon cle={ev.id + confirme?.at}>{marque}</Tampon></span
			>
		{/if}
		{#if echecAnnonce?.id === ev.id}
			<p class="annonce">{echecAnnonce.texte}</p>
		{/if}
	</li>
{/snippet}

<Page repere="NP / 04 — Agenda" titre="Organiser">
	{#snippet marge()}
		<div class="fil">
			<a href={resolve('/agenda')}><span aria-hidden="true">←</span> Agenda</a>
			<span>Les dates sont à l’heure de Paris.</span>
			{#if !data.peutPrevenir}<span>Les MJ et les administrateurs préviennent les joueurs.</span
				>{/if}
		</div>
	{/snippet}

	{#if data.raye}
		<NoteDeMarge ton="fait"
			>Rayé — « {data.raye} » sort de l’agenda ; sa trace reste dans le journal d’audit.</NoteDeMarge
		>
	{/if}

	<div class="atelier" class:ouvert>
		<div class="registre">
			<Chapitre numero="01" titre="Rendez-vous">
				{#snippet actions()}
					{#if ouvert}<a class="nouveau" href={resolve('/agenda/organiser')}>Nouveau rendez-vous</a
						>{/if}
				{/snippet}
				{#if data.agenda.upcoming.length}
					<ol class="liste">
						{#each data.agenda.upcoming as ev (ev.id)}{@render ligne(ev, false)}{/each}
					</ol>
				{:else}
					<Vide>Rien de prévu. Le monde attend.</Vide>
				{/if}

				{#if data.agenda.past.length}
					<h3 class="filet-passes" id="passes">Passés</h3>
					<ol class="liste">
						{#each data.agenda.past as ev (ev.id)}{@render ligne(ev, true)}{/each}
					</ol>
					{#if data.agenda.pastPages > 1}
						<nav class="pages" aria-label="Pages des rendez-vous passés">
							{#if page > 1}<a href={chemin(`${base}?passes=${page - 1}#passes`)} rel="prev"
									>← Page précédente</a
								>{/if}
							<span class="folio chiffres">page {page} sur {data.agenda.pastPages}</span>
							{#if page < data.agenda.pastPages}<a
									href={chemin(`${base}?passes=${page + 1}#passes`)}
									rel="next">Page suivante →</a
								>{/if}
						</nav>
					{/if}
				{/if}
			</Chapitre>
		</div>

		<div class="page-saisie">
			<Chapitre numero="02" titre={ouvert ? 'Le rendez-vous' : 'Nouveau rendez-vous'}>
				{#if ouvert}
					<p class="ouvert-titre">{ouvert.title}</p>
					<p class="ouvert-meta">
						{#if ouvert.startsAt}<span class="chiffres"
								>{dateCourte(ouvert.startsAt, data.lu)} · {heureRonde(ouvert.startsAt)}</span
							>{:else}<span>Date à confirmer</span>{/if}
						{#if ouvert.organizerStamp}<Tampon cle={ouvert.id}
								>{signature(
									ouvert.organizerStamp.role,
									ouvert.organizerStamp.pseudo,
									ouvert.organizerStamp.at
								)}</Tampon
							>{:else if ouvert.organizer}<span>organisé par {ouvert.organizer}</span>{/if}
						<span>
							{#if ouvert.participants.length}
								Inscrits : {ouvert.participants.map((p) => p.name).join(', ')}
							{:else}
								Personne n’est encore inscrit.
							{/if}
						</span>
					</p>
				{/if}
				{#key ouvert?.id ?? 'nouveau'}
					<Saisie evenement={ouvert} peutPrevenir={data.peutPrevenir} lu={data.lu} />
				{/key}
				{#if !ouvert}
					<p class="rappel">
						Un rendez-vous noté apparaît dans l’agenda de chaque compte, sauf s’il est masqué.
					</p>
				{/if}
			</Chapitre>
		</div>
	</div>

	{#snippet pied()}
		<Bouton variante="texte" href="/agenda" fleche="→">Voir l’agenda comme les joueurs</Bouton>
	{/snippet}
</Page>

<style>
	.fil {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0 24px;
		margin-top: -12px;
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}
	.fil a {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: var(--cible);
		color: var(--encre);
		text-decoration: none;
	}
	.fil a:hover {
		color: var(--encre-humide);
	}

	/* ── Deux colonnes : registre (5) et saisie (7) ─────────────────── */
	.atelier {
		display: grid;
		grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
		gap: 0 calc(var(--gouttiere) * 3);
		align-items: start;
	}
	.page-saisie {
		position: sticky;
		top: var(--ligne);
	}
	.nouveau {
		display: inline-flex;
		align-items: center;
		min-height: var(--cible);
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
	}

	/* ── Registre ───────────────────────────────────────────────────── */
	.rdv {
		position: relative;
		border-bottom: 1px solid var(--reglure);
	}
	.rdv a {
		display: grid;
		grid-template-columns: 132px minmax(0, 1fr);
		grid-template-areas:
			'quand titre'
			'quand meta';
		column-gap: 16px;
		padding: 12px 12px 11px;
		margin: 0 -12px;
		color: inherit;
		text-decoration: none;
		transition: background 160ms;
	}
	.rdv a:hover {
		background: color-mix(in srgb, var(--encre) 4%, transparent);
	}
	.rdv.courant a {
		background: color-mix(in srgb, var(--encre-humide) 8%, transparent);
		box-shadow: inset 2px 0 0 var(--encre-humide);
	}
	.quand {
		grid-area: quand;
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		line-height: var(--ligne);
		color: var(--encre-2);
	}
	.quand em {
		font-style: italic;
	}
	.titre {
		grid-area: titre;
		font: 600 14px / var(--ligne) var(--corps);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
		overflow-wrap: anywhere;
	}
	.meta {
		grid-area: meta;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0 14px;
		min-height: var(--ligne);
	}
	.places {
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}
	.masque {
		padding: 0 6px;
		border: 1px dashed var(--encre-2);
		border-radius: var(--rayon);
		font: var(--t-repere);
		font-variant-numeric: lining-nums tabular-nums;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--encre-2);
	}
	.marque {
		position: absolute;
		top: 12px;
		right: 0;
		pointer-events: none;
	}
	.annonce {
		padding: 0 0 12px 148px;
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--rouille);
	}
	.passe .titre,
	.passe .quand {
		color: var(--encre-grise);
	}
	.passe .titre {
		font-weight: 500;
	}
	.filet-passes {
		margin-top: var(--ligne);
		padding: 12px 0 11px;
		border-top: 3px double var(--reglure);
		border-bottom: 1px solid var(--reglure);
		font: var(--t-repere);
		font-variant-numeric: lining-nums tabular-nums;
		letter-spacing: var(--approche-repere);
		text-transform: uppercase;
		color: var(--encre-grise);
	}
	.pages {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0 24px;
	}
	.pages a {
		display: inline-flex;
		align-items: center;
		min-height: var(--cible);
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
	}
	.pages a[rel='next'] {
		margin-left: auto;
	}
	.folio {
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-grise);
	}

	/* ── Saisie ─────────────────────────────────────────────────────── */
	.ouvert-titre {
		padding-top: 12px;
		font: 500 28px/36px var(--voix);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
		overflow-wrap: anywhere;
	}
	.ouvert-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0 20px;
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		line-height: var(--ligne);
		color: var(--encre-2);
	}
	.rappel {
		margin-top: var(--ligne);
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}

	@media (max-width: 1100px) {
		.atelier {
			grid-template-columns: minmax(0, 1fr);
		}
		.page-saisie {
			position: static;
		}
		/* Un rendez-vous ouvert : sa page d'abord, le registre ensuite. */
		.ouvert .page-saisie {
			order: -1;
		}
	}
	@media (max-width: 760px) {
		.rdv a {
			grid-template-columns: minmax(0, 1fr);
			grid-template-areas:
				'quand'
				'titre'
				'meta';
			padding-right: 12px;
		}
		.marque {
			top: 10px;
		}
		.annonce {
			padding-left: 0;
		}
	}
</style>
