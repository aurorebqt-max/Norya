export type CourseCoverage = {
  chapterId: string;
  completeBookFile: string;
  tematicaPdfPage: number;
  tematicaScope: string;
  printedBookPages: string;
  completeBookPdfPages: string;
  pageMapping: "printed-folios-matched";
  comparison: "in-progress";
  humanMedicalReview: "not-performed";
  examinedPrintedPages?: string;
  examinedPdfPages?: string;
  examinedBy?: string;
  figuresAndTables?: string[];
  automatedChecks?: "not-run" | "passed";
  editionDetails?: string;
  pageMappingEvidence?: string;
  tematicaProvenance?: string;
  pageMatrix?: {
    printedPage: number;
    pdfPage: number;
    themes: string;
    read: boolean;
    integrated: "integrated" | "partial" | "not-integrated";
    sectionIds: string[];
    figuresAndTablesExamined: string[];
    absentOrUncertain: string;
  }[];
  notionCoverage?: {
    sourcePrintedPages: string;
    sourcePdfPages: string;
    notion: string;
    sectionId?: string;
    status: "covered" | "partial" | "not-reviewed";
    note?: string;
  }[];
  erratum?: {
    file: string;
    printedPages: string;
    correction: string;
    sessionApplicability: "not-confirmed";
  };
  remainingTopics: string[];
};

export const courseCoverage: Record<string, CourseCoverage> = {
  "kum-08": {
    chapterId: "kum-08",
    completeBookFile: "KUMAR EDITABIL.pdf",
    tematicaPdfPage: 1,
    tematicaScope: "Capitolul 8 integral: Sepsisul și tratamentul infecțiilor bacteriene.",
    printedBookPages: "151–168",
    completeBookPdfPages: "174–191",
    pageMapping: "printed-folios-matched",
    comparison: "in-progress",
    humanMedicalReview: "not-performed",
    examinedPrintedPages: "151–168",
    examinedPdfPages: "174–191",
    examinedBy: "PyMuPDF text extraction and rendered-page visual inspection for each of the 18 in-scope PDF pages (174–191).",
    editionDetails: "PDF title/copyright pages identify Kumar și Clark Medicină Clinică, Romanian 10th anniversary edition, Editura Hipocrate, 2021; file contains 1,568 PDF pages.",
    pageMappingEvidence: "Printed folio 151 appears on PDF p.174; printed folio 152 on PDF p.175; printed folios 153–168 then appear sequentially on PDF pp.176–191. PDF p.173 is a blank divider before the chapter.",
    tematicaProvenance: "PDF title/content identifies the November 2026 Medicine session and lists this Kumar chapter; local metadata names author 'razvan01' and Nitro PDF Producer, with no digital signature or official source URL embedded. Provenance is not independently authenticated.",
    figuresAndTables: [
      "Figure 8.1 diagnostic pathway and laboratory work-up (printed p.152, PDF p.175): visually inspected; original Norya text pathway, not reproduced image.",
      "Clinical body map (printed p.153, PDF p.176): visually inspected; contents paraphrased, protected figure not reused.",
      "SOFA table (printed p.155, PDF p.178): visually inspected and presented as an original Norya table; row-by-row medical verification is still required.",
      "NICE risk table (printed p.156, PDF p.179): visually inspected and paraphrased; supplied 2021 erratum wording retained with edition applicability uncertain.",
      "Sepsis Six and early-treatment table (printed p.157, PDF p.180): visually inspected; principles summarized in original wording.",
      "Antibiotic dose table 8.8 (printed p.162, PDF p.185): visually inspected; exact values need independent row-by-row medical verification before publication as study-ready dosing.",
    ],
    automatedChecks: "passed",
    pageMatrix: [
      {
        printedPage: 151, pdfPage: 174, themes: "Chapter opening; clinical skills and context of sepsis care.",
        read: true, integrated: "partial", sectionIds: ["kum-08-v2-clinical-skills", "kum-08-v2-anamnesis"],
        figuresAndTablesExamined: ["Opening page and section headings; no data table recorded."],
        absentOrUncertain: "Learning objectives are summarized; epidemiological context is not independently refreshed.",
      },
      {
        printedPage: 152, pdfPage: 175, themes: "Focused history, infection symptoms and initial diagnostic pathway.",
        read: true, integrated: "partial", sectionIds: ["kum-08-v2-anamnesis"],
        figuresAndTablesExamined: ["Cadran 8.1 and Figure 8.1 diagnostic pathway/laboratory work-up, visually inspected."],
        absentOrUncertain: "The pathway is paraphrased, not recreated as a complete flowchart.",
      },
      {
        printedPage: 153, pdfPage: 176, themes: "Physical examination, clinical signs and search for an anatomical source.",
        read: true, integrated: "partial", sectionIds: ["kum-08-v2-examination"],
        figuresAndTablesExamined: ["Clinical body map visually inspected; protected image not reused."],
        absentOrUncertain: "Map contents are represented in prose; individual callouts are not all reproduced as a checklist.",
      },
      {
        printedPage: 154, pdfPage: 177, themes: "Introduction, pathophysiology, organ dysfunction, Sepsis-3, qSOFA and septic shock.",
        read: true, integrated: "partial", sectionIds: ["kum-08-v2-introduction", "kum-08-v2-pathophysiology", "kum-08-v2-organ-dysfunction", "kum-08-v2-sepsis3", "kum-08-v2-septic-shock", "kum-08-v2-recognition"],
        figuresAndTablesExamined: ["Definitions and text visually checked; SOFA grid continues on p.155."],
        absentOrUncertain: "Epidemiological figures remain edition-specific and were not independently validated.",
      },
      {
        printedPage: 155, pdfPage: 178, themes: "SOFA score grid; host-risk factors and inpatient monitoring.",
        read: true, integrated: "partial", sectionIds: ["kum-08-v2-sofa", "kum-08-v2-risk-groups", "kum-08-v2-inpatient-surveillance"],
        figuresAndTablesExamined: ["Cadran 8.2 SOFA table visually inspected and shown as an original Norya table; the lesson text also summarizes its thresholds."],
        absentOrUncertain: "Cardiovascular drug-dose boundaries and renal/urine-output scoring need independent row-by-row medical verification.",
      },
      {
        printedPage: 156, pdfPage: 179, themes: "NICE risk-stratification instrument for suspected sepsis in adults and young people aged 12 years or more.",
        read: true, integrated: "partial", sectionIds: ["kum-08-v2-recognition", "kum-08-v2-risk-groups"],
        figuresAndTablesExamined: ["Cadran 8.3 risk table visually inspected."],
        absentOrUncertain: "Full high-, moderate- and low-risk criteria are not transcribed; 2021 erratum applicability is unconfirmed.",
      },
      {
        printedPage: 157, pdfPage: 180, themes: "Special patient groups and initial treatment, including Sepsis Six and fluid resuscitation.",
        read: true, integrated: "partial", sectionIds: ["kum-08-v2-travel", "kum-08-v2-injecting-drugs", "kum-08-v2-neutropenia", "kum-08-v2-immobilized", "kum-08-v2-sepsis-six", "kum-08-v2-fluid-resuscitation"],
        figuresAndTablesExamined: ["Cadran 8.4 Sepsis Six and early-treatment material visually inspected."],
        absentOrUncertain: "Recommendations are historical source content, not validated as current bedside guidance.",
      },
      {
        printedPage: 158, pdfPage: 181, themes: "Microbiological specimens, blood cultures, laboratory identification and source control.",
        read: true, integrated: "partial", sectionIds: ["kum-08-v2-antibiotics-and-source", "kum-08-v2-cultures", "kum-08-v2-molecular-diagnostics"],
        figuresAndTablesExamined: ["Cadran 8.5/8.6 specimen and microbiology material visually inspected."],
        absentOrUncertain: "The complete specimen-by-specimen table and molecular-test caveats are summarized rather than fully tabulated.",
      },
      {
        printedPage: 159, pdfPage: 182, themes: "Antimicrobial administration, stewardship aims and prescribing review.",
        read: true, integrated: "partial", sectionIds: ["kum-08-v2-antimicrobial-stewardship", "kum-08-v2-empirical-choice"],
        figuresAndTablesExamined: ["Stewardship text and section headings visually inspected."],
        absentOrUncertain: "UK service targets are source context, not independently verified as current policy.",
      },
      {
        printedPage: 160, pdfPage: 183, themes: "OPAT eligibility, service provision and monitoring.",
        read: true, integrated: "partial", sectionIds: ["kum-08-v2-opat", "kum-08-v2-opat-monitoring", "kum-08-v2-72-hour-review"],
        figuresAndTablesExamined: ["OPAT text and monitoring details visually inspected."],
        absentOrUncertain: "Operational requirements are summarized; complete monitoring intervals and criteria need a final source-to-section comparison.",
      },
      {
        printedPage: 161, pdfPage: 184, themes: "Antibiotic chemoprophylaxis and indications.",
        read: true, integrated: "partial", sectionIds: ["kum-08-v2-chemoprophylaxis"],
        figuresAndTablesExamined: ["Cadran 8.7 chemoprophylaxis table visually inspected."],
        absentOrUncertain: "Not every prophylaxis indication/regimen is transcribed; erratum applicability is unconfirmed.",
      },
      {
        printedPage: 162, pdfPage: 185, themes: "Cadran 8.8: commonly used antimicrobial doses.",
        read: true, integrated: "not-integrated", sectionIds: ["kum-08-v2-dose-table"],
        figuresAndTablesExamined: ["Cadran 8.8 visually inspected; values intentionally not published as a study-ready table."],
        absentOrUncertain: "Dose, maximum dose, route and exception rows remain untranscribed and independently unverified.",
      },
      {
        printedPage: 163, pdfPage: 186, themes: "Beta-lactam principles, penicillins and cephalosporins.",
        read: true, integrated: "partial", sectionIds: ["kum-08-v2-beta-lactam-principle", "kum-08-v2-penicillins", "kum-08-v2-cephalosporins"],
        figuresAndTablesExamined: ["Class mechanism and resistance text visually inspected."],
        absentOrUncertain: "Drug-by-drug spectra/adverse effects are incomplete; ceftaroline/ceftobiprole erratum applicability remains uncertain.",
      },
      {
        printedPage: 164, pdfPage: 187, themes: "Beta-lactamase inhibitors, quinolones and aminoglycosides.",
        read: true, integrated: "partial", sectionIds: ["kum-08-v2-beta-lactamase-inhibitors", "kum-08-v2-quinolones", "kum-08-v2-aminoglycosides"],
        figuresAndTablesExamined: ["Text and class sequence visually inspected."],
        absentOrUncertain: "Drug-specific spectra, resistance mechanisms and toxicities are not represented in full.",
      },
      {
        printedPage: 165, pdfPage: 188, themes: "Tetracyclines and tetracycline structural illustration.",
        read: true, integrated: "partial", sectionIds: ["kum-08-v2-tetracyclines"],
        figuresAndTablesExamined: ["Figure 8.4 visually inspected; original figure not copied."],
        absentOrUncertain: "Figure is summarized; remaining agent-level distinctions require detailed verification.",
      },
      {
        printedPage: 166, pdfPage: 189, themes: "Further antimicrobial classes, including fusidate, sulfonamides/trimethoprim and nitroimidazoles.",
        read: true, integrated: "partial", sectionIds: ["kum-08-v2-fusidate", "kum-08-v2-sulfonamides-trimethoprim", "kum-08-v2-nitroimidazoles"],
        figuresAndTablesExamined: ["Figure 8.5 and adjacent class text visually inspected."],
        absentOrUncertain: "Full indication, interaction and adverse-effect lists remain selectively summarized.",
      },
      {
        printedPage: 167, pdfPage: 190, themes: "Additional antibiotic agents and resistant organisms, including MRSA and carbapenem-resistant organisms.",
        read: true, integrated: "partial", sectionIds: ["kum-08-v2-mrsa", "kum-08-v2-cre"],
        figuresAndTablesExamined: ["Resistant-organism treatment material and associated tabular content visually inspected."],
        absentOrUncertain: "Complete organism-specific regimens and susceptibility caveats require validation; historical regimens are not current prescribing guidance.",
      },
      {
        printedPage: 168, pdfPage: 191, themes: "End of antimicrobial therapy discussion and further reading.",
        read: true, integrated: "partial", sectionIds: ["kum-08-v2-cre"],
        figuresAndTablesExamined: ["Closing page and further-reading section visually inspected."],
        absentOrUncertain: "References are not reproduced as teaching content; final boundary of the resistant-organism section needs a source-to-section check.",
      },
    ],
    notionCoverage: [
      { sourcePrintedPages: "151–153", sourcePdfPages: "174–176", notion: "Clinical skills, history, focused examination and diagnostic pathway", sectionId: "kum-08-v2-examination", status: "partial" },
      { sourcePrintedPages: "154", sourcePdfPages: "177", notion: "Sepsis-3 definition, host response, pathophysiology and organ dysfunction", sectionId: "kum-08-v2-sepsis3", status: "partial" },
      { sourcePrintedPages: "154–155", sourcePdfPages: "177–178", notion: "SOFA, qSOFA and septic-shock criteria", sectionId: "kum-08-v2-sofa", status: "partial", note: "SOFA thresholds are in course text; cardiovascular and urine-output details need independent verification." },
      { sourcePrintedPages: "154–157", sourcePdfPages: "177–180", notion: "Risk groups, inpatient surveillance, clinical presentation, special populations and initial treatment", sectionId: "kum-08-v2-sepsis-six", status: "partial", note: "Full risk-grid thresholds and contemporary treatment validation remain outstanding." },
      { sourcePrintedPages: "158–159", sourcePdfPages: "181–182", notion: "Cultures, molecular identification, source control and stewardship", sectionId: "kum-08-v2-cultures", status: "partial" },
      { sourcePrintedPages: "159–161", sourcePdfPages: "182–184", notion: "Empiric therapy, 72-hour review, OPAT, allergy assessment and prophylaxis", sectionId: "kum-08-v2-72-hour-review", status: "partial", note: "Full prophylaxis regimens and allergy cross-reactivity details are not fully represented." },
      { sourcePrintedPages: "161–168", sourcePdfPages: "184–191", notion: "Antimicrobial classes, dose table, spectra, adverse effects, prophylaxis and resistant organisms", sectionId: "kum-08-v2-dose-table", status: "partial", note: "Dose table remains intentionally unpublished; class spectra, resistance and prophylaxis need completion." },
    ],
    erratum: {
      file: "20211121-erata-23aug2021.pdf",
      printedPages: "152, 153, 156, 162, 163, 167",
      correction: "Corrections de tableaux, terminologie et texte, dont la note sur l’activité anti-MRSA des céphalosporines de 5e génération.",
      sessionApplicability: "not-confirmed",
    },
    remainingTopics: [
      "The complete antibiotic dose table 8.8 (printed p.162/PDF p.185) is not transcribed into Norya; it is visually legible but requires row-by-row independent verification before dosing data are published.",
      "Full class-by-class spectrum, adverse-effect, organism-specific treatment, CRE resistance and all prophylaxis regimens across printed pp.161–168 remain only selectively summarized.",
      "Detailed organ support and a complete bedside risk-stratification workflow have not been converted into a complete protocol.",
      "The supplied 2021 erratum names Kumar, Volume I, but not the exact edition or 2026 applicability; relevant amendments are disclosed without claiming official applicability.",
      "No permission to reproduce source figures was established. The original body map is not included; findings are paraphrased. Human review remains needed for table boundaries, figures and clinical wording.",
    ],
  },
  "kum-31": {
    chapterId: "kum-31",
    completeBookFile: "KUMAR EDITABIL.pdf",
    tematicaPdfPage: 1,
    tematicaScope: "Chapitre 31 entier: Hipertensiunea arterială.",
    printedBookPages: "1133–1145",
    completeBookPdfPages: "1155–1167",
    pageMapping: "printed-folios-matched",
    comparison: "in-progress",
    humanMedicalReview: "not-performed",
    erratum: {
      file: "20211121-erata-23aug2021.pdf",
      printedPages: "1136, 1137, 1143",
      correction: "Figure de mesure, terme sur la réglisse, mécanisme des IEC et posologie de la doxazosine corrigés.",
      sessionApplicability: "not-confirmed",
    },
    remainingTopics: [
      "Classification complète par lieu de mesure, grades et profils ambulatoires.",
      "Évaluation structurée du risque cardiovasculaire et de toutes les atteintes d’organes cibles.",
      "Indications, associations, contre-indications et surveillance par classe thérapeutique.",
      "Conduite détaillée des urgences hypertensives selon l’organe atteint.",
    ],
  },
  "kum-09": {
    chapterId: "kum-09",
    completeBookFile: "KUMAR EDITABIL.pdf",
    tematicaPdfPage: 1,
    tematicaScope: "Capitolul 9: Apa și electroliții, p.172–190; Dezechilibrele acido-bazice, p.195–202.",
    printedBookPages: "172–190; 195–202",
    completeBookPdfPages: "195–213; 218–225",
    pageMapping: "printed-folios-matched",
    comparison: "in-progress",
    humanMedicalReview: "not-performed",
    examinedPrintedPages: "172–190; 195–202",
    examinedPdfPages: "195–213; 218–225",
    examinedBy: "PyMuPDF text extraction from every in-scope page; figure/table visual review remains pending.",
    editionDetails: "Kumar și Clark Medicină Clinică, ediția română a 10-a aniversară, Editura Hipocrate, 2021; fișier complet de 1.568 pagini PDF.",
    pageMappingEvidence: "Folio 172 matches PDF p.195; folios 190, 195 and 202 match PDF pp.213, 218 and 225. Excluded printed pp.191–194 occupy PDF pp.214–217.",
    figuresAndTables: [
      "Cadranele 9.3–9.6 și Figurile 9.3–9.6: compartimente, presiuni, reglarea volumului și transportul tubular, PDF pp.195–199.",
      "Cadranul 9.6 și Figurile 9.8–9.11: clase de diuretice, mecanisme tubulare și tratamentul lichidian, PDF pp.202–205.",
      "Cadranele 9.12–9.14: pierderi hidroelectrolitice și clasificarea/tratamentul hiponatremiei, PDF pp.207–208.",
      "Cadranele de tulburări ale sodiului și potasiului, Fig. 9.12 ECG și algoritmul hiperkaliemiei: PDF pp.209–213.",
      "Figurile 9.14–9.17 și Cadranele 9.24–9.32: homeostazia acid-bazică, nomogramă, cauze și clasificări, PDF pp.219–225.",
    ],
    automatedChecks: "not-run",
    notionCoverage: [
      { sourcePrintedPages: "172–176", sourcePdfPages: "195–199", notion: "Compartimente, osmoticitate, VASE și reglare neurohormonală", sectionId: "kum-09-rebuild-compartments", status: "partial" },
      { sourcePrintedPages: "176–181", sourcePdfPages: "199–204", notion: "Edeme, transport tubular, diuretice și rezistență", sectionId: "kum-09-rebuild-edema-diuretics", status: "partial", note: "Tabelele/clasele au nevoie de inspecție vizuală completă și detalii pe clase." },
      { sourcePrintedPages: "181–183", sourcePdfPages: "204–206", notion: "Depleție extracelulară, semne, etiologii și repleție", sectionId: "kum-09-rebuild-edema-diuretics", status: "partial" },
      { sourcePrintedPages: "183–187", sourcePdfPages: "206–210", notion: "Tulburări ale sodiului, hipo-/hipernatremie și corecție", sectionId: "kum-09-rebuild-sodium", status: "partial", note: "Tabelele de algoritm/dozare nu sunt încă transcrise rând cu rând." },
      { sourcePrintedPages: "187–190", sourcePdfPages: "210–213", notion: "Hipo-/hiperkaliemie, cauze, ECG și tratament urgent", sectionId: "kum-09-rebuild-potassium", status: "partial", note: "Algoritmul de hiperkaliemie și valorile sale cer verificare vizuală." },
      { sourcePrintedPages: "195–198", sourcePdfPages: "218–221", notion: "Tamponare, Henderson–Hasselbalch și excreția renală a acidului", sectionId: "kum-09-rebuild-acid-base", status: "partial" },
      { sourcePrintedPages: "198–202", sourcePdfPages: "221–225", notion: "Gazometrie, compensare, tulburări mixte, anion gap și clasificări", sectionId: "kum-09-rebuild-acid-base-disorders", status: "partial", note: "Valorile complete și tabelele cauzelor trebuie confruntate vizual cu PDF-ul." },
    ],
    remainingTopics: [
      "Detaliile complete ale tabelelor pentru diuretice, repleție, hiponatremie, hipernatremie și hiperkaliemie nu sunt încă redate rând cu rând.",
      "Clasificările etiologice ale tulburărilor acido-bazice și criteriile tabelelor de pe pp.199–202 necesită confruntare vizuală și completare.",
      "Inspecția vizuală a figurilor și tabelelor programatice și relectura medicală umană sunt încă necesare; statutul cursului rămâne parțial.",
    ],
  },
  "kum-10": {
    chapterId: "kum-10",
    completeBookFile: "KUMAR EDITABIL.pdf",
    tematicaPdfPage: 1,
    tematicaScope: "Chapitre 10: insuficiența respiratorie (p.224–232) et SDRA (p.232–233); page 232 appartient aux deux portions.",
    printedBookPages: "224–233",
    completeBookPdfPages: "247–256",
    pageMapping: "printed-folios-matched",
    comparison: "in-progress",
    humanMedicalReview: "not-performed",
    examinedPrintedPages: "224–233",
    examinedPdfPages: "247–256",
    examinedBy: "PyMuPDF text extraction from all 10 in-scope pages; selected tables and figures need visual review.",
    editionDetails: "Kumar și Clark Medicină Clinică, ediția română a 10-a aniversară, Editura Hipocrate, 2021; fișier complet de 1.568 pagini PDF.",
    pageMappingEvidence: "Folio 224 matches PDF p.247; folios 232 and 233 match PDF pp.255 and 256.",
    figuresAndTables: [
      "Cadranele 10.12–10.15: pacient cu risc, moduri de suport și complicațiile intubației/traheostomiei, PDF pp.247, 250–252.",
      "Figurile 10.25–10.30 și Cadranul 10.16: oxigen, Venturi, ECMO, criterii VNI și imagini SDRA, PDF pp.249, 253–256.",
    ],
    automatedChecks: "not-run",
    notionCoverage: [
      { sourcePrintedPages: "224–225", sourcePdfPages: "247–248", notion: "Context pacient critic, clasificare, etiologii și tabloul insuficienței respiratorii", sectionId: "kum-10-rebuild-critical-context", status: "partial" },
      { sourcePrintedPages: "225–227", sourcePdfPages: "248–250", notion: "Evaluare clinică, gazometrie, pulsoximetrie, capnografie și oxigen", sectionId: "kum-10-rebuild-investigations-oxygen", status: "partial" },
      { sourcePrintedPages: "227–230", sourcePdfPages: "250–253", notion: "Indicații de suport, intubație, moduri și complicații ventilatorii", sectionId: "kum-10-rebuild-support", status: "partial", note: "Tabelele complete și tehnicile sunt încă de verificat și organizat." },
      { sourcePrintedPages: "229–232", sourcePdfPages: "252–255", notion: "CPAP, PSV, SIMV, ECMO, VNI și sevraj", sectionId: "kum-10-rebuild-modes-and-niv", status: "partial" },
      { sourcePrintedPages: "232–233", sourcePdfPages: "255–256", notion: "Definiție, criterii Berlin, imagistică și tratamentul SDRA", sectionId: "kum-10-rebuild-ards", status: "partial", note: "Limitele de categorie 200/100 mmHg sunt ambigue în tabelul tipărit; necesită verificare vizuală." },
    ],
    remainingTopics: [
      "Causes et investigations détaillées de chaque mécanisme d’insuffisance respiratoire.",
      "Modes, réglages, indications et complications de ventilation invasive.",
      "Toutes les indications et contre-indications de la VNI et les critères d’échec.",
      "Critères diagnostiques complets du SDRA et stratégie ventilatoire; préciser à la relecture les bornes des catégories P/F 200/100, imprimées comme plages puis « <100 » dans le manuel.",
    ],
  },
  "kum-21": {
    chapterId: "kum-21",
    completeBookFile: "KUMAR EDITABIL.pdf",
    tematicaPdfPage: 1,
    tematicaScope: "Chapitre 21: hypothyroïdie et hyperthyroïdie p.611–619, jusqu’au sous-titre « Gușa »; carcinome thyroïdien p.621–622.",
    printedBookPages: "611–619; 621–622",
    completeBookPdfPages: "634–642; 644–645",
    pageMapping: "printed-folios-matched",
    comparison: "in-progress",
    humanMedicalReview: "not-performed",
    erratum: {
      file: "20211121-erata-23aug2021.pdf",
      printedPages: "615",
      correction: "La manifestation neuromusculaire corrigée est l’atrophie musculaire proximale.",
      sessionApplicability: "not-confirmed",
    },
    remainingTopics: [
      "Étiologies, bilan biologique complet et conduites thérapeutiques détaillées; le cours reprend le tableau de base p.611, pas toutes les situations des pages suivantes.",
      "Situations particulières et complications endocriniennes aiguës.",
      "Évaluation du nodule, histologies, stadification, traitement et suivi de chaque carcinome.",
      "La partie du chapitre après le début de la section « Gușa » est hors du périmètre Tematica fourni.",
    ],
  },
};

export const completeReferenceBooks = [
  {
    file: "KUMAR EDITABIL.pdf",
    title: "Kumar și Clark Medicină Clinică",
    edition: "Ediția a 10-a",
    publisherYear: "Editura Hipocrate, 2021",
    pdfPages: 1568,
  },
  {
    file: "LAWRENCE_EDITABIL.pdf",
    title: "Chirurgie generală și specialități chirurgicale",
    edition: "Ediția a 6-a",
    publisherYear: "Editura Hipocrate, 2021",
    pdfPages: 772,
  },
  {
    file: "Sinopsis de Medicina Editia a 5-a - Editabil.pdf",
    title: "Sinopsis de medicină",
    edition: "Ediția a 5-a",
    publisherYear: "Editura Hipocrate, 2021",
    pdfPages: 378,
  },
] as const;
