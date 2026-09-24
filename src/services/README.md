# Frontières des futurs services

Aucun service distant n'est implémenté ou appelé dans cette mission.

- Authentification et stockage : futur adaptateur Supabase, séparé des écrans.
- Planification : service prenant profil, date de concours, disponibilités et programme restant. Invariant métier à implémenter : premier tour terminé au plus tard EDN moins 30 jours.
- Contenus : catalogue sourcé et validé, distinct des supports éditoriaux fictifs.
- Coach : adaptateur de conversation et de recommandations ; aucun modèle appelé.
- Audio : génération, bibliothèque et lecture via un service dédié.
- Abonnement : intégration native ultérieure, après définition de l'offre.

Les écrans consomment actuellement data/demo.ts et state/DemoProvider.tsx. Remplacer ces fournisseurs par des hooks de service sans déplacer la navigation ni les composants visuels. Les types partagés vivent dans types/.
