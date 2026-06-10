"use client";

import { useCallback, useEffect, useState } from "react";
import SearchableMultiSelect from "@/components/ui/SearchableMultiSelect";
import { authFetch } from "@/lib/auth-fetch";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/checklist/filter-engine";
import type { CheckpointCategory } from "@/types";

// ── Constants ──────────────────────────────────────────────────────────────────

const SEVERITY_LABELS: Record<string, string> = {
  critical: "Kritisk",
  warning: "Advarsel",
  info: "Info",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  warning: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  info: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
};

// ── Types ──────────────────────────────────────────────────────────────────────

interface CodetableItem {
  code: string;
  description: string;
}

interface Checkpoint {
  id: string;
  title: string;
  category: CheckpointCategory;
  description: string;
  applies_to: string[];
  required_tags: string[];
  applies_to_omrade: string[];
  applies_to_type_codes: string[];
  severity: string;
  legal_reference: string | null;
  legal_reference_url: string | null;
  active: boolean;
  sort_order: number;
}

type DraftCheckpoint = Omit<Checkpoint, "sort_order" | "active">;

const EMPTY_DRAFT: DraftCheckpoint = {
  id: "",
  title: "",
  category: "formelle_forhold",
  description: "",
  applies_to: [],
  required_tags: [],
  applies_to_omrade: [],
  applies_to_type_codes: [],
  severity: "info",
  legal_reference: "",
  legal_reference_url: "",
};

// ── CheckpointForm ─────────────────────────────────────────────────────────────

function CheckpointForm({
  initial,
  omradeItems,
  typeItems,
  onSave,
  onCancel,
  isNew,
}: {
  initial: DraftCheckpoint;
  omradeItems: CodetableItem[];
  typeItems: CodetableItem[];
  onSave: (draft: DraftCheckpoint) => Promise<void>;
  onCancel: () => void;
  isNew: boolean;
}) {
  const [draft, setDraft] = useState<DraftCheckpoint>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!draft.title.trim() || !draft.category) {
      setError("Tittel og kategori er påkrevd.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(draft);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ukjent feil");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* ID */}
      {isNew && (
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
            ID (valgfritt — auto-genereres hvis tom)
          </label>
          <input
            type="text"
            value={draft.id}
            onChange={(e) => setDraft((d) => ({ ...d, id: e.target.value }))}
            placeholder="F.eks. FF006"
            className="input w-full text-sm font-mono"
          />
        </div>
      )}
      {!isNew && (
        <div className="text-xs text-gray-400 dark:text-slate-500 font-mono">ID: {draft.id}</div>
      )}

      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Tittel *</label>
        <input
          type="text"
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          className="input w-full text-sm"
          autoFocus={isNew}
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Kategori *</label>
        <select
          value={draft.category}
          onChange={(e) =>
            setDraft((d) => ({ ...d, category: e.target.value as CheckpointCategory }))
          }
          className="input w-full text-sm"
        >
          {CATEGORY_ORDER.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Beskrivelse / veiledning
        </label>
        <textarea
          value={draft.description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          rows={3}
          className="input w-full text-sm resize-none"
        />
      </div>

      {/* Severity */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Alvorlighetsgrad</label>
        <div className="flex gap-2">
          {(["critical", "warning", "info"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setDraft((d) => ({ ...d, severity: s }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                draft.severity === s
                  ? `${SEVERITY_COLORS[s]} border-transparent`
                  : "bg-white dark:bg-slate-700 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600"
              }`}
            >
              {SEVERITY_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Legal reference */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Lovhenvisning (valgfritt)
        </label>
        <input
          type="text"
          value={draft.legal_reference ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, legal_reference: e.target.value }))}
          placeholder="F.eks. pbl § 21-4"
          className="input w-full text-sm"
        />
        <div className="mt-1.5">
          <input
            type="url"
            value={draft.legal_reference_url ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, legal_reference_url: e.target.value }))}
            placeholder="Hyperlenke (valgfritt) — f.eks. https://lovdata.no/…"
            className="input w-full text-sm"
          />
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
            Brukes som lenke på lovhenvisningen. Overstyrer auto-generert Lovdata-lenke.
          </p>
        </div>
      </div>

      {/* Befaringsområde filter */}
      <SearchableMultiSelect
        label="Gjelder for befaringsområde"
        items={omradeItems}
        selected={draft.applies_to_omrade}
        onChange={(v) => setDraft((d) => ({ ...d, applies_to_omrade: v }))}
        placeholder={
          omradeItems.length > 0 ? "Søk etter befaringsområde…" : "Ingen kodetabellverdier lastet"
        }
        emptyHint="Tom = gjelder alle befaringsområder"
      />

      {/* Tiltakstype filter */}
      <SearchableMultiSelect
        label="Gjelder for tiltakstype"
        items={typeItems}
        selected={draft.applies_to_type_codes}
        onChange={(v) => setDraft((d) => ({ ...d, applies_to_type_codes: v }))}
        placeholder={
          typeItems.length > 0 ? "Søk etter tiltakstype…" : "Ingen kodetabellverdier lastet"
        }
        emptyHint="Tom = gjelder alle tiltakstyper"
      />

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSubmit}
          disabled={saving || !draft.title.trim()}
          className="px-4 py-2 bg-brand-600 text-white text-sm rounded-xl disabled:opacity-40 hover:bg-brand-700 transition"
        >
          {saving ? "Lagrer…" : isNew ? "Opprett sjekkpunkt" : "Lagre endringer"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-500 dark:text-slate-400 text-sm hover:text-gray-700 dark:hover:text-slate-200"
        >
          Avbryt
        </button>
      </div>
    </div>
  );
}

// ── CheckpointRow ──────────────────────────────────────────────────────────────

function CheckpointRow({
  checkpoint,
  omradeItems,
  typeItems,
  onUpdate,
  onDelete,
}: {
  checkpoint: Checkpoint;
  omradeItems: CodetableItem[];
  typeItems: CodetableItem[];
  onUpdate: (updated: Checkpoint) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleToggleActive() {
    setToggling(true);
    const res = await authFetch("/api/admin/checkpoints", {
      method: "PATCH",
      body: JSON.stringify({ id: checkpoint.id, active: !checkpoint.active }),
    });
    const json = await res.json();
    if (json.ok) onUpdate(json.checkpoint);
    setToggling(false);
  }

  async function handleDelete() {
    if (!confirm(`Slett sjekkpunkt "${checkpoint.title}"?`)) return;
    setDeleting(true);
    await authFetch(`/api/admin/checkpoints?id=${encodeURIComponent(checkpoint.id)}`, {
      method: "DELETE",
    });
    onDelete(checkpoint.id);
    setDeleting(false);
  }

  async function handleSave(draft: DraftCheckpoint) {
    const res = await authFetch("/api/admin/checkpoints", {
      method: "PATCH",
      body: JSON.stringify({
        id: checkpoint.id,
        title: draft.title,
        category: draft.category,
        description: draft.description,
        applies_to: draft.applies_to,
        required_tags: draft.required_tags,
        applies_to_omrade: draft.applies_to_omrade,
        applies_to_type_codes: draft.applies_to_type_codes,
        severity: draft.severity,
        legal_reference: draft.legal_reference || null,
        legal_reference_url: draft.legal_reference_url || null,
      }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error ?? "Feil ved lagring");
    onUpdate(json.checkpoint);
    setExpanded(false);
  }

  const omradeDesc = (checkpoint.applies_to_omrade ?? [])
    .map((c) => omradeItems.find((i) => i.code === c)?.description ?? c)
    .join(", ");
  const typeDesc = (checkpoint.applies_to_type_codes ?? [])
    .map((c) => typeItems.find((i) => i.code === c)?.description ?? c)
    .join(", ");

  return (
    <div
      className={`border rounded-xl transition ${checkpoint.active ? "border-gray-200 dark:border-slate-700" : "border-gray-100 dark:border-slate-800 opacity-60"}`}
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 ${expanded ? "rounded-t-xl" : "rounded-xl"}`}
      >
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            checkpoint.severity === "critical"
              ? "bg-red-500"
              : checkpoint.severity === "warning"
                ? "bg-amber-400"
                : "bg-blue-400"
          }`}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
              {checkpoint.title}
            </span>
            <span className="text-xs text-gray-400 dark:text-slate-500 font-mono">
              {checkpoint.id}
            </span>
            {checkpoint.legal_reference && (
              <span className="text-xs text-brand-600 dark:text-brand-400">
                {checkpoint.legal_reference}
              </span>
            )}
            {!checkpoint.active && (
              <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
                Inaktiv
              </span>
            )}
          </div>
          {(omradeDesc || typeDesc) && (
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 truncate">
              {[omradeDesc && `Område: ${omradeDesc}`, typeDesc && `Type: ${typeDesc}`]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-800 font-medium transition"
          >
            {expanded ? "Lukk" : "Rediger"}
          </button>
          <button
            onClick={handleToggleActive}
            disabled={toggling}
            className="text-xs text-gray-500 hover:text-gray-700 transition disabled:opacity-40"
          >
            {toggling ? "…" : checkpoint.active ? "Deaktiver" : "Aktiver"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs text-red-500 hover:text-red-700 transition disabled:opacity-40"
          >
            {deleting ? "Sletter…" : "Slett"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-slate-700 px-4 py-4 bg-gray-50 dark:bg-slate-700/30 rounded-b-xl">
          <CheckpointForm
            initial={{
              id: checkpoint.id,
              title: checkpoint.title,
              category: checkpoint.category,
              description: checkpoint.description,
              applies_to: checkpoint.applies_to,
              required_tags: checkpoint.required_tags,
              applies_to_omrade: checkpoint.applies_to_omrade ?? [],
              applies_to_type_codes: checkpoint.applies_to_type_codes ?? [],
              severity: checkpoint.severity,
              legal_reference: checkpoint.legal_reference ?? "",
              legal_reference_url: checkpoint.legal_reference_url ?? "",
            }}
            omradeItems={omradeItems}
            typeItems={typeItems}
            onSave={handleSave}
            onCancel={() => setExpanded(false)}
            isNew={false}
          />
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function CheckpointsAdminPage() {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<CheckpointCategory | "all">("all");
  const [showInactive, setShowInactive] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);

  const [omradeItems, setOmradeItems] = useState<CodetableItem[]>([]);
  const [typeItems, setTypeItems] = useState<CodetableItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await authFetch("/api/admin/checkpoints");
    const json = await res.json();
    setCheckpoints(json.checkpoints ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // Load codetables for filtering fields
    authFetch("/api/inspection-codetables?type=supervision-area")
      .then((r) => r.json())
      .then((j) => setOmradeItems(j.items ?? []));
    authFetch("/api/inspection-codetables?type=measure-type")
      .then((r) => r.json())
      .then((j) => setTypeItems(j.items ?? []));
  }, [load]);

  async function handleCreate(draft: DraftCheckpoint) {
    const res = await authFetch("/api/admin/checkpoints", {
      method: "POST",
      body: JSON.stringify({
        id: draft.id || undefined,
        title: draft.title,
        category: draft.category,
        description: draft.description,
        applies_to: draft.applies_to,
        required_tags: draft.required_tags,
        applies_to_omrade: draft.applies_to_omrade,
        applies_to_type_codes: draft.applies_to_type_codes,
        severity: draft.severity,
        legal_reference: draft.legal_reference || null,
        legal_reference_url: draft.legal_reference_url || null,
      }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error ?? "Feil ved oppretting");
    setCheckpoints((prev) => [...prev, json.checkpoint]);
    setShowNewForm(false);
  }

  function handleUpdate(updated: Checkpoint) {
    setCheckpoints((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  function handleDelete(id: string) {
    setCheckpoints((prev) => prev.filter((c) => c.id !== id));
  }

  const filtered = checkpoints.filter((c) => {
    if (!showInactive && !c.active) return false;
    if (filterCategory !== "all" && c.category !== filterCategory) return false;
    return true;
  });

  const grouped = CATEGORY_ORDER.reduce<Record<string, Checkpoint[]>>((acc, cat) => {
    const items = filtered.filter((c) => c.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  const totalActive = checkpoints.filter((c) => c.active).length;
  const totalInactive = checkpoints.filter((c) => !c.active).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Sjekkpunkter</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {totalActive} aktive{totalInactive > 0 ? `, ${totalInactive} inaktive` : ""}{" "}
            sjekkpunkter
          </p>
        </div>
        <button
          onClick={() => setShowNewForm((v) => !v)}
          className="px-4 py-2 bg-brand-600 text-white text-sm rounded-xl hover:bg-brand-700 transition flex-shrink-0"
        >
          {showNewForm ? "Avbryt" : "+ Nytt sjekkpunkt"}
        </button>
      </div>

      {showNewForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-brand-200 dark:border-brand-700 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-4">
            Nytt sjekkpunkt
          </h2>
          <CheckpointForm
            initial={EMPTY_DRAFT}
            omradeItems={omradeItems}
            typeItems={typeItems}
            onSave={handleCreate}
            onCancel={() => setShowNewForm(false)}
            isNew
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterCategory("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              filterCategory === "all"
                ? "bg-brand-600 text-white"
                : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600"
            }`}
          >
            Alle kategorier
          </button>
          {CATEGORY_ORDER.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                filterCategory === cat
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
        {totalInactive > 0 && (
          <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 cursor-pointer ml-auto">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300"
            />
            Vis inaktive
          </label>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 dark:text-slate-500 animate-pulse py-8 text-center">
          Laster sjekkpunkter…
        </p>
      ) : Object.keys(grouped).length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-slate-500 py-8 text-center">
          Ingen sjekkpunkter funnet.
        </p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                {CATEGORY_LABELS[cat as CheckpointCategory]}
                <span className="ml-2 text-gray-400 dark:text-slate-500 font-normal normal-case">
                  ({items.length})
                </span>
              </h2>
              <div className="space-y-2">
                {items.map((cp) => (
                  <CheckpointRow
                    key={cp.id}
                    checkpoint={cp}
                    omradeItems={omradeItems}
                    typeItems={typeItems}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
