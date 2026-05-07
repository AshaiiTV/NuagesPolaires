# Versioning

Format conseillé :

```txt
vXXX - description courte
```

Exemples :

```bash
git commit -m "v275 - git ready"
git commit -m "v276 - database mobile fixes"
```

## Avant chaque commit

```bash
npm run check
git status
```

## Après chaque push

Vérifier le deploy Netlify et tester la connexion admin.
