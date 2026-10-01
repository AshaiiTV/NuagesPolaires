<script lang="ts">
	import '$lib/ui/styles/fonts.css';
	import '$lib/ui/styles/tokens.css';
	import '$lib/ui/styles/base.css';

	let { children } = $props();
</script>

<!-- Filtres d'encre partagés : bord irrégulier du tampon, grain de la page. -->
<svg class="encres" width="0" height="0" aria-hidden="true" focusable="false">
	<defs>
		<filter id="np-encre-seche" x="-4%" y="-12%" width="108%" height="124%">
			<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="bruit" />
			<feDisplacementMap in="SourceGraphic" in2="bruit" scale="1.4" xChannelSelector="R" yChannelSelector="G" />
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
