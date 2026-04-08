import DashboardNav from "@/components/ui/DashboardNav";
import BottomNav from "@/components/ui/BottomNav";
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

      {/* Page content — ekstra bunnpadding for bunnmenyen */}
      <main id="main-content" className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 pb-24">
        {children}
      </main>

      {/* Mobil bunnmeny */}
      <BottomNav />
    </div>
  );
}
