"use client";

import { useEffect, useState, useCallback } from "react";
import { authFetch } from "@/lib/auth-fetch";

type ArchivalStatus = "pending" | "success" | "failed";

interface Inspection {
  id: string;
  property_address: string;
  case_number: string | null;
  inspection_date: string;
}

interface Archival {
  id: string;
  created_at: string;
  updated_at: string;
  status: ArchivalStatus;
  sif_case_number: string | null;
  sif_case_recno: number | null;
  sif_document_number: string | null;
  sif_document_recno: number | null;
  sif_document_url: string | null;
  request_payload_json: unknown;
  response_payload_json: unknown;
  error_message: string | null;
  archived_at: string | null;
  inspections: Inspection | null;
}

const STATUS_STYLES: Record<ArchivalStatus, string> = {
  pending: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
  success: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
  failed: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
};

const STATUS_LABEL: Record<ArchivalStatus, string> = {
  pending: "Venter",
  success: "OK",
  failed: "Feilet",
};

function JsonViewer({ data, label }: { data: unknown; label: string }) {
  const [open, setOpen] = useState(false);
  if (!data) return <span className="text-gray-400 dark:text-slate-600 text-xs italic">–</span>;
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium"
      >
        {open ? "Skjul" : "Vis"} {label}
      </button>
      {open && (
        <pre className="mt-2 text-xs bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg p-3 overflow-auto max-h-64 text-gray-700 dark:text-slate-300 whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function ArkiveringsloggPage() {
  const [archivals, setArchivals] = useState<Archival[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");

  const load = useCallback(async (status?: string) => {
    setLoading(true);
    const params = status ? `?status=${status}` : "";
    const res = await authFetch(`/api/admin/archivals${params}`);
    const data = await res.json();
    setArchivals(data.archivals ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(filter || undefined);
  }, [load, filter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Arkiveringslogg</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
            Alle forsøk på å sende tilsynsrapporter til SIF / Plan & Build
          </p>
        </div>
        <button
          onClick={() => load(filter || undefined)}
          className="text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium border border-brand-200 dark:border-brand-700 rounded-xl px-4 py-2 transition hover:bg-brand-50 dark:hover:bg-brand-900/20"
        >
          Oppdater
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-5">
        {["", "success", "failed", "pending"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
              filter === s
                ? "bg-brand-600 text-white border-brand-600"
                : "text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-400"
            }`}
          >
            {s === "" ? "Alle" : s === "success" ? "OK" : s === "failed" ? "Feilet" : "Venter"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40 text-gray-400 dark:text-slate-500">Laster…</div>
      ) : archivals.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-slate-500">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-medium">Ingen arkiveringslogger funnet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {archivals.map((a) => (
            <div
              key={a.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-5"
            >
              {/* Header row */}
              <div className="flex items-start gap-4 justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[a.status]}`}
                    >
                      {STATUS_LABEL[a.status]}
                    </span>
                    <p className="font-semibold text-gray-900 dark:text-slate-100 truncate">
                      {a.inspections?.property_address ?? "Ukjent adresse"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500 dark:text-slate-400">
                    <span>
                      Forsøkt:{" "}
                      {new Date(a.created_at).toLocaleString("nb-NO", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                    {a.inspections?.case_number && (
                      <span>Sak: {a.inspections.case_number}</span>
                    )}
                    {a.sif_case_number && (
                      <span>SIF-sak: {a.sif_case_number}</span>
                    )}
                    {a.sif_document_number && (
                      <span>SIF-dok: {a.sif_document_number}</span>
                    )}
                    {a.sif_document_url && (
                      <a
                        href={a.sif_document_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        Åpne i P&B
                      </a>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap">
                  ID: {a.id.slice(0, 8)}…
                </span>
              </div>

              {/* Error message */}
              {a.error_message && (
                <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-800 dark:text-red-300">
                  <span className="font-semibold">Feil: </span>
                  {a.error_message}
                </div>
              )}

              {/* Payload toggles */}
              <div className="mt-3 flex gap-6 flex-wrap">
                <JsonViewer data={a.request_payload_json} label="forespørsel" />
                <JsonViewer data={a.response_payload_json} label="svar" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
