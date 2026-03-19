"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
type InspectionListItem = Pick<
  import("@/types").Inspection,
  "id" | "property_address" | "case_number" | "case_title" | "status" | "inspection_date" | "measure_type_id"
>;
import { MEASURE_TYPES } from "@/data/seed/measure-types";
import StatusBadge from "@/components/ui/StatusBadge";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const [list, setList] = useState<InspectionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, locale } = useLanguage();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data } = await supabase
        .from("inspections")
        .select("id, property_address, case_number, case_title, status, inspection_date, measure_type_id")
        .order("created_at", { ascending: false })
        .limit(50);

      setList(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-gray-400">{t.dashboard.loading}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
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

      {list.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">📋</p>
          <p className="text-lg font-medium">{t.dashboard.empty}</p>
          <p className="text-sm mt-1">{t.dashboard.emptyHint}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((inspection) => {
            const mt = MEASURE_TYPES.find((m) => m.id === inspection.measure_type_id);
            return (
              <Link
                key={inspection.id}
                href={`/dashboard/inspections/${inspection.id}`}
                className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {inspection.property_address}
                    </p>
                    {inspection.case_title && (
                      <p className="text-sm text-gray-500 truncate mt-0.5">
                        {inspection.case_title}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 flex-wrap">
                      <span>{mt?.icon} {mt?.name ?? inspection.measure_type_id}</span>
                      {inspection.case_number && (
                        <span className="text-gray-400">· {t.dashboard.case} {inspection.case_number}</span>
                      )}
                      <span className="text-gray-400">
                        · {new Date(inspection.inspection_date).toLocaleDateString(locale === "en" ? "en-GB" : "nb-NO")}
                      </span>
                    </div>
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
