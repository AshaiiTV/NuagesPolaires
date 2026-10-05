<script lang="ts">
	// Ma fiche (03-vision §5.4) : le dossier du personnage, consulté pendant le RP, jamais un tableau
	// de bord. Marge = sommaire collant des chapitres et relevé ; quatre chapitres : 01 Ressources,
	// 02 Équipement et inventaire, 03 Serment, 04 Conséquences. Le joueur n'écrit que son portrait,
	// ses consommations et le sort de ses déclarations ; tout le reste porte un tampon.
	import type { SubmitFunction } from '@sveltejs/kit';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import Page from '$lib/ui/Page.svelte';
	import Chapitre from '$lib/ui/Chapitre.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import Champ from '$lib/ui/Champ.svelte';
	import Encre from '$lib/ui/Encre.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import Losange from '$lib/ui/Losange.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import Portrait from '$lib/ui/Portrait.svelte';
	import Consequence from '$lib/ui/Consequence.svelte';
	import Rature from '$lib/ui/Rature.svelte';
	import { creerEcriture } from '$lib/ui/ecriture.svelte';
	import { dateCourte, heure, joursCalendaires } from '$lib/ui/dates';
	import { palierAtteint, palierSuivant } from '$lib/ui/scene/paliers';
	import { signataire } from './signature';
	import { EQUIPMENT_LABELS, EQUIPMENT_SLOTS, ITEM_CATEGORIES, RESOURCES } from '$lib/schemas/characters';
	import type { ConsequenceFilter, ConsequenceView, ItemView, ResourceKey } from '$lib/schemas/characters';
	import type { DeclarationView } from '$lib/schemas/declarations';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const fiche = $derived(data.fiche);

	// ---- Sommaire : quatre chapitres, suivi au défilement, focus déplacé au clavier -----------------
	const CHAPITRES = [
		{ id: 'ressources', numero: '01', titre: 'Ressources' },
		{ id: 'equipement', numero: '02', titre: 'Équipement et inventaire' },
		{ id: 'serment', numero: '03', titre: 'Serment' },
		{ id: 'consequences', numero: '04', titre: 'Conséquences' }
	] as const;
	type IdChapitre = (typeof CHAPITRES)[number]['id'];
	let courant = $state<IdChapitre>('ressources');

	/** Sur téléphone, les chapitres se replient (01 ouvert) ; sur ordinateur, tout est déplié. */
	let telephone = $state(false);
	$effect(() => {
		const requete = window.matchMedia('(max-width: 760px)');
		const maj = () => (telephone = requete.matches);
		maj();
		requete.addEventListener('change', maj);
		return () => requete.removeEventListener('change', maj);
	});
	const consequencesOuvertes = $derived(!!data.filtre || page.url.searchParams.has('page') || page.url.hash === '#consequences');

	$effect(() => {
		void telephone;
		const cibles = CHAPITRES.map((c) => document.getElementById(c.id)).filter((e): e is HTMLElement => !!e);
		const observateur = new IntersectionObserver(
			(entrees) => {
				for (const e of entrees) if (e.isIntersecting) courant = e.target.id as IdChapitre;
			},
			{ rootMargin: '-20% 0px -70% 0px' }
		);
		cibles.forEach((c) => observateur.observe(c));
		return () => observateur.disconnect();
	});

	function allerA(evenement: MouseEvent, id: IdChapitre) {
		const cible = document.getElementById(id);
		if (!cible) return;
		evenement.preventDefault();
		if (cible instanceof HTMLDetailsElement) cible.open = true;
		const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		cible.scrollIntoView({ behavior: reduit ? 'auto' : 'smooth', block: 'start' });
		const focus = cible instanceof HTMLDetailsElement ? cible.querySelector('summary') : cible;
		(focus as HTMLElement | null)?.focus({ preventScroll: true });
		history.replaceState(history.state, '', `#${id}`);
		courant = id;
	}

	// ---- Relevé et synchronisation interrompue ---------------------------------------------------
	function releve(iso: string): string {
		return joursCalendaires(iso) === 0 ? heure(iso) : `${dateCourte(iso)}, ${heure(iso)}`;
	}
	let horsLigne = $state(false);
	let depuis = $state('');
	$effect(() => {
		depuis = heure(new Date());
		const maj = () => {
			horsLigne = !navigator.onLine;
			if (!horsLigne) depuis = heure(new Date());
		};
		maj();
		window.addEventListener('online', maj);
		window.addEventListener('offline', maj);
		return () => {
			window.removeEventListener('online', maj);
			window.removeEventListener('offline', maj);
		};
	});

	// ---- Écritures : une seule note de marge à la fois ------------------------------------------
	const ecriture = creerEcriture();
	let cible = $state('');
	/** Après un conflit, la fiche se relit ; la saisie reste dans son champ. */
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
	const noteDe = (prefixe: string) => (cible.startsWith(prefixe) && ecriture.note ? ecriture.note : null);

	// ---- Portrait ------------------------------------------------------------------------------
	let portraitOuvert = $state(false);
	let portraitLien = $state('');
	$effect.pre(() => {
		portraitLien = data.fiche?.portraitUrl.startsWith('data:') ? '' : (data.fiche?.portraitUrl ?? '');
	});

	// ---- Ressources et déclarations -------------------------------------------------------------
	const NOMS: Record<ResourceKey, string> = { pv: 'Points de Vie', ep: 'Énergie Physique', em: 'Énergie Magique' };
	const part = (cur: number, max: number) => (max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0);
	const signe = (n: number) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);

	let maintenant = $state(Date.now());
	$effect(() => {
		const ouvertes = data.declarations.some((d) => Date.parse(d.cancelUntil) > Date.now());
		if (!ouvertes) return;
		const t = setInterval(() => {
			maintenant = Date.now();
			if (!data.declarations.some((d) => Date.parse(d.cancelUntil) > Date.now())) clearInterval(t);
		}, 1000);
		return () => clearInterval(t);
	});
	const restant = (d: DeclarationView) => Math.ceil((Date.parse(d.cancelUntil) - maintenant) / 1000);
	const declarationsDe = (r: ResourceKey) => data.declarations.filter((d) => d.resource === r);

	// ---- Inventaire ----------------------------------------------------------------------------
	const groupes = $derived.by(() => {
		if (!fiche) return [];
		const ordre: string[] = [...ITEM_CATEGORIES];
		for (const i of fiche.items) if (!ordre.includes(i.category)) ordre.push(i.category);
		return ordre
			.map((categorie) => ({ categorie, objets: fiche.items.filter((i) => i.category === categorie) }))
			.filter((g) => g.objets.length > 0);
	});
	let objetOuvert = $state<string | null>(null);
	let contexte = $state('');

	/** « une Potion boréale », « un Baume » : l'article se devine au premier mot (le carnet ne connaît pas le genre). */
	const MASCULINS = ['baume', 'remède', 'antidote', 'heaume', 'tonique', 'philtre', 'grimoire', 'charme', 'masque', 'casque', 'sabre', 'glaive', 'livre', 'onguent', 'élixir', 'cristal', 'fragment', 'parchemin', 'talisman', 'pain', 'flacon'];
	function avecArticle(nom: string): string {
		const premier = nom.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
		const feminin = !MASCULINS.includes(premier) && (/e$/.test(premier) || /ion$/.test(premier));
		return `${feminin ? 'une' : 'un'} ${nom}`;
	}
	const declarable = (i: ItemView) => i.category === 'Consommable';


	// ---- Conséquences --------------------------------------------------------------------------
	const FILTRES: { cle: ConsequenceFilter | null; libelle: string }[] = [
		{ cle: null, libelle: 'Tous' },
		{ cle: 'xp', libelle: 'XP' },
		{ cle: 'gemme', libelle: 'Gemmes' },
		{ cle: 'combat', libelle: 'Combats' },
		{ cle: 'item', libelle: 'Objets' },
		{ cle: 'status', libelle: 'Statuts' },
		{ cle: 'serment', libelle: 'Serment' }
	];
	function lienFiltre(cle: ConsequenceFilter | null, numero = 1): string {
		const p = new URLSearchParams();
		if (cle) p.set('filtre', cle);
		if (numero > 1) p.set('page', String(numero));
		const q = p.toString();
		return `/carnet/fiche${q ? `?${q}` : ''}#consequences`;
	}
	let voirRatures = $state(false);
	const lignes = $derived((data.consequences?.rows ?? []).filter((c) => voirRatures || !c.struck));
	const raturees = $derived((data.consequences?.rows ?? []).filter((c) => c.struck).length > 0);
	const CHAMPS: Record<string, string> = { pv: 'PV', ep: 'EP', em: 'EM', xp: 'XP', level: 'niveau', qty: 'quantité' };
	function tampon(c: ConsequenceView): string | null {
		return c.stamp ? `${signataire(c.stamp)} · ${dateCourte(c.at)}, ${heure(c.at)}` : null;
	}
	function signature(c: ConsequenceView): string | null {
		if (c.stamp) return null;
		if (c.signature === 'toi') return `toi · ${dateCourte(c.at)}, ${heure(c.at)}`;
		if (c.signature === 'regles') return `règles · ${dateCourte(c.at)}`;
		return dateCourte(c.at);
	}
	/** Une correction (rature d’une conséquence précédente) se lit « ~~120~~ 150 » ; sinon le texte dit déjà le changement. */
	const avecRature = (c: ConsequenceView) => !!c.replacesId && c.oldValue !== null && c.newValue !== null && c.oldValue !== c.newValue;
</script>

<svelte:head><title>{fiche ? `${fiche.name} — Ma fiche` : 'Ma fiche'}</title></svelte:head>

{#snippet filtres(classe: string)}
	<nav class="filtres {classe}" aria-label="Filtrer les conséquences">
		<ul>
			{#each FILTRES as f (f.libelle)}
				<li>
					<a href={lienFiltre(f.cle)} aria-current={data.filtre === f.cle ? 'true' : undefined} data-sveltekit-noscroll>{f.libelle}</a>
				</li>
			{/each}
		</ul>
	</nav>
{/snippet}

{#snippet ligneReleve()}
	{#if fiche}
		<p class="releve chiffres" class:retard={horsLigne} role={horsLigne ? 'status' : undefined}>
			relevé {releve(fiche.releveAt)}{#if horsLigne} · le carnet n’a pas pu se mettre à jour depuis {depuis}{/if}
		</p>
	{/if}
{/snippet}

{#if fiche}
	<Page repere="NP / 03 — Ma fiche" titre={fiche.name}>
		{#snippet marge()}
			<nav class="sommaire" aria-label="Chapitres de la fiche">
				<ol>
					{#each CHAPITRES as c (c.id)}
						<li>
							<a href="#{c.id}" class:courant={courant === c.id} aria-current={courant === c.id ? 'location' : undefined} onclick={(e) => allerA(e, c.id)}>
								<span class="num chiffres">{c.numero}</span>{c.titre}
							</a>
						</li>
					{/each}
				</ol>
			</nav>
			{@render ligneReleve()}
			<div class="marge-filtres">
				<p class="repere">Conséquences</p>
				{@render filtres('en-marge')}
			</div>
		{/snippet}
		{#snippet bande()}
			<nav class="sommaire-bande" aria-label="Chapitres de la fiche">
				{#each CHAPITRES as c (c.id)}
					<a href="#{c.id}" onclick={(e) => allerA(e, c.id)}><span class="num chiffres">{c.numero}</span>{c.titre.split(' ')[0]}</a>
				{/each}
			</nav>
			{@render ligneReleve()}
		{/snippet}

		<!-- En-tête : portrait carré, Serment · rang, niveau, une seule ligne d'XP. -->
		<section class="identite" aria-label="Identité">
			<div class="cadre-portrait">
				<Portrait nom={fiche.name} src={fiche.portraitUrl || null} taille={telephone ? 96 : 128} />
			</div>
			<div class="qui">
				<p class="serment">{fiche.oath.name} · <span class="rang">{fiche.oath.rankLabel}</span></p>
				<p class="niveau">Niveau <span class="chiffres">{fiche.level}</span></p>
				<div class="xp">
					<span class="trait" aria-hidden="true"><span class="encre-xp" style:width="{part(fiche.xp, fiche.xpMax)}%"></span></span>
					<p class="xp-texte chiffres">{#if fiche.xpMax > 0}{fiche.xp} / {fiche.xpMax} XP{:else}{fiche.xp} XP{/if}</p>
				</div>
				<button class="lien-discret" type="button" aria-expanded={portraitOuvert} aria-controls="portrait-form" onclick={() => (portraitOuvert = !portraitOuvert)}>
					{portraitOuvert ? 'Garder ce portrait' : 'Changer de portrait'}
				</button>
			</div>
			{#if portraitOuvert}
				<form id="portrait-form" class="portrait-form" method="POST" action="?/portrait" use:enhance={ecrire('portrait', 'Noté', () => (portraitOuvert = false))}>
					<input type="hidden" name="expectedRevision" value={fiche.revision} />
					<Champ libelle="Lien de l’image" name="url" type="url" inputmode="url" bind:value={portraitLien} placeholder="https://…" aide="Une image carrée en lien http(s). Laisse vide pour revenir à l’initiale." />
					<div class="gestes">
						<Bouton variante="ruban" type="submit"><Encre etat={cible === 'portrait' ? ecriture.etat : 'prise'}>Noter</Encre></Bouton>
					</div>
				</form>
			{/if}
			{#if noteDe('portrait')}
				<div class="note-identite"><NoteDeMarge ton={noteDe('portrait')!.ton}>{noteDe('portrait')!.texte}</NoteDeMarge></div>
			{/if}
		</section>

		{#key telephone}
			<!-- 01 Ressources -->
			<Chapitre numero="01" titre="Ressources" id="ressources" repliable={telephone} ouvert>
				<ul class="ressources">
					{#each RESOURCES as r (r)}
						{@const v = fiche[r]}
						<li class="ressource">
							<p class="r-nom"><abbr class="repere" title={NOMS[r]}>{r.toUpperCase()}</abbr><span class="r-titre">{NOMS[r]}</span></p>
							<p class="r-valeur chiffres"><span class="cur">{v.cur}</span><span class="max">/{v.max}</span></p>
							<span class="trait r-trait" aria-hidden="true"><span class="encre-r" class:bas={r === 'pv' && part(v.cur, v.max) < 32} style:width="{part(v.cur, v.max)}%"></span></span>
							{#if declarationsDe(r).length}
								<ul class="declarations">
									{#each declarationsDe(r) as d (d.id)}
										<li>
											<span class="decl-texte chiffres">{signe(d.delta)} {d.resource.toUpperCase()} ({d.word}) · {heure(d.at)} · attend un MJ</span>
											{#if restant(d) > 0}
												<form method="POST" action="?/annuler" use:enhance={ecrire(`decl:${d.id}`, 'Annulé')}>
													<input type="hidden" name="id" value={d.id} />
													<button class="lien-discret" type="submit">Annuler · <span class="chiffres">{restant(d)}</span> s</button>
												</form>
											{:else}
												<form method="POST" action="?/rayer" use:enhance={ecrire(`decl:${d.id}`, 'Rayé')}>
													<input type="hidden" name="id" value={d.id} />
													<button class="lien-discret" type="submit">Rayer</button>
												</form>
											{/if}
										</li>
										{#if cible === `decl:${d.id}` && ecriture.note}
											<li class="note-ligne"><NoteDeMarge ton={ecriture.note.ton}>{ecriture.note.texte}</NoteDeMarge></li>
										{/if}
									{/each}
								</ul>
							{/if}
						</li>
					{/each}
				</ul>

				<div class="sous-bloc">
					<p class="repere">Statuts</p>
					{#if fiche.statuses.length}
						<ul class="sens-liste">
							{#each fiche.statuses as s (s.id)}
								<li title={s.note || undefined}><Losange couleur={s.color} libelle={s.label} detail={s.turns ? `${s.turns} t.` : undefined} /></li>
							{/each}
						</ul>
					{:else}
						<p class="rien">Aucun statut en cours.</p>
					{/if}
				</div>
				<div class="sous-bloc">
					<p class="repere">Gemmes</p>
					{#if fiche.gems.length}
						<ul class="sens-liste">
							{#each fiche.gems as g (g.kind)}
								<li><Losange couleur={g.color} libelle={g.label} detail={`×${g.qty}`} /></li>
							{/each}
						</ul>
					{:else}
						<p class="rien">Aucune gemme.</p>
					{/if}
				</div>
			</Chapitre>

			<!-- 02 Équipement et inventaire -->
			<Chapitre numero="02" titre="Équipement et inventaire" id="equipement" repliable={telephone} ouvert={!telephone}>
				<dl class="emplacements">
					{#each EQUIPMENT_SLOTS as slot (slot)}
						<div class="emplacement">
							<dt>{EQUIPMENT_LABELS[slot]}</dt>
							<dd class:vide-slot={!fiche.equipment[slot]}>{fiche.equipment[slot] || 'rien'}</dd>
						</div>
					{/each}
				</dl>

				{#if noteDe('objet:')}
					<NoteDeMarge ton={noteDe('objet:')!.ton}>{noteDe('objet:')!.texte}</NoteDeMarge>
				{/if}
				{#if groupes.length}
					<div class="inventaire">
						{#each groupes as g (g.categorie)}
							<section class="categorie" aria-label={g.categorie}>
								<p class="repere">{g.categorie}</p>
								<ul>
									{#each g.objets as i (i.id)}
										<li class="objet">
											<div class="objet-ligne">
												<p class="objet-nom">{i.name} <span class="qte chiffres">×{i.qty}</span></p>
												{#if declarable(i) && objetOuvert !== i.id}
													<button class="lien-discret" type="button" onclick={() => { objetOuvert = i.id; contexte = ''; }}>Déclarer</button>
												{/if}
											</div>
											{#if i.description}<p class="objet-desc">{i.description}</p>{/if}
											{#if objetOuvert === i.id}
												<form class="consommer" method="POST" action="?/consommer" use:enhance={ecrire(`objet:${i.id}`, 'Noté', () => (objetOuvert = null))}>
													<input type="hidden" name="itemId" value={i.id} />
													<input type="hidden" name="expectedRevision" value={fiche.revision} />
													<p class="question">Tu déclares avoir utilisé {avecArticle(i.name)}&nbsp;?</p>
													<Champ libelle="Contexte (facultatif)" name="note" bind:value={contexte} maxlength={2000} placeholder="Après la chute dans le ravin…" id="contexte-{i.id}" />
													<div class="gestes">
														<Bouton variante="ruban" type="submit"><Encre etat={cible === `objet:${i.id}` ? ecriture.etat : 'prise'}>Oui, je le note.</Encre></Bouton>
														<button class="lien-discret" type="button" onclick={() => (objetOuvert = null)}>Laisser</button>
													</div>
												</form>
											{/if}
										</li>
									{/each}
								</ul>
							</section>
						{/each}
					</div>
				{:else}
					<Vide>Rien dans les poches.</Vide>
				{/if}
			</Chapitre>

			<!-- 03 Serment -->
			<Chapitre numero="03" titre="Serment" id="serment" repliable={telephone} ouvert={!telephone}>
				<dl class="serment-fiche">
					<div><dt>Serment</dt><dd>{fiche.oath.name}</dd></div>
					<div><dt>Arme</dt><dd>{fiche.oath.weapon || 'non notée'}</dd></div>
					<div><dt>Rang</dt><dd>{fiche.oath.rankLabel}</dd></div>
					<div><dt>Lignée</dt><dd>{fiche.oath.lineage ? `Évolution de ${fiche.oath.lineage}` : 'Serment premier'}</dd></div>
					<div><dt>Branche</dt><dd>{fiche.branch ?? 'aucune'}</dd></div>
				</dl>
				{#if !fiche.branch}
					<p class="rien">Aucune branche choisie. Un administrateur la note avec toi.</p>
				{:else}
					<ol class="paliers">
						{#each fiche.tiers.reached as t, n (t.level + t.name)}
							<li class="palier atteint">
								<p class="palier-tete">
									<span class="repere chiffres">{palierAtteint(n, t.level, t.stage)}</span>
									<span class="palier-nom">{t.name}</span>
									{#if t.cost}<span class="cout chiffres">{t.cost}</span>{/if}
								</p>
								{#if t.description}<p class="palier-texte">{t.description}</p>{/if}
							</li>
						{/each}
						{#each fiche.tiers.next as t, n (t.level + t.name)}
							{@const rang = fiche.tiers.reached.length + n}
							<li class="palier suivant">
								<p class="palier-tete">
									<span class="repere chiffres">{palierSuivant(rang, t.level, t.stage)}</span>
									<span class="palier-nom">{t.name}</span>
								</p>
							</li>
						{/each}
					</ol>
				{/if}
				<div class="gestes bas-chapitre">
					<Bouton variante="texte" href="/univers/serments/{fiche.oath.id}" fleche="→">Voir le Serment complet</Bouton>
				</div>
			</Chapitre>

			<!-- 04 Conséquences -->
			<Chapitre numero="04" titre="Conséquences" id="consequences" repliable={telephone} ouvert={!telephone || consequencesOuvertes}>
				{@render filtres('en-corps')}
				{#if raturees || voirRatures}
					<div class="ratures-bascule">
						<button class="lien-discret" type="button" aria-pressed={voirRatures} onclick={() => (voirRatures = !voirRatures)}>
							{voirRatures ? 'Cacher les ratures' : 'Voir les ratures'}
						</button>
					</div>
				{/if}
				{#if lignes.length}
					<ul class="consequences">
						{#each lignes as c (c.id)}
							<Consequence cle={c.id} tampon={tampon(c)} signature={signature(c)} motif={c.motif || null} rayee={c.struck}>
								{c.text}{#if avecRature(c)}<span class="valeurs">{c.field ? `${CHAMPS[c.field] ?? c.field} ` : ''}<Rature ancien={c.oldValue ?? ''} nouveau={c.newValue} /></span>{/if}
							</Consequence>
						{/each}
					</ul>
				{:else}
					<Vide>{data.filtre ? 'Rien d’écrit sous ce filtre pour l’instant.' : 'Aucune conséquence n’est encore écrite. La première portera un tampon.'}</Vide>
				{/if}
				{#if data.consequences && data.consequences.pages > 1}
					<nav class="tourner" aria-label="Pages des conséquences">
						{#if data.consequences.page > 1}
							<Bouton variante="texte" href={lienFiltre(data.filtre, data.consequences.page - 1)}>← Page précédente</Bouton>
						{:else}<span></span>{/if}
						<span class="folio chiffres">{data.consequences.page} / {data.consequences.pages}</span>
						{#if data.consequences.page < data.consequences.pages}
							<Bouton variante="texte" href={lienFiltre(data.filtre, data.consequences.page + 1)} fleche="→">Page suivante</Bouton>
						{:else}<span></span>{/if}
					</nav>
				{/if}
			</Chapitre>
		{/key}

		{#snippet pied()}
			<div class="gestes pied-gestes">
				<Bouton variante="trait" href="/carnet/fiche/imprimer">Exporter cette fiche (PDF)</Bouton>
				<Bouton variante="texte" href="/carnet/journal?voix=recits" fleche="→">Lire mes récits</Bouton>
			</div>
		{/snippet}
	</Page>
{:else}
	<Page repere="NP / 03 — Ma fiche" titre="Ma" titreVoix="fiche.">
		<p class="indisponible">Ta fiche n’a pas pu s’ouvrir. Recharge la page.</p>
		<div class="gestes">
			<Bouton variante="trait" href="/carnet/fiche" data-sveltekit-reload>Recharger cette page</Bouton>
			<Bouton variante="texte" href="/carnet" fleche="→">Dernières pages</Bouton>
		</div>
	</Page>
{/if}

<style>
	/* ---- Marge : sommaire collant ---- */
	.sommaire ol {
		display: grid;
	}
	.sommaire a {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: var(--cible);
		border-bottom: 1px solid var(--reglure);
		font: var(--t-libelle);
		font-size: 14px;
		color: var(--encre-2);
		text-decoration: none;
		transition: color 160ms;
	}
	.sommaire a:hover,
	.sommaire a.courant {
		color: var(--encre);
	}
	.sommaire a.courant .num {
		color: var(--encre-humide);
	}
	.num {
		font: var(--t-repere);
		letter-spacing: 0.12em;
		color: var(--encre-grise);
	}
	.releve {
		margin-top: var(--ligne);
		font: var(--t-libelle);
		line-height: var(--ligne);
		color: var(--encre-2);
	}
	.releve.retard {
		color: var(--rouille);
	}
	.marge-filtres {
		margin-top: calc(var(--ligne) * 2);
	}
	.filtres ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0 16px;
	}
	.filtres.en-marge ul {
		display: grid;
		gap: 0;
	}
	.filtres a {
		display: inline-flex;
		align-items: center;
		min-height: var(--cible);
		font: var(--t-libelle);
		color: var(--encre-2);
		text-decoration: none;
	}
	.filtres a:hover {
		color: var(--encre);
	}
	.filtres a[aria-current='true'] {
		color: var(--encre);
		text-decoration: underline;
		text-decoration-color: var(--encre-humide);
		text-underline-offset: 6px;
	}
	.filtres.en-corps {
		display: none;
	}

	/* ---- Bande (téléphone) ---- */
	.sommaire-bande {
		display: flex;
		flex-wrap: wrap;
		gap: 0 16px;
		width: 100%;
	}
	.sommaire-bande a {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: var(--cible);
		color: var(--encre);
		text-decoration: none;
	}
	.sommaire-bande + .releve {
		margin-top: 0;
		width: 100%;
	}

	/* ---- En-tête ---- */
	.identite {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 0 var(--gouttiere);
		align-items: start;
		padding-bottom: var(--ligne);
		border-bottom: 1px solid var(--reglure);
	}
	.serment {
		font: 500 22px/28px var(--voix);
		color: var(--encre);
	}
	.rang {
		color: var(--tampon);
	}
	.niveau {
		font: var(--t-libelle);
		line-height: var(--ligne);
		color: var(--encre-2);
	}
	.xp {
		max-width: 30rem;
		padding-top: calc(var(--ligne) / 2);
	}
	.trait {
		position: relative;
		display: block;
		height: 1px;
		background: var(--reglure);
	}
	/* Un trait d'encre posé sur la réglure : 1 px pour les ressources, 2 px pour l'XP. Pas de jauge. */
	.encre-xp,
	.encre-r {
		position: absolute;
		left: 0;
		top: 0;
		height: 1px;
		background: var(--encre);
	}
	.encre-xp {
		top: -1px;
		height: 2px;
		border-radius: 1px;
	}
	.encre-r.bas {
		background: var(--rouille);
	}
	.xp-texte {
		font: var(--t-libelle);
		line-height: var(--ligne);
		color: var(--encre-2);
	}
	.portrait-form {
		grid-column: 1 / -1;
		display: grid;
		gap: calc(var(--ligne) / 2);
		max-width: 52ch;
		padding-top: var(--ligne);
	}
	.note-identite {
		grid-column: 1 / -1;
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
		cursor: pointer;
	}
	.lien-discret:hover {
		color: var(--encre);
	}
	.rien {
		font: var(--t-recit);
		font-style: italic;
		color: var(--encre-2);
	}

	/* ---- 01 Ressources ---- */
	.ressource {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: baseline;
		gap: 0 16px;
		padding: calc(var(--ligne) / 2) 0 0;
	}
	.r-nom {
		display: flex;
		align-items: baseline;
		gap: 14px;
	}
	.r-nom abbr {
		text-decoration: none;
		color: var(--encre);
	}
	.r-titre {
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.r-valeur {
		font: 500 24px/var(--ligne) var(--corps);
		color: var(--encre);
	}
	.max {
		font-size: 16px;
		color: var(--encre-2);
	}
	.r-trait {
		grid-column: 1 / -1;
		margin-top: 10px;
		margin-bottom: calc(var(--ligne) / 2 - 1px);
	}
	.declarations {
		grid-column: 1 / -1;
		margin-top: -6px;
		padding-bottom: 6px;
	}
	.declarations li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0 16px;
	}
	.decl-texte {
		font: var(--t-libelle);
		color: var(--encre-humide);
	}
	.note-ligne {
		display: block;
	}
	.sous-bloc {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 20px;
		min-height: calc(var(--ligne) * 2);
		border-bottom: 1px solid var(--reglure);
	}
	.sous-bloc .repere {
		min-width: 7em;
	}
	.sens-liste {
		display: flex;
		flex-wrap: wrap;
		gap: 6px 22px;
	}
	.sous-bloc .rien {
		font-size: 17px;
	}

	/* ---- 02 Équipement et inventaire ---- */
	.emplacements {
		padding-top: calc(var(--ligne) / 2);
	}
	.emplacement {
		display: grid;
		grid-template-columns: 7em minmax(0, 1fr);
		gap: 0 16px;
		align-items: baseline;
		min-height: var(--ligne);
		padding: calc(var(--ligne) / 4) 0;
		border-bottom: 1px solid var(--reglure);
	}
	.emplacement dt {
		font: var(--t-repere);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--encre-2);
	}
	.emplacement dd {
		font: 500 20px/28px var(--voix);
		color: var(--encre);
	}
	.emplacement dd.vide-slot {
		font-style: italic;
		color: var(--encre-grise);
	}
	.inventaire {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--ligne) var(--gouttiere);
		padding-top: var(--ligne);
	}
	.categorie > .repere {
		padding-bottom: 6px;
		border-bottom: 1px solid var(--encre-grise);
	}
	.objet {
		border-bottom: 1px solid var(--reglure);
	}
	.objet-ligne {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		min-height: var(--cible);
	}
	.objet-nom {
		font: var(--t-liste);
		color: var(--encre);
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.qte {
		margin-left: 6px;
		color: var(--encre-2);
	}
	.objet-desc {
		margin-top: -8px;
		padding-bottom: 8px;
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.consommer {
		display: grid;
		gap: 8px;
		padding: 4px 0 calc(var(--ligne) / 2);
	}
	.question {
		font: italic 400 19px/28px var(--voix);
		color: var(--encre-humide);
	}

	/* ---- 03 Serment ---- */
	.serment-fiche {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
		gap: 0 var(--gouttiere);
		padding-top: calc(var(--ligne) / 2);
	}
	.serment-fiche div {
		padding: calc(var(--ligne) / 4) 0;
		border-bottom: 1px solid var(--reglure);
	}
	.serment-fiche dt {
		font: var(--t-repere);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--encre-2);
	}
	.serment-fiche dd {
		font: 500 20px/28px var(--voix);
		color: var(--encre);
		overflow-wrap: anywhere;
	}
	.serment-fiche + .rien {
		padding-top: var(--ligne);
	}
	.paliers {
		padding-top: var(--ligne);
	}
	.palier {
		padding: calc(var(--ligne) / 2) 0;
		border-bottom: 1px solid var(--reglure);
	}
	.palier-tete {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 2px 16px;
	}
	.palier-nom {
		font: 500 22px/28px var(--voix);
		color: var(--encre);
	}
	.cout {
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.palier-texte {
		margin-top: 4px;
		font: var(--t-recit);
		/* Valeurs de règle (« 10+Niv ») : chiffres alignés, lisibles d'un coup d'œil en plein RP. */
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
		max-width: var(--lecture);
	}
	.atteint .repere {
		color: var(--encre-humide);
	}
	.suivant .palier-nom,
	.suivant .repere {
		color: var(--encre-grise);
	}
	.bas-chapitre {
		padding-top: calc(var(--ligne) / 2);
	}

	/* ---- 04 Conséquences ---- */
	.ratures-bascule {
		display: flex;
		justify-content: flex-end;
	}
	.valeurs {
		margin-left: 10px;
		color: var(--encre-2);
	}
	.tourner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding-top: calc(var(--ligne) / 2);
	}
	.folio {
		font: var(--t-libelle);
		color: var(--encre-grise);
	}

	/* ---- États ---- */
	.indisponible {
		padding-bottom: var(--ligne);
		font: italic 400 22px/28px var(--voix);
		color: var(--encre);
		max-width: var(--lecture);
	}

	@media (max-width: 1100px) {
		.inventaire {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 760px) {
		.identite {
			gap: 0 16px;
		}
		.serment {
			font-size: 20px;
		}
		.filtres.en-corps {
			display: block;
			padding-top: 4px;
			border-bottom: 1px solid var(--reglure);
		}
		.ratures-bascule {
			justify-content: flex-start;
		}
		.sous-bloc .repere {
			min-width: 0;
			width: 100%;
			padding-top: 10px;
		}
		.sous-bloc {
			padding-bottom: 10px;
		}
		.emplacement {
			grid-template-columns: 6.5em minmax(0, 1fr);
		}
		.pied-gestes {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
