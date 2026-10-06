<script lang="ts">
	import { onMount, tick, type Component } from 'svelte';
	import {
		goto,
		onNavigate,
		preloadData,
		pushState,
		replaceState,
		invalidateAll
	} from '$app/navigation';
	import { page } from '$app/state';
	import { chemin } from '$lib/ui/adresse';
	import type { PageProps as SceneProps } from './carnet/scene/$types';
	import Ciel from '$lib/ui/Ciel.svelte';
	import '$lib/ui/styles/fonts.css';
	import '$lib/ui/styles/tokens.css';
	import '$lib/ui/styles/themes.css';
	import '$lib/ui/styles/base.css';

	let { data, children } = $props();
	let Scene = $state<Component<
		SceneProps & { superpose?: boolean; onreposer?: () => void; onrelire?: () => Promise<void> }
	> | null>(null);
	const feuillet = $derived(page.state.feuillet);
	let origine: HTMLAnchorElement | null = null;
	async function relireFeuillet() {
		const resultat = await preloadData(`${chemin('/carnet/scene')}?releve=${Date.now()}`);
		if (page.state.feuillet && resultat.type === 'loaded' && resultat.status === 200)
			replaceState('', { feuillet: resultat.data as SceneProps['data'] });
	}
	function reposer() {
		history.back();
		window.addEventListener(
			'popstate',
			() => {
				void invalidateAll();
			},
			{ once: true }
		);
	}
	onMount(() => {
		if (page.state.feuillet)
			void import('./carnet/scene/+page.svelte').then((module) => {
				Scene = module.default;
			});
		if (
			page.url.pathname === chemin('/carnet/scene') &&
			innerWidth >= 761 &&
			!page.state.feuillet
		) {
			void (async () => {
				await goto(chemin('/carnet'), { replaceState: true });
				const [module, resultat] = await Promise.all([
					import('./carnet/scene/+page.svelte'),
					preloadData(chemin('/carnet/scene'))
				]);
				if (resultat.type === 'loaded' && resultat.status === 200) {
					Scene = module.default;
					pushState(chemin('/carnet/scene'), { feuillet: resultat.data as SceneProps['data'] });
				}
			})();
		}
		function ouvrir(event: MouseEvent) {
			const lien =
				event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a.ruban') : null;
			if (
				!lien ||
				new URL(lien.href).pathname !== chemin('/carnet/scene') ||
				innerWidth < 761 ||
				event.button ||
				event.ctrlKey ||
				event.metaKey ||
				event.shiftKey ||
				event.altKey
			)
				return;
			event.preventDefault();
			event.stopPropagation();
			origine = lien;
			void (async () => {
				const [module, resultat] = await Promise.all([
					import('./carnet/scene/+page.svelte'),
					preloadData(lien.href)
				]);
				if (resultat.type !== 'loaded' || resultat.status !== 200) {
					location.assign(lien.href);
					return;
				}
				Scene = module.default;
				pushState(chemin('/carnet/scene'), { feuillet: resultat.data as SceneProps['data'] });
			})().catch(() => location.assign(lien.href));
		}
		document.addEventListener('click', ouvrir, true);
		return () => document.removeEventListener('click', ouvrir, true);
	});
	$effect(() => {
		if (!feuillet) return;
		const avant = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		void tick().then(() => document.querySelector<HTMLElement>('[data-superpose]')?.focus());
		return () => {
			document.body.style.overflow = avant;
			origine?.focus();
		};
	});
	// Les parcours attendent le branchement des gestes avant leur première interaction.
	// Tourner la page : la feuille (Page.svelte) passe par un fondu bref, l'enveloppe reste en place.
	// Rien sous prefers-reduced-motion, rien si le navigateur ne connaît pas les transitions de vue.
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		return new Promise((resolve) => {
			const transition = document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
			// Une rotation ou un redimensionnement peut annuler le fondu, sans annuler la navigation.
			void transition.ready.catch(() => {});
			void transition.finished.catch(() => {});
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

<Ciel />
<div inert={!!feuillet}>{@render children()}</div>
{#if feuillet && Scene}
	<div
		class="superposition"
		data-superpose
		data-regime="scene"
		role="dialog"
		aria-modal="true"
		aria-label="En scène"
		tabindex="-1"
		onkeydown={(event) => {
			if (event.key === 'Escape') reposer();
		}}
	>
		<Scene
			data={feuillet}
			form={null}
			params={{}}
			superpose
			onreposer={reposer}
			onrelire={relireFeuillet}
		/>
	</div>
{/if}

<style>
	.superposition {
		position: fixed;
		inset: 0;
		z-index: 30;
		overflow-y: auto;
		background: rgb(0 0 0 / 40%);
		outline: none;
	}
	.superposition :global(.feuille.volant) {
		margin-right: 0;
	}
	.encres {
		position: absolute;
		pointer-events: none;
	}
</style>
