<script lang="ts">
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { chemin } from '$lib/ui/adresse';
	import { signature, phraseTampon } from '$lib/ui/tampons';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount, tick, untrack } from 'svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import PagePersonnages from '../PagePersonnages.svelte';
	import Attributions from '../Attributions.svelte';
	import OperationsSensibles from '../OperationsSensibles.svelte';
	import EntreeJournal from '../EntreeJournal.svelte';
	import SaisieTampon from '../SaisieTampon.svelte';
	import Chapitre from '$lib/ui/Chapitre.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import Encre from '$lib/ui/Encre.svelte';
	import Portrait from '$lib/ui/Portrait.svelte';
	import Consequence from '$lib/ui/Consequence.svelte';
	import Tampon from '$lib/ui/Tampon.svelte';
	import Rature from '$lib/ui/Rature.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import Losange from '$lib/ui/Losange.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import { creerEcriture } from '$lib/ui/ecriture.svelte';
	import { dateLongue, dateHeure, heure } from '$lib/ui/dates';
	import { EQUIPMENT_SLOTS, EQUIPMENT_LABELS, RESOURCES } from '$lib/schemas/characters';
	import { FACT_KIND_LABELS } from '$lib/schemas/facts';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
	const sheet = $derived(data.sheet);
	const ecriture = creerEcriture();
	let active = $state('');
	let mobile = $state(false);
	let expandedChapters = $state<Record<string, boolean>>({});
	let reviewed = $state(false);
	let approvedRevision = $state(untrack(() => data.sheet.revision));
	const failure = $derived(form && 'message' in form ? form : null);
	const values = $derived(failure?.values ?? {});
	const conflit = $derived(ecriture.note?.code === 'VERSION_CONFLICT');
	const interrompu = $derived(ecriture.note?.ton === 'refus' && !ecriture.note.code);
	const lastStamp = $derived(data.lastStamp);
	const filters = [
		['', 'Tous'],
		['xp', 'XP'],
		['gemme', 'Gemmes'],
		['combat', 'Combats'],
		['item', 'Objets'],
		['status', 'Statuts'],
		['serment', 'Serment']
	] as const;
	const chapters = $derived([
		{ id: 'ressources', numero: '01', titre: 'Ressources' },
		{ id: 'inventaire', numero: '02', titre: 'Équipement et inventaire' },
		{ id: 'serment', numero: '03', titre: 'Serment' },
		{ id: 'consequences', numero: '04', titre: 'Conséquences' },
		...(data.canStamp
			? [
					{ id: 'attribuer', numero: '05', titre: 'Attribuer' },
					{ id: 'declarations', numero: '', titre: 'Reporter les déclarations' }
				]
			: []),
		{ id: 'faits', numero: '', titre: 'Faits validés' },
		{ id: 'journal', numero: '', titre: 'Journal' },
		...(data.canIdentity ? [{ id: 'sensible', numero: '06', titre: 'Opérations sensibles' }] : [])
	]);
	const visibleConsequences = $derived(
		data.showStruck ? data.consequences.rows : data.consequences.rows.filter((c) => !c.struck)
	);
	const itemGroups = $derived.by(() => {
		const categories = [...new Set(sheet.items.map((i) => i.category))];
		return categories.map((category) => ({
			category,
			items: sheet.items.filter((i) => i.category === category)
		}));
	});
	const reachedStages = $derived(new Set(sheet.tiers.reached.map((t) => t.stage)));

	$effect(() => {
		if (!conflit && !ecriture.enCours) approvedRevision = data.sheet.revision;
	});
	$effect(() => {
		if (ecriture.note?.ton !== 'fait') return;
		const timer = setTimeout(() => ecriture.effacer(), 3000);
		return () => clearTimeout(timer);
	});

	async function ouvrir(id: string) {
		const el = document.getElementById(id);
		let ancestor = el?.parentElement;
		while (ancestor) {
			if (ancestor instanceof HTMLDetailsElement) {
				if (ancestor.classList.contains('chapitre')) expandedChapters[ancestor.id] = true;
				ancestor.open = true;
			}
			ancestor = ancestor.parentElement;
		}
		// Le chapitre se pose avant d’ouvrir son formulaire ; sa réponse ne referme pas la ligne.
		await tick();
		if (el instanceof HTMLDetailsElement) {
			el.open = true;
			el.querySelector('summary')?.focus();
		} else if (el instanceof HTMLElement) el.focus();
	}
	onMount(() => {
		const media = matchMedia('(max-width: 760px)');
		mobile = media.matches;
		const update = () => {
			mobile = media.matches;
			expandedChapters = Object.fromEntries(
				chapters.map((c) => [c.id, !mobile || c.id === 'ressources'])
			);
		};
		update();
		const remember = (event: Event) => {
			const el = event.target;
			if (el instanceof HTMLDetailsElement && el.classList.contains('chapitre'))
				expandedChapters[el.id] = el.open;
		};
		document.addEventListener('toggle', remember, true);
		media.addEventListener('change', update);
		if (location.hash)
			requestAnimationFrame(() => ouvrir(decodeURIComponent(location.hash.slice(1))));
		return () => {
			media.removeEventListener('change', update);
			document.removeEventListener('toggle', remember, true);
		};
	});

	function enhancer(id: string): SubmitFunction {
		return (input) => {
			if (conflit && !reviewed) {
				input.cancel();
				return;
			}
			if (!ecriture.enCours) {
				active = id;
				reviewed = false;
			}
			const geste = input.submitter?.getAttribute('value');
			const verbe =
				input.action.search.includes('rayer') || id.startsWith('rayer')
					? 'Rayé'
					: geste === 'refuser'
						? 'Refusé'
						: geste === 'regler'
							? 'Réglé'
							: 'Tamponné';
			const base = ecriture.enhance({ verbe });
			const suite = base(input);
			if (typeof suite !== 'function') return suite;
			return async (result) => {
				await suite(result);
				// Le dernier tampon de l'autre auteur devient visible ; la saisie et la révision acceptée restent.
				if (result.result.type === 'failure' && result.result.data?.code === 'VERSION_CONFLICT')
					await invalidateAll();
			};
		};
	}
	async function relire() {
		await invalidateAll();
		approvedRevision = data.sheet.revision;
		reviewed = true;
	}
	function lien(params: Record<string, string>, hash: string): string {
		const query = new SvelteURLSearchParams(page.url.searchParams);
		for (const [key, value] of Object.entries(params)) {
			if (value) query.set(key, value);
			else query.delete(key);
		}
		return `${page.url.pathname}?${query}#${hash}`;
	}
</script>

<svelte:head><title>{sheet.name} · Personnages — Nuages Polaires</title></svelte:head>

{#snippet reperes()}
	<Bouton variante="texte" href="/table/personnages">Tous les personnages</Bouton>
	<nav class="sommaire" aria-label="Chapitres de la fiche">
		<ul>
			{#each chapters as c (c.id)}<li>
					<a href="#{c.id}" onclick={() => ouvrir(c.id)}
						><span class="numero chiffres">{c.numero}</span>{c.titre}</a
					>
				</li>{/each}
		</ul>
	</nav>
	<p class="releve chiffres">relevé {heure(sheet.releveAt)} · {dateLongue(sheet.releveAt)}</p>
	<div class="filtres-marge">
		<p class="repere">Conséquences</p>
		<nav aria-label="Filtrer les conséquences">
			{#each filters as f (f[0])}<a
					href={chemin(lien({ filtre: f[0], page: '' }, 'consequences'))}
					class:courant={data.filter === f[0]}
					aria-current={data.filter === f[0] ? 'true' : undefined}>{f[1]}</a
				>{/each}
		</nav>
		<a
			class="ratures"
			href={chemin(lien({ ratures: data.showStruck ? '' : 'oui' }, 'consequences'))}
			>{data.showStruck ? 'Replier les ratures' : 'Voir les ratures'}</a
		>
	</div>
{/snippet}

{#snippet afficherNote(id: string)}
	{#if active === id && ecriture.note}
		<div class="retour">
			<NoteDeMarge ton={ecriture.note.ton}>
				{#if interrompu}Le registre n’a pas pu se mettre à jour depuis {heure(sheet.releveAt)}. {ecriture
						.note.texte}{:else}{ecriture.note.texte}{/if}
				{#snippet action()}{#if conflit}<Bouton variante="texte" onclick={relire}>Relire</Bouton
						>{/if}{/snippet}
			</NoteDeMarge>
			{#if conflit && lastStamp?.stamp}<p class="dernier-tampon">
					Écrit entre-temps&nbsp;: <Tampon cle={lastStamp.id}
						>{phraseTampon(
							lastStamp.stamp.role,
							lastStamp.stamp.name,
							lastStamp.at,
							lastStamp.motif ?? ''
						)}</Tampon
					><span>{lastStamp.text} — motif&nbsp;: {lastStamp.motif}</span>
				</p>{/if}
			{#if conflit && reviewed}<p class="aide">
					Le relevé est relu. Ta saisie reste ici&nbsp;; relis-la avant de tamponner.
				</p>{/if}
		</div>
	{:else if !ecriture.note && values.operation === id && failure}<NoteDeMarge ton="refus"
			>{failure.message}</NoteDeMarge
		>{/if}
{/snippet}

<PagePersonnages titre={sheet.name} {reperes}>
	<div class="identite">
		<Portrait nom={sheet.name} src={sheet.portraitUrl} taille={72} />
		<div>
			<p class="serment">{sheet.oath.name} · {sheet.oath.rankLabel}</p>
			<p class="chiffres">niveau {sheet.level} · {sheet.xp} / {sheet.xpMax} XP</p>
			<div class="trait-xp" aria-hidden="true">
				<span style:width={`${Math.min(100, (sheet.xp / sheet.xpMax) * 100)}%`}></span>
			</div>
			<p class="liaison">{sheet.linkedPseudo ? `relié à ${sheet.linkedPseudo}` : 'non relié'}</p>
		</div>
	</div>

	<Chapitre numero="01" titre="Ressources" id="ressources" repliable ouvert>
		<div class="ressources">
			{#each RESOURCES as r (r)}<p class="ressource chiffres">
					<span class="repere">{r.toUpperCase()}</span><strong
						>{sheet[r].cur}<span class="max"> / {sheet[r].max}</span></strong
					><span>au dernier relevé</span>
				</p>{/each}
		</div>
		<p class="releve chiffres">relevé {heure(sheet.releveAt)}</p>
		{#if data.declarations.length}<ul class="en-attente">
				{#each data.declarations as d (d.id)}<li>
						{d.delta < 0 ? '−' : '+'}{Math.abs(d.delta)}
						{d.resource.toUpperCase()} · {heure(d.at)} · attend un MJ
					</li>{/each}
			</ul>{/if}
		<div class="sens">
			{#if sheet.statuses.length}{#each sheet.statuses as s (s.id)}<span
						><Losange couleur={s.color} libelle={s.label} />{#if s.note}<span class="aide"
								>{s.note}</span
							>{/if}</span
					>{/each}{:else}<Vide>Aucun statut.</Vide>{/if}
		</div>
		<div class="sens gemmes">
			{#if sheet.gems.length}{#each sheet.gems as g (g.kind)}<Losange
						couleur={g.color}
						libelle={g.label}
						detail={'×' + g.qty}
					/>{/each}{:else}<Vide>Aucune gemme.</Vide>{/if}
		</div>
	</Chapitre>

	<Chapitre
		numero="02"
		titre="Équipement et inventaire"
		id="inventaire"
		repliable
		ouvert={expandedChapters['inventaire'] ?? !mobile}
	>
		<dl class="equipement">
			{#each EQUIPMENT_SLOTS as slot (slot)}<div>
					<dt>{EQUIPMENT_LABELS[slot]}</dt>
					<dd>{sheet.equipment[slot] ?? 'rien'}</dd>
				</div>{/each}
		</dl>
		{#if itemGroups.length}{#each itemGroups as group (group.category)}<h3 class="categorie repere">
					{group.category}
				</h3>
				<ul class="objets">
					{#each group.items as item (item.id)}<li>
							<span
								><strong>{item.name}</strong>{#if item.description}<span class="description"
										>{item.description}</span
									>{/if}</span
							><span class="chiffres">×{item.qty}</span>
						</li>{/each}
				</ul>{/each}{:else}<Vide>Rien dans les poches.</Vide>{/if}
	</Chapitre>

	<Chapitre
		numero="03"
		titre="Serment"
		id="serment"
		repliable
		ouvert={expandedChapters['serment'] ?? !mobile}
	>
		<dl class="equipement">
			<div>
				<dt>Arme</dt>
				<dd>{sheet.oath.weapon || 'aucune'}</dd>
			</div>
			<div>
				<dt>Rang</dt>
				<dd>{sheet.oath.rankLabel}</dd>
			</div>
			{#if sheet.oath.lineage}<div>
					<dt>Lignée</dt>
					<dd>Évolution de {sheet.oath.lineage}</dd>
				</div>{/if}
			<div>
				<dt>Branche</dt>
				<dd>{sheet.branch ?? 'Aucune branche choisie. Un administrateur la note avec toi.'}</dd>
			</div>
		</dl>
		{#each [...sheet.tiers.reached, ...sheet.tiers.next] as tier, i (tier.stage)}<article
				class="palier"
				class:suivant={!reachedStages.has(tier.stage)}
			>
				<header>
					<p class="repere">
						{['I · Éveil', 'II · Densité', 'III · Maîtrise', 'IV · Plénitude'][i] ?? tier.stage} · niveau
						{tier.level}
					</p>
					<span class="chiffres">{tier.cost}</span>
				</header>
				<h3>{tier.name}</h3>
				<p>{tier.description}</p>
			</article>{/each}
		<Bouton variante="texte" href="/univers/serments/{sheet.oath.id}" fleche="→"
			>Voir le Serment complet</Bouton
		>
	</Chapitre>

	<Chapitre
		numero="04"
		titre="Conséquences"
		id="consequences"
		repliable
		ouvert={expandedChapters['consequences'] ?? !mobile}
	>
		{#if visibleConsequences.length}<ul class="consequences">
				{#each visibleConsequences as c (c.id)}<Consequence
						cle={c.id}
						tampon={c.stamp ? signature(c.stamp.role, c.stamp.name, c.at) : null}
						signature={c.signature
							? `${c.signature === 'regles' ? 'règles' : 'toi'} · ${dateHeure(c.at)}`
							: null}
						motif={c.motif}
						rayee={c.struck}
						>{c.text}{#if c.oldValue !== null && c.newValue !== null && c.oldValue !== c.newValue}<span
								class="variation"
								><span class="sr-only">Valeurs du relevé&nbsp;: </span><Rature
									ancien={c.oldValue}
									nouveau={c.newValue}
								/></span
							>{/if}{#if c.combatId}<a href={chemin(`/table/archives/${c.combatId}`)} class="recit"
								>Lire le récit →</a
							>{/if}</Consequence
					>{/each}
			</ul>{:else}<Vide>Aucune conséquence sur cette page.</Vide>{/if}
		{#if data.consequences.pages > 1}<nav class="pagination" aria-label="Pages des conséquences">
				{#if data.consequences.page > 1}<Bouton
						variante="texte"
						href={lien({ page: String(data.consequences.page - 1) }, 'consequences')}
						>Page précédente</Bouton
					>{/if}{#if data.consequences.page < data.consequences.pages}<Bouton
						variante="texte"
						href={lien({ page: String(data.consequences.page + 1) }, 'consequences')}
						fleche="→">Page suivante</Bouton
					>{/if}
			</nav>{/if}
	</Chapitre>

	{#if data.canStamp}
		<Chapitre
			numero="05"
			titre="Attribuer"
			id="attribuer"
			repliable
			ouvert={expandedChapters['attribuer'] ?? !mobile}
		>
			<p class="introduction">
				Chaque attribution garde un motif. Le tampon s’écrit dans 04 Conséquences après la réponse
				du serveur.
			</p>
			<Attributions
				{sheet}
				beasts={data.beasts}
				revision={approvedRevision}
				{enhancer}
				etat={ecriture.etat}
				humide={ecriture.enCours}
				{afficherNote}
				{values}
			/>
		</Chapitre>
		<Chapitre
			titre="Reporter les déclarations"
			id="declarations"
			repliable
			ouvert={expandedChapters['declarations'] ?? !mobile}
		>
			{#if data.declarations.length}
				{#each data.declarations as d (d.id)}
					<SaisieTampon
						titre={d.text}
						operation={'reporter-' + d.id}
						revision={approvedRevision}
						enhancement={enhancer('reporter-' + d.id)}
						etat={ecriture.etat}
						humide={ecriture.enCours}
						motifInitial={'Report de déclaration : ' + d.word + '.'}
						{values}
					>
						<input type="hidden" name="id" value={d.id} />
						<p class="aide chiffres">
							Déclarée le {dateHeure(d.at)}{#if d.combatId}
								· pendant une Table{/if}.
						</p>
						{#snippet gestes()}<Bouton variante="tampon" type="submit" disabled={ecriture.enCours}
								><Encre etat={ecriture.etat}>Reporter</Encre></Bouton
							><Bouton
								variante="rouille"
								type="submit"
								formaction="?/rayerDeclaration"
								disabled={ecriture.enCours}><Encre etat={ecriture.etat}>Rayer</Encre></Bouton
							>{/snippet}
						{#snippet note()}{@render afficherNote('reporter-' + d.id)}{/snippet}
					</SaisieTampon>
				{/each}
			{:else}<Vide>Aucune déclaration n’attend de report.</Vide>{/if}
			{#if active.startsWith('reporter-') && !data.declarations.some((d) => active === 'reporter-' + d.id)}{@render afficherNote(
					active
				)}{/if}
		</Chapitre>
	{/if}

	<Chapitre
		titre="Faits validés"
		id="faits"
		repliable
		ouvert={expandedChapters['faits'] ?? !mobile}
	>
		{#if data.facts.length}<ul class="faits">
				{#each data.facts as f (f.id)}<li
						class:rayee={f.status === 'settled' || f.status === 'rejected'}
					>
						<p class="repere">
							{FACT_KIND_LABELS[f.kind]}{f.counterpart ? ' · ' + f.counterpart : ''} · {f.status ===
							'proposed'
								? 'attend un tampon'
								: f.status === 'validated'
									? 'validé'
									: f.status === 'settled'
										? 'réglé'
										: 'refusé'}
						</p>
						<p class="texte-fait">{f.text}</p>
						{#if f.witness}<p class="aide">Témoin&nbsp;: {f.witness}</p>{/if}{#if f.stamp}<div
								class="signature-fait"
							>
								<Tampon cle={f.id}>{signature(f.stamp.role, f.stamp.name, f.stamp.at)}</Tampon>
								<p class="aide">motif&nbsp;: {f.stamp.motif}</p>
							</div>{/if}{#if data.canValidate && (f.status === 'proposed' || f.status === 'validated')}<SaisieTampon
								titre={f.status === 'proposed' ? 'Tamponner ou refuser ce fait' : 'Régler ce fait'}
								operation={'fait-' + f.id}
								revision={f.revision}
								enhancement={enhancer('fait-' + f.id)}
								etat={ecriture.etat}
								humide={ecriture.enCours}
								{values}
								><input
									type="hidden"
									name="id"
									value={f.id}
								/>{#snippet gestes()}{#if f.status === 'proposed'}<Bouton
											variante="tampon"
											type="submit"
											name="geste"
											value="tamponner"
											disabled={ecriture.enCours}
											><Encre etat={ecriture.etat}>Tamponner</Encre></Bouton
										><Bouton
											variante="rouille"
											type="submit"
											name="geste"
											value="refuser"
											disabled={ecriture.enCours}
											><Encre etat={ecriture.etat}>Refuser</Encre></Bouton
										>{:else}<Bouton
											variante="tampon"
											type="submit"
											name="geste"
											value="regler"
											disabled={ecriture.enCours}><Encre etat={ecriture.etat}>Régler</Encre></Bouton
										>{/if}{/snippet}{#snippet note()}{@render afficherNote(
										'fait-' + f.id
									)}{/snippet}</SaisieTampon
							>{/if}
					</li>{/each}
			</ul>{:else}<Vide
				>Aucun fait validé. Ils s’écrivent d’abord sur Discord ; un joueur peut en proposer ici
				quand un MJ peut le tamponner.</Vide
			>{/if}
	</Chapitre>

	<Chapitre titre="Journal" id="journal" repliable ouvert={expandedChapters['journal'] ?? !mobile}>
		<p class="introduction">Lu par le joueur, les MJ et les administrateurs.</p>
		{#if data.journal.rows.length}{#each data.journal.rows as entry (entry.id)}<EntreeJournal
					{entry}
				/>{/each}{:else}<Vide>Cette page est blanche. Elle t’attend.</Vide>{/if}
		{#if data.journal.pages > 1}<nav class="pagination" aria-label="Pages du journal">
				{#if data.journal.page > 1}<Bouton
						variante="texte"
						href={lien({ journal: String(data.journal.page - 1) }, 'journal')}
						>Page précédente</Bouton
					>{/if}{#if data.journal.page < data.journal.pages}<Bouton
						variante="texte"
						href={lien({ journal: String(data.journal.page + 1) }, 'journal')}
						fleche="→">Page suivante</Bouton
					>{/if}
			</nav>{/if}
	</Chapitre>

	{#if data.canIdentity}<div class="sensible">
			<Chapitre
				numero="06"
				titre="Opérations sensibles"
				id="sensible"
				repliable
				ouvert={expandedChapters['sensible'] ?? !mobile}
				><OperationsSensibles
					{sheet}
					oaths={data.identityOaths}
					revision={approvedRevision}
					{enhancer}
					etat={ecriture.etat}
					humide={ecriture.enCours}
					{afficherNote}
					{values}
				/></Chapitre
			>
		</div>{/if}
</PagePersonnages>

<style>
	.sommaire a {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: var(--cible);
		font: var(--t-libelle);
		color: var(--encre-2);
		text-decoration: none;
	}
	.numero {
		min-width: var(--ligne);
		color: var(--encre-grise);
	}
	.releve {
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.filtres-marge {
		margin-top: var(--ligne);
		padding-top: var(--ligne);
		border-top: 1px solid var(--reglure);
	}
	.filtres-marge nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0 12px;
	}
	.filtres-marge a {
		display: inline-flex;
		align-items: center;
		min-height: var(--cible);
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.filtres-marge .courant {
		color: var(--encre-humide);
	}
	.identite {
		display: flex;
		align-items: center;
		gap: var(--ligne);
		padding-bottom: var(--ligne);
		border-bottom: 1px solid var(--reglure);
	}
	.identite > div {
		flex: 1;
		min-width: 0;
	}
	.serment {
		font: var(--t-corps);
	}
	.liaison {
		font: var(--t-libelle);
		color: var(--encre-grise);
	}
	.trait-xp {
		height: 1px;
		background: var(--reglure);
		margin: calc(var(--ligne) / 2) 0;
		max-width: 24rem;
	}
	.trait-xp span {
		display: block;
		height: 1px;
		background: var(--encre);
	}
	.ressource {
		display: grid;
		grid-template-columns: 3rem minmax(0, 1fr) auto;
		align-items: baseline;
		gap: var(--gouttiere);
		min-height: calc(var(--ligne) * 2);
		border-bottom: 1px solid var(--reglure);
	}
	.ressource strong {
		font: var(--t-corps);
	}
	.ressource > span:last-child,
	.max {
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.en-attente {
		font: var(--t-libelle);
		color: var(--encre-humide);
		padding: var(--ligne) 0;
	}
	.sens {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--ligne);
		padding-top: var(--ligne);
	}
	.sens > span {
		display: grid;
		gap: calc(var(--ligne) / 2);
	}
	.gemmes {
		padding-bottom: var(--ligne);
	}
	.equipement > div {
		display: grid;
		grid-template-columns: 7rem minmax(0, 1fr);
		gap: var(--gouttiere);
		padding: calc(var(--ligne) / 2) 0;
		border-bottom: 1px solid var(--reglure);
	}
	dt {
		color: var(--encre-2);
		font: var(--t-libelle);
	}
	dd {
		overflow-wrap: anywhere;
	}
	.categorie {
		padding: var(--ligne) 0;
		color: var(--encre-2);
	}
	.objets li {
		display: flex;
		justify-content: space-between;
		gap: var(--gouttiere);
		padding: calc(var(--ligne) / 2) 0;
		border-bottom: 1px solid var(--reglure);
	}
	.objets strong {
		font-weight: 500;
	}
	.objets li > span:first-child {
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.description {
		display: block;
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.palier {
		padding: var(--ligne) 0;
		border-bottom: 1px solid var(--reglure);
	}
	.palier header {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: var(--gouttiere);
	}
	.palier h3 {
		font: var(--t-corps);
		margin: calc(var(--ligne) / 2) 0;
	}
	.palier p {
		overflow-wrap: anywhere;
	}
	.palier.suivant {
		color: var(--encre-grise);
	}
	.variation {
		display: block;
		font: var(--t-libelle);
	}
	.recit {
		display: inline-flex;
		align-items: center;
		min-height: var(--cible);
		font: var(--t-libelle);
		color: var(--encre-humide);
	}
	.consequences :global(.consequence) {
		grid-template-columns: minmax(0, 1fr);
		gap: calc(var(--ligne) / 2);
		padding: var(--ligne) 0;
	}
	.consequences :global(.qui) {
		justify-content: flex-start;
	}
	.consequences :global(.quoi) {
		overflow-wrap: anywhere;
	}
	.consequences :global(.tampon),
	.retour :global(.tampon),
	.signature-fait :global(.tampon) {
		max-width: calc(100% - var(--gouttiere));
		white-space: normal;
		overflow-wrap: anywhere;
	}
	.consequences :global(.motif) {
		overflow-wrap: anywhere;
	}
	.introduction {
		padding: var(--ligne) 0;
		color: var(--encre-2);
		font: var(--t-libelle);
	}
	.faits > li {
		padding: var(--ligne) 0;
		border-bottom: 1px solid var(--reglure);
	}
	.texte-fait {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		padding: calc(var(--ligne) / 2) 0;
	}
	.rayee .texte-fait {
		text-decoration: line-through;
		color: var(--encre-grise);
	}
	.signature-fait {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gouttiere);
		align-items: center;
		padding: calc(var(--ligne) / 2) 0;
	}
	.aide {
		font: var(--t-libelle);
		color: var(--encre-2);
		overflow-wrap: anywhere;
	}
	.pagination {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		padding-top: var(--ligne);
	}
	.sensible {
		border-top: 3px double var(--reglure);
		margin-top: calc(var(--ligne) * 2);
	}
	.retour {
		overflow-wrap: anywhere;
	}
	.retour :global(.note) {
		flex-wrap: wrap;
	}
	.dernier-tampon {
		display: flex;
		flex-wrap: wrap;
		gap: calc(var(--ligne) / 2) var(--gouttiere);
		font: var(--t-libelle);
	}
	.dernier-tampon > span {
		width: 100%;
	}
	@media (max-width: 760px) {
		.sommaire ul {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 0 var(--gouttiere);
		}
		.sommaire a {
			font-size: 12px;
			gap: 4px;
		}
		.numero {
			min-width: 20px;
		}
		.filtres-marge {
			margin: 0;
			padding: 0;
			border: 0;
		}
		.filtres-marge .repere {
			display: none;
		}
		.identite {
			gap: var(--gouttiere);
		}
		.ressource {
			grid-template-columns: 2rem minmax(0, 1fr);
		}
		.ressource > span:last-child {
			display: none;
		}
	}
</style>
