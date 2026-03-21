import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InspectionClient from "./InspectionClient";

interface Props {
  params: { id: string };
}

/**
 * Server Component — pre-fetches inspection data during SSR so the page
 * renders its heading and content immediately, improving LCP significantly.
 */
export default async function InspectionPage({ params }: Props) {
  const { id } = params;
  const supabase = createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const [inspRes, answersRes, attachRes, archivalRes] = await Promise.all([
    supabase.from("inspections").select("*").eq("id", id).eq("user_id", session.user.id).single(),
    supabase.from("inspection_answers").select("*").eq("inspection_id", id),
    supabase.from("attachments").select("*").eq("inspection_id", id),
    supabase
      .from("inspection_archivals")
      .select("*")
      .eq("inspection_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (inspRes.error || !inspRes.data) redirect("/dashboard");

  const initialInspection = {
    ...inspRes.data,
    participants: inspRes.data.participants ?? [],
    estates: inspRes.data.estates ?? [],
    answers: answersRes.data ?? [],
    attachments: attachRes.data ?? [],
    archival: archivalRes.data ?? undefined,
  };

  return <InspectionClient id={id} initialInspection={initialInspection} />;
}
