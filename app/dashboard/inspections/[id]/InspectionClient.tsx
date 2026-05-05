"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type {
  Attachment,
  InspectionWithAnswers,
  CheckpointWithAnswer,
  CheckpointStatus,
  CheckpointCategory,
  SifContact,
  SifEstate,
  SifCaseStage,
  ExternalParticipant,
} from "@/types";

const EMPTY_ATTACHMENTS: Attachment[] = [];
import {
  filterCheckpoints,
  mergeCheckpointsWithAnswers,
  groupByCategory,
  getCategoryLabel,
  CATEGORY_ORDER,
  calculateSummary,
} from "@/lib/checklist/filter-engine";
import { CHECKPOINT_DEFINITIONS } from "@/data/seed/checkpoint-definitions";
import type { CheckpointDefinition } from "@/types";
import CheckpointItem from "@/components/checklist/CheckpointItem";
import ArchivePanel from "@/components/archive/ArchivePanel";
import CaseFilesPanel from "@/components/sif/CaseFilesPanel";
import StatusBadge from "@/components/ui/StatusBadge";
import MapPickerModal from "@/components/ui/MapPickerModal";
import CaseSearchInput from "@/components/sif/CaseSearchInput";
import EnterpriseSearchInput from "@/components/sif/EnterpriseSearchInput";
import type { SifEnterpriseResult } from "@/lib/sif/types";
import { useLanguage } from "@/lib/i18n";
import SearchableMultiSelect from "@/components/ui/SearchableMultiSelect";

// Dummy contacts shown when case contacts can't be loaded from PNB
const DUMMY_CONTACTS: SifContact[] = [
  { recno: 1, name: "Ola Byggesen", role: "SØK", roleDescription: "Ansvarlig søker", type: "enterprise" },
  { recno: 2, name: "Kari Tiltakshaver", role: "TILT", roleDescription: "Tiltakshaver", type: "privatePerson" },
  { recno: 3, name: "Per Foretak AS", role: "UTF", roleDescription: "Ansvarlig utførende", type: "enterprise" },
];

type Tab = "checklist" | "summary" | "archive" | "files";
const TABS: Tab[] = ["checklist", "summary", "archive", "files"];

// ── Edit Modal ──────────────────────────────────────────────────────────────

interface EditModalProps {
  inspection: InspectionWithAnswers;
  caseContacts: SifContact[];
  onSaved: () => void;
  onClose: () => void;
}

function EditModal({ inspection, caseContacts, onSaved, onClose }: EditModalProps) {
  const { t, locale } = useLanguage();
  const [propertyAddress, setPropertyAddress] = useState(inspection.property_address);

  // Configurable lists
  const [befaringsomradeItems, setBefaringsomradeItems] = useState<{ code: string; description: string }[]>([]);
  const [tiltakstypeItems, setTiltakstypeItems] = useState<{ code: string; description: string }[]>([]);
  const [bakgrunnItems, setBakgrunnItems] = useState<{ label: string; en_label: string | null }[]>([]);
  const [befaringsomrade, setBefaringsomrade] = useState<string[]>(inspection.befaringsomrade ?? []);
  const [tiltakstype, setTiltakstype] = useState<string[]>(inspection.tiltakstype ?? []);
  const [selectedBakgrunn, setSelectedBakgrunn] = useState<string[]>(inspection.bakgrunn ?? []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
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
  const [caseNumber, setCaseNumber] = useState(inspection.case_number ?? "");
  const [caseTitle, setCaseTitle] = useState(inspection.case_title ?? "");
  const [gnr, setGnr] = useState(inspection.gnr ?? "");
  const [bnr, setBnr] = useState(inspection.bnr ?? "");
  const [applicantName, setApplicantName] = useState(inspection.applicant_name ?? "");
  const [applicantRecno, setApplicantRecno] = useState<number | null>(inspection.applicant_recno ?? null);
  const [inspectorName, setInspectorName] = useState(inspection.inspector_name ?? "");
  const [inspectionDate, setInspectionDate] = useState(inspection.inspection_date);
  const [notes, setNotes] = useState(inspection.notes ?? "");
  const [avvikFrist, setAvvikFrist] = useState(inspection.avvik_frist ?? "");
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

  // External participants
  const [externalParticipants, setExternalParticipants] = useState<ExternalParticipant[]>(
    inspection.external_participants ?? []
  );
  const [extDraft, setExtDraft] = useState<{
    firstName: string;
    lastName: string;
    role: string;
    company: string;
    companyRecno?: number;
  }>({ firstName: "", lastName: "", role: "", company: "", companyRecno: undefined });
  const [showExtForm, setShowExtForm] = useState(false);

  // Stages from case
  const [stages, setStages] = useState<SifCaseStage[]>([]);
  const [stagesLoading, setStagesLoading] = useState(false);
  const [selectedStageRecno, setSelectedStageRecno] = useState<number | null>(
    inspection.sif_stage_recno ?? null
  );

  useEffect(() => {
    if (!caseNumber || caseNumber.trim().length < 4) {
      setStages([]);
      return;
    }
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      setStagesLoading(true);
      fetch(`/api/sif/case-stages?caseNumber=${encodeURIComponent(caseNumber)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.ok && data.stages?.length > 0) {
            setStages(data.stages);
          } else {
            setStages([]);
          }
        })
        .catch(() => setStages([]))
        .finally(() => setStagesLoading(false));
    });
  }, [caseNumber]);

  function addExternalParticipant() {
    if ((!extDraft.firstName.trim() && !extDraft.lastName.trim()) || !extDraft.companyRecno) return;
    const firstName = extDraft.firstName.trim();
    const lastName = extDraft.lastName.trim();
    setExternalParticipants((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: [firstName, lastName].filter(Boolean).join(" "),
        firstName,
        lastName,
        role: extDraft.role.trim() || undefined,
        company: extDraft.company.trim(),
        companyRecno: extDraft.companyRecno,
      },
    ]);
    setExtDraft({ firstName: "", lastName: "", role: "", company: "", companyRecno: undefined });
    setShowExtForm(false);
  }

  function removeExternalParticipant(id: string) {
    setExternalParticipants((prev) => prev.filter((p) => p.id !== id));
  }

  // Map
  const [showMap, setShowMap] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(inspection.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(inspection.longitude ?? null);
  const [areaGeojson, setAreaGeojson] = useState<import("@/types").GeoJsonPolygon | null>(inspection.area_geojson ?? null);

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
      setError(t.inspection.errorNoAddress);
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
        case_title: caseTitle || null,
        gnr: gnr || null,
        bnr: bnr || null,
        applicant_name: applicantName || null,
        applicant_recno: applicantRecno ?? null,
        inspector_name: inspectorName || null,
        inspection_date: inspectionDate,
        notes: notes || null,
        participants,
        external_participants: externalParticipants,
        estates: selectedEstates,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        area_geojson: areaGeojson ?? null,
        befaringsomrade,
        tiltakstype,
        bakgrunn: selectedBakgrunn,
        sif_stage_recno: selectedStageRecno ?? null,
        avvik_frist: avvikFrist || null,
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
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-xl shadow-xl my-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
          <h2 className="font-semibold text-gray-900 dark:text-slate-100">{t.inspection.editTitle}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Case number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t.inspection.caseNumber}</label>
            <CaseSearchInput
              value={caseNumber}
              onChange={(val) => { setCaseNumber(val); if (!val) setCaseTitle(""); }}
              onSelect={(c) => { setCaseNumber(c.caseNumber); setCaseTitle(c.title); }}
              placeholder={t.inspection.caseSearchPlaceholder}
            />
            {caseTitle && (
              <p className="mt-1 text-xs text-gray-500 dark:text-slate-400 truncate" title={caseTitle}>{caseTitle}</p>
            )}
          </div>

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
                  onChange={(e) => setSelectedStageRecno(e.target.value ? Number(e.target.value) : null)}
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

          {/* Property address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.inspection.propertyAddress} <span className="text-red-500">*</span>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t.inspection.date}</label>
              <input
                type="date"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t.inspection.inspector}</label>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Gnr</label>
              <input type="text" value={gnr} onChange={(e) => setGnr(e.target.value)} placeholder="123" className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Bnr</label>
              <input type="text" value={bnr} onChange={(e) => setBnr(e.target.value)} placeholder="45" className="input" />
            </div>
          </div>

          {/* Applicant */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.inspection.applicantName}</label>
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
                <option value="">{t.inspection.selectOrType}</option>
                {caseContacts.map((c) => (
                  <option key={c.recno} value={c.name}>
                    {c.name}{c.role ? ` (${c.role})` : ""}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.inspection.participants}</label>
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
                      className="ml-1 text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300"
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
                  <option value="">{t.inspection.selectParticipant}</option>
                  {caseContacts
                    .filter((c) => !participants.find((p) => p.recno === c.recno))
                    .map((c) => (
                      <option key={c.recno} value={c.recno}>
                        {c.name}{c.role ? ` (${c.role})` : ""}
                      </option>
                    ))}
                </select>
                <button
                  onClick={addParticipant}
                  disabled={!participantDropdown}
                  className="px-3 py-2 bg-brand-600 text-white rounded-xl text-sm disabled:opacity-40 hover:bg-brand-700 transition"
                >
                  {t.inspection.add}
                </button>
              </div>
            ) : caseContacts.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-slate-500">{t.inspection.linkCaseForParticipants}</p>
            ) : null}
          </div>

          {/* External participants */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Eksterne deltakere
              <span className="ml-1 text-xs font-normal text-gray-400 dark:text-slate-500">(f.eks. Brannvernleder, Verneombud)</span>
            </label>
            {externalParticipants.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {externalParticipants.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full px-3 py-1 text-xs font-medium"
                  >
                    {p.name}
                    {p.role && <span className="text-amber-500"> · {p.role}</span>}
                    {p.company && <span className="text-amber-500"> · {p.company}</span>}
                    <button
                      onClick={() => removeExternalParticipant(p.id)}
                      className="ml-1 text-amber-400 hover:text-amber-700"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
            {showExtForm ? (
              <div className="border border-gray-200 dark:border-slate-600 rounded-xl p-3 space-y-2 bg-gray-50 dark:bg-slate-700/50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Fornavn *"
                    value={extDraft.firstName}
                    onChange={(e) => setExtDraft((d) => ({ ...d, firstName: e.target.value }))}
                    className="input flex-1 text-sm"
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="Etternavn *"
                    value={extDraft.lastName}
                    onChange={(e) => setExtDraft((d) => ({ ...d, lastName: e.target.value }))}
                    className="input flex-1 text-sm"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Rolle (f.eks. Brannvernleder)"
                  value={extDraft.role}
                  onChange={(e) => setExtDraft((d) => ({ ...d, role: e.target.value }))}
                  className="input w-full text-sm"
                />
                <EnterpriseSearchInput
                  value={extDraft.company}
                  onChange={(name) => setExtDraft((d) => ({ ...d, company: name, companyRecno: undefined }))}
                  onSelect={(e: SifEnterpriseResult) => setExtDraft((d) => ({ ...d, company: e.Name, companyRecno: e.Recno }))}
                  placeholder="Foretak * (søk i Plan & Build)"
                  className="input w-full text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={addExternalParticipant}
                    disabled={(!extDraft.firstName.trim() && !extDraft.lastName.trim()) || !extDraft.companyRecno}
                    className="px-3 py-2 bg-brand-600 text-white rounded-xl text-sm disabled:opacity-40 hover:bg-brand-700 transition"
                  >
                    Legg til
                  </button>
                  <button
                    onClick={() => { setShowExtForm(false); setExtDraft({ firstName: "", lastName: "", role: "", company: "", companyRecno: undefined }); }}
                    className="px-3 py-2 text-gray-500 dark:text-slate-400 text-sm hover:text-gray-700 dark:hover:text-slate-200"
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowExtForm(true)}
                className="text-xs text-brand-600 hover:text-brand-800 font-medium"
              >
                {t.inspection.addExternalParticipant}
              </button>
            )}
          </div>

          {/* Estates */}
          {selectedEstates.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{t.inspection.estates}</label>
              <div className="flex flex-wrap gap-2">
                {selectedEstates.map((e) => (
                  <span
                    key={e.recno}
                    className="inline-flex items-center gap-1 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 border border-brand-200 dark:border-brand-800 rounded-full px-3 py-1 text-xs font-medium"
                  >
                    {estateLabel(e)}
                    <button
                      onClick={() => removeEstate(e.recno)}
                      className="ml-1 text-brand-400 dark:text-brand-500 hover:text-brand-700 dark:hover:text-brand-300"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Befaringsområde (multi-select fra PNB-kodetabell) */}
          {befaringsomradeItems.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{t.inspection.befaringsomrade}</label>
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

          {/* Bakgrunn for befaringen */}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.inspection.notes}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="input resize-none"
            />
          </div>

          {/* Avvik frist */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Frist for lukking av avvik
            </label>
            <input
              type="date"
              value={avvikFrist}
              onChange={(e) => setAvvikFrist(e.target.value)}
              className="input"
            />
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
              SAK10 § 15-3 — settes dersom det er avvik som må lukkes
            </p>
          </div>

          {/* Map */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.inspection.mapPosition}</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowMap(true)}
                type="button"
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition text-gray-700 dark:text-slate-300"
              >
                🗺️ {latitude != null ? t.inspection.changePosition : t.inspection.selectPosition}
              </button>
              {latitude != null && longitude != null && (
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  {latitude.toFixed(5)}°N, {longitude.toFixed(5)}°Ø
                  <button
                    onClick={() => { setLatitude(null); setLongitude(null); }}
                    className="ml-2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
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

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 dark:text-slate-300 transition"
          >
            {t.inspection.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-brand-600 text-white rounded-xl disabled:opacity-50 hover:bg-brand-700 transition"
          >
            {saving ? t.inspection.saving : t.inspection.saveChanges}
          </button>
        </div>
      </div>

      {showMap && (
        <MapPickerModal
          initialLat={latitude}
          initialLng={longitude}
          initialPolygon={areaGeojson}
          addressHint={[
            propertyAddress,
            inspection.estates?.[0]?.zipCode,
            inspection.estates?.[0]?.zipPlace,
          ].filter(Boolean).join(" ") || undefined}
          title={t.inspection.mapTitle}
          allowPolygon
          onSave={(lat, lng, polygon) => {
            setLatitude(lat);
            setLongitude(lng);
            setAreaGeojson(polygon ?? null);
            setShowMap(false);
          }}
          onClose={() => setShowMap(false)}
        />
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

interface InspectionClientProps {
  id: string;
  initialInspection: InspectionWithAnswers;
}

export default function InspectionClient({ id, initialInspection }: InspectionClientProps) {
  const router = useRouter();
  const { t, locale } = useLanguage();

  const [inspection, setInspection] = useState<InspectionWithAnswers | null>(initialInspection);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("checklist");
  // Keep ArchivePanel in the DOM once it has been opened so the document list
  // stays cached across tab switches (avoids re-fetching from 360° every time).
  const [archivePanelMounted, setArchivePanelMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CheckpointCategory | "all">("all");
  const [caseContacts, setCaseContacts] = useState<SifContact[]>([]);
  const [showEdit, setShowEdit] = useState(false);
  const [checkpointDefs, setCheckpointDefs] = useState<CheckpointDefinition[]>(CHECKPOINT_DEFINITIONS);
  const checkpointsFetched = useRef(false);

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

  // Lazily load case contacts on mount using the pre-fetched case number
  useEffect(() => {
    const caseNumber = initialInspection.case_number;
    if (!caseNumber) return;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      fetch(`/api/sif/case-contacts?caseNumber=${encodeURIComponent(caseNumber)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then((r) => r.json())
        .then((d) => {
          setCaseContacts(d.ok && d.contacts?.length > 0 ? d.contacts : DUMMY_CONTACTS);
        })
        .catch(() => setCaseContacts(DUMMY_CONTACTS));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch checkpoint definitions from DB (falls back to hardcoded if unavailable)
  useEffect(() => {
    if (checkpointsFetched.current) return;
    checkpointsFetched.current = true;
    fetch("/api/checkpoints", {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.checkpoints?.length > 0) {
          setCheckpointDefs(d.checkpoints);
        }
      })
      .catch(() => { /* keep hardcoded fallback */ });
  }, []);

  const updateAnswer = useCallback(async (
    checkpointId: string,
    status: CheckpointStatus,
    comment: string,
    contactRecno: number | null = null,
    contactName: string | null = null,
    lat: number | null = null,
    lng: number | null = null,
    frist: string | null = null
  ) => {
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
        frist: frist || null,
      },
      { onConflict: "inspection_id,checkpoint_definition_id" }
    );

    // Auto-update inspection status – check locally instead of an extra DB query
    const otherAnswersChecked = inspection.answers.some(
      (a) => a.checkpoint_definition_id !== checkpointId && a.status !== "not_checked"
    );
    if (status !== "not_checked" || otherAnswersChecked) {
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
        frist: frist || null,
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
  }, [id, inspection]); // eslint-disable-line react-hooks/exhaustive-deps

  // Must be before any conditional returns (rules of hooks)
  const attachmentsByCheckpoint = useMemo(() => {
    const map = new Map<string, Attachment[]>();
    for (const att of inspection?.attachments ?? []) {
      if (att.checkpoint_definition_id) {
        const list = map.get(att.checkpoint_definition_id) ?? [];
        list.push(att);
        map.set(att.checkpoint_definition_id, list);
      }
    }
    return map;
  }, [inspection?.attachments]);

  if (!inspection) return null;

  const relevantCheckpoints = filterCheckpoints(
    checkpointDefs,
    inspection.befaringsomrade ?? [],
    inspection.tiltakstype ?? []
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
  const externalParticipantsDisplay: ExternalParticipant[] = inspection.external_participants ?? [];
  const estates: SifEstate[] = inspection.estates ?? [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <div className="min-w-0 flex-1">
          <Link
            href="/dashboard"
            className="text-sm text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 mb-1 inline-block"
          >
            {t.inspection.back}
          </Link>
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 truncate">
            {inspection.case_number
              ? <>
                  {inspection.case_number}
                  {inspection.case_title && (
                    <span className="font-normal text-gray-500 dark:text-slate-400"> · {inspection.case_title}</span>
                  )}
                </>
              : inspection.property_address}
          </h1>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400 mt-1 flex-wrap">
            <span>
              {new Date(inspection.inspection_date).toLocaleDateString(locale === "en" ? "en-GB" : "nb-NO")}
            </span>
            <StatusBadge status={inspection.status} />
          </div>
          {/* Participants row */}
          {participants.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {participants.map((p) => (
                <span
                  key={p.recno}
                  className="inline-flex items-center bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-full px-2 py-0.5 text-xs"
                >
                  {p.name}
                  {p.role && (
                    <span className="text-gray-400 dark:text-slate-500 ml-1">· {p.role}</span>
                  )}
                </span>
              ))}
            </div>
          )}
          {/* External participants row */}
          {externalParticipantsDisplay.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {externalParticipantsDisplay.map((ep) => (
                <span
                  key={ep.id}
                  className="inline-flex items-center bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full px-2 py-0.5 text-xs"
                >
                  {ep.name}
                  {ep.role && <span className="text-amber-500 dark:text-amber-400 ml-1">· {ep.role}</span>}
                  {ep.company && <span className="text-amber-500 dark:text-amber-400 ml-1">· {ep.company}</span>}
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
                  className="inline-flex items-center bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 rounded-full px-2 py-0.5 text-xs"
                >
                  🏠{" "}
                  {e.address ?? (e.gnr && e.bnr ? `Gnr/Bnr ${e.gnr}/${e.bnr}` : `${t.inspection.estates} ${e.recno}`)}
                </span>
              ))}
            </div>
          )}
          {/* Coordinates */}
          {inspection.latitude != null && inspection.longitude != null && (
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
              📍 {inspection.latitude.toFixed(5)}°N, {inspection.longitude.toFixed(5)}°Ø
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setShowEdit(true)}
            className="text-sm bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 font-medium px-4 py-2 rounded-xl transition"
          >
            {t.inspection.edit}
          </button>
          <Link
            href={`/dashboard/inspections/${id}/report`}
            className="text-sm bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 font-medium px-4 py-2 rounded-xl transition"
          >
            {t.inspection.report}
          </Link>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: t.inspection.total, value: summary.total, color: "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300" },
          { label: t.inspection.ok, value: summary.ok, color: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400" },
          { label: t.inspection.deviations, value: summary.deviations, color: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400" },
          { label: t.inspection.notChecked, value: summary.not_checked, color: "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400" },
        ].map((s) => (
          <div key={s.label} className={`${s.color} rounded-xl p-3 text-center`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs — hide "files" tab when no case is linked */}
      <div className="flex gap-1 bg-gray-100 dark:bg-slate-700/50 rounded-xl p-1 mb-5">
        {TABS.filter((tab) => tab !== "files" || !!inspection.case_number).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); if (tab === "archive") setArchivePanelMounted(true); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab
                ? "bg-white dark:bg-slate-800 shadow text-gray-900 dark:text-slate-100"
                : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
            }`}
          >
            {tab === "checklist" && t.inspection.tabChecklist}
            {tab === "summary" && t.inspection.tabDeviations(summary.deviations)}
            {tab === "archive" && t.inspection.tabArchive}
            {tab === "files" && t.inspection.tabFiles}
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
                  : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600"
              }`}
            >
              {t.inspection.all} ({merged.length})
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
                      : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600"
                  }`}
                >
                  {getCategoryLabel(cat, locale)} ({items.length}
                  {devs > 0 ? ` · ${t.inspection.deviationsCount(devs)}` : ""})
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
                inspectionId={id}
                addressHint={inspection.property_address}
                initialAttachments={
                  attachmentsByCheckpoint.get(item.definition.id) ?? EMPTY_ATTACHMENTS
                }
                onUpdate={updateAnswer}
              />
            ))}
          </div>

          {displayItems.length > 3 && (
            <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100 dark:border-slate-700">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-200 dark:border-slate-600 rounded-xl text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
              >
                ↑ {t.inspection.scrollToTop}
              </button>
              <button
                onClick={() => { setActiveTab("archive"); setArchivePanelMounted(true); }}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition"
              >
                {t.inspection.tabArchive} →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Summary tab */}
      {activeTab === "summary" && (
        <div>
          {summary.deviations === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-slate-500">
              <p className="text-5xl mb-3">✅</p>
              <p className="text-lg font-medium text-gray-600 dark:text-slate-400">{t.inspection.noDeviations}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {summary.deviation_items.map((item) => (
                <div
                  key={item.definition.id}
                  className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-red-800 dark:text-red-300 text-sm">
                        {item.definition.title}
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                        {getCategoryLabel(item.definition.category, locale)}
                      </p>
                    </div>
                    <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-semibold px-2 py-0.5 rounded-full flex-shrink-0">
                      {t.inspection.deviation}
                    </span>
                  </div>
                  {item.answer?.comment && (
                    <p className="text-sm text-red-700 dark:text-red-400 mt-2 border-t border-red-200 dark:border-red-800 pt-2">
                      {item.answer.comment}
                    </p>
                  )}
                  {item.answer?.latitude != null && item.answer?.longitude != null && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                      📍 {item.answer.latitude.toFixed(5)}°N, {item.answer.longitude.toFixed(5)}°Ø
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Archive tab — kept in DOM once opened so the document list stays cached */}
      {archivePanelMounted && (
        <div className={activeTab !== "archive" ? "hidden" : ""}>
          <ArchivePanel inspection={inspection} onArchived={fetchInspection} onMarkCompleted={fetchInspection} />
        </div>
      )}

      {/* Saksfiler tab — files fetched directly from the linked PNB case */}
      {activeTab === "files" && inspection.case_number && (
        <CaseFilesPanel caseNumber={inspection.case_number} />
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
