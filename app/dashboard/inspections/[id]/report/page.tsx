import Link from "next/link";
import { notFound } from "next/navigation";
import CheckpointOverviewMap, { type MapPoint } from "@/components/ui/CheckpointOverviewMap";
import PolygonMap from "@/components/ui/PolygonMap";
import PrintButton from "@/components/ui/PrintButton";
import { CHECKPOINT_DEFINITIONS } from "@/data/seed/checkpoint-definitions";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  calculateSummary,
  filterCheckpoints,
  groupByCategory,
  mergeCheckpointsWithAnswers,
} from "@/lib/checklist/filter-engine";
import { createClient } from "@/lib/supabase/server";
import type { Attachment, InspectionWithAnswers } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

const STORAGE_BUCKET = "inspection-attachments";

export default async function ReportPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [inspectionRes, answersRes, attachmentsRes] = await Promise.all([
    supabase.from("inspections").select("*").eq("id", id).single(),
    supabase.from("inspection_answers").select("*").eq("inspection_id", id),
    supabase.from("attachments").select("*").eq("inspection_id", id),
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

  const relevantCheckpoints = filterCheckpoints(
    CHECKPOINT_DEFINITIONS,
    inspection.befaringsomrade ?? [],
    inspection.tiltakstype ?? []
  );
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

  // Overview map points — all checkpoints with registered coordinates, numbered sequentially
  let mapNum = 0;
  const mapPoints: MapPoint[] = merged
    .filter((item) => item.answer?.latitude != null && item.answer?.longitude != null)
    .map((item) => ({
      lat: item.answer!.latitude!,
      lng: item.answer!.longitude!,
      num: ++mapNum,
      id: item.definition.id,
      title: item.definition.title,
      status: (item.answer?.status ?? "not_checked") as MapPoint["status"],
    }));

  // Checkpoints that have attachments OR a registered coordinate — shown in appendix
  const appendixItems = merged.filter(
    (item) =>
      (attByCheckpoint.get(item.definition.id)?.length ?? 0) > 0 ||
      (item.answer?.latitude != null && item.answer?.longitude != null)
  );

  const statusLabel: Record<string, string> = {
    ok: "OK",
    deviation: "Avvik",
    not_checked: "Ikke relevant",
  };
  const statusClass: Record<string, string> = {
    ok: "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/30",
    deviation: "text-red-700 bg-red-50 font-bold dark:text-red-400 dark:bg-red-900/30",
    not_checked: "text-gray-500 bg-gray-50",
  };

  function kartverketMapUrl(lat: number, lng: number): string {
    const dLat = 0.0022;
    const dLon = 0.0044;
    const bbox = `${lat - dLat},${lng - dLon},${lat + dLat},${lng + dLon}`;
    return (
      `https://openwms.statkart.no/skwms1/wms.topo4?SERVICE=WMS&REQUEST=GetMap` +
      `&VERSION=1.3.0&LAYERS=topo4_WMS&STYLES=&CRS=EPSG:4326` +
      `&BBOX=${bbox}&WIDTH=600&HEIGHT=300&FORMAT=image/png`
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link
          href={`/dashboard/inspections/${id}`}
          className="text-brand-600 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300 text-sm"
        >
          ← Tilbake til befaring
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
            ["Befaringsleder", inspection.inspector_name ?? "-"],
            ["Dato", new Date(inspection.inspection_date).toLocaleDateString("nb-NO")],
            ["Tiltakstype", (inspection.tiltakstype ?? []).join(", ") || "-"],
            ...(inspection.avvik_frist
              ? [
                  [
                    "Frist for lukking av avvik",
                    new Date(inspection.avvik_frist).toLocaleDateString("nb-NO"),
                  ],
                ]
              : []),
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
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            {
              label: "Kontrollert",
              value: summary.ok + summary.deviations,
              cls: "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-transparent",
            },
            {
              label: "OK",
              value: summary.ok,
              cls: "bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-200 dark:border-transparent",
            },
            {
              label: "Avvik",
              value: summary.deviations,
              cls: "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-200 dark:border-transparent",
            },
          ].map((s) => (
            <div key={s.label} className={`${s.cls} rounded-xl p-3 text-center`}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tilsynsområde — polygon drawn during inspection creation */}
        {inspection.area_geojson && (
          <div className="mb-8">
            <h2 className="text-sm font-bold text-brand-900 uppercase tracking-wide mb-3 border-b border-gray-200 pb-1">
              Tilsynsområde
            </h2>
            <PolygonMap polygon={inspection.area_geojson} />
          </div>
        )}

        {/* Overview map — all checkpoints with registered coordinates */}
        <CheckpointOverviewMap points={mapPoints} />

        {/* Checklist by category — "Ikke relevant" items hidden */}
        {CATEGORY_ORDER.filter((c) => {
          const items = grouped.get(c);
          return items?.some((i) => (i.answer?.status ?? "not_checked") !== "not_checked");
        }).map((category) => {
          const items = grouped
            .get(category)!
            .filter((i) => (i.answer?.status ?? "not_checked") !== "not_checked");
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
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-base font-bold text-red-800">
                Avvik funnet under befaring ({summary.deviations})
              </h2>
              {inspection.avvik_frist && (
                <span className="text-sm font-semibold text-red-700">
                  Frist: {new Date(inspection.avvik_frist).toLocaleDateString("nb-NO")}
                </span>
              )}
            </div>
            {summary.deviation_items.map((item) => (
              <div key={item.definition.id} className="mb-4 pl-4 border-l-4 border-red-400">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-red-900 text-sm">{item.definition.title}</p>
                    <p className="text-xs text-gray-500">
                      {CATEGORY_LABELS[item.definition.category]}
                    </p>
                    {item.definition.legal_reference && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Hjemmel: {item.definition.legal_reference}
                      </p>
                    )}
                  </div>
                  {item.answer?.frist && (
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs text-gray-500">Rettes innen</p>
                      <p className="text-sm font-semibold text-red-700">
                        {new Date(item.answer.frist).toLocaleDateString("nb-NO")}
                      </p>
                    </div>
                  )}
                </div>
                {item.answer?.comment && (
                  <p className="text-sm text-gray-700 mt-1">{item.answer.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Vedlegg (Appendix) ─────────────────────────────────────── */}
        {appendixItems.length > 0 && (
          <div className="mt-8 border-t-2 border-gray-300 pt-6 print:break-before-page">
            <h2 className="text-base font-bold text-gray-800 mb-1">
              Vedlegg – Kart, bilder og dokumenter
            </h2>
            <p className="text-xs text-gray-500 mb-5">
              {appendixItems.length} sjekkpunkt
              {appendixItems.length !== 1 ? "er" : ""} med vedlegg
            </p>

            <div className="space-y-6">
              {appendixItems.map((item) => {
                const atts = attByCheckpoint.get(item.definition.id) ?? [];
                const st = item.answer?.status ?? "not_checked";
                const hasCoords = item.answer?.latitude != null && item.answer?.longitude != null;
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
                          <p className="text-sm text-gray-700 mt-1 italic">{item.answer.comment}</p>
                        )}
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${statusClass[st]}`}
                      >
                        {statusLabel[st]}
                      </span>
                    </div>

                    {/* Map snapshot (if coordinates registered) */}
                    {hasCoords && (
                      <div className="relative mb-3 rounded-lg overflow-hidden border border-gray-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={kartverketMapUrl(item.answer!.latitude!, item.answer!.longitude!)}
                          alt="Kartutsnitt for sjekkpunkt"
                          className="w-full h-52 object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {/* Centered pin marker */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <svg
                            width="28"
                            height="36"
                            viewBox="0 0 28 36"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))" }}
                          >
                            <path
                              d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z"
                              fill="#DC2626"
                            />
                            <circle cx="14" cy="14" r="5" fill="white" />
                          </svg>
                        </div>
                        <p className="absolute bottom-1.5 right-2 text-[10px] text-white/80 bg-black/30 rounded px-1">
                          © Kartverket
                        </p>
                      </div>
                    )}

                    {/* Attachments grid */}
                    {atts.length > 0 && (
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
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-8 border-t pt-4 text-xs text-gray-400 text-center print:mt-16">
          Generert av Tilsynsapp-PNB · {new Date().toLocaleDateString("nb-NO")}
          {attachmentsWithUrls.length > 0 && <> · {attachmentsWithUrls.length} vedlegg</>}
        </div>
      </div>
    </div>
  );
}
