<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { EtatEncre } from '$lib/ui/Encre.svelte';
	import type { SheetView } from '$lib/schemas/characters';
	import {
		STATUS_CATALOG,
		ITEM_CATEGORIES,
		EQUIPMENT_SLOTS,
		EQUIPMENT_LABELS,
		RESOURCES
	} from '$lib/schemas/characters';
	import { combatXp, GEM_XP } from '$lib/game/progression';
	import Champ from '$lib/ui/Champ.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import Choix from './Choix.svelte';
	import SaisieTampon from './SaisieTampon.svelte';
	let {
		sheet,
		beasts,
		revision,
		enhancer,
		etat,
		humide,
		afficherNote,
		values = {}
	}: {
		sheet: SheetView;
		beasts: { id: string; name: string; level: number }[];
		revision: number;
		enhancer: (id: string) => SubmitFunction;
		etat: EtatEncre;
		humide: boolean;
		afficherNote: Snippet<[string]>;
		values?: Record<string, string | string[]>;
	} = $props();
	const initial = (op: string, field: string, fallback = '') =>
		untrack(() => (values.operation === op ? String(values[field] ?? fallback) : fallback));
	let beastId = $state(initial('xp', 'beastId'));
	let part = $state<string | number | null>(initial('xp', 'participationPct', '100'));
	const beast = $derived(beasts.find((b) => b.id === beastId));
	const xp = $derived(
		beast && Number.isFinite(Number(part)) && Number(part) >= 0 && Number(part) <= 100
			? combatXp(beast.level, Number(part))
			: null
	);
	let kind = $state(
		initial(
			'gemmes',
			'kind',
			untrack(() => sheet.gems[0]?.kind ?? '')
		)
	);
	let gemQty = $state<string | number | null>(initial('gemmes', 'qty', '1'));
	const gem = $derived(sheet.gems.find((g) => g.kind === kind));
	const gemMax = $derived(Math.min(99, gem?.qty ?? 0));
	const gemGain = $derived(
		gem && Number(gemQty) > 0 && Number.isInteger(Number(gemQty)) && Number(gemQty) <= gemMax
			? Number(gemQty) * GEM_XP[gem.kind]
			: null
	);
	let itemId = $state(initial('objet-retirer', 'itemId'));
	const item = $derived(sheet.items.find((i) => i.id === itemId));
	let resource = $state(initial('corriger', 'resource', 'pv'));
	const currentResource = $derived(RESOURCES.find((r) => r === resource) ?? 'pv');
	let corrected = $state<string | number | null>(initial('corriger', 'newValue'));
</script>

<SaisieTampon
	titre="XP de combat"
	operation="xp"
	{revision}
	enhancement={enhancer('xp')}
	{etat}
	{humide}
	{values}
>
	<div class="deux">
		<Choix libelle="Créature vaincue" name="beastId" bind:value={beastId}
			><option value="">Choisis la créature</option>{#each beasts as b (b.id)}<option value={b.id}
					>{b.name} · niveau {b.level}</option
				>{/each}</Choix
		>
		<Champ
			libelle="Participation (%)"
			name="participationPct"
			id="participation-xp"
			type="number"
			inputmode="decimal"
			min={0}
			max={100}
			step="any"
			required
			bind:value={part}
		/>
	</div>
	<p class="proposition" aria-live="polite">
		{#if beast && xp !== null}Niveau {beast.level} × 10 × {part} % →
			<strong>+{xp} XP proposés</strong>.{:else}Choisis la créature et la participation pour lire le
			montant proposé.{/if}
	</p>
	{#snippet note()}{@render afficherNote('xp')}{/snippet}
</SaisieTampon>

<SaisieTampon
	titre="Fusion de gemmes"
	operation="gemmes"
	{revision}
	enhancement={enhancer('gemmes')}
	{etat}
	{humide}
	{values}
>
	{#if sheet.gems.length}
		<div class="deux">
			<Choix libelle="Gemme en stock" name="kind" bind:value={kind}
				><option value="">Choisis la gemme</option>{#each sheet.gems as g (g.kind)}<option
						value={g.kind}>{g.label} · stock {g.qty}</option
					>{/each}</Choix
			><Champ
				libelle="Quantité à fusionner"
				name="qty"
				id="quantite-gemmes"
				type="number"
				inputmode="numeric"
				min={1}
				max={gemMax}
				required
				bind:value={gemQty}
			/>
		</div>
		<p class="proposition" aria-live="polite">
			{#if gem && gemGain !== null}{gemQty} × {gem.label} → <strong>+{gemGain} XP proposés</strong>
				· stock {gem.qty}.{:else}La quantité reste dans le stock du dernier relevé.{/if}
		</p>
	{:else}<Vide>Aucune gemme.</Vide>{/if}
	{#snippet gestes()}{#if sheet.gems.length}<Bouton
				variante="tampon"
				type="submit"
				disabled={humide}>Tamponner</Bouton
			>{/if}{/snippet}
	{#snippet note()}{@render afficherNote('gemmes')}{/snippet}
</SaisieTampon>

<SaisieTampon
	titre="Ajouter un objet"
	operation="objet-ajouter"
	{revision}
	enhancement={enhancer('objet-ajouter')}
	{etat}
	{humide}
	{values}
>
	<input type="hidden" name="geste" value="ajouter" />
	<div class="deux">
		<Champ
			libelle="Objet"
			name="name"
			id="nom-objet"
			value={initial('objet-ajouter', 'name')}
			required
			maxlength={120}
		/><Choix
			libelle="Catégorie"
			name="category"
			value={initial('objet-ajouter', 'category', 'Divers')}
			>{#each ITEM_CATEGORIES as category (category)}<option value={category}>{category}</option
				>{/each}</Choix
		>
	</div>
	<div class="deux">
		<Champ
			libelle="Quantité à ajouter"
			name="qty"
			id="quantite-ajout"
			type="number"
			inputmode="numeric"
			min={1}
			max={9999}
			required
			value={initial('objet-ajouter', 'qty', '1')}
		/><Champ
			libelle="Description de l’objet"
			name="description"
			value={initial('objet-ajouter', 'description')}
			maxlength={2000}
		/>
	</div>
	<Champ
		libelle="Note de l’objet"
		name="note"
		id="note-ajout"
		value={initial('objet-ajouter', 'note')}
		maxlength={2000}
		aide="Facultative. Elle accompagne l’objet dans la conséquence."
	/>
	{#snippet note()}{@render afficherNote('objet-ajouter')}{/snippet}
</SaisieTampon>

<SaisieTampon
	titre="Retirer un objet"
	operation="objet-retirer"
	{revision}
	enhancement={enhancer('objet-retirer')}
	{etat}
	{humide}
	{values}
>
	<input type="hidden" name="geste" value="retirer" />
	{#if sheet.items.length}
		<div class="deux">
			<Choix libelle="Objet à retirer" name="itemId" bind:value={itemId}
				><option value="">Choisis l’objet</option>{#each sheet.items as i (i.id)}<option
						value={i.id}>{i.name} · stock {i.qty}</option
					>{/each}</Choix
			><Champ
				libelle="Quantité à retirer"
				name="qty"
				id="quantite-retrait"
				type="number"
				inputmode="numeric"
				min={1}
				max={item?.qty ?? 9999}
				required
				value={initial('objet-retirer', 'qty', '1')}
			/>
		</div>
		<Champ
			libelle="Note de l’objet"
			name="note"
			id="note-retrait"
			value={initial('objet-retirer', 'note')}
			maxlength={2000}
		/>
	{:else}<Vide>Rien dans les poches.</Vide>{/if}
	{#snippet gestes()}{#if sheet.items.length}<Bouton
				variante="tampon"
				type="submit"
				disabled={humide}>Tamponner</Bouton
			>{/if}{/snippet}
	{#snippet note()}{@render afficherNote('objet-retirer')}{/snippet}
</SaisieTampon>

<SaisieTampon
	titre="Poser un statut"
	operation="statut-poser"
	{revision}
	enhancement={enhancer('statut-poser')}
	{etat}
	{humide}
	{values}
>
	<input type="hidden" name="geste" value="poser" />
	<div class="deux">
		<Choix
			libelle="Statut à poser"
			name="statusId"
			id="statut-poser-choix"
			value={initial('statut-poser', 'statusId')}
			><option value="">Choisis le statut</option>{#each STATUS_CATALOG as s (s.id)}<option
					value={s.id}>{s.label}</option
				>{/each}</Choix
		><Champ
			libelle="Note du statut"
			name="note"
			id="note-statut"
			value={initial('statut-poser', 'note')}
			maxlength={500}
		/>
	</div>
	{#snippet note()}{@render afficherNote('statut-poser')}{/snippet}
</SaisieTampon>

<SaisieTampon
	titre="Retirer un statut"
	operation="statut-retirer"
	{revision}
	enhancement={enhancer('statut-retirer')}
	{etat}
	{humide}
	{values}
>
	<input type="hidden" name="geste" value="retirer" />
	{#if sheet.statuses.length}<Choix
			libelle="Statut à retirer"
			name="statusId"
			id="statut-retirer-choix"
			value={initial('statut-retirer', 'statusId')}
			><option value="">Choisis le statut</option>{#each sheet.statuses as s (s.id)}<option
					value={s.id}>{s.label}</option
				>{/each}</Choix
		>{:else}<Vide>Aucun statut.</Vide>{/if}
	{#snippet gestes()}{#if sheet.statuses.length}<Bouton
				variante="tampon"
				type="submit"
				disabled={humide}>Tamponner</Bouton
			>{/if}{/snippet}
	{#snippet note()}{@render afficherNote('statut-retirer')}{/snippet}
</SaisieTampon>

<SaisieTampon
	titre="Corriger une ressource"
	operation="corriger"
	{revision}
	enhancement={enhancer('corriger')}
	{etat}
	{humide}
	{values}
>
	<div class="deux">
		<Choix libelle="Ressource à corriger" name="resource" bind:value={resource}
			>{#each RESOURCES as r (r)}<option value={r}>{r.toUpperCase()}</option>{/each}</Choix
		><Champ
			libelle="Nouvelle valeur"
			name="newValue"
			type="number"
			inputmode="numeric"
			min={0}
			max={sheet[currentResource].max}
			required
			bind:value={corrected}
		/>
	</div>
	<p class="proposition" aria-live="polite">
		{resource.toUpperCase()}
		{sheet[currentResource].cur} → {corrected === '' || corrected === null
			? 'valeur à noter'
			: corrected} · maximum {sheet[currentResource].max}.
	</p>
	{#snippet note()}{@render afficherNote('corriger')}{/snippet}
</SaisieTampon>

<SaisieTampon
	titre="Noter l’équipement"
	operation="equipement"
	{revision}
	enhancement={enhancer('equipement')}
	{etat}
	{humide}
	{values}
>
	<div class="trois">
		{#each EQUIPMENT_SLOTS as slot (slot)}<Champ
				libelle={EQUIPMENT_LABELS[slot]}
				name={slot}
				value={initial(
					'equipement',
					slot,
					untrack(() => sheet.equipment[slot] ?? '')
				)}
				maxlength={120}
				placeholder="rien"
			/>{/each}
	</div>
	{#snippet note()}{@render afficherNote('equipement')}{/snippet}
</SaisieTampon>

<style>
	.deux,
	.trois {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--gouttiere);
	}
	.trois {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
	.proposition {
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.proposition strong {
		font-weight: 600;
		color: var(--encre);
	}
	@media (max-width: 760px) {
		.deux,
		.trois {
			grid-template-columns: 1fr;
			gap: var(--ligne);
		}
	}
</style>
