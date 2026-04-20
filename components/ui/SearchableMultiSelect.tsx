"use client";

import { useState, useRef, useEffect } from "react";

interface Item {
  code: string;
  description: string;
}

interface SearchableMultiSelectProps {
  label: string;
  items: Item[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  emptyHint?: string;
}

export default function SearchableMultiSelect({
  label,
  items,
  selected,
  onChange,
  placeholder = "Søk...",
  emptyHint,
}: SearchableMultiSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? items.filter((i) =>
        i.description.toLowerCase().includes(query.toLowerCase())
      )
    : items;

  function toggle(code: string) {
    onChange(
      selected.includes(code)
        ? selected.filter((c) => c !== code)
        : [...selected, code]
    );
  }

  function remove(code: string) {
    onChange(selected.filter((c) => c !== code));
  }

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

  const selectedItems = items.filter((i) => selected.includes(i.code));

  return (
    <div ref={containerRef}>
      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
        {label}
      </label>

      {/* Selected tags */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedItems.map((item) => (
            <span
              key={item.code}
              className="inline-flex items-center gap-1 text-xs bg-brand-100 dark:bg-brand-900/40 text-brand-800 dark:text-brand-300 rounded-full px-2.5 py-1"
            >
              {item.description}
              <button
                type="button"
                onClick={() => remove(item.code)}
                aria-label={`Fjern ${item.description}`}
                className="hover:text-brand-600 dark:hover:text-brand-200 leading-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Empty hint */}
      {emptyHint && selected.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-1.5">{emptyHint}</p>
      )}

      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          className="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm
                     bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100
                     placeholder-gray-400 dark:placeholder-slate-400
                     focus:outline-none focus:ring-2 focus:ring-brand-500"
        />

        {open && filtered.length > 0 && (
          <ul className="absolute z-30 mt-1 w-full max-h-56 overflow-auto rounded-lg
                         border border-gray-200 dark:border-slate-600
                         bg-white dark:bg-slate-800 shadow-lg text-sm">
            {filtered.map((item) => {
              const isSelected = selected.includes(item.code);
              return (
                <li key={item.code}>
                  <button
                    type="button"
                    onClick={() => { toggle(item.code); setQuery(""); }}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2 transition
                                hover:bg-gray-50 dark:hover:bg-slate-700
                                ${isSelected ? "text-brand-700 dark:text-brand-300 font-medium" : "text-gray-700 dark:text-slate-300"}`}
                  >
                    <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-xs
                                      ${isSelected
                                        ? "bg-brand-600 border-brand-600 text-white"
                                        : "border-gray-300 dark:border-slate-500"}`}>
                      {isSelected && "✓"}
                    </span>
                    {item.description}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
