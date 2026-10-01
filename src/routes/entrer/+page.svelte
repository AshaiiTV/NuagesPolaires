<script lang="ts">
	import { enhance } from '$app/forms';
	import Enveloppe from '$lib/ui/Enveloppe.svelte';
	import Page from '$lib/ui/Page.svelte';
	import Champ from '$lib/ui/Champ.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import { creerEcriture } from '$lib/ui/ecriture.svelte';

	let { data, form } = $props();
	const ecriture = creerEcriture();
	let pseudo = $state('');
</script>

<svelte:head><title>Entrer — Nuages Polaires</title></svelte:head>

<Enveloppe compte={data.compte} discord={data.discord}>
	<Page repere="NP / 00 — Entrer" titre="Rouvrir" titreVoix="le carnet.">
		{#snippet marge()}
			<p class="voix">Ton personnage, tes rendez-vous, la suite de ton histoire.</p>
		{/snippet}

		<form method="POST" action="?/entrer" use:enhance={ecriture.enhance({ verbe: 'Ouvert' })} class="formulaire">
			<Champ libelle="Pseudo" name="pseudo" autocomplete="username" required bind:value={pseudo} />
			<Champ libelle="Mot de passe" name="password" type="password" autocomplete="current-password" required />
			{#if ecriture.note && ecriture.note.ton !== 'fait'}
				<NoteDeMarge ton={ecriture.note.ton}>{ecriture.note.texte}</NoteDeMarge>
			{:else if form?.message}
				<NoteDeMarge ton="refus">{form.message}</NoteDeMarge>
			{/if}
			<div class="gestes">
				<Bouton variante="ruban" type="submit" fleche="→" disabled={ecriture.enCours}>Entrer</Bouton>
				<Bouton variante="texte" href="/entrer/inscription" fleche="→">Pas encore de compte ? Rejoindre l’aventure</Bouton>
			</div>
		</form>
	</Page>
</Enveloppe>

<style>
	.formulaire {
		display: grid;
		gap: var(--ligne);
		max-width: 26rem;
		padding-top: var(--ligne);
	}
	.gestes {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 28px;
	}
</style>
