# Architecture — backend migratable (Nest + Postgres)

Objectif : le front Next reste une coquille UI ; le métier vit dans `server/` et `lib/`. Supabase est un **adaptateur temporaire** (Auth + Postgres + Storage), remplaçable par Nest + Prisma + object storage sans refaire le jeu.

## Couches

| Dossier | Rôle | Futur |
|---------|------|--------|
| `app/`, `components/` | UI, i18n, formulaires | Inchangé |
| `server/actions/` | Transport Next (FormData, `revalidatePath`, `redirect`) | Remplacé par `fetch` vers l’API Nest |
| `server/<domain>/` | Use cases (open pack, grant, queries) | Modules Nest |
| `lib/` | Domaine pur : types, Zod, règles (rareté, farm, tirage) | Package partagé `packages/domain` |
| `lib/supabase/` | Clients Supabase uniquement | Supprimé après migration |
| `supabase/migrations/` | Schéma SQL versionné | Source pour Prisma / migrations Nest |

## Règles obligatoires

1. **Pas de Supabase** dans `app/`, `components/`, ni `lib/` (hors `lib/supabase/`). ESLint bloque ces imports.
2. **Pas de `next/*`** dans `lib/` (hors `lib/supabase/` qui encapsule Next/SSR).
3. **`lib/` n’importe jamais `server/`** — le domaine ne dépend pas du transport.
4. Pages et composants appellent **`server/...`**, jamais `createClient()` Supabase.
5. Auth côté app : type **`SessionUser`** (`lib/auth/session-user.ts`), pas `User` de `@supabase/supabase-js`.
6. Données affichées : types **`lib/cards/types.ts`** (et équivalents), pas la forme brute PostgREST.
7. Métier joueur (inventaire, pièces, boosters) : **uniquement** via `server/` (+ RPC SQL ou service role), jamais depuis le navigateur.
8. **`user_id`** : UUID stable partout ; pas de données métier critiques dans `auth` metadata seule.
9. Images : clé/chemin en base ; URL publique via **`getCardArtPublicUrl`** (demain : base CDN, pas Supabase dans le nom métier).
10. Nouvelle table : migration SQL + mise à jour `docs/security.md` si exposition / RLS.

## Où mettre du code neuf

- Lecture catalogue → `server/cards/queries.ts` (puis repository dédié si le fichier grossit).
- Écriture inventaire → `server/inventory/grant-card.ts` + RPC `grant_card`.
- Ouverture d’un emplacement de la boutique → `openShopSlot` (`server/actions/open-booster.ts`) → `runOpenShopSlot` (`lib/boosters/open-shop-slot.ts`, dépendances injectées) → `openBoosterShopSlot` (`server/boosters/open-pack.ts`) → RPC `open_booster_shop_slot`.
- Chargement d’une ouverture passée par identifiant de tirage → `loadDrawForReveal` (`server/boosters/load-draw.ts`) → `runLoadDraw` (`lib/boosters/load-draw.ts`, dépendances injectées) → lecture de `draw_logs` par le client du joueur (RLS `draw_logs_select_own`, pas de service role).
- Cartes tirées enrichies avec le catalogue pour la révélation → `enrichDrawnCards` (`lib/boosters/enrich-drawn-cards.ts`), appelé par `runLoadDraw` ; `openShopSlot` ne renvoie que le résultat du tirage, la révélation recharge l’ouverture par son identifiant.
- Page de révélation (`app/[locale]/(site)/boosters/opening/[drawId]/page.tsx`) → `loadDrawForReveal` (qui contrôle aussi l’utilisateur : pas de `requireUser` en plus), puis `openingPageAction` (`lib/boosters/opening-page-action.ts`) décide côté serveur de l’issue d’un échec (404, connexion, boutique avec le message `load-failed`), avant que la cérémonie ne lise le repère de la boutique.
- Message de la boutique à la place d’une révélation (`?notice=already-opened` ou `?notice=load-failed`) → `lib/boosters/shop-notice.ts` : `shopNoticeHref` construit l’URL des deux redirections (échec du chargement dans la page de révélation, ouverture déjà effectuée dans la cérémonie) ; la boutique lit le message dans son URL seulement (`useSearchParams` puis `parseShopNotice`) et l’en retire au clic sur un emplacement (`window.history.replaceState`), pour que Précédent ramène à une boutique sans message.
- État de la révélation (paquet au repos, en charge ou qui éclate ; pile, cartes écartées, récapitulatif) → `ceremonyReducer` (`lib/boosters/reveal-ceremony.ts`), avec les durées de la charge et de l’éclat en constantes et `nextPackTimer`, la minuterie de l’étape en cours, que le composant du paquet (`components/boosters/opening-pack.tsx`) pose avec `setTimeout` et dont il passe les durées au CSS ; type du paquet d’une ouverture → `drawPackSlug` (`lib/boosters/booster-pack.ts`) ; repère en mémoire posé par la boutique juste avant de naviguer, lu puis consommé par la cérémonie → `lib/boosters/pending-reveal.ts`.
- Page de l’espace administration (`app/[locale]/(admin)/admin/…/page.tsx`) → d’abord `requireStaff(locale, path)` (`server/auth/require-staff.ts`, avec le chemin de la page sans query string ; un test vérifie que chaque page l’appelle) → `runStaffAccess` (`lib/auth/staff-access.ts`, dépendances injectées) : un visiteur va vers la connexion, un joueur sans rôle d’équipe vers l’accueil du site, un membre équipe reçoit sa session (`StaffSession`, `lib/auth/staff-session.ts`). Le rôle d’équipe est lu dans `team_members` avec le service role, une fois par requête (`cache` de React) ; une lecture en échec (erreur de base, `SUPABASE_SERVICE_ROLE_KEY` absente) est journalisée côté serveur et vaut « pas de rôle » (accueil du site). Le layout admin lit la même session sans rediriger (`getStaffSession`) et ne rend le cadre de l’espace (`components/admin/admin-shell.tsx`, hors en-tête, pied de page, bandeau et chat du site) qu’à un membre équipe : barre latérale fixe dès 1024 px, barre du haut en dessous, nom du membre par `displayLabel` (`lib/profiles/display-label.ts`, partagé avec l’en-tête du site) et `initials` (`lib/profiles/initials.ts`). Les libellés `Admin` sont rendus côté serveur seulement : `app/[locale]/layout.tsx` ne les envoie pas au navigateur ; le titre et le `noindex, nofollow` d’une page admin viennent de son `generateMetadata`, pour un membre équipe seulement (le corps d’une redirection porte aussi les métadonnées) ; chaque page admin le fait en appelant `staffPageMetadata` (`server/auth/staff-metadata.ts`), gardé par `getStaffSession` ; `/admin/accounts` est pour l’instant une page vide avec son titre (CYR-115 la remplira).
- Accueil de l’espace administration (`app/[locale]/(admin)/admin/page.tsx`) → après `requireStaff`, `loadAdminHome(session)` (`server/admin/home.ts`) → `runAdminHome` (`lib/admin/home-indicators.ts`, compteurs et horloge injectés) : trois comptes lus avec le service role à chaque requête (lignes de `profiles`, lignes de `profiles` créées depuis `now − 7 × 24 h`, lignes de `team_members`), chacun dans son `number | null` : un compte en échec est journalisé côté serveur et ne vide que son indicateur (tiret et « Indisponible » pour les lecteurs d’écran). `formatIndicator` écrit le nombre pour la locale avec `formatCount` (`lib/admin/format-count.ts`, que le registre réutilise). Cartes : `components/admin/admin-kpi-card.tsx` et `admin-role-badge.tsx` (libellés reçus en props, jamais de `useTranslations("Admin…")` côté client) ; couleurs des pastilles de rôle dans le thème Tailwind (`admin-moderator`, `admin-moderator-soft`, `admin-neutral-soft`).
- Retour après connexion (`/{locale}/login?returnTo=…`) → `safeReturnTo` (`lib/auth/return-to.ts`) : la page de connexion lit `returnTo`, ne garde qu’un chemin interne (sinon `/{locale}`), redirige un compte déjà connecté vers lui et le passe au formulaire (`AuthForm`, champ caché) ; `signIn` le contrôle de nouveau avant de rediriger. `signIn`, `signUp` et `signOut` passent la locale reçue du navigateur par `knownLocaleOrDefault` (même fichier) avant de construire une redirection ou un `revalidatePath`.
- Validation entrée → Zod dans `lib/` quand c’est réutilisable, sinon en tête de l’action.
- Logique pure testable → `lib/` + test Vitest.

## Server Actions

Traitées comme **glue Next** : validation → `getUser()` / `requireUser()` → appel `server/<domain>/` → effets cache Next. La logique métier ne doit pas vivre dans `server/actions/` au-delà de l’orchestration.

## Migration Nest (rappel)

- Conserver les **mêmes UUID** utilisateurs et le schéma `public.*`.
- Remplacer `lib/supabase` par Prisma + auth Nest ; réimplémenter les mêmes fonctions exportées de `server/`.
- Les RPC SQL peuvent être appelées depuis Nest au début, puis portées en TS transactionnel si besoin.

## Vérification locale

```bash
npm run lint   # inclut les règles d’architecture (no-restricted-imports)
npm run typecheck
```
