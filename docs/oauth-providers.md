# Fournisseurs OAuth — Google et Discord

Activer la connexion Google et Discord, en local et en production, sans lire le code. Aucun secret n’est versionné : les valeurs vivent dans `supabase/.env` en local, dans le dashboard Supabase en production. Le résumé est dans le [README](../README.md#fournisseurs-oauth-google-discord) ; ce document détaille les écrans à remplir et la checklist de recette.

Dans ce document, `<hôte-prod>` est le domaine public du site et `<project-ref>` la référence du projet Supabase de production.

## Comment ça marche

1. Le joueur clique « Continuer avec Google » (ou Discord) : l’action `signInWithProvider` demande à Supabase Auth l’URL d’autorisation, avec `redirectTo` = `{origine}/{locale}/auth/callback` (et `?returnTo=…` quand il y a une page où revenir).
2. Le fournisseur renvoie le joueur sur **Supabase Auth** (`/auth/v1/callback`), qui crée ou retrouve le compte.
3. Supabase Auth renvoie le joueur sur `{origine}/{locale}/auth/callback?code=…`, si cette URL est autorisée : son hôte est celui de la Site URL (quels que soient le port et le chemin), ou elle correspond à une Redirect URL. Sinon il retombe sur la Site URL, sans erreur visible.
4. Le callback de l’app échange le code contre une session, écrit la langue d’un compte tout juste créé, puis redirige vers `returnTo` ou l’accueil.

Deux familles d’URL sont donc à déclarer, à deux endroits différents.

| Où                                          | URL                                                                                                         | Déclarée dans                                                                                                                                    |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Redirect URI du fournisseur (Supabase Auth) | local `http://127.0.0.1:55321/auth/v1/callback` ; prod `https://<project-ref>.supabase.co/auth/v1/callback` | console Google Cloud, portail Discord (la valeur exacte est le « Callback URL (for OAuth) » affiché dans le panneau du fournisseur du dashboard) |
| Callback de l’app                           | voir ci-dessous                                                                                             | `supabase/config.toml` (local), dashboard Supabase (prod)                                                                                        |

Le port local `55321` est `[api] port` de `supabase/config.toml` : la redirect URI du fournisseur est la même que l’app tourne sur `localhost` ou sur `127.0.0.1`.

### Callbacks de l’app

| Environnement | `fr`                                                                                 | `en`                                                                                 |
| ------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Local         | `http://localhost:3000/fr/auth/callback`<br>`http://127.0.0.1:3000/fr/auth/callback` | `http://localhost:3000/en/auth/callback`<br>`http://127.0.0.1:3000/en/auth/callback` |
| Production    | `https://<hôte-prod>/fr/auth/callback`                                               | `https://<hôte-prod>/en/auth/callback`                                               |

Le `returnTo` s’ajoute en query (`…/fr/auth/callback?returnTo=%2Ffr%2Fboosters`) : l’autorisation doit l’accepter.

## Local

Les variables sont lues par la CLI Supabase seule (Next ne les lit pas). Les mettre dans `supabase/.env`, ignoré par git (règle `.env*` de la racine) ; exporter les variables dans le shell fonctionne aussi. `.env.example` les liste, vides et commentées.

```bash
# supabase/.env
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=…
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=…
SUPABASE_AUTH_EXTERNAL_DISCORD_CLIENT_ID=…
SUPABASE_AUTH_EXTERNAL_DISCORD_SECRET=…
```

Puis `npx supabase stop && npx supabase start` (la base est conservée).

Dans `supabase/config.toml`, les deux fournisseurs sont déjà activés. Google a `skip_nonce_check = true`, requis en local (sinon la connexion échoue sur le contrôle du nonce). `[auth] additional_redirect_urls` autorise `http://127.0.0.1:3000/**` et `http://localhost:3000/**` : les deux hôtes, tout chemin, toute query. (L’hôte de la Site URL, `127.0.0.1`, est de toute façon accepté sur n’importe quel port.)

Une variable absente ne fait pas échouer le démarrage : Supabase garde le texte `env(NOM)` comme identifiant, et le fournisseur refuse. Pour vérifier que les variables sont lues, l’URL d’autorisation doit contenir le vrai identifiant :

```bash
curl -si "http://127.0.0.1:55321/auth/v1/authorize?provider=discord" | grep -i '^location'
# client_id=<ton identifiant>, pas client_id=env%28…%29
```

(`/auth/v1/settings` ne suffit pas : il affiche `true` dès que le fournisseur est activé dans `config.toml`.)

## Applications chez les fournisseurs

Créer **deux applications par fournisseur**, une pour le local et une pour la production : un secret local qui fuit n’oblige pas à tourner celui de la prod.

### Google (Google Cloud Console, section Google Auth Platform)

1. **Projet** : sur [console.cloud.google.com](https://console.cloud.google.com), créer (ou choisir) un projet — un pour le local, un pour la production.
2. **Google Auth Platform → Get started** (assistant de création) : nom de l’application (« Wildia TCG »), e-mail de support utilisateur, audience **External** (« Internal » demande une organisation Google Workspace), e-mail de contact développeur ; accepter la politique de données, puis **Create**.
3. **Branding** : nom, e-mail de support, logo (facultatif). En production, renseigner aussi la page d’accueil, la politique de confidentialité et les conditions d’utilisation du site, et ajouter aux **Authorized domains** le domaine du site **et** `<project-ref>.supabase.co`. Le nom et le logo ne s’affichent sur l’écran de consentement qu’après la **vérification de la marque** par Google (quelques jours ouvrés) ; sans elle, le joueur voit `<project-ref>.supabase.co`.
4. **Audience** :
   - local : laisser le statut **Testing** et ajouter son compte Google (et ceux des testeurs) dans **Test users** ; personne d’autre ne peut se connecter ;
   - production : **Publish app** pour passer en **In production**. Supabase indique qu’aucune vérification de l’application n’est demandée tant que seuls des scopes non sensibles sont utilisés ; si Google la réclame à la publication, la soumettre.
5. **Data Access** : `.../auth/userinfo.email` et `.../auth/userinfo.profile` sont présents par défaut ; ajouter **`openid` à la main**. Rien d’autre (scopes non sensibles).
6. **Clients → Create client**, type **Web application** :
   - **Authorized redirect URIs** : la redirect URI de Supabase Auth du tableau ci-dessus (locale `http://127.0.0.1:55321/auth/v1/callback` pour l’application locale ; en prod, recopier le « Callback URL (for OAuth) » du panneau Google du dashboard, `https://<project-ref>.supabase.co/auth/v1/callback`, qui reste juste avec un domaine personnalisé). Elle doit correspondre exactement (schéma, port, chemin, sans barre finale) ;
   - **Authorized JavaScript origins** : facultatif pour ce flux par redirection (Supabase conseille l’URL du site : `http://localhost:3000` en local, `https://<hôte-prod>` en prod).
7. **Copier le Client ID et le Client secret tout de suite** : Google n’affiche le secret qu’à la création. Perdu, il faut en générer un nouveau.

### Discord (portail développeur)

1. [discord.com/developers/applications](https://discord.com/developers/applications) → **New Application**.
2. **OAuth2 → Redirects** : la redirect URI de Supabase Auth du tableau ci-dessus (en prod, le « Callback URL (for OAuth) » du panneau Discord du dashboard).
3. **OAuth2 → Client information** : copier le Client ID, puis **Reset Secret** pour obtenir le Client secret.
4. Les scopes `identify` et `email` sont demandés par Supabase Auth ; rien à cocher.

## Production

### Dashboard Supabase

Régler d’abord l’**URL Configuration**, puis activer les fournisseurs.

**Authentication → URL Configuration** :

- **Site URL** : `https://<hôte-prod>`, l’hôte que les visiteurs utilisent vraiment : un callback est accepté dès que son hôte est celui de la Site URL, quels que soient le port et le chemin.
- **Redirect URLs** : `https://<hôte-prod>/*/auth/callback**`. Sur l’hôte de la Site URL, ce motif n’ajoute rien : il consigne explicitement les callbacks attendus (les deux langues, avec ou sans `returnTo`). La garde est « l’hôte de la Site URL, plus cette liste, et aucun autre hôte » ; jamais de joker sur l’hôte, car le callback de l’app prend l’hôte des en-têtes de la requête sans le contrôler.

**Authentication → Sign In / Providers** :

- **Google** : activer, coller Client ID et secret. **Skip nonce checks** désactivé (ce réglage n’est que pour le local).
- **Discord** : activer, coller Client ID et secret. **Allow users without an email** désactivé.

Les secrets ne vont jamais dans Vercel : aucune variable `SUPABASE_AUTH_EXTERNAL_*` n’y est définie.

### Aperçus Vercel : non pris en charge

Un déploiement d’aperçu a un hôte qui n’est ni celui de la Site URL ni dans les Redirect URLs : après le fournisseur, le visiteur atterrit sur l’accueil de la prod, déconnecté (avec `?code=` dans l’URL). C’est voulu : pas de joker d’aperçu dans Supabase. Tester OAuth en local, ou sur la prod.

### Checklist d’activation

1. `npm run db:migrate` **avant** d’activer Google ou Discord, puis vérifier que `20261126130000` figure comme appliquée (`npx supabase migration list --linked`). La migration `20261126130000_oauth_identity_guard.sql` pose le déclencheur `private.guard_provider_identity` ; sans lui, un compte pré-inscrit par e-mail avec l’adresse d’un autre pourrait capter la connexion Google ou Discord de son propriétaire (voir `docs/security.md`).
2. Vérifier **Authentication → Sign In / Providers → Email → Confirm email** :
   - désactivé (cas du local) : une adresse inscrite par e-mail ne peut pas se lier à Google ou Discord, la connexion est refusée avec `account_refused`, jusqu’à CYR-119 (qui rétablit la confirmation) ;
   - activé : la pré-inscription d’une adresse tierce est déjà couverte ; le refus R2 du déclencheur reste en défense en profondeur.
3. Créer les applications Google et Discord **de production** (section précédente).
4. Dashboard Supabase : régler l’URL Configuration **avant** d’activer les deux fournisseurs (section précédente).
5. Dérouler les parcours G1–G4, D1–D4, I1–I3 et P1–P2 de la checklist de recette ci-dessous sur `https://<hôte-prod>`, en `fr` et en `en` (S1–S3 et G5 ne concernent que le local).
6. Nettoyer : ces parcours laissent des comptes de test dans la base de production. Les supprimer dans **Authentication → Users**.

## Checklist de recette (manuelle)

À faire avant la fusion (avec les applications de dev) puis à l’activation en production. En production, remplacer `http://localhost:3000` par `https://<hôte-prod>`, et répéter les parcours en `fr` et en `en`. Studio local : http://127.0.0.1:54323 ; en production, l’éditeur de table du dashboard Supabase.

### Mise en route (local)

- [ ] **S1 — Google, mise en route.** Créer l’application OAuth (redirect URI de Supabase Auth), renseigner les variables, puis `npx supabase stop && npx supabase start`.
- [ ] **S2 — Discord, mise en route.** Sans les variables, `npx supabase start` démarre. Avec elles et un redémarrage, l’URL d’autorisation de Discord porte le vrai `client_id` (voir « Local »).
- [ ] **S3 — Local, variables lues depuis `supabase/.env`.** Avec les quatre variables **seulement** dans `supabase/.env` : Google depuis `http://localhost:3000/en/login?returnTo=%2Fen%2Fcollection` arrive sur `/en/collection`, connecté ; Discord depuis `http://127.0.0.1:3000/fr/signup` arrive sur `/fr`.

### Google

- [ ] **G1 — Inscription.** Nouveau compte Google depuis `/en/signup` : arrivée sur `/en`, connecté. Dans Studio, `profiles.locale = en`, avec le nom et l’avatar Google.
- [ ] **G2 — Retour sur la page voulue.** **Au moins 5 minutes après G1** (le compte n’est plus « tout juste créé »), se déconnecter, ouvrir `/fr/login?returnTo=/fr/boosters`, puis Google : arrivée sur `/fr/boosters`, `locale` toujours `en`.
- [ ] **G3 — Refus.** Annuler sur l’écran de Google : retour sur `/fr/login` avec le message de refus et le `returnTo` conservé.
- [ ] **G4 — Même adresse que le compte e-mail.** S’inscrire par e-mail avec une adresse Gmail, puis Google avec la même adresse : **refusé** avec `account_refused` (R2), jusqu’à CYR-119.
- [ ] **G5 — Les deux hôtes (local).** Répéter G1 sur `http://localhost:3000` et sur `http://127.0.0.1:3000`.

### Discord

- [ ] **D1 — Inscription.** Nouveau compte depuis `/fr/signup` : l’écran de Discord demande l’e-mail. Arrivée sur `/fr`, connecté, avec le nom d’affichage Discord (ou le pseudo), l’avatar personnalisé importé, et `locale = fr`.
- [ ] **D2 — Connexion.** Depuis `/en/login?returnTo=/en/collection` : arrivée sur la collection. Une seconde connexion réutilise le même compte.
- [ ] **D3 — Refus.** Refuser le consentement : message de refus, aucune ligne dans `auth.users`.
- [ ] **D4 — E-mail non vérifié.** Un compte Discord dont l’e-mail n’est pas vérifié : message `account_refused`, aucune ligne dans `auth.users`.
- [ ] **D5 — Interface.** Anneau de focus visible au clavier ; logos conformes aux chartes de Google et de Discord ; textes EN relus.

### Garde d’identité

- [ ] **I1 — Compte e-mail, puis Discord.** Compte e-mail X, puis Discord (vérifié) avec l’adresse de X : refusé avec `account_refused`, le compte X est inchangé.
- [ ] **I2 — E-mail Discord non vérifié.** Discord avec un e-mail non vérifié égal à celui d’un compte existant : refusé, aucune identité ajoutée.
- [ ] **I3 — Google, puis Discord.** Compte Google, puis Discord vérifié avec la même adresse : même compte, deux identités.

### Production seulement

- [ ] **P1 — Hôtes.** Les parcours G1, G2, D1 et D2 en `fr` **et** en `en` : le retour se fait toujours sur `https://<hôte-prod>/{locale}/…`, jamais sur la Site URL par défaut.
- [ ] **P2 — Secrets.** Aucune variable `SUPABASE_AUTH_EXTERNAL_*` dans Vercel ni dans le dépôt.

## Dépannage

| Symptôme                                                                 | Cause probable                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Google : `redirect_uri_mismatch`                                         | la redirect URI de Supabase Auth n’est pas déclarée, ou pas à l’identique (schéma, port, chemin), dans la console Google                                                                                                                                                                               |
| Google : `invalid_client`                                                | Client ID ou secret faux, ou variable non lue : relancer `npx supabase stop && npx supabase start` et vérifier l’URL d’autorisation                                                                                                                                                                    |
| Retour sur l’accueil, déconnecté, avec `?code=` dans l’URL               | l’URL de callback n’est pas autorisée : Supabase retombe sur la Site URL. En local, l’hôte n’est ni `127.0.0.1` ni dans `additional_redirect_urls`. En prod, le visiteur est passé par un hôte autre que celui de la Site URL (alias `www.`, `*.vercel.app`, aperçu)                                   |
| JSON brut `provider is not enabled`                                      | le fournisseur n’est pas activé : `enabled` dans `config.toml` en local, dashboard en prod                                                                                                                                                                                                             |
| Connexion qui échoue en local quand l’app ne tourne pas sur le port 3000 | sur `127.0.0.1`, n’importe quel port fonctionne (c’est l’hôte de la Site URL). Sur `localhost:<port>`, ouvrir l’app sur `http://127.0.0.1:<port>`, ou ajouter `http://localhost:<port>/**` à `additional_redirect_urls` en local **sans le committer** (un test fige la liste), puis relancer Supabase |
| Google local : erreur de nonce                                           | `skip_nonce_check = true` retiré de `[auth.external.google]`                                                                                                                                                                                                                                           |
