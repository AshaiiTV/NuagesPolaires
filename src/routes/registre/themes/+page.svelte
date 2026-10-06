<script lang="ts">
	import { signature } from '$lib/ui/tampons';
	// Registre › Thèmes : la galerie des feuillets (chaque thème peint comme une petite page), les
	// gestes de l'administrateur sur chacun, et la création d'un thème — huit couleurs, aperçu vivant,
	// contraste écrit en clair. Sous 4,5:1, le bouton d'enregistrement n'existe pas et la raison est dite.
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import type { SubmitFunction } from '@sveltejs/kit';
	import Chapitre from '$lib/ui/Chapitre.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import Champ from '$lib/ui/Champ.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import Tampon from '$lib/ui/Tampon.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import { creerEcriture } from '$lib/ui/ecriture.svelte';
	import { THEMES, contrastRatio, tonOf, type ThemeToken, type ThemeTokens } from '$lib/ui/themes';
	import PageRegistre from '../PageRegistre.svelte';
	import { le } from '../format';
	import Apercu from './Apercu.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const ecriture = creerEcriture();

	/** Le feuillet sur lequel on écrit (identifiant du thème, ou « nouveau ») : la note s'y pose. */
	let cible = $state<string | null>(null);
	function pour(id: string, verbe: string, apres?: () => void): SubmitFunction {
		const ecrire = ecriture.enhance({ verbe, apres });
		return (entree) => {
			if (!ecriture.enCours) cible = id;
			return ecrire(entree);
		};
	}

	const geste = $derived(form && 'geste' in form ? form.geste : null);
	const cree = $derived(form && 'cree' in form ? form.cree : null);

	/** Ce que le serveur a constaté sans rien changer : on le dit, plutôt qu'une heure muette. */
	const CONSTATS: Record<string, string> = {
		deja: 'Ce compte avait déjà ce thème\u00a0: rien n’a changé.',
		absent: 'Ce compte n’avait pas reçu ce thème\u00a0: rien n’est retiré.',
		'tous-deja': 'Tous les joueurs l’avaient déjà\u00a0: rien n’a changé.'
	};

	// ── Nouveau thème : le brouillon ─────────────────────────────────────────────────────────────
	const TOKENS: { cle: ThemeToken; libelle: string; role: string }[] = [
		{ cle: '--bureau', libelle: 'Bureau', role: 'fond de fenêtre' },
		{ cle: '--page', libelle: 'Page', role: 'la page elle-même' },
		{ cle: '--page-2', libelle: 'Page secondaire', role: 'feuillets, fonds de tampon' },
		{ cle: '--reglure', libelle: 'Réglure', role: 'lignes, filets, bord de page' },
		{ cle: '--encre', libelle: 'Encre', role: 'écriture confirmée' },
		{ cle: '--encre-2', libelle: 'Encre secondaire', role: 'libellés, valeurs maximales' },
		{ cle: '--encre-grise', libelle: 'Encre grise', role: 'ratures, passés' },
		{ cle: '--ruban', libelle: 'Ruban', role: 'action principale' }
	];
	const LIBELLE = Object.fromEntries(TOKENS.map((t) => [t.cle, t.libelle])) as Record<
		ThemeToken,
		string
	>;
	const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
	const BASE = THEMES[0].tokens;

	/** Point de départ : `?depart=<thème>` et, couleur par couleur, `?encre-2=4a5a58` (lien de brouillon). */
	function brouillonDepart(): ThemeTokens {
		const params = page.url.searchParams;
		const source = data.themes.find((t) => t.id === params.get('depart'));
		const tokens = { ...(source ? (source.tokens as ThemeTokens) : BASE) };
		for (const { cle } of TOKENS) {
			const v = params.get(cle.slice(2));
			if (v && HEX.test('#' + v)) tokens[cle] = '#' + v.toLowerCase();
		}
		return tokens;
	}
	let couleurs = $state<ThemeTokens>(untrack(brouillonDepart));
	let identifiant = $state('');
	let nom = $state('');
	let description = $state('');

	/** `#abc` → `#aabbcc` pour le nuancier (qui n'accepte que six chiffres). */
	function six(hex: string): string {
		const v = hex.trim();
		if (!HEX.test(v)) return '#000000';
		return v.length === 4 ? '#' + [...v.slice(1)].map((c) => c + c).join('') : v.toLowerCase();
	}
	const invalides = $derived(TOKENS.filter((t) => !HEX.test(couleurs[t.cle].trim())));
	const ratios = $derived(
		invalides.length
			? []
			: (['--encre', '--encre-2'] as const).map((f) => ({
					cle: f,
					ratio: contrastRatio(couleurs[f].trim(), couleurs['--page'].trim())
				}))
	);
	const insuffisants = $derived(ratios.filter((r) => r.ratio < 4.5));
	const ton = $derived(invalides.length ? null : tonOf(couleurs));
	const ratioLu = (r: number) => r.toFixed(2).replace('.', ',') + ':1';

	const raison = $derived.by(() => {
		if (invalides.length) {
			const noms = invalides.map((t) => `« ${t.libelle} »`).join(', ');
			return `Le thème n’est pas proposé\u00a0: ${noms} ${invalides.length > 1 ? 'ne sont pas des couleurs' : 'n’est pas une couleur'} au format #rrggbb.`;
		}
		if (insuffisants.length) {
			const parts = insuffisants.map(
				(r) =>
					`${r.cle === '--encre' ? 'l’encre' : 'l’encre secondaire'} n’atteint que ${ratioLu(r.ratio)}`
			);
			return `Le thème n’est pas proposé\u00a0: sur la page, ${parts.join(' et ')}\u00a0; il faut 4,5:1 pour se lire.`;
		}
		return null;
	});

	function partirDe(tokens: Record<string, string>, nomSource: string) {
		couleurs = { ...(tokens as ThemeTokens) };
		if (!nom) description = description || `D’après « ${nomSource} ».`;
		document.getElementById('nouveau')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
	function apresCreation() {
		identifiant = '';
		nom = '';
		description = '';
	}

	const parNom = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'fr');
	const natifs = $derived(data.themes.filter((t) => t.isBuiltin));
	const crees = $derived(data.themes.filter((t) => !t.isBuiltin).sort(parNom));
</script>

<svelte:head><title>Thèmes — Le Registre</title></svelte:head>

{#snippet feuillet(t: (typeof data.themes)[number])}
	<li class="theme" class:masque={!t.visible}>
		<Apercu tokens={t.tokens} nom={t.name} />
		<div class="fiche">
			<h3 class="nom">{t.name}</h3>
			<p class="etats">
				{#if t.toujours}<span>accordé à tout le monde</span>{:else}
					<span class:gris={!t.visible}>{t.visible ? 'visible' : 'masqué'}</span>
					{#if t.autoGrantAll}<span>distribué à tous</span>{/if}
				{/if}
				<span class="gris">ton {t.tone}</span>
				{#if t.active}<span class="porte">porté par toi</span>{/if}
				{#if t.availableUntil}<span class="gris">jusqu’au {le(t.availableUntil)}</span>{/if}
			</p>
			{#if t.description}<p class="description">{t.description}</p>{/if}
		</div>

		<div class="gestes">
			{#if t.toujours}
				<p class="aide">
					Accordé à tout le monde, toujours visible&nbsp;: rien à donner ni à retirer.
				</p>
			{:else}
				<div class="bascules">
					<form
						method="POST"
						action="?/visibilite"
						use:enhance={pour(t.id, t.visible ? 'Masqué' : 'Rendu visible')}
					>
						<input type="hidden" name="themeId" value={t.id} />
						<input type="hidden" name="visible" value={String(!t.visible)} />
						<Bouton variante="texte" type="submit"
							>{t.visible ? 'Masquer' : 'Rendre visible'}</Bouton
						>
					</form>
					<form
						method="POST"
						action="?/distribution"
						use:enhance={pour(t.id, t.autoGrantAll ? 'Distribution arrêtée' : 'Distribué')}
					>
						<input type="hidden" name="themeId" value={t.id} />
						<input type="hidden" name="enabled" value={String(!t.autoGrantAll)} />
						<Bouton variante="texte" type="submit"
							>{t.autoGrantAll ? 'Cesser la distribution' : 'Distribuer à tous'}</Bouton
						>
					</form>
				</div>

				<details class="don">
					<summary
						><span>Donner ou retirer</span><span class="pli" aria-hidden="true"></span></summary
					>
					<form method="POST" action="?/donner" use:enhance={pour(t.id, 'Donné')}>
						<input type="hidden" name="themeId" value={t.id} />
						{#if data.joueurs.length}
							<label class="choix">
								<span>Compte d’un joueur</span>
								<select name="accountId" required>
									{#each data.joueurs as j (j.id)}
										<option value={j.id}
											>{j.pseudo}{j.personnage ? ` · ${j.personnage}` : ''}</option
										>
									{/each}
								</select>
							</label>
							<div class="paire">
								<Bouton variante="tampon" type="submit">Donner</Bouton>
								<Bouton variante="texte" type="submit" formaction="?/retirer">Retirer</Bouton>
							</div>
						{:else}
							<p class="aide">Aucun compte de joueur ne peut recevoir de thème.</p>
						{/if}
					</form>
					<form class="tous" method="POST" action="?/tous" use:enhance={pour(t.id, 'Donné à tous')}>
						<input type="hidden" name="themeId" value={t.id} />
						<p class="aide">
							Une fois donné, le thème reste dans chaque collection, même si la distribution cesse.
						</p>
						<Bouton variante="tampon" type="submit">Donner à tous les joueurs</Bouton>
					</form>
				</details>
			{/if}

			<Bouton variante="texte" fleche="↓" onclick={() => partirDe(t.tokens, t.name)}
				>Partir de ce thème</Bouton
			>

			{#if cible === t.id && ecriture.note}
				<NoteDeMarge ton={ecriture.note.ton}>{ecriture.note.texte}</NoteDeMarge>
				{#if ecriture.note.ton === 'fait' && geste && geste.themeId === t.id && CONSTATS[geste.quoi]}
					<p class="constat">{CONSTATS[geste.quoi]}</p>
				{/if}
			{/if}
		</div>
	</li>
{/snippet}

<PageRegistre titre="Les" titreVoix="thèmes.">
	{#snippet reperes()}
		<span
			>Un thème repeint huit couleurs&nbsp;; jamais les mots, les tampons ni l’accueil public.</span
		>
		<a class="saut" href="#nouveau">Nouveau thème ↓</a>
	{/snippet}

	{#if data.themes.length === 0}
		<Vide>Aucun thème n’est inscrit. Le carnet garde ses couleurs de nuit.</Vide>
	{:else}
		<Chapitre numero="01" titre="Les thèmes du carnet" id="natifs">
			<ul class="galerie">
				{#each natifs as t (t.id)}{@render feuillet(t)}{/each}
			</ul>
		</Chapitre>
		<p class="telephone">Donner, retirer, masquer ou distribuer un thème se fait sur ordinateur.</p>
		<Chapitre numero="02" titre="Créés dans le Registre" id="crees">
			{#if crees.length}
				<ul class="galerie">
					{#each crees as t (t.id)}{@render feuillet(t)}{/each}
				</ul>
			{:else}
				<Vide>Aucun thème n’a encore été créé ici. Le premier s’écrit juste en dessous.</Vide>
			{/if}
		</Chapitre>
	{/if}

	<Chapitre numero="03" titre="Nouveau thème" id="nouveau">
		<p class="consigne">
			Huit couleurs, rien d’autre&nbsp;: l’aurore, le laiton et la rouille gardent leur sens
			partout. L’encre et l’encre secondaire doivent atteindre 4,5:1 sur la page.
		</p>
		<form
			class="atelier"
			method="POST"
			action="?/creer"
			use:enhance={pour('nouveau', 'Créé', apresCreation)}
		>
			<div class="saisie">
				<div class="identite">
					<Champ
						libelle="Nom"
						name="name"
						bind:value={nom}
						maxlength={60}
						required
						autocomplete="off"
					/>
					<Champ
						libelle="Identifiant"
						name="id"
						bind:value={identifiant}
						aide="Minuscules, chiffres et tirets&nbsp;; il ne change plus."
						pattern={'[a-z0-9][a-z0-9\\-]{1,39}'}
						maxlength={40}
						required
						autocomplete="off"
						spellcheck="false"
					/>
					<Champ
						libelle="Description"
						name="description"
						bind:value={description}
						maxlength={300}
						multiligne
						lignes={2}
					/>
				</div>

				<fieldset class="couleurs">
					<legend class="repere">Les huit couleurs</legend>
					<ul>
						{#each TOKENS as t (t.cle)}
							{@const fausse = !HEX.test(couleurs[t.cle].trim())}
							<li class:fausse>
								<input
									class="nuancier"
									type="color"
									value={six(couleurs[t.cle])}
									oninput={(e) => (couleurs[t.cle] = e.currentTarget.value)}
									aria-label={`${t.libelle}, nuancier`}
								/>
								<label for={'hex' + t.cle}>
									<span class="libelle">{t.libelle}</span>
									<span class="role">{t.role}</span>
								</label>
								<input
									id={'hex' + t.cle}
									class="hex chiffres"
									type="text"
									name={t.cle}
									bind:value={couleurs[t.cle]}
									maxlength={7}
									spellcheck="false"
									autocomplete="off"
									aria-invalid={fausse ? 'true' : undefined}
								/>
							</li>
						{/each}
					</ul>
				</fieldset>
			</div>

			<div class="epreuve">
				<p class="repere">Aperçu</p>
				<Apercu tokens={couleurs} nom={nom || 'en cours'} grand />
				<dl class="contraste">
					{#each ratios as r (r.cle)}
						<div class:insuffisant={r.ratio < 4.5}>
							<dt>{LIBELLE[r.cle]} sur la page</dt>
							<dd class="chiffres">
								{ratioLu(r.ratio)}<span>{r.ratio < 4.5 ? 'sous 4,5:1' : 'se lit'}</span>
							</dd>
						</div>
					{/each}
					{#if ton}
						<div>
							<dt>Ton</dt>
							<dd>
								{ton}<span
									>{ton === 'clair'
										? 'aurore, laiton et rouille prennent leurs teintes sur papier'
										: 'aurore, laiton et rouille gardent leurs teintes de nuit'}</span
								>
							</dd>
						</div>
					{/if}
				</dl>

				<div class="enregistrer" aria-live="polite">
					{#if raison}
						<p class="raison" role="status">{raison}</p>
					{:else}
						<Bouton variante="tampon" type="submit" disabled={ecriture.enCours}
							>Enregistrer ce thème</Bouton
						>
					{/if}
					{#if cible === 'nouveau' && ecriture.note}
						<NoteDeMarge ton={ecriture.note.ton}>{ecriture.note.texte}</NoteDeMarge>
					{/if}
					{#if cree && cible === 'nouveau' && ecriture.note?.ton === 'fait'}
						<p class="cree">
							<span>« {cree.name} » rejoint la galerie, visible, sans être distribué.</span>
							<Tampon cle={cree.id + cree.at}>{signature('admin', cree.par, cree.at)}</Tampon>
						</p>
					{/if}
				</div>
			</div>
		</form>
	</Chapitre>
</PageRegistre>

<style>
	.saut {
		display: inline-flex;
		align-items: center;
		min-height: var(--cible);
		color: var(--encre-humide);
		text-decoration: none;
	}
	.saut:hover {
		text-decoration: underline;
	}
	.consigne {
		max-width: 62ch;
		padding: 12px 0 var(--ligne);
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}

	/* ── La galerie ── */
	.galerie {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
		gap: var(--ligne);
		padding-top: var(--ligne);
	}
	.theme {
		min-width: 0;
		display: flex;
		flex-direction: column;
		border: 1px solid var(--reglure);
		background: var(--page);
	}
	.theme.masque :global(.apercu) {
		opacity: 0.55;
	}
	.fiche {
		display: grid;
		gap: 4px;
		padding: 12px 16px 0;
	}
	.nom {
		font: 500 22px/28px var(--voix);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
	}
	.etats {
		display: flex;
		flex-wrap: wrap;
		gap: 0 6px;
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}
	.etats span:not(:last-child)::after {
		content: '·';
		margin-left: 6px;
		color: var(--encre-grise);
	}
	.etats .gris {
		color: var(--encre-grise);
	}
	.etats .porte {
		color: var(--encre-humide);
	}
	.description {
		font: italic 400 16px/24px var(--voix);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}
	.gestes {
		display: grid;
		gap: 8px;
		justify-items: start;
		margin-top: auto;
		padding: 12px 16px 16px;
	}
	.bascules {
		display: flex;
		flex-wrap: wrap;
		gap: 0 20px;
	}
	.aide {
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-grise);
	}
	.don {
		width: 100%;
		border-top: 1px solid var(--reglure);
		border-bottom: 1px solid var(--reglure);
	}
	.don summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: var(--cible);
		cursor: pointer;
		list-style: none;
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
	}
	.don summary::-webkit-details-marker {
		display: none;
	}
	.pli {
		width: 8px;
		height: 8px;
		margin-right: 4px;
		border-right: 1px solid var(--encre-2);
		border-bottom: 1px solid var(--encre-2);
		rotate: 45deg;
		transition: rotate 200ms;
	}
	.don[open] .pli {
		rotate: -135deg;
	}
	.don form {
		display: grid;
		gap: 8px;
		justify-items: start;
		padding-bottom: 12px;
	}
	.don .tous {
		padding-top: 12px;
		border-top: 1px dashed var(--reglure);
	}
	.paire {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 16px;
	}
	.choix {
		display: grid;
		gap: 2px;
		width: 100%;
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
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
		font-variant-numeric: lining-nums tabular-nums;
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
	.constat {
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}

	/* ── L'atelier du nouveau thème ── */
	.atelier {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
		gap: var(--ligne) calc(var(--ligne) * 2);
		align-items: start;
	}
	.saisie {
		display: grid;
		gap: var(--ligne);
	}
	.identite {
		display: grid;
		gap: 12px;
	}
	fieldset {
		min-width: 0;
		margin: 0;
		padding: 0;
		border: 0;
	}
	legend {
		padding: 0;
		line-height: var(--ligne);
	}
	.couleurs ul {
		border-top: 1px solid var(--reglure);
	}
	.couleurs li {
		display: grid;
		grid-template-columns: 44px minmax(0, 1fr) 7.5rem;
		align-items: center;
		gap: 0 14px;
		min-height: calc(var(--ligne) * 2);
		border-bottom: 1px solid var(--reglure);
	}
	.nuancier {
		width: 44px;
		height: 44px;
		padding: 0;
		background: transparent;
		border: 1px solid var(--reglure);
		border-radius: var(--rayon);
		cursor: pointer;
	}
	.nuancier::-webkit-color-swatch-wrapper {
		padding: 2px;
	}
	.nuancier::-webkit-color-swatch {
		border: 0;
		border-radius: 1px;
	}
	.nuancier::-moz-color-swatch {
		border: 0;
	}
	.nuancier:focus-visible {
		outline: 2px solid var(--encre-humide);
		outline-offset: 2px;
	}
	.couleurs label {
		display: grid;
		min-width: 0;
	}
	.libelle {
		font: 600 14px/20px var(--corps);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
	}
	.role {
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-grise);
	}
	.hex {
		width: 100%;
		min-height: var(--cible);
		padding: 0;
		background: transparent;
		border: 0;
		border-bottom: 1px solid color-mix(in srgb, var(--encre) 28%, transparent);
		border-radius: 0;
		font: 400 14px/24px var(--mono);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
		text-transform: lowercase;
	}
	.hex:focus-visible {
		outline: none;
		border-bottom: 2px solid var(--encre-humide);
	}
	.fausse .hex {
		border-bottom-color: var(--rouille);
		color: var(--rouille);
	}

	.epreuve {
		position: sticky;
		top: var(--ligne);
		display: grid;
		gap: 12px;
	}
	.contraste {
		display: grid;
		border-top: 1px solid var(--reglure);
	}
	.contraste div {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: baseline;
		gap: 0 16px;
		padding: 6px 0;
		border-bottom: 1px solid var(--reglure);
	}
	dt {
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}
	dd {
		display: grid;
		justify-items: end;
		font: 500 16px/24px var(--corps);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
		text-align: right;
	}
	dd span {
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-grise);
	}
	.insuffisant dd,
	.insuffisant dd span {
		color: var(--rouille);
	}
	.enregistrer {
		display: grid;
		gap: 8px;
		justify-items: start;
		padding-top: 12px;
	}
	.raison {
		padding-left: 12px;
		border-left: 2px solid var(--rouille);
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
	}
	.cree {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 20px;
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
	}

	@media (max-width: 1100px) {
		.atelier {
			grid-template-columns: 1fr;
		}
		.epreuve {
			position: static;
		}
	}
	.telephone {
		display: none;
	}
	/* Tablette : la galerie se consulte en deux colonnes ; les gestes se font sur ordinateur.
	   Téléphone (sous 480 px) : une colonne, chaque feuillet à sa vraie mesure. */
	@media (max-width: 760px) {
		.galerie {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
			gap: 12px;
		}
		.fiche {
			padding: 8px 10px 10px;
		}
		.nom {
			font-size: 18px;
			line-height: 24px;
		}
		.description,
		.gestes {
			display: none;
		}
		.telephone {
			display: block;
			padding-top: 12px;
			font: var(--t-libelle);
			font-variant-numeric: lining-nums tabular-nums;
			color: var(--encre-grise);
		}
		.couleurs li {
			grid-template-columns: 44px minmax(0, 1fr) 6.5rem;
			gap: 0 10px;
		}
	}
	@media (max-width: 479px) {
		.galerie {
			grid-template-columns: minmax(0, 1fr);
			gap: var(--ligne);
		}
		.fiche {
			padding: 12px 16px 14px;
		}
		.description {
			display: block;
		}
	}
</style>
