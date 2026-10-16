import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Fullfører Microsoft-innlogging: bytter engangskoden fra Supabase mot en sesjon.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(safeNext(searchParams.get("next")), origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=oauth", origin));
}

// Tillat bare relative stier i appen, så redirecten ikke kan sendes til et annet domene.
function safeNext(next: string | null): string {
  if (next?.startsWith("/") && !next.startsWith("//")) return next;
  return "/dashboard";
}
