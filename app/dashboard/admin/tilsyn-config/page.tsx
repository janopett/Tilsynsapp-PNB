"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/auth-fetch";

interface ListItem {
  id: string;
  label: string;
  sort_order: number;
  active: boolean;
}

interface CategorySectionProps {
  category: "tilsynsomrade" | "tilsynstype";
  title: string;
}

function CategorySection({ category, title }: CategorySectionProps) {
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await authFetch(`/api/admin/inspection-config?category=${category}`);
    const json = await res.json();
    setItems(json.items ?? []);
    setLoading(false);
  }, [category]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    if (!newLabel.trim()) return;
    setAdding(true);
    setError("");
    const res = await authFetch("/api/admin/inspection-config", {
      method: "POST",
      body: JSON.stringify({ category, label: newLabel.trim() }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Feil ved lagring");
    } else {
      setNewLabel("");
      await load();
    }
    setAdding(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await authFetch(`/api/admin/inspection-config?id=${id}`, { method: "DELETE" });
    await load();
    setDeletingId(null);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h2 className="text-base font-semibold text-gray-900 mb-4">{title}</h2>

      {loading ? (
        <p className="text-sm text-gray-400 animate-pulse">Laster…</p>
      ) : (
        <ul className="divide-y divide-gray-100 mb-4">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-800">{item.label}</span>
              <button
                onClick={() => handleDelete(item.id)}
                disabled={deletingId === item.id}
                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 transition"
              >
                {deletingId === item.id ? "Sletter…" : "Slett"}
              </button>
            </li>
          ))}
          {items.length === 0 && (
            <li className="py-3 text-sm text-gray-400 text-center">Ingen elementer ennå</li>
          )}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Nytt element…"
          className="input flex-1 text-sm"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newLabel.trim()}
          className="px-4 py-2 bg-brand-600 text-white text-sm rounded-xl disabled:opacity-40 hover:bg-brand-700 transition"
        >
          {adding ? "Legger til…" : "Legg til"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}

export default function TilsynConfigPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Tilsynskonfigurering</h1>
        <p className="text-sm text-gray-500 mt-1">
          Administrer listene for tilsynsområde og tilsynstype.
        </p>
      </div>

      <CategorySection category="tilsynsomrade" title="Tilsynsområde" />
      <CategorySection category="tilsynstype" title="Tilsynstype" />
    </div>
  );
}
