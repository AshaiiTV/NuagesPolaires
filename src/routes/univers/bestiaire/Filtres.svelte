<script lang="ts">
	import Champ from '$lib/ui/Champ.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import Losange from '$lib/ui/Losange.svelte';
	import { nomZone } from './affichage';
	import { BEHAVIOR_COLORS, type ListBeastsInput, type ZoneView } from '$lib/schemas/beasts';
	let {
		filters,
		zones,
		cible = '/univers/bestiaire',
		prefixe = 'bestiaire'
	}: { filters: ListBeastsInput; zones: ZoneView[]; cible?: string; prefixe?: string } = $props();
	const comportements = ['Gibier', 'Passif', 'Neutre', 'Agressif', 'Très agressif'] as const;
</script>

<form method="GET" action={cible} class="filtres">
	<Champ
		id="{prefixe}-recherche"
		libelle="Chercher une créature"
		name="recherche"
		value={filters.search ?? ''}
		maxlength={200}
	/>
	<fieldset>
		<legend class="repere">Comportement</legend>
		<label
			><input type="radio" name="comportement" value="" checked={!filters.behavior} />Tous les
			comportements</label
		>
		{#each comportements as comportement}
			<label
				><input
					type="radio"
					name="comportement"
					value={comportement}
					checked={filters.behavior === comportement}
				/><Losange couleur={BEHAVIOR_COLORS[comportement]} libelle={comportement} /></label
			>
		{/each}
	</fieldset>
	<label class="choix"
		>Zone<select name="zone" value={filters.zoneId ?? ''}
			><option value="">Toutes les zones</option>{#each zones as zone}<option value={zone.id}
					>{nomZone(zone.name)}</option
				>{/each}</select
		></label
	>
	<label class="choix"
		>Tri<select name="tri" value={filters.sort ?? 'name'}
			><option value="name">Nom · A à Z</option><option value="name_desc">Nom · Z à A</option
			><option value="level_asc">Niveau croissant</option><option value="level_desc"
				>Niveau décroissant</option
			></select
		></label
	>
	<div class="gestes">
		<Bouton type="submit">Chercher</Bouton><Bouton variante="texte" href={cible}
			>Tous les repères</Bouton
		>
	</div>
</form>

<style>
	.filtres {
		display: grid;
		gap: var(--ligne);
		width: 100%;
	}
	fieldset {
		padding: 0;
		margin: 0;
		border: 0;
		min-width: 0;
	}
	legend {
		padding: 0;
	}
	fieldset label {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: var(--cible);
		font: var(--t-libelle);
	}
	input {
		accent-color: var(--encre-humide);
		width: 16px;
		height: 16px;
		flex: none;
	}
	.choix {
		display: grid;
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	select {
		min-height: var(--cible);
		width: 100%;
		min-width: 0;
		background: var(--page);
		color: var(--encre);
		border: 0;
		border-bottom: 1px solid var(--reglure);
	}
	.gestes {
		display: flex;
		flex-wrap: wrap;
		gap: 0 16px;
	}
	:global([data-regime='serre']) .filtres {
		grid-template-columns: minmax(200px, 1fr) minmax(160px, 1fr) minmax(160px, 1fr) auto;
		align-items: end;
	}
	:global([data-regime='serre']) fieldset {
		display: none;
	}
	@media (max-width: 760px) {
		:global([data-regime='serre']) .filtres {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
