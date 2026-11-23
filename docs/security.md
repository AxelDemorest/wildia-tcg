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
- **Boutique boosters** (`booster_shop_slots`) : `SELECT` own user only ; aucune policy d’écriture, les lignes sont écrites uniquement par la RPC `get_booster_shop_offer` et marquées épuisées (`opened_at`, `draw_id`) uniquement par la RPC `open_booster_shop_slot` (toutes deux `SECURITY DEFINER`).
- **Ledger, tirages** (sprints suivants) : écritures via Server Actions + service role ou RPC `SECURITY DEFINER`, pas d’`INSERT` direct depuis le navigateur. `currency_ledger` est append-only (trigger `private.currency_ledger_append_only`), même pour le service role ; seule la suppression d’un compte efface ses lignes, en cascade depuis `auth.users`.
- **Storage `card-art`** : lecture publique ; écriture réservée au service role.
- **Storage `profile-banners`** : lecture publique ; upload/update/delete par l’utilisateur authentifié dans son dossier `{user_id}/`.
- **`profiles`** : lecture own row ; lecture rows `is_public = true` pour anon/authenticated ; update own only, **et seulement sur les colonnes que l’app écrit** : `display_name`, `bio`, `is_public`, `featured_card_id`, `banner_url`, `updated_at`. `last_economy_sync_at` (horloge du farm) n’est modifiable que par `sync_user_economy` : sinon un joueur pourrait la reculer et se créditer des pièces. Une nouvelle colonne modifiable par le joueur demande un `grant update (colonne) on public.profiles to authenticated` explicite. Carte vitrine : possession vérifiée côté serveur et par le trigger `profiles_featured_card_owned`.
- **`team_members`** (rôle d’équipe d’un compte joueur) : aucun accès client, pas même à sa propre ligne. RLS activée sans aucune policy, et `revoke all` pour `anon` et `authenticated` : l’API répond `42501` à tous. Seul le service role lit et écrit la table ; le rôle d’un compte est lu côté serveur. Les rôles se changent par du SQL d’exploitation dans le MVP, voir `docs/admin.md`.

Voir aussi `docs/rate-limiting.md`.

## Authentification et espace administration

- **`returnTo` de la connexion** : jamais une redirection ouverte. `safeReturnTo` (`lib/auth/return-to.ts`) ne garde qu’un chemin interne : il commence par `/`, pas par `//` ni `/\`, uniquement des caractères ASCII imprimables (U+0021–U+007E), contrôlés une fois décodé (`redirect()` écrit la valeur brute dans un en-tête, qui échoue sur tout autre caractère : `/日`, `/%E6%97%A5`, `/%09/evil.com`), sans schéma ; il est aussi refusé quand un décodage donne `//` ou `/\`, ou quand un échappement est mal formé, et quand le paramètre est répété. Le chemin est ensuite contrôlé après normalisation d’URL (segments `.` et `..`, `%2e`, antislashs) : `/.//evil.com`, `/x/..//evil.com` ou `/%2e//evil.com` donnent `//evil.com`, une URL relative au protocole, et sont refusés ; c’est la forme normalisée qui sert à la redirection, pas la chaîne brute. Sinon, retour à `/{locale}`. La page de connexion le contrôle à la lecture, `signIn` de nouveau à la réception du formulaire : le champ caché peut être forgé.
- **Locale des actions d’auth** : `signIn`, `signUp` et `signOut` reçoivent leur locale du navigateur (argument lié). Elle passe par `knownLocaleOrDefault` (une locale de `routing.locales`, sinon `fr`) avant toute redirection ou `revalidatePath` : une locale forgée `/evil.com` ne donne jamais `//evil.com`.
- **Locale d’inscription** : `signUp` envoie cette locale contrôlée dans les métadonnées du compte (`options.data.locale`) ; `handle_new_user` l’enregistre dans `profiles.locale` et ne garde que `fr` et `en` (sinon `fr`), car les métadonnées d’inscription viennent du client. Les comptes inscrits avant restent en `fr`.
- **Garde staff** : chaque page admin appelle `requireStaff` (le layout ne protège pas ses pages). Visiteur → connexion ; joueur sans rôle d’équipe → accueil du site par une redirection HTTP, sans 403 ni balisage admin. Le rôle est lu avec le service role ; si cette lecture échoue (erreur de base, `SUPABASE_SERVICE_ROLE_KEY` absente), l’accès est refusé comme sans rôle et l’erreur est journalisée côté serveur.
- **Indicateurs de l’accueil** : `loadAdminHome` (`server/admin/home.ts`) compte `profiles` et `team_members` avec le service role (ces tables sont fermées au navigateur), uniquement pour la session staff que la page vient d’obtenir de `requireStaff` ; le navigateur ne reçoit que les trois nombres rendus côté serveur. Une erreur de comptage est journalisée côté serveur, jamais affichée.
- **Registre des comptes inscrits** : `listAccounts` (`server/admin/list-accounts.ts`) appelle `admin_list_accounts` avec le service role (la fonction lit les e-mails et les dernières connexions dans `auth.users`), uniquement pour la session staff que la page vient d’obtenir de `requireStaff`. Les e-mails sont en clair pour un super administrateur et un modérateur ; pour un lecteur (et tout rôle d’équipe qui n’est pas l’un des deux), `runListAccounts` les masque côté serveur avec `maskEmail` (`lib/admin/mask-email.ts`, longueur fixe : `l•••@e•••.com`) avant le rendu : son navigateur ne reçoit jamais un e-mail en clair, ni dans le HTML ni dans le payload RSC. La recherche ne porte sur les e-mails que pour les rôles qui les voient : le serveur le décide depuis la session staff (`p_search_email`), jamais depuis un paramètre du navigateur, sinon un lecteur pourrait retrouver un e-mail en le devinant. Dans la recherche, `%`, `_` et `\` sont des caractères ordinaires. Une lecture en échec est journalisée côté serveur (sans la recherche, qui peut être un e-mail) et la page affiche un message à la place du tableau.
- **Rien de l’espace administration hors de l’équipe** : les libellés `Admin` ne sont jamais envoyés au navigateur (`app/[locale]/layout.tsx` les retire des messages client) ; ils sont rendus côté serveur, pour un membre équipe seulement. Le titre et le `noindex` d’une page admin ne sont produits que pour un membre équipe, car le corps d’une redirection porte aussi les métadonnées de la page : chaque page admin (CYR-114, CYR-115) doit reprendre le même `generateMetadata` gardé par `getStaffSession`.

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

Droits actuels : `grant_card`, `user_currency_balance` et `pick_weighted_rarity` → service role seulement ; `open_booster_pack` → service role seulement (la vitrine est la seule entrée joueur) ; `sync_user_economy` → joueur connecté (sur son propre compte) et service role ; `get_booster_shop_offer` et `open_booster_shop_slot` → joueur connecté seulement (sur son propre compte, via `auth.uid()`, sans paramètre de compte) ; `admin_list_accounts` → service role seulement, pas même la session d’un membre équipe (elle renvoie les e-mails de tous les comptes ; le serveur l’appelle après `requireStaff`) ; `private.booster_shop_window`, `private.pick_shop_booster` et `private.open_booster_for` → aucun rôle de l’API (schéma `private` non exposé).

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
