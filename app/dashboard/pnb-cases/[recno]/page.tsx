"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n";
import type { PnbCaseItem } from "@/lib/sif/pnb-case-mapper";

const CASE_CACHE_TTL = 5 * 60 * 1000;

function loadCaseCache(recno: string): PnbCaseItem | null {
  try {
    const raw = sessionStorage.getItem(`pnb_case_${recno}_v1`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: PnbCaseItem; ts: number };
    return Date.now() - ts < CASE_CACHE_TTL ? data : null;
  } catch { return null; }
}

function saveCaseCache(recno: string, data: PnbCaseItem) {
  try { sessionStorage.setItem(`pnb_case_${recno}_v1`, JSON.stringify({ data, ts: Date.now() })); }
  catch { /* storage full or SSR */ }
}

export default function PnbCaseDetailPage() {
  const { recno } = useParams<{ recno: string }>();
  const { locale } = useLanguage();
  const dateLocale = locale === "en" ? "en-GB" : "nb-NO";

  const [caseData, setCaseData] = useState<PnbCaseItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cached = loadCaseCache(recno);
    if (cached) { setCaseData(cached); setLoading(false); return; }

    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setError("Ikke autentisert"); setLoading(false); return; }
      try {
        const res = await fetch(`/api/sif/pnb-case/${recno}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        if (json.ok) {
          setCaseData(json.case);
          saveCaseCache(recno, json.case);
        } else {
          setError(json.error ?? "Kunne ikke laste saken");
        }
      } catch {
        setError("Nettverksfeil");
      } finally {
        setLoading(false);
      }
    });
  }, [recno]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center text-gray-400 dark:text-slate-500">
        <p className="text-3xl mb-3 animate-pulse">⏳</p>
        <p>Henter sak fra PNB…</p>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <p className="text-3xl mb-3">⚠️</p>
        <p className="text-red-600 dark:text-red-400">{error ?? "Sak ikke funnet"}</p>
        <Link href="/dashboard" className="mt-4 inline-block text-brand-600 hover:underline text-sm">
          ← Tilbake til dashbordet
        </Link>
      </div>
    );
  }

  const c = caseData;
  const activeStages = c.stages.filter(
    (s) => s.stageStatus !== "Avsluttet" && s.stageStatus !== "Closed"
  );
  const closedStages = c.stages.filter(
    (s) => s.stageStatus === "Avsluttet" || s.stageStatus === "Closed"
  );

  function DeadlineBadge({ date }: { date: string }) {
    const daysLeft = Math.ceil(
      (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    const isOverdue = daysLeft < 0;
    const isUrgent = daysLeft >= 0 && daysLeft <= 7;
    return (
      <span
        className={`text-xs font-medium ${
          isOverdue
            ? "text-red-600 dark:text-red-400"
            : isUrgent
            ? "text-orange-600 dark:text-orange-400"
            : "text-gray-500 dark:text-slate-400"
        }`}
      >
        Frist: {new Date(date).toLocaleDateString(dateLocale)}
        {" "}({daysLeft < 0 ? `${Math.abs(daysLeft)} dager på overtid` : `${daysLeft} dager igjen`})
      </span>
    );
  }

  function MilestoneList({ milestones }: { milestones: PnbCaseItem["milestones"] }) {
    if (!milestones.length) return null;
    const sorted = [...milestones].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
    return (
      <div className="mt-2 space-y-1 pl-1">
        {sorted.map((m, i) => (
          <div key={i} className="flex items-baseline gap-2 text-xs">
            <span className="text-purple-400 dark:text-purple-500 text-[9px] shrink-0">◆</span>
            <span className="text-gray-700 dark:text-slate-300">{m.title ?? "Milepæl"}</span>
            {m.date && (
              <span className="text-gray-400 dark:text-slate-500 shrink-0">
                {new Date(m.date).toLocaleDateString(dateLocale)}
              </span>
            )}
            {m.status && (
              <span className="ml-auto text-gray-400 dark:text-slate-500 shrink-0">{m.status}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back */}
      <Link
        href="/dashboard?tab=pnb"
        className="inline-block text-sm text-brand-600 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300 mb-5"
      >
        ← Mine PNB-saker
      </Link>

      {/* Header card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-gray-400 dark:text-slate-500 mb-1">{c.caseTypeDescription ?? "Sak"}</p>
            <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 leading-snug">
              {c.caseNumber}
            </h1>
            <p className="text-base text-gray-700 dark:text-slate-300 mt-0.5">{c.title}</p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {c.status && (
              <span className="text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full px-3 py-1 font-medium">
                {c.status}
              </span>
            )}
            {c.url && (
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
              >
                Åpne i 360° ↗
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-400 dark:text-slate-500">
          {c.date && <span>Opprettet: {new Date(c.date).toLocaleDateString(dateLocale)}</span>}
          {c.lastChangedDate && (
            <span>Sist endret: {new Date(c.lastChangedDate).toLocaleDateString(dateLocale)}</span>
          )}
        </div>

        {/* Estates */}
        {c.estates.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {c.estates.map((e, i) => (
              <span
                key={i}
                className="text-xs text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 rounded-full px-3 py-1"
              >
                🏠 {e.address || e.estateNumber || "Eiendom"}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-5">
          <Link
            href={`/dashboard/inspections/new${c.caseNumber ? `?case=${encodeURIComponent(c.caseNumber)}${c.title ? `&title=${encodeURIComponent(c.title)}` : ""}` : ""}`}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
          >
            + Ny befaring
          </Link>
        </div>
      </div>

      {/* Contacts — grouped by name, roles joined on one line */}
      {c.contacts.length > 0 && (() => {
        type GroupedContact = { name: string; roles: string[]; email?: string };
        const grouped = new Map<string, GroupedContact>();
        for (const contact of c.contacts) {
          const role = contact.roleDescription ?? contact.role;
          const existing = grouped.get(contact.name);
          if (existing) {
            if (role && !existing.roles.includes(role)) existing.roles.push(role);
            if (contact.email && !existing.email) existing.email = contact.email;
          } else {
            grouped.set(contact.name, {
              name: contact.name,
              roles: role ? [role] : [],
              email: contact.email,
            });
          }
        }
        const rows = Array.from(grouped.values());
        return (
          <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 mb-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
              Kontakter ({rows.length})
            </h2>
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {rows.map((contact, i) => (
                <div key={i} className="py-2 flex items-baseline justify-between gap-4 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium text-gray-800 dark:text-slate-200">{contact.name}</span>
                    {contact.roles.length > 0 && (
                      <span className="ml-2 text-xs text-gray-400 dark:text-slate-500">
                        {contact.roles.join(" · ")}
                      </span>
                    )}
                  </div>
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-xs text-brand-600 dark:text-brand-400 hover:underline shrink-0"
                    >
                      {contact.email}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })()}

      {/* Active stages + milestones */}
      {activeStages.length > 0 && (
        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-4">
            Aktive behandlingstrinn
          </h2>
          <div className="space-y-4">
            {activeStages.map((s, i) => (
              <div key={i} className="border-l-2 border-brand-300 dark:border-brand-700 pl-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-slate-200">
                      {s.title ?? s.stageType ?? "Trinn"}
                    </p>
                    {s.stageStatus && (
                      <p className="text-xs text-gray-400 dark:text-slate-500">{s.stageStatus}</p>
                    )}
                  </div>
                  {s.deadlineDate && <DeadlineBadge date={s.deadlineDate} />}
                </div>
                <MilestoneList milestones={s.milestones} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Closed stages */}
      {closedStages.length > 0 && (
        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-slate-400 mb-3">
            Avsluttede behandlingstrinn ({closedStages.length})
          </h2>
          <div className="space-y-3">
            {closedStages.map((s, i) => (
              <div key={i} className="border-l-2 border-gray-200 dark:border-slate-600 pl-3">
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {s.title ?? s.stageType ?? "Trinn"}
                </p>
                <MilestoneList milestones={s.milestones} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
