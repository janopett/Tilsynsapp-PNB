"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type {
  InspectionWithAnswers,
  CheckpointWithAnswer,
  CheckpointStatus,
  CheckpointCategory,
} from "@/types";
import {
  filterCheckpoints,
  mergeCheckpointsWithAnswers,
  groupByCategory,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  calculateSummary,
} from "@/lib/checklist/filter-engine";
import CheckpointItem from "@/components/checklist/CheckpointItem";
import ArchivePanel from "@/components/archive/ArchivePanel";
import StatusBadge from "@/components/ui/StatusBadge";

type Tab = "checklist" | "summary" | "archive";

export default function InspectionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [inspection, setInspection] = useState<InspectionWithAnswers | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("checklist");
  const [activeCategory, setActiveCategory] = useState<CheckpointCategory | "all">("all");

  const fetchInspection = useCallback(async () => {
    const res = await fetch(`/api/inspections/${id}`);
    if (!res.ok) { router.push("/dashboard"); return; }
    const data = await res.json();
    setInspection(data);
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    fetchInspection();
  }, [fetchInspection]);

  async function updateAnswer(
    checkpointId: string,
    status: CheckpointStatus,
    comment: string
  ) {
    if (!inspection) return;
    setSavingId(checkpointId);

    await fetch(`/api/inspections/${id}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkpoint_definition_id: checkpointId, status, comment }),
    });

    // Optimistic update
    setInspection((prev) => {
      if (!prev) return prev;
      const existing = prev.answers.findIndex(
        (a) => a.checkpoint_definition_id === checkpointId
      );
      const newAnswer = {
        id: existing >= 0 ? prev.answers[existing].id : checkpointId,
        inspection_id: id,
        checkpoint_definition_id: checkpointId,
        status,
        comment,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const newAnswers =
        existing >= 0
          ? prev.answers.map((a, i) => (i === existing ? newAnswer : a))
          : [...prev.answers, newAnswer];
      return { ...prev, answers: newAnswers };
    });

    setSavingId(null);
  }

  if (loading || !inspection) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-400">
        Laster tilsyn…
      </div>
    );
  }

  const relevantCheckpoints = filterCheckpoints(
    inspection.measure_type_id,
    inspection.selected_tags
  );
  const merged = mergeCheckpointsWithAnswers(relevantCheckpoints, inspection.answers);
  const summary = calculateSummary(merged);
  const grouped = groupByCategory(merged);
  const usedCategories = CATEGORY_ORDER.filter((c) => grouped.has(c));

  const displayItems: CheckpointWithAnswer[] =
    activeCategory === "all"
      ? merged
      : grouped.get(activeCategory) ?? [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-brand-600 hover:text-brand-800 mb-1 inline-block"
          >
            ← Tilbake
          </Link>
          <h1 className="text-xl font-bold text-gray-900">
            {inspection.property_address}
          </h1>
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1 flex-wrap">
            {inspection.case_number && <span>Sak: {inspection.case_number}</span>}
            <span>
              {new Date(inspection.inspection_date).toLocaleDateString("nb-NO")}
            </span>
            <StatusBadge status={inspection.status} />
          </div>
        </div>
        <Link
          href={`/dashboard/inspections/${id}/report`}
          className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-xl transition flex-shrink-0"
        >
          Rapport
        </Link>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: "Totalt", value: summary.total, color: "bg-gray-100 text-gray-700" },
          { label: "OK", value: summary.ok, color: "bg-green-50 text-green-700" },
          { label: "Avvik", value: summary.deviations, color: "bg-red-50 text-red-700" },
          { label: "Ikke sjekket", value: summary.not_checked, color: "bg-yellow-50 text-yellow-700" },
        ].map((s) => (
          <div key={s.label} className={`${s.color} rounded-xl p-3 text-center`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
        {(["checklist", "summary", "archive"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab
                ? "bg-white shadow text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "checklist" && "Sjekkliste"}
            {tab === "summary" && `Avvik (${summary.deviations})`}
            {tab === "archive" && "Arkiver"}
          </button>
        ))}
      </div>

      {/* Checklist tab */}
      {activeTab === "checklist" && (
        <div>
          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            <button
              onClick={() => setActiveCategory("all")}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                activeCategory === "all"
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Alle ({merged.length})
            </button>
            {usedCategories.map((cat) => {
              const items = grouped.get(cat)!;
              const devs = items.filter((i) => i.answer?.status === "deviation").length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    activeCategory === cat
                      ? "bg-brand-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {CATEGORY_LABELS[cat]} ({items.length}
                  {devs > 0 ? ` · ${devs} avvik` : ""})
                </button>
              );
            })}
          </div>

          {/* Checkpoint list */}
          <div className="space-y-3">
            {displayItems.map((item) => (
              <CheckpointItem
                key={item.definition.id}
                item={item}
                isSaving={savingId === item.definition.id}
                onUpdate={updateAnswer}
              />
            ))}
          </div>
        </div>
      )}

      {/* Summary tab */}
      {activeTab === "summary" && (
        <div>
          {summary.deviations === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-5xl mb-3">✅</p>
              <p className="text-lg font-medium text-gray-600">Ingen avvik registrert</p>
            </div>
          ) : (
            <div className="space-y-3">
              {summary.deviation_items.map((item) => (
                <div
                  key={item.definition.id}
                  className="bg-red-50 border border-red-200 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-red-800 text-sm">
                        {item.definition.title}
                      </p>
                      <p className="text-xs text-red-600 mt-0.5">
                        {CATEGORY_LABELS[item.definition.category]}
                      </p>
                    </div>
                    <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full flex-shrink-0">
                      Avvik
                    </span>
                  </div>
                  {item.answer?.comment && (
                    <p className="text-sm text-red-700 mt-2 border-t border-red-200 pt-2">
                      {item.answer.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Archive tab */}
      {activeTab === "archive" && (
        <ArchivePanel inspection={inspection} onArchived={fetchInspection} />
      )}
    </div>
  );
}
