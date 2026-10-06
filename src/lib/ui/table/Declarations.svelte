<script lang="ts">
	// 01 Déclarations — une ligne par combattant dans l'ordre fixé au démarrage : action, cible, coût.
	// Le déclarant du moment porte le formulaire (Entrée déclare) ; les déclarations envoyées depuis le
	// feuillet d'un joueur apparaissent sous sa ligne, en encre du joueur, « proposée à 21:42 » : le MJ
	// les reprend d'un clic ou les ignore. Une déclaration de joueur ne touche jamais une ressource.
	// 03-vision §5.8, §12.4.
	import { enhance } from '$app/forms';
	import Bouton from '$lib/ui/Bouton.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import { creerEcriture } from '$lib/ui/ecriture.svelte';
	import { heure } from '$lib/ui/dates';
	import { ACTION_RULES, actionRule } from '$lib/game/rules';
	import type { AbilityOption, ActionId, CombatAction, Fighter } from '$lib/game/combat/types';
	import type { DeclarationView } from '$lib/schemas/declarations';
	import type { TableMJ } from './table.svelte';
	import { ACTIONS_DE_BASE, cout, ko, libelleAction, sansEmoji } from './texte';

	interface Props {
		table: TableMJ;
		/** Déclarations « proposées » par les joueurs pour ce combat (servies par getTable). */
		propositions: DeclarationView[];
	}
	let { table, propositions }: Props = $props();

	const etat = $derived(table.etat);
	const ordre = $derived(
		etat.order.map((id) => etat.fighters.find((f) => f.id === id)).filter((f): f is Fighter => !!f)
	);
	const declarant = $derived(table.declarant);
	const nom = (id: string | null) =>
		id ? (etat.fighters.find((f) => f.id === id)?.name ?? 'cible partie') : '';

	// ── Formulaire du déclarant ──────────────────────────────────────────────────────────────────
	type Choix = {
		cle: string;
		libelle: string;
		cout: string;
		cible: 'ennemi' | 'allie' | null;
		soin: boolean;
		base?: ActionId;
		option?: AbilityOption;
	};
	/** Action pré-choisie par « Reprendre » pour un combattant qui n'a pas encore la main. */
	let preselection = $state<Record<string, string>>({});
	let choix = $state('');
	let cible = $state('');
	let cibleSoin = $state('');
	let formulaire = $state<HTMLFormElement | null>(null);

	function regleDe(f: Fighter, id: string) {
		if (id === 'bloquer' && f.type === 'beast') return actionRule('bloquer_corps');
		if (id === 'frappe' && f.claymorePosture) return actionRule('frappe_haute');
		return actionRule(id);
	}
	function choixPour(f: Fighter): Choix[] {
		const base: Choix[] = ACTIONS_DE_BASE.filter(
			(a) => !('joueur' in a) || f.type === 'player'
		).map((a) => {
			const r = regleDe(f, a.id);
			const c = r.id === 'frappe_haute' && f.claymorePosture ? f.claymorePosture.epCost : r.cost;
			return {
				cle: a.id,
				libelle: r.name,
				cout: c && r.resource ? `${c} ${r.resource.toUpperCase()}` : 'sans coût',
				cible: a.cible === 'ennemi' ? 'ennemi' : null,
				soin: false,
				base: a.id
			};
		});
		const capacites: Choix[] = table.capacites(f.id).map((o, i) => ({
			cle: `cap-${i}`,
			libelle: sansEmoji(o.label) || o.abilityName,
			cout: cout({ epCost: o.epCost ?? 0, emCost: o.emCost ?? 0 }),
			cible: o.targetType === 'enemy' ? 'ennemi' : o.targetType === 'ally' ? 'allie' : null,
			soin: o.healTargetType === 'ally',
			option: o
		}));
		return [...base, ...capacites];
	}
	const fDeclarant = $derived(
		declarant ? etat.fighters.find((f) => f.id === declarant) : undefined
	);
	const options = $derived(fDeclarant ? choixPour(fDeclarant) : []);
	const choisi = $derived(options.find((o) => o.cle === choix));
	const camp = (f: Fighter) => (f.type === 'beast' ? 'beast' : 'player');
	const ennemis = $derived(
		fDeclarant ? etat.fighters.filter((x) => camp(x) !== camp(fDeclarant) && !ko(x)) : []
	);
	const allies = $derived(
		fDeclarant ? etat.fighters.filter((x) => camp(x) === camp(fDeclarant) && !ko(x)) : []
	);
	const restantes = $derived(declarant ? table.actionsRestantes(declarant) : 0);

	// Le formulaire change de main : l'action reprend la préselection ou la Frappe, la cible la première.
	let dernierDeclarant = '';
	$effect(() => {
		const id = declarant ?? '';
		if (id === dernierDeclarant) return;
		dernierDeclarant = id;
		choix = (id && preselection[id]) || 'frappe';
	});
	$effect(() => {
		if (choisi?.cible === 'ennemi' && !ennemis.some((x) => x.id === cible))
			cible = ennemis[0]?.id ?? '';
		if (choisi?.cible === 'allie' && !allies.some((x) => x.id === cible))
			cible = allies[0]?.id ?? '';
		if (choisi?.soin && !allies.some((x) => x.id === cibleSoin)) cibleSoin = allies[0]?.id ?? '';
	});

	function declarer(e: SubmitEvent) {
		e.preventDefault();
		if (!declarant || !choisi) return;
		const opts = {
			target: choisi.cible ? cible || null : null,
			healTarget: choisi.soin ? cibleSoin || null : null
		};
		const ok = choisi.option
			? table.declarer(declarant, choisi.option.action, { ...choisi.option, ...opts })
			: table.declarer(declarant, choisi.base!, opts);
		if (ok && declarant) {
			const reste = { ...preselection };
			delete reste[declarant];
			preselection = reste;
		}
		queueMicrotask(() => formulaire?.querySelector<HTMLElement>('select')?.focus());
	}

	// ── Propositions des joueurs ─────────────────────────────────────────────────────────────────
	let reprises = $state<string[]>([]);
	const proposees = $derived(
		propositions.filter((d) => d.status === 'proposee' && !reprises.includes(d.id))
	);
	function propositionsDe(f: Fighter) {
		return f.characterId && f.type === 'player' && !f.isSummon
			? proposees.filter((d) => d.characterId === f.characterId)
			: [];
	}
	/** Le mot de la déclaration (« Esquive ») retrouve l'action de base de rules.ts, sinon rien. */
	function actionDuMot(mot: string): string | null {
		const m = mot.trim().toLowerCase();
		const r = ACTION_RULES.find((x) => x.name.toLowerCase() === m || x.id === m);
		if (!r) return null;
		const id = r.id === 'bloquer_corps' ? 'bloquer' : r.id === 'frappe_haute' ? 'frappe' : r.id;
		return ACTIONS_DE_BASE.some((a) => a.id === id) ? id : null;
	}
	let noteReprise = $state<string | null>(null);
	function reprendre(f: Fighter, d: DeclarationView) {
		const id = actionDuMot(d.word);
		reprises = [...reprises, d.id];
		if (!id) {
			noteReprise = `« ${d.word} » n’est pas une action de la Table : écris-la à la main pour ${f.name}.`;
			return;
		}
		noteReprise = null;
		preselection = { ...preselection, [f.id]: id };
		if (declarant === f.id) {
			choix = id;
			queueMicrotask(() =>
				formulaire?.querySelector<HTMLElement>('select, button[type="submit"]')?.focus()
			);
		}
	}
	const ecritureIgnorer = creerEcriture();
	const motifIgnorer = 'laissée de côté à la Table';

	function ligneAction(a: CombatAction) {
		const cibleNom = a.target ? nom(a.target) : a.healTarget ? nom(a.healTarget) : '';
		return {
			libelle: libelleAction(a),
			cible: cibleNom,
			cout: a.action === 'passer' ? '' : cout(a)
		};
	}
	function regroupe(actions: CombatAction[]) {
		// « Passer » remplit les actions restantes : une seule mention.
		const out: (CombatAction & { repetitions: number })[] = [];
		for (const a of actions) {
			const dernier = out.at(-1);
			if (a.action === 'passer' && dernier?.action === 'passer') continue;
			if (dernier && JSON.stringify({ ...dernier, repetitions: undefined }) === JSON.stringify(a))
				dernier.repetitions++;
			else out.push({ ...a, repetitions: 1 });
		}
		return out;
	}
</script>

<ol class="declarations" aria-label="Déclarations dans l’ordre">
	{#each ordre as f, i (f.id)}
		{@const actions = regroupe(etat.declarations[f.id] ?? [])}
		{@const courant = declarant === f.id}
		{@const fait = etat.active && (etat.phase === 'resolution' || i < etat.turn)}
		<li class="ligne" class:courant class:ko={ko(f)} class:adversaire={f.type === 'beast'}>
			<div class="tete">
				<span class="rang chiffres" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
				<span class="qui">
					<span class="nom">{f.name}</span>
					{#if ko(f)}
						<span class="etat">KO</span>
					{:else if courant}
						<span class="etat humide">déclare · {restantes} action{restantes > 1 ? 's' : ''}</span>
					{:else if !fait && table.revue === null}
						<span class="etat">attend</span>
					{/if}
				</span>
				{#if actions.length}
					<ul class="actions">
						{#each actions as a, j (j)}
							{@const l = ligneAction({
								...a,
								epCost: a.epCost * a.repetitions,
								emCost: a.emCost * a.repetitions
							})}
							<li class:passe={a.action === 'passer'}>
								<span class="action"
									>{l.libelle}{#if a.repetitions > 1}
										×{a.repetitions}{/if}</span
								>
								{#if l.cible}<span class="cible"
										><span aria-hidden="true">→</span><span class="sr-only">sur</span>
										{l.cible}</span
									>{/if}
								{#if l.cout}<span class="cout chiffres">{l.cout}</span>{/if}
							</li>
						{/each}
					</ul>
				{:else}
					<span class="actions" aria-hidden="true"></span>
				{/if}
				{#if fait && !ko(f) && table.revue === null && etat.active}
					<button
						type="button"
						class="geste"
						onclick={() => table.reprendreDeclaration(f.id)}
						aria-label="Modifier la déclaration de {f.name}">Modifier</button
					>
				{/if}
			</div>

			{#each propositionsDe(f) as d (d.id)}
				<div class="proposition">
					<p class="joueur">{d.text} <span class="quand">proposée à {heure(d.at)}</span></p>
					<div class="gestes-proposition">
						<button type="button" class="geste" onclick={() => reprendre(f, d)}>Reprendre</button>
						<form
							method="POST"
							action="?/ignorer"
							use:enhance={ecritureIgnorer.enhance({ verbe: 'Ignorée' })}
						>
							<input type="hidden" name="declaration" value={d.id} />
							<input type="hidden" name="motif" value={motifIgnorer} />
							<button type="submit" class="geste" disabled={ecritureIgnorer.enCours}>Ignorer</button
							>
						</form>
					</div>
				</div>
			{/each}

			{#if courant && fDeclarant}
				<form
					class="declarer"
					bind:this={formulaire}
					onsubmit={declarer}
					aria-label="Déclaration de {f.name}"
				>
					<label class="champ action-champ">
						<span>Action</span>
						<select bind:value={choix}>
							{#each options as o (o.cle)}
								<option value={o.cle}>{o.libelle} · {o.cout}</option>
							{/each}
						</select>
					</label>
					{#if choisi?.cible}
						<label class="champ">
							<span>Cible</span>
							<select bind:value={cible}>
								{#each choisi.cible === 'ennemi' ? ennemis : allies as x (x.id)}
									<option value={x.id}>{x.name}</option>
								{/each}
							</select>
						</label>
					{/if}
					{#if choisi?.soin}
						<label class="champ">
							<span>Soigne</span>
							<select bind:value={cibleSoin}>
								{#each allies as x (x.id)}<option value={x.id}>{x.name}</option>{/each}
							</select>
						</label>
					{/if}
					<div class="gestes">
						<Bouton variante="trait" type="submit">Déclarer</Bouton>
						<button type="button" class="geste" onclick={() => table.passer(f.id)}>Passer</button>
						{#if (etat.declarations[f.id] ?? []).length}
							<button type="button" class="geste" onclick={() => table.retirerDerniere(f.id)}
								>Retirer la dernière</button
							>
						{/if}
					</div>
					{#if choisi?.option?.descText}
						<p class="aide">{sansEmoji(choisi.option.descText)}</p>
					{/if}
				</form>
			{/if}
		</li>
	{/each}
</ol>

{#if noteReprise}
	<NoteDeMarge ton="info">{noteReprise}</NoteDeMarge>
{:else if ecritureIgnorer.note && ecritureIgnorer.note.ton !== 'attente'}
	<div aria-live="polite">
		<NoteDeMarge ton={ecritureIgnorer.note.ton}>{ecritureIgnorer.note.texte}</NoteDeMarge>
	</div>
{/if}

<style>
	.declarations {
		display: grid;
	}
	.ligne {
		position: relative;
		padding: 0 0 0 12px;
		border-bottom: 1px solid var(--reglure);
	}
	.courant::before {
		content: '';
		position: absolute;
		left: 0;
		top: 10px;
		bottom: 10px;
		width: 2px;
		background: var(--encre-humide);
	}
	.tete {
		display: grid;
		grid-template-columns: 20px minmax(0, 1fr) auto;
		align-items: start;
		gap: 0 10px;
		min-height: 44px;
		padding: 2px 0;
	}
	.qui {
		display: grid;
		min-width: 0;
	}
	.rang {
		font: var(--t-repere);
		color: var(--encre-grise);
	}
	.nom {
		min-width: 0;
		white-space: normal;
		overflow-wrap: anywhere;
		font: 600 14px/22px var(--corps);
		color: var(--encre);
	}
	.adversaire .nom {
		color: var(--encre-2);
	}
	.courant .nom {
		color: var(--encre-humide);
	}
	.ko .nom {
		color: var(--encre-grise);
		text-decoration: line-through;
		text-decoration-thickness: 1px;
	}
	.etat {
		font: var(--t-repere);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--encre-grise);
		white-space: nowrap;
	}
	.etat.humide {
		color: var(--encre-humide);
	}
	.ko .etat {
		color: var(--rouille);
	}
	.actions {
		grid-row: 2;
		grid-column: 2 / -1;
		display: grid;
		min-width: 0;
	}
	.actions li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0 8px;
		align-items: baseline;
		min-width: 0;
		font: 500 13px/20px var(--corps);
		color: var(--encre);
	}
	.actions li.passe {
		color: var(--encre-2);
	}
	.action {
		flex: none;
		white-space: nowrap;
	}
	.cible {
		grid-column: 1;
		min-width: 0;
		white-space: normal;
		overflow-wrap: anywhere;
		color: var(--encre-2);
	}
	.cout {
		grid-column: 2;
		grid-row: 1;
		margin-left: 0;
		font: var(--t-libelle);
		line-height: 20px;
		color: var(--encre-2);
		white-space: nowrap;
	}
	.proposition {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0 12px;
		margin: 0 0 8px;
		padding-left: 12px;
		border-left: 1px solid color-mix(in srgb, var(--encre-humide) 50%, transparent);
	}
	.joueur {
		font: italic 500 14px/24px var(--corps);
		color: var(--encre-humide);
	}
	.quand {
		font: var(--t-libelle);
		font-style: normal;
		color: var(--encre-2);
	}
	.gestes-proposition {
		display: flex;
		gap: 4px;
	}
	.geste {
		min-width: 44px;
		min-height: 44px;
		padding: 0 10px;
		border: 0;
		background: none;
		font: 500 14px/24px var(--corps);
		color: var(--encre-2);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--encre-humide) 45%, transparent);
		text-underline-offset: 4px;
	}
	.geste:hover:not(:disabled) {
		color: var(--encre);
	}
	.declarer {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 8px 16px;
		margin: 0 0 12px;
		padding: 8px 12px 12px;
		background: var(--page-2);
	}
	.champ {
		display: grid;
		flex: 1 1 140px;
		min-width: 0;
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.action-champ {
		flex-basis: 200px;
	}
	select {
		width: 100%;
		min-height: 44px;
		padding: 8px 0;
		border: 0;
		border-bottom: 1px solid color-mix(in srgb, var(--encre) 28%, transparent);
		border-radius: 0;
		background: var(--page-2);
		font: 500 14px/24px var(--corps);
		color: var(--encre);
	}
	.gestes {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 8px;
	}
	.aide {
		flex-basis: 100%;
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	@media (max-width: 760px) {
		.tete {
			grid-template-columns: 20px minmax(0, 1fr) auto;
			grid-template-areas: 'rang qui geste' '. actions actions';
		}
		.rang {
			grid-area: rang;
		}
		.qui {
			grid-area: qui;
		}
		.actions {
			grid-area: actions;
			padding-bottom: 4px;
		}
		.tete .geste {
			grid-area: geste;
		}
	}
</style>
