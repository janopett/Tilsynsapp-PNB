"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import VisitForm, { type VisitRow } from "@/components/cases/VisitForm";
import TaskList, { type TaskRow } from "@/components/cases/TaskList";
import { authFetch } from "@/lib/auth-fetch";

// ============================================================
// Typer
// ============================================================

interface CaseDetail {
  id: string | null;
  caseNumber: string;
  recno?: number;
  title: string;
  address?: string | null;
  status?: string | null;
  description?: string | null;
  responsiblePerson?: string | null;
  responsibleEnterprise?: string | null;
  createdDate?: string | null;
  lastChangedDate?: string | null;
  estates?: unknown[];
  contacts?: unknown[];
  stages?: unknown[];
  url?: string;
  priority: "low" | "normal" | "high";
  notes?: string | null;
  fromCache?: boolean;
}

interface DocumentRow {
  recno?: number;
  documentNumber?: string;
  title?: string;
  category?: string;
  status?: string;
  documentDate?: string;
  responsiblePerson?: string;
  url?: string;
}

// ============================================================
// Statusseksjons-komponent
// ============================================================

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

// ============================================================
// Prioritets-velger
// ============================================================

function PrioritySelector({
  caseNumber,
  current,
  onChange,
}: {
  caseNumber: string;
  current: string;
  onChange: (p: string) => void;
}) {
  const [saving, setSaving] = useState(false);

  async function handleChange(value: string) {
    setSaving(true);
    try {
      await authFetch(`/api/cases/${encodeURIComponent(caseNumber)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: value }),
      });
      onChange(value);
    } finally {
      setSaving(false);
    }
  }

  const options = [
    { value: "high",   label: "Høy",    color: "text-red-600 dark:text-red-400" },
    { value: "normal", label: "Normal", color: "text-blue-600 dark:text-blue-400" },
    { value: "low",    label: "Lav",    color: "text-gray-500 dark:text-slate-400" },
  ];

  return (
    <div className="flex gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => handleChange(opt.value)}
          disabled={saving}
          aria-pressed={current === opt.value}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500
                      disabled:opacity-50
                      ${current === opt.value
                        ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                        : `bg-gray-100 dark:bg-slate-700 ${opt.color} hover:bg-gray-200 dark:hover:bg-slate-600`
                      }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================
// Besøksliste
// ============================================================

function VisitsList({
  caseNumber,
  visits,
  onVisitAdded,
}: {
  caseNumber: string;
  visits: VisitRow[];
  onVisitAdded: (v: VisitRow) => void;
}) {
  const [showForm, setShowForm] = useState(false);

  const statusLabel: Record<string, string> = {
    planned: "Planlagt",
    completed: "Gjennomført",
    cancelled: "Avlyst",
  };
  const statusColor: Record<string, string> = {
    planned:   "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    completed: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    cancelled: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400",
  };

  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          Besøk
          {visits.length > 0 && (
            <span className="ml-1.5 text-xs font-normal text-gray-500 dark:text-slate-400">
              ({visits.length})
            </span>
          )}
        </h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          aria-expanded={showForm}
          className="text-xs font-medium text-brand-600 dark:text-brand-400
                     hover:text-brand-700 dark:hover:text-brand-300
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
        >
          + Nytt besøk
        </button>
      </div>

      {showForm && (
        <div className="mb-3">
          <VisitForm
            caseNumber={caseNumber}
            onCreated={(v) => { onVisitAdded(v); setShowForm(false); }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {visits.length === 0 && !showForm && (
        <p className="text-sm text-gray-500 dark:text-slate-400">Ingen besøk registrert.</p>
      )}

      {visits.length > 0 && (
        <ul className="space-y-2" aria-label="Besøksliste">
          {visits.map((v) => (
            <li key={v.id} className="flex items-start gap-3 py-2 border-t border-gray-100 dark:border-slate-700 first:border-0 first:pt-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(v.scheduled_at).toLocaleString("nb-NO", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColor[v.status] ?? statusColor.planned}`}>
                    {statusLabel[v.status] ?? v.status}
                  </span>
                </div>
                {v.notes && (
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                    {v.notes}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ============================================================
// Dokumentliste
// ============================================================

function DocumentsList({ caseNumber }: { caseNumber: string }) {
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authFetch(`/api/cases/${encodeURIComponent(caseNumber)}/documents`)
      .then((r) => r.json())
      .then((d) => setDocs(d.documents ?? []))
      .catch(() => setError("Kunne ikke hente dokumenter"))
      .finally(() => setLoading(false));
  }, [caseNumber]);

  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          Dokumenter
          {docs.length > 0 && (
            <span className="ml-1.5 text-xs font-normal text-gray-500 dark:text-slate-400">
              ({docs.length})
            </span>
          )}
        </h2>
      </div>

      {loading && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-8 rounded-lg bg-gray-100 dark:bg-slate-700 animate-pulse" />
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!loading && !error && docs.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-slate-400">Ingen dokumenter på saken.</p>
      )}

      {!loading && docs.length > 0 && (
        <ul className="divide-y divide-gray-100 dark:divide-slate-700" aria-label="Dokumentliste">
          {docs.map((d, i) => (
            <li key={d.recno ?? i} className="py-2 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white truncate">
                    {d.title ?? "Uten tittel"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    {[d.documentNumber, d.category, d.documentDate].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {d.url && (
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs text-brand-600 dark:text-brand-400 hover:underline
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                  >
                    Åpne
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ============================================================
// Sak-detaljside (klient-komponent)
// ============================================================

interface Props {
  caseNumber: string;
}

export default function CaseDetailClient({ caseNumber }: Props) {
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [caseRes, visitsRes, tasksRes] = await Promise.all([
          authFetch(`/api/cases/${encodeURIComponent(caseNumber)}`),
          authFetch(`/api/cases/${encodeURIComponent(caseNumber)}/visits`),
          authFetch(`/api/cases/${encodeURIComponent(caseNumber)}/tasks`),
        ]);

        if (!caseRes.ok) throw new Error("Sak ikke funnet");

        const [caseJson, visitsJson, tasksJson] = await Promise.all([
          caseRes.json(),
          visitsRes.json(),
          tasksRes.json(),
        ]);

        setCaseData(caseJson);
        setVisits(visitsJson.visits ?? []);
        setTasks(tasksJson.tasks ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ukjent feil");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [caseNumber]);

  // ——— Laster ———
  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-6 w-32 rounded-lg bg-gray-200 dark:bg-slate-700 animate-pulse" />
        <div className="h-24 rounded-xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
        <div className="h-40 rounded-xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
        <span className="sr-only">Henter sak…</span>
      </div>
    );
  }

  // ——— Feil ———
  if (error || !caseData) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/cases"
          className="inline-flex items-center gap-1 text-sm text-brand-600 dark:text-brand-400 hover:underline"
        >
          ← Tilbake til saker
        </Link>
        <div role="alert" className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
          {error ?? "Sak ikke funnet"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tilbake-knapp */}
      <Link
        href="/dashboard/cases"
        className="inline-flex items-center gap-1 text-sm text-brand-600 dark:text-brand-400 hover:underline
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Saker
      </Link>

      {/* Sakshode */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
        {caseData.fromCache && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
            Viser lokal cache — Plan & Build utilgjengelig
          </p>
        )}

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-gray-500 dark:text-slate-400 font-mono">{caseData.caseNumber}</p>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white mt-0.5 leading-snug">
              {caseData.title}
            </h1>
          </div>
          {caseData.url && (
            <a
              href={caseData.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Åpne i Plan & Build"
              className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-200
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span className="sr-only">Åpne i Plan & Build</span>
            </a>
          )}
        </div>

        {/* Detaljer */}
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {caseData.address && (
            <>
              <dt className="text-gray-500 dark:text-slate-400">Adresse</dt>
              <dd className="text-gray-900 dark:text-white">{caseData.address}</dd>
            </>
          )}
          {caseData.status && (
            <>
              <dt className="text-gray-500 dark:text-slate-400">Status</dt>
              <dd className="text-gray-900 dark:text-white">{caseData.status}</dd>
            </>
          )}
          {caseData.responsiblePerson && (
            <>
              <dt className="text-gray-500 dark:text-slate-400">Ansvarlig</dt>
              <dd className="text-gray-900 dark:text-white">{caseData.responsiblePerson}</dd>
            </>
          )}
          {caseData.createdDate && (
            <>
              <dt className="text-gray-500 dark:text-slate-400">Opprettet</dt>
              <dd className="text-gray-900 dark:text-white">
                {new Date(caseData.createdDate).toLocaleDateString("nb-NO")}
              </dd>
            </>
          )}
        </dl>

        {/* Beskrivelse */}
        {caseData.description && (
          <p className="mt-3 text-sm text-gray-700 dark:text-slate-300 leading-relaxed border-t border-gray-100 dark:border-slate-700 pt-3">
            {caseData.description}
          </p>
        )}

        {/* Prioritet */}
        <div className="mt-3 flex items-center gap-3 border-t border-gray-100 dark:border-slate-700 pt-3">
          <span className="text-xs text-gray-500 dark:text-slate-400">Prioritet:</span>
          <PrioritySelector
            caseNumber={caseData.caseNumber}
            current={caseData.priority}
            onChange={(p) => setCaseData((d) => d ? { ...d, priority: p as CaseDetail["priority"] } : d)}
          />
        </div>
      </div>

      {/* Besøk */}
      <VisitsList
        caseNumber={caseData.caseNumber}
        visits={visits}
        onVisitAdded={(v) => setVisits((prev) => [...prev, v])}
      />

      {/* Oppgaver */}
      <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
        <TaskList caseNumber={caseData.caseNumber} initialTasks={tasks} />
      </section>

      {/* Dokumenter fra SIF */}
      <DocumentsList caseNumber={caseData.caseNumber} />
    </div>
  );
}
