<script lang="ts">
	// La page d'un Serment : cartouche d'identité en marge (catégorie, rang, arme, croissance),
	// lore en Cormorant sous le titre, deux branches lues comme des chapitres (A, B), quatre paliers en lignes de carnet.
	import Bouton from '$lib/ui/Bouton.svelte';
	import Page from '$lib/ui/Page.svelte';
	import Sceau from '$lib/ui/Sceau.svelte';
	import Losange from '$lib/ui/Losange.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import Depliant from '../../Depliant.svelte';
	import Sommaire from '../../Sommaire.svelte';
	import Tourner from '../../Tourner.svelte';
	import { typo } from '../../typo';
	import { OATH_CATEGORY_LABELS, STYLE_COLORS } from '$lib/game/oaths';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	let calque = $state(false);

	// STYLE_COLORS donne des clés héritées (« red », « glacier »…), pas des couleurs : seules celles
	// qui ont une teinte de sens dans les tokens sont rendues ; les autres gardent un losange neutre.
	const TEINTES: Record<string, string> = {
		red: 'var(--rouille)',
		glacier: 'var(--encre-humide)',
		green: 'var(--ruban)'
	};

	const branches = $derived(
		data.oath.branches.map((branch, i) => {
			const lu = /^Branche\s+(\S+)\s+[—–-]\s+(.+)$/.exec(branch.label);
			// Dernier palier atteint par le lecteur relié, s'il suit cette branche.
			const atteint =
				data.tuEsIci !== null && data.readerBranch === branch.label
					? branch.tiers.reduce(
							(dernier, tier, t) => (tier.level <= data.tuEsIci! ? t : dernier),
							-1
						)
					: -1;
			return {
				id: 'branche-' + i,
				lettre: lu?.[1] ?? String.fromCharCode(65 + i),
				titre: typo(lu?.[2] ?? branch.label),
				style: branch.style,
				teinte: TEINTES[STYLE_COLORS[branch.style] ?? ''] ?? 'var(--encre-2)',
				corps: branch.physical,
				recit: branch.flavor,
				atteint,
				// Étape d'un palier : « I Éveil » se lit « I · Éveil ».
				paliers: branch.tiers.map((tier) => {
					const etape = /^([IVX]+)\s+(.+)$/.exec(tier.stage);
					return { ...tier, chiffre: etape?.[1] ?? tier.stage, libelle: etape?.[2] ?? '' };
				})
			};
		})
	);

	const sections = $derived([
		...(data.oath.lore ? [{ id: 'lore', title: 'Lore', level: 2 }] : []),
		...branches.map((branch) => ({
			id: branch.id,
			numero: branch.lettre,
			title: branch.titre,
			level: 2
		}))
	]);
</script>

<svelte:head>
	<title>{typo(data.oath.name)} — Nuages Polaires</title>
	<meta name="description" content={typo(data.oath.lore)} />
</svelte:head>

{#snippet identite()}
	<div class="sceau-serment"><Sceau serment={data.oath.name} taille={88} /></div>
	<dl class="cartouche">
		<div class="entete">
			<dt class="sr-only">Catégorie</dt>
			<dd class="repere">{OATH_CATEGORY_LABELS[data.oath.category]}</dd>
			<dt class="sr-only">Rang</dt>
			<dd class="rang">{data.oath.rankLabel}</dd>
		</div>
		<div class="ligne">
			<dt class="repere">Arme</dt>
			<dd class="arme">{typo(data.oath.weapon)}</dd>
		</div>
		{#if data.oath.lineage}
			<div class="ligne">
				<dt class="repere">Lignée</dt>
				<dd class="valeur">Évolution de {typo(data.oath.lineage)}</dd>
			</div>
		{/if}
		<div class="ligne">
			<dt class="repere">Croissance</dt>
			<dd class="valeur croissance chiffres">
				<span>+{data.oath.growth.pvN} PV</span><span>+{data.oath.growth.epN} EP</span><span
					>+{data.oath.growth.emN} EM par niveau</span
				><span>frappe {data.oath.baseDamage}</span>
			</dd>
		</div>
	</dl>
{/snippet}

{#snippet interrupteur()}{#if data.oath.reserved}<label class="interrupteur"
			><input
				type="checkbox"
				role="switch"
				bind:checked={calque}
				aria-controls="calque-reserve"
			/>Calque</label
		>{/if}{/snippet}
<Page repere="NP / 05 — L’univers" titre={typo(data.oath.name)} grain>
	{#snippet marge()}
		{@render identite()}
		{@render interrupteur()}
		<div class="sommaire"><Sommaire {sections} /></div>
	{/snippet}
	{#snippet bande()}
		<div class="bande">
			{@render identite()}
			{@render interrupteur()}
			<Depliant libelle="Sommaire"><Sommaire {sections} /></Depliant>
		</div>
	{/snippet}

	<div class="sceau-fond" aria-hidden="true">
		<Sceau serment={data.oath.name} taille={240} nu />
	</div>
	{#if data.oath.lore}
		<!-- Le lore ouvre la page, entier, sous le titre : il tient lieu de chapeau. -->
		<section class="ouverture" id="lore">
			<h2 class="sr-only">Lore</h2>
			<p class="lore">{typo(data.oath.lore)}</p>
		</section>
	{/if}

	{#if data.oath.reserved && calque}
		<aside class="calque" id="calque-reserve" aria-label="Calque réservé">
			<p class="repere">
				Calque réservé · {data.oath.reserved.hidden || data.oath.rank !== 'basic'
					? 'Hors vitrine'
					: 'En vitrine'}
			</p>
			<Bouton variante="texte" href={`/atelier/serments/${data.oath.id}`} fleche="→"
				>Modifier dans l’Atelier</Bouton
			>
		</aside>
	{/if}
	{#if !branches.length}<Vide>Aucune branche définie.</Vide>{/if}
	{#each branches as branch (branch.id)}
		<section class="chapitre branche" id={branch.id}>
			<header>
				<span class="numero"><span class="mot">Branche </span>{branch.lettre}</span>
				<h2>{branch.titre}</h2>
				{#if branch.style}<span class="style"
						><Losange couleur={branch.teinte} libelle={branch.style} /></span
					>{/if}
			</header>
			{#if branch.corps}<p class="physique">{typo(branch.corps)}</p>{/if}
			{#if branch.recit}<p class="recit">{typo(branch.recit)}</p>{/if}
			<ol class="paliers">
				{#each branch.paliers as tier, i (i)}
					{@const ici = branch.atteint === i}
					<li class="palier" class:ici>
						<div class="jalon">
							<p class="niveau chiffres">niv. <b>{tier.level}</b></p>
							<p class="etape">
								{tier.chiffre}{#if tier.libelle}<span class="point" aria-hidden="true">·</span><span
										class="sr-only">,</span
									>
									{tier.libelle}{/if}
							</p>
							{#if ici}
								<p class="marque-ici"><span class="losange" aria-hidden="true"></span>tu es ici</p>
							{/if}
						</div>
						<div class="ecrit">
							<div class="tete">
								<h3>{typo(tier.name)}</h3>
								{#if tier.cost}<p class="cout chiffres">{typo(tier.cost)}</p>{/if}
							</div>
							<p class="effet">{typo(tier.description)}</p>
						</div>
					</li>
				{/each}
			</ol>
		</section>
	{/each}

	{#snippet pied()}<Tourner previous={data.previous} next={data.next} serments />{/snippet}
</Page>

<style>
	.sceau-fond {
		position: absolute;
		top: 32px;
		right: 32px;
		pointer-events: none;
		color: var(--reglure);
	}
	@media (max-width: 760px), print {
		.sceau-fond {
			display: none;
		}
	}
	.calque {
		margin: var(--ligne) 0 var(--ligne) 8px;
		padding-left: 16px;
		border-left: 1px solid var(--reglure);
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		line-height: var(--ligne);
		color: var(--encre-2);
	}
	.interrupteur {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: var(--cible);
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}

	.interrupteur input {
		accent-color: var(--encre-humide);
		width: 18px;
		height: 18px;
	}
	/* ── Cartouche d'identité ─────────────────────────────────────────── */
	/* Le sceau du Serment ouvre la marge, en encre : le laiton reste au rang. */
	.sceau-serment {
		padding-bottom: calc(var(--ligne) / 2);
		color: var(--encre);
	}
	.cartouche {
		border-top: 1px solid var(--reglure);
	}
	.entete,
	.ligne {
		padding: calc(var(--ligne) / 2) 0 calc(var(--ligne) / 2 - 1px);
		border-bottom: 1px solid var(--reglure);
	}
	.entete {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0 16px;
	}
	.cartouche .repere {
		line-height: var(--ligne);
	}
	.entete .repere {
		color: var(--encre);
	}
	.rang {
		font: var(--t-repere);
		font-variant-numeric: lining-nums tabular-nums;
		line-height: var(--ligne);
		letter-spacing: var(--approche-repere);
		text-transform: uppercase;
		color: var(--tampon);
	}
	.arme {
		font: 500 22px / var(--ligne) var(--voix);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
	}
	.valeur {
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		line-height: var(--ligne);
		color: var(--encre);
	}
	.croissance {
		display: flex;
		flex-wrap: wrap;
	}
	.croissance span {
		white-space: nowrap;
	}
	.croissance span:not(:last-child)::after {
		content: '·';
		margin: 0 0.45em;
		color: var(--encre-2);
	}
	.sommaire {
		margin-top: calc(var(--ligne) / 2);
	}
	.bande {
		width: 100%;
	}

	/* ── Chapitres ────────────────────────────────────────────────────── */
	.chapitre {
		margin-top: calc(var(--ligne) * 2);
		scroll-margin-top: calc(var(--ligne) * 3);
		overflow-wrap: break-word;
		outline: none;
	}
	.ouverture {
		scroll-margin-top: calc(var(--ligne) * 3);
		overflow-wrap: break-word;
		outline: none;
	}
	header {
		display: flex;
		align-items: baseline;
		gap: 14px;
		min-height: calc(var(--ligne) * 2);
		padding: calc(var(--ligne) / 2) 0 calc(var(--ligne) / 2 - 1px);
		border-bottom: 1px solid var(--reglure);
	}
	h2 {
		font: 500 28px / var(--ligne) var(--voix);
		font-variant-numeric: lining-nums tabular-nums;
		letter-spacing: -0.01em;
		color: var(--encre);
	}
	/* La lettre de la branche tient lieu de numéro de chapitre : Cormorant pour un signe seul. */
	.numero {
		flex: none;
		font: 500 22px / var(--ligne) var(--voix);
		font-variant-numeric: lining-nums tabular-nums;
		letter-spacing: 0.04em;
		color: var(--encre-2);
	}
	.mot {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}
	.style {
		margin-left: auto;
		align-self: center;
	}

	/* Lore : la première ligne en capitales espacées, comme une attaque de chapitre. */
	.lore {
		max-width: var(--lecture);
		font: var(--t-recit);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
		white-space: pre-line;
	}
	.lore::first-line {
		font-size: 14px;
		font-weight: 500;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}
	.physique {
		max-width: var(--lecture);
		margin-top: var(--ligne);
		font: var(--t-corps);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
		white-space: pre-line;
	}
	/* Texte narratif : la voix du carnet, un filet de marge. */
	.recit {
		max-width: var(--lecture);
		margin-top: var(--ligne);
		padding-left: 20px;
		border-left: 1px solid color-mix(in srgb, var(--encre-2) 40%, transparent);
		font: var(--t-recit);
		font-variant-numeric: lining-nums tabular-nums;
		font-style: italic;
		color: var(--encre-2);
		white-space: pre-line;
	}

	/* ── Paliers : quatre lignes de carnet ────────────────────────────── */
	.paliers {
		margin-top: var(--ligne);
		border-top: 1px solid var(--reglure);
	}
	.palier {
		display: grid;
		grid-template-columns: 132px minmax(0, 1fr);
		column-gap: var(--gouttiere);
		padding: calc(var(--ligne) / 2) 0 calc(var(--ligne) / 2 - 1px);
		border-bottom: 1px solid var(--reglure);
	}
	.niveau {
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		line-height: var(--ligne);
		color: var(--encre-2);
	}
	.niveau b {
		font-weight: 600;
		color: var(--encre);
	}
	.etape,
	.cout {
		font: var(--t-repere);
		font-variant-numeric: lining-nums tabular-nums;
		line-height: var(--ligne);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--encre-2);
	}
	.point {
		margin: 0 0.1em 0 0.35em;
	}
	.marque-ici {
		display: flex;
		align-items: center;
		gap: 8px;
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		line-height: var(--ligne);
		color: var(--encre-humide);
	}
	.losange {
		width: 5px;
		height: 5px;
		rotate: 45deg;
		background: var(--encre-humide);
	}
	.tete {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0 16px;
	}
	h3 {
		font: 500 22px / var(--ligne) var(--voix);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
	}
	.tete h3 {
		flex: none;
		max-width: 100%;
	}
	/* Un coût long (« 12 EM — coûte toutes les actions restantes du tour ») passe à la ligne,
	   calé à droite comme les autres. */
	.cout {
		flex: 1 1 0;
		min-width: 0;
		white-space: normal;
		text-wrap: balance;
		text-align: right;
	}
	.effet {
		max-width: var(--lecture);
		font: var(--t-corps);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
		white-space: pre-line;
	}

	@media (max-width: 760px) {
		/* La bande : catégorie et rang, arme, croissance — sans libellés. */
		.cartouche {
			border-top: 0;
		}
		.entete {
			padding-top: 0;
			justify-content: flex-start;
		}
		.ligne {
			padding: calc(var(--ligne) / 2) 0 0;
			border-bottom: 0;
		}
		.ligne:last-child {
			padding-top: 0;
			padding-bottom: calc(var(--ligne) / 2);
		}
		.ligne dt {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip: rect(0 0 0 0);
			white-space: nowrap;
		}
		.valeur {
			color: var(--encre-2);
		}
		/* Branche : la lettre en laiton au-dessus du nom, le style dessous. */
		.branche header {
			display: block;
		}
		.numero {
			display: block;
			font: var(--t-repere);
			font-variant-numeric: lining-nums tabular-nums;
			line-height: var(--ligne);
			letter-spacing: var(--approche-repere);
			text-transform: uppercase;
		}
		.mot {
			position: static;
			width: auto;
			height: auto;
			margin-right: 0.5em;
			clip: auto;
		}
		.style {
			display: block;
			line-height: var(--ligne);
		}
		.palier {
			grid-template-columns: minmax(0, 1fr);
		}
		.cout {
			flex-basis: 100%;
			text-align: left;
		}
		.jalon {
			display: flex;
			flex-wrap: wrap;
			align-items: baseline;
			gap: 0 16px;
		}
		.etape {
			margin-left: auto;
		}
		.marque-ici {
			order: 3;
			width: 100%;
		}
	}
</style>
