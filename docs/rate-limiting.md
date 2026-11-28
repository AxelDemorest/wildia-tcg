# Rate limiting (Sprint 6)

## Stratégie actuelle

Compteurs **en mémoire** (`lib/rate-limit/check.ts`), fenêtre fixe par clé. Utilisé depuis le serveur Next (Server Actions) avec l’IP lue dans `x-forwarded-for` / `x-real-ip`.

| Route / action | Clé | Limite |
|----------------|-----|--------|
| `signIn` / `signUp` / `signInWithProvider` (Google, Discord) | `auth:{ip}` | 20 / minute |
| `signUp` (une adresse) | `signup:{adresse normalisée}` | 1 / minute |
| `resendConfirmation` | `auth:{ip}` | 20 / minute (partagée avec `signIn`) |
| `openShopSlot` | `open_booster:{userId}` | 12 / minute |

En cas de dépassement :

- Auth : message i18n `Auth.errorRateLimited` (pas de redirect), y compris sur le formulaire OAuth (Google et Discord) : le départ est refusé avant la construction de l’URL d’autorisation (`runOAuthStart`).
- Booster : `{ ok: false, error: "rate_limited" }` sans appeler la RPC (pas de double dépense).

La route `GET /{locale}/auth/confirm` n’a pas de limite de l’app : les limites `token_verifications` de Supabase Auth comptent l’IP du serveur Next, l’appel partant du serveur, et ne sont pas une limite par visiteur ; un `token_hash` inconnu ou rejoué n’ouvre rien (`otp_expired`).

Le renvoi du lien de confirmation n’a pas de limite par adresse dans l’app : seule `auth:{ip}` s’applique, plus la limite de Supabase Auth par compte (`max_frequency` : 1 s en local, 60 s en prod). Une erreur de Supabase (429 `over_email_send_rate_limit`) est journalisée et avalée : l’écran répond comme après un envoi, pour ne pas dire que l’adresse a un compte. Dans l’écran d’inscription, la limite par adresse (`signup:…`) refuse avec `rate_limited` sans rien supprimer ni créer ; l’adresse est normalisée (espaces retirés, minuscules).

Le callback OAuth (`/{locale}/auth/callback`) n’a pas de limite côté app : seul le départ est limité (`auth:{ip}`) ; les limites de Supabase Auth s’appliquent à l’échange du code, mais elles comptent l’IP du serveur Next (l’appel part du serveur), pas celle du visiteur ; une requête sans le cookie du vérificateur n’atteint jamais Supabase.

## Production multi-instances

Sur Vercel, chaque instance a son propre heap : les limites ne sont pas globales. Pour un MVP solo / preview, c’est acceptable. Avant go-live boutique :

- Migrer vers **Vercel KV** ou **Upstash Redis** avec la même API `checkRateLimit`.
- Option : middleware Edge sur `/api/*` pour les futurs webhooks Stripe (Sprint 8).

## Tests

`npm test` inclut `lib/rate-limit/check.test.ts` (compteur unitaire, sans HTTP).
