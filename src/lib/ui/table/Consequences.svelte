<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	// Le feuillet « Conséquences » — la seule modale du carnet (03-vision §3, §5.8, P7).
	// Par personnage : PV / EP / EM (ancienne → nouvelle), statuts recopiés, XP proposée
	// (ceil(niveau de la créature × 10 × participation %), participation réglable), drops, motif ;
	// « Tamponner » par ligne (touche Entrée) et « Tamponner tout » (confirmation par bouton).
	// Puis l'archivage : titre du récit, « Publier un extrait » (2 à 4 lignes ; accueil, page de chaque
	// créature présente), « Lisible par ses participants ». La clôture est UNE transaction serveur
	// (closeTable) : un tampon posé ici est une décision en attente, en encre humide ; il ne s'imprime
	// en laiton, daté, qu'à la réponse — « Archivé · 21:52 » n'apparaît qu'après elle.
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import Bouton from '$lib/ui/Bouton.svelte';
	import Rature from '$lib/ui/Rature.svelte';
	import Tampon from '$lib/ui/Tampon.svelte';
	import Losange from '$lib/ui/Losange.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import Encre from '$lib/ui/Encre.svelte';
	import {
		PHRASE_ATTENTE,
		PHRASE_CONFLIT,
		PHRASE_FERME,
		PHRASE_REFUS
	} from '$lib/ui/ecriture.svelte';
	import { signature, phraseTampon } from '$lib/ui/tampons';
	import type { CombatOutcome } from '$lib/game/combat/types';
	import type { TableMJ } from './table.svelte';
	import { ko, statut } from './texte';

	export type FicheConsequence = {
		id: string;
		nom: string;
		niveau: number;
		xp: number;
		pv: { cur: number; max: number };
		ep: { cur: number; max: number };
		em: { cur: number; max: number };
		statuts: string[];
	};
	export type Archive = { id: string; at: string; titre: string };

	interface Props {
		table: TableMJ;
		fiches: FicheConsequence[];
		pseudo: string;
		role?: string;
		ouvert: boolean;
		fermer: () => void;
		/** La clôture a relevé l'état final avant d'être refusée : la page garde la nouvelle révision. */
		releveSansCloture: (revision: number, releve: string | null) => void;
		archive: Archive | null;
		archiver: (a: Archive) => void;
	}
	let {
		table,
		fiches,
		pseudo,
		role = 'mj',
		ouvert,
		fermer,
		releveSansCloture,
		archive,
		archiver
	}: Props = $props();

	let dialogue = $state<HTMLDialogElement | null>(null);
	$effect(() => {
		if (!dialogue) return;
		if (ouvert && !dialogue.open) dialogue.showModal();
		if (!ouvert && dialogue.open) dialogue.close();
	});

	// ── Lignes par personnage ────────────────────────────────────────────────────────────────────
	let participation = $state<Record<string, number>>({});
	let motifs = $state<Record<string, string>>({});
	let tamponnees = $state<string[]>([]);
	const propositions: CombatOutcome[] = $derived(table.propositions(participation));
	const fiche = (id: string) => fiches.find((f) => f.id === id);
	const motifDe = (id: string) => motifs[id] ?? `combat archivé · ${table.etat.name}`;
	const toutes = $derived(
		propositions.length > 0 && propositions.every((o) => tamponnees.includes(o.characterId))
	);

	function tamponner(e: SubmitEvent, id: string) {
		e.preventDefault();
		if (!motifDe(id).trim() || archive || !dropsPrets) return;
		tamponnees = [...new Set([...tamponnees, id])];
		// Entrée enchaîne : le focus passe au motif de la ligne suivante.
		const suivante = propositions.find((o) => !tamponnees.includes(o.characterId));
		queueMicrotask(() => {
			const cible = suivante
				? dialogue?.querySelector<HTMLElement>(`#motif-${CSS.escape(suivante.characterId)}`)
				: dialogue?.querySelector<HTMLElement>('#titre-recit');
			cible?.focus();
		});
	}
	function reprendreLigne(id: string) {
		tamponnees = tamponnees.filter((x) => x !== id);
	}
	let confirmerTout = $state(false);
	function tamponnerTout() {
		if (!dropsPrets) return;
		tamponnees = propositions
			.filter((o) => motifDe(o.characterId).trim())
			.map((o) => o.characterId);
		confirmerTout = false;
	}

	// ── Drops en attente (D100 puis gemme attribuée) ─────────────────────────────────────────────
	const adversairesKo = $derived(
		table.etat.fighters.filter((f) => f.type === 'beast' && ko(f) && f.gem)
	);
	const dropsPrets = $derived(
		adversairesKo.every((b) => {
			const d = table.etat.drops.find((drop) => drop.fighterId === b.id);
			return !!d && d.roll !== null && (d.gem === 'Aucune' || !!d.assignedTo);
		})
	);
	const aLancer = $derived(
		adversairesKo.find(
			(b) => !table.etat.drops.some((d) => d.fighterId === b.id && d.roll !== null)
		)
	);
	const dropDe = (fighterId: string) => table.etat.drops.find((d) => d.fighterId === fighterId);
	let attributions = $state<Record<string, string>>({});

	// ── Archivage ────────────────────────────────────────────────────────────────────────────────
	let titre = $state('');
	let titreInitial = false;
	$effect(() => {
		if (!titreInitial && table.etat.name) {
			titre = table.etat.name;
			titreInitial = true;
		}
	});
	let publier = $state(false);
	let extrait = $state('');
	let accueil = $state(true);
	let lisible = $state(true);
	const creaturesPresentes = $derived(
		[
			...new SvelteMap(
				table.etat.fighters
					.filter((f) => f.type === 'beast' && f.beastId)
					.map((f) => [f.beastId!, f.baseName || f.name])
			).entries()
		].map(([id, nom]) => ({ id, nom }))
	);
	let creatures = $state<string[]>([]);
	let creaturesInitiales = false;
	$effect(() => {
		if (!creaturesInitiales && creaturesPresentes.length) {
			creatures = creaturesPresentes.map((c) => c.id);
			creaturesInitiales = true;
		}
	});
	const lignesExtrait = $derived(extrait.split(/\r?\n/).filter((l) => l.trim()).length);
	const extraitValide = $derived(
		!publier || (lignesExtrait >= 2 && lignesExtrait <= 4 && !/\n\s*\n/.test(extrait.trim()))
	);
	const peutArchiver = $derived(
		dropsPrets && toutes && titre.trim().length > 0 && extraitValide && !archive
	);

	const consequences = $derived(
		propositions.map((o) => ({
			characterId: o.characterId,
			pv: o.pvCur,
			ep: o.epCur,
			em: o.emCur,
			statuses: o.statuses,
			xp: o.xpGain,
			drops: o.drops.map((d) => ({
				name: d.gem,
				beastName: d.beastName,
				qty: 1,
				category: 'Gemme'
			})),
			motif: motifDe(o.characterId).trim()
		}))
	);

	let enCours = $state(false);
	let note = $state<{ ton: 'attente' | 'refus'; texte: string } | null>(null);
	const envoyer: SubmitFunction = ({ formData, cancel }) => {
		if (enCours || !peutArchiver) {
			cancel();
			return;
		}
		formData.set('state', table.instantane());
		formData.set('expectedRevision', String(table.revision));
		formData.set('consequences', JSON.stringify(consequences));
		enCours = true;
		note = { ton: 'attente', texte: PHRASE_ATTENTE };
		return async ({ result }) => {
			enCours = false;
			if (result.type === 'success' && result.data && 'archive' in result.data) {
				note = null;
				archiver(result.data.archive as Archive);
				return;
			}
			if (result.type === 'failure') {
				const d = (result.data ?? {}) as {
					code?: string;
					message?: string;
					sauve?: { revision: number; releve: string | null };
				};
				if (d.sauve) releveSansCloture(d.sauve.revision, d.sauve.releve);
				note = {
					ton: 'refus',
					texte:
						result.status === 409 && d.code === 'VERSION_CONFLICT'
							? PHRASE_CONFLIT
							: result.status === 401
								? PHRASE_FERME
								: `Rien n’est archivé. ${d.message ?? PHRASE_REFUS}`
				};
				return;
			}
			note = { ton: 'refus', texte: `Rien n’est archivé. ${PHRASE_REFUS}` };
		};
	};
</script>

<dialog
	bind:this={dialogue}
	class="feuillet"
	aria-labelledby="titre-consequences"
	oncancel={(e) => {
		e.preventDefault();
		if (!enCours) fermer();
	}}
>
	<header class="tete">
		<p class="repere">Feuillet · {table.etat.name}</p>
		<h2 id="titre-consequences">Conséquences</h2>
		{#if archive}
			<p class="archive" aria-live="polite">
				<span>Archivé</span>
				<Tampon cle={archive.id}>{signature(role, pseudo, archive.at)}</Tampon>
			</p>
		{/if}
		<button
			type="button"
			class="fermer"
			onclick={fermer}
			disabled={enCours}
			aria-label="Refermer le feuillet">Refermer</button
		>
	</header>

	{#if adversairesKo.length && !archive}
		<section class="drops" aria-labelledby="titre-drops">
			{#if !dropsPrets}<NoteDeMarge
					>{aLancer
						? 'Lance le D100 de ' + aLancer.name + ' avant de tamponner.'
						: 'Attribue chaque gemme avant de tamponner.'}</NoteDeMarge
				>{/if}
			<h3 id="titre-drops" class="chapitre"><span class="num">01</span> Drops en attente</h3>
			<ul>
				{#each adversairesKo as b (b.id)}
					{@const d = dropDe(b.id)}
					<li>
						<span class="qui">{b.name}</span>
						{#if !d || d.roll === null}
							<span class="detail">D100 à lancer</span>
							<button type="button" class="geste" onclick={() => table.lancerD100(b.id)}
								>Lancer le D100</button
							>
						{:else if d.gem === 'Aucune'}
							<span class="detail chiffres">D100 : {d.roll} · aucune gemme</span>
						{:else if d.assignedTo}
							<span class="detail chiffres">D100 : {d.roll} · {d.gem} → {d.assignedName}</span>
						{:else}
							<span class="detail chiffres">D100 : {d.roll} · {d.gem}</span>
							<span class="attribuer">
								<label class="sr-only" for="drop-{d.id}">Attribuer {d.gem} à</label>
								<select id="drop-{d.id}" bind:value={attributions[d.id]}>
									{#each propositions as o (o.characterId)}<option value={o.characterId}
											>{o.name}</option
										>{/each}
								</select>
								<button
									type="button"
									class="geste"
									onclick={() =>
										table.attribuer(d.id, attributions[d.id] ?? propositions[0]?.characterId ?? '')}
									>Attribuer</button
								>
							</span>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<section aria-labelledby="titre-lignes">
		<h3 id="titre-lignes" class="chapitre">
			<span class="num">{adversairesKo.length && !archive ? '02' : '01'}</span> Par personnage
		</h3>
		{#if propositions.length}
			<ol class="lignes">
				{#each propositions as o (o.characterId)}
					{@const fi = fiche(o.characterId)}
					{@const pose = tamponnees.includes(o.characterId)}
					<li class="ligne" class:pose>
						<form onsubmit={(e) => tamponner(e, o.characterId)}>
							<div class="nom-ligne">
								<span class="nom">{o.name}</span>
								{#if o.ko}<span class="ko">KO</span>{/if}
								{#if fi}<span class="detail">niv. {fi.niveau}</span>{/if}
							</div>
							<p class="ressources chiffres">
								{#each [{ k: 'PV', a: fi?.pv.cur, n: o.pvCur, m: o.pvMax }, { k: 'EP', a: fi?.ep.cur, n: o.epCur, m: o.epMax }, { k: 'EM', a: fi?.em.cur, n: o.emCur, m: o.emMax }] as r (r.k)}
									{#if r.m > 0}
										<span class="res">
											<span class="k">{r.k}</span>
											{#if r.a !== undefined && r.a !== r.n}<Rature
													ancien={r.a}
													nouveau={r.n}
												/><span class="max">/{r.m}</span>{:else}<span class="inchange"
													>{r.n}/{r.m}</span
												>{/if}
										</span>
									{/if}
								{/each}
							</p>
							<p class="statuts">
								{#if o.statuses.length}
									{#each o.statuses as s (s)}
										{@const st = statut(s)}
										<Losange couleur={st.couleur} libelle={st.libelle} />
									{/each}
								{:else}
									<span class="detail">Aucun statut à recopier.</span>
								{/if}
							</p>
							<div class="xp">
								<label>
									<span>Participation</span>
									<span class="pas-a-pas">
										<input
											class="chiffres"
											type="number"
											min="0"
											max="100"
											step="5"
											value={participation[o.characterId] ?? 100}
											disabled={pose || !!archive}
											oninput={(e) =>
												(participation = {
													...participation,
													[o.characterId]: Math.max(
														0,
														Math.min(100, Number(e.currentTarget.value) || 0)
													)
												})}
										/>
										<span class="unite">%</span>
									</span>
								</label>
								<p class="xp-propose chiffres">
									<span class="valeur">+{o.xpGain} XP</span>
									{#if fi}<span class="detail">{fi.xp} → {fi.xp + o.xpGain}</span>{/if}
								</p>
							</div>
							<p class="drops-ligne">
								{#if o.drops.length}
									{#each o.drops as d, j (j)}<span>{d.gem} · Obtenue sur : {d.beastName}</span
										>{/each}
								{:else}
									<span class="detail">Aucun drop.</span>
								{/if}
							</p>
							<div class="signer">
								<label class="motif">
									<span>Motif</span>
									<input
										id="motif-{o.characterId}"
										value={motifDe(o.characterId)}
										oninput={(e) =>
											(motifs = { ...motifs, [o.characterId]: e.currentTarget.value })}
										required
										maxlength={2000}
										disabled={pose || !!archive}
									/>
								</label>
								{#if archive}
									<Tampon cle={archive.id + o.characterId}
										>{phraseTampon(role, pseudo, archive.at, motifDe(o.characterId))}</Tampon
									>
								{:else if pose}
									<span class="en-attente"
										><Encre etat="humide">Tamponnée · s’imprime à l’archivage</Encre></span
									>
									<button type="button" class="geste" onclick={() => reprendreLigne(o.characterId)}
										>Reprendre la ligne</button
									>
								{:else}
									<Bouton
										variante="tampon"
										type="submit"
										disabled={!dropsPrets || !motifDe(o.characterId).trim()}>Tamponner</Bouton
									>
								{/if}
							</div>
						</form>
					</li>
				{/each}
			</ol>
			{#if !archive && !toutes}
				<div class="tout">
					{#if confirmerTout}
						<p>
							Tamponner les {propositions.length - tamponnees.length} lignes restantes avec leur motif
							?
						</p>
						<Bouton variante="tampon" onclick={tamponnerTout} disabled={!dropsPrets}
							>Tamponner tout</Bouton
						>
						<button type="button" class="geste" onclick={() => (confirmerTout = false)}
							>Garder</button
						>
					{:else}
						<Bouton variante="trait" onclick={() => (confirmerTout = true)} disabled={!dropsPrets}
							>Tamponner tout</Bouton
						>
					{/if}
				</div>
			{/if}
		{:else}
			<p class="detail vide">
				Aucun Élève du Serment à cette Table : rien à tamponner sur une fiche.
			</p>
		{/if}
	</section>

	<form
		class="archivage"
		method="POST"
		action="?/terminer"
		use:enhance={envoyer}
		aria-labelledby="titre-archivage"
	>
		<h3 id="titre-archivage" class="chapitre">
			<span class="num">{adversairesKo.length && !archive ? '03' : '02'}</span> Archivage
		</h3>
		<label class="champ">
			<span>Titre du récit</span>
			<input
				id="titre-recit"
				name="titre"
				bind:value={titre}
				required
				maxlength={200}
				disabled={!!archive}
			/>
		</label>
		<label class="case">
			<input
				type="checkbox"
				name="lisible"
				value="oui"
				bind:checked={lisible}
				disabled={!!archive}
			/>
			<span>Lisible par ses participants <span class="detail">· sans les notes du MJ</span></span>
		</label>
		<label class="case">
			<input
				type="checkbox"
				name="publier"
				value="oui"
				bind:checked={publier}
				disabled={!!archive}
			/>
			<span>Publier un extrait</span>
		</label>
		{#if publier}
			<div class="extrait">
				<label class="champ">
					<span>Extrait · deux à quatre lignes, écrites par toi</span>
					<textarea
						name="extrait"
						bind:value={extrait}
						rows="4"
						maxlength={4000}
						disabled={!!archive}></textarea>
				</label>
				<p
					class="detail chiffres"
					class:refus={publier && extrait.trim() && !extraitValide}
					aria-live="polite"
				>
					{lignesExtrait
						? `${lignesExtrait} ligne${lignesExtrait > 1 ? 's' : ''}`
						: 'Va à la ligne entre deux phrases'} · aucun nom de participant sur l’accueil.
				</p>
				<fieldset>
					<legend>Destinations</legend>
					<label class="case">
						<input
							type="checkbox"
							name="accueil"
							value="oui"
							bind:checked={accueil}
							disabled={!!archive}
						/>
						<span>L’accueil</span>
					</label>
					{#each creaturesPresentes as c (c.id)}
						<label class="case">
							<input
								type="checkbox"
								name="creatures"
								value={c.id}
								bind:group={creatures}
								disabled={!!archive}
							/>
							<span>La page de {c.nom}</span>
						</label>
					{/each}
				</fieldset>
			</div>
		{/if}

		<div class="valider">
			{#if archive}
				<Bouton variante="texte" href="/table/archives/{archive.id}" fleche="→"
					>Lire le récit</Bouton
				>
				<Bouton variante="texte" href="/table" fleche="→">Retour aux Tables</Bouton>
			{:else}
				<p class="detail">
					{#if !toutes}Tamponne chaque ligne avant d’archiver.{:else if !extraitValide}L’extrait
						tient en deux à quatre lignes.{:else}Le combat se replie en récit ; les conséquences
						s’impriment sur les fiches.{/if}
				</p>
				<Bouton variante="tampon" type="submit" disabled={!peutArchiver || enCours}
					>Archiver le récit</Bouton
				>
			{/if}
		</div>
		{#if note}
			<div aria-live="polite">
				<NoteDeMarge ton={note.ton}>{note.texte}</NoteDeMarge>
			</div>
		{/if}
	</form>
</dialog>

<style>
	.feuillet {
		width: min(920px, calc(100vw - 32px));
		max-height: calc(100dvh - 48px);
		margin: auto;
		padding: 0 32px 32px;
		overflow-y: auto;
		background: var(--page-2);
		color: var(--encre);
		border: 1px solid var(--reglure);
		border-radius: var(--rayon);
		box-shadow: var(--ombre-feuillet);
	}
	.feuillet::backdrop {
		background: color-mix(in srgb, var(--bureau) 72%, transparent);
	}
	.tete {
		position: sticky;
		top: 0;
		z-index: 1;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: end;
		gap: 0 24px;
		padding: 24px 0 12px;
		background: var(--page-2);
		border-bottom: 1px solid var(--reglure);
	}
	.repere {
		grid-column: 1 / -1;
		font: var(--t-repere);
		letter-spacing: var(--approche-repere);
		text-transform: uppercase;
		color: var(--encre-2);
	}
	h2 {
		font: 500 32px/48px var(--voix);
		color: var(--encre);
	}
	.archive {
		display: flex;
		align-items: center;
		gap: 12px;
		grid-column: 1;
	}
	.fermer {
		grid-column: 2;
		grid-row: 2;
		min-height: 44px;
		padding: 0 12px;
		border: 1px solid color-mix(in srgb, var(--encre) 22%, transparent);
		border-radius: var(--rayon);
		background: none;
		font: 500 14px/24px var(--corps);
		color: var(--encre-2);
	}
	.chapitre {
		display: flex;
		align-items: baseline;
		gap: 12px;
		margin-top: 24px;
		padding-bottom: 0;
		font: 600 14px/48px var(--corps);
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--encre);
		border-bottom: 1px solid var(--reglure);
	}
	.num {
		font: var(--t-repere);
		color: var(--encre-2);
	}
	.drops li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0 16px;
		min-height: 48px;
		border-bottom: 1px solid var(--reglure);
	}
	.qui,
	.nom {
		font: 600 14px/24px var(--corps);
		color: var(--encre);
	}
	.detail {
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.detail.refus {
		color: var(--rouille);
	}
	.attribuer {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin-left: auto;
	}
	.ligne {
		border-bottom: 1px solid var(--reglure);
	}
	.ligne form {
		display: grid;
		grid-template-columns: 180px minmax(0, 1fr) 200px;
		grid-template-areas:
			'nom res xp'
			'statuts statuts xp'
			'drops drops drops'
			'signer signer signer';
		gap: 4px 24px;
		padding: 16px 0;
	}
	.pose form {
		border-left: 2px solid color-mix(in srgb, var(--tampon) 60%, transparent);
		padding-left: 12px;
	}
	.nom-ligne {
		grid-area: nom;
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0 10px;
	}
	.ko {
		font: var(--t-repere);
		letter-spacing: 0.1em;
		color: var(--rouille);
	}
	.ressources {
		grid-area: res;
		display: flex;
		flex-wrap: wrap;
		gap: 0 20px;
		font: 500 14px/24px var(--corps);
	}
	.res {
		white-space: nowrap;
	}
	.k {
		margin-right: 6px;
		font: var(--t-repere);
		letter-spacing: 0.1em;
		color: var(--encre-2);
	}
	.max,
	.inchange {
		color: var(--encre-2);
	}
	.statuts {
		grid-area: statuts;
		display: flex;
		flex-wrap: wrap;
		gap: 0 14px;
		line-height: 24px;
	}
	.xp {
		grid-area: xp;
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 12px;
	}
	.xp-propose {
		display: grid;
		justify-items: end;
		font: 600 14px/24px var(--corps);
	}
	.drops-ligne {
		grid-area: drops;
		display: flex;
		flex-wrap: wrap;
		gap: 0 16px;
		font: 500 14px/24px var(--corps);
	}
	.signer {
		grid-area: signer;
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 8px 16px;
		margin-top: 4px;
	}
	label {
		display: grid;
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.motif {
		flex: 1 1 260px;
	}
	input:not([type='checkbox']),
	select,
	textarea {
		min-height: 44px;
		padding: 8px 0;
		border: 0;
		border-bottom: 1px solid color-mix(in srgb, var(--encre) 28%, transparent);
		border-radius: 0;
		background: transparent;
		font: 500 14px/24px var(--corps);
		color: var(--encre);
	}
	select {
		background: var(--page-2);
	}
	input:disabled,
	textarea:disabled {
		color: var(--encre-2);
	}
	.pas-a-pas {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	.pas-a-pas input {
		width: 64px;
		text-align: right;
	}
	.unite {
		font: 500 14px/24px var(--corps);
		color: var(--encre-2);
	}
	.en-attente {
		font: 500 14px/44px var(--corps);
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
		text-decoration-color: color-mix(in srgb, var(--encre-humide) 45%, transparent);
		text-underline-offset: 4px;
	}
	.geste:hover {
		color: var(--encre);
	}
	.tout {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: flex-end;
		gap: 8px 16px;
		padding: 16px 0 0;
		font: var(--t-corps);
		color: var(--encre-2);
	}
	.vide {
		padding: 16px 0;
	}
	.archivage {
		display: grid;
		gap: 12px;
	}
	.champ {
		max-width: 560px;
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
		accent-color: var(--encre-humide);
	}
	.extrait {
		display: grid;
		gap: 8px;
		padding-left: 32px;
	}
	textarea {
		resize: vertical;
		background: repeating-linear-gradient(
			to bottom,
			transparent 0 calc(var(--ligne) - 1px),
			var(--reglure) calc(var(--ligne) - 1px) var(--ligne)
		);
		padding: 0;
		line-height: 24px;
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
	.valider {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px 24px;
		margin-top: 12px;
		padding-top: 16px;
		border-top: 1px solid var(--reglure);
	}

	@media (max-width: 760px) {
		.feuillet {
			width: 100vw;
			max-width: 100vw;
			max-height: 100dvh;
			height: 100dvh;
			margin: 0;
			padding: 0 16px 24px;
			border: 0;
			border-radius: 0;
		}
		h2 {
			font-size: 28px;
		}
		.ligne form {
			grid-template-columns: minmax(0, 1fr);
			grid-template-areas: 'nom' 'res' 'statuts' 'xp' 'drops' 'signer';
		}
		.attribuer {
			margin-left: 0;
		}
		.extrait {
			padding-left: 0;
		}
		.valider :global(.bouton) {
			width: 100%;
			justify-content: center;
		}
	}
	@media (prefers-reduced-motion: no-preference) {
		.feuillet[open] {
			animation: tourner var(--tourner, 320ms) both;
		}
	}
	@keyframes tourner {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
	}
</style>
