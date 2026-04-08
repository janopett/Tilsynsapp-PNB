"use client";

import Link from "next/link";

// ============================================================
// Typer
// ============================================================

export interface CaseCardData {
  id?: string | null;
  caseNumber: string;
  title: string;
  address?: string | null;
  status?: string | null;
  priority?: "low" | "normal" | "high";
  fromCache?: boolean;
}

// ============================================================
// Prioritets-badge
// ============================================================

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { label: string; className: string }> = {
    high:   { label: "Høy",    className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
    normal: { label: "Normal", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
    low:    { label: "Lav",    className: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300" },
  };
  const cfg = map[priority] ?? map.normal;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ============================================================
// Status-badge (SIF-statuser er fritekst på norsk)
// ============================================================

function StatusBadge({ status }: { status: string }) {
  const lower = status.toLowerCase();
  let className = "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300";

  if (lower.includes("behandl")) {
    className = "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
  } else if (lower.includes("avslut") || lower.includes("arkiv")) {
    className = "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
  } else if (lower.includes("avvist") || lower.includes("avslag")) {
    className = "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
  } else if (lower.includes("utsatt") || lower.includes("pause")) {
    className = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300";
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {status}
    </span>
  );
}

// ============================================================
// Mappe-ikon
// ============================================================

function CaseIcon() {
  return (
    <svg className="w-5 h-5 shrink-0 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  );
}

// ============================================================
// CaseCard — sakslisteinnslag
// ============================================================

export default function CaseCard({ c }: { c: CaseCardData }) {
  return (
    <Link
      href={`/dashboard/cases/${encodeURIComponent(c.caseNumber)}`}
      className="block bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700
                 p-4 hover:border-brand-400 dark:hover:border-brand-500
                 transition-colors duration-150 focus-visible:outline-none
                 focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <CaseIcon />
        </div>

        <div className="min-w-0 flex-1">
          {/* Saksnummer */}
          <p className="text-xs text-gray-500 dark:text-slate-400 font-mono mb-0.5">
            {c.caseNumber}
            {c.fromCache && (
              <span className="ml-2 text-amber-600 dark:text-amber-400">(lokal cache)</span>
            )}
          </p>

          {/* Tittel */}
          <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug truncate">
            {c.title}
          </p>

          {/* Adresse */}
          {c.address && (
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 truncate">
              {c.address}
            </p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {c.priority && c.priority !== "normal" && (
              <PriorityBadge priority={c.priority} />
            )}
            {c.status && <StatusBadge status={c.status} />}
          </div>
        </div>

        {/* Pil */}
        <svg className="w-4 h-4 shrink-0 text-gray-400 dark:text-slate-500 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
