<script lang="ts">
	// Sommaire de marge : les chapitres de la page, celui qu'on lit marqué d'un losange aurore.
	// Les sous-chapitres ne se déplient que sous le chapitre en cours de lecture.
	type Entree = { id: string; title: string; level: number; numero?: string };
	let { sections, libelle = 'Sommaire' }: { sections: Entree[]; libelle?: string } = $props();

	const sommet = $derived(sections.reduce((haut, s) => Math.min(haut, s.level), 6));
	const lignes = $derived(sections.filter((s) => s.level <= sommet + 1));
	/** Pour chaque section de la page : son chapitre, et la ligne du sommaire qui la représente. */
	const attaches = $derived.by(() => {
		const liens: Record<string, { chapitre: string; ligne: string }> = {};
		let chapitre = '';
		let ligne = '';
		for (const s of sections) {
			if (s.level === sommet) chapitre = s.id;
			if (s.level <= sommet + 1) ligne = s.id;
			liens[s.id] = { chapitre, ligne };
		}
		return liens;
	});

	let lue = $state('');
	const courante = $derived(attaches[lue] ?? attaches[sections[0]?.id ?? '']);
	let nav: HTMLElement | undefined = $state();

	$effect(() => {
		const cibles = sections
			.map((s) => document.getElementById(s.id))
			.filter((e): e is HTMLElement => e !== null);
		for (const cible of cibles) cible.tabIndex = -1;
		let attente = 0;
		const relever = () => {
			attente = 0;
			const seuil = window.innerHeight * 0.3;
			let trouvee = cibles[0]?.id ?? '';
			for (const cible of cibles) {
				if (cible.getBoundingClientRect().top <= seuil) trouvee = cible.id;
				else break;
			}
			// En bas de page, la dernière section ne remonte plus jusqu'au seuil.
			const fond = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
			lue = fond && window.scrollY > 0 ? (cibles.at(-1)?.id ?? trouvee) : trouvee;
		};
		const suivre = () => {
			if (!attente) attente = requestAnimationFrame(relever);
		};
		relever();
		window.addEventListener('scroll', suivre, { passive: true });
		window.addEventListener('resize', suivre);
		return () => {
			cancelAnimationFrame(attente);
			window.removeEventListener('scroll', suivre);
			window.removeEventListener('resize', suivre);
		};
	});

	/** Le sommaire dépasse la marge : de quel côté il continue (« haut », « bas »). */
	let suite = $state('');
	function mesurer() {
		if (!nav) return;
		const reste = nav.scrollHeight - nav.clientHeight - nav.scrollTop;
		suite = [nav.scrollTop > 1 ? 'haut' : '', reste > 1 ? 'bas' : ''].join(' ').trim();
	}

	// La ligne courante reste visible dans un sommaire plus haut que la marge.
	$effect(() => {
		const ligne = courante?.ligne;
		if (!nav) return;
		if (ligne && nav.scrollHeight > nav.clientHeight) {
			const lien = nav.querySelector<HTMLElement>(`a[href="#${CSS.escape(ligne)}"]`);
			if (lien) {
				const haut = lien.offsetTop;
				const bas = haut + lien.offsetHeight;
				if (haut < nav.scrollTop) nav.scrollTop = haut;
				else if (bas > nav.scrollTop + nav.clientHeight) nav.scrollTop = bas - nav.clientHeight;
			}
		}
		mesurer();
	});
	$effect(() => {
		if (!nav) return;
		const observateur = new ResizeObserver(mesurer);
		observateur.observe(nav);
		return () => observateur.disconnect();
	});

	function ouvrir(event: MouseEvent, id: string) {
		if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
		const cible = document.getElementById(id);
		if (cible) {
			lue = id;
			cible.focus({ preventScroll: true });
		}
	}
</script>

<nav bind:this={nav} aria-label={libelle} data-suite={suite || undefined} onscroll={mesurer}>
	<ol>
		{#each lignes as s (s.id)}
			{@const sous = s.level > sommet}
			{@const ici = courante?.ligne === s.id}
			<li class:sous class:replie={sous && attaches[s.id]?.chapitre !== courante?.chapitre}>
				<a
					class:ici
					aria-current={ici ? 'location' : undefined}
					href={'#' + s.id}
					onclick={(event) => ouvrir(event, s.id)}
				>
					<span class="marque" aria-hidden="true"></span>
					{#if sous}
						<span class="titre"
							>{#if s.numero}<span class="indice chiffres">{s.numero}</span>{/if}{s.title}</span
						>
					{:else}
						{#if s.numero}<span class="numero chiffres">{s.numero}</span>{/if}
						<span class="titre">{s.title}</span>
					{/if}
				</a>
			</li>
		{/each}
	</ol>
</nav>

<style>
	nav {
		position: relative;
		max-height: calc(100svh - var(--sommaire-reserve, 224px));
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: thin;
		scrollbar-color: var(--reglure) transparent;
	}
	/* Le sommaire continue hors de la marge : il s'estompe du côté où il reste à lire. */
	nav[data-suite] {
		--fondu: calc(var(--ligne) * 1.5);
		mask-image: linear-gradient(
			to bottom,
			transparent,
			#000 var(--fondu-haut, 0px),
			#000 calc(100% - var(--fondu-bas, 0px)),
			transparent
		);
	}
	nav[data-suite~='haut'] {
		--fondu-haut: var(--fondu);
	}
	nav[data-suite~='bas'] {
		--fondu-bas: var(--fondu);
	}
	ol {
		display: grid;
		grid-template-columns: 5px max-content minmax(0, 1fr);
		column-gap: 12px;
	}
	li,
	a {
		display: grid;
		grid-template-columns: subgrid;
		grid-column: 1 / -1;
	}
	li.replie {
		display: none;
	}
	a {
		align-items: start;
		min-height: var(--cible);
		padding: 12px 4px 12px 0;
		font: var(--t-libelle);
		color: var(--encre-2);
		text-decoration: none;
		transition: color 160ms;
	}
	a:hover,
	a.ici {
		color: var(--encre);
	}
	.marque {
		grid-column: 1;
		width: 5px;
		height: 5px;
		margin-top: 8px;
		rotate: 45deg;
		background: transparent;
		transition: background 160ms;
	}
	a.ici .marque {
		background: var(--encre-humide);
	}
	.numero {
		grid-column: 2;
		font: var(--t-repere);
		line-height: 20px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--tampon);
	}
	.titre {
		grid-column: 3;
		text-wrap: balance;
	}
	/* Sans numéro, l'intitulé d'un chapitre reste sur l'axe des autres intitulés. */
	.marque + .titre {
		grid-column: 3;
	}
	.sous .titre {
		grid-column: 3;
		padding-left: 12px;
		font-weight: 400;
	}
	.indice {
		margin-right: 8px;
		color: var(--encre-2);
	}
	@media (max-width: 760px) {
		nav {
			max-height: none;
		}
	}
</style>
