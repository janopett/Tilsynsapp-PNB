"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MEASURE_TYPES, PROPERTY_QUESTIONS } from "@/data/seed/measure-types";
import type { MeasureTypeId, PropertyTag } from "@/types";
import { createClient } from "@/lib/supabase/client";
import CaseSearchInput from "@/components/sif/CaseSearchInput";

export default function NewInspectionPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1 fields
  const [propertyAddress, setPropertyAddress] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [gnr, setGnr] = useState("");
  const [bnr, setBnr] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [inspectorName, setInspectorName] = useState("");
  const [inspectionDate, setInspectionDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  // Auto-fill inspector name from logged-in user
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
  const [notes, setNotes] = useState("");

  // Step 2 fields
  const [measureTypeId, setMeasureTypeId] = useState<MeasureTypeId | "">("");
  const [selectedTags, setSelectedTags] = useState<PropertyTag[]>([]);

  function toggleTag(tag: PropertyTag) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit() {
    if (!measureTypeId) {
      setError("Velg tiltakstype.");
      return;
    }
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    const res = await fetch("/api/inspections", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        property_address: propertyAddress,
        case_number: caseNumber || undefined,
        gnr: gnr || undefined,
        bnr: bnr || undefined,
        applicant_name: applicantName || undefined,
        inspector_name: inspectorName || undefined,
        inspection_date: inspectionDate,
        notes: notes || undefined,
        measure_type_id: measureTypeId,
        selected_tags: selectedTags,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Noe gikk galt.");
      setLoading(false);
      return;
    }

    const { id } = await res.json();
    router.push(`/dashboard/inspections/${id}`);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nytt tilsyn</h1>
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
              {s === 1 ? "Saksopplysninger" : "Tiltakstype"}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Step 1: Case metadata */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Eiendomsadresse <span className="text-red-500">*</span>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Saksnummer
                </label>
                <CaseSearchInput
                  value={caseNumber}
                  onChange={setCaseNumber}
                  placeholder="Søk på saksnummer eller tittel…"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dato for tilsyn <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                  className="input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gårdsnummer (Gnr)
                </label>
                <input
                  type="text"
                  value={gnr}
                  onChange={(e) => setGnr(e.target.value)}
                  placeholder="123"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bruksnummer (Bnr)
                </label>
                <input
                  type="text"
                  value={bnr}
                  onChange={(e) => setBnr(e.target.value)}
                  placeholder="45"
                  className="input"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Søkers navn
              </label>
              <input
                type="text"
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                placeholder="Ola Nordmann"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tilsynsfører
              </label>
              <input
                type="text"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                placeholder="Saksbehandler"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Generelle merknader
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="input resize-none"
                placeholder="Eventuelle generelle kommentarer til tilsynet..."
              />
            </div>
          </div>
        )}

        {/* Step 2: Measure type + properties */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-3">
                Velg tiltakstype
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
                    <p className="text-xs text-gray-500 mt-0.5">{mt.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-1">
                Egenskaper ved tiltaket
              </h2>
              <p className="text-sm text-gray-500 mb-3">
                Kryss av det som gjelder. Sjekklisten tilpasses basert på valgene dine.
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
                      <p className="text-sm font-medium text-gray-800">{q.label}</p>
                      {q.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{q.description}</p>
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
              ← Tilbake
            </button>
          )}

          {step === 1 ? (
            <button
              onClick={() => {
                if (!propertyAddress.trim()) {
                  setError("Eiendomsadresse er påkrevd.");
                  return;
                }
                setError("");
                setStep(2);
              }}
              className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-xl transition"
            >
              Neste →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || !measureTypeId}
              className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-xl transition disabled:opacity-50"
            >
              {loading ? "Oppretter..." : "Opprett tilsyn"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
