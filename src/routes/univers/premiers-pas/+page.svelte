<script lang="ts">
	import { SvelteDate } from 'svelte/reactivity';
	// Premiers pas : un seul chapitre d'accueil, celui du compte qui lit (visiteur, en attente de
	// liaison, relié, liaison sans fiche, MJ · administrateur · designer), puis le parcours en
	// quatre étapes — l'étape où l'on se trouve marquée d'un losange aurore —, trois repères et
	// les questions d'avant le départ. Texte de référence : src/content/premiers-pas.md.
	import Page from '$lib/ui/Page.svelte';
	import Chapitre from '$lib/ui/Chapitre.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import { heure } from '$lib/ui/dates';
	import Depliant from '../Depliant.svelte';
	import Sommaire from '../Sommaire.svelte';
	import Tourner from '../Tourner.svelte';
	import { titreEnVoix, typo } from '../typo';
	import type { Snippet } from 'svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const titre = $derived(titreEnVoix(data.titre));
	const resume = $derived(typo(data.resume));

	const REPERES_ETAT = {
		visiteur: 'Bienvenue dans Nuages Polaires',
		attente: 'Compte créé · en attente de liaison',
		relie: 'Relié à ton personnage',
		indisponible: 'Liaison sans fiche',
		staff: 'Repères pour accompagner'
	} as const;
	const POUR_ROLE: Record<string, string> = {
		mj: 'Repères pour un MJ',
		admin: 'Repères pour un administrateur',
		designer: 'Repères pour un designer'
	};
	const repereEtat = $derived(
		data.etat === 'staff' && data.role
			? (POUR_ROLE[data.role] ?? REPERES_ETAT.staff)
			: REPERES_ETAT[data.etat]
	);

	// L'étape du parcours où se tient le lecteur ; les précédentes sont derrière lui.
	const ICI: Record<string, number> = { visiteur: 1, attente: 3, indisponible: 3, relie: 4 };
	const ici = $derived(ICI[data.etat] ?? 0);

	const entrees = [
		{ id: 'ton-arrivee', title: 'Ton arrivée', level: 2 },
		{ id: 'parcours', title: 'Du premier regard au premier récit', level: 2, numero: '01' },
		{ id: 'reperes', title: 'Trois repères', level: 2, numero: '02' },
		{ id: 'avant-de-partir', title: 'Avant de partir', level: 2, numero: '03' }
	];

	let copie = $state<string | null>(null);
	async function copierPseudo() {
		if (!data.pseudo) return;
		try {
			await navigator.clipboard.writeText(data.pseudo);
			copie = heure(new SvelteDate());
			setTimeout(() => (copie = null), 4000);
		} catch {
			copie = null;
		}
	}
</script>

<svelte:head>
	<title>Premiers pas — Nuages Polaires</title>
	<meta name="description" content={resume} />
</svelte:head>

{#snippet etape(n: number, intitule: string, texte: string, liens: Snippet | null)}
	<li class="etape" class:ici={ici === n} class:passee={ici > n}>
		<span class="rang chiffres">{String(n).padStart(2, '0')}</span>
		<div class="contenu">
			{#if ici === n}<p class="tu-es-ici">
					<span class="losange" aria-hidden="true"></span>Tu en es ici
				</p>{/if}
			<h3>{intitule}</h3>
			<p>{texte}</p>
			{#if liens}<div class="liens">{@render liens()}</div>{/if}
		</div>
	</li>
{/snippet}

<Page repere="NP / 05 — L’univers" titre={titre.debut} titreVoix={titre.voix} grain>
	{#snippet marge()}
		<p class="voix">{resume}</p>
		<div class="sommaire"><Sommaire sections={entrees} /></div>
	{/snippet}
	{#snippet bande()}
		<p class="voix chapeau">{resume}</p>
		<Depliant libelle="Sommaire"><Sommaire sections={entrees} /></Depliant>
	{/snippet}

	<section class="arrivee" id="ton-arrivee" tabindex="-1" aria-labelledby="titre-arrivee">
		<p class="repere">{repereEtat}</p>

		{#if data.etat === 'visiteur'}
			<h2 id="titre-arrivee">Une place dans une histoire <em>collective.</em></h2>
			<p class="lead">
				Nuages Polaires se joue en roleplay textuel sur Discord. Le compagnon tient l’univers, les
				règles, ta fiche et les rendez-vous de la table.
			</p>
			<div class="gestes">
				<Bouton variante="trait" href="/entrer/inscription" fleche="→"
					>Lire le règlement et rejoindre</Bouton
				>
				<Bouton variante="texte" href="/entrer" fleche="→">J’ai déjà un compte</Bouton>
			</div>
		{:else if data.etat === 'attente'}
			<h2 id="titre-arrivee">Ton histoire peut déjà prendre <em>forme.</em></h2>
			<p class="lead">
				Ton compte existe. Ta fiche attend qu’un administrateur la relie à ton personnage. Transmets
				ton pseudo sur Discord&nbsp;: {data.pseudo}.
			</p>
			<div class="pseudo-bloc">
				<p class="repere">Ton pseudo, à transmettre</p>
				<p class="pseudo">{data.pseudo}</p>
				<div class="gestes">
					<Bouton variante="trait" onclick={copierPseudo}>Copier mon pseudo</Bouton>
					<p class="copie" aria-live="polite">
						{#if copie}Copié · {copie} — colle-le sur Discord.{/if}
					</p>
				</div>
			</div>
			<p class="suite">
				Après la liaison, recharge cette page pour retrouver ta fiche. En attendant, l’univers, le
				règlement et les Serments sont ouverts.
			</p>
			<div class="gestes">
				<Bouton variante="trait" href="/univers/premiers-pas" data-sveltekit-reload
					>Recharger cette page</Bouton
				>
				<Bouton variante="texte" href="/univers/serments" fleche="→">Les Serments</Bouton>
			</div>
		{:else if data.etat === 'relie'}
			<h2 id="titre-arrivee">
				{#if data.personnage}{data.personnage}, la suite <em>t’appartient.</em>{:else}La suite <em
						>t’appartient.</em
					>{/if}
			</h2>
			<p class="lead">
				Ta fiche est ouverte. Retrouve ton Serment, ton équipement et ton journal, puis l’agenda
				pour préparer le prochain rendez-vous.
			</p>
			<div class="gestes">
				<Bouton variante="trait" href="/carnet/fiche" fleche="→">Ouvrir ma fiche</Bouton>
				<Bouton variante="texte" href="/carnet" fleche="→">Mon carnet</Bouton>
			</div>
		{:else if data.etat === 'indisponible'}
			<h2 id="titre-arrivee">Retrouvons ta <em>fiche.</em></h2>
			<p class="lead">
				Une liaison existe, mais ta fiche n’a pas pu s’ouvrir. Recharge&nbsp;; si ça persiste, donne
				ton pseudo à un administrateur sur Discord.
			</p>
			<div class="gestes">
				<Bouton variante="trait" href="/univers/premiers-pas" data-sveltekit-reload
					>Recharger cette page</Bouton
				>
			</div>
		{:else}
			<h2 id="titre-arrivee">Accompagner les premiers <em>pas.</em></h2>
			<p class="lead">
				Cette page raconte l’arrivée d’un joueur. La liaison entre un compte et un personnage relève
				d’un administrateur&nbsp;; un MJ ou un administrateur répond aux questions sur Discord.
			</p>
			<div class="gestes">
				{#if data.role === 'admin'}
					<Bouton variante="trait" href="/registre/comptes" fleche="→">Relier un compte</Bouton>
				{:else if data.role === 'mj'}
					<Bouton variante="trait" href="/table" fleche="→">Ouvrir La Table</Bouton>
				{:else if data.role === 'designer'}
					<Bouton variante="trait" href="/atelier/bestiaire" fleche="→">Ouvrir l’atelier</Bouton>
				{/if}
				{#if data.personnage}<Bouton variante="texte" href="/carnet" fleche="→">Mon carnet</Bouton
					>{/if}
			</div>
		{/if}
	</section>

	<Chapitre numero="01" titre="Du premier regard au premier récit" id="parcours">
		<p class="chapeau">Quatre étapes, du règlement au premier rendez-vous.</p>
		<ol class="etapes">
			{#snippet liens1()}
				<Bouton variante="texte" href="/univers/reglement" fleche="→">Le règlement</Bouton>
				<Bouton variante="texte" href="/univers/systeme" fleche="→">Le système de jeu</Bouton>
			{/snippet}
			{#snippet liens2()}
				<Bouton variante="texte" href="/entrer/inscription" fleche="→"
					>Lire le règlement et m’inscrire</Bouton
				>
			{/snippet}
			{#snippet liens4()}
				<Bouton variante="texte" href="/agenda" fleche="→">L’agenda</Bouton>
			{/snippet}
			{@render etape(
				1,
				'Découvrir le cadre',
				'Lis le règlement et le système de jeu. Le synopsis et les Serments t’aident à imaginer un personnage qui trouve sa place dans un monde où les constructions ont presque toutes disparu.',
				liens1
			)}
			{@render etape(
				2,
				'Créer ton compte',
				'L’inscription vient après la lecture du règlement. Ton compte ouvre le compagnon ; il ne crée pas ta fiche de personnage.',
				data.etat === 'visiteur' ? liens2 : null
			)}
			{@render etape(
				3,
				'Faire relier ton personnage',
				'Échange avec un administrateur sur le serveur Discord et transmets ton pseudo de compte. L’administrateur relie ton compte à ta fiche. Une fois la liaison faite, recharge le compagnon.',
				null
			)}
			{@render etape(
				4,
				'Préparer ta première aventure',
				'Ouvre ta fiche et les rendez-vous à venir. Quand un personnage est relié à ton compte et que les inscriptions sont ouvertes, tu t’inscris depuis l’agenda.',
				data.etat === 'relie' ? liens4 : null
			)}
		</ol>
	</Chapitre>

	<Chapitre numero="02" titre="Trois repères" id="reperes">
		<dl class="reperes">
			<div>
				<dt>Une fiche tenue par les MJ et les administrateurs</dt>
				<dd>
					Les statistiques et les conséquences sont tamponnées par un MJ ou un administrateur, selon
					ses droits. Ton inventaire te permet de déclarer une consommation&nbsp;: elle retire un
					exemplaire et garde une trace, sans appliquer ses effets en combat.
				</dd>
			</div>
			<div>
				<dt>Un journal partagé</dt>
				<dd>
					Le journal de ta fiche est lu par toi, les MJ et les administrateurs. Il accompagne ton
					personnage et ses aventures&nbsp;; ce n’est pas un carnet de notes réservé à toi seul.
				</dd>
			</div>
			<div>
				<dt>Discord est la table</dt>
				<dd>
					Le récit s’écrit dans les salons du serveur. Le compagnon reste posé à côté&nbsp;: il
					tient ta fiche, ton journal et l’agenda, il ne joue jamais à ta place.
				</dd>
			</div>
		</dl>
	</Chapitre>

	<Chapitre numero="03" titre="Avant de partir" id="avant-de-partir">
		<div class="questions">
			<h3>Mon compte est créé, pourquoi ma fiche est-elle absente&nbsp;?</h3>
			<p>
				La création du compte et sa liaison à un personnage sont deux étapes différentes. Tant qu’un
				administrateur n’a pas relié ton compte, tu lis l’univers et les règles, mais ta fiche et
				l’inscription aux rendez-vous attendent un personnage relié. Si la liaison est faite,
				recharge la page.
			</p>
			<h3>Comment rejoindre le serveur Discord&nbsp;?</h3>
			<p>
				Demande le lien d’invitation à un MJ ou un administrateur, ou à la personne qui t’a présenté
				Nuages Polaires. L’inscription sur le compagnon ne te fait pas rejoindre le serveur.
			</p>
			<h3>Qui contacter pour corriger ma fiche&nbsp;?</h3>
			<p>
				Écris à un MJ ou un administrateur sur Discord, avec ton pseudo et le nom de ton personnage.
				Un MJ ou un administrateur tamponne les conséquences selon ses droits&nbsp;; la liaison du
				compte et les ajustements de statistiques relèvent d’un administrateur.
			</p>
		</div>
		<p class="chute">Les liens se tissent dans les récits.</p>
	</Chapitre>

	{#snippet pied()}<Tourner previous={data.previous} next={data.next} />{/snippet}
</Page>

<style>
	.sommaire {
		--sommaire-reserve: calc(var(--ligne) * 8);
		margin-top: var(--ligne);
		padding-top: calc(var(--ligne) / 2);
		border-top: 1px solid var(--reglure);
	}
	.chapeau {
		width: 100%;
		margin-bottom: calc(var(--ligne) / 2);
	}

	/* ── Ton arrivée : le seul chapitre qui dépend du compte ── */
	.arrivee {
		position: relative;
		padding: var(--ligne) var(--ligne) calc(var(--ligne) - 1px);
		background: var(--page-2);
		border: 1px solid var(--reglure);
		outline: none;
		scroll-margin-top: calc(var(--ligne) * 3);
	}
	/* Une corne en haut à droite : la page qu'on a marquée pour soi. */
	.arrivee .repere {
		line-height: var(--ligne);
	}
	.arrivee h2 {
		margin-top: calc(var(--ligne) / 2);
		font: 500 34px / 38px var(--voix);
		font-variant-numeric: lining-nums tabular-nums;
		letter-spacing: -0.02em;
		color: var(--encre);
		text-wrap: balance;
	}
	.arrivee h2 em {
		font-style: italic;
		color: var(--encre-2);
	}
	.lead {
		max-width: var(--lecture);
		margin-top: calc(var(--ligne) / 2);
		font: var(--t-recit);
		font-variant-numeric: lining-nums tabular-nums;
		font-size: 20px;
		color: var(--encre);
	}
	.suite {
		max-width: var(--lecture);
		margin-top: calc(var(--ligne) / 2);
		font: var(--t-corps);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}
	.gestes {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 24px;
		margin-top: var(--ligne);
	}
	.pseudo-bloc {
		margin-top: var(--ligne);
		padding: calc(var(--ligne) / 2) 0 calc(var(--ligne) - 1px);
		border-block: 1px solid var(--reglure);
	}
	.pseudo-bloc .gestes {
		margin-top: 12px;
	}
	.pseudo {
		margin-top: 8px;
		font: 400 30px / 40px var(--mono);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
		overflow-wrap: anywhere;
	}
	.copie {
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}

	/* ── 01 Le parcours ── */
	.etapes {
		margin-top: calc(var(--ligne) / 2);
	}
	.etape {
		display: grid;
		grid-template-columns: calc(var(--ligne) * 2) minmax(0, 1fr);
		padding: calc(var(--ligne) / 2) 0 calc(var(--ligne) / 2 - 1px);
		border-bottom: 1px solid var(--reglure);
	}
	.etape:last-child {
		border-bottom: 0;
	}
	.rang {
		font: 400 32px / var(--ligne) var(--voix);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
		padding-top: 4px;
	}
	.etape.passee .rang {
		color: var(--encre-grise);
	}
	.etape.ici .rang {
		color: var(--encre-humide);
	}
	.etape h3 {
		font: 500 22px / var(--ligne) var(--voix);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
	}
	.etape p:not(.tu-es-ici) {
		max-width: var(--lecture);
		font: var(--t-liste);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}
	.tu-es-ici {
		display: flex;
		align-items: center;
		gap: 10px;
		font: var(--t-repere);
		font-variant-numeric: lining-nums tabular-nums;
		line-height: var(--ligne);
		letter-spacing: var(--approche-repere);
		text-transform: uppercase;
		color: var(--encre-humide);
	}
	.losange {
		flex: none;
		width: 5px;
		height: 5px;
		rotate: 45deg;
		background: var(--encre-humide);
	}
	.liens {
		display: flex;
		flex-wrap: wrap;
		gap: 0 24px;
	}
	.liens :global(.bouton) {
		padding-inline: 0;
	}

	/* ── 02 Trois repères ── */
	.reperes {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--ligne) var(--gouttiere);
		margin-top: var(--ligne);
	}
	.reperes div {
		padding-top: calc(var(--ligne) / 2);
		border-top: 1px solid var(--reglure);
	}
	dt {
		font: 500 20px / var(--ligne) var(--voix);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
		text-wrap: balance;
	}
	dd {
		margin-top: calc(var(--ligne) / 2);
		font: var(--t-liste);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}

	/* ── 03 Avant de partir ── */
	.questions {
		max-width: var(--lecture);
	}
	.questions h3 {
		margin-top: var(--ligne);
		font: 500 22px / var(--ligne) var(--voix);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
	}
	.questions p {
		margin-top: calc(var(--ligne) / 2);
		font: var(--t-corps);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}
	.chute {
		margin-top: calc(var(--ligne) * 2);
		padding-top: var(--ligne);
		border-top: 1px solid var(--reglure);
		font: italic 400 22px / var(--ligne) var(--voix);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}

	@media (max-width: 1100px) {
		.reperes {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 760px) {
		.arrivee {
			padding: var(--ligne) var(--gouttiere) calc(var(--ligne) - 1px);
			margin-inline: calc(var(--gouttiere) * -1);
			border-inline: 0;
		}
		.arrivee h2 {
			font-size: 30px;
			line-height: 34px;
		}
		.lead {
			font-size: 19px;
		}
		.pseudo {
			font-size: 24px;
			line-height: 34px;
		}
		.gestes {
			flex-direction: column;
			align-items: stretch;
		}
		.etape {
			grid-template-columns: calc(var(--ligne) + 16px) minmax(0, 1fr);
		}
		.rang {
			font-size: 26px;
		}
	}
</style>
