"use client";

import { useTranslations, useLocale } from "next-intl";

export type Locale = "nb" | "en";

// ── Translations shape (unchanged — keeps all consumer files compatible) ──────

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
      openCase: string;
      all: string;
      activeStages: (n: number) => string;
      contacts: (n: number) => string;
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
    cantComplete: (error: string) => string;
    archivedAs: (docNum: string) => string;
    dispatchStarted: string;
    dispatchFailed: (err: string) => string;
    unknownError: string;
    archivingError: string;
    stageLabel: string;
    selectStage: string;
    loadingStages: string;
    noStages: string;
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
    uploadError: (error: string) => string;
    saveError: (error: string) => string;
  };
  caseFiles: {
    loading: string;
    error: (message: string) => string;
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

// ── Adapter hook — wraps next-intl, exposes legacy useLanguage() API ──────────

export function useLanguage() {
  const locale = useLocale() as Locale;

  const tNav = useTranslations("nav");
  const tStatus = useTranslations("status");
  const tDash = useTranslations("dashboard");
  const tPnb = useTranslations("dashboard.pnbCases");
  const tTabs = useTranslations("dashboard.tabs");
  const tNew = useTranslations("newInspection");
  const tInsp = useTranslations("inspection");
  const tCheck = useTranslations("checklist");
  const tArch = useTranslations("archive");
  const tCp = useTranslations("checkpoint");
  const tFiles = useTranslations("caseFiles");
  const tLang = useTranslations("language");

  function setLocale(next: Locale) {
    document.cookie = `locale=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    window.location.reload();
  }

  const t: Translations = {
    nav: {
      myInspections: tNav("myInspections"),
      admin: tNav("admin"),
      sifConfig: tNav("sifConfig"),
      sifTest: tNav("sifTest"),
      archivalLog: tNav("archivalLog"),
      users: tNav("users"),
      logout: tNav("logout"),
      appName: tNav("appName"),
      tilsynConfig: tNav("tilsynConfig"),
      checkpoints: tNav("checkpoints"),
      adminMenuLabel: tNav("adminMenuLabel"),
      changeLanguage: tNav("changeLanguage"),
      selectLanguage: tNav("selectLanguage"),
      skipToContent: tNav("skipToContent"),
    },
    status: {
      draft: tStatus("draft"),
      in_progress: tStatus("in_progress"),
      completed: tStatus("completed"),
      archived: tStatus("archived"),
    },
    dashboard: {
      loading: tDash("loading"),
      title: tDash("title"),
      count: (n) => tDash("count", { n }),
      newInspection: tDash("newInspection"),
      empty: tDash("empty"),
      emptyHint: tDash("emptyHint"),
      case: tDash("case"),
      tabs: {
        all: tTabs("all"),
        active: tTabs("active"),
        archived: tTabs("archived"),
        completed: tTabs("completed"),
        pnb: tTabs("pnb"),
      },
      pnbCases: {
        loading: tPnb("loading"),
        error: tPnb("error"),
        empty: tPnb("empty"),
        noName: tPnb("noName"),
        notConfigured: tPnb("notConfigured"),
        openIn360: tPnb("openIn360"),
        newBefaring: tPnb("newBefaring"),
        responsible: tPnb("responsible"),
        lastChanged: tPnb("lastChanged"),
        deadline: tPnb("deadline"),
        daysLeft: (n) =>
          n < 0
            ? tPnb("daysLeftOverdue", { n: Math.abs(n) })
            : tPnb("daysLeftRemaining", { n }),
        openCase: tPnb("openCase"),
        all: tPnb("all"),
        activeStages: (n) => tPnb("activeStages", { n }),
        contacts: (n) => tPnb("contacts", { n }),
      },
    },
    newInspection: {
      title: tNew("title"),
      step1: tNew("step1"),
      step2: tNew("step2"),
      caseNumber: tNew("caseNumber"),
      caseSearchPlaceholder: tNew("caseSearchPlaceholder"),
      estates: tNew("estates"),
      loadingEstates: tNew("loadingEstates"),
      fillFromEstate: tNew("fillFromEstate"),
      addEstateOption: tNew("addEstateOption"),
      add: tNew("add"),
      propertyInfo: tNew("propertyInfo"),
      propertyAddress: tNew("propertyAddress"),
      inspectionDate: tNew("inspectionDate"),
      inspector: tNew("inspector"),
      inspectorPlaceholder: tNew("inspectorPlaceholder"),
      applicantName: tNew("applicantName"),
      selectFromCaseOrType: tNew("selectFromCaseOrType"),
      loadingContacts: tNew("loadingContacts"),
      participants: tNew("participants"),
      selectParticipant: tNew("selectParticipant"),
      loadingCaseContacts: tNew("loadingCaseContacts"),
      noContactsFound: tNew("noContactsFound"),
      selectCaseForContacts: tNew("selectCaseForContacts"),
      notes: tNew("notes"),
      notesPlaceholder: tNew("notesPlaceholder"),
      mapPosition: tNew("mapPosition"),
      changePosition: tNew("changePosition"),
      selectPosition: tNew("selectPosition"),
      mapTitle: tNew("mapTitle"),
      selectMeasureType: tNew("selectMeasureType"),
      measureProperties: tNew("measureProperties"),
      measurePropertiesHint: tNew("measurePropertiesHint"),
      back: tNew("back"),
      next: tNew("next"),
      creating: tNew("creating"),
      createInspection: tNew("createInspection"),
      errorNoMeasureType: tNew("errorNoMeasureType"),
      errorNoAddress: tNew("errorNoAddress"),
      errorGeneric: tNew("errorGeneric"),
    },
    inspection: {
      loading: tInsp("loading"),
      back: tInsp("back"),
      case: tInsp("case"),
      edit: tInsp("edit"),
      report: tInsp("report"),
      total: tInsp("total"),
      ok: tInsp("ok"),
      deviations: tInsp("deviations"),
      notChecked: tInsp("notChecked"),
      all: tInsp("all"),
      deviation: tInsp("deviation"),
      noDeviations: tInsp("noDeviations"),
      tabChecklist: tInsp("tabChecklist"),
      tabDeviations: (n) => tInsp("tabDeviations", { n }),
      tabArchive: tInsp("tabArchive"),
      tabFiles: tInsp("tabFiles"),
      scrollToTop: tInsp("scrollToTop"),
      deviationsCount: (n) => tInsp("deviationsCount", { n }),
      editTitle: tInsp("editTitle"),
      caseNumber: tInsp("caseNumber"),
      caseSearchPlaceholder: tInsp("caseSearchPlaceholder"),
      propertyAddress: tInsp("propertyAddress"),
      date: tInsp("date"),
      inspector: tInsp("inspector"),
      applicantName: tInsp("applicantName"),
      selectOrType: tInsp("selectOrType"),
      participants: tInsp("participants"),
      selectParticipant: tInsp("selectParticipant"),
      add: tInsp("add"),
      linkCaseForParticipants: tInsp("linkCaseForParticipants"),
      estates: tInsp("estates"),
      notes: tInsp("notes"),
      mapPosition: tInsp("mapPosition"),
      changePosition: tInsp("changePosition"),
      selectPosition: tInsp("selectPosition"),
      mapTitle: tInsp("mapTitle"),
      cancel: tInsp("cancel"),
      saving: tInsp("saving"),
      saveChanges: tInsp("saveChanges"),
      errorNoAddress: tInsp("errorNoAddress"),
      befaringsomrade: tInsp("befaringsomrade"),
      tiltakstype: tInsp("tiltakstype"),
      bakgrunn: tInsp("bakgrunn"),
      behandlingstrinn: tInsp("behandlingstrinn"),
      selectTreatmentStep: tInsp("selectTreatmentStep"),
      loadingTreatmentSteps: tInsp("loadingTreatmentSteps"),
      addExternalParticipant: tInsp("addExternalParticipant"),
      externalParticipants: tInsp("externalParticipants"),
      firstName: tInsp("firstName"),
      lastName: tInsp("lastName"),
      role: tInsp("role"),
      company: tInsp("company"),
      save: tInsp("save"),
      gnr: tInsp("gnr"),
      bnr: tInsp("bnr"),
    },
    checklist: {
      categoryLabels: tCheck.raw("categoryLabels") as Record<string, string>,
      statusOk: tCheck("statusOk"),
      statusDeviation: tCheck("statusDeviation"),
      statusNotChecked: tCheck("statusNotChecked"),
      setStatus: tCheck("setStatus"),
    },
    archive: {
      title: tArch("title"),
      description: tArch("description"),
      caseNumberLabel: tArch("caseNumberLabel"),
      documentLabel: tArch("documentLabel"),
      refreshList: tArch("refreshList"),
      loading: tArch("loading"),
      createNew: tArch("createNew"),
      updateExisting: tArch("updateExisting"),
      loadingDocuments: tArch("loadingDocuments"),
      noDocuments: tArch("noDocuments"),
      selectDocument: tArch("selectDocument"),
      enterCaseAndClick: tArch("enterCaseAndClick"),
      enterCase: tArch("enterCase"),
      advancedLookup: tArch("advancedLookup"),
      externalId: tArch("externalId"),
      externalIdPlaceholder: tArch("externalIdPlaceholder"),
      uidPlaceholder: tArch("uidPlaceholder"),
      updating: tArch("updating"),
      archiving: tArch("archiving"),
      updateBtn: tArch("updateBtn"),
      submitBtn: tArch("submitBtn"),
      whatHappens: tArch("whatHappens"),
      whatHappensSteps: [
        tArch("whatHappensStep1"),
        tArch("whatHappensStep2"),
        tArch("whatHappensStep3"),
        tArch("whatHappensStep4"),
        tArch("whatHappensStep5"),
      ],
      successTitle: tArch("successTitle"),
      failedTitle: tArch("failedTitle"),
      openIn360: tArch("openIn360"),
      markCompleted: tArch("markCompleted"),
      completing: tArch("completing"),
      inspectionCompleted: tArch("inspectionCompleted"),
      alertNoCase: tArch("alertNoCase"),
      alertSelectDocument: tArch("alertSelectDocument"),
      cantComplete: (error) => tArch("cantComplete", { error }),
      archivedAs: (docNum) => tArch("archivedAs", { docNum }),
      dispatchStarted: tArch("dispatchStarted"),
      dispatchFailed: (err) => tArch("dispatchFailed", { err }),
      unknownError: tArch("unknownError"),
      archivingError: tArch("archivingError"),
      stageLabel: tArch("stageLabel"),
      selectStage: tArch("selectStage"),
      loadingStages: tArch("loadingStages"),
      noStages: tArch("noStages"),
    },
    checkpoint: {
      responsible: tCp("responsible"),
      notSelected: tCp("notSelected"),
      commentPlaceholder: tCp("commentPlaceholder"),
      commentLabel: tCp("commentLabel"),
      fixBy: tCp("fixBy"),
      addPosition: tCp("addPosition"),
      takePhoto: tCp("takePhoto"),
      takeCameraPhotoLabel: tCp("takeCameraPhotoLabel"),
      attachFile: tCp("attachFile"),
      uploadFileLabel: tCp("uploadFileLabel"),
      uploading: tCp("uploading"),
      removeAttachment: (name) => tCp("removeAttachment", { name }),
      gpsFromExif: tCp("gpsFromExif"),
      gpsFromBrowser: tCp("gpsFromBrowser"),
      noGps: tCp("noGps"),
      attachmentsLabel: tCp("attachmentsLabel"),
      positionLabel: (title) => tCp("positionLabel", { title }),
      uploadError: (error) => tCp("uploadError", { error }),
      saveError: (error) => tCp("saveError", { error }),
    },
    caseFiles: {
      loading: tFiles("loading"),
      error: (message) => tFiles("error", { message }),
      empty: tFiles("empty"),
      images: (n) => tFiles("images", { n }),
      linkedCase: tFiles("linkedCase"),
      unknownFile: tFiles("unknownFile"),
      close: tFiles("close"),
      previous: tFiles("previous"),
      next: tFiles("next"),
    },
    language: {
      nb: tLang("nb"),
      en: tLang("en"),
    },
  };

  return { locale, setLocale, t };
}

// No-op provider — NextIntlClientProvider in layout replaces LanguageProvider
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
