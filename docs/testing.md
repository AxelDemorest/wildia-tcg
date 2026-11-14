# Tests

## Unit tests (Vitest)

```bash
npm test
```

Couvre la validation des grants (`grantCardInputSchema`), le flag `ENABLE_DEV_GRANTS`, et le calcul farm (`computeFarmAccrual`).

Les conventions de couches (Supabase isolé, `lib/` sans Next) sont documentées dans **`docs/architecture.md`** et appliquées par **`npm run lint`** (`no-restricted-imports`).

## Intégration Supabase (optionnel)

Les policies `user_cards` sont testées manuellement ou via :

```bash
RUN_SUPABASE_INTEGRATION=1 npm run test:integration
```

Prérequis : utilisateurs de test, `SUPABASE_SERVICE_ROLE_KEY`, variables documentées dans `.env.example`.

Scénarios à vérifier :

1. Utilisateur A connecté : `SELECT` sur `user_cards` retourne uniquement ses lignes.
2. Utilisateur B : aucune ligne de A (0 rows, pas d’erreur fatale).
3. Client anon : pas de `SELECT` sur `user_cards` (policy `authenticated` only).
4. `grant_card` : appel RPC depuis le client anon → refus ; via service role → OK + entrée `user_card_grants`.
