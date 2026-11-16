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

- `booster_shop_slot_count` (`economy_config`) : nombre d’emplacements de l’offre boutique, arrondi et borné entre 0 et 20, 6 par défaut.

## Sécurité

- `sync_user_economy` : uniquement pour `auth.uid() = p_user_id` (ou service role).
- `profiles.last_economy_sync_at` n’est pas modifiable par le joueur (droits par colonne) : la reculer créditerait le temps écoulé depuis cette date.
- Écritures ledger hors farm : Server Actions + service role (Sprint 5+).
