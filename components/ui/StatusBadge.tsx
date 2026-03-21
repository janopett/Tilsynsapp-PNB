"use client";

import type { InspectionStatus } from "@/types";
import { useLanguage } from "@/lib/i18n";

const CLS: Record<InspectionStatus, string> = {
  draft:       "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  completed:   "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  archived:    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

export default function StatusBadge({ status }: { status: InspectionStatus }) {
  const { t } = useLanguage();
  const label = t.status[status] ?? t.status.draft;
  const cls = CLS[status] ?? CLS.draft;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}
