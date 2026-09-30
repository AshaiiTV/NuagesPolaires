# Synopsis — texte verbatim

Source : `renderSynopsis(tid)` — `assets/js/main.js:8280–8305`. Rendu dans l'onglet `#synopsis` (`index.html:7262`, conteneur `#p-synopsis-c`), accessible via le menu **Univers → Synopsis**. Classes : `.synopsis-shell`, `.synopsis-hero`, `.synopsis-kicker`, `.synopsis-manuscript`, `.synopsis-beat`, `.synopsis-line`.

## Hero

- Kicker : **NUAGES POLAIRES**
- Titre (h1) : **L'Argonaute a chuté.**
- Chapeau :

> Ce monde n'a pas été sauvé. Il commence après l'échec du plus grand héros, dans un futur où chaque survivant peut devenir une légende ou disparaître dans le silence.

## Manuscrit (article « Histoire principale »)

**La chute** — L'Argonaute pensait avoir atteint le cœur des ténèbres. Il avait traversé les ruines, les guerres, les monstres et les silences. Il croyait affronter la source. Il n'avait trouvé qu'une avant-garde.

Derrière elle attendait quelque chose de plus froid, plus patient, plus vaste. Une puissance qui ne rugissait pas, qui ne menaçait pas, qui se contentait d'avancer. L'Argonaute a perdu. Et avec lui, le monde a perdu son dernier point d'équilibre.

*Le Dimenséa, sa relique, a changé de mains.* (classe `synopsis-line`)

**Le basculement** — Alors les nuages sont venus. Pas une tempête. Pas une fin spectaculaire. D'immenses masses blanches ont couvert le ciel, étouffant la lumière jusqu'à rendre l'air irréel.

Il n'y eut ni incendie, ni tonnerre. Juste une pression derrière les yeux, dans la gorge, dans les os. Le cœur rata une seconde. Les voix se coupèrent. Les distances cessèrent d'avoir un sens.

*Puis la réalité s'est pliée.* (classe `synopsis-line`)

**Le réveil** — L'humanité fut projetée dans un futur lointain. Beaucoup n'ont pas survécu au passage. Ceux qui ouvrent les yeux découvrent un monde trop propre, trop immobile, presque poli par l'absence.

Les anciens repères se sont effacés. Les constructions ont presque toutes disparu, laissant place à de vastes étendues silencieuses. Le monde n'est pas mort : il attend.

Et dans certains survivants, quelque chose répond. Une marque intérieure. Un serment muet. Une cicatrice qui ne se voit pas, mais qui grandit à chaque choix, à chaque sortie, à chaque combat.

## Titre de clôture (h2)

**Ce qui reste à écrire dépend de ceux qui se relèvent.**

---

Note de structure : les trois mots-clés `La chute`, `Le basculement`, `Le réveil` sont des `<span class="synopsis-beat">` en tête de paragraphe ; les deux phrases isolées sont des `<p class="synopsis-line">`. Le propriétaire a précisé que « les constructions ont presque toutes disparu » (voir `docs/plan-du-site-2026-09-23.md`, l. 17) — ce point de lore doit rester tel quel.
