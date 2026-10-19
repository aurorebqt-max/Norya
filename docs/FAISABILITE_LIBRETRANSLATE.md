# Faisabilité LibreTranslate RO → FR — 17 octobre 2026

Diagnostic uniquement : aucun paquet, modèle ou image Docker téléchargé, aucun
serveur lancé, aucun appel GTX, aucune donnée médicale transmise. Code applicatif,
interface et stockage existants inchangés.

## Modèles vérifiés

L'index officiel Argos consulté propose RO→EN 1.9 et EN→FR 1.9 ; aucun
modèle direct RO→FR n'y est répertorié. LibreTranslate effectue le pivot.

| Modèle | Archive, taille publiée arrondie |
| --- | ---: |
| translate-ro_en-1_9.argosmodel | 67 MB |
| translate-en_fr-1_9.argosmodel | 62 MB |
| Total minimal pour RO→FR | 129 MB |

Ce sont des tailles publiées, pas des tailles décompressées mesurées.
Attention : `--load-only ro,en,fr` sélectionne des langues, pas deux directions.
Le démarrage automatique peut aussi installer EN→RO (68 MB) et FR→EN (64 MB),
soit environ 261 MB pour quatre archives. Une installation strictement limitée
aux deux modèles utiles doit les préinstaller explicitement dans un répertoire
isolé et empêcher les mises à jour automatiques. Ne jamais lancer l'installation
par défaut de toutes les langues. Figer les versions du moteur et des modèles,
vérifier les empreintes téléchargées après autorisation.

## Ressources observées

| Ressource | Mesure locale |
| --- | --- |
| Disque /workspaces et espace writable principal | 32 Gio, 98 % utilisé, environ 834–836 Mio disponibles |
| /tmp, autre montage | environ 39–40 Gio disponibles ; non durable |
| CPU accessibles | 2 |
| RAM système visible | 7,8 Gio, environ 4,1 Gio disponibles au moment de la mesure |
| Swap | aucun |
| Python par défaut | 3.14.2 |
| Python alternatif présent | /usr/bin/python3.12, version 3.12.3 |

Les mesures RAM ne sont pas une réservation de ressources. Le cgroup consulté
n'affiche pas de plafond mémoire numérique ; ne pas en déduire une capacité
illimitée. Le Python 3.12 existant est préférable au Python 3.14 non déclaré dans
les classificateurs consultés du projet. La résolution complète des dépendances
n'a pas été exécutée ; sa compatibilité reste à confirmer avant installation.

## Budget prévisionnel, pas un benchmark

Pour un seul utilisateur, un processus CPU, une requête à la fois :

- Modèles décompressés et fichiers auxiliaires : provisionner 0,3–1 Gio.
- Environnement Python et bibliothèques CPU : provisionner 1–3 Gio selon la
  version épinglée et ses dépendances ; exclure toute installation CUDA.
- Téléchargements temporaires, caches et marge : prévoir 1–2 Gio supplémentaires.
- Seuil prudent avant installation : disposer de 6 Gio libres durables, en
  prévoyant de conserver au moins 2 Gio libres après installation.
- RAM du service : budget initial 2 Gio, marge jusqu'à 4 Gio pour mesurer les
  pics ; machine de 8 Gio conseillée si Norya et les outils restent actifs.
- 2 CPU constituent une base plausible pour l'essai séquentiel, sans GPU.

Ces enveloppes sont des estimations prudentes, non des minima officiels. La taille
exacte du runtime et la vitesse n'ont pas été mesurées. Le pivot exige deux
inférences : pas de promesse de secondes par paragraphe ou de durée du chapitre.
Éviter compilation/export Norya pendant le benchmark. Docker peut augmenter le
besoin disque à cause des couches ; le venv Python 3.12 isolé est le premier choix.

Verdict : essai CPU plausible, mais installation durable déconseillée avec
seulement 834 Mio libres. /tmp permettrait un essai jetable après accord explicite,
pas un service durable ni une archive. Aucune suppression de cache, sauvegarde ou
donnée n'a été faite. Préférer un volume avec 6 Gio libres ou une machine dédiée.

LibreTranslate est gratuit comme logiciel. Codespaces n'est pas un hébergement
gratuit illimité : quotas de calcul/stockage, arrêt en inactivité et indisponibilité
quand le codespace est arrêté. Solde du compte non consulté. Il convient pour un
pilote manuel ; pour un usage quotidien iPad, préférer une machine personnelle
allumée ou un hébergement approuvé, dont le coût éventuel doit être accepté.

## Architecture proposée, sans activation

Safari (origine Norya actuelle) → POST /api/translate authentifié sur cette même
origine → LibreTranslate sur boucle locale/réseau privé → réponse FR → IndexedDB
Safari existant (`norya-course-reading`, store `chapters`).

Le site est un export Expo `single` : il faut ajouter un vrai service HTTP derrière
l'origine existante, pas seulement un fichier dans l'export statique. Ne pas changer
le domaine de Norya pour ce raccordement : IndexedDB est lié à l'origine, un nouveau
domaine ne retrouverait pas les données Safari. Si cette origine ne permet aucun
routage serveur, l'alternative est un domaine moteur HTTPS authentifié avec CORS
limité à l'origine Norya ; cela exige de tester la session Safari et l'hébergement
avant raccordement. Ne pas exposer LibreTranslate sans contrôle d'accès.

Un port Codespaces privé distinct possède sa propre authentification GitHub : le
coller comme endpoint dans Safari n'est pas une intégration suffisante. Ne mettre
aucun jeton GitHub ou secret serveur dans le bundle. L'origine actuellement servie
reste à connaître pour choisir le routage concret, sans déplacer les données.

Contrat futur :

1. Accord sur la machine destinataire, puis consentement au passage sélectionné
   dans le cours finalisé. Réutiliser la commande contextuelle existante et sa
   fenêtre ; aucune nouvelle barre ni traduction automatique du chapitre.
2. Vérifier localement la version finalisée et l'ancre exacte. Envoyer uniquement
   le passage sélectionné (`q`, `source: ro`, `target: fr`, `format: text`) ;
   garder identifiants, empreinte, annotations, PDF et historique dans Safari.
3. Passerelle avec authentification réelle, protection CSRF si cookies, limite
   initiale de 4000 caractères, une requête simultanée, délai borné et aucune
   relance automatique. Moteur isolé, pas de repli Google ou autre fournisseur.
4. Journaux limités au statut/durée/volume ; aucun corps, texte, clé ou URL avec
   texte dans les logs, APM, cache ou métriques. Réponses `Cache-Control: no-store`.
   Cache de traduction serveur et suggestions désactivés ; pas de stockage du
   cours sur le moteur. Télécharger les modèles séparément du traitement privé.
5. Réponse non vide contrôlée, puis transaction locale via `updateReadingData`.
   L'ancre existante contient chapitre, empreinte, version, page, bloc, plage et
   texte source. Conserver les traductions antérieures, enregistrer la provenance
   du moteur/modèles et le pivot dans `provider`/`warnings`. Ne pas remplacer une
   traduction déjà enregistrée sans décision explicite ; ignorer une réponse si
   l'ancre/version a changé. Ne pas modifier annotations, RO, audio ou progression.
6. Une sélection partielle reste une traduction contextuelle, pas un remplacement
   du bloc entier en FR. Une traduction n'est pas une validation médicale.

Auto-hébergé dans Codespaces signifie traitement chez l'hébergeur GitHub, pas sur
l'iPad. Le passage quitte donc Safari ; accord requis même sans service de
traduction tiers. Cette approbation n'a pas été donnée pour cette phase.

## Limites et prochain essai à autoriser

Les modèles généraux et le pivot ne garantissent pas la fidélité médicale :
négations, doses, unités, tableaux et terminologie devront être comparés au RO.
Aucune qualité réelle n'est démontrée ici. Ne pas envoyer un cours entier comme
test. Ordre après accord : installation isolée avec plafond de disque ; santé
API/langues et phrase non médicale ; un paragraphe finalisé choisi et autorisé ;
contrôle humain ; affichage contextuel puis rechargement Safari et conservation
des annotations ; un échec moteur pour vérifier l'absence de faux succès.
Mesurer à ce moment disque final, mémoire au repos/pic et durée du paragraphe.

Vérifications de cette phase : df, free, nproc, versions Python, lecture des
sources et du stockage, absence d'opération Git, git diff --check. Pas de suite
applicative relancée puisque aucun code applicatif n'est modifié.

## Sources consultées

- [Modèles et tailles publiées](https://docs.libretranslate.com/guides/supported_languages/)
- [Index Argos](https://raw.githubusercontent.com/argosopentech/argospm-index/main/index.json)
- [Sélection automatique des modèles](https://github.com/LibreTranslate/LibreTranslate/blob/main/libretranslate/init.py)
- [Installation et options](https://docs.libretranslate.com/guides/installation/)
- [Dépendances Python](https://github.com/LibreTranslate/LibreTranslate/blob/main/pyproject.toml)
- [Cycle de vie Codespaces](https://docs.github.com/en/codespaces/about-codespaces/understanding-the-codespace-lifecycle)
- [Coûts et quotas](https://docs.github.com/en/billing/concepts/product-billing/github-codespaces)
- [Ports et authentification](https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace)
