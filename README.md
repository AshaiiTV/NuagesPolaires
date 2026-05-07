# Nuages Polaires

Site web / portail staff pour **Nuages Polaires**.

Version actuelle préparée pour Git : **v275 Git Ready**  
Base fonctionnelle : **v274 — fix connexion admin**

## Contenu principal

- `index.html` : application front principale.
- `assets/js/` : modules front.
- `netlify/functions/` : fonctions serveur Netlify.
- `docs/` : documentation technique.
- `VERSION.txt` : résumé de version.

## Installation locale

```bash
npm install
npm run check
```

## Variables Netlify nécessaires

Les secrets ne doivent jamais être commit.

À configurer dans Netlify :

```txt
NETLIFY_DATABASE_URL
NP_JWT_SECRET
SITE_ORIGIN
```

`NP_JWT_SECRET` doit faire au moins 32 caractères.

## Déploiement Netlify

Build command recommandé :

```bash
npm run check
```

Publish directory :

```txt
.
```

## Workflow Git recommandé

```bash
git status
npm run check
git add .
git commit -m "v275 - git ready"
git push
```

## Notes importantes

- Ne jamais commit `.env`.
- Ne jamais mettre l'URL Neon réelle dans Git.
- Toujours lancer `npm run check` avant un commit.
- La v274 corrige un bug critique de connexion admin dans `api-hardening.js`.
