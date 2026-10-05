<script lang="ts">
	// Mon journal — trois voix (03-vision §5.5) : Mes notes, Récits, Faits validés. Le centre de
	// gravité de la mémoire : une page réglée, des entrées datées en marge, le texte en Cormorant
	// 18 / 28 ; écrire, c'est poser le curseur sous la dernière ligne. Rien ne s'efface : une correction
	// garde l'ancienne version en rature dessous, « rayer » barre l'entrée entière, lisible.
	import type { SubmitFunction } from '@sveltejs/kit';
	import { onMount, tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Page from '$lib/ui/Page.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import Encre from '$lib/ui/Encre.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import Tampon from '$lib/ui/Tampon.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import { creerEcriture } from '$lib/ui/ecriture.svelte';
	import { dateCourte, dateLongue, heure } from '$lib/ui/dates';
	import { FACT_KINDS, FACT_KIND_LABELS, FACT_TEXT_MAX, FACT_COUNTERPART_MAX, type FactView } from '$lib/schemas/facts';
	import { JOURNAL_MAX_CHARS, type JournalEntryView } from '$lib/schemas/journal';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// ---- Les trois voix, chacune avec sa visibilité écrite en toutes lettres -----------------------
	const VOIX = [
		{ cle: 'notes', titre: 'Mes notes', phrase: 'Lu par toi, les MJ et les administrateurs.' },
		{ cle: 'recits', titre: 'Récits', phrase: 'Les combats archivés où ton personnage figure.' },
		{ cle: 'faits', titre: 'Faits validés', phrase: 'Tamponnés par un MJ, avec témoin et date. Tu peux en proposer.' }
	] as const;
	const lienVoix = (cle: string) => (cle === 'notes' ? '/carnet/journal' : `/carnet/journal?voix=${cle}`);
	const courante = $derived(VOIX.find((v) => v.cle === data.voix) ?? VOIX[0]);
	const pagesEcrites = $derived(
		data.notes.count === 0 ? 'Aucune page écrite pour l’instant.' : data.notes.count === 1 ? 'Une page écrite.' : `${data.notes.count} pages écrites.`
	);

	// ---- Écritures : une seule note de marge à la fois ------------------------------------------
	const ecriture = creerEcriture();
	let cible = $state('');
	/** Conflit : le journal se relit (les deux versions restent visibles) et la saisie reste. */
	function ecrire(qui: string, verbe: string, apres?: () => void): SubmitFunction {
		const soumettre = ecriture.enhance({ verbe, apres });
		return async (entree) => {
			cible = qui;
			const suite = await soumettre(entree);
			if (!suite) return;
			return async (sortie) => {
				await suite(sortie);
				if (sortie.result.type === 'failure' && sortie.result.status === 409) await invalidateAll();
			};
		};
	}
	$effect(() => {
		if (ecriture.note?.ton !== 'fait') return;
		const t = setTimeout(() => ecriture.effacer(), 3000);
		return () => clearTimeout(t);
	});
	const noteDe = (qui: string) => (cible === qui && ecriture.note ? ecriture.note : null);
	const humide = (qui: string) => cible === qui && ecriture.etat === 'humide';

	// ---- Écrire sous la dernière ligne ; le brouillon reste dans ce navigateur après un refus ---------
	// Seule exception au stockage local : c'est un brouillon, pas une donnée du carnet.
	const CLE_BROUILLON = 'np:journal:brouillon';
	let brouillon = $state('');
	let zone = $state<HTMLTextAreaElement | null>(null);
	onMount(() => {
		try {
			const garde = sessionStorage.getItem(CLE_BROUILLON);
			if (garde && !brouillon) brouillon = garde;
		} catch {
			/* stockage indisponible : le brouillon ne vit que dans le champ */
		}
	});
	function garder() {
		try {
			if (brouillon.trim()) sessionStorage.setItem(CLE_BROUILLON, brouillon);
			else sessionStorage.removeItem(CLE_BROUILLON);
		} catch {
			/* rien */
		}
	}
	function oublier() {
		brouillon = '';
		try {
			sessionStorage.removeItem(CLE_BROUILLON);
		} catch {
			/* rien */
		}
	}
	const derniere = $derived(data.notes.page >= data.notes.pages);

	// ---- Corriger, rayer ------------------------------------------------------------------------
	let enCorrection = $state<string | null>(null);
	let correction = $state('');
	let aRayer = $state<string | null>(null);
	async function corriger(e: JournalEntryView) {
		enCorrection = e.id;
		correction = e.text;
		aRayer = null;
		await tick();
		document.getElementById(`corriger-${e.id}`)?.focus();
	}
	/** Les versions précédentes, de la plus récente à la plus ancienne. */
	function versions(e: JournalEntryView): JournalEntryView[] {
		const out: JournalEntryView[] = [];
		for (let p = e.previous; p; p = p.previous) out.push(p);
		return out;
	}
	const quand = (e: JournalEntryView) => e.label ?? dateCourte(e.at);

	// ---- Faits validés ----------------------------------------------------------------------------
	let faitType = $state<string>('dette');
	let faitEnvers = $state('');
	let faitTexte = $state('');
	function etatFait(f: FactView): string {
		if (f.status === 'proposed') return `proposé le ${dateLongue(f.proposedAt)} · attend un tampon`;
		if (f.status === 'settled') return `réglée · tamponné le ${dateLongue(f.settledAt ?? f.stamp?.at ?? f.proposedAt)}`;
		if (f.status === 'rejected') return `non retenu · tamponné le ${dateLongue(f.stamp?.at ?? f.proposedAt)}`;
		return `tamponné le ${dateLongue(f.stamp?.at ?? f.proposedAt)}`;
	}
</script>

<svelte:head><title>Mon journal — {courante.titre}</title></svelte:head>

{#snippet sousNavigation(classe: string)}
	<nav class="voix {classe}" aria-label="Les trois voix du journal">
		<ul>
			{#each VOIX as v (v.cle)}
				<li>
					<a href={lienVoix(v.cle)} aria-current={data.voix === v.cle ? 'page' : undefined}>
						<span class="voix-titre">{v.titre}</span>
						{#if classe === 'en-marge'}<span class="voix-phrase">{v.phrase}</span>{/if}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
{/snippet}

<Page repere="NP / 02 — Mon journal" titre="Mon" titreVoix="journal." grain>
	{#snippet marge()}
		<p class="compte">{pagesEcrites}</p>
		{@render sousNavigation('en-marge')}
	{/snippet}
	{#snippet bande()}
		{@render sousNavigation('en-bande')}
	{/snippet}

	<p class="visibilite">{courante.phrase}</p>

	{#if data.voix === 'notes'}
		<!-- ===== Mes notes ===== -->
		<section class="feuille" aria-label="Mes notes">
			{#if data.notes.page > 1}
				<nav class="tourner haut" aria-label="Pages du journal">
					<Bouton variante="texte" href="/carnet/journal?page={data.notes.page - 1}">← Pages précédentes</Bouton>
				</nav>
			{/if}

			{#if data.notes.rows.length}
				<ol class="entrees">
					{#each data.notes.rows as e (e.id)}
						<li class="entree" class:rayee={e.struck}>
							<p class="date">
								<span class="jour">{quand(e)}</span>
								{#if !e.label}<span class="heure chiffres">{heure(e.at)}</span>{/if}
								{#if e.inScene}<span class="en-scene">notée en scène</span>{/if}
							</p>
							<div class="ecrit">
								{#if enCorrection === e.id}
									<form method="POST" action="?/corriger" use:enhance={ecrire(`corriger:${e.id}`, 'Corrigé', () => (enCorrection = null))}>
										<input type="hidden" name="entryId" value={e.id} />
										<label class="sr-only" for="corriger-{e.id}">Corriger l’entrée du {quand(e)}</label>
										<textarea id="corriger-{e.id}" class="sur-reglure" class:humide={humide(`corriger:${e.id}`)} name="text" bind:value={correction} maxlength={JOURNAL_MAX_CHARS} rows="2"></textarea>
										<div class="actions">
											<Bouton variante="ruban" type="submit" disabled={!correction.trim() || correction.trim() === e.text.trim()}>
												<Encre etat={cible === `corriger:${e.id}` ? ecriture.etat : 'prise'}>Noter la correction</Encre>
											</Bouton>
											<button class="lien-discret" type="button" onclick={() => (enCorrection = null)}>Laisser tel quel</button>
										</div>
									</form>
								{:else}
									<p class="texte">{e.text}</p>
								{/if}
								{#each versions(e) as p (p.id)}
									<p class="ancienne"><s>{p.text}</s><span class="sr-only"> (version raturée du {quand(p)})</span></p>
								{/each}
								{#if e.struck}
									<p class="mention">rayée</p>
								{:else if enCorrection !== e.id}
									<div class="actions">
										{#if aRayer === e.id}
											<span class="question">Rayer cette entrée&nbsp;? Elle restera lisible.</span>
											<form method="POST" action="?/rayer" use:enhance={ecrire(`rayer:${e.id}`, 'Rayé', () => (aRayer = null))}>
												<input type="hidden" name="entryId" value={e.id} />
												<button class="lien-discret fort" type="submit"><Encre etat={cible === `rayer:${e.id}` ? ecriture.etat : 'prise'}>Oui, la rayer</Encre></button>
											</form>
											<button class="lien-discret" type="button" onclick={() => (aRayer = null)}>Laisser</button>
										{:else}
											<button class="lien-discret" type="button" onclick={() => corriger(e)}>Corriger</button>
											<button class="lien-discret" type="button" onclick={() => (aRayer = e.id)}>Rayer</button>
										{/if}
									</div>
								{/if}
								{#if noteDe(`corriger:${e.id}`) ?? noteDe(`rayer:${e.id}`)}
									{@const n = (noteDe(`corriger:${e.id}`) ?? noteDe(`rayer:${e.id}`))!}
									<NoteDeMarge ton={n.ton}>{n.texte}</NoteDeMarge>
								{/if}
							</div>
						</li>
					{/each}
				</ol>
			{:else}
				<Vide>Cette page est blanche. Elle t’attend.</Vide>
			{/if}

			{#if derniere}
				<form class="ecrire" method="POST" action="?/noter" use:enhance={ecrire('noter', 'Noté', oublier)}>
					<label class="date" for="nouvelle-page"><span class="jour">Aujourd’hui</span><span class="sr-only"> — écrire une nouvelle entrée</span></label>
					<div class="ecrit">
						<textarea
							id="nouvelle-page"
							class="sur-reglure"
							class:humide={humide('noter')}
							name="text"
							rows="3"
							maxlength={JOURNAL_MAX_CHARS}
							placeholder="Écris sous la dernière ligne…"
							bind:this={zone}
							bind:value={brouillon}
							oninput={garder}
						></textarea>
						<div class="noter-barre">
							<Bouton variante="ruban" type="submit" disabled={!brouillon.trim()}>
								<Encre etat={cible === 'noter' ? ecriture.etat : 'prise'}>Noter</Encre>
							</Bouton>
							<div class="note-noter" aria-live="polite">
								{#if noteDe('noter')}<NoteDeMarge ton={noteDe('noter')!.ton}>{noteDe('noter')!.texte}</NoteDeMarge>{/if}
							</div>
						</div>
					</div>
				</form>
			{:else}
				<nav class="tourner" aria-label="Pages du journal">
					<span></span>
					<Bouton variante="texte" href="/carnet/journal?page={data.notes.page + 1}" fleche="→">Pages suivantes</Bouton>
				</nav>
			{/if}
		</section>
	{:else if data.voix === 'recits'}
		<!-- ===== Récits ===== -->
		<section class="feuille" aria-label="Récits">
			{#if data.recits.length}
				<ol class="recits">
					{#each data.recits as r (r.id)}
						<li class="recit">
							<p class="date"><span class="jour">{dateCourte(r.at)}</span></p>
							<div class="recit-corps">
								<p class="recit-titre">{r.title}</p>
								<p class="recit-details chiffres">{r.round} round{r.round > 1 ? 's' : ''}{#if r.name && r.name !== r.title}{' · '}{r.name}{/if}</p>
							</div>
							<p class="recit-gestes">
								<Bouton variante="texte" href="/carnet/recits/{r.id}" fleche="→">Lire</Bouton>
								<a class="lien-discret export" href="/carnet/recits/{r.id}/texte" download>Exporter (.txt)</a>
							</p>
						</li>
					{/each}
				</ol>
				{#if data.pageRecits > 1 || data.recits.length >= 20}
					<nav class="tourner" aria-label="Pages des récits">
						{#if data.pageRecits > 1}<Bouton variante="texte" href="/carnet/journal?voix=recits&recits={data.pageRecits - 1}">← Récits plus récents</Bouton>{:else}<span></span>{/if}
						{#if data.recits.length >= 20}<Bouton variante="texte" href="/carnet/journal?voix=recits&recits={data.pageRecits + 1}" fleche="→">Récits plus anciens</Bouton>{/if}
					</nav>
				{/if}
			{:else}
				<Vide>Les récits restent à écrire.</Vide>
			{/if}
		</section>
	{:else}
		<!-- ===== Faits validés ===== -->
		<section class="feuille" id="faits" aria-label="Faits validés" tabindex="-1">
			{#if data.faits.length}
				<ol class="faits">
					{#each data.faits as f (f.id)}
						<li class="fait {f.status}">
							<p class="date"><span class="jour">{dateCourte(f.stamp?.at ?? f.proposedAt)}</span></p>
							<div class="fait-corps">
								<p class="fait-tete">
									<span class="fait-type">{FACT_KIND_LABELS[f.kind] ?? f.kind}</span>
									{#if f.counterpart}<span class="envers">envers {f.counterpart}</span>{/if}
								</p>
								<p class="fait-texte">{#if f.status === 'settled' || f.status === 'rejected'}<s>{f.text}</s>{:else}{f.text}{/if}</p>
								<p class="fait-pied">
									{#if f.stamp && f.status !== 'proposed'}<Tampon cle={f.id}>{f.stamp.role} {f.stamp.name}</Tampon>{/if}
									<span class="fait-etat" class:attend={f.status === 'proposed'}>{etatFait(f)}</span>
									{#if f.witness}<span class="temoin">témoin : {f.witness}</span>{/if}
									{#if f.stamp?.motif && f.status !== 'proposed'}<span class="temoin">motif : {f.stamp.motif}</span>{/if}
								</p>
							</div>
						</li>
					{/each}
				</ol>
			{:else}
				<Vide>Aucun fait validé. Ils s’écrivent d’abord sur Discord ; propose-en un ici quand un MJ peut le tamponner.</Vide>
			{/if}

			<form class="proposer" method="POST" action="?/proposerFait" use:enhance={ecrire('fait', 'Proposé', () => { faitEnvers = ''; faitTexte = ''; })}>
				<p class="repere">Proposer un fait</p>
				<div class="ligne-fait">
					<label class="petit-champ">
						<span class="etiquette">Type</span>
						<select name="kind" bind:value={faitType}>
							{#each FACT_KINDS as k (k)}<option value={k}>{FACT_KIND_LABELS[k]}</option>{/each}
						</select>
					</label>
					<label class="petit-champ">
						<span class="etiquette">Envers</span>
						<input name="counterpart" bind:value={faitEnvers} maxlength={FACT_COUNTERPART_MAX} placeholder="Kael Morvan" autocomplete="off" />
					</label>
					<label class="petit-champ large">
						<span class="etiquette">Le fait</span>
						<input name="text" class:humide={humide('fait')} bind:value={faitTexte} maxlength={FACT_TEXT_MAX} placeholder="Je lui dois la traversée du gué." autocomplete="off" required />
					</label>
				</div>
				<div class="gestes">
					<Bouton variante="trait" type="submit" disabled={!faitTexte.trim()}>
						<Encre etat={cible === 'fait' ? ecriture.etat : 'prise'}>Proposer au tampon</Encre>
					</Bouton>
					<div aria-live="polite">{#if noteDe('fait')}<NoteDeMarge ton={noteDe('fait')!.ton}>{noteDe('fait')!.texte}</NoteDeMarge>{/if}</div>
				</div>
			</form>
		</section>
	{/if}
</Page>

<style>
	/* ---- Marge ---- */
	.compte {
		font: italic 400 20px/28px var(--voix);
		color: var(--encre);
	}
	.voix.en-marge {
		margin-top: var(--ligne);
	}
	.voix.en-marge a {
		display: grid;
		gap: 2px;
		padding: 12px 0 12px 14px;
		border-left: 1px solid var(--reglure);
		text-decoration: none;
		color: var(--encre-2);
		transition: border-color 160ms, color 160ms;
	}
	.voix.en-marge a:hover {
		color: var(--encre);
	}
	.voix.en-marge a[aria-current='page'] {
		border-left: 2px solid var(--encre-humide);
		padding-left: 13px;
		color: var(--encre);
	}
	.voix-titre {
		font: 500 20px/28px var(--voix);
	}
	.voix-phrase {
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.voix.en-bande {
		width: 100%;
	}
	.voix.en-bande ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0 18px;
		border-bottom: 1px solid var(--reglure);
	}
	.voix.en-bande a {
		display: inline-flex;
		align-items: center;
		min-height: var(--cible);
		margin-bottom: -1px;
		border-bottom: 2px solid transparent;
		font: var(--t-libelle);
		font-size: 14px;
		color: var(--encre-2);
		text-decoration: none;
	}
	.voix.en-bande a[aria-current='page'] {
		color: var(--encre);
		border-bottom-color: var(--encre-humide);
	}

	/* ---- Corps ---- */
	.visibilite {
		font: italic 400 18px/28px var(--voix);
		color: var(--encre-2);
	}

	/* La feuille réglée : ses lignes partent de son propre bord, chaque bloc tient un nombre entier de lignes. */
	.feuille {
		--marge-date: 9.5em;
		margin-top: var(--ligne);
		padding-top: var(--ligne);
		background-image: repeating-linear-gradient(
			to bottom,
			transparent 0 calc(var(--ligne) - 1px),
			var(--reglure) calc(var(--ligne) - 1px) var(--ligne)
		);
		outline: none;
	}
	.entree,
	.ecrire,
	.recit,
	.fait {
		display: grid;
		grid-template-columns: var(--marge-date) minmax(0, 1fr);
		gap: 0 20px;
	}
	/* Une ligne blanche entre deux entrées : on lit un carnet, pas une liste. */
	.entree {
		padding-bottom: var(--ligne);
	}
	.entree .actions .lien-discret {
		color: var(--encre-grise);
	}
	.entree:hover .actions .lien-discret,
	.entree .actions .lien-discret:focus-visible {
		color: var(--encre-2);
	}
	.date {
		display: flex;
		flex-direction: column;
		font: var(--t-repere);
		line-height: var(--ligne);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--encre-2);
	}
	.heure,
	.en-scene {
		color: var(--encre-grise);
		letter-spacing: 0.06em;
		text-transform: none;
	}
	.en-scene {
		font: var(--t-libelle);
		line-height: var(--ligne);
	}
	.texte,
	.ancienne {
		font: var(--t-recit);
		color: var(--encre);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.ancienne s {
		color: var(--encre-grise);
		text-decoration-thickness: 1px;
	}
	.rayee .texte {
		text-decoration: line-through;
		text-decoration-thickness: 1px;
		color: var(--encre-2);
	}
	.mention {
		font: var(--t-libelle);
		line-height: var(--ligne);
		color: var(--encre-grise);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0 20px;
		min-height: calc(var(--ligne) * 2);
	}
	.question {
		font: italic 400 17px/28px var(--voix);
		color: var(--encre);
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
		cursor: pointer;
	}
	.lien-discret:hover,
	.lien-discret.fort {
		color: var(--encre);
	}
	.export {
		display: inline-flex;
		align-items: center;
	}

	/* Écrire sur la réglure : pas de cadre, le curseur se pose sur la ligne. */
	.sur-reglure {
		display: block;
		width: 100%;
		min-height: calc(var(--ligne) * 3);
		padding: 0;
		background: transparent;
		border: 0;
		border-radius: 0;
		resize: none;
		field-sizing: content;
		font: var(--t-recit);
		color: var(--encre);
		caret-color: var(--encre-humide);
		transition: color var(--secher);
	}
	.sur-reglure::placeholder {
		font-style: italic;
		color: var(--encre-grise);
	}
	.sur-reglure:focus-visible {
		outline: none;
	}
	.sur-reglure:focus-visible::placeholder {
		color: var(--encre-2);
	}
	.ecrire:focus-within .date .jour {
		color: var(--encre-humide);
	}
	.humide {
		color: var(--encre-humide);
		transition: none;
	}
	.noter-barre {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 20px;
		min-height: calc(var(--ligne) * 2);
		padding-top: 6px;
	}
	.note-noter {
		min-width: 0;
	}
	.tourner {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		min-height: calc(var(--ligne) * 2);
	}
	.tourner.haut {
		margin-bottom: var(--ligne);
	}

	/* ---- Récits ---- */
	.recit {
		grid-template-columns: var(--marge-date) minmax(0, 1fr) auto;
		align-items: start;
		min-height: calc(var(--ligne) * 3);
	}
	.recit-titre {
		font: 500 22px/28px var(--voix);
		color: var(--encre);
	}
	.recit-details {
		font: var(--t-libelle);
		line-height: var(--ligne);
		color: var(--encre-2);
	}
	.recit-gestes {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0 20px;
	}

	/* ---- Faits validés ---- */
	.fait {
		padding-bottom: var(--ligne);
	}
	.fait-tete {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0 14px;
		line-height: var(--ligne);
	}
	.fait-type {
		font: var(--t-repere);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--encre);
	}
	.envers {
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.fait-texte {
		font: var(--t-recit);
		color: var(--encre);
	}
	.fait-texte s {
		color: var(--encre-2);
		text-decoration-thickness: 1px;
	}
	.fait-pied {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 16px;
		min-height: calc(var(--ligne) * 2);
	}
	.fait-etat,
	.temoin {
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.fait-etat.attend {
		color: var(--encre-humide);
	}
	.proposer {
		display: grid;
		gap: 8px;
		padding-top: var(--ligne);
		padding-bottom: var(--ligne);
		border-top: 1px solid var(--encre-grise);
		background: var(--page);
	}
	.ligne-fait {
		display: grid;
		grid-template-columns: 11rem 12rem minmax(0, 1fr);
		gap: 8px 20px;
	}
	.petit-champ {
		display: grid;
	}
	.etiquette {
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.petit-champ select,
	.petit-champ input {
		width: 100%;
		min-height: var(--cible);
		padding: 8px 0;
		background: transparent;
		border: 0;
		border-bottom: 1px solid color-mix(in srgb, var(--encre) 28%, transparent);
		border-radius: 0;
		font: var(--t-corps);
		color: var(--encre);
		caret-color: var(--encre-humide);
	}
	.petit-champ select option {
		background: var(--page);
		color: var(--encre);
	}
	.petit-champ input::placeholder {
		color: var(--encre-grise);
	}
	.petit-champ input.humide {
		color: var(--encre-humide);
	}
	.gestes {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 20px;
	}

	@media (max-width: 760px) {
		.feuille {
			--marge-date: auto;
		}
		.entree,
		.ecrire,
		.recit,
		.fait {
			grid-template-columns: minmax(0, 1fr);
		}
		/* La date de l'entrée reste visible pendant qu'on lit ou qu'on écrit. */
		.date {
			position: sticky;
			top: 0;
			z-index: 1;
			flex-direction: row;
			flex-wrap: wrap;
			gap: 0 12px;
			background: var(--page);
		}
		.recit-gestes {
			padding-bottom: var(--ligne);
		}
		/* « Noter » ancré au-dessus du clavier. */
		.noter-barre {
			position: sticky;
			bottom: 0;
			z-index: 2;
			background: var(--page);
			box-shadow: 0 -1px 0 var(--reglure);
		}
		.ligne-fait {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.sur-reglure,
		.voix.en-marge a {
			transition: none;
		}
	}
</style>
