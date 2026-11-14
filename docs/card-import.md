# Import de cartes en masse

Une carte = une espèce. Le workflow part d’une liste de noms scientifiques et produit des cartes publiées dans `cards` + `card_translations`, avec une photo dans le bucket `card-art`.

## Sources

| Champ | Table | Source |
|-------|-------|--------|
| `slug` | `cards` | Dérivé du nom scientifique (`Lutra lutra` → `lutra-lutra`) |
| `scientific_name` | `cards` | Wikidata `P225` |
| `iucn_status` | `cards` | Wikidata `P141` (statut **mondial**) |
| `rarity` | `cards` | Dérivée de `iucn_status` (`lib/cards/iucn.ts`) |
| `image_path` | `cards` | Photo Pixabay convertie en WebP, stockée dans `card-art/cards/<slug>.webp` |
| `farm_rate_base` | `cards` | Dérivé de la rareté (`lib/cards/farm-rate.ts`) |
| `stats` | `cards` | Valeur par défaut à la création, jamais écrasée ensuite |
| `name` | `card_translations` | Titre de l’article Wikipédia fr / en (surchargeable en revue) |
| `description` | `card_translations` | `extract` du résumé Wikipédia, coupé à 500 caractères en fin de phrase |

## Rareté

| UICN | Rareté |
|------|--------|
| LC | common |
| NT | uncommon |
| VU | rare |
| EN | epic |
| CR | legendary |
| EW | mythic |
| EX, DD, NE | aucune — carte rejetée |

## Fichiers

- `data/cards/species.txt` — graine, versionnée. Un binôme par ligne, QID optionnel en fin de ligne pour lever une ambiguïté.
- `data/cards/work.json` — fiche de travail par espèce (données brutes, drapeaux, statut). Versionnable : c’est la trace de la revue.
- `data/cards/images/` et `data/cards/.cache/` — photos téléchargées et cache Pixabay (24 h, exigé par Pixabay). Ignorés par git.

## Statuts d’une fiche

- `pending` — pas encore interrogée, ou image pas encore cherchée.
- `rejected` — donnée bloquante (taxon introuvable ou ambigu, pas de statut UICN exploitable, article Wikipédia manquant). Se corrige dans `species.txt`, pas en revue.
- `needs_review` — photo incertaine, nom = nom scientifique, ou JPEG/PNG pas encore converti en WebP.
- `ready` — publiable (WebP local présent).
- `published` — en base. Toute modification (refetch, nouvelle image, renommage) la repasse en `ready`.

## Variables

Dans `.env.local` : `PIXABAY_API_KEY`, `CARD_IMPORT_CONTACT` (contact envoyé dans le User-Agent, exigé par Wikimedia), `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (publication uniquement).

## Commandes

Ordre habituel : `cards:fetch` → `cards:images` → `cards:review` → **`cards:webp`** → `cards:publish`.

- **`cards:webp`** — compresse chaque photo locale en WebP (max 1280 px, qualité 82) et supprime le JPEG/PNG source. Obligatoire avant publication.

Voir `npm run cards:*` dans `package.json` ; chaque script décrit ses options en tête de fichier (`scripts/cards/`).
