// ============================================================
// PDF Report Generator
// Generates a tilsynsrapport PDF using jsPDF + autoTable
// Images are embedded inline per checkpoint; PDF attachments
// are merged as additional pages using pdf-lib.
// ============================================================

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PDFDocument } from "pdf-lib";
import type { InspectionWithAnswers } from "@/types";
import { MEASURE_TYPES } from "@/data/seed/measure-types";
import {
  filterCheckpoints,
  mergeCheckpointsWithAnswers,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  groupByCategory,
} from "@/lib/checklist/filter-engine";
import { fetchStaticMapImage } from "./map-image";

const STATUS_LABELS: Record<string, string> = {
  ok: "OK",
  deviation: "Avvik",
  not_checked: "Ikke kontrollert",
};

// Brand colours
const BRAND_DARK: [number, number, number] = [15, 40, 100];
const BRAND_MID: [number, number, number] = [30, 58, 138];
const BRAND_LIGHT: [number, number, number] = [219, 229, 255];
const GREY_LINE: [number, number, number] = [210, 215, 225];
const RED_BG: [number, number, number] = [254, 235, 235];
const GREEN_TEXT: [number, number, number] = [22, 163, 74];
const RED_TEXT: [number, number, number] = [185, 28, 28];
const GREY_TEXT: [number, number, number] = [100, 110, 130];

export interface AttachmentForPdf {
  checkpointDefinitionId?: string | null;
  fileName: string;
  mimeType: string;
  fileData: Buffer;
}

const MAX_IMAGE_WIDTH = 165;
const MAX_IMAGE_HEIGHT = 90;
const PAGE_MARGIN_BOTTOM = 22;
const L = 14; // left margin

function ensurePageSpace(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - PAGE_MARGIN_BOTTOM) {
    doc.addPage();
    return 22;
  }
  return y;
}

/**
 * Generate a PDF inspection report.
 * Images (JPEG/PNG) are embedded inline directly below each checkpoint.
 * PDF attachments are merged as additional pages at the end using pdf-lib.
 * Returns a Buffer suitable for uploading to Supabase Storage or SIF.
 */
export async function generateInspectionPdf(
  inspection: InspectionWithAnswers,
  attachments?: AttachmentForPdf[]
): Promise<Buffer> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const measureType = MEASURE_TYPES.find((m) => m.id === inspection.measure_type_id);
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - L * 2;

  // ── Build attachment lookups ─────────────────────────────────
  const imagesByCheckpoint = new Map<string, AttachmentForPdf[]>();
  const pdfsByCheckpoint = new Map<string, AttachmentForPdf[]>();
  const freeImages: AttachmentForPdf[] = [];
  const freePdfs: AttachmentForPdf[] = [];

  for (const att of attachments ?? []) {
    const isImage =
      att.mimeType === "image/jpeg" ||
      att.mimeType === "image/png" ||
      att.mimeType === "image/webp";
    const isPdf = att.mimeType === "application/pdf";

    if (att.checkpointDefinitionId) {
      if (isImage) {
        const arr = imagesByCheckpoint.get(att.checkpointDefinitionId) ?? [];
        arr.push(att);
        imagesByCheckpoint.set(att.checkpointDefinitionId, arr);
      } else if (isPdf) {
        const arr = pdfsByCheckpoint.get(att.checkpointDefinitionId) ?? [];
        arr.push(att);
        pdfsByCheckpoint.set(att.checkpointDefinitionId, arr);
      }
    } else {
      if (isImage) freeImages.push(att);
      else if (isPdf) freePdfs.push(att);
    }
  }

  // ── Header ──────────────────────────────────────────────────
  // Full-width dark bar
  doc.setFillColor(...BRAND_DARK);
  doc.rect(0, 0, pageWidth, 28, "F");
  // Accent stripe at bottom of header
  doc.setFillColor(...BRAND_MID);
  doc.rect(0, 28, pageWidth, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("TILSYNSRAPPORT", L, 13);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 200, 255);
  doc.text("Plan & Bygg · Byggesaksbehandling", L, 21);

  // Date top-right
  doc.setTextColor(180, 200, 255);
  doc.setFontSize(8);
  doc.text(inspection.inspection_date ?? "", pageWidth - L, 21, { align: "right" });

  // ── Case Metadata card ───────────────────────────────────────
  doc.setTextColor(0, 0, 0);
  let y = 38;

  // Section label
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GREY_TEXT);
  doc.text("SAKSOPPLYSNINGER", L, y);
  y += 3;

  const metaRows: [string, string][] = [
    ["Eiendom", inspection.property_address ?? ""],
    ["Saksnummer", inspection.case_number ?? "–"],
    ["Gnr/Bnr", [inspection.gnr, inspection.bnr].filter(Boolean).join("/") || "–"],
    ["Søker", inspection.applicant_name ?? "–"],
    ["Tilsynsmann", inspection.inspector_name ?? "–"],
    ["Dato", inspection.inspection_date ?? ""],
    ["Tiltakstype", measureType?.name ?? inspection.measure_type_id],
  ];

  if (inspection.tilsynsomrade) metaRows.push(["Tilsynsområde", inspection.tilsynsomrade]);
  if (inspection.tilsynstype) metaRows.push(["Tilsynstype", inspection.tilsynstype]);
  if (inspection.bakgrunn?.length) metaRows.push(["Bakgrunn", inspection.bakgrunn.join(", ")]);
  if (inspection.latitude && inspection.longitude) {
    metaRows.push(["Koordinater", `${inspection.latitude.toFixed(6)}, ${inspection.longitude.toFixed(6)}`]);
  }

  autoTable(doc, {
    startY: y,
    head: [],
    body: metaRows,
    theme: "plain",
    styles: { fontSize: 9.5, cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 }, overflow: "linebreak" },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 38, textColor: [60, 70, 90] },
      1: { cellWidth: contentWidth - 38 },
    },
    margin: { left: L },
    didDrawCell: (data) => {
      // Bottom border on each meta row
      if (data.row.index < metaRows.length - 1) {
        doc.setDrawColor(...GREY_LINE);
        doc.setLineWidth(0.2);
        doc.line(
          data.cell.x,
          data.cell.y + data.cell.height,
          data.cell.x + data.cell.width,
          data.cell.y + data.cell.height
        );
      }
    },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

  if (inspection.notes) {
    doc.setFillColor(245, 247, 252);
    const noteLines = doc.splitTextToSize(`${inspection.notes}`, contentWidth - 10);
    const noteH = noteLines.length * 5 + 6;
    doc.roundedRect(L, y, contentWidth, noteH, 2, 2, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...GREY_TEXT);
    doc.text("Merknader:", L + 3, y + 4.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(noteLines, L + 3, y + 9);
    y += noteH + 6;
  }

  // ── Checklist ────────────────────────────────────────────────
  const relevantCheckpoints = filterCheckpoints(
    inspection.measure_type_id,
    inspection.selected_tags
  );
  const merged = mergeCheckpointsWithAnswers(relevantCheckpoints, inspection.answers);
  const grouped = groupByCategory(merged);

  // Pre-fetch static map images for every checkpoint that has coordinates.
  // All fetches run in parallel (Promise.allSettled) so they don't block each other.
  // Zoom 17 = building/street level — matches the detail shown in the map picker.
  const checkpointsWithCoords = merged.filter(
    (item) => item.answer?.latitude && item.answer?.longitude
  );
  const mapFetchResults = await Promise.allSettled(
    checkpointsWithCoords.map((item) =>
      fetchStaticMapImage(item.answer!.latitude!, item.answer!.longitude!, {
        radiusLat: 0.0018, // ~200 m → street/building level
        width: 600,
        height: 300,
      })
    )
  );
  const checkpointMapImages = new Map<string, Buffer | null>();
  for (let i = 0; i < checkpointsWithCoords.length; i++) {
    const r = mapFetchResults[i];
    checkpointMapImages.set(
      checkpointsWithCoords[i].definition.id,
      r.status === "fulfilled" ? r.value : null
    );
  }

  const pdfAttachmentsToMerge: Buffer[] = [];

  for (const category of CATEGORY_ORDER) {
    const items = grouped.get(category);
    if (!items?.length) continue;

    y = ensurePageSpace(doc, y, 18);

    // Category header bar
    doc.setFillColor(...BRAND_LIGHT);
    doc.roundedRect(L, y, contentWidth, 8, 1.5, 1.5, "F");
    doc.setFillColor(...BRAND_MID);
    doc.roundedRect(L, y, 3, 8, 1, 1, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND_MID);
    doc.text(CATEGORY_LABELS[category].toUpperCase(), L + 6, y + 5.5);
    doc.setTextColor(0, 0, 0);
    y += 11;

    for (const item of items) {
      const checkpointImages = imagesByCheckpoint.get(item.definition.id) ?? [];
      const checkpointPdfs = pdfsByCheckpoint.get(item.definition.id) ?? [];
      const isDeviation = item.answer?.status === "deviation";
      const status = item.answer?.status ?? "not_checked";

      y = ensurePageSpace(doc, y, 18);

      const hasCoords = !!(item.answer?.latitude && item.answer?.longitude);
      const mapBuf = hasCoords ? (checkpointMapImages.get(item.definition.id) ?? null) : null;
      // Fallback: show coordinate text only when map image could not be fetched
      const coordFallbackText =
        hasCoords && !mapBuf
          ? `${item.answer!.latitude!.toFixed(6)}, ${item.answer!.longitude!.toFixed(6)}`
          : null;

      const rowData: [string, string][] = [
        ["Sjekkpunkt", item.definition.title],
        ["Status", STATUS_LABELS[status]],
      ];
      if (item.answer?.comment) rowData.push(["Kommentar", item.answer.comment]);
      if (item.answer?.responsible_contact_name) {
        rowData.push(["Ansvarlig", item.answer.responsible_contact_name]);
      }
      if (coordFallbackText) rowData.push(["Koordinater", coordFallbackText]);
      if (checkpointPdfs.length > 0) {
        rowData.push(["Vedlegg (PDF)", checkpointPdfs.map((p) => p.fileName).join(", ")]);
      }

      const cellBg: [number, number, number] = isDeviation ? RED_BG : [252, 253, 255];

      autoTable(doc, {
        startY: y,
        head: [],
        body: rowData,
        theme: "plain",
        styles: {
          fontSize: 9,
          cellPadding: { top: 2.5, bottom: 2.5, left: 3.5, right: 3.5 },
          overflow: "linebreak",
          fillColor: cellBg,
        },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 36, textColor: [60, 70, 90], fillColor: cellBg },
          1: { cellWidth: contentWidth - 36, fillColor: cellBg },
        },
        margin: { left: L, right: L },
        didParseCell: (data) => {
          if (data.column.index === 1 && data.row.index === 1) {
            if (status === "deviation") data.cell.styles.textColor = RED_TEXT;
            else if (status === "ok") data.cell.styles.textColor = GREEN_TEXT;
            else data.cell.styles.textColor = GREY_TEXT;
          }
        },
      });

      const tableEnd = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

      // Left accent bar for deviations
      if (isDeviation) {
        doc.setFillColor(...RED_TEXT);
        doc.rect(L, y, 2, tableEnd - y, "F");
      }
      // Bottom separator line between checkpoints
      doc.setDrawColor(...GREY_LINE);
      doc.setLineWidth(0.3);
      doc.line(L, tableEnd, pageWidth - L, tableEnd);

      y = tableEnd + 4;

      // Embed Kartverket WMS map image when coordinates exist (600×300 px → 2:1 ratio)
      if (mapBuf) {
        const MAP_W = 110; // mm
        const MAP_H = 55;  // mm  (600/300 × ratio → 2:1)
        y = ensurePageSpace(doc, y, MAP_H + 2);
        try {
          const dataUri = `data:image/png;base64,${mapBuf.toString("base64")}`;
          const imageY = y;
          doc.addImage(dataUri, "PNG", L, imageY, MAP_W, MAP_H);

          // Draw a red pin marker at the centre of the map (= the recorded coordinate)
          const cx = L + MAP_W / 2;
          const cy = imageY + MAP_H / 2;
          doc.setFillColor(220, 38, 38);   // red outer circle
          doc.circle(cx, cy, 2.8, "F");
          doc.setFillColor(255, 255, 255); // white inner dot
          doc.circle(cx, cy, 1.1, "F");

          // Small copyright notice
          doc.setFontSize(6);
          doc.setTextColor(80, 80, 80);
          doc.text("© Kartverket", L + MAP_W - 1, imageY + MAP_H - 1.5, { align: "right" });
          doc.setTextColor(0, 0, 0);

          y = imageY + MAP_H + 4;
        } catch (err) {
          console.warn("[PDF] Could not embed map image for checkpoint", item.definition.id, err);
        }
      }

      // Embed inline images
      for (const img of checkpointImages) {
        try {
          const format = img.mimeType === "image/png" ? "PNG" : "JPEG";
          const b64 = img.fileData.toString("base64");
          const dataUri = `data:${img.mimeType};base64,${b64}`;
          const props = doc.getImageProperties(dataUri);
          const aspectRatio = props.width / props.height;
          let imgW = Math.min(MAX_IMAGE_WIDTH, props.width * 0.264583);
          let imgH = imgW / aspectRatio;
          if (imgH > MAX_IMAGE_HEIGHT) { imgH = MAX_IMAGE_HEIGHT; imgW = imgH * aspectRatio; }
          y = ensurePageSpace(doc, y, imgH + 4);
          doc.addImage(dataUri, format, L, y, imgW, imgH);
          y += imgH + 4;
        } catch (err) {
          console.warn(`Could not embed image ${img.fileName}:`, err);
        }
      }

      for (const pdfAtt of checkpointPdfs) {
        pdfAttachmentsToMerge.push(pdfAtt.fileData);
      }
    }

    y += 2;
  }

  // ── Free images ──────────────────────────────────────────────
  if (freeImages.length > 0) {
    y = ensurePageSpace(doc, y, 18);
    doc.setFillColor(...BRAND_LIGHT);
    doc.roundedRect(L, y, contentWidth, 8, 1.5, 1.5, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND_MID);
    doc.text("ØVRIGE BILDER", L + 6, y + 5.5);
    doc.setTextColor(0, 0, 0);
    y += 11;

    for (const img of freeImages) {
      try {
        const format = img.mimeType === "image/png" ? "PNG" : "JPEG";
        const b64 = img.fileData.toString("base64");
        const dataUri = `data:${img.mimeType};base64,${b64}`;
        const props = doc.getImageProperties(dataUri);
        const aspectRatio = props.width / props.height;
        let imgW = Math.min(MAX_IMAGE_WIDTH, props.width * 0.264583);
        let imgH = imgW / aspectRatio;
        if (imgH > MAX_IMAGE_HEIGHT) { imgH = MAX_IMAGE_HEIGHT; imgW = imgH * aspectRatio; }
        y = ensurePageSpace(doc, y, imgH + 4);
        doc.addImage(dataUri, format, L, y, imgW, imgH);
        y += imgH + 4;
      } catch (err) {
        console.warn(`Could not embed image ${img.fileName}:`, err);
      }
    }
  }

  // ── Deviation summary ────────────────────────────────────────
  const deviations = merged.filter((i) => i.answer?.status === "deviation");

  if (deviations.length > 0) {
    y = ensurePageSpace(doc, y, 24);
    y += 4;

    doc.setFillColor(...RED_BG);
    doc.roundedRect(L, y, contentWidth, 8, 1.5, 1.5, "F");
    doc.setFillColor(...RED_TEXT);
    doc.roundedRect(L, y, 3, 8, 1, 1, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...RED_TEXT);
    doc.text("AVVIK FUNNET UNDER TILSYN", L + 6, y + 5.5);
    doc.setTextColor(0, 0, 0);
    y += 11;

    autoTable(doc, {
      startY: y,
      head: [["Sjekkpunkt", "Avviksbeskrivelse", "Ansvarlig"]],
      body: deviations.map((i) => [
        `${i.definition.title}\n(${CATEGORY_LABELS[i.definition.category]})`,
        i.answer?.comment ?? "(ingen kommentar)",
        i.answer?.responsible_contact_name ?? "",
      ]),
      styles: { fontSize: 9, cellPadding: 3, overflow: "linebreak" },
      headStyles: {
        fillColor: [240, 60, 60],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
      },
      alternateRowStyles: { fillColor: [255, 248, 248] },
      columnStyles: {
        0: { cellWidth: 72 },
        1: { cellWidth: 86 },
        2: { cellWidth: contentWidth - 158 },
      },
      margin: { left: L },
    });
  }

  // ── Footer ───────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();
    doc.setFillColor(245, 247, 252);
    doc.rect(0, ph - 12, pageWidth, 12, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GREY_TEXT);
    doc.text(
      `Side ${i} av ${pageCount}  ·  Tilsynsapp-PNB  ·  Generert ${new Date().toLocaleDateString("nb-NO")}`,
      pageWidth / 2,
      ph - 4.5,
      { align: "center" }
    );
  }

  const mainPdfBuffer = Buffer.from(doc.output("arraybuffer"));

  // ── Merge PDF attachments ────────────────────────────────────
  const allPdfsToMerge = [...pdfAttachmentsToMerge, ...freePdfs.map((p) => p.fileData)];
  if (allPdfsToMerge.length === 0) return mainPdfBuffer;

  try {
    const mainDoc = await PDFDocument.load(mainPdfBuffer);
    for (const pdfBuf of allPdfsToMerge) {
      try {
        const srcDoc = await PDFDocument.load(pdfBuf);
        const indices = Array.from({ length: srcDoc.getPageCount() }, (_, i) => i);
        const copiedPages = await mainDoc.copyPages(srcDoc, indices);
        for (const page of copiedPages) mainDoc.addPage(page);
      } catch (err) {
        console.warn("Could not merge PDF attachment page:", err);
      }
    }
    return Buffer.from(await mainDoc.save());
  } catch (err) {
    console.warn("PDF merge failed, returning main PDF only:", err);
    return mainPdfBuffer;
  }
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
      sif_stage_recno: inspection.sif_stage_recno ?? null,
    },
    eiendom: {
      adresse: inspection.property_address,
      gnr: inspection.gnr ?? null,
      bnr: inspection.bnr ?? null,
      snr: inspection.snr ?? null,
      fnr: inspection.fnr ?? null,
      koordinater:
        inspection.latitude && inspection.longitude
          ? { lat: inspection.latitude, lng: inspection.longitude }
          : null,
    },
    tilsynsinfo: {
      tilsynsforer: inspection.inspector_name ?? null,
      soeker: inspection.applicant_name ?? null,
      tiltakstype: measureType?.name ?? inspection.measure_type_id,
      tilsynsomrade: inspection.tilsynsomrade ?? null,
      tilsynstype: inspection.tilsynstype ?? null,
      bakgrunn: inspection.bakgrunn?.length ? inspection.bakgrunn : null,
      merknader: inspection.notes ?? null,
    },
    selected_tags: inspection.selected_tags ?? [],
    deltakere: inspection.participants ?? [],
    eksterne_deltakere: (inspection.external_participants ?? []).map((ep) => ({
      navn: ep.name,
      rolle: ep.role ?? null,
      foretak: ep.company ?? null,
    })),
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
      koordinater:
        item.answer?.latitude && item.answer?.longitude
          ? { lat: item.answer.latitude, lng: item.answer.longitude }
          : null,
      vedlegg: inspection.attachments
        .filter((a) => a.checkpoint_definition_id === item.definition.id)
        .map((a) => ({ filnavn: a.file_name, type: a.file_type, storrelse: a.file_size_bytes })),
    })),
    avvik: merged
      .filter((i) => i.answer?.status === "deviation")
      .map((item) => ({
        id: item.definition.id,
        tittel: item.definition.title,
        kategori: CATEGORY_LABELS[item.definition.category],
        kommentar: item.answer?.comment ?? null,
        ansvarlig: item.answer?.responsible_contact_name ?? null,
        koordinater:
          item.answer?.latitude && item.answer?.longitude
            ? { lat: item.answer.latitude, lng: item.answer.longitude }
            : null,
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
