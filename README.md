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
- **Auth** — inscription / connexion par e-mail, Google ou Discord (Supabase Auth)

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
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`, `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` | *(Supabase CLI, local seulement)* dans `supabase/.env`, pas dans `.env.local` |
| `SUPABASE_AUTH_EXTERNAL_DISCORD_CLIENT_ID`, `SUPABASE_AUTH_EXTERNAL_DISCORD_SECRET` | *(Supabase CLI, local seulement)* dans `supabase/.env`, pas dans `.env.local` |

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

### Fournisseurs OAuth (Google, Discord)

Étapes détaillées, checklist de recette et dépannage : [`docs/oauth-providers.md`](docs/oauth-providers.md).

**En local.** Créer une application Google (client « Application Web ») et une application Discord, avec l’URI de redirection `http://127.0.0.1:55321/auth/v1/callback`. Mettre les quatre variables `SUPABASE_AUTH_EXTERNAL_{GOOGLE,DISCORD}_{CLIENT_ID,SECRET}` dans `supabase/.env` (ignoré par git, lu par la CLI Supabase seule ; un export dans le shell marche aussi), puis `npx supabase stop && npx supabase start`. Les deux fournisseurs sont déjà activés dans `supabase/config.toml`, Google avec `skip_nonce_check = true` (requis en local). Tester « Continuer avec Google » ou « … Discord » sur `http://localhost:3000` ou `http://127.0.0.1:3000`.

**En production.** Pas de fichier : les secrets sont saisis dans le dashboard Supabase (**Authentication → Sign In / Providers**), avec des applications Google et Discord distinctes de celles du local, et jamais dans Vercel. Avant d’activer : `npm run db:migrate` (garde d’identité). Dans **URL Configuration** : Site URL `https://<hôte-prod>`, Redirect URLs `https://<hôte-prod>/*/auth/callback**` et `https://<hôte-prod>/*/auth/confirm**` (un callback ou un lien de confirmation est accepté si son hôte est celui de la Site URL ou s’il est dans cette liste ; jamais d’autre hôte). Les aperçus Vercel ne gèrent pas OAuth.

URI de redirection à déclarer :

| | Chez le fournisseur (Google, Discord) | Callback de l’app (`fr` et `en`) |
|---|---|---|
| Local | `http://127.0.0.1:55321/auth/v1/callback` | `http://localhost:3000/{fr,en}/auth/callback`, `http://127.0.0.1:3000/{fr,en}/auth/callback` |
| Production | `https://<project-ref>.supabase.co/auth/v1/callback` | `https://<hôte-prod>/{fr,en}/auth/callback` |

Si ça ne marche pas :

- Google `redirect_uri_mismatch` ou `invalid_client` : URI de redirection absente ou différente, ou secret faux.
- Retour sur l’accueil, déconnecté, avec `?code=` : l’hôte du callback n’est pas celui de la Site URL ni dans la liste (`additional_redirect_urls` en local, Redirect URLs en prod). En prod : visiteur passé par un alias `www.`, `*.vercel.app` ou un aperçu.
- JSON brut « provider is not enabled » : fournisseur non activé.
- App sur un autre port que 3000 : sur `127.0.0.1` tout port fonctionne ; sur `localhost:<port>`, ouvrir `http://127.0.0.1:<port>` ou ajouter `http://localhost:<port>/**` à `additional_redirect_urls` en local, sans le committer.

### E-mails de confirmation

L’inscription par e-mail envoie un lien de confirmation ; le lien mène à `/{locale}/auth/confirm` de l’app, qui ouvre la session dans le navigateur qui l’ouvre (lien valable 1 h, usage unique). Le mail est en français ou en anglais selon la langue de l’inscription (`supabase/templates/confirmation.html`, sujet dans `supabase/config.toml`, bloc `[auth.email.template.confirmation]`).

**En local.** Les mails arrivent dans Mailpit (voir plus haut), sans SMTP. Après une modification du modèle ou de `config.toml` : `npx supabase stop && npx supabase start`.

**En production.** `SUPABASE_SERVICE_ROLE_KEY` est requise partout où l’inscription par e-mail tourne, aperçus Vercel compris (elle supprime le compte non confirmé d’une adresse avant de réinscrire). Sans SMTP personnalisé, Supabase n’envoie qu’aux membres de l’équipe du projet, avec une limite horaire très basse : activer « Confirm email » sans SMTP bloquerait toutes les inscriptions. Dans l’ordre :

1. `npm run db:migrate` (suppression des comptes non confirmés, garde d’identité assouplie).
2. Déployer l’app. Tant que « Confirm email » est désactivé, l’inscription connecte tout de suite, comme avant.
3. SMTP, chez le fournisseur de ton choix :
   - **Authentication → Emails → SMTP Settings** : hôte, port, utilisateur, mot de passe, adresse et nom d’expéditeur ;
   - domaine de l’expéditeur avec SPF, DKIM et DMARC ;
   - limite d’envoi du dashboard (**Authentication → Rate Limits**) adaptée au trafic attendu ;
   - **Authentication → Emails → Confirm signup** : copier le sujet de `config.toml` et le corps de `supabase/templates/confirmation.html` (l’hébergé ne lit pas ces fichiers) ;
   - **Minimum interval between emails** (`max_frequency`) à 60 s.
4. Tester le SMTP avec un autre mail (réinitialisation de mot de passe : aucun mail de confirmation n’est envoyé tant que « Confirm email » est désactivé), puis activer **Authentication → Sign In / Providers → Email → Confirm email** **en dernier**, et vérifier tout de suite le français et l’anglais avec deux inscriptions.

Détails sécurité : [`docs/security.md`](docs/security.md).

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
- [`docs/oauth-providers.md`](docs/oauth-providers.md) — activer Google et Discord, checklist de recette
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
2. Configurer les variables de **Production** et **Preview** (voir `.env.example`) ; les `SUPABASE_AUTH_EXTERNAL_*` n’y vont jamais (local : `supabase/.env`, production : dashboard Supabase)
3. Déployer — les migrations restent gérées via `npm run db:migrate` / Supabase CLI

---

## Licence

Projet privé pour l’instant (`"private": true`).
