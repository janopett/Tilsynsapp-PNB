"use client";

import { useState } from "react";
import type { CheckpointWithAnswer, CheckpointStatus, SifContact } from "@/types";
import { CATEGORY_LABELS } from "@/lib/checklist/filter-engine";
import { buildLegalUrl } from "@/lib/legal-reference";

interface Props {
  item: CheckpointWithAnswer;
  isSaving: boolean;
  contacts: SifContact[];
  onUpdate: (
    id: string,
    status: CheckpointStatus,
    comment: string,
    contactRecno: number | null,
    contactName: string | null
  ) => void;
}

const STATUS_CONFIG: Record<CheckpointStatus, { label: string; cls: string; icon: string }> = {
  not_checked: { label: "Ikke kontrollert", cls: "border-gray-200 bg-white", icon: "⬜" },
  ok: { label: "OK", cls: "border-green-300 bg-green-50", icon: "✅" },
  deviation: { label: "Avvik", cls: "border-red-300 bg-red-50", icon: "⚠️" },
};

export default function CheckpointItem({ item, isSaving, contacts, onUpdate }: Props) {
  const { definition, answer } = item;
  const currentStatus: CheckpointStatus = answer?.status ?? "not_checked";
  const [comment, setComment] = useState(answer?.comment ?? "");
  const [expanded, setExpanded] = useState(currentStatus === "deviation");
  const [selectedContactRecno, setSelectedContactRecno] = useState<number | null>(
    answer?.responsible_contact_recno ?? null
  );

  const cfg = STATUS_CONFIG[currentStatus];

  function currentContactName(): string | null {
    if (!selectedContactRecno) return null;
    return contacts.find((c) => c.recno === selectedContactRecno)?.name ?? null;
  }

  function handleStatus(status: CheckpointStatus) {
    onUpdate(definition.id, status, comment, selectedContactRecno, currentContactName());
    if (status === "deviation") setExpanded(true);
  }

  function handleCommentBlur() {
    if (comment !== (answer?.comment ?? "")) {
      onUpdate(definition.id, currentStatus, comment, selectedContactRecno, currentContactName());
    }
  }

  function handleContactChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const recno = e.target.value ? Number(e.target.value) : null;
    const name = recno ? (contacts.find((c) => c.recno === recno)?.name ?? null) : null;
    setSelectedContactRecno(recno);
    onUpdate(definition.id, currentStatus, comment, recno, name);
  }

  const severityDot =
    definition.severity === "critical"
      ? "bg-red-400"
      : definition.severity === "warning"
      ? "bg-yellow-400"
      : "bg-blue-300";

  return (
    <div className={`border-2 rounded-2xl p-4 transition ${cfg.cls} ${isSaving ? "opacity-70" : ""}`}>
      {/* Title row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <span className="mt-1 flex-shrink-0">
            <span className={`inline-block w-2 h-2 rounded-full ${severityDot}`} />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm leading-tight">
              {definition.title}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {CATEGORY_LABELS[definition.category]}
              {definition.legal_reference && (() => {
                const url = buildLegalUrl(definition.legal_reference);
                return url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="ml-1 text-brand-600 hover:underline"
                  >
                    · {definition.legal_reference}
                  </a>
                ) : (
                  <span className="ml-1 text-gray-400">· {definition.legal_reference}</span>
                );
              })()}
            </p>
          </div>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-gray-400 flex-shrink-0 text-xs hover:text-gray-600 mt-0.5"
          aria-label="Vis detaljer"
        >
          {expanded ? "▲" : "▼"}
        </button>
      </div>

      {expanded && (
        <p className="text-xs text-gray-600 mt-2 mb-3 pl-4 border-l-2 border-gray-200">
          {definition.description}
        </p>
      )}

      {/* Status buttons */}
      <div className="flex gap-2 mt-3">
        {(["ok", "deviation", "not_checked"] as CheckpointStatus[]).map((st) => (
          <button
            key={st}
            onClick={() => handleStatus(st)}
            disabled={isSaving}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition border-2 ${
              currentStatus === st
                ? st === "ok"
                  ? "border-green-500 bg-green-500 text-white"
                  : st === "deviation"
                  ? "border-red-500 bg-red-500 text-white"
                  : "border-gray-400 bg-gray-400 text-white"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            {st === "ok" ? "✅ OK" : st === "deviation" ? "⚠️ Avvik" : "— Ikke sjekket"}
          </button>
        ))}
      </div>

      {/* Ansvarlig (only shown when case contacts are available) */}
      {contacts.length > 0 && (
        <div className="mt-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">Ansvarlig</label>
          <select
            value={selectedContactRecno ?? ""}
            onChange={handleContactChange}
            disabled={isSaving}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 text-gray-700"
          >
            <option value="">— Ikke valgt</option>
            {contacts.map((c) => (
              <option key={c.recno} value={c.recno}>
                {c.name}
                {c.roleDescription ? ` (${c.roleDescription})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Comment */}
      {(expanded || currentStatus === "deviation" || (answer?.comment ?? "")) && (
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onBlur={handleCommentBlur}
          placeholder="Kommentar / avviksbeskrivelse…"
          rows={2}
          className="mt-3 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      )}
    </div>
  );
}
