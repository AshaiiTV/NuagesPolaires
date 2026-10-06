<script lang="ts">
	// Un mot de passe écrit sur la réglure : le Champ du carnet, plus un geste « Afficher / Masquer »
	// au bout de la ligne (bouton accessible, 44 px, état annoncé par aria-pressed). Sert à l'entrée,
	// à l'inscription, au nouveau mot de passe et à Mon compte.
	import Champ from './Champ.svelte';

	interface Props {
		libelle: string;
		name: string;
		autocomplete?: 'current-password' | 'new-password';
		aide?: string;
		erreur?: string | null;
		required?: boolean;
		minlength?: number;
		id?: string;
		value?: string;
	}
	let {
		libelle,
		name,
		autocomplete = 'current-password',
		aide,
		erreur = null,
		required = false,
		minlength,
		id,
		value = $bindable('')
	}: Props = $props();

	let visible = $state(false);
	const identifiant = $derived(id ?? `champ-${name}`);
</script>

<div class="secret" class:visible>
	<Champ
		{libelle}
		{name}
		id={identifiant}
		type={visible ? 'text' : 'password'}
		{autocomplete}
		{aide}
		{erreur}
		{required}
		{minlength}
		maxlength={256}
		autocapitalize="off"
		autocorrect="off"
		spellcheck={false}
		bind:value
	/>
	<button
		type="button"
		class="oeil"
		aria-controls={identifiant}
		aria-pressed={visible}
		onclick={() => (visible = !visible)}
	>
		{visible ? 'Masquer' : 'Afficher'}<span class="sr-only"> le mot de passe</span>
	</button>
</div>

<style>
	.secret {
		position: relative;
	}
	/* La place du geste au bout de la ligne d'écriture. */
	.secret :global(input) {
		padding-right: 84px;
	}
	.oeil {
		position: absolute;
		/* Libellé (20 px) puis la ligne d'écriture (44 px) : le geste s'y pose. */
		top: 20px;
		right: 0;
		display: inline-flex;
		align-items: center;
		justify-content: flex-end;
		min-width: 76px;
		min-height: var(--cible);
		padding: 0 0 0 12px;
		border: 0;
		background: none;
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--encre-humide) 50%, transparent);
		text-underline-offset: 4px;
		cursor: pointer;
		transition: color 160ms;
	}
	.oeil:hover,
	.visible .oeil {
		color: var(--encre);
	}
</style>
