"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type {
  InspectionWithAnswers,
  CheckpointWithAnswer,
  CheckpointStatus,
  CheckpointCategory,
  SifContact,
  SifEstate,
} from "@/types";
import {
  filterCheckpoints,
  mergeCheckpointsWithAnswers,
  groupByCategory,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  calculateSummary,
} from "@/lib/checklist/filter-engine";
import CheckpointItem from "@/components/checklist/CheckpointItem";
import ArchivePanel from "@/components/archive/ArchivePanel";
import StatusBadge from "@/components/ui/StatusBadge";
import MapPickerModal from "@/components/ui/MapPickerModal";
import CaseSearchInput from "@/components/sif/CaseSearchInput";

// Dummy contacts shown when case contacts can't be loaded from PNB
const DUMMY_CONTACTS: SifContact[] = [
  { recno: 1, name: "Ola Byggesen", role: "SØK", roleDescription: "Ansvarlig søker", type: "enterprise" },
  { recno: 2, name: "Kari Tiltakshaver", role: "TILT", roleDescription: "Tiltakshaver", type: "privatePerson" },
  { recno: 3, name: "Per Foretak AS", role: "UTF", roleDescription: "Ansvarlig utførende", type: "enterprise" },
];

type Tab = "checklist" | "summary" | "archive";

// ── Edit Modal ──────────────────────────────────────────────────────────────

interface EditModalProps {
  inspection: InspectionWithAnswers;
  caseContacts: SifContact[];
  onSaved: () => void;
  onClose: () => void;
}

function EditModal({ inspection, caseContacts, onSaved, onClose }: EditModalProps) {
  const [propertyAddress, setPropertyAddress] = useState(inspection.property_address);
  const [caseNumber, setCaseNumber] = useState(inspection.case_number ?? "");
  const [gnr, setGnr] = useState(inspection.gnr ?? "");
  const [bnr, setBnr] = useState(inspection.bnr ?? "");
  const [applicantName, setApplicantName] = useState(inspection.applicant_name ?? "");
  const [inspectorName, setInspectorName] = useState(inspection.inspector_name ?? "");
  const [inspectionDate, setInspectionDate] = useState(inspection.inspection_date);
  const [notes, setNotes] = useState(inspection.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Participants
  const [participants, setParticipants] = useState<SifContact[]>(
    inspection.participants ?? []
  );
  const [participantDropdown, setParticipantDropdown] = useState<number | "">("");

  // Estates
  const [selectedEstates, setSelectedEstates] = useState<SifEstate[]>(
    inspection.estates ?? []
  );

  // Map
  const [showMap, setShowMap] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(inspection.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(inspection.longitude ?? null);

  function addParticipant() {
    if (!participantDropdown) return;
    const contact = caseContacts.find((c) => c.recno === participantDropdown);
    if (!contact || participants.some((p) => p.recno === contact.recno)) return;
    setParticipants((prev) => [...prev, contact]);
    setParticipantDropdown("");
  }

  function removeParticipant(recno: number) {
    setParticipants((prev) => prev.filter((p) => p.recno !== recno));
  }

  function removeEstate(recno: number) {
    setSelectedEstates((prev) => prev.filter((e) => e.recno !== recno));
  }

  function estateLabel(e: SifEstate): string {
    const parts = [e.address];
    if (e.gnr && e.bnr) parts.push(`Gnr/Bnr: ${e.gnr}/${e.bnr}`);
    return parts.filter(Boolean).join(" — ");
  }

  async function handleSave() {
    if (!propertyAddress.trim()) {
      setError("Eiendomsadresse er påkrevd.");
      return;
    }
    setSaving(true);
    setError("");

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("inspections")
      .update({
        property_address: propertyAddress,
        case_number: caseNumber || null,
        gnr: gnr || null,
        bnr: bnr || null,
        applicant_name: applicantName || null,
        inspector_name: inspectorName || null,
        inspection_date: inspectionDate,
        notes: notes || null,
        participants,
        estates: selectedEstates,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      })
      .eq("id", inspection.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl my-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Rediger tilsyn</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Case number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Saksnummer</label>
            <CaseSearchInput value={caseNumber} onChange={setCaseNumber} placeholder="Søk på saksnummer…" />
          </div>

          {/* Property address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Eiendomsadresse <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={propertyAddress}
              onChange={(e) => setPropertyAddress(e.target.value)}
              className="input"
            />
          </div>

          {/* Date + Inspector */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dato</label>
              <input
                type="date"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tilsynsfører</label>
              <input
                type="text"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                className="input"
              />
            </div>
          </div>

          {/* Gnr/Bnr */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gnr</label>
              <input
                type="text"
                value={gnr}
                onChange={(e) => setGnr(e.target.value)}
                placeholder="123"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bnr</label>
              <input
                type="text"
                value={bnr}
                onChange={(e) => setBnr(e.target.value)}
                placeholder="45"
                className="input"
              />
            </div>
          </div>

          {/* Applicant */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Søkers navn</label>
            {caseContacts.length > 0 ? (
              <select
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                className="input"
              >
                <option value="">— Velg eller skriv inn</option>
                {caseContacts.map((c) => (
                  <option key={c.recno} value={c.name}>
                    {c.name}{c.roleDescription ? ` (${c.roleDescription})` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                placeholder="Ola Nordmann"
                className="input"
              />
            )}
          </div>

          {/* Participants */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deltakere</label>
            {participants.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {participants.map((p) => (
                  <span
                    key={p.recno}
                    className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-xs font-medium"
                  >
                    {p.name}
                    {p.roleDescription && (
                      <span className="text-gray-400"> · {p.roleDescription}</span>
                    )}
                    <button
                      onClick={() => removeParticipant(p.recno)}
                      className="ml-1 text-gray-400 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
            {caseContacts.filter((c) => !participants.find((p) => p.recno === c.recno)).length > 0 ? (
              <div className="flex gap-2">
                <select
                  value={participantDropdown}
                  onChange={(e) =>
                    setParticipantDropdown(e.target.value ? Number(e.target.value) : "")
                  }
                  className="flex-1 input text-sm"
                >
                  <option value="">— Velg deltaker</option>
                  {caseContacts
                    .filter((c) => !participants.find((p) => p.recno === c.recno))
                    .map((c) => (
                      <option key={c.recno} value={c.recno}>
                        {c.name}{c.roleDescription ? ` (${c.roleDescription})` : ""}
                      </option>
                    ))}
                </select>
                <button
                  onClick={addParticipant}
                  disabled={!participantDropdown}
                  className="px-3 py-2 bg-brand-600 text-white rounded-xl text-sm disabled:opacity-40 hover:bg-brand-700 transition"
                >
                  Legg til
                </button>
              </div>
            ) : caseContacts.length === 0 ? (
              <p className="text-xs text-gray-400">Koble til saksnummer for å hente deltakere.</p>
            ) : null}
          </div>

          {/* Estates */}
          {selectedEstates.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Eiendommer</label>
              <div className="flex flex-wrap gap-2">
                {selectedEstates.map((e) => (
                  <span
                    key={e.recno}
                    className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 border border-brand-200 rounded-full px-3 py-1 text-xs font-medium"
                  >
                    {estateLabel(e)}
                    <button
                      onClick={() => removeEstate(e.recno)}
                      className="ml-1 text-brand-400 hover:text-brand-700"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Generelle merknader</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="input resize-none"
            />
          </div>

          {/* Map */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Posisjon i kart</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowMap(true)}
                type="button"
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition text-gray-700"
              >
                🗺️ {latitude != null ? "Endre posisjon" : "Velg posisjon i kart"}
              </button>
              {latitude != null && longitude != null && (
                <span className="text-xs text-gray-500">
                  {latitude.toFixed(5)}°N, {longitude.toFixed(5)}°Ø
                  <button
                    onClick={() => { setLatitude(null); setLongitude(null); }}
                    className="ml-2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </span>
              )}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition"
          >
            Avbryt
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-brand-600 text-white rounded-xl disabled:opacity-50 hover:bg-brand-700 transition"
          >
            {saving ? "Lagrer…" : "Lagre endringer"}
          </button>
        </div>
      </div>

      {showMap && (
        <MapPickerModal
          initialLat={latitude}
          initialLng={longitude}
          title="Velg posisjon for tilsynet"
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

// ── Main Page ──────────────────────────────────────────────────────────────

export default function InspectionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [inspection, setInspection] = useState<InspectionWithAnswers | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("checklist");
  const [activeCategory, setActiveCategory] = useState<CheckpointCategory | "all">("all");
  const [caseContacts, setCaseContacts] = useState<SifContact[]>([]);
  const [showEdit, setShowEdit] = useState(false);

  const fetchInspection = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/dashboard"); return; }

    const [inspRes, answersRes, attachRes, archivalRes] = await Promise.all([
      supabase.from("inspections").select("*").eq("id", id).eq("user_id", session.user.id).single(),
      supabase.from("inspection_answers").select("*").eq("inspection_id", id),
      supabase.from("attachments").select("*").eq("inspection_id", id),
      supabase.from("inspection_archivals").select("*").eq("inspection_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    if (inspRes.error || !inspRes.data) { router.push("/dashboard"); return; }

    const insp = {
      ...inspRes.data,
      participants: inspRes.data.participants ?? [],
      estates: inspRes.data.estates ?? [],
      answers: answersRes.data ?? [],
      attachments: attachRes.data ?? [],
      archival: archivalRes.data ?? undefined,
    };
    setInspection(insp);
    setLoading(false);

    // Load case contacts lazily
    const caseNumber = inspRes.data.case_number;
    if (caseNumber && session) {
      fetch(`/api/sif/case-contacts?caseNumber=${encodeURIComponent(caseNumber)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.ok && d.contacts?.length > 0) {
            setCaseContacts(d.contacts);
          } else {
            setCaseContacts(DUMMY_CONTACTS);
          }
        })
        .catch(() => setCaseContacts(DUMMY_CONTACTS));
    }
  }, [id, router]);

  useEffect(() => {
    fetchInspection();
  }, [fetchInspection]);

  async function updateAnswer(
    checkpointId: string,
    status: CheckpointStatus,
    comment: string,
    contactRecno: number | null = null,
    contactName: string | null = null,
    lat: number | null = null,
    lng: number | null = null
  ) {
    if (!inspection) return;
    setSavingId(checkpointId);

    const supabase = createClient();
    await supabase.from("inspection_answers").upsert(
      {
        inspection_id: id,
        checkpoint_definition_id: checkpointId,
        status,
        comment: comment || null,
        responsible_contact_recno: contactRecno,
        responsible_contact_name: contactName,
        latitude: lat,
        longitude: lng,
      },
      { onConflict: "inspection_id,checkpoint_definition_id" }
    );

    // Auto-update inspection status
    const { data: answers } = await supabase
      .from("inspection_answers")
      .select("status")
      .eq("inspection_id", id);
    if (answers?.some((a) => a.status !== "not_checked")) {
      await supabase
        .from("inspections")
        .update({ status: "in_progress" })
        .eq("id", id)
        .eq("status", "draft");
    }

    // Optimistic update
    setInspection((prev) => {
      if (!prev) return prev;
      const existing = prev.answers.findIndex(
        (a) => a.checkpoint_definition_id === checkpointId
      );
      const newAnswer = {
        id: existing >= 0 ? prev.answers[existing].id : checkpointId,
        inspection_id: id,
        checkpoint_definition_id: checkpointId,
        status,
        comment,
        responsible_contact_recno: contactRecno,
        responsible_contact_name: contactName,
        latitude: lat,
        longitude: lng,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const newAnswers =
        existing >= 0
          ? prev.answers.map((a, i) => (i === existing ? newAnswer : a))
          : [...prev.answers, newAnswer];
      return { ...prev, answers: newAnswers };
    });

    setSavingId(null);
  }

  if (loading || !inspection) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-400">
        Laster tilsyn…
      </div>
    );
  }

  const relevantCheckpoints = filterCheckpoints(
    inspection.measure_type_id,
    inspection.selected_tags
  );
  const merged = mergeCheckpointsWithAnswers(relevantCheckpoints, inspection.answers);
  const summary = calculateSummary(merged);
  const grouped = groupByCategory(merged);
  const usedCategories = CATEGORY_ORDER.filter((c) => grouped.has(c));

  const displayItems: CheckpointWithAnswer[] =
    activeCategory === "all"
      ? merged
      : grouped.get(activeCategory) ?? [];

  const participants: SifContact[] = inspection.participants ?? [];
  const estates: SifEstate[] = inspection.estates ?? [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <div className="min-w-0 flex-1">
          <Link
            href="/dashboard"
            className="text-sm text-brand-600 hover:text-brand-800 mb-1 inline-block"
          >
            ← Tilbake
          </Link>
          <h1 className="text-xl font-bold text-gray-900 truncate">
            {inspection.property_address}
          </h1>
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1 flex-wrap">
            {inspection.case_number && <span>Sak: {inspection.case_number}</span>}
            <span>
              {new Date(inspection.inspection_date).toLocaleDateString("nb-NO")}
            </span>
            <StatusBadge status={inspection.status} />
          </div>
          {/* Participants row */}
          {participants.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {participants.map((p) => (
                <span
                  key={p.recno}
                  className="inline-flex items-center bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 text-xs"
                >
                  {p.name}
                  {p.roleDescription && (
                    <span className="text-gray-400 ml-1">· {p.roleDescription}</span>
                  )}
                </span>
              ))}
            </div>
          )}
          {/* Estates row */}
          {estates.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {estates.map((e) => (
                <span
                  key={e.recno}
                  className="inline-flex items-center bg-brand-50 text-brand-700 rounded-full px-2 py-0.5 text-xs"
                >
                  🏠{" "}
                  {e.address ?? (e.gnr && e.bnr ? `Gnr/Bnr ${e.gnr}/${e.bnr}` : `Eiendom ${e.recno}`)}
                </span>
              ))}
            </div>
          )}
          {/* Coordinates */}
          {inspection.latitude != null && inspection.longitude != null && (
            <p className="text-xs text-gray-400 mt-1">
              📍 {inspection.latitude.toFixed(5)}°N, {inspection.longitude.toFixed(5)}°Ø
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setShowEdit(true)}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-xl transition"
          >
            Rediger
          </button>
          <Link
            href={`/dashboard/inspections/${id}/report`}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-xl transition"
          >
            Rapport
          </Link>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: "Totalt", value: summary.total, color: "bg-gray-100 text-gray-700" },
          { label: "OK", value: summary.ok, color: "bg-green-50 text-green-700" },
          { label: "Avvik", value: summary.deviations, color: "bg-red-50 text-red-700" },
          { label: "Ikke sjekket", value: summary.not_checked, color: "bg-yellow-50 text-yellow-700" },
        ].map((s) => (
          <div key={s.label} className={`${s.color} rounded-xl p-3 text-center`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
        {(["checklist", "summary", "archive"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab
                ? "bg-white shadow text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "checklist" && "Sjekkliste"}
            {tab === "summary" && `Avvik (${summary.deviations})`}
            {tab === "archive" && "Arkiver"}
          </button>
        ))}
      </div>

      {/* Checklist tab */}
      {activeTab === "checklist" && (
        <div>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            <button
              onClick={() => setActiveCategory("all")}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                activeCategory === "all"
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Alle ({merged.length})
            </button>
            {usedCategories.map((cat) => {
              const items = grouped.get(cat)!;
              const devs = items.filter((i) => i.answer?.status === "deviation").length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    activeCategory === cat
                      ? "bg-brand-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {CATEGORY_LABELS[cat]} ({items.length}
                  {devs > 0 ? ` · ${devs} avvik` : ""})
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            {displayItems.map((item) => (
              <CheckpointItem
                key={item.definition.id}
                item={item}
                isSaving={savingId === item.definition.id}
                contacts={caseContacts}
                onUpdate={updateAnswer}
              />
            ))}
          </div>
        </div>
      )}

      {/* Summary tab */}
      {activeTab === "summary" && (
        <div>
          {summary.deviations === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-5xl mb-3">✅</p>
              <p className="text-lg font-medium text-gray-600">Ingen avvik registrert</p>
            </div>
          ) : (
            <div className="space-y-3">
              {summary.deviation_items.map((item) => (
                <div
                  key={item.definition.id}
                  className="bg-red-50 border border-red-200 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-red-800 text-sm">
                        {item.definition.title}
                      </p>
                      <p className="text-xs text-red-600 mt-0.5">
                        {CATEGORY_LABELS[item.definition.category]}
                      </p>
                    </div>
                    <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full flex-shrink-0">
                      Avvik
                    </span>
                  </div>
                  {item.answer?.comment && (
                    <p className="text-sm text-red-700 mt-2 border-t border-red-200 pt-2">
                      {item.answer.comment}
                    </p>
                  )}
                  {item.answer?.latitude != null && item.answer?.longitude != null && (
                    <p className="text-xs text-red-500 mt-1">
                      📍 {item.answer.latitude.toFixed(5)}°N, {item.answer.longitude.toFixed(5)}°Ø
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Archive tab */}
      {activeTab === "archive" && (
        <ArchivePanel inspection={inspection} onArchived={fetchInspection} />
      )}

      {/* Edit modal */}
      {showEdit && (
        <EditModal
          inspection={inspection}
          caseContacts={caseContacts}
          onSaved={fetchInspection}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}
