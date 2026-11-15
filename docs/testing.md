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
- Chaque test crée ses comptes (`test-…@example.test`), ses cartes et ses boosters (`test-…`), puis les supprime à la fin du fichier. Ils ne dépendent pas du catalogue local. Les fichiers tournent l’un après l’autre, pour qu’un booster ouvert dans un fichier ne tire pas une carte qu’un autre fichier va supprimer.

Couvert aujourd’hui :

- `economy-guards.integration.test.ts` :
  - un joueur ne peut pas modifier son horloge de farm ni `created_at`, ni mettre en vitrine une carte qu’il ne possède pas ; il peut toujours enregistrer les champs du profil et de la bannière ;
  - `currency_ledger` : ni le joueur ni le service role ne peuvent modifier ou effacer une ligne ; la suppression d’un compte efface ses lignes.
- `rpc-access.integration.test.ts` : qui peut appeler chaque fonction SQL par l’API. Un visiteur ne peut rien appeler ; `grant_card` est réservé au serveur ; `sync_user_economy` et `open_booster_pack` marchent pour le joueur sur son propre compte et refusent le compte d’un autre.
- `economy-boosters.integration.test.ts` :
  - farm : la formule `floor(Σ taux × copies × secondes × multiplicateur)` et sa trace dans le journal, le multiplicateur d’`economy_config`, rien d’écrit sous une pièce, rien sans cartes, et un seul crédit quand plusieurs synchronisations arrivent en même temps ;
  - boosters : prix débité une fois, une carte par emplacement de la bonne rareté, tirage enregistré (`draw_logs`, `booster_purchase` relié au tirage), cartes ajoutées à l’inventaire, doublons compris ; refus si le solde est trop bas ou le booster inactif, sans rien débiter ; le farm est compté avant de vérifier le prix ; deux ouvertures simultanées pour le prix d’une → une seule passe ;
  - tirage de rareté : suit les poids, chaque tirage indépendant même dans une seule requête, jamais une rareté de poids nul, `common` si aucun poids.

Pas encore couvert : le repli de `open_booster_pack` quand aucune carte n’existe pour la rareté tirée (il prend alors une carte au hasard dans tout le catalogue). Le catalogue local a des cartes de chaque rareté, donc le test demanderait un catalogue vide.

Scénarios `user_cards` encore à écrire (`user-cards-rls.integration.test.ts`, aujourd’hui vide et ignoré sans `RUN_SUPABASE_INTEGRATION=1`) :

1. Utilisateur A connecté : `SELECT` sur `user_cards` retourne uniquement ses lignes.
2. Utilisateur B : aucune ligne de A (0 rows, pas d’erreur fatale).
3. Client anon : pas de `SELECT` sur `user_cards` (policy `authenticated` only).
4. `grant_card` : appel RPC depuis le client anon → refus ; via service role → OK + entrée `user_card_grants`.
