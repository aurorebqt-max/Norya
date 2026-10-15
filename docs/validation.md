# Vérifications — 11 octobre 2026

## État courant

| Contrôle | Résultat |
| --- | --- |
| `npm run typecheck` | Réussi |
| `npm test` | Réussi : 38 tests |
| `npm run export:web` | Réussi |
| Inspection de `dist` | Aucun PDF, document privé ou index d’annales dans les 40 fichiers exportés |
| `git diff --check` | Réussi |

Les tests couvrent notamment les tours de révision, les migrations et la persistance locale, les notes et surlignages, les estimations, les séances QCM et la déduplication des mini-fiches d’erreurs.

## Limites de la vérification

L’export confirme la compilation web, pas l’interaction visuelle réelle sur chaque taille d’écran. Aucun parcours navigateur automatisé ni essai sur appareil iOS/Android n’a été exécuté dans cette reprise. Les captures et contrôles du 24 septembre 2026 dans `previews/` concernent une interface antérieure et ne valident pas les changements de navigation et de lecteur effectués depuis.

Les PDF privés et l’index d’annales sont ignorés par Git et absents de l’export public. L’import incrémental a été réexécuté : cinq documents sont indexés; les décomptes de fragments extraits ne constituent pas des totaux de questions certifiés, et aucun corrigé, droit de réutilisation ou association aux parties n’est confirmé.

## Rejouer

```bash
npm run typecheck
npm test
npm run export:web
```
