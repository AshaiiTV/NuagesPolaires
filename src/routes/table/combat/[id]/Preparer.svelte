<script lang="ts">
	import { SvelteDate } from 'svelte/reactivity';
	// Avant démarrage : ajouter des « Élèves du Serment » (cases) et des « Adversaires » (quantités).
	// Les fiches et les créatures sont relues côté serveur (?/ajouter) : la page ne fabrique jamais
	// un combattant. Les combattants déjà posés se règlent dans la colonne de gauche (initiative,
	// retrait). 03-vision §5.8 « Avant démarrage ».
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import Bouton from '$lib/ui/Bouton.svelte';
	import Losange from '$lib/ui/Losange.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import { PHRASE_ATTENTE, PHRASE_CONFLIT, PHRASE_REFUS } from '$lib/ui/ecriture.svelte';
	import { heure } from '$lib/ui/dates';
	import type { CombatState } from '$lib/game/combat/types';
	import type { TableMJ } from '$lib/ui/table/table.svelte';

	interface Props {
		table: TableMJ;
		personnages: { id: string; nom: string; serment: string; niveau: number }[];
		creatures: {
			id: string;
			nom: string;
			niveau: number;
			comportement: string | null;
			couleur: string;
		}[];
	}
	let { table, personnages, creatures }: Props = $props();

	const presents = $derived(new Set(table.etat.fighters.map((f) => f.characterId).filter(Boolean)));
	const libres = $derived(personnages.filter((p) => !presents.has(p.id)));
	let choisis = $state<string[]>([]);
	let quantites = $state<Record<string, number>>({});
	let filtre = $state('');
	const visibles = $derived(
		filtre.trim()
			? creatures.filter((c) => c.nom.toLowerCase().includes(filtre.trim().toLowerCase()))
			: creatures
	);
	const total = $derived(
		choisis.length + Object.values(quantites).reduce((n, q) => n + (q > 0 ? q : 0), 0)
	);
	function changer(id: string, delta: number) {
		quantites = { ...quantites, [id]: Math.max(0, Math.min(30, (quantites[id] ?? 0) + delta)) };
	}

	let enCours = $state(false);
	let note = $state<{ ton: 'attente' | 'fait' | 'refus'; texte: string } | null>(null);
	const ajouter: SubmitFunction = ({ formData, cancel }) => {
		if (enCours || total === 0) {
			cancel();
			return;
		}
		formData.set('state', table.instantane());
		formData.set('expectedRevision', String(table.revision));
		enCours = true;
		note = { ton: 'attente', texte: PHRASE_ATTENTE };
		return async ({ result }) => {
			enCours = false;
			if (result.type === 'success' && result.data && 'ajoute' in result.data) {
				const a = result.data.ajoute as {
					state: CombatState;
					revision: number;
					releve: string | null;
				};
				table.remplacer(a.state, a.revision, a.releve);
				choisis = [];
				quantites = {};
				note = { ton: 'fait', texte: `Ajoutés · ${heure(new SvelteDate())} — l’encre a pris.` };
				return;
			}
			if (result.type === 'failure') {
				const d = (result.data ?? {}) as { code?: string; message?: string };
				note = {
					ton: 'refus',
					texte:
						result.status === 409 && d.code === 'VERSION_CONFLICT'
							? PHRASE_CONFLIT
							: `Personne n’a été ajouté. ${d.message ?? ''}`.trim()
				};
				return;
			}
			note = { ton: 'refus', texte: PHRASE_REFUS };
		};
	};
</script>

<form method="POST" action="?/ajouter" class="preparer" use:enhance={ajouter}>
	<fieldset>
		<legend>Élèves du Serment</legend>
		{#if libres.length}
			<ul class="cases">
				{#each libres as p (p.id)}
					<li>
						<label>
							<input type="checkbox" name="personnages" value={p.id} bind:group={choisis} />
							<span class="nom">{p.nom}</span>
							<span class="detail">{p.serment} · niv. {p.niveau}</span>
						</label>
					</li>
				{/each}
			</ul>
		{:else if personnages.length || table.etat.fighters.some((f) => f.type === 'player' && !f.isSummon)}
			<Vide>Tous les personnages sont déjà à cette Table.</Vide>
		{:else}
			<Vide>Aucun personnage. Le premier s’écrit dans Personnages.</Vide>
		{/if}
	</fieldset>

	<fieldset>
		<legend>Adversaires</legend>
		{#if creatures.length > 6}
			<label class="filtre">
				<span class="sr-only">Chercher une créature</span>
				<input
					type="search"
					bind:value={filtre}
					placeholder="Chercher une créature…"
					autocomplete="off"
				/>
			</label>
		{/if}
		{#if visibles.length}
			<ul class="cases">
				{#each visibles as c (c.id)}
					{@const q = quantites[c.id] ?? 0}
					<li class="creature" class:pris={q > 0}>
						<span class="qui">
							<span class="nom">{c.nom}</span>
							<span class="detail"
								>niv. {c.niveau}{#if c.comportement}<Losange
										couleur={c.couleur}
										libelle={c.comportement}
									/>{/if}</span
							>
						</span>
						<span class="quantite">
							<button
								type="button"
								class="pas"
								onclick={() => changer(c.id, -1)}
								disabled={q === 0}
								aria-label="Un {c.nom} de moins">−</button
							>
							<input
								class="chiffres"
								type="number"
								name="qte_{c.id}"
								min="0"
								max="30"
								inputmode="numeric"
								value={q}
								oninput={(e) =>
									(quantites = {
										...quantites,
										[c.id]: Math.max(0, Math.min(30, Number(e.currentTarget.value) || 0))
									})}
								aria-label="Quantité de {c.nom}"
							/>
							<button
								type="button"
								class="pas"
								onclick={() => changer(c.id, 1)}
								aria-label="Un {c.nom} de plus">+</button
							>
						</span>
					</li>
				{/each}
			</ul>
		{:else if creatures.length}
			<Vide>Aucune créature ne correspond.</Vide>
		{:else}
			<Vide>Le bestiaire est vide. L’Atelier y écrit les créatures.</Vide>
		{/if}
	</fieldset>

	<div class="valider">
		<Bouton variante="texte" href="/table/apparitions" fleche="→"
			>Transférer depuis Apparitions</Bouton
		>
		<Bouton variante="trait" type="submit" disabled={enCours || total === 0}>
			{total ? `Ajouter ${total} combattant${total > 1 ? 's' : ''}` : 'Ajouter à la Table'}
		</Bouton>
	</div>
	{#if note}
		<div aria-live="polite"><NoteDeMarge ton={note.ton}>{note.texte}</NoteDeMarge></div>
	{/if}
</form>

<style>
	.preparer {
		display: grid;
		gap: 24px;
	}
	fieldset {
		min-width: 0;
		margin: 0;
		padding: 0;
		border: 0;
	}
	legend {
		width: 100%;
		padding: 0;
		font: var(--t-repere);
		letter-spacing: var(--approche-repere);
		text-transform: uppercase;
		color: var(--encre-2);
		line-height: 24px;
		border-bottom: 1px solid var(--reglure);
	}
	.cases li {
		border-bottom: 1px solid var(--reglure);
	}
	.cases label,
	.creature {
		display: flex;
		align-items: center;
		gap: 0 12px;
		min-height: 44px;
	}
	.cases label {
		cursor: pointer;
	}
	.creature {
		justify-content: space-between;
	}
	input[type='checkbox'] {
		flex: none;
		width: 20px;
		height: 20px;
		margin: 0;
		accent-color: var(--ruban);
	}
	.qui {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0 12px;
		min-width: 0;
	}
	.nom {
		font: 500 14px/24px var(--corps);
		color: var(--encre);
	}
	.pris .nom {
		color: var(--encre-humide);
	}
	.detail {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.quantite {
		display: inline-flex;
		align-items: center;
	}
	.pas {
		width: 44px;
		height: 44px;
		border: 0;
		background: none;
		font: 400 18px/1 var(--corps);
		color: var(--encre-2);
		border-radius: var(--rayon);
	}
	.pas:disabled {
		color: var(--encre-grise);
	}
	.quantite input {
		width: 40px;
		min-height: 44px;
		padding: 0;
		border: 0;
		border-bottom: 1px solid color-mix(in srgb, var(--encre) 28%, transparent);
		background: transparent;
		text-align: center;
		font: 500 14px/24px var(--corps);
		color: var(--encre);
		appearance: textfield;
		-moz-appearance: textfield;
	}
	.quantite input::-webkit-inner-spin-button,
	.quantite input::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	.filtre input {
		width: 100%;
		min-height: 44px;
		border: 0;
		border-bottom: 1px solid color-mix(in srgb, var(--encre) 28%, transparent);
		background: transparent;
		font: var(--t-corps);
		color: var(--encre);
	}
	.valider {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
</style>
