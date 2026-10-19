# Diagnostic de la traduction Safari — 17 octobre 2026

## Constat prouvé et limite

`CourseReadingTools.translateScope` appelle `GoogleFreeTranslator.translate`,
puis `fetch` dans `src/domain/sourceCourse/translateFree.ts`. La requête GET
part du navigateur vers `https://translate.googleapis.com/translate_a/single`,
avec `client=gtx`, `sl=ro`, `tl=fr`, `dt=t` et le texte dans le paramètre `q`.
Aucun proxy serveur n'intervient dans ce chemin. L'export Expo est configuré
`web.output: single` ; cet export ne fournit pas à lui seul une API serveur.

Le message signalé est créé par notre code pour toute `TypeError` dans le bloc
qui comprend fetch et lecture JSON. Il ne contient ni le diagnostic réseau natif,
ni un statut HTTP. Il ne permet donc pas de distinguer CORS, CSP, réseau/TLS,
blocage de contenu, ou interruption de lecture. Un statut HTTP lisible aurait
un message distinct ; une réponse 403/429 masquée par CORS reste possible.
Les 4000 caractères par morceau sont une limite de texte, pas une limite de
longueur de l'URL encodée : le test court ne couvre pas les longues requêtes.

Le précédent curl hors sandbox a reçu HTTP 200 et Allow-Origin: *. Curl ne fait
pas respecter CORS et n'utilise ni le réseau de l'iPad ni l'origine du site réel.
Ce test n'établit pas que Safari bloque systématiquement GTX, ni qu'il fonctionne
pour les requêtes longues du cours. Aucun nouvel appel GTX effectué pour cet audit.

## Obtenir l'erreur exacte sans répétitions

Demander l'origine de Norya (sans chemin privé ni paramètres) et le diagnostic
Console/Réseau de la requête échouée dans l'inspecteur Web Safari, depuis un Mac
relié à l'iPad. Si la trace existe, ne pas rejouer la requête. Sinon, une seule
requête de test non médical dans le contexte du site suffit pour tester ce
contexte, mais sa réussite ne reproduit pas nécessairement l'échec d'un texte long.
Ne pas désactiver CORS, les protections du navigateur ou effacer son stockage.

Relever uniquement : origine du site, heure, message réseau exact, statut HTTP
s'il existe, éventuelle redirection (hôte seulement), politique connect-src du
document et en-tête Access-Control-Allow-Origin de la réponse concernée.
Ne pas partager de HAR brut ni l'URL complète : q contient le texte médical.
Un refus connect-src appelle une correction ciblée de la politique du site ;
un refus/quota fournisseur n'autorise pas un contournement via un autre IP.
Sans trace de l'iPad, la cause réseau exacte reste non déterminée.

## Architecture proposée, non activée

Si un fournisseur autorise explicitement l'intégration serveur :
Safari → POST /api/translate sur l'origine Norya → fournisseur autorisé.
Le serveur authentifie l'utilisateur, limite taille/débit, impose un délai,
retourne une erreur HTTP explicite et ne relance pas automatiquement les refus.
Destination fixe : pas de proxy ouvert. Texte dans le corps POST, jamais dans
les URL ou journaux applicatifs ; désactiver aussi les captures de corps par
l'hébergement/APM, et utiliser Cache-Control: no-store. Le français revient au
stockage local existant, sans envoyer paquet, PDF, annotations ou historique.

Cela supprime l'échange inter-origines depuis Safari, mais ne donne aucun droit
supplémentaire d'accès au fournisseur. La documentation Google consultée décrit
Cloud Translation authentifié, pas une autorisation d'intégration gratuite de
l'endpoint client=gtx. L'accès HTTP 200 ne constitue pas cette autorisation.
Ne pas déployer un proxy GTX sur cette seule base. Pas de proxy CORS public.

Confidentialité : le chemin actuel transmet déjà le passage à Google, même si
une erreur CORS peut empêcher le navigateur de lire la réponse. Un proxy ajoute
un lieu de traitement : opérateur, hébergement et journaux doivent être approuvés
avant transfert du cours. Aucun nouveau service ou transfert n'est activé ici.

## Alternative recommandée

LibreTranslate auto-hébergé avec Argos Translate sur une machine contrôlée par
l'utilisateur, derrière la même route HTTPS authentifiée. Logiciel gratuit et
API documentée ; infrastructure et disponibilité restent à fournir. Aucun
fournisseur de traduction externe nécessaire après installation des modèles.
La liste officielle offre ro→en et en→fr et explique le pivot automatique.
La qualité médicale et les pertes du pivot doivent être évaluées sur un
paragraphe validé, puis une section, avant une traduction complète. Ce n'est pas
une garantie de fidélité ni une promesse de service hébergé gratuit illimité.

Critères d'acceptation avant raccordement : accord sur la machine de traitement,
modèles installés et couple RO/FR testé ; essai non médical dans Safari ; puis
paragraphe privé autorisé, section, affichage FR et rechargement ; erreur bornée
sans fausse sauvegarde lors d'un arrêt du moteur. Réutiliser les commandes
existantes seulement après ce contrôle, sans ajouter de bouton de façade.

## Vérifications de cette intervention

Lecture du chemin réseau, configuration Expo, diff et état Git (aucune opération
en cours détectée). Test ciblé :
`node --test-name-pattern='GTX' tests/chapter-priorities.test.cjs` : 1 réussi,
réponses/erreurs HTTP, TypeError et délai simulés. Aucun test sur Safari réel,
aucune modification de code applicatif, des données privées ou de la navigation.

Sources officielles consultées :
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS/Errors
- https://webkit.org/web-inspector/enabling-web-inspector/
- https://docs.cloud.google.com/translate/docs/translate-text
- https://docs.libretranslate.com/
- https://docs.libretranslate.com/guides/supported_languages/
