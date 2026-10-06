<script lang="ts">
	import { resolve } from '$app/paths';
	import { chemin } from '$lib/ui/adresse';
	// « Plus » : la suite de la bande basse du téléphone, en lignes de carnet. D'abord ce qui est à toi
	// (journal, compte, collection), puis les cahiers de ton rôle absents de la bande, puis « Quitter le
	// carnet ». Les règles sont celles de la tranche : ce qui n'est pas autorisé n'est pas rendu.
	import Enveloppe from '$lib/ui/Enveloppe.svelte';
	import Page from '$lib/ui/Page.svelte';
	import Portrait from '$lib/ui/Portrait.svelte';
	import { bandePour, cahiersPour, LIBELLES_ROLE, type CompteNav } from '$lib/ui/navigation';

	let { data } = $props();

	type Ligne = { id: string; href: string; titre: string; resume: string; corne?: boolean };

	/** Ce que contient chaque cahier, en une ligne (03-vision §4). */
	const RESUMES: Record<string, string> = {
		carnet: 'Dernières pages, ma fiche, mon journal.',
		univers: 'Synopsis, Serments, bestiaire, système de jeu, règlement.',
		agenda: 'Les rendez-vous à venir et passés.',
		table: 'Combat, apparitions, archives, personnages.',
		atelier: 'Le bestiaire, et les Serments si le droit t’est accordé.',
		registre: 'Ce qui attend, comptes et liaisons, thèmes, journal d’audit, données.'
	};

	const compte = $derived(data.compte as CompteNav);
	const lignes = $derived.by((): Ligne[] => {
		const dansLaBande = new Set(bandePour(compte, '/plus').map((o) => o.href));
		const a_toi: Ligne[] = [
			...(compte.relie
				? [
						{
							id: 'journal',
							href: '/carnet/journal',
							titre: 'Mon journal',
							resume: 'Tes notes, tes récits, les faits validés.'
						}
					]
				: []),
			{
				id: 'compte',
				href: '/compte',
				titre: 'Mon compte',
				resume: data.discordActif
					? 'Pseudo, mot de passe, thème, Discord.'
					: 'Pseudo, mot de passe, thème.'
			},
			{
				id: 'collection',
				href: '/compte/collection',
				titre: 'Ma collection',
				resume: 'Les couleurs de ton carnet.'
			}
		];
		const cahiers = cahiersPour(compte, '/plus')
			.filter((o) => !dansLaBande.has(o.href))
			.map((o) => ({
				id: o.id,
				href: o.href,
				titre: o.libelle,
				resume: RESUMES[o.id] ?? '',
				corne: o.corne
			}));
		return [...a_toi, ...cahiers];
	});
	const numero = (i: number) => String(i + 1).padStart(2, '0');
</script>

<svelte:head><title>Plus — Nuages Polaires</title></svelte:head>

<Enveloppe compte={data.compte} discord={data.discord}>
	<Page repere="NP / 07 — Plus" titre="La suite" titreVoix="du carnet.">
		{#snippet marge()}
			<p class="voix">
				Ce qui ne tient pas dans la bande du bas : ce qui est à toi, puis les autres cahiers.
			</p>
		{/snippet}

		<a class="qui" href={resolve('/compte')}>
			<Portrait
				serment={compte.serment}
				nom={data.personnage?.name ?? compte.pseudo}
				src={compte.portrait}
				taille={56}
			/>
			<span class="nom">
				<span class="pseudo">{compte.pseudo}</span>
				<span class="detail">
					{LIBELLES_ROLE[compte.role]}{#if data.personnage}{' · ' +
							data.personnage
								.name}{:else if compte.role === 'joueur'}&nbsp;·&nbsp;en&nbsp;attente&nbsp;de&nbsp;liaison{/if}
				</span>
			</span>
		</a>

		<ol class="lignes">
			{#each lignes as ligne, i (ligne.id)}
				<li>
					<a href={chemin(ligne.href)}>
						<span class="numero chiffres">{numero(i)}</span>
						<span class="titre">
							{ligne.titre}
							{#if ligne.corne}<span class="corne" aria-hidden="true"></span><span class="sr-only">
									— pages non lues</span
								>{/if}
						</span>
						<span class="fleche" aria-hidden="true">→</span>
						<span class="resume">{ligne.resume}</span>
					</a>
				</li>
			{/each}
			<li class="quitter">
				<form method="POST" action="/entrer/quitter">
					<button type="submit">
						<span class="numero chiffres">{numero(lignes.length)}</span>
						<span class="titre">Quitter le carnet</span>
						<span class="fleche" aria-hidden="true">→</span>
						<span class="resume"
							>Il se referme sur tous tes appareils. Ce qui est écrit reste écrit.</span
						>
					</button>
				</form>
			</li>
		</ol>
	</Page>
</Enveloppe>

<style>
	.qui {
		display: flex;
		align-items: center;
		gap: 16px;
		min-height: var(--cible);
		margin-bottom: var(--ligne);
		text-decoration: none;
	}
	.nom {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.pseudo {
		font: 500 26px / var(--ligne) var(--voix);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre);
		overflow-wrap: anywhere;
	}
	.detail {
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}

	/* Une ligne de carnet : numéro en marge, titre en voix, résumé en dessous. */
	.lignes {
		border-top: 1px solid var(--reglure);
	}
	li {
		border-bottom: 1px solid var(--reglure);
	}
	a:not(.qui),
	button {
		display: grid;
		grid-template-columns: calc(var(--ligne) * 2) minmax(0, 1fr) var(--ligne);
		align-items: baseline;
		width: 100%;
		min-height: calc(var(--ligne) * 3);
		padding: calc(var(--ligne) / 2) 0 calc(var(--ligne) / 2 - 1px);
		border: 0;
		background: none;
		text-align: left;
		text-decoration: none;
		color: inherit;
		cursor: pointer;
	}
	.numero {
		font: var(--t-repere);
		font-variant-numeric: lining-nums tabular-nums;
		letter-spacing: var(--approche-repere);
		color: var(--encre-2);
	}
	.titre {
		position: relative;
		justify-self: start;
		padding-right: 18px;
		font: 500 26px / var(--ligne) var(--voix);
		font-variant-numeric: lining-nums tabular-nums;
		letter-spacing: -0.01em;
		color: var(--encre);
		transition: color 160ms;
	}
	.fleche {
		justify-self: end;
		font: 400 16px / var(--ligne) var(--corps);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-humide);
		transition: translate 200ms;
	}
	.resume {
		grid-column: 2 / -1;
		margin-top: 4px;
		font: var(--t-libelle);
		font-variant-numeric: lining-nums tabular-nums;
		color: var(--encre-2);
	}
	a:hover .titre,
	button:hover .titre {
		color: var(--encre-humide);
	}
	a:hover .fleche {
		translate: 4px 0;
	}
	.corne {
		position: absolute;
		top: 2px;
		right: 0;
		border-style: solid;
		border-width: 0 10px 10px 0;
		border-color: transparent var(--encre) transparent transparent;
	}
	.quitter .titre {
		color: var(--encre-2);
	}
	.quitter .numero {
		color: var(--encre-grise);
	}
	@media (prefers-reduced-motion: reduce) {
		a:hover .fleche {
			translate: none;
		}
	}
</style>
