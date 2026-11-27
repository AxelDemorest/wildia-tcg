# Administration — premier super administrateur, paramètres du jeu et ajout de pièces

Le rôle d’équipe d’un compte vit dans `public.team_members` (voir `docs/adr/0004-admin-team-members-server-data.md`). La table n’est accessible qu’au service role : aucun écran ni appel client ne peut y écrire. Le premier **super administrateur** est donc créé en SQL, une seule fois par base. Aucune ligne n’est semée par les migrations et aucun UUID n’est écrit en dur : le compte est retrouvé par son e-mail.

Les rôles ne s’accordent jamais selon le domaine d’e-mail : chaque accès est donné explicitement, compte par compte.

## Où l’exécuter

- **Supabase hébergé** : éditeur SQL du projet Supabase (il tourne avec les droits du propriétaire de la base).
- **Local** : l’éditeur SQL du Studio local, ou un fichier avec `npx supabase db query --local -f <fichier>.sql`. Ne pas passer le SQL en argument entre guillemets : le shell remplace chaque `$$` par un numéro de processus et casse le bloc. `db query -f` n’accepte qu’une instruction par fichier : le bloc `do` va seul dans son propre fichier.

Le compte doit déjà exister : la personne s’inscrit d’abord comme n’importe quel joueur.

## Donner le rôle `super_admin`

Remplacer l’adresse (et le rôle si besoin). Le bloc s’arrête avec une erreur explicite si aucun compte, ou plusieurs comptes, ont cet e-mail, et donne le rôle choisi même si le compte en avait déjà un autre.

Les trois rôles : `super_admin` (seul rôle destiné à changer les rôles), `moderator` et `viewer`.

```sql
do $$
declare
  v_email text := 'prenom.nom@example.com';
  v_role public.team_role := 'super_admin';
  v_user_id uuid;
begin
  select id into strict v_user_id from auth.users where lower(email) = lower(v_email);

  insert into public.team_members (user_id, role)
  values (v_user_id, v_role)
  on conflict (user_id) do update set role = excluded.role;
exception
  when no_data_found then
    raise exception 'Aucun compte avec l’e-mail %', v_email;
  when too_many_rows then
    raise exception 'Plusieurs comptes ont l’e-mail %', v_email;
end
$$;
```

## Vérifier

Exécuter la requête de vérification dans son propre fichier (`-f`) ou dans l’éditeur SQL du Studio.

```sql
select u.email, t.role, t.created_at
from public.team_members t
join auth.users u on u.id = t.user_id
order by t.created_at;
```

## Changer ou retirer un rôle

Dans le MVP il n’y a pas d’interface : pour changer un rôle, relancer le bloc ci-dessus avec le même e-mail et un autre `v_role`. Retirer l’accès se fait avec :

```sql
delete from public.team_members
where user_id = (select id from auth.users where lower(email) = lower('prenom.nom@example.com'));
```

Exécuter ce `delete` seul dans son propre fichier (`-f`) ou dans l’éditeur SQL du Studio.

Supprimer un compte supprime aussi son rôle (suppression en cascade). Quand un écran de gestion des rôles existera, garder au moins un super administrateur pour que quelqu’un puisse encore gérer les rôles depuis l’application.

## Paramètres du jeu

La page « Paramètres » (`/{locale}/admin/settings`) règle deux paramètres d’`economy_config` et les définitions de booster, qui ne se changeaient qu’en SQL. Elle est réservée au **super administrateur** : un modérateur ou un lecteur n’a pas l’entrée dans la navigation, et l’URL le renvoie vers l’accueil admin, sans page d’erreur.

| Paramètre              | Clé                       | Bornes                        | Prise d’effet                                                                                                                          |
| ---------------------- | ------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Multiplicateur du farm | `farm_global_multiplier`  | 0 à 5, deux décimales au plus | Au prochain calcul de chaque joueur (`sync_user_economy`), sur tout le temps écoulé depuis son dernier calcul (voir `docs/economy.md`) |
| Emplacements par offre | `booster_shop_slot_count` | Entier de 1 à 12              | Aux offres boutique créées ensuite ; une offre déjà créée garde ses emplacements jusqu’à la fin de sa fenêtre boutique                 |

- Chaque carte a son bouton « Enregistrer ». Une valeur hors bornes est refusée par le serveur avec un message sous le champ, et rien n’est écrit. Le navigateur ne contrôle rien lui-même (formulaire `noValidate`).
- Enregistrer la valeur déjà en place n’écrit rien et n’ajoute pas de ligne ; la carte affiche quand même « Enregistré ».
- Aucun cache à invalider : `economy_config` est relue à chaque calcul du farm et à chaque création d’offre.
- Les bornes de l’interface sont plus étroites que le garde-fou SQL de la boutique (emplacements arrondis et bornés entre 0 et 20) : une valeur posée en SQL hors des bornes de la page reste lue par le jeu, mais ne peut pas être restaurée depuis la page.

### Boosters

La section « Boosters » a une carte par définition de booster (`booster_definitions`, dans l’ordre `sort_order`), un booster inactif compris pour pouvoir le réactiver. La carte est titrée par le nom court du booster (`Boosters.pack.<slug>.short`) ; un booster ajouté en base sans ce message affiche son slug, dans sa carte, dans l’historique et dans la boîte de restauration. Le nom, le slug et l’ordre ne se changent pas depuis la page.

| Valeur                                  | Bornes                                               | Prise d’effet                                                                                                                                 |
| --------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Actif (interrupteur)                    | Oui / Non                                            | Aux offres créées ensuite ; un emplacement déjà tiré ne s’ouvre plus (voir plus bas)                                                          |
| Prix                                    | Entier de 1 à 100 000 pièces                         | À la prochaine ouverture, qui débite le nouveau prix ; une vitrine déjà affichée montre l’ancien jusqu’à son rechargement (`docs/economy.md`) |
| Cartes par booster                      | Entier de 1 à 10                                     | À la prochaine ouverture                                                                                                                      |
| Poids boutique                          | Entier de 0 à 1 000 ; à 0, le booster n’est pas tiré | Aux offres créées ensuite                                                                                                                     |
| Chances par rareté (Commune à Mythique) | Entiers de 0 à 1 000, au moins une au-dessus de 0    | À la prochaine ouverture                                                                                                                      |

- Un seul « Enregistrer » par carte, l’interrupteur compris : un clic sur « Actif » ne s’enregistre pas seul. Le navigateur envoie toute la carte et ne contrôle rien lui-même ; le serveur refuse toute valeur hors bornes ou qui n’est pas un entier écrit en chiffres (« 5.0 », « 0,5 », « 1e3 »), et signale toutes les valeurs refusées à la fois, chacune sous son champ (une chance refusée : un message sous la grille des chances), sans rien écrire.
- Les valeurs inchangées n’écrivent rien : seules les valeurs changées ont leur ligne d’historique, toutes écrites ou aucune.
- Les chances sont relatives : chaque rareté affiche sa part du total des chances (« 55 % », une décimale au plus), et la carte affiche ce total (« Total des chances : 100 »). Sous le poids boutique, la part des emplacements (« 70 % des emplacements ») est calculée sur les boosters actifs de poids positif seulement, comme le tirage de l’offre : un booster inactif ou de poids 0 affiche 0 % et sort du total des autres. Ces nombres viennent des valeurs enregistrées : ils changent après « Enregistrer », pas pendant la saisie.
- Deux règles sont vérifiées en SQL par `admin_set_booster_definition`, sur l’état des boosters après le changement et sous un verrou de toute la table `booster_definitions` (deux désactivations simultanées des deux derniers boosters disponibles ne passent pas toutes les deux). Il reste toujours au moins un booster actif avec un poids boutique positif, sinon l’offre boutique serait vide : « Au moins un booster doit rester actif, avec un poids boutique supérieur à 0. », dans la carte. Chaque booster garde au moins une chance positive, même inactif : « Au moins une chance doit être supérieure à 0. », sous les chances. Un changement refusé n’écrit rien.
- Désactiver un booster ou mettre son poids à 0 l’écarte des offres créées ensuite. Les emplacements déjà tirés dans l’offre en cours d’un joueur restent affichés avec « Ouvrir » jusqu’à la fin de leur fenêtre boutique (180 s au plus). Après une désactivation, ils ne s’ouvrent plus : « Ce booster n’est plus disponible. » (`booster_unavailable`), sans rien débiter, jusqu’à la fenêtre suivante ou une réactivation. Une ouverture en cours au moment du changement se termine d’abord (verrou `FOR SHARE` d’`open_booster_shop_slot`). Les joueurs ne voient pas un booster inactif (RLS). La page ne le rappelle pas.
- Les chances publiées aux joueurs (CYR-98, transparence des tirages) doivent lire les mêmes définitions : rien n’est à recopier quand elles changent ici.

### Historique des paramètres

Chaque valeur changée ajoute une ligne à `public.admin_setting_changes`, dans la même transaction que la mise à jour : la fonction `admin_set_economy_config` (`admin_set_booster_definition` pour un booster) lit l’ancienne valeur sous verrou (de la ligne d’`economy_config`, de toute la table `booster_definitions`), change la valeur et écrit la ligne. Deux changements simultanés s’appliquent l’un après l’autre (le dernier l’emporte), et chaque ligne garde la valeur que le précédent avait laissée.

- Une ligne : `scope` / `target` / `field` nomment le paramètre (`('economy_config', 'farm_global_multiplier', null)`, ou `('booster_definition', 'premium', 'cost_coins')` pour le prix du booster Premium, affiché « Premium · prix »), `old_value` et `new_value` sont des scalaires JSON (un booléen reste un booléen), plus l’auteur, la date et `restored_from`.
- Les champs d’un booster : `cost_coins` (« Premium · prix »), `slots` (« · cartes »), `shop_weight` (« · poids boutique »), `is_active` (« · actif », Avant et Après « Oui » / « Non ») et `rarity_weights.<rareté>` (« Standard · chances Rare »). Un « Enregistrer » qui change plusieurs valeurs écrit ses lignes dans cet ordre, à la même date, celle aussi de `updated_at` du booster. Une rareté absente de `rarity_weights` (les boosters semés n’ont pas de clé `mythic`) vaut 0 : sa première ligne a un Avant de 0, et la clé n’est ajoutée qu’une fois la chance changée.
- La page affiche les 20 derniers changements, du plus récent au plus ancien (ordre des identifiants), sans pagination : date à l’heure de Paris, auteur, paramètre, Avant, Après. L’auteur est son nom affiché, « Membre équipe » sans nom, « Compte supprimé » quand son compte a été supprimé (la ligne reste, sans auteur). Jamais l’e-mail.
- Les lignes ne sont jamais purgées. Il n’y a pas de trigger « ajout seulement » : il bloquerait la mise à `null` de l’auteur quand son compte est supprimé, et les tests effacent leurs propres lignes.

### Restaurer

« Restaurer » sur une ligne remet sa valeur « Avant », après une boîte de confirmation (« Annuler » ou Échap la ferment, un clic à côté non). La restauration est elle-même une ligne de l’historique : même paramètre, pastille « Restauration », Avant = la valeur au moment de la restauration, Après = la valeur remise, `restored_from` = la ligne restaurée. Une ligne de restauration se restaure aussi.

- Le navigateur n’envoie que l’identifiant de la ligne : le serveur relit le paramètre et la valeur à remettre.
- La valeur remise passe par les mêmes bornes qu’une saisie : une valeur « Avant » hors bornes (posée en SQL) est refusée, avec le message du champ, dans la boîte de confirmation qui reste ouverte.
- Une ligne de booster remet sa seule valeur : les autres valeurs du booster, ses autres chances comprises, restent comme elles sont. Les deux règles des boosters s’appliquent aussi : restaurer une valeur qui viderait l’offre boutique, ou qui laisserait les six chances à 0, est refusé avec le même message qu’un enregistrement, dans la boîte qui reste ouverte, et rien n’est écrit.
- Une ligne d’un booster supprimé depuis n’a pas de bouton « Restaurer ».
- Restaurer une valeur égale à la valeur en place n’écrit rien et ferme la boîte.

## Ajout de pièces

Le **super administrateur** ajoute des pièces à n’importe quel compte, le sien compris, depuis le registre des comptes inscrits (`/{locale}/admin/accounts`) : bouton à icône seule (« + pièce », libellé « Ajouter des pièces » en info-bulle) au bout de chaque ligne, puis une boîte de confirmation avec le montant et un motif facultatif. Le modérateur et le lecteur n’ont pas le bouton, et l’action refuse tout autre rôle ; pour eux, le sous-titre du registre dit toujours « consultation seule ».

- Montant : entier de 1 à 9 999 999 999 (la limite de la colonne `amount` du journal des pièces), écrit en chiffres seulement. Motif : 200 caractères au plus, espaces en bord retirés (un emoji compte pour un caractère) ; vide ou blanc, l’ajout n’a pas de motif. Le navigateur ne contrôle rien lui-même : le serveur refuse une valeur hors bornes avec un message sous son champ (les deux champs à la fois s’il le faut), la boîte reste ouverte avec ce qui a été saisi, et rien n’est écrit.
- `admin_grant_coins` écrit dans une seule transaction une ligne d’`admin_coin_grants` (compte, montant, motif, auteur, date) et une ligne `admin_adjust` positive dans `currency_ledger`, dont `reference_id` pointe vers la première. La ligne du journal, que le joueur lit, ne porte ni l’auteur ni le motif (`metadata` vide, voir `docs/adr/0004-admin-team-members-server-data.md`). Le joueur voit son nouveau solde au prochain affichage, sans notification.
- Après l’ajout, la boîte se ferme et une notification apparaît en bas à droite de l’écran : « 500 pièces ajoutées à {nom}. » (montant écrit pour la langue, nom affiché du compte, à défaut son e-mail). Elle disparaît seule après 5 secondes, un nouvel ajout la remplace, et la ligne n’affiche rien. C’est une région `role="status"` toujours présente dans l’espace administration (`AdminNotifications`, `components/admin/admin-notifications.tsx`), que les lecteurs d’écran annoncent. Le registre rafraîchit la page (`refresh()` de l’action) : la colonne « Solde » de la ligne affiche le nouveau solde, et la notification reste.
- Un compte supprimé entre l’affichage du registre et la confirmation est refusé par la fonction SQL : « Ce compte n’existe plus. », dans la boîte, sans rien écrire. Tout autre échec : « L’ajout a échoué. Réessayez dans un instant. », dans la boîte aussi.
- « Ajouter » est désactivé pendant l’envoi : un double clic n’ajoute qu’une fois. Il n’y a pas de jeton d’idempotence : deux confirmations font deux ajouts.
- Ajout seulement, pas de retrait depuis l’application. Pas de limite par compte ni par auteur, et rien dans l’historique des paramètres.
- Les ajouts reçus par un compte sont supprimés avec lui (comme son journal) ; un ajout reste quand le compte de son auteur est supprimé, sans auteur.

### Solde dans le registre

Tous les membres équipe (super administrateur, modérateur, lecteur) lisent dans le registre une colonne « Solde » (en « Balance »), juste après « Profil » : la pièce du jeu et le montant écrit pour la langue (fr « 1 250 », en « 1,250 »). C’est le **solde au dernier calcul** : la somme du journal des pièces du compte (`currency_ledger`, ajouts de pièces et achats de boosters compris), 0 sans mouvement. Le registre le lit sans rien écrire (il n’appelle jamais `sync_user_economy`) : le farm n’est compté qu’à la visite du joueur, donc ce solde peut être plus bas que celui que le joueur verra à sa prochaine visite. L’en-tête de la colonne le rappelle en info-bulle.

### Consulter les ajouts passés

Il n’y a pas d’écran pour les ajouts passés : ils se lisent en SQL. Exécuter la requête dans son propre fichier (`-f`) ou dans l’éditeur SQL (voir « Où l’exécuter »). Du plus récent au plus ancien, date à l’heure de Paris :

```sql
select g.created_at at time zone 'Europe/Paris' as date_paris,
       target.email as compte,
       g.amount::bigint as montant,
       g.reason as motif,
       author.email as auteur
from public.admin_coin_grants g
join auth.users target on target.id = g.user_id
left join auth.users author on author.id = g.author_id
order by g.created_at desc;
```

Un auteur vide : son compte a été supprimé. Pour un seul compte, ajouter `where lower(target.email) = lower('prenom.nom@example.com')` avant `order by`.
