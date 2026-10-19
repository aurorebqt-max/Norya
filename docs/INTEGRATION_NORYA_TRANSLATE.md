# Norya ↔ Translate : pilote administratrice privé

État du 19 octobre 2026 : préparation locale, **non opérationnelle en production**.
Aucun chapitre réel transmis, aucune donnée médicale originale modifiée, aucun
déploiement ni changement de base. Le dépôt temporaire Translate reste inchangé.

## Contrat observé et choix

Translate expose `POST /api/jobs`, `GET /api/jobs/{uuid}`,
`GET /api/translations/{chapterId}?revision=…`, `GET /api/jobs` et
`POST /api/jobs/{uuid}/complete`. Son JSON v1 attend des blocs uniques
`{id,type,text,meta}` et accepte des métadonnées supplémentaires. Limites : 2 Mo,
3 000 unités, 30 000 caractères/unité. La base actuelle utilise `pending`/`complete`.
`complete` ne prouve actuellement ni texte non vide ni revue humaine ; le patch
fourni doit être appliqué avant activation. Aucun moteur automatique n'existe.

Norya conserve son export `norya-source-structure` v2. L'adaptateur prend un
instantané local du paquet et des décisions de présentation, en réutilisant
`logicalBlocks` et `workingPresentation` : corrections, blocs manuels, séparations,
fusions et ordre effectif. Il conserve l'export v2 complet localement comme
provenance ; il ne transmet pas commentaires, anomalies ou historiques personnels.
La structure transportée conserve texte brut/présenté, identités, coordonnées,
styles source, grille, spans, en-têtes, titres et notes des tableaux.

Les unités de traduction ont un ID SHA-256 de chapitre/page/bloc/champ/cellule ou
segment stylé. Une cellule vide ne crée pas de tâche vide ; elle reste dans sa grille.
Les textes couverts par une fusion de cellules restent conservés. Les images
originales restent dans le paquet local ; seul leur hash est transmis. Il ne s'agit
donc pas d'une sauvegarde autonome du paquet médical dans Supabase.

La révision SHA-256 couvre tout le chapitre, les textes bruts, les corrections,
la présentation, les styles, les images et la structure, puis le périmètre
page/chapitre. Une modification sur une autre page invalide aussi une ancienne
traduction par page. Horodatage d'export et commentaires n'invalident pas le contenu.
L'ID du chapitre demeure identique ; les révisions page/chapitre sont distinctes.

Les styles mixtes sont traduits par segments, avec le contexte du bloc dans les
métadonnées. Si le texte corrigé ne s'aligne plus avec les segments source stylés,
l'envoi est refusé avec un message précis : aucun rétablissement approximatif des
styles. Un futur éditeur pourra fournir un alignement humain explicite.

## Sécurité

Navigateur → fonction Vercel `/api/translate` → Translate → Supabase.

- Connexion Supabase Auth par mot de passe, compte confirmé unique. L'inscription
  publique et la connexion anonyme doivent être désactivées dans Supabase.
- Le serveur vérifie le jeton auprès de `/auth/v1/user` à chaque appel et compare
  l'UUID retourné à `NORYA_ADMIN_USER_ID`. Aucun rôle client n'est accepté.
- Cookie `__Host-norya-admin`, `HttpOnly; Secure; SameSite=Strict; Path=/`, durée au
  plus une heure. Aucun access token/refresh token n'est retourné dans le JSON,
  ni persisté dans localStorage. Pas de renouvellement automatique ; reconnexion
  après expiration. Déconnexion supprime le cookie ; elle ne prétend pas révoquer
  instantanément un JWT déjà volé, qui reste borné par son expiration Supabase.
- Origine exacte obligatoire pour les POST, lectures cross-origin refusées,
  pas de CORS public. L'origine et les destinations HTTPS proviennent du serveur,
  jamais du navigateur. Méthodes/actions autorisées explicitement, redirections
  interdites, délais réseau bornés, réponses sans cache, erreurs sans contenu privé.
- La fonction Norya n'utilise aucune clé Supabase service-role. La clé publiable
  sert côté serveur à Auth ; la clé service-role reste uniquement sur Translate.
  `TRANSLATE_SHARED_SECRET` n'apparaît jamais dans les imports du bundle Expo.
- Supabase gère les limites de connexion. Les fonctions n'ajoutent pas de faux
  compteur en mémoire prétendant protéger plusieurs instances Vercel. Vérifier
  les quotas et réglages Auth avant ouverture ; aucun fournisseur payant ajouté.

La clé technique Translate reste privilégiée. La posséder donne accès à ses routes
actuelles : seule l'administratrice doit la conserver dans son terminal privé.
La séparation moteur/publication sera nécessaire avant ajout de workers tiers.

Sources de conception : [vérification Auth côté serveur](https://supabase.com/docs/reference/javascript/auth-getuser),
[JWT Supabase](https://supabase.com/docs/guides/auth/jwts),
[fonctions Node Vercel](https://vercel.com/docs/functions/runtimes/node-js),
[configuration Vercel](https://vercel.com/docs/project-configuration/vercel-json).

## Interface et activation ultérieure

Les deux indicateurs sont désactivés par défaut. Le modèle de configuration est
`integration/norya.env.example` ; ne jamais y écrire des secrets réels.

`EXPO_PUBLIC_NORYA_TRANSLATE_ENABLED=true` ajoute un panneau administratrice dans
le panneau FR du lecteur privé. `NORYA_TRANSLATE_ENABLED=true` active la fonction
serveur seulement après configuration complète. Le routage Vercel sert les fichiers
et fonctions avant le repli SPA ; une API inconnue retourne 404, pas index.html.

Après connexion, le panneau recherche la révision exacte. Si elle est complète et
entièrement validée, il ouvre une vue française distincte dans Norya avec tableaux,
styles contrôlables et images originales agrandissables. Sinon il propose l'envoi,
puis une confirmation. La vérification ultérieure est manuelle par bouton.
La vue française n'écrit jamais dans le paquet ni dans `ReadingData`.
Les boutons et traductions locales existants sont conservés.

Le pilote est limité au lecteur privé finalisé : aucun envoi d'un cours dont la
revue humaine n'est pas terminée. Les cours du catalogue ont des indices de section
qui ne sont pas des pages PDF : ils ne sont pas raccordés automatiquement.
Kumar 8 n'a pas été finalisé ni envoyé par ce travail.

## Limites explicites avant généralisation

- La nouvelle vue FR est séparée du lecteur annotable existant : annotations/audio
  du lecteur n'y sont pas raccordés. Le mode RO/FR local reste inchangé.
- Les figures gardent leur texte RO dans les images originales, sans traduction
  graphique implicite. La disposition du lecteur (blocs et tableaux) est préservée,
  pas une remise en page typographique identique au PDF.
- Les jobs restent dans Supabase ; le numéro de job n'est pas encore conservé après
  fermeture du panneau. Un nouvel envoi confirmé de la même révision retrouve le
  job existant. La recherche directe du job en attente par révision reste à ajouter
  côté Translate pour une reprise automatique complète.
- Pas de polling, de moteur, de mémoire floue, ni d'éditeur de publication Norya.
  La route serveur de publication est préparée et testée ; la revue au terminal
  existante demeure le chemin de publication après application du patch strict.
- L'interface reconnaît `processing`/`failed` mais Translate actuel ne les produit
  pas. Ne pas annoncer ces états fonctionnels avant migration et worker adaptés.
- La récupération d'une page utilise sa révision propre ; elle n'extrait pas encore
  automatiquement une page d'une traduction de chapitre déjà publiée.
- Une demande hors limites échoue sans découpage ni envoi partiel. Les gros paquets
  nécessitent un protocole de lots explicite côté Translate.

## Fichiers de cette intervention

- `src/domain/sourceCourse/translateBridge.ts` : instantané v2, adaptation, empreinte,
  complétude et superposition française sans mutation.
- `src/domain/sourceCourse/translateClient.ts` : appels same-origin et rejet des
  réponses obsolètes/non validées ; seul 404 signifie absence.
- `src/components/TranslateAdminPanel.tsx` : connexion, choix page/chapitre,
  confirmation, suivi manuel, vue française.
- `PrivateSourceCourse.tsx`, `CourseReadingTools.tsx` : branchement optionnel.
- `api/translate.js`, `server/translate.cjs`, `vercel.json` : fonction, authentification
  et routage ; aucune dépendance ajoutée.
- `integration/norya.env.example`, `integration/translate/*` : configuration,
  migration SQL transactionnelle et patch à appliquer dans le vrai dépôt Translate.
- `tests/translate-{bridge,server,ui}.test.cjs`, `tests/fixtures/translate-fiction.cjs` :
  données entièrement fictives, aucun chargement de `references-privees`.

## Validation locale

- Compilation du domaine (`npx tsc -p tsconfig.tests.json`) réussie.
- 5 tests adaptateur/client, 5 tests serveur, 2 tests UI React : réussis après
  correction de l'annulation d'une recherche à la fermeture du panneau.
- 2 tests existants `source-reading-data` réussis : persistance web/native simulée,
  traductions et annotations locales préservées.
- Envoi → stockage simulé en mémoire → publication → récupération : réussi avec
  faux service HTTP. **Ce n'est pas une preuve de persistance Supabase réelle.**
- Exports Expo Web désactivé et activé réussis dans deux sorties distinctes `/tmp`.
  Recherche des noms de secrets/configuration serveur dans le bundle activé :
  aucune occurrence. Aucun fichier médical ajouté aux ressources publiques.
- `git apply --check` du patch Translate réussi, sans application.
- `npm test` : avant 15 fichiers réussis/8 échoués ; après 18/8. Les mêmes 8 fichiers
  échouent (multipass, preparation, source-course, source-finalization-ui,
  source-merge-ui, source-restoration, source-structure, source-verification-ui).
- `npm run typecheck` conserve les cinq diagnostics préexistants : `pointerEvents`
  sur Image dans PrivatePdfImport et quatre comparaisons FICHES dans Chapter.
  Aucun diagnostic nouveau dans les fichiers de l'intégration.

Restent obligatoires : tests SQL transactionnels sur base de test, tests des vraies
routes Translate avec JSON fictif, droits RLS/UUID administratrice, cookies/origines
sur HTTPS, routage API Vercel et contrôle navigateur Safari. Aucun système
opérationnel n'est annoncé avant leur réussite. URL Vercel, UUID du compte et
configuration serveur réels restent à renseigner hors Git ; aucun secret à fournir
dans la conversation.

Sauvegarde temporaire des trois fichiers existants touchés :
`/tmp/norya-bridge-before/`. Ce n'est pas une archive durable. Les modifications
préexistantes et l'historique documentaire des chapitres ont été préservés.
