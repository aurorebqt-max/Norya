# Consigne de transmission à Codex — dépôt Norya Translate

## 1. Mission et limites d'autorisation

Tu travailles dans le **vrai dépôt Translate**, dans son Codespace. Prépare et teste
la compatibilité avec le pilote administratrice de Norya décrit ci-dessous.
Ce document est une transmission datée du 19 octobre 2026, pas une attestation
que les deux applications sont opérationnelles.

Avant toute modification, lis les AGENTS.md applicables, examine `git status`,
les différences locales et les opérations Git en cours. Conserve les travaux
existants. Ne poursuis ni n'annule un rebase. N'utilise pas reset, clean, restore
ou remplacement intégral du dépôt pour appliquer cette transmission.

Autorisé : lecture, préparation des changements, tests locaux avec données
entièrement fictives et migrations dans une base locale dédiée aux tests.
Interdit dans cette mission : déploiement, modification de la base distante de
production, activation de services payants, envoi de chapitres réels, modification
de documents médicaux originaux, publication de données privées ou de secrets.
Si une base locale de test n'est pas disponible, indique ce blocage ; ne remplace
pas ces tests par une exécution sur la production.

Ne demande pas les secrets dans le chat. Ne les imprime pas, ne les copie pas dans
les rapports, les fixtures ou les sauvegardes. Le seul compte humain autorisé est
celui de l'administratrice. Ne crée pas de rôle public ni de permission générale
pour les utilisateurs Supabase connectés.

## 2. Fichiers reçus et état des preuves

Le lot de transmission contient, avec leurs chemins depuis Norya :

| Fichier | Usage |
|---|---|
| `integration/translate/CODEX_TRANSLATE.md` | Présente consigne autonome |
| `integration/translate/001-private-publication.sql` | Fonction SQL transactionnelle préparée, à revoir et tester |
| `integration/translate/strict-publication.patch` | Diff préparé pour deux fichiers Translate |
| `integration/translate/README.md` | Contexte et extensions futures |
| `integration/norya.env.example` | Noms de configuration du serveur Norya, sans secrets réels |
| `docs/INTEGRATION_NORYA_TRANSLATE.md` | Bilan et limites du pilote Norya |

Ces fichiers ont été préparés dans Norya. La copie `/tmp/norya-translate` utilisée
pour l'audit n'a pas été modifiée. Ne suppose pas qu'elle reflète encore exactement
le HEAD du vrai dépôt : compare d'abord le code.

Les preuves côté Norya sont des tests avec sources fictives et services simulés :
5 tests adaptateur/client, 5 tests serveur, 2 tests UI, 2 tests existants de stockage
local réussis ; exports Expo Web réussis. `git apply --check` du patch a réussi sur
la copie auditée, mais le patch n'a pas été appliqué. Aucun test SQL/Supabase réel
ni test des deux déploiements n'a été effectué. Le typecheck global et la suite
générale Norya ont des échecs préexistants documentés dans son bilan.

## 3. Architecture à conserver

```text
Navigateur Norya (Expo Web statique)
  → fonction Vercel Norya /api/translate
      → Supabase Auth : vérification du compte administratrice
      → API privée Translate (Next.js, Bearer partagé serveur)
          → Supabase : jobs, traductions, mémoire
```

Norya possède déjà `api/translate.js` et `server/translate.cjs`. Ce n'est pas une
application Next.js ; ne copie pas l'exemple de proxy Next dans son bundle Expo.
Le navigateur contacte uniquement son origine Norya. Les routes Translate ne
reçoivent pas directement le cookie Norya ou un secret stocké dans JavaScript.

La fonction Norya implémente les actions suivantes, à préserver :

| Méthode / action sur `/api/translate` | Rôle |
|---|---|
| POST `?action=login` | Connexion par e-mail/mot de passe à Supabase Auth |
| POST `?action=logout` | Suppression du cookie de session |
| GET `?action=session` | Vérification de la session administratrice |
| POST `?action=enqueue` | Transfert du JSON source à Translate |
| GET `?action=lookup&chapterId=…&revision=…` | Recherche de la révision exacte |
| GET `?action=job&id=…` | Lecture d'un job |
| POST `?action=publish&id=…` | Publication complète et validée |

Le proxy vérifie le jeton auprès de Supabase `/auth/v1/user`, puis le compte confirmé
et son UUID exact. Cookie `__Host-norya-admin`, `HttpOnly`, `Secure`, `SameSite=Strict`,
`Path=/`, durée maximale une heure. Aucun refresh token conservé, reconnexion après
expiration. La déconnexion locale ne prétend pas révoquer immédiatement un JWT
déjà volé. Aucun rôle de `user_metadata` ne doit donner de droits.

## 4. Fichiers exacts à examiner/modifier dans Translate

| Chemin dans Translate | Travail attendu | Couvert par le patch fourni ? |
|---|---|---|
| `lib/schema.ts` | Publication non vide, `validated: true` obligatoire ; préserver les métadonnées source | Publication seulement |
| `app/api/jobs/[id]/complete/route.ts` | Appeler la RPC transactionnelle ; conserver égalité de révision, couverture/IDs ; corriger messages et erreurs | Remplacement des deux écritures par RPC seulement |
| `supabase/migrations/202610190001_private_publication.sql` | Nouveau fichier suggéré pour la migration relue ; choisir un autre nom si déjà utilisé | SQL fourni séparément |
| `supabase/schema.sql` | Vérifier tables, clés uniques, RLS ; documenter l'ordre des migrations pour une base neuve | Non ; ne pas réécrire l'historique silencieusement |
| `app/api/jobs/route.ts` | Préserver JSON complet ; gérer envois identiques concurrents ; refuser réutilisation incohérente d'une révision | Non |
| `app/api/jobs/[id]/route.ts` | Vérifier authentification, identifiant, absence de cache et conservation des métadonnées au retour | Non |
| `app/api/translations/[chapterId]/route.ts` | Révision exacte ; ne pas présenter une ancienne publication non validée comme disponible | Non |
| `lib/server.ts` | Vérifier secret serveur, CORS/origines, taille, codes d'erreur et absence de données privées dans les logs | Non |
| `worker/translate_worker.py` | Adapter publication stricte ; enlever le contournement des textes vides ; préserver les fichiers de travail | Non |
| `.env.example` | Documenter les quatre variables Translate sans valeurs réelles | Non |
| `docs/JSON_CONTRACT.md` | Décrire `norya.contract`, périmètre, empreintes, métadonnées, complétude | Non |
| `README.md` | Ajouter procédure de configuration/test et limites, conserver l'existant | Non |
| `package.json` | Ajouter seulement les scripts de tests réellement créés ; pas de dépendance payante | Non |

Créer des tests dédiés, selon l'outillage existant du dépôt : par exemple
`tests/norya-contract.test.ts`, `tests/publication.test.ts`,
`tests/auth-and-origin.test.ts`, `supabase/tests/private-publication.sql` et
`worker/test_translate_worker.py`. Ces chemins sont des **fichiers à créer**, pas
des suites déjà présentes. Vérifie les scripts avant d'annoncer un `npm test`.

Ne modifie pas `app/page.tsx` ou l'interface Translate pour simuler un moteur
automatique : ce chantier n'en fournit pas.

## 5. Contrat JSON : Norya v2 n'est pas le JSON de transport v1

L'export local s'appelle `norya-source-structure`, version 2. Norya le conserve
avec le paquet source, les corrections, fusions, séparations, annotations,
validations et historiques. **Ne demande pas à l'administratrice de le télécharger
ou de le recopier pour envoyer un chapitre.** L'adaptateur Norya construit le
transport automatiquement à partir des décisions de présentation courantes.

Transport effectivement envoyé à `POST /api/jobs` :

```ts
{
  schemaVersion: 1,
  chapterId: string,
  title: string,                // actuellement l'ID du chapitre dans le pilote
  sourceLang: 'ro',
  targetLang: 'fr',
  sourceRevision: string,       // SHA-256 hexadécimal, 64 caractères
  blocks: Array<{
    id: string,                // ID de transport SHA-256 ; ne pas le renommer
    type: string,
    text: string,
    meta: {
      printedPage: number,
      blockId: string,
      field: 'text' | 'title' | 'notes' | 'cell' | 'run',
      row?: number,
      column?: number
    }
  }>,
  norya: {
    contract: 1,
    scope: { kind: 'chapter' } | { kind: 'page', printedPage: number },
    chapterRevision: string,
    sourceSha256: string,
    layout: { pages: Array<unknown>, nodes: Array<unknown> }
  }
}
```

Ce schéma est descriptif, pas une fixture avec de fausses empreintes. Générer les
fixtures contractuelles par le véritable adaptateur Norya si disponible ; sinon
utiliser des cas synthétiques clairement identifiés et signaler cette limite.

Contraintes de compatibilité :

- Conserver intégralement `source_json` et ses métadonnées. Les schémas source et
  bloc actuels utilisent `.passthrough()` ; ne pas les remplacer par un schéma qui
  élimine `norya`, `meta`, la grille ou les styles.
- `layout.pages` conserve les correspondances page imprimée/page PDF et dimensions.
  `layout.nodes` conserve identités, rôle/type, texte brut et présenté, coordonnées,
  lignes et styles, décisions image/masquage, grille, titres/notes et hash d'image.
- Les indices de cellules et segments sont à base zéro. Pour `field: 'run'`,
  `row` désigne la ligne et `column` le segment stylé, pas une cellule de tableau.
- Un ID de bloc original n'est pas unique entre pages. Ne jamais fusionner ou
  retrouver les unités par le seul `meta.blockId`. Utiliser l'ID de transport exact.
- Les cellules vides restent dans la grille, mais ne créent pas d'unité à traduire.
  Une cellule couverte contenant du texte peut être une unité : ne pas la supprimer.
- Images originales conservées localement, hashes transmis. Ne pas tenter de
  télécharger des images depuis leurs hashes, ni de traduire les images implicitement.
- Les styles non alignables après correction bloquent l'envoi dans Norya. Ne pas
  contourner ce refus par une traduction aplatie ou un découpage arbitraire.
- Ne pas traiter `layout` comme du français : il reste la structure RO de référence.
  Seul le tableau de correspondances `{id,text,validated}` constitue le résultat FR.
- Ne pas exiger les historiques/anomalies privés non transmis. Supabase ne reçoit
  pas une sauvegarde autonome du cours complet ; l'original Norya reste nécessaire.

## 6. Pages, chapitres et révisions

Le `chapterId` original reste inchangé pour une page. **Ne pas lui ajouter un
suffixe de page** : le pilote Norya n'attend pas cette modification.

La logique actuelle est :

1. Norya calcule `chapterRevision` sur le contenu et la structure pertinents de tout
   le chapitre (brut, corrections, styles, images et ordre compris).
2. Norya calcule `sourceRevision` sur l'objet canonique
   `{chapterRevision, scope, contract: 1}`.
3. Une page et un chapitre ont donc deux révisions différentes ; deux pages aussi.
4. La clé unique existante `(chapter_id, source_revision)` suffit pour ces demandes.
5. Toute modification du contenu RO du chapitre invalide aussi ses anciennes
   traductions par page. Les anciennes lignes restent conservées dans Supabase.

Stocker et retourner l'empreinte reçue exactement. Le serveur ne peut pas recalculer
`chapterRevision` à partir d'une seule page : il n'a pas tous les originaux locaux.
Il peut vérifier le format, le périmètre et, pour le contrat Norya, la dérivation
de `sourceRevision` depuis `chapterRevision`/`scope` en reproduisant exactement la
canonicalisation Norya. Ne pas inventer une autre fonction de hachage.

La couverture complète signifie **toutes les unités de la demande**, et non tous
les blocs du chapitre pour un job de page. Ne pas déclarer le chapitre entier
traduit après la publication d'une seule page. Pour une page, les unités et nœuds
sélectionnés appartiennent à cette page ; `layout.pages` peut néanmoins contenir
l'index de toutes les pages du chapitre.

Les deux routes existantes POST jobs / GET translations suffisent au pilote.
Pas de route `/pages/...` existante à supposer. L'extraction d'une page depuis une
traduction de chapitre et la reprise du job en attente après fermeture ne sont
pas encore raccordées. Une recherche de job par chapitre/révision peut être ajoutée
dans un contrat séparément documenté et testé, sans prétendre que Norya l'appelle.
Ne pas rechercher parmi seulement les 100 derniers jobs pour garantir cette reprise.

## 7. API et publication stricte

Conserver les routes et formes de réponses actuelles :

| Route | Contrat attendu |
|---|---|
| GET `/api/health` | Seule route publique ; aucune donnée privée ni secret |
| POST `/api/jobs` | `201` création / réponse existante idempotente `{id,status,existing}` |
| GET `/api/jobs` | Liste privée, limite actuelle 100 ; pas une recherche fiable par révision |
| GET `/api/jobs/{uuid}` | Job privé, source JSON intacte, statut ; `404` si absent |
| GET `/api/translations/{chapterId}?revision=…` | Correspondance exacte ; réponse `{chapter_id,source_revision,translations,updated_at}` ; `404 {status:'missing'}` si réellement absente |
| POST `/api/jobs/{uuid}/complete` | `{sourceRevision,translations:[{id,text,validated:true}]}` |

La publication doit refuser : révision différente (`409`), ID inconnu ou dupliqué,
unité manquante ou supplémentaire, texte vide/composé uniquement d'espaces,
`validated` absent, faux ou chaîne `"true"`, JSON mal formé et limites dépassées.
Une erreur réseau/auth/SQL n'est jamais une traduction absente ou réussie.

Pour les payloads, conserver les limites vérifiées : 2 000 000 octets UTF-8,
1–3 000 unités, texte au plus 30 000 selon la mesure du schéma JS actuel, titre
500 caractères, IDs de transport au plus 180 dans Translate. Norya génère des IDs
SHA-256. Ne pas imposer rétroactivement ce format à tous les anciens clients sans
migration/compatibilité explicite. Ne pas tronquer silencieusement.

`validated:true` est une attestation de revue humaine, pas le résultat d'un test,
d'un moteur, d'une correspondance mémoire ou d'une simple publication technique.

### Patch fourni et compléments indispensables

Le patch modifie uniquement `lib/schema.ts` et la route `complete` : validation
stricte Zod, puis appel à `publish_validated_translation`. Il ne faut pas le traiter
comme une implémentation complète des points suivants :

- Remplacer le message résiduel `Every block must be translated (empty text allowed)`
  par un message cohérent avec l'interdiction des textes vides.
- La route `complete` doit renvoyer `413` pour dépassement de 2 Mo ; son catch actuel
  ne traite pas cette erreur comme le fait le POST jobs.
- Pour un POST jobs concurrent, intercepter la violation unique `23505`, relire le
  job exact et retourner son ID. Ne pas créer de doublon ou réinitialiser son statut.
- Si une même clé chapitre/révision est présentée avec un contenu différent,
  retourner un conflit ; ne pas écraser la source existante. Comparer les champs
  contractuels de façon canonique sans dépendre de l'ordre des clés JSON.
- Les anciennes publications peuvent contenir `validated:false` ou des textes
  vides. À la récupération, vérifier la couverture par rapport au job source et la
  validation de chaque unité. Ne pas les promouvoir, supprimer ou corriger
  automatiquement. Une publication présente mais invalide doit produire une erreur
  explicite documentée (par exemple `409`), pas un `200` prêt à afficher ni un faux
  `404`. Le pilote Norya traite une erreur comme une erreur, pas comme une invitation
  à remplacer une ancienne source.
- Ne pas journaliser des objets d'erreur Supabase susceptibles de contenir des
  passages médicaux, payloads ou secrets. Conserver des codes et IDs techniques
  suffisants au diagnostic, jamais l'en-tête Authorization.

## 8. Supabase : migration et droits

Tables observées : `translation_jobs`, `chapter_translations`, `translation_memory`.
Elles ont RLS activé, sans politiques publiques. Conserver cet isolement.
Les contraintes uniques chapitre/révision et la clé primaire de traduction restent.

La migration préparée ajoute la fonction :

```sql
public.publish_validated_translation(
  p_job_id uuid,
  p_source_revision text,
  p_translations jsonb
) returns void
```

Elle verrouille le job (`FOR UPDATE`), vérifie révision, IDs, complétude et validation,
écrit `chapter_translations` et passe le job à `complete` dans **une transaction**.
`updated_at` est actualisé. Si une écriture échoue, aucune publication partielle ne
doit subsister. La mémoire reste une opération ultérieure : une erreur de mémoire
ne doit pas annuler une publication déjà réussie, ni être annoncée comme un succès
d'enregistrement mémoire.

Fonction `SECURITY INVOKER`, `search_path` fixé ; EXECUTE retiré à PUBLIC, anon,
authenticated et accordé à `service_role` seulement. Vérifier réellement ces droits
sur la base de test : ne pas se contenter de lire le SQL. N'ajouter aucune politique
permissive pour contourner une erreur RLS.

### Revue du SQL préparé avant application

- Le SQL utilise `CREATE OR REPLACE FUNCTION`. Si cette signature existe déjà,
  comparer et sauvegarder sa définition/droits ; ne pas remplacer un travail plus
  récent aveuglément. Conserver le fichier reçu et produire une migration révisée
  distincte si nécessaire.
- `btrim(text) = ''` dans le SQL préparé ne couvre pas à lui seul tous les blancs
  rejetés par `String.trim()` côté JS (tabulations, retours, certains espaces Unicode).
  Aligner les contrôles et les tester aussi par appel direct à la RPC.
- JS compte la longueur en unités UTF-16 ; PostgreSQL `length(text)` compte des
  caractères. Tester notamment les caractères hors BMP et définir une vérification
  SQL compatible avec la limite API, sans couper le texte.
- Rejeter explicitement les objets JSON invalides et sources de job mal formées
  si la RPC est invoquée directement. Tester `null`, tableaux/objets à la place
  des textes, IDs manquants et type incorrect de `validated`.
- La migration seule ne rend pas l'ancienne route atomique : appliquer le code
  qui appelle la RPC dans le même lot de livraison planifié. Ne pas activer Norya
  tant que les deux éléments ne sont pas vérifiés.

Ne rejoue pas `supabase/schema.sql` sur une base existante en guise de migration.
Pour une base locale neuve : schéma initial, puis migrations versionnées. Pour une
base existante : inventaire, sauvegarde privée durable, migration contrôlée après
autorisation distincte. Aucun reset de base distante.

Les états `processing`, `awaiting-review`, `failed`, le bail worker et les tables
de brouillons ne figurent pas dans ce SQL. Les préparer dans une migration séparée
seulement si nécessaire au prochain chantier ; ne pas annoncer leur disponibilité.

## 9. Worker, revue et future mémoire

Le worker actuel ne traduit pas automatiquement. Il prépare des fichiers à remplir
et les publie via le secret serveur. Maintenir les brouillons `validated:false`.

Adapter `worker/translate_worker.py` pour :

1. Vérifier avant publication la révision exacte, la couverture, l'unicité, les
   textes non vides et `validated is True` pour chaque unité.
2. Retirer ou refuser explicitement `--allow-empty` pour la publication stricte.
   Une cellule source vide ne constitue pas une unité envoyée par le pilote Norya.
3. Ne jamais transformer automatiquement tous les booléens en vrai.
4. Préserver `worker/in` et `worker/out` : le `pull` actuel réécrit ces fichiers.
   Refuser un chemin existant ou produire un nouveau fichier versionné ; ne pas
   écraser une traduction en cours de revue.
5. Préserver les traductions existantes de la mémoire. Les rapprochements flous
   sont des suggestions seulement ; signaler les conflits plutôt que remplacer
   silencieusement une paire relue par une autre lors de ce chantier.

Vérifier les règles Git pour les fichiers de travail privés avant de lancer le
worker. Les JSON réels ne doivent pas être committés. La mémoire actuelle est
indexée par le seul texte source ; la mémoire contextuelle/provenancée et un moteur
local éventuel sont des extensions futures, sans fournisseur payant imposé.

## 10. Autorisations administratrice et CORS

- Un seul compte Supabase humain confirmé ; inscriptions publiques et accès
  anonymes désactivés. Enregistrer son UUID exact côté serveur Norya.
- Un JWT d'un autre compte, même confirmé, doit être refusé par Norya. L'UUID
  autorisé vient de la configuration serveur, jamais de la requête.
- Translate conserve son Bearer technique `TRANSLATE_SHARED_SECRET`. Supabase Auth
  protège le proxy Norya ; **Translate actuel ne vérifie pas lui-même le compte
  humain derrière ce secret**. Toute personne possédant ce secret est privilégiée.
  Il doit rester uniquement sur les deux serveurs et dans le terminal privé de
  l'administratrice. Un JWT utilisateur n'est pas ce secret et doit être refusé
  par les routes Translate actuelles.
- La clé `SUPABASE_SERVICE_ROLE_KEY` reste uniquement côté serveur Translate.
  Ne pas l'ajouter à Norya, à `NEXT_PUBLIC_*`, à `EXPO_PUBLIC_*` ou à un composant client.
- Le proxy Norya refuse les POST sans origine exacte et les requêtes cross-origin.
  Translate autorise actuellement l'absence d'Origin pour les appels serveur,
  mais le Bearer reste obligatoire. CORS n'est jamais une authentification.
- `ALLOWED_ORIGINS` contient des origines exactes séparées par des virgules, jamais
  `*`. Les réponses privées restent `Cache-Control: no-store`. Harmoniser le refus
  des origines explicitement interdites entre toutes les routes privées, sans
  bloquer les appels serveur authentifiés dépourvus d'Origin.
- Aucun endpoint ne doit devenir public pour faciliter les tests. Les OPTIONS
  peuvent répondre sans données ; aucun GET/POST privé ne le peut.

## 11. Variables d'environnement des deux projets Vercel

Les valeurs ci-dessous sont descriptives. Ne pas inventer l'URL réelle, l'UUID ou
les secrets ; ne pas les inscrire dans le dépôt. Configurer chaque environnement
Vercel explicitement lors d'une étape autorisée distincte.

### Vercel Norya

| Variable | Valeur/rôle | Exposition |
|---|---|---|
| `NORYA_TRANSLATE_ENABLED` | `false` pendant préparation ; activation serveur ultérieure explicite | Serveur |
| `NORYA_APP_ORIGIN` | Origine HTTPS exacte de Norya, sans chemin | Serveur |
| `SUPABASE_URL` | Projet Supabase Auth de l'administratrice | Serveur |
| `SUPABASE_PUBLISHABLE_KEY` | Clé publiable de ce projet, utilisée par le proxy Auth | Serveur dans cette architecture |
| `NORYA_ADMIN_USER_ID` | UUID exact du compte confirmé unique | Serveur |
| `TRANSLATE_API_URL` | Origine HTTPS de Translate, sans `/api`, query, fragment ou identifiants | Serveur |
| `TRANSLATE_SHARED_SECRET` | Même secret aléatoire que sur Translate ; recommander au moins 32 octets aléatoires | Secret serveur |
| `EXPO_PUBLIC_NORYA_TRANSLATE_ENABLED` | `false` pendant préparation ; `true` rend le panneau disponible après reconstruction Expo | Public, simple booléen |

Ne pas ajouter `SUPABASE_SERVICE_ROLE_KEY` à Norya. Les identifiants et le mot de
passe de connexion de l'administratrice ne sont pas des variables de build.

### Vercel Translate

| Variable | Valeur/rôle | Exposition |
|---|---|---|
| `SUPABASE_URL` | Projet contenant les tables de traduction | Serveur |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé privilégiée de ce projet, jamais la clé anon | Secret serveur |
| `TRANSLATE_SHARED_SECRET` | Exactement le même secret que le proxy Norya | Secret serveur |
| `ALLOWED_ORIGINS` | Liste exacte des origines Norya autorisées ; pas de wildcard | Serveur |

Pour ce pilote, utiliser de préférence le même projet Supabase pour Auth et les
tables, et vérifier ce choix explicitement. Des projets séparés sont possibles
mais leurs URLs/clés ne sont pas interchangeables. Ne pas créer de projet payant.

Translate n'utilise pas actuellement `NORYA_ADMIN_USER_ID` pour authentifier ses
routes ; ajouter cette variable seule ne les sécuriserait pas davantage. Le worker
local utilise `TRANSLATE_API_URL` et `TRANSLATE_SHARED_SECRET`, sans clé service-role.

Les environnements de preview/test doivent être isolés des données de production.
Une URL de preview variable doit être autorisée exactement pour la session de test,
pas via un domaine générique. Le proxy Norya exige HTTPS : tester les cookies sur
HTTPS de test, sans enlever `Secure` pour contourner un échec sur HTTP.

## 12. Tests obligatoires avant une autorisation de déploiement

Créer uniquement des fixtures fictives, sans charger les cours privés de Norya.
Pour chaque test, préciser : simulé, application locale réelle, PostgreSQL local
réel, ou environnement HTTPS de test autorisé. Une simulation ne prouve pas la
persistance Supabase réelle.

| Domaine | Cas et résultat exigé |
|---|---|
| Contrat | Aller-retour source JSON sans suppression de `norya`, `meta`, styles, cellules, spans, hash d'image ou identifiants |
| Identités | Même blockId sur deux pages, titre de tableau, notes, cellules couvertes, segments bold/italic : aucune collision |
| Portée | Chapitre, page 1 et page 2 coexistent ; publier une page ne complète pas le chapitre |
| Révision | Modification RO, correction, cellule, style ou structure : nouvelle empreinte ; ancienne version jamais choisie comme fallback |
| Taille | 2 Mo UTF-8, 3 000 unités, longueur texte ; dépassements explicites sans troncature, y compris `/complete` |
| Envoi | Création puis réenvoi identique ; deux POST concurrents : un seul job ; même révision/contenu différent : conflit |
| Persistance | Relire la source depuis une nouvelle connexion DB et après redémarrage de l'application, sans dépendre d'un cache mémoire |
| Publication | Manquant, supplémentaire, doublon, inconnu, vide, espaces/tabulations/retours/Unicode seuls, `validated:false`/absent/chaîne : refus |
| Révision publiée | Mauvaise révision : `409`, aucun changement de job, résultat ou mémoire |
| Transaction SQL | Échec injecté entre écriture du résultat et changement de statut : rollback complet ; appel répété valide et publication concurrente contrôlés |
| RPC directe | Mêmes refus de contenu invalide qu'à travers l'API ; droits anon/authenticated refusés, service-role autorisé |
| RLS | Aucune lecture/écriture privée via anon ou simple session utilisateur ; aucune policy large ajoutée |
| Historique | Ancienne traduction invalide conservée mais jamais servie comme valide ; résultats d'autres révisions inchangés |
| Mémoire | Échec mémoire sans fausse déclaration de succès mémoire ; suggestions jamais auto-validées, paires antérieures préservées |
| Auth Translate | Secret absent, faux, trop court, JWT utilisateur en guise de secret : refus sur toutes les routes privées |
| Auth Norya | Anonyme, session expirée, autre UUID ou compte non confirmé : aucun appel privé Translate |
| Origines | Origine malveillante/sans Origin sur POST Norya : refus ; serveur→Translate sans Origin mais avec bon secret : autorisé |
| Sessions | Cookie HttpOnly/Secure/SameSite/Path, expiration, reconnexion, déconnexion ; pas de jeton dans JSON ou localStorage |
| Erreurs | Réseau indisponible, timeout, JSON non valide, erreur SQL : pas de succès, pas de données privées ou secret dans logs/réponses |
| UI Norya | Confirmation avant envoi, attente, récupération FR validée, grilles/styles/images, fermeture pendant recherche, modification source pendant requête |
| Non-régression | Originaux et traductions locales inchangés ; lecteur RO/local FR disponible lorsque pilote désactivé |
| Build/routage | Build Translate et Expo ; fonction Norya servie avant repli SPA ; API inconnue 404 JSON ou erreur API, pas page d'accueil |
| Fuite | Aucun secret serveur dans bundles, source maps publiées, réponses, artefacts ou historique Git |

Exécuter `npm run typecheck` et `npm run build` de Translate après inspection des
scripts réels. Ajouter/exécuter les nouveaux tests API et SQL. Si les dépendances
ne sont pas installées, utiliser le lockfile du dépôt avec son gestionnaire ; ne
pas régénérer arbitrairement les versions. Tester aussi le worker Python modifié.
Un build réussi ne remplace aucun test Auth/RLS/SQL ou contrôle humain médical.

## 13. Ordre de travail et critères d'arrêt

1. Inventorier code, Git, schéma et configuration par **noms seulement**. Relever les
   différences avec l'audit ; lire le patch et le SQL en entier.
2. Sauvegarder les fichiers concernés sans secrets, dans un nouveau répertoire.
   Conserver le lot reçu intact. Ne jamais remplacer les fichiers du dépôt par le
   contenu d'une archive de transmission.
3. Lancer `git apply --check CHEMIN_DU_LOT/integration/translate/strict-publication.patch`.
   Si le contrôle échoue, examiner les écarts et porter les changements manuellement ;
   pas de `--reject`, application forcée ou restauration d'une ancienne version.
4. Préparer le code et une nouvelle migration à partir du SQL reçu, avec les
   corrections et tests ci-dessus. Un `git apply` effectif modifie le code : ne le
   confondre ni avec le transfert du lot, ni avec son simple contrôle.
5. Sur base locale de test : schéma puis migration, tests de transaction et droits.
   Tester ensuite les vraies routes locales avec des JSON fictifs.
6. Coordonner les tests avec Norya. Si son Codespace/code est absent, demander un lot
   contenant seulement l'adaptateur et les fixtures fictives nécessaires ; ne pas
   inventer leur résultat ni demander un chapitre réel.
7. Fournir diff, liste des fichiers, commandes/résultats, limites et variables à
   configurer. Distinguer « prêt à tester », « tests locaux réussis » et « opérationnel ».
8. S'arrêter sans déploiement ni migration distante. Une activation nécessite une
   décision explicite ultérieure, l'ordre migration→code Translate→tests→activation
   Norya et un plan de désactivation non destructif. Pour désactiver le pilote,
   utiliser les indicateurs Norya ; ne pas supprimer les données de traduction.

## 14. Transfert du lot entre Codespaces sans écrasement

Cette procédure transfère de la documentation et du code préparé, pas des données
médicales, des `.env` réels ou un dépôt complet.

Dans le terminal du Codespace **Norya**, depuis la racine du dépôt :

```bash
HANDOFF_DIR=$(mktemp -d /tmp/norya-translate-handoff.XXXXXX)
tar -czf "$HANDOFF_DIR/norya-translate-handoff.tar.gz" \
  integration/translate/CODEX_TRANSLATE.md \
  integration/translate/001-private-publication.sql \
  integration/translate/strict-publication.patch \
  integration/translate/README.md \
  integration/norya.env.example \
  docs/INTEGRATION_NORYA_TRANSLATE.md
sha256sum "$HANDOFF_DIR/norya-translate-handoff.tar.gz"
```

Le répertoire créé est inédit. Télécharger cette archive par l'explorateur du
Codespace et conserver son empreinte. `/tmp` est temporaire : garder le fichier
téléchargé jusqu'à vérification du transfert. Ne pas committer/pousser tout le
répertoire de travail Norya pour transférer seulement ces six fichiers.

Dans le Codespace **Translate**, téléverser l'archive dans un nouveau dossier vide
(si un fichier du même nom existe, choisir un nouveau nom plutôt que le remplacer).
Depuis la racine du dépôt Translate :

```bash
# Remplacer uniquement ce chemin par celui de l'archive téléversée.
HANDOFF_ARCHIVE='/chemin/vers/norya-translate-handoff.tar.gz'
sha256sum "$HANDOFF_ARCHIVE"
tar -tzf "$HANDOFF_ARCHIVE"
HANDOFF_DEST=$(mktemp -d "$PWD/norya-handoff.XXXXXX")
tar --extract --gzip --keep-old-files \
  --file "$HANDOFF_ARCHIVE" --directory "$HANDOFF_DEST"
printf '%s\n' "$HANDOFF_DEST/integration/translate/CODEX_TRANSLATE.md"
```

Comparer l'empreinte à celle de Norya et vérifier que la liste contient seulement
les six chemins relatifs attendus avant extraction. `mktemp -d` crée un dossier
neuf ; `--keep-old-files` refuse tout remplacement de fichier existant. Ne pas
extraire à la racine du dépôt Translate. Ne pas téléverser le SQL sur le schéma
existant et ne pas exécuter la migration à cette étape.

Message à donner à Codex Translate, en remplaçant le chemin affiché :

> Lis intégralement `norya-handoff.XXXXXX/integration/translate/CODEX_TRANSLATE.md`
> et les fichiers du lot qu'il référence. Compare avec le code actuel, prépare les
> changements et teste uniquement avec des données fictives et une base locale de
> test. Préserve les fichiers existants. Ne déploie rien, n'applique aucune migration
> distante et ne transmets aucun chapitre médical réel. Fournis les diffs, tests et
> blocages avant toute activation.

Le transfert n'applique aucun patch et n'exécute aucun SQL. L'intégration du code et
de la migration est une étape de travail séparée, après examen dans le vrai dépôt.
