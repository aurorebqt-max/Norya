export type ReferenceBookId = "kumar" | "lawrence" | "sinopsis";

export type ExamChapter = {
  id: string;
  bookId: ReferenceBookId;
  chapter: string;
  pages: string;
  scope: string[];
  privateFile?: string;
};

export const referenceBooks: {
  id: ReferenceBookId;
  title: string;
  edition: string;
  publisher: string;
  year: number;
  coordinators: string;
}[] = [
  {
    id: "kumar",
    title: "Kumar și Clark Medicină Clinică",
    edition: "Ediția a 10-a",
    publisher: "Editura Hipocrate, București",
    year: 2021,
    coordinators: "Leonard Azamfirei, Anca Dana Buzoianu, Dan Ionuț Gheonea",
  },
  {
    id: "lawrence",
    title: "Chirurgie generală și specialități chirurgicale",
    edition: "Ediția a 6-a",
    publisher: "Editura Hipocrate, București",
    year: 2021,
    coordinators: "Octavian Crețu, Viorel Jinga, Viorel Scripcariu",
  },
  {
    id: "sinopsis",
    title: "Sinopsis de medicină",
    edition: "Ediția a 5-a",
    publisher: "Editura Hipocrate, București",
    year: 2021,
    coordinators: "Cristina Oana Mărginean, Cătălina Poiană",
  },
];

/** Bibliographic scope only; source text remains in user-imported local PDFs. */
export const examChapters: ExamChapter[] = [
  { id: "kum-08", bookId: "kumar", chapter: "Cap. 8 — Sepsisul și tratamentul infecțiilor bacteriene", pages: "151–168", scope: ["Sepsisul și tratamentul infecțiilor bacteriene"], privateFile: "SEPSIS.pdf" },
  { id: "kum-09", bookId: "kumar", chapter: "Cap. 9 — Echilibrul hidro-electrolitic și acido-bazic", pages: "172–190, 195–202", scope: ["Apa și electroliții · 172–190", "Dezechilibrele acido-bazice · 195–202"], privateFile: "EHE, EAB.pdf" },
  { id: "kum-10", bookId: "kumar", chapter: "Cap. 10 — Terapie intensivă", pages: "224–233", scope: ["Insuficiența respiratorie · 224–232", "Sindromul de detresă respiratorie acută · 232–233"], privateFile: "TI.pdf" },
  { id: "kum-16", bookId: "kumar", chapter: "Cap. 16 — Hematologie", pages: "327–336, 351–355", scope: ["Anemia. Anemia microcitară. Anemia macrocitară · 327–336", "Anemia hemolitică dobândită · 351–355"], privateFile: "Hemat.pdf" },
  { id: "kum-18", bookId: "kumar", chapter: "Cap. 18 — Reumatologie", pages: "437–454, 457–459", scope: ["Artrita reumatoidă · 437–447", "Spondilartrita · 447–454", "Lupusul eritematos sistemic · 457–459, până la «Sindromul antifosfolipidic»"], privateFile: "Reumato.pdf" },
  { id: "kum-21", bookId: "kumar", chapter: "Cap. 21 — Endocrinologie", pages: "611–619, 621–622", scope: ["Hipotiroidismul. Hipertiroidismul · 611–619, până la «Gușa (creșterea în volum a tiroidei)»", "Carcinomul tiroidian · 621–622"], privateFile: "Endo.pdf" },
  { id: "kum-23", bookId: "kumar", chapter: "Cap. 23 — Diabetul zaharat", pages: "699–736", scope: ["Diabetul zaharat, până la «Implicațiile psihosociale ale diabetului zaharat»"], privateFile: "Kumar. Cap 23. Diabet Zaharat.pdf" },
  { id: "kum-26", bookId: "kumar", chapter: "Cap. 26 — Neurologie", pages: "832–848, 869–872", scope: ["Coma și alte tulburări ale conștienței · 832–836", "Accidentul vascular cerebral · 836–845", "Hemoragia intracraniană · 845–848", "Meningita. Encefalita · 869–872, până la «HIV-ul și neurologia»"], privateFile: "Neuro.pdf" },
  { id: "kum-28", bookId: "kumar", chapter: "Cap. 28 — Pneumologie", pages: "949–982", scope: ["Astmul · 949–955", "Bronhopneumopatia obstructivă cronică · 955–961, până la «Apneea în somn de tip obstructiv»", "Pneumonia · 963–967", "Tuberculoza · 968–972, până la «Infecția cu micobacterii netuberculoase»", "Neoplaziile tractului respirator — Tumorile maligne · 975–982, până la «Tumorile benigne»"], privateFile: "Pneumo.pdf" },
  { id: "kum-29", bookId: "kumar", chapter: "Cap. 29 — Boala venoasă tromboembolică", pages: "1001–1017", scope: ["Boala venoasă tromboembolică"], privateFile: "TVP, TEP.pdf" },
  { id: "kum-30", bookId: "kumar", chapter: "Cap. 30 — Cardiologie", pages: "1045–1128", scope: ["Resuscitarea cardiacă · 1045–1048, până la «Cardioversia cu curent direct»", "Aritmiile cardiace · 1051–1069", "Insuficiența cardiacă · 1069–1079", "Boala coronariană — Angina. Sindroamele coronariene acute · 1079–1091", "Valvulopatii · 1091–1103", "Endocardita infecțioasă · 1103–1107", "Miocardita. Cardiomiopatiile · 1118–1124", "Bolile pericardului · 1125–1128"], privateFile: "Cardio.pdf" },
  { id: "kum-31", bookId: "kumar", chapter: "Cap. 31 — Hipertensiunea arterială", pages: "1133–1145", scope: ["Hipertensiunea arterială"], privateFile: "HTA.pdf" },
  { id: "kum-32", bookId: "kumar", chapter: "Cap. 32 — Gastroenterologie", pages: "1162–1166, 1172–1176, 1198–1208", scope: ["Boala de reflux gastroesofagian · 1162–1166, până la «Tulburările de motilitate»", "Infecția cu Helicobacter pylori și boala ulceroasă peptică · 1172–1176, până la «Gastropareza»", "Bolile inflamatorii intestinale · 1198–1208"], privateFile: "Gastro.pdf" },
  { id: "kum-34", bookId: "kumar", chapter: "Cap. 34 — Bolile hepatice", pages: "1275–1284, 1289–1303", scope: ["Hepatita virală · 1275–1284", "Ciroza hepatică · 1289–1303"], privateFile: "Hepato.pdf" },
  { id: "kum-36", bookId: "kumar", chapter: "Cap. 36 — Tulburări renale și ale tractului urinar", pages: "1351–1368, 1385–1387, 1392–1405", scope: ["Glomerulul și afectarea glomerulară · 1351–1368", "Nefritele tubulointerstițiale · 1385–1387", "Boala cronică de rinichi · 1392–1405"], privateFile: "Nefro, urinar.pdf" },
  { id: "kum-37", bookId: "kumar", chapter: "Cap. 37 — Infecții transmisibile pe cale sexuală și infecția cu HIV", pages: "1425–1450", scope: ["Virusul imunodeficienței umane și sindromul imunodeficienței dobândite"], privateFile: "HIV.pdf" },

  { id: "law-01", bookId: "lawrence", chapter: "Cap. 1 — Evaluarea și managementul perioperator al pacientului chirurgical", pages: "1–12", scope: ["Evaluarea și managementul perioperator"], privateFile: "Lawr. Cap 1. Eval.pdf" },
  { id: "law-04", bookId: "lawrence", chapter: "Cap. 4 — Sângerările chirurgicale", pages: "39–45", scope: ["Tulburări ale hemostazei", "Stări de hipercoagulabilitate", "Terapia cu produse sanguine la pacientul chirurgical"], privateFile: "Lawr. Cap 4. Sangerari.pdf" },
  { id: "law-08", bookId: "lawrence", chapter: "Cap. 8 — Infecțiile chirurgicale", pages: "75–84", scope: ["Infecțiile chirurgicale"], privateFile: "Lawr. Cap 8. Infectii chx.pdf" },
  { id: "law-09", bookId: "lawrence", chapter: "Cap. 9 — Traumatologie", pages: "87–106", scope: ["Traumatologie"], privateFile: "Lawr. Cap 9. Traum.pdf" },
  { id: "law-10", bookId: "lawrence", chapter: "Cap. 10 — Arsuri", pages: "108–123", scope: ["Arsuri"], privateFile: "Lawr. Cap 10. Arsuri.pdf" },
  { id: "law-11", bookId: "lawrence", chapter: "Cap. 11 — Herniile peretelui abdominal", pages: "125–138", scope: ["Herniile peretelui abdominal"], privateFile: "Lawr. Cap 11. Hernii.pdf" },
  { id: "law-12", bookId: "lawrence", chapter: "Cap. 12 — Esofagul", pages: "140–164", scope: ["Anatomia esofagului · 140–142", "Carcinomul esofagian · 151–156", "Perforația esofagiană · 156–157", "Herniile hiatale · 157–158", "Tulburări ale motilității esofagiene · 158–161", "Leziuni esofagiene benigne · 161–162", "Ingestia de corpi străini · 162", "Ingestia substanțelor caustice · 162–164"], privateFile: "Lawr. Cap 12. Esofagul.pdf" },
  { id: "law-13", bookId: "lawrence", chapter: "Cap. 13 — Stomacul și duodenul", pages: "167–191", scope: ["Anatomie · 167–168", "Afecțiuni gastrice maligne · 172–174", "Afecțiuni duodenale maligne · 179–180", "Complicații postgastrectomie · 180–182", "Tratamentul chirurgical al obezității · 182–191"], privateFile: "Lawr. Cap 13. Stomac Si Duoden.pdf" },
  { id: "law-14", bookId: "lawrence", chapter: "Cap. 14 — Intestinul subțire și apendicele", pages: "193–214", scope: ["Ocluzia intestinului subțire · 193–199, până la «Boala Crohn a intestinului subțire»", "Ischemia mezenterică acută · 204–206", "Tumorile intestinului subțire · 206–209", "Anomalii congenitale · 209–211", "Bolile apendicelui · 211–214"], privateFile: "Lawr. Cap 14. Is - appy.pdf" },
  { id: "law-15", bookId: "lawrence", chapter: "Cap. 15 — Colon, rect și anus", pages: "216–240", scope: ["Anatomie · 216–219", "Afecțiuni benigne colonice · 222–225", "Ocluzia intestinului gros · 228–229", "Volvulus de colon · 229–230", "Pseudo-ocluzia acută a colonului · 230", "Polipii și cancerul colo-rectal · 230–235", "Canalul anal și rectul · 235–239", "Infecțiile cu transmitere sexuală · 239–240"], privateFile: "Lawr. Cap 15. Colon Rect Anus.pdf" },
  { id: "law-16", bookId: "lawrence", chapter: "Cap. 16 — Căile biliare", pages: "242–255", scope: ["Căile biliare"], privateFile: "Lawr. Cap 16. CB.pdf" },
  { id: "law-17", bookId: "lawrence", chapter: "Cap. 17 — Pancreasul", pages: "257–275", scope: ["Pancreasul"], privateFile: "Lawr. Cap 17. Pancreas.pdf" },
  { id: "law-20", bookId: "lawrence", chapter: "Cap. 20 — Ficatul și splina", pages: "317–342", scope: ["Anatomia și fiziologia ficatului · 317", "Leziunile hepatice traumatice · 317–319", "Tumorile hepatice, chisturile și abcesele hepatice · 319–324", "Anatomia și fiziologia splinei · 333–335", "Anomaliile splinei · 335–337", "Afecțiunile chirurgicale ale splinei · 337–341", "Consecințe și complicații după splenectomie · 341–342"], privateFile: "Lawr. Cap 20. Ficat Splina.pdf" },
  { id: "law-26", bookId: "lawrence", chapter: "Cap. 26 — Bolile sistemului vascular", pages: "520–541", scope: ["Boala arterială periferică · 520–527", "Bolile venelor · 534–541"], privateFile: "Lawr. Cap 26. Vascular.pdf" },
  { id: "law-27", bookId: "lawrence", chapter: "Cap. 27 — Otorinolaringologia: bolile capului și gâtului", pages: "548–583", scope: ["Bolile capului și gâtului"], privateFile: "Lawr. Cap 27. ORL.pdf" },
  { id: "law-28", bookId: "lawrence", chapter: "Cap. 28 — Chirurgie ortopedică: bolile sistemului musculoscheletal", pages: "585–633", scope: ["Bolile sistemului musculoscheletal"], privateFile: "Lawr. Cap 28. Orto.pdf" },
  { id: "law-29", bookId: "lawrence", chapter: "Cap. 29 — Urologie: afecțiunile aparatului uro-genital", pages: "635–674", scope: ["Afecțiunile aparatului uro-genital"], privateFile: "Lawr. Cap 29. Uro.pdf" },

  { id: "sin-09", bookId: "sinopsis", chapter: "Cap. 9 — Dermatologie", pages: "196–209", scope: ["Dermatologie"], privateFile: "Sinopsis. Cap 9. Dermato.pdf" },
  { id: "sin-10", bookId: "sinopsis", chapter: "Cap. 10 — Pediatrie", pages: "212–243", scope: ["Pediatrie"], privateFile: "Sinopsis. Cap 10. Pedi.pdf" },
  { id: "sin-12", bookId: "sinopsis", chapter: "Cap. 12 — Afecțiuni ginecologice și mamare", pages: "273–292", scope: ["Afecțiuni ginecologice și mamare"], privateFile: "Sinopsis. Cap 12. Gineco.pdf" },
  { id: "sin-13", bookId: "sinopsis", chapter: "Cap. 13 — Obstetrică", pages: "295–316", scope: ["Obstetrică"], privateFile: "Sinopsis. Cap 13. Obstetrica.pdf" },
  { id: "sin-14", bookId: "sinopsis", chapter: "Cap. 14 — Tulburările psihice", pages: "319–330", scope: ["Tulburările psihice"], privateFile: "Sinopsis. Cap 14. Psihi.pdf" },
  { id: "sin-15", bookId: "sinopsis", chapter: "Cap. 15 — Epidemiologie și etică", pages: "333–338", scope: ["Epidemiologie și etică"], privateFile: "Sinopsis. Cap 15. Etica.pdf" },
];

export const examProgramSource = {
  title: "Tematica și bibliografia pentru concursul de rezidențiat — Domeniul Medicină",
  session: "Noiembrie 2026",
  file: "rezidentiat-M-2026.pdf",
  scopeRule:
    "Trimiterile la alte capitole, pagini, cadrane și figuri din textul tratatelor nu fac parte din tematică; întrebările nu se formulează din acestea.",
};

export const errataSource = {
  title: "Precizări în legătură cu terminologia folosită în manualele pentru examenul de admitere în rezidențiat — Kumar: Medicină clinică, Volumul I",
  file: "20211121-erata-23aug2021.pdf",
  year: 2021,
  status:
    "Errata furnizată este datată 2021; nu este prezentată ca errata oficială pentru sesiunea 2026.",
};

export const errataByChapter: Record<
  string,
  { bookPages: string; errataPdfPages: string }
> = {
  "kum-08": { bookPages: "152–153, 156–157, 162–163, 167", errataPdfPages: "1" },
  "kum-09": { bookPages: "173, 176–177, 179, 181–183, 185–190, 196–202", errataPdfPages: "1–3" },
  "kum-16": { bookPages: "328–330, 334–335, 353–354", errataPdfPages: "3–4" },
  "kum-18": { bookPages: "440–441, 444, 446, 452, 457–459", errataPdfPages: "4–5" },
  "kum-21": { bookPages: "614–615", errataPdfPages: "5" },
  "kum-23": { bookPages: "705, 707", errataPdfPages: "5" },
  "kum-26": { bookPages: "838, 841, 847", errataPdfPages: "5" },
  "kum-28": { bookPages: "980", errataPdfPages: "5" },
  "kum-29": { bookPages: "1013–1014", errataPdfPages: "5" },
  "kum-30": { bookPages: "1045, 1056, 1059–1106", errataPdfPages: "5–7" },
  "kum-31": { bookPages: "1136–1137, 1143", errataPdfPages: "7" },
  "kum-32": { bookPages: "1199, 1201, 1205", errataPdfPages: "7" },
  "kum-34": { bookPages: "1276–1278, 1293, 1299, 1301", errataPdfPages: "7" },
  "kum-36": { bookPages: "1361, 1363", errataPdfPages: "7" },
  "kum-37": { bookPages: "1444, 1447", errataPdfPages: "7" },
  "law-04": { bookPages: "44", errataPdfPages: "8" },
  "law-08": { bookPages: "79", errataPdfPages: "8" },
  "law-09": { bookPages: "88, 90–91, 100, 103", errataPdfPages: "8" },
  "law-11": { bookPages: "125, 129", errataPdfPages: "8" },
  "law-12": { bookPages: "160", errataPdfPages: "8" },
  "law-13": { bookPages: "180–181, 185", errataPdfPages: "8" },
  "law-14": { bookPages: "195", errataPdfPages: "8" },
  "law-17": { bookPages: "261–262, 273–274", errataPdfPages: "8–9" },
  "law-20": { bookPages: "322", errataPdfPages: "9" },
  "law-26": { bookPages: "520", errataPdfPages: "9" },
  "law-27": { bookPages: "557, 559, 574", errataPdfPages: "9" },
  "law-28": { bookPages: "597", errataPdfPages: "9" },
  "sin-09": { bookPages: "204", errataPdfPages: "10" },
  "sin-10": { bookPages: "218–243", errataPdfPages: "10–11" },
  "sin-12": { bookPages: "273, 279", errataPdfPages: "11" },
  "sin-13": { bookPages: "313", errataPdfPages: "11" },
  "sin-14": { bookPages: "320–321", errataPdfPages: "11" },
  "sin-15": { bookPages: "337", errataPdfPages: "11" },
};
