# Reprise Norya — 11 octobre 2026

## État retrouvé

Les modifications non commitées du dépôt ont été conservées. Norya est consacrée au rezidențiat roumain, filière médecine. Le programme indexe 39 chapitres; les données de préparation et d’apprentissage sont conservées localement. Les anciens contenus et fonctionnalités non affichés restent dans le dépôt, mais ne sont pas présentés comme contenus médicaux roumains validés.

## Fonctionnalités ajoutées

- Onboarding raccourci : date de concours, 1 à 10 tours, disponibilités et jours de repos; aucune vitesse de lecture ni durée par page n’est demandée.
- Date de concours saisie par l’étudiant ; aucune date exacte préchargée pour les nouveaux profils. Les dates historiques sont conservées. Le seul programme disponible reste celui de 2026, même si une autre année est choisie.
- Les estimations de lecture d’un cours utilisent le nombre de mots roumains, les tableaux et illustrations renseignées, avec une vitesse moyenne intégrée à l’application. La lecture attentive est estimée séparément; ni l’une ni l’autre n’est une promesse d’apprentissage. La charge du calendrier reste distincte.
- Tours séquentiels dans le calendrier, échéances prévues et progression indépendante. Les chapitres fragiles sont prioritaires dans les tours suivants.
- Validation explicite des parties depuis le lecteur; consulter ou changer de mode n’ajoute pas plusieurs fois la progression. Les QCM et flashcards restent distincts de la validation de lecture.
- Recalcul selon la date courante, les séances, disponibilités, absences, rythme et nombre de tours. Les tours retirés de l’objectif restent dans l’historique.
- Rappels en parallèle : budget plafonné à 20 % tant qu’un tour reste à faire, puis 50 % pendant le dernier mois. Le temps non utilisé par les rappels reste disponible pour les passages. Les prévisions supposent des rappels réussis ; les événements réels les remplacent.
- Objectif impossible signalé avec estimation du besoin horaire. Après le concours, les tâches tardives ne représentent qu’une projection ; horizon borné à un an après le concours ou le jour de reprise. Une prévision hors horizon reste indéterminée.
- PDF privés web dans IndexedDB ; copies natives dans le stockage de l’application. Réimporter ou retirer une association conserve les anciennes copies. Aucun PDF privé distribué.
- Écritures pédagogiques sérialisées pour conserver cartes/résultats lors d’actions rapprochées ; un stockage illisible ne revient plus silencieusement à un état vide.

## Contenus effectivement disponibles

Quatre chapitres pilotes contiennent 24 parties, 40 flashcards et 30 QCM originaux Norya. Le contenu reste partiel et demande une relecture médicale; aucun de ces chapitres n’est déclaré entièrement vérifié. Cinq tableaux structurés sont disponibles. Les estimations de lecture varient avec le contenu réel.

Sources lues : `references-privees/rezidentiat-M-2026.pdf` (p.1–4), `SEPSIS.pdf` (chapitre p.151–168, repères indiqués par section), `20211121-erata-23aug2021.pdf` (corrections du chapitre, PDF p.1). Le seul erratum trouvé est daté de **2021** ; aucun erratum identifié comme 2026 n’a été trouvé. Ne pas lui attribuer artificiellement une date de 2026.

Vérification clinique complémentaire : [SCCM, recommandations adultes 2026](https://www.sccm.org/survivingsepsiscampaign/guidelines-and-resources/surviving-sepsis-campaign-adult-guidelines), notamment la limite du qSOFA comme outil unique. Cette source ne remplace pas la bibliographie du concours.

Les autres chapitres disposent d’un index et du suivi multi-tours; la rédaction des contenus pédagogiques reste à faire. Les PDF sources demeurent privés et ne sont pas inclus au build public.

## Validation

- TypeScript : `npm run typecheck` — réussi.
- Tests métier : `npm test` — **38 tests réussis**, dont multi-tours, migrations, persistance, notes et surlignages, estimations, QCM et déduplication des mini-fiches.
- Export web : `npm run export:web` — réussi; inspection de `dist` sans PDF, document privé ni index d’annales.
- Dépendances : `npm run check`, contrôle de la table Expo locale hors ligne.
- Limite : pas de navigateur automatisé ni de simulateur mobile disponible ; les gestes d’import/ouverture de PDF, le rendu visuel et la relance réelle de l’application restent à vérifier sur appareil. Les tests de redémarrage portent sur le stockage/repository.

## Pour commencer à réviser

Lancer `npm run web` ou `npm start`, renseigner la date du concours, les tours et les disponibilités, puis ouvrir un chapitre depuis Bibliothèque. Choisir Cours complet, Fiches ou Flashcards. La progression de lecture n’avance qu’après validation explicite d’une partie; les QCM et cartes peuvent être consultés séparément. « Mes erreurs » conserve les questions ratées et leur échéance, mais les explications médicales restent signalées comme non vérifiées.

## Suite prioritaire

1. Relecture médicale et linguistique des quatre chapitres pilotes, puis achèvement d’un parcours avant d’étendre le contenu.
2. Reprendre par OCR les documents d’annales non importables, vérifier les corrigés, les droits et les années/sessions.
3. Ajouter une interface privée de contrôle des associations annales–notions–parties; aucune association n’est confirmée à ce stade.
4. Intégrer les questions officielles utilisables, puis construire un examen blanc uniquement lorsque la banque et les règles sont vérifiées.
5. Tester manuellement le parcours web, tablette et mobile ainsi que la persistance après fermeture réelle.

## Annales privées — index local

L’import incrémental a détecté cinq documents privés : `Subiect 2023.pdf` (104 fragments de questions), `Subiecte Rezi Noiembrie 2022 Rezolvate.pdf` (150 fragments), et trois documents dont l’extraction texte n’a dégagé aucune question (OCR requis). Ces nombres sont des fragments détectés, pas des totaux certifiés. Les candidats de nom/texte sont 2023 (session indéterminée), mai 2023, novembre 2021 et novembre 2022 (texte : 20 novembre); le scan `CONCURSUL NATIONAL DE REZIDENTIAT, SESIUNEA 17 NOI_241120_085101.pdf` n’a pas de date/session automatiquement attribuée. Ces candidats ne sont pas des métadonnées officielles vérifiées. Aucun corrigé, droit de réutilisation ou rattachement pédagogique n’est confirmé; aucune annale n’est présentée dans l’application comme vérifiée. L’index privé conserve les empreintes et évite de retraiter les documents inchangés.

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
