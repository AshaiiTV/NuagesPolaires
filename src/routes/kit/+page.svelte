<script lang="ts">
	// Planche de contrôle du jeu de composants « Carnet d'encre » (développement seulement).
	// Elle compose une vraie page — les Dernières pages d'Alice — pour juger l'objet, pas un catalogue.
	import { page } from '$app/state';
	import Cahier from '$lib/ui/Cahier.svelte';
	import Page from '$lib/ui/Page.svelte';
	import Chapitre from '$lib/ui/Chapitre.svelte';
	import LigneEtat from '$lib/ui/LigneEtat.svelte';
	import Corne from '$lib/ui/Corne.svelte';
	import Consequence from '$lib/ui/Consequence.svelte';
	import Rature from '$lib/ui/Rature.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import Champ from '$lib/ui/Champ.svelte';
	import Encre from '$lib/ui/Encre.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import Losange from '$lib/ui/Losange.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import Portrait from '$lib/ui/Portrait.svelte';

	const regime = $derived(
		(page.url.searchParams.get('regime') ?? 'carnet') as 'carnet' | 'serre' | 'scene'
	);

	const cahiers = [
		{
			id: 'carnet',
			libelle: 'Mon carnet',
			court: 'Carnet',
			href: '/kit',
			courant: true,
			corne: true
		},
		{ id: 'univers', libelle: 'L’univers', court: 'Univers', href: '/kit' },
		{ id: 'agenda', libelle: 'Agenda', href: '/kit', corne: true },
		{ id: 'table', libelle: 'La Table', court: 'Table', href: '/kit' },
		{ id: 'registre', libelle: 'Le Registre', court: 'Plus', href: '/kit' }
	];
	let note = $state('');
</script>

<svelte:head
	><title>Planche — Carnet d'encre</title><meta name="robots" content="noindex" /></svelte:head
>

<Cahier
	{cahiers}
	{regime}
	ruban={{ href: '/kit?regime=scene', corne: true }}
	compte={{ pseudo: 'Ashaii', role: 'joueur' }}
>
	<Page repere="NP / 02 — Mon carnet" titre="Dernières" titreVoix="pages." grain>
		{#snippet marge()}
			<div class="identite">
				<Portrait nom="Kael" taille={72} />
				<p class="nom">Kael</p>
				<p class="serment">Duelliste · <span class="rang">Basique</span> · niveau 7</p>
			</div>
			<LigneEtat
				pv={{ cur: 24, max: 66 }}
				ep={{ cur: 38, max: 86, declare: -8 }}
				em={{ cur: 12, max: 32 }}
				releve="21:14"
			/>
			<p class="lu">Lu pour la dernière fois le 27 septembre.</p>
		{/snippet}
		{#snippet bande()}
			<span>Kael · Duelliste · niv. 7</span>
			<LigneEtat
				pv={{ cur: 24, max: 66 }}
				ep={{ cur: 38, max: 86, declare: -8 }}
				em={{ cur: 12, max: 32 }}
				releve="21:14"
			/>
		{/snippet}

		<section class="marque-page">
			<p class="repere">Tu t’étais arrêté ici.</p>
			<p class="phrase">« Devant la crevasse, Kael n’a pas encore dit s’il passait le premier. »</p>
			<Bouton variante="texte" href="/kit" fleche="↗">Reprendre sur Discord</Bouton>
		</section>

		<Chapitre titre="Ce qui attend ta main">
			<ul class="attend">
				<li>
					<p><span class="repere">Scène ouverte</span> #col-des-brumes</p>
					<div class="gestes">
						<Bouton variante="ruban" href="/kit" fleche="↗">Ouvrir sur Discord</Bouton>
						<Bouton variante="trait" href="/kit?regime=scene">Préparer ma réponse</Bouton>
					</div>
				</li>
				<li>
					<p><span class="repere">La Table est ouverte</span> Col des brumes</p>
					<div class="gestes"><Bouton variante="texte" href="/kit" fleche="→">Suivre</Bouton></div>
				</li>
			</ul>
		</Chapitre>

		<Chapitre titre="Depuis ta dernière lecture">
			<div class="lignes">
				<Corne href="/kit" date="26 sept." cornee>Un MJ a tamponné le combat du 26 septembre.</Corne
				>
				<Corne href="/kit" date="27 sept." cornee>Rendez-vous samedi 20 h — 4 inscrits.</Corne>
				<Corne href="/kit" date="25 sept.">Ta note du 25 septembre.</Corne>
			</div>
		</Chapitre>

		<Chapitre numero="04" titre="Conséquences" chapeau="Chaque ligne est signée.">
			<ul class="consequences">
				<Consequence cle="c-1" tampon="MJ Maitre · 26 sept. 21:47" motif="combat archivé"
					>+18 XP · Col des brumes</Consequence
				>
				<Consequence cle="c-2" tampon="MJ Maitre · 26 sept. 21:52" motif="erreur de report"
					>XP <Rature ancien={120} nouveau={150} /></Consequence
				>
				<Consequence cle="c-3" signature="toi · 21:42 · attend un MJ"
					><Encre etat="humide">Kael déclare −8 EP (Esquive).</Encre></Consequence
				>
				<Consequence cle="c-4" signature="règles · 24 sept."
					>Niveau 7 atteint · +6 PV · +6 EP · +2 EM</Consequence
				>
			</ul>
			<div class="statuts">
				<Losange couleur="#c94a4a" libelle="Saignement" detail="2 t." />
				<Losange couleur="#d8c27a" libelle="Inspiré" detail="1 t." />
				<Losange couleur="#e8e6dc" libelle="Gemme blanche" detail="×3" />
			</div>
		</Chapitre>

		<Chapitre titre="Écrire">
			<form class="ecrire" onsubmit={(e) => e.preventDefault()}>
				<Champ
					libelle="Où j’en suis"
					name="marque"
					placeholder="Une phrase pour reprendre le fil…"
					bind:value={note}
					aide="Facultatif. Visible par toi seul."
				/>
				<Champ
					libelle="Mon journal"
					name="journal"
					multiligne
					lignes={3}
					placeholder="Cette page est blanche. Elle t’attend."
				/>
				<Champ
					libelle="Lien du message Discord"
					name="lien"
					value="discord"
					erreur="Ce lien n’est pas une adresse Discord."
				/>
				<div class="gestes">
					<Bouton variante="ruban">Noter</Bouton>
					<Bouton variante="trait">Reposer</Bouton>
					<Bouton variante="tampon">Tamponner</Bouton>
					<Bouton variante="rouille">Rayer ce personnage</Bouton>
				</div>
			</form>
			<NoteDeMarge ton="attente">L’encre sèche…</NoteDeMarge>
			<NoteDeMarge ton="fait">Noté · 21:14 — l’encre a pris.</NoteDeMarge>
			<NoteDeMarge ton="refus"
				>L’encre n’a pas pris. Ta page est gardée ici ; réessaie quand tu veux.</NoteDeMarge
			>
		</Chapitre>

		<Chapitre titre="Ce qui vient">
			<Vide>Rien de prévu. Le monde attend.</Vide>
		</Chapitre>

		{#snippet pied()}
			<div class="gestes">
				<Bouton variante="texte" href="/kit" fleche="→">Ouvrir ma fiche</Bouton>
				<Bouton variante="texte" href="/kit" fleche="→">Écrire dans mon journal</Bouton>
				<Bouton variante="texte" href="/kit?regime=serre">Régime serré</Bouton>
				<Bouton variante="texte" href="/kit?regime=carnet">Régime carnet</Bouton>
			</div>
		{/snippet}
	</Page>
</Cahier>

<style>
	.identite {
		margin-bottom: var(--ligne);
	}
	.nom {
		margin-top: 14px;
		font: 500 34px/42px var(--voix);
		color: var(--encre);
	}
	.serment {
		font: var(--t-libelle);
		line-height: var(--ligne);
		color: var(--encre-2);
	}
	.rang {
		color: var(--tampon);
	}
	.lu {
		margin-top: var(--ligne);
		color: var(--encre-grise);
	}
	.marque-page {
		padding: var(--ligne) 0;
		border-block: 1px solid var(--reglure);
	}
	.phrase {
		margin: calc(var(--ligne) / 2) 0;
		font: italic 400 22px/28px var(--voix);
		color: var(--encre);
	}
	.attend li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 8px 16px;
		padding: calc(var(--ligne) / 2) 0;
		border-bottom: 1px solid var(--reglure);
	}
	.attend .repere {
		margin-right: 10px;
		color: var(--encre-humide);
	}
	.gestes {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: center;
	}
	.statuts {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 28px;
		padding: var(--ligne) 0 0;
	}
	.ecrire {
		display: grid;
		gap: var(--ligne);
		padding: var(--ligne) 0;
	}
</style>
