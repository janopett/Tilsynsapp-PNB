"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { InspectionWithAnswers, ArchivalStatus } from "@/types";
import { authFetch } from "@/lib/auth-fetch";
import { createClient } from "@/lib/supabase/client";
import CaseSearchInput from "@/components/sif/CaseSearchInput";
import { captureMapImage } from "@/lib/pdf/map-capture";

interface CaseDocument {
  Recno: number;
  DocumentNumber?: string;
  Title?: string;
  DocumentDate?: string;
  StatusDescription?: string;
  URL?: string;
}

interface Props {
  inspection: InspectionWithAnswers;
  onArchived: () => void;
  onMarkCompleted?: () => void;
}

export default function ArchivePanel({ inspection, onArchived, onMarkCompleted }: Props) {
  const existingArchival = inspection.archival;
  const [caseNumber, setCaseNumber] = useState(inspection.case_number ?? "");
  const [externalId, setExternalId] = useState("");
  const [uid, setUid] = useState("");
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const isCompleted = inspection.status === "completed";

  // Document picker state
  const [docMode, setDocMode] = useState<"new" | "update">("new");
  const [documents, setDocuments] = useState<CaseDocument[] | null>(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [selectedDocNumber, setSelectedDocNumber] = useState<string | null>(null);
  const [selectedDocUrl, setSelectedDocUrl] = useState<string | null>(null);
  const fetchedForCase = useRef<string>("");
  const [result, setResult] = useState<{
    status: ArchivalStatus;
    message: string;
    url?: string;
    documentNumber?: string;
  } | null>(
    existingArchival
      ? {
          status: existingArchival.status,
          message:
            existingArchival.status === "success"
              ? `Arkivert som dokument ${existingArchival.sif_document_number ?? existingArchival.sif_document_recno}${existingArchival.dispatched ? " · Forsendelse startet" : existingArchival.dispatched === false ? ` · Forsendelse feilet: ${existingArchival.dispatch_error ?? "ukjent feil"}` : ""}`
              : existingArchival.error_message ?? "Feil ved arkivering",
          url: existingArchival.sif_document_url ?? undefined,
          documentNumber: existingArchival.sif_document_number ?? undefined,
        }
      : null
  );

  function sortDocuments(docs: CaseDocument[]): CaseDocument[] {
    return [...docs].sort((a, b) => {
      const numA = parseInt(a.DocumentNumber?.split("-").pop() ?? "0", 10);
      const numB = parseInt(b.DocumentNumber?.split("-").pop() ?? "0", 10);
      return numA - numB;
    });
  }

  const fetchDocuments = useCallback(async (cn: string, force = false) => {
    if (!cn.trim()) return;
    if (!force && fetchedForCase.current === cn.trim()) return;
    fetchedForCase.current = cn.trim();
    setDocsLoading(true);
    setDocsError(null);
    setDocuments(null);
    setSelectedDocNumber(null);
    setSelectedDocUrl(null);
    try {
      const res = await authFetch(`/api/sif/case-documents?caseNumber=${encodeURIComponent(cn.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Feil ved henting av dokumenter");
      setDocuments(sortDocuments(data.documents ?? []));
    } catch (err) {
      setDocsError(err instanceof Error ? err.message : "Ukjent feil");
      fetchedForCase.current = "";
    } finally {
      setDocsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fetch documents in the background as soon as a case number is available
  useEffect(() => {
    if (caseNumber.trim()) fetchDocuments(caseNumber);
  }, [caseNumber, fetchDocuments]);

  function switchToUpdateMode() {
    setDocMode("update");
    if (caseNumber.trim()) fetchDocuments(caseNumber);
  }

  async function handleMarkCompleted() {
    setCompleting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("inspections")
      .update({ status: "completed" })
      .eq("id", inspection.id);
    setCompleting(false);
    if (error) {
      alert("Kunne ikke sette som avsluttet: " + error.message);
    } else {
      onMarkCompleted?.();
    }
  }

  async function handleArchive() {
    if (!caseNumber.trim() && !externalId.trim() && !uid.trim()) {
      alert("Angi saksnummer, eksternt ID eller UID.");
      return;
    }
    if (docMode === "update" && !selectedDocNumber) {
      alert("Velg et eksisterende dokument å oppdatere.");
      return;
    }
    setLoading(true);
    setResult(null);

    // Capture map images client-side for all checkpoint answers that have coordinates.
    // This avoids server-side dependency on external map services.
    const checkpointMapImages: Record<string, string> = {};
    const answersWithCoords = inspection.answers.filter(
      (a) => a.latitude && a.longitude && a.checkpoint_definition_id
    );
    await Promise.allSettled(
      answersWithCoords.map(async (a) => {
        const img = await captureMapImage(a.latitude!, a.longitude!);
        if (img) checkpointMapImages[a.checkpoint_definition_id!] = img;
      })
    );

    const res = await authFetch("/api/archive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inspectionId: inspection.id,
        caseNumber: caseNumber.trim() || undefined,
        externalId: externalId.trim() || undefined,
        uid: uid.trim() || undefined,
        existingDocumentNumber:
          docMode === "update" && selectedDocNumber ? selectedDocNumber : undefined,
        checkpointMapImages: Object.keys(checkpointMapImages).length > 0
          ? checkpointMapImages
          : undefined,
      }),
    });

    const data = await res.json();

    if (data.success && data.archival) {
      const a = data.archival;
      const dispatchNote = a.dispatched
        ? " · Forsendelse startet"
        : a.dispatched === false
        ? ` · Forsendelse feilet: ${a.dispatch_error ?? "ukjent feil"}`
        : "";
      setResult({
        status: "success",
        message: `Arkivert som dokument ${a.sif_document_number ?? a.sif_document_recno ?? "(ukjent)"}${dispatchNote}`,
        url: a.sif_document_url ?? selectedDocUrl ?? undefined,
        documentNumber: a.sif_document_number,
      });
      onArchived();
    } else {
      setResult({ status: "failed", message: data.error ?? "Ukjent feil" });
    }
    setLoading(false);
  }

  return (
    <div className="space-y-5">
      {/* Status display */}
      {result && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-2xl p-4 border ${
            result.status === "success"
              ? "bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">
              {result.status === "success" ? "✅" : "❌"}
            </span>
            <div>
              <p className={`font-semibold text-sm ${
                result.status === "success"
                  ? "text-green-800 dark:text-green-300"
                  : "text-red-800 dark:text-red-300"
              }`}>
                {result.status === "success" ? "Sendt og arkivert i Plan & Build" : "Arkivering feilet"}
              </p>
              <p className={`text-sm ${
                result.status === "success"
                  ? "text-green-700 dark:text-green-400"
                  : "text-red-700 dark:text-red-400"
              }`}>
                {result.message}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {result.url && (
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium"
              >
                Åpne dokument i 360° →
              </a>
            )}
            {result.status === "success" && !isCompleted && (
              <button
                onClick={handleMarkCompleted}
                disabled={completing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                           bg-green-600 hover:bg-green-700 text-white text-sm font-semibold
                           transition disabled:opacity-50
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
              >
                {completing ? "⏳ Avslutter…" : "✅ Sett som avsluttet"}
              </button>
            )}
            {isCompleted && (
              <span className="inline-flex items-center gap-1 text-sm text-green-700 dark:text-green-400 font-medium">
                ✅ Tilsynet er avsluttet
              </span>
            )}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
        <h2 className="font-semibold text-gray-900 dark:text-slate-100 mb-1">
          Send og arkiver i Plan &amp; Build
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          Generer tilsynsrapport (PDF), arkiver den på saken i Plan &amp; Build og send den til mottakerne.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Saksnummer i Plan &amp; Build
            </label>
            <CaseSearchInput
              value={caseNumber}
              onChange={setCaseNumber}
              placeholder="Søk på saksnummer eller tittel…"
            />
          </div>

          {/* Document picker */}
          <div className="border border-gray-100 dark:border-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                Dokument i Plan &amp; Build
              </p>
              {docMode === "update" && caseNumber.trim() && documents !== null && (
                <button
                  type="button"
                  onClick={() => fetchDocuments(caseNumber, true)}
                  disabled={docsLoading}
                  className="text-xs text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50"
                >
                  {docsLoading ? "Henter…" : "Oppdater liste"}
                </button>
              )}
            </div>

            {docsError && (
              <p className="text-xs text-red-600 dark:text-red-400">{docsError}</p>
            )}

            {/* Mode toggle — always visible */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDocMode("new")}
                className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium border transition
                  ${docMode === "new"
                    ? "bg-brand-600 border-brand-600 text-white"
                    : "border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                  }`}
              >
                Opprett nytt dokument
              </button>
              <button
                type="button"
                onClick={switchToUpdateMode}
                disabled={!caseNumber.trim()}
                className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium border transition disabled:opacity-40
                  ${docMode === "update"
                    ? "bg-brand-600 border-brand-600 text-white"
                    : "border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                  }`}
              >
                Oppdater eksisterende
              </button>
            </div>

            {docMode === "update" && (
              docsLoading ? (
                <p className="text-xs text-gray-400 dark:text-slate-500">Henter dokumenter…</p>
              ) : documents === null ? (
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  {caseNumber.trim() ? "Angi saksnummer og klikk «Oppdater eksisterende» for å laste inn dokumenter." : "Angi saksnummer for å hente dokumenter."}
                </p>
              ) : documents.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Ingen dokumenter funnet på saken.
                </p>
              ) : (
                <select
                  value={selectedDocNumber ?? ""}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    const doc = documents?.find((d) => (d.DocumentNumber ?? String(d.Recno)) === val);
                    setSelectedDocNumber(val);
                    setSelectedDocUrl(doc?.URL ?? null);
                  }}
                  className="input text-sm"
                >
                  <option value="">— Velg dokument —</option>
                  {documents.map((d) => (
                    <option key={d.Recno} value={d.DocumentNumber ?? d.Recno}>
                      {[d.DocumentNumber, d.Title].filter(Boolean).join(" - ")}
                    </option>
                  ))}
                </select>
              )
            )}
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 font-medium select-none">
              Avansert oppslag (eksternt ID / UID)
            </summary>
            <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-100 dark:border-slate-700">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Eksternt ID
                </label>
                <input
                  type="text"
                  value={externalId}
                  onChange={(e) => setExternalId(e.target.value)}
                  placeholder="Eksternt ID fra fagsystem"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  UID
                </label>
                <input
                  type="text"
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                  placeholder="Globalt unik identifikator"
                  className="input"
                />
              </div>
            </div>
          </details>
        </div>

        <button
          onClick={handleArchive}
          disabled={loading || (docMode === "update" && !selectedDocNumber)}
          aria-busy={loading}
          className="mt-5 w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl
                     transition disabled:opacity-50 flex items-center justify-center gap-2
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2
                     dark:focus-visible:ring-offset-slate-800"
        >
          {loading ? (
            <>
              <span className="animate-spin" aria-hidden="true">⏳</span>
              {docMode === "update" ? "Oppdaterer dokument..." : "Arkiverer og sender..."}
            </>
          ) : docMode === "update" ? (
            <>📝 Oppdater dokument i Plan &amp; Build</>
          ) : (
            <>📨 Send og arkiver i Plan &amp; Build</>
          )}
        </button>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-xl p-4 text-xs text-blue-700 dark:text-blue-300">
        <p className="font-semibold mb-1">Hva skjer?</p>
        <ol className="list-decimal list-inside space-y-0.5">
          <li>Tilsynsrapport genereres som PDF</li>
          <li>Eventuelle bilder/vedlegg lastes opp til SIF</li>
          <li>Dokument opprettes på saken i Plan &amp; Build</li>
          <li>Dokumentet sendes til mottakerne (hvis aktivert i admin)</li>
          <li>Dokumentreferansen lagres i appen</li>
        </ol>
      </div>
    </div>
  );
}
