import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-auth";

const AnswerSchema = z.object({
  checkpoint_definition_id: z.string().min(1),
  status: z.enum(["not_checked", "ok", "deviation"]),
  comment: z.string().optional().default(""),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const { user, supabase } = auth;

  const { id } = await params;

  // Verify inspection ownership
  const { data: inspection } = await supabase
    .from("inspections")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!inspection) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = AnswerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { checkpoint_definition_id, status, comment } = parsed.data;

  const { data, error } = await supabase
    .from("inspection_answers")
    .upsert(
      {
        inspection_id: id,
        checkpoint_definition_id,
        status,
        comment: comment || null,
      },
      { onConflict: "inspection_id,checkpoint_definition_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Auto-update inspection status
  const { data: answers } = await supabase
    .from("inspection_answers")
    .select("status")
    .eq("inspection_id", id);

  if (answers && answers.length > 0) {
    const hasAny = answers.some((a) => a.status !== "not_checked");
    if (hasAny) {
      await supabase
        .from("inspections")
        .update({ status: "in_progress" })
        .eq("id", id)
        .eq("status", "draft");
    }
  }

  return NextResponse.json(data);
}
