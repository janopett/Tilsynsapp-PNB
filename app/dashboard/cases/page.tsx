"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import CaseCard, { type CaseCardData } from "@/components/cases/CaseCard";
import { authFetch } from "@/lib/auth-fetch";

// ============================================================
// Søk-ikon
// ============================================================

function SearchIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
    </svg>
  );
}

// ============================================================
// Filterpanel
// ============================================================

const PRIORITY_OPTIONS = [
  { value: "", label: "Alle prioriteter" },
  { value: "high", label: "Høy" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Lav" },
];

// ============================================================
// Saksliste-side
// ============================================================

export default function CasesPage() {
  const [cases, setCases] = useState<CaseCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState<number | undefined>();
  const [fromCache, setFromCache] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCases = useCallback(
    async (q: string, pri: string, p: number) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(p), limit: "30" });
        if (q.trim()) params.set("search", q.trim());
        if (pri) params.set("priority", pri);

        const res = await authFetch(`/api/cases?${params}`);
        if (!res.ok) throw new Error("Kunne ikke hente saker");
        const data = await res.json();
        setCases(data.cases ?? []);
        setTotalPages(data.totalPages);
        setFromCache(!!data.fromCache);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ukjent feil");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Initial henting
  useEffect(() => {
    fetchCases(search, priority, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priority, page]);

  // Debounced søk
  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchCases(value, priority, 1);
    }, 400);
  }

  function handlePriorityChange(value: string) {
    setPriority(value);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Overskrift */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Saker</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
          Saker fra Plan &amp; Build
        </p>
      </div>

      {/* Søk og filtre */}
      <div className="space-y-2">
        {/* Søkefelt */}
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <SearchIcon />
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Søk på tittel…"
            aria-label="Søk i saker"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-600
                       bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-500
                       placeholder:text-gray-400"
          />
        </div>

        {/* Prioritetsfilter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {PRIORITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handlePriorityChange(opt.value)}
              aria-pressed={priority === opt.value}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500
                          ${
                            priority === opt.value
                              ? "bg-brand-600 text-white"
                              : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                          }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cache-advarsel */}
      {fromCache && (
        <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
          Viser saker fra lokal cache — Plan & Build er ikke tilgjengelig.
        </p>
      )}

      {/* Feilmelding */}
      {error && (
        <div role="alert" className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
          <p className="font-medium">Feil ved henting av saker</p>
          <p className="mt-0.5 text-xs">{error}</p>
          <button
            onClick={() => fetchCases(search, priority, page)}
            className="mt-2 text-xs underline hover:no-underline focus-visible:outline-none"
          >
            Prøv igjen
          </button>
        </div>
      )}

      {/* Lastespinner */}
      {loading && (
        <div className="space-y-3" aria-live="polite" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-gray-100 dark:bg-slate-800 animate-pulse"
              aria-hidden="true"
            />
          ))}
          <span className="sr-only">Henter saker…</span>
        </div>
      )}

      {/* Tom tilstand */}
      {!loading && !error && cases.length === 0 && (
        <div className="text-center py-12">
          <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          </svg>
          <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">
            {search ? "Ingen saker matcher søket" : "Ingen saker funnet"}
          </p>
          {search && (
            <button
              onClick={() => handleSearchChange("")}
              className="mt-2 text-sm text-brand-600 dark:text-brand-400 hover:underline
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
            >
              Nullstill søk
            </button>
          )}
        </div>
      )}

      {/* Saksliste */}
      {!loading && cases.length > 0 && (
        <ul className="space-y-2" aria-label={`${cases.length} saker`}>
          {cases.map((c) => (
            <li key={c.caseNumber}>
              <CaseCard c={c} />
            </li>
          ))}
        </ul>
      )}

      {/* Paginering */}
      {!loading && totalPages && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 text-sm font-medium rounded-lg
                       bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300
                       disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-slate-600
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition"
          >
            Forrige
          </button>
          <span className="text-sm text-gray-600 dark:text-slate-400">
            Side {page} av {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
            className="px-4 py-2 text-sm font-medium rounded-lg
                       bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300
                       disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-slate-600
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition"
          >
            Neste
          </button>
        </div>
      )}
    </div>
  );
}
