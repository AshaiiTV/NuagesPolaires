<script lang="ts">
	// La ligne d'état : identique partout (Dernières pages, fiche, bande de contexte du feuillet).
	// « PV 24/30 · EP 38/50 · EM 12/20 · relevé 21:14 ». Le relevé est le dernier état confirmé.
	interface Ressource {
		cur: number;
		max: number;
		/** Somme des déclarations en attente d'un MJ (jamais appliquée au chiffre). */
		declare?: number;
	}
	interface Props {
		pv: Ressource;
		ep: Ressource;
		em: Ressource;
		/** Heure du dernier relevé confirmé, déjà formatée (« 21:14 »). */
		releve?: string | null;
		/** Le carnet n'a pas pu se mettre à jour : le relevé passe en rouille. */
		enRetard?: boolean;
		grande?: boolean;
	}
	let { pv, ep, em, releve = null, enRetard = false, grande = false }: Props = $props();

	const lignes = $derived([
		{ nom: 'PV', titre: 'Points de Vie', ...pv, bas: pv.max > 0 && pv.cur / pv.max < 0.32 },
		{ nom: 'EP', titre: 'Énergie Physique', ...ep, bas: false },
		{ nom: 'EM', titre: 'Énergie Magique', ...em, bas: false }
	]);
	const signe = (n: number) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);
</script>

<p class="etat chiffres" class:grande>
	<span class="piste">
		{#each lignes as r (r.nom)}
			<span class="item ressource" class:bas={r.bas}>
				<abbr title={r.titre}>{r.nom}</abbr>
				<span class="valeur">{r.cur}</span><span class="max">/{r.max}</span>
				{#if r.declare}<span class="declare">({signe(r.declare)} déclaré)</span>{/if}
			</span>
		{/each}
		{#if releve}
			<span class="item releve" class:retard={enRetard}>relevé {releve}</span>
		{/if}
	</span>
</p>

<style>
	/* Les points de séparation vivent dans la marge gauche de chaque élément ; le conteneur les rogne
	   en début de ligne, si bien qu'un retour à la ligne ne laisse jamais de point orphelin. */
	.etat {
		overflow: hidden;
		font: 500 14px/28px var(--corps);
		color: var(--encre);
	}
	.grande {
		font-size: 16px;
	}
	.piste {
		display: flex;
		flex-wrap: wrap;
		margin-left: -19px;
	}
	.item {
		position: relative;
		padding-left: 19px;
		white-space: nowrap;
	}
	.item::before {
		content: '·';
		position: absolute;
		left: 7px;
		color: var(--encre-2);
	}
	abbr {
		text-decoration: none;
		font-size: 12px;
		letter-spacing: 0.12em;
		color: var(--encre-2);
		margin-right: 4px;
	}
	.max {
		color: var(--encre-2);
	}
	.declare {
		margin-left: 4px;
		color: var(--encre-humide);
	}
	.bas .valeur {
		color: var(--rouille);
	}
	.releve {
		color: var(--encre-2);
	}
	.retard {
		color: var(--rouille);
	}
</style>
