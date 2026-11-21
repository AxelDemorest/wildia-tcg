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
- État de la révélation (pile, cartes écartées, récapitulatif) → `ceremonyReducer` (`lib/boosters/reveal-ceremony.ts`) ; repère en mémoire posé par la boutique juste avant de naviguer, lu puis consommé par la cérémonie → `lib/boosters/pending-reveal.ts`.
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
