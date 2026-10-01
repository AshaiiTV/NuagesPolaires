<script lang="ts">
	// Le journal d'audit : une page à réglure où chaque action du carnet s'écrit sur sa ligne, l'heure
	// dans la marge, les jours en titres courants. On le lit, on le filtre, on l'exporte ; on ne l'écrit
	// jamais d'ici. Les décisions des MJ et des administrateurs se lisent sur la même réglure.
	import Bouton from '$lib/ui/Bouton.svelte';
	import Champ from '$lib/ui/Champ.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import { heure } from '$lib/ui/dates';
	import PageRegistre from '../PageRegistre.svelte';
	import { ACTIONS_AUDIT, LIBELLE_ROLE, SOURCES_AUDIT, actionAudit, actionDecision, detailsLisibles, le } from '../format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	interface Ligne {
		id: number;
		at: string;
		source: string;
		acteur: string;
		role: string;
		action: string;
		detail: string;
	}

	const lignes = $derived.by<Ligne[]>(() => {
		if (data.audit) {
			return data.audit.rows.map((r) => ({
				id: r.id,
				at: r.at,
				source: SOURCES_AUDIT[r.source] ?? r.source,
				acteur: r.actorPseudo,
				role: r.actorRole ? (LIBELLE_ROLE[r.actorRole] ?? r.actorRole) : '',
				action: actionAudit(r.action),
				detail: detailsLisibles(r.details)
			}));
		}
		return (data.staff?.rows ?? []).map((r) => ({
			id: r.id,
			at: r.at,
			source: 'décision',
			acteur: r.actorName,
			role: '',
			action: actionDecision(r.action),
			detail: [DETAILS[r.detail] ?? r.detail, r.target && !TECHNIQUE.test(r.target) && !r.detail.includes(r.target) ? `cible : ${r.target}` : ''].filter(Boolean).join(' · ')
		}));
	});

	/** Un identifiant interne (« c_caBbbQVpeidlFfcH ») ne dit rien à qui lit : on le tait. */
	const TECHNIQUE = /^[a-z]{1,4}_[A-Za-z0-9_-]{6,}$/;
	const DETAILS: Record<string, string> = { auto: 'sauvegarde automatique', true: 'oui', false: 'non' };

	/** Les lignes regroupées par jour (heure de Paris) : le jour s'écrit une fois, en titre courant. */
	const jours = $derived.by(() => {
		const groupes: { jour: string; lignes: Ligne[] }[] = [];
		for (const l of lignes) {
			const j = le(l.at, new Date(data.releve).getTime());
			const dernier = groupes.at(-1);
			if (dernier && dernier.jour === j) dernier.lignes.push(l);
			else groupes.push({ jour: j, lignes: [l] });
		}
		return groupes;
	});

	const pagination = $derived(data.audit ?? data.staff ?? { page: 1, pages: 1 });
	const filtre = $derived(!!(data.filtres.acteur || data.filtres.action || data.filtres.du || data.filtres.au));

	function lien(changes: Record<string, string | number | null>): string {
		const p = new URLSearchParams();
		const base: Record<string, string> =
			data.vue === 'staff'
				? { vue: 'staff' }
				: { acteur: data.filtres.acteur, action: data.filtres.action, du: data.filtres.du, au: data.filtres.au };
		for (const [k, v] of Object.entries({ ...base, ...changes })) if (v !== null && v !== '' && v !== 1) p.set(k, String(v));
		const s = p.toString();
		return '/registre/journal' + (s ? '?' + s : '');
	}
	const export_ = $derived.by(() => {
		const p = new URLSearchParams();
		for (const [k, v] of Object.entries(data.filtres)) if (v) p.set(k, v);
		const s = p.toString();
		return '/registre/journal/texte' + (s ? '?' + s : '');
	});

	const actionsConnues = Object.entries(ACTIONS_AUDIT).sort((a, b) => a[1].localeCompare(b[1], 'fr'));
</script>

<svelte:head><title>{data.vue === 'staff' ? 'Décisions des MJ' : 'Journal d’audit'} — Le Registre</title></svelte:head>

<PageRegistre titre={data.vue === 'staff' ? 'Décisions' : 'Journal'} titreVoix={data.vue === 'staff' ? 'des MJ.' : 'd’audit.'}>
	{#snippet reperes()}
		<span>relevé <span class="chiffres">{heure(data.releve)}</span></span>
		<span class="gris">Lu ici, jamais écrit d’ici.</span>
	{/snippet}

	<nav class="voix" aria-label="Journaux">
		<a href="/registre/journal" class:courant={data.vue === 'audit'} aria-current={data.vue === 'audit' ? 'page' : undefined}>Journal d’audit</a>
		<a href="/registre/journal?vue=staff" class:courant={data.vue === 'staff'} aria-current={data.vue === 'staff' ? 'page' : undefined}>Décisions des MJ</a>
	</nav>

	{#if data.vue === 'audit'}
		<form class="filtres" method="GET" action="/registre/journal" role="search" aria-label="Filtrer le journal">
			<Champ libelle="Acteur" name="acteur" value={data.filtres.acteur} type="search" autocomplete="off" placeholder="pseudo" />
			<label class="choix">
				<span>Action</span>
				<select name="action">
					<option value="" selected={!data.filtres.action}>Toutes les actions</option>
					{#each actionsConnues as [cle, libelle] (cle)}
						<option value={cle} selected={data.filtres.action === cle}>{libelle}</option>
					{/each}
					{#if data.filtres.action && !ACTIONS_AUDIT[data.filtres.action]}
						<option value={data.filtres.action} selected>{data.filtres.action}</option>
					{/if}
				</select>
			</label>
			<Champ libelle="Du" name="du" type="date" value={data.filtres.du} />
			<Champ libelle="Au" name="au" type="date" value={data.filtres.au} />
			<div class="boutons">
				<Bouton variante="trait" type="submit">Filtrer</Bouton>
				{#if filtre}<Bouton variante="texte" href="/registre/journal">Tout revoir</Bouton>{/if}
			</div>
		</form>
		<div class="exporter">
			<p class="gris">{filtre ? 'L’export reprend ces filtres.' : 'L’export reprend tout le journal.'} Les dates y sont en temps universel.</p>
			<Bouton variante="trait" href={export_} download data-sveltekit-reload>Exporter (.txt)</Bouton>
		</div>
	{:else}
		<p class="chapeau">Ce que les MJ et les administrateurs ont fait, écrit en clair. Les lignes archivées n’y figurent plus.</p>
	{/if}

	{#if 'refus' in data && data.refus}
		<NoteDeMarge ton="refus">{data.refus}</NoteDeMarge>
	{/if}

	{#if lignes.length === 0}
		{#if filtre}
			<Vide>
				Aucune ligne ne correspond à ces filtres.
				{#snippet action()}<Bouton variante="texte" href="/registre/journal" fleche="→">Revoir tout le journal</Bouton>{/snippet}
			</Vide>
		{:else if data.vue === 'staff'}
			<Vide>Aucune décision écrite. La prochaine s’écrira ici.</Vide>
		{:else}
			<Vide>Le journal est blanc. Chaque écriture du carnet s’y inscrira.</Vide>
		{/if}
	{:else}
		<div class="registre-lignes">
			{#each jours as g (g.jour + g.lignes[0].id)}
				<section class="jour" aria-label={g.jour}>
					<h2>{g.jour}</h2>
					<ol>
						{#each g.lignes as l (l.id)}
							<li>
								<time class="heure chiffres" datetime={l.at}>{heure(l.at)}</time>
								<span class="qui"><span class="source">{l.source}</span>
								<span class="acteur">{#if l.acteur}{l.acteur}{#if l.role}<span class="role">{' · ' + l.role}</span>{/if}{:else}<span class="gris">visiteur</span>{/if}</span></span>
								<span class="quoi"><strong>{l.action}</strong>{#if l.detail}<span class="detail">{l.detail}</span>{/if}</span>
							</li>
						{/each}
					</ol>
				</section>
			{/each}
		</div>
	{/if}

	{#snippet pied()}
		{#if pagination.pages > 1}
			<nav class="pages" aria-label="Pages du journal">
				{#if pagination.page > 1}
					<Bouton variante="texte" href={lien({ page: pagination.page - 1 })}>← Plus récentes</Bouton>
				{:else}<span></span>{/if}
				<span class="ou chiffres">page {pagination.page} sur {pagination.pages}</span>
				{#if pagination.page < pagination.pages}
					<Bouton variante="texte" href={lien({ page: pagination.page + 1 })} fleche="→">Plus anciennes</Bouton>
				{:else}<span></span>{/if}
			</nav>
		{/if}
	{/snippet}
</PageRegistre>

<style>
	.gris {
		color: var(--encre-grise);
	}
	.voix {
		display: flex;
		gap: 0 28px;
		border-bottom: 1px solid var(--reglure);
		margin-bottom: var(--ligne);
	}
	.voix a {
		position: relative;
		display: flex;
		align-items: center;
		min-height: var(--cible);
		font: 400 20px/24px var(--voix);
		color: var(--encre-2);
		text-decoration: none;
	}
	.voix a:hover,
	.voix a.courant {
		color: var(--encre);
	}
	.voix a.courant {
		font-style: italic;
	}
	.voix a.courant::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: -1px;
		height: 2px;
		background: var(--encre-humide);
	}
	.chapeau {
		font: italic 400 18px/24px var(--voix);
		color: var(--encre-2);
		padding-bottom: var(--ligne);
	}

	.filtres {
		display: grid;
		grid-template-columns: minmax(10rem, 1fr) minmax(12rem, 1.4fr) 10rem 10rem auto;
		align-items: end;
		gap: 12px 20px;
	}
	.boutons {
		display: flex;
		align-items: center;
		gap: 4px 16px;
	}
	.choix {
		display: grid;
		gap: 2px;
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	select {
		width: 100%;
		min-height: var(--cible);
		padding: 8px 0;
		background: transparent;
		border: 0;
		border-bottom: 1px solid color-mix(in srgb, var(--encre) 28%, transparent);
		border-radius: 0;
		font: var(--t-corps);
		color: var(--encre);
	}
	select option {
		background: var(--page);
		color: var(--encre);
	}
	select:focus-visible {
		outline: none;
		border-bottom: 2px solid var(--encre-humide);
	}
	.exporter {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 8px 24px;
		padding: 12px 0 var(--ligne);
		font: var(--t-libelle);
	}

	/* ── La réglure du journal : chaque ligne d'écriture tombe sur un trait (24 px). ── */
	.registre-lignes {
		--marge-heure: 4.5rem;
		position: relative;
		border-top: 1px solid var(--reglure);
	}
	/* Le filet de marge, double, comme sur un registre relié. */
	.registre-lignes::before {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		left: var(--marge-heure);
		width: 3px;
		border-left: 1px solid var(--reglure);
		border-right: 1px solid var(--reglure);
		pointer-events: none;
	}
	.jour h2 {
		padding-left: calc(var(--marge-heure) + 16px);
		font: italic 400 22px/48px var(--voix);
		color: var(--encre);
		border-bottom: 1px solid var(--reglure);
	}
	ol {
		background-image: repeating-linear-gradient(
			to bottom,
			transparent 0 calc(var(--ligne) - 1px),
			var(--reglure) calc(var(--ligne) - 1px) var(--ligne)
		);
	}
	li {
		display: grid;
		grid-template-columns: var(--marge-heure) 7.5rem minmax(8rem, 11rem) minmax(0, 1fr);
		gap: 0 16px;
		font: 500 14px/24px var(--corps);
		color: var(--encre-2);
	}
	li:hover {
		background-color: color-mix(in srgb, var(--encre) 3%, transparent);
	}
	.heure {
		padding-right: 12px;
		text-align: right;
		color: var(--encre-2);
	}
	.qui {
		display: contents;
	}
	.source {
		padding-left: 4px;
		font: var(--t-repere);
		line-height: 24px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--encre-grise);
		overflow-wrap: anywhere;
	}
	.acteur {
		color: var(--encre);
		overflow-wrap: anywhere;
	}
	.role {
		color: var(--encre-grise);
	}
	.quoi {
		min-width: 0;
	}
	.quoi strong {
		font-weight: 600;
		color: var(--encre);
	}
	.detail {
		color: var(--encre-2);
		overflow-wrap: anywhere;
	}
	.detail::before {
		content: ' — ';
		color: var(--encre-grise);
	}

	.pages {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 12px;
	}
	.pages > :last-child {
		justify-self: end;
	}
	.ou {
		font: var(--t-libelle);
		color: var(--encre-grise);
	}

	@media (max-width: 1100px) {
		.filtres {
			grid-template-columns: 1fr 1fr;
		}
		.boutons {
			grid-column: 1 / -1;
		}
	}
	@media (max-width: 760px) {
		.registre-lignes {
			--marge-heure: 3.25rem;
		}
		.jour h2 {
			padding-left: calc(var(--marge-heure) + 12px);
		}
		li {
			grid-template-columns: var(--marge-heure) minmax(0, 1fr);
			gap: 0 12px;
		}
		.heure {
			grid-row: span 2;
			padding-right: 8px;
		}
		.qui {
			display: flex;
			flex-wrap: wrap;
			gap: 0 10px;
		}
		.qui,
		.quoi {
			grid-column: 2;
		}
		.source {
			padding-left: 0;
		}
		.pages {
			grid-template-columns: 1fr 1fr;
		}
		.ou {
			display: none;
		}
	}
</style>
