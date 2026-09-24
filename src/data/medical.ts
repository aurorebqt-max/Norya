import type {
  Flashcard,
  KnowledgeObjective,
  MedicalSheet,
  MedicalSourceVersion,
  PracticeQuestion,
} from "../domain/medical/types";

export const medicalSources: MedicalSourceVersion[] = [
  {
    id: "kdigo-glomerular-2021",
    source: "KDIGO",
    version: "KDIGO 2021 Clinical Practice Guideline for the Management of Glomerular Diseases",
    verifiedAt: "2026-09-24",
    targetExamSession: "EDN 2026 / 2027",
    url: "https://kdigo.org/guidelines/glomerular-diseases/",
    status: "needs_review",
    notes:
      "Référence publique de travail. Vérification médicale et adaptation pédagogique francophone à réaliser avant publication.",
  },
];

export const medicalObjectives: KnowledgeObjective[] = [
  {
    id: "nephro-nephrotic-1",
    itemNumber: 261,
    subject: "Néphrologie",
    title: "Reconnaître et explorer un syndrome néphrotique",
    rank: "A",
    code: "NORYA-NEPHRO-261-01",
    description:
      "À l'issue du premier passage, l'étudiant sait définir le syndrome, confirmer la protéinurie et organiser l'orientation étiologique sans confondre une information de cours avec un avis médical.",
    sourceVersionId: "kdigo-glomerular-2021",
  },
  {
    id: "nephro-nephrotic-2",
    itemNumber: 261,
    subject: "Néphrologie",
    title: "Relier complications, causes et suivi",
    rank: "B",
    code: "NORYA-NEPHRO-261-02",
    description:
      "À l'issue de l'approfondissement, l'étudiant sait relier les complications majeures aux mécanismes et repérer les situations qui nécessitent un avis spécialisé.",
    sourceVersionId: "kdigo-glomerular-2021",
  },
];

export const nephroticSheet: MedicalSheet = {
  id: "nephro-nephrotic-syndrome",
  itemNumber: 261,
  title: "Syndrome néphrotique",
  subject: "Néphrologie",
  specialty: "Néphrologie",
  primaryObjectiveId: "nephro-nephrotic-1",
  linkedObjectiveIds: ["nephro-nephrotic-1", "nephro-nephrotic-2"],
  sourceVersionId: "kdigo-glomerular-2021",
  essentialPoints: [
    "Le syndrome néphrotique associe une protéinurie importante, une hypoalbuminémie et des œdèmes; la confirmation repose sur la quantification de la protéinurie.",
    "L'enquête initiale recherche une cause secondaire, notamment diabète, lupus, infection, médicament ou néoplasie, selon le contexte clinique.",
    "Les complications à connaître sont thromboemboliques, infectieuses, nutritionnelles et liées à l'insuffisance rénale; leur prise en charge dépend du risque individuel.",
    "Une biopsie rénale et le traitement étiologique relèvent d'une discussion spécialisée; cette fiche ne remplace pas un avis médical.",
  ],
  deepDive: {
    title: "Approfondir : raisonner sans sauter l'étape étiologique",
    content:
      "Après avoir confirmé le syndrome, on distingue une cause glomérulaire primitive d'une cause secondaire. L'âge, les signes extra-rénaux, les médicaments, les infections et les antécédents orientent les examens. La fonction rénale, la pression artérielle, le sédiment urinaire et l'albuminémie participent à l'évaluation de la gravité.",
    recommandations: [
      "Documenter la protéinurie par un rapport protéinurie/créatininurie ou une collecte selon le contexte.",
      "Rechercher les signes d'alerte et organiser rapidement l'avis néphrologique si la fonction rénale se dégrade, si l'œdème est compliqué ou si une cause secondaire est suspectée.",
      "Ne pas déduire une indication thérapeutique individuelle à partir d'une seule valeur biologique.",
    ],
  },
  pitfallsSheet: {
    title: "Points de vigilance",
    traps: [
      "Confondre protéinurie isolée et syndrome néphrotique complet.",
      "Oublier une cause médicamenteuse ou systémique avant de parler de forme primitive.",
      "Présenter la prévention thrombotique ou les immunosuppresseurs comme automatiques : le rapport bénéfice-risque est individuel.",
    ],
  },
  sections: [
    {
      id: "definition",
      title: "Définition",
      content:
        "Association d'une protéinurie importante, d'une hypoalbuminémie et d'œdèmes. Les seuils exacts dépendent de la méthode de mesure et du contexte.",
      rank: "A",
    },
    {
      id: "diagnostic",
      title: "Diagnostic",
      content:
        "Quantifier la protéinurie, doser l'albumine et évaluer la fonction rénale. Le sédiment urinaire et l'examen clinique complètent l'orientation.",
      rank: "A",
    },
    {
      id: "etiologies",
      title: "Étiologies",
      content:
        "L'enquête s'adapte au terrain : diabète, maladie systémique, infection, médicament et néoplasie sont des pistes à hiérarchiser.",
      rank: "A",
    },
    {
      id: "gravite",
      title: "Gravité et complications",
      content:
        "Œdèmes, infection, thrombose et altération de la fonction rénale doivent être recherchés; la gravité est clinique et biologique.",
      rank: "B",
    },
    {
      id: "suivi",
      title: "Suivi",
      content:
        "Le suivi associe symptômes, poids, pression artérielle, protéinurie, albumine et fonction rénale selon l'étiologie et les traitements.",
      rank: "B",
    },
  ],
  flashcardIds: [
    "nephro-nephrotic-card-1",
    "nephro-nephrotic-card-2",
    "nephro-nephrotic-card-3",
    "nephro-nephrotic-card-4",
  ],
  definitions: [
    {
      id: "nephrotic-proteinuria",
      term: "Protéinurie",
      short: "Présence anormale de protéines dans les urines.",
      details:
        "Elle doit être quantifiée avec une méthode adaptée; elle ne suffit pas seule à définir un syndrome néphrotique.",
      source: "KDIGO 2021, référence de travail",
    },
  ],
  podcast: {
    title: "Syndrome néphrotique : les repères",
    durationMinutes: 3,
    description: "Lecture vocale du niveau L’essentiel, associée aux objectifs de néphrologie.",
  },
};

export const medicalFlashcards: Flashcard[] = [
  {
    id: "nephro-nephrotic-card-1",
    objectiveId: "nephro-nephrotic-1",
    itemNumber: 261,
    subject: "Néphrologie",
    rank: "A",
    recto: "Quels éléments font évoquer un syndrome néphrotique ?",
    verso:
      "Protéinurie importante, hypoalbuminémie et œdèmes. La protéinurie doit être quantifiée et le contexte clinique interprété.",
    clue: "Penser au trio clinique et biologique, puis confirmer.",
    explanation: "Une protéinurie isolée ne suffit pas à conclure.",
    sourceVersionId: "kdigo-glomerular-2021",
  },
  {
    id: "nephro-nephrotic-card-2",
    objectiveId: "nephro-nephrotic-1",
    itemNumber: 261,
    subject: "Néphrologie",
    rank: "A",
    recto: "Quelle est la première question étiologique après confirmation ?",
    verso:
      "Rechercher une cause secondaire selon le terrain : diabète, maladie systémique, infection, médicament ou néoplasie.",
    clue: "Le terrain guide les examens.",
    sourceVersionId: "kdigo-glomerular-2021",
  },
  {
    id: "nephro-nephrotic-card-3",
    objectiveId: "nephro-nephrotic-2",
    itemNumber: 261,
    subject: "Néphrologie",
    rank: "B",
    recto: "Quelles complications faut-il activement rechercher ?",
    verso:
      "Œdèmes compliqués, infection, événement thromboembolique, dénutrition et altération de la fonction rénale.",
    clue: "Raisonner par risque clinique, pas par liste automatique.",
    sourceVersionId: "kdigo-glomerular-2021",
  },
  {
    id: "nephro-nephrotic-card-4",
    objectiveId: "nephro-nephrotic-2",
    itemNumber: 261,
    subject: "Néphrologie",
    rank: "B",
    recto: "Pourquoi une biopsie rénale n'est-elle pas une conclusion automatique ?",
    verso:
      "Son indication dépend du contexte, de la cause suspectée, de la fonction rénale et de l'avis spécialisé.",
    clue: "Un examen invasif se discute au cas par cas.",
    sourceVersionId: "kdigo-glomerular-2021",
  },
];

export const nephroticMiniTest: PracticeQuestion[] = [
  {
    id: "nephro-nephrotic-q1",
    type: "isolated",
    itemNumber: 261,
    subject: "Néphrologie",
    specialty: "Néphrologie",
    objectiveId: "nephro-nephrotic-1",
    rank: "A",
    text: "Quel énoncé décrit le mieux le syndrome néphrotique ?",
    choices: [
      {
        id: "a",
        text: "Protéinurie importante, hypoalbuminémie et œdèmes",
        isCorrect: true,
        explanation: "C'est le regroupement pédagogique retenu dans cette fiche.",
      },
      {
        id: "b",
        text: "Hématurie isolée sans anomalie de la protéinurie",
        isCorrect: false,
      },
      {
        id: "c",
        text: "Toute insuffisance rénale aiguë",
        isCorrect: false,
      },
    ],
    generalExplanation:
      "La définition doit être confirmée par des mesures adaptées et replacée dans le contexte clinique.",
    sourceVersionId: "kdigo-glomerular-2021",
  },
];
