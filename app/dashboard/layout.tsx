import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import LogoutButton from "@/components/ui/LogoutButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <nav className="bg-brand-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="text-lg font-bold tracking-tight">
            Tilsynsapp
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm text-blue-200 hover:text-white transition"
            >
              Mine tilsyn
            </Link>
            <Link
              href="/dashboard/admin/sif-test"
              className="text-sm text-blue-200 hover:text-white transition"
            >
              SIF Admin
            </Link>
            <LogoutButton />
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
}
