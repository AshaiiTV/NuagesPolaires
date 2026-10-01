<script lang="ts">
	import Masthead from '$lib/ui/Masthead.svelte';
	import Colophon from '$lib/ui/Colophon.svelte';
	import Boussole from '$lib/ui/Boussole.svelte';
	import Feuillet from '$lib/ui/Feuillet.svelte';
	import Tampon from '$lib/ui/Tampon.svelte';

	let { data } = $props();

	// Biais des feuillets posés : fixes, pour que la page soit la même à chaque visite.
	const biais = [-1.6, 1.1, -0.7];
</script>

<svelte:head>
	<title>Nuages Polaires — Le compagnon</title>
	<meta
		name="description"
		content="Le compagnon de Nuages Polaires, roleplay textuel dans un univers original, sur Discord. Un futur inconnu, une marque en vous, et tout ce qui reste à écrire, ensemble."
	/>
</svelte:head>

<a class="evitement" href="#contenu">Aller au contenu</a>

<div class="accueil">
	<Masthead />

	<main id="contenu" tabindex="-1">
		<section class="hero" aria-labelledby="titre-accueil">
			<img
				class="paysage"
				src="/images/nuages-polaires-horizon.jpg"
				width="1672"
				height="941"
				alt="Un vaste paysage naturel se dessine sous d’immenses nuages blancs, éclairés d’une lueur froide."
				fetchpriority="high"
			/>
			<div class="voile" aria-hidden="true"></div>
			<div class="texte">
				<p class="repere signal"><span class="losange" aria-hidden="true"></span>Roleplay textuel · Univers original</p>
				<h1 id="titre-accueil">Nuages<br /><em>Polaires.</em></h1>
				<p class="accroche">Le monde attend.<br />Votre histoire commence.</p>
				<p class="description">Un futur inconnu. Une marque en vous.<br />Et tout ce qui reste à écrire, ensemble.</p>
				<div class="actions">
					<a class="action principale" href="/entrer/inscription">Rejoindre l’aventure <span aria-hidden="true">↗</span></a>
					<a class="action discrete" href="#univers">Découvrir l’univers <span aria-hidden="true">↓</span></a>
				</div>
				<p class="plateforme">
					Une histoire collective, sur Discord.
					<a href="/univers/premiers-pas">Comment commencer ?</a>
				</p>
			</div>
			<p class="coordonnee repere" aria-hidden="true"><span>NP / 01</span><i></i><span>Après le basculement</span></p>
			<p class="legende"><span class="filet" aria-hidden="true"></span><span>« Le monde n’est pas mort.<br /><em>Il attend.</em> »</span></p>
		</section>

		<section class="dernieres" aria-labelledby="titre-dernieres">
			<header>
				<p class="repere">Les traces de notre passage</p>
				<h2 id="titre-dernieres">Un monde qui s’écrit à plusieurs.</h2>
			</header>
			{#if data.leaves === null}
				<p class="voix muet">Les dernières pages reviendront quand le serveur répondra.</p>
			{:else if data.leaves.length === 0}
				<div class="feuillets seul">
					<Feuillet blanc biais={-1.2}>Les récits restent à écrire.</Feuillet>
				</div>
			{:else}
				<div class="feuillets">
					{#each data.leaves as leaf, i (leaf.id)}
						<Feuillet marge={leaf.margin} titre={leaf.title} href={leaf.href ?? undefined} biais={biais[i % biais.length]}>
							{leaf.excerpt}
							{#snippet pied()}
								{#if leaf.stamp}<Tampon cle={leaf.id} support="papier">{leaf.stamp}</Tampon>{/if}
							{/snippet}
						</Feuillet>
					{/each}
				</div>
			{/if}
		</section>

		<section class="page" id="univers" aria-labelledby="titre-univers">
			<aside class="marge">
				<p class="repere"><span class="numero">01</span>L’univers</p>
				<p class="marginal">Le passé s’est dérobé.<br />Le reste vous appartient.</p>
			</aside>
			<div class="corps">
				<h2 id="titre-univers">Tout commence<br /><em>après la chute.</em></h2>
				<div class="recit">
					<p>L’Argonaute a perdu. Le Dimenséa a changé de mains. Alors les nuages ont couvert le ciel, et la réalité s’est pliée.</p>
					<p>
						L’humanité s’éveille dans un futur lointain. Les anciens repères se sont effacés. Un horizon méconnaissable s’étend
						dans le silence. Parmi les survivants, certains portent une marque intérieure : un <strong>Serment</strong>.
					</p>
					<p class="chute">Ce qui reste à écrire dépend de ceux qui se relèvent.</p>
				</div>
				<a class="lien-fleche" href="/univers/synopsis">Lire le synopsis <span aria-hidden="true">↗</span></a>
			</div>
		</section>

		<section class="page serments" id="serments" aria-labelledby="titre-serments">
			<aside class="marge">
				<p class="repere"><span class="numero">02</span>Les Serments</p>
				<div class="orbite" aria-hidden="true">
					<span class="cercle"></span>
					<Boussole taille={180} variante="discrete" />
					<span class="devise repere">Le lien · Le choix · La trace</span>
				</div>
			</aside>
			<div class="corps">
				<p class="repere">Ce qui vous lie à ce monde</p>
				<h2 id="titre-serments">Une marque.<br /><em>Un chemin.</em></h2>
				<blockquote>« Nul ne choisit son Serment.<br />C’est le Serment qui reconnaît son porteur. »</blockquote>
				<p class="texte-serments">
					Votre Serment grandit à travers vos choix, vos sorties et vos combats. Ici, votre personnage se construit autant
					dans l’histoire que vous écrivez que dans les pouvoirs qu’il découvre.
				</p>
				{#if data.oaths.length}
					<ul class="liste-serments">
						{#each data.oaths as oath (oath.id)}
							<li>
								<a href="/univers/serments/{oath.id}">
									<span class="nom-serment">{oath.name}</span>
									<span class="arme">{oath.weapon}</span>
									<span class="categorie repere">{oath.category}</span>
								</a>
							</li>
						{/each}
					</ul>
				{/if}
				<a class="lien-fleche" href="/entrer/inscription">Faire le premier pas <span aria-hidden="true">↗</span></a>
			</div>
		</section>

		<section class="invitation" aria-labelledby="titre-invitation">
			<p class="repere">La suite n’est pas encore écrite</p>
			<h2 id="titre-invitation">Laissez votre trace.</h2>
			<p>Découvrez les règles, créez votre compte et rejoignez une histoire collective.</p>
			<a class="action principale" href="/entrer/inscription">Commencer l’aventure <span aria-hidden="true">↗</span></a>
		</section>
	</main>

	<Colophon discord={data.discord} />
</div>

<style>
	/* L'accueil public garde la palette de marque : il ignore les thèmes personnels. */
	.accueil {
		--bureau: #091519;
		--page: #102327;
		--encre: #f0eee5;
		--encre-2: #bdcdc8;
		--encre-grise: #92aaa3;
		--encre-humide: #95cdbb;
		--tampon: #c6b38b;
		--ruban: #c6d8c4;
		--filet: rgb(212 228 221 / 0.12);
		background: var(--bureau);
		color: var(--encre);
		overflow: clip;
		min-height: 100svh;
	}
	main {
		outline: none;
	}
	em {
		font-style: italic;
	}

	/* ── Hero ─────────────────────────────────────────────────────────── */
	.hero {
		position: relative;
		min-height: 685px;
		max-width: 1800px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		overflow: hidden;
	}
	.paysage {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center 55%;
		opacity: 0.94;
		pointer-events: none;
	}
	.voile {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(90deg, rgb(9 21 25 / 0.44), transparent 74%),
			linear-gradient(0deg, #091519, transparent 20%, transparent 90%, rgb(9 21 25 / 0.33));
		pointer-events: none;
	}
	.texte {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 1600px;
		margin: 0 auto;
		padding: 54px 6% 96px;
	}
	.signal {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 24px;
		color: #a6c1b8;
	}
	.losange {
		width: 5px;
		height: 5px;
		background: var(--encre-humide);
		rotate: 45deg;
		flex: none;
	}
	h1 {
		margin-bottom: 28px;
		font: 400 clamp(76px, 7.8vw, 120px) / 0.83 var(--voix);
		letter-spacing: -0.045em;
	}
	h1 em {
		color: #d3ded2;
		letter-spacing: -0.04em;
	}
	.accroche {
		margin-bottom: 14px;
		font: 400 clamp(22px, 2.3vw, 31px) / 1.15 var(--voix);
	}
	.description {
		max-width: 400px;
		margin-bottom: 28px;
		font: 400 15px/28px var(--corps);
		color: var(--encre-2);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 16px;
	}
	.action {
		min-height: 52px;
		padding: 15px 22px;
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: 30px;
		border-radius: var(--rayon);
		font: 600 14px/20px var(--corps);
		text-decoration: none;
		transition:
			background 200ms,
			translate 200ms;
	}
	.action span {
		font: 400 20px/1 var(--corps);
	}
	.action.principale {
		background: var(--ruban);
		border: 1px solid var(--ruban);
		color: #102327;
	}
	.action.principale:hover {
		background: #e0e8d8;
		border-color: #e0e8d8;
		translate: 0 -2px;
	}
	.action.discrete {
		background: rgb(9 21 25 / 0.19);
		border: 1px solid rgb(212 228 221 / 0.19);
		color: #e5e9df;
	}
	.action.discrete:hover {
		background: rgb(149 205 187 / 0.08);
	}
	.plateforme {
		margin-top: 16px;
		font: 400 13px/20px var(--corps);
		color: #a7bdb4;
	}
	.plateforme a {
		display: inline-block;
		padding: 12px 0;
		color: var(--encre);
	}
	.coordonnee {
		position: absolute;
		left: 6%;
		bottom: 24px;
		display: flex;
		align-items: center;
		gap: 16px;
		color: var(--encre-grise);
	}
	.coordonnee i {
		width: 46px;
		height: 1px;
		background: rgb(146 170 163 / 0.33);
	}
	.legende {
		position: absolute;
		right: 6%;
		bottom: 90px;
		display: flex;
		align-items: flex-start;
		gap: 20px;
		font: 400 24px/1.2 var(--voix);
		text-shadow: 0 2px 12px #000;
	}
	.legende .filet {
		width: 32px;
		height: 1px;
		margin-top: 15px;
		background: var(--tampon);
	}
	.legende em {
		color: var(--ruban);
	}

	/* ── Dernières pages ──────────────────────────────────────────────── */
	.dernieres {
		width: 88%;
		max-width: 1408px;
		margin: 0 auto;
		padding: 56px 0 84px;
		border-top: 1px solid var(--filet);
		display: grid;
		grid-template-columns: 34fr 66fr;
		gap: 28px var(--gouttiere);
		align-items: start;
	}
	.dernieres header h2 {
		margin-top: 12px;
		font: 400 28px/34px var(--voix);
		color: #d0dad1;
		max-width: 12em;
	}
	.feuillets {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 28px;
	}
	.feuillets.seul {
		grid-template-columns: minmax(0, 420px);
	}
	.muet {
		padding-top: 12px;
	}

	/* ── Pages 01 et 02 : marge à gauche, corps à droite ──────────────── */
	.page {
		width: 88%;
		max-width: 1408px;
		margin: 0 auto;
		padding: 84px 0;
		border-top: 1px solid var(--filet);
		display: grid;
		grid-template-columns: 34fr 66fr;
		gap: 28px var(--gouttiere);
	}
	.marge .repere {
		display: flex;
		align-items: center;
		gap: 14px;
		color: #a6c1b8;
	}
	.numero {
		padding-right: 14px;
		border-right: 1px solid rgb(149 205 187 / 0.19);
		color: var(--tampon);
	}
	.marginal {
		margin-top: 56px;
		padding-left: 18px;
		border-left: 1px solid rgb(198 179 139 / 0.38);
		font: 400 15px/28px var(--corps);
		color: var(--encre-grise);
	}
	.page h2,
	.invitation h2 {
		font: 400 clamp(38px, 4vw, 61px) / 1 var(--voix);
		letter-spacing: -0.025em;
	}
	.page h2 em {
		color: #b8d1bf;
	}
	.recit {
		max-width: var(--lecture);
		margin-top: 28px;
	}
	.recit p {
		margin-bottom: 28px;
		font: 400 20px/28px var(--voix);
		color: var(--encre-2);
	}
	.recit strong {
		font-weight: 600;
		color: #e2e8dc;
	}
	.recit .chute {
		margin-bottom: 0;
		font: italic 400 25px/28px var(--voix);
		color: var(--tampon);
	}
	.lien-fleche {
		display: inline-flex;
		align-items: center;
		gap: 40px;
		min-height: var(--cible);
		margin-top: 28px;
		padding: 12px 0;
		border-bottom: 1px solid rgb(149 205 187 / 0.38);
		font: 500 14px/20px var(--corps);
		color: #dbe8de;
		text-decoration: none;
	}
	.lien-fleche:hover {
		color: #fff;
		border-bottom-color: #dbe8de;
	}

	/* ── 02 Les Serments ──────────────────────────────────────────────── */
	.orbite {
		position: relative;
		margin-top: 56px;
		width: min(100%, 300px);
		aspect-ratio: 1;
		display: grid;
		place-items: center;
	}
	.cercle {
		position: absolute;
		inset: 8%;
		border: 1px solid rgb(149 205 187 / 0.13);
		border-radius: 50%;
	}
	.cercle::before {
		content: '';
		position: absolute;
		top: 13%;
		left: 13%;
		width: 6px;
		height: 6px;
		background: var(--tampon);
		rotate: 45deg;
	}
	.devise {
		position: absolute;
		bottom: -8px;
		white-space: nowrap;
		color: var(--encre-grise);
	}
	.serments .corps > .repere {
		margin-bottom: 22px;
		color: #a6c1b8;
	}
	blockquote {
		margin: 28px 0;
		font: italic 400 24px/28px var(--voix);
		color: var(--tampon);
	}
	.texte-serments {
		max-width: var(--lecture);
		font: 400 16px/28px var(--corps);
		color: var(--encre-2);
	}
	.liste-serments {
		margin-top: 28px;
		border-top: 1px solid var(--filet);
		columns: 2;
		column-gap: var(--gouttiere);
	}
	.liste-serments li {
		break-inside: avoid;
		border-bottom: 1px solid var(--filet);
	}
	.liste-serments a {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: baseline;
		gap: 0 12px;
		min-height: 56px;
		padding: 8px 0;
		text-decoration: none;
	}
	.nom-serment {
		font: 500 22px/28px var(--voix);
		color: var(--encre);
	}
	.arme {
		grid-column: 1;
		font: 400 13px/20px var(--corps);
		color: var(--encre-grise);
	}
	.categorie {
		grid-row: 1;
		grid-column: 2;
		color: var(--encre-grise);
		letter-spacing: 0.12em;
	}
	.liste-serments a:hover .nom-serment {
		color: var(--encre-humide);
	}

	/* ── Invitation ───────────────────────────────────────────────────── */
	.invitation {
		padding: 84px 20px;
		border-block: 1px solid var(--filet);
		text-align: center;
	}
	.invitation .repere {
		margin-bottom: 20px;
		color: #a6c1b8;
	}
	.invitation p:not(.repere) {
		max-width: 420px;
		margin: 18px auto 28px;
		font: 400 16px/28px var(--corps);
		color: var(--encre-2);
	}

	@media (min-width: 1600px) {
		.texte {
			padding-left: 96px;
		}
	}
	@media (max-width: 1100px) {
		.dernieres,
		.page {
			grid-template-columns: 26fr 74fr;
		}
		.feuillets {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.legende {
			right: 5%;
			bottom: 100px;
		}
	}
	@media (max-width: 760px) {
		.hero {
			min-height: 760px;
			align-items: flex-start;
		}
		.paysage {
			object-position: 65% center;
			opacity: 0.76;
		}
		.voile {
			background:
				linear-gradient(90deg, rgb(9 21 25 / 0.62), rgb(9 21 25 / 0.03)),
				linear-gradient(180deg, rgb(9 21 25 / 0.33), transparent 50%, #091519 99%);
		}
		.texte {
			padding: 52px 6% 190px;
		}
		.signal {
			letter-spacing: 0.12em;
		}
		h1 {
			font-size: clamp(74px, 16vw, 110px);
			line-height: 0.85;
		}
		.accroche {
			font-size: 29px;
		}
		.actions {
			align-items: stretch;
			gap: 10px;
			max-width: 360px;
		}
		.actions .action {
			width: 100%;
		}
		.action.discrete {
			background: rgb(9 21 25 / 0.4);
		}
		.legende {
			right: 6%;
			bottom: 64px;
			font-size: 22px;
		}
		.coordonnee {
			gap: 10px;
			bottom: 14px;
			letter-spacing: 0.1em;
		}
		.dernieres,
		.page {
			display: block;
			padding: 56px 0;
		}
		.dernieres header {
			margin-bottom: 28px;
		}
		.feuillets,
		.feuillets.seul {
			grid-template-columns: 1fr;
			gap: 16px;
		}
		.marginal,
		.orbite {
			display: none;
		}
		.marge {
			margin-bottom: 28px;
		}
		.page h2,
		.invitation h2 {
			font-size: 45px;
		}
		.liste-serments {
			columns: 1;
		}
		.invitation {
			padding: 56px 16px;
		}
	}
</style>
