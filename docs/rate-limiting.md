# Rate limiting (Sprint 6)

## Stratégie actuelle

Compteurs **en mémoire** (`lib/rate-limit/check.ts`), fenêtre fixe par clé. Utilisé depuis le serveur Next (Server Actions) avec l’IP lue dans `x-forwarded-for` / `x-real-ip`.

| Route / action | Clé | Limite |
|----------------|-----|--------|
| `signIn` / `signUp` / `signInWithProvider` (Google, Discord) | `auth:{ip}` | 20 / minute |
| `openShopSlot` | `open_booster:{userId}` | 12 / minute |

En cas de dépassement :

- Auth : message i18n `Auth.errorRateLimited` (pas de redirect), y compris sur le formulaire OAuth (Google et Discord) : le départ est refusé avant la construction de l’URL d’autorisation (`runOAuthStart`).
- Booster : `{ ok: false, error: "rate_limited" }` sans appeler la RPC (pas de double dépense).

## Production multi-instances

Sur Vercel, chaque instance a son propre heap : les limites ne sont pas globales. Pour un MVP solo / preview, c’est acceptable. Avant go-live boutique :

- Migrer vers **Vercel KV** ou **Upstash Redis** avec la même API `checkRateLimit`.
- Option : middleware Edge sur `/api/*` pour les futurs webhooks Stripe (Sprint 8).

## Tests

`npm test` inclut `lib/rate-limit/check.test.ts` (compteur unitaire, sans HTTP).
