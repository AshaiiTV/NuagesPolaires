<script lang="ts">
	// 02 Résolution — chaque effet du round en ligne de récit. Tant que le round est ouvert (avant
	// « Clore le round »), une ligne chiffrée se raye : la correction inverse s'écrit au journal, signée
	// (motif · auteur · heure), et la ligne reste lisible, barrée. Rien ne s'efface. 03-vision §5.8.
	import Vide from '$lib/ui/Vide.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import { heure } from '$lib/ui/dates';
	import type { TableMJ } from './table.svelte';
	import {
		correctionDe,
		dernierRoundResolu,
		lignesRayees,
		lignesResolution,
		sansEmoji,
		signe
	} from './texte';

	interface Props {
		table: TableMJ;
	}
	let { table }: Props = $props();

	const log = $derived(table.etat.log);
	const round = $derived(table.revue ?? dernierRoundResolu(log));
	const lignes = $derived(
		round ? lignesResolution(log, round).filter((e) => sansEmoji(e.text)) : []
	);
	const rayees = $derived(lignesRayees(log));
	const ouverte = $derived(table.revue !== null);
	const heureResolue = $derived(
		table.revueA
			? heure(table.revueA)
			: /résolu à (\d{2}:\d{2})/.exec(
					log.find(
						(e) => e.kind === 'round' && e.round === round && /Résolution Round/.test(e.text)
					)?.text ?? ''
				)?.[1]
	);

	let enRature = $state<number | null>(null);
	let motif = $state('erreur de résolution');
	function rayer(e: SubmitEvent, n: number) {
		e.preventDefault();
		if (!motif.trim()) return;
		if (table.rayer(n, motif)) {
			enRature = null;
			motif = 'erreur de résolution';
		}
	}
	const ressource = (n: number) => {
		const e = log.find((x) => x.n === n);
		const c = e ? correctionDe(e) : null;
		return c ? `${signe(c.delta)} ${c.ressource.toUpperCase()} rendus` : '';
	};
</script>

{#if round}
	<p class="entete chiffres" aria-live="polite">
		Round {round} · résolu{heureResolue ? ` à ${heureResolue}` : ''}.
		{#if ouverte}<span class="ouvert">ouvert · rature possible</span>{/if}
	</p>
	{#if lignes.length}
		<ol class="recit" class:humide={ouverte}>
			{#each lignes as e (e.n)}
				{@const raye = rayees.has(e.n)}
				{@const rayable = ouverte && !raye && correctionDe(e) !== null}
				<li class:raye class:titre={e.kind === 'round'}>
					<span class="texte">{sansEmoji(e.text)}</span>
					{#if raye}
						<span class="mention">rayée</span>
					{:else if rayable}
						<button
							type="button"
							class="geste"
							aria-expanded={enRature === e.n}
							onclick={() => (enRature = enRature === e.n ? null : e.n)}>Rayer</button
						>
					{/if}
					{#if enRature === e.n}
						<form class="rature" onsubmit={(ev) => rayer(ev, e.n)}>
							<label>
								<span>Motif de la rature</span>
								<!-- svelte-ignore a11y_autofocus -->
								<input bind:value={motif} required maxlength={200} autofocus />
							</label>
							<p class="apercu chiffres">{ressource(e.n)}</p>
							<div class="gestes">
								<Bouton variante="rouille" type="submit" disabled={!motif.trim()}
									>Rayer la ligne</Bouton
								>
								<button type="button" class="geste" onclick={() => (enRature = null)}>Garder</button
								>
							</div>
						</form>
					{/if}
				</li>
			{/each}
		</ol>
	{:else}
		<Vide>Ce round n’a rien changé aux chiffres.</Vide>
	{/if}
{:else}
	<Vide>Aucun round résolu. La résolution s’écrit ici, ligne par ligne.</Vide>
{/if}

<style>
	.entete {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0 12px;
		min-height: 24px;
		margin-bottom: 8px;
		font: 600 14px/24px var(--corps);
		color: var(--encre);
	}
	.ouvert {
		font: var(--t-repere);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--encre-humide);
	}
	.recit.humide li {
		color: var(--encre-humide);
	}
	.recit li {
		transition: color 1200ms;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0 12px;
		min-height: 24px;
		border-bottom: 1px solid var(--reglure);
	}
	.texte {
		flex: 1 1 200px;
		min-width: 0;
		padding: 6px 0;
		font: 500 14px/24px var(--corps);
		color: var(--encre);
	}
	.titre .texte {
		color: var(--encre-2);
	}
	.raye .texte {
		color: var(--encre-grise);
		text-decoration: line-through;
		text-decoration-thickness: 1px;
	}
	.mention {
		font: var(--t-repere);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--encre-grise);
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
		text-decoration-color: color-mix(in srgb, var(--rouille) 55%, transparent);
		text-underline-offset: 4px;
	}
	.geste:hover {
		color: var(--encre);
	}
	.rature {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 8px 16px;
		flex-basis: 100%;
		margin-bottom: 12px;
		padding: 8px 12px 12px;
		background: var(--page-2);
		border-left: 2px solid var(--rouille);
	}
	label {
		display: grid;
		flex: 1 1 220px;
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	input {
		min-height: 44px;
		padding: 8px 0;
		border: 0;
		border-bottom: 1px solid color-mix(in srgb, var(--encre) 28%, transparent);
		background: transparent;
		font: 500 14px/24px var(--corps);
		color: var(--encre);
	}
	.apercu {
		font: var(--t-libelle);
		line-height: 44px;
		color: var(--encre-2);
	}
	.gestes {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	@media (prefers-reduced-motion: reduce) {
		.recit li {
			transition: none;
		}
	}
</style>
