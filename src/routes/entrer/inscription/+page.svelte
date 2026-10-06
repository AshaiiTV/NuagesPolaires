<script lang="ts">
	import { resolve } from '$app/paths';
	// Rejoindre l'aventure : le règlement d'abord (« J'accepte — Continuer »), puis le compte.
	// Après l'inscription, le carnet s'ouvre en attente de liaison (03-vision §4, §5.2 ; P6).
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import Enveloppe from '$lib/ui/Enveloppe.svelte';
	import Page from '$lib/ui/Page.svelte';
	import Champ from '$lib/ui/Champ.svelte';
	import MotDePasse from '$lib/ui/MotDePasse.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import { creerEcriture } from '$lib/ui/ecriture.svelte';
	import Sommaire from '../../univers/Sommaire.svelte';
	import Depliant from '../../univers/Depliant.svelte';
	import { typo } from '../../univers/typo';
	import TexteReglement from './TexteReglement.svelte';

	let { data, form } = $props();
	const ecriture = creerEcriture();
	let pseudo = $state(untrack(() => form?.values?.pseudo?.toString() ?? ''));

	// Le refus du serveur, rattaché à la ligne qu'il concerne.
	const refus = $derived.by(() => {
		const note = ecriture.note;
		if (note && note.ton !== 'refus') return null;
		const code = note?.code ?? form?.code;
		const texte = note ? (form?.message ?? note.texte) : form?.message;
		if (!texte) return null;
		const champ =
			code === 'PSEUDO_TAKEN' || code === 'INVALID_PSEUDO'
				? 'pseudo'
				: code === 'INVALID_PASSWORD'
					? 'password'
					: code === 'MISMATCH'
						? 'passwordConfirm'
						: null;
		return { champ, texte };
	});

	const etapes = [
		{ id: 'reglement', numero: 'I', titre: 'Le règlement' },
		{ id: 'compte', numero: 'II', titre: 'Ton compte' }
	] as const;
</script>

<svelte:head>
	<title
		>{data.etape === 'compte' ? 'Ton compte' : 'Le règlement'} — Rejoindre — Nuages Polaires</title
	>
	<meta
		name="description"
		content="Rejoindre Nuages Polaires : lire le règlement, puis ouvrir ton carnet."
	/>
</svelte:head>

{#snippet suivi()}
	<ol class="etapes" aria-label="Étapes de l’inscription">
		{#each etapes as etape (etape.id)}
			{@const ici = data.etape === etape.id}
			{@const faite = data.etape === 'compte' && etape.id === 'reglement'}
			<li class:ici class:faite aria-current={ici ? 'step' : undefined}>
				<span class="marque" aria-hidden="true"></span>
				<span class="numero">{etape.numero}</span>
				<span class="titre">{etape.titre}</span>
				{#if faite}<span class="etat">accepté</span>{/if}
			</li>
		{/each}
	</ol>
{/snippet}

<Enveloppe compte={data.compte} discord={data.discord}>
	{#if data.etape === 'reglement' && data.reglement}
		{@const reglement = data.reglement}
		<Page repere="NP / 00 — Rejoindre" titre="Rejoindre" titreVoix="l’aventure." grain>
			{#snippet marge()}
				{@render suivi()}
				<p class="voix chapeau">L’inscription passe toujours par le règlement.</p>
				{#if reglement.entrees.length}
					<div class="sommaire">
						<Sommaire sections={reglement.entrees} libelle="Sommaire du règlement" />
					</div>
				{/if}
			{/snippet}
			{#snippet bande()}
				{@render suivi()}
				{#if reglement.entrees.length}
					<Depliant libelle="Sommaire du règlement"
						><Sommaire sections={reglement.entrees} libelle="Sommaire du règlement" /></Depliant
					>
				{/if}
			{/snippet}

			<header class="ouverture">
				<p class="repere">I · {typo(reglement.titre)}</p>
				<p class="voix">Lis-le jusqu’au bout : ton accord se donne en bas de la page.</p>
				<p class="aller">
					<Bouton variante="texte" href="#accord" fleche="↓">Aller à l’accord</Bouton>
				</p>
			</header>

			<TexteReglement html={reglement.html} />

			<form
				method="GET"
				action="/entrer/inscription"
				class="accord"
				id="accord"
				tabindex="-1"
				aria-label="Accord au règlement"
			>
				<input type="hidden" name="etape" value="compte" />
				<input type="hidden" name="reglement" value="accepte" />
				<p class="voix">
					En continuant, tu acceptes ce règlement, sans réserve. Il se relit à tout moment dans
					L’univers.
				</p>
				<div class="gestes">
					<Bouton variante="ruban" type="submit" fleche="→">J’accepte — Continuer</Bouton>
					<Bouton variante="texte" href="/">Pas maintenant</Bouton>
				</div>
			</form>
		</Page>
	{:else}
		<Page repere="NP / 00 — Rejoindre" titre="Ton" titreVoix="compte.">
			{#snippet marge()}
				{@render suivi()}
				<p class="voix chapeau">
					Ton compte ouvre le carnet. Il ne crée pas ta fiche : un administrateur la relie à ton
					personnage.
				</p>
			{/snippet}
			{#snippet bande()}
				{@render suivi()}
			{/snippet}

			<form
				method="POST"
				action="?/inscrire"
				use:enhance={ecriture.enhance({ verbe: 'Ouvert' })}
				class="formulaire"
				novalidate
			>
				<input type="hidden" name="acceptRules" value="on" />
				<Champ
					libelle="Pseudo"
					name="pseudo"
					autocomplete="username"
					autocapitalize="off"
					spellcheck={false}
					maxlength={32}
					required
					aide="2 à 32 caractères : lettres, chiffres, espaces, « _ » ou « - ». C’est le nom que tu transmets sur Discord."
					erreur={refus?.champ === 'pseudo' ? refus.texte : null}
					bind:value={pseudo}
				/>
				<MotDePasse
					libelle="Mot de passe"
					name="password"
					autocomplete="new-password"
					required
					minlength={8}
					aide="8 caractères au moins. Choisis-en un que tu n’utilises nulle part ailleurs."
					erreur={refus?.champ === 'password' ? refus.texte : null}
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
								? 'Ton compte n’est pas encore ouvert : corrige la ligne marquée.'
								: refus.texte}</NoteDeMarge
						>
					{/if}
				</div>

				<div class="gestes">
					<Bouton variante="ruban" type="submit" fleche="→" disabled={ecriture.enCours}
						>Ouvrir mon carnet</Bouton
					>
					<Bouton variante="texte" href="/entrer/inscription">Relire le règlement</Bouton>
				</div>
			</form>

			<section class="ensuite" aria-labelledby="titre-ensuite">
				<h2 id="titre-ensuite" class="repere">Ensuite</h2>
				<ol>
					<li><span class="numero">01</span>Ton carnet s’ouvre, en attente de liaison.</li>
					<li>
						<span class="numero">02</span>Tu transmets ton pseudo à un administrateur, sur Discord.
					</li>
					<li>
						<span class="numero">03</span>Il relie ton compte à ton personnage : ta fiche apparaît.
					</li>
				</ol>
				<p class="aide">Déjà un compte ? <a href={resolve('/entrer')}>Rouvrir le carnet</a></p>
			</section>
		</Page>
	{/if}
</Enveloppe>

<style>
	/* ── Les deux étapes, en marge (et dans la bande sur téléphone) ── */
	.etapes {
		display: grid;
		grid-template-columns: 5px auto 1fr;
		column-gap: 12px;
	}
	.etapes li {
		display: grid;
		grid-template-columns: subgrid;
		grid-column: 1 / -1;
		align-items: baseline;
		padding: 4px 0;
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		line-height: var(--ligne);
		color: var(--encre-grise);
	}
	.marque {
		width: 5px;
		height: 5px;
		rotate: 45deg;
		translate: 0 -2px;
	}
	.ici .marque {
		background: var(--encre-humide);
	}
	.numero {
		font: 500 18px / var(--ligne) var(--voix);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}
	.ici .titre {
		color: var(--encre);
	}
	.faite .titre {
		color: var(--encre-2);
	}
	.etat {
		margin-left: 8px;
		font-style: italic;
		color: var(--encre-grise);
	}
	.chapeau {
		margin-top: var(--ligne);
		max-width: 22rem;
	}
	.sommaire {
		--sommaire-reserve: calc(var(--ligne) * 15);
		margin-top: var(--ligne);
		padding-top: calc(var(--ligne) / 2);
		border-top: 1px solid var(--reglure);
	}

	/* ── Étape I : le règlement ── */
	.ouverture {
		max-width: var(--lecture);
		margin-bottom: var(--ligne);
		padding-bottom: calc(var(--ligne) - 1px);
		border-bottom: 1px solid var(--reglure);
	}
	.ouverture .repere {
		color: var(--encre-humide);
		margin-bottom: 12px;
	}
	.aller {
		margin-top: 8px;
	}
	.accord {
		scroll-margin-top: var(--ligne);
	}
	.accord:focus {
		outline: none;
	}
	.accord {
		max-width: var(--lecture);
		margin-top: calc(var(--ligne) * 2);
		padding-top: var(--ligne);
		/* Filet double : ici, on s'engage. */
		border-top: 3px double var(--reglure);
	}
	.accord .voix {
		margin-bottom: var(--ligne);
		color: var(--encre);
	}
	.gestes {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 28px;
	}

	/* ── Étape II : le compte ── */
	.formulaire {
		display: grid;
		gap: calc(var(--ligne) / 2);
		max-width: 28rem;
		padding-top: calc(var(--ligne) / 2);
	}
	.reponse {
		min-height: var(--ligne);
	}
	.ensuite {
		max-width: 28rem;
		margin-top: calc(var(--ligne) * 2);
		padding-top: var(--ligne);
		border-top: 1px solid var(--reglure);
	}
	.ensuite h2 {
		margin-bottom: calc(var(--ligne) / 2);
	}
	.ensuite li {
		display: grid;
		grid-template-columns: 36px 1fr;
		padding: calc(var(--ligne) / 4) 0;
		font: var(--t-recit);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}
	.ensuite li .numero {
		font: var(--t-repere);
		font-variant-numeric: lining-nums tabular-nums;
		line-height: var(--ligne);
		letter-spacing: var(--approche-repere);
		color: var(--encre-2);
	}
	.aide {
		margin-top: var(--ligne);
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-grise);
	}
	.aide a {
		display: inline-block;
		padding: 12px 0;
		margin: -12px 0;
		color: var(--encre-2);
	}

	@media (max-width: 760px) {
		.etapes {
			display: flex;
			flex-wrap: wrap;
			gap: 4px 20px;
		}
		.etapes li {
			display: flex;
			gap: 8px;
		}
	}
</style>
