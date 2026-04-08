"use client";

import { useState } from "react";
import { authFetch } from "@/lib/auth-fetch";

interface VisitFormProps {
  caseNumber: string;
  onCreated: (visit: VisitRow) => void;
  onCancel: () => void;
}

export interface VisitRow {
  id: string;
  scheduled_at: string;
  notes: string | null;
  status: "planned" | "completed" | "cancelled";
  created_at: string;
}

export default function VisitForm({ caseNumber, onCreated, onCancel }: VisitFormProps) {
  const [scheduledAt, setScheduledAt] = useState(() => {
    // Standard: i morgen kl. 09:00
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"planned" | "completed" | "cancelled">("planned");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await authFetch(
        `/api/cases/${encodeURIComponent(caseNumber)}/visits`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduled_at: new Date(scheduledAt).toISOString(),
            notes: notes.trim() || undefined,
            status,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Kunne ikke opprette besøk");
      }

      const visit = await res.json() as VisitRow;
      onCreated(visit);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-4"
      aria-label="Nytt besøk"
    >
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Registrer besøk</h3>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Dato og tid */}
      <div>
        <label htmlFor="visit-datetime" className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
          Dato og tid <span aria-hidden="true">*</span>
        </label>
        <input
          id="visit-datetime"
          type="datetime-local"
          required
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="w-full rounded-lg border border-gray-300 dark:border-slate-600
                     bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                     px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Status */}
      <div>
        <label htmlFor="visit-status" className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
          Status
        </label>
        <select
          id="visit-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="w-full rounded-lg border border-gray-300 dark:border-slate-600
                     bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                     px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="planned">Planlagt</option>
          <option value="completed">Gjennomført</option>
          <option value="cancelled">Avlyst</option>
        </select>
      </div>

      {/* Notater */}
      <div>
        <label htmlFor="visit-notes" className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
          Notater
        </label>
        <textarea
          id="visit-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Hva ble gjort, funn, neste steg…"
          className="w-full rounded-lg border border-gray-300 dark:border-slate-600
                     bg-white dark:bg-slate-700 text-gray-900 dark:text-white
                     px-3 py-2 text-sm resize-none
                     focus:outline-none focus:ring-2 focus:ring-brand-500
                     placeholder:text-gray-400"
        />
      </div>

      {/* Knapper */}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium rounded-lg
                     text-gray-700 dark:text-slate-300
                     bg-gray-100 dark:bg-slate-700
                     hover:bg-gray-200 dark:hover:bg-slate-600
                     disabled:opacity-50 transition"
        >
          Avbryt
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium rounded-lg
                     text-white bg-brand-600 hover:bg-brand-700
                     disabled:opacity-50 transition
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {loading ? "Lagrer…" : "Lagre besøk"}
        </button>
      </div>
    </form>
  );
}
