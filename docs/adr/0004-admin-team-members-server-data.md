# Administration équipe : table `team_members` et données via le serveur

L’espace administration est réservé aux **membres équipe** (comptes joueur avec un rôle d’équipe explicite). Les rôles ne vivent pas dans `profiles` ni dans les métadonnées Auth : ils sont enregistrés dans une table dédiée `team_members` (un compte, un rôle parmi super administrateur, modérateur, lecteur). Aucun accès automatique par domaine d’e-mail.

Les écrans admin (tableau de bord, registre des comptes inscrits) ne lisent jamais Supabase depuis le navigateur. Tout agrégat et toute liste passe par `server/` avec le service role (ou équivalent réservé au serveur), après garde `requireStaff`. La RLS côté joueur reste stricte ; l’administration ne s’appuie pas sur des policies « staff lisent tout » exposées au client.

Le premier super administrateur est créé hors application (migration / ops). En MVP, pas d’UI de gestion des rôles : seul le modèle de données et les gardes serveur préparent les évolutions.