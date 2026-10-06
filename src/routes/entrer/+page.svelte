<script lang="ts">
	import { resolve } from '$app/paths';
	// Entrer : rouvrir le carnet. Une page sobre, une seule action principale ; les refus disent ce qui
	// n'a pas été fait et gardent la saisie (03-vision §4, §8 ; P6).
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import Enveloppe from '$lib/ui/Enveloppe.svelte';
	import Page from '$lib/ui/Page.svelte';
	import Champ from '$lib/ui/Champ.svelte';
	import MotDePasse from '$lib/ui/MotDePasse.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import { creerEcriture } from '$lib/ui/ecriture.svelte';

	let { data, form } = $props();
	const ecriture = creerEcriture();
	// La saisie du pseudo survit à un refus, avec ou sans JavaScript.
	let pseudo = $state(untrack(() => form?.values?.pseudo?.toString() ?? ''));

	// Un refus de connexion est un 401 « Pseudo ou mot de passe inconnu. Le carnet reste fermé. » : c'est le message du
	// serveur qui s'écrit, pas la phrase de session refermée.
	const refus = $derived(
		ecriture.note?.ton === 'refus'
			? (form?.message ?? ecriture.note.texte)
			: !ecriture.note && form?.message
				? form.message
				: null
	);
	const chapeau = 'Ton personnage, tes rendez-vous, la suite de ton histoire.';
</script>

<svelte:head>
	<title>Entrer — Nuages Polaires</title>
	<meta
		name="description"
		content="Rouvre ton carnet de Nuages Polaires : ton personnage, tes rendez-vous, la suite de ton histoire."
	/>
</svelte:head>

<Enveloppe compte={data.compte} discord={data.discord}>
	<Page repere="NP / 00 — Entrer" titre="Rouvrir" titreVoix="le carnet.">
		{#snippet marge()}
			<p class="voix">{chapeau}</p>
			<dl class="reperes">
				<dt class="repere">Sur cet appareil</dt>
				<dd>Le carnet reste ouvert trente jours. « Quitter le carnet » le referme partout.</dd>
				<dt class="repere">Code temporaire</dt>
				<dd>
					Un administrateur te l’a donné sur Discord : entre-le comme mot de passe, le carnet te
					demande aussitôt d’en choisir un nouveau.
				</dd>
			</dl>
		{/snippet}
		{#snippet bande()}
			<p class="voix">{chapeau}</p>
		{/snippet}

		{#if data.retour}
			<NoteDeMarge>Cette page s’ouvre une fois le carnet rouvert.</NoteDeMarge>
		{/if}
		{#if data.discordRefus}
			<NoteDeMarge ton="refus">{data.discordRefus}</NoteDeMarge>
		{/if}

		<form
			method="POST"
			action="?/entrer"
			use:enhance={ecriture.enhance({ verbe: 'Ouvert' })}
			class="formulaire"
		>
			{#if data.retour}<input type="hidden" name="retour" value={data.retour} />{/if}
			<Champ
				libelle="Pseudo"
				name="pseudo"
				autocomplete="username"
				autocapitalize="off"
				spellcheck={false}
				maxlength={64}
				required
				bind:value={pseudo}
			/>
			<MotDePasse libelle="Mot de passe" name="password" autocomplete="current-password" required />

			<div class="reponse" aria-live="polite">
				{#if ecriture.note?.ton === 'attente'}
					<NoteDeMarge ton="attente">{ecriture.note.texte}</NoteDeMarge>
				{:else if refus}
					<NoteDeMarge ton="refus">{refus}</NoteDeMarge>
				{/if}
			</div>

			<div class="gestes">
				<Bouton variante="ruban" type="submit" fleche="→" disabled={ecriture.enCours}>Entrer</Bouton
				>
			</div>
		</form>

		{#if data.discordActif}
			<form method="POST" action="?/discord" class="discord">
				<p class="ou" aria-hidden="true"><span>ou</span></p>
				<Bouton variante="trait" type="submit" fleche="↗">Entrer avec Discord</Bouton>
			</form>
		{/if}

		<div class="suite">
			<Bouton variante="texte" href="/entrer/inscription" fleche="→"
				>Pas encore de compte ? Rejoindre l’aventure</Bouton
			>
			<p class="aide">
				L’inscription passe par le règlement. Avant d’entrer, tu peux lire
				<a href={resolve('/univers/premiers-pas')}>les premiers pas</a>.
			</p>
			<p class="aide mobile">
				<span class="repere">Code temporaire</span>
				Reçu d’un administrateur sur Discord : entre-le comme mot de passe, le carnet te demande aussitôt
				d’en choisir un nouveau.
			</p>
		</div>
	</Page>
</Enveloppe>

<style>
	.reperes {
		margin-top: calc(var(--ligne) * 2);
		padding-top: var(--ligne);
		border-top: 1px solid var(--reglure);
		max-width: 22rem;
	}
	.reperes dt {
		color: var(--encre-2);
	}
	.reperes dt + dd {
		margin: 4px 0 var(--ligne);
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.reperes dd:last-child {
		margin-bottom: 0;
	}
	.formulaire {
		display: grid;
		gap: calc(var(--ligne) / 2);
		max-width: 26rem;
		padding-top: calc(var(--ligne) / 2);
	}
	.reponse {
		min-height: var(--ligne);
	}
	.gestes {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 28px;
	}
	.discord {
		display: grid;
		justify-items: start;
		gap: calc(var(--ligne) / 2);
		max-width: 26rem;
		margin-top: var(--ligne);
	}
	.ou {
		display: flex;
		align-items: center;
		gap: 14px;
		width: 100%;
		font: var(--t-repere);
		letter-spacing: var(--approche-repere);
		text-transform: uppercase;
		color: var(--encre-grise);
	}
	.ou::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--reglure);
	}
	.suite {
		max-width: 26rem;
		margin-top: calc(var(--ligne) * 2);
		padding-top: var(--ligne);
		border-top: 1px solid var(--reglure);
	}
	.aide {
		margin-top: calc(var(--ligne) / 2);
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.aide a {
		display: inline-block;
		padding: 12px 0;
		margin: -12px 0;
		color: var(--encre-2);
	}
	.mobile {
		display: none;
	}
	.mobile .repere {
		display: block;
		margin-bottom: 4px;
	}
	@media (max-width: 760px) {
		.mobile {
			display: block;
			margin-top: var(--ligne);
		}
	}
</style>
