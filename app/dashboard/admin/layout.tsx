import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Guard layout for all /dashboard/admin/* routes.
 * Redirects to /dashboard if the user is not logged in or not an admin.
 * Admin status is stored in app_metadata.is_admin (set server-side only).
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  if (user.app_metadata?.is_admin !== true) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
