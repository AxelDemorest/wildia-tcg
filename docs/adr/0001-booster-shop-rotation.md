# Boutique boosters à fenêtre globale et offre par joueur

La boutique boosters remplace la liste statique de packs : une horloge globale de 180 s délimite des fenêtres identiques pour tous. À chaque fenêtre, chaque joueur reçoit une offre persistée de N emplacements ; chaque emplacement est un tirage pondéré indépendant sur les définitions de booster actives. Un emplacement ne peut être ouvert qu’une fois par fenêtre (épuisement par index, pas par type). L’ouverture est refusée si l’index n’appartient pas à l’offre courante, est déjà épuisé, ou si le solde est insuffisant — le client ne choisit jamais un `booster_id` hors vitrine.

**Considered options** : vitrine identique pour tous (rejeté — variété par joueur) ; achats illimités sur les mêmes packs (rejeté — épuisement par emplacement) ; packs stockés avant ouverture (hors scope).

**Consequences** : schéma pour config boutique + offres par `(user_id, window_index)` ; `open_booster` prend un index d’emplacement ; UI avec compte à rebours et état épuisé sans rechargement complet. Les poids de rareté *dans* chaque définition de booster restent un réglage produit séparé (Q26).

**Reste ouvert** : le recalibrage des `rarity_weights` de chaque définition de booster n’est pas fait (hors périmètre de la boutique). Les poids seedés de `standard` et `premium` (`20260402120000_boosters.sql`) n’ont aucune clé `mythic` : aucun tirage de rareté ne donne `mythic` aujourd’hui. Les poids de la boutique (`shop_weight`, 70 / 30) ne règlent que le type de booster proposé par emplacement.