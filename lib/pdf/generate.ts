// ============================================================
// PDF Report Generator
// Generates a tilsynsrapport PDF using jsPDF + autoTable
// ============================================================

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { InspectionWithAnswers } from "@/types";
import { MEASURE_TYPES } from "@/data/seed/measure-types";
import { CHECKPOINT_DEFINITIONS } from "@/data/seed/checkpoint-definitions";
import {
  filterCheckpoints,
  mergeCheckpointsWithAnswers,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  groupByCategory,
} from "@/lib/checklist/filter-engine";

const STATUS_LABELS: Record<string, string> = {
  ok: "OK",
  deviation: "Avvik",
  not_checked: "Ikke kontrollert",
};

/**
 * Generate a PDF inspection report.
 * Returns a Buffer suitable for uploading to Supabase Storage or SIF.
 */
export function generateInspectionPdf(
  inspection: InspectionWithAnswers
): Buffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const measureType = MEASURE_TYPES.find((m) => m.id === inspection.measure_type_id);
  const pageWidth = doc.internal.pageSize.getWidth();

  // ── Header ──────────────────────────────────────────────────
  doc.setFillColor(30, 58, 138); // brand-900
  doc.rect(0, 0, pageWidth, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("TILSYNSRAPPORT", 14, 14);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Byggesaksbehandling – Plan & Bygg`, 14, 22);

  // ── Case Metadata ────────────────────────────────────────────
  doc.setTextColor(0, 0, 0);
  let y = 38;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Saksopplysninger", 14, y);
  y += 6;

  const metaRows: [string, string][] = [
    ["Eiendom", inspection.property_address ?? ""],
    ["Saksnummer", inspection.case_number ?? "-"],
    ["Gnr/Bnr", [inspection.gnr, inspection.bnr].filter(Boolean).join("/") || "-"],
    ["Søker", inspection.applicant_name ?? "-"],
    ["Tilsynsmann", inspection.inspector_name ?? "-"],
    ["Dato for tilsyn", inspection.inspection_date ?? ""],
    ["Tiltakstype", measureType?.name ?? inspection.measure_type_id],
  ];

  autoTable(doc, {
    startY: y,
    head: [],
    body: metaRows,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 45 },
      1: { cellWidth: 130 },
    },
    margin: { left: 14 },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  if (inspection.notes) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text(`Merknader: ${inspection.notes}`, 14, y, { maxWidth: pageWidth - 28 });
    y += 12;
  }

  // ── Build checklist ──────────────────────────────────────────
  const relevantCheckpoints = filterCheckpoints(
    inspection.measure_type_id,
    inspection.selected_tags
  );
  const merged = mergeCheckpointsWithAnswers(relevantCheckpoints, inspection.answers);
  const grouped = groupByCategory(merged);

  for (const category of CATEGORY_ORDER) {
    const items = grouped.get(category);
    if (!items?.length) continue;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138);
    doc.text(CATEGORY_LABELS[category], 14, y);
    doc.setTextColor(0, 0, 0);
    y += 2;

    const rows = items.map((item) => [
      item.definition.title,
      STATUS_LABELS[item.answer?.status ?? "not_checked"],
      item.answer?.comment ?? "",
      item.answer?.responsible_contact_name ?? "",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Sjekkpunkt", "Status", "Kommentar", "Ansvarlig"]],
      body: rows,
      styles: { fontSize: 9, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: [219, 234, 254], textColor: [30, 58, 138] },
      columnStyles: {
        0: { cellWidth: 72 },
        1: { cellWidth: 25, halign: "center", fontStyle: "bold" },
        2: { cellWidth: 52 },
        3: { cellWidth: 32 },
      },
      didParseCell: (data) => {
        if (data.column.index === 1 && data.cell.raw === "Avvik") {
          data.cell.styles.textColor = [220, 38, 38];
        }
        if (data.column.index === 1 && data.cell.raw === "OK") {
          data.cell.styles.textColor = [22, 163, 74];
        }
      },
      margin: { left: 14 },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // ── Summary ──────────────────────────────────────────────────
  const deviations = merged.filter((i) => i.answer?.status === "deviation");

  if (deviations.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.text("Avvik funnet under tilsyn", 14, y);
    doc.setTextColor(0, 0, 0);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [["Sjekkpunkt", "Avviksbeskrivelse", "Ansvarlig"]],
      body: deviations.map((i) => [
        `${i.definition.title} (${CATEGORY_LABELS[i.definition.category]})`,
        i.answer?.comment ?? "(ingen kommentar)",
        i.answer?.responsible_contact_name ?? "",
      ]),
      styles: { fontSize: 9, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: [254, 226, 226], textColor: [185, 28, 28] },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 74 },
        2: { cellWidth: 32 },
      },
      margin: { left: 14 },
    });
  }

  // ── Footer ───────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Side ${i} av ${pageCount}  |  Tilsynsapp-PNB  |  Generert ${new Date().toLocaleDateString("nb-NO")}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  return Buffer.from(doc.output("arraybuffer"));
}

export function buildPdfFileName(inspection: InspectionWithAnswers): string {
  const date = inspection.inspection_date ?? new Date().toISOString().slice(0, 10);
  const addr = inspection.property_address
    .replace(/[^a-zA-Z0-9æøåÆØÅ ]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 30);
  return `Tilsynsrapport_${addr}_${date}.pdf`;
}

/**
 * Build a structured JSON export of the inspection for archival.
 * Returns a Buffer of the UTF-8 encoded JSON.
 */
export function generateInspectionJson(inspection: InspectionWithAnswers): Buffer {
  const measureType = MEASURE_TYPES.find((m) => m.id === inspection.measure_type_id);

  const relevantCheckpoints = filterCheckpoints(
    inspection.measure_type_id,
    inspection.selected_tags
  );
  const merged = mergeCheckpointsWithAnswers(relevantCheckpoints, inspection.answers);

  const export_ = {
    tilsyn: {
      id: inspection.id,
      status: inspection.status,
      dato: inspection.inspection_date,
      opprettet: inspection.created_at,
    },
    sak: {
      saksnummer: inspection.case_number ?? null,
      sakstittel: inspection.case_title ?? null,
    },
    eiendom: {
      adresse: inspection.property_address,
      gnr: inspection.gnr ?? null,
      bnr: inspection.bnr ?? null,
      snr: inspection.snr ?? null,
      fnr: inspection.fnr ?? null,
    },
    tilsynsinfo: {
      tilsynsforer: inspection.inspector_name ?? null,
      soeker: inspection.applicant_name ?? null,
      tiltakstype: measureType?.name ?? inspection.measure_type_id,
      merknader: inspection.notes ?? null,
    },
    deltakere: inspection.participants ?? [],
    eiendommer: inspection.estates ?? [],
    sjekkpunkter: merged.map((item) => ({
      id: item.definition.id,
      tittel: item.definition.title,
      kategori: CATEGORY_LABELS[item.definition.category],
      alvorlighet: item.definition.severity,
      lovhjemmel: item.definition.legal_reference ?? null,
      status: item.answer?.status ?? "not_checked",
      kommentar: item.answer?.comment ?? null,
      ansvarlig: item.answer?.responsible_contact_name ?? null,
    })),
    avvik: merged
      .filter((i) => i.answer?.status === "deviation")
      .map((item) => ({
        id: item.definition.id,
        tittel: item.definition.title,
        kategori: CATEGORY_LABELS[item.definition.category],
        kommentar: item.answer?.comment ?? null,
        ansvarlig: item.answer?.responsible_contact_name ?? null,
      })),
  };

  return Buffer.from(JSON.stringify(export_, null, 2), "utf-8");
}

export function buildJsonFileName(inspection: InspectionWithAnswers): string {
  const date = inspection.inspection_date ?? new Date().toISOString().slice(0, 10);
  const addr = inspection.property_address
    .replace(/[^a-zA-Z0-9æøåÆØÅ ]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 30);
  return `Tilsynsdata_${addr}_${date}.json`;
}
