import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { searchCasesInSif } from "@/lib/sif/case-service";

// ── GET /api/sif/case-search?q=... ───────────────────────────────────────────
// Searches SIF by partial case number or title. Returns up to 10 matches.
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (q.trim().length < 2) {
    return NextResponse.json({ ok: true, cases: [] });
  }

  try {
    const cases = await searchCasesInSif(q.trim());
    return NextResponse.json({ ok: true, cases });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
