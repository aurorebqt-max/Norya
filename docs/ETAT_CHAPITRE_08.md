# Kumar 8 — état vérifié au 16 octobre 2026

**Cours en cours de vérification ; fusion non opérationnelle dans le code courant.**
Cet état concerne le répertoire de travail, pas une version publiée ni le Safari
personnel de l'utilisateur. Il remplace les affirmations d'avancement non vérifiées
des anciens comptes rendus, sans les supprimer. Méthode : [WORKFLOW_CHAPITRES.md](WORKFLOW_CHAPITRES.md).

## Contexte de reprise et protection

Audit réalisé sur `HEAD e6bdcbc` avec modifications locales préexistantes dans
`PrivateSourceCourse.tsx`, `SourceCourseVerification.tsx`, `SourcePresentationText.tsx`
et `displayCorrections.ts`, ainsi que le test local `source-restoration.test.cjs`.
Un rebase interactif sur `e136981` était en cours. Il n'a été ni poursuivi ni annulé.
Le grand diff de `SourceCourseVerification.tsx` par rapport à HEAD précède cet audit.

Cette intervention ajoute uniquement les documents de méthode/état et un script
d'audit synthétique. Aucun code de production, contenu médical, paquet privé,
statut utilisateur ou donnée de fusion n'a été modifié par cet audit.
Les documents demandés n'existaient pas ; les autres consignes et documents ont été conservés.

Sauvegardes de session : `/tmp/norya-audit-fusion-20261016/etat-initial.patch` ;
restauration précédente dans `/tmp/norya-restauration-20261016/`.
Ces chemins sont temporaires. Conserver une archive privée durable avant recyclage
de Codespaces ; aucun fichier médical privé ne doit être ajouté à GitHub.

## Ce qui est réellement présent

| Élément | Preuve et limite |
|---|---|
| Extraction privée | PDF, manifeste, brut, blocs positionnés, rendus, rapports et plan dans `references-privees/cours/kum-08/v1/` |
| Paquet structuré | JSON local relu : schéma 2, 18 pages, 296 parties, `complete: false` |
| Périmètre | Pages imprimées 151–168, PDF 174–191 ; contrat spécifique à Kumar 8 |
| Cours numérique | Texte sélectionnable et présentation commune via `sourcePresentation` et `SourcePresentationText` |
| Sommaire p.151/PDF174 | Deux colonnes, 24 associations titre–page ; comparaison à l'original effectuée lors de la restauration précédente et tests ciblés repassés |
| Figures/tableaux désignés | Décision commune `imageOnly`, images originales avec zoom ; accès au PDF séparé |
| Décisions de rendu du paquet local | Restauration précédente : 286 parties numériques, 9 images, 1 folio masqué ; ne pas confondre ces décisions avec le `kind` brut des 296 parties |
| Corrections ciblées | Titres, sommaire, listes, reflow et césures des passages signalés ; ce n'est pas une attestation de fidélité de chaque passage médical |
| Revue | Modes Split/Texte/Visuel, navigation simple par page/bloc, actions de statut et signalement d'anomalie présents |
| Persistance | Modules de stockage de validations et anomalies présents ; tests synthétiques iOS/web réussis |
| Filtres modernes | Fonctions `reviewTargets`, `filterReviewTargets`, `selectReviewTarget` présentes dans le domaine, mais non raccordées à la version courante de la vérification manuelle |
| Web compilé | `dist/` recompilé lors de la restauration précédente après constat d'un ancien bundle ; aucune publication effectuée, application réellement ouverte par l'utilisateur non identifiée |

Les 9 visuels conservés lors de la restauration : p.152/part-3, p.153/part-4,
p.155/part-2, p.156/part-2, p.162/part-1, p.163/part-13, p.164/part-12,
p.165/part-10, p.166/part-16. Les paragraphes voisins restent numériques.
Le tableau numérique restant n'est pas certifié cellule par cellule par cet audit.

## Audit de fusion — résultat non opérationnel

Recherche dans les deux composants et les modules du cours : aucun mécanisme de
fusion/annulation actif dans le répertoire de travail. Aucun bouton de fusion n'est
exposé lors du montage réel des composants React avec stockage synthétique.

| Fonction demandée | État constaté |
|---|---|
| Sélection libre de deux blocs | Absente de l'interface courante |
| Fusion consécutive | Non exécutable : aucune commande active |
| Fusion non adjacente | Non exécutable : sélection et opération absentes |
| Aperçu et jonction éditable | Absents de l'interface courante |
| Réparation de mot à la jonction | Non disponible dans une fusion ; le reflow ciblé d'affichage est une autre fonction |
| Sauvegarde d'une nouvelle fusion | Non exécutable ; ne pas confondre persistance de notes anciennes et sauvegarde d'une fusion utilisable |
| Annulation persistante/restauration | Absente ; aucun aller-retour fusion puis annulation ne peut être exécuté |
| Anomalies/commentaires | Notes, statuts et historique synthétiques inchangés après lecture/remontage ; conservation au cours d'une nouvelle fusion non testable |
| Pas de validation automatique | Aucun changement lors de l'audit en lecture ; propriété de la fusion non testable puisqu'elle est absente |
| Affichage sans duplication | Anciennes notes `FUSION DES BLOCS…` et `MERGED_INTO:…` ignorées : les fragments d'origine restent affichés, le texte fusionné n'apparaît pas et le bloc absorbé reste navigable |
| Filtres/navigation | Après clic sur « À vérifier », le bloc synthétique déjà vérifié reste courant ; pas de filtre « Vérifiés » ; navigation vers le bloc absorbé toujours possible |

### Test dynamique reproductible

`scripts/audit-source-merge.cjs` monte **les composants actuels** et les modules de
persistance. Il utilise trois paragraphes synthétiques (permettant un cas adjacent
et un cas non adjacent), une ancienne note de fusion, une note d'absorption, un bloc
vérifié et une anomalie résolue avec historique. Il n'importe aucun contenu médical
et n'accède pas au navigateur personnel.

Pour iOS simulé (AsyncStorage en mémoire) et web simulé (fake IndexedDB), il ouvre
le lecteur et la vérification, active Texte puis « À vérifier », navigue au bloc
suivant, démonte puis remonte les interfaces sans vider le stockage entre les deux
passages. Les deux exécutions par plateforme donnent les mêmes résultats :

- Aucune commande fusion/annulation, aucun filtre « Vérifiés ».
- Fragments sources visibles, correction fusionnée non visible.
- Bloc vérifié toujours courant dans « À vérifier » ; bloc absorbé encore navigable.
- Validations, notes de fusion, anomalie et historique strictement inchangés après remontage.

**Limite explicite :** une fusion puis son annulation n'ont pas pu être réalisées,
car les fonctions sont absentes. Le remontage teste une reprise du stockage dans
un harnais React, pas un rafraîchissement de Safari. Un résultat d'audit sans erreur
ne signifie pas que la fusion est opérationnelle.

### Tentative retrouvée dans Git, non réinstallée

`git show e6bdcbc:src/components/SourceCourseVerification.tsx` contient une tentative :

- État de prévisualisation déclaré avec `block1`, `block2`, `order`, `junction`,
  mais `openMergePreview` fournit `currentBlock`, `nextBlock`, `useSpace`.
- `confirmMerge` attend `block1`/`block2`, donc les données construites par l'ancien
  aperçu ne correspondent pas à celles consommées par l'enregistrement.
- Des contrôles appellent le changement de jonction avec des booléens alors que
  le gestionnaire attend `space | linebreak | none | hyphen`.
- Recherche des pages par seul `part.id`, alors que ces IDs se répètent entre pages :
  risque d'associer une fusion à la mauvaise page.
- Les notes de bloc servent à encoder le résultat et sont remplacées ; ce n'est pas
  un modèle de fusion conservant un instantané complet et une annulation persistante.
- Le parseur ancien découpe au premier `:` alors que la description contient déjà
  `ordre:…` ; ne pas reprendre aveuglément cette interprétation des notes.

Ces défauts sont issus d'une lecture du code historique, pas d'une exécution de
cette ancienne version. Sa restauration complète n'a pas été tentée. Si de vraies
fusions ont été enregistrées avant le plantage, elles peuvent encore exister dans
les validations personnelles ; leur présence et leur nombre restent inconnus ici.
Les récupérer en lecture seule avant toute migration, en préservant chaque note originale.

## Statut des anomalies

Dernier rapport disponible sélectionné par sa date interne :
`references-privees/rapports-anomalies/norya-anomalies-kum-08-2026-10-15 7.md`,
daté du **2026-10-15T16:38:39.005Z**.

Recomptage des lignes de statut, pas seulement lecture du résumé : **63 anomalies**,
**24 ouvertes**, **39 résolues**, **0 à revérifier**. Valeurs historiques, jamais à
coder en dur. Aucun statut ou commentaire du rapport n'a été modifié.

Le stockage personnel peut être plus récent. Ses comptes réels ne sont pas connus
depuis Codespaces. Les anomalies intégrées à `validation.anomalies` priment dans le
chargeur sur l'ancien registre séparé ; ne pas interpréter un registre vide isolé
comme une disparition des anomalies.

## Tests exécutés pendant cet audit

| Contrôle | Résultat |
|---|---|
| `npm run typecheck` | Réussi |
| `npx tsc -p tsconfig.tests.json` | Réussi |
| `node tests/source-course.test.cjs` | 10 tests réussis |
| `node tests/source-review.test.cjs` | 2 tests réussis : persistance et historique iOS/web simulés ; le message « Storage full » provient du scénario d'échec volontaire |
| `node tests/source-restoration.test.cjs` | 2 tests réussis : cohérence de rendu et protection texte/figures |
| `node scripts/audit-source-merge.cjs` | Diagnostic exécuté, quatre passages observés ; fusion non opérationnelle |
| `python3 -m unittest discover -s scripts/source-course -p 'test_*.py'` | 12 tests réussis ; aucune extraction de chapitre lancée |

Le diagnostic `node --test --test-timeout=15000 tests/source-review-ui.test.cjs`
a échoué après environ 15,8 secondes (fichier de tests interrompu à la limite).
Ce résultat ne permet pas de déclarer la navigation valide. Le script d’audit
séparé confirme les défauts de filtre et de navigation décrits ci-dessus.
La suite générale `npm test` n'est pas relancée intégralement pour cet audit documentaire :
la reprise précédente avait constaté six échecs multipass hors périmètre et des
échecs/blocages dans la navigation manuelle. Ne pas annoncer la suite générale verte.

Non exécutés : fusion/annulation réelles (absentes), actualisation dans Safari
personnel, revue humaine médicale exhaustive, nouvel export/publication web.
Les contrôles d'empreintes de la restauration précédente avaient vérifié les 151
fichiers privés inchangés ; cet audit n'a lancé aucun traitement d'écriture sur eux.

## Finalisation des cours (outil, 16 octobre 2026)

Système présent dans le répertoire de travail (domaine `finalization` /
`finalizedStorage`, UI `CourseWorkspace`, filtre bibliothèque « Finalisés »,
tests `source-finalization*.cjs`). Il permet de finaliser **un seul chapitre**,
de refuser la finalisation si un bloc n'est pas vérifié ou si une anomalie est
encore `open` / `corrected-pending-review`, de conserver versions/corrections/
anomalies, de masquer import et fabrication après finalisation, puis de rouvrir
pour correction. **Kumar 8 n'est pas finalisé** : la revue humaine et les
anomalies ouvertes restent à traiter ; cet outil ne valide rien automatiquement.

## Travaux restants avant validation définitive

1. Identifier la version réellement utilisée et sauvegarder les données privées
   personnelles sans réimportation ni purge ; rechercher les traces de fusion existantes.
2. Corriger de façon ciblée les filtres/navigation et leurs tests. Examiner aussi la
   course possible entre initialisation en mémoire et chargement asynchrone des validations
   dans la version actuelle ; ne pas autoriser une écriture sur un état provisoire.
3. Terminer la fusion avec une identité complète, une représentation réversible,
   des commentaires préservés et un affichage commun ; tester adjacent/non adjacent,
   plusieurs pages, jonctions, double clic, échec de sauvegarde, annulation et rechargement.
4. Reprendre les 24 anomalies ouvertes et toute nouvelle anomalie depuis le stockage
   réel ; conserver les 39 résolues et leur historique. Ne rien résoudre automatiquement.
5. Contrôler humainement chaque page : paragraphes complets, césures, listes,
   cellules de tableaux, figures/légendes, ordre et couverture ; documenter les preuves.
6. Après validation du cours seulement : errata 2021 signalés, traduction française,
   audio nocturne, fiches détaillées/express, QCM existants, vérification finale.

Le prochain chapitre et la généralisation aux autres manuels restent soumis à une
confirmation explicite. Aucun de ces travaux n'a été commencé pendant cet audit.

## Addendum — reprise du 16 octobre 2026 (après l'audit ci-dessus)

Le code courant contient désormais la fusion (`merges.ts`, sélection/aperçu/jonction/inversion/
confirmation/annulation dans `SourceCourseVerification.tsx`, affichage dans `PrivateSourceCourse.tsx`),
ce qui rend caduc le constat « fusion absente » ci-dessus (conservé pour l'historique).

Vérifié : `npm run typecheck` OK ; `expo export --platform web` OK ; serveur Expo 8081 et bundle
`dist/` s'affichent sans erreur JS dans Chromium headless (accueil, 5 onglets, route chapitre kum-08
sans paquet privé). Tests OK : source-merge, source-merge-ui (fusion adjacente/non adjacente, remontage,
annulation, anomalies conservées, bloc absorbé non dupliqué), finalization, restoration, source-course.
Le test d'UI avait une course (bouton présent avant la fin du chargement) : attente ajoutée.

Limites : paquet privé réel non importé dans le navigateur headless (test synthétique seulement) ;
`source-review-ui.test.cjs` échoue (3) — la vérification réécrite n'expose plus « Mes anomalies »,
les filtres ni la liste d'anomalies attendus par ce test ; `multipass.test.cjs` échoue (6, contenus/QCM,
hors périmètre). Fusion limitée à 2 blocs textuels ; aucun avertissement de sélection risquée.

## Addendum 2 — vérification, fusion multiple, export, finalisation (16 octobre 2026)

Réalisé (domaine + UI) : split permanent (plus de Split/Texte/Visuel) ; filtres Tous | Mes anomalies |
Vérifiés | À vérifier avec compteurs et navigation inter-pages ; « Anomalie ! » ouvre un éditeur prérempli
(correction enregistrée sans validation, historique avant/après, annulable, partagée avec « Cours
reconstitué ») ; fusion de N blocs (non adjacents, ordre, jonction, avertissements non bloquants,
correction d'une fusion, annulations successives, `mergeLog`) ; export/import JSON `norya-source-structure`
v1 sans doublon + Markdown des anomalies ; temps de lecture (200 mots/min) affiché après finalisation ;
encadré de métadonnées masqué en COURS SOURCE ; finalisation/réouverture gérant les fusions N.
Le chapitre 8 n'a PAS été finalisé. Les constats « fusion limitée à 2 blocs » et « source-review-ui
échoue » ci-dessus sont caducs.

Export privé : le navigateur ne peut pas écrire dans `references-privees/`. Télécharger le JSON puis
`node scripts/save-private-export.cjs <fichier>` (copie sans écraser, relecture, message « Enregistré dans
Codespaces »). L'UI distingue « enregistré localement » de « non enregistré dans Codespaces ».

Tests (react-test-renderer + fake-indexeddb, pas de Safari réel) : source-verification-ui, source-multimerge,
source-merge(-ui), source-finalization(-ui), source-restoration, source-review, source-course, preparation,
content-import : OK. `source-review-ui.test.cjs` remplacé par `source-verification-ui` (ancien conservé en
`tests/source-review-ui.legacy.txt`). `multipass.test.cjs` échoue déjà (hors périmètre). Navigateur headless :
accueil et onglets Progression/Bibliothèque/Entraînement/Calendrier sans erreur ; chapitre 8 avec paquet
privé réel non testé en navigateur.

Reste : contrôle humain du chapitre 8, test UI de CourseWorkspace (refus d'un cours incomplet, outils
masqués), test Safari réel.

## Addendum 3 — Mise en page par sections H2, classification, tableaux

Réalisé : classification manuelle (H1–H4, Auteurs, Sommaire original, Tableau) stockée dans `BlockValidation`
(exportée/importée) ; cours « Cours » par sections H2 (sélecteur sur téléphone, précédent/suivant) ; en-tête
unique ; éditeur de tableau numérique avec validation humaine, repli sur l'image originale ; finalisation
bloquée par un tableau non validé.
Tests réels : `tests/source-structure.test.cjs` (4) + suites existantes de vérification/fusion/finalisation/
restauration, `npm run typecheck` OK.
Limites : rowSpan non rendu sur natif ; en-têtes de page toujours affichés ; en-tête mis à jour après sortie
de la vérification ; pas de test Safari réel ; chapitre 8 non finalisé.

## Addendum 4 — Classification accessible et césures PDF prudentes (16 octobre 2026)

La vérification manuelle expose désormais, près des commandes du bloc sélectionné, la
classification persistée : Texte normal, H1 à H4, Auteurs du chapitre, Tableau,
Sommaire original et Bibliographie / Références. Une décision appliquée à un bloc
fusionné est appliquée à toutes ses sources, y compris une fusion de plus de deux
blocs, sans modifier leurs statuts, corrections ou historique. Tableau ouvre toujours
l'éditeur existant ; le brouillon conserve l'image originale jusqu'à une décision humaine.

Bibliographie / Références est conservée dans les validations locales et dans l'export
JSON complet privé, mais est retirée de « Cours reconstitué » et des présentations
figées du cours final. Elle ne rejoint pas les auteurs d'en-tête. Aucun paquet privé,
PDF ou texte brut n'a été modifié.

La reconstruction applique une réparation prudente des césures intrabloc : seule une
suite alphabétique terminée par un tiret de fin de ligne et reprise par une minuscule
est réunie. Les préfixes susceptibles de former un composé, les listes et les
paragraphes séparés sont conservés ; les cas de préfixe sont signalés comme ambigus
dans la vérification manuelle. Pour deux blocs, la jonction n'est jamais automatique :
« Proposer la jonction par césure » prépare une fusion existante avec retrait du tiret,
que la personne doit contrôler et confirmer. Les décisions de présentation sont
exportées avec le bloc ; le brut reste disponible et une correction manuelle peut
toujours reprendre le texte affiché.

Tests exécutés : `npm run typecheck`, `npx tsc -p tsconfig.tests.json`, puis
`node --test tests/source-hyphenation.test.cjs tests/source-structure.test.cjs
tests/source-verification-ui.test.cjs tests/source-merge.test.cjs` : 17 tests réussis.
Ces tests utilisent IndexedDB simulé et react-test-renderer ; ils ne remplacent pas
une actualisation dans Safari avec le paquet privé réel. Le chapitre 8 reste non
finalisé et aucune anomalie n'a été supprimée ou résolue.

## Addendum 5 — Normalisation prudente des paragraphes (16 octobre 2026)

La vérification manuelle propose désormais « Proposer la normalisation des
paragraphes » pour un bloc textuel non déjà corrigé. La proposition réunit les
retours de ligne qui continuent manifestement la même phrase, avec un espace unique,
et réutilise la réparation prudente des césures. Son acceptation passe par la
correction existante : elle est enregistrée localement, exportée, visible dans le
cours reconstitué/final et annulable avec son historique. Une correction ou une
fusion déjà enregistrée n'est jamais remplacée automatiquement.

Pour deux blocs consécutifs, « Proposer la jonction de paragraphe » prépare une
fusion existante à espace ; la personne contrôle l’ordre et le texte avant
l’enregistrement. Les listes, titres, tableaux et retours après ponctuation
terminale ne sont pas rapprochés par cette règle. Ils restent affichés ou signalés
comme ambigus pour comparaison PDF. Le module est générique aux blocs textuels et
ne touche ni au PDF, ni au JSON brut, ni au plan de colonnes qui conserve l’ordre
de lecture de l'extraction.

Tests exécutés : `npm run typecheck`, `npx tsc -p tsconfig.tests.json`, puis
`node --test tests/source-hyphenation.test.cjs tests/source-paragraph-normalization.test.cjs
tests/source-verification-ui.test.cjs tests/source-merge.test.cjs
tests/source-structure.test.cjs tests/source-export-complete.test.cjs
tests/source-finalization.test.cjs` : 28 tests réussis. Couvertures synthétiques :
paragraphes roumains avec diacritiques, césures, composés, listes, titres, tableaux,
jonctions de blocs, correction/fusion existantes, rechargement simulé, export et
réimport. Les métriques de retrait, de police et d'espacement PDF restent absentes
du contrat web courant : elles ne sont pas utilisées pour déclarer une séparation
ambiguë sûre. Aucun Safari réel ni paquet privé réel n'a été modifié ou réimporté.

## Addendum 6 — Mise en page finale du cours (16 octobre 2026)

La navigation visible du chapitre ne présente plus que **Cours**, **Fiches** et
**Flashcards**. Les identifiants internes `COURS SOURCE` / `COURS COMPLET` restent
inchangés ; leur libellé visible est « Cours ». Lorsqu'un cours privé est disponible
ou finalisé, ce cours est la seule vue de cours proposée, sans onglet redondant.

L'en-tête rassemble, dans l'ordre, le numéro de chapitre, le titre classé H1, le
manuel (édition/année), les auteurs classés et, seulement après finalisation, le
temps de lecture figé. Le panneau de progression ne répète plus le manuel ni la
durée. H1, auteurs, sommaire original et bibliographie restent hors corps ; les
figures/tableaux suivent leurs décisions précédentes. H2–H4 gardent leur hiérarchie
visuelle et un sommaire repliable est dérivé des seuls titres **classés et vérifiés**.
Un élément du sommaire ouvre sa section et positionne la lecture sur son titre.

Tests exécutés : `npm run typecheck`, `npx tsc -p tsconfig.tests.json`, puis
`node --test tests/source-structure.test.cjs tests/source-verification-ui.test.cjs
tests/source-finalization.test.cjs tests/source-finalization-ui.test.cjs
tests/source-export-complete.test.cjs` : 22 tests réussis. Le test structurel
contrôle ordre, validation et exclusion de H1/auteurs/sommaire ; les tests UI
couvrent réouverture/finalisation en rendu React simulé. Le rendu tactile Safari
réel sur iPad/téléphone reste à contrôler ; aucune donnée privée ni validation du
chapitre 8 n'a été modifiée.

## Addendum 7 — Nettoyage global des retours à la ligne (16 octobre 2026)

La vérification manuelle expose « Nettoyer les retours à la ligne ». Cette action
analyse le chapitre sans écrire, puis affiche chaque proposition sûre avec son
bloc/page, le texte avant et le texte après. Les propositions retenues sont
enregistrées en lot par le mécanisme de correction existant ; elles sont donc
annulables, visibles dans le cours reconstitué/final et exportées avec leur
historique. Une seconde analyse exclut ces corrections, ce qui rend le lot
idempotent.

Les blocs déjà vérifiés peuvent être proposés. Après acceptation, leur `verifiedAt`
et une entrée `statusHistory` sont conservés, mais leur statut devient `in-review`
avec le motif de normalisation : une personne doit confirmer la nouvelle version.
Les corrections manuelles, les fusions déjà éditées, tableaux, figures, sommaires
et visuels sont exclus. Une fusion active non éditée peut être normalisée dans son
propre historique réversible ; elle n’est ni annulée ni remplacée. Les séparations
ambiguës restent inchangées et peuvent être ouvertes une par une dans la
vérification.

Tests exécutés : `npm run typecheck`, `npx tsc -p tsconfig.tests.json`, puis
`node --test tests/source-normalization-batch.test.cjs
tests/source-verification-ui.test.cjs tests/source-export-complete.test.cjs
tests/source-finalization.test.cjs tests/source-finalization-ui.test.cjs
tests/source-merge.test.cjs` : 22 tests réussis. Ils couvrent texte vérifié/non
vérifié, correction manuelle exclue, fusion, césure, ambiguïté, tableau, annulation,
export/réimport, finalisation et rechargement simulé. Aucun paquet privé réel,
PDF, JSON brut, anomalie ou validation existante n’a été modifié.

## Addendum 8 — Séparation réversible des blocs (16 octobre 2026)

La vérification manuelle affiche maintenant **« Séparer le bloc »** à côté de
« Fusionner avec un autre bloc », sur les blocs textuels et leurs fusions actives.
Le bouton ouvre un aperçu : la position de coupure est modifiable, les deux
passages résultants sont visibles avant enregistrement, puis la séparation est
sauvegardée localement. Le cours reconstruit les affiche comme deux paragraphes
sélectionnables ; l'annulation restaure le bloc logique précédent.

Une séparation est une surcouche réversible ancrée sur le bloc logique existant.
Elle ne modifie ni le PDF, ni le JSON brut, ni les identifiants de blocs source.
Les corrections, classifications, anomalies, statuts et historiques restent donc
attachés à la même ancre. Pour une fusion, la fusion et ses sources sont préservées ;
la séparation porte sur son texte affiché. Une nouvelle fusion d'un bloc séparé est
refusée tant que la séparation n'est pas annulée, évitant d'écraser une décision.
Les séparations sont présentes dans l'export/réimport complet.

Tests exécutés : `npm run typecheck`, `npx tsc -p tsconfig.tests.json`, puis
`node --test tests/source-merge.test.cjs tests/source-verification-ui.test.cjs
tests/source-export-complete.test.cjs` : 15 tests réussis. Couverts : aperçu,
persistance/remontage, annulation, bloc fusionné, conservation des anomalies/
classifications/statuts, source immuable et export/réimport. Limite : la position
est actuellement saisie numériquement dans le texte affiché ; la sélection tactile
directe d’une plage dans le lecteur reste à réaliser. Aucun paquet privé réel ni
validation réelle n'a été modifié.

## Addendum 9 — Éditeur de tableaux contextuel (16 octobre 2026)

L’éditeur numérique garde le format `BlockTable` existant et y ajoute seulement
des champs optionnels sérialisables : `rowRoles` (`normal`, `header`, `category`)
et `header` par cellule. Les tableaux déjà enregistrés sans ces champs restent
compatibles : leur première ligne conserve le rôle d’en-tête historique. Les
insertions et suppressions décalent les rôles sans modifier les cellules, fusions,
notes, image originale ou références de page.

Les commandes de tableau se trouvent maintenant dans un panneau contextuel
immédiatement au-dessus de la grille. Les poignées « + ligne/colonne » permettent
de sélectionner une ligne ou colonne, puis d’ajouter avant/après, supprimer ou
choisir le rôle de ligne sans défiler jusqu’au bas de l’éditeur. Une cellule
sélectionnée reste éditable directement et peut être marquée comme en-tête ;
fusion/défusion restent disponibles dans ce même panneau. Le rendu publié distingue
les en-têtes et les lignes de catégorie, sans transformer une catégorie en en-tête
de colonne.

Tests exécutés : `npx tsc -p tsconfig.tests.json`, puis
`node --test tests/source-structure.test.cjs` : 7 tests réussis, dont insertion,
suppression et conservation des rôles/en-têtes. `npm run typecheck` a été lancé
deux fois mais interrompu par l’environnement avec `SIGTERM` sans diagnostic TypeScript ;
il devra être relancé dans un environnement disposant de davantage de ressources.
Le test ne remplace pas une vérification tactile Safari sur iPad/téléphone. Aucun
PDF, JSON brut, paquet privé, tableau réel ou validation existante n’a été modifié.

Complément : l’éditeur propose une sélection tactile de cellules pour fusionner une
zone rectangulaire précise. Chaque cellule sélectionnable affiche une case ; la
fusion reste désactivée avant la sélection d’au moins deux cellules et refuse une
forme non rectangulaire. La défusion reste une action de la cellule d’origine.
Vérification complémentaire : transpilation TSX de `TableEditor.tsx` et
`git diff --check`, réussies. La validation tactile réelle demeure à effectuer.

Correction : une fusion ne bloque plus la suppression de lignes ou colonnes sans
lien avec elle. Lorsqu’une suppression traverse une fusion verticale ou
horizontale, son étendue est réduite sans perdre le contenu de la cellule d’origine.
Supprimer la ligne ou la colonne où commence une fusion étendue reste refusé, car
une nouvelle origine ne peut pas être choisie automatiquement sans risque de perte.
Tests : `npx tsc -p tsconfig.tests.json` puis
`node --test tests/source-structure.test.cjs` : 8 réussis, dont conservation et
réduction sûre des fusions verticales.

## Addendum 10 — Proposition de structure de tableau (16 octobre 2026)

Classer un bloc en **Tableau** ouvre désormais l’éditeur et lance une proposition
de grille non destructive. La détection accepte uniquement une organisation
répétée démontrable dans les lignes extraites (tabulations ou espacements de
colonnes récurrents) : elle conserve les cellules vides, les trois colonnes et
plus, les lignes de catégorie sur toute la largeur, et mémorise la boîte source,
la méthode, la date et les avertissements dans le brouillon exporté. La proposition
reste non validée ; l’image/PDF original reste la référence jusqu’à la validation
humaine.

Sur un tableau déjà commencé, **« Relancer la détection du tableau »** présente une
nouvelle grille sans modifier le brouillon existant. Seul **« Utiliser cette
proposition »** le remplace ; la proposition précédente est conservée dans
`detectionHistory`. Les corrections, fusions de cellules, statuts et image originale
ne sont donc jamais écrasés silencieusement.

Limite essentielle du paquet Kumar 8 existant : il contient une boîte par bloc et
des lignes textuelles, mais pas les coordonnées par fragment/ligne, les bordures,
les fonds ni une topologie de cellules. La détection ne peut donc pas reconstituer
fidèlement un tableau sans séparateurs visibles dans ce texte, ni certifier une
cellule multiligne ou une fusion issue du PDF. Dans ce cas, l’éditeur le signale et
n’invente pas de répartition ; l’analyse géométrique demandera une future version
privée du paquet qui conserve ces données, sans réextraire ni écraser Kumar 8.

Tests : `npm run typecheck` réussi ; `npx tsc -p tsconfig.tests.json` puis
`node --test tests/source-structure.test.cjs tests/source-verification-ui.test.cjs`
: 18 réussis. Ils couvrent tableau à trois colonnes, diacritiques, refus d’un texte
monocolonne ambigu, persistance/export de tableaux, et ouverture automatique de
l’éditeur après classement. Le test ne remplace pas une comparaison PDF humaine ni
un essai tactile Safari/iPad.

## Addendum 11 — Parenthèses et navigation de vérification (16 octobre 2026)

La vérification manuelle propose **« Vérifier les parenthèses »** : l’action affiche
un avant/après des accolades de prose suspectes avant toute écriture. Les accolades
numériques ou structurées, les corrections manuelles et les fusions éditées restent
inchangées. Les cellules des tableaux numériques sont incluses dans l’aperçu ; une
acceptation passe un bloc vérifié à `in-review` en conservant `verifiedAt` et son
historique. Les corrections utilisent les mécanismes réversibles existants et sont
donc exportées/réimportées avec le chapitre.

La vérification comporte aussi une barre de navigation unique en haut : pages
imprimées, blocs de la page avec aperçu/type, quatre filtres inchangés, puis
précédent/suivant. Les listes sont dérivées des mêmes cibles que la navigation,
incluant blocs ajoutés, corrections et fusions actives, sans faire réapparaître les
sources absorbées. Une page exclue par le filtre affiche **« Passer à Tous »**.
Une navigation tentée pendant une édition ouverte est refusée avec un message
explicite ; la saisie n’est jamais abandonnée silencieusement. La barre est compacte
et horizontalement défilable sur petit écran ; un essai tactile Safari/iPad reste
nécessaire.

Tests : compilation dédiée `npx tsc -p tsconfig.tests.json` et
`node --test tests/source-verification-ui.test.cjs tests/source-manual-blocks.test.cjs
tests/source-structure.test.cjs` : 22 réussis. `npm run typecheck` a été relancé
deux fois mais arrêté par l’environnement avec `SIGTERM`, sans diagnostic TypeScript.
Les PDFs, JSON bruts, données privées et stockage navigateur réel n’ont pas été
modifiés.

## Addendum 12 — Comptage de finalisation des blocs manuels (16 octobre 2026)

Le blocage massif de finalisation provenait d’une erreur de portée : chaque bloc
manuel actif était contrôlé à l’intérieur de la boucle de toutes les parties PDF.
Un même bloc manuel était donc compté une fois par partie source (par exemple cinq
blocs manuels et 296 parties donnaient artificiellement 1480 points). Le contrôle
est maintenant exécuté une seule fois par bloc logique manuel actif, après l’analyse
des parties PDF. Les blocs absorbés restent exclus par les règles de fusion
existantes ; aucun statut, historique, fusion, correction, anomalie ou stockage
n’a été modifié.

La finalisation présente un résumé des blocages : blocs actifs, blocs manuels,
anomalies, tableaux et structure/provenance. La liste des raccourcis vers les
passages est repliée par défaut et ne s’affiche qu’après action explicite.

Tests : `npx tsc -p tsconfig.tests.json` puis
`node --test tests/source-manual-blocks.test.cjs tests/source-finalization.test.cjs
tests/source-structure.test.cjs` : 17 réussis, dont deux blocs manuels comptés
exactement deux fois au total. `npm run typecheck` a été interrompu par
l’environnement avec `SIGTERM`, sans diagnostic TypeScript ; il doit être relancé
dans un environnement disposant de ressources suffisantes. Aucun Safari réel ni
paquet privé réel n’a été lu ou modifié par les tests.

## Addendum 11 — Blocs logiques manuels indépendants (16 octobre 2026)

La vérification manuelle permet désormais **« Ajouter un bloc après »** le bloc
source ou manuel sélectionné. L’ajout reste une surcouche persistée de la
validation : chaque bloc possède un identifiant stable généré localement, un texte,
un ancrage d’ordre, et une provenance explicite (`sourceSha256`, page imprimée,
page PDF et bloc source). Le paquet `SourcePacket`, le PDF, le JSON brut et les
lignes extraites ne sont jamais modifiés.

Le nouveau bloc est une cible autonome pour les filtres, la navigation, le statut,
la classification, les commentaires et la validation humaine. Il est affiché après
son ancre dans le cours reconstruit et, une fois vérifié, dans l’archive finalisée.
La création affiche un aperçu et exige une confirmation. Son annulation est
persistée (sans suppression silencieuse de l’historique) et impose d’annuler
auparavant les éventuels blocs enfants. L’action de déplacement de texte n’est pas
exposée : elle requerrait une sélection explicite et une confirmation qui retire le
passage source sans écraser ses corrections ; elle ne doit pas être simulée par une
duplication.

Les exports complets incluent les blocs manuels et leurs validations ; l’import
refuse une provenance liée à une autre empreinte source et reconstitue les cibles
sans doublon. La finalisation bloque indépendamment tout bloc manuel non vérifié ou
sans référence PDF compatible. Tests prévus/exécutés dans ce répertoire :
`source-manual-blocks.test.cjs` (ordre, IDs, annulation, filtre, reconstruction,
export/import et finalisation). La vérification tactile Safari avec le paquet privé
réel reste à effectuer ; aucun paquet privé n’a été réimporté.

## Addendum 12 — Associations manuelles (16 octobre 2026)

Le modèle de validation conserve désormais les associations manuelles entre une
ancre exacte du texte source (texte, occurrence et plage) et un bloc logique
destination, y compris les blocs manuels. Les associations sont exportées et
réimportées avec leur état et historique. Une modification de texte, une
destination absorbée ou séparée demande une réassociation humaine et bloque la
finalisation ; elle ne valide pas le contenu médical. L’interface permet de créer,
prévisualiser, modifier et supprimer ces liens, puis d’ouvrir un inspecteur pour
un visuel/tableau ou de naviguer vers le texte/titre. Les tests automatisés ne
remplacent pas la comparaison humaine PDF/Safari, qui reste à faire.

### Complément — Accès et sélection du passage associé (16 octobre 2026)

Le bouton « Associer un élément » et le stockage existaient déjà. Le panneau
affiche maintenant la page, l’identifiant et le texte du bloc source en lecture
seule. Sélectionner un passage renseigne l’ancre exacte et son occurrence ; la
saisie manuelle reste disponible. Les destinations ont une cible tactile d’au
moins 48 points et un aperçu d’image pour les figures/visuels/tableaux sources.
Aucune nouvelle architecture ni modification du paquet privé.

Validation : les 12 tests de `source-verification-ui.test.cjs` réussissent,
dont sélection de la seconde occurrence, enregistrement, remontage, ouverture
du lien dans le cours et fermeture de l’inspecteur. `npm run typecheck` et
l’export web distinct `/tmp/norya-association-web-20261016` réussissent. Aucun
fichier PDF, paquet privé ou extraction brute repéré dans la liste de l’export.
`npm test` hors sandbox : 110 réussis sur 117 ; les 7 échecs concernent
`multipass.test.cjs` (6, contenu/QCM) et `source-course.test.cjs` (1, césure),
dans des modules non modifiés par cette intervention. L’exécution en sandbox
avait également bloqué un sous-processus de `preparation.test.cjs` avec EPERM.
La sélection tactile et le rendu sur Safari/iPad réel restent à contrôler.
Pas de publication, de réimport, de validation humaine ni d’opération sur le
rebase en cours. La sauvegarde dans `/tmp/norya-association-backup` est temporaire.

Complément : « Enregistrer et ajouter une référence » conserve l’association
enregistrée et prépare une nouvelle ancre sur le même texte. Le panneau affiche
le nombre de références déjà enregistrées. Les 13 tests d’interface réussissent,
dont deux références du même paragraphe vers deux figures distinctes, persistées
et cliquables après remontage. La vérification TypeScript réussit également.

Complément — Destinations dans tout le chapitre : retrait de la limite visuelle
aux 80 premières destinations. La liste défilante propose maintenant tous les
autres blocs du chapitre, avant ou après le passage source ; la recherche reste
disponible. Le test ajouté échouait avec 80 destinations au lieu de 100 avant le
correctif et réussit après, avec enregistrement d’une destination sur la page
suivante sans recherche. Les 14 tests d’interface et `npm run typecheck` réussissent.
Le stockage et les identifiants sont inchangés ; Safari/iPad réel reste à vérifier.

### Complément — Visibilité du bloc ajouté (16 octobre 2026)

Un ajout depuis « Vérifiés » était enregistré mais aussitôt masqué par le filtre :
le nouveau bloc est volontairement `pending`. Après confirmation et succès de la
sauvegarde, la vérification passe désormais à « Tous », sélectionne le bloc ajouté
et retire l’éventuelle page de navigation temporaire. Le filtre « Mes anomalies »
ne masque donc plus non plus un nouvel ajout. Aucun statut n’est validé pour le
rendre visible et le mécanisme de stockage reste inchangé.

Le test reproduit la disparition visuelle avant correction, puis vérifie après
correction l’affichage immédiat, le statut en attente, la persistance et la même
identité après démontage/remontage avec IndexedDB simulé. Les 15 tests d’interface
réussissent. Cela ne permet pas de certifier le stockage du Safari personnel de
l’utilisateur ; aucun cache ni donnée réelle n’a été effacé ou réimporté.

Précision après signalement de la barre de blocs : une page choisie explicitement
restait prioritaire sur la page du bloc courant lors de la navigation précédent/
suivant. La navigation retire désormais cette sélection temporaire, comme l’ajout,
afin que la barre suive le bloc affiché. Les tests contrôlent la présence et la
sélection du bloc ajouté dans la barre immédiatement et après remontage, ainsi
que le retour à la page précédente après un saut de page. Les 16 tests d’interface
réussissent ; le stockage reste inchangé.

### Complément — Suppression des associations d’un bloc supprimé (16 octobre 2026)

L’annulation de création d’un bloc manuel, seule suppression de bloc actuellement
exposée, supprime désormais aussi ses associations entrantes et sortantes, en
comparant page et identifiant. Elle réutilise `deleteAssociation` : les liens
disparaissent des références actives, mais leur date de suppression et leur
historique sont conservés dans l’export. Bloc et associations sont enregistrés
ensemble par la sauvegarde existante. Les autres liens restent inchangés.

Vérifications réussies : compilation des tests, suites `source-associations`,
`source-manual-blocks` et `source-verification-ui`, puis `npm run typecheck`.
Le nouveau test couvre liens entrants/sortants, état précédent immuable,
conservation d’un lien indépendant et export/réimport sans réapparition des liens
supprimés. Aucune suppression rétroactive dans le stockage personnel de Safari.

### Complément — Réparer les associations antérieures à ce correctif

La vérification affiche « Retirer les associations des blocs supprimés » lorsque
des liens non supprimés concernent une création manuelle explicitement annulée
(`undoneAt`, page et identifiant concordants). Cette action volontaire applique
la suppression historique existante et sauvegarde localement. Elle ne retire pas
les liens vers des blocs seulement absents, fusionnés, séparés ou modifiés : ces
cas demandent toujours une revue. Aucun changement de statut humain ni effacement
d’historique ; la réparation est idempotente.

Tests réussis : 4 tests d’associations et 17 tests d’interface, compilation dédiée,
TypeScript et export web distinct `/tmp/norya-repair-deleted-links/web`. Le test
simule une ancienne suppression sans retrait du lien, reproduit le blocage de
finalisation, utilise le bouton, recharge et constate que ce blocage est levé avec
les validations conservées. Le stockage personnel de l’utilisateur n’est pas
accessible ici : il doit déclencher la réparation dans son navigateur avec cette
version de l’application. Aucune finalisation humaine n’a été faite par les tests.

### Complément — Ouverture visible des références (16 octobre 2026)

L’inspecteur des figures était rendu après le lecteur, potentiellement hors écran.
Les références textuelles dépendaient d’un nouveau `onLayout` pour défiler vers
leur cible, même si celle-ci était déjà montée. Les références actives ouvrent
maintenant une fenêtre modale au-dessus du cours, avec texte numérique ou visuel/
tableau selon la destination et fermeture toujours accessible. Le lecteur reste
monté, sans changement de section ni défilement : fermer retrouve le passage.
Les associations demandant une réassociation affichent une erreur explicite.

Les 18 tests de vérification/lecture réussissent, dont référence textuelle sur
une autre page avec identifiant répété, lecture d’une version finalisée, ouverture
modale d’une figure et fermeture conservant le lecteur. TypeScript réussit.
Ces tests simulent React et ne certifient pas le clic tactile Safari/iPad ; aucune
association ni archive finalisée existante n’est réécrite par le correctif.
