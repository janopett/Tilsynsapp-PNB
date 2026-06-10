import { type NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { searchEnterprises } from "@/lib/sif/contact-service";

// ── GET /api/sif/enterprise-search?q=... ─────────────────────────────────────
// Searches SIF ContactService/GetEnterprises by name. Returns up to 10 matches.
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (q.trim().length < 2) {
    return NextResponse.json({ ok: true, enterprises: [] });
  }

  try {
    const enterprises = await searchEnterprises(q.trim());
    return NextResponse.json({ ok: true, enterprises });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
