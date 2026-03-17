import type { InspectionStatus } from "@/types";

const CONFIG: Record<InspectionStatus, { label: string; cls: string }> = {
  draft: { label: "Utkast", cls: "bg-gray-100 text-gray-600" },
  in_progress: { label: "Pågår", cls: "bg-blue-100 text-blue-700" },
  completed: { label: "Fullført", cls: "bg-green-100 text-green-700" },
  archived: { label: "Arkivert", cls: "bg-purple-100 text-purple-700" },
};

export default function StatusBadge({ status }: { status: InspectionStatus }) {
  const { label, cls } = CONFIG[status] ?? CONFIG.draft;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}
