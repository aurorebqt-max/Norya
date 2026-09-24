# Vérification de la mission 1

Contrôles effectués le 24 septembre 2026.

| Contrôle                                       | Résultat                                                               |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| TypeScript strict — npm run typecheck          | Réussi, aucune erreur                                                  |
| Versions — npm run check                       | Expo : Dependencies are up to date                                     |
| Export web Metro                               | Réussi                                                                 |
| Bundles iOS et Android, compilation Hermes     | Réussis, sans import manquant                                          |
| Parcours dans Chromium                         | Réussis, aucune erreur JavaScript relevée                              |
| Rendu web 390 × 844, 820 × 1180 et 1440 × 1100 | Captures vérifiées ; pas de débordement horizontal de la page tablette |
| Exécution sur appareils iOS/Android            | Non effectuée ; aucun appareil ni simulateur natif disponible          |

## Parcours vérifiés

1. Depuis l’accueil, répondre aux trois questions, terminer et retrouver 1/3 séances terminées.
2. Parcourir les huit étapes d’onboarding et revenir à l’accueil.
3. Naviguer dans les cinq onglets principaux.
4. Envoyer un message au coach et obtenir une réponse préécrite.
5. Ouvrir directement podcasts, carnet, progression, profil et une fiche par son identifiant.
6. Enregistrer une annotation et la retrouver après changement de section.
7. Consolider une erreur avec trois questions et constater le passage de trois à deux notions à revoir.
8. Ouvrir directement le podcast d’erreurs, lancer/pause et marquer la séance terminée.
9. Ouvrir l’accueil à la largeur tablette et contrôler le débordement de page.

Le web utilise un export Expo monopage pour que le rendu adaptatif et les paramètres de navigation soient résolus dans le navigateur. L’hébergement doit renvoyer index.html pour les chemins applicatifs inconnus. Le code des écrans reste du React Native partagé avec iOS et Android.

## Rejouer les tests navigateur

Playwright a été utilisé temporairement pour ne pas ajouter une dépendance à l’application. Le scénario est conservé dans scripts/smoke.cjs ; il lance son propre serveur local sur 127.0.0.1:8082.

Après installation de Playwright et de Chromium dans un environnement de test :

```bash
npm run export:web
# Si Playwright est disponible dans node_modules :
node scripts/smoke.cjs
# Sinon indiquer son module installé séparément :
NORYA_PLAYWRIGHT_MODULE=/chemin/vers/playwright node scripts/smoke.cjs
```

Les captures sont écrites dans /tmp/norya-desktop.png, /tmp/norya-mobile.png et /tmp/norya-tablet.png. Des copies de référence se trouvent dans [previews](previews/).

## Dépendances

L’audit npm a signalé 12 alertes modérées dans les chaînes de dépendances Expo/Router (notamment uuid et decode-uri-component). Aucune alerte élevée ou critique signalée. Les corrections automatiques proposées impliquent de rétrograder vers des versions incompatibles avec le SDK sélectionné ; aucun npm audit fix --force n’a été appliqué. Réévaluer les versions et l’audit avant une livraison de production.

## Limites explicites

Les contrôles navigateur ne prouvent pas le comportement du clavier, de VoiceOver/TalkBack ou des zones sûres sur chaque appareil. Une recette native et une revue d’accessibilité approfondie restent nécessaires avant distribution. Les formats LCA/dossier/examen sont des aperçus de parcours, sans moteurs spécialisés. Le son, le microphone, l’IA, les notifications système, le paiement et la persistance ne sont pas intégrés.

Le serveur de développement démarre dans cet environnement. L’outil graphique React Native DevTools ne se lance pas ici, car libgtk-3.so.0 manque ; cela ne bloque ni Metro ni l’application web.
