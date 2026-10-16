# Norya — consignes permanentes

Lire `docs/WORKFLOW_CHAPITRES.md` avant de traiter un cours et
`docs/ETAT_CHAPITRE_08.md` avant de reprendre Kumar 8. Ces documents distinguent
les exigences de méthode des fonctionnalités réellement disponibles.
Compléter les consignes existantes ; ne pas remplacer leur historique silencieusement.

## Protection du travail

- Examiner `git status`, les différences locales et toute opération Git en cours.
  Ne pas poursuivre ou abandonner un rebase au titre d'une correction de cours.
- Ne pas employer `git reset`, `git clean`, `git restore`, `git pull --rebase`
  ni une opération destructive pour retrouver une transcription.
- Sauvegarder les fichiers concernés avant une modification risquée et exécuter
  les tests adaptés avant et après. Ne pas inclure de secrets dans les sauvegardes.
  Une sauvegarde dans `/tmp` est temporaire, pas une archive durable.
- Ne jamais écraser les PDF originaux, le JSON brut, les extractions de référence
  ou le paquet privé relu. Produire une nouvelle version et conserver les précédentes.
- `references-privees/` et les ressources médicales privées ne doivent jamais être
  publiées sur GitHub, intégrées à un bundle public ou copiées dans `public`/`assets`.
  Les documents de méthode ne doivent pas reproduire les passages médicaux privés.
- Ne pas réinitialiser IndexedDB, AsyncStorage ou le cache Safari. Ne pas réimporter
  automatiquement un paquet. Préserver anomalies, commentaires, annotations,
  corrections, fusions, validations, historique et identifiants stables.
- Un identifiant de bloc seul n'est pas unique : utiliser manuel/chapitre, page et
  bloc, avec la version/empreinte de source pour la provenance.

## Fidélité et présentation

- Le texte roumain doit rester strictement fidèle au PDF original, sans
  reformulation, résumé, complément médical inventé ni traduction implicite.
- Conserver le brut exact. Réparer les mots artificiellement coupés et les retours
  de ligne PDF dans une présentation/transcription distincte, après comparaison.
  Ne pas supprimer un véritable trait d'union médical par une règle générale.
- Reconstituer les paragraphes sémantiques complets avant tout découpage technique.
  Respecter colonnes, listes, titres, ordre de lecture, folios et tableaux.
- Titres, paragraphes, listes et sommaires : texte numérique sélectionnable.
  Associer chaque entrée du sommaire à son numéro de page, dans sa colonne.
  Reconstituer un tableau simple uniquement si ses cellules sont fidèles et contrôlables.
- Garder les véritables schémas, figures complexes et tableaux complexes explicitement
  désignés en images originales complètes et zoomables. Préserver les légendes,
  renvois et liens avec le texte. Les paragraphes voisins restent numériques.
- Ne jamais utiliser une page entière en image pour masquer une mauvaise extraction.
  Le PDF intégral reste une référence accessible séparément.
- « Cours reconstitué » et « Vérification manuelle » doivent partager les mêmes
  décisions de présentation, sans perdre comparaison PDF, navigation et validation.

## Revue humaine et fusion

- Comparer le cours numérique au PDF. Conserver toutes les anomalies : ouverte
  (`open`), à revérifier (`corrected-pending-review`), résolue (`resolved`). Ne jamais coder en dur
  leurs nombres ni supprimer les résolues ou leurs commentaires.
- Seul un contrôle humain autorise la validation. Une importation, correction,
  fusion, compilation ou réussite de test ne valide pas un passage automatiquement.
- Les blocs vérifiés doivent quitter « À traiter » et rester dans « Vérifiés » et
  « Tous ». Ne pas annoncer ce contrat réalisé avant un test de l'interface.
- Une fusion doit être persistante, réversible, sans duplication, conserver les
  sources et l'historique, et respecter filtres/navigation. Tester fusion puis
  annulation après rechargement. Un bouton ou du code ancien ne prouve rien.
- Signaler précisément les absences ou défauts. Ne pas restaurer aveuglément une
  ancienne interface ni engager une refonte hors de la demande.

## Suite d'un chapitre

Après validation du cours seulement, respecter cet ordre : errata 2021 fidèles et
clairement signalés ; traduction française fidèle ; audio pour écoute nocturne ;
fiches détaillées et express ; association des QCM existants ; vérification finale.
Conserver l'original et la provenance de chaque ajout. Pour un autre manuel,
vérifier l'applicabilité de l'erratum au lieu de transposer celui de Kumar.

Ne jamais commencer automatiquement le chapitre suivant : attendre la confirmation
explicite de l'utilisateur. Ne pas annoncer un chapitre terminé sans preuves.
Mettre à jour son état avec les tests exécutés, leurs limites et les travaux restants.
