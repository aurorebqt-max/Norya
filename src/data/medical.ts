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
    accessStatus: "inaccessible",
    notes:
      "La page publique enregistrée n'a pas pu être consultée lors de la vérification du 2026-09-24 (réponse 404). Vérification médicale et adaptation pédagogique francophone à réaliser avant publication. Aucun rang EDN n'est confirmé par cette source.",
  },
];

export const medicalObjectives: KnowledgeObjective[] = [
  {
    id: "nephro-nephrotic-1",
    itemNumber: 261,
    subject: "Néphrologie",
    title: "Reconnaître et explorer un syndrome néphrotique",
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
    "Le syndrome néphrotique associe une protéinurie importante, une hypoalbuminémie et des œdèmes; la protéinurie doit être quantifiée.",
    "Le bilan initial apprécie la fonction rénale, le sédiment urinaire, l'albumine, la pression artérielle et le contexte clinique.",
    "Il faut distinguer une cause glomérulaire primitive d'une cause secondaire (maladie systémique, infection, médicament ou autre contexte à rechercher).",
    "Les complications comprennent notamment les infections, les événements thromboemboliques, les œdèmes compliqués et l'altération de la fonction rénale.",
    "La conduite à tenir dépend de la gravité et de l'étiologie; une biopsie ou un traitement spécifique se discutent avec un néphrologue.",
  ],
  deepDive: {
    title: "Approfondir : raisonner sans sauter l'étape étiologique",
    content:
      "La diminution de la pression oncotique liée à la perte urinaire d'albumine participe à la formation des œdèmes; d'autres mécanismes de rétention sodée peuvent intervenir. Après confirmation, le terrain, les signes extra-rénaux, les médicaments, les infections et les antécédents orientent le bilan étiologique.",
    recommandations: [
      "Documenter la protéinurie par un rapport protéinurie/créatininurie ou une collecte selon le contexte.",
      "Rechercher les signes d'alerte et organiser rapidement l'avis néphrologique si la fonction rénale se dégrade, si l'œdème est compliqué ou si une cause secondaire est suspectée.",
      "Ne pas déduire une indication thérapeutique individuelle à partir d'une seule valeur biologique.",
      "Les options de traitement et leurs seuils ne sont pas détaillés ici tant que la source et la relecture médicale ne sont pas accessibles.",
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
    },
    {
      id: "diagnostic",
      title: "Diagnostic",
      content:
        "Quantifier la protéinurie, doser l'albumine et évaluer la fonction rénale. Le sédiment urinaire et l'examen clinique complètent l'orientation.",
    },
    {
      id: "physiopathologie",
      title: "Physiopathologie",
      content:
        "La perte urinaire de protéines modifie la pression oncotique et peut favoriser les œdèmes; la réponse rénale et la rétention sodée varient selon les situations.",
    },
    {
      id: "etiologies",
      title: "Étiologies",
      content:
        "L'enquête s'adapte au terrain : diabète, maladie systémique, infection, médicament et néoplasie sont des pistes à hiérarchiser.",
      rank: "A",
    },
    {
      id: "differentials",
      title: "Diagnostics différentiels",
      content:
        "Des œdèmes peuvent aussi relever d'une cause cardiaque, hépatique, veineuse ou médicamenteuse; la protéinurie et l'albuminémie aident à orienter, sans suffire à elles seules.",
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
    {
      id: "traitement",
      title: "Traitement",
      content:
        "La prise en charge est étiologique et spécialisée. Les mesures symptomatiques et la prévention des complications doivent être individualisées; ce point reste en attente de validation médicale.",
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
      id: "nephrotic-syndrome",
      term: "Syndrome néphrotique",
      short: "Ensemble associant protéinurie importante, hypoalbuminémie et œdèmes.",
      details: "La confirmation et l'interprétation reposent sur des mesures biologiques et l'examen clinique.",
      source: "KDIGO 2021, référence de travail non accessible lors de la vérification",
    },
    {
      id: "nephrotic-proteinuria",
      term: "Protéinurie",
      short: "Présence anormale de protéines dans les urines.",
      details:
        "Elle doit être quantifiée avec une méthode adaptée; elle ne suffit pas seule à définir un syndrome néphrotique.",
      source: "KDIGO 2021, référence de travail",
    },
    {
      id: "nephrotic-hypoalbuminemia",
      term: "Hypoalbuminémie",
      short: "Diminution de la concentration d'albumine dans le sang.",
      details: "Elle doit être interprétée avec le contexte clinique et les autres résultats.",
      source: "Référence de travail, validation médicale en attente",
    },
    {
      id: "nephrotic-edema",
      term: "Œdème",
      short: "Accumulation de liquide dans les tissus.",
      details: "Son mécanisme et sa gravité ne se déduisent pas d'un seul signe; l'examen clinique reste nécessaire.",
      source: "Référence de travail, validation médicale en attente",
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
