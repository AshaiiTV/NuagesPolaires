<script lang="ts">
	// Mon compte : qui tu es dans le carnet, ton mot de passe, Discord, et les deux façons de refermer le
	// carnet — pour ce soir (Quitter) ou pour de bon (Fermer, sous un filet double). 03-vision §4, §8.
	import { enhance } from '$app/forms';
	import Enveloppe from '$lib/ui/Enveloppe.svelte';
	import Page from '$lib/ui/Page.svelte';
	import Chapitre from '$lib/ui/Chapitre.svelte';
	import Portrait from '$lib/ui/Portrait.svelte';
	import MotDePasse from '$lib/ui/MotDePasse.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import Encre from '$lib/ui/Encre.svelte';
	import { creerEcriture } from '$lib/ui/ecriture.svelte';
	import { LIBELLES_ROLE } from '$lib/ui/navigation';
	import { dateLongue } from '$lib/ui/dates';
	import Sommaire from '../univers/Sommaire.svelte';

	let { data, form } = $props();

	const compte = $derived(data.moi);
	const role = $derived(LIBELLES_ROLE[compte.role]);
	const depuis = $derived(dateLongue(compte.createdAt));
	const admin = $derived(compte.role === 'admin');

	// ── Mot de passe ──
	const ecritureMdp = creerEcriture();
	let actuel = $state('');
	let nouveau = $state('');
	let confirmation = $state('');
	const refusMdp = $derived.by(() => {
		const note = ecritureMdp.note;
		const sansJs = !note && form?.values?.geste === 'motDePasse' ? form : null;
		if (note && note.ton !== 'refus') return null;
		const code = note?.code ?? sansJs?.code;
		const texte = note?.texte ?? sansJs?.message;
		if (!texte) return null;
		const champ =
			code === 'WRONG_PASSWORD' ? 'current' : code === 'INVALID_PASSWORD' ? 'next' : code === 'MISMATCH' ? 'passwordConfirm' : null;
		return { champ, texte };
	});

	// ── Discord, quitter, fermer : une écriture chacun, une note de marge à la fois ──
	const ecritureDiscord = creerEcriture();
	const ecritureQuitter = creerEcriture();
	const ecritureFermer = creerEcriture();
	const refusFermer = $derived(
		ecritureFermer.note?.ton === 'refus'
			? ecritureFermer.note.texte
			: !ecritureFermer.note && form?.values?.geste === 'fermer'
				? (form?.message ?? null)
				: null
	);

	const sections = $derived([
		{ id: 'identite', title: 'Identité', level: 2, numero: '01' },
		{ id: 'mot-de-passe', title: 'Mot de passe', level: 2, numero: '02' },
		...(data.discordActif ? [{ id: 'discord', title: 'Discord', level: 2, numero: '03' }] : []),
		{ id: 'quitter', title: 'Quitter le carnet', level: 2, numero: data.discordActif ? '04' : '03' },
		{ id: 'fermer', title: 'Fermer le compte', level: 2, numero: data.discordActif ? '05' : '04' }
	]);
	const numero = (id: string) => sections.find((s) => s.id === id)?.numero;
</script>

<svelte:head><title>Mon compte — Nuages Polaires</title></svelte:head>

<Enveloppe compte={data.compte} discord={data.discord}>
	<Page repere="NP / 07 — Mon compte" titre="Mon" titreVoix="compte.">
		{#snippet marge()}
			<div class="identite">
				<Portrait nom={data.personnage?.name ?? compte.pseudo} src={data.personnage?.portraitUrl} taille={72} />
				<p class="pseudo">{compte.pseudo}</p>
				<p class="role">{role}{#if !compte.characterId && compte.role === 'joueur'} · en attente de liaison{/if}</p>
				<p class="depuis">Dans le carnet depuis le {depuis}.</p>
			</div>
			<div class="sommaire"><Sommaire {sections} libelle="Chapitres de la page" /></div>
		{/snippet}
		{#snippet bande()}
			<span>{compte.pseudo} · {role}</span>
			<span>depuis le {depuis}</span>
		{/snippet}

		<!-- 01 · Identité -->
		<Chapitre numero={numero('identite')} titre="Identité" id="identite">
			<dl class="lignes">
				<div class="ligne">
					<dt>Pseudo</dt>
					<dd class="valeur">{compte.pseudo}</dd>
				</div>
				<div class="ligne">
					<dt>Rôle</dt>
					<dd class="valeur">{role}</dd>
				</div>
				<div class="ligne">
					<dt>Personnage</dt>
					<dd>
						{#if data.personnage}
							<span class="valeur nom">{data.personnage.name}</span>
							<span class="serment">{data.personnage.oath} · <span class="rang">{data.personnage.rank}</span> · niveau {data.personnage.level}</span>
							<Bouton variante="texte" href="/carnet/fiche" fleche="→">Ouvrir ma fiche</Bouton>
						{:else if compte.characterId}
							<span class="valeur nom">{compte.characterName ?? 'Relié'}</span>
							<span class="serment">Une liaison existe, mais ta fiche n’a pas pu s’ouvrir. Recharge ; si ça persiste, donne ton pseudo à un administrateur sur Discord.</span>
						{:else}
							<span class="valeur attente">En attente de liaison</span>
							<p class="voix phrase">
								Ton compte existe. Ta fiche attend qu’un administrateur la relie à ton personnage. Transmets ton pseudo sur Discord&nbsp;:
								<strong>{compte.pseudo}</strong>.
							</p>
							<div class="liens">
								<Bouton variante="texte" href="/univers/premiers-pas" fleche="→">Premiers pas</Bouton>
								<Bouton variante="texte" href="/compte" data-sveltekit-reload>Recharger cette page</Bouton>
							</div>
						{/if}
					</dd>
				</div>
				<div class="ligne">
					<dt>Thème</dt>
					<dd>
						<span class="valeur">{data.themePorte?.name ?? 'Nuages Polaires'}</span>
						<Bouton variante="texte" href="/compte/collection" fleche="→">Ma collection</Bouton>
					</dd>
				</div>
			</dl>
		</Chapitre>

		<!-- 02 · Mot de passe -->
		<Chapitre numero={numero('mot-de-passe')} titre="Mot de passe" id="mot-de-passe" chapeau="Confirme d’abord celui que tu utilises.">
			{#if data.motDePasseCourt}
				<NoteDeMarge>Ton mot de passe a moins de 8 caractères. Choisis-en un plus long : il garde ta fiche.</NoteDeMarge>
			{/if}
			<form
				method="POST"
				action="?/motDePasse"
				class="formulaire"
				novalidate
				use:enhance={ecritureMdp.enhance({
					verbe: 'Noté',
					apres: () => {
						actuel = '';
						nouveau = '';
						confirmation = '';
					}
				})}
			>
				<input type="hidden" name="geste" value="motDePasse" />
				<input type="text" name="username" value={compte.pseudo} autocomplete="username" hidden readonly />
				<MotDePasse
					libelle="Mot de passe actuel"
					name="current"
					id="champ-mdp-actuel"
					autocomplete="current-password"
					required
					erreur={refusMdp?.champ === 'current' ? refusMdp.texte : null}
					bind:value={actuel}
				/>
				<MotDePasse
					libelle="Nouveau mot de passe"
					name="next"
					id="champ-mdp-nouveau"
					autocomplete="new-password"
					required
					minlength={8}
					aide="8 caractères au moins."
					erreur={refusMdp?.champ === 'next' ? refusMdp.texte : null}
					bind:value={nouveau}
				/>
				<MotDePasse
					libelle="Confirmation"
					name="passwordConfirm"
					id="champ-mdp-confirmation"
					autocomplete="new-password"
					required
					aide="Le même, une seconde fois."
					erreur={refusMdp?.champ === 'passwordConfirm' ? refusMdp.texte : null}
					bind:value={confirmation}
				/>
				<p class="avertissement">Les autres appareils seront déconnectés.</p>
				<div class="reponse" aria-live="polite">
					{#if ecritureMdp.note?.ton === 'attente' || ecritureMdp.note?.ton === 'fait'}
						<NoteDeMarge ton={ecritureMdp.note.ton}>{ecritureMdp.note.texte}</NoteDeMarge>
					{:else if refusMdp}
						<NoteDeMarge ton="refus">{refusMdp.champ ? 'Le mot de passe n’est pas changé : corrige la ligne marquée.' : refusMdp.texte}</NoteDeMarge>
					{/if}
				</div>
				<div class="gestes">
					<Bouton variante="trait" type="submit" disabled={ecritureMdp.enCours}>Changer le mot de passe</Bouton>
				</div>
			</form>
		</Chapitre>

		<!-- 03 · Discord (si la connexion Discord est activée) -->
		{#if data.discordActif}
			<Chapitre numero={numero('discord')} titre="Discord" id="discord">
				{#if data.discordRetour && !ecritureDiscord.note}
					<NoteDeMarge ton={data.discordRetour.ton}>{data.discordRetour.texte}</NoteDeMarge>
				{/if}
				{#if compte.discordLinked}
					<p class="texte">
						<Encre etat={ecritureDiscord.etat}>Lié à <strong>{compte.discordUsername || 'ton compte Discord'}</strong>.</Encre>
						Tu peux entrer d’un geste depuis la page d’entrée.
					</p>
					<form method="POST" action="?/discord" use:enhance={ecritureDiscord.enhance({ verbe: 'Délié' })} class="gestes">
						<input type="hidden" name="geste" value="delier" />
						<Bouton variante="texte" type="submit" disabled={ecritureDiscord.enCours}>Délier Discord</Bouton>
					</form>
				{:else}
					<p class="texte">Lie ton compte Discord pour entrer d’un geste. Discord ne donne ni rôle ni personnage.</p>
					<form method="POST" action="?/discord" class="gestes">
						<input type="hidden" name="geste" value="lier" />
						<Bouton variante="trait" type="submit" fleche="↗">Lier mon compte Discord</Bouton>
					</form>
				{/if}
				{#if ecritureDiscord.note}
					<NoteDeMarge ton={ecritureDiscord.note.ton}>{ecritureDiscord.note.texte}</NoteDeMarge>
				{/if}
			</Chapitre>
		{/if}

		<!-- Quitter le carnet : pour ce soir -->
		<Chapitre numero={numero('quitter')} titre="Quitter le carnet" id="quitter">
			<p class="texte">Le carnet se referme sur tous tes appareils. Ce qui est écrit reste écrit.</p>
			<form method="POST" action="?/quitter" use:enhance={ecritureQuitter.enhance({ verbe: 'Refermé' })} class="gestes">
				<Bouton variante="trait" type="submit" disabled={ecritureQuitter.enCours}>Quitter le carnet</Bouton>
			</form>
			{#if ecritureQuitter.note?.ton === 'refus'}
				<NoteDeMarge ton="refus">{ecritureQuitter.note.texte}</NoteDeMarge>
			{/if}
		</Chapitre>

		<!-- Fermer le compte : pour de bon, sous un filet double -->
		<div class="filet-double">
			<Chapitre numero={numero('fermer')} titre="Fermer le compte" id="fermer">
				{#if admin}
					<p class="texte">Un compte administrateur ne se ferme pas d’ici : le carnet garde toujours un administrateur.</p>
				{:else}
					<p class="voix grave">Le carnet se ferme pour de bon. Ce qui est écrit ne se rouvre pas.</p>
					<p class="texte">
						Ton compte disparaît{#if data.personnage}, avec la fiche de {data.personnage.name}{/if}. Écris ton mot de passe pour fermer.
					</p>
					<form method="POST" action="?/fermer" use:enhance={ecritureFermer.enhance({ verbe: 'Fermé' })} class="formulaire" novalidate>
						<input type="hidden" name="geste" value="fermer" />
						<MotDePasse
							libelle="Ton mot de passe"
							name="password"
							id="champ-fermer"
							autocomplete="current-password"
							required
							erreur={refusFermer}
						/>
						<div class="reponse" aria-live="polite">
							{#if ecritureFermer.note?.ton === 'attente'}
								<NoteDeMarge ton="attente">{ecritureFermer.note.texte}</NoteDeMarge>
							{:else if refusFermer}
								<NoteDeMarge ton="refus">Le compte reste ouvert.</NoteDeMarge>
							{/if}
						</div>
						<div class="gestes">
							<Bouton variante="rouille" type="submit" disabled={ecritureFermer.enCours}>Fermer mon compte</Bouton>
						</div>
					</form>
				{/if}
			</Chapitre>
		</div>
	</Page>
</Enveloppe>

<style>
	/* ── Marge : le portrait du compte, puis le sommaire des chapitres ── */
	.identite {
		margin-bottom: var(--ligne);
	}
	.pseudo {
		margin-top: 14px;
		font: 500 34px/42px var(--voix);
		color: var(--encre);
		overflow-wrap: anywhere;
	}
	.role {
		font: var(--t-repere);
		line-height: var(--ligne);
		letter-spacing: var(--approche-repere);
		text-transform: uppercase;
		color: var(--encre-2);
	}
	.depuis {
		margin-top: calc(var(--ligne) / 2);
		font: var(--t-libelle);
		color: var(--encre-grise);
	}
	.sommaire {
		padding-top: calc(var(--ligne) / 2);
		border-top: 1px solid var(--reglure);
	}

	/* ── Identité : des lignes de carnet, libellé à gauche ── */
	.lignes {
		margin: 0;
	}
	.ligne {
		display: grid;
		grid-template-columns: 9rem minmax(0, 1fr);
		gap: 4px var(--gouttiere);
		padding: calc(var(--ligne) / 2) 0 calc(var(--ligne) / 2 - 1px);
		border-bottom: 1px solid var(--reglure);
	}
	dt {
		font: var(--t-repere);
		line-height: var(--ligne);
		letter-spacing: var(--approche-repere);
		text-transform: uppercase;
		color: var(--encre-2);
	}
	dd {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0 20px;
		margin: 0;
		min-width: 0;
	}
	.valeur {
		font: var(--t-corps);
		color: var(--encre);
		overflow-wrap: anywhere;
	}
	.nom {
		font: 500 22px / var(--ligne) var(--voix);
	}
	.serment {
		flex-basis: 100%;
		font: var(--t-libelle);
		line-height: var(--ligne);
		color: var(--encre-2);
	}
	.rang {
		color: var(--tampon);
	}
	.attente {
		font-style: italic;
		color: var(--encre-humide);
	}
	.phrase {
		flex-basis: 100%;
		max-width: var(--lecture);
		color: var(--encre);
	}
	.phrase strong {
		font-weight: 600;
		font-style: normal;
	}
	.liens {
		display: flex;
		flex-wrap: wrap;
		gap: 0 28px;
	}

	/* ── Formulaires ── */
	.texte {
		max-width: var(--lecture);
		padding: calc(var(--ligne) / 2) 0;
		font: var(--t-corps);
		color: var(--encre-2);
	}
	.texte strong {
		font-weight: 600;
		color: var(--encre);
	}
	.formulaire {
		display: grid;
		gap: calc(var(--ligne) / 2);
		max-width: 26rem;
		padding-top: calc(var(--ligne) / 2);
	}
	.avertissement {
		font: var(--t-libelle);
		color: var(--encre-2);
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

	/* ── Fermer le compte : sous un filet double ── */
	.filet-double {
		margin-top: calc(var(--ligne) * 3);
		border-top: 3px double color-mix(in srgb, var(--rouille) 55%, transparent);
	}
	.filet-double :global(.chapitre) {
		margin-top: 0;
	}
	.grave {
		max-width: var(--lecture);
		padding-top: calc(var(--ligne) / 2);
		font-size: 22px;
		color: var(--encre);
	}

	@media (max-width: 760px) {
		.ligne {
			grid-template-columns: 1fr;
			gap: 0;
		}
	}
</style>
