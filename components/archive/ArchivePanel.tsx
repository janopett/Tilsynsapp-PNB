"use client";

import { useState } from "react";
import type { InspectionWithAnswers, ArchivalStatus } from "@/types";
import { authFetch } from "@/lib/auth-fetch";
import { createClient } from "@/lib/supabase/client";
import CaseSearchInput from "@/components/sif/CaseSearchInput";

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
    setLoading(true);
    setResult(null);

    const res = await authFetch("/api/archive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inspectionId: inspection.id,
        caseNumber: caseNumber.trim() || undefined,
        externalId: externalId.trim() || undefined,
        uid: uid.trim() || undefined,
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
        url: a.sif_document_url,
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
          disabled={loading}
          aria-busy={loading}
          className="mt-5 w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl
                     transition disabled:opacity-50 flex items-center justify-center gap-2
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2
                     dark:focus-visible:ring-offset-slate-800"
        >
          {loading ? (
            <>
              <span className="animate-spin" aria-hidden="true">⏳</span>
              Arkiverer og sender...
            </>
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
