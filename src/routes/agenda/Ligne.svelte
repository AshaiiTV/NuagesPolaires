<script lang="ts">
	// Une ligne d'agenda : bloc-date en marge gauche, puis le rendez-vous écrit comme une entrée de
	// carnet (titre, type, places, inscrits nommés, salon, tampon de l'organisateur), et le geste
	// d'inscription. L'état « Tu viens » ne s'écrit qu'après la réponse du serveur.
	import type { SubmitFunction } from '@sveltejs/kit';
	import { enhance } from '$app/forms';
	import Bouton from '$lib/ui/Bouton.svelte';
	import Encre from '$lib/ui/Encre.svelte';
	import Losange from '$lib/ui/Losange.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import Tampon from '$lib/ui/Tampon.svelte';
	import type { EtatEncre } from '$lib/ui/Encre.svelte';
	import type { NoteEcriture } from '$lib/ui/ecriture.svelte';
	import { heureRonde, jourSemaine } from '$lib/ui/dates';
	import { signature } from '$lib/ui/tampons';
	import { type RoleCompte } from '$lib/ui/navigation';
	import type { EventRowView } from '$lib/schemas/events';
	import { blocDate, phrasePasses, phrasePlaces, teinte } from './agenda';

	interface Props {
		ev: EventRowView;
		/** Instant de la lecture (bloc-date : année affichée si elle diffère). */
		lu: string;
		passe?: boolean;
		/** Le compte a un personnage relié (sinon : lecture seule). */
		relie: boolean;
		/** Tampon de l'organisateur : rôle, pseudo, jour d'écriture (« MJ Maitre · 26 sept. »). */
		tampon?: { role: RoleCompte; pseudo: string; at: string } | null;
		/** Cette ligne porte l'écriture en cours ou la dernière réponse. */
		active?: boolean;
		etat?: EtatEncre;
		note?: NoteEcriture | null;
		/** Dernier geste confirmé sur cette ligne. */
		geste?: 'venir' | 'rayer' | null;
		participer: (geste: 'venir' | 'rayer') => SubmitFunction;
	}
	let {
		ev,
		lu,
		passe = false,
		relie,
		tampon = null,
		active = false,
		etat = 'prise',
		note = null,
		geste = null,
		participer
	}: Props = $props();

	const bloc = $derived(blocDate(ev.startsAt, lu));
	const quand = $derived(
		ev.startsAt ? `${jourSemaine(ev.startsAt)} · ${heureRonde(ev.startsAt)}` : null
	);
	const humide = $derived(active && etat === 'humide');
	// Une description courte se lit d'un trait ; une longue se replie.
	const longue = $derived(ev.description.length > 110 || ev.description.includes('\n'));
	const titreId = $derived(`rdv-${ev.id}`);
</script>

<li class="rdv" class:inscrit={ev.registered} class:passe class:active aria-labelledby={titreId}>
	<div class="date">
		{#if bloc}
			<time datetime={ev.startsAt}>
				<span class="jour chiffres">{bloc.jour}</span>
				<span class="mois"
					>{bloc.mois}{#if bloc.annee}<span class="annee"> {bloc.annee}</span>{/if}</span
				>
				<span class="semaine">{bloc.semaine}</span>
			</time>
		{:else}
			<span class="a-fixer"><span>Date</span><span>à fixer</span></span>
		{/if}
	</div>

	<div class="ecrit">
		<h3 class="titre" id={titreId}>{ev.title}</h3>
		<p class="meta">
			<Losange couleur={teinte(ev.typeColor)} libelle={ev.typeLabel} />
			{#if quand}<span class="quand chiffres">{quand}</span>{:else}<span class="quand"
					>Date à confirmer</span
				>{/if}
			{#if ev.hidden}<span class="masque">Masqué · visible de ceux qui organisent</span>{/if}
		</p>
		<p class="places chiffres">
			<span class="compte"
				>{passe ? phrasePasses(ev.count) : phrasePlaces(ev.count, ev.capacity)}</span
			>
			{#if ev.participants.length}
				<span class="noms">
					{#each ev.participants as p, i (i)}<span class="nom" class:moi={p.me}
							>{p.name}{#if p.me}<span class="toi">&nbsp;·&nbsp;toi</span>{/if}</span
						>{#if i < ev.participants.length - 1},&nbsp;{/if}{/each}
				</span>
			{/if}
		</p>

		{#if ev.description}
			{#if longue}
				<details class="description">
					<summary
						><span>Lire la description</span><span class="pli" aria-hidden="true"></span></summary
					>
					<p>{ev.description}</p>
				</details>
			{:else}
				<p class="description courte">{ev.description}</p>
			{/if}
		{/if}

		<div class="pied">
			{#if !passe && ev.discordUrl}
				<Bouton
					variante="texte"
					href={ev.discordUrl}
					fleche="↗"
					target="_blank"
					rel="noopener noreferrer">Ouvrir le salon</Bouton
				>
			{/if}
			{#if passe && ev.recitId}
				<Bouton variante="texte" href="/carnet/recits/{ev.recitId}" fleche="→">Lire le récit</Bouton
				>
			{/if}
		</div>
	</div>

	{#if tampon}
		<p class="organise">
			<span class="par">organisé par</span><Tampon cle={ev.id}
				>{signature(tampon.role, tampon.pseudo, tampon.at)}</Tampon
			>
		</p>
	{:else if ev.organizerStamp}
		<p class="organise">
			<Tampon cle={ev.id}
				>{signature(ev.organizerStamp.role, ev.organizerStamp.pseudo, ev.organizerStamp.at)}</Tampon
			>
		</p>
	{:else if ev.organizer}
		<p class="organise">
			<span class="par">organisé par</span><span>{ev.organizer}</span>
		</p>
	{/if}

	{#if !passe}
		<div class="geste">
			{#if ev.registered}
				<form method="POST" action="?/participer" use:enhance={participer('rayer')}>
					<input type="hidden" name="eventId" value={ev.id} />
					<input type="hidden" name="participating" value="false" />
					<input type="hidden" name="expectedRevision" value={ev.revision} />
					<p class="viens">
						<Encre etat={humide ? 'humide' : 'prise'}><span class="tu-viens">Tu viens</span></Encre>
						{#if ev.canRegister}
							<span class="point" aria-hidden="true">·</span>
							<Bouton variante="texte" type="submit" disabled={humide}>Rayer ma place</Bouton>
						{/if}
					</p>
				</form>
			{:else if ev.canRegister}
				<form method="POST" action="?/participer" use:enhance={participer('venir')}>
					<input type="hidden" name="eventId" value={ev.id} />
					<input type="hidden" name="participating" value="true" />
					<input type="hidden" name="expectedRevision" value={ev.revision} />
					<Bouton variante="ruban" type="submit" disabled={humide} aria-describedby={titreId}>
						{#if humide}<Encre etat="humide">Je viens</Encre>{:else}Je viens{/if}
					</Bouton>
				</form>
			{:else if ev.closedReason === 'undated'}
				<p class="ferme">Date à confirmer · inscriptions fermées</p>
			{:else if ev.closedReason === 'full' || (ev.capacity > 0 && ev.count >= ev.capacity)}
				<p class="ferme complet">Complet</p>
			{:else if ev.hidden && relie}
				<p class="ferme">Inscriptions fermées tant qu’il est masqué</p>
			{/if}
		</div>
	{/if}

	{#if active && note}
		<div class="note">
			<NoteDeMarge ton={note.ton}>
				{#if note.ton === 'fait'}
					{geste === 'rayer'
						? 'Rayé. Ta place est libre.'
						: 'Tu viens. Le rendez-vous est en marge de ton carnet.'}
				{:else}
					{note.texte}
				{/if}
			</NoteDeMarge>
		</div>
	{/if}
</li>

<style>
	/* Une ligne = une entrée de carnet : bloc-date dans sa propre marge, filet vertical, écrit, geste. */
	.rdv {
		display: grid;
		grid-template-columns: 76px minmax(0, 1fr) auto;
		grid-template-rows: auto 1fr auto;
		grid-template-areas:
			'date ecrit geste'
			'date ecrit tampon'
			'date note note';
		column-gap: var(--gouttiere);
		padding: calc(var(--ligne) / 2) 0 calc(var(--ligne) / 2 - 1px);
		border-bottom: 1px solid var(--reglure);
	}
	.rdv.inscrit .date {
		box-shadow: inset 2px 0 var(--ruban);
	}
	.date {
		grid-area: date;
		padding-right: 16px;
		border-right: 1px solid var(--reglure);
		text-align: right;
	}
	time,
	.a-fixer {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
	}
	.jour {
		font: var(--t-chiffre);
		font-variant-numeric: oldstyle-nums proportional-nums;
		line-height: 56px;
		color: var(--encre);
	}
	.mois,
	.semaine,
	.a-fixer {
		font: var(--t-repere);
		font-variant-numeric: lining-nums tabular-nums;
		letter-spacing: var(--approche-repere);
		text-transform: uppercase;
	}
	.mois {
		color: var(--encre);
	}
	.annee {
		color: var(--encre-2);
	}
	.semaine {
		margin-top: 4px;
		color: var(--encre-2);
	}
	.a-fixer {
		padding-top: 12px;
		color: var(--encre-2);
		line-height: 20px;
	}
	.ecrit {
		grid-area: ecrit;
		min-width: 0;
	}
	.titre {
		padding-top: 10px;
		font: 500 22px / var(--ligne) var(--voix);
		font-variant-numeric: lining-nums tabular-nums;
		letter-spacing: -0.005em;
		color: var(--encre);
		overflow-wrap: break-word;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0 16px;
		min-height: var(--ligne);
		margin-top: 4px;
	}
	.quand {
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}
	.masque {
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		font-style: italic;
		color: var(--encre-2);
	}
	.places {
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		line-height: var(--ligne);
		color: var(--encre-2);
	}
	.compte {
		color: var(--encre);
	}
	.noms::before {
		content: '—';
		margin: 0 0.5em;
		color: var(--encre-2);
	}
	.nom {
		white-space: nowrap;
	}
	.toi {
		color: var(--encre-humide);
	}
	.description {
		max-width: var(--lecture);
		margin-top: 4px;
	}
	.courte,
	.description p {
		font: var(--t-recit);
		font-variant-numeric: lining-nums tabular-nums;
		font-style: italic;
		color: var(--encre-2);
		white-space: pre-line;
	}
	summary {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		min-height: var(--cible);
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
		cursor: pointer;
		list-style: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	summary:hover {
		color: var(--encre);
	}
	.pli {
		width: 7px;
		height: 7px;
		border-right: 1px solid currentColor;
		border-bottom: 1px solid currentColor;
		rotate: 45deg;
		translate: 0 -2px;
		transition: rotate 200ms;
	}
	details[open] .pli {
		rotate: -135deg;
		translate: 0 2px;
	}
	.pied {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 28px;
	}
	.pied:empty {
		display: none;
	}
	.organise {
		grid-area: tampon;
		align-self: end;
		justify-self: end;
		display: inline-flex;
		align-items: center;
		gap: 10px;
		min-height: var(--cible);
	}
	.par {
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}
	.geste {
		grid-area: geste;
		display: flex;
		align-items: flex-start;
		justify-content: flex-end;
		padding-top: 6px;
	}
	.geste:empty {
		display: none;
	}
	.viens {
		display: flex;
		align-items: center;
		gap: 10px;
		white-space: nowrap;
	}
	.tu-viens {
		font: italic 500 20px / var(--cible) var(--voix);
		font-variant-numeric: lining-nums tabular-nums;
	}
	.point {
		color: var(--encre-2);
	}
	.ferme {
		max-width: 22ch;
		min-height: var(--cible);
		display: flex;
		align-items: center;
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
		text-align: right;
	}
	.complet {
		font: var(--t-repere);
		font-variant-numeric: lining-nums tabular-nums;
		letter-spacing: var(--approche-repere);
		text-transform: uppercase;
		color: var(--encre);
	}
	.note {
		grid-area: note;
	}

	/* Passés : encre grise, sans geste. */
	.passe .jour,
	.passe .mois,
	.passe .titre,
	.passe .compte {
		color: var(--encre-2);
	}
	.passe .semaine,
	.passe .places,
	.passe .quand {
		color: var(--encre-grise);
	}
	.passe .titre {
		font-size: 20px;
	}

	@media (max-width: 760px) {
		.rdv {
			grid-template-columns: 56px minmax(0, 1fr);
			grid-template-rows: auto;
			grid-template-areas:
				'date ecrit'
				'date tampon'
				'date geste'
				'date note';
			column-gap: 14px;
		}
		.date {
			padding-right: 12px;
		}
		.titre {
			padding-top: 8px;
			font-size: 20px;
		}
		.geste {
			justify-content: flex-start;
			padding-top: 4px;
		}
		.ferme {
			max-width: none;
			text-align: left;
		}
		.organise {
			justify-self: start;
		}
	}
</style>
