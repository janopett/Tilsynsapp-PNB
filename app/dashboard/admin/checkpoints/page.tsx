"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/checklist/filter-engine";
import type { CheckpointCategory, MeasureTypeId, PropertyTag } from "@/types";

// ── Constants ──────────────────────────────────────────────────────────────────

const SEVERITY_LABELS: Record<string, string> = {
  critical: "Kritisk",
  warning: "Advarsel",
  info: "Info",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-700",
  info: "bg-blue-100 text-blue-700",
};

const MEASURE_TYPE_OPTIONS: { id: MeasureTypeId; label: string }[] = [
  { id: "garasje_carport",   label: "Garasje / Carport" },
  { id: "tilbygg",           label: "Tilbygg" },
  { id: "paabygg",           label: "Påbygg" },
  { id: "enebolig",          label: "Enebolig" },
  { id: "bruksendring",      label: "Bruksendring" },
  { id: "terrasse_balkong",  label: "Terrasse / Balkong" },
  { id: "stoettemur",        label: "Støttemur" },
  { id: "riving",            label: "Riving" },
];

const PROPERTY_TAG_OPTIONS: { tag: PropertyTag; label: string }[] = [
  { tag: "soeknadspliktig",       label: "Søknadspliktig" },
  { tag: "naer_nabogrense",       label: "Nær nabogrense" },
  { tag: "inneholder_vaatrom",    label: "Inneholder våtrom" },
  { tag: "har_brannskille",       label: "Har brannskille" },
  { tag: "har_terrengendring",    label: "Har terrengendring" },
  { tag: "har_elektrisk_arbeid",  label: "Har elektrisk arbeid" },
  { tag: "har_va_overvann",       label: "Har VA / overvann" },
  { tag: "krever_tilgjengelighet","label": "Krever tilgjengelighet" },
  { tag: "har_ansvarlige_foretak","label": "Har ansvarlige foretak" },
  { tag: "har_dispensasjon",      label: "Har dispensasjon" },
];

// ── Types ──────────────────────────────────────────────────────────────────────

interface Checkpoint {
  id: string;
  title: string;
  category: CheckpointCategory;
  description: string;
  applies_to: string[];
  required_tags: string[];
  severity: string;
  legal_reference: string | null;
  active: boolean;
  sort_order: number;
}

type DraftCheckpoint = Omit<Checkpoint, "id" | "sort_order" | "active"> & {
  id: string;
};

const EMPTY_DRAFT: DraftCheckpoint = {
  id: "",
  title: "",
  category: "formelle_forhold",
  description: "",
  applies_to: [],
  required_tags: [],
  severity: "info",
  legal_reference: "",
};

// ── CheckpointForm ─────────────────────────────────────────────────────────────

function CheckpointForm({
  initial,
  onSave,
  onCancel,
  isNew,
}: {
  initial: DraftCheckpoint;
  onSave: (draft: DraftCheckpoint) => Promise<void>;
  onCancel: () => void;
  isNew: boolean;
}) {
  const [draft, setDraft] = useState<DraftCheckpoint>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleArray<T extends string>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
  }

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
      {/* ID — only editable for new checkpoints */}
      {isNew && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
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
        <div className="text-xs text-gray-400 font-mono">ID: {draft.id}</div>
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
          onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as CheckpointCategory }))}
          className="input w-full text-sm"
        >
          {CATEGORY_ORDER.map((cat) => (
            <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Beskrivelse / veiledning</label>
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
                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {SEVERITY_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Legal reference */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Lovhenvisning (valgfritt)</label>
        <input
          type="text"
          value={draft.legal_reference ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, legal_reference: e.target.value }))}
          placeholder="F.eks. pbl § 21-4"
          className="input w-full text-sm"
        />
      </div>

      {/* Applies to — measure types */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">
          Gjelder for tiltakstyper
          <span className="ml-1 font-normal text-gray-400">(velg alle som er relevante)</span>
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {MEASURE_TYPE_OPTIONS.map(({ id, label }) => (
            <label key={id} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={draft.applies_to.includes(id)}
                onChange={() => setDraft((d) => ({ ...d, applies_to: toggleArray(d.applies_to, id) }))}
                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Required tags — property questions */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">
          Vises kun hvis egenskap er valgt
          <span className="ml-1 font-normal text-gray-400">(alle må være til stede)</span>
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {PROPERTY_TAG_OPTIONS.map(({ tag, label }) => (
            <label key={tag} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={draft.required_tags.includes(tag)}
                onChange={() => setDraft((d) => ({ ...d, required_tags: toggleArray(d.required_tags, tag) }))}
                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

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
          className="px-4 py-2 text-gray-500 text-sm hover:text-gray-700"
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
  onUpdate,
  onDelete,
}: {
  checkpoint: Checkpoint;
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
    if (!confirm(`Slett sjekkpunkt "${checkpoint.title}"? Har inspeksjoner allerede brukt dette sjekkpunktet, deaktiveres det i stedet for å slettes.`)) return;
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
        severity: draft.severity,
        legal_reference: draft.legal_reference || null,
      }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error ?? "Feil ved lagring");
    onUpdate(json.checkpoint);
    setExpanded(false);
  }

  return (
    <div className={`border rounded-xl overflow-hidden transition ${checkpoint.active ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white">
        {/* Severity dot */}
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            checkpoint.severity === "critical" ? "bg-red-500" :
            checkpoint.severity === "warning" ? "bg-amber-400" : "bg-blue-400"
          }`}
        />

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-900 truncate">{checkpoint.title}</span>
            <span className="text-xs text-gray-400 font-mono">{checkpoint.id}</span>
            {checkpoint.legal_reference && (
              <span className="text-xs text-brand-600">{checkpoint.legal_reference}</span>
            )}
            {!checkpoint.active && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inaktiv</span>
            )}
          </div>
          {checkpoint.required_tags.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              Krever: {checkpoint.required_tags.map((t) => PROPERTY_TAG_OPTIONS.find((p) => p.tag === t)?.label ?? t).join(", ")}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-xs text-brand-600 hover:text-brand-800 font-medium transition"
          >
            {expanded ? "Lukk" : "Rediger"}
          </button>
          <button
            onClick={handleToggleActive}
            disabled={toggling}
            className="text-xs text-gray-500 hover:text-gray-700 transition disabled:opacity-40"
            title={checkpoint.active ? "Deaktiver" : "Aktiver"}
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

      {/* Expanded edit form */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 bg-gray-50">
          <CheckpointForm
            initial={{
              id: checkpoint.id,
              title: checkpoint.title,
              category: checkpoint.category,
              description: checkpoint.description,
              applies_to: checkpoint.applies_to,
              required_tags: checkpoint.required_tags,
              severity: checkpoint.severity,
              legal_reference: checkpoint.legal_reference ?? "",
            }}
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

  const load = useCallback(async () => {
    setLoading(true);
    const res = await authFetch("/api/admin/checkpoints");
    const json = await res.json();
    setCheckpoints(json.checkpoints ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

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
        severity: draft.severity,
        legal_reference: draft.legal_reference || null,
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

  // Group by category preserving CATEGORY_ORDER
  const grouped = CATEGORY_ORDER.reduce<Record<string, Checkpoint[]>>((acc, cat) => {
    const items = filtered.filter((c) => c.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  const totalActive = checkpoints.filter((c) => c.active).length;
  const totalInactive = checkpoints.filter((c) => !c.active).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sjekkpunkter</h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalActive} aktive{totalInactive > 0 ? `, ${totalInactive} inaktive` : ""} sjekkpunkter
          </p>
        </div>
        <button
          onClick={() => setShowNewForm((v) => !v)}
          className="px-4 py-2 bg-brand-600 text-white text-sm rounded-xl hover:bg-brand-700 transition flex-shrink-0"
        >
          {showNewForm ? "Avbryt" : "+ Nytt sjekkpunkt"}
        </button>
      </div>

      {/* New checkpoint form */}
      {showNewForm && (
        <div className="bg-white rounded-2xl border border-brand-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Nytt sjekkpunkt</h2>
          <CheckpointForm
            initial={EMPTY_DRAFT}
            onSave={handleCreate}
            onCancel={() => setShowNewForm(false)}
            isNew
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Category filter */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterCategory("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              filterCategory === "all"
                ? "bg-brand-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Show inactive toggle */}
        {totalInactive > 0 && (
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer ml-auto">
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

      {/* List */}
      {loading ? (
        <p className="text-sm text-gray-400 animate-pulse py-8 text-center">Laster sjekkpunkter…</p>
      ) : Object.keys(grouped).length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">Ingen sjekkpunkter funnet.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {CATEGORY_LABELS[cat as CheckpointCategory]}
                <span className="ml-2 text-gray-400 font-normal normal-case">({items.length})</span>
              </h2>
              <div className="space-y-2">
                {items.map((cp) => (
                  <CheckpointRow
                    key={cp.id}
                    checkpoint={cp}
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
