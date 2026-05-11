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

### `NP_SITE_URL`

URL publique du site.

Exemple :

```txt
https://nuages-polaires.netlify.app
```

## Variables de récupération admin

### `NP_ADMIN_PSEUDO`

Pseudo du compte admin à créer si la base ne contient encore aucun admin.

### `NP_ADMIN_PASSWORD`

Mot de passe temporaire de ce compte admin. Il doit faire au moins 8 caractères.

Ces deux variables servent uniquement au bootstrap : si un admin existe déjà, elles ne changent pas son mot de passe. Après connexion, change le mot de passe depuis l'interface puis supprime `NP_ADMIN_PASSWORD` des variables Netlify.

### `NP_ADMIN_RECOVERY`

Valeur optionnelle : `true`.

À utiliser seulement si un compte admin existe déjà mais que son mot de passe est perdu. Avec `NP_ADMIN_RECOVERY=true`, le compte `NP_ADMIN_PSEUDO` est promu admin et son mot de passe devient `NP_ADMIN_PASSWORD` au prochain login.

Le recovery est consommé une fois par couple pseudo/mot de passe temporaire pour éviter que le backend réinitialise le compte à chaque tentative. Supprime ensuite `NP_ADMIN_RECOVERY` et `NP_ADMIN_PASSWORD`.

## Fichier `.env.example`

Le fichier `.env.example` est commit uniquement comme modèle.
