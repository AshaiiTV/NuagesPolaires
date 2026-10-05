<script lang="ts">
	import { onMount } from 'svelte';
	import { onNavigate } from '$app/navigation';
	import '$lib/ui/styles/fonts.css';
	import '$lib/ui/styles/tokens.css';
	import '$lib/ui/styles/themes.css';
	import '$lib/ui/styles/base.css';

	let { data, children } = $props();
	// Les parcours attendent le branchement des gestes avant leur première interaction.
	// Tourner la page : la feuille (Page.svelte) passe par un fondu bref, l'enveloppe reste en place.
	// Rien sous prefers-reduced-motion, rien si le navigateur ne connaît pas les transitions de vue.
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
	onMount(() => {
		void (async () => {
			await document.fonts.ready;
			document.documentElement.dataset.appReady = 'true';
		})();
	});

	// Le thème du compte sur <html> : le hook serveur le pose au premier rendu ; côté client, il suit
	// chaque navigation et chaque écriture confirmée (Ma collection, connexion, sortie du carnet).
	$effect(() => {
		const theme = data.theme;
		if (!theme) return;
		const racine = document.documentElement;
		if (racine.dataset.theme !== theme.id) racine.dataset.theme = theme.id;
		if (racine.dataset.ton !== theme.ton) racine.dataset.ton = theme.ton;
	});
</script>

<!-- Filtres d'encre partagés : bord irrégulier du tampon, grain de la page. -->
<svg class="encres" width="0" height="0" aria-hidden="true" focusable="false">
	<defs>
		<filter id="np-encre-seche" x="-4%" y="-12%" width="108%" height="124%">
			<feTurbulence
				type="fractalNoise"
				baseFrequency="0.9"
				numOctaves="2"
				seed="7"
				result="bruit"
			/>
			<feDisplacementMap
				in="SourceGraphic"
				in2="bruit"
				scale="1.4"
				xChannelSelector="R"
				yChannelSelector="G"
			/>
		</filter>
	</defs>
</svg>

{@render children()}

<style>
	.encres {
		position: absolute;
		pointer-events: none;
	}
</style>
