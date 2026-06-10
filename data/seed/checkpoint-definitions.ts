import type { CheckpointDefinition } from "@/types";

export const CHECKPOINT_DEFINITIONS: CheckpointDefinition[] = [
  // ============================================================
  // FORMELLE FORHOLD
  // ============================================================
  {
    id: "FF001",
    title: "Søknad og tillatelse foreligger",
    en_title: "Application and permit available",
    category: "formelle_forhold",
    description:
      "Kontroller at gyldig byggetillatelse foreligger og er tydelig tilgjengelig på byggeplass.",
    applies_to: [
      "garasje_carport",
      "tilbygg",
      "paabygg",
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
      "bruksendring",
      "terrasse_balkong",
      "stoettemur",
      "uthus_anneks",
      "naust",
      "riving",
      "fasadeendring",
    ],
    required_tags: ["soeknadspliktig"],
    severity: "critical",
    legal_reference: "pbl § 21-4",
  },
  {
    id: "FF002",
    title: "Tiltaket er i samsvar med tillatelsen",
    en_title: "Measure complies with the permit",
    category: "formelle_forhold",
    description: "Sammenlign faktisk utførelse med godkjente tegninger og vilkår i tillatelsen.",
    applies_to: [
      "garasje_carport",
      "tilbygg",
      "paabygg",
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
      "bruksendring",
      "terrasse_balkong",
      "stoettemur",
      "uthus_anneks",
      "naust",
      "riving",
      "fasadeendring",
    ],
    required_tags: ["soeknadspliktig"],
    severity: "critical",
    legal_reference: "pbl § 31-3",
  },
  {
    id: "FF003",
    title: "Dispensasjon er innvilget og vilkår overholdt",
    en_title: "Dispensation granted and conditions met",
    category: "formelle_forhold",
    description:
      "Kontroller at dispensasjonsvedtaket foreligger og at eventuelle vilkår er oppfylt.",
    applies_to: [
      "garasje_carport",
      "tilbygg",
      "paabygg",
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
      "bruksendring",
      "terrasse_balkong",
      "stoettemur",
      "uthus_anneks",
      "naust",
      "riving",
      "fasadeendring",
    ],
    required_tags: ["har_dispensasjon"],
    severity: "critical",
    legal_reference: "pbl § 19-1",
  },
  {
    id: "FF004",
    title: "Ansvarlige foretak er i samsvar med søknaden",
    en_title: "Responsible contractors match the application",
    category: "formelle_forhold",
    description:
      "Kontroller at foretak som utfører arbeidet er identisk med dem som er angitt i ansvarsretten.",
    applies_to: [
      "tilbygg",
      "paabygg",
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
      "bruksendring",
      "fasadeendring",
    ],
    required_tags: ["har_ansvarlige_foretak"],
    severity: "warning",
    legal_reference: "pbl § 23-1",
  },
  {
    id: "FF005",
    title: "Kontrollerklæringer foreligger",
    en_title: "Control declarations available",
    category: "formelle_forhold",
    description: "Kontroller at nødvendige kontrollerklæringer er innhentet og oversendt kommunen.",
    applies_to: [
      "tilbygg",
      "paabygg",
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
      "bruksendring",
      "fasadeendring",
    ],
    required_tags: ["har_ansvarlige_foretak"],
    severity: "warning",
    legal_reference: "SAK10 § 14-8",
  },

  // ============================================================
  // FASADEENDRING — spesifikke sjekkpunkter
  // ============================================================
  {
    id: "FA001",
    title: "Fasade er i samsvar med godkjente tegninger",
    en_title: "Facade matches approved drawings",
    category: "formelle_forhold",
    description:
      "Kontroller at faktisk fasadeutforming, materialer og fargevalg stemmer overens med godkjente fasadetegninger.",
    applies_to: ["fasadeendring"],
    required_tags: ["soeknadspliktig"],
    severity: "critical",
    legal_reference: "pbl § 31-3",
  },
  {
    id: "FA002",
    title: "Fasadeendring er i tråd med plan og estetikk",
    en_title: "Facade change complies with plan and aesthetic requirements",
    category: "plassering",
    description:
      "Kontroller at fasadeendringen er i tråd med reguleringsplanens krav til estetikk, materialbruk og fargesetting. Sjekk ev. krav i bebyggelsesplan eller SEFRAK-register.",
    applies_to: ["fasadeendring"],
    required_tags: [],
    severity: "warning",
    legal_reference: "pbl § 29-2",
  },
  {
    id: "FA003",
    title: "Vinduer og dører er i samsvar med energikrav",
    en_title: "Windows and doors comply with energy requirements",
    category: "teknisk",
    description:
      "Kontroller at eventuelle nye vinduer eller dører tilfredsstiller U-verdikrav i TEK17, og at totalt energitap ikke øker.",
    applies_to: ["fasadeendring"],
    required_tags: [],
    severity: "info",
    legal_reference: "TEK17 kap 14",
  },

  // ============================================================
  // PLASSERING
  // ============================================================
  {
    id: "PL001",
    title: "Avstand til nabogrense overholdt",
    en_title: "Distance to property boundary complied with",
    category: "plassering",
    description:
      "Mål og kontroller at tiltakets avstand til nabogrense er i samsvar med godkjent situasjonsplan.",
    applies_to: [
      "garasje_carport",
      "tilbygg",
      "paabygg",
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
      "terrasse_balkong",
      "stoettemur",
      "uthus_anneks",
      "naust",
    ],
    required_tags: ["naer_nabogrense"],
    severity: "critical",
    legal_reference: "pbl § 29-4",
  },
  {
    id: "PL002",
    title: "Plassering stemmer med situasjonsplan",
    en_title: "Placement matches the site plan",
    category: "plassering",
    description:
      "Kontroller at tiltakets plassering på tomten samsvarer med godkjent situasjonsplan og kotehøyder.",
    applies_to: [
      "garasje_carport",
      "tilbygg",
      "paabygg",
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
      "stoettemur",
      "uthus_anneks",
      "naust",
    ],
    required_tags: [],
    severity: "warning",
    legal_reference: "pbl § 29-4",
  },
  {
    id: "PL003",
    title: "Høyde på støttemur er innenfor tillatt grense",
    en_title: "Retaining wall height within permitted limit",
    category: "plassering",
    description: "Mål høyde på støttemur og kontroller mot tillatelsen.",
    applies_to: ["stoettemur"],
    required_tags: [],
    severity: "warning",
    legal_reference: "pbl § 1-6",
  },

  // ============================================================
  // UTNYTTELSE / STØRRELSE
  // ============================================================
  {
    id: "US001",
    title: "BRA/BYA er innenfor tillatt utnyttelse",
    en_title: "GFA/site coverage within permitted utilisation",
    category: "utnyttelse_stoerrelse",
    description:
      "Beregn og kontroller bruksareal og bebygd areal mot tillatt utnyttelse i reguleringsplan/kommuneplan.",
    applies_to: [
      "garasje_carport",
      "tilbygg",
      "paabygg",
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
      "terrasse_balkong",
      "uthus_anneks",
      "naust",
    ],
    required_tags: [],
    severity: "critical",
    legal_reference: "pbl § 29-4, TEK17",
  },
  {
    id: "US002",
    title: "Høyde er innenfor tillatt grense",
    en_title: "Height within permitted limit",
    category: "utnyttelse_stoerrelse",
    description: "Mål gesimshøyde og mønehøyde og kontroller mot tillatt høyde i reguleringsplan.",
    applies_to: [
      "garasje_carport",
      "tilbygg",
      "paabygg",
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
      "uthus_anneks",
      "naust",
    ],
    required_tags: [],
    severity: "warning",
    legal_reference: "TEK17 § 6-1",
  },

  // ============================================================
  // KONSTRUKSJON
  // ============================================================
  {
    id: "KO001",
    title: "Grunnarbeid utført etter godkjent prosjektering",
    en_title: "Foundation work carried out per approved design",
    category: "konstruksjon",
    description:
      "Kontroller at grunnarbeider er i samsvar med geoteknisk rapport og godkjente tegninger.",
    applies_to: [
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
      "tilbygg",
      "garasje_carport",
      "stoettemur",
      "naust",
    ],
    required_tags: [],
    severity: "critical",
    legal_reference: "TEK17 § 9-1",
  },
  {
    id: "KO002",
    title: "Bærende konstruksjoner er i samsvar med prosjektering",
    en_title: "Load-bearing structures comply with design",
    category: "konstruksjon",
    description:
      "Kontroller bærende vegger, søyler, bjelker og dekker mot prosjekteringstegninger.",
    applies_to: [
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
      "tilbygg",
      "paabygg",
    ],
    required_tags: [],
    severity: "critical",
    legal_reference: "TEK17 § 10-1",
  },
  {
    id: "KO003",
    title: "Terrasse/balkong er tilfredsstillende festet",
    en_title: "Terrace/balcony adequately secured",
    category: "konstruksjon",
    description:
      "Kontroller forankring og festedetaljer for terrasse eller balkong. Sjekk kapasitet for laster.",
    applies_to: ["terrasse_balkong"],
    required_tags: [],
    severity: "critical",
    legal_reference: "TEK17 § 10-1",
  },

  // ============================================================
  // BRANN
  // ============================================================
  {
    id: "BR001",
    title: "Brannskille er korrekt utført",
    en_title: "Fire separation correctly constructed",
    category: "brann",
    description:
      "Kontroller at brannskillekonstruksjoner (vegger/etasjeskiller) har riktig brannklasse og er tett.",
    applies_to: [
      "garasje_carport",
      "tilbygg",
      "paabygg",
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
      "bruksendring",
    ],
    required_tags: ["har_brannskille"],
    severity: "critical",
    legal_reference: "TEK17 § 11-3",
  },
  {
    id: "BR002",
    title: "Rømningsveier er tilgjengelige og korrekte",
    en_title: "Escape routes accessible and correct",
    category: "brann",
    description: "Kontroller at rømningsveier, utgangsdører og nødbelysning oppfyller kravene.",
    applies_to: [
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
      "bruksendring",
      "tilbygg",
      "paabygg",
    ],
    required_tags: [],
    severity: "critical",
    legal_reference: "TEK17 § 11-13",
  },
  {
    id: "BR003",
    title: "Brannteknisk prosjektering er fulgt",
    en_title: "Fire safety design followed",
    category: "brann",
    description: "Kontroller at det branntekniske prosjektet er lagt til grunn for utførelsen.",
    applies_to: [
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
      "bruksendring",
      "tilbygg",
      "paabygg",
    ],
    required_tags: ["har_ansvarlige_foretak"],
    severity: "warning",
    legal_reference: "TEK17 § 11-1",
  },

  // ============================================================
  // TOMANNSBOLIG — spesifikke sjekkpunkter
  // ============================================================
  {
    id: "TOM001",
    title: "Brannskille mellom boenheter er korrekt utført",
    en_title: "Fire separation between dwelling units correctly constructed",
    category: "brann",
    description:
      "Kontroller at brannskillekonstruksjonen mellom de to boenhetene (vegg/etasjeskiller) har riktig brannklasse (minimum EI 60) og er uten hull eller svake punkter.",
    applies_to: ["tomannsbolig", "leilighetsbygg"],
    required_tags: ["har_brannskille"],
    severity: "critical",
    legal_reference: "TEK17 § 11-3",
  },
  {
    id: "TOM002",
    title: "Lydkrav mellom boenheter er dokumentert oppfylt",
    en_title: "Sound insulation requirements between dwelling units documented",
    category: "teknisk",
    description:
      "Kontroller at lydisolasjon mellom boenheter er prosjektert og utført i samsvar med TEK17. Krav: Rw ≥ 55 dB for luftlyd, L''n,w ≤ 53 dB for trinnlyd.",
    applies_to: ["tomannsbolig", "leilighetsbygg"],
    required_tags: ["krever_lydkrav"],
    severity: "warning",
    legal_reference: "TEK17 § 13-6",
  },
  {
    id: "TOM003",
    title: "Separate innganger og adkomst er etablert",
    en_title: "Separate entrances and access established",
    category: "bruk_funksjon",
    description:
      "Kontroller at begge boenheter har separate innganger og at adkomstforhold er i samsvar med søknaden.",
    applies_to: ["tomannsbolig"],
    required_tags: [],
    severity: "info",
    legal_reference: "pbl § 29-4",
  },

  // ============================================================
  // FUKT / OVERVANN
  // ============================================================
  {
    id: "FU001",
    title: "Våtrom er korrekt utført (membran, sluk m.m.)",
    en_title: "Wet room correctly constructed (membrane, drain, etc.)",
    category: "fukt_overvann",
    description:
      "Kontroller at membran er korrekt utlagt, at sluk er korrekt montert og at fall mot sluk er tilstrekkelig.",
    applies_to: [
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
      "tilbygg",
      "paabygg",
      "bruksendring",
    ],
    required_tags: ["inneholder_vaatrom"],
    severity: "critical",
    legal_reference: "TEK17 § 13-9",
  },
  {
    id: "FU002",
    title: "Drenering og fuktsperre er utført",
    en_title: "Drainage and damp-proofing completed",
    category: "fukt_overvann",
    description: "Kontroller drenering rundt grunnmur og at fuktsperre er lagt korrekt.",
    applies_to: [
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
      "tilbygg",
      "garasje_carport",
      "naust",
    ],
    required_tags: [],
    severity: "warning",
    legal_reference: "TEK17 § 13-7",
  },
  {
    id: "FU003",
    title: "Overvannshåndtering er ivaretatt",
    en_title: "Stormwater management in place",
    category: "fukt_overvann",
    description:
      "Kontroller at overvann fra tiltaket håndteres i samsvar med godkjent plan og lokale krav.",
    applies_to: [
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
      "tilbygg",
      "paabygg",
      "garasje_carport",
      "stoettemur",
      "naust",
    ],
    required_tags: ["har_va_overvann"],
    severity: "warning",
    legal_reference: "pbl § 27-2",
  },
  {
    id: "FU004",
    title: "VA-tilkobling er korrekt utført",
    en_title: "Water and drain connection correctly installed",
    category: "fukt_overvann",
    description:
      "Kontroller at tilkobling til vann og avløp er fagmessig utført og i samsvar med VA-norm.",
    applies_to: [
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
      "tilbygg",
      "bruksendring",
    ],
    required_tags: ["har_va_overvann"],
    severity: "warning",
    legal_reference: "pbl § 27-1",
  },

  // ============================================================
  // TERRENG
  // ============================================================
  {
    id: "TE001",
    title: "Terrengendring er i samsvar med godkjent plan",
    en_title: "Terrain change complies with approved plan",
    category: "terreng",
    description:
      "Kontroller at faktisk terrengendring samsvarer med godkjent situasjonsplan og kotekart.",
    applies_to: [
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
      "tilbygg",
      "garasje_carport",
      "stoettemur",
      "naust",
    ],
    required_tags: ["har_terrengendring"],
    severity: "warning",
    legal_reference: "pbl § 29-4",
  },
  {
    id: "TE002",
    title: "Naboeiendom og vei er ikke skadet",
    en_title: "Adjacent property and road undamaged",
    category: "terreng",
    description:
      "Kontroller at terrengarbeider ikke har forårsaket skade eller ulempe for naboer eller vei.",
    applies_to: [
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
      "tilbygg",
      "stoettemur",
      "naust",
    ],
    required_tags: ["har_terrengendring"],
    severity: "warning",
    legal_reference: "pbl § 28-1",
  },

  // ============================================================
  // TEKNISK
  // ============================================================
  {
    id: "TK001",
    title: "Elektriske installasjoner er dokumentert",
    en_title: "Electrical installations documented",
    category: "teknisk",
    description:
      "Kontroller at elektriske installasjoner er fagmessig utført og at samsvarserklæring foreligger.",
    applies_to: [
      "garasje_carport",
      "tilbygg",
      "paabygg",
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
      "bruksendring",
      "terrasse_balkong",
      "uthus_anneks",
      "naust",
      "fasadeendring",
    ],
    required_tags: ["har_elektrisk_arbeid"],
    severity: "warning",
    legal_reference: "el-tilsynsloven",
  },
  {
    id: "TK002",
    title: "Ventilasjon er tilfredsstillende",
    en_title: "Ventilation satisfactory",
    category: "teknisk",
    description:
      "Kontroller at ventilasjonsanlegget er dimensjonert og utført i samsvar med TEK17.",
    applies_to: [
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
      "tilbygg",
      "paabygg",
      "bruksendring",
    ],
    required_tags: [],
    severity: "warning",
    legal_reference: "TEK17 § 13-2",
  },
  {
    id: "TK003",
    title: "Energikrav er oppfylt",
    en_title: "Energy requirements met",
    category: "teknisk",
    description:
      "Kontroller at energirapporten er i samsvar med godkjent energiramme og at tiltak er gjennomført.",
    applies_to: [
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
      "tilbygg",
      "paabygg",
      "bruksendring",
      "fasadeendring",
    ],
    required_tags: [],
    severity: "info",
    legal_reference: "TEK17 kap 14",
  },

  // ============================================================
  // TEKNISK — Radon
  // ============================================================
  {
    id: "RAD001",
    title: "Radonsperre og ventilasjonstiltak er utført",
    en_title: "Radon barrier and ventilation measures completed",
    category: "teknisk",
    description:
      "Kontroller at radonsperre er lagt under gulv mot grunn, og at evt. avtrekksrør for radonventilering er installert i samsvar med prosjektering og TEK17 § 13-5.",
    applies_to: [
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "tilbygg",
      "paabygg",
      "bruksendring",
      "garasje_carport",
    ],
    required_tags: ["har_radon_tiltak"],
    severity: "warning",
    legal_reference: "TEK17 § 13-5",
  },

  // ============================================================
  // BRUK / FUNKSJON
  // ============================================================
  {
    id: "BF001",
    title: "Universell utforming er ivaretatt",
    en_title: "Universal design requirements met",
    category: "bruk_funksjon",
    description: "Kontroller tilgjengelighet – rampe, trinnfri adkomst, snuheis, HC-toalett m.m.",
    applies_to: [
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "naeringsbygg",
      "tilbygg",
      "bruksendring",
    ],
    required_tags: ["krever_tilgjengelighet"],
    severity: "critical",
    legal_reference: "TEK17 § 12-1",
  },
  {
    id: "BF002",
    title: "Bruksendring er fagmessig gjennomført",
    en_title: "Change of use professionally completed",
    category: "bruk_funksjon",
    description:
      "Kontroller at bygget er tilpasset ny bruk, inkl. krav til brannsikkerhet, ventilasjon og sanitær.",
    applies_to: ["bruksendring"],
    required_tags: [],
    severity: "critical",
    legal_reference: "pbl § 31-2",
  },
  {
    id: "BF003",
    title: "Rekkverk og sikkerhet er korrekt utført",
    en_title: "Railings and safety correctly constructed",
    category: "bruk_funksjon",
    description:
      "Kontroller høyde og utforming av rekkverk på terrasse/balkong. Min. 1,0 m for høyder > 1,0 m.",
    applies_to: [
      "terrasse_balkong",
      "tilbygg",
      "paabygg",
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
    ],
    required_tags: [],
    severity: "critical",
    legal_reference: "TEK17 § 12-17",
  },

  // ============================================================
  // DOKUMENTASJON / FERDIGATTEST
  // ============================================================
  {
    id: "DOK001",
    title: "Ferdigattest/midlertidig brukstillatelse er søkt",
    en_title: "Certificate of completion / temporary use permit applied for",
    category: "dokumentasjon_ferdigattest",
    description:
      "Kontroller at ferdigattest eller midlertidig brukstillatelse er søkt om eller mottatt.",
    applies_to: [
      "garasje_carport",
      "tilbygg",
      "paabygg",
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
      "bruksendring",
      "terrasse_balkong",
      "stoettemur",
      "uthus_anneks",
      "naust",
      "fasadeendring",
    ],
    required_tags: ["soeknadspliktig"],
    severity: "warning",
    legal_reference: "pbl § 21-10",
  },
  {
    id: "DOK002",
    title: "Sluttkontrollerklæring foreligger",
    en_title: "Final inspection declaration available",
    category: "dokumentasjon_ferdigattest",
    description:
      "Kontroller at ansvarlig kontrollerende har oversendt sluttkontrollerklæring til kommunen.",
    applies_to: [
      "tilbygg",
      "paabygg",
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
      "bruksendring",
    ],
    required_tags: ["har_ansvarlige_foretak"],
    severity: "warning",
    legal_reference: "SAK10 § 14-8",
  },
  {
    id: "DOK003",
    title: "Tegninger/dokumentasjon er à jour",
    en_title: "Drawings and documentation up to date",
    category: "dokumentasjon_ferdigattest",
    description:
      "Kontroller at byggetegninger er oppdatert med eventuelle avvik og endringer under byggetiden (as-built).",
    applies_to: [
      "garasje_carport",
      "tilbygg",
      "paabygg",
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
      "bruksendring",
      "uthus_anneks",
      "naust",
      "fasadeendring",
    ],
    required_tags: [],
    severity: "info",
    legal_reference: "pbl § 31-3",
  },
  {
    id: "DOK004",
    title: "Riving er ferdigstilt og dokumentert",
    en_title: "Demolition completed and documented",
    category: "dokumentasjon_ferdigattest",
    description:
      "Kontroller at rivingsarbeidet er fullført, avfall sortert og dokumentasjon oversendt.",
    applies_to: ["riving"],
    required_tags: [],
    severity: "warning",
    legal_reference: "pbl § 28-2",
  },
  {
    id: "DOK005",
    title: "Farlig avfall fra riving er håndtert korrekt",
    en_title: "Hazardous waste from demolition handled correctly",
    category: "dokumentasjon_ferdigattest",
    description:
      "Kontroller at kartlegging av farlig avfall er utført og at avfall er levert godkjent mottak.",
    applies_to: ["riving"],
    required_tags: [],
    severity: "critical",
    legal_reference: "Forurensningsloven",
  },

  // ============================================================
  // PRODUKTDOKUMENTASJON
  // ============================================================
  {
    id: "PRD001",
    title: "Byggevarer har produktdokumentasjon (CE-merking / DoP)",
    en_title: "Building products have product documentation (CE marking / DoP)",
    category: "formelle_forhold",
    description:
      "Kontroller at vesentlige byggevarer (bærende elementer, isolasjon, vinduer, membraner m.m.) er CE-merket og at ytelseserklæring (DoP) foreligger på byggeplassen. Gjelder produkter som er dekket av harmoniserte produktstandarder.",
    applies_to: [
      "tilbygg",
      "paabygg",
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
      "bruksendring",
    ],
    required_tags: ["har_ansvarlige_foretak"],
    severity: "warning",
    legal_reference: "pbl § 29-7, DOK-forskriften",
  },

  // ============================================================
  // KVALITETSSIKRING
  // ============================================================
  {
    id: "KS001",
    title: "Foretakets kvalitetssikringsrutiner er dokumentert og i bruk",
    en_title: "Enterprise quality assurance procedures documented and in use",
    category: "formelle_forhold",
    description:
      "Kontroller at ansvarlig foretak har tilpassede kvalitetssikringsrutiner for dette tiltaket (sjekklister, prosedyrer for avviksbehandling m.m.) og at disse er i aktiv bruk på byggeplassen, jf. SAK10 § 10-1.",
    applies_to: [
      "tilbygg",
      "paabygg",
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
      "bruksendring",
    ],
    required_tags: ["har_ansvarlige_foretak"],
    severity: "info",
    legal_reference: "SAK10 § 10-1",
  },

  // ============================================================
  // NATURFARE
  // ============================================================
  {
    id: "FAR001",
    title: "Tiltaket er sikret mot naturpåkjenninger",
    en_title: "Measure protected against natural hazards",
    category: "plassering",
    description:
      "Kontroller at tiltaket er plassert og sikret i henhold til krav om sikkerhet mot flom, skred (snø-, jord- og steinskred), stormflo og erosjon. Verifiser at sikkerhetsnivå (nominell årlig sannsynlighet) er oppfylt og at geoteknisk/hydrologisk vurdering er dokumentert.",
    applies_to: [
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
      "tilbygg",
      "paabygg",
      "garasje_carport",
      "naust",
    ],
    required_tags: ["i_fareomrade"],
    severity: "critical",
    legal_reference: "TEK17 kap. 7, pbl § 28-1",
  },

  // ============================================================
  // UAVHENGIG KONTROLL
  // ============================================================
  {
    id: "UK001",
    title: "Uavhengig kontroll er etablert og gjennomføres",
    en_title: "Independent inspection established and being carried out",
    category: "formelle_forhold",
    description:
      "Kontroller at uavhengig kontrollerende er angitt i søknaden, at kontrollplan foreligger, og at stikkprøvekontroll er gjennomført for påkrevde kontrollområder (konstruksjoner, geoteknikk, brannsikkerhet, fuktsikring av våtrom).",
    applies_to: [
      "tilbygg",
      "paabygg",
      "enebolig",
      "tomannsbolig",
      "leilighetsbygg",
      "fritidsbolig",
      "naeringsbygg",
      "bruksendring",
    ],
    required_tags: ["har_ansvarlige_foretak"],
    severity: "warning",
    legal_reference: "SAK10 § 14-2",
  },

  // ============================================================
  // LEILIGHETSBYGG — spesifikke sjekkpunkter
  // ============================================================
  {
    id: "LB001",
    title: "Risikoklasse og brannklasse er korrekt fastslått",
    en_title: "Risk class and fire class correctly determined",
    category: "brann",
    description:
      "Kontroller at byggets risikoklasse (RKL) og brannklasse (BKL) er korrekt fastslått og lagt til grunn for brannteknisk prosjektering. Flermannsboliger er normalt risikoklasse 4.",
    applies_to: ["leilighetsbygg"],
    required_tags: ["har_ansvarlige_foretak"],
    severity: "critical",
    legal_reference: "TEK17 § 11-2, § 11-4",
  },

  // ============================================================
  // NÆRINGSBYGG — spesifikke sjekkpunkter
  // ============================================================
  {
    id: "NB001",
    title: "Risikoklasse og brannklasse er korrekt fastslått",
    en_title: "Risk class and fire class correctly determined",
    category: "brann",
    description:
      "Kontroller at byggets risikoklasse (RKL) og brannklasse (BKL) er korrekt fastslått og lagt til grunn for brannteknisk prosjektering. Risikoklasse avhenger av byggets bruk og antall personer.",
    applies_to: ["naeringsbygg"],
    required_tags: ["har_ansvarlige_foretak"],
    severity: "critical",
    legal_reference: "TEK17 § 11-2, § 11-4",
  },
];
