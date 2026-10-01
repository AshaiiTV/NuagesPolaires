<script lang="ts">
	// Une ligne de conséquence : ce qui a changé, qui l'a décidé (tampon du staff, « règles » pour le
	// système, « toi » pour tes déclarations), quand, et pourquoi.
	// Format de référence : « +18 XP · Col des brumes · tamponné par MJ Maitre le 26 septembre, 21:47 —
	// motif : combat archivé. »
	import type { Snippet } from 'svelte';
	import Tampon from './Tampon.svelte';

	interface Props {
		/** Identifiant stable (angle du tampon). */
		cle: string;
		/** Tampon du staff : « MJ Maitre · 26 sept. 21:47 ». Absent pour les règles et le joueur. */
		tampon?: string | null;
		/** Signature non tamponnée : « règles · 26 sept. », « toi · 21:42 · attend un MJ ». */
		signature?: string | null;
		motif?: string | null;
		/** Ligne rayée (rature d'une conséquence entière). */
		rayee?: boolean;
		children: Snippet;
	}
	let { cle, tampon = null, signature = null, motif = null, rayee = false, children }: Props = $props();
</script>

<li class="consequence" class:rayee>
	<span class="quoi chiffres">{@render children()}</span>
	<span class="qui">
		{#if tampon}<Tampon {cle}>{tampon}</Tampon>{/if}
		{#if signature}<span class="signature">{signature}</span>{/if}
		{#if motif}<span class="motif">motif : {motif}</span>{/if}
	</span>
</li>

<style>
	.consequence {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 4px 20px;
		min-height: calc(var(--ligne) * 2);
		padding: calc(var(--ligne) / 4) 0;
		border-bottom: 1px solid var(--reglure);
		font: var(--t-liste);
		color: var(--encre);
	}
	.qui {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: flex-end;
		gap: 6px 14px;
	}
	.signature,
	.motif {
		font: var(--t-libelle);
		color: var(--encre-2);
	}
	.rayee .quoi {
		text-decoration: line-through;
		text-decoration-thickness: 1px;
		color: var(--encre-grise);
	}
	@media (max-width: 760px) {
		.consequence {
			grid-template-columns: 1fr;
			padding: calc(var(--ligne) / 2) 0;
		}
		.qui {
			justify-content: flex-start;
			gap: 10px 14px;
		}
	}
</style>
