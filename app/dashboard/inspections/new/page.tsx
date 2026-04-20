"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MEASURE_TYPES, PROPERTY_QUESTIONS } from "@/data/seed/measure-types";
import type { MeasureTypeId, PropertyTag, SifContact, SifEstate, SifCaseStage, ExternalParticipant } from "@/types";
import type { SifEnterpriseResult } from "@/lib/sif/types";
import { createClient } from "@/lib/supabase/client";
import CaseSearchInput from "@/components/sif/CaseSearchInput";
import EnterpriseSearchInput from "@/components/sif/EnterpriseSearchInput";
import MapPickerModal from "@/components/ui/MapPickerModal";
import { useLanguage } from "@/lib/i18n";
import SearchableMultiSelect from "@/components/ui/SearchableMultiSelect";

export default function NewInspectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useLanguage();

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1 fields
  const [propertyAddress, setPropertyAddress] = useState("");
  const [caseNumber, setCaseNumber] = useState(() => searchParams.get("case") ?? "");
  const [caseTitle, setCaseTitle] = useState(() => searchParams.get("title") ?? "");
  const [gnr, setGnr] = useState("");
  const [bnr, setBnr] = useState("");
  const [snr, setSnr] = useState("");
  const [fnr, setFnr] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [inspectorName, setInspectorName] = useState("");
  const [inspectionDate, setInspectionDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");

  // Contacts from case (for participants + ansvarlig)
  const [caseContacts, setCaseContacts] = useState<SifContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [applicantRecno, setApplicantRecno] = useState<number | null>(null);

  // Participants
  const [participants, setParticipants] = useState<SifContact[]>([]);
  const [participantDropdown, setParticipantDropdown] = useState<number | "">("");

  // External participants
  const [externalParticipants, setExternalParticipants] = useState<ExternalParticipant[]>([]);
  const [extDraft, setExtDraft] = useState<{ firstName: string; lastName: string; role: string; company: string; companyRecno?: number }>({ firstName: "", lastName: "", role: "", company: "", companyRecno: undefined });
  const [showExtForm, setShowExtForm] = useState(false);

  // Stages from case
  const [stages, setStages] = useState<SifCaseStage[]>([]);
  const [stagesLoading, setStagesLoading] = useState(false);
  const [selectedStageRecno, setSelectedStageRecno] = useState<number | null>(null);

  // Estates from case
  const [estates, setEstates] = useState<SifEstate[]>([]);
  const [estatesLoading, setEstatesLoading] = useState(false);
  const [selectedEstates, setSelectedEstates] = useState<SifEstate[]>([]);
  const [estateDropdown, setEstateDropdown] = useState<number | "">("");

  // Postal code from estate — used to improve map geocoding
  const [estateZipCode, setEstateZipCode] = useState<string>("");
  const [estateZipPlace, setEstateZipPlace] = useState<string>("");

  // Map
  const [showMap, setShowMap] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Configurable lists
  const [befaringsomradeItems, setBefaringsomradeItems] = useState<{ code: string; description: string }[]>([]);
  const [tiltakstypeItems, setTiltakstypeItems] = useState<{ code: string; description: string }[]>([]);
  const [bakgrunnItems, setBakgrunnItems] = useState<{ label: string; en_label: string | null }[]>([]);
  const [befaringsomrade, setBefaringsomrade] = useState<string[]>([]);
  const [tiltakstype, setTiltakstype] = useState<string[]>([]);
  const [selectedBakgrunn, setSelectedBakgrunn] = useState<string[]>([]);

  // Step 2 fields
  const [measureTypeId, setMeasureTypeId] = useState<MeasureTypeId | "">("");
  const [selectedTags, setSelectedTags] = useState<PropertyTag[]>([]);

  // Fetch configurable lists on mount
  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      const headers = { Authorization: `Bearer ${session.access_token}` };
      Promise.all([
        fetch("/api/inspection-codetables?type=supervision-area", { headers }).then((r) => r.json()),
        fetch("/api/inspection-codetables?type=measure-type", { headers }).then((r) => r.json()),
        fetch("/api/inspection-config?category=bakgrunn", { headers }).then((r) => r.json()),
      ]).then(([a, b, c]) => {
        setBefaringsomradeItems(a.items ?? []);
        setTiltakstypeItems(b.items ?? []);
        setBakgrunnItems(c.items ?? []);
      });
    });
  }, []);

  // Auto-fill inspector name
  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const meta = user.user_metadata ?? {};
      const name =
        (meta.first_name && meta.last_name
          ? `${meta.first_name} ${meta.last_name}`
          : meta.first_name ?? meta.last_name ?? null) ??
        meta.full_name ??
        meta.name ??
        user.email ??
        "";
      setInspectorName(name);
    });
  }, []);

  // Fetch contacts + estates when case number changes
  const fetchCaseData = useCallback(
    async (cn: string) => {
      if (!cn) {
        setCaseContacts([]);
        setEstates([]);
        setStages([]);
        setSelectedStageRecno(null);
        return;
      }

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const headers = { Authorization: `Bearer ${session.access_token}` };

      setContactsLoading(true);
      setEstatesLoading(true);
      setStagesLoading(true);

      // Fetch contacts, estates and stages in parallel
      const [contactsRes, estatesRes, stagesRes] = await Promise.allSettled([
        fetch(
          `/api/sif/case-contacts?caseNumber=${encodeURIComponent(cn)}`,
          { headers }
        ).then((r) => r.json()),
        fetch(
          `/api/sif/case-estates?caseNumber=${encodeURIComponent(cn)}`,
          { headers }
        ).then((r) => r.json()),
        fetch(
          `/api/sif/case-stages?caseNumber=${encodeURIComponent(cn)}`,
          { headers }
        ).then((r) => r.json()),
      ]);

      setContactsLoading(false);
      setEstatesLoading(false);
      setStagesLoading(false);

      if (
        contactsRes.status === "fulfilled" &&
        contactsRes.value.ok &&
        contactsRes.value.contacts?.length > 0
      ) {
        setCaseContacts(contactsRes.value.contacts);
      } else {
        setCaseContacts([]);
      }

      if (
        estatesRes.status === "fulfilled" &&
        estatesRes.value.ok &&
        estatesRes.value.estates?.length > 0
      ) {
        const fetchedEstates: SifEstate[] = estatesRes.value.estates;
        setEstates(fetchedEstates);
        // Auto-select all estates
        setSelectedEstates(fetchedEstates);
        // Auto-fill property fields from first estate
        if (fetchedEstates[0]) {
          fillFromEstate(fetchedEstates[0]);
        }
      } else {
        setEstates([]);
      }

      if (
        stagesRes.status === "fulfilled" &&
        stagesRes.value.ok &&
        stagesRes.value.stages?.length > 0
      ) {
        const fetchedStages: SifCaseStage[] = stagesRes.value.stages;
        setStages(fetchedStages);
        // Auto-select if only one stage
        if (fetchedStages.length === 1 && fetchedStages[0].recno) {
          setSelectedStageRecno(fetchedStages[0].recno);
        } else {
          setSelectedStageRecno(null);
        }
      } else {
        setStages([]);
        setSelectedStageRecno(null);
      }
    },
    [propertyAddress]
  );

  useEffect(() => {
    // Require at least 4 characters and debounce 400 ms to avoid a PNB
    // API call on every keystroke while the user is still typing.
    if (caseNumber.trim().length < 4) {
      setCaseContacts([]);
      setEstates([]);
      setStages([]);
      setSelectedStageRecno(null);
      return;
    }
    const timer = setTimeout(() => { fetchCaseData(caseNumber); }, 400);
    return () => clearTimeout(timer);
  }, [caseNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  function fillFromEstate(estate: SifEstate) {
    if (estate.address) setPropertyAddress(estate.address);
    if (estate.gnr) setGnr(estate.gnr);
    if (estate.bnr) setBnr(estate.bnr);
    if (estate.snr) setSnr(estate.snr); else setSnr("");
    if (estate.fnr) setFnr(estate.fnr); else setFnr("");
    setEstateZipCode(estate.zipCode ?? "");
    setEstateZipPlace(estate.zipPlace ?? "");
  }

  function addParticipant() {
    if (!participantDropdown) return;
    const contact = caseContacts.find((c) => c.recno === participantDropdown);
    if (!contact) return;
    if (participants.some((p) => p.recno === contact.recno)) return;
    setParticipants((prev) => [...prev, contact]);
    setParticipantDropdown("");
  }

  function removeParticipant(recno: number) {
    setParticipants((prev) => prev.filter((p) => p.recno !== recno));
  }

  function addEstate() {
    if (!estateDropdown) return;
    const estate = estates.find((e) => e.recno === estateDropdown);
    if (!estate) return;
    if (selectedEstates.some((e) => e.recno === estate.recno)) return;
    setSelectedEstates((prev) => [...prev, estate]);
    setEstateDropdown("");
    // Fill property fields if only this estate is selected
    if (selectedEstates.length === 0) fillFromEstate(estate);
  }

  function removeEstate(recno: number) {
    setSelectedEstates((prev) => prev.filter((e) => e.recno !== recno));
  }

  function addExternalParticipant() {
    if ((!extDraft.firstName.trim() && !extDraft.lastName.trim()) || !extDraft.companyRecno) return;
    const firstName = extDraft.firstName.trim();
    const lastName = extDraft.lastName.trim();
    setExternalParticipants((prev) => [...prev, {
      id: crypto.randomUUID(),
      name: [firstName, lastName].filter(Boolean).join(" "),
      firstName,
      lastName,
      role: extDraft.role.trim() || undefined,
      company: extDraft.company.trim(),
      companyRecno: extDraft.companyRecno,
    }]);
    setExtDraft({ firstName: "", lastName: "", role: "", company: "", companyRecno: undefined });
    setShowExtForm(false);
  }

  function removeExternalParticipant(id: string) {
    setExternalParticipants((prev) => prev.filter((p) => p.id !== id));
  }

  function estateLabel(e: SifEstate): string {
    const parts: string[] = [];
    if (e.address) parts.push(e.address);
    const matrikkel = [e.gnr, e.bnr, e.snr, e.fnr].filter(Boolean).join("/");
    if (matrikkel) parts.push(matrikkel);
    return parts.join(" — ");
  }

  function toggleTag(tag: PropertyTag) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit() {
    if (!measureTypeId) {
      setError(t.newInspection.errorNoMeasureType);
      return;
    }
    setLoading(true);
    setError("");

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const res = await fetch("/api/inspections", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
      },
      body: JSON.stringify({
        property_address: propertyAddress,
        case_number: caseNumber || undefined,
        case_title: caseTitle || undefined,
        gnr: gnr || undefined,
        bnr: bnr || undefined,
        snr: snr || undefined,
        fnr: fnr || undefined,
        applicant_name: applicantName || undefined,
        applicant_recno: applicantRecno ?? undefined,
        inspector_name: inspectorName || undefined,
        inspection_date: inspectionDate,
        notes: notes || undefined,
        measure_type_id: measureTypeId,
        selected_tags: selectedTags,
        participants,
        external_participants: externalParticipants,
        estates: selectedEstates,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        sif_stage_recno: selectedStageRecno ?? undefined,
        befaringsomrade,
        tiltakstype,
        bakgrunn: selectedBakgrunn,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? t.newInspection.errorGeneric);
      setLoading(false);
      return;
    }

    const { id } = await res.json();
    router.push(`/dashboard/inspections/${id}`);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t.newInspection.title}</h1>
        <div className="flex items-center gap-2 mt-3">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`flex items-center gap-1 text-sm font-medium ${
                step === s ? "text-brand-600" : "text-gray-400 dark:text-slate-500"
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === s
                    ? "bg-brand-600 text-white"
                    : step > s
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
                }`}
              >
                {s}
              </span>
              {s === 1 ? t.newInspection.step1 : t.newInspection.step2}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
        {/* Step 1: Case metadata */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Case number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                {t.newInspection.caseNumber}
              </label>
              <CaseSearchInput
                value={caseNumber}
                onChange={(val) => { setCaseNumber(val); if (!val) setCaseTitle(""); }}
                onSelect={(c) => { setCaseNumber(c.caseNumber); setCaseTitle(c.title); }}
                placeholder={t.newInspection.caseSearchPlaceholder}
              />
              {caseTitle && (
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400 truncate" title={caseTitle}>
                  {caseTitle}
                </p>
              )}
            </div>

            {/* Estates section */}
            {(estatesLoading || estates.length > 0) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  {t.newInspection.estates}
                </label>
                {estatesLoading ? (
                  <p className="text-sm text-gray-400 dark:text-slate-500 animate-pulse">
                    {t.newInspection.loadingEstates}
                  </p>
                ) : (
                  <>
                    {/* Selected estates */}
                    {selectedEstates.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {selectedEstates.map((e) => (
                          <span
                            key={e.recno}
                            className="inline-flex items-center gap-1 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 border border-brand-200 dark:border-brand-800 rounded-full px-3 py-1 text-xs font-medium"
                          >
                            <button
                              type="button"
                              onClick={() => fillFromEstate(e)}
                              className="hover:underline text-left"
                              title={t.newInspection.fillFromEstate}
                            >
                              {estateLabel(e)}
                            </button>
                            <button
                              onClick={() => removeEstate(e.recno)}
                              className="ml-1 text-brand-400 dark:text-brand-500 hover:text-brand-700 dark:hover:text-brand-300 leading-none"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Add estate dropdown */}
                    {estates.some(
                      (e) => !selectedEstates.find((s) => s.recno === e.recno)
                    ) && (
                      <div className="flex gap-2">
                        <select
                          value={estateDropdown}
                          onChange={(ev) =>
                            setEstateDropdown(
                              ev.target.value ? Number(ev.target.value) : ""
                            )
                          }
                          className="flex-1 input text-sm"
                        >
                          <option value="">{t.newInspection.addEstateOption}</option>
                          {estates
                            .filter(
                              (e) =>
                                !selectedEstates.find((s) => s.recno === e.recno)
                            )
                            .map((e) => (
                              <option key={e.recno} value={e.recno}>
                                {estateLabel(e)}
                              </option>
                            ))}
                        </select>
                        <button
                          onClick={addEstate}
                          disabled={!estateDropdown}
                          className="px-3 py-2 bg-brand-600 text-white rounded-xl text-sm disabled:opacity-40 hover:bg-brand-700 transition"
                        >
                          {t.newInspection.add}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Stage (behandlingstrinn) */}
            {(stagesLoading || stages.length > 0) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  {t.inspection.behandlingstrinn}
                </label>
                {stagesLoading ? (
                  <p className="text-sm text-gray-400 dark:text-slate-500 animate-pulse">{t.inspection.loadingTreatmentSteps}</p>
                ) : (
                  <select
                    value={selectedStageRecno ?? ""}
                    onChange={(e) =>
                      setSelectedStageRecno(e.target.value ? Number(e.target.value) : null)
                    }
                    className="input"
                  >
                    <option value="">{t.inspection.selectTreatmentStep}</option>
                    {stages.map((s) => (
                      <option key={s.recno} value={s.recno}>
                        {s.title ?? `Trinn ${s.recno}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Eiendomsinformasjon – grouped card */}
            <div className="rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/30 p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                {t.newInspection.propertyInfo}
              </p>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  {t.newInspection.propertyAddress} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                  required
                  placeholder="Storgata 1, 0001 Oslo"
                  className="input"
                />
              </div>

              {/* Matrikkel: Gnr / Bnr / Snr / Fnr */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Gnr</label>
                  <input type="text" value={gnr} onChange={(e) => setGnr(e.target.value)} placeholder="123" className="input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bnr</label>
                  <input type="text" value={bnr} onChange={(e) => setBnr(e.target.value)} placeholder="45" className="input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Snr</label>
                  <input type="text" value={snr} onChange={(e) => setSnr(e.target.value)} placeholder="0" className="input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fnr</label>
                  <input type="text" value={fnr} onChange={(e) => setFnr(e.target.value)} placeholder="0" className="input text-sm" />
                </div>
              </div>
            </div>

            {/* Date + Inspector */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  {t.newInspection.inspectionDate} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  {t.newInspection.inspector}
                </label>
                <input
                  type="text"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  placeholder={t.newInspection.inspectorPlaceholder}
                  className="input"
                />
              </div>
            </div>

            {/* Applicant */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                {t.newInspection.applicantName}
              </label>
              {caseContacts.length > 0 ? (
                <select
                  value={applicantName}
                  onChange={(e) => {
                    const name = e.target.value;
                    setApplicantName(name);
                    const contact = caseContacts.find((c) => c.name === name);
                    setApplicantRecno(contact ? contact.recno : null);
                  }}
                  className="input"
                >
                  <option value="">{t.newInspection.selectFromCaseOrType}</option>
                  {caseContacts.map((c) => (
                    <option key={c.recno} value={c.name}>
                      {c.name}
                      {c.role ? ` (${c.role})` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder={
                    contactsLoading ? t.newInspection.loadingContacts : "Ola Nordmann"
                  }
                  className="input"
                />
              )}
            </div>

            {/* Participants */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                {t.newInspection.participants}
              </label>
              {participants.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {participants.map((p) => (
                    <span
                      key={p.recno}
                      className="inline-flex items-center gap-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-full px-3 py-1 text-xs font-medium"
                    >
                      {p.name}
                      {p.role && (
                        <span className="text-gray-400 dark:text-slate-500"> · {p.role}</span>
                      )}
                      <button
                        onClick={() => removeParticipant(p.recno)}
                        className="ml-1 text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 leading-none"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {caseContacts.length > 0 ? (
                <div className="flex gap-2">
                  <select
                    value={participantDropdown}
                    onChange={(e) =>
                      setParticipantDropdown(
                        e.target.value ? Number(e.target.value) : ""
                      )
                    }
                    className="flex-1 input text-sm"
                  >
                    <option value="">{t.newInspection.selectParticipant}</option>
                    {caseContacts
                      .filter(
                        (c) => !participants.find((p) => p.recno === c.recno)
                      )
                      .map((c) => (
                        <option key={c.recno} value={c.recno}>
                          {c.name}
                          {c.role ? ` (${c.role})` : ""}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={addParticipant}
                    disabled={!participantDropdown}
                    className="px-3 py-2 bg-brand-600 text-white rounded-xl text-sm disabled:opacity-40 hover:bg-brand-700 transition"
                  >
                    {t.newInspection.add}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-slate-500">
                  {contactsLoading
                    ? t.newInspection.loadingCaseContacts
                    : caseNumber
                    ? t.newInspection.noContactsFound
                    : t.newInspection.selectCaseForContacts}
                </p>
              )}
            </div>

            {/* External participants */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Eksterne deltakere{" "}
                <span className="text-gray-400 dark:text-slate-500 font-normal text-xs">(f.eks. Brannvernleder, Verneombud)</span>
              </label>
              {externalParticipants.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {externalParticipants.map((ep) => (
                    <span
                      key={ep.id}
                      className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full px-3 py-1 text-xs font-medium"
                    >
                      {ep.name}
                      {ep.role && <span className="text-amber-500 dark:text-amber-400"> · {ep.role}</span>}
                      {ep.company && <span className="text-amber-500 dark:text-amber-400"> · {ep.company}</span>}
                      <button
                        onClick={() => removeExternalParticipant(ep.id)}
                        className="ml-1 text-amber-400 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 leading-none"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {showExtForm ? (
                <div className="border border-gray-200 dark:border-slate-600 rounded-xl p-3 space-y-2 bg-gray-50 dark:bg-slate-700/50">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Fornavn"
                      value={extDraft.firstName}
                      onChange={(e) => setExtDraft((d) => ({ ...d, firstName: e.target.value }))}
                      className="input text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Etternavn"
                      value={extDraft.lastName}
                      onChange={(e) => setExtDraft((d) => ({ ...d, lastName: e.target.value }))}
                      className="input text-sm"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Rolle (valgfri)"
                    value={extDraft.role}
                    onChange={(e) => setExtDraft((d) => ({ ...d, role: e.target.value }))}
                    className="input text-sm"
                  />
                  <EnterpriseSearchInput
                    value={extDraft.company}
                    onChange={(name) => setExtDraft((d) => ({ ...d, company: name, companyRecno: undefined }))}
                    onSelect={(enterprise: SifEnterpriseResult) =>
                      setExtDraft((d) => ({ ...d, company: enterprise.Name, companyRecno: enterprise.Recno }))
                    }
                    placeholder="Foretak * (søk i Plan & Build)"
                    className="input text-sm"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => { setShowExtForm(false); setExtDraft({ firstName: "", lastName: "", role: "", company: "", companyRecno: undefined }); }}
                      className="text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                    >
                      Avbryt
                    </button>
                    <button
                      type="button"
                      onClick={addExternalParticipant}
                      disabled={(!extDraft.firstName.trim() && !extDraft.lastName.trim()) || !extDraft.companyRecno}
                      className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm disabled:opacity-40 hover:bg-brand-700 transition"
                    >
                      Legg til
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowExtForm(true)}
                  className="text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium"
                >
                  {t.inspection.addExternalParticipant}
                </button>
              )}
            </div>

            {/* Befaringsområde (multi-select fra PNB-kodetabell) */}
            {befaringsomradeItems.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {t.inspection.befaringsomrade}
                </label>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {befaringsomradeItems.map((item) => (
                    <label key={item.code} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={befaringsomrade.includes(item.code)}
                        onChange={() =>
                          setBefaringsomrade((prev) =>
                            prev.includes(item.code)
                              ? prev.filter((v) => v !== item.code)
                              : [...prev, item.code]
                          )
                        }
                        className="w-4 h-4 accent-brand-600 flex-shrink-0"
                      />
                      <span className="text-sm text-gray-700 dark:text-slate-300">{item.description}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Tiltakstype (søkbart multi-select fra PNB-kodetabell) */}
            {tiltakstypeItems.length > 0 && (
              <SearchableMultiSelect
                label={t.inspection.tiltakstype}
                items={tiltakstypeItems}
                selected={tiltakstype}
                onChange={setTiltakstype}
                placeholder="Søk etter tiltakstype..."
              />
            )}

            {/* Bakgrunn for tilsynet */}
            {bakgrunnItems.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {t.inspection.bakgrunn}
                </label>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {bakgrunnItems.map((item) => (
                    <label
                      key={item.label}
                      className="flex items-center gap-2 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={selectedBakgrunn.includes(item.label)}
                        onChange={() =>
                          setSelectedBakgrunn((prev) =>
                            prev.includes(item.label)
                              ? prev.filter((v) => v !== item.label)
                              : [...prev, item.label]
                          )
                        }
                        className="w-4 h-4 accent-brand-600 flex-shrink-0"
                      />
                      <span className="text-sm text-gray-700 dark:text-slate-300">
                        {locale === "en" && item.en_label ? item.en_label : item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                {t.newInspection.notes}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="input resize-none"
                placeholder={t.newInspection.notesPlaceholder}
              />
            </div>

            {/* Map */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                {t.newInspection.mapPosition}
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowMap(true)}
                  type="button"
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition text-gray-700 dark:text-slate-300"
                >
                  🗺️{" "}
                  {latitude != null
                    ? t.newInspection.changePosition
                    : t.newInspection.selectPosition}
                </button>
                {latitude != null && longitude != null && (
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    {latitude.toFixed(5)}°N, {longitude.toFixed(5)}°Ø
                    <button
                      onClick={() => {
                        setLatitude(null);
                        setLongitude(null);
                      }}
                      className="ml-2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
                    >
                      ✕
                    </button>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Measure type + properties */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-slate-200 mb-3">
                {t.newInspection.selectMeasureType}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {MEASURE_TYPES.map((mt) => (
                  <button
                    key={mt.id}
                    onClick={() => setMeasureTypeId(mt.id)}
                    className={`border-2 rounded-xl p-3 text-left transition ${
                      measureTypeId === mt.id
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                        : "border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500"
                    }`}
                  >
                    <span className="text-2xl">{mt.icon}</span>
                    <p className="font-medium text-sm mt-1 dark:text-slate-100">{mt.name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      {mt.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-slate-200 mb-1">
                {t.newInspection.measureProperties}
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
                {t.newInspection.measurePropertiesHint}
              </p>
              <div className="space-y-2">
                {PROPERTY_QUESTIONS.map((q) => (
                  <label
                    key={q.tag}
                    className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700/30 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(q.tag)}
                      onChange={() => toggleTag(q.tag)}
                      className="mt-0.5 w-5 h-5 accent-brand-600 flex-shrink-0"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-slate-200">
                        {q.label}
                      </p>
                      {q.description && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                          {q.description}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-between mt-6">
          {step === 1 ? (
            <div />
          ) : (
            <button
              onClick={() => setStep(1)}
              className="text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 font-medium"
            >
              {t.newInspection.back}
            </button>
          )}

          {step === 1 ? (
            <button
              onClick={() => {
                if (!propertyAddress.trim()) {
                  setError(t.newInspection.errorNoAddress);
                  return;
                }
                setError("");
                setStep(2);
              }}
              className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-xl transition"
            >
              {t.newInspection.next}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || !measureTypeId}
              className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-xl transition disabled:opacity-50"
            >
              {loading ? t.newInspection.creating : t.newInspection.createInspection}
            </button>
          )}
        </div>
      </div>

      {showMap && (
        <MapPickerModal
          initialLat={latitude}
          initialLng={longitude}
          addressHint={[propertyAddress, estateZipCode, estateZipPlace].filter(Boolean).join(" ") || undefined}
          title={t.newInspection.mapTitle}
          onSave={(lat, lng) => {
            setLatitude(lat);
            setLongitude(lng);
            setShowMap(false);
          }}
          onClose={() => setShowMap(false)}
        />
      )}
    </div>
  );
}
