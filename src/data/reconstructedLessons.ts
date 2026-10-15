import type { RomanianLesson, Bilingual } from "./romanianLessons";
import { reconstructedSepsisLesson } from "./reconstructedSepsis";

const b = (ro: string, fr: string): Bilingual => ({ ro, fr });
const part = (
  id: string,
  title: Bilingual,
  pages: string,
  pdfPages: string,
  ro: string,
  fr: string,
  expressRo: string,
  expressFr: string,
) => ({
  id,
  title,
  pages,
  sourcePdfPages: pdfPages,
  text: b(ro, fr),
  express: b(expressRo, expressFr),
});

const lesson = (
  chapterId: string,
  title: Bilingual,
  sections: RomanianLesson["sections"],
): RomanianLesson => ({
  id: `norya-rebuild-${chapterId}-v1`,
  version: "1.0.0",
  updatedOn: "2026-10-11",
  verification: "needs-review",
  coverage: "partial",
  chapterId,
  title,
  status:
    "Reconstrucție Norya distinctă, ordonnée selon le passage exigible du manuel complet. Les portions encore non transcrites sont signalées dans la cartographie documentaire; relecture médicale humaine non effectuée.",
  sections,
  questions: [],
});

const question = (
  id: string,
  sectionId: string,
  sectionIndex: number,
  pages: string,
  prompt: Bilingual,
  choices: Bilingual[],
  answer: number,
  explanation: Bilingual,
) => ({ id, sectionId, sectionIndex, pages, prompt, choices, answer, explanation });

export const reconstructedLessons: RomanianLesson[] = [
  reconstructedSepsisLesson,
  lesson(
    "kum-09",
    b("Echilibrul hidro-electrolitic și acido-bazic", "Équilibre hydro-électrolytique et acido-basique"),
    [
      part(
        "kum-08-rebuild-clinical-assessment",
        b("Evaluarea clinică: anamneză, examen și primele investigații", "Évaluation clinique : anamnèse, examen et premiers examens"),
        "151–153",
        "174–176",
        "Începe prin a preciza debutul, durata și evoluția simptomelor, apoi caută localizarea infecției: tuse, spută și dispnee; disurie ori durere în flancuri; cefalee și meningism; durere abdominală, icter, leziuni cutanate dureroase. Notează febra, frisoanele, rigiditatea, vărsăturile și confuzia. Antecedentele care schimbă riscul includ imunodepresia, asplenia, HIV, sepsis anterior, tratamentul imunosupresor sau antibiotic recent, contactul cu servicii medicale, microorganisme rezistente cunoscute și călătoriile.",
        "Précisez début, durée et évolution, puis recherchez un foyer : toux, expectoration et dyspnée ; dysurie ou douleur lombaire ; céphalée et méningisme ; douleur abdominale, ictère ou lésions cutanées douloureuses. Relevez fièvre, frissons, vomissements et confusion. Les antécédents modifiant le risque comprennent immunodépression, asplénie, VIH, sepsis antérieur, traitements immunosuppresseurs ou antibiotiques récents, contacts avec les soins, résistances connues et voyages.",
        "Anamneză orientată spre focar + vulnerabilități; examen complet dacă sursa nu este evidentă.",
        "Anamnèse orientée vers le foyer et les vulnérabilités ; examen complet si le foyer n’est pas évident.",
      ),
      part(
        "kum-08-rebuild-sepsis-definition",
        b("Definiția Sepsis-3 și răspunsul gazdei", "Définition Sepsis-3 et réponse de l’hôte"),
        "154–155",
        "177–178",
        "Sepsisul este disfuncția de organ amenințătoare de viață produsă de răspunsul dereglat al gazdei la infecție; o infecție localizată nu este suficientă. SIRS nu mai definește sepsisul în consensul Sepsis-3. Componentele microbiene (PAMP) activează imunitatea înnăscută prin receptori de recunoaștere, cu eliberare de citokine precum TNF-α, IL‑1 și IL‑6, proteine de fază acută și mediatori procoagulanți. Imunotromboza poate limita agentul local, dar activarea difuză a inflamației și coagulării alterează microcirculația, crește permeabilitatea vasculară și contribuie la disfuncția multiplă de organ.",
        "Le sepsis est une défaillance d’organe menaçant la vie, due à une réponse dérégulée de l’hôte à l’infection ; une infection localisée ne suffit pas. Le SIRS ne définit plus le sepsis selon Sepsis-3. Les composants microbiens (PAMP) activent l’immunité innée par des récepteurs de reconnaissance, avec libération de cytokines (TNF-α, IL‑1, IL‑6), de protéines de phase aiguë et de médiateurs procoagulants. L’immunothrombose peut contenir localement l’agent, mais l’activation diffuse de l’inflammation et de la coagulation altère la microcirculation, augmente la perméabilité vasculaire et contribue aux défaillances multiviscérales.",
        "Infecție + răspuns dereglat al gazdei + disfuncție de organ; SIRS nu mai definește sepsisul.",
        "Infection + réponse dérégulée de l’hôte + défaillance d’organe ; le SIRS ne définit plus le sepsis.",
      ),
      part(
        "kum-08-rebuild-organ-dysfunction",
        b("Disfuncția de organ, SOFA și șocul septic", "Défaillance d’organe, SOFA et choc septique"),
        "154–155",
        "177–178",
        "Disfuncțiile sunt interdependente: vasoplegia reduce rezistența vasculară, extravazarea produce edem și scade livrarea oxigenului, iar afectarea cardiacă, pulmonară, renală, hepatică, neurologică și hematologică se poate amplifica reciproc. În context de infecție, o creștere acută SOFA de cel puțin 2 puncte identifică disfuncția relevantă; scorul examinează respirația, coagularea, ficatul, circulația, starea neurologică și rinichii. qSOFA este pozitiv la cel puțin două criterii: Glasgow <15, frecvență respiratorie ≥22/min și presiune sistolică ≤100 mmHg. qSOFA și NEWS2 sunt instrumente de risc, nu teste care confirmă sau exclud singure sepsisul. Șocul septic Sepsis-3 presupune vasopresor pentru PAM ≥65 mmHg și lactat >2 mmol/L, în ciuda repleției volemice adecvate.",
        "Les défaillances sont interdépendantes : la vasoplégie réduit les résistances vasculaires, l’extravasation crée un œdème et diminue l’apport d’oxygène, tandis que les atteintes cardiaque, pulmonaire, rénale, hépatique, neurologique et hématologique peuvent s’aggraver mutuellement. Dans un contexte infectieux, une hausse aiguë du SOFA d’au moins 2 points identifie la défaillance pertinente ; le score examine respiration, coagulation, foie, circulation, neurologie et reins. qSOFA positif : au moins deux critères — Glasgow <15, fréquence respiratoire ≥22/min, pression systolique ≤100 mmHg. qSOFA et NEWS2 évaluent le risque, sans confirmer ni exclure seuls le sepsis. Le choc septique Sepsis-3 associe vasopresseur pour PAM ≥65 mmHg et lactate >2 mmol/L malgré un remplissage adéquat.",
        "SOFA acut ≥2 în context infecțios; qSOFA ≥2/3 = risc; șoc: vasopresor + PAM ≥65 și lactat >2 după repleție.",
        "SOFA aigu ≥2 en contexte infectieux ; qSOFA ≥2/3 = risque ; choc : vasopresseur + PAM ≥65 et lactate >2 après remplissage.",
      ),
      part(
        "kum-08-rebuild-risk-and-special-hosts",
        b("Recunoașterea, grupele vulnerabile și tabloul clinic", "Reconnaissance, groupes vulnérables et tableau clinique"),
        "154–156",
        "177–179",
        "Riscul depinde de agent, încărcătura microbiană, focar și răspunsul gazdei. Sunt vulnerabili vârstnicii (>65 ani), nou-născuții, persoanele cu sepsis anterior, HIV, asplenie, ciroză, boală autoimună ori tratament imunosupresor. În spital, urmărește deteriorarea funcțională și semnele vitale în dinamică. Infecția poate evolua de la manifestări locale la confuzie, oligurie, peteșii, hipotensiune și insuficiență de organ; nu există un semn clinic patognomonic, iar imunodeprimații pot avea inflamație puțin evidentă. La întoarcerea din călătorii, istoricul de destinație și expuneri poate orienta către infecții tropicale; la consumatorii de droguri injectabile, caută abcese, tromboflebită, endocardită și focare metastatice; la neutropenici și persoane imobilizate, ține cont de expunerile și dispozitivele specifice.",
        "Le risque dépend de l’agent, de la charge microbienne, du foyer et de la réponse de l’hôte. Sont vulnérables les personnes âgées (>65 ans), nouveau-nés, patients ayant eu un sepsis, personnes avec VIH, asplénie, cirrhose, maladie auto-immune ou traitement immunosuppresseur. À l’hôpital, suivez la détérioration fonctionnelle et l’évolution des constantes. L’infection peut passer de signes locaux à confusion, oligurie, pétéchies, hypotension et défaillance d’organe ; aucun signe n’est pathognomonique et l’inflammation peut être discrète chez l’immunodéprimé. Après un voyage, destination et expositions orientent la recherche d’infections tropicales ; chez les usagers de drogues injectables, recherchez abcès, thrombophlébite, endocardite et foyers métastatiques ; chez les neutropéniques et patients immobilisés, tenez compte des expositions et dispositifs spécifiques.",
        "Evoluția și semnele pot fi nespecifice; vulnerabilitatea gazdei și contextul expunerii schimbă investigațiile.",
        "Évolution et signes parfois non spécifiques ; vulnérabilité de l’hôte et expositions guident les examens.",
      ),
      part(
        "kum-08-rebuild-initial-treatment",
        b("Primele măsuri, resuscitare și controlul sursei", "Mesures initiales, réanimation et contrôle du foyer"),
        "157–158",
        "180–181",
        "Sepsisul este o urgență. Pachetul Sepsis Six din ediția examinată grupează oxigen pentru SpO₂ >94%, hemoculturi, antibiotic empiric cu spectru larg, lichide rapide, lactat și monitorizarea orară a diurezei/bilanțului. Tabelul SSC al ediției recomandă cristaloide 30 ml/kg în primele 3 ore, evaluare hemodinamică dinamică și PAM 65 mmHg; textul avertizează că bolusul mare nu este benefic tuturor și că resuscitarea trebuie reevaluată. Antibioterapia empirică este indicată prompt în sursa de examen; aceasta nu înlocuiește alegerea individuală și ghidurile aplicabile pacientului. Identifică anatomic focarul și asigură controlul lui: îndepărtarea cateterului infectat după obținerea unui acces alternativ, decompresia obstrucției biliare/urinare, drenarea abceselor sau colecțiilor, lavajul/debridarea infecției articulare și debridarea țesutului necrotic.",
        "Le sepsis est une urgence. Le Sepsis Six de l’édition regroupe oxygène pour SpO₂ >94 %, hémocultures, antibiotique empirique large, liquides rapides, lactate et suivi horaire de la diurèse/bilan. Le tableau SSC de l’édition recommande cristalloïdes 30 ml/kg dans les trois premières heures, évaluation hémodynamique dynamique et PAM 65 mmHg ; le texte précise que les grands bolus ne conviennent pas à tous et que la réévaluation est nécessaire. L’antibiothérapie empirique doit être rapide selon la source d’examen, sans remplacer le choix individualisé ni les recommandations applicables au patient. Localisez le foyer et contrôlez-le : retrait d’un cathéter infecté après obtention d’un autre accès, décompression d’une obstruction biliaire/urinaire, drainage d’abcès ou collections, lavage/débridement d’une infection articulaire et débridement des tissus nécrosés.",
        "Pachetul de măsuri și țintele sunt cele ale ediției 2021; volumul și conduita cer reevaluare individuală și controlul sursei.",
        "Mesures et cibles de l’édition 2021 ; volume et conduite nécessitent réévaluation individualisée et contrôle du foyer.",
      ),
      part(
        "kum-08-rebuild-microbiology",
        b("Recoltări, microbiologie și diagnostic molecular", "Prélèvements, microbiologie et diagnostic moléculaire"),
        "158–159",
        "181–182",
        "Recoltează hemoculturi și probe din focarul suspect înainte de antibiotic atunci când aceasta nu întârzie tratamentul urgent; sursa indică la adult minimum 5 ml în flacon aerob și anaerob. Excepția explicită este suspiciunea de boală meningococică, când antibioticul nu trebuie amânat pentru recoltare. Urina, lichidul cefalorahidian, puroiul, scaunul și vârful unui dispozitiv se aleg după tabloul clinic. Culturile identifică agentul și susceptibilitatea, dar pot deveni negative după antibiotic și rezultatele complete întârzie. PCR 16S poate identifica ADN bacterian în probe tisulare după antibioterapie, fără a furniza susceptibilitatea; MALDI‑TOF identifică proteine/specii rapid și poate detecta anumite mecanisme de rezistență. Integrează rezultatul cu localizarea clinică și imagistica, nu interpreta o colonizare izolată ca sursă dovedită.",
        "Prélevez hémocultures et échantillons du foyer suspect avant antibiotique si cela ne retarde pas le traitement urgent ; la source indique au moins 5 ml par flacon aérobie et anaérobie chez l’adulte. Exception explicite : suspicion de maladie méningococcique, où l’antibiotique ne doit pas attendre le prélèvement. Urine, liquide céphalorachidien, pus, selles et extrémité de dispositif sont choisis selon le tableau clinique. Les cultures identifient agent et sensibilité, mais peuvent être négatives après antibiotiques et les résultats complets tardent. La PCR 16S peut identifier l’ADN bactérien d’un tissu après antibiothérapie sans donner la sensibilité ; MALDI‑TOF identifie rapidement protéines/espèces et certains mécanismes de résistance. Confrontez les résultats au foyer clinique et à l’imagerie ; une colonisation isolée ne prouve pas la source.",
        "Recoltare fără întârziere nejustificată; cultură = susceptibilitate, PCR 16S = identificare fără antibiogramă.",
        "Prélèvement sans retard injustifié ; culture = sensibilité, PCR 16S = identification sans antibiogramme.",
      ),
      part(
        "kum-08-rebuild-antibiotic-stewardship",
        b("Alegerea, reevaluarea și administrarea antibioticelor", "Choix, réévaluation et administration des antibiotiques"),
        "159–161",
        "182–184",
        "Alege empiric conform focarului, severității, politicii locale și istoricului microbiologic. Verifică calea, frecvența, durata, toxicitatea, necesitatea monitorizării concentrațiilor și ajustarea în insuficiență renală/hepatică; documentează alternativa în alergie. La reevaluarea de la aproximativ 72 de ore, ediția descrie cinci decizii: oprire dacă infecția nu se susține; de-escaladare și trecere orală când este sigur; modificare după focar/rezistență; continuare IV pentru infecții complicate; sau tratament parenteral ambulatoriu (OPAT) la pacienți atent selectați. OPAT cere stabilitate clinică, aderență, acces la supraveghere și un serviciu organizat. Istoricul de reacție la penicilină trebuie caracterizat după manifestare și moment; eticheta vagă de alergie poate elimina inutil medicamente de primă linie. Nu extrapola o schemă empirică britanică la altă rezistență locală.",
        "Choisissez l’antibiothérapie empirique selon foyer, gravité, politique locale et antécédents microbiologiques. Vérifiez voie, fréquence, durée, toxicité, surveillance des concentrations et adaptation en insuffisance rénale/hépatique ; documentez une alternative en cas d’allergie. À la réévaluation vers 72 heures, l’édition décrit cinq décisions : arrêter si l’infection n’est pas étayée ; désescalader et passer par voie orale si sûr ; modifier selon foyer/résistance ; poursuivre IV pour infection compliquée ; ou traitement parentéral ambulatoire (OPAT) chez des patients sélectionnés. L’OPAT exige stabilité clinique, observance, accès au suivi et service organisé. Caractérisez une réaction à la pénicilline par ses manifestations et son délai ; une étiquette vague d’allergie peut écarter à tort un traitement de première ligne. N’extrapolez pas un schéma empirique britannique à un autre profil local de résistances.",
        "Réévaluation à 72 h : arrêt, oral/désescalade, changement, poursuite IV ou OPAT selon documentation et stabilité.",
        "Réévaluation vers 72 h : arrêt, voie orale/désescalade, changement, poursuite IV ou OPAT selon documentation et stabilité.",
      ),
      part(
        "kum-08-rebuild-antimicrobial-classes",
        b("Clase antimicrobiene, spectru și organisme rezistente", "Classes antimicrobiennes, spectres et organismes résistants"),
        "161–168",
        "184–191",
        "Partea finală a capitolului ordonează antibioticele utilizate frecvent, profilaxia și tratamentul organismelor multirezistente. Învață fiecare clasă prin țintă, spectru util, căi de rezistență, toxicitate și monitorizare, nu printr-o listă de nume. Selecția se leagă de focar și antibiogramă; ESBL poate schimba alegerea beta-lactaminei, iar rezistența la carbapeneme necesită interpretarea mecanismului și a susceptibilității. Distincțiile importante includ activitatea diferită în interiorul claselor, acoperirea MRSA/VRE/Gram-negative și toxicitățile renale, hematologice ori cardiace. Erratumul furnizat corectează mențiunea privind ceftarolina și ceftobiprolul ca excepții anti-MRSA de generația a cincea, dar nu este demonstrată aplicabilitatea lui la exemplarul/concursul 2026. Tabelul complet de doze de la p.162, regimurile de profilaxie și toate detaliile de spectru/rezistență nu sunt încă transpuse: secțiunea rămâne parțială și nu este un ghid de prescriere.",
        "La fin du chapitre ordonne les antibiotiques usuels, la prophylaxie et le traitement des organismes multirésistants. Apprenez chaque classe par sa cible, son spectre utile, ses résistances, sa toxicité et sa surveillance, non par une liste de noms. Le choix dépend du foyer et de l’antibiogramme ; une ESBL peut modifier le choix de bêta-lactamine, et une résistance aux carbapénèmes exige d’interpréter mécanisme et sensibilité. Les distinctions importantes portent sur l’activité au sein des classes, la couverture MRSA/VRE/Gram négatifs et les toxicités rénales, hématologiques ou cardiaques. Le document correctif fourni précise l’activité anti-MRSA de ceftaroline et ceftobiprole, céphalosporines de cinquième génération, sans que son applicabilité à l’exemplaire/concours 2026 soit établie. Le tableau complet de doses p.162, les prophylaxies et tous les détails de spectre/résistance ne sont pas encore transposés : section partielle, non destinée à prescrire.",
        "Reconstrucție incompletă: tabelul de doze, profilaxia și spectrele complete rămân în lucru; erratum neconfirmat.",
        "Reconstruction incomplète : doses, prophylaxie et spectres complets restent à traiter ; erratum non confirmé.",
      ),
    ],
  ),
  lesson(
    "kum-09",
    b("Echilibrul hidro-electrolitic și acido-bazic", "Équilibre hydro-électrolytique et acido-basique"),
    [
      part(
        "kum-09-rebuild-compartments",
        b("Apa totală, compartimente și osmolalitate", "Eau totale, compartiments et osmolalité"),
        "172–173",
        "195–196",
        "Apa totală reprezintă aproximativ 50–60% din masa slabă la bărbat și 40–50% la femeie; exemplul manualului pentru un bărbat de 70 kg este circa 42 L. Lichidul intracelular este aproximativ 28 L, interstițiul 9,4 L, iar plasma 4,6 L. Membranele celulare separă spațiul intracelular de cel extracelular; capilarele separă plasma de interstițiu. Na⁺ predomină extracelular, K⁺ intracelular; ureea traversează compartimentele și este osmotic inactivă pentru distribuția apei. Apa se deplasează către compartimentul cu particule osmotic active. De aceea, apa liberă se distribuie în toate compartimentele, soluția salină izotonă rămâne predominant extracelular, iar coloidul susține inițial volumul intravascular prin presiunea oncotică.",
        "L’eau totale représente environ 50–60 % de la masse maigre chez l’homme et 40–50 % chez la femme ; l’exemple du manuel pour un homme de 70 kg est d’environ 42 L. Le compartiment intracellulaire représente environ 28 L, l’interstitium 9,4 L et le plasma 4,6 L. Les membranes cellulaires séparent l’intracellulaire de l’extracellulaire ; les capillaires séparent plasma et interstitium. Na⁺ prédomine à l’extérieur et K⁺ à l’intérieur des cellules ; l’urée traverse les compartiments et est osmotiquement inactive pour la distribution de l’eau. L’eau se déplace vers les particules osmotiques actives. L’eau libre se distribue donc dans tous les compartiments, le sérum salé isotonique reste surtout extracellulaire et le colloïde soutient initialement le volume intravasculaire par pression oncotique.",
        "42 L la 70 kg; intracelular 28 L, interstițial 9,4 L, plasmă 4,6 L; Na extracelular, K intracelular.",
        "42 L pour 70 kg ; intracellulaire 28 L, interstitiel 9,4 L, plasma 4,6 L ; Na extracellulaire, K intracellulaire.",
      ),
      part(
        "kum-09-rebuild-volume-control",
        b("Volumul extracelular și controlul renal al sodiului", "Volume extracellulaire et contrôle rénal du sodium"),
        "173–176",
        "196–199",
        "Cantitatea totală de sodiu corporal determină în principal volumul extracelular; concentrația plasmatică a sodiului reflectă în special raportul dintre cationii schimbabili și apa totală. Rinichiul adaptează excreția de sodiu la volumul arterial circulant efectiv (VASE), nu doar la volumul extracelular vizibil. Scăderea debitului cardiac ori vasodilatația arterială pot produce subumplere arterială chiar în prezența edemelor. Baroreceptori, sistem simpatic, renină–angiotensină–aldosteron, ADH și peptide natriuretice modifică filtrarea și reabsorbția tubulară. În nefron, aproximativ 60–70% din sodiul filtrat se reabsoarbe proximal, 20–25% în ansa Henle, circa 5% distal și 4% în ductele colectoare; segmentele distale reglează fin excreția, potasiul și acidul.",
        "La quantité totale de sodium corporel détermine principalement le volume extracellulaire ; la natrémie reflète surtout le rapport entre cations échangeables et eau totale. Le rein adapte l’excrétion sodée au volume artériel circulant efficace (VACE), pas seulement au volume extracellulaire visible. Baisse du débit cardiaque ou vasodilatation artérielle peuvent créer une sous-remplissage artériel malgré des œdèmes. Barorécepteurs, système sympathique, rénine–angiotensine–aldostérone, ADH et peptides natriurétiques modifient filtration et réabsorption tubulaires. Dans le néphron, environ 60–70 % du sodium filtré est réabsorbé proximalement, 20–25 % dans l’anse, environ 5 % distalement et 4 % dans les canaux collecteurs ; les segments distaux règlent finement excrétion, potassium et acide.",
        "Cantitatea totală de Na controlează volumul extracelular; VASE controlează răspunsul renal și neurohormonal.",
        "Le sodium total règle le volume extracellulaire ; le VACE règle les réponses rénales et neurohormonales.",
      ),
      part(
        "kum-09-rebuild-edema-diuretics",
        b("Edemele, depleția volemică și diureticele", "Œdèmes, déplétion volémique et diurétiques"),
        "176–183",
        "199–206",
        "Edemul apare prin dezechilibrul presiunilor hidrostatice și oncotice, permeabilitate crescută, drenaj limfatic insuficient ori retenție renală de sare și apă. În insuficiență cardiacă, ciroză și hipoalbuminemie, VASE scăzut activează retenția neurohormonală chiar dacă lichidul extracelular este crescut. Depleția poate proveni din pierderi digestive, renale sau cutanate; sepsisul și ciroza pot mima hipovolemia prin vasodilatație și extravazare. Diureticele de ansă blochează NKCC2 și sunt cele mai potente; tiazidele blochează cotransportul Na–Cl distal și reduc excreția calciului; spironolactona/eplerenona antagonizează aldosteronul, iar amiloridul/triamterenul blochează ENaC; acetazolamida inhibă anhidraza carbonică; vaptanii blochează receptorii V2. Rezistența la diuretic cere verificarea absorbției, RFG și retenției de sodiu; combinațiile potențează diureza, dar pot provoca dezechilibre electrolitice severe.",
        "L’œdème résulte d’un déséquilibre des pressions hydrostatique/oncotique, d’une perméabilité accrue, d’un drainage lymphatique insuffisant ou d’une rétention rénale de sel et d’eau. Dans l’insuffisance cardiaque, la cirrhose et l’hypoalbuminémie, un VACE bas active la rétention neurohormonale malgré l’excès extracellulaire. La déplétion peut provenir de pertes digestives, rénales ou cutanées ; sepsis et cirrhose peuvent simuler l’hypovolémie par vasodilatation et fuite capillaire. Les diurétiques de l’anse bloquent NKCC2 et sont les plus puissants ; les thiazidiques bloquent le cotransport Na–Cl distal et réduisent l’excrétion calcique ; spironolactone/éplérénone antagonisent l’aldostérone, amiloride/triamtérène bloquent ENaC ; acétazolamide inhibe l’anhydrase carbonique ; vaptans bloquent V2. En cas de résistance, vérifiez absorption, DFG et rétention sodée ; les associations renforcent la diurèse mais peuvent provoquer de graves troubles électrolytiques.",
        "Edem ≠ volum circulant eficient; clasa diureticului corespunde segmentului tubular și efectelor sale.",
        "Œdème ≠ volume circulant efficace ; chaque classe diurétique cible un segment et a ses effets propres.",
      ),
      part(
        "kum-09-rebuild-sodium",
        b("Tulburările sodiului: hiponatremia și hipernatremia", "Troubles du sodium : hyponatrémie et hypernatrémie"),
        "183–187",
        "206–210",
        "Hiponatremia trebuie interpretată după osmolalitate și status volemic; diferențiază hipovolemia, euvolemia/SIADH și hipervolemia și verifică glicemia, funcția renală, tiroida, cortizolul, medicamentele și osmolaritatea urinară. Simptomele neurologice pot apărea la scădere rapidă; convulsiile și coma reprezintă urgență. Manualul descrie soluție salină 3% în hiponatremia simptomatică severă și subliniază monitorizarea frecventă a sodiului și evitarea corecției prea rapide: reperul său general este cel mult 8 mmol/L în 24 h și 18 mmol/L în 48 h, cu prudență suplimentară la alcoolism, ciroză, malnutriție și hipokaliemie. Hipernatremia indică de regulă deficit de apă; estimează cauza și accesul la apă, corectează deficitul treptat și tratează hipovolemia circulatorie înaintea apei libere. Valorile și regimurile exacte trebuie citite în tabelele sursă și nu folosite ca prescripție individuală.",
        "Interprétez l’hyponatrémie selon osmolalité et volémie ; distinguez hypovolémie, euvolémie/SIADH et hypervolémie, puis vérifiez glycémie, fonction rénale, thyroïde, cortisol, médicaments et osmolalité urinaire. Les symptômes neurologiques peuvent suivre une chute rapide ; convulsions et coma sont des urgences. Le manuel décrit le sérum salé à 3 % en cas de symptômes sévères et souligne surveillance fréquente de la natrémie et prévention d’une correction trop rapide : repère général de l’édition, au plus 8 mmol/L en 24 h et 18 mmol/L en 48 h, avec prudence accrue en cas d’alcoolisme, cirrhose, malnutrition ou hypokaliémie. L’hypernatrémie indique généralement un déficit en eau ; recherchez sa cause et l’accès à l’eau, corrigez progressivement et traitez l’hypovolémie circulatoire avant l’eau libre. Les valeurs et schémas exacts doivent être vérifiés dans les tableaux sources et ne sont pas une prescription individuelle.",
        "Hyponatremie: osmolalitate + volemie + simptomatologie; evită supracorecția. Hipernatremie: deficit de apă, corecție atentă.",
        "Hyponatrémie : osmolalité + volémie + symptômes ; éviter la surcorrection. Hypernatrémie : déficit en eau, correction prudente.",
      ),
      part(
        "kum-09-rebuild-potassium",
        b("Tulburările potasiului și urgența hiperkaliemiei", "Troubles du potassium et urgence hyperkaliémique"),
        "187–190",
        "210–213",
        "Hipokaliemia rezultă din pierderi digestive/renale, aport redus, redistribuire intracelulară sau exces mineralocorticoid. Potasiul urinar >20 mmol/zi orientează spre pierdere renală; <20 mmol/zi, spre aport redus ori pierdere extrarenală. Hipokaliemia severă (<2,5 mmol/L) poate provoca slăbiciune; verifică magneziul, ECG, medicamentele și echilibrul acido-bazic, deoarece deficitul de magneziu poate împiedica răspunsul la suplimentare. Hiperkaliemia poate reflecta insuficiență renală, medicamente care reduc excreția, deficit de aldosteron, acidoză, liză celulară sau pseudohiperkaliemie. Confirmă un rezultat neașteptat fără întârzierea tratamentului când există modificări ECG ori instabilitate. În forme severe, tratează separat protecția cardiacă, deplasarea temporară a K⁺ intracelular și eliminarea potasiului; ECG progresiv din manual leagă undele T ascuțite, prelungirea conducerii și lărgirea QRS de agravare.",
        "L’hypokaliémie provient de pertes digestives/rénales, apport réduit, transfert intracellulaire ou excès minéralocorticoïde. Une kaliurèse >20 mmol/j oriente vers une perte rénale ; <20 mmol/j, vers apport faible ou perte extrarénale. Une hypokaliémie sévère (<2,5 mmol/L) peut causer faiblesse ; vérifiez magnésium, ECG, médicaments et équilibre acido-basique, car l’hypomagnésémie peut empêcher la correction. L’hyperkaliémie peut refléter insuffisance rénale, médicaments réduisant l’excrétion, déficit d’aldostérone, acidose, lyse cellulaire ou pseudohyperkaliémie. Confirmez un résultat inattendu sans retarder le traitement si ECG anormal ou instabilité. Dans les formes sévères, distinguez protection cardiaque, transfert intracellulaire transitoire et élimination du potassium ; l’ECG du manuel relie ondes T pointues, ralentissement de conduction et élargissement du QRS à l’aggravation.",
        "Kaliurie și ECG orientează cauza și riscul; în hiperkaliemia severă, protejează cordul și elimină K⁺.",
        "Kaliurèse et ECG orientent cause et risque ; dans l’hyperkaliémie sévère, protéger le cœur et éliminer K⁺.",
      ),
      part(
        "kum-09-rebuild-acid-base",
        b("Echilibrul acido-bazic: tampoane, plămân și rinichi", "Équilibre acido-basique : tampons, poumon et rein"),
        "195–198",
        "218–221",
        "pH-ul sanguin normal este prezentat în manual la 7,38–7,42; la pH 7,40, [H⁺] este 40 nmol/L. Acidemia înseamnă pH scăzut, alcalemia pH crescut; acidoza/alcaloza denumesc procesele care produc schimbarea. Relația Henderson–Hasselbalch exprimă dependența pH-ului de bicarbonat și CO₂. Tampoanele chimice limitează variația imediată, plămânul ajustează PaCO₂, iar rinichiul reabsoarbe bicarbonatul filtrat și excretă încărcătura acidă zilnică. Proximalul reabsoarbe aproximativ 85–90% din bicarbonatul filtrat; excreția renală netă de acid are loc mai distal și folosește tamponul fosfat și amoniacul pentru a permite eliminarea H⁺ fără coborârea excesivă a pH-ului urinar.",
        "Le manuel situe le pH sanguin normal à 7,38–7,42 ; à pH 7,40, [H⁺] vaut 40 nmol/L. L’acidémie correspond à un pH bas et l’alcalémie à un pH haut ; acidose/alcalose désignent les processus responsables. Henderson–Hasselbalch exprime la dépendance du pH au bicarbonate et au CO₂. Les tampons limitent la variation immédiate, le poumon ajuste PaCO₂ et le rein réabsorbe le bicarbonate filtré et excrète la charge acide quotidienne. Le tubule proximal réabsorbe environ 85–90 % du bicarbonate filtré ; l’excrétion acide nette se fait plus distalement et utilise tampons phosphate et ammoniac pour éliminer H⁺ sans abaisser excessivement le pH urinaire.",
        "Tampoane → răspuns respirator → răspuns renal; proximalul reabsoarbe 85–90% din HCO₃⁻ filtrat.",
        "Tampons → réponse respiratoire → réponse rénale ; le proximal réabsorbe 85–90 % du HCO₃⁻ filtré.",
      ),
      part(
        "kum-09-rebuild-acid-base-disorders",
        b("Interpretarea gazometriei și tulburările acido-bazice", "Interprétation des gaz du sang et troubles acido-basiques"),
        "198–202",
        "221–225",
        "Interpretează sistematic pH-ul, PaCO₂ și HCO₃⁻: stabilește dacă predomină acidoza sau alcaloza, identifică procesul primar și verifică dacă răspunsul compensator este potrivit. Apoi calculează anion gap-ul pentru acidoza metabolică și caută cauze cu gap crescut sau normal; lactatul, cetoacizii, insuficiența renală, pierderea digestivă de bicarbonat și acidozele tubulare renale au mecanisme diferite. Alcaloza metabolică se organizează după depleția de clor/volum versus cauze mineralocorticoide; potasiul și clorul urinare pot orienta. Tulburările mixte sunt posibile, iar o valoare aparent normală a pH-ului nu exclude procese opuse concomitente. Algoritmii, nomograma și clasificarea exactă a cauzelor de pe paginile 199–202 trebuie consultate împreună cu gazometria și contextul pacientului.",
        "Interprétez systématiquement pH, PaCO₂ et HCO₃⁻ : déterminez acidose ou alcalose prédominante, identifiez le processus primaire et vérifiez l’adéquation de la compensation. Calculez ensuite le trou anionique en cas d’acidose métabolique et recherchez les causes à trou élevé ou normal ; lactate, cétoacides, insuffisance rénale, pertes digestives de bicarbonate et acidoses tubulaires ont des mécanismes différents. Classez l’alcalose métabolique selon déplétion en chlore/volume ou causes minéralocorticoïdes ; kaliurèse et chlorurie peuvent orienter. Des troubles mixtes sont possibles et un pH apparemment normal n’exclut pas deux processus opposés. Algorithmes, nomogramme et classement exact des causes pages 199–202 doivent être lus avec les gaz du sang et le contexte.",
        "pH → proces primar → compensare → anion gap → etiologie; caută întotdeauna tulburări mixte.",
        "pH → processus primaire → compensation → trou anionique → étiologie ; recherchez toujours des troubles mixtes.",
      ),
    ],
  ),
  lesson(
    "kum-10",
    b("Insuficiența respiratorie și sindromul de detresă respiratorie acută", "Insuffisance respiratoire et syndrome de détresse respiratoire aiguë"),
    [
      part(
        "kum-10-rebuild-critical-context",
        b("Pacientul critic și transportul oxigenului", "Patient critique et transport de l’oxygène"),
        "224",
        "247",
        "Pagina de început descrie evaluarea și suportul pacientului critic cu risc perioperator: vârsta, comorbiditățile, rezerva cardiorespiratorie limitată, trauma majoră și intervențiile extinse cresc nevoia de supraveghere. Oxigenarea, volumul circulant și presiunea arterială trebuie susținute prin evaluare repetată, iar creșterea artificială a debitului cardiac ori a transportului de oxigen peste limite nu garantează beneficiu. În stările cu debit redus și insuficiență cardiacă, terapia vasoactivă sau vasodilatatoare se discută numai după mecanismul hemodinamic; răspunsul la presarcină, postsarcină și toxicitate trebuie monitorizat. Această parte este contextul paginii 224, nu protocol de terapie intensivă actualizat.",
        "La page d’ouverture décrit l’évaluation et le soutien du patient critique à risque périopératoire : âge, comorbidités, réserve cardiorespiratoire limitée, traumatisme majeur et chirurgie étendue augmentent les besoins de surveillance. Oxygénation, volume circulant et pression artérielle exigent une réévaluation répétée ; augmenter artificiellement débit cardiaque ou transport d’oxygène au-delà des valeurs normales ne garantit pas un bénéfice. En bas débit et insuffisance cardiaque, traitements vasoactifs ou vasodilatateurs se discutent selon le mécanisme hémodynamique ; réponse à la précharge, postcharge et toxicité doivent être surveillées. Cette partie contextualise la page 224 et n’est pas un protocole actualisé de réanimation.",
        "P.224: susținere hemodinamică ghidată de răspuns și context; nu urmări supranormalizarea izolată.",
        "P.224 : soutien hémodynamique guidé par réponse et contexte ; ne pas viser une supranormalisation isolée.",
      ),
      part(
        "kum-10-rebuild-classification",
        b("Clasificare, etiologie și recunoașterea gravității", "Classification, étiologie et gravité"),
        "224–225",
        "247–248",
        "Insuficiența respiratorie apare când plămânul nu asigură schimbul gazos suficient ori pompa ventilatorie nu poate menține ventilația. Reperele practice din ediție sunt PaO₂ <8 kPa (60 mmHg) sau PaCO₂ >7 kPa (55 mmHg). Tipul I este hipoxemic, cu PaCO₂ normală/scăzută, de regulă prin șunt sau dezechilibru ventilație/perfuzie; cauzele includ pneumonie, edem pulmonar, embolie și fibroză. Tipul II asociază hipoxemie și hipercapnie când ventilația alveolară este insuficientă; BPOC, obstrucția, deformările toracice, slăbiciunea neuromusculară și deprimarea centrului respirator sunt exemple. Tahipneea, utilizarea musculaturii accesorii, tirajul, transpirația, imposibilitatea de a vorbi/sta culcat, confuzia, respirația paradoxală și epuizarea avertizează asupra deteriorării.",
        "L’insuffisance respiratoire survient si le poumon n’assure plus les échanges gazeux ou si la pompe ventilatoire ne maintient pas la ventilation. Les repères pratiques de l’édition sont PaO₂ <8 kPa (60 mmHg) ou PaCO₂ >7 kPa (55 mmHg). Le type I est hypoxémique, avec PaCO₂ normale/basse, souvent par shunt ou inadéquation ventilation/perfusion ; causes : pneumonie, œdème pulmonaire, embolie et fibrose. Le type II associe hypoxémie et hypercapnie lorsque la ventilation alvéolaire est insuffisante ; BPCO, obstruction, déformation thoracique, faiblesse neuromusculaire et dépression centrale en sont des exemples. Tachypnée, muscles accessoires, tirage, sueurs, impossibilité de parler/s’allonger, confusion, respiration paradoxale et épuisement annoncent l’aggravation.",
        "Tip I: hipoxemie fără hipercapnie; tip II: insuficiență de pompă și CO₂ crescut; evaluează efortul/conștiența.",
        "Type I : hypoxémie sans hypercapnie ; type II : défaillance de pompe avec CO₂ élevé ; évaluer effort et conscience.",
      ),
      part(
        "kum-10-rebuild-investigations-oxygen",
        b("Gazometrie, monitorizare și oxigenoterapie", "Gaz du sang, surveillance et oxygénothérapie"),
        "225–227",
        "248–250",
        "Gazometria ghidează oxigenul și cuantifică gravitatea; interpreteaz-o cu FiO₂, temperatură, vârstă, istoric și setările ventilatorului. Pulsoximetria este continuă, dar nu detectează retenția de CO₂ și poate fi inexactă în hipoperfuzie. Capacitatea vitală urmărește deteriorarea neuromusculară; FEV₁ poate ajuta în astm/BPOC. Capnografia confirmă poziția traheală, urmărește CO₂ end-tidal și poate semnala obstrucția ori deconectarea. Măștile și canulele cu performanță variabilă nu livrează o FiO₂ fixă; sistemele Venturi o controlează mai exact, utile când ținta trebuie dozată. Titulează oxigenul după context: corectarea hipoxemiei are prioritate, dar hiperoxia prelungită poate fi nocivă.",
        "Les gaz du sang guident l’oxygène et quantifient la gravité ; interprétez-les avec FiO₂, température, âge, antécédents et réglages du ventilateur. L’oxymétrie est continue mais ne détecte pas la rétention de CO₂ et peut être inexacte en hypoperfusion. La capacité vitale suit l’aggravation neuromusculaire ; le VEMS peut aider dans l’asthme/BPCO. La capnographie confirme la position trachéale, suit le CO₂ télé-expiratoire et peut signaler obstruction ou déconnexion. Masques et lunettes à performance variable ne délivrent pas une FiO₂ fixe ; Venturi la contrôle plus précisément lorsque le titrage est nécessaire. Adaptez l’oxygène au contexte : corriger l’hypoxémie est prioritaire, mais l’hyperoxie prolongée peut être nocive.",
        "SpO₂ normală sub O₂ nu exclude hipercapnia; gazometria și capnografia răspund la întrebări diferite.",
        "Une SpO₂ normale sous O₂ n’exclut pas l’hypercapnie ; gaz du sang et capnographie répondent à des questions différentes.",
      ),
      part(
        "kum-10-rebuild-support",
        b("Escaladarea suportului și ventilația mecanică", "Escalade du support et ventilation mécanique"),
        "226–230",
        "249–253",
        "Tratează cauza, permeabilitatea căii aeriene, secrețiile și edemul; escaladează dacă pacientul se deteriorează sau epuizează. Ediția descrie indicații precum detresă severă, FR >40/min, incapacitatea de a vorbi, confuzie, scăderea conștienței, PaCO₂ >8 kPa ori hipoxemie extremă persistentă; în bolile neuromusculare, capacitatea vitală ≤10 ml/kg este un reper de intervenție. Intubația pacientului critic poate precipita hipoxie, aritmii și colaps hemodinamic: preoxigenează, monitorizează și asigură personal/echipament experimentat. Ventilația controlată poate fi limitată de volum sau presiune; presiunea pozitivă reduce întoarcerea venoasă. PEEP recrutează alveole, dar poate reduce debitul cardiac. Volumul/ presiunea excesive și ciclarea repetată produc baro-/volutraumă, pneumotorax și leziune pulmonară indusă de ventilator.",
        "Traitez cause, perméabilité des voies aériennes, sécrétions et œdème ; escaladez si le patient s’aggrave ou s’épuise. L’édition décrit comme indications détresse sévère, FR >40/min, incapacité à parler, confusion, baisse de conscience, PaCO₂ >8 kPa ou hypoxémie extrême persistante ; dans les maladies neuromusculaires, capacité vitale ≤10 ml/kg est un repère d’intervention. L’intubation du patient critique peut provoquer hypoxie, arythmies et effondrement hémodynamique : préoxygéner, monitorer et mobiliser équipe/matériel expérimentés. La ventilation contrôlée peut être limitée en volume ou pression ; pression positive réduit le retour veineux. PEEP recrute les alvéoles mais peut réduire le débit cardiaque. Volumes/pressions excessifs et cycles répétés causent baro-/volutraumatisme, pneumothorax et lésion induite par le ventilateur.",
        "Escaladare clinică; PEEP ajută recrutarea dar poate afecta circulația; ventilația protectivă evită presiuni/volume excesive.",
        "Escalade clinique ; la PEEP recrute mais peut gêner la circulation ; ventilation protectrice contre volumes/pressions excessifs.",
      ),
      part(
        "kum-10-rebuild-modes-and-niv",
        b("Moduri de suport, VNI și sevraj", "Modes de support, VNI et sevrage"),
        "229–232",
        "252–255",
        "CPAP menține presiune pozitivă continuă la pacientul care respiră spontan; PSV amplifică inspirația declanșată de pacient; SIMV intercalează respirații obligatorii sincronizate cu respirația spontană. HFNO oferă debit nazal mare, iar ECMO veno-venoasă poate susține schimbul gazos în insuficiența refractară în centre specializate; ECCO₂-R elimină CO₂ la debite extracorporale mai mici, cu oxigenare mai limitată. VNI prin mască/cască este destinată pacientului conștient, cooperant, capabil să-și protejeze căile aeriene și să expectoreze. Indicațiile din tabel includ exacerbarea BPOC cu acidoză respiratorie, edem pulmonar cardiogen și anumite boli neuromusculare/perete toracic; alterarea conștienței, imposibilitatea protejării căii aeriene și chirurgia feței/căilor aeriene sunt contraindicații. Reevaluează prompt pentru a nu întârzia intubația în caz de eșec. Sevrajul se bazează pe stabilitatea cauzei, evaluarea schimbului gazos, mecanicii, forței și o tentativă monitorizată de respirație spontană.",
        "La CPAP maintient une pression positive continue pendant la respiration spontanée ; PSV amplifie l’inspiration déclenchée par le patient ; SIMV intercale des cycles obligatoires synchronisés et respiration spontanée. HFNO fournit un débit nasal élevé ; ECMO veino-veineuse peut soutenir les échanges en insuffisance réfractaire dans des centres spécialisés ; ECCO₂-R élimine le CO₂ à plus faible débit extracorporel, avec oxygénation moindre. La VNI par masque/casque s’adresse au patient conscient, coopérant, capable de protéger ses voies aériennes et d’expectorer. Le tableau cite exacerbation de BPCO avec acidose respiratoire, œdème pulmonaire cardiogénique et certaines maladies neuromusculaires/paroi thoracique ; altération de conscience, incapacité à protéger les voies aériennes et chirurgie faciale/ORL sont des contre-indications. Réévaluez rapidement pour ne pas retarder l’intubation en cas d’échec. Le sevrage dépend de la stabilité de la cause, des échanges gazeux, de la mécanique, de la force et d’un essai surveillé de respiration spontanée.",
        "Alege suportul după indicații și protecția căii aeriene; VNI eșuată nu trebuie să întârzie escaladarea.",
        "Choisir le support selon indication et protection des voies aériennes ; l’échec de VNI ne doit pas retarder l’escalade.",
      ),
      part(
        "kum-10-rebuild-ards",
        b("SDRA: criterii, severitate și tratament", "SDRA : critères, sévérité et traitement"),
        "232–233",
        "255–256",
        "SDRA este leziune pulmonară inflamatorie acută cu permeabilitate crescută, opacități bilaterale și hipoxemie; diagnosticul cere să nu existe o explicație cardiogenă suficientă pentru edem. Raportul PaO₂/FiO₂ se calculează cu FiO₂ exprimată ca fracție, iar criteriile Berlin din manual asociază PEEP ≥5 cmH₂O cu categorii ușoară, moderată și severă după praguri 300, 200 și 100 mmHg. Pagina tipărește intervalele într-o formă a cărei limită exactă la 200/100 necesită revizuire vizuală; nu memoriza o convenție inventată. CT-ul și radiografia ilustrate arată opacități bilaterale, consolidare dependentă și posibil mici revărsate. Tratamentul vizează cauza, suportul organelor și limitarea leziunii induse de ventilație: volume curente mici calculate la greutatea prezisă, presiuni controlate și PEEP adaptată; pronarea se ia în considerare în forme severe. Desenele radiologice sunt descrise, nu reproduse.",
        "Le SDRA est une lésion pulmonaire inflammatoire aiguë avec perméabilité accrue, opacités bilatérales et hypoxémie ; le diagnostic exige l’absence d’explication cardiogénique suffisante à l’œdème. Le rapport PaO₂/FiO₂ se calcule avec FiO₂ en fraction ; les critères de Berlin du manuel associent PEEP ≥5 cmH₂O à des catégories légère, modérée et sévère selon les seuils 300, 200 et 100 mmHg. Les intervalles imprimés rendent les bornes exactes à 200/100 incertaines sans revue visuelle ; n’inventez pas de convention à mémoriser. CT et radiographie illustrés montrent opacités bilatérales, condensation déclive et parfois petits épanchements. Le traitement vise la cause, le soutien des organes et la limitation des lésions induites par ventilation : petits volumes courants selon poids prédit, pressions contrôlées et PEEP adaptée ; décubitus ventral à discuter dans les formes sévères. Les images sont décrites, non reproduites.",
        "SDRA: opacités bilatérales + hypoxémie non cardiogénique; Berlin avec PEEP ≥5; bornes 200/100 à recontrôler.",
        "SDRA : opacités bilatérales + hypoxémie non cardiogénique ; Berlin avec PEEP ≥5 ; bornes 200/100 à revérifier.",
      ),
    ],
  ),
// Retire the superseded sepsis draft that was previously mislabeled as Kumar 9.
].filter(lesson => !lesson.sections.some(section => section.id === "kum-08-rebuild-clinical-assessment"));

const questionsByChapter: Record<string, RomanianLesson["questions"]> = {
  "kum-08": [
    question("kum-08-rebuild-q1", "kum-08-rebuild-sepsis-definition", 1, "154", b("Care este definiția Sepsis-3?", "Quelle est la définition Sepsis-3 ?"), [
      b("Infecție localizată cu febră", "Infection localisée avec fièvre"),
      b("Disfuncție de organ amenințătoare de viață prin răspuns dereglat la infecție", "Défaillance d’organe menaçant la vie due à une réponse dérégulée à l’infection"),
      b("Orice cultură pozitivă", "Toute culture positive"),
    ], 1, b("Definiția Sepsis-3 cere disfuncție de organ în contextul răspunsului dereglat al gazdei.", "Sepsis-3 requiert une défaillance d’organe dans le contexte d’une réponse dérégulée de l’hôte.")),
    question("kum-08-rebuild-q2", "kum-08-rebuild-organ-dysfunction", 2, "154–155", b("Ce asociere definește șocul septic în Sepsis-3 după repleție adecvată?", "Quelle association définit le choc septique Sepsis-3 après remplissage adéquat ?"), [
      b("Febră și tahicardie", "Fièvre et tachycardie"),
      b("Vasopresor pentru PAM ≥65 mmHg și lactat >2 mmol/L", "Vasopresseur pour PAM ≥65 mmHg et lactate >2 mmol/L"),
      b("qSOFA pozitiv izolat", "qSOFA positif isolé"),
    ], 1, b("Sunt necesare criteriile hemodinamic și metabolic în contextul sepsisului.", "Les critères hémodynamique et métabolique sont associés dans le contexte du sepsis.")),
    question("kum-08-rebuild-q3", "kum-08-rebuild-microbiology", 5, "158–159", b("Când se amână antibioticul pentru recoltarea hemoculturilor în suspiciunea meningococică?", "Quand retarder l’antibiotique pour prélever les hémocultures en cas de suspicion méningococcique ?"), [
      b("Se recoltează înainte în toate cazurile", "Toujours prélever avant"),
      b("Antibioticul nu se amână pentru recoltare", "Ne pas retarder l’antibiotique pour le prélèvement"),
      b("Se așteaptă rezultatul PCR", "Attendre le résultat PCR"),
    ], 1, b("Excepția din manual este suspiciunea de septicemie meningococică: tratamentul nu trebuie întârziat.", "L’exception du manuel est la suspicion de sepsis méningococcique : le traitement ne doit pas être retardé.")),
  ],
  "kum-09": [
    question("kum-09-rebuild-q1", "kum-09-rebuild-compartments", 0, "172", b("Care ion predomină în compartimentul intracelular?", "Quel ion prédomine dans le compartiment intracellulaire ?"), [
      b("Sodiu", "Sodium"),
      b("Potasiu", "Potassium"),
      b("Clor", "Chlore"),
    ], 1, b("K⁺ este principalul cation intracelular; Na⁺ predomină extracelular.", "K⁺ est le principal cation intracellulaire ; Na⁺ prédomine à l’extérieur.")),
    question("kum-09-rebuild-q2", "kum-09-rebuild-sodium", 3, "185–186", b("Care este plafonul general de corecție a natremiei cronice menționat în manual?", "Quelle limite générale de correction de la natrémie chronique le manuel mentionne-t-il ?"), [
      b("Cel mult 8 mmol/L în 24 h", "Au plus 8 mmol/L en 24 h"),
      b("20 mmol/L în 24 h", "20 mmol/L en 24 h"),
      b("Nu este necesară monitorizarea", "Aucune surveillance n’est nécessaire"),
    ], 0, b("Manualul avertizează asupra demielinizării osmotice la corecția prea rapidă.", "Le manuel avertit du risque de démyélinisation osmotique en cas de correction trop rapide.")),
    question("kum-09-rebuild-q3", "kum-09-rebuild-potassium", 4, "188–190", b("Ce indică o kaliurie >20 mmol/zi în evaluarea hipokaliemiei?", "Que suggère une kaliurèse >20 mmol/j dans l’évaluation d’une hypokaliémie ?"), [
      b("Pierdere renală de potasiu", "Perte rénale de potassium"),
      b("Pseudohiperkaliemie", "Pseudohyperkaliémie"),
      b("Aport suficient de potasiu", "Apport potassique suffisant"),
    ], 0, b("Pragul urinar din tabel orientează spre excreție renală crescută.", "Le seuil urinaire du tableau oriente vers une excrétion rénale accrue.")),
  ],
  "kum-10": [
    question("kum-10-rebuild-q1", "kum-10-rebuild-classification", 1, "224–225", b("Ce definește insuficiența respiratorie de tip II?", "Qu’est-ce qui définit l’insuffisance respiratoire de type II ?"), [
      b("Hipoxemie cu PaCO₂ normală sau scăzută", "Hypoxémie avec PaCO₂ normale ou basse"),
      b("Hipoxemie asociată cu PaCO₂ crescută", "Hypoxémie associée à une PaCO₂ élevée"),
      b("Numai hipoxemie la pulsoximetrie", "Hypoxémie isolée à l’oxymétrie"),
    ], 1, b("Tipul II este insuficiență ventilatorie, cu hipercapnie.", "Le type II est une défaillance ventilatoire avec hypercapnie.")),
    question("kum-10-rebuild-q2", "kum-10-rebuild-modes-and-niv", 4, "230–231", b("Ce profil este potrivit pentru VNI conform tabelului din manual?", "Quel profil convient à la VNI selon le tableau du manuel ?"), [
      b("Pacient inconștient, incapabil să-și protejeze calea aeriană", "Patient inconscient incapable de protéger ses voies aériennes"),
      b("Pacient conștient, cooperant, cu protecția căii aeriene păstrată", "Patient conscient, coopérant, protégeant ses voies aériennes"),
      b("Orice insuficiență respiratorie fără reevaluare", "Toute insuffisance respiratoire sans réévaluation"),
    ], 1, b("VNI necesită cooperare și protecția căii aeriene; eșecul cere escaladare promptă.", "La VNI exige coopération et protection des voies aériennes ; son échec impose une escalade rapide.")),
    question("kum-10-rebuild-q3", "kum-10-rebuild-ards", 5, "232–233", b("Cu ce nivel minim de PEEP sunt asociate categoriile SDRA Berlin prezentate?", "Quel niveau minimal de PEEP est associé aux catégories Berlin du SDRA ?"), [
      b("PEEP ≥5 cmH₂O", "PEEP ≥5 cmH₂O"),
      b("PEEP ≥1 cmH₂O", "PEEP ≥1 cmH₂O"),
      b("Nu se utilizează PEEP", "Aucune PEEP"),
    ], 0, b("Acesta este criteriul de suport imprimat în ediția examinată; pragurile de categorie rămân à vérifier.", "C’est le critère de support imprimé dans l’édition examinée ; les bornes de catégorie restent à vérifier.")),
  ],
};

// Kumar 8 questions are remapped to the reconstructed sections in romanianLessons.ts.
questionsByChapter["kum-08"] = [];
for (const rebuilt of reconstructedLessons) {
  const questions = questionsByChapter[rebuilt.chapterId];
  if (!questions) throw new Error(`Questions Norya manquantes pour ${rebuilt.chapterId}.`);
  rebuilt.questions = questions;
}
