"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
type InspectionListItem = Pick<
  import("@/types").Inspection,
  "id" | "property_address" | "case_number" | "case_title" | "status" | "inspection_date" | "measure_type_id" | "gnr" | "bnr" | "snr" | "fnr" | "estates" | "participants"
> & { external_participants?: import("@/types").ExternalParticipant[] };
import { MEASURE_TYPES } from "@/data/seed/measure-types";
import StatusBadge from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/client";

type DashTab = "all" | "active" | "archived" | "completed";

export default function DashboardPage() {
  const [list, setList] = useState<InspectionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DashTab>("active");
  const { t, locale } = useLanguage();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data, error } = await supabase
        .from("inspections")
        .select("id, property_address, case_number, case_title, status, inspection_date, measure_type_id, gnr, bnr, snr, fnr, estates, participants")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) console.error("[dashboard] load error:", error.message);
      setList(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-gray-400">{t.dashboard.loading}</div>;
  }

  const counts = {
    all: list.length,
    active: list.filter((i) => i.status === "draft" || i.status === "in_progress").length,
    archived: list.filter((i) => i.status === "archived").length,
    completed: list.filter((i) => i.status === "completed").length,
  };

  const filtered = tab === "all"
    ? list
    : tab === "active"
    ? list.filter((i) => i.status === "draft" || i.status === "in_progress")
    : list.filter((i) => i.status === tab);

  const tabs: { key: DashTab; label: string }[] = [
    { key: "active", label: t.dashboard.tabs.active },
    { key: "archived", label: t.dashboard.tabs.archived },
    { key: "completed", label: t.dashboard.tabs.completed },
    { key: "all", label: t.dashboard.tabs.all },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.dashboard.title}</h1>
          <p className="text-gray-500 text-sm mt-1">{t.dashboard.count(list.length)}</p>
        </div>
        <Link
          href="/dashboard/inspections/new"
          className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-3 rounded-xl text-base transition"
        >
          {t.dashboard.newInspection}
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 border-b border-gray-200 pb-1">
        {tabs.map(({ key, label }) => {
          const count = counts[key];
          const isActive = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-sm font-medium transition border-b-2 -mb-[1px] ${
                isActive
                  ? "border-brand-600 text-brand-700 bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {label}
              <span
                className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full px-1.5 text-xs font-semibold ${
                  isActive
                    ? "bg-brand-100 text-brand-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
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

            // Build heading: case_number · matrikkel – addresses – case_title
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
                className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm leading-snug">
                      {heading}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap">
                      <span>{mt?.icon} {mt?.name ?? inspection.measure_type_id}</span>
                      <span className="text-gray-400">
                        · {new Date(inspection.inspection_date).toLocaleDateString(locale === "en" ? "en-GB" : "nb-NO")}
                      </span>
                    </div>
                    {participants.length > 0 && (
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                        {participants.map((p, i) => (
                          <span key={p.recno ?? i} className="text-xs text-gray-500">
                            {p.name}
                            {(p.roleDescription ?? p.role) && (
                              <span className="text-gray-400"> · {p.roleDescription ?? p.role}</span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                    {extParticipants.length > 0 && (
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                        {extParticipants.map((ep) => (
                          <span key={ep.id} className="text-xs text-amber-700">
                            {ep.name}
                            {ep.role && <span className="text-amber-400"> · {ep.role}</span>}
                          </span>
                        ))}
                      </div>
                    )}
                    {estates.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {estates.map((e, i) => (
                          <span key={e.recno ?? i} className="text-xs text-brand-700 bg-brand-50 rounded-full px-2 py-0.5">
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
