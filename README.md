> **État du 11 octobre 2026 : application consacrée au concours roumain de rezidențiat, filière médecine.** Les chapitres et QCM pilotes sont encore partiels et demandent une relecture médicale. Voir le [bilan de reprise](docs/REPRISE-MULTI-TOURS.md) pour les disponibilités et limites.

# Norya

Application de révision construite avec Expo SDK 55, React Native 0.83, React 19.2, TypeScript strict et Expo Router. Une base de code pour iOS, Android et web.

## Démarrer

Prérequis : Node.js 22 LTS ou version compatible plus récente, npm.

```bash
npm ci
npm start
```

- `npm run web` : version web.
- `npm run android` : ouvrir sur Android avec un émulateur configuré.
- `npm run ios` : ouvrir le simulateur iOS sur macOS avec Xcode.
- Sur téléphone : utiliser une version d’Expo Go compatible avec le SDK 55, puis scanner le QR code. Si l’Expo Go installé ne prend plus en charge ce SDK, un développement natif avec un development build compatible sera nécessaire.

L’onboarding ne demande que la date du concours, le nombre de tours souhaités, les disponibilités et les jours de repos. Aucune vitesse de lecture ni année de concours distincte n’est demandée.

## Écrans livrés

| Espace | Interactions |
| --- | --- |
| Accueil | Travail du jour, progression du tour et erreurs dues |
| Bibliothèque | Recherche du programme Tematica et accès aux chapitres |
| Chapitre | Trois modes : cours complet, fiches et flashcards; validation explicite des parties |
| Entraînement | QCM Norya sans chronomètre, corrections et historique des erreurs |
| Progression | Tours, validations, estimations et historique |
| Espace personnel | Profil, erreurs, glossaire et écoute vocale des cours |
| Calendrier | Planification des tours, rappels et échéances d’erreurs |

Notes, surlignages et séances de QCM sont conservés localement. La lecture vocale est disponible depuis les cours; aucun podcast préenregistré fictif n’est proposé. Le Coach reste une démonstration locale, pas un assistant conversationnel médical.

## Architecture

```text
app/                 Routes Expo Router ; cinq espaces principaux et écrans secondaires
src/screens/         Écrans métier
src/components/      Primitives, tableaux et compositions réutilisables
src/data/            Programme, contenus pédagogiques et sources déclarées
src/domain/          Progression, estimation, QCM, erreurs et répétition espacée
src/state/           Préparation et apprentissage persistés localement
scripts/              Indexation privée incrémentale des annales
```

Navigation inférieure sur téléphone/tablette, barre latérale sur grand écran. Mise en page adaptative, zones sûres et apparition animée des écrans. Palette ivoire, vert profond, sauge, abricot et lavande.

## Contenus et limites connues

- Le programme contient 39 chapitres indexés. Quatre chapitres pilotes regroupent 24 parties, 40 flashcards et 30 QCM originaux Norya; les textes restent partiels et aucun n’est déclaré entièrement vérifié médicalement.
- Cinq tableaux pédagogiques structurés sont disponibles. Les estimations de lecture sont calculées à partir des mots roumains, tableaux et illustrations renseignées, sans réglage demandé à l’étudiant. Elles restent approximatives et distinctes de la charge du calendrier.
- Les QCM originaux ne sont pas des annales officielles. Aucun corrigé officiel ni droit de réutilisation n’a été confirmé pour les fichiers privés; aucun examen blanc complet ni classement historique vérifié n’est fourni.
- L’importeur local `python scripts/import-annales.py` met à jour son index sans dupliquer les documents inchangés. Les PDF et métadonnées privées restent dans `references-privees/`, ignoré par Git; ils ne sont pas inclus dans l’export web.
- Les données de préparation, notes, surlignages, séances QCM et mini-fiches d’erreurs sont locales à l’appareil. Aucun compte ni Supabase n’est configuré.

## Vérifications

```bash
npm run typecheck
npm test
npm run export:web
```

Le SDK et ses versions proviennent du [modèle officiel Expo SDK 55](https://expo.dev/changelog/sdk-55), et sont verrouillés par package-lock.json. Ne pas mettre à niveau React Native indépendamment d’Expo.

TypeScript, les tests et l’export web sont les contrôles automatisés courants. Voir [docs/validation.md](docs/validation.md) pour les limites des vérifications sur appareils.

## Prochaines missions

Priorités : relire médicalement et compléter les chapitres pilotes, vérifier les sources et errata applicables, puis obtenir des annales avec corrigés officiels et droits de réutilisation établis. Les associations aux parties de cours doivent être contrôlées avant de servir à l’entraînement.
