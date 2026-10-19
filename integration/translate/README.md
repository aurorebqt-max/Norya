# Changements préparés pour le dépôt Translate

La copie `/tmp/norya-translate` est restée en lecture seule. Aucun SQL exécuté.

1. Sauvegarder la base dans un emplacement privé durable. Exécuter, après revue,
   `001-private-publication.sql` dans le projet Supabase de Translate.
2. Dans le vrai dépôt Translate, contrôler puis appliquer `strict-publication.patch`
   (`git apply --check`, puis `git apply`). Le patch exige tous les textes non vides
   avec `validated: true` et publie résultat/statut dans une transaction SQL.
   Ne jamais mettre ces booléens à vrai automatiquement dans le worker.
3. Tester sur une base locale ou de test avec des données fictives : validation,
   doublons, échec SQL, rollback, publication répétée, conservation de la mémoire.
   Ces tests PostgreSQL ne sont pas exécutés dans Norya.
4. Les routes réelles existantes suffisent aux demandes Norya : `norya.scope` est
   préservé par le schéma passthrough ; la révision inclut portée et empreinte du
   chapitre entier. Ainsi une page et un chapitre ne partagent jamais le même job.
   Ne pas interpréter une page reçue comme un chapitre entier dans un futur worker.

## Administration privée

Créer un seul compte Supabase confirmé, désactiver les inscriptions publiques et
les connexions anonymes. Autoriser son UUID via `NORYA_ADMIN_USER_ID` sur le serveur
Norya. Aucun rôle transmis par le navigateur ou modifiable dans user_metadata
n'accorde l'accès. Conserver les tables Translate sans politiques anon/authenticated.

`TRANSLATE_SHARED_SECRET` reste une identité technique privilégiée : ne la donner
qu'aux serveurs et au terminal privé de l'administratrice. Toute personne qui
possède ce secret peut appeler Translate ; Supabase Auth protège le proxy Norya,
pas les routes Translate actuelles. Avant un moteur externe/multi-utilisateur,
séparer les droits lecture, envoi, traitement et publication.

Le proxy Norya expose une publication authentifiée `POST /api/translate?action=publish&id=UUID`
avec `{sourceRevision,translations}`. Il vérifie chaque texte avant transfert.
L'éditeur de revue/publication dans Norya n'est pas implémenté ; le worker existant
reste utilisable uniquement par l'administratrice, après la migration stricte.

## Moteur et mémoire futurs, non activés

- Aujourd'hui : file `pending`/`complete` et travail manuel au terminal. Aucun moteur
  automatique et aucun coût IA ajouté.
- Ajouter ensuite états `processing`, `awaiting-review`, `failed`, tentatives,
  erreurs non sensibles, bail d'exécution et prise atomique d'un job avant workers
  concurrents. Ajouter ces états dans une migration distincte, pas juste l'interface.
- Le moteur doit produire des suggestions `validated:false` dans une table de
  brouillons distincte. Seule la revue administratrice produit la publication.
- La mémoire actuelle utilise le seul texte RO comme clé. Pour une mémoire médicale
  intelligente, ajouter langue, contexte, provenance, version du moteur, auteur et
  date de revue ; conserver plusieurs propositions et corrections antérieures.
  Une correspondance floue ne vaut jamais validation humaine.
- Prévoir idempotence du POST concurrent (contrainte unique existante : gérer
  `23505` en relisant le job), recherche de job par portée/révision, pagination et
  journal d'administration avant généralisation. Le pilote Norya bloque le double
  clic et l'API existante retrouve un envoi séquentiel déjà enregistré.

Les migrations et le patch ne constituent pas un service déployé ou vérifié en production.
