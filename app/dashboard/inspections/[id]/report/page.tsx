import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { InspectionWithAnswers } from "@/types";
import {
  filterCheckpoints,
  mergeCheckpointsWithAnswers,
  groupByCategory,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  calculateSummary,
} from "@/lib/checklist/filter-engine";
import { MEASURE_TYPES } from "@/data/seed/measure-types";

interface Props {
  params: { id: string };
}

export default async function ReportPage({ params }: Props) {
  const supabase = createClient();

  const [inspectionRes, answersRes] = await Promise.all([
    supabase.from("inspections").select("*").eq("id", params.id).single(),
    supabase.from("inspection_answers").select("*").eq("inspection_id", params.id),
  ]);

  if (inspectionRes.error || !inspectionRes.data) notFound();

  const inspection: InspectionWithAnswers = {
    ...inspectionRes.data,
    answers: answersRes.data ?? [],
    attachments: [],
  };

  const measureType = MEASURE_TYPES.find((m) => m.id === inspection.measure_type_id);
  const relevantCheckpoints = filterCheckpoints(inspection.measure_type_id, inspection.selected_tags);
  const merged = mergeCheckpointsWithAnswers(relevantCheckpoints, inspection.answers);
  const summary = calculateSummary(merged);
  const grouped = groupByCategory(merged);

  const statusLabel: Record<string, string> = {
    ok: "OK",
    deviation: "Avvik",
    not_checked: "Ikke kontrollert",
  };
  const statusClass: Record<string, string> = {
    ok: "text-green-700 bg-green-50",
    deviation: "text-red-700 bg-red-50 font-bold",
    not_checked: "text-yellow-700 bg-yellow-50",
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link
          href={`/dashboard/inspections/${params.id}`}
          className="text-brand-600 hover:text-brand-800 text-sm"
        >
          ← Tilbake til tilsyn
        </Link>
        <button
          onClick={() => window.print()}
          className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition"
        >
          Skriv ut / PDF
        </button>
      </div>

      {/* Report */}
      <div className="bg-white rounded-2xl shadow border border-gray-100 p-8 print:shadow-none print:border-none">
        {/* Header */}
        <div className="border-b-2 border-brand-900 pb-4 mb-6">
          <h1 className="text-2xl font-bold text-brand-900">TILSYNSRAPPORT</h1>
          <p className="text-gray-500 text-sm">Byggesaksbehandling – Plan & Bygg</p>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
          {[
            ["Eiendom", inspection.property_address],
            ["Saksnummer", inspection.case_number ?? "-"],
            ["Gnr/Bnr", [inspection.gnr, inspection.bnr].filter(Boolean).join("/") || "-"],
            ["Søker", inspection.applicant_name ?? "-"],
            ["Tilsynsmann", inspection.inspector_name ?? "-"],
            ["Dato", new Date(inspection.inspection_date).toLocaleDateString("nb-NO")],
            ["Tiltakstype", measureType?.name ?? inspection.measure_type_id],
          ].map(([label, value]) => (
            <div key={label}>
              <span className="font-semibold text-gray-600">{label}: </span>
              <span>{value}</span>
            </div>
          ))}
        </div>

        {inspection.notes && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-6 text-sm text-blue-800">
            <strong>Merknader:</strong> {inspection.notes}
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: "Totalt", value: summary.total, cls: "bg-gray-50" },
            { label: "OK", value: summary.ok, cls: "bg-green-50 text-green-800" },
            { label: "Avvik", value: summary.deviations, cls: "bg-red-50 text-red-800" },
            { label: "Ikke sjekket", value: summary.not_checked, cls: "bg-yellow-50 text-yellow-800" },
          ].map((s) => (
            <div key={s.label} className={`${s.cls} rounded-xl p-3 text-center`}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Checklist by category */}
        {CATEGORY_ORDER.filter((c) => grouped.has(c)).map((category) => {
          const items = grouped.get(category)!;
          return (
            <div key={category} className="mb-6">
              <h2 className="text-sm font-bold text-brand-900 uppercase tracking-wide mb-2 border-b border-gray-200 pb-1">
                {CATEGORY_LABELS[category]}
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="pb-1 font-medium w-2/3">Sjekkpunkt</th>
                    <th className="pb-1 font-medium w-1/6">Status</th>
                    <th className="pb-1 font-medium w-1/6">Kommentar</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const st = item.answer?.status ?? "not_checked";
                    return (
                      <tr key={item.definition.id} className="border-b border-gray-100">
                        <td className="py-1.5 pr-2">{item.definition.title}</td>
                        <td className="py-1.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass[st]}`}>
                            {statusLabel[st]}
                          </span>
                        </td>
                        <td className="py-1.5 text-gray-600 text-xs">
                          {item.answer?.comment ?? ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}

        {/* Deviations summary */}
        {summary.deviations > 0 && (
          <div className="mt-6 border-t-2 border-red-200 pt-4">
            <h2 className="text-base font-bold text-red-800 mb-3">
              Avvik funnet under tilsyn ({summary.deviations})
            </h2>
            {summary.deviation_items.map((item) => (
              <div key={item.definition.id} className="mb-3 pl-4 border-l-4 border-red-400">
                <p className="font-semibold text-red-900 text-sm">{item.definition.title}</p>
                <p className="text-xs text-gray-500">{CATEGORY_LABELS[item.definition.category]}</p>
                {item.answer?.comment && (
                  <p className="text-sm text-gray-700 mt-1">{item.answer.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 border-t pt-4 text-xs text-gray-400 text-center print:mt-16">
          Generert av Tilsynsapp-PNB · {new Date().toLocaleDateString("nb-NO")}
        </div>
      </div>
    </div>
  );
}
