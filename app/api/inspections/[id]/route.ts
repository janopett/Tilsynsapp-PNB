import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { InspectionWithAnswers } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [inspRes, answersRes, attachRes, archivalRes] = await Promise.all([
    supabase.from("inspections").select("*").eq("id", params.id).eq("user_id", user.id).single(),
    supabase.from("inspection_answers").select("*").eq("inspection_id", params.id),
    supabase.from("attachments").select("*").eq("inspection_id", params.id),
    supabase.from("inspection_archivals").select("*").eq("inspection_id", params.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (inspRes.error || !inspRes.data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result: InspectionWithAnswers = {
    ...inspRes.data,
    answers: answersRes.data ?? [],
    attachments: attachRes.data ?? [],
    archival: archivalRes.data ?? undefined,
  };

  return NextResponse.json(result);
}
