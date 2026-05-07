# Git workflow

## Premier push

```bash
git init
git add .
git commit -m "v275 - git ready"
git branch -M main
git remote add origin https://github.com/TON-PSEUDO/TON-REPO.git
git push -u origin main
```

## Workflow normal

```bash
npm run check
git add .
git commit -m "v276 - description"
git push
```

## Ne jamais commit

- `.env`
- vraies variables Neon
- secrets JWT
- dossiers `node_modules/`
- `.netlify/`
