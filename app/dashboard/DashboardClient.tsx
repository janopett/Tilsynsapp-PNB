"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import StatusBadge from "@/components/ui/StatusBadge";
import { MEASURE_TYPES } from "@/data/seed/measure-types";
import { useLanguage } from "@/lib/i18n";
import { isPnbCacheDirty, PNB_CACHE_FALLBACK_TTL } from "@/lib/pnb-cache";
import type { PnbCaseItem } from "@/lib/sif/pnb-case-mapper";
import { createClient } from "@/lib/supabase/client";
import type { ExternalParticipant, Inspection } from "@/types";

// ── PNB cases localStorage cache ─────────────────────────────────────────────
// Invalidated immediately when the app writes (markPnbCacheDirty in ArchivePanel).
// 30-min fallback TTL covers external changes made directly in 360°.
const PNB_CACHE_KEY = "pnb_cases_v2";

function loadPnbCache(): PnbCaseItem[] | null {
  try {
    const raw = localStorage.getItem(PNB_CACHE_KEY);
    if (!raw) return null;
    const { cases, ts } = JSON.parse(raw) as { cases: PnbCaseItem[]; ts: number };
    if (Date.now() - ts > PNB_CACHE_FALLBACK_TTL) return null;
    if (isPnbCacheDirty(ts)) return null;
    return cases;
  } catch {
    return null;
  }
}

function savePnbCache(cases: PnbCaseItem[]) {
  try {
    localStorage.setItem(PNB_CACHE_KEY, JSON.stringify({ cases, ts: Date.now() }));
  } catch {
    /* storage full or SSR */
  }
}

type InspectionListItem = Pick<
  Inspection,
  | "id"
  | "property_address"
  | "case_number"
  | "case_title"
  | "status"
  | "inspection_date"
  | "measure_type_id"
  | "gnr"
  | "bnr"
  | "snr"
  | "fnr"
  | "estates"
  | "participants"
> & { external_participants?: ExternalParticipant[] };

type DashTab = "all" | "active" | "archived" | "completed" | "pnb";

interface DashboardClientProps {
  list: InspectionListItem[];
}

export default function DashboardClient({ list }: DashboardClientProps) {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<DashTab>((searchParams.get("tab") as DashTab) ?? "active");
  const { t, locale } = useLanguage();

  // ── PNB cases state ─────────────────────────────────────────────────────────
  const [pnbCases, setPnbCases] = useState<PnbCaseItem[]>([]);
  const [pnbLoading, setPnbLoading] = useState(false);
  const [pnbError, setPnbError] = useState<string | null>(null);
  const [pnbFetched, setPnbFetched] = useState(false);
  const pnbFetchInProgress = useRef(false);

  const doFetchPnb = useCallback(
    async (silent: boolean) => {
      if (pnbFetchInProgress.current) return;
      pnbFetchInProgress.current = true;
      if (!silent) {
        setPnbLoading(true);
        setPnbError(null);
      }

      const supabase = createClient();
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          if (!silent) {
            setPnbError(t.dashboard.pnbCases.error);
            setPnbLoading(false);
          }
          return;
        }
        const res = await fetch("/api/sif/my-cases", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        if (json.ok) {
          setPnbCases(json.cases);
          savePnbCache(json.cases);
          setPnbFetched(true);
        } else if (!silent) {
          if (json.notConfigured) setPnbError(t.dashboard.pnbCases.notConfigured);
          else if (json.noName) setPnbError(t.dashboard.pnbCases.noName);
          else setPnbError(json.error ?? t.dashboard.pnbCases.error);
        }
      } catch {
        if (!silent) setPnbError(t.dashboard.pnbCases.error);
      } finally {
        if (!silent) setPnbLoading(false);
        pnbFetchInProgress.current = false;
      }
    },
    [t]
  );

  // On mount: hydrate from cache, or fetch immediately if cache is stale/empty
  useEffect(() => {
    if (pnbFetched) return;
    const cached = loadPnbCache();
    if (cached) {
      setPnbCases(cached);
      setPnbFetched(true);
    } else {
      doFetchPnb(false);
    }
  }, [doFetchPnb, pnbFetched]);

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
    { key: "pnb", label: t.dashboard.tabs.pnb },
    { key: "active", label: t.dashboard.tabs.active },
    { key: "archived", label: t.dashboard.tabs.archived },
    { key: "completed", label: t.dashboard.tabs.completed },
    { key: "all", label: t.dashboard.tabs.all },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {t.dashboard.title}
          </h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
            {t.dashboard.count(list.length)}
          </p>
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
        <PnbCasesView cases={pnbCases} loading={pnbLoading} error={pnbError} />
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
            const estates = (inspection.estates ?? []) as Array<{
              recno?: number;
              address?: string;
            }>;
            const participants = (inspection.participants ?? []) as Array<{
              recno?: number;
              name: string;
              role?: string;
              roleDescription?: string;
            }>;
            const extParticipants = (inspection.external_participants ?? []) as Array<{
              id: string;
              name: string;
              role?: string;
              company?: string;
            }>;

            const matrikkel = [inspection.gnr, inspection.bnr, inspection.snr, inspection.fnr]
              .filter(Boolean)
              .join("/");
            const afterDot: string[] = [];
            if (matrikkel) afterDot.push(matrikkel);
            for (const e of estates) {
              if (e.address) afterDot.push(e.address);
            }
            if (!estates.length && inspection.property_address)
              afterDot.push(inspection.property_address);
            if (inspection.case_title) afterDot.push(inspection.case_title);

            const heading = inspection.case_number
              ? `${inspection.case_number}${afterDot.length ? ` · ${afterDot.join(" – ")}` : ""}`
              : inspection.property_address;

            return (
              <Link
                key={inspection.id}
                href={`/dashboard/inspections/${inspection.id}`}
                className="block bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 dark:text-slate-100 text-sm leading-snug">
                      {heading}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-slate-400 flex-wrap">
                      <span>
                        {mt?.icon} {mt?.name ?? inspection.measure_type_id}
                      </span>
                      <span className="text-gray-400 dark:text-slate-500">
                        ·{" "}
                        {new Date(inspection.inspection_date).toLocaleDateString(
                          locale === "en" ? "en-GB" : "nb-NO"
                        )}
                      </span>
                    </div>
                    {participants.length > 0 && (
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                        {participants.map((p, i) => (
                          <span
                            key={p.recno ?? i}
                            className="text-xs text-gray-500 dark:text-slate-400"
                          >
                            {p.name}
                            {(p.roleDescription ?? p.role) && (
                              <span className="text-gray-400 dark:text-slate-500">
                                {" "}
                                · {p.roleDescription ?? p.role}
                              </span>
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
                            {ep.role && (
                              <span className="text-amber-400 dark:text-amber-500">
                                {" "}
                                · {ep.role}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                    {estates.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {estates.map((e, i) => (
                          <span
                            key={e.recno ?? i}
                            className="text-xs text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 rounded-full px-2 py-0.5"
                          >
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

interface PnbCasesViewProps {
  cases: PnbCaseItem[];
  loading: boolean;
  error: string | null;
}

function PnbCasesView({ cases, loading, error }: PnbCasesViewProps) {
  const { t, locale } = useLanguage();
  const tp = t.dashboard.pnbCases;
  const dateLocale = locale === "en" ? "en-GB" : "nb-NO";
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-400 dark:text-slate-500">
        <p className="text-4xl mb-4 animate-spin inline-block">⏳</p>
        <p className="text-base font-medium mt-2">{tp.loading}</p>
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
        <p className="text-lg font-medium">{tp.empty}</p>
      </div>
    );
  }

  // Build unique status list, preserving order of first appearance
  const statusOrder: string[] = [];
  for (const c of cases) {
    if (c.status && !statusOrder.includes(c.status)) statusOrder.push(c.status);
  }
  const filtered = statusFilter ? cases.filter((c) => c.status === statusFilter) : cases;

  return (
    <div>
      {/* Status sub-tabs */}
      {statusOrder.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setStatusFilter(null)}
            className={`text-xs px-3 py-1 rounded-full border transition font-medium ${
              statusFilter === null
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:border-brand-400"
            }`}
          >
            {tp.all} ({cases.length})
          </button>
          {statusOrder.map((s) => {
            const count = cases.filter((c) => c.status === s).length;
            const isActive = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-xs px-3 py-1 rounded-full border transition font-medium ${
                  isActive
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:border-brand-400"
                }`}
              >
                {s} ({count})
              </button>
            );
          })}
        </div>
      )}
      <div className="space-y-3">
        {filtered.map((c) => {
          const activeStages = c.stages.filter(
            (s) => s.stageStatus !== "Avsluttet" && s.stageStatus !== "Closed"
          );

          // Collect all candidate dates across all stages (active or not), case milestones, and
          // progress plan phases — so cases where the deadline lives outside the active stage are covered.
          const candidateDates = [
            ...c.stages.flatMap((s) => [s.deadlineDate, ...s.milestones.map((m) => m.date)]),
            ...c.milestones.map((m) => m.date),
            ...c.progressPlanDates,
          ].filter((d): d is string => !!d);
          const nearestDateStr = candidateDates.sort().at(0);

          return (
            <div
              key={c.recno}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-4"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  {/* Header */}
                  <Link
                    href={`/dashboard/pnb-cases/${c.recno}`}
                    className="font-semibold text-gray-900 dark:text-slate-100 text-sm leading-snug hover:text-brand-700 dark:hover:text-brand-300 hover:underline"
                  >
                    {c.caseNumber} · {c.title}
                  </Link>

                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-slate-400 flex-wrap">
                    {c.caseTypeDescription && <span>{c.caseTypeDescription}</span>}
                    {c.status && (
                      <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full px-2 py-0.5">
                        {c.status}
                      </span>
                    )}
                    {c.lastChangedDate && (
                      <span className="text-gray-400 dark:text-slate-500">
                        {tp.lastChanged}:{" "}
                        {new Date(c.lastChangedDate).toLocaleDateString(dateLocale)}
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
                          🏠 {e.address || e.estateNumber}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Stage + contact summary */}
                  {(activeStages.length > 0 || c.contacts.length > 0) && (
                    <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">
                      {activeStages.length > 0 && tp.activeStages(activeStages.length)}
                      {activeStages.length > 0 && c.contacts.length > 0 && " · "}
                      {c.contacts.length > 0 && tp.contacts(c.contacts.length)}
                    </p>
                  )}

                  {/* Nearest deadline (stage deadline, milestone, or case milestone) */}
                  {nearestDateStr && (
                    <div className="mt-1.5 text-xs">
                      {(() => {
                        const daysLeft = Math.ceil(
                          (new Date(nearestDateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
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
                            {tp.deadline}: {new Date(nearestDateStr).toLocaleDateString(dateLocale)}{" "}
                            ({tp.daysLeft(daysLeft)})
                          </span>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 items-end shrink-0">
                  <Link
                    href={`/dashboard/pnb-cases/${c.recno}`}
                    className="text-xs bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-medium px-3 py-1.5 rounded-lg transition whitespace-nowrap"
                  >
                    {tp.openCase}
                  </Link>
                  <Link
                    href={`/dashboard/inspections/new${c.caseNumber ? `?case=${encodeURIComponent(c.caseNumber)}${c.title ? `&title=${encodeURIComponent(c.title)}` : ""}` : ""}`}
                    className="text-xs bg-brand-600 hover:bg-brand-700 text-white font-medium px-3 py-1.5 rounded-lg transition whitespace-nowrap"
                  >
                    + {tp.newBefaring}
                  </Link>
                  {c.url && (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-600 dark:text-brand-400 hover:underline whitespace-nowrap"
                    >
                      {tp.openIn360} ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
