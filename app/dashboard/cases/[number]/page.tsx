import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CaseDetailClient from "./CaseDetailClient";

interface PageProps {
  params: { number: string };
}

export default async function CaseDetailPage({ params }: PageProps) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const caseNumber = decodeURIComponent(params.number);

  return <CaseDetailClient caseNumber={caseNumber} />;
}
