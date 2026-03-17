import type { CheckpointDefinition } from "@/types";

export const CHECKPOINT_DEFINITIONS: CheckpointDefinition[] = [
  // ============================================================
  // FORMELLE FORHOLD
  // ============================================================
  {
    id: "FF001",
    title: "Søknad og tillatelse foreligger",
    category: "formelle_forhold",
    description: "Kontroller at gyldig byggetillatelse foreligger og er tydelig tilgjengelig på byggeplass.",
    applies_to: ["garasje_carport", "tilbygg", "paabygg", "enebolig", "bruksendring", "terrasse_balkong", "stoettemur", "riving"],
    required_tags: ["soeknadspliktig"],
    severity: "critical",
    legal_reference: "pbl § 21-4",
  },
  {
    id: "FF002",
    title: "Tiltaket er i samsvar med tillatelsen",
    category: "formelle_forhold",
    description: "Sammenlign faktisk utførelse med godkjente tegninger og vilkår i tillatelsen.",
    applies_to: ["garasje_carport", "tilbygg", "paabygg", "enebolig", "bruksendring", "terrasse_balkong", "stoettemur", "riving"],
    required_tags: ["soeknadspliktig"],
    severity: "critical",
    legal_reference: "pbl § 31-3",
  },
  {
    id: "FF003",
    title: "Dispensasjon er innvilget og vilkår overholdt",
    category: "formelle_forhold",
    description: "Kontroller at dispensasjonsvedtaket foreligger og at eventuelle vilkår er oppfylt.",
    applies_to: ["garasje_carport", "tilbygg", "paabygg", "enebolig", "bruksendring", "terrasse_balkong", "stoettemur", "riving"],
    required_tags: ["har_dispensasjon"],
    severity: "critical",
    legal_reference: "pbl § 19-1",
  },
  {
    id: "FF004",
    title: "Ansvarlige foretak er i samsvar med søknaden",
    category: "formelle_forhold",
    description: "Kontroller at foretak som utfører arbeidet er identisk med dem som er angitt i ansvarsretten.",
    applies_to: ["tilbygg", "paabygg", "enebolig", "bruksendring"],
    required_tags: ["har_ansvarlige_foretak"],
    severity: "warning",
    legal_reference: "pbl § 23-1",
  },
  {
    id: "FF005",
    title: "Kontrollerklæringer foreligger",
    category: "formelle_forhold",
    description: "Kontroller at nødvendige kontrollerklæringer er innhentet og oversendt kommunen.",
    applies_to: ["tilbygg", "paabygg", "enebolig", "bruksendring"],
    required_tags: ["har_ansvarlige_foretak"],
    severity: "warning",
    legal_reference: "SAK10 § 14-8",
  },

  // ============================================================
  // PLASSERING
  // ============================================================
  {
    id: "PL001",
    title: "Avstand til nabogrense overholdt",
    category: "plassering",
    description: "Mål og kontroller at tiltakets avstand til nabogrense er i samsvar med godkjent situasjonsplan.",
    applies_to: ["garasje_carport", "tilbygg", "paabygg", "enebolig", "terrasse_balkong", "stoettemur"],
    required_tags: ["naer_nabogrense"],
    severity: "critical",
    legal_reference: "pbl § 29-4",
  },
  {
    id: "PL002",
    title: "Plassering stemmer med situasjonsplan",
    category: "plassering",
    description: "Kontroller at tiltakets plassering på tomten samsvarer med godkjent situasjonsplan og kotehøyder.",
    applies_to: ["garasje_carport", "tilbygg", "paabygg", "enebolig", "stoettemur"],
    required_tags: [],
    severity: "warning",
    legal_reference: "pbl § 29-4",
  },
  {
    id: "PL003",
    title: "Høyde på støttemur er innenfor tillatt grense",
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
    category: "utnyttelse_stoerrelse",
    description: "Beregn og kontroller bruksareal og bebygd areal mot tillatt utnyttelse i reguleringsplan/kommuneplan.",
    applies_to: ["garasje_carport", "tilbygg", "paabygg", "enebolig", "terrasse_balkong"],
    required_tags: [],
    severity: "critical",
    legal_reference: "pbl § 29-4, TEK17",
  },
  {
    id: "US002",
    title: "Høyde er innenfor tillatt grense",
    category: "utnyttelse_stoerrelse",
    description: "Mål gesimshøyde og mønehøyde og kontroller mot tillatt høyde i reguleringsplan.",
    applies_to: ["garasje_carport", "tilbygg", "paabygg", "enebolig"],
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
    category: "konstruksjon",
    description: "Kontroller at grunnarbeider er i samsvar med geoteknisk rapport og godkjente tegninger.",
    applies_to: ["enebolig", "tilbygg", "garasje_carport", "stoettemur"],
    required_tags: [],
    severity: "critical",
    legal_reference: "TEK17 § 9-1",
  },
  {
    id: "KO002",
    title: "Bærende konstruksjoner er i samsvar med prosjektering",
    category: "konstruksjon",
    description: "Kontroller bærende vegger, søyler, bjelker og dekker mot prosjekteringstegninger.",
    applies_to: ["enebolig", "tilbygg", "paabygg"],
    required_tags: [],
    severity: "critical",
    legal_reference: "TEK17 § 10-1",
  },
  {
    id: "KO003",
    title: "Terrasse/balkong er tilfredsstillende festet",
    category: "konstruksjon",
    description: "Kontroller forankring og festedetaljer for terrasse eller balkong. Sjekk kapasitet for laster.",
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
    category: "brann",
    description: "Kontroller at brannskillekonstruksjoner (vegger/etasjeskiller) har riktig brannklasse og er tett.",
    applies_to: ["garasje_carport", "tilbygg", "paabygg", "enebolig", "bruksendring"],
    required_tags: ["har_brannskille"],
    severity: "critical",
    legal_reference: "TEK17 § 11-3",
  },
  {
    id: "BR002",
    title: "Rømningsveier er tilgjengelige og korrekte",
    category: "brann",
    description: "Kontroller at rømningsveier, utgangsdører og nødbelysning oppfyller kravene.",
    applies_to: ["enebolig", "bruksendring", "tilbygg", "paabygg"],
    required_tags: [],
    severity: "critical",
    legal_reference: "TEK17 § 11-13",
  },
  {
    id: "BR003",
    title: "Brannteknisk prosjektering er fulgt",
    category: "brann",
    description: "Kontroller at det branntekniske prosjektet er lagt til grunn for utførelsen.",
    applies_to: ["enebolig", "bruksendring", "tilbygg", "paabygg"],
    required_tags: ["har_ansvarlige_foretak"],
    severity: "warning",
    legal_reference: "TEK17 § 11-1",
  },

  // ============================================================
  // FUKT / OVERVANN
  // ============================================================
  {
    id: "FU001",
    title: "Våtrom er korrekt utført (membran, sluk m.m.)",
    category: "fukt_overvann",
    description: "Kontroller at membran er korrekt utlagt, at sluk er korrekt montert og at fall mot sluk er tilstrekkelig.",
    applies_to: ["enebolig", "tilbygg", "paabygg", "bruksendring"],
    required_tags: ["inneholder_vaatrom"],
    severity: "critical",
    legal_reference: "TEK17 § 13-9",
  },
  {
    id: "FU002",
    title: "Drenering og fuktsperre er utført",
    category: "fukt_overvann",
    description: "Kontroller drenering rundt grunnmur og at fuktsperre er lagt korrekt.",
    applies_to: ["enebolig", "tilbygg", "garasje_carport"],
    required_tags: [],
    severity: "warning",
    legal_reference: "TEK17 § 13-7",
  },
  {
    id: "FU003",
    title: "Overvannshåndtering er ivaretatt",
    category: "fukt_overvann",
    description: "Kontroller at overvann fra tiltaket håndteres i samsvar med godkjent plan og lokale krav.",
    applies_to: ["enebolig", "tilbygg", "paabygg", "garasje_carport", "stoettemur"],
    required_tags: ["har_va_overvann"],
    severity: "warning",
    legal_reference: "pbl § 27-2",
  },
  {
    id: "FU004",
    title: "VA-tilkobling er korrekt utført",
    category: "fukt_overvann",
    description: "Kontroller at tilkobling til vann og avløp er fagmessig utført og i samsvar med VA-norm.",
    applies_to: ["enebolig", "tilbygg", "bruksendring"],
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
    category: "terreng",
    description: "Kontroller at faktisk terrengendring samsvarer med godkjent situasjonsplan og kotekart.",
    applies_to: ["enebolig", "tilbygg", "garasje_carport", "stoettemur"],
    required_tags: ["har_terrengendring"],
    severity: "warning",
    legal_reference: "pbl § 29-4",
  },
  {
    id: "TE002",
    title: "Naboeiendom og vei er ikke skadet",
    category: "terreng",
    description: "Kontroller at terrengarbeider ikke har forårsaket skade eller ulempe for naboer eller vei.",
    applies_to: ["enebolig", "tilbygg", "stoettemur"],
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
    category: "teknisk",
    description: "Kontroller at elektriske installasjoner er fagmessig utført og at samsvarserklæring foreligger.",
    applies_to: ["garasje_carport", "tilbygg", "paabygg", "enebolig", "bruksendring", "terrasse_balkong"],
    required_tags: ["har_elektrisk_arbeid"],
    severity: "warning",
    legal_reference: "el-tilsynsloven",
  },
  {
    id: "TK002",
    title: "Ventilasjon er tilfredsstillende",
    category: "teknisk",
    description: "Kontroller at ventilasjonsanlegget er dimensjonert og utført i samsvar med TEK17.",
    applies_to: ["enebolig", "tilbygg", "paabygg", "bruksendring"],
    required_tags: [],
    severity: "warning",
    legal_reference: "TEK17 § 13-2",
  },
  {
    id: "TK003",
    title: "Energikrav er oppfylt",
    category: "teknisk",
    description: "Kontroller at energirapporten er i samsvar med godkjent energiramme og at tiltak er gjennomført.",
    applies_to: ["enebolig", "tilbygg", "paabygg", "bruksendring"],
    required_tags: [],
    severity: "info",
    legal_reference: "TEK17 kap 14",
  },

  // ============================================================
  // BRUK / FUNKSJON
  // ============================================================
  {
    id: "BF001",
    title: "Universell utforming er ivaretatt",
    category: "bruk_funksjon",
    description: "Kontroller tilgjengelighet – rampe, trinnfri adkomst, snuheis, HC-toalett m.m.",
    applies_to: ["enebolig", "tilbygg", "bruksendring"],
    required_tags: ["krever_tilgjengelighet"],
    severity: "critical",
    legal_reference: "TEK17 § 12-1",
  },
  {
    id: "BF002",
    title: "Bruksendring er fagmessig gjennomført",
    category: "bruk_funksjon",
    description: "Kontroller at bygget er tilpasset ny bruk, inkl. krav til brannsikkerhet, ventilasjon og sanitær.",
    applies_to: ["bruksendring"],
    required_tags: [],
    severity: "critical",
    legal_reference: "pbl § 31-2",
  },
  {
    id: "BF003",
    title: "Rekkverk og sikkerhet er korrekt utført",
    category: "bruk_funksjon",
    description: "Kontroller høyde og utforming av rekkverk på terrasse/balkong. Min. 1,0 m for høyder > 1,0 m.",
    applies_to: ["terrasse_balkong", "tilbygg", "paabygg", "enebolig"],
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
    category: "dokumentasjon_ferdigattest",
    description: "Kontroller at ferdigattest eller midlertidig brukstillatelse er søkt om eller mottatt.",
    applies_to: ["garasje_carport", "tilbygg", "paabygg", "enebolig", "bruksendring", "terrasse_balkong", "stoettemur"],
    required_tags: ["soeknadspliktig"],
    severity: "warning",
    legal_reference: "pbl § 21-10",
  },
  {
    id: "DOK002",
    title: "Sluttkontrollerklæring foreligger",
    category: "dokumentasjon_ferdigattest",
    description: "Kontroller at ansvarlig kontrollerende har oversendt sluttkontrollerklæring til kommunen.",
    applies_to: ["tilbygg", "paabygg", "enebolig", "bruksendring"],
    required_tags: ["har_ansvarlige_foretak"],
    severity: "warning",
    legal_reference: "SAK10 § 14-8",
  },
  {
    id: "DOK003",
    title: "Tegninger/dokumentasjon er à jour",
    category: "dokumentasjon_ferdigattest",
    description: "Kontroller at byggetegninger er oppdatert med eventuelle avvik og endringer under byggetiden (as-built).",
    applies_to: ["garasje_carport", "tilbygg", "paabygg", "enebolig", "bruksendring"],
    required_tags: [],
    severity: "info",
    legal_reference: "pbl § 31-3",
  },
  {
    id: "DOK004",
    title: "Riving er ferdigstilt og dokumentert",
    category: "dokumentasjon_ferdigattest",
    description: "Kontroller at rivingsarbeidet er fullført, avfall sortert og dokumentasjon oversendt.",
    applies_to: ["riving"],
    required_tags: [],
    severity: "warning",
    legal_reference: "pbl § 28-2",
  },
  {
    id: "DOK005",
    title: "Farlig avfall fra riving er håndtert korrekt",
    category: "dokumentasjon_ferdigattest",
    description: "Kontroller at kartlegging av farlig avfall er utført og at avfall er levert godkjent mottak.",
    applies_to: ["riving"],
    required_tags: [],
    severity: "critical",
    legal_reference: "Forurensningsloven",
  },
];
