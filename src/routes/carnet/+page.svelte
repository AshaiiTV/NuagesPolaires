<script lang="ts">
	// « Dernières pages » (03-vision §5.2). L'ordre des zones est imposé : ligne d'état (marge),
	// marque-page, ce qui attend ta main, depuis ta dernière lecture, ce qui vient.
	// Trois états de plus : compte en attente de liaison, fiche introuvable, synchronisation interrompue.
	import type { SubmitFunction } from '@sveltejs/kit';
	import { applyAction, enhance } from '$app/forms';
	import { SvelteSet } from 'svelte/reactivity';
	import Page from '$lib/ui/Page.svelte';
	import Chapitre from '$lib/ui/Chapitre.svelte';
	import LigneEtat from '$lib/ui/LigneEtat.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import Champ from '$lib/ui/Champ.svelte';
	import Encre from '$lib/ui/Encre.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import Losange from '$lib/ui/Losange.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import Portrait from '$lib/ui/Portrait.svelte';
	import { creerEcriture, PHRASE_REFUS } from '$lib/ui/ecriture.svelte';
	import { dateCourte, dateLongue, heure, heureRonde, jourSemaine, joursCalendaires, mois, parisParts } from '$lib/ui/dates';
	import type { EventRowView } from '$lib/schemas/events';
	import type { PageLineView } from '$lib/schemas/reading';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const vue = $derived(data.vue);
	const fiche = $derived(vue.sheet);

	// ---- Relevé, déclarations, absence -------------------------------------------------------
	/** « 21:14 » le jour même, « 28 sept., 21:14 » sinon : un relevé ancien ne se fait pas passer pour frais. */
	function releve(iso: string): string {
		return joursCalendaires(iso) === 0 ? heure(iso) : `${dateCourte(iso)}, ${heure(iso)}`;
	}
	const signe = (n: number) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);
	const declare = $derived.by(() => {
		if (!fiche) return '';
		const p = fiche.pendingDeclared;
		const parts = (['pv', 'ep', 'em'] as const).filter((r) => p[r] !== 0).map((r) => `${signe(p[r])} ${r.toUpperCase()}`);
		return parts.length ? `${parts.join(' · ')} déclaré depuis le relevé` : '';
	});
	const absence = $derived(vue.state === 'linked' && vue.daysAway > 30);

	// ---- Synchronisation interrompue : le relevé reste, la marge le dit ---------------------------
	let horsLigne = $state(false);
	$effect(() => {
		const maj = () => (horsLigne = !navigator.onLine);
		maj();
		window.addEventListener('online', maj);
		window.addEventListener('offline', maj);
		return () => {
			window.removeEventListener('online', maj);
			window.removeEventListener('offline', maj);
		};
	});

	// ---- Écritures : une seule note de marge à la fois --------------------------------------------
	const ecriture = creerEcriture();
	let cible = $state('');
	let refusLigne = $state<{ id: string; texte: string } | null>(null);
	function ecrire(qui: string, verbe: string, apres?: () => void): SubmitFunction {
		const soumettre = ecriture.enhance({ verbe, apres });
		return (entree) => {
			cible = qui;
			refusLigne = null;
			return soumettre(entree);
		};
	}
	$effect(() => {
		if (ecriture.note?.ton !== 'fait') return;
		const t = setTimeout(() => ecriture.effacer(), 3000);
		return () => clearTimeout(t);
	});

	// Ouvrir une page : la corne se déplie (90 ms), le serveur avance le signet, puis on tourne la page.
	const ouvertes = new SvelteSet<string>();
	function ouvrir(ligne: PageLineView): SubmitFunction {
		return () => {
			ouvertes.add(ligne.id);
			refusLigne = null;
			ecriture.effacer();
			return async ({ result }) => {
				if (result.type === 'redirect') {
					await applyAction(result);
					return;
				}
				ouvertes.delete(ligne.id);
				const message = result.type === 'failure' ? (result.data as { message?: string } | undefined)?.message : undefined;
				refusLigne = { id: ligne.id, texte: message ?? PHRASE_REFUS };
			};
		};
	}

	// ---- Marque-page ---------------------------------------------------------------------------
	let marqueTexte = $state('');
	let marqueLien = $state('');
	let marqueOuvert = $state(false);
	$effect.pre(() => {
		marqueTexte = vue.bookmark?.text ?? '';
		marqueLien = vue.bookmark?.url ?? '';
	});

	// ---- Pages groupées par mois après une longue absence ------------------------------------------
	const groupes = $derived.by(() => {
		if (!absence) return [{ mois: null as string | null, lignes: vue.since }];
		const out: { mois: string | null; lignes: PageLineView[] }[] = [];
		for (const l of vue.since) {
			const m = mois(l.at);
			const dernier = out.at(-1);
			if (dernier && dernier.mois === m) dernier.lignes.push(l);
			else out.push({ mois: m, lignes: [l] });
		}
		return out;
	});
	const cornees = $derived(vue.since.some((l) => l.cornered));

	// ---- Ce qui attend ta main : le texte du domaine, sans son préfixe déjà écrit en repère -------
	function apres(texte: string, separateur: string): string {
		const i = texte.indexOf(separateur);
		return i >= 0 ? texte.slice(i + separateur.length) : texte;
	}

	// ---- Rendez-vous --------------------------------------------------------------------------
	/** Couleur de sens du type (losange) : le token s'il existe, sinon une encre du carnet. */
	const REPLI: Record<string, string> = {
		'--red': 'var(--rouille)',
		'--gold': 'var(--encre-2)',
		'--glacier': 'var(--encre-humide)',
		'--purple': 'var(--ruban)',
		'--faint': 'var(--encre-grise)'
	};
	const teinte = (token: string) => `var(${token}, ${REPLI[token] ?? 'var(--encre-2)'})`;
	function jourDuMois(iso: string | null): string {
		return iso ? String(parisParts(iso)?.day ?? '') : '';
	}
	function moisCourt(iso: string | null): string {
		return iso ? dateCourte(iso).split(' ').slice(1).join(' ') : '';
	}
	function places(e: EventRowView): string {
		if (e.capacity === 0) return 'sans limite';
		return `${e.count} inscrit${e.count > 1 ? 's' : ''} sur ${e.capacity}`;
	}
	function noteRdv(e: EventRowView): string {
		const fait = form && 'participation' in form ? form.participation : null;
		if (fait && fait.eventId === e.id) return fait.viens ? 'Tu viens. Le rendez-vous est en marge de ton carnet.' : 'Rayé. Ta place est libre.';
		return ecriture.note?.texte ?? '';
	}

	// ---- Compte en attente : le pseudo à transmettre ----------------------------------------------
	let copie = $state<string | null>(null);
	async function copierPseudo() {
		try {
			await navigator.clipboard.writeText(vue.pseudo);
			copie = heure(new Date());
			setTimeout(() => (copie = null), 4000);
		} catch {
			copie = null;
		}
	}
</script>

<svelte:head><title>Dernières pages — Mon carnet</title></svelte:head>

{#snippet rendezVous(e: EventRowView, lecture: boolean)}
	<li class="rdv">
		<p class="bloc-date" aria-hidden="true">
			<span class="jour-num chiffres">{jourDuMois(e.startsAt)}</span>
			<span class="mois-court">{moisCourt(e.startsAt)}</span>
		</p>
		<div class="rdv-quoi">
			<p class="rdv-titre">{e.title}</p>
			<p class="rdv-details">
				<Losange couleur={teinte(e.typeColor)} libelle={e.typeLabel} />
				{#if e.startsAt}<span class="chiffres">{jourSemaine(e.startsAt)} {dateLongue(e.startsAt)}, {heureRonde(e.startsAt)}</span>{/if}
				<span class="chiffres">{places(e)}</span>
				{#if e.discordUrl}
					<a class="rdv-salon" href={e.discordUrl} target="_blank" rel="noopener noreferrer">Ouvrir le salon<span class="fleche" aria-hidden="true">↗</span></a>
				{/if}
			</p>
		</div>
		<div class="rdv-geste">
			{#if lecture || (!e.canRegister && !e.registered)}
				{#if e.closedReason === 'unlinked'}
					<p class="ferme">Ton compte attend sa liaison pour venir.</p>
				{:else if e.closedReason === 'full'}
					<p class="ferme">Complet</p>
				{:else if e.closedReason === 'undated'}
					<p class="ferme">Date à confirmer · inscriptions fermées</p>
				{/if}
			{:else}
				<form method="POST" action="?/participer" use:enhance={ecrire(`rdv:${e.id}`, e.registered ? 'Rayé' : 'Noté')}>
					<input type="hidden" name="eventId" value={e.id} />
					<input type="hidden" name="participating" value={e.registered ? 'false' : 'true'} />
					<input type="hidden" name="expectedRevision" value={e.revision} />
					{#if e.registered}
						<p class="viens">
							<Encre etat={cible === `rdv:${e.id}` ? ecriture.etat : 'prise'}><span class="tu-viens">Tu viens</span></Encre>
							<span class="point" aria-hidden="true">·</span>
							<button class="rayer" type="submit">Rayer ma place</button>
						</p>
					{:else}
						<Bouton variante="trait" type="submit">
							<Encre etat={cible === `rdv:${e.id}` ? ecriture.etat : 'prise'}>Je viens</Encre>
						</Bouton>
					{/if}
				</form>
			{/if}
		</div>
		{#if cible === `rdv:${e.id}` && ecriture.note}
			<div class="rdv-note">
				<NoteDeMarge ton={ecriture.note.ton}>{ecriture.note.ton === 'fait' ? noteRdv(e) : ecriture.note.texte}</NoteDeMarge>
			</div>
		{/if}
	</li>
{/snippet}

{#snippet deplier()}
	<form method="POST" action="?/deplier" use:enhance={ecrire('deplier', 'Déplié')}>
		<button class="lien-discret" type="submit"><Encre etat={cible === 'deplier' ? ecriture.etat : 'prise'}>Déplier toutes les cornes</Encre></button>
	</form>
{/snippet}

{#snippet ceQuiVient(lecture: boolean)}
	<Chapitre titre="Ce qui vient" id="ce-qui-vient">
		{#if vue.upcoming.length}
			<ul class="rdvs">
				{#each vue.upcoming as e (e.id)}{@render rendezVous(e, lecture)}{/each}
			</ul>
		{:else}
			<Vide>Rien de prévu. Le monde attend.</Vide>
		{/if}
	</Chapitre>
{/snippet}

{#if vue.state === 'linked' && fiche}
	<Page repere="NP / 02 — Mon carnet" titre="Dernières" titreVoix="pages." grain>
		{#snippet marge()}
			<div class="identite">
				<Portrait nom={fiche.name} src={fiche.portraitUrl || null} taille={72} />
				<p class="nom">{fiche.name}</p>
				<p class="serment">{fiche.oathName} · <span class="rang">{fiche.rankLabel}</span> · niveau {fiche.level}</p>
			</div>
			<LigneEtat pv={fiche.pv} ep={fiche.ep} em={fiche.em} releve={releve(fiche.releveAt)} enRetard={horsLigne} />
			{#if declare}<p class="declare chiffres">{declare}</p>{/if}
			{#if horsLigne}<p class="retard" role="status">Le carnet n’a pas pu se mettre à jour depuis {heure(fiche.releveAt)}.</p>{/if}
			<p class="lu">Lu pour la dernière fois le {dateLongue(vue.lastReadAt)}.</p>
		{/snippet}
		{#snippet bande()}
			<p class="bande-nom">{fiche.name} · {fiche.oathName} · <span class="rang">{fiche.rankLabel}</span> · niv. {fiche.level}</p>
			<LigneEtat pv={fiche.pv} ep={fiche.ep} em={fiche.em} releve={releve(fiche.releveAt)} enRetard={horsLigne} />
			{#if declare}<p class="declare chiffres">{declare}</p>{/if}
			{#if horsLigne}<p class="retard" role="status">Le carnet n’a pas pu se mettre à jour depuis {heure(fiche.releveAt)}.</p>{/if}
			<p class="bande-lu">Lu pour la dernière fois le {dateLongue(vue.lastReadAt)}.</p>
		{/snippet}

		{#if absence}
			<p class="absence">Le carnet t’a gardé {vue.daysAway} jours de pages. Commence par ce qui attend ta main.</p>
		{/if}

		{#if vue.bookmark}
			<section class="marque-page" aria-labelledby="marque-titre">
				<h2 class="repere" id="marque-titre">Tu t’étais arrêté ici.</h2>
				{#if vue.bookmark.text}<p class="phrase">« {vue.bookmark.text} »</p>{/if}
				<div class="gestes">
					{#if vue.bookmark.url}
						<Bouton variante="texte" href={vue.bookmark.url} fleche="↗" target="_blank" rel="noopener noreferrer">Reprendre sur Discord</Bouton>
					{/if}
					<button class="lien-discret" type="button" aria-expanded={marqueOuvert} aria-controls="marque-form" onclick={() => (marqueOuvert = !marqueOuvert)}>
						{marqueOuvert ? 'Laisser le marque-page tel quel' : 'Réécrire le marque-page'}
					</button>
				</div>
				{#if marqueOuvert}
					<form id="marque-form" class="marque-form" method="POST" action="?/marquePage" use:enhance={ecrire('marque', 'Noté', () => (marqueOuvert = false))}>
						<Champ libelle="Où j’en suis" name="text" bind:value={marqueTexte} maxlength={280} placeholder="Une phrase pour reprendre le fil…" />
						<Champ libelle="Lien du message Discord" name="url" type="url" inputmode="url" bind:value={marqueLien} placeholder="https://discord.com/channels/…" aide="Facultatif." />
						<div class="gestes">
							<Bouton variante="ruban" type="submit"><Encre etat={cible === 'marque' ? ecriture.etat : 'prise'}>Noter</Encre></Bouton>
						</div>
					</form>
					<form class="retirer" method="POST" action="?/marquePage" use:enhance={ecrire('marque', 'Retiré', () => (marqueOuvert = false))}>
						<input type="hidden" name="text" value="" />
						<input type="hidden" name="url" value="" />
						<button class="lien-discret" type="submit">Retirer le marque-page</button>
					</form>
				{/if}
				{#if cible === 'marque' && ecriture.note}
					<NoteDeMarge ton={ecriture.note.ton}>{ecriture.note.texte}</NoteDeMarge>
				{/if}
			</section>
		{/if}

		{#if vue.waiting.length}
			<Chapitre titre="Ce qui attend ta main" id="attend">
				<ul class="attend">
					{#each vue.waiting as w (w.kind + w.id)}
						<li class="attente {w.kind}">
							{#if w.kind === 'scene'}
								<p class="quoi"><span class="repere">Scène ouverte</span> <span class="lieu">{w.channel ?? apres(w.text, ' · ')}</span></p>
								<div class="gestes">
									{#if w.discordUrl}
										<Bouton variante="ruban" href={w.discordUrl} fleche="↗" target="_blank" rel="noopener noreferrer">Ouvrir sur Discord</Bouton>
									{/if}
									<Bouton variante="trait" href="/carnet/scene">Préparer ma réponse</Bouton>
								</div>
							{:else if w.kind === 'table'}
								<p class="quoi"><span class="repere">La Table est ouverte</span> <span class="lieu">{apres(w.text, ' : ')}</span></p>
								<div class="gestes"><Bouton variante="texte" href={w.href} fleche="→">Suivre</Bouton></div>
							{:else}
								<p class="quoi"><span class="repere">Rendez-vous</span> <span class="lieu">{apres(w.text, 'Rendez-vous ')}</span></p>
								<div class="gestes">
									{#if w.discordUrl}
										<Bouton variante="texte" href={w.discordUrl} fleche="↗" target="_blank" rel="noopener noreferrer">Ouvrir le salon</Bouton>
									{:else}
										<Bouton variante="texte" href="/agenda" fleche="→">Agenda</Bouton>
									{/if}
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			</Chapitre>
		{:else}
			<p class="rien-n-attend">Aucune scène ouverte. Ta fiche et l’agenda sont à jour.</p>
		{/if}

		<Chapitre titre="Depuis ta dernière lecture" id="depuis">
			{#snippet actions()}
				{#if cornees}<div class="deplier-haut">{@render deplier()}</div>{/if}
			{/snippet}
			{#if cible === 'deplier' && ecriture.note}
				<NoteDeMarge ton={ecriture.note.ton}>{ecriture.note.texte}</NoteDeMarge>
			{/if}
			{#if vue.since.length}
				{#each groupes as groupe, g (g)}
					{#if groupe.mois}<p class="mois-filet repere">{groupe.mois}</p>{/if}
					<ol class="lignes">
						{#each groupe.lignes as l (l.id)}
							{@const cornee = l.cornered && !ouvertes.has(l.id)}
							<li>
								<form method="POST" action="?/ouvrir" use:enhance={ouvrir(l)}>
									<input type="hidden" name="lineId" value={l.id} />
									<button class="ligne" class:cornee type="submit">
										<span class="date">{dateCourte(l.at)}</span>
										<span class="texte">{l.text}</span>
										{#if l.cornered}<span class="corne" class:depliee={!cornee} aria-hidden="true"></span><span class="sr-only"> — page non lue</span>{/if}
									</button>
								</form>
								{#if refusLigne?.id === l.id}<NoteDeMarge ton="refus">{refusLigne.texte}</NoteDeMarge>{/if}
							</li>
						{/each}
					</ol>
				{/each}
				{#if cornees}<div class="deplier-bas">{@render deplier()}</div>{/if}
				{#if vue.sincePages > 1}
					<nav class="tourner" aria-label="Pages depuis ta dernière lecture">
						{#if vue.sincePage > 1}<Bouton variante="texte" href="?page={vue.sincePage - 1}">← Page précédente</Bouton>{:else}<span></span>{/if}
						{#if vue.sincePage < vue.sincePages}<Bouton variante="texte" href="?page={vue.sincePage + 1}" fleche="→">Page suivante</Bouton>{/if}
					</nav>
				{/if}
			{:else}
				<Vide>Rien depuis ta dernière lecture. Le carnet reste ouvert.</Vide>
			{/if}
		</Chapitre>

		{@render ceQuiVient(false)}

		{#snippet pied()}
			<div class="gestes pied-gestes">
				<Bouton variante="texte" href="/carnet/fiche" fleche="→">Ouvrir ma fiche</Bouton>
				<Bouton variante="texte" href="/carnet/journal" fleche="→">Écrire dans mon journal</Bouton>
			</div>
		{/snippet}
	</Page>
{:else}
	<!-- Compte en attente de liaison, ou liaison vers une fiche introuvable : la page réduite. -->
	<Page repere="NP / 02 — Mon carnet" titre="Ton carnet" titreVoix="attend." grain>
		{#snippet marge()}
			<div class="identite">
				<Portrait nom={vue.pseudo} taille={72} />
				<p class="nom">{vue.pseudo}</p>
				<p class="serment">{vue.state === 'pending' ? 'en attente de liaison' : 'liaison sans fiche'}</p>
			</div>
		{/snippet}
		{#snippet bande()}
			<p class="bande-nom">{vue.pseudo} · {vue.state === 'pending' ? 'en attente de liaison' : 'liaison sans fiche'}</p>
		{/snippet}

		{#if vue.state === 'pending'}
			<p class="attente-lead">Ton compte existe. Ta fiche attend qu’un administrateur la relie à ton personnage. Transmets ton pseudo sur Discord : {vue.pseudo}.</p>
			<div class="pseudo-bloc">
				<p class="repere">Ton pseudo, à transmettre</p>
				<p class="pseudo">{vue.pseudo}</p>
				<div class="gestes">
					<Bouton variante="trait" onclick={copierPseudo}>Copier mon pseudo</Bouton>
					<p class="copie" aria-live="polite">{#if copie}Copié · {copie} — colle-le sur Discord.{/if}</p>
				</div>
			</div>
		{:else}
			<p class="attente-lead">Une liaison existe, mais ta fiche n’a pas pu s’ouvrir. Recharge ; si ça persiste, donne ton pseudo à un administrateur sur Discord.</p>
		{/if}

		<Chapitre titre="En attendant">
			<ul class="liens">
				<li><Bouton variante="texte" href="/univers/premiers-pas" fleche="→">Premiers pas</Bouton><span>Comment une histoire commence ici.</span></li>
				<li><Bouton variante="texte" href="/univers/serments" fleche="→">Les Serments</Bouton><span>Choisir sa voie avant d’entrer en scène.</span></li>
				<li><Bouton variante="texte" href="/agenda" fleche="→">Agenda</Bouton><span>Les rendez-vous de la table, en lecture.</span></li>
			</ul>
			<div class="recharger">
				<Bouton variante="trait" href="/carnet" data-sveltekit-reload>Recharger cette page</Bouton>
			</div>
		</Chapitre>

		{@render ceQuiVient(true)}
	</Page>
{/if}

<style>
	/* ---- Marge : identité et ligne d'état ---- */
	.identite {
		margin-bottom: var(--ligne);
	}
	.nom {
		margin-top: 14px;
		font: 500 34px/42px var(--voix);
		letter-spacing: -0.01em;
		color: var(--encre);
		overflow-wrap: anywhere;
	}
	.serment {
		font: var(--t-libelle);
		line-height: var(--ligne);
		color: var(--encre-2);
	}
	.rang {
		color: var(--tampon);
	}
	.declare {
		font: var(--t-libelle);
		line-height: var(--ligne);
		color: var(--encre-humide);
	}
	.retard {
		font: var(--t-libelle);
		line-height: var(--ligne);
		color: var(--rouille);
	}
	.lu {
		margin-top: var(--ligne);
		color: var(--encre-grise);
	}
	.bande-nom {
		width: 100%;
		color: var(--encre);
	}

	/* ---- Corps ---- */
	.absence,
	.attente-lead {
		padding-bottom: var(--ligne);
		font: var(--t-recit);
		font-size: 22px;
		font-style: italic;
		color: var(--encre);
		max-width: var(--lecture);
	}
	.marque-page {
		padding: var(--ligne) 0;
		border-block: 1px solid var(--reglure);
	}
	.marque-page h2 {
		font: var(--t-repere);
	}
	.phrase {
		margin: calc(var(--ligne) / 2) 0;
		font: italic 400 22px/28px var(--voix);
		color: var(--encre);
		max-width: var(--lecture);
	}
	.marque-form {
		display: grid;
		gap: calc(var(--ligne) / 2);
		max-width: 52ch;
		padding-top: var(--ligne);
	}
	.gestes {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 20px;
	}
	.lien-discret {
		min-height: var(--cible);
		padding: 0;
		background: none;
		border: 0;
		font: var(--t-libelle);
		color: var(--encre-2);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--encre-humide) 50%, transparent);
		text-underline-offset: 4px;
	}
	.lien-discret:hover {
		color: var(--encre);
	}
	.rien-n-attend {
		margin-top: calc(var(--ligne) * 2);
		padding: calc(var(--ligne) / 2) 0;
		border-bottom: 1px solid var(--reglure);
		font: var(--t-recit);
		font-style: italic;
		color: var(--encre-2);
	}

	/* Ce qui attend ta main */
	.attend li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 8px 16px;
		min-height: calc(var(--ligne) * 2);
		padding: calc(var(--ligne) / 2) 0;
		border-bottom: 1px solid var(--reglure);
	}
	.attend .repere {
		margin-right: 10px;
		color: var(--encre-humide);
	}
	.quoi {
		font: var(--t-corps);
		color: var(--encre);
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.attente.scene .lieu {
		font-weight: 500;
	}

	/* Depuis ta dernière lecture : une ligne = une page, une corne tant qu'elle n'est pas ouverte. */
	.mois-filet {
		margin-top: var(--ligne);
		padding-bottom: 6px;
		border-bottom: 1px solid var(--encre-grise);
		color: var(--encre-2);
	}
	.lignes form {
		display: block;
	}
	.ligne {
		position: relative;
		display: grid;
		grid-template-columns: 7.5em 1fr;
		gap: 0 16px;
		align-items: baseline;
		width: 100%;
		min-height: calc(var(--ligne) * 2);
		padding: calc(var(--ligne) / 2) 28px calc(var(--ligne) / 2) 0;
		background: none;
		border: 0;
		border-bottom: 1px solid var(--reglure);
		font: var(--t-liste);
		text-align: left;
		color: var(--encre-2);
	}
	.ligne:hover .texte,
	.ligne.cornee .texte {
		color: var(--encre);
	}
	.ligne:hover .texte {
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--encre-humide) 60%, transparent);
		text-underline-offset: 4px;
	}
	.ligne .date {
		font: var(--t-repere);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--encre-grise);
	}
	.corne {
		position: absolute;
		top: 0;
		right: 0;
		width: 0;
		height: 0;
		border-style: solid;
		border-width: 0 14px 14px 0;
		border-color: transparent var(--encre) transparent transparent;
		filter: drop-shadow(-1px 1px 0 rgb(0 0 0 / 0.25));
		transition: border-width 90ms linear;
	}
	.corne.depliee {
		border-width: 0;
	}
	.deplier-bas {
		display: none;
	}
	.bande-lu {
		width: 100%;
		color: var(--encre-grise);
	}
	.tourner {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		padding-top: calc(var(--ligne) / 2);
	}

	/* Ce qui vient */
	.rdv {
		display: grid;
		grid-template-columns: 56px minmax(0, 1fr) auto;
		align-items: center;
		gap: 4px 20px;
		padding: calc(var(--ligne) / 2) 0;
		border-bottom: 1px solid var(--reglure);
	}
	.bloc-date {
		display: grid;
		justify-items: center;
		align-self: start;
		padding-top: 2px;
	}
	.jour-num {
		font: var(--t-chiffre);
		color: var(--encre);
	}
	.mois-court {
		font: var(--t-repere);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--encre-2);
	}
	.rdv-titre {
		font: 500 22px/28px var(--voix);
		color: var(--encre);
	}
	.rdv-details {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0 14px;
		font: var(--t-libelle);
		line-height: var(--ligne);
		color: var(--encre-2);
	}
	.rdv-salon {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: var(--cible);
		color: var(--encre);
	}
	.rdv-geste {
		justify-self: end;
	}
	.rdv-note {
		grid-column: 2 / -1;
	}
	.viens {
		display: flex;
		align-items: center;
		gap: 10px;
		font: var(--t-libelle);
	}
	.tu-viens {
		font-weight: 600;
	}
	.point {
		color: var(--encre-2);
	}
	.rayer {
		min-height: var(--cible);
		padding: 0;
		background: none;
		border: 0;
		font: var(--t-libelle);
		color: var(--encre-2);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--encre-humide) 50%, transparent);
		text-underline-offset: 4px;
	}
	.rayer:hover {
		color: var(--encre);
	}
	.ferme {
		font: var(--t-libelle);
		color: var(--encre-grise);
		text-align: right;
		max-width: 22ch;
	}

	/* Compte en attente */
	.pseudo-bloc {
		padding: var(--ligne) 0;
		border-block: 1px solid var(--reglure);
	}
	.pseudo {
		margin: 8px 0 12px;
		font: 400 32px/42px var(--mono);
		color: var(--encre);
		overflow-wrap: anywhere;
	}
	.copie {
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.liens li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0 20px;
		border-bottom: 1px solid var(--reglure);
	}
	.liens span {
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.recharger {
		padding-top: var(--ligne);
	}

	@media (max-width: 760px) {
		.deplier-haut {
			display: none;
		}
		.deplier-bas {
			display: block;
			padding-top: calc(var(--ligne) / 2);
		}
		.absence,
		.attente-lead {
			font-size: 20px;
		}
		.ligne {
			grid-template-columns: 1fr;
		}
		.attend .gestes {
			width: 100%;
		}
		.rdv {
			grid-template-columns: 44px minmax(0, 1fr);
		}
		.rdv-geste {
			grid-column: 2;
			justify-self: start;
		}
		.ferme {
			text-align: left;
			max-width: none;
		}
		.pied-gestes {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
