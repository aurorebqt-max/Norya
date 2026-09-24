# Norya

Maquette interactive d’une application de préparation médicale, développée avec Expo SDK 55, React Native 0.83, React 19.2, TypeScript strict et Expo Router. Une seule base de code iOS, Android et web, sans Vite ni enveloppe WebView.

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

L’accueil s’ouvre directement sur Aurore pour faciliter la découverte. « Personnaliser mon parcours » lance les huit étapes d’onboarding ; le profil permet de les rouvrir.

## Écrans livrés

| Espace           | Interactions                                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Onboarding       | Bienvenue, prénom, concours, année, spécialités multiples facultatives, jours/heures, objectif, récapitulatif               |
| Accueil          | Programme partagé, séance immédiate, progression, échéance, accès au coach et aux modules secondaires                       |
| Calendrier       | Mois précédent/suivant, sélection du jour, vue hebdomadaire, détail du 24 septembre, deux tours, J−30, exemple d’adaptation |
| Bibliothèque     | Recherche, filtres, six matières, fiches, approfondissements, liens et annotations                                          |
| Entraînement     | Questions, dossier, LCA, examen blanc, entraînement personnalisé ; flashcards et decks locaux de méthode                   |
| Podcasts         | Catalogue, playlists filtrées, lecteur avec synthèse vocale locale du texte éditorial, avance/recul, préférences, erreurs  |
| Carnet d’erreurs | Filtres, mini-fiches, consolidation et mise à jour des notions revues                                                       |
| Progression      | Premier tour, indicateurs fictifs, rangs A/B, matières, spécialités, activité et historique                                 |
| Coach            | Saisie libre, suggestions, réponses préécrites, présentation du mode vocal                                                  |
| Profil           | Prénom, préférences, parcours, notifications simulées, confidentialité, présentation de Plus                                |

Écrans complémentaires : fiche d’item, séance interactive et page introuvable. Aucun des dix espaces de la mission ne reste absent.

## Architecture

```text
app/                 Routes Expo Router ; cinq onglets principaux et écrans secondaires
src/screens/         Écrans métier
src/components/      Primitives et compositions réutilisables
src/design/          Palette, ombres et identité visuelle
src/data/            Source des données fictives
src/state/           État de démonstration partagé, en mémoire
src/types/           Contrats TypeScript
src/services/        Frontières documentées des futures intégrations
```

Navigation inférieure sur téléphone/tablette, barre latérale sur grand écran. Mise en page adaptative, zones sûres et apparition animée des écrans. Palette ivoire, vert profond, sauge, abricot et lavande.

## Périmètre de la démonstration

- Profil unique Aurore, EDN & ECOS 2027, ophtalmologie et dermatologie.
- Journée de référence : 24 septembre 2026 ; 3 séances, 65 minutes. La complétion est partagée entre accueil, calendrier et progression.
- Premier tour : 124/367 items, 34 % arrondis. Il reste fixe car les exercices de méthode ne valident aucun item médical.
- Date EDN **fictive et non officielle** : 18 octobre 2027. Objectif premier tour : 18 septembre 2027, exactement J−30. Deuxième tour : 19 septembre–17 octobre.
- Les préférences d’onboarding sont modifiables ; le planning illustratif reste fixé à 2027. Les autres jours n’ont pas de programme détaillé.
- Les fiches sont des structures éditoriales, sans recommandations cliniques inventées. Les exercices portent uniquement sur les méthodes d’apprentissage. Les différents formats d’examen partagent ce parcours illustratif ; leurs moteurs spécifiques restent à développer.
- Les liens entre fiches illustrent la navigation, pas des relations médicales validées.
- Les flashcards actuellement livrées portent uniquement sur les méthodes de travail et leur suivi est local à la session.
- Le lecteur audio lit localement le titre et le descriptif éditorial via la synthèse vocale de l’appareil ; aucun fichier médical n’est généré ni lu. Le coach utilise des réponses locales préécrites.
- Notes, profil, préférences et résultats sont perdus au rechargement. Aucun compte, Supabase, paiement, IA, secret ou service distant.
- La filière roumaine est présentée comme future ; aucun programme de résidanat n’est implémenté.

## Vérifications

```bash
npm run typecheck
npm run check
npm run export:web
npx expo export --platform ios --platform android --output-dir /tmp/norya-native-export
```

Le SDK et ses versions proviennent du [modèle officiel Expo SDK 55](https://expo.dev/changelog/sdk-55), et sont verrouillés par package-lock.json. Ne pas mettre à niveau React Native indépendamment d’Expo.

Voir [docs/validation.md](docs/validation.md) pour les résultats et les limites des vérifications.

## Prochaines missions

Validation sur appareils iOS/Android réels, accessibilité approfondie et réglages de production (icônes natives, splash, builds de distribution). Puis, sur instruction : contenus médicaux sourcés et validés, véritables formats d’examen, persistance/authentification, moteur de planification garantissant J−30, IA, génération/lecture audio réelle, abonnement et filière roumaine.
