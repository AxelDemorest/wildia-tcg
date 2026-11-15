# Tests

## Unit tests (Vitest)

```bash
npm test
```

Couvre la validation des grants (`grantCardInputSchema`), le flag `ENABLE_DEV_GRANTS`, et le calcul farm (`computeFarmAccrual`).

Les conventions de couches (Supabase isolé, `lib/` sans Next) sont documentées dans **`docs/architecture.md`** et appliquées par **`npm run lint`** (`no-restricted-imports`).

## Intégration Supabase

Tests des fonctions SQL, triggers et droits (RLS, colonnes) contre le **Supabase local**, avec les mêmes clients que l’app (clé anon + session joueur, ou service role) :

```bash
npx supabase start           # si ce n’est pas déjà fait
npm run test:integration     # vitest.integration.config.ts → tests/**/*.integration.test.ts
```

- Les clés viennent de l’environnement, ou de `.env.local` à défaut.
- `tests/integration/supabase.ts` **refuse toute URL qui n’est pas locale** : ces tests créent et suppriment des comptes.
- Chaque test crée ses comptes (`test-…@example.test`) et ses cartes (`test-…`), puis les supprime à la fin du fichier. Ils ne dépendent pas du catalogue local.

Couvert aujourd’hui (`economy-guards.integration.test.ts`) :

- Un joueur ne peut pas modifier son horloge de farm ni `created_at`, ni mettre en vitrine une carte qu’il ne possède pas ; il peut toujours enregistrer les champs du profil et de la bannière.
- `currency_ledger` : ni le joueur ni le service role ne peuvent modifier ou effacer une ligne ; la suppression d’un compte efface ses lignes.

Scénarios `user_cards` encore à écrire (`user-cards-rls.integration.test.ts`, aujourd’hui vide et ignoré sans `RUN_SUPABASE_INTEGRATION=1`) :

1. Utilisateur A connecté : `SELECT` sur `user_cards` retourne uniquement ses lignes.
2. Utilisateur B : aucune ligne de A (0 rows, pas d’erreur fatale).
3. Client anon : pas de `SELECT` sur `user_cards` (policy `authenticated` only).
4. `grant_card` : appel RPC depuis le client anon → refus ; via service role → OK + entrée `user_card_grants`.
