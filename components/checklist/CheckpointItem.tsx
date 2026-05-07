"use client";

import { memo, useEffect, useRef, useState } from "react";
import type { Attachment, CheckpointWithAnswer, CheckpointStatus, SifContact } from "@/types";
import { getCategoryLabel } from "@/lib/checklist/filter-engine";
import { buildLegalUrl } from "@/lib/legal-reference";
import MapPickerModal from "@/components/ui/MapPickerModal";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { extractGps, stampGpsOnImage } from "@/lib/stamp-gps";

const STORAGE_BUCKET = "inspection-attachments";

interface Props {
  item: CheckpointWithAnswer;
  isSaving: boolean;
  contacts: SifContact[];
  inspectionId: string;
  addressHint?: string;
  initialAttachments: Attachment[];
  onUpdate: (
    id: string,
    status: CheckpointStatus,
    comment: string,
    contactRecno: number | null,
    contactName: string | null,
    lat?: number | null,
    lng?: number | null,
    frist?: string | null
  ) => void;
}

const STATUS_CONFIG: Record<CheckpointStatus, { label: string; cls: string; icon: string }> = {
  not_checked: {
    label: "Ikke relevant",
    cls: "border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800",
    icon: "⬜",
  },
  ok: {
    label: "OK",
    cls: "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/50",
    icon: "✅",
  },
  deviation: {
    label: "Avvik",
    cls: "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/50",
    icon: "⚠️",
  },
};

// ── Attachment thumbnail ───────────────────────────────────────────────────

function AttachmentThumb({
  att,
  onRemove,
}: {
  att: Attachment & { objectUrl?: string };
  onRemove: (att: Attachment) => void;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(att.objectUrl ?? null);

  useEffect(() => {
    if (att.objectUrl) return;
    if (!att.file_type.startsWith("image/")) return;
    let cancelled = false;
    createClient()
      .storage.from(STORAGE_BUCKET)
      .createSignedUrl(att.file_path, 3600)
      .then(({ data }) => {
        if (!cancelled && data?.signedUrl) setSignedUrl(data.signedUrl);
      });
    return () => { cancelled = true; };
  }, [att.file_path, att.objectUrl, att.file_type]);

  const isImage = att.file_type.startsWith("image/");

  return (
    <div className="relative group flex-shrink-0">
      {isImage && signedUrl ? (
        <img
          src={signedUrl}
          alt={att.file_name}
          className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-slate-600"
        />
      ) : (
        <div className="w-16 h-16 flex flex-col items-center justify-center bg-gray-100 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 text-center px-1">
          <span className="text-lg" aria-hidden="true">📄</span>
          <span className="text-[10px] text-gray-500 dark:text-slate-400 leading-tight truncate w-full text-center">
            {att.file_name.split(".").pop()?.toUpperCase()}
          </span>
        </div>
      )}
      {/* Visible on hover AND on keyboard focus (WCAG 2.1.1) */}
      <button
        onClick={() => onRemove(att)}
        aria-label={`Fjern vedlegg: ${att.file_name}`}
        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600
                   text-white text-[10px] items-center justify-center
                   hidden group-hover:flex focus:flex
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 leading-none"
      >
        ✕
      </button>
      <span className="text-[10px] text-gray-500 dark:text-slate-400 truncate block max-w-[64px] text-center mt-0.5">
        {att.file_name.length > 10 ? att.file_name.slice(0, 8) + "…" : att.file_name}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

const CheckpointItem = memo(function CheckpointItem({
  item,
  isSaving,
  contacts,
  inspectionId,
  addressHint,
  initialAttachments,
  onUpdate,
}: Props) {
  const { locale } = useLanguage();
  const { definition, answer } = item;
  const displayTitle = locale === "en" && definition.en_title ? definition.en_title : definition.title;
  const currentStatus: CheckpointStatus = answer?.status ?? "not_checked";
  const [comment, setComment] = useState(answer?.comment ?? "");
  const [expanded, setExpanded] = useState(currentStatus === "deviation");
  const [selectedContactRecno, setSelectedContactRecno] = useState<number | null>(
    answer?.responsible_contact_recno ?? null
  );
  const [lat, setLat] = useState<number | null>(answer?.latitude ?? null);
  const [lng, setLng] = useState<number | null>(answer?.longitude ?? null);
  const [frist, setFrist] = useState(answer?.frist ?? "");
  const [showMap, setShowMap] = useState(false);

  type LocalAttachment = Attachment & { objectUrl?: string };
  const [attachments, setAttachments] = useState<LocalAttachment[]>(initialAttachments);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"exif" | "geolocation" | "none" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const cfg = STATUS_CONFIG[currentStatus];

  function currentContactName(): string | null {
    if (!selectedContactRecno) return null;
    return contacts.find((c) => c.recno === selectedContactRecno)?.name ?? null;
  }

  function handleStatus(status: CheckpointStatus) {
    onUpdate(definition.id, status, comment, selectedContactRecno, currentContactName(), lat, lng, frist || null);
    if (status === "deviation") setExpanded(true);
  }

  function handleCommentBlur() {
    if (comment !== (answer?.comment ?? "")) {
      onUpdate(definition.id, currentStatus, comment, selectedContactRecno, currentContactName(), lat, lng, frist || null);
    }
  }

  function handleContactChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const recno = e.target.value ? Number(e.target.value) : null;
    const name = recno ? (contacts.find((c) => c.recno === recno)?.name ?? null) : null;
    setSelectedContactRecno(recno);
    onUpdate(definition.id, currentStatus, comment, recno, name, lat, lng, frist || null);
  }

  function handleFristChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setFrist(val);
    onUpdate(definition.id, currentStatus, comment, selectedContactRecno, currentContactName(), lat, lng, val || null);
  }

  function handleMapSave(newLat: number, newLng: number) {
    setLat(newLat);
    setLng(newLng);
    setShowMap(false);
    onUpdate(definition.id, currentStatus, comment, selectedContactRecno, currentContactName(), newLat, newLng, frist || null);
  }

  function clearCoords() {
    setLat(null);
    setLng(null);
    onUpdate(definition.id, currentStatus, comment, selectedContactRecno, currentContactName(), null, null, frist || null);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    setUploadError(null);
    const supabase = createClient();

    // Stamp GPS coordinates onto image if location data is available (EXIF or geolocation)
    let uploadBlob: Blob = file;
    let fileExt = file.name.split(".").pop() ?? "bin";
    let fileType = file.type;
    let fileName = file.name;

    if (file.type.startsWith("image/")) {
      const gps = await extractGps(file);
      if (gps) {
        const stamped = await stampGpsOnImage(file, gps.latitude, gps.longitude);
        uploadBlob = stamped.blob;
        fileExt = stamped.ext;
        fileType = stamped.type;
        const origExt = file.name.split(".").pop()?.toLowerCase() ?? "";
        if (stamped.ext !== origExt) {
          fileName = file.name.replace(/\.[^.]+$/, `.${stamped.ext}`);
        }
        setGpsStatus(gps.source);
      } else {
        setGpsStatus("none");
      }
      setTimeout(() => setGpsStatus(null), 5000);
    }

    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `${inspectionId}/${definition.id}/${safeName}`;

    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, uploadBlob, { contentType: fileType, upsert: false });

    if (storageError) {
      setUploadError(`Opplasting feilet: ${storageError.message}`);
      setUploading(false);
      return;
    }

    const { data, error: dbError } = await supabase
      .from("attachments")
      .insert({
        inspection_id: inspectionId,
        checkpoint_definition_id: definition.id,
        file_name: fileName,
        file_path: filePath,
        file_type: fileType,
        file_size_bytes: uploadBlob.size,
      })
      .select()
      .single();

    setUploading(false);
    if (dbError || !data) {
      setUploadError(`Kunne ikke lagre vedlegg: ${dbError?.message ?? "ukjent feil"}`);
      await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
      return;
    }

    const objectUrl = fileType.startsWith("image/") ? URL.createObjectURL(uploadBlob) : undefined;
    setAttachments((prev) => [...prev, { ...(data as Attachment), objectUrl }]);
  }

  async function removeAttachment(att: LocalAttachment) {
    const supabase = createClient();
    await Promise.all([
      supabase.storage.from(STORAGE_BUCKET).remove([att.file_path]),
      supabase.from("attachments").delete().eq("id", att.id),
    ]);
    if (att.objectUrl) URL.revokeObjectURL(att.objectUrl);
    setAttachments((prev) => prev.filter((a) => a.id !== att.id));
  }

  const severityDot =
    definition.severity === "critical"
      ? "bg-red-400"
      : definition.severity === "warning"
      ? "bg-yellow-400"
      : "bg-blue-300";

  return (
    <>
      <div className={`border-2 rounded-2xl p-4 transition ${cfg.cls} ${isSaving ? "opacity-70" : ""}`}>
        {/* Title row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <span className="mt-1 flex-shrink-0" aria-hidden="true">
              <span className={`inline-block w-2 h-2 rounded-full ${severityDot}`} />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-slate-100 text-sm leading-tight">
                {displayTitle}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                {getCategoryLabel(definition.category, locale)}
                {definition.legal_reference && (() => {
                  const url = definition.legal_reference_url || buildLegalUrl(definition.legal_reference);
                  return url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="ml-1 text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      · {definition.legal_reference}
                    </a>
                  ) : (
                    <span className="ml-1 text-gray-400 dark:text-slate-500">· {definition.legal_reference}</span>
                  );
                })()}
              </p>
            </div>
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? "Skjul beskrivelse" : "Vis beskrivelse"}
            className="text-gray-400 dark:text-slate-500 flex-shrink-0 text-xs
                       hover:text-gray-600 dark:hover:text-slate-300 mt-0.5
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
          >
            {expanded ? "▲" : "▼"}
          </button>
        </div>

        {expanded && (
          <p className="text-xs text-gray-600 dark:text-slate-400 mt-2 mb-3 pl-4 border-l-2 border-gray-200 dark:border-slate-600">
            {definition.description}
          </p>
        )}

        {/* Status buttons */}
        <div className="flex gap-2 mt-3" role="group" aria-label="Sett status">
          {(["ok", "deviation", "not_checked"] as CheckpointStatus[]).map((st) => (
            <button
              key={st}
              onClick={() => handleStatus(st)}
              disabled={isSaving}
              aria-pressed={currentStatus === st}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition border-2
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
                          focus-visible:ring-brand-500 dark:focus-visible:ring-offset-slate-800 ${
                currentStatus === st
                  ? st === "ok"
                    ? "border-green-500 bg-green-500 text-white"
                    : st === "deviation"
                    ? "border-red-500 bg-red-500 text-white"
                    : "border-gray-400 bg-gray-400 text-white"
                  : "border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-500"
              }`}
            >
              {st === "ok" ? "✅ OK" : st === "deviation" ? "⚠️ Avvik" : "Ikke relevant"}
            </button>
          ))}
        </div>

        {/* Ansvarlig */}
        {contacts.length > 0 && (
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
              Ansvarlig
            </label>
            <select
              value={selectedContactRecno ?? ""}
              onChange={handleContactChange}
              disabled={isSaving}
              className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm
                         bg-white dark:bg-slate-800
                         text-gray-700 dark:text-slate-300
                         focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <option value="">— Ikke valgt</option>
              {contacts.map((c) => (
                <option key={c.recno} value={c.recno}>
                  {c.name}{c.role ? ` (${c.role})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Comment */}
        {(expanded || currentStatus === "deviation" || (answer?.comment ?? "")) && (
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onBlur={handleCommentBlur}
            placeholder="Kommentar / avviksbeskrivelse…"
            aria-label="Kommentar"
            rows={2}
            className="mt-3 w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm resize-none
                       bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100
                       placeholder:text-gray-400 dark:placeholder:text-slate-500
                       focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        )}

        {/* Frist for retting — vises kun ved avvik */}
        {currentStatus === "deviation" && (
          <div className="mt-3 flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 dark:text-slate-400 whitespace-nowrap">
              Rettes innen
            </label>
            <input
              type="date"
              value={frist}
              onChange={handleFristChange}
              disabled={isSaving}
              className="border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1 text-sm
                         bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100
                         focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
        )}

        {/* Map pin + file upload row */}
        <div className="mt-3 flex items-center gap-4 flex-wrap">
          <button
            onClick={() => setShowMap(true)}
            type="button"
            className="text-xs text-gray-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400
                       flex items-center gap-1 transition
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
          >
            📍 {lat != null ? "Endre posisjon" : "Legg til posisjon i kart"}
          </button>
          {lat != null && lng != null && (
            <span className="text-xs text-gray-500 dark:text-slate-400">
              {lat.toFixed(5)}°N, {lng.toFixed(5)}°Ø
              <button
                onClick={clearCoords}
                aria-label="Fjern posisjon"
                className="ml-1 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300
                           focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 rounded"
              >
                ✕
              </button>
            </span>
          )}

          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            aria-label="Ta bilde med kamera"
            className="text-xs text-gray-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400
                       flex items-center gap-1 transition disabled:opacity-50
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
          >
            📷 Ta bilde
          </button>

          <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleFileSelect} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Last opp fil eller velg bilde fra galleri"
            className="text-xs text-gray-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400
                       flex items-center gap-1 transition disabled:opacity-50
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
          >
            {uploading ? "⏳ Laster opp…" : "📎 Legg ved fil"}
          </button>
        </div>

        {/* Upload error */}
        {uploadError && (
          <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-1.5">
            ⚠️ {uploadError}
          </p>
        )}

        {/* GPS stamp status */}
        {gpsStatus === "exif" && (
          <p className="mt-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 rounded-lg px-3 py-1.5">
            📍 GPS fra bilde stemplet inn
          </p>
        )}
        {gpsStatus === "geolocation" && (
          <p className="mt-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 rounded-lg px-3 py-1.5">
            📍 Posisjon fra nettleser stemplet inn
          </p>
        )}
        {gpsStatus === "none" && (
          <p className="mt-2 text-xs text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800/60 rounded-lg px-3 py-1.5">
            Ingen posisjon funnet i bilde
          </p>
        )}

        {/* Attachment thumbnails */}
        {attachments.length > 0 && (
          <div className="mt-3 flex gap-3 flex-wrap" aria-label="Vedlegg">
            {attachments.map((att) => (
              <AttachmentThumb key={att.id} att={att} onRemove={removeAttachment} />
            ))}
          </div>
        )}
      </div>

      {showMap && (
        <MapPickerModal
          initialLat={lat}
          initialLng={lng}
          addressHint={lat == null ? addressHint : undefined}
          title={`Posisjon: ${definition.title}`}
          onSave={handleMapSave}
          onClose={() => setShowMap(false)}
        />
      )}
    </>
  );
});

export default CheckpointItem;
