import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Inspection } from "@/types";
import { MEASURE_TYPES } from "@/data/seed/measure-types";
import StatusBadge from "@/components/ui/StatusBadge";

export default async function DashboardPage() {
  const supabase = createClient();

  const { data: inspections, error } = await supabase
    .from("inspections")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error loading inspections", error);
  }

  const list: Inspection[] = inspections ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mine tilsyn</h1>
          <p className="text-gray-500 text-sm mt-1">
            {list.length} tilsyn registrert
          </p>
        </div>
        <Link
          href="/dashboard/inspections/new"
          className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-3 rounded-xl text-base transition"
        >
          + Nytt tilsyn
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">📋</p>
          <p className="text-lg font-medium">Ingen tilsyn registrert ennå</p>
          <p className="text-sm mt-1">Klikk «Nytt tilsyn» for å komme i gang.</p>
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
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 flex-wrap">
                      <span>{mt?.icon} {mt?.name ?? inspection.measure_type_id}</span>
                      {inspection.case_number && (
                        <span className="text-gray-400">· Sak {inspection.case_number}</span>
                      )}
                      <span className="text-gray-400">
                        · {new Date(inspection.inspection_date).toLocaleDateString("nb-NO")}
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
