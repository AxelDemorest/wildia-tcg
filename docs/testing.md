# Tests

## Unit tests (Vitest)

```bash
npm test
```

Tests de la logique pure de `lib/`, à côté de chaque module (`lib/**/*.test.ts`) : rareté UICN et ordre des raretés, calcul du farm, tirage pondéré, import des cartes, validation des grants et du formulaire de profil, e-mail du concours, bannière (type, taille, chemin), choix de la traduction, tri du classeur, lecture du résultat d’ouverture de booster, IP de la limite de débit, URL publiques du Storage, variables d’environnement, limite de débit.

Les fichiers de `server/` importent `server-only` et ne se chargent pas hors de Next. Leur logique testable vit donc dans `lib/`, que `server/` appelle. Quand du code de `server/` mérite un test, l’extraire dans `lib/` (sans Next ni Supabase) plutôt que de le simuler.

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
- `security-matrix.integration.test.ts` : pour chaque table et chaque bucket, ce que peuvent faire un visiteur, le joueur propriétaire et un autre joueur.
  - Données d’un joueur (`user_cards`, `user_card_grants`, `currency_ledger`, `draw_logs`) : visibles par leur propriétaire seulement ; personne ne peut en ajouter, modifier ou supprimer par l’API, propriétaire compris.
  - Données de jeu (`cards`, `card_translations`, `booster_definitions`, `economy_config`) : lisibles par tous, non modifiables par l’API ; les boosters inactifs sont invisibles.
  - `profiles` : un profil privé n’est visible que par son propriétaire, un profil public par tous ; personne d’autre ne le modifie ; ni création ni suppression par l’API.
  - `contest_entries` (e-mails du concours) : ni lisible ni modifiable par les joueurs et les visiteurs.
  - Storage : `card-art` lisible par tous, écriture réservée au serveur ; `profile-banners` lisible par tous, chaque joueur n’écrit et ne supprime que dans son dossier.

Pour vérifier qu’un test détecte bien une régression, ouvrir volontairement une brèche sur la base locale (par exemple `create policy … for insert to authenticated with check (true)`), lancer le test, puis supprimer la policy.

Pas encore couvert : le repli de `open_booster_pack` quand aucune carte n’existe pour la rareté tirée (il prend alors une carte au hasard dans tout le catalogue). Le catalogue local a des cartes de chaque rareté, donc le test demanderait un catalogue vide.
