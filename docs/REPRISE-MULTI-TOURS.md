# Reprise Norya — 11 octobre 2026

## État retrouvé

Le dépôt contenait des modifications non commitées : migration vers le rezidențiat, index Tematica 2026 (39 chapitres), écran Référentiel privé et dépendances Expo associées. Elles ont été conservées. Le calendrier existant répartissait un premier tour et un second passage opportuniste. Profil, journal de travail, annotations et rappels étaient persistés localement. Une fiche néphrotique française avec cartes/QCM existait dans un prototype distinct, sans rattachement effectif au nouveau programme roumain. Aucune traduction RO–FR généralisée ni couverture médicale complète n’était disponible.

## Fonctionnalités ajoutées

- Étape onboarding dédiée : 1, 2, 3, 4 ou 1–10 tours ; réglage ultérieur dans Profil.
- Date de concours saisie par l’étudiant ; aucune date exacte préchargée pour les nouveaux profils. Les dates historiques sont conservées. Le seul programme disponible reste celui de 2026, même si une autre année est choisie.
- Charge basée sur les plages de pages de l’index (904 pages, comptage inclusif sans doublons à l’intérieur d’un chapitre). Base provisoire 8 minutes/page modifiable, puis 65 % au deuxième tour et 40 % aux suivants. Ce ne sont pas des durées pédagogiques validées ; les pages partiellement incluses sont comptées comme des pages entières.
- Tours séquentiels dans le calendrier, échéances prévues et progression indépendante. Les chapitres fragiles sont prioritaires dans les tours suivants.
- Validation explicite par chapitre/tour, séances partielles et validation anticipée selon le temps réellement déclaré. Consulter, écouter, répondre à un QCM ou réviser une carte ne valide aucun tour.
- Recalcul selon la date courante, les séances, disponibilités, absences, rythme et nombre de tours. Les tours retirés de l’objectif restent dans l’historique.
- Rappels en parallèle : budget plafonné à 20 % tant qu’un tour reste à faire, puis 50 % pendant le dernier mois. Le temps non utilisé par les rappels reste disponible pour les passages. Les prévisions supposent des rappels réussis ; les événements réels les remplacent.
- Objectif impossible signalé avec estimation du besoin horaire. Après le concours, les tâches tardives ne représentent qu’une projection ; horizon borné à un an après le concours ou le jour de reprise. Une prévision hors horizon reste indéterminée.
- PDF privés web dans IndexedDB ; copies natives dans le stockage de l’application. Réimporter ou retirer une association conserve les anciennes copies. Aucun PDF privé distribué.
- Écritures pédagogiques sérialisées pour conserver cartes/résultats lors d’actions rapprochées ; un stockage illisible ne revient plus silencieusement à un état vide.

## Contenus effectivement disponibles

Le nouveau module du chapitre Kumar 8 contient cinq sections originales détaillées et express, en roumain/français/bilingue, cinq flashcards et quatre QCM à réponse unique. Il couvre les notions fondamentales de sepsis, mécanismes, reconnaissance, choc, investigations et réévaluation antibiotique. Il ne couvre pas encore tous les tableaux de molécules, posologies, résistances et prophylaxies : l’interface l’indique explicitement. Relecture médicale et linguistique requise.

Sources lues : `references-privees/rezidentiat-M-2026.pdf` (p.1–4), `SEPSIS.pdf` (chapitre p.151–168, repères indiqués par section), `20211121-erata-23aug2021.pdf` (corrections du chapitre, PDF p.1). Le seul erratum trouvé est daté de **2021** ; aucun erratum identifié comme 2026 n’a été trouvé. Ne pas lui attribuer artificiellement une date de 2026.

Vérification clinique complémentaire : [SCCM, recommandations adultes 2026](https://www.sccm.org/survivingsepsiscampaign/guidelines-and-resources/surviving-sepsis-campaign-adult-guidelines), notamment la limite du qSOFA comme outil unique. Cette source ne remplace pas la bibliographie du concours.

La fiche néphrotique et ses anciens résultats sont conservés. Elle n’est pas présentée comme une fiche roumaine validée. Les autres chapitres disposent d’un index, du lien vers leur PDF privé, d’annotations et du suivi multi-tours ; leurs fiches originales restent à rédiger.

## Validation

- TypeScript : `npm run typecheck` — réussi.
- Tests métier : `npm test` — **31 tests réussis**, y compris tours successifs, déterminisme, capacité quotidienne, J−30, retard, jours de repos, séances partielles, validations anticipées, migration, redémarrage du repository, annotations, erreurs disque et écritures concurrentes, identifiants de cartes uniques et liens des contenus au programme.
- Bundles : `npx expo export --platform all --output-dir build-validation` (web, Android, iOS) — réussi ; aucun fichier PDF dans l’export.
- Dépendances : `npm run check`, contrôle de la table Expo locale hors ligne.
- Limite : pas de navigateur automatisé ni de simulateur mobile disponible ; les gestes d’import/ouverture de PDF, le rendu visuel et la relance réelle de l’application restent à vérifier sur appareil. Les tests de redémarrage portent sur le stockage/repository.

## Pour commencer à réviser

Lancer `npm run web` ou `npm start`, remplir l’onboarding avec la date réelle du concours, choisir les disponibilités et les tours, puis importer ses PDF depuis Référentiel privé. Consulter librement un chapitre dans Bibliothèque ; valider ses passages depuis « Étudier ce chapitre ». Le module Sepsis permet déjà de lire les deux versions, ajouter les cartes et répondre aux QCM. Les erreurs de ces QCM sont visibles dans le carnet et les résultats sont conservés.

## Suite prioritaire

1. Vérification manuelle web/téléphone du parcours onboarding → import PDF → trois validations → fermeture/réouverture.
2. Relecture médicale/linguistique du module Sepsis, puis achèvement du chapitre 8 avant d’étendre aux autres chapitres ; obtenir l’éventuel erratum officiel 2026.
3. Remplacer progressivement les écrans de démonstration restants (notamment carnet fictif, coach, audio et anciens entraînements) par des contenus roumains validés, sans supprimer les historiques.
4. Construire des examens blancs conformes au concours. Les QCM actuels sont pédagogiques et ne simulent pas encore la notation officielle.
5. Relier davantage le temps de consolidation aux QCM/cartes : le calendrier planifie aujourd’hui les passages et rappels ; les exercices sont accessibles librement, sans créneau automatique distinct d’examen blanc.
6. Calibrer les estimations par chapitre et le rythme observé ; actuellement l’ajustement minutes/page est manuel. Aucun Supabase ajouté.

## Index disponible

| ID | Chapitre | Pages |
|---|---|---|
| kum-08 | Cap. 8 — Sepsisul și tratamentul infecțiilor bacteriene | 151–168 |
| kum-09 | Cap. 9 — Echilibrul hidro-electrolitic și acido-bazic | 172–190, 195–202 |
| kum-10 | Cap. 10 — Terapie intensivă | 224–233 |
| kum-16 | Cap. 16 — Hematologie | 327–336, 351–355 |
| kum-18 | Cap. 18 — Reumatologie | 437–454, 457–459 |
| kum-21 | Cap. 21 — Endocrinologie | 611–619, 621–622 |
| kum-23 | Cap. 23 — Diabetul zaharat | 699–736 |
| kum-26 | Cap. 26 — Neurologie | 832–848, 869–872 |
| kum-28 | Cap. 28 — Pneumologie | 949–982 |
| kum-29 | Cap. 29 — Boala venoasă tromboembolică | 1001–1017 |
| kum-30 | Cap. 30 — Cardiologie | 1045–1128 |
| kum-31 | Cap. 31 — Hipertensiunea arterială | 1133–1145 |
| kum-32 | Cap. 32 — Gastroenterologie | 1162–1166, 1172–1176, 1198–1208 |
| kum-34 | Cap. 34 — Bolile hepatice | 1275–1284, 1289–1303 |
| kum-36 | Cap. 36 — Tulburări renale și ale tractului urinar | 1351–1368, 1385–1387, 1392–1405 |
| kum-37 | Cap. 37 — Infecții transmisibile pe cale sexuală și infecția cu HIV | 1425–1450 |
| law-01 | Cap. 1 — Evaluarea și managementul perioperator al pacientului chirurgical | 1–12 |
| law-04 | Cap. 4 — Sângerările chirurgicale | 39–45 |
| law-08 | Cap. 8 — Infecțiile chirurgicale | 75–84 |
| law-09 | Cap. 9 — Traumatologie | 87–106 |
| law-10 | Cap. 10 — Arsuri | 108–123 |
| law-11 | Cap. 11 — Herniile peretelui abdominal | 125–138 |
| law-12 | Cap. 12 — Esofagul | 140–164 |
| law-13 | Cap. 13 — Stomacul și duodenul | 167–191 |
| law-14 | Cap. 14 — Intestinul subțire și apendicele | 193–214 |
| law-15 | Cap. 15 — Colon, rect și anus | 216–240 |
| law-16 | Cap. 16 — Căile biliare | 242–255 |
| law-17 | Cap. 17 — Pancreasul | 257–275 |
| law-20 | Cap. 20 — Ficatul și splina | 317–342 |
| law-26 | Cap. 26 — Bolile sistemului vascular | 520–541 |
| law-27 | Cap. 27 — Otorinolaringologia: bolile capului și gâtului | 548–583 |
| law-28 | Cap. 28 — Chirurgie ortopedică: bolile sistemului musculoscheletal | 585–633 |
| law-29 | Cap. 29 — Urologie: afecțiunile aparatului uro-genital | 635–674 |
| sin-09 | Cap. 9 — Dermatologie | 196–209 |
| sin-10 | Cap. 10 — Pediatrie | 212–243 |
| sin-12 | Cap. 12 — Afecțiuni ginecologice și mamare | 273–292 |
| sin-13 | Cap. 13 — Obstetrică | 295–316 |
| sin-14 | Cap. 14 — Tulburările psihice | 319–330 |
| sin-15 | Cap. 15 — Epidemiologie și etică | 333–338 |
