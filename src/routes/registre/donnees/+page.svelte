<script lang="ts">
	// Registre › Données : ce qu'on emporte (export partiel, dit tel quel), ce qui a été repris de
	// l'ancien carnet, ce que le serveur dit de lui-même (sans jamais livrer une valeur secrète), et
	// les deux réglages du pied de page et des salons.
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import Chapitre from '$lib/ui/Chapitre.svelte';
	import Bouton from '$lib/ui/Bouton.svelte';
	import Champ from '$lib/ui/Champ.svelte';
	import NoteDeMarge from '$lib/ui/NoteDeMarge.svelte';
	import Vide from '$lib/ui/Vide.svelte';
	import { creerEcriture } from '$lib/ui/ecriture.svelte';
	import { heure } from '$lib/ui/dates';
	import { EXPORT_NOTICE } from '$lib/schemas/admin';
	import PageRegistre from '../PageRegistre.svelte';
	import { leA } from '../format';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const ecriture = creerEcriture();

	let cible = $state<string | null>(null);
	function pour(id: string, verbe: string, apres?: () => void): SubmitFunction {
		const ecrire = ecriture.enhance({ verbe, apres, sansRechargement: id === 'export' });
		return (entree) => {
			if (!ecriture.enCours) cible = id;
			return ecrire(entree);
		};
	}

	const MENTION = EXPORT_NOTICE.replace("'", '’');

	/** Le fichier exporté : un lien de téléchargement tenu par cette page seulement, ouvert une fois. */
	const fichier = $derived(form && 'fichier' in form ? form.fichier : null);
	const lienFichier = $derived(fichier ? 'data:application/json;charset=utf-8,' + encodeURIComponent(fichier.contenu) : null);
	let telechargement: HTMLAnchorElement | undefined = $state();
	let dejaOuvert = '';
	$effect(() => {
		if (fichier && telechargement && dejaOuvert !== fichier.at) {
			dejaOuvert = fichier.at;
			telechargement.click();
		}
	});

	const TABLES: Record<string, string> = {
		characters: 'fiches de personnage',
		accounts: 'comptes',
		oaths: 'Serments',
		beasts: 'créatures',
		zones: 'zones',
		events: 'rendez-vous',
		event_participants: 'inscriptions',
		journal_entries: 'notes de journal',
		inventory_items: 'objets',
		settings: 'réglages'
	};
	const fiches = $derived(data.migration.charactersMigrated);

	const env = $derived(data.diag.env);
	const variables = $derived([
		{ nom: 'Adresse de la base', ok: env.databaseConfigured || env.pgliteDriver, oui: env.pgliteDriver && !env.databaseConfigured ? 'base embarquée' : 'présente', non: 'absente', grave: true },
		{ nom: 'Secret de session', ok: env.sessionSecretConfigured, oui: 'présent, assez long', non: 'absent ou trop court', grave: env.production },
		{ nom: 'Adresse publique du site', ok: env.siteUrlConfigured, oui: 'présente', non: 'absente', grave: env.production },
		{ nom: 'Administrateur initial', ok: env.adminBootstrapConfigured, oui: 'présent', non: 'absent', grave: false },
		{ nom: 'Récupération d’administrateur', ok: !env.adminRecoveryEnabled, oui: 'fermée', non: 'ouverte — à refermer après usage', grave: true },
		{ nom: 'Connexion Discord', ok: env.discordLoginConfigured, oui: 'configurée', non: 'désactivée', grave: false },
		{ nom: 'Webhook des rendez-vous', ok: env.discordWebhookConfigured, oui: 'présent', non: 'absent', grave: false }
	]);

	const REGLAGES = [
		{
			key: 'discord_invite_url',
			libelle: 'Lien d’invitation du pied de page',
			aide: 'https://discord.gg/… ou https://discord.com/invite/… ; vide, le lien disparaît du pied de page.',
			placeholder: 'https://discord.gg/…'
		},
		{
			key: 'discord_default_channel_url',
			libelle: 'Salon par défaut',
			aide: 'Le lien d’un salon Discord ; vide, aucun salon n’est proposé par défaut.',
			placeholder: 'https://discord.com/channels/…'
		}
	] as const;
	const valeur = (key: string) => data.reglages.find((r) => r.key === key);
	const jamais = (iso: string) => new Date(iso).getTime() <= 0;
</script>

<svelte:head><title>Données — Le Registre</title></svelte:head>

<PageRegistre titre="Les" titreVoix="données.">
	{#snippet reperes()}
		<span>relevé <span class="chiffres">{heure(data.releve)}</span></span>
		<span class="gris">Rien ici n’écrit dans la base, hors les réglages.</span>
	{/snippet}

	<Chapitre numero="01" titre="Exporter" id="exporter">
		<div class="export">
			<div>
				<p class="mention">{MENTION}</p>
				<p class="texte">Un fichier JSON : les comptes sans leurs secrets, les personnages et leurs inventaires, les Serments, le bestiaire et ses zones, les rendez-vous et leurs inscriptions, les réglages.</p>
				<details class="exclus">
					<summary>Ce que l’export ne contient pas</summary>
					<ul>
						{#each data.exclus as e (e)}<li>{e}</li>{/each}
					</ul>
				</details>
			</div>
			<form method="POST" action="?/exporter" use:enhance={pour('export', 'Exporté')} class="ordinateur">
				<Bouton variante="trait" type="submit" disabled={ecriture.enCours}>Exporter (.json)</Bouton>
				{#if cible === 'export' && ecriture.note}
					<NoteDeMarge ton={ecriture.note.ton}>{ecriture.note.texte}</NoteDeMarge>
				{/if}
				{#if fichier && lienFichier}
					<a class="retelecharger" href={lienFichier} download={fichier.nom} bind:this={telechargement}>Télécharger à nouveau {fichier.nom}</a>
				{/if}
			</form>
			<p class="sur-ordinateur">L’export se fait sur ordinateur.</p>
		</div>
	</Chapitre>

	<Chapitre numero="02" titre="La reprise de l’ancien carnet" id="migration">
		{#if !data.migration.migrated}
			<Vide>Rien n’a été repris de l’ancien carnet : cette base est née ici.</Vide>
		{:else}
			<p class="reprise">
				{#if fiches > 0}
					<span class="voix-carnet">{fiches} {fiches > 1 ? 'fiches reprises' : 'fiche reprise'} sans rature.</span>
				{:else}
					<span class="voix-carnet">Aucune fiche de personnage reprise.</span>
				{/if}
				{#if data.migration.lastMigratedAt}<span class="gris">Dernière reprise le {leA(data.migration.lastMigratedAt)}.</span>{/if}
			</p>
			<p class="texte">L’état courant a été recopié ; l’historique d’avant la reprise ne porte pas de rature. Chaque ligne reprise reste marquée « repris sans rature ».</p>
			<ul class="lignes">
				{#each data.migration.tables as t (t.table)}
					<li>
						<span class="nom">{TABLES[t.table] ?? t.table}</span>
						<span class="chiffres">{t.count}</span>
						<span class="gris">{t.lastMigratedAt ? leA(t.lastMigratedAt) : ''}</span>
					</li>
				{/each}
			</ul>
			{#if data.migration.transformerVersions.length}
				<p class="gris petit">Transformations appliquées : version{data.migration.transformerVersions.length > 1 ? 's' : ''} {data.migration.transformerVersions.join(', ')}.</p>
			{/if}
		{/if}
	</Chapitre>

	<Chapitre numero="03" titre="Diagnostics" id="diagnostics">
		<p class="texte">Ce que le serveur dit de lui-même à <span class="chiffres">{heure(data.diag.at)}</span>. Les variables d’environnement sont dites présentes ou absentes, jamais lues ici.</p>
		<dl class="diag">
			<div class:alerte={!data.diag.dbReachable}>
				<dt>Base de données</dt>
				<dd>
					{#if data.diag.dbReachable}joignable{#if data.diag.dbLatencyMs !== null}<span class="gris chiffres">{' · '}{data.diag.dbLatencyMs} ms</span>{/if}{:else}injoignable{/if}
				</dd>
			</div>
			{#each variables as v (v.nom)}
				<div class:alerte={!v.ok && v.grave} class:absent={!v.ok && !v.grave}>
					<dt>{v.nom}</dt>
					<dd>{v.ok ? v.oui : v.non}</dd>
				</div>
			{/each}
			<div>
				<dt>Mode</dt>
				<dd>{env.production ? 'production' : 'développement'}</dd>
			</div>
			<div>
				<dt>Version</dt>
				<dd class="chiffres">{data.diag.version || 'non renseignée'}</dd>
			</div>
		</dl>
	</Chapitre>

	<Chapitre numero="04" titre="Réglages" id="reglages">
		<div class="reglages">
			{#each REGLAGES as r (r.key)}
				{@const actuel = valeur(r.key)}
				<form method="POST" action="?/reglage" use:enhance={pour(r.key, 'Noté')}>
					<input type="hidden" name="key" value={r.key} />
					<Champ
						libelle={r.libelle}
						name="value"
						id={'reglage-' + r.key}
						type="url"
						value={actuel?.value ?? ''}
						aide={r.aide}
						placeholder={r.placeholder}
						inputmode="url"
						autocomplete="off"
						spellcheck="false"
						erreur={cible === r.key && ecriture.note?.ton === 'refus' ? ecriture.note.texte : null}
					/>
					<div class="ligne-bouton">
						<Bouton variante="trait" type="submit" disabled={ecriture.enCours}>Enregistrer</Bouton>
						{#if cible === r.key && ecriture.note && ecriture.note.ton !== 'refus'}
							<NoteDeMarge ton={ecriture.note.ton}>{ecriture.note.texte}</NoteDeMarge>
						{:else if actuel && !jamais(actuel.updatedAt)}
							<span class="gris">écrit le {leA(actuel.updatedAt)}</span>
						{/if}
					</div>
				</form>
			{/each}
		</div>
	</Chapitre>
</PageRegistre>

<style>
	.gris {
		color: var(--encre-grise);
	}
	.texte {
		max-width: 62ch;
		padding: 12px 0;
		font: var(--t-corps);
		color: var(--encre-2);
	}
	.export {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: var(--ligne) calc(var(--ligne) * 2);
		align-items: start;
		padding-top: 12px;
	}
	.mention {
		padding-left: 14px;
		border-left: 2px solid var(--encre-2);
		font: italic 400 20px/28px var(--voix);
		color: var(--encre);
	}
	.exclus summary {
		display: inline-flex;
		align-items: center;
		min-height: var(--cible);
		cursor: pointer;
		font: var(--t-libelle);
		color: var(--encre-humide);
	}
	.exclus ul {
		display: grid;
		padding-bottom: 12px;
	}
	.exclus li {
		position: relative;
		padding-left: 18px;
		font: var(--t-libelle);
		line-height: 24px;
		color: var(--encre-2);
	}
	.exclus li::before {
		content: '';
		position: absolute;
		left: 2px;
		top: 10px;
		width: 4px;
		height: 4px;
		background: var(--encre-grise);
		rotate: 45deg;
	}
	.export form {
		display: grid;
		gap: 8px;
		justify-items: end;
		padding-top: 4px;
	}
	.retelecharger {
		font: var(--t-libelle);
		color: var(--encre-humide);
		overflow-wrap: anywhere;
	}
	.sur-ordinateur {
		display: none;
	}

	.reprise {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 4px 16px;
		padding-top: 12px;
		font: var(--t-libelle);
	}
	.voix-carnet {
		font: italic 400 24px/36px var(--voix);
		color: var(--encre);
	}
	.lignes {
		border-top: 1px solid var(--reglure);
		max-width: 44rem;
	}
	.lignes li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 4rem minmax(0, 12rem);
		align-items: center;
		gap: 0 16px;
		min-height: calc(var(--ligne) * 1.5);
		border-bottom: 1px solid var(--reglure);
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.lignes .nom {
		color: var(--encre);
	}
	.lignes .chiffres {
		text-align: right;
		color: var(--encre);
	}
	.petit {
		padding-top: 12px;
		font: var(--t-libelle);
	}

	.diag {
		max-width: 44rem;
		border-top: 1px solid var(--reglure);
	}
	.diag div {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 0 16px;
		align-items: center;
		min-height: calc(var(--ligne) * 1.5);
		border-bottom: 1px solid var(--reglure);
	}
	dt {
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	dd {
		font: var(--t-corps);
		color: var(--encre);
	}
	.absent dd {
		color: var(--encre-grise);
	}
	.alerte dd {
		color: var(--rouille);
	}
	.alerte dt {
		color: var(--encre);
	}

	.reglages {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
		gap: var(--ligne) calc(var(--ligne) * 2);
		padding-top: var(--ligne);
	}
	.reglages form {
		display: grid;
		gap: 12px;
		align-content: start;
	}
	.ligne-bouton {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 20px;
		font: var(--t-libelle);
	}

	@media (max-width: 760px) {
		.export {
			grid-template-columns: 1fr;
		}
		.ordinateur {
			display: none !important;
		}
		.sur-ordinateur {
			display: block;
			font: var(--t-libelle);
			color: var(--encre-grise);
		}
		.lignes li {
			grid-template-columns: minmax(0, 1fr) auto;
		}
		.lignes li > :last-child {
			display: none;
		}
		.diag div {
			grid-template-columns: 1fr;
			padding: 6px 0;
		}
		.reglages {
			grid-template-columns: 1fr;
		}
	}
</style>
