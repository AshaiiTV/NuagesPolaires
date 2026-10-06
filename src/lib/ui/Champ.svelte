<script lang="ts">
	// Un champ écrit sur la réglure : pas de cadre, la ligne du carnet sert de trait d'écriture.
	import type { HTMLInputAttributes, HTMLTextareaAttributes } from 'svelte/elements';

	type Props = {
		libelle: string;
		name: string;
		value?: string | number | null;
		/** Aide écrite sous le champ, en encre secondaire. */
		aide?: string;
		/** Refus du serveur ou de la validation : ce qui n'a pas été fait. */
		erreur?: string | null;
		multiligne?: boolean;
		lignes?: number;
	} & Omit<HTMLInputAttributes & HTMLTextareaAttributes, 'value' | 'name'>;

	let {
		libelle,
		name,
		value = $bindable(''),
		aide,
		erreur = null,
		multiligne = false,
		lignes = 4,
		id,
		...reste
	}: Props = $props();

	const identifiant = $derived(id ?? `champ-${name}`);
</script>

<div class="champ" class:refuse={!!erreur}>
	<label for={identifiant}>{libelle}</label>
	{#if multiligne}
		<textarea
			id={identifiant}
			{name}
			rows={lignes}
			bind:value
			aria-invalid={erreur ? 'true' : undefined}
			aria-describedby={erreur ? `${identifiant}-erreur` : aide ? `${identifiant}-aide` : undefined}
			{...reste}></textarea>
	{:else}
		<input
			id={identifiant}
			{name}
			bind:value
			aria-invalid={erreur ? 'true' : undefined}
			aria-describedby={erreur ? `${identifiant}-erreur` : aide ? `${identifiant}-aide` : undefined}
			{...reste}
		/>
	{/if}
	{#if erreur}
		<p class="erreur" id="{identifiant}-erreur">{erreur}</p>
	{:else if aide}
		<p class="aide" id="{identifiant}-aide">{aide}</p>
	{/if}
</div>

<style>
	.champ {
		display: flex;
		flex-direction: column;
	}
	label {
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	input,
	textarea {
		width: 100%;
		min-height: var(--cible);
		padding: 8px 0;
		background: transparent;
		border: 0;
		border-bottom: 1px solid color-mix(in srgb, var(--encre) 28%, transparent);
		border-radius: 0;
		font: var(--t-corps);
		color: var(--encre);
		caret-color: var(--encre-humide);
		transition: border-color 160ms;
	}
	textarea {
		field-sizing: content;
		min-height: calc(var(--ligne) * 3 + 8px);
		resize: vertical;
		line-height: var(--ligne);
		background-image: repeating-linear-gradient(
			to bottom,
			transparent 0 calc(var(--ligne) - 1px),
			var(--reglure) calc(var(--ligne) - 1px) var(--ligne)
		);
		background-position: 0 8px;
		border-bottom-color: transparent;
	}
	input::placeholder,
	textarea::placeholder {
		color: var(--encre-grise);
		font-style: italic;
	}
	input:hover,
	textarea:hover {
		border-bottom-color: var(--encre-2);
	}
	input:focus-visible,
	textarea:focus-visible {
		outline: none;
		border-bottom: 2px solid var(--encre-humide);
		padding-bottom: 7px;
	}
	.aide,
	.erreur {
		margin-top: 4px;
		font: var(--t-libelle);
		color: var(--encre-grise);
	}
	.refuse input,
	.refuse textarea {
		border-bottom-color: var(--rouille);
	}
	.erreur {
		color: var(--rouille);
	}
</style>
