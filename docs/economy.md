# Économie in-game (Sprint 4)

## Solde

Le solde affiché est **toujours** `SUM(currency_ledger.amount)` pour l’utilisateur. Il n’existe pas de colonne `balance` modifiable.

## Farm lazy

À chaque affichage du solde (header, etc.), le serveur appelle la RPC `sync_user_economy` :

1. Verrouille la ligne `profiles` (`FOR UPDATE`).
2. Calcule `Δt` = secondes depuis `last_economy_sync_at`.
3. Agrège le débit « par seconde » :  
   `Σ (cards.farm_rate_base × user_cards.quantity)` pour les cartes possédées.
4. Crédit farm :  
   **`accrued = floor(rate × Δt × farm_global_multiplier)`**  
   (`farm_global_multiplier` dans `economy_config`, défaut `1`).
5. Si `accrued > 0`, insert ledger `farm_accrual` + metadata (`delta_seconds`, `farm_rate_per_sec`).
6. Met `last_economy_sync_at = now()`.

Pas de cron par joueur : le farm offline est rattrapé au prochain sync.

## Progression rareté

`farm_rate_base` est en pièces par seconde et par copie, le même pour toutes les cartes d’une rareté (`lib/cards/farm-rate.ts`). Colonne `numeric(14, 6)`.

| Rareté | Pièces / heure / copie | `farm_rate_base` |
|--------|------------------------:|-----------------:|
| common | 4,17 | 0.001158 |
| uncommon | 6,25 | 0.001736 |
| rare | 9,38 | 0.002606 |
| epic | 14,58 | 0.004050 |
| legendary | 22,92 | 0.006367 |
| mythic | 35,42 | 0.009839 |

## Mouvements ledger

| Type | Sens |
|------|------|
| `farm_accrual` | + farm |
| `booster_purchase` | − achat booster (Sprint 5) |
| `stripe_purchase` | + achat réel (Sprint 8) |
| `admin_adjust` | ajustement manuel (réservé) |

Le ledger est **append-only** (triggers bloquent UPDATE/DELETE). Seule exception : la suppression d’un compte efface ses lignes, en cascade.

## Boutique boosters

- `booster_shop_slot_count` (`economy_config`) : nombre d’emplacements de l’offre boutique, arrondi et borné entre 0 et 20, 8 par défaut.
- Poids de tirage des types (`booster_definitions.shop_weight`) : `standard` 70, `premium` 30. Les poids sont relatifs : un `premium` apparaît dans environ 3 emplacements sur 10.
- Ouvrir un emplacement débite le prix **courant** du booster (pas celui du moment où l’offre a été tirée) et l’emplacement reste **épuisé** jusqu’à la fin de la fenêtre.
- Refus, sans rien débiter : `window_closed`, `slot_not_found`, `slot_exhausted`, `booster_unavailable` (définition désactivée), `insufficient_balance`.
- `open_booster_pack` n’est plus appelable par un joueur : la vitrine est la seule entrée, et la fonction reste pour le serveur (service role).
- Les poids de rareté *dans* chaque définition (`rarity_weights`) ne sont pas recalibrés : voir la note de l’ADR [`0001-booster-shop-rotation`](adr/0001-booster-shop-rotation.md).

### Parcours manuel : fenêtre, ouverture, reset, offre persistante

Chaque étape est couverte par des tests automatisés.

| Étape | Ce qu’on vérifie | Tests |
|-------|------------------|-------|
| Fenêtre | Le compte à rebours suit l’horloge de la base et repart du serveur | `e2e/booster-shop.spec.ts` : « the timer counts down to the end of the window, as the database sees it », « coming back with the browser's Back button reloads the offer: the timer is fresh » ; `tests/integration/booster-shop.integration.test.ts` : « is measured on the database clock, in 180 s windows ending on a boundary » |
| Ouverture | Ouvrir un emplacement, révéler les cartes, les retrouver dans le classeur | `e2e/open-booster.spec.ts` : « a player opens one emplacement of their shop offer, reveals the cards and finds them in their binder » |
| Reset | À la nouvelle fenêtre, nouvelle offre sans emplacement épuisé | `e2e/booster-shop.spec.ts` : « a new window brings a new offer, with no emplacement exhausted », « at the end of the window the page reloads the offer and the timer restarts from the server » ; `tests/integration/booster-shop.integration.test.ts` : « gives a new offre in the next fenêtre boutique and purges the player's past ones » ; `tests/integration/booster-shop-open.integration.test.ts` : « flags only the opened emplacement as exhausted, and a new window offre has none exhausted » |
| Offre persistante | Dans la même fenêtre, l’offre et les emplacements épuisés sont conservés | `e2e/open-booster.spec.ts` : « find the emplacement still exhausted when coming back in the same window » ; `tests/integration/booster-shop.integration.test.ts` : « stores one row per emplacement for the fenêtre boutique, and a second read returns the same offre » |

## Sécurité

- `sync_user_economy` : uniquement pour `auth.uid() = p_user_id` (ou service role).
- `profiles.last_economy_sync_at` n’est pas modifiable par le joueur (droits par colonne) : la reculer créditerait le temps écoulé depuis cette date.
- Écritures ledger hors farm : Server Actions + service role (Sprint 5+).
