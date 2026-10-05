<script lang="ts">
	// La rature : rien ne s'efface. L'ancienne valeur reste lisible, barrée, suivie de la nouvelle.
	interface Props {
		ancien: string | number;
		nouveau?: string | number | null;
	}
	let { ancien, nouveau = null }: Props = $props();
</script>

<span class="rature chiffres">
	<s><span class="sr-only">ancienne valeur : </span>{ancien}</s>{#if nouveau !== null}&nbsp;<ins
			><span class="sr-only">nouvelle valeur : </span>{nouveau}</ins
		>{/if}
</span>

<style>
	s {
		color: var(--encre-grise);
		text-decoration-thickness: 1px;
	}
	ins {
		color: var(--encre);
		text-decoration: none;
	}
</style>
