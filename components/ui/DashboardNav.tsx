"use client";

import Link from "next/link";
import { useState } from "react";
import LogoutButton from "./LogoutButton";
import { useLanguage, type Locale } from "@/lib/i18n";

interface DashboardNavProps {
  isAdmin: boolean;
}

export default function DashboardNav({ isAdmin }: DashboardNavProps) {
  const [adminOpen, setAdminOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const { locale, setLocale, t } = useLanguage();

  const languages: { code: Locale; label: string; flag: string }[] = [
    { code: "nb", label: t.language.nb, flag: "🇳🇴" },
    { code: "en", label: t.language.en, flag: "🇬🇧" },
  ];

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
            {t.nav.myInspections}
          </Link>

          {isAdmin && (
            <div className="relative">
              <button
                onClick={() => setAdminOpen((o) => !o)}
                className="text-sm text-blue-200 hover:text-white transition flex items-center gap-1"
              >
                {t.nav.admin}
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
                      {t.nav.sifConfig}
                    </Link>
                    <Link
                      href="/dashboard/admin/sif-test"
                      onClick={() => setAdminOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                    >
                      {t.nav.sifTest}
                    </Link>
                    <Link
                      href="/dashboard/admin/arkiveringslogg"
                      onClick={() => setAdminOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                    >
                      {t.nav.archivalLog}
                    </Link>
                    <Link
                      href="/dashboard/admin/tilsyn-config"
                      onClick={() => setAdminOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                    >
                      Tilsynskonfigurering
                    </Link>
                    <Link
                      href="/dashboard/admin/checkpoints"
                      onClick={() => setAdminOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                    >
                      Sjekkpunkter
                    </Link>
                    <div className="border-t border-gray-100 my-1" />
                    <Link
                      href="/dashboard/admin/users"
                      onClick={() => setAdminOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                    >
                      {t.nav.users}
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Language switcher */}
          <div className="relative">
            <button
              onClick={() => setLangOpen((o) => !o)}
              className="text-sm text-blue-200 hover:text-white transition flex items-center gap-1"
              aria-label="Change language"
            >
              {languages.find((l) => l.code === locale)?.flag}{" "}
              <span className="uppercase text-xs font-semibold">{locale}</span>
              <svg
                className={`w-3 h-3 transition-transform ${langOpen ? "rotate-180" : ""}`}
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

            {langOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setLangOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLocale(lang.code);
                        setLangOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition flex items-center gap-2 ${
                        locale === lang.code
                          ? "text-brand-700 font-semibold bg-brand-50"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <LogoutButton />
        </div>
      </div>
    </nav>
  );
}
