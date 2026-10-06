<script lang="ts">
	import { SvelteDate, SvelteURLSearchParams } from 'svelte/reactivity';
	import { chemin } from '$lib/ui/adresse';
	// Comptes et liaisons : une ligne par compte, dépliée pour agir. Sur téléphone, la page se consulte
	// et les liaisons se font ; rôle, mot de passe et rature restent « Sur ordinateur ».
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import Bouton from '$lib/ui/Bouton.svelte';
	import Champ from '$lib/ui/Champ.svelte';
	import Encre from '$lib/ui/Encre.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import { creerEcriture } from '$lib/ui/ecriture.svelte';
	import { heure, relatif } from '$lib/ui/dates';
	import PageRegistre from '../PageRegistre.svelte';
	import { LIBELLE_ROLE, ROLES, leA } from '../format';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const ecriture = creerEcriture();

	/** Le compte sur lequel on écrit : la note de marge se pose dans sa ligne. */
	let cible = $state<string | null>(null);
	function pour(id: string, verbe: string): SubmitFunction {
		const ecrire = ecriture.enhance({ verbe });
		return (entree) => {
			if (!ecriture.enCours) cible = id;
			return ecrire(entree);
		};
	}

	/** Le code temporaire : affiché une fois, jamais gardé ailleurs que dans cette page ouverte. */
	let efface = $state<string | null>(null);
	const code = $derived(
		form && 'temporaire' in form && form.temporaire && form.temporaire.secret !== efface
			? form.temporaire
			: null
	);

	const maintenant = $derived(new SvelteDate(data.releve).getTime());
	const cibleDisparue = $derived(!!cible && !data.rows.some((a) => a.id === cible));

	function lien(params: { q?: string; role?: string | null }): string {
		const p = new SvelteURLSearchParams();
		const q = params.q ?? data.q;
		if (q) p.set('q', q);
		if (params.role) p.set('role', params.role);
		const s = p.toString();
		return '/registre/comptes' + (s ? '?' + s : '');
	}
</script>

<svelte:head><title>Comptes et liaisons — Le Registre</title></svelte:head>

{#snippet note()}
	{#if ecriture.note}
		<NoteDeMarge ton={ecriture.note.ton}>{ecriture.note.texte}</NoteDeMarge>
	{/if}
{/snippet}

<PageRegistre titre="Comptes et" titreVoix="liaisons.">
	{#snippet reperes()}
		<span>relevé <span class="chiffres">{heure(data.releve)}</span></span>
	{/snippet}

	<div class="outils">
		<form class="recherche" method="GET" action="/registre/comptes" role="search">
			<Champ
				libelle="Chercher un pseudo ou un personnage"
				name="q"
				value={data.q}
				type="search"
				autocomplete="off"
			/>
			{#if data.role}<input type="hidden" name="role" value={data.role} />{/if}
			<Bouton variante="trait" type="submit">Chercher</Bouton>
		</form>
		<nav class="filtres" aria-label="Filtrer par rôle">
			<a
				href={chemin(lien({ role: null }))}
				class:courant={!data.role}
				aria-current={!data.role ? 'true' : undefined}
				><span class="marque" aria-hidden="true"></span>Tous</a
			>
			{#each ROLES as r (r.id)}
				<a
					href={chemin(lien({ role: r.id }))}
					class:courant={data.role === r.id}
					aria-current={data.role === r.id ? 'true' : undefined}
					><span class="marque" aria-hidden="true"></span>{r.pluriel}</a
				>
			{/each}
		</nav>
	</div>

	{#if cibleDisparue}<div class="note-seule">{@render note()}</div>{/if}

	{#if data.rows.length === 0}
		{#if data.q || data.role}
			<Vide>
				Aucun compte ne correspond à cette recherche.
				{#snippet action()}<Bouton variante="texte" href="/registre/comptes" fleche="→"
						>Revoir tous les comptes</Bouton
					>{/snippet}
			</Vide>
		{:else}
			<Vide>Aucun compte n’est encore inscrit.</Vide>
		{/if}
	{:else}
		<div class="tete-liste" aria-hidden="true">
			<span>Pseudo</span><span>Rôle</span><span>Liaison</span><span>Dernière venue</span><span
			></span>
		</div>
		<ul class="comptes">
			{#each data.rows as a (a.id)}
				{@const moi = a.id === data.moi}
				{@const etat = cible === a.id ? ecriture.etat : 'prise'}
				<li>
					<details class="compte" open={cible === a.id && !!ecriture.note ? true : undefined}>
						<summary>
							<span class="pseudo"
								>{a.pseudo}{#if moi}<span class="toi">&nbsp;·&nbsp;toi</span>{/if}</span
							>
							<span class="role"><Encre {etat}>{LIBELLE_ROLE[a.role] ?? a.role}</Encre></span>
							<span class="liaison">
								{#if a.characterName}
									<Encre {etat}>relié à <strong>{a.characterName}</strong></Encre>
								{:else if a.role === 'joueur'}
									<span class="attente">en attente de liaison</span>
								{:else}
									<span class="attente">sans personnage</span>
								{/if}
								{#if a.forcePasswordReset}<span class="reset">· code temporaire en cours</span>{/if}
							</span>
							<span class="venue chiffres">
								{#if a.lastSeenAt}<span title={leA(a.lastSeenAt)}>{leA(a.lastSeenAt)}</span><span
										class="relatif">&nbsp;·&nbsp;{relatif(a.lastSeenAt, maintenant)}</span
									>{:else}<span class="attente">jamais venu</span>{/if}
							</span>
							<span class="pli" aria-hidden="true"></span>
						</summary>

						<div class="operations">
							<section class="op">
								<h3 class="repere">Liaison</h3>
								{#if a.characterId}
									<form method="POST" action="?/delier" use:enhance={pour(a.id, 'Délié')}>
										<input type="hidden" name="accountId" value={a.id} />
										<input type="hidden" name="expectedRevision" value={a.revision} />
										<p class="etat">Relié à <strong>{a.characterName}</strong>.</p>
										<Bouton variante="trait" type="submit">Délier</Bouton>
									</form>
								{:else if data.unlinkedCharacters.length}
									<form method="POST" action="?/lier" use:enhance={pour(a.id, 'Lié')}>
										<input type="hidden" name="accountId" value={a.id} />
										<input type="hidden" name="expectedRevision" value={a.revision} />
										<label class="choix">
											<span>Personnage sans compte</span>
											<select name="characterId" required>
												{#each data.unlinkedCharacters as c (c.id)}<option value={c.id}
														>{c.name} · {c.oathName}</option
													>{/each}
											</select>
										</label>
										<Bouton variante="tampon" type="submit">Lier</Bouton>
									</form>
								{:else}
									<p class="etat">Aucun personnage n’attend de compte.</p>
								{/if}
							</section>

							<section class="op ordinateur">
								<h3 class="repere">Rôle</h3>
								<form method="POST" action="?/role" use:enhance={pour(a.id, 'Rôle changé')}>
									<input type="hidden" name="accountId" value={a.id} />
									<input type="hidden" name="expectedRevision" value={a.revision} />
									<label class="choix">
										<span>Rôle du compte</span>
										<select name="role">
											{#each ROLES as r (r.id)}<option value={r.id} selected={a.role === r.id}
													>{r.libelle}</option
												>{/each}
										</select>
									</label>
									<Bouton variante="trait" type="submit">Changer le rôle</Bouton>
								</form>
							</section>

							{#if !moi}
								<section class="op ordinateur">
									<h3 class="repere">Mot de passe</h3>
									<form
										method="POST"
										action="?/reinitialiser"
										use:enhance={pour(a.id, 'Réinitialisé')}
									>
										<input type="hidden" name="accountId" value={a.id} />
										<p class="etat">
											Un code valable une heure remplace le mot de passe ; ses sessions se ferment.
										</p>
										<Bouton variante="rouille" type="submit">Réinitialiser le mot de passe</Bouton>
									</form>
								</section>
							{/if}

							{#if code && code.accountId === a.id}
								<div class="code" role="status">
									<p class="repere">Code temporaire · {a.pseudo}</p>
									<p class="secret">{code.secret}</p>
									<p class="echeance">
										valable une heure · jusqu’à <span class="chiffres">{heure(code.expiresAt)}</span
										>
									</p>
									<p class="consigne">
										À transmettre au propriétaire du compte. Il devra choisir un nouveau mot de
										passe à la connexion.
									</p>
									<p class="consigne grise">Ce code ne sera plus affiché.</p>
									<Bouton variante="texte" onclick={() => (efface = code.secret)}
										>Effacer ce code</Bouton
									>
								</div>
							{/if}

							{#if !moi}
								<section class="op rayer ordinateur">
									<h3 class="repere">Rayer ce compte</h3>
									<form method="POST" action="?/rayer" use:enhance={pour(a.id, 'Rayé')}>
										<input type="hidden" name="accountId" value={a.id} />
										<p class="etat">
											Le compte se ferme et ses sessions avec lui. {#if a.characterName}<strong
													>{a.characterName}</strong
												> est conservé et redevient sans compte.{/if}
										</p>
										<div class="confirmer">
											<Champ
												libelle={'Saisis « ' + a.pseudo + ' » pour confirmer'}
												name="typedPseudo"
												id={'rayer-' + a.id}
												autocomplete="off"
												required
											/>
											<Bouton variante="rouille" type="submit">Rayer ce compte</Bouton>
										</div>
									</form>
								</section>
							{/if}

							<p class="sur-ordinateur">Rôle, mot de passe et rature&nbsp;: sur ordinateur.</p>

							{#if cible === a.id}<div class="note">{@render note()}</div>{/if}
						</div>
					</details>
				</li>
			{/each}
		</ul>
	{/if}
</PageRegistre>

<style>
	.outils {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 12px var(--ligne);
		padding-bottom: var(--ligne);
	}
	.recherche {
		display: flex;
		align-items: flex-end;
		gap: 16px;
		flex: 1 1 22rem;
		max-width: 34rem;
	}
	.recherche :global(.champ) {
		flex: 1;
	}
	.filtres {
		display: flex;
		flex-wrap: wrap;
		gap: 0 20px;
	}
	.filtres a {
		min-width: var(--cible);
		justify-content: center;
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: var(--cible);
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
		text-decoration: none;
	}
	.filtres a:hover,
	.filtres a.courant {
		color: var(--encre);
	}
	.marque {
		width: 5px;
		height: 5px;
		rotate: 45deg;
	}
	.courant .marque {
		background: var(--encre-humide);
	}

	.tete-liste,
	summary {
		display: grid;
		grid-template-columns: minmax(9rem, 1.2fr) 8rem minmax(12rem, 2fr) minmax(12rem, 1.6fr) 24px;
		align-items: center;
		gap: 0 16px;
	}
	.tete-liste {
		padding: 0 8px;
		min-height: var(--ligne);
		font: var(--t-repere);
		font-variant-numeric: lining-nums tabular-nums;
		letter-spacing: var(--approche-repere);
		text-transform: uppercase;
		color: var(--encre-grise);
		border-bottom: 1px solid var(--reglure);
	}
	.comptes li {
		border-bottom: 1px solid var(--reglure);
	}
	summary {
		min-height: calc(var(--ligne) * 2);
		padding: 0 8px;
		cursor: pointer;
		list-style: none;
		transition: background 160ms;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	summary:hover,
	details[open] > summary {
		background: color-mix(in srgb, var(--encre) 4%, transparent);
	}
	.pseudo {
		font: 600 15px/24px var(--corps);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
		overflow-wrap: anywhere;
	}
	.toi {
		font-weight: 500;
		color: var(--encre-2);
	}
	.role {
		font: var(--t-repere);
		font-variant-numeric: lining-nums tabular-nums;
		letter-spacing: var(--approche-repere);
		text-transform: uppercase;
		color: var(--encre-2);
	}
	.liaison,
	.venue {
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}
	.liaison strong {
		font-weight: 600;
		color: var(--encre);
	}
	.attente {
		color: var(--encre-grise);
	}
	.reset {
		color: var(--rouille);
	}
	.relatif {
		color: var(--encre-grise);
	}
	.pli {
		justify-self: end;
		width: 8px;
		height: 8px;
		border-right: 1px solid var(--encre-2);
		border-bottom: 1px solid var(--encre-2);
		rotate: -45deg;
		transition: rotate 200ms;
	}
	details[open] .pli {
		rotate: 45deg;
	}

	.operations {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--ligne) calc(var(--ligne) * 2);
		padding: var(--ligne) 8px calc(var(--ligne) * 1.5);
		border-top: 1px dashed var(--reglure);
		background: color-mix(in srgb, var(--encre) 2%, transparent);
	}
	.op form {
		display: grid;
		gap: 12px;
		justify-items: start;
	}
	.op h3 {
		line-height: var(--ligne);
		color: var(--encre);
	}
	.etat {
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}
	.etat strong {
		font-weight: 600;
		color: var(--encre);
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

	/* La rature d'un compte : sous un filet double, toute la largeur. */
	.rayer {
		grid-column: 1 / -1;
		padding-top: var(--ligne);
		border-top: 3px double var(--reglure);
	}
	.confirmer {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 12px 24px;
		width: 100%;
	}
	.confirmer :global(.champ) {
		flex: 0 1 22rem;
	}

	.code {
		grid-column: 1 / -1;
		display: grid;
		gap: 4px;
		justify-items: start;
		padding: var(--ligne);
		background: var(--page-2);
		border-left: 2px solid var(--rouille);
	}
	.code .repere {
		color: var(--rouille);
	}
	.secret {
		padding: 8px 0;
		font: 500 20px/28px var(--mono);
		font-variant-numeric: lining-nums tabular-nums;
		letter-spacing: 0.04em;
		color: var(--encre);
		overflow-wrap: anywhere;
		user-select: all;
	}
	.echeance {
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
	}
	.consigne {
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}
	.grise {
		color: var(--encre-grise);
	}
	.sur-ordinateur {
		display: none;
	}
	.note {
		grid-column: 1 / -1;
	}

	@media (max-width: 1100px) {
		.tete-liste {
			display: none;
		}
		summary {
			grid-template-columns: minmax(0, 1fr) auto 24px;
			grid-template-areas: 'pseudo role pli' 'liaison liaison pli' 'venue venue pli';
			padding: 8px;
			gap: 0 12px;
		}
		.pseudo {
			grid-area: pseudo;
		}
		.role {
			grid-area: role;
		}
		.liaison {
			grid-area: liaison;
		}
		.venue {
			grid-area: venue;
		}
		.pli {
			grid-area: pli;
		}
		.operations {
			grid-template-columns: 1fr 1fr;
		}
	}
	@media (max-width: 760px) {
		.recherche {
			flex-basis: 100%;
			max-width: none;
		}
		.operations {
			grid-template-columns: 1fr;
		}
		.ordinateur {
			display: none;
		}
		.sur-ordinateur {
			display: block;
			font: var(--t-libelle);
			font-variant-numeric: lining-nums tabular-nums;
			color: var(--encre-grise);
		}
	}
</style>
