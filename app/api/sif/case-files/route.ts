import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { fetchCaseFilesFromSif } from "@/lib/sif/file-service";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const caseNumber = req.nextUrl.searchParams.get("caseNumber")?.trim();
  if (!caseNumber) {
    return NextResponse.json({ error: "caseNumber er påkrevd" }, { status: 400 });
  }

  try {
    const files = await fetchCaseFilesFromSif(caseNumber);
    return NextResponse.json({ files });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukjent feil";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
