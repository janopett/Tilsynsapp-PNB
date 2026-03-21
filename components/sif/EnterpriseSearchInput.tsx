"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { authFetch } from "@/lib/auth-fetch";
import type { SifEnterpriseResult } from "@/lib/sif/types";

interface Props {
  value: string;
  onChange: (name: string) => void;
  onSelect?: (enterprise: SifEnterpriseResult) => void;
  placeholder?: string;
  className?: string;
}

export default function EnterpriseSearchInput({
  value,
  onChange,
  onSelect,
  placeholder = "Søk på foretaksnavn…",
  className = "input",
}: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<SifEnterpriseResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = "enterprise-search-listbox";

  useEffect(() => { setQuery(value); }, [value]);

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
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    setNoResults(false);
    try {
      const res = await authFetch(`/api/sif/enterprise-search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      if (data.ok && data.enterprises.length > 0) {
        setResults(data.enterprises); setNoResults(false); setOpen(true);
      } else {
        setResults([]); setNoResults(true); setOpen(true);
      }
    } catch {
      setResults([]); setNoResults(false);
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
      setOpen(false); setResults([]);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  }

  function handleSelect(enterprise: SifEnterpriseResult) {
    setQuery(enterprise.Name);
    onChange(enterprise.Name);
    onSelect?.(enterprise);
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
          <span aria-live="polite" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400 text-xs animate-pulse">
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
            ? results.map((e) => (
                <li key={e.Recno} role="option" aria-selected={false}>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2.5 transition flex flex-col gap-0.5
                               hover:bg-gray-50 dark:hover:bg-slate-700
                               focus-visible:outline-none focus-visible:bg-gray-100 dark:focus-visible:bg-slate-700"
                    onMouseDown={() => handleSelect(e)}
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{e.Name}</span>
                    {(e.EnterpriseNumber || e.PostAddress?.ZipPlace) && (
                      <span className="text-xs text-gray-500 dark:text-slate-400">
                        {[e.EnterpriseNumber, e.PostAddress?.ZipPlace].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </button>
                </li>
              ))
            : noResults && (
                <li className="px-4 py-3 text-sm text-gray-500 dark:text-slate-400">
                  Ingen foretak funnet i Plan &amp; Build
                </li>
              )}
        </ul>
      )}
    </div>
  );
}
