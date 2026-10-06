<script lang="ts">
	import { SvelteDate } from 'svelte/reactivity';
	// /table/combat/[id] — la Table vue par le MJ (03-vision §5.8, §6 moments 3 et 7, P5, P7).
	// L'état du combat vit côté client (TableMJ, fonctions PURES du moteur). Chaque « Sauvegarder » et
	// chaque clôture de round envoient l'état complet à ?/sauver (JSON + expectedRevision) ; le relevé ne
	// change qu'à la réponse ; un échec garde tout à l'écran et passe le relevé en rouille ; un conflit
	// porte la phrase officielle, les différences, « Reprendre leur version » / « Garder la mienne ».
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { beforeNavigate, invalidateAll } from '$app/navigation';
	import type { SubmitFunction } from '@sveltejs/kit';
	import Bouton from '$lib/ui/Bouton.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import Sommaire from '$lib/ui/table/Sommaire.svelte';
	import Combattant from '$lib/ui/table/Combattant.svelte';
	import Declarations from '$lib/ui/table/Declarations.svelte';
	import Resolution from '$lib/ui/table/Resolution.svelte';
	import Marge from '$lib/ui/table/Marge.svelte';
	import Consequences, { type Archive } from '$lib/ui/table/Consequences.svelte';
	import { TableMJ, type RaisonSauvegarde } from '$lib/ui/table/table.svelte';
	import { exportDiscord, ko } from '$lib/ui/table/texte';
	import {
		PHRASE_ATTENTE,
		PHRASE_CONFLIT,
		PHRASE_FERME,
		PHRASE_REFUS
	} from '$lib/ui/ecriture.svelte';
	import { heure } from '$lib/ui/dates';
	import Preparer from './Preparer.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// La Table est construite une fois : les rechargements de données (déclarations des joueurs) ne
	// remplacent jamais l'état tenu à l'écran ; seul « Reprendre leur version » le fait.
	const table = untrack(
		() => new TableMJ(data.table.state, data.table.revision, data.table.row.savedAt, data.pseudo)
	);
	let chiffres = $state(untrack(() => data.table.row.showEnemyNumbers));

	const etat = $derived(table.etat);
	const combattants = $derived(etat.fighters);
	const nbKo = $derived(combattants.filter(ko).length);
	const compte = $derived(table.compteDeclares);
	const fini = $derived(table.termine);
	const initiative = $derived(etat.initiative ?? combattants[0]?.id ?? null);
	const nomInitiative = $derived(combattants.find((f) => f.id === initiative)?.name ?? '');

	/** Ligne d'état factuelle : « 6 combattants · 2 KO · Round 3 · 4/6 déclarés ». */
	const ligneEtat = $derived.by(() => {
		const n = combattants.length;
		const parts = [n ? `${n} combattant${n > 1 ? 's' : ''}` : 'aucun combattant'];
		if (nbKo) parts.push(`${nbKo} KO`);
		if (!table.demarre) parts.push('avant démarrage');
		else if (fini) parts.push(`Round ${table.revue ?? Math.max(1, etat.round - 1)} · combat fini`);
		else if (table.revue !== null) parts.push(`Round ${table.revue} · résolu`);
		else parts.push(`Round ${etat.round}`, `${compte.faits}/${compte.vivants} déclarés`);
		return parts.join(' · ');
	});

	// ── Nom éditable ─────────────────────────────────────────────────────────────────────────────
	let nom = $state(untrack(() => data.table.state.name));
	$effect(() => {
		// « Reprendre leur version » remplace l'état : le nom suit.
		const n = etat.name;
		untrack(() => {
			if (document.activeElement?.id !== 'nom-table') nom = n;
		});
	});

	// ── Sauvegarde ───────────────────────────────────────────────────────────────────────────────
	let formSauver = $state<HTMLFormElement | null>(null);
	let raison = $state<RaisonSauvegarde>('manual');
	let enVol = $state(false);
	let conflit = $state(false);
	let noteSauver = $state<{ ton: 'attente' | 'refus'; texte: string } | null>(null);
	let noteLocale = $state<{ ton: 'fait' | 'info' | 'refus'; texte: string } | null>(null);

	function sauver(r: RaisonSauvegarde = 'manual') {
		raison = r;
		formSauver?.requestSubmit();
	}
	const envoyer: SubmitFunction = ({ formData, cancel }) => {
		if (enVol) {
			cancel();
			return;
		}
		formData.set('state', table.instantane());
		formData.set('expectedRevision', String(table.revision));
		formData.set('reason', raison);
		enVol = true;
		noteSauver = { ton: 'attente', texte: PHRASE_ATTENTE };
		return async ({ result }) => {
			enVol = false;
			if (result.type === 'success' && result.data && 'sauve' in result.data) {
				const s = result.data.sauve as { revision: number; releve: string | null };
				table.sauvee(s.revision, s.releve);
				conflit = false;
				noteSauver = null;
				// Les déclarations des joueurs se relisent ; l'état tenu à l'écran ne bouge pas.
				await invalidateAll();
				return;
			}
			table.refusee(raison);
			if (result.type === 'failure') {
				const d = (result.data ?? {}) as { code?: string; message?: string };
				if (result.status === 409 && d.code === 'VERSION_CONFLICT') {
					conflit = true;
					noteSauver = { ton: 'refus', texte: PHRASE_CONFLIT };
					await invalidateAll();
					return;
				}
				noteSauver = {
					ton: 'refus',
					texte: result.status === 401 ? PHRASE_FERME : (d.message ?? PHRASE_REFUS)
				};
				return;
			}
			noteSauver = { ton: 'refus', texte: PHRASE_REFUS };
		};
	};

	/** Différences entre leur version (relue) et la mienne, champ par champ. */
	const differences = $derived.by(() => {
		if (!conflit) return [];
		const leur = data.table.state;
		const out: { quoi: string; leur: string; mien: string }[] = [];
		if (leur.name !== etat.name) out.push({ quoi: 'Nom', leur: leur.name, mien: etat.name });
		if (leur.round !== etat.round)
			out.push({ quoi: 'Round', leur: String(leur.round), mien: String(etat.round) });
		for (const f of etat.fighters) {
			const l = leur.fighters.find((x) => x.id === f.id);
			if (!l) {
				out.push({ quoi: f.name, leur: 'absent', mien: 'à la Table' });
				continue;
			}
			for (const k of ['pv', 'ep', 'em'] as const)
				if (l[`${k}Cur`] !== f[`${k}Cur`])
					out.push({
						quoi: `${f.name} · ${k.toUpperCase()}`,
						leur: String(l[`${k}Cur`]),
						mien: String(f[`${k}Cur`])
					});
		}
		for (const l of leur.fighters)
			if (!etat.fighters.some((f) => f.id === l.id))
				out.push({ quoi: l.name, leur: 'à la Table', mien: 'absent' });
		return out;
	});
	function reprendreLeur() {
		table.reprendre(data.table.state, data.table.revision, data.table.row.savedAt);
		chiffres = data.table.row.showEnemyNumbers;
		conflit = false;
		noteSauver = null;
	}
	function garderLaMienne() {
		table.revision = data.table.revision;
		conflit = false;
		sauver('manual');
	}

	// ── Gestes de tête ───────────────────────────────────────────────────────────────────────────
	function demarrer() {
		if (table.demarrer()) sauver('auto');
	}
	function resoudre() {
		table.resoudre();
	}
	function clore() {
		const finiAvant = table.termine;
		table.clore();
		sauver('round');
		if (finiAvant) feuilletOuvert = true;
	}
	function annuler() {
		table.annulerRound();
	}
	async function copier() {
		const texte = exportDiscord(etat);
		try {
			await navigator.clipboard.writeText(texte);
			noteLocale = {
				ton: 'fait',
				texte: `Copié · ${heure(new SvelteDate())} — colle-le dans le salon.`
			};
		} catch {
			noteLocale = { ton: 'refus', texte: 'La copie n’a pas pris : ton navigateur la refuse ici.' };
		}
	}

	// ── Chiffres des adversaires ─────────────────────────────────────────────────────────────────
	let chiffresEnVol = $state(false);
	const basculerChiffres: SubmitFunction = ({ formData, cancel }) => {
		if (chiffresEnVol) {
			cancel();
			return;
		}
		formData.set('expectedRevision', String(table.revision));
		formData.set('valeur', chiffres ? 'non' : 'oui');
		chiffresEnVol = true;
		return async ({ result }) => {
			chiffresEnVol = false;
			if (result.type === 'success' && result.data && 'chiffres' in result.data) {
				const c = result.data.chiffres as { revision: number; valeur: boolean };
				// La révision avance ; l'état local non sauvegardé le reste.
				table.revision = c.revision;
				chiffres = c.valeur;
				return;
			}
			const d =
				result.type === 'failure'
					? ((result.data ?? {}) as { code?: string; message?: string })
					: {};
			noteLocale = {
				ton: 'refus',
				texte:
					d.code === 'VERSION_CONFLICT'
						? PHRASE_CONFLIT
						: `Les chiffres restent ${chiffres ? 'montrés' : 'cachés'}. ${d.message ?? ''}`.trim()
			};
		};
	};

	// ── Feuillet et archivage ────────────────────────────────────────────────────────────────────
	let feuilletOuvert = $state(false);
	let archive = $state<Archive | null>(null);

	// ── Combattants : un seul menu ouvert à la fois ──────────────────────────────────────────────
	let ouvert = $state<string | null>(null);
	let vue = $state<'declarations' | 'resolution' | 'journal'>('declarations');
	$effect(() => {
		if (table.revue !== null) vue = 'resolution';
	});

	// Rien n'est perdu : quitter la page avec un état non relevé demande confirmation.
	beforeNavigate((nav) => {
		if (table.nonSauve === null || archive || nav.type === 'form') return;
		// Fermeture ou rechargement : le navigateur pose sa propre question.
		if (nav.type === 'leave') nav.cancel();
		else if (!confirm('L’état de la Table n’est pas relevé. Quitter quand même ?')) nav.cancel();
	});

	const relevé = $derived(table.releve ? `relevé ${heure(table.releve)}` : 'pas encore relevé');
	type Ton = 'fait' | 'info' | 'refus' | 'attente';
	const noteTete: { ton: Ton; texte: string } | null = $derived(
		noteSauver ?? table.note ?? noteLocale
	);
</script>

<svelte:head><title>{etat.name || 'La Table'} — La Table — Nuages Polaires</title></svelte:head>

<article class="table-mj" class:archivee={!!archive}>
	<header class="tete">
		<div class="haut">
			<p class="repere">NP / 06 — La Table · combat</p>
			<div class="sommaire"><Sommaire /></div>
		</div>

		<div class="identite">
			<label class="sr-only" for="nom-table">Nom du combat</label>
			<input
				id="nom-table"
				class="nom"
				bind:value={nom}
				maxlength={200}
				onblur={() => table.renommer(nom)}
				onkeydown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
				disabled={!!archive}
			/>
			<p class="etat chiffres" aria-live="polite">
				<span>{ligneEtat}</span>
				<span class="releve" class:retard={table.echec}>
					{relevé}{#if table.nonSauve !== null}&nbsp;·&nbsp;non sauvegardé depuis {heure(
							table.nonSauve
						)}{/if}
				</span>
				{#if table.echec && !conflit}
					<button
						type="button"
						class="reessayer"
						onclick={() => sauver(table.raisonEnAttente)}
						disabled={enVol}>Réessayer</button
					>
				{/if}
			</p>
		</div>

		<div class="gestes">
			{#if archive}
				<Bouton variante="texte" href="/table/archives/{archive.id}" fleche="→"
					>Lire le récit</Bouton
				>
			{:else if !table.demarre}
				<Bouton variante="ruban" onclick={demarrer} disabled={!combattants.length}>Démarrer</Bouton>
				{#if nomInitiative}<span class="initiative">Initiative : {nomInitiative}</span>{/if}
			{:else if table.revue !== null}
				<Bouton variante="ruban" onclick={clore} disabled={enVol}>Clore le round</Bouton>
				<Bouton variante="trait" onclick={annuler}>Annuler le round</Bouton>
			{:else if fini}
				<Bouton variante="ruban" onclick={() => (feuilletOuvert = true)}>Terminer le combat</Bouton>
				{#if table.peutAnnulerRound}<Bouton variante="trait" onclick={annuler}
						>Annuler le round</Bouton
					>{/if}
			{:else}
				<Bouton
					variante="ruban"
					onclick={resoudre}
					disabled={!table.peutResoudre}
					aria-describedby="etat-declarations">Résoudre le round</Bouton
				>
				{#if table.peutAnnulerRound}<Bouton variante="trait" onclick={annuler}
						>Annuler le round</Bouton
					>{/if}
			{/if}
			{#if !archive}
				<Bouton variante="trait" onclick={() => sauver('manual')} disabled={enVol}
					>Sauvegarder</Bouton
				>
				{#if table.demarre && !fini}
					<Bouton variante="trait" onclick={() => (feuilletOuvert = true)}
						>Terminer le combat</Bouton
					>
				{/if}
			{/if}
			<Bouton variante="texte" onclick={copier}>Copier pour Discord</Bouton>
			{#if !archive}
				<form
					method="POST"
					action="?/montrerChiffres"
					class="interrupteur"
					use:enhance={basculerChiffres}
				>
					<button type="submit" role="switch" aria-checked={chiffres} disabled={chiffresEnVol}>
						<span class="piste" aria-hidden="true"><span class="curseur"></span></span>
						Montrer les chiffres des adversaires
					</button>
				</form>
			{/if}
		</div>
		<p id="etat-declarations" class="sr-only">
			{compte.faits} sur {compte.vivants} combattants ont déclaré.
		</p>

		{#if conflit}
			<div class="conflit" role="alert">
				<p class="phrase">{PHRASE_CONFLIT}</p>
				{#if differences.length}
					<table>
						<thead
							><tr
								><th scope="col">Champ</th><th scope="col">Leur version</th><th scope="col"
									>La mienne</th
								></tr
							></thead
						>
						<tbody>
							{#each differences.slice(0, 12) as d, i (i)}
								<tr
									><th scope="row">{d.quoi}</th><td class="chiffres">{d.leur}</td><td
										class="chiffres">{d.mien}</td
									></tr
								>
							{/each}
						</tbody>
					</table>
				{:else}
					<p class="detail">Les chiffres sont les mêmes ; seul l’ordre ou le journal diffère.</p>
				{/if}
				<div class="choix">
					<Bouton variante="trait" onclick={reprendreLeur}>Reprendre leur version</Bouton>
					<Bouton variante="rouille" onclick={garderLaMienne}>Garder la mienne</Bouton>
				</div>
			</div>
		{:else if noteTete}
			<div class="note" aria-live="polite">
				<NoteDeMarge ton={noteTete.ton}>{noteTete.texte}</NoteDeMarge>
			</div>
		{/if}
	</header>

	<form bind:this={formSauver} method="POST" action="?/sauver" use:enhance={envoyer} hidden>
		<input type="hidden" name="state" value="" />
		<input type="hidden" name="expectedRevision" value={table.revision} />
		<input type="hidden" name="reason" value={raison} />
	</form>

	<div class="colonnes">
		<section class="combattants" aria-labelledby="titre-combattants">
			<h2 id="titre-combattants" class="colonne">Combattants</h2>
			{#if combattants.length}
				<div class="entetes" aria-hidden="true">
					<span>Nom</span><span class="d">PV</span><span class="d">EP</span><span class="d">EM</span
					><span>Déclaré</span><span></span>
				</div>
				<ul>
					{#each table.demarre ? etat.order
								.map((id) => combattants.find((f) => f.id === id))
								.filter((f) => f !== undefined) : combattants as f (f.id)}
						<Combattant
							{table}
							{f}
							ouvert={ouvert === f.id}
							basculer={() => (ouvert = ouvert === f.id ? null : f.id)}
							declare={!fini && table.declarant === f.id}
							initiative={initiative === f.id}
						/>
					{/each}
				</ul>
			{:else}
				<Vide>Aucun combattant. Coche des Élèves du Serment et des Adversaires pour commencer.</Vide
				>
			{/if}
		</section>

		{#if !table.demarre}
			<section class="centre" aria-labelledby="titre-preparer">
				<h2 id="titre-preparer" class="colonne"><span class="num">01</span> Avant démarrage</h2>
				<Preparer
					{table}
					personnages={data.candidats.personnages}
					creatures={data.candidats.creatures}
				/>
			</section>
		{:else}
			<div class="centre">
				<div class="vues" role="tablist" aria-label="Partie de la Table">
					<button
						type="button"
						role="tab"
						aria-selected={vue === 'declarations'}
						aria-controls="vue-declarations"
						onclick={() => (vue = 'declarations')}>Déclarations</button
					>
					<button
						type="button"
						role="tab"
						aria-selected={vue === 'resolution'}
						aria-controls="vue-resolution"
						onclick={() => (vue = 'resolution')}>Résolution</button
					>
					<button
						type="button"
						role="tab"
						aria-selected={vue === 'journal'}
						aria-controls="vue-journal"
						onclick={() => (vue = 'journal')}>Journal</button
					>
				</div>
				<section
					id="vue-declarations"
					class="vue"
					class:actif={vue === 'declarations'}
					aria-labelledby="titre-declarations"
				>
					<h2 id="titre-declarations" class="colonne"><span class="num">01</span> Déclarations</h2>
					{#if fini && table.revue === null}
						<Vide>
							Le combat est fini : un camp est tombé.
							{#snippet action()}
								<Bouton variante="texte" onclick={() => (feuilletOuvert = true)} fleche="→"
									>Ouvrir les Conséquences</Bouton
								>
							{/snippet}
						</Vide>
					{:else if table.revue !== null}
						<p class="attente">
							Le round {table.revue} est résolu. Relis la résolution, rature si besoin, puis clos le round.
						</p>
					{:else}
						<Declarations {table} propositions={data.declarations} />
					{/if}
				</section>
				<section
					id="vue-resolution"
					class="vue"
					class:actif={vue === 'resolution'}
					aria-labelledby="titre-resolution"
				>
					<h2 id="titre-resolution" class="colonne"><span class="num">02</span> Résolution</h2>
					<Resolution {table} />
				</section>
			</div>
		{/if}

		<aside
			id="vue-journal"
			class="droite"
			class:actif={vue === 'journal' || !table.demarre}
			aria-label="Journal, règle et notes"
		>
			<Marge {table} />
		</aside>
	</div>
</article>

<Consequences
	{table}
	fiches={data.fiches}
	role={data.compte?.role ?? 'mj'}
	pseudo={data.pseudo}
	ouvert={feuilletOuvert}
	fermer={() => (feuilletOuvert = false)}
	releveSansCloture={(r, rel) => table.sauvee(r, rel)}
	{archive}
	archiver={(a) => {
		archive = a;
		table.nonSauve = null;
	}}
/>

<style>
	.table-mj {
		--colonnes-combattants: minmax(0, 1fr) 52px 52px 52px 64px 44px;
		width: 100%;
		max-width: var(--page-max);
		margin: 0 auto;
		padding: 12px var(--ligne) calc(var(--ligne) * 2);
		background: var(--page);
		border: 1px solid var(--reglure);
		box-shadow: var(--ombre-page);
	}
	.tete {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 8px;
		padding-bottom: 12px;
		border-bottom: 1px solid var(--reglure);
	}
	.tete > :not(.haut):not(.identite) {
		grid-column: 1 / -1;
	}
	.haut {
		grid-column: 2;
		grid-row: 1;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0 32px;
		/* Le coin haut droit reste à l'onglet du cahier (Enveloppe). */
		padding-right: 160px;
	}
	.repere {
		font: var(--t-repere);
		font-variant-numeric: lining-nums tabular-nums;
		letter-spacing: var(--approche-repere);
		text-transform: uppercase;
		color: var(--encre-2);
	}
	.sommaire :global(ul) {
		margin-left: 0;
	}
	.identite {
		grid-column: 1;
		grid-row: 1;
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0 24px;
	}
	.nom {
		flex: 0 1 auto;
		width: min(100%, 22ch);
		min-height: 48px;
		padding: 0;
		border: 0;
		border-bottom: 1px solid transparent;
		background: transparent;
		font: 500 32px/48px var(--voix);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
	}
	.nom:hover,
	.nom:focus {
		border-bottom-color: color-mix(in srgb, var(--encre) 28%, transparent);
	}
	.etat {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0 16px;
		font: 500 14px/24px var(--corps);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
	}
	.releve {
		color: var(--encre-2);
	}
	.releve.retard {
		color: var(--rouille);
	}
	.reessayer {
		min-height: 44px;
		padding: 0 8px;
		border: 0;
		background: none;
		font: 600 14px/24px var(--corps);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--rouille);
		text-decoration: underline;
		text-underline-offset: 4px;
	}
	.gestes {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 12px;
	}
	.initiative {
		font: 500 14px/24px var(--corps);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}
	.interrupteur {
		margin-left: auto;
	}
	.interrupteur button {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		min-height: 44px;
		padding: 0 4px;
		border: 0;
		background: none;
		font: 500 13px/20px var(--corps);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}
	.piste {
		position: relative;
		width: 32px;
		height: 16px;
		border: 1px solid color-mix(in srgb, var(--encre) 40%, transparent);
		border-radius: 8px;
	}
	.curseur {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--encre-2);
		transition: transform 120ms ease-out;
	}
	[aria-checked='true'] .piste {
		border-color: var(--encre-humide);
	}
	[aria-checked='true'] .curseur {
		transform: translateX(16px);
		background: var(--encre-humide);
	}
	[aria-checked='true'] {
		color: var(--encre);
	}
	.conflit {
		display: grid;
		gap: 12px;
		padding: 12px 16px;
		border-left: 2px solid var(--rouille);
		background: var(--page-2);
	}
	.phrase {
		font: 600 14px/24px var(--corps);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
	}
	.conflit table {
		border-collapse: collapse;
		font: 500 13px/24px var(--corps);
		font-variant-numeric: lining-nums tabular-nums;
	}
	.conflit th,
	.conflit td {
		padding: 0 16px 0 0;
		text-align: left;
		border-bottom: 1px solid var(--reglure);
	}
	.conflit thead th {
		font: var(--t-repere);
		font-variant-numeric: lining-nums tabular-nums;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--encre-2);
	}
	.choix {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 12px;
	}
	.detail {
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}
	.note :global(*) {
		margin: 0;
	}

	.colonnes {
		display: grid;
		grid-template-columns: minmax(0, 6fr) minmax(0, 4.6fr) minmax(0, 2.2fr);
		gap: 0 24px;
		padding-top: 12px;
	}
	.colonne {
		display: flex;
		align-items: baseline;
		gap: 10px;
		font: 600 13px/48px var(--corps);
		font-variant-numeric: lining-nums tabular-nums;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--encre);
		border-bottom: 1px solid var(--reglure);
	}
	.num {
		font: var(--t-repere);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}
	.entetes {
		display: grid;
		grid-template-columns: var(--colonnes-combattants);
		gap: 0 12px;
		padding-left: 12px;
		font: var(--t-repere);
		font-variant-numeric: lining-nums tabular-nums;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		line-height: 24px;
		color: var(--encre-grise);
		border-bottom: 1px solid var(--reglure);
	}
	.entetes .d {
		text-align: right;
	}
	.vues {
		display: none;
	}
	.vue + .vue {
		margin-top: 24px;
	}
	.attente {
		padding: 12px 0;
		font: var(--t-corps);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}
	.archivee .colonnes {
		opacity: 0.72;
		pointer-events: none;
	}

	@media (min-width: 1100px) {
		.table-mj {
			display: flex;
			flex-direction: column;
			height: calc(100svh - 96px);
			padding-bottom: 24px;
		}
		.colonnes {
			flex: 1 1 0;
			height: auto;
			min-height: 0;
		}
		.combattants,
		.centre,
		.droite {
			overflow-y: auto;
			min-height: 0;
		}
	}
	@media (max-width: 1099px) {
		.colonnes {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		}
		.droite {
			grid-column: 1 / -1;
			margin-top: 24px;
		}
	}
	@media (max-width: 760px) {
		.table-mj {
			padding: 0 var(--gouttiere) calc(var(--ligne) * 3);
			border-inline: 0;
			box-shadow: none;
		}
		/* Téléphone : seule la bande d'état (nom, ligne d'état, relevé) reste ancrée en haut. */
		.tete {
			display: contents;
		}
		.identite {
			position: sticky;
			top: 0;
			z-index: 1;
			padding: 8px 104px 4px 0;
			background: var(--page);
			border-bottom: 1px solid var(--reglure);
		}
		.gestes {
			padding: 12px 0;
		}
		.haut {
			display: grid;
			grid-template-columns: minmax(0, 1fr);
			padding-right: 0;
		}
		.haut .repere {
			min-height: 56px;
			padding-right: 104px;
		}
		.nom {
			width: 100%;
			font-size: 24px;
			line-height: 32px;
			min-height: 44px;
		}
		.etat {
			gap: 0 12px;
		}
		.gestes {
			gap: 4px 8px;
		}
		.interrupteur {
			margin-left: 0;
		}
		.colonnes {
			grid-template-columns: minmax(0, 1fr);
		}
		.entetes {
			display: none;
		}
		.centre {
			margin-top: 24px;
		}
		.vues {
			display: flex;
			gap: 4px;
			border-bottom: 1px solid var(--reglure);
		}
		.vues button {
			flex: 1 1 0;
			min-height: 44px;
			border: 0;
			border-bottom: 2px solid transparent;
			background: none;
			font: 600 14px/24px var(--corps);
			font-variant-numeric: lining-nums tabular-nums;
			color: var(--encre-2);
		}
		.vues button[aria-selected='true'] {
			color: var(--encre);
			border-bottom-color: var(--encre-humide);
		}
		.vue {
			display: none;
		}
		.vue.actif {
			display: block;
		}
		.vue + .vue {
			margin-top: 0;
		}
		.droite {
			display: none;
			margin-top: 12px;
		}
		.droite.actif {
			display: block;
		}
		.colonne {
			line-height: 40px;
		}
	}
</style>
