# Administration — créer le premier super administrateur

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
