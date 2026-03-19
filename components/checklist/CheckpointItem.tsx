"use client";

import { memo, useEffect, useRef, useState } from "react";
import type { Attachment, CheckpointWithAnswer, CheckpointStatus, SifContact } from "@/types";
import { CATEGORY_LABELS } from "@/lib/checklist/filter-engine";
import { buildLegalUrl } from "@/lib/legal-reference";
import MapPickerModal from "@/components/ui/MapPickerModal";
import { createClient } from "@/lib/supabase/client";

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
    lng?: number | null
  ) => void;
}

const STATUS_CONFIG: Record<CheckpointStatus, { label: string; cls: string; icon: string }> = {
  not_checked: { label: "Ikke kontrollert", cls: "border-gray-200 bg-white", icon: "⬜" },
  ok: { label: "OK", cls: "border-green-300 bg-green-50", icon: "✅" },
  deviation: { label: "Avvik", cls: "border-red-300 bg-red-50", icon: "⚠️" },
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

  // Load signed URL for existing DB attachments (not fresh uploads that already have objectUrl)
  useEffect(() => {
    if (att.objectUrl) return; // already have a preview URL
    if (!att.file_type.startsWith("image/")) return; // not an image
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
          className="w-16 h-16 object-cover rounded-lg border border-gray-200"
        />
      ) : (
        <div className="w-16 h-16 flex flex-col items-center justify-center bg-gray-100 rounded-lg border border-gray-200 text-center px-1">
          <span className="text-lg">📄</span>
          <span className="text-[10px] text-gray-500 leading-tight truncate w-full text-center">
            {att.file_name.split(".").pop()?.toUpperCase()}
          </span>
        </div>
      )}
      <button
        onClick={() => onRemove(att)}
        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] items-center justify-center hidden group-hover:flex leading-none"
        title="Fjern vedlegg"
      >
        ✕
      </button>
      <span className="text-[10px] text-gray-400 truncate block max-w-[64px] text-center mt-0.5">
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
  const { definition, answer } = item;
  const currentStatus: CheckpointStatus = answer?.status ?? "not_checked";
  const [comment, setComment] = useState(answer?.comment ?? "");
  const [expanded, setExpanded] = useState(currentStatus === "deviation");
  const [selectedContactRecno, setSelectedContactRecno] = useState<number | null>(
    answer?.responsible_contact_recno ?? null
  );
  const [lat, setLat] = useState<number | null>(answer?.latitude ?? null);
  const [lng, setLng] = useState<number | null>(answer?.longitude ?? null);
  const [showMap, setShowMap] = useState(false);

  // Attachments
  type LocalAttachment = Attachment & { objectUrl?: string };
  const [attachments, setAttachments] = useState<LocalAttachment[]>(initialAttachments);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const cfg = STATUS_CONFIG[currentStatus];

  function currentContactName(): string | null {
    if (!selectedContactRecno) return null;
    return contacts.find((c) => c.recno === selectedContactRecno)?.name ?? null;
  }

  function handleStatus(status: CheckpointStatus) {
    onUpdate(definition.id, status, comment, selectedContactRecno, currentContactName(), lat, lng);
    if (status === "deviation") setExpanded(true);
  }

  function handleCommentBlur() {
    if (comment !== (answer?.comment ?? "")) {
      onUpdate(definition.id, currentStatus, comment, selectedContactRecno, currentContactName(), lat, lng);
    }
  }

  function handleContactChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const recno = e.target.value ? Number(e.target.value) : null;
    const name = recno ? (contacts.find((c) => c.recno === recno)?.name ?? null) : null;
    setSelectedContactRecno(recno);
    onUpdate(definition.id, currentStatus, comment, recno, name, lat, lng);
  }

  function handleMapSave(newLat: number, newLng: number) {
    setLat(newLat);
    setLng(newLng);
    setShowMap(false);
    onUpdate(definition.id, currentStatus, comment, selectedContactRecno, currentContactName(), newLat, newLng);
  }

  function clearCoords() {
    setLat(null);
    setLng(null);
    onUpdate(definition.id, currentStatus, comment, selectedContactRecno, currentContactName(), null, null);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so the same file can be re-selected
    e.target.value = "";

    setUploading(true);
    setUploadError(null);
    const supabase = createClient();

    const ext = file.name.split(".").pop() ?? "bin";
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = `${inspectionId}/${definition.id}/${safeName}`;

    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, { contentType: file.type, upsert: false });

    if (storageError) {
      console.error("[CheckpointItem] Upload failed", storageError);
      setUploadError(`Opplasting feilet: ${storageError.message}`);
      setUploading(false);
      return;
    }

    const { data, error: dbError } = await supabase
      .from("attachments")
      .insert({
        inspection_id: inspectionId,
        checkpoint_definition_id: definition.id,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size_bytes: file.size,
      })
      .select()
      .single();

    setUploading(false);
    if (dbError || !data) {
      console.error("[CheckpointItem] DB insert failed", dbError);
      setUploadError(`Kunne ikke lagre vedlegg: ${dbError?.message ?? "ukjent feil"}`);
      // Clean up the uploaded file since DB insert failed
      await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
      return;
    }

    // Use object URL for immediate preview (avoids async signed URL on fresh upload)
    const objectUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
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
            <span className="mt-1 flex-shrink-0">
              <span className={`inline-block w-2 h-2 rounded-full ${severityDot}`} />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm leading-tight">
                {definition.title}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {CATEGORY_LABELS[definition.category]}
                {definition.legal_reference && (() => {
                  const url = buildLegalUrl(definition.legal_reference);
                  return url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="ml-1 text-brand-600 hover:underline"
                    >
                      · {definition.legal_reference}
                    </a>
                  ) : (
                    <span className="ml-1 text-gray-400">· {definition.legal_reference}</span>
                  );
                })()}
              </p>
            </div>
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-gray-400 flex-shrink-0 text-xs hover:text-gray-600 mt-0.5"
            aria-label="Vis detaljer"
          >
            {expanded ? "▲" : "▼"}
          </button>
        </div>

        {expanded && (
          <p className="text-xs text-gray-600 mt-2 mb-3 pl-4 border-l-2 border-gray-200">
            {definition.description}
          </p>
        )}

        {/* Status buttons */}
        <div className="flex gap-2 mt-3">
          {(["ok", "deviation", "not_checked"] as CheckpointStatus[]).map((st) => (
            <button
              key={st}
              onClick={() => handleStatus(st)}
              disabled={isSaving}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition border-2 ${
                currentStatus === st
                  ? st === "ok"
                    ? "border-green-500 bg-green-500 text-white"
                    : st === "deviation"
                    ? "border-red-500 bg-red-500 text-white"
                    : "border-gray-400 bg-gray-400 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              {st === "ok" ? "✅ OK" : st === "deviation" ? "⚠️ Avvik" : "Ikke sjekket"}
            </button>
          ))}
        </div>

        {/* Ansvarlig */}
        {contacts.length > 0 && (
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">Ansvarlig</label>
            <select
              value={selectedContactRecno ?? ""}
              onChange={handleContactChange}
              disabled={isSaving}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 text-gray-700"
            >
              <option value="">— Ikke valgt</option>
              {contacts.map((c) => (
                <option key={c.recno} value={c.recno}>
                  {c.name}
                  {c.role ? ` (${c.role})` : ""}
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
            rows={2}
            className="mt-3 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        )}

        {/* Map pin + file upload row */}
        <div className="mt-3 flex items-center gap-4 flex-wrap">
          <button
            onClick={() => setShowMap(true)}
            type="button"
            className="text-xs text-gray-500 hover:text-brand-600 flex items-center gap-1 transition"
          >
            📍 {lat != null ? "Endre posisjon" : "Legg til posisjon i kart"}
          </button>
          {lat != null && lng != null && (
            <span className="text-xs text-gray-400">
              {lat.toFixed(5)}°N, {lng.toFixed(5)}°Ø
              <button onClick={clearCoords} className="ml-1 text-gray-300 hover:text-gray-500">
                ✕
              </button>
            </span>
          )}

          {/* Camera capture (mobilkamera) */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            className="text-xs text-gray-500 hover:text-brand-600 flex items-center gap-1 transition disabled:opacity-50"
            title="Ta bilde med kamera"
          >
            📷 Ta bilde
          </button>

          {/* File upload (filer / bilder fra galleri) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs text-gray-500 hover:text-brand-600 flex items-center gap-1 transition disabled:opacity-50"
            title="Last opp fil eller velg bilde fra galleri"
          >
            {uploading ? "⏳ Laster opp…" : "📎 Legg ved fil"}
          </button>
        </div>

        {/* Upload error */}
        {uploadError && (
          <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-1.5">
            ⚠️ {uploadError}
          </p>
        )}

        {/* Attachment thumbnails */}
        {attachments.length > 0 && (
          <div className="mt-3 flex gap-3 flex-wrap">
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
