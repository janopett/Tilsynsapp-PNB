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

const STATUS_LABELS: Record<string, string> = {
  ok: "OK",
  deviation: "Avvik",
  not_checked: "Ikke kontrollert",
};

export interface AttachmentForPdf {
  checkpointDefinitionId?: string | null;
  fileName: string;
  mimeType: string;
  fileData: Buffer;
}

const MAX_IMAGE_WIDTH = 170; // mm
const MAX_IMAGE_HEIGHT = 90; // mm
const PAGE_MARGIN_BOTTOM = 20; // mm

function ensurePageSpace(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - PAGE_MARGIN_BOTTOM) {
    doc.addPage();
    return 20;
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

  // ── Build attachment lookups by checkpointDefinitionId ───────
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
  doc.setFillColor(30, 58, 138);
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

  if (inspection.tilsynsomrade) metaRows.push(["Tilsynsområde", inspection.tilsynsomrade]);
  if (inspection.tilsynstype) metaRows.push(["Tilsynstype", inspection.tilsynstype]);

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

  // Track ordered PDF attachments to merge at the end
  const pdfAttachmentsToMerge: Buffer[] = [];

  for (const category of CATEGORY_ORDER) {
    const items = grouped.get(category);
    if (!items?.length) continue;

    y = ensurePageSpace(doc, y, 14);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138);
    doc.text(CATEGORY_LABELS[category], 14, y);
    doc.setTextColor(0, 0, 0);
    y += 4;

    for (const item of items) {
      const checkpointImages = imagesByCheckpoint.get(item.definition.id) ?? [];
      const checkpointPdfs = pdfsByCheckpoint.get(item.definition.id) ?? [];

      y = ensurePageSpace(doc, y, 16);

      const coordText =
        item.answer?.latitude && item.answer?.longitude
          ? `${item.answer.latitude.toFixed(6)}, ${item.answer.longitude.toFixed(6)}`
          : null;

      const rowData: [string, string][] = [
        ["Sjekkpunkt", item.definition.title],
        ["Status", STATUS_LABELS[item.answer?.status ?? "not_checked"]],
      ];
      if (item.answer?.comment) rowData.push(["Kommentar", item.answer.comment]);
      if (item.answer?.responsible_contact_name) {
        rowData.push(["Ansvarlig", item.answer.responsible_contact_name]);
      }
      if (coordText) rowData.push(["Koordinater", coordText]);
      if (checkpointPdfs.length > 0) {
        rowData.push(["Vedlegg (PDF)", checkpointPdfs.map((p) => p.fileName).join(", ")]);
      }

      const isDeviation = item.answer?.status === "deviation";
      const bgColor: [number, number, number] = isDeviation
        ? [254, 242, 242]
        : [248, 250, 252];

      autoTable(doc, {
        startY: y,
        head: [],
        body: rowData,
        theme: "plain",
        styles: { fontSize: 9, cellPadding: 1.5, overflow: "linebreak" },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 38, fillColor: bgColor },
          1: { cellWidth: 144, fillColor: bgColor },
        },
        margin: { left: 14, right: 14 },
        didParseCell: (data) => {
          // Colour the status value
          if (data.column.index === 1 && data.row.index === 1) {
            const status = item.answer?.status ?? "not_checked";
            if (status === "deviation") data.cell.styles.textColor = [220, 38, 38];
            else if (status === "ok") data.cell.styles.textColor = [22, 163, 74];
          }
        },
      });

      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 2;

      // Embed inline images
      for (const img of checkpointImages) {
        try {
          const format = img.mimeType === "image/png" ? "PNG" : "JPEG";
          const b64 = img.fileData.toString("base64");
          const dataUri = `data:${img.mimeType};base64,${b64}`;
          const props = doc.getImageProperties(dataUri);
          const aspectRatio = props.width / props.height;
          // Convert pixels → mm (assuming 96 dpi: 1 px = 0.264583 mm)
          let imgW = Math.min(MAX_IMAGE_WIDTH, props.width * 0.264583);
          let imgH = imgW / aspectRatio;
          if (imgH > MAX_IMAGE_HEIGHT) {
            imgH = MAX_IMAGE_HEIGHT;
            imgW = imgH * aspectRatio;
          }
          y = ensurePageSpace(doc, y, imgH + 4);
          doc.addImage(dataUri, format, 14, y, imgW, imgH);
          y += imgH + 3;
        } catch (err) {
          console.warn(`Could not embed image ${img.fileName}:`, err);
        }
      }

      // Queue PDF attachments for merging
      for (const pdfAtt of checkpointPdfs) {
        pdfAttachmentsToMerge.push(pdfAtt.fileData);
      }

      y += 3;
    }
  }

  // Free images (not linked to any checkpoint)
  if (freeImages.length > 0) {
    y = ensurePageSpace(doc, y, 14);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138);
    doc.text("Øvrige bilder", 14, y);
    doc.setTextColor(0, 0, 0);
    y += 6;

    for (const img of freeImages) {
      try {
        const format = img.mimeType === "image/png" ? "PNG" : "JPEG";
        const b64 = img.fileData.toString("base64");
        const dataUri = `data:${img.mimeType};base64,${b64}`;
        const props = doc.getImageProperties(dataUri);
        const aspectRatio = props.width / props.height;
        let imgW = Math.min(MAX_IMAGE_WIDTH, props.width * 0.264583);
        let imgH = imgW / aspectRatio;
        if (imgH > MAX_IMAGE_HEIGHT) {
          imgH = MAX_IMAGE_HEIGHT;
          imgW = imgH * aspectRatio;
        }
        y = ensurePageSpace(doc, y, imgH + 4);
        doc.addImage(dataUri, format, 14, y, imgW, imgH);
        y += imgH + 3;
      } catch (err) {
        console.warn(`Could not embed image ${img.fileName}:`, err);
      }
    }
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

  const mainPdfBuffer = Buffer.from(doc.output("arraybuffer"));

  // ── Merge PDF attachments using pdf-lib ──────────────────────
  const allPdfsToMerge = [
    ...pdfAttachmentsToMerge,
    ...freePdfs.map((p) => p.fileData),
  ];

  if (allPdfsToMerge.length === 0) {
    return mainPdfBuffer;
  }

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
      merknader: inspection.notes ?? null,
    },
    selected_tags: inspection.selected_tags ?? [],
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
