# Tests

## Unit tests (Vitest)

```bash
npm test
```

Tests de la logique pure de `lib/`, à côté de chaque module (`lib/**/*.test.ts`) : rareté UICN et ordre des raretés, calcul du farm, tirage pondéré, import des cartes, validation des grants et du formulaire de profil, e-mail du concours, bannière (type, taille, chemin), choix de la traduction, tri du classeur, lecture de l’offre boutique (emplacement épuisé compris) et tirage pondéré du type de booster (`lib/boosters/shop.test.ts`), ouverture d’un emplacement (`lib/boosters/open-shop-slot.test.ts` : schéma du formulaire, codes d’erreur, orchestration de l’action avec dépendances injectées, car `server/` ne se charge pas dans Vitest), compte à rebours de la vitrine (`lib/boosters/shop-countdown.test.ts` : secondes restantes, format `m:ss`, décision de recharger l’offre en fin de fenêtre sans boucle), table refus → rechargement de l’offre (`lib/boosters/shop-refusal.test.ts`), aspect du pack selon le type de booster, repli sur le standard (`lib/boosters/booster-pack.test.ts`), messages fr/en de la boutique (`tests/messages.test.ts` : un message par code d’erreur, mêmes clés dans les deux langues), lecture du résultat d’ouverture de booster, IP de la limite de débit, URL publiques du Storage, variables d’environnement, limite de débit.

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
- `rpc-access.integration.test.ts` : qui peut appeler chaque fonction SQL par l’API. Un visiteur ne peut rien appeler ; `grant_card` est réservé au serveur ; `sync_user_economy` marche pour le joueur sur son propre compte ; `open_booster_pack` est réservé au serveur (aucun joueur ne l’appelle, la vitrine est la seule entrée), et la liste des fonctions appelables par un joueur est exactement `get_booster_shop_offer`, `open_booster_shop_slot` et `sync_user_economy` ; `get_booster_shop_offer` est réservé au joueur connecté ; `open_booster_shop_slot` n’agit que sur l’offre de l’appelant ; les helpers `private` de la boutique (dont `private.open_booster_for`) ne sont appelables par aucun rôle de l’API.
- `economy-boosters.integration.test.ts` (l’ouverture passe par le service role : `open_booster_pack` est réservé au serveur) :
  - farm : la formule `floor(Σ taux × copies × secondes × multiplicateur)` et sa trace dans le journal, le multiplicateur d’`economy_config`, rien d’écrit sous une pièce, rien sans cartes, et un seul crédit quand plusieurs synchronisations arrivent en même temps ;
  - boosters : prix débité une fois, une carte par emplacement de la bonne rareté, tirage enregistré (`draw_logs`, `booster_purchase` relié au tirage), cartes ajoutées à l’inventaire, doublons compris ; refus si le solde est trop bas ou le booster inactif, sans rien débiter ; le farm est compté avant de vérifier le prix ; deux ouvertures simultanées pour le prix d’une → une seule passe ;
  - tirage de rareté : suit les poids, chaque tirage indépendant même dans une seule requête, jamais une rareté de poids nul, `common` si aucun poids.
- `booster-shop.integration.test.ts` : boutique boosters. Offre propre à chaque joueur et à chaque fenêtre, persistance des emplacements, renouvellement et purge des fenêtres passées, appels simultanés, tirage pondéré du type de booster, poids par défaut (standard 70, premium 30), nombre d’emplacements lu dans `economy_config` et borné entre 0 et 20, tirage indépendant au sein d’une même requête, offre vide quand aucun booster n’est éligible. Chaque test attend une nouvelle fenêtre quand il en reste moins de 30 s (helper `waitForShopWindowMargin`). Ceux qui changent la config ou les poids partagés (nombre d’emplacements, poids, offre vide) les restaurent dans un `finally`.
- `booster-shop-open.integration.test.ts` : ouverture d’un emplacement. Succès (prix débité, tirage enregistré, emplacement épuisé, le booster ouvert est celui de l’emplacement), refus et leurs codes (`window_closed`, `slot_not_found`, `slot_exhausted`, `booster_unavailable`, `insufficient_balance`) sans rien débiter, deux ouvertures simultanées du même emplacement → une seule passe, deux emplacements ouverts en même temps avec le prix d’un seul : un seul passe, prix courant (et non celui de l’offre), définition désactivée, `exhausted` dans l’offre.
- `security-matrix.integration.test.ts` : pour chaque table et chaque bucket, ce que peuvent faire un visiteur, le joueur propriétaire et un autre joueur.
  - Données d’un joueur (`user_cards`, `user_card_grants`, `currency_ledger`, `draw_logs`) : visibles par leur propriétaire seulement ; personne ne peut en ajouter, modifier ou supprimer par l’API, propriétaire compris.
  - Données de jeu (`cards`, `card_translations`, `booster_definitions`, `economy_config`) : lisibles par tous, non modifiables par l’API ; les boosters inactifs sont invisibles.
  - `profiles` : un profil privé n’est visible que par son propriétaire, un profil public par tous ; personne d’autre ne le modifie ; ni création ni suppression par l’API.
  - `booster_shop_slots` : comme les données d’un joueur, visible par son propriétaire seulement, aucune écriture par l’API ; un joueur ne peut pas désépuiser un emplacement.
  - `contest_entries` (e-mails du concours) : ni lisible ni modifiable par les joueurs et les visiteurs.
  - Storage : `card-art` lisible par tous, écriture réservée au serveur ; `profile-banners` lisible par tous, chaque joueur n’écrit et ne supprime que dans son dossier.

Pour vérifier qu’un test détecte bien une régression, ouvrir volontairement une brèche sur la base locale (par exemple `create policy … for insert to authenticated with check (true)`), lancer le test, puis supprimer la policy.

Pas encore couvert : le repli de l’ouverture partagée (`private.open_booster_for`, utilisée par `open_booster_shop_slot` et `open_booster_pack`) quand aucune carte n’existe pour la rareté tirée (il prend alors une carte au hasard dans tout le catalogue). Le catalogue local a des cartes de chaque rareté, donc le test demanderait un catalogue vide.

## E2E (Playwright)

Parcours complets dans un vrai navigateur (Chromium), contre `npm run dev` et le Supabase local :

```bash
npx playwright install chromium   # une fois, télécharge le navigateur
npx supabase start                # si ce n’est pas déjà fait
npm run test:e2e                  # réutilise le serveur de dev s’il tourne sur :3000, sinon le lance
```

Les comptes et les cartes sont créés et supprimés par les tests, avec les mêmes outils que les tests d’intégration (`tests/integration/supabase.ts`, qui refuse toute URL non locale). Le parcours booster ajoute sa propre carte : il marche sur une base vide (en CI, chaque emplacement retombe sur elle) comme avec le catalogue de `db:pull-cards`. Les parcours tournent l’un après l’autre (un seul worker), car ils partagent le serveur et la base : c’est aussi ce qui permet à un parcours de changer une config globale (nombre d’emplacements) le temps de son test.

Pour reproduire la CI en local (build de production servi par `next start`, sur un autre port que le serveur de dev) : `CI=1 E2E_PORT=3100 npm run test:e2e`.

- `locale-routing.spec.ts` : `/` → `/fr` ; une page sans langue garde son chemin (`/cards` → `/fr/cards`) ; un navigateur en anglais arrive sur `/en` ; une langue explicite est gardée.
- `signup-profile.spec.ts` : inscription par le formulaire, profil public rempli (pseudo, bio, visibilité), puis page joueur affichée en étant déconnecté.
- `open-booster.spec.ts` : connexion, grille des emplacements de l’offre (type, coût, nombre de cartes), ouverture d’un emplacement, révélation des 5 cartes, bouton au libellé visible « Ouvrir » et au nom accessible de l’emplacement, pack affiché au repos puis épuisé, emplacement « Épuisé » sans rechargement alors que le second du même type reste ouvrable, solde du bandeau à 850 pièces, chaque carte tirée retrouvée dans le classeur, emplacement toujours épuisé au retour dans la même fenêtre. Les textes des emplacements sont lus dans l’arbre d’accessibilité (`ariaSnapshot`), pas dans le texte du DOM, pour ignorer le contenu masqué. Les vérifications d’URL de connexion et « Voir mon classeur » → `/fr/collection` attendent jusqu’à 20 s, car elles ont expiré sous charge.
- `booster-shop.spec.ts` : vitrine boutique. Compte à rebours (`role="timer"`) entre 3 s en dessous et 6 s au-dessus de l’horloge de la base (le délai de chargement est accepté) et qui avance ; fin de fenêtre (`page.clock` avance l’horloge du navigateur seulement) : l’offre est rechargée sans rechargement de page et le compte à rebours repart de la valeur du serveur ; pas de boucle de rechargement quand le serveur répond encore la même fenêtre ; retour arrière du navigateur (Précédent) : l’offre est rechargée, le compte à rebours est à jour ; invité : message et lien de connexion, aucun bouton « Ouvrir » ; refus (solde insuffisant) affiché dans une alerte visible sans défiler (ordinateur et téléphone), emplacement toujours ouvrable ; ouverture en attente : seul l’emplacement cliqué affiche « Ouverture… » (son pack est à l’état « opening », les autres restent au repos), les autres restent désactivés avec leur nom ; double clic : une seule requête d’Action serveur ; après une ouverture, le focus passe à la révélation ; emplacement ouvert depuis un autre onglet : message puis « Épuisé » ; nouvelle fenêtre simulée (l’offre stockée du joueur est reculée d’une fenêtre, puis la page est chargée) : nouvelle offre dont aucun emplacement n’est épuisé ; offre vide (`booster_shop_slot_count` à 0, restauré dans un `finally`) : message « Aucun booster disponible ». Chaque test attend une marge de 60 s dans la fenêtre (`waitForShopWindowMargin`). Avec les 8 emplacements par défaut, la grille affiche 4 par ligne sur ordinateur (1280 px) et 2 par ligne à 700 px et 390 px, vérifié avec les boîtes englobantes.

En cas d’échec, la trace Playwright est gardée dans `test-results/` (`npx playwright show-trace …`).

## Couverture

```bash
npm run test:coverage   # tests unitaires + couverture de lib/ (v8)
```

La couverture ne mesure que les tests unitaires, donc `lib/`. `server/`, la base et l’interface sont couverts par les tests d’intégration et E2E, qui ne produisent pas de couverture par ligne : pour eux, la règle est qu’une fonction SQL ou une policy a au moins un test « autorisé » et un test « refusé ».

## CI (`.github/workflows/ci.yml`)

Sur chaque PR, quelle que soit sa base (PR empilées comprises), et sur chaque push vers `main` et `dev` :

| Job                 | Étapes                                                                                                                                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `quality`           | `npm ci`, lint (règles d’architecture comprises), typecheck (`next typegen` + `tsc`), build, tests unitaires avec couverture ; le tableau de couverture s’affiche dans le résumé du run                                                                                         |
| `integration & e2e` | Supabase local démarré depuis `supabase/migrations` (une migration cassée échoue ici, pas en prod), puis `npm run test:integration`, puis les parcours Playwright contre le build de production ; en cas d’échec, les traces sont jointes au run (`playwright-traces`, 7 jours) |

Le job Supabase ne lance que la base, l’authentification, l’API, le Storage et la passerelle (`-x studio,postgres-meta,mailpit,imgproxy,supavisor`). Les clés utilisées sont les clés de démo du Supabase local, identiques sur toutes les machines : ce ne sont pas des secrets.
