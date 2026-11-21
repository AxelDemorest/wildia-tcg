# TCG — vocabulaire métier

Jeu de collection de cartes d’animaux : ouverture de packs en monnaie virtuelle, farming et profil joueur.

## Identité et accès

**Compte joueur** :
Identité persistée qui peut ouvrir une session : profil, collection et économie lui sont rattachés. Distinct du visiteur qui parcourt le site sans être connecté.
_Avoid_: Account, user, utilisateur Auth

**Inscription** :
Création d’un compte joueur (e-mail et mot de passe, Google ou Discord selon le choix du visiteur).
_Avoid_: Sign-up, register, onboarding (quand on parle uniquement de l’auth)

**Connexion** :
Établissement d’une session sur un compte joueur déjà existé, par la même famille de méthodes que l’inscription.
_Avoid_: Login (comme nom métier), sign-in

**Joueur connecté** :
Visiteur qui a une session active sur un compte joueur.
_Avoid_: Utilisateur authentifié, logged-in user

## Cartes et collection

**Catalogue (cartes)** :
L’encyclopédie des espèces jouables : toutes les cartes du jeu, consultables et filtrables, indépendamment de ce qu’un joueur possède.
_Avoid_: Catalogue (sans précision), bibliothèque

**Carte** :
Une espèce représentée dans le jeu, avec rareté, illustration et stats.
_Avoid_: Token, asset

**Dos de carte** :
Face générique affichée tant qu’une carte n’est pas retournée pendant une révélation, sans indice de rareté ni d’espèce.
_Avoid_: Card back (libellé UI)

**Face de carte** :
Côté visible d’une carte retournée : nom de l’espèce, illustration en aperçu, rareté, statut UICN et, dans le classeur, quantité possédée. Même silhouette et même esprit que le dos de carte ; sa couleur et sa brillance trahissent la rareté. C’est la seule représentation d’une carte sur le site, quelle que soit sa taille.
_Avoid_: Recto, card front, vignette (quand on parle de la carte elle-même)

**Classeur** :
Inventaire des cartes qu’un joueur possède : une ligne par espèce avec sa quantité ; l’écran de tri du classeur et la vitrine en monde classeur s’appuient sur le même inventaire (une représentation par espèce en 3D).
_Avoid_: Collection (comme nom d’écran), binder

## Profil joueur

**Profil joueur** :
Identité affichée d’un compte (nom, bio, bannière, carte vitrine) ; peut être rendu visible aux autres ou gardé privé par le titulaire.
_Avoid_: Page user, profil compte

**Visibilité du classeur (autres joueurs)** :
Un visiteur ne peut parcourir le classeur d’un autre joueur (y compris en vitrine 3D) que si le profil de ce titulaire est **public** ; le titulaire accède toujours à son propre classeur, même profil privé.
_Avoid_: Partage collection, toggle classeur

**Carte vitrine** :
Espèce choisie par le titulaire pour représenter son profil ; dans le monde classeur, elle est toujours incluse dans les espèces affichées si le titulaire la possède encore, même au-delà du plafond d’affichage, et y est mise en avant visuellement.
_Avoid_: Featured card, carte du profil

**Monde classeur** :
Vitrine 3D partagée (même décor pour tous) où flottent les espèces du classeur, disposées en anneaux selon la rareté ; au plus **80** espèces y sont montrées, les plus rares en priorité (carte vitrine réservée), avec indication du total et renvoi vers le classeur 2D. Classeur vide : décor sans cartes et message invitant le titulaire à ouvrir des boosters. Accessible depuis le profil (`Voir le monde classeur`), y compris pour un visiteur non connecté si le profil est public.
_Avoid_: Binder world, galerie 3D, scène WebGL

## Signalement et qualité des cartes

**Signalement (carte)** :
Retour d’un joueur connecté vers l’équipe sur une carte du catalogue ; au plus un signalement **ouvert** par joueur et par carte. Le joueur ne suit pas le traitement après envoi.
_Avoid_: Report, flag, ticket

**Motif de signalement** :
Catégorie indiquée par le joueur (image mal cadrée, mauvais animal, description fausse, autre) ; plusieurs motifs peuvent être cochés pour un même envoi. Si « autre » est choisi, un texte libre est requis.
_Avoid_: Flag (pipeline d’import), raison, category

**État du signalement** :
Où en est le traitement côté équipe : **ouvert**, **traité** (examiné ou corrigé) ou **rejeté** (sans fondement ou abus). Seule l’équipe fait évoluer l’état.
_Avoid_: Status, workflow

**Note interne (signalement)** :
Commentaire optionnel de l’équipe à la clôture ; invisible pour les joueurs.
_Avoid_: Résolution, feedback joueur

## Économie virtuelle

**Pièces** :
Monnaie gagnée en jeu (farming, bonus) et dépensée pour ouvrir des boosters.
_Avoid_: Crédits, gems, gold

## Boosters

**Définition de booster** :
Modèle de pack : prix en pièces, nombre de cartes tirées par ouverture, et répartition de probabilité entre les raretés du jeu (paramétrage produit, non figé dans le glossaire).
_Avoid_: SKU, template (en conversation métier)

**Ouverture** :
Action payante qui tire les cartes d’un pack et les ajoute à la collection du joueur, sans stocker de pack non ouvert.
_Avoid_: Achat de pack (quand on parle du paiement différé)

**Révélation** :
Étape après l’ouverture où le joueur retourne puis écarte les cartes tirées une par une, d’abord en dos de carte ; les cartes sont déjà en collection même s’il quitte avant la fin, puis un récapitulatif d’ouverture clôt l’expérience.
_Avoid_: Reveal, unboxing

**Ordre de révélation** :
Empilement des cartes à révéler, de la rareté la plus basse à la plus haute parmi celles du tirage ; à rareté égale, l’ordre du tirage est conservé.
_Avoid_: Ordre de tirage (côté serveur), tri du pack

**Récapitulatif d’ouverture** :
Écran de fin listant les cartes obtenues lors de cette ouverture, regroupées par espèce avec quantités ; le joueur le quitte explicitement pour revenir à l’écran d’où il est parti.
_Avoid_: Loot screen, résumé de drop

## Boutique boosters

**Boutique boosters** :
Espace où le joueur voit les packs proposés contre des pièces et peut les ouvrir.
_Avoid_: Catalogue, shop (trop vague)

**Fenêtre boutique** :
Intervalle de temps global (ex. trois minutes) auquel la vitrine de chaque joueur peut être renouvelée.
_Avoid_: Rotation (seul), saison

**Offre boutique** :
Les packs visibles pour un joueur pendant une fenêtre donnée : une liste d’emplacements, chacun affichant un type de booster. Générée côté serveur pour ce joueur et cette fenêtre, puis inchangée jusqu’au prochain reset (sauf emplacements épuisés).
_Avoid_: Drop, loot table (côté joueur)

**Emplacement boutique** :
Une case dans l’offre ; à chaque renouvellement, chaque emplacement reçoit un type de booster tiré selon les probabilités de la boutique. Le joueur peut l’ouvrir **au plus une fois** pendant la fenêtre : après ouverture, l’emplacement est épuisé.
_Avoid_: Slot (dans l’UI seulement si besoin)

**Boutique premium** (futur) :
Achats en monnaie réelle, séparés de la boutique boosters et du catalogue cartes.
_Avoid_: IAP shop, store

## Administration (équipe Wildia)

**Équipe Wildia** :
Personnes chargées d’exploiter et de modérer le jeu côté éditeur ; elles peuvent être dotées d’un accès dédié, distinct du parcours joueur ordinaire.
_Avoid_: Staff (libellé UI), admins (générique)

**Espace administration** :
Interface réservée aux membres équipe : tableau de bord et outils d’exploitation, visuellement et structurellement séparés du site joueur.
_Avoid_: Back-office (sans précision), panel, dashboard (comme nom métier)

**Membre équipe** :
Compte joueur auquel un **rôle d’équipe** a été attribué ; il utilise la même connexion que n’importe quel joueur, mais peut ouvrir l’espace administration.
_Avoid_: Utilisateur admin, compte staff, employé Auth

**Rôle d’équipe** :
Niveau de droit d’un membre dans l’espace administration : **super administrateur** (gestion des rôles et accès complets), **modérateur** (consultation étendue, sans gestion des rôles), **lecteur** (consultation seule). L’accès n’est jamais automatique selon le domaine d’e-mail ; il est toujours accordé explicitement.
_Avoid_: Role, permission (sans qualification), RBAC (jargon)

**Registre des comptes inscrits** :
Vue équipe qui recense tous les comptes joueur créés par **inscription**, en consultation seule dans le premier lot (identité affichée, dates, visibilité publique du profil).
_Avoid_: Liste utilisateurs, user list, annuaire joueurs
