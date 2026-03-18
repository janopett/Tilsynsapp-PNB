import { redirect } from "next/navigation";

export default async function HomePage() {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const { createClient } = await import("@/lib/supabase/server");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) redirect("/dashboard");
    } catch {
      // fall through to /login
    }
  }

  redirect("/login");
}
