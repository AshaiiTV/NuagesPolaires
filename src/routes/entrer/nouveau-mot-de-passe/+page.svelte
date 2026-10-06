<script lang="ts">
	// Nouveau mot de passe : le code temporaire d'un administrateur a ouvert le carnet une dernière fois.
	// Une phrase dit ce qui se passe, deux lignes d'écriture, un geste.
	import { enhance } from '$app/forms';
	import Enveloppe from '$lib/ui/Enveloppe.svelte';
	import Page from '$lib/ui/Page.svelte';
	import MotDePasse from '$lib/ui/MotDePasse.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import { creerEcriture } from '$lib/ui/ecriture.svelte';
	import { heure } from '$lib/ui/dates';

	let { data, form } = $props();
	const ecriture = creerEcriture();

	const refus = $derived.by(() => {
		const note = ecriture.note;
		if (note && note.ton !== 'refus') return null;
		const code = note?.code ?? form?.code;
		const texte = note ? (form?.message ?? note.texte) : form?.message;
		if (!texte) return null;
		return {
			champ:
				code === 'MISMATCH'
					? 'passwordConfirm'
					: code === 'INVALID_PASSWORD' || code === 'INVALID'
						? 'next'
						: null,
			texte
		};
	});
	const echeance = $derived(data.echeance ? heure(data.echeance) : '');
</script>

<svelte:head><title>Nouveau mot de passe — Nuages Polaires</title></svelte:head>

<Enveloppe compte={null} discord={data.discord}>
	<Page repere="NP / 00 — Entrer" titre="Un nouveau" titreVoix="mot de passe.">
		{#snippet marge()}
			<p class="voix">
				Le code temporaire t’a ouvert le carnet une dernière fois. Choisis ton mot de passe : le
				code ne servira plus.
			</p>
			{#if echeance}
				<p class="echeance">
					<span class="repere">Code valable</span> jusqu’à <span class="chiffres">{echeance}</span>
				</p>
			{/if}
		{/snippet}
		{#snippet bande()}
			<p class="voix">
				Le code temporaire t’a ouvert le carnet une dernière fois. Choisis ton mot de passe : le
				code ne servira plus.
			</p>
		{/snippet}

		{#if data.pseudo}
			<p class="compte">
				<span class="repere">Compte</span> <span class="pseudo">{data.pseudo}</span>
			</p>
		{/if}

		<form
			method="POST"
			action="?/terminer"
			use:enhance={ecriture.enhance({ verbe: 'Noté' })}
			class="formulaire"
			novalidate
		>
			<!-- Le gestionnaire de mots de passe rattache le nouveau mot de passe au bon compte. -->
			<input
				type="text"
				name="username"
				value={data.pseudo}
				autocomplete="username"
				hidden
				readonly
			/>
			<MotDePasse
				libelle="Nouveau mot de passe"
				name="next"
				autocomplete="new-password"
				required
				minlength={8}
				aide="8 caractères au moins. Tous tes appareils devront l’utiliser."
				erreur={refus?.champ === 'next' ? refus.texte : null}
			/>
			<MotDePasse
				libelle="Confirmation"
				name="passwordConfirm"
				autocomplete="new-password"
				required
				aide="Le même, une seconde fois."
				erreur={refus?.champ === 'passwordConfirm' ? refus.texte : null}
			/>

			<div class="reponse" aria-live="polite">
				{#if ecriture.note?.ton === 'attente'}
					<NoteDeMarge ton="attente">{ecriture.note.texte}</NoteDeMarge>
				{:else if refus}
					<NoteDeMarge ton="refus"
						>{refus.champ
							? 'Le mot de passe n’est pas changé : corrige la ligne marquée.'
							: refus.texte}</NoteDeMarge
					>
				{/if}
			</div>

			<div class="gestes">
				<Bouton variante="ruban" type="submit" fleche="→" disabled={ecriture.enCours}
					>Écrire ce mot de passe</Bouton
				>
			</div>
		</form>

		<form method="POST" action="/entrer/quitter" class="quitter">
			<p class="aide">
				{#if echeance}Pas maintenant ? Le code reste valable jusqu’à <span class="chiffres"
						>{echeance}</span
					>.{:else}Pas maintenant ?{/if}
			</p>
			<Bouton variante="texte" type="submit">Refermer le carnet</Bouton>
		</form>
	</Page>
</Enveloppe>

<style>
	.echeance {
		margin-top: var(--ligne);
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}
	.echeance .repere {
		display: block;
		margin-bottom: 4px;
	}
	.compte {
		display: flex;
		align-items: baseline;
		gap: 14px;
		padding-bottom: calc(var(--ligne) / 2);
	}
	.pseudo {
		font: 500 22px / var(--ligne) var(--voix);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
	}
	.formulaire {
		display: grid;
		gap: calc(var(--ligne) / 2);
		max-width: 26rem;
	}
	.reponse {
		min-height: var(--ligne);
	}
	.gestes {
		display: flex;
		flex-wrap: wrap;
		gap: 12px 28px;
	}
	.quitter {
		max-width: 26rem;
		margin-top: calc(var(--ligne) * 2);
		padding-top: var(--ligne);
		border-top: 1px solid var(--reglure);
	}
	.aide {
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-grise);
	}
</style>
