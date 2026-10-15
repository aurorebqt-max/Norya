# Cours source privé — pilote Kumar 8

Cette chaîne ne lit aucun Markdown pédagogique, aucune fiche, aucun fichier de cours de `src/data`. Ses seules entrées documentaires sont le PDF original et la Tematica fournie. La chaîne ne modifie aucune donnée de progression. Un lecteur privé de prévisualisation est disponible uniquement dans l’écran Kumar 8. Aucun texte médical ou visuel n'est incorporé au code distribué.

## Utilisation

Dépendance : `scripts/source-course/requirements.txt` (version exacte de PyMuPDF).

```sh
python3 scripts/source-course/pipeline.py extract --output references-privees/cours/kum-08/v1
python3 scripts/source-course/pipeline.py verify --output references-privees/cours/kum-08/v1
python3 -m unittest discover -s scripts/source-course -p 'test_*.py'
```

L'extraction refuse d'écraser un répertoire existant. Employer `v2`, etc. pour une nouvelle extraction. `verify` retourne 1 tant que la fidélité intégrale n'est pas attestée : ce résultat est attendu pour un brouillon. Le contrôle écrit `verification.json` dans l'espace privé.

Ouvrir localement `references-privees/cours/kum-08/v1/review.html`. Ce lecteur de contrôle adaptatif juxtapose les pages originales et leur couche texte brute. Il ne charge aucune ressource distante, n'emploie aucun service d'IA, n'envoie aucun document et ne fait pas partie de l'application Expo. Sur petit écran, les deux vues sont empilées ; ouvrir l'image permet de zoomer. Les liens vers les JSON exposent la provenance et les grilles de contrôle locales.

## Contrat de provenance

Le manifeste conserve l'empreinte SHA-256 des PDF, la preuve textuelle du périmètre Tematica, la version de l'extracteur et la correspondance page imprimée/page PDF. Pour le pilote uniquement, les pages attendues sont 151–168, la correspondance candidate est +23 et le PDF attendu comporte 1568 pages. Ces contraintes bloquent une substitution silencieuse d'édition ; elles ne constituent pas une authentification officielle du document fourni. L'ouverture à d'autres chapitres nécessitera un nouveau profil de sélection et ses preuves.

Par page :

- `raw.txt` : sortie exacte de l'extracteur, sans réécriture, fusion de colonnes, normalisation ou correction OCR.
- `blocks.json` : blocs, lignes, spans, polices et coordonnées PDF, dans l'ordre d'origine de la couche texte. Un bloc technique ne garantit pas les limites d'un paragraphe sémantique.
- `original.png` : page intégrale rendue à 144 dpi. Préserve tous les schémas composites, éléments vectoriels, tableaux et légendes ; le PDF original reste la référence à plus haute résolution.
- `visual-inventory.json` : candidats raster et nombre de tracés vectoriels. Ce n'est pas encore un inventaire sémantique exhaustif des illustrations.
- `review.json` : observations strictement séparées du texte, empreintes des éléments relus, contrôles par catégorie et par bloc, zones visuelles avec coordonnées et références.

Aucun artefact privé ne doit être déplacé vers `src`, `assets`, `public`, `dist` ou un stockage public. `references-privees/` est ignoré par Git. Un export de cours vers l'application devra utiliser un import local privé dédié, jamais un import TypeScript ou un asset embarqué.

## Vérification réelle

Le contrôle automatique réouvre le PDF, réextrait chaque page et compare les octets du texte, les blocs positionnés et les pixels du rendu. Il détecte aussi les pages absentes, doublonnées, hors périmètre et les attestations périmées. Cela prouve la reproductibilité de l'extraction ; une erreur de la couche texte du PDF reste possible.

La revue visuelle doit donc être effectuée page par page contre le PDF. Pour chaque bloc, vérifier titres, paragraphes, listes, chiffres et unités ; pour chaque tableau, vérifier chaque cellule, son en-tête, ses notes et son ordre de lecture. Inventorier les encadrés et illustrations dans `visualRegions` avec `kind` (`table`, `box`, `figure` ou `other`), `bbox` en points PDF, `reference` et `status`. Même une page sans figure exige une zone `other` explicitant la vérification de son contenu visuel. Ne jamais effacer un doute pour satisfaire le validateur : conserver les passages concernés et leur localisation dans `issues`. Ne pas appliquer d'erratum au texte extrait.

Après examen effectif seulement : renseigner `reviewer`, `reviewedAt` (date/heure ISO), les catégories et les blocs en `verified`, et les zones visuelles vérifiées. Une attestation est une preuve de revue déclarée, pas une preuve automatique de jugement humain. `complete` ne devient vrai que lorsque toutes les pages ont satisfait les contrôles techniques, la revue de toutes les catégories et tous les blocs, l'inventaire visuel et l'absence d'incertitudes ouvertes. Une signature numérique n'est pas implémentée.

## Première étape (historique)

Le pilote produit une extraction privée et un outil de contrôle. Il ne remplace pas encore le cours bêta existant et ne lui attribue aucune validation. Le rendu refluable des paragraphes, des tableaux et l'import privé dans Norya restent à réaliser après identification des erreurs de couche texte et validation des structures. Il faudra préserver le texte brut comme preuve, consigner toute transcription visuellement vérifiée dans un artefact distinct, et invalider les revues si cet artefact change. Aucune fiche express, traduction ou QCM n'est produit.


## Contrôle automatique et intégration privée

```sh
python3 scripts/source-course/control.py --output references-privees/cours/kum-08/v1
```

Cette commande commence par relancer la vérification technique et bloque l’export en cas d’écart. Elle compare ensuite les tokens de PyMuPDF avec ceux de pypdf 6.19.0, sans normaliser ou corriger les fichiers sources. Les différences de multiplicité signalent des omissions/répétitions possibles. Les heuristiques examinent les blocs répétés, les caractères de remplacement/contrôle, les débordements géométriques, les retours verticaux dans une même colonne, les directions de texte, les lignes multiples, les chiffres et les références aux tableaux/figures. Elles ne prouvent pas l’absence d’inversion entre colonnes ni la fidélité des titres et des paragraphes. Les différences présentes uniquement dans pypdf restent consultables dans `tokenDifferences` du rapport JSON, même sans attribution fiable à un bloc.

Les deux moteurs lisent la même couche texte : aucun OCR indépendant n’est effectué. Une absence d’alerte n’équivaut jamais à une validation humaine. Les alertes sont des candidats à examiner, pas des erreurs médicales confirmées. Aucune ancienne fiche ou version Markdown n’est lue.

Sorties privées supplémentaires :

- `control-report.html` : 18 groupes de pages, blocs triés par priorité, visuel en regard et liens directs vers le livre original et la page PDF isolée.
- `control-report.json` : raisons, coordonnées, statut automatique, statut humain et différences de tokens.
- `independent-pypdf.txt` par page : résultat indépendant, sans modification de `raw.txt`.
- `original-page.pdf` par page : copie de la page source, sans reconstruction du texte.
- `norya-private-course.json` : paquet local contenant uniquement les fac-similés et les pages PDF, sans texte reconstitué à afficher comme cours définitif.

Dans Norya, ouvrir Kumar 8, puis « Importer le paquet privé du cours » et choisir `norya-private-course.json`. Le paquet reste dans IndexedDB sur le Web ou dans le répertoire privé de l’application sur mobile. Aucun téléchargement distant ni publication n’est nécessaire. L’import accepte uniquement les 18 pages attendues, leurs médias intégrés et le mode de prévisualisation ; il refuse les URLs distantes et un statut de cours complet. Ce contrôle de format ne constitue pas une signature/authentification cryptographique du paquet : importer uniquement le fichier issu de la chaîne locale. Les PDF isolés s’ouvrent dans un onglet sur le Web ou via le lecteur système sur mobile.

Le lecteur conserve la mise en page roumaine originale, les tableaux, schémas et encadrés, avec zoom et références imprimées/PDF. Il reste séparé du cours bêta existant, sans migration, navigation nouvelle ou écriture dans calendrier/progression. Le texte refluable définitif et le remplacement du cours bêta restent bloqués par la revue documentaire. Le fac-similé est un repli fidèle aux pixels de la source, pas une transcription accessible/recherchable validée.

### Résultat du contrôle du pilote

18/18 pages conformes techniquement, aucune page manquante. 627 blocs : 35 en priorité haute, 218 en priorité intermédiaire, 374 sans alerte heuristique. Aucun bloc n’est automatiquement promu au statut humain « verified ». Les différences entre extracteurs concernent les pages 152, 153, 154, 156, 157, 162, 163 et 164. Trois blocs comportent des caractères suspects ; six sont candidats à une répétition ; dix-sept ont plusieurs axes de texte ; ces catégories peuvent se recouper.

| Page imprimée | Haute | Intermédiaire | Revue globale de page |
|---|---:|---:|---:|
|151|2|9|10|
|152|4|7|26|
|153|1|4|43|
|154|1|7|15|
|155|6|24|10|
|156|3|16|28|
|157|2|11|15|
|158|1|9|10|
|159|0|7|13|
|160|1|5|19|
|161|0|14|33|
|162|9|55|55|
|163|2|7|21|
|164|3|10|20|
|165|0|11|18|
|166|0|13|18|
|167|0|6|15|
|168|0|3|5|

À valider : les 35 alertes prioritaires, les chiffres/unités et tableaux, l’inventaire visuel exhaustif, puis l’ordre et la couverture de chaque page. Les 374 blocs sans alerte peuvent être relus dans leur page plutôt que comme 374 tâches isolées ; ils ne sont pas dispensés du contrôle visuel. La page 162 reste particulièrement prioritaire : tableau de doses et absence de folio visible. L’identification par les pages voisines doit être attestée. Aucun statut complet n’est attribué.

### Réutilisation

L’analyse géométrique, les rapports, les artefacts et les états de contrôle sont indépendants du livre. La sélection Tematica et le contrat d’import sont volontairement limités à Kumar 8. Pour un autre chapitre, définir son profil documentaire (édition, preuves Tematica, pages, limites intrapage et correspondances) et ses tests avant d’ouvrir l’import. Ne jamais réutiliser implicitement le décalage +23. La revue et les décisions d’inclusion sont liées à l’empreinte des sources ; les nouvelles sources exigent une nouvelle version.
