"use client";

import Link from "next/link";
import { useState } from "react";
import LogoutButton from "./LogoutButton";

interface DashboardNavProps {
  isAdmin: boolean;
}

export default function DashboardNav({ isAdmin }: DashboardNavProps) {
  const [adminOpen, setAdminOpen] = useState(false);

  return (
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

          {isAdmin && (
            <div className="relative">
              <button
                onClick={() => setAdminOpen((o) => !o)}
                className="text-sm text-blue-200 hover:text-white transition flex items-center gap-1"
              >
                Admin
                <svg
                  className={`w-3 h-3 transition-transform ${adminOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {adminOpen && (
                <>
                  {/* backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setAdminOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                    <Link
                      href="/dashboard/admin/sif-config"
                      onClick={() => setAdminOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                    >
                      SIF-konfigurasjon
                    </Link>
                    <Link
                      href="/dashboard/admin/sif-test"
                      onClick={() => setAdminOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                    >
                      SIF Test
                    </Link>
                    <Link
                      href="/dashboard/admin/arkiveringslogg"
                      onClick={() => setAdminOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                    >
                      Arkiveringslogg
                    </Link>
                    <div className="border-t border-gray-100 my-1" />
                    <Link
                      href="/dashboard/admin/users"
                      onClick={() => setAdminOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                    >
                      Brukere
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}

          <LogoutButton />
        </div>
      </div>
    </nav>
  );
}
