<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { SheetView } from '$lib/schemas/characters';
	import type { EtatEncre } from '$lib/ui/Encre.svelte';
	import SaisieTampon from './SaisieTampon.svelte';
	import Choix from './Choix.svelte';
	import Champ from '$lib/ui/Champ.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import Encre from '$lib/ui/Encre.svelte';
	let {
		sheet,
		oaths,
		revision,
		enhancer,
		etat,
		humide,
		afficherNote,
		values = {}
	}: {
		sheet: SheetView;
		oaths: { id: string; name: string; weapon: string; branches: string[] }[];
		revision: number;
		enhancer: (id: string) => SubmitFunction;
		etat: EtatEncre;
		humide: boolean;
		afficherNote: Snippet<[string]>;
		values?: Record<string, string | string[]>;
	} = $props();
	const initial = (field: string, fallback: string) =>
		untrack(() => (values.operation === 'identite' ? String(values[field] ?? fallback) : fallback));
	let name = $state(
		initial(
			'name',
			untrack(() => sheet.name)
		)
	);
	let oathId = $state(
		initial(
			'oathId',
			untrack(() => sheet.oath.id)
		)
	);
	let branch = $state(
		initial(
			'branch',
			untrack(() => sheet.branch ?? 'Aucune')
		)
	);
	let weapon = $state(
		initial(
			'weapon',
			untrack(() => sheet.oath.weapon)
		)
	);
	const oath = $derived(oaths.find((o) => o.id === oathId));
	function changerSerment(e: Event) {
		const selected = oaths.find((o) => o.id === (e.currentTarget as HTMLSelectElement).value);
		branch = 'Aucune';
		weapon = selected?.weapon ?? '';
	}
</script>

<div class="ordinateur">
	<SaisieTampon
		titre="Identité, Serment et niveau"
		operation="identite"
		{revision}
		enhancement={enhancer('identite')}
		{etat}
		{humide}
		{values}
	>
		<div class="deux">
			<Champ
				libelle="Nom du personnage"
				name="name"
				id="identite-nom"
				bind:value={name}
				required
				maxlength={80}
			/><label class="choix"
				><span>Serment</span><select
					name="oathId"
					bind:value={oathId}
					onchange={changerSerment}
					required
					>{#each oaths as o (o.id)}<option value={o.id}>{o.name}</option>{/each}</select
				></label
			>
		</div>
		<div class="deux">
			<Choix libelle="Branche" name="branch" bind:value={branch}
				><option value="Aucune">Aucune branche choisie</option
				>{#each oath?.branches ?? [] as b (b)}<option value={b}>{b}</option>{/each}</Choix
			><Champ libelle="Arme" name="weapon" bind:value={weapon} maxlength={160} />
		</div>
		<Champ
			libelle="Niveau ±"
			name="levelDelta"
			type="number"
			inputmode="numeric"
			min={-99}
			max={99}
			value={initial('levelDelta', '')}
			aide="Vide : niveau conservé. La valeur saisie s’ajoute au niveau du relevé."
		/>
		{#snippet note()}{@render afficherNote('identite')}{/snippet}
	</SaisieTampon>
	<SaisieTampon
		titre="Rayer ce personnage"
		operation="rayerPersonnage"
		{revision}
		enhancement={enhancer('rayerPersonnage')}
		{etat}
		{humide}
		{values}
	>
		<p>
			La fiche sort des pages du carnet. Elle reste exportable dans les Données ; le compte est
			délié.
		</p>
		<Champ
			libelle={'Saisis « ' + sheet.name + ' » pour confirmer'}
			name="typedName"
			value={untrack(() =>
				values.operation === 'rayerPersonnage' ? String(values.typedName ?? '') : ''
			)}
			required
			autocomplete="off"
		/>
		{#snippet gestes()}<Bouton variante="rouille" type="submit" disabled={humide}
				><Encre {etat}>Rayer ce personnage</Encre></Bouton
			>{/snippet}
		{#snippet note()}{@render afficherNote('rayerPersonnage')}{/snippet}
	</SaisieTampon>
</div>
<p class="sur-ordinateur">Sur ordinateur.</p>

<style>
	.deux {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--gouttiere);
	}
	p,
	.choix {
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.choix {
		display: grid;
	}
	select {
		width: 100%;
		min-height: var(--cible);
		padding: 8px 0;
		background: transparent;
		border: 0;
		border-bottom: 1px solid var(--encre-grise);
		font: var(--t-corps);
		color: var(--encre);
	}
	option {
		background: var(--page);
	}
	.sur-ordinateur {
		display: none;
	}
	@media (max-width: 760px) {
		.ordinateur {
			display: none;
		}
		.sur-ordinateur {
			display: block;
			padding: var(--ligne) 0;
		}
	}
</style>
