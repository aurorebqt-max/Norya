import { Session, StudyItem } from "../types";
export const sessions: Session[] = [
  {
    id: "cardio",
    title: "Les fondamentaux en cardiologie",
    subject: "Cardiologie",
    kind: "Fiche & mémorisation",
    minutes: 30,
    icon: "book-outline",
    color: "#EAF2E9",
  },
  {
    id: "dermato",
    title: "Un regard neuf sur la dermatologie",
    subject: "Dermatologie",
    kind: "3 questions de méthode",
    minutes: 20,
    icon: "help-circle-outline",
    color: "#F7E8DA",
  },
  {
    id: "audio",
    title: "On révise vos points fragiles ?",
    subject: "Révision des erreurs",
    kind: "Podcast de consolidation",
    minutes: 15,
    icon: "headset-outline",
    color: "#EDEBF7",
  },
];
export const items: StudyItem[] = [
  {
    id: "nephro",
    title: "Syndrome néphrotique",
    subject: "Néphrologie",
    progress: 0,
    rank: "A",
  },
  {
    id: "cardio",
    title: "Les fondamentaux en cardiologie",
    subject: "Cardiologie",
    progress: 65,
    rank: "A",
  },
  {
    id: "dermato",
    title: "Démarche en dermatologie",
    subject: "Dermatologie",
    progress: 48,
    rank: "A",
  },
  {
    id: "ophta",
    title: "Exploration en ophtalmologie",
    subject: "Ophtalmologie",
    progress: 72,
    rank: "B",
  },
  {
    id: "neuro",
    title: "Repères en neurologie",
    subject: "Neurologie",
    progress: 32,
    rank: "A",
  },
  {
    id: "pneumo",
    title: "Introduction à la pneumologie",
    subject: "Pneumologie",
    progress: 20,
    rank: "B",
  },
  {
    id: "gastro",
    title: "Repères en gastro-entérologie",
    subject: "Gastro-entérologie",
    progress: 0,
    rank: "A",
  },
];
export const errors = [
  {
    id: "e1",
    title: "Identifier les mots clés de l’énoncé",
    subject: "Cardiologie",
    count: 3,
  },
  {
    id: "e2",
    title: "Hiérarchiser les informations",
    subject: "Dermatologie",
    count: 2,
  },
  {
    id: "e3",
    title: "Prendre le temps de relire",
    subject: "Neurologie",
    count: 2,
  },
];
export const stats = {
  total: 367,
  completed: 124,
  mastery: 62,
  rankA: 68,
  rankB: 49,
  consolidated: 8,
};
export const podcasts = [
  {
    id: "p1",
    title: "La cardio, à tête reposée",
    subtitle: "Les essentiels • Cardiologie",
    minutes: 12,
    color: "#DCE9D6",
  },
  {
    id: "p2",
    title: "Vos erreurs, vos meilleurs alliés",
    subtitle: "Votre révision personnalisée",
    minutes: 15,
    color: "#F2DECD",
  },
  {
    id: "p3",
    title: "Un autre regard sur l’ophtalmo",
    subtitle: "Les essentiels • Ophtalmologie",
    minutes: 10,
    color: "#E1DFF0",
  },
];

/** Editorial learning prompts only. No clinical answer is represented here. */
export const flashcards = [
  {
    id: "method-cardio-reperes",
    objectiveId: "cardio-1",
    deck: "Repères de fiche",
    subject: "Cardiologie",
    prompt: "Quels sont les repères à retrouver dans la fiche avant de commencer ?",
    answer:
      "Reformulez l’objectif, repérez les sections attendues et notez ce qui doit être vérifié dans une source validée.",
  },
  {
    id: "method-dermato-organisation",
    objectiveId: "dermato-1",
    deck: "Organisation des objectifs",
    subject: "Dermatologie",
    prompt: "Comment organiser un objectif en début de séance ?",
    answer:
      "Découpez-le en sous-objectifs observables, estimez le temps disponible et prévoyez un rappel actif.",
  },
  {
    id: "method-ophta-structure",
    objectiveId: "ophta-1",
    deck: "Structure de fiche",
    subject: "Ophtalmologie",
    prompt: "Quelle vérification faire avant de considérer une fiche parcourue ?",
    answer:
      "Vérifiez que chaque objectif a été reformulé et identifiez les points qui nécessitent une source officielle.",
  },
  {
    id: "method-neuro-reperes",
    objectiveId: "neuro-1",
    deck: "Repères de fiche",
    subject: "Neurologie",
    prompt: "Que faire lorsqu’une notion reste ambiguë ?",
    answer:
      "La marquer comme à vérifier, conserver la question dans vos annotations et ne pas la transformer en connaissance validée.",
  },
  {
    id: "method-pneumo-rappel",
    objectiveId: "pneumo-1",
    deck: "Rappel actif",
    subject: "Pneumologie",
    prompt: "Quel est le but d’un rappel actif ?",
    answer:
      "Essayer de restituer la structure sans le support, puis comparer avec une source validée et corriger ses annotations.",
  },
  {
    id: "method-gastro-support",
    objectiveId: "gastro-1",
    deck: "Support de séance",
    subject: "Gastro-entérologie",
    prompt: "Comment terminer une séance de préparation ?",
    answer:
      "Consignez le temps réellement effectué, indiquez ce qui reste à travailler et planifiez le prochain passage.",
  },
];
