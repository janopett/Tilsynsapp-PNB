"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { MEASURE_TYPES } from "@/data/seed/measure-types";
import StatusBadge from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/client";
import type { Inspection, ExternalParticipant } from "@/types";
import type { PnbCaseItem } from "@/app/api/sif/my-cases/route";

type InspectionListItem = Pick<
  Inspection,
  "id" | "property_address" | "case_number" | "case_title" | "status" | "inspection_date" | "measure_type_id" | "gnr" | "bnr" | "snr" | "fnr" | "estates" | "participants"
> & { external_participants?: ExternalParticipant[] };

type DashTab = "all" | "active" | "archived" | "completed" | "pnb";

interface DashboardClientProps {
  list: InspectionListItem[];
}

export default function DashboardClient({ list }: DashboardClientProps) {
  const [tab, setTab] = useState<DashTab>("active");
  const { t, locale } = useLanguage();

  // ── PNB cases state ─────────────────────────────────────────────────────────
  const [pnbCases, setPnbCases] = useState<PnbCaseItem[]>([]);
  const [pnbLoading, setPnbLoading] = useState(false);
  const [pnbError, setPnbError] = useState<string | null>(null);
  const [pnbFetched, setPnbFetched] = useState(false);

  useEffect(() => {
    if (tab !== "pnb" || pnbFetched) return;

    setPnbLoading(true);
    setPnbError(null);

    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        setPnbError(t.dashboard.pnbCases.error);
        setPnbLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/sif/my-cases", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        if (json.ok) {
          setPnbCases(json.cases);
          setPnbFetched(true);
        } else if (json.notConfigured) {
          setPnbError(t.dashboard.pnbCases.notConfigured);
        } else if (json.noName) {
          setPnbError(t.dashboard.pnbCases.noName);
        } else {
          setPnbError(json.error ?? t.dashboard.pnbCases.error);
        }
      } catch {
        setPnbError(t.dashboard.pnbCases.error);
      } finally {
        setPnbLoading(false);
      }
    });
  }, [tab, pnbFetched, t]);

  const counts = {
    all: list.length,
    active: list.filter((i) => i.status === "draft" || i.status === "in_progress").length,
    archived: list.filter((i) => i.status === "archived").length,
    completed: list.filter((i) => i.status === "completed").length,
    pnb: pnbFetched ? pnbCases.length : null,
  };

  const filtered =
    tab === "all"
      ? list
      : tab === "active"
      ? list.filter((i) => i.status === "draft" || i.status === "in_progress")
      : tab === "pnb"
      ? []
      : list.filter((i) => i.status === tab);

  const tabs: { key: DashTab; label: string }[] = [
    { key: "active", label: t.dashboard.tabs.active },
    { key: "archived", label: t.dashboard.tabs.archived },
    { key: "completed", label: t.dashboard.tabs.completed },
    { key: "all", label: t.dashboard.tabs.all },
    { key: "pnb", label: t.dashboard.tabs.pnb },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t.dashboard.title}</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">{t.dashboard.count(list.length)}</p>
        </div>
        <Link
          href="/dashboard/inspections/new"
          className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-3 rounded-xl text-base transition"
        >
          {t.dashboard.newInspection}
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 border-b border-gray-200 dark:border-slate-700 pb-1 flex-wrap">
        {tabs.map(({ key, label }) => {
          const count = counts[key];
          const isActive = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-sm font-medium transition border-b-2 -mb-[1px] ${
                isActive
                  ? "border-brand-600 text-brand-700 dark:text-brand-400 bg-white dark:bg-slate-900"
                  : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-600"
              }`}
            >
              {label}
              {count !== null && (
                <span
                  className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-xs font-semibold ${
                    isActive
                      ? "bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400"
                      : "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── PNB cases tab ──────────────────────────────────────────────────────── */}
      {tab === "pnb" ? (
        <PnbCasesView
          cases={pnbCases}
          loading={pnbLoading}
          error={pnbError}
          locale={locale}
          t={t.dashboard.pnbCases}
        />
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-slate-500">
          <p className="text-5xl mb-4">📋</p>
          <p className="text-lg font-medium">{t.dashboard.empty}</p>
          <p className="text-sm mt-1">{t.dashboard.emptyHint}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inspection) => {
            const mt = MEASURE_TYPES.find((m) => m.id === inspection.measure_type_id);
            const estates = (inspection.estates ?? []) as Array<{ recno?: number; address?: string }>;
            const participants = (inspection.participants ?? []) as Array<{ recno?: number; name: string; role?: string; roleDescription?: string }>;
            const extParticipants = (inspection.external_participants ?? []) as Array<{ id: string; name: string; role?: string; company?: string }>;

            const matrikkel = [inspection.gnr, inspection.bnr, inspection.snr, inspection.fnr]
              .filter(Boolean).join("/");
            const afterDot: string[] = [];
            if (matrikkel) afterDot.push(matrikkel);
            for (const e of estates) { if (e.address) afterDot.push(e.address); }
            if (!estates.length && inspection.property_address) afterDot.push(inspection.property_address);
            if (inspection.case_title) afterDot.push(inspection.case_title);

            const heading = inspection.case_number
              ? `${inspection.case_number}${afterDot.length ? ` · ${afterDot.join(" – ")}` : ""}`
              : inspection.property_address;

            return (
              <Link
                key={inspection.id}
                href={`/dashboard/inspections/${inspection.id}`}
                className="block bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 dark:text-slate-100 text-sm leading-snug">
                      {heading}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-slate-400 flex-wrap">
                      <span>{mt?.icon} {mt?.name ?? inspection.measure_type_id}</span>
                      <span className="text-gray-400 dark:text-slate-500">
                        · {new Date(inspection.inspection_date).toLocaleDateString(locale === "en" ? "en-GB" : "nb-NO")}
                      </span>
                    </div>
                    {participants.length > 0 && (
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                        {participants.map((p, i) => (
                          <span key={p.recno ?? i} className="text-xs text-gray-500 dark:text-slate-400">
                            {p.name}
                            {(p.roleDescription ?? p.role) && (
                              <span className="text-gray-400 dark:text-slate-500"> · {p.roleDescription ?? p.role}</span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                    {extParticipants.length > 0 && (
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                        {extParticipants.map((ep) => (
                          <span key={ep.id} className="text-xs text-amber-700 dark:text-amber-400">
                            {ep.name}
                            {ep.role && <span className="text-amber-400 dark:text-amber-500"> · {ep.role}</span>}
                          </span>
                        ))}
                      </div>
                    )}
                    {estates.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {estates.map((e, i) => (
                          <span key={e.recno ?? i} className="text-xs text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 rounded-full px-2 py-0.5">
                            🏠 {e.address ?? `Eiendom ${e.recno}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <StatusBadge status={inspection.status} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── PNB Cases View ─────────────────────────────────────────────────────────────

const CONTACTS_PREVIEW = 4;

interface PnbCasesViewProps {
  cases: PnbCaseItem[];
  loading: boolean;
  error: string | null;
  locale: string;
  t: {
    loading: string;
    error: string;
    empty: string;
    openIn360: string;
    newBefaring: string;
    responsible: string;
    lastChanged: string;
    deadline: string;
    daysLeft: (n: number) => string;
  };
}

function PnbCasesView({ cases, loading, error, locale, t }: PnbCasesViewProps) {
  const dateLocale = locale === "en" ? "en-GB" : "nb-NO";
  const [expandedContacts, setExpandedContacts] = useState<Set<number>>(new Set());

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-400 dark:text-slate-500">
        <p className="text-4xl mb-4 animate-spin inline-block">⏳</p>
        <p className="text-base font-medium mt-2">{t.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-gray-400 dark:text-slate-500">
        <p className="text-4xl mb-4">⚠️</p>
        <p className="text-base font-medium text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400 dark:text-slate-500">
        <p className="text-5xl mb-4">🗂️</p>
        <p className="text-lg font-medium">{t.empty}</p>
      </div>
    );
  }

  function toggleContacts(recno: number) {
    setExpandedContacts((prev) => {
      const next = new Set(prev);
      next.has(recno) ? next.delete(recno) : next.add(recno);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {cases.map((c) => {
        const activeStages = c.stages.filter((s) => s.stageStatus !== "Avsluttet" && s.stageStatus !== "Closed");
        const nearestDeadline = activeStages
          .filter((s) => s.deadlineDate)
          .sort((a, b) => a.deadlineDate!.localeCompare(b.deadlineDate!))
          .at(0);
        const isContactsExpanded = expandedContacts.has(c.recno);
        const visibleContacts = isContactsExpanded ? c.contacts : c.contacts.slice(0, CONTACTS_PREVIEW);
        const hiddenCount = c.contacts.length - CONTACTS_PREVIEW;

        return (
          <div
            key={c.recno}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                {/* Header */}
                <p className="font-semibold text-gray-900 dark:text-slate-100 text-sm leading-snug">
                  {c.caseNumber} · {c.title}
                </p>

                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-slate-400 flex-wrap">
                  {c.caseTypeDescription && <span>{c.caseTypeDescription}</span>}
                  {c.status && (
                    <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full px-2 py-0.5">
                      {c.status}
                    </span>
                  )}
                  {c.lastChangedDate && (
                    <span className="text-gray-400 dark:text-slate-500">
                      {t.lastChanged}: {new Date(c.lastChangedDate).toLocaleDateString(dateLocale)}
                    </span>
                  )}
                </div>

                {/* Estates */}
                {c.estates.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {c.estates.map((e, i) => (
                      <span
                        key={i}
                        className="text-xs text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 rounded-full px-2 py-0.5"
                      >
                        🏠 {e.address || e.estateNumber || "Eiendom"}
                      </span>
                    ))}
                  </div>
                )}

                {/* Contacts — collapsible */}
                {c.contacts.length > 0 && (
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                      {visibleContacts.map((contact, i) => (
                        <span key={i} className="text-xs text-gray-500 dark:text-slate-400">
                          {contact.name}
                          {(contact.roleDescription ?? contact.role) && (
                            <span className="text-gray-400 dark:text-slate-500">
                              {" "}· {contact.roleDescription ?? contact.role}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                    {hiddenCount > 0 && (
                      <button
                        onClick={() => toggleContacts(c.recno)}
                        className="mt-0.5 text-xs text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        {isContactsExpanded ? "▲ Skjul" : `▼ +${hiddenCount} flere kontakter`}
                      </button>
                    )}
                  </div>
                )}

                {/* Stages with their milestones grouped */}
                {activeStages.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {activeStages.map((s, i) => {
                      const sorted = [...s.milestones].sort((a, b) =>
                        (a.date ?? "").localeCompare(b.date ?? "")
                      );
                      return (
                        <div key={i}>
                          {/* Stage pill */}
                          <span className="inline-flex items-center text-xs bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-full px-2 py-0.5 border border-gray-200 dark:border-slate-600">
                            {s.title ?? s.stageType ?? "Trinn"}
                            {s.stageStatus && (
                              <span className="text-gray-400 dark:text-slate-500"> · {s.stageStatus}</span>
                            )}
                          </span>
                          {/* Milestones for this stage */}
                          {sorted.length > 0 && (
                            <div className="ml-3 mt-1 flex flex-wrap gap-1.5">
                              {sorted.map((m, j) => (
                                <span
                                  key={j}
                                  className="inline-flex items-center gap-1 text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full px-2 py-0.5 border border-purple-100 dark:border-purple-800"
                                >
                                  <span className="text-[9px]">◆</span>
                                  {m.title ?? "Milepæl"}
                                  {m.date && (
                                    <span className="opacity-60">
                                      · {new Date(m.date).toLocaleDateString(dateLocale)}
                                    </span>
                                  )}
                                  {m.status && (
                                    <span className="opacity-60">· {m.status}</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {/* Case-level milestones (not tied to a specific stage) */}
                    {c.milestones.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {[...c.milestones]
                          .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
                          .map((m, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full px-2 py-0.5 border border-purple-100 dark:border-purple-800"
                            >
                              <span className="text-[9px]">◆</span>
                              {m.title ?? "Milepæl"}
                              {m.date && (
                                <span className="opacity-60">
                                  · {new Date(m.date).toLocaleDateString(dateLocale)}
                                </span>
                              )}
                              {m.status && (
                                <span className="opacity-60">· {m.status}</span>
                              )}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Nearest deadline */}
                {nearestDeadline?.deadlineDate && (
                  <div className="mt-2 text-xs">
                    {(() => {
                      const daysLeft = Math.ceil(
                        (new Date(nearestDeadline.deadlineDate).getTime() - Date.now()) /
                          (1000 * 60 * 60 * 24)
                      );
                      const isOverdue = daysLeft < 0;
                      const isUrgent = daysLeft >= 0 && daysLeft <= 7;
                      return (
                        <span
                          className={
                            isOverdue
                              ? "text-red-600 dark:text-red-400 font-semibold"
                              : isUrgent
                              ? "text-orange-600 dark:text-orange-400 font-medium"
                              : "text-gray-500 dark:text-slate-400"
                          }
                        >
                          {t.deadline}: {new Date(nearestDeadline.deadlineDate).toLocaleDateString(dateLocale)}
                          {" "}({t.daysLeft(daysLeft)})
                        </span>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 items-end shrink-0">
                <Link
                  href={`/dashboard/inspections/new${c.caseNumber ? `?case=${encodeURIComponent(c.caseNumber)}` : ""}`}
                  className="text-xs bg-brand-600 hover:bg-brand-700 text-white font-medium px-3 py-1.5 rounded-lg transition whitespace-nowrap"
                >
                  + {t.newBefaring}
                </Link>
                {c.url && (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-600 dark:text-brand-400 hover:underline whitespace-nowrap"
                  >
                    {t.openIn360} ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
