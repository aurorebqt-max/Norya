# Import Kumar 8 et 9 — préparation uniquement

## Analyse de l’existant

`src/data/romanianLessons.ts` expose `RomanianLesson`: titres et textes RO/FR obligatoires, sections avec `text`, `express`, références `pages`, et questions. Il assemble les leçons initiales, `extendedLessons` et `reconstructedLessons`, puis ajoute des questions et fabrique des flashcards depuis les sections. `src/screens/Chapter.tsx` consomme cette collection, avec tableaux complémentaires provenant de `revisionTables`. Ce chemin ne convient pas à une source Markdown exacte: français et résumés ne doivent pas être fabriqués, ni les tableaux ajoutés depuis les anciens cours.

Le nouvel import est isolé de ce chemin. Aucun écran, bouton, chapitre, QCM ou stockage n’est modifié. Les boutons Cours complet, Fiches et Flashcards restent donc présents avec leur comportement actuel. Le branchement et le rendu Markdown étudiant seront à réaliser lors de l’intégration autorisée, avec tests visuels des tableaux et formules; aucun affichage étudiant nouveau n’est livré ici.

## Commandes

- `node scripts/content-import/import.cjs`: contrôle structurel; accepte un brouillon valide, mais indique `ready: false` et les blocages.
- `node scripts/content-import/import.cjs --stage`: même contrôle et export JSON dans `build-validation/content-import/kumar-staging.json` (ignoré par Git).
- `node scripts/content-import/import.cjs --require-ready`: contrôle bloquant de finalisation, code de sortie 1 tant que les deux sources ne sont pas finalisées et vérifiées.
- `npm test`: inclut les tests de l’import.

Aucune commande ne publie de cours, même lorsque `ready` est vrai. La vérification automatisée contrôle les attestations et la structure; elle ne constitue pas une vérification médicale.

## Contrat de données sans perte

`contenus-norya/import-manifest.json` décrit exclusivement les deux fichiers autorisés. Le JSON de staging conserve `rawMarkdown` intégralement, son SHA-256, et des sections contiguës en ordre source (`startLine`/`endLine`, bornes inclusives à partir de 1). La concaténation des `markdown` de section avec un saut de ligne reconstitue exactement le fichier. Les titres et toute la hiérarchie interne, tableaux Markdown ou tabulés, nombres, formules Unicode/LaTeX et références sont conservés sans conversion éditoriale. Le premier chapitre utilise notamment des titres sans `#` et des tableaux tabulés: ils ne sont pas réécrits automatiquement.

Les IDs de section sont stables et propres au nouveau contenu. Conserver les IDs lors des révisions; attribuer un nouvel ID à une nouvelle section. Actualiser les bornes après toute modification. L’empreinte invalide un index ou une vérification périmés. L’index initial est un inventaire technique, sans attestation médicale de couverture: les listes `pages` sont volontairement vides.

Chaque section porte un type (`course`, `sheet`, `flashcards`, `metadata`, `editorial`) et un statut (`draft`, `planned`, `verified`, `editorial`). Les six titres à rédiger du chapitre 9 sont `planned`. Les fiches et flashcards déjà présentes dans le Markdown 8 sont conservées comme brouillons source, mais les collections utilisables `fiches` et `flashcards` restent vides. Aucun résumé ni carte n’est généré. `translation: null` signifie qu’aucun français vérifié n’a été fourni.

Pour finaliser: statut chapitre `complete`, sections pédagogiques `verified`, pages de référence renseignées uniquement dans 151–168 ou 172–190 et 195–202, couverture attestée de toutes ces pages, et `verification` avec `status: verified`, `reviewer`, `date` ISO et `sha256` du fichier relu. Les instructions de rédaction doivent être résolues dans les sources. Les références seules et titres vides ne suffisent pas. Les contrôles textuels détectent les marqueurs connus de travail; une relecture humaine reste indispensable pour d’autres formulations.

## Migration non destructive prévue

Aucune migration n’est exécutée dans cette préparation. Les clés `norya.preparation` (profil, notes, événements, calendrier/progression) et `norya.learning.v1` (QCM, lecture, notes de sections, surlignages, cartes personnelles) restent inchangées. L’existant possède déjà une migration `migrateRebuiltCourseData` avec archivage des lectures et annotations orphelines; elle ne doit pas être relancée ou détournée pour cet import.

Lors de l’activation future:

1. Sauvegarder les snapshots bruts sous des clés versionnées dédiées, vérifier leur relecture avant toute écriture et garder les originaux en cas d’erreur.
2. Conserver les IDs de chapitre `kum-08` et `kum-09`, les objectifs, calendriers, événements de progression et résultats QCM (avec leurs snapshots). Ne pas modifier les autres chapitres.
3. Versionner séparément la nouvelle lecture par empreinte de contenu. Archiver les anciens repères et passages sans les déclarer accomplis sur le nouveau cours.
4. Conserver notes et surlignages avec leur version et section d’origine. Aucune correspondance automatique par index ou similarité; réassociation uniquement explicite, sinon consultation dans les archives. Garder également toutes les cartes personnelles.
5. Rendre la migration idempotente et réversible, puis tester interruption d’écriture, restauration, répétition et données provenant de plusieurs versions avant activation.

Cette stratégie est documentée, pas implémentée: aucun accès au stockage depuis l’importeur.

## Fichiers nécessaires pour la suite

Fournir les versions définitives de `contenus-norya/kumar-08.md` et `contenus-norya/kumar-09.md`, accompagnées de l’attestation de relecture (personne, date, statut) et des références de pages par section. L’index `contenus-norya/import-manifest.json` sera actualisé sur ces versions exactes. Des fiches, flashcards et traductions françaises peuvent être fournies séparément avec leur vérification; elles sont facultatives et ne seront jamais générées pour combler une absence.

Aucun PDF n’est lu par l’importeur ou incorporé à son export. Les PDF privés restent dans `references-privees/`, déjà ignoré par Git. Le staging reste hors de `src` et n’est importé par aucune route Expo. Ne pas déplacer de PDF privé vers les ressources de l’application.
