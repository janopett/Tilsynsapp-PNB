"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MEASURE_TYPES, PROPERTY_QUESTIONS } from "@/data/seed/measure-types";
import type { MeasureTypeId, PropertyTag, SifContact, SifEstate } from "@/types";
import { createClient } from "@/lib/supabase/client";
import CaseSearchInput from "@/components/sif/CaseSearchInput";
import MapPickerModal from "@/components/ui/MapPickerModal";
import { useLanguage } from "@/lib/i18n";

export default function NewInspectionPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1 fields
  const [propertyAddress, setPropertyAddress] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [caseTitle, setCaseTitle] = useState("");
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

  // Participants
  const [participants, setParticipants] = useState<SifContact[]>([]);
  const [participantDropdown, setParticipantDropdown] = useState<number | "">("");

  // Estates from case
  const [estates, setEstates] = useState<SifEstate[]>([]);
  const [estatesLoading, setEstatesLoading] = useState(false);
  const [selectedEstates, setSelectedEstates] = useState<SifEstate[]>([]);
  const [estateDropdown, setEstateDropdown] = useState<number | "">("");

  // Map
  const [showMap, setShowMap] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Step 2 fields
  const [measureTypeId, setMeasureTypeId] = useState<MeasureTypeId | "">("");
  const [selectedTags, setSelectedTags] = useState<PropertyTag[]>([]);

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

      // Fetch contacts and estates in parallel
      const [contactsRes, estatesRes] = await Promise.allSettled([
        fetch(
          `/api/sif/case-contacts?caseNumber=${encodeURIComponent(cn)}`,
          { headers }
        ).then((r) => r.json()),
        fetch(
          `/api/sif/case-estates?caseNumber=${encodeURIComponent(cn)}`,
          { headers }
        ).then((r) => r.json()),
      ]);

      setContactsLoading(false);
      setEstatesLoading(false);

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
    },
    [propertyAddress]
  );

  useEffect(() => {
    fetchCaseData(caseNumber);
  }, [caseNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  function fillFromEstate(estate: SifEstate) {
    if (estate.address) setPropertyAddress(estate.address);
    if (estate.gnr) setGnr(estate.gnr);
    if (estate.bnr) setBnr(estate.bnr);
    if (estate.snr) setSnr(estate.snr); else setSnr("");
    if (estate.fnr) setFnr(estate.fnr); else setFnr("");
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
        inspector_name: inspectorName || undefined,
        inspection_date: inspectionDate,
        notes: notes || undefined,
        measure_type_id: measureTypeId,
        selected_tags: selectedTags,
        participants,
        estates: selectedEstates,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
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
        <h1 className="text-2xl font-bold text-gray-900">{t.newInspection.title}</h1>
        <div className="flex items-center gap-2 mt-3">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`flex items-center gap-1 text-sm font-medium ${
                step === s ? "text-brand-600" : "text-gray-400"
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === s
                    ? "bg-brand-600 text-white"
                    : step > s
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {s}
              </span>
              {s === 1 ? t.newInspection.step1 : t.newInspection.step2}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Step 1: Case metadata */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Case number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.newInspection.caseNumber}
              </label>
              <CaseSearchInput
                value={caseNumber}
                onChange={(val) => { setCaseNumber(val); if (!val) setCaseTitle(""); }}
                onSelect={(c) => { setCaseNumber(c.caseNumber); setCaseTitle(c.title); }}
                placeholder={t.newInspection.caseSearchPlaceholder}
              />
              {caseTitle && (
                <p className="mt-1 text-xs text-gray-500 truncate" title={caseTitle}>
                  {caseTitle}
                </p>
              )}
            </div>

            {/* Estates section */}
            {(estatesLoading || estates.length > 0) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.newInspection.estates}
                </label>
                {estatesLoading ? (
                  <p className="text-sm text-gray-400 animate-pulse">
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
                            className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 border border-brand-200 rounded-full px-3 py-1 text-xs font-medium"
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
                              className="ml-1 text-brand-400 hover:text-brand-700 leading-none"
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

            {/* Eiendomsinformasjon – grouped card */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {t.newInspection.propertyInfo}
              </p>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.newInspection.propertyAddress} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                  required
                  placeholder="Storgata 1, 0001 Oslo"
                  className="input bg-white"
                />
              </div>

              {/* Matrikkel: Gnr / Bnr / Snr / Fnr */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Gnr</label>
                  <input type="text" value={gnr} onChange={(e) => setGnr(e.target.value)} placeholder="123" className="input bg-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bnr</label>
                  <input type="text" value={bnr} onChange={(e) => setBnr(e.target.value)} placeholder="45" className="input bg-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Snr</label>
                  <input type="text" value={snr} onChange={(e) => setSnr(e.target.value)} placeholder="0" className="input bg-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fnr</label>
                  <input type="text" value={fnr} onChange={(e) => setFnr(e.target.value)} placeholder="0" className="input bg-white text-sm" />
                </div>
              </div>
            </div>

            {/* Date + Inspector */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.newInspection.applicantName}
              </label>
              {caseContacts.length > 0 ? (
                <select
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.newInspection.participants}
              </label>
              {participants.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {participants.map((p) => (
                    <span
                      key={p.recno}
                      className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-xs font-medium"
                    >
                      {p.name}
                      {p.role && (
                        <span className="text-gray-400"> · {p.role}</span>
                      )}
                      <button
                        onClick={() => removeParticipant(p.recno)}
                        className="ml-1 text-gray-400 hover:text-gray-700 leading-none"
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
                <p className="text-sm text-gray-400">
                  {contactsLoading
                    ? t.newInspection.loadingCaseContacts
                    : caseNumber
                    ? t.newInspection.noContactsFound
                    : t.newInspection.selectCaseForContacts}
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.newInspection.mapPosition}
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowMap(true)}
                  type="button"
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition text-gray-700"
                >
                  🗺️{" "}
                  {latitude != null
                    ? t.newInspection.changePosition
                    : t.newInspection.selectPosition}
                </button>
                {latitude != null && longitude != null && (
                  <span className="text-xs text-gray-500">
                    {latitude.toFixed(5)}°N, {longitude.toFixed(5)}°Ø
                    <button
                      onClick={() => {
                        setLatitude(null);
                        setLongitude(null);
                      }}
                      className="ml-2 text-gray-400 hover:text-gray-600"
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
              <h2 className="text-base font-semibold text-gray-800 mb-3">
                {t.newInspection.selectMeasureType}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {MEASURE_TYPES.map((mt) => (
                  <button
                    key={mt.id}
                    onClick={() => setMeasureTypeId(mt.id)}
                    className={`border-2 rounded-xl p-3 text-left transition ${
                      measureTypeId === mt.id
                        ? "border-brand-500 bg-brand-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-2xl">{mt.icon}</span>
                    <p className="font-medium text-sm mt-1">{mt.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {mt.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-1">
                {t.newInspection.measureProperties}
              </h2>
              <p className="text-sm text-gray-500 mb-3">
                {t.newInspection.measurePropertiesHint}
              </p>
              <div className="space-y-2">
                {PROPERTY_QUESTIONS.map((q) => (
                  <label
                    key={q.tag}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(q.tag)}
                      onChange={() => toggleTag(q.tag)}
                      className="mt-0.5 w-5 h-5 accent-brand-600 flex-shrink-0"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {q.label}
                      </p>
                      {q.description && (
                        <p className="text-xs text-gray-500 mt-0.5">
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
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-between mt-6">
          {step === 1 ? (
            <div />
          ) : (
            <button
              onClick={() => setStep(1)}
              className="text-gray-600 hover:text-gray-900 font-medium"
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
          addressHint={propertyAddress || undefined}
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
