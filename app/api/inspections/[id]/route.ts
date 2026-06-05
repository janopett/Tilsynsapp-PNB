import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { InspectionWithAnswers } from "@/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [inspRes, answersRes, attachRes, archivalRes] = await Promise.all([
    supabase.from("inspections").select("*").eq("id", id).eq("user_id", user.id).single(),
    supabase.from("inspection_answers").select("*").eq("inspection_id", id),
    supabase.from("attachments").select("*").eq("inspection_id", id),
    supabase.from("inspection_archivals").select("*").eq("inspection_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
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
