# Méthode de reconstruction et vérification des chapitres

Méthode conservée à partir du pilote Kumar 8, le 16 octobre 2026. Objectif : la
réutiliser pour les 39 chapitres et les autres manuels. Ce document décrit le
processus requis, pas une promesse que tous les outils sont déjà généralisés.
Lire [l'état du pilote](ETAT_CHAPITRE_08.md) et les [consignes agents](../AGENTS.md).

## 1. Reprendre sans perdre le travail

Lire `git status` et `git diff`, repérer un rebase et les modifications antérieures.
Sauvegarder les seuls fichiers à modifier, sans secrets. Inventorier les versions
privées, les rapports de revue et les empreintes avant une opération risquée.
Ne pas nettoyer Git, les bases navigateur ou les caches pour résoudre un affichage.
Ne pas remplacer automatiquement le paquet importé. Les données de Safari ne sont
pas accessibles par la seule présence des fichiers dans Codespaces.

La sauvegarde des données utilisateur doit conserver le paquet importé et les
validations, anomalies (résolues comprises), commentaires/historique, annotations
et traces de fusion. Un export d'anomalies seul n'est pas une sauvegarde complète
des validations ou des fusions. Ne pas prétendre à une sauvegarde si son mécanisme
n'a pas été contrôlé. Garder les exports privés ; vérifier qu'ils se relisent.

## 2. Repérer sources et outils

| Ressource | Emplacement et rôle |
|---|---|
| PDF original pilote | `references-privees/KUMAR EDITABIL.pdf` |
| Périmètre fourni | `references-privees/rezidentiat-M-2026.pdf` |
| Extraction pilote | `references-privees/cours/kum-08/v1/` |
| Provenance | `manifest.json` : empreintes, édition, périmètre, pages |
| Par page imprimée | `raw.txt`, `blocks.json`, `original.png`, `original-page.pdf`, `review.json`, `visual-inventory.json` |
| Composition | `layout-plan.json`, `composition-report.json` |
| Contrôle technique | `verification.json`, `control-report.json`, `control-report.html`, `independent-pypdf.txt` |
| Paquet structuré | `norya-private-course-v2.json` ; le fichier sans `-v2` est le fac-similé v1 |
| Rapports humains | `references-privees/rapports-anomalies/` |
| Extraction et composition | `scripts/source-course/{pipeline,control,compose}.py` |
| Contrat d'import | `src/domain/sourceCourse/packet.ts` |
| Chargement privé | `src/services/storage/privateCourse.ts`, `privatePdfs.ts` |
| Présentation commune | `src/domain/sourceCourse/displayCorrections.ts`, `src/components/SourcePresentationText.tsx` |
| Lecteur et revue | `src/components/PrivateSourceCourse.tsx`, `SourceCourseVerification.tsx` |
| Anomalies/validations | `src/domain/sourceCourse/{anomalies,verification,reviewNavigation}.ts`, `src/services/storage/sourceValidation.ts` |

Les anciens documents `COURS-SOURCE-PRIVE.md`, `VERIFICATION-KUMAR-08.md` et
`COURS-NORYA-CHAPITRE-8.md` conservent des informations historiques. Leurs mentions
« terminé » ne prouvent pas l'état courant ; consulter l'état daté et les tests.
Ne pas prendre les cours bêta, résumés, fiches ou traductions de `src/data` comme
source de reconstruction fidèle du PDF roumain.

## 3. Définir le périmètre avant d'extraire

Identifier manuel, édition, chapitre, preuves de périmètre, pages imprimées/PDF,
limites intrapage, figures, tableaux et exclusions. Calculer les empreintes du PDF
et du document de périmètre. Consigner la correspondance de chaque page.

Le pilote est limité à Kumar 8 : pages imprimées 151–168, PDF 174–191, décalage +23.
Le pipeline attend 1568 pages et une entrée Tematica précise. `packet.ts`, les clés
de stockage et plusieurs composants sont également spécifiques à `kum-08`.
Ne pas réutiliser ces constantes pour les autres chapitres. Avant de généraliser,
définir un profil documentaire explicite et ses tests, sans changer les IDs des
données déjà relues. Aucun chapitre suivant ne démarre sans confirmation.

## 4. Extraire dans une nouvelle version privée

Les dépendances exactes sont dans `scripts/source-course/requirements.txt`.
Exemple pour une **nouvelle extraction autorisée de Kumar 8 uniquement** : choisir
un répertoire inédit ; `vN` ci-dessous est un emplacement à remplacer, pas une
version à réutiliser aveuglément.

```sh
python3 scripts/source-course/pipeline.py extract --output references-privees/cours/kum-08/vN
python3 scripts/source-course/pipeline.py verify --output references-privees/cours/kum-08/vN
python3 scripts/source-course/control.py --output references-privees/cours/kum-08/vN
```

`extract` refuse un dossier existant. `verify` écrit un rapport et peut retourner 1
tant que la revue humaine est incomplète : distinguer ce cas des erreurs techniques.
`control.py` réécrit des artefacts dérivés et le paquet v1 ; ce n'est pas une simple
lecture. Ne jamais le lancer sur la seule copie d'un travail relu.

Conserver la sortie brute exacte et les coordonnées des blocs/lignes/spans.
La comparaison de deux extracteurs n'est ni un OCR indépendant ni une validation
humaine. Une extraction reproductible peut reproduire une erreur de la couche texte.

## 5. Reconstruire sans réécrire le cours

Comparer chaque page au PDF : déterminer colonnes et ordre de lecture, paragraphes
sémantiques complets, titres et sous-titres, listes, encadrés, tableaux et légendes.
Un bloc PDF technique n'est pas nécessairement un paragraphe. Reconstituer le
paragraphe complet avant de le découper pour l'affichage ou la navigation.

Établir le `layout-plan.json` lié au SHA-256 de la source, dans la nouvelle version.
Contrôler ses zones avant la composition : la commande ne crée pas ce plan.

```sh
python3 scripts/source-course/compose.py --output references-privees/cours/kum-08/vN
```

Cette commande réécrit le paquet v2 et le rapport de composition. L'exécuter
uniquement dans la copie de travail versionnée. Elle contrôle couverture des lignes,
absence de duplication et identité du texte extrait ; elle ne garantit pas les
limites sémantiques des paragraphes. Les IDs `part-N` dépendent de la composition :
une recomposition exige une correspondance explicite avec les IDs déjà annotés.

Séparer trois couches : source brute immuable, transcription/corrections tracées,
présentation dérivée. Dans le pilote, `sourcePresentation` applique des corrections
de présentation ; `noryaPresentation`, quand présent, est un supplément du paquet.
Ne jamais écraser le brut pour faire passer le parseur : `part.text` doit correspondre
exactement aux lignes sources. Ne pas inventer de texte pour combler un doute.

Réparer uniquement les coupures de mots et de lignes artificielles confirmées.
Préserver vrais traits d'union, paragraphes, puces, numérotation, valeurs, unités,
ponctuation et diacritiques. Les expressions régulières de reflow du pilote sont
ciblées : ne pas les appliquer globalement à un autre manuel sans contrôle.

## 6. Présenter texte et figures

Titres, paragraphes, listes et sommaires restent sélectionnables. Dans un sommaire,
chaque entrée garde son numéro sur la même ligne et sa colonne. Un tableau simple
devient numérique seulement si en-têtes, cellules, notes et associations sont fiables.
Les schémas et figures complexes, ainsi que les tableaux complexes explicitement
désignés, restent des images originales complètes, avec zoom et accès au PDF.
Conserver légendes et renvois ; les paragraphes autour restent numériques.

Ne pas décider qu'un texte est une image à partir de sa seule longueur ou parce
que sa page contient une figure. `kind: visual` peut désigner une extraction incertaine,
pas nécessairement une illustration. Le PDF/page intégrale est une vue de référence,
jamais un camouflage d'une mauvaise transcription.

Partager les règles entre cours et vérification, et tester les deux. Une ancienne
surcouche persistée ne doit pas masquer les corrections actuelles. Inspecter aussi
la compilation réellement servie : modifier `src/` ne met pas à jour un ancien
`dist/`. Recompiler localement après sauvegarde ; publier est une action distincte.

## 7. Importer et conserver les corrections

Après contrôle et accord sur le remplacement, choisir explicitement le paquet v2
avec le bouton d'import du lecteur. Ne pas automatiser cet import lors d'une
correction de présentation. Le suffixe `v1` de la clé de stockage ne prouve pas la
version du paquet : lire `schemaVersion`, le chapitre et l'empreinte dans le contenu.

| Données | Stockage actuel |
|---|---|
| Paquet web | IndexedDB `norya-private-pdfs`, store `pdfs`, clé `norya-private-source-course-kum08-v1` |
| Paquet mobile | Répertoire documentaire privé `norya-private-source-courses/kum08.json` |
| Validations web | IndexedDB `norya-validations`, store `validations`, clé `kum-08` |
| Validations mobile | AsyncStorage `norya-validation-kum-08` |
| Anciennes anomalies web | IndexedDB `norya-anomalies`, store `anomalies`, clé `norya-anomalies-kum-08` |
| Anciennes anomalies mobile | AsyncStorage `norya-anomalies-kum-08` |

Les anomalies intégrées à `validation.anomalies` sont prioritaires sur l'ancien
stockage séparé. Ne pas effacer une source pour résoudre une divergence ; comparer
et préserver les historiques. L'import mobile copie l'ancien paquet ; l'import web
le remplace sans archive automatique équivalente. Sauvegarder avant remplacement.
Le JSON du dépôt et le paquet déjà importé peuvent différer.

Pour toute correction, conserver source/version, chapitre/page/bloc, avant/après,
raison et preuve visuelle. Les corrections du pilote dans le code ne constituent
pas encore un éditeur générique persisté pour tous les chapitres. Le statut humain
et son historique restent indépendants de la correction d'affichage.

## 8. Vérification humaine et anomalies

Comparer cours et PDF bloc par bloc. Contrôler couverture, ordre, titres, listes,
chiffres/unités, tableaux, figures et légendes. Signaler tout doute avec un identifiant
stable incluant chapitre, page et bloc ; ne jamais perdre les commentaires antérieurs.

Statuts d'anomalie : ouverte (`open`), à revérifier (`corrected-pending-review`), résolue
(`resolved`). Statuts de bloc distincts : `pending`, `in-review`, `verified`,
`issue-found`, `corrected`. Aucun import, test ou correctif n'autorise une promotion
automatique en vérifié. Une résolution ne supprime ni l'anomalie ni son historique.
Lire les comptes enregistrés ; les nombres d'un ancien rapport ne sont pas des constantes.

Contrat requis : les blocs vérifiés quittent « À traiter » et restent accessibles
dans « Vérifiés » et « Tous ». Vérifier la navigation avec des IDs répétés sur des
pages différentes et des anomalies actives sur un bloc anciennement vérifié.
Ce contrat n'est pas entièrement raccordé à l'interface actuelle : voir l'état.

## 9. Contrat de fusion à terminer

Sélectionner deux blocs textuels, adjacents ou non, en conservant leurs identités
complètes et l'ordre choisi. Prévisualiser la jonction (espace, saut, concaténation,
coupure de mot contrôlée), permettre la correction manuelle, puis sauvegarder un
objet de fusion réversible sans modifier la source. Préserver toutes les annotations,
anomalies, commentaires et validations historiques ; aucune validation automatique.

Afficher le résultat une seule fois dans les deux interfaces, avec accès aux sources.
L'annulation d'une fusion déjà enregistrée doit restaurer les blocs d'origine sans
effacer les commentaires créés entre-temps. Fermer un aperçu n'est pas une annulation
persistante. Tester après fermeture/remontage puis, quand accessible, après actualisation
dans le navigateur réel. La fusion actuelle est absente de l'interface ; ne pas
présenter ce contrat comme implémenté.

## 10. Tests et critères de passage

```sh
npm run typecheck
npx tsc -p tsconfig.tests.json
node tests/source-course.test.cjs
node tests/source-review.test.cjs
node tests/source-restoration.test.cjs
node scripts/audit-source-merge.cjs
python3 -m unittest discover -s scripts/source-course -p 'test_*.py'
```

Le script d'audit imprime les capacités observées ; son code de sortie 0 signifie
que le diagnostic s'est exécuté, pas que la fusion fonctionne. Les tests React et
fake IndexedDB/AsyncStorage n'accèdent pas aux données personnelles de Safari.

Exécuter également `npm test` avant de déclarer une version saine ; documenter
chaque échec ou blocage au lieu de supprimer les tests. Au besoin borner un diagnostic
de l'interface : `node --test --test-timeout=15000 tests/source-review-ui.test.cjs`.
Pour une modification d'affichage, vérifier l'export web dans une sortie distincte :
`npm run export:web -- --output-dir /tmp/norya-web-controle` (chemin inédit conseillé).
Contrôler l'absence de ressources privées dans l'export ; ne pas publier automatiquement.

Vérifier aussi le rendu réel et le zoom, l'égalité des deux interfaces, les données
persistées après actualisation et l'intégrité des fichiers privés par empreintes.
Un test technique ne certifie pas la fidélité médicale. Consigner ce qui n'a pas
pu être testé. Tenir un état daté par chapitre avec preuves et limites.

## 11. Après validation du cours

1. Intégrer fidèlement les errata 2021 applicables, avec provenance et signalement
   distinct, sans réécrire silencieusement la source originale.
2. Traduire fidèlement en français le contenu validé, en conservant les liens source.
3. Produire l'audio pour écoute nocturne à partir de ce contenu contrôlé.
4. Produire les fiches détaillées et express, dérivées du cours validé.
5. Associer les QCM existants, avec références ; ne pas inventer leurs corrigés.
6. Vérifier définitivement le chapitre et ses contenus dérivés.

Pour les autres manuels, vérifier l'édition et l'applicabilité des errata. Ne pas
exécuter ces étapes pendant une simple restauration ou un audit. Ne commencer
le chapitre suivant qu'après confirmation explicite de l'utilisateur.

## 12. Associations manuelles entre blocs

Une association est une décision humaine persistée : elle conserve le bloc logique
source et cible (page imprimée + identifiant stable), le texte exact de l’ancre,
son occurrence, sa plage, le type de destination et l’historique. Elle n’est pas
une validation médicale. Toute correction de la source, destination absorbée,
séparée ou devenue indisponible impose une réassociation explicite ; aucune
redirection automatique n’est admise. Les exports privés complets conservent ces
associations et la finalisation reste bloquée tant qu’une association active exige
une réassociation.
