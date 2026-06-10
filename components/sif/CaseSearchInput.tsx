"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import type { SifCase } from "@/types";

interface Props {
  value: string;
  onChange: (caseNumber: string) => void;
  onSelect?: (sifCase: SifCase) => void;
  placeholder?: string;
  className?: string;
}

export default function CaseSearchInput({
  value,
  onChange,
  onSelect,
  placeholder = "F.eks. TILSYN-26/00007",
  className = "input",
}: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<SifCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = "case-search-listbox";

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setNoResults(false);
    try {
      const res = await authFetch(`/api/sif/case-search?q=${encodeURIComponent(q.trim())}`, {
        signal: controller.signal,
      });
      const data = await res.json();
      if (data.ok && data.cases.length > 0) {
        setResults(data.cases);
        setNoResults(false);
        setOpen(true);
      } else {
        setResults([]);
        setNoResults(true);
        setOpen(true);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setResults([]);
      setNoResults(false);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setNoResults(false);
    if (val.trim().length < 2) {
      setOpen(false);
      setResults([]);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  }

  function handleSelect(sifCase: SifCase) {
    setQuery(sifCase.caseNumber);
    onChange(sifCase.caseNumber);
    onSelect?.(sifCase);
    setOpen(false);
    setResults([]);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={className}
          autoComplete="off"
        />
        {loading && (
          <span
            aria-live="polite"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400 text-xs animate-pulse"
          >
            Søker…
          </span>
        )}
      </div>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Søkeresultater"
          className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800
                     border border-gray-200 dark:border-slate-700
                     rounded-xl shadow-lg overflow-hidden"
        >
          {results.length > 0
            ? results.map((c) => (
                <li key={c.recno} role="option" aria-selected={false}>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2.5 transition flex flex-col gap-0.5
                               hover:bg-gray-50 dark:hover:bg-slate-700
                               focus-visible:outline-none focus-visible:bg-gray-100 dark:focus-visible:bg-slate-700"
                    onMouseDown={() => handleSelect(c)}
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-slate-100 font-mono">
                      {c.caseNumber}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-slate-400 truncate">
                      {c.title}
                    </span>
                  </button>
                </li>
              ))
            : noResults && (
                <li className="px-4 py-3 text-sm text-gray-500 dark:text-slate-400">
                  Ingen treff i Plan &amp; Build
                </li>
              )}
        </ul>
      )}
    </div>
  );
}
