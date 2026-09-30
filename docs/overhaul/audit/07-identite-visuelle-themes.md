# 07 — Identité visuelle, thèmes, typographie, composants

Audit en lecture seule du dépôt `C:\Users\sacha\NuagesPolaires` (v297, `VERSION.txt`). Ce document est la **spécification source** du domaine visuel pour l'overhaul : tout ce qui n'y est pas écrit sera perdu. Références au format `fichier:ligne`.

Sources parcourues : `docs/charte-graphique-mystique-polaire.md`, `assets/css/*.css` (8 feuilles, 1 337 lignes), `assets/js/theme-max.js` (2 155 lignes), `assets/js/theme-regression.js`, `assets/js/main.js` (bloc thèmes l. 491-1141, 3607-4346, 15733-16300), `netlify/functions/auth.js` (l. 913-1050), `assets/fonts/`, `assets/favicon.svg`, `assets/images/`, `assets/vendor/jspdf/`, `index.html` (bloc `<style>` principal l. 19-5569, 15 blocs `<style id>` supplémentaires, accueil public l. 6561-6627), les 18 scripts de polish qui injectent du CSS.

---

## 0. Résumé exécutif

1. Le site porte **deux identités superposées** :
   - **« Nuit glaciaire »** (legacy, 2025-début 2026) : fond `#0d0e18`, accent bleu glacier `#7eb8d4`, or `#c9a84c`, Cinzel capitales espacées + Crimson Pro + JetBrains Mono, halos, panneaux de verre, rayons 18-28 px. Elle vit dans les 5 550 lignes de `<style>` de `index.html`, dans le CSS injecté par `theme-max.js` et par les scripts de polish.
   - **« Mystique polaire »** (23-24 septembre 2026, charte validée avec le propriétaire) : nuit d'encre `#091519`, aurore `#95cdbb`, laiton `#c6b38b`, ivoire `#f0eee5`, Cormorant Garamond + Manrope, panneaux mats, angles 2-4 px, séparateurs fins, illustration originale. Elle vit dans `assets/css/polar-*.css` (activée par `html[data-np-design="polar"]`) et dans `CONFIG.dark` de `theme-max.js`.
   - La seconde **écrase la première par spécificité et `!important`** (1 080 `!important` dans `index.html`, 341 dans `theme-max.js`, 775 dans les CSS polar). Le résultat visuel est bon sur les écrans refondus, mais la cascade est un empilement de 25+ couches.
2. Le **catalogue des thèmes** compte 9 thèmes canoniques (2 de base toujours accordés, 3 rares, 3 saisonniers, 1 fondateur), 2 « secrets scellés » décoratifs et un mécanisme de thèmes événement créés par l'admin. **Aucun thème n'a de prix** : il n'existe ni monnaie ni boutique ; le déblocage direct par le joueur est **désactivé côté serveur** (`auth.js:913-915`). L'obtention passe uniquement par don admin (individuel ou « à tous »), auto-distribution (`autoGrantAll`) ou statut admin.
3. L'**emblème** est une boussole à huit branches avec losange central, déclinée en 4 SVG différents (favicon, header, écran de connexion, overlay de transition) et recolorée à l'exécution selon le thème.
4. L'**accueil public** est une ouverture narrative (masthead, hero avec paysage original 1672×941, cinq chiffres réels, section « L'univers », section « Les Serments », invitation, colophon). Le pied de page expose encore le « RPG — expérimental » : à retirer (dérive jeu en ligne).

---

## 1. Architecture des couches visuelles (ordre de cascade réel)

Ordre de chargement dans `index.html` :

| # | Couche | Emplacement | Rôle | Identité |
|---|---|---|---|---|
| 1 | Google Fonts (Cinzel, Crimson Pro, JetBrains Mono) | `index.html:17-18` | preload distant, **encore chargé** | legacy |
| 2 | `<style>` principal (5 550 lignes) | `index.html:19-5569` | tokens `:root`, tous les composants legacy, écrans, simulateur, bestiaire, serments… | legacy |
| 3 | 8 blocs `<style id="np-theme-*">`, `np-light-consistency-v217`, `np-theme-aquaris-v231` | `index.html:5571-6542` | patches thèmes successifs v184→v231 | legacy |
| 4 | **`assets/css/polar-identity.css` … `polar-account.css`** (8 feuilles) | `index.html:6544-6553` | identité Mystique polaire, préchargement des woff2 | **polar** |
| 5 | `<style id="v104-overlay-cmdk-fix">`, `mac-home-premium-pass` (v214, ancien accueil), `np-theme-easter-*`, `beast-admin-v230-style`, `np-accessibility-serious-pass`, `theme-consistency-final-pass` (v237), `mobile-global-pass-v240` | `index.html:7510-9025` | patches tardifs | legacy |
| 6 | `theme-max.js` v257 | `index.html:9027` | injecte `<style id="np-theme-engine-v257">` (1 250 lignes de CSS) **en fin de `<head>`**, donc **après** les CSS polar ; pose les variables `--tm-*` et les alias legacy sur `body.style` | moteur |
| 7 | `api-hardening.js`, `diagnostics.js`, `site-self-test.js`, `admin-dashboard.js`, `theme-regression.js`, `staff-navigation.js`, `connected-pages-polish.js` (v270), `mobile-polish.js` (v272), `visual-audit-polish.js` (v280), `database-admin-polish.js` (v273), `rpg-prototype.js`, plus `ui-patches.js`, `beast-admin.js`, `bestiary-admin-pass2.js`, `finish-audit.js` chargés plus tôt | `index.html:7507, 8613-8615, 9028-9038` | chacun injecte son propre `<style id="np-…-vNNN">` | legacy |

Conséquences : les feuilles polar gagnent grâce au sélecteur racine `html[data-np-design="polar"] #s-app …` (spécificité 1-1-x) et à `!important` ; les scripts de polish (`#app-root :where(.card…){border-radius:18px !important}` `connected-pages-polish.js:39-45`) perdent face aux polar uniquement là où polar a aussi `!important`. `home-readability-polish.js` (v269) existe encore dans `assets/js/` mais **n'est plus chargé** (`docs/charte-graphique-mystique-polaire.md:62`, confirmé par grep dans `index.html`).

Activation de la couche polar : attribut statique `<html lang="fr" data-np-design="polar">` (`index.html:2`). Aucun JS ne le pose ; il n'y a pas de bascule legacy/polar.

---

## 2. Inventaire des tokens

### 2.1 Palette de marque « Mystique polaire » (`docs/charte-graphique-mystique-polaire.md:11-24`)

| Nom | Hex | Usage charté |
|---|---|---|
| Nuit d'encre | `#091519` | fond principal, respiration |
| Pierre sombre | `#102327` | surfaces du compagnon |
| Brume profonde | `#172E32` | surfaces secondaires |
| (4e niveau, non nommé) | `#213b3e` | `--bg4` (`polar-identity.css:15`, `theme-max.js:26`) |
| Ivoire | `#F0EEE5` | titres et texte principal |
| Brume claire | `#BDCDC8` | texte secondaire |
| (texte effacé, non nommé) | `#92aaa3` | `--faint` (`polar-identity.css:16`) |
| Aurore | `#95CDBB` | liens actifs, repères, interactions |
| Aurore sombre (non nommé) | `#648f83` | `--glacier-dim` (`polar-identity.css:17`) |
| Laiton pâle | `#C6B38B` | Serments, numérotation, détails rares |
| Sauge claire | `#C6D8C4` | action principale de l'accueil (`np-action-primary`, `polar-identity.css:80`), hover `#e0e8d8` |

Couleurs de surlignage secondaires utilisées dans l'accueil : `#d3ded2` (italique du titre), `#b8d1bf` (em des h2), `#a6c1b8` (eyebrows), `#9cb3a9`/`#91aa9f` (légendes), `#d8dfd2` (chiffres), `#d0dad1`, `#dbe8de` (text-link), `#e5e9df` (bouton quiet), `#a7bdb4` (note plateforme). Bordures : `#d4e4dd17`, `#d4e4dd20`, `#d4e4dd30` (ivoire-vert à 9-19 % d'opacité), `#95cdbb30/50/60` (aurore), `#c6b38b60` (laiton).

Métadonnées : `<meta name="theme-color" content="#091519">` (`index.html:10`), `::selection` `#95cdbb40` (`polar-identity.css:27`).

### 2.2 Tokens legacy `:root` (`index.html:20-29`) — thème sombre d'origine « Nuit glaciaire »

```css
--bg:#0d0e18; --bg2:#111220; --bg3:#151628; --bg4:#1a1b2e;
--border:rgba(126,184,212,.15); --border2:rgba(126,184,212,.25);
--glacier:#7eb8d4; --glacier-dim:#4a88aa; --glacier-bright:#b0d8ec; --glacier-dimcss:#4a88aa;
--glow:rgba(126,184,212,.08); --glow2:rgba(126,184,212,.05);
--text:#eaf4fc; --dim:#aacce0; --faint:#6a96ae;
--green:#5aaa7a; --gold:#c9a84c; --red:#c94a4a; --purple:#9a74c4;
--fd:'Cinzel',serif; --fb:'Crimson Pro',serif; --fm:'JetBrains Mono',monospace;
--theme-accent:#7eb8d4; --theme-accent-rgb:126,184,212; --theme-contrast:#f8fcff;
--theme-panel:rgba(126,184,212,.08); --theme-ring:rgba(126,184,212,.35); …
```

`body.light` (`index.html:30-38`) : `--bg:#f4f5fa; --bg2:#eceef6; --bg3:#ffffff; --bg4:#e4e7f2; --border:#d0d4e8; --border2:#b8bdd6; --glacier:#3a8fba; --glacier-dim:#2a6a8a; --text:#2a2a40; --dim:#5a5a7a; --faint:#a0a4c0; --green:#3a8a58; --gold:#9a7020; --red:#b84040; --purple:#8040b0`.

Ces valeurs sont **écrasées à l'exécution** par `theme-max.js applyVars()` (`theme-max.js:1517-1580`) qui réécrit `--bg…--bg4, --border, --border2, --glacier, --glacier-dim, --glacier-bright, --glow, --glow2, --text, --dim, --faint, --gold (= accentBright), --purple (= accentDim), --theme-accent…` sur `body.style`. Sous le thème de base « dark », c'est donc la palette polar (`#091519/#95cdbb/#c6b38b`) qui s'applique partout, y compris dans les composants legacy ; **`--red` et `--green` ne sont pas réécrits** et gardent `#c94a4a` / `#5aaa7a` (sens conservé, cf. charte l. 24).

Note importante : `--gold` devient l'`accentBright` du thème actif (laiton `#c6b38b` en base, `#73d8ff` cyan en Galactique, `#ff83bc` rose en Pâques…). Les composants qui utilisent `--gold` pour signifier « staff/serment » changent donc de couleur selon le thème.

### 2.3 Tokens du moteur v257 (`--tm-*`) et alias synchronisés

Défauts CSS (`theme-max.js:154-173`, encore en bleu legacy, remplacés dès `applyVars`) :

```css
--tm-bg, --tm-bg2, --tm-bg3, --tm-bg4, --tm-text, --tm-text-soft, --tm-text-muted, --tm-dim, --tm-faint,
--tm-accent, --tm-accent-dim, --tm-accent-bright, --tm-accent-rgb, --tm-accent-2-rgb,
--tm-border (= rgba(accent,.18)), --tm-border-strong (= rgba(accent2,.25)),
--tm-card-bg, --tm-card-bg-strong, --tm-control-bg, --tm-control-bg-hover, --tm-input-bg,
--tm-shadow, --tm-shadow-soft, --tm-primary-text (#071019), --tm-page-bg
```

Formules d'`applyVars` (`theme-max.js:1443-1491`) :
- `textSoft` = `rgba(245,247,251,.86)` (tone dark) / `rgba(32,50,39,.86)` (light) ; `textMuted` = `rgba(199,212,223,.72)` / `rgba(65,92,77,.72)`.
- `panelBase` dark = `linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.014)), linear-gradient(180deg,bg2,bg)` ; light = `linear-gradient(180deg,rgba(255,255,255,.92),rgba(255,255,255,.74)), rgba(accentRgb,.045)`.
- `shadow` dark = `0 22px 46px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.04)` ; `shadowSoft` dark = `0 12px 28px rgba(0,0,0,.20), inset 0 1px 0 rgba(255,255,255,.035)`.
- Surcharges spéciales pour `violet` (`:1466-1474`) et `green` (`:1475-1483`).
- Puis **polar-identity écrase** sous le thème de base : `body[data-theme-active="dark"]{--tm-card-bg:var(--bg2)!important; --tm-card-bg-strong:var(--bg3)!important; --tm-control-bg:var(--bg3)!important; --tm-control-bg-hover:var(--bg4)!important; --tm-input-bg:var(--bg)!important; --tm-shadow-soft:0 8px 24px #00000012!important; --tm-shadow:0 20px 50px #00000030!important}` (`polar-identity.css:21-26`) : surfaces mates sans dégradé.

Alias posés en plus (`theme-max.js:1535-1580`) : `--theme-accent`, `--theme-accent-rgb`, `--accent-rgb`, `--theme-contrast`, `--theme-contrast-soft`, `--theme-panel(-strong)`, `--theme-ring` (`.35`), `--theme-glow-strong` (`.18`), `--theme-tint` (`.04`), `--theme-ui-*`, `--theme-final-*` (v237), `--np-ui-*` (v188/v205), `--accent-solid-fg` (`#071019` light / `#f8fcff` dark), `--accent-solid-shadow`. `setAdaptiveThemeTokens()` (`main.js:3705-3727`) recalcule ensuite `--theme-accent` = mélange 78 % accent + 22 % accentBright et choisit le texte de contraste `[8,12,18]` si luminance > 0.58 sinon `[248,252,255]`.

Attributs posés : `body/html[data-theme-engine="v257"]`, `[data-theme-active="<id>"]`, `[data-theme-tone="dark|light"]` (`theme-max.js:1582-1587`). Classes : `light`, `theme-violet`, `theme-green`, `theme-aquaris`, `theme-easter`, `theme-halloween`, `theme-noel`, `theme-bloodmoon` ; `theme-red` figure encore dans `THEME_CLASSES` de la régression (`theme-regression.js:22`) mais `red` est normalisé vers `dark` (`main.js:508`, `theme-max.js:1405`).

### 2.4 Couleurs sémantiques à préserver (sens fixe quel que soit le thème)

| Domaine | Libellé | Valeur | Source |
|---|---|---|---|
| Jauges fiche | PV `.bpv` | `linear-gradient(90deg,var(--red),rgba(201,74,74,.6))` (v2) ; version initiale verte `rgba(90,170,122,…)` écrasée | `index.html:1849` vs `:289` |
| | EP `.bep` | or `var(--gold)`→`rgba(201,168,76,.6)` | `:1850` |
| | EM `.bem` | glacier `var(--glacier)`→`rgba(126,184,212,.6)` | `:1851` |
| | XP `.bxp` | vert `var(--green)`→`rgba(90,170,122,.6)` | `:1852` |
| | Piste `.bar` | `height:3px; background:rgba(126,184,212,.08); border-radius:2px` ; polar-sheet : `height:5px; border-radius:1px; background:var(--bg4)` | `:1837-1848`, `polar-sheet.css:48-50` |
| Statuts de combat | `STATUT_EFFECTS` : Saignement `#c94a4a` 🩸, Empoisonné `#77b36b` ☠, Brûlure `#d88a3d` 🔥, Gel `#7eb8d4` ❄, Étourdi `#d7b56d` 💫, Entravé `#8aa0b6` ⛓, Aveuglé `#c7c4b8` ◌, Silence `#8f8aa8` 🔇, Peur `#9e7bc2` 😨, Fragilisé `#d77c7c` 🩹, Renforcé `#77b38f` 🛡, Inspiré `#d8c27a` ✦ | | `main.js:12474-12487` |
| Types d'événement | `EV_TYPES` : combat ⚔ `var(--red)` « Combat / Chasse » ; exploration 🗺 `var(--gold)` ; social 💬 `var(--glacier)` « Social / Roleplay » ; evenement 🌟 `var(--purple)` « Événement majeur » ; autre ☁️ `var(--faint)` | | `main.js:15013-15019` ; agenda polar : `--np-agenda-accent` combat=`--red`, exploration=`--gold`, evenement=`--purple` (`polar-events.css:32-34`) |
| Couleur par Serment (fiche, PDF) | `_sermColor` : Duelliste `#7eb8d4`, Bretteur `#89d89a`, Claymore `#c9a84c`, Lame d'Honneur `#c9a84c`, Sauvageon `#c94a4a`, Croisé `#c9a84c`, Rôdeur `#6db88a`, Traqueur `#c084d4`, Flécheur `#7eb8d4`, Élémentaliste `#c9a84c`, Évocateur `#c084d4`, Conjurateur `#6db88a`, Arcaniste `#a8d4f0`, défaut `#7eb8d4` | | `main.js:16274-16282` |
| Paliers de serment | I Éveil, II Densité, III Maîtrise, IV Plénitude | | `main.js:16284-16300` |
| Rangs de serment | basic Basique, seasoned Aguerri, emeritus Émérite, singular Singulier, transcended Transcendé, corrupted Corrompu, other Autre | | `main.js:3485, 6097-6098` |
| Comportements créatures | Gibier `#6db88a`, Passif `#7eb8d4`, Neutre `#c9a84c`, Agressif `#c97a4a`, Très agressif `#c94a4a` | | `main.js:8822-8826` |
| Dangerosité bestiaire | `.bh1 #6db88a .bh2 #8ab870 .bh3 #c9a84c .bh4 #c97a3a .bh5 #c94a4a` | | `index.html:393` |
| Gemmes de Sang | blanche `.gem-blanche` glacier-dim / `.gb` `#e8e8f8` ; incarnate `.gem-incarnate` or `rgba(201,168,76,…)` / indigo `.gi` `var(--purple)` ; écarlate `.gem-ecarlate` rouge `rgba(201,74,74,…)` / `.ge` `var(--red)` ; boutons `.gem-btn.sel-b #e8e8f8`, `.sel-i var(--purple)`, `.sel-e var(--red)` | | `index.html:470-472, 1982-1984, 350-352` |
| Rôles (badges header) | staff `var(--gold)` ; `role-admin` rouge `#e07070`/`var(--red)` ; `role-mj` or ; `role-designer` violet `var(--purple)` | | `index.html:417-420, 544-546` |
| Section staff de la nav | or `rgba(201,168,76,.7)` → `var(--gold)` actif | | `index.html:152-157, 166-167` |
| Notifications | `.notif.ok` vert `rgba(90,170,122,.9)`, `.notif.err` rouge `rgba(201,74,74,.9)`, `.notif.inf` glacier `rgba(126,184,212,.8)` | | `index.html:559-563` |
| Historique fiche | `.hent.add` vert, `.remove` rouge, `.consume` or (bordure gauche) | | `index.html:360-362` |
| Tags | `.tgl` glacier, `.tgold`, `.tred`, `.tpur` | | `index.html:295-299` |
| Répartition branches (graphe) | Branche A `#7eb8d4`, Branche B `#c9a84c`, Aucune `#3a3a58` | | `main.js:10791-10793` |
| Rareté de thème → ton | `rarityTone` : Fondateur/Rare/Premium → `gold`, Mythique → `danger`, Saisonnier → `event`, Secret → `secret`, sinon `default` | | `theme-max.js:1731-1740` |
| Export PDF | `BG #09090f, GLACIER #7eb8d4, GOLD #c9a84c, DIM #a0a4c0, FAINT #585878, WHITE #e8eaf8, RED #c94a4a, GREEN #6db88a, PURPLE #c084d4`, bandeau `#0d0d18`, cartes `rgb(17,17,32)`, police Helvetica | | `main.js:16015-16061` — **le PDF est encore en palette legacy bleue** |

### 2.5 Typographie

Familles :

| Variable | Polar | Legacy | Chargement | Licence |
|---|---|---|---|---|
| `--fb` (corps, champs, menus, actions) | **Manrope** 400-700 (`manrope-latin.woff2`, 24 Ko) | Crimson Pro 300/400/600 + italiques (Google) | local `polar-identity.css:7` + preload `index.html:6544` ; Crimson Pro via `index.html:17` | Manrope : SIL OFL 1.1, © 2018 The Manrope Project Authors (`assets/fonts/OFL-Manrope.txt`) |
| `--np-editorial` (grands titres, citations, chiffres) | **Cormorant Garamond** 400-600 + italique 400-500 (`cormorant-garamond-latin.woff2` 37 Ko, `-italic-` 39 Ko) | — | local `polar-identity.css:8-9` + preload `:6545` | SIL OFL 1.1, © 2015 the Cormorant Project Authors (`OFL-Cormorant-Garamond.txt`) |
| `--fd` (repères capitales espacées) | Cinzel 400-700 (`cinzel-latin.woff2` 25 Ko) | Cinzel 400/600/700 (Google) | local `:6` **et** Google `:17` (double chargement) | SIL OFL 1.1, © 2020 The Cinzel Project Authors (`OFL-Cinzel.txt`) |
| `--fm` (chiffres de stats legacy, `.sv`, `.plvl`, `.rtbl td:first-child`) | — | JetBrains Mono 400/500 (Google) | `index.html:17` uniquement | OFL (non vendorisée, pas de fichier de licence dans le dépôt) |
| `--fh` | non défini nulle part (utilisé par `.branch-modal-title`, `.branch-choice-title/glyph`, `index.html:511,515,527,530`) → retombe sur la police héritée | | | |

Le `body` polar : `font-family:var(--fb); font-size:14px; line-height:1.65; -webkit-font-smoothing:antialiased` (`polar-identity.css:20`). Body legacy : 15 px Crimson Pro (`index.html:41`).

Échelle typographique polar (valeurs exactes) :

| Rôle | Réglage | Source |
|---|---|---|
| Titre hero accueil `#np-home-title` | `400 clamp(76px,7.8vw,120px)/.83 Cormorant`, `letter-spacing:-.045em` ; mobile `clamp(74px,16vw,110px)/.85` | `polar-identity.css:70,175` |
| Tagline hero | `400 clamp(22px,2.3vw,31px)/1.15 Cormorant` | `:72` |
| Description hero | `400 13px/1.85 Manrope`, `max-width:360px` | `:73` |
| Eyebrow (petit repère) | `500 10px/1.6 Manrope`, `letter-spacing:.2em`, uppercase ; variantes 8-9 px `.13-.23em` | `:67-68,95,120,126` |
| H2 de section accueil | `400 clamp(38px,4vw,61px)/1 Cormorant`, `-.025em` ; invitation `60px` ; mobile `45/46px` | `:106,127,193,203` |
| Chiffres communauté | `400 32px/1 Cormorant` ; légende `400 9px/1.5 Manrope` | `:98-99` |
| Citation / fin de récit | `400 italic 24-25px/1.3-1.4 Cormorant`, laiton | `:112,121` |
| Corps de récit accueil | `400 14px/1.95 Manrope` ; marginal `12px/1.8` | `:108,110` |
| H1 pages connectées (carnet, agenda, compte, premiers pas, archives) | `500 clamp(40-44px, 4.7-5vw, 62-68px)/1.03-1.05 Cormorant`, `-.02/-.025em` | `polar-connected.css:219`, `polar-events.css:14`, `polar-account.css:8`, `first-steps.css:40`, `adventure-archives.css:4` |
| Nom du personnage `#p-nom` | `500 clamp(42px,4.2vw,64px)/1.05 Cormorant`, `-.02em` | `polar-sheet.css:21` |
| H2 chapitres / cartes | `500 clamp(30px,3vw,40px)/1.15` (fiche), `500 34px/1.2` (agenda, collection), `500 28-30px` (panneaux compte) | `polar-sheet.css:33`, `polar-events.css:27`, `polar-account.css:31,38,76` |
| Titre de carte `.card-title` | `500 10px/1.7 Manrope`, `.12em`, `--dim`, souligné 1 px, puce losange 5 px aurore | `polar-connected.css:146-158` |
| Boutons | `500 11px/1.5 Manrope`, `.02em`, sans capitales, `min-height:44px` | `polar-connected.css:159-171` |
| Champs | `400 13-14px/1.5-1.65 Manrope`, `min-height:44-48px` | `polar-connected.css:176-186`, `polar-identity.css:141` |
| Labels de champ | `500 10-11px/1.6 Manrope`, `.025-.06em`, `--dim`, sans capitales | `polar-identity.css:142-143`, `polar-connected.css:191` |
| Navigation header | `500 11px/1.4 Manrope`, `.01em` ; items de menu `400 12px` ; libellés de section `9px .14em` | `polar-connected.css:35-56, 93-121` |
| Chiffres du carnet `.np-logbook-stats dd` | `400 38px/1.15 Cormorant`, `lining-nums tabular-nums`, aurore | `polar-connected.css:227` |
| Bloc calendrier | jour `500 44-48px/1.05-1.25 Cormorant` ; mois/année `500 9-10px uppercase .06-.09em` | `polar-connected.css:238-239`, `polar-events.css:37-40` |
| Wordmark | accueil `500 19px/.95 Cormorant .11em uppercase` + note `500 8px .23em` « LE COMPAGNON » ; connecté `500 19px/1.1` + `small 8px .15em uppercase` « Le Compagnon » | `polar-identity.css:52-53`, `polar-connected.css:28-29` |
| Numéro de section `.np-section-number` | `400 10px JetBrains Mono`, laiton | `polar-connected.css:235` |

Typo legacy conservée sous polar dans les écrans non refondus (staff, simulateur, database, modales) : Cinzel `7-11px letter-spacing 2-6px uppercase` pour tout libellé (`index.html:103,108,116,137,141,150,268,285,483,489`), JetBrains Mono 11-22 px pour les valeurs.

### 2.6 Espacements, rayons, ombres, transitions, z-index

Tokens legacy (`index.html:1043-1068`) :

```css
--sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px; --sp-5:20px; --sp-6:24px; --sp-8:32px; --sp-10:40px; --sp-12:48px;
--r-0:0px; --r-1:2px; --r-2:4px;          /* "sharp = 0, soft = 2px only" */
--shadow-card:0 4px 24px rgba(0,0,0,.45),0 1px 4px rgba(0,0,0,.3);
--shadow-modal:0 8px 48px rgba(0,0,0,.7),0 2px 8px rgba(0,0,0,.5);
--shadow-glow-sm:0 0 12px rgba(126,184,212,.12); --shadow-glow-md:0 0 28px rgba(126,184,212,.18);
--t-fast:.12s ease; --t-base:.2s ease; --t-slow:.35s cubic-bezier(.16,1,.3,1);
--z-base:1; --z-dropdown:100; --z-sticky:190; --z-modal:500; --z-loader:9999;
```

Z-index réels (hors tokens) : header `20050`, nav `20060`, drawer `20070`, popup onglet `10020`/backdrop `10010`, overlay modale `12040`/modale `12041`, notif `1000`, overlay de connexion `9999`, flash `10000` (`index.html:188,231,239-247,842,857`).

Rayons polar (mats, discrets) : cartes/panneaux **3-4 px**, boutons/champs **3 px**, chips/pills **2 px**, avatars **2-3 px** ; portrait du carnet `48px 48px 2px 2px` (arche), icône de serment `22px 22px 2px 2px` (`polar-connected.css:141,161,178,262`, `polar-reference.css:92`). Rayons legacy/polish : 12-28 px (`theme-max.js:797,869,906,1130`, `connected-pages-polish.js:40`, `mobile-polish.js:23 --np-mobile-radius:18px`, `index.html:234 border-radius:28px`, `:4730 24px`).

Ombres polar : **aucune** sur les cartes (`box-shadow:none`) ; menus `0 12px 28px rgba(0,0,0,.18)` ; popup onglet `0 20px 60px rgba(0,0,0,.3)` ; carte de connexion `0 24px 70px #00000022` (`polar-connected.css:89,126`, `polar-identity.css:138`).

Gabarits : accueil `width:88%; max-width:1408px` (sections), hero `max-width:1800px`, masthead `1600px`, marges latérales `6%` ; app body `max-width:1320px; padding:36px 36px 60px` ; carnet `1200px` ; agenda `1180px` ; fiche chapitres `padding:42px 28px 0` ; compte `1200px` (`polar-identity.css:47,63,93,102`, `polar-connected.css:125,215`, `polar-events.css:5`, `polar-sheet.css:30`, `polar-account.css:3`).

Points de rupture polar : `1600` (hero padding 96 px), `1200` (nav → burger, `index.html:190-194`), `1100`, `1000`, `900`, `760`, `680`, `640`, `600`. Grilles : communauté 5 colonnes → 3 sur mobile ; serments/bestiaire 2 colonnes → 1 ; collection 3 → 2 → 1 ; carnet `1fr / minmax(270px,340px)`.

### 2.7 Focus, accessibilité, mouvement

- Focus polar : `outline:2px solid var(--glacier); outline-offset:2-4px` sur `button,a,input,textarea,select,[tabindex]` (`polar-identity.css:28`, `polar-connected.css:188-190`). Legacy : `--np-focus-ring rgba(126,184,212,.46)` + `box-shadow 0 0 0 3px` (`index.html:8620-8658`).
- Cibles ≥ 44 px partout dans polar (charte l. 64) ; legacy 40-42 px (`index.html:8639-8647`).
- `prefers-reduced-motion` : polar coupe transitions/animations (`polar-identity.css:209-212`, `polar-connected.css:334-337`) ; theme-max masque étoiles, nébuleuse, météores, respiration Sylvan (`theme-max.js:774-785, 1395-1397`).
- `color-scheme:dark` / `body.light{color-scheme:light}` (`index.html:6088-6090`) ; tone light aussi via `body[data-theme-tone="light"]` (`theme-max.js:222-225`).
- Lien d'évitement « Aller au contenu » (`index.html:6562`, style `polar-identity.css:41-45`), `main#np-home-content tabindex="-1"`.
- Boutons désactivés : `cursor:wait; opacity:.55` (`polar-identity.css:30`), legacy `opacity:.3` (`index.html:1212`).
- Sous ton clair, les petits libellés accent repassent en `--dim` pour le contraste (`polar-reference.css:185-186`, `polar-events.css:88`).

---

## 3. Catalogue COMPLET des thèmes

### 3.1 Source de vérité et formes de données

Trois définitions coexistent et **theme-max.js réécrit les deux autres au démarrage** (`patchThemeMetadata`, `theme-max.js:1666-1690` : `id, name, label, cls, preview (3 premières couleurs), desc, description, rarity, category, event (= rarity==='Saisonnier'), tagline`).

1. `CONFIG` de `theme-max.js:18-146` (labels, palettes, fonds) — **gagne à l'affichage**.
2. `THEMES_BASE` (`main.js:491-497`) et `THEMES_EVENT_BUILTIN` (`main.js:935-940`) — portent `availableUntil`, `event`, anciens noms.
3. `THEME_CANON_META` (`main.js:512-522`) — rareté/catégorie canoniques côté main.js (catégorie « Événement » là où theme-max dit « Saisonniers »).
4. Collection DB `event_themes` (Neon `np_store`, chargée en preload `main.js:1313`) : liste ou objet de thèmes créés/modifiés par l'admin, fusionnés par id sur les builtins (`getAllThemes`, `main.js:969-987`).

Forme d'une entrée `event_themes` (créée par `saveTheme`, `main.js:4339`) :

```json
{
  "id": "theme_1727712345678",
  "name": "Nom affiché",
  "desc": "Description libre",
  "cls": "theme-xxx",
  "preview": ["#0d0e18", "#7eb8d4", "#c9a84c"],
  "event": true,
  "availableUntil": 1777593600000,
  "createdAt": 1727712345678,
  "autoGrantAll": false,
  "visible": false
}
```

(`availableUntil = 0` signifie « sans limite ». Le formulaire admin `m-theme` a les champs `mth-id, mth-name, mth-desc, mth-cls, mth-bg, mth-accent, mth-gold (color), mth-until (date)` — `main.js:4285-4346`. Un thème custom n'a **aucune règle CSS** : sa classe `cls` ne correspond à rien, il n'obtient que la carte de collection ; c'est une fonctionnalité incomplète.)

Forme côté compte (`auth.js:262-263, 913-1050`, `db.js:442`) :

```json
{ "selectedTheme": "violet", "unlockedThemes": ["violet", "bloodmoon"], "blockedThemes": [] }
```

Les mêmes champs existent aussi sur le joueur (`player.unlockedThemes`, `player.selectedTheme`, `player.blockedThemes`, `main.js:1105-1106, 1116-1118`) et des drapeaux `earlyClouds | isEarlyClouds | early_clouds | foundingClouds` (`main.js:1050-1053`) pour d'éventuels thèmes `earlyCloudsOnly` — aucun thème ne porte ce drapeau aujourd'hui.

Collection DB `theme_visibility` : `{ "<themeId>": true|false }` (`auth.js:1035-1042`), miroir local `localStorage np_theme_visibility`, clé locale seulement (`main.js:1369`). Thème actif : `localStorage np_theme` + `account.selectedTheme` via action `self_set_theme` (`main.js:1661-1690`, `auth.js:917-929`).

### 3.2 Le catalogue (ordre d'affichage `ORDER = dark, light, violet, green, aquaris, easter, halloween, noel, bloodmoon`, `theme-max.js:148`)

Rareté → tri : `Base 0, Classique 1, Saisonnier 2, Rare 3, Premium 3, Fondateur 4, Mythique 5` (`theme-max.js:149`) ; catégories → ordre `Équipé -1, Base 0, Classiques 1, Saisonniers 2, Rares 3, Fondateur 4, Secrets 9` (`:1727`). Libellé de restriction = rareté (`themeRestrictionLabel`, `:1742-1750`).

**Aucun thème n'a de prix.** Il n'existe pas de monnaie, de boutique ni de coût dans le code (grep `price|prix|coût` sur le domaine thèmes : néant).

#### `dark` — « Nuages Polaires » (Base) — toujours accordé

- Nom legacy : « Nuages Polaires » / desc « Le thème original. » (`main.js:492`) ; cls `""` ; tone `dark`.
- Tagline : « Mystique polaire — un monde à écrire. » Desc : « Nuit d'encre, lumière d'aurore et ivoire. La signature visuelle de Nuages Polaires. »
- `colors` : `["#091519","#95cdbb","#c6b38b"]`.
- `vars` : bg `#091519`, bg2 `#102327`, bg3 `#172e32`, bg4 `#213b3e`, text `#f0eee5`, dim `#bdcdc8`, faint `#92aaa3`, accent `#95cdbb`, accentDim `#648f83`, accentBright `#c6b38b`, accentRgb `149,205,187`, accent2Rgb `198,179,139`.
- `pageBg` : `radial-gradient(ellipse at 90% 0%,rgba(149,205,187,.07),transparent 40rem),linear-gradient(180deg,#091519,#0b1a1d)`.
- Obtention : `ALWAYS_GRANTED_THEME_IDS = ['dark','light']` (`main.js:932`) ; toujours visible (`getThemeVisibilityMap`, `:995`) ; l'admin ne peut pas le masquer (« Les thèmes donnés à tout le monde restent visibles. », `:4183`).
- Preview mini polar : `--preview-bg #091519; --preview-bg2 #102327; --preview-a #95cdbb; --preview-b #c6b38b; --preview-c #f0eee5` (`polar-account.css:88`). Preview legacy encore en bleu `#0d0e18/#7eb8d4/#c9a84c/#f0d78a` (`theme-max.js:922`).

#### `light` — « Brume Claire » (Base) — toujours accordé

- Legacy : « Brume Claire » / « Mode clair. » ; cls `light` ; tone `light`.
- Tagline « Une lecture plus claire et apaisée. » Desc « Mode clair, propre et doux. »
- `colors` `["#f4f5fa","#3a8fba","#9a7020"]` ; vars bg `#f4f5fa`, bg2 `#e8edf4`, bg3 `#dce4ee`, bg4 `#cbd8e5`, text `#15202b`, dim `#405363`, faint `#6f8190`, accent `#3a8fba`, accentDim `#1e6384`, accentBright `#9a7020`, accentRgb `58,143,186`, accent2Rgb `154,112,32`.
- `pageBg` : deux halos bleu/or + `linear-gradient(180deg,#f7f9fc,#e9eff6 52%,#dfe7f1)`.
- Surfaces light spécifiques (`theme-max.js:222-249`) : cartes blanches à 92-98 %, ombres `rgba(31,57,88,.09-.11)`, `--tm-primary-text #071019`.
- Remarque : **le mode clair n'a pas été traduit en Mystique polaire** (il reste bleu glacier/or legacy) ; la charte ne définit pas de palette claire.

#### `violet` — « Galactique » (Rare / Rares)

- Legacy : « Galactique » / « Constellations, nébuleuses et verre cosmique. » ; cls `theme-violet` ; tone dark.
- Tagline « Constellations, nébuleuses et lumière d'orbite. » Desc « Un thème spatial franc : ciel profond, étoiles vives, halos stellaires et verre cosmique. »
- `colors` `["#03020b","#9b7cff","#73d8ff"]` ; vars bg `#03020b`, bg2 `#090621`, bg3 `#140d3d`, bg4 `#21145f`, text `#fcfaff`, dim `#d9d4f4`, faint `#9a93c7`, accent `#9b7cff`, accentDim `#5a4ac4`, accentBright `#73d8ff`, rgb `155,124,255` / `115,216,255`.
- Ambiance : champ d'étoiles animé 46 s (`tmGalaxyStars`), nébuleuse 18 s, **météores** aléatoires (première apparition 9-18 s, puis toutes les 26-56 s, durée 2.1-2.85 s, 24 particules, `theme-max.js:1611-1657`), surfaces vitrées violettes ; cartes avec étoiles (`:581-588`).
- Obtention : dans `BUILTIN_THEME_IDS` (`main.js:931`) donc **visible par défaut** dans la collection, mais **verrouillé** tant qu'un admin ne l'a pas donné (`getUnlockedThemes` ne l'ajoute pas). Carte : « Indisponible » / « Non disponible » (non-événement, `main.js:3903,3930`).

#### `green` — « Sylvan » (Rare / Rares)

- Legacy : « Sylvan » / « Jungle dense, canopée humide, lianes vivantes et lumière de sous-bois. » ; cls `theme-green`.
- Tagline « Jungle dense, canopée vivante et sève lumineuse. » Desc « Un thème jungle organique : feuillage humide, lianes mouvantes, mousse profonde et lumière dorée filtrée par la canopée. »
- `colors` `["#031108","#51c56d","#d8c16a"]` ; vars bg `#031108`, bg2 `#082111`, bg3 `#12381d`, bg4 `#1e552d`, text `#f3fff0`, dim `#c9edbf`, faint `#8db883`, accent `#51c56d`, accentDim `#1f7d40`, accentBright `#d8c16a`, rgb `81,197,109` / `216,193,106`.
- Ambiance : rayons obliques, sous-bois en bas de page (390 px), respiration 9 s (`tmSylvanBreath`), preview aux coins « feuille » `18px 6px 18px 6px`.
- Obtention : builtin visible, verrouillé sauf don.

#### `aquaris` — « Aquaris — Royaume englouti » (Rare / Rares)

- Legacy : « Aquaris » / « Un royaume englouti s'abat sur l'interface : bulles, lueurs océaniques, verre abyssal et profondeur aquatique partout. », preview legacy `#020c13/#57dfff/#88ffe7` (`main.js:496`) ; alias `aquarius` normalisé ; cls `theme-aquaris` ; **absent de `BUILTIN_THEME_IDS`** mais dans `THEMES_BASE`.
- Tagline « Royaume englouti, cyan abyssal et or ancien. » Desc « Palais noyés, lumière abyssale, cyan profond et or ancien. »
- `colors` `["#011018","#48d6ef","#e5c878"]` ; vars bg `#011018`, bg2 `#041a24`, bg3 `#082b37`, bg4 `#0d3f4e`, text `#f0fcff`, dim `#c8e8ef`, faint `#8fb6c0`, accent `#48d6ef`, accentDim `#15849a`, accentBright `#e5c878`, rgb `72,214,239` / `229,200,120`.
- Ambiance : rayures diagonales « rayons sous-marins », voile et fond sombre de 260 px ; bloc patch `np-theme-aquaris-v231` (`index.html:6366-6542`) définit encore d'autres valeurs (`--bg #031019 … --theme-accent #6ee0ff`) écrasées par le moteur.
- Obtention : visible par défaut (`getThemeVisibilityState` retombe sur `true`, `main.js:1009`) sauf masquage admin ; verrouillé sauf don.

#### `easter` — « Pâques enchantées » (Saisonnier / Saisonniers ; canon main.js « Événement »)

- Legacy : « Printemps Éveillé » / « Explosion de Pâques pastel : œufs peints, printemps sucré et éclats festifs partout. », preview `#160f1f/#ffb9df/#fff19a` ; cls `theme-easter` ; `availableUntil 1777593600000` = **1er mai 2026 00:00 UTC** (échu).
- Tagline « Printemps vivant, mignon et coloré. » Desc « Un printemps joyeux : fleurs, herbe, lumière douce et couleurs pastel. »
- `colors` `["#f7fff2","#7fdc82","#ffd86b","#ffb6d8"]` (4 couleurs) ; tone **light** ; vars bg `#effbe9`, bg2 `#e5f7de`, bg3 `#d7f2cf`, bg4 `#c6ebbd`, text `#203227`, dim `#49655a`, faint `#668378`, accent `#63c76c`, accentDim `#38914a`, accentBright `#ff83bc`, rgb `127,220,130` / `255,182,216` ; liens `#b74d88` ; bouton primaire dégradé `#7fdc82 → #ffd86b 62% → #ffb6d8`, texte `#17311d`.
- Ambiance : halos jaune/rose/bleu, herbe en bas (132 px) ; le système d'œufs tombants de `main.js:3762-3832` (12 dessins SVG, 10 œufs, 22-40 s) est **désactivé** par le moteur (`#easter-eggs-layer{display:none!important}`, `theme-max.js:491-493`).

#### `halloween` — « Veille d'Halloween » (Saisonnier)

- Legacy : « Nuit des Âmes » / « Thème Halloween. », preview `#0a0806/#e07820/#c040e0` ; `availableUntil 1793577600000` = **2 novembre 2026** ; cls `theme-halloween`.
- Tagline « Presque creepy, entre citrouille et brume. » Desc « Nuit violette, lueur orange et ambiance inquiétante. »
- `colors` `["#0a0911","#ff8f2b","#7c59ff","#d8d2ff"]` ; vars bg `#0a0911`, bg2 `#110d18`, bg3 `#191224`, bg4 `#251830`, text `#fff4ea`, dim `#e8ccb6`, faint `#a98e8d`, accent `#ff8f2b`, accentDim `#a04b12`, accentBright `#d8d2ff`, rgb `255,143,43` / `124,89,255` ; bouton primaire `#ff8f2b → #7c59ff 70% → #d8d2ff`, texte `#150d17`.

#### `noel` — « Noël en fête » (Saisonnier)

- Legacy : « Veillée Hivernale » / « Thème Noël. », preview `#090f0a/#70c060/#f0d060` ; `availableUntil 1799193600000` = **6 janvier 2027** ; cls `theme-noel`.
- Tagline « Festif, chaleureux, rouge, vert et or. » Desc « Un Noël lumineux, rouge, vert, doré et enneigé. »
- `colors` `["#08140d","#d84a52","#2ea85f","#f2c66d"]` ; vars bg `#08140d`, bg2 `#0d1e12`, bg3 `#132816`, bg4 `#1d361f`, text `#fbfff9`, dim `#d8ead7`, faint `#9bb59e`, accent `#d84a52`, accentDim `#8d2430`, accentBright `#f2c66d`, rgb `216,74,82` / `46,168,95` ; neige statique (3 couches de points, opacité .30) ; bouton primaire `#d84a52 → #2ea85f 68% → #f2c66d`, texte `#fefcf7`.

#### `bloodmoon` — « BloodMoon » (Fondateur / Fondateur)

- Legacy : « Lune de Sang » / « Un ciel noir, une lune rouge souveraine et une lumière d'or funèbre. Un thème fondateur, noble et menaçant. », preview `#040205/#ff5a73/#f4c670`, `event:true`, `availableUntil 0` (toujours ouvert) ; alias `blood-moon`, `lune-de-sang` ; cls `theme-bloodmoon` ; `signature:'Lune de sang'` (seul thème avec ce champ).
- Tagline « Lune rouge souveraine et tension rituelle. » Desc « Noir rituel, lune carmine, menace souveraine et éclat cramoisi. »
- `colors` `["#050102","#e3133f","#f0c76f"]` ; vars bg `#050102`, bg2 `#0c0305`, bg3 `#17060a`, bg4 `#260912`, text `#fff6f3`, dim `#f0c4bd`, faint `#b07d82`, accent `#e3133f`, accentDim `#76061f`, accentBright `#ff7d92`, rgb `227,19,63` / `240,199,111`.
- `pageBg` dessine la **lune** : `radial-gradient(circle at 82% 12%, rgba(255,226,210,.98) 0 1rem, rgba(227,19,63,.98) 1.05rem 5.1rem, rgba(95,4,22,.62) 5.2rem 8.2rem, transparent 8.4rem)` + halos ; bouton primaire `#71051e → #e3133f 55% → #ff7d92 80% → #f0c76f`, texte `#fff7f2` ; carte de collection bordure `rgba(227,19,63,.34)`.
- Obtention : don admin uniquement (c'est le thème « fondateur »).

#### Emplacements « secrets » (décoratifs)

`THEME_SECRET_SLOTS` (`theme-max.js:1700-1703`) : deux entrées `{id:'secret-1'|'secret-2', label:'Secret scellé', rarity:'Secret', category:'Secrets', hint:'Un thème encore inconnu.'}`. Elles ne sont rendues que par l'ancien `renderThemeCollectionPremium` de `ui-patches.js:94-171` (classes `.theme-card-premium.secret/.locked`), pas par le rendu actuel `renderThemeGrid`.

#### Thèmes retirés / alias

`red` / `ecarlate` / `écarlate` → `dark` (`main.js:508`), preview `[data-preview-theme="red"] #160d0d/#2b1114/#d45050/#c9a84c/#ff9a9a` encore présent (`theme-max.js:925`) ; `theme-default`, `default` → `dark` ; `aquarius` → `aquaris`.

### 3.3 Règles d'attribution, de visibilité et d'usage (à reproduire exactement)

- **Toujours accordés** : `dark`, `light` (`ALWAYS_GRANTED_THEME_IDS`).
- **Builtins visibles par défaut** : `dark, light, violet, green` (`BUILTIN_THEME_IDS`, visibilité forcée `true` si absente de la map, `main.js:996-998`) ; les autres suivent `theme_visibility[id]`, puis `t.visible`, puis `true` (`:1001-1010`).
- **Admin** : voit tout, possède tout (`getUnlockedThemes`, `:1098-1100`) ; `isAdminLike` (admin, mj, designer ou `type:'staff'`) peut **utiliser** n'importe quel thème (`canUseTheme`, `:1128`).
- **Joueur** : possède `account.unlockedThemes ∪ player.unlockedThemes ∪ ALWAYS ∪ autoGranted` où `autoGranted` = thèmes non-base avec `autoGrantAll:true` et non expirés (`getAutoGrantedThemeIds`, `:1074-1081`, seulement pour role `joueur`).
- **Blocage** : `blockedThemes` sur compte ou joueur interdit l'usage (`:1130-1132`) ; action `admin_block_theme` remet `selectedTheme` à `dark` (`auth.js:1015-1020`).
- **Expiration** : un thème événement dont `availableUntil` est passé est « temporairement verrouillé » sauf s'il est déjà possédé (`isEventThemeTemporarilyLocked`, `:1036-1045`) — la possession est définitive.
- **Visibilité pour le joueur** : `isThemeVisibleForPlayer(id) || isThemeOwnedByCurrentViewer(id)` (`getVisibleThemesForCurrentViewer`, `:1054-1058`) — un thème masqué reste visible pour ceux qui le possèdent ou l'ont sélectionné.
- **Déblocage direct** : le bouton « Débloquer » (`unlockTheme`, `main.js:3849-3862`) appelle `self_unlock_theme` qui répond toujours **403 « Déblocage direct désactivé. Utilise un thème auto-distribué ou un don admin. »** (`auth.js:913-915`). L'état « À débloquer » est donc un cul-de-sac.
- **Actions serveur** (admin) : `admin_grant_theme {accountId, themeId}` (joueurs uniquement, `auth.js:931-948`), `admin_grant_theme_all {themeId}` → `{changed}` (`:950-969`), `admin_set_theme_autogrant {themeId, enabled}` (`:971-982`), `admin_revoke_theme` (remet `selectedTheme` à dark, `:984-999`), `admin_block_theme`/`admin_unblock_theme` (`:1003-1026`), `admin_set_theme_visibility {themeId, visible}` (`:1028-1050`, met à jour `theme_visibility` **et** `event_themes[id].visible`). Toutes sont auditées.
- **Chargement** : `loadSavedTheme` (`main.js:3835-3847`) lit `np_theme`, retombe sur `dark` si `canUseTheme` échoue ; `applyTheme(id, save)` (`:3729-3757`) refuse avec la notification « Ce thème n'est pas disponible. », pose la classe, persiste (`np_theme` + `self_set_theme`), met à jour le logo, l'overlay de lancement et les tokens adaptatifs.

### 3.4 Interface de la collection (compte → « Collection »)

Rendu `renderThemeGrid` (`main.js:3866-3936`) : `article.theme-card-premium.collection-card.np-theme-vault-card[.is-featured][.th-locked]` avec `role="button" tabindex="0" aria-pressed`, `aria-label "<nom> — Thème actif|Débloquer|Indisponible|Équiper"`, Entrée/Espace = clic, `data-theme-id/-rarity/-category/-state`, variables `--card-bg/--card-a/--card-b`. Structure : `theme-topline[data-theme-eyebrow=<rareté>] > .theme-card-state`, `.theme-preview-mini[data-preview-theme]` (head + 3 cards + bar), `.theme-card-body > .theme-title + .tagline`, `.theme-meta-row > .theme-palette (3 swatches)`, `.theme-card-action`.

États et libellés exacts :

| `data-theme-state` | Condition | `.theme-card-state` | `.theme-card-action` | Badge `::after` (moteur, masqué en polar) |
|---|---|---|---|---|
| `selected` | thème actif | « Équipé » | « Thème actif » | « Équipé » |
| `owned` | possédé, pas actif | « Possédé » | « Équiper » | « Possédé » |
| `available` | événement ouvert, non possédé | « À débloquer » | « Débloquer » | — |
| `locked` | non possédé et non ouvert | « Indisponible » | « Non disponible » | « Indisponible » |

Clic sur un thème non possédé : notification « Ce thème n'est pas dans ta collection. ». `is-featured` = Fondateur, Rare ou catégorie Événement.

Styles polar (`polar-account.css:75-98`) : grille 3 colonnes (2 à 1000 px, 1 à 600 px), carte `grid-template-rows:auto 116px minmax(76px,1fr) auto 44px; min-height:360px; padding:20px; border 1px var(--border2); radius 4px; background var(--bg2)`, bordure aurore si sélectionné, action en bouton bordé 44 px (aurore si équipé, pointillé si verrouillé), titre `500 28px Cormorant`, swatches 14 px carrés ; les pseudo-éléments halo du moteur sont supprimés. Styles moteur (legacy, `theme-max.js:787-1124`) : cartes 22 px de rayon, halos `color-mix`, translation -3 px au survol, grille fixe 380 px de haut (`main.js:3942-3969` injecte encore un `<style id="np-collection-width-polish">` à chaque rendu).

Moteur : `ensureCollectionUx` (`theme-max.js:1889-1959`) injecte au-dessus de la grille un **hero** « Collection des thèmes » / « Construis ta galerie de thèmes, équipe tes trouvailles et suis ta progression entre classiques, événements, rares et fondateurs. » avec 4 stats (`Total`, `Possédés`, `Équipé`, `Rare / Fondateur`), une **progression** « Progression de collection — n / total · pct% » et une lane de chips `Base, Classique, Saisonnier, Rare, Fondateur, Mythique`, puis une **toolbar** : recherche « Rechercher un thème… », filtres rapides `Tous | Communs | Événement | Rares | Fondateur`, select raretés (`Toutes raretés, Base, Classique, Saisonnier, Rare, Fondateur, Mythique`), select états (`Tous états, Équipé, Possédés, Disponibles, Indisponibles`), select tri (`Recommandé, Rareté, A-Z, Possédés d'abord`), compteur « n / total thèmes », vide « Aucun thème ne correspond aux filtres. ». Filtres persistés dans `localStorage np_theme_collection_filters_v257`. Ce hero ne s'insère que si un conteneur `.theme-collection, .appearance-themes, .themes-section, .collection-section, .settings-pane[data-tab="themes"]` existe (`collectionRoot`, `:1865`) — le rendu compte polar actuel n'utilise pas ces classes, le hero est donc probablement **inactif** (à vérifier, cf. questions ouvertes).

### 3.5 Administration des thèmes (Staff → Database → thèmes)

`renderAdminThemes` (`main.js:3974-4057`) : titre « Gestion des thèmes », note « Même bibliothèque visuelle que la Collection : tu pilotes ici la visibilité et la distribution, sans changer la DA côté joueurs. », bouton « + Créer un thème », compteur « n joueur(s) ciblable(s) ». Par carte : état « Toujours visible » / « Visible » / « Masqué » (sync JS : « TOUJOURS VISIBLE / VISIBLE / NON VISIBLE »), pill « Auto tous », bouton « Modifier », champ « Don manuel » (select « Choisir un joueur… », options suffixées « • déjà débloqué », bouton « Donner »), texte « Attribué à tout le monde. » / « Visible dans la collection joueur. » / « Masqué côté joueurs. », interrupteur `.theme-vis-btn.is-on`, bouton « Donner à tous » ou « Attribué à tout le monde » (désactivé). Notifications : « 🎨 Thème « X » donné à Y. », « 🎁 Thème « X » donné à n joueur(s). », « Tous les joueurs possèdent déjà ce thème. », « Visibilité du thème « X » mise à jour. ». Modale de création : titre « Créer un thème événement » / « Modifier le thème », défauts `#0d0e18 / #7eb8d4 / #c9a84c` (encore bleus).

### 3.6 Test anti-régression des thèmes (`theme-regression.js`, admin)

Boutons « Tester les thèmes » et « Copier rapport thèmes » dans la console du tableau de bord admin. Pour chaque thème (`dark Base, light Clair, violet Galactique, green Sylvan, easter Pâques, halloween Halloween, noel Noël, aquaris Aquaris, bloodmoon BloodMoon`) : vérifie `themeMeta`, ≥ 3 couleurs de preview, `data-theme-active`, présence de `--tm-page-bg/--tm-text/--tm-accent/--tm-border`, synchronisation `--glacier === --tm-accent`, **contraste bouton primaire ≥ 3:1** (luminance WCAG, `:218-234`), style d'un bouton et d'une carte sandbox, et absence de « bleu legacy » inline (`rgba(126,184,212,.7)`) hors thème de base. Rapport JSON `{version, at, durationMs, results:[{id,label,status,colors,meta,checks[]}]}`. À conserver comme principe (test de contraste automatisé), pas comme code.

---

## 4. L'emblème (boussole)

Quatre dessins SVG distincts représentent la même idée — **une rose des vents à huit branches, cercle fin, losange central sombre cerclé et cœur clair** — évoquant « les repères perdus et la réalité pliée » (charte l. 34). La charte précise : signature de NP, **jamais une représentation canonique du Dimenséa**.

| Usage | Fichier/ligne | Géométrie | Couleurs |
|---|---|---|---|
| Favicon, wordmark accueil (44 px), section Serments (230 px filtrée), sceau du carnet (104 px, opacité .7) | `assets/favicon.svg` (viewBox 340) ; `index.html:7-9, 6565, 6617` ; `main.js:8168` | halo radial r 148 ; anneau r 116 (dégradé) ; anneau pointillé r 128 `8 14` ; 8 tirets extérieurs ; 4 branches cardinales `M0-118 20-34 0-16-20-34z` ; 4 branches diagonales pleines ; carré 44 tourné 45° fond `#09090f` trait 4 ; cœur 22 clair ; ombre `dy 5 blur 5 #02040a .42` | halo `#7eb8d4 .24 → #4a7d96 .1`, aiguilles `#e7f7ff → #b8dfef → #7eb8d4`, anneau `#d4eef8/#4a7d96/#7eb8d4`, diagonales `#d4eef8 .82`, cœur `#e7f7ff` — **bleu legacy**, non aligné sur la palette aurore/laiton |
| Header connecté `#hdr-logo-svg` (38-40 px) | `index.html:6959-6977` | viewBox 100, cercle r 44 trait .8, 4 branches `50,6 56,38 50,44 44,38`, 4 diagonales, carré 18 puis 10 | recoloré à chaque thème par `updateHeaderLogoTheme` (`main.js:3619-3632`) avec `_npThemePalette` : `primary = mix(inverse(bg), accent, .28)`, `secondary = mix(primary, text, .18)`, `centerOuter = mix(bg, accent, .22)`, `centerInner = mix(primary, accent, .45)` |
| Écrans connexion / règlement / inscription `.login-emblem` (80×76) | `index.html:6635-6681, 6787-…` | viewBox 200×190 : cercle r 72 + pointillé r 76 `3 9`, 8 « rayons serment », 4 branches `0,-58 7,-22 0,-14 -7,-22`, 4 diagonales, **fragment brisé** (`30,-42 50,-30 38,-22 22,-32` à .22 + trait), carré 22/12, **nuage bas** (path courbe à `translate(100,165)` .6) ; animation `fadeIn .8s` | `#d4eef8`, `#b0d8ee`, `#7eb8d4`, `#4a7d96`, `#09090f` — bleu legacy |
| Overlay de transition de connexion `#lto-logo` (88 px) | `index.html:7469-7504`, CSS `:841-863` | croix + diagonales en dégradé, 8 branches, cercles r 64/40/7/3 ; fond `#09090f` ; flash radial `#b8def0 → #7eb8d4 40% → #09090f` | recoloré par `updateLaunchTheme` (`main.js:3635-3666`) ; variables `--launch-bg/--launch-accent/--launch-accent-2/--launch-core` |

Interaction : clic sur le logo du header → retour à l'accueil connecté + rotation de 360° accélérée à chaque clic rapproché (`logoClick`, `main.js:15733-15760`, vitesse 600 ms → ×0.65 jusqu'à 60 ms). Dans la section « Les Serments » de l'accueil, le favicon est passé au filtre `sepia(.35) hue-rotate(320deg) saturate(.55)` pour tirer vers le laiton, dans une orbite de 320 px avec un losange laiton 6 px (`polar-identity.css:114-119`).

---

## 5. L'accueil public actuel (`#s-home`, `index.html:6561-6627`, `polar-identity.css:33-134`)

Fond `#091519`, `min-height:100svh`, texte `#f0eee5`, `isolation:isolate`, anciens pseudo-fonds désactivés.

1. **Lien d'évitement** « Aller au contenu ».
2. **Masthead** (104 px, bordure basse `#d4e4dd17`) : wordmark = favicon 44 px + « Nuages / Polaires » (Cormorant 19 px, uppercase .11em) + note « LE COMPAGNON » (8 px .23em `#92aaa3`) ; nav : « L'univers », « Les Serments » (scroll doux, respect reduced-motion), bouton bordé « Espace joueur ↗ » (`#95cdbb50`, hover `#95cdbb12`). Mobile (≤ 760) : masthead 84 px, seuls le wordmark 34 px et « Espace joueur » restent.
3. **Hero** (`min-height:685px`, mobile 760) : image `./assets/images/nuages-polaires-horizon.jpg` (1672×941, 270 Ko, `object-position:center 55%`, opacité .94 ; mobile `65% center`, .76, `alt` « Un vaste paysage naturel se dessine sous d'immenses nuages blancs, éclairés d'une lueur froide. », `fetchpriority="high"`) ; voile `linear-gradient(90deg,#09151970,transparent 74%)` + gradient vertical ; copie à gauche (`padding:54px 6% 90px`, 96 px à ≥ 1600) :
   - eyebrow avec **signal** (losange 5 px `#95cdbb` + halo 12 px) : « ROLEPLAY TEXTUEL · UNIVERS ORIGINAL » ;
   - `h1` « Nuages / *Polaires.* » ;
   - tagline « Le monde attend. / Votre histoire commence. » ;
   - description « Un futur inconnu. Une marque en vous. / Et tout ce qui reste à écrire, ensemble. » ;
   - actions : **« Rejoindre l'aventure ↗ »** (sauge `#c6d8c4` sur `#102327`, 52 px, rayon 2 px, hover `#e0e8d8` + translation -2 px) et « Découvrir l'univers ↓ » (quiet `#09151930`, bordure `#d4e4dd30`) ;
   - note « Une histoire collective, sur Discord. *Comment commencer ?* » (lien souligné → guide Premiers pas) ;
   - coordonnée bas-gauche « NP / 01 — APRÈS LE BASCULEMENT » (8 px .18em, filet 46 px) ;
   - légende bas-droite « « Le monde n'est pas mort. / *Il attend.* » » (Cormorant 24 px, filet laiton 32 px, ombre `0 2px 12px #000`).
4. **La vie du serveur** (`.np-community`, `grid 1fr 2fr`, filets `#d4e4dd20`) : eyebrow « LES TRACES DE NOTRE PASSAGE » + « Un monde qui s'écrit à plusieurs. » ; cinq métriques `#hf-serments` « Serments », `#hf-joueurs` « Élèves invoqués », `#hf-creatures` « Créatures vaincues », `#hf-actifs` « Actifs cette semaine », `#hf-gemmes` « Gemmes distribuées » (tiret « — » tant que `public_stats` n'est pas chargé, `main.js:2003-2010`). Principe charté : **aucun faux nombre de joueurs en ligne** (charte l. 48, commentaire `polar-identity.css:92`).
5. **01 · L'UNIVERS** (`#np-univers`, grille 2 colonnes, gap 12 %) : h2 « Tout commence / *après la chute.* », marginal « Le passé s'est dérobé. / Le reste vous appartient. » (bordure gauche laiton `#c6b38b60`), texte : « L'Argonaute a perdu. Le Dimenséa a changé de mains. Alors les nuages ont couvert le ciel, et la réalité s'est pliée. » / « L'humanité s'éveille dans un futur lointain. Les anciens repères se sont effacés. Un horizon méconnaissable s'étend dans le silence. Parmi les survivants, certains portent une marque intérieure : un **Serment**. » / fin en italique laiton 25 px « Ce qui reste à écrire dépend de ceux qui se relèvent. ». Étiquette de section : `01` laiton + « L'UNIVERS » (9 px .19em `#a6c1b8`, séparateur `#95cdbb30`).
6. **02 · LES SERMENTS** (`#np-serments`, bordure haute) : visuel = cadre interrompu (clip-path aux coins, `#95cdbb18`), orbite 320 px, emblème 230 px filtré, légende « LE LIEN · LE CHOIX · LA TRACE » ; copie : eyebrow « CE QUI VOUS LIE À CE MONDE », h2 « Une marque. / *Un chemin.* », citation « « Nul ne choisit son Serment. / C'est le Serment qui reconnaît son porteur. » » (italique laiton 24 px), paragraphe « Votre Serment grandit à travers vos choix, vos sorties et vos combats. Ici, votre personnage se construit autant dans l'histoire que vous écrivez que dans les pouvoirs qu'il découvre. », lien texte souligné aurore « Faire le premier pas ↗ ».
7. **Invitation** (centrée, halo radial bas `#95cdbb0b`, padding 75/82) : eyebrow « LA SUITE N'EST PAS ENCORE ÉCRITE », h2 60 px « Laissez votre trace. », « Découvrez les règles, créez votre compte et rejoignez une histoire collective. », bouton « Commencer l'aventure ↗ ».
8. **Colophon** : « NUAGES POLAIRES » + « Le compagnon d'un monde à écrire. » ; boutons « Règlement » et **« RPG — expérimental ↗ »** (`openRpgPrototype`) — **dérive à supprimer**.

Tous les CTA mènent au **règlement** (`showScreen('s-hrp')`) avant l'inscription ; « Espace joueur » mène à la connexion.

Écrans **connexion / règlement / inscription / reset** (`#s-login`, `#s-hrp`, `#s-register`, `#s-reset`, `index.html:6630-6900`) : fond `var(--bg)`, `.login-card` `var(--bg2)`, bordure `--border2`, rayon 4 px, ombre `0 24px 70px #00000022`, padding 34 px ; `h1` « Nuages Polaires » (Cormorant 38 px), sous-titres « Règlement Hors-Roleplay », « Nouveau mot de passe » ; champs 48 px ; bouton de connexion « Se connecter » en aurore pleine (`polar-identity.css:144-145`), « Rester connecté » (toggle), « ← Retour à l'accueil », « J'accepte — Continuer ». Le fond conserve les **brumes legacy** animées (`.screen-bg .home-fog-1/2/3`, bleu `#7eb8d4`/`#4a7d96`/violet `#c084d4`, blur 80 px, opacités .02-.05, dérive 28-40 s, `index.html:820-824`), la ligne d'horizon (`.screen-horizon`, `:953`) et le **canvas de particules** de connexion (`#login-particles-canvas`, `main.js:15773`). L'overlay de transition (fond `#09090f`, flash bleu) est une survivance à réévaluer.

**Premiers pas public** (`#s-first-steps`, `first-steps.css`) : `width:min(100%,1280px); padding:54px 40px 64px` ; eyebrow « Le Compagnon / Guide de départ », h1 « Les premiers pas. », « Prendre ses repères, trouver son serment, puis écrire la suite ensemble. » ; bloc d'état bordé aurore à gauche, étapes numérotées (Cormorant 26 px), cartes essentielles 3 colonnes, FAQ en `details`, pied italique 23 px.

---

## 6. Composants récurrents et leurs états

Pour chaque composant : forme polar (cible), puis forme legacy encore active sur les écrans non refondus.

### 6.1 Header et navigation connectée (`polar-connected.css:10-135`)

- Header : `min-height:78px; padding:10px 24px; background:var(--bg); border-bottom:1px solid var(--border2)`, sans ombre ni blur ; mobile 68 px, wordmark masqué, logo 32 px, bouton réglages masqué.
- Wordmark : logo SVG 40 px + « Nuages Polaires / Le Compagnon ».
- Boutons de groupe (`.nav-dropdown-btn/.nav-group-btn/.rpg-nav-btn`) : 44 px, Manrope 11 px 500, `--dim`, soulignement 1 px aurore au survol/ouvert/actif ; ▾ ajouté en `::after` legacy (`index.html:161`).
- Menus (`.nav-dropdown-menu/.nav-group-menu/#mobile-drawer/#notif-panel`) : `var(--bg2)`, bordure `--border2`, rayon 3 px, ombre `0 12px 28px rgba(0,0,0,.18)` ; items 44 px, 12 px, séparés par `--border`, hover/actif `var(--bg3)` + texte aurore ; libellés de section 9 px .14em ; section staff en or (legacy).
- Profil header : bordure gauche seule, avatar 38×42 rayon 2 px, pseudo 11 px (max 110 px), badge de rôle sans fond 9 px .08em ; boutons réglages/cloche/burger 44 px bordés, icône aurore.
- ≤ 1200 px : nav masquée, burger ; drawer mobile z 20070.
- Bannière « ⏳ Ton compte est en attente de liaison — un administrateur doit te lier à ton personnage. » (or, `index.html:445, 6953`).
- Popup d'onglet (`.tab-content.tab-popup-active`) : en polar devient un bloc en flux (`position:relative; width:100%; background:var(--bg); radius 4px`), bouton de fermeture collant 44 px ; legacy : fenêtre fixe `min(1280px, 100vw-36px)`, rayon 28 px, ombre 80 px (`index.html:234`).

### 6.2 Cartes et panneaux

- Polar (`polar-connected.css:138-158`) : `.card,.summary-card,.staff-panel,.prog-panel,.rsec,.bcrd,.jcard,.ecard,.s-card,.journal-card` → `background:var(--bg2); border:1px solid var(--border); border-radius:4px; box-shadow:none`, filet `::before` supprimé ; carnet `padding:28px`, bordure `--border2` ; fiche `padding:24px; radius 3px` ; cartes « en vedette » avec `border-top:2px solid var(--glacier)` (personnage, `.shero`, serments) ou `var(--gold)` (calendrier).
- Titre `.card-title` : 10 px .12em `--dim`, filet bas, losange aurore 5 px ; fiche : 11 px .08em aurore (`polar-sheet.css:42`).
- Legacy : `.card{background:rgba(7,8,16,.85); border .5px rgba(126,184,212,.09); radius 2px; padding 20px; shadow --shadow-card}` + filet dégradé en haut (`index.html:266-269, 1150-1163`) ; polish v270 : rayon 18 px, verre, ombre 36 px, `text-shadow` sur les titres (`connected-pages-polish.js:39-53`) ; moteur : `--tm-card-bg` (dégradé blanc 4-6 % sur bg2→bg).
- Survol : polar sans effet (sauf archive/liste : bordure aurore + `--bg3`) ; legacy : bordure `--tm-border-strong`.

### 6.3 Boutons

| Variante | Polar | Legacy |
|---|---|---|
| Secondaire `.btn/.btn-out/.btn-sm/.tab-btn/.settings-tab/.bfilt` | 44 px, `padding:10px 16px`, `var(--bg3)`, bordure `--border2`, rayon 3 px, texte `--text` ; hover `var(--bg4)` + bordure aurore, aucun `transform` | `.btn` : transparent, bordure `rgba(126,184,212,.25-.3)`, Cinzel 8-9 px .25-3px uppercase, texte `rgba(126,184,212,.7-.8)`, balayage `::before scaleX` au survol, `translateY(-1px)` ; `.btn-sm` 8 px ; désactivé opacité .3 |
| Primaire | `.np-primary-button`, `.np-account-primary`, `.np-agenda-primary`, `.np-steps-button.is-primary`, bouton « Se connecter » : fond aurore `var(--glacier)`, texte `var(--tm-primary-text,#091519)`, hover inversé ivoire/encre | moteur : `linear-gradient(135deg,accent,accentBright)` + ombre `rgba(accent,.18)`, `font-weight:850`, dégradés spécifiques par thème saisonnier (`theme-max.js:214-220, 379-398, 444-447`) ; `.btn-primary` legacy bleu |
| Accueil `.np-action-primary/-quiet` | sauge / quiet translucide, 52 px, rayon 2 px, flèche `↗`/`↓` 20 px à droite (`justify-content:space-between; gap:30px`) | — |
| Lien-bouton `.np-text-link`, `.np-quiet-button`, `.np-account-text-action`, `.np-guide-link` | sans fond, soulignement 1 px aurore (ou `text-decoration underline offset 4px`), 44 px | — |
| Sémantiques `.btn-red/.btn-grn/.btn-gold` | texte coloré seulement | bordure + texte colorés, hover plus vif |
| Danger compte `.np-account-danger-action/-confirm` | texte rouge bordé ; confirmation bordure rouge sur `--bg2` | — |
| Suppression agenda `.np-agenda-delete` | transparent `--dim`, hover rouge | — |
| Icônes 44 px (réglages, cloche, burger, fermeture popup) | bordés 1 px, rayon 2-3 px | 30-34 px |

Etats communs : `:focus-visible` outline aurore 2 px ; `:disabled` `cursor:wait; opacity:.55` (accueil/agenda `.58`).

### 6.4 Formulaires

- Champs polar : 44-48 px, `var(--bg)`, bordure `--border2`, rayon 3 px, Manrope 13-14 px, focus bordure + outline aurore, placeholder `--dim` .7 ; fiche 46 px ; archives 46 px sur `--bg2`.
- Labels : 10-11 px 500, `--dim`, sans capitales (legacy : Cinzel 7-9 px .3em uppercase `rgba(126,184,212,.5)`, `index.html:108,489,1131-1147`).
- Select legacy : chevron SVG intégré `fill rgba(126,184,212,.4)` (`index.html:1117`) ; options sur `#0d0e18`.
- Mot de passe : `.password-field` + `.password-eye` 28 px 👁 (`index.html:111-114`).
- Toggle `.toggle-sw` 44×24 : piste `--bg4` bordée, cochée = aurore ; bouton blanc 16 px translation 20 px (`index.html:960-965`) ; étoiles au clic (`spawnToggleStars`).
- Erreur `.errmsg` : rouge 12 px italique (legacy) / `400 12px/1.7` non italique (compte).
- Curseur `.part-slider` `accent-color:var(--glacier)`.
- Mobile : champs 16 px (anti-zoom iOS, `mobile-polish.js:52-55`).

### 6.5 Jauges et statistiques

- Ressources fiche (`polar-sheet.css:43-51`) : ligne `.sr` (label 12 px 400 / valeur 15 px 500 tabulaire), piste `.bar` 5 px rayon 1 px sur `--bg4`, remplissage `.bf` plein sans halo, couleurs sémantiques §2.4, transition `width .6s cubic-bezier(.16,1,.3,1)`. Legacy : 3 px, halo `::after` flouté (`index.html:288`).
- Charte : **une seule barre d'XP** pour le personnage ; le niveau détermine les paliers du serment ; le rang du serment reste un libellé distinct (charte l. 44).
- Capacité d'événement `.np-agenda-capacity` : 3 px, piste `--border2`, remplissage aurore (`polar-events.css:60-61`).
- Progression de collection (moteur) : 12 px arrondie, dégradé accent→bright, halo.
- Stats en lignes (carnet, serments, index agenda) : chiffres Cormorant 27-44 px tabulaires, libellés 9-11 px, colonnes séparées par des filets `--border`, jamais de cartes.
- Bloc calendrier (`.np-agenda-date`) : colonne bordée, filet supérieur 2 px couleur du type, jour 48 px, `time` en pied.

### 6.6 Badges, chips, pills, tags

- Polar : `.serm-level-pill, .serm-cat, .serm-badge-new, .np-sheet-branch-badge, .np-agenda-state, .np-agenda-participants li` → `500 10-11px Manrope`, fond `var(--bg)`, bordure `--border2`, rayon 2 px, texte aurore ou `--text` ; état agenda avec point 4 px (`joined` bordure aurore, `hidden` pointillé, `undated` point or, `full` point rouge) ; badge « nouveau » or.
- Marqueurs de rôle : `.np-account-role::before` losange 5 px `--account-role-color` ; `.np-combat-result::before` losange 4 px `--result-color` ; `.np-character-status li` `--status-color`.
- Legacy : `.tag` Cinzel 7-11 px bordé `currentColor` opacité .75 ; `.plvl` JetBrains 11 px fond `--glow` ; `.hdr-badge` ; `.nav-badge` rouge 16 px rond ; chips moteur (`.chip,.badge,.plvl,.theme-meta-pill…`) 999 px dégradé accent 13-16 % ; `.theme-topline::before` pill de rareté 10 px 900 uppercase ; `.chip.cyan/.purple` (simulateur).

### 6.7 Modales, overlays, notifications

- Modale legacy (seule forme existante, `index.html:479-493, 1248-1290`) : overlay `rgba(2,3,8,.88)` + blur 8 px (light : `rgba(160,168,200,.75)`), `.modal` `rgba(9,9,15,.98)` bordure .5 px, rayon 4 px, padding 32 px, `max-width:500px`, ombre `--shadow-modal`, animation `cardIn .22s`, titre `.mtit` Cinzel 10 px .5em aurore avec filet, fermeture `.mclose` 28 px bordée (hover rouge), `.factions` alignées à droite ; modale de branche `min(1040px,94vw)` avec cartes `.branch-choice` (accent `--branch-accent`, `color-mix`, `index.html:501-542`). En polar, seuls les tokens de couleur changent (`--tm-card-bg` mat).
- Notification `.notif` (`index.html:559-563`) : coin bas-droit, 12 px, bordure .5 px, glissement 16 px, `.ok/.err/.inf` ; `npApiHardening.toast(msg, 'ok|warn|bad', ms)` (bandeau API).
- Overlay de connexion et flash : §5.
- État vide `.empty-state` : icône 32 px .2, titre Cinzel 9 px, sous-titre italique ; polar `.np-calm-empty` (h3 Cormorant 29 px), `.np-events-empty` (bordure pointillée, marque ronde 72 px or), `.np-events-empty-mark`.
- Squelette `.skeleton` shimmer 1.6 s.

### 6.8 Tableaux et documentation

- `.rtbl` polar : `--bg2`, `th` `--bg3` `--dim` Manrope ; doc système : cellules 13/15 px, bordures `--border`, première colonne `--text` ; mobile : défilement horizontal avec `scrollbar-color: var(--glacier) var(--bg3)`.
- `.hlbox/.warnbox` : `--bg2`, bordure gauche 2 px aurore / or (polar) ; legacy : rouge `rgba(201,74,74,…)`.
- `.quote` : italique Cormorant 25 px aurore, bordure gauche laiton 1 px (polar) ; legacy 2 px aurore fond `--glow2`.
- `.rsec` : h2 Cormorant 38-56 px, h3 25-33 px, h4 Manrope 13 px 600 bordure gauche aurore, paragraphes `14px/1.85 max-width:82ch`.

### 6.9 Blocs éditoriaux polar

- `.np-eyebrow` : 10 px .13em uppercase aurore, séparateur `/` laiton.
- `.np-section-heading` : h2 12 px 500 + numéro monospace laiton `01/02/03`, filet bas.
- `.np-logbook-heading` : h1 « L'aventure continue*.* » (point aurore `.np-title-stop`), accueil « Bonjour, <pseudo>. » + « Ton personnage, tes rendez-vous, la suite de ton histoire. » (staff : « Retrouve les récits et les rendez-vous du serveur. »), sceau 104 px.
- `.np-logbook-stats` : joueur `Niveau / Combats archivés / Gemmes en réserve / Rendez-vous` ; staff `Personnages / Comptes actifs / Combats archivés / Rendez-vous` (`main.js:8173-8182`).
- `.np-character-card` : portrait 98×112 en arche, initiale Cormorant 50 px aurore, nom 35 px, serment 10 px .12em or, bouton primaire pleine largeur.
- `.np-explore-links` : liste de liens 68 px, séparés par filets, titre 12 px + note 10 px, hover aurore.
- Fiche : hero avec l'illustration en filigrane (`opacity:.15`, `polar-sheet.css:6`), kicker « … » 10 px .13em, nav 4 chapitres (`grid 4`, chiffres Cormorant 20 px aurore, soulignement 2 px), marque de chapitre Cormorant 54 px `--border2`.
- Agenda : intro `1fr / 240px` avec index bordé (cadre intérieur `inset:6px`), cartes `94px / 1fr / 180px` bordure gauche 2 px typée, participants en chips, actions en colonne bordée à gauche.
- Compte : onglets soulignés (`.settings-tab.active` aurore), identité + export côte à côte, panneaux numérotés (Cormorant 24 px aurore), zone danger séparée par un filet.

---

## 7. Ce qui est réussi visuellement (à préserver)

1. **L'accueil Mystique polaire** dans son ensemble : rythme éditorial, hero avec paysage original, typographie Cormorant/Manrope, chiffres honnêtes, sections numérotées, citations laiton, colophon sobre. C'est la meilleure expression de « compagnon de jeu » et non de jeu.
2. **Le trio de couleurs encre / aurore / laiton** et les quatre niveaux de surfaces mates, sans dégradé ni halo.
3. **Le principe « couleurs sémantiques fixes »** : PV rouge, EP or, EM glacier, XP vert, statuts, types d'événement, comportements et dangerosité des créatures, rôles ; cohérent depuis le début et documenté.
4. **La signature typographique** : grands titres Cormorant serrés (`-.02/-.045em`, interlignage < 1.1), petits repères Manrope espacés, chiffres en lining/tabular nums, italique Cormorant réservé aux citations.
5. **Les composants polar** : boutons 44 px bordés sans effet, champs 44-48 px, cartes sans ombre avec filet supérieur coloré pour les vedettes, listes séparées par des filets plutôt que des cartes, blocs calendrier, portrait en arche, chips à angle 2 px.
6. **L'emblème boussole** comme signature (favicon, wordmark, sceau, orbite des Serments) et sa recoloration selon le thème.
7. **Le thème de base recoloré partout via les variables** (`applyVars`) : les écrans non refondus héritent au moins de la palette polar.
8. **Les ambiances des thèmes rares** (météores Galactique, sous-bois Sylvan, lune BloodMoon, rayures Aquaris) : elles ont une identité forte et sont appréciées ; elles doivent survivre, mais comme **couches optionnelles** au-dessus d'un squelette commun.
9. **Les libellés de la collection** (Équipé / Possédé / À débloquer / Indisponible / Thème actif / Équiper) et la sélection au clavier.
10. **Le test de contraste des thèmes** (ratio ≥ 3:1 bouton primaire) comme exigence.
11. **Accessibilité** : skip-link, focus 2 px, reduced-motion, cibles 44 px, `color-scheme`.

## 8. Ce qui est faible (halos, empilement, incohérences)

1. **Deux identités concurrentes** dans le même document : 5 550 lignes de CSS legacy bleu + 15 blocs de patch + 1 250 lignes de CSS moteur + 8 feuilles polar qui les annulent à coups de `!important` (2 200 occurrences au total). Toute nouvelle page part du legacy et doit être « repolarisée ».
2. **Halos, verre et dégradés omniprésents** dans les couches legacy/moteur/polish : `--tm-card-bg` dégradés blancs, `box-shadow` 28-54 px, `backdrop-filter blur`, rayons 18-28 px, `text-shadow` sur les titres (`connected-pages-polish.js:52`), pills 999 px, `.theme-card-premium` avec `color-mix` et translation. La charte les proscrit explicitement (l. 36).
3. **Le mode clair et tous les thèmes non-base sont restés « Nuit glaciaire »** : leurs surfaces (`theme-max.js:222-249`, `370-398`), leurs chips et leurs boutons primaires en dégradé ne suivent pas les règles polar ; la charte dit « les thèmes personnels gardent leurs couleurs, avec une structure et une typographie communes » — la structure commune n'existe pas encore.
4. **Emblèmes et exports en bleu legacy** : favicon `#7eb8d4`, `.login-emblem`, overlay de transition, brumes de connexion violettes `#c084d4`, palette du PDF (`main.js:16015-16016`), valeurs par défaut du formulaire de thème (`#0d0e18/#7eb8d4/#c9a84c`).
5. **Polices** : Google Fonts (Cinzel, Crimson Pro, JetBrains Mono) encore préchargées à distance alors que les woff2 locaux existent ; Cinzel chargée deux fois ; JetBrains Mono sans licence dans le dépôt ; `--fh` référencé mais jamais défini.
6. **Métadonnées de thèmes en triple** (CONFIG, THEMES_BASE/EVENT, THEME_CANON_META, DB) avec noms différents (« Printemps Éveillé » vs « Pâques enchantées », « Nuit des Âmes » vs « Veille d'Halloween », « Veillée Hivernale » vs « Noël en fête », « Lune de Sang » vs « BloodMoon », « Aquaris » vs « Aquaris — Royaume englouti ») et catégories différentes (« Événement » vs « Saisonniers ») ; réconciliées par mutation au boot.
7. **Moteur v257 intrusif** : `MutationObserver` global sur `class/style/data-*` + `setTimeout` en rafale, `wrapRenderers` qui monkey-patche `applyTheme`, `renderThemeGrid`, `renderDB`… ; détection de thème par **texte de la carte** (`detectCardTheme`, mots « pâques », « vert », « claire »…) ; sélecteurs `[style*="background:rgba(7,8,16"]` pour recolorer des styles inline (`theme-max.js:313-387, 1339-1387`).
8. **Bouton « Débloquer » mort** : l'action serveur est désactivée (403) ; les états `available` / « À débloquer » et la fonction `unlockTheme` trompent le joueur.
9. **Thèmes custom admin sans CSS** : un thème créé n'a que trois couleurs de preview et une classe vide.
10. **Hero de collection injecté par le moteur** (stats, progression, filtres, tri, « Secret scellé ») : vocabulaire de jeu en ligne (« construis ta galerie », « progression de collection »), doublon avec la page compte polar, probablement inactif.
11. **Double définition de plusieurs composants** : `.card` (l. 266 puis 1150), `.btn` (116 puis 1188), `.bar/.bf/.bpv` (287-292 puis 1837-1852, avec PV vert puis rouge), `.sl/.sv`, `.hdr-badge.role-*` (417-420 puis 544-546), `.nav-sep` (262 puis 448), CSS cassé (`index.html:44-49, 60-63, 87, 90` « removed light residue », `:376 .pal` orphelin, `:411` déclaration `.hlbox` fusionnée avec `.statut-remove:hover`).
12. **Ancien accueil « Mac premium pass »** (`index.html:7653-7925`, étoiles, fog, `.home-title` 96 px letter-spacing 14 px, `.home-footer-*`) toujours présent bien que l'accueil ait été remplacé ; `visual-audit-polish.js:56-90` le stylise encore.
13. **Écrans « jeu en ligne » stylés dans la même feuille** : simulateur (`.sim-*`), prototype RPG (`rpg-prototype.js` injecte son CSS), apparitions (`.spw-*`), Bestiaire admin — ils polluent toutes les listes de sélecteurs du moteur et des polishes.
14. **Rayons contradictoires** : tokens `--r-1:2px / --r-2:4px` (« sharp = 0, soft = 2px only ») contre 12-28 px dans les couches supérieures, et 999 px pour les pills.
15. `scroll-padding-top` fixé à 30 px en polar (`polar-identity.css:18`) contre 88 px legacy ; `.np-sheet-chapter{scroll-margin-top:104px}`.

---

## 9. Licences

| Ressource | Licence | Fichier | Remarque |
|---|---|---|---|
| Cinzel (`cinzel-latin.woff2`) | SIL Open Font License 1.1 — © 2020 The Cinzel Project Authors (github.com/NDISCOVER/Cinzel) | `assets/fonts/OFL-Cinzel.txt` | OK, vendorisée |
| Cormorant Garamond (`cormorant-garamond-latin.woff2`, `-italic-latin.woff2`) | SIL OFL 1.1 — © 2015 the Cormorant Project Authors (github.com/CatharsisFonts/Cormorant) | `assets/fonts/OFL-Cormorant-Garamond.txt` | OK, vendorisée ; sous-ensemble latin avec œ/Œ (charte l. 30) |
| Manrope (`manrope-latin.woff2`) | SIL OFL 1.1 — © 2018 The Manrope Project Authors (github.com/googlefonts/manrope) | `assets/fonts/OFL-Manrope.txt` | OK, vendorisée |
| Crimson Pro, JetBrains Mono | OFL (chez Google Fonts) | aucun fichier local | chargées à distance par `index.html:17-18` ; à supprimer ou vendoriser avec leur OFL |
| jsPDF 4.2.1 (`jspdf.umd.min.js`, 420 Ko) | **MIT** — © 2010-2025 James Hall, © 2015-2025 yWorks GmbH | `assets/vendor/jspdf/LICENSE`, `NOTICE.md` (SHA-256 `e6551fcd…20d54`, source `parallax/jsPDF v4.2.1`, publiée 2026-03-17) | chargée à la demande uniquement pour l'export PDF de la fiche (`main.js:15974-15992`), même origine, pas d'exception CSP ; les notices des dépendances embarquées restent dans la distribution |
| Illustration `nuages-polaires-horizon.jpg` | générée par le propriétaire avec « Imagegen intégré » (charte l. 72-84, prompts conservés) | — | pas de licence tierce ; originaux PNG hors dépôt |
| Emblème `favicon.svg` et SVG inline | création interne | — | — |

---

## 10. Questions ouvertes

1. **Nom canonique des thèmes** : `theme-max.js` (« Pâques enchantées », « Veille d'Halloween », « Noël en fête », « BloodMoon », « Aquaris — Royaume englouti ») ou `main.js` (« Printemps Éveillé », « Nuit des Âmes », « Veillée Hivernale », « Lune de Sang », « Aquaris ») ? Les notifications (`unlockTheme`, dons admin) utilisent `t.name`, réécrit au boot par theme-max : les libellés theme-max sont ceux vus en production, mais les libellés main.js sont plus littéraires et plus proches du lore.
2. **Catégorie des saisonniers** : « Saisonniers » (theme-max) ou « Événement » (canon main.js) ?
3. **Le hero/toolbar de collection injecté par le moteur** est-il visible dans la page compte polar actuelle (aucun conteneur `.theme-collection/.collection-section` n'est rendu par `renderAppearanceSection`) ? À vérifier en navigateur avant de décider de le conserver.
4. **Mode clair** : faut-il une palette claire « Mystique polaire » (non définie par la charte), ou conserver le bleu/or legacy ? Même question pour les thèmes rares : leurs couleurs sont-elles figées (les joueurs les possèdent) ou peuvent-elles être réaccordées à la structure polar ?
5. **Déblocage par le joueur** : la voie `self_unlock_theme` est désactivée ; l'intention est-elle définitivement « don admin / auto-distribution seulement » ? Dans ce cas les états « À débloquer » / « Débloquer » disparaissent.
6. **Thèmes custom admin** : conserver la création de thèmes événement (avec un vrai rendu à partir de 3 couleurs) ou limiter le catalogue à une liste codée ?
7. **Emblème** : recolorer le favicon et les SVG de connexion en aurore/laiton (cohérence) ou garder le bleu comme « signature historique » ?
8. **`--gold` variable par thème** (= `accentBright`) : est-ce voulu que l'or des Serments/staff devienne cyan en Galactique ou rose en Pâques, ou l'or doit-il rester `#c6b38b` partout ?
9. Le **prototype RPG** (`rpg-prototype.js`, bouton du colophon, `.rpg-nav-btn`) et le **simulateur** (`.sim-*`) sont hors périmètre du compagnon : leurs styles doivent-ils disparaître totalement de la couche commune ?
10. `theme-red` / preview `red` : vestige à supprimer, ou un thème « Écarlate » est-il attendu ?

---

## 11. Ce qu'il faut absolument préserver dans l'overhaul

1. **La charte Mystique polaire** telle quelle : palette nommée (§2.1), typographie Cormorant/Manrope (Cinzel optionnel pour de rares repères), principes « panneaux mats, angles discrets, séparateurs fins, pas de halos, pas de verre, pas de groupes de boutons arrondis sans hiérarchie, grandes images pour la découverte / données pour le jeu », `theme-color #091519`, sélection `#95cdbb40`.
2. **Le contenu et la structure de l'accueil public** (§5) : textes exacts, ordre des sections, hero avec `nuages-polaires-horizon.jpg` (nature seule, sans constructions — précision de lore du propriétaire), cinq métriques réelles sans faux compteur en ligne, tous les CTA vers le règlement, note « Comment commencer ? », coordonnée « NP / 01 — APRÈS LE BASCULEMENT », légende « Le monde n'est pas mort. Il attend. » — **sans** le bouton RPG.
3. **Les fichiers de polices locaux et leurs licences OFL**, le préchargement des deux woff2 principaux, `font-display:swap`.
4. **L'emblème boussole** (fichier `favicon.svg` + géométrie) et ses usages : favicon, wordmark, sceau du carnet, orbite des Serments, logo cliquable du header (retour accueil + rotation), recoloration par thème.
5. **Les couleurs sémantiques et leurs libellés** (§2.4) : jauges PV/EP/EM/XP, 12 statuts, 5 types d'événement, 13 couleurs de Serment, 5 comportements, 5 dangerosités, gemmes, rôles, notifications ok/err/inf.
6. **Le catalogue des 9 thèmes** avec leurs id, labels, taglines, descriptions, palettes `colors`/`vars`, `pageBg`, tone, dates `availableUntil` (1er mai 2026, 2 nov. 2026, 6 janv. 2027, 0 pour BloodMoon), signature « Lune de sang », alias d'id (`aquarius`, `blood-moon`, `lune-de-sang`, `theme-…`, `red→dark`), et **les ambiances** (météores, étoiles, sous-bois, lune, neige, rayures) comme couches optionnelles respectant `prefers-reduced-motion`.
7. **Les règles d'attribution** (§3.3) : `dark`/`light` toujours accordés ; visibilité admin par thème (`theme_visibility`), don individuel/à tous/auto-distribution, blocage, révocation qui remet `dark`, possession définitive même après expiration, staff qui voit tout, persistance `selectedTheme` côté compte + `np_theme` local ; formes JSON `unlockedThemes/blockedThemes/selectedTheme`, `event_themes`, `theme_visibility`.
8. **Les états et libellés de la collection** : Équipé / Possédé / Indisponible ; Thème actif / Équiper / Non disponible ; carte `role=button` navigable au clavier ; grille 3/2/1 ; vocabulaire admin (« Toujours visible », « Donner », « Donner à tous », « Auto tous », notifications).
9. **Les composants polar** (§6) et leurs mesures : header 78 px, boutons/champs 44 px, cartes bg2 + bordure 1 px + rayon 3-4 px + filet supérieur 2 px pour les vedettes, listes à filets, chips à 2 px, bloc calendrier, portrait en arche, stats en colonnes séparées, eyebrows 10 px .13em, numéros de section laiton, H1 Cormorant `clamp(40px,4.7vw,62px)`.
10. **Les tokens d'espacement/rayon legacy pertinents** : échelle 4-48 px, rayons 0/2/4 px, transitions `.12/.2/.35s`, échelle de z-index ; les gabarits 1320/1200/1180 px.
11. **Accessibilité** : skip-link, focus aurore 2 px offset 2-4 px, cibles 44 px, reduced-motion, `color-scheme`, contrastes des petits libellés en ton clair, `alt` descriptif de l'illustration, `aria-pressed/aria-label` des cartes de thème, `scroll-margin-top` des chapitres.
12. **Le principe du test de contraste** (≥ 3:1 accent/texte primaire par thème) et un contrôle visuel des trois palettes (sombre, clair, violet) à 1440/768/390 px comme le faisaient les suites Chromium (`charte:68-70`).
13. **jsPDF vendorisé (MIT) chargé à la demande** avec `NOTICE.md` et SHA — mais avec la palette polar.

## 12. Ce qui relève de la dérive / dette

1. Les 5 550 lignes de `<style>` de `index.html` et les 15 blocs `<style id>` de patch (v99 → v240) : à ne pas reprendre ; ne garder que les valeurs sémantiques et les tokens listés ici.
2. `theme-max.js` v257 en tant que mécanisme (injection CSS runtime, `MutationObserver` global, monkey-patching, détection par texte, recoloration de styles inline) : à remplacer par des thèmes déclaratifs (un jeu de variables par `data-theme`) ; ne conserver que `CONFIG` comme données.
3. Les scripts de polish (`connected-pages-polish`, `mobile-polish`, `visual-audit-polish`, `database-admin-polish`, `finish-audit`, `ui-patches`, `home-readability-polish` non chargé) : dette pure ; leurs rares apports utiles sont déjà repris par les CSS polar (44 px, 16 px sur mobile, overflow).
4. L'ancien accueil « Mac premium pass » (`index.html:7653-7925`), `.home-*`, brumes `.home-fog`, ligne d'horizon, canvas de particules de connexion, overlay de transition à flash bleu, animations `logoIn/cardIn/fadeUp`, œufs de Pâques tombants : à supprimer.
5. Google Fonts distant (Cinzel doublon, Crimson Pro, JetBrains Mono), `--fh` non défini, `--fm` monospace pour les valeurs (remplacer par Manrope tabulaire).
6. Hero/toolbar/progression de collection du moteur, « Secret scellé », pills de rareté 999 px, preview `red`, `THEMES_EVENT_BUILTIN` en double, `THEME_CANON_META`, `getThemeCanonMeta`, `renderThemeCollectionPremium` de `ui-patches.js`.
7. Bouton « Débloquer » / `unlockTheme` / `self_unlock_theme` (désactivé) ; thèmes custom sans CSS ; drapeaux `earlyClouds*` sans usage.
8. Palette bleue résiduelle : favicon, `.login-emblem`, overlay, PDF, formulaire admin, `--tm-*` par défaut, `:root` legacy, `--np-focus-ring rgba(126,184,212,…)`, `select` chevron bleu.
9. Tous les styles des écrans « jeu en ligne » : prototype RPG (`rpg-prototype.js`, `.rpg-nav-btn`, bouton du colophon), simulateur de combat (`.sim-*`), apparitions (`.spw-*`), carte explorable — hors périmètre du compagnon.
10. `!important` généralisé, sélecteurs `:where(...)` de 40 classes, `[style*="…"]`, `color-mix` décoratifs, `backdrop-filter`, `text-shadow`, rayons 18-28 px, ombres 40-80 px.
11. Incohérences de libellés (Événement/Saisonniers, noms de thèmes), doubles définitions CSS, règles cassées (`removed light residue`, `.pal`, `.hlbox`), `scroll-padding-top` divergents.
