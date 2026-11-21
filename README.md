# WILDIA TCG

TCG digital d’animaux : collectionne des espèces réelles, ouvre des boosters et farme des pièces — même hors ligne.

Stack : **Next.js** (App Router) · **Supabase** · **next-intl** (FR / EN).

---

## Fonctionnalités

- **Catalogue** — cartes d’animaux réels, filtrables par rareté (commune → mythique)
- **Boosters** — packs de 5 cartes, tirage serveur et révélation carte par carte
- **Classeur** — collection personnelle, tri par rareté / nom / quantité
- **Économie** — farm passif de pièces selon les cartes possédées (crédité à chaque visite)
- **Profil joueur** — bio, bannière, carte vitrine ; profil public ou privé
- **Rareté UICN** — la rareté reflète le statut de conservation réel de l’espèce
- **i18n** — interface en français et en anglais (`/fr`, `/en`)
- **Auth** — inscription / connexion via Supabase Auth

---

## Prérequis

- Node.js **24** (version exacte dans `.nvmrc` : `nvm install`)
- Un projet [Supabase](https://supabase.com)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (fournie via `devDependencies`)

---

## Installation

```bash
git clone https://github.com/<ton-org>/wildia-tcg.git
cd wildia-tcg
cp .env.example .env.local
npm install
```

### Variables d’environnement

Renseigne `.env.local` (clés dans le dashboard Supabase → **Settings → API**) :

| Variable | Rôle |
|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon (client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role (serveur uniquement) |
| `ENABLE_DEV_GRANTS=true` | *(optionnel)* active `/dev/grants` pour s’attribuer des cartes en local |
| `PIXABAY_API_KEY` | *(scripts d’import)* |
| `CARD_IMPORT_CONTACT` | *(scripts d’import)* contact User-Agent Wikimedia |

Voir `.env.example` pour la liste complète (Stripe prévu en option).

### Base de données

```bash
npx supabase link --project-ref <ton-project-ref>
npm run db:migrate
```

Les migrations créent notamment `profiles`, `cards`, `card_translations`, le ledger économique, les boosters / `draw_logs`, et le bucket Storage `card-art`.

Détails sécurité : [`docs/security.md`](docs/security.md).

### Base locale (dev)

En dev, l’app tourne sur un Supabase local (Docker) pour ne jamais toucher la prod :

```bash
npx supabase start        # API sur http://127.0.0.1:55321, Studio sur http://127.0.0.1:54323
npm run db:reset          # recrée la base locale depuis les migrations
npm run db:pull-cards     # copie le catalogue de cartes de la prod (lecture seule) vers le local
```

- `.env.local` pointe sur le local (`npx supabase status -o env` donne l’URL et les clés).
- Les clés de prod sont dans `.env.prod`, qu’aucun outil ne charge automatiquement.
  Publier des cartes en prod : `npx tsx --env-file=.env.prod scripts/cards/publish.mts`.
- L’API locale est sur le port 55321 (54321 est souvent pris, par exemple par CleanMyMac).
- Les e-mails d’auth arrivent dans Mailpit : http://127.0.0.1:54324.
- `npm run db:migrate` est la seule commande qui écrit en prod.

### Lancer l’app

```bash
npm run dev
```

Ouvre [http://localhost:3000/fr](http://localhost:3000/fr) (ou `/en`).

---

## Scripts

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build production |
| `npm run start` | Serveur production |
| `npm run lint` | ESLint |
| `npm run typecheck` | Vérification TypeScript |
| `npm test` | Tests unitaires (Vitest) |
| `npm run test:integration` | Tests d’intégration |
| `npm run db:migrate` | Appliquer les migrations (`supabase db push`) |
| `npm run db:reset` | Reset local de la base |
| `npm run db:pull-cards` | Copie le catalogue de cartes de la prod vers la base locale |
| `npm run cards:build` | Pipeline d’import / images / review / webp des cartes |

Import de cartes : [`docs/card-import.md`](docs/card-import.md).

---

## Structure du projet

```
app/[locale]/     # Routes i18n (/fr, /en)
components/         # UI React
lib/                # Domaine pur (types, règles, validation) — pas de Supabase
server/             # Use cases et accès données (seul consommateur Supabase côté app)
supabase/migrations # SQL versionné
docs/               # Architecture, économie, sécurité, tests…
scripts/cards/      # Pipeline d’import des cartes
```

Conventions pour une future migration Nest + Postgres : [`docs/architecture.md`](docs/architecture.md) (vérifiées par ESLint).

Autres docs utiles :

- [`docs/economy.md`](docs/economy.md) — ledger, farm, sync
- [`docs/rate-limiting.md`](docs/rate-limiting.md)
- [`docs/admin.md`](docs/admin.md) — créer le premier super administrateur
- [`docs/testing.md`](docs/testing.md)

---

## Branches

- `main` = la **prod**. On n’y pousse jamais directement.
- `dev` = la branche d’intégration. Chaque changement part de `dev` et y revient par une PR, avec la CI verte.
- Mise en prod = une PR `dev` → `main`.

```bash
git switch dev && git pull
git switch -c feat/ma-modif
# … commits …
gh pr create --base dev
```

Toutes les PR sont annoncées sur Discord, PR empilées comprises ; une fusion dans `main` est annoncée comme une mise en prod (`.github/workflows/discord-pr.yml`).

---

## Déploiement (Vercel)

1. Importer le repo sur Vercel
2. Configurer les variables de **Production** et **Preview** (voir `.env.example`)
3. Déployer — les migrations restent gérées via `npm run db:migrate` / Supabase CLI

---

## Licence

Projet privé pour l’instant (`"private": true`).
