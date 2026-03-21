import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";

/**
 * Server Component — pre-fetches inspection list during SSR so the page
 * renders immediately without a client-side loading spinner.
 */
export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const [activeRes, restRes] = await Promise.all([
    supabase
      .from("inspections")
      .select("id, property_address, case_number, case_title, status, inspection_date, measure_type_id, gnr, bnr, snr, fnr, estates, participants, external_participants")
      .eq("user_id", session.user.id)
      .in("status", ["draft", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("inspections")
      .select("id, property_address, case_number, case_title, status, inspection_date, measure_type_id, gnr, bnr, snr, fnr, estates, participants, external_participants")
      .eq("user_id", session.user.id)
      .in("status", ["completed", "archived"])
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const list = [...(activeRes.data ?? []), ...(restRes.data ?? [])];

  return <DashboardClient list={list} />;
}
