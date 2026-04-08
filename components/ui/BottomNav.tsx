"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// ============================================================
// Ikoner (inline SVG — ingen ekstern avhengighet)
// ============================================================

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  );
}

function PlusCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

// ============================================================
// Navigasjonselementer
// ============================================================

const navItems = [
  {
    href: "/dashboard",
    label: "Hjem",
    icon: HomeIcon,
    exact: true,
  },
  {
    href: "/dashboard/cases",
    label: "Saker",
    icon: FolderIcon,
    exact: false,
  },
  {
    href: "/dashboard/cases/new",
    label: "Ny sak",
    icon: PlusCircleIcon,
    exact: true,
  },
  {
    href: "/dashboard/profile",
    label: "Profil",
    icon: UserIcon,
    exact: true,
  },
];

// ============================================================
// BottomNav — mobil bunnnavigasjon
// ============================================================

export default function BottomNav() {
  const pathname = usePathname();

  function isActive(item: (typeof navItems)[number]): boolean {
    if (item.exact) return pathname === item.href;
    // "Saker"-fanen er aktiv for alle /dashboard/cases/* unntatt /new
    return pathname.startsWith(item.href) && !pathname.startsWith("/dashboard/cases/new");
  }

  return (
    <nav
      aria-label="Bunnnavigasjon"
      className="fixed bottom-0 left-0 right-0 z-40
                 bg-white dark:bg-slate-900
                 border-t border-gray-200 dark:border-slate-700
                 safe-area-pb"
    >
      <ul className="flex items-stretch max-w-lg mx-auto" role="list">
        {navItems.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`
                  flex flex-col items-center justify-center gap-0.5
                  py-2 min-h-[3.5rem] w-full text-center
                  transition-colors duration-150
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-brand-500 focus-visible:ring-inset
                  ${
                    active
                      ? "text-brand-600 dark:text-brand-400"
                      : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                  }
                `}
              >
                <Icon className="w-6 h-6 shrink-0" />
                <span className={`text-[10px] font-medium leading-tight ${active ? "font-semibold" : ""}`}>
                  {item.label}
                </span>
                {active && (
                  <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-brand-600 dark:bg-brand-400"
                    aria-hidden="true"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
