"use client";

import Link from "next/link";
import { useState } from "react";
import LogoutButton from "./LogoutButton";
import ThemeToggle from "./ThemeToggle";
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
    <nav aria-label="Hovednavigasjon" className="bg-brand-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="text-lg font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
        >
          {t.nav.appName}
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-blue-200 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
          >
            {t.nav.myInspections}
          </Link>

          {isAdmin && (
            <div className="relative">
              <button
                onClick={() => setAdminOpen((o) => !o)}
                aria-expanded={adminOpen}
                aria-haspopup="menu"
                className="text-sm text-blue-200 hover:text-white transition flex items-center gap-1
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
              >
                {t.nav.admin}
                <svg
                  className={`w-3 h-3 transition-transform ${adminOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {adminOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setAdminOpen(false)}
                    aria-hidden="true"
                  />
                  <div
                    role="menu"
                    aria-label={t.nav.adminMenuLabel}
                    className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-lg
                               border border-gray-100 dark:border-slate-700 py-1 z-20"
                  >
                    {[
                      { href: "/dashboard/admin/sif-config", label: t.nav.sifConfig },
                      { href: "/dashboard/admin/sif-test", label: t.nav.sifTest },
                      { href: "/dashboard/admin/arkiveringslogg", label: t.nav.archivalLog },
                      { href: "/dashboard/admin/tilsyn-config", label: t.nav.tilsynConfig },
                      { href: "/dashboard/admin/checkpoints", label: t.nav.checkpoints },
                    ].map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        onClick={() => setAdminOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-slate-300
                                   hover:bg-gray-50 dark:hover:bg-slate-700 transition
                                   focus-visible:outline-none focus-visible:bg-gray-100 dark:focus-visible:bg-slate-700"
                      >
                        {item.label}
                      </Link>
                    ))}
                    <div className="border-t border-gray-100 dark:border-slate-700 my-1" aria-hidden="true" />
                    <Link
                      href="/dashboard/admin/users"
                      role="menuitem"
                      onClick={() => setAdminOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-slate-300
                                 hover:bg-gray-50 dark:hover:bg-slate-700 transition
                                 focus-visible:outline-none focus-visible:bg-gray-100 dark:focus-visible:bg-slate-700"
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
              aria-expanded={langOpen}
              aria-haspopup="listbox"
              aria-label={t.nav.changeLanguage}
              className="text-sm text-blue-200 hover:text-white transition flex items-center gap-1
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
            >
              {languages.find((l) => l.code === locale)?.flag}{" "}
              <span className="uppercase text-xs font-semibold">{locale}</span>
              <svg
                className={`w-3 h-3 transition-transform ${langOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {langOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setLangOpen(false)}
                  aria-hidden="true"
                />
                <ul
                  role="listbox"
                  aria-label={t.nav.selectLanguage}
                  className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-slate-800 rounded-xl shadow-lg
                             border border-gray-100 dark:border-slate-700 py-1 z-20"
                >
                  {languages.map((lang) => (
                    <li key={lang.code} role="option" aria-selected={locale === lang.code}>
                      <button
                        onClick={() => {
                          setLocale(lang.code);
                          setLangOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm transition flex items-center gap-2
                                    focus-visible:outline-none focus-visible:bg-gray-100 dark:focus-visible:bg-slate-700
                                    ${
                                      locale === lang.code
                                        ? "text-brand-700 dark:text-brand-400 font-semibold bg-brand-50 dark:bg-brand-900/30"
                                        : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                                    }`}
                      >
                        <span aria-hidden="true">{lang.flag}</span>
                        <span>{lang.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </nav>
  );
}
