# Rate limiting (Sprint 6)

## Stratégie actuelle

Compteurs **en mémoire** (`lib/rate-limit/check.ts`), fenêtre fixe par clé. Utilisé depuis le serveur Next (Server Actions) avec l’IP lue dans `x-forwarded-for` / `x-real-ip`.

| Route / action | Clé | Limite |
|----------------|-----|--------|
| `signIn` / `signUp` | `auth:{ip}` | 20 / minute |
| `openBooster` | `open_booster:{userId}` | 12 / minute |

En cas de dépassement :

- Auth : message i18n `Auth.errorRateLimited` (pas de redirect).
- Booster : `{ ok: false, error: "rate_limited" }` sans appeler la RPC (pas de double dépense).

## Production multi-instances

Sur Vercel, chaque instance a son propre heap : les limites ne sont pas globales. Pour un MVP solo / preview, c’est acceptable. Avant go-live boutique :

- Migrer vers **Vercel KV** ou **Upstash Redis** avec la même API `checkRateLimit`.
- Option : middleware Edge sur `/api/*` pour les futurs webhooks Stripe (Sprint 8).

## Tests

`npm test` inclut `lib/rate-limit/check.test.ts` (compteur unitaire, sans HTTP).
