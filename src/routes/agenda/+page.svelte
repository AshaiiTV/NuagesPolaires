<script lang="ts">
	import { resolve } from '$app/paths';
	import { chemin } from '$lib/ui/adresse';
	// Agenda (03-vision §5.6) : les rendez-vous de la table Discord. Marge : le mois, le fuseau, l'accès
	// « Organiser » pour qui en a le droit. Corps : « À venir » (une ligne datée par rendez-vous),
	// puis, sous un filet, « Passés » en encre grise, 8 par page.
	import type { SubmitFunction } from '@sveltejs/kit';
	import { invalidateAll } from '$app/navigation';
	import Page from '$lib/ui/Page.svelte';
	import Chapitre from '$lib/ui/Chapitre.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import { creerEcriture } from '$lib/ui/ecriture.svelte';
	import { heure, mois } from '$lib/ui/dates';
	import Ligne from './Ligne.svelte';
	import { cleMois } from './agenda';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const ecriture = creerEcriture();
	/** La ligne qui porte l'écriture en cours (une seule à la fois) et le geste demandé. */
	let actif = $state<{ id: string; geste: 'venir' | 'rayer' } | null>(null);

	function participer(id: string, geste: 'venir' | 'rayer'): SubmitFunction {
		const base = ecriture.enhance({ verbe: geste === 'venir' ? 'Tu viens' : 'Rayé' });
		return (entree) => {
			if (!ecriture.enCours) actif = { id, geste };
			const suite = base(entree);
			if (typeof suite !== 'function') return suite;
			return async (sortie) => {
				await suite(sortie);
				// Place prise ou page réécrite entre-temps : on relit l'agenda pour montrer l'état vrai.
				if (sortie.result.type === 'failure' && sortie.result.status === 409) await invalidateAll();
			};
		};
	}

	// Une confirmation est une heure, pas une fanfare : la note se retire d'elle-même.
	$effect(() => {
		if (ecriture.note?.ton !== 'fait') return;
		const minuterie = setTimeout(() => ecriture.effacer(), 6000);
		return () => clearTimeout(minuterie);
	});

	const moisCourant = $derived(mois(data.lu));
	const releve = $derived(heure(data.lu));
	// Synchronisation interrompue : le serveur n'a pas répondu (réseau, panne), pas un refus métier.
	const interrompu = $derived(ecriture.note?.ton === 'refus' && !ecriture.note.code);

	/** Filet de mois quand un rendez-vous ouvre un autre mois que le précédent. */
	const aVenir = $derived(
		data.agenda.upcoming.map((ev, i, liste) => {
			const cle = cleMois(ev.startsAt);
			const avant = i === 0 ? cleMois(data.lu) : cleMois(liste[i - 1].startsAt);
			return { ev, filet: cle !== null && cle !== avant ? mois(ev.startsAt) : null };
		})
	);
	const page = $derived(data.pagePasses);
</script>

<svelte:head><title>Agenda — Nuages Polaires</title></svelte:head>

<Page repere="NP / 04 — Agenda" titre="Agenda" grain>
	{#snippet marge()}
		<p class="mois-courant">{moisCourant}</p>
		<p class="fuseau">Les dates sont à l’heure de Paris.</p>
		{#if interrompu}
			<p class="retard marge-retard" role="status">Les rendez-vous affichés datent de {releve}.</p>
		{/if}
		<nav class="sommaire" aria-label="Chapitres de l’agenda">
			<a href="#a-venir">À venir</a>
			{#if data.agenda.past.length}<a href="#passes">Passés</a>{/if}
		</nav>
		{#if data.organiser}
			<div class="organiser">
				<Bouton variante="texte" href="/agenda/organiser" fleche="→">Organiser</Bouton>
			</div>
		{/if}
	{/snippet}
	{#snippet bande()}
		<span class="bande-mois">{moisCourant}</span>
		<span>Heure de Paris</span>
		{#if interrompu}<span class="retard">Les rendez-vous affichés datent de {releve}.</span>{/if}
		{#if data.organiser}<a class="bande-lien" href={resolve('/agenda/organiser')}>Organiser →</a
			>{/if}
	{/snippet}

	<Chapitre titre="À venir" id="a-venir">
		{#if !data.relie}
			<div class="entete-attente">
				<p class="attente">Ton compte attend sa liaison pour venir.</p>
				<Bouton variante="texte" href="/univers/premiers-pas" fleche="→">Premiers pas</Bouton>
			</div>
		{/if}
		{#if aVenir.length}
			<ol class="liste">
				{#each aVenir as { ev, filet } (ev.id)}
					{#if filet}<li class="filet-mois" aria-hidden="true"><span>{filet}</span></li>{/if}
					<Ligne
						{ev}
						lu={data.lu}
						relie={data.relie}
						tampon={data.tampons[ev.id] ?? null}
						active={actif?.id === ev.id}
						etat={ecriture.etat}
						note={actif?.id === ev.id ? ecriture.note : null}
						geste={actif?.id === ev.id ? actif.geste : null}
						participer={(geste) => participer(ev.id, geste)}
					/>
				{/each}
			</ol>
		{:else}
			<Vide>
				Rien de prévu. Le monde attend.
				{#snippet action()}
					{#if data.organiser}<Bouton variante="texte" href="/agenda/organiser" fleche="→"
							>Organiser un rendez-vous</Bouton
						>{/if}
				{/snippet}
			</Vide>
		{/if}
	</Chapitre>

	{#if data.agenda.past.length}
		<section class="passes" id="passes" aria-labelledby="titre-passes" tabindex="-1">
			<h2 id="titre-passes">Passés</h2>
			<ol class="liste">
				{#each data.agenda.past as ev (ev.id)}
					<Ligne
						{ev}
						lu={data.lu}
						relie={data.relie}
						tampon={data.tampons[ev.id] ?? null}
						passe
						participer={(geste) => participer(ev.id, geste)}
					/>
				{/each}
			</ol>
			{#if data.agenda.pastPages > 1}
				<nav class="pages" aria-label="Pages des rendez-vous passés">
					{#if page > 1}
						<a href={chemin(`/agenda?passes=${page - 1}#passes`)} rel="prev"
							><span aria-hidden="true">←</span> Page précédente</a
						>
					{/if}
					<span class="folio chiffres">page {page} sur {data.agenda.pastPages}</span>
					{#if page < data.agenda.pastPages}
						<a href={chemin(`/agenda?passes=${page + 1}#passes`)} rel="next"
							>Page suivante <span aria-hidden="true">→</span></a
						>
					{/if}
				</nav>
			{/if}
		</section>
	{/if}
</Page>

<style>
	/* ── Marge ─────────────────────────────────────────────────────────── */
	.mois-courant {
		margin-top: calc(var(--ligne) / 2);
		font: 500 34px/42px var(--voix);
		letter-spacing: -0.01em;
		color: var(--encre);
	}
	.mois-courant::first-letter {
		text-transform: uppercase;
	}
	.fuseau {
		margin-top: calc(var(--ligne) / 2);
		line-height: var(--ligne);
		color: var(--encre-2);
	}
	.retard {
		color: var(--rouille);
	}
	.marge-retard {
		margin-top: var(--ligne);
	}
	.sommaire {
		display: flex;
		flex-direction: column;
		margin-top: var(--ligne);
		border-top: 1px solid var(--reglure);
	}
	.sommaire a {
		display: flex;
		align-items: center;
		min-height: var(--cible);
		border-bottom: 1px solid var(--reglure);
		font: var(--t-libelle);
		color: var(--encre);
		text-decoration: none;
	}
	.sommaire a:hover {
		color: var(--encre-humide);
	}
	.organiser {
		margin-top: var(--ligne);
	}

	/* ── Bande du téléphone ───────────────────────────────────────────── */
	.bande-mois::first-letter {
		text-transform: uppercase;
	}
	.bande-mois {
		color: var(--encre);
	}
	.bande-lien {
		display: inline-flex;
		align-items: center;
		min-height: var(--cible);
		margin-top: -12px;
		margin-bottom: -12px;
		color: var(--encre);
	}

	/* ── Lecture seule ────────────────────────────────────────────────── */
	.attente {
		font: var(--t-recit);
		font-style: italic;
		color: var(--encre);
	}
	.entete-attente {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0 24px;
		padding: calc(var(--ligne) / 2) 0;
		border-bottom: 1px solid var(--reglure);
	}

	/* ── Listes ───────────────────────────────────────────────────────── */
	.liste {
		counter-reset: none;
	}
	.filet-mois {
		display: flex;
		align-items: flex-end;
		height: calc(var(--ligne) * 2);
		padding-bottom: 6px;
		border-bottom: 1px solid var(--reglure);
	}
	.filet-mois span {
		font: var(--t-repere);
		letter-spacing: var(--approche-repere);
		text-transform: uppercase;
		color: var(--encre-2);
	}

	/* « Passés » : sous un filet double, en encre grise. */
	.passes {
		margin-top: calc(var(--ligne) * 2);
		outline: none;
	}
	.passes h2 {
		display: flex;
		align-items: flex-end;
		min-height: calc(var(--ligne) * 2);
		padding-bottom: 8px;
		border-top: 3px double var(--reglure);
		border-bottom: 1px solid var(--reglure);
		font: 500 24px / var(--ligne) var(--voix);
		font-style: italic;
		color: var(--encre-2);
	}
	.pages {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0 28px;
		margin-top: calc(var(--ligne) / 2);
	}
	.pages a {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		min-height: var(--cible);
		font: 500 14px/20px var(--corps);
		color: var(--encre);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--encre-humide) 45%, transparent);
	}
	.pages a[rel='next'] {
		margin-left: auto;
	}
	.folio {
		font: var(--t-libelle);
		color: var(--encre-grise);
	}
</style>
