<script lang="ts">
	import { chemin } from '$lib/ui/adresse';
	// Un récit (03-vision §5.5 voix « Récits », §9.9) : le combat archivé tel que le serveur le laisse
	// lire à ses participants — titre, date, journal du combat ligne à ligne, conséquences tamponnées.
	// Aucun geste sur le combat : on lit, on exporte, on revient au journal.
	import Page from '$lib/ui/Page.svelte';
	import Chapitre from '$lib/ui/Chapitre.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import Consequence from '$lib/ui/Consequence.svelte';
	import Rature from '$lib/ui/Rature.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import { dateCourte, dateHeure, dateLongue, heure } from '$lib/ui/dates';
	import type { ConsequenceView } from '$lib/schemas/characters';
	import { signature as signatureTampon } from '$lib/ui/tampons';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const recit = $derived(data.recit);

	/** Le journal du combat, round par round. */
	const rounds = $derived.by(() => {
		const out: { round: number; lignes: typeof recit.log }[] = [];
		for (const l of recit.log) {
			if (l.kind === 'round') continue;
			const dernier = out.at(-1);
			if (dernier && dernier.round === l.round) dernier.lignes.push(l);
			else out.push({ round: l.round, lignes: [l] });
		}
		return out;
	});

	const CHAMPS: Record<string, string> = { pv: 'PV', ep: 'EP', em: 'EM', xp: 'XP' };
	const tampon = (c: ConsequenceView) =>
		c.stamp ? signatureTampon(c.stamp.role, c.stamp.name, c.at) : null;
	const signature = (c: ConsequenceView) =>
		c.stamp ? null : c.signature === 'regles' ? `règles · ${dateCourte(c.at)}` : dateCourte(c.at);
	/** Une correction (rature d’une conséquence précédente) se lit « ~~120~~ 150 » ; sinon le texte dit déjà le changement. */
	const avecRature = (c: ConsequenceView) =>
		!!c.replacesId && c.oldValue !== null && c.newValue !== null && c.oldValue !== c.newValue;
	const lienTexte = $derived(`/carnet/recits/${encodeURIComponent(recit.id)}/texte`);
</script>

<svelte:head><title>{recit.title} — Récit</title></svelte:head>

<Page repere="NP / 02 — Mon journal · récit" titre={recit.title}>
	{#snippet marge()}
		<p class="quand">{dateLongue(recit.at)}</p>
		<p class="details chiffres">
			{recit.round} round{recit.round > 1 ? 's' : ''} · archivé à {heure(recit.at)}
		</p>
		<p class="lisible">Lisible par ses participants. Les notes du MJ n’y figurent pas.</p>
		<div class="gestes-marge">
			<a class="lien-discret" href={chemin(lienTexte)} download>Exporter (.txt)</a>
			{#if recit.discordUrl}
				<Bouton
					variante="texte"
					href={recit.discordUrl}
					fleche="↗"
					target="_blank"
					rel="noopener noreferrer">Ouvrir le salon</Bouton
				>
			{/if}
			<Bouton variante="texte" href="/carnet/journal?voix=recits">← Retour au journal</Bouton>
		</div>
	{/snippet}
	{#snippet bande()}
		<p class="bande-ligne chiffres">
			{dateHeure(recit.at)} · {recit.round} round{recit.round > 1 ? 's' : ''}
		</p>
	{/snippet}

	{#if recit.name && recit.name !== recit.title}<p class="chapeau">{recit.name}</p>{/if}

	<Chapitre numero="01" titre="Le combat" id="combat">
		{#if rounds.length}
			{#each rounds as r (r.round)}
				<section class="round" aria-label="Round {r.round}">
					<p class="round-titre repere">Round <span class="chiffres">{r.round}</span></p>
					<ol class="log">
						{#each r.lignes as l (l.n)}
							<li class="ligne {l.kind}">
								<span class="texte">{l.text}</span>
								{#if l.field && l.oldValue !== undefined && l.newValue !== undefined && l.oldValue !== l.newValue}
									<span class="valeur"
										>{CHAMPS[l.field] ?? l.field}
										<Rature ancien={l.oldValue} nouveau={l.newValue} /></span
									>
								{/if}
							</li>
						{/each}
					</ol>
				</section>
			{/each}
		{:else}
			<Vide>Ce récit n’a gardé aucune ligne lisible.</Vide>
		{/if}
	</Chapitre>

	<section aria-label="Participants">
		<p class="repere">Participants</p>
		<p>{recit.participants.join(' · ')}</p>
	</section>
	<Chapitre numero="02" titre="Conséquences tamponnées" id="consequences">
		{#if data.consequences.length}
			<ul>
				{#each data.consequences as c (c.id)}
					<Consequence
						cle={c.id}
						tampon={tampon(c)}
						signature={signature(c)}
						motif={c.motif || null}
						rayee={c.struck}
					>
						{c.text}{#if avecRature(c)}<span class="valeur"
								>{c.field ? `${CHAMPS[c.field] ?? c.field} ` : ''}<Rature
									ancien={c.oldValue ?? ''}
									nouveau={c.newValue}
								/></span
							>{/if}
					</Consequence>
				{/each}
			</ul>
		{:else}
			<Vide>Aucune conséquence de ce combat n’est écrite sur ta fiche.</Vide>
		{/if}
	</Chapitre>

	{#snippet pied()}
		<div class="gestes pied-gestes">
			<Bouton variante="texte" href="/carnet/journal?voix=recits">← Revenir aux récits</Bouton>
			<Bouton variante="trait" href={lienTexte} download>Exporter (.txt)</Bouton>
		</div>
	{/snippet}
</Page>

<style>
	.quand {
		font: italic 400 22px/28px var(--voix);
		color: var(--encre);
	}
	.details {
		font: var(--t-libelle);
		line-height: var(--ligne);
		color: var(--encre-2);
	}
	.lisible {
		margin-top: var(--ligne);
		color: var(--encre-2);
	}
	.gestes-marge {
		display: grid;
		justify-items: start;
		gap: 4px;
		margin-top: var(--ligne);
	}
	.lien-discret {
		display: inline-flex;
		align-items: center;
		min-height: var(--cible);
		font: var(--t-libelle);
		color: var(--encre-2);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--encre-humide) 50%, transparent);
		text-underline-offset: 4px;
	}
	.lien-discret:hover {
		color: var(--encre);
	}
	.bande-ligne {
		width: 100%;
	}
	.chapeau {
		font: italic 400 20px/28px var(--voix);
		color: var(--encre-2);
	}

	/* Le journal du combat : une ligne de récit par effet, en caractères de machine. */
	.round {
		padding-top: calc(var(--ligne) / 2);
	}
	.round-titre {
		padding-bottom: 6px;
		border-bottom: 1px solid var(--encre-grise);
		color: var(--encre-2);
	}
	.ligne {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0 14px;
		padding: 0 0 0 14px;
		border-bottom: 1px solid var(--reglure);
		border-left: 1px solid transparent;
		font: var(--t-mono);
		color: var(--encre);
		overflow-wrap: anywhere;
	}
	.ligne.turn,
	.ligne.info {
		color: var(--encre-2);
	}
	.ligne.damage {
		border-left-color: var(--rouille);
	}
	.ligne.heal {
		border-left-color: var(--encre-humide);
	}
	.ligne .texte {
		min-width: 0;
	}
	.valeur {
		margin-left: 10px;
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.gestes {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 20px;
	}
	@media (max-width: 760px) {
		.ligne {
			padding-left: 10px;
		}
		.pied-gestes {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
