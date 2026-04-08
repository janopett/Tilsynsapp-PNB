// ============================================================
// GET  /api/cases/[number]/documents — hent dokumenter fra SIF
// POST /api/cases/[number]/documents — opprett dokument på sak via SIF
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-auth";
import { sifRpcCall } from "@/lib/sif/client";
import { createClient as serviceClient } from "@supabase/supabase-js";
import type {
  SifGetDocumentsQuery,
  SifGetDocumentsResult,
  SifCreateDocumentInput,
  SifCreateDocumentResult,
} from "@/lib/sif/types";

function getServiceClient() {
  return serviceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface RouteContext {
  params: { number: string };
}

// ============================================================
// GET /api/cases/[number]/documents
// ============================================================

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const caseNumber = decodeURIComponent(params.number);
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));

  try {
    const result = await sifRpcCall<SifGetDocumentsQuery, SifGetDocumentsResult>(
      "DocumentService",
      "GetDocuments",
      {
        CaseNumber: caseNumber,
        MaxReturnedDocuments: limit,
        Page: page,
        SortCriterion: "RecnoDescending",
        IncludeFiles: false,
      }
    );

    if (!result.Successful) {
      return NextResponse.json({ documents: [], error: result.ErrorMessage });
    }

    const documents = (result.Documents ?? []).map((d) => ({
      recno: d.Recno,
      documentNumber: d.DocumentNumber,
      title: d.Title,
      category: d.CategoryDescription ?? d.Category,
      status: d.StatusDescription ?? d.Status,
      documentDate: d.DocumentDate,
      responsiblePerson: d.ResponsiblePersonName,
      url: d.URL,
    }));

    // Cache dokumentreferanser lokalt
    if (documents.length > 0) {
      const supabase = getServiceClient();
      const { data: caseRow } = await supabase
        .from("cases")
        .select("id")
        .eq("sif_case_number", caseNumber)
        .single();

      if (caseRow) {
        const rows = documents.map((d) => ({
          case_id: caseRow.id,
          sif_document_number: d.documentNumber ?? null,
          sif_document_recno: d.recno,
          title: d.title ?? null,
          category: d.category ?? null,
          status: d.status ?? null,
          document_date: d.documentDate
            ? d.documentDate.substring(0, 10)
            : null,
          sif_url: d.url ?? null,
        }));

        await supabase
          .from("case_documents")
          .upsert(rows, {
            onConflict: "sif_document_recno",
            ignoreDuplicates: true,
          })
          .catch(() => {
            // Ikke kritisk om cache-skriving feiler
          });
      }
    }

    return NextResponse.json({
      documents,
      totalCount: result.TotalCount,
      totalPages: result.TotalPageCount,
    });
  } catch (err) {
    console.error("[API] GET /api/cases/[number]/documents feil:", err);

    // Fallback: lokal cache
    const supabase = getServiceClient();
    const { data: caseRow } = await supabase
      .from("cases")
      .select("id")
      .eq("sif_case_number", caseNumber)
      .single();

    if (!caseRow) {
      return NextResponse.json({ documents: [], fromCache: true });
    }

    const { data } = await supabase
      .from("case_documents")
      .select(
        "id, sif_document_number, sif_document_recno, title, category, status, document_date, sif_url"
      )
      .eq("case_id", caseRow.id)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      documents: (data ?? []).map((d) => ({
        recno: d.sif_document_recno,
        documentNumber: d.sif_document_number,
        title: d.title,
        category: d.category,
        status: d.status,
        documentDate: d.document_date,
        url: d.sif_url,
      })),
      fromCache: true,
    });
  }
}

// ============================================================
// POST /api/cases/[number]/documents — opprett nytt dokument på sak
// ============================================================

const CreateDocumentSchema = z.object({
  title: z.string().min(1, "Tittel er påkrevd"),
  category: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  // Valgfri base64-kodet fil
  fileData: z.string().optional(),
  fileName: z.string().optional(),
  fileFormat: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const caseNumber = decodeURIComponent(params.number);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const parsed = CreateDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, category, status, notes, fileData, fileName, fileFormat } =
    parsed.data;

  const documentInput: SifCreateDocumentInput = {
    Title: title,
    CaseNumber: caseNumber,
    Category: category,
    Status: status,
    Notes: notes,
    DocumentDate: new Date().toISOString().substring(0, 10),
  };

  // Legg ved fil hvis oppgitt (base64-kodet)
  if (fileData && fileName) {
    documentInput.Files = [
      {
        Title: fileName,
        Format: fileFormat ?? fileName.split(".").pop() ?? "pdf",
        Base64Data: fileData,
        RelationType: "H", // Hoveddokument
      },
    ];
  }

  const result = await sifRpcCall<SifCreateDocumentInput, SifCreateDocumentResult>(
    "DocumentService",
    "CreateDocument",
    documentInput,
    undefined,
    true // wrap in { parameter: ... }
  );

  if (!result.Successful) {
    return NextResponse.json(
      { error: result.ErrorMessage ?? "Dokument ble ikke opprettet" },
      { status: 422 }
    );
  }

  // Cache lokalt
  const supabase = getServiceClient();
  const { data: caseRow } = await supabase
    .from("cases")
    .select("id")
    .eq("sif_case_number", caseNumber)
    .single();

  if (caseRow) {
    await supabase.from("case_documents").insert({
      case_id: caseRow.id,
      sif_document_number: result.DocumentNumber ?? null,
      sif_document_recno: result.Recno ?? null,
      title,
      category: category ?? null,
      status: status ?? null,
      document_date: new Date().toISOString().substring(0, 10),
      sif_url: result.URL ?? null,
    });
  }

  return NextResponse.json(
    {
      recno: result.Recno,
      documentNumber: result.DocumentNumber,
      url: result.URL,
    },
    { status: 201 }
  );
}
