import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { getDocumentsWithFiles } from "@/lib/sif/extensions/referred-cases";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const caseNumber = req.nextUrl.searchParams.get("caseNumber")?.trim();
  if (!caseNumber) {
    return NextResponse.json({ error: "caseNumber er påkrevd" }, { status: 400 });
  }

  try {
    const documents = await getDocumentsWithFiles(caseNumber, 50);
    // Flatten files from all documents, deduplicate by Recno
    const seen = new Set<number>();
    const files = documents.flatMap((d) => d.files).filter((f) => {
      if (!f.Recno) return true;
      if (seen.has(f.Recno)) return false;
      seen.add(f.Recno);
      return true;
    });
    return NextResponse.json({ files });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukjent feil";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
