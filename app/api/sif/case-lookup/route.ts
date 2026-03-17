import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { findCaseInSif } from "@/lib/sif/case-service";
import { SifCaseNotFoundError, SifMultipleCasesFoundError } from "@/lib/sif/errors";

const CaseLookupSchema = z.object({
  caseNumber: z.string().optional(),
  externalId: z.string().optional(),
  uid: z.string().optional(),
}).refine((d) => d.caseNumber || d.externalId || d.uid, {
  message: "At least one of caseNumber, externalId, or uid is required",
});

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CaseLookupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { caseNumber, externalId, uid } = parsed.data;

  try {
    const sifCase = await findCaseInSif({
      caseNumber,
      externalId: externalId ? { Id: externalId } : undefined,
      uid,
    });
    return NextResponse.json({ ok: true, case: sifCase });
  } catch (err) {
    if (err instanceof SifCaseNotFoundError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 404 });
    }
    if (err instanceof SifMultipleCasesFoundError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
