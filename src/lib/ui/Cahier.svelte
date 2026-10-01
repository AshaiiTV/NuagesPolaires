<script lang="ts">
	// L'enveloppe du carnet connecté : la feuille, la tranche à onglets (les cahiers) sur le bord droit,
	// la bande basse sur téléphone, et le ruban « En scène ». Ce qui n'est pas autorisé n'est pas rendu.
	import type { Snippet } from 'svelte';
	import Boussole from './Boussole.svelte';
	import Portrait from './Portrait.svelte';

	export interface Onglet {
		id: string;
		libelle: string;
		/** Libellé court pour la bande basse du téléphone. */
		court?: string;
		href: string;
		courant?: boolean;
		/** Des pages non lues existent dans ce cahier (jamais de nombre). */
		corne?: boolean;
	}
	interface Props {
		cahiers: Onglet[];
		/** Entrées de la bande basse (cinq au plus) ; par défaut les cahiers. */
		bande?: Onglet[];
		ruban?: { href: string; libelle?: string; corne?: boolean } | null;
		compte?: { pseudo: string; portrait?: string | null; role?: string } | null;
		/** Régime de la page : `carnet` (défaut), `serre` (outils denses), `scene` (feuillet, Table du joueur). */
		regime?: 'carnet' | 'serre' | 'scene';
		children: Snippet;
	}
	let { cahiers, bande, ruban = null, compte = null, regime = 'carnet', children }: Props = $props();
	const basse = $derived((bande ?? cahiers).slice(0, 5));
</script>

<a class="evitement" href="#page">Aller à la page</a>

<div class="bureau" data-regime={regime}>
	<div class="cahier">
		<div class="feuille" id="page" tabindex="-1">
			{#if ruban}
				<a class="ruban" href={ruban.href}>
					{ruban.libelle ?? 'En scène'}
					{#if ruban.corne}<span class="corne" aria-hidden="true"></span><span class="sr-only"> — pages non lues</span>{/if}
				</a>
			{/if}
			{@render children()}
		</div>

		<nav class="tranche" aria-label="Cahiers">
			<a class="signature" href="/" aria-label="Nuages Polaires, accueil"><Boussole taille={32} /></a>
			<ul>
				{#each cahiers as onglet (onglet.id)}
					<li>
						<a class="onglet" class:courant={onglet.courant} href={onglet.href} aria-current={onglet.courant ? 'page' : undefined}>
							{onglet.libelle}
							{#if onglet.corne}<span class="corne" aria-hidden="true"></span><span class="sr-only"> — pages non lues</span>{/if}
						</a>
					</li>
				{/each}
			</ul>
			{#if compte}
				<a class="compte" href="/compte">
					<Portrait nom={compte.pseudo} src={compte.portrait} taille={36} />
					<span class="pseudo">{compte.pseudo}{#if compte.role}<small>{compte.role}</small>{/if}</span>
				</a>
			{/if}
		</nav>
	</div>
</div>

<nav class="bande-basse" aria-label="Cahiers">
	{#each basse as onglet (onglet.id)}
		<a class:courant={onglet.courant} href={onglet.href} aria-current={onglet.courant ? 'page' : undefined}>
			{onglet.court ?? onglet.libelle}
			{#if onglet.corne}<span class="corne" aria-hidden="true"></span>{/if}
		</a>
	{/each}
</nav>

<style>
	.bureau {
		min-height: 100svh;
		padding: calc(var(--ligne) * 2) var(--gouttiere);
		background: var(--bureau);
	}
	.cahier {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 156px;
		max-width: calc(var(--page-max) + 156px);
		margin: 0 auto;
		align-items: start;
	}
	.feuille {
		position: relative;
		min-width: 0;
		outline: none;
	}

	/* ── Le ruban : signet de sauge accroché en haut à droite de la page ── */
	.ruban {
		position: absolute;
		z-index: 2;
		top: -1px;
		right: calc(var(--ligne) * 2);
		display: flex;
		align-items: flex-start;
		min-height: 56px;
		padding: 14px 14px 22px;
		background: var(--ruban);
		color: var(--sur-ruban);
		font: 600 12px/16px var(--corps);
		letter-spacing: 0.14em;
		text-transform: uppercase;
		text-decoration: none;
		clip-path: polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 10px), 0 100%);
		transition: padding-bottom 160ms;
	}
	.ruban:hover {
		padding-bottom: 28px;
	}
	.ruban:focus-visible {
		outline-offset: -4px;
		outline-color: var(--sur-ruban);
	}
	.corne {
		position: absolute;
		top: 0;
		right: 0;
		border-style: solid;
		border-width: 0 10px 10px 0;
		border-color: transparent var(--encre) transparent transparent;
	}
	.ruban .corne {
		border-color: transparent var(--sur-ruban) transparent transparent;
	}

	/* ── La tranche : onglets des cahiers sur le bord droit ── */
	.tranche {
		position: sticky;
		top: calc(var(--ligne) * 2);
		display: flex;
		flex-direction: column;
		gap: var(--ligne);
		padding-top: var(--ligne);
	}
	.signature {
		display: grid;
		place-items: center;
		width: var(--cible);
		height: var(--cible);
		margin-left: 12px;
	}
	.tranche ul {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.onglet {
		position: relative;
		display: flex;
		align-items: center;
		min-height: var(--cible);
		margin-left: -1px;
		padding: 8px 12px 8px 16px;
		border: 1px solid var(--reglure);
		border-left-color: transparent;
		border-radius: 0 var(--rayon) var(--rayon) 0;
		background: color-mix(in srgb, var(--page) 45%, var(--bureau));
		font: 500 14px/20px var(--corps);
		color: var(--encre-2);
		text-decoration: none;
		transition:
			background 160ms,
			color 160ms,
			padding-left 160ms;
	}
	.onglet:hover {
		color: var(--encre);
		padding-left: 20px;
	}
	.onglet.courant {
		background: var(--page);
		border-left-color: var(--page);
		color: var(--encre);
		padding-left: 20px;
	}
	.onglet.courant::before {
		content: '';
		position: absolute;
		left: 8px;
		top: 50%;
		width: 5px;
		height: 5px;
		background: var(--encre-humide);
		rotate: 45deg;
		translate: 0 -50%;
	}
	.compte {
		display: flex;
		align-items: center;
		gap: 10px;
		margin: var(--ligne) 0 0 12px;
		min-height: var(--cible);
		text-decoration: none;
	}
	.pseudo {
		font: 500 13px/16px var(--corps);
		color: var(--encre);
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.pseudo small {
		display: block;
		font: var(--t-repere);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--tampon);
	}

	/* ── La bande basse : téléphone ── */
	.bande-basse {
		display: none;
	}

	:global([data-regime='scene']) .tranche,
	:global([data-regime='scene']) .bande-basse,
	:global([data-regime='scene']) .ruban {
		display: none;
	}
	:global([data-regime='scene']) .cahier {
		grid-template-columns: minmax(0, 1fr);
		max-width: 640px;
	}

	@media (max-width: 1100px) {
		.cahier {
			grid-template-columns: minmax(0, 1fr) 132px;
		}
		.bureau {
			padding: var(--ligne) 12px;
		}
	}
	@media (max-width: 760px) {
		.bureau {
			padding: 0 0 calc(56px + env(safe-area-inset-bottom));
		}
		.cahier {
			display: block;
		}
		.tranche {
			display: none;
		}
		.ruban {
			right: var(--gouttiere);
		}
		.bande-basse {
			position: fixed;
			z-index: 10;
			inset: auto 0 0 0;
			display: grid;
			grid-auto-flow: column;
			grid-auto-columns: 1fr;
			min-height: 56px;
			padding-bottom: env(safe-area-inset-bottom);
			background: color-mix(in srgb, var(--bureau) 94%, transparent);
			border-top: 1px solid var(--reglure);
			backdrop-filter: blur(8px);
		}
		.bande-basse a {
			position: relative;
			display: grid;
			place-items: center;
			min-height: 56px;
			font: 500 13px/16px var(--corps);
			color: var(--encre-2);
			text-decoration: none;
		}
		.bande-basse a.courant {
			color: var(--encre);
		}
		.bande-basse a.courant::before {
			content: '';
			position: absolute;
			top: -1px;
			left: 28%;
			right: 28%;
			height: 2px;
			background: var(--ruban);
		}
		.bande-basse .corne {
			top: 8px;
			right: 18%;
			border-width: 0 8px 8px 0;
		}
	}
</style>
