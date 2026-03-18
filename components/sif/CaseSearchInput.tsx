"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep internal query in sync when parent resets value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close dropdown on outside click
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
    setLoading(true);
    try {
      const res = await authFetch(`/api/sif/case-search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      if (data.ok && data.cases.length > 0) {
        setResults(data.cases);
        setOpen(true);
      } else {
        setResults([]);
        setOpen(false);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    onChange(val);

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
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={className}
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs animate-pulse">
            Søker…
          </span>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {results.map((c) => (
            <li key={c.recno}>
              <button
                type="button"
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition flex flex-col gap-0.5"
                onMouseDown={() => handleSelect(c)}
              >
                <span className="text-sm font-medium text-gray-900 font-mono">{c.caseNumber}</span>
                <span className="text-xs text-gray-500 truncate">{c.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
