import { type NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { fetchCaseDocumentsFromSif } from "@/lib/sif/document-service";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const caseNumber = req.nextUrl.searchParams.get("caseNumber")?.trim();
  if (!caseNumber) {
    return NextResponse.json({ error: "caseNumber er påkrevd" }, { status: 400 });
  }

  try {
    const documents = await fetchCaseDocumentsFromSif(caseNumber);
    return NextResponse.json({ documents });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukjent feil";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
