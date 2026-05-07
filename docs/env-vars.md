# Variables d'environnement

## Variables obligatoires

### `NETLIFY_DATABASE_URL`

URL de connexion Neon/Postgres.

Exemple fictif :

```txt
postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
```

Ne jamais commit la vraie valeur.

### `NP_JWT_SECRET`

Secret utilisé pour signer les sessions.

Contraintes :

- minimum 32 caractères ;
- valeur privée ;
- ne jamais commit.

### `SITE_ORIGIN`

URL publique du site.

Exemple :

```txt
https://nuages-polaires.netlify.app
```

## Fichier `.env.example`

Le fichier `.env.example` est commit uniquement comme modèle.
