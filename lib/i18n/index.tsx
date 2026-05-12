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
    appName: string;
    tilsynConfig: string;
    checkpoints: string;
    adminMenuLabel: string;
    changeLanguage: string;
    selectLanguage: string;
    skipToContent: string;
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
      pnb: string;
    };
    pnbCases: {
      loading: string;
      error: string;
      empty: string;
      noName: string;
      notConfigured: string;
      openIn360: string;
      newBefaring: string;
      responsible: string;
      lastChanged: string;
      deadline: string;
      daysLeft: (n: number) => string;
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
    tabFiles: string;
    scrollToTop: string;
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
    befaringsomrade: string;
    tiltakstype: string;
    bakgrunn: string;
    behandlingstrinn: string;
    selectTreatmentStep: string;
    loadingTreatmentSteps: string;
    addExternalParticipant: string;
    externalParticipants: string;
    firstName: string;
    lastName: string;
    role: string;
    company: string;
    save: string;
    gnr: string;
    bnr: string;
  };
  checklist: {
    categoryLabels: Record<string, string>;
    statusOk: string;
    statusDeviation: string;
    statusNotChecked: string;
    setStatus: string;
  };
  archive: {
    title: string;
    description: string;
    caseNumberLabel: string;
    documentLabel: string;
    refreshList: string;
    loading: string;
    createNew: string;
    updateExisting: string;
    loadingDocuments: string;
    noDocuments: string;
    selectDocument: string;
    enterCaseAndClick: string;
    enterCase: string;
    advancedLookup: string;
    externalId: string;
    externalIdPlaceholder: string;
    uidPlaceholder: string;
    updating: string;
    archiving: string;
    updateBtn: string;
    submitBtn: string;
    whatHappens: string;
    whatHappensSteps: string[];
    successTitle: string;
    failedTitle: string;
    openIn360: string;
    markCompleted: string;
    completing: string;
    inspectionCompleted: string;
    alertNoCase: string;
    alertSelectDocument: string;
    cantComplete: string;
    archivedAs: (docNum: string) => string;
    dispatchStarted: string;
    dispatchFailed: (err: string) => string;
    unknownError: string;
    archivingError: string;
  };
  checkpoint: {
    responsible: string;
    notSelected: string;
    commentPlaceholder: string;
    commentLabel: string;
    fixBy: string;
    addPosition: string;
    takePhoto: string;
    takeCameraPhotoLabel: string;
    attachFile: string;
    uploadFileLabel: string;
    uploading: string;
    removeAttachment: (name: string) => string;
    gpsFromExif: string;
    gpsFromBrowser: string;
    noGps: string;
    attachmentsLabel: string;
    positionLabel: (title: string) => string;
    uploadError: string;
    saveError: string;
  };
  caseFiles: {
    loading: string;
    error: string;
    empty: string;
    images: (n: number) => string;
    linkedCase: string;
    unknownFile: string;
    close: string;
    previous: string;
    next: string;
  };
  language: {
    nb: string;
    en: string;
  };
}

// ── Norwegian ────────────────────────────────────────────────────────────────

const nb: Translations = {
  nav: {
    myInspections: "Mine befaringer",
    admin: "Admin",
    sifConfig: "SIF-konfigurasjon",
    sifTest: "SIF Test",
    archivalLog: "Arkiveringslogg",
    users: "Brukere",
    logout: "Logg ut",
    appName: "Befaringsapplikasjon",
    tilsynConfig: "Befaringskonfigurering",
    checkpoints: "Sjekkpunkter",
    adminMenuLabel: "Administrasjon",
    changeLanguage: "Bytt språk",
    selectLanguage: "Velg språk",
    skipToContent: "Hopp til innhold",
  },
  status: {
    draft: "Utkast",
    in_progress: "Pågår",
    completed: "Avsluttet",
    archived: "Arkivert",
  },
  dashboard: {
    loading: "Laster…",
    title: "Mine befaringer",
    count: (n) => `${n} befaring${n !== 1 ? "er" : ""} registrert`,
    newInspection: "+ Ny befaring",
    empty: "Ingen befaringer registrert ennå",
    emptyHint: "Klikk «Ny befaring» for å komme i gang.",
    case: "Sak",
    tabs: {
      all: "Alle",
      active: "Pågår",
      archived: "Arkivert",
      completed: "Avsluttet",
      pnb: "Mine PNB-saker",
    },
    pnbCases: {
      loading: "Henter saker fra PNB…",
      error: "Kunne ikke hente saker fra PNB",
      empty: "Ingen saker funnet i PNB der du er ansvarlig saksbehandler",
      noName: "Brukernavnet ditt er ikke satt. Oppdater profilnavnet ditt i innstillingene.",
      notConfigured: "SIF er ikke konfigurert. Ta kontakt med administrator.",
      openIn360: "Åpne i 360°",
      newBefaring: "Ny befaring",
      responsible: "Ansvarlig",
      lastChanged: "Sist endret",
      deadline: "Frist",
      daysLeft: (n) => `${n} dag${Math.abs(n) !== 1 ? "er" : ""} igjen`,
    },
  },
  newInspection: {
    title: "Ny befaring",
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
    inspectionDate: "Dato for befaring",
    inspector: "Befaringsleder",
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
    notesPlaceholder: "Eventuelle generelle kommentarer til befaringen...",
    mapPosition: "Posisjon i kart",
    changePosition: "Endre posisjon i kart",
    selectPosition: "Velg posisjon i kart",
    mapTitle: "Velg posisjon for befaringen",
    selectMeasureType: "Velg tiltakstype",
    measureProperties: "Egenskaper ved tiltaket",
    measurePropertiesHint:
      "Kryss av det som gjelder. Sjekklisten tilpasses basert på valgene dine.",
    back: "← Tilbake",
    next: "Neste →",
    creating: "Oppretter...",
    createInspection: "Opprett befaring",
    errorNoMeasureType: "Velg tiltakstype.",
    errorNoAddress: "Eiendomsadresse er påkrevd.",
    errorGeneric: "Noe gikk galt.",
  },
  inspection: {
    loading: "Laster befaring…",
    back: "← Tilbake",
    case: "Sak:",
    edit: "Rediger",
    report: "Rapport",
    total: "Totalt",
    ok: "OK",
    deviations: "Avvik",
    notChecked: "Ikke relevant",
    all: "Alle",
    deviation: "Avvik",
    noDeviations: "Ingen avvik registrert",
    tabChecklist: "Sjekkliste",
    tabDeviations: (n) => `Avvik (${n})`,
    tabArchive: "Arkiver",
    tabFiles: "Saksfiler",
    scrollToTop: "Til toppen",
    deviationsCount: (n) => `${n} avvik`,
    editTitle: "Rediger befaring",
    caseNumber: "Saksnummer",
    caseSearchPlaceholder: "Søk på saksnummer…",
    propertyAddress: "Eiendomsadresse",
    date: "Dato",
    inspector: "Befaringsleder",
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
    mapTitle: "Velg posisjon for befaringen",
    cancel: "Avbryt",
    saving: "Lagrer…",
    saveChanges: "Lagre endringer",
    errorNoAddress: "Eiendomsadresse er påkrevd.",
    befaringsomrade: "Befaringsområde",
    tiltakstype: "Tiltakstype",
    bakgrunn: "Bakgrunn for befaringen",
    behandlingstrinn: "Behandlingstrinn",
    selectTreatmentStep: "— Velg behandlingstrinn —",
    loadingTreatmentSteps: "Henter behandlingstrinn…",
    addExternalParticipant: "+ Legg til ekstern deltaker",
    externalParticipants: "Eksterne deltakere",
    firstName: "Fornavn",
    lastName: "Etternavn",
    role: "Rolle",
    company: "Foretak",
    save: "Lagre",
    gnr: "Gnr",
    bnr: "Bnr",
  },
  checklist: {
    categoryLabels: {
      formelle_forhold: "Formelle forhold",
      plassering: "Plassering",
      utnyttelse_stoerrelse: "Utnyttelse / Størrelse",
      konstruksjon: "Konstruksjon",
      brann: "Brann",
      fukt_overvann: "Fukt / Overvann",
      terreng: "Terreng",
      teknisk: "Teknisk",
      bruk_funksjon: "Bruk / Funksjon",
      dokumentasjon_ferdigattest: "Dokumentasjon / Ferdigattest",
    },
    statusOk: "OK",
    statusDeviation: "Avvik",
    statusNotChecked: "Ikke relevant",
    setStatus: "Sett status",
  },
  archive: {
    title: "Send og arkiver i Plan & Build",
    description: "Generer tilsynsrapport (PDF), arkiver den på saken i Plan & Build og send den til mottakerne.",
    caseNumberLabel: "Saksnummer i Plan & Build",
    documentLabel: "Dokument i Plan & Build",
    refreshList: "Oppdater liste",
    loading: "Henter…",
    createNew: "Opprett nytt dokument",
    updateExisting: "Oppdater eksisterende",
    loadingDocuments: "Henter dokumenter…",
    noDocuments: "Ingen dokumenter funnet på saken.",
    selectDocument: "— Velg dokument —",
    enterCaseAndClick: "Angi saksnummer og klikk «Oppdater eksisterende» for å laste inn dokumenter.",
    enterCase: "Angi saksnummer for å hente dokumenter.",
    advancedLookup: "Avansert oppslag (eksternt ID / UID)",
    externalId: "Eksternt ID",
    externalIdPlaceholder: "Eksternt ID fra fagsystem",
    uidPlaceholder: "Globalt unik identifikator",
    updating: "Oppdaterer dokument...",
    archiving: "Arkiverer og sender...",
    updateBtn: "📝 Oppdater dokument i Plan & Build",
    submitBtn: "📨 Send og arkiver i Plan & Build",
    whatHappens: "Hva skjer?",
    whatHappensSteps: [
      "Tilsynsrapport genereres som PDF",
      "Eventuelle bilder/vedlegg lastes opp til SIF",
      "Dokument opprettes på saken i Plan & Build",
      "Dokumentet sendes til mottakerne (hvis aktivert i admin)",
      "Dokumentreferansen lagres i appen",
    ],
    successTitle: "Sendt og arkivert i Plan & Build",
    failedTitle: "Arkivering feilet",
    openIn360: "Åpne dokument i 360° →",
    markCompleted: "✅ Sett som avsluttet",
    completing: "⏳ Avslutter…",
    inspectionCompleted: "✅ Tilsynet er avsluttet",
    alertNoCase: "Angi saksnummer, eksternt ID eller UID.",
    alertSelectDocument: "Velg et eksisterende dokument å oppdatere.",
    cantComplete: "Kunne ikke sette som avsluttet: ",
    archivedAs: (docNum) => `Arkivert som dokument ${docNum}`,
    dispatchStarted: "Forsendelse startet",
    dispatchFailed: (err) => `Forsendelse feilet: ${err}`,
    unknownError: "ukjent feil",
    archivingError: "Feil ved arkivering",
  },
  checkpoint: {
    responsible: "Ansvarlig",
    notSelected: "— Ikke valgt",
    commentPlaceholder: "Kommentar / avviksbeskrivelse…",
    commentLabel: "Kommentar",
    fixBy: "Rettes innen",
    addPosition: "Legg til posisjon i kart",
    takePhoto: "Ta bilde",
    takeCameraPhotoLabel: "Ta bilde med kamera",
    attachFile: "Legg ved fil",
    uploadFileLabel: "Last opp fil eller velg bilde fra galleri",
    uploading: "Laster opp…",
    removeAttachment: (name) => `Fjern vedlegg: ${name}`,
    gpsFromExif: "GPS fra bilde stemplet inn",
    gpsFromBrowser: "Posisjon fra nettleser stemplet inn",
    noGps: "Ingen posisjon funnet i bilde",
    attachmentsLabel: "Vedlegg",
    positionLabel: (title) => `Posisjon: ${title}`,
    uploadError: "Opplasting feilet: ",
    saveError: "Kunne ikke lagre vedlegg: ",
  },
  caseFiles: {
    loading: "Laster filer fra saken…",
    error: "Kunne ikke hente filer: ",
    empty: "Ingen filer registrert på saken i PNB.",
    images: (n) => `Bilder (${n})`,
    linkedCase: "tilknyttet sak",
    unknownFile: "Ukjent fil",
    close: "Lukk",
    previous: "Forrige",
    next: "Neste",
  },
  language: {
    nb: "Norsk",
    en: "English",
  },
};

// ── English ──────────────────────────────────────────────────────────────────

const en: Translations = {
  nav: {
    myInspections: "My site visits",
    admin: "Admin",
    sifConfig: "SIF Configuration",
    sifTest: "SIF Test",
    archivalLog: "Archival Log",
    users: "Users",
    logout: "Log out",
    appName: "Site Visit Application",
    tilsynConfig: "Site visit configuration",
    checkpoints: "Checkpoints",
    adminMenuLabel: "Administration",
    changeLanguage: "Change language",
    selectLanguage: "Select language",
    skipToContent: "Skip to content",
  },
  status: {
    draft: "Draft",
    in_progress: "In progress",
    completed: "Closed",
    archived: "Archived",
  },
  dashboard: {
    loading: "Loading…",
    title: "My site visits",
    count: (n) => `${n} site visit${n !== 1 ? "s" : ""} registered`,
    newInspection: "+ New site visit",
    empty: "No site visits registered yet",
    emptyHint: 'Click «New site visit» to get started.',
    case: "Case",
    tabs: {
      all: "All",
      active: "Ongoing",
      archived: "Archived",
      completed: "Closed",
      pnb: "My PNB cases",
    },
    pnbCases: {
      loading: "Loading cases from PNB…",
      error: "Could not load cases from PNB",
      empty: "No PNB cases found where you are the responsible case officer",
      noName: "Your display name is not set. Please update your profile name in settings.",
      notConfigured: "SIF is not configured. Please contact your administrator.",
      openIn360: "Open in 360°",
      newBefaring: "New site visit",
      responsible: "Responsible",
      lastChanged: "Last changed",
      deadline: "Deadline",
      daysLeft: (n) => `${n} day${Math.abs(n) !== 1 ? "s" : ""} left`,
    },
  },
  newInspection: {
    title: "New site visit",
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
    inspectionDate: "Site visit date",
    inspector: "Site visit lead",
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
    notesPlaceholder: "Any general comments on the site visit...",
    mapPosition: "Position on map",
    changePosition: "Change position on map",
    selectPosition: "Select position on map",
    mapTitle: "Select position for site visit",
    selectMeasureType: "Select measure type",
    measureProperties: "Properties of the measure",
    measurePropertiesHint:
      "Check all that apply. The checklist is adapted based on your selections.",
    back: "← Back",
    next: "Next →",
    creating: "Creating...",
    createInspection: "Create site visit",
    errorNoMeasureType: "Please select a measure type.",
    errorNoAddress: "Property address is required.",
    errorGeneric: "Something went wrong.",
  },
  inspection: {
    loading: "Loading site visit…",
    back: "← Back",
    case: "Case:",
    edit: "Edit",
    report: "Report",
    total: "Total",
    ok: "OK",
    deviations: "Deviations",
    notChecked: "Not applicable",
    all: "All",
    deviation: "Deviation",
    noDeviations: "No deviations registered",
    tabChecklist: "Checklist",
    tabDeviations: (n) => `Deviations (${n})`,
    tabArchive: "Archive",
    tabFiles: "Case files",
    scrollToTop: "Back to top",
    deviationsCount: (n) => `${n} deviation${n !== 1 ? "s" : ""}`,
    editTitle: "Edit site visit",
    caseNumber: "Case number",
    caseSearchPlaceholder: "Search by case number…",
    propertyAddress: "Property address",
    date: "Date",
    inspector: "Site visit lead",
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
    mapTitle: "Select position for site visit",
    cancel: "Cancel",
    saving: "Saving…",
    saveChanges: "Save changes",
    errorNoAddress: "Property address is required.",
    befaringsomrade: "Survey area",
    tiltakstype: "Measure type",
    bakgrunn: "Background for the site visit",
    behandlingstrinn: "Processing stage",
    selectTreatmentStep: "— Select processing stage —",
    loadingTreatmentSteps: "Loading processing stages…",
    addExternalParticipant: "+ Add external participant",
    externalParticipants: "External participants",
    firstName: "First name",
    lastName: "Last name",
    role: "Role",
    company: "Company",
    save: "Save",
    gnr: "Gnr",
    bnr: "Bnr",
  },
  checklist: {
    categoryLabels: {
      formelle_forhold: "Formal requirements",
      plassering: "Placement",
      utnyttelse_stoerrelse: "Utilisation / Size",
      konstruksjon: "Construction",
      brann: "Fire safety",
      fukt_overvann: "Moisture / Stormwater",
      terreng: "Terrain",
      teknisk: "Technical",
      bruk_funksjon: "Use / Function",
      dokumentasjon_ferdigattest: "Documentation / Completion",
    },
    statusOk: "OK",
    statusDeviation: "Deviation",
    statusNotChecked: "Not applicable",
    setStatus: "Set status",
  },
  archive: {
    title: "Submit and archive in Plan & Build",
    description: "Generate a site visit report (PDF), archive it on the case in Plan & Build and send it to recipients.",
    caseNumberLabel: "Case number in Plan & Build",
    documentLabel: "Document in Plan & Build",
    refreshList: "Refresh list",
    loading: "Loading…",
    createNew: "Create new document",
    updateExisting: "Update existing",
    loadingDocuments: "Loading documents…",
    noDocuments: "No documents found on this case.",
    selectDocument: "— Select document —",
    enterCaseAndClick: "Enter a case number and click «Update existing» to load documents.",
    enterCase: "Enter a case number to load documents.",
    advancedLookup: "Advanced lookup (external ID / UID)",
    externalId: "External ID",
    externalIdPlaceholder: "External ID from case management system",
    uidPlaceholder: "Globally unique identifier",
    updating: "Updating document...",
    archiving: "Archiving and sending...",
    updateBtn: "📝 Update document in Plan & Build",
    submitBtn: "📨 Submit and archive in Plan & Build",
    whatHappens: "What happens?",
    whatHappensSteps: [
      "Site visit report is generated as PDF",
      "Photos / attachments are uploaded to SIF",
      "Document is created on the case in Plan & Build",
      "Document is sent to recipients (if enabled in admin)",
      "Document reference is saved in the app",
    ],
    successTitle: "Submitted and archived in Plan & Build",
    failedTitle: "Archiving failed",
    openIn360: "Open document in 360° →",
    markCompleted: "✅ Mark as closed",
    completing: "⏳ Closing…",
    inspectionCompleted: "✅ Site visit is closed",
    alertNoCase: "Enter a case number, external ID or UID.",
    alertSelectDocument: "Select an existing document to update.",
    cantComplete: "Could not mark as closed: ",
    archivedAs: (docNum) => `Archived as document ${docNum}`,
    dispatchStarted: "Dispatch started",
    dispatchFailed: (err) => `Dispatch failed: ${err}`,
    unknownError: "unknown error",
    archivingError: "Archiving error",
  },
  checkpoint: {
    responsible: "Responsible",
    notSelected: "— Not selected",
    commentPlaceholder: "Comment / deviation description…",
    commentLabel: "Comment",
    fixBy: "Fix by",
    addPosition: "Add position to map",
    takePhoto: "Take photo",
    takeCameraPhotoLabel: "Take photo with camera",
    attachFile: "Attach file",
    uploadFileLabel: "Upload file or select photo from gallery",
    uploading: "Uploading…",
    removeAttachment: (name) => `Remove attachment: ${name}`,
    gpsFromExif: "GPS from photo stamped onto image",
    gpsFromBrowser: "Browser position stamped onto image",
    noGps: "No position found in photo",
    attachmentsLabel: "Attachments",
    positionLabel: (title) => `Position: ${title}`,
    uploadError: "Upload failed: ",
    saveError: "Could not save attachment: ",
  },
  caseFiles: {
    loading: "Loading files from case…",
    error: "Could not load files: ",
    empty: "No files registered on this case in PNB.",
    images: (n) => `Images (${n})`,
    linkedCase: "linked case",
    unknownFile: "Unknown file",
    close: "Close",
    previous: "Previous",
    next: "Next",
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
