# OPINOVA

_Your opinion, your impact._

Plateforme de sondages et de votes en temps réel : Node.js / Express, MySQL (Sequelize), Socket.IO, React (Vite + Tailwind), génération de sondages par IA (OpenRouter).

## Lancer le projet
1. Créer une base MySQL vide (`CREATE DATABASE sondage;`).
2. `server/` :   `npm install && npm start`.
   Les tables sont créées automatiquement (`sequelize.sync()`).
3. `client/` :  `npm install && npm run dev`.
4. Promouvoir un admin : `UPDATE users SET role='admin' WHERE email='...';`
5. Base existante d'une ancienne version : voir `server/migrations/`.

## Fonctionnement
- **Rôles** : `user` (crée, vote, consulte) et `admin` (voit et gère tous les sondages).
- **Sondage = brouillon** à la création. Le créateur (ou un admin) le relit, le modifie (tant qu'il n'a aucun vote) puis le **publie**.
- **Deux catégories** : « sondage » (résultats en direct pour les participants) et « vote » (résultats et gagnant visibles après la clôture).
- **Règles de vote** : authentification obligatoire, un seul vote par utilisateur et par sondage (contrainte unique `poll_id + user_id`), pas de vote sur son propre sondage, refus après la clôture (vérifié côté serveur).
- **Résultats** : nombre total de votes, nombre de votes et pourcentage par proposition, calculés côté application depuis MySQL.
- **Socket.IO** : une room par sondage (`poll-<id>`) pour les mises à jour en direct, une room par utilisateur (`user-<id>`) pour les notifications de clôture. Connexion authentifiée par le cookie JWT.
- **Clôture automatique** : tâche cron serveur chaque minute, puis événement `poll-closed`.
- **IA** : `POST /api/poll/generate` (thème + nombre de propositions) renvoie du JSON à vérifier/modifier avant enregistrement. La clé API reste dans le `.env` du serveur.

## Base de données
`users`, `polls`, `poll_options`, `votes` (+ `chats`, `notifications`, `password_resets`).
L'API renvoie `options` sous forme de tableau de textes et accepte `option_selected` (texte) pour voter ; le serveur le convertit en `option_id`.

## Groupes et sous-groupes
- **Structure** : groupes (DUT, Bachelor…) et sous-groupes (DAIA, CISIA, Génie Informatique, Génie Mécanique…), tables `study_groups` (auto-référencée via `parent_id`) et `group_members`. Au premier démarrage, DUT (Génie Informatique, Génie Mécanique) et Bachelor (DAIA, CISIA) sont créés ; l'admin gère la suite depuis la page **/groups**.
- **Appartenance** : un utilisateur *demande* à rejoindre un groupe depuis **/groups** ; la demande reste « en attente » jusqu'à validation par un admin (section « Demandes d'adhésion »). Seuls les membres validés ont accès. Être membre d'un sous-groupe donne aussi accès aux sondages du groupe parent (Génie Info → DUT), jamais à ceux d'un autre sous-groupe (Génie Mécanique).
- **Sondage de groupe** : à la création, le champ « Destinataires » (`group_id`) réserve le sondage à un groupe (vide = public). Pour un sondage de groupe, le serveur refuse à tout non-membre (sauf admin et créateur) : la liste, le détail, le vote, les résultats, le chat et la room Socket.IO (`lib/groupAccess.js`).
- **Suppression** : un groupe qui contient des sondages ne peut pas être supprimé (ils deviendraient publics).
- **Base existante** : la colonne `polls.group_id` est ajoutée automatiquement au démarrage (`lib/bootstrapGroups.js`) ; le script équivalent est `server/migrations/002_groups.sql`.
