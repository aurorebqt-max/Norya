export const examRules = {
  session: '2026', checkedOn: '2026-10-11', status: 'ministry-hosted-document-finality-unverified',
  source: 'https://www.ms.ro/media/documents/metodologie_UKkFmoq.pdf',
  notice: 'Méthodologie hébergée sur le site du ministère, consultée le 11/10/2026, intitulée pour la session du 15 novembre 2026 (art. 4 et 28, PDF p. 2 et 17–18) : 200 questions en 4 h, 50 compléments simples et 150 multiples, maximum théorique 950. Le statut d’adoption définitive n’est pas établi par le PDF seul ; barème provisoire dans l’application.',
  questions: 200, minutes: 240, singlePercent: 25, multiplePercent: 75,
  singleCount: 50, multipleCount: 150, theoreticalMaximum: 950,
  simpleScoring: '1 bonne réponse sur 5 : 4 points ; autrement 0.',
  multipleScoring: '2 à 4 bonnes réponses sur 5 : 1 point par décision correcte ; sélectionner moins de 2 ou plus de 4 réponses donne 0.',
  passingRule: 'L’art. 4 prévoit 60 % du score maximal réalisé au niveau national dans le domaine ; ce n’est pas un seuil fixe de 570/950.',
};
