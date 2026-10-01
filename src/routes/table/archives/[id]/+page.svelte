<script lang="ts">
	// /table/archives/[id] — un récit lu par le MJ : qui était là, le journal du combat round par
	// round (lignes réservées marquées), les notes du MJ (encre laiton, jamais servies aux joueurs),
	// les extraits publiés (tamponnés, rayables avec motif) et « Publier un extrait » a posteriori.
	import { enhance } from '$app/forms';
	import Page from '$lib/ui/Page.svelte';
	import Chapitre from '$lib/ui/Chapitre.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import Tampon from '$lib/ui/Tampon.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import Sommaire from '$lib/ui/table/Sommaire.svelte';
	import { creerEcriture } from '$lib/ui/ecriture.svelte';
	import { dateCourte, dateLongue, heure } from '$lib/ui/dates';
	import { sansEmoji } from '$lib/ui/table/texte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const r = $derived(data.recit);
	/** Journal regroupé par round, sans pictogramme. */
	const rounds = $derived.by(() => {
		const groupes = new Map<number, typeof data.journal>();
		for (const e of data.journal) {
			if (!sansEmoji(e.text)) continue;
			const g = groupes.get(e.round) ?? [];
			g.push(e);
			groupes.set(e.round, g);
		}
		return [...groupes.entries()].sort((a, b) => a[0] - b[0]);
	});

	const publier = creerEcriture();
	let extrait = $state('');
	let accueil = $state(true);
	let creatures = $state<string[]>([]);
	const lignes = $derived(extrait.split(/\r?\n/).filter((l) => l.trim()).length);
	const valide = $derived(lignes >= 2 && lignes <= 4 && !/\n\s*\n/.test(extrait.trim()) && (accueil || creatures.length > 0));

	const rayer = creerEcriture();
	let enRature = $state<string | null>(null);
	let motif = $state('');
</script>

<svelte:head><title>{r.titre} — Archives — Nuages Polaires</title></svelte:head>

<Page repere="NP / 06 — La Table · récit" titre={r.titre} reglure={false}>
	{#snippet marge()}
		<Sommaire />
		<dl class="fiche-recit">
			<dt>Replié</dt>
			<dd class="chiffres">{dateLongue(r.at)} · {heure(r.at)}</dd>
			<dt>Durée</dt>
			<dd class="chiffres">{r.rounds} round{r.rounds > 1 ? 's' : ''}</dd>
			<dt>Lecture</dt>
			<dd>{r.lisible ? 'Lisible par ses participants, sans tes notes.' : 'Réservé à la Table.'}</dd>
			{#if r.salon}
				<dt>Salon</dt>
				<dd><a href={r.salon} rel="noopener noreferrer" target="_blank">Ouvrir le salon ↗</a></dd>
			{/if}
		</dl>
	{/snippet}
	{#snippet bande()}
		<Sommaire />
		<span class="chiffres">{dateCourte(r.at)} · {r.rounds} round{r.rounds > 1 ? 's' : ''} · {r.lisible ? 'lisible par ses participants' : 'réservé à la Table'}</span>
	{/snippet}

	<Chapitre numero="01" titre="À la Table">
		<div class="presents">
			<div>
				<h3 class="sous">Élèves du Serment</h3>
				{#if data.eleves.length}
					<ul>
						{#each data.eleves as e (e.id)}
							<li><span class="nom">{e.nom}</span><span class="detail chiffres">niv. {e.niveau} · PV {e.pv}{e.ko ? ' · KO' : ''}</span></li>
						{/each}
					</ul>
				{:else}
					<Vide>Aucun Élève du Serment à cette Table.</Vide>
				{/if}
			</div>
			<div>
				<h3 class="sous">Adversaires</h3>
				{#if data.adversaires.length}
					<ul>
						{#each data.adversaires as a (a.id)}
							<li><a class="nom" href="/univers/bestiaire/{a.id}">{a.nom}</a></li>
						{/each}
					</ul>
				{:else}
					<Vide>Aucun adversaire du bestiaire.</Vide>
				{/if}
			</div>
		</div>
	</Chapitre>

	<Chapitre numero="02" titre="Le récit">
		{#if rounds.length}
			<div class="journal">
				{#each rounds as [n, entrees] (n)}
					<section class="round" aria-label="Round {n}">
						<h3 class="sous chiffres">Round {n}</h3>
						<ol>
							{#each entrees as e (e.n)}
								<li class={e.kind} class:prive={e.prive}>
									{sansEmoji(e.text)}{#if e.prive}<span class="marque"> · réservé au MJ</span>{/if}
								</li>
							{/each}
						</ol>
					</section>
				{/each}
			</div>
		{:else}
			<Vide>Ce récit n’a gardé aucune ligne.</Vide>
		{/if}
	</Chapitre>

	<Chapitre numero="03" titre="Notes du MJ" chapeau="Jamais servies aux joueurs, même aux participants.">
		{#if data.notes.trim()}
			<p class="notes">{data.notes}</p>
		{:else}
			<Vide>Aucune note gardée pour ce combat.</Vide>
		{/if}
	</Chapitre>

	<Chapitre numero="04" titre="Extraits publiés" chapeau="Un extrait se lit sur l’accueil et sur la page des créatures cochées. Aucun nom de participant sur l’accueil.">
		{#if data.extraits.length}
			<ul class="extraits">
				{#each data.extraits as x (x.id)}
					<li class:raye={x.raye}>
						<p class="texte-extrait">{x.texte}</p>
						<p class="destinations detail">
							{[x.accueil ? 'l’accueil' : '', ...x.creatures.map((c) => `la page de ${c}`)].filter(Boolean).join(' · ')}
						</p>
						{#if x.raye}
							<p class="detail">Rayé{x.rayeA ? ` le ${dateCourte(x.rayeA)}, ${heure(x.rayeA)}` : ''} : il ne se lit plus nulle part.</p>
						{:else}
							<div class="signature">
								<Tampon cle={x.id}>Publié · {dateCourte(x.at)}, {heure(x.at)}</Tampon>
								{#if enRature === x.id}
									<form
										method="POST"
										action="?/rayerPublication"
										class="rature"
										use:enhance={rayer.enhance({ verbe: 'Rayé', apres: () => ((enRature = null), (motif = '')) })}
									>
										<input type="hidden" name="publication" value={x.id} />
										<label>
											<span>Motif de la rature</span>
											<!-- svelte-ignore a11y_autofocus -->
											<input name="motif" bind:value={motif} required maxlength={2000} autofocus />
										</label>
										<Bouton variante="rouille" type="submit" disabled={!motif.trim() || rayer.enCours}>Rayer la publication</Bouton>
										<button type="button" class="geste" onclick={() => (enRature = null)}>Garder</button>
									</form>
								{:else}
									<button type="button" class="geste" onclick={() => ((enRature = x.id), (motif = ''))}>Rayer la publication</button>
								{/if}
							</div>
						{/if}
					</li>
				{/each}
			</ul>
			{#if rayer.note}
				<div aria-live="polite"><NoteDeMarge ton={rayer.note.ton}>{rayer.note.texte}</NoteDeMarge></div>
			{/if}
		{:else}
			<Vide>Rien n’a été publié de ce récit. L’accueil garde un feuillet blanc.</Vide>
		{/if}

		<form method="POST" action="?/publier" class="publier" use:enhance={publier.enhance({ verbe: 'Publié', apres: () => (extrait = '') })}>
			<h3 class="sous">Publier un extrait</h3>
			<label class="champ">
				<span>Deux à quatre lignes, écrites par toi</span>
				<textarea name="extrait" bind:value={extrait} rows="4" maxlength={4000} required></textarea>
			</label>
			<p class="detail chiffres" class:refus={extrait.trim() && (lignes < 2 || lignes > 4)} aria-live="polite">
				{lignes ? `${lignes} ligne${lignes > 1 ? 's' : ''}` : 'Va à la ligne entre deux phrases.'}
			</p>
			<fieldset>
				<legend>Destinations</legend>
				<label class="case"><input type="checkbox" name="accueil" value="oui" bind:checked={accueil} /><span>L’accueil</span></label>
				{#each data.adversaires as a (a.id)}
					<label class="case"><input type="checkbox" name="creatures" value={a.id} bind:group={creatures} /><span>La page de {a.nom}</span></label>
				{/each}
			</fieldset>
			<div class="valider">
				<Bouton variante="tampon" type="submit" disabled={!valide || publier.enCours}>Publier l’extrait</Bouton>
			</div>
			{#if publier.note}
				<div aria-live="polite"><NoteDeMarge ton={publier.note.ton}>{publier.note.texte}</NoteDeMarge></div>
			{/if}
		</form>
	</Chapitre>
</Page>

<style>
	.fiche-recit {
		display: grid;
		gap: 4px;
		margin-top: 24px;
	}
	.fiche-recit dt {
		font: var(--t-repere);
		letter-spacing: var(--approche-repere);
		text-transform: uppercase;
		color: var(--encre-grise);
		margin-top: 8px;
	}
	.fiche-recit dd {
		font: var(--t-libelle);
		color: var(--encre);
	}
	.fiche-recit a {
		display: inline-flex;
		min-height: 44px;
		align-items: center;
		color: var(--encre-humide);
	}
	.sous {
		font: var(--t-repere);
		letter-spacing: var(--approche-repere);
		text-transform: uppercase;
		color: var(--encre-2);
		line-height: 24px;
		border-bottom: 1px solid var(--reglure);
	}
	.presents {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 48px;
		padding-top: 24px;
	}
	.presents li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		min-height: 48px;
		border-bottom: 1px solid var(--reglure);
	}
	.nom {
		font: 500 14px/24px var(--corps);
		color: var(--encre);
	}
	a.nom {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--encre-humide) 45%, transparent);
		text-underline-offset: 4px;
	}
	.detail {
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.detail.refus {
		color: var(--rouille);
	}
	.journal {
		display: grid;
		gap: 24px;
		padding-top: 24px;
		background-image: repeating-linear-gradient(
			to bottom,
			transparent 0 calc(var(--ligne) - 1px),
			var(--reglure) calc(var(--ligne) - 1px) var(--ligne)
		);
	}
	.round li {
		font: 500 14px/24px var(--corps);
		color: var(--encre-2);
	}
	.round li.damage,
	.round li.heal,
	.round li.spell,
	.round li.summon {
		color: var(--encre);
	}
	.round li.round {
		font-weight: 600;
		color: var(--encre);
	}
	.round li.prive {
		font-style: italic;
		color: var(--encre-grise);
	}
	.marque {
		font-style: normal;
		font-size: 12px;
		letter-spacing: 0.06em;
	}
	.notes {
		padding-top: 24px;
		white-space: pre-wrap;
		font: 500 14px/24px var(--corps);
		color: var(--tampon);
		background-image: repeating-linear-gradient(
			to bottom,
			transparent 0 calc(var(--ligne) - 1px),
			var(--reglure) calc(var(--ligne) - 1px) var(--ligne)
		);
		background-position: 0 24px;
	}
	.extraits li {
		display: grid;
		gap: 8px;
		padding: 24px 0;
		border-bottom: 1px solid var(--reglure);
	}
	.texte-extrait {
		white-space: pre-wrap;
		font: var(--t-recit);
		color: var(--encre);
		max-width: var(--lecture);
	}
	.raye .texte-extrait {
		color: var(--encre-grise);
		text-decoration: line-through;
		text-decoration-thickness: 1px;
	}
	.signature {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 24px;
	}
	.rature {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 8px 16px;
		flex: 1 1 100%;
		padding: 8px 12px 12px;
		background: var(--page-2);
		border-left: 2px solid var(--rouille);
	}
	label {
		display: grid;
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.rature label {
		flex: 1 1 240px;
	}
	input:not([type='checkbox']),
	textarea {
		min-height: 44px;
		padding: 8px 0;
		border: 0;
		border-bottom: 1px solid color-mix(in srgb, var(--encre) 28%, transparent);
		background: transparent;
		font: 500 14px/24px var(--corps);
		color: var(--encre);
	}
	textarea {
		padding: 0;
		resize: vertical;
		background: repeating-linear-gradient(
			to bottom,
			transparent 0 calc(var(--ligne) - 1px),
			var(--reglure) calc(var(--ligne) - 1px) var(--ligne)
		);
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
		text-decoration-color: color-mix(in srgb, var(--rouille) 55%, transparent);
		text-underline-offset: 4px;
	}
	.publier {
		display: grid;
		gap: 12px;
		max-width: 720px;
		margin-top: 48px;
	}
	fieldset {
		margin: 0;
		padding: 0;
		border: 0;
	}
	legend {
		padding: 0;
		font: var(--t-repere);
		letter-spacing: var(--approche-repere);
		text-transform: uppercase;
		color: var(--encre-2);
		line-height: 24px;
	}
	.case {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 44px;
		font: 500 14px/24px var(--corps);
		color: var(--encre);
		cursor: pointer;
	}
	.case input {
		width: 20px;
		height: 20px;
		margin: 0;
		accent-color: var(--tampon);
	}
	.valider {
		display: flex;
		justify-content: flex-end;
	}
	@media (max-width: 760px) {
		.presents {
			grid-template-columns: 1fr;
			gap: 24px;
		}
		.valider :global(.bouton) {
			width: 100%;
			justify-content: center;
		}
	}
</style>
