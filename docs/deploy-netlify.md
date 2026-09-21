# Préparer la mise en ligne — v290

La préparation locale n'effectue aucun déploiement. Le contrat API versionné doit être livré avec les fichiers front de la même version.

## Contrôles locaux

```bash
npm ci
npm run build
npx playwright install chromium
npm run test:browser
```

La configuration `netlify.toml` utilise Node 24, la commande `npm run build`, le dossier publié `dist/` et les fonctions `netlify/functions/`. Les tests, sources serveur et documents ne sont pas copiés dans le site statique. Le build exécute les tests serveur et SQL locaux ; Chromium constitue une recette supplémentaire.

## Environnement

Définir `NETLIFY_DATABASE_URL`, `NP_JWT_SECRET` et `NP_SITE_URL`. L'origine doit correspondre à l'URL réelle, et à l'URL de recette lors d'un test sur environnement isolé. Vérifier également toute surcharge `AWS_LAMBDA_JS_RUNTIME` déjà présente dans le dashboard : le dépôt cible Node 24.

## Sauvegarde et récupération

Avant de remplacer une version utilisée, conserver une sauvegarde PostgreSQL indépendante et vérifier sa restauration sur une base isolée. L'export JSON de l'interface ne contient pas tous les stores ni les mots de passe. Sur chaque navigateur utilisé historiquement, récupérer aussi les archives de combat locales : la v290 les conserve en quarantaine et affiche une option de téléchargement au propriétaire connecté. Vérifier le fichier téléchargé avant de confirmer l’effacement local.

Si aucun admin n'existe, `NP_ADMIN_PSEUDO` et `NP_ADMIN_PASSWORD` permettent le bootstrap au prochain login. Si un admin existe mais que son accès est perdu, ajouter `NP_ADMIN_RECOVERY=true` avec un **nouveau** mot de passe temporaire d'au moins huit caractères. Se connecter, terminer le reset dans l'heure, puis retirer les variables temporaires. Un couple pseudo/mot de passe déjà consommé ne déclenche pas une deuxième récupération.

Les anciens comptes forcés à changer leur mot de passe sans échéance valide devront recevoir une nouvelle réinitialisation. Le mot de passe partagé historique `reset` n'est plus un parcours de récupération accepté.

## Recette sur une base isolée

Tester admin, MJ, designer, joueur lié et compte en attente ; vérifier journal/avatar, XP, combat, plus de 50 archives, conflit de deux sessions et import partiel. Vérifier qu'un ancien cookie est refusé après changement de mot de passe et que les créatures masquées restent visibles pour le staff, mais absentes des réponses publiques.

Le script existant `npm run test:auth` contacte une URL fournie et **crée un compte** sur cette cible. Il ne fait pas partie des tests locaux par défaut. Réserver son usage à une cible explicitement choisie :

```bash
NP_TEST_BASE_URL=https://votre-site-de-recette.netlify.app npm run test:auth
```

La configuration Git/Netlify réelle et le déclenchement automatique sur push doivent être vérifiés dans le projet connecté avant publication. Aucun push n'est requis pour les contrôles locaux.
