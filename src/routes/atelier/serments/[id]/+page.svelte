<script lang="ts">
	import { resolve } from '$app/paths';
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import PageAtelier from '../../PageAtelier.svelte';
	import Chapitre from '$lib/ui/Chapitre.svelte';
	import Sceau from '$lib/ui/Sceau.svelte';
	import Champ from '$lib/ui/Champ.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import Encre from '$lib/ui/Encre.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import { creerEcriture } from '$lib/ui/ecriture.svelte';
	import { oathRankSchema, oathCategorySchema } from '$lib/schemas/oaths';
	import { OATH_RANK_LABELS, OATH_CATEGORY_LABELS, tierLevelsFor } from '$lib/game/oaths';
	import type { OathRank } from '$lib/game/types';
	import type { PageProps } from './$types';
	const preposition = (nom: string) => (/^[aeiouyhéèêâîôû]/i.test(nom) ? 'd’' : 'de ');
	let { data, form }: PageProps = $props();
	const ecriture = creerEcriture();
	function saisieInitiale(): Record<string, string> {
		const oath = data.oath;
		const values = form && 'values' in form ? form.values : undefined;
		const defaults: Record<string, string | number> = {
			name: oath?.name ?? '',
			weapon: oath?.weapon ?? '',
			rank: oath?.rank ?? 'singular',
			category: oath?.category ?? 'melee',
			lore: oath?.lore ?? '',
			baseDamage: oath?.baseDamage ?? 8,
			damageType: oath?.damageType ?? '',
			pvN: oath?.growth.pvN ?? 3,
			epN: oath?.growth.epN ?? 5,
			emN: oath?.growth.emN ?? 2,
			evolvesFrom: oath?.reserved?.evolvesFrom ?? '',
			motif: ''
		};
		const out: Record<string, string> = {};
		for (const [key, value] of Object.entries(defaults)) out[key] = String(values?.[key] ?? value);
		for (const [i, key] of ['bA', 'bB'].entries()) {
			const branch = oath?.branches[i];
			for (const field of ['label', 'style', 'physical', 'flavor'] as const)
				out[`${key}.${field}`] = String(values?.[`${key}.${field}`] ?? branch?.[field] ?? '');
			for (let t = 0; t < 4; t++)
				for (const field of ['name', 'cost', 'description'] as const)
					out[`${key}.${t}.${field}`] = String(
						values?.[`${key}.${t}.${field}`] ?? branch?.tiers[t]?.[field] ?? ''
					);
		}
		return out;
	}
	let draft = $state<Record<string, string>>(untrack(saisieInitiale));
	let hidden = $state(
		untrack(() =>
			form && 'values' in form
				? form.values?.hidden === 'on'
				: (data.oath?.reserved?.hidden ?? true)
		)
	);
	let loadedId = $state(untrack(() => data.oath?.id ?? 'nouveau'));
	$effect.pre(() => {
		const id = data.oath?.id ?? 'nouveau';
		if (id !== loadedId) {
			loadedId = id;
			untrack(() => {
				draft = saisieInitiale();
				hidden = data.oath?.reserved?.hidden ?? true;
				ecriture.effacer();
			});
		}
	});
	$effect(() => {
		if (form && 'geste' in form && form.geste === 'masquer')
			hidden = data.oath?.reserved?.hidden ?? true;
	});
	const niveaux = $derived(tierLevelsFor(draft.rank as OathRank));
	const etapes = ['I · Éveil', 'II · Densité', 'III · Maîtrise', 'IV · Plénitude'];
	$effect(() => {
		if (ecriture.note?.ton === 'fait') {
			const timer = setTimeout(ecriture.effacer, 3000);
			return () => clearTimeout(timer);
		}
	});
</script>

<svelte:head><title>{data.oath?.name ?? 'Nouveau Serment'} — L’Atelier</title></svelte:head>
<PageAtelier titre={data.oath?.name ?? 'Nouveau Serment'} serments>
	<a class="retour" href={resolve('/atelier/serments')}>← Les Serments</a>
	{#if ecriture.note}<NoteDeMarge ton={ecriture.note.ton}
			>{ecriture.note.ton === 'refus' ? 'Le Serment n’est pas modifié. ' : ''}{ecriture.note
				.texte}</NoteDeMarge
		>{:else if form && 'message' in form}<NoteDeMarge ton="refus"
			>Le Serment n’est pas modifié. {form.message}</NoteDeMarge
		>{:else}<NoteDeMarge
			>Modifier un Serment change la fiche de ses porteurs à leur prochaine ouverture.</NoteDeMarge
		>{/if}
	{#if ecriture.note?.code === 'VERSION_CONFLICT' || (form && 'code' in form && form.code === 'VERSION_CONFLICT')}<div
			class="gestes"
		>
			<Bouton onclick={() => invalidateAll()}>Relire la page en gardant ma saisie</Bouton>
		</div>{/if}
	<div class="edition">
		<aside class="apercu">
			<Sceau serment={draft.name} taille={96} />
			<h2>{draft.name || 'Nouveau Serment'}</h2>
			<p class="rang">{OATH_RANK_LABELS[draft.rank as OathRank]}</p>
			<p class="chiffres">
				+{draft.pvN} PV · +{draft.epN} EP · +{draft.emN} EM par niveau · frappe {draft.baseDamage}
			</p>
		</aside>
		<form
			class="saisie"
			method="POST"
			action={data.oath ? '?/modifier' : '?/creer'}
			use:enhance={ecriture.enhance({ verbe: 'Noté' })}
		>
			{#if data.oath}<input type="hidden" name="expectedRevision" value={data.oath.revision} />{/if}
			<Chapitre numero="01" titre="Le Serment">
				<div class="saisie">
					<div class="champs">
						<Champ
							libelle="Nom"
							name="name"
							bind:value={draft.name}
							required
							maxlength={80}
						/><Champ libelle="Arme" name="weapon" bind:value={draft.weapon} maxlength={200} />
					</div>
					<div class="champs">
						<label class="choix"
							>Rang<select name="rank" bind:value={draft.rank}
								>{#each oathRankSchema.options as rank (rank)}<option value={rank}
										>{OATH_RANK_LABELS[rank]}</option
									>{/each}</select
							></label
						>
						<label class="choix"
							>Catégorie<select name="category" bind:value={draft.category}
								>{#each oathCategorySchema.options as category (category)}<option value={category}
										>{OATH_CATEGORY_LABELS[category]}</option
									>{/each}</select
							></label
						>
					</div>
					<div class="champs trois">
						{#each ['pvN', 'epN', 'emN'] as key (key)}<Champ
								libelle="Croissance {key.slice(0, 2).toUpperCase()} par niveau"
								name={key}
								type="number"
								min={0}
								step={1}
								required
								bind:value={draft[key]}
							/>{/each}
					</div>
					<div class="champs">
						<Champ
							libelle="Frappe"
							name="baseDamage"
							type="number"
							min={0}
							step={1}
							required
							bind:value={draft.baseDamage}
						/><Champ
							libelle="Type de frappe"
							name="damageType"
							bind:value={draft.damageType}
							maxlength={200}
						/>
					</div>
					<label class="choix"
						>Lignée<select name="evolvesFrom" bind:value={draft.evolvesFrom}
							><option value="">Sans lignée</option
							>{#each data.oaths.filter((o) => o.id !== data.oath?.id) as oath, index (index)}<option
									value={oath.id}>Évolution {preposition(oath.name)}{oath.name}</option
								>{/each}</select
						></label
					>
					<Champ
						libelle="Lore"
						name="lore"
						multiligne
						lignes={5}
						bind:value={draft.lore}
						maxlength={20000}
					/>
				</div>
			</Chapitre>
			<div class="branches">
				{#each ['bA', 'bB'] as key, i (key)}
					<Chapitre numero={i === 0 ? '02' : '03'} titre="Branche {i === 0 ? 'A' : 'B'}">
						<div class="saisie">
							<Champ
								libelle="Libellé de la branche"
								name="{key}.label"
								bind:value={draft[`${key}.label`]}
								maxlength={200}
								aide="Une branche sans libellé n’est pas publiée."
							/>
							<Champ
								libelle="Style"
								name="{key}.style"
								bind:value={draft[`${key}.style`]}
								maxlength={200}
							/>
							<Champ
								libelle="Description physique"
								name="{key}.physical"
								multiligne
								lignes={4}
								bind:value={draft[`${key}.physical`]}
								maxlength={20000}
							/>
							<Champ
								libelle="Texte narratif"
								name="{key}.flavor"
								multiligne
								lignes={4}
								bind:value={draft[`${key}.flavor`]}
								maxlength={20000}
							/>
							{#each niveaux as niveau, t (t)}
								<fieldset class="palier">
									<legend
										><span>{etapes[t]}</span><span class="niveau chiffres">Niveau {niveau}</span
										></legend
									>
									<div class="saisie">
										<Champ
											libelle="Nom de la capacité"
											name="{key}.{t}.name"
											bind:value={draft[`${key}.${t}.name`]}
											required={!!draft[`${key}.label`]}
											maxlength={200}
										/><Champ
											libelle="Coût"
											name="{key}.{t}.cost"
											bind:value={draft[`${key}.${t}.cost`]}
											maxlength={1000}
										/><Champ
											libelle="Description de la capacité"
											name="{key}.{t}.description"
											multiligne
											lignes={3}
											bind:value={draft[`${key}.${t}.description`]}
											maxlength={20000}
										/>
									</div>
								</fieldset>
							{/each}
						</div>
					</Chapitre>
				{/each}
			</div>
			<Chapitre numero="04" titre="Visibilité et motif">
				<label class="coche"
					><input type="checkbox" name="hidden" bind:checked={hidden} />Masqué dans les références
					publiques</label
				>
				<p class="rappel">
					Le rang Aguerri reste hors vitrine, même quand le Serment n’est pas masqué.
				</p>
				{#if data.oath}<Champ
						libelle="Motif des modifications"
						name="motif"
						required
						bind:value={draft.motif}
						maxlength={1000}
					/>{/if}
			</Chapitre>
			<div class="gestes">
				<Bouton type="submit" variante="tampon"
					><Encre etat={ecriture.etat}
						>{data.oath ? 'Noter les modifications' : 'Créer le Serment'}</Encre
					></Bouton
				>{#if data.oath}<Bouton variante="texte" href="/univers/serments/{data.oath.id}" fleche="→"
						>Lire la page confirmée</Bouton
					>{/if}
			</div>
		</form>
	</div>
	{#if data.oath}<div class="sensible">
			<form
				method="POST"
				action="?/masquer"
				use:enhance={ecriture.enhance({ verbe: data.oath.reserved?.hidden ? 'Publié' : 'Masqué' })}
			>
				<input type="hidden" name="expectedRevision" value={data.oath.revision} /><input
					type="hidden"
					name="hidden"
					value={data.oath.reserved?.hidden ? 'false' : 'true'}
				/><Bouton type="submit" variante="tampon"
					>{data.oath.reserved?.hidden ? 'Publier' : 'Masquer'}</Bouton
				>
			</form>
		</div>{/if}
</PageAtelier>

<style>
	.edition {
		display: grid;
		grid-template-columns: minmax(12rem, 1fr) minmax(0, 3fr);
		gap: var(--gouttiere);
	}
	.apercu {
		position: sticky;
		top: var(--ligne);
		align-self: start;
		color: var(--encre-2);
	}
	.apercu h2 {
		font: 500 28px/var(--ligne) var(--voix);
		margin-top: var(--ligne);
	}
	.apercu .rang {
		color: var(--tampon);
	}
	@media (max-width: 760px) {
		.edition {
			grid-template-columns: 1fr;
		}
		.apercu {
			position: static;
		}
	}

	.branches {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: calc(var(--gouttiere) * 2);
		align-items: start;
	}
	.palier {
		padding-top: var(--ligne);
		border-top: 1px solid var(--reglure);
	}
	.palier legend {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0 16px;
		width: 100%;
		margin-bottom: 0;
		padding-top: 12px;
		border-top: 1px solid var(--reglure);
		font: 500 20px/var(--ligne) var(--voix);
	}
	.niveau {
		color: var(--encre-2);
	}
	@media (max-width: 1100px) {
		.branches {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
