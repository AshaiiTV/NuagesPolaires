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
NP_SITE_URL
```

Si aucun compte admin n'existe encore dans la base, ajoute aussi temporairement :

```txt
NP_ADMIN_PSEUDO
NP_ADMIN_PASSWORD
```

Le prochain login avec ce pseudo crée/répare le premier admin. Si un admin existe déjà mais que le mot de passe est perdu, ajoute aussi `NP_ADMIN_RECOVERY=true`. Change ensuite le mot de passe depuis le site et supprime `NP_ADMIN_PASSWORD` / `NP_ADMIN_RECOVERY`.

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
- `NP_ADMIN_PSEUDO` et `NP_ADMIN_PASSWORD` présents si la base est neuve ou sans admin.
- `NP_ADMIN_RECOVERY=true` présent temporairement si un admin existe déjà mais que le mot de passe est perdu.
- Le site utilise bien une version >= v274.
