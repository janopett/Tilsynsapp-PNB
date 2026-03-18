"use client";

import { useState } from "react";
import type { InspectionWithAnswers, ArchivalStatus } from "@/types";
import { authFetch } from "@/lib/auth-fetch";
import CaseSearchInput from "@/components/sif/CaseSearchInput";

interface Props {
  inspection: InspectionWithAnswers;
  onArchived: () => void;
}

export default function ArchivePanel({ inspection, onArchived }: Props) {
  const existingArchival = inspection.archival;
  const [caseNumber, setCaseNumber] = useState(inspection.case_number ?? "");
  const [externalId, setExternalId] = useState("");
  const [uid, setUid] = useState("");
  const [loading, setLoading] = useState(false);
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
              ? `Arkivert som dokument ${existingArchival.sif_document_number ?? existingArchival.sif_document_recno}`
              : existingArchival.error_message ?? "Feil ved arkivering",
          url: existingArchival.sif_document_url ?? undefined,
          documentNumber: existingArchival.sif_document_number ?? undefined,
        }
      : null
  );

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
      setResult({
        status: "success",
        message: `Arkivert som dokument ${data.archival.sif_document_number ?? data.archival.sif_document_recno ?? "(ukjent)"}`,
        url: data.archival.sif_document_url,
        documentNumber: data.archival.sif_document_number,
      });
      onArchived();
    } else {
      setResult({
        status: "failed",
        message: data.error ?? "Ukjent feil",
      });
    }
    setLoading(false);
  }

  return (
    <div className="space-y-5">
      {/* Status display */}
      {result && (
        <div
          className={`rounded-2xl p-4 border ${
            result.status === "success"
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{result.status === "success" ? "✅" : "❌"}</span>
            <div>
              <p className={`font-semibold text-sm ${result.status === "success" ? "text-green-800" : "text-red-800"}`}>
                {result.status === "success" ? "Arkivert i Plan & Build" : "Arkivering feilet"}
              </p>
              <p className={`text-sm ${result.status === "success" ? "text-green-700" : "text-red-700"}`}>
                {result.message}
              </p>
            </div>
          </div>
          {result.url && (
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-800 font-medium"
            >
              Åpne dokument i 360° →
            </a>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-900 mb-1">Arkiver i Plan & Build</h2>
        <p className="text-sm text-gray-500 mb-4">
          Generer tilsynsrapport (PDF) og arkiver den på tilhørende sak i Plan & Build / Public 360.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Saksnummer i Plan & Build
            </label>
            <CaseSearchInput
              value={caseNumber}
              onChange={setCaseNumber}
              placeholder="Søk på saksnummer eller tittel…"
            />
          </div>

          {/* Advanced fields */}
          <details className="text-sm">
            <summary className="cursor-pointer text-gray-500 hover:text-gray-700 font-medium select-none">
              Avansert oppslag (eksternt ID / UID)
            </summary>
            <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
          className="mt-5 w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-spin">⏳</span>
              Arkiverer...
            </>
          ) : (
            <>📁 Arkiver i Plan &amp; Build</>
          )}
        </button>
      </div>

      {/* Info boxes */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700">
        <p className="font-semibold mb-1">Hva skjer ved arkivering?</p>
        <ol className="list-decimal list-inside space-y-0.5">
          <li>Tilsynsrapport genereres som PDF</li>
          <li>Eventuelle bilder/vedlegg lastes opp til SIF</li>
          <li>Dokument opprettes på saken i Plan & Build</li>
          <li>Dokumentreferansen lagres i appen</li>
        </ol>
      </div>
    </div>
  );
}
