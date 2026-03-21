import DashboardNav from "@/components/ui/DashboardNav";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = user?.app_metadata?.is_admin === true;

  return (
    <div className="min-h-screen flex flex-col">
      <DashboardNav isAdmin={isAdmin} />

      {/* Page content */}
      <main id="main-content" className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
}
