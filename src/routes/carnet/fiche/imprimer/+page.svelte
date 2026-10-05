<script lang="ts">
	// La fiche à imprimer (03-vision §5.4 « Exporter cette fiche (PDF) »). Une feuille seule aux couleurs
	// de Mystique polaire : bandeau de nuit d'encre, filet d'aurore, papier ivoire, tampons en laiton.
	// Le navigateur l'imprime ou l'enregistre en PDF ; aucune bibliothèque, aucune requête en plus.
	import Bouton from '$lib/ui/Bouton.svelte';
	import Losange from '$lib/ui/Losange.svelte';
	import Portrait from '$lib/ui/Portrait.svelte';
	import { dateCourte, dateHeure, heure } from '$lib/ui/dates';
	import { palierAtteint, palierSuivant } from '$lib/ui/scene/paliers';
	import { signataire } from '../signature';
	import { EQUIPMENT_LABELS, EQUIPMENT_SLOTS, ITEM_CATEGORIES, RESOURCES } from '$lib/schemas/characters';
	import type { ConsequenceView } from '$lib/schemas/characters';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const fiche = $derived(data.vue.sheet);
	const consequences = $derived(data.vue.consequences);

	const NOMS = { pv: 'Points de Vie', ep: 'Énergie Physique', em: 'Énergie Magique' } as const;
	const signe = (n: number) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);
	const part = (cur: number, max: number) => (max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0);

	const groupes = $derived.by(() => {
		const ordre: string[] = [...ITEM_CATEGORIES];
		for (const i of fiche.items) if (!ordre.includes(i.category)) ordre.push(i.category);
		return ordre.map((c) => ({ categorie: c, objets: fiche.items.filter((i) => i.category === c) })).filter((g) => g.objets.length);
	});

	function qui(c: ConsequenceView): string {
		if (c.stamp) return `${signataire(c.stamp)} · ${heure(c.at)}`;
		if (c.signature === 'toi') return 'toi';
		if (c.signature === 'regles') return 'règles';
		return '';
	}
	const valeurs = (c: ConsequenceView) => !!c.replacesId && c.oldValue !== null && c.newValue !== null && c.oldValue !== c.newValue;

	function imprimer() {
		window.print();
	}
</script>

<svelte:head><title>{fiche.name} — fiche à imprimer</title></svelte:head>

<div class="bureau">
	<nav class="outils" aria-label="Exporter la fiche">
		<Bouton variante="texte" href="/carnet/fiche">← Revenir à ma fiche</Bouton>
		<Bouton variante="ruban" onclick={imprimer}>Imprimer / enregistrer en PDF</Bouton>
	</nav>

	<article class="feuille">
		<header class="bandeau">
			<div class="bandeau-texte">
				<p class="coordonnee">Nuages Polaires · fiche de personnage</p>
				<h1>{fiche.name}</h1>
				<p class="serment">{fiche.oath.name} · <span class="rang">{fiche.oath.rankLabel}</span> · niveau <span class="chiffres">{fiche.level}</span></p>
				<p class="exporte chiffres">Exportée le {dateHeure(data.vue.exportedAt)} · relevé du {dateCourte(fiche.releveAt)}, {heure(fiche.releveAt)}</p>
			</div>
			<div class="portrait"><Portrait nom={fiche.name} src={fiche.portraitUrl || null} taille={104} /></div>
		</header>

		<div class="deux">
			<section class="bloc">
				<h2><span class="num">01</span> Ressources</h2>
				<table class="ressources">
					<tbody>
						{#each RESOURCES as r (r)}
							<tr>
								<th scope="row"><span class="abr">{r.toUpperCase()}</span> {NOMS[r]}</th>
								<td class="chiffres valeur">{fiche[r].cur}<span class="max">/{fiche[r].max}</span></td>
							</tr>
							<tr class="trait-ligne" aria-hidden="true">
								<td colspan="2"><span class="trait"><span class="encre-trait" style:width="{part(fiche[r].cur, fiche[r].max)}%"></span></span></td>
							</tr>
							{#if fiche.pendingDeclared[r] !== 0}
								<tr class="declare"><td colspan="2" class="chiffres">{signe(fiche.pendingDeclared[r])} {r.toUpperCase()} déclaré, attend un MJ</td></tr>
							{/if}
						{/each}
					</tbody>
				</table>
				<p class="xp chiffres">{#if fiche.xpMax > 0}{fiche.xp} / {fiche.xpMax} XP{:else}{fiche.xp} XP{/if}</p>
			</section>

			<section class="bloc">
				<h2>Statuts et gemmes</h2>
				<p class="libelle">Statuts</p>
				{#if fiche.statuses.length}
					<ul class="sens">{#each fiche.statuses as s (s.id)}<li><Losange couleur={s.color} libelle={s.label} /></li>{/each}</ul>
				{:else}
					<p class="rien">Aucun statut en cours.</p>
				{/if}
				<p class="libelle">Gemmes</p>
				{#if fiche.gems.length}
					<ul class="sens">{#each fiche.gems as g (g.kind)}<li><Losange couleur={g.color} libelle={g.label} detail={`×${g.qty}`} /></li>{/each}</ul>
				{:else}
					<p class="rien">Aucune gemme.</p>
				{/if}
			</section>
		</div>

		<section class="bloc">
			<h2><span class="num">02</span> Équipement et inventaire</h2>
			<dl class="emplacements">
				{#each EQUIPMENT_SLOTS as slot (slot)}
					<div><dt>{EQUIPMENT_LABELS[slot]}</dt><dd class:rien={!fiche.equipment[slot]}>{fiche.equipment[slot] || 'rien'}</dd></div>
				{/each}
			</dl>
			{#if groupes.length}
				<div class="inventaire">
					{#each groupes as g (g.categorie)}
						<div class="categorie">
							<p class="libelle">{g.categorie}</p>
							<ul>
								{#each g.objets as i (i.id)}
									<li><span>{i.name}</span><span class="chiffres qte">×{i.qty}</span></li>
								{/each}
							</ul>
						</div>
					{/each}
				</div>
			{:else}
				<p class="rien">Rien dans les poches.</p>
			{/if}
		</section>

		<section class="bloc">
			<h2><span class="num">03</span> Serment</h2>
			<dl class="emplacements serment-dl">
				<div><dt>Arme</dt><dd>{fiche.oath.weapon || 'non notée'}</dd></div>
				<div><dt>Rang</dt><dd>{fiche.oath.rankLabel}</dd></div>
				<div><dt>Lignée</dt><dd>{fiche.oath.lineage ? `Évolution de ${fiche.oath.lineage}` : 'Serment premier'}</dd></div>
				<div><dt>Branche</dt><dd class:rien={!fiche.branch}>{fiche.branch ?? 'aucune'}</dd></div>
			</dl>
			{#if fiche.branch}
				<ol class="paliers">
					{#each fiche.tiers.reached as t, n (t.level + t.name)}
						<li>
							<p class="palier-tete"><span class="libelle">{palierAtteint(n, t.level, t.stage)}</span> <strong>{t.name}</strong>{#if t.cost} <span class="cout">{t.cost}</span>{/if}</p>
							{#if t.description}<p class="palier-texte">{t.description}</p>{/if}
						</li>
					{/each}
					{#each fiche.tiers.next as t, n (t.level + t.name)}
						<li class="suivant">
							<p class="palier-tete"><span class="libelle">{palierSuivant(fiche.tiers.reached.length + n, t.level, t.stage)}</span> <strong>{t.name}</strong></p>
						</li>
					{/each}
				</ol>
			{/if}
		</section>

		<section class="bloc">
			<h2><span class="num">04</span> Conséquences</h2>
			{#if consequences.length}
				<table class="consequences">
					<thead>
						<tr><th scope="col">Date</th><th scope="col">Ce qui a changé</th><th scope="col">Signé</th><th scope="col">Motif</th></tr>
					</thead>
					<tbody>
						{#each consequences as c (c.id)}
							<tr class:rayee={c.struck}>
								<td class="chiffres date">{dateCourte(c.at)}</td>
								<td>{c.text}{#if valeurs(c)} <span class="chiffres valeurs"><s>{c.oldValue}</s> {c.newValue}</span>{/if}</td>
								<td class:tampon={!!c.stamp}>{qui(c)}</td>
								<td class="motif">{c.motif}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<p class="rien">Aucune conséquence n’est encore écrite.</p>
			{/if}
		</section>

		<footer class="pied">
			<p>Nuages Polaires — le compagnon du serveur. Rien ne s’efface : les ratures restent lisibles, les tampons portent leur motif.</p>
		</footer>
	</article>
</div>

<style>
	/* La feuille relit les tokens du carnet sur papier ivoire : mêmes composants, autre support. */
	.bureau {
		min-height: 100svh;
		padding: calc(var(--ligne) * 2) var(--gouttiere) calc(var(--ligne) * 3);
		background: var(--bureau);
	}
	.outils {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px 20px;
		max-width: 210mm;
		margin: 0 auto var(--ligne);
	}
	.feuille {
		--encre: var(--papier-encre);
		--encre-2: var(--papier-encre-2);
		--encre-grise: color-mix(in srgb, var(--papier-encre-2) 70%, var(--papier));
		--tampon: var(--papier-tampon);
		--reglure: color-mix(in srgb, var(--papier-encre) 14%, var(--papier));
		--page-2: color-mix(in srgb, var(--papier-encre) 8%, var(--papier));
		max-width: 210mm;
		margin: 0 auto;
		background: var(--papier);
		color: var(--encre);
		box-shadow: var(--ombre-feuillet);
		print-color-adjust: exact;
		-webkit-print-color-adjust: exact;
	}
	.bandeau {
		--encre: var(--papier);
		--tampon: color-mix(in srgb, var(--papier-tampon) 55%, var(--papier));
		--encre-2: color-mix(in srgb, var(--papier) 76%, var(--papier-encre));
		--page-2: color-mix(in srgb, var(--papier) 10%, var(--papier-encre));
		--reglure: color-mix(in srgb, var(--papier) 18%, var(--papier-encre));
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 16px 24px;
		align-items: center;
		padding: 28px 32px 24px;
		background: var(--papier-encre);
		border-bottom: 3px solid var(--encre-humide);
		color: var(--encre);
	}
	.coordonnee {
		font: var(--t-repere);
		letter-spacing: var(--approche-repere);
		text-transform: uppercase;
		color: var(--encre-humide);
	}
	h1 {
		margin-top: 6px;
		font: 500 44px/48px var(--voix);
		letter-spacing: -0.01em;
		overflow-wrap: anywhere;
	}
	.serment {
		font: 500 20px/28px var(--voix);
	}
	.rang {
		color: var(--tampon);
	}
	.exporte {
		margin-top: 6px;
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.deux {
		display: grid;
		grid-template-columns: 1.2fr 1fr;
		gap: 0 28px;
	}
	.bloc {
		padding: 20px 32px 4px;
		break-inside: avoid;
	}
	.deux .bloc + .bloc {
		padding-left: 0;
	}
	.deux .bloc:first-child {
		padding-right: 0;
	}
	h2 {
		display: flex;
		align-items: baseline;
		gap: 10px;
		padding-bottom: 6px;
		margin-bottom: 8px;
		border-bottom: 1px solid var(--encre-2);
		font: 500 24px/28px var(--voix);
	}
	.num {
		font: var(--t-repere);
		letter-spacing: 0.12em;
		color: var(--tampon);
	}
	.libelle {
		margin-top: 8px;
		font: var(--t-repere);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--encre-2);
	}
	.rien {
		font: italic 400 16px/24px var(--voix);
		color: var(--encre-2);
	}
	table {
		width: 100%;
		border-collapse: collapse;
	}
	.ressources th {
		padding-top: 6px;
		text-align: left;
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.abr {
		margin-right: 6px;
		font: 600 13px/20px var(--corps);
		letter-spacing: 0.1em;
		color: var(--encre);
	}
	.valeur {
		padding-top: 6px;
		text-align: right;
		font: 600 20px/24px var(--corps);
	}
	.max {
		font-size: 14px;
		font-weight: 500;
		color: var(--encre-2);
	}
	.trait {
		position: relative;
		display: block;
		height: 1px;
		margin: 4px 0 2px;
		background: var(--reglure);
	}
	.encre-trait {
		position: absolute;
		left: 0;
		top: 0;
		height: 1px;
		background: var(--encre);
	}
	.declare td {
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.xp {
		margin-top: 8px;
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.sens {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 18px;
		padding: 4px 0;
	}
	.emplacements {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0 20px;
	}
	.serment-dl {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}
	.emplacements div {
		padding: 4px 0;
		border-bottom: 1px solid var(--reglure);
	}
	dt {
		font: var(--t-repere);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--encre-2);
	}
	dd {
		font: 500 18px/24px var(--voix);
		overflow-wrap: anywhere;
	}
	.inventaire {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 4px 28px;
		padding-top: 6px;
	}
	.categorie li {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 3px 0;
		border-bottom: 1px solid var(--reglure);
		font: 400 14px/20px var(--corps);
	}
	.qte {
		color: var(--encre-2);
	}
	.paliers li {
		padding: 6px 0;
		border-bottom: 1px solid var(--reglure);
		break-inside: avoid;
	}
	.palier-tete {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 2px 12px;
	}
	.palier-tete .libelle {
		margin: 0;
	}
	.palier-tete strong {
		font: 500 19px/24px var(--voix);
	}
	.cout {
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.palier-texte {
		font: 400 15px/22px var(--voix);
		font-variant-numeric: lining-nums tabular-nums;
	}
	.suivant,
	.suivant .libelle {
		color: var(--encre-grise);
	}
	.consequences th {
		padding: 4px 8px 4px 0;
		text-align: left;
		font: var(--t-repere);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--encre-2);
		border-bottom: 1px solid var(--encre-2);
	}
	.consequences td {
		padding: 5px 8px 5px 0;
		vertical-align: top;
		font: 400 13px/18px var(--corps);
		border-bottom: 1px solid var(--reglure);
	}
	.consequences tr {
		break-inside: avoid;
	}
	.date {
		white-space: nowrap;
		color: var(--encre-2);
	}
	.valeurs s {
		color: var(--encre-grise);
	}
	.tampon {
		color: var(--tampon);
		font-weight: 600;
		white-space: nowrap;
	}
	.motif {
		color: var(--encre-2);
	}
	.rayee td:nth-child(2) {
		text-decoration: line-through;
		color: var(--encre-grise);
	}
	.pied {
		margin-top: 16px;
		padding: 14px 32px 22px;
		border-top: 1px solid var(--reglure);
		font: italic 400 15px/22px var(--voix);
		color: var(--encre-2);
	}

	@media (max-width: 760px) {
		.bureau {
			padding: var(--ligne) 0 calc(var(--ligne) * 2);
		}
		.outils {
			padding: 0 var(--gouttiere);
		}
		.bandeau {
			grid-template-columns: 1fr;
			padding: 22px var(--gouttiere);
		}
		.portrait {
			grid-row: 1;
		}
		h1 {
			font-size: 36px;
			line-height: 40px;
		}
		.deux {
			grid-template-columns: 1fr;
		}
		.bloc,
		.deux .bloc + .bloc,
		.deux .bloc:first-child {
			padding: 16px var(--gouttiere) 4px;
		}
		.emplacements,
		.serment-dl,
		.inventaire {
			grid-template-columns: 1fr;
		}
		.consequences thead {
			display: none;
		}
		.consequences tr {
			display: grid;
			grid-template-columns: auto 1fr;
			gap: 0 10px;
			padding: 6px 0;
			border-bottom: 1px solid var(--reglure);
		}
		.consequences td {
			padding: 0;
			border: 0;
		}
		.consequences td:nth-child(2),
		.consequences td.motif {
			grid-column: 1 / -1;
		}
		.pied {
			padding: 14px var(--gouttiere) 22px;
		}
	}

	@page {
		size: A4;
		margin: 12mm;
	}
	@media print {
		.bureau {
			min-height: 0;
			padding: 0;
			background: none;
		}
		.outils {
			display: none;
		}
		.feuille {
			max-width: none;
			box-shadow: none;
		}
		h2 {
			break-after: avoid;
		}
	}
</style>
