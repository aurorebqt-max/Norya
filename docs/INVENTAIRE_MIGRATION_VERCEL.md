# Inventaire avant nettoyage — 20 octobre 2026

Lecture seule. Aucun fichier autorisé à la suppression ; aucune sauvegarde indépendante vérifiée. Les dépendances indiquées sont des références textuelles directes et nécessitent une revue avant retrait.

| Fichier | Octets | Dépendances directes |
|---|---:|---|
| src/data/extendedLessons.ts | 29480 | src/data/romanianLessons.ts |
| src/data/importedKumar.ts | 257112 | src/data/romanianLessons.ts, src/domain/learning/store.ts, src/state/DemoProvider.tsx, scripts/content-import/compile.cjs, tests/content-import.test.cjs |
| src/data/reconstructedLessons.ts | 55121 | src/data/romanianLessons.ts, src/domain/learning/store.ts, tests/multipass.test.cjs |
| src/data/reconstructedSepsis.ts | 100758 | src/data/reconstructedLessons.ts, src/data/romanianLessons.ts |
| src/data/romanianLessons.ts | 21556 | src/components/BilingualText.tsx, src/components/CatalogCourseReader.tsx, src/components/ChapterAudio.tsx, src/data/documentation.ts, src/data/extendedLessons.ts, src/data/importedKumar.ts, src/data/kumarSelection.ts, src/data/reconstructedLessons.ts, src/data/reconstructedSepsis.ts, src/data/revisionTables.ts, src/data/romanianQuestions.ts, src/data/sepsisAddendum.ts, src/domain/learning/estimate.ts, src/domain/learning/kumarMigration.ts, src/domain/learning/quiz.ts, src/domain/learning/store.ts, src/screens/Chapter.tsx, src/screens/Flashcards.tsx, src/screens/Podcasts.tsx, src/screens/Progress.tsx, src/screens/Quiz.tsx, src/state/DemoProvider.tsx, scripts/content-import/compile.cjs, tests/multipass.test.cjs |
| references-privees/KUMAR EDITABIL.pdf | 268949813 | src/data/courseCoverage.ts, scripts/audit-book-sources.py, scripts/source-course/pipeline.py |

Conserver Thematica/rezidentiat, errata, métadonnées, programmes, QCM et progression. Ne pas supprimer `references-privees/cours`, les exports ni les PDF tant qu’une copie indépendante et la restauration Safari ne sont pas vérifiées.

Inventaire détaillé reproductible : `node scripts/inventory-course-migration.cjs` (chemins, tailles, dépendances ; aucun contenu médical).
