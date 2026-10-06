<script lang="ts">
	import { resolve } from '$app/paths';
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import PageAtelier from '../../PageAtelier.svelte';
	import Chapitre from '$lib/ui/Chapitre.svelte';
	import Champ from '$lib/ui/Champ.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import Encre from '$lib/ui/Encre.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import Fiche from '../../../univers/bestiaire/Fiche.svelte';
	import { nomZone } from '../../../univers/bestiaire/affichage';
	import { creerEcriture } from '$lib/ui/ecriture.svelte';
	import { BEHAVIOR_COLORS, behaviorSchema, type BeastView } from '$lib/schemas/beasts';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
	const ecriture = creerEcriture();
	function saisieInitiale(): Record<string, string> {
		const beast = data.beast;
		const values = form && 'values' in form ? form.values : undefined;
		const out: Record<string, string> = {};
		for (const key of [
			'name',
			'subtitle',
			'behavior',
			'level',
			'pv',
			'ep',
			'strike',
			'skill',
			'drops',
			'gem',
			'description',
			'quote',
			'imageUrl'
		]) {
			out[key] = String(
				values?.[key] ??
					beast?.[key as keyof BeastView] ??
					({ behavior: 'Neutre', level: 1, pv: 20, ep: 20 } as Record<string, string | number>)[
						key
					] ??
					''
			);
		}
		out.adminNote = String(values?.adminNote ?? beast?.reserved?.adminNote ?? '');
		for (const key of ['qtyMin', 'qtyMax', 'spawnWeight'])
			out[key] = String(
				values?.[key] ??
					beast?.[key as 'qtyMin' | 'qtyMax' | 'spawnWeight'] ??
					(key === 'qtyMax' ? 3 : 1)
			);
		return out;
	}
	let draft = $state<Record<string, string>>(untrack(saisieInitiale));
	let zones = $state<string[]>(
		untrack(() => {
			const values = form && 'values' in form ? form.values : undefined;
			return values
				? Array.isArray(values.zones)
					? values.zones
					: values.zones
						? [values.zones]
						: []
				: (data.beast?.zones.map((z) => z.id) ?? []);
		})
	);
	let hidden = $state(
		untrack(() =>
			form && 'values' in form
				? form.values?.hidden === 'on'
				: (data.beast?.reserved?.hidden ?? true)
		)
	);
	let loadedId = $state(untrack(() => data.beast?.id ?? 'nouveau'));
	$effect.pre(() => {
		const id = data.beast?.id ?? 'nouveau';
		if (id !== loadedId) {
			loadedId = id;
			untrack(() => {
				draft = saisieInitiale();
				zones = data.beast?.zones.map((z) => z.id) ?? [];
				hidden = data.beast?.reserved?.hidden ?? true;
				ecriture.effacer();
			});
		}
	});
	$effect(() => {
		if (form && 'geste' in form && form.geste === 'masquer')
			hidden = data.beast?.reserved?.hidden ?? true;
	});
	const apercu = $derived({
		id: data.beast?.id ?? 'nouveau',
		revision: data.beast?.revision ?? 1,
		name: draft.name || 'Nouvelle créature',
		subtitle: draft.subtitle,
		behavior: draft.behavior,
		behaviorColor:
			BEHAVIOR_COLORS[draft.behavior as keyof typeof BEHAVIOR_COLORS] ?? 'var(--encre-2)',
		level: Number(draft.level),
		pv: Number(draft.pv),
		qtyMin: Number(draft.qtyMin),
		qtyMax: Number(draft.qtyMax),
		spawnWeight: Number(draft.spawnWeight),
		ep: Number(draft.ep),
		strike: draft.strike,
		skill: draft.skill,
		drops: draft.drops,
		gem: draft.gem,
		description: draft.description,
		quote: draft.quote,
		imageUrl: draft.imageUrl,
		zones: data.zones.filter((z) => zones.includes(z.id)),
		observations: [],
		reserved: null
	} satisfies BeastView);
	const textes = [
		{ key: 'strike', label: 'Frappe', lines: 2 },
		{ key: 'skill', label: 'Compétence', lines: 3 },
		{ key: 'drops', label: 'Butin', lines: 3 },
		{ key: 'gem', label: 'Drop de gemme', lines: 2 },
		{ key: 'description', label: 'Description publique', lines: 5 },
		{ key: 'quote', label: 'Citation', lines: 2 }
	];
	$effect(() => {
		if (ecriture.note?.ton === 'fait') {
			const timer = setTimeout(ecriture.effacer, 3000);
			return () => clearTimeout(timer);
		}
	});
</script>

<svelte:head><title>{data.beast?.name ?? 'Nouvelle créature'} — L’Atelier</title></svelte:head>
<PageAtelier titre={data.beast?.name ?? 'Nouvelle créature'} serments={data.atelierSerments}>
	<a class="retour" href={resolve('/atelier/bestiaire')}>← Les créatures</a>
	{#if ecriture.note}<NoteDeMarge ton={ecriture.note.ton}
			>{ecriture.note.ton === 'refus' ? 'La créature n’est pas modifiée. ' : ''}{ecriture.note
				.texte}</NoteDeMarge
		>{:else if form && 'message' in form}<NoteDeMarge ton="refus"
			>La créature n’est pas modifiée. {form.message}</NoteDeMarge
		>{/if}
	{#if ecriture.note?.code === 'VERSION_CONFLICT' || (form && 'code' in form && form.code === 'VERSION_CONFLICT')}<div
			class="gestes"
		>
			<Bouton onclick={() => invalidateAll()}>Relire la page en gardant ma saisie</Bouton>
		</div>{/if}
	<div class="edition">
		<div class="feuille">
			<form
				class="saisie"
				method="POST"
				action={data.beast ? '?/modifier' : '?/creer'}
				use:enhance={ecriture.enhance({ verbe: 'Noté' })}
			>
				{#if data.beast}<input
						type="hidden"
						name="expectedRevision"
						value={data.beast.revision}
					/>{/if}
				<Chapitre numero="01" titre="La page publique">
					<div class="saisie">
						<Champ libelle="Nom" name="name" bind:value={draft.name} required maxlength={80} />
						<Champ
							libelle="Sous-titre"
							name="subtitle"
							bind:value={draft.subtitle}
							maxlength={20000}
						/>
						<label class="choix"
							>Comportement<select name="behavior" bind:value={draft.behavior}
								>{#if !(behaviorSchema.options as readonly string[]).includes(draft.behavior)}<option
										value={draft.behavior}>{draft.behavior} (hors liste)</option
									>{/if}{#each behaviorSchema.options as behavior, index (index)}<option
										value={behavior}>{behavior}</option
									>{/each}</select
							></label
						>
						<div class="champs trois">
							{#each [{ key: 'level', label: 'Niveau', min: 1 }, { key: 'pv', label: 'PV', min: 1 }, { key: 'ep', label: 'EP', min: 0 }] as champ (champ.key)}<Champ
									libelle={champ.label}
									name={champ.key}
									type="number"
									min={champ.min}
									step={1}
									required
									bind:value={draft[champ.key]}
								/>{/each}
						</div>
						{#each textes as champ (champ.key)}<Champ
								libelle={champ.label}
								name={champ.key}
								multiligne
								lignes={champ.lines}
								bind:value={draft[champ.key]}
								maxlength={20000}
							/>{/each}
						<Champ
							libelle="Image par URL"
							name="imageUrl"
							bind:value={draft.imageUrl}
							aide="Un portrait carré. Les images hébergées sur Discord ou Imgur sont acceptées par le carnet."
						/>
					</div>
				</Chapitre>
				<Chapitre numero="02" titre="Les rencontres">
					<div class="saisie">
						<fieldset>
							<legend class="repere">Zones</legend>{#each data.zones as zone (zone.id)}<label
									class="coche"
									><input
										type="checkbox"
										name="zones"
										value={zone.id}
										bind:group={zones}
									/>{nomZone(zone.name)}</label
								>{/each}
						</fieldset>
						{#if data.beast}<p class="rappel">
								Les quantités et le poids déjà enregistrés restent inchangés si tu laisses ces
								lignes blanches.
							</p>{/if}
						<div class="champs trois">
							{#each [{ key: 'qtyMin', label: 'Quantité minimale', min: 1 }, { key: 'qtyMax', label: 'Quantité maximale', min: 1 }, { key: 'spawnWeight', label: 'Poids d’apparition', min: 0 }] as champ (champ.key)}<Champ
									libelle={champ.label}
									name={champ.key}
									type="number"
									min={champ.min}
									step={1}
									bind:value={draft[champ.key]}
								/>{/each}
						</div>
					</div>
				</Chapitre>
				<Chapitre numero="03" titre="Le calque réservé">
					<Champ
						libelle="Note réservée"
						name="adminNote"
						multiligne
						lignes={4}
						bind:value={draft.adminNote}
						maxlength={20000}
					/>
					<label class="coche"
						><input type="checkbox" name="hidden" bind:checked={hidden} />Masquée dans le bestiaire
						public</label
					>
				</Chapitre>
				<div class="gestes">
					<Bouton variante="ruban" type="submit"
						><Encre etat={ecriture.etat}
							>{data.beast ? 'Noter les modifications' : 'Créer la créature'}</Encre
						></Bouton
					>
				</div>
			</form>
			<Chapitre numero="04" titre="Nouvelle zone">
				<form method="POST" action="?/zone" use:enhance={ecriture.enhance({ verbe: 'Noté' })}>
					<Champ libelle="Nom de la zone" name="zoneName" required maxlength={80} />
					<div class="gestes"><Bouton type="submit">Ajouter la zone</Bouton></div>
					<p class="rappel">
						Une fois notée, la zone apparaît dans les cases à cocher. Coche-la avant de noter la
						créature.
					</p>
				</form>
			</Chapitre>
			{#if data.beast}
				<section class="sensible" aria-label="Visibilité et conservation">
					<h3>Visibilité et conservation</h3>
					<p class="rappel">
						{data.beast.reserved?.archived
							? 'Cette créature est archivée.'
							: data.beast.reserved?.hidden
								? 'Cette créature est masquée.'
								: 'Cette créature est visible dans le bestiaire public.'}
					</p>
					<div class="gestes">
						<form
							method="POST"
							action="?/dupliquer"
							use:enhance={ecriture.enhance({ verbe: 'Dupliqué' })}
						>
							<input type="hidden" name="expectedRevision" value={data.beast.revision} /><Bouton
								type="submit">Dupliquer</Bouton
							>
						</form>
						<form
							method="POST"
							action="?/masquer"
							use:enhance={ecriture.enhance({
								verbe: data.beast.reserved?.hidden ? 'Publié' : 'Masqué'
							})}
						>
							<input type="hidden" name="expectedRevision" value={data.beast.revision} /><input
								type="hidden"
								name="hidden"
								value={data.beast.reserved?.hidden ? 'false' : 'true'}
							/><Bouton type="submit">{data.beast.reserved?.hidden ? 'Publier' : 'Masquer'}</Bouton>
						</form>
						<form
							method="POST"
							action="?/archiver"
							use:enhance={ecriture.enhance({
								verbe: data.beast.reserved?.archived ? 'Restauré' : 'Archivé'
							})}
						>
							<input type="hidden" name="expectedRevision" value={data.beast.revision} /><input
								type="hidden"
								name="restore"
								value={data.beast.reserved?.archived ? 'true' : 'false'}
							/><Bouton variante="rouille" type="submit"
								>{data.beast.reserved?.archived ? 'Restaurer' : 'Archiver'}</Bouton
							>
						</form>
					</div>
				</section>
			{/if}
		</div>
		<aside class="apercu" aria-label="Aperçu de la page publique">
			<p class="repere">Aperçu · saisie en cours</p>
			<h2>{apercu.name}</h2>
			<p class="rappel">
				L’aperçu suit ta saisie. La page publique change après la réponse du serveur.
			</p>
			<Fiche beast={apercu} />
			{#if data.beast}<div class="gestes">
					<Bouton variante="texte" href="/univers/bestiaire/{data.beast.id}" fleche="→"
						>Ouvrir la page confirmée</Bouton
					>
				</div>{/if}
		</aside>
	</div>
</PageAtelier>

<style>
	.edition {
		display: grid;
		grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
		gap: calc(var(--gouttiere) * 2);
		align-items: start;
	}
	.apercu {
		position: sticky;
		top: var(--ligne);
		margin-top: var(--ligne);
		padding-left: var(--gouttiere);
		border-left: 1px solid var(--reglure);
	}
	.apercu h2 {
		font: 500 28px / calc(var(--ligne) * 2) var(--voix);
		font-variant-numeric: lining-nums tabular-nums;
		overflow-wrap: anywhere;
	}
	.apercu > .rappel {
		margin-bottom: var(--ligne);
	}
	.saisie :global(.ruban .encre.prise) {
		color: var(--sur-ruban);
	}
	@media (max-width: 1100px) {
		.edition {
			grid-template-columns: minmax(0, 1fr);
		}
		.apercu {
			position: static;
			border-left: 0;
			border-top: 1px solid var(--reglure);
			padding: var(--ligne) 0;
		}
	}
</style>
