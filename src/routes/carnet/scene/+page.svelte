<script lang="ts">
	import { chemin } from '$lib/ui/adresse';
	// Le feuillet volant « En scène » (03-vision §5.3, §6.5, §6.6, P2). Pensé pour un téléphone tenu
	// d'une main : ressources et déclarations, capacités du niveau, objets, bloc à coller, note
	// rapide ; en bas, la règle sous le pouce, la copie pour Discord, reposer. On déclare, on ne frappe
	// pas : une déclaration est une phrase notée, le chiffre du relevé ne change jamais.
	import { onMount, tick, untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
	import Enveloppe from '$lib/ui/Enveloppe.svelte';
	import Chapitre from '$lib/ui/Chapitre.svelte';
	import LigneEtat from '$lib/ui/LigneEtat.svelte';
	import Losange from '$lib/ui/Losange.svelte';
	import Encre from '$lib/ui/Encre.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import Champ from '$lib/ui/Champ.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import Feuille from '$lib/ui/scene/Feuille.svelte';
	import Ressource from '$lib/ui/scene/Ressource.svelte';
	import CarteRegle from '$lib/ui/scene/CarteRegle.svelte';
	import { copierTexte } from '$lib/ui/scene/presse-papiers';
	import { creerEcriture } from '$lib/ui/ecriture.svelte';
	import { heure } from '$lib/ui/dates';
	import { ligneFeuillet } from '$lib/ui/scene/table';
	import { nomPalier, palierSuivant } from '$lib/ui/scene/paliers';
	import { declarationText, type DeclarationView } from '$lib/schemas/declarations';
	import { RESSOURCES, resoudre, type Res } from './mots';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Ecriture = ReturnType<typeof creerEcriture>;
	const NOMS: Record<Res, 'PV' | 'EP' | 'EM'> = { pv: 'PV', ep: 'EP', em: 'EM' };

	const fiche = $derived(data.fiche);
	const contexte = $derived(data.contexte);
	const scene = $derived(contexte.scene);

	// ── L'heure : horloge du feuillet, calée sur le serveur pour le compte à rebours ──
	const decalage = untrack(() => Date.parse(data.maintenant) - Date.now());
	let maintenant = $state(untrack(() => Date.parse(data.maintenant)));
	const horloge = $derived(heure(maintenant));
	const releve = $derived(fiche ? heure(fiche.releveAt) : '');

	// ── Réseau ──
	let enLigne = $state(true);

	// ── Une seule note de marge à la fois ──
	const eDeclarer = creerEcriture();
	const eLigne = creerEcriture();
	const eConsommer = creerEcriture();
	const eNoter = creerEcriture();
	const eReposer = creerEcriture();
	const eScene = creerEcriture();
	const ecritures: Record<string, Ecriture> = {
		declarer: eDeclarer,
		ligne: eLigne,
		consommer: eConsommer,
		noter: eNoter,
		reposer: eReposer,
		scene: eScene
	};
	let actif = $state<string | null>(null);

	/** Branche l'encre d'un formulaire et retient quelle note de marge parle. */
	function ecrire(
		cle: string,
		e: Ecriture,
		options: Parameters<Ecriture['enhance']>[0] = {},
		rappels: { avant?: () => void; apres?: (r: ActionResult) => void } = {}
	): SubmitFunction {
		const base = e.enhance(options);
		return async (entree) => {
			const suite = await base(entree);
			if (!suite) return;
			actif = cle;
			copie = null;
			rappels.avant?.();
			return async (sortie) => {
				await suite(sortie);
				rappels.apres?.(sortie.result);
			};
		};
	}

	// Une confirmation reste trois secondes en marge (03-vision §8, micro-texte 7).
	$effect(() => {
		const e = actif ? ecritures[actif] : null;
		if (e?.note?.ton !== 'fait') return;
		const t = setTimeout(() => e.effacer(), 3000);
		return () => clearTimeout(t);
	});

	// ── Déclarer : une ligne de carnet par ressource ──
	let ouverte = $state<Res | null>(null);
	const premier = (r: Res) => data.mots?.[r][0]?.id ?? 'autre';
	let choix = $state<Record<Res, string>>(
		untrack(() => ({ pv: premier('pv'), ep: premier('ep'), em: premier('em') }))
	);
	let chiffre = $state<Record<Res, string>>({ pv: '', ep: '', em: '' });
	let motLibre = $state<Record<Res, string>>({ pv: '', ep: '', em: '' });
	/** Ligne en cours d'envoi : humide jusqu'à la réponse ; `reseau` : partie sans réponse. */
	let envoi = $state<{ ressource: Res; texte: string; etat: 'humide' | 'reseau' | 'refus' } | null>(
		null
	);
	let declencheurs = $state<Partial<Record<Res, HTMLButtonElement>>>({});

	function motChoisi(r: Res) {
		return data.mots?.[r].find((m) => m.id === choix[r]) ?? null;
	}
	function apercu(r: Res): string | null {
		if (!fiche || !data.mots) return null;
		const res = resoudre(data.mots[r], choix[r], chiffre[r], motLibre[r]);
		return res.ok ? declarationText(fiche.name, r, res.delta, res.word) : null;
	}
	async function ouvrirLigne(r: Res) {
		if (ouverte === r) return fermerLigne();
		ouverte = r;
		if (envoi && envoi.ressource !== r) envoi = null;
		await tick();
		document.getElementById(`choix-${r}`)?.focus();
	}
	function fermerLigne() {
		const r = ouverte;
		ouverte = null;
		if (envoi?.etat !== 'humide') envoi = null;
		if (r) declencheurs[r]?.focus();
	}
	function soumettreDeclaration(r: Res): SubmitFunction {
		return ecrire(
			'declarer',
			eDeclarer,
			{ verbe: 'Noté' },
			{
				avant: () => {
					envoi = {
						ressource: r,
						texte: apercu(r) ?? `${fiche?.name ?? ''} déclare…`,
						etat: 'humide'
					};
				},
				apres: (result) => {
					if (result.type === 'success') {
						envoi = null;
						ouverte = null;
						chiffre[r] = '';
						motLibre[r] = '';
					} else if (
						result.type === 'error' &&
						(!navigator.onLine || !enLigne || result.status === undefined)
					) {
						if (envoi) envoi.etat = 'reseau';
					} else if (envoi) {
						envoi.etat = 'refus';
					}
				}
			}
		);
	}

	// ── Annuler (10 s), puis rayer : la ligne rayée reste lisible ──
	let rayees = $state<{ d: DeclarationView; verbe: 'annulée' | 'rayée'; quand: string }[]>([]);
	const soumettreLigne: SubmitFunction = ecrire(
		'ligne',
		eLigne,
		{ verbe: 'Rayé' },
		{
			apres: (result) => {
				if (result.type !== 'success' || !result.data) return;
				const r = result.data as { annulee?: DeclarationView; rayee?: DeclarationView };
				const d = r.annulee ?? r.rayee;
				if (d)
					rayees = [
						...rayees,
						{ d, verbe: r.annulee ? 'annulée' : 'rayée', quand: heure(Date.now() + decalage) }
					];
			}
		}
	);
	function secondesRestantes(d: DeclarationView): number {
		return Math.max(0, Math.ceil((Date.parse(d.cancelUntil) - maintenant) / 1000));
	}
	const parRessource = $derived.by(() => {
		const out: Record<Res, DeclarationView[]> = { pv: [], ep: [], em: [] };
		for (const d of data.attente) out[d.resource].push(d);
		return out;
	});
	const rayeesPar = $derived.by(() => {
		const enAttente = new Set(data.attente.map((d) => d.id));
		const out: Record<Res, typeof rayees> = { pv: [], ep: [], em: [] };
		for (const r of rayees) if (!enAttente.has(r.d.id)) out[r.d.resource].push(r);
		return out;
	});

	// ── Objets : consommer → une ligne de confirmation ──
	let aConsommer = $state<string | null>(null);
	const objetChoisi = $derived(fiche?.items.find((i) => i.id === aConsommer) ?? null);
	const soumettreConsommer: SubmitFunction = ecrire(
		'consommer',
		eConsommer,
		{ verbe: 'Noté' },
		{
			apres: (result) => {
				if (result.type === 'success') aConsommer = null;
			}
		}
	);

	// ── Note rapide pour le journal ──
	let noteRapide = $state('');
	const soumettreNote = ecrire('noter', eNoter, { verbe: 'Noté', apres: () => (noteRapide = '') });

	// ── Ouvrir une scène ──
	let ouvrirScene = $state(false);
	const soumettreScene = ecrire(
		'scene',
		eScene,
		{ verbe: 'Ouverte' },
		{
			apres: (result) => {
				if (result.type === 'success') ouvrirScene = false;
			}
		}
	);

	// ── La Table repliée pendant la scène ──
	let tableVue = $state(untrack(() => data.contexte.table));
	let repliee = $state<string | null>(null);
	$effect(() => {
		const t = contexte.table;
		untrack(() => {
			if (t) {
				tableVue = t;
				repliee = null;
			} else if (tableVue && !repliee) {
				repliee = heure(Date.now() + decalage);
			}
		});
	});
	/** Même phrase que la Table vue par le joueur, lue à la même source (la projection de la Table). */
	function ligneTable(t: NonNullable<typeof contexte.table>): string {
		if (data.etatTable?.status === 'termine')
			return 'La Table est repliée. Le récit est dans ton journal.';
		return ligneFeuillet(
			data.etatTable ?? { active: t.status === 'en_cours', round: t.round, phase: t.phase }
		);
	}
	/** Tours restants d'un statut : ceux de la Table quand elle est ouverte, sinon ceux de la fiche. */
	function tours(s: { id: string; turns: number | null }): number | null {
		return data.tours[s.id] ?? s.turns;
	}

	// ── Bloc à coller ──
	const signe = (n: number) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);
	const bloc = $derived.by(() => {
		if (!fiche) return '';
		const decl = (n: number) => (n ? ` (${signe(n)} déclaré)` : '');
		const l1 = `${fiche.name} · niv. ${fiche.level} · ${fiche.oath.name} (${fiche.oath.rankLabel})`;
		const l2 = [
			`PV ${fiche.pv.cur}/${fiche.pv.max}${decl(fiche.pendingDeclared.pv)}`,
			`EP ${fiche.ep.cur}/${fiche.ep.max}${decl(fiche.pendingDeclared.ep)}`,
			`EM ${fiche.em.cur}/${fiche.em.max}${decl(fiche.pendingDeclared.em)}`,
			`relevé ${releve}`
		].join(' · ');
		const l3 = fiche.statuses.length
			? fiche.statuses.map((s) => (tours(s) ? `${s.label} ${tours(s)} t.` : s.label)).join(' · ')
			: 'Aucun statut.';
		return `${l1}\n${l2}\n${l3}`;
	});
	let copie = $state<{ ton: 'fait' | 'refus'; texte: string } | null>(null);
	let minuterieCopie: ReturnType<typeof setTimeout> | undefined;
	async function copier() {
		const ok = await copierTexte(bloc);
		actif = null;
		copie = ok
			? { ton: 'fait', texte: `Copié · ${heure(Date.now() + decalage)} — colle-le dans le salon.` }
			: { ton: 'refus', texte: 'La copie n’a pas pris. Sélectionne le bloc à la main.' };
		clearTimeout(minuterieCopie);
		minuterieCopie = setTimeout(() => (copie = null), 4000);
	}

	// ── Barre basse : une seule carte ouverte (règle ou reposer) ──
	let panneau = $state<'regle' | 'reposer' | null>(null);
	let boutonRegle = $state<HTMLButtonElement>();
	let boutonReposer = $state<HTMLButtonElement>();
	let retour = $state('/carnet');
	let phraseReprise = $state(untrack(() => data.marquePage?.text ?? ''));
	let lienReprise = $state(untrack(() => data.marquePage?.url ?? ''));
	async function basculer(p: 'regle' | 'reposer') {
		panneau = panneau === p ? null : p;
		if (!panneau) return (p === 'regle' ? boutonRegle : boutonReposer)?.focus();
		await tick();
		document.getElementById(p === 'regle' ? 'carte-regle' : 'titre-reposer')?.focus();
	}
	function fermerPanneau() {
		const p = panneau;
		panneau = null;
		(p === 'regle' ? boutonRegle : boutonReposer)?.focus();
	}
	const soumettreReposer = ecrire('reposer', eReposer, { verbe: 'Noté' });

	// ── Feuillet à droite ou à gauche (ordinateur) ──
	let gauche = $state(false);
	function deplacer() {
		gauche = !gauche;
		try {
			localStorage.setItem('np-feuillet-gauche', gauche ? '1' : '0');
		} catch {
			// préférence de confort : sans stockage, le feuillet reste où il est
		}
	}

	onMount(() => {
		enLigne = navigator.onLine;
		const enLigneOui = () => (enLigne = true);
		const enLigneNon = () => (enLigne = false);
		window.addEventListener('online', enLigneOui);
		window.addEventListener('offline', enLigneNon);
		const minuterie = setInterval(() => (maintenant = Date.now() + decalage), 1000);
		try {
			gauche = localStorage.getItem('np-feuillet-gauche') === '1';
		} catch {
			gauche = false;
		}
		try {
			const ref = document.referrer ? new URL(document.referrer) : null;
			if (ref && ref.origin === location.origin && ref.pathname !== location.pathname)
				retour = ref.pathname + ref.search;
		} catch {
			retour = '/carnet';
		}
		return () => {
			clearInterval(minuterie);
			clearTimeout(minuterieCopie);
			window.removeEventListener('online', enLigneOui);
			window.removeEventListener('offline', enLigneNon);
		};
	});

	function clavier(ev: KeyboardEvent) {
		if (ev.key !== 'Escape') return;
		if (panneau) fermerPanneau();
		else if (aConsommer) aConsommer = null;
		else if (ouverte) fermerLigne();
	}
</script>

<svelte:head><title>En scène — Mon carnet</title></svelte:head>
<svelte:window onkeydown={clavier} />

{#snippet noteDe(cle: string)}
	{@const e = ecritures[cle]}
	{#if actif === cle && e.note}
		<NoteDeMarge ton={e.note.ton}>{e.note.texte}</NoteDeMarge>
	{/if}
{/snippet}

{#snippet bande()}
	<span class="repere">Scène</span>
	{#if contexte.channel}<span class="sep" aria-hidden="true">·</span><span class="salon"
			>{contexte.channel}</span
		>{/if}
	<span class="sep" aria-hidden="true">·</span><time class="horloge">{horloge}</time>
	{#if !enLigne}<span class="hors-ligne">hors réseau</span>{/if}
{/snippet}

{#snippet barre()}
	<button
		type="button"
		bind:this={boutonRegle}
		aria-expanded={panneau === 'regle'}
		aria-controls="panneau-feuillet"
		onclick={() => basculer('regle')}>Règle</button
	>
	<button type="button" onclick={copier} disabled={!fiche}>Copier pour Discord</button>
	<button
		type="button"
		bind:this={boutonReposer}
		aria-expanded={panneau === 'reposer'}
		aria-controls="panneau-feuillet"
		onclick={() => basculer('reposer')}>Reposer</button
	>
{/snippet}

{#snippet notePied()}
	{#if copie}
		<NoteDeMarge ton={copie.ton}>{copie.texte}</NoteDeMarge>
	{/if}
{/snippet}

{#snippet carte()}
	<div id="panneau-feuillet">
		{#if panneau === 'regle'}
			<CarteRegle carte={data.carte} onfermer={fermerPanneau} />
		{:else if panneau === 'reposer'}
			<form
				class="reposer"
				method="POST"
				action="?/marquePage"
				use:enhance={soumettreReposer}
				aria-labelledby="titre-reposer"
			>
				<header>
					<p class="repere">Reposer le feuillet</p>
					<h2 id="titre-reposer" tabindex="-1">Où j’en suis</h2>
					<button type="button" class="refermer" onclick={fermerPanneau}>Garder ouvert</button>
				</header>
				<p class="aide">
					Facultatif&nbsp;: une phrase et un lien pour reprendre le fil. C’est ton marque-page.
				</p>
				<input type="hidden" name="retour" value={retour} />
				{#if scene}<input type="hidden" name="sceneId" value={scene.id} />{/if}
				<Champ
					libelle="Où j’en suis"
					name="text"
					bind:value={phraseReprise}
					maxlength={280}
					placeholder="Une phrase pour reprendre le fil…"
				/>
				<Champ
					libelle="Lien du message Discord"
					name="url"
					type="url"
					inputmode="url"
					bind:value={lienReprise}
					placeholder="https://discord.com/channels/…"
				/>
				<div class="gestes">
					<Bouton variante="ruban" type="submit" disabled={eReposer.enCours}>Reposer</Bouton>
				</div>
				{@render noteDe('reposer')}
			</form>
		{/if}
	</div>
{/snippet}

<Enveloppe compte={data.compte} discord={data.discord} regime="scene">
	<Feuille
		disposition="volant"
		{gauche}
		{bande}
		{barre}
		etiquetteBarre="Gestes du feuillet"
		panneau={panneau ? carte : null}
		note={copie ? notePied : null}
	>
		{#if !fiche}
			<h1 class="nom">En scène</h1>
			<Vide>Ta fiche n’a pas pu s’ouvrir. Recharge la page.</Vide>
		{:else}
			<!-- ── Tête : le personnage, la scène, la ligne d'état ── -->
			<header class="tete">
				<h1 class="nom">{fiche.name}</h1>
				<p class="identite">
					{fiche.oath.name} · <span class="rang">{fiche.oath.rankLabel}</span> · niveau {fiche.level}
				</p>
				<LigneEtat
					pv={{ ...fiche.pv, declare: fiche.pendingDeclared.pv }}
					ep={{ ...fiche.ep, declare: fiche.pendingDeclared.ep }}
					em={{ ...fiche.em, declare: fiche.pendingDeclared.em }}
					{releve}
					enRetard={!enLigne}
				/>
				{#if !enLigne}
					<p class="alerte" role="status">Pas de réseau. Tes chiffres restent ceux de {releve}.</p>
				{/if}
				{#if contexte.table}
					<a class="table" href={chemin(`/carnet/table/${contexte.table.id}`)}>
						<span class="repere">La Table</span>
						<span class="table-etat">{ligneTable(contexte.table)}</span>
						<span class="fleche" aria-hidden="true">→</span>
					</a>
				{:else if repliee}
					<p class="table repliee">
						<span class="repere">La Table</span><span class="table-etat"
							>La Table est repliée · {repliee}</span
						>
					</p>
				{/if}
			</header>

			<!-- ── La scène ouverte, ou de quoi en ouvrir une ── -->
			{#if scene}
				<section class="scene" aria-label="Scène ouverte">
					<p class="scene-titre">
						<span>{scene.title}</span>
						{#if scene.discordUrl}<a
								href={scene.discordUrl}
								target="_blank"
								rel="external noopener noreferrer"
								>Ouvrir le salon <span aria-hidden="true">↗</span></a
							>{/if}
					</p>
					{#if data.marquePage?.text}
						<p class="reprise">
							<span class="repere">Tu t’étais arrêté ici</span> « {data.marquePage.text} »
						</p>
					{/if}
				</section>
			{:else}
				<section class="scene sans" aria-label="Aucune scène ouverte">
					<p class="scene-titre">
						<span class="vide-scene">Aucune scène ouverte.</span>
						{#if !ouvrirScene}
							<button
								type="button"
								class="lien"
								onclick={() => (ouvrirScene = true)}
								aria-expanded="false">Ouvrir une scène</button
							>
						{/if}
					</p>
					{#if ouvrirScene}
						<form class="ouvrir" method="POST" action="?/ouvrirScene" use:enhance={soumettreScene}>
							<Champ
								libelle="Titre de la scène"
								name="title"
								required
								maxlength={120}
								placeholder="Embuscade au col des brumes"
							/>
							<Champ
								libelle="Lien du salon"
								name="discordUrl"
								type="url"
								inputmode="url"
								required
								placeholder="https://discord.com/channels/…"
							/>
							<div class="gestes">
								<Bouton variante="ruban" type="submit" disabled={eScene.enCours}
									>Ouvrir la scène</Bouton
								>
								<Bouton variante="texte" onclick={() => (ouvrirScene = false)}>Refermer</Bouton>
							</div>
							{@render noteDe('scene')}
						</form>
					{/if}
				</section>
			{/if}

			<!-- ── 01 Ressources : trois lignes, et sous chacune les déclarations ── -->
			<Chapitre titre="Ressources" id="ressources">
				<ul class="ressources">
					{#each RESSOURCES as r (r)}
						{@const valeur = fiche[r]}
						{@const mot = motChoisi(r)}
						<li class="res">
							<div class="res-ligne">
								<Ressource nom={NOMS[r]} cur={valeur.cur} max={valeur.max} />
								<button
									type="button"
									class="declarer"
									bind:this={declencheurs[r]}
									aria-expanded={ouverte === r}
									aria-controls="ligne-{r}"
									onclick={() => ouvrirLigne(r)}>Déclarer</button
								>
							</div>

							{#if parRessource[r].length || rayeesPar[r].length || envoi?.ressource === r}
								<ul class="declarations" aria-label="Déclarations {NOMS[r]}">
									{#each rayeesPar[r] as x (x.d.id)}
										<li class="decl rayee">
											<s>{x.d.text}</s>
											<span class="meta">{x.verbe} · {x.quand}</span>
										</li>
									{/each}
									{#each parRessource[r] as d (d.id)}
										{@const reste = secondesRestantes(d)}
										<li class="decl">
											<span class="decl-texte">{d.text}</span>
											<span class="meta">{heure(d.at)} · attend un MJ</span>
											<form
												method="POST"
												action={reste > 0 ? '?/annuler' : '?/rayer'}
												use:enhance={soumettreLigne}
											>
												<input type="hidden" name="id" value={d.id} />
												<button type="submit" class="lien" disabled={eLigne.enCours}>
													{#if reste > 0}Annuler · <span class="chiffres">{reste}</span> s{:else}Rayer{/if}
												</button>
											</form>
										</li>
									{/each}
									{#if envoi?.ressource === r}
										<li class="decl envoi">
											<Encre etat={envoi.etat === 'refus' ? 'refusee' : 'humide'}
												>{envoi.texte}</Encre
											>
										</li>
									{/if}
								</ul>
							{/if}

							{#if ouverte === r && data.mots}
								<form
									id="ligne-{r}"
									class="ligne-carnet"
									method="POST"
									action="?/declarer"
									use:enhance={soumettreDeclaration(r)}
								>
									<input type="hidden" name="ressource" value={r} />
									<p class="phrase">
										<span class="qui">{fiche.name} déclare</span>
										<label class="sr-only" for="choix-{r}">Mot de la déclaration ({NOMS[r]})</label>
										<span class="menu">
											<select id="choix-{r}" name="choix" bind:value={choix[r]}>
												{#each data.mots[r] as m (m.id)}
													<option value={m.id}>{m.libelle}</option>
												{/each}
											</select>
										</span>
									</p>
									{#if mot && mot.saisie !== 'aucune'}
										<div class="saisies">
											<label class="saisie chiffre-saisie">
												<span>Chiffre</span>
												<input
													name="chiffre"
													inputmode="numeric"
													autocomplete="off"
													required
													maxlength={4}
													placeholder={mot.signe < 0 ? '8' : '8'}
													bind:value={chiffre[r]}
												/>
												<span class="unite">{NOMS[r]}</span>
											</label>
											{#if mot.saisie === 'chiffre-mot'}
												<label class="saisie mot-saisie">
													<span>Mot</span>
													<input
														name="mot"
														autocomplete="off"
														required
														maxlength={80}
														placeholder="Ce que tu fais"
														bind:value={motLibre[r]}
													/>
												</label>
											{/if}
										</div>
										{#if mot.saisie === 'chiffre-mot'}
											<p class="aide">
												Sans signe, le chiffre est dépensé&nbsp;; «&nbsp;+5&nbsp;» le regagne.
											</p>
										{/if}
									{/if}
									<p class="apercu" aria-live="polite">
										{#if apercu(r)}{apercu(r)}{:else}<span class="manque"
												>{mot?.saisie === 'chiffre-mot'
													? 'Un chiffre et un mot, puis note.'
													: 'Un chiffre, puis note.'}</span
											>{/if}
									</p>
									<div class="gestes">
										<Bouton variante="ruban" type="submit" disabled={eDeclarer.enCours}>
											{envoi?.ressource === r && envoi.etat === 'reseau' ? 'Réessayer' : 'Noter'}
										</Bouton>
										<Bouton variante="texte" onclick={fermerLigne}>Refermer</Bouton>
									</div>
									{#if actif === 'declarer' && envoi?.ressource === r && envoi.etat === 'reseau'}
										<NoteDeMarge ton="refus"
											>Pas de réseau. Tes chiffres restent ceux de {releve}.</NoteDeMarge
										>
									{:else if envoi?.ressource === r || actif === 'declarer'}
										{@render noteDe('declarer')}
									{/if}
								</form>
							{:else if actif === 'declarer' && eDeclarer.note?.ton === 'fait' && parRessource[r].length}
								<!-- La confirmation est une heure, sous la ressource qui vient d'être déclarée. -->
							{/if}
						</li>
					{/each}
				</ul>
				{#if actif === 'declarer' && !ouverte}{@render noteDe('declarer')}{/if}
				{#if actif === 'ligne'}{@render noteDe('ligne')}{/if}

				{#if fiche.statuses.length}
					<ul class="statuts" aria-label="Statuts">
						{#each fiche.statuses as s (s.id)}
							<li>
								<Losange
									couleur={s.color}
									libelle={s.label}
									detail={tours(s) ? `${tours(s)} t.` : undefined}
								/>
							</li>
						{/each}
					</ul>
				{/if}
			</Chapitre>

			<!-- ── Capacités à ton niveau ── -->
			<Chapitre titre="Capacités à ton niveau" id="capacites">
				{#if !fiche.branch}
					<Vide>Aucune branche choisie. Un administrateur la note avec toi.</Vide>
				{:else}
					<p class="branche">{fiche.branch}</p>
					{#if fiche.tiers.reached.length === 0}
						<Vide>Aucun palier atteint pour l’instant.</Vide>
					{/if}
					<ol class="paliers">
						{#each fiche.tiers.reached as t, i (t.level)}
							<li class="palier">
								<p class="palier-tete">
									<span class="repere">{nomPalier(i, t.stage)}</span>
									<span class="niveau">niveau {t.level}</span>
								</p>
								<p class="palier-nom">{t.name} <span class="cout">{t.cost}</span></p>
								<p class="palier-texte">{t.description}</p>
							</li>
						{/each}
						{#if fiche.tiers.next[0]}
							{@const t = fiche.tiers.next[0]}
							{@const n = fiche.tiers.reached.length}
							<li class="palier suivant">
								<p class="palier-tete">
									<span class="repere">{palierSuivant(n, t.level, t.stage)}</span>
								</p>
							</li>
						{/if}
					</ol>
				{/if}
			</Chapitre>

			<!-- ── Objets : liste plate, consommer → une ligne de confirmation ── -->
			<Chapitre titre="Objets" id="objets">
				{#if fiche.items.length === 0}
					<Vide>Rien dans les poches.</Vide>
				{:else}
					<ul class="objets">
						{#each fiche.items as o (o.id)}
							<li class="objet">
								<span class="objet-nom">{o.name}</span>
								<span class="qte chiffres">×{o.qty}</span>
								{#if o.category === 'Consommable'}
									<button
										type="button"
										class="lien"
										aria-expanded={aConsommer === o.id}
										onclick={() => (aConsommer = aConsommer === o.id ? null : o.id)}
										>Consommer</button
									>
								{/if}
							</li>
							{#if aConsommer === o.id && objetChoisi}
								<li class="confirmer">
									<form method="POST" action="?/consommer" use:enhance={soumettreConsommer}>
										<input type="hidden" name="itemId" value={o.id} />
										<input type="hidden" name="expectedRevision" value={fiche.revision} />
										<p class="question">Tu déclares avoir utilisé « {objetChoisi.name} » ?</p>
										<Champ
											libelle="Contexte (facultatif)"
											name="note"
											maxlength={2000}
											placeholder="Après la chute dans le gué"
										/>
										<div class="gestes">
											<Bouton variante="ruban" type="submit" disabled={eConsommer.enCours}
												>Oui, je le note.</Bouton
											>
											<Bouton variante="texte" onclick={() => (aConsommer = null)}>Non</Bouton>
										</div>
									</form>
								</li>
							{/if}
						{/each}
					</ul>
				{/if}
				{@render noteDe('consommer')}
			</Chapitre>

			<!-- ── Bloc à coller : exactement ce que Discord recevra ── -->
			<section class="bloc" aria-labelledby="titre-bloc">
				<h2 id="titre-bloc" class="repere">Bloc à coller</h2>
				<pre class="apercu-bloc">{bloc}</pre>
			</section>

			<!-- ── Note rapide ── -->
			<form class="note-rapide" method="POST" action="?/noter" use:enhance={soumettreNote}>
				<Champ
					libelle="Noter pour le journal"
					name="text"
					bind:value={noteRapide}
					required
					maxlength={4000}
					aide="Datée, notée en scène. Lu par toi, les MJ et les administrateurs."
					placeholder="Ce que tu veux garder de ce moment…"
				/>
				<Bouton variante="trait" type="submit" disabled={eNoter.enCours}>Noter</Bouton>
			</form>
			{@render noteDe('noter')}

			<p class="deplacer">
				<button type="button" class="lien" onclick={deplacer}
					>{gauche ? 'Déplacer à droite' : 'Déplacer à gauche'}</button
				>
			</p>
		{/if}
	</Feuille>
</Enveloppe>

<style>
	/* ── Bande ── */
	.sep {
		color: var(--encre-grise);
	}
	.salon {
		color: var(--encre);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}
	.horloge {
		color: var(--encre-2);
	}
	.hors-ligne {
		margin-left: auto;
		color: var(--rouille);
	}

	/* ── Tête ── */
	.tete {
		padding-top: 12px;
	}
	.nom {
		font: 500 24px/36px var(--corps);
		letter-spacing: -0.01em;
		color: var(--encre);
	}
	.identite {
		font: 500 13px/24px var(--corps);
		color: var(--encre-2);
	}
	.rang {
		color: var(--tampon);
	}
	.tete :global(.etat) {
		margin-top: 0;
	}
	.alerte {
		font: 500 13px/24px var(--corps);
		color: var(--rouille);
	}
	.table {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: var(--cible);
		margin-top: 12px;
		padding: 0 12px;
		border: 1px solid var(--reglure);
		border-radius: var(--rayon);
		text-decoration: none;
		color: var(--encre);
	}
	a.table:hover {
		border-color: var(--encre-humide);
	}
	.table-etat {
		font: 600 14px/24px var(--corps);
	}
	.table .fleche {
		margin-left: auto;
		font: 400 18px/1 var(--corps);
	}
	.repliee {
		color: var(--encre-2);
	}
	.repliee .table-etat {
		font-weight: 500;
	}

	/* ── Scène ── */
	.scene {
		margin-top: 12px;
		padding: 12px 0;
		border-top: 1px solid var(--filet);
	}
	.scene-titre {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		column-gap: 12px;
		font: 600 14px/24px var(--corps);
		color: var(--encre);
	}
	.scene-titre a,
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
	.vide-scene {
		font-weight: 500;
		color: var(--encre-2);
	}
	.reprise {
		font: italic 400 13px/24px var(--corps);
		color: var(--encre-2);
	}
	.reprise .repere {
		display: block;
		font-style: normal;
	}
	.ouvrir {
		display: grid;
		gap: 12px;
		margin-top: 12px;
	}

	/* ── Ressources ── */
	.ressources {
		display: grid;
	}
	.res {
		padding: 6px 0;
		border-bottom: 1px solid var(--filet);
	}
	.res-ligne {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		min-height: var(--cible);
	}
	.declarer {
		min-height: var(--cible);
		padding: 0 0 0 12px;
		border: 0;
		background: none;
		font: 500 13px/20px var(--corps);
		color: var(--encre-humide);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--encre-humide) 45%, transparent);
		text-underline-offset: 4px;
		cursor: pointer;
	}
	.declarer[aria-expanded='true'] {
		color: var(--encre);
		text-decoration-color: var(--ruban);
	}
	.declarations {
		display: grid;
		padding: 0 0 6px 36px;
	}
	.decl {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		column-gap: 12px;
		font: 500 14px/24px var(--corps);
	}
	.decl-texte {
		color: var(--encre-humide);
	}
	.decl .meta {
		font: 500 12px/24px var(--corps);
		color: var(--encre-2);
	}
	.decl form {
		margin-left: auto;
	}
	.decl.rayee s {
		color: var(--encre-grise);
		text-decoration-thickness: 1px;
	}
	.decl.envoi {
		font-style: italic;
	}

	/* La ligne de carnet : une phrase, pas une barre de touches. */
	.ligne-carnet {
		display: grid;
		gap: 6px;
		margin: 0 0 12px 36px;
		padding: 6px 0 0 12px;
		border-left: 1px solid var(--encre-humide);
	}
	.phrase {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		column-gap: 8px;
		font: 500 14px/24px var(--corps);
		color: var(--encre);
	}
	.qui {
		white-space: nowrap;
	}
	.menu {
		position: relative;
		display: inline-flex;
		max-width: 100%;
	}
	.menu::after {
		content: '';
		position: absolute;
		right: 4px;
		top: 50%;
		width: 6px;
		height: 6px;
		border-right: 1px solid var(--encre-humide);
		border-bottom: 1px solid var(--encre-humide);
		rotate: 45deg;
		translate: 0 -70%;
		pointer-events: none;
	}
	select {
		appearance: none;
		max-width: 100%;
		min-height: var(--cible);
		padding: 0 22px 0 0;
		border: 0;
		border-bottom: 1px solid var(--encre-humide);
		border-radius: 0;
		background: transparent;
		font: 600 14px/24px var(--corps);
		color: var(--encre-humide);
		cursor: pointer;
	}
	select:focus-visible {
		outline-offset: 2px;
	}
	option {
		background: var(--page-2);
		color: var(--encre);
	}
	.saisies {
		display: flex;
		flex-wrap: wrap;
		gap: 6px 24px;
	}
	.saisie {
		display: inline-flex;
		align-items: baseline;
		gap: 8px;
		font: 500 12px/24px var(--corps);
		color: var(--encre-2);
	}
	.mot-saisie {
		flex: 1 1 160px;
	}
	.saisie input {
		min-height: var(--cible);
		padding: 0;
		border: 0;
		border-bottom: 1px solid color-mix(in srgb, var(--encre) 28%, transparent);
		border-radius: 0;
		background: transparent;
		font: 600 14px/24px var(--corps);
		color: var(--encre);
		caret-color: var(--encre-humide);
	}
	.chiffre-saisie input {
		width: 56px;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.mot-saisie input {
		flex: 1;
		min-width: 0;
	}
	.saisie input:focus-visible {
		outline: none;
		border-bottom: 2px solid var(--encre-humide);
	}
	.saisie input::placeholder {
		color: var(--encre-grise);
		font-weight: 400;
	}
	.unite {
		color: var(--encre-2);
	}
	.aide {
		font: 500 12px/20px var(--corps);
		color: var(--encre-2);
	}
	.apercu {
		font: 500 14px/24px var(--corps);
		color: var(--encre-2);
	}
	.manque {
		font-style: italic;
	}
	.gestes {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
	}

	.statuts {
		display: flex;
		flex-wrap: wrap;
		gap: 0 18px;
		padding-top: 12px;
	}
	.statuts li {
		display: flex;
		align-items: center;
		min-height: 24px;
	}

	/* ── Capacités ── */
	.branche {
		padding-top: 12px;
		font: 600 14px/24px var(--corps);
		color: var(--encre);
	}
	.paliers {
		display: grid;
	}
	.palier {
		padding: 12px 0;
		border-bottom: 1px solid var(--filet);
	}
	.palier-tete {
		display: flex;
		justify-content: space-between;
		gap: 12px;
	}
	.niveau {
		font: 500 12px/16px var(--corps);
		color: var(--encre-2);
	}
	.palier-nom {
		font: 600 14px/24px var(--corps);
		color: var(--encre);
	}
	.cout {
		margin-left: 6px;
		font-weight: 500;
		color: var(--encre-2);
	}
	.palier-texte {
		font: 400 14px/24px var(--corps);
		color: var(--encre);
	}
	.suivant .repere {
		color: var(--encre-grise);
	}

	/* ── Objets ── */
	.objets {
		display: grid;
	}
	.objet {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: var(--cible);
		border-bottom: 1px solid var(--filet);
		font: 500 14px/24px var(--corps);
	}
	.objet-nom {
		flex: 1;
		min-width: 0;
	}
	.qte {
		color: var(--encre-2);
	}
	.objet .lien {
		min-width: 88px;
		justify-content: flex-end;
	}
	.confirmer form {
		display: grid;
		gap: 6px;
		padding: 12px 0 12px 12px;
		border-left: 1px solid var(--encre-humide);
	}
	.question {
		font: 600 14px/24px var(--corps);
	}

	/* ── Bloc à coller ── */
	.bloc {
		margin-top: 24px;
	}
	.apercu-bloc {
		margin: 6px 0 0;
		padding: 12px;
		overflow-x: auto;
		background: var(--page);
		border: 1px solid var(--reglure);
		border-radius: var(--rayon);
		font: var(--t-mono);
		color: var(--encre);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	/* Téléphone : la ligne des ressources tient sur une ligne, comme dans le salon. */
	@media (max-width: 420px) {
		.apercu-bloc {
			font-size: 12px;
			letter-spacing: -0.02em;
		}
	}

	/* ── Note rapide ── */
	.note-rapide {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: end;
		gap: 12px;
		margin-top: 24px;
	}
	.note-rapide :global(.aide) {
		grid-column: 1 / -1;
	}

	/* ── Reposer (carte au-dessus de la barre) ── */
	.reposer {
		display: grid;
		gap: 12px;
		padding: 12px 12px 24px;
	}
	.reposer header {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		column-gap: 12px;
	}
	.reposer h2 {
		grid-column: 1;
		font: 600 14px/24px var(--corps);
		outline: none;
	}
	.reposer .refermer {
		grid-column: 2;
		grid-row: 1 / span 2;
		min-height: var(--cible);
		border: 0;
		background: none;
		font: 500 13px/20px var(--corps);
		color: var(--encre-2);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--encre-humide) 45%, transparent);
		text-underline-offset: 4px;
	}

	.deplacer {
		display: none;
		margin-top: 24px;
	}
	@media (min-width: 761px) {
		.deplacer {
			display: block;
		}
	}
</style>
