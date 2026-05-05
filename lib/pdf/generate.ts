// ============================================================
// PDF Report Generator
//
// Generates a structured inspection report PDF using jsPDF + jspdf-autotable.
// Inline images (JPEG/PNG) are embedded directly below each checkpoint entry.
// PDF attachments are appended as additional pages using pdf-lib.
//
// Key exports:
//   generateInspectionPdf()   — main PDF generator, returns Buffer
//   generateInspectionJson()  — structured JSON export, returns Buffer
//   buildPdfFileName()        — derives a safe filename from inspection data
//   buildJsonFileName()       — derives a safe filename for JSON export
// ============================================================

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PDFDocument } from "pdf-lib";
import type { InspectionWithAnswers } from "@/types";
import { CHECKPOINT_DEFINITIONS } from "@/data/seed/checkpoint-definitions";
import { MEASURE_TYPES } from "@/data/seed/measure-types";
import {
  filterCheckpoints,
  mergeCheckpointsWithAnswers,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  groupByCategory,
} from "@/lib/checklist/filter-engine";

/** Resolve a single (non-compound) legal reference string to a Lovdata URL. */
function legalReferenceUrl(ref: string): string | null {
  const r = ref.trim();
  const pblMatch = r.match(/^pbl\s*§\s*([\d-]+)/i);
  if (pblMatch) return `https://lovdata.no/lov/2008-06-27-71/§${pblMatch[1]}`;
  if (/^pbl$/i.test(r)) return "https://lovdata.no/lov/2008-06-27-71";
  const tek17SecMatch = r.match(/^TEK17\s*§\s*([\d-]+)/i);
  if (tek17SecMatch) return `https://lovdata.no/forskrift/2017-06-19-840/§${tek17SecMatch[1]}`;
  const tek17KapMatch = r.match(/^TEK17\s*kap\.?\s*(\d+)/i);
  if (tek17KapMatch) return `https://lovdata.no/forskrift/2017-06-19-840/KAPITTEL_${tek17KapMatch[1]}`;
  if (/^TEK17$/i.test(r)) return "https://lovdata.no/forskrift/2017-06-19-840";
  const sak10Match = r.match(/^SAK10\s*§\s*([\d-]+)/i);
  if (sak10Match) return `https://lovdata.no/forskrift/2010-03-26-488/§${sak10Match[1]}`;
  if (/^SAK10$/i.test(r)) return "https://lovdata.no/forskrift/2010-03-26-488";
  if (/forurensningsloven/i.test(r)) return "https://lovdata.no/lov/1981-03-13-6";
  if (/el-tilsynsloven/i.test(r)) return "https://lovdata.no/lov/1929-05-24-4";
  if (/dok-forskriften/i.test(r)) return "https://lovdata.no/forskrift/2016-10-05-1134";
  return null;
}

/**
 * Split a (possibly compound) legal_reference into individual parts, each with a URL.
 * Handles cases like "TEK17 § 11-2, § 11-4" where a bare "§ X-Y" inherits the last law prefix.
 */
function parseHjemmelParts(ref: string): Array<{ text: string; url: string | null }> {
  const parts = ref.split(/,\s*/);
  let lastLawPrefix = "";
  return parts.map((raw) => {
    const part = raw.trim();
    const lawMatch = part.match(/^(pbl|TEK17|SAK10|Forurensningsloven|el-tilsynsloven|DOK-forskriften)/i);
    if (lawMatch) lastLawPrefix = lawMatch[1];

    // Bare section like "§ 11-4" — prefix with the last seen law so it resolves correctly
    const fullRef = !lawMatch && /^§/.test(part) && lastLawPrefix
      ? `${lastLawPrefix} ${part}`
      : part;

    return { text: part, url: legalReferenceUrl(fullRef) };
  });
}

/** Norwegian status labels used in the PDF checklist table. */
const STATUS_LABELS: Record<string, string> = {
  ok: "OK",
  deviation: "Avvik",
  not_checked: "Ikke relevant",
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

/** Add a new page if the remaining vertical space is insufficient for `needed` mm. */
function ensurePageSpace(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - PAGE_MARGIN_BOTTOM) {
    doc.addPage();
    return 22;
  }
  return y;
}

/**
 * Embed an inline image (JPEG or PNG) into the PDF at the current Y position.
 * Scales the image to fit within MAX_IMAGE_WIDTH × MAX_IMAGE_HEIGHT while preserving
 * the aspect ratio. Adds a new page automatically when needed.
 *
 * @returns Updated Y position after the image (y + imgH + 4 mm gap).
 */
function embedInlineImage(doc: jsPDF, img: AttachmentForPdf, startY: number): number {
  const format = img.mimeType === "image/png" ? "PNG" : "JPEG";
  const b64 = img.fileData.toString("base64");
  const dataUri = `data:${img.mimeType};base64,${b64}`;
  const props = doc.getImageProperties(dataUri);
  const aspectRatio = props.width / props.height;

  // Scale down to MAX_IMAGE_WIDTH mm (px → mm: 1px = 0.264583 mm at 96 dpi)
  let imgW = Math.min(MAX_IMAGE_WIDTH, props.width * 0.264583);
  let imgH = imgW / aspectRatio;
  // Clamp height and adjust width proportionally
  if (imgH > MAX_IMAGE_HEIGHT) {
    imgH = MAX_IMAGE_HEIGHT;
    imgW = imgH * aspectRatio;
  }

  const y = ensurePageSpace(doc, startY, imgH + 4);
  doc.addImage(dataUri, format, L, y, imgW, imgH);
  return y + imgH + 4;
}

/**
 * Generate a PDF inspection report.
 * Images (JPEG/PNG) are embedded inline directly below each checkpoint.
 * PDF attachments are merged as additional pages at the end using pdf-lib.
 * Returns a Buffer suitable for uploading to Supabase Storage or SIF.
 */
export async function generateInspectionPdf(
  inspection: InspectionWithAnswers,
  attachments?: AttachmentForPdf[],
  /** Base64 JPEG data URLs keyed by checkpoint_definition_id, captured client-side. */
  checkpointMapImages?: Record<string, string>,
  /** Base64 JPEG overview map with numbered pins, captured client-side. */
  overviewMapImage?: string
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
    ["Befaringsleder", inspection.inspector_name ?? "–"],
    ["Dato", inspection.inspection_date ?? ""],
  ];

  if (inspection.befaringsomrade?.length) metaRows.push(["Befaringsområde", inspection.befaringsomrade.join(", ")]);
  if (inspection.tiltakstype?.length) metaRows.push(["Tiltakstype", inspection.tiltakstype.join(", ")]);
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
    CHECKPOINT_DEFINITIONS,
    inspection.befaringsomrade ?? [],
    inspection.tiltakstype ?? []
  );
  const merged = mergeCheckpointsWithAnswers(relevantCheckpoints, inspection.answers);
  const grouped = groupByCategory(merged);

  // ── Overview map ─────────────────────────────────────────────
  const coordItems = merged.filter(
    (i) => i.answer?.latitude != null && i.answer?.longitude != null
  );
  if (coordItems.length > 0) {
    y = ensurePageSpace(doc, y, 24);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND_MID);
    doc.text("KART — REGISTRERTE POSISJONER", L, y + 5.5);
    doc.setTextColor(0, 0, 0);
    y += 9;

    // Embed client-captured overview map with numbered pins (if provided)
    if (overviewMapImage) {
      const props = doc.getImageProperties(overviewMapImage);
      const MAP_H = Math.round((contentWidth * props.height) / props.width);
      doc.addImage(overviewMapImage, "JPEG", L, y, contentWidth, MAP_H);
      y += MAP_H + 3;
    }

    // Numbered coordinate table — matches pin numbers in the map
    autoTable(doc, {
      startY: y,
      head: [["#", "Sjekkpunkt", "Koordinater (lat, lon)", "Status"]],
      body: coordItems.map((item, idx) => [
        `${idx + 1}`,
        item.definition.title,
        `${item.answer!.latitude!.toFixed(5)}, ${item.answer!.longitude!.toFixed(5)}`,
        STATUS_LABELS[item.answer?.status ?? "not_checked"],
      ]),
      styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: [...BRAND_MID] as [number, number, number], textColor: [255, 255, 255], fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 7 },
        1: { cellWidth: contentWidth - 65 },
        2: { cellWidth: 38 },
        3: { cellWidth: 20 },
      },
      margin: { left: L },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  const pdfAttachmentsToMerge: Buffer[] = [];

  for (const category of CATEGORY_ORDER) {
    const allItems = grouped.get(category);
    // Only show categories that have at least one explicitly checked item
    const items = (allItems ?? []).filter(
      (i) => (i.answer?.status ?? "not_checked") !== "not_checked"
    );
    if (items.length === 0) continue;

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
      const mapDataUri = hasCoords
        ? (checkpointMapImages?.[item.definition.id] ?? null)
        : null;
      // Fallback: show coordinate text when no map image was provided
      const coordFallbackText =
        hasCoords && !mapDataUri
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

      // Embed client-captured OSM map image when available (768×768 px canvas → square)
      if (mapDataUri) {
        const MAP_W = 110; // mm
        const MAP_H = 110; // mm  (square canvas from captureMapImage)
        y = ensurePageSpace(doc, y, MAP_H + 2);
        try {
          const imageY = y;
          const mapFormat = mapDataUri.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
          doc.addImage(mapDataUri, mapFormat, L, imageY, MAP_W, MAP_H);

          y = imageY + MAP_H + 4;
        } catch (err) {
          console.warn("[PDF] Could not embed map image for checkpoint", item.definition.id, err);
        }
      }

      // Embed inline images for this checkpoint
      for (const img of checkpointImages) {
        try {
          y = embedInlineImage(doc, img, y);
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
        y = embedInlineImage(doc, img, y);
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

    // Per-row array of {text, url} pairs — one entry per individual hjemmel part
    const deviationHjemmelData = deviations.map((i) =>
      i.definition.legal_reference
        ? parseHjemmelParts(i.definition.legal_reference).map((p) => ({
            text: `Hjemmel: ${p.text}`,
            url: p.url,
          }))
        : []
    );

    autoTable(doc, {
      startY: y,
      head: [["Sjekkpunkt", "Avviksbeskrivelse", "Ansvarlig", "Rettes innen"]],
      body: deviations.map((i, rowIdx) => {
        // One "Hjemmel: …" line per individual reference part
        const hjemmelLines = deviationHjemmelData[rowIdx].map((p) => p.text);
        const fristStr = i.answer?.frist
          ? new Date(i.answer.frist).toLocaleDateString("nb-NO")
          : "";
        return [
          [
            `${i.definition.title}`,
            `(${CATEGORY_LABELS[i.definition.category]})`,
            ...hjemmelLines,
          ].join("\n"),
          i.answer?.comment ?? "(ingen kommentar)",
          i.answer?.responsible_contact_name ?? "",
          fristStr,
        ];
      }),
      styles: { fontSize: 9, cellPadding: 3, overflow: "linebreak" },
      headStyles: {
        fillColor: [240, 60, 60],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
      },
      alternateRowStyles: { fillColor: [255, 248, 248] },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 60 },
        2: { cellWidth: 42 },
        3: { cellWidth: 25 },
      },
      margin: { left: L },
      didDrawCell: (data) => {
        if (data.section !== "body" || data.column.index !== 0) return;
        const hjemmelData = deviationHjemmelData[data.row.index];
        if (hjemmelData.length === 0) return;

        const lines = data.cell.text;
        // Collect indices of all "Hjemmel:" lines in the rendered cell text
        const hjemmelLineIndices = lines
          .map((l, i) => (l.startsWith("Hjemmel:") ? i : -1))
          .filter((i) => i >= 0);
        if (hjemmelLineIndices.length === 0) return;

        const ptToMm = 25.4 / 72;
        const fontH = 9 * ptToMm;
        const lineH = fontH * doc.getLineHeightFactor();
        const topPad = data.cell.padding("top");
        const leftPad = data.cell.padding("left");
        const textX = data.cell.x + leftPad;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const textPosY = (data.cell as any).textPos?.y;
        const firstBaseline: number =
          typeof textPosY === "number" ? textPosY : data.cell.y + topPad + fontH;

        const fillColor = data.cell.styles.fillColor;
        const bg: [number, number, number] = Array.isArray(fillColor)
          ? [fillColor[0] as number, fillColor[1] as number, fillColor[2] as number]
          : [255, 255, 255];

        for (let k = 0; k < hjemmelLineIndices.length; k++) {
          const lineIdx = hjemmelLineIndices[k];
          const item = hjemmelData[k];
          if (!item?.url) continue;

          const baseline = firstBaseline + lineIdx * lineH;
          const lineText = lines[lineIdx];

          // Cover existing gray text, redraw in blue
          doc.setFillColor(...bg);
          doc.rect(textX, baseline - fontH, data.cell.contentWidth, fontH * 1.3, "F");
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(37, 99, 235);
          doc.text(lineText, textX, baseline);
          doc.setTextColor(0, 0, 0);

          // PDF link annotation
          doc.setFontSize(9);
          const textW = doc.getTextWidth(lineText);
          doc.link(textX, baseline - fontH, textW, lineH, { url: item.url });
        }
      },
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
    CHECKPOINT_DEFINITIONS,
    inspection.befaringsomrade ?? [],
    inspection.tiltakstype ?? []
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
    befaringsinfo: {
      befaringsleder: inspection.inspector_name ?? null,
      soeker: inspection.applicant_name ?? null,
      soeker_recno: inspection.applicant_recno ?? null,
      tiltakstype_intern: measureType?.name ?? inspection.measure_type_id,
      befaringsomrade: inspection.befaringsomrade?.length ? inspection.befaringsomrade : null,
      tiltakstype: inspection.tiltakstype?.length ? inspection.tiltakstype : null,
      bakgrunn: inspection.bakgrunn?.length ? inspection.bakgrunn : null,
      merknader: inspection.notes ?? null,
    },
    selected_tags: inspection.selected_tags ?? [],
    deltakere: inspection.participants ?? [],
    eksterne_deltakere: (inspection.external_participants ?? []).map((ep) => ({
      navn: ep.name,
      fornavn: ep.firstName ?? null,
      etternavn: ep.lastName ?? null,
      rolle: ep.role ?? null,
      foretak: ep.company ?? null,
      foretak_recno: ep.companyRecno ?? null,
    })),
    eiendommer: inspection.estates ?? [],
    sjekkpunkter: merged.map((item) => ({
      id: item.definition.id,
      tittel: item.definition.title,
      kategori: CATEGORY_LABELS[item.definition.category],
      alvorlighet: item.definition.severity,
      lovhjemmel: item.definition.legal_reference ?? null,
      lovhjemmel_url: item.definition.legal_reference_url ?? null,
      status: item.answer?.status ?? "not_checked",
      kommentar: item.answer?.comment ?? null,
      ansvarlig: item.answer?.responsible_contact_name ?? null,
      ansvarlig_recno: item.answer?.responsible_contact_recno ?? null,
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
        ansvarlig_recno: item.answer?.responsible_contact_recno ?? null,
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
