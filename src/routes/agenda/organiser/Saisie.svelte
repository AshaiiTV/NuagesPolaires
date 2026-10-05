<script lang="ts">
	// Le formulaire d'un rendez-vous, écrit sur la réglure (03-vision §5.6 « Organiser ») : titre, type,
	// date et heure (heure de Paris), places, description, lien du salon, visibilité, et pour les MJ et
	// les administrateurs « Prévenir les joueurs à la création ». Un rendez-vous ouvert porte aussi ses
	// gestes : masquer ou rendre visible, prévenir, rayer (confirmation en ligne).
	// Le brouillon est tenu ici : un refus ou un conflit ne l'efface jamais.
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Bouton from '$lib/ui/Bouton.svelte';
	import Champ from '$lib/ui/Champ.svelte';
	import Encre from '$lib/ui/Encre.svelte';
	import Losange from '$lib/ui/Losange.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import { creerEcriture } from '$lib/ui/ecriture.svelte';
	import { dateHeure, versChampLocal } from '$lib/ui/dates';
	import { EVENT_EDITOR_MESSAGES } from '$lib/game/events';
	import { DISCORD_URL_MESSAGE } from '$lib/schemas/reading';
	import type { EventRowView } from '$lib/schemas/events';
	import { TYPES } from '../agenda';

	interface Props {
		/** Rendez-vous ouvert ; absent : nouveau rendez-vous. */
		evenement?: EventRowView | null;
		peutPrevenir: boolean;
		/** Instant de la lecture (le rendez-vous est-il passé ?). */
		lu: string;
	}
	let { evenement = null, peutPrevenir, lu }: Props = $props();

	interface Brouillon {
		titre: string;
		type: string;
		date: string;
		heure: string;
		places: string;
		description: string;
		salon: string;
		visibilite: 'visible' | 'masque';
	}

	function depuis(ev: EventRowView | null): Brouillon {
		const local = ev?.startsAt ? versChampLocal(ev.startsAt) : '';
		return {
			titre: ev?.title ?? '',
			type: ev?.type ?? 'combat',
			date: local ? local.slice(0, 10) : '',
			heure: local ? local.slice(11, 16) : '',
			places: String(ev?.capacity ?? 0),
			description: ev?.description ?? '',
			salon: ev?.discordUrl ?? '',
			visibilite: ev?.hidden ? 'masque' : 'visible'
		};
	}

	// Le brouillon part de la version lue une seule fois : un rechargement ne l'écrase pas.
	let b = $state<Brouillon>(untrack(() => depuis(evenement)));
	let prevenir = $state(false);
	let confirmerRayure = $state(false);
	/** Où la dernière écriture a été demandée : la note s'écrit à côté. */
	let zone = $state<'saisie' | 'gestes'>('saisie');
	/** Après un conflit, l'autre version a été relue : on montre ce qui diffère. */
	let relu = $state(false);

	const ecriture = creerEcriture();
	const humide = $derived(ecriture.etat === 'humide');
	const conflit = $derived(ecriture.note?.code === 'VERSION_CONFLICT');
	const passe = $derived(!!evenement?.startsAt && evenement.startsAt < lu);

	// Un refus de saisie se lit sur la ligne fautive.
	const refus = $derived(ecriture.note?.ton === 'refus' ? ecriture.note.texte : null);
	const erreurs = $derived.by(() => {
		const e: Partial<Record<keyof Brouillon, string>> = {};
		if (!refus) return e;
		if (refus === EVENT_EDITOR_MESSAGES.titleRequired || refus.startsWith('Le titre')) e.titre = refus;
		else if (refus === EVENT_EDITOR_MESSAGES.dateInvalid || refus.startsWith('Choisis aussi une date')) e.date = refus;
		else if (refus.startsWith('Choisis une heure')) e.heure = refus;
		else if (refus === EVENT_EDITOR_MESSAGES.capacityInvalid || refus === EVENT_EDITOR_MESSAGES.capacityBelowParticipants)
			e.places = refus;
		else if (refus === DISCORD_URL_MESSAGE) e.salon = refus;
		else if (refus.startsWith('La description')) e.description = refus;
		else if (refus.startsWith('Type')) e.type = refus;
		return e;
	});
	const surUneLigne = $derived(Object.keys(erreurs).length > 0);

	/** Après un conflit relu : les champs où la version enregistrée diffère du brouillon. */
	const ecarts = $derived.by(() => {
		if (!relu || !evenement) return [];
		const leur = depuis(evenement);
		const noms: Record<keyof Brouillon, string> = {
			titre: 'Titre',
			type: 'Type',
			date: 'Date',
			heure: 'Heure',
			places: 'Places',
			description: 'Description',
			salon: 'Lien du salon',
			visibilite: 'Visibilité'
		};
		const lisible = (k: keyof Brouillon, v: string) =>
			k === 'type'
				? (TYPES.find((t) => t.id === v)?.libelle ?? v)
				: k === 'visibilite'
					? v === 'masque'
						? 'masqué'
						: 'visible'
					: v || 'vide';
		return (Object.keys(noms) as (keyof Brouillon)[])
			.filter((k) => leur[k] !== b[k])
			.map((k) => ({ champ: noms[k], leur: lisible(k, leur[k]), mien: lisible(k, b[k]) }));
	});

	function noter() {
		return ecriture.enhance({
			verbe: 'Noté',
			apres: () => {
				if (!evenement) {
					b = depuis(null);
					prevenir = false;
				}
			}
		});
	}
	function geste(verbe: string) {
		return ecriture.enhance({ verbe });
	}
	function demander(ici: 'saisie' | 'gestes') {
		if (ecriture.enCours) return;
		zone = ici;
		if (ici === 'saisie') relu = false;
	}
	async function relire() {
		await invalidateAll();
		relu = true;
	}
	function reprendreLeurVersion() {
		if (evenement) b = depuis(evenement);
		relu = false;
		ecriture.effacer();
	}
</script>

{#snippet note()}
	{#if ecriture.note}
		<NoteDeMarge ton={ecriture.note.ton}>
			{#if surUneLigne && zone === 'saisie'}
				Rien n’est noté : relis la ligne marquée.
			{:else}
				{ecriture.note.texte}
			{/if}
			{#snippet action()}
				{#if conflit && !relu}
					<Bouton variante="texte" onclick={relire}>Relire leur version</Bouton>
				{/if}
			{/snippet}
		</NoteDeMarge>
	{/if}
{/snippet}

<form
	class="saisie"
	method="POST"
	action={evenement ? '?/modifier' : '?/creer'}
	use:enhance={noter()}
	onsubmit={() => demander('saisie')}
>
	{#if evenement}
		<input type="hidden" name="eventId" value={evenement.id} />
		<input type="hidden" name="expectedRevision" value={evenement.revision} />
	{/if}

	<div class="ligne-titre">
		<Champ libelle="Titre" name="titre" bind:value={b.titre} erreur={erreurs.titre} maxlength={120} autocomplete="off" placeholder="Chasse au col des brumes" />
	</div>

	<fieldset class="choix-type" aria-describedby={erreurs.type ? 'type-erreur' : undefined}>
		<legend>Type</legend>
		<div class="options">
			{#each TYPES as t (t.id)}
				<label class="option" class:choisi={b.type === t.id}>
					<input type="radio" name="type" value={t.id} bind:group={b.type} />
					<Losange couleur={t.couleur} libelle={t.libelle} />
				</label>
			{/each}
		</div>
		{#if erreurs.type}<p class="erreur" id="type-erreur">{erreurs.type}</p>{/if}
	</fieldset>

	<div class="trio">
		<Champ libelle="Date" name="date" type="date" bind:value={b.date} erreur={erreurs.date} aide="Vide : date à confirmer." />
		<Champ libelle="Heure" name="heure" type="time" step={300} bind:value={b.heure} erreur={erreurs.heure} aide="Heure de Paris." />
		<Champ
			libelle="Places"
			name="places"
			type="number"
			inputmode="numeric"
			min={0}
			max={10000}
			bind:value={b.places}
			erreur={erreurs.places}
			aide="0 = sans limite"
		/>
	</div>

	<Champ
		libelle="Description"
		name="description"
		multiligne
		lignes={4}
		bind:value={b.description}
		erreur={erreurs.description}
		maxlength={4000}
		placeholder="Ce que les joueurs doivent savoir avant de venir."
	/>

	<Champ
		libelle="Lien du salon"
		name="salon"
		type="url"
		inputmode="url"
		bind:value={b.salon}
		erreur={erreurs.salon}
		aide="Facultatif. Un lien Discord vers le salon de la scène."
		placeholder="https://discord.com/channels/…"
		autocomplete="off"
	/>

	<fieldset class="visibilite">
		<legend>Visibilité</legend>
		<label class="option large" class:choisi={b.visibilite === 'visible'}>
			<input type="radio" name="visibilite" value="visible" bind:group={b.visibilite} />
			<span>Visible par tous les comptes</span>
		</label>
		<label class="option large" class:choisi={b.visibilite === 'masque'}>
			<input type="radio" name="visibilite" value="masque" bind:group={b.visibilite} />
			<span>Masqué : visible de ceux qui organisent (MJ, designers, administrateurs)</span>
		</label>
	</fieldset>

	{#if !evenement && peutPrevenir}
		<label class="cocher">
			<input type="checkbox" name="prevenir" value="oui" bind:checked={prevenir} disabled={b.visibilite === 'masque'} />
			<span>
				Prévenir les joueurs à la création
				<small>{b.visibilite === 'masque' ? 'Un rendez-vous masqué ne prévient personne.' : 'Une corne s’ouvre dans les Dernières pages de chaque compte relié.'}</small>
			</span>
		</label>
	{/if}

	{#if relu && ecarts.length}
		<div class="ecarts" role="region" aria-label="Ce qui a changé entre-temps">
			<p class="repere">Écrit entre-temps</p>
			<ul>
				{#each ecarts as e (e.champ)}
					<li><span class="champ-nom">{e.champ}</span><span class="leur">{e.leur}</span><span class="mien">ton brouillon : {e.mien}</span></li>
				{/each}
			</ul>
			<div class="choix-version">
				<Bouton variante="trait" onclick={reprendreLeurVersion}>Reprendre leur version</Bouton>
				<span class="aide-version">ou « Noter » pour garder la tienne.</span>
			</div>
		</div>
	{/if}

	<div class="envoi">
		<Bouton variante="ruban" type="submit" disabled={humide}>
			{#if humide && zone === 'saisie'}<Encre etat="humide">{evenement ? 'Noter les changements' : 'Noter le rendez-vous'}</Encre>{:else}{evenement
					? 'Noter les changements'
					: 'Noter le rendez-vous'}{/if}
		</Bouton>
		{#if evenement}<Bouton variante="texte" href="/agenda/organiser">Nouveau rendez-vous</Bouton>{/if}
	</div>
	{#if zone === 'saisie'}<div class="note">{@render note()}</div>{/if}
</form>

{#if evenement}
	<section class="gestes" aria-labelledby="titre-gestes">
		<h3 id="titre-gestes" class="repere">Gestes</h3>

		<div class="geste">
			<p class="explique">
				{evenement.hidden ? 'Masqué : seuls les MJ, les designers et les administrateurs le voient.' : 'Visible par tous les comptes.'}
			</p>
			<form method="POST" action="?/masquer" use:enhance={geste(evenement.hidden ? 'Visible' : 'Masqué')} onsubmit={() => demander('gestes')}>
				<input type="hidden" name="eventId" value={evenement.id} />
				<input type="hidden" name="expectedRevision" value={evenement.revision} />
				<input type="hidden" name="hidden" value={evenement.hidden ? 'false' : 'true'} />
				<Bouton variante="trait" type="submit" disabled={humide}>{evenement.hidden ? 'Le rendre visible' : 'Masquer ce rendez-vous'}</Bouton>
			</form>
		</div>

		{#if peutPrevenir && !evenement.hidden && !passe}
			<div class="geste">
				<p class="explique">Une corne s’ouvre dans les Dernières pages de chaque compte relié.</p>
				<form method="POST" action="?/prevenir" use:enhance={geste('Prévenu')} onsubmit={() => demander('gestes')}>
					<input type="hidden" name="eventId" value={evenement.id} />
					<Bouton variante="tampon" type="submit" disabled={humide}>Prévenir les joueurs</Bouton>
				</form>
			</div>
		{/if}

		<div class="geste rayure">
			{#if confirmerRayure}
				<form method="POST" action="?/rayer" use:enhance={geste('Rayé')} onsubmit={() => demander('gestes')} class="confirmer">
					<input type="hidden" name="eventId" value={evenement.id} />
					<input type="hidden" name="expectedRevision" value={evenement.revision} />
					<input type="hidden" name="titre" value={evenement.title} />
					<p class="question">
						Rayer « {evenement.title} » ? Il sort de l’agenda avec ses inscriptions ; sa trace reste dans le journal d’audit.
					</p>
					<div class="oui-non">
						<Bouton variante="rouille" type="submit" disabled={humide}>Oui, rayer</Bouton>
						<Bouton variante="texte" onclick={() => (confirmerRayure = false)}>Le garder</Bouton>
					</div>
				</form>
			{:else}
				<p class="explique">Rien ne s’efface : la version complète reste dans le journal d’audit.</p>
				<Bouton variante="rouille" onclick={() => (confirmerRayure = true)}>Rayer ce rendez-vous</Bouton>
			{/if}
		</div>
		{#if zone === 'gestes'}<div class="note">{@render note()}</div>{/if}
	</section>
{/if}

<style>
	.saisie {
		display: grid;
		gap: var(--ligne);
		padding-top: var(--ligne);
	}
	fieldset {
		min-width: 0;
		margin: 0;
		padding: 0;
		border: 0;
	}
	legend {
		padding: 0;
		margin-bottom: 4px;
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.options {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.option {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 12px;
		min-height: var(--cible);
		padding: 0 14px;
		border: 1px solid color-mix(in srgb, var(--encre) 16%, transparent);
		border-radius: var(--rayon);
		cursor: pointer;
		transition:
			border-color 160ms,
			background 160ms;
	}
	.option:hover {
		border-color: var(--encre-2);
	}
	.option.choisi {
		border-color: var(--encre-humide);
		background: color-mix(in srgb, var(--encre-humide) 8%, transparent);
	}
	.option input {
		position: absolute;
		opacity: 0;
		inset: 0;
		margin: 0;
		cursor: pointer;
	}
	.option:has(input:focus-visible) {
		outline: 2px solid var(--encre-humide);
		outline-offset: 2px;
	}
	.visibilite {
		display: grid;
		gap: 8px;
	}
	.option.large {
		display: flex;
		font: var(--t-corps);
		color: var(--encre);
	}
	.option.large::before {
		content: '';
		flex: none;
		width: 12px;
		height: 12px;
		border: 1px solid var(--encre-2);
		border-radius: 50%;
	}
	.option.large.choisi::before {
		border-color: var(--encre-humide);
		background: var(--encre-humide);
		box-shadow: inset 0 0 0 3px var(--page);
	}
	.trio {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--ligne) var(--gouttiere);
	}
	.erreur {
		margin-top: 4px;
		font: var(--t-libelle);
		color: var(--rouille);
	}
	.cocher {
		display: flex;
		align-items: flex-start;
		gap: 14px;
		min-height: var(--cible);
		cursor: pointer;
		font: var(--t-corps);
		color: var(--encre);
	}
	.cocher input {
		flex: none;
		width: 20px;
		height: 20px;
		margin: 2px 0 0;
		accent-color: var(--encre-humide);
	}
	.cocher small {
		display: block;
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.envoi {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 28px;
		padding-top: calc(var(--ligne) / 2);
		border-top: 1px solid var(--reglure);
	}
	.note {
		margin-top: calc(var(--ligne) / -2);
	}

	/* ── Conflit relu ────────────────────────────────────────────────── */
	.ecarts {
		padding: calc(var(--ligne) / 2) 0;
		border-block: 1px solid var(--reglure);
	}
	.ecarts ul {
		margin-top: 4px;
	}
	.ecarts li {
		display: grid;
		grid-template-columns: 120px minmax(0, 1fr) minmax(0, 1fr);
		gap: 0 var(--gouttiere);
		padding: 6px 0;
		border-bottom: 1px solid var(--reglure);
		font: var(--t-libelle);
		line-height: var(--ligne);
	}
	.champ-nom {
		color: var(--encre-2);
	}
	.leur {
		color: var(--encre);
		overflow-wrap: anywhere;
	}
	.mien {
		color: var(--encre-humide);
		overflow-wrap: anywhere;
	}
	.choix-version {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 16px;
		margin-top: calc(var(--ligne) / 2);
	}
	.aide-version {
		font: var(--t-libelle);
		color: var(--encre-2);
	}

	/* ── Gestes ──────────────────────────────────────────────────────── */
	.gestes {
		margin-top: calc(var(--ligne) * 2);
		border-top: 3px double var(--reglure);
		padding-top: calc(var(--ligne) / 2);
	}
	.geste {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 8px var(--gouttiere);
		padding: calc(var(--ligne) / 2) 0;
		border-bottom: 1px solid var(--reglure);
	}
	.explique {
		flex: 1 1 260px;
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.confirmer {
		display: grid;
		gap: calc(var(--ligne) / 2);
		width: 100%;
	}
	.question {
		font: var(--t-corps);
		color: var(--rouille);
	}
	.oui-non {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 28px;
	}

	@media (max-width: 760px) {
		.trio {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		}
		.trio :global(.champ:last-child) {
			grid-column: 1 / -1;
		}
		.ecarts li {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
