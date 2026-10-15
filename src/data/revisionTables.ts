import type { Bilingual } from './romanianLessons';

export type RevisionTable = {
  id: string;
  title: Bilingual;
  columns: Bilingual[];
  rows: Bilingual[][];
  sourcePages: string;
  verification: 'needs-review';
};

const b = (ro: string, fr: string): Bilingual => ({ ro, fr });
const table = (id: string, title: Bilingual, columns: Bilingual[], rows: Bilingual[][], sourcePages: string): RevisionTable => ({
  id, title, columns, rows, sourcePages, verification: 'needs-review',
});

export const revisionTables: Record<string, RevisionTable[]> = {
  'kum-08-infectie-sau-sepsis': [table('kum-08-sofa-qsofa', b('Repere de recunoaștere', 'Repères de reconnaissance'), [
    b('Instrument', 'Instrument'), b('Repère', 'Repère'), b('Interprétation', 'Interprétation'),
  ], [
    [b('SOFA', 'SOFA'), b('Creștere acută ≥2 puncte', 'Augmentation aiguë ≥2 points'), b('Susține disfuncția de organ în context infecțios', 'Étaye une défaillance d’organe dans un contexte infectieux')],
    [b('qSOFA pozitiv', 'qSOFA positif'), b('Minimum 2/3: Glasgow <15; FR ≥22/min; TAS ≤100 mmHg', 'Au moins 2/3 : Glasgow <15 ; FR ≥22/min ; PAS ≤100 mmHg'), b('Instrument de risque, non diagnostique; score bas n’exclut pas le sepsis', 'Outil de risque, non diagnostique ; un score bas n’exclut pas le sepsis')],
    [b('Șoc septic', 'Choc septique'), b('Vasopresor pentru PAM ≥65 mmHg și lactat >2 mmol/L după repleție adecvată', 'Vasopresseur pour PAM ≥65 mmHg et lactate >2 mmol/L après remplissage adéquat'), b('Criterii asociate în contextul sepsisului', 'Critères associés dans le contexte du sepsis')],
  ], '152, 154–155')],
  'kum-08-v2-sofa': [
    table('kum-08-sofa-score-grid', b('SOFA — criteriile tabelului din manual', 'SOFA — critères du tableau du manuel'), [
      b('Domeniu', 'Domaine'), b('Scor 0', 'Score 0'), b('Scor 1', 'Score 1'), b('Scor 2', 'Score 2'), b('Scor 3', 'Score 3'), b('Scor 4', 'Score 4'),
    ], [
      [b('Respirator · PaO₂/FiO₂ (kPa)', 'Respiratoire · PaO₂/FiO₂ (kPa)'), b('≥53,3', '≥53,3'), b('<53,3', '<53,3'), b('<40', '<40'), b('<26,7 și ventilație mecanică', '<26,7 et ventilation mécanique'), b('<13,3 și ventilație mecanică', '<13,3 et ventilation mécanique')],
      [b('Coagulare · trombocite (×10⁹/L)', 'Coagulation · plaquettes (×10⁹/L)'), b('≥150', '≥150'), b('<150', '<150'), b('<100', '<100'), b('<50', '<50'), b('<20', '<20')],
      [b('Hepatic · bilirubină (µmol/L)', 'Hépatique · bilirubine (µmol/L)'), b('<20', '<20'), b('20–32', '20–32'), b('33–101', '33–101'), b('102–204', '102–204'), b('>204', '>204')],
      [b('Cardiovascular', 'Cardiovasculaire'), b('PAM ≥70 mmHg', 'PAM ≥70 mmHg'), b('PAM <70 mmHg', 'PAM <70 mmHg'), b('Dopamină <5 µg/kg/min sau dobutamină orice doză', 'Dopamine <5 µg/kg/min ou dobutamine à toute dose'), b('Dopamină 5,1–15 sau adrenalină/noradrenalină ≤0,1 µg/kg/min', 'Dopamine 5,1–15 ou adrénaline/noradrénaline ≤0,1 µg/kg/min'), b('Dopamină >15 sau adrenalină/noradrenalină >0,1 µg/kg/min', 'Dopamine >15 ou adrénaline/noradrénaline >0,1 µg/kg/min')],
      [b('Neurologic · Glasgow', 'Neurologique · Glasgow'), b('15', '15'), b('13–14', '13–14'), b('10–12', '10–12'), b('6–9', '6–9'), b('<6', '<6')],
      [b('Renal · creatinină (µmol/L)', 'Rénal · créatinine (µmol/L)'), b('<110', '<110'), b('110–170', '110–170'), b('171–299', '171–299'), b('300–440', '300–440'), b('>440', '>440')],
      [b('Renal · diureză (ml/zi)', 'Rénal · diurèse (ml/jour)'), b('—', '—'), b('—', '—'), b('—', '—'), b('<500', '<500'), b('<200', '<200')],
    ], '155'),
  ],
  'kum-08-recognition-risk-and-workup': [
    table('kum-08-nice-risk-thresholds', b('Praguri de risc redate în ediție (≥12 ani)', 'Seuils de risque rapportés dans l’édition (≥12 ans)'), [
      b('Parametru', 'Paramètre'), b('Risc înalt', 'Risque élevé'), b('Risc moderat/crescut', 'Risque modéré/élevé'),
    ], [
      [b('Frecvență respiratorie', 'Fréquence respiratoire'), b('≥25/min sau oxigen nou ≥40% pentru SpO₂ >92% (>88% în BPOC)', '≥25/min ou oxygène nouveau ≥40 % pour SpO₂ >92 % (>88 % en BPCO)'), b('21–24/min', '21–24/min')],
      [b('Tensiune sistolică', 'Pression systolique'), b('≤90 mmHg sau scădere cu >40 mmHg față de normal', '≤90 mmHg ou baisse >40 mmHg par rapport à la normale'), b('91–100 mmHg', '91–100 mmHg')],
      [b('Puls și diureză', 'Pouls et diurèse'), b('Puls >130/min; anurie 18 h; sondat <0,5 ml/kg/h', 'Pouls >130/min ; anurie 18 h ; sondé <0,5 ml/kg/h'), b('Puls 91–130/min (100–130 în sarcină) sau aritmie nouă; anurie 12–18 h; sondat 0,5–1 ml/kg/h', 'Pouls 91–130/min (100–130 en grossesse) ou arythmie nouvelle ; anurie 12–18 h ; sondé 0,5–1 ml/kg/h')],
      [b('Temperatură și piele', 'Température et peau'), b('Marmorare/cenușiu, cianoză, erupție nereliefată la vitropresiune', 'Marbrures/grisaille, cyanose, rash non blanchissant'), b('<36 °C timpanic; semne de infecție locală', '<36 °C tympanique ; signes d’infection locale')],
    ], '156'),
  ],
  'kum-08-first-hours-and-source-control': [
    table('kum-08-first-hours-pathway', b('Primele ore — pachetul și măsurile din sursă', 'Premières heures — mesures du manuel'), [
      b('Axă', 'Axe'), b('Acțiune/țintă menționată', 'Action/cible mentionnée'), b('Punct de control', 'Point de vigilance'),
    ], [
      [b('Sepsis Six', 'Sepsis Six'), b('Oxigen SpO₂ >94%; hemoculturi; antibiotic empiric larg; lichide; lactat; diureză și bilanț orar', 'Oxygène SpO₂ >94 % ; hémocultures ; antibiotique empirique large ; liquides ; lactate ; diurèse et bilan horaires'), b('Ținta din cadranul ediției; adaptează evaluarea pacientului', 'Cible du cadran de l’édition ; évaluer individuellement')],
      [b('Repleție inițială', 'Remplissage initial'), b('Cristaloide IV 30 ml/kg în primele 3 h; PAM 65 mmHg', 'Cristalloïdes IV 30 ml/kg dans les 3 premières heures ; PAM 65 mmHg'), b('Reevaluare hemodinamică/dinamică; volumul nu este universal', 'Réévaluation hémodynamique/dynamique ; volume non universel')],
      [b('Antimicrobian', 'Antimicrobien'), b('IV în prima oră după recunoaștere; cultură înainte dacă nu întârzie; de-escaladare zilnică', 'IV dans l’heure après reconnaissance ; cultures avant si sans retard ; désescalade quotidienne'), b('Alege după focar, susceptibilitate, alergii și funcția organelor', 'Choisir selon foyer, sensibilité, allergies et fonctions d’organes')],
      [b('Controlul sursei', 'Contrôle du foyer'), b('Localizare anatomică promptă; drenaj, decompresie sau îndepărtarea dispozitivului când este necesar', 'Localisation anatomique rapide ; drainage, décompression ou retrait du dispositif si nécessaire'), b('Asigură acces vascular alternativ înainte de retragerea celui infectat', 'Obtenir un autre accès vasculaire avant retrait de celui infecté')],
      [b('Lichide', 'Liquides'), b('Cristaloide ca primă intenție; albumină la volume mari poate fi considerată', 'Cristalloïdes en première intention ; albumine envisageable à grand volume'), b('Evită hidroxietil-amidonul; urmărește supraîncărcarea', 'Éviter hydroxyéthylamidon ; surveiller la surcharge')],
    ], '157–158'),
  ],
  'kum-08-antibiotic-stewardship-and-special-cases': [
    table('kum-08-antimicrobial-class-map', b('Repere de spectru și precauții din manual', 'Repères de spectre et précautions du manuel'), [
      b('Clasă/agent', 'Classe/agent'), b('Mecanism sau utilizare descrisă', 'Mécanisme ou utilisation décrite'), b('Distincții și precauții', 'Distinctions et précautions'),
    ], [
      [b('Beta-lactamine', 'Bêta-lactamine'), b('Inhibă sinteza peretelui; efect dependent de timp', 'Inhibe la synthèse de la paroi ; effet dépendant du temps'), b('ESBL/carbapenemaze pot compromite activitatea; ceftarolina și ceftobiprolul sunt excepțiile de generația V active anti-MRSA menționate în corecția furnizată', 'ESBL/carbapénémases peuvent compromettre l’activité ; ceftaroline et ceftobiprole sont les exceptions de 5e génération anti-MRSA citées dans le document correctif fourni')],
      [b('Carbapenemă', 'Carbapénème'), b('Spectru larg, inclusiv numeroși germeni Gram-negativi și anaerobi', 'Large spectre, dont de nombreux Gram négatifs et anaérobies'), b('Nu acoperă MRSA; ertapenemul nu acoperă Pseudomonas/Acinetobacter; imipenem cu cilastatină', 'Ne couvre pas MRSA ; ertapénem ne couvre pas Pseudomonas/Acinetobacter ; imipénem avec cilastatine')],
      [b('Fluorochinolonă', 'Fluoroquinolone'), b('Inhibă ADN-giraza și topoizomeraza IV', 'Inhibe ADN-gyrase et topoisomérase IV'), b('Rezistență E. coli/Klebsiella foarte mare în multe țări; risc tendinos, QT și neurotoxicitate', 'Résistance E. coli/Klebsiella élevée dans de nombreux pays ; risques tendineux, QT et neurotoxicité')],
      [b('Aminoglicozidă', 'Aminoside'), b('Inhibă sinteza proteică; activitate pe bacili Gram-negativi, inclusiv Pseudomonas', 'Inhibe la synthèse protéique ; activité sur bacilles Gram négatifs, dont Pseudomonas'), b('Doză dependentă de greutate; concentrații și funcție renală de monitorizat', 'Dose selon le poids ; concentrations et fonction rénale à surveiller')],
      [b('Vancomicină / linezolid', 'Vancomycine / linézolide'), b('Opțiuni descrise pentru infecții MRSA; linezolid cu biodisponibilitate orală bună', 'Options décrites pour infections MRSA ; bonne biodisponibilité orale du linézolide'), b('Vancomicină: monitorizare renală/expunere; linezolid: hemogramă săptămânală și atenție la citopenii/neuropatie', 'Vancomycine : surveillance rénale/exposition ; linézolide : hémogramme hebdomadaire, cytopénies/neuropathie')],
      [b('Tigeciclină', 'Tigécycline'), b('Poate acoperi unele MRSA, VRE și Acinetobacter', 'Peut couvrir certains MRSA, VRE et Acinetobacter'), b('Nu acoperă Pseudomonas sau Proteus; manualul cere prudență în infecții severe', 'Ne couvre pas Pseudomonas ni Proteus ; prudence en infection grave selon le manuel')],
    ], '163–168'),
  ],
  'kum-08-recunoastere-si-soc-septic': [
    table('kum-08-host-risk', b('Factori care cresc riscul sau orientează focarul', 'Facteurs de risque ou d’orientation du foyer'), [
      b('Context', 'Contexte'), b('Exemple de verificat', 'Exemples à rechercher'), b('Utilitate', 'Utilité'),
    ], [
      [b('Gazdă vulnerabilă', 'Hôte vulnérable'), b('Vârstă extremă, imunodepresie, asplenie, ciroză, sarcină, sepsis anterior', 'Âges extrêmes, immunodépression, asplénie, cirrhose, grossesse, sepsis antérieur'), b('Prag redus de suspiciune; nu confirmă singur sepsisul', 'Seuil de suspicion plus bas ; ne confirme pas seul le sepsis')],
      [b('Expuneri recente', 'Expositions récentes'), b('Spitalizare, antibiotice, dispozitive, călătorii', 'Hospitalisation, antibiotiques, dispositifs, voyages'), b('Orientează agentul, focarul și riscul de rezistență', 'Oriente agent, foyer et risque de résistance')],
      [b('Screening de risc', 'Dépistage du risque'), b('NEWS2 ≥5, conform reperului citat în ediție', 'NEWS2 ≥5, selon le repère cité dans l’édition'), b('Nu este definiție diagnostică și nu exclude sepsisul dacă e sub prag', 'Ce n’est pas une définition diagnostique et un score inférieur n’exclut pas le sepsis')],
    ], '155–156'),
  ],
  'kum-08-investigatii-si-prioritati': [
    table('kum-08-initial-assessment', b('Evaluarea inițială și Sepsis Six din ediția-sursă', 'Bilan initial et Sepsis Six de l’édition source'), [
      b('Direcție', 'Axe'), b('Ce urmărești', 'À rechercher'), b('Precauție', 'Précaution'),
    ], [
      [b('Infecție și focar', 'Infection et foyer'), b('Istoric, examen, culturi și imagistică țintită', 'Anamnèse, examen, cultures et imagerie ciblée'), b('Recoltează înaintea antibioticelor dacă nu întârzie îngrijirea urgentă', 'Prélever avant antibiotiques si cela ne retarde pas les soins urgents')],
      [b('Disfuncție de organ', 'Défaillance d’organe'), b('Stare mentală, oxigenare/gazometrie, lactat, funcții renală/hepatică, coagulare, diureză', 'État mental, oxygénation/gaz du sang, lactate, fonctions rénale/hépatique, coagulation, diurèse'), b('Interpretează în context și urmărește evoluția', 'Interpréter dans le contexte et suivre l’évolution')],
      [b('Sepsis Six', 'Sepsis Six'), b('Oxigen, hemoculturi, antibiotic empiric, lichide, lactat, diureză/bilan orar', 'Oxygène, hémocultures, antibiotique empirique, liquides, lactate, diurèse/bilan horaire'), b('Pachetul și ținta SpO₂ >94% sunt redate ca în ediție; individualizare și ghiduri actuale necesare', 'Paquet et cible SpO₂ >94 % rapportés de l’édition ; individualisation et recommandations actuelles nécessaires')],
    ], '151–153, 157–159'),
  ],
  'kum-08-antibioterapia-alegere-si-reevaluare': [
    table('kum-08-antibiotic-review', b('Alegerea și reevaluarea antibioticelor', 'Choix et réévaluation des antibiotiques'), [
      b('Moment', 'Moment'), b('Verifică', 'Vérifier'), b('Statutul conținutului Norya', 'Statut du contenu Norya'),
    ], [
      [b('Empiric', 'Empirique'), b('Focar, gravitate, alergii, funcție renală, antibioterapie/culturi anterioare, rezistență locală', 'Foyer, gravité, allergies, fonction rénale, antibiotiques/cultures antérieurs, résistance locale'), b('Principii incluse; fără tabel de prescriere', 'Principes inclus ; pas de tableau de prescription')],
      [b('La rezultate', 'Aux résultats'), b('Documentare, susceptibilitate, spectru, doză, cale și durată', 'Documentation, sensibilité, spectre, dose, voie et durée'), b('Reevaluare și de-escaladare în funcție de caz', 'Réévaluation et désescalade selon le cas')],
      [b('Verificare bibliografică', 'Vérification bibliographique'), b('Erratum p.163 privind ceftarolina și ceftobiprolul', 'Erratum p.163 concernant ceftaroline et ceftobiprole'), b('Posologiile p.162 și spectrul p.163–168 rămân de completat/verificat', 'Posologies p.162 et spectre p.163–168 restent à compléter/vérifier')],
    ], '159–160, 162–168'),
  ],
  'kum-08-rebuild-organ-dysfunction': [
    table('kum-08-rebuild-sofa-grid', b('SOFA — praguri de laborator redate în manual', 'SOFA — seuils biologiques du manuel'), [
      b('Sistem', 'Système'), b('1 punct', '1 point'), b('2 puncte', '2 points'), b('3 puncte', '3 points'), b('4 puncte', '4 points'),
    ], [
      [b('Trombocite ×10⁹/L', 'Plaquettes ×10⁹/L'), b('<150', '<150'), b('<100', '<100'), b('<50', '<50'), b('<20', '<20')],
      [b('Bilirubină µmol/L', 'Bilirubine µmol/L'), b('20–32', '20–32'), b('33–101', '33–101'), b('102–204', '102–204'), b('>204', '>204')],
      [b('Glasgow', 'Glasgow'), b('13–14', '13–14'), b('10–12', '10–12'), b('6–9', '6–9'), b('<6', '<6')],
      [b('Creatinină µmol/L', 'Créatinine µmol/L'), b('110–170', '110–170'), b('171–299', '171–299'), b('300–440', '300–440'), b('>440', '>440')],
    ], '155'),
  ],
  'kum-09-rebuild-compartments': [
    table('kum-09-rebuild-compartment-volumes', b('Compartimentele apei — exemplul de 70 kg', 'Compartiments hydriques — exemple pour 70 kg'), [
      b('Compartiment', 'Compartiment'), b('Volum aproximativ', 'Volume approximatif'), b('Ion predominant', 'Ion prédominant'),
    ], [
      [b('Apă totală', 'Eau totale'), b('42 L', '42 L'), b('—', '—')],
      [b('Intracelular', 'Intracellulaire'), b('28 L', '28 L'), b('K⁺', 'K⁺')],
      [b('Interstițial', 'Interstitiel'), b('9,4 L', '9,4 L'), b('Na⁺', 'Na⁺')],
      [b('Plasmatic', 'Plasmatique'), b('4,6 L', '4,6 L'), b('Na⁺', 'Na⁺')],
    ], '172'),
  ],
  'kum-09-rebuild-volume-control': [
    table('kum-09-rebuild-nephron-sodium', b('Reabsorbția sodiului pe segmentele nefronului', 'Réabsorption du sodium selon les segments du néphron'), [
      b('Segment', 'Segment'), b('Fracție filtrată aproximativă', 'Fraction filtrée approximative'), b('Repere de control', 'Repères de contrôle'),
    ], [
      [b('Tub proximal', 'Tubule proximal'), b('60–70%', '60–70 %'), b('Angiotensină II, noradrenalină, cotransporturi', 'Angiotensine II, noradrénaline, cotransports')],
      [b('Ansa Henle', 'Anse de Henle'), b('20–25%', '20–25 %'), b('Flux; cotransport Na⁺–K⁺–2Cl⁻', 'Débit ; cotransport Na⁺–K⁺–2Cl⁻')],
      [b('Tub distal', 'Tubule distal'), b('≈5%', '≈5 %'), b('Cotransport Na⁺–Cl⁻', 'Cotransport Na⁺–Cl⁻')],
      [b('Canal colector', 'Canal collecteur'), b('≈4%', '≈4 %'), b('Aldosteron, peptide natriuretic', 'Aldostérone, peptide natriurétique')],
    ], '174–175'),
  ],
  'kum-09-rebuild-edema-diuretics': [
    table('kum-09-rebuild-diuretic-classes', b('Clase de diuretice și locul de acțiune', 'Classes de diurétiques et site d’action'), [
      b('Clasă', 'Classe'), b('Țintă tubulară', 'Cible tubulaire'), b('Repere clinice din sursă', 'Repères cliniques de la source'),
    ], [
      [b('De ansă', 'De l’anse'), b('NKCC2, ansa ascendentă groasă', 'NKCC2, branche ascendante large'), b('Diureză potentă; hipokaliemie, hipomagneziemie, hiperuricemie', 'Diurèse puissante ; hypokaliémie, hypomagnésémie, hyperuricémie')],
      [b('Tiazidice', 'Thiazidiques'), b('Cotransport Na⁺–Cl⁻ distal', 'Cotransport Na⁺–Cl⁻ distal'), b('HTA, hipercalciurie; risc de hiponatremie și hipokaliemie', 'HTA, hypercalciurie ; risque d’hyponatrémie et d’hypokaliémie')],
      [b('Economisitoare de K⁺', 'Épargneurs de K⁺'), b('Receptor mineralocorticoid sau ENaC colector', 'Récepteur minéralocorticoïde ou ENaC collecteur'), b('Atenție la hiperkaliemie', 'Attention à l’hyperkaliémie')],
      [b('Acetazolamidă', 'Acétazolamide'), b('Anhidrază carbonică proximală', 'Anhydrase carbonique proximale'), b('Acidoză metabolică, hipokaliemie; utilizare în glaucom', 'Acidose métabolique, hypokaliémie ; usage dans le glaucome')],
      [b('Vaptani', 'Vaptans'), b('Receptor V₂ al ADH', 'Récepteur V₂ de l’ADH'), b('Aquaresis în stări cu ADH crescut', 'Aquaresis dans les états à ADH élevée')],
    ], '178–180'),
  ],
  'kum-09-rebuild-sodium': [
    table('kum-09-rebuild-hyponatremia-correction', b('Hiponatremie — reperele de conduită din ediție', 'Hyponatrémie — repères de conduite de l’édition'), [
      b('Context', 'Contexte'), b('Acțiune descrisă', 'Action décrite'), b('Vigilență', 'Vigilance'),
    ], [
      [b('Hipovolemie', 'Hypovolémie'), b('Soluție salină 0,9%', 'Sérum salé 0,9 %'), b('Tratează cauza și reevaluează volumul', 'Traiter la cause et réévaluer le volume')],
      [b('Euvolemie / SIADH', 'Euvolémie / SIADH'), b('Restricție lichidiană', 'Restriction hydrique'), b('Exclude insuficiența suprarenală și hipotiroidismul', 'Exclure insuffisance surrénale et hypothyroïdie')],
      [b('Simptome neurologice severe', 'Symptômes neurologiques sévères'), b('Terapie intensivă; NaCl 3% menționat în sursă', 'Soins intensifs ; NaCl 3 % cité dans la source'), b('Monitorizează frecvent natremia', 'Surveiller fréquemment la natrémie')],
      [b('Hiponatremie cronică', 'Hyponatrémie chronique'), b('Corecție lentă; ≤8 mmol/L în 24 h și ≤18 mmol/L în 48 h ca repere generale ale textului', 'Correction lente ; ≤8 mmol/L en 24 h et ≤18 mmol/L en 48 h comme repères généraux du texte'), b('Risc mai mare: alcoolism, ciroză, malnutriție, hipokaliemie', 'Risque accru : alcoolisme, cirrhose, malnutrition, hypokaliémie')],
    ], '185–186'),
  ],
  'kum-09-rebuild-potassium': [
    table('kum-09-rebuild-potassium-patterns', b('Tulburări ale potasiului — orientarea inițială', 'Troubles du potassium — orientation initiale'), [
      b('Problemă', 'Problème'), b('Reper de evaluare', 'Repère d’évaluation'), b('Risc/interpretare', 'Risque/interprétation'),
    ], [
      [b('Hipokaliemie', 'Hypokaliémie'), b('K⁺ urinar >20 mmol/zi', 'K⁺ urinaire >20 mmol/j'), b('Sugerează pierdere renală', 'Suggère une perte rénale')],
      [b('Hipokaliemie', 'Hypokaliémie'), b('K⁺ urinar <20 mmol/zi', 'K⁺ urinaire <20 mmol/j'), b('Aport redus ori pierdere extrarenală probabilă', 'Apport faible ou perte extrarénale probable')],
      [b('Hipokaliemie severă', 'Hypokaliémie sévère'), b('<2,5 mmol/L', '<2,5 mmol/L'), b('Slăbiciune, aritmii; verifică Mg²⁺ și ECG', 'Faiblesse, arythmies ; vérifier Mg²⁺ et ECG')],
      [b('Hiperkaliemie', 'Hyperkaliémie'), b('Verifică ECG, funcția renală, medicamente și posibilitatea pseudohiperkaliemiei', 'Vérifier ECG, fonction rénale, médicaments et pseudohyperkaliémie'), b('Urgență potențial letală dacă severă/modificări ECG', 'Urgence potentiellement létale si sévère/anomalies ECG')],
    ], '188–190'),
  ],
  'kum-09-rebuild-acid-base': [
    table('kum-09-rebuild-acid-base-basics', b('Repere fiziologice acido-bazice', 'Repères physiologiques acido-basiques'), [
      b('Parametru', 'Paramètre'), b('Valoare din manual', 'Valeur du manuel'), b('Semnificație', 'Signification'),
    ], [
      [b('pH sanguin', 'pH sanguin'), b('7,38–7,42', '7,38–7,42'), b('La 7,40, [H⁺] ≈40 nmol/L', 'À 7,40, [H⁺] ≈40 nmol/L')],
      [b('HCO₃⁻ plasmatic', 'HCO₃⁻ plasmatique'), b('≈25 mmol/L', '≈25 mmol/L'), b('Tampon metabolic; reabsorbit și regenerat renal', 'Tampon métabolique ; réabsorbé et régénéré par le rein')],
      [b('Reabsorbția proximală HCO₃⁻', 'Réabsorption proximale HCO₃⁻'), b('≈85–90%', '≈85–90 %'), b('Restul segmentelor excretă încărcătura acidă netă', 'Les segments distaux excrètent la charge acide nette')],
    ], '195–197'),
  ],
  'kum-10-rebuild-classification': [
    table('kum-10-rebuild-respiratory-types', b('Insuficiență respiratorie — clasificarea manualului', 'Insuffisance respiratoire — classification du manuel'), [
      b('Tip', 'Type'), b('PaO₂', 'PaO₂'), b('PaCO₂', 'PaCO₂'), b('Mecanism', 'Mécanisme'),
    ], [
      [b('I', 'I'), b('<8 kPa (60 mmHg)', '<8 kPa (60 mmHg)'), b('Normală sau scăzută', 'Normale ou basse'), b('Afectarea schimbului gazos, șunt/V̇Q̇', 'Atteinte des échanges, shunt/V̇Q̇')],
      [b('II', 'II'), b('<8 kPa (60 mmHg)', '<8 kPa (60 mmHg)'), b('>7 kPa (55 mmHg)', '>7 kPa (55 mmHg)'), b('Ventilație alveolară insuficientă', 'Ventilation alvéolaire insuffisante')],
    ], '224–225'),
  ],
  'kum-10-rebuild-modes-and-niv': [
    table('kum-10-rebuild-niv-indications', b('VNI — indicații și precauții din tabel', 'VNI — indications et précautions du tableau'), [
      b('Indicații redate în manual', 'Indications du manuel'), b('Contraindicații/precauții', 'Contre-indications/précautions'),
    ], [
      [b('Exacerbare BPOC cu pH <7,35 și H⁺ >44 nmol/L; edem pulmonar cardiogen; unele boli neuromusculare/perete toracic; apnee obstructivă; uneori astm', 'Exacerbation de BPCO avec pH <7,35 et H⁺ >44 nmol/L ; œdème pulmonaire cardiogénique ; certaines maladies neuromusculaires/paroi thoracique ; apnée obstructive ; parfois asthme'), b('Nivel scăzut al conștienței; cale aeriană neprotejată; chirurgie facială/ORL; prudență în pneumonie severă', 'Conscience altérée ; voies aériennes non protégées ; chirurgie faciale/ORL ; prudence en pneumonie sévère')],
    ], '231'),
  ],
  'kum-10-rebuild-ards': [
    table('kum-10-rebuild-ards-criteria', b('SDRA — criterii și praguri exact cum sunt tipărite', 'SDRA — critères et seuils tels qu’imprimés'), [
      b('Element', 'Élément'), b('Reper din ediție', 'Repère de l’édition'), b('Statut de verificare', 'Statut de vérification'),
    ], [
      [b('Imagine pulmonară', 'Imagerie pulmonaire'), b('Opacități bilaterale noi', 'Nouvelles opacités bilatérales'), b('Rendu textuel et figure à revoir visuellement', 'Texte et figure à revoir visuellement')],
      [b('Origine de l’œdème', 'Origine de l’œdème'), b('Pas d’explication cardiogénique suffisante', 'Pas d’explication cardiogénique suffisante'), b('Contexte clinique nécessaire', 'Contexte clinique nécessaire')],
      [b('Sévérité PaO₂/FiO₂', 'Sévérité PaO₂/FiO₂'), b('Léger 300–200 ; modéré 200–100 ; sévère <100 mmHg', 'Léger 300–200 ; modéré 200–100 ; sévère <100 mmHg'), b('Les bornes 200/100 du tableau restent à vérifier', 'Les bornes 200/100 du tableau restent à vérifier')],
      [b('PEEP', 'PEEP'), b('≥5 cmH₂O', '≥5 cmH₂O'), b('Repère imprimé dans l’édition', 'Repère imprimé dans l’édition')],
    ], '232–233'),
  ],
  'kum-31-praguri-si-fenotipuri': [table('kum-31-bp-thresholds', b('Praguri HTA din manualul de concurs', 'Seuils d’HTA du manuel du concours'), [
    b('Locul măsurării', 'Lieu de mesure'), b('Prag gradul 1', 'Seuil du grade 1'), b('Notă', 'Remarque'),
  ], [
    [b('Cabinet', 'Cabinet'), b('≥140/90 mmHg', '≥140/90 mmHg'), b('Nu confunda pragul diagnostic cu ținta terapeutică', 'Ne pas confondre seuil diagnostique et cible thérapeutique')],
    [b('Domiciliu', 'Domicile'), b('≥135/85 mmHg', '≥135/85 mmHg'), b('Măsurători repetate, condiții standardizate', 'Mesures répétées dans des conditions standardisées')],
    [b('Ambulatoriu diurn', 'Ambulatoire diurne'), b('≥135/85 mmHg', '≥135/85 mmHg'), b('Repere din ediția-sursă, nu ghid actualizat', 'Repères de l’édition source, pas un guide actualisé')],
  ], '1136–1140')],
  'kum-10-oxigenare-versus-ventilatie': [table('kum-10-respiratory-types', b('Tipurile insuficienței respiratorii', 'Types d’insuffisance respiratoire'), [
    b('Tip', 'Type'), b('PaO₂', 'PaO₂'), b('PaCO₂', 'PaCO₂'), b('Mecanism predominant', 'Mécanisme prédominant'),
  ], [
    [b('I', 'I'), b('Scăzută', 'Basse'), b('Normală sau scăzută', 'Normale ou basse'), b('Schimb gazos / V̇/Q̇ / șunt', 'Échanges gazeux / V̇/Q̇ / shunt')],
    [b('II', 'II'), b('Scăzută', 'Basse'), b('Crescută', 'Élevée'), b('Ventilație alveolară insuficientă', 'Ventilation alvéolaire insuffisante')],
  ], '224–227')],
  'kum-10-sdra-criteriile-berlin-din-manual': [table('kum-10-berlin-pf', b('SDRA — clasificarea P/F din manual', 'SDRA — classification P/F du manuel'), [
    b('Categorie', 'Catégorie'), b('PaO₂/FiO₂ (mmHg), formularea tipărită', 'PaO₂/FiO₂ (mmHg), formulation imprimée'), b('PEEP și notă', 'PEP et remarque'),
  ], [
    [b('Ușoară', 'Légère'), b('300–200', '300–200'), b('≥5 cmH₂O; verifică includerea valorii 200', '≥5 cmH₂O ; vérifier l’inclusion de 200')],
    [b('Moderată', 'Modérée'), b('200–100', '200–100'), b('≥5 cmH₂O; verifică includerea valorilor 200 și 100', '≥5 cmH₂O ; vérifier l’inclusion de 200 et 100')],
    [b('Severă', 'Sévère'), b('<100', '<100'), b('≥5 cmH₂O; strict „<100” în formularea tipărită', '≥5 cmH₂O ; « <100 » dans le texte imprimé')],
  ], '232–233')],
  'kum-21-interpreteaza-tsh-impreuna-cu-hormonii': [table('kum-21-thyroid-profiles', b('Profiluri biologice orientative', 'Profils biologiques indicatifs'), [
    b('Formă', 'Forme'), b('TSH (mU/L)', 'TSH (mU/L)'), b('fT4 (pmol/L)', 'fT4 (pmol/L)'), b('fT3 (pmol/L)', 'fT3 (pmol/L)'),
  ], [
    [b('Interval tipărit în ediție', 'Intervalle imprimé dans l’édition'), b('0,3–3,5', '0,3–3,5'), b('10–25', '10–25'), b('3,5–7,5', '3,5–7,5')],
    [b('Tirotoxicoză', 'Thyrotoxicose'), b('<0,05', '<0,05'), b('Crescută', 'Élevée'), b('Crescută', 'Élevée')],
    [b('Hipotiroidism primar din tabel', 'Hypothyroïdie primaire du tableau'), b('>10', '>10'), b('Scăzută/la limita inferioară', 'Basse/limite inférieure'), b('Normală sau scăzută', 'Normale ou basse')],
    [b('Deficit de TSH', 'Déficit en TSH'), b('Joasă sau subnormală', 'Basse ou sous-normale'), b('Scăzută/la limita inferioară', 'Basse/limite inférieure'), b('Normală sau scăzută', 'Normale ou basse')],
    [b('Toxicoză T3', 'T3-thyrotoxicose'), b('<0,05', '<0,05'), b('Normală', 'Normale'), b('Crescută', 'Élevée')],
    [b('Eutiroidism compensat', 'Euthyroïdie compensée'), b('5–10', '5–10'), b('Normală', 'Normale'), b('Normală', 'Normale')],
  ], '611')],
};
