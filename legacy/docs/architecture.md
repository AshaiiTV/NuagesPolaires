# Architecture front / Netlify

## Vue générale

Le site est principalement une application front statique avec fonctions Netlify.

```txt
index.html
assets/js/
netlify/functions/
docs/
```

## Modules front principaux

- `main.js` : noyau historique.
- `theme-max.js` : moteur de thèmes consolidé.
- `home-readability-polish.js` : lisibilité home + thème de base.
- `api-hardening.js` : protection erreurs DB/Auth.
- `diagnostics.js` : diagnostics DB/Auth.
- `site-self-test.js` : self-test admin.
- `admin-dashboard.js` : dashboard admin + console technique.
- `theme-regression.js` : tests anti-régression thèmes.
- `staff-navigation.js` : navigation Staff.
- `connected-pages-polish.js` : polish pages connectées.
- `mobile-polish.js` : polish mobile.
- `database-admin-polish.js` : polish Database admin.

## Fonctions Netlify

- `netlify/functions/auth.js`
- `netlify/functions/db.js`

## Règle importante

Avant refactor important :

```bash
npm run check
```

Puis test manuel :

- login admin ;
- dashboard admin ;
- database ;
- thèmes ;
- mobile.
