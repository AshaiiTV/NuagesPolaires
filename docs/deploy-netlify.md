# Déploiement Netlify

## 1. Importer le repo GitHub

Netlify → Add new site → Import an existing project → GitHub.

## 2. Paramètres de build

Build command :

```bash
npm run check
```

Publish directory :

```txt
.
```

## 3. Variables d'environnement

Dans Netlify → Site configuration → Environment variables :

```txt
NETLIFY_DATABASE_URL
NP_JWT_SECRET
SITE_ORIGIN
```

## 4. Déploiement

Chaque `git push` sur `main` déclenche un deploy Netlify.

## 5. Vérification après deploy

- Ouvrir le site.
- Tester la connexion admin.
- Aller dans `Staff → Tableau de bord`.
- Lancer :
  - Diagnostic DB/Auth
  - Test complet
  - Tester les thèmes

## 6. En cas d'erreur admin login

Vérifier :

- `NP_JWT_SECRET` présent et >= 32 caractères.
- `NETLIFY_DATABASE_URL` correct.
- Le site utilise bien une version >= v274.
