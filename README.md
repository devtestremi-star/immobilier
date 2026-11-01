# Maison

Suivi des annonces immobilières (achat / location) : filtres cumulables, carte, notes de 1 à 10, coups de cœur et commentaires partagés, tableau de bord.

Stack : Next.js 16, Prisma 7 + Neon (Postgres), MapLibre + tuiles OpenFreeMap, géocodage geo.api.gouv.fr. Hébergé sur Vercel.

## Démarrer en local

```bash
pnpm install          # génère aussi le client Prisma et copie le worker MapLibre dans public/
pnpm dev
```

Le fichier `.env` doit contenir les variables Neon et `ENV_PW`, le mot de passe d'accès au site (voir `.env.example`).
Sans `ENV_PW`, le site reste bloqué.

## Base de données

```bash
pnpm db:migrate       # applique / crée les migrations (connexion directe DATABASE_URL_UNPOOLED)
pnpm db:check [f.csv] # vérifie un CSV sans rien écrire : nouvelles annonces / déjà présentes / prix modifiés
pnpm db:seed [f.csv]  # ajoute les nouvelles annonces (sans fichier : tout le dossier CSV/), garde les notes
pnpm db:studio        # explorer les données
```

Le géocodage par code postal + ville est mis en cache dans `prisma/geocode-cache.json`.
La liste des annonces est mise en cache 1 h côté serveur : après un nouvel import, redéployer (ou attendre) pour la voir.
