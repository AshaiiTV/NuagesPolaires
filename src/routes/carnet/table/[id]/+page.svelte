<script lang="ts">
	// La Table vue par un joueur (03-vision §5.9, §6.7, P3). Lever les yeux de Discord et comprendre
	// en une seconde ce qui a changé, sans pouvoir agir : aucune action sur le combat, aucun élément
	// cliquable dans la zone de la Table. La page s'écrit au rythme du MJ par un sondage court
	// (4 s, arrêté hors onglet visible) d'un état versionné ; jamais de promesse « en direct ».
	import { onMount, untrack } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import Enveloppe from '$lib/ui/Enveloppe.svelte';
	import Losange from '$lib/ui/Losange.svelte';
	import Rature from '$lib/ui/Rature.svelte';
	import Encre from '$lib/ui/Encre.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import Feuille from '$lib/ui/scene/Feuille.svelte';
	import Ressource from '$lib/ui/scene/Ressource.svelte';
	import CarteRegle from '$lib/ui/scene/CarteRegle.svelte';
	import { copierTexte } from '$lib/ui/scene/presse-papiers';
	import { sansEmoji } from '$lib/ui/scene/regles';
	import { consigne, phaseLibelle } from '$lib/ui/scene/table';
	import { rubanPour } from '$lib/ui/navigation';
	import { dateHeure, heure } from '$lib/ui/dates';
	import { channelFromTitle } from '$lib/schemas/scenes';
	import type { PlayerTableView } from '$lib/schemas/combats';
	import type { ProjectedFighter, NarrativeCondition } from '$lib/game/combat/projection';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	/** Le ruban ouvre le feuillet par-dessus la Table (03-vision §5.9, P3). */
	const ruban = $derived(data.compte ? rubanPour(data.compte) : null);

	type Champ = 'pv' | 'ep' | 'em';
	const CHAMPS: readonly Champ[] = ['pv', 'ep', 'em'];
	const NOMS = { pv: 'PV', ep: 'EP', em: 'EM' } as const;
	const ETATS: Record<NarrativeCondition, string> = { LEGER: 'Léger', GRAVE: 'Grave', CRITIQUE: 'Critique' };
	const SONDAGE_MS = 4000;
	const RETARD_S = 8;
	const PERDUE_S = 30;
	const RATURE_MS = 4000;
	const HUMIDE_MS = 1200;

	// ── L'heure, calée sur le serveur ──
	const decalage = untrack(() => Date.parse(data.maintenant) - Date.now());
	const temps = () => Date.now() + decalage;
	let maintenant = $state(untrack(() => Date.parse(data.maintenant)));

	// ── L'état reçu ──
	let vue = $state<PlayerTableView | null>(untrack(() => data.table));
	let etag = untrack(() => (data.table ? `"${data.table.revision}"` : ''));
	let recuA = $state(untrack(() => Date.parse(data.maintenant)));
	let echecs = $state(0);
	let enCours = $state(false);

	// Une nouvelle lecture de la page (invalidation) remplace l'état reçu.
	$effect(() => {
		const t = data.table;
		untrack(() => {
			if (t && (!vue || t.revision !== vue.revision || t.projection.id !== vue.projection.id)) {
				vue = t;
				etag = `"${t.revision}"`;
				recuA = temps();
			}
			if (!t) vue = null;
		});
	});

	const p = $derived(vue?.projection ?? null);
	const moi = $derived(p?.self ?? null);
	const camp = $derived(moi?.type ?? 'player');
	const allies = $derived(p ? p.fighters.filter((f) => f.type === camp && f.id !== moi?.id) : []);
	const adversaires = $derived(p ? p.fighters.filter((f) => f.type !== camp) : []);
	const salon = $derived(vue ? channelFromTitle(vue.name) : data.repliee ? channelFromTitle(data.repliee.name) : '');

	// ── Ce qui a changé : l'ancienne valeur reste en rature 4 s ──
	let ratures = $state<Record<string, { ancien: string | number; jusqua: number }>>({});
	/** Lignes « Round 3 · résolu à 21:47. » écrites à la réception. */
	let resolus = $state<{ round: number; a: string; t: number }[]>([]);
	/** Arrivée des lignes de récit : humides le temps de sécher. */
	let arrivees = $state<Record<number, number>>({});
	let annonce = $state('');

	function valeur(f: ProjectedFighter, c: Champ): number | null {
		if (!f.resources) return null;
		return c === 'pv' ? f.resources.pvCur : c === 'ep' ? f.resources.epCur : f.resources.emCur;
	}
	function maximum(f: ProjectedFighter, c: Champ): number {
		if (!f.resources) return 0;
		return c === 'pv' ? f.resources.pvMax : c === 'ep' ? f.resources.epMax : f.resources.emMax;
	}
	function ancien(f: ProjectedFighter, cle: string): string | number | null {
		const r = ratures[`${f.id}:${cle}`];
		return r && r.jusqua > maintenant ? r.ancien : null;
	}

	/** Compare l'état reçu au précédent : ratures, rounds résolus, lignes nouvelles. */
	function appliquer(suivant: PlayerTableView) {
		const avant = vue?.projection;
		const apres = suivant.projection;
		const t = temps();
		if (avant) {
			const nouvelles = { ...ratures };
			for (const f of apres.fighters) {
				const g = avant.fighters.find((x) => x.id === f.id);
				if (!g) continue;
				for (const c of CHAMPS) {
					const a = valeur(g, c);
					const b = valeur(f, c);
					if (a !== null && b !== null && a !== b) nouvelles[`${f.id}:${c}`] = { ancien: a, jusqua: t + RATURE_MS };
				}
				if (g.condition && f.condition && g.condition !== f.condition)
					nouvelles[`${f.id}:etat`] = { ancien: ETATS[g.condition], jusqua: t + RATURE_MS };
			}
			ratures = nouvelles;
			const resolu =
				apres.round > avant.round || (avant.phase === 'resolution' && apres.phase !== 'resolution');
			if (resolu && avant.round > 0) {
				resolus = [...resolus, { round: avant.round, a: heure(t), t }];
				annonce = `Round ${avant.round} · résolu à ${heure(t)}.`;
			}
			const dernier = avant.log.at(-1)?.n ?? 0;
			const arrivent = { ...arrivees };
			for (const e of apres.log) if (e.n > dernier) arrivent[e.n] = t;
			arrivees = arrivent;
		}
		vue = suivant;
	}

	// ── Le sondage ──
	async function sonder() {
		if (enCours || !vue) return;
		enCours = true;
		try {
			const r = await fetch(`/api/table/${encodeURIComponent(vue.projection.id)}/etat`, {
				headers: etag ? { 'If-None-Match': etag } : {},
				cache: 'no-store',
				credentials: 'same-origin'
			});
			if (r.status === 304) {
				recuA = temps();
				echecs = 0;
			} else if (r.ok) {
				const suivant = (await r.json()) as PlayerTableView;
				const memeEtat = vue && JSON.stringify(vue.projection) === JSON.stringify(suivant.projection);
				appliquer(suivant);
				etag = r.headers.get('ETag') ?? `"${suivant.revision}"`;
				recuA = temps();
				echecs = 0;
				// Nouvelle version sans rien de neuf à la Table : elle vient peut-être d'être repliée.
				if (memeEtat) await invalidateAll();
			} else if (r.status === 404) {
				// Plus servie : repliée (le récit le dira) ou retirée aux participants.
				await invalidateAll();
			} else {
				echecs += 1;
			}
		} catch {
			echecs += 1;
		} finally {
			enCours = false;
		}
	}

	const age = $derived(Math.max(0, Math.floor((maintenant - recuA) / 1000)));
	const reception = $derived<'ok' | 'retard' | 'perdue'>(
		age > PERDUE_S || echecs >= 5 ? 'perdue' : age > RETARD_S ? 'retard' : 'ok'
	);
	const recuHeure = $derived(heure(recuA));

	// ── Ce que dit la Table (même source que la seconde ligne du feuillet) ──
	const tour = $derived(p?.currentFighterId ? (p.fighters.find((f) => f.id === p.currentFighterId) ?? null) : null);
	const phase = $derived(p ? phaseLibelle(p) : '');
	const consigneTable = $derived(p ? consigne(p, tour && tour.id !== moi?.id ? tour.name : null) : '');

	// ── Le récit des rounds : la plus récente en bas, « Round N · résolu à hh:mm. » à sa place ──
	type Ligne =
		| { genre: 'round'; cle: string; round: number }
		| { genre: 'texte'; cle: string; n: number; texte: string; kind: string }
		| { genre: 'resolu'; cle: string; round: number; a: string; t: number };
	const recit = $derived.by(() => {
		if (!p) return [] as Ligne[];
		const lignes: Ligne[] = [];
		let round = -1;
		const marques = [...resolus];
		for (const e of p.log) {
			while (marques.length && marques[0].round < e.round) {
				const m = marques.shift()!;
				lignes.push({ genre: 'resolu', cle: `r${m.round}-${m.t}`, round: m.round, a: m.a, t: m.t });
			}
			// Les marques de round du moteur ne sont pas du récit : le repère « Round N » suffit.
			if (e.kind === 'round') continue;
			if (e.round !== round) {
				round = e.round;
				lignes.push({ genre: 'round', cle: `t${e.n}`, round: e.round });
			}
			const texte = sansEmoji(e.text);
			if (texte) lignes.push({ genre: 'texte', cle: `n${e.n}`, n: e.n, texte, kind: e.kind });
		}
		for (const m of marques) lignes.push({ genre: 'resolu', cle: `r${m.round}-${m.t}`, round: m.round, a: m.a, t: m.t });
		return lignes;
	});

	// ── Barre basse : Copier pour Discord, Règle, Ouvrir le salon ──
	const carte = $derived.by(() => {
		const c = data.cartes;
		if (!c) return null;
		if (p?.phase === 'declaration') return c.actions;
		const statut = moi?.statuses.find((s) => c.statuts[s.id]);
		if (statut) return c.statuts[statut.id];
		if (moi?.resources && moi.resources.epMax > 0 && moi.resources.epCur / moi.resources.epMax < 0.2) return c.recuperation;
		return c.glossaire;
	});
	function libelleStatut(id: string): string {
		return data.statuts[id]?.label ?? id;
	}
	const bloc = $derived.by(() => {
		if (!vue || !moi) return '';
		const r = moi.resources;
		const l1 = `${moi.name} · À la table — ${vue.name} · Round ${vue.projection.round}`;
		const l2 = r
			? `PV ${r.pvCur}/${r.pvMax} · EP ${r.epCur}/${r.epMax} · EM ${r.emCur}/${r.emMax} · état de ${recuHeure}`
			: `État de ${recuHeure}`;
		const l3 = moi.statuses.length
			? moi.statuses.map((s) => `${libelleStatut(s.id)} ${s.tours} t.`).join(' · ')
			: 'Aucun statut.';
		return `${l1}\n${l2}\n${l3}`;
	});
	let copie = $state<{ ton: 'fait' | 'refus'; texte: string } | null>(null);
	let minuterieCopie: ReturnType<typeof setTimeout> | undefined;
	async function copier() {
		const ok = await copierTexte(bloc);
		copie = ok
			? { ton: 'fait', texte: `Copié · ${heure(temps())} — colle-le dans le salon.` }
			: { ton: 'refus', texte: 'La copie n’a pas pris. Recopie tes chiffres à la main.' };
		clearTimeout(minuterieCopie);
		minuterieCopie = setTimeout(() => (copie = null), 4000);
	}
	let regleOuverte = $state(false);
	let boutonRegle = $state<HTMLButtonElement>();
	async function basculerRegle() {
		regleOuverte = !regleOuverte;
		if (!regleOuverte) return boutonRegle?.focus();
		await Promise.resolve();
		requestAnimationFrame(() => document.getElementById('carte-regle')?.focus());
	}
	function fermerRegle() {
		regleOuverte = false;
		boutonRegle?.focus();
	}

	onMount(() => {
		let minuterie: ReturnType<typeof setInterval> | undefined;
		const arreter = () => {
			clearInterval(minuterie);
			minuterie = undefined;
		};
		const reprendre = () => {
			arreter();
			if (document.visibilityState !== 'visible' || !vue) return;
			minuterie = setInterval(sonder, SONDAGE_MS);
		};
		const visibilite = () => {
			if (document.visibilityState === 'visible') {
				void sonder();
				reprendre();
			} else arreter();
		};
		document.addEventListener('visibilitychange', visibilite);
		reprendre();
		const horloge = setInterval(() => (maintenant = temps()), 1000);
		return () => {
			arreter();
			clearInterval(horloge);
			clearTimeout(minuterieCopie);
			document.removeEventListener('visibilitychange', visibilite);
		};
	});

	function clavier(ev: KeyboardEvent) {
		if (ev.key === 'Escape' && regleOuverte) fermerRegle();
	}
</script>

<svelte:head><title>{vue ? `À la table — ${vue.name}` : 'La Table'} — Mon carnet</title></svelte:head>
<svelte:window onkeydown={clavier} />

{#snippet bande()}
	<span class="repere">Table</span>
	{#if salon}<span class="sep" aria-hidden="true">·</span><span class="salon">{salon}</span>{/if}
	<span class="sep" aria-hidden="true">·</span><time class="horloge">{heure(maintenant)}</time>
{/snippet}

{#snippet barre()}
	{#if vue}
		<button type="button" onclick={copier} disabled={!moi}>Copier pour Discord</button>
		{#if carte}
			<button type="button" bind:this={boutonRegle} aria-expanded={regleOuverte} aria-controls="panneau-table" onclick={basculerRegle}>Règle</button>
		{/if}
		{#if vue.discordUrl}
			<a href={vue.discordUrl} target="_blank" rel="noopener noreferrer">Ouvrir le salon <span aria-hidden="true">↗</span></a>
		{/if}
	{:else}
		<a href="/carnet/scene">En scène</a>
		<a href="/carnet">Mon carnet</a>
		{#if data.repliee?.discordUrl}
			<a href={data.repliee.discordUrl} target="_blank" rel="noopener noreferrer">Ouvrir le salon <span aria-hidden="true">↗</span></a>
		{/if}
	{/if}
{/snippet}

{#snippet panneau()}
	<div id="panneau-table">
		{#if carte}<CarteRegle {carte} onfermer={fermerRegle} />{/if}
	</div>
{/snippet}

{#snippet notePied()}
	{#if copie}<NoteDeMarge ton={copie.ton}>{copie.texte}</NoteDeMarge>{/if}
{/snippet}

<Enveloppe compte={data.compte} discord={data.discord} regime="scene">
	<Feuille
		disposition="centre"
		{bande}
		{barre}
		etiquetteBarre="Gestes de la Table"
		{ruban}
		panneau={regleOuverte && carte ? panneau : null}
		note={copie ? notePied : null}
	>
		{#if !vue}
			<!-- ── Table repliée ── -->
			<header class="tete">
				<p class="repere">À la table</p>
				<h1 class="titre">{data.repliee?.name ?? 'La Table'}</h1>
			</header>
			<div class="repliee">
				<Vide>
					La Table est repliée. Le récit est dans ton journal.
				</Vide>
				{#if data.repliee}
					<p class="suite">
						<a class="lien" href="/carnet/recits/{data.repliee.id}">Lire le récit — {data.repliee.title}</a>
						<span class="quand">repliée le {dateHeure(data.repliee.at)}</span>
					</p>
				{/if}
			</div>
		{:else if p}
			<!-- ── En-tête : où en est la Table, quand l'a-t-on su ── -->
			<header class="tete">
				<h1 class="titre">
					À la table — {vue.name}<span class="etape"
						><span class="point" aria-hidden="true">{' · '}</span
						>{#if p.active || p.round > 0}<span class="round chiffres">Round {p.round}</span>{' · '}{/if}<span
							class="phase">{phase}</span
						></span
					>
				</h1>
				<div class="reception" class:retard={reception !== 'ok'}>
					{#if reception === 'perdue'}
						<p role="alert">Plus de nouvelles de la Table depuis <span class="chiffres">{recuHeure}</span>.</p>
						<button type="button" class="lien" onclick={sonder} disabled={enCours}>Réessayer</button>
					{:else if reception === 'retard'}
						<p>Dernier état reçu à <span class="chiffres">{recuHeure}</span> · en retard de <span class="chiffres">{age}</span> s.</p>
					{:else}
						<p>Dernier état reçu à <span class="chiffres">{recuHeure}</span>.</p>
					{/if}
				</div>
				<p class="sr-only" aria-live="polite">{annonce}</p>
			</header>

			<!-- ── La zone de la Table : lecture seule, aucun élément cliquable ── -->
			<div class="zone" data-zone-table>
				{#if moi}
					<section class="moi" aria-labelledby="titre-moi">
						<h2 id="titre-moi" class="nom-moi">{moi.name}</h2>
						{#if moi.resources}
							<p class="trois">
								{#each CHAMPS as c (c)}
									{@const a = ancien(moi, c)}
									<Ressource
										nom={NOMS[c]}
										cur={valeur(moi, c) ?? 0}
										max={maximum(moi, c)}
										ancien={typeof a === 'number' ? a : null}
										disposition="colonne"
									/>
								{/each}
							</p>
						{/if}
						{#if moi.statuses.length}
							<ul class="statuts" aria-label="Statuts">
								{#each moi.statuses as s (s.id)}
									<li><Losange couleur={data.statuts[s.id]?.color ?? 'currentColor'} libelle={libelleStatut(s.id)} detail="{s.tours} t." /></li>
								{/each}
							</ul>
						{/if}
						<p class="consigne">{consigneTable}</p>
					</section>
				{/if}

				{#snippet ligneCombattant(f: ProjectedFighter, adverse: boolean)}
					<li class="combattant" class:a-son-tour={p?.phase === 'declaration' && p.currentFighterId === f.id}>
						<p class="c-tete">
							<span class="c-nom">{f.name}</span>
							{#if f.isSummon}<span class="c-meta">invocation</span>{/if}
							{#if p?.phase === 'declaration' && p.currentFighterId === f.id}<span class="c-tour">déclare</span>{/if}
						</p>
						{#if f.resources}
							<p class="c-chiffres chiffres">
								{#each CHAMPS as c (c)}
									{@const a = ancien(f, c)}
									<span class="c-res" class:bas={c === 'pv' && f.resources.pvMax > 0 && f.resources.pvCur / f.resources.pvMax < 0.32}>
										<abbr title={c === 'pv' ? 'Points de vie' : c === 'ep' ? 'Énergie physique' : 'Énergie magique'}>{NOMS[c]}</abbr>
										{#if a !== null}<Rature ancien={a} nouveau={valeur(f, c)} />{:else}{valeur(f, c)}{/if}<span class="c-max">/{maximum(f, c)}</span>
									</span>
								{/each}
							</p>
						{:else if adverse && f.condition}
							{@const a = ancien(f, 'etat')}
							<p class="c-etat etat-{f.condition.toLowerCase()}">
								{#if a !== null}<Rature ancien={a} nouveau={ETATS[f.condition]} />{:else}{ETATS[f.condition]}{/if}
							</p>
						{/if}
						{#if f.statuses.length}
							<ul class="statuts compacts" aria-label="Statuts de {f.name}">
								{#each f.statuses as s (s.id)}
									<li><Losange couleur={data.statuts[s.id]?.color ?? 'currentColor'} libelle={libelleStatut(s.id)} detail="{s.tours} t." /></li>
								{/each}
							</ul>
						{/if}
					</li>
				{/snippet}

				<section class="camp" aria-labelledby="titre-allies">
					<h2 id="titre-allies" class="repere">Élèves du Serment</h2>
					{#if allies.length}
						<ul class="combattants">
							{#each allies as f (f.id)}{@render ligneCombattant(f, false)}{/each}
						</ul>
					{:else}
						<p class="seul">Tu es seul de ton côté de la Table.</p>
					{/if}
				</section>

				<section class="camp" aria-labelledby="titre-adversaires">
					<h2 id="titre-adversaires" class="repere">Adversaires</h2>
					{#if adversaires.length}
						<ul class="combattants">
							{#each adversaires as f (f.id)}{@render ligneCombattant(f, true)}{/each}
						</ul>
					{:else}
						<p class="seul">Aucun adversaire à la Table pour l’instant.</p>
					{/if}
				</section>

				<section class="recit" aria-labelledby="titre-recit">
					<h2 id="titre-recit" class="repere">Récit des rounds</h2>
					{#if recit.length === 0}
						<Vide>Le récit commence au premier round.</Vide>
					{:else}
						<ol class="lignes" aria-live="polite" aria-relevant="additions">
							{#each recit as l (l.cle)}
								{#if l.genre === 'round'}
									<li class="l-round chiffres">Round {l.round}</li>
								{:else if l.genre === 'resolu'}
									<li class="l-resolu"><Encre etat={maintenant - l.t < HUMIDE_MS ? 'humide' : 'prise'}>Round {l.round} · résolu à {l.a}.</Encre></li>
								{:else}
									{@const arrivee = arrivees[l.n]}
									<li class="l-texte k-{l.kind}">
										<Encre etat={arrivee && maintenant - arrivee < HUMIDE_MS ? 'humide' : 'prise'}>{l.texte}</Encre>
									</li>
								{/if}
							{/each}
						</ol>
					{/if}
				</section>
			</div>

		{/if}
	</Feuille>
</Enveloppe>

<style>
	/* ── Bande ── */
	.sep {
		color: var(--encre-grise);
	}
	.salon {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--encre);
	}
	.horloge {
		color: var(--encre-2);
	}

	/* ── En-tête ── */
	.tete {
		padding-top: 12px;
		padding-right: var(--place-ruban, 0);
	}
	.titre {
		font: 500 20px/24px var(--corps);
		letter-spacing: -0.01em;
		color: var(--encre);
		text-wrap: balance;
	}
	.round {
		font-variant-numeric: tabular-nums;
	}
	/* Téléphone : le round et la phase passent à la ligne d'un bloc, sans point en tête de ligne. */
	@media (max-width: 520px) {
		.etape {
			display: block;
		}
		.point {
			display: none;
		}
	}
	.phase {
		color: var(--encre-2);
	}
	.reception {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		column-gap: 12px;
		min-height: 24px;
		margin-top: 6px;
		font: 500 13px/24px var(--corps);
		color: var(--encre-2);
	}
	.reception.retard {
		color: var(--rouille);
	}
	.lien {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: var(--cible);
		padding: 0;
		border: 0;
		background: none;
		font: 500 13px/20px var(--corps);
		color: var(--encre);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--encre-humide) 55%, transparent);
		text-underline-offset: 4px;
		cursor: pointer;
	}
	.lien:hover {
		text-decoration-color: currentColor;
	}
	.lien:disabled {
		opacity: 0.5;
		cursor: default;
	}

	/* ── Mon personnage ── */
	.zone {
		margin-top: 12px;
	}
	.moi {
		padding: 12px 0;
		border-top: 1px solid var(--filet);
		border-bottom: 1px solid var(--filet);
	}
	.nom-moi {
		font: 600 14px/24px var(--corps);
		color: var(--encre);
	}
	.trois {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12px;
		padding-top: 6px;
	}
	.statuts {
		display: flex;
		flex-wrap: wrap;
		gap: 0 18px;
		padding-top: 6px;
	}
	.statuts li {
		display: flex;
		align-items: center;
		min-height: 24px;
	}
	.consigne {
		padding-top: 6px;
		font: 600 14px/24px var(--corps);
		color: var(--encre-humide);
	}

	/* ── Les combattants : lignes compactes ── */
	.camp {
		padding-top: 24px;
	}
	.combattants {
		display: grid;
		margin-top: 6px;
	}
	.combattant {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: baseline;
		column-gap: 12px;
		padding: 6px 0;
		border-bottom: 1px solid var(--filet);
	}
	.combattant:first-child {
		border-top: 1px solid var(--filet);
	}
	.c-tete {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		column-gap: 8px;
		min-width: 0;
		font: 600 14px/24px var(--corps);
		color: var(--encre);
	}
	.c-meta {
		font: 500 12px/24px var(--corps);
		color: var(--encre-2);
	}
	.c-tour {
		font: 500 12px/24px var(--corps);
		color: var(--encre-humide);
	}
	.a-son-tour .c-nom {
		text-decoration: underline;
		text-decoration-color: var(--ruban);
		text-decoration-thickness: 2px;
		text-underline-offset: 6px;
	}
	.c-chiffres {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0 12px;
		font: 500 14px/24px var(--corps);
		color: var(--encre);
		white-space: nowrap;
	}
	.c-res abbr {
		margin-right: 4px;
		font: 500 12px/24px var(--corps);
		letter-spacing: 0.08em;
		text-decoration: none;
		color: var(--encre-2);
	}
	.c-max {
		color: var(--encre-2);
	}
	.c-res.bas {
		color: var(--rouille);
	}
	.c-etat {
		font: 600 12px/24px var(--corps);
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--encre-2);
		white-space: nowrap;
	}
	.etat-grave {
		color: var(--encre);
	}
	.etat-critique {
		color: var(--rouille);
	}
	.compacts {
		grid-column: 1 / -1;
		padding-top: 0;
	}
	.seul {
		margin-top: 6px;
		font: italic 400 14px/24px var(--corps);
		color: var(--encre-2);
	}

	/* ── Le récit des rounds, sous un filet ── */
	.recit {
		margin-top: 24px;
		padding-top: 12px;
		border-top: 1px solid var(--reglure);
	}
	.lignes {
		display: grid;
		margin-top: 6px;
	}
	.l-round {
		padding-top: 12px;
		font: 500 12px/24px var(--corps);
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--encre-2);
	}
	.l-round:first-child {
		padding-top: 0;
	}
	.l-texte {
		font: 400 14px/24px var(--corps);
		color: var(--encre);
	}
	.l-texte.k-turn,
	.l-texte.k-info {
		color: var(--encre-2);
	}
	.l-resolu {
		padding: 6px 0 0;
		font: 600 14px/24px var(--corps);
	}

	/* ── Table repliée ── */
	.repliee {
		padding-top: 12px;
	}
	.suite {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		column-gap: 12px;
	}
	.quand {
		font: 500 12px/24px var(--corps);
		color: var(--encre-2);
	}
</style>
