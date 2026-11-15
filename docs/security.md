# Sécurité Supabase — TCG V2

## Clients

| Client | Où | Rôle |
|--------|-----|------|
| Anon + cookies (`createClient`) | Server Components, Server Actions joueur | Respecte RLS, session utilisateur |
| Browser anon (`lib/supabase/client.ts`) | Client Components si besoin | Jamais la service role |
| Service role (`createServiceClient`) | Server Actions admin, seeds, webhooks | Bypass RLS — **server-only** |

`createServiceClient` vit dans `lib/supabase/admin.ts` avec `import "server-only"`. Ne pas l’importer depuis un fichier `"use client"`.

## Quand utiliser quoi

- **Lecture catalogue** (`cards`, `card_translations`) : client anon, policies `SELECT` publiques.
- **Inventaire** (`user_cards`) : `SELECT` own user only ; écritures via RPC `grant_card` (service role) ou Server Actions.
- **Ledger, tirages** (sprints suivants) : écritures via Server Actions + service role ou RPC `SECURITY DEFINER`, pas d’`INSERT` direct depuis le navigateur. `currency_ledger` est append-only (trigger `private.currency_ledger_append_only`), même pour le service role ; seule la suppression d’un compte efface ses lignes, en cascade depuis `auth.users`.
- **Storage `card-art`** : lecture publique ; écriture réservée au service role.
- **Storage `profile-banners`** : lecture publique ; upload/update/delete par l’utilisateur authentifié dans son dossier `{user_id}/`.
- **`profiles`** : lecture own row ; lecture rows `is_public = true` pour anon/authenticated ; update own only, **et seulement sur les colonnes que l’app écrit** : `display_name`, `bio`, `is_public`, `featured_card_id`, `banner_url`, `updated_at`. `last_economy_sync_at` (horloge du farm) n’est modifiable que par `sync_user_economy` : sinon un joueur pourrait la reculer et se créditer des pièces. Une nouvelle colonne modifiable par le joueur demande un `grant update (colonne) on public.profiles to authenticated` explicite. Carte vitrine : possession vérifiée côté serveur et par le trigger `profiles_featured_card_owned`.

Voir aussi `docs/rate-limiting.md`.

## Checklist nouvelle table

1. `enable row level security`
2. Définir qui peut `SELECT` (public, `authenticated`, own row via `auth.uid()`)
3. Pas de policy `INSERT`/`UPDATE`/`DELETE` pour `anon` si l’écriture passe par le serveur
4. Tester avec le rôle anon dans le SQL editor Supabase
5. Documenter les exceptions (RPC, triggers `security definer`)

## Checklist nouvelle fonction SQL

Toute fonction du schéma `public` est appelable par l’API (`POST /rest/v1/rpc/<nom>`) par ceux qui ont `EXECUTE`. Depuis la migration `restrict_rpc_execute`, une fonction créée par une migration n’est exécutable que par son propriétaire et le service role : les privilèges par défaut de Supabase (qui donnaient `EXECUTE` à `anon` et `authenticated` en direct) et celui de Postgres pour `PUBLIC` sont retirés.

1. Si le joueur doit appeler la fonction, l’autoriser explicitement, et rien de plus :
   ```sql
   grant execute on function public.ma_fonction(args) to authenticated;
   ```
   Les triggers et les fonctions appelées depuis une fonction `SECURITY DEFINER` n’en ont pas besoin.
2. Une fonction `SECURITY DEFINER` qui accepte un `p_user_id` doit refuser un appel sans `auth.uid()` venant d’`anon` : un visiteur n’a pas d’`auth.uid()` non plus. Le plus simple est de ne pas lui donner `EXECUTE`.
3. `set search_path = ''` et noms qualifiés (`public.table`).
4. Ajouter un test dans `tests/integration/rpc-access.integration.test.ts` : refusé pour un visiteur, refusé ou limité pour un joueur, accepté pour le bon appelant.

Droits actuels : `grant_card`, `user_currency_balance` et `pick_weighted_rarity` → service role seulement ; `sync_user_economy` et `open_booster_pack` → joueur connecté (sur son propre compte) et service role.

## Modèles de policies

**Lecture publique (catalogue)**

```sql
create policy "table_select_public"
  on public.my_table for select
  to anon, authenticated
  using (true);
```

**Lecture / écriture sur ses lignes**

```sql
create policy "rows_select_own"
  on public.my_table for select
  to authenticated
  using (auth.uid() = user_id);

create policy "rows_update_own"
  on public.my_table for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

## Migrations

Voir `supabase/migrations/` et le template commenté dans `supabase/migrations/_template_rls.sql`.
