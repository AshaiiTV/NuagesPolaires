<script lang="ts">
	// Une ligne d'attribution dépliée : motif obligatoire et tampon après réponse du serveur.
	import { enhance } from '$app/forms';
	import { onMount, untrack, type Snippet } from 'svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import Champ from '$lib/ui/Champ.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import Encre from '$lib/ui/Encre.svelte';
	import type { EtatEncre } from '$lib/ui/Encre.svelte';
	let {
		titre,
		operation,
		revision,
		enhancement,
		etat = 'prise',
		humide = false,
		ouvert = false,
		motifInitial = '',
		values = {},
		children,
		note,
		gestes
	}: {
		titre: string;
		operation: string;
		revision: number;
		enhancement: SubmitFunction;
		etat?: EtatEncre;
		humide?: boolean;
		ouvert?: boolean;
		motifInitial?: string;
		values?: Record<string, string | string[]>;
		children: Snippet;
		note?: Snippet;
		gestes?: Snippet;
	} = $props();
	let motif = $state(
		untrack(() =>
			values.operation === operation ? String(values.motif ?? motifInitial) : motifInitial
		)
	);
	// L'ouverture appartient au lecteur : une réponse ou une encre humide ne replie pas sa ligne.
	let expanded = $state(untrack(() => ouvert || values.operation === operation));
	let formulaire: HTMLFormElement | undefined = $state();
	// Les valeurs liées ne posent pas toutes un defaultValue natif après hydratation.
	onMount(() => {
		for (const champ of formulaire?.elements ?? []) {
			if (champ instanceof HTMLInputElement || champ instanceof HTMLTextAreaElement)
				champ.defaultValue = champ.value;
		}
	});
	let revisionVue = untrack(() => revision);
	$effect(() => {
		if (revision === revisionVue) return;
		revisionVue = revision;
		if (etat === 'refusee') return; // Relire un conflit garde la saisie.
		untrack(() => {
			for (const champ of formulaire?.elements ?? []) {
				if (champ instanceof HTMLInputElement && champ.type === 'hidden')
					champ.defaultValue = champ.value;
				if (champ instanceof HTMLInputElement && champ.name === 'qty' && !champ.defaultValue)
					champ.defaultValue = '1';
				if (champ instanceof HTMLSelectElement)
					for (const option of champ.options)
						option.defaultSelected = operation === 'xp' ? option.value === '' : option.selected;
			}
			formulaire?.reset();
			motif = motifInitial;
		});
	});
</script>

<details class="attribution" id={operation} bind:open={expanded}>
	<summary>{titre}<span class="pli" aria-hidden="true">+</span></summary>
	<form
		bind:this={formulaire}
		method="POST"
		action="?/{operation.split('-')[0]}"
		use:enhance={enhancement}
		aria-busy={humide}
	>
		<input type="hidden" name="expectedRevision" value={revision} />
		<input type="hidden" name="operation" value={operation} />
		<div class="saisie">{@render children()}</div>
		<div class="signature">
			<Champ
				libelle="Motif du tampon"
				name="motif"
				id="motif-{operation}"
				bind:value={motif}
				required
				maxlength={500}
			/>
			<div class="gestes">
				{#if gestes}{@render gestes()}{:else}<Bouton
						variante="tampon"
						type="submit"
						disabled={humide}><Encre {etat}>Tamponner</Encre></Bouton
					>{/if}
			</div>
		</div>
		{#if note}{@render note()}{/if}
	</form>
</details>

<style>
	.attribution {
		border-bottom: 1px solid var(--reglure);
	}
	summary {
		display: flex;
		justify-content: space-between;
		gap: var(--gouttiere);
		align-items: center;
		min-height: calc(var(--ligne) * 2);
		cursor: pointer;
		list-style: none;
		font: var(--t-corps);
		font-variant-numeric: lining-nums tabular-nums;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	.pli {
		color: var(--encre-2);
	}
	details[open] .pli {
		rotate: 45deg;
	}
	form {
		display: grid;
		gap: var(--ligne);
		padding: var(--ligne) 0 calc(var(--ligne) * 2);
	}
	.saisie {
		display: grid;
		gap: var(--ligne);
		min-width: 0;
	}
	.signature {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: end;
		gap: var(--ligne);
	}
	.gestes {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--gouttiere);
	}
	@media (max-width: 760px) {
		.signature {
			grid-template-columns: 1fr;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.pli {
			rotate: none;
		}
	}
</style>
