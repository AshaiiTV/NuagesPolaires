<script lang="ts">
	// Une ligne de la colonne « Combattants » de la Table du MJ : colonnes fixes
	// nom · PV · EP · EM · statuts · déclaré, et le menu « … » qui s'ouvre EN LIGNE sous la ligne
	// (ajustement avec ancienne → nouvelle valeur et motif obligatoire, statut avec durée, invocation,
	// ordre ou initiative, retrait). Sur téléphone, la ligne devient un accordéon. 03-vision §5.8.
	import type { Fighter, ResourceKey, StatusId } from '$lib/game/combat/types';
	import { STATUS_IDS } from '$lib/game/combat/statuses';
	import Losange from '$lib/ui/Losange.svelte';
	import Rature from '$lib/ui/Rature.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import { statut, ko, sansEmoji } from './texte';
	import type { TableMJ } from './table.svelte';

	interface Props {
		table: TableMJ;
		f: Fighter;
		ouvert: boolean;
		basculer: () => void;
		/** Le combattant déclare en ce moment. */
		declare: boolean;
		initiative: boolean;
	}
	let { table, f, ouvert, basculer, declare, initiative }: Props = $props();

	const MOTIF = 'ajustement en cours de combat';
	type Mode = 'ajuster' | 'restaurer' | 'statut' | 'invocation' | 'ordre' | 'retirer';
	let mode = $state<Mode>('ajuster');
	let ressource = $state<ResourceKey>('pv');
	let valeur = $state<number>(0);
	let motif = $state(MOTIF);
	let statutChoisi = $state<StatusId>('saignement');
	let tours = $state(2);
	let rang = $state(1);
	let panneau = $state<HTMLElement | null>(null);

	const cur = (r: ResourceKey) => f[`${r}Cur`];
	const max = (r: ResourceKey) => f[`${r}Max`];
	const demarre = $derived(table.demarre);
	const invocations = $derived(
		f.type === 'player' && !f.isSummon
			? table.capacites(f.id).filter((o) => o.kind === 'summon' && o.summon)
			: []
	);
	const declares = $derived(
		(table.etat.declarations[f.id] ?? []).reduce((n, a) => n + (a.consumeActions || 1), 0)
	);
	const maxActions = $derived(demarre && !ko(f) ? table.actionsMax(f.id) : 0);
	const pvBas = $derived(f.pvMax > 0 && f.pvCur / f.pvMax < 0.32);
	const apercu = $derived(
		Math.max(0, Math.min(max(ressource) || 999, Math.trunc(Number(valeur) || 0)))
	);

	$effect(() => {
		if (ouvert) {
			valeur = cur(ressource);
			rang = Math.max(1, table.etat.order.indexOf(f.id) + 1);
			queueMicrotask(() => panneau?.querySelector<HTMLElement>('input, select, button')?.focus());
		}
	});

	function choisirRessource(r: ResourceKey) {
		ressource = r;
		valeur = cur(r);
		mode = 'ajuster';
	}
	function preremplir(r: ResourceKey, v: number, m: string) {
		ressource = r;
		valeur = Math.max(0, v);
		motif = m;
		mode = 'ajuster';
	}
	function fermer() {
		motif = MOTIF;
		mode = 'ajuster';
		basculer();
	}
	function noterAjustement(e: SubmitEvent) {
		e.preventDefault();
		if (!motif.trim()) return;
		if (table.ajuster(f.id, ressource, apercu, motif)) fermer();
	}
	function noterRestauration(e: SubmitEvent) {
		e.preventDefault();
		if (motif.trim() && table.restaurer(f.id, motif)) fermer();
	}
	function noterStatut(e: SubmitEvent) {
		e.preventDefault();
		if (motif.trim() && table.poserStatut(f.id, statutChoisi, tours, motif)) fermer();
	}
	function noterOrdre(e: SubmitEvent) {
		e.preventDefault();
		if (!demarre) {
			if (table.initiative(f.id)) fermer();
		} else if (motif.trim() && table.position(f.id, rang, motif)) fermer();
	}
	function noterRetrait(e: SubmitEvent) {
		e.preventDefault();
		if (motif.trim() && table.retirer(f.id, motif)) fermer();
	}
	function touche(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.stopPropagation();
			fermer();
		}
	}
	const idPanneau = $derived(`menu-${f.id}`);
	const RESSOURCES: { id: ResourceKey; nom: string }[] = [
		{ id: 'pv', nom: 'PV' },
		{ id: 'ep', nom: 'EP' },
		{ id: 'em', nom: 'EM' }
	];
</script>

<li
	class="combattant"
	class:ko={ko(f)}
	class:declare
	class:ouvert
	class:adversaire={f.type === 'beast'}
>
	<div class="ligne">
		<span class="nom">
			<span class="texte" title={f.name}>{f.name}</span>
			{#if initiative || ko(f) || f.isSummon}
				<span class="marques">
					{#if ko(f)}<span class="marque ko-marque">KO</span>{/if}
					{#if initiative}<span class="marque" title="Ouvre l’ordre de déclaration">initiative</span
						>{/if}
					{#if f.isSummon}<span class="marque">invocation</span>{/if}
				</span>
			{/if}
		</span>
		{#each RESSOURCES as r (r.id)}
			<span class="res chiffres r-{r.id}" class:bas={r.id === 'pv' && pvBas}>
				{#if max(r.id) > 0}
					<span class="sr-only">{r.nom} </span><span class="cur">{cur(r.id)}</span><span class="max"
						>/{max(r.id)}</span
					>
				{:else}
					<span class="sr-only">sans {r.nom}</span>
				{/if}
			</span>
		{/each}
		<span class="statuts">
			{#each f.statuses as s (s.id)}
				{@const st = statut(s.id)}
				<Losange couleur={st.couleur} libelle={st.libelle} detail="{s.tours} t." />
			{/each}
		</span>
		<span
			class="declare-points chiffres"
			aria-label={maxActions
				? `${declares} action${declares > 1 ? 's' : ''} déclarée${declares > 1 ? 's' : ''} sur ${maxActions}`
				: undefined}
		>
			{#if maxActions > 5}<span aria-hidden="true">{declares}/{maxActions}</span>
			{:else if maxActions}
				<span aria-hidden="true"
					>{'●'.repeat(Math.min(declares, maxActions))}{'○'.repeat(
						Math.max(0, maxActions - declares)
					)}</span
				>
			{/if}
		</span>
		<button
			type="button"
			class="menu"
			aria-expanded={ouvert}
			aria-controls={idPanneau}
			aria-label="Gestes sur {f.name}"
			onclick={basculer}
		>
			<span aria-hidden="true">…</span>
		</button>
	</div>

	{#if ouvert}
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="panneau"
			id={idPanneau}
			bind:this={panneau}
			role="region"
			aria-label="Gestes sur {f.name}"
			onkeydown={touche}
		>
			<div class="modes" role="group" aria-label="Geste">
				<button type="button" class:actif={mode === 'ajuster'} onclick={() => (mode = 'ajuster')}
					>Ajuster</button
				>
				{#if f.epMax || f.emMax}
					<button
						type="button"
						class:actif={mode === 'restaurer'}
						onclick={() => ((mode = 'restaurer'), (motif = 'restauration'))}>Restauration</button
					>
				{/if}
				<button type="button" class:actif={mode === 'statut'} onclick={() => (mode = 'statut')}
					>Statut</button
				>
				{#if invocations.length && demarre}
					<button
						type="button"
						class:actif={mode === 'invocation'}
						onclick={() => ((mode = 'invocation'), (motif = 'invocation'))}>Invocation</button
					>
				{/if}
				<button
					type="button"
					class:actif={mode === 'ordre'}
					onclick={() => ((mode = 'ordre'), (motif = 'ordre modifié'))}
					>{demarre ? 'Ordre' : 'Initiative'}</button
				>
				<button
					type="button"
					class:actif={mode === 'retirer'}
					onclick={() => ((mode = 'retirer'), (motif = 'retiré de la Table'))}>Retirer</button
				>
			</div>

			{#if mode === 'ajuster'}
				<form class="geste" onsubmit={noterAjustement}>
					<div class="choix-ressource" role="radiogroup" aria-label="Ressource">
						{#each RESSOURCES as r (r.id)}
							{#if max(r.id) > 0}
								<button
									type="button"
									role="radio"
									aria-checked={ressource === r.id}
									class:actif={ressource === r.id}
									onclick={() => choisirRessource(r.id)}>{r.nom}</button
								>
							{/if}
						{/each}
					</div>
					<label class="valeur">
						<span>Nouvelle valeur</span>
						<span class="pas-a-pas">
							<button
								type="button"
								onclick={() => (valeur = Math.max(0, (Number(valeur) || 0) - 5))}
								aria-label="Moins 5">−5</button
							>
							<input
								class="chiffres"
								type="number"
								min="0"
								max={max(ressource) || 999}
								bind:value={valeur}
								inputmode="numeric"
							/>
							<button
								type="button"
								onclick={() => (valeur = (Number(valeur) || 0) + 5)}
								aria-label="Plus 5">+5</button
							>
						</span>
					</label>
					<label class="motif">
						<span>Motif</span>
						<input bind:value={motif} required maxlength={200} />
					</label>
					<p class="apercu chiffres" aria-live="polite">
						{ressource.toUpperCase()}
						{#if apercu !== cur(ressource)}<Rature
								ancien={cur(ressource)}
								nouveau={apercu}
							/>{:else}{cur(ressource)} · inchangé{/if}
						<span class="max">/{max(ressource)}</span>
					</p>
					<div class="gestes">
						<Bouton
							variante="trait"
							type="submit"
							disabled={apercu === cur(ressource) || !motif.trim()}>Noter</Bouton
						>
						{#if f.epMax}
							<button
								type="button"
								class="raccourci"
								onclick={() =>
									preremplir(
										'ep',
										f.epCur - Math.ceil(f.epMax * 0.5),
										'repos court (−50 % EP max)'
									)}>Repos court</button
							>
						{/if}
						<button type="button" class="raccourci" onclick={fermer}>Fermer</button>
					</div>
				</form>
			{:else if mode === 'restaurer'}
				<form class="geste" onsubmit={noterRestauration}>
					<p class="apercu chiffres">
						{#if f.epMax}EP <Rature ancien={f.epCur} nouveau={f.epMax} />{/if}
						{#if f.emMax}<span class="sep">·</span> EM <Rature
								ancien={f.emCur}
								nouveau={f.emMax}
							/>{/if}
					</p>
					<label class="motif">
						<span>Motif</span>
						<input bind:value={motif} required maxlength={200} />
					</label>
					<div class="gestes">
						<Bouton
							variante="trait"
							type="submit"
							disabled={!motif.trim() || (f.epCur === f.epMax && f.emCur === f.emMax)}
							>Noter la restauration</Bouton
						>
						<button type="button" class="raccourci" onclick={fermer}>Fermer</button>
					</div>
				</form>
			{:else if mode === 'statut'}
				<form class="geste" onsubmit={noterStatut}>
					<label class="champ-court">
						<span>Statut</span>
						<select bind:value={statutChoisi}>
							{#each STATUS_IDS as id (id)}<option value={id}>{statut(id).libelle}</option>{/each}
						</select>
					</label>
					<label class="champ-court">
						<span>Durée (rounds)</span>
						<input class="chiffres" type="number" min="1" max="10" bind:value={tours} />
					</label>
					<label class="motif">
						<span>Motif</span>
						<input bind:value={motif} required maxlength={200} />
					</label>
					<div class="gestes">
						<Bouton variante="trait" type="submit" disabled={!motif.trim()}>Poser le statut</Bouton>
						<button type="button" class="raccourci" onclick={fermer}>Fermer</button>
					</div>
					{#if f.statuses.length}
						<ul class="poses">
							{#each f.statuses as s (s.id)}
								{@const st = statut(s.id)}
								<li>
									<Losange couleur={st.couleur} libelle={st.libelle} detail="{s.tours} t." />
									<button
										type="button"
										class="raccourci"
										onclick={() => motif.trim() && table.retirerStatut(f.id, s.id, motif)}
										>Retirer</button
									>
								</li>
							{/each}
						</ul>
					{/if}
				</form>
			{:else if mode === 'invocation'}
				<div class="geste">
					<label class="motif">
						<span>Motif</span>
						<input bind:value={motif} required maxlength={200} />
					</label>
					<div class="gestes">
						{#each invocations as o (o.label)}
							<Bouton
								variante="trait"
								onclick={() =>
									o.summon && motif.trim() && table.invoquer(f.id, o.summon, motif) && fermer()}
							>
								Invoquer {sansEmoji(o.label)} · {o.summon?.pv} PV
							</Bouton>
						{/each}
						<button type="button" class="raccourci" onclick={fermer}>Fermer</button>
					</div>
				</div>
			{:else if mode === 'ordre'}
				<form class="geste" onsubmit={noterOrdre}>
					{#if demarre}
						<label class="champ-court">
							<span>Position dans l’ordre</span>
							<input
								class="chiffres"
								type="number"
								min="1"
								max={table.etat.order.length}
								bind:value={rang}
							/>
						</label>
						<label class="motif">
							<span>Motif</span>
							<input bind:value={motif} required maxlength={200} />
						</label>
						<p class="aide">Changer l’ordre vide les déclarations du round en cours.</p>
						<div class="gestes">
							<Bouton variante="trait" type="submit" disabled={!motif.trim()}
								>Placer en position {rang}</Bouton
							>
							<button type="button" class="raccourci" onclick={fermer}>Fermer</button>
						</div>
					{:else}
						<p class="aide">
							L’initiative ouvre l’ordre de déclaration ; elle reste fixe pour tout le combat.
						</p>
						<div class="gestes">
							<Bouton variante="trait" type="submit" disabled={initiative}
								>{initiative ? `Initiative : ${f.name}` : `Donner l’initiative à ${f.name}`}</Bouton
							>
							<button type="button" class="raccourci" onclick={fermer}>Fermer</button>
						</div>
					{/if}
				</form>
			{:else if mode === 'retirer'}
				<form class="geste" onsubmit={noterRetrait}>
					<p class="aide">
						{f.name} quitte la Table.{#if demarre}
							Les déclarations du round en cours sont vidées et l’ordre repart de l’ordre d’ajout.{/if}
					</p>
					<label class="motif">
						<span>Motif</span>
						<input bind:value={motif} required maxlength={200} />
					</label>
					<div class="gestes">
						<Bouton variante="rouille" type="submit" disabled={!motif.trim()}
							>Retirer {f.name}</Bouton
						>
						<button type="button" class="raccourci" onclick={fermer}>Garder</button>
					</div>
				</form>
			{/if}
		</div>
	{/if}
</li>

<style>
	.combattant {
		border-bottom: 1px solid var(--reglure);
	}
	.ligne {
		position: relative;
		display: grid;
		grid-template-columns: var(--colonnes-combattants);
		grid-template-areas: 'nom pv ep em pts menu' 'st st st st st st';
		align-items: center;
		gap: 0 12px;
		min-height: 48px;
		padding-left: 12px;
	}
	.declare .ligne::before {
		content: '';
		position: absolute;
		left: 0;
		top: 8px;
		bottom: 8px;
		width: 2px;
		background: var(--encre-humide);
	}
	.nom {
		display: grid;
		min-width: 0;
		padding: 4px 0;
	}
	.marques {
		display: flex;
		gap: 8px;
		line-height: 16px;
	}
	.texte {
		white-space: normal;
		overflow-wrap: anywhere;
		font: 600 14px/24px var(--corps);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
	}
	.adversaire .texte {
		color: var(--encre-2);
	}
	.declare .texte {
		color: var(--encre-humide);
	}
	.marque {
		flex: none;
		font: var(--t-repere);
		font-variant-numeric: lining-nums tabular-nums;
		line-height: 16px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--encre-grise);
	}
	.ko .texte {
		color: var(--encre-grise);
		text-decoration: line-through;
		text-decoration-thickness: 1px;
	}
	.ko-marque {
		color: var(--rouille);
	}
	.res {
		font: 500 14px/24px var(--corps);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
		text-align: right;
		white-space: nowrap;
	}
	.res .max {
		color: var(--encre-2);
	}
	.res.bas .cur {
		color: var(--rouille);
	}
	.ko .res .cur {
		color: var(--encre-grise);
	}
	.statuts :global(.sens) {
		white-space: nowrap;
	}
	.nom {
		grid-area: nom;
	}
	.r-pv {
		grid-area: pv;
	}
	.r-ep {
		grid-area: ep;
	}
	.r-em {
		grid-area: em;
	}
	.menu {
		grid-area: menu;
	}
	.declare-points {
		grid-area: pts;
	}
	.statuts {
		grid-area: st;
		padding-bottom: 6px;
		overflow: hidden;
		display: flex;
		flex-wrap: wrap;
		gap: 0 12px;
		min-width: 0;
		line-height: 20px;
	}
	.declare-points {
		font: 400 12px/14px var(--corps);
		font-variant-numeric: lining-nums tabular-nums;
		letter-spacing: 0;
		color: var(--encre-humide);
		white-space: nowrap;
	}
	.menu {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border: 1px solid transparent;
		border-radius: var(--rayon);
		background: none;
		font: 600 18px/1 var(--corps);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}
	.menu:hover,
	.menu[aria-expanded='true'] {
		color: var(--encre);
		border-color: color-mix(in srgb, var(--encre) 22%, transparent);
	}

	.panneau {
		display: grid;
		gap: 12px;
		margin: 0 0 12px 12px;
		padding: 12px 16px 16px;
		background: var(--page-2);
		border-left: 2px solid var(--encre-humide);
	}
	.modes,
	.choix-ressource {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}
	.modes button,
	.choix-ressource button {
		min-height: 44px;
		padding: 0 12px;
		border: 1px solid transparent;
		border-radius: var(--rayon);
		background: none;
		font: 500 14px/24px var(--corps);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}
	.modes button.actif,
	.choix-ressource button.actif {
		color: var(--encre);
		border-color: color-mix(in srgb, var(--encre) 28%, transparent);
	}
	.geste {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 12px 24px;
	}
	label {
		display: grid;
		gap: 0;
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}
	label input,
	label select {
		min-height: 44px;
		padding: 8px 0;
		border: 0;
		border-bottom: 1px solid color-mix(in srgb, var(--encre) 28%, transparent);
		border-radius: 0;
		background: transparent;
		font: 500 14px/24px var(--corps);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
	}
	label select {
		padding-right: 8px;
		background: var(--page-2);
	}
	.motif {
		flex: 1 1 220px;
	}
	.champ-court input {
		width: 96px;
	}
	.pas-a-pas {
		display: inline-flex;
		align-items: center;
	}
	.pas-a-pas input {
		width: 64px;
		text-align: center;
		-moz-appearance: textfield;
		appearance: textfield;
	}
	.pas-a-pas input::-webkit-inner-spin-button,
	.pas-a-pas input::-webkit-outer-spin-button {
		-webkit-appearance: none;
	}
	.pas-a-pas button,
	.raccourci {
		min-width: 44px;
		min-height: 44px;
		padding: 0 10px;
		border: 0;
		background: none;
		font: 500 14px/24px var(--corps);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--encre-humide) 45%, transparent);
		text-underline-offset: 4px;
	}
	.pas-a-pas button {
		text-decoration: none;
	}
	.pas-a-pas button:hover,
	.raccourci:hover {
		color: var(--encre);
	}
	.apercu {
		flex-basis: 100%;
		font: 500 14px/24px var(--corps);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
	}
	.apercu .max,
	.sep {
		color: var(--encre-2);
	}
	.aide {
		flex-basis: 100%;
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}
	.gestes {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 12px;
		flex-basis: 100%;
	}
	.poses {
		flex-basis: 100%;
	}
	.poses li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-top: 1px solid var(--reglure);
	}

	@media (max-width: 760px) {
		.ligne {
			grid-template-columns: minmax(0, 1fr) 50px 50px 50px 44px;
			grid-template-areas:
				'nom pv ep em menu'
				'st st st pts menu';
			gap: 0 8px;
			padding: 4px 0 4px 12px;
		}
		.nom {
			grid-area: nom;
		}
		.r-pv {
			grid-area: pv;
		}
		.r-ep {
			grid-area: ep;
		}
		.r-em {
			grid-area: em;
		}
		.statuts {
			grid-area: st;
		}
		.declare-points {
			grid-area: pts;
			text-align: right;
		}
		.menu {
			grid-area: menu;
		}
		.panneau {
			margin-left: 0;
		}
	}
</style>
