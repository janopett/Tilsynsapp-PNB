import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Attachment, InspectionWithAnswers } from "@/types";
import PrintButton from "@/components/ui/PrintButton";
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

const STORAGE_BUCKET = "inspection-attachments";

export default async function ReportPage({ params }: Props) {
  const supabase = createClient();

  const [inspectionRes, answersRes, attachmentsRes] = await Promise.all([
    supabase.from("inspections").select("*").eq("id", params.id).single(),
    supabase.from("inspection_answers").select("*").eq("inspection_id", params.id),
    supabase.from("attachments").select("*").eq("inspection_id", params.id),
  ]);

  if (inspectionRes.error || !inspectionRes.data) notFound();

  // Generate signed URLs for image attachments (1 hour)
  const rawAttachments: Attachment[] = attachmentsRes.data ?? [];
  const attachmentsWithUrls = await Promise.all(
    rawAttachments.map(async (att) => {
      if (att.file_type?.startsWith("image/")) {
        const { data } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(att.file_path, 3600);
        return { ...att, storage_url: data?.signedUrl ?? att.storage_url };
      }
      return att;
    })
  );

  const inspection: InspectionWithAnswers = {
    ...inspectionRes.data,
    answers: answersRes.data ?? [],
    attachments: attachmentsWithUrls,
  };

  const measureType = MEASURE_TYPES.find((m) => m.id === inspection.measure_type_id);
  const relevantCheckpoints = filterCheckpoints(inspection.measure_type_id, inspection.selected_tags);
  const merged = mergeCheckpointsWithAnswers(relevantCheckpoints, inspection.answers);
  const summary = calculateSummary(merged);
  const grouped = groupByCategory(merged);

  // Group attachments by checkpoint_definition_id for the appendix
  const attByCheckpoint = new Map<string, Attachment[]>();
  for (const att of attachmentsWithUrls) {
    if (att.checkpoint_definition_id) {
      const list = attByCheckpoint.get(att.checkpoint_definition_id) ?? [];
      list.push(att);
      attByCheckpoint.set(att.checkpoint_definition_id, list);
    }
  }

  // Checkpoints that have at least one attachment
  const checkpointsWithAttachments = merged.filter(
    (item) => (attByCheckpoint.get(item.definition.id)?.length ?? 0) > 0
  );

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
        <PrintButton />
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
                    <th className="pb-1 font-medium w-[55%]">Sjekkpunkt</th>
                    <th className="pb-1 font-medium w-[20%]">Status</th>
                    <th className="pb-1 font-medium w-[20%]">Kommentar</th>
                    <th className="pb-1 font-medium w-[5%] text-center">📎</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const st = item.answer?.status ?? "not_checked";
                    const attCount = attByCheckpoint.get(item.definition.id)?.length ?? 0;
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
                        <td className="py-1.5 text-center text-xs text-gray-400">
                          {attCount > 0 ? `${attCount}` : ""}
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

        {/* ── Vedlegg (Appendix) ─────────────────────────────────────── */}
        {checkpointsWithAttachments.length > 0 && (
          <div className="mt-8 border-t-2 border-gray-300 pt-6 print:break-before-page">
            <h2 className="text-base font-bold text-gray-800 mb-1">
              Vedlegg – Bilder og dokumenter
            </h2>
            <p className="text-xs text-gray-500 mb-5">
              {checkpointsWithAttachments.length} sjekkpunkt
              {checkpointsWithAttachments.length !== 1 ? "er" : ""} med vedlegg
            </p>

            <div className="space-y-6">
              {checkpointsWithAttachments.map((item) => {
                const atts = attByCheckpoint.get(item.definition.id) ?? [];
                const st = item.answer?.status ?? "not_checked";
                return (
                  <div
                    key={item.definition.id}
                    className="border border-gray-200 rounded-xl p-4 print:break-inside-avoid"
                  >
                    {/* Checkpoint header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          {item.definition.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {CATEGORY_LABELS[item.definition.category]}
                        </p>
                        {item.answer?.comment && (
                          <p className="text-sm text-gray-700 mt-1 italic">
                            {item.answer.comment}
                          </p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${statusClass[st]}`}>
                        {statusLabel[st]}
                      </span>
                    </div>

                    {/* Attachments grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {atts.map((att) => (
                        <div key={att.id} className="space-y-1">
                          {att.file_type.startsWith("image/") && att.storage_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={att.storage_url}
                              alt={att.file_name}
                              className="w-full h-40 object-cover rounded-lg border border-gray-200"
                            />
                          ) : (
                            <div className="w-full h-40 flex flex-col items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
                              <span className="text-4xl mb-2">📄</span>
                              <span className="text-xs text-gray-500 font-medium">
                                {att.file_name.split(".").pop()?.toUpperCase()}
                              </span>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 truncate">{att.file_name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-8 border-t pt-4 text-xs text-gray-400 text-center print:mt-16">
          Generert av Tilsynsapp-PNB · {new Date().toLocaleDateString("nb-NO")}
          {checkpointsWithAttachments.length > 0 && (
            <> · {attachmentsWithUrls.length} vedlegg</>
          )}
        </div>
      </div>
    </div>
  );
}
