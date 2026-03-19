"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Locale = "nb" | "en";

// ── Translation shape ────────────────────────────────────────────────────────

export interface Translations {
  nav: {
    myInspections: string;
    admin: string;
    sifConfig: string;
    sifTest: string;
    archivalLog: string;
    users: string;
    logout: string;
  };
  status: {
    draft: string;
    in_progress: string;
    completed: string;
    archived: string;
  };
  dashboard: {
    loading: string;
    title: string;
    count: (n: number) => string;
    newInspection: string;
    empty: string;
    emptyHint: string;
    case: string;
    tabs: {
      all: string;
      active: string;
      archived: string;
      completed: string;
    };
  };
  newInspection: {
    title: string;
    step1: string;
    step2: string;
    caseNumber: string;
    caseSearchPlaceholder: string;
    estates: string;
    loadingEstates: string;
    fillFromEstate: string;
    addEstateOption: string;
    add: string;
    propertyInfo: string;
    propertyAddress: string;
    inspectionDate: string;
    inspector: string;
    inspectorPlaceholder: string;
    applicantName: string;
    selectFromCaseOrType: string;
    loadingContacts: string;
    participants: string;
    selectParticipant: string;
    loadingCaseContacts: string;
    noContactsFound: string;
    selectCaseForContacts: string;
    notes: string;
    notesPlaceholder: string;
    mapPosition: string;
    changePosition: string;
    selectPosition: string;
    mapTitle: string;
    selectMeasureType: string;
    measureProperties: string;
    measurePropertiesHint: string;
    back: string;
    next: string;
    creating: string;
    createInspection: string;
    errorNoMeasureType: string;
    errorNoAddress: string;
    errorGeneric: string;
  };
  inspection: {
    loading: string;
    back: string;
    case: string;
    edit: string;
    report: string;
    total: string;
    ok: string;
    deviations: string;
    notChecked: string;
    all: string;
    deviation: string;
    noDeviations: string;
    tabChecklist: string;
    tabDeviations: (n: number) => string;
    tabArchive: string;
    deviationsCount: (n: number) => string;
    editTitle: string;
    caseNumber: string;
    caseSearchPlaceholder: string;
    propertyAddress: string;
    date: string;
    inspector: string;
    applicantName: string;
    selectOrType: string;
    participants: string;
    selectParticipant: string;
    add: string;
    linkCaseForParticipants: string;
    estates: string;
    notes: string;
    mapPosition: string;
    changePosition: string;
    selectPosition: string;
    mapTitle: string;
    cancel: string;
    saving: string;
    saveChanges: string;
    errorNoAddress: string;
  };
  language: {
    nb: string;
    en: string;
  };
}

// ── Norwegian ────────────────────────────────────────────────────────────────

const nb: Translations = {
  nav: {
    myInspections: "Mine tilsyn",
    admin: "Admin",
    sifConfig: "SIF-konfigurasjon",
    sifTest: "SIF Test",
    archivalLog: "Arkiveringslogg",
    users: "Brukere",
    logout: "Logg ut",
  },
  status: {
    draft: "Utkast",
    in_progress: "Pågår",
    completed: "Avsluttet",
    archived: "Arkivert",
  },
  dashboard: {
    loading: "Laster…",
    title: "Mine tilsyn",
    count: (n) => `${n} tilsyn registrert`,
    newInspection: "+ Nytt tilsyn",
    empty: "Ingen tilsyn registrert ennå",
    emptyHint: "Klikk «Nytt tilsyn» for å komme i gang.",
    case: "Sak",
    tabs: {
      all: "Alle",
      active: "Pågår",
      archived: "Arkivert",
      completed: "Avsluttet",
    },
  },
  newInspection: {
    title: "Nytt tilsyn",
    step1: "Saksopplysninger",
    step2: "Tiltakstype",
    caseNumber: "Saksnummer",
    caseSearchPlaceholder: "Søk på saksnummer eller tittel…",
    estates: "Eiendommer (fra sak)",
    loadingEstates: "Henter eiendommer…",
    fillFromEstate: "Fyll inn adresse og matrikkelnummer herfra",
    addEstateOption: "— Legg til eiendom",
    add: "Legg til",
    propertyInfo: "Eiendomsinformasjon",
    propertyAddress: "Eiendomsadresse",
    inspectionDate: "Dato for tilsyn",
    inspector: "Tilsynsfører",
    inspectorPlaceholder: "Saksbehandler",
    applicantName: "Søkers navn",
    selectFromCaseOrType: "— Velg fra sak eller skriv inn",
    loadingContacts: "Henter kontakter…",
    participants: "Deltakere",
    selectParticipant: "— Velg deltaker fra sak",
    loadingCaseContacts: "Henter kontakter fra sak…",
    noContactsFound: "Ingen kontakter funnet på saken.",
    selectCaseForContacts: "Velg saksnummer for å hente kontakter.",
    notes: "Generelle merknader",
    notesPlaceholder: "Eventuelle generelle kommentarer til tilsynet...",
    mapPosition: "Posisjon i kart",
    changePosition: "Endre posisjon i kart",
    selectPosition: "Velg posisjon i kart",
    mapTitle: "Velg posisjon for tilsynet",
    selectMeasureType: "Velg tiltakstype",
    measureProperties: "Egenskaper ved tiltaket",
    measurePropertiesHint:
      "Kryss av det som gjelder. Sjekklisten tilpasses basert på valgene dine.",
    back: "← Tilbake",
    next: "Neste →",
    creating: "Oppretter...",
    createInspection: "Opprett tilsyn",
    errorNoMeasureType: "Velg tiltakstype.",
    errorNoAddress: "Eiendomsadresse er påkrevd.",
    errorGeneric: "Noe gikk galt.",
  },
  inspection: {
    loading: "Laster tilsyn…",
    back: "← Tilbake",
    case: "Sak:",
    edit: "Rediger",
    report: "Rapport",
    total: "Totalt",
    ok: "OK",
    deviations: "Avvik",
    notChecked: "Ikke sjekket",
    all: "Alle",
    deviation: "Avvik",
    noDeviations: "Ingen avvik registrert",
    tabChecklist: "Sjekkliste",
    tabDeviations: (n) => `Avvik (${n})`,
    tabArchive: "Arkiver",
    deviationsCount: (n) => `${n} avvik`,
    editTitle: "Rediger tilsyn",
    caseNumber: "Saksnummer",
    caseSearchPlaceholder: "Søk på saksnummer…",
    propertyAddress: "Eiendomsadresse",
    date: "Dato",
    inspector: "Tilsynsfører",
    applicantName: "Søkers navn",
    selectOrType: "— Velg eller skriv inn",
    participants: "Deltakere",
    selectParticipant: "— Velg deltaker",
    add: "Legg til",
    linkCaseForParticipants: "Koble til saksnummer for å hente deltakere.",
    estates: "Eiendommer",
    notes: "Generelle merknader",
    mapPosition: "Posisjon i kart",
    changePosition: "Endre posisjon",
    selectPosition: "Velg posisjon i kart",
    mapTitle: "Velg posisjon for tilsynet",
    cancel: "Avbryt",
    saving: "Lagrer…",
    saveChanges: "Lagre endringer",
    errorNoAddress: "Eiendomsadresse er påkrevd.",
  },
  language: {
    nb: "Norsk",
    en: "English",
  },
};

// ── English ──────────────────────────────────────────────────────────────────

const en: Translations = {
  nav: {
    myInspections: "My inspections",
    admin: "Admin",
    sifConfig: "SIF Configuration",
    sifTest: "SIF Test",
    archivalLog: "Archival Log",
    users: "Users",
    logout: "Log out",
  },
  status: {
    draft: "Draft",
    in_progress: "In progress",
    completed: "Closed",
    archived: "Archived",
  },
  dashboard: {
    loading: "Loading…",
    title: "My inspections",
    count: (n) => `${n} inspection${n !== 1 ? "s" : ""} registered`,
    newInspection: "+ New inspection",
    empty: "No inspections registered yet",
    emptyHint: 'Click «New inspection» to get started.',
    case: "Case",
    tabs: {
      all: "All",
      active: "Ongoing",
      archived: "Archived",
      completed: "Closed",
    },
  },
  newInspection: {
    title: "New inspection",
    step1: "Case details",
    step2: "Measure type",
    caseNumber: "Case number",
    caseSearchPlaceholder: "Search by case number or title…",
    estates: "Properties (from case)",
    loadingEstates: "Loading properties…",
    fillFromEstate: "Fill in address and cadastral number from here",
    addEstateOption: "— Add property",
    add: "Add",
    propertyInfo: "Property information",
    propertyAddress: "Property address",
    inspectionDate: "Inspection date",
    inspector: "Inspector",
    inspectorPlaceholder: "Case officer",
    applicantName: "Applicant name",
    selectFromCaseOrType: "— Select from case or type",
    loadingContacts: "Loading contacts…",
    participants: "Participants",
    selectParticipant: "— Select participant from case",
    loadingCaseContacts: "Loading contacts from case…",
    noContactsFound: "No contacts found on case.",
    selectCaseForContacts: "Select a case number to load contacts.",
    notes: "General notes",
    notesPlaceholder: "Any general comments on the inspection...",
    mapPosition: "Position on map",
    changePosition: "Change position on map",
    selectPosition: "Select position on map",
    mapTitle: "Select position for inspection",
    selectMeasureType: "Select measure type",
    measureProperties: "Properties of the measure",
    measurePropertiesHint:
      "Check all that apply. The checklist is adapted based on your selections.",
    back: "← Back",
    next: "Next →",
    creating: "Creating...",
    createInspection: "Create inspection",
    errorNoMeasureType: "Please select a measure type.",
    errorNoAddress: "Property address is required.",
    errorGeneric: "Something went wrong.",
  },
  inspection: {
    loading: "Loading inspection…",
    back: "← Back",
    case: "Case:",
    edit: "Edit",
    report: "Report",
    total: "Total",
    ok: "OK",
    deviations: "Deviations",
    notChecked: "Not checked",
    all: "All",
    deviation: "Deviation",
    noDeviations: "No deviations registered",
    tabChecklist: "Checklist",
    tabDeviations: (n) => `Deviations (${n})`,
    tabArchive: "Archive",
    deviationsCount: (n) => `${n} deviation${n !== 1 ? "s" : ""}`,
    editTitle: "Edit inspection",
    caseNumber: "Case number",
    caseSearchPlaceholder: "Search by case number…",
    propertyAddress: "Property address",
    date: "Date",
    inspector: "Inspector",
    applicantName: "Applicant name",
    selectOrType: "— Select or type",
    participants: "Participants",
    selectParticipant: "— Select participant",
    add: "Add",
    linkCaseForParticipants: "Link to a case number to load participants.",
    estates: "Properties",
    notes: "General notes",
    mapPosition: "Position on map",
    changePosition: "Change position",
    selectPosition: "Select position on map",
    mapTitle: "Select position for inspection",
    cancel: "Cancel",
    saving: "Saving…",
    saveChanges: "Save changes",
    errorNoAddress: "Property address is required.",
  },
  language: {
    nb: "Norwegian",
    en: "English",
  },
};

// ── Context ──────────────────────────────────────────────────────────────────

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: "nb",
  setLocale: () => {},
  t: nb,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("nb");

  // Restore from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("locale") as Locale | null;
    if (stored === "nb" || stored === "en") {
      setLocaleState(stored);
    }
  }, []);

  // Keep <html lang="..."> in sync
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  function setLocale(next: Locale) {
    setLocaleState(next);
    localStorage.setItem("locale", next);
  }

  const translations: Record<Locale, Translations> = { nb, en };

  return (
    <LanguageContext.Provider
      value={{ locale, setLocale, t: translations[locale] }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
