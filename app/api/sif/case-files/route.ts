import { type NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import {
  getDocumentsWithFiles,
  getReferredCasesWithDocuments,
} from "@/lib/sif/extensions/referred-cases";
import type { SifFileMetadata } from "@/lib/sif/types";

export interface CaseFileGroup {
  caseNumber: string;
  files: SifFileMetadata[];
}

export interface CaseFilesResponse {
  groups: CaseFileGroup[];
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const caseNumber = req.nextUrl.searchParams.get("caseNumber")?.trim();
  if (!caseNumber) {
    return NextResponse.json({ error: "caseNumber er påkrevd" }, { status: 400 });
  }

  try {
    // Fetch documents from the TILSYN case and any referred BYGG cases in parallel
    const [ownDocs, referredCases] = await Promise.all([
      getDocumentsWithFiles(caseNumber, 50),
      getReferredCasesWithDocuments(caseNumber, { maxDocumentsPerCase: 50 }),
    ]);

    const dedup = (files: SifFileMetadata[]): SifFileMetadata[] => {
      const seen = new Set<number>();
      return files.filter((f) => {
        if (!f.Recno) return true;
        if (seen.has(f.Recno)) return false;
        seen.add(f.Recno);
        return true;
      });
    };

    const groups: CaseFileGroup[] = [];

    const ownFiles = dedup(ownDocs.flatMap((d) => d.files));
    if (ownFiles.length > 0) {
      groups.push({ caseNumber, files: ownFiles });
    }

    for (const rc of referredCases) {
      const rcFiles = dedup(rc.documents.flatMap((d) => d.files));
      if (rcFiles.length > 0) {
        groups.push({ caseNumber: rc.caseNumber, files: rcFiles });
      }
    }

    return NextResponse.json({ groups } satisfies CaseFilesResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukjent feil";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
