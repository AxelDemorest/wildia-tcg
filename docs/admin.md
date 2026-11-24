# Administration — premier super administrateur et paramètres du jeu

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

La page « Paramètres » (`/{locale}/admin/settings`) règle deux paramètres d’`economy_config` qui ne se changeaient qu’en SQL. Elle est réservée au **super administrateur** : un modérateur ou un lecteur n’a pas l’entrée dans la navigation, et l’URL le renvoie vers l’accueil admin, sans page d’erreur.

| Paramètre              | Clé                       | Bornes                        | Prise d’effet                                                                                                                          |
| ---------------------- | ------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Multiplicateur du farm | `farm_global_multiplier`  | 0 à 5, deux décimales au plus | Au prochain calcul de chaque joueur (`sync_user_economy`), sur tout le temps écoulé depuis son dernier calcul (voir `docs/economy.md`) |
| Emplacements par offre | `booster_shop_slot_count` | Entier de 1 à 12              | Aux offres boutique créées ensuite ; une offre déjà créée garde ses emplacements jusqu’à la fin de sa fenêtre boutique                 |

- Chaque carte a son bouton « Enregistrer ». Une valeur hors bornes est refusée par le serveur avec un message sous le champ, et rien n’est écrit. Le navigateur ne contrôle rien lui-même (formulaire `noValidate`).
- Enregistrer la valeur déjà en place n’écrit rien et n’ajoute pas de ligne ; la carte affiche quand même « Enregistré ».
- Aucun cache à invalider : `economy_config` est relue à chaque calcul du farm et à chaque création d’offre.
- Les bornes de l’interface sont plus étroites que le garde-fou SQL de la boutique (emplacements arrondis et bornés entre 0 et 20) : une valeur posée en SQL hors des bornes de la page reste lue par le jeu, mais ne peut pas être restaurée depuis la page.

### Historique des paramètres

Chaque valeur changée ajoute une ligne à `public.admin_setting_changes`, dans la même transaction que la mise à jour : la fonction `admin_set_economy_config` lit l’ancienne valeur sous verrou de ligne, change la valeur et écrit la ligne. Deux changements simultanés s’appliquent l’un après l’autre (le dernier l’emporte), et chaque ligne garde la valeur que le précédent avait laissée.

- Une ligne : `scope` / `target` / `field` nomment le paramètre (`('economy_config', 'farm_global_multiplier', null)` ici ; les boosters de CYR-118 écriront par exemple `('booster_definition', 'premium', 'cost_coins')` sans changer le schéma), `old_value` et `new_value` sont des scalaires JSON (un booléen reste un booléen), plus l’auteur, la date et `restored_from`.
- La page affiche les 20 derniers changements, du plus récent au plus ancien (ordre des identifiants), sans pagination : date à l’heure de Paris, auteur, paramètre, Avant, Après. L’auteur est son nom affiché, « Membre équipe » sans nom, « Compte supprimé » quand son compte a été supprimé (la ligne reste, sans auteur). Jamais l’e-mail.
- Les lignes ne sont jamais purgées. Il n’y a pas de trigger « ajout seulement » : il bloquerait la mise à `null` de l’auteur quand son compte est supprimé, et les tests effacent leurs propres lignes.

### Restaurer

« Restaurer » sur une ligne remet sa valeur « Avant », après une boîte de confirmation (« Annuler » ou Échap la ferment, un clic à côté non). La restauration est elle-même une ligne de l’historique : même paramètre, pastille « Restauration », Avant = la valeur au moment de la restauration, Après = la valeur remise, `restored_from` = la ligne restaurée. Une ligne de restauration se restaure aussi.

- Le navigateur n’envoie que l’identifiant de la ligne : le serveur relit le paramètre et la valeur à remettre.
- La valeur remise passe par les mêmes bornes qu’une saisie : une valeur « Avant » hors bornes (posée en SQL) est refusée, avec le message du champ, dans la boîte de confirmation qui reste ouverte.
- Restaurer une valeur égale à la valeur en place n’écrit rien et ferme la boîte.
