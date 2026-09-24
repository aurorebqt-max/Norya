import type { EcosSituation, PracticeQuestion } from "../domain/medical/types";

export const trainingQuestions: PracticeQuestion[] = [
  {
    id: "nephro-isolated-1",
    type: "isolated",
    itemNumber: 261,
    subject: "Néphrologie",
    specialty: "Néphrologie",
    objectiveId: "nephro-nephrotic-1",
    rank: "A",
    text: "Devant des œdèmes déclives et une albuminémie basse, quel examen confirme et quantifie la protéinurie ?",
    choices: [
      { id: "a", text: "Rapport protéinurie/créatininurie ou collecte adaptée", isCorrect: true, explanation: "La protéinurie doit être quantifiée par une méthode adaptée au contexte." },
      { id: "b", text: "Une radiographie thoracique seule", isCorrect: false },
      { id: "c", text: "Une glycémie isolée", isCorrect: false },
    ],
    generalExplanation: "Cette question entraîne le raisonnement initial; elle ne remplace pas un protocole clinique.",
    sourceVersionId: "kdigo-glomerular-2021",
  },
  {
    id: "nephro-lca-1",
    type: "lca",
    itemNumber: 261,
    subject: "Néphrologie",
    specialty: "Néphrologie",
    objectiveId: "nephro-nephrotic-2",
    rank: "B",
    text: "Dans une lecture critique, quelle étape vient avant l'extrapolation des résultats à un patient ?",
    choices: [
      { id: "a", text: "Identifier la population étudiée et le critère de jugement", isCorrect: true },
      { id: "b", text: "Conclure que le traitement convient à tous", isCorrect: false },
      { id: "c", text: "Ignorer les pertes de suivi", isCorrect: false },
    ],
    generalExplanation: "La validité externe ne se discute qu'après l'analyse de la méthode et de la population.",
    sourceVersionId: "kdigo-glomerular-2021",
  },
];

export const trainingDossier = {
  id: "nephro-dossier-1",
  title: "Œdèmes et protéinurie : raisonner par étapes",
  context: "Cas pédagogique original : les données sont volontairement limitées et ne constituent pas une situation de soins.",
  questions: [
    trainingQuestions[0],
    { ...trainingQuestions[0], id: "nephro-dossier-2", type: "dossier_step" as const, text: "Après confirmation, quelle famille de causes faut-il rechercher selon le terrain ?" },
  ],
};

export const trainingExam = {
  id: "norya-white-exam-1",
  title: "Examen blanc thématique · néphrologie",
  questions: [trainingQuestions[0], trainingQuestions[1]],
};

export const ecosStations: EcosSituation[] = [
  {
    id: "ecos-nephro-annonce",
    itemNumber: 261,
    subject: "Néphrologie",
    title: "Expliquer une orientation néphrologique",
    startingSituation: "Vous êtes en consultation simulée. Une personne demande pourquoi une protéinurie importante nécessite un avis spécialisé.",
    candidateInstructions: ["Se présenter et vérifier la demande.", "Expliquer avec des mots simples ce qui est recherché.", "Vérifier la compréhension et proposer la suite sans annoncer un diagnostic certain."],
    durationMinutes: 5,
    progressiveAnswers: [
      { stage: "Demande initiale", dialogueOrObservation: "La personne exprime son inquiétude.", expectedAction: "Accueillir, reformuler et clarifier la question." },
      { stage: "Explication", dialogueOrObservation: "Elle demande si la biopsie est automatique.", expectedAction: "Expliquer que la décision dépend du contexte et d'un avis spécialisé." },
    ],
    scoringGrid: [
      { criterion: "Écoute et reformulation", points: 2, rank: "A", explanation: "La demande est explicitement reformulée." },
      { criterion: "Information prudente", points: 3, rank: "A", explanation: "Le candidat distingue hypothèse et diagnostic." },
      { criterion: "Vérification de compréhension", points: 2, rank: "B", explanation: "Une question ouverte clôt l'explication." },
    ],
    sourceVersionId: "kdigo-glomerular-2021",
  },
];
